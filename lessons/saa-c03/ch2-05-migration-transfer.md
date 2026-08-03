# SAA Ch2.5 — Data Transfer & Migration

> Mục tiêu: Chọn đúng dịch vụ **di chuyển dữ liệu & migration** cho từng tình huống — online vs offline, một lần vs liên tục, file vs database vs object. Nắm chắc các cặp exam hay bẫy: **DataSync vs Snowball vs Storage Gateway**, **DMS vs DataSync**, và ba loại **Storage Gateway**. Đây là cụm dịch vụ hay bị học thiếu nhất nhưng ra đề đều đặn (Domain 3 — data ingestion & transfer, Domain 4 — hybrid/cost).

---

## 1. Câu chuyện mở đầu — "chuyển 500TB lên cloud"

Một công ty có **500 TB** dữ liệu trên NAS on-prem cần đưa lên S3, đường truyền Internet chỉ **500 Mbps**. Bạn của bạn đề xuất "cứ `aws s3 cp` là xong". Hãy tính:

> 500 TB qua 500 Mbps (lý tưởng, không nghẽn) ≈ **~92 ngày**. Thực tế còn chậm hơn vì chia sẻ băng thông với production.

→ Với khối lượng đó, **DataSync** (online, tối ưu) vẫn mất hàng tuần; **Snowball Edge** (offline, gửi thiết bị) chỉ mất vài ngày ship. Chọn sai dịch vụ = sai cả tháng. Đây chính là dạng câu hỏi exam yêu thích: cho **dung lượng + băng thông + thời hạn**, hỏi bạn chọn gì.

---

## 2. Bản đồ quyết định

Trước khi thuộc từng dịch vụ, nắm cây quyết định 3 câu hỏi:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="mt-t mt-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="mt-t">Cây quyết định chọn dịch vụ di chuyển dữ liệu</title>
<desc id="mt-d">Phân nhánh theo loại dữ liệu (database, file/object) và online hay offline</desc>
<rect x="270" y="12" width="180" height="40" rx="8" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="360" y="37" text-anchor="middle" font-size="13" fill="currentColor">Cần di chuyển dữ liệu?</text>
<rect x="30" y="95" width="180" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="114" text-anchor="middle" font-size="12" fill="currentColor">Là DATABASE?</text>
<text x="120" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ DMS (+ SCT)</text>
<rect x="270" y="95" width="180" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="114" text-anchor="middle" font-size="12" fill="currentColor">File/Object, ONLINE</text>
<text x="360" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ DataSync</text>
<rect x="510" y="95" width="180" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="600" y="114" text-anchor="middle" font-size="12" fill="currentColor">Quá lớn / băng thông thấp</text>
<text x="600" y="131" text-anchor="middle" font-size="11" fill="currentColor">→ Snow Family (offline)</text>
<rect x="150" y="190" width="200" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="209" text-anchor="middle" font-size="12" fill="currentColor">Giữ app on-prem, cần cloud</text>
<text x="250" y="226" text-anchor="middle" font-size="11" fill="currentColor">→ Storage Gateway (hybrid)</text>
<rect x="390" y="190" width="200" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="209" text-anchor="middle" font-size="12" fill="currentColor">Đối tác đang dùng SFTP</text>
<text x="490" y="226" text-anchor="middle" font-size="11" fill="currentColor">→ Transfer Family</text>
<line x1="330" y1="52" x2="140" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="52" x2="360" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="52" x2="580" y2="93" stroke="currentColor" stroke-width="1"/>
<line x1="330" y1="52" x2="250" y2="188" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="400" y1="52" x2="490" y2="188" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="360" y="270" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.85">Quy tắc: DB → DMS · file online → DataSync · quá lớn/chậm → Snow · giữ app on-prem → Storage Gateway</text>
</svg>

---

## 3. AWS DataSync — di chuyển ONLINE, tối ưu

**Là gì:** dịch vụ chuyển dữ liệu **online, agent-based**, tự động hoá copy giữa on-prem và AWS (hoặc AWS↔AWS).

- **Nguồn/đích:** NFS, SMB, HDFS, self-managed object storage → **S3, EFS, FSx** (Windows/Lustre/ONTAP/OpenZFS). Cả **cross-region** và **cross-account**.
- Nhanh hơn công cụ script tự viết tới ~10 lần nhờ giao thức tối ưu song song, có **nén, mã hoá in-transit (TLS), verify integrity**.
- Chạy **một lần** hoặc **theo lịch** (scheduled, incremental) — hợp cả migration lẫn **replication/DR liên tục**.
- Trả phí theo **GB đã chuyển**.

