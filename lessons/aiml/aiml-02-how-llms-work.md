# LLM hoạt động thế nào

Bài này giúp bạn — kỹ sư xây sản phẩm — có **mental model đúng** về cách một Large Language Model (LLM) như GPT, Claude, Gemini hoạt động. Mục tiêu là dùng đúng API, tránh bug và tối ưu chi phí, chứ không phải hiểu sâu transformer math.

> 💡 Ghi nhớ: LLM về bản chất là một **máy đoán token tiếp theo**. Mọi thứ "thông minh" bạn thấy đều xuất phát từ việc lặp lại hành động đoán đó hàng nghìn lần.

---

## 1. Token & tokenization

Model **không** đọc chữ cái hay từ. Nó đọc **token** — các mảnh văn bản (sub-word). Trước khi vào model, text của bạn được **tokenizer** cắt thành các số nguyên (token IDs).

```
"Tokenization rất thú vị"
        │  tokenizer
        ▼
["Token", "ization", " rất", " th", "ú", " vị"]
        │
        ▼
[15496, 1634, 8901, 412, 233, 9120]   # token IDs
```

Quy tắc kinh nghiệm cho tiếng Anh: **1 token ≈ 4 ký tự ≈ 0.75 từ**. Tiếng Việt (và các ngôn ngữ non-Latin) tốn token hơn nhiều — một từ có dấu có thể thành 2-3 token.

Vì sao kỹ sư phải quan tâm?

- **Tính tiền theo token**, không theo từ. Input tokens + output tokens.
- **Context window đo bằng token**, không phải ký tự.
- Các hành vi lạ ("strawberry có mấy chữ r?") đến từ việc model thấy token, không thấy chữ cái.

```python
# Đếm token TRƯỚC khi gọi API để dự toán chi phí và tránh tràn context
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4o")
n_tokens = len(enc.encode(user_text))
if n_tokens > 100_000:
    user_text = truncate(user_text)   # hoặc chunk + RAG
```

> ⚠️ Bẫy: Đừng ước lượng giá bằng `len(text)`. Tiếng Việt, JSON, code, emoji có tỉ lệ token/ký tự rất khác nhau. Luôn dùng tokenizer thật của model đó.

---

## 2. Next-token prediction

Đây là **trái tim** của LLM. Cho một chuỗi token, model xuất ra **phân phối xác suất** trên toàn bộ vocabulary (~100k+ token) cho token *tiếp theo*.

```
Input:  "Thủ đô của nước Pháp là"
                    │
                    ▼  model
Output: P(" Paris")   = 0.92
        P(" thành")   = 0.03
        P(" một")     = 0.01
        ... (hàng chục nghìn token khác)
```

Sau đó nó **chọn** một token, **nối vào input**, và lặp lại. Đây gọi là **autoregressive generation**.

```
[prompt] → đoán tok1 → [prompt + tok1] → đoán tok2 → [prompt + tok1 + tok2] → ...
```

Hệ quả thực tế bạn phải nhớ:

- Model sinh **tuần tự, từng token một**. Đây là lý do output dài thì **chậm** (xem phần latency & streaming).
- Model **không có kế hoạch tổng thể** trước khi viết. Nó "viết tới đâu nghĩ tới đó". Vì vậy kỹ thuật như "hãy suy nghĩ từng bước" (chain-of-thought) thực sự cải thiện chất lượng — bạn cho nó token để "nghĩ".
- Model **không tra cứu database**. Nó không "tìm" câu trả lời; nó **tạo ra** chuỗi token có xác suất cao. Đây là gốc rễ của hallucination.

> 💡 Ghi nhớ: LLM không "biết" sự thật. Nó tạo ra văn bản *nghe có vẻ đúng*. Đa số lúc trùng với sự thật vì training data đúng — nhưng không có gì đảm bảo.

---

## 3. Context window & giới hạn

**Context window** = số token tối đa model "nhìn thấy" cùng lúc = **input + output cộng lại**.

```
┌─────────────── Context window (ví dụ 200k token) ───────────────┐
│ system prompt │ lịch sử hội thoại │ tài liệu RAG │ câu hỏi │ ←output→ │
└─────────────────────────────────────────────────────────────────┘
                       (phải vừa TẤT CẢ trong đây)
```

Vài con số tham khảo 2025-2026: từ 128k đến 1M+ token tùy model.

