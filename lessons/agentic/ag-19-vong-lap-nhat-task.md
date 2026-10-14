# Bài 19 — Một vòng loop: nhặt task → làm song song → verify → commit

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ ra **một iteration** của loop nhặt task thành 7 bước (đọc → lọc → recon → nhận → giao → verify → đóng), và chỉ ra bước nào do main agent làm, bước nào phải giao agent khác.
- Chọn **trần N task một lượt** bằng phép tính số agent đồng thời, thay vì chọn theo cảm giác.
- Viết luật chia song song/tuần tự mà **mặc định là song song trong worktree**, và giải thích bằng số liệu vì sao luật "không chắc thì tuần tự" giết toàn bộ song song.
- Liệt kê **đủ bốn tầng điều kiện dừng** (hết task, lượt rỗng liên tiếp, task hỏng hai vòng, trần cứng của công cụ) và chỉ ra cơ chế cài từng tầng.
- Chọn đúng cách "bấm nút lặp": `/loop` nhịp cố định, `/loop` tự nhịp, cron hệ thống gọi `claude -p`/`codex exec`, hay workflow script — dựa trên câu hỏi *state sống ở đâu* và *ai cần hỏi người giữa chừng*.
- Viết được một skill loop ngắn (SKILL.md) + hai định nghĩa agent (worker, verifier) và chạy một iteration trên repo đồ chơi, kiểm kết quả bằng `git` chứ không bằng lời agent.

---

## 2. Tình huống

Một dev trong team viết skill loop đầu tiên để xử lý danh sách task trong `BRIEF.md` của repo backend. Thiết kế nghe rất cẩn thận:

> Với mỗi task, xác định vùng file nó sẽ chạm. Không giao nhau → song song, mỗi agent một worktree. **Giao nhau hoặc không xác định được → tuần tự** (mặc định an toàn khi thiếu thông tin).

Skill chạy đều đặn qua `/loop 5m` trong khoảng một tháng. Task được làm, test xanh, commit vào nhánh. Không ai phàn nàn — cho tới khi dev đó đếm lại transcript của 30 ngày (dedupe theo id của từng lời gọi tool):

```
# Case thực tế, một lần đo trên transcript 30 ngày, không phải benchmark
Lời gọi Agent (giao subagent)                         : 622
Message của main agent có >= 2 lời gọi Agent cùng lúc : 0
Lời gọi Agent có isolation "worktree"                 : 0
```

**0 trên 622.** Nhánh song song mà skill mô tả kỹ lưỡng là **code chết** — viết ra nhưng chưa từng chạy lần nào. Mọi task đều đi tuần tự, trong thư mục chính.

Nguyên nhân không phải model "lười". Với một repo backend cỡ trung bình, câu "không xác định được vùng file sẽ chạm" **gần như luôn đúng** trước khi bắt tay làm: task "sửa format tiền trong export" có thể chạm util, có thể chạm template, có thể chạm test fixture. Luật cho nhánh tuần tự thắng *mọi* lượt.

Cùng tháng đó có thêm hai sự cố nhỏ:

- Một iteration nhận lại một task mà agent của iteration trước **vẫn đang chạy** (task có build + test + hai vòng verifier, mất hơn 60 phút wall-clock; ngưỡng coi là "mồ côi" lúc đó là 30 phút). Hai agent làm cùng một worktree.
- Cuối tuần, mọi task còn lại đều đang chờ người quyết. Loop vẫn fire mỗi 5 phút và trả một dòng *"Không thay đổi — iteration rỗng thứ N"*, lặp khoảng **170 lần liên tiếp** trước khi có người nhìn thấy. Một repo khác cùng tuần lặp lại đúng chuyện này — **~62 lượt rỗng** ở nhịp 10 phút — dù luật "rỗng ~15 lượt thì dừng" đã được ghi trong lời dặn.

```python
# Case thực tế: ~170 iteration rỗng, nhịp 5 phút
170 * 5 / 60   # = 14.17 giờ loop chạy mà không đổi một byte state nào
62 * 10 / 60   # = 10.33 giờ ở nhịp 10 phút, sau khi luật dừng đã có trong lời dặn
```

Ba sự cố, ba chỗ hỏng khác nhau của *cùng một vòng lặp*: chia lô sai, khoá sai, và không biết dừng.

---

## ⏸ Dừng lại — đoán trước

Luật cũ "không chắc thì tuần tự" được viết ra để phòng rủi ro *hai agent đè file của nhau*. Nếu bạn đổi thành "không chắc thì **vẫn song song**, mỗi task một worktree", thì khi đoán sai độ độc lập, **thứ tệ nhất còn lại có thể xảy ra là gì** — và nó hiện ra lúc nào?

Viết câu trả lời một dòng trước khi đọc §3.3.

---

## 3. Cơ chế

### 3.1 Một iteration là gì, và ai làm bước nào

**Iteration** (một lượt) là một lần chạy trọn vòng: từ đọc state trên đĩa tới ghi state mới xuống đĩa. Loop chỉ là việc gọi lại iteration theo nhịp. Muốn loop đúng thì trước hết **một iteration phải đúng và phải idempotent** (chạy lại lần nữa trên cùng state thì không gây thêm hiệu ứng — task đã `[x …]` không bị làm lại).

