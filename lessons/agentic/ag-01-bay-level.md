# Bài 1 — Bảy level dùng AI agent, và bạn đang ở đâu

## 1. Mục tiêu

Sau bài này bạn có thể:

- Kể tên bảy level dùng AI agent, và với mỗi level nói được một câu dạng **"bỏ được việc X, thay bằng cơ chế Y"**.
- Giải thích vì sao các level **cộng dồn chứ không thay thế nhau**, và chỉ ra cụ thể chuyện gì hỏng khi nhảy từ level 2 lên level 6 mà bỏ qua level 4.
- Tính thử được con số "N triệu cached token mỗi ngày" tương đương bao nhiêu request, và dùng phép tính đó để giải thích vì sao token **chỉ là tín hiệu**, không phải thước đo level.
- Tự định vị level của mình bằng một audit một tuần trên ba nguồn: **prompt, commit, task**, kèm lệnh cụ thể.
- Nói được hai hướng đi cho dev khi việc "nhận yêu cầu rồi code" bị agent làm nhanh hơn, và hướng nào course này dạy.
- Dùng bài này làm bản đồ: biết chương nào trong course trả lời câu hỏi nào.

---

## 2. Tình huống

Một team cần đổi giao diện toàn bộ một web app quản trị nội bộ sang một thư viện component UI mới. Đây là kiểu việc mà ai làm frontend cũng biết nó nặng ở đâu: không phải viết code mới, mà là **kiểm lại mọi màn hình** để chắc rằng không màn nào vỡ bố cục, không nút nào biến mất, không form nào submit sai.

Cách làm quen thuộc: mở chat hoặc coding agent, giao từng màn hình, đọc diff từng màn, mở trình duyệt bấm thử, sửa, sang màn tiếp theo. Người làm ngồi ở giữa mọi bước.

Cách mà người phụ trách thật sự đã làm (case thực tế, một lần chạy, không phải benchmark — kể lại theo phát biểu của chính người làm, chưa được xác minh độc lập):

- Viết **một brief** mô tả việc cần làm và cách kiểm.
- Cho agent chạy theo **loop** (vòng lặp tự nhặt việc → làm → kiểm → nhặt việc tiếp), "100% loop" theo lời người làm.
- Một **tester agent** chụp **324 ảnh** màn hình giao diện mới để so với giao diện cũ, mỗi ảnh khoảng **3 phút**.
- Tổng cộng khoảng **2.000 test case**.
- Kết quả: đúng **một lỗi** lọt qua — một modal có kích thước bị nhỏ đi. Lỗi này người phụ trách phải tự test và tự sửa bằng tay.

Riêng phần chụp-và-so ảnh, nếu chạy tuần tự:

```
# Phép tính thử — dùng số của case trên, giả định chạy tuần tự một tester
324 ảnh × 3 phút/ảnh = 972 phút ≈ 16,2 giờ
```

16 giờ chỉ để **nhìn** màn hình, chưa tính sửa. Người làm không ngồi nhìn 16 giờ đó. Nhưng họ vẫn đủ tin kết quả để ship, và họ đúng — chỉ sót một lỗi.

Hai câu hỏi bài này trả lời:

1. Người phụ trách đã **bỏ** những việc gì mà một dev bình thường vẫn làm?
2. Cái gì **thay chỗ** những việc đó, để họ vẫn tin được 2.000 test case mà không tự đọc?

---

## ⏸ Dừng lại — đoán trước

Trong case trên, việc nào người phụ trách **không** làm?

```
(a) Viết brief mô tả việc và cách kiểm
(b) Đọc diff từng màn hình trước khi chấp nhận
(c) Quyết định rằng "đúng" nghĩa là ảnh mới khớp ảnh cũ
(d) Sửa tay lỗi modal cuối cùng
```

Rồi đoán tiếp: nếu bỏ (b) mà **không** có (c), chuyện gì xảy ra?

Đáp án ở mục 3.1.

---

## 3. Cơ chế

### 3.1 Trục của cả thang: bạn bỏ việc gì, và cái gì thay nó

Đáp án ⏸ là **(b)**. Người phụ trách không đọc diff từng màn. (a), (c), (d) họ đều làm — và (a), (c) là thứ khiến bỏ (b) an toàn.

Nếu bỏ (b) mà không có (c), bạn chỉ còn lời agent nói "xong rồi". Lời đó **không phải bằng chứng**: agent báo xong khi nó nghĩ là xong, và cách nó nghĩ có thể khác cách bạn nghĩ. Vì vậy thang level không đo "bạn dùng AI nhiều cỡ nào". Nó đo một thứ hẹp hơn:

> Ở mỗi level, người vận hành **bỏ bớt một việc mà trước đó chỉ mắt người làm được**, và thay việc đó bằng **một cơ chế** (file, lệnh, agent khác, job) đủ để vẫn tin kết quả.

Vài thuật ngữ dùng suốt course, định nghĩa một câu:

- **Agent**: một model ngôn ngữ chạy trong vòng lặp *gọi tool → đọc kết quả → quyết định bước tiếp* cho tới khi nó cho là xong. Phần lý thuyết ở [[aiml-05-agents-tools]].
- **Coding agent**: agent có tool đọc/sửa file và chạy lệnh shell trong repo của bạn — ví dụ Claude Code, Codex CLI.
- **Cơ chế**: thứ chạy được mà không cần bạn nhớ — một file được nạp tự động, một lệnh trả exit code, một agent khác chấm bài, một job chạy theo giờ.
- **Gate**: một lệnh kiểm tra trả đúng/sai (exit code 0 hoặc khác 0), dùng làm điều kiện để coi một việc là xong.
- **Loop**: agent tự lặp *nhặt việc → làm → kiểm → ghi kết quả* nhiều vòng mà không cần bạn gõ prompt mỗi vòng.

Trong case ở §2, cơ chế thay mắt người là: brief (định nghĩa việc), so ảnh (định nghĩa "đúng"), tester agent (người chấm không phải người làm), loop (không cần ai bấm "làm tiếp"). Thiếu bất kỳ cái nào, người phụ trách sẽ phải quay lại ngồi giữa.

### 3.2 Bảy level

Mỗi level dưới đây có bốn dòng: **làm gì**, **bỏ được gì**, **thay bằng cơ chế gì**, và **dấu hiệu bạn đang ở đây**. Phần chi tiết nằm ở chương tương ứng — bài này chỉ vẽ bản đồ.

#### Level 1 — Chat: hỏi đáp và copy-paste

- **Làm gì:** mở ChatGPT/Claude trên web, dán đoạn code hoặc lỗi, nhận câu trả lời, copy về editor.
- **Bỏ được gì:** chưa bỏ gì — đây là điểm xuất phát.
- **Cơ chế:** không có. Model không thấy repo, không chạy được lệnh, nên mọi ngữ cảnh đều phải đi qua tay bạn, và mọi kết quả đều phải được bạn chạy thử.
- **Dấu hiệu:** bạn thường dán lại cùng một đoạn mô tả kiến trúc ở mỗi cuộc chat mới; bạn là người chạy test, không phải model.
- **Chương:** [[ag-02-chat-va-gioi-han]] — chat giỏi tới đâu, context window là gì, và vì sao copy-paste là trần.

#### Level 2 — Agent trong repo, duyệt từng bước

- **Làm gì:** chạy coding agent ngay trong repo. Theo tài liệu, Claude Code là *"an agentic coding tool that reads your codebase, edits files, runs commands"* (code.claude.com/docs/en/overview). Agent tự đọc file, tự sửa, tự chạy test.
- **Bỏ được gì:** bỏ copy-paste. Bạn không còn là đường ống chuyển ngữ cảnh.
- **Cơ chế:** vòng lặp tool của agent + git làm lưới an toàn (commit nhỏ, đọc diff, hoàn tác được).
- **Dấu hiệu:** bạn vẫn bấm duyệt gần như mọi lần agent muốn sửa file hay chạy lệnh, và đọc từng diff trước khi đi tiếp.
- **Chương:** [[ag-03-coding-agent-hoat-dong]] (vòng lặp tool, permission, sandbox), [[ag-04-context-va-file-huong-dan]] (context và `CLAUDE.md`/`AGENTS.md`), [[ag-05-checkpoint-tung-buoc]] (git và chi phí thật của việc duyệt từng bước).

#### Level 3 — Dạy agent cách mình làm việc

- **Làm gì:** ghi lại convention, quy trình, lệnh hay dùng vào những chỗ agent tự đọc.
- **Bỏ được gì:** bỏ việc dặn lại cùng một điều ở mỗi session.
- **Cơ chế:** file hướng dẫn nạp mỗi session (theo docs, `CLAUDE.md` là file *"Claude Code reads at the start of every session"*; Codex đọc `AGENTS.md` từ thư mục gốc repo đi xuống thư mục hiện tại), memory, **skill** (một quy trình đóng gói thành file để agent gọi khi cần), **hook** (lệnh shell chạy tự động trước/sau một hành động của agent), **MCP server** (chương trình cung cấp tool để agent nối với hệ thống bên ngoài như Jira, Slack, Google Drive).
- **Dấu hiệu:** khi agent làm sai một thói quen của team, bạn sửa file hướng dẫn hoặc skill, chứ không chỉ sửa câu trả lời.
- **Chương:** [[ag-06-memory-va-feedback]], [[ag-07-skill-va-slash-command]], [[ag-08-hook-va-chan-bang-cau-hinh]], [[ag-09-mcp]].

