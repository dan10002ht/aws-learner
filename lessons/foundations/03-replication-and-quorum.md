# Foundations 03 — Replication & Quorum

> Mục tiêu: Hiểu **làm sao** một hệ phân tán giữ nhiều bản sao của dữ liệu mà vẫn đảm bảo consistency. Sau bài này bạn sẽ giải thích được vì sao Aurora dùng **quorum 4/6**, vì sao Multi-AZ failover mất 60-120s, và Paxos/Raft khác nhau ở đâu (mức "đủ để đi thi SAA và không bị lừa").

Tiền đề: [[foundations-01-cap-theorem]], [[foundations-02-consistency-models]]. Bài này trả lời "đánh đổi C/A xảy ra **trong code** thế nào".

---

## 1. Câu chuyện mở đầu — Họp gia đình quyết mua nhà

Gia đình bạn có 5 người. Mọi quyết định lớn cần "đồng thuận". Có 3 cách:

- **Cách 1 — Bố quyết hết (single leader)**: Nhanh, nhất quán, nhưng bố ốm là cả nhà tê liệt.
- **Cách 2 — Mọi người cùng quyết (multi-leader / multi-master)**: Linh hoạt, nhưng nếu mẹ ở Hà Nội đồng ý mua nhà A, bố ở SG đồng ý mua nhà B — ai đúng? Conflict.
- **Cách 3 — Đa số quyết (quorum)**: Cần ≥3/5 người đồng ý. Bố ốm vẫn quyết được, lại không có 2 quyết định đối lập (vì không thể đồng thời có ≥3 cho A và ≥3 cho B).

