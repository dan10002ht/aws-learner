# Bài 16 — Claude điều phối, Codex làm: chấm chéo giữa hai họ model

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao **verifier khác họ model** với bên viết code bắt được loại lỗi mà verifier cùng họ bỏ qua, và tách được hai trục độc lập: *khác context* và *khác họ model*.
- Dựng một cặp lệnh headless chạy được: `codex exec` làm executor ghi trong sandbox, `claude -p` làm verifier read-only trả verdict JSON theo schema.
- Khi lane Codex "im lặng", phân biệt được **ba kiểu prompt không chạy** của worker tương tác và **một kiểu treo** của chế độ headless, mỗi kiểu bằng một dấu hiệu quan sát được.
- Viết luật fallback dạng **danh sách đóng**: hạ executor xuống Claude chỉ khi lỗi là hết quota hoặc hạ tầng, không bao giờ khi lỗi là nội dung — và ghi lại ai đã làm task để biết chỗ nào phải giảm tin.
- Đo được (thay vì tin) rằng chấm chéo có đáng tiền trên repo của bạn, bằng bộ bug cài sẵn.

---

## 2. Tình huống

Một dev chạy vòng loop nhiều agent trên repo backend: main agent (Claude Code) nhặt task từ file brief, mở một lane Codex trong terminal riêng cho mỗi task, Codex viết code, rồi một verifier Claude chấm. Lane chạy trong một công cụ điều phối terminal; mỗi lần giao việc, công cụ trả về một "receipt" báo đã gửi.

Một buổi sáng, Codex nuốt prompt **hai lần liên tiếp**: worktree vẫn rỗng, không file nào đổi, không có report. Main agent làm một việc nghe rất hợp lý:

> "Không retry mù nữa. Chuyển sang fallback: subagent Claude tự viết code cho task này."

Task xong nhanh, verifier Claude chấm PASS. Người vận hành chặn lại ngay, kèm một câu ngắn: *Claude làm điều phối, Codex làm implement — nhớ vậy*.

Vì sao chặn một task đã PASS? Vì từ lúc đổi vai, **PASS đó không còn là bằng chứng**: cùng một họ model vừa viết vừa chấm. Còn nguyên nhân thật của việc nuốt prompt — một modal tự update của Codex bật lên giữa phiên và ăn mất đoạn paste — vẫn nằm nguyên đó, sẵn sàng nuốt task kế tiếp.

Ba tuần sau, ở một hệ khác (một pipeline tự động: triage → implement → verify trên một VM), chuyện ngược lại xảy ra: Codex báo hết quota, **quota về sau ba ngày**. Ba ngày đó mọi case đều chết ở bước implement, nhìn từ ngoài chỉ thấy `failed`. Lần này đổi executor sang Claude lại là quyết định đúng — nhưng có điều kiện và có ghi sổ.

Hai lần cùng là "Codex không làm được, đưa cho Claude". Một lần sai, một lần đúng. Bài này là về ranh giới giữa hai lần đó.

*(Case thực tế, ẩn danh; mọi con số trong bài lấy từ các lần chạy đó — một lần chạy, không phải benchmark.)*

---

## ⏸ Dừng lại — đoán trước

**Verifier đã có context sạch (không thấy quá trình viết code, chỉ thấy diff và tiêu chí). Vậy cho nó cùng họ model với bên viết thì còn mất gì?**

```
(a) Không mất gì — context sạch là đủ để độc lập
(b) Mất tính độc lập về "điểm mù": hai bên có thể sai cùng một kiểu, nên lỗi lọt qua cả hai
(c) Chỉ mất về chi phí, vì cùng một quota
(d) Mất khả năng chạy test, vì verifier cùng họ sẽ tin test của bên viết
```

Đáp án nằm ở §3.1.

---

## 3. Cơ chế

### 3.1 Hai trục độc lập: khác context và khác họ model

**Họ model** (model family) ở đây nghĩa là các model cùng một nhà làm, cùng dòng huấn luyện — ví dụ các model Claude là một họ, các model chạy sau Codex là một họ khác.

