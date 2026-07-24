# Bài 3 — Giao tiếp: RPC, network partition & message anomalies

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **RPC (Remote Procedure Call)** là gì, vì sao "gọi qua mạng khác hẳn gọi hàm cục bộ" — dù trông cú pháp y hệt.
- Kể tên và nhận diện các **message anomalies**: mất (loss), lặp (duplication), đảo thứ tự (reordering), trễ tuỳ ý (arbitrary delay).
- Hiểu **network partition** & **split-brain**: khi hệ bị chia làm hai nửa vẫn tưởng mình đúng.
- Chốt chặt luận điểm cốt lõi: **timeout không phân biệt được node chết hay chỉ chậm/mất mạng**.
- Phân biệt **delivery semantics**: at-most-once / at-least-once / exactly-once và hệ quả kỹ thuật của mỗi cái.

---

## 2. Lý thuyết

### 2.1 RPC: ảo giác "gọi hàm từ xa"

**RPC** ra đời với tham vọng đẹp: cho lập trình viên gọi một hàm chạy trên **máy khác** y như gọi hàm cục bộ. Bạn viết `balance = account.getBalance(id)`, thư viện RPC lo phần còn lại: **serialize** tham số, gửi qua mạng, chờ, **deserialize** kết quả trả về. gRPC, Thrift, Java RMI, hay đơn giản một lời gọi HTTP/JSON tới REST API — tất cả đều là biến thể của ý tưởng này.

Analogy đời thường: gọi hàm cục bộ như **quay sang hỏi người ngồi cạnh** — nghe thấy ngay, chắc chắn có câu trả lời. RPC như **gửi thư tay qua bưu điện rồi chờ hồi âm**: thư có thể lạc, đến muộn, hoặc người nhận đã trả lời nhưng thư hồi âm mới là cái bị lạc. Cú pháp giống nhau, nhưng bản chất một trời một vực.

Tham vọng "trong suốt như gọi hàm" chính là **cái bẫy**. Bài báo kinh điển *"A Note on Distributed Computing"* (Waldo và cộng sự, 1994) chỉ ra: cố che giấu sự khác biệt giữa local và remote là **sai lầm nền tảng**, vì bốn thứ sau **không thể che giấu**:

| Khía cạnh | Gọi hàm cục bộ (local) | Gọi RPC (remote) |
|-----------|------------------------|-------------------|
| **Độ trễ** | Nano giây | Mili giây → chậm hơn ~10⁴–10⁶ lần |
| **Chế độ lỗi** | Chỉ lỗi logic; hoặc chạy hoặc không | Thêm: **partial failure** — request tới nhưng reply mất, mạng đứt giữa chừng |
| **Bộ nhớ / con trỏ** | Cùng address space, truyền tham chiếu rẻ | Khác process/máy; phải copy toàn bộ (serialize), con trỏ vô nghĩa |
| **Concurrency** | Tuần tự, dễ đoán | Nhiều caller đồng thời, thứ tự tới không đảm bảo |

> **Chốt bản chất:** RPC không phải "gọi hàm ở xa". Nó là **gửi một message đi và hy vọng nhận được message về**. Mọi khó khăn của mạng đều lộ ra ở đây. Che nó bằng cú pháp đẹp không làm nó biến mất — chỉ khiến bạn quên xử lý.

### 2.2 Anatomy của một lời gọi RPC

Để thấy chỗ nào có thể hỏng, hãy mổ xẻ đường đi của một request. Mỗi mũi tên là một cơ hội thất bại:

<svg viewBox="0 0 700 250" role="img" aria-labelledby="rpc-t rpc-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="rpc-t">Đường đi một lời gọi RPC qua stub và mạng</title>
<desc id="rpc-d">Client gọi stub, stub serialize và gửi qua mạng tới server stub, server thực thi rồi trả kết quả ngược lại, mỗi chặng đều có thể hỏng</desc>
<rect x="20" y="30" width="150" height="190" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="52" text-anchor="middle" font-size="13" fill="currentColor">CLIENT</text>
<rect x="45" y="70" width="100" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="91" text-anchor="middle" font-size="11" fill="currentColor">app code</text>
<rect x="45" y="130" width="100" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="146" text-anchor="middle" font-size="10" fill="currentColor">client stub</text>
<text x="95" y="158" text-anchor="middle" font-size="9" fill="currentColor">(serialize)</text>
<rect x="530" y="30" width="150" height="190" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="52" text-anchor="middle" font-size="13" fill="currentColor">SERVER</text>
<rect x="555" y="70" width="100" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="91" text-anchor="middle" font-size="11" fill="currentColor">handler</text>
<rect x="555" y="130" width="100" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="146" text-anchor="middle" font-size="10" fill="currentColor">server stub</text>
<text x="605" y="158" text-anchor="middle" font-size="9" fill="currentColor">(deserialize)</text>
<rect x="290" y="95" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="350" y="122" text-anchor="middle" font-size="12" fill="currentColor">NETWORK</text>
<text x="350" y="140" text-anchor="middle" font-size="9" fill="#f43f5e">mất/lặp/đảo/trễ</text>
<line x1="145" y1="147" x2="288" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<text x="215" y="128" text-anchor="middle" font-size="10" fill="currentColor">request</text>
<line x1="412" y1="120" x2="553" y2="147" stroke="currentColor" stroke-width="1.5" marker-end="url(#ar)"/>
<line x1="553" y1="185" x2="412" y2="150" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#ar)"/>
<line x1="288" y1="150" x2="147" y2="185" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#ar)"/>
<text x="350" y="205" text-anchor="middle" font-size="10" fill="currentColor">reply (nét đứt)</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Bốn chặng có thể hỏng: (1) request chưa rời client, (2) request mất trên đường đi, (3) server chết **trong lúc** xử lý, (4) reply mất trên đường về. Điều nghiệt ngã: từ phía client, **chặng (2) và chặng (4) trông y hệt nhau** — đều là "gửi đi, không thấy hồi âm". Đây là mầm mống của mọi rắc rối phía sau.

### 2.3 Bốn message anomalies

Mạng chuyển tin theo mô hình **async, unreliable**. Bốn bất thường phải luôn giả định là có thể xảy ra:

| Anomaly | Mô tả | Nguyên nhân thực tế | Hệ quả nếu bỏ qua |
|---------|-------|---------------------|-------------------|
| **Loss** (mất) | Message không bao giờ tới | Router drop khi nghẽn (buffer đầy), cáp đứt, packet lỗi checksum | Request/reply biến mất; caller treo hoặc timeout |
| **Duplication** (lặp) | Cùng một message tới nhiều lần | TCP/tầng ứng dụng **retransmit**, client retry sau timeout | Xử lý hai lần: trừ tiền 2 lần, gửi 2 email |
| **Reordering** (đảo thứ tự) | M2 tới trước M1 dù gửi M1 trước | Gói đi đường khác nhau, retransmit chèn giữa | Áp dụng "hủy" trước "tạo"; state sai |
| **Arbitrary delay** (trễ tuỳ ý) | Message tới rất muộn | Queue nghẽn, GC pause, đường vòng | Reply của request cũ tới lẫn với request mới; **timeout nhầm** |

Lưu ý một cặp thường bị hiểu nhầm: **TCP** đảm bảo thứ tự (ordering) và không mất **trong phạm vi một connection còn sống**. Nhưng khi connection **rớt rồi kết nối lại**, hoặc bạn có **nhiều connection song song**, hoặc message được **retry ở tầng ứng dụng** — thì cả bốn anomaly quay lại đầy đủ. Đừng để TCP ru ngủ: ở tầng nghiệp vụ (business logic), bạn **luôn** phải giả định message có thể mất, lặp, đảo.

### 2.4 Trễ tuỳ ý sinh ra "zombie reply"

Một biến thể ác của arbitrary delay: client gửi request R1, chờ quá lâu, **timeout**, rồi retry thành R2. R2 xong. Sau đó **reply của R1 mới lết về** — tới muộn hàng giây. Nếu client không gắn **request ID / correlation ID** để khớp reply với đúng request, nó có thể lấy reply cũ của R1 gán cho R2 → dữ liệu sai lệch âm thầm. Đây là lý do mọi giao thức RPC nghiêm túc đều gắn **ID duy nhất cho từng call** và bỏ qua reply "mồ côi".

### 2.5 Network partition & split-brain

**Network partition** là khi mạng **chia cụm node thành hai (hay nhiều) nhóm không nói chuyện được với nhau**, dù mỗi node trong nhóm vẫn sống khỏe. Ví dụ: một switch giữa hai rack hỏng, hai data center mất đường link.

