# Bài 2 — Chat giỏi tới đâu, và vì sao copy-paste là trần

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích bằng một câu vì sao model trong khung chat **không thể** biết repo của bạn có gì, và chỉ ra ba loại lỗi sinh ra trực tiếp từ giới hạn đó.
- Định nghĩa **context window**, nêu kích thước của nó theo tài liệu chính thức, và **tự đo** một file code của bạn tốn bao nhiêu token thay vì nhân một hệ số nhớ mang máng.
- Tính được repo của bạn có vừa context window hay không, và giải thích vì sao "vừa" vẫn chưa có nghĩa là "model đọc tốt".
- Viết một prompt chat có đủ năm khối: bối cảnh, việc cần, ràng buộc, ví dụ, tiêu chí xong — và yêu cầu model liệt kê thứ nó **không thấy**.
- Phân loại một việc vào "chat là công cụ đúng" hay "cần agent trong repo" bằng ba câu hỏi kiểm được.

---

## 2. Tình huống

> **Kinh nghiệm thực tế, đã ẩn danh.** Tình huống ghép từ các mẫu lỗi đã được ghi lại trong ghi chú làm việc của tác giả khi dùng AI ở một team làm app SaaS thương mại điện tử. Diễn biến là thật theo kiểu lỗi; tên hàm và số lượt chat là minh hoạ.

Một dev backend nhận ticket: khách nhận **hai email xác nhận** cho cùng một đơn hàng. Platform bán hàng gửi webhook `orders/create` về app; handler của app tạo bản ghi đơn và gửi email.

Dev mở khung chat, dán file `orderWebhook.js` (khoảng 200 dòng) và viết:

```
Webhook orders/create bị xử lý 2 lần, khách nhận 2 email. Fix giúp.
```

Model trả lời rất tốt: giải thích platform có thể gửi lại webhook khi không nhận được phản hồi 2xx kịp, đề xuất kiểm tra `orderId` đã xử lý chưa trước khi gửi email, kèm đoạn code hoàn chỉnh. Dev dán đoạn code vào file, deploy.

Hai ngày sau, ticket mở lại. Vẫn hai email — ít hơn, nhưng vẫn có.

Lý do: trong repo có **ba** đường đi tới hàm gửi email cho đơn mới: handler webhook, một job retry chạy lại các webhook lỗi, và một script đồng bộ đơn bị sót. Bản fix chỉ chặn đường thứ nhất. Model không hề thấy hai đường còn lại — với nó, chúng không tồn tại.

Dev quay lại cuộc chat cũ, lúc này đã dài vài chục lượt, gõ:

```
Vẫn bị. Fix lại cái bug tôi nói ban nãy.
```

Model đề xuất thêm một trường `emailSentAt` vào collection đơn hàng. Ở lượt đầu tiên dev đã dặn "không đổi schema". Ràng buộc đó vẫn nằm trong lịch sử chat, nhưng đã bị đẩy xa về phía đầu và không còn kéo được câu trả lời.

Cuối cùng dev hỏi: "Docs của platform nói gì về số lần retry webhook?" Model trả lời tự tin một con số. Dev không kiểm. Con số đó không có trong cuộc chat nào — model trả lời từ trí nhớ huấn luyện, không phải từ tài liệu hiện hành.

Ba lỗi, không lỗi nào do model "kém". Tất cả đều cùng một gốc.

---

## ⏸ Dừng lại — đoán trước

Chọn một đáp án trước khi đọc tiếp.

**Bản fix đầu tiên chỉ chặn được một trong ba đường gửi email. Nguyên nhân gốc là gì?**

```
(a) Model chưa đủ giỏi để nghĩ tới job retry và script đồng bộ
(b) Prompt quá ngắn, thiếu chi tiết về bug
(c) Model chỉ thấy đúng những gì được dán vào; hai file kia nằm ngoài thế giới của nó
(d) File 200 dòng làm đầy context window nên model bỏ sót
```

Đáp án nằm ở §3.1 và §3.2. Một gợi ý: (d) có thể loại bằng một phép tính.

---

## 3. Cơ chế

### 3.1 Chat là một hàm: text vào, text ra

