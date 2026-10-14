# Bài 4 — Context là tài nguyên: CLAUDE.md, AGENTS.md

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê được những gì **đã nằm trong context window** trước khi bạn gõ prompt đầu tiên, và mở `/context` để đọc con số thật của máy mình.
- Đặt một chỉ dẫn vào **đúng tầng** (managed / user / project / local / thư mục con / rule theo đường dẫn) của Claude Code, và vào đúng file `AGENTS.md` của Codex, rồi chứng minh bằng lệnh là nó đã được nạp.
- Viết một `CLAUDE.md` / `AGENTS.md` dưới 60 dòng chỉ chứa thứ **đúng ở mọi lượt, không suy ra được từ code, và kiểm được**, và chỉ ra ba thứ phải dời sang chỗ khác (skill, hook, file state).
- Nói được thứ gì **sống sót qua compaction** và thứ gì không, rồi suy ra vì sao một ràng buộc chỉ nói trong chat sẽ biến mất giữa phiên.
- Dùng **plan mode** và một bước "research trước khi code" có tiêu chí kiểm được (đúng nhánh, đúng bề mặt) trước khi cho agent sửa file.

---

## 2. Tình huống

Một dev trong team nhờ coding agent audit một bug trên **một app SaaS thương mại điện tử**: "cái lỗi lệch chỉ số khi cập nhật danh sách sản phẩm — prod còn dính không?". Agent làm đúng những gì nó được dạy: grep, đọc file, trích dẫn số dòng, viết một bảng gồm 14 file với kết luận "lỗi còn nguyên ở 3 chỗ".

Bản audit trông chắc chắn. Nó có đường dẫn, có số dòng, có đoạn code trích nguyên văn.

Giữa chừng, người giao việc hỏi lại một câu: *"nãy giờ bạn check là check data thật hay check code? Code thì tôi đang ở nhánh feature, nhánh này lệch master đấy."*

Đo lại:

```
# Case thực tế, một lần chạy — không phải benchmark
$ git rev-list --left-right --count origin/master...HEAD
198	...
```

Nhánh đang mở **chậm 198 commit** so với `origin/master` — nhánh đang chạy prod. Trong 14 file được trích dẫn, 11 file trùng khớp giữa hai nhánh. **3 file lệch, và đó đúng là 3 file mang kết luận**: bản fix lỗi lệch chỉ số đã nằm trên master từ trước, chỉ là không có trên nhánh agent đang đọc. Nếu không ai hỏi câu đó, báo cáo gửi đi sẽ nói rằng một lỗi đã sửa vẫn còn.

Agent không đọc sai file. Nó đọc **đúng file, sai phiên bản**. Và không có gì trong context của nó nói rằng "ở repo này, audit thì đọc từ `origin/master`". Đó là một sự thật về **cách team làm việc**, không nằm trong code.

Một tuần sau, cùng repo, một case khác cùng họ: task ghi *"check CLS giúp tôi, gần đây cao hơn mức nền tảng chấp nhận"*. CLS (Cumulative Layout Shift — chỉ số đo trang bị "giật" bao nhiêu khi tải) có **hai bề mặt** trong app này: widget hiển thị trên storefront của cửa hàng, và app quản trị nhúng trong trang admin. Hai bề mặt không chung một dòng code, một chỉ số hay một công cụ đo. Agent tự chọn storefront và chạy trọn một vòng: audit → verifier FAIL → sửa → verifier FAIL → báo blocker. Lúc đó mới biết đề là app admin (case thực tế, một lần chạy). Mọi vòng verify chỉ xác nhận rằng **cái sai đề được làm chính xác**.

Hai case có chung một gốc: thứ agent cần biết **không có trong context**, và không có cơ chế nào đưa nó vào. Bài này là về cơ chế đó.

---

## ⏸ Dừng lại — đoán trước

Bạn rút kinh nghiệm, mở `CLAUDE.md` của repo và thêm mọi bài học vào: luật audit, luật hỏi bề mặt, cấu trúc thư mục, 40 convention, 12 quy trình deploy. File thành 400 dòng. Phiên sau, agent **vẫn** đọc nhầm nhánh.

Nguyên nhân nào có khả năng nhất?

```
(a) File chưa được nạp — phải gõ /memory mỗi phiên để nạp
(b) File dài làm giảm mức tuân thủ; luật bị pha loãng giữa 400 dòng và có thể mâu thuẫn với dòng khác
(c) CLAUDE.md chỉ được đọc khi agent gặp lỗi
(d) Agent luôn bỏ qua CLAUDE.md sau 200 dòng đầu
```

Đáp án ở §3.5.

---

## 3. Cơ chế

### 3.1 Context window đã có gì trước câu đầu tiên của bạn

