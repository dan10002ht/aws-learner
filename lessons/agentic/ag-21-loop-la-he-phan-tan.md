# Bài 21 — Loop agent là một hệ phân tán nhỏ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra trong một loop agent của chính mình **các thành phần độc lập** (bộ hẹn giờ, agent làm việc, sổ cái trên đĩa, git, hệ bên ngoài) và **chỗ nào giữa chúng không có transaction chung**.
- Chọn **thứ tự "làm việc" và "ghi mốc đã xử lý"** sao cho loop là at-least-once, rồi làm từng bước đủ idempotent để chạy lại không gây hại.
- Đổi một mốc **theo thời gian** (`--since`, "lần chạy trước") sang mốc **theo tập đã xử lý** (hash, id), và tái hiện được trên máy một commit bị mốc thời gian bỏ sót.
- Đặt **TTL cho lock** của task dựa trên thời gian chạy đo được, và tính thử số agent chạy trùng khi TTL quá ngắn.
- Thiết kế **hàng đợi cho tài nguyên khan hiếm** (môi trường staging, slot build) và luật **tụt hạng có khai báo** khi một mode thiếu năng lực.

---

## 2. Tình huống

Case thực tế, ẩn danh, quan sát qua nhiều tuần — không phải benchmark.

Một dev có một job chạy mỗi sáng: đọc các commit mới của vài repo backend, nhờ agent tóm tắt thành ghi chú ("bản phát hành này sửa gì, root cause là gì") rồi lưu vào kho ghi chú cá nhân. Job viết rất gọn:

```bash
# Bản cũ — minh hoạ, rút gọn
since=$(date -r .state/watermark '+%Y-%m-%d %H:%M:%S')
git -C "$repo" fetch -q
git -C "$repo" log --since="$since" --format='%H %s' > /tmp/new-commits.txt
claude -p "Tóm tắt các commit trong /tmp/new-commits.txt ..."   # bước agent
touch .state/watermark                                           # ghi mốc
```

Job chạy hàng tuần, log sạch, không lần nào đỏ. Rồi một hôm, dev đối chiếu danh sách tag phát hành của một repo với kho ghi chú: **9 tag liên tiếp không có dòng nào** — grep cả kho ra 0 file cho từng tag. Lỗ này thực ra đã được ghi chú lại **bốn lần** trong các bản tổng kết trước ("có vẻ thiếu vài bản phát hành"), mà lần nào cũng chỉ ghi, không sửa được.

Một tuần trước đó, cùng dev, một job khác (đọc các thread thảo luận để học): khi chuyển job sang cơ chế mốc mới, dev chạy một lệnh **"mồi mốc"** — đánh dấu 20 thread là đã đọc mà không đọc nội dung, với lý do "job cũ đọc rồi". Lý do đó sai: job cũ chỉ từng thấy 8 thread. Hệ quả chỉ lộ ra khi đo bằng một bộ case giữ riêng: kho ghi chú chỉ trả lời được **3/11 case (27%)**, và 7 trong 8 case thiếu nằm đúng trong lô bị mồi.

Cả hai job đều "chạy đúng". Cả hai đều đánh mất dữ liệu **im lặng và vĩnh viễn**. Lý do không nằm ở agent hay prompt: nằm ở chỗ một loop tự chạy là **một hệ phân tán nhỏ**, và nó mắc đúng những lỗi kinh điển của hệ phân tán.

---

## ⏸ Dừng lại — đoán trước

Lượt job lúc 06:00 hôm nay chạy xong và `touch` watermark. Lúc 10:00, một đồng nghiệp push lên remote một commit **mà họ đã tạo trên máy mình từ 3 ngày trước** (làm offline, quên push). Sáng mai job chạy `git fetch` rồi `git log --since=<06:00 hôm nay>`.

**Commit đó có được đọc không?**

```
(a) Có — git fetch kéo nó về, nên nó "mới" với repo local
(b) Có — --since so với thời điểm commit tới remote
(c) Không, và lượt sau cũng không, trừ khi ai đó chạy lại với --since lùi xa hơn
(d) Không ở lượt mai, nhưng lượt kia sẽ thấy
```

Đáp án ở mục 3.4.

---

## 3. Cơ chế

### 3.1 Vì sao một loop agent là hệ phân tán

**Hệ phân tán** ở đây hiểu theo nghĩa hẹp: nhiều thành phần chạy độc lập, giao tiếp qua một kênh có thể hỏng, và **không có transaction chung** bao trùm cả chuỗi thao tác. Loop agent ở level 6 ([[ag-19-vong-lap-nhat-task]]) có đủ:

| Thành phần | Có thể hỏng thế nào |
|---|---|
| Bộ hẹn giờ (cron, `/loop`, job định kỳ) | bắn lượt mới khi lượt cũ chưa xong; máy ngủ thì bỏ lượt |
| Agent làm việc (subagent, CLI headless) | chết giữa chừng: hết quota, timeout, bị kill, context đầy |
| Sổ cái trên đĩa (`BRIEF.md`, file state) | ghi được một nửa; nói một điều đã sai từ hôm trước ([[ag-18-brief-la-shared-state]]) |
| Git (nhánh, commit, remote) | commit có rồi mà sổ chưa ghi; nhánh tồn tại từ lượt trước |
| Hệ bên ngoài (deploy, mở MR, gửi tin) | đã có hiệu ứng mà bạn không nhận được xác nhận ([[ag-20-viec-nen-va-ack]]) |

Một lượt loop đi qua nhiều thành phần đó theo thứ tự: đọc sổ → nhận task → agent làm → commit → ghi sổ → báo. **Bất kỳ ranh giới nào giữa hai bước cũng là chỗ process có thể chết.** Không có `BEGIN … COMMIT` nào gói "agent sửa code" và "đánh `[x …]` vào BRIEF" thành một khối nguyên tử.

Hệ quả: bạn không chọn được "chạy đúng một lần". Bạn chỉ chọn được **khi chết giữa chừng thì hệ thống lệch về phía nào** — mất việc, hay làm lặp việc. Đó là câu hỏi delivery semantics của messaging, dạy kỹ ở [[msg-02-delivery-semantics]].

### 3.2 Thứ tự ghi mốc quyết định bạn mất hay lặp

Mọi loop có một **mốc** (watermark): dấu hiệu "tới đây là đã xử lý". Hỏi một câu duy nhất: **ghi mốc trước hay sau khi làm việc?**

| Thứ tự | Chết ở giữa thì sao | Tên gọi |
|---|---|---|
| ghi mốc → làm việc | việc chưa làm nhưng mốc đã qua → **mất vĩnh viễn** | at-most-once |
| làm việc → ghi mốc | việc đã làm nhưng mốc chưa ghi → lượt sau **làm lại** | at-least-once |
| ghi mốc vô điều kiện (dù việc lỗi) | như hàng đầu, chỉ là trông giống hàng hai | at-most-once trá hình |

Job ở mục 2 rơi vào hàng thứ ba. `touch .state/watermark` nằm sau bước agent, nhưng script không có `set -e`: bước `claude -p` lỗi (hết quota, mạng rớt) thì script vẫn chạy tiếp tới `touch`. Lát commit của ngày hôm đó trôi qua mốc mà chưa ai đọc.

Bản sửa có hai phần, cả hai đều là cơ chế chứ không phải lời dặn:

```bash
set -euo pipefail                       # một lệnh lỗi -> dừng cả script, KHÔNG tới dòng ghi mốc
...
claude -p "..."                         # bước agent
cat /tmp/batch-hashes.txt >> .state/seen.txt   # chỉ chạy khi mọi thứ ở trên exit 0
```

Kinh nghiệm thực tế: **mặc định chọn at-least-once**, vì "làm lại" sửa được còn "mất" thì không ai thấy để sửa. Cái giá của at-least-once là mỗi bước phải chịu được việc chạy hai lần — tức **idempotent**: chạy một lần hay nhiều lần cho cùng kết quả cuối. Đây đúng là công thức "exactly-once = at-least-once + idempotent" của [[ds-21-idempotency]], áp xuống cỡ một script.

### 3.3 Idempotent từng bước — và bước nào không thể

Đi qua từng bước của một lượt loop điển hình, hỏi "chạy lần hai thì sao":

| Bước | Lần hai mà không xử lý gì thì | Cách làm cho idempotent |
|---|---|---|
| Nhận task trong BRIEF | nhận task đã `[x …]` | luật cứng: `[x …]` bỏ qua tuyệt đối; chỉ nhận `[ ]` hoặc lock đã hết hạn (3.5) |
| Tạo nhánh | `git switch -c` báo nhánh đã tồn tại → lượt hỏng | kiểm nhánh đã có (`git rev-parse --verify <nhánh>`) rồi mới quyết `switch` hay `switch -c` |
| Agent sửa code | sửa chồng lên phần đã sửa | agent đọc `git diff` của nhánh trước khi làm; brief ghi "nhánh có thể đã có commit dở" |
| Commit | `nothing to commit` exit 1 → `set -e` dừng | chỉ commit khi `git diff --cached --quiet` trả exit 1 (tức có thay đổi) |
| Mở MR / PR | MR thứ hai cho cùng nhánh | tra MR mở theo tên nhánh trước khi tạo |
| Ghi `[x …]` + hash commit | ghi trùng dòng | ghi đè theo id task, không append mù |
| Deploy lên hệ ngoài | **đẩy hai lần**, có hiệu ứng thật | không làm idempotent được rẻ → xem dưới |

