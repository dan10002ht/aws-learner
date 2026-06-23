# SAA Ch2.2 — Storage Performance

> Mục tiêu: Chọn đúng storage type cho từng workload (block / object / file / archive) và tune **IOPS, throughput, latency** theo SLA. Hiểu vì sao EBS gp3 thay thế gp2, khi nào dùng FSx for Lustre thay vì EFS, và S3 throughput "vô hạn" thực sự nghĩa là gì.

Tiền đề: [[ch2-01-compute-performance]], [[foundations-05-partitioning-and-sharding]], CLF [[05-s3]].

---

## 1. Câu chuyện mở đầu — Database "chậm vì disk"

DBA báo: Postgres p99 query latency 200ms, target 20ms. CPU chỉ 40%, RAM dư. `iostat` cho thấy **`%util = 99%`, `await = 50ms`** trên `/data`.

→ Đây là **disk-bound**, không phải compute-bound. Thêm CPU không giúp. Cần:
- Tăng IOPS (gp3 → io2, hoặc tăng provisioned IOPS).
- Hoặc đổi family sang `i` series (NVMe instance store) cho IOPS cực cao.
- Hoặc cache: PgBouncer, app-level caching, Aurora Reader.

**Quy tắc 0**: storage performance = (IOPS, throughput, latency, durability, cost). Không có "tốt nhất", chỉ có "phù hợp profile workload".

---

## 2. Bốn loại storage chính

| Loại | AWS service | Truy cập | Đặc trưng |
|------|-------------|----------|-----------|
| **Block** | EBS, Instance Store | Attach 1 instance (EBS Multi-Attach = nhiều) | OS thấy như disk, format filesystem |
| **File** | EFS, FSx (Lustre/Windows/NetApp/OpenZFS) | NFS/SMB, nhiều client | Hierarchy, shared filesystem |
| **Object** | S3, S3 Glacier variants | HTTP API | Key-value, immutable, scale ∞ |
| **Archive** | S3 Glacier (Instant/Flexible/Deep) | API + retrieval time | Cực rẻ, retrieval phút-giờ |

