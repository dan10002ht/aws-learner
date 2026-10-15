# Bài 24 — Harness tự cải tiến: retro bằng số, người duyệt bằng một cú click

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê năm thành phần của một **harness** (brain, hook, skill, verifier, file hướng dẫn) và chỉ ra vì sao mỗi thành phần đều *mục dần* nếu không ai đo lại.
- Viết một **hồ sơ retro** gồm `loi_lap`, `metric_cmd`, `json_path`, `baseline`, `success`, `min_sample`, trong đó `success` và `min_sample` là biểu thức mà code tính được, không cần ai phán.
- Chia một vòng retro thành các pha và gán đúng người làm cho từng pha: code đo, LLM đề xuất, người duyệt, LLM áp, code đo lại.
- Giải thích bằng phép đếm vì sao mỗi vòng chỉ được **một** patch, và áp luật "không đụng file của retro chưa đo lại".
- Dựng một sổ retro tối thiểu trên máy mình (script Python ~70 dòng) và kiểm nó **đỏ được, xanh được, và biết nói "chưa đủ mẫu"**.
- Đọc đúng một bảng A/B chạy ngay khi áp patch: nó trả lời được câu gì, và câu gì phải chờ phép đo lại sau 7 ngày.

---

## 2. Tình huống

Một dev có second brain (kho note markdown, xem [[ag-22-second-brain]]) và một hook `UserPromptSubmit`: mỗi lượt chat, hook khớp từ khoá trong prompt với note trong brain rồi chèn **danh sách đường dẫn** note liên quan vào context của agent. Ý tưởng: tri thức tự tới tận cửa, agent không cần nhớ mà tra.

Hook chạy được hai ngày. Dev thấy khối note hiện ra đều đặn và coi như việc đã xong.

Rồi một đợt audit nội bộ về mức dùng AI hỏi một câu: *"có bằng chứng agent dùng lại tri thức trước khi làm không?"*. Dev ngồi đọc lại transcript 4 ngày (case thực tế, một lần đo, không phải benchmark):

| Số đo | Giá trị |
|---|---|
| phiên làm app được hook chèn note | 7 |
| agent mở ít nhất một note sau đó | **2/7** |
| agent hỏi lại người dùng *trước khi* mở note nào | 1 |

Năm trên bảy phiên, tri thức đứng ngay trước mặt agent và không được đọc. Không có lỗi nào bắn ra, không test nào đỏ. Hook vẫn "chạy tốt" theo mọi nghĩa mà dev từng kiểm.

Dev viết một skill retro gõ tay: mỗi tuần mở ra, gom bằng chứng, chọn lỗi, sửa. Thử cho skill chạy headless (không người ngồi canh) một lần để xem nó tự làm được tới đâu. Lượt chạy thử lộ **6 lỗi**, trong đó ba lỗi đều nằm ở phần *đo* (kinh nghiệm thực tế):

- lệnh đo bị chặn quyền, agent tự đổi sang một cách đếm khác mà không báo;
- baseline lấy trên cửa sổ 4 ngày, phép đo lại đặt cửa sổ 7 ngày;
- `metric_cmd` là `grep` trên văn xuôi, đổi một chữ trong note là con số đổi.

Và trước khi có hook, cũng chính dev đó đã đếm: trong 2 tháng chỉ có 5 lượt tra brain bằng tay. Vòng "đo → vá → đo lại" dựa trên trí nhớ người thì đứt.

Ba vấn đề, một gốc: harness được *dựng* cẩn thận nhưng không được *đo lại*, và khi đo thì để chính LLM vừa vá vừa đo.

---

## ⏸ Dừng lại — đoán trước

Bản vá cho lỗi 2/7 có một luật: *"kết luận điều tra phải có một dòng `Brain:` nêu note đã áp dụng"*. Luật này được thử ở hai chỗ, cùng bộ ticket, cùng model:

```
(A) Ghi trong file hướng dẫn nạp mọi session (kiểu CLAUDE.md toàn cục)
(B) Ghi ngay trong khối text mà hook chèn cạnh prompt, sát danh sách note
```

Tỉ lệ kết luận có dòng `Brain:` ở (A) và (B) chênh nhau cỡ nào: gần bằng nhau, gấp đôi, hay gấp hơn 10 lần? Đáp án ở §3.7.

---

## 3. Cơ chế

### 3.1 Harness là gì, và vì sao nó mục

**Harness** là mọi thứ bao quanh model để nó làm việc đáng tin mà không cần người canh từng bước: file hướng dẫn ([[ag-04-context-va-file-huong-dan]]), memory ([[ag-06-memory-va-feedback]]), skill ([[ag-07-skill-va-slash-command]]), hook ([[ag-08-hook-va-chan-bang-cau-hinh]]), gate và verifier ([[ag-10-done-criteria-va-gate]], [[ag-12-verifier-doc-lap]]), và second brain ([[ag-22-second-brain]]).

Mỗi mảnh harness sinh ra từ **một sự cố cụ thể**, nên nó mang theo giả định của sự cố đó. Ba lực làm nó mục:

1. **Môi trường đổi, giả định không đổi.** Hook tra brain viết khi chỉ có prompt của người đi qua kênh đó. Sau này harness của công cụ cũng đẩy tin nhắn của chính nó qua cùng kênh (§3.4), và giả định "mọi thứ tới đây là câu hỏi của người" sai mà không ai biết.
2. **"Chạy" không có nghĩa là "có tác dụng".** Hook bắn đúng giờ, khối note hiện đều — nhưng thước đo đúng là *agent có đọc không*, và chưa ai đo nó. Đây là họ lỗi "ack không phải hiệu ứng" ở [[ag-11-gate-xanh-gia]].
3. **Patch chồng patch không ai gỡ.** Mỗi lần vá thêm một dòng vào file hướng dẫn. Không dòng nào bị gỡ vì không ai biết dòng nào còn có tác dụng.

**Retro** trong bài này nghĩa là: một vòng định kỳ đo lại các bản vá cũ, chọn một lỗi lặp có bằng chứng, vá nó, và hẹn ngày đo lại. Nó cùng tinh thần với action item của postmortem ([[sre-04-incident-postmortem]]) — khác ở chỗ action item ở đây có thước đo chạy được và có ngày đo lại do máy giữ.

### 3.2 Các pha của một vòng, và ai làm pha nào

Câu hỏi thiết kế không phải "có tự động không" mà là **pha nào giao cho ai**. Nguyên tắc chia (kinh nghiệm thực tế, rút từ lượt chạy thử 6 lỗi ở §2):

- Phần nào **cần phán đoán** (lỗi nào đáng vá, vá ở file nào) → LLM.
- Phần nào **là phép đo** (chạy lệnh, chép số, so ngưỡng) → code. LLM không được chấm bài của chính nó — cùng lý do verifier tách khỏi người viết ở [[ag-12-verifier-doc-lap]].
- Phần nào **là quyền** (cho phép sửa thứ ảnh hưởng mọi session) → người.

Ghép lại thành vòng:

```
  ┌──────────── mỗi tuần ─────────────────────────────────────────────┐
  │ 0. ĐO LẠI     code chạy lại đúng metric_cmd của retro tới hạn       │
  │               → dat / khong-dat / chua-du-mau (tự dời 7 ngày)       │
  │ 1. GOM        LLM đọc log, digest, verifier FAIL, feedback (chỉ đọc)│
  │ 2. CHỌN       LLM chọn ĐÚNG MỘT lỗi lặp (hoặc trả "không có")       │
  │ 3. ĐỀ XUẤT    LLM soạn diff + hồ sơ JSON; CODE chạy lại metric_cmd  │
  │               để chụp baseline thật, rồi gửi tóm tắt cho người      │
  │ 4. DUYỆT      người: ✓  áp / ✗  bỏ / im lặng N ngày = hết hạn       │
  │ 5. ÁP         LLM áp diff → gate (lint, payload giả) → ghi sổ       │
  │               remeasure_on = hôm nay + 7                            │
  └────────────────────────────────────────────────────────────────────┘
```

Trong case thật (kinh nghiệm thực tế, cấu hình của một người): một scheduler của hệ điều hành gọi script mỗi giờ trong giờ làm việc; script tự quyết pha nào tới lượt. Đề xuất chạy một lần mỗi tuần ở lượt đầu tiên từ thứ Hai; áp chạy trong vòng một giờ sau khi có ✓; đề xuất im lặng 5 ngày thì hết hạn.

Pha 1–3 và 5 là phiên agent không người ngồi canh. Với Claude Code đó là chế độ non-interactive: theo docs (`https://code.claude.com/docs/en/headless`), `claude -p "<prompt>"` chạy không tương tác, *"exits with code 0 on success and a non-zero code when the run fails"*; `--output-format json` trả JSON có trường `result`, `session_id` và `total_cost_usd` (docs ghi đó là ước tính phía client); skill gọi bằng `/skill-name` trong chuỗi prompt vẫn chạy ở chế độ `-p`; `--allowedTools` duyệt trước các tool theo cú pháp permission rule. Với Codex, docs (`https://learn.chatgpt.com/docs/non-interactive-mode`) mô tả `codex exec` chạy không tương tác và mặc định sandbox read-only — hợp với pha 1–3 vốn chỉ đọc.

Một kỷ luật đi kèm (kinh nghiệm thực tế): prompt của phiên headless ghi rõ *mọi lệnh chạy foreground*. Phiên kết thúc khi agent trả lời xong; việc gửi chạy nền rồi "lát nữa xem" là kiểu việc dễ mất kết quả ([[ag-20-viec-nen-va-ack]]).

### 3.3 Hồ sơ retro: một lỗi, một lệnh đo, một biểu thức

Tiêu chí để một lỗi được chọn (kinh nghiệm thực tế):

1. Xuất hiện **≥ 2 lần**, mỗi lần có nguồn trỏ được (đường dẫn log, transcript, note).
2. **Đếm được bằng một lệnh in ra một object JSON.**

