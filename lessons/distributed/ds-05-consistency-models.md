# Bài 5 — Consistency models: từ linearizability tới eventual

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu **consistency model** thực chất là gì: một **hợp đồng** giữa hệ lưu trữ (nhiều bản sao) và ứng dụng, quy định *"đọc ra được giá trị nào là hợp lệ"*.
- Sắp xếp được **phổ nhất quán**: linearizability → sequential → causal → eventual, và nói rõ mỗi mức **bảo đảm gì / bỏ qua gì**.
- Phân biệt **data-centric** (linearizable, causal...) với **client-centric** (read-your-writes, monotonic reads/writes) và biết khi nào cần cái nào.
- Chỉ ra **anomaly cụ thể** mà mỗi mức yếu cho phép xảy ra — và vì sao **đa số hệ thực tế chọn mức yếu hơn** dù nghe "kém an toàn".

---

## 2. Lý thuyết

### 2.1 Consistency model là gì? — analogy tấm bảng trắng

Tưởng tượng một công ty có **nhiều chi nhánh**, mỗi chi nhánh giữ một **bản sao** của cùng một tấm bảng trắng ghi "số dư quỹ". Nhân viên ở mỗi nơi đều **đọc và ghi** lên bảng của chi nhánh mình, rồi các chi nhánh **đồng bộ** cho nhau qua điện thoại (mạng — có độ trễ, có thể trễ lâu).

Câu hỏi cốt lõi: **khi ai đó đọc bảng, họ được phép thấy giá trị nào?** Bắt buộc thấy con số mới nhất tuyệt đối? Hay được thấy con số cũ vài giây? Được thấy các cập nhật lộn xộn thứ tự không?

> **Consistency model** = tập các đảm bảo mà hệ thống hứa với người đọc/ghi về việc *các thao tác đọc-ghi trên dữ liệu được sao chép sẽ hiện ra theo trật tự nào*. Model càng **mạnh** → càng giống "chỉ có một bản sao duy nhất, cập nhật tức thì" → càng **dễ lập trình** nhưng càng **đắt** (latency cao, kém sẵn sàng khi network partition). Model càng **yếu** → càng nhanh và sẵn sàng, nhưng đẩy gánh nặng xử lý anomaly về phía lập trình viên.

Đây **không phải** consistency chữ C trong ACID (đó là ràng buộc toàn vẹn của transaction). Ở đây là **replication consistency** — trật tự hiển thị giữa nhiều bản sao.

### 2.2 Phổ nhất quán — bức tranh tổng thể

