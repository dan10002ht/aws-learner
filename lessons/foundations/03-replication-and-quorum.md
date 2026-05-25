# Foundations 03 — Replication & Quorum

> Mục tiêu: Hiểu **làm sao** một hệ phân tán giữ nhiều bản sao của dữ liệu mà vẫn đảm bảo consistency. Sau bài này bạn sẽ giải thích được vì sao Aurora dùng **quorum 4/6**, vì sao Multi-AZ failover mất 60-120s, và Paxos/Raft khác nhau ở đâu (mức "đủ để đi thi SAA và không bị lừa").

Tiền đề: [[01-cap-theorem]], [[02-consistency-models]]. Bài này trả lời "đánh đổi C/A xảy ra **trong code** thế nào".

---

## 1. Câu chuyện mở đầu — Họp gia đình quyết mua nhà

Gia đình bạn có 5 người. Mọi quyết định lớn cần "đồng thuận". Có 3 cách:

- **Cách 1 — Bố quyết hết (single leader)**: Nhanh, nhất quán, nhưng bố ốm là cả nhà tê liệt.
- **Cách 2 — Mọi người cùng quyết (multi-leader / multi-master)**: Linh hoạt, nhưng nếu mẹ ở Hà Nội đồng ý mua nhà A, bố ở SG đồng ý mua nhà B — ai đúng? Conflict.
- **Cách 3 — Đa số quyết (quorum)**: Cần ≥3/5 người đồng ý. Bố ốm vẫn quyết được, lại không có 2 quyết định đối lập (vì không thể đồng thời có ≥3 cho A và ≥3 cho B).

3 cách trên = **3 paradigm replication** trong hệ phân tán: **single-leader**, **multi-leader**, **quorum-based**. AWS dùng cả 3.

---

## 2. Single-leader (primary/replica)

### 2.1 Mô hình
- **1 node** nhận write (leader/primary/master).
- **N node** nhận read (follower/replica/standby), copy data từ leader.
- Khi leader chết → bầu leader mới (failover).

### 2.2 Replication mode

| Mode | Cách | Đảm bảo | Latency write |
|------|------|---------|---------------|
| **Synchronous** | Leader chờ tất cả replica ack rồi mới trả OK | Không mất data nếu leader chết | Cao (phụ thuộc replica chậm nhất) |
| **Asynchronous** | Leader trả OK ngay khi ghi local, replica sync sau | Mất data nếu leader chết trước khi replica nhận | Thấp |
| **Semi-sync** | Leader chờ ≥1 replica ack | Cân bằng | Trung bình |

### 2.3 Map vào AWS

| Service | Mode | Ghi chú |
|---------|------|---------|
| **RDS Multi-AZ** | Synchronous | Standby ở AZ khác. Failover 60-120s qua DNS swap. **Standby không serve read.** |
| **RDS Read Replica** | Asynchronous | Có thể cross-region. Lag từ ms tới phút. |
| **Aurora primary + reader** | Async, nhưng lag thấp (~20ms) | Shared storage → reader chỉ cần update cache, không replay log. |
| **DynamoDB** (single region) | Không phải single-leader cổ điển — partition có 3 replica với 1 leader/partition | Quorum-based, xem mục 4. |
| **ElastiCache Redis cluster** | Async mặc định | Có thể bật `min-replicas-to-write` cho semi-sync. |
| **MemoryDB** | Sync transaction log qua Multi-AZ | Khác ElastiCache: durable + strong consistency. |

### 2.4 Failover — đắt hơn bạn nghĩ

Khi leader chết, **failover không tức thời**:

1. Health check phát hiện leader chết (10-30s tùy config).
2. Bầu leader mới (vài giây nếu dùng Raft/Paxos; với RDS là promote standby).
3. Update routing (DNS TTL, service discovery).
4. Client retry, reconnect.

→ Trong khoảng này hệ thống **unavailable cho write**. Đây là cái giá của CP. Aurora rút xuống ~30s nhờ shared storage; RDS Multi-AZ vẫn 60-120s.

> 🪤 Bẫy thi: "Multi-AZ = high availability nghĩa là zero downtime"? **Sai.** Multi-AZ giảm RTO xuống phút, nhưng **không phải 0**. Muốn ~0 phải dùng Aurora với Global Database + warm standby hoặc active-active multi-region (eventual).

---

## 3. Multi-leader (multi-master)

### 3.1 Mô hình
- **Nhiều node** đều nhận write.
- Mỗi node propagate write tới các node khác.
- Phải có **conflict resolution** khi 2 node ghi cùng key.

### 3.2 Tại sao khó

