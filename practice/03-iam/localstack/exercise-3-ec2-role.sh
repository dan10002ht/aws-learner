#!/usr/bin/env bash
# Tạo IAM Role cho EC2 (Instance Profile)
set -e

ROLE="learn-ec2-s3-reader"
PROFILE="learn-ec2-s3-reader-profile"

cat > /tmp/trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

echo "==> Tạo role $ROLE"
awslocal iam create-role --role-name "$ROLE" \
  --assume-role-policy-document file:///tmp/trust.json

echo "==> Attach AmazonS3ReadOnlyAccess"
awslocal iam attach-role-policy --role-name "$ROLE" \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

echo "==> Tạo instance profile $PROFILE và add role"
awslocal iam create-instance-profile --instance-profile-name "$PROFILE"
awslocal iam add-role-to-instance-profile \
  --instance-profile-name "$PROFILE" --role-name "$ROLE"

echo "==> Verify"
awslocal iam get-instance-profile --instance-profile-name "$PROFILE"

echo ""
echo "==> Trên AWS thật: launch EC2 với --iam-instance-profile Name=$PROFILE"
echo "==> SSH vào, chạy 'aws s3 ls' → KHÔNG cần access key"
echo "==> Credential được EC2 lấy từ IMDS http://169.254.169.254/..."
