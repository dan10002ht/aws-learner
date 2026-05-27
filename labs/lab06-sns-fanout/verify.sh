#!/usr/bin/env bash
# Verify Lab 06

echo "================================"
echo "Lab 06 — SNS Fan-out Verify"
echo "================================"

TOPIC_ARN=$(awslocal sns list-topics --query 'Topics[?contains(TopicArn,`lab06-orders`)].TopicArn' --output text)
if [ -z "$TOPIC_ARN" ]; then
  echo "❌ Topic chưa tồn tại — chạy deploy.sh trước"
  exit 1
fi

echo "Topic: $TOPIC_ARN"
echo ""
echo "▶ Subscriptions"
awslocal sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" \
  --query 'Subscriptions[].{Endpoint:Endpoint,Sub:SubscriptionArn}' --output table

echo ""
echo "▶ Filter policy mỗi sub"
for SUB in $(awslocal sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" \
  --query 'Subscriptions[].SubscriptionArn' --output text); do
  echo "  $SUB"
  awslocal sns get-subscription-attributes --subscription-arn "$SUB" \
    --query 'Attributes.{Filter:FilterPolicy,Raw:RawMessageDelivery}'
done

echo ""
echo "▶ Dump body từng queue"
for q in lab06-email lab06-analytics lab06-thumb; do
  Q_URL=$(awslocal sqs get-queue-url --queue-name "$q" --query 'QueueUrl' --output text 2>/dev/null || echo "")
  [ -z "$Q_URL" ] && continue
  echo ""
  echo "  === $q ==="
  awslocal sqs receive-message --queue-url "$Q_URL" --max-number-of-messages 10 \
    --visibility-timeout 1 \
    --query 'Messages[].Body' || echo "  (empty)"
done