- LWW (last-writer-wins) dễ mất update.
- Vector clock đắt.
- Multi-leader chỉ thắng single-leader khi cần **latency thấp ở nhiều region** và **chấp nhận eventual**.

### 3.3 AWS dùng ở đâu

| Service | Multi-leader? | Ghi chú |
|---------|---------------|---------|
| **DynamoDB Global Tables** | ✅ | LWW theo timestamp. Conflict → mất update âm thầm. |
| **Aurora Multi-Master** | ⚠️ Đã **deprecated** (2024) | Quá khó dùng, conflict nhiều. |
| **Aurora Global Database** | ❌ Single-writer | Region phụ read-only. Có Write Forwarding nhưng latency cao. |
| **S3 Multi-Region Access Points + CRR** | ✅ active-active | LWW theo timestamp object. |
| **CockroachDB / Spanner** (không phải AWS thuần) | Quorum cross-region, không phải multi-leader thuần |  |

> 💡 Pattern thực tế: dùng single-leader trong region (consistency), multi-leader giữa các region (availability). Đó chính là **DynamoDB Global Tables**.

---

## 4. Quorum-based replication

### 4.1 Công thức quan trọng nhất bài này

Với **N** replica, **W** = số node phải ack cho write, **R** = số node đọc:

> **W + R > N** → đảm bảo read luôn thấy write mới nhất (strong consistency).

Vì với W + R > N, mọi write quorum và mọi read quorum đều **có giao điểm ≥ 1 node** — node đó có giá trị mới nhất.

### 4.2 Aurora — N=6, W=4, R=3

Aurora lưu **6 copies / 3 AZ** (2 copies/AZ). Write quorum **4/6**, read quorum **3/6**.

- 4 + 3 = 7 > 6 → ✅ strong consistency.
- Mất **1 AZ (2 copies)** → vẫn còn 4 copies → write OK (4/4).
- Mất **1 AZ + 1 copy** = mất 3 → còn 3 → **write fail** (cần 4), nhưng **read vẫn OK** (cần 3).
- → Aurora chịu được **AZ failure mà không mất availability ghi**, và **AZ + 1 disk failure** mà không mất khả năng đọc.

> Đây là lý do AWS quảng cáo Aurora "11 nines of durability" — phải mất ≥4 copies cùng lúc (gần như impossible) mới mất data.

### 4.3 DynamoDB — N=3, W=2, R=1 (eventual) hoặc R=2 (strong)

DynamoDB chia table thành nhiều **partition**, mỗi partition có **3 replica** trong region.

- **Eventually consistent read**: R=1 → có thể đọc replica chưa sync → 0.5 RCU.
- **Strongly consistent read**: R=2 (thực chất đọc từ leader của partition) → 1 RCU.
- **Write**: W=2 (leader + 1 follower sync, follower thứ 3 async).

### 4.4 Kafka / MSK — ISR & acks

Kafka có khái niệm **ISR** (In-Sync Replicas):
- `acks=0`: producer không chờ → max throughput, có thể mất data.
- `acks=1`: chờ leader → mất data nếu leader chết trước khi sync.
- `acks=all`: chờ tất cả ISR → durable. Đây là **CP mode**.

`min.insync.replicas=2` + `acks=all` + replication factor 3 → mất 1 broker vẫn OK, mất 2 broker → write fail (CP đúng nghĩa).

---

## 5. Consensus — Paxos & Raft (mức SAA cần biết)

### 5.1 Vấn đề

Khi bầu leader, hoặc khi nhiều node phải đồng ý "giá trị X là cuối cùng", ta cần **consensus algorithm**. Naive voting không đủ vì có thể split-brain, message loss, node restart.

### 5.2 Paxos (Lamport, 1989)

- Đầu tiên & nổi tiếng.
- Cực khó implement đúng — "Paxos Made Live" (Google) là cả 1 bài paper kể khổ.
- Dùng trong: Google Chubby, Spanner.

### 5.3 Raft (2014)

- Thiết kế **để dễ hiểu** hơn Paxos.
- 3 vai trò: Leader / Follower / Candidate.
- Term-based: mỗi nhiệm kỳ có 1 leader. Khi leader mất, follower timeout → trở thành candidate → xin vote → nếu được majority → leader mới.
- Dùng trong: etcd (Kubernetes), Consul, **DynamoDB internals** (theo paper 2022), **Aurora storage layer**.

### 5.4 Điều bạn cần nhớ cho thi