**Context window** là toàn bộ văn bản model nhìn thấy trong một lần trả lời: system prompt, file hướng dẫn, lịch sử hội thoại, nội dung mọi file đã đọc, output mọi lệnh đã chạy. Model không có trí nhớ nào khác giữa các phiên — docs Claude Code viết thẳng: *"Each Claude Code session begins with a fresh context window"* ([memory](https://code.claude.com/docs/en/memory)).

Trang [context-window](https://code.claude.com/docs/en/context-window) của Claude Code có một mô phỏng phiên làm việc, gắn số token cho từng thứ nạp lúc khởi động. Đó là **số minh hoạ trong docs, không phải số đo trên máy bạn**, nhưng đủ để thấy thứ tự lớn nhỏ:

```python
# Số minh hoạ lấy từ mô phỏng trong docs context-window (cửa sổ 200k)
startup = {
    "System prompt": 4200, "Auto memory (MEMORY.md)": 680, "Environment info": 280,
    "MCP tools (deferred)": 120, "Skill descriptions": 450,
    "~/.claude/CLAUDE.md": 320, "Project CLAUDE.md": 1800,
}
total = sum(startup.values())          # 7850 token
print(total, total / 200_000 * 100)    # 7850  -> 3.92 % cửa sổ 200k
print(1800 * 50)                       # 90000 token: CLAUDE.md 1800 token đi kèm 50 request
```

Hai điều rút ra:

1. Phần nạp sẵn là nhỏ so với cửa sổ. Thứ làm đầy context thật sự là **file đọc và output lệnh** — mô phỏng trong docs ghi một lần đọc `src/api/auth.ts` tốn 2.400 token, hơn cả `CLAUDE.md` của project.
2. Nhưng `CLAUDE.md` có mặt trong **mọi request** của phiên. Mỗi lượt agent gọi tool là một request mới mang theo cả context. File 1.800 token × 50 request = 90.000 token đi qua model. Prompt caching làm phần lặp này rẻ hơn về tiền, nhưng không làm nó chiếm ít chỗ hơn trong cửa sổ hay ít "cạnh tranh sự chú ý" hơn.

📏 **Đo trên máy bạn:** gõ `/context` trong Claude Code. Docs: *"To confirm the file loaded, run `/context` in a session and check the list under **Memory files**"* ([memory](https://code.claude.com/docs/en/memory)). Ghi lại số token của từng memory file — đó là con số thật, thay cho mọi ước lượng "một dòng bao nhiêu token".

### 3.2 Claude Code: bốn tầng, nối chứ không đè

**File hướng dẫn** (instruction file) là file markdown agent tự đọc lúc mở phiên, để bạn khỏi dặn lại. Trong Claude Code có bốn vị trí, docs liệt kê theo thứ tự nạp từ rộng tới hẹp ([memory](https://code.claude.com/docs/en/memory)):

| Tầng | Vị trí | Ai thấy |
|---|---|---|
| Managed policy | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux/WSL `/etc/claude-code/CLAUDE.md` | mọi user trên máy, không loại trừ được |
| User | `~/.claude/CLAUDE.md` | chỉ bạn, mọi project |
| Project | `./CLAUDE.md` hoặc `./.claude/CLAUDE.md` | cả team qua git |
| Local | `./CLAUDE.local.md` (tự thêm vào `.gitignore`) | chỉ bạn, project này |

Cơ chế nạp — đây là chỗ hay hiểu nhầm nhất:

- **Nối, không đè.** Docs: *"All discovered files are concatenated into context rather than overriding each other."* File gần thư mục làm việc được đọc **sau cùng**. Trong mỗi thư mục, `CLAUDE.local.md` nối sau `CLAUDE.md`. Hệ quả: nếu tầng user nói "commit thẳng main" và tầng project nói "không bao giờ commit main", không có cơ chế ưu tiên nào chọn hộ bạn. Docs nói rõ ở phần rule: *"if a user rule and a project rule conflict, Claude may follow either one"*.
- **Thư mục cha nạp lúc mở, thư mục con nạp khi chạm.** `CLAUDE.md` ở thư mục làm việc và mọi thư mục phía trên nạp lúc khởi động. `CLAUDE.md` trong thư mục con chỉ nạp khi agent đọc/ghi/sửa một file trong thư mục con đó.
- **Import.** Dòng `@path/to/file` kéo file khác vào. Đường dẫn tương đối tính từ file chứa import, tối đa bốn tầng import lồng nhau. Docs nhấn mạnh: import giúp sắp xếp **nhưng không giảm chi phí context**, vì file được import cũng nạp lúc khởi động. Viết `` `@README` `` trong backtick thì không import.
- **Import ra ngoài repo phải duyệt.** Import trỏ ra ngoài thư mục làm việc (ví dụ `@~/.claude/x.md`) từ file cấp project sẽ hiện hộp thoại duyệt lần đầu; từ chối thì import đó tắt luôn và hộp thoại không hiện lại.
- **Comment HTML bị bỏ.** `<!-- ghi chú cho người bảo trì -->` cấp khối bị lược trước khi đưa vào context — chỗ để ghi chú cho người mà không tốn token.

Thêm một tầng mịn hơn: **`.claude/rules/`**. Mỗi file `.md` trong đó là một rule; rule có frontmatter `paths` chỉ nạp khi agent đụng file khớp glob:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# Quy ước API
- Mọi handler validate input bằng schema trong `src/api/schemas/`
- Lỗi trả về dạng `{ error: { code, message } }`
```

Rule không có `paths` nạp vô điều kiện như `.claude/CLAUDE.md`. Đây là chỗ đặt luật "chỉ đúng cho một phần codebase" mà không bắt mọi lượt phải trả giá cho nó.

### 3.3 Codex: `AGENTS.md`, mỗi thư mục tối đa một file

Codex CLI dùng `AGENTS.md`. Theo [docs AGENTS.md của Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (URL cũ `developers.openai.com/codex/guides/agents-md` chuyển hướng về đây):

- **Tầng global:** thư mục home của Codex, mặc định `~/.codex` hoặc nơi `CODEX_HOME` trỏ tới. Có `AGENTS.override.md` thì dùng nó, không thì `AGENTS.md` — chỉ file không rỗng đầu tiên.
- **Tầng project:** đi từ gốc project (thường là gốc git) **xuống** thư mục hiện tại. Ở mỗi thư mục, kiểm `AGENTS.override.md`, rồi `AGENTS.md`, rồi các tên trong `project_doc_fallback_filenames`; lấy **tối đa một file mỗi thư mục**.
- **Nối từ gốc xuống**, cách nhau bằng dòng trống; file gần thư mục hiện tại đứng sau nên "ghi đè" hướng dẫn trước đó (về mặt thứ tự đọc, giống Claude Code).
- **Giới hạn dung lượng:** `project_doc_max_bytes`, mặc định **32 KiB** cho tổng các file. Chạm trần thì các file sau **không được thêm vào** — im lặng.
- **Tên dự phòng:** đặt `project_doc_fallback_filenames` trong `~/.codex/config.toml`, ví dụ `["TEAM_GUIDE.md", ".agents.md"]`.
- **Discovery chạy một lần mỗi lần khởi động.** Sửa `AGENTS.md` giữa phiên thì phải khởi động lại Codex mới ăn.
- **Kiểm đã nạp gì:** docs gợi ý `codex --ask-for-approval never "Summarize the current instructions."` rồi xem nó có trích đúng các file theo thứ tự không; `codex --cd subdir` để kiểm file lồng nhau.

Lệnh `/init` của Codex sinh khung `AGENTS.md` ở thư mục hiện tại ([slash commands](https://developers.openai.com/codex/cli/slash-commands)). Claude Code cũng có `/init` sinh khung `CLAUDE.md`; nếu file đã có, nó đề xuất cải tiến thay vì ghi đè ([memory](https://code.claude.com/docs/en/memory)).

### 3.4 Một repo, hai công cụ: đừng giữ hai bản

Team dùng cả Claude Code và Codex mà giữ `CLAUDE.md` và `AGENTS.md` riêng thì sau vài tuần hai file lệch nhau — người sửa một bên quên bên kia. Docs Claude Code đưa ba cách dùng chung ([memory](https://code.claude.com/docs/en/memory)):

1. **Chỉ có `AGENTS.md`.** Claude Code (từ v2.1.277) đọc `AGENTS.md` khi **không có** `CLAUDE.md`, `.claude/CLAUDE.md` hay `CLAUDE.local.md` ở thư mục làm việc hoặc phía trên.
2. **`CLAUDE.md` import `AGENTS.md`:** một dòng `@AGENTS.md`, rồi thêm phần riêng của Claude Code phía dưới.
3. **Symlink:** `ln -s AGENTS.md CLAUDE.md`. Claude đọc qua link; tool Edit/Write từ chối ghi xuyên symlink và chỉ agent sang sửa `AGENTS.md`.

Chiều ngược lại: Codex không đọc `CLAUDE.md` mặc định. Theo cơ chế tên dự phòng ở §3.3, bạn có thể thêm `"CLAUDE.md"` vào `project_doc_fallback_filenames` — đây là suy luận từ docs (cấu hình nhận tên bất kỳ), chưa thấy docs Codex nêu ví dụ này.

Một chỗ dễ vấp, docs Claude Code ghi riêng thành note: vì `CLAUDE.local.md` **được tính**, thêm một file local để ghi chú cá nhân vào repo dùng `AGENTS.md` sẽ làm Claude **thôi đọc** `AGENTS.md` của team. Muốn giữ cả hai thì đặt **Project instructions** trong `/config` thành `claude-md-and-agents-md`.

So hai công cụ, sau khi đã hiểu từng bên:

| | Claude Code | Codex CLI |
|---|---|---|
| Tên file | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md` | `AGENTS.md`, `AGENTS.override.md`, tên dự phòng |
| Nhiều file một thư mục | nạp hết (CLAUDE.md rồi local) | tối đa một |
| Thư mục con | nạp khi agent chạm file trong đó | nạp từ gốc xuống thư mục hiện tại lúc khởi động |
| Giới hạn | khuyến nghị dưới 200 dòng/file; bỏ qua file trên 4 MiB | cứng 32 KiB tổng (`project_doc_max_bytes`) |
| Luật theo glob | có (`paths` frontmatter) | không thấy trong docs AGENTS.md |
| Kiểm đã nạp | `/context`, `/memory` | hỏi agent tóm tắt hướng dẫn; log phiên |

Nguyên nhân gốc của mọi khác biệt trong bảng: Claude Code coi hướng dẫn là **context nạp dần theo việc**, Codex coi nó là **một khối ghép một lần lúc khởi động có trần cứng**. Hệ quả thực tế: ở Codex, file vượt trần bị cắt im lặng; ở Claude Code, file dài vẫn nạp đủ nhưng bị tuân thủ kém.

### 3.5 Viết gì vào — và vì sao file dài làm hỏng chính nó

Đáp án ⏸ là **(b)**. Docs Claude Code: *"target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."* Và: *"if two instructions contradict each other, Claude may pick one arbitrarily."* (a) sai vì file nạp tự động; (c) sai; (d) nhầm với giới hạn 200 dòng của **auto memory** (`MEMORY.md` chỉ nạp 200 dòng hoặc 25KB đầu) — `CLAUDE.md` thì nạp đủ.

Cơ chế đằng sau: docs nói Claude coi `CLAUDE.md` là *"context, not enforced configuration"*. Nó là văn bản cạnh tranh sự chú ý với mọi thứ khác trong cửa sổ. Một luật quan trọng nằm giữa 400 dòng mô tả cấu trúc thư mục có cùng "trọng lượng văn bản" với dòng mô tả thư mục `utils/`.

Ba tiêu chí lọc — một dòng chỉ được vào file khi qua **cả ba**:

1. **Đúng ở mọi lượt.** Lệnh build/test, convention commit, "không bao giờ X". Quy trình deploy 12 bước chỉ đúng khi deploy → dời sang skill ([[ag-07-skill-va-slash-command]]); docs cũng nói thế: *"If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule"*.
2. **Không suy ra được từ code.** Cấu trúc thư mục thì `ls` ra. "Audit đọc từ `origin/master`" thì không có cách nào suy ra — đây đúng là loại dòng §2 thiếu.
3. **Kiểm được.** Docs đưa ví dụ: *"Run `npm test` before committing" instead of "Test your changes"*. Một luật kiểm được thì vừa dễ tuân thủ vừa đo được là có được tuân thủ không.

Docs cũng cho tín hiệu **khi nào** thêm một dòng: agent mắc cùng một lỗi lần thứ hai; review bắt được thứ agent lẽ ra phải biết; bạn gõ lại cùng một lời nhắc đã gõ phiên trước.

Và ba thứ **không** viết vào, kèm chỗ đúng của chúng:

| Thứ | Vì sao không | Đặt ở đâu |
|---|---|---|
| Lệnh cấm phải tuyệt đối (xoá prod, push main) | file là context, agent có thể vượt | permission `deny` / hook PreToolUse — [[ag-08-hook-va-chan-bang-cau-hinh]] |
| Quy trình nhiều bước, dùng thỉnh thoảng | tốn chỗ mọi lượt | skill — [[ag-07-skill-va-slash-command]] |
| Trạng thái việc đang làm ("đang sửa tới bước 3") | đổi liên tục, thối nhanh | file state như `BRIEF.md` — [[ag-18-brief-la-shared-state]] |

💡 **Kinh nghiệm thực tế — file tầng user mỏng.** Tác giả giữ file hướng dẫn tầng user ở 48 dòng (~3,2 KB), được import vào **mọi repo** trên máy. Dòng đầu file tự ghi lý do: vì nó vào context ở mọi repo, *"giữ mỏng. Chỉ thứ đúng bất kể đang ở repo nào"*. Nội dung chỉ có năm loại: ngôn ngữ giao tiếp, cách làm việc lặp lại nhiều lần (research trước khi code, sửa lỗi thì quét hết chỗ tương tự, verify trước khi nói xong), quy tắc git theo loại repo, và chỗ tra kiến thức sâu hơn. Mọi chi tiết theo từng app sống ở kho ghi chú riêng, tra khi cần.

💡 **Kinh nghiệm thực tế — luật có đầu ra quan sát được.** Một lần vá harness, tác giả thêm vào file tầng user luật: "khi điều tra, tự tra kho ghi chú trước khi hỏi lại người dùng; kết luận phải có một dòng `Brain:` nêu note đã áp dụng". Chạy A/B cùng một bộ ticket (14 case × 2 lượt, bản sao một repo backend): dòng `Brain:` xuất hiện **0/28** lượt ở bản cũ và **27/28** ở bản mới. Đây là case thực tế, một lần chạy, không phải benchmark — và bản vá đó sửa cùng lúc cả hook lẫn skill, nên con số không tách được phần công của riêng file hướng dẫn. Điều đáng học là **dạng** của luật: nó đòi một dòng chữ cụ thể trong output, nên kiểm được bằng `grep`. "Hãy tra kỹ trước khi làm" thì không đo được.

### 3.6 Khi context đầy: compaction và cái gì sống sót

**Compaction** là việc tóm tắt lịch sử hội thoại thành một bản ngắn để giải phóng chỗ trong cửa sổ. Claude Code tự compact khi gần chạm giới hạn; bạn cũng có thể gõ `/compact`. Codex có `/compact` với mô tả *"Summarize the visible chat to free tokens"* ([slash commands](https://developers.openai.com/codex/cli/slash-commands)).

Tóm tắt nghĩa là **mất chi tiết**. Câu hỏi thực dụng là: mất cái gì? Docs Claude Code có bảng "What survives compaction" ([context-window](https://code.claude.com/docs/en/context-window)), trích các dòng liên quan bài này:

| Thứ | Sau compaction |
|---|---|
| `CLAUDE.md` gốc project và rule không có `paths` | nạp lại từ đĩa |
| Auto memory | nạp lại từ đĩa |
| Plan viết trong plan mode | nạp lại từ đĩa |
| Rule có `paths:` | nạp lại khi chạm file khớp |
| `CLAUDE.md` thư mục con | nạp lại khi chạm file trong đó |
| File đã đọc/sửa | đọc lại tối đa 5 file, mới sửa nhất trước |
| Mọi thứ khác trong hội thoại | chỉ còn trong bản tóm tắt |

Quy luật rút ra một câu: **thứ gì nằm trên đĩa thì sống, thứ gì chỉ nằm trong chat thì thành tóm tắt.** Docs nói thẳng: nếu một chỉ dẫn biến mất sau compaction, nó *"was given only in conversation"*, và cách chữa là đưa nó vào `CLAUDE.md`.

Hệ quả cho cách làm việc:

- Ràng buộc bạn nói ở lượt 3 ("đừng đụng thư mục `legacy/`") có thể không còn nguyên văn ở lượt 80. Nếu nó là ràng buộc lâu dài, nó thuộc về file hướng dẫn.
- Rule theo `paths` và `CLAUDE.md` thư mục con bị tóm tắt cùng hội thoại, chỉ quay lại khi agent chạm lại file khớp. Docs khuyên: luật phải sống qua compaction thì bỏ `paths:` hoặc dời lên `CLAUDE.md` gốc.
- Compact có định hướng: `/compact focus on the auth bug fix` — bản tóm tắt giữ thứ bạn chọn thay vì thứ tự động đoán.
- Đổi sang việc không liên quan thì `/clear`, không phải compact. Docs: *"Old conversation crowds out the files you need next and costs tokens on every message."*

💡 **Kinh nghiệm thực tế:** cần `/compact` giữa một việc nghĩa là state lẽ ra phải ở trên đĩa từ đầu. Trước khi `/clear`, dặn agent một câu: *"Ghi vào `NOTES.md`: đang làm tới đâu, đã thử gì không được (kèm lý do), file nào đã đụng, bước tiếp theo."* Phiên sau đọc file đó là chạy tiếp. Đây là mầm của `BRIEF.md` ở Level 6.

### 3.7 Plan mode và "research trước khi code"

**Plan mode** là chế độ agent chỉ đọc và đề xuất kế hoạch, không sửa file cho tới khi bạn duyệt. Claude Code: `claude --permission-mode plan`, hoặc `Shift+Tab` giữa phiên tới khi thanh trạng thái hiện `⏸ plan mode on` ([common-workflows](https://code.claude.com/docs/en/common-workflows)). Codex: `/plan`, có thể kèm prompt ngay sau ([slash commands](https://developers.openai.com/codex/cli/slash-commands)). Ở Claude Code, plan đã viết còn được nạp lại sau compaction (bảng §3.6).

Plan mode chặn **ghi**, không chặn **đọc sai**. Case §2 sẽ ra cùng kết quả trong plan mode: agent vẫn đọc nhánh feature và lập kế hoạch sửa một lỗi đã được sửa. Vì vậy "research trước khi code" phải có **tiêu chí kiểm được**, không chỉ là "đọc code trước":

1. **Đúng phiên bản.** Trước khi kết luận về code đang chạy prod: `git fetch && git rev-list --left-right --count origin/master...HEAD`, ghi con số vào báo cáo. Khác 0 thì đọc bằng `git show origin/master:<path>`, hoặc mở worktree riêng từ `origin/master`.
2. **Đúng bề mặt.** Nếu danh từ trong task có hơn một hiện thân trong hệ thống ("CLS", "widget", "portal", "giá"), hỏi **một câu, một lượt** trước khi chạy. Buộc phải đoán thì ghi giả định ở **dòng đầu** báo cáo để bị bác sớm.
3. **Đúng convention.** Tìm code tương tự đã có (`rg -n "<tên hàm/pattern>"`) trước khi viết mới, để không tạo helper trùng.
4. **Tách kết luận theo nguồn.** "Từ dữ liệu prod" (không phụ thuộc nhánh) và "từ code" (phụ thuộc nhánh) là hai bảng riêng.

Cả bốn đều là loại dòng qua được ba tiêu chí ở §3.5 — đúng mọi lượt điều tra, không suy ra được từ code, kiểm được bằng lệnh. Chúng thuộc về file hướng dẫn. Đọc nhiều mà chỉ cần ít kết luận thì giao subagent đọc trong context riêng của nó ([[ag-14-subagent-va-brief]]).

---

## 4. Làm thử

Mục tiêu: dựng một repo nhỏ, viết file hướng dẫn chuẩn cho cả hai công cụ, rồi **chứng minh** bằng quan sát rằng nó được nạp, được tuân thủ, và sống qua compaction.

### 4.1 Dựng repo

```bash
mkdir ctx-lab && cd ctx-lab && git init -q
npm init -y >/dev/null
npm pkg set scripts.test:unit="node --test" scripts.lint="echo lint-ok"
mkdir -p src/api test legacy
echo 'export const add = (a, b) => a + b;' > src/api/math.js
cat > test/math.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert';
import { add } from '../src/api/math.js';
test('add', () => assert.strictEqual(add(1, 2), 3));
EOF
npm pkg set type=module
git add -A && git commit -qm init
```

Lưu ý: script test tên là `test:unit`, **không phải** `test`. Đây là bẫy cố ý.

### 4.2 Viết `AGENTS.md` (nguồn chung) và `CLAUDE.md` (import)

`AGENTS.md`:

```markdown
# ctx-lab

## Lệnh
- test: `npm run test:unit` (KHÔNG có script `test`)
- lint: `npm run lint`

## Convention
- ES module (`import`/`export`), không dùng `require`
- Không sửa gì trong `legacy/` — code đông cứng, chỉ đọc
- Mỗi hàm mới trong `src/` phải có test trong `test/`

## Điều tra / audit
- Kết luận về code đang chạy: đọc từ `origin/main`. Ghi kết quả
  `git rev-list --left-right --count origin/main...HEAD` ở đầu báo cáo
- Task có danh từ nhiều nghĩa (môi trường, bề mặt UI) → hỏi một câu trước khi làm
- Báo cáo kết thúc bằng dòng `Đã chạy: <lệnh gate>` kèm exit code

<!-- Ghi chú bảo trì: giữ dưới 60 dòng. Quy trình nhiều bước → skill. -->
```

`CLAUDE.md`:

```markdown
@AGENTS.md

## Riêng Claude Code
- Đổi việc không liên quan → nhắc người dùng `/clear`
```

`.claude/rules/api.md`:

```markdown
---
paths:
  - "src/api/**/*.js"
---
- Hàm trong `src/api/` không throw; trả `{ ok: false, error }` khi input sai
```

### 4.3 Kiểm đã nạp

Claude Code — mở `claude` ở `ctx-lab/`, gõ `/context`. Tiêu chí xong: dưới **Memory files** thấy `CLAUDE.md` và nội dung từ `AGENTS.md`; **chưa** thấy `api.md`. Rồi gõ: `đọc src/api/math.js`, chạy `/context` lần nữa: lần này rule `api.md` phải xuất hiện.

Codex — chạy:

```bash
codex --ask-for-approval never "Summarize the current instructions. Quote the test command exactly."
```

Tiêu chí xong: câu trả lời trích đúng `npm run test:unit` và nhắc `legacy/`.

### 4.4 Kiểm tuân thủ bằng output, không bằng cảm giác

Mở phiên mới ở mỗi công cụ, prompt:

```
Thêm hàm sub(a, b) vào src/api/math.js, rồi chạy test.
```

Tiêu chí xong (kiểm từng dòng):

- [ ] Agent chạy `npm run test:unit`, không thử `npm test` trước (xem transcript).
- [ ] Có file test cho `sub` trong `test/`.
- [ ] Báo cáo kết thúc bằng dòng `Đã chạy: npm run test:unit` kèm exit code.
- [ ] `git diff --stat -- legacy/` rỗng.

### 4.5 Kiểm thứ gì sống qua compaction

Trong Claude Code:

1. Gõ trong chat: *"Từ giờ mọi tên biến mới dùng tiền tố `lab_`."* Nhờ agent viết một hàm nhỏ, xác nhận nó dùng `lab_`.
2. Gõ `/compact`.
3. Nhờ viết thêm một hàm. Ghi lại: còn `lab_` không? Luật `legacy/` (trong file) còn không — hỏi thẳng "thư mục nào không được sửa?".
4. Chuyển luật `lab_` vào `AGENTS.md`, `/clear`, lặp lại bước 1–3.

Tiêu chí xong: bạn có một bảng hai dòng (luật trong chat / luật trong file) × hai cột (trước / sau compact) điền bằng quan sát thật. Luật trong file phải còn ở cả hai cột; nếu luật trong chat vẫn còn sau compact, ghi lại — tóm tắt có thể giữ nó, nhưng docs không hứa điều đó.

---

## 5. Bẫy thường gặp

🪤 **Giữ nguyên bản nháp `/init`.**
Triệu chứng: file 150–300 dòng, phần lớn là mô tả thư mục; agent vẫn mắc đúng lỗi bạn đã ghi.
Nguyên nhân gốc: `/init` mô tả lại thứ code đã nói; luật quan trọng bị pha loãng (docs: file dài *"reduce adherence"*).
Chặn bằng cơ chế: gate đếm dòng trong pre-commit hoặc CI — `test $(wc -l < CLAUDE.md) -le 60 || { echo "CLAUDE.md quá 60 dòng"; exit 1; }`. Định kỳ chạy `/doctor prompt-audit` (Claude Code v2.1.283 trở lên, theo docs [memory](https://code.claude.com/docs/en/memory)) để tìm luật lỗi thời, mâu thuẫn, hoặc trỏ tới file/lệnh không tồn tại.

🪤 **Lệnh trong file đã thối.**
Triệu chứng: agent chạy `npm test`, báo "missing script", rồi tự đoán lệnh khác hoặc báo "repo không có test".
Nguyên nhân gốc: ai đó đổi tên script trong `package.json`, không ai sửa file hướng dẫn — không có gì nối hai nơi.
Chặn bằng cơ chế: script kiểm chạy trong CI, đối chiếu mọi `npm run <x>` trong file với `package.json`:

```bash
#!/usr/bin/env bash
# check-agent-cmds.sh — exit 1 nếu AGENTS.md nhắc script npm không tồn tại
set -euo pipefail
missing=0
for s in $(grep -oE 'npm run [a-zA-Z0-9:_-]+' AGENTS.md | awk '{print $3}' | sort -u); do
  node -e "process.exit(require('./package.json').scripts?.['$s'] ? 0 : 1)" \
    || { echo "THIẾU script: $s"; missing=1; }
done
exit $missing
```

Kiểm cả hai chiều trước khi tin nó: đổi tạm `test:unit` thành `test:unitx` trong `AGENTS.md`, script phải đỏ.

🪤 **Cấm bằng lời trong file hướng dẫn.**
Triệu chứng: "KHÔNG push main" nằm trong `CLAUDE.md`, và một ngày agent vẫn push.
Nguyên nhân gốc: docs — `CLAUDE.md` là *"context, not enforced configuration"*; *"To block an action regardless of what Claude decides, use a PreToolUse hook"*.
Chặn bằng cơ chế: giữ dòng trong file (để agent hiểu ý), **và** thêm permission deny hoặc hook — [[ag-08-hook-va-chan-bang-cau-hinh]].

🪤 **Thêm `CLAUDE.local.md` làm mất `AGENTS.md` của team.**
Triệu chứng: sau khi bạn tạo file ghi chú cá nhân, agent quên mọi convention chung.
Nguyên nhân gốc: `CLAUDE.local.md` được tính là "có CLAUDE.md", nên Claude Code thôi đọc `AGENTS.md` ở chế độ mặc định.
Chặn bằng cơ chế: dùng mẫu §4.2 (`CLAUDE.md` import `@AGENTS.md`), hoặc đặt Project instructions thành `claude-md-and-agents-md`; sau mỗi thay đổi file hướng dẫn, chạy `/context` hoặc `/memory` xem danh sách file nạp.

🪤 **Sửa file hướng dẫn giữa phiên rồi tưởng đã có hiệu lực.**
Triệu chứng: bạn thêm luật vào `AGENTS.md`, agent Codex trong phiên đang mở vẫn làm ngược.
Nguyên nhân gốc: docs Codex — discovery chạy một lần mỗi lần khởi động.
Chặn bằng cơ chế: quy ước "sửa file hướng dẫn ⇒ mở phiên mới", và kiểm bằng lệnh tóm tắt hướng dẫn ở §4.3 trước khi giao việc.

🪤 **`AGENTS.md` lồng nhau vượt 32 KiB.**
Triệu chứng: luật ở `AGENTS.md` thư mục sâu không bao giờ có tác dụng trong Codex.
Nguyên nhân gốc: `project_doc_max_bytes` mặc định 32 KiB; chạm trần thì file sau bị bỏ, không báo.
Chặn bằng cơ chế: gate tổng dung lượng — `find . -name AGENTS.md -not -path './node_modules/*' -exec cat {} + | wc -c` phải nhỏ hơn 32768 (đây là tổng **mọi** file trong repo, chặt hơn thực tế vì Codex chỉ nạp nhánh thư mục đang đứng).

🪤 **Đọc đúng file, sai phiên bản.**
Triệu chứng: báo cáo audit trích dẫn đầy đủ nhưng kết luận sai về prod (case §2).
Nguyên nhân gốc: worktree đang mở là nhánh feature lệch master; context không có dòng nào nói phải đọc nhánh nào.
Chặn bằng cơ chế: dòng "Điều tra / audit" trong §4.2, và đòi con số `rev-list` ở đầu mọi báo cáo audit — người đọc thấy `198` là biết ngay phải hỏi.

---

## 6. Chuyển giao

Bài này cho agent biết **luật chơi của repo** mỗi lần mở phiên. Ở Level 2 bạn vẫn duyệt từng bước; [[ag-05-checkpoint-tung-buoc]] dựng lưới an toàn bằng git cho việc duyệt đó và tính thử nó tốn bao nhiêu phút mỗi ngày.

Sang Level 3, file hướng dẫn là tầng đầu tiên trong bốn cơ chế "dạy agent cách mình làm việc", và mỗi cơ chế nhận phần việc mà bài này đã đẩy ra khỏi `CLAUDE.md`:

- Thứ agent tự học từ lời sửa của bạn → auto memory, [[ag-06-memory-va-feedback]].
- Quy trình nhiều bước dùng thỉnh thoảng → skill, [[ag-07-skill-va-slash-command]].
- Lệnh cấm phải tuyệt đối → hook và permission, [[ag-08-hook-va-chan-bang-cau-hinh]].

Level 3 bỏ được việc **dặn lại mỗi phiên**. Thứ bạn vừa học — ba tiêu chí lọc, và quy luật "trên đĩa thì sống, trong chat thì thành tóm tắt" — là nền cho [[ag-18-brief-la-shared-state]] ở Level 6, nơi state của cả một vòng loop phải sống ngoài context. Lý thuyết vòng lặp tool ở mức API: [[aiml-05-agents-tools]].

---

## 7. Tóm tắt

- Context window là thứ duy nhất model thấy; mỗi phiên bắt đầu trống, file hướng dẫn là cách đưa luật của repo vào mọi phiên.
- Claude Code: managed → user → project → local, **nối chứ không đè**; thư mục con và rule có `paths` nạp khi agent chạm file; import không giảm chi phí. Kiểm bằng `/context`.
- Codex: `~/.codex` rồi từ gốc repo xuống thư mục hiện tại, tối đa một file mỗi thư mục, trần 32 KiB cắt im lặng, sửa xong phải khởi động lại.
- Dùng chung một nguồn: `AGENTS.md` + `CLAUDE.md` chỉ có `@AGENTS.md`; cẩn thận `CLAUDE.local.md` làm mất `AGENTS.md`.
- Một dòng chỉ vào file khi: đúng mọi lượt, không suy ra được từ code, kiểm được. Quy trình → skill; lệnh cấm → hook; trạng thái → file state.
- Sau compaction, thứ trên đĩa được nạp lại, thứ chỉ nói trong chat chỉ còn trong tóm tắt — ràng buộc lâu dài phải nằm trong file.
- Plan mode chặn ghi, không chặn đọc sai; research trước khi code phải kiểm được: đúng nhánh (`rev-list`), đúng bề mặt (hỏi một câu), đúng convention (grep).
