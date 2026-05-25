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
