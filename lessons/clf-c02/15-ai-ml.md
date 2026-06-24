# Bài 15 — AI/ML Services trên AWS

> Map exam: **CLF-C02 Task 3.7 — Identify AWS AI/ML services**. Đề CLF chỉ hỏi **nhận diện service nào giải bài toán nào** — không hỏi code/model.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **3 tầng AI/ML stack** của AWS: Frameworks → SageMaker → AI services.
- Match đúng **AI service** với task: speech, vision, language, search, recommendation, document.
- Hiểu khi nào dùng **SageMaker** vs **Bedrock** vs **AI service pre-trained**.

---

## 2. Lý thuyết

### 2.0 Analogy — 3 tầng như 3 mức ẩm thực

| Mức | AI Stack | Analogy |
|-----|----------|---------|
| Tự nuôi gà, trồng rau, nấu món | **Frameworks** (TensorFlow, PyTorch trên EC2/EKS) | Full control, full effort |
| Đi siêu thị mua nguyên liệu sạch + sách công thức | **SageMaker** (managed ML platform) | AWS chuẩn bị tools, bạn vẫn nấu |
| Đặt món ăn nhà hàng đã chế biến | **AI services** (Rekognition, Polly, Lex, …) | API call, không cần biết model |
| Đặt món delivery từ chef nổi tiếng | **Bedrock** (foundation model API) | LLM/generative AI dạng API |

Đa số use case → **AI services pre-trained** đủ tốt + nhanh + rẻ. SageMaker khi cần custom model.

