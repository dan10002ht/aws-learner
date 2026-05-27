# Lab 08 — IAM Policies Deep

> **Trạng thái:** Skeleton — chưa có `lab.sh`. Sẽ bổ sung sau.

Lesson: [../../lessons/saa-c03/10-iam-advanced.md](../../lessons/saa-c03/10-iam-advanced.md), [../../lessons/saa-c03/ch3-01-iam-deep-dive.md](../../lessons/saa-c03/ch3-01-iam-deep-dive.md)

## Mục tiêu
SAA hỏi rất nhiều câu **policy logic** — cho 1 policy + 1 request, hỏi "allow hay deny?". Phải nắm:

- **Policy evaluation logic**: explicit Deny > Allow > implicit Deny
- **Identity-based vs Resource-based policy**
- **Permission boundary** (max permission, không grant)
- **Service Control Policy (SCP)** ở Organizations (chỉ deny, không grant)
- **Session policy** (khi STS AssumeRole truyền `--policy`)
- **`Condition` keys**: `aws:SourceIp`, `aws:PrincipalOrgID`, `aws:MultiFactorAuthPresent`, `aws:RequestTag`, `s3:prefix`...
- **AssumeRole**: trust policy ↔ permission policy
- **IAM Policy Simulator** để test

## Kiến thức SAA-C03 trọng tâm

| Khái niệm | Bẫy đề thi |
|---|---|
| **Explicit Deny** | Luôn thắng. Dùng deny ở SCP/permission boundary để chặn |
| **Permission boundary** | **Không** grant, chỉ giới hạn. Effective = IAM allow ∩ boundary allow |
| **SCP** | Chỉ áp dụng cho **member account** trong Org, **không** áp dụng cho management account |
| **Trust policy** | Ở **role**, ghi rõ ai được assume (`Principal`) |
| **Permission policy** | Ở role, ghi rõ assumer làm được gì sau khi assume |
| **`aws:PrincipalOrgID`** | Allow chỉ identity trong cùng AWS Org — pattern share resource trong Org |
| **`aws:SourceIp`** | Lock theo IP — chú ý: **không** apply khi request đi qua AWS service (vd Lambda) |
| **MFA-required action** | `Condition: {Bool: {aws:MultiFactorAuthPresent: true}}` |
| **Resource-based policy** | S3 bucket, SNS, SQS, Lambda, KMS, ECR — có `Principal` field |
| **Identity-based policy** | Attach vào user/group/role — **không** có `Principal` |

### Scenario hay gặp

**Q:** Dev cần tự tạo IAM user nhưng không được tạo user có quyền vượt mức của họ. Cách?

<details><summary>Đáp án</summary>
**Permission boundary** — gắn boundary cho IAM user/role mà dev tạo ra. Policy của dev allow `iam:CreateUser` với condition `iam:PermissionsBoundary = <boundary-arn>`. User tạo ra không thể có permission vượt boundary.
</details>

**Q:** S3 bucket cần allow tất cả account trong Org đọc, không allow account ngoài. Bucket policy?

<details><summary>Đáp án</summary>
```json
{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"...",
 "Condition":{"StringEquals":{"aws:PrincipalOrgID":"o-xxxxxxxxxx"}}}
```
</details>

**Q:** User có IAM policy allow `s3:*` trên bucket X. SCP của Org deny `s3:DeleteObject`. User xóa được không?

<details><summary>Đáp án</summary>
**Không**. SCP deny áp dụng cho mọi principal trong account đó, không bypass được bằng IAM allow.
</details>

## Plan script (sẽ viết)

```bash
# 1. Tạo role với trust policy chỉ cho phép user X assume
# 2. Tạo policy với condition aws:SourceIp / aws:MultiFactorAuthPresent
# 3. Dùng IAM Policy Simulator (LocalStack có hỗ trợ giới hạn)
# 4. Test permission boundary: tạo user với boundary chỉ allow s3
#    → attach policy * vào user → user vẫn chỉ làm được s3
```

## Câu hỏi tự kiểm tra

1. SCP có grant permission được không?
2. Khác biệt giữa trust policy và permission policy của 1 role?
3. `aws:SourceIp` có hoạt động khi request đi qua VPC Endpoint không?