Vấn đề chí mạng: từ **bên trong** một nhóm, bạn **không phân biệt được** "nhóm bên kia đã chết" với "nhóm bên kia vẫn sống nhưng mình không liên lạc được". Cả hai trông y hệt: gửi đi, không hồi âm.

Nếu hệ thống có một vai trò "leader/primary" (ví dụ node được ghi dữ liệu), partition có thể sinh ra **split-brain**: **cả hai nhóm cùng tưởng nhóm kia đã chết, mỗi bên tự bầu một leader**. Giờ có **hai leader** cùng nhận ghi, dữ liệu phân kỳ (diverge). Khi mạng lành lại, hai nhánh lịch sử xung đột — mất mát hoặc phải merge thủ công đầy đau đớn.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="sb-t sb-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sb-t">Network partition dẫn tới split-brain hai leader</title>
<desc id="sb-d">Một cụm 5 node bị mạng chia làm hai nhóm, mỗi nhóm tự bầu một leader và cùng nhận ghi, gây phân kỳ dữ liệu</desc>
<rect x="30" y="30" width="280" height="180" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="52" text-anchor="middle" font-size="12" fill="currentColor">Nhóm A (3 node)</text>
<circle cx="90" cy="110" r="26" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="108" text-anchor="middle" font-size="10" fill="currentColor">Leader</text>
<text x="90" y="121" text-anchor="middle" font-size="10" fill="currentColor">A</text>
<circle cx="180" cy="90" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="94" text-anchor="middle" font-size="10" fill="currentColor">n2</text>
<circle cx="185" cy="160" r="22" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="185" y="164" text-anchor="middle" font-size="10" fill="currentColor">n3</text>
<rect x="390" y="30" width="280" height="180" rx="12" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="52" text-anchor="middle" font-size="12" fill="currentColor">Nhóm B (2 node)</text>
<circle cx="470" cy="110" r="26" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="108" text-anchor="middle" font-size="10" fill="currentColor">Leader</text>
<text x="470" y="121" text-anchor="middle" font-size="10" fill="currentColor">B</text>
<circle cx="565" cy="120" r="22" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="124" text-anchor="middle" font-size="10" fill="currentColor">n5</text>
<line x1="340" y1="60" x2="340" y2="200" stroke="#f43f5e" stroke-width="3" stroke-dasharray="6 5"/>
<text x="350" y="225" text-anchor="middle" font-size="11" fill="#f43f5e">partition (link đứt)</text>
<text x="170" y="200" text-anchor="middle" font-size="10" fill="currentColor">nhận ghi X=1</text>
<text x="530" y="200" text-anchor="middle" font-size="10" fill="currentColor">nhận ghi X=2</text>
</svg>

**Cách thuần hoá split-brain** là **quorum**: chỉ nhóm nào chiếm **đa số** (majority, > N/2 node) mới được quyền làm leader và nhận ghi. Với cụm 5 node bị chia 3–2, chỉ nhóm 3 node đạt quorum; nhóm 2 node **tự nguyện ngừng nhận ghi** (fail thay vì phân kỳ). Vì hai nhóm không thể **cùng** chiếm đa số, không bao giờ có hai leader hợp lệ. Đây chính là hạt nhân của consensus (Raft/Paxos) — sẽ học kỹ ở chương sau.

### 2.6 Timeout: cái kim không phân biệt được chết và chậm

Đây là câu **quan trọng nhất** của bài. Khi client gửi request và không nhận reply trong T giây, nó chỉ biết một điều: **"chưa thấy hồi âm sau T giây"**. Nó **KHÔNG** biết được cái nào trong các khả năng:

1. Server **đã chết** trước khi nhận request.
2. Server **nhận rồi, đang xử lý chậm** (GC pause, đĩa nghẽn), sẽ trả lời sau T.
3. Server **xử lý xong rồi**, nhưng **reply đang trên đường / bị mất**.

Ba khả năng đòi hỏi ba cách xử lý ngược nhau: (1) nên retry sang node khác; (2) **không** nên retry, chỉ chờ thêm; (3) tuyệt đối **không** retry một cách ngây thơ vì thao tác đã thực hiện rồi — retry sẽ làm **hai lần**. Nhưng client **mù thông tin**, buộc phải chọn một chiến lược cho cả ba.

