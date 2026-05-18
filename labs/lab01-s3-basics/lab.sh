#!/usr/bin/env bash
# Lab 01 — S3 Basics on LocalStack
# Chạy: bash lab.sh
# Yêu cầu: LocalStack đang chạy (docker compose up -d ở thư mục gốc)

set -e

BUCKET="saa-lab01-$(date +%s)"
REGION="ap-southeast-1"

echo "=== 1. Tạo bucket: $BUCKET ==="
awslocal s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

echo "=== 2. List buckets ==="
awslocal s3 ls

echo "=== 3. Bật versioning ==="
awslocal s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

awslocal s3api get-bucket-versioning --bucket "$BUCKET"

echo "=== 4. Upload object lần 1 ==="
echo "Hello SAA v1" > /tmp/hello.txt
awslocal s3 cp /tmp/hello.txt "s3://$BUCKET/hello.txt"

echo "=== 5. Upload đè (tạo version mới) ==="
echo "Hello SAA v2 - updated" > /tmp/hello.txt
awslocal s3 cp /tmp/hello.txt "s3://$BUCKET/hello.txt"

echo "=== 6. List tất cả versions ==="
awslocal s3api list-object-versions --bucket "$BUCKET"

echo "=== 7. Set lifecycle policy ==="
# Object > 30 ngày → STANDARD_IA, > 90 ngày → GLACIER, > 365 ngày → xoá version cũ
cat > /tmp/lifecycle.json <<'EOF'
{
  "Rules": [
    {
      "ID": "ArchiveOldObjects",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "NoncurrentVersionExpiration": {"NoncurrentDays": 365}
    }
  ]
}
EOF

awslocal s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration file:///tmp/lifecycle.json

awslocal s3api get-bucket-lifecycle-configuration --bucket "$BUCKET"

echo "=== 8. Bật default encryption SSE-S3 (AES256) ==="
awslocal s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

awslocal s3api get-bucket-encryption --bucket "$BUCKET"

echo "=== 9. Tạo presigned URL (10 phút) ==="
URL=$(awslocal s3 presign "s3://$BUCKET/hello.txt" --expires-in 600)
echo "Presigned URL: $URL"
echo "(Trên LocalStack URL trỏ về localhost:4566)"

echo "=== 10. Cleanup ==="
echo "Để cleanup chạy:"
echo "  awslocal s3 rm s3://$BUCKET --recursive"
echo "  awslocal s3api delete-bucket --bucket $BUCKET"

echo ""
echo "=== HOÀN TẤT Lab 01 ==="
echo "Bucket: $BUCKET"
