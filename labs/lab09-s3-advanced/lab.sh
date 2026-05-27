#!/usr/bin/env bash
# Lab 09 — S3 Advanced: CRR, Lifecycle, Presigned, Multipart, Object Lock
# Chạy: bash lab.sh

set -e

REGION="ap-southeast-1"
REPLICA_REGION="ap-southeast-2"
SOURCE="lab09-source-$(date +%s)"
REPLICA="lab09-replica-$(date +%s)"
LOCKED="lab09-locked-$(date +%s)"
REPL_ROLE="lab09-replication-role"

cd "$(dirname "$0")"

echo "=== 1. Tạo 2 bucket (source + replica) + bật versioning cả 2 ==="
awslocal s3api create-bucket --bucket "$SOURCE" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" > /dev/null
awslocal s3api create-bucket --bucket "$REPLICA" --region "$REPLICA_REGION" \
  --create-bucket-configuration LocationConstraint="$REPLICA_REGION" > /dev/null

for B in "$SOURCE" "$REPLICA"; do
  awslocal s3api put-bucket-versioning --bucket "$B" \
    --versioning-configuration Status=Enabled
done
echo "  Source:  $SOURCE  ($REGION)"
echo "  Replica: $REPLICA ($REPLICA_REGION)"

echo ""
echo "=== 2. IAM role cho replication ==="
cat > /tmp/lab09-trust.json <<'EOF'
{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"s3.amazonaws.com"},"Action":"sts:AssumeRole"}]
}
EOF
awslocal iam create-role --role-name "$REPL_ROLE" \
  --assume-role-policy-document file:///tmp/lab09-trust.json > /dev/null 2>&1 || echo "Role đã có"

cat > /tmp/lab09-repl-policy.json <<EOF
{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":["s3:GetReplicationConfiguration","s3:ListBucket"],
     "Resource":"arn:aws:s3:::$SOURCE"},
    {"Effect":"Allow","Action":["s3:GetObjectVersionForReplication","s3:GetObjectVersionAcl","s3:GetObjectVersionTagging"],
     "Resource":"arn:aws:s3:::$SOURCE/*"},
    {"Effect":"Allow","Action":["s3:ReplicateObject","s3:ReplicateDelete","s3:ReplicateTags"],
     "Resource":"arn:aws:s3:::$REPLICA/*"}
  ]
}
EOF
awslocal iam put-role-policy --role-name "$REPL_ROLE" \
  --policy-name lab09-repl-inline \
  --policy-document file:///tmp/lab09-repl-policy.json
REPL_ROLE_ARN=$(awslocal iam get-role --role-name "$REPL_ROLE" --query 'Role.Arn' --output text)

echo ""
echo "=== 3. Bật CRR (Cross-Region Replication) ==="
cat > /tmp/lab09-replication.json <<EOF
{
  "Role": "$REPL_ROLE_ARN",
  "Rules": [{
    "ID": "replicate-all",
    "Status": "Enabled",
    "Priority": 1,
    "DeleteMarkerReplication": {"Status": "Disabled"},
    "Filter": {},
    "Destination": {
      "Bucket": "arn:aws:s3:::$REPLICA",
      "StorageClass": "STANDARD"
    }
  }]
}
EOF
awslocal s3api put-bucket-replication --bucket "$SOURCE" \
  --replication-configuration file:///tmp/lab09-replication.json

echo "Replication config:"
awslocal s3api get-bucket-replication --bucket "$SOURCE"

echo ""
echo "=== 4. Lifecycle: Standard → IA(30) → Glacier(90) → Expire(365) ==="
cat > /tmp/lab09-lifecycle.json <<'EOF'
{
  "Rules": [{
    "ID": "archive-and-expire",
    "Status": "Enabled",
    "Filter": {"Prefix": ""},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"}
    ],
    "Expiration": {"Days": 365},
    "NoncurrentVersionExpiration": {"NoncurrentDays": 180}
  }]
}
EOF
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket "$SOURCE" \
  --lifecycle-configuration file:///tmp/lab09-lifecycle.json

echo ""
echo "=== 5. Upload object → kiểm tra replicate sang replica bucket ==="
echo "Hello CRR" > /tmp/lab09-crr.txt
awslocal s3 cp /tmp/lab09-crr.txt "s3://$SOURCE/data/crr-test.txt"
sleep 2
echo "Object ở replica:"
awslocal s3 ls "s3://$REPLICA/" --recursive || echo "(LocalStack có thể không sync real-time)"

echo ""
echo "=== 6. Presigned URL — GET (10 phút) ==="
URL=$(awslocal s3 presign "s3://$SOURCE/data/crr-test.txt" --expires-in 600)
echo "Presigned URL: $URL"

echo ""
echo "=== 7. Multipart upload — file 15 MB ==="
dd if=/dev/urandom of=/tmp/lab09-big.bin bs=1M count=15 2>/dev/null
KEY="big/file-$(date +%s).bin"
UPLOAD_ID=$(awslocal s3api create-multipart-upload \
  --bucket "$SOURCE" --key "$KEY" \
  --query 'UploadId' --output text)
echo "UploadId: $UPLOAD_ID"

# Split thành 3 part 5MB
split -b 5M /tmp/lab09-big.bin /tmp/lab09-part-
PARTS_JSON='{"Parts":['
PN=1
for f in /tmp/lab09-part-*; do
  ETAG=$(awslocal s3api upload-part \
    --bucket "$SOURCE" --key "$KEY" \
    --part-number $PN --upload-id "$UPLOAD_ID" \
    --body "$f" --query 'ETag' --output text)
  [ $PN -gt 1 ] && PARTS_JSON+=","
  PARTS_JSON+="{\"ETag\":$ETAG,\"PartNumber\":$PN}"
  PN=$((PN+1))
done
PARTS_JSON+=']}'
echo "$PARTS_JSON" > /tmp/lab09-parts.json

awslocal s3api complete-multipart-upload \
  --bucket "$SOURCE" --key "$KEY" \
  --upload-id "$UPLOAD_ID" \
  --multipart-upload file:///tmp/lab09-parts.json > /dev/null
echo "Multipart upload xong: $KEY"
rm -f /tmp/lab09-part-*

echo ""
echo "=== 8. Object Lock (Governance mode) trên bucket riêng ==="
awslocal s3api create-bucket --bucket "$LOCKED" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  --object-lock-enabled-for-bucket > /dev/null

awslocal s3api put-object-lock-configuration --bucket "$LOCKED" \
  --object-lock-configuration '{
    "ObjectLockEnabled":"Enabled",
    "Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":1}}
  }'

echo "important" > /tmp/lab09-lock.txt
awslocal s3 cp /tmp/lab09-lock.txt "s3://$LOCKED/locked.txt"

echo "Test xóa object đang locked → phải lỗi (trừ khi có BypassGovernanceRetention):"
awslocal s3api delete-object --bucket "$LOCKED" --key locked.txt 2>&1 \
  | head -3 || true

echo ""
echo "=== HOÀN TẤT Lab 09 ==="
echo "Source:  $SOURCE"
echo "Replica: $REPLICA"
echo "Locked:  $LOCKED"
echo "Verify: bash verify.sh"
echo "Cleanup:"
echo "  awslocal s3 rm s3://$SOURCE --recursive && awslocal s3 rb s3://$SOURCE"
echo "  awslocal s3 rm s3://$REPLICA --recursive && awslocal s3 rb s3://$REPLICA"