Verifier có thể "độc lập" theo hai nghĩa không thay thế nhau:

| | Cùng họ model | Khác họ model |
|---|---|---|
| **Cùng context** (agent tự chấm việc vừa làm) | Đọc lại lập luận của chính mình — gần như luôn PASS | Hiếm gặp trong thực tế |
| **Context sạch** (verifier riêng, chỉ thấy diff + tiêu chí) | Không bị lập luận cũ dẫn dắt, nhưng vẫn chung điểm mù | Cả hai lớp độc lập |

Trục **context** đã học ở [[ag-12-verifier-doc-lap]]: verifier không đọc quá trình suy luận của bên viết nên không bị nó dẫn đi. Trục **họ model** là cái bài này thêm vào. Đáp án câu đoán là **(b)**.

**Vì sao trục thứ hai có giá trị — dữ kiện có nguồn:**

- Panickssery, Bowman, Feng, *LLM Evaluators Recognize and Favor Their Own Generations* (NeurIPS 2024, arXiv:2404.13076): model làm giám khảo **chấm điểm cao hơn cho văn bản do chính nó sinh ra** so với văn bản của model khác, trong khi người chấm coi hai bên ngang nhau; và mức thiên vị này tương quan tuyến tính với khả năng model **nhận ra văn bản của chính mình**.
- Huang và cộng sự, *Large Language Models Cannot Self-Correct Reasoning Yet* (ICLR 2024, arXiv:2310.01798): khi không có tín hiệu bên ngoài, model tự sửa câu trả lời suy luận của mình thường **không tốt lên, có khi tệ đi**.

Hai paper đo trên tác vụ tóm tắt và suy luận, không phải review code — nên việc áp sang code là **suy luận**, không phải kết quả đo trực tiếp.

**Cơ chế suy luận ra:** gọi `e` là xác suất bên viết để lại một lỗi, `m` là xác suất verifier bỏ sót lỗi đó. Lỗi lọt qua cả hai với xác suất `e × m` **chỉ khi hai sự kiện độc lập**. Hai model cùng họ có chung dữ liệu, chung thói quen sinh code, nên lỗi mà bên viết hay mắc lại chính là lỗi bên chấm hay coi là "trông ổn" — `m` không còn độc lập với `e`, xác suất lọt lớn hơn tích. Khác họ không làm `m` về 0; nó chỉ làm hai điểm mù **ít trùng nhau hơn**.

**Số chưa đo, không điền.** Bài không đưa con số "khác họ bắt được nhiều hơn X%" vì chưa có phép đo trên code của bạn. Cách đo nằm ở §4 (bộ bug cài sẵn, so tỉ lệ bắt giữa hai verifier).

**Kinh nghiệm thực tế:** trong pipeline tự động kể ở §2, bước verify được tách thành một tiến trình riêng chính vì lý do này: gộp verify vào bước implement thì *"là để agent tự chấm chính giả thuyết của mình, gần như luôn PASS"*.

### 3.2 Phân vai: ai điều phối, ai viết, ai chấm

Cấu hình mà các case trong bài dùng:

| Vai | Ai | Quyền |
|---|---|---|
| Điều phối (main agent) | Claude Code | Đọc repo, viết brief, mở lane, **commit** |
| Executor (implement) | Codex | Ghi trong worktree của task, không ghi `.git` |
| Verifier | Claude, context sạch | Read-only + chạy lệnh gate |

**Vì sao chiều này, không phải chiều ngược lại — kinh nghiệm thực tế, không phải luật:**

1. Main agent cần nhiều cơ chế điều phối (subagent, theo dõi tiến trình nền, đọc file report) — phía Claude Code đã có sẵn trong phiên đang dùng.
2. Implement là phần ngốn token nhất. Đẩy nó sang quota Codex thì quota Claude chỉ gánh điều phối + verify. Lý do này có thật: quota Claude theo tuần từng **cạn giữa phiên**, làm treo cả loạt task chưa verify được.
3. Điều thật sự bắt buộc chỉ có một: **executor và verifier khác họ**. Đảo chiều (Codex chấm, Claude viết) vẫn giữ được chấm chéo.