- Bất kỳ "strong consistency multi-node" nào trên AWS đều có Paxos/Raft phía dưới. Bạn không gọi trực tiếp.
- Consensus cần **majority** (N/2 + 1). Vì sao N thường là **số lẻ**: 3, 5, 7. Với N=4, majority = 3 → chịu được 1 failure, **giống N=3**. Tăng N chẵn không giúp gì, lại tốn tiền.
- Consensus = trade latency for safety. Mỗi quyết định cần ≥1 round-trip → không thể "nhanh hơn tốc độ ánh sáng giữa các DC".

---

## 6. Vì sao cross-region strong consistency rất đắt

- 2 region cách nhau ~150ms RTT (vd: us-east-1 ↔ eu-west-1).
- Mỗi write strong cross-region cần ≥1 round-trip để đạt quorum → tối thiểu 150ms/write.
- 1000 write/s → cần connection pool khổng lồ, latency p99 thê thảm.

→ Đây là lý do **Aurora Global Database** chọn **single-writer** (chỉ region chính ghi, replica async). Spanner làm được multi-region strong nhờ TrueTime + atomic clock — không có service AWS tương đương.

---

## 7. Ví dụ chọn replication cho 3 use case

### 7.1 Hệ thống ngân hàng core — ledger
- **Cần**: zero data loss, strong consistency, chịu được AZ failure.
- **Chọn**: Aurora Multi-AZ (quorum 4/6), 1 region. Cross-region chỉ dùng Global Database **read-only** cho DR.

### 7.2 Game leaderboard global, 100M user
- **Cần**: latency thấp ở mọi region, accept dữ liệu trễ vài giây.
- **Chọn**: DynamoDB Global Tables (multi-leader, LWW). Counter dùng `ADD` (CRDT) để tránh mất update.

### 7.3 Kafka pipeline cho clickstream
- **Cần**: durable, ordered, throughput cao.
- **Chọn**: MSK với RF=3, `min.insync.replicas=2`, `acks=all`. Producer retry idempotent.

---

## 8. Cạm bẫy đề thi (SAA)

1. **"Tăng số Read Replica = tăng write throughput"** → **Sai.** Replica chỉ tăng read. Write vẫn qua 1 primary.
2. **"Multi-AZ + Read Replica thay thế nhau"** → **Sai.** Multi-AZ cho HA (standby không serve). Read Replica cho scale read (async, không phải HA).
3. **"Aurora 6 copies tốn 6x tiền"** → **Sai.** Bạn trả 1 unit storage, AWS tự quản 6 copies.
4. **"DynamoDB Global Tables strong consistency"** → **Sai.** Eventual + LWW.
5. **"Multi-AZ failover = zero downtime"** → **Sai.** 60-120s downtime cho RDS, ~30s cho Aurora.
6. **"Aurora Global Database có thể write ở 2 region"** → **Chỉ với Write Forwarding** (single writer thực sự ở primary region, request forward về). Đừng nhầm là multi-master.

---

## 9. Tóm tắt 1 dòng

> **Single-leader = đơn giản nhưng SPOF khi failover. Multi-leader = HA nhưng phải xử conflict. Quorum (W+R>N) = vũ khí trung dung mà Aurora & DynamoDB chọn.** Consensus (Raft/Paxos) là bộ não giữ cho mọi thứ trên không bị split-brain.

---

## 10. Bài tập tự kiểm tra

1. Aurora N=6, W=4, R=3. Hỏi: mất bao nhiêu copies thì **mất khả năng đọc**? Mất bao nhiêu thì **mất khả năng ghi**?
2. Vì sao quorum thường chọn N lẻ (3, 5, 7)? N=4 có lợi gì so với N=3?
3. Bạn có 1 RDS MySQL Multi-AZ + 3 Read Replica. Câu hỏi: nếu cần read latency < 5ms, đây có phải kiến trúc đúng? Nếu không, đề xuất gì?
4. Kafka producer set `acks=1`, RF=3, `min.insync.replicas=2`. Trường hợp nào có thể **mất message**?
5. Tại sao AWS không cho phép Aurora Global Database write ở 2 region đồng thời (kiểu DynamoDB Global Tables)? Đánh đổi nào ngăn cản?

---

## 11. Đọc thêm

- *Designing Data-Intensive Applications* — Kleppmann, chương 5 (Replication) & 9 (Consensus).
- *In Search of an Understandable Consensus Algorithm* — Ongaro & Ousterhout (Raft paper, 2014).
- *Amazon Aurora: Design Considerations* — SIGMOD 2017.
- *Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service* — USENIX ATC 2022.

---

**Bài tiếp theo**: [[04-latency-vs-consistency]] — vì sao Multi-Region active-active "trên giấy" đẹp mà thực tế đầy bẫy.