<svg viewBox="0 0 720 250" role="img" aria-labelledby="sp-t sp-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="sp-t">Phổ consistency từ mạnh tới yếu</title>
<desc id="sp-d">Thang từ linearizability mạnh nhất, tới sequential, causal, và eventual yếu nhất, đánh đổi giữa dễ lập trình và hiệu năng, sẵn sàng</desc>
<line x1="40" y1="60" x2="680" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#sp-a)"/>
<text x="40" y="40" font-size="12" fill="currentColor">Mạnh — dễ lập trình, đắt</text>
<text x="680" y="40" text-anchor="end" font-size="12" fill="currentColor">Yếu — nhanh, sẵn sàng cao</text>
<rect x="40" y="80" width="150" height="120" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="105" text-anchor="middle" font-size="13" fill="currentColor">Linearizability</text>
<text x="115" y="128" text-anchor="middle" font-size="10" fill="currentColor">như 1 bản sao</text>
<text x="115" y="145" text-anchor="middle" font-size="10" fill="currentColor">thứ tự thực (thời gian</text>
<text x="115" y="160" text-anchor="middle" font-size="10" fill="currentColor">thực) được tôn trọng</text>
<text x="115" y="185" text-anchor="middle" font-size="10" fill="currentColor">CP · quorum/consensus</text>
<rect x="205" y="80" width="150" height="120" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="280" y="105" text-anchor="middle" font-size="13" fill="currentColor">Sequential</text>
<text x="280" y="128" text-anchor="middle" font-size="10" fill="currentColor">1 thứ tự tổng chung</text>
<text x="280" y="145" text-anchor="middle" font-size="10" fill="currentColor">mọi node thấy giống</text>
<text x="280" y="160" text-anchor="middle" font-size="10" fill="currentColor">nhau; bỏ ràng buộc</text>
<text x="280" y="177" text-anchor="middle" font-size="10" fill="currentColor">real-time</text>
<rect x="370" y="80" width="150" height="120" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="105" text-anchor="middle" font-size="13" fill="currentColor">Causal</text>
<text x="445" y="128" text-anchor="middle" font-size="10" fill="currentColor">nhân-quả được giữ</text>
<text x="445" y="145" text-anchor="middle" font-size="10" fill="currentColor">thao tác độc lập có</text>
<text x="445" y="160" text-anchor="middle" font-size="10" fill="currentColor">thể thấy khác thứ tự</text>
<rect x="535" y="80" width="150" height="120" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="105" text-anchor="middle" font-size="13" fill="currentColor">Eventual</text>
<text x="610" y="128" text-anchor="middle" font-size="10" fill="currentColor">chỉ hứa: ngừng ghi</text>
<text x="610" y="145" text-anchor="middle" font-size="10" fill="currentColor">đủ lâu thì các bản</text>
<text x="610" y="160" text-anchor="middle" font-size="10" fill="currentColor">sao hội tụ giống nhau</text>
<text x="610" y="185" text-anchor="middle" font-size="10" fill="currentColor">AP · Dynamo/Cassandra</text>
<text x="360" y="235" text-anchor="middle" font-size="11" fill="currentColor">Mỗi mức bên phải là tập LỎNG hơn của mức bên trái: mạnh hơn ⇒ bao hàm mọi đảm bảo của yếu hơn</text>
<defs><marker id="sp-a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Linearizability — mức mạnh nhất

> **Linearizability** (còn gọi *atomic consistency* / *strong consistency*): hệ thống hành xử **y như thể chỉ có một bản sao duy nhất** và **mọi thao tác diễn ra tức thời tại một điểm** nằm giữa lúc client gọi và lúc nhận kết quả. Thứ tự tuyến tính đó phải **tôn trọng thời gian thực**: nếu thao tác A kết thúc *trước khi* B bắt đầu (theo đồng hồ tường), thì trong thứ tự chung A phải đứng trước B.

Hệ quả then chốt — **recency guarantee**: một khi một `write(x=1)` đã hoàn thành, **mọi** đọc sau đó (dù từ bất kỳ client/replica nào) **bắt buộc** thấy `x=1` hoặc giá trị mới hơn, không bao giờ thấy giá trị cũ. Đây là điều làm nó "như một máy".

**Vì sao đắt:** để không một reader nào thấy giá trị cũ, mỗi lần đọc/ghi thường phải phối hợp qua **quorum** hoặc qua **consensus (Raft/Paxos)** — trả giá bằng round-trip mạng. Và theo định lý CAP, khi có **network partition** hệ linearizable **phải hy sinh availability** (từ chối phục vụ để không trả về dữ liệu sai) — nó là hệ **CP**.

Ví dụ dùng thật: bầu leader (chỉ một leader tại một thời điểm), khóa phân tán (distributed lock), bộ đếm cấp phát ID duy nhất, cờ "đã thanh toán chưa". Những chỗ mà **đọc trúng giá trị cũ = sai nghiệp vụ nghiêm trọng**.

### 2.4 Sequential consistency — bỏ ràng buộc thời gian thực

> **Sequential consistency** (Lamport, 1979): tồn tại **một thứ tự tổng (total order) duy nhất** cho tất cả thao tác, **mọi process đều thấy cùng thứ tự đó**, và thứ tự các thao tác *của riêng một process* được giữ nguyên. **Nhưng** thứ tự tổng đó **không bắt buộc khớp với thời gian thực** giữa các process khác nhau.

