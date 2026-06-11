# RAG: Retrieval-Augmented Generation

LLM rất giỏi ngôn ngữ nhưng nó chỉ "biết" những gì có trong training data — và bị đóng băng tại thời điểm cut-off. Nó không biết tài liệu nội bộ công ty bạn, không biết ticket khách hàng tạo sáng nay, không biết giá sản phẩm cập nhật tuần trước. Khi bạn hỏi những thứ đó, model sẽ **bịa ra một câu trả lời nghe rất thuyết phục** (hallucination).

**RAG** là pattern phổ biến nhất 2025 để giải quyết việc này: trước khi gọi LLM, ta **đi tìm (retrieve)** đoạn dữ liệu liên quan từ kho riêng, **nhét (augment)** vào prompt làm bối cảnh, rồi mới để model **sinh (generate)** câu trả lời dựa trên đó.

> 💡 Ghi nhớ: RAG không "dạy" model kiến thức mới. Nó chỉ đưa đúng tài liệu vào context window ngay lúc hỏi. Model vẫn là model cũ — chỉ là nó đang đọc tài liệu bạn đưa.

---

## Vì sao cần RAG?

Ba lý do thực dụng:

- **Grounding (neo vào sự thật)**: câu trả lời được "neo" vào tài liệu cụ thể bạn cung cấp, kèm trích dẫn nguồn. Người dùng kiểm chứng được.
- **Dữ liệu riêng & cập nhật**: docs nội bộ, wiki, codebase, ticket... Thay đổi tài liệu là cập nhật được câu trả lời ngay, không cần train lại.
- **Giảm hallucination**: khi model có sẵn thông tin đúng trong context, xác suất nó bịa giảm mạnh. Bạn còn có thể ra lệnh "chỉ trả lời dựa trên context, nếu không có thì nói không biết".

So sánh nhanh các cách đưa kiến thức riêng vào:

| Cách | Cập nhật dữ liệu | Chi phí | Trích dẫn nguồn | Phù hợp khi |
|---|---|---|---|---|
| Nhồi hết vào prompt | Tức thì | Tốn token, giới hạn context | Không | Tài liệu rất nhỏ |
| **RAG** | Tức thì (cập nhật index) | Vừa | Có | Kho lớn, hay đổi |
| Fine-tune | Phải train lại | Cao | Không | Đổi *hành vi/giọng* model |

---

## Pipeline RAG end-to-end

Có hai giai đoạn: **Indexing (offline)** làm trước, và **Query (online)** chạy mỗi lần user hỏi.

```
INDEXING (chạy 1 lần / khi tài liệu đổi):
  Docs ──► Chunking ──► Embedding ──► Vector DB (lưu vector + text + metadata)

QUERY (mỗi request):
  Câu hỏi ──► Embedding ──► Similarity search (top-k)
          ──► Re-rank ──► Inject context vào prompt ──► LLM generate ──► Trả lời + nguồn
```

Đi qua từng bước.

### 1. Chunking — cắt tài liệu thành mảnh

Bạn không thể (và không nên) nhét cả file 50 trang vào một vector. Ta cắt tài liệu thành các **chunk** nhỏ, mỗi chunk là một đơn vị tìm kiếm.

```python
def chunk_text(text, chunk_size=800, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap   # lùi lại để chunk sau chồng lấn chunk trước
    return chunks
```

Cắt thô theo ký tự như trên chỉ để minh hoạ. Production nên cắt **theo cấu trúc ngữ nghĩa**: theo đoạn văn, heading Markdown, hoặc câu — để không cắt ngang một ý.

### 2. Embedding — biến text thành vector

**Embedding** là một mảng số (ví dụ 1024 chiều) biểu diễn *ý nghĩa* của đoạn text. Hai đoạn nói cùng một ý sẽ có vector gần nhau trong không gian, dù dùng từ khác.

```python
# Gọi embedding API (dùng cùng model cho cả index và query!)
resp = embeddings.create(model="embed-model", input=chunk)
vector = resp.data[0].embedding   # ví dụ [0.013, -0.221, ...] dài 1024
```

> ⚠️ Bẫy: phải dùng **đúng cùng một embedding model** cho lúc index và lúc query. Đổi model là phải re-embed lại toàn bộ kho, nếu không vector query và vector trong DB nằm ở "hai không gian khác nhau" và similarity vô nghĩa.

### 3. Vector DB — lưu và tìm theo độ giống

Vector DB lưu mỗi chunk gồm: `vector`, `text` gốc, và `metadata` (nguồn, ngày, tác giả, quyền truy cập...).

```python
db.upsert(
    id="doc42-chunk3",
    vector=vector,
    text=chunk,
    metadata={"source": "handbook.pdf", "page": 12, "team": "billing"},
)
```

### 4. Similarity search — lấy top-k

Khi user hỏi, ta embed câu hỏi rồi tìm các chunk có vector gần nhất (thường dùng **cosine similarity**). Lấy `k` chunk gần nhất (top-k).

