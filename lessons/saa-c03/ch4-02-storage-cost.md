# SAA Ch4.2 — Storage Cost Optimization

> Mục tiêu: Cắt storage bill bằng đúng tier (S3 class, Glacier), lifecycle automation, EBS right-sizing, snapshot cleanup, và pattern data tiering không mất truy cập.

Tiền đề: [[ch2-02-storage-performance]], CLF [[05-s3]].

---

## 1. Câu chuyện mở đầu — "Bucket 500TB Standard, đọc 1 lần/năm"

Audit bucket: 500TB S3 Standard, $11,500/tháng. Access pattern: 99% object **không bao giờ đọc lại sau 30 ngày**. Còn lại 1% đọc 1-2 lần/năm.

Sau lifecycle:
- 30 ngày → Standard-IA: $6,500.
- 90 ngày → Glacier Instant: $4,000.
- 1 năm → Glacier Deep Archive: $500.

Bill mới: **$500/tháng cho cold + transition cost**. Save **$11,000/tháng**.

→ Storage cost = **placement đúng tier × volume**. Lifecycle policy là pattern then-chốt.

---

## 2. S3 storage classes — bảng đầy đủ

| Class | Price/GB (US) | Retrieval | Min duration | Min size | Availability |
|-------|---------------|-----------|--------------|----------|--------------|
| **Standard** | $0.023 | Free, ms | — | — | 99.99% |
| **Intelligent-Tiering** | $0.023 (Frequent) → $0.0125 (IA) → $0.004 (Archive Instant) → $0.00099 (Archive) → $0.00099 (Deep Archive) | Free + monitor fee | — | — | 99.9% |
| **Standard-IA** | $0.0125 | $0.01/GB | 30 ngày | 128 KB | 99.9% |
| **One Zone-IA** | $0.01 | $0.01/GB | 30 ngày | 128 KB | 99.5% (1 AZ) |
| **Glacier Instant Retrieval** | $0.004 | $0.03/GB | 90 ngày | 128 KB | 99.9% |
| **Glacier Flexible Retrieval** | $0.0036 | $0.01/GB + $0.03 request | 90 ngày | — | 99.99% (after restore) |
| **Glacier Deep Archive** | $0.00099 | $0.02/GB | 180 ngày | — | 99.9% |

### Quy tắc chọn

| Pattern | Class |
|---------|-------|
| Hot, frequent | Standard |
| Hot+IA mix, không biết pattern | Intelligent-Tiering |
| Cold known (> 30 ngày, ít access) | Standard-IA |
| Non-critical secondary copy | One Zone-IA |
| Archive, đôi khi cần ngay | Glacier Instant |
| Archive, retrieval phút-giờ OK | Glacier Flexible |
| Long-term compliance, retrieval giờ-ngày | Glacier Deep Archive |

---

## 3. Lifecycle policies

### 3.1 Cấu trúc

```json
{
  "Rules": [{
    "ID": "ArchiveOldLogs",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 }
  }]
}
```

### 3.2 Chú ý
- **Min storage duration**: nếu xóa/transition object trước duration min của class hiện tại → **pay full duration**. Ví dụ object Standard-IA xóa sau 10 ngày → pay 30 ngày.
- **Per-object monitoring fee** với Intelligent-Tiering object > 128 KB.
- **Transitions cost tiền** (per 1000 request). Hàng triệu object nhỏ transition tốn nhiều.
- **Non-current versions** (versioning) cần rule riêng — dễ quên, accumulate.
- **Multipart upload incomplete**: lifecycle `AbortIncompleteMultipartUpload` để dọn.

### 3.3 Pattern lifecycle phổ biến

