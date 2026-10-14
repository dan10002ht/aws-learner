# Bài 18 — BRIEF.md: trí nhớ duy nhất sống ngoài context

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao một loop agent chạy qua nhiều session **chỉ còn file trên đĩa và git** để biết mình đang ở đâu, và chỉ ra câu trong tài liệu Claude Code nói thứ gì mất khi context bị compact.
- Thiết kế một `BRIEF.md` có **trạng thái máy đọc được** (`[ ]`, `[lock …]`, `[wait …]`, `[x …]`), lock có ngày giờ đầy đủ, và tính được ngưỡng lock mồ côi từ thời gian thật của một task.
- Gọi tên **bốn kiểu thối** của file state (checkbox nói dối, lock treo, số cũ đọc như phép đo, doc lạc hậu ở đầu file) và nêu nguyên nhân gốc chung của chúng.
- Viết một task sao cho session sau **không phải tin bạn**: số có mốc đo, kết luận có tầng tin cậy, task điều tra để lại `file:line` + root cause.
- Chạy một script soi BRIEF chặn được ít nhất năm lỗi định dạng, và kiểm được rằng script đó **đỏ được** trên một brief hỏng.

---

## 2. Tình huống

Case thực tế, gộp từ một tuần chạy loop trên ba repo khác stack (một app SaaS thương mại điện tử viết Node, một app hoá đơn PDF, một repo microservice Java/Go). Số liệu là của các lần chạy đó, không phải benchmark.

Một dev trong team đã lên level 6: mỗi repo có một file `BRIEF.md` liệt kê task, một skill loop (gọi là `loop-tasks`) cứ 5–10 phút đọc file, nhặt task chưa xong, giao subagent làm trong worktree riêng, cho verifier độc lập chấm, rồi commit và đánh dấu. Người không duyệt từng prompt nữa. Người chỉ viết brief và đọc kết quả.

Sau một tuần, bốn chuyện xảy ra gần như cùng lúc:

1. **Repo Node.** File có 13 task còn `[ ]`. Loop vẫn chạy đều nhưng hầu như không nhặt được gì hữu ích. Dev ngồi dọn tay một lượt: **8 task đóng ngay** — 2 task thực ra đã commit và push từ trước, chỉ là lúc đó lock chết nên chưa ai đánh dấu; 6 task đã bị việc khác thay thế. Cuối lượt dọn chỉ còn **2 task thật sự mở**.
2. **Repo microservice.** Mọi task còn lại đều chờ người quyết hoặc chờ máy đủ RAM, và không dòng `[wait …]` nào có hạn. Loop 5 phút/lần trả "không thay đổi" suốt **~170 lượt liên tiếp**, từ tối hôm trước tới sáng hôm sau (diễn biến và điều kiện dừng ở [[ag-19-vong-lap-nhat-task]]).
3. **Repo Node, task khác.** Brief ghi "8 suite fail pre-existing". Agent tin, coi gate đỏ ở 8 suite là bình thường. Đo lại trên nhánh mới base từ `origin`: **chỉ 2 suite fail**. Ở app PDF, task so sánh hai phương án index ghi sẵn "A tốt hơn B"; đo lại cho kết quả **ngược lại**.
4. **Repo microservice, file brief.** File đã phình tới **1.668 dòng**. Phần đầu file là bối cảnh của hai tuần trước. Nhiều lần agent nhận task với tiền đề sai (giả định một status `"retrying"` không tồn tại trong code, một template email không có trong seed) — và bác đúng. Những lần agent không bác thì fix đúng cú pháp nhưng vô dụng.

```python
# tính lại bằng python
print(8 / 13)          # 0.615 — 61.5% số task "[ ]" đóng được ngay khi dọn
```

Không có gì trong bốn chuyện này là lỗi của model. Model làm đúng thứ file bảo. Vấn đề là file nói sai.

---

## ⏸ Dừng lại — đoán trước

Chọn một đáp án trước khi đọc tiếp.

**Ở chuyện số 1, 8 trong 13 task `[ ]` đóng được ngay. Vì sao loop — chạy hàng trăm lượt — không tự phát hiện ra điều này?**

```
(a) Model chưa đủ thông minh để nhận ra task đã hết hiệu lực
(b) Loop chỉ được thiết kế để đọc "[ ]" là "còn phải làm"; nó không có bước nào hỏi
    "dòng này còn đúng không", và không có actor nào chịu trách nhiệm ghi ngược lại
    khi việc xảy ra ngoài loop
(c) Context window quá nhỏ để chứa cả 13 task
(d) Thiếu một verifier chấm từng task
```