### Quy tắc chọn nhanh

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định chọn loại storage trên AWS</title>
  <desc>Cây quyết định: cần truy cập kiểu nào? Block một instance thì chọn EBS hoặc Instance Store; chia sẻ file nhiều client thì chọn EFS, FSx for Windows hoặc FSx for Lustre; lưu object qua API thì chọn S3 hoặc S3 Glacier theo tần suất truy cập.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Chọn loại storage — cây quyết định</text>

  <defs>
    <marker id="stArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 z" fill="currentColor" fill-opacity="0.5"/></marker>
  </defs>

  <rect x="276" y="40" width="168" height="42" rx="9" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="59" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Kiểu truy cập?</text>
  <text x="360" y="75" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">block / file / object</text>

  <g stroke="currentColor" stroke-opacity="0.45" fill="none">
    <path d="M300 82 C200 110 130 110 130 132" marker-end="url(#stArr)"/>
    <path d="M360 82 v50" marker-end="url(#stArr)"/>
    <path d="M420 82 C590 110 590 110 590 132" marker-end="url(#stArr)"/>
  </g>
  <text x="150" y="106" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.8">Block (1 máy)</text>
  <text x="360" y="106" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">File (nhiều client)</text>
  <text x="580" y="106" font-size="10.5" font-weight="700" text-anchor="end" fill="currentColor" opacity="0.8">Object (API)</text>

  <rect x="44" y="132" width="172" height="58" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="130" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cần bền (persist)?</text>
  <text x="130" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Có → EBS · Không (cache,</text>
  <text x="130" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">scratch) → Instance Store</text>

  <rect x="276" y="132" width="168" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Protocol / workload?</text>
  <text x="360" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Linux NFS · Windows SMB</text>
  <text x="360" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">· HPC/ML throughput cao</text>

  <rect x="504" y="132" width="172" height="58" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="590" y="152" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Tần suất truy cập?</text>
  <text x="590" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">Nóng → S3 · Lạnh / archive</text>
  <text x="590" y="183" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">trên 90 ngày → Glacier</text>

  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M130 190 v22" marker-end="url(#stArr)"/>
    <path d="M360 190 v22" marker-end="url(#stArr)"/>
    <path d="M590 190 v22" marker-end="url(#stArr)"/>
  </g>

  <g font-size="11" font-weight="700" text-anchor="middle" fill="#fff">
    <rect x="34" y="216" width="92" height="30" rx="8" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="80" y="235">EBS</text>
    <rect x="132" y="216" width="98" height="30" rx="8" fill="#3b82f6" fill-opacity="0.6"/>
    <text x="181" y="235">Instance Store</text>

    <rect x="270" y="216" width="58" height="30" rx="8" fill="#10b981" fill-opacity="0.9"/>
    <text x="299" y="235">EFS</text>
    <rect x="332" y="216" width="100" height="30" rx="8" fill="#10b981" fill-opacity="0.7"/>
    <text x="382" y="235">FSx Win/Lustre</text>

    <rect x="500" y="216" width="78" height="30" rx="8" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="539" y="235">S3</text>
    <rect x="584" y="216" width="92" height="30" rx="8" fill="#f59e0b" fill-opacity="0.65"/>
    <text x="630" y="235">S3 Glacier</text>
  </g>

  <rect x="34" y="270" width="652" height="56" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="46" y="290" font-size="11" font-weight="700" fill="currentColor" opacity="0.85">Bẫy thường gặp:</text>
  <text x="46" y="307" font-size="10.5" fill="currentColor" opacity="0.75">• "Share file giữa nhiều EC2" → EFS, KHÔNG phải EBS Multi-Attach (cần cluster-aware FS).</text>
  <text x="46" y="321" font-size="10.5" fill="currentColor" opacity="0.75">• "Low latency + bền" → io2 Block Express, KHÔNG phải Instance Store (mất data khi stop).</text>

  <text x="360" y="352" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">Chọn TYPE trước (cây trên), rồi mới tune IOPS / throughput trong từng type.</text>
</svg>

| Tình huống | Chọn |
|------------|------|
| Boot volume EC2, DB local | **EBS** |
| Cần share file giữa nhiều EC2 (Linux) | **EFS** |
| Cần share file Windows (AD-integrated) | **FSx for Windows File Server** |
| HPC, ML training, high throughput parallel | **FSx for Lustre** |
| NetApp ONTAP migration | **FSx for ONTAP** |
| Cực high IOPS, có thể mất khi instance terminate | **Instance Store (NVMe)** |
| Static web assets, backups, logs, data lake | **S3** |
| Archive > 90 ngày | **S3 Glacier** |
| Big data analytics trên S3 | S3 + **Athena / Spectrum / Redshift Spectrum** |

---

## 3. EBS — block storage

### 3.1 Volume types (2024)

| Type | Max IOPS | Max throughput | Latency | Use case | Cost |
|------|----------|----------------|---------|----------|------|
| **gp3** | 16,000 (baseline 3,000) | 1,000 MB/s (baseline 125) | ms | General default — replace gp2 | $$ |
| **gp2** | 16,000 (burst credit-based) | 250 MB/s | ms | Legacy, đang phase-out | $$ |
| **io2 Block Express** | 256,000 | 4,000 MB/s | sub-ms | Mission-critical DB, SAP HANA | $$$$ |
| **io2** | 64,000 | 1,000 MB/s | ms | OLTP DB high IOPS | $$$ |
| **io1** | 64,000 | 1,000 MB/s | ms | Legacy io | $$$ |
| **st1** | 500 (throughput-optimized) | 500 MB/s | ms-s | Big data, log processing | $ |
| **sc1** | 250 | 250 MB/s | ms-s | Cold HDD, infrequent | $ |

Định vị các loại volume (và Instance Store) trên mặt phẳng **IOPS × throughput** — vị trí càng lên cao bên phải càng mạnh, nhưng cũng càng đắt; SSD nằm trên (IOPS cao, latency ms→sub-ms), HDD nằm dưới (throughput tốt cho dữ liệu tuần tự nhưng IOPS thấp):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Định vị các loại EBS và Instance Store theo IOPS và throughput</title>
  <desc>Biểu đồ phân tán: trục ngang là IOPS (thang log từ thấp đến rất cao), trục dọc là throughput (MB trên giây). SSD gp3 và io2 nằm vùng IOPS cao; io2 Block Express và Instance Store ở góc trên phải IOPS và throughput cực cao; HDD st1 và sc1 nằm dưới với IOPS thấp nhưng throughput tuần tự khá. Màu đậm hơn thể hiện chi phí cao hơn.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Định vị EBS — IOPS × throughput (đắt dần khi lên góc phải-trên)</text>

  <line x1="70" y1="60" x2="70" y2="360" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="70" y1="360" x2="680" y2="360" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="60" y="64" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">4000</text>
  <text x="60" y="214" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">1000</text>
  <text x="60" y="306" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">250</text>
  <text x="30" y="200" font-size="11" font-weight="700" fill="currentColor" transform="rotate(-90 30 200)" text-anchor="middle">Throughput (MB/s) →</text>
  <text x="375" y="392" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">IOPS (thang log) →</text>
  <g font-size="10.5" fill="currentColor" opacity="0.6" text-anchor="middle">
    <text x="150" y="378">500</text>
    <text x="310" y="378">16k</text>
    <text x="470" y="378">64k</text>
    <text x="620" y="378">256k+</text>
  </g>

  <line x1="70" y1="214" x2="680" y2="214" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="4 4"/>
  <line x1="70" y1="306" x2="680" y2="306" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="4 4"/>

  <text x="100" y="80" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.55">SSD — IOPS cao, latency ms→sub-ms</text>
  <text x="100" y="340" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.55">HDD — throughput tuần tự, IOPS thấp</text>

  <g>
    <circle cx="310" cy="290" r="13" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="310" y="270" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">gp3</text>
    <text x="310" y="258" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">16k · 1000 · $$</text>
  </g>
  <g>
    <circle cx="470" cy="214" r="15" fill="#8b5cf6" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="470" y="192" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">io2</text>
    <text x="470" y="180" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">64k · 1000 · $$$</text>
  </g>
  <g>
    <circle cx="624" cy="84" r="19" fill="#8b5cf6" fill-opacity="0.85" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="624" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">io2 Block Express</text>
    <text x="624" y="131" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">256k · 4000 · $$$$</text>
  </g>
  <g>
    <circle cx="654" cy="64" r="15" fill="#10b981" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="660" y="50" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance Store</text>
    <text x="660" y="146" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">triệu IOPS · µs · KHÔNG bền</text>
  </g>
  <g>
    <circle cx="150" cy="306" r="12" fill="#f59e0b" fill-opacity="0.5" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="150" y="334" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">st1</text>
    <text x="150" y="346" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">500 · 500 · $</text>
  </g>
  <g>
    <circle cx="110" cy="328" r="10" fill="#f59e0b" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="110" y="354" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">sc1</text>
  </g>

  <text x="70" y="416" font-size="10.5" fill="currentColor" opacity="0.7">Mỗi điểm: IOPS · throughput(MB/s) · chi phí. gp3 = default. Cần trên 16k IOPS → io2; cực cao + 5 nines → io2 Block Express.</text>
</svg>

### 3.2 gp3 vs gp2 — luôn chọn gp3

- gp2: IOPS tỷ lệ với size (3 IOPS/GB, max 16k). Burst credit-based → khó dự đoán.
- gp3: IOPS **độc lập với size**. Bắt đầu 3000 IOPS, 125 MB/s. Pay extra để tăng đến 16k IOPS, 1000 MB/s.
- **gp3 rẻ hơn gp2 ~20%** cho cùng performance.
- Migrate: `modify-volume` online, không downtime.

### 3.3 io2 Block Express
- IOPS 256k, latency sub-ms, durability 99.999% (5 nines vs gp3/io2 3 nines).
- Yêu cầu Nitro instance (r5b, x2idn, …).
- Use case: Oracle/SQL Server cực high transaction, SAP HANA.

### 3.4 EBS Multi-Attach
- Chỉ io1/io2, cùng AZ, tối đa 16 instance.
- App phải tự handle concurrent write (cluster-aware filesystem như GFS2).
- **Không** cho mục đích "share file" — dùng EFS.

### 3.5 Snapshot
- Incremental, store ở S3 (transparent với user).
- Restore: lazy load — block đọc lần đầu fetch từ S3 (chậm). Dùng **Fast Snapshot Restore (FSR)** để pre-warm.
- Cross-region copy: phải copy snapshot (không native cross-region volume).
- **EBS direct API**: read snapshot block-by-block, dùng cho backup tools.

### 3.6 Encryption
- AWS managed key hoặc customer KMS key.
- Encryption "by default" có thể bật ở region level.
- Snapshot encryption follow volume.
- Performance overhead: <1% trên Nitro instance.

---

## 4. Instance Store

- NVMe local, **vật lý gắn với host**.
- IOPS cực cao (hàng triệu), latency micro-second.
- **Mất data khi instance stop / terminate / underlying hardware fail**.
- Use case: cache layer, temporary scratch space, NoSQL với replication app-level (Cassandra, Redis).

> 🪤 Bẫy thi: "Cần low latency và data persistence" → **không phải instance store**. Là **io2 Block Express** hoặc **EBS io2**.

---

## 5. EFS — shared file

### 5.1 Performance modes
- **General Purpose** (default): low latency, scale tới hàng nghìn client.
- **Max I/O**: higher throughput, latency cao hơn. Hầu như không cần nữa (deprecated path).

### 5.2 Throughput modes
- **Bursting**: throughput tỷ lệ với storage size. Burst credit.
- **Provisioned**: pay extra, không phụ thuộc size.
- **Elastic** (2023+): auto-scale throughput, pay per request. **Nên chọn default này.**

### 5.3 Storage classes
- **Standard**: hot data.
- **Standard-IA** (Infrequent Access): rẻ hơn 92%, retrieval fee.
- **One Zone** / **One Zone-IA**: chỉ 1 AZ, rẻ hơn, durability thấp hơn.
- **Lifecycle policy**: tự move sang IA sau N ngày không truy cập.

### 5.4 Use case EFS
- Web tier shared content (PHP/WordPress).
- ML training shared dataset (nếu < 1 GB/s).
- Container persistent storage.
- Home directory cho EC2 cluster.

> 💡 EFS **không** tối ưu cho database — latency vài ms, throughput giới hạn. DB cần EBS hoặc io2.

---

## 6. FSx — purpose-built file system

| Variant | Protocol | Use case |
|---------|----------|----------|
| **FSx for Lustre** | POSIX (Lustre) | HPC, ML training, hundreds of GB/s throughput |
| **FSx for Windows File Server** | SMB, AD integration | Windows workload, .NET, shared drive cho user |
| **FSx for NetApp ONTAP** | NFS/SMB/iSCSI | Migrate workload đang dùng NetApp, snapshot, dedup |
| **FSx for OpenZFS** | NFS | Snapshot, clone instant, low latency |

### 6.1 FSx for Lustre

- Throughput đến **terabytes/s** cho largest scale.
- 2 mode: **Scratch** (temporary, max perf), **Persistent** (replicated).
- Tích hợp S3: import/export data từ S3 bucket, dùng Lustre như "fast cache".
- Use case điển hình: ML training với dataset 100TB ở S3, dùng FSx Lustre làm working set.

### 6.2 FSx for Windows

- Native SMB, NTFS ACL.
- Active Directory integration (managed AD hoặc on-prem).
- Single-AZ / Multi-AZ.
- DFS namespace cho cross-region.

### 6.3 FSx for NetApp ONTAP

- Use case migration: app đã quen NetApp features (SnapMirror, FlexClone, dedup).
- Hỗ trợ NFS, SMB, iSCSI cùng filesystem.
- Storage tiering: hot trên SSD, cold tự move sang capacity pool.

---

## 7. S3 — object storage

### 7.1 Storage classes

| Class | Use case | Min duration | Retrieval | Cost storage |
|-------|----------|--------------|-----------|--------------|
| **Standard** | Hot, frequent | — | Ngay | $$$ |
| **Intelligent-Tiering** | Pattern không biết trước | — | Ngay (auto-tier) | $$$ + monitoring fee |
| **Standard-IA** | Hot+infrequent (>30d) | 30 ngày | Ngay | $$ + retrieval |
| **One Zone-IA** | Backup secondary, có thể tái tạo | 30 ngày | Ngay | $ + retrieval |
| **Glacier Instant Retrieval** | Archive cần đọc đôi khi | 90 ngày | Ngay (ms) | $ |
| **Glacier Flexible Retrieval** | Archive | 90 ngày | Phút - giờ | $ |
| **Glacier Deep Archive** | Compliance long-term | 180 ngày | 12-48h | ¢ |

### 7.2 Lifecycle policies

- Tự transition class theo tuổi object.
- Tự expire (delete) sau N ngày.
- Có thể condition trên prefix, tag.
- Tránh lỗi: cấu hình cho **non-current versions** nếu versioning enabled, dễ quên.

### 7.3 Performance

- **3,500 PUT/COPY/POST/DELETE, 5,500 GET/HEAD per prefix per second**.
- "Prefix" = key prefix (vd `logs/2024/01/`). Nhiều prefix → song song scale.
- Throughput per request: 80-90 MB/s. **Multipart upload** cho file > 100 MB (5 GB single PUT limit).
- **S3 Transfer Acceleration**: dùng CloudFront edge → upload nhanh hơn cho user xa region.
- **Byte-range fetches**: parallel download 1 object qua nhiều range request.

### 7.4 Tránh hot prefix

Trước 2018: phải hash đầu key (`a1b2c3-2024-01-01.log` thay vì `2024-01-01.log`) để spread qua nhiều partition.

**Sau 2018**: S3 auto-scale per prefix, **không cần** hashing nữa. Nhưng nếu 1 prefix > 5,500 GET/s → split key space (`logs/2024/01/01/`, `logs/2024/01/02/`).

### 7.5 Multipart upload
- > 100 MB: nên multipart.
- > 5 GB: bắt buộc multipart.
- Tối đa 10,000 parts, mỗi part 5 MB - 5 GB.
- Failed part còn nằm trong bucket → lifecycle "abort incomplete multipart upload" để dọn.

### 7.6 Strong consistency
Sau Dec 2020: read-after-write strong cho mọi operation (xem [[foundations-02-consistency-models]]). Không còn workaround.

### 7.7 S3 Select / Athena

- **S3 Select**: SQL trên 1 object (CSV/JSON/Parquet). Filter ở server-side → giảm data transfer.
- **Athena**: SQL trên nhiều object, có schema (Glue Data Catalog). Pay per data scanned.
- Parquet/ORC > CSV/JSON cho analytics — columnar, compressed, faster.

---

## 8. Storage Gateway — bridge on-prem & cloud

| Type | Protocol on-prem | Backend AWS | Use case |
|------|------------------|-------------|----------|
| **File Gateway** | NFS/SMB | S3 | Migrate file share to S3 |
| **Volume Gateway (Cached)** | iSCSI | S3 + EBS snapshot | Hot data local, full backup cloud |
| **Volume Gateway (Stored)** | iSCSI | S3 snapshot | Full local, async backup |
| **Tape Gateway** | VTL | S3 + Glacier | Replace tape backup |

---

## 9. Backup & DR storage

- **AWS Backup**: centralized, cross-service (EBS, RDS, DynamoDB, EFS, FSx, S3…). Vault với immutability (compliance lock).
- **EBS Snapshot Lifecycle Manager** (DLM): schedule snapshot, retention.
- **S3 Cross-Region Replication (CRR)** / **Same-Region Replication (SRR)**.
- **S3 Replication Time Control (RTC)**: SLA 15 phút replication.

---

## 10. Map performance metric

| Metric | Service | Tool monitor |
|--------|---------|--------------|
| Disk IOPS, throughput, queue depth | EBS | CloudWatch metrics (`VolumeReadOps`, `VolumeWriteBytes`, `VolumeQueueLength`) |
| EFS burst credit, throughput | EFS | CloudWatch `BurstCreditBalance`, `PermittedThroughput` |
| S3 request count, latency, 4xx/5xx | S3 | CloudWatch storage metrics + request metrics (enable) |
| FSx Lustre throughput | FSx | CloudWatch FSx metrics |

> 🪤 Bẫy thi: "EBS volume slow, làm sao biết bottleneck IOPS hay throughput?" → check `VolumeQueueLength > 1` thường xuyên = saturate. Nhìn `VolumeReadOps / period` so với provisioned IOPS.

---

## 11. Ví dụ chọn storage cho 4 use case

### 11.1 Postgres OLTP, p99 5ms, 50k IOPS
- **io2 Block Express** trên r6i instance. Multi-AZ qua Aurora hoặc RDS Multi-AZ.
- Tránh gp3 vì IOPS cap 16k.

### 11.2 Video transcoding farm
- **Instance Store NVMe** cho scratch (cực nhanh, mất OK).
- **S3** cho input/output. Multipart upload.
- **MediaConvert** hoặc Fargate worker.

### 11.3 ML training, dataset 50TB ở S3
- **FSx for Lustre Scratch** mount vào training instance.
- Lustre import từ S3 bucket. Sau training xong, terminate Lustre.
- Lưu model output về S3.

### 11.4 SaaS app, user upload file, average 10 MB
- **S3** với multipart upload từ client (presigned URL).
- **CloudFront** trước S3 cho download.
- **Lifecycle**: move sang Standard-IA sau 30 ngày, Glacier sau 1 năm.

---

## 12. Cạm bẫy đề thi (SAA)

1. **"EBS Multi-Attach để share file giữa nhiều EC2"** → **Sai**. Multi-Attach cần cluster-aware FS. Để share file dùng EFS.
2. **"Instance store persistent qua stop/start"** → **Sai**, mất data khi stop.
3. **"S3 Standard-IA rẻ nhất cho data cũ"** → **Sai**, Glacier Deep Archive rẻ hơn nhiều nếu chấp nhận retrieval thời gian.
4. **"S3 Intelligent-Tiering không có downside"** → **Sai**, có monitoring fee per object. Object nhỏ < 128 KB không tier.
5. **"gp3 luôn rẻ hơn gp2"** → **Đúng** cho baseline. Nếu bạn cần > 3000 IOPS hoặc > 125 MB/s, gp3 phụ phí — nhưng vẫn rẻ hơn io2 cho cùng IOPS.
6. **"EFS phù hợp database shared"** → **Sai**, EFS latency vài ms, DB cần sub-ms. Dùng Aurora.
7. **"FSx for Lustre persistent = HA"** → **Sai**, vẫn chỉ Single-AZ. Cross-AZ HA cần backup hoặc Multi-AZ deployment (chỉ một số config).
8. **"S3 cần hash prefix cho performance"** → **Cũ rồi**, từ 2018 không cần.

---

## 13. Tóm tắt 1 dòng

> Storage performance = chọn đúng **type** trước, rồi tune **provisioned IOPS/throughput**. EBS gp3 default cho block, EFS Elastic cho shared file, S3 + lifecycle cho object, FSx Lustre cho HPC. Đừng over-provision — measure trước.

---

## 14. Bài tập tự kiểm tra

1. App ghi log 200 MB/s liên tục. Lưu 30 ngày tra cứu nhanh, 1 năm để query đôi khi, 7 năm compliance. Design storage stack?
2. Postgres báo `VolumeQueueLength` thường xuyên > 5 trên gp3 với 8000 provisioned IOPS. CPU 50%. Bạn làm gì?
3. Team ML training cần đọc dataset 20TB từ S3, throughput muốn > 10 GB/s. Đáp án?
4. S3 bucket có 1000 user upload concurrent, mỗi user upload file 5 GB. Best practice?
5. EBS snapshot 1TB, restore vào volume mới, app báo latency cao 30 phút đầu. Vì sao? Fix?
6. So sánh EFS Bursting vs Elastic — khi nào chọn cái nào?

---

## 15. Đọc thêm

- AWS Whitepaper — *AWS Storage Services Overview*.
- AWS Builder's Library — *Caching challenges and strategies*.
- AWS docs — *EBS volume types*, *S3 performance guidelines*.
- *Performance at Scale with Amazon ElastiCache* whitepaper.

---

**Bài tiếp theo**: [[ch2-03-database-performance]] — Aurora tuning, DynamoDB throughput, ElastiCache, DAX.