```python
q_vec = embed(user_question)
hits = db.query(vector=q_vec, top_k=20,
                filter={"team": user.team})   # metadata filter: chỉ tài liệu user được xem
```

> 💡 Ghi nhớ: `metadata filter` cực kỳ quan trọng cho bảo mật. Đừng để user A hỏi rồi nhận về chunk thuộc tài liệu mật của team khác. Lọc quyền **trước hoặc trong** lúc retrieve.

### 5. Re-rank — tinh lọc lại

Similarity search nhanh nhưng "thô": top-20 lấy về có thể có vài chunk không thực sự liên quan. **Re-ranker** (một cross-encoder model) đọc *cặp (câu hỏi, chunk)* và chấm điểm liên quan chính xác hơn nhiều, rồi ta giữ lại top-5.

```python
ranked = reranker.rank(query=user_question, documents=hits)
top_chunks = ranked[:5]   # từ 20 → lọc còn 5 chunk chất lượng nhất
```

Pattern phổ biến: **retrieve rộng (k=20–50) rồi re-rank hẹp (5)**. Nó cải thiện chất lượng đáng kể với chi phí thấp.

### 6. Inject context + generate

Ghép các chunk vào prompt, kèm chỉ thị grounding, rồi gọi LLM.

```python
context = "\n\n".join(f"[{c.metadata['source']}] {c.text}" for c in top_chunks)

prompt = f"""Chỉ trả lời dựa trên CONTEXT dưới đây.
Nếu context không đủ thông tin, hãy nói "Tôi không tìm thấy thông tin này".
Luôn trích dẫn nguồn dạng [source].

CONTEXT:
{context}

CÂU HỎI: {user_question}
"""
answer = llm.generate(prompt)
```

Câu chỉ thị "nếu không có thì nói không biết" là tuyến phòng thủ hallucination quan trọng nhất — đừng quên nó.

---

## Trade-off: chunk size & overlap

Đây là tham số bạn sẽ tinh chỉnh nhiều nhất.

| | Chunk nhỏ (200–400 token) | Chunk lớn (800–1500 token) |
|---|---|---|
| Độ chính xác match | Cao, đúng trọng tâm | Loãng, lẫn nhiều nội dung |
| Ngữ cảnh trong chunk | Thiếu, dễ cụt ý | Đầy đủ |
| Số chunk / token tốn | Nhiều chunk, tốn DB | Ít chunk |
| Rủi ro | Cắt mất ngữ cảnh cần thiết | Nhét rác vào context, "lẫn" tín hiệu |

**Overlap** (chunk sau chồng lấn chunk trước ~10–20%) giúp tránh việc một câu/ý quan trọng bị cắt đúng ranh giới hai chunk và mất hẳn.

> 💡 Ghi nhớ: Không có con số vàng. Điểm khởi đầu hợp lý: **chunk 500–800 token, overlap 10–15%**, rồi đo bằng eval (xem dưới) và điều chỉnh theo dữ liệu thật của bạn.

> ⚠️ Bẫy: chunk quá lớn để "cho chắc" thường phản tác dụng. Context dài làm model bị nhiễu (lost-in-the-middle: model hay bỏ sót thông tin ở giữa context dài) và tốn tiền token.

---

## Hybrid search — đừng chỉ dùng vector

Vector search (semantic) giỏi hiểu *ý nghĩa* nhưng **dở với từ khoá chính xác**: mã sản phẩm `SKU-7741`, tên hàm `getUserToken`, số hợp đồng. Những thứ này keyword search kiểu cũ (BM25 / full-text) lại làm rất tốt.

**Hybrid search** = chạy cả hai rồi trộn điểm:

```python
sem_hits = vector_search(q_vec, top_k=30)       # hiểu ngữ nghĩa
kw_hits  = keyword_search(text=query, top_k=30) # khớp từ khoá chính xác
merged   = reciprocal_rank_fusion(sem_hits, kw_hits)  # RRF trộn 2 bảng xếp hạng
```

RRF (Reciprocal Rank Fusion) là cách trộn đơn giản và mạnh: ưu tiên item xuất hiện hạng cao ở cả hai danh sách. Trong thực tế hybrid + re-rank gần như luôn thắng vector-only.

---

## Đánh giá RAG (eval)

"Tôi chỉnh chunk size rồi, tốt hơn chưa?" — nếu không đo thì bạn chỉ đoán. RAG fail ở **hai khâu tách biệt**, phải đo riêng:

- **Retrieval**: lấy về có **đúng** chunk chứa câu trả lời không? (context relevance / recall)
- **Generation**: model có trả lời **trung thành** với context, không bịa thêm không? (**faithfulness**)
- **Answer relevance**: câu trả lời có thực sự trúng câu hỏi không?

Có thể fail độc lập: retrieval đúng nhưng model vẫn bịa (faithfulness kém); hoặc model rất trung thành nhưng retrieval lấy nhầm tài liệu (context relevance kém). Biết khâu nào hỏng mới sửa đúng chỗ.

