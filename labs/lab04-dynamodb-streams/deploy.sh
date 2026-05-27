#!/usr/bin/env bash
# Lab 04 — DynamoDB + GSI + Streams → Lambda
# Chạy: bash deploy.sh

set -e

REGION="ap-southeast-1"
TABLE="lab04-orders"
FUNCTION="lab04-stream-consumer"
ROLE_NAME="lab04-stream-role"

cd "$(dirname "$0")"

echo "=== 1. Tạo IAM role cho Lambda (consume stream + log) ==="
cat > /tmp/lab04-trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF
awslocal iam create-role --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/lab04-trust.json > /dev/null 2>&1 || echo "Role đã có"

awslocal iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
awslocal iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole 2>/dev/null || true

ROLE_ARN=$(awslocal iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"

echo ""
echo "=== 2. Tạo bảng DynamoDB ==="
# PK = userId (HASH), SK = orderId (RANGE)
# GSI: status-index (PK=status, SK=orderId) — query "all PENDING orders"
# Stream: NEW_AND_OLD_IMAGES
# Billing: PAY_PER_REQUEST (On-demand)
awslocal dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=orderId,AttributeType=S \
      AttributeName=status,AttributeType=S \
  --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=orderId,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "status-index",
      "KeySchema": [
        {"AttributeName":"status","KeyType":"HASH"},
        {"AttributeName":"orderId","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" > /dev/null 2>&1 || echo "Table đã tồn tại"

awslocal dynamodb wait table-exists --table-name "$TABLE"

STREAM_ARN=$(awslocal dynamodb describe-table --table-name "$TABLE" \
  --query 'Table.LatestStreamArn' --output text)
echo "Stream ARN: $STREAM_ARN"

echo ""
echo "=== 3. Đóng gói + tạo Lambda ==="
rm -f function.zip
zip -j function.zip index.mjs > /dev/null

if awslocal lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  awslocal lambda update-function-code --function-name "$FUNCTION" \
    --zip-file fileb://function.zip > /dev/null
else
  awslocal lambda create-function \
    --function-name "$FUNCTION" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 --memory-size 128 > /dev/null
fi

echo ""
echo "=== 4. Tạo event source mapping: Stream → Lambda ==="
awslocal lambda create-event-source-mapping \
  --function-name "$FUNCTION" \
  --event-source-arn "$STREAM_ARN" \
  --starting-position LATEST \
  --batch-size 10 \
  2>/dev/null || echo "Mapping đã có"

echo ""
echo "=== 5. PutItem + UpdateItem để trigger stream ==="
awslocal dynamodb put-item --table-name "$TABLE" --item '{
  "userId":{"S":"u1"},
  "orderId":{"S":"o-100"},
  "status":{"S":"PENDING"},
  "amount":{"N":"50"}
}'
awslocal dynamodb put-item --table-name "$TABLE" --item '{
  "userId":{"S":"u1"},
  "orderId":{"S":"o-101"},
  "status":{"S":"PAID"},
  "amount":{"N":"120"}
}'
awslocal dynamodb put-item --table-name "$TABLE" --item '{
  "userId":{"S":"u2"},
  "orderId":{"S":"o-200"},
  "status":{"S":"PENDING"},
  "amount":{"N":"75"}
}'

# Update để tạo MODIFY event
awslocal dynamodb update-item --table-name "$TABLE" \
  --key '{"userId":{"S":"u1"},"orderId":{"S":"o-100"}}' \
  --update-expression "SET #s=:s" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":s":{"S":"PAID"}}' > /dev/null

echo ""
echo "=== 6. Query trên base table (theo userId) ==="
awslocal dynamodb query --table-name "$TABLE" \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values '{":u":{"S":"u1"}}' \
  --query 'Items'

echo ""
echo "=== 7. Query trên GSI status-index (tất cả PENDING) ==="
awslocal dynamodb query --table-name "$TABLE" \
  --index-name status-index \
  --key-condition-expression "#s = :s" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":s":{"S":"PENDING"}}' \
  --query 'Items'

echo ""
echo "=== HOÀN TẤT Lab 04 ==="
echo "Table: $TABLE"
echo "Xem log stream consumer: awslocal logs tail /aws/lambda/$FUNCTION --follow"
echo "Verify: bash verify.sh"
