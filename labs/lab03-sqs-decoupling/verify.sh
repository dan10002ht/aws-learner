#!/usr/bin/env bash
# Verify Lab 03

echo "================================"
echo "Lab 03 — SQS Verify"
echo "================================"

for q in lab03-main lab03-dlq lab03-orders.fifo; do
  URL=$(awslocal sqs get-queue-url --queue-name "$q" --query 'QueueUrl' --output text 2>/dev/null || echo "")
  if [ -z "$URL" ]; then
    echo "❌ Queue $q chưa tồn tại — chạy lab.sh trước"
    continue
  fi
  echo ""
  echo "▶ $q"
  echo "  URL: $URL"
  awslocal sqs get-queue-attributes --queue-url "$URL" --attribute-names \
    ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    VisibilityTimeout MessageRetentionPeriod RedrivePolicy FifoQueue \
    --query 'Attributes' --output table
done

echo ""
echo "▶ Cleanup (chạy nếu muốn):"
echo "  awslocal sqs delete-queue --queue-url \$(awslocal sqs get-queue-url --queue-name lab03-main --query QueueUrl --output text)"
echo "  awslocal sqs delete-queue --queue-url \$(awslocal sqs get-queue-url --queue-name lab03-dlq --query QueueUrl --output text)"
echo "  awslocal sqs delete-queue --queue-url \$(awslocal sqs get-queue-url --queue-name lab03-orders.fifo --query QueueUrl --output text)"
