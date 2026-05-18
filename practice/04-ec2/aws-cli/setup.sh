#!/usr/bin/env bash
# Setup key pair + Security Group cho EC2 lab
set -e
REGION="${AWS_REGION:-ap-southeast-1}"
KEY_NAME="learn-key"
SG_NAME="learn-ssh-http"

echo "==> Region: $REGION"
echo "==> Caller identity:"
aws sts get-caller-identity

echo "==> Tạo key pair $KEY_NAME"
if [ ! -f ~/.ssh/${KEY_NAME}.pem ]; then
  aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" \
    --query 'KeyMaterial' --output text > ~/.ssh/${KEY_NAME}.pem
  chmod 400 ~/.ssh/${KEY_NAME}.pem
  echo "    Saved to ~/.ssh/${KEY_NAME}.pem"
else
  echo "    Key file đã có local. Skip."
fi

echo "==> Tạo SG $SG_NAME (SSH + HTTP từ IP của bạn)"
MY_IP=$(curl -s ifconfig.me)
SG_ID=$(aws ec2 describe-security-groups --region "$REGION" \
  --filters Name=group-name,Values=$SG_NAME \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group --region "$REGION" \
    --group-name "$SG_NAME" --description "Learn EC2 SSH+HTTP" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=aws-learner}]" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --region "$REGION" \
    --group-id "$SG_ID" --protocol tcp --port 22 --cidr "${MY_IP}/32"
  aws ec2 authorize-security-group-ingress --region "$REGION" \
    --group-id "$SG_ID" --protocol tcp --port 80 --cidr "${MY_IP}/32"
fi

echo "==> SG_ID = $SG_ID"
echo "$SG_ID" > /tmp/learn-sg-id
echo "$REGION" > /tmp/learn-region
echo "==> Setup xong. Tiếp theo: ./launch.sh"
