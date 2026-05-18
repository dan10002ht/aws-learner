#!/usr/bin/env bash
# Verify Lab 01 — kiểm tra mọi thứ lab.sh đã tạo

BUCKET=$(awslocal s3 ls | awk '{print $3}' | grep saa-lab01 | head -1)

if [ -z "$BUCKET" ]; then
  echo "❌ Không tìm thấy bucket saa-lab01-*. Chạy lab.sh trước."
  exit 1
fi

echo "================================"
echo "Bucket: $BUCKET"
echo "================================"

echo ""
echo "▶ [1] LIST OBJECTS"
awslocal s3 ls "s3://$BUCKET/"

echo ""
echo "▶ [2] VERSIONING STATUS"
awslocal s3api get-bucket-versioning --bucket "$BUCKET"

echo ""
echo "▶ [3] ALL OBJECT VERSIONS (cần thấy 2 versions của hello.txt)"
awslocal s3api list-object-versions --bucket "$BUCKET" \
  --query 'Versions[].{Key:Key,VersionId:VersionId,IsLatest:IsLatest,Size:Size,LastModified:LastModified}' \
  --output table

echo ""
echo "▶ [4] LIFECYCLE POLICY"
awslocal s3api get-bucket-lifecycle-configuration --bucket "$BUCKET"

echo ""
echo "▶ [5] ENCRYPTION CONFIG"
awslocal s3api get-bucket-encryption --bucket "$BUCKET"

echo ""
echo "▶ [6] OBJECT METADATA (latest version)"
awslocal s3api head-object --bucket "$BUCKET" --key hello.txt

echo ""
echo "▶ [7] CONTENT — LATEST VERSION"
awslocal s3 cp "s3://$BUCKET/hello.txt" /tmp/latest.txt 2>/dev/null
echo "   $(cat /tmp/latest.txt)"

echo ""
echo "▶ [8] CONTENT — OLD VERSION (chứng minh versioning hoạt động)"
OLD_VER=$(awslocal s3api list-object-versions --bucket "$BUCKET" \
  --query 'Versions[?IsLatest==`false`].VersionId | [0]' --output text)
if [ "$OLD_VER" != "None" ] && [ -n "$OLD_VER" ]; then
  awslocal s3api get-object --bucket "$BUCKET" --key hello.txt \
    --version-id "$OLD_VER" /tmp/old.txt > /dev/null
  echo "   VersionId: $OLD_VER"
  echo "   Content:   $(cat /tmp/old.txt)"
else
  echo "   Không có old version (lab.sh chỉ upload 1 lần?)"
fi

echo ""
echo "================================"
echo "✅ VERIFY HOÀN TẤT"
echo "================================"