#### Level 4 — Kiểm việc mà không đọc từng dòng

- **Làm gì:** định nghĩa "xong" bằng lệnh chạy được, và để một agent khác chấm.
- **Bỏ được gì:** bỏ việc đọc code thủ công như cách duy nhất để tin kết quả.
- **Cơ chế:** done-criteria kiểm được, gate (test, build, lint, so ảnh), **verifier** — một agent độc lập, context sạch, không được sửa file, chỉ trả PASS/FAIL kèm bằng chứng.
- **Dấu hiệu:** câu hỏi đầu tiên của bạn với một task là "lệnh nào chứng minh nó xong?", không phải "để tôi xem code".
- **Chương:** [[ag-10-done-criteria-va-gate]], [[ag-11-gate-xanh-gia]] (khi gate xanh mà không chứng minh gì), [[ag-12-verifier-doc-lap]], [[ag-13-kiem-ui-bang-anh]] (đây là chương mổ xẻ case 324 ảnh).

#### Level 5 — Nhiều agent song song

- **Làm gì:** chia một việc lớn cho nhiều agent chạy cùng lúc, mỗi agent một phần.
- **Bỏ được gì:** bỏ làm tuần tự.
- **Cơ chế:** **subagent** (agent con được agent chính giao việc, có context riêng, trả về bản tóm tắt), **worktree** (một thư mục làm việc riêng của cùng một repo git, để các agent không ghi đè file của nhau), brief viết ra file dùng chung, và chấm chéo giữa hai họ model khác nhau.
- **Dấu hiệu:** bạn viết brief cho agent như viết cho đồng nghiệp mới, và việc của bạn là đọc kết quả tổng hợp chứ không phải làm từng phần.
- **Chương:** [[ag-14-subagent-va-brief]], [[ag-15-worktree-va-xung-dot]], [[ag-16-hai-ho-model]], [[ag-17-soat-cheo-noi-dung]].

#### Level 6 — Loop: một brief, agent tự chạy

- **Làm gì:** viết một file brief chứa danh sách task + tiêu chí xong; một vòng lặp tự nhặt task, làm, verify, commit, rồi nhặt tiếp.
- **Bỏ được gì:** bỏ checkpoint từng prompt. Bạn không gõ "làm tiếp" nữa.
- **Cơ chế:** **state bền** ngoài context (file brief trên đĩa, sống qua restart), điều kiện dừng, gate, cách biết việc chạy nền đã xong. Claude Code có sẵn `/loop` để *"repeat a prompt within a CLI session"* (code.claude.com/docs/en/overview, mục Schedule recurring tasks).
- **Dấu hiệu:** bạn bỏ máy đi họp, quay lại thấy một loạt commit đã qua gate.
- **Chương:** [[ag-18-brief-la-shared-state]], [[ag-19-vong-lap-nhat-task]], [[ag-20-viec-nen-va-ack]], [[ag-21-loop-la-he-phan-tan]].

#### Level 7 — Hệ thống tự vận hành 24/7

- **Làm gì:** agent làm việc khi bạn không ngồi máy — đọc kênh chat, viết digest hằng ngày, tự retro chính bộ công cụ của nó.
- **Bỏ được gì:** bỏ việc tự nhớ và tự khởi động. Bạn không còn là người bấm nút bắt đầu.
- **Cơ chế:** **second brain** (kho ghi chú dài hạn mà cả người và agent cùng tra), job định kỳ (docs liệt kê Routines chạy trên cloud và Desktop scheduled tasks chạy trên máy), bot có danh tính riêng, và **harness tự retro** — tự đo bản vá cũ, đề xuất một bản vá mới, người duyệt.
- **Dấu hiệu:** sáng ra bạn đọc thứ agent đã làm đêm qua, và việc của bạn là duyệt, không phải khởi động.
- **Chương:** [[ag-22-second-brain]], [[ag-23-job-dinh-ky-va-bot]], [[ag-24-harness-tu-cai-tien]], [[ag-25-tu-dong-hoa-co-gioi-han]] (bài cuối: chọn việc nào tự động, chỗ nào phải dừng, và lộ trình lên level kế tiếp).

