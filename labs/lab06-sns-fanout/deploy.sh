#!/usr/bin/env bash
# Lab 06 — SNS Fan-out → multi-SQS với filter policy
# Chạy: bash deploy.sh

set -e

REGION="ap-southeast-1"
TOPIC="lab06-orders"
Q_EMAIL="lab06-email"
Q_ANALYTICS="lab06-analytics"
Q_THUMB="lab06-thumb"

cd "$(dirname "$0")"

echo "=== 1. Tạo SNS topic ==="
TOPIC_ARN=$(awslocal sns create-topic --name "$TOPIC" --query 'TopicArn' --output text)
echo "Topic ARN: $TOPIC_ARN"

echo ""
echo "=== 2. Tạo 3 SQS queue (mỗi cái có DLQ riêng) ==="
declare -A QUEUE_ARNS
for q in "$Q_EMAIL" "$Q_ANALYTICS" "$Q_THUMB"; do
  DLQ="${q}-dlq"
  awslocal sqs create-queue --queue-name "$DLQ" > /dev/null
  DLQ_URL=$(awslocal sqs get-queue-url --queue-name "$DLQ" --query 'QueueUrl' --output text)
  DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" \
    --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

  cat > /tmp/lab06-attrs.json <<EOF
{
  "VisibilityTimeout": "30",
  "ReceiveMessageWaitTimeSeconds": "10",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
}
EOF
  awslocal sqs create-queue --queue-name "$q" \
    --attributes file:///tmp/lab06-attrs.json > /dev/null
  Q_URL=$(awslocal sqs get-queue-url --queue-name "$q" --query 'QueueUrl' --output text)
  Q_ARN=$(awslocal sqs get-queue-attributes --queue-url "$Q_URL" \
    --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  QUEUE_ARNS[$q]="$Q_ARN"
  echo "Queue $q ARN: $Q_ARN (DLQ: $DLQ_ARN)"
done

echo ""
echo "=== 3. Set SQS policy cho phép SNS gửi vào ==="
for q in "$Q_EMAIL" "$Q_ANALYTICS" "$Q_THUMB"; do
  Q_URL=$(awslocal sqs get-queue-url --queue-name "$q" --query 'QueueUrl' --output text)
  Q_ARN="${QUEUE_ARNS[$q]}"
  cat > /tmp/lab06-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "sns.amazonaws.com"},
    "Action": "sqs:SendMessage",
    "Resource": "$Q_ARN",
    "Condition": {"ArnEquals": {"aws:SourceArn": "$TOPIC_ARN"}}
  }]
}
EOF
  POLICY_ESCAPED=$(python3 -c "import json,sys;print(json.dumps(open('/tmp/lab06-policy.json').read()))")
  awslocal sqs set-queue-attributes --queue-url "$Q_URL" \
    --attributes "{\"Policy\":$POLICY_ESCAPED}" > /dev/null
done

echo ""
echo "=== 4. Subscribe 3 queue vào topic với filter policy ==="
# email queue: chỉ nhận eventType=order_created
SUB_EMAIL=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" \
  --protocol sqs --notification-endpoint "${QUEUE_ARNS[$Q_EMAIL]}" \
  --attributes '{"RawMessageDelivery":"true"}' \
  --query 'SubscriptionArn' --output text)
awslocal sns set-subscription-attributes --subscription-arn "$SUB_EMAIL" \
  --attribute-name FilterPolicy \
  --attribute-value '{"eventType":["order_created"]}'

# analytics: nhận mọi event (không filter)
SUB_ANALYTICS=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" \
  --protocol sqs --notification-endpoint "${QUEUE_ARNS[$Q_ANALYTICS]}" \
  --attributes '{"RawMessageDelivery":"true"}' \
  --query 'SubscriptionArn' --output text)

# thumb: chỉ event có hasImage=true
SUB_THUMB=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" \
  --protocol sqs --notification-endpoint "${QUEUE_ARNS[$Q_THUMB]}" \
  --attributes '{"RawMessageDelivery":"true"}' \
  --query 'SubscriptionArn' --output text)
awslocal sns set-subscription-attributes --subscription-arn "$SUB_THUMB" \
  --attribute-name FilterPolicy \
  --attribute-value '{"hasImage":["true"]}'

echo "Sub email:     $SUB_EMAIL  (filter eventType=order_created)"
echo "Sub analytics: $SUB_ANALYTICS  (no filter)"
echo "Sub thumb:     $SUB_THUMB  (filter hasImage=true)"

echo ""
echo "=== 5. Publish 3 message với attributes khác nhau ==="

echo "--- msg 1: order_created + hasImage=true → expect email, analytics, thumb ---"
awslocal sns publish --topic-arn "$TOPIC_ARN" \
  --message '{"orderId":"o-1","amount":100}' \
  --message-attributes '{
    "eventType":{"DataType":"String","StringValue":"order_created"},
    "hasImage":{"DataType":"String","StringValue":"true"}
  }' > /dev/null

echo "--- msg 2: order_cancelled → expect chỉ analytics ---"
awslocal sns publish --topic-arn "$TOPIC_ARN" \
  --message '{"orderId":"o-2"}' \
  --message-attributes '{
    "eventType":{"DataType":"String","StringValue":"order_cancelled"}
  }' > /dev/null

echo "--- msg 3: order_created, không có hasImage → expect email + analytics ---"
awslocal sns publish --topic-arn "$TOPIC_ARN" \
  --message '{"orderId":"o-3"}' \
  --message-attributes '{
    "eventType":{"DataType":"String","StringValue":"order_created"}
  }' > /dev/null

sleep 2

echo ""
echo "=== 6. Đếm số message ở mỗi queue ==="
for q in "$Q_EMAIL" "$Q_ANALYTICS" "$Q_THUMB"; do
  Q_URL=$(awslocal sqs get-queue-url --queue-name "$q" --query 'QueueUrl' --output text)
  COUNT=$(awslocal sqs get-queue-attributes --queue-url "$Q_URL" \
    --attribute-names ApproximateNumberOfMessages \
    --query 'Attributes.ApproximateNumberOfMessages' --output text)
  echo "  $q: $COUNT message"
done

echo ""
echo "Expected: email=2 (msg1+msg3), analytics=3 (all), thumb=1 (msg1)"

echo ""
echo "=== HOÀN TẤT Lab 06 ==="
echo "Topic: $TOPIC_ARN"
echo "Verify: bash verify.sh"
