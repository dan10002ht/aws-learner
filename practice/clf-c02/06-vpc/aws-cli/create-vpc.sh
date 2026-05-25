#!/usr/bin/env bash
# Tạo VPC 3-tier multi-AZ. ⚠️ Có phí NAT GW.
set -e
REGION="${AWS_REGION:-ap-southeast-1}"
PROJECT="aws-learner"
TAG="Tags=[{Key=Project,Value=$PROJECT},{Key=Auto-Delete,Value=true}]"

echo "==> Create VPC"
VPC=$(aws ec2 create-vpc --region "$REGION" --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,$TAG" \
  --query 'Vpc.VpcId' --output text)
aws ec2 modify-vpc-attribute --region "$REGION" --vpc-id "$VPC" --enable-dns-hostnames

echo "==> IGW"
IGW=$(aws ec2 create-internet-gateway --region "$REGION" \
  --tag-specifications "ResourceType=internet-gateway,$TAG" \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --region "$REGION" --vpc-id "$VPC" --internet-gateway-id "$IGW"

AZS=( ${REGION}a ${REGION}b ${REGION}c )
PUB_SUBNETS=()
PRIV_SUBNETS=()
NAT_IDS=()

for i in 0 1 2; do
  AZ=${AZS[$i]}
  PUB_CIDR="10.0.$((i*4)).0/22"
  PRIV_CIDR="10.0.$((12+i*4)).0/22"

  echo "==> Public subnet $PUB_CIDR @ $AZ"
  PUB=$(aws ec2 create-subnet --region "$REGION" --vpc-id "$VPC" \
    --cidr-block "$PUB_CIDR" --availability-zone "$AZ" \
    --tag-specifications "ResourceType=subnet,$TAG" \
    --query 'Subnet.SubnetId' --output text)
  aws ec2 modify-subnet-attribute --region "$REGION" --subnet-id "$PUB" --map-public-ip-on-launch
  PUB_SUBNETS+=("$PUB")

  echo "==> Private subnet $PRIV_CIDR @ $AZ"
  PRIV=$(aws ec2 create-subnet --region "$REGION" --vpc-id "$VPC" \
    --cidr-block "$PRIV_CIDR" --availability-zone "$AZ" \
    --tag-specifications "ResourceType=subnet,$TAG" \
    --query 'Subnet.SubnetId' --output text)
  PRIV_SUBNETS+=("$PRIV")
done

echo "==> Public RT → IGW"
RT_PUB=$(aws ec2 create-route-table --region "$REGION" --vpc-id "$VPC" \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --region "$REGION" --route-table-id "$RT_PUB" \
  --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW"
for s in "${PUB_SUBNETS[@]}"; do
  aws ec2 associate-route-table --region "$REGION" --route-table-id "$RT_PUB" --subnet-id "$s"
done

echo "==> NAT GW per AZ (⚠️ cost)"
for i in 0 1 2; do
  EIP=$(aws ec2 allocate-address --region "$REGION" --query AllocationId --output text)
  NAT=$(aws ec2 create-nat-gateway --region "$REGION" --subnet-id "${PUB_SUBNETS[$i]}" \
    --allocation-id "$EIP" --query 'NatGateway.NatGatewayId' --output text)
  NAT_IDS+=("$NAT")
  echo "    NAT[$i]=$NAT"
done

echo "==> Wait NAT available..."
aws ec2 wait nat-gateway-available --region "$REGION" --nat-gateway-ids "${NAT_IDS[@]}"

echo "==> Private RT per AZ → NAT[i]"
for i in 0 1 2; do
  RT=$(aws ec2 create-route-table --region "$REGION" --vpc-id "$VPC" \
    --query 'RouteTable.RouteTableId' --output text)
  aws ec2 create-route --region "$REGION" --route-table-id "$RT" \
    --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "${NAT_IDS[$i]}"
  aws ec2 associate-route-table --region "$REGION" --route-table-id "$RT" --subnet-id "${PRIV_SUBNETS[$i]}"
done

echo "==> Done. VPC=$VPC"
echo "$VPC" > /tmp/learn-vpc-id
echo "$REGION" > /tmp/learn-region

echo "==> Cost reminder: 3 NAT GW = $0.135/h. Chạy ./teardown.sh khi xong."
