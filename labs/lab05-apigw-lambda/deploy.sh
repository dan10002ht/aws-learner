#!/usr/bin/env bash
# Lab 05 — API Gateway (REST) + Lambda proxy + Usage plan + API key
# Chạy: bash deploy.sh

set -e

REGION="ap-southeast-1"
API_NAME="lab05-api"
FUNCTION="lab05-handler"
ROLE_NAME="lab05-lambda-role"
STAGE="dev"

cd "$(dirname "$0")"

echo "=== 1. IAM role cho Lambda ==="
cat > /tmp/lab05-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
awslocal iam create-role --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/lab05-trust.json > /dev/null 2>&1 || echo "Role đã có"
awslocal iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
ROLE_ARN=$(awslocal iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo ""
echo "=== 2. Đóng gói + tạo Lambda ==="
rm -f function.zip
zip -j function.zip index.mjs > /dev/null

if awslocal lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1; then
  awslocal lambda update-function-code --function-name "$FUNCTION" \
    --zip-file fileb://function.zip > /dev/null
else
  awslocal lambda create-function --function-name "$FUNCTION" \
    --runtime nodejs20.x --role "$ROLE_ARN" \
    --handler index.handler --zip-file fileb://function.zip \
    --timeout 10 --memory-size 128 > /dev/null
fi
LAMBDA_ARN=$(awslocal lambda get-function --function-name "$FUNCTION" \
  --query 'Configuration.FunctionArn' --output text)
echo "Lambda ARN: $LAMBDA_ARN"

echo ""
echo "=== 3. Tạo REST API ==="
API_ID=$(awslocal apigateway create-rest-api --name "$API_NAME" \
  --endpoint-configuration types=REGIONAL \
  --query 'id' --output text)
ROOT_ID=$(awslocal apigateway get-resources --rest-api-id "$API_ID" \
  --query 'items[0].id' --output text)
echo "API ID:  $API_ID"
echo "Root ID: $ROOT_ID"

echo ""
echo "=== 4. Tạo resource /hello + method GET ==="
HELLO_ID=$(awslocal apigateway create-resource --rest-api-id "$API_ID" \
  --parent-id "$ROOT_ID" --path-part hello \
  --query 'id' --output text)

# GET method với API key required
awslocal apigateway put-method --rest-api-id "$API_ID" \
  --resource-id "$HELLO_ID" \
  --http-method GET \
  --authorization-type NONE \
  --api-key-required > /dev/null

# Lambda proxy integration
awslocal apigateway put-integration --rest-api-id "$API_ID" \
  --resource-id "$HELLO_ID" \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" > /dev/null

echo ""
echo "=== 5. Cho phép API Gateway invoke Lambda ==="
awslocal lambda add-permission \
  --function-name "$FUNCTION" \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:000000000000:${API_ID}/*/*/hello" \
  2>/dev/null || echo "Permission đã có"

echo ""
echo "=== 6. Deploy stage $STAGE với throttle ==="
awslocal apigateway create-deployment --rest-api-id "$API_ID" \
  --stage-name "$STAGE" > /dev/null

# Method-level throttle: 100 req/s, burst 50
awslocal apigateway update-stage --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --patch-operations \
    op=replace,path=/*/*/throttling/rateLimit,value=100 \
    op=replace,path=/*/*/throttling/burstLimit,value=50 > /dev/null 2>&1 || true

echo ""
echo "=== 7. Usage plan + API key ==="
KEY_ID=$(awslocal apigateway create-api-key --name lab05-key --enabled \
  --query 'id' --output text)
KEY_VALUE=$(awslocal apigateway get-api-key --api-key "$KEY_ID" --include-value \
  --query 'value' --output text)

PLAN_ID=$(awslocal apigateway create-usage-plan --name lab05-plan \
  --throttle 'rateLimit=10,burstLimit=5' \
  --quota 'limit=1000,period=DAY' \
  --api-stages "apiId=$API_ID,stage=$STAGE" \
  --query 'id' --output text)

awslocal apigateway create-usage-plan-key --usage-plan-id "$PLAN_ID" \
  --key-id "$KEY_ID" --key-type API_KEY > /dev/null

echo "API Key ID:    $KEY_ID"
echo "API Key value: $KEY_VALUE"
echo "Usage plan:    $PLAN_ID (10 req/s, 1000/day)"

echo ""
echo "=== 8. Test invocation ==="
URL="http://localhost:4566/restapis/${API_ID}/${STAGE}/_user_request_/hello?name=SAA"
echo "URL: $URL"
echo ""
echo "▶ Không có API key (expect 403):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$URL"
echo ""
echo "▶ Có API key:"
curl -s -H "x-api-key: $KEY_VALUE" "$URL"
echo ""

echo ""
echo "=== HOÀN TẤT Lab 05 ==="
echo "API ID: $API_ID"
echo "URL:    $URL"
echo "Key:    $KEY_VALUE"
echo "Verify: bash verify.sh"
