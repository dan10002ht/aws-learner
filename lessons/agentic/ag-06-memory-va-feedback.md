# Bài 6 — Memory: để agent không phải được dặn lại

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **thứ gì sống sót** sang session sau (CLAUDE.md, rules, auto memory) và thứ gì mất (mọi lời dặn chỉ nói trong chat, kể cả sau `/compact`), kèm lệnh để tự kiểm (`/context`, `/memory`).
- Viết một **feedback memory** gồm luật + nguyên văn + **Why** + **How to apply**, và giải thích vì sao thiếu Why thì agent áp luật sai ở các ca biên.
- Phân loại một điều định ghi thành **durable** (đáng nhớ lâu dài), **transient** (trạng thái việc đang làm, thuộc về file brief) hay **suy ra được từ code** (không ghi), bằng ba câu hỏi kiểm được.
- Nhận ra bốn kiểu **memory thối**: tên đã đổi, workaround sống lâu hơn nguyên nhân, luật khái quát sai từ một sự cố, hai file mâu thuẫn.
- Chạy một script kiểm memory, đọc kết quả như **danh sách ứng viên** chứ không phải phán quyết, và chứng minh script đó đỏ được.
- Tính được dung lượng trần của file index `MEMORY.md` từ giới hạn trong docs, và biết vì sao vượt trần thì phần đuôi mất mà không có lỗi lúc đọc.

---

## 2. Tình huống

Một dev đang điều tra một ca lỗi dữ liệu trên production cùng coding agent. Buổi điều tra kiểu này gồm hàng chục lệnh **chỉ đọc**: lấy một document, chạy một câu `SELECT`, đọc log.

Đầu buổi, sandbox chặn một script đọc dữ liệu. Agent rút ra một "luật" cho riêng nó: *script nào dùng service account production thì phải nhờ người chạy tay*. Từ đó, mỗi lệnh đọc đều thành một vòng: agent in lệnh ra, dev copy, chạy bằng `!`, dán kết quả lại. Tới lần thứ n, dev gõ (nguyên văn, đã lược tên):

> "query thôi thì m có thể chạy mà? những việc như update data thì mới cần t chạy thủ công chứ ???"

Agent xin lỗi, tự chạy phần còn lại của buổi. Hôm sau, session mới. Cảnh y hệt lặp lại: lệnh đọc đầu tiên lại được đẩy sang cho người chạy.

Không có gì hỏng ở đây theo nghĩa kỹ thuật. Lời sửa của dev nằm trong **context window** (vùng văn bản model nhìn thấy được trong một lượt làm việc) của session hôm qua; session hôm nay bắt đầu với context rỗng. Ở level 2 bạn chấp nhận chuyện này vì bạn đang ngồi duyệt từng bước — sửa lại thì mất mười giây. Nhưng chính mười giây lặp lại mỗi session là thứ khiến bạn không thể rời mắt khỏi agent. Level 3 bắt đầu từ câu hỏi: **làm sao để lời sửa hôm qua có mặt trong context hôm nay mà không ai phải gõ lại.**

(Case thực tế; nguồn là một note feedback trong second brain của tác giả. Note ghi "lần thứ n", không đếm chính xác số lần. Cùng buổi điều tra này, nhìn từ góc ranh giới đọc/ghi và đường lùi, ở [[ag-05-checkpoint-tung-buoc]].)

---

## ⏸ Dừng lại — đoán trước

Bạn quyết định ghi lời sửa trên thành memory để session sau tự biết. Có bốn bản nháp. Bản nào làm agent cư xử đúng **cả với lệnh đọc lẫn lệnh ghi** ở session sau?

```
(a) "Đừng nhờ user chạy query."
(b) "User muốn agent tự chạy lệnh, đừng hỏi."
(c) Luật: lệnh đọc thì tự chạy, lệnh ghi thì đưa lệnh cho người chạy.
    Why: mỗi lệnh đẩy sang người là một vòng chờ; thứ cần người ở giữa là thay đổi trạng thái
         vì nó không lùi lại được, còn đọc thì không cần lùi.
    How to apply: phân loại theo đọc/ghi, không theo "có dùng credential production không".
(d) Không cần ghi — Claude Code giữ lịch sử hội thoại nên session sau tự nhớ.
```

Đáp án nằm ở cuối §3.5.

---

## 3. Cơ chế

### 3.1 Mỗi session bắt đầu với context rỗng

