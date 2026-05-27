#!/usr/bin/env bash
# Verify Lab 04

TABLE="lab04-orders"
FUNCTION="lab04-stream-consumer"

echo "================================"
echo "Lab 04 — DynamoDB Streams Verify"
echo "================================"

echo ""
echo "▶ Table description"
awslocal dynamodb describe-table --table-name "$TABLE" \
  --query 'Table.{Status:TableStatus,Billing:BillingModeSummary.BillingMode,Stream:LatestStreamArn,GSI:GlobalSecondaryIndexes[].IndexName}' \
  --output table

echo ""
echo "▶ Item count"
awslocal dynamodb scan --table-name "$TABLE" --select COUNT --query 'Count'

echo ""
echo "▶ Event source mapping"
awslocal lambda list-event-source-mappings --function-name "$FUNCTION" \
  --query 'EventSourceMappings[].{State:State,Source:EventSourceArn,Batch:BatchSize}' --output table

echo ""
echo "▶ Lambda log (10 dòng cuối)"
awslocal logs tail "/aws/lambda/$FUNCTION" --since 10m 2>/dev/null | tail -30 || echo "(chưa có log)"

echo ""
echo "▶ Cleanup:"
echo "  awslocal dynamodb delete-table --table-name $TABLE"
echo "  awslocal lambda delete-function --function-name $FUNCTION"
