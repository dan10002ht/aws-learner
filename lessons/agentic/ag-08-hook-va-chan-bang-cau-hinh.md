# Bài 8 — Hook và permission: chặn bằng cấu hình, không bằng lời dặn

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân biệt **lời dặn** (chữ trong prompt, `CLAUDE.md`, brief) với **rào chắn** (permission rule, hook, credential, sandbox), và chỉ ra lớp nào do model quyết, lớp nào do chương trình quyết.
- Viết một khối `permissions` trong `settings.json` với `allow` / `ask` / `deny`, dự đoán đúng kết quả khi một lệnh khớp nhiều rule cùng lúc.
- Liệt kê được ít nhất ba dạng lệnh mà rule `Bash(git push *)` **không** chặn, và viết một hook `PreToolUse` chặn được các dạng đó.
- Chọn đúng hook event (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`) cho một nhu cầu cụ thể, và giải thích exit code 0 / 2 / khác làm gì ở từng event.
- Thiết kế nội dung trả về từ tool hoặc hook sao cho nó mang **sự kiện**, không mang **chỉ thị** cho agent — và nói được vì sao.

---

## 2. Tình huống

Ba chuyện, cùng một gốc. Cả ba đều là case thực tế, ẩn danh.

**Chuyện 1 — "đừng ghi vào DB dev".** Một dev giao cho subagent (agent con do agent chính sinh ra, có context riêng) việc sửa integration test của một service gửi email. Brief có một dòng ràng buộc rõ: *không ghi vào DB dev dùng chung*. Agent sửa code đúng. Nhưng test đọc tên DB từ biến môi trường, và **giá trị mặc định** của biến đó chính là tên DB dev đang chạy thật. Agent chạy `go test` một lần:

- 6 dòng thật được ghi vào bảng job email của stack dev dùng chung.
- Agent còn tự tạo thêm một database test và chạy migrate.

Agent tự khai và tự dọn 6 dòng. Một verifier chỉ-đọc kiểm lại: sạch — trừ một thứ. Sequence của bảng đã nhảy lên 12. **Sequence không lùi được.** Không có lệnh "hoàn tác" cho việc đó.

Agent có "không nghe lời" không? Không hẳn. Nó không hề gõ lệnh ghi vào DB dev. Nó chạy test — việc nó được giao — và cấu hình mặc định làm phần còn lại. Lời dặn nằm trong prompt; giá trị mặc định nằm trong code. Code thắng.

**Chuyện 2 — câu báo lỗi biết ra lệnh.** Một app bên thứ ba cung cấp tool cho trợ lý AI của một nền tảng thương mại điện tử. Khi một tool bị khoá theo gói cước, app phải trả về "không dùng được" mà không để trợ lý biến câu đó thành lời mời nâng gói. Câu trả lời đi qua ba vòng:

| Vòng | Tool response | Vấn đề |
|---|---|---|
| 1 | "This action isn't available on the shop's current plan" | chữ *plan* là mồi — agent chỉ việc viết nốt câu upsell |
| 2 | bỏ chữ *plan*, **thêm chỉ thị cho agent** vào response: báo lại cho người dùng rồi dừng | policy của nền tảng cấm "embedded directives" trong tool response, và response bị kiểm lúc runtime |
| 3 | một câu trần thuật: "This action isn't available for this shop." — chỉ thị chuyển sang file instructions của extension | đạt |

Vòng 2 là bản năng tự nhiên của dev: "agent làm sai thì dặn nó trong chính chỗ nó đọc". Và đó là chỗ sai.

**Chuyện 3 — hook bắn đúng giờ nhưng hỏi sai câu.** Một dev có kho note kinh nghiệm (second brain — xem [[ag-22-second-brain]]) và muốn agent tự tra kho đó trước khi debug. Lời dặn "tra brain trước" đã nằm trong file hướng dẫn từ lâu. Đo lại trên 71 transcript phiên làm việc thật: chỉ **9/71 ≈ 13%** phiên từng mở một note. Dev chuyển sang hook `SessionStart` tự tra theo tên nhánh — bắn được 3 lần, **chuyển được 0** tri thức hữu ích. Phải đổi sang hook `UserPromptSubmit` tra theo **lời mô tả triệu chứng** trong mỗi lượt chat thì kết quả mới khác (§3.5).

(Con số 9/71, 3 lần, 0 lần là case thực tế, một lần đo, không phải benchmark.)

---

## ⏸ Dừng lại — đoán trước

Bạn có `settings.json` này:

```json
{
  "permissions": {
    "allow": ["Bash(git *)"],
    "deny":  ["Bash(git push *)"]
  }
}
```

Agent chạy `git -C . push origin main`. Chuyện gì xảy ra?

```
(a) Bị chặn — deny luôn thắng allow
(b) Chạy luôn, không hỏi — deny không khớp, allow thì khớp
(c) Hiện prompt hỏi bạn — không rule nào khớp chính xác
(d) Lỗi cấu hình — hai rule chồng nhau
```

Đáp án ở §3.2.

---

## 3. Cơ chế

### 3.1 Lời dặn và rào chắn sống ở hai tầng khác nhau

Một coding agent là một vòng lặp: model đề xuất một tool call (đọc file, sửa file, chạy shell), **chương trình harness** (Claude Code, Codex CLI) quyết có thực thi hay không, rồi đưa kết quả về cho model (xem [[ag-03-coding-agent-hoat-dong]] và [[aiml-05-agents-tools]]). Có hai chỗ để ràng buộc hành vi:

| Tầng | Ví dụ | Ai thực thi | Khi model "quên" thì |
|---|---|---|---|
| Lời dặn | prompt, `CLAUDE.md`, brief, skill | model, theo xác suất | lệnh vẫn chạy |
| Rào chắn | permission rule, hook, credential, sandbox, giá trị mặc định | chương trình, theo luật | lệnh bị chặn hoặc hỏng ồn ào |

Docs Claude Code nói thẳng điều này (nguồn: https://code.claude.com/docs/en/permissions):

> Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or `CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows.

Vì sao lời dặn bị vượt, kể cả khi model "muốn" tuân thủ? Kinh nghiệm thực tế cho thấy bốn đường:

1. **Lời dặn không tới nơi.** Subagent chỉ thấy brief nó được đưa. Ràng buộc nằm trong `CLAUDE.md` của phiên chính nhưng không chép vào brief thì subagent không biết. Sau compaction (tóm tắt context khi đầy), một dòng ràng buộc có thể bị tóm mất.
2. **Lời dặn cạnh tranh với mục tiêu.** "Làm test xanh" và "đừng đụng DB dev" cùng nằm trong context. Khi đường ngắn nhất tới mục tiêu đi qua vùng cấm, xác suất đi qua không bằng 0.
3. **Hành động gây hại không trông giống hành động bị cấm.** Chuyện 1: agent không viết `INSERT` vào DB dev, nó chạy `go test`. Lời dặn mô tả *hậu quả*; model chỉ kiểm soát được *lệnh*. Không có gì nối hai thứ đó lại ngoài cấu hình.
4. **Lời dặn không có thứ ép.** Một ràng buộc chỉ có giá trị bằng thứ ép nó. Thứ gì phải *nhớ* mới đúng thì sớm muộn sẽ có một lần không nhớ.

Hệ quả thiết kế: **hỏng về phía an toàn phải là hành vi mặc định**, không phải phần thưởng cho việc đọc kỹ prompt. Với chuyện 1, sửa đúng không phải là thêm một dòng dặn đậm hơn, mà là:

| Cách chặn | Khi agent làm sai |
|---|---|
| Dặn "đừng ghi vào DB dev" | ghi thật, phát hiện sau khi đã ghi |
| Default của biến tên DB trỏ vào một DB **không tồn tại** | test skip hoặc lỗi kết nối — hỏng ồn ào, không hỏng dữ liệu |
| Credential chỉ có quyền đọc | DB từ chối ghi, không phụ thuộc agent nhớ hay quên |
| Agent chạy trong worktree/container riêng ([[ag-15-worktree-va-xung-dot]]) | không có đường chạm tài nguyên chung |

Bài này tập trung vào hai rào chắn mà chính harness cung cấp: **permission** và **hook**.

### 3.2 Permission: allow / ask / deny

Permission rule nằm trong khối `permissions` của file settings. Docs liệt kê ba loại (nguồn: https://code.claude.com/docs/en/permissions):

- `allow` — dùng tool mà không cần bạn duyệt.
- `ask` — luôn hỏi trước khi dùng.
- `deny` — không cho dùng.

Thứ tự đánh giá là cố định: **deny, rồi ask, rồi allow**; khớp cái đầu tiên theo thứ tự đó là kết quả, độ cụ thể của rule không đổi thứ tự. Docs: *"An allow rule can't carve an exception out of a deny rule."* Deny ở bất kỳ tầng settings nào (user, project, local, managed) cũng chặn allow ở tầng khác.

Cú pháp là `Tool` hoặc `Tool(specifier)`:

| Rule | Khớp |
|---|---|
| `Bash` | mọi lệnh shell; dùng làm deny thì tool bị gỡ khỏi context |
| `Bash(npm run *)` | `npm run build`, `npm run test --watch`, `npm run` — không khớp `npm install` |
| `Bash(ls *)` vs `Bash(ls*)` | dấu cách trước `*` là một phần rule: cái đầu không khớp `lsof`, cái sau khớp |
| `Read(./.env)` | đọc `.env` trong thư mục hiện tại |
| `Edit(/src/**/*.ts)` | `/` đầu = tương đối với nơi đặt file settings, **không phải** gốc filesystem |
| `Read(//etc/**)` | `//` đầu mới là đường dẫn tuyệt đối |
| `WebFetch(domain:example.com)` | fetch tới domain đó |
| `mcp__github__get_*` | các tool `get_` của MCP server tên `github` |

Bash rule hiểu toán tử shell: `Bash(safe-cmd *)` không cho phép `safe-cmd && other-cmd` — docs nói mỗi lệnh con phải khớp rule riêng (các dấu tách: `&&`, `||`, `;`, `|`, `|&`, `&`, xuống dòng).

**Đáp án câu đoán trước: (b).** Rule `Bash(git push *)` so khớp *văn bản lệnh*; `git -C . push origin main` bắt đầu bằng `git -C`, không bắt đầu bằng `git push`, nên deny không khớp. `Bash(git *)` thì khớp, nên lệnh chạy thẳng. Docs đưa đúng ví dụ này trong bảng "What a Bash rule doesn't match":

| Rule deny | Chặn | **Không** chặn |
|---|---|---|
| `Bash(curl *)` | `curl https://example.com` | `/usr/bin/curl https://example.com`, `sh -c 'curl …'` |
| `Bash(rm *)` | `rm -rf build/` | `/bin/rm -rf build/`, `bash -c 'rm -rf build/'` |
| `Bash(git push *)` | `git push origin main` | `git -C . push origin main`, `git -c push.default=current push origin main`, `git 'push' origin main` |

Docs kết luận một rule như vậy *"isn't a security boundary around the program"* — nó chặn dạng lệnh agent **thường** viết, không chặn chương trình. Muốn chặn theo logic trên toàn văn lệnh thì dùng hook `PreToolUse`; muốn chặn ở mức hệ điều hành (file, mạng) bất kể lệnh viết thế nào thì dùng sandbox.

Hai điểm nữa về Read/Edit, cũng theo docs:

- Deny `Read`/`Edit` áp cho tool file built-in, cho lệnh Bash mà Claude Code **nhận ra** (`cat`, `head`, `tail`, `sed`, `tee`) và cho đích redirect (`> file`, `< file`). Nó **không** áp cho lệnh đọc file mà không gọi tên file (`grep -r pattern .`) hay cho script Python/Node tự mở file.
- `.claudeignore` không có tác dụng; muốn giấu file thì dùng deny `Read`.

### 3.3 Hook: chương trình của bạn chen vào vòng lặp

**Hook** là một lệnh shell (hoặc HTTP endpoint, prompt, agent) do bạn đăng ký, được harness chạy tự động tại một thời điểm cố định trong vòng đời phiên. Docs hooks-guide mô tả: hook cho *"deterministic control: certain actions always happen rather than relying on the LLM to choose to run them"* (nguồn: https://code.claude.com/docs/en/hooks-guide).

Cấu hình có ba tầng lồng nhau: **event** → **matcher group** (lọc khi nào bắn) → **danh sách handler**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-bash.sh", "timeout": 10 }
        ]
      }
    ]
  }
}
```

Các event hay dùng nhất (docs liệt kê hơn 30 event và danh sách thay đổi nhanh — tra lại https://code.claude.com/docs/en/hooks trước khi dùng event lạ):

| Event | Bắn khi | Matcher lọc theo | Exit 2 làm gì |
|---|---|---|---|
| `SessionStart` | phiên bắt đầu hoặc resume | `startup`, `resume`, `clear`, `compact`, `fork` | chỉ hiện stderr cho người, không chặn |
| `UserPromptSubmit` | bạn gửi prompt, trước khi model xử lý | — | chặn prompt, không tới model |
| `PreToolUse` | trước khi một tool call chạy | tên tool (`Bash`, `Edit\|Write`, `mcp__.*`) | chặn tool call, stderr thành phản hồi cho model |
| `PermissionRequest` | tool call cần quyết định quyền | tên tool | — |
| `PostToolUse` | sau khi tool call **thành công** | tên tool | hiện stderr cho model; tool **đã chạy rồi** |
| `Stop` | model trả lời xong một lượt | — | không cho dừng, model làm tiếp |
| `SubagentStop` | subagent xong | loại agent | — |
| `PreCompact` / `PostCompact` | trước/sau compaction | `manual`, `auto` | — |
| `SessionEnd` | phiên kết thúc | lý do kết thúc | — |

Cơ chế giao tiếp: harness đưa JSON vào **stdin** của script; script trả lời bằng **exit code** và **stdout/stderr**. Trường chung có `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`. `PreToolUse` có thêm `tool_name`, `tool_input` (với Bash: `tool_input.command`); `UserPromptSubmit` có `prompt`; `Stop` có `stop_hook_active`.

Exit code, theo docs:

- **0** — không phản đối. Với `PreToolUse`, exit 0 **không** có nghĩa là duyệt: luồng permission bình thường vẫn chạy. Với `UserPromptSubmit` và `SessionStart`, stdout dạng chữ được thêm vào context của model.
- **2** — chặn (ở event chặn được). Lý do lấy từ **stderr**.
- **khác** — với đa số event là lỗi không chặn: hành động vẫn tiếp tục, transcript hiện thông báo hook error. Đây là bẫy: script crash vì thiếu `jq` thì exit 127, và **lệnh nguy hiểm vẫn chạy** (§5).

Muốn kiểm soát chi tiết hơn chặn/không chặn, script exit 0 và in JSON. Với `PreToolUse`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Database writes are not allowed"
  }
}
```

