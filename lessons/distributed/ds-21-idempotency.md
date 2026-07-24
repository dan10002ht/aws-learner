# Bài 21 — Idempotency, dedup & exactly-once

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao retry là bắt buộc** trong hệ phân tán, và hệ quả là mọi thao tác quan trọng phải **idempotent**.
- Thiết kế **idempotency key** do client sinh và một **dedup store** đúng cách (không chỉ "đã thấy key chưa" mà còn lưu cả kết quả).
- Nói thẳng ra rằng **"exactly-once" delivery là bất khả thi**; cái ta thực sự đạt được là **effectively-once = at-least-once + idempotent consumer**.
- Cài **outbox pattern** (ghi event cùng transaction với business data) và **inbox pattern** (dedup ở phía nhận) để không bao giờ mất/nhân đôi event.
- Viết một **API thanh toán idempotent** hoàn chỉnh: xử lý đúng cả khi client retry, khi hai request trùng key chạy song song.

---

## 2. Lý thuyết

### 2.1 Vì sao retry là bắt buộc — và nó kéo theo idempotency

Nhớ lại Bài 1: khi A gọi B mà bị **timeout**, A không thể phân biệt *B đã chết*, *B xong nhưng reply bị mất*, hay *B chỉ đang chậm*. A chỉ có hai lựa chọn:

- **Không retry** → nếu thực ra reply bị mất, thao tác đã mất luôn (mất tiền, mất đơn). Đây là **at-most-once**: mỗi thao tác chạy 0 hoặc 1 lần, an toàn khỏi nhân đôi nhưng **có thể mất**.
- **Retry** → đảm bảo thao tác cuối cùng chạy ít nhất 1 lần (**at-least-once**), nhưng nếu request đầu thực ra đã thành công, ta vừa chạy nó **lần thứ hai** → trừ tiền hai lần.

Trong thực tế gần như luôn chọn **at-least-once** (thà làm lại còn hơn làm mất). Nhưng at-least-once chỉ an toàn nếu **chạy lại nhiều lần cho ra cùng một kết quả như chạy một lần** — đó chính là **idempotency**.

> **Idempotent**: thao tác `f` mà `f(f(x)) = f(x)`. Gọi 1 lần hay 5 lần, trạng thái hệ thống và kết quả trả về **như nhau**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="dl-t">Ba mức delivery semantics</title>
<desc id="dl-d">So sánh at-most-once, at-least-once và effectively-once về mất và nhân đôi</desc>
<rect x="20" y="30" width="200" height="180" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="55" text-anchor="middle" font-size="14" fill="currentColor">at-most-once</text>
<text x="120" y="85" text-anchor="middle" font-size="11" fill="currentColor">không retry</text>
<text x="120" y="120" text-anchor="middle" font-size="12" fill="currentColor">chạy 0 hoặc 1 lần</text>
<text x="120" y="150" text-anchor="middle" font-size="12" fill="currentColor">không nhân đôi</text>
<text x="120" y="178" text-anchor="middle" font-size="12" fill="currentColor">CÓ THỂ MẤT</text>
<rect x="250" y="30" width="200" height="180" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="55" text-anchor="middle" font-size="14" fill="currentColor">at-least-once</text>
<text x="350" y="85" text-anchor="middle" font-size="11" fill="currentColor">retry đến khi ack</text>
<text x="350" y="120" text-anchor="middle" font-size="12" fill="currentColor">chạy 1 hoặc n lần</text>
<text x="350" y="150" text-anchor="middle" font-size="12" fill="currentColor">không mất</text>
<text x="350" y="178" text-anchor="middle" font-size="12" fill="currentColor">CÓ THỂ NHÂN ĐÔI</text>
<rect x="480" y="30" width="200" height="180" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="55" text-anchor="middle" font-size="14" fill="currentColor">effectively-once</text>
<text x="580" y="85" text-anchor="middle" font-size="11" fill="currentColor">at-least-once + dedup</text>
<text x="580" y="120" text-anchor="middle" font-size="12" fill="currentColor">chạy n lần,</text>
<text x="580" y="140" text-anchor="middle" font-size="12" fill="currentColor">tác dụng 1 lần</text>
<text x="580" y="178" text-anchor="middle" font-size="12" fill="currentColor">không mất, không đôi</text>
</svg>

