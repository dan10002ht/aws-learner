# Bài 22 — Second brain: bộ nhớ dài hạn cho cả người và agent

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng một second brain dạng thư mục markdown trong git theo **PARA + Zettelkasten**: biết note nào vào thư mục nào, vì sao note phải **nguyên tử** (một ý một file), và vì sao **MOC** thay được cây thư mục sâu.
- Viết `summary:` cho một note sao cho **cả người lẫn agent tra lại được**: một câu ≤ 160 ký tự, mở bằng **triệu chứng** theo lời người gặp lỗi, rồi mới tới cơ chế.
- Đo một brain bằng **bốn số phía đọc tách rời** (với tới, ra cơ chế, được dùng, note chết) và từ chối kết luận khi mẫu dưới ngưỡng, thay vì đếm số note.
- Phân loại một lượt tra thành `co-co-che` / `chi-inbox` / `chi-nhat-ky` / `truot`, và nói được vì sao cờ "có trả về file" che mất knowledge gap.
- Cắm brain vào chỗ làm việc bằng hook `UserPromptSubmit` tra theo lời mô tả triệu chứng, với ba cổng chống ồn, và chứng minh hook im đúng lúc lẫn nói đúng lúc.
- Phân biệt **lỗi truy hồi** (brain có mà không tìm ra) với **knowledge gap** (brain chưa có), và biết mỗi loại sửa ở đâu.

---

## 2. Tình huống

Một dev làm vài app SaaS thương mại điện tử dựng cho mình một wiki markdown, gọi là "brain". Sau khoảng ba tháng, bốn job chạy hằng ngày tự sinh note từ git log, transcript các phiên agent và thread support. Brain có **487 note**. Mọi số liệu trông khoẻ: job chạy đều, note tăng mỗi ngày, index dài ra.

Rồi dev hỏi một câu đơn giản: *"brain có thật sự giúp được task nào không?"* — và lần đầu tiên đi đo thay vì cảm nhận. Kết quả (case thực tế, đo một lần cuối tháng 9, không phải benchmark):

- Toàn bộ lịch sử: **13 lượt tra**. Một tháng trước đó, cả hai tháng chỉ có 5 lượt.
- **456/487 note (93%)** chưa từng được tra ra lần nào.
- Đọc lại 71 transcript phiên làm việc trên các repo app: chỉ **9/71 phiên** từng mở một note brain.
- Có một hook `SessionStart` đã được cắm để tự tra brain lúc mở phiên. Nó tra bằng **tên nhánh**. Từ khi cắm, nó bắn **3 lần**, và **cả 3 lần chuyển được 0 tri thức** — toàn trả về runbook chung hoặc nhật ký ngày.

Điều lạ: cùng engine tra cứu đó, khi được đưa **câu mô tả triệu chứng** của sáu ca support đã đóng (đáp án biết trước), xếp đúng note đáp án ở hạng 1 cả **6/6** ca.

Tri thức có sẵn. Câu hỏi sai, và hỏi sai lúc. Đây là cái bẫy của level 7: ghi thì dễ tự động hoá, còn **đọc** — đưa đúng note tới đúng phiên làm việc, đúng lúc — thì không tự xảy ra. Một brain chỉ khoẻ phía ghi là một kho lưu trữ, không phải trí nhớ.

---

## ⏸ Dừng lại — đoán trước

Với số liệu trên — 487 note, 13 lượt tra, 93% note chưa từng được tra ra — kết luận nào đúng?

```
(a) Phần lớn note vô dụng, nên xoá bớt để brain gọn lại.
(b) Tìm kiếm bằng từ khoá quá kém, phải chuyển sang vector DB/embedding.
(c) Con số 93% không nói gì về chất lượng note; nó đo việc brain được hỏi quá ít.
(d) Brain ổn, vì 31 note được tra ra đều đúng.
```

Đáp án và phép tính nằm ở §3.4.

---

## 3. Cơ chế

### 3.1 Second brain khác auto memory ở chỗ nào