### 3.3 Vì sao không nhảy cóc được

Các level **cộng dồn**. Level 6 không xoá level 2; nó chạy level 2 nhiều lần mà không có bạn ngồi giữa. Hệ quả: mọi điểm yếu của level dưới **được nhân lên** ở level trên.

Lấy ví dụ nhảy thẳng từ level 2 lên level 6, bỏ qua level 4:

1. Ở level 2, cơ chế duy nhất bảo đảm chất lượng là **mắt bạn đọc diff**.
2. Lên level 6, bạn bỏ việc đọc diff — đó là toàn bộ ý nghĩa của loop.
3. Không có level 4, không có gì thay mắt bạn. Loop chỉ còn điều kiện dừng là "agent nói xong".
4. Kết quả: loop vẫn chạy đều, commit vẫn ra đều, nhưng tốc độ ra lỗi bằng tốc độ ra commit.

Một bản guide nội bộ về AI engineering mà tác giả course từng dùng có câu tóm đúng hiện tượng này (kinh nghiệm thực tế): *prompt tệ nằm trong một graph 20 agent chỉ có nghĩa là trả gấp nhiều lần token để nhận kết quả sai nhanh hơn*. Và quy tắc đi kèm: **đừng leo level khi level dưới chưa chắc**.

Ba ràng buộc cụ thể giữa các level:

| Muốn lên | Cần có sẵn ở level dưới | Vì sao |
|---|---|---|
| Level 5 (song song) | Level 3: file hướng dẫn | Mỗi agent con nạp lại file hướng dẫn; thiếu nó thì N agent làm theo N kiểu khác nhau |
| Level 6 (loop) | Level 4: gate chạy được | Loop bỏ mắt người; gate là thứ duy nhất còn lại để phát hiện sai |
| Level 7 (24/7) | Level 6: state bền + điều kiện dừng | Job chạy lúc bạn ngủ; không có state bền thì mỗi lần chạy bắt đầu lại từ số 0 |

### 3.4 Token chỉ là tín hiệu — và tính thử vì sao

Một người trong giới dev từng phát biểu ngưỡng sau (**phát biểu của một người, chưa xác minh**): dev nào dùng **dưới 200 triệu cached token hoặc dưới 1 triệu non-cache token trong 24 giờ** thì nhiều khả năng vẫn đang duyệt từng prompt và đọc code thủ công. Cùng người đó nói rõ: *token usage không phải là tất cả, nó là tín hiệu để biết có dùng hay không*; muốn biết đang ở level nào phải audit prompt + commit + task.

Con số này đáng dùng như **tín hiệu**, không phải **thước đo**. Để thấy vì sao, phải hiểu cached token đến từ đâu.

**Cơ chế (dữ kiện, theo docs):** Claude Code *"sends your full conversation with every request"*, và mỗi lần agent dùng tool nó gửi thêm một request mang kết quả tool đó; với prompt caching, phần lịch sử được đọc lại *"at the cached token rate"* (code.claude.com/docs/en/costs, mục *Why usage climbs in a long session*). Nghĩa là cached token ≈ **kích thước context × số request**.

Phép tính thử (giả định kích thước context, không phải số đo):

```
# Bao nhiêu request thì đạt 200M cached token / 24h?
context trung bình 50k token   → 200.000.000 / 50.000  = 4.000 request
context trung bình 100k token  → 200.000.000 / 100.000 = 2.000 request
context trung bình 150k token  → 200.000.000 / 150.000 ≈ 1.333 request

# Nếu mỗi request cần một người bấm duyệt
2.000 lần duyệt × 15 giây = 30.000 giây ≈ 8,3 giờ
2.000 lần duyệt × 30 giây = 60.000 giây ≈ 16,7 giờ
```

Đây là phần đúng của ngưỡng: ở cỡ vài nghìn request mỗi ngày, **một người không thể đứng duyệt từng bước**. Nếu số của bạn ở cỡ đó, gần như chắc chắn có thứ gì đó chạy mà không cần bạn bấm.

Còn đây là phần sai nếu dùng nó làm thước đo:

- **Token cao mà không lên level.** Docs liệt kê các nguồn đốt token khi bạn không làm gì: một scheduled task *"fires on its interval even while the session is idle, sending your full context each time"*; một session mở cả ngày làm mỗi câu hỏi một dòng *"still draws usage for the whole conversation"*. Một session 150k context để quên với `/loop` chạy vài phút một lần có thể đốt rất nhiều cached token mà không tạo ra commit nào qua gate.
- **Token thấp mà level cao.** Một loop dùng subagent context nhỏ, model rẻ, task gọn có thể ra nhiều commit đã verify với ít token hơn một người chat dài lê thê.
- **Không có chuẩn so sánh.** Docs cho một mốc tham khảo khác hẳn chiều: trung bình doanh nghiệp *"around \$13 per developer per active day"*, 90% người dùng dưới \$30/ngày. Mốc đó nói về chi phí, không nói về level.

Kết luận làm việc: dùng token để **đặt câu hỏi** ("vì sao số của mình thấp/cao thế?"), rồi trả lời câu hỏi bằng audit ở §3.5.

### 3.5 Audit thật: prompt, commit, task

Level đo bằng **việc bạn đã bỏ**, nên phải nhìn vào chỗ việc đó để lại dấu vết. Có ba chỗ:

**Prompt** — bạn gõ gì cho agent. Nếu phần lớn prompt là "ok", "tiếp đi", "sửa lại chỗ này", bạn đang là người checkpoint từng bước (level 2). Nếu prompt là một brief dài giao một cụm việc, rồi im lặng tới khi có kết quả, bạn đã bỏ checkpoint.

**Commit** — ai tạo ra commit, và cái gì chứng minh nó đúng. Commit do agent tạo nhưng bạn đọc từng dòng trước khi commit: level 2. Commit đi qua một gate tự động trước khi được tạo: level 4 trở lên. Commit được tạo khi bạn không ngồi máy: level 6 trở lên.

**Task** — ai quyết định task "xong". Nếu câu trả lời luôn là "tôi, sau khi xem code", bạn ở level ≤ 3 dù có cài bao nhiêu skill. Nếu câu trả lời là "lệnh X trả 0 và verifier trả PASS", bạn ở level 4 trở lên.

Ba nguồn này bổ sung cho nhau vì mỗi nguồn hỏng theo một kiểu: prompt cho biết bạn **có ngồi giữa không**, commit cho biết **có gì thay bạn không**, task cho biết **bạn có tin cái thay đó không**. Một người có thể không gõ "tiếp đi" lần nào (prompt đẹp) nhưng vẫn đọc lại mọi diff trước khi merge (task xấu) — họ chưa bỏ được gì cả, chỉ dời việc đọc sang cuối.

### 3.6 Dev "nhận yêu cầu rồi code" đứng ở đâu

Cùng phát biểu ở §3.4 còn một ý (quan điểm của một người, nêu để bàn chứ không phải dữ kiện): coding agent đã đủ mạnh để người dùng mô tả mơ hồ mà nó vẫn hiểu, nên người không làm kỹ thuật — vốn hiểu rõ cái họ cần — trở nên rất mạnh; còn dev nếu chỉ **nhận yêu cầu rồi code** thì agent đã làm xong phần đó trước. Theo người đó, còn hai hướng:

1. **Đi rất sâu vào agentic** — vận hành agent ở level cao, thậm chí theo hướng nghiên cứu AI.
2. **Đi sang phía business** — hiểu người dùng cần gì, thị trường có vấn đề gì, có "taste", có kỹ năng research.

Lý do cơ chế khiến ý này đáng nghiêm túc: ở level 6–7, đầu vào của cả hệ thống là **brief**. Agent làm đúng brief rất nhanh. Vậy giá trị của người nằm ở hai đầu: viết đúng cái cần làm (hướng 2) và dựng cơ chế để tin được kết quả (hướng 1). Phần ở giữa — dịch yêu cầu thành code — là phần agent làm tốt nhất.

Course này dạy hướng 1. Nhưng bạn sẽ thấy từ level 5 trở đi, brief tệ làm hỏng mọi thứ phía sau, nên hướng 2 không tách rời được: viết brief tốt chính là hiểu việc ở mức business.

### 3.7 Bảng tổng hợp

Bảng này để tra lại, đứng sau phần giải thích ở trên:

| Level | Bỏ được | Thay bằng cơ chế | Câu hỏi tự kiểm |
|---|---|---|---|
| 1 Chat | — | — | Model có thấy repo không? |
| 2 Agent, duyệt từng bước | copy-paste | vòng lặp tool + git | Bạn có duyệt mọi lần sửa file không? |
| 3 Dạy agent | dặn lại mỗi session | file hướng dẫn, memory, skill, hook, MCP | Lần cuối sửa một thói quen sai, bạn sửa ở đâu? |
| 4 Kiểm không đọc dòng | đọc code thủ công | done-criteria, gate, verifier | Lệnh nào chứng minh task xong? |
| 5 Song song | làm tuần tự | subagent, worktree, brief, chấm chéo | Bạn có giao việc cho nhiều agent cùng lúc không? |
| 6 Loop | checkpoint từng prompt | brief bền + vòng nhặt-làm-verify-commit | Có commit nào được tạo khi bạn không ngồi máy không? |
| 7 Tự vận hành | tự nhớ, tự khởi động | second brain, job định kỳ, bot, retro | Sáng nay bạn đọc gì do agent làm đêm qua? |

---

## 4. Làm thử

Bài thực hành: **tự định vị bằng một audit một tuần**. Làm trên repo bạn code nhiều nhất, khoảng 45–60 phút.

### 4.1 Tạo file audit

Tạo `level-audit.md` ở ngoài repo (đây là ghi chép cá nhân, không commit):

```markdown
# Level audit — tuần <yyyy-mm-dd>

## Token (tín hiệu, không phải điểm)
- 24h gần nhất: <số từ /usage>
- 7 ngày gần nhất: <số từ /usage>
- Câu hỏi token gợi ra: <vì sao cao/thấp?>

## Prompt (20 prompt gần nhất)
| Loại | Đếm |
|---|---|
| Checkpoint ("ok", "tiếp", "đúng rồi", "sửa chỗ này") | |
| Giao việc mới có tiêu chí xong | |
| Giao việc mới không có tiêu chí xong | |
| Dặn lại một điều đã từng dặn | |

## Commit (7 ngày)
- Tổng commit của tôi: 
- Commit có agent tham gia: 
- Commit qua gate tự động trước khi tạo: 
- Commit tạo khi tôi không ngồi máy: 

## Task (10 task gần nhất)
| Task | Ai quyết định "xong" | Bằng chứng | Level |
|---|---|---|---|

## Kết luận
- Level hiện tại: 
- Việc tôi vẫn làm bằng tay mà level kế tiếp bỏ được: 
- Cơ chế cần dựng để bỏ việc đó: 
```

### 4.2 Lấy số token

Trong Claude Code, chạy `/usage`. Theo docs, trên gói Pro/Max/Team/Enterprise, màn hình này có phần breakdown; bấm `d` hoặc `w` để chuyển giữa **24 giờ gần nhất** và **7 ngày gần nhất**. Số được tính *"from local session history on this machine"*, nên không gồm máy khác hay claude.ai (code.claude.com/docs/en/costs).

Thêm một nguồn định tính: `/insights` phân tích các session gần đây trên máy và viết báo cáo HTML về bạn làm gì, chỗ nào hay bị hiểu nhầm (cùng trang docs). Lưu ý `/insights` cũng tốn token của bạn.

Nếu bạn dùng Codex CLI hoặc công cụ khác: ghi "không có số" và đi tiếp. Token là phần ít quan trọng nhất của audit.

### 4.3 Đếm commit

Chạy trong repo (lệnh git thuần, chạy được ở mọi máy):

```bash
# Tổng commit của bạn trong 7 ngày
git log --since="7 days ago" --author="$(git config user.email)" --oneline | wc -l

# Commit có trailer đồng tác giả là AI (nếu công cụ của bạn thêm trailer này)
git log --since="7 days ago" --author="$(git config user.email)" -i --grep="Co-Authored-By" --oneline | wc -l

# Commit tạo ngoài giờ bạn ngồi máy (sửa khung giờ cho đúng lịch của bạn)
git log --since="7 days ago" --author="$(git config user.email)" \
  --date=format:'%H' --pretty='%ad %h %s' | awk '$1 < 8 || $1 >= 20'
```

Hai lưu ý để không đọc sai số:

- Trailer đồng tác giả phụ thuộc cấu hình công cụ. Số 0 ở dòng thứ hai có thể nghĩa là "không dùng agent", cũng có thể nghĩa là "công cụ không ghi trailer". Kiểm bằng cách mở một commit bạn **biết chắc** agent đã tạo, xem có trailer không, trước khi tin con số.
- "Commit qua gate tự động" không lấy được từ git log. Tự đánh dấu khi đi qua danh sách commit: commit nào có lệnh test/build/lint chạy **trước khi** commit được tạo, mà không phải do bạn gõ?

### 4.4 Đọc 20 prompt

Mở lại các session gần đây (trong Claude Code, `/resume` liệt kê session cũ để mở lại). Lấy 20 prompt gần nhất bạn gõ, xếp vào bốn loại trong bảng ở 4.1. Không cần chính xác tuyệt đối — mục đích là thấy **loại nào chiếm phần lớn**.