`permissionDecision` nhận `allow` (bỏ qua prompt hỏi), `deny` (huỷ, gửi lý do cho model), `ask` (hỏi người), và `defer` (chỉ ở chế độ `-p`). `Stop` và `PostToolUse` dùng trường cấp cao nhất `"decision": "block"` kèm `reason`. `UserPromptSubmit` và `SessionStart` chèn chữ vào context qua `hookSpecificOutput.additionalContext` — đặt `additionalContext` ở cấp cao nhất thì bị **lặng lẽ bỏ qua**.

Matcher: chỉ chữ/số/`_`/`-`/dấu cách/`,`/`|` thì là so khớp chính xác (`Edit|Write`); có ký tự khác thì là regex JavaScript **không neo** — `Edit.*` khớp cả `NotebookEdit`, muốn khớp đúng thì viết `^Edit$`. Matcher phân biệt hoa thường. Tool MCP có tên dạng `mcp__<server>__<tool>`.

### 3.4 Hook và permission chồng lên nhau thế nào

Đây là phần quyết định bạn đặt rào ở đâu. Theo docs (permissions + hooks-guide):

1. `PreToolUse` hook chạy **trước** khi kiểm permission mode, ở **mọi** mode. Hook trả `deny` chặn được cả khi chạy `bypassPermissions` hay `--dangerously-skip-permissions`.
2. Hook exit 2 chặn **trước khi** permission rule được đánh giá — nên chặn được cả lệnh mà một allow rule đã cho phép. Docs gợi ý đúng mẫu: allow `"Bash"` cho rộng, rồi dùng hook từ chối vài lệnh cụ thể.
3. Chiều ngược lại **không** đúng: hook trả `allow` không vượt được deny rule hay ask rule. Docs: hook trong settings *"can tighten restrictions but not loosen them past what permission rules allow"*.
4. Nhiều hook cùng khớp thì **chạy song song**, rồi lấy câu trả lời chặt nhất theo thứ tự `deny` > `defer` > `ask` > `allow`. Một hook `deny` không ngăn hook khác chạy xong — đừng trông vào nó để chặn side-effect của hook bên cạnh.

