#!/usr/bin/env bash
set -e
BUCKET="learn-s3-$(date +%s)"

echo "==> Create bucket $BUCKET"
awslocal s3 mb "s3://$BUCKET"

echo "==> Enable versioning"
awslocal s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo "==> Upload 3 versions"
for i in 1 2 3; do
  echo "version $i" > /tmp/file.txt
  awslocal s3 cp /tmp/file.txt "s3://$BUCKET/file.txt"
done

echo "==> List versions"
awslocal s3api list-object-versions --bucket "$BUCKET" --prefix file.txt

echo "==> Apply lifecycle"
cat > /tmp/lc.json <<EOF
{"Rules":[
  {"ID":"abort-mpu","Status":"Enabled","Filter":{},
   "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}},
  {"ID":"to-ia","Status":"Enabled","Filter":{"Prefix":"logs/"},
   "Transitions":[{"Days":30,"StorageClass":"STANDARD_IA"}]}
]}
EOF
awslocal s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration file:///tmp/lc.json

echo "==> Block Public Access"
awslocal s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "==> Done. Cleanup: awslocal s3 rb s3://$BUCKET --force"