Không lỗi nào đạt cả hai → retro tuần đó rỗng. Retro rỗng là kết quả hợp lệ; ép mỗi tuần phải có patch là cách đẻ ra patch vô ích.

Hồ sơ của lỗi 2/7 ở §2 (tên script đã đổi cho trung tính, số là số thật của case):

```json
{
  "loi_lap": "agent bỏ qua note brain do hook chèn vào context",
  "metric_cmd": "scripts/brain-stats --days 7 --json",
  "json_path": "follow",
  "baseline": {"hook_sessions": 7, "opened_after_hook": 2, "asked_user_before_opening": 1},
  "success": "opened_after_hook / hook_sessions >= 0.5 and asked_user_before_opening == 0",
  "min_sample": "hook_sessions >= 5",
  "patch_files": ["hooks/recall-render.py", "hooks/recall-prompt.py"]
}
```

Từng trường làm gì:

- **`metric_cmd`** được lưu *nguyên văn* và lần đo lại chạy *đúng chuỗi đó*. Không ai — người hay LLM — được "đo tay cho nhanh" hay đổi cửa sổ `--days`. Đổi thước giữa hai lần đo thì con số không so được.
- **`baseline`** do code chạy lệnh rồi chép object thật. Không ước lượng, không chép số LLM gõ trong đề xuất.
- **`success`** là biểu thức Python trên các khoá của JSON. Code `eval` nó với builtins rỗng — `eval(expr, {"__builtins__": {}}, dict(v))` — nên không ai phải phán "có vẻ tốt lên".
- **`min_sample`** chặn kết luận trên mẫu quá nhỏ. Nó cũng chặn một kiểu xanh giả nguy hiểm: ở một retro khác, thước là "số lượt nhiễu = 0"; nếu hook *chết* thì số lượt nhiễu cũng bằng 0. `min_sample: prompt_lookups >= 10` buộc hook phải còn bắn đủ lượt thật thì con số 0 mới có nghĩa. Dưới ngưỡng → `chua-du-mau`, tự dời 7 ngày.

Thước phải **tất định với cùng dữ liệu**: chạy hai lần trên cùng file log ra cùng số. Một mẹo cụ thể (kinh nghiệm thực tế): cửa sổ 7 ngày tính ngược từ *bản ghi mới nhất trong file*, không tính từ giờ chạy lệnh — chạy lệnh trễ một ngày không làm cửa sổ trượt mất dữ liệu.

### 3.4 Vì sao chỉ một patch mỗi lần

Lý do đầu tiên là **quy kết**. Giả sử tuần này bạn áp ba patch và tuần sau con số tốt lên. Patch nào có tác dụng? Muốn trả lời phải thử từng tổ hợp bật/tắt:

```python
>>> 2 ** 3   # số tổ hợp bật/tắt của 3 patch
8
```

Tám cấu hình, mỗi cấu hình cần đủ mẫu (ở §3.3 là ≥ 5 phiên) — trong thực tế không ai chạy. Tệ hơn: một patch giúp, một patch hại, tổng con số đi ngang, và bạn gỡ cả ba. Một patch mỗi vòng thì mỗi lần đo lại trả lời đúng một câu hỏi.

Lý do thứ hai là **nhiễm bẩn phép đo**, nên có thêm luật: *không đề xuất patch đụng file của một retro còn đang chờ duyệt hoặc đã áp mà chưa đo lại.*

Case cho thấy luật này có giá (kinh nghiệm thực tế). Tuần sau retro ở §2, vòng thứ hai tìm ra: hook `UserPromptSubmit` nhận cả tin nhắn do harness tự sinh khi một lệnh nền chạy xong. Docs của Claude Code xác nhận hành vi này — bảng sự kiện hook ghi `UserPromptSubmit` *"Also fires on turns Claude Code starts on its own"* (`https://code.claude.com/docs/en/hooks`). Tin đó chứa đường dẫn thư mục tạm có cụm `-501`, và regex "dấu hiệu lỗi" của hook có nhánh `5\d{2}` (mã HTTP 5xx) — khớp. Kết quả: 7/26 lượt tra trong một ngày là nhiễu toàn ID và hash, làm báo cáo độ phủ báo "thiếu note" ảo.

Chỗ sửa gốc là regex trong file hook — **đúng file mà retro đầu đang đo dở**. Theo luật, vòng hai không được đụng. Nó vá ở tầng dưới (engine tra cứu: chuỗi bắt đầu bằng thẻ tin harness thì không tra, không ghi log), ghi rõ trong decision note rằng *gốc chưa sửa*, và để vòng sau xử lý khi retro đầu đã đo xong.

Đó là cái giá: một lỗi biết rõ phải chờ thêm một tuần. Đổi lại, cả hai phép đo đều còn đọc được.

Lý do thứ ba là **chi phí duyệt**. Người duyệt đọc một tóm tắt ngắn trên điện thoại. Một patch, một file (hoặc một cặp file dính nhau) thì tóm tắt đọc được trong một phút; năm patch thì người duyệt bắt đầu bấm ✓ không đọc.

### 3.5 Patch được phép chạm vào đâu