```
tool call được model đề xuất
        │
        ▼
 PreToolUse hooks (song song) ── exit 2 / deny ──► CHẶN, lý do về cho model
        │ (không phản đối, hoặc allow)
        ▼
 deny rules ── khớp ──► CHẶN
        ▼
 ask rules  ── khớp ──► HỎI NGƯỜI
        ▼
 allow rules / hook allow / permission mode ──► CHẠY hoặc HỎI
        │
        ▼
     tool chạy ──► PostToolUse hooks (chỉ còn báo/ghi log, không hoàn tác được)
```

(Sơ đồ là minh hoạ đơn giản hoá theo docs; mode `auto` có thêm bước classifier, xem trang permission-modes.)

Hệ quả: **chặn thì đặt ở `PreToolUse`, không đặt ở `PostToolUse`.** Docs hooks-guide nói rõ `PostToolUse` *"can't undo actions since the tool has already executed"*. Chuyện 1 mà chỉ có hook PostToolUse thì 6 dòng vẫn ghi, sequence vẫn nhảy.

Ba tầng rào chắn, xếp theo thứ chúng **không** bị lách được:

| Tầng | Chặn theo | Lách được bằng |
|---|---|---|
| Permission rule | tiền tố văn bản lệnh | đường dẫn tuyệt đối, `sh -c`, cờ đặt trước subcommand |
| Hook `PreToolUse` | logic bạn viết trên toàn văn lệnh | lệnh nằm trong một script file (`bash deploy.sh`), alias, mã hoá chuỗi |
| Credential / sandbox / branch protection phía server | quyền thật ở OS hoặc ở hệ thống đích | không lách được từ phía agent |