---

## 3. Cơ chế

### 3.1 Vì sao loop cần state nằm ngoài context

**Context window** là toàn bộ văn bản model nhìn thấy trong một lượt: prompt hệ thống, file hướng dẫn, lịch sử hội thoại, output tool. Hết lượt, hết session, hoặc khi bị nén lại, phần lớn thứ đó không còn nguyên.

Tài liệu Claude Code nói thẳng hai điều (nguồn: `https://code.claude.com/docs/en/memory`):

- *"Each Claude Code session begins with a fresh context window."*
- Sau `/compact`, CLAUDE.md ở gốc project được đọc lại từ đĩa; còn *"If an instruction disappeared after compaction, it was given only in conversation…"* — tức chỉ dặn trong hội thoại thì có thể mất.

Một loop chạy nền qua nhiều giờ thì gặp cả hai: mỗi lượt cron có thể là session mới, còn session dài thì bị compact. Vậy lượt thứ N+1 biết gì về lượt thứ N? Chỉ ba thứ: **file trên đĩa, lịch sử git, và output của lệnh nó tự chạy lại**. `BRIEF.md` là thứ duy nhất trong ba thứ đó do con người và agent cùng viết bằng ngôn ngữ tự nhiên — nên nó là **shared state** (trạng thái dùng chung: thứ nhiều actor cùng đọc và ghi để phối hợp) của cả hệ.

Hệ quả quan trọng nhất: **session sau đọc BRIEF như đọc sự thật**. Không có cơ chế nào trong model để nghi ngờ một dòng viết từ hai tuần trước. Nếu file sai, loop sai một cách tự tin và đều đặn.

Bài [[ag-19-vong-lap-nhat-task]] dạy vòng lặp (nhặt → làm → verify → commit). Bài này dạy cái vòng lặp đó đứng lên trên: state.

### 3.2 Vì sao là một file markdown, và đặt nó ở đâu

Một bảng trong database hay một file JSON có schema, có transaction. Markdown không có cả hai. Vẫn chọn markdown vì ba lý do (kinh nghiệm thực tế):

- **Người và agent đọc cùng một thứ.** Người mở file là thấy task nào đang chờ mình, không cần tool.
- **Dòng con là context cho subagent.** Ràng buộc, vùng file, tiêu chí xong viết ngay dưới task; brief của subagent chính là đoạn đó.
- **Diff được.** Mỗi lần loop sửa file, `git diff` cho thấy đúng dòng nào đổi.

Cái giá: không có schema thì không có gì chặn một dòng sai định dạng, và không có transaction thì hai actor ghi cùng lúc sẽ ghi đè nhau. Hai mục sau xử lý từng cái.

**Vị trí.** Có hai lựa chọn, mỗi cái thắng ở một chỗ:

| Đặt ở | Được | Mất |
|---|---|---|
| Ngoài repo code (thư mục ghi chú riêng) | Worktree của subagent không bao giờ thấy file → không thể sửa nhầm hay commit làm revert checkbox lúc merge | Đồng đội không thấy |
| Trong repo, trên nhánh feature | Đồng đội thấy, review được | Subagent trong worktree có bản sao riêng của file; merge nhánh có thể đưa một bản cũ đè lên |

Nguyên nhân gốc của cột "Mất" ở hàng hai: **worktree** (một thư mục checkout riêng của cùng repo, trên nhánh riêng — xem [[ag-15-worktree-va-xung-dot]]) mang theo mọi file đã track, kể cả `BRIEF.md`. Mỗi worktree giữ một bản state khác nhau, và merge là lúc chúng va nhau.

### 3.3 Trạng thái máy đọc được, và lock là một mutex trên đĩa

Mỗi task là một dòng đánh số, trạng thái nằm trong ngoặc vuông ở đầu dòng:

```
[ ]                       chưa làm
[lock 2026-10-14 14:20]   loop đang làm, nhận lúc 14:20
[wait 2026-10-13]         chờ người quyết, câu hỏi nằm ở mục "Câu hỏi treo"
[x 2026-10-13]            xong, bên dưới có commit + verdict
```

Dùng từ ASCII thay vì biểu tượng vì `grep '\[lock '` hay regex trong script không phải đoán bảng mã. Task hết hiệu lực **không có trạng thái trong `BRIEF.md`** — nó rời file (mục 3.5).

