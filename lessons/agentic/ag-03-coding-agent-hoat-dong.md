# Bài 3 — Coding agent là một vòng lặp tool

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ lại **vòng lặp** của một coding agent (model chọn tool → harness chạy tool → kết quả quay về context → lặp) và chỉ ra bước nào do model quyết, bước nào do phần mềm bao quanh quyết.
- Khi một lệnh bị chặn, xác định nó bị chặn ở **lớp nào** trong ba lớp: model tự không gọi, permission của harness, hay sandbox của hệ điều hành — và sửa đúng lớp đó.
- Viết một `.claude/settings.json` có `allow`/`deny` chạy được, và giải thích vì sao `deny: ["Bash(git push *)"]` **không** chặn được `git -C . push`.
- Chọn đúng cặp **sandbox mode × approval policy** của Codex cho ba tình huống: đọc để hỏi, sửa code trong repo, chạy trong VM dùng một lần.
- Chạy cả hai công cụ ở chế độ **headless** (`claude -p`, `codex exec`), đọc kết quả bằng exit code + JSON thay vì đọc mắt.

---

## 2. Tình huống

Case thực tế, một buổi debug, ẩn danh. Một dev điều tra lỗi dữ liệu của một app SaaS thương mại điện tử chạy trên Firebase. Agent làm việc trong repo backend, đọc code tốt, đưa giả thuyết nhanh. Rồi tới bước cần nhìn dữ liệu thật.

Agent viết một script Node nhỏ chỉ gọi `.get()` trên Firestore, và thay vì chạy, nó in lệnh ra rồi nhờ người chạy tay. Người chạy, dán output lại. Agent đọc, đưa script đọc tiếp theo, lại nhờ chạy tay. Lặp lại suốt buổi — một buổi điều tra có hàng chục lệnh đọc như thế. Tới lần thứ n, người dùng gõ:

> "query thôi thì m có thể chạy mà? những việc như update data thì mới cần t chạy thủ công chứ ???"

Truy lại thì nguyên nhân không nằm ở model "nhút nhát". Đầu buổi, **sandbox chặn vài script** dùng service account production. Agent quan sát được "bị chặn", rồi **tự suy ra một luật** — "có creds prod thì phải nhờ người chạy" — và áp luật đó cho mọi lệnh sau, kể cả lệnh chỉ đọc mà không lớp nào chặn cả. Cái bị chặn và cái đáng chặn không trùng nhau. (Cùng buổi này được dùng lại ở [[ag-05-checkpoint-tung-buoc]] — góc ranh giới đọc/ghi — và [[ag-06-memory-va-feedback]] — góc session sau quên lời sửa.)

Cùng buổi đó có chiều ngược lại: một script ghi dữ liệu bật nhầm một cờ cấu hình trên dữ liệu thật, và chỉ gỡ được nhờ chế độ `revert` của chính script (diễn biến đầy đủ ở [[ag-05-checkpoint-tung-buoc]]).

Hai triệu chứng, một gốc: **cả người lẫn agent không phân biệt được lớp nào đang quyết định một lệnh có chạy hay không.** Agent tưởng bị chặn vì "luật", người không biết cấu hình nào cho phép lệnh đọc chạy tự do trong khi lệnh ghi vẫn phải qua tay người. Bài này mổ đúng chỗ đó.

---

## ⏸ Dừng lại — đoán trước

Agent định chạy `node scripts/read-orders.js`. Lệnh không chạy. Bạn có bốn giả thuyết:

```
(a) Model "biết" lệnh này nguy hiểm nên tự từ chối — đổi prompt là được
(b) Harness (Claude Code / Codex) có rule hoặc mode yêu cầu hỏi người trước khi chạy Bash
(c) Sandbox của hệ điều hành chặn process con đọc file creds ngoài thư mục làm việc, hoặc chặn mạng
(d) Cả (b) và (c) đều có thể, và cách sửa của chúng khác nhau hoàn toàn
```

Chọn một, rồi tự hỏi thêm: **sửa CLAUDE.md có tác dụng với giả thuyết nào?** Đáp án ở §3.3.

---

## 3. Cơ chế

### 3.1 Vòng lặp: model không chạy gì cả

Lý thuyết tool calling ở mức API đã có ở [[aiml-05-agents-tools]] (model trả `tool_use`, code của bạn chạy tool, gửi `tool_result` lại). Một coding agent như Claude Code hay Codex CLI chính là **phần code đó, viết sẵn cho repo của bạn**. Docs Claude Code gọi lớp này là *harness*:

> *"The agentic loop is powered by two components: models that reason and tools that act. Claude Code is the layer around the model that provides the tools and manages the context the model sees. This surrounding layer is what the term agentic harness refers to."*
> ([How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works))