### 2.2 Analogy đời thường

Nhấn nút **gọi thang máy**: bạn bấm 1 lần hay đấm 10 lần, thang vẫn chỉ tới **một lần** — nút gọi thang là idempotent. Ngược lại, **rút tiền ATM**: mỗi lần bấm là một lần trừ tiền, không idempotent; nếu máy treo rồi bạn bấm lại, có nguy cơ trừ hai lần. Cả bài này là kỹ thuật biến các thao tác kiểu "rút tiền" thành kiểu "nút thang máy".

Chú ý: một số thao tác **tự nhiên đã idempotent** nhờ bản chất:
- `SET balance = 100` (ghi đè giá trị tuyệt đối) → chạy lại vẫn 100.
- `DELETE user 42`, `PUT /resource/42` với toàn bộ body → lặp lại vô hại.

Còn các thao tác **tương đối / tích luỹ** thì KHÔNG idempotent và là nguồn mọi rắc rối:
- `balance = balance - 100` (trừ tương đối) → chạy 2 lần trừ 200.
- `INSERT` một dòng đơn hàng mới → chạy 2 lần tạo 2 đơn.
- `POST /charges` tạo giao dịch mới → 2 lần = 2 giao dịch.

### 2.3 Idempotency key: biến thao tác tương đối thành an toàn

Với các thao tác không tự nhiên idempotent, ta thêm một lớp **khoá định danh**: **client sinh một idempotency key** (thường là UUID v4) *một lần* cho *một ý định nghiệp vụ*, rồi gửi kèm ở mọi lần retry của **cùng ý định đó**.

Điểm mấu chốt — **client sinh key, KHÔNG phải server**:
- Nếu server sinh key, mỗi lần retry request lại tới server và server cấp key mới → không thể nhận ra đây là retry.
- Client biết "tôi đang cố làm *một* việc"; nó cố định key trước khi gửi, giữ nguyên qua mọi lần retry. Server dùng key này để hỏi: **"tôi đã xử lý key này chưa?"**

Key phải gắn với **ý định**, không phải với **lần bấm**. "Thanh toán đơn #A cho user U số tiền X" là một ý định → một key. Nếu user cố ý thanh toán lần nữa (mua thêm) → ý định mới → key mới.

### 2.4 Dedup store: không chỉ "đã thấy chưa", mà lưu cả kết quả

Sai lầm phổ biến: dedup store chỉ lưu tập các key đã xử lý, thấy key trùng thì bỏ qua. Vấn đề: **client retry vì nó chưa nhận được reply** — nếu server chỉ "bỏ qua" mà không trả lại kết quả cũ, client vẫn không biết chuyện gì đã xảy ra.

Dedup store đúng phải lưu **(key → trạng thái + response đã chốt)** và hoạt động như một máy trạng thái:

<svg viewBox="0 0 640 250" role="img" aria-labelledby="sm-t sm-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="sm-t">Vòng đời một idempotency key trong dedup store</title>
<desc id="sm-d">Key đi từ trạng thái mới, tới đang xử lý, tới hoàn tất và trả lại response đã lưu</desc>
<rect x="30" y="100" width="130" height="55" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="125" text-anchor="middle" font-size="13" fill="currentColor">NEW</text>
<text x="95" y="143" text-anchor="middle" font-size="10" fill="currentColor">chưa thấy key</text>
<rect x="250" y="100" width="130" height="55" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="125" text-anchor="middle" font-size="13" fill="currentColor">IN_PROGRESS</text>
<text x="315" y="143" text-anchor="middle" font-size="10" fill="currentColor">đang xử lý</text>
<rect x="470" y="100" width="140" height="55" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="125" text-anchor="middle" font-size="13" fill="currentColor">DONE</text>
<text x="540" y="143" text-anchor="middle" font-size="10" fill="currentColor">có response đã lưu</text>
<line x1="160" y1="127" x2="248" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="204" y="118" text-anchor="middle" font-size="10" fill="currentColor">insert key</text>
<line x1="380" y1="127" x2="468" y2="127" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="424" y="118" text-anchor="middle" font-size="10" fill="currentColor">commit</text>
<path d="M315,100 C315,50 540,50 540,98" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="428" y="46" text-anchor="middle" font-size="10" fill="#f43f5e">retry khi đang xử lý → chờ/409</text>
<path d="M540,155 C540,210 315,210 240,175" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#a2)"/>
<text x="380" y="205" text-anchor="middle" font-size="10" fill="#10b981">retry sau khi xong → trả response đã lưu (200)</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ba nhánh khi một request mang key `k` tới:
1. **Chưa có `k`** → chèn `(k, IN_PROGRESS)`, xử lý nghiệp vụ, lưu response, chuyển `DONE`, trả kết quả.
2. **Có `k`, DONE** → **không chạy lại nghiệp vụ**, trả thẳng response đã lưu (client thấy y hệt lần đầu thành công).
3. **Có `k`, IN_PROGRESS** → một request trùng đang chạy song song (race). Trả `409 Conflict` để client thử lại sau, hoặc chặn chờ tới khi xong. Tuyệt đối không chạy nghiệp vụ lần hai.

Việc chèn key phải là **atomic** (INSERT với unique constraint, hoặc `SET NX` của Redis) để race giữa hai request cùng key được phân xử bởi database chứ không bởi code.

### 2.5 "Exactly-once" là huyền thoại — effectively-once mới là thật

Nhiều tài liệu tiếp thị "exactly-once delivery". Về mặt lý thuyết, **exactly-once delivery qua mạng không tin cậy là bất khả thi**: người gửi gửi tin rồi chờ ack; nếu ack mất, nó buộc phải chọn *gửi lại* (có thể nhân đôi) hoặc *bỏ* (có thể mất). Không có lựa chọn thứ ba.

Cái ta thật sự làm được gọi là **exactly-once *processing* / effectively-once**:

> **effectively-once = at-least-once delivery + idempotent consumer (dedup)**

Tin có thể **được giao nhiều lần**, nhưng **tác dụng lên trạng thái chỉ xảy ra một lần** vì consumer khử trùng lặp. Kafka "exactly-once semantics" cũng chính là cơ chế này: producer đánh số sequence + `enable.idempotence`, và transaction gom "đọc offset + ghi kết quả" thành một khối atomic — bản chất vẫn là dedup, không phải phép màu chống nhân đôi trên đường truyền.

| | Delivery | Processing effect |
|---|---|---|
| at-most-once | tối đa 1 | có thể 0 (mất) |
| at-least-once | tối thiểu 1 | có thể n (đôi) |
| **effectively-once** | **tối thiểu 1 (có đôi)** | **đúng 1** |

Bài học: đừng đi tìm "exactly-once delivery". Hãy **thiết kế consumer idempotent** rồi bật retry thoải mái.

### 2.6 Outbox pattern: vì sao "ghi DB rồi publish event" là bug

Tình huống kinh điển: service tạo đơn hàng cần (a) ghi đơn vào DB và (b) publish event `OrderCreated` lên Kafka để service khác xử lý. Viết ngây thơ:

```text
db.insert(order)        // (a)
kafka.publish(event)    // (b)
```

Đây là **dual write** — ghi vào hai hệ thống không cùng transaction. Hai chế độ hỏng:
- (a) commit xong, **(b) crash trước khi publish** → DB có đơn, nhưng không ai biết → **mất event**.
- (b) publish xong, **(a) rollback** → có event `OrderCreated` cho một đơn không tồn tại → **event ma**.

Không có thứ tự nào cứu được, vì hai hệ không share transaction. **Outbox pattern** giải quyết bằng cách chỉ ghi vào **một** hệ (DB) trong một transaction:

<svg viewBox="0 0 700 260" role="img" aria-labelledby="ob-t ob-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ob-t">Outbox pattern</title>
<desc id="ob-d">Ghi business row và outbox row trong cùng transaction, một relay đọc outbox và publish lên broker</desc>
<rect x="20" y="90" width="120" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="118" text-anchor="middle" font-size="12" fill="currentColor">Service</text>
<text x="80" y="136" text-anchor="middle" font-size="10" fill="currentColor">handler</text>
<rect x="220" y="30" width="230" height="180" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="335" y="52" text-anchor="middle" font-size="12" fill="currentColor">Database (1 transaction)</text>
<rect x="245" y="70" width="80" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="285" y="92" text-anchor="middle" font-size="11" fill="currentColor">orders</text>
<text x="285" y="107" text-anchor="middle" font-size="9" fill="currentColor">business</text>
<rect x="345" y="70" width="80" height="45" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="385" y="92" text-anchor="middle" font-size="11" fill="currentColor">outbox</text>
<text x="385" y="107" text-anchor="middle" font-size="9" fill="currentColor">event rows</text>
<text x="335" y="150" text-anchor="middle" font-size="10" fill="currentColor">commit cả hai hoặc không gì</text>
<text x="335" y="170" text-anchor="middle" font-size="10" fill="currentColor">→ nguyên tử, không mất/ma</text>
<rect x="530" y="90" width="120" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="590" y="114" text-anchor="middle" font-size="12" fill="currentColor">Relay / CDC</text>
<text x="590" y="132" text-anchor="middle" font-size="10" fill="currentColor">poll outbox</text>
<line x1="140" y1="120" x2="218" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<line x1="450" y1="115" x2="528" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="489" y="107" text-anchor="middle" font-size="9" fill="currentColor">read</text>
<line x1="590" y1="150" x2="590" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="590" y="220" text-anchor="middle" font-size="11" fill="currentColor">Kafka broker</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- Trong **một transaction DB**: `INSERT` order vào bảng nghiệp vụ **và** `INSERT` event vào bảng `outbox`. Vì cùng transaction, hai row **cùng commit hoặc cùng rollback** — không bao giờ lệch.
- Một **message relay** (poll bảng outbox, hoặc dùng **CDC** như Debezium đọc WAL) đọc các row chưa gửi và publish lên Kafka, rồi đánh dấu đã gửi.
- Relay chạy **at-least-once**: nếu nó crash sau khi publish nhưng trước khi đánh dấu, nó publish lại → **event nhân đôi**. Đây là lý do phía nhận vẫn cần **inbox / idempotent consumer** (mục 2.7). Outbox chống *mất*; inbox chống *đôi*.

### 2.7 Inbox pattern: dedup ở phía consumer

Vì mọi event trên broker là at-least-once, consumer phải khử trùng lặp. Mỗi event mang một **event id** ổn định (sinh khi ghi vào outbox, không đổi qua các lần publish lại). Consumer giữ một bảng **inbox** các event id đã xử lý, và trong **cùng transaction** với việc áp dụng nghiệp vụ:

```text
BEGIN
  if exists(inbox, event.id): return   -- đã xử lý, bỏ qua
  apply business effect                 -- ví dụ trừ kho
  insert into inbox(event.id)
COMMIT
```

Vì "check inbox + apply + ghi inbox" nằm trong một transaction, dù event tới 3 lần thì chỉ **một** lần commit thành công (nhờ unique constraint trên `event.id`), hai lần sau thấy id đã có và bỏ qua. Đây chính là **idempotent consumer** — mảnh ghép biến at-least-once thành effectively-once.

---

## 3. Code: API thanh toán idempotent

Ta xây `POST /v1/charges` (giống Stripe): client gửi header `Idempotency-Key`, server đảm bảo dù retry bao nhiêu lần cũng **chỉ trừ tiền một lần** và luôn trả về **cùng một response**.

### 3.1 Schema dedup store (PostgreSQL)