```
iteration
 1. đọc BRIEF.md            ── main agent
 2. lọc task nhận được       ── main agent (bỏ [x …], [wait …], [lock …] chưa quá ngưỡng)
 3. recon vùng file          ── agent Explore (song song, chỉ đọc)
 4. nhận task: [ ] → [lock YYYY-MM-DD HH:MM]   ── main agent, TRƯỚC khi spawn
 5. giao worker              ── N subagent, mỗi cái một worktree, spawn trong MỘT message
 6. verify                   ── N verifier, context sạch, không có Edit/Write
 7. đóng: commit / mark [x …] / ghi blocker / dọn task cũ   ── main agent
```

Luật phân vai, rút từ skill loop đang chạy thật (kinh nghiệm thực tế): **main agent không viết code và không tự chấm**. Nó chỉ làm ba thứ: điều phối, bookkeeping trên `BRIEF.md`, và git. Lý do của từng vế:

- *Không viết code*: context của main agent phải sống qua nhiều iteration. Mỗi file nó tự đọc để sửa là token chiếm chỗ của các iteration sau.
- *Không tự chấm*: main agent là đứa vừa soạn brief cho worker — nó mang cùng giả định với worker. Chấm bài mình giao thì không còn là gate. Chi tiết verifier ở [[ag-12-verifier-doc-lap]].
- *Git tập trung ở main agent*: worker bị cấm chạy `git` (add/commit/checkout/stash/merge). Một rào này xoá nguyên lớp rủi ro "agent A `checkout` làm mất việc của agent B".

Định dạng state (`[ ]`, `[lock YYYY-MM-DD HH:MM]`, `[wait …]`, `[x …]`) và vì sao nó phải sống ngoài context đã ở [[ag-18-brief-la-shared-state]]. Bài này chỉ dùng nó.

### 3.2 Chọn N: tính từ số agent đồng thời, không chọn theo cảm giác

Số task nhận một lượt là một con số phải có lý do. Lý do đến từ trần của công cụ.

Theo docs Claude Code (trang *Create custom subagents*), mặc định khi đã có **20 subagent đang chạy** trong một session thì lời gọi Agent tiếp theo fail với `Concurrent subagent limit reached` (chỉnh bằng biến `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`). Với workflow script, docs (*Orchestrate subagents at scale with dynamic workflows*) ghi trần **16 agent đồng thời** mặc định, ít hơn nếu máy ít CPU.

Mỗi task trong lô cần đồng thời tối đa: 1 worker + 1 verifier (nếu verify task xong sớm trong khi task khác còn chạy), cộng 1 agent recon lúc đầu lượt.

```python
# Ước lượng chỗ cần cho lô N task (đỉnh xấu nhất, nếu mọi thứ chồng nhau)
N = 4
cho_can = N * (1 + 1) + N      # worker + verifier + recon
cho_can                         # = 12  -> còn chừa chỗ dưới trần 16 / 20
N = 8
N * (1 + 1) + N                 # = 24  -> vượt trần, spawn sẽ fail giữa lượt
```

Skill loop trong case chọn **N = 4** đúng theo phép tính này: "4 là mức còn chừa chỗ, không phải mức tối đa lý thuyết" (kinh nghiệm thực tế). Hai luật đi kèm:

- **Không đủ N task hợp lệ thì nhận ít hơn.** Một task nặng tốt hơn bốn task vơ bừa. Vơ task `[wait …]` (đang chờ người) cho đủ lô là tạo lock giả và làm việc người ta đã bảo dừng.
- **Không chọn N theo throughput mong muốn.** Throughput bị giới hạn bởi verifier (xem 3.4), không bởi worker.

### 3.3 Chia lô: mặc định song song, chỉ bằng chứng mới ép tuần tự

Quay lại câu hỏi ⏸. Luật cũ phòng rủi ro *đè file*. Nhưng nếu mỗi task chạy trong **git worktree** riêng (một thư mục làm việc thứ hai của cùng repo, trên nhánh riêng — chi tiết ở [[ag-15-worktree-va-xung-dot]]), thì hai agent **về mặt vật lý không thể** ghi vào cùng một file: mỗi đứa có bản sao của nó.

Vậy khi đoán sai độ độc lập, thứ còn lại chỉ là **merge conflict lúc gộp hai nhánh** — và nó hiện ra **muộn nhưng ồn**: lúc tạo MR hoặc rebase, git từ chối và chỉ đúng dòng xung đột. Sửa được, mất vài phút.

So hai luật bằng nguyên nhân gốc:

- Luật "không chắc → tuần tự" phòng **hai lớp** cho **cùng một rủi ro** (đè file): lớp worktree và lớp tuần tự. Lớp thứ hai không thêm an toàn nào mà lớp đầu chưa có, nhưng trả giá bằng **toàn bộ** thông lượng — vì "không chắc" là trạng thái mặc định của mọi task trước khi làm.
- Luật "không chắc → song song trong worktree" chấp nhận một rủi ro **nhìn thấy được và rẻ** (conflict) để đổi lấy song song thật.

Luật đúng, viết thành ma trận va chạm:

| Recon tìm thấy | Quyết định |
|---|---|
| Vùng file không giao nhau | Song song, mỗi task một worktree |
| **Không xác định được** vùng file | **Vẫn song song**, worktree bắt buộc |
| Giao nhau **có bằng chứng** (cùng một file cụ thể đã thấy, hoặc cùng file config/schema/type dùng chung) | Tuần tự |
| Task kiểu "đổi tên xuyên repo", "refactor toàn bộ" | Luôn tuần tự |

