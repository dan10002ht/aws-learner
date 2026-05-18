# Lab 02 — S3 Event → Lambda (Event-Driven Architecture)

## Mục tiêu
Build pattern **event-driven** kinh điển trên AWS — pattern này xuất hiện CỰC nhiều trong đề SAA-C03:

```
User upload → S3 bucket → S3 Event Notification → Lambda → Log/Process
```

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Điểm quan trọng |
|---|---|
| **S3 Event Notification destinations** | Lambda, SNS, SQS, EventBridge (4 lựa chọn) |
| **Khi nào dùng SNS vs SQS vs Lambda trực tiếp?** | Lambda: 1 consumer xử lý ngay. SNS: fan-out nhiều subscriber. SQS: buffer/decouple, retry, DLQ |
| **EventBridge** | Filter event phức tạp, route đến >15 target types, schema registry |
| **Lambda execution role** | IAM role Lambda assume khi chạy — KHÔNG phải resource policy |
| **Lambda resource-based policy** | Cho phép S3 invoke Lambda (`lambda:InvokeFunction` từ principal `s3.amazonaws.com`) |
| **Lambda limits** | Timeout max 15 phút, memory 128MB-10GB, payload sync 6MB / async 256KB |
| **Cold start** | Provisioned Concurrency để tránh; SnapStart cho Java |
| **Async invocation** | Có DLQ (SQS/SNS); retry 2 lần |

### Scenario câu hỏi exam hay gặp

**Q:** Khi upload file vào S3, cần xử lý ảnh resize thumbnail VÀ index metadata vào DynamoDB VÀ gửi notification cho user. Mỗi nhiệm vụ độc lập, có thể retry riêng. Kiến trúc nào?

<details><summary>Đáp án</summary>
S3 → SNS → fan-out 3 SQS queues → 3 Lambda riêng. Lý do: decoupling, mỗi Lambda fail không ảnh hưởng cái khác, SQS có DLQ để retry.

❌ Sai: S3 → 1 Lambda làm cả 3 việc (coupling, 1 fail → cả 3 fail).
</details>

**Q:** Lambda function process S3 event, đôi khi fail vì downstream API down. Cần guarantee không mất event, retry sau vài giờ. Làm sao?

<details><summary>Đáp án</summary>
S3 → SQS → Lambda. SQS giữ message tới 14 ngày, có DLQ. Nếu S3 → Lambda trực tiếp, Lambda async chỉ retry 2 lần rồi mất event (trừ khi config DLQ).
</details>

## Chạy lab

```bash
cd ~/projects/aws-practice/lab02-s3-lambda
bash deploy.sh
```

Sau đó test:
```bash
# Upload file → trigger Lambda
echo "test event" > /tmp/test.txt
awslocal s3 cp /tmp/test.txt s3://saa-lab02-source/test.txt

# Xem log Lambda
awslocal logs tail /aws/lambda/s3-event-processor --follow
```
