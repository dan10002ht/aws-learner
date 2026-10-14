# Bài 10 — Định nghĩa "xong" bằng lệnh chạy được

## 1. Mục tiêu

Sau bài này bạn có thể:

- Viết một **done-criteria** mà máy kiểm được: mỗi dòng có mệnh đề, lệnh đo, điều kiện pass, và điều kiện môi trường để phép đo còn đúng.
- Phân biệt **lời khai** ("code khai báo N") với **phép đo** ("người dùng nhận được N"), và chỉ ra vì sao một tiêu chí dạng lời khai đi qua mọi vòng verify mà không bao giờ đỏ.
- Tự tính thử một tiêu chí có số **trước khi giao**, để phát hiện tiêu chí bất khả thi về toán.
- Tách tiêu chí **boolean** khỏi tiêu chí **thống kê**, và gắn điều kiện tải máy vào đúng loại cần nó.
- Đặt **một gate hợp nhất** chạy trên trạng thái đã merge, và chạy gate **một lần cho cả cụm bug** thay vì một lần cho mỗi bug.
- Dựng một file `gate.sh` + một Stop hook để agent không kết thúc lượt khi gate còn đỏ.

---

## 2. Tình huống

Một dự án web có trang bản đồ giá: mỗi ô là một mức giá, tô theo **5 bậc màu**, có legend 5 ô, và hai tay kéo (handle) để chọn khoảng giá. Dự án chạy theo kiểu Level 4–6: agent viết code, một verifier độc lập chấm, rồi mới merge. Trong brief có ba tiêu chí nghiệm thu:

```
- Heat-map hiển thị đủ 5 bậc màu
- Bảng giá seed đủ 5 bậc
- Mỗi handle có vùng chạm 44px (chuẩn chạm ngón tay)
```

Qua nhiều vòng worker + verifier, cả ba tiêu chí đều được đánh dấu đạt. Verifier có bằng chứng hẳn hoi: legend vẽ đủ 5 ô màu; hằng số số bậc trong code ghi `5`; handle khai `stroke-width="44"`; thậm chí có một assertion trong test tên là *"lost part of its 44px touch target"* — và nó xanh.

Rồi một lượt kiểm khác đo thật (case thực tế, một lần chạy, không phải benchmark):

| Tiêu chí | Vì sao ai cũng tin | Khi đo |
|---|---|---|
| Heat-map 5 bậc | legend vẽ đủ 5 ô | hàm chọn màu chỉ trả **4 nhánh**; bậc giữa không bao giờ đạt tới trừ khi `max <= min` |
| Seed đủ 5 bậc | seed có 5 giá khác nhau | phân bố lệch: một giá ở tỉ lệ `0,163` của khoảng rơi cùng bậc với giá rẻ hơn hẳn nó ⇒ chỉ ra 4 màu |
| Vùng chạm 44px | thuộc tính ghi 44 | hit-test thật ra **36,7px**; hai handle cách nhau **28,96px**, hai dải 44px **không thể cùng tồn tại** |

Không cái nào là hồi quy. Cả ba sai **từ ngày đầu**, và đi qua mọi vòng chấm mà không vòng nào đỏ được. Không ai lười: verifier đã chạy lệnh, đọc output, trích bằng chứng. Vấn đề nằm ở chỗ khác — ở chính dòng tiêu chí.

---

## ⏸ Dừng lại — đoán trước

Tiêu chí là *"mỗi handle có vùng chạm 44px"*. Verifier chạy `grep 'stroke-width="44"'` trên DOM đã render, thấy khớp ở cả hai handle, trả PASS kèm dòng output. Câu nào đúng nhất?

```
(a) Đạt — có bằng chứng chạy được, trích nguyên văn, đúng quy trình verifier
(b) Chưa đạt — grep là phép kiểm yếu, phải dùng test framework thật
(c) Chưa kiểm — phép kiểm trả lời câu "code khai bao nhiêu", tiêu chí hỏi "ngón tay chạm được bao nhiêu"
(d) Không xác định được nếu chưa chạy trên điện thoại thật
```

Đáp án ở §3.2.

---

## 3. Cơ chế

### 3.1 Done-criteria là gì, và vì sao Level 4 cần nó

**Done-criteria** là điều kiện "xong" kiểm được bằng lệnh: chạy một thứ, đọc exit code hoặc một con số, so với ngưỡng. **Gate** là chốt chặn dùng done-criteria: không qua thì không đi tiếp (không báo xong, không commit, không merge). **Gate deterministic** là gate bằng script thường — test, lint, build, một script đo — không dùng LLM để phán.

Ở Level 2 ([[ag-05-checkpoint-tung-buoc]]) bạn tin kết quả vì bạn đọc diff. Level 4 bỏ việc đó. Cái thay thế phải trả lời được cùng câu hỏi "có đúng không" mà không cần mắt người, và chỉ có hai thứ làm được: **một lệnh** và **một agent khác chạy lệnh đó** ([[ag-12-verifier-doc-lap]]). Bài này lo phần thứ nhất. Nếu dòng tiêu chí không có lệnh, verifier sẽ tự chế lệnh — và nó sẽ chế cái rẻ nhất, thường là đọc lại chính thứ agent viết code đã viết.