Recon là để **tìm va chạm**, không phải để xin phép song song. Recon xong không thấy gì → song song.

Hai ràng buộc cứng khi spawn nhóm song song — thiếu một trong hai là quay lại 0/622:

1. Mọi worker trong nhóm **phải** chạy cô lập worktree. Trong Claude Code, cách bền nhất là đặt vào định nghĩa agent: docs ghi trường frontmatter `isolation: worktree` cho subagent chạy trong một git worktree tạm, *"branched by default from your default branch rather than the parent session's `HEAD`"*, và *"automatically cleaned up if the subagent makes no changes"*.
2. **Spawn cả nhóm trong một message** (nhiều lời gọi Agent cùng một lượt). Spawn một cái, chờ kết quả, rồi spawn cái tiếp là tuần tự trá hình — đúng hành vi đã cho ra số 0 ở dòng thứ hai của bảng đo.

Sau khi spawn, **đếm lại**: liệt kê agent đang chạy, phải thấy đủ N. Thiếu thì nói ra, đừng chạy tiếp như thể đã song song.

💡 Chú ý câu docs về base branch: worktree của subagent mặc định tách từ **nhánh mặc định**, không từ `HEAD` của bạn. Nếu bạn đang đứng trên một nhánh feature và muốn worker làm tiếp trên nhánh đó, phải nói rõ trong brief hoặc cấu hình base — không thì worker làm trên code cũ hơn cái bạn đang nhìn.

### 3.4 Verify: task nào xong verify task đó, và chỉ một vòng sửa

Verifier là chặng chậm nhất của gần như mọi task. Số đo của skill loop trong case (kinh nghiệm thực tế, 242 lần chạy verifier, không phải benchmark): median **6,6 phút**, p90 **12,2 phút**, khoảng **1/5 số lần vượt 10 phút**.

Phép tính cho thấy vì sao phải verify song song và verify sớm:

```python
# Dựa trên số case ở trên; dòng 2 là suy luận, giả định các lần verify độc lập
4 * 6.6            # = 26.4 phút nếu xếp 4 verifier nối đuôi nhau (median)
1 - 0.8**4         # = 0.59 -> ~59% lô 4 task có ít nhất một verifier > 10 phút
```

Xếp nối đuôi thì trả lại đúng phần wall-clock vừa tiết kiệm được nhờ worker song song. Còn nếu chờ *cả lô* xong mới verify, thì task xong sớm phải đợi task chậm nhất — với xác suất ~59% có một task kéo dài quá 10 phút, gần như lượt nào cũng đợi. Luật: **worker nào xong thì verify ngay task đó**; nhiều task xong cùng lúc thì spawn các verifier trong một message.

Kết quả verify rẽ ba nhánh, và mỗi nhánh có điểm dừng riêng:

| Verdict | Làm gì | Vì sao dừng ở đó |
|---|---|---|
| `PASS` | Main agent commit vào nhánh của task, bằng chứng của verifier vào **commit body** | Bằng chứng phải nằm ở chỗ người review đọc (diff/MR), không chỉ trong `BRIEF.md` |
| `FAIL` | Giao lại **đúng một vòng** cho worker, brief = finding của verifier nguyên văn; verify lại. Vòng hai vẫn `FAIL` → blocker | Không có trần vòng sửa thì task hỏng quay vòng mãi — đây là điều kiện dừng cấp task |
| `UNVERIFIED` | **Không coi là pass.** Chạy lại nếu là lỗi môi trường nhất thời; vẫn vậy → blocker | Gate không chạy được không phải gate xanh |

Blocker: trả `[lock …]` về `[ ]`, ghi verdict + finding nguyên văn dưới task, báo người. Không mark done.

Một luật nhỏ mà quan trọng: verifier hay tìm ra lỗi thật **ngoài scope** của task. Đừng cho sửa (phình diff, phần thêm không ai chấm), cũng đừng bỏ — bảo verifier ghi `file:line`, main agent **thêm thành task mới** trong `BRIEF.md`. Loop tự nuôi hàng đợi bằng bằng chứng, không bằng phỏng đoán.

### 3.5 Khoá: vì sao iteration chồng nhau dù công cụ "không chạy chồng"

Docs Claude Code (*Run prompts on a schedule*) ghi: *"A scheduled prompt fires between your turns, not while Claude is mid-response. If Claude is busy when a task comes due, the prompt waits until the current turn ends."* Nghe như hai iteration không bao giờ chồng nhau. Vậy sự cố "hai agent cùng worktree" ở §2 từ đâu ra?

Từ chỗ **lượt của main agent kết thúc trước khi việc kết thúc**. Worker và verifier chạy nền; main agent spawn xong là trả lượt. Lượt đã xong → 5 phút sau scheduled prompt fire → iteration mới đọc `BRIEF.md`, thấy task đó đang `[lock 2026-10-14 14:32]`. Nếu nó coi task là mồ côi, nó spawn worker thứ hai.

Vì vậy `[lock YYYY-MM-DD HH:MM]` là **mutex trên đĩa**, và ngưỡng mồ côi phải lớn hơn thời gian thật của một task dài:

- Stamp dưới ngưỡng → đang chạy → bỏ qua.
- Stamp quá ngưỡng → mồ côi → **trước khi nhận lại, kiểm agent còn sống không** (liệt kê agent/task nền). Timestamp chỉ là phương án dự phòng khi mất trạng thái.

