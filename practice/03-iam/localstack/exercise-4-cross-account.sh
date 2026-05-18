#!/usr/bin/env bash
# Cross-account AssumeRole demo (LocalStack mock 2 account)
set -e

ACCOUNT_A="111111111111"
ACCOUNT_B="222222222222"
ROLE_NAME="CrossRead"

cat > /tmp/trust-a.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::${ACCOUNT_B}:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": { "aws:MultiFactorAuthPresent": "true" }
    }
  }]
}
EOF

echo "==> [Account A=$ACCOUNT_A] Tạo role $ROLE_NAME trust account B"
awslocal iam create-role --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/trust-a.json

awslocal iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

cat > /tmp/policy-b.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::${ACCOUNT_A}:role/${ROLE_NAME}"
  }]
}
EOF

echo "==> [Account B=$ACCOUNT_B] User bob có policy assume role A"
awslocal iam create-user --user-name bob || true
awslocal iam put-user-policy --user-name bob \
  --policy-name AssumeARole --policy-document file:///tmp/policy-b.json

echo "==> Test assume (LocalStack không enforce MFA condition):"
awslocal sts assume-role \
  --role-arn "arn:aws:iam::${ACCOUNT_A}:role/${ROLE_NAME}" \
  --role-session-name bob-session

echo ""
echo "==> Trên AWS thật, bob sẽ phải:"
echo "  aws sts assume-role --role-arn arn:aws:iam::$ACCOUNT_A:role/$ROLE_NAME \\"
echo "    --role-session-name bob --serial-number arn:aws:iam::$ACCOUNT_B:mfa/bob \\"
echo "    --token-code 123456"
