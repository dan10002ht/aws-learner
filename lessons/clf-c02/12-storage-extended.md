# Bài 13 — Storage mở rộng (EBS, EFS, FSx, Instance Store, Storage Gateway, Backup, DRS)

> Map exam: **CLF-C02 Task 3.6 — Identify AWS storage services**. Bài 9 đã học S3 sâu. Bài này phủ block / file / hybrid / backup storage.

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **block / file / object** storage với ví dụ AWS.
- Chọn đúng giữa **EBS / Instance Store / EFS / FSx** theo workload.
- Phân biệt **4 loại FSx**: Windows, Lustre, ONTAP, OpenZFS.
- Hiểu **Storage Gateway** 3 mode và **AWS Backup**.
- Phân biệt **AWS Backup vs Elastic Disaster Recovery** vs **snapshot tự quản**.

---

## 2. Lý thuyết

### 2.0 Analogy — 3 loại storage như 3 cách lưu giấy tờ

| Loại | Analogy | AWS service | Đặc tính |
|------|---------|-------------|----------|
| **Block** | Ổ cứng gắn vào máy tính | **EBS**, **Instance Store** | Low latency, gắn 1 máy, format filesystem |
| **File** | Tủ hồ sơ chung phòng | **EFS**, **FSx** | Nhiều máy share đồng thời (NFS/SMB) |
| **Object** | Kho hàng có barcode | **S3** | Unlimited, REST API, không gắn máy |

→ **Câu hỏi cốt lõi**: "có cần share giữa nhiều máy không?" + "cần POSIX/SMB hay HTTP API?"

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh cách gắn của Block, File và Object storage trên AWS</title>
  <desc>Block (EBS/Instance Store) gắn vào 1 EC2 trong 1 AZ; File (EFS/FSx) share nhiều EC2 qua nhiều AZ bằng NFS hoặc SMB; Object (S3) truy cập qua HTTP API, không gắn vào máy nào.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Ba kiểu storage gắn vào compute như thế nào?</text>
  <g>
    <rect x="16" y="40" width="220" height="300" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="28" y="52" width="86" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="71" y="67" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">BLOCK</text>
    <text x="124" y="67" font-size="11" fill="currentColor" opacity="0.7">1 EC2 · 1 AZ</text>
    <rect x="40" y="92" width="172" height="46" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
    <text x="126" y="109" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Availability Zone A</text>
    <rect x="56" y="118" width="64" height="34" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="88" y="139" font-size="11" text-anchor="middle" fill="currentColor">EC2</text>
    <line x1="120" y1="135" x2="148" y2="135" stroke="currentColor" stroke-width="2"/>
    <rect x="148" y="118" width="52" height="34" rx="6" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="174" y="139" font-size="10.5" text-anchor="middle" fill="currentColor">Volume</text>
    <text x="126" y="180" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">EBS · Instance Store</text>
    <text x="126" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gắn trực tiếp 1 máy</text>
    <text x="126" y="216" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">low latency, format FS</text>
    <text x="126" y="244" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">đổi AZ phải snapshot</text>
  </g>
  <g>
    <rect x="250" y="40" width="220" height="300" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="262" y="52" width="74" height="22" rx="11" fill="#10b981" fill-opacity="0.95"/>
    <text x="299" y="67" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">FILE</text>
    <text x="346" y="67" font-size="11" fill="currentColor" opacity="0.7">nhiều EC2 · multi-AZ</text>
    <rect x="262" y="92" width="92" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
    <text x="308" y="106" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">AZ-A</text>
    <rect x="276" y="110" width="64" height="18" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="308" y="123" font-size="9.5" text-anchor="middle" fill="currentColor">EC2</text>
    <rect x="366" y="92" width="92" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
    <text x="412" y="106" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">AZ-B</text>
    <rect x="380" y="110" width="64" height="18" rx="4" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="412" y="123" font-size="9.5" text-anchor="middle" fill="currentColor">EC2</text>
    <line x1="308" y1="128" x2="308" y2="168" stroke="currentColor" stroke-width="1.5"/>
    <line x1="412" y1="128" x2="412" y2="168" stroke="currentColor" stroke-width="1.5"/>
    <text x="360" y="152" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">NFS / SMB</text>
    <rect x="284" y="168" width="152" height="34" rx="8" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="360" y="189" font-size="10.5" text-anchor="middle" fill="currentColor">File system chung</text>
    <text x="360" y="228" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">EFS · FSx</text>
    <text x="360" y="248" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nhiều máy share cùng lúc</text>
  </g>
  <g>
    <rect x="484" y="40" width="220" height="300" rx="10" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="496" y="52" width="82" height="22" rx="11" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="537" y="67" font-size="11.5" font-weight="700" text-anchor="middle" fill="#fff">OBJECT</text>
    <text x="588" y="67" font-size="11" fill="currentColor" opacity="0.7">không gắn máy</text>
    <rect x="556" y="96" width="64" height="34" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="588" y="117" font-size="10.5" text-anchor="middle" fill="currentColor">Client</text>
    <text x="588" y="148" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">EC2 · Lambda · app</text>
    <line x1="588" y1="158" x2="588" y2="168" stroke="currentColor" stroke-width="1.5"/>
    <line x1="588" y1="184" x2="588" y2="190" stroke="currentColor" stroke-width="1.5"/>
    <text x="588" y="180" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">HTTP API (GET/PUT)</text>
    <rect x="528" y="190" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="588" y="215" font-size="11" text-anchor="middle" fill="currentColor">Bucket S3</text>
    <text x="588" y="256" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Amazon S3</text>
    <text x="588" y="276" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">unlimited, REST endpoint</text>
    <text x="588" y="292" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">không cần mount</text>
  </g>