Hệ quả quan trọng: việc **main agent tự làm** (sửa gate, sửa task list, restart một service mà sandbox của lane chặn) cũng là code do Claude viết — nó vẫn phải qua verifier như mọi task khác, và lúc đó verifier Claude là chấm cùng họ. Ghi rõ điều đó trong log, đừng để nó lẫn vào các task chấm chéo.

### 3.3 Gọi Codex và Claude ở chế độ headless

**Headless / non-interactive** nghĩa là chạy agent bằng một lệnh, không có giao diện terminal tương tác (TUI): nhận prompt, làm, in kết quả, thoát. Đây là dạng dễ điều phối nhất vì không có ô nhập để prompt bị nuốt.

**Codex — `codex exec`** (nguồn: Codex docs, trang *Non-interactive mode*, `https://developers.openai.com/codex/noninteractive`, hiện chuyển hướng sang `https://learn.chatgpt.com/docs/non-interactive-mode`):

- Mặc định `codex exec` chạy trong **sandbox read-only**. Muốn sửa file phải `--sandbox workspace-write` (giá trị còn lại docs liệt kê là `danger-full-access`).
- `--full-auto` **không còn được hỗ trợ**; docs bảo dùng `--sandbox workspace-write`. Script cũ còn flag này sẽ hỏng.
- Tiến trình in ra **stderr**, chỉ thông điệp cuối của agent in ra **stdout**. `-o <path>` (`--output-last-message`) ghi thông điệp cuối ra file.
- `--json` biến stdout thành luồng JSON Lines các sự kiện (ví dụ `thread.started`, `turn.completed`).
- `--output-schema <file>` yêu cầu câu trả lời cuối khớp một JSON Schema.
- **stdin:** nếu vừa pipe stdin vừa truyền prompt làm đối số, prompt là chỉ thị còn nội dung pipe là ngữ cảnh thêm; bỏ đối số prompt thì Codex đọc prompt từ stdin; `codex exec -` ép đọc prompt từ stdin.
- Docs không nêu exit code cụ thể — đừng viết script dựa trên một mã thoát bạn đoán.

**Claude — `claude -p`** (nguồn: Claude Code docs, *Run Claude Code programmatically*, `https://code.claude.com/docs/en/headless`):

- `-p` / `--print` chạy không tương tác; thoát mã 0 khi thành công, khác 0 khi hỏng. Lỗi xảy ra **trong** lượt chạy (ví dụ thiếu đăng nhập) được in làm *result* trên **stdout**, không phải stderr.
- `--output-format json` trả `result`, `session_id`, `total_cost_usd`…; thêm `--json-schema '<schema>'` thì kết quả có cấu trúc nằm ở trường `structured_output`.
- `--allowedTools` theo cú pháp permission rule, ví dụ `Bash(git diff *)` (dấu cách trước `*` là bắt buộc để khớp tiền tố).
- `--permission-mode dontAsk`: mọi lệnh lẽ ra phải hỏi người đều **bị từ chối**; đọc file trong thư mục làm việc và lệnh được allow vẫn chạy. Hợp với verifier: không có `Edit` trong allow ⇒ không sửa được file.

Một cặp lệnh executor + verifier (chạy được, thay đường dẫn cho repo của bạn):

```bash
# executor: Codex ghi trong worktree của task, prompt đọc từ file qua stdin
cd ../wt-T1
codex exec --sandbox workspace-write -o ../.lanes/report-T1.md - < ../.lanes/brief-T1.md

# verifier: Claude read-only, chỉ được đọc + chạy test + xem diff, trả verdict JSON
claude -p "$(cat ../.lanes/verify-T1.md)" \
  --permission-mode dontAsk \
  --allowedTools "Read,Grep,Glob,Bash(git diff *),Bash(npm test *)" \
  --output-format json \
  --json-schema "$(cat ../.lanes/verdict.schema.json)" \
  | jq '.structured_output' > ../.lanes/verdict-T1.json
```

Hai điểm trong lệnh trên là có chủ ý:

1. Prompt Codex vào bằng `- < file` chứ không bằng pipe từ một tiến trình khác. Lý do ở §3.4, kiểu treo thứ tư.
2. Report và verdict nằm ở **file**, không ở bộ nhớ của main agent. File sống qua timeout và qua việc main agent bị nén context — xem [[ag-15-worktree-va-xung-dot]] về chỗ lưu bằng chứng.

**Kinh nghiệm thực tế về sandbox + worktree:** trong một git worktree, `.git` là một *file* trỏ về thư mục `.git/worktrees/<tên>` nằm trong repo chính — tức **ngoài** thư mục worktree. Sandbox `workspace-write` của Codex vì vậy chặn `git commit` thật sự, không cần dặn "đừng commit" trong prompt. Đây là chặn bằng cấu hình (xem [[ag-08-hook-va-chan-bang-cau-hinh]]), và cũng là lý do vai commit nằm ở main agent.

### 3.4 Lane im lặng: bốn kiểu "prompt không chạy"

Luật đầu tiên, rút từ case: **receipt "đã gửi" không chứng minh prompt đã chạy.** Một lần main agent báo "cả hai task đang chạy song song" trong khi cả hai đã chết — vì nó không kiểm sau khi gửi.

"Im lặng" có ba nghĩa và chỉ một nghĩa là lỗi: (1) đang làm việc nặng; (2) đang **chờ main agent trả lời** một câu hỏi; (3) prompt chưa hề chạy. `status` của công cụ điều phối không phân biệt được ba nghĩa này. Đọc **transcript terminal** thì phân biệt được.

Với worker Codex chạy TUI trong terminal (cách dùng khi muốn nhìn thấy tiến trình), case ghi được ba biến thể:

| # | Cơ chế | Dấu hiệu đọc được | Gỡ |
|---|---|---|---|
| 1 | **Modal tự update nuốt prompt.** Codex có bản mới giữa phiên, modal hiện ra, đoạn paste bị nuốt, terminal rơi về shell | Worker chết sau 9–23 giây; terminal ở dấu nhắc shell | Ghim/vá phiên bản Codex trước khi giao việc, rồi chạy lại |
| 2 | **Terminal bị dựng lại**, Codex đứng ở màn hình khởi động (sau khi công cụ điều phối restart) | **Banner Codex hiện hai lần** trong transcript; 13 phút vẫn chưa có `node_modules` | Chạy lại |
| 3 | **Prompt đã paste nhưng chưa submit** | Dòng `[Pasted Content 24682 chars] tab to queue message` ở ô nhập | Gửi một phím Enter — không giao lại việc |

Biến thể 1 có bẫy kèm: **vá một lần không đủ.** Trong case, đầu phiên đã vá lên `0.153.4`, rồi Codex ra `0.154.0` giữa phiên: task giao trước mốc đó một phút lọt qua, task giao sau chín phút thì dính. Vá phải là một bước **trước mỗi lần giao việc**, không phải đầu phiên.

Với `codex exec` headless, ba biến thể trên biến mất (không có TUI, không có ô nhập), nhưng có **biến thể 4** — gặp thật trong pipeline tự động:

| # | Cơ chế | Dấu hiệu | Gỡ |
|---|---|---|---|
| 4 | Code Node gọi `codex exec` bằng `execFile`, **ống stdin được mở và không bao giờ đóng**. Theo docs, khi stdin được pipe thì Codex đọc nó làm ngữ cảnh thêm ⇒ chờ EOF mãi | 4 tiến trình sống 9 phút, **0.0% CPU**, không ghi gì | `spawn` với `stdio: ['ignore', ...]`, hoặc từ shell `< /dev/null`. Xác nhận: cùng lệnh thêm `< /dev/null` trả lời trong vài giây |

Một chi tiết ngược trực giác: `codex exec` chạy được **không** chứng minh worker TUI chạy được. Trong case, một bản update làm mọi worker TUI chết lúc khởi động (`Cannot use the shared background server: ...`) trong khi `codex exec` vẫn chạy bình thường.