Ngưỡng 30 phút đã hỏng vì task thật có build + test + 2 vòng verifier vượt 60 phút; skill nâng lên 90 phút (kinh nghiệm thực tế). Đừng chép số 90 — đo của bạn: lấy p95 thời gian từ lúc `[lock …]` tới lúc `[x …]` trong `BRIEF-done.md` của chính repo, cộng biên.

Lock, lease và at-least-once như một bài toán hệ phân tán thật sự ở [[ag-21-loop-la-he-phan-tan]]. Chuyện "agent nền báo xong mà có thật xong không" ở [[ag-20-viec-nen-va-ack]].

### 3.6 Bốn tầng điều kiện dừng

Một loop không có điều kiện dừng thì hoặc chạy mãi đốt token, hoặc — tệ hơn — **tự bịa việc** khi hết task. Cần đủ bốn tầng, mỗi tầng một cơ chế:

| Tầng | Điều kiện | Cơ chế cài |
|---|---|---|
| Lượt | Không còn task nhận được | Iteration báo "no pending tasks" và kết thúc. **Cấm tự thêm việc, cấm mở rộng scope** — ghi thẳng trong SKILL.md |
| Task | `FAIL` sau vòng sửa thứ hai, hoặc `UNVERIFIED` không gỡ được | Blocker như 3.4; không thêm vòng nếu người chưa đồng ý |
| Loop | K iteration rỗng liên tiếp | Đếm streak trong `BRIEF.md`; đủ K thì tự huỷ lịch và viết tổng kết "chặn bởi cái gì, cần ai làm gì" |
| Công cụ | Trần cứng của nền tảng | `/loop` định kỳ tự hết hạn sau 7 ngày; `claude -p` có `--max-budget-usd`; workflow có trần 1000 agent/run (đều theo docs) |

Tầng "loop" là tầng hay thiếu nhất, và là tầng gây ra 170 lượt rỗng ở §2. Lý do nó không tự khỏi: một loop không nhặt được việc vì **nguyên nhân chỉ đổi khi có người can thiệp** (chờ quyết định, thiếu tài nguyên, phụ thuộc tuyến tính). Fire tiếp không đổi state mà còn **che tín hiệu**: 170 dòng "không thay đổi" làm việc *đang bị chặn* trông giống việc *đang chạy*. Ngưỡng K mà tác giả case chọn là khoảng 15 lượt (kinh nghiệm thực tế, phát biểu của người dùng loop, không phải số đo tối ưu). Với nhịp 5 phút, 15 lượt là 75 phút — đủ để loại trừ "chỉ là đang chờ verifier".

Cách huỷ đúng theo loại loop (docs *Run prompts on a schedule*): loop nhịp cố định là một scheduled task có ID 8 ký tự → huỷ bằng `CronDelete`; loop tự nhịp thì Claude gọi tool `ScheduleWakeup` với `stop: true`. Docs cũng ghi một lưới an toàn: nếu một iteration tự nhịp kết thúc mà không hẹn lượt sau cũng không dừng, Claude Code hẹn một wakeup dự phòng khoảng 20 phút sau, và kết thúc loop nếu lượt đó cũng không hẹn tiếp.

### 3.7 Ai bấm nút lặp: bốn cách, khác nhau ở state sống ở đâu

Skill loop **không tự lặp**; nó định nghĩa một iteration. Thứ gọi lại nó có bốn loại. Tiêu chí chọn không phải "cái nào mạnh hơn" mà là hai câu hỏi: *state của vòng lặp sống ở đâu khi session chết*, và *có cần hỏi người giữa chừng không*.

**a) `/loop` nhịp cố định — `/loop 5m /loop-tasks BRIEF.md`.** Theo docs: interval chuyển thành biểu thức cron, job có ID; chạy trong session đang mở; tối thiểu 1 phút; tự hết hạn sau 7 ngày (*"fires one final time, then deletes itself"*); không bù lượt lỡ (*"fires once when Claude becomes idle, not once per missed interval"*). Một chi tiết đáng biết: docs ghi `*/5 * * * *` — đúng cái `/loop 5m` tạo ra — chạy **4 phút 45 giây** sau lượt trước, vì lượt cách đúng 5 phút sẽ bắt đầu ngay sau khi prompt cache 5 phút hết hạn. Các nhịp khác bị lùi muộn ngẫu nhiên (jitter) tới nửa khoảng cách, tối đa 30 phút.

```python
# Trần số lượt của một /loop 5m trước khi tự hết hạn (docs: 7 ngày)
24 * 60 / 5        # = 288 lượt/ngày
24 * 60 / 5 * 7    # = 2016 lượt tối đa -> mỗi lượt rỗng đều đọc lại BRIEF.md
```

**b) `/loop` tự nhịp — `/loop /loop-tasks BRIEF.md` (bỏ interval).** Theo docs: sau mỗi lượt Claude chọn khoảng chờ **từ 1 phút tới 1 giờ** dựa trên cái nó thấy, in lý do ra; `Esc` xoá wakeup đang chờ; **không được khôi phục** khi `--resume` (phải chạy lại `/loop`). Hợp khi nhịp việc thay đổi: lô đang chạy thì kiểm dày, hàng đợi trống thì giãn ra — giảm lượt rỗng mà không phải đoán một interval cố định.