**Log/audit**: 30d Standard → 30d Standard-IA → 1y Glacier → 7y Deep Archive → expire.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời object S3 theo tuổi: chuyển tầng để giảm chi phí</title>
  <desc>Timeline ngang theo tuổi object log/audit. Standard từ 0 đến 30 ngày, Standard-IA tại 30 ngày, Glacier Instant tại 90 ngày, Deep Archive tại 365 ngày, rồi expire. Càng về cuối chi phí lưu trữ càng giảm nhưng thời gian lấy lại càng tăng.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Lifecycle log/audit — chuyển tầng theo tuổi object</text>

  <line x1="30" y1="70" x2="690" y2="70" stroke="currentColor" stroke-opacity="0.45"/>
  <polygon points="690,70 680,65 680,75" fill="currentColor" fill-opacity="0.6"/>
  <text x="30" y="58" font-size="11" fill="currentColor" opacity="0.7">0d</text>
  <text x="190" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">30d</text>
  <text x="350" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">90d</text>
  <text x="510" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">365d</text>
  <text x="660" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">7y</text>

  <g>
    <rect x="30" y="86" width="150" height="58" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="30" y1="70" x2="30" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="105" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Standard</text>
    <text x="105" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc tức thì · giá cao nhất</text>
  </g>
  <g>
    <rect x="190" y="86" width="150" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="190" y1="70" x2="190" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="265" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Standard-IA</text>
    <text x="265" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc ms · phí retrieval</text>
  </g>
  <g>
    <rect x="350" y="86" width="150" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="350" y1="70" x2="350" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="425" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Glacier Instant</text>
    <text x="425" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc ms · giá thấp</text>
  </g>
  <g>
    <rect x="510" y="86" width="150" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="510" y1="70" x2="510" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="585" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Deep Archive</text>
    <text x="585" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">restore 12-48h · rẻ nhất</text>
  </g>

  <g fill="currentColor" fill-opacity="0.55">
    <polygon points="180,115 192,109 192,121"/>
    <polygon points="340,115 352,109 352,121"/>
    <polygon points="500,115 512,109 512,121"/>
  </g>

  <g transform="translate(660,86)">
    <text x="6" y="34" font-size="11" font-weight="700" fill="currentColor" opacity="0.7">expire</text>
    <text x="6" y="50" font-size="10" fill="currentColor" opacity="0.55">(xóa)</text>
  </g>

  <text x="30" y="216" font-size="11.5" font-weight="700" fill="currentColor">Chi phí lưu trữ / GB</text>
  <rect x="30" y="226" width="660" height="14" rx="7" fill="#10b981" fill-opacity="0.18"/>
  <text x="40" y="237" font-size="10.5" fill="currentColor" opacity="0.75">cao</text>
  <text x="680" y="237" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.75">rất thấp</text>
  <polygon points="30,233 680,228 680,238 30,238" fill="#10b981" fill-opacity="0.22"/>

  <text x="30" y="270" font-size="11.5" font-weight="700" fill="currentColor">Thời gian lấy lại (retrieval)</text>
  <rect x="30" y="280" width="660" height="14" rx="7" fill="#f59e0b" fill-opacity="0.16"/>
  <text x="40" y="291" font-size="10.5" fill="currentColor" opacity="0.75">tức thì</text>
  <text x="680" y="291" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.75">hàng giờ-ngày</text>
  <polygon points="30,288 680,283 680,293 30,293" fill="#f59e0b" fill-opacity="0.22"/>
</svg>

**User upload**:
- Hot năm đầu: Standard.
- Cold: Standard-IA hoặc Intelligent-Tiering.
- Delete sau N năm theo policy retention.

**Backup**: lên Glacier ngay, retention theo policy.

---

## 4. S3 Intelligent-Tiering deep

- **Frequent tier**: object access < 30 ngày — Standard rate.
- **Infrequent tier**: > 30 ngày không access — drop to IA rate.
- **Archive Instant**: > 90 ngày → Glacier IR rate (auto, không cần restore).
- **Archive (optional)**: > 90 ngày → Glacier Flexible (cần restore khi access).
- **Deep Archive (optional)**: > 180 ngày → Glacier Deep Archive (cần restore).

**Monitoring fee**: $0.0025/1000 object/tháng. Object > 128 KB. Object nhỏ không tier (nhưng cũng không fee).

> Khi nào dùng: access pattern không dự đoán được. Không cần optimization manual.

> Khi nào KHÔNG dùng: bucket nhỏ + nhiều object < 128 KB (fee cao hơn tiết kiệm).

---

## 5. S3 storage analytics