Khác biệt với linearizability nằm đúng ở chỗ real-time: với sequential, một write vừa hoàn tất trên process P1 có thể **chưa** hiện ra với P2 ngay lập tức — miễn là *khi* nó hiện ra, thứ tự tổng vẫn nhất quán với mọi người. Nói cách khác: mọi người xem cùng một cuốn phim, nhưng cuốn phim đó có thể "chậm" so với đồng hồ thật. Trên thực tế ranh giới này ít khi được dùng trực tiếp (đa số hệ chọn thẳng linearizable hoặc rớt xuống causal/eventual), nhưng nó là **bậc thang khái niệm** quan trọng: linearizability = sequential **cộng thêm** ràng buộc real-time.

### 2.5 Causal consistency — chỉ giữ nhân-quả

> **Causal consistency**: chỉ những thao tác có quan hệ **nhân-quả** (happens-before của Lamport) mới bắt buộc hiện ra **đúng thứ tự** với mọi người. Các thao tác **concurrent** (không nhân-quả với nhau) thì các replica được phép thấy theo thứ tự khác nhau.

Quan hệ nhân-quả phát sinh khi: (a) cùng một process làm A rồi B; hoặc (b) B "đọc thấy" kết quả của A rồi mới ghi (ví dụ: đọc câu hỏi xong mới viết câu trả lời). Trực giác đời thường: **câu trả lời không được xuất hiện trước câu hỏi**; nhưng hai bình luận độc lập của hai người lạ thì hiện A-trước-B hay B-trước-A đều chấp nhận được.

Đây là **điểm ngọt** của rất nhiều hệ hiện đại: causal là **mức mạnh nhất vẫn còn giữ được availability khi partition** (hệ có thể tiếp tục phục vụ, dùng vector clock / dependency tracking để không đảo nhân-quả). Nó chặn được các anomaly khó chịu nhất mà eventual cho phép, mà không phải trả giá đồng bộ toàn cục như linearizable.

### 2.6 Eventual consistency — chỉ hứa hội tụ

> **Eventual consistency**: đảm bảo *duy nhất* là — **nếu ngừng mọi write đủ lâu, cuối cùng tất cả bản sao sẽ hội tụ về cùng một giá trị**. Không hứa gì về *khi nào*, cũng không hứa gì về thứ tự đọc trong lúc chờ.

Đây là mức yếu nhất còn có ích. Trong "khoảng chờ hội tụ", reader có thể thấy giá trị cũ, thấy đảo thứ tự, thậm chí đọc lần sau lại "lùi về" giá trị cũ hơn lần trước. Bù lại: **latency thấp nhất, availability cao nhất** (mọi replica luôn nhận đọc/ghi kể cả khi mất liên lạc với phần còn lại). Đây là lựa chọn của Dynamo, Cassandra, Riak, DNS, và hầu hết cache. Để xử lý xung đột khi hội tụ, các hệ dùng **last-write-wins** (theo timestamp — có thể mất dữ liệu), **vector clock** (phát hiện xung đột rồi để app/CRDT hòa giải), hoặc **CRDT** (kiểu dữ liệu tự hội tụ không xung đột).

### 2.7 Bảng so sánh nhanh

| Model | Đảm bảo cốt lõi | Real-time? | Còn available khi partition? | Anomaly còn cho phép |
|-------|-----------------|:----------:|:----------------------------:|----------------------|
| **Linearizability** | Như 1 bản sao, đọc luôn thấy mới nhất | Có | Không (CP) | Không (mạnh nhất) |
| **Sequential** | 1 total order chung cho mọi node | Không | Không | Đọc giá trị cũ vẫn hợp lệ nếu toàn hệ cùng "cũ" |
| **Causal** | Giữ đúng thứ tự nhân-quả | Không | **Có** | Thao tác concurrent thấy khác thứ tự |
| **Eventual** | Ngừng ghi đủ lâu thì hội tụ | Không | **Có** | Đọc cũ, đảo thứ tự, đọc "lùi" |

---

## 3. Client-centric consistency — góc nhìn từ một người dùng

Bốn model trên là **data-centric**: nói về trật tự toàn hệ. Nhưng nhiều lúc ta chỉ cần bảo đảm cho **trải nghiệm của một client cụ thể** — rẻ hơn nhiều mà vẫn "cảm giác đúng". Đây là **session guarantees** (Terry et al., Bayou):