> **Hệ quả nền tảng:** vì timeout không phân biệt được chết và chậm, nên **mọi retry đều có nguy cơ gây duplication**. Và vì duplication là không tránh khỏi, phía nhận **bắt buộc phải idempotent** nếu muốn đúng đắn. Cả một mảng lớn của hệ phân tán mọc ra từ đúng câu này.

Chọn **T** cũng là đánh đổi: T **quá ngắn** → hiểu nhầm node chậm thành chết, retry thừa, tạo bão retry (retry storm) làm sập luôn node đang ngắc ngoải. T **quá dài** → phát hiện lỗi chậm, người dùng chờ lâu. Thực tế dùng **adaptive timeout** (theo p99 latency đo được) + **exponential backoff + jitter** cho retry để không đồng loạt dội bom.

---

## 3. Delivery semantics: at-most-once / at-least-once / exactly-once

Câu hỏi trung tâm khi thiết kế giao tiếp: **một message được xử lý bao nhiêu lần?** Có ba mức đảm bảo, sinh ra từ cách bạn xử lý retry và duplicate.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="dl-t dl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="dl-t">Ba delivery semantics theo cách retry</title>
<desc id="dl-d">At-most-once không retry nên có thể mất, at-least-once retry nên có thể lặp, exactly-once dùng dedup hoặc idempotency để có hiệu ứng đúng một lần</desc>
<rect x="20" y="40" width="200" height="140" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="66" text-anchor="middle" font-size="12" fill="currentColor">at-most-once</text>
<text x="120" y="92" text-anchor="middle" font-size="10" fill="currentColor">gửi, KHÔNG retry</text>
<text x="120" y="112" text-anchor="middle" font-size="10" fill="currentColor">0 hoặc 1 lần</text>
<text x="120" y="140" text-anchor="middle" font-size="10" fill="#f43f5e">rủi ro: MẤT</text>
<text x="120" y="160" text-anchor="middle" font-size="9" fill="currentColor">nhanh, đơn giản</text>
<rect x="250" y="40" width="200" height="140" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="66" text-anchor="middle" font-size="12" fill="currentColor">at-least-once</text>
<text x="350" y="92" text-anchor="middle" font-size="10" fill="currentColor">retry tới khi có ACK</text>
<text x="350" y="112" text-anchor="middle" font-size="10" fill="currentColor">1 hoặc nhiều lần</text>
<text x="350" y="140" text-anchor="middle" font-size="10" fill="#f43f5e">rủi ro: LẶP</text>
<text x="350" y="160" text-anchor="middle" font-size="9" fill="currentColor">mặc định phổ biến</text>
<rect x="480" y="40" width="200" height="140" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="66" text-anchor="middle" font-size="12" fill="currentColor">exactly-once</text>
<text x="580" y="92" text-anchor="middle" font-size="10" fill="currentColor">at-least-once + dedup</text>
<text x="580" y="112" text-anchor="middle" font-size="10" fill="currentColor">hiệu ứng đúng 1 lần</text>
<text x="580" y="140" text-anchor="middle" font-size="10" fill="#10b981">cần idempotency</text>
<text x="580" y="160" text-anchor="middle" font-size="9" fill="currentColor">đắt nhất</text>
</svg>

### 3.1 At-most-once — "gửi rồi thôi"
Gửi một lần, **không retry**. Nếu mất thì mất. Kết quả: message được xử lý **0 hoặc 1 lần**, không bao giờ lặp. Phù hợp khi mất mát chấp nhận được và tốc độ là ưu tiên: **metrics, log, telemetry, streaming vị trí GPS** (mất một điểm không sao, có điểm mới ngay). Rẻ, đơn giản, độ trễ thấp.

### 3.2 At-least-once — "retry tới khi chắc"
Gửi rồi **chờ ACK**; không thấy ACK thì **retry**. Đảm bảo message **không bao giờ mất** — nhưng cái giá là có thể xử lý **1 hoặc nhiều lần** (vì ACK có thể mất khiến ta retry một message đã tới). Đây là **mặc định thực dụng** của hầu hết message queue (Kafka, RabbitMQ, SQS). Bù lại, **phía consumer phải chịu được duplicate**.

### 3.3 Exactly-once — "đúng một lần" (có dấu sao)
Mọi người muốn cái này, và nó là **nguồn hiểu lầm lớn nhất**. Sự thật kỹ thuật:

> **Không thể** đảm bảo một message được **truyền** (delivered) đúng một lần qua mạng unreliable. Cái ta thật sự đạt được là **exactly-once *effect* / *processing*** — message có thể tới nhiều lần, nhưng **hiệu ứng lên state chỉ tính một lần**.

Có hai cách đạt hiệu ứng đó, và thường kết hợp cả hai:

**(a) Idempotency** — thiết kế thao tác sao cho làm nhiều lần cũng **cho cùng kết quả** như làm một lần. `SET balance = 100` idempotent; `balance = balance - 10` thì **không** (chạy 2 lần trừ 20). Mẹo thực chiến: gán mỗi thao tác một **idempotency key** duy nhất, phía nhận lưu key đã xử lý, gặp lại thì bỏ qua.

**(b) Deduplication** — phía nhận nhớ các **message ID** đã thấy (trong một cửa sổ thời gian) và loại bản trùng. Kafka làm điều này bằng **idempotent producer** (`enable.idempotence=true`, gắn sequence number + producer ID) và **transactions** để read-process-write nguyên tử trong nội bộ Kafka.

Ví dụ idempotency key ở tầng ứng dụng, kiểu Stripe API:

```http
POST /v1/charges
Idempotency-Key: 7f3a9c21-order-8842
Content-Type: application/json

{ "amount": 5000, "currency": "usd", "customer": "cus_123" }
```

```sql
-- Phía server: chèn key TRƯỚC khi thực hiện; UNIQUE chặn lần 2
INSERT INTO processed_requests (idempotency_key, status)
VALUES ('7f3a9c21-order-8842', 'in_progress');
-- Nếu lỗi 23505 (unique_violation) => request này đã xử lý => trả kết quả cũ, KHÔNG trừ tiền lần nữa
```

Nhờ key duy nhất, client cứ retry an toàn: lần đầu tạo charge, các lần retry chỉ nhận lại **cùng một kết quả** đã lưu, không phát sinh giao dịch mới. Đó chính là "exactly-once effect" trong đời thực.

Bảng chốt để chọn:

| Semantics | Có thể mất? | Có thể lặp? | Yêu cầu phía nhận | Dùng khi |
|-----------|-------------|-------------|-------------------|----------|
| **at-most-once** | Có | Không | Không cần gì | Metrics, log, telemetry chịu mất |
| **at-least-once** | Không | Có | Chịu được duplicate | Mặc định của mọi queue nghiêm túc |
| **exactly-once (effect)** | Không | Không (về hiệu ứng) | **Idempotent + dedup** | Thanh toán, trừ kho, tính tiền |

---

## 4. Sequence diagram: retry gây trừ tiền hai lần & cách chữa

Kịch bản kinh điển: server xử lý xong nhưng **reply mất**, client timeout rồi retry.