Docs Claude Code nói thẳng: *"Each Claude Code session begins with a fresh context window."* Có hai cơ chế mang tri thức qua các session (nguồn: https://code.claude.com/docs/en/memory):

- **File hướng dẫn** — `CLAUDE.md` (hoặc `AGENTS.md`) và `.claude/rules/`: **bạn** viết, nạp vào context đầu mỗi session.
- **Auto memory** — các file markdown **Claude tự viết** dựa trên lời sửa và sở thích của bạn, cũng nạp đầu mỗi session (một phần — xem §3.3).

Mọi thứ khác chỉ sống trong context của session hiện tại. Kể cả trong một session, lời dặn chỉ nói trong chat vẫn có thể mất: docs mục "Instructions seem lost after `/compact`" giải thích CLAUDE.md ở gốc project được đọc lại từ đĩa sau khi **compaction** (nén hội thoại thành bản tóm tắt khi context gần đầy), còn chỉ thị *"given only in conversation"* thì không có gì đảm bảo còn nguyên. Cách chữa docs đưa ra: chuyển lời dặn đó vào CLAUDE.md.

Vậy đáp án (d) sai: lịch sử hội thoại cũ không được nạp vào session mới. Bạn có thể `--resume` đúng session cũ, nhưng đó là tiếp tục một hội thoại, không phải "nhớ" — session mới cho việc mới vẫn trống.

Cách tự kiểm, không cần tin lời ai:

```
/context   # danh sách "Memory files": CLAUDE.md, CLAUDE.local.md, rules đã nạp lúc khởi động
/memory    # liệt kê các file memory, bật/tắt auto memory, mở thư mục auto memory
```

### 3.2 Bản đồ chỗ lưu: ai viết, nạp khi nào, ai thấy

Cách viết CLAUDE.md (viết gì, không viết gì, thứ bậc user/project/local) là chủ đề của [[ag-04-context-va-file-huong-dan]]. Ở đây chỉ cần bản đồ để quyết định **một lời sửa nên rơi vào đâu**. Các vị trí dưới đây lấy từ docs memory:

| Chỗ lưu | Ai viết | Nạp khi nào | Ai thấy |
|---|---|---|---|
| `~/.claude/CLAUDE.md`, `~/.claude/rules/` | bạn | mọi session, mọi repo | chỉ bạn, trên máy này |
| `./CLAUDE.md` hoặc `./.claude/CLAUDE.md` | bạn / team | mọi session trong repo | cả team (commit vào git) |
| `./CLAUDE.local.md` | bạn | mọi session trong repo | chỉ bạn (thêm vào `.gitignore`) |
| `.claude/rules/*.md` có frontmatter `paths:` | bạn / team | khi agent đọc/sửa file khớp glob | cả team |
| `~/.claude/projects/<project>/memory/MEMORY.md` | Claude | mọi session, 200 dòng hoặc 25KB đầu | chỉ máy này |
| các topic file trong cùng thư mục memory | Claude | **không** nạp lúc đầu; Claude tự mở khi cần | chỉ máy này |

Ba hệ quả đọc ra từ bảng, đều có nguồn trong docs:

1. **Auto memory là machine-local.** Docs: *"Files are not shared across machines or cloud environments."* Luật mà cả team cần, hoặc mà agent chạy trên CI/VM cần, phải nằm trong file được commit — không phải trong auto memory trên laptop của bạn.
2. **Subagent không thấy auto memory của main.** Docs: *"The main conversation's auto memory isn't loaded into subagents"* (trừ fork, vốn thừa kế cả hội thoại). Khi giao việc cho subagent ([[ag-14-subagent-va-brief]]), luật nào quan trọng phải đi trong brief.
3. **Mọi worktree của cùng một repo dùng chung một thư mục auto memory**, vì `<project>` suy ra từ git repository. Nhưng `CLAUDE.local.md` bị gitignore thì chỉ có ở worktree nơi bạn tạo nó.

### 3.3 Auto memory hoạt động thế nào

Theo docs, Claude ghi bốn loại note, đánh dấu bằng field `type` trong frontmatter:

- `user` — vai trò, chuyên môn, sở thích làm việc của bạn
- `feedback` — lời sửa bạn đưa ra và cách làm bạn đã xác nhận
- `project` — việc đang làm, hạn chót, quyết định **không suy ra được** từ code hay git history
- `reference` — chỗ tìm thông tin ngoài project (issue tracker, dashboard)

Docs cũng nói Claude **bỏ qua** thứ suy ra được từ codebase (kiến trúc, đường dẫn file, cách fix một bug) và thứ CLAUDE.md đã nói. Khi bạn nói "remember that…", Claude ghi vào auto memory; muốn ghi vào CLAUDE.md thì nói rõ "add this to CLAUDE.md".

Cấu trúc thư mục:

```text
~/.claude/projects/<project>/memory/
├── MEMORY.md                  # index, mỗi memory một dòng — nạp đầu mỗi session
├── feedback-doc-ghi.md        # một memory
└── project-migration.md       # một memory khác — chỉ đọc khi cần
```

Đây là thiết kế **index + lazy load** (nạp lười: chỉ đọc khi cần). Index luôn có mặt trong context nên agent biết *có* một memory về chuyện X; nội dung chi tiết chỉ tốn context khi agent quyết định mở file. Hệ quả: **dòng index là thứ quyết định memory có được dùng hay không.** Một dòng index mơ hồ ("notes về DB") khiến agent không biết lúc nào nên mở file; một dòng nói rõ tình huống ("lệnh đọc prod: tự chạy; lệnh ghi: đưa người chạy") thì gần như tự áp dụng được ngay từ index.

**Trần của index.** Docs: *"The first 200 lines of `MEMORY.md`, or the first 25KB, whichever comes first, are loaded"*; phần sau ngưỡng không được nạp. Ngưỡng nào chạm trước phụ thuộc độ dài trung bình mỗi dòng:

```python
# Phép tính từ số trong docs (200 dòng, 25KB). "KB" trong docs không nói rõ 1000 hay 1024 — tính cả hai.
for kb in (25 * 1000, 25 * 1024):
    print(kb / 200)          # 125.0 và 128.0 byte/dòng
# Dòng index trung bình dài hơn ~125–128 byte  -> trần 25KB chạm trước 200 dòng.
# Tiếng Việt có dấu: mỗi ký tự có dấu thường chiếm 2–3 byte UTF-8,
# nên một dòng "nhìn" 80 ký tự có thể đã vượt 128 byte.

# Case thực tế, một lần đo, repo course này: MEMORY.md có 12 dòng / 1441 byte
print(1441 / 12)             # ~120 byte/dòng -> còn cách trần dòng rất xa, cách trần byte cũng xa
```

Nếu index vượt trần, docs nói lần ghi **vẫn thành công**, Claude Code trả về lỗi bảo Claude viết lại index, vì *"everything past the limit is dropped on the next load"*. Tức là chỗ phát hiện duy nhất là lúc ghi; lúc đọc ở session sau thì phần đuôi chỉ đơn giản là không có — không có cảnh báo nào ở phía đọc. Memory mới nhất thường được thêm ở cuối, nên đó lại là phần mất trước.

Hai chi tiết khác đáng biết (docs):

- Khi Claude ghi một memory file có YAML frontmatter, Claude Code tự thêm field `modified` (timestamp ISO 8601) — cần Claude Code v2.1.214 trở lên. Đây là dữ kiện bạn sẽ dùng để kiểm memory cũ ở §3.7.
- Tắt auto memory: toggle trong `/memory` (lưu `autoMemoryEnabled` vào `~/.claude/settings.json`), `"autoMemoryEnabled": false` trong settings của project, hoặc biến môi trường `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. Đổi thư mục: `autoMemoryDirectory`.

### 3.4 Memory là context, không phải cấu hình

Câu quan trọng nhất trong trang docs memory: *"Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."* Và ở mục troubleshoot: nội dung CLAUDE.md được đưa vào *"as a user message after the system prompt"*, *"there's no guarantee of strict compliance, especially for vague or conflicting instructions."*

Nghĩa là memory giảm số lần bạn phải dặn lại, nhưng **không thay được chặn cứng**. Phân loại theo hậu quả khi agent lỡ bỏ qua:

- Bỏ qua thì tốn thêm một vòng hỏi đáp (agent nhờ bạn chạy một lệnh đọc) → memory là đủ.
- Bỏ qua thì gây hậu quả không lùi được (push thẳng lên nhánh chính, chạy lệnh xoá dữ liệu) → cần hook hoặc permission deny, học ở [[ag-08-hook-va-chan-bang-cau-hinh]]. Memory lúc này chỉ đóng vai giải thích *vì sao* có cái chặn đó.

### 3.5 Giải phẫu một feedback dùng được

Một feedback memory dùng được có bốn phần. Mẫu dưới đây là bản viết lại (ẩn danh) của note thật đứng sau tình huống §2:

```markdown
---
name: feedback-doc-tu-chay-ghi-nho-nguoi
description: "Lệnh chỉ đọc dữ liệu prod thì agent tự chạy; chỉ lệnh GHI mới đưa người chạy tay"
metadata:
  type: feedback
---

Lệnh đọc thì tự chạy, lệnh ghi thì đưa lệnh cho người chạy.

Nguyên văn: "query thôi thì m có thể chạy mà? những việc như update data thì mới cần t chạy thủ công chứ"

**Why:** mỗi lệnh đẩy sang người là một vòng chờ, một buổi điều tra có hàng chục lệnh đọc.
Luật cũ "có credential prod thì nhờ người" được rút ra từ một lần sandbox chặn script — nhưng
cái bị chặn và cái đáng chặn không trùng nhau. Thứ cần người ở giữa là THAY ĐỔI TRẠNG THÁI,
vì nó không lùi lại được bằng một lệnh khác. Đọc thì không có gì phải lùi.

**How to apply:**
| Lệnh | Ai chạy |
|---|---|
| SELECT, .get(), GraphQL query, đọc log | agent tự chạy, tự thử lại khi sai |
| INSERT/UPDATE/DELETE, mutation, đổi cờ cấu hình, migration | đưa lệnh + nói rõ nó ghi gì + lệnh revert, người chạy |
Sandbox chặn một lệnh ĐỌC → nói "bị sandbox chặn" rồi đưa lệnh; không biến lần chặn đó thành luật chung.
```

Vì sao từng phần có mặt:

- **Luật** (một câu) — để agent áp được ngay ở ca phổ biến.
- **Nguyên văn** — giữ đúng ý người nói. Một bản diễn giải như (b) "user muốn agent tự chạy lệnh" đã trôi nghĩa: nó mất vế "update thì mới cần t chạy".
- **Why** — đây là phần quyết định ở **ca biên**, nơi luật một câu không đủ. Ví dụ: một câu query đọc nhưng quét cả bảng lớn, tính tiền theo dung lượng quét. Luật "đọc thì tự chạy" nói chạy; còn Why ("cái cần người là thứ không lùi lại được") cho agent một tiêu chí để tự hỏi: tiền đã tiêu thì có lùi được không? Không có Why, agent chỉ có thể khớp mặt chữ.
- **How to apply** — biến nguyên tắc thành bảng phân loại cụ thể, kèm cả hành vi khi gặp lại đúng sự cố gốc (sandbox chặn).

**Đáp án ⏸ là (c).** (a) đúng ở lệnh đọc nhưng im lặng về lệnh ghi — và vì nó không có lý do, agent không suy được ranh giới. (b) tệ hơn: khái quát thành "đừng hỏi", tức là nới quyền cho cả lệnh ghi — đúng thứ người dùng *không* nói. (d) sai vì session mới không nạp hội thoại cũ (§3.1).

Phần Why cũng là thứ giúp chính bạn **dọn memory về sau**: đọc lại sau ba tháng, nếu lý do không còn đúng (ví dụ team đã có môi trường staging tách biệt) thì bạn biết luật nào xoá được. Luật không kèm lý do thì không ai dám xoá, và memory chỉ phình ra.

### 3.6 Durable, transient, hay suy ra được — ba câu hỏi trước khi ghi

Không phải lời sửa nào cũng đáng thành memory. Mỗi dòng trong index tốn context của **mọi** session sau. Một ví dụ đo được từ hệ thống của tác giả (case thực tế, một lần đo): một bộ 13 feedback note được đẩy vào prompt của một bot chiếm ≈ 10,7 KB.

```python
per_note = 10.7 / 13          # ≈ 0.82 KB/note (số đo 1 lần, không phải trung bình chung)
print(per_note * 45)          # ≈ 37 KB nếu đẩy cả 45 feedback note — đã vượt trần 25KB của MEMORY.md
# Ý của phép tính: không thể "ghi hết cho chắc". Phải chọn, và index phải trỏ chứ không chứa.
```

Ba câu hỏi, trả lời được bằng có/không:

1. **Một tháng sau còn đúng không?** "Lệnh đọc tự chạy, lệnh ghi đưa người" — còn. "Task migrate đang chờ review" — không; đó là **transient**, thuộc về file trạng thái của việc đang làm (BRIEF.md, học ở [[ag-18-brief-la-shared-state]]), không thuộc memory.
2. **Đọc code hoặc `git log` có ra không?** Cấu trúc thư mục, tên hàm, lịch sử fix — repo đã giữ, ghi lại chỉ tạo bản sao sẽ lệch. Docs nói auto memory tự bỏ qua loại này; kinh nghiệm thực tế là file tự viết tay hay vi phạm nhất.
3. **Đã có ở file hướng dẫn chưa?** Nếu có thì sửa ở đó, đừng tạo bản thứ hai — hai bản sẽ có ngày nói khác nhau (§3.7, kiểu 4).

Thêm một luật về hình dạng, mượn từ Zettelkasten: **mỗi memory đúng một ý**. Dấu hiệu cần tách: tiêu đề phải dùng chữ "và". Lý do kỹ thuật, không phải thẩm mỹ: index chỉ có một dòng cho mỗi file — file hai ý thì một trong hai ý không có mặt ở dòng index, và agent sẽ không biết lúc nào mở nó.

Ví dụ một memory durable khác từ cùng nguồn (case thực tế, một lần): một loop định kỳ 5 phút/lần chạy **~170 lượt rỗng liên tiếp** (≈ 14 tiếng) vì mọi task còn lại đều chờ người quyết (diễn biến và điều kiện dừng ở [[ag-19-vong-lap-nhat-task]]). Feedback rút ra: *"rỗng ~15 lượt liên tiếp thì tự dừng loop và ghi tổng kết đang bị chặn bởi gì"*, Why: loop không nhặt được việc thì không tự khỏi, và 170 dòng "không thay đổi" làm việc *bị chặn* trông như việc *đang chạy*. Con số 15 ở đây là ngưỡng do người chọn, không phải số đo — memory nên ghi rõ như vậy để người sau biết được phép chỉnh.

### 3.7 Memory thối: bốn kiểu, và vì sao không tự lộ ra

"Memory thối" là memory từng đúng, nay sai, nhưng vẫn được nạp và vẫn được tin. Nó nguy hiểm hơn thiếu memory vì agent làm theo nó với độ tự tin của một luật đã được xác nhận.

**Kiểu 1 — tên đã đổi.** Ví dụ có nguồn, ngay trong docs memory: cấu hình plugin đọc `AGENTS.md` dùng ID `cc-plugin-agents-md@builtin`; docs ghi *"Before v2.1.285, the plugin's ID was `agents-md@builtin`, and Claude Code ignored an entry under `cc-plugin-agents-md@builtin`."* Một memory ghi ID của một phiên bản, chạy trên phiên bản kia, sẽ cho ra một entry bị **bỏ qua im lặng** — không lỗi, chỉ không có tác dụng. Cùng họ: script `gate.sh` đổi tên thành `check.sh`, lệnh `npm run test:unit` đổi thành `npm run test`, flag CLI đổi tên.

**Kiểu 2 — workaround sống lâu hơn nguyên nhân.** Case thực tế: ở một repo nội dung cá nhân, một hook guard chặn mọi commit/push khi đang ở nhánh `main`. Memory được ghi để vượt: "đi vòng qua nhánh tạm rồi merge fast-forward". Sau đó repo được thêm vào danh sách miễn trừ của hook. Nếu memory không được sửa, mọi session tiếp tục đi đường vòng không cần thiết — và tệ hơn, khi hook bị ghi đè làm chặn lại, agent sẽ lặng lẽ đi vòng thay vì báo hook có vấn đề. Bản memory sau khi sửa có thêm một câu đáng học: *"Nếu lại gặp chặn, kiểm tra hook có bị ghi đè không thay vì đi đường vòng."*

**Kiểu 3 — luật khái quát sai từ một sự cố.** Chính tình huống §2: một lần sandbox chặn → luật "có credential prod thì nhờ người". Luật này không thối theo thời gian; nó sai từ lúc sinh ra, vì được rút từ **một** quan sát mà không hỏi cơ chế. Cách chặn là bắt mọi memory có Why: viết Why buộc người viết (hoặc agent) nói ra cơ chế, và cơ chế sai thì dễ thấy hơn luật sai.

**Kiểu 4 — hai file mâu thuẫn.** Docs: *"if two instructions contradict each other, Claude may pick one arbitrarily"*, và với rules ở cấp user và project: *"Neither set overrides the other."* Tức là không có thứ bậc ghi đè kiểu CSS; file gần thư mục làm việc được đọc sau cùng, nhưng "đọc sau" không có nghĩa "thắng". Ví dụ thường gặp: `~/.claude/CLAUDE.md` nói "luôn tạo nhánh trước khi commit", memory của một repo nói "repo này push thẳng main". Agent có thể làm theo cái nào cũng được. Cách chặn: memory ngoại lệ phải **gọi tên** luật nó ngoại lệ ("bỏ qua luật branch-first chung cho repo này, vì…"), để người đọc và model thấy đây là ngoại lệ có chủ đích, không phải mâu thuẫn.

Vì sao cả bốn kiểu **không tự lộ ra**: memory chỉ được kiểm bởi chính hành vi của agent, và hành vi sai do memory thối thường trông hợp lý (đi đường vòng vẫn commit được; ID bị bỏ qua thì tính năng chỉ "không chạy"). Không có test nào đỏ. Đây là cùng một lớp vấn đề với "đọc đúng file nhưng sai phiên bản": một case thực tế trong brain của tác giả là một bản audit đọc code ở nhánh feature **198 commit sau** nhánh production; 11/14 file trích dẫn khớp, 3 file lệch — đúng 3 file quan trọng nhất. Memory là một ảnh chụp tại thời điểm ghi; code thì đi tiếp.

### 3.8 Cách kiểm memory bằng cơ chế

Ba công cụ, từ rẻ tới đắt:

**(1) `/context` và `/memory`** — xác nhận file nào thật sự nạp. Docs gợi ý thêm hook `InstructionsLoaded` để log file nào nạp, khi nào, vì sao — hữu ích khi debug rules theo `paths:`.

**(2) `/doctor prompt-audit`** — theo docs, Claude rà các file hướng dẫn để tìm *"instructions written for older models, references to files or commands that don't exist, and files that contradict each other"*, trả về báo cáo kèm đề xuất sửa, không tự sửa gì. Cần Claude Code v2.1.283 trở lên. Mặc định nó rà CLAUDE.md, CLAUDE.local.md, AGENTS.md và rules/skills/commands/subagents dưới `.claude/` và `~/.claude/`. Docs không nói nó có rà thư mục auto memory hay không — đừng giả định là có.

**(3) Một script kiểm tất định** cho thư mục auto memory. Script dưới đây chạy được với Python 3 chuẩn, không cần thư viện ngoài. Nó tìm bốn tín hiệu: index sát trần, link trong index trỏ tới file không có, memory lâu không sửa, đường dẫn trong backtick không còn tồn tại, feedback thiếu Why.

```python
#!/usr/bin/env python3
"""check-memory.py — tìm memory thối. Dùng: python3 check-memory.py <thư-mục-memory> [gốc-repo]"""
import datetime, pathlib, re, sys

mem = pathlib.Path(sys.argv[1]).expanduser()
repo = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ".").expanduser().resolve()
MAX_DAYS = 90          # ngưỡng tự chọn: quá 90 ngày chưa sửa thì đọc lại xem còn đúng không
problems = 0