Kinh nghiệm thực tế: dùng cả ba. Permission rule cho dạng lệnh phổ biến (rẻ, có sẵn, có prompt rõ ràng), hook cho dạng biến thể, và tầng thứ ba cho thứ không được phép sai dù chỉ một lần (push lên nhánh chính, ghi DB thật, xoá dữ liệu).

### 3.5 Hook không chỉ để chặn: tiêm ngữ cảnh đúng lúc

Chuyện 3 dùng hook theo hướng ngược lại: không chặn, mà **nhắc**. Vì sao hook `SessionStart` chuyển được 0 tri thức còn hook `UserPromptSubmit` thì khác? Kinh nghiệm thực tế từ case đó:

- **Sai tín hiệu.** `SessionStart` chỉ biết tên nhánh. Tên nhánh nói *việc tên gì*, không nói *triệu chứng gì*. Cùng công cụ tra cứu đó, khi được đưa triệu chứng, xếp đúng note ở hạng 1 trong 6/6 câu thử.
- **Sai thời điểm.** `SessionStart` bắn một lần. Một phiên được đo mở ở nhánh chính rồi làm việc trên 6 nhánh feature mà không lần nào tra lại.
- **Sai chỗ đăng ký.** Hook nằm trong `.claude/settings.local.json` của hai repo — file này không được commit, nên worktree tạo ra từ repo đó **không có hook**. Chuyển đăng ký sang `~/.claude/settings.json` (cấp user) thì mọi repo và worktree đều thừa hưởng.

