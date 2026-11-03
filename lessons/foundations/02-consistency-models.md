# Foundations 02 — Consistency Models

> Mục tiêu: Hiểu các "mức độ đúng" của dữ liệu trong hệ phân tán — từ **strong** xuống **eventual** — và biết từng AWS service rơi vào mức nào, để khi đi thi SAA bạn không phải đoán.

Tiền đề: bạn đã đọc [[foundations-01-cap-theorem]] và hiểu tại sao phải đánh đổi C vs A khi có partition, và L vs C ngay cả khi mạng bình thường (PACELC). Bài này zoom vào câu hỏi: **"đánh đổi C nghĩa là cụ thể như thế nào?"**

Trong bài, **RDS Multi-AZ standby** chỉ deployment **DB instance**; **Multi-AZ DB cluster** có hai readable replica, nên cần phân biệt khi chọn kiến trúc scale đọc.

---

## 1. Câu chuyện mở đầu — Vợ chồng và cuốn sổ chi tiêu

Hai vợ chồng dùng chung một app ghi chi tiêu, app đồng bộ qua cloud. Vợ vừa nhập "mua rau 50k" trên iPhone.

- **Strong consistency**: Chồng mở app sau 0.1 giây, **chắc chắn thấy** "mua rau 50k". App phải chờ cloud xác nhận trước khi hiển thị bất cứ thứ gì.
- **Read-your-writes**: Vợ refresh app, **chắc chắn thấy** giao dịch mình vừa nhập. Nhưng chồng có thể chưa thấy ngay.
- **Monotonic reads**: Chồng mở app thấy "50k". 5 phút sau mở lại — chắc chắn **không bị mất** giao dịch đó (không "lùi" về trạng thái cũ).
- **Causal consistency**: Vợ nhập "mua rau 50k", rồi comment "rau hôm nay đắt". Bất kỳ ai thấy comment → cũng phải thấy giao dịch (nguyên nhân trước, kết quả sau).
- **Eventual consistency**: Chồng có thể không thấy ngay, nhưng "cuối cùng" (vài giây — vài phút) sẽ thấy.

Đây là các hợp đồng khác nhau, **không phải thứ tự giảm dần tuyệt đối**: read-your-writes và monotonic reads là các session guarantee có thể kết hợp, không suy ra lẫn nhau. Không có "tốt nhất" — chỉ có "phù hợp use case".

