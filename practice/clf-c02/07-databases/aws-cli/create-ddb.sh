#!/usr/bin/env bash
set -e
REGION="${AWS_REGION:-ap-southeast-1}"
TABLE="learn-Users"

aws dynamodb create-table --region "$REGION" --table-name "$TABLE" \
  --attribute-definitions \
    AttributeName=UserId,AttributeType=S \
    AttributeName=CreatedAt,AttributeType=S \
  --key-schema \
    AttributeName=UserId,KeyType=HASH \
    AttributeName=CreatedAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=aws-learner

aws dynamodb wait table-exists --region "$REGION" --table-name "$TABLE"
echo "==> Table $TABLE ready"

aws dynamodb put-item --region "$REGION" --table-name "$TABLE" \
  --item '{"UserId":{"S":"u1"},"CreatedAt":{"S":"2026-05-12"},"Name":{"S":"Alice"},"Email":{"S":"a@x.com"}}'

aws dynamodb get-item --region "$REGION" --table-name "$TABLE" \
  --key '{"UserId":{"S":"u1"},"CreatedAt":{"S":"2026-05-12"}}'

echo "==> Cleanup: aws dynamodb delete-table --table-name $TABLE"