</svg>

---

### 2.1 Amazon EBS (Elastic Block Store) — sâu

**Đặc điểm**:
- Volume gắn vào **1 EC2 cùng AZ** (trừ io1/io2 Multi-Attach gắn được tối đa 16 instance).
- Tồn tại độc lập với EC2 (terminate EC2 vẫn còn EBS).
- **Snapshot** lên S3, encrypted, incremental.
- Tăng dung lượng + đổi type **không cần stop** instance (Elastic Volumes).

**6 loại volume**:

| Loại | Type | IOPS max | Use case | Giá tương đối |
|------|------|----------|----------|---------------|
| **gp3** | SSD | 16,000 (configurable) | General purpose mặc định mới | $$ |
| **gp2** | SSD | 16,000 (theo size) | Legacy general purpose | $$ |
| **io2 / io2 Block Express** | SSD | 256,000 / 256k | Mission-critical (SAP, Oracle) | $$$$ |
| **io1** | SSD | 64,000 | Legacy mission-critical | $$$$ |
| **st1** | HDD | (throughput-based) | Big data, log streaming | $ |
| **sc1** | HDD | (throughput-based) | Cold storage, archive ít access | (rẻ nhất) |

**Bẫy exam**:
- EBS **cùng AZ** với EC2. Muốn move sang AZ khác → snapshot → restore ở AZ khác.
- **gp3 thay gp2** mặc định từ 2020 — gp3 cho phép tách IOPS/throughput khỏi size, rẻ hơn 20%.
- **Multi-Attach** chỉ io1/io2, max 16 instance, cluster filesystem.
- **Encryption** bật được sau khi tạo (cần snapshot → copy với encryption).

---

### 2.2 EC2 Instance Store (ephemeral)

- **Storage gắn vật lý trên host server** — cực nhanh (NVMe SSD).
- **Mất khi instance stop/terminate** (nhưng giữ khi reboot).
- **KHÔNG** có snapshot, **KHÔNG** persistent.
- Một số instance type (i3, i4, d3, r5d, …) có sẵn instance store **miễn phí** trong giá EC2.

**Use case**: cache, scratch space, buffer Hadoop/Spark.

**Đề bẫy**: "needs persistent storage attached to EC2" → **EBS**, không phải Instance Store.

---

### 2.3 Amazon EFS (Elastic File System)

