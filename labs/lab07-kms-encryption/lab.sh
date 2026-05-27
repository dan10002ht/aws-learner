#!/usr/bin/env bash
# Lab 07 — KMS: CMK, envelope encryption, key policy, SSE-KMS trên S3
# Chạy: bash lab.sh

set -e

REGION="ap-southeast-1"
ALIAS="alias/lab07"
BUCKET="lab07-sse-kms-$(date +%s)"

cd "$(dirname "$0")"

echo "=== 1. Tạo Customer-Managed CMK ==="
KEY_ID=$(awslocal kms create-key \
  --description "lab07 CMK for envelope + SSE-KMS demo" \
  --key-usage ENCRYPT_DECRYPT \
  --query 'KeyMetadata.KeyId' --output text)
echo "KeyId: $KEY_ID"

awslocal kms create-alias --alias-name "$ALIAS" --target-key-id "$KEY_ID" \
  2>/dev/null || echo "Alias đã có"

echo ""
echo "=== 2. Bật automatic key rotation (rotate yearly) ==="
awslocal kms enable-key-rotation --key-id "$KEY_ID"
awslocal kms get-key-rotation-status --key-id "$KEY_ID"

echo ""
echo "=== 3. Encrypt nhỏ (≤4KB) trực tiếp ==="
PLAINTEXT="this is a small secret <= 4KB"
ENCRYPTED_B64=$(awslocal kms encrypt \
  --key-id "$ALIAS" \
  --plaintext "$(echo -n "$PLAINTEXT" | base64)" \
  --query 'CiphertextBlob' --output text)
echo "Ciphertext (base64, first 80 chars): ${ENCRYPTED_B64:0:80}..."

echo "$ENCRYPTED_B64" | base64 -d > /tmp/lab07-ct.bin
DECRYPTED=$(awslocal kms decrypt \
  --ciphertext-blob fileb:///tmp/lab07-ct.bin \
  --query 'Plaintext' --output text | base64 -d)
echo "Decrypt back: $DECRYPTED"
[ "$DECRYPTED" = "$PLAINTEXT" ] && echo "✓ match" || echo "✗ mismatch"

echo ""
echo "=== 4. Envelope encryption cho file lớn ==="
# Tạo file 10MB
dd if=/dev/urandom of=/tmp/lab07-big.bin bs=1M count=10 2>/dev/null

# (a) GenerateDataKey → trả về plaintext DEK + encrypted DEK
awslocal kms generate-data-key --key-id "$ALIAS" --key-spec AES_256 \
  --query '{Plaintext:Plaintext,CiphertextBlob:CiphertextBlob}' > /tmp/lab07-dek.json

PLAIN_DEK_B64=$(python3 -c "import json;print(json.load(open('/tmp/lab07-dek.json'))['Plaintext'])")
ENC_DEK_B64=$(python3 -c "import json;print(json.load(open('/tmp/lab07-dek.json'))['CiphertextBlob'])")

# (b) Lưu encrypted DEK kèm file (chứ KHÔNG lưu plaintext DEK)
echo "$ENC_DEK_B64" | base64 -d > /tmp/lab07-big.bin.dek
echo "$PLAIN_DEK_B64" | base64 -d > /tmp/lab07-plain-dek.bin

# (c) Encrypt file với DEK plaintext (AES-256-CBC, simulate "envelope")
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in /tmp/lab07-big.bin \
  -out /tmp/lab07-big.bin.enc \
  -pass file:/tmp/lab07-plain-dek.bin

# (d) Xóa plaintext DEK khỏi disk (best practice — memory chỉ tạm thời)
shred -u /tmp/lab07-plain-dek.bin 2>/dev/null || rm -f /tmp/lab07-plain-dek.bin

echo "Encrypted artifact: /tmp/lab07-big.bin.enc"
echo "Encrypted DEK:      /tmp/lab07-big.bin.dek"
ls -l /tmp/lab07-big.bin /tmp/lab07-big.bin.enc /tmp/lab07-big.bin.dek

echo ""
echo "=== 5. Decrypt envelope (DEK → file) ==="
# (a) Decrypt DEK qua KMS
RECOVERED_DEK_B64=$(awslocal kms decrypt \
  --ciphertext-blob fileb:///tmp/lab07-big.bin.dek \
  --query 'Plaintext' --output text)
echo "$RECOVERED_DEK_B64" | base64 -d > /tmp/lab07-recovered-dek.bin

# (b) Decrypt file với DEK đã recover
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /tmp/lab07-big.bin.enc \
  -out /tmp/lab07-decrypted.bin \
  -pass file:/tmp/lab07-recovered-dek.bin

# (c) So sánh
if cmp -s /tmp/lab07-big.bin /tmp/lab07-decrypted.bin; then
  echo "✓ Envelope decrypt thành công — file gốc khớp"
else
  echo "✗ File không khớp"
fi
rm -f /tmp/lab07-recovered-dek.bin

echo ""
echo "=== 6. SSE-KMS trên S3 bucket ==="
awslocal s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" > /dev/null

awslocal s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration "{
    \"Rules\":[{
      \"ApplyServerSideEncryptionByDefault\":{
        \"SSEAlgorithm\":\"aws:kms\",
        \"KMSMasterKeyID\":\"$ALIAS\"
      },
      \"BucketKeyEnabled\":true
    }]
  }"

echo "Bucket encryption:"
awslocal s3api get-bucket-encryption --bucket "$BUCKET"

# Upload object → S3 tự envelope với CMK
echo "secret payload" > /tmp/lab07-s3.txt
awslocal s3 cp /tmp/lab07-s3.txt "s3://$BUCKET/secret.txt"

echo ""
echo "Object metadata (chú ý ServerSideEncryption + SSEKMSKeyId):"
awslocal s3api head-object --bucket "$BUCKET" --key secret.txt \
  --query '{SSE:ServerSideEncryption,KMSKey:SSEKMSKeyId,BucketKey:BucketKeyEnabled}'

echo ""
echo "=== 7. Key policy — show ==="
awslocal kms get-key-policy --key-id "$KEY_ID" --policy-name default \
  --query 'Policy' --output text | python3 -m json.tool | head -30

echo ""
echo "=== HOÀN TẤT Lab 07 ==="
echo "CMK Alias: $ALIAS  (KeyId $KEY_ID)"
echo "Bucket:    $BUCKET"
echo "Verify:    bash verify.sh"
