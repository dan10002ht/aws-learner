# Lab 05 — API Gateway + Lambda

> **Trạng thái:** Skeleton — chưa có `deploy.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/13-decoupling.md](../../lessons/saa-c03/13-decoupling.md), [../../lessons/saa-c03/ch3-02-network-security.md](../../lessons/saa-c03/ch3-02-network-security.md)

## Mục tiêu
Build REST API serverless điển hình + hiểu các **bẫy** của API Gateway trong đề:

- **REST API vs HTTP API vs WebSocket API**
- **Lambda proxy integration** (event format)
- **Throttling**: account-level, method-level, usage plan
- **API key + Usage plan** (quota theo client)
- **Authorizer**: IAM, Cognito, Lambda authorizer (TOKEN vs REQUEST)
- **Edge-optimized / Regional / Private** endpoint
- **Stage variables** + canary deployment
- **CORS**: preflight `OPTIONS` phải config riêng

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **REST vs HTTP API** | HTTP API: rẻ ~70%, latency thấp hơn, **không** support API key/usage plan/WAF native. REST: full feature |
| **Edge-optimized** | Default, route qua CloudFront edge (giảm latency global) |
| **Regional** | Client cùng region, hoặc dùng CloudFront riêng phía trước |
| **Private API** | Chỉ truy cập từ VPC qua **Interface Endpoint (PrivateLink)** |
| **Throttling default** | 10000 req/s account-level, burst 5000 |
| **Usage plan** | Gắn API key → throttle/quota theo client |
| **Cognito authorizer** | Validate JWT từ User Pool, không cần code |
| **Lambda authorizer TOKEN** | Header (vd `Authorization`) |
| **Lambda authorizer REQUEST** | Nhiều input: header, query, stageVariable, context |
| **WAF** | Gắn được vào **REST Regional/Edge** + **HTTP API**, **không** gắn vào WebSocket |

### Scenario hay gặp

**Q:** Cần expose REST API chỉ cho client trong VPC, không qua Internet. Thiết kế?

<details><summary>Đáp án</summary>
**Private API Gateway** + **VPC Interface Endpoint** (PrivateLink) cho `execute-api`. Resource policy giới hạn `aws:SourceVpce`.
</details>

**Q:** Public API, cần rate limit 1000 req/s cho user thường, 10000 req/s cho user premium. Cách rẻ nhất?

<details><summary>Đáp án</summary>
2 **Usage Plan** (Standard + Premium) với throttle khác nhau, mỗi user gắn **API key** tương ứng. Không cần code logic rate limit.
</details>

**Q:** Latency cao cho user toàn cầu, hiện đang Regional endpoint ở us-east-1. Cải thiện?

<details><summary>Đáp án</summary>
Đổi sang **Edge-optimized** (route qua CloudFront edge gần user), HOẶC giữ Regional + đặt **CloudFront** phía trước với custom origin.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo Lambda function (Node.js)
# 2. Tạo REST API + resource /hello + method GET
# 3. Lambda proxy integration
# 4. Deploy stage "dev"
# 5. Test: curl https://<id>.execute-api.localhost.localstack.cloud:4566/dev/hello
# 6. Tạo usage plan + API key + gắn vào stage
```

## Câu hỏi tự kiểm tra

1. HTTP API có support API key không? Vậy chọn REST hay HTTP khi nào?
2. Authorizer TOKEN cache theo gì? REQUEST cache theo gì?
3. WAF gắn vào WebSocket API được không?