**c) Cron hệ thống gọi headless — `claude -p` hoặc `codex exec`.** Không cần session mở. Mỗi lần chạy là một **session mới tinh**, nên mọi thứ iteration cần biết phải nằm trong `BRIEF.md` + repo — đây là phép thử khắc nghiệt nhất cho shared state.

Dữ kiện từ docs Claude Code (*Run Claude Code programmatically*): `-p`/`--print` chạy không tương tác; skill do người gọi chạy được trong `-p` nếu đưa `/skill-name` vào chuỗi prompt; không có `--bare` thì `-p` nạp CLAUDE.md, skill, hook, subagent như session thường (có `--bare` thì **không** — skill loop sẽ không được tìm thấy); exit code 0 khi thành công, khác 0 khi fail; run **chờ subagent nền xong** vì kết quả của chúng là một phần output; `--output-format json` trả `total_cost_usd` (ước tính phía client); `--permission-mode dontAsk` từ chối mọi thứ sẽ phải hỏi, trừ cái `--allowedTools` cho phép.

Dữ kiện từ docs Codex (*Non-interactive mode*): `codex exec "<prompt>"` mặc định chạy trong **sandbox read-only**; muốn sửa file dùng `--sandbox workspace-write`; `--json` in luồng sự kiện JSON Lines; `-o`/`--output-last-message` ghi tin nhắn cuối ra file; `--output-schema` ép câu trả lời cuối theo JSON Schema; `codex exec resume --last` nối session gần nhất. Docs hiện ghi `--full-auto` không còn được hỗ trợ — dùng `--sandbox workspace-write`.

Cron hệ thống **không biết** lượt trước còn chạy hay không. Docs `/loop` lo chuyện "không fire giữa lượt", cron thì không — nên phải tự khoá ở tầng process (ví dụ `flock -n` trên Linux), cộng thêm khoá `[lock …]` trong `BRIEF.md`.

```cron
# MINH HOẠ — kiểm lại tên flag/tool theo phiên bản bạn cài trước khi dùng.
# flock -n: lượt trước còn chạy thì lượt này thoát ngay, không xếp hàng.
*/15 * * * * cd /srv/repo-backend && flock -n /tmp/loop-tasks.lock \
  claude -p "/loop-tasks BRIEF.md" \
    --permission-mode dontAsk \
    --allowedTools "Read,Edit,Write,Bash(git *),Bash(npm test *),Bash(npm run build *)" \
    --max-budget-usd 5 \
    --output-format json >> /var/log/loop-tasks.jsonl 2>&1
```

Một worker là Codex (lý do chấm chéo hai họ model ở [[ag-16-hai-ho-model]]) thì main agent gọi nó qua Bash, trong worktree của task:

```bash
# MINH HOẠ — main agent chạy, cwd là worktree của task
cd /srv/wt/task-3 && codex exec --sandbox workspace-write \
  -o /srv/loop-evidence/task-3.report.md \
  "$(cat /srv/loop-evidence/task-3.brief.md)"
echo "exit=$?"   # exit code là bằng chứng đầu tiên, không phải câu "done" trong report
```

**d) Workflow script.** Theo docs: một script JavaScript mà runtime chạy nền; kế hoạch nằm trong **code**, kết quả trung gian nằm trong **biến script**, context của Claude chỉ giữ kết quả cuối; trần 16 agent đồng thời, 1000 agent/run; **không có input giữa chừng** (*"For sign-off between stages, run each stage as its own workflow"*); script không tự đụng filesystem/shell — agent mới đụng; resume được *trong cùng session*.

Đặt bốn cách cạnh nhau, sau khi đã thấy nguyên nhân của từng khác biệt:

| | `/loop` cố định | `/loop` tự nhịp | Cron + `claude -p` / `codex exec` | Workflow script |
|---|---|---|---|---|
| Cần session mở | Có | Có | Không (máy phải bật) | Có (hoặc chuyển nền) |
| Sống qua restart | Khôi phục khi `--resume` (trừ hết hạn) | Không khôi phục | Có — mỗi lượt là session mới | Resume trong cùng session |
| Chống chồng lượt | Không fire giữa lượt; vẫn cần `[lock …]` vì việc chạy nền | Như cột trái | **Tự lo** (`flock` + `[lock …]`) | Không áp dụng — một run |
| Hỏi người giữa chừng | Được (blocker → báo) | Được | Chỉ qua file/kênh báo | Không |
| Kế hoạch nằm ở | Văn xuôi trong SKILL.md | Như cột trái | Như cột trái | Code, diff được, rerun y hệt |
| Hợp với | Hàng đợi việc chạy vài ngày, bạn còn ngồi máy | Hàng đợi có nhịp thất thường | Việc chạy khi bạn tắt terminal | Một việc lớn, một lần: audit, migration nhiều file |

### 3.8 Skill loop và workflow: hybrid, không thay thế

Nhìn kỹ thì skill loop **đã là một graph** (đồ thị gồm node — đơn vị làm việc, edge — luật chuyển việc giữa các node, và shared state — dữ liệu chảy dọc edge; vòng lặp tool của một agent đơn ở [[aiml-05-agents-tools]]), chỉ viết bằng văn xuôi: node là worker/verifier/recon, edge là recon → chia lô → spawn → verify → đóng, shared state là `BRIEF.md` trên đĩa.

