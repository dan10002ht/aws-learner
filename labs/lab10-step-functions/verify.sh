#!/usr/bin/env bash
# Verify Lab 10

SM_NAME="lab10-order-workflow"

echo "================================"
echo "Lab 10 — Step Functions Verify"
echo "================================"

SM_ARN=$(awslocal stepfunctions list-state-machines \
  --query "stateMachines[?name=='$SM_NAME'].stateMachineArn | [0]" --output text)
if [ "$SM_ARN" = "None" ] || [ -z "$SM_ARN" ]; then
  echo "❌ State machine chưa tồn tại — chạy deploy.sh"
  exit 1
fi
echo "State Machine: $SM_ARN"

echo ""
echo "▶ Lambdas"
for fn in lab10-validator lab10-processor lab10-notifier; do
  STATE=$(awslocal lambda get-function --function-name "$fn" \
    --query 'Configuration.State' --output text 2>/dev/null || echo MISSING)
  echo "  $fn: $STATE"
done

echo ""
echo "▶ Last 5 executions"
awslocal stepfunctions list-executions --state-machine-arn "$SM_ARN" \
  --max-items 5 \
  --query 'executions[].{Name:name,Status:status,Start:startDate}' --output table

echo ""
echo "▶ Latest execution detail"
LAST=$(awslocal stepfunctions list-executions --state-machine-arn "$SM_ARN" \
  --max-items 1 --query 'executions[0].executionArn' --output text)
if [ -n "$LAST" ] && [ "$LAST" != "None" ]; then
  awslocal stepfunctions describe-execution --execution-arn "$LAST" \
    --query '{Status:status,Input:input,Output:output,Error:error}' --output json
  echo ""
  echo "▶ Execution history (last 20 events)"
  awslocal stepfunctions get-execution-history --execution-arn "$LAST" \
    --max-results 20 \
    --query 'events[].{Id:id,Type:type,Timestamp:timestamp}' --output table
fi