Hàng cuối là loại khó. Case thực tế: một bước deploy extension lên môi trường staging của một app thương mại điện tử. Nó là bước duy nhất trong job mà chạy lại có hại, nên ba luật được đặt quanh nó:

1. **Đặt nó ở cuối.** Chết ở bước cuối không kéo bước nào khác theo.
2. **Biến nó thành "bước không chí mạng"**: hỏng thì ghi cảnh báo, job vẫn tính là xong phần chính. Lý do (kinh nghiệm thực tế): khi bước này đỏ vì một lỗi không liên quan của repo, mọi lượt đều kết thúc "HỎNG" trong khi 7/8 bước đã xong và môi trường dùng được. Để vậy, người dùng học cách lờ màu đỏ — mất luôn tín hiệu.
3. **Không bao giờ để nó ở trạng thái "không biết".** Bản đầu chạy lệnh deploy bằng `spawnSync` và giữ output trong bộ nhớ; output progress bar vượt `maxBuffer` 32MB, process bị giết **giữa chừng**, và không ai biết nó đã đẩy xong hay chưa. Với một thao tác không idempotent, "không biết" tệ hơn cả "hỏng". Sửa: cho output chảy thẳng ra file log (`>> deploy.log 2>&1`), đọc được cả khi đang chạy.

### 3.4 Mốc là "đã xử lý gì", không phải "đã trôi bao lâu"

Đáp án câu đoán trước: **(c)**.

