# Đưa AI vào Production

Prototype LLM thì 30 phút là chạy. Đưa nó ra production phục vụ người dùng thật mới là phần khó: nó **không deterministic**, **đắt**, **chậm**, và đôi khi **nói bậy** hoặc làm lộ dữ liệu. Bài này là checklist của một kỹ sư đưa feature AI từ demo lên production: cách **đo chất lượng** (eval), cách **chặn đầu vào/đầu ra** (guardrails), cách **giảm tiền và độ trễ**, cách **quan sát** hệ thống (observability), và cách **fail an toàn**.

> 💡 Ghi nhớ: Một feature LLM production = `model call` + 4 lớp bọc quanh nó: **eval** (biết nó tốt hay tệ), **guardrails** (chặn input/output xấu), **fallback** (khi nó hỏng), **observability** (nhìn thấy nó đang làm gì). Thiếu lớp nào là bạn đang bay không có đồng hồ.

---

## 1. Vì sao production LLM khác với code thường

Với code thường: cùng input → cùng output, test pass là yên tâm. Với LLM:

- **Không deterministic**: cùng prompt, hai lần gọi ra hai câu trả lời khác nhau (kể cả `temperature=0` vẫn lệch nhẹ).
- **Không có "đúng/sai" tuyệt đối**: output là văn bản tự do, không so sánh `===` được.
- **Hồi quy âm thầm (silent regression)**: provider cập nhật model, hoặc bạn sửa một câu prompt → 5% câu trả lời tệ đi mà không ai báo lỗi.
- **Đắt và chậm theo token**: mỗi request tốn tiền và vài giây, scale lên là tốn thật.

Hệ quả: bạn không thể chỉ viết unit test `assertEquals`. Bạn cần một bộ máy đo chất lượng riêng — đó là **evaluation**.

---

## 2. Evaluation: biết feature của bạn tốt hay tệ

### 2.1 Golden set (bộ test vàng)

Trước khi tối ưu bất cứ thứ gì, hãy có một tập **golden set**: ~50–200 ví dụ `(input, output mong đợi / tiêu chí đạt)` đại diện cho các tình huống thật, bao gồm cả **edge case** và **câu hỏi cố tình gài bẫy**.

```jsonc
// golden_set.jsonl — mỗi dòng một test case
{ "id": "refund-01", "input": "Tôi mua hàng 2 tháng trước, đòi hoàn tiền được không?",
  "expect": { "must_contain": ["chính sách 30 ngày"], "must_not_contain": ["chắc chắn được"] } }
{ "id": "offtopic-01", "input": "Viết hộ tôi bài thơ tình",
  "expect": { "should_refuse": true } }
```

### 2.2 Offline eval (chạy trước khi deploy)

Offline eval = chạy toàn bộ golden set qua phiên bản mới của prompt/model, chấm điểm, **so với baseline**. Đây là "CI cho prompt".

```python
def run_offline_eval(golden_set, app_fn):
    results = []
    for case in golden_set:
        output = app_fn(case["input"])          # gọi feature của bạn
        score  = grade(output, case["expect"])  # chấm theo tiêu chí
        results.append({"id": case["id"], "score": score, "output": output})
    pass_rate = sum(r["score"] for r in results) / len(results)
    return pass_rate, results

new_rate, _ = run_offline_eval(golden, app_v2)
if new_rate < baseline_rate - 0.02:            # tụt > 2% là chặn
    raise SystemExit("Regression! Không deploy.")
```

Các kiểu chấm điểm (grader), từ rẻ đến đắt:

| Loại grader | Cách hoạt động | Hợp với | Chi phí |
|---|---|---|---|
| **Exact / regex / contains** | So khớp chuỗi, keyword | Output có cấu trúc, JSON, classify | Rẻ nhất |
| **Schema / JSON valid** | Parse được không, đủ field không | Tool output, extraction | Rẻ |
| **Embedding similarity** | So vector ngữ nghĩa với đáp án mẫu | Tóm tắt, paraphrase | Trung bình |
| **LLM-as-judge** | Một LLM chấm điểm output | Câu trả lời tự do, "có hữu ích không" | Đắt |
| **Human review** | Người chấm | Vàng chuẩn, định kỳ lấy mẫu | Đắt nhất |