Hình dung 3 tầng như một chồng xếp: càng **lên cao** càng ít việc phải làm (effort thấp) nhưng cũng càng ít quyền kiểm soát chi tiết (control thấp); càng **xuống đáy** càng nhiều quyền tuỳ biến nhưng tốn công nhất. Bedrock là một nhánh riêng cho GenAI (LLM dạng API):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chồng 3 tầng AI/ML của AWS — Frameworks, SageMaker, AI services, kèm Bedrock cho GenAI</title>
  <desc>Tháp 3 tầng xếp chồng: đáy là Frameworks (TensorFlow, PyTorch trên EC2/EKS) nhiều control và effort nhất; giữa là SageMaker (nền tảng ML managed); đỉnh là AI services pre-trained (Rekognition, Polly, Lex) ít control và effort nhất. Mũi tên bên trái cho thấy lên cao thì effort và control giảm. Bên phải là Bedrock — API foundation model cho GenAI.</desc>
  <text x="360" y="28" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Chồng 3 tầng AI/ML trên AWS</text>
  <defs>
    <marker id="aiArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g>
    <rect x="170" y="56" width="340" height="84" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="182" y="68" width="150" height="22" rx="11" fill="#10b981" fill-opacity="0.95"/>
    <text x="257" y="83" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Tầng 3 — AI services</text>
    <text x="182" y="110" font-size="11.5" font-weight="700" fill="currentColor">Pre-trained, gọi API</text>
    <text x="182" y="128" font-size="10.5" fill="currentColor" opacity="0.7">Rekognition · Polly · Lex · Comprehend · Kendra</text>
  </g>
  <g>
    <rect x="120" y="156" width="440" height="84" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="132" y="168" width="160" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="212" y="183" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Tầng 2 — SageMaker</text>
    <text x="132" y="210" font-size="11.5" font-weight="700" fill="currentColor">Nền tảng ML managed</text>
    <text x="132" y="228" font-size="10.5" fill="currentColor" opacity="0.7">Studio · Autopilot · Training · Endpoint · Pipelines</text>
  </g>
  <g>
    <rect x="70" y="256" width="540" height="84" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <rect x="82" y="268" width="160" height="22" rx="11" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="162" y="283" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Tầng 1 — Frameworks</text>
    <text x="82" y="310" font-size="11.5" font-weight="700" fill="currentColor">Tự build, full control</text>
    <text x="82" y="328" font-size="10.5" fill="currentColor" opacity="0.7">TensorFlow · PyTorch · MXNet trên EC2/EKS</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M40 336 v-264" marker-end="url(#aiArr)"/>
  </g>
  <text x="34" y="200" font-size="11" fill="currentColor" opacity="0.8" transform="rotate(-90 34 200)" text-anchor="middle">Lên cao: effort ↓ và control ↓</text>
  <g>
    <rect x="636" y="56" width="68" height="284" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="670" y="190" font-size="12" font-weight="700" fill="currentColor" transform="rotate(-90 670 190)" text-anchor="middle">Bedrock</text>
    <text x="688" y="190" font-size="10" fill="currentColor" opacity="0.7" transform="rotate(-90 688 190)" text-anchor="middle">GenAI · LLM API</text>
  </g>
  <text x="360" y="372" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Mặc định thử Tầng 3 trước → chỉ xuống Tầng 2/1 khi cần model riêng.</text>
  <text x="360" y="392" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">Bedrock = nhánh riêng cho foundation model (Claude, Titan, Llama…).</text>
</svg>

---

### 2.1 Amazon SageMaker — ML platform

**Bộ tool quản trị end-to-end ML lifecycle**:
- **SageMaker Studio** — IDE web cho data scientist (notebook, train, deploy).
- **Data Wrangler** — chuẩn bị + clean data.
- **Feature Store** — quản feature reuse giữa team.
- **Autopilot** — AutoML, tự chọn algorithm.
- **Training jobs** — train trên GPU/CPU managed.
- **Hyperparameter tuning** — tự tìm hyperparam tối ưu.
- **Model Registry** — version + approve model.
- **Endpoint** — host model như API real-time hoặc batch transform.
- **Pipelines** — MLOps workflow.
- **Ground Truth** — labeling data bằng human-in-the-loop.
- **Clarify** — phát hiện bias model.
- **JumpStart** — foundation model + solution template có sẵn.

**Khi dùng SageMaker**:
- Cần train **custom model** trên data riêng.
- Có ML engineer / data scientist.
- Muốn MLOps đầy đủ.

**Không cần SageMaker khi**:
- Use case đã có **AI service pre-trained** giải (xem dưới).
- Cần LLM/GenAI → dùng **Bedrock**.

---

### 2.2 Amazon Bedrock — Foundation Model API (GenAI)

**Bedrock** = API truy cập **foundation model** từ nhiều provider:
- **Anthropic Claude** (Claude 4.7 Opus, Sonnet, Haiku).
- **Amazon Titan** (text, embedding, image).
- **Meta Llama**.
- **Mistral**.
- **Stability AI** (Stable Diffusion).
- **Cohere**.

**Tính năng**:
- **Knowledge Bases** — RAG (retrieval augmented generation) với vector DB.
- **Agents** — LLM gọi tool/API (tool use).
- **Guardrails** — chặn nội dung không phù hợp.
- **Custom model** — fine-tune model với data riêng.

**Khi dùng**: chatbot, summarization, code gen, content gen, search semantic — bất cứ gì LLM giải được.

**Free tier**: limited token. Pricing per 1k input/output token.

---

### 2.3 AI services pre-trained (theo task)

#### Vision / Image / Video
| Service | Mục đích |
|---------|---------|
| **Amazon Rekognition** | Detect object, face, scene, celebrity, moderation, text-in-image (OCR nhẹ), video analysis |
| **Amazon Textract** | OCR + extract form, table từ document (hơn Rekognition về document) |

#### Speech
| Service | Mục đích |
|---------|---------|
| **Amazon Polly** | **Text → speech** (TTS), nhiều voice + ngôn ngữ |
| **Amazon Transcribe** | **Speech → text** (STT), real-time hoặc batch, có speaker diarization |

#### Language / NLP
| Service | Mục đích |
|---------|---------|
| **Amazon Comprehend** | NLP: sentiment, entity, key phrase, topic modeling, language detect, **Comprehend Medical** cho y khoa |
| **Amazon Translate** | Neural machine translation, 75+ ngôn ngữ |

#### Conversational
| Service | Mục đích |
|---------|---------|
| **Amazon Lex** | Chatbot / voicebot (engine của Alexa), có intent + slot |
| **Amazon Connect** | Contact center cloud (call center) — tích hợp Lex + Polly + Transcribe |

#### Search
| Service | Mục đích |
|---------|---------|
| **Amazon Kendra** | **Enterprise search** với NLU, hiểu câu hỏi tự nhiên, search across S3/SharePoint/Confluence/… |

#### Recommendation
| Service | Mục đích |
|---------|---------|
| **Amazon Personalize** | Recommendation engine giống Amazon.com (item, user, ranking) |

#### Forecasting
| Service | Mục đích |
|---------|---------|
| **Amazon Forecast** | Time-series forecasting (demand, inventory) — **đã merged vào SageMaker Canvas** (2024) |

#### Fraud detection
| Service | Mục đích |
|---------|---------|
| **Amazon Fraud Detector** | Phát hiện gian lận online (account takeover, payment fraud) |

#### Code
| Service | Mục đích |
|---------|---------|
| **Amazon CodeGuru** | Code review (Reviewer) + performance profiling (Profiler) |
| **Amazon Q Developer** (formerly CodeWhisperer) | AI coding assistant, autocomplete trong IDE |

#### Document
| Service | Mục đích |
|---------|---------|
| **Amazon Textract** | OCR document (xem trên) |
| **Amazon Q Business** | LLM tìm kiếm + chat trong tài liệu công ty |

#### Healthcare (đặc thù)
- **Amazon HealthLake** — store + query medical data (FHIR).
- **Amazon Comprehend Medical** — NLP cho clinical note.
- **Amazon Transcribe Medical** — STT chuyên y khoa.

---

### 2.4 Match đề thi — keyword → service

| Keyword đề | Service |
|-------------|---------|
| "convert text to natural voice" | **Polly** |
| "transcribe meeting audio to text" | **Transcribe** |
| "translate website 30 languages" | **Translate** |
| "sentiment analysis of tweet" | **Comprehend** |
| "detect inappropriate image" | **Rekognition** (content moderation) |
| "extract data from invoice PDF" | **Textract** |
| "build chatbot for customer service" | **Lex** (+ Connect nếu phone) |
| "search internal documents with natural language" | **Kendra** |
| "product recommendation like Amazon.com" | **Personalize** |
| "predict next month demand" | **Forecast** / SageMaker Canvas |
| "build custom ML model on tabular data" | **SageMaker** (+ Autopilot/Canvas nếu no-code) |
| "chatbot with LLM Claude" | **Bedrock** |
| "AI code autocomplete in VS Code" | **Amazon Q Developer** |
| "review code quality automatically" | **CodeGuru Reviewer** |
| "fraud detection for e-commerce" | **Fraud Detector** |

---

### 2.5 In-scope AI/ML services (theo exam guide)

Theo Appendix A của CLF-C02 v1.0:

**Machine Learning category**:
- Amazon Comprehend
- Amazon Kendra
- Amazon Lex
- Amazon Polly
- Amazon Rekognition
- Amazon SageMaker
- Amazon Textract
- Amazon Transcribe
- Amazon Translate

Bedrock, Q Developer, Personalize, Forecast, Fraud Detector, CodeGuru — không bắt buộc trong list chính nhưng có thể xuất hiện.

---

## 3. Hands-on có account

### Lab 1 — Rekognition detect (10 phút)
1. Rekognition console → **Try a demo**.
2. Upload ảnh → xem labels (Person, Car, Tree, …).
3. Try Facial Analysis demo.

### Lab 2 — Polly text-to-speech (5 phút)
1. Polly console → input text VN/EN.
2. Chọn voice (vd Joanna - female English).
3. Listen + download MP3.

### Lab 3 — Transcribe audio file (15 phút)
1. Upload MP3 lên S3.
2. Transcribe → new transcription job → S3 input → S3 output.
3. Đợi ~5 phút → tải JSON transcript.

### Lab 4 — Lex chatbot (45 phút)
1. Lex V2 → Create bot từ template "Order Flowers".
2. Test trong console → "I want to order roses".
3. Xem intent + slot.

### Lab 5 — Bedrock chat (15 phút)
1. Bedrock → Model access → request access cho Claude 4.7 Sonnet (instant approval).
2. Playground → Chat → input "Explain CLF-C02 in 3 sentences".
3. Quan sát token usage + pricing.

---

## 4. Hands-on không tốn tiền

### Option A — AWS Free Tier AI
- Rekognition: 5000 image analysis/tháng (12 tháng đầu).
- Polly: 5M characters TTS/tháng (12 tháng).
- Transcribe: 60 phút/tháng (12 tháng).
- Comprehend: 50k unit/tháng (12 tháng).

### Option B — Skill Builder
- "Practical Decision Making using AWS AI/ML Services" (free, 1h).
- "Foundations of Prompt Engineering" (free).

### Option C — Đoán service
Cho 10 use case, đoán service nào:
1. Voicebot tổng đài → Lex + Connect + Polly + Transcribe.
2. Translate website 50 ngôn ngữ → Translate.
3. Detect logo brand trong video → Rekognition Video.
4. OCR hóa đơn → Textract.
5. Search policy nội bộ tự nhiên → Kendra.
6. Recommend phim Netflix-style → Personalize.
7. Predict doanh thu Q4 → SageMaker / Forecast.
8. Generate marketing copy → Bedrock (Claude).
9. Sentiment review Shopee → Comprehend.
10. Code autocomplete → Q Developer.

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Convert speech to text trong real-time call."*
   <details><summary>Trả lời</summary>**Amazon Transcribe** (Real-time streaming).</details>

2. Đề: *"Extract table data from PDF invoice."*
   <details><summary>Trả lời</summary>**Amazon Textract**.</details>

3. Đề: *"Build chatbot voice + text như Alexa."*
   <details><summary>Trả lời</summary>**Amazon Lex**.</details>

4. Đề: *"Enterprise search 1M document SharePoint + S3 với câu hỏi natural language."*
   <details><summary>Trả lời</summary>**Amazon Kendra**.</details>

5. Đề: *"Detect inappropriate content trong user-uploaded image."*
   <details><summary>Trả lời</summary>**Amazon Rekognition** Content Moderation.</details>

6. Đề: *"Recommendation 'users also bought' cho e-commerce."*
   <details><summary>Trả lời</summary>**Amazon Personalize**.</details>

7. SageMaker vs Bedrock khác chính?
   <details><summary>Trả lời</summary>**SageMaker** = train + deploy **custom ML model** end-to-end. **Bedrock** = API gọi **foundation model** (LLM) có sẵn, không train từ đầu.</details>

8. Đề: *"Sentiment analysis comment Vietnamese."*
   <details><summary>Trả lời</summary>**Amazon Comprehend** (hỗ trợ tiếng Việt cho sentiment).</details>

9. Đề: *"Code review tự động trong CI/CD."*
   <details><summary>Trả lời</summary>**Amazon CodeGuru Reviewer**.</details>

10. AI service nào cho healthcare?
    <details><summary>Trả lời</summary>**Comprehend Medical**, **Transcribe Medical**, **HealthLake**.</details>

---

## 6. Đối chiếu GCP & Azure

| Task | AWS | GCP | Azure |
|------|-----|-----|-------|
| Image vision | Rekognition | Cloud Vision | Computer Vision |
| Document OCR | Textract | Document AI | Form Recognizer |
| TTS | Polly | Text-to-Speech | Speech Service |
| STT | Transcribe | Speech-to-Text | Speech Service |
| Translate | Translate | Translation | Translator |
| NLP | Comprehend | Natural Language | Text Analytics |
| Chatbot | Lex | Dialogflow | Bot Framework + LUIS |
| Search | Kendra | Vertex AI Search | Cognitive Search |
| Recommendation | Personalize | Recommendations AI | Personalizer |
| Forecast | Forecast / SageMaker Canvas | Vertex AI Forecasting | Time Series Insights |
| ML platform | SageMaker | Vertex AI | Azure ML Studio |
| GenAI / LLM | **Bedrock** | **Vertex AI (Gemini)** | **Azure OpenAI** |

---

## 7. Lưu ý khi thi CLF-C02

- Thuộc **1 dòng use case** cho mỗi service AI. Đề chỉ hỏi nhận diện.
- **SageMaker = full ML platform** (build custom model).
- **AI services pre-trained** = API, không cần train.
- **Bedrock** chưa chắc trong exam version cũ nhưng AWS hay thêm — biết là LLM API.
- **Rekognition (image/video)** ≠ **Textract (document)**. Textract chuyên document.
- **Polly (TTS)** ≠ **Transcribe (STT)**. Đừng nhầm.
- **Lex** = chatbot, **Connect** = contact center (gồm Lex bên trong).
- **Kendra** = enterprise search; **Personalize** = recommendation.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- SageMaker **multi-model endpoint**, **shadow test**, **A/B test**.
- Bedrock **provisioned throughput** vs on-demand.
- SageMaker integrate với **Step Functions** cho pipeline.
- Cost optimization với **Spot for training**, **Inferentia/Trainium** chip.

## 9. Lưu ý khi đi làm

- **Luôn thử AI service pre-trained trước** trước khi nghĩ SageMaker.
- **Bedrock** cho POC GenAI rất nhanh (1 ngày so với train từ đầu).
- **Rekognition + S3 event** = workflow image moderation auto.
- **Lex + Connect** thay tổng đài truyền thống → tiết kiệm 50% cost.
- **Q Developer** trong IDE → tăng năng suất dev ~30%.
- **Bias / Responsible AI** — Bedrock Guardrails + SageMaker Clarify để check.

---

## 10. Flashcard

- **3 tầng AI**: Frameworks → SageMaker → AI services.
- **SageMaker** — ML platform (Studio, Autopilot, JumpStart, Ground Truth, Clarify, Feature Store, Endpoint, Pipelines).
- **Bedrock** — foundation model API (Claude, Titan, Llama, Mistral, Stable Diffusion).
- **Rekognition** — image/video analysis.
- **Textract** — document OCR + form/table.
- **Polly** — text-to-speech.
- **Transcribe** — speech-to-text.
- **Translate** — machine translation.
- **Comprehend** — NLP (sentiment, entity, topic).
- **Comprehend Medical** — y khoa.
- **Lex** — chatbot / voicebot (engine của Alexa).
- **Connect** — cloud contact center.
- **Kendra** — enterprise search NLU.
- **Personalize** — recommendation.
- **Forecast** — time-series forecasting.
- **Fraud Detector** — phát hiện gian lận.
- **CodeGuru** — code review (Reviewer) + perf profiling (Profiler).
- **Q Developer** — AI coding assistant (formerly CodeWhisperer).
- **Q Business** — LLM tìm kiếm docs nội bộ.