3 cách trên = **3 paradigm replication** trong hệ phân tán: **single-leader**, **multi-leader**, **quorum-based**. AWS dùng cả 3.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba paradigm replication: single-leader, multi-leader, quorum</title>
  <desc>So sánh ba mô hình: single-leader có 1 node ghi và N node đọc; multi-leader có nhiều node cùng ghi gây conflict; quorum cần đa số node đồng ý để quyết.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Ba paradigm replication</text>
  <g>
    <rect x="12" y="40" width="224" height="268" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="124" y="62" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">1. Single-leader</text>
    <text x="124" y="80" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">1 ghi · N đọc</text>
    <rect x="92" y="92" width="64" height="30" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="124" y="112" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">Leader</text>
    <text x="180" y="110" font-size="10" fill="currentColor" opacity="0.7">write</text>
    <g stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#a1)">
      <path d="M104 122 L52 158"/>
      <path d="M124 122 L124 158"/>
      <path d="M144 122 L196 158"/>
    </g>
    <rect x="26" y="160" width="52" height="28" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="52" y="178" font-size="10.5" text-anchor="middle" fill="currentColor">replica</text>
    <rect x="98" y="160" width="52" height="28" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="124" y="178" font-size="10.5" text-anchor="middle" fill="currentColor">replica</text>
    <rect x="170" y="160" width="52" height="28" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="196" y="178" font-size="10.5" text-anchor="middle" fill="currentColor">replica</text>
    <text x="124" y="216" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">read từ replica</text>
    <text x="124" y="248" font-size="10.5" text-anchor="middle" fill="#10b981">+ nhất quán, đơn giản</text>
    <text x="124" y="268" font-size="10.5" text-anchor="middle" fill="#f59e0b">− leader chết = SPOF</text>
  </g>
  <g>
    <rect x="248" y="40" width="224" height="268" rx="10" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="62" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">2. Multi-leader</text>
    <text x="360" y="80" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">nhiều node cùng ghi</text>
    <rect x="282" y="96" width="64" height="30" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="314" y="116" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">node A</text>
    <text x="314" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ghi nhà A</text>
    <rect x="374" y="96" width="64" height="30" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="406" y="116" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">node B</text>
    <text x="406" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ghi nhà B</text>
    <g stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#a1)">
      <path d="M346 168 L374 168"/>
      <path d="M374 182 L346 182"/>
    </g>
    <rect x="320" y="156" width="80" height="40" rx="8" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">⚡ conflict</text>
    <text x="360" y="232" font-size="10.5" text-anchor="middle" fill="#10b981">+ HA, latency thấp</text>
    <text x="360" y="252" font-size="10.5" text-anchor="middle" fill="#f59e0b">− phải xử conflict</text>
    <text x="360" y="272" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(LWW dễ mất update)</text>
  </g>
  <g>
    <rect x="484" y="40" width="224" height="268" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="596" y="62" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">3. Quorum</text>
    <text x="596" y="80" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">đa số quyết (≥3/5)</text>
    <circle cx="540" cy="116" r="15" fill="#10b981" fill-opacity="0.9"/>
    <text x="540" y="120" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">✓</text>
    <circle cx="596" cy="108" r="15" fill="#10b981" fill-opacity="0.9"/>
    <text x="596" y="112" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">✓</text>
    <circle cx="652" cy="116" r="15" fill="#10b981" fill-opacity="0.9"/>
    <text x="652" y="120" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">✓</text>
    <circle cx="556" cy="158" r="15" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
    <circle cx="636" cy="158" r="15" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="596" y="196" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">3/5 đồng ý → quyết</text>
    <text x="596" y="232" font-size="10.5" text-anchor="middle" fill="#10b981">+ chịu node chết</text>
    <text x="596" y="252" font-size="10.5" text-anchor="middle" fill="#10b981">+ không 2 quyết đối lập</text>
    <text x="596" y="272" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Aurora · DynamoDB</text>
  </g>
  <defs>
    <marker id="a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor" fill-opacity="0.5"/></marker>
  </defs>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chuỗi thời gian failover của single-leader</title>
  <desc>Trục thời gian failover: leader chết, health check phát hiện sau 10 đến 30 giây, bầu leader mới, cập nhật routing qua DNS, client reconnect. Tổng cộng 60 đến 120 giây hệ thống không nhận được write.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Failover single-leader — vì sao mất 60-120s</text>
  <line x1="40" y1="70" x2="680" y2="70" stroke="currentColor" stroke-opacity="0.3"/>
  <polygon points="680,70 670,65 670,75" fill="currentColor" fill-opacity="0.4"/>
  <text x="680" y="62" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
  <rect x="40" y="78" width="612" height="26" rx="6" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="346" y="96" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">⛔ unavailable cho write (60-120s)</text>
  <g font-size="10.5" fill="currentColor">
    <g>
      <circle cx="64" cy="70" r="6" fill="#ef4444" fill-opacity="0.9"/>
      <line x1="64" y1="76" x2="64" y2="130" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="22" y="132" width="96" height="50" rx="7" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="70" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Leader chết</text>
      <text x="70" y="168" text-anchor="middle" opacity="0.7">t = 0</text>
    </g>
    <g>
      <circle cx="210" cy="70" r="6" fill="#f59e0b" fill-opacity="0.9"/>
      <line x1="210" y1="76" x2="210" y2="130" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="148" y="132" width="124" height="62" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="210" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Health check</text>
      <text x="210" y="167" text-anchor="middle">phát hiện chết</text>
      <text x="210" y="184" text-anchor="middle" opacity="0.7">~10-30s</text>
    </g>
    <g>
      <circle cx="350" cy="70" r="6" fill="#3b82f6" fill-opacity="0.9"/>
      <line x1="350" y1="76" x2="350" y2="130" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="290" y="132" width="120" height="62" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="350" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Bầu leader mới</text>
      <text x="350" y="167" text-anchor="middle">promote standby</text>
      <text x="350" y="184" text-anchor="middle" opacity="0.7">vài giây</text>
    </g>
    <g>
      <circle cx="490" cy="70" r="6" fill="#8b5cf6" fill-opacity="0.9"/>
      <line x1="490" y1="76" x2="490" y2="130" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="430" y="132" width="120" height="62" rx="7" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="490" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Update routing</text>
      <text x="490" y="167" text-anchor="middle">DNS TTL swap</text>
      <text x="490" y="184" text-anchor="middle" opacity="0.7">chờ TTL hết</text>
    </g>
    <g>
      <circle cx="632" cy="70" r="6" fill="#10b981" fill-opacity="0.9"/>
      <line x1="632" y1="76" x2="632" y2="130" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="568" y="132" width="124" height="62" rx="7" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="630" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Client reconnect</text>
      <text x="630" y="167" text-anchor="middle">write trở lại ✓</text>
      <text x="630" y="184" text-anchor="middle" opacity="0.7">retry + connect</text>
    </g>
  </g>
  <text x="360" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Mỗi bước cộng dồn độ trễ → DNS TTL thường là thủ phạm lớn nhất. Aurora ~30s nhờ shared storage.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vì sao W cộng R lớn hơn N đảm bảo giao điểm</title>
  <desc>Với 5 node, write quorum W bằng 3 và read quorum R bằng 3. Vì W cộng R bằng 6 lớn hơn N bằng 5, hai tập hợp luôn chồng lên nhau ít nhất 1 node chứa giá trị mới nhất.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">W + R &gt; N → luôn có node chung</text>
  <text x="360" y="44" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">Ví dụ: N=5, W=3, R=3 (3+3=6 &gt; 5)</text>
  <g>
    <text x="150" y="74" font-size="12" font-weight="700" text-anchor="middle" fill="#3b82f6">Write quorum (W=3)</text>
    <text x="150" y="91" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ghi vào 3 node — có giá trị MỚI</text>
  </g>
  <g>
    <text x="570" y="74" font-size="12" font-weight="700" text-anchor="middle" fill="#10b981">Read quorum (R=3)</text>
    <text x="570" y="91" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">đọc từ 3 node bất kỳ</text>
  </g>
  <g font-size="11.5" font-weight="700">
    <g>
      <circle cx="150" cy="150" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6" stroke-opacity="0.6"/>
      <text x="150" y="154" text-anchor="middle" fill="currentColor">N1</text>
    </g>
    <g>
      <circle cx="230" cy="150" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6" stroke-opacity="0.6"/>
      <text x="230" y="154" text-anchor="middle" fill="currentColor">N2</text>
    </g>
    <g>
      <circle cx="360" cy="150" r="30" fill="#8b5cf6" fill-opacity="0.22" stroke="#8b5cf6" stroke-opacity="0.8" stroke-width="2"/>
      <text x="360" y="148" text-anchor="middle" fill="currentColor">N3</text>
      <text x="360" y="164" font-size="8.5" font-weight="400" text-anchor="middle" fill="currentColor">chung</text>
    </g>
    <g>
      <circle cx="490" cy="150" r="26" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-opacity="0.6"/>
      <text x="490" y="154" text-anchor="middle" fill="currentColor">N4</text>
    </g>
    <g>
      <circle cx="570" cy="150" r="26" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-opacity="0.6"/>
      <text x="570" y="154" text-anchor="middle" fill="currentColor">N5</text>
    </g>
  </g>
  <path d="M120 150 a90 60 0 0 1 240 0" fill="none" stroke="#3b82f6" stroke-opacity="0.55" stroke-width="2"/>
  <text x="240" y="93" font-size="0" fill="none"/>
  <path d="M360 150 a90 60 0 0 1 240 0" fill="none" stroke="#10b981" stroke-opacity="0.55" stroke-width="2"/>
  <line x1="360" y1="180" x2="360" y2="225" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
  <rect x="232" y="226" width="256" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="246" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">N3 nằm trong CẢ HAI tập</text>
  <text x="360" y="263" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">→ read chắc chắn thấy giá trị mới nhất</text>
