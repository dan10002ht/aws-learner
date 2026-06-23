# AI/ML landscape cho kỹ sư

Bạn là kỹ sư phần mềm, không phải data scientist. Mục tiêu của bài này không phải để bạn hiểu gradient descent hay đạo hàm riêng, mà để bạn **biết chọn đúng công cụ** khi sếp nói "thêm AI vào sản phẩm đi". Nắm được bản đồ này, bạn sẽ biết khi nào viết `if/else` là đủ, khi nào cần train model, và khi nào chỉ cần gọi một API.

## AI / ML / DL / GenAI — phân biệt cho rõ

Mấy từ này hay bị dùng lẫn lộn. Chúng là các vòng tròn lồng nhau, không phải đồng nghĩa.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 380" role="img" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>AI bao trùm ML, ML bao trùm DL, DL bao trùm GenAI/LLM</title>
  <desc>Bốn vòng tròn lồng nhau: vòng ngoài cùng AI gồm cả rule-based; bên trong là ML học từ data; bên trong nữa là DL dùng neural network nhiều lớp; trong cùng là GenAI/LLM sinh nội dung mới. Mỗi tầng kèm một ví dụ ngắn.</desc>
  <rect x="10" y="10" width="540" height="360" rx="14" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="30" y="38" font-size="14" font-weight="700" fill="currentColor">AI — máy làm việc "thông minh" (gồm cả rule-based)</text>
  <text x="30" y="56" font-size="11" fill="currentColor" opacity="0.65">VD: bot cờ vua minimax, hệ chống gian lận bằng luật</text>
  <rect x="40" y="74" width="480" height="282" rx="12" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="60" y="100" font-size="14" font-weight="700" fill="currentColor">ML — học pattern từ data, không hardcode luật</text>
  <text x="60" y="118" font-size="11" fill="currentColor" opacity="0.65">VD: lọc spam, gợi ý sản phẩm, dự báo churn</text>
  <rect x="70" y="136" width="420" height="206" rx="11" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="90" y="162" font-size="14" font-weight="700" fill="currentColor">DL — ML dùng neural network nhiều lớp</text>
  <text x="90" y="180" font-size="11" fill="currentColor" opacity="0.65">VD: nhận diện ảnh, speech-to-text</text>
  <rect x="100" y="198" width="360" height="130" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="120" y="234" font-size="14" font-weight="700" fill="currentColor">GenAI / LLM — DL sinh nội dung mới</text>
  <text x="120" y="254" font-size="11" fill="currentColor" opacity="0.65">VD: ChatGPT, Claude, Midjourney, Copilot</text>
  <text x="120" y="296" font-size="11" fill="currentColor" opacity="0.55">"AI" trong marketing 2025 thường là tầng này</text>
</svg>

| Tầng | Là gì | Ví dụ thực tế |
|------|-------|----------------|
| **AI** | Bất cứ thứ gì làm máy "có vẻ thông minh", kể cả luật cứng | Con bot cờ vua dùng minimax, hệ thống chống gian lận bằng rule |
| **ML** | Học từ data để dự đoán, không viết luật tay | Lọc spam, gợi ý sản phẩm, dự báo churn |
| **DL** | ML dùng neural network sâu, ăn nhiều data + GPU | Nhận diện ảnh, speech-to-text |
| **GenAI** | DL *sinh* ra text/ảnh/code mới | ChatGPT, Claude, Midjourney, GitHub Copilot |

> 💡 Ghi nhớ: GenAI là một nhánh con của DL, DL là nhánh con của ML, ML là nhánh con của AI. Khi marketing nói "AI", 90% trường hợp năm 2025 họ đang nói về **GenAI/LLM**.

## Ba kiểu học của ML (mức khái niệm)

Bạn không cần tự cài, nhưng cần nhận ra bài toán thuộc loại nào để nói chuyện với data team.

- **Supervised learning** — học từ data **có nhãn** (input → output đúng). Bạn đưa 10.000 email kèm nhãn spam/không-spam, model học cách dán nhãn email mới.
  - *Classification*: output là nhóm (spam / không spam).
  - *Regression*: output là số (giá nhà, số đơn tuần tới).
- **Unsupervised learning** — data **không nhãn**, model tự tìm cấu trúc. Ví dụ: gom khách hàng thành các segment (clustering), hoặc giảm chiều dữ liệu. **Embedding** mà bạn dùng trong RAG cũng sinh ra từ kỹ thuật họ hàng với nhóm này.
- **Reinforcement learning (RL)** — agent thử-sai trong môi trường, nhận reward, học chính sách tối ưu. Dùng cho robot, game, và quan trọng với bạn: **RLHF** (Reinforcement Learning from Human Feedback) là bước "dạy lễ phép" cho LLM sau khi pre-train.