def report(kind, msg):
    global problems
    problems += 1
    print(f"{kind:7} {msg}")

# 1. Index: sát trần nạp (200 dòng / 25KB theo docs) và link gãy
index = mem / "MEMORY.md"
if index.exists():
    raw = index.read_bytes()
    lines = raw.count(b"\n")
    if lines > 180 or len(raw) > 23_000:
        report("WARN", f"MEMORY.md {lines} dòng / {len(raw)} byte — sát trần 200 dòng / 25KB")
    for target in re.findall(r"\]\(([^)]+\.md)\)", raw.decode()):
        if not (mem / target).exists():
            report("BROKEN", f"MEMORY.md trỏ tới {target} nhưng file không có")

# 2. Từng topic file: tuổi, feedback thiếu Why, đường dẫn đã biến mất
now = datetime.datetime.now(datetime.timezone.utc)
for f in sorted(mem.glob("*.md")):
    if f.name == "MEMORY.md":
        continue
    text = f.read_text()
    m = re.search(r"modified:\s*(\S+)", text)
    if m:
        ts = datetime.datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
        age = (now - ts).days
        if age > MAX_DAYS:
            report("STALE", f"{f.name}: sửa lần cuối {age} ngày trước")
    if re.search(r"type:\s*feedback", text) and "Why" not in text:
        report("NOWHY", f"{f.name}: feedback không có Why — agent không biết biên của luật")
    for tok in re.findall(r"`([^`\s]+)`", text):
        if "/" not in tok or tok.startswith(("http", "<")) or any(c in tok for c in "*{}$<>"):
            continue
        p = pathlib.Path(tok).expanduser()
        p = p if p.is_absolute() else repo / p
        if not p.exists():
            report("MISSING", f"{f.name}: `{tok}` không còn tồn tại")