Phiên đề xuất có một danh sách trắng file được vá: file skill, file hướng dẫn, prompt của các job, định nghĩa subagent, script tra cứu của brain. Danh sách đen: secret, quyền (permission), deploy, dữ liệu production, repo ứng dụng. Patch nhắm vào repo ứng dụng thì không áp — nó được ghi thành một task trong `BRIEF.md` của repo đó ([[ag-18-brief-la-shared-state]]) để loop bình thường nhặt.

Danh sách này là ranh giới thật của "tự cải tiến": harness được sửa *cách agent làm việc*, không được sửa *thứ agent làm ra* hay *quyền của chính nó*. Một job tự nới quyền của mình là kịch bản không ai muốn duyệt bằng một emoji.

### 3.6 Người duyệt bằng một cú click

Vì sao không tự áp luôn? Ba lý do (kinh nghiệm thực tế, ghi trong decision note của case):

- File hướng dẫn toàn cục nạp vào **mọi session ở mọi repo**. Một dòng sai ở đó lan ra mọi việc trong ngày.
- Audit đòi bản vá harness có người duyệt.
- LLM soạn patch cũng là LLM sẽ được đo bằng patch đó — cùng lý do người viết không tự chấm.

Vì sao không bắt người mở diff trong editor? Vì vòng sẽ đứt giống hệt skill gõ tay. Bước duyệt phải đặt ở **chỗ người đã có mặt cả ngày** — trong case là kênh chat của team, đề xuất gửi lên dưới dạng tin nhắn có tóm tắt + diff, người thả ✓ hoặc ✗. Emoji là bước duyệt rẻ nhất mà vẫn là duyệt. Chỗ đặt duyệt ở đâu trong một hệ tự động là chủ đề chính của [[ag-25-tu-dong-hoa-co-gioi-han]].

Nói thẳng điểm yếu: người duyệt trên điện thoại có thể bấm ✓ mà không đọc diff. Lưới an toàn vì vậy **không nằm ở cú click**, mà ở bốn thứ quanh nó:

| Lưới | Chặn cái gì |
|---|---|
| danh sách trắng file (§3.5) | patch đụng quyền, secret, production |
| gate sau khi áp: lint brain, chạy hook bằng payload giả | patch làm hỏng cú pháp hoặc làm hook im |
| A/B ngay khi áp nếu đụng phía đọc (§3.7) | patch làm agent tệ đi thấy rõ |
| lùi bằng `git checkout -- <file>` | mọi thứ còn lại |

Đây là lưới, không phải bảo đảm. Decision note của case ghi đúng như vậy.

Chi phí (kinh nghiệm thực tế, ước lượng của một người, không phải số đo hoá đơn): mỗi tuần một phiên đề xuất ~$0.3–1, cộng ~$3–4 cho A/B khi patch đụng phía đọc. Tính cả năm:

```python
>>> round(52 * 0.3, 1), 52 * 1.0      # đề xuất, USD/năm
(15.6, 52.0)
>>> 52 * 3, 52 * 4                     # trần nếu tuần nào cũng A/B
(156, 208)
```

Để biết vòng có đáng tiền không, so con số này với thời gian bạn từng mất cho đúng loại lỗi đã vá — cách đo ở [[ag-25-tu-dong-hoa-co-gioi-han]].

### 3.7 A/B ngay khi áp, và phép đo lại 7 ngày sau

Khi patch đụng **phía đọc** (hook tra brain, file hướng dẫn, skill tra cứu), chờ 7 ngày mới biết nó làm hỏng gì là quá lâu. Case dùng một phép A/B chạy ngay: cùng bộ ticket cũ, hai cấu hình — A = bản trước patch, B = bản sau — mỗi case chạy headless chỉ-đọc, một model nhỏ chấm root cause so với đáp án.

Kết quả A/B của retro đầu (kinh nghiệm thực tế, hai bộ ticket, mỗi case 2 lượt):

| | Bộ 1 (17 case), A | Bộ 1, B | Bộ 2 (14 case), A | Bộ 2, B |
|---|---|---|---|---|
| tìm ra note đáp án | 17/18 | 17/18 | 14/16 | 15/16 |
| có dòng `Brain:` | 0 | 1/34 | 0 | **27/28** |
| turns trung bình | 8.5 | 6.3 | 16.5 | 14.7 |
| cost trung bình | $0.135 | $0.094 | $0.361 | $0.326 |

Đáp án câu ⏸: ở bộ 1, luật `Brain:` lúc đó mới chỉ nằm trong file hướng dẫn toàn cục; ở bộ 2, định dạng dòng `Brain:` được đưa thẳng vào khối text hook chèn cạnh prompt.

```python
>>> round(1/34*100, 1), round(27/28*100, 1)
(2.9, 96.4)
```