Những điều then chốt:

- Vượt context window → **lỗi cứng** (API reject) hoặc bị **cắt cụt** (truncate) im lặng → mất thông tin.
- Mỗi lần gọi API, **toàn bộ context được gửi lại**. Model **không có memory** giữa các request — bạn phải tự gửi lại lịch sử mỗi lần. "Chatbot nhớ" chỉ là app của bạn append history.
- **"Lost in the middle"**: dù context lớn, model chú ý tốt nhất ở **đầu và cuối**. Thông tin quan trọng nhét giữa một context khổng lồ dễ bị bỏ sót.
- Context lớn = **đắt và chậm hơn**. Nhồi 500k token mỗi turn không miễn phí.

> ⚠️ Bẫy: Đừng nhồi toàn bộ knowledge base vào prompt chỉ vì "context window đủ lớn". Dùng **RAG** (lấy ra phần liên quan) — rẻ hơn, nhanh hơn, và chính xác hơn nhờ tránh "lost in the middle".

```python
# Quản lý history thủ công vì model không tự nhớ
messages = [system_msg]
for turn in conversation_history[-N:]:   # giữ N turn gần nhất
    messages.append(turn)
messages.append({"role": "user", "content": new_question})
# Nếu tổng token gần chạm trần → tóm tắt các turn cũ thành 1 message
```

---

## 4. Embedding là gì

**Embedding** = biểu diễn một đoạn text thành một **vector số thực** (ví dụ 1536 chiều) sao cho **ý nghĩa gần nhau → vector gần nhau** trong không gian.

```
"chó"      → [0.21, -0.04,  0.88, ...]
"cún"      → [0.19, -0.07,  0.85, ...]   ← gần "chó"
"hóa đơn"  → [-0.6,  0.31, -0.12, ...]   ← xa
```

Đây là một **API/model riêng**, khác với LLM sinh text. Bạn gọi embedding model để **đo độ tương đồng ngữ nghĩa** (semantic similarity), thường bằng **cosine similarity**.

Ứng dụng của kỹ sư:

- **Semantic search / RAG**: embed tài liệu → lưu vào **vector database** → khi có câu hỏi, embed câu hỏi, tìm các vector gần nhất.
- **Clustering, dedup, recommendation, classification.**

```python
# Pipeline RAG cơ bản
doc_vectors = embed(chunks)                 # offline, lưu vào vector DB
q_vec = embed(user_question)                # online
top_k = vector_db.search(q_vec, k=5)        # nearest neighbors
prompt = build_prompt(context=top_k, question=user_question)
answer = llm.generate(prompt)               # LLM chỉ đọc 5 chunk liên quan
```

> 💡 Ghi nhớ: Embedding **đo độ giống về ý nghĩa**, LLM **sinh ra văn bản**. Hai loại model khác nhau, hai loại chi phí khác nhau. RAG = embedding (tìm) + LLM (trả lời).

---

## 5. Temperature & top-p — điều khiển độ "ngẫu nhiên"

Sau khi có phân phối xác suất token tiếp theo, ta cần chọn token. Hai núm vặn chính:

| Tham số | Ý nghĩa | Giá trị thấp | Giá trị cao |
|---|---|---|---|
| `temperature` | Làm phẳng/nhọn phân phối xác suất | Bám token xác suất cao → **ổn định, lặp lại được** | Đa dạng, sáng tạo, **rủi ro lan man** |
| `top_p` (nucleus) | Chỉ chọn trong nhóm token cộng dồn tới p | p nhỏ → ít lựa chọn | p≈1 → nhiều lựa chọn |

Quy tắc thực dụng:

- **Tác vụ cần chính xác/xác định**: extraction, classification, sinh JSON, tool calling → `temperature = 0` (hoặc gần 0).
- **Tác vụ sáng tạo**: brainstorm, viết quảng cáo → `temperature 0.7–1.0`.
- Thường **chỉ chỉnh một** trong hai (temperature **hoặc** top_p), không chỉnh cả hai cùng lúc.

```python
# Trích xuất dữ liệu có cấu trúc → muốn deterministic
resp = client.generate(prompt, temperature=0)
```

> ⚠️ Bẫy: `temperature=0` làm output **ổn định hơn** nhưng **không đảm bảo 100% giống nhau** giữa các lần gọi (do hạ tầng, floating point, batching). Đừng dựa vào tính lặp lại tuyệt đối; nếu cần, hãy hash/cache kết quả.