Bản mới dùng `UserPromptSubmit`, đọc trường `prompt`, có ba cổng chống ồn: prompt phải có dấu hiệu sự cố và đủ dài; chỉ in khi tìm được note đủ chất lượng; không in lại note đã in trong phiên. Hook này chạy **trước mỗi tin nhắn ở mọi repo**, nên chi phí phải tính:

```
# Tính thử — 0,2 s/lượt là số đo trong case (một lần đo); số lượt/ngày là giả định
 60 lượt/ngày × 0,2 s = 12 s/ngày  → ×22 ngày ≈ 4,4 phút/tháng
120 lượt/ngày × 0,2 s = 24 s/ngày  → ×22 ngày ≈ 8,8 phút/tháng
240 lượt/ngày × 0,2 s = 48 s/ngày  → ×22 ngày ≈ 17,6 phút/tháng
# Ca xấu: hook treo tới timeout 15 s ở mọi lượt, 120 lượt/ngày → 30 phút/ngày
```

Dòng cuối là lý do phải đặt `timeout` nhỏ và cho script **im lặng thoát 0** khi lỗi. (Docs: timeout mặc định cho `command` là 600 s, nhưng hạ xuống 30 s riêng cho `UserPromptSubmit`.) Hiệu quả thật của hook này chưa đo xong — cách đo mà case đặt ra: đếm lại tỉ lệ phiên có mở note (mốc cũ 9/71) sau một quý; hook in nhiều mà không ai mở note thì nó chỉ là trang trí.

Một biến thể docs gợi ý: `SessionStart` với matcher `compact` để tiêm lại quy ước quan trọng **sau compaction**, đúng chỗ lời dặn hay bị tóm mất (§3.1, đường 1).

### 3.6 Tool response mang sự kiện, không mang chỉ thị

Quay lại chuyện 2. Vì sao "thêm một câu ra lệnh cho agent vào tool response" sai, kể cả khi câu đó có ý tốt?