[[ag-06-memory-va-feedback]] đã dạy auto memory và `CLAUDE.md`: thứ nạp vào đầu mỗi session của **một repo**. Theo docs Claude Code, auto memory là machine-local, gắn với từng project (nguồn: https://code.claude.com/docs/en/memory). Nó hợp với luật ngắn kiểu "lệnh đọc thì tự chạy".

Second brain giải quyết ba thứ memory không làm được:

| Nhu cầu | Auto memory | Second brain |
|---|---|---|
| Bài học ở repo A dùng được ở repo B | không — mỗi project một thư mục | có — một repo riêng, tra từ mọi nơi |
| Người cũng đọc được, lướt được | file nhỏ, không có bản đồ | index + MOC cho người, summary cho LLM |
| Lưu **vì sao** đã quyết định, kèm ngày xem lại | không có cấu trúc | `70-decisions/` bắt buộc Why + Tradeoff + `review:` |
| Ghi lại root cause của một sự cố mất nhiều giờ | phình index, bị cắt ở trần nạp | một note nguyên tử, tra khi cần |

Cái giá: brain **không tự nạp**. Memory nạp vào context mỗi session; brain thì phải có ai đó (người, agent, hoặc hook) chủ động hỏi. Toàn bộ bài này xoay quanh hệ quả của một câu đó.

### 3.2 Cấu trúc: PARA để biết đặt đâu, Zettelkasten để biết viết thế nào

**PARA** (Projects / Areas / Resources / Archive) là cách chia theo **mức hành động**: việc có hạn chót, trách nhiệm duy trì, chủ đề tham khảo, và thứ đã xong. **Zettelkasten** là cách viết theo **ý**: mỗi note một ý, nối nhau bằng link. Hai cái bổ sung nhau: PARA trả lời "file này nằm đâu", Zettelkasten trả lời "file này chứa gì". Bố cục dưới đây là bố cục đã chạy thực tế (kinh nghiệm thực tế, một brain cá nhân):

```
brain/
├── CLAUDE.md          # luật bảo trì cho agent: layer nào được sửa, frontmatter, khi nào lint
├── index.md           # bản đồ MỘT màn hình, trỏ tới các MOC
├── 00-inbox/          # capture thô + đề xuất của job tự động — chưa ai duyệt
├── 10-projects/       # việc có mục tiêu + hạn chót; xong thì chuyển 40-archive/
├── 20-areas/          # trách nhiệm lâu dài, không có "xong"
├── 30-resources/      # chủ đề đang học
├── 40-archive/
├── notes/             # Zettelkasten: note nguyên tử + MOC (moc-*.md) + nhật ký ngày (digest-*)
├── 70-decisions/      # quyết định: BẮT BUỘC Why + Tradeoff + ngày review
├── feedback/          # lời sửa nhận được: Why + How to apply
├── sources/           # nguồn thô, BẤT BIẾN — chỉ đọc, chỉ trích
└── bin/               # script tra, đo, lint
```

Ba layer không được trộn: `sources/` là bằng chứng gốc (không bao giờ sửa), wiki là tri thức đã chín (agent được sửa), `CLAUDE.md` + `index.md` là điều hướng. Lý do giữ `sources/` bất biến: khi một note tổng hợp sai, bạn cần quay về đúng chữ gốc để biết sai từ đâu. Note tổng hợp vì vậy có field `source:`; không chắc thì ghi "chưa xác minh" — nếu không, một suy đoán viết một lần sẽ đóng băng thành "sự thật" mà không ai nhớ nó từng là suy đoán.

**Note nguyên tử** (atomic note) là note chứa đúng một ý, đủ nhỏ để nhiều note khác link tới, đủ đầy để đọc độc lập. Dấu hiệu cần tách: tiêu đề phải dùng chữ "và" để nối hai chủ đề. Tiêu đề viết như **một câu khẳng định** (`do-phia-doc-phai-do-chat-luong`, không phải `ghi-chu-ve-do-luong`), vì tên file chính là slug của link `[[...]]` và cũng là chỗ công cụ tra cứu chấm điểm cao nhất.

Vì sao không lồng thư mục sâu: link trỏ bằng **tên file**, không bằng đường dẫn, nên thêm tầng thư mục chỉ dài đường dẫn ra chứ không thêm thông tin; còn script đọc brain (job tổng hợp tuần, job đọc git log) thường chỉ glob một hai tầng. Luật thực tế: chỉ cho `10-projects/<tên>/` một tầng khi project đã có từ 2–3 file riêng.

### 3.3 Frontmatter và summary: giao diện tra cứu của note

Mỗi note mở bằng một khối frontmatter nhẹ:

```yaml
---
type: note            # project | area | resource | note | feedback | decision | daily
title: Webhook bị gửi lại và tạo bản ghi trùng vì handler xử lý đồng bộ
summary: Webhook bị gửi lại nhiều lần, tạo bản ghi trùng — vì handler xử lý đồng bộ quá timeout của bên gửi; trả 200 trước, đẩy việc vào queue.
tags: [webhook, idempotency]
created: 2026-10-02
source: "thread support + MR đã merge"
---
```

`summary` là dòng quan trọng nhất của note, vì **cả hai loại người đọc chỉ đọc dòng này để quyết định có mở note không**: agent nhận danh sách note kèm summary, còn người lướt MOC. Hai luật, cả hai đến từ đo đạc:

- **Một câu ≤ 160 ký tự, nói kết luận.** Đo thực tế trên một brain: summary của note mới có trung vị **287 ký tự**, 97,5% vượt 160 (case thực tế, đo một lần) — summary thành đoạn văn thì người phải mở note mới biết nó nói gì, và mỗi lượt tra chèn vào context dài hơn.
- **Mở bằng triệu chứng, rồi mới tới cơ chế.** Lý do ở §3.7 — đây là luật quyết định note có được tìm lại hay không.

Thêm field chỉ khi có script đọc nó. Ví dụ `review:` trên decision có lý do tồn tại: một job hằng tuần quét field này và bắt quyết định quá hạn phải chứng minh nó còn đúng. Field không ai đọc là chi phí mỗi note phải trả mà không đổi lại gì.

### 3.4 Phía ghi mạnh, phía đọc yếu — và bốn số để thấy điều đó

Đáp án ⏸ là **(c)**. Phép tính:

```python
luot_tra = 13
note_moi_luot = 3                 # mỗi lượt tra trả tối đa ~3 note
tran = luot_tra * note_moi_luot   # = 39: số note TỐI ĐA có thể được tra ra
da_cham = 487 - 456               # = 31
print(tran, da_cham, round(da_cham / tran, 2))   # 39 31 0.79
```

Với 13 lượt tra, dù brain hoàn hảo cũng chỉ chạm được tối đa ~39 note. Đang chạm 31, tức đã gần kịch trần. Con số 93% đo **phía đọc quá nhỏ**, không đo chất lượng note. Xoá note (a) là chữa sai bệnh; vector DB (b) là đổi máy tra khi vấn đề là không ai tra; (d) đúng về 31 note nhưng bỏ qua việc 13 lượt không phải mẫu.

Cái bẫy chung: mọi con số dễ có của một brain — số note, số job chạy thành công, số dòng index — đều đo **phía ghi**, và phía ghi **tự tăng**. Chúng không thể đỏ khi brain vô dụng. Thứ phải đo là phía đọc, và nó hỏng theo bốn cách khác nhau nên phải tách thành bốn số (kinh nghiệm thực tế; bộ bốn số do tác giả tự đặt, không phải chuẩn ngành):

| # | Số | Hỏng nghĩa là | Sửa ở đâu |
|---|---|---|---|
| 1 | **Với tới** — số lượt tra/tuần | brain không được hỏi | cắm lượt tra vào cửa vào của task (§3.6) |
| 2 | **Ra cơ chế** — tỉ lệ lượt tra trả về note chín | bị hỏi mà không có câu trả lời | viết note còn thiếu |
| 3 | **Được dùng** — artefact (commit, report) có trích `[[note]]` | có câu trả lời mà không ai dùng | bắt agent trích nguồn |
| 4 | **Note chết** — note chưa từng được tra ra | tri thức nằm ngoài đường đi | gộp, archive, hoặc sửa summary |

Gộp số 1 với số 2 là lỗi kinh điển: tỉ lệ trúng thấp trên 13 lượt không nói gì về chất lượng note. Script đo vì vậy **từ chối in tỉ lệ khi dưới 30 lượt** và in thẳng "chưa đủ mẫu". Ngưỡng 30 là số tác giả tự chọn để chặn kết luận sớm, không phải số đã chứng minh là đủ — ghi rõ điều đó ngay trong script. Số 4 gần như vô nghĩa cho tới khi số 1 lớn, như phép tính trên cho thấy.

Số 3 là số duy nhất đo **tác động**: lượt tra không ai trích thì không đổi được việc gì. Nó vẫn chỉ là **cận trên** — agent có thể dán một `[[slug]]` cho có.

Mỗi task đóng lại trả lời một câu: *"Brain đã có thứ giúp được task này chưa?"* Ba câu trả lời dẫn tới ba việc khác nhau:

| Trả lời | Loại lỗi | Việc |
|---|---|---|
| Có, và lượt tra đã đưa ra | không lỗi | trích `[[slug]]` vào commit/report |
| Có, nhưng lượt tra **không** đưa ra | **lỗi truy hồi** | sửa summary/từ khoá/xếp hạng — KHÔNG viết note mới |
| Không có | **knowledge gap** | viết note cơ chế — note đáng giá nhất |

Hai dòng dưới trông giống nhau từ bên ngoài (task không được giúp) nhưng sửa ở hai chỗ ngược nhau. Viết note mới cho thứ brain đã có làm brain phình mà không khá hơn, và che mất lỗi truy hồi thật.

### 3.5 Đo chất lượng của lượt tra, không đo "có trả về file"

Bản đầu của công cụ tra cứu ghi log mỗi lượt với cờ `hit: true/false` = "có trả về file nào không". Một ca thật: tra cho một task "order kẹt trạng thái chờ", công cụ trả về hai **nhật ký ngày** (digest kể lại việc hôm đó) và ghi `hit: true`. Sự thật là brain không có note nào về cơ chế đó. Job tổng hợp tuần đọc tỉ lệ MISS để tìm knowledge gap; với `hit` tính kiểu này, tỉ lệ MISS luôn đẹp và **knowledge gap không bao giờ nổi lên** — đúng thứ job đó được dựng để tìm (case thực tế).

Sửa bằng bốn hạng thay cho hai:

| Hạng | Nghĩa | Đọc thế nào |
|---|---|---|
| `co-co-che` | có ít nhất một note chín (note, feedback, decision) | brain đã biết |
| `chi-inbox` | chỉ có đề xuất trong `00-inbox/` | giả thuyết, chưa ai duyệt |
| `chi-nhat-ky` | chỉ có nhật ký ngày | **knowledge gap** — có kể chuyện, chưa rút cơ chế |
| `truot` | không có gì | knowledge gap rõ ràng |

Một biến thể của cùng lỗi: runbook chung của một app được tiêm vào hạng 1 mọi lượt tra. Đo trên 14 lượt thật: runbook có mặt **14/14** lượt, và **7/14** lượt chỉ trả về đúng runbook mà vẫn ghi là hit (case thực tế). Một dòng xuất hiện ở 100% kết quả không mang thông tin, chỉ dạy người đọc bỏ qua cả khối — và nó chiếm hạng 1, chỗ đắt nhất khi brief bị cắt. Sau khi đưa runbook ra khỏi xếp hạng và phạt file xuất hiện ở hơn 35% lượt tra gần đây, note đáp án lên hạng 1 ở 6/6 ca thử.

Bài học chung (chi tiết ở [[ag-11-gate-xanh-gia]]): **thước đo do chính công cụ đặt ra, theo tiêu chí của chính nó, không bao giờ báo "tôi không tìm được thứ đáng tìm"**. Kiểm bằng cách bắt nó đỏ: chèn 12 lượt `truot` giả vào log → báo cáo phải chuyển sang cảnh báo; xoá log → phải báo "chưa ai tra lần nào"; trả lại → xanh.

### 3.6 Hỏi đúng lúc, bằng đúng câu: hook tra theo triệu chứng

Quay lại §2: hook `SessionStart` tra bằng tên nhánh, 3 lần, 0 tri thức. Nó sai ở hai mặt (kinh nghiệm thực tế):

- **Tín hiệu.** Tên nhánh nói *việc tên gì* (`fix/round-prices`), không nói *triệu chứng gì*. Cùng ca đó, câu triệu chứng trúng hạng 1.
- **Thời điểm.** Nó bắn một lần lúc mở phiên. Đo được một phiên mở trên nhánh chính rồi làm việc trên 6 nhánh feature mà không lần nào tra lại — "biết rồi mà quên" không phải trí nhớ kém, mà là không ai hỏi lần thứ hai.

Claude Code có sẵn đúng điểm cắm cho việc này. Theo docs hooks (https://code.claude.com/docs/en/hooks):

- `UserPromptSubmit` bắn mỗi khi người dùng gửi prompt; input JSON qua stdin có `session_id`, `cwd`, `prompt`…
- Với `UserPromptSubmit` (cùng `SessionStart` và vài event khác), **stdout dạng text thường được thêm vào context** mà Claude thấy được; hoặc trả JSON với `hookSpecificOutput.additionalContext`. Mỗi kênh bị cắt ở 10.000 ký tự.
- Exit code 2 chặn prompt — hook tra cứu **không bao giờ** được dùng nó.
- Timeout mặc định của command hook ở `UserPromptSubmit` là 30 giây.
- Hook khai báo trong `~/.claude/settings.json` áp cho **mọi project** trên máy; `.claude/settings.json` chỉ một project.

Chỗ đăng ký quan trọng hơn trông có vẻ: bản đầu đăng ký trong `.claude/settings.local.json` của hai repo — file gitignore, nên **mọi worktree mất sạch đường đọc** ([[ag-15-worktree-va-xung-dot]]) và mọi repo khác không có. Chuyển sang `~/.claude/settings.json` thì repo nào, worktree nào cũng thừa hưởng, và không phải commit gì vào repo của app.

Một hook chạy trước **mỗi** lượt chat mà in khối không dính thì nhanh chóng dạy người lẫn agent lờ nó đi. Vì vậy ba cổng chống ồn:

1. **Prompt phải trông như mô tả vấn đề**: dài ≥ 25 ký tự, có mã ticket hoặc từ chỉ lỗi (`lỗi`, `fail`, `timeout`, `tại sao`…). Cố ý **không** đưa chữ `không` vào danh sách — quá thường trong tiếng Việt, cổng bắn mọi lượt thì không còn là cổng.
2. **Chỉ in khi có note chín** (`co-co-che`). Chỉ có nhật ký thì im.
3. **Không in lại note đã in trong cùng phiên.**

Và một luật: lỗi gì cũng **im lặng, exit 0**. Hook tra cứu không được phép làm hỏng một phiên làm việc. Chi phí đo được trên một máy là ~0,2 giây mỗi lượt (case thực tế, một lần đo); tổng chi phí mỗi ngày = 0,2 s × số prompt/ngày của bạn — số đó tự đếm, bài không điền thay.

Cái giá của cổng 1: danh sách từ viết tay sẽ bỏ sót câu hỏi diễn đạt kiểu khác. Đó là sai theo chiều **im lặng** — rẻ hơn sai theo chiều ồn, nhưng vẫn là sai, và số 1 trong bốn số sẽ cho thấy nếu nó quá hẹp.

**Chèn tới cửa chưa đủ — phải cho lý do để mở.** Sau khi hook mới chạy được 4 ngày, đo lại: 7 phiên được hook chèn note, agent mở note ở **2/7** phiên, và 1 phiên hỏi lại người dùng trước khi mở note nào (case thực tế, mẫu nhỏ). Bản đầu chỉ chèn **danh sách đường dẫn** — đường dẫn trần không cho agent lý do gì để mở. Bản sửa:

- in kèm `summary:` của từng note (một câu là đủ để quyết định mở hay bỏ — bỏ cũng là kết quả tốt);
- thêm một dòng hành động: đang điều tra thì mở note **trước khi hỏi lại người dùng**;
- kết luận phải có một dòng `Brain: áp dụng [[slug]]` hoặc `Brain: chưa có` — chính dòng này là nguồn của số 3, và dòng "chưa có" là danh sách note cần viết.

Hook là một trong hai dây đọc. Dây kia là cho agent **tự** hỏi: một skill tra brain, hoặc một MCP server cung cấp tool `query`/`explain` đăng ký ở scope user (`claude mcp add --scope user …`, lưu trong `~/.claude.json`, dùng được ở mọi project — docs https://code.claude.com/docs/en/mcp; cách dựng ở [[ag-09-mcp]]). Lượt agent tự gọi có câu hỏi đã gọt nên thường chính xác hơn hook khớp từ khoá trên prompt thô, và nó là một tool call nhìn thấy được trong transcript — đếm được.

**Từ khoá cũng là tài nguyên có trần.** Hook chạy đồng bộ trước mỗi lượt nên công cụ tra chỉ được chạy tối đa 12 lần `rg` một lượt; khi phải cắt, bản cũ giữ từ **dài nhất** với lý lẽ "từ dài là từ riêng của domain". Trong prompt thật, token dài nhất là ID: doc id, SHA commit, epoch ms. Đo 7 ngày: **292/2105 từ khoá (13,9%) là ID/hash**, 155/206 lượt đầy trần 12 từ, trung bình ~1,9 slot mỗi lượt đầy trần mất cho token vô nghĩa — ba ca khác nhau liền nhau trả về **cùng một bộ note** (case thực tế). Sửa bằng cách đẩy ID xuống cuối hàng, tối đa 3 cái — không bỏ hẳn, vì 18/106 ID khớp đúng note của chính ca đó.

### 3.7 Summary phải chứa triệu chứng — lỗi sinh ở phía ghi

Sau khi phía đọc đã được cắm, một phép đo khác ra đời: lấy các ca support gần đây, hỏi brain bằng **đúng câu triệu chứng** trong case card, đếm tỉ lệ ra được note đúng. Trong 5 lượt đo, **13/13 ca không phủ đều là "khớp yếu", 0 ca trượt hẳn** — mọi ca hỏng đều có note trả về, chỉ không khớp ca (case thực tế).

Ba ticket bị tính là gap 2–4 lượt liền **trong khi brain đã có đúng note**. Chạy lại phép khớp trên hai ca: từ duy nhất chung giữa câu triệu chứng và tên file + `title` + `summary` của note đáp án là **mã đơn hàng** — mỗi ca một mã, nên vô dụng. Người báo lỗi viết kiểu *"hiển thị Unpaid nhưng không tạo order mới"*; note viết *"cron đánh dấu processed trước khi charge"*. Cả hai câu đúng, nhưng chúng không chung chữ nào.

Nguyên nhân gốc nằm ở **prompt sinh note**: job học từ thread support yêu cầu "một câu TLDR", và model chọn cách tự nhiên nhất là tóm **nguyên nhân**. Lượt tra thì luôn bắt đầu từ **triệu chứng** — lúc ticket mới tới, chưa ai biết nguyên nhân.

Bản vá đặt ở nơi note được sinh ra, không ở từng note, không ở công cụ tra:

> `summary` phải chứa cụm triệu chứng theo lời người báo lỗi, không chỉ cơ chế. Tên file + `title` + `summary` phải chung **≥ 2 từ phân biệt** (> 3 ký tự, không phải từ chung) với dòng "Vấn đề chính" của case — mã đơn/mã ticket KHÔNG tính. Cách rẻ nhất: mở `summary` bằng triệu chứng, rồi mới `… vì <cơ chế>`.

Ba phương án bị loại, và vì sao: sửa summary của ba note cũ (chữa một lần, note tuần sau vẫn trượt); nới công cụ tra cho đọc cả thân note (chữa phía đọc cho lỗi sinh ở phía ghi); thêm field `trieu_chung:` (thêm schema cho việc `summary` làm được).

Baseline và tiêu chí đo lại, viết **trước** khi áp:

```python
cases, covered = 46, 33          # 5 lượt đo gần nhất, trước bản vá (case thực tế)
print(round(covered / cases, 3)) # 0.717
# Đạt khi: covered/cases >= 0.80 và số ticket trượt lặp >= 2 lượt <= 1
# Chỉ xét khi: >= 4 lượt và >= 25 ca  — một lượt lẻ dao động 0.889 -> 0.556 trong 5 ngày
```

Hai giới hạn phải nói thẳng. **Dạy cho thi**: thước đo và luật mới dùng cùng quy tắc "≥ 2 từ phân biệt", nên con số có thể lên mà note không hữu ích hơn — giảm bằng cách đòi *nguyên văn* lời người báo lỗi chứ không đòi nhồi từ khoá, và giữ "ticket trượt lặp lại" làm tín hiệu độc lập. **Không lùi về quá khứ**: chỉ note viết sau bản vá được hưởng, nên độ phủ lên chậm.

Cách kiểm công cụ tra không bị chính mình lừa: **backtest bằng ca đã đóng**. Sáu ca support đã có MR merge và root cause đã chứng minh — đáp án chọn **trước** khi chạy, truy vấn chỉ chứa thứ biết được lúc ticket vừa tới (câu triệu chứng, tên nhánh), không bao giờ chứa root cause. Qua ba vòng sửa, mỗi vòng một nguyên nhân đo được, HIT@3 (note đáp án nằm trong 3 kết quả đầu) đi **0% → 83% → 100%** (case thực tế, 6 ca — đủ để bắt lỗi, quá ít để khẳng định tỉ lệ). Lỗi vòng 1: kết quả xếp theo **nhóm** (feedback lên trước) chứ không theo điểm, nên một feedback về múi giờ đứng trên note cơ chế đúng.

### 3.8 Bản đồ: index một màn hình, MOC theo chủ đề

**MOC** (Map of Content) là một note chỉ chứa danh sách link có chọn lọc về một chủ đề, mỗi dòng nói **khi nào mở** note đó — không chép summary, không phải bãi đổ link. Index toàn cục chỉ trỏ tới các MOC.

Case: brain có `CLAUDE.md` bảo agent "đọc `index.md` đầu tiên". Index đã phình theo log: 565 dòng, ~64.600 token, 45% dòng là nhật ký ngày. Skill tra brain vì vậy chỉ đọc 60 dòng đầu — toàn mô tả bộ máy — và việc tra vẫn chạy được là nhờ công cụ tra từ khoá chứ không nhờ index (case thực tế). Sau khi rút index về MOC:

```python
truoc, sau = 64_600, 1_444      # token của index.md, đo trước/sau (case thực tế)
print(round(truoc / sau, 1), f"{1 - sau/truoc:.1%}")   # 44.7  97.8% ít hơn mỗi lần nạp
```

Luật giữ bản đồ: index ≤ 150 dòng / ≤ 10.000 token (script lint cảnh báo khi vượt); mọi note chín tới được trong ≤ 2 bước index → MOC → note; **nhật ký ngày không vào index hay MOC**, chỉ tra bằng tên file. Nguyên nhân gốc của phình: brain viết vào nhanh hơn chưng cất — 234/313 file trong `notes/` là nhật ký (case thực tế). Sửa ở **nguồn** (prompt của các job sinh note) thay vì viết lại 550 note cũ bằng LLM: viết lại hàng loạt có rủi ro đổi nghĩa mà không ai duyệt nổi.

Khi nào cần vector DB/embedding ([[aiml-04-rag]])? Lựa chọn của tác giả là **chưa**: `index.md` + MOC + `rg` khớp từ khoá trên tên file/title/summary là đủ ở cỡ vài trăm note; mọi lỗi truy hồi đo được ở trên đều sửa được bằng cách viết note tốt hơn hoặc xếp hạng tốt hơn, không cần đổi máy tra. Ngưỡng "khoảng 100 nguồn" ghi trong kế hoạch ban đầu là ước lượng, chưa đo. Cách quyết định đúng: khi backtest (§3.7) cho thấy ca trượt vì **từ đồng nghĩa** (người hỏi và note dùng chữ khác nhau cho cùng một ý) mà luật summary không chữa được, đó mới là tín hiệu thật.

---

## 4. Làm thử

Mục tiêu: dựng brain tối thiểu, tái hiện đúng lỗi §3.7 (note có sẵn mà tra theo triệu chứng không ra), vá ở phía ghi, cắm hook, và đo bằng bốn số. Cần `python3`, `git`. Các script dưới đây đã chạy thử trên macOS với Python 3.

**Bước 1 — Khung và hai note.**

```bash
mkdir -p ~/brain/{00-inbox,notes,70-decisions,feedback,bin,.state} && cd ~/brain && git init -q
printf '.state/\n' > .gitignore

cat > notes/don-ket-vi-danh-dau-truoc-khi-thu-tien.md <<'EOF'
---
type: note
title: Cron đánh dấu processed trước khi thu tiền
summary: Cron đánh dấu processed=true trước bước charge; charge lỗi thì đơn không bao giờ được chạy lại.
tags: [billing, cron]
created: 2026-10-01
---
# Cron đánh dấu processed trước khi thu tiền
(cơ chế, cách tái hiện, MR đã sửa)
EOF

cat > notes/webhook-timeout-vi-xu-ly-dong-bo.md <<'EOF'
---
type: note
title: Webhook timeout vì xử lý đồng bộ trong handler
summary: Webhook bị gửi lại nhiều lần và tạo bản ghi trùng vì handler xử lý đồng bộ quá timeout; trả 200 trước, đẩy việc vào queue.
tags: [webhook]
created: 2026-10-02
---
EOF
```

**Bước 2 — Công cụ tra** `bin/recall.py`: khớp từ khoá trên tên file + title + summary, cần ≥ 2 từ chung, bỏ token kiểu ID, ghi log có hạng chất lượng.

```python
#!/usr/bin/env python3
"""recall.py "<câu triệu chứng>" [--from cli|hook] [--json]"""
import json, re, sys, time
from pathlib import Path

BRAIN = Path(__file__).resolve().parent.parent
LOG = BRAIN / ".state" / "queries.jsonl"
STOP = set("""không được của cho khi với này một các những thì là có và bị đã đang sẽ rồi nhưng
vẫn lại ra vào lên xuống trong ngoài tôi bạn mình nó cái việc như sao gì nào đó đây
the and for with from this that not""".split())

def tu_khoa(text):
    return {w for w in re.findall(r"\w+", text.lower())
            if len(w) >= 3 and w not in STOP
            and not (re.search(r"\d", w) and len(w) >= 6)}   # ID/mã đơn: mỗi ca một mã

def doc_dau(f):
    m = re.match(r"---\n(.*?)\n---", f.read_text(encoding="utf-8"), re.S)
    fm = m.group(1) if m else ""
    get = lambda k: (re.search(rf"^{k}:\s*(.*)$", fm, re.M) or [None, ""])[1]
    return get("title"), get("summary")

a = sys.argv[1:]
nguon = a[a.index("--from") + 1] if "--from" in a else "cli"
q = " ".join(x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i-1] != "--from"))
kw, hang = tu_khoa(q), []
for d in ("notes", "70-decisions", "feedback"):
    for f in sorted((BRAIN / d).glob("*.md")):
        if f.stem.startswith("moc-"):
            continue
        title, summary = doc_dau(f)
        khop = sorted(kw & tu_khoa(f.stem.replace("-", " ") + " " + title + " " + summary))
        if len(khop) >= 2:
            hang.append({"file": str(f.relative_to(BRAIN)), "diem": len(khop), "khop": khop, "summary": summary})
hang = sorted(hang, key=lambda e: -e["diem"])[:3]
nk = [e for e in hang if Path(e["file"]).stem.startswith(("digest-", "shipped-"))]
cl = "truot" if not hang else "chi-nhat-ky" if len(nk) == len(hang) else "co-co-che"
LOG.parent.mkdir(exist_ok=True)
with LOG.open("a", encoding="utf-8") as fh:
    fh.write(json.dumps({"ts": int(time.time()), "from": nguon, "q": q[:200],
                         "files": [e["file"] for e in hang], "chat_luong": cl}, ensure_ascii=False) + "\n")
if "--json" in a:
    print(json.dumps({"chat_luong": cl, "xep_hang": hang}, ensure_ascii=False))
else:
    print(f"chat_luong={cl}")
    for e in hang:
        print(f"  [{e['diem']}] {e['file']}  khop={e['khop']}\n      {e['summary']}")
```

**Bước 3 — Tái hiện lỗi truy hồi.** Hỏi bằng lời người báo lỗi:

```bash
python3 bin/recall.py "Đơn 4471 hiển thị Unpaid nhưng không có order mới, khách đã có thẻ hợp lệ"
# Kỳ vọng: chat_luong=truot  — dù note đáp án CÓ trong brain (chỉ chung một từ "đơn")
python3 bin/recall.py "cron thu tiền processed nhưng charge lỗi"
# Kỳ vọng: co-co-che — hỏi bằng NGUYÊN NHÂN thì ra; nhưng lúc ticket tới chưa ai biết nguyên nhân
```

**Bước 4 — Vá ở phía ghi.** Sửa `summary` cho mở bằng triệu chứng:

```bash
sed -i.bak 's/^summary: Cron đánh dấu.*/summary: Đơn hiển thị Unpaid mà không có order mới — vì cron đánh dấu processed=true trước bước charge, charge lỗi thì không chạy lại./' \
  notes/don-ket-vi-danh-dau-truoc-khi-thu-tien.md && rm notes/*.bak
python3 bin/recall.py "Đơn 4471 hiển thị Unpaid nhưng không có order mới, khách đã có thẻ hợp lệ"
# Kỳ vọng: co-co-che, note đáp án hạng 1, khop gồm 'unpaid', 'order', 'hiển', 'thị'…
```

Bước 3 là "đỏ", bước 4 là "xanh" trên **cùng một câu hỏi** — đó là bằng chứng bản vá có tác dụng, không phải bằng chứng công cụ tra luôn ra kết quả.

**Bước 5 — Hook** `bin/recall_hook.py`, ba cổng, lỗi gì cũng im:

```python
#!/usr/bin/env python3
import json, re, subprocess, sys
from pathlib import Path

BRAIN = Path(__file__).resolve().parent.parent
DAU_HIEU = re.compile(r"(lỗi|bug|sai|fail|error|crash|timeout|exception|không chạy|không hiện|"
                      r"bị kẹt|bị treo|bị mất|trùng|tại sao|vì sao|[A-Z]+-\d{3,})", re.I)
try:
    d = json.load(sys.stdin)
    prompt, sid = (d.get("prompt") or "").strip(), d.get("session_id") or "x"
    if len(prompt) < 25 or prompt.startswith("/") or not DAU_HIEU.search(prompt):   # cổng 1
        sys.exit(0)
    r = subprocess.run([sys.executable, str(BRAIN / "bin/recall.py"), prompt, "--from", "hook", "--json"],
                       capture_output=True, text=True, timeout=5)
    kq = json.loads(r.stdout)
    if kq["chat_luong"] != "co-co-che":                                              # cổng 2
        sys.exit(0)
    seen = BRAIN / ".state" / f"seen-{sid}.txt"
    da = set(seen.read_text().split()) if seen.exists() else set()
    moi = [e for e in kq["xep_hang"] if e["file"] not in da]                         # cổng 3
    if not moi:
        sys.exit(0)
    with seen.open("a") as fh:
        fh.write("".join(e["file"] + "\n" for e in moi))
    print("## Brain có note có thể liên quan (khớp từ khoá, chưa phải đánh giá liên quan)")
    for e in moi:
        print(f"- {BRAIN / e['file']}\n  summary: {e['summary']}")
    print("Đang điều tra thì MỞ note trước khi hỏi lại người dùng. Kết luận ghi một dòng "
          "`Brain: áp dụng [[slug]]` hoặc `Brain: chưa có`. Note mâu thuẫn với code thì code thắng.")
except Exception:
    sys.exit(0)
```

Kiểm cả hai chiều **trước** khi đăng ký:

```bash
P='{"session_id":"s1","prompt":"webhook bị gửi lại nhiều lần, tạo bản ghi trùng — tại sao?"}'
echo "$P" | python3 bin/recall_hook.py                  # in khối có note webhook
echo "$P" | python3 bin/recall_hook.py                  # rỗng: cổng 3, cùng phiên đã nhắc
echo '{"session_id":"s1","prompt":"lỗi webhook"}' | python3 bin/recall_hook.py   # rỗng: cổng 1, quá ngắn
echo 'rác' | python3 bin/recall_hook.py; echo "exit=$?"                          # rỗng, exit=0
```

Đăng ký — thử trên một project trước (`.claude/settings.json` của repo đó), ổn rồi chuyển sang `~/.claude/settings.json` để mọi repo và worktree thừa hưởng:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "python3 \"$HOME/brain/bin/recall_hook.py\"", "timeout": 5 }
        ]
      }
    ]
  }
}
```

Mở một phiên Claude Code trong repo đó, gõ một câu mô tả lỗi có chữ "webhook … trùng … tại sao". Docs nói context do hook thêm vào không hiện thành một mục trong transcript; kiểm bằng cách hỏi agent "khối brain vừa được chèn nói gì", hoặc bật debug log của hook.

**Bước 6 — Bốn số.** `bin/measure.py`:

```python
#!/usr/bin/env python3
"""measure.py [--days 7] [--repo <repo có commit trích Brain:>]"""
import json, re, subprocess, sys, time
from pathlib import Path