> 💡 DataSync là lựa chọn mặc định cho **"di chuyển/đồng bộ file qua mạng"** khi băng thông đủ. Nếu câu hỏi nói *"scheduled"*, *"ongoing replication"*, *"NFS/SMB sang EFS/FSx"* → gần như chắc chắn là DataSync.

---

## 4. AWS Snow Family — di chuyển OFFLINE (gửi thiết bị)

Khi **dữ liệu quá lớn** hoặc **băng thông quá thấp** để chuyển online kịp hạn → AWS **gửi thiết bị vật lý** tới, bạn copy dữ liệu vào rồi gửi trả, AWS nạp lên S3.

| Thiết bị | Dung lượng | Điểm nhấn |
|----------|-----------|-----------|
| **Snowcone** | ~8-14 TB | Nhỏ, nhẹ, chịu môi trường khắc nghiệt (edge, drone); có thể dùng DataSync trên đó |
| **Snowball Edge — Storage Optimized** | ~80 TB | Chủ lực cho migration khối lượng lớn |
| **Snowball Edge — Compute Optimized** | ~80 TB + GPU | Vừa chuyển vừa **chạy compute tại edge** (xử lý trước khi gửi) |
| **Snowmobile** | tới ~100 PB | Xe container cho exabyte (đang bị khai tử — hiếm gặp) |

- Dữ liệu trên thiết bị **mã hoá bằng KMS**, có E-Ink shipping label chống thất lạc.
- **Quy tắc ngón tay cái exam:** nếu chuyển online mất **hơn ~1 tuần** → nghiêng về Snow.

> 🪤 Bẫy thi: "Nhà máy ở vùng sâu, mạng yếu, cần vừa **thu thập + xử lý** dữ liệu tại chỗ rồi đưa về AWS" → **Snowball Edge Compute Optimized** (không phải DataSync — mạng yếu; không phải Storage Optimized — cần compute).

---

## 5. AWS Storage Gateway — HYBRID (giữ app on-prem, lưu ở cloud)

Khác DataSync/Snow (chuyển **một chiều** rồi thôi), Storage Gateway cho app on-prem **truy cập liên tục** kho lưu trữ AWS qua giao thức quen thuộc. Ba loại — phải phân biệt:

| Loại | Giao thức on-prem | Lưu ở đâu | Use case |
|------|-------------------|-----------|----------|
| **File Gateway** | NFS / SMB | S3 (file = object) | App NFS/SMB nhưng backend là S3; tận dụng lifecycle/Glacier |
| **Volume Gateway** | iSCSI (block) | EBS snapshot trên S3 | **Cached**: dữ liệu chính ở S3, cache nóng on-prem · **Stored**: dữ liệu chính on-prem, async backup lên S3 |
| **Tape Gateway (VTL)** | iSCSI VTL | S3 / Glacier | **Thay thư viện băng từ vật lý**; backup software cũ vẫn "ghi tape" |

> 🪤 Bẫy thi: "Muốn **bỏ tủ băng từ (tape library)** nhưng giữ nguyên phần mềm backup" → **Tape Gateway**. "App on-prem cần truy cập file qua **SMB** với backend S3" → **File Gateway**.

---

## 6. AWS DMS (+ SCT) — migration DATABASE

**DMS (Database Migration Service):** di chuyển database với **downtime tối thiểu** — nguồn vẫn chạy trong lúc copy nhờ **CDC (Change Data Capture)** bắt thay đổi liên tục.

- **Homogeneous** (cùng engine, vd Oracle→Oracle, MySQL→Aurora MySQL): DMS chạy trực tiếp.
- **Heterogeneous** (khác engine, vd **Oracle→Aurora PostgreSQL**): cần **SCT (Schema Conversion Tool)** chuyển schema/stored-procedure trước, rồi DMS chuyển dữ liệu.
- Chạy trên **replication instance**; hỗ trợ nguồn/đích rộng (RDS, Aurora, S3, DynamoDB, Redshift, on-prem DB...).

> 💡 Từ khoá nhận diện: *"migrate database with minimal downtime"*, *"ongoing replication"* → **DMS**. Nếu **đổi engine** (Oracle→Aurora) → **DMS + SCT**. Đừng nhầm với DataSync (file, không hiểu schema DB).

---

## 7. AWS Transfer Family — cổng SFTP/FTPS/FTP/AS2 quản lý

Cho phép đối tác/hệ thống cũ tiếp tục dùng **SFTP/FTPS/FTP/AS2**, nhưng dữ liệu đáp thẳng vào **S3 hoặc EFS** — không phải nuôi server FTP tự quản.

> 🪤 Bẫy thi: "Nhiều đối tác **đang dùng SFTP** upload file, muốn lưu vào S3 mà không đổi quy trình của họ" → **Transfer Family** (không phải Storage Gateway, không phải DataSync).