---

## 6. Vì sao có hallucination

**Hallucination** = model tạo ra thông tin **nghe rất tự tin nhưng sai/bịa**.

Nguyên nhân gốc (từ phần 2): model **tối ưu cho token nghe hợp lý**, không tối ưu cho sự thật. Nó không có cơ chế "tôi không biết" tự nhiên — nó luôn sinh được *một câu gì đó*.

Các tình huống dễ hallucination:

- Hỏi về sự kiện **sau training cutoff** (model không biết tin mới).
- Hỏi chi tiết **hiếm/cụ thể**: số liệu, trích dẫn, API, tên người, link URL → model hay **bịa** ra cái "trông đúng".
- Ép trả lời khi **không có dữ liệu** trong prompt.

Cách giảm thiểu (đây là việc của kỹ sư, không phải của model):

- **RAG**: cấp dữ liệu thật vào context và yêu cầu "chỉ trả lời dựa trên tài liệu dưới đây".
- **Cho phép nói "không biết"**: "Nếu không có trong tài liệu, hãy trả lời 'Tôi không có thông tin'."
- **Tool use / function calling**: cho model gọi API/DB thật thay vì tự bịa số.
- **Citations & verification**: bắt model trích nguồn, rồi kiểm lại.
- **Eval**: đo tỉ lệ hallucination bằng test set, đừng tin cảm tính.

> ⚠️ Bẫy: Không bao giờ cho output LLM thẳng vào hành động có hậu quả (gửi tiền, xóa data, hiển thị giá) mà không validate. Coi LLM như một **intern thông minh nhưng đôi khi bịa** — luôn kiểm tra.

---

## 7. Model size vs cost vs latency

Provider nào cũng có **vài tier** model: lớn (mạnh, đắt, chậm) → nhỏ (yếu hơn, rẻ, nhanh).

```
            Chất lượng ▲
   Model lớn  ●  (đắt $$$, chậm, suy luận tốt)
              │
   Model vừa  ●  (cân bằng)
              │
   Model nhỏ  ●  (rẻ $, nhanh, đủ cho tác vụ đơn giản)
            ──┴──────────────► Cost & Latency
```

Trade-off thực tế:

- **Đừng mặc định dùng model to nhất.** Phần lớn tác vụ (classification, tóm tắt ngắn, routing, extraction) chạy tốt trên model nhỏ với chi phí bằng 1/10–1/20.
- **Model routing**: dùng model nhỏ xử lý, chỉ **escalate** lên model lớn cho ca khó.
- Giá tính riêng **input token** và **output token** (output thường đắt hơn 2-5x).
- **Prompt caching**: nhiều provider cho cache phần prompt cố định (system prompt, tài liệu lớn) → giảm mạnh chi phí cho phần lặp lại.

```python
def route(task):
    if task.type in ("classify", "extract", "route"):
        return "small-fast-model"     # rẻ, nhanh
    if task.needs_reasoning:
        return "large-model"          # đắt, mạnh
    return "mid-model"
```

> 💡 Ghi nhớ: Tối ưu chi phí LLM = chọn đúng model cho đúng tác vụ + giảm token (RAG thay vì nhồi context) + caching. Không phải lúc nào cũng cần model mạnh nhất.

---

## 8. System / User / Assistant message

API hiện đại dùng **danh sách message có role**, không phải một chuỗi text phẳng:

| Role | Mục đích |
|---|---|
| `system` | Quy tắc, persona, định dạng, ràng buộc. "Hiến pháp" của cuộc hội thoại. |
| `user` | Đầu vào từ người dùng (hoặc app). |
| `assistant` | Câu trả lời trước đó của model (để giữ ngữ cảnh hội thoại). |

```python
messages = [
  {"role": "system",    "content": "Bạn là trợ lý hỗ trợ kỹ thuật. Trả lời bằng tiếng Việt, ngắn gọn. Nếu không chắc, hãy nói rõ."},
  {"role": "user",      "content": "Làm sao reset mật khẩu?"},
  {"role": "assistant", "content": "Vào Cài đặt > Bảo mật > Đổi mật khẩu."},
  {"role": "user",      "content": "Tôi không thấy mục đó."}   # turn mới, có ngữ cảnh trên
]
```