BRAIN = Path(__file__).resolve().parent.parent
MIN_SAMPLE = 30   # tự chọn để chặn kết luận sớm, KHÔNG phải số đã chứng minh là đủ
a = sys.argv[1:]
days = int(a[a.index("--days") + 1]) if "--days" in a else 7
repo = a[a.index("--repo") + 1] if "--repo" in a else None
log = BRAIN / ".state/queries.jsonl"
rows = [json.loads(l) for l in log.open(encoding="utf-8")] if log.exists() else []
gan = [r for r in rows if r["ts"] >= time.time() - days * 86400]

print(f"1. voi_toi   : {len(gan)} lượt / {days} ngày, theo nguồn "
      f"{ {s: sum(r['from'] == s for r in gan) for s in sorted({r['from'] for r in gan})} }")
if len(gan) < MIN_SAMPLE:
    print(f"2. ra_co_che : CHƯA ĐỦ MẪU ({len(gan)} < {MIN_SAMPLE}) — không in tỉ lệ")
else:
    n = sum(r["chat_luong"] == "co-co-che" for r in gan)
    print(f"2. ra_co_che : {n}/{len(gan)} = {n/len(gan):.0%}")
if repo:
    body = subprocess.run(["git", "-C", repo, "log", f"--since={days}.days", "--format=%B"],
                          capture_output=True, text=True).stdout
    trich = re.findall(r"^Brain:.*?\[\[([^\]]+)\]\]", body, re.M)
    print(f"3. duoc_dung : {len(trich)} commit trích note {sorted(set(trich))}")
