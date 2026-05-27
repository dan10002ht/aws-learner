# Lab 06 — SNS Fan-out → Multi-SQS

> **Trạng thái:** Skeleton — chưa có `deploy.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/13-decoupling.md](../../lessons/saa-c03/13-decoupling.md)

## Mục tiêu
Build pattern **fan-out** kinh điển — gần như đề SAA-C03 nào cũng có 1 câu:

```
Publisher → SNS topic → SQS queue A → Lambda A
                    ↘ SQS queue B → Lambda B
                    ↘ SQS queue C → Lambda C
```

Tại sao **SNS → SQS** thay vì **SNS → Lambda** trực tiếp? → SQS buffer + DLQ + retry độc lập từng consumer.

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **SNS topic types** | Standard (best-effort ordering) vs **FIFO** (yêu cầu MessageGroupId, subscribe SQS FIFO) |
| **Subscription filter policy** | Filter theo `MessageAttributes` (không phải body) → consumer chỉ nhận event quan tâm |
| **Raw message delivery** | Tắt SNS metadata wrap khi đẩy vào SQS |
| **Cross-region SNS → SQS** | Được, nhưng add cost |
| **Cross-account** | Cần resource policy ở cả SNS topic và SQS queue |
| **DLQ ở SNS** | Có (per subscription), khác DLQ ở SQS — đừng nhầm |
| **Message size limit** | 256 KB. Lớn hơn → SNS **Extended Library** (lưu S3, gửi pointer) |
| **Fanout vs EventBridge** | SNS: nhanh, simple, ~12.5M subscriber/topic. EventBridge: filter content-based body, schema registry, schedule, **~14 target types** |

### Scenario hay gặp

**Q:** Order created event cần: (1) gửi email, (2) update analytics DB, (3) tạo thumbnail. Mỗi process có lúc fail riêng, không muốn process 1 fail làm fail toàn bộ. Architecture?

<details><summary>Đáp án</summary>
SNS topic `order-created` → 3 SQS queue → 3 Lambda. Mỗi SQS có **DLQ riêng**. Process độc lập, retry độc lập.
</details>

**Q:** Cần ordering theo `customerId` cho event order, nhiều consumer. Thiết kế?

<details><summary>Đáp án</summary>
**SNS FIFO** topic + subscriber là **SQS FIFO** queue. Publisher set `MessageGroupId = customerId`. SNS FIFO chỉ subscribe SQS FIFO được (không Lambda/HTTP).
</details>

**Q:** Cần filter event: chỉ consumer A nhận event có `eventType = "premium"`. Cách?

<details><summary>Đáp án</summary>
**Subscription filter policy** trên SNS subscription của A: `{"eventType": ["premium"]}`. Filter theo MessageAttributes (set khi publish).
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo SNS topic
# 2. Tạo 3 SQS queue (mỗi cái có DLQ)
# 3. Subscribe 3 SQS vào SNS với filter policy
# 4. Publish message với attribute → verify chỉ queue match nhận
# 5. (Bonus) SNS FIFO topic + SQS FIFO subscriber
```

## Câu hỏi tự kiểm tra

1. SNS FIFO subscribe vào Lambda được không?
2. Filter policy match theo body hay attribute?
3. SNS Extended Library dùng S3 để làm gì?