### 4.5 Chấm 10 task

Liệt kê 10 task bạn làm xong gần nhất (ticket, PR, hay một việc nhỏ cũng được). Với mỗi task ghi:

- **Ai quyết định "xong"**: tôi / test / verifier / reviewer khác.
- **Bằng chứng**: tên lệnh, link CI, hay "tôi xem thấy ổn".
- **Level** theo bảng §3.7: chọn level **cao nhất** mà task đó thật sự đạt, xét theo câu hỏi tự kiểm.

### 4.6 Kết luận

Quy ước của bài này (không phải chuẩn công nghiệp): **level hiện tại = level mà ít nhất một nửa số task trong 4.5 đạt được**. Không lấy task tốt nhất — một lần chạy loop thành công không có nghĩa bạn đang làm việc ở level 6.

Điền hai dòng cuối: việc bạn vẫn làm bằng tay mà level kế tiếp bỏ được, và cơ chế cần dựng. Hai dòng này là đầu vào cho bài capstone [[ag-25-tu-dong-hoa-co-gioi-han]].

**Tiêu chí xong (kiểm được):**

- `level-audit.md` có đủ năm mục, mục Commit có ít nhất ba số lấy từ lệnh ở 4.3.
- Bảng Task có đủ 10 dòng, mỗi dòng có cột Bằng chứng không để trống.
- Dòng "Level hiện tại" là một số từ 1–7, và nhất quán với quy ước ở 4.6 khi đếm lại bảng Task.
- Dòng "Cơ chế cần dựng" gọi tên một cơ chế cụ thể (một file, một lệnh, một agent), không phải "cẩn thận hơn".

---

## 5. Bẫy thường gặp

### 🪤 Bẫy 1: Lấy token làm KPI

- **Triệu chứng:** team đặt mục tiêu "mỗi người X triệu token/ngày", số token tăng, số lỗi lên production không giảm.
- **Nguyên nhân gốc:** token đo **lượng request × kích thước context** (§3.4), không đo việc đã bỏ. Khi một con số thành mục tiêu, người ta tối ưu con số — một session mở cả ngày với `/loop` đạt KPI mà không ra commit nào qua gate.
- **Chặn bằng cơ chế:** báo cáo token **luôn đi cặp** với số commit đã qua gate trong cùng khoảng thời gian (lệnh ở 4.3). Token tăng mà commit-qua-gate không tăng là tín hiệu đốt, không phải tín hiệu lên level.

### 🪤 Bẫy 2: Nhảy lên loop khi chưa có gate

- **Triệu chứng:** dựng xong loop, một đêm ra hàng chục commit, sáng ra phải revert gần hết.
- **Nguyên nhân gốc:** loop bỏ mắt người; không có gate thì không còn gì phát hiện sai (§3.3). Tốc độ ra lỗi bằng tốc độ ra commit.
- **Chặn bằng cơ chế:** điều kiện để một task được đưa vào loop là nó có **một lệnh gate ghi sẵn trong brief** và lệnh đó đã từng chạy đỏ trên code sai. Không có lệnh → task không vào loop. Cách viết lệnh như vậy ở [[ag-10-done-criteria-va-gate]]; vì sao "đã từng đỏ" quan trọng ở [[ag-11-gate-xanh-gia]].

### 🪤 Bẫy 3: Chấm level theo công cụ đã cài

- **Triệu chứng:** "mình cài 5 MCP server và 10 skill, chắc level 3–4 rồi", nhưng vẫn đọc từng diff trước khi commit.
- **Nguyên nhân gốc:** level đo bằng **việc đã bỏ**, không bằng công cụ có sẵn. Một skill không bao giờ được gọi, hay một hook không chặn gì, không thay được việc nào của bạn.
- **Chặn bằng cơ chế:** audit theo task (4.5), không theo cấu hình. Mỗi công cụ trong cấu hình phải trỏ được tới ít nhất một task trong tuần mà nó đã thay bạn làm; không trỏ được thì nó không tính.

### 🪤 Bẫy 4: Nghĩ level cao là hết việc thủ công