<ab-toggle data-labels="Strong|Eventual">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="fd02-time-0-t fd02-time-0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="fd02-time-0-t">Giá trị đọc theo thời gian: strong</title>
<desc id="fd02-time-0-d">Giá trị đọc theo thời gian: strong</desc>
<text x="260" y="24" font-size="14" text-anchor="middle" fill="currentColor">Vợ ghi “mua rau 50k”; chồng đọc sau 0.1s</text>
<text x="60" y="58" font-size="14" text-anchor="middle" fill="currentColor">t0: ghi</text>
<text x="245" y="58" font-size="14" text-anchor="middle" fill="currentColor">+0.1s: đọc</text>
<text x="435" y="58" font-size="14" text-anchor="middle" fill="currentColor">vài giây sau</text>
<line x1="60" y1="80" x2="470" y2="80" stroke="currentColor" stroke-width="2" />
<rect x="60" y="100" width="375" height="44" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<text x="50" y="128" font-size="13" text-anchor="end" fill="currentColor">50k</text>
<text x="50" y="197" font-size="13" text-anchor="end" fill="currentColor">cũ</text>
<line x1="60" y1="200" x2="470" y2="200" stroke="currentColor" stroke-width="2" />
<line x1="60" y1="80" x2="60" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="245" y1="80" x2="245" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="435" y1="80" x2="435" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="60" y1="123" x2="470" y2="123" stroke="#10b981" stroke-width="2" />
<text x="260" y="265" font-size="14" text-anchor="middle" fill="currentColor">Đọc sau write hoàn tất → thấy 50k</text>
<circle cx="245" cy="123" r="6" fill="currentColor"/>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="fd02-time-1-t fd02-time-1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="fd02-time-1-t">Giá trị đọc theo thời gian: eventual</title>
<desc id="fd02-time-1-d">Giá trị đọc theo thời gian: eventual</desc>
<text x="260" y="24" font-size="14" text-anchor="middle" fill="currentColor">Vợ ghi “mua rau 50k”; chồng đọc sau 0.1s</text>
<text x="60" y="58" font-size="14" text-anchor="middle" fill="currentColor">t0: ghi</text>
<text x="245" y="58" font-size="14" text-anchor="middle" fill="currentColor">+0.1s: đọc</text>
<text x="435" y="58" font-size="14" text-anchor="middle" fill="currentColor">vài giây sau</text>
<line x1="60" y1="80" x2="470" y2="80" stroke="currentColor" stroke-width="2" />
<rect x="60" y="100" width="375" height="44" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<text x="50" y="128" font-size="13" text-anchor="end" fill="currentColor">50k</text>
<text x="50" y="197" font-size="13" text-anchor="end" fill="currentColor">cũ</text>
<line x1="60" y1="200" x2="470" y2="200" stroke="currentColor" stroke-width="2" />
<line x1="60" y1="80" x2="60" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="245" y1="80" x2="245" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="435" y1="80" x2="435" y2="220" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<rect x="60" y="158" width="375" height="52" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b" />
<line x1="60" y1="192" x2="435" y2="192" stroke="#f59e0b" stroke-width="2" />
<line x1="435" y1="192" x2="435" y2="123" stroke="#10b981" stroke-width="2" />
<line x1="435" y1="123" x2="470" y2="123" stroke="#10b981" stroke-width="2" />
<text x="260" y="245" font-size="14" text-anchor="middle" fill="currentColor">Vùng cam: có thể đọc giá trị cũ</text>
<text x="260" y="272" font-size="14" text-anchor="middle" fill="currentColor">Hội tụ về 50k nếu không ghi thêm</text>
<circle cx="245" cy="192" r="6" fill="currentColor"/>
</svg>
<ab-note>Mốc t0 biểu diễn write đã hoàn tất; độ cao của đường là giá trị người đọc thấy.</ab-note>
<ab-note>Độ rộng vùng cam minh họa cửa sổ dữ liệu cũ, không phải cam kết về thời gian hội tụ.</ab-note>
</ab-toggle>

---

## 2. Bảng các models theo độ chặt chẽ

<svg viewBox="0 0 520 400" role="img" aria-labelledby="fd02fix-order-t fd02fix-order-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="fd02fix-order-t">Quan hệ giữa các consistency guarantee</title>
<desc id="fd02fix-order-d">Mũi tên chỉ quan hệ suy ra; hai session guarantee nằm ở hai nhánh riêng, eventual convergence là thuộc tính có thể kết hợp.</desc>
<rect x="125" y="18" width="270" height="36" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="260" y="41" font-size="13" text-anchor="middle" fill="currentColor">Linearizable (real-time)</text><path d="M260 54 L260 79" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-order-arrow)"/><rect x="125" y="80" width="270" height="36" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="260" y="103" font-size="13" text-anchor="middle" fill="currentColor">Sequential (cùng thứ tự)</text><path d="M260 116 L260 142" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-order-arrow)"/><rect x="125" y="143" width="270" height="36" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="260" y="166" font-size="13" text-anchor="middle" fill="currentColor">Causal (nhân quả)</text><path d="M210 179 L125 218" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-order-arrow)"/><path d="M310 179 L395 218" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-order-arrow)"/><rect x="25" y="220" width="200" height="38" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="125" y="244" font-size="13" text-anchor="middle" fill="currentColor">Read-your-writes</text><rect x="295" y="220" width="200" height="38" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="395" y="244" font-size="13" text-anchor="middle" fill="currentColor">Monotonic reads</text><text x="260" y="288" font-size="13" text-anchor="middle" fill="currentColor">Hai nhánh không suy ra lẫn nhau</text><rect x="65" y="313" width="390" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="260" y="339" font-size="13" text-anchor="middle" fill="currentColor">Eventual: hội tụ khi ngừng ghi</text><text x="260" y="382" font-size="13" text-anchor="middle" fill="currentColor">Hội tụ và session guarantee có thể kết hợp</text>
<defs><marker id="fd02fix-order-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker></defs>
</svg>