print(f"--- {problems} vấn đề")
sys.exit(1 if problems else 0)
```

Chạy trên thư mục auto memory của chính repo course này (case thực tế, một lần chạy, không phải benchmark): **8 cảnh báo `MISSING`**. Đọc từng cái:

- 2 cái là thối thật: memory mô tả một quy trình phụ thuộc file job trong `/tmp`, file đó đã bị hệ điều hành dọn. Đây là một **transient lọt vào memory** (§3.6, câu hỏi 1).
- 6 cái là dương tính giả: một dải tên file viết tắt (`gs-01..gs-42.md`), một route web, một tên repo GitHub, một slash command, và một đường dẫn xuất hiện trong câu **phủ định** ("KHÔNG dùng `web/public`").

Bài học về cách dùng: script tất định là **bộ lọc ra ứng viên**, không phải phán quyết. Nó rẻ, chạy được mỗi tuần, và đủ để biến "đọc lại toàn bộ memory" thành "đọc lại 8 dòng". Người (hoặc một agent khác) đọc 8 dòng đó và quyết định. Đừng sửa script cho tới khi hết dương tính giả bằng cách nới điều kiện — làm vậy là đổi một thước đo ồn lấy một thước đo không bao giờ đỏ ([[ag-11-gate-xanh-gia]]).

---

## 4. Làm thử

Mục tiêu: ghi một feedback memory, chứng minh session mới dùng nó, rồi chứng minh script kiểm phát hiện được khi nó thối. Khoảng 20–30 phút, cần Claude Code và một repo git bất kỳ (repo nháp cũng được).

**Bước 1 — Dựng repo nháp có một gate.**

```bash
mkdir -p ~/memlab/scripts && cd ~/memlab && git init -q
printf '#!/bin/sh\necho "gate: ok"\n' > scripts/gate.sh && chmod +x scripts/gate.sh
git add -A && git commit -qm "init"
```

**Bước 2 — Tạo lời sửa trong session thứ nhất.** Mở `claude` trong `~/memlab`, gõ:

```text
Sửa README thêm một dòng mô tả repo.
```

Khi agent báo xong mà không chạy gate, gõ lời sửa dạng feedback đầy đủ:

```text
Ghi nhớ cho repo này: trước khi báo xong bất kỳ thay đổi nào, chạy `scripts/gate.sh` và dán dòng output cuối.
Why: báo "xong" mà không có output gate thì tôi phải tự chạy lại để tin, tức là vẫn phải duyệt từng bước.
How to apply: mọi thay đổi file trong repo; nếu gate đỏ thì báo đỏ, không báo xong.
```

**Bước 3 — Xác nhận memory đã ghi.** Gõ `/memory`, mở thư mục auto memory. Tiêu chí: có `MEMORY.md` chứa một dòng trỏ tới một topic file, topic file có frontmatter `type: feedback` và có đoạn Why. Nếu Claude không ghi vào auto memory (docs nói Claude tự quyết điều gì đáng nhớ), nói rõ "save this to auto memory".

**Bước 4 — Kiểm bằng session mới.** Thoát, mở `claude` lần nữa trong `~/memlab` (session mới, không `--resume`). Gõ: `Thêm một dòng vào README.` Tiêu chí "xong": câu trả lời cuối của agent chứa chuỗi `gate: ok` mà bạn **không** nhắc.

**Bước 5 — Làm memory thối, và bắt nó.** Lưu script ở §3.8 thành `~/memlab-check/check-memory.py` (ngoài repo nháp). Tìm thư mục memory bằng `/memory` (đường dẫn dạng `~/.claude/projects/<project>/memory/`), rồi:

```bash
python3 ~/memlab-check/check-memory.py <thư-mục-memory> ~/memlab; echo "exit=$?"
# Kỳ vọng: "--- 0 vấn đề", exit=0  (nếu có cảnh báo khác, đọc và phân loại như §3.8)