**Mốc để nghi, thay cho "chờ thêm":** worker lành trên repo đó có `node_modules` sau khoảng 55 giây. Quá ~8 phút chưa có ⇒ đọc terminal ngay. Tính thử độ trễ phát hiện:

```python
healthy = 55          # giây — worker lành có node_modules (case thực tế)
threshold = 8 * 60    # giây — ngưỡng nghi
blind_wait = 25 * 60  # giây — lần chờ suông tới timeout (case thực tế)
print(threshold / healthy)             # ≈ 8.7 lần thời gian bình thường: đủ rộng để không báo động giả
print((blind_wait - threshold) / 60)   # 17.0 phút tiết kiệm mỗi lượt có worker chết
```

Mốc này là của một repo cụ thể. Repo của bạn cần mốc riêng: chọn một tác dụng phụ sớm, rẻ để kiểm (thư mục cài dependency, file report "started", commit đầu tiên…), đo nó trên vài lần chạy lành, đặt ngưỡng cỡ vài lần giá trị đó.

### 3.5 Lane hỏng thì sửa nguyên nhân, không đổi vai

Quay lại §2. Đổi vai khi lane hỏng có ba cái giá:

1. **Mất lớp chấm chéo** cho task đó — PASS về sau là tự chấm.
2. **Giấu nguyên nhân.** Modal update vẫn còn; task kế tiếp lại chết; lần nào cũng đổi vai thì cả loop thành "Claude làm hết", quota Claude gánh mọi thứ.
3. **Hai bên cùng làm một task** nếu Codex hoá ra chỉ chậm chứ không chết — hai bộ thay đổi đè lên nhau trong cùng worktree.

Quy trình đúng — kinh nghiệm thực tế:

```
lane im lặng quá ngưỡng
  → đọc transcript (không retry mù)
  → khớp một trong bốn biến thể ở §3.4
  → gỡ đúng nguyên nhân (vá version / chạy lại / gửi Enter / đóng stdin)
  → giao lại CHÍNH lane đó
```

Nếu bắt buộc phải cho subagent Claude chạy tạm để loop không đứng hình, thì **dừng nó ngay khi Codex nhận việc** và ghi task đó là `executor: claude`.

### 3.6 Fallback khi hết quota: danh sách đóng, có ghi sổ

Quota là ràng buộc khác hẳn lỗi tạm thời. Trong case, Codex báo hết quota và hẹn **ba ngày** sau — retry vài phút một lần không cứu được, chỉ đổi executor mới cứu được.

Quyết định đã áp dụng trong pipeline tự động:

1. Thử Codex trước. **Chỉ khi** thông báo lỗi khớp một regex "hết quota" mới hạ xuống Claude. Mọi lỗi khác ném nguyên để case fail đúng lý do.
2. Ghi `executor: codex | claude` và chi phí implement của Claude vào state của case.
3. Claude ở vai implement được ghi file; verify **giữ nguyên** read-only.

Vì sao chỉ quota, không phải mọi lỗi: nếu mọi lỗi đều đổi executor thì timeout, output thiếu khối JSON, lệnh không tồn tại… đều thành "chạy lại bằng model khác" — tốn gấp đôi và che mất lỗi thật. Regex trong case được kiểm hai chiều trên 7 mẫu lỗi thật: bắt 3 dạng hết quota, bỏ qua 4 lỗi thật (kỹ thuật kiểm hai chiều ở [[ag-11-gate-xanh-gia]]).

Một bảng fallback dạng **danh sách đóng** cho loop có lane (mọi trường hợp không có trong bảng = không fallback):

| Tình huống | Fallback sang Claude? |
|---|---|
| Tiền kiểm đầu lượt fail (`codex --version` lỗi) | Có, cả lượt |
| Hết quota (khớp regex đã kiểm hai chiều) | Có, tới khi quota về |
| Lane không nhận việc **2 lần liên tiếp** sau khi đã gỡ theo §3.4 | Có, riêng task đó |
| Verifier trả FAIL | **Không** — lỗi nội dung, giao lại đúng một vòng cho chính lane đó |
| Lane chạy chậm | **Không** — chờ, hoặc để timeout xử lý |
| Đã đủ số lane song song tối đa | **Không** — hoãn task sang lượt sau |