| # | Model | Đảm bảo | Đánh đổi |
|---|-------|---------|----------|
| 1 | **Linearizable** (strongest) | Mọi thao tác xuất hiện như xảy ra **tức thời** tại 1 thời điểm, theo đúng real-time order | Latency/availability đánh đổi khi nhiều replica; giao thức phải bảo đảm thứ tự |
| 2 | **Sequential** | Mọi node thấy thao tác **theo cùng 1 thứ tự**, nhưng không cần khớp real-time | Nhẹ hơn linearizable một chút |
| 3 | **Causal** | Nếu A xảy ra trước B (về mặt nhân-quả), mọi node phải thấy A trước B. Các thao tác không liên quan thì free order | Cần vector clock / dependency tracking |
| 4 | **Read-your-writes** | Một client luôn đọc được write của chính mình | Client khác có thể chưa thấy |
| 5 | **Monotonic reads** | Đọc lần sau ≥ đọc lần trước (không lùi) | Cần sticky session hoặc track version |
| 6 | **Eventual** (weakest) | Nếu ngừng write, sau "một lúc" mọi replica sẽ hội tụ | Không cam kết gì trong khoảng thời gian đó |

**Lưu ý**: 4, 5, 6 không loại trừ nhau — eventual + read-your-writes + monotonic reads gộp lại gọi là **session consistency**, là mức "vừa đủ dùng" cho phần lớn ứng dụng web.

---

## 3. Map vào AWS

### 3.1 DynamoDB

| Loại read | Model | RCU cost | Khi dùng |
|-----------|-------|----------|----------|
| **Eventually consistent read** (default) | Eventual | 0.5 RCU | Feed, listing, analytics — chấp nhận trễ vài ms |
| **Strongly consistent read** | Linearizable trong region | 1 RCU (gấp đôi) | Đọc số dư, kiểm tra tồn kho |
| **Transactional read** (`TransactGetItems`) | Serializable với các thao tác được AWS quy định (không gán cùng mức cho cả batch) | 2 RCU / item tới 4KB | Đọc nguyên tử nhiều item trong cùng region |
| **Global Tables** cross-region | **MREC**: eventual + LWW; **MRSC**: strong read xuyên region | — | Chọn mode/region và giới hạn tính năng phù hợp |

> Tại sao strongly consistent read **không khả dụng** cho GSI (Global Secondary Index)? Vì GSI được cập nhật bất đồng bộ từ base table — không có cách nào linearize. Đây là bẫy thi quen thuộc.

### 3.2 S3

- **Read-after-write** cho PUT mới: strong consistency (sau Dec 2020).
- **Read-after-overwrite (PUT cùng key)**: strong consistency.
- **Read-after-delete**: strong consistency.
- **Cross-region replication (CRR)**: eventual.
- **List operations**: strong consistency cho objects trong cùng bucket trong cùng region.

Trước 2020, S3 chỉ strong cho PUT mới, eventual cho overwrite/delete — nhiều câu hỏi thi cũ vẫn dựa trên model cũ → **luôn check năm xuất bản đề**.

### 3.3 RDS

- **Primary**: không chịu replication lag của read replica; dữ liệu đọc trong transaction vẫn phụ thuộc isolation level và snapshot, không gọi mọi read/write là linearizable.
- **Read Replica**: **eventual** — replication lag thường vài ms tới vài giây, có thể tới phút nếu primary write heavy.
- **Multi-AZ standby**: **không phục vụ read**. Chỉ đứng chờ failover. Sync replication → khi failover xong, không mất data đã commit.
- **Aurora Reader endpoint**: eventual, lag thường < 100ms vì shared storage.

> Bẫy thi: "scale read mà vẫn đọc được write vừa xong" không đạt bằng reader endpoint bất kỳ. Có thể đọc primary, hoặc chờ replica replay tới token rồi mở snapshot mới; hỗ trợ và chi phí tùy engine. Cache cũng không tự tạo strong consistency.