git -C ~/memlab mv scripts/gate.sh scripts/check.sh && git -C ~/memlab commit -qm "rename gate"
python3 ~/memlab-check/check-memory.py <thư-mục-memory> ~/memlab; echo "exit=$?"
# Kỳ vọng: dòng MISSING ...`scripts/gate.sh` không còn tồn tại, exit=1
```

Hai lần chạy với hai kết quả ngược nhau là bằng chứng script **đỏ được** — một thước đo chỉ từng xanh thì chưa chứng minh gì.

**Bước 6 — Sửa đúng chỗ.** Nhờ agent cập nhật memory sang `scripts/check.sh`, chạy lại script, kỳ vọng exit=0.

**Xong khi:** bước 4 có `gate: ok` không cần nhắc; bước 5 có cả exit=0 và exit=1 đúng thứ tự; bước 6 về exit=0.

Muốn đo hiệu quả của memory cho chính bạn: trong một tuần, đếm số lần bạn gõ lại một lời sửa đã từng gõ ở session trước (ghi tay một dòng mỗi lần là đủ). Tuần sau khi đã ghi memory cho các lời sửa đó, đếm lại. Đừng đoán con số trước khi đếm.

---

## 5. Bẫy thường gặp

**Memory chỉ có luật, không có Why.**
Triệu chứng: agent làm đúng ở ca quen, làm sai ở ca hơi khác (luật "đừng nhờ user chạy query" được áp cho cả một lệnh `UPDATE`).
Nguyên nhân gốc: luật một câu không mang tiêu chí; ở ca biên, model chỉ còn cách khớp mặt chữ.
Chặn bằng cơ chế: template memory có ô Why bắt buộc; script §3.8 báo `NOWHY` cho mọi feedback thiếu Why.

**Index phình quá trần, memory mới nhất biến mất.**
Triệu chứng: memory vừa ghi tuần trước, session này agent không biết tới — dù file vẫn nằm trên đĩa.
Nguyên nhân gốc: chỉ 200 dòng / 25KB đầu của `MEMORY.md` được nạp (docs); dòng mới thường nằm cuối; phía đọc không báo lỗi.
Chặn bằng cơ chế: index mỗi memory một dòng, chi tiết để ở topic file; script cảnh báo từ 180 dòng / 23.000 byte, trước khi chạm trần.

**Dùng memory cho thứ phải chặn cứng.**
Triệu chứng: đã ghi "không bao giờ push thẳng main", vẫn có một lần agent push.
Nguyên nhân gốc: memory là context, không phải cấu hình được thực thi (docs).
Chặn bằng cơ chế: permission deny hoặc hook `PreToolUse` ([[ag-08-hook-va-chan-bang-cau-hinh]]); memory chỉ giải thích lý do.

**Ghi trạng thái việc đang làm vào memory.**
Triệu chứng: memory nói "đang chờ review PR migrate", PR đã merge từ ba tuần trước, agent vẫn né đụng vào module đó.
Nguyên nhân gốc: thông tin transient không có ai cập nhật khi nó hết đúng.
Chặn bằng cơ chế: ba câu hỏi ở §3.6 trước khi ghi; trạng thái việc đi vào file brief của việc đó ([[ag-18-brief-la-shared-state]]); script báo `STALE` theo field `modified`.

**Luật cả team chỉ nằm trong auto memory của một người.**
Triệu chứng: agent của bạn chạy đúng gate, agent của đồng nghiệp hoặc agent trên CI thì không.
Nguyên nhân gốc: auto memory là machine-local, không chia sẻ qua máy hay môi trường cloud (docs).
Chặn bằng cơ chế: lời sửa thứ hai lặp lại ở người khác → chuyển nó vào `CLAUDE.md` của project và commit. Docs liệt kê đúng tín hiệu này cho CLAUDE.md: *"Claude makes the same mistake a second time"*, *"A new teammate would need the same context"*.

**Subagent không biết luật mà main agent biết.**
Triệu chứng: main agent luôn chạy gate, nhưng việc giao cho subagent về thì không có output gate.
Nguyên nhân gốc: auto memory của main không nạp vào subagent (docs).
Chặn bằng cơ chế: luật quan trọng nằm trong CLAUDE.md của project hoặc đi kèm trong brief giao việc ([[ag-14-subagent-va-brief]]).

**Memory ngoại lệ mâu thuẫn với luật chung.**
Triệu chứng: cùng một repo, hôm agent tạo nhánh, hôm push thẳng.
Nguyên nhân gốc: hai file nói khác nhau và không file nào ghi đè file nào; docs nói Claude có thể chọn một cách tuỳ ý.
Chặn bằng cơ chế: memory ngoại lệ gọi tên luật nó thay thế và nói vì sao; chạy `/doctor prompt-audit` định kỳ để tìm mâu thuẫn trong các file hướng dẫn.

---

## 6. Chuyển giao

Bài này cho bạn một thứ: **lời sửa một câu, nhớ qua nhiều session**. Nó dừng ở ba giới hạn, và mỗi giới hạn là một bài tiếp theo:

- Memory hợp với luật ngắn. Còn một quy trình nhiều bước (dựng môi trường, chạy A/B trước–sau, chụp bằng chứng) thì nhét vào memory sẽ làm phình index và chỉ được đọc khi agent tự nhớ ra. Docs gợi ý chuyển những thứ đó sang skill — một gói hướng dẫn chỉ nạp khi được gọi hoặc khi liên quan. Đó là [[ag-07-skill-va-slash-command]].
- Memory không chặn được gì. Luật mà vi phạm thì không lùi lại được phải thành cấu hình: [[ag-08-hook-va-chan-bang-cau-hinh]].
- Auto memory gắn với một repo trên một máy. Bài học rút ra ở repo A (một gotcha môi trường, một root cause đã tốn nhiều giờ) không tới được repo B. Bộ nhớ dài hạn xuyên repo, có cả người và agent cùng đọc, là [[ag-22-second-brain]]; việc định kỳ đo lại xem các bản vá memory/hook/skill còn tác dụng không là [[ag-24-harness-tu-cai-tien]].

Ở level 3, thứ bạn bỏ được là **việc dặn lại mỗi session**. Cái giá là một việc mới: bảo trì memory — đọc 8 dòng cảnh báo mỗi tuần thay vì gõ lại 8 lời sửa mỗi ngày.

---

## 7. Tóm tắt

- Mỗi session bắt đầu với context rỗng; chỉ CLAUDE.md/rules (bạn viết) và auto memory (Claude viết) đi qua được. Lời dặn chỉ nói trong chat không đi qua session mới.
- Auto memory: thư mục `~/.claude/projects/<project>/memory/`, index `MEMORY.md` nạp 200 dòng hoặc 25KB đầu, topic file đọc khi cần; machine-local, không nạp vào subagent.
- Memory là context, không phải cấu hình: thứ phải chặn cứng đi vào hook/permission.
- Feedback dùng được = luật + nguyên văn + **Why** + How to apply. Why là thứ quyết định ở ca biên và là thứ cho phép xoá memory về sau.
- Trước khi ghi, hỏi: một tháng sau còn đúng? đọc code có ra? file hướng dẫn đã có? Một memory một ý.
- Bốn kiểu thối: tên đổi, workaround sống lâu hơn nguyên nhân, luật khái quát từ một sự cố, hai file mâu thuẫn — không kiểu nào tự làm test đỏ.
- Kiểm bằng cơ chế: `/context`, `/doctor prompt-audit`, và một script tất định cho ra danh sách ứng viên để người đọc — kiểm cả hai chiều xanh và đỏ.