> 💡 Ghi nhớ: 95% việc của kỹ sư ứng dụng dính tới **supervised** (qua model có sẵn) hoặc dùng thẳng **LLM**. RL bạn gần như không tự train, chỉ cần biết nó tồn tại.

## Traditional ML vs LLM

Đây là phân biệt quan trọng nhất cho công việc hằng ngày của bạn.

| Tiêu chí | Traditional ML | LLM (GenAI) |
|----------|----------------|-------------|
| Cần data train riêng? | Có — phải gom & gán nhãn | Không (model đã pre-train sẵn) |
| Phù hợp cho | Số liệu có cấu trúc, dự đoán hẹp | Ngôn ngữ tự nhiên, text, code |
| Cách "dạy" | Train lại model | Đổi prompt / few-shot / RAG |
| Output | Con số, nhãn, xác suất | Text tự do (đôi khi sai sự thật) |
| Chi phí vận hành | Train tốn 1 lần, inference rẻ | Trả tiền **mỗi token** mỗi lần gọi |
| Độ trễ (latency) | Mili-giây | Trăm ms → vài giây |
| Giải thích được? | Khá (feature importance) | Khó (black box) |
| Lỗi đặc trưng | Overfit, data drift | Hallucination, prompt injection |

Ví dụ: "dự đoán khách nào sắp hủy gói" với 50 cột số liệu → **traditional ML** (XGBoost) ăn đứt LLM về độ chính xác, chi phí và tốc độ. Còn "tóm tắt ticket support và phân loại sang đúng team" → **LLM** thắng vì input là văn bản tự do.

> ⚠️ Bẫy: Đừng nhét mọi thứ vào LLM vì nó "tiện". Dùng LLM để cộng hai số hay dự đoán doanh thu từ bảng số là vừa đắt, vừa chậm, vừa kém chính xác hơn một model truyền thống 50 dòng code.

## Khi nào dùng ML vs Rule-based vs LLM

Đây là cây quyết định bạn nên dán lên tường:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định chọn Rule-based, Traditional ML hay LLM</title>
  <desc>Cây quyết định: nếu viết được luật rõ ràng ổn định thì dùng Rule-based; nếu không, hỏi input là gì — số liệu có cấu trúc kèm data có nhãn thì dùng Traditional ML, còn ngôn ngữ tự nhiên hoặc ảnh cần hiểu và sinh nội dung thì dùng LLM/GenAI.</desc>
  <rect x="190" y="16" width="340" height="54" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Viết được thành luật rõ ràng,</text>
  <text x="360" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">ổn định không?</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-width="1.5">
    <path d="M360 70 V94 H150 V120"/>
    <path d="M360 70 V94 H530 V120"/>
  </g>
  <rect x="118" y="98" width="40" height="20" rx="10" fill="#10b981" fill-opacity="0.9"/>
  <text x="138" y="112" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">CÓ</text>
  <rect x="500" y="98" width="60" height="20" rx="10" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="530" y="112" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">KHÔNG</text>
  <rect x="30" y="120" width="240" height="74" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="150" y="144" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Rule-based</text>
  <text x="150" y="162" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">if/else, regex, lookup table</text>
  <text x="150" y="180" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.55">VD: validate email, tính thuế, giảm giá</text>
  <rect x="410" y="120" width="280" height="48" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="550" y="149" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Input là gì?</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-width="1.5">
    <path d="M550 168 V190 H300 V230"/>
    <path d="M550 168 V190 H560 V230"/>
  </g>
  <rect x="170" y="232" width="260" height="86" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="300" y="200" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">số liệu có cấu trúc + data có nhãn</text>
  <text x="300" y="258" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Traditional ML</text>
  <text x="300" y="278" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">XGBoost, regression, classification</text>
  <text x="300" y="298" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.55">VD: fraud, dự báo nhu cầu, recommend</text>
  <rect x="450" y="232" width="240" height="86" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="570" y="200" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">ngôn ngữ tự nhiên / ảnh, cần hiểu &amp; sinh</text>
  <text x="570" y="258" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">LLM / GenAI</text>
  <text x="570" y="278" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">qua API: prompt / few-shot / RAG</text>
  <text x="570" y="298" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.55">VD: chatbot, tóm tắt, trích xuất, sinh code</text>
  <text x="360" y="360" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">Thứ tự thử nhanh: rule-based → LLM (chứng minh giá trị) → traditional ML / fine-tune (khi cần rẻ/nhanh ở scale lớn)</text>
</svg>

Quy tắc ngón tay cái:

- **Rule-based** khi logic ổn định và bạn cần 100% kiểm soát + giải thích được (luật pháp, kế toán, security policy). Rẻ nhất, nhanh nhất, debug dễ nhất.
- **Traditional ML** khi pattern quá phức tạp để viết tay nhưng bạn **có data lịch sử có nhãn** và đầu vào là số/category.
- **LLM** khi input là **ngôn ngữ tự nhiên không cấu trúc** và bạn chấp nhận một mức sai số + chi phí token.

> 💡 Ghi nhớ: Thứ tự ưu tiên khi xây nhanh: thử **rule-based** trước, không nổi thì **LLM qua API** (chứng minh giá trị nhanh), khi cần rẻ/nhanh/chính xác ở scale lớn mới cân nhắc **traditional ML / fine-tune**.

## Bạn ở đâu trong team? Vai trò AI

Đừng nhầm vai mình với data scientist — bạn sẽ khổ vì học sai thứ.

| Vai trò | Làm gì | Đầu ra | Bạn cần toán? |
|---------|--------|--------|----------------|
| **Data Scientist** | Phân tích data, chọn/thử model, đánh giá thống kê | Notebook, model prototype, insight | Có, nhiều |
| **ML Engineer** | Đưa model lên production: training pipeline, serving, scaling, MLOps | Hệ thống train + serve ổn định | Vừa |
| **AI Application Engineer (bạn)** | Xây *sản phẩm* dùng model có sẵn: gọi API, RAG, agent, eval, UX, cost control | Tính năng/sản phẩm chạy thật | Gần như không |

Là **AI application engineer**, kỹ năng cốt lõi của bạn là: thiết kế prompt, dựng RAG, ghép tool/agent, đo lường chất lượng (eval), kiểm soát chi phí & latency, và xử lý lỗi production (rate limit, hallucination, prompt injection). Đó toàn là kỹ năng *phần mềm*, không phải *thống kê*.

> 💡 Ghi nhớ: Bạn không cần biết train model để xây sản phẩm AI tuyệt vời. Bạn cần biết **dùng** model đúng cách, đo nó, và bọc nó trong một hệ thống đáng tin cậy.

## Build vs Dùng API — quyết định nền tảng

Câu hỏi gần như luôn xuất hiện: "tự host model hay gọi API?"

```
Dùng API (OpenAI, Anthropic, Bedrock)   |  Tự host / fine-tune model
-----------------------------------------|--------------------------------
+ Lên prod trong vài giờ                 |  + Kiểm soát data hoàn toàn
+ Luôn có model SOTA mới nhất            |  + Chi phí/token rẻ ở scale rất lớn
+ Không lo GPU, scaling                  |  + Chạy offline / on-prem được
- Phụ thuộc nhà cung cấp                 |  - Cần đội MLOps + GPU đắt
- Data rời khỏi hệ thống (cân nhắc)      |  - Chậm, nặng, phải tự vá lỗi
- Giá theo token, khó dự đoán            |  - Model tự host thường yếu hơn SOTA
```

Pseudo-code so sánh — dùng API thì cả tính năng gói gọn vài dòng:

```python
# Cách dùng API (đa số trường hợp nên chọn cái này trước)
from anthropic import Anthropic
client = Anthropic()  # đọc API key từ env

resp = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Tóm tắt ticket sau thành 1 câu: ..."}],
)
print(resp.content[0].text)
```

```python
# Cách self-host (chỉ khi có lý do mạnh: privacy, scale, offline)
# Bạn phải lo: tải model 70B, GPU, server inference (vLLM),
# autoscaling, monitoring, cập nhật weights, fallback... — cả một đội.
```

Lời khuyên thực dụng 2025-2026: **mặc định dùng managed API** để chứng minh sản phẩm có giá trị. Chỉ chuyển sang self-host/fine-tune khi có lý do cụ thể: yêu cầu compliance khắt khe, volume cực lớn khiến chi phí token vượt chi phí GPU, hoặc cần chạy offline.

> ⚠️ Bẫy: "Fine-tune một LLM của riêng mình" nghe oai nhưng thường là sai lầm đầu tiên. 80% nhu cầu giải quyết được bằng **prompt tốt + RAG**, rẻ hơn và linh hoạt hơn fine-tune nhiều.

## Chi phí & rủi ro — phần kỹ sư hay quên

### Chi phí (cost)

LLM tính tiền theo **token** (≈ 0.75 từ tiếng Anh / token; tiếng Việt tốn token hơn). Bạn trả cho **cả input lẫn output**, và input thường gồm cả prompt hệ thống + lịch sử hội thoại + tài liệu RAG — nó phình rất nhanh.