- **NFS v4 managed**, dùng cho **Linux**.
- **Multi-AZ trong 1 region** (mặc định) — share giữa nhiều EC2/Lambda/ECS.
- **Auto-scale** dung lượng (PB), không cần provision.
- Pricing per GB used (không trả tiền cho dung lượng cấp phát).
- **Storage class**:
  - **Standard** — multi-AZ.
  - **Standard-IA** — multi-AZ, ít access.
  - **One Zone** — 1 AZ, rẻ hơn 47%.
  - **One Zone-IA** — 1 AZ + IA.
- **Lifecycle policy** tự chuyển file ít access sang IA.

**Use case**: web server content share, dev IDE shared, ML data lake, container persistent volume.

---

### 2.4 Amazon FSx — 4 loại

FSx = managed file system, không như EFS chỉ 1 protocol. **4 variant**:

| FSx variant | Protocol | OS | Use case |
|-------------|----------|-----|----------|
| **FSx for Windows File Server** | **SMB** + Active Directory | Windows | File share Windows enterprise, AD integration |
| **FSx for Lustre** | Lustre (HPC POSIX) | Linux | HPC, ML training, genomics, render farm |
| **FSx for NetApp ONTAP** | NFS + SMB + iSCSI | Multi-OS | Migrate NetApp on-prem, snapshot, dedup |
| **FSx for OpenZFS** | NFS | Linux | OpenZFS feature (snapshot, clone), thay thế cho on-prem ZFS |

**Phân biệt nhanh khi đọc đề**:
- "Windows + SMB + AD" → **FSx for Windows**.
- "HPC, ML training, ngàn core" → **FSx for Lustre**.
- "Migrate NetApp filer" → **FSx for NetApp ONTAP**.
- "ZFS snapshot, dedup" → **FSx for OpenZFS**.

**EFS vs FSx**:
- **EFS** = NFS, Linux, multi-AZ, auto-scale, đơn giản.
- **FSx** = chuyên biệt cho 1 protocol/usecase (Windows SMB, Lustre HPC, …).

---

### 2.5 AWS Storage Gateway (hybrid)

**Mục đích**: kết nối on-prem với S3 / EBS / Glacier, giảm dung lượng on-prem.

**4 mode**:

| Mode | Protocol on-prem | AWS storage backend | Use case |
|------|-------------------|---------------------|----------|
| **S3 File Gateway** | NFS / SMB | S3 (object) | Mount S3 như file share trên on-prem |
| **FSx File Gateway** | SMB | FSx for Windows | Cache FSx tại on-prem |
| **Volume Gateway** (Cached / Stored) | iSCSI block | EBS snapshot trên S3 | Block storage hybrid |
| **Tape Gateway** | iSCSI VTL | S3 + Glacier | Thay băng từ vật lý (LTO) |

**Use case**: on-prem có 50TB file, muốn move 80% lên S3 nhưng vẫn cho user truy cập qua NFS/SMB như cũ → **S3 File Gateway**.

---

### 2.6 AWS Backup

**Service quản lý backup tập trung** cho nhiều AWS service:
- EBS, EFS, FSx, S3 (mới hỗ trợ), RDS, Aurora, DynamoDB, DocumentDB, Neptune, Storage Gateway, EC2, VMware.

**Khái niệm**:
- **Backup plan** — schedule + retention + lifecycle (chuyển sang cold storage).
- **Backup vault** — nơi lưu, có lock (WORM) chống xoá.
- **Backup vault lock** — compliance mode WORM, không xoá được kể cả root.
- **Cross-region / cross-account backup** — DR hoặc audit isolation.

**Khác với snapshot tự quản** (EBS snapshot, RDS automated backup):
- Backup tập trung policy, view tất cả ở 1 chỗ.
- Có lifecycle to cold storage tự động.
- Có lock (WORM).
- Hỗ trợ EFS, FSx, DynamoDB mà snapshot riêng không có.

---

### 2.7 AWS Elastic Disaster Recovery (DRS)

- **Continuous block-level replication** từ on-prem hoặc cloud khác → AWS.
- Idle cost rẻ (chỉ trả lưu trữ replicated state).
- Khi disaster → **failover** trong vài phút, instance khởi động đầy đủ ở AWS.
- Khác **AWS Backup**: DRS là **active replication + failover**, Backup là **snapshot định kỳ**.
- Khác **MGN**: DRS continuous (luôn sẵn sàng), **MGN** one-time migration.

---

