# Bài 25 — Tự động hoá mọi việc, và chỗ phải dừng

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chấm một việc bằng ba trục **tần suất × thời gian**, **rủi ro** (đọc/ghi, hoàn tác được không, dữ liệu của ai) và **có chủ đầu ra không**, rồi ra kết luận "tự động tới mức nào" hoặc "dừng" bằng một script chạy được.
- Tính thử chi phí token của một task trong loop và của một job định kỳ từ bảng giá chính thức, và chỉ ra thành phần nào chiếm nhiều tiền nhất.
- Đặt người duyệt vào **đúng cửa**: đầu vào, cửa ghi không hoàn tác, đầu ra, lịch review. Không đặt người duyệt ở mỗi bước.
- Dựng công tắc dừng cho một automation: mặc định tắt, dry-run trước, kill switch độc lập, `disable` thay vì xoá, có ngày review.
- Viết lộ trình 4 tuần để đi từ level hiện tại (kết quả audit ở [[ag-01-bay-level]]) lên level kế tiếp, mỗi tuần có một tiêu chí xong kiểm được.

---

## 2. Tình huống

Case thực tế, ẩn danh, một lần chạy (không phải benchmark).

Một dev dựng hệ thống agent support chạy 24/7 cho một app SaaS thương mại điện tử. Đường đi của một ca:

1. Bot bắt ticket mới trong kênh support của team.
2. Agent điều tra: đọc log, query dữ liệu production (chỉ đọc), dựng lại lỗi.
3. Một họ model viết bản sửa, họ model kia chấm (chấm chéo, xem [[ag-16-hai-ho-model]]).
4. Qua cổng "đỏ trước fix → xanh sau fix", bot mở **merge request nháp**.

Hệ thống chạy khoảng một tháng. Rồi có hai thay đổi.

**Thứ nhất, đầu ra mất chủ.** Việc xử lý bug support được giao cho một người khác trong team. Từ đó, merge request do bot mở không còn ai coi là đầu vào công việc của mình. Máy vẫn chạy và vẫn mở MR, nhưng không ai review chúng. Mỗi MR sai còn tốn thời gian của người khác để bác.

**Thứ hai, gate xanh mà bản sửa sai.** Trong cùng một ngày, bot mở MR cho một lỗi thanh toán. Bản sửa **nuốt mất một ca đặc biệt**: thanh toán đang chờ khách xác thực thêm, nên chưa có kết quả. Cổng đỏ→xanh vẫn qua, bộ test xanh **42/42**. Test được viết cho ca thường, nên không test nào chạm tới ca đó. (Vì sao verifier độc lập vẫn PASS bản sửa này, và bước nào bắt được nó: [[ag-12-verifier-doc-lap]].)

Người vận hành quyết định:

| Phần | Trạng thái |
|---|---|
| Bắt ticket, điều tra, viết fix, mở MR | **disable** (không xoá) |
| File `PAUSE` mà mọi service đọc lúc khởi động | **bật**, làm chốt thứ hai phòng ai đó bật lại service |
| Job tối đọc thread support và ghi bài học vào kho ghi chú | **giữ** |
| Code, unit, secret trên máy chạy | giữ nguyên, bật lại bằng một lệnh |
| Ngày review | 3 tháng sau, kèm sẵn câu hỏi phải trả lời |

Vì sao tắt phần ghi? Trong ghi chú quyết định, người vận hành viết: *một MR nháp chỉ có giá trị khi có người nhận nó làm đầu vào*. Và: *cổng cơ học không thay được người đọc diff* ở loại việc này.

---

## ⏸ Dừng lại — đoán trước

Trước khi có quyết định trên, team cân nhắc bốn phương án:

```
(a) Giữ nguyên tất cả. Gate vẫn xanh, chỉ cần viết thêm test cho ca đặc biệt.
(b) Xoá sạch hệ thống. Nó vừa ship một bản sửa sai.
(c) Tắt phần ghi (mở MR), giữ phần đọc (học từ thread), giữ code để bật lại.
(d) Giữ phần ghi, nhưng thêm bước bắt người bấm duyệt từng MR trước khi mở.
```

Phương án nào đúng? Và vì sao (d), nghe rất "an toàn", lại không cứu được tình huống?

Đáp án ở §3.1 và §3.4.

---

## 3. Cơ chế

### 3.1 Ba trục chấm một việc

Đáp án ⏸ là **(c)**.

- **(a)** sửa đúng triệu chứng thứ hai, nhưng bỏ qua triệu chứng thứ nhất: không ai nhận đầu ra.
- **(b)** vứt luôn phần đọc. Thread support vẫn là nguồn học tốt nhất đang có, vì nó chứa root cause thật và giả định đã bị dữ liệu bác.
- **(d)** hỏng ở §3.4: người duyệt chỉ có nghĩa khi đó là **chủ đầu ra**. Không có chủ thì chỉ còn một người bấm "Yes" cho xong.

Từ case này rút ra ba câu hỏi phải trả lời cho **từng** việc, trước khi tự động nó.

**Trục 1 — Giá trị: tần suất × thời gian.** Mỗi tháng việc này xảy ra bao nhiêu lần? Mỗi lần tốn bao nhiêu phút người? Sau khi tự động, còn lại bao nhiêu phút người (đọc kết quả, duyệt, xử lý ngoại lệ)? Phần chênh nhân với tần suất là số giờ bạn lấy lại mỗi tháng. Đem chia số giờ dựng cơ chế cho nó, bạn được **thời gian hoà vốn**.