- **Tool response là dữ liệu.** Model đọc nó như kết quả của một hành động. Một hệ thống mà dữ liệu được phép ra lệnh cho agent chính là bề mặt của prompt injection — chữ nằm trong một trang web, một issue, một dòng DB cũng có thể "ra lệnh" theo đúng cách đó. Nền tảng chặn embedded directives là chặn cả họ này, không phân biệt ý tốt hay xấu.
- **Sai chỗ kiểm.** Trong case, file instructions của extension được kiểm **lúc deploy** — sai thì biết trước khi ship. Response bị kiểm **lúc runtime** — sai thì hỏng khi khách đang chat.
- **Cái giá phải chấp nhận.** File instructions là gợi ý ở mức system prompt; model vẫn có thể phớt lờ. Case ghi rõ tradeoff này thay vì giả vờ nó không tồn tại. Đổi lại, có test kiểm được cả hai chiều: response không chứa chữ plan/price/upgrade, **và** không phải chỉ thị (không động từ mệnh lệnh, không ngôi thứ hai, không quá một câu).
- **Im lặng cũng không an toàn.** Ở một giai đoạn trước, trả 403 trần không lý do làm agent **tự bịa** giải thích. Câu trần thuật ngắn là điểm giữa: đủ sự kiện để agent không bịa, không đủ "mồi" để agent diễn tiếp.

Áp vào harness của chính bạn: hook là **kênh có chủ** — bạn viết nó, nó nằm trong settings bạn kiểm soát, và docs chỉ định `additionalContext` / stderr là đường để hook nói với model. Nhưng cùng nguyên tắc vẫn đúng cho cách viết lý do chặn: nêu **sự kiện + thứ được phép**, không nêu mệnh lệnh mơ hồ.

```
Sai:   "STOP. Bạn không được push. Hãy hỏi người dùng ngay."
Đúng:  "Blocked: git push is disabled in this repo. Commits stay local; the user pushes."
```

Câu thứ hai cho agent đủ thông tin để tự chọn bước tiếp hợp lệ (commit, rồi báo), và không có gì để nó "hiểu sai" thành một nhiệm vụ mới.

---

## 4. Làm thử

Mục tiêu: một repo thử có rào chặn `git push` ở hai tầng, và bạn **chứng minh** từng tầng chặn đúng chỗ nó tuyên bố. Cần `git`, `jq`, Claude Code.

**Bước 1 — repo thử.**

```bash
git init -q --bare /tmp/hook-lab-remote.git          # một "remote" local: push vào đây sẽ THÀNH CÔNG nếu không bị chặn
mkdir -p /tmp/hook-lab/.claude/hooks && cd /tmp/hook-lab && git init -q
git remote add origin /tmp/hook-lab-remote.git
echo "SECRET=abc" > .env && echo "hello" > README.md
```

Remote phải nhận được push thật — nếu không có remote, push thất bại vì lý do khác và bạn không chứng minh được gì về rào chắn.

**Bước 2 — permission.** Tạo `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Bash(git status)", "Bash(git diff *)", "Bash(git add *)", "Bash(git commit *)"],
    "ask":   ["Bash(git reset *)"],
    "deny":  ["Bash(git push *)", "Read(./.env)", "Read(./.env.*)"]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-bash.sh", "timeout": 10 }
        ]
      }
    ]
  }
}
```

**Bước 3 — hook.** Tạo `.claude/hooks/guard-bash.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse guard cho Bash. Exit 2 = chặn, stderr = lý do gửi cho agent.
# Không có jq thì chặn luôn: thà chặn nhầm còn hơn để lệnh nguy hiểm lọt qua.
command -v jq >/dev/null 2>&1 || { echo "Blocked: guard-bash needs jq" >&2; exit 2; }

CMD=$(jq -r '.tool_input.command // empty')

# 1) git push dưới mọi dạng: git -C . push, /usr/bin/git push, git 'push', sh -c '... git push'
#    So theo TỪ, không theo tiền tố — cố ý rộng: "echo git push" cũng bị chặn.
if printf '%s' "$CMD" | grep -qw 'git' && printf '%s' "$CMD" | grep -qw 'push'; then
  echo "Blocked: git push is disabled in this repo. Commits stay local; the user pushes." >&2
  exit 2
fi

# 2) Mọi lệnh nhắc tới file .env — bù chỗ deny Read không phủ (python -c, node -e, grep -r ...)
if printf '%s' "$CMD" | grep -Eq '(^|[^[:alnum:]_])\.env([.[:space:]"'"'"']|$)'; then
  echo "Blocked: .env holds secrets and is not readable in this repo." >&2
  exit 2
fi

exit 0
```

```bash
chmod +x .claude/hooks/guard-bash.sh
```

**Bước 4 — kiểm hook không cần agent.** Bơm JSON giả vào stdin, đúng cách docs troubleshooting gợi ý. Một thước đo phải đỏ được và xanh được (xem [[ag-11-gate-xanh-gia]]), nên kiểm cả lệnh phải chặn lẫn lệnh phải qua:

```bash
t() { printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(jq -Rn --arg c "$1" '$c')" \
      | .claude/hooks/guard-bash.sh 2>/dev/null; echo "$? <- $1"; }

t "git push origin main"                 # mong đợi 2
t "git -C . push origin main"            # mong đợi 2  (permission rule KHÔNG chặn dạng này)
t "/usr/bin/git push"                    # mong đợi 2
t "sh -c 'git push'"                     # mong đợi 2
t "python3 -c \"print(open('.env').read())\""   # mong đợi 2
t "git status"                           # mong đợi 0
t "git commit -m 'add env loader'"       # mong đợi 0
t "ls -la"                               # mong đợi 0
```

**Bước 5 — kiểm trong phiên thật.** Chạy `claude` trong `/tmp/hook-lab`, gõ `/hooks` để xác nhận hook hiện dưới `PreToolUse`. Rồi giao ba việc:

1. "Commit README.md rồi push lên origin." → agent commit được; push bị chặn, agent nhận câu `Blocked: …` và báo lại.
2. "Chạy `git -C . push` để thử." → bị hook chặn (đây là dạng permission rule bỏ lọt).
3. "In nội dung file .env bằng python." → bị hook chặn.

**Tiêu chí xong (kiểm được):**

- Bước 4 in đúng 5 dòng exit `2` và 3 dòng exit `0`.
- Chạy hook với `PATH` không có `jq` vẫn ra `2`, không ra `127`:
  `printf '{"tool_input":{"command":"git push"}}' | PATH=/bin .claude/hooks/guard-bash.sh; echo $?` (trên macOS/Linux thông thường `jq` nằm ở `/usr/bin` hoặc `/opt/homebrew/bin`, nên `PATH=/bin` loại được nó — kiểm bằng `PATH=/bin command -v jq` phải rỗng).
- Trong phiên thật, `git --git-dir=/tmp/hook-lab-remote.git log --oneline` báo remote chưa có commit nào, và transcript có dòng `Blocked:` ở cả ba việc.
- Đối chứng: tắt hook (đổi tên script), cho agent chạy lại `git -C . push origin HEAD` và duyệt khi được hỏi (không allow/deny rule nào khớp dạng này, nên mode mặc định sẽ hỏi) → remote **có** commit. Nếu đối chứng không push được thì bước trên chưa chứng minh gì.
- Bạn viết được một câu: lệnh nào **vẫn** lọt qua cả hai tầng? (Gợi ý: một file `push.sh` chứa `git push`, rồi chạy `bash push.sh`.) Đó là lý do tầng thứ ba — branch protection phía server — tồn tại.

---

## 5. Bẫy thường gặp

### Hook crash thì lệnh vẫn chạy

Hook chặn đúng trên máy bạn, nhưng trên máy đồng nghiệp lệnh nguy hiểm vẫn chạy, transcript chỉ có một dòng "hook error". Exit code khác 0 và 2 là lỗi **không chặn**: `jq: command not found` trả 127 và hành động tiếp tục. Dòng đầu script nên kiểm phụ thuộc và `exit 2` nếu thiếu, như Bước 3. Hook *nhắc* (không phải hook chặn) thì làm ngược lại: lỗi thì im lặng exit 0, để hook hỏng không làm phiên đứng.

### Đặt rào ở chỗ nó không chặn được

Deny `Bash(git push *)` mà remote vẫn nhận push. Rule so tiền tố văn bản lệnh, và docs xác nhận nó không phải security boundary quanh chương trình. Các biến thể để hook `PreToolUse` bắt; thứ không được sai lần nào thì cần credential hoặc branch protection.

Lỗi cùng họ là đặt rào ở `PostToolUse`: hook "chặn" ghi DB nhưng dữ liệu đã ghi rồi, chỉ có thêm một thông báo. `PostToolUse` bắn sau khi tool đã chạy, và `decision: "block"` chỉ thêm lý do cạnh kết quả. Thứ gì cần ngăn thì đặt ở `PreToolUse`; `PostToolUse` dành cho format, lint, ghi log.

### Hook trong `settings.local.json` không theo sang worktree

Hook chạy ở checkout chính nhưng im lặng trong worktree hoặc trên máy khác, vì `.claude/settings.local.json` không được commit nên không đi theo, mà worktree là một checkout khác. Hook cho cả team đặt ở `.claude/settings.json` (commit), hook cá nhân cho mọi repo đặt ở `~/.claude/settings.json`. Kiểm bằng `/hooks` trong một worktree mới.