Từ ~3% lên ~96% — gấp hơn 30 lần. Phép so này không sạch như thí nghiệm: hai bộ ticket khác nhau, và chỗ đặt luật đổi giữa hai lượt chạy. Nhưng chênh 30 lần thì khác biệt bộ ticket khó giải thích hết. Cách giải thích hợp lý nhất (suy luận, chưa đo riêng): file hướng dẫn nạp đầu session rồi bị đẩy xa dần khi context dài ra, còn khối hook nằm ngay cạnh câu hỏi agent đang trả lời. **Luật đặt ở chỗ agent đang đọc thì được theo; luật đặt ở file nạp đầu session thì bị lờ** (kinh nghiệm thực tế, một lần A/B). Trong retro, câu hỏi "vá ở file nào" quan trọng ngang câu "vá nội dung gì".

Cũng đọc phần chi phí: summary một câu cạnh mỗi note giúp agent *bỏ qua* note không dính thay vì mở ra đọc.

```python
>>> round((0.094-0.135)/0.135*100, 1), round((6.3-8.5)/8.5*100, 1)   # bộ 1: cost, turns
(-30.4, -25.9)
>>> round((0.326-0.361)/0.361*100, 1), round((14.7-16.5)/16.5*100, 1) # bộ 2
(-9.7, -10.9)
```

Giờ là phần A/B **không** trả lời được:

- **Không dựng lại được lỗi thật.** Prompt của bộ test có mã ticket và chữ "điều tra", nên cả cấu hình A cũng tra brain 100%. Lỗi 2/7 xảy ra với câu hỏi giữa phiên kiểu "file này bẩn tại sao". Câu "patch có sửa được lỗi 2/7 không" chỉ phép đo lại sau 7 ngày trên phiên thật trả lời được.
- **Mẫu nhỏ thì dao động lớn.** Ở một retro sau, A/B 6 case cho điểm trung bình 1.83 → 1.33 (thang 0–2). Nghe như tụt mạnh, nhưng với 6 case, một case lệch là:

```python
>>> round(1/6, 3), round((1.83-1.33)*6, 1)   # một case = 16.7 điểm %, tổng chênh = 3 điểm thô
(0.167, 3.0)
```

Ba điểm thô trên 6 case — có thể là một case từ 2 xuống 0 cộng một case từ 2 xuống 1. Đủ để *nhìn vào hai case đó*, chưa đủ để kết luận patch hỏng. Đọc A/B nhỏ như một **smoke test**: nó bắt được patch làm agent im hẳn hoặc tệ đi hàng loạt; nó không thay phép đo lại.

### 3.8 Thước và patch dùng chung một định nghĩa: "dạy cho thi"

Một retro khác (kinh nghiệm thực tế) phát hiện note sinh tự động từ thread hỗ trợ khách chỉ tóm *nguyên nhân*, không chứa *triệu chứng theo lời khách*, nên ca sau hỏi bằng lời khách không tìm ra. Thước đo độ phủ đếm số từ phân biệt chung giữa tiêu đề/summary của note và dòng mô tả vấn đề; patch thêm luật vào prompt sinh note: *summary phải chia sẻ ≥ 2 từ phân biệt với dòng mô tả vấn đề*.

Thước và luật dùng cùng một quy tắc. Con số chắc chắn lên — kể cả khi note không thật sự hữu ích hơn. Đây là luật Goodhart thu nhỏ: khi thước đo trở thành mục tiêu, nó thôi đo cái bạn quan tâm.

Cách chặn trong case: luật đòi *nguyên văn lời khách* chứ không đòi nhồi từ khoá, và giữ thêm một thước **độc lập** không bị patch chạm tới (số ticket trượt lặp lại). Quy tắc chung: khi patch và thước buộc phải dùng chung định nghĩa, ghi điều đó vào mục Tradeoff của decision note và chỉ định thước thứ hai sẽ nói thật.

### 3.9 Decision note: bản bền của baseline

Sổ retro (`retro.jsonl`) thường nằm trong thư mục state không được git track. Vì vậy mỗi patch đã áp có một decision note được commit, theo khuôn: bối cảnh, bằng chứng (kèm nguồn), patch, **Why**, **Tradeoff**, phương án đã loại và vì sao, baseline, output thật của gate, mục `## A/B` để code tự điền, và `review:` = ngày đo lại. Lần đo lại tuần sau đọc note này để biết thước nào, ngưỡng nào, và nghi phạm đầu tiên nếu số xấu đi.

---

## 4. Làm thử

Mục tiêu: một sổ retro tối thiểu cho một lỗi lặp dễ đếm — **agent viết commit message sai format** — và chứng minh sổ đó đỏ được, xanh được, nói được "chưa đủ mẫu", và từ chối patch đụng file đang đo.

Cần: Python 3.9+, git. Mọi lệnh dưới đây đã chạy thử trên một repo git rỗng.

**Bước 1 — thước đo.** Tạo `metric_commit.py` ở một thư mục làm việc (ví dụ `~/retro-lab/`):