### 2.3 LLM-as-judge

Khi không có đáp án cố định ("câu trả lời này có lịch sự và đúng chính sách không?"), dùng một LLM khác làm giám khảo.

```python
JUDGE_PROMPT = """Bạn là giám khảo đánh giá câu trả lời chăm sóc khách hàng.
Câu hỏi: {question}
Câu trả lời: {answer}
Chấm theo 3 tiêu chí, mỗi tiêu chí 0 hoặc 1:
- correct: đúng chính sách công ty (context: {policy})
- grounded: KHÔNG bịa thông tin ngoài context
- tone: lịch sự, chuyên nghiệp
Trả về JSON: {{"correct":0/1,"grounded":0/1,"tone":0/1,"reason":"..."}}"""
```

> ⚠️ Bẫy LLM-as-judge: (1) **Thiên vị độ dài** — judge hay cho điểm cao câu trả lời dài hơn dù không tốt hơn. (2) **Thiên vị vị trí** khi so sánh A/B — đảo thứ tự rồi chấm lại. (3) **Dùng cùng model làm cả app lẫn judge** → nó tự khen mình; nên dùng model khác hoặc model mạnh hơn để chấm. (4) Luôn **calibrate judge với ~30 nhãn người thật** trước khi tin nó.

### 2.4 Online eval (trên production thật)

Offline chỉ là phòng thí nghiệm. Trên production cần đo: tỉ lệ user bấm 👍/👎, tỉ lệ thoát giữa chừng, tỉ lệ leo thang sang người thật, và **chạy LLM-as-judge trên một mẫu nhỏ traffic thật** mỗi ngày để bắt regression sớm.

> 💡 Ghi nhớ: Eval-driven development — sửa prompt mà không có golden set thì bạn đang đoán mò. Quy trình: sửa → chạy offline eval → so baseline → deploy → online eval mẫu. Coi golden set như tài sản, mỗi lần gặp bug production thật thì **thêm case đó vào golden set** (giống regression test).

---

## 3. Guardrails: chặn cái xấu vào và cái xấu ra