**Trục 2 — Rủi ro: đọc/ghi, hoàn tác, của ai.** Trục này lấy lại bảng phân loại ở [[ag-05-checkpoint-tung-buoc]] §3.3. Câu hỏi gốc là: *nếu nó sai thì lùi được không, lùi bằng gì, và ai biết chuyện đầu tiên?* Trục này đặt **trần**: giá trị cao tới đâu cũng không kéo một việc ghi-không-hoàn-tác lên mức "tự chạy".

**Trục 3 — Có chủ đầu ra và có gate đỏ được không.**
- **Chủ đầu ra**: một người cụ thể coi kết quả của automation là đầu vào công việc của họ, ví dụ người merge MR hay người đọc digest mỗi sáng. Không có chủ thì kết quả chỉ chất đống.
- **Gate đỏ được**: lệnh kiểm từng chạy ra đỏ trên code sai ([[ag-11-gate-xanh-gia]]). Việc ghi mà không có gate như vậy thì tự động hoá chỉ làm sai nhanh hơn.

Ba trục độc lập nhau. Case §2 đạt điểm cao ở trục 1 (ticket đến đều, mỗi ca tốn người nhiều phút). Nó trượt ở trục 3, và một phần ở trục 2 (sửa luồng thanh toán là ghi vào code đường tiền).

### 3.2 Rủi ro đặt trần cho mức tự động

Bốn lớp rủi ro. Mỗi lớp có một mức tự động tối đa.

- **R0 — Chỉ đọc.** Ví dụ: tóm tắt commit, điều tra log, đọc thread. Sai thì chạy lại, không có gì phải lùi. Mức tối đa: **job tự chạy theo lịch, người đọc kết quả** (level 7, xem [[ag-23-job-dinh-ky-va-bot]]).
- **R1 — Ghi, lùi được bằng lưới có sẵn.** Ví dụ: sửa file trong repo, commit trên nhánh riêng. Git là đường lùi. Mức tối đa: **loop + gate + verifier, người đọc kết quả tổng** (level 6, [[ag-19-vong-lap-nhat-task]]).
- **R2 — Ghi, lùi bằng đường tự dựng.** Ví dụ: script có `revert`, migration có `down`, ghi vào môi trường test của chính mình. Đường lùi chỉ tồn tại nếu bạn đã viết nó **và đã chạy thử nó**. Mức tối đa: **agent chạy sau một lượt dry-run, nói trước nó sẽ ghi gì**.
- **R3 — Ghi không lùi được, hoặc ghi lên dữ liệu người khác.** Ví dụ: charge tiền, gửi email cho khách, push lên nhánh chung, migration production, sửa code đường tiền đang chạy. Mức tối đa: **agent soạn nháp đầy đủ (lệnh, diff, mô tả nó ghi gì), người bấm chạy**.

Vì sao lại là trần, chứ không phải "trừ điểm"? Hai loại chi phí không cùng đơn vị. Giờ tiết kiệm được cộng dồn từ từ. Một lần ghi sai ở R3 thì trả một lần, có thể lớn hơn toàn bộ số giờ tiết kiệm cả năm, và người trả có khi không phải bạn mà là khách của khách hàng.

Case §2 rơi vào R3 vì "sửa luồng thanh toán". Việc đó vẫn để agent làm được, nhưng phải dừng ở mức "soạn nháp, chủ đầu ra đọc và merge". Hệ thống đã dừng đúng ở mức đó (MR **nháp**). Thứ nó mất là **chủ**.

