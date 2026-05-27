#!/usr/bin/env bash
# Lab 08 — IAM Policies Deep: permission boundary, assume-role, condition keys
# Chạy: bash lab.sh

set -e

REGION="ap-southeast-1"
ADMIN_USER="lab08-admin-dev"
LIMITED_USER="lab08-limited-dev"
ROLE="lab08-app-role"
BOUNDARY="lab08-s3-only-boundary"

cd "$(dirname "$0")"

echo "=== 1. Tạo Permission Boundary (chỉ allow S3) ==="
cat > /tmp/lab08-boundary.json <<'EOF'
{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":"s3:*","Resource":"*"},
    {"Effect":"Allow","Action":["sts:GetCallerIdentity","iam:GetUser"],"Resource":"*"}
  ]
}
EOF
BOUNDARY_ARN=$(awslocal iam create-policy --policy-name "$BOUNDARY" \
  --policy-document file:///tmp/lab08-boundary.json \
  --query 'Policy.Arn' --output text 2>/dev/null || \
  awslocal iam list-policies --scope Local \
    --query "Policies[?PolicyName=='$BOUNDARY'].Arn | [0]" --output text)
echo "Boundary ARN: $BOUNDARY_ARN"

echo ""
echo "=== 2. Tạo user 'limited-dev' với permission boundary ==="
awslocal iam create-user --user-name "$LIMITED_USER" \
  --permissions-boundary "$BOUNDARY_ARN" 2>/dev/null \
  || echo "User đã tồn tại (sẽ áp boundary nếu chưa có):"

# Đảm bảo boundary được apply
awslocal iam put-user-permissions-boundary --user-name "$LIMITED_USER" \
  --permissions-boundary "$BOUNDARY_ARN"

# Attach AdministratorAccess managed policy → IAM allow là full *,
# nhưng effective permission = IAM ∩ boundary = chỉ s3 + sts/iam:GetUser.
awslocal iam attach-user-policy --user-name "$LIMITED_USER" \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess 2>/dev/null || true

echo "User boundary:"
awslocal iam get-user --user-name "$LIMITED_USER" \
  --query 'User.PermissionsBoundary'

echo ""
echo "=== 3. Tạo role 'app-role' — trust policy chỉ cho phép account này assume ==="
ACCOUNT_ID=$(awslocal sts get-caller-identity --query Account --output text)
cat > /tmp/lab08-trust.json <<EOF
{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":{"AWS":"arn:aws:iam::${ACCOUNT_ID}:root"},
    "Action":"sts:AssumeRole",
    "Condition":{
      "Bool":{"aws:MultiFactorAuthPresent":"true"}
    }
  }]
}
EOF
awslocal iam create-role --role-name "$ROLE" \
  --assume-role-policy-document file:///tmp/lab08-trust.json \
  --max-session-duration 3600 > /dev/null 2>&1 || echo "Role đã có"

# Permission policy: chỉ list bucket có tag Env=prod (condition key)
cat > /tmp/lab08-role-perm.json <<'EOF'
{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Action":["s3:ListBucket","s3:GetObject"],
    "Resource":"*",
    "Condition":{
      "StringEquals":{"aws:ResourceTag/Env":"prod"}
    }
  }]
}
EOF
awslocal iam put-role-policy --role-name "$ROLE" \
  --policy-name lab08-prod-only \
  --policy-document file:///tmp/lab08-role-perm.json

echo ""
echo "=== 4. Bucket policy với condition aws:SourceIp + aws:PrincipalOrgID ==="
BUCKET="lab08-bucket-$(date +%s)"
awslocal s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" > /dev/null

cat > /tmp/lab08-bucket-policy.json <<EOF
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AllowOrgOnly",
      "Effect":"Allow",
      "Principal":"*",
      "Action":"s3:GetObject",
      "Resource":"arn:aws:s3:::${BUCKET}/*",
      "Condition":{
        "StringEquals":{"aws:PrincipalOrgID":"o-example12345"}
      }
    },
    {
      "Sid":"DenyOutsideOfficeIP",
      "Effect":"Deny",
      "Principal":"*",
      "Action":"s3:*",
      "Resource":["arn:aws:s3:::${BUCKET}","arn:aws:s3:::${BUCKET}/*"],
      "Condition":{
        "NotIpAddress":{"aws:SourceIp":["10.0.0.0/8","192.168.0.0/16"]}
      }
    },
    {
      "Sid":"DenyUnencryptedUploads",
      "Effect":"Deny",
      "Principal":"*",
      "Action":"s3:PutObject",
      "Resource":"arn:aws:s3:::${BUCKET}/*",
      "Condition":{
        "StringNotEquals":{"s3:x-amz-server-side-encryption":"aws:kms"}
      }
    }
  ]
}
EOF
awslocal s3api put-bucket-policy --bucket "$BUCKET" \
  --policy file:///tmp/lab08-bucket-policy.json

echo "Bucket policy ($BUCKET):"
awslocal s3api get-bucket-policy --bucket "$BUCKET" \
  --query Policy --output text | python3 -m json.tool

echo ""
echo "=== 5. Policy simulator — test boundary thực sự cản ==="
echo "(LocalStack hỗ trợ simulate-principal-policy hạn chế — chạy thử)"
# Simulate: limited user gọi ec2:RunInstances (IAM allow, boundary deny)
USER_ARN=$(awslocal iam get-user --user-name "$LIMITED_USER" \
  --query 'User.Arn' --output text)
awslocal iam simulate-principal-policy \
  --policy-source-arn "$USER_ARN" \
  --action-names ec2:RunInstances s3:ListAllMyBuckets \
  --query 'EvaluationResults[].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table 2>/dev/null \
  || echo "  (simulate-principal-policy có thể không support đầy đủ trên LocalStack)"

echo ""
echo "=== 6. So sánh: cùng user, IAM policy bảo allow * — boundary chỉ allow s3 ==="
echo "Lý thuyết:"
echo "  - IAM policy gắn vào user:     Allow *"
echo "  - Boundary gắn vào user:        Allow s3 + sts:GetCallerIdentity"
echo "  - Effective = IAM ∩ Boundary = Allow s3 + sts:GetCallerIdentity"
echo "  → user chạy ec2 sẽ bị deny dù IAM cho phép"

echo ""
echo "=== HOÀN TẤT Lab 08 ==="
echo "User limited: $LIMITED_USER  (boundary $BOUNDARY_ARN)"
echo "Role:         $ROLE  (trust requires MFA, perm requires tag Env=prod)"
echo "Bucket:       $BUCKET  (3 condition policy)"
echo "Verify: bash verify.sh"