Định nghĩa một câu: **harness** là chương trình chạy trên máy bạn, giữ danh sách tool, thực thi tool call mà model yêu cầu, và quyết định cái gì được đưa vào context của model.

Một vòng như sau:

```
prompt của bạn
   │
   ▼
[model] đọc context → trả về: text, hoặc một/vài tool call (Read, Edit, Bash…)
   │                                     │
   │ (chỉ text, không tool call)         ▼
   ▼                         [harness] kiểm permission → (sandbox) → chạy tool
 xong lượt                               │
                                         ▼
                         output tool được NỐI vào context → quay lại [model]
```

Docs mô tả ba pha *gather context → take action → verify results*, và đưa ví dụ "fix the failing tests": chạy test → đọc lỗi → tìm file nguồn → đọc file → sửa → chạy test lại. Sáu bước, mỗi bước là một vòng.

Ba hệ quả suy ra từ sơ đồ — đây là suy luận từ cơ chế, không phải trích dẫn:

1. **Model không bao giờ tự chạy lệnh.** Nó chỉ *đề nghị* một tool call dạng có cấu trúc. Mọi thứ thật sự đụng vào máy bạn đi qua harness. Vì vậy chỗ đặt kiểm soát đúng là harness, không phải lời dặn model.
2. **Output của tool là input của bước sau.** Test in 3.000 dòng log thì 3.000 dòng đó vào context. Agent "thông minh" tới đâu cũng chỉ suy luận trên thứ đã nằm trong context — đó là lý do [[ag-04-context-va-file-huong-dan]] coi context là tài nguyên.
3. **Agent tự kiểm được việc của mình** — vì "chạy test lại" chỉ là một tool call nữa. Đây là khác biệt gốc so với chat ở [[ag-02-chat-va-gioi-han]]: chat không có bước quan sát, nên không có vòng sửa.

### 3.2 Bộ tool: năm nhóm quyền lực

Docs Claude Code chia tool dựng sẵn thành năm nhóm ([How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)):

| Nhóm | Agent làm được gì |
|---|---|
| File operations | đọc, sửa, tạo, đổi tên file |
| Search | tìm file theo pattern, grep nội dung |
| Execution | chạy shell, khởi động server, chạy test, dùng git |
| Web | tìm web, fetch tài liệu |
| Code intelligence | thấy lỗi type sau khi sửa, nhảy tới định nghĩa (cần plugin) |

Nhóm **Execution** là nhóm làm mọi phân tích an toàn trở nên khó: một tool `Bash` chạy được *mọi thứ bạn chạy được trong terminal*. Docs nói thẳng: *"Any command you could run … If you can do it from the command line, Claude can too."* Bốn nhóm còn lại có ngữ nghĩa hẹp (đọc file là đọc file); `Bash` thì ngữ nghĩa phụ thuộc vào chuỗi lệnh — và chuỗi lệnh thì viết được theo vô số cách. Ghi nhớ điểm này, §3.4 cần tới.

### 3.3 Ba lớp quyết định một lệnh có chạy hay không

Đáp án ⏸ là **(d)**. Một tool call phải qua ba lớp, mỗi lớp do một thứ khác quyết:

| Lớp | Ai quyết | Đọc gì để quyết | Sửa bằng gì |
|---|---|---|---|
| 1. Model có gọi không | model | prompt, CLAUDE.md/AGENTS.md, lịch sử context | lời dặn, file hướng dẫn |
| 2. Permission | harness | rule allow/ask/deny, permission mode (Claude Code); approval policy (Codex) | `settings.json`, `config.toml`, flag CLI |
| 3. Sandbox | kernel/OS (Seatbelt trên macOS, bubblewrap trên Linux) | đường dẫn file, kết nối mạng của **process con** | cấu hình sandbox, writable roots, network |

Câu hỏi phụ của ⏸: sửa CLAUDE.md chỉ chạm **lớp 1**. Docs Claude Code nói rõ:

> *"Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or `CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows."*
> ([Configure permissions](https://code.claude.com/docs/en/permissions))

Quay lại case §2 bằng bảng này. Lần đầu bị chặn là **lớp 3** (sandbox chặn script dùng creds). Agent ghi nhận nó như một luật ở **lớp 1** ("phải nhờ người"), rồi áp cho cả những lệnh mà lớp 2 và lớp 3 đều không cản. Cách sửa đúng ở case đó là một feedback có lý do — phân loại theo **đọc hay ghi**, và khi sandbox chặn lệnh đọc thì nói rõ "bị sandbox chặn" chứ đừng biến lần chặn thành luật chung (kinh nghiệm thực tế; cách ghi feedback để agent không phải được dặn lại là chủ đề của Level 3). Còn lệnh ghi thì nên bị giữ ở **lớp 2** bằng cấu hình, để không phụ thuộc vào trí nhớ của model.

Quy tắc chẩn đoán rút ra: khi agent nói "tôi không chạy được", hỏi ngay **thông báo đến từ đâu** — một hộp thoại permission của harness, một lỗi `Operation not permitted`/`network unreachable` trong output lệnh (sandbox), hay chỉ là model tự chọn không gọi.

### 3.4 Claude Code: permission rule và permission mode

**Rule.** Ba danh sách trong `settings.json` — theo docs ([Configure permissions](https://code.claude.com/docs/en/permissions)):

- `allow`: dùng tool không cần hỏi.
- `ask`: luôn hỏi.
- `deny`: cấm.

> *"Rules are evaluated in order: deny, then ask, then allow. The first match in that order determines the outcome, and rule specificity doesn't change the order."*

Nghĩa là một `deny` rộng như `Bash(aws *)` thắng một `allow` hẹp như `Bash(aws s3 ls)` — allow không "khoét lỗ" được trong deny.

File mẫu, đặt ở `.claude/settings.json` trong repo (commit được để cả team dùng chung):

```json
{
  "permissions": {
    "allow": [
      "Bash(python3 -m unittest *)",
      "Bash(git diff *)",
      "Bash(git status *)"
    ],
    "ask": [
      "Bash(git commit *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Read(./.env)"
    ]
  }
}
```

Ba chi tiết cú pháp phải đúng như docs:

- Dấu cách trước `*` có nghĩa: `Bash(git diff *)` khớp lệnh bắt đầu bằng `git diff`; `Bash(git diff*)` khớp luôn `git diff-index`.
- Lệnh ghép được tách theo `&&`, `||`, `;`, `|`… và **mỗi lệnh con** phải khớp riêng. `Bash(npm test *)` không cho qua `npm test && rm -rf dist`.
- Khi bạn bấm "Yes, and don't ask again" cho một lệnh Bash, rule được lưu vào `.claude/settings.local.json` ở gốc repo (file cá nhân). Duyệt sửa file thì chỉ có hiệu lực tới hết session.

**Giới hạn quan trọng nhất: rule Bash khớp chữ, không khớp chương trình.** Docs đưa đúng ví dụ này:

| Rule trong `deny` | Chặn | Không chặn |
|---|---|---|
| `Bash(rm *)` | `rm -rf build/` | `/bin/rm -rf build/`, `bash -c 'rm -rf build/'` |
| `Bash(git push *)` | `git push origin main` | `git -C . push origin main`, `git 'push' origin main` |

Docs kết luận rule kiểu này *"isn't a security boundary around the program"*, và chỉ sang **sandbox** cho ràng buộc file/mạng không phụ thuộc chữ, hoặc **hook `PreToolUse`** để tự kiểm chuỗi lệnh (chủ đề của [[ag-08-hook-va-chan-bang-cau-hinh]]). Nguyên nhân gốc: `Bash` là một ngôn ngữ, và một danh sách pattern không bao giờ liệt kê hết cách viết cùng một hành động trong một ngôn ngữ.

**Mode.** Mode đặt *mức nền* cho mọi tool call; rule tinh chỉnh trên nền đó. Các mode theo docs:

| Mode | Hành vi (tóm từ docs) |
|---|---|
| `default` (hiển thị là Manual) | hỏi lần đầu dùng mỗi tool; Bash hỏi trừ tập lệnh read-only dựng sẵn |
| `acceptEdits` | tự nhận sửa file và lệnh filesystem thường (`mkdir`, `touch`, `mv`, `cp`) trong thư mục làm việc; lệnh khác vẫn hỏi |
| `plan` | đọc file, chạy lệnh read-only để khám phá, không sửa source |
| `auto` | không hỏi thường xuyên; một classifier chạy nền xét các hành động như lệnh shell, request mạng |
| `dontAsk` | tự **từ chối** mọi thứ lẽ ra phải hỏi; thứ đã được allow hoặc không cần duyệt vẫn chạy |
| `bypassPermissions` | bỏ qua prompt, trừ nhóm hành động không mode nào tự duyệt; docs: chỉ dùng trong container/VM cô lập |

Đổi mode trong phiên bằng `Shift+Tab`; đặt mặc định bằng `defaultMode` trong settings. Tập lệnh read-only dựng sẵn (`ls`, `cat`, `grep`, `find`, `wc`, `diff`, dạng read-only của `git`…) chạy không hỏi ở mọi mode và **không cấu hình được** — muốn bắt hỏi thì thêm rule `ask`/`deny`.

**Lưới an toàn của Claude Code: checkpoint.** Trước khi sửa file, Claude Code chụp lại nội dung; nhấn `Esc` hai lần để tua về. Docs giới hạn rõ: checkpoint chỉ phủ **thay đổi file**; *"Actions that affect remote systems (databases, APIs, deployments) can't be checkpointed."* Đây chính là chỗ của case §2: lệnh ghi Firestore không có checkpoint nào cứu — chỉ có script `revert` do người viết sẵn. Git làm lưới an toàn cho file ở mức bền hơn checkpoint ([[ag-05-checkpoint-tung-buoc]]).

### 3.5 Codex CLI: hai trục độc lập — sandbox và approval

Codex tách hai câu hỏi thành hai cấu hình riêng (nguồn: [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security), [CLI reference](https://learn.chatgpt.com/docs/cli/reference), [Sandboxing](https://learn.chatgpt.com/docs/sandboxing)):

**Trục 1 — sandbox mode** (`--sandbox` / `-s`, key `sandbox_mode`): process con được đụng tới đâu.

| Mode | Ý nghĩa |
|---|---|
| `read-only` | đọc được, không sửa file hay chạy lệnh nếu không được duyệt |
| `workspace-write` | đọc, sửa trong workspace, chạy lệnh thường trong ranh giới đó; sửa ngoài workspace hoặc dùng mạng thì cần duyệt |
| `danger-full-access` | không có ranh giới file và mạng |

**Trục 2 — approval policy** (`--ask-for-approval` / `-a`, key `approval_policy`): khi nào dừng hỏi người. CLI reference hiện liệt kê hai giá trị `on-request` và `never`. Với `on-request`, lệnh nằm trong sandbox chạy không cần hỏi; lệnh muốn vượt ranh giới thì hỏi. Docs ghi `untrusted` đã ngừng hỗ trợ — nếu bạn đọc bài blog cũ thấy `untrusted`/`on-failure`, đó là tài liệu lỗi thời.

Mặc định theo docs: thư mục có version control → `workspace-write` + `on-request`; thư mục không có version control → `read-only`. Mạng **tắt** mặc định; bật cho `workspace-write` bằng:

```toml
# ~/.codex/config.toml — minh hoạ, key lấy từ docs
sandbox_mode = "workspace-write"
approval_policy = "on-request"

[sandbox_workspace_write]
network_access = true
```

Ranh giới do OS cưỡng chế: Seatbelt (`sandbox-exec`) trên macOS, bubblewrap + seccomp trên Linux. Và có những đường dẫn được bảo vệ **chỉ đọc** ngay trong vùng ghi được: `<writable_root>/.git`, và `.codex`, `.agents`, `.aws` khi chúng là thư mục. Suy luận từ dòng docs đó (chưa kiểm trên mọi phiên bản): ở `workspace-write`, Codex sửa code được nhưng việc ghi vào `.git` — tức là commit — rơi ra ngoài ranh giới, nên commit đi qua approval, tay người, hoặc lớp điều phối bên ngoài. §4 bước 4 cho bạn tự kiểm.

Hai cờ tắt nhanh theo CLI reference:

- `--approve-for-me` (alias `--not-so-yolo`): approval `on-request` + sandbox `workspace-write`, nhưng câu hỏi duyệt được một bộ review tự động trả lời thay người.
- `--dangerously-bypass-approvals-and-sandbox` (alias `--yolo`): tắt cả hai trục; docs: *"Only use inside an externally hardened environment."*

`--full-auto` xuất hiện nhiều trong hướng dẫn cũ; trang non-interactive hiện ghi nó **không còn được hỗ trợ** cho `codex exec` và đề nghị dùng `--sandbox workspace-write` hoặc `--approve-for-me`.

### 3.6 Hai thiết kế, so theo cơ chế

Khác biệt gốc nằm ở **lớp nào là ranh giới chính**:

- Claude Code đặt ranh giới chính ở **lớp 2**: harness đọc *tên tool và chuỗi lệnh* rồi so với rule. Mạnh ở chỗ chi tiết (cho `npm test` chạy, bắt hỏi `git commit`); yếu ở chỗ rule Bash khớp chữ nên vòng qua được bằng cách viết khác. Sandbox OS là lớp tuỳ chọn bổ sung (docs [Sandboxing](https://code.claude.com/docs/en/sandboxing)), và khi bật sandbox với `autoAllowBashIfSandboxed` mặc định `true`, lệnh Bash chạy trong sandbox không cần hỏi.
- Codex đặt ranh giới chính ở **lớp 3**: OS cưỡng chế file/mạng cho process con, và approval chỉ được hỏi khi lệnh muốn *vượt* ranh giới đó. Mạnh ở chỗ không phụ thuộc cách viết lệnh (`/bin/rm` hay `rm` đều bị cùng một ranh giới thư mục); thô hơn ở chỗ mọi lệnh trong workspace đều chạy như nhau — `rm -rf src/` trong workspace là hợp lệ.

Bảng tổng kết, đặt sau phần giải thích (dòng `rm`/`/bin/rm` là suy luận từ cơ chế đã trích ở trên, không phải câu docs nguyên văn):

| Câu hỏi | Claude Code | Codex CLI |
|---|---|---|
| Ranh giới chính | rule + mode trong harness | sandbox OS |
| Đơn vị cấu hình | `Tool(specifier)` trong `settings.json` | `sandbox_mode` × `approval_policy` trong `config.toml` |
| `rm -rf src/` trong repo, cấu hình mặc định | hỏi (Manual) | chạy (nằm trong workspace) |
| `/bin/rm` thay `rm` | lọt qua deny `Bash(rm *)` | cùng ranh giới như `rm` |
| Gọi mạng | WebFetch/WebSearch hỏi; `curl` qua Bash theo rule | tắt mặc định trong sandbox |
| Hoàn tác file | checkpoint (`Esc` hai lần) + git | git |
| Chế độ "tắt hết" | `bypassPermissions` | `--yolo` |

Kinh nghiệm thực tế từ việc dùng song song cả hai: không có cái nào "an toàn hơn" tuyệt đối. Câu hỏi đúng là **rủi ro của việc này nằm ở lớp nào** — sợ agent xoá nhầm trong repo thì git + review diff giải quyết; sợ agent đọc creds hay gọi ra ngoài thì cần ranh giới OS; sợ agent ghi vào hệ thống từ xa thì cả hai công cụ đều không checkpoint được, phải giữ lệnh đó ở chế độ hỏi người. Cách chia việc giữa hai họ model nằm ở [[ag-16-hai-ho-model]].

### 3.7 Headless: agent không có người ngồi trước màn hình

**Headless** (non-interactive) là chạy agent một lượt từ script: nhận prompt, chạy vòng lặp tới khi xong, in kết quả, thoát. Đây là nền của mọi level từ 6 trở lên.

**Claude Code** — `claude -p` (hoặc `--print`), theo [Run Claude Code programmatically](https://code.claude.com/docs/en/headless):

```bash
# đọc-hỏi: không cần quyền ghi
claude -p "What does the auth module do?"

# sửa + chạy test, duyệt trước đúng ba tool
claude -p "Run the test suite and fix any failures" --allowedTools "Bash,Read,Edit"

# mức nền: tự nhận sửa file, lệnh khác vẫn cần allow
claude -p "Apply the lint fixes" --permission-mode acceptEdits

# kết quả máy đọc được
claude -p "Summarize this project" --output-format json | jq -r '.result'
```

Các dữ kiện docs cần nhớ:

- Exit code `0` khi thành công, khác `0` khi run thất bại — script rẽ nhánh được. Nhưng lỗi *bên trong* run (ví dụ thiếu đăng nhập) được in ra như **kết quả trên stdout** — nên kiểm cả exit code lẫn nội dung.
- `--output-format`: `text`, `json` (có `result`, `session_id`, `total_cost_usd`), `stream-json`.
- Trong `-p` không có ai trả lời prompt duyệt: thứ lẽ ra phải hỏi sẽ bị từ chối. `--permission-mode dontAsk` làm việc đó tường minh; `--permission-prompts none` báo cho model biết không ai duyệt để nó khỏi thử lại.
- Không có `--bare`, một phiên `-p` nạp đủ thứ một phiên tương tác nạp — kể cả **hook trong `.claude/settings.json` của repo và MCP server trong `.mcp.json`, ngay cả ở thư mục bạn chưa từng tin cậy**, không hiện hộp thoại trust. Chạy `-p` trên repo lạ trong CI thì dùng `--bare`.
- Tiếp phiên: `--continue` (phiên gần nhất) hoặc `--resume <session_id>`.

**Codex** — `codex exec`, theo [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode):

```bash
# mặc định chạy trong sandbox read-only
codex exec "summarize the repository structure and list the top 5 risky areas"

# cho phép sửa trong workspace
codex exec --sandbox workspace-write "fix the failing unit test in calc.py"

# máy đọc được: JSONL events, hoặc ghi câu trả lời cuối ra file
codex exec --json "summarize the repo structure" | jq
codex exec "Extract project metadata" --output-schema ./schema.json -o ./project-metadata.json

# tiếp phiên
codex exec resume --last "fix the race conditions you found"
```

Dữ kiện docs: tiến trình in ra **stderr**, chỉ thông điệp cuối in ra **stdout**; mặc định phải chạy trong git repo (`--skip-git-repo-check` để bỏ); `--ephemeral` để không lưu file phiên.

Điểm chung của hai công cụ khi headless: **mặc định là hẹp** (Claude Code từ chối thứ phải hỏi, Codex exec read-only), và bạn mở rộng có chủ đích bằng flag. Thiết kế ngược lại — mặc định rộng rồi đi chặn — là thứ cả hai đều tránh, vì không có người ngồi đó bấm "No".

Kinh nghiệm thực tế từ các job headless chạy hằng ngày của tác giả: `--add-dir` nhận **nhiều** đường dẫn liên tiếp, nên prompt đặt sau nó bị nuốt làm một đường dẫn, và `claude` báo thiếu input. Cách chặn bằng cơ chế: luôn đặt prompt **ngay sau** `--print`, và để exit code khác 0 làm job fail to rõ thay vì nuốt trong log:

```bash
# Đúng — prompt đứng ngay sau --print
claude --print "$PROMPT" --permission-mode acceptEdits --add-dir "$NOTES_DIR"
# Sai — $PROMPT bị --add-dir nuốt như một thư mục
claude --print --add-dir "$NOTES_DIR" "$PROMPT"
```

Các job đó còn dùng thêm `--max-turns` để chặn vòng lặp chạy vô hạn và `--disallowedTools` để rút hẳn tool ghi khỏi phiên chỉ cần đọc — chủ đề của [[ag-23-job-dinh-ky-va-bot]].

---

## 4. Làm thử

Mục tiêu: thấy tận mắt ba lớp của §3.3 trên một repo đồ chơi, và đo — chứ không đoán — agent hỏi duyệt bao nhiêu lần.

**Bước 0 — dựng repo có một test đỏ.** Chỉ cần Python 3 chuẩn, không cài gì thêm:

```bash
mkdir agent-lab && cd agent-lab && git init -q
cat > calc.py <<'EOF'
def average(xs):
    return sum(xs) / len(xs) + 1   # bug cố ý
EOF
cat > test_calc.py <<'EOF'
import unittest
from calc import average

class T(unittest.TestCase):
    def test_average(self):
        self.assertEqual(average([2, 4, 6]), 4)
    def test_empty(self):
        self.assertEqual(average([]), 0)

if __name__ == "__main__":
    unittest.main()
EOF
echo "SECRET=do-not-read" > .env
printf '.env\n' > .gitignore
git add . && git commit -qm "init: failing tests"
python3 -m unittest -q; echo "exit=$?"     # kỳ vọng: exit=1
```

**Bước 1 — đếm số lần lẽ ra phải hỏi, không cần ngồi bấm.** Chạy với `dontAsk`: mọi thứ lẽ ra hỏi sẽ bị từ chối. Docs headless nói result message cuối liệt kê chúng trong `permission_denials`; với `--output-format json`, output chính là result message đó — kiểm bằng `jq 'keys'` trước khi tin.

```bash
claude -p "Run the tests with python3 -m unittest, then fix calc.py so all tests pass. Do not modify tests." \
  --permission-mode dontAsk --output-format json > run1.json
jq 'keys' run1.json                         # xem trường có thật trên phiên bản của bạn
jq '.permission_denials | length' run1.json
jq '.permission_denials' run1.json          # tool nào bị từ chối
git status --short
```

Ghi lại số đếm. Kỳ vọng định tính: `git status` sạch (Edit bị từ chối), và danh sách từ chối có `Edit` và/hoặc `Bash`. Con số cụ thể tuỳ phiên — đừng tin số của người khác, đo của bạn.

**Bước 2 — thêm cấu hình, chạy lại.** Tạo `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(python3 -m unittest *)",
      "Bash(python3 -m unittest)",
      "Edit(./calc.py)"
    ],
    "deny": [
      "Read(./.env)",
      "Edit(./test_calc.py)",
      "Bash(git push *)"
    ]
  }
}
```

```bash
claude -p "Run the tests with python3 -m unittest, then fix calc.py so all tests pass. Do not modify tests." \
  --permission-mode dontAsk --output-format json > run2.json
echo "claude exit=$?"
jq '.permission_denials | length' run2.json
python3 -m unittest -q; echo "test exit=$?"
git diff --stat
```

**Bước 3 — thử lớp 1 so với lớp 2.** Xoá dòng `"Edit(./test_calc.py)"` khỏi `deny`, `git checkout .`, rồi chạy prompt **không** có câu "Do not modify tests". Xem `git diff --stat` có chạm `test_calc.py` không. Sau đó đặt lại rule deny và chạy cùng prompt đó. Ghi lại: ràng buộc nào giữ được dù prompt không nhắc.

**Bước 4 — Codex, hai trục.** Trong cùng repo (`git checkout .` trước):

```bash
codex exec "fix calc.py so python3 -m unittest passes" ; git status --short   # read-only mặc định
codex exec --sandbox workspace-write "fix calc.py so python3 -m unittest passes"
git status --short && python3 -m unittest -q; echo "test exit=$?"
codex exec --sandbox workspace-write "commit your change with message 'fix average'"; git log --oneline | head -2
```

Quan sát lần cuối: commit có được tạo không, và nếu không thì thông báo lỗi đến từ lớp nào (gợi ý: `.git` là đường dẫn bảo vệ chỉ đọc).

**Tiêu chí "xong" — kiểm được:**

- [ ] `run1.json` có `permission_denials` khác rỗng và `git status --short` sau bước 1 rỗng.
- [ ] Sau bước 2: `python3 -m unittest -q` exit `0`, `git diff --stat` chỉ có `calc.py`, `jq '.permission_denials | length' run2.json` nhỏ hơn ở bước 1.
- [ ] Bước 3: bạn ghi được một câu "rule deny giữ / lời dặn trong prompt giữ / không giữ" kèm `git diff --stat` làm bằng chứng.
- [ ] Bước 4: lần `codex exec` đầu không đổi file nào; lần thứ hai làm test xanh; bạn chỉ ra được lớp đã chặn lệnh commit (hoặc giải thích vì sao nó không bị chặn trên máy bạn).
- [ ] Không file nào trong output của agent chứa chuỗi `do-not-read`: `grep -rl do-not-read run*.json` rỗng.

Bài toán test rỗng (`average([])`) cố ý mơ hồ: trả `0` hay ném lỗi? Nếu agent tự quyết mà không hỏi, đó là dấu hiệu bạn chưa đặt tiêu chí xong — chủ đề Level 4.

---

## 5. Bẫy thường gặp

🪤 **Agent tự biến một lần bị chặn thành luật chung.**
Triệu chứng: agent đẩy cả lệnh đọc sang cho người chạy tay, buổi làm việc chậm lại vì mỗi lệnh là một vòng chờ.
Nguyên nhân gốc: chặn xảy ra ở lớp 3 (sandbox) nhưng agent ghi nhận ở lớp 1 (một "quy tắc" tự đặt trong context), và không có gì trong context nói ranh giới thật là đọc/ghi.
Chặn bằng cơ chế: cho phép lệnh đọc ở lớp 2 bằng rule `allow` cụ thể; giữ lệnh ghi ở `ask`; ghi một feedback có Why nói rõ ranh giới là đọc vs ghi (Level 3).

🪤 **Tin rằng `deny: Bash(rm *)` là hàng rào.**
Triệu chứng: rule nằm đó, nhưng `bash -c 'rm …'` hoặc `/bin/rm` vẫn chạy.
Nguyên nhân gốc: rule Bash khớp chuỗi lệnh sau khi tách lệnh ghép, không khớp chương trình; docs nói rõ nó không phải security boundary.
Chặn bằng cơ chế: bật sandbox OS cho ràng buộc file/mạng, hoặc hook `PreToolUse` tự kiểm chuỗi lệnh; chạy `bypassPermissions`/`--yolo` chỉ trong VM/container dùng một lần.

🪤 **Ghi "đừng sửa test" vào prompt và nghĩ là đã chặn.**
Triệu chứng: một lượt dài, context bị nén, agent sửa test cho xanh.
Nguyên nhân gốc: lời dặn ở lớp 1, chịu ảnh hưởng của context; docs: *"they don't change what Claude Code allows."*
Chặn bằng cơ chế: `deny: ["Edit(./test_calc.py)"]` (hoặc pattern thư mục test); kiểm sau bằng `git diff --stat`.

🪤 **Tưởng checkpoint cứu được mọi thứ.**
Triệu chứng: agent chạy script ghi database / gọi API, bạn nhấn `Esc` hai lần, file về như cũ nhưng dữ liệu thì không.
Nguyên nhân gốc: checkpoint chỉ chụp file cục bộ; docs: hành động lên hệ thống từ xa không checkpoint được.
Chặn bằng cơ chế: lệnh ghi ra ngoài luôn ở `ask`; script ghi phải có chế độ `read`/`apply`/`revert` (case §2).

🪤 **Headless "thành công" mà không làm gì.**
Triệu chứng: job cron báo xong, không có thay đổi nào; log chỉ có một câu trả lời lịch sự.
Nguyên nhân gốc: trong `-p` không ai duyệt, tool cần duyệt bị từ chối; hoặc lỗi bên trong run (thiếu đăng nhập) được in như kết quả trên stdout; hoặc prompt bị một flag nuốt.
Chặn bằng cơ chế: `--output-format json`, fail job khi `permission_denials` khác rỗng ngoài dự kiến hoặc exit code khác 0; prompt đặt ngay sau `--print`; kiểm hiệu ứng (`git diff`, file đầu ra) chứ không kiểm lời agent nói.

🪤 **Chạy `-p` trên repo lạ và nạp nguyên cấu hình của repo đó.**
Triệu chứng: CI chạy agent trên PR từ fork, hook trong `.claude/settings.json` của PR được thực thi.
Nguyên nhân gốc: không có `--bare`, `-p` nạp hook và MCP server của thư mục mà không hỏi trust.
Chặn bằng cơ chế: `--bare` cho script/CI, truyền cấu hình tường minh bằng `--settings`, `--mcp-config`.

🪤 **Copy cờ Codex từ bài viết cũ.**
Triệu chứng: `--full-auto` hoặc `-a untrusted` báo lỗi hoặc hành vi khác mong đợi.
Nguyên nhân gốc: tên cờ và giá trị policy đã đổi; docs hiện ghi `untrusted` ngừng hỗ trợ, `--full-auto` không còn cho `codex exec`.
Chặn bằng cơ chế: `codex --help` / `codex exec --help` trên đúng phiên bản bạn chạy trước khi viết script; script fail khi gặp exit code khác 0.

---

## 6. Chuyển giao

Ở level này bạn đã bỏ được copy-paste: agent tự đọc, sửa, chạy, quan sát. Cái giá là **bạn vẫn đứng trong vòng lặp** — mỗi hộp thoại duyệt là một lần bạn bị kéo về màn hình. §4 cho bạn cách đếm con số đó thay vì cảm nhận.

- [[ag-04-context-va-file-huong-dan]]: vòng lặp nối mọi output vào context, nên context đầy rất nhanh. Bài kế dạy file hướng dẫn nạp mỗi phiên và chuyện gì xảy ra khi context bị nén.
- [[ag-05-checkpoint-tung-buoc]]: checkpoint chỉ phủ file; git là lưới bền hơn. Bài đó tính thử chi phí phút/ngày của việc duyệt từng bước — con số mà các level sau phá bỏ.
- [[ag-08-hook-va-chan-bang-cau-hinh]]: rule Bash khớp chữ là giới hạn; hook `PreToolUse` là cách tự kiểm chuỗi lệnh bằng code của bạn.
- Level 6–7 dùng thẳng headless ở §3.7: một brief, một `claude -p`/`codex exec`, một cấu hình permission hẹp, và kiểm hiệu ứng bằng exit code + JSON.

Thứ level kế tiếp bỏ được nhờ bài này: dặn lại agent mỗi phiên "đừng push, đừng đọc `.env`, cứ chạy test thoải mái" — vì những câu đó giờ nằm trong `settings.json` / `config.toml`, không nằm trong trí nhớ của ai.

---

## 7. Tóm tắt

- Coding agent = model + **harness**. Model chỉ đề nghị tool call; harness chạy nó và nối output vào context. Vòng lặp: gather context → take action → verify results.
- Một lệnh có chạy hay không do **ba lớp**: model (prompt, CLAUDE.md), permission của harness, sandbox OS. Lời dặn chỉ chạm lớp 1.
- Claude Code: rule `deny → ask → allow`, deny thắng mọi allow; mode `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. Rule Bash khớp chữ — không phải hàng rào quanh chương trình.
- Codex: hai trục độc lập — `sandbox_mode` (`read-only` / `workspace-write` / `danger-full-access`) × `approval_policy` (`on-request` / `never`); mạng tắt mặc định; `.git` chỉ đọc trong workspace.
- Checkpoint của Claude Code chỉ hoàn tác file; ghi lên hệ thống từ xa thì không công cụ nào hoàn tác hộ — giữ chúng ở chế độ hỏi người và viết sẵn đường revert.
- Headless: `claude -p` (exit code + `--output-format json`, `--bare` cho CI) và `codex exec` (read-only mặc định, stdout chỉ có thông điệp cuối). Mặc định hẹp, mở rộng bằng flag có chủ đích.
- Đo, đừng đoán: `--permission-mode dontAsk` + `permission_denials` cho biết agent lẽ ra hỏi bạn bao nhiêu lần.