Workflow thắng ở ba chỗ (kinh nghiệm thực tế, đối chiếu docs): điều phối thành artifact diff được và chạy lại y hệt (văn xuôi thì mỗi lượt model diễn giải lại một chút); context không phình (main agent của skill loop phải ôm report của mọi task); và quality pattern **bắt buộc chạy** thay vì là lời khuyên model có thể bỏ qua.

Nhưng workflow thua đúng ở những chỗ loop dài ngày cần:

1. **State chết theo session.** `BRIEF.md` sống qua mọi thứ, chạy qua cron nhiều ngày. Đây là khác biệt kiến trúc, không vá được bằng config.
2. **Không hỏi người giữa chừng** — mà nhánh blocker là một phần thiết kế của loop.
3. **Git phải rơi xuống agent**, vì script không đụng git. Mất đúng cái rào "chỉ main agent chạy git".
4. **Luật replay khi resume** (docs): agent fail thì nó và *mọi agent khởi động sau nó* chạy lại, kể cả cái đã xong. Hệ quả thiết kế: nhiều agent nhỏ giữ được nhiều tiến độ hơn một agent dài.

Và cái giá: bài kỹ thuật của Anthropic về hệ multi-agent research ghi *"agents typically use about 4× more tokens than chat interactions"*, *"multi-agent systems use about 15× more tokens than chats"*, và coding là ví dụ fit kém vì *"most coding tasks involve fewer truly parallelizable tasks than research"*.

Kết luận thiết kế: **skill loop giữ vai orchestrator dài hạn** (state bền, nhịp, hỏi được người, git tập trung); **một task đủ nặng** — audit toàn repo, migration 200 file, "sửa lỗi thì quét hết chỗ tương tự" — được worker của task đó **chạy thành một workflow**. Loop ngoài, workflow trong; không phải viết lại loop thành script.

---

## 4. Làm thử

Mục tiêu: chạy **một iteration** trên repo đồ chơi, rồi bật lặp, rồi ép loop tự dừng. Mọi tiêu chí "xong" kiểm bằng lệnh.

**Bước 1 — repo đồ chơi**

```bash
mkdir loop-lab && cd loop-lab && git init -b main
mkdir src && printf 'export const add = (a, b) => a + b;\n' > src/math.js
printf 'export const greet = (n) => "hi " + n;\n' > src/greet.js
cat > package.json <<'EOF'
{ "name": "loop-lab", "type": "module", "scripts": { "test": "node --test" } }
EOF
mkdir test && printf 'import { test } from "node:test";\nimport assert from "node:assert";\nimport { add } from "../src/math.js";\ntest("add", () => assert.equal(add(1, 2), 3));\n' > test/math.test.js
npm test && git add -A && git commit -m "init"
```

**Bước 2 — `BRIEF.md` (để ngoài repo cũng được; ở đây để trong cho gọn, và thêm vào `.gitignore` để worktree không thấy nó)**

```bash
echo "BRIEF*.md" >> .gitignore && git add .gitignore && git commit -m "ignore brief"
cat > BRIEF.md <<'EOF'
## Gate (dán nguyên văn vào brief của worker VÀ verifier)
- `npm test` -> exit 0. Baseline: 1 test pass.

## Tasks
1. [ ] thêm `sub(a, b)` vào src/math.js kèm test
2. [ ] `greet` trả "hello <n>" thay vì "hi <n>", kèm test
3. [wait 2026-10-14] đổi tên package — chờ người chốt tên mới
EOF
```

**Bước 3 — hai định nghĩa agent** (`.claude/agents/`)

```markdown
<!-- .claude/agents/task-worker.md -->
---
name: task-worker
description: Làm đúng một task từ BRIEF.md trong worktree riêng. Dùng khi loop-tasks giao việc.
isolation: worktree
---
Chỉ sửa file và chạy gate được dán trong brief. KHÔNG chạy git. KHÔNG sửa BRIEF.md.
Không mở rộng scope. Xong thì trả: đường dẫn tuyệt đối của worktree, file đã sửa,
cách làm và lý do, exit code của gate.
```

```markdown
<!-- .claude/agents/task-verifier.md -->
---
name: task-verifier
description: Chấm độc lập một task loop-tasks vừa làm. Không sửa file.
tools: Read, Grep, Glob, Bash
---
Chạy gate trong đúng thư mục được giao (mọi lệnh viết `cd <path> && <lệnh>`).
Cố BÁC BỎ rằng task đã xong: gỡ thay đổi ra chạy lại xem test có đỏ không.
Trả đúng một verdict: PASS / FAIL / UNVERIFIED, kèm lệnh đã chạy + exit code.
Lỗi ngoài scope: liệt kê file:line, không sửa.
```

**Bước 4 — skill loop** (`.claude/skills/loop-tasks/SKILL.md`)

