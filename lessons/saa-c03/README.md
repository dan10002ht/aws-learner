# SAA-C03 (Solutions Architect Associate)

Lộ trình tổng thể: [../../roadmap/saa-c03.md](../../roadmap/saa-c03.md).

**Triết lý:** SAA không hỏi "service này làm gì" mà hỏi "thiết kế thế nào cho đúng". Mỗi bài dưới đây đi **sâu hơn CLF** vào trade-off + pattern + bẫy đề thi.

**Pre-requisite:**
- Đã pass CLF-C02 hoặc nắm vững [../clf-c02/](../clf-c02/).
- Đã đọc [../foundations/](../foundations/) (CAP, consistency, replication) — đặc biệt cho bài DB và Multi-Region.

## Danh sách bài

| # | Bài | Trạng thái | Foundations |
|---|-----|------------|-------------|
| 10 | [IAM Advanced](10-iam-advanced.md) | ✅ |  |
| 11 | [KMS Deep](11-kms.md) | ✅ |  |
| 12 | [Auto Scaling & ELB](12-asg-elb.md) | ✅ |  |
| 13 | [Decoupling — SQS/SNS/EventBridge/Kinesis/Step Functions](13-decoupling.md) | ✅ | [[foundations-03-replication-and-quorum]] |
| 14 | [Storage Design — S3/EBS/EFS/FSx](14-storage-design.md) | ✅ |  |
| 15 | [Database Design](15-db-design.md) | ✅ | [[foundations-01-cap-theorem]], [[foundations-02-consistency-models]], [[foundations-05-partitioning-and-sharding]] |
| 16 | [Networking Advanced — VPC/TGW/PrivateLink](16-networking.md) | ✅ |  |
| 17 | [Route53 + CloudFront + Global Accelerator](17-route53-cloudfront.md) | ✅ | [[foundations-04-latency-vs-consistency]] |
| 18 | [DR & HA Strategies](18-dr-ha.md) | ✅ | [[foundations-06-failure-modes]] |
| 19 | [Cost Optimization Deep](19-cost-optimization.md) | ✅ |  |

## Sau khi học xong

1. Làm Tutorials Dojo practice exam — target ≥ 80% 3 mock liên tiếp.
2. Vẽ 10 reference architecture từ [aws.amazon.com/architecture](https://aws.amazon.com/architecture/).
3. Đặt lịch thi.
