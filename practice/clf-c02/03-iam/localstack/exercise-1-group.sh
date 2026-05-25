#!/usr/bin/env bash
# Group + User + ReadOnly policy demo
set -e

GROUP="learn-developers"
USER="alice"

echo "==> Tạo group $GROUP với ReadOnlyAccess"
awslocal iam create-group --group-name "$GROUP" || true
awslocal iam attach-group-policy --group-name "$GROUP" \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

echo "==> Tạo user $USER, add vào group"
awslocal iam create-user --user-name "$USER" || true
awslocal iam add-user-to-group --group-name "$GROUP" --user-name "$USER"

echo "==> Tạo access key cho $USER"
CREDS=$(awslocal iam create-access-key --user-name "$USER")
AK=$(echo "$CREDS" | grep AccessKeyId | awk -F'"' '{print $4}')
SK=$(echo "$CREDS" | grep SecretAccessKey | awk -F'"' '{print $4}')

echo "==> Cấu hình profile alice"
aws configure set aws_access_key_id "$AK" --profile alice
aws configure set aws_secret_access_key "$SK" --profile alice
aws configure set region us-east-1 --profile alice

echo "==> Test 1: s3 ls (mong đợi: OK)"
AWS_ENDPOINT_URL=http://localhost:4566 aws --profile alice s3 ls

echo "==> Test 2: s3 mb (mong đợi: AccessDenied vì ReadOnly)"
AWS_ENDPOINT_URL=http://localhost:4566 aws --profile alice s3 mb s3://should-fail-$(date +%s) \
  && echo "❌ FAIL — lẽ ra phải bị deny" \
  || echo "✅ PASS — deny đúng kỳ vọng"

echo ""
echo "==> Cleanup:"
echo "  awslocal iam delete-access-key --user-name $USER --access-key-id $AK"
echo "  awslocal iam remove-user-from-group --group-name $GROUP --user-name $USER"
echo "  awslocal iam delete-user --user-name $USER"
echo "  awslocal iam detach-group-policy --group-name $GROUP --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess"
echo "  awslocal iam delete-group --group-name $GROUP"
