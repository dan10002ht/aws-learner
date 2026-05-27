# Lab 10 — Step Functions Orchestration

> **Trạng thái:** Skeleton — chưa có `deploy.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/13-decoupling.md](../../lessons/saa-c03/13-decoupling.md)

## Mục tiêu
Phân biệt **choreography (event-driven)** vs **orchestration (Step Functions)** và biết khi nào dùng cái nào.

- **Standard vs Express** workflow
- **Task states**: Lambda, ECS, SNS, SQS, DynamoDB, Batch...
- **Error handling**: `Retry`, `Catch`, `TimeoutSeconds`
- **Parallel** vs **Map** (iterate over array)
- **Wait state** (theo seconds hoặc timestamp)
- **Callback pattern** (`.waitForTaskToken`) — pause until external system trả về
- **Express + API Gateway** cho sync workflow

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **Standard workflow** | Max **1 năm**, exactly-once, trả phí per state transition. Long-running |
| **Express workflow** | Max **5 phút**, at-least-once, trả phí per execution + duration. High-volume, short |
| **Sync vs Async Express** | Sync trả response ngay (cho API Gateway), Async fire-and-forget |
| **Retry vs Catch** | Retry: thử lại theo `IntervalSeconds`, `BackoffRate`, `MaxAttempts`. Catch: branch nhánh error |
| **Map state** | Iterate array, mỗi item chạy 1 sub-workflow song song, max concurrency cấu hình được |
| **Callback (waitForTaskToken)** | Task trả token, external system gọi `SendTaskSuccess/Failure` để resume. Pattern human approval |
| **Step Functions vs SWF** | SWF (Simple Workflow) **legacy**, Step Functions thay thế. Đề mới không hỏi SWF |
| **Step Functions vs EventBridge Pipes** | Pipes: simple filter+enrich+target, không orchestration. SF: complex workflow |

### Scenario hay gặp

**Q:** Workflow approve order: Lambda check inventory → email manager approve → nếu approved trong 24h thì charge, không thì cancel. Pattern?

<details><summary>Đáp án</summary>
**Standard** Step Functions với **Wait for callback (`.waitForTaskToken`)**. Lambda gửi email kèm token. Manager click link → API gọi `SendTaskSuccess`. Có **TimeoutSeconds = 86400** → tự cancel.
</details>

**Q:** Process batch 10000 file mỗi file 1 Lambda invocation, cần track tiến độ + retry per-file. Pattern?

<details><summary>Đáp án</summary>
**Map state** với `MaxConcurrency`. Retry/Catch cấu hình ở mỗi iteration. Standard workflow để có exactly-once + duration dài.
</details>

**Q:** API public cần workflow sync 3 step Lambda, mỗi step < 1s. Loại workflow?

<details><summary>Đáp án</summary>
**Express workflow (Sync)** behind API Gateway. Rẻ hơn Standard cho high-volume, latency thấp, trả response ngay.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo 3 Lambda đơn giản (validate, process, notify)
# 2. ASL definition với Pass → Task → Choice → Task → Catch
# 3. Tạo state machine Standard
# 4. Start execution, kiểm tra trạng thái
# 5. (Bonus) Map state iterate qua 100 item
# 6. (Bonus) Express sync execution
```

## Câu hỏi tự kiểm tra

1. Standard workflow chạy tối đa bao lâu? Express?
2. Khi nào dùng Choreography (SNS/EventBridge) thay vì Orchestration (Step Functions)?
3. Pattern human approval dùng tính năng gì của Step Functions?