```sql
CREATE TABLE idempotency_keys (
    key            TEXT PRIMARY KEY,           -- idempotency key do client sinh
    request_hash   TEXT NOT NULL,              -- hash của body, chống dùng lại key cho request khác
    status         TEXT NOT NULL,              -- 'in_progress' | 'done'
    response_code  INT,                        -- HTTP status đã chốt
    response_body  JSONB,                      -- body đã chốt, trả lại cho mọi retry
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until   TIMESTAMPTZ                 -- để dọn key kẹt in_progress do crash
);

CREATE TABLE charges (
    id          TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL,
    amount      BIGINT NOT NULL,               -- đơn vị nhỏ nhất (cent), số nguyên
    status      TEXT NOT NULL
);
```

`PRIMARY KEY` trên `key` là thứ tạo ra tính atomic: hai request cùng key chạy song song thì **chỉ một** INSERT thành công, cái kia dính lỗi unique — database phân xử race giúp ta.

### 3.2 Handler (Python + psycopg, giả lược)

```python
import hashlib, json, uuid
from psycopg.errors import UniqueViolation

def charge(conn, idem_key: str, body: dict):
    if not idem_key:
        return 400, {"error": "Idempotency-Key header is required"}

    req_hash = hashlib.sha256(
        json.dumps(body, sort_keys=True).encode()
    ).hexdigest()

    with conn.transaction():                       # transaction 1: giành quyền xử lý key
        try:
            conn.execute(
                "INSERT INTO idempotency_keys(key, request_hash, status) "
                "VALUES (%s, %s, 'in_progress')",
                (idem_key, req_hash),
            )
            first_time = True
        except UniqueViolation:
            first_time = False

    if not first_time:
        row = conn.execute(
            "SELECT request_hash, status, response_code, response_body "
            "FROM idempotency_keys WHERE key = %s", (idem_key,)
        ).fetchone()
        # cùng key nhưng body khác → client dùng sai key, từ chối
        if row[0] != req_hash:
            return 422, {"error": "Idempotency-Key reused with a different request body"}
        if row[1] == "done":
            return row[2], row[3]                   # trả lại y hệt response lần đầu
        return 409, {"error": "A request with this Idempotency-Key is still in progress"}

    # first_time == True: ta là request duy nhất được phép chạy nghiệp vụ
    with conn.transaction():                        # transaction 2: nghiệp vụ + chốt response
        charge_id = "ch_" + uuid.uuid4().hex
        conn.execute(
            "INSERT INTO charges(id, account_id, amount, status) "
            "VALUES (%s, %s, %s, 'succeeded')",
            (charge_id, body["account_id"], body["amount"]),
        )
        resp = {"id": charge_id, "amount": body["amount"], "status": "succeeded"}
        conn.execute(
            "UPDATE idempotency_keys SET status='done', response_code=200, "
            "response_body=%s WHERE key=%s",
            (json.dumps(resp), idem_key),
        )
    return 200, resp
```

Điểm cần hiểu:
- **`request_hash`** chặn lỗi nguy hiểm: client vô tình dùng lại một key cho request *khác* (số tiền khác). Nếu chỉ so key, ta sẽ trả nhầm response của giao dịch cũ. So thêm hash body → phát hiện và trả `422`.
- Ghi `charges` và cập nhật `idempotency_keys` **cùng transaction 2**: nếu crash giữa chừng, cả hai rollback, key quay lại như chưa có (hoặc kẹt `in_progress` sẽ được dọn), retry tiếp theo chạy sạch — không có giao dịch mồ côi.
- Client retry sau khi thành công → rơi vào nhánh `status == "done"` → nhận lại `ch_...` cũ, **không tạo charge mới**.

### 3.3 Phía client — key cố định qua các lần retry

```python
import time, uuid, requests

idem_key = str(uuid.uuid4())        # sinh MỘT LẦN cho MỘT ý định thanh toán
for attempt in range(3):
    try:
        r = requests.post(
            "https://api.example.com/v1/charges",
            headers={"Idempotency-Key": idem_key},   # GIỮ NGUYÊN qua mọi retry
            json={"account_id": "acct_1", "amount": 5000},
            timeout=3,
        )
        if r.status_code == 409:                      # đang xử lý, chờ rồi thử lại
            time.sleep(0.5 * (attempt + 1)); continue
        break
    except requests.Timeout:
        continue                                      # retry với CÙNG key → server dedup
```