Docs của Claude Code tự phân lớp giống vậy. Ở permission mode `auto`, một model phân loại (classifier) duyệt thay người. Danh sách *"Blocked by default"* gồm *"Production deploys and migrations"*, *"Force push"*, *"Irreversibly destroying files that existed before the session"*, *"Merging a pull request no human has approved"*, *"Toggling, ramping, or deleting a production feature flag"* (nguồn: https://code.claude.com/docs/en/permission-modes, mục *What the classifier blocks by default*). Đó gần như đúng lớp R3.

Bảng tra (đứng sau phần giải thích):

| Lớp | Đường lùi | Mức tự động tối đa | Người đứng ở đâu |
|---|---|---|---|
| R0 đọc | không cần | job theo lịch | đọc kết quả |
| R1 ghi, lùi bằng git | `git revert` | loop + gate + verifier | đọc tổng, merge |
| R2 ghi, lùi tự dựng | script `revert`/`down` đã chạy thử | chạy sau dry-run | duyệt bản dry-run |
| R3 không lùi / của người khác | không có | soạn nháp | bấm chạy |

### 3.3 Chi phí token: tính thử, rồi xem tiền nằm ở đâu

Cơ chế (dữ kiện, theo https://code.claude.com/docs/en/costs, mục *Why usage climbs in a long session*):
- Claude Code *"sends your full conversation with every request"*. Mỗi lần dùng tool, nó gửi thêm một request mang kết quả tool.
- Phần lịch sử được đọc lại ở mức giá cached token.
- Lần gửi đầu tiên sau một khoảng nghỉ dài hơn thời hạn cache sẽ *"misses the cache and reprocesses your full context"*. Thời hạn cache là *"an hour on a subscription"*. Với API key hoặc cloud provider, *"it's five minutes by default"*.

Giá lấy từ https://platform.claude.com/docs/en/about-claude/pricing, **xem ngày 2026-10-14** (USD / 1M token, giá list, chưa tính batch hay data residency):

| Model | Input | Cache write 5m | Cache write 1h | Cache hit | Output |
|---|---|---|---|---|---|
| Opus 5.5 | 4.00 | 5.00 | 8.00 | 0.20 | 20.00 |
| Sonnet 5.5 | 2.00 | 2.50 | 4.00 | 0.10 | 10.00 |
| Haiku 5.5 (prompt ≤ 100k) | 0.10 | 0.125 | 0.20 | 0.01 | 0.50 |

Trang giá ghi cache hit của Opus 5.5 và Sonnet 5.5 là *"0.05x the base input price"*. Giá đổi thường xuyên, nên tính lại theo ngày bạn đọc bài.

**Phép tính 1 — một task trong loop.** Các số dưới đây là **giả định để minh hoạ cách tính**, không phải số đo:
- Worker chạy 40 request, context tăng dần từ 20k lên 120k token. Mỗi request có 3k token mới (ghi cache 5m) và trả 1,5k token output.
- Verifier chạy 15 request, context từ 15k lên 60k, mỗi request trả 800 token output.

```python
# Giá list USD/1M token, pricing page xem 2026-10-14
P = {"sonnet-5.5": dict(w5m=2.50, hit=0.10, out=10.00),
     "opus-5.5":   dict(w5m=5.00, hit=0.20, out=20.00)}
M = 1_000_000
def run(model, n_req, ctx_start, ctx_end, new_per_req, out_per_req):
    p, cost = P[model], 0.0
    for i in range(n_req):
        ctx = ctx_start + (ctx_end - ctx_start) * i / max(n_req - 1, 1)
        cost += (ctx - new_per_req) * p["hit"] / M      # lịch sử đọc lại từ cache
        cost += new_per_req * p["w5m"] / M              # phần mới ghi vào cache
        cost += out_per_req * p["out"] / M              # output
    return cost
worker = dict(n_req=40, ctx_start=20_000, ctx_end=120_000, new_per_req=3_000, out_per_req=1_500)
verif  = dict(n_req=15, ctx_start=15_000, ctx_end=60_000,  new_per_req=3_000, out_per_req=800)
for m in P:
    t = run(m, **worker) + run(m, **verif)
    print(m, f"task ${t:.2f}", f"20 task/đêm ${20*t:.2f}", f"22 đêm ${22*20*t:.2f}")
# sonnet-5.5 task $1.45  20 task/đêm $29.04  22 đêm $638.99
# opus-5.5   task $2.90  20 task/đêm $58.09  22 đêm $1277.98

# Tách riêng worker Sonnet 5.5: cache hit $0.27 | cache write $0.30 | output $0.60
```

Ba điều đọc ra:

1. **Tiền nằm ở output và cache write, không nằm ở cached token.** Với bộ giả định trên, 40 request đọc lại tổng cộng 2,68M cached token nhưng chỉ tốn $0,27. Output 60k token tốn $0,60. Vì vậy ngưỡng "200M cached token/ngày" ở [[ag-01-bay-level]] (phát biểu của một người, chưa xác minh) quy ra tiền khá rẻ: 200M × $0,10 = $20 trên Sonnet 5.5. Nó là tín hiệu về **số request**, không phải về chi phí.
2. **Đổi model nhân đôi cả hoá đơn.** Opus 5.5 đắt gấp đôi Sonnet 5.5 ở mọi cột. Docs khuyên *"Sonnet handles most coding tasks well and costs less than Opus"*, và gợi ý `model: haiku` cho subagent làm việc đơn giản (cùng trang costs). Trong loop, worker chạy theo brief chặt thường không cần model lớn nhất. Verifier thì tuỳ: xem [[ag-12-verifier-doc-lap]].
3. **Đặt chi phí cạnh giờ người, đừng đặt nó một mình.** $1,45/task chỉ có nghĩa khi so với số phút người task đó thay được (trục 1 ở §3.1). Chưa đo thì đừng điền số. Cách đo nằm ở dưới.

**Phép tính 2 — job định kỳ để quên.** Docs ghi: *"a scheduled task fires on its interval even while the session is idle, sending your full context each time"*. Giả định một session còn 150k token context, `/loop` chạy cả ngày, Sonnet 5.5, xác thực bằng API key (cache 5 phút), và giả định mỗi lần trượt cache sẽ ghi lại toàn bộ context ở giá ghi 5m:

```python
ctx = 150_000
every_4m  = 24*60 // 4    # 360 lần/ngày, khoảng cách < 5 phút → trúng cache
every_10m = 24*60 // 10   # 144 lần/ngày, khoảng cách > 5 phút → lần nào cũng trượt
print(every_4m  * ctx * 0.10 / 1e6)   # 5.4   USD/ngày
print(every_10m * ctx * 2.50 / 1e6)   # 54.0  USD/ngày
```

Chạy **thưa hơn** lại tốn **gấp 10 lần**. Nguyên nhân gốc: khoảng cách giữa hai lần chạy dài hơn thời hạn cache, nên lần nào cũng phải xử lý lại từ đầu. Cách chặn bằng cơ chế:
- Job định kỳ chạy trong **session mới, context nhỏ**, không chạy ké session làm việc cả ngày.
- Kiểm hàng *Loops* trong `/usage`. Docs mô tả đó là bảng xếp các `/loop` và scheduled task nặng nhất *"by total tokens"*, kèm *"per-run tokens"*.

**Cách đo số của bạn (thay cho giả định):**
- Trong Claude Code, `/usage` có khối Session với `Usage by model` (input, output, cache read, cache write) và dòng `Prompt cache (main)` (tỉ lệ token lấy từ cache, số lần trượt).
- Chạy một task mẫu trong session vừa `/clear`, đọc khối Session, rồi chia ra theo task.
- Docs nói rõ con số đô la ở đây là ước tính theo giá list. Người dùng gói subscription thì nó không phải hoá đơn, nhưng vẫn dùng để so sánh hai cách làm được.

### 3.4 Người duyệt đặt ở cửa, không đặt ở mỗi bước

Ở level 2, người đứng giữa **mọi** bước ([[ag-05-checkpoint-tung-buoc]] §3.6 đã tính chi phí của việc đó). Từ level 4 trở lên, người rút ra khỏi các bước, nhưng không rút khỏi hệ thống. Họ đứng ở bốn cửa:

1. **Cửa vào — brief.** Người viết hoặc duyệt danh sách task và tiêu chí xong trước khi loop chạy ([[ag-18-brief-la-shared-state]]). Một brief sai ở đây bị nhân lên N lần ở phía sau. Đây là chỗ một giờ của người đáng giá nhất.
2. **Cửa ghi không hoàn tác (R3).** Không chặn bằng lời dặn. Chặn bằng cấu hình (xem file mẫu bên dưới). Docs nói rõ vì sao lời dặn không đủ: ranh giới bạn nói trong hội thoại được classifier của mode `auto` đọc lại từ transcript, nên *"a boundary can be lost if context compaction removes the message that stated it. For a hard guarantee, add a deny rule instead."* (https://code.claude.com/docs/en/permission-modes, mục *Boundaries you state in conversation*). Lý do sâu hơn ở [[ag-08-hook-va-chan-bang-cau-hinh]].
3. **Cửa ra — chủ đầu ra.** Một người cụ thể merge, đọc digest, hoặc nhận báo cáo. Đây là cửa case §2 mất.
4. **Cửa định kỳ — review có lịch.** Cứ N tuần, đo lại xem automation còn đáng không. [[ag-24-harness-tu-cai-tien]] tự động hoá một phần cửa này, nhưng người vẫn là người bấm duyệt.

Giờ trả lời nửa sau của ⏸: vì sao (d) không cứu được? Phương án (d) đặt người vào **giữa các bước** (duyệt từng MR trước khi mở) mà không có **cửa 3**. Người bấm duyệt không phải chủ đầu ra, nên họ không có lý do để đọc kỹ. Ở [[ag-05-checkpoint-tung-buoc]] gọi hiện tượng này là duyệt mù. Bước duyệt chỉ chuyển rủi ro sang một cái tên, không làm rủi ro nhỏ đi.

File mẫu `.claude/settings.json` cho một repo chạy loop. Cú pháp theo https://code.claude.com/docs/en/permissions. Tên lệnh cụ thể là ví dụ, sửa theo stack của bạn:

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(npm test *)",
      "Bash(npm run lint *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)"
    ],
    "ask": [
      "Bash(node scripts/migrate.js *)",
      "Bash(git reset *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(npm publish *)",
      "Bash(node scripts/send-email.js *)",
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

Theo docs, *"Deny rules block in every mode, including `bypassPermissions`"*. Nhớ thêm giới hạn đã nói ở [[ag-05-checkpoint-tung-buoc]]: luật Bash khớp theo chuỗi lệnh, nên đây là hàng rào chặn đường đi thẳng, không chặn được mọi cách viết lệnh. Với Codex, ranh giới tương ứng là `sandbox_mode = "workspace-write"` cộng `approval_policy = "on-request"`, theo https://learn.chatgpt.com/docs/agent-approvals-security. Chi tiết so sánh ở [[ag-03-coding-agent-hoat-dong]] §3.5.

### 3.5 Công tắc dừng: thiết kế trước khi bật

Case §2 dừng được gọn trong một buổi vì công tắc đã có sẵn. Năm thứ cần dựng **trước** khi bật một automation:

**a) Mặc định tắt (opt-in).** Một feature hay automation mới ship ra ở trạng thái `enabled: false`. Kinh nghiệm thực tế từ một app hoá đơn PDF: một tính năng tự gửi email nhắc thanh toán, nếu mặc định bật, sẽ **tự bật cho mọi khách cũ**. Người biết chuyện đầu tiên là khách cuối nhận mail, không phải chủ shop. Có một lỗi hay làm hỏng việc đổi default:

```js
// SAI: undefined được coi là bật → dữ liệu cũ (không có cờ) vẫn chạy
if (settings.enabled !== false) sendReminder();
// ĐÚNG: chỉ chạy khi có người bật rõ ràng
if (settings.enabled === true) sendReminder();
```

Phải kiểm cả dữ liệu đã tồn tại: nếu cờ chỉ được seed ở nhánh tạo mới, bản ghi cũ không có cờ sẽ rơi vào nhánh nào?

**b) Dry-run trước khi ghi.** Lần chạy đầu in ra "sẽ ghi gì" và không ghi gì. Script phải **từ chối flag lạ**, nếu không thì `--dryrun` gõ sai chính tả sẽ thành chạy thật ([[ag-11-gate-xanh-gia]]).

**c) Kill switch độc lập với cơ chế khởi động.** Case §2 tắt service *và* tạo một file `PAUSE`. Lý do: tắt service chỉ chặn được đường khởi động mà bạn biết. Ai đó bật lại service, hoặc một timer khác gọi tới, thì vẫn chạy. Mỗi entrypoint kiểm file trước khi làm gì:

```bash
#!/usr/bin/env bash
# đầu mọi script của automation — minh hoạ
set -euo pipefail
PAUSE_FILE="${AGENT_HOME:-$HOME/agent}/PAUSE"
if [[ -e "$PAUSE_FILE" ]]; then
  echo "PAUSED: $(cat "$PAUSE_FILE")" >&2   # file chứa lý do + ngày
  exit 0
fi
```

**d) `disable`, không xoá.** Giữ code, cấu hình, secret, và ghi lệnh bật lại vào ghi chú quyết định. Một quyết định lùi được thì quyết nhanh được. Nhưng có cái giá, và case §2 ghi rõ: hai bug của chính hệ thống (checkout nhầm nhánh khi verify, race khi tạo MR ngay sau push) chỉ lộ ra **vì máy đang chạy thật**. Tắt rồi thì những bug kiểu đó không còn đường lộ diện.

**e) Ngày review kèm câu hỏi cụ thể.** Ví dụ ghi chú quyết định ở §2 viết: *job học từ thread có sinh ra bài học nào được tra lại không, hay thư mục inbox chỉ phình thêm? Ba tháng không có thì tắt nốt.* Câu hỏi có điều kiện tắt sẵn, người review không phải nghĩ lại từ đầu.

Có một kiểu hỏng nữa mà công tắc không bắt được: **automation im lặng vì nguồn đã mất**. Kinh nghiệm thực tế từ kho ghi chú của tác giả: một job quét git log mỗi sáng của các project đang "active". Ba project trong đó có đường dẫn repo không còn tồn tại trên máy. Job vẫn chạy đều, vẫn ra kết quả "không có commit mới". Kết quả đó trông y như "project đang im", trong khi sự thật là "project không đọc được". Cách chặn: phân biệt **rỗng** với **không đọc được**, và cho trường hợp sau thoát mã khác 0:

```bash
for repo in "${REPOS[@]}"; do
  [[ -d "$repo/.git" ]] || { echo "MISSING SOURCE: $repo" >&2; missing=1; continue; }
  git -C "$repo" log --since="1 day ago" --oneline
done
exit "${missing:-0}"
```

### 3.6 Lộ trình 4 tuần: lên đúng một level

Bài [[ag-01-bay-level]] §4 để lại cho bạn hai dòng: *việc vẫn làm bằng tay mà level kế tiếp bỏ được*, và *cơ chế cần dựng*. Lộ trình dưới đây biến hai dòng đó thành bốn tuần. Mỗi lần chỉ lên **một** level, vì các level cộng dồn: level dưới chưa chắc thì level trên chỉ nhân lỗi lên ([[ag-01-bay-level]] §3.3).

Nhịp chung cho mọi bước nhảy:

| Tuần | Việc | Tiêu chí xong (kiểm được) |
|---|---|---|
| 1 | Đo baseline cho **một** việc đã chọn bằng §3.1: số lần/tuần, phút người/lần | Có file số liệu với ít nhất 5 lần đo thật |
| 2 | Dựng cơ chế ở chế độ **chỉ đọc / dry-run / mặc định tắt** | Cơ chế chạy được 3 lần, không ghi gì ra ngoài; gate (nếu có) đã từng đỏ |
| 3 | Bật trên phạm vi nhỏ (một thư mục, một loại task), đo lại | Có số "phút người/lần" sau khi bật, đo theo cùng cách tuần 1 |
| 4 | Retro: giữ, mở rộng, hay tắt | Một ghi chú quyết định có Why + Tradeoff + ngày review |

Việc cụ thể theo từng bước nhảy:

| Từ → lên | Việc bỏ được | Cơ chế dựng ở tuần 2 | Bài |
|---|---|---|---|
| 1 → 2 | copy-paste | coding agent trong repo + allow-list lệnh đọc | [[ag-03-coding-agent-hoat-dong]], [[ag-05-checkpoint-tung-buoc]] |
| 2 → 3 | dặn lại mỗi session | `CLAUDE.md`/`AGENTS.md` dưới 200 dòng + 1 skill + 1 deny rule | [[ag-04-context-va-file-huong-dan]], [[ag-07-skill-va-slash-command]], [[ag-08-hook-va-chan-bang-cau-hinh]] |
| 3 → 4 | đọc code để tin kết quả | một lệnh gate + verifier context sạch | [[ag-10-done-criteria-va-gate]], [[ag-12-verifier-doc-lap]] |
| 4 → 5 | làm tuần tự | brief file chung + subagent/worktree cho 3 task độc lập | [[ag-14-subagent-va-brief]], [[ag-15-worktree-va-xung-dot]] |
| 5 → 6 | gõ "làm tiếp" | `BRIEF.md` + skill loop + điều kiện dừng | [[ag-18-brief-la-shared-state]], [[ag-19-vong-lap-nhat-task]] |
| 6 → 7 | tự nhớ, tự khởi động | một job định kỳ chỉ đọc (R0) + nơi ghi kết quả có người đọc | [[ag-22-second-brain]], [[ag-23-job-dinh-ky-va-bot]] |