- **Triệu chứng:** sau khi loop chạy ổn, không ai mở sản phẩm ra dùng thử nữa; lỗi kiểu "nhìn là thấy" lọt tới người dùng.
- **Nguyên nhân gốc:** cơ chế chỉ bắt được thứ nó được thiết kế để bắt. Case ở §2: 324 ảnh và ~2.000 test case vẫn để lọt một lỗi kích thước modal, và người phải tự tìm, tự sửa. Một ví dụ khác cùng kiểu (kinh nghiệm thực tế từ second brain của tác giả): kho ghi chú có job tự sinh note mỗi ngày nên phía **ghi** rất mạnh, nhưng khi đo phía **đọc** thì chỉ có 13 lượt tra từ trước tới lúc đo — level 7 về mặt cơ chế, mà gần như không ai dùng tới.
- **Chặn bằng cơ chế:** mỗi cơ chế tự động phải có **một số đo phía dùng** (lỗi lọt tới người dùng, số lượt tra, số kết quả được trích dẫn) và một lượt kiểm tay định kỳ có lịch. Cách đo phía dùng ở [[ag-22-second-brain]]; vì sao so ảnh vẫn sót ở [[ag-13-kiem-ui-bang-anh]].

### 🪤 Bẫy 5: Áp một level cho mọi việc

- **Triệu chứng:** đã quen loop, đưa cả việc chạy migration dữ liệu production vào loop; một lần chạy sai không hoàn tác được.
- **Nguyên nhân gốc:** level là **cách làm cho từng loại việc**, không phải danh hiệu của người. Việc đọc, hoàn tác được, lặp nhiều lần hợp với level cao; việc ghi vào hệ thống thật, không hoàn tác được thì cái giá của một lần sai lớn hơn mọi thời gian tiết kiệm.
- **Chặn bằng cơ chế:** phân loại việc theo **đọc/ghi** và **hoàn tác được/không** trước khi chọn level; việc ghi không hoàn tác được luôn có một bước người duyệt được cấu hình (permission, không phải lời dặn). Cách chọn ở [[ag-25-tu-dong-hoa-co-gioi-han]]; cách chặn bằng cấu hình ở [[ag-08-hook-va-chan-bang-cau-hinh]].

---

## 6. Chuyển giao

Bài này là bản đồ. Đọc theo thứ tự nếu bạn đang ở level 1–2; nhảy tới chương của **level kế tiếp** của bạn nếu audit ở §4 cho kết quả cao hơn — nhưng đọc lại §3.3 trước khi nhảy: level dưới chưa chắc thì level trên chỉ nhân lỗi lên.

Bài kế tiếp, [[ag-02-chat-va-gioi-han]], ở lại level 1 để làm rõ **trần** của nó: model không thấy repo, context window giới hạn bao nhiêu trang code, và khi nào chat vẫn là công cụ đúng. Hiểu trần đó là lý do để lên level 2 — nơi bạn bỏ được việc đầu tiên trong thang: làm đường ống copy-paste giữa model và repo.

Câu hỏi mang theo suốt course, ở mọi chương:

> Ở đây tôi bỏ được việc gì, cơ chế nào thay nó, và làm sao tôi biết cơ chế đó đỏ được khi có sai?

---

## 7. Tóm tắt

- Thang bảy level đo một thứ: ở mỗi level, người vận hành **bỏ một việc mà trước đó chỉ mắt người làm được** và thay bằng **một cơ chế** đủ để vẫn tin kết quả.
- Bảy level: chat → agent duyệt từng bước → dạy agent (file hướng dẫn, skill, hook, MCP) → kiểm không đọc dòng (gate, verifier) → song song (subagent, worktree) → loop (brief bền) → tự vận hành 24/7 (second brain, job, retro).
- Các level **cộng dồn**: loop không có gate chỉ làm sai nhanh hơn. Đừng leo khi level dưới chưa chắc.
- Ngưỡng "200M cached / 1M non-cache token mỗi 24h" là phát biểu của một người, chưa xác minh. Cached token ≈ context × số request; ở cỡ vài nghìn request/ngày, một người không thể duyệt từng bước — đó là phần đúng. Nhưng token cao vẫn có thể là đốt suông, nên chỉ dùng nó làm tín hiệu.
- Level thật đo bằng audit **prompt** (có ngồi giữa không), **commit** (có gì thay bạn không), **task** (bạn có tin cái thay đó không).
- Case đổi giao diện: một brief + loop, 324 ảnh, ~2.000 test case, sót đúng một lỗi modal (case thực tế, một lần chạy). Level cao không xoá việc thủ công — nó dồn việc thủ công vào chỗ cơ chế chưa phủ.
- Khi agent làm tốt phần "nhận yêu cầu rồi code", giá trị của dev dồn về hai đầu: viết đúng việc cần làm, và dựng cơ chế để tin kết quả. Course này dạy đầu thứ hai.
