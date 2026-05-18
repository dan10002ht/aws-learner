#!/usr/bin/env bash
set -e

BUCKET="saa-lab02-source"
FUNCTION="s3-event-processor"
ROLE_NAME="lambda-s3-event-role"
REGION="ap-southeast-1"

cd "$(dirname "$0")"

echo "=== 1. Tạo IAM trust policy cho Lambda ==="
cat > /tmp/trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

echo "=== 2. Tạo IAM role cho Lambda ==="
awslocal iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  > /dev/null 2>&1 || echo "Role đã tồn tại, skip"

# Attach basic execution policy (CloudWatch logs)
awslocal iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

ROLE_ARN=$(awslocal iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"

echo "=== 3. Đóng gói Lambda code (Node.js ESM) ==="
rm -f function.zip
zip -j function.zip index.mjs

echo "=== 4. Tạo / update Lambda function ==="
if awslocal lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  echo "Update existing function..."
  awslocal lambda update-function-code \
    --function-name "$FUNCTION" \
    --zip-file fileb://function.zip > /dev/null
else
  echo "Create new function..."
  awslocal lambda create-function \
    --function-name "$FUNCTION" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 128 > /dev/null
fi

echo "=== 5. Tạo S3 bucket ==="
awslocal s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  2>/dev/null || echo "Bucket đã tồn tại, skip"

echo "=== 6. Cho phép S3 invoke Lambda (resource-based policy) ==="
awslocal lambda add-permission \
  --function-name "$FUNCTION" \
  --statement-id s3-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::$BUCKET" \
  2>/dev/null || echo "Permission đã có, skip"

LAMBDA_ARN=$(awslocal lambda get-function --function-name "$FUNCTION" --query 'Configuration.FunctionArn' --output text)

echo "=== 7. Cấu hình S3 event notification → Lambda ==="
cat > /tmp/notification.json <<EOF
{
  "LambdaFunctionConfigurations": [{
    "LambdaFunctionArn": "$LAMBDA_ARN",
    "Events": ["s3:ObjectCreated:*"]
  }]
}
EOF

awslocal s3api put-bucket-notification-configuration \
  --bucket "$BUCKET" \
  --notification-configuration file:///tmp/notification.json

echo ""
echo "=== DEPLOY XONG ==="
echo "Test: echo hi > /tmp/x.txt && awslocal s3 cp /tmp/x.txt s3://$BUCKET/x.txt"
echo "Xem log: awslocal logs tail /aws/lambda/$FUNCTION --follow"
