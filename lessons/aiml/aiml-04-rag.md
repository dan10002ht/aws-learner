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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline RAG end-to-end: pha Indexing offline và pha Query online</title>
  <desc>Hai luồng trái sang phải. Pha Indexing offline: Tài liệu, Chunking, Embedding, Vector DB. Pha Query online: Câu hỏi, Embedding, Similarity search top-k, Re-rank, Inject context, LLM generate, Trả lời kèm nguồn. Vector DB nối xuống bước Similarity search của pha online.</desc>
  <defs>
    <marker id="rag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="8" y="34" width="704" height="132" rx="12" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="24" y="56" font-size="13" font-weight="700" fill="currentColor">INDEXING — offline</text>
  <text x="24" y="72" font-size="10.5" fill="currentColor" opacity="0.6">chạy 1 lần / khi tài liệu thay đổi</text>
  <g>
    <rect x="24" y="92" width="120" height="52" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="84" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Tài liệu</text>
    <text x="84" y="132" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">PDF · wiki · code</text>
  </g>
  <g>
    <rect x="194" y="92" width="120" height="52" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="254" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Chunking</text>
    <text x="254" y="132" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">cắt mảnh nhỏ</text>
  </g>
  <g>
    <rect x="364" y="92" width="120" height="52" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="424" y="116" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Embedding</text>
    <text x="424" y="132" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">text → vector</text>
  </g>
  <g>
    <rect x="534" y="92" width="154" height="52" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="611" y="114" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Vector DB</text>
    <text x="611" y="131" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">vector + text + metadata</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#rag-arrow)">
    <line x1="144" y1="118" x2="190" y2="118"/>
    <line x1="314" y1="118" x2="360" y2="118"/>
    <line x1="484" y1="118" x2="530" y2="118"/>
  </g>
  <rect x="8" y="190" width="704" height="232" rx="12" fill="#f59e0b" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="24" y="212" font-size="13" font-weight="700" fill="currentColor">QUERY — online</text>
  <text x="24" y="228" font-size="10.5" fill="currentColor" opacity="0.6">chạy mỗi lần user hỏi</text>
  <g>
    <rect x="24" y="248" width="120" height="48" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="84" y="277" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Câu hỏi</text>
  </g>
  <g>
    <rect x="180" y="248" width="120" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="240" y="277" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Embedding</text>
  </g>
  <g>
    <rect x="336" y="240" width="150" height="64" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="411" y="266" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Similarity search</text>
    <text x="411" y="284" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">lấy top-k (k≈20–50)</text>
  </g>
  <g>
    <rect x="522" y="248" width="166" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="605" y="270" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Re-rank</text>
    <text x="605" y="286" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">lọc còn top 3–6</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#rag-arrow)">
    <line x1="144" y1="272" x2="176" y2="272"/>
    <line x1="300" y1="272" x2="332" y2="272"/>
    <line x1="486" y1="272" x2="518" y2="272"/>
  </g>
  <g>
    <rect x="378" y="344" width="166" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="461" y="368" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Inject context</text>
    <text x="461" y="385" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">ghép chunk vào prompt</text>
  </g>
  <g>
    <rect x="192" y="344" width="150" height="56" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="267" y="368" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">LLM generate</text>
  </g>
  <g>
    <rect x="24" y="344" width="130" height="56" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="89" y="368" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Trả lời</text>
    <text x="89" y="385" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">+ trích dẫn nguồn</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#rag-arrow)">
    <path d="M605 296 V322 H461 V340"/>
    <line x1="378" y1="372" x2="346" y2="372"/>
    <line x1="192" y1="372" x2="158" y2="372"/>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" stroke-dasharray="5 4" fill="none" marker-end="url(#rag-arrow)">
    <path d="M611 144 V200 H411 V236"/>
  </g>
  <text x="430" y="194" font-size="9.5" fill="currentColor" opacity="0.7">DB đã dựng offline phục vụ truy vấn online</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hybrid search: hai nhánh vector và keyword chạy song song, RRF trộn ra danh sách cuối</title>
  <desc>Từ câu hỏi tách ra hai nhánh chạy song song. Nhánh trên: Vector search hiểu ngữ nghĩa cho ra bảng xếp hạng A. Nhánh dưới: Keyword BM25 khớp từ khoá chính xác cho ra bảng xếp hạng B. Cả hai đổ vào RRF Reciprocal Rank Fusion, trộn thành một danh sách kết quả cuối.</desc>
  <defs>
    <marker id="hyb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="16" y="116" width="118" height="56" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="75" y="142" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Câu hỏi</text>
    <text x="75" y="159" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">query của user</text>
  </g>
  <g>
    <rect x="214" y="32" width="200" height="64" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="314" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Vector search</text>
    <text x="314" y="76" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">semantic — hiểu ngữ nghĩa</text>
    <text x="314" y="89" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.55">"thanh toán" ≈ "billing"</text>
  </g>
  <g>
    <rect x="214" y="192" width="200" height="64" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="314" y="218" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Keyword / BM25</text>
    <text x="314" y="236" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">full-text — khớp từ khoá</text>
    <text x="314" y="249" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.55">SKU-7741 · getUserToken</text>
  </g>
  <g>
    <rect x="446" y="44" width="92" height="40" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="492" y="60" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">Xếp hạng A</text>
    <text x="492" y="74" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">top-k ngữ nghĩa</text>
  </g>
  <g>
    <rect x="446" y="204" width="92" height="40" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="492" y="220" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">Xếp hạng B</text>
    <text x="492" y="234" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">top-k từ khoá</text>
  </g>
  <g>
    <rect x="566" y="104" width="138" height="80" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="635" y="132" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">RRF</text>
    <text x="635" y="149" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Reciprocal Rank</text>
    <text x="635" y="161" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Fusion</text>
    <text x="635" y="176" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.55">trộn → danh sách cuối</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#hyb-arrow)">
    <path d="M134 134 C175 124 175 70 210 66"/>
    <path d="M134 154 C175 164 175 222 210 222"/>
    <line x1="414" y1="64" x2="442" y2="64"/>
    <line x1="414" y1="224" x2="442" y2="224"/>
    <path d="M538 64 C556 64 558 120 562 132"/>
    <path d="M538 224 C556 224 558 168 562 156"/>
  </g>
  <text x="160" y="24" font-size="10" fill="currentColor" opacity="0.7">chạy song song →</text>
</svg>

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