```python
#!/usr/bin/env python3
"""In JSON: số commit trong 7 ngày (neo vào commit MỚI NHẤT, không vào giờ chạy) và số commit sai format."""
import json, re, subprocess
FMT = re.compile(r"^(feat|fix|docs|refactor|test|chore)(\(.+\))?: .+")
log = subprocess.run(["git", "log", "--format=%ct\t%s"], capture_output=True, text=True, check=True).stdout
rows = [(int(t), s) for t, s in (l.split("\t", 1) for l in log.splitlines() if l)]
moi_nhat = max(t for t, _ in rows) if rows else 0
cua_so = [s for t, s in rows if t > moi_nhat - 7 * 86400]
print(json.dumps({"tong": len(cua_so), "sai": sum(1 for s in cua_so if not FMT.match(s))}))
```

**Bước 2 — sổ retro.** Tạo `retro.py` cùng thư mục. Ba lệnh: `dang-ky` (code cấp id + chụp baseline + chặn trùng file), `duyet` (người gật), `do-lai` (code chấm).

```python
#!/usr/bin/env python3
"""retro.py — sổ retro tối thiểu: code chụp baseline, code đo lại, code chấm."""
import json, subprocess, sys, datetime as D
from pathlib import Path

SO = Path(".retro/retro.jsonl")

def doc():
    return [json.loads(l) for l in SO.read_text().splitlines() if l.strip()] if SO.exists() else []

def ghi(rs):
    SO.parent.mkdir(exist_ok=True)
    SO.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rs))

def do(r):
    out = subprocess.run(r["metric_cmd"], shell=True, capture_output=True, text=True, check=True).stdout
    v = json.loads(out)
    for k in filter(None, r.get("json_path", "").split(".")):
        v = v[k]
    return v

def cham(expr, v):
    return bool(eval(expr, {"__builtins__": {}}, dict(v)))

def dang_ky(path):
    r = json.loads(Path(path).read_text())
    rs = doc()
    dang_do = {f for x in rs if x["trang_thai"] in ("cho-duyet", "da-ap") for f in x["patch_files"]}
    trung = dang_do & set(r["patch_files"])
    if trung:
        sys.exit(f"TU CHOI: {sorted(trung)} thuoc retro chua do lai")
    r["id"] = f"retro-{len(rs) + 1}"          # chỉ code cấp id
    r["baseline"] = do(r)                      # chỉ code chụp baseline
    r["trang_thai"] = "cho-duyet"
    rs.append(r); ghi(rs)
    print(r["id"], json.dumps(r["baseline"]))

def duyet(rid, ngay_do_lai=7):
    rs = doc()
    for r in rs:
        if r["id"] == rid and r["trang_thai"] == "cho-duyet":
            r["trang_thai"] = "da-ap"
            r["remeasure_on"] = str(D.date.today() + D.timedelta(days=ngay_do_lai))
    ghi(rs)

def do_lai(hom_nay=None):
    hom_nay = hom_nay or str(D.date.today())
    rs = doc()
    for r in rs:
        if r["trang_thai"] != "da-ap" or r["remeasure_on"] > hom_nay:
            continue
        v = do(r)
        if not cham(r["min_sample"], v):
            r["remeasure_on"] = str(D.date.fromisoformat(hom_nay) + D.timedelta(days=7))
            print(r["id"], "chua-du-mau", json.dumps(v)); continue
        r["trang_thai"] = "dat" if cham(r["success"], v) else "khong-dat"
        r["sau"] = v
        print(r["id"], r["trang_thai"], json.dumps(r["baseline"]), "->", json.dumps(v))
    ghi(rs)

if __name__ == "__main__":
    lenh, *a = sys.argv[1:]
    {"dang-ky": dang_ky, "duyet": duyet, "do-lai": do_lai}[lenh](*a)
```

Lưu ý: `eval` với builtins rỗng chỉ đủ cho biểu thức bạn tự viết trong sổ của mình; đừng dùng nó cho chuỗi đến từ nguồn không tin được.

**Bước 3 — hồ sơ đề xuất.** Đây là thứ phiên LLM sẽ soạn; ở bài này bạn tự viết. `de-xuat.json`:

```json
{"loi_lap": "agent viet commit message sai format",
 "metric_cmd": "python3 ../metric_commit.py",
 "json_path": "",
 "success": "sai / tong <= 0.1",
 "min_sample": "tong >= 10",
 "patch_files": [".claude/skills/commit/SKILL.md"]}
```

**Bước 4 — chiều đỏ.** Repo giả có 12 commit, 5 commit sai format:

```bash
cd ~/retro-lab && rm -rf demo && mkdir demo && cd demo && git init -q
for i in $(seq 1 12); do
  if [ $i -le 5 ]; then m="update stuff $i"; else m="fix: sua loi $i"; fi
  git commit -q --allow-empty -m "$m"
done
python3 ../retro.py dang-ky ../de-xuat.json            # retro-1 {"tong": 12, "sai": 5}
python3 ../retro.py dang-ky ../de-xuat.json; echo $?   # TU CHOI ... ; 1
python3 ../retro.py duyet retro-1
python3 ../retro.py do-lai 2099-01-01                  # retro-1 khong-dat {"tong": 12, "sai": 5} -> {...}
```

Không có patch nào được áp thật, nên đo lại phải ra `khong-dat`. Nếu ra `dat` thì thước của bạn không đỏ được — sửa thước trước khi dùng.