### 2.8 Tổng kết — cây quyết định storage

```
Cần lưu data?
├─ Object (HTTP API, không gắn máy)
│   └─ Amazon S3 (+ Glacier)
├─ Block (gắn 1 EC2)
│   ├─ Persistent → EBS (gp3 / io2 / st1 / sc1)
│   └─ Ephemeral, cực nhanh → Instance Store
├─ File (share nhiều máy)
│   ├─ Linux NFS đơn giản → EFS
│   └─ Windows SMB → FSx Windows
│   └─ HPC Lustre → FSx Lustre
│   └─ NetApp migrate → FSx ONTAP
│   └─ ZFS → FSx OpenZFS
└─ Hybrid (on-prem ↔ AWS)
    └─ Storage Gateway (S3/FSx File, Volume, Tape)
```

Cần **backup centralized**? → **AWS Backup**.
Cần **DR + failover**? → **AWS Elastic Disaster Recovery (DRS)**.

---

## 3. Hands-on có account

### Lab 1 — EBS gp3 + snapshot + restore (30 phút)
1. Launch EC2 với 1 EBS gp3 8GB.
2. Mount, ghi 1 file `hello.txt`.
3. EBS console → tạo snapshot.
4. Terminate EC2 + delete EBS.
5. Restore: tạo EBS từ snapshot ở **AZ khác**, attach vào EC2 mới → file vẫn còn.

### Lab 2 — EFS share giữa 2 EC2 (30 phút)
1. Tạo EFS file system.
2. Launch 2 EC2 ở 2 AZ khác nhau.
3. Mount cùng EFS (`sudo mount -t efs fs-xxx:/ /mnt/efs`).
4. Ở EC2 A: `echo "from A" > /mnt/efs/test.txt`.
5. Ở EC2 B: `cat /mnt/efs/test.txt` → thấy.

### Lab 3 — AWS Backup plan (20 phút)
1. AWS Backup → tạo vault `learner-vault`.
2. Tạo backup plan: daily 2am, retain 30 ngày.
3. Assign resource: tag `Backup=true` → EBS có tag này tự backup.
4. Tag 1 EBS → đợi backup chạy → xem recovery point.

---

## 4. Hands-on không tốn tiền

### Option A — LocalStack
- `awslocal s3`, `awslocal efs`, `awslocal backup`.

### Option B — So sánh giá
- Pricing Calculator: 1TB GP3 vs IO2 vs ST1 → chênh lệch lên tới 10x.
- 1TB S3 Standard vs Glacier Deep Archive → chênh ~17x.

### Option C — Đọc whitepaper
- *Amazon S3 vs EBS vs EFS* whitepaper.

---

## 5. Tự kiểm tra (có đáp án)

1. Đề: *"Cần file share cho 50 Windows server với Active Directory."*
   <details><summary>Trả lời</summary>**FSx for Windows File Server** — SMB + AD.</details>

2. Đề: *"HPC ML training cần đọc 100GB dataset với tốc độ rất cao."*
   <details><summary>Trả lời</summary>**FSx for Lustre** — POSIX HPC.</details>

3. EBS có gắn vào nhiều EC2 cùng lúc không?
   <details><summary>Trả lời</summary>**Thường không**. Chỉ **io1/io2 Multi-Attach** cho phép gắn tối đa 16 EC2 (cùng AZ), cần cluster filesystem (GFS2, OCFS2).</details>

4. Đề: *"Instance Store mất data khi nào?"*
   <details><summary>Trả lời</summary>Khi **stop** hoặc **terminate** instance. **Reboot** thì còn.</details>

5. Đề: *"Cần backup tập trung 50 EFS + 200 EBS + 100 DynamoDB table theo schedule + retention policy."*
   <details><summary>Trả lời</summary>**AWS Backup** — quản tập trung backup plan + vault + lifecycle.</details>

6. Đề: *"On-prem có 50TB file, muốn move dần lên cloud nhưng vẫn cho user mount NFS như cũ."*
   <details><summary>Trả lời</summary>**S3 File Gateway** (mode của Storage Gateway).</details>

7. Đề: *"Cần continuous replication on-prem → AWS, failover nhanh khi disaster."*
   <details><summary>Trả lời</summary>**AWS Elastic Disaster Recovery (DRS)**.</details>

