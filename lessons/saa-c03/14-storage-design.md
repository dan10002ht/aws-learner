# Bài 14 — Storage Design Patterns

## 1. Mục tiêu
- Chọn đúng storage cho từng workload (block / file / object).
- S3 patterns nâng cao: multipart, Transfer Acceleration, S3 Select, MRAP, Object Lock.
- EBS types deep + Multi-Attach.
- EFS vs FSx variants.
- Storage Gateway + DataSync cho hybrid.

---

## 2. Decision tree

```
Workload cần gì?
├── Block storage gắn 1 EC2 → EBS gp3 / io2
├── Block shared multi-EC2 cluster-aware → EBS io1/io2 Multi-Attach (same AZ)
├── File shared Linux multi-AZ → EFS
├── File Windows SMB → FSx for Windows
├── HPC scratch file → FSx for Lustre
├── NetApp ONTAP feature → FSx ONTAP
├── ZFS-like → FSx OpenZFS
├── Object scale lớn, low cost → S3
├── Archive 7+ năm → S3 Glacier Deep Archive
├── Hybrid on-prem cache S3 → Storage Gateway (File/Volume/Tape)
└── Migrate data hàng TB → DataSync / Snowball / Snowmobile
```

---

## 3. EBS deep

### 3.1 Types

| Type | IOPS | Throughput | Use case |
|------|------|------------|----------|
| **gp3** (default mới) | 3000 base, đến 16k | 125 MB/s base, đến 1000 | General, **rẻ hơn gp2 20%** |
| **gp2** (legacy) | 3 IOPS/GB, đến 16k | depends | Legacy, migrate gp3 |
| **io1** | đến 64k | đến 1000 MB/s | Critical DB |
| **io2** | đến 64k, 100x durability | đến 1000 | Critical DB, mission-critical |
| **io2 Block Express** | **256k**, sub-ms latency | 4000 MB/s | SAP HANA, Oracle |
| **st1** | 500 IOPS, 500 MB/s | High throughput | Big data, log, Kafka |
| **sc1** | 250 IOPS, 250 MB/s | Cold HDD | Backup, archive |

### 3.2 Features
- **Encryption at rest** (KMS) — bật khi tạo, encrypt snapshot tự động.
- **Encryption by default** account-level — best practice.
- **Snapshot** incremental, lưu S3 (managed). Copy cross-region cross-account.
- **Fast Snapshot Restore (FSR)** — pre-initialize snapshot, instance khởi tạo từ snapshot không lag I/O.
- **Multi-Attach** (io1/io2 only, **same AZ**, max 16 instance) — cluster-aware FS bắt buộc (GFS2, OCFS2). KHÔNG dùng cho ext4/xfs (corrupt).
- **Elastic Volumes** — resize, change type, change IOPS online.

### 3.3 Bẫy
- EBS gắn **1 AZ** — instance fail over AZ phải snapshot → restore AZ khác.
- Snapshot có thể chứa data nhạy cảm — encrypt + tag access control.
- `DeleteOnTermination=true` cho root volume (default) — additional volume default false.

---

## 4. EFS

### 4.1 Đặc điểm
- **NFSv4** file system fully managed.
- **Multi-AZ** auto-replicate.
- **Petabyte** scale, **thousands of EC2** concurrent.
- **POSIX** compliant.
- Mount: `mount.efs <fs-id>:/ /mnt` (cùng VPC + SG mở 2049).

### 4.2 Storage classes
- **Standard** — multi-AZ, frequent access.
- **Standard-IA** — multi-AZ infrequent ($/GB rẻ hơn 92%).
- **One Zone** — 1 AZ, frequent.
- **One Zone-IA** — 1 AZ, infrequent (rẻ nhất).
- **Lifecycle Management** auto move sang IA sau 7-90 ngày không access.

### 4.3 Performance modes
- **General Purpose** (default) — low latency, đa số workload.
- **Max I/O** — higher throughput, higher latency (file > 10GB).

### 4.4 Throughput modes
- **Bursting** (default) — scale theo size.
- **Provisioned** — fix throughput không phụ thuộc size.
- **Elastic** — auto scale (best với spike workload).

