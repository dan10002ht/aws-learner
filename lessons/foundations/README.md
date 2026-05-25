# Foundations — Distributed Systems cho AWS

Nhánh này chứa kiến thức nền tảng về **hệ phân tán**, được trình bày gắn liền với các dịch vụ AWS. Không bắt buộc cho CLF-C02, nhưng **rất nên đọc trước khi bước vào SAA-C03** — sẽ giúp bạn trả lời các câu hỏi về Database / Storage / Multi-Region một cách bản chất thay vì học vẹt.

## Danh sách bài

| # | Bài | Trạng thái | Liên hệ AWS |
|---|-----|------------|-------------|
| 01 | [Định lý CAP (và PACELC)](01-cap-theorem.md) | ✅ | DynamoDB, Aurora, RDS Multi-AZ, S3 |
| 02 | [Consistency Models](02-consistency-models.md) | ✅ | DynamoDB reads, S3, Read Replica |
| 03 | [Replication & Quorum](03-replication-and-quorum.md) | ✅ | Aurora 4/6, DynamoDB, MSK |
| 04 | [Latency vs Consistency — Multi-Region](04-latency-vs-consistency.md) | ✅ | Global Tables, Aurora Global, Route53 |
| 05 | [Partitioning & Sharding](05-partitioning-and-sharding.md) | ✅ | DynamoDB partition key, RDS sharding |
| 06 | [Failure Modes & Cascading Failures](06-failure-modes.md) | ✅ | Multi-AZ, circuit breaker, retry storm |

## Cách học

1. Đọc tuần tự — mỗi bài build trên bài trước.
2. Sau mỗi bài, mở lại bài AWS tương ứng (vd: sau CAP → đọc lại [07-databases.md](../07-databases.md)) và tự hỏi: "service này thuộc nhóm nào?"
3. Làm bài tập cuối bài. Không cần đáp án hoàn hảo — quan trọng là **lập luận** đúng.