<svg viewBox="0 0 700 340" role="img" aria-labelledby="sq-t sq-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sq-t">Sequence: reply mất khiến retry trừ tiền hai lần và cách idempotency-key chặn lại</title>
<desc id="sq-d">Client gửi charge, server trừ tiền và gửi reply nhưng reply bị mất, client timeout retry, không có idempotency thì trừ lần hai, có idempotency-key thì server nhận ra trùng và trả kết quả cũ</desc>
<line x1="130" y1="40" x2="130" y2="310" stroke="currentColor" stroke-width="1"/>
<line x1="560" y1="40" x2="560" y2="310" stroke="currentColor" stroke-width="1"/>
<rect x="70" y="22" width="120" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="42" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<rect x="500" y="22" width="120" height="30" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="42" text-anchor="middle" font-size="12" fill="currentColor">Payment</text>
<line x1="130" y1="75" x2="558" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="330" y="68" text-anchor="middle" font-size="11" fill="currentColor">charge(key=K, $50)</text>
<rect x="470" y="82" width="180" height="26" rx="5" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="100" text-anchor="middle" font-size="10" fill="currentColor">TRỪ $50 (lần 1)</text>
<line x1="558" y1="122" x2="300" y2="122" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#sa)"/>
<text x="400" y="115" text-anchor="middle" font-size="10" fill="#f43f5e">reply MẤT ✕</text>
<line x1="130" y1="150" x2="180" y2="150" stroke="currentColor" stroke-width="1"/>
<text x="255" y="147" text-anchor="middle" font-size="10" fill="#f59e0b">timeout — retry</text>
<line x1="130" y1="172" x2="558" y2="172" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<text x="330" y="165" text-anchor="middle" font-size="11" fill="currentColor">charge(key=K, $50) — lần 2</text>
<rect x="410" y="182" width="240" height="42" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="530" y="199" text-anchor="middle" font-size="10" fill="currentColor">thấy key=K đã xử lý</text>
<text x="530" y="215" text-anchor="middle" font-size="10" fill="#10b981">KHÔNG trừ lại; trả kết quả cũ</text>
<line x1="558" y1="240" x2="132" y2="240" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#sa)"/>
<text x="345" y="233" text-anchor="middle" font-size="10" fill="currentColor">reply: charged $50 (idempotent)</text>
<text x="345" y="285" text-anchor="middle" font-size="11" fill="currentColor">Không có key => lần 2 sẽ TRỪ $50 nữa => tổng $100 (SAI)</text>
<text x="345" y="303" text-anchor="middle" font-size="11" fill="#10b981">Có idempotency-key => đúng $50 dù client retry bao nhiêu lần</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Bài học từ sơ đồ: **client đúng khi retry** (nó buộc phải, vì không biết reply có bị mất hay không). Chỗ sửa nằm ở **phía server**: nhận diện request trùng qua **idempotency-key** và trả lại kết quả cũ thay vì thực hiện lần hai. Retry an toàn = client retry + server idempotent.

---

## 5. Ví dụ & con số thực tế

- **Độ trễ so sánh (Jeff Dean's numbers):** đọc từ L1 cache ~0.5 ns; một **round-trip trong cùng data center** ~0.5 ms = 500,000 ns (**gấp ~1 triệu lần**); round-trip California ↔ Hà Lan ~150 ms. Đây là lý do fallacy "latency is zero" chết người: một vòng lặp gọi RPC 1000 lần trong data center = ~0.5 giây thuần chờ mạng.
- **Retry storm có thật:** nhiều sự cố lớn (một số outage của AWS, GitHub) khuếch đại vì client retry đồng loạt không backoff, biến một node chậm thành sập dây chuyền. Chuẩn hoá bằng **exponential backoff + jitter** và **circuit breaker**.
- **Kafka "exactly-once":** khi Kafka quảng cáo EOS, nó nghĩa là **exactly-once *processing* trong phạm vi Kafka** (idempotent producer + transaction), **không** phải phép màu qua mọi hệ thống bên ngoài. Ghi ra một DB ngoài vẫn cần idempotency của riêng bạn.
- **gRPC deadline:** gRPC ép bạn suy nghĩ về timeout qua **deadline propagation** — client đặt deadline, mọi hop downstream kế thừa phần thời gian còn lại, tránh treo vô hạn. Ví dụ đặt `deadline = now + 2s` cho cả chuỗi call.

---

## 6. Tóm tắt
- **RPC** trông như gọi hàm nhưng bản chất là **gửi message và hy vọng nhận reply**; bốn thứ không che giấu được: latency, partial failure, không chia sẻ bộ nhớ, concurrency.
- Bốn **message anomalies** luôn phải giả định: **loss, duplication, reordering, arbitrary delay**. TCP chỉ che chúng *trong một connection sống* — ở tầng nghiệp vụ chúng luôn quay lại.
- **Network partition** chia cụm thành các nhóm không liên lạc; nếu có leader thì sinh **split-brain** (hai leader, dữ liệu phân kỳ). Thuốc chữa là **quorum majority**.
- Câu cốt lõi: **timeout không phân biệt được node chết / node chậm / reply mất** → mọi retry đều có nguy cơ **duplication** → phía nhận **buộc phải idempotent**.
- **Delivery semantics:** at-most-once (có thể mất, không lặp), at-least-once (không mất, có thể lặp — mặc định thực dụng), exactly-once là **exactly-once *effect*** đạt được bằng **idempotency + deduplication**, không phải phép truyền một lần qua mạng.

> **Bài tiếp theo (Bài 4):** đo và sắp thứ tự thời gian trong hệ phân tán — vì sao **physical clock** không đáng tin, và **logical clock / vector clock** cho ta khái niệm "xảy ra trước" (happens-before) chặt chẽ để lý luận về nhân quả.
