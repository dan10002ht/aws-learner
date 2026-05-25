#!/usr/bin/env bash
# Cross-account AssumeRole với ExternalId (LocalStack mock 2 account)
set -e

ACCOUNT_A="111111111111"
ACCOUNT_B="222222222222"
ROLE="PartnerAccess"
EXTERNAL_ID="Acme-Secret-2026"

cat > /tmp/trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::${ACCOUNT_B}:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "${EXTERNAL_ID}" }
    }
  }]
}
EOF

echo "==> [Account A] Tạo role $ROLE với ExternalId"
awslocal iam create-role --role-name "$ROLE" \
  --assume-role-policy-document file:///tmp/trust.json
awslocal iam attach-role-policy --role-name "$ROLE" \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

echo ""
echo "==> Test 1: assume KHÔNG ExternalId (mong đợi: fail trên AWS thật, LocalStack có thể không enforce)"
awslocal sts assume-role \
  --role-arn "arn:aws:iam::${ACCOUNT_A}:role/${ROLE}" \
  --role-session-name "test-no-eid" 2>&1 | head -3

echo ""
echo "==> Test 2: assume CÓ ExternalId (OK)"
awslocal sts assume-role \
  --role-arn "arn:aws:iam::${ACCOUNT_A}:role/${ROLE}" \
  --role-session-name "test-with-eid" \
  --external-id "${EXTERNAL_ID}" 2>&1 | head -8

echo ""
echo "==> Trên AWS thật, test 1 sẽ trả AccessDenied. ExternalId chống confused deputy."
echo "==> Cleanup: awslocal iam delete-role --role-name $ROLE"
