#!/usr/bin/env bash
# Verify Lab 05

echo "================================"
echo "Lab 05 — APIGW + Lambda Verify"
echo "================================"

API_ID=$(awslocal apigateway get-rest-apis \
  --query 'items[?name==`lab05-api`].id | [0]' --output text)
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  echo "❌ Chưa chạy deploy.sh"
  exit 1
fi
echo "API ID: $API_ID"

echo ""
echo "▶ Resources"
awslocal apigateway get-resources --rest-api-id "$API_ID" \
  --query 'items[].{Path:path,Methods:resourceMethods}' --output table

echo ""
echo "▶ Stage"
awslocal apigateway get-stages --rest-api-id "$API_ID" \
  --query 'item[].{Stage:stageName,Throttle:methodSettings}' --output json

echo ""
echo "▶ Usage plans"
awslocal apigateway get-usage-plans \
  --query 'items[].{Name:name,Throttle:throttle,Quota:quota}' --output table

echo ""
echo "▶ API keys"
awslocal apigateway get-api-keys --include-values \
  --query 'items[].{Name:name,Enabled:enabled,Value:value}' --output table

echo ""
echo "▶ Lambda function"
awslocal lambda get-function --function-name lab05-handler \
  --query 'Configuration.{State:State,Runtime:Runtime,Timeout:Timeout}' --output table

KEY=$(awslocal apigateway get-api-keys --include-values \
  --query 'items[?name==`lab05-key`].value | [0]' --output text)
URL="http://localhost:4566/restapis/${API_ID}/dev/_user_request_/hello?name=verify"
echo ""
echo "▶ Test với key:"
curl -s -H "x-api-key: $KEY" "$URL"
echo ""
