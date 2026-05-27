# Lab 03 — SQS Decoupling

> **Trạng thái:** Skeleton — chưa có `lab.sh`. Đọc trước để nắm kiến thức trọng tâm; script sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/13-decoupling.md](../../lessons/saa-c03/13-decoupling.md)

## Mục tiêu
Hiểu pattern **producer ↔ queue ↔ consumer** và các tham số SQS bị hỏi nhiều trong SAA-C03:

- **Standard vs FIFO** (throughput vs ordering/dedup)
- **Visibility timeout** (mặc định 30s, max 12h) — tránh duplicate processing
- **Long polling** (`ReceiveMessageWaitTimeSeconds`) — giảm cost, latency
- **Dead-Letter Queue (DLQ)** + `maxReceiveCount`
- **Message retention** (1 phút – 14 ngày)
- **Delay queue** vs **per-message delay**
- **Batch send/receive** (tối đa 10 msg/batch)

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **Standard queue** | At-least-once, unordered, gần như vô hạn throughput |
| **FIFO queue** | Exactly-once, ordered theo `MessageGroupId`; max **300 msg/s** (3000 khi batch). Tên phải `.fifo` |
| **Visibility timeout < processing time** | → duplicate processing. Phải tăng VT hoặc dùng `ChangeMessageVisibility` |
| **DLQ** | Cấu hình ở **source queue**, redrive policy. DLQ nên cùng type (Standard ↔ Standard, FIFO ↔ FIFO) |
| **Long polling 20s** | Mặc định short polling (0s); long polling giảm số empty response → giảm cost |
| **SQS vs Kinesis** | SQS: queue decouple, không replay. Kinesis: stream, có shard, replay được trong retention |
| **SQS vs SNS** | SQS: pull, 1 consumer group. SNS: push, fan-out nhiều subscriber |

### Scenario hay gặp

**Q:** Worker process message ~5 phút mỗi cái, đôi khi lỗi và message bị nhận lại bởi worker khác → xử lý 2 lần. Sửa thế nào?

<details><summary>Đáp án</summary>
Tăng **visibility timeout** lên ≥ 5 phút (best practice: 6× thời gian xử lý trung bình). Hoặc trong code: gọi `ChangeMessageVisibility` để gia hạn khi cần.
</details>

**Q:** Cần xử lý transaction theo thứ tự per-customer, throughput ~200 msg/s tổng. Queue nào?

<details><summary>Đáp án</summary>
**FIFO** với `MessageGroupId = customerId`. Ordering chỉ trong cùng group, các group khác nhau xử lý song song → đạt được throughput 300 msg/s tổng.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo DLQ
awslocal sqs create-queue --queue-name lab03-dlq

# 2. Tạo main queue với redrive policy
awslocal sqs create-queue --queue-name lab03-main \
  --attributes '{
    "VisibilityTimeout":"60",
    "ReceiveMessageWaitTimeSeconds":"20",
    "RedrivePolicy":"{\"deadLetterTargetArn\":\"<DLQ_ARN>\",\"maxReceiveCount\":\"3\"}"
  }'

# 3. Send/receive thử + force fail để xem DLQ nhận message
# 4. Tạo FIFO queue + test ordering theo MessageGroupId
```

## Câu hỏi tự kiểm tra

1. FIFO queue nhận 5000 msg/s không batch — đúng/sai?
2. Visibility timeout có ảnh hưởng đến message retention không?
3. Nếu DLQ là FIFO mà source là Standard, AWS có cho redrive không?
