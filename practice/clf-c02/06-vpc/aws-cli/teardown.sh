#!/usr/bin/env bash
# Teardown VPC + NAT GW + EIP + subnet + RT + IGW
set +e
REGION=$(cat /tmp/learn-region 2>/dev/null || echo "ap-southeast-1")
VPC=$(cat /tmp/learn-vpc-id 2>/dev/null)

if [ -z "$VPC" ]; then
  echo "Không tìm thấy VPC id. Hủy."
  exit 1
fi

echo "==> Delete NAT GWs trong VPC $VPC"
for NAT in $(aws ec2 describe-nat-gateways --region "$REGION" \
  --filter "Name=vpc-id,Values=$VPC" "Name=state,Values=available" \
  --query 'NatGateways[].NatGatewayId' --output text); do
  aws ec2 delete-nat-gateway --region "$REGION" --nat-gateway-id "$NAT"
  echo "  $NAT delete-requested"
done

echo "==> Wait NAT deleted..."
sleep 90

echo "==> Release EIPs có tag Project=aws-learner"
for EIP in $(aws ec2 describe-addresses --region "$REGION" \
  --query 'Addresses[?AssociationId==null].AllocationId' --output text); do
  aws ec2 release-address --region "$REGION" --allocation-id "$EIP"
done

echo "==> Detach + delete IGW"
for IGW in $(aws ec2 describe-internet-gateways --region "$REGION" \
  --filters "Name=attachment.vpc-id,Values=$VPC" \
  --query 'InternetGateways[].InternetGatewayId' --output text); do
  aws ec2 detach-internet-gateway --region "$REGION" --internet-gateway-id "$IGW" --vpc-id "$VPC"
  aws ec2 delete-internet-gateway --region "$REGION" --internet-gateway-id "$IGW"
done

echo "==> Delete subnets"
for SUB in $(aws ec2 describe-subnets --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC" --query 'Subnets[].SubnetId' --output text); do
  aws ec2 delete-subnet --region "$REGION" --subnet-id "$SUB"
done

echo "==> Delete route tables (non-main)"
for RT in $(aws ec2 describe-route-tables --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC" \
  --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' --output text); do
  aws ec2 delete-route-table --region "$REGION" --route-table-id "$RT"
done

echo "==> Delete VPC $VPC"
aws ec2 delete-vpc --region "$REGION" --vpc-id "$VPC"

rm -f /tmp/learn-vpc-id /tmp/learn-region
echo "==> Done. Check console để confirm."
