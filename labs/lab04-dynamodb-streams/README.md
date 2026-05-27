# Lab 04 — DynamoDB + Streams + Lambda

> **Trạng thái:** Skeleton — chưa có `lab.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/15-db-design.md](../../lessons/saa-c03/15-db-design.md), [../../lessons/saa-c03/ch2-03-database-performance.md](../../lessons/saa-c03/ch2-03-database-performance.md)

## Mục tiêu
Nắm DynamoDB ở mức **design table** chứ không chỉ "NoSQL key-value":

- **Partition key (PK) vs Sort key (SK)** — composite primary key
- **GSI vs LSI** — phân biệt rõ (lỗi sai kinh điển trong đề)
- **On-demand vs Provisioned** capacity, **auto-scaling**
- **DynamoDB Streams** — `NEW_IMAGE`, `OLD_IMAGE`, `KEYS_ONLY`, `NEW_AND_OLD_IMAGES`
- **Streams → Lambda** event source mapping
- **TTL** auto-delete item
- **Conditional write** chống race condition
- **Transaction** (TransactWriteItems, max 100 actions)

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **LSI** | Phải tạo **lúc create table**, **cùng PK**, **khác SK**. Tối đa 5/table |
| **GSI** | Tạo bất kỳ lúc nào, **PK khác** với base table, eventual consistency only, RCU/WCU riêng |
| **On-Demand** | Cho traffic spike không đoán được, trả per-request, đắt hơn nếu traffic đều |
| **Provisioned + Auto Scaling** | Cho traffic dự đoán được, rẻ hơn nếu utilization cao |
| **DAX** | In-memory cache cho DynamoDB, microsecond latency, chỉ key-value/query (không scan) |
| **Streams retention** | 24h (không config được); cần lâu hơn → ship qua Kinesis |
| **Global Tables** | Multi-region active-active, eventual consistency, conflict = "last writer wins" |
| **Hot partition** | PK design kém → throttle. Fix: composite PK, write sharding |

### Scenario hay gặp

**Q:** Table có PK = `userId`, cần query "tất cả order của user X trong 30 ngày qua" — đã có table rồi. Thêm gì?

<details><summary>Đáp án</summary>
**LSI** với SK = `orderDate` — vì cùng PK (`userId`), chỉ khác SK. NHƯNG nếu table đã tạo rồi → **không thêm LSI được**, phải dùng **GSI** (`userId` PK + `orderDate` SK).
</details>

**Q:** Khi item bị update, cần trigger workflow phân tích → ghi sang S3. Service?

<details><summary>Đáp án</summary>
DynamoDB Streams (NEW_AND_OLD_IMAGES) → Lambda → S3. Hoặc Streams → Kinesis Firehose → S3 nếu cần buffer/batch.
</details>

**Q:** Read-heavy app, latency yêu cầu **microsecond**, ~80% read là cùng item. Giải pháp?

<details><summary>Đáp án</summary>
**DAX** (DynamoDB Accelerator) — write-through cache, microsecond latency cho read.
</details>

## Plan script (sẽ viết)

```bash
# 1. Create table với GSI
awslocal dynamodb create-table \
  --table-name lab04-orders \
  --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=orderId,AttributeType=S \
      AttributeName=status,AttributeType=S \
  --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=orderId,KeyType=RANGE \
  --global-secondary-indexes '[...]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --billing-mode PAY_PER_REQUEST

# 2. PutItem, UpdateItem, query GSI
# 3. Tạo Lambda consume stream → in ra log
```

## Câu hỏi tự kiểm tra

1. LSI và GSI: cái nào support eventual + strong read?
2. Stream retention bao lâu? Muốn lưu 7 ngày phải làm gì?
3. Khi nào dùng DAX, khi nào dùng ElastiCache trước DynamoDB?