Điểm kỹ sư hay nhầm:

- **System prompt mạnh nhưng không bất khả xâm phạm.** User input vẫn có thể tìm cách lấn át (**prompt injection**). Đừng đặt secret hay logic bảo mật chỉ vào system prompt.
- Phải **tự append** message `assistant` từ turn trước vào history — model không tự nhớ (xem phần 3).
- **Prompt injection** đặc biệt nguy hiểm khi bạn đưa **nội dung không tin cậy** (email, web, tài liệu user upload) vào context: chúng có thể chứa lệnh ẩn. Hãy phân tách rõ "đây là dữ liệu, không phải lệnh".

> ⚠️ Bẫy: Khi nhét tài liệu RAG hoặc input bên ngoài vào prompt, coi nó là **dữ liệu không tin cậy**. Bao bọc rõ ràng và không cho phép nó ghi đè system instruction.

---

## 9. Streaming

Vì model sinh **từng token một** (phần 2), bạn có 2 lựa chọn nhận output:

- **Non-streaming**: chờ sinh xong toàn bộ → trả về một lần. Đơn giản, nhưng **người dùng nhìn màn hình trống** vài giây tới chục giây.
- **Streaming** (SSE): nhận **từng token/chunk ngay khi sinh ra**. Người dùng thấy chữ chạy ra như ChatGPT → **cảm giác nhanh hơn nhiều** dù tổng thời gian không đổi.

```python
# Streaming: cải thiện perceived latency
stream = client.generate(messages, stream=True)
for chunk in stream:
    print(chunk.delta, end="", flush=True)   # đẩy ra UI ngay lập tức
```

Lưu ý vận hành:

- **TTFT (time to first token)** là chỉ số trải nghiệm quan trọng — đo riêng với tổng thời gian.
- Streaming làm **xử lý lỗi và parse JSON khó hơn**: JSON chỉ valid khi nhận đủ. Với structured output, hoặc tắt streaming, hoặc parse từng phần cẩn thận.
- Cần xử lý **client disconnect** giữa chừng (vẫn bị tính token đã sinh).

> 💡 Ghi nhớ: Streaming **không làm model nhanh hơn**, chỉ làm **người dùng cảm thấy** nhanh hơn vì thấy phản hồi ngay. Hầu như mọi UI chat nên bật streaming.

---

## Liên hệ sang AWS

Mọi khái niệm trên ánh xạ trực tiếp sang stack AI của AWS:

- **Amazon Bedrock**: API quản lý để gọi nhiều foundation model (Anthropic Claude, Amazon Nova/Titan, Meta Llama, Mistral...) qua **một API thống nhất**. Có đủ `temperature`/`top_p`, message roles, **streaming** (`InvokeModelWithResponseStream`), và **token-based pricing** đúng như đã học. Đây là nơi bạn áp dụng phần 5, 7, 8, 9.
- **Amazon Titan Embeddings / Cohere Embed trên Bedrock**: sinh **embedding** (phần 4) cho RAG.
- **Amazon OpenSearch Service (k-NN / vector engine)** hoặc **Aurora pgvector**: làm **vector database** lưu và truy vấn embedding cho semantic search.
- **Knowledge Bases for Amazon Bedrock**: dịch vụ **RAG được quản lý** sẵn — tự chunk, embed, lưu vector, và lắp context vào prompt → giảm hallucination (phần 6) mà không phải tự xây pipeline.
- **Bedrock Guardrails**: lọc nội dung, chặn chủ đề, giảm rủi ro **prompt injection** và hallucination (phần 6, 8).
- **Amazon Q Developer / Q Business**: trợ lý AI dựng sẵn (coding, hỏi đáp dữ liệu doanh nghiệp) — dùng khi không muốn tự ráp LLM + RAG.
- **Amazon SageMaker**: khi cần **fine-tune**, host model riêng, hoặc chạy embedding/eval ở quy mô lớn. Nặng đô hơn Bedrock; chọn khi Bedrock managed không đủ linh hoạt.

> 💡 Ghi nhớ: Trên AWS, lộ trình thực dụng nhất cho kỹ sư là **Bedrock + Knowledge Bases (RAG) + OpenSearch vector + Guardrails**. Cùng một mental model token / context / embedding / temperature / streaming mà bạn vừa học, chỉ khác tên API.