Một dòng done-criteria đầy đủ có bốn phần:

| Phần | Câu hỏi nó trả lời | Ví dụ |
|---|---|---|
| Mệnh đề | Điều gì phải đúng *với người dùng / hệ thống*? | "heat-map dùng đủ 5 bậc màu trên dữ liệu seed" |
| Lệnh đo | Chạy gì để biết? | `python3 measure.py 5` |
| Điều kiện pass | Đọc output thế nào? | exit 0; dòng `(5/5)` |
| Điều kiện môi trường | Phép đo còn đúng khi nào? | không cần (boolean) / "máy rảnh, swap thấp" (thống kê, §3.4) |

Thiếu cột "lệnh đo" thì dòng đó là một **mong muốn**, không phải tiêu chí.

### 3.2 Con số trong tiêu chí là lời khai cho tới khi có cách đo

Quay lại câu hỏi ⏸. Đáp án là **(c)**. Lệnh grep không sai, output không bịa — nó trả lời đúng một câu hỏi khác. Có hai mệnh đề:

1. "Code **khai** handle rộng 44" — đúng, grep chứng minh được.
2. "Ngón tay **chạm được** một vùng 44px quanh mỗi handle" — grep không nói gì về điều này.

Tiêu chí hỏi mệnh đề 2. Phép kiểm đọc mệnh đề 1. Đáp án (b) sai vì đổi grep sang test framework mà vẫn assert thuộc tính `stroke-width` thì vẫn đọc mệnh đề 1 — chính assertion *"lost part of its 44px touch target"* trong tình huống là ví dụ. Đáp án (d) đúng một phần nhưng thừa: hit-test trong browser headless đã đủ để đọc mệnh đề 2, không cần máy thật.

Vì sao loại sai này sống dai: mỗi vòng verify đều có bằng chứng thật, và bằng chứng luôn xanh, vì nó đo **chính lời khai**. Không có vòng nào đỏ được, nên không có vòng nào sinh ra tín hiệu để nghi ngờ. Kinh nghiệm thực tế từ case trên: ba con số này đi qua nhiều vòng worker + verifier mà không bị bắt, cho tới khi có người đổi phép đo.

Luật:

> Mọi tiêu chí chứa một con số phải trả lời được **hai câu**: *đo bằng cách nào*, và *máy này đo được không*. Không trả lời được thì nó là lời khai.

Cách viết lại ba tiêu chí trong tình huống:

| Viết kiểu lời khai | Viết kiểu phép đo |
|---|---|
| Heat-map hiển thị đủ 5 bậc màu | Gọi hàm chọn màu trên toàn bộ seed, đếm số màu **phân biệt** được trả về, ≥ 5 |
| Seed đủ 5 bậc | (gộp vào dòng trên — "5 giá khác nhau" không suy ra "5 bậc") |
| Vùng chạm 44px | Trong browser headless, `document.elementFromPoint` quét ngang qua handle theo bước 1px, đo bề rộng vùng trả về đúng handle đó, ≥ 44 |

**Tiêu chí bất khả thi về toán.** Biến thể tệ hơn: tiêu chí không thể đạt với dữ liệu đang có. Hai handle cách nhau 28,96px, mỗi cái muốn một dải 44px quanh tâm:

```python
w, d = 44, 28.96          # bề rộng dải mong muốn, khoảng cách hai tâm (số đo từ case)
overlap = w - d           # 15.04 px hai dải đè lên nhau
inner = d / 2             # 14.48 px: mỗi handle chỉ "sở hữu" được nửa khoảng giữa
effective = w / 2 + inner # 36.48 px: bề rộng tối đa mỗi handle có thể có
print(overlap, inner, effective)
```

Theo hình học, mỗi handle có tối đa cỡ 36,5px — gần với 36,7px hit-test đo được (suy luận từ số đo của case; chênh lệch nhỏ có thể do làm tròn hoặc vùng ngoài của dải). Tức là **không có code nào đạt được tiêu chí 44px** khi hai handle sát nhau như vậy. Giao tiêu chí này cho agent, có hai kết cục:

- Agent báo `failed` đúng theo chữ của tiêu chí — **hành vi cần giữ**, và cần ghi vào brief rằng báo `failed` là được phép.
- Agent lặng lẽ làm cho xanh: nới assertion, đổi thuộc tính, chọn phép đo dễ hơn. Sai mà trông đúng.

Quyết định sửa tiêu chí hay sửa thiết kế (giãn khoảng cách handle, đổi thành một thanh trượt có hai đầu) là việc của **người viết tiêu chí**, không phải của worker. Người viết tiêu chí có nghĩa vụ tự tính trước — năm dòng Python ở trên rẻ hơn một vòng worker + verifier.

### 3.3 Gate của repo: dán nguyên văn, đừng chế

