#!/usr/bin/env bash
# Lab 03 — SQS Decoupling on LocalStack
# Chạy: bash lab.sh

set -e

REGION="ap-southeast-1"
DLQ="lab03-dlq"
MAIN="lab03-main"
FIFO="lab03-orders.fifo"

cd "$(dirname "$0")"

echo "=== 1. Tạo DLQ ==="
awslocal sqs create-queue --queue-name "$DLQ" > /dev/null
DLQ_URL=$(awslocal sqs get-queue-url --queue-name "$DLQ" --query 'QueueUrl' --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
echo "DLQ URL: $DLQ_URL"
echo "DLQ ARN: $DLQ_ARN"

echo ""
echo "=== 2. Tạo main queue với redrive policy (maxReceiveCount=3) ==="
# RedrivePolicy ở SQS là STRING chứa JSON, nên phải nested-encode.
cat > /tmp/lab03-attrs.json <<EOF
{
  "VisibilityTimeout": "30",
  "ReceiveMessageWaitTimeSeconds": "20",
  "MessageRetentionPeriod": "345600",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
}
EOF
awslocal sqs create-queue --queue-name "$MAIN" \
  --attributes file:///tmp/lab03-attrs.json > /dev/null
MAIN_URL=$(awslocal sqs get-queue-url --queue-name "$MAIN" --query 'QueueUrl' --output text)
echo "Main URL: $MAIN_URL"

echo ""
echo "=== 3. Kiểm tra attributes của main ==="
awslocal sqs get-queue-attributes --queue-url "$MAIN_URL" --attribute-names All \
  --query 'Attributes.{VT:VisibilityTimeout,LongPoll:ReceiveMessageWaitTimeSeconds,Redrive:RedrivePolicy}'

echo ""
echo "=== 4. Send 3 message vào main ==="
for i in 1 2 3; do
  awslocal sqs send-message --queue-url "$MAIN_URL" \
    --message-body "order-$i" \
    --message-attributes "Type={DataType=String,StringValue=order}" > /dev/null
done
awslocal sqs get-queue-attributes --queue-url "$MAIN_URL" \
  --attribute-names ApproximateNumberOfMessages --query 'Attributes'

echo ""
echo "=== 5. Receive + KHÔNG delete → message quay lại sau VT ==="
echo "(Receive 4 lần với VT=1s để vượt maxReceiveCount=3 → message sẽ vào DLQ)"
for attempt in 1 2 3 4; do
  echo "--- attempt $attempt ---"
  awslocal sqs receive-message --queue-url "$MAIN_URL" \
    --max-number-of-messages 10 \
    --visibility-timeout 1 \
    --attribute-names ApproximateReceiveCount \
    --query 'Messages[].{Body:Body,Count:Attributes.ApproximateReceiveCount}' 2>/dev/null || true
  sleep 2
done

echo ""
echo "=== 6. Kiểm tra DLQ — message bị 'poison' đã sang đây ==="
sleep 2
awslocal sqs receive-message --queue-url "$DLQ_URL" \
  --max-number-of-messages 10 \
  --query 'Messages[].Body' || echo "(chưa có message ở DLQ — chờ thêm vài giây)"

echo ""
echo "=== 7. FIFO queue — ordering theo MessageGroupId ==="
awslocal sqs create-queue --queue-name "$FIFO" \
  --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true"}' > /dev/null
FIFO_URL=$(awslocal sqs get-queue-url --queue-name "$FIFO" --query 'QueueUrl' --output text)

for i in 1 2 3 4 5; do
  awslocal sqs send-message --queue-url "$FIFO_URL" \
    --message-body "tx-customerA-$i" \
    --message-group-id "customerA" > /dev/null
done
for i in 1 2 3; do
  awslocal sqs send-message --queue-url "$FIFO_URL" \
    --message-body "tx-customerB-$i" \
    --message-group-id "customerB" > /dev/null
done

echo "Receive FIFO (thứ tự trong cùng group được giữ):"
awslocal sqs receive-message --queue-url "$FIFO_URL" --max-number-of-messages 10 \
  --attribute-names MessageGroupId \
  --query 'Messages[].{Body:Body,Group:Attributes.MessageGroupId}'

echo ""
echo "=== HOÀN TẤT Lab 03 ==="
echo "Main: $MAIN_URL"
echo "DLQ:  $DLQ_URL"
echo "FIFO: $FIFO_URL"
echo "Verify: bash verify.sh"
