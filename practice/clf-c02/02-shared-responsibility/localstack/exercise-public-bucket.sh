#!/usr/bin/env bash
# Demo S3 public misconfig — Customer responsibility
# Yêu cầu: localstack đang chạy + awscli-local đã cài

set -e
BUCKET="learn-public-demo-$(date +%s)"

echo "==> Tạo bucket $BUCKET"
awslocal s3 mb "s3://$BUCKET"

echo "==> Tắt Block Public Access (giả lập sai config)"
awslocal s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo "==> Gắn bucket policy public read"
cat > /tmp/policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*"
  }]
}
EOF
awslocal s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/policy.json

echo "==> Upload secret.txt"
echo "TOP_SECRET=this-should-not-be-public" > /tmp/secret.txt
awslocal s3 cp /tmp/secret.txt "s3://$BUCKET/secret.txt"

echo "==> Thử đọc qua HTTP (không cần credential)"
curl -s "http://localhost:4566/$BUCKET/secret.txt"
echo ""
echo "==> Nếu thấy nội dung TOP_SECRET = bucket đang leak. Đây là lỗi CUSTOMER."

echo ""
echo "==> Cleanup:"
echo "  awslocal s3 rb s3://$BUCKET --force"