```
Chi phí 1 request ≈ (input_tokens × giá_input) + (output_tokens × giá_output)

Ví dụ thô: chatbot có 1M lượt/tháng, mỗi lượt ~2k input + 500 output token
=> vài triệu → vài chục triệu token/tháng. Nhân với đơn giá để ra hóa đơn.
```

Đòn bẩy giảm chi phí: chọn **model nhỏ/rẻ** cho việc dễ (định tuyến model theo độ khó), **prompt caching** cho phần system prompt lặp lại, **cắt bớt context** thừa, **cache câu trả lời** cho câu hỏi trùng, và đặt **giới hạn `max_tokens`**.

> 💡 Ghi nhớ: Mỗi token là tiền và là latency. Prompt ngắn gọn vừa rẻ vừa nhanh. Đừng nhồi cả cuốn tài liệu vào prompt khi RAG chỉ cần 3 đoạn liên quan.

### Rủi ro (risk)

| Rủi ro | Mô tả | Cách giảm |
|--------|-------|-----------|
| **Hallucination** | Model bịa thông tin sai một cách tự tin | RAG (grounding), bắt trích nguồn, có guardrail |
| **Prompt injection** | User/tài liệu nhét lệnh ghi đè prompt của bạn | Tách rõ data vs lệnh, không tin output mù quáng |
| **Rò rỉ data** | Gửi PII/bí mật ra API bên thứ ba | Lọc PII, dùng region riêng, hợp đồng no-train |
| **Phụ thuộc nhà cung cấp** | Đổi giá, deprecate model, downtime | Trừu tượng hóa lớp gọi model, có fallback |
| **Tính bất định** | Cùng prompt ra kết quả khác nhau | Hạ temperature, ép structured output, eval |
| **Chi phí trượt** | Token tăng âm thầm theo traffic | Theo dõi cost/request, đặt budget alert |

> ⚠️ Bẫy: Đừng bao giờ tin tưởng tuyệt đối output của LLM trong luồng tự động. Với hành động quan trọng (xóa data, chuyển tiền, gửi email khách), luôn để **human-in-the-loop** hoặc validate cứng trước khi thực thi.

## Tổng kết bản đồ

- **AI ⊃ ML ⊃ DL ⊃ GenAI/LLM** — biết mình đang nói về tầng nào.
- Supervised / unsupervised / reinforcement: nhận diện loại bài toán, không cần tự train.
- **Rule-based** cho logic ổn định, **traditional ML** cho data có cấu trúc + nhãn, **LLM** cho ngôn ngữ tự nhiên.
- Bạn là **application engineer**: kỹ năng là prompt, RAG, agent, eval, cost — không phải toán.
- Mặc định **dùng API** trước; self-host/fine-tune chỉ khi có lý do mạnh.
- Luôn tính **token = tiền + latency** và quản lý **hallucination, injection, rò rỉ data**.

## Liên hệ sang AWS

Khi triển khai trên AWS, các khối kiến thức trên ánh xạ thẳng vào dịch vụ:

- **Amazon Bedrock** — managed API truy cập nhiều foundation model (Anthropic Claude, Amazon Nova, Llama, Mistral...) qua một endpoint duy nhất. Đây là tương đương "dùng API" của AWS; có **Guardrails** (lọc nội dung, chặn PII, giảm hallucination), **Knowledge Bases** (RAG dựng sẵn) và **Agents** (tool use).
- **Amazon Q** — trợ lý GenAI đóng gói sẵn: *Q Developer* hỗ trợ code (kiểu Copilot), *Q Business* là chatbot RAG trên data nội bộ. Đây là lựa chọn "dùng luôn không cần build" cho nhiều use case.
- **Amazon SageMaker** — sân chơi của **ML Engineer / Data Scientist**: train, fine-tune, deploy cả traditional ML lẫn LLM tự host. Bạn chỉ vào đây khi đã quyết định self-host/fine-tune.
- **Amazon OpenSearch Service** (hỗ trợ **vector search / k-NN), Aurora PostgreSQL + pgvector** — nơi lưu **embedding** cho RAG. Bedrock Knowledge Bases có thể tự dùng các vector store này phía sau.
- **AWS managed model API** giúp bạn ở đúng vai *application engineer*: ghép Bedrock + Knowledge Base + Guardrails + một hàm Lambda là đã có sản phẩm AI chạy thật mà không cần đụng tới GPU hay MLOps.

> 💡 Ghi nhớ: Trên AWS, đường nhanh nhất cho kỹ sư ứng dụng là **Bedrock (model) + Knowledge Bases (RAG) + Guardrails (an toàn)**. SageMaker để dành cho khi bạn thực sự cần tự train.