```markdown
---
name: loop-tasks
description: Một iteration nhặt task từ BRIEF.md - nhận tối đa 4 task, giao task-worker song song trong worktree, chấm bằng task-verifier, commit, mark done. Dùng khi được gọi trực tiếp hoặc qua /loop.
---
1. Đọc BRIEF.md. Lọc task `[ ]`. Bỏ `[x …]`, `[wait …]`, và `[lock YYYY-MM-DD HH:MM]` dưới 90 phút.
   Không còn task -> tăng dòng `empty-streak: N` ở đầu file, báo "no pending tasks", DỪNG.
   empty-streak >= 15 -> huỷ lịch lặp (CronDelete theo ID, hoặc dừng wakeup), viết tổng kết
   "chặn bởi gì, cần ai làm gì", DỪNG. Có task -> đặt empty-streak: 0.
   CẤM tự bịa task, CẤM mở rộng scope.
2. Nhận tối đa 4 task. Mặc định song song. Chỉ tuần tự khi đã thấy CÙNG một file cụ thể.
3. Sửa `[ ]` -> `[lock YYYY-MM-DD HH:MM]` cho mọi task đã nhận, TRƯỚC khi spawn.
4. Spawn task-worker cho cả nhóm trong MỘT message. Brief: task nguyên văn + khối Gate nguyên văn.
   Spawn xong đếm agent đang chạy; thiếu thì báo.
5. Worker nào xong -> spawn task-verifier ngay cho task đó, kèm path worktree + git diff.
   FAIL -> đúng một vòng sửa. FAIL lần hai hoặc UNVERIFIED -> blocker: trả về `[ ]`, ghi verdict.
6. PASS -> main agent commit trong worktree vào nhánh `task/<số>`; body commit có dòng
   `Gate: npm test -> exit 0`. Mark `[x YYYY-MM-DD]` + tên nhánh + hash ngắn dưới task.
7. Không merge, không push, không tạo MR.
```

**Bước 5 — chạy một iteration, rồi kiểm bằng git, không bằng lời agent**

```bash
claude            # trong loop-lab, gõ:  /loop-tasks
```

Sau khi lượt kết thúc:

```bash
git branch --list 'task/*'                       # kỳ vọng: 2 nhánh
for b in $(git branch --list 'task/*' --format='%(refname:short)'); do
  git log -1 --format='%h %s%n%b' "$b" | grep -q '^Gate: npm test -> exit 0' \
    && echo "$b có bằng chứng" || echo "$b THIẾU bằng chứng"
  git switch -q "$b" && npm test --silent; echo "$b test exit=$?"; git switch -q main
done
grep -c '\[x ' BRIEF.md                          # kỳ vọng: 2
grep -c '\[wait ' BRIEF.md                       # kỳ vọng: 1 — task chờ người không bị đụng
```

Kiểm thêm việc song song có thật: mở transcript của session (thư mục session trong `~/.claude/projects/`) và tìm message của main agent chứa **hai** lời gọi Agent. Không thấy → bước 4 của skill chưa được làm theo, dù kết quả cuối đúng.

**Bước 6 — bật lặp và ép tự dừng**

```text
/loop 1m /loop-tasks
```

Không còn task nào nhận được (task 3 đang `[wait …]`), nên mỗi lượt tăng `empty-streak`. Để thử nhanh, tạm sửa ngưỡng trong SKILL.md thành 3.

**Xong khi:** (1) 2 nhánh `task/*`, mỗi nhánh test exit 0 và commit body có dòng `Gate:`; (2) `BRIEF.md` có 2 `[x …]` kèm hash, task `[wait …]` nguyên vẹn; (3) sau 3 lượt rỗng, hỏi `what scheduled tasks do I have?` trả về **không còn** job của `/loop`, và `BRIEF.md` có đoạn tổng kết nói task 3 đang chờ người chốt tên.

📏 Muốn biết loop tốn bao nhiêu: số liệu chưa đo thì đừng đoán. Chạy cùng iteration qua `claude -p "/loop-tasks" --output-format json` và đọc trường `total_cost_usd` (docs: ước tính phía client), lặp vài lần cho lượt có việc và lượt rỗng, rồi nhân với số lượt/ngày của nhịp bạn chọn.

---

## 5. Bẫy thường gặp

🪤 **Nhánh song song có trong skill nhưng không bao giờ chạy**
- *Triệu chứng:* mọi task xong tuần tự; không có worktree nào được tạo; không ai để ý vì kết quả vẫn đúng.
- *Nguyên nhân gốc:* luật "không chắc → tuần tự", hoặc spawn từng agent rồi chờ.
- *Chặn bằng cơ chế:* `isolation: worktree` trong frontmatter của worker (không phụ thuộc main agent nhớ); luật "chỉ bằng chứng mới ép tuần tự"; đo định kỳ trên transcript: số message có ≥ 2 lời gọi Agent. Số đó bằng 0 là báo động.

🪤 **Iteration sau cướp task iteration trước đang làm**
- *Triệu chứng:* hai worker trên cùng một task, diff chồng nhau, commit đôi.
- *Nguyên nhân gốc:* lượt main agent kết thúc trong khi worker chạy nền; ngưỡng mồ côi ngắn hơn thời gian thật của task dài.
- *Chặn bằng cơ chế:* mark `[lock YYYY-MM-DD HH:MM]` **trước** khi spawn; ngưỡng tính từ p95 thời gian task của chính repo; kiểm agent còn sống trước khi nhận lại; với cron hệ thống thêm `flock -n`.

🪤 **Loop fire hàng trăm lần mà không làm gì**
- *Triệu chứng:* log dài một màu "không thay đổi"; việc đang bị chặn trông như đang chạy.
- *Nguyên nhân gốc:* chỉ có điều kiện dừng cấp lượt, thiếu cấp loop; hoặc luật dừng chỉ nằm trong lời dặn (case 62 lượt ở §2) — model không có bộ đếm bền qua các session.
- *Chặn bằng cơ chế:* `empty-streak` lưu trong `BRIEF.md` (không trong context — context của loop dài bị tóm tắt); đủ ngưỡng thì skill tự huỷ lịch và viết tổng kết chặn-bởi-ai.