### 4.5 EFS vs EBS

| | EFS | EBS |
|--|-----|-----|
| Type | File NFS | Block |
| Multi-AZ | ✅ | ❌ |
| Multi-EC2 | ✅ (thousands) | Multi-Attach io1/io2 max 16, same AZ |
| Resize | Auto | Manual (Elastic Volumes) |
| Cost | Cao (~$0.30/GB Std) | gp3 ~$0.08/GB |
| Use case | Shared content, lift-shift NFS | Boot disk, DB |

---

## 5. FSx variants

| | FSx for Windows | FSx for Lustre | FSx for ONTAP | FSx for OpenZFS |
|--|-----------------|-----------------|----------------|------------------|
| Protocol | SMB | Lustre (POSIX) | NFS, SMB, iSCSI | NFS |
| Use case | Windows file server, .NET app, AD-integrated | HPC, ML training scratch | NetApp customer, hybrid, snapshot+clone | High-perf Linux NFS |
| Performance | High SMB | **TB/s aggregate** | High | High |
| Cost | Medium | Per GB + throughput | High | Medium |
| Multi-AZ | ✅ | Single-AZ (scratch) hoặc persistent | ✅ | Single-AZ |

**Use case map:**
- **AD-integrated Windows file share** → FSx Windows.
- **ML training với S3 source data** → FSx Lustre + S3 linked.
- **NetApp ONTAP customer migrate** → FSx ONTAP.
- **Linux NFS workload high perf** → FSx OpenZFS.

---

## 6. S3 Advanced Patterns

### 6.1 Multipart Upload
- **Required** > 5GB single object.
- **Recommended** > 100MB.
- Parallel parts → resume từ part failed.
- **Lifecycle Abort Incomplete** bắt buộc (orphan parts tốn tiền).

### 6.2 Transfer Acceleration
- Upload qua Edge Location → AWS backbone → bucket region.
- Faster cho global user upload region xa.
- Phí thêm $0.04/GB.
- Endpoint `<bucket>.s3-accelerate.amazonaws.com`.

### 6.3 S3 Select & Glacier Select
- SQL trên CSV/JSON/Parquet object.
- Return bytes-needed → giảm network.
- Glacier Select chỉ Flexible/Deep Archive.

### 6.4 Object Lock (WORM)
- Bật khi **tạo bucket** (không enable sau).
- **Governance mode**: user có `BypassGovernanceRetention` mới override.
- **Compliance mode**: **không ai** override, kể cả root.
- **Retention period** + **Legal Hold** (vô thời hạn).
- Use case: SEC 17a-4, FINRA, GDPR.

### 6.5 Access Points
- 1 bucket → nhiều endpoint, mỗi cái policy riêng.
- Multi-tenant: app A access point chỉ thấy prefix `a/`, app B chỉ `b/`.
- **Multi-Region Access Point (MRAP)** — 1 global endpoint routing đến bucket region gần nhất (active-active S3 cross-region).

### 6.6 Replication
- **CRR** (cross-region) — DR.
- **SRR** (same-region) — log aggregation, account separation.
- **Bidirectional** — bucket A↔B (2-way sync).
- **Replication Time Control (RTC)** — SLA 15 phút (có phí).
- **Batch Replication** — replicate object cũ (replication thường KHÔNG retroactive).
- Yêu cầu: **versioning** cả 2.

### 6.7 Event Notification + EventBridge
- S3 event → SQS/SNS/Lambda hoặc **EventBridge** (mới, schema + filter mạnh hơn).
- Use case: image processing, ETL trigger, audit.

### 6.8 Storage Lens
- Org-wide analytics: usage, activity, recommendation.
- Free tier (basic metrics), advanced có phí.

### 6.9 S3 Inventory
- Báo cáo CSV/Parquet/ORC list mọi object hàng ngày/tuần.
- Use case: compliance audit, big data analytics on bucket content.

---

## 7. Hybrid storage

### 7.1 Storage Gateway