Fallback **có giá**, và case ghi rõ:

- **Chạy được:** lần đầu fallback kích hoạt, Claude implement trong 411 giây (~6,9 phút), 3 file, 95 dòng, hai commit đúng thiết kế (test fail → fix pass), verify PASS.
- **Đắt hơn:** case đó tốn 2,49 USD cho phần implement bằng Claude — số của một case, không ngoại suy được.
- **Mất cross-family:** executor và verifier cùng họ. Hệ trong case mới chỉ **ghi lại** điều đó qua trường `executor`, chưa hạ ngưỡng tin và chưa bắt buộc người review — một món nợ có ý thức, không phải chỗ quên. Cách trả nợ hợp lý: task có `executor: claude` thì yêu cầu thêm một bằng chứng phân biệt được (test tái hiện lỗi chạy đỏ trên code cũ, xanh trên code mới) hoặc đưa vào hàng người review.
- **Mất đường lùi cuối:** khi fallback, cả điều phối + implement + verify cùng rút một quota Claude. Codex hết còn Claude; Claude hết thì không còn gì.

Không ghi `executor` thì hai tuần sau không ai biết task nào được chấm chéo, task nào tự chấm, và không đo được lane Codex có đáng duy trì không.

---

## 4. Làm thử

Mục tiêu: trên một repo nhỏ của bạn, chạy một task bằng cặp Codex-viết / Claude-chấm, có fallback theo quota, có ghi executor; rồi đo xem verifier hai họ bắt bug khác nhau thế nào.

**Chuẩn bị:** một repo có test chạy bằng một lệnh (ví dụ `npm test`), đã cài và đăng nhập cả `codex` và `claude`, có `jq`.

**Bước 1 — schema verdict** `.lanes/verdict.schema.json`:

```json
{
  "type": "object",
  "properties": {
    "verdict": { "enum": ["PASS", "FAIL", "UNVERIFIED"] },
    "evidence": { "type": "array", "items": { "type": "string" } },
    "reproduced_before_fix": { "type": "boolean" }
  },
  "required": ["verdict", "evidence", "reproduced_before_fix"]
}
```

**Bước 2 — script chạy một task** `run-task.sh` (chạy được với bash; regex quota là **minh hoạ** — thay bằng thông báo lỗi thật bạn thu được):

```bash
#!/usr/bin/env bash
set -uo pipefail
ID="$1"; WT="../wt-$ID"; L="$(pwd)/.lanes"
RE_QUOTA='usage limit|hit your .*limit|quota'   # minh hoạ — kiểm hai chiều trước khi dùng

git worktree add -q "$WT" -b "task/$ID" 2>/dev/null || true

executor=codex
out=$( cd "$WT" && codex exec --sandbox workspace-write \
        -o "$L/report-$ID.md" - < "$L/brief-$ID.md" 2>&1 ); rc=$?
if [ $rc -ne 0 ]; then
  if echo "$out" | grep -Eiq "$RE_QUOTA"; then
    executor=claude
    ( cd "$WT" && claude -p "$(cat "$L/brief-$ID.md")" \
        --permission-mode acceptEdits --allowedTools "Bash(npm test *)" \
        > "$L/report-$ID.md" < /dev/null ) || { echo "$ID executor=claude FAILED"; exit 1; }
  else
    echo "$ID executor=codex FAILED (không phải quota, không fallback):"; echo "$out" | tail -5
    exit 1
  fi
fi

( cd "$WT" && claude -p "$(cat "$L/verify-$ID.md")" \
    --permission-mode dontAsk \
    --allowedTools "Read,Grep,Glob,Bash(git diff *),Bash(npm test *)" \
    --output-format json --json-schema "$(cat "$L/verdict.schema.json")" < /dev/null ) \
  | jq '.structured_output' > "$L/verdict-$ID.json"

echo "$ID executor=$executor verdict=$(jq -r .verdict "$L/verdict-$ID.json")" | tee -a "$L/log.txt"
```