🪤 **`/loop` fire nhưng skill không chạy, agent nhận được dòng chữ `/loop-tasks`**
- *Triệu chứng:* mỗi lượt Claude chỉ "đọc" lệnh như văn bản.
- *Nguyên nhân gốc:* docs ghi scheduled fire chỉ chạy skill mà Claude **được phép tự gọi**; skill có `disable-model-invocation: true`, hoặc bị deny rule chặn, sẽ tới Claude dưới dạng chữ.
- *Chặn bằng cơ chế:* đừng đặt `disable-model-invocation` cho skill loop; thử một lượt `/loop 1m` trước khi để chạy dài.

🪤 **Cron + `claude -p` chạy nhưng không tìm thấy skill, hoặc kẹt ở permission**
- *Triệu chứng:* output báo không biết `/loop-tasks`, hoặc lượt kết thúc với danh sách `permission_denials`.
- *Nguyên nhân gốc:* thêm `--bare` (docs: bỏ qua skill, CLAUDE.md, hook, subagent); hoặc không ai trả lời prompt quyền khi chạy không người.
- *Chặn bằng cơ chế:* không dùng `--bare` cho loop dựa vào skill; liệt kê đủ tool trong `--allowedTools`, chọn `--permission-mode` rõ ràng; đọc exit code + `permission_denials` trong JSON output như một phần của gate.

🪤 **Worker làm trên code cũ hơn cái bạn đang nhìn**
- *Triệu chứng:* diff của worker không áp được lên nhánh bạn đang làm, hoặc fix "đã có sẵn".
- *Nguyên nhân gốc:* docs: worktree của subagent mặc định tách từ nhánh mặc định, không từ `HEAD` của session; và `main` local có thể cũ hơn remote.
- *Chặn bằng cơ chế:* `git fetch` đầu iteration; ghi base branch vào khối Gate của `BRIEF.md` để mọi brief mang theo.

🪤 **Viết lại cả loop thành workflow "cho hiện đại", rồi mất state khi tắt máy**
- *Triệu chứng:* thoát session là run dừng; không hỏi được người khi task cần quyết định.
- *Nguyên nhân gốc:* workflow giữ state trong biến script, resume trong session; không có input giữa chừng.
- *Chặn bằng cơ chế:* loop ngoài (state trên đĩa) giữ vai orchestrator; workflow chỉ là công cụ của một task nặng.

---

## 6. Chuyển giao

- Bài này dùng `BRIEF.md` như một hộp đen đúng; các kiểu nó thối (checkbox nói dối, lock treo) ở [[ag-18-brief-la-shared-state]].
- Mọi bước "worker xong", "verifier xong" ở đây đều giả định bạn **biết** việc nền đã xong. Ba cách việc nền chết im lặng, và vì sao "đã gửi" khác "đã làm", ở [[ag-20-viec-nen-va-ack]].
- Khoá `[lock …]`, lượt chạy lại, mốc "đã xử lý" — tất cả là bài toán at-least-once và idempotency của hệ phân tán ([[msg-02-delivery-semantics]]); áp vào loop agent ở [[ag-21-loop-la-he-phan-tan]].
- Level 7 bỏ thêm một việc nữa: **bạn không còn phải mở session để bật loop**. Cách 3.7c (job định kỳ gọi headless) là cầu nối sang [[ag-23-job-dinh-ky-va-bot]].

Ở level 6, thứ bạn bỏ được là **checkpoint từng prompt**: bạn viết task vào `BRIEF.md`, loop tự nhận, tự giao, tự chấm, tự commit vào nhánh riêng. Thứ thay thế để vẫn tin được kết quả là bốn cơ chế: worktree (song song mà không đè nhau), verifier độc lập (không tự chấm), bằng chứng trong commit body (đọc ở chỗ review), và điều kiện dừng bốn tầng (không chạy mãi, không bịa việc).

---

## 7. Tóm tắt

- Một iteration = đọc → lọc → recon → nhận (`[lock …]` trước khi spawn) → giao → verify → đóng; main agent chỉ điều phối, ghi state và chạy git.
- N task/lượt tính từ trần agent đồng thời (docs: 20 subagent/session, 16 agent/workflow): 4 task cần tới ~12 chỗ ở đỉnh.
- Mặc định song song trong worktree; chỉ bằng chứng va chạm mới ép tuần tự. "Không chắc thì tuần tự" đã cho ra 0/622 lần song song (case thực tế).
- Verify task nào xong task đó, song song; `FAIL` có đúng một vòng sửa; `UNVERIFIED` không phải pass.
- Bốn tầng dừng: hết task, ~15 lượt rỗng liên tiếp (kinh nghiệm thực tế), task hỏng hai vòng, trần công cụ (7 ngày, budget, 1000 agent).
- Bấm nút lặp: `/loop` cố định hoặc tự nhịp khi bạn còn ngồi máy; cron + `claude -p`/`codex exec` khi không — và khi đó tự lo khoá; workflow cho một việc lớn một lần.
- Skill loop làm orchestrator dài hạn, workflow làm công cụ cho task nặng — hybrid, không thay thế.
