#!/usr/bin/env bash
# Teardown — xóa mọi EC2 + SG + key pair có tag Project=aws-learner
set +e
REGION=$(cat /tmp/learn-region 2>/dev/null || echo "ap-southeast-1")

echo "==> Terminate mọi instance có tag Project=aws-learner"
IDS=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Project,Values=aws-learner" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)

if [ -n "$IDS" ]; then
  echo "    IDs: $IDS"
  aws ec2 terminate-instances --region "$REGION" --instance-ids $IDS
  echo "==> Chờ terminate..."
  aws ec2 wait instance-terminated --region "$REGION" --instance-ids $IDS
else
  echo "    Không có instance nào."
fi

echo "==> Delete SG learn-*"
for SG in $(aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=group-name,Values=learn-*" \
  --query 'SecurityGroups[].GroupId' --output text); do
  aws ec2 delete-security-group --region "$REGION" --group-id "$SG" \
    && echo "    Deleted $SG"
done

echo "==> Delete key pair learn-key"
aws ec2 delete-key-pair --region "$REGION" --key-name learn-key
rm -f ~/.ssh/learn-key.pem /tmp/learn-sg-id /tmp/learn-region /tmp/learn-instance-ids

echo "==> Verify còn gì không:"
aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Project,Values=aws-learner" \
            "Name=instance-state-name,Values=running,pending,stopping,stopped" \
  --query 'Reservations[].Instances[].[InstanceId,State.Name]' --output table

echo "==> Mở Billing Dashboard sau 1h để confirm $0."