- Bật **Storage Class Analysis** → S3 report object access pattern.
- Sau 30 ngày, AWS recommend transition rule.
- Cost: per object monitored.
- Use case: data-driven lifecycle design thay vì đoán.

---

## 6. S3 cost saving tactics

### 6.1 Versioning cost trap
- Mỗi version = 1 object full size charge.
- Non-current versions accumulate → bill tăng.
- **Lifecycle rule cho non-current**: transition/expire riêng.

### 6.2 Replication cost
- CRR/SRR: pay destination storage + replication request + cross-region transfer.
- **Replication Time Control (RTC)**: extra fee cho SLA 15 phút.
- Cân nhắc One Zone-IA cho replica nếu DR-only (không production traffic).

### 6.3 Multipart upload cleanup
- Failed upload → parts vẫn bill. Set lifecycle abort > 7 ngày.

### 6.4 Empty bucket vẫn có cost
- Empty hoặc near-empty với nhiều lifecycle/inventory enabled vẫn có tiny fee.

### 6.5 Request cost
- PUT/COPY/POST/LIST: $0.005 / 1000 (Standard).
- GET: $0.0004 / 1000.
- High-frequency tiny object → request cost > storage cost. Consider batch, compress, aggregate.

---

## 7. EBS cost optimization

### 7.1 Right-size volume
- Allocated > used? Snapshot, restore vào volume size nhỏ hơn, swap.
- gp2 → gp3 migration: ~20% rẻ + tốt hơn.

### 7.2 Snapshot cleanup
- Snapshot là **incremental nhưng cost dồn**. 100 snapshot 1TB volume có thể cost > 1TB (do blocks changed).
- **Data Lifecycle Manager (DLM)**: schedule snapshot + retention policy.
- **Recycle Bin**: nếu xóa nhầm vẫn restore được.
- AWS Backup vault retention.

### 7.3 Snapshot archive tier (2022+)
- Snapshot không truy cập thường → move sang archive tier.
- 75% rẻ hơn standard.
- Restore tốn 24-72h.
- Use case: compliance snapshot retention 7 năm.

### 7.4 Detached volume cleanup
- Volume detach từ instance vẫn bill.
- Trusted Advisor / Cost Anomaly Detection flag.

### 7.5 Right io2 vs gp3
- gp3 đủ cho 90% workload.
- io2 chỉ khi cần > 16k IOPS hoặc sub-ms.
- Migrate io2 → gp3 nếu workload không cần — save ~50%.

---

## 8. EFS cost optimization

### 8.1 Storage class
- **Standard**: hot, $0.30/GB.
- **Standard-IA**: $0.025/GB + per-access charge.
- **One Zone Standard / One Zone-IA**: rẻ hơn, 1 AZ.
- **Archive** (mới 2023): $0.00018/GB cho data ít truy cập.

### 8.2 Lifecycle
- Tự move file không access → IA hoặc Archive.
- IA → Standard tự động khi access lại.

### 8.3 Throughput mode
- Elastic (default 2023+): pay per IOPS/throughput.
- Bursting: theo size. Có thể tốn nếu size lớn nhưng throughput thấp.

---

## 9. FSx cost

### 9.1 FSx for Windows / NetApp / OpenZFS
- Right-size capacity và throughput độc lập.
- Dedupe (NetApp) — save 30-70% capacity bill.
- Compression — extra save.
- Backup retention — clean up.

### 9.2 FSx for Lustre
- **Scratch** rẻ hơn nhiều **Persistent**.
- Tạo khi cần, terminate khi xong (use S3 import/export).
- Don't run 24/7 unless workload daily.

---

## 10. Glacier vault & deep archive

### 10.1 Retrieval tiers (Glacier Flexible)
- **Expedited**: 1-5 phút, $0.03/GB.
- **Standard**: 3-5 giờ, $0.01/GB.
- **Bulk**: 5-12 giờ, $0.0025/GB.

### 10.2 Deep Archive
- **Standard**: 12 giờ.
- **Bulk**: 48 giờ.

### 10.3 Restore cost trap
- Retrieval fee = restore cost. Restore 100TB Standard Glacier = $1000.
- Restored data lưu Standard tier 1-365 ngày (configurable) → bill thêm.
- Đừng restore không cần thiết.