| Type | Protocol | Use case |
|------|----------|----------|
| **File Gateway** | NFS/SMB → S3 | Lift-shift file server, on-prem cache S3 |
| **Volume Gateway Cached** | iSCSI, hot data cached on-prem, primary S3 | Limited on-prem storage |
| **Volume Gateway Stored** | iSCSI, primary on-prem, async backup S3 | Full local + cloud backup |
| **Tape Gateway** | iSCSI VTL → S3 Glacier | Replace LTO tape library |

### 7.2 DataSync
- Migrate hàng TB data on-prem → AWS hoặc AWS↔AWS (S3, EFS, FSx).
- Incremental sync.
- 10x faster than open-source tools.

### 7.3 Snowball / Snowcone / Snowmobile
- **Snowcone** — 8TB, edge computing.
- **Snowball Edge** — 80TB, edge + compute.
- **Snowmobile** — **100 PB**, semi-truck.
- Use case: data > 10TB hoặc bandwidth limited.

### 7.4 AWS Backup
- Centralize backup: RDS, EBS, EFS, DynamoDB, Aurora, FSx, Storage Gateway, S3, Redshift.
- **Backup Vault** + Vault Lock (immutable WORM).
- Cross-region + cross-account copy.

---

## 8. Tự kiểm tra

1. EBS volume gắn vào EC2 ở AZ-a. EC2 fail. Move volume sang AZ-b?
   <details><summary>Đáp án</summary>**Không trực tiếp**. Phải snapshot → restore ở AZ-b (snapshot lưu S3 region-wide).</details>

2. 50 EC2 cần shared file Linux multi-AZ. Chọn?
   <details><summary>Đáp án</summary>**EFS**. EBS Multi-Attach max 16, same AZ, cần cluster FS.</details>

3. ML training cần 1TB/s read từ S3 dataset. Storage?
   <details><summary>Đáp án</summary>**FSx for Lustre** với S3 linked — copy data từ S3, expose POSIX FS với throughput TB/s.</details>

4. Compliance giữ log 7 năm không sửa được. S3 config?
   <details><summary>Đáp án</summary>**Object Lock Compliance mode** + retention 2555 ngày + Glacier Deep Archive. Hoặc **Vault Lock** với AWS Backup.</details>

5. Object 50GB upload từ Việt Nam vào S3 us-east-1. Chậm. Fix?
   <details><summary>Đáp án</summary>**Multipart upload** (parallel) + **Transfer Acceleration**. Hoặc replicate bucket sang ap-southeast-1.</details>

6. Cần replicate 10TB object cũ sang region khác. CRR đủ không?
   <details><summary>Đáp án</summary>**Không** — CRR chỉ replicate object mới sau khi bật. Dùng **S3 Batch Replication** cho object cũ.</details>

7. Multi-tenant SaaS, mỗi tenant có prefix riêng. Cấp quyền per-tenant?
   <details><summary>Đáp án</summary>**S3 Access Points** — mỗi tenant 1 access point với policy giới hạn prefix. Tenant dùng endpoint riêng.</details>

8. EFS workload spike đột ngột rồi quiet 90% thời gian. Throughput mode?
   <details><summary>Đáp án</summary>**Elastic throughput** — pay per use, auto scale. Provisioned đắt khi idle, Bursting có thể không đủ khi spike.</details>

9. App on-prem cần read/write file S3 dùng NFS không cần code thay đổi. Service?
   <details><summary>Đáp án</summary>**Storage Gateway File Gateway** — expose NFS/SMB endpoint, sync S3 phía sau.</details>

10. Lift-shift 200TB tape archive lên AWS, không muốn thay app backup. Service?
    <details><summary>Đáp án</summary>**Tape Gateway** — VTL iSCSI, app vẫn dùng như tape library, AWS lưu S3 + Glacier.</details>

---

