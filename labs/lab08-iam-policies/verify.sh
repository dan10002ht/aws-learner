#!/usr/bin/env bash
# Verify Lab 08

echo "================================"
echo "Lab 08 — IAM Verify"
echo "================================"

USER="lab08-limited-dev"
ROLE="lab08-app-role"

echo ""
echo "▶ User + boundary"
awslocal iam get-user --user-name "$USER" \
  --query 'User.{Arn:Arn,Boundary:PermissionsBoundary}' --output table 2>/dev/null \
  || echo "  (user chưa tồn tại)"

echo ""
echo "▶ Attached policy của user"
awslocal iam list-attached-user-policies --user-name "$USER" \
  --query 'AttachedPolicies' --output table 2>/dev/null || true

echo ""
echo "▶ Role + trust policy"
awslocal iam get-role --role-name "$ROLE" \
  --query 'Role.{Arn:Arn,Trust:AssumeRolePolicyDocument,MaxSession:MaxSessionDuration}' \
  --output json 2>/dev/null || echo "  (role chưa tồn tại)"

echo ""
echo "▶ Inline policy của role"
awslocal iam list-role-policies --role-name "$ROLE" 2>/dev/null
awslocal iam get-role-policy --role-name "$ROLE" --policy-name lab08-prod-only 2>/dev/null

echo ""
echo "▶ Bucket policy"
BUCKET=$(awslocal s3 ls | awk '{print $3}' | grep lab08-bucket | head -1)
if [ -n "$BUCKET" ]; then
  echo "  Bucket: $BUCKET"
  awslocal s3api get-bucket-policy --bucket "$BUCKET" --query Policy --output text \
    | python3 -m json.tool
fi