Lỗi thường gặp cần tránh: **sinh key mới trong vòng lặp retry**. Làm vậy mỗi lần retry thành một ý định mới → server không nhận ra trùng → trừ tiền nhiều lần. Key phải sinh **trước** vòng lặp.

### 3.4 Dedup nhẹ bằng Redis (khi không cần bền tuyệt đối)

Với luồng ít nghiêm ngặt (ví dụ dedup notification), có thể dùng Redis `SET NX` làm khoá atomic:

```bash
# Chỉ set nếu key CHƯA tồn tại (NX), tự hết hạn sau 24h (EX)
SET idem:ch_abc123 "in_progress" NX EX 86400
# → trả OK nếu là request đầu; trả (nil) nếu key đã có → đây là retry, bỏ qua/trả cache
```

Lưu ý: Redis không cùng transaction với DB nghiệp vụ, nên đây là dedup **best-effort** (có thể mất khi Redis evict/restart). Với tiền bạc, luôn dùng dedup store **bền trong chính DB nghiệp vụ** như mục 3.1–3.2 để dedup và business effect chung một transaction.

---

## 4. Ví dụ thực tế & con số

- **Stripe** dùng đúng mô hình mục 3: header `Idempotency-Key`, lưu response 24 giờ, retry trong 24h trả lại kết quả cũ; quá 24h key hết hạn (giả định retry hợp lý không kéo dài hơn thế). Con số 24h là đánh đổi giữa an toàn và chi phí lưu trữ dedup store.
- **Kafka EOS**: bật `enable.idempotence=true` + `acks=all` cho producer, dùng `transactional.id` để "consume-process-produce" atomic. Thực chất là dedup theo `(producer_id, sequence)` phía broker — vẫn là effectively-once, không phải phép màu trên dây.
- **AWS SQS FIFO**: có `MessageDeduplicationId`, khử trùng lặp trong **cửa sổ 5 phút**. Ngoài 5 phút, cùng nội dung sẽ được coi là mới → nhắc lại: dedup luôn có **giới hạn thời gian/không gian**, phải chọn cho khớp mẫu retry của bạn.
- **Quy mô**: một cổng thanh toán 2.000 req/s, tỉ lệ retry do timeout ~0.5% nghĩa là ~10 req/s là bản trùng lặp cần khử — nếu không idempotent, đó là ~860.000 giao dịch nhân đôi mỗi ngày.

---

## 5. Tóm tắt
- Trong hệ phân tán, **timeout không phân biệt được** thành công với thất bại → buộc phải **retry** → mặc định là **at-least-once** → **mọi thao tác quan trọng phải idempotent**.
- Thao tác **tuyệt đối** (SET, PUT, DELETE) tự idempotent; thao tác **tương đối/tích luỹ** (trừ tiền, INSERT) thì không, phải bọc bằng **idempotency key do client sinh** + **dedup store**.
- Dedup store đúng lưu **(key → status + response đã chốt)** và là một máy trạng thái NEW → IN_PROGRESS → DONE; chèn key phải **atomic** (unique constraint / `SET NX`) để phân xử race.
- **"exactly-once delivery" là bất khả thi**; cái đạt được là **effectively-once = at-least-once + idempotent consumer**. Kafka EOS, SQS FIFO đều là dedup có giới hạn, không phải phép màu.
- **Outbox** (ghi business row + event row cùng transaction, relay/CDC publish) chống **mất event** do dual write; **inbox** (dedup theo event id cùng transaction áp dụng nghiệp vụ) chống **event nhân đôi**. Hai mảnh này ghép lại cho pipeline effectively-once đầu-cuối.

> **Bài tiếp theo (Bài 22):** khi một thao tác trải nhiều service không thể idempotent-hoá đơn lẻ — **giao dịch phân tán: 2PC vs Saga**, cách giữ nhất quán khi không có một transaction chung.