**Bước 5 — chiều "chưa đủ mẫu" rồi xanh.** Repo mới, bắt đầu với 3 commit đúng:

```bash
cd ~/retro-lab && rm -rf d2 && mkdir d2 && cd d2 && git init -q
for i in 1 2 3; do git commit -q --allow-empty -m "fix: ok $i"; done
python3 ../retro.py dang-ky ../de-xuat.json && python3 ../retro.py duyet retro-1
python3 ../retro.py do-lai 2099-01-01     # retro-1 chua-du-mau {"tong": 3, "sai": 0}
for i in $(seq 4 12); do git commit -q --allow-empty -m "feat: ok $i"; done
python3 ../retro.py do-lai 2099-02-01     # retro-1 dat {"tong": 3, "sai": 0} -> {"tong": 12, "sai": 0}
```

`sai: 0` với 3 commit không được chấm `dat` — đó là việc của `min_sample`. Lần đo lại thứ hai dùng ngày xa hơn vì `chua-du-mau` đã tự dời hạn 7 ngày.

**Bước 6 — nối với agent (tuỳ chọn).** Viết một prompt đề xuất ngắn và chạy headless chỉ-đọc trong repo thật của bạn, ví dụ:

```bash
claude -p "Đọc 'git log -50 --format=%s'. Nếu có >= 2 commit sai format 'type: mô tả', \
viết ĐÚNG MỘT đề xuất vào de-xuat.json theo schema có sẵn trong file mẫu; \
không sửa file nào khác. Nếu không có lỗi lặp, ghi {\"verdict\": \"khong-co-loi-lap\"}." \
  --allowedTools "Read,Bash(git log *),Write" --output-format json
```

Rồi `python3 retro.py dang-ky de-xuat.json` — baseline do script chụp, không lấy số trong lời agent.

**Tiêu chí xong (kiểm được):**

- [ ] Bước 4 in `khong-dat`, lần `dang-ky` thứ hai thoát với exit code `1` và chữ `TU CHOI`.
- [ ] Bước 5 in `chua-du-mau` rồi `dat`.
- [ ] `.retro/retro.jsonl` có `baseline` và `sau` là object JSON thật, không phải chữ.
- [ ] Bạn chỉ ra được dòng nào trong `retro.py` ngăn LLM tự đặt id và tự chép baseline.

---

## 5. Bẫy thường gặp

**Bẫy 1 — Đổi thước giữa hai lần đo.**
Triệu chứng: baseline "7 lượt lỗi", đo lại "3 lượt lỗi", ai cũng vui — rồi phát hiện lần đầu đếm 4 ngày, lần sau 7 ngày, hoặc lần sau đếm bằng lệnh khác vì lệnh cũ bị chặn quyền.
Nguyên nhân gốc: phép đo do LLM chạy theo hướng dẫn văn xuôi; gặp trở ngại nó tự chọn đường vòng.
Chặn: `metric_cmd` lưu nguyên văn trong sổ, **code** chạy đúng chuỗi đó ở cả hai lần; lệnh đo được duyệt sẵn trong permission của phiên headless; danh sách lệnh đo được phép ghi cứng trong prompt đề xuất.

**Bẫy 2 — "Bằng 0" vì thứ được đo đã chết.**
Triệu chứng: retro "lượt nhiễu = 0" chấm `dat` trong tuần hook bị tắt.
Nguyên nhân gốc: thước chỉ đếm cái xấu, không đếm tổng.
Chặn: `min_sample` trên tổng (`prompt_lookups >= 10`); thiếu mẫu thì `chua-du-mau`, không bao giờ `dat`. Thước nào cũng phải kiểm được cả hai chiều ([[ag-11-gate-xanh-gia]]).

**Bẫy 3 — Hai patch chạm một file trong cùng cửa sổ đo.**
Triệu chứng: số đo lại không quy được cho patch nào.
Nguyên nhân gốc: mỗi vòng chọn lỗi độc lập, không biết vòng trước đang đo gì.
Chặn: `dang-ky` tự từ chối nếu `patch_files` giao với retro `cho-duyet`/`da-ap` (đã có trong `retro.py`). Chấp nhận cái giá: đôi khi phải vá tầng khác và để gốc chờ một tuần (§3.4).

**Bẫy 4 — Retro tay đè retro tự động.**
Triệu chứng: một đề xuất đang soạn biến mất; sổ có hai bản ghi cùng id. (Case thực tế: một retro làm tay tự lấy id kế tiếp và đè mất đề xuất tự động cùng id.)
Nguyên nhân gốc: người (hoặc agent) tự đặt id bằng cách nhìn số lớn nhất hiện có, trong khi job tự động cũng đang giữ số đó cho bản nháp.
Chặn: chỉ một đường cấp id — lệnh đăng ký của code, và nó tính cả đề xuất đang soạn dở. Retro làm tay chụp baseline *trước* khi sửa rồi đăng ký qua đúng lệnh đó.