</svg>

### 4.2 Aurora — N=6, W=4, R=3

Aurora lưu **6 copies / 3 AZ** (2 copies/AZ). Write quorum **4/6**, read quorum **3/6**.

- 4 + 3 = 7 > 6 → ✅ strong consistency.
- Mất **1 AZ (2 copies)** → vẫn còn 4 copies → write OK (4/4).
- Mất **1 AZ + 1 copy** = mất 3 → còn 3 → **write fail** (cần 4), nhưng **read vẫn OK** (cần 3).
- → Aurora chịu được **AZ failure mà không mất availability ghi**, và **AZ + 1 disk failure** mà không mất khả năng đọc.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Aurora N=6, W=4, R=3 qua 3 AZ và khả năng chịu lỗi</title>
  <desc>Aurora lưu 6 copy trên 3 AZ, mỗi AZ 2 copy. Kịch bản mất 1 AZ còn 4 copy nên vẫn ghi được khi cần W=4. Kịch bản mất 1 AZ cộng 1 copy còn 3 copy nên không ghi được nhưng vẫn đọc được khi cần R=3.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Aurora: 6 copy / 3 AZ — W=4, R=3</text>
  <g font-size="10.5" text-anchor="middle">
    <text x="124" y="58" font-size="12.5" font-weight="700" fill="currentColor">Bình thường</text>
    <text x="124" y="74" fill="#10b981">6/6 → write &amp; read OK</text>
    <g>
      <rect x="20" y="84" width="208" height="62" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
      <text x="40" y="100" font-size="9.5" text-anchor="start" fill="currentColor" opacity="0.7">AZ-a</text>
      <circle cx="80" cy="118" r="13" fill="#10b981" fill-opacity="0.85"/><text x="80" y="122" fill="#fff" font-weight="700">✓</text>
      <circle cx="116" cy="118" r="13" fill="#10b981" fill-opacity="0.85"/><text x="116" y="122" fill="#fff" font-weight="700">✓</text>
    </g>
    <g>
      <rect x="20" y="84" width="208" height="62" rx="8" fill="none"/>
      <text x="148" y="100" font-size="9.5" fill="currentColor" opacity="0.7">AZ-b</text>
      <circle cx="148" cy="118" r="13" fill="#10b981" fill-opacity="0.85"/><text x="148" y="122" fill="#fff" font-weight="700">✓</text>
      <circle cx="184" cy="118" r="13" fill="#10b981" fill-opacity="0.85"/><text x="184" y="122" fill="#fff" font-weight="700">✓</text>
    </g>
    <text x="124" y="166" font-size="9.5" fill="currentColor" opacity="0.6">(AZ-c: 2 copy nữa, tổng 6)</text>
  </g>
  <g font-size="10.5" text-anchor="middle">
    <text x="360" y="200" font-size="12.5" font-weight="700" fill="currentColor">Mất 1 AZ (−2 copy)</text>
    <rect x="252" y="210" width="216" height="76" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <g>
      <text x="300" y="226" font-size="9" fill="currentColor" opacity="0.6">AZ chết</text>
      <circle cx="288" cy="248" r="12" fill="currentColor" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="3 2"/><text x="288" y="252" fill="#ef4444" font-weight="700">✕</text>
      <circle cx="320" cy="248" r="12" fill="currentColor" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="3 2"/><text x="320" y="252" fill="#ef4444" font-weight="700">✕</text>
    </g>
    <g>
      <circle cx="364" cy="248" r="12" fill="#10b981" fill-opacity="0.85"/><text x="364" y="252" fill="#fff" font-weight="700">✓</text>
      <circle cx="392" cy="248" r="12" fill="#10b981" fill-opacity="0.85"/><text x="392" y="252" fill="#fff" font-weight="700">✓</text>
      <circle cx="420" cy="248" r="12" fill="#10b981" fill-opacity="0.85"/><text x="420" y="252" fill="#fff" font-weight="700">✓</text>
      <circle cx="448" cy="248" r="12" fill="#10b981" fill-opacity="0.85"/><text x="448" y="252" fill="#fff" font-weight="700">✓</text>
    </g>
    <text x="360" y="278" font-size="10.5" fill="#10b981">còn 4/6 ≥ W=4 → vẫn GHI được ✓</text>
  </g>
  <g font-size="10.5" text-anchor="middle">
    <text x="596" y="58" font-size="12.5" font-weight="700" fill="currentColor">Mất AZ + 1 copy (−3)</text>
    <rect x="488" y="68" width="216" height="76" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <g>
      <circle cx="520" cy="106" r="12" fill="currentColor" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="3 2"/><text x="520" y="110" fill="#ef4444" font-weight="700">✕</text>
      <circle cx="548" cy="106" r="12" fill="currentColor" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="3 2"/><text x="548" y="110" fill="#ef4444" font-weight="700">✕</text>
      <circle cx="576" cy="106" r="12" fill="currentColor" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6" stroke-dasharray="3 2"/><text x="576" y="110" fill="#ef4444" font-weight="700">✕</text>
    </g>
    <g>
      <circle cx="612" cy="106" r="12" fill="#10b981" fill-opacity="0.85"/><text x="612" y="110" fill="#fff" font-weight="700">✓</text>
      <circle cx="640" cy="106" r="12" fill="#10b981" fill-opacity="0.85"/><text x="640" y="110" fill="#fff" font-weight="700">✓</text>
      <circle cx="668" cy="106" r="12" fill="#10b981" fill-opacity="0.85"/><text x="668" y="110" fill="#fff" font-weight="700">✓</text>
    </g>
    <text x="596" y="166" font-size="10.5" fill="#f59e0b">còn 3/6 &lt; W=4 → KHÔNG ghi</text>
    <text x="596" y="183" font-size="10.5" fill="#10b981">nhưng 3 ≥ R=3 → vẫn ĐỌC được ✓</text>
  </g>
  <text x="360" y="312" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">4+3=7 &gt; 6 → strong consistency · mất ≥4 copy mới mất data (11 nines durability)</text>
</svg>

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

**Bài tiếp theo**: [[foundations-04-latency-vs-consistency]] — vì sao Multi-Region active-active "trên giấy" đẹp mà thực tế đầy bẫy.