8. EBS rẻ nhất là loại nào?
   <details><summary>Trả lời</summary>**sc1** (cold HDD) — rẻ nhất, dành workload ít access.</details>

9. Đề: *"Volume cần 256,000 IOPS cho SAP HANA."*
   <details><summary>Trả lời</summary>**io2 Block Express** — đạt 256k IOPS, dành mission-critical DB.</details>

10. Lifecycle policy của EFS chuyển file đi đâu khi ít access?
    <details><summary>Trả lời</summary>**EFS Standard-IA** hoặc **One Zone-IA** (tuỳ cấu hình).</details>

---

## 6. Đối chiếu GCP & Azure

| Loại | AWS | GCP | Azure |
|------|-----|-----|-------|
| Block | EBS, Instance Store | Persistent Disk, Local SSD | Managed Disks |
| File (NFS) | EFS | Filestore | Azure Files (NFS) |
| File (SMB) | FSx for Windows | Filestore for Windows (limited) | Azure Files (SMB) |
| HPC | FSx for Lustre | Filestore High Scale | Azure NetApp Files |
| Hybrid gateway | Storage Gateway | Transfer Appliance | Azure StorSimple (deprecated) |
| Backup | AWS Backup | Backup and DR Service | Azure Backup |
| DR | Elastic Disaster Recovery | Backup and DR Service | Azure Site Recovery |

---

## 7. Lưu ý khi thi CLF-C02

- **EBS cùng AZ với EC2**. Snapshot lên S3.
- **EFS = NFS Linux multi-AZ**. **FSx Windows = SMB**. **FSx Lustre = HPC**.
- **Instance Store ephemeral** — đề bẫy "persistent" → loại.
- **Storage Gateway 3 mode**: File / Volume / Tape — hybrid on-prem.
- **AWS Backup** centralized backup, có vault lock (WORM).
- **DRS** = continuous replication + failover.
- **gp3 mặc định mới**, rẻ hơn gp2.

## 8. Lưu ý khi thi SAA-C03 (sâu hơn)

- EBS **encryption at rest** với KMS — copy snapshot để encrypt sau.
- **EFS Throughput mode**: Bursting / Provisioned / Elastic.
- **EFS Performance mode**: General Purpose / Max I/O.
- **FSx Lustre** có thể link với S3 — đọc file từ S3 trong suốt qua Lustre POSIX.
- **Snapshot copy cross-region** cho DR.
- **EBS direct API** đọc snapshot không cần restore.

## 9. Lưu ý khi đi làm

- **Bật EBS encryption by default** ở account level — không bao giờ phải nhớ bật từng cái.
- **gp3 cho mọi gp2** — migrate (`modify-volume`) tiết kiệm 20%.
- **EFS Lifecycle to IA** tiết kiệm 90% cho file > 30 ngày không access.
- **Snapshot lifecycle** (Data Lifecycle Manager) — tự xoá snapshot cũ, tránh tốn S3.
- **AWS Backup vault lock compliance mode** cho production — chống ransomware xoá backup.
- **DRS test failover hàng quý** — backup không test = không có backup.

---

## 10. Flashcard

- **Block**: EBS, Instance Store.
- **File**: EFS (NFS Linux), FSx (4 loại).
- **Object**: S3.
- **EBS volume types**: gp3 (default), gp2 (legacy), io1/io2 (high IOPS), st1 (throughput HDD), sc1 (cold HDD).
- **Instance Store** = ephemeral, mất khi stop.
- **EFS** = NFS, multi-AZ, auto-scale.
- **FSx for Windows** = SMB + AD.
- **FSx for Lustre** = HPC POSIX.
- **FSx for NetApp ONTAP** = NetApp migrate.
- **FSx for OpenZFS** = ZFS.
- **Storage Gateway 3 mode**: File (S3/FSx) / Volume (EBS-iSCSI) / Tape (VTL).
- **AWS Backup** — centralized, vault lock WORM.
- **DRS** — continuous DR replication + failover.
- **EBS Multi-Attach** — chỉ io1/io2, max 16 EC2 cùng AZ.