```python
# Mẫu eval bằng "LLM-as-judge": dùng một LLM chấm câu trả lời
judge_prompt = f"""CONTEXT: {context}
CÂU HỎI: {question}
TRẢ LỜI: {answer}

Mọi khẳng định trong TRẢ LỜI có được CONTEXT hậu thuẫn không?
Cho điểm faithfulness 1-5 và liệt kê câu nào bịa (nếu có)."""
score = judge_llm.generate(judge_prompt)
```

Quy trình thực tế: dựng một **golden set** vài chục cặp (câu hỏi → câu trả lời/chunk đúng), chạy eval mỗi lần đổi tham số. Framework hay dùng: Ragas, DeepEval.

> ⚠️ Bẫy: đừng đánh giá RAG bằng cảm tính trên 3-4 câu hỏi tự nghĩ. Bạn sẽ tối ưu cho 3 câu đó mà hỏng phần còn lại. Có golden set + số liệu mới đi xa được.

---

## Khi nào RAG, khi nào fine-tune?

Câu hỏi sai là "RAG hay fine-tune". Chúng giải quyết việc **khác nhau** và thường **kết hợp**.

| Bạn cần... | Dùng |
|---|---|
| Model biết **kiến thức/dữ liệu** riêng, hay thay đổi | **RAG** |
| Câu trả lời cần **trích dẫn nguồn**, kiểm chứng được | **RAG** |
| Đổi **giọng văn, format, hành vi** ổn định | Fine-tune |
| Model học một **kỹ năng/định dạng** khó tả bằng prompt | Fine-tune |
| Kiến thức **ổn định**, không đổi, latency phải thấp tối đa | Fine-tune (hoặc cả hai) |

> 💡 Ghi nhớ: Mặc định **bắt đầu bằng RAG**. Nó rẻ, cập nhật tức thì, dễ debug và có nguồn. Chỉ fine-tune khi bạn cần thay đổi *hành vi* mà prompt + RAG không làm được. Nhiều hệ thống tốt nhất = fine-tune giọng/format **cộng** RAG cho kiến thức.

---

## Những lỗi RAG thực tế hay gặp

- **"Garbage in, garbage out"**: tài liệu nguồn lộn xộn (PDF trích xuất sai, bảng vỡ) thì RAG cũng tệ. Phần lớn công sức RAG nằm ở **làm sạch & cắt dữ liệu**, không phải ở model.
- **Embedding lệch version**: re-embed query bằng model mới nhưng DB còn vector model cũ → kết quả rác. Re-index toàn bộ khi đổi model.
- **Top-k quá lớn**: nhồi 30 chunk vào context vừa tốn tiền vừa làm model nhiễu. Retrieve rộng nhưng **re-rank rồi mới nhét 3–6 chunk**.
- **Bỏ qua quyền truy cập**: retrieve không lọc metadata → rò rỉ dữ liệu giữa các user/team.
- **Không có chỉ thị grounding**: quên câu "chỉ trả lời theo context" → model lại tự bịa như thường.
- **Không đo gì cả**: chỉnh tham số theo cảm giác. Phải có eval golden set.

---

## Liên hệ sang AWS

Trên AWS bạn có thể tự ráp pipeline hoặc dùng dịch vụ quản lý:

- **Amazon Bedrock Knowledge Bases**: dịch vụ RAG quản lý đầu-cuối. Trỏ vào data trong S3, Bedrock tự lo **chunking, embedding, lưu vector và retrieval**. Bạn chỉ gọi API `RetrieveAndGenerate` là có câu trả lời kèm trích dẫn nguồn. Nhanh nhất để có RAG production.
- **Amazon Bedrock**: nơi gọi các foundation model (Claude của Anthropic, Titan, Llama...) cho bước **generate**, và các **Titan / Cohere embedding model** cho bước embed.
- **Amazon OpenSearch Service (vector engine / k-NN)**: vector DB phổ biến trên AWS, hỗ trợ **hybrid search** (vector + BM25 keyword) sẵn — đúng pattern hybrid ở trên. Cũng là một backend vector cho Bedrock Knowledge Bases. Lựa chọn khác: **Aurora/RDS PostgreSQL với pgvector**.
- **Amazon Q Business**: trợ lý RAG "đóng hộp" cấp doanh nghiệp — kết nối thẳng vào S3, SharePoint, Confluence, Slack... có sẵn kiểm soát quyền truy cập theo người dùng. Ít code nhất, hợp khi cần chatbot trên kho tài liệu nội bộ.
- **Amazon SageMaker**: dùng khi bạn cần **fine-tune** model hoặc host embedding/re-rank model riêng — tức nhánh "fine-tune" trong bảng so sánh ở trên.

> 💡 Ghi nhớ: lộ trình thực dụng trên AWS — bắt đầu với **Bedrock Knowledge Bases** (hoặc **Amazon Q Business** nếu cần ít code), dùng **OpenSearch** làm vector store khi cần kiểm soát sâu hybrid search và re-rank, chỉ chạm tới **SageMaker** khi bài toán buộc phải fine-tune.