Vì sao chỉ **một** việc trong bốn tuần? Lý do giống quy tắc "một patch mỗi lần" ở [[ag-24-harness-tu-cai-tien]]. Đổi hai thứ cùng lúc thì số đo tuần 3 không còn nói được thứ nào tạo ra khác biệt.

Vì sao lên 7 lại bắt đầu bằng job **chỉ đọc**? Job định kỳ chạy lúc không ai nhìn, nên nó nên ở R0 cho tới khi bạn có số đo phía dùng. Case §2 đi theo chiều ngược lại (bắt đầu bằng ghi) và cuối cùng phải lùi về R0.

---

## 4. Làm thử

Mục tiêu: chấm 5 việc thật của bạn, chọn một việc, viết lộ trình 4 tuần. Khoảng 60 phút. Chỉ cần Python 3, không cần agent.

### 4.1 Liệt kê việc

Tạo thư mục ngoài repo, ví dụ `~/automation-plan/`. Tạo `tasks.csv` gồm 5 việc bạn làm lặp lại trong tháng qua. Dưới đây là **ví dụ minh hoạ**, thay bằng việc của bạn:

```csv
task,lan_moi_thang,phut_moi_lan,phut_nguoi_con_lai,gio_dung,rui_ro,co_chu_dau_ra,co_gate_do_duoc
cap-nhat-dependency-patch,8,40,5,6,R1,yes,yes
viet-digest-commit-hang-ngay,22,15,2,4,R0,yes,no
doi-ten-env-var-toan-repo,1,90,20,3,R1,yes,yes
backfill-co-cho-don-cu,1,120,60,8,R3,yes,no
tra-loi-ticket-support,60,20,8,30,R3,no,yes
```

Các cột:
- `phut_nguoi_con_lai`: số phút người vẫn phải bỏ ra mỗi lần sau khi tự động (đọc kết quả, duyệt, xử lý ngoại lệ).
- `gio_dung`: số giờ dựng cơ chế, một lần.
- `rui_ro`: R0–R3 theo §3.2.

### 4.2 Script chấm

Lưu thành `auto_score.py`:

```python
#!/usr/bin/env python3
"""Chấm từng việc: có đáng tự động không, và tự động tới mức nào.
Dùng: python3 auto_score.py tasks.csv"""
import csv, sys

# Mức tối đa theo rủi ro (§3.2) — rủi ro đặt TRẦN, giá trị không vượt được trần.
CAP = {
    "R0": "tự chạy theo lịch, người đọc kết quả",
    "R1": "loop + gate + verifier, người đọc tổng",
    "R2": "agent chạy sau dry-run, báo trước nó ghi gì",
    "R3": "agent soạn nháp, NGƯỜI bấm chạy",
}

def score(r):
    n = float(r["lan_moi_thang"])
    saved_h = n * (float(r["phut_moi_lan"]) - float(r["phut_nguoi_con_lai"])) / 60
    build_h = float(r["gio_dung"])
    payback = build_h / saved_h if saved_h > 0 else float("inf")
    reasons = []
    if r["co_chu_dau_ra"] != "yes":
        reasons.append("không ai nhận đầu ra")
    if r["rui_ro"] in ("R1", "R2") and r["co_gate_do_duoc"] != "yes":
        reasons.append("việc ghi mà chưa có gate đỏ được")
    if payback > 3:
        reasons.append(f"hoà vốn sau {payback:.1f} tháng (> 3)")
    verdict = "DỪNG: " + "; ".join(reasons) if reasons else "LÀM: " + CAP[r["rui_ro"]]
    return saved_h, payback, verdict

rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
for r in sorted(rows, key=lambda r: score(r)[1]):
    saved_h, payback, verdict = score(r)
    print(f'{r["task"]:<30} tiết kiệm {saved_h:5.1f} h/tháng  hoà vốn {payback:5.1f} tháng  {verdict}')
```

Chạy với dữ liệu mẫu, bạn sẽ thấy:

```
viet-digest-commit-hang-ngay   tiết kiệm   4.8 h/tháng  hoà vốn   0.8 tháng  LÀM: tự chạy theo lịch, người đọc kết quả
cap-nhat-dependency-patch      tiết kiệm   4.7 h/tháng  hoà vốn   1.3 tháng  LÀM: loop + gate + verifier, người đọc tổng
tra-loi-ticket-support         tiết kiệm  12.0 h/tháng  hoà vốn   2.5 tháng  DỪNG: không ai nhận đầu ra
doi-ten-env-var-toan-repo      tiết kiệm   1.2 h/tháng  hoà vốn   2.6 tháng  LÀM: loop + gate + verifier, người đọc tổng
backfill-co-cho-don-cu         tiết kiệm   1.0 h/tháng  hoà vốn   8.0 tháng  DỪNG: hoà vốn sau 8.0 tháng (> 3)
```

Để ý dòng `tra-loi-ticket-support`. Đó là việc tiết kiệm nhiều nhất (12 h/tháng), nhưng script vẫn bảo dừng, đúng như case §2.

Hai quy ước của script là **lựa chọn của bài, không phải chuẩn**:
- Ngưỡng hoà vốn 3 tháng.
- `gio_dung` chưa tính công bảo trì.