Model trong khung chat làm đúng một việc: nhận một khối text, sinh ra khối text tiếp theo. Nó **không** mở được file trong máy bạn, **không** chạy được `grep`, **không** chạy được test. Mọi thứ nó "biết" về code của bạn ở lượt này là mọi thứ đang nằm trong khối text đầu vào.

Khối text đó có tên: **context window** — toàn bộ text model có thể tham chiếu khi sinh câu trả lời, kể cả chính câu trả lời. Định nghĩa của Anthropic:

> *"The "context window" refers to all the text a language model can reference when generating a response, including the response itself. [...] represents a "working memory" for the model."*
> — [Context windows, Claude Docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)

Hệ quả trực tiếp: **thứ không có trong context thì không tồn tại với model.** Không phải "model quên", không phải "model lười" — nó chưa bao giờ thấy. Đó là đáp án (c) của câu đoán trước. (b) đúng một phần: prompt tốt hơn giúp, nhưng dù prompt dài mười trang, nếu không chứa hai file kia thì model vẫn không thể biết chúng tồn tại, trừ khi bạn nói.

Nhìn theo cách khác: trong vòng chat + copy-paste, **bạn chính là tầng tool của model.**

```
Model cần biết file X có gì   → bạn mở X, copy, dán
Model cần biết test có pass   → bạn chạy test, copy output, dán
Model cần biết còn chỗ nào    → bạn grep, chọn kết quả, dán
Model đề xuất sửa             → bạn copy code, mở file, dán, lưu
```

Mỗi mũi tên là một lần bạn làm thay phần "đọc / chạy / quan sát" của một agent. Coding agent ở Level 2 chính là tự động hoá đúng các mũi tên này — model gọi tool đọc file, chạy lệnh, rồi nhìn kết quả. Cơ chế vòng lặp tool ở mức API đã có ở [[aiml-05-agents-tools]]; bài kế tiếp [[ag-03-coding-agent-hoat-dong]] xem nó trong Claude Code và Codex CLI.

Điểm mấu chốt của vai "tầng tool bằng tay": **bạn chọn** cái gì vào context. Bạn chỉ dán `orderWebhook.js` vì bạn nghĩ bug nằm ở đó. Giả thuyết sai của bạn trở thành giới hạn cứng của model.

### 3.2 Context window bằng con số

**Kích thước** (dữ kiện có nguồn, [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows), tra ngày viết bài):

- Các model Claude đời hiện hành có context window **1M token** — danh sách trong docs gồm Opus từ 4.6, Sonnet từ 4.6, Haiku 5.5 và vài model khác; một request sinh tối đa 128k token đầu ra.
- Các model khác, ví dụ Sonnet 4.5, có **200k token**.
- **Mọi thứ** trong request đều tính: system prompt, mọi message (kể cả kết quả tool, ảnh, tài liệu), định nghĩa tool, và cả output.

Con số đổi theo đời model — đừng chép vào đầu, tra lại trang trên khi cần.

**Token** là đơn vị model đọc và ghi; một token không phải một từ, cũng không phải một ký tự. Số token của cùng một đoạn text còn **phụ thuộc tokenizer của model**: docs ghi rõ từ Claude Opus 4.7 dùng tokenizer mới, cùng một input ra khoảng 30% token nhiều hơn so với model trước đó, và khuyên đếm lại thay vì dùng lại số cũ ([Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)).

Vì vậy câu hỏi "một trang code bao nhiêu token" **không có hằng số đáng tin** — phải đo. Dưới đây là một lần đo:

> **Case thực tế, một lần đo, không phải benchmark.** Đo bằng Claude Code headless (`claude -p --output-format json --tools "" --setting-sources ""`): chạy một prompt ngắn làm mốc, rồi chạy lại prompt đó kèm nội dung file; hiệu số tổng token đầu vào (`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`) là chi phí của file. Model `claude-opus-5-5`. File lấy từ chính repo course này.

| File | Loại | Dòng | Byte | Token đo được | Token/dòng | Byte/token |
|---|---|---:|---:|---:|---:|---:|
| `Runner.tsx` | React component | 538 | 20 758 | 8 195 | 15.2 | 2.53 |
| `MobileLessonNav.tsx` | React component | 357 | 12 362 | 8 892 | 24.9 | 1.39 |
| `aiml-03-prompt-engineering.md` | Markdown tiếng Việt | 362 | 23 478 | 10 558 | 29.2 | 2.22 |