Guardrails là lớp lọc **trước** và **sau** lời gọi model. Sơ đồ luồng:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng guardrail đầu vào và đầu ra quanh lời gọi model</title>
  <desc>User input đi qua INPUT guardrail (kiểm PII, jailbreak, off-topic) tới LLM/RAG/Agent rồi qua OUTPUT guardrail (kiểm PII rò rỉ, toxic, hallucination) trả về User; mỗi guardrail có nhánh chặn rẽ ra câu trả lời an toàn.</desc>
  <defs>
    <marker id="ga" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Guardrails: chặn cái xấu vào và cái xấu ra</text>

  <!-- hàng chính -->
  <g>
    <rect x="16" y="56" width="120" height="52" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="80" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">User input</text>
    <text x="76" y="97" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">câu hỏi vào</text>

    <rect x="172" y="50" width="148" height="64" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="246" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">INPUT guardrail</text>
    <text x="246" y="89" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">PII · jailbreak</text>
    <text x="246" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">off-topic · quá dài</text>

    <rect x="356" y="50" width="148" height="64" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="430" y="78" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">LLM / RAG</text>
    <text x="430" y="95" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Agent</text>

    <rect x="540" y="50" width="164" height="64" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="622" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">OUTPUT guardrail</text>
    <text x="622" y="89" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">PII rò rỉ · toxic</text>
    <text x="622" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">bịa · lộ system prompt</text>
  </g>

  <!-- mũi tên hàng chính -->
  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ga)">
    <path d="M136 82 H170"/>
    <path d="M320 82 H354"/>
    <path d="M504 82 H538"/>
  </g>

  <!-- User cuối -->
  <rect x="296" y="160" width="128" height="46" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="188" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">User (trả lời)</text>
  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#ga)">
    <path d="M622 114 V140 H360 V158"/>
  </g>

  <!-- nhánh chặn -->
  <rect x="160" y="244" width="400" height="52" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="268" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Trả lời an toàn (từ chối / lọc lại / câu thay thế)</text>
  <text x="360" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">không gọi model hoặc không trả output gốc</text>

  <g stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" fill="none" marker-end="url(#ga)">
    <path d="M246 114 V236"/>
    <path d="M622 114 V128 H660 V236 H560"/>
  </g>
  <text x="252" y="160" font-size="10.5" font-weight="700" fill="currentColor">chặn</text>
  <text x="666" y="160" font-size="10.5" font-weight="700" fill="currentColor">chặn</text>
</svg>

### 3.1 Input filtering

- **PII detection & redaction**: phát hiện và che số CMND/CCCD, thẻ tín dụng, email, SĐT *trước khi* gửi lên model (để không log/gửi dữ liệu nhạy cảm ra ngoài).
- **Jailbreak / prompt injection**: chặn các mẫu "bỏ qua hướng dẫn trước đó", "đóng vai DAN", hoặc text độc hại nhúng trong tài liệu RAG. Dùng classifier chuyên dụng hoặc một LLM nhỏ làm bộ lọc.
- **Off-topic / quá dài**: chặn câu hỏi ngoài phạm vi, hoặc input vượt token để tránh tốn tiền vô ích.

```python
def input_guard(text):
    text = redact_pii(text)                       # che PII
    if jailbreak_classifier(text) > 0.8:
        return BLOCK("Yêu cầu không hợp lệ.")
    if topic_classifier(text) != "in_scope":
        return BLOCK("Tôi chỉ hỗ trợ về sản phẩm X.")
    return ALLOW(text)
```

### 3.2 Output filtering

- **PII / secret leak**: chặn model vô tình nhả ra dữ liệu nhạy cảm hoặc lộ system prompt.
- **Toxicity / an toàn**: lọc nội dung độc hại, bạo lực, gợi ý nguy hiểm.
- **Grounding / hallucination check**: với RAG, kiểm tra câu trả lời có thực sự dựa trên context đã truy xuất không — nếu không có nguồn thì không khẳng định.
- **Format/schema**: nếu cần JSON, validate; sai thì retry hoặc reject.

> ⚠️ Bẫy: Đừng tự viết regex chặn jailbreak rồi nghĩ đã xong — attacker sáng tạo hơn regex của bạn. Dùng **lớp guardrail chuyên dụng** (managed như Bedrock Guardrails, hoặc thư viện chuyên trị), và quan trọng nhất: **không bao giờ tin output của LLM một cách mù quáng**. Output đi vào shell/SQL/eval là lỗ hổng injection kinh điển. Treat LLM output như input từ người lạ.

---

## 4. Cost optimization: cắt tiền mà không cắt chất lượng

Token là tiền. Bốn đòn bẩy chính:

### 4.1 Model routing (định tuyến model)

Không phải request nào cũng cần model to nhất. Dùng model **nhỏ/rẻ/nhanh** cho việc dễ (phân loại, trích xuất, trả lời FAQ), chỉ leo thang lên model **lớn** cho việc khó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" role="img" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Model routing: classifier nhỏ rẽ query sang model nhỏ hoặc model lớn</title>
  <desc>Query đi vào một classifier nhỏ; nhánh "đơn giản" đi tới model nhỏ rẻ và nhanh, nhánh "phức tạp" đi tới model lớn đắt nhưng giỏi.</desc>
  <defs>
    <marker id="mr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Model routing</text>

  <!-- query -->
  <rect x="240" y="44" width="120" height="42" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="300" y="70" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">query</text>

  <!-- classifier -->
  <rect x="222" y="116" width="156" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="300" y="138" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">classifier nhỏ</text>
  <text x="300" y="154" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">phân loại độ khó</text>

  <!-- model nhỏ -->
  <rect x="56" y="218" width="180" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="146" y="242" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">model nhỏ</text>
  <text x="146" y="259" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">rẻ, nhanh</text>

  <!-- model lớn -->
  <rect x="364" y="218" width="180" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="454" y="242" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">model lớn</text>
  <text x="454" y="259" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">đắt, giỏi</text>

  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#mr)">
    <path d="M300 86 V114"/>
    <path d="M260 164 C220 188 180 192 146 216"/>
    <path d="M340 164 C380 188 420 192 454 216"/>
  </g>
  <text x="158" y="196" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">"đơn giản"</text>
  <text x="442" y="196" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">"phức tạp"</text>
</svg>

### 4.2 Caching

- **Exact cache**: câu hỏi trùng y hệt → trả lại câu trả lời cũ (key = hash của prompt). Hợp với FAQ.
- **Semantic cache**: câu hỏi *gần giống* về ngữ nghĩa (so embedding) → tái dùng. Coi chừng cache nhầm khi hai câu giống chữ nhưng khác ý.
- **Prompt caching (provider-side)**: nhiều provider cho **cache phần prefix dài lặp lại** (system prompt, tài liệu, few-shot) để lần sau chỉ tính tiền phần mới — giảm mạnh cả chi phí lẫn độ trễ cho các prompt có context cố định lớn.

```python
def answer(q):
    if (hit := exact_cache.get(hash(q))):      return hit
    if (hit := semantic_cache.search(q, 0.97)):return hit  # ngưỡng cao!
    out = call_llm(q)
    exact_cache.set(hash(q), out); semantic_cache.add(q, out)
    return out
```

### 4.3 Prompt nhỏ (token discipline)

Prompt dài = đắt + chậm + dễ lạc hướng. Cắt few-shot thừa, nén system prompt, với RAG thì chỉ nhét **top-k chunk thật sự liên quan** thay vì nhồi cả tài liệu. Token đầu vào và đầu ra đều tính tiền — `max_tokens` hợp lý cũng là tiết kiệm.

### 4.4 Batch & async cho việc không real-time

Việc nền (tóm tắt hàng loạt, gán nhãn dữ liệu) dùng **Batch API** thường rẻ hơn ~50% so với gọi đồng bộ.

> 💡 Ghi nhớ thứ tự tối ưu: **(1) routing** → đừng dùng dao mổ trâu giết gà. **(2) caching** → đừng trả tiền hai lần cho cùng câu hỏi. **(3) prompt nhỏ** → đừng trả tiền cho token vô dụng. **(4) batch** → việc nền thì đừng gọi real-time.

---

## 5. Latency: đừng để user nhìn màn hình trắng

LLM chậm vì nó sinh **từng token một**. Hai vũ khí:

### 5.1 Streaming

Stream token ngay khi model sinh ra. **Time-to-first-token (TTFT)** mới là thứ user cảm nhận, không phải tổng thời gian. User thấy chữ chạy ngay = cảm giác nhanh dù tổng thời gian không đổi.

```python
for chunk in client.stream(prompt):      # gửi từng phần xuống client
    yield chunk.text                     # SSE / WebSocket
```

### 5.2 Async & song song

- Các bước **độc lập** (gọi nhiều tool, truy xuất nhiều nguồn) → chạy **song song**, đừng tuần tự.
- Việc không cần ngay (ghi log, gửi mail, đánh giá) → đẩy ra **hàng đợi async**, đừng chặn response.
- Đặt **timeout** cho mọi lời gọi model; treo vô hạn là kẻ thù.

| Kỹ thuật | Cải thiện | Lưu ý |
|---|---|---|
| Streaming | TTFT, cảm nhận | Cần xử lý lỗi giữa stream |
| Song song hoá | Tổng latency | Cẩn thận rate limit |
| Model nhỏ hơn | Latency + cost | Đánh đổi chất lượng |
| Prompt caching | TTFT khi prefix dài | Phụ thuộc provider |
| Speculative / draft | Throughput | Phức tạp, thường để provider lo |

---

## 6. Observability cho LLM: nhìn thấy thứ vô hình

Không quan sát được thì không vận hành được. Mỗi request cần log một **trace** đầy đủ:

```jsonc
{
  "trace_id": "req-8f3a", "user_id": "u_123",
  "model": "...-haiku", "route": "simple",
  "input_tokens": 412, "output_tokens": 88, "cost_usd": 0.0007,
  "latency_ms": 1240, "ttft_ms": 310, "cache": "miss",
  "guardrail": { "input": "pass", "output": "pass" },
  "retrieval": [{ "doc": "policy-30d", "score": 0.83 }],   // RAG
  "tool_calls": ["lookup_order"],                          // agent
  "feedback": "thumbs_up"                                  // online eval
}
```

Ba nhóm chỉ số bắt buộc theo dõi:

- **Chất lượng**: pass-rate eval, tỉ lệ 👍/👎, tỉ lệ guardrail chặn, tỉ lệ leo thang.
- **Chi phí**: token & USD theo request / user / feature; cảnh báo khi vượt ngân sách.
- **Hiệu năng**: latency p50/p95/p99, TTFT, tỉ lệ lỗi & timeout, cache hit-rate.

> ⚠️ Bẫy: **Không log prompt/response thô chứa PII** vào hệ thống log thường. Redact trước khi log, kiểm soát quyền truy cập, và đặt retention. Một sự cố data leak qua log có thể tốn hơn cả năm tiền API. Với agent, **lưu cả chuỗi reasoning + tool calls** — không có nó thì debug agent là bất khả thi.

---

## 7. An toàn & compliance

- **Data residency & privacy**: dữ liệu user gửi đi đâu, có bị dùng để train không, có nằm đúng region/khu vực pháp lý không (GDPR, nội bộ doanh nghiệp).
- **Hợp đồng & dữ liệu nhạy cảm**: y tế, tài chính, pháp lý có ràng buộc riêng; cân nhắc model chạy trong VPC riêng, không gửi dữ liệu ra ngoài.
- **Audit log**: ai hỏi gì, model trả gì, guardrail chặn gì — lưu để truy vết khi có sự cố.
- **Human-in-the-loop**: với hành động rủi ro cao (hoàn tiền, xoá dữ liệu, gửi email thay khách) → bắt buộc người duyệt.
- **Tài liệu minh bạch**: cho user biết họ đang nói chuyện với AI, và cách phản hồi/khiếu nại.

---

## 8. Fallback: fail an toàn, đừng fail to

Provider sẽ có lúc lỗi, rate-limit, hoặc chậm. Thiết kế đường lui:

```python
def robust_answer(q):
    try:
        return call_primary(q, timeout=8)          # model chính
    except (RateLimit, Timeout):
        try:
            return call_secondary(q, timeout=8)    # provider/model dự phòng
        except Exception:
            if (cached := semantic_cache.search(q, 0.9)):
                return cached                       # câu trả lời cũ gần đúng
            return "Xin lỗi, hệ thống đang bận. Bạn để lại câu hỏi, chúng tôi sẽ phản hồi sớm."
```

Nguyên tắc fallback:

- **Retry có backoff + jitter** cho lỗi tạm thời (429/503), nhưng giới hạn số lần.
- **Circuit breaker**: khi provider chính lỗi liên tục, ngắt sang dự phòng thay vì hành hạ nó.
- **Degrade duyên dáng**: thà trả câu trả lời cache/đơn giản còn hơn lỗi 500 trắng màn hình.
- **Đa provider / đa model** cho hệ thống quan trọng: tránh phụ thuộc một nhà cung cấp.

> 💡 Ghi nhớ: Câu hỏi vận hành cốt lõi — "Khi model trả lời sai/chậm/chết thì điều **tệ nhất** có thể xảy ra là gì, và mình chặn nó ở đâu?". Trả lời được câu này tức là bạn đã thiết kế guardrail + fallback đúng chỗ.

---

## Liên hệ sang AWS

Trên AWS, các lớp bọc production ở trên ánh xạ khá gọn vào dịch vụ managed:

| Nhu cầu | Dịch vụ AWS |
|---|---|
| Gọi nhiều foundation model (Anthropic, Meta, Amazon...) qua một API, có VPC riêng | **Amazon Bedrock** |
| **Guardrails** input/output: lọc PII, chặn chủ đề cấm, denied topics, chặn prompt attack, **contextual grounding check** (chống hallucination cho RAG) | **Amazon Bedrock Guardrails** — định nghĩa policy một lần, áp cho mọi model, gọi độc lập qua `ApplyGuardrail` |
| RAG managed (ingest tài liệu, chunk, embed, retrieve) | **Bedrock Knowledge Bases** |
| Agent điều phối tool/đa bước | **Bedrock Agents** |
| **Vector store** cho RAG / semantic cache | **Amazon OpenSearch Serverless** (vector engine), hoặc pgvector trên **Aurora/RDS PostgreSQL** |
| **Eval** model & RAG (LLM-as-judge dạng managed, golden dataset) | **Bedrock Model Evaluation** / RAG evaluation |
| Trợ lý hỏi đáp nội bộ doanh nghiệp (RAG + connector + quyền) gần như không-code | **Amazon Q Business** |
| Train/fine-tune/host model tuỳ biến, MLOps đầy đủ | **Amazon SageMaker** (Pipelines, Model Monitor, JumpStart) |
| **Observability**: log token/cost/latency, trace, cảnh báo ngân sách | **CloudWatch** (metrics/logs/alarms) + **AWS Budgets** + model invocation logging của Bedrock |
| Lưu prompt/response & redact PII trong pipeline | **Amazon Comprehend** (PII detection) trước khi ghi log |

Một kiến trúc production điển hình trên AWS: API Gateway → Lambda → **Bedrock Guardrails (input)** → **Knowledge Base / Agent** trên Bedrock (vector ở OpenSearch) → **Guardrails (output)** → stream qua response, đồng thời log token/cost/latency vào **CloudWatch** và chạy **Bedrock Evaluation** trên mẫu traffic. Cùng tư duy bài này — chỉ là phần hạ tầng nặng đã được AWS lo hộ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc AI production điển hình trên AWS</title>
  <desc>API Gateway tới Lambda, qua Bedrock Guardrails input, tới Knowledge Base hoặc Agent trên Bedrock có vector store OpenSearch, qua Guardrails output rồi stream về client; Lambda đồng thời log token, cost, latency ra CloudWatch.</desc>
  <defs>
    <marker id="aw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Kiến trúc production trên AWS</text>

  <!-- hàng chính -->
  <rect x="14" y="56" width="104" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="66" y="78" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">API Gateway</text>
  <text x="66" y="94" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">request vào</text>

  <rect x="142" y="56" width="104" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="194" y="86" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>

  <rect x="270" y="50" width="120" height="62" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="330" y="76" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Guardrails</text>
  <text x="330" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">input</text>

  <rect x="414" y="50" width="140" height="62" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="484" y="74" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Knowledge Base</text>
  <text x="484" y="90" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">/ Agent</text>
  <text x="484" y="105" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">trên Bedrock</text>

  <rect x="578" y="50" width="126" height="62" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="641" y="76" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Guardrails</text>
  <text x="641" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">output</text>

  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#aw)">
    <path d="M118 81 H140"/>
    <path d="M246 81 H268"/>
    <path d="M390 81 H412"/>
    <path d="M554 81 H576"/>
  </g>

  <!-- OpenSearch vector -->
  <rect x="424" y="158" width="120" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="484" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">OpenSearch</text>
  <text x="484" y="196" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">vector store</text>
  <g stroke="currentColor" stroke-width="1.4" fill="none" marker-end="url(#aw)">
    <path d="M484 112 V156"/>
  </g>

  <!-- stream về client -->
  <rect x="578" y="158" width="126" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="641" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
  <text x="641" y="196" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stream response</text>
  <g stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#aw)">
    <path d="M641 112 V156"/>
  </g>
  <text x="650" y="138" font-size="10" font-weight="700" fill="currentColor">stream</text>

  <!-- CloudWatch -->
  <rect x="118" y="270" width="200" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="218" y="294" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CloudWatch</text>
  <text x="218" y="311" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">log token · cost · latency</text>
  <g stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" fill="none" marker-end="url(#aw)">
    <path d="M194 106 V248 H218 V268"/>
  </g>
  <text x="200" y="200" font-size="10" font-weight="700" fill="currentColor">observability</text>
</svg>

> 💡 Ghi nhớ: Điểm hấp dẫn nhất của Bedrock Guardrails là **tách rời khỏi model** — bạn đổi model bên dưới, đổi provider, mà policy an toàn/PII/grounding vẫn giữ nguyên. Đúng tinh thần "guardrails là một lớp, không phải vài dòng if trong prompt".