Sửa cho hợp hoàn cảnh của bạn, nhưng ghi lý do vào file. Chi phí token tính riêng bằng §3.3 rồi so sánh với số giờ, vì hai thứ khác đơn vị.

### 4.3 Kiểm script đỏ được

Trước khi tin kết quả, kiểm script theo cả hai chiều ([[ag-11-gate-xanh-gia]]). Sửa dòng `cap-nhat-dependency-patch` thành `co_gate_do_duoc=no` rồi chạy lại. Kết quả phải đổi thành `DỪNG: việc ghi mà chưa có gate đỏ được`. Nếu không đổi, script không đo cái bạn nghĩ là nó đo.

### 4.4 Viết lộ trình

Chọn **một** dòng có kết quả `LÀM` và nối được với dòng "Cơ chế cần dựng" trong `level-audit.md` của [[ag-01-bay-level]]. Tạo `plan-4-tuan.md`:

```markdown
# Lộ trình 4 tuần — level <hiện tại> → <kế tiếp>
Việc chọn: <task>  | Lớp rủi ro: <R0–R3>  | Chủ đầu ra: <tên vai trò>
Cơ chế dựng: <một file / lệnh / agent / job>

## Tuần 1 — baseline
- Cách đo phút người/lần: <đo bằng gì>
- Số đo (≥ 5 lần): 

## Tuần 2 — dựng, chế độ an toàn
- Chế độ: <chỉ đọc | dry-run | enabled:false>
- Lệnh gate: `<lệnh>` — đã chạy đỏ trên đầu vào sai lúc: <ngày>
- Kill switch: <file PAUSE / flag / deny rule>

## Tuần 3 — bật phạm vi nhỏ
- Phạm vi: 
- Phút người/lần sau khi bật (đo cùng cách tuần 1): 
- Token/lần (từ /usage Session): 

## Tuần 4 — quyết định
- Giữ / mở rộng / tắt: 
- Why: 
- Tradeoff: 
- Ngày review + câu hỏi phải trả lời hôm đó: 
```

**Tiêu chí xong (kiểm được):**

- `python3 auto_score.py tasks.csv` chạy không lỗi trên 5 việc **của bạn**, và có ít nhất một dòng `DỪNG`. Nếu cả 5 dòng đều `LÀM`, xem lại cột `co_chu_dau_ra` và `rui_ro` có trung thực không.
- Bước 4.3 đã làm và kết quả đổi đúng như mô tả.
- `plan-4-tuan.md` ghi đủ ba thứ: lớp rủi ro, chủ đầu ra (một vai trò cụ thể, không phải "team"), kill switch.
- Tuần 2 có một lệnh gate cụ thể. Nếu việc chọn là R0, ghi "R0, không cần gate", kèm cách phát hiện nguồn mất (§3.5).

---

## 5. Bẫy thường gặp

### 🪤 Bẫy 1 — Tự động vì làm được, không vì đáng

- **Triệu chứng:** dựng xong một loop đẹp cho việc mỗi quý xảy ra một lần. Lần chạy kế tiếp, cấu hình đã lệch, phải sửa loop lâu hơn làm tay.
- **Nguyên nhân gốc:** chỉ nhìn "mỗi lần tốn bao lâu", bỏ qua tần suất. Việc hiếm thì không đủ lần chạy để hoà vốn, và cũng không đủ lần chạy để lộ lỗi của chính cơ chế.
- **Chặn bằng cơ chế:** không việc nào được dựng automation khi chưa có dòng trong `tasks.csv` và kết quả `LÀM` từ script §4.2.

### 🪤 Bẫy 2 — Gate xanh thay cho chủ đầu ra ở việc R3

- **Triệu chứng:** MR qua đỏ→xanh, test 42/42, nhưng bản sửa sai ở một ca không test nào chạm tới (case §2).
- **Nguyên nhân gốc:** gate chỉ kiểm được những ca người viết test đã nghĩ ra. Ở việc R3, ca không ai nghĩ ra chính là chỗ đắt nhất.
- **Chặn bằng cơ chế:** lớp R3 bị khoá ở mức "soạn nháp" bằng cấu hình: deny `git push` lên nhánh chung, không cấp quyền merge. Bản nháp phải đi qua một người là chủ đầu ra. Gate là điều kiện **cần** để bản nháp được tạo, không phải điều kiện **đủ** để merge.

### 🪤 Bẫy 3 — Đầu ra không có chủ

- **Triệu chứng:** thư mục báo cáo, inbox, hay danh sách MR nháp cứ dài thêm. Không ai đọc, nhưng automation vẫn "chạy tốt" theo log.
- **Nguyên nhân gốc:** khi dựng, chủ đầu ra tồn tại. Sau đó vai trò đổi người, còn automation thì không biết.
- **Chặn bằng cơ chế:**
  - Cột `co_chu_dau_ra` là điều kiện chặn trong script chấm.
  - Ghi chú quyết định có ngày review, kèm câu hỏi "tháng qua có bao nhiêu đầu ra được dùng?".
  - Số đo phía dùng đặt ở [[ag-22-second-brain]].

### 🪤 Bẫy 4 — Default bật, hoặc `undefined` bị coi là bật