**Vì sao cần lock.** Loop chạy theo nhịp cố định, còn task chạy bao lâu thì không biết trước:

```python
interval = 5      # phút giữa hai lần loop fire
task = 8          # phút một task thật chạy
print(task - interval)   # 3 — lần fire thứ hai tới khi task đầu còn 3 phút nữa mới xong
```

Không có gì đánh dấu, lần fire thứ hai thấy task vẫn `[ ]` và giao thêm một agent nữa làm cùng việc. `[lock …]` là một **mutex** (khoá loại trừ: tại một thời điểm chỉ một bên được giữ) ghi trên đĩa. Lượt sau thấy lock thì bỏ qua.

**Vì sao lock phải có hạn.** Loop có thể chết giữa chừng (máy sleep, session bị kill). Lock của nó sẽ nằm đó mãi. Nên lock có **ngưỡng mồ côi**: quá ngưỡng thì coi là chủ đã chết, lượt sau nhận lại. Đây chính là **lease** — khoá có thời hạn — của hệ phân tán (xem [[ds-15-coordination]]).

Chọn ngưỡng thế nào: **lớn hơn thời gian dài nhất của một task thật, kể cả vòng verifier**. Trong case, một vòng có verifier thật chạy gần 80 phút, ngưỡng đặt 90 phút (kinh nghiệm thực tế, một cấu hình; một cấu hình khác cho task nhỏ dùng 30 phút). Ngưỡng ngắn hơn thời gian task là hai agent làm cùng một việc; dài hơn nhiều thì loop chờ lâu mới cứu được task mồ côi. Cách đo cho repo của bạn: ghi giờ `lock` và giờ `x` của 10–20 task gần nhất, lấy giá trị lớn nhất cộng biên.

**Vì sao lock phải có ngày.** `[lock 23:50]` đọc lúc `00:10` là 20 phút hay 24 giờ 20 phút? Chỉ `HH:MM` thì không biết. Ghi `YYYY-MM-DD HH:MM`.

**Giới hạn của lock trên markdown.** Đọc file → thấy `[ ]` → ghi `[lock …]` là ba bước, không nguyên tử. Hai process cùng đọc trước khi một bên kịp ghi thì cả hai cùng nhận task. Lock markdown chỉ đúng khi **có đúng một actor ghi file**: main agent của loop, và chỉ một loop trên mỗi file. Cần nhiều loop cùng một hàng đợi thì phải lên lock thật — bài [[ag-21-loop-la-he-phan-tan]].

### 3.4 Bốn kiểu thối

Cả bốn có chung một nguyên nhân gốc: **state bền được ghi một lần, không có hạn dùng, không ghi nguồn gốc, và không có actor nào chịu trách nhiệm làm nó mất hiệu lực.** Database có TTL, có foreign key, có người giữ migration. `BRIEF.md` không có gì trong số đó trừ khi bạn tự thêm.

**Kiểu 1 — Checkbox nói dối.** `[ ]` được loop đọc là "còn phải làm". Nghĩa thật của nó là "chưa ai đóng sổ". Hai nghĩa đó tách nhau mỗi khi việc xảy ra **ngoài loop**: dev tự sửa tay, một task khác thay thế nó, hoặc loop làm xong nhưng chết trước khi kịp đánh dấu. Trong case, 2 task đã push mà vẫn `[ ]` vì lock chết; 6 task bị thay thế. Đây là đáp án câu ⏸: (b). Loop không có bước nào hỏi "dòng này còn đúng không", và không có actor nào ghi ngược khi việc xảy ra bên ngoài.

Kiểu này **không bắt được bằng định dạng** — một `[ ]` thối trông y hệt một `[ ]` thật. Phải đối chiếu với nguồn sự thật:

```bash
# Minh hoạ: với mỗi task [ ], tìm dấu vết trong git trước khi giao
git fetch origin
git log origin/main --since="14 days ago" --oneline -i --grep="csv"
git branch -a --list "*csv*"
```

**Kiểu 2 — Lock treo.** Hai biến thể: `[lock …]` của một loop đã chết, và `[wait …]` chờ người không có hạn. Cả hai làm loop **chạy mà không làm gì**: mỗi lượt đọc file, không thấy task nhặt được, trả "không thay đổi" — trong case là ~170 lượt rỗng ≈ 14,17 giờ. Vì sao nó không tự khỏi và cách cài điều kiện dừng cấp loop ở [[ag-19-vong-lap-nhat-task]] §3.6; phần của bài này là chặn từ phía state: `[wait …]` phải có ngày để script đếm được hạn.

