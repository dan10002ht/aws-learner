#!/usr/bin/env bash
# Verify Lab 09

SRC=$(awslocal s3 ls | awk '{print $3}' | grep lab09-source | head -1)
REP=$(awslocal s3 ls | awk '{print $3}' | grep lab09-replica | head -1)
LOCK=$(awslocal s3 ls | awk '{print $3}' | grep lab09-locked | head -1)

echo "================================"
echo "Lab 09 — S3 Advanced Verify"
echo "================================"
echo "Source:  $SRC"
echo "Replica: $REP"
echo "Locked:  $LOCK"

if [ -z "$SRC" ]; then
  echo "❌ Chưa chạy lab.sh"
  exit 1
fi

echo ""
echo "▶ Versioning"
for B in "$SRC" "$REP"; do
  [ -z "$B" ] && continue
  echo "  $B:"
  awslocal s3api get-bucket-versioning --bucket "$B" --query 'Status'
done

echo ""
echo "▶ Replication config (source)"
awslocal s3api get-bucket-replication --bucket "$SRC" \
  --query 'ReplicationConfiguration.Rules[].{ID:ID,Status:Status,Dest:Destination.Bucket}' --output table

echo ""
echo "▶ Lifecycle policy"
awslocal s3api get-bucket-lifecycle-configuration --bucket "$SRC"

echo ""
echo "▶ Object trên source"
awslocal s3 ls "s3://$SRC" --recursive

echo ""
echo "▶ Object trên replica (mong: thấy file đã replicate)"
[ -n "$REP" ] && awslocal s3 ls "s3://$REP" --recursive

echo ""
echo "▶ Object Lock config"
[ -n "$LOCK" ] && awslocal s3api get-object-lock-configuration --bucket "$LOCK"