- **Triệu chứng:** ship feature mới với default tắt, nhưng khách cũ vẫn nhận email tự động.
- **Nguyên nhân gốc:** worker kiểm `enabled !== false`. Bản ghi cũ không có cờ nên rơi vào nhánh bật.
- **Chặn bằng cơ chế:**
  - Chỉ chạy khi `enabled === true`.
  - Đặt default ở **một nguồn sự thật**.
  - Viết một test chạy worker trên một bản ghi **không có cờ**, và test đó phải khẳng định không có gì được gửi.

### 🪤 Bẫy 5 — Job im lặng vì nguồn đã mất

- **Triệu chứng:** job hằng ngày báo "không có gì mới" suốt nhiều tuần. Thật ra nó không đọc được nguồn từ lâu.
- **Nguyên nhân gốc:** code không phân biệt "đọc được, rỗng" với "không đọc được".
- **Chặn bằng cơ chế:** kiểm nguồn tồn tại trước khi đọc. Nguồn mất thì thoát mã khác 0 và in `MISSING SOURCE` (script ở §3.5). Thêm phép kiểm ngược: thỉnh thoảng cho job một nguồn **chắc chắn có dữ liệu mới**, kết quả phải khác rỗng.

### 🪤 Bẫy 6 — Chạy thưa hơn để tiết kiệm, hoá đơn lại tăng

- **Triệu chứng:** giãn `/loop` từ 4 phút lên 10 phút cho "đỡ tốn", nhưng usage tăng.
- **Nguyên nhân gốc:** khoảng cách vượt thời hạn cache (5 phút mặc định với API key), nên mỗi lần chạy đều xử lý lại cả context (phép tính 2 ở §3.3).
- **Chặn bằng cơ chế:** job định kỳ chạy trong session mới, context nhỏ. Xem hàng *Loops* và dòng *Prompt cache* trong `/usage` sau ngày chạy đầu tiên, ghi per-run tokens vào `plan-4-tuan.md`.

### 🪤 Bẫy 7 — Ranh giới nói trong chat, rồi mất

- **Triệu chứng:** đầu phiên đã dặn "đừng deploy". Ba giờ sau, agent ở mode `auto` deploy.
- **Nguyên nhân gốc:** theo docs, ranh giới nói trong hội thoại được đọc lại từ transcript. Compaction có thể xoá mất tin nhắn chứa ranh giới đó.
- **Chặn bằng cơ chế:** mọi ranh giới phải còn hiệu lực sau 3 giờ thì viết thành deny rule trong `settings.json`, không để ở dạng một câu trong chat.

---

## 6. Chuyển giao

Đây là bài cuối. Course đi theo một trục duy nhất: ở mỗi level, bạn bỏ một việc mà trước đó chỉ mắt người làm được, và thay bằng một cơ chế. Bài này thêm vế còn thiếu: **không phải việc nào cũng nên bỏ**. Ba trục ở §3.1 quyết định bỏ tới đâu. Lớp rủi ro ở §3.2 đặt trần. Công tắc ở §3.5 cho phép lùi khi điều kiện thay đổi, kể cả khi điều kiện đổi là "người nhận đầu ra đã chuyển việc".

Vòng tiếp theo của bạn:

1. Sau bốn tuần ở §4.4, chạy lại audit ở [[ag-01-bay-level]] §4. Level mới đo bằng task, không bằng công cụ đã cài.
2. Chọn bước nhảy kế tiếp trong bảng §3.6, và quay về đúng chương đó.
3. Mỗi automation đang chạy có một dòng trong `tasks.csv` và một ngày review. Đến ngày đó, chạy lại script với số đo mới. Kết quả có thể là `DỪNG`, và đó là một kết quả hợp lệ.

Nếu thấy mình thiếu nền lý thuyết về vòng lặp agent ở mức API, [[aiml-05-agents-tools]] là chỗ để quay lại.

---

## 7. Tóm tắt

- Chấm một việc theo ba trục: **giá trị** (tần suất × phút người tiết kiệm, ra thời gian hoà vốn), **rủi ro** (R0 đọc → R3 ghi không lùi được), và **chủ đầu ra + gate đỏ được**.
- Rủi ro đặt **trần** cho mức tự động. R3 dừng ở "agent soạn nháp, người bấm chạy", dù giá trị cao tới đâu.
- Case support bot (thực tế, một lần chạy): gate xanh 42/42 vẫn để lọt một ca thanh toán đặc biệt. Đầu ra mất chủ khi vai trò đổi người. Cách xử lý: tắt phần ghi, giữ phần đọc, `disable` chứ không xoá, có file `PAUSE`, có ngày review.
- Với giá xem ngày 2026-10-14, tiền của một task loop nằm chủ yếu ở **output và cache write**, không ở cached token. Đổi Opus 5.5 ↔ Sonnet 5.5 là nhân/chia đôi hoá đơn. Job định kỳ có khoảng cách dài hơn thời hạn cache có thể tốn gấp 10 lần job chạy dày hơn.
- Người đứng ở **bốn cửa**: brief, cửa ghi R3 (bằng deny rule, không bằng lời dặn), chủ đầu ra, review có lịch. Duyệt từng bước mà không có chủ đầu ra là duyệt mù.
- Dựng công tắc trước khi bật: opt-in (`=== true`), dry-run, kill switch độc lập, `disable` thay vì xoá, câu hỏi review viết sẵn. Job phải phân biệt "rỗng" với "không đọc được nguồn".
- Lên **một** level trong 4 tuần, với **một** việc: đo baseline → dựng ở chế độ an toàn → bật phạm vi nhỏ → quyết định bằng số.
