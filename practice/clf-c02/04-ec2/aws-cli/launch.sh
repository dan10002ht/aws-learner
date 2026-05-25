#!/usr/bin/env bash
# Launch t3.micro EC2 với IMDSv2 required + tag Project=aws-learner
set -e
REGION=$(cat /tmp/learn-region 2>/dev/null || echo "ap-southeast-1")
SG_ID=$(cat /tmp/learn-sg-id)
KEY_NAME="learn-key"
NAME="learn-ec2-$(date +%s)"

echo "==> Lấy AMI Amazon Linux 2023 mới nhất"
AMI=$(aws ec2 describe-images --region "$REGION" --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)
echo "    AMI = $AMI"

USER_DATA_FILE="$(dirname "$0")/user-data.sh"
USER_DATA_ARG=""
if [ -f "$USER_DATA_FILE" ]; then
  USER_DATA_ARG="--user-data file://$USER_DATA_FILE"
  echo "==> Có user-data.sh, sẽ inject"
fi

echo "==> Launch t3.micro với IMDSv2 required"
INSTANCE_ID=$(aws ec2 run-instances --region "$REGION" \
  --image-id "$AMI" --instance-type t3.micro \
  --key-name "$KEY_NAME" --security-group-ids "$SG_ID" \
  --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=2,HttpEndpoint=enabled" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME},{Key=Project,Value=aws-learner},{Key=Auto-Delete,Value=true}]" \
  $USER_DATA_ARG \
  --query 'Instances[0].InstanceId' --output text)

echo "==> Instance ID: $INSTANCE_ID"
echo "$INSTANCE_ID" >> /tmp/learn-instance-ids

echo "==> Chờ instance running..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

PUB_IP=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "==> Public IP: $PUB_IP"
echo "==> SSH: ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUB_IP"
