# Foundations 01 — Định lý CAP (và PACELC)

> Mục tiêu: Hiểu **CAP** đủ sâu để chọn đúng database/architecture trên AWS, và biết tại sao "Multi-Region active-active" lại khó đến vậy.

---

## 1. Câu chuyện mở đầu — Hai chi nhánh ngân hàng mất liên lạc

Hãy tưởng tượng một ngân hàng có **2 chi nhánh** ở Hà Nội (HN) và TP.HCM (SG). Mỗi chi nhánh có 1 cuốn sổ ghi số dư tài khoản của bạn. Hai sổ phải **giống nhau** (consistent) và được đồng bộ qua đường truyền internet.

Một buổi sáng, **đường truyền giữa HN ↔ SG đứt** (network partition). Bạn cầm thẻ đến HN rút 10 triệu. Chi nhánh HN đứng trước 2 lựa chọn:

- **(A)** Cho rút ngay, ghi vào sổ HN. Sổ SG sẽ lệch cho đến khi đường truyền nối lại. → **Available** nhưng **không Consistent**.
- **(C)** Từ chối phục vụ cho đến khi liên lạc được với SG để xác nhận số dư mới nhất. → **Consistent** nhưng **không Available**.

**Bạn không có lựa chọn thứ ba**. Đó chính là CAP.

---

## 2. Định nghĩa chính xác

CAP nói rằng một **distributed system** chỉ có thể đảm bảo **2 trong 3** thuộc tính sau khi xảy ra sự cố mạng:

| Chữ | Nghĩa | Định nghĩa "khắt khe" |
|-----|-------|------------------------|
| **C** — Consistency | Mọi node đọc ra cùng dữ liệu mới nhất | Linearizability: sau khi write thành công, mọi read tiếp theo phải thấy giá trị đó |
| **A** — Availability | Mọi request đều nhận được response (không lỗi) | Node còn sống phải trả lời, không được "im lặng" hay từ chối |
| **P** — Partition tolerance | Hệ thống vẫn hoạt động khi mạng giữa các node bị chia cắt | Không sập toàn cục chỉ vì một link đứt |

### Hiểu lầm phổ biến

> "Tôi chọn CA, không cần P".

**Sai.** Trong hệ phân tán thực tế, **network partition là điều chắc chắn sẽ xảy ra** (cable đứt, switch hỏng, AZ mất kết nối). Bạn **không được chọn bỏ P** — bạn chỉ chọn được: **khi partition xảy ra, hy sinh C hay A?**

Vậy CAP thực chất chỉ là lựa chọn giữa **CP** và **AP**.

---

## 3. Bản đồ AWS theo CAP

| Service | Loại | Lý do |
|---------|------|-------|
| **DynamoDB** (default eventually consistent reads) | **AP** | Khi partition giữa các replica, vẫn nhận read/write; consistency hội tụ sau |
| **DynamoDB** (strongly consistent reads) | Nghiêng **CP** | Phải đọc từ leader partition; nếu leader unreachable → fail |
| **DynamoDB Global Tables** | **AP** | Multi-region active-active, last-writer-wins → có thể conflict |
| **S3** (sau 2020) | Strong read-after-write, nhưng vẫn nghiêng **AP** trong region | Sacrifices linearizability across all operations |
| **RDS Single-AZ** | Không phân tán → CAP không áp dụng trực tiếp | Một node, sập là sập |
| **RDS Multi-AZ** | **CP** | Standby chỉ phục vụ sau failover; trong lúc failover (60-120s) → unavailable |
| **Aurora** | **CP-leaning** | 6 copies / 3 AZ, write quorum 4/6, read quorum 3/6; ưu tiên consistency |
| **ElastiCache Redis Cluster** | **AP** hoặc **CP** tùy config | Async replication mặc định = AP |
| **MemoryDB** | **CP** | Synchronous Multi-AZ transaction log |
| **Kafka / MSK** | **CP** (mặc định `acks=all`) | Producer chờ ISR ack; nếu mất quorum → reject write |
| **Cassandra / Keyspaces** | **AP** (tunable) | Quorum có thể chỉnh; mặc định ưu tiên availability |

### Quy tắc nhanh khi đi thi SAA

- Câu hỏi nhắc **"low latency, global, eventual ok"** → AP → **DynamoDB Global Tables**, **S3 Cross-Region Replication**.
- Câu hỏi nhắc **"financial, no data loss, strong consistency"** → CP → **Aurora Multi-AZ**, **RDS Multi-AZ**, **DynamoDB strongly consistent reads**.
- Câu hỏi nhắc **"99.999% availability across regions"** → AP, chấp nhận conflict resolution.

---

## 4. Tại sao CAP chưa đủ — PACELC

CAP chỉ nói về **khi có partition (P)**. Nhưng phần lớn thời gian mạng **bình thường**, hệ thống vẫn phải đánh đổi giữa **Latency** và **Consistency**:

> **PACELC**: nếu **P**artition → chọn **A** hay **C**; **E**lse → chọn **L**atency hay **C**onsistency.

| Service | PACELC |
|---------|--------|
| DynamoDB | **PA / EL** — ưu tiên availability khi partition, ưu tiên latency khi bình thường |
| Aurora | **PC / EC** — luôn ưu tiên consistency |
| Cassandra | **PA / EL** |
| MongoDB (default) | **PA / EC** |

→ Khi bạn thấy DynamoDB trả về dữ liệu cũ vài trăm ms dù không có sự cố gì, đó là **EL** — nó đánh đổi consistency để có single-digit ms latency.

---

## 5. Liên hệ với các consistency models (sẽ học sau)

CAP/PACELC dẫn tới các "mức độ" consistency mà AWS hay nhắc:

- **Strong consistency** — đọc ra giá trị mới nhất ngay sau write. (DynamoDB strongly consistent read, S3 read-after-write, Aurora primary read)
- **Eventual consistency** — sau "một lúc", mọi replica hội tụ. (DynamoDB default, S3 cross-region, Route53)
- **Read-your-writes** — bạn luôn đọc được write của chính mình, nhưng user khác có thể chưa thấy. (DynamoDB session consistency, RDS read replica với sticky session)
- **Monotonic reads** — đọc lần sau không "lùi" so với lần trước.

Chi tiết sẽ ở bài [[foundations-02-consistency-models]].

---

## 6. Ví dụ thực chiến — chọn DB cho 3 use case

### 6.1 Hệ thống đặt vé máy bay (tránh oversell)
- **Cần**: không bao giờ bán quá số ghế.
- **Chọn**: **CP** — Aurora với transaction, hoặc DynamoDB với `ConditionExpression` + strongly consistent read.
- **Đánh đổi**: khi 1 AZ chết, vài chục giây không bán được. Chấp nhận.

### 6.2 Feed mạng xã hội
- **Cần**: luôn load được feed, dù dữ liệu hơi cũ.
- **Chọn**: **AP** — DynamoDB + DAX cache, hoặc Cassandra.
- **Đánh đổi**: bạn có thể thấy post bạn bè trễ 1-2 giây. Không ai chết.

### 6.3 Số dư tài khoản ngân hàng
- **Cần**: đúng tuyệt đối.
- **Chọn**: **CP** — Aurora Multi-AZ, transaction nghiêm ngặt. Không Multi-Region active-active cho bảng `accounts`.
- **Mẹo thực tế**: nhiều ngân hàng dùng kiến trúc lai — `accounts` ở CP, còn `notifications`, `audit_log` ở AP để giảm tải.

---

## 7. Cạm bẫy đề thi (SAA)

1. "Multi-Region active-active với strong consistency" — **không tồn tại** trên DynamoDB Global Tables. Đáp án thường là *eventual* + conflict resolution.
2. "Aurora Global Database cho write từ region phụ" — không, **chỉ region chính write**, region phụ read-only (trừ Aurora Global Write Forwarding, nhưng latency cao). Đó là lựa chọn CP.
3. "S3 strong read-after-write" — đúng cho **PUT/GET cùng key**, nhưng **không** đảm bảo cross-region.
4. "RDS Multi-AZ có tăng read throughput không?" — **Không**. Standby không phục vụ read. Muốn scale read → Read Replica (eventually consistent).

---

## 8. Tóm tắt 1 dòng

> Trong hệ phân tán, **partition là điều không tránh khỏi**. Bạn không chọn "có P hay không" — bạn chọn **khi P xảy ra, hy sinh Consistency hay Availability**. Và ngay cả khi mạng bình thường, bạn vẫn đánh đổi **Latency vs Consistency** mỗi ngày.

---

## 9. Bài tập tự kiểm tra

1. Một game leaderboard global, 100M user, accept dữ liệu trễ vài giây. Bạn chọn CP hay AP? Service nào trên AWS?
2. Tại sao DynamoDB strongly consistent read **tốn gấp đôi RCU** so với eventually consistent?
3. Aurora có 6 copies. Vì sao write quorum là 4/6 chứ không phải 6/6?
4. Một hệ thống claim "CA, không P" — đánh giá claim này.
5. Vì sao Kafka mặc định `acks=all` được xếp vào CP, dù producer vẫn có thể retry?

(Đáp án ở 01-cap-theorem-answers — sẽ viết sau.)

---

## 10. Đọc thêm

- Brewer (2000) — "Towards Robust Distributed Systems" (paper gốc CAP).
- Daniel Abadi (2012) — "Consistency Tradeoffs in Modern Distributed Database System Design" (PACELC).
- AWS Whitepaper — "Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service" (USENIX ATC 2022).
- Designing Data-Intensive Applications — Martin Kleppmann, chương 5 & 9.

---

**Bài tiếp theo**: [[foundations-02-consistency-models]] — đi sâu vào strong / eventual / causal / read-your-writes và map vào từng AWS service.
