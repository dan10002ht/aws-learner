#!/usr/bin/env bash
# Teardown — xóa mọi resource tạo bởi practice 03
set +e

echo "==> Detach + delete user alice"
awslocal iam list-access-keys --user-name alice --query 'AccessKeyMetadata[].AccessKeyId' --output text \
  | tr '\t' '\n' | while read k; do
    [ -n "$k" ] && awslocal iam delete-access-key --user-name alice --access-key-id "$k"
  done
awslocal iam remove-user-from-group --group-name learn-developers --user-name alice
awslocal iam delete-user --user-name alice

echo "==> Delete group"
awslocal iam detach-group-policy --group-name learn-developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
awslocal iam delete-group --group-name learn-developers

echo "==> Delete instance profile + role"
awslocal iam remove-role-from-instance-profile \
  --instance-profile-name learn-ec2-s3-reader-profile --role-name learn-ec2-s3-reader
awslocal iam delete-instance-profile --instance-profile-name learn-ec2-s3-reader-profile
awslocal iam detach-role-policy --role-name learn-ec2-s3-reader \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
awslocal iam delete-role --role-name learn-ec2-s3-reader

echo "==> Delete CrossRead role + user bob"
awslocal iam detach-role-policy --role-name CrossRead \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
awslocal iam delete-role --role-name CrossRead
awslocal iam delete-user-policy --user-name bob --policy-name AssumeARole
awslocal iam delete-user --user-name bob

echo "==> Done"