**Bước 3 — brief và đề chấm.** `.lanes/brief-T1.md` mô tả task + done-criteria (lệnh test phải xanh, không sửa file ngoài phạm vi). `.lanes/verify-T1.md` nói rõ: chỉ đọc, chạy `git diff` và lệnh test, **dựng lại lỗi trên code trước fix** nếu là bug, trả verdict kèm bằng chứng — mẫu đầy đủ ở [[ag-12-verifier-doc-lap]].

**Bước 4 — kiểm fallback đi đúng nhánh.** Thử regex bằng hai nhóm chuỗi trước khi tin nó:

```bash
for s in "You've hit your usage limit, try again later" \
         "Error: failed to load skill" "timeout after 600s" "command not found: pnpm"; do
  printf '%-50s -> ' "$s"; echo "$s" | grep -Eiq 'usage limit|hit your .*limit|quota' && echo QUOTA || echo khac
done
```

Kết quả mong đợi: chỉ dòng đầu ra `QUOTA`. Nếu một lỗi thật bị xếp `QUOTA`, regex của bạn đang biến lỗi thật thành "chạy lại bằng model khác".

**Bước 5 — đo chấm chéo trên repo của bạn (thay cho tin con số của người khác).**

1. Lấy 10 commit sửa bug cũ trong repo. Với mỗi cái, tạo một nhánh **cài lại bug**: revert phần fix và xoá luôn test hồi quy đi kèm, để verifier không được test nhắc bài.
2. Cho hai verifier chấm cùng diff "giả vờ đây là bản fix": một là Claude (`claude -p` như trên), một là Codex (`codex exec` với sandbox read-only mặc định và `--output-schema` cùng schema; nếu lệnh test cần ghi file tạm thì chạy `--sandbox workspace-write` trên một worktree bỏ đi được).
3. Ghi bảng: bug nào verifier nào trả FAIL. Đếm riêng những bug **chỉ một bên** bắt được.

Số đếm đó — trên đúng codebase của bạn — mới là cơ sở để quyết định có đáng trả công điều phối hai họ model hay không.

**Tiêu chí "xong" (kiểm được):**

- [ ] `.lanes/log.txt` có dòng `T1 executor=codex verdict=...`.
- [ ] `jq -e '.verdict and (.evidence|length>0)' .lanes/verdict-T1.json` thoát mã 0.
- [ ] Trong worktree, `git log task/T1` **không** có commit do Codex tạo (sandbox đã chặn `.git`).
- [ ] Bước 4 in đúng một dòng `QUOTA`.
- [ ] Có bảng 10 bug × 2 verifier ở Bước 5, kèm số bug chỉ một bên bắt được.

---

## 5. Bẫy thường gặp

### Lane hỏng nào cũng giao cho Claude viết, rồi coi PASS như thường

Loop vẫn chạy, task nào cũng PASS, nhưng mở log ra thì toàn `executor: claude`, và có task Claude viết, Claude chấm rồi merge thẳng. Fallback không có danh sách đóng nên trục trặc nào cũng thành lý do đổi vai, còn nguyên nhân thật (modal update, stdin mở) không ai sửa; verdict lại không mang thông tin "ai viết". Viết bảng fallback đóng ở §3.6 vào skill loop, ghi `executor` cho mỗi task và đưa nó vào verdict file. Báo cáo cuối lượt in tỉ lệ task chấm chéo: tỉ lệ tụt là tín hiệu có nguyên nhân chưa sửa. Gate merge yêu cầu thêm bằng chứng phân biệt được hoặc người review khi `executor == verifier_family`.

### Tin receipt "đã giao việc"

Main agent báo "4 task đang chạy" trong khi worktree rỗng. Receipt chỉ chứng minh văn bản đã tới terminal, không chứng minh agent đã submit và bắt đầu chạy. Sau khi giao việc, chờ tác dụng phụ đầu tiên (mốc §3.4) có thời hạn; quá hạn thì đọc transcript bằng script chứ không hỏi `status`, rồi khớp với bốn biến thể ở §3.4 (kể cả việc vá phiên bản phải làm trước mỗi lần giao, và `codex exec` treo 0% CPU vì stdin không đóng). Chi tiết về ack ở [[ag-20-viec-nen-va-ack]].