### 3.4 ElastiCache

- **Redis (cluster mode)** với replication: async → eventual. Replica có thể trả dữ liệu cũ.
- **MemoryDB for Redis**: sync Multi-AZ transaction log → đọc **primary** strong và write **durable**; đọc replica vẫn eventual. Đây là điểm khác biệt chính so với ElastiCache Redis.

### 3.5 Route 53

- DNS bản chất là eventual: propagation qua resolver chain tốn TTL.
- Health check + failover: **không phải** strong consistency, dựa vào polling.

### 3.6 Cognito / IAM

- IAM policy changes: eventual (thường < 1 phút, nhưng spec nói "có thể vài phút"). Không assume policy mới có hiệu lực ngay.
- Cognito: cần nêu rõ tính năng, API và cấu hình DR/replication đang dùng; không giả định có một chế độ user pool multi-region chung với bảo đảm consistency cố định.

---

## 4. Session consistency — pattern thực tế nhất

Phần lớn web app cần:
1. User của mình **luôn thấy** thay đổi của mình (read-your-writes).
2. Không bao giờ "lùi" thời gian (monotonic reads).
3. Người khác eventually thấy — vài trăm ms là OK.

**Cách implement trên AWS:**

| Tier | Kỹ thuật |
|------|----------|
| RDS Read Replica | Đọc primary sau write, hoặc chờ replica replay tới token write trước khi đọc. Sticky replica chưa nhận write không bảo đảm read-your-writes; N giây chỉ đủ nếu có bound lag tương ứng. |
| DynamoDB | Sau khi write, dùng strongly consistent read trong session đó. |
| S3 | GET hiện tại sau PUT hoàn tất đã strong trong cùng bucket. Version ID dùng khi cần đúng một phiên bản lịch sử, không phải workaround cho stale GET. |
| Caching | Cache-aside + invalidate giảm stale nhưng còn race; muốn session guarantee cần kiểm version hoặc đọc nguồn đã nhận write. |

<step-flow>
<svg viewBox="0 0 680 355" role="img" aria-labelledby="fd02fix-session-t fd02fix-session-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="fd02fix-session-t">Token chặn đọc replica chưa bắt kịp</title>
<desc id="fd02fix-session-d">Token chặn đọc replica chưa bắt kịp</desc>
<rect x="25" y="15" width="110" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="80" y="36" font-size="13" text-anchor="middle" fill="currentColor">Client</text><path d="M80 48 L80 335" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="255" y="15" width="110" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="310" y="36" font-size="13" text-anchor="middle" fill="currentColor">Primary</text><path d="M310 48 L310 335" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="535" y="15" width="110" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="590" y="36" font-size="13" text-anchor="middle" fill="currentColor">Replica</text><path d="M590 48 L590 335" fill="none" stroke="currentColor" stroke-width="1.5"/><g data-step="1">
<path d="M80 85 L310 85" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-session-arrow)"/><text x="195" y="74" font-size="13" text-anchor="middle" fill="currentColor">write v2</text><path d="M310 115 L80 115" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-session-arrow)"/><text x="195" y="105" font-size="13" text-anchor="middle" fill="currentColor">OK + token 500</text>
</g>
<g data-step="2">
<path d="M80 163 L590 163" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-session-arrow)"/><text x="335" y="152" font-size="13" text-anchor="middle" fill="currentColor">read với token 500</text><rect x="500" y="176" width="145" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="572" y="201" font-size="13" text-anchor="middle" fill="currentColor">replay 480 &lt; 500</text>
</g>
<g data-step="3">
<path d="M310 246 L590 246" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#fd02fix-session-arrow)"/><text x="450" y="236" font-size="13" text-anchor="middle" fill="currentColor">replay tới 500</text><rect x="500" y="259" width="145" height="32" rx="6" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="572" y="280" font-size="13" text-anchor="middle" fill="currentColor">500 ≥ token</text>
</g>
<g data-step="4">
<path d="M590 319 L80 319" fill="none" stroke="#10b981" stroke-width="1.5" marker-end="url(#fd02fix-session-arrow)"/><text x="335" y="308" font-size="13" text-anchor="middle" fill="currentColor">snapshot mới → v2</text>
</g>
<defs><marker id="fd02fix-session-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker></defs>
</svg>
<step-note data-step="1">Ghi hoàn tất trên primary trả token bao phủ write; sticky replica không thay thế token này.</step-note>
<step-note data-step="2">Replica đang ở 480 nên chưa được phục vụ read yêu cầu 500; timeout thì route primary.</step-note>
<step-note data-step="3">Chỉ khi replay đạt token mới mở snapshot đọc mới trên chính replica đó.</step-note>
<step-note data-step="4">Read thấy write đã xác nhận; các read tiếp theo giữ mốc version không thấp hơn để hỗ trợ monotonic reads.</step-note>
</step-flow>