---

## 8. AWS Application Migration Service (MGN) — rehost server

**MGN** (thay CloudEndure/SMS cũ): **lift-and-shift** máy chủ vật lý/VM lên **EC2** với thay đổi tối thiểu (block-level replication rồi cutover). Từ khoá: *"rehost VMs to EC2 with minimal changes"*.

---

## 9. Bảng quyết định tổng

| Tình huống | Dịch vụ |
|-----------|---------|
| Đồng bộ NFS/SMB → EFS/FSx/S3 qua mạng, theo lịch | **DataSync** |
| Chuyển PB / băng thông thấp / offline | **Snow Family** |
| Thu thập + xử lý tại edge rồi gửi về | **Snowball Edge Compute Optimized** |
| App on-prem cần truy cập S3 qua NFS/SMB | **Storage Gateway — File** |
| Thay thư viện băng từ vật lý | **Storage Gateway — Tape** |
| Backup block on-prem lên cloud, cache nóng | **Storage Gateway — Volume (Cached)** |
| Migrate DB downtime tối thiểu, cùng engine | **DMS** |
| Migrate DB **đổi engine** (Oracle→Aurora) | **DMS + SCT** |
| Đối tác dùng SFTP, lưu vào S3 | **Transfer Family** |
| Rehost VM/server lên EC2 | **Application Migration Service (MGN)** |

---

## 10. Các cặp so sánh exam hay bẫy

- **DataSync vs Snowball:** đều chuyển dữ liệu một chiều. DataSync = **online** (băng thông đủ, ongoing); Snowball = **offline** (quá lớn/mạng yếu). Cùng lượng data mà "chuyển online mất >1 tuần" → Snowball.
- **DataSync vs Storage Gateway:** DataSync = **chuyển rồi thôi** (migration/replication). Storage Gateway = **truy cập lai liên tục** (app on-prem vẫn dùng đều). "One-time/scheduled transfer" → DataSync; "keep using on-prem app" → Storage Gateway.
- **DMS vs DataSync:** DMS hiểu **database & schema/CDC**; DataSync chỉ hiểu **file/object**. Migrate DB → DMS, không bao giờ DataSync.
- **Snowball Edge Storage vs Compute Optimized:** chỉ chuyển data → Storage; cần **chạy xử lý tại edge** → Compute.

---

## 11. Ví dụ chọn dịch vụ

**11.1** *200 TB video archive, đường truyền 1 Gbps, cần lên S3 Glacier trong 2 tuần.* → Online mất ~18+ ngày, sát hạn & rủi ro → **Snowball Edge Storage Optimized** (ship vài ngày). Sau đó lifecycle sang Glacier.

**11.2** *Mỗi đêm đồng bộ 2 TB file mới từ NAS (NFS) on-prem sang EFS cho phân tích.* → Ongoing, scheduled, file qua mạng → **DataSync** (incremental).

**11.3** *Di chuyển Oracle 11g on-prem sang Aurora PostgreSQL, downtime tối thiểu.* → Đổi engine + CDC → **DMS + SCT**.

**11.4** *App kế toán on-prem ghi file qua SMB, muốn backend là S3 để dùng lifecycle & versioning, app không đổi.* → **Storage Gateway — File Gateway**.

**11.5** *Trạm quan trắc ngoài khơi, mạng vệ tinh chập chờn, cần lọc/nén dữ liệu cảm biến tại chỗ rồi gửi về hàng tháng.* → **Snowball Edge Compute Optimized** (compute tại edge + offline transfer).

---

## 12. Tóm tắt
- Cụm **Migration & Transfer** map vào **Domain 3 (data ingestion/transfer)** và **Domain 4 (hybrid/cost)** — ra đề đều, hay bị học thiếu.
- **DataSync** = online file/object (scheduled, NFS/SMB→EFS/FSx/S3). **Snow Family** = offline khi quá lớn/mạng yếu (Compute Optimized cho edge compute).
- **Storage Gateway** = hybrid *truy cập liên tục*: File (S3 qua NFS/SMB), Volume (iSCSI block, cached/stored), Tape (thay băng từ).
- **DMS (+SCT)** = migration database, homogeneous vs heterogeneous, CDC downtime tối thiểu. **Transfer Family** = SFTP/FTPS→S3/EFS. **MGN** = rehost server lên EC2.
- Thuộc **bảng quyết định (§9)** và **cặp so sánh (§10)** là đủ trả lời hầu hết câu hỏi cụm này.

> 🎯 Nhớ 4 câu quyết định: **DB? → DMS · file online? → DataSync · quá lớn/offline? → Snow · giữ app on-prem? → Storage Gateway.**