else:
    print("3. duoc_dung : (truyền --repo để đếm)")
notes = {str(f.relative_to(BRAIN)) for d in ("notes", "70-decisions", "feedback")
         for f in (BRAIN / d).glob("*.md") if not f.stem.startswith(("moc-", "digest-", "shipped-"))}
chet = notes - {f for r in rows for f in r["files"]}
print(f"4. note_chet : {len(chet)}/{len(notes)} (trần chạm được với {len(rows)} lượt = {len(rows)*3} note)")
```

```bash
python3 bin/measure.py
# Kỳ vọng: voi_toi đếm cả nguồn cli lẫn hook; dòng 2 in "CHƯA ĐỦ MẪU" — đúng hành vi, không phải lỗi
```

**Tiêu chí xong (kiểm được):**

- Bước 3 ra `truot`, bước 4 ra `co-co-che` cho **cùng một câu**.
- Bốn lệnh kiểm hook cho đúng: có khối / rỗng / rỗng / rỗng + `exit=0`.
- `measure.py` in "CHƯA ĐỦ MẪU" khi dưới 30 lượt. Thêm 30 dòng giả vào log thì nó in tỉ lệ — tức thước đo đỏ/xanh được cả hai chiều.
- Một commit trong repo app có dòng `Brain: áp dụng [[don-ket-vi-danh-dau-truoc-khi-thu-tien]]` làm số 3 tăng lên 1 khi chạy `measure.py --repo <repo đó>`.

---

## 5. Bẫy thường gặp

**Đo brain bằng số note và số job chạy thành công.**
Triệu chứng: báo cáo tuần luôn xanh, brain lớn đều, nhưng không ai nhớ lần cuối brain giúp được một task.
Nguyên nhân gốc: mọi số phía ghi tự tăng và không thể đỏ khi brain vô dụng.
Chặn bằng cơ chế: báo cáo chỉ gồm bốn số phía đọc (§3.4), script từ chối in tỉ lệ dưới ngưỡng mẫu; luật "số lượt tra/tuần phải tăng trước khi thêm bất kỳ job sinh note nào".

**Viết note mới cho thứ brain đã có.**
Triệu chứng: brain có hai, ba note nói cùng một cơ chế với tên khác nhau; ca sau vẫn trượt.
Nguyên nhân gốc: coi lỗi truy hồi là knowledge gap.
Chặn bằng cơ chế: trước khi viết note, chạy công cụ tra với câu triệu chứng **và** grep theo cơ chế; grep ra mà tra không ra → sửa summary của note cũ, không tạo note mới. Kết luận task ghi `Brain:` theo ba nhánh của bảng §3.4.

**Summary chỉ nói nguyên nhân.**
Triệu chứng: ticket tới, tra brain bằng lời người báo lỗi, trượt; người điều tra mất nửa ngày tìm lại đúng thứ đã ghi tháng trước.
Nguyên nhân gốc: người viết note đã biết đáp án nên tóm đáp án; người tra chưa biết đáp án nên hỏi bằng triệu chứng.
Chặn bằng cơ chế: luật "≥ 2 từ phân biệt chung với dòng triệu chứng" nằm trong **prompt của job sinh note** và trong script lint; backtest bằng ca đã đóng với truy vấn chỉ chứa triệu chứng.

**Hook nói mỗi lượt nên không ai đọc nữa.**
Triệu chứng: khối "brain có liên quan" xuất hiện gần như mọi tin nhắn; agent và người đều lờ đi, kể cả lần nó đúng.
Nguyên nhân gốc: không có cổng — khối không mang thông tin dạy người đọc bỏ qua cả khối.
Chặn bằng cơ chế: ba cổng (§3.6); đo tỉ lệ lượt hook bắn có `co-co-che`; nếu bắn nhiều mà toàn trượt thì cổng 1 quá rộng.

**Chèn được note mà agent không mở.**
Triệu chứng: transcript có khối brain, nhưng agent điều tra từ đầu hoặc hỏi lại người dùng.
Nguyên nhân gốc: chỉ chèn đường dẫn, không có lý do để mở và không có hành động được yêu cầu.
Chặn bằng cơ chế: chèn kèm summary + dòng hành động + bắt buộc dòng `Brain:` trong kết luận; đếm "phiên được chèn / phiên mở note" định kỳ ([[ag-24-harness-tu-cai-tien]]).

**Nhật ký ngày được đếm là "đã có câu trả lời".**
Triệu chứng: tỉ lệ hit đẹp, knowledge gap tuần nào cũng rỗng.
Nguyên nhân gốc: thước đo "có trả về file" do chính công cụ tra tự đặt.
Chặn bằng cơ chế: bốn hạng `co-co-che/chi-inbox/chi-nhat-ky/truot`; công cụ tra in cảnh báo ngay trong output khi chỉ có nhật ký; kiểm thước đo bằng log giả cho nó đỏ.

**Brain rò ra ngoài.**
Triệu chứng: một file của task (log, dump dữ liệu, ghi chú có tên khách hàng) nằm trong repo brain, và repo đó được push tự động mỗi tối.
Nguyên nhân gốc: brain chứa chi tiết công việc thật, và đường ống "file lạ rơi vào brain → `git add -A` → push" chạy không người duyệt. Case thực tế: remote của một brain từng để public gần ba tháng trước khi được chuyển private.
Chặn bằng cơ chế: remote private; job sync có cổng danh sách thư mục hợp lệ — path ngoài danh sách thì DỪNG, không commit; hook `PreToolUse` chặn phiên agent đang làm việc trong brain ghi file ra ngoài brain ([[ag-08-hook-va-chan-bang-cau-hinh]]).

---

## 6. Chuyển giao

Bài này cho bạn **trí nhớ dài hạn có thước đo**: tri thức sống ngoài mọi context window, xuyên repo, người và agent cùng đọc, và bốn con số nói nó có thật sự được dùng không. Ở level 7, thứ bạn bỏ được là **việc tự nhớ "chuyện này mình gặp rồi"** — hook và dòng `Brain:` làm thay.

Brain vẫn còn hai chỗ phụ thuộc vào người:

- **Ai viết note?** Nếu chỉ người viết thì phía ghi chết trước phía đọc. Job định kỳ đọc git log, transcript, thread support rồi đề xuất note vào `00-inbox/` — và luật "job sinh chỉ ghi inbox" vì sao tồn tại — là [[ag-23-job-dinh-ky-va-bot]].
- **Ai sửa khi số đo xấu?** Mọi bản vá trong bài này (summary chứa triệu chứng, chèn kèm summary, ID xuống cuối hàng) đều là một vòng: đo, chọn đúng một lỗi lặp, ghi baseline, vá một chỗ, đo lại. Biến vòng đó thành job tự chạy, người chỉ duyệt, là [[ag-24-harness-tu-cai-tien]].

---

## 7. Tóm tắt

- Second brain = repo markdown trong git, PARA để biết đặt đâu, Zettelkasten để mỗi note một ý; `sources/` bất biến, wiki agent bảo trì, index + MOC điều hướng.
- `summary` là giao diện tra cứu: một câu ≤ 160 ký tự, mở bằng **triệu chứng** theo lời người gặp lỗi rồi mới tới cơ chế — người tra luôn chưa biết nguyên nhân.
- Phía ghi tự tăng và không đỏ được; đo phía đọc bằng bốn số tách rời: với tới, ra cơ chế, được dùng, note chết. Dưới 30 lượt thì không in tỉ lệ.
- 93% note chưa từng tra ra với 13 lượt tra là trần 39 note, không phải brain tệ — tính trần trước khi kết luận.
- Phân hạng lượt tra `co-co-che/chi-inbox/chi-nhat-ky/truot`; tách lỗi truy hồi (sửa summary/xếp hạng) khỏi knowledge gap (viết note).
- Hỏi bằng triệu chứng, mỗi lượt chat: hook `UserPromptSubmit` đăng ký ở `~/.claude/settings.json`, ba cổng chống ồn, lỗi thì im; chèn kèm summary và đòi dòng `Brain:` trong kết luận.
- Index một màn hình trỏ tới MOC; nhật ký ngày không vào bản đồ; sửa cách viết ở prompt của nguồn sinh note, không viết lại hàng loạt.