Hai file TSX **cùng repo, cùng framework, cùng người viết** mà token/dòng chênh nhau 1.6 lần. Đây là lý do bài này không đưa ra "quy tắc ngón tay cái" nào: hệ số phụ thuộc nội dung (độ dài dòng, mật độ ký hiệu, tiếng Việt có dấu, chuỗi class CSS dài) và phụ thuộc tokenizer.

Giờ tính thử, dùng hai hệ số vừa đo làm khoảng:

```python
# Tính lại bằng python. Hai hệ số token/dòng lấy từ bảng đo ở trên.
lo, hi = 8195/538, 8892/357          # 15.2 và 24.9 token/dòng

# File 200 dòng trong tình huống §2:
print(200*lo, 200*hi)                 # ~3 000 đến ~5 000 token
print(200*hi / 1_000_000)             # < 0.5% của context 1M  → loại đáp án (d)

# Phần web/ của repo course này: 99 351 dòng .ts/.tsx (wc -l trên git ls-files)
L = 99_351
print(L*lo/1e6, L*hi/1e6)             # ~1.51M đến ~2.47M token → KHÔNG vừa 1M

# Một context 1M chứa được khoảng bao nhiêu dòng code loại này:
print(1_000_000/hi, 1_000_000/lo)     # ~40 000 đến ~66 000 dòng
print(200_000/hi, 200_000/lo)         # ~8 000 đến ~13 000 dòng với model 200k
```

Hai kết luận:

1. **Một file 200 dòng không làm đầy gì cả.** Bỏ sót trong tình huống §2 không phải do tràn context — đáp án (d) sai.
2. **Repo thật thường không vừa.** Ngay phần frontend của một repo học tập đã vượt 1M token. Repo backend production của bạn — đo lại bằng §4, đừng đoán.

Và nhớ: trong khung chat, trước khi bạn dán gì, context đã có sẵn system prompt của sản phẩm chat. Bạn không thấy nó, nhưng nó chiếm chỗ.

### 3.3 Vừa context chưa có nghĩa là đọc tốt

Giả sử bạn chọn model 1M và dán được 500k token. Model có "đọc" đều cả 500k không? Docs trả lời thẳng:

> *"A larger context window allows the model to handle more complex and lengthy prompts, but more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as context rot."*
> — [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)

**Context rot**: độ chính xác và khả năng nhớ lại giảm khi số token trong context tăng. Docs không cho một ngưỡng cụ thể — và bài này cũng không bịa một ngưỡng. Hệ quả vận hành: **chọn cái gì vào context quan trọng ngang với còn bao nhiêu chỗ.**

Thêm một cơ chế riêng của khung chat. Docs ghi chú rằng giao diện chat như claude.ai *"can also manage the context window on a rolling 'first in, first out' basis"* — tức là khi hội thoại dài, phần đầu có thể bị đẩy ra. Docs dùng chữ "can", không mô tả chi tiết khi nào; bạn không kiểm soát được và thường không được báo.

Gộp hai cơ chế lại là ra lỗi thứ hai của tình huống §2: ràng buộc "không đổi schema" đặt ở lượt đầu, sau vài chục lượt (a) nằm xa giữa một context dài và bị kéo yếu đi, hoặc (b) có thể đã không còn trong context. Từ bên ngoài, hai trường hợp trông giống hệt nhau: model "quên".

> **Kinh nghiệm thực tế:** câu "fix cái bug tôi vừa nói" sau một cuộc chat dài là nguồn sai lặp đi lặp lại. Thay bằng nhắc lại một dòng triệu chứng + ràng buộc ngay trong tin nhắn đó, hoặc mở chat mới với khối ngữ cảnh ở §3.5.

### 3.4 Ba lỗi cùng một gốc

Từ §3.1–3.3, ba lỗi trong tình huống được giải thích bằng cùng một quy luật: **model chỉ làm việc trên những gì đang nằm trong context, và nó không có cách nào tự lấy thêm.**