| Guarantee | Hứa gì | Anomaly nó chặn |
|-----------|--------|-----------------|
| **Read-your-writes** | Sau khi bạn ghi, chính bạn đọc lại **luôn thấy** ghi đó (hoặc mới hơn) | Đổi avatar xong reload lại thấy avatar cũ |
| **Monotonic reads** | Nếu bạn đã đọc thấy giá trị v, các lần đọc sau **không lùi** về trước v | Đọc lần 1 thấy tin nhắn, F5 thấy nó biến mất |
| **Monotonic writes** | Các write của **cùng một client** được áp dụng đúng thứ tự bạn phát ra | Cập nhật A rồi B, hệ áp B trước A |
| **Writes-follow-reads** | Nếu bạn ghi B sau khi đọc A, mọi nơi thấy A trước rồi mới B | Trả lời hiện ra trước câu hỏi bạn đã đọc |

Điểm hay: bốn thứ này **chỉ ràng buộc trong phạm vi một session/client**, không đòi hỏi đồng bộ toàn cục → cực rẻ. Cách hiện thực phổ biến: **sticky session** (ghim client vào một replica) hoặc mang theo **version/token** của lần ghi cuối trong request để chọn replica đủ mới.

<svg viewBox="0 0 680 260" role="img" aria-labelledby="ryw-t ryw-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ryw-t">Anomaly vi phạm read-your-writes khi thiếu sticky session</title>
<desc id="ryw-d">Client ghi lên replica leader, rồi request đọc bị định tuyến tới replica follower chưa kịp đồng bộ nên thấy giá trị cũ</desc>
<rect x="20" y="110" width="90" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="137" text-anchor="middle" font-size="13" fill="currentColor">Client</text>
<rect x="300" y="30" width="150" height="45" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="375" y="52" text-anchor="middle" font-size="12" fill="currentColor">Replica A (leader)</text>
<text x="375" y="68" text-anchor="middle" font-size="11" fill="currentColor">avatar = new</text>
<rect x="300" y="185" width="150" height="45" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="375" y="207" text-anchor="middle" font-size="12" fill="currentColor">Replica B (follower)</text>
<text x="375" y="223" text-anchor="middle" font-size="11" fill="currentColor">avatar = old (chưa sync)</text>
<line x1="110" y1="120" x2="298" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ry-a)"/>
<text x="205" y="80" text-anchor="middle" font-size="11" fill="currentColor">1. write(new)</text>
<line x1="110" y1="145" x2="298" y2="205" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#ry-a)"/>
<text x="205" y="185" text-anchor="middle" font-size="11" fill="#f43f5e">2. read → old!</text>
<line x1="375" y1="75" x2="375" y2="185" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" marker-end="url(#ry-a)"/>
<text x="470" y="135" font-size="11" fill="currentColor">replication</text>
<text x="470" y="150" font-size="11" fill="currentColor">còn đang trễ</text>
<defs><marker id="ry-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 4. Các anomaly cụ thể — thấy tận mắt mới nhớ

### 4.1 Stale read (vi phạm linearizability)

Kịch bản kinh điển "trận đấu bóng đá": Alice và Bob ngồi cạnh nhau. Kết quả trận vừa cập nhật lên DB (leader). Alice F5 → request tới replica đã đồng bộ → thấy **"Đội nhà thắng"**. Bob F5 sau đó vài giây → request rơi vào replica **lag** → vẫn thấy **"đang đá"**. Cùng một thời điểm, hai người thấy hai sự thật khác nhau, và người đọc *sau* lại thấy dữ liệu *cũ hơn*. Linearizability cấm điều này; eventual cho phép.

### 4.2 Đảo thứ tự nhân-quả (vi phạm causal)

Trên diễn đàn replicate kiểu eventual:
- Alice post câu hỏi *"Chỗ để chìa khóa ở đâu?"* (ghi vào replica 1).
- Bob **đọc thấy** câu hỏi, trả lời *"Trong ngăn kéo"* (ghi vào replica 2).
- Replica 2 đẩy câu trả lời của Bob sang replica 3 **nhanh hơn** đường replica 1 → câu hỏi.
- Carol nhìn replica 3: thấy *"Trong ngăn kéo"* mà **chưa có câu hỏi nào** → vô nghĩa.

Câu trả lời **nhân-quả phụ thuộc** câu hỏi (Bob đọc rồi mới viết) nên đây là anomaly thật. **Causal consistency** chặn được vì nó theo dõi dependency; eventual thuần thì không.

### 4.3 Non-monotonic read (đọc bị "lùi")

Bạn mở hộp thư, thấy 5 email. Kéo refresh → còn 4 email (request lần này trúng replica lag hơn lần trước). Dữ liệu như "đi lùi thời gian". **Monotonic reads** chặn được bằng cách đảm bảo các lần đọc kế tiếp không bao giờ dùng replica cũ hơn replica đã phục vụ trước đó.

---

## 5. Vì sao đa số hệ chọn mức yếu hơn?

Nghe "eventual" thấy đáng sợ, nhưng phần lớn hệ production **cố tình** không chọn linearizability. Lý do rất thực tế:

1. **Latency.** Linearizable đọc/ghi cần phối hợp qua quorum/consensus → cộng thêm round-trip mạng vào **mọi** request. Với hệ đa vùng (cross-region, RTT 100–200ms), ép mọi write đồng bộ toàn cầu là không chịu nổi cho trải nghiệm người dùng. Eventual/causal cho phép phục vụ tại replica gần nhất → độ trễ vài ms.

2. **Availability & CAP/PACELC.** Khi có **partition**, hệ linearizable (CP) phải **từ chối phục vụ** phần thiểu số để khỏi trả dữ liệu sai. Nhiều nghiệp vụ (giỏ hàng, like, feed, telemetry) thà **nhận ghi và hội tụ sau** còn hơn báo lỗi cho người dùng — họ chọn AP. PACELC bổ sung: *ngay cả khi không partition*, vẫn có đánh đổi **Latency vs Consistency** cho mỗi request.

3. **Đa số dữ liệu chịu được cũ vài giây.** Số like, view count, "đang online", timeline mạng xã hội — sai lệch tạm thời không gây hại. Chỉ một phần nhỏ dữ liệu (số dư, tồn kho lúc checkout, khóa, leader) mới thật sự cần strong.

> **Nguyên tắc thực chiến:** đừng đặt cả hệ vào một mức. Hãy chọn consistency **theo từng loại dữ liệu**: strong (linearizable) cho tiền/khóa/định danh; causal cho bình luận/hội thoại; eventual cho counter/feed/cache. Trả đúng giá cho đúng chỗ cần.

Bảng ra quyết định:

| Nếu dữ liệu... | Chọn mức | Ví dụ hệ |
|----------------|----------|----------|
| Sai = mất tiền/nhân đôi/khóa hỏng | Linearizable | etcd, ZooKeeper, Spanner, DB primary + quorum read |
| Cần nhân-quả đúng (chat, comment) | Causal | COPS, MongoDB (causal session), Cosmos DB (bounded/session) |
| Chịu được cũ, cần luôn sống & nhanh | Eventual (+ client-centric) | Cassandra, DynamoDB (default), Riak, DNS, CDN |

---

## 6. Ví dụ đọc/ghi bằng con số — chỉnh mức nhất quán trong code

Nhiều hệ cho **chọn mức consistency ngay tại từng request**. Cassandra là ví dụ rõ nhất: mức nhất quán = cách bạn đặt `CONSISTENCY` cho đọc và ghi trên `N` bản sao. Với **quorum** hai chiều thỏa `R + W > N` bạn có được **read-your-writes / strong-ish read**; nếu `R + W ≤ N` bạn rớt xuống eventual.

```sql
-- Cassandra: N = RF = 3 (3 bản sao mỗi partition)
-- (a) Ghi & đọc EVENTUAL: nhanh nhất, có thể đọc trúng bản cũ
CONSISTENCY ONE;                 -- W=1: chỉ cần 1 replica ack
INSERT INTO balances (user, amount) VALUES ('u1', 100);
CONSISTENCY ONE;                 -- R=1: đọc từ 1 replica bất kỳ (có thể lag)
SELECT amount FROM balances WHERE user = 'u1';

-- (b) Ghi & đọc STRONG-ish: quorum overlap đảm bảo thấy write mới nhất
--     W = QUORUM = 2, R = QUORUM = 2, N = 3  =>  R + W = 4 > 3  => giao nhau
CONSISTENCY QUORUM;              -- W=2: 2/3 replica phải ack mới coi là ghi xong
INSERT INTO balances (user, amount) VALUES ('u1', 100);
CONSISTENCY QUORUM;              -- R=2: đọc 2/3, chắc chắn có 1 replica giữ bản mới nhất
SELECT amount FROM balances WHERE user = 'u1';
```

Vì sao `R + W > N` cho đọc thấy giá trị mới: tập `W` replica đã ghi và tập `R` replica được đọc **bắt buộc giao nhau** ít nhất một replica → replica giao đó giữ giá trị mới nhất → đọc thấy được. Lưu ý: quorum overlap cho **read-your-writes** nhưng **không** cho linearizability đầy đủ (không có ràng buộc real-time chặt giữa các client khác nhau, còn cần cơ chế như Paxos/lightweight transaction `IF` để có tuyến tính thật).

MongoDB thể hiện đúng phổ bằng hai tham số `writeConcern` và `readConcern`:

```javascript
// STRONG: ghi phải được ghi bền trên đa số replica, đọc chỉ thấy dữ liệu đã commit đa số
db.orders.insertOne(
  { _id: 42, status: "PAID" },
  { writeConcern: { w: "majority" } }          // W = majority
);
db.orders.findOne(
  { _id: 42 },
  { readConcern: { level: "linearizable" } }    // đọc tuyến tính hoá (đắt nhất)
);

// CAUSAL: rẻ hơn linearizable, vẫn đảm bảo read-your-writes + monotonic trong 1 session
const session = db.getMongo().startSession({ causalConsistency: true });
const c = session.getDatabase("shop").orders;
c.insertOne({ _id: 43, status: "PAID" }, { writeConcern: { w: "majority" } });
c.findOne({ _id: 43 }, { readConcern: { level: "majority" } }); // chắc chắn thấy write vừa rồi
```

`readConcern: "linearizable"` bắt hệ xác nhận replica đọc vẫn là leader hợp lệ (tránh đọc từ leader cũ đã bị thay) → chậm hơn nhưng đúng recency. `causalConsistency: true` chỉ mang theo cluster time / operation time trong session để chọn snapshot đủ mới — đúng tinh thần client-centric ở mục 3.

---

## 7. Tóm tắt
- **Consistency model** là hợp đồng về *trật tự đọc-ghi hợp lệ* trên dữ liệu được sao chép — càng mạnh càng giống "một máy", càng dễ code nhưng càng đắt và kém sẵn sàng.
- Phổ data-centric: **linearizability** (như một bản sao, tôn trọng real-time, recency tuyệt đối, CP) → **sequential** (một total order chung, bỏ real-time) → **causal** (chỉ giữ nhân-quả, mức mạnh nhất còn available khi partition) → **eventual** (chỉ hứa hội tụ, AP, nhanh nhất).
- **Client-centric** (read-your-writes, monotonic reads/writes, writes-follow-reads) bảo đảm trải nghiệm cho **một session** với chi phí rất thấp — thường đủ để "cảm giác đúng".
- Mỗi mức yếu mở cửa cho **anomaly cụ thể**: stale read, đảo nhân-quả (câu trả lời trước câu hỏi), đọc bị lùi (non-monotonic).
- **Đa số hệ chọn mức yếu hơn** vì latency, availability (CAP/PACELC), và vì phần lớn dữ liệu chịu được cũ vài giây. Bí quyết: **chọn mức theo từng loại dữ liệu**, không ép cả hệ vào một mức.
- Trong thực tế bạn **chỉnh mức ngay tại request**: quorum `R + W > N` (Cassandra), `writeConcern`/`readConcern` (MongoDB).

> **Bài tiếp theo (Bài 6):** để *đo được* nhân-quả mà causal consistency dựa vào, ta cần công cụ sắp thứ tự sự kiện không cần đồng hồ chung — **logical clock & vector clock, quan hệ happens-before**.
