#!/usr/bin/env bash
# Lab 10 — Step Functions: orchestration với Choice/Parallel/Retry/Catch
# Chạy: bash deploy.sh

set -e

REGION="ap-southeast-1"
ROLE_LAMBDA="lab10-lambda-role"
ROLE_SFN="lab10-sfn-role"
SM_NAME="lab10-order-workflow"

cd "$(dirname "$0")"

create_lambda() {
  local NAME=$1
  local FILE=$2
  local ROLE_ARN=$3
  rm -f /tmp/lab10-$NAME.zip
  zip -j /tmp/lab10-$NAME.zip "$FILE" > /dev/null
  if awslocal lambda get-function --function-name "$NAME" >/dev/null 2>&1; then
    awslocal lambda update-function-code --function-name "$NAME" \
      --zip-file fileb:///tmp/lab10-$NAME.zip > /dev/null
  else
    awslocal lambda create-function --function-name "$NAME" \
      --runtime nodejs20.x --role "$ROLE_ARN" \
      --handler "$(basename $FILE .mjs).handler" \
      --zip-file fileb:///tmp/lab10-$NAME.zip \
      --timeout 10 --memory-size 128 > /dev/null
  fi
  awslocal lambda get-function --function-name "$NAME" \
    --query 'Configuration.FunctionArn' --output text
}

echo "=== 1. IAM role cho Lambda ==="
cat > /tmp/lab10-lambda-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
awslocal iam create-role --role-name "$ROLE_LAMBDA" \
  --assume-role-policy-document file:///tmp/lab10-lambda-trust.json > /dev/null 2>&1 || echo "Role lambda đã có"
awslocal iam attach-role-policy --role-name "$ROLE_LAMBDA" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
LAMBDA_ROLE_ARN=$(awslocal iam get-role --role-name "$ROLE_LAMBDA" \
  --query 'Role.Arn' --output text)

echo ""
echo "=== 2. Tạo 3 Lambda: validator, processor, notifier ==="
VALIDATOR_ARN=$(create_lambda lab10-validator validator.mjs "$LAMBDA_ROLE_ARN")
PROCESSOR_ARN=$(create_lambda lab10-processor processor.mjs "$LAMBDA_ROLE_ARN")
NOTIFIER_ARN=$(create_lambda lab10-notifier notifier.mjs "$LAMBDA_ROLE_ARN")
echo "  Validator: $VALIDATOR_ARN"
echo "  Processor: $PROCESSOR_ARN"
echo "  Notifier:  $NOTIFIER_ARN"

echo ""
echo "=== 3. IAM role cho Step Functions (invoke Lambda) ==="
cat > /tmp/lab10-sfn-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"states.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
awslocal iam create-role --role-name "$ROLE_SFN" \
  --assume-role-policy-document file:///tmp/lab10-sfn-trust.json > /dev/null 2>&1 || echo "Role sfn đã có"

cat > /tmp/lab10-sfn-perm.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"lambda:InvokeFunction","Resource":"*"}]}
EOF
awslocal iam put-role-policy --role-name "$ROLE_SFN" \
  --policy-name lab10-sfn-invoke \
  --policy-document file:///tmp/lab10-sfn-perm.json
SFN_ROLE_ARN=$(awslocal iam get-role --role-name "$ROLE_SFN" \
  --query 'Role.Arn' --output text)

echo ""
echo "=== 4. Render state machine definition ==="
sed -e "s|VALIDATOR_ARN|$VALIDATOR_ARN|g" \
    -e "s|PROCESSOR_ARN|$PROCESSOR_ARN|g" \
    -e "s|NOTIFIER_ARN|$NOTIFIER_ARN|g" \
    state-machine.template.json > /tmp/lab10-sm.json

echo ""
echo "=== 5. Tạo state machine (Standard workflow) ==="
SM_ARN=$(awslocal stepfunctions list-state-machines \
  --query "stateMachines[?name=='$SM_NAME'].stateMachineArn | [0]" --output text)
if [ "$SM_ARN" = "None" ] || [ -z "$SM_ARN" ]; then
  SM_ARN=$(awslocal stepfunctions create-state-machine \
    --name "$SM_NAME" \
    --definition file:///tmp/lab10-sm.json \
    --role-arn "$SFN_ROLE_ARN" \
    --type STANDARD \
    --query 'stateMachineArn' --output text)
else
  awslocal stepfunctions update-state-machine \
    --state-machine-arn "$SM_ARN" \
    --definition file:///tmp/lab10-sm.json \
    --role-arn "$SFN_ROLE_ARN" > /dev/null
fi
echo "State Machine ARN: $SM_ARN"

echo ""
echo "=== 6. Start 3 execution với input khác nhau ==="

run_exec() {
  local NAME=$1
  local INPUT=$2
  local EXEC_ARN
  EXEC_ARN=$(awslocal stepfunctions start-execution \
    --state-machine-arn "$SM_ARN" \
    --name "$NAME-$(date +%s)" \
    --input "$INPUT" \
    --query 'executionArn' --output text)
  echo "  Started: $EXEC_ARN"
  sleep 3
  awslocal stepfunctions describe-execution --execution-arn "$EXEC_ARN" \
    --query '{Status:status,Output:output,Error:error}' --output json
}

echo ""
echo "--- Case A: happy path (no image) ---"
run_exec happy '{"orderId":"o-1","amount":150,"hasImage":false}'

echo ""
echo "--- Case B: parallel branch (hasImage=true) ---"
run_exec parallel '{"orderId":"o-2","amount":200,"hasImage":true}'

echo ""
echo "--- Case C: amount too large → RejectLarge ---"
run_exec reject '{"orderId":"o-3","amount":99999,"hasImage":false}'

echo ""
echo "=== HOÀN TẤT Lab 10 ==="
echo "State Machine: $SM_ARN"
echo "Verify: bash verify.sh"