**Lỗi 1 — Thiếu chỗ tương tự.** Model sửa đúng logic ở đúng file được đưa, nhưng repo có thêm hai đường đi tới cùng hiệu ứng. Gốc: người chọn context dựa trên giả thuyết của mình. Ở Level 2, agent tự `grep` được toàn repo; ở chat, bạn phải tự grep và dán.

**Lỗi 2 — Không kiểm được.** Model nói "đoạn này sẽ chặn email trùng". Câu đó là **dự đoán**, không phải kết quả chạy. Model không chạy được test, không gọi được webhook thử. Mọi "đã fix" trong chat là lời khẳng định chưa ai kiểm cho tới khi bạn chạy.

**Lỗi 3 — Nguồn thay bằng trí nhớ hoặc bản tóm tắt.** Model trả lời "docs nói retry N lần" mà docs không có trong context. Câu trả lời đến từ dữ liệu huấn luyện — có thể cũ, có thể nhầm sang platform khác.

Một biến thể của lỗi 3 xảy ra cả khi model **có** đọc tài liệu:

> **Kinh nghiệm thực tế, ẩn danh.** Một dev gửi cho agent đường dẫn tới tài liệu của một skill và hỏi skill đó có tự lặp không. Agent fetch tài liệu, công cụ fetch trả về **bản tóm tắt**, và agent trả lời "không, phải bọc thêm lệnh lặp". Dev trích lại một câu trong tài liệu; agent vẫn cãi; dev trích lần hai. Lấy nguyên văn ra thì câu đó có thật — bản tóm tắt đã lược mất đúng câu quyết định. Bài học được ghi lại: khi tranh luận "tài liệu nói gì", **đọc nguyên văn phần liên quan trước khi khẳng định**; người dùng trích một câu mình không nhớ đã đọc → mặc định là mình thiếu.

Bản tóm tắt tối ưu cho độ ngắn, không cho việc câu nào là ràng buộc. Với model, bản tóm tắt nằm trong context **thay cho** tài liệu gốc — câu bị lược cũng "không tồn tại" như hai file trong lỗi 1.

### 3.5 Prompt có ngữ cảnh: năm khối

Phần kỹ thuật prompt chung (role, format, constraint, few-shot, chain-of-thought) đã ở [[aiml-03-prompt-engineering]] — không nhắc lại. Ở đây chỉ một câu hỏi: **khi model không thấy repo, prompt phải bù cho nó cái gì?**

Cách nghĩ hữu ích (kinh nghiệm thực tế từ hướng dẫn nội bộ của tác giả): prompt là **bản giao việc cho một dev mới vào team hôm nay** — giỏi, đọc code nhanh, nhưng không biết gì về app, không biết convention, và không dám hỏi lại.

Năm khối:

| Khối | Trả lời câu hỏi | Bù cho giới hạn nào |
|---|---|---|
| **Bối cảnh** | App gì, stack gì, đang sai ở đâu, những file/đường đi liên quan **mà bạn biết** | Model không thấy repo |
| **Việc cần** | Kết quả mong muốn, không phải cách làm | Model đoán ý định |
| **Ràng buộc** | Cái **không** được làm/đụng | Model tự chọn giải pháp rộng nhất |
| **Ví dụ** | Một input/output cụ thể, một đoạn log thật | Mô tả bằng lời mơ hồ |
| **Tiêu chí xong** | Lệnh nào, kết quả nào thì coi là xong | Model không chạy được gì — bạn chạy |

Và một dòng thứ sáu đáng giá nhất trong chat: **bắt model nói ra cái nó không thấy.**

Prompt của tình huống §2, viết lại:

```text
Bối cảnh:
- Backend Node.js, nhận webhook orders/create từ platform bán hàng, lưu đơn vào Firestore, gửi email xác nhận.
- Triệu chứng: một số khách nhận 2 email cho cùng một đơn. Không phải mọi đơn.
- Tôi dán bên dưới: orderWebhook.js (handler). Tôi CHƯA kiểm tra còn chỗ nào khác gọi sendOrderEmail().

Việc cần:
- Mỗi đơn chỉ gửi email xác nhận đúng 1 lần, kể cả khi webhook bị gửi lại.

Ràng buộc:
- KHÔNG đổi schema collection orders (không thêm field).
- KHÔNG thêm dependency.
- Nghi do platform retry webhook nhưng CHƯA xác minh — đừng coi đó là sự thật.

Ví dụ (log minh hoạ):
- Log: 2 dòng "email sent orderId=1042" cách nhau 7 giây.

Xong khi:
- Có đề xuất fix + cách tôi tự kiểm: lệnh/test nào chạy, output nào chứng minh hết trùng.

Trước khi đề xuất fix:
1. Liệt kê những gì bạn KHÔNG thấy được mà có thể làm fix sai
   (file khác, cấu hình, hành vi platform).
2. Liệt kê lệnh grep tôi nên chạy để bạn thấy đủ, rồi dừng chờ tôi dán kết quả.

--- orderWebhook.js ---
<dán file>
```

Với prompt này, câu trả lời đầu tiên của model sẽ là một danh sách câu hỏi kiểu "còn chỗ nào khác gọi `sendOrderEmail`? có job retry không?" và một lệnh như `grep -rn "sendOrderEmail" src/`. Bạn chạy, dán kết quả, và hai đường còn lại hiện ra **trước** khi có fix. Prompt không làm model thấy repo — nó biến điểm mù thành câu hỏi có thể trả lời.

Để ý: `grep` bạn chạy, output bạn dán, test bạn chạy. Khối "Xong khi" trong chat là việc **của bạn**. Đây là đúng thứ Level 4 sẽ chuyển sang cho máy ([[ag-10-done-criteria-va-gate]]).

### 3.6 Vì sao copy-paste là trần, không phải chỉ là chậm

Ở §3.1, mỗi mũi tên là một lần bạn làm tầng tool. Một bug đi qua bao nhiêu mũi tên? Đếm cho tình huống §2 sau khi đã dùng prompt tốt:

```
1. dán handler                       → model hỏi chỗ gọi khác
2. chạy grep, dán kết quả            → model xin xem job retry + script đồng bộ
3. mở 2 file, dán                    → model đề xuất fix ở helper dùng chung
4. copy fix vào file, lưu            
5. chạy test, dán output lỗi         → model sửa lỗi kiểu
6. copy lại, lưu, chạy test, dán     → pass
7. diff lại bằng mắt xem có dán nhầm chỗ không
```

Bảy lượt bạn là tay chân. Chi phí thời gian của mỗi lượt **phụ thuộc bạn và repo** — bài này không điền số. Cách đo:

```text
Thời gian của bạn cho một việc ≈ Σ (t_tìm_và_copy + t_chạy_lệnh + t_đọc_và_dán) qua mọi lượt
Đo: với 3 việc tiếp theo bạn làm bằng chat, ghi giờ:phút mỗi lần bạn rời khung chat để
mở file / chạy lệnh / dán kết quả. Cộng lại, chia cho tổng thời gian việc đó.
```

Ba lý do đây là **trần** chứ không chỉ là chậm:

1. **Băng thông là bạn.** Tổng số file model thấy được bị giới hạn bởi số file bạn chịu mở và dán. Việc đòi đọc 40 file (refactor, đổi giao diện cả app) không làm được bằng tay một cách hợp lý.
2. **Lỗi của bạn đi vào context.** Dán nhầm phiên bản file, dán thiếu đoạn cuối, chạy test ở nhánh khác — model không có cách phát hiện, vì nó chỉ thấy cái bạn dán.
3. **Không nhân được.** Bạn làm tầng tool cho một cuộc chat tại một thời điểm. Các level 5–7 (nhiều agent song song, loop, job chạy khi bạn ngủ) đều bắt đầu bằng việc **bỏ bạn ra khỏi các mũi tên**.

Bảng so sánh, đặt sau phần giải thích:

| | Chat + copy-paste | Agent trong repo (Level 2) |
|---|---|---|
| Ai chọn thứ vào context | Bạn, theo giả thuyết của bạn | Model tự đọc/grep; bạn chỉ đường |
| Ai chạy lệnh kiểm | Bạn | Model, trong giới hạn quyền bạn cấp |
| Nguồn sai khi thiếu thông tin | Model không biết là thiếu | Model có thể tự đi lấy thêm |
| Giới hạn số file | Sức kiên nhẫn của bạn | Context window + cách agent quản lý nó |
| Rủi ro mới | Ít — model không đụng được gì | Model ghi file, chạy lệnh → cần duyệt ([[ag-05-checkpoint-tung-buoc]]) |