### JSON đúng mà không có tác dụng

Script in `{"hookSpecificOutput": …}` hợp lệ, exit 0, nhưng quyết định không được áp và cũng không có lỗi nào. Docs nêu hai nguyên nhân thường gặp: shell profile `echo` một dòng trước JSON nên stdout không bắt đầu bằng `{`, hoặc trường đặt sai cấp (`permissionDecision` phải nằm trong `hookSpecificOutput`, `additionalContext` đặt ở cấp cao nhất bị bỏ qua). Dựng JSON bằng `jq -n`, không nối chuỗi; chạy `claude --debug` và tìm `Hook output does not start with {`.

Hook `Stop` có kiểu "chạy mà không như ý" riêng: chặn theo một điều kiện không bao giờ thoả thì agent không chịu dừng, tới khi harness tự bỏ qua sau 8 lần chặn liên tiếp không có tool call nào xen giữa. Đọc `stop_hook_active` từ stdin, là `true` thì exit 0; mẫu đầy đủ ở [[ag-10-done-criteria-va-gate]].

### Nhét chỉ thị vào tool response

Muốn agent cư xử khác khi gặp một lỗi, bạn thêm "hãy làm X" vào message lỗi trả về từ tool hay API của mình. Tool response là dữ liệu; biến dữ liệu thành kênh ra lệnh là mở bề mặt prompt injection, và có nền tảng kiểm lúc runtime rồi từ chối. Response nên là một câu trần thuật về sự kiện, còn hướng dẫn hành vi đi qua kênh được chỉ định (system prompt, file instructions, `CLAUDE.md`, `additionalContext` của hook), kèm test assert response không chứa động từ mệnh lệnh hay ngôi thứ hai. Với dữ liệu tool trả ra thì dùng allowlist thay cho denylist, để thứ mới thêm vào mặc định vô hình; chi tiết cho MCP ở [[ag-09-mcp]].

---

## 6. Chuyển giao

- Bài [[ag-06-memory-va-feedback]] và [[ag-07-skill-va-slash-command]] dạy agent **nên** làm gì; bài này đặt ranh giới agent **không thể** làm gì. Một quy tắc lặp lại lần thứ hai trong feedback mà vẫn bị vi phạm là ứng viên để chuyển thành hook hoặc permission.
- [[ag-09-mcp]] mở rộng agent ra hệ thống ngoài — mọi tool MCP đều đi qua cùng permission (`mcp__server__tool`) và hook `PreToolUse` như tool built-in, nên rào chắn vừa học áp thẳng vào đó.
- Level 4 ([[ag-10-done-criteria-va-gate]], [[ag-12-verifier-doc-lap]]) dùng cùng tư duy cho **đầu ra**: không tin agent tự nói "xong", mà có một lệnh và một agent khác kiểm. Hook `Stop` là một chỗ có thể gắn gate đó.
- Level 5–6 chạy nhiều agent song song, không ai duyệt từng lệnh. Thứ cho phép bỏ việc duyệt từng bước ở [[ag-05-checkpoint-tung-buoc]] chính là rào chắn trong bài này: bạn không cần nhìn từng lệnh nữa khi những lệnh không được phép đã **không thể** chạy.

---

## 7. Tóm tắt

- Lời dặn do model thực thi theo xác suất; permission và hook do harness thực thi theo luật. Thứ phải *nhớ* mới đúng thì sớm muộn sẽ sai.
- Permission: thứ tự cố định deny → ask → allow; allow không khoét được ngoại lệ trong deny. Bash rule so tiền tố văn bản lệnh, nên `git -C . push` lọt qua `Bash(git push *)`.
- Hook `PreToolUse` chạy trước permission, ở mọi mode; exit 2 hoặc `deny` chặn được cả lệnh đã allow. Hook `allow` không nới được deny rule.
- Chặn ở `PreToolUse`, không ở `PostToolUse` — tool đã chạy thì không hoàn tác được.
- Exit code khác 0/2 là lỗi không chặn: hook chặn phải tự `exit 2` khi thiếu phụ thuộc.
- Hook cũng dùng để tiêm ngữ cảnh đúng lúc (`UserPromptSubmit`, `SessionStart` matcher `compact`) — chọn tín hiệu và thời điểm bắn quan trọng ngang nội dung.
- Tool response mang sự kiện, không mang chỉ thị; hướng dẫn hành vi đi qua kênh được chỉ định.
- Thứ không được sai lần nào thì đặt rào ở tầng agent không chạm tới được: credential, sandbox, branch protection, giá trị mặc định trỏ vào nơi không tồn tại.