Lỗi phổ biến nhất khi viết done-criteria cho agent là viết theo **mặc định chung**: "`tsc` exit 0, test pass, lint sạch". Kinh nghiệm thực tế: rất nhiều repo không có TypeScript, hoặc có lệnh chuẩn nhưng hỏng sẵn theo cách chỉ người trong repo biết. Đoán sai thì agent chạy nhầm lệnh, thấy đỏ, rồi đi "sửa" thứ vốn đã hỏng từ trước — hoặc thấy xanh giả rồi báo xong.

Ví dụ từ repo backend của một app hoá đơn PDF (case thực tế, số đo tại một thời điểm):

- `npx jest` từ thư mục gốc **hỏng sẵn 34/39 suite** — lệnh trông đúng mà sai; phải chạy jest trong từng workspace.
- `yarn lint -- <file>` **nuốt tham số** nên luôn lint cả repo, vốn đã có **94 lỗi** sẵn — agent thấy 94 lỗi sẽ nghĩ mình làm hỏng.
- Mọi lệnh workspace cần chọn đúng phiên bản Node **trong cùng một lệnh shell** — tách ra hai lệnh thì lệnh sau chạy bằng Node mặc định.

Không ghi ba dòng này ra, agent nào cũng vấp lại từ đầu. Nơi đúng để ghi là **file hướng dẫn repo** ([[ag-04-context-va-file-huong-dan]]) hoặc đầu file brief của loop ([[ag-18-brief-la-shared-state]]), dưới dạng một khối gate cố định. Mẫu:

```markdown
## Gate (dán NGUYÊN VĂN khối này vào brief của mọi agent và mọi verifier)

Lệnh đúng (chạy theo thứ tự, dừng ở lệnh đỏ đầu tiên):
1. `./scripts/gate.sh`            # gồm: typecheck → build → test → lint file đã đổi

Lệnh trông đúng mà SAI:
- `npx jest` ở root          → hỏng sẵn, không phải lỗi của bạn. Dùng gate.sh.
- `yarn lint -- <file>`      → nuốt tham số, lint cả repo. Dùng gate.sh.

Baseline hiện tại (cập nhật sau mỗi lần merge; <N> là số bạn đo trên repo của mình):
- test: <N> suite, <N> fail khi chạy qua gate.sh
- lint toàn repo: <N> lỗi có sẵn — gate.sh chỉ fail khi số này TĂNG

FAIL sẵn không phải lỗi của bạn:
- (liệt kê, kèm lý do)

Không chạy được gate (thiếu dependency, timeout, thiếu credential) → báo UNVERIFIED, không báo xong.
```

Ba phần làm khối này có giá trị hơn một dòng "test pass": **lệnh trông đúng mà sai**, **baseline**, và **FAIL sẵn**. Cả ba là thứ agent không thể tự suy ra từ `package.json`. Nếu repo chưa có khối nào, brief phải ghi rõ "gate suy ra từ scripts, chưa được xác nhận" — để người đọc báo cáo biết mức tin.