Tốn bao nhiêu token cho một lượt rỗng — case không đo. Cách đo: chạy loop ở chế độ non-interactive với output JSON (`claude -p … --output-format json`, xem `https://code.claude.com/docs/en/headless`) trên một brief toàn task `[wait …]`, đọc trường `usage` và `total_cost_usd` (docs ghi là ước tính phía client) của 5 lượt, lấy trung bình, rồi nhân với số lượt rỗng.

**Kiểu 3 — Con số cũ đọc như phép đo.** "8 suite fail pre-existing" được viết lúc nào, trên nhánh nào, bằng lệnh gì? Không ai biết. Nó được copy sang brief mới và già đi im lặng. Agent đọc nó như một phép đo vừa chạy. Thực tế: đo lại còn 2. Hậu quả không đối xứng: số cũ **cao hơn** thật thì agent bỏ qua 6 suite lỗi mới do chính nó gây ra; số cũ **thấp hơn** thật thì agent đi sửa lỗi không phải của task. Cùng họ là **tiền đề** trong task ("status hiện có là retrying", "phương án A nhanh hơn") — đó là mô tả code tại một thời điểm, không phải code.

**Kiểu 4 — Doc lạc hậu ở đầu file.** File phình dần vì mỗi task để lại bối cảnh, bằng chứng, câu hỏi. Phần đầu file — thường là bối cảnh viết ngày đầu — là thứ session sau **đọc đầu tiên** và dùng để hiểu mọi thứ phía dưới. Sai ở đó lan xa nhất. 1.668 dòng còn có giá thứ hai: mỗi lượt loop đọc lại toàn bộ.

### 3.5 Sáu luật giữ file đúng

Mỗi luật chặn một nguyên nhân cụ thể ở 3.4.

**Luật 1 — Archive khác mark done.** Task hết hiệu lực chuyển nguyên văn sang `BRIEF-done.md`, ghi rõ **chưa làm** hoặc **bị thay thế bởi việc nào**, kèm root cause đã điều tra được. Không đánh `[x]` cho gọn mắt. `[x]` là lời khẳng định "đã có commit + verdict"; đánh nó cho task không làm là ghi một lời nói dối vào state bền — và lần sau ai đó tìm "task X xong lúc nào" sẽ tìm ra một commit không tồn tại. *(chặn kiểu 1)*

**Luật 2 — Task điều tra không commit vẫn để lại `file:line` + root cause.** Không có commit thì brief là **nơi duy nhất** kết quả đó tồn tại. Một dòng `- root cause: src/sync/order.ts:142 nuốt lỗi 429, không retry` tiết kiệm cho lần sau cả buổi điều tra lại.

**Luật 3 — Kết luận gắn tầng tin cậy.** Ghi `[verified]`, `[verified-safe]`, `[agent-claimed-unverified]` thay vì chép nguyên bảng kết quả của agent. Case thực tế: agent điều tra báo ~24 điểm lỗ hổng phân quyền, verifier độc lập xác nhận được 4 (16,7%). Chép cả 24 vào brief là biến 20 phỏng đoán thành 20 "sự thật" cho session sau. Cơ chế verifier: [[ag-12-verifier-doc-lap]]. *(chặn kiểu 3)*

**Luật 4 — Mọi con số kèm mốc đo.** Định dạng `(đo YYYY-MM-DD trên <nhánh>@<commit>, lệnh `...`)`. Và trước khi code: **đo lại baseline trên đúng nhánh sẽ làm**, không tin số ghi sẵn. Số không mốc thì script ở mục 4 báo lỗi. *(chặn kiểu 3)*

**Luật 5 — Uỷ quyền và ranh giới khi người vắng mặt ghi vào file, không nói trong chat.** "Được commit, không push, không đụng staging, gặp blocker thì chuyển `[wait]` và dừng" — nói trong chat thì sau compact có thể mất (mục 3.1); ghi vào mục đầu file thì mọi lượt đều đọc thấy. Câu hỏi chờ người cũng vậy: đánh số `Q1`, `Q2` để người trả lời thẳng.

**Luật 6 — Dọn file là một bước của loop, không phải việc phụ.** Tách ba file khi phình:

```
BRIEF.md          chỉ task đang làm và sẽ làm
REFERENCES.md     bối cảnh, link, quyết định dùng chung — ít đổi
BRIEF-done.md     [x] quá 3 ngày, task archive, kèm tóm tắt + root cause
```

Case thực tế: 1.668 dòng tách thành `BRIEF.md` 499 dòng + hai file kia (giảm 70,1% phần mỗi lượt phải đọc). Dọn phần đầu file trước khi bàn giao session. *(chặn kiểu 4)*

Gom lại sau khi đã giải thích:

| Kiểu thối | Nguyên nhân gốc | Luật chặn | Máy phát hiện được? |
|---|---|---|---|
| Checkbox nói dối | Việc xảy ra ngoài loop, không ai ghi ngược | 1, 2 | Không qua định dạng — phải đối chiếu git |
| Lock treo | Lock không hạn, `wait` không hạn | ngưỡng mồ côi, hạn `wait` | Có |
| Số cũ đọc như phép đo | Số không nguồn gốc | 3, 4 | Một phần (số thiếu mốc) |
| Doc lạc hậu đầu file | File chỉ tăng, không dọn | 6 | Một phần (độ dài, `[x]` quá hạn) |

### 3.6 Ai được ghi file

Một luật duy nhất: **chỉ main agent của loop sửa `BRIEF.md`**. Brief giao cho subagent ghi rõ: *không chạy git, không sửa file task list*. Hai lý do:

- **Lost update.** Subagent A đọc file lúc 14:00, subagent B ghi `[x]` lúc 14:05, A ghi lại toàn bộ file lúc 14:10 với bản đọc lúc 14:00 → `[x]` của B biến mất. Không có transaction thì cách duy nhất là chỉ một người viết.
- **Subagent không biết toàn cảnh.** Nó thấy task của nó, không thấy lock của task khác hay câu hỏi treo của người. Main agent nhận kết quả, gặp verdict, rồi mới ghi.

Subagent báo kết quả bằng output trả về (hoặc một file report riêng của nó); main agent chép phần cần giữ vào brief theo luật 2–4.

### 3.7 Mẫu `BRIEF.md` đầy đủ

File này qua được script ở mục 4 với exit 0.