Theo docs git, `--since=<date>` là "Show commits more recent than a specific date" (nguồn: https://git-scm.com/docs/git-log). "Date" ở đây là ngày **ghi trên commit**, không phải thời điểm commit tới remote hay tới máy bạn. Còn mốc của job là **mtime của file watermark** — thời điểm job chạy. Hai đồng hồ khác nhau, và `git fetch` làm chúng lệch:

```
Ngày 1  10:00   đồng nghiệp tạo commit X trên máy họ  (ngày ghi trên X = ngày 1)
Ngày 4  06:00   job chạy, touch watermark              (mốc = ngày 4 06:00)
Ngày 4  10:00   đồng nghiệp push X
Ngày 5  06:00   job: fetch kéo X về; log --since="ngày 4 06:00"
                → X mang ngày 1 < mốc → KHÔNG hiện
Ngày 6, 7, ...  mốc chỉ tiến lên → X không bao giờ hiện nữa
```

Đây là bài toán "không có đồng hồ toàn cục" của [[ds-16-clocks]] trong hình dạng đời thường: một sự kiện **tới muộn** mang dấu thời gian **cũ**. Mọi hệ chọn bản ghi bằng "thời gian lớn hơn mốc" đều dính: commit fetch muộn, tin nhắn được sửa sau khi gửi, file copy giữ mtime gốc, bản ghi đồng bộ từ thiết bị offline.

Cách chữa: mốc trở thành **tập những gì đã xử lý**, và tiêu chí chọn là "chưa có trong tập":

```bash
LOOKBACK_DAYS=21
git -C "$repo" log --since="$LOOKBACK_DAYS days ago" --format=%H \
  | grep -vxFf .state/seen/"$name".txt > /tmp/batch-hashes.txt || true
# ... agent xử lý /tmp/batch-hashes.txt ...
cat /tmp/batch-hashes.txt >> .state/seen/"$name".txt   # chỉ sau khi agent xong (set -e)
```

Cửa sổ `--since` vẫn còn, nhưng vai trò đã đổi: nó **không còn là tiêu chí chọn**, chỉ là trần nhìn lại để lệnh rẻ. Commit tới muộn trong vòng 21 ngày vẫn được bắt; tới muộn hơn 21 ngày thì vẫn rơi — chỉ là cửa sổ rộng hơn nhiều lần, và đó là một giới hạn bạn **biết** chứ không còn im lặng.

Cái giá, tính thử với số của case (case thực tế, một lần khởi tạo, không phải benchmark):

```python
so_hash = 64_198            # tổng hash sau khi khởi tạo tập cho vài repo
byte_moi_dong = 40 + 1      # SHA-1 hex 40 ký tự + xuống dòng
print(so_hash * byte_moi_dong / 1024 / 1024)   # ≈ 2.51 MB
```

2,5 MB đĩa local là rẻ. Cái giá thật nằm ở chỗ khác: **tập đó là state không được sao lưu**. Mất thư mục `.state/` thì lượt kế tiếp phải khởi tạo lại — và nếu khởi tạo bằng cách "coi mọi thứ cũ là đã đọc", bạn vừa tái tạo đúng lỗi mất im lặng.

Điều này dẫn tới case thứ hai ở mục 2: **mồi mốc**. Đánh dấu "đã xử lý" cho thứ chưa xử lý là ghi một lời nói dối vào state bền, cùng họ với đánh `[x …]` cho task chưa chạy. Nó nguy hiểm vì state chỉ có dạng `{hash, seen}` — thread đã đọc và thread bị mồi **trông giống hệt nhau**. Luật rút ra:

- Nếu buộc phải bỏ qua, state phải **phân biệt được** `read` với `skipped`:

  ```
  # .state/seen/<nguon>.tsv — mỗi dòng: id <TAB> trạng thái <TAB> thời điểm <TAB> lý do
  9f3c2e1...   read      2026-09-30T06:02:11Z
  a71b0d4...   skipped   2026-09-28T03:47:15Z   khoi-tao-lan-dau
  ```

- Lý do biện minh cho việc bỏ qua phải được **kiểm**, không chỉ được nêu. "Job cũ đọc rồi" kiểm được trong 30 giây bằng cách đếm thứ job cũ thực sự có (case thực tế: đếm ra 8, không phải 20).
- Phép kiểm "có sót không" phải hỏi **nguồn bên ngoài** (danh sách tag so với nội dung kho ghi chú), không hỏi state của chính job. Job đọc state của chính nó thì luôn thấy mình xanh ([[ag-11-gate-xanh-gia]]).

### 3.5 Lock là lease: phải có hạn, và hạn phải lớn hơn việc dài nhất

Khi loop bắn mỗi 5 phút mà một task chạy 40 phút, lượt sau sẽ thấy task đó vẫn `[ ]` nếu không có gì đánh dấu. Nên ngay khi nhận task, loop ghi lock lên sổ:

```markdown
3. [lock 2026-10-14 14:32] sửa format tiền ở export CSV
```

Đây là **mutex trên đĩa**: nó sống qua restart, mọi lượt sau đều đọc được. Nhưng mutex này **không tự nhả** khi agent giữ nó chết. Nên nó phải là **lease** — khoá có thời hạn: quá TTL (time-to-live) thì coi là mồ côi và nhận lại. Khái niệm lease, cùng vấn đề "người giữ lock cũ sống lại và ghi đè", dạy kỹ ở [[ds-15-coordination]].

Ba luật vận hành (từ một skill loop nhặt task, kinh nghiệm thực tế):

- stamp **dưới TTL** → đang chạy thật → bỏ qua task này.
- stamp **quá TTL** → mồ côi → nhận lại.
- **Trước khi coi là mồ côi, kiểm agent còn sống không** (danh sách agent/task nền của công cụ). Timestamp chỉ là phương án dự phòng khi mất trạng thái; cướp task của một agent còn sống là kiểu hỏng nặng nhất.

TTL bao nhiêu? Case thực tế ở [[ag-19-vong-lap-nhat-task]]: ngưỡng 30 phút làm **agent thứ hai bị spawn lên cùng worktree** khi task thật (build + test + hai vòng verifier) chạy hơn 60 phút; ngưỡng được nới lên 90.

Tính thử số agent chạy trùng (giả định đơn giản hoá: tick 5 phút, agent nhận lại ghi stamp mới):

```python
def so_agent_trung(D, ttl, tick=5):
    stamp, cuop = 0, 0
    for t in range(tick, D, tick):     # các tick trong lúc task gốc còn chạy
        if t - stamp > ttl:
            cuop += 1
            stamp = t
    return cuop

for D in (20, 45, 65, 100):
    print(D, so_agent_trung(D, 30), so_agent_trung(D, 90))
# 20 -> 0 / 0     45 -> 1 / 0     65 -> 1 / 0     100 -> 2 / 1
```

Đọc kết quả: TTL không được chọn theo cảm giác "bao lâu thì chắc là chết", mà theo **phân phối thời gian chạy thật** của task — TTL phải trên đuôi dài (p95/p99) chứ không phải median. Muốn biết đuôi của bạn: ghi thời điểm nhận và thời điểm đóng vào sổ, rồi tính. Chưa có số đo thì đừng điền số; đặt TTL rộng và đo trước.

Hai mặt trái phải chặn bằng cơ chế:

- **TTL dài = task thật sự mồ côi nằm chết lâu.** Đó là lý do luật "kiểm agent còn sống" đứng trước timestamp: nó cho phép nhả sớm khi biết chắc agent đã chết.
- **Lock treo làm loop chạy rỗng.** Mọi task đều `[lock …]` → loop bắn đều đặn và trả "không có task" hàng chục vòng, vẫn tốn token. Kinh nghiệm thực tế: muốn giảm vòng rỗng thì sửa ngưỡng lock (gỡ đúng nguyên nhân), đừng giãn nhịp loop (chỉ né nó).

**Khi có kernel thì để kernel giữ lock.** Trên Linux, `flock(1)` chạy một lệnh dưới khoá file: `flock [options] file command`, `-n` để "fail rather than wait", mã thoát mặc định khi đụng khoá là 1, và khoá "is automatically dropped when the file is closed" (nguồn: https://man7.org/linux/man-pages/man1/flock.1.html). Process chết thì file descriptor đóng, khoá tự nhả — không cần TTL, không cần dọn tay. Đây là lý do một hàng đợi build (3.6) chọn `flock` thay vì tự viết daemon canh lock. `[lock …]` trong Markdown cần TTL chính vì nó **không** có ai đóng hộ khi agent chết.

Một biến thể dễ bỏ qua: **tài nguyên có tên cố định là lock ngầm.** Case thực tế: runner hàng đợi chạy build trong một systemd scope tên cố định `slot-job`. `kill -9` runner không kéo theo tiến trình build con; tiến trình mồ côi giữ scope sống, nên runner mới bị từ chối "Unit slot-job.scope was already loaded" — **im lặng**, mỗi vòng quét 3 giây hỏng một lần. Hệ tự khỏi sau khoảng 9 giây vì build mồ côi chạy xong, nhưng đó là may chứ không phải thiết kế. Sửa: dọn scope cũ trước khi dựng runner (chỉ khi `flock` chứng minh không còn runner nào), và nếu không dọn được thì bỏ tên cố định. Bài học kèm theo: done-criteria "kill -9 giữa bước build" đáng tồn tại, vì không test thì lỗi này chỉ xuất hiện lần đầu lúc runner chết thật, giữa đêm.

### 3.6 Hàng đợi slot: tài nguyên khan hiếm phải xếp hàng, và hàng phải hiện ra

Agent nhiều thì rẻ; môi trường để **chứng minh** việc agent làm (một bản app chạy thật, một DB staging) thì ít. Case thực tế: một VM nhỏ chạy 4 "slot" staging để verify task trên app thật. Ban đầu mỗi slot giữ một watcher build thường trú tốn khoảng 1,9 GB khi đứng yên, nên VM chỉ chạy được 2 slot. Đổi sang:

1. **Hàng đợi build toàn cục, một job nặng một lượt.** Job là file trong thư mục, đánh số; runner được sinh khi có job, giữ `flock`, xử lý xong thì thoát. Không có daemon thường trú phải canh.
2. **Mỗi slot một cgroup riêng** để một build phình RAM không kéo cả máy.
3. **Bộ đếm số job bền** trên đĩa. Bản đầu đếm `max(số trong hàng) + 1`, nên số quay về #1 mỗi lần hàng rỗng; hai job khác nhau cùng tên "#1" trong một file log làm người đọc log tin sai. Id phải **không bao giờ dùng lại** — cùng lý do hash ở 3.4 tốt hơn thời gian.

Kết quả đo sau khi đổi (case thực tế, một lần đo): 4 slot cùng chạy, tổng RSS 1388 MB; slot idle khoảng 250–300 MB thay vì khoảng 2100 MB. Ràng buộc chuyển từ RAM sang đĩa.

Điều quan trọng hơn với người vận hành loop: **thời gian chờ slot phải hiện ra như một cột riêng**. Đo trên pipeline của team (case thực tế): chờ môi trường chiếm hơn 90% wall-clock của cả luồng (từ 1h52m tới 27h45m), so với 4–10 giây để agent ra MR. Giấu khoảng chờ vào "đang chạy" thì mọi task trông như treo, và người sẽ đi "sửa" agent trong khi thứ chậm là hàng đợi.

Hệ quả ngược đáng khai thác: task **chứng minh được bằng test** thì không cần slot, nên bỏ hẳn được khoảng chờ lớn nhất. "Nhanh" ở đây không đến từ thêm agent, mà từ việc phân loại sớm task nào cần app thật.

### 3.7 Hai môi trường chạy: lệch âm thầm và luật tụt hạng có khai báo

Loop thường chạy được ở hai nơi: **local** (máy bạn) và **VM/server** (chạy khi bạn ngủ). Yêu cầu tự nhiên là "hai bên tương tự nhau". Cách hỏng của mọi hệ hai-mode không phải là sập, mà là **lệch âm thầm**: một bên thiếu một năng lực, stage vẫn chạy, verdict vẫn in `PASS` — chỉ là nó chứng minh ít hơn. Một `PASS` dựa trên gate suông trông y hệt một `PASS` có A/B trên app thật.

Cơ chế chặn: một **hợp đồng năng lực** được kiểm mỗi lượt bằng một lệnh doctor, chia hai hạng:

| Năng lực | Hạng | Thiếu thì |
|---|---|---|
| git, runtime, CLI agent, sổ cái ghi được, hàng đợi ghi được | bắt buộc | doctor exit 1, **runner không chạy** ở mode đó |
| executor thứ hai (model họ khác) | tuỳ chọn | tụt về executor chính, **log** `executor: <tên> (fallback — <lý do>)` |
| trình duyệt headless | tuỳ chọn | A/B chỉ bằng test, MR ghi rõ "chưa có ảnh UI" |
| slot staging | tuỳ chọn | task cần app thật → `blocked: cần slot — chỉ mode vm`, **không** PASS bằng gate suông |

Hai thứ **không được khác** giữa hai mode: hợp đồng đầu ra (MR trông thế nào, verdict nghĩa là gì) và luật verify. Khác ở đó thì số đo của mode này không nói gì về mode kia.

Chọn "tụt hạng có khai báo" thay vì hai lựa chọn còn lại vì: chặn hẳn khi thiếu năng lực tuỳ chọn thì mode local gần như không làm được gì; còn âm thầm chạy tiếp thì sinh ra `PASS` nói dối.

Và bản thân doctor là một gate, nên nó cũng phải **chứng minh được mình đỏ được**. Case thực tế: bản đầu tin exit code của `<cli> --version`, nhưng wrapper của CLI in lỗi rồi vẫn exit 0. Sửa: đòi cả exit 0 **và** stdout có chuỗi phiên bản. Doctor chưa từng đỏ lần nào thì hoặc môi trường luôn đủ, hoặc nó không bắt được gì — hãy cố ý tháo một năng lực để thấy nó đỏ.

### 3.8 Bảng đối chiếu

Sau khi đã thấy từng cơ chế, đây là bản đồ thu gọn từ khái niệm hệ phân tán sang loop agent:

| Khái niệm | Trong loop agent | Lỗi kinh điển | Cơ chế chặn |
|---|---|---|---|
| Delivery semantics | thứ tự "làm việc" vs "ghi mốc" | ghi mốc vô điều kiện | `set -e`, ghi mốc sau cùng |
| Idempotency | mỗi bước chịu được chạy lại | nhánh/MR/commit trùng; deploy hai lần | check-then-create; bước không idempotent đặt cuối |
| Logical clock / id | mốc = tập hash/id đã xử lý | `--since` bỏ sót sự kiện tới muộn | tập `seen` + trần nhìn lại |
| Lease | `[lock YYYY-MM-DD HH:MM]` có TTL | TTL ngắn → agent trùng; TTL dài → task chết lâu | TTL theo đuôi phân phối + kiểm agent còn sống |
| Kernel lock | `flock` cho hàng đợi | lock tự viết không nhả khi process chết | để kernel giữ; tránh tên tài nguyên cố định |
| Queue | hàng đợi slot/build | chờ ẩn trong "đang chạy"; id dùng lại | cột chờ hiện rõ; bộ đếm bền |
| Degraded mode | local vs VM | lệch âm thầm, `PASS` nói dối | hợp đồng năng lực + tụt hạng có khai báo |

---

## 4. Làm thử

Mục tiêu: tự tay thấy mốc thời gian bỏ sót một commit tới muộn, và mốc hash bắt được nó. Chạy được trên macOS và Linux, chỉ cần `git` và `bash`. Đã chạy thử với git 2.48.

### 4.1 Tái hiện mất dữ liệu im lặng

Lưu thành `demo-moc.sh` trong một thư mục trống:

```bash
#!/usr/bin/env bash
# Tái hiện: commit tới muộn mang ngày cũ -> mốc thời gian bỏ sót, mốc hash bắt được
set -euo pipefail
rm -rf origin clone state && mkdir state
git init -q origin && cd origin
git -c user.name=a -c user.email=a@x commit -q --allow-empty -m "c1 (hôm nay)"
cd .. && git clone -q origin clone

# Lượt 1 của job: đọc xong, ghi mốc theo cả hai cách
( cd clone && git log --format=%H ) > state/seen.txt
touch state/watermark                       # mốc thời gian = lúc job chạy

# Một commit được tạo 3 ngày trước ở máy khác, bây giờ mới về remote
cd origin
old="@$(( $(date +%s) - 3*86400 )) +0000"   # 3 ngày trước, dạng epoch git hiểu
GIT_AUTHOR_DATE="$old" GIT_COMMITTER_DATE="$old" \
  git -c user.name=b -c user.email=b@x commit -q --allow-empty -m "c2 (làm 3 ngày trước, push muộn)"
cd ../clone && git pull -q

since=$(date -r ../state/watermark '+%Y-%m-%d %H:%M:%S')
echo "== Mốc thời gian (--since '$since'):"
git log --since="$since" --format='%h %s' | sed 's/^/   /'
echo "   (rỗng = bỏ sót)"
echo "== Mốc hash (commit chưa có trong seen.txt):"
git log --format='%H %s' | grep -vFf ../state/seen.txt | cut -c1-7,41- | sed 's/^/   /'
```

```bash
chmod +x demo-moc.sh && ./demo-moc.sh
```

Output mong đợi (hash và giờ sẽ khác):

```
== Mốc thời gian (--since '2026-10-14 12:08:40'):
   (rỗng = bỏ sót)
== Mốc hash (commit chưa có trong seen.txt):
   fec6563 c2 (làm 3 ngày trước, push muộn)
```

### 4.2 Áp vào loop của bạn

1. Liệt kê mọi mốc trong loop/job bạn đang chạy: watermark, "lần chạy trước", `last_run_at`, `--since`, `updated_at > ?`. Với mỗi mốc, ghi: **nó so với đồng hồ nào**, và **sự kiện có thể tới muộn với dấu thời gian cũ không**.
2. Với mỗi mốc, tìm dòng ghi mốc và trả lời: script có dừng **trước** dòng đó khi bước chính lỗi không? Kiểm bằng cách cố ý làm bước chính lỗi (ví dụ đặt sai đường dẫn CLI) rồi xem mốc có đổi không.
3. Với lock của task: lấy thời điểm nhận và đóng của 20 task gần nhất trong sổ (hoặc log), tính p95 thời gian chạy, so với TTL đang dùng. Chưa có dữ liệu thì thêm hai trường đó vào sổ trước, chưa sửa TTL.
4. Với mỗi bước có hiệu ứng ra ngoài (deploy, mở MR, gửi tin), ghi "chạy hai lần thì sao" như bảng 3.3.

### 4.3 Tiêu chí "xong" — kiểm được

- [ ] `demo-moc.sh` in **rỗng** ở phần mốc thời gian và **có c2** ở phần mốc hash.
- [ ] Mỗi mốc trong loop của bạn có một dòng ghi: đồng hồ so sánh, có/không chịu sự kiện tới muộn.
- [ ] Thử nghiệm ở bước 4.2.2 cho thấy mốc **không** đổi khi bước chính lỗi (nếu đổi, bạn đã tìm ra một lỗ mất dữ liệu).
- [ ] TTL lock có ghi kèm con số đo được (p95) và lệnh/nguồn đã đo — hoặc ghi rõ "chưa đo" và kế hoạch đo.
- [ ] Mỗi bước có hiệu ứng ngoài có cột "chạy hai lần thì sao" được điền.

---

## 5. Bẫy thường gặp

### 🪤 Bẫy 1 — Ghi mốc vô điều kiện
**Triệu chứng:** job xanh mỗi ngày nhưng có khoảng dữ liệu không ai đọc. **Gốc:** dòng ghi mốc chạy kể cả khi bước chính lỗi (thiếu `set -e`, hoặc `|| true` nuốt lỗi). **Chặn:** `set -euo pipefail`; ghi mốc là lệnh cuối; thêm một test cố ý làm bước chính lỗi và kiểm mốc không đổi.

### 🪤 Bẫy 2 — Mốc theo thời gian cho dữ liệu tới muộn
**Triệu chứng:** thiếu những bản ghi lẻ tẻ, không có quy luật, không lỗi nào trong log. **Gốc:** so dấu thời gian của sự kiện với đồng hồ của job; sự kiện tới muộn mang dấu cũ. **Chặn:** mốc là tập id/hash đã xử lý; cửa sổ thời gian chỉ làm trần nhìn lại; định kỳ đối chiếu với nguồn ngoài (danh sách tag, danh sách id của hệ nguồn).

### 🪤 Bẫy 3 — Mồi mốc để "khỏi phải đọc lại"
**Triệu chứng:** sau khi đổi cơ chế, chất lượng đầu ra tụt mà không có lỗi nào. **Gốc:** đánh dấu đã xử lý cho thứ chưa xử lý; state không phân biệt `read` với `skipped`. **Chặn:** state có cột trạng thái; lý do bỏ qua phải kèm lệnh kiểm; đo bằng bộ case giữ riêng sau mỗi lần đổi cơ chế.

### 🪤 Bẫy 4 — TTL lock đặt theo cảm giác
**Triệu chứng:** hai agent sửa cùng worktree, commit đè nhau; hoặc loop chạy rỗng hàng chục vòng. **Gốc:** TTL ngắn hơn đuôi thời gian chạy thật, hoặc lock không bao giờ hết hạn. **Chặn:** TTL theo p95 đo được; trước khi cướp lock, kiểm agent còn sống; ghi thời điểm nhận/đóng vào sổ để đo được.

### 🪤 Bẫy 5 — Tài nguyên tên cố định sống lâu hơn process
**Triệu chứng:** runner mới không khởi động được, lỗi lặp mỗi vòng quét, đôi khi tự khỏi. **Gốc:** tiến trình con mồ côi giữ một tài nguyên có tên cố định (unit, port, file pid). **Chặn:** dọn tài nguyên cũ khi đã chứng minh không còn chủ (`flock` lấy được); không dọn được thì để hệ thống tự đặt tên; có done-criteria "kill -9 giữa chừng rồi chạy lại".

### 🪤 Bẫy 6 — Bước không idempotent nằm giữa chuỗi
**Triệu chứng:** chạy lại một job lỗi thì hệ ngoài bị đẩy hai lần, hoặc không ai biết lần trước đã đẩy chưa. **Gốc:** bước có hiệu ứng ngoài đặt trước các bước dễ lỗi; output bị giữ trong bộ nhớ rồi mất khi process chết. **Chặn:** đặt cuối; log chảy ra file; có lệnh đọc trạng thái hệ ngoài trước khi đẩy.

### 🪤 Bẫy 7 — Hai mode "tương tự nhau" theo niềm tin
**Triệu chứng:** task PASS ở local, hỏng khi lên môi trường thật; MR không nói nó đã chứng minh tới đâu. **Gốc:** mode thiếu năng lực vẫn chạy stage và in cùng verdict. **Chặn:** doctor kiểm hợp đồng năng lực mỗi lượt; thiếu tuỳ chọn thì tụt hạng **có ghi trong đầu ra**; cố ý tháo một năng lực để thấy doctor đỏ.

---

## 6. Chuyển giao

- Bài trước, [[ag-20-viec-nen-va-ack]], dạy cách biết **một** việc nền đã xong thật. Bài này mở rộng ra **cả vòng lặp**: khi nhiều lượt, nhiều agent, nhiều nơi chạy, thứ gì giữ cho tổng thể không mất và không lặp có hại.
- Sổ cái mà mọi cơ chế ở đây ghi vào là `BRIEF.md` của [[ag-18-brief-la-shared-state]]; vòng nhặt task dùng các lock ở 3.5 là [[ag-19-vong-lap-nhat-task]].
- Muốn đào sâu lý thuyết: [[msg-02-delivery-semantics]] (at-most/at-least/exactly-once), [[ds-21-idempotency]] (idempotency key, dedup store), [[ds-15-coordination]] (lease, fencing token), [[ds-16-clocks]] (vì sao không tin được đồng hồ), [[ds-22-reliability-patterns]] (timeout, retry, backoff).
- Level 7 bỏ được việc **tự khởi động và tự nhớ**: job chạy theo lịch khi bạn không ngồi máy ([[ag-23-job-dinh-ky-va-bot]]) và bộ nhớ dài hạn được nạp từ chính các job như ở mục 2 ([[ag-22-second-brain]]). Không có các cơ chế của bài này, level 7 chỉ là mất dữ liệu nhanh hơn và lúc không ai nhìn.

---

## 7. Tóm tắt

- Một loop agent gồm bộ hẹn giờ, agent, sổ cái, git và hệ ngoài, **không có transaction chung** — nên nó mắc lỗi của hệ phân tán.
- Không chọn được "đúng một lần"; chỉ chọn được chết giữa chừng thì **mất** hay **lặp**. Mặc định at-least-once: làm việc rồi mới ghi mốc, với `set -e`.
- At-least-once đòi mỗi bước **idempotent**; bước không thể idempotent (deploy) đặt cuối, không chí mạng, log ra file.
- Mốc là **tập id/hash đã xử lý**, không phải thời gian đã trôi; sự kiện tới muộn mang dấu cũ sẽ lọt qua mốc thời gian vĩnh viễn. Không mồi mốc; state phân biệt `read` với `skipped`.
- Lock trên đĩa là **lease**: TTL theo đuôi thời gian chạy đo được, kiểm agent còn sống trước khi cướp; có kernel thì để `flock` giữ.
- Tài nguyên khan hiếm đi qua **hàng đợi** có id bền và khoảng chờ hiện rõ; task chứng minh được bằng test thì bỏ được khoảng chờ đó.
- Hai mode chạy phải có **hợp đồng năng lực** kiểm mỗi lượt; thiếu thì tụt hạng có khai báo, không bao giờ in `PASS` nói dối.