Dòng cuối quan trọng: chat **an toàn** chính vì nó không làm được gì. Lên Level 2 là đổi rủi ro "model không thấy" lấy rủi ro "model làm".

### 3.7 Khi nào chat vẫn là công cụ đúng

Chat không lỗi thời. Nó đúng khi việc thoả **cả ba** điều kiện:

1. **Input tự đứng được.** Toàn bộ thông tin cần thiết dán được trong một lần và bạn **biết chắc** không có gì nằm ngoài (một regex, một câu SQL trên schema bạn dán, một hàm thuần không phụ thuộc).
2. **Đầu ra kiểm được rẻ.** Bạn kiểm bằng mắt hoặc bằng một lệnh trong vài giây.
3. **Không cần chạy trong môi trường của bạn.** Không cần biết version thư viện đang cài, biến môi trường, dữ liệu thật.

Ví dụ hợp:

- Hỏi khái niệm, so sánh hai cách thiết kế khi chưa có code ("event sourcing hay CRUD + outbox cho bài toán này?").
- Viết một regex, một câu `jq`, một biểu thức cron — rồi tự thử.
- Giải thích một stack trace bạn dán đủ.
- Phác thảo một tài liệu, một email, một bảng so sánh.
- Việc bạn **không muốn** cấp quyền repo/máy cho một tiến trình tự động.

Ví dụ không hợp: "bug này ở đâu", "refactor module X", "đổi tên hàm này khắp repo", "nâng cấp thư viện" — đều cần thấy nhiều file và cần chạy lệnh để biết đã đúng.

Câu hỏi nhanh để tự phân loại: **"Nếu model trả lời sai, tôi có phát hiện được trước khi nó gây hại không, và có phát hiện mà không phải mở thêm file nào không?"** Có → chat được. Không → cần agent, hoặc ít nhất cần prompt ép nó liệt kê điểm mù như §3.5.

---

## 4. Làm thử

### 4.1 Đo token của code thật (khoảng 15 phút)

Mục tiêu: thay "chắc tầm vài chục token một dòng" bằng số của chính repo bạn.

**Cách A — Token counting API** (cần API key; endpoint miễn phí theo docs, có giới hạn request/phút — [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)):

```bash
#!/usr/bin/env bash
# count-tokens.sh <file> [model]   — cần ANTHROPIC_API_KEY và jq
set -euo pipefail
f="$1"; model="${2:-claude-opus-5-5}"
body=$(jq -n --arg m "$model" --rawfile t "$f" \
  '{model:$m, messages:[{role:"user", content:$t}]}')
tok=$(curl -sS https://api.anthropic.com/v1/messages/count_tokens \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d "$body" | jq -r '.input_tokens')
lines=$(wc -l < "$f"); bytes=$(wc -c < "$f")
printf "%s\t%s dòng\t%s byte\t%s token\t%.1f token/dòng\n" \
  "$f" "$lines" "$bytes" "$tok" "$(echo "$tok/$lines" | bc -l)"
```

Lưu ý: số này gồm vài token bọc message; với file vài trăm dòng thì phần bọc không đáng kể. Docs ghi kết quả là **ước lượng**, có thể lệch nhỏ so với lúc gọi thật.

**Cách B — Claude Code headless** (dùng khi bạn có Claude Code nhưng không có API key; là cách đã dùng cho bảng ở §3.2):

```bash
# Mốc: prompt ngắn, không tool, không nạp settings
echo "Reply with exactly: OK" \
  | claude -p --output-format json --tools "" --setting-sources "" > base.json
# Có file
( echo "Reply with exactly: OK"; echo; cat src/yourFile.ts ) \
  | claude -p --output-format json --tools "" --setting-sources "" > with.json

python3 - <<'EOF'
import json
def total(p):
    u = json.load(open(p))["usage"]
    return u["input_tokens"] + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
print("token của file ≈", total("with.json") - total("base.json"))
EOF
```

