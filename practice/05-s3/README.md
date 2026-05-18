# Practice 05 — S3

Liên kết bài: [lessons/05-s3.md](../../lessons/05-s3.md)

## Exercise 1 — Bucket cơ bản (LocalStack)
```bash
cd practice/05-s3/localstack && ./exercise-1-basic.sh
```
Tạo bucket, upload, list, versioning, lifecycle.

## Exercise 2 — Static website + CloudFront OAC (AWS thật)
1. Tạo bucket private.
2. Upload `index.html`, `error.html`.
3. Tạo CloudFront distribution với OAC, origin = bucket.
4. Bucket policy chỉ allow CloudFront principal:
   ```json
   { "Effect": "Allow",
     "Principal": { "Service": "cloudfront.amazonaws.com" },
     "Action": "s3:GetObject",
     "Resource": "arn:aws:s3:::<bucket>/*",
     "Condition": { "StringEquals": {
       "AWS:SourceArn": "arn:aws:cloudfront::<account>:distribution/<dist-id>"
     }}}
   ```
5. Truy cập qua CloudFront URL → 200. Truy cập S3 URL trực tiếp → 403.

## Exercise 3 — Presigned URL
```bash
URL=$(aws s3 presign s3://my-bucket/private.pdf --expires-in 300)
curl -o /tmp/got.pdf "$URL"
# Sau 5 phút: 403 Forbidden
```

## Exercise 4 — Lifecycle cost simulation (giấy)
1TB bucket Standard, 30% access mỗi tháng. Tính cost/tháng:
- All Standard
- 30d → IA, 90d → Glacier Flexible
- Intelligent-Tiering
- All Deep Archive

→ [solution.md](solution.md)

## Exercise 5 — Bucket policy viết tay
Viết policy:
1. Deny mọi request không có HTTPS (`aws:SecureTransport: false`).
2. Deny upload không encryption.
3. Allow cross-account write từ `222222222222` vào prefix `incoming/`.

→ [solution.md](solution.md)

## Exercise 6 — Replication
1. Source bucket ap-southeast-1, dest us-east-1.
2. Versioning bật cả 2.
3. IAM role replication.
4. Replicate prefix `to-replicate/`.
5. Upload file → verify dest sau ~10s.

## Teardown
```bash
./teardown.sh
```
Empty bucket trước khi delete (versioning bật → phải delete cả versions).