---

## 5. Conflict resolution — khi eventual gặp ghi đồng thời

Eventual không miễn phí — bạn phải xử lý conflict khi 2 region cùng ghi 1 key:

| Chiến lược | AWS service dùng | Trade-off |
|------------|------------------|-----------|
| **Last-Writer-Wins (LWW)** theo timestamp | DynamoDB Global Tables | Đơn giản; có thể mất write nếu clock lệch |
| **Vector clock / version vector** | (Cassandra, Riak — không có service AWS thuần) | Chính xác hơn nhưng phức tạp |
| **CRDT** (Conflict-free Replicated Data Type) | Cấu trúc merge ở tầng ứng dụng; `ADD` DynamoDB không tự là CRDT cross-region | Auto-merge nhưng giới hạn data type |
| **Application-level reconciliation** | Bạn tự viết logic merge | Linh hoạt nhất, tốn công |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Last-Writer-Wins làm mất write âm thầm khi 2 region cùng ghi 1 key</title>
  <desc>Region us-east ghi giá trị A lúc timestamp 100, region eu-west ghi giá trị B lúc timestamp 101. Khi hai bản replicate gặp nhau, LWW giữ bản timestamp lớn hơn (B) và bỏ A — write của us-east biến mất không cảnh báo (lost update).</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Last-Writer-Wins theo timestamp — một write biến mất âm thầm</text>
  <rect x="16" y="44" width="300" height="74" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="32" y="68" font-size="12.5" font-weight="700" fill="currentColor">Region us-east</text>
  <text x="32" y="88" font-size="11.5" fill="currentColor">PUT key = A</text>
  <rect x="200" y="74" width="100" height="24" rx="6" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="250" y="90" font-size="11" text-anchor="middle" fill="#fff">ts = 100</text>
  <rect x="404" y="44" width="300" height="74" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="420" y="68" font-size="12.5" font-weight="700" fill="currentColor">Region eu-west</text>
  <text x="420" y="88" font-size="11.5" fill="currentColor">PUT key = B</text>
  <rect x="588" y="74" width="100" height="24" rx="6" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="638" y="90" font-size="11" text-anchor="middle" fill="#fff">ts = 101</text>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M166 118 L320 168"/>
    <path d="M554 118 L400 168"/>
  </g>
  <path d="M320 168 l-11 -1 l5 -9 z" fill="currentColor" fill-opacity="0.6"/>
  <path d="M400 168 l11 -1 l-5 -9 z" fill="currentColor" fill-opacity="0.6"/>
  <text x="360" y="142" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">replicate gặp nhau</text>
  <rect x="210" y="170" width="300" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="192" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">LWW: giữ ts lớn hơn → B (ts 101)</text>
  <text x="360" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">so sánh 100 vs 101</text>
  <rect x="210" y="236" width="300" height="32" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="257" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">A (ts 100) biến mất — lost update ✗</text>
</svg>

> Câu chuyện cảnh báo: **DynamoDB Global Tables LWW** — nếu 2 region cùng update item trong vòng vài chục ms, một bên sẽ **biến mất không cảnh báo**. Nếu logic của bạn cần "không bao giờ mất update" (ví dụ counter, balance) → **không dùng LWW**, định tuyến mỗi item về một writer, lưu sự kiện riêng để tổng hợp, hoặc chọn MRSC phù hợp. `ADD` chỉ atomic tại region nhận ghi; MREC vẫn LWW cho toàn item.