```markdown
# repo-backend — BRIEF

<!--
Trạng thái (một task = một dòng đánh số, dòng con thụt 3 space):
  [ ]                        chưa làm
  [lock YYYY-MM-DD HH:MM]    loop đang làm; quá ngưỡng thì coi là mồ côi, nhận lại
  [wait YYYY-MM-DD]          chờ người — câu hỏi nằm ở mục "Câu hỏi treo"
  [x YYYY-MM-DD]             xong, có commit + verdict bên dưới
Task hết hiệu lực / bị thay thế  -> chuyển sang BRIEF-done.md, KHÔNG đánh [x]
Chỉ main agent sửa file này. Subagent: không chạy git, không sửa file này.
Kiểm: python3 brief_doctor.py BRIEF.md   (exit 0 mới được bàn giao)
-->

## Uỷ quyền khi người vắng mặt
- Được: commit vào nhánh riêng của từng task, chạy test/lint/build.
- Không: push, tạo PR/MR, đụng production/staging, đổi nhịp loop, sửa ngoài scope task.
- Gặp blocker: ghi verdict nguyên văn dưới task, chuyển task sang [wait], báo một dòng.

## Câu hỏi treo
- Q1 (task 3): chọn phương án index A hay B? Bằng chứng hai phía ở dòng con của task 3.

## Task

1. [ ] sửa format tiền ở export CSV
   - hiện ra `1000000`, cần `1,000,000`; mọi chỗ dùng cùng helper thì sửa hết
   - baseline: 2 suite fail pre-existing (đo 2026-10-14 trên origin/main@a1b2c3d, lệnh `npm test`)
   - done khi: test mới cho helper đỏ trước fix, xanh sau fix; `npm run lint` exit 0

2. [lock 2026-10-14 14:20] thêm retry cho webhook orders/create
   - hiện fail là mất luôn; retry phải idempotent theo id của webhook
   - vùng file: `src/webhooks/orders/*`, `src/lib/retry.ts`

3. [wait 2026-10-13] chọn index cho truy vấn lọc đơn theo ngày
   - [verified] phương án A: 1 composite index, truy vấn hiện tại chạy được
   - [agent-claimed-unverified] phương án B rẻ hơn khi ghi — chưa ai đo, task sau đo lại

4. [x 2026-10-13] thêm log có cấu trúc cho job đồng bộ
   - nhánh `chore/sync-structured-log` · commit `9f8e7d6`
   - verifier PASS: `npm test` exit 0, log mẫu có đủ trường `jobId`, `shop`, `durationMs`
```

Và một mục trong `BRIEF-done.md` cho task bị gỡ — chú ý nó **không** được đánh dấu xong:

```markdown
## 2026-10-12 — ARCHIVE

6. [drop 2026-10-12] dọn bản sao sản phẩm khi webhook products/delete tới
   - CHƯA LÀM. Bị thay thế bởi job đối soát hằng đêm (task 9, commit `4c5d6e7`).
   - root cause đã điều tra: `src/webhooks/products/delete.ts:58` chỉ xoá bản ghi chính,
     bỏ sót collection bản sao. Nếu bỏ job đối soát thì phải làm lại task này.
```

---

## 4. Làm thử

Mục tiêu: có một script soi BRIEF, và **chứng minh nó đỏ được** trước khi tin nó xanh.

**Bước 1.** Tạo thư mục làm việc và lưu script dưới tên `brief_doctor.py` (đã chạy thử với Python 3, chỉ dùng thư viện chuẩn):

```python
#!/usr/bin/env python3
"""brief_doctor.py — soi các kiểu thối của BRIEF.md. Exit 0 = sạch, 1 = có lỗi."""
import re, sys, argparse
from datetime import datetime, timedelta

p = argparse.ArgumentParser()
p.add_argument("brief")
p.add_argument("--now", help="YYYY-MM-DDTHH:MM (mặc định: giờ máy)")
p.add_argument("--lock-max-min", type=int, default=90)
p.add_argument("--pause-max-days", type=int, default=3)
p.add_argument("--done-max-days", type=int, default=3)
p.add_argument("--max-lines", type=int, default=300)
a = p.parse_args()

now = datetime.fromisoformat(a.now) if a.now else datetime.now()
lines = open(a.brief, encoding="utf-8").read().splitlines()
TASK = re.compile(r"^(\d+)\.\s+\[([^\]]*)\]")
DT = r"(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?"
NUM = re.compile(r"\b\d+\s*(suite|test|fail|lỗi|ms|giây|phút|%)", re.I)
PROV = re.compile(r"\(đo \d{4}-\d{2}-\d{2}")
errors = []

def when(s):
    m = re.search(DT, s)
    if not m:
        return None
    return datetime.fromisoformat(m.group(1) + "T" + (m.group(2) or "00:00"))

if len(lines) > a.max_lines:
    errors.append(f"file {len(lines)} dòng > {a.max_lines}: tách REFERENCES.md / BRIEF-done.md")

for i, line in enumerate(lines):
    m = TASK.match(line)
    if not m:
        if NUM.search(line) and not PROV.search(line):
            errors.append(f"L{i+1}: con số không có mốc '(đo YYYY-MM-DD …)': {line.strip()[:70]}")
        continue
    no, state = m.group(1), m.group(2).strip()
    t = when(state)
    if state.startswith("lock"):
        if t is None:
            errors.append(f"task {no}: lock thiếu ngày+giờ")
        elif now - t > timedelta(minutes=a.lock_max_min):
            errors.append(f"task {no}: lock mồ côi ({int((now - t).total_seconds() // 60)} phút)")
    elif state.startswith("wait"):
        if t is None or now - t > timedelta(days=a.pause_max_days):
            errors.append(f"task {no}: wait chờ người quá {a.pause_max_days} ngày — hỏi lại hoặc archive")
    elif state.startswith("x"):
        body = []
        for nxt in lines[i + 1:]:
            if TASK.match(nxt) or nxt.startswith("#"):
                break
            body.append(nxt)
        if not any(re.search(r"commit|verdict|PASS", b) for b in body):
            errors.append(f"task {no}: x không có bằng chứng (commit/verdict) bên dưới")
        if t and now - t > timedelta(days=a.done_max_days):
            errors.append(f"task {no}: x quá {a.done_max_days} ngày chưa dọn sang BRIEF-done.md")
    elif state.startswith("drop"):
        errors.append(f"task {no}: drop phải nằm ở BRIEF-done.md, không nằm trong BRIEF.md")

for e in errors:
    print("FAIL", e)
print(f"{len(errors)} lỗi")
sys.exit(1 if errors else 0)
```

**Bước 2 — chiều đỏ.** Lưu file `bad.md`, mỗi task cố tình mang một kiểu thối:

```markdown
# repo-backend — BRIEF

1. [ ] sửa format tiền ở export CSV
   - hiện 8 suite fail pre-existing
2. [lock 2026-10-14 11:05] refactor webhook handler
3. [wait 2026-10-08] chọn index A hay B — chờ người quyết
4. [x 2026-10-09] thêm retry cho sync order
5. [drop 2026-10-10] dọn mirror khi xoá sản phẩm
```

```bash
python3 brief_doctor.py bad.md --now 2026-10-14T15:00; echo "exit=$?"
```

Output khi tác giả chạy thử:

```
FAIL L4: con số không có mốc '(đo YYYY-MM-DD …)': - hiện 8 suite fail pre-existing
FAIL task 2: lock mồ côi (235 phút)
FAIL task 3: wait chờ người quá 3 ngày — hỏi lại hoặc archive
FAIL task 4: x không có bằng chứng (commit/verdict) bên dưới
FAIL task 4: x quá 3 ngày chưa dọn sang BRIEF-done.md
FAIL task 5: drop phải nằm ở BRIEF-done.md, không nằm trong BRIEF.md
6 lỗi
exit=1
```

**Bước 3 — chiều xanh.** Lưu mẫu ở mục 3.7 thành `BRIEF.md`, chạy cùng lệnh với `--now 2026-10-14T15:00`. Phải ra `0 lỗi`, `exit=0`.

**Bước 4 — gắn vào loop.** Thêm một dòng vào bước cuối của skill loop (hoặc file hướng dẫn repo): *"Trước khi kết thúc lượt, chạy `python3 brief_doctor.py <BRIEF>`; exit khác 0 thì sửa file hoặc chuyển task sang `[wait]` và báo, không kết thúc lượt."*

**Xong khi:**

- [ ] `bad.md` cho `exit=1` với đúng 6 dòng `FAIL`.
- [ ] Mẫu 3.7 cho `exit=0`.
- [ ] Bạn sửa `bad.md` từng dòng một cho tới khi `exit=0`, và mỗi lần sửa thì số lỗi giảm đúng 1 hoặc 2 (task 4 mang hai lỗi). Nếu số lỗi không giảm như dự đoán, đọc lại regex trước khi tin script.
- [ ] Bạn viết được một `[ ]` thối mà script **vẫn xanh** — đây là giới hạn của nó (kiểu 1, mục 3.4), ghi lại để nhớ phải đối chiếu git.

---

## 5. Bẫy thường gặp

🪤 **Đánh `[x]` cho task không làm, "cho gọn".**
Triệu chứng: tuần sau tìm "task X xong bằng commit nào" thì không có commit. Nguyên nhân gốc: `[x]` bị dùng như "không cần quan tâm nữa" thay vì "đã có bằng chứng". Chặn bằng cơ chế: script báo lỗi mọi `[x]` không có `commit`/`verdict` ở dòng con; task bỏ thì chỉ có đường `drop` sang `BRIEF-done.md`.

🪤 **Rút ngưỡng lock cho loop "chạy nhanh hơn".**
Triệu chứng: hai agent cùng làm một task, hai nhánh sửa cùng file. Nguyên nhân gốc: ngưỡng nhỏ hơn thời gian thật của task + verifier, nên lock của một agent đang sống bị coi là mồ côi. Chặn: ngưỡng tính từ dữ liệu `lock`→`x` thật (mục 3.3), đặt làm tham số mặc định của script, không sửa tay theo cảm giác.

🪤 **Luật "15 lượt rỗng thì dừng" chỉ nằm trong lời dặn.**
Triệu chứng: luật đã ghi rõ, loop vẫn chạy hàng chục lượt rỗng. Nguyên nhân gốc: model không có bộ đếm bền qua các session. Chặn: bộ đếm nằm trong state — dòng `empty-streak: N` ở đầu `BRIEF.md`; case và cơ chế dừng đầy đủ ở [[ag-19-vong-lap-nhat-task]].

🪤 **Subagent sửa `BRIEF.md` trong worktree của nó.**
Triệu chứng: sau khi merge một nhánh task, vài `[x]` quay về `[ ]`. Nguyên nhân gốc: file nằm trong repo, worktree có bản sao lúc tạo nhánh; merge đưa bản cũ về. Chặn: đặt file ngoài repo code, hoặc thêm vào brief subagent dòng "không sửa file task list" **và** một bước main agent kiểm `git diff --name-only` của nhánh không chứa `BRIEF.md` trước khi commit.

🪤 **Uỷ quyền nói trong chat lúc đi về.**
Triệu chứng: sáng hôm sau loop đã push, hoặc ngược lại đã dừng ở việc lẽ ra được làm. Nguyên nhân gốc: chỉ dẫn trong hội thoại có thể mất sau compact (mục 3.1), và session cron mới không thấy hội thoại cũ. Chặn: mục "Uỷ quyền khi người vắng mặt" ở đầu file, script có thể kiểm mục này tồn tại.

🪤 **Tin "pre-existing" mà không đo.**
Triệu chứng: gate đỏ, agent ghi "lỗi có sẵn", verifier gật. Nguyên nhân gốc: số baseline không mốc, không ai chạy lại trên nhánh hiện tại. Chặn: luật 4 + bước đầu mỗi task là chạy gate trên base sạch và ghi số kèm `(đo …)`; cách gate có thể xanh giả ở [[ag-11-gate-xanh-gia]].

---

## 6. Chuyển giao

- Bài trước [[ag-14-subagent-va-brief]] dạy viết brief cho **một lần giao việc**; [[ag-17-soat-cheo-noi-dung]] dạy đặt sẵn số/thuật ngữ dùng chung trong brief. Bài này biến brief thành **state bền** mà nhiều lượt, nhiều ngày cùng đọc.
- Bài kế [[ag-19-vong-lap-nhat-task]] dựng vòng lặp quanh file này: nhặt tối đa N task `[ ]`, ghi `[lock]`, giao song song, verify, ghi `[x]` + commit, chạy `brief_doctor.py`, dừng khi rỗng. Thứ level 6 bỏ được là **checkpoint từng prompt** — người không cần ngồi bấm "làm tiếp", vì mọi thứ lượt sau cần biết đã nằm trên đĩa.
- [[ag-20-viec-nen-va-ack]] trả lời câu "lượt trước giao việc nền, làm sao biết nó xong" — tức làm sao `[lock]` được chuyển sang `[x]` đúng lúc.
- [[ag-21-loop-la-he-phan-tan]] đi tiếp từ giới hạn ở 3.3: khi một actor ghi file không còn đủ, bạn cần idempotency, lease thật, và mốc "đã xử lý" bằng hash. Nền tảng ở [[ds-21-idempotency]].
- Lên level 7, state không chỉ là danh sách task mà là cả bộ nhớ dài hạn: [[ag-22-second-brain]] dùng lại đúng các luật ở đây (nguồn gốc, tầng tin cậy, dọn định kỳ) cho ghi chú.

---

## 7. Tóm tắt

- Mỗi session bắt đầu với context mới và chỉ dẫn chỉ nói trong hội thoại có thể mất sau compact (docs Claude Code). Loop chạy nhiều giờ chỉ còn **file, git, và lệnh tự chạy lại**; `BRIEF.md` là shared state của cả hệ, và session sau đọc nó như sự thật.
- Trạng thái phải máy đọc được: `[ ]`, `[lock YYYY-MM-DD HH:MM]`, `[wait …]`, `[x …]`. Lock là mutex có hạn (lease); ngưỡng mồ côi lớn hơn task dài nhất kể cả verifier — đo, đừng đoán.
- Lock trên markdown chỉ đúng khi **một actor ghi**: main agent. Subagent không chạy git, không sửa file task list.
- Bốn kiểu thối — checkbox nói dối, lock treo, số cũ đọc như phép đo, doc lạc hậu đầu file — chung một gốc: state ghi một lần, không hạn dùng, không nguồn gốc, không ai chịu trách nhiệm làm nó mất hiệu lực.
- Case thực tế: 8/13 task `[ ]` đóng ngay khi dọn; ~170 lượt rỗng ≈ 14,17 giờ; "8 suite fail" đo lại còn 2; 1.668 dòng tách còn 499.
- Sáu luật: archive khác done; task điều tra để lại `file:line`; kết luận có tầng tin cậy; số có mốc đo; uỷ quyền ghi vào file; dọn file là một bước của loop.
- Một script như `brief_doctor.py` bắt được lock mồ côi, `wait` quá hạn, `[x]` thiếu bằng chứng, số thiếu mốc, file phình — nhưng không bắt được `[ ]` thối; cái đó phải đối chiếu git.