## 9. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| EBS | **Persistent Disk** (zonal/regional) |
| EBS gp3/io2 | **PD Balanced / Extreme** |
| Instance Store | **Local SSD** |
| EBS Multi-Attach | **PD multi-writer** (preview) |
| EFS | **Filestore** |
| FSx Windows | **Filestore SMB** (Enterprise tier) hoặc **NetApp Volumes** |
| FSx Lustre | **Lustre on GCE** / partner |
| FSx ONTAP | **NetApp Cloud Volumes ONTAP** |
| FSx OpenZFS | (không có native) |
| S3 | **Cloud Storage** |
| S3 Glacier | **Coldline / Archive** |
| S3 Object Lock | **Bucket Lock + Retention Policy** |
| S3 Access Points | (không có direct equivalent) |
| S3 MRAP | **Multi-region bucket** built-in |
| Storage Gateway | **Cloud Storage Transfer Service + Filestore** |
| DataSync | **Transfer Service / gcloud rsync** |
| Snowball | **Transfer Appliance** |
| AWS Backup | **Backup and DR** |

**Bẫy:**
1. GCP **PD Regional** (sync replicate 2 zone) — AWS không có equivalent EBS, phải EFS hoặc app replication.
2. GCP **Cloud Storage multi-region** built-in (us, eu, asia). AWS S3 bị khoá region, phải MRAP.
3. **Object Lock Compliance mode** AWS không ai override. GCP Bucket Lock tương tự nhưng cú pháp khác.

---

## 10. Lưu ý SAA

- **EBS** 1 AZ. Multi-Attach io1/io2 cùng AZ, cluster FS.
- **EFS** multi-AZ NFS.
- **FSx Lustre** + S3 link cho HPC/ML.
- **Multipart** > 5GB bắt buộc, > 100MB khuyên.
- **Transfer Acceleration** cho upload global.
- **S3 Select** giảm bytes scan trên CSV/JSON/Parquet.
- **Object Lock** ON khi tạo bucket, không enable sau.
- **MRAP** active-active S3 cross-region.
- **Storage Gateway** 4 loại (File/Volume Cached/Volume Stored/Tape).
- **DataSync** migrate, **Snowball** offline > 10TB.
- **AWS Backup Vault Lock** immutable.
- **FSR** snapshot warm cho fast restore.

## 11. Lưu ý đi làm

### Best practice
- **EBS encryption by default** account-level.
- **gp3** default cho mọi volume mới.
- **Snapshot lifecycle** với AWS Backup (CRR + retention).
- **EFS lifecycle** chuyển IA sau 30 ngày không access.
- **S3 BPA + disable ACL** mặc định.
- **S3 lifecycle abort multipart** mọi bucket.
- **S3 Intelligent-Tiering** cho data unknown pattern.
- **MRAP** cho global app.

### Anti-pattern
- ❌ EBS Multi-Attach với ext4/xfs → corrupt.
- ❌ EFS không lifecycle IA → cost cao.
- ❌ S3 versioning không lifecycle expire noncurrent → bucket phình lớn.
- ❌ Object Lock Compliance + retention quá dài → khóa data vĩnh viễn.
- ❌ Self-managed NFS trên EC2 → EFS/FSx.
- ❌ Snapshot không cross-region → DR fail nếu region down.

## 12. Foundations
- **CAP** liên quan storage replication. S3 strong consistency (2020+), EFS strong, EBS strong (single-attach).
- **Quorum** trong S3 — 3+ AZ multi-AZ class.

## 13. Flashcard

- **EBS gp3** default, rẻ hơn gp2 20%.
- **io2 Block Express** 256k IOPS, sub-ms.
- **Multi-Attach** io1/io2 same AZ max 16.
- **Snapshot** incremental, S3 backed.
- **FSR** warm snapshot.
- **EFS** multi-AZ NFS thousands EC2.
- **FSx Lustre** HPC + S3 linked.
- **FSx Windows** SMB AD-integrated.
- **FSx ONTAP** NetApp feature.
- **Multipart** > 100MB recommended.
- **Transfer Acceleration** upload global.
- **S3 Select** SQL on object.
- **Object Lock** WORM, Governance/Compliance.
- **Compliance mode** nobody override.
- **Access Points** multi-tenant policy.
- **MRAP** active-active global.
- **CRR/SRR** + versioning required.
- **Batch Replication** cho object cũ.
- **Storage Gateway**: File (NFS/SMB→S3), Volume Cached/Stored (iSCSI), Tape (VTL→Glacier).
- **DataSync** online migration.
- **Snowball** offline > 10TB.
- **AWS Backup Vault Lock** immutable.
