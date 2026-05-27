#!/usr/bin/env bash
# Verify Lab 07

echo "================================"
echo "Lab 07 — KMS Verify"
echo "================================"

KEY_ID=$(awslocal kms list-aliases \
  --query 'Aliases[?AliasName==`alias/lab07`].TargetKeyId | [0]' --output text)
if [ "$KEY_ID" = "None" ] || [ -z "$KEY_ID" ]; then
  echo "❌ alias/lab07 chưa tồn tại — chạy lab.sh"
  exit 1
fi
echo "KeyId: $KEY_ID"

echo ""
echo "▶ Key metadata"
awslocal kms describe-key --key-id "$KEY_ID" \
  --query 'KeyMetadata.{State:KeyState,Usage:KeyUsage,Origin:Origin,Manager:KeyManager}' --output table

echo ""
echo "▶ Rotation"
awslocal kms get-key-rotation-status --key-id "$KEY_ID"

echo ""
echo "▶ Aliases"
awslocal kms list-aliases --key-id "$KEY_ID" \
  --query 'Aliases[].AliasName' --output table

echo ""
echo "▶ Bucket SSE-KMS"
BUCKET=$(awslocal s3 ls | awk '{print $3}' | grep lab07-sse-kms | head -1)
if [ -n "$BUCKET" ]; then
  echo "  Bucket: $BUCKET"
  awslocal s3api get-bucket-encryption --bucket "$BUCKET"
  echo ""
  echo "  Object head:"
  awslocal s3api head-object --bucket "$BUCKET" --key secret.txt \
    --query '{SSE:ServerSideEncryption,KMSKey:SSEKMSKeyId}' --output table
fi