Codex CLI đọc file `AGENTS.md` theo cùng tinh thần: docs chính thức mô tả Codex gom `AGENTS.md` từ thư mục home của Codex, rồi đi từ gốc project xuống thư mục hiện tại, mỗi thư mục tối đa một file, file gần hơn ghi đè hướng dẫn trước đó; các file mẫu trong docs có dòng kiểu "Run `npm run lint` before opening a pull request" ([AGENTS.md — Codex docs](https://developers.openai.com/codex/guides/agents-md)). Khối gate ở trên đặt vào `AGENTS.md` hay `CLAUDE.md` đều được — điều quan trọng là có **một** nguồn, và brief dán nguyên văn từ đó.

### 3.4 Boolean chịu được máy bận, thống kê thì không

Hai loại tiêu chí phản ứng với máy tải nặng theo hai cách khác hẳn nhau.

**Tiêu chí boolean** có đáp án có/không: file trả về có đúng magic bytes `%PDF` không, endpoint có trả 200 không, gate exit 0 hay khác 0. Máy bận làm nó **chậm** hơn, nhưng đáp án không đổi — một file PDF không biến thành file khác vì CPU đang 100%.

**Tiêu chí thống kê** là một con số đo trên nhiều lần chạy: tỉ lệ fail qua ≥ 30 lần, p99 latency, fps, thời gian build. Máy bận làm nó **sai** — và con số sai vẫn trông như một phép đo hợp lệ. Nó không báo lỗi, không đỏ gate. Nó được ghi vào tài liệu, và người/agent sau đọc nó như sự thật đã đo, rồi thiết kế theo. Đó là hỏng im lặng và lâu dài, nguy hiểm hơn hỏng ồn ào.

Nguyên nhân gốc: phép đo thống kê đo **hệ thống + máy**. Khi máy là biến số không kiểm soát, con số không phân biệt được "hệ thống chậm" với "máy chậm" — nó không kết luận được gì.

| | Boolean | Thống kê |
|---|---|---|
| Ví dụ | exit code, magic bytes, HTTP 200, có sinh bản ghi không | fail rate, p99, fps, thời gian build |
| Máy bận | chậm, kết quả không đổi | sai, trông vẫn hợp lệ |
| Điều kiện môi trường trong tiêu chí | không cần | bắt buộc |

Hệ quả thực hành (kinh nghiệm thực tế, từ một lần ba task backend cùng bị treo vì máy hết tài nguyên): **điều kiện dừng gắn vào từng task, không gắn vào cả hàng đợi.** Task boolean chạy tiếp được. Task thống kê kèm điều kiện tải máy và **phải tôn trọng điều kiện đó kể cả khi đang bị ép tiến độ** — bỏ qua nó không làm task fail, nó làm task *thành công với số sai*.

Cách viết điều kiện môi trường thành lệnh — script tự từ chối đo khi máy bận, trả mã riêng để người đọc phân biệt "đo ra đỏ" với "không đo được":

```bash
#!/usr/bin/env bash
# measure-p99.sh — minh hoạ cấu trúc; ngưỡng tải là ví dụ, tự chọn theo máy của bạn
set -euo pipefail
cores=$(getconf _NPROCESSORS_ONLN)
load1=$(uptime | awk -F'load averages?: ' '{print $2}' | awk -F'[ ,]+' '{print $1}')
if awk -v l="$load1" -v c="$cores" 'BEGIN{exit !(l > c*0.5)}'; then
  echo "UNVERIFIED: load1=$load1 > 50% của $cores core — không đo số thống kê lúc này" >&2
  exit 3
fi
# ... chạy benchmark ở đây, in p99, so ngưỡng, exit 0/1
```

Mã `3` là quy ước của riêng bạn; điều quan trọng là nó **khác** `1`. Verifier đọc `3` phải trả UNVERIFIED, không PASS, không FAIL.

### 3.5 Gate tĩnh không chứng minh được runtime

Một nhóm thứ khác cũng đi lọt mọi gate: thứ chỉ hỏng khi **chạy thật**.

Case thực tế (một lần, trong một monorepo backend chạy trên Firebase Functions): hai dòng import chéo package làm **toàn bộ backend không nạp được** lúc khởi động. Cùng thời điểm đó, lệnh check, jest (510 suite), và build đều **exit 0**. Lỗi chỉ lộ ra khi có người khởi động emulator.

Nguyên nhân gốc: mỗi gate dùng một cách phân giải module khác nhau. Jest chạy trên source với alias của chính nó; check là lint/rule; build dùng một bundler với cấu hình khác. **Không gate nào nạp thư mục build ra theo đúng cách runtime nạp nó**, nên một alias chỉ tồn tại ở package A, khi bị dùng ở package B, sống sót qua cả ba gate và còn nguyên chuỗi `@<package-a>/...` trong file build — rồi chết ở `require`.

Hệ quả cho done-criteria: task đụng code dùng chung phải có **một bước nạp runtime thật**, dù chỉ là khởi động rồi gọi một endpoint health:

```bash
# minh hoạ: bước runtime trong gate.sh cho một backend Node
npm run build
node -e "require('./lib/index.js'); console.log('LOAD OK')"   # nạp đúng file mà runtime nạp
```

Cùng họ với UI: ảnh chụp và `tsc` chỉ chứng minh trang **render được**; lỗi thường nằm ở nhánh chỉ chạy khi người dùng bấm (handler, payload, đóng modal sau khi lưu). Done-criteria cho UI có hành động ghi phải gồm một vòng bấm thật và kiểm dữ liệu — chi tiết ở [[ag-13-kiem-ui-bang-anh]].

### 3.6 Một gate hợp nhất, chạy trước merge

Khi nhiều agent chạy song song, mỗi agent một **worktree** (một thư mục làm việc riêng gắn với một nhánh git, dùng chung một repo — xem [[ag-15-worktree-va-xung-dot]]). Cách ly này làm cho chạy song song an toàn. Cái giá: mỗi agent, và mỗi verifier, nhìn **một nhánh của thực tại** chứ không nhìn thực tại.

Case thực tế (một lần): task F1 dựng hệ token thị giác và một trang `/design`; task F2 viết một gate mới cấm giá trị CSS tuỳ tiện. Chạy song song, mỗi cái một worktree. **Cả hai PASS verifier độc lập.** Merge cả hai về nhánh chính → gate đỏ ngay: 10 giá trị tuỳ tiện mới, 6 trong đó nằm trên chính trang `/design` của F1.

Không ai sai. Verifier của F1 chạy gate **cũ** (F2 chưa có trong worktree của nó). Verifier của F2 chạy gate **mới** trên code **cũ** (F1 chưa có). Lỗi chỉ tồn tại ở trạng thái hợp nhất — trạng thái mà không ai trong quy trình từng nhìn thấy.

Hai loại tương tác không lane nào tự bắt được:

| Loại | Ví dụ |
|---|---|
| Task A đổi **luật**, task B vi phạm luật mới | F2 thêm gate, F1 viết code gate mới cấm |
| Task A đổi **hàm/dữ liệu dùng chung**, task B gọi theo hợp đồng cũ | verifier của B báo "mất link tải" — thật ra A đã gỡ cả khối, nhánh của B không có A |

Loại thứ hai còn sinh **FAIL giả**: verifier tố cáo một hồi quy chỉ tồn tại vì nhánh nó đọc thiếu commit của lane khác.

Luật:

1. **Merge trước, chấm sau.** Gộp các nhánh vào một nhánh tích hợp và chạy gate ở đó — đây là "gate hợp nhất". Nó chạy trước khi nhánh chính nhận bất cứ thứ gì.
2. **Task đổi luật (gate, lint, type, schema) không chạy song song với task viết code chịu luật đó.** Xếp thứ tự.
3. **Trước khi tin một FAIL, kiểm nhánh của verifier có đủ commit không**: `git show <nhánh-kia>:<path> | grep <symbol>` — có ở nhánh kia mà không có ở nhánh đang chấm là dấu hiệu artefact chia nhánh.
4. **Siết baseline sau merge.** Gate đếm số (màu hardcode, lỗi lint, file dài) lấy số đo trên trạng thái hợp nhất.

```bash
# gate hợp nhất — minh hoạ, chạy trong một worktree tích hợp
git switch -c integrate/batch-01 main
for b in task/f1 task/f2; do git merge --no-ff --no-edit "$b" || exit 1; done
./scripts/gate.sh && echo "INTEGRATED GATE PASS"
```

### 3.7 Chạy gate một lần cho cả cụm bug

Gate có chi phí **cố định**: build + test full suite tốn như nhau dù bạn sửa 1 bug hay 5 bug. Nếu mỗi verifier của mỗi bug tự chạy lại nguyên gate, chi phí verify tăng tuyến tính theo số bug mà không thêm thông tin nào.

Case thực tế (một ngày, một repo, không phải benchmark): một lượt verifier mất **13–16 phút**, phần lớn là chờ máy (build hai lần + jest full suite), không phải chờ model. Hôm đó chạy **6 lượt** cho 3 bug:

```python
rounds = 6
lo, hi = 13, 16            # phút mỗi lượt verifier, số của case
print(rounds * lo, rounds * hi)   # 78 96  → 1h18 – 1h36 chỉ để verify 3 bug
```

Cách tách:

1. Chạy **gate một lần** cho cả cụm thay đổi, lưu output làm bằng chứng dùng chung.
2. Mỗi verifier nhận output đó + đúng phần bug của mình, và chỉ làm phần **chấm**: dựng lại lỗi, soi finding, đọc diff.
3. Verifier vẫn độc lập: context sạch, không sửa file, trả PASS/FAIL/UNVERIFIED.

Tiết kiệm được bao nhiêu thì **chưa đo** — phụ thuộc phần "chấm" tốn bao lâu khi không kèm gate. Cách đo: ghi thời điểm bắt đầu/kết thúc của từng lượt verifier trước và sau khi tách, trên cùng repo, so median.

Tradeoff phải nói thẳng:

- Verifier thứ hai trở đi **tin output gate do người khác chạy**. Nếu vòng sửa bug A làm hỏng bug B, gate chung phải được chạy **lại sau vòng sửa cuối cùng**. Bỏ bước đó là mở đúng lỗ mà verifier sinh ra để bịt.
- Bên chạy gate thường là bên điều phối — chính bên đã giao việc viết code. Verdict vẫn độc lập, nhưng tầng **bằng chứng** thì không. Chấp nhận được vì output gate là dữ liệu máy (exit code, log), không phải lời kể; nhưng nếu thấy bug lọt vì lý do này, quay lại cho mỗi verifier tự chạy gate với task đụng file dùng chung.

Không bỏ verifier vì đắt: cũng chính hôm đó, verifier bắt được 2 lỗi thật mà agent đã khai là xong (thiếu một key dịch, một khối gate ghi sai baseline).

### 3.8 Cưỡng chế bằng cấu hình: Stop hook chạy gate

Ghi "chạy gate trước khi báo xong" vào file hướng dẫn là lời dặn — agent có thể quên khi context dài. Claude Code có cơ chế cấu hình để ép việc này: **hook** (một lệnh shell Claude Code tự chạy tại một sự kiện của vòng đời) trên sự kiện `Stop`, tức lúc agent định kết thúc lượt trả lời. Chi tiết về hook nói chung ở [[ag-08-hook-va-chan-bang-cau-hinh]]; ở đây chỉ dùng đúng một chức năng.

Theo docs ([Hooks reference](https://code.claude.com/docs/en/hooks)):

- Hook `Stop` trả **exit code 2** thì Claude Code *ngăn agent dừng và tiếp tục hội thoại*; nội dung stderr của hook được đưa cho agent làm lý do.
- Input của hook có trường `stop_hook_active`, bằng `true` khi agent đang tiếp tục *do chính một stop hook* trước đó. Docs khuyên kiểm trường này để tránh chặn mãi một điều kiện không bao giờ được giải.
- Có thêm trần an toàn: sau **8 lần liên tiếp** stop hook ép tiếp tục, Claude Code bỏ qua lần chặn kế tiếp và kết thúc lượt.
- Timeout mặc định của hook kiểu `command` là **600 giây**; đặt `timeout` riêng nếu gate lâu hơn hoặc muốn ngắn hơn.
- `Stop` không hỗ trợ `matcher` — hook chạy ở mọi lần dừng.

Cấu hình `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-gate.sh",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

Script `.claude/hooks/stop-gate.sh`:

```bash
#!/usr/bin/env bash
# Stop hook: không cho agent kết thúc lượt khi gate còn đỏ.
input=$(cat)
active=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("stop_hook_active", False))')
if [ "$active" = "True" ]; then
  exit 0   # đã bị chặn một lần rồi: để người xem, không ép vòng nữa
fi
cd "${CLAUDE_PROJECT_DIR:-.}"
if out=$(./gate.sh 2>&1); then
  exit 0
fi
{
  echo "Gate đỏ — chưa được báo xong. 20 dòng cuối:"
  printf '%s\n' "$out" | tail -n 20
} >&2
exit 2
```

Lựa chọn trong script này: chỉ ép **một** vòng sửa rồi trả quyền cho người. Lý do: nếu tiêu chí bất khả thi (§3.2), ép thêm vòng chỉ dạy agent đi tìm cách làm cho xanh. Muốn agent tự sửa nhiều vòng hơn thì bỏ nhánh `stop_hook_active` và dựa vào trần 8 lần của Claude Code — đổi lại, agent có nhiều cơ hội hơn để fudge số. Hook này chạy gate ở **mọi** lần dừng, kể cả khi bạn chỉ hỏi một câu; với gate dài vài phút, chỉ bật nó trong phiên làm task, không bật mặc định.

---

## 4. Làm thử

Mục tiêu: dựng một repo nhỏ có một tiêu chí dạng lời khai, viết gate đo thật, thấy gate đỏ, rồi sửa đúng cách. Cần `python3` và `bash`. Không cần cài gì thêm.

**Bước 1 — dựng repo.**

```bash
mkdir gate-lab && cd gate-lab && git init -q

cat > pricing.py <<'EOF'
def bucket(price, lo, hi, n=5):
    """Trả bậc màu 0..n-1 cho một giá, chia đều khoảng [lo, hi]."""
    if hi <= lo:
        return 0
    ratio = (price - lo) / (hi - lo)
    return min(int(ratio * n), n - 1)
EOF

cat > test_pricing.py <<'EOF'
import unittest
from pricing import bucket

class TestBucket(unittest.TestCase):
    def test_min_is_bucket_0(self):
        self.assertEqual(bucket(100, 100, 600), 0)

    def test_max_is_last_bucket(self):
        self.assertEqual(bucket(600, 100, 600), 4)

    def test_middle(self):
        self.assertEqual(bucket(350, 100, 600), 2)

if __name__ == "__main__":
    unittest.main()
EOF

echo '[100, 200, 350, 700, 3000]' > seed.json
```

Unit test xanh. Code khai `n=5`. Theo kiểu lời khai, "heat-map có 5 bậc" đã đạt.

**Bước 2 — viết phép đo cho mệnh đề thật** ("dữ liệu seed dùng đủ 5 bậc màu"):

```bash
cat > measure.py <<'EOF'
import json, sys
from pricing import bucket

want = int(sys.argv[1]) if len(sys.argv) > 1 else 5
prices = json.load(open("seed.json"))
lo, hi = min(prices), max(prices)
got = sorted({bucket(p, lo, hi) for p in prices})
print(f"seed={prices} -> bậc dùng thật: {got} ({len(got)}/{want})")
sys.exit(0 if len(got) >= want else 1)
EOF
```

**Bước 3 — gate.**

```bash
cat > gate.sh <<'EOF'
#!/usr/bin/env bash
# Gate của gate-lab. Exit 0 = xong; khác 0 = chưa xong.
set -euo pipefail
cd "$(dirname "$0")"

echo "== 1/2 unit test"
python3 -m unittest -q 2>&1 | tail -n 3

echo "== 2/2 phép đo: số bậc màu thật trên seed"
python3 measure.py 5

echo "GATE PASS"
EOF
chmod +x gate.sh && ./gate.sh; echo "exit=$?"
```

Kết quả mong đợi (đã chạy thử):

```
== 1/2 unit test
Ran 3 tests in 0.000s

OK
== 2/2 phép đo: số bậc màu thật trên seed
seed=[100, 200, 350, 700, 3000] -> bậc dùng thật: [0, 1, 4] (3/5)
exit=1
```

Test xanh, gate đỏ: seed lệch nên chia đều khoảng giá chỉ dùng **3/5** bậc. Đây là đúng hình dạng của tình huống §2.

**Bước 4 — kiểm gate đỏ được ở phần test.** Sửa tạm kỳ vọng trong `test_middle` từ `2` thành `3`, chạy `./gate.sh`, phải thấy `FAILED (failures=1)` và `exit=1`. Trả lại như cũ. Bước này kiểm rằng `| tail` không nuốt exit code của unittest — `set -o pipefail` là thứ làm việc đó. (Vì sao kiểm "gate đỏ được" là bắt buộc: [[ag-11-gate-xanh-gia]].)

**Bước 5 — quyết định: sửa code hay sửa tiêu chí.** Không được sửa `measure.py` hay `seed.json` cho xanh — đó là fudge. Hai lối ra hợp lệ:

- **Sửa thiết kế:** chia bậc theo thứ hạng (quantile) thay vì chia đều khoảng giá. Ví dụ:

  ```python
  def bucket(price, lo, hi, n=5, prices=None):
      """Có `prices` thì chia theo thứ hạng (quantile), không thì chia đều [lo, hi]."""
      if prices:
          ranked = sorted(set(prices))
          return min(ranked.index(price) * n // len(ranked), n - 1)
      if hi <= lo:
          return 0
      ratio = (price - lo) / (hi - lo)
      return min(int(ratio * n), n - 1)
  ```

  và trong `measure.py` đổi lời gọi thành `bucket(p, lo, hi, prices=prices)`. Gate cho ra `[0, 1, 2, 3, 4] (5/5)` và `GATE PASS` (đã chạy thử).
- **Sửa tiêu chí:** nếu sản phẩm thật sự muốn chia đều theo giá, thì "5 bậc trên seed" là tiêu chí sai; viết lại thành mệnh đề đúng với ý đồ (ví dụ "hàm trả đủ 5 bậc khi giá trải đều khoảng") kèm phép đo mới.

Ghi lý do chọn lối nào vào commit message — đó là quyết định của người viết tiêu chí.

**Bước 6 (tuỳ chọn, cần Claude Code) — Stop hook.** Tạo `.claude/settings.json` và `.claude/hooks/stop-gate.sh` như §3.8 (`chmod +x`). Thử script độc lập trước:

```bash
echo '{"hook_event_name":"Stop","stop_hook_active":false}' | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/stop-gate.sh; echo "exit=$?"
echo '{"hook_event_name":"Stop","stop_hook_active":true}'  | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/stop-gate.sh; echo "exit=$?"
```

Với code bản chia đều: lệnh đầu in "Gate đỏ — chưa được báo xong…" và `exit=2`; lệnh sau `exit=0`. Sau đó mở Claude Code trong `gate-lab`, giao "thêm docstring cho `bucket`", và quan sát: khi agent định dừng, hook chặn và đưa output gate vào cho nó.

**Tiêu chí "xong" của bài thực hành** (tự kiểm bằng lệnh):

- `./gate.sh; echo $?` ra `0` sau Bước 5, và ra `1` khi bạn làm hỏng test ở Bước 4.
- `git diff -- measure.py seed.json` chỉ có thay đổi lời gọi `prices=prices` (nếu chọn lối sửa thiết kế) — không đổi ngưỡng `5`, không đổi seed.
- Commit message có một câu nói vì sao chọn sửa code hay sửa tiêu chí.

---

## 5. Bẫy thường gặp

🪤 **Tiêu chí viết bằng "đảm bảo".**
Triệu chứng: brief có "đảm bảo responsive", "đảm bảo 44px", "đảm bảo không hồi quy"; verifier trả PASS kèm bằng chứng đọc từ code.
Nguyên nhân gốc: dòng tiêu chí không có lệnh, verifier tự chọn phép kiểm rẻ nhất, thường là đọc lại lời khai.
Chặn bằng cơ chế: mẫu brief bắt buộc bảng bốn cột (mệnh đề / lệnh / pass / môi trường) như §3.1; dòng nào trống cột "lệnh" thì không được giao. Có thể thêm một bước kiểm trong skill giao việc: `grep -n "đảm bảo" BRIEF.md` khác rỗng thì dừng và hỏi.

🪤 **Agent bịa gate theo mặc định chung.**
Triệu chứng: agent chạy `tsc` trong repo không có TypeScript, hoặc `npx jest` ở root rồi đi "sửa" 34 suite vốn hỏng sẵn.
Nguyên nhân gốc: repo không có khối gate viết sẵn, agent điền chỗ trống bằng thói quen chung.
Chặn: khối gate trong `CLAUDE.md`/`AGENTS.md` hoặc đầu `BRIEF.md` (§3.3), và skill giao việc dán nguyên văn khối đó vào mọi brief — không để agent tự đọc rồi tóm tắt.

🪤 **Baseline đỏ sẵn bị coi là lỗi mới.**
Triệu chứng: lint báo 94 lỗi, agent sửa lan sang 30 file không liên quan; diff phình.
Nguyên nhân gốc: gate đo tuyệt đối ("0 lỗi") trên repo không ở trạng thái 0.
Chặn: gate so với baseline ghi trong file ("fail khi số lỗi TĂNG"), và cập nhật baseline sau mỗi lần merge trên trạng thái hợp nhất.

🪤 **Số thống kê đo lúc máy bận.**
Triệu chứng: p99 hay fail rate trong báo cáo khác hẳn lần đo trước, không ai giải thích được; hoặc tệ hơn, nó được ghi vào tài liệu.
Nguyên nhân gốc: phép đo không kiểm soát biến "tải máy".
Chặn: script đo tự kiểm tải trước và trả mã UNVERIFIED riêng (§3.4); điều kiện dừng gắn vào từng task thống kê, không vào cả hàng đợi.

🪤 **Hai task PASS riêng, đỏ khi gộp.**
Triệu chứng: nhánh chính đỏ ngay sau khi merge hai nhánh đều đã được verify.
Nguyên nhân gốc: mỗi verifier nhìn một worktree; trạng thái hợp nhất chưa ai chấm.
Chặn: gate hợp nhất trên nhánh tích hợp trước khi đưa vào nhánh chính (§3.6); task đổi luật xếp trước task chịu luật.

🪤 **Gate chung chạy trước vòng sửa cuối.**
Triệu chứng: các verifier đều PASS dựa trên một output gate, nhưng commit cuối đỏ.
Nguyên nhân gốc: vòng sửa bug A sau khi gate đã chạy làm hỏng bug B; không ai chạy lại.
Chặn: gate chung là bước cuối cùng của quy trình, sau mọi vòng sửa — đặt nó trong skill/loop như một bước bắt buộc trước commit, không phải trước verify.

🪤 **Worker làm cho xanh thay vì báo failed.**
Triệu chứng: diff có đổi ngưỡng, nới assertion, đổi seed, hoặc thêm `skip`.
Nguyên nhân gốc: tiêu chí bất khả thi hoặc khó, và brief không nói rõ báo `failed` là chấp nhận được.
Chặn: brief ghi "báo failed đúng theo tiêu chí là hành vi đúng; KHÔNG sửa file đo/ngưỡng/seed"; gate kiểm `git diff --name-only` không đụng file đo (như tiêu chí ở §4).

---

## 6. Chuyển giao

- Bài này cho bạn **tiêu chí** và **gate**. Bài kế tiếp [[ag-11-gate-xanh-gia]] lật ngược lại: gate đã có, đã xanh, mà vẫn không chứng minh gì — exit code bị nuốt, test thiếu hạ tầng tự SKIP, thước đo không đỏ được.
- [[ag-12-verifier-doc-lap]] dùng done-criteria của bài này làm đầu vào: verifier không có tiêu chí kiểm được thì chỉ còn đọc code.
- [[ag-13-kiem-ui-bang-anh]] là trường hợp riêng của §3.2 cho giao diện: phép đo phải ở tầng pixel/hành vi, không ở tầng chữ.
- Stop hook ở §3.8 là một ví dụ của nguyên tắc chung trong [[ag-08-hook-va-chan-bang-cau-hinh]].
- Ở Level 5–6, khối gate và bảng tiêu chí là thứ được dán vào brief của mọi worker ([[ag-14-subagent-va-brief]], [[ag-18-brief-la-shared-state]]), và gate hợp nhất trở thành một bước của vòng loop ([[ag-19-vong-lap-nhat-task]]). Không có done-criteria kiểm được, Level 6 không bỏ được checkpoint từng prompt — vì không có gì để loop tự kiểm.

Thứ bạn bỏ được nhờ bài này: đọc diff để quyết định "xong chưa". Thứ thay nó: một lệnh trả exit code, chạy trên trạng thái hợp nhất, với tiêu chí đo đúng mệnh đề.

---

## 7. Tóm tắt

- Done-criteria là mệnh đề + lệnh đo + điều kiện pass + điều kiện môi trường. Thiếu lệnh thì chỉ là mong muốn.
- Con số trong tiêu chí là lời khai cho tới khi có cách đo; phép kiểm đọc thuộc tính code trả lời một câu khác câu tiêu chí hỏi.
- Tự tính thử tiêu chí trên dữ liệu thật trước khi giao; tiêu chí bất khả thi sẽ bị worker báo failed hoặc bị fudge.
- Khối gate của repo ghi lệnh đúng, lệnh trông đúng mà sai, baseline, FAIL sẵn — dán nguyên văn vào mọi brief.
- Tiêu chí boolean chịu được máy bận; tiêu chí thống kê thì cho số sai trông hợp lệ, nên phải kèm điều kiện tải và mã UNVERIFIED riêng.
- Gate tĩnh không chứng minh runtime: task đụng code dùng chung cần một bước nạp thật.
- Gate hợp nhất chạy trên trạng thái đã merge, trước nhánh chính; gate chạy một lần cho cả cụm bug, và chạy lại sau vòng sửa cuối.
- Stop hook exit 2 biến "chạy gate trước khi báo xong" từ lời dặn thành cấu hình.