---

## 11. Backup cost

- **AWS Backup** centralize.
- **Cold storage** cho long-term retention (EBS, EFS, DynamoDB, RDS, FSx).
- **Cross-region copy** double cost.
- **Audit**: list backup không dùng, expire.

---

## 12. Data transfer cost (storage-related)

- Egress internet: $0.09/GB → big chunk if download-heavy.
- **CloudFront trước S3**: 50-90% giảm origin egress.
- **VPC Gateway endpoint S3**: free, tránh NAT GW data charge.
- **S3 Transfer Acceleration**: extra fee per GB nhưng nhanh — chỉ dùng khi cần.
- **Cross-region**: $0.02/GB intra-continent, $0.09/GB cross-continent.

---

## 13. Patterns cost saving cho 3 use case

### 13.1 Log archive 5 năm
- 90 ngày Standard (query nóng) → Standard-IA → 1 năm Glacier Flexible → 5 năm Deep Archive.
- Compress (Parquet/Snappy) trước upload → reduce 70-90% size.
- Athena query trên Parquet → scan ít hơn → cost query ít.

### 13.2 Backup database daily, retention 30 ngày + monthly retention 1 năm
- AWS Backup plan:
  - Daily snapshot, retain 30 ngày warm.
  - Monthly snapshot, retain 1 năm cold.
  - Cross-region copy hàng tháng.
- DLM cho EBS snapshot tương tự.

### 13.3 User-generated content (photo upload)
- Standard 90 ngày (active engagement).
- Intelligent-Tiering hoặc lifecycle → Standard-IA → Glacier Instant.
- CloudFront cache phổ biến content.
- Deduplicate ở app layer (hash) để không lưu trùng.

---

## 14. Cạm bẫy đề thi (SAA)

1. **"Standard-IA luôn rẻ hơn Standard"** → **Sai** nếu access nhiều — retrieval fee + min duration đẩy cost lên.
2. **"Glacier Deep Archive instant retrieval"** → **Sai**, 12-48h.
3. **"Intelligent-Tiering cho mọi object nhỏ"** → **Sai**, object < 128 KB không tier — monitor fee waste.
4. **"Lifecycle expire object xóa version"** → **Cần rule riêng** cho versioned bucket.
5. **"EBS snapshot không xóa volume = free"** → **Sai**, snapshot bill độc lập.
6. **"gp3 luôn rẻ hơn gp2"** → **Đúng** cho baseline. Provision cao có thể tương đương.
7. **"S3 Transfer Acceleration giảm cost"** → **Sai**, extra fee, chỉ tăng speed.
8. **"Bucket trong region rẻ nhất luôn tiết kiệm"** → **Sai**, data transfer + service availability quan trọng hơn.

---

## 15. Tóm tắt 1 dòng

> Storage cost = **tier × volume × movement**. Lifecycle policy là tool then-chốt. **Intelligent-Tiering** khi không biết pattern, **explicit lifecycle** khi biết. Cleanup non-current version, multipart, detached EBS, snapshot orphan.

---

## 16. Bài tập tự kiểm tra

1. Bucket 100TB Standard, $2300/tháng. 80% object > 30 ngày không touch. Plan migration & expected saving?
2. Lifecycle rule transition object < 128 KB sang IA tier — vấn đề gì xảy ra?
3. EBS snapshot 100TB volume, 7 daily + 4 weekly + 12 monthly. Bill snapshot quá cao. Optimization?
4. App ghi 1M file 5KB/ngày vào S3. Storage bill thấp nhưng request bill cao. Action?
5. Backup cross-region cho compliance. Cost = 3x storage. Cách giảm?
6. EFS 10TB, 95% file không truy cập 6 tháng+. Setup gì để cost giảm tự động?

---

## 17. Đọc thêm

- AWS Whitepaper — *Cost Optimization Pillar*.
- AWS docs — *S3 storage classes*, *Lifecycle*, *EBS snapshot pricing*.
- *S3 Cost Optimization Best Practices*.

---

**Bài tiếp theo**: [[ch4-03-db-network-cost]] — Aurora/DynamoDB cost, data transfer, egress optimization.