Các flag `-p`, `--output-format json`, `--tools ""`, `--setting-sources` theo [CLI reference](https://code.claude.com/docs/en/cli-reference). Cách B tốn quota thật cho mỗi lần chạy.

**Việc cần làm:**

1. Chọn 3 file trong repo bạn, khác loại: một file logic backend, một file UI hoặc config, một file test.
2. Đo cả 3, ghi bảng như §3.2.
3. Đếm tổng dòng code của repo: `git ls-files '*.ts' '*.js' | xargs wc -l | tail -1` (đổi đuôi theo stack).
4. Nhân với hệ số thấp nhất và cao nhất bạn đo được.

**Xong khi:** bạn có bảng 3 file với token/dòng thật, và một câu dạng "repo của tôi khoảng X–Y token, vừa / không vừa context 1M" — có phép tính đi kèm.

### 4.2 Viết lại một prompt chat thật (khoảng 20 phút)

1. Mở lịch sử chat, tìm một lần gần đây model trả lời **sai hoặc phải sửa nhiều lượt** về code.
2. Viết lại tin nhắn đầu tiên theo năm khối của §3.5, thêm khối "liệt kê những gì bạn không thấy".
3. Gửi prompt mới vào **một chat mới** (không phải chat cũ — để context sạch).
4. So danh sách "điểm mù" model đưa ra với nguyên nhân thật của lần sai đó.

**Xong khi:** (a) prompt có đủ 5 khối + khối điểm mù; (b) bạn đánh dấu được trong danh sách điểm mù của model có hoặc không có đúng nguyên nhân thật. Nếu **không có**, ghi lại vì sao — thường là thông tin đó chỉ nằm trong đầu bạn, và đó là dữ liệu cho bài [[ag-04-context-va-file-huong-dan]].

### 4.3 Phân loại 10 việc (khoảng 10 phút)

Liệt kê 10 việc gần nhất bạn đã nhờ AI. Với mỗi việc, trả lời có/không cho ba điều kiện ở §3.7 (input tự đứng, kiểm rẻ, không cần môi trường).

```text
| Việc                          | Tự đứng | Kiểm rẻ | Không cần môi trường | Kết luận |
|-------------------------------|---------|---------|----------------------|----------|
| viết regex parse log nginx    | có      | có      | có                   | chat     |
| tìm vì sao email gửi 2 lần    | không   | không   | không                | agent    |
| ...                           |         |         |                      |          |
```

**Xong khi:** đủ 10 dòng, và bạn đếm được bao nhiêu việc rơi vào "agent". Con số đó là lượng công sức bạn đang làm tầng tool bằng tay.

---

## 5. Bẫy thường gặp

### 5.1 Dán cả file lớn "cho chắc"

Dán 2 000 dòng rồi hỏi "có bug không" thường nhận về câu trả lời chung chung, hoặc một lỗi ở đoạn đầu hay đoạn cuối file. Nhiều token hơn không có nghĩa là chú ý tốt hơn (context rot, §3.3), và câu hỏi lại không chỉ chỗ. Grep trước, rồi dán đoạn liên quan cùng **danh sách mọi chỗ khớp** (`grep -rn "<tên hàm>" src/`) và triệu chứng cụ thể. Khối "Bối cảnh" trong mẫu §3.5 bắt bạn làm bước này.

### 5.2 Coi điều chưa ai kiểm là sự thật

Model nói fix "chạy được rồi", bạn dán vào, deploy, và lỗi vẫn còn hoặc lỗi khác xuất hiện. Câu đó là dự đoán, vì model không chạy được gì (§3.4 lỗi 2). Khối "Xong khi" vì vậy luôn đòi lệnh kiểm kèm output mong đợi, và bạn không áp fix khi chưa có lệnh đó. Lượt sau dán output thật kèm exit code (`echo $?`), đừng chỉ gõ "vẫn lỗi".

Chiều ngược lại hỏng y như vậy. Bạn viết "chắc do cache Redis, sửa cache đi"; model sửa cache, bug còn nguyên. Model coi mọi thứ trong prompt là dữ kiện và không kiểm được giả thuyết của bạn vì không thấy hệ thống. Trong khối "Ràng buộc", tách phần đã xác minh khỏi phần **nghi ngờ, chưa xác minh** như mẫu §3.5, rồi yêu cầu model nêu cách xác nhận giả thuyết trước khi sửa.

### 5.3 Ràng buộc trôi trong chat dài

Model đề xuất đúng thứ bạn đã cấm ở đầu cuộc chat. Ràng buộc đó nằm xa trong một context dài, hoặc đã bị giao diện chat đẩy ra theo cơ chế cuốn chiếu (§3.3). Giữ một **file text "khối ngữ cảnh"** cho mỗi việc (bối cảnh, ràng buộc, tiêu chí xong); khi đổi hướng hoặc chat đã dài, mở chat mới và dán lại khối đó ở đầu. File này là tiền thân của `CLAUDE.md`/`AGENTS.md`, thứ agent tự nạp mỗi session.

### 5.4 Tin câu trả lời về tài liệu mà model chưa được đưa

Model nêu một tham số, một giới hạn hay một tên flag cụ thể, và nó sai hoặc đã cũ. Tài liệu không có trong context, nên câu trả lời đến từ dữ liệu huấn luyện hoặc từ một bản tóm tắt (§3.4 lỗi 3). Với mọi con số, flag hay giới hạn sẽ đi vào code, dán nguyên văn đoạn docs vào chat và yêu cầu model trích câu nó dựa vào. **Không trích được câu thì không dùng con số.**

---

## 6. Chuyển giao

Bài này kết thúc Level 1 bằng một nhận xét: mọi giới hạn của chat quy về **ai chọn và ai mang thông tin vào context** — và trong chat, câu trả lời luôn là bạn.

- [[ag-03-coding-agent-hoat-dong]] — Level 2 bỏ copy-paste: model tự gọi tool đọc file, grep, chạy lệnh, nhìn kết quả. Các mũi tên ở §3.1 và §3.6 chuyển từ tay bạn sang vòng lặp tool. Đổi lại bạn phải duyệt việc nó làm.
- [[ag-04-context-va-file-huong-dan]] — "khối ngữ cảnh" bạn dán lại mỗi chat (bẫy 5.3) trở thành file hướng dẫn agent tự nạp; context vẫn là ngân sách, nhưng có công cụ quản lý (compaction, plan mode).
- [[ag-10-done-criteria-va-gate]] — khối "Xong khi" mà ở chat bạn tự chạy bằng tay sẽ thành lệnh máy chạy và chặn.

Câu hỏi mang sang bài sau: khi agent **tự** chọn file để đọc, nó có tránh được lỗi 1 (thiếu chỗ tương tự) không — hay chỉ là chuyển giả thuyết sai từ bạn sang nó?

---

## 7. Tóm tắt

- Model trong chat là hàm text → text. **Thứ không có trong context window thì không tồn tại với nó**; trong vòng copy-paste, bạn là tầng tool đọc/chạy/quan sát thay nó.
- Context window = mọi thứ model tham chiếu được khi trả lời, gồm cả output. Model Claude hiện hành: 1M token, một số model khác 200k (docs) — tra lại khi đổi model.
- Token/dòng **không phải hằng số**: hai file TSX cùng repo đo được 15.2 và 24.9 token/dòng (một lần đo). Đo bằng token counting API hoặc `claude -p --output-format json`, đừng nhân hệ số nhớ mang máng.
- Vừa context không có nghĩa là đọc tốt: **context rot** làm độ chính xác giảm khi context dài; giao diện chat còn có thể cuốn chiếu đẩy phần đầu ra.
- Ba lỗi cùng gốc: thiếu chỗ tương tự, "đã fix" chưa ai chạy, và trả lời từ trí nhớ/bản tóm tắt thay vì nguyên văn.
- Prompt chat bù điểm mù bằng năm khối (bối cảnh, việc cần, ràng buộc, ví dụ, tiêu chí xong) cộng một yêu cầu: **liệt kê những gì bạn không thấy**.
- Copy-paste là trần vì băng thông là bạn, lỗi của bạn đi thẳng vào context, và không nhân lên được.
- Chat vẫn đúng khi input tự đứng, đầu ra kiểm rẻ, và không cần môi trường của bạn.