**Bẫy 5 — Dạy cho thi.**
Triệu chứng: con số đạt, nhưng không ai thấy agent làm tốt hơn.
Nguyên nhân gốc: patch và thước dùng chung một định nghĩa (§3.8).
Chặn: ghi điều đó vào Tradeoff, và chỉ định một thước thứ hai patch không chạm tới (A/B chất lượng, số ca trượt lặp lại).

**Bẫy 6 — Ép mỗi tuần phải có patch.**
Triệu chứng: patch nhỏ dần, bằng chứng mỏng dần, file hướng dẫn dài dần.
Nguyên nhân gốc: coi retro là sản lượng.
Chặn: tiêu chí ≥ 2 lần có nguồn + đếm được bằng JSON là cứng; prompt cho phép trả `{"verdict": "khong-co-loi-lap"}`, và đó là một lượt thành công.

**Bẫy 7 — Vá đúng nội dung, sai chỗ.**
Triệu chứng: luật mới có trong file hướng dẫn mà agent vẫn không theo (1/34 ở §3.7).
Nguyên nhân gốc: file nạp đầu session ở xa chỗ agent ra quyết định.
Chặn: khi đề xuất, hỏi thêm "agent đọc cái gì *ngay lúc* nó mắc lỗi này?" — khối hook, output của tool, mô tả skill — và đặt luật ở đó. Không được thì dùng cấu hình chặn hẳn ([[ag-08-hook-va-chan-bang-cau-hinh]]).

**Bẫy 8 — Tin số trong đề xuất của LLM.**
Triệu chứng: baseline trong decision note khác với output thật của lệnh đo.
Nguyên nhân gốc: LLM chép số từ trí nhớ hoặc làm tròn.
Chặn: code chạy lại `metric_cmd` ngay sau khi đề xuất được ghi và lưu object đó làm baseline; số trong văn bản đề xuất chỉ để người đọc.

---

## 6. Chuyển giao

Bài này khép Level 7 lại thành một vòng. [[ag-22-second-brain]] cho hệ thống một bộ nhớ dài hạn; [[ag-23-job-dinh-ky-va-bot]] cho nó chạy khi bạn ngủ. Bài này cho nó **sửa chính cách nó làm việc**, với hai ràng buộc: mọi patch có số trước/sau do code đo, và mọi patch đi qua một người.

Những gì bài dùng lại từ các level dưới:

- Từ Level 3: hook, skill, file hướng dẫn chính là thứ được vá — [[ag-07-skill-va-slash-command]], [[ag-08-hook-va-chan-bang-cau-hinh]].
- Từ Level 4: thước đo phải đỏ được và verifier không được là người viết — [[ag-10-done-criteria-va-gate]], [[ag-11-gate-xanh-gia]], [[ag-12-verifier-doc-lap]]. Retro là verifier cho chính harness.
- Từ Level 6: phiên đề xuất/áp là một loop không người canh, với state bền trên đĩa — [[ag-18-brief-la-shared-state]], [[ag-19-vong-lap-nhat-task]].

Ở level này bạn bỏ được việc **tự nhớ mà đi soát lại harness**, và thay nó bằng một sổ retro có ngày đo lại do máy giữ. Thứ còn lại cho người là một quyết định nhỏ mỗi tuần: ✓ hay ✗.

Bài cuối, [[ag-25-tu-dong-hoa-co-gioi-han]], hỏi câu ngược lại: trong tất cả những gì đã tự động hoá ở 24 bài, chỗ nào **phải** giữ người, và làm sao tính chi phí để biết một vòng tự động như retro có đáng chạy.

---

## 7. Tóm tắt

- Harness (brain, hook, skill, verifier, file hướng dẫn) mục vì môi trường đổi, vì "chạy" khác "có tác dụng", và vì patch chồng patch không ai gỡ. Retro là vòng đo → vá → đo lại định kỳ.
- Chia pha theo bản chất: phán đoán cho LLM, đo cho code, quyền cho người. LLM không đo bài của chính nó.
- Một lỗi được chọn khi lặp ≥ 2 lần có nguồn và đếm được bằng một lệnh in JSON. Không lỗi nào đạt thì retro rỗng — hợp lệ.
- Hồ sơ retro: `metric_cmd` nguyên văn, `baseline` do code chụp, `success` và `min_sample` là biểu thức code tính; thiếu mẫu là `chua-du-mau`, không phải `dat`.
- Một patch mỗi vòng để quy kết được; không đụng file của retro chưa đo lại, kể cả khi phải để gốc chờ thêm một tuần.
- Duyệt bằng một cú click ở chỗ người đã có mặt; lưới an toàn thật là danh sách trắng file, gate sau khi áp, A/B cho phía đọc, và lùi bằng git.
- A/B ngay khi áp là smoke test: bắt patch hỏng hàng loạt, không chứng minh patch sửa được lỗi thật. Luật đặt cạnh chỗ agent đang đọc được theo ~96%, đặt ở file nạp đầu session được theo ~3% (một lần A/B).
- Khi patch và thước dùng chung định nghĩa, ghi vào Tradeoff và giữ một thước độc lập.