---

## 6. Ví dụ chọn model cho 4 use case

### 6.1 E-commerce checkout — kiểm tra tồn kho
- **Cần**: linearizable. Không được oversell.
- **Chọn**: DynamoDB strongly consistent read + `ConditionExpression` (optimistic locking), HOẶC Aurora với `SELECT ... FOR UPDATE`.

### 6.2 Like count trên post
- **Cần**: eventual ổn. Lệch vài giây không ai chết.
- **Chọn**: DynamoDB atomic counter (`UpdateItem ADD`) + DAX cache. Nếu dùng Global Tables MREC, không coi `ADD` là CRDT: concurrent increment cùng item ở nhiều region vẫn có thể mất. Dùng một writer hoặc counter riêng từng region rồi tổng hợp.

### 6.3 Profile editor (user sửa info của mình)
- **Cần**: read-your-writes. User sửa avatar xong, refresh phải thấy avatar mới.
- **Chọn**: Sau write, set cookie `last_write_ts`. Đọc primary hoặc chờ replica đạt token write; chỉ ghim N giây là giảm xác suất stale nếu chưa có bound lag. Hoặc dùng strongly consistent read trong DynamoDB.

### 6.4 Audit log
- **Cần**: monotonic, không mất event.
- **Chọn**: Kinesis / Kafka (ordered append-only) → S3 + Athena. Không bao giờ overwrite.

---

## 7. Cạm bẫy đề thi (SAA)

1. **"DynamoDB GSI strongly consistent"** → **Sai**, GSI luôn eventual.
2. **"Multi-AZ standby scale read"** → **Sai**, standby không serve traffic.
3. **"S3 eventual consistency for overwrite"** → Đáp án này từng đúng (trước Dec 2020) nhưng giờ sai. Đọc kỹ năm câu hỏi.
4. **"Aurora Reader Endpoint cho strong read"** → **Sai**, eventual (lag thấp nhưng có).
5. **"Global Tables strong consistency cross-region"** → **Có với MRSC**; MREC là eventual + LWW.
6. **"IAM policy change có hiệu lực ngay"** → **Eventual**. Đôi khi cần retry.

---

## 8. Tóm tắt 1 dòng

> **Consistency** gồm nhiều hợp đồng có thể kết hợp, không chỉ một dải tuyến tính. Việc chọn hợp đồng đánh đổi với **latency** và **availability**. Khi đi thi SAA, đừng chọn "strong" mặc định — hỏi: "use case này có thực sự cần linearizable không?"

---

## 9. Bài tập tự kiểm tra

1. Bạn build hệ thống bán vé concert (chống oversell). User check số ghế còn → đặt → confirm. Nên dùng consistency model nào ở mỗi bước?
2. DynamoDB tính 1 RCU cho strongly consistent read 4KB, 0.5 RCU cho eventually. Vì sao khác biệt đúng bằng 2x?
3. Bạn dùng RDS với 3 Read Replica. User báo "tôi vừa update profile mà refresh không thấy". Giải thích nguyên nhân và 2 cách fix.
4. Aurora Multi-Master (đã deprecated) cho phép write từ nhiều node. Vì sao AWS bỏ đi, và Global Database (single-writer) lại được giữ?
5. So sánh **MemoryDB** vs **ElastiCache Redis** ở góc độ consistency. Use case nào bắt buộc MemoryDB?

---

## 10. Đọc thêm

- *Designing Data-Intensive Applications* — Kleppmann, chương 5 (Replication) & 9 (Consistency and Consensus).
- Werner Vogels — *Eventually Consistent* (2008, ACM Queue) — kinh điển về tại sao Amazon chọn eventual.
- Jepsen analyses — đặc biệt bài về DynamoDB, MongoDB, Redis.
- AWS Builder's Library — *Caching challenges and strategies*.

---

**Bài tiếp theo**: [[foundations-03-replication-and-quorum]] — leader/follower, Paxos/Raft cơ bản, vì sao Aurora dùng quorum 4/6.