### Regex bắt quota chưa kiểm hai chiều

Hoá đơn Claude tăng dần, còn lỗi thật như thiếu dependency hay timeout thì biến mất khỏi log. Regex rộng quá đã biến lỗi thật thành fallback. Giữ một file mẫu lỗi thật gồm cả hai nhóm và chạy nó như test của regex **mỗi lần sửa regex** (Bước 4).

### Đọc lỗi `claude -p` ở nhầm luồng

Script báo "Claude lỗi: success" hoặc một thông báo vô nghĩa, và việc chẩn đoán đi sai hướng. Theo docs, lỗi xảy ra trong lượt chạy (ví dụ thiếu đăng nhập) được in làm result trên **stdout**, không phải stderr, nên script đã cắt sai chỗ. Dùng `--output-format json`, kiểm exit code và đọc trường kết quả thay vì grep stderr.

### Verifier "read-only" vẫn sửa được file

Verdict PASS nhưng diff có thêm thay đổi không ai giao, vì verifier chạy ở mode tự duyệt ghi (`acceptEdits`) hoặc được allow `Edit`. Dùng `--permission-mode dontAsk` với allowlist chỉ gồm công cụ đọc và lệnh gate, rồi kiểm bằng `git status` trước và sau bước verify: hai lần phải giống nhau.

---

## 6. Chuyển giao

- Bài này dựa trên [[ag-12-verifier-doc-lap]] (verifier context sạch, verdict có bằng chứng) và thêm trục thứ hai: khác họ model. Cơ chế agent gọi tool nói chung ở [[aiml-05-agents-tools]]; hai công cụ CLI so sánh ở [[ag-03-coding-agent-hoat-dong]].
- Lane, worktree, chỗ lưu report là nền của [[ag-15-worktree-va-xung-dot]]; brief giao việc là [[ag-14-subagent-va-brief]].
- Bài kế [[ag-17-soat-cheo-noi-dung]] chuyển từ chấm chéo **một task** sang soát chéo **nhiều phần** do nhiều agent viết song song.
- Lên level 6, [[ag-19-vong-lap-nhat-task]] gói toàn bộ thứ ở đây — mốc nghi, bảng fallback đóng, ghi `executor` — vào một skill loop chạy không cần người ngồi xem. Thứ level 6 bỏ được nhờ bài này: việc **ngồi nhìn từng lane** để biết nó chết hay sống, và việc **tự tay chọn** ai làm task khi một bên hết quota.

---

## 7. Tóm tắt

- Verifier độc lập theo hai trục: **context sạch** và **khác họ model**. Context sạch không xoá được điểm mù chung của hai model cùng họ; nghiên cứu cho thấy model chấm ưu ái văn bản của chính nó và khó tự sửa khi không có tín hiệu ngoài.
- Bắt buộc duy nhất: executor và verifier khác họ. Claude điều phối + chấm, Codex viết là một cách chia quota hợp lý, không phải luật.
- Headless: `codex exec` (mặc định read-only, ghi cần `--sandbox workspace-write`, `--full-auto` đã bỏ, `-o`, `--output-schema`) và `claude -p` (`--permission-mode dontAsk`, `--json-schema`, lỗi in trên stdout).
- Receipt không phải bằng chứng. Lane im lặng có bốn kiểu chết — modal update, terminal dựng lại, paste chưa submit, stdin không đóng — mỗi kiểu một dấu hiệu, gỡ bằng nguyên nhân chứ không bằng đổi vai.
- Fallback sang Claude chỉ theo **danh sách đóng** (quota, hạ tầng), regex quota kiểm hai chiều, và luôn ghi `executor` — vì lúc đó PASS là tự chấm và phải được giảm tin.
- Đừng mượn con số của người khác về lợi ích chấm chéo: đo trên repo của bạn bằng bộ bug cài lại.
