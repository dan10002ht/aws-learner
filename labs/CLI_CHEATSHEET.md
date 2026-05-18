# AWS CLI + jq Cheat Sheet (LocalStack & AWS thật)

> Mọi lệnh dưới đây thay `awslocal` bằng `aws` khi dùng AWS thật. Hai cách hoàn toàn tương đương về syntax.

## 0. Setup nhanh

```bash
# Cài jq
sudo apt install -y jq

# Output mặc định của aws cli là JSON → pipe qua jq
awslocal s3api list-buckets | jq .
```

3 flag mạnh nhất của AWS CLI mà ai cũng phải thuộc:

| Flag | Tác dụng |
|---|---|
| `--query` | JMESPath query (filter ngay trong CLI, không cần jq) |
| `--output` | `json` (default), `table`, `text`, `yaml` |
| `--profile` | Switch giữa nhiều account (`--profile prod` vs `--profile dev`) |

---

## 1. S3

### Liệt kê
```bash
# Tất cả buckets — chỉ tên
awslocal s3api list-buckets --query 'Buckets[].Name' --output table

# Bucket nào tạo trong 7 ngày qua
awslocal s3api list-buckets \
  --query 'Buckets[?CreationDate>=`2026-05-10`].[Name,CreationDate]' \
  --output table

# Đếm object trong 1 bucket
awslocal s3api list-objects-v2 --bucket MY_BUCKET --query 'length(Contents || `[]`)'

# Tổng size bucket (bytes)
awslocal s3api list-objects-v2 --bucket MY_BUCKET \
  --query 'sum(Contents[].Size)'

# 10 file lớn nhất trong bucket
awslocal s3api list-objects-v2 --bucket MY_BUCKET \
  --query 'reverse(sort_by(Contents,&Size))[:10].[Key,Size]' \
  --output table
```

### Versioning
```bash
# Tất cả version của 1 key
awslocal s3api list-object-versions --bucket MY_BUCKET --prefix hello.txt \
  | jq '.Versions[] | {Key, VersionId, IsLatest, Size, LastModified}'

# Đếm bao nhiêu delete-marker (file bị "xoá mềm")
awslocal s3api list-object-versions --bucket MY_BUCKET \
  --query 'length(DeleteMarkers || `[]`)'

# Restore object đã bị xoá (xoá delete-marker)
awslocal s3api delete-object --bucket MY_BUCKET --key hello.txt \
  --version-id <DELETE_MARKER_VERSION_ID>
```

### Upload patterns
```bash
# Upload thường
awslocal s3 cp file.txt s3://MY_BUCKET/

# Upload thẳng vào Storage class IA
awslocal s3 cp file.txt s3://MY_BUCKET/ --storage-class STANDARD_IA

# Upload với server-side encryption KMS
awslocal s3 cp file.txt s3://MY_BUCKET/ \
  --sse aws:kms --sse-kms-key-id alias/my-key

# Upload đệ quy 1 thư mục
awslocal s3 cp ./local-dir s3://MY_BUCKET/prefix/ --recursive

# Sync 2 chiều (chỉ copy file đã thay đổi)
awslocal s3 sync ./local-dir s3://MY_BUCKET/prefix/
```

### Presigned URL
```bash
# Cấp link tải tạm 1 giờ
awslocal s3 presign s3://MY_BUCKET/file.pdf --expires-in 3600
```

---

## 2. IAM

```bash
# List users
awslocal iam list-users --query 'Users[].UserName' --output table

# List policy attach vào role
awslocal iam list-attached-role-policies --role-name MY_ROLE

# Xem policy document (cần PolicyArn + VersionId)
POLICY_ARN=$(awslocal iam list-policies --query 'Policies[?PolicyName==`MyPolicy`].Arn' --output text)
VID=$(awslocal iam get-policy --policy-arn $POLICY_ARN --query 'Policy.DefaultVersionId' --output text)
awslocal iam get-policy-version --policy-arn $POLICY_ARN --version-id $VID \
  | jq '.PolicyVersion.Document'

# Simulate xem 1 user có permission không (rất hay trong exam)
awslocal iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:user/alice \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::MY_BUCKET/file.txt
```

---

## 3. Lambda

```bash
# List functions
awslocal lambda list-functions --query 'Functions[].FunctionName' --output table

# Invoke (sync, output ra file response.json)
awslocal lambda invoke \
  --function-name my-fn \
  --payload '{"name":"test"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
cat response.json | jq .

# Xem cấu hình
awslocal lambda get-function-configuration --function-name my-fn \
  | jq '{Runtime, Handler, Timeout, MemorySize, Role}'

# Update memory + timeout
awslocal lambda update-function-configuration \
  --function-name my-fn --memory-size 512 --timeout 60

# Xem log gần nhất (CloudWatch Logs)
awslocal logs tail /aws/lambda/my-fn --since 5m --follow
```

---

## 4. CloudWatch Logs (debug bất cứ gì)

```bash
# List log groups
awslocal logs describe-log-groups --query 'logGroups[].logGroupName'

# Tail log stream realtime
awslocal logs tail /aws/lambda/my-fn --follow

# Tìm log có chữ "ERROR" trong 1 giờ qua
awslocal logs filter-log-events \
  --log-group-name /aws/lambda/my-fn \
  --filter-pattern ERROR \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

## 5. Generic patterns — dùng được cho MỌI service

### Pattern 1: Lọc theo tag
```bash
awslocal ec2 describe-instances \
  --filters "Name=tag:Environment,Values=production" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' \
  --output table
```

### Pattern 2: Pipe AWS CLI → jq → AWS CLI (xoá hàng loạt)
```bash
# Xoá tất cả bucket có prefix test-
awslocal s3api list-buckets \
  | jq -r '.Buckets[] | select(.Name | startswith("test-")) | .Name' \
  | xargs -I {} awslocal s3 rb s3://{} --force
```

### Pattern 3: `--dry-run` trước khi chạy thật
```bash
# Tự khi nào AWS CLI hỗ trợ --dry-run (ec2, autoscaling...)
aws ec2 terminate-instances --instance-ids i-abc --dry-run
```

### Pattern 4: Wait command
```bash
# Đợi resource đạt trạng thái rồi tiếp tục
awslocal lambda wait function-active --function-name my-fn
awslocal s3api wait bucket-exists --bucket MY_BUCKET
```

---

## 6. `--query` (JMESPath) — học 5 pattern là đủ 80%

| Mục đích | Query |
|---|---|
| Lấy 1 field | `Buckets[].Name` |
| Filter | `Buckets[?Name==\`my-bucket\`]` |
| Filter có chữ "log" | `Buckets[?contains(Name,\`log\`)]` |
| Sort theo size | `sort_by(Contents,&Size)` |
| Đếm | `length(Buckets)` |

> JMESPath quan trọng hơn jq cho exam, vì AWS Console (Resource Explorer, Cost Explorer query) cũng dùng JMESPath.

---

## 7. `jq` — học 5 pattern là đủ

| Mục đích | jq |
|---|---|
| Xem đẹp | `\| jq .` |
| Lấy field | `\| jq '.Buckets[].Name'` (in raw: `-r`) |
| Filter | `\| jq '.Buckets[] \| select(.Name == "x")'` |
| Map đổi format | `\| jq '.Buckets \| map({n:.Name, d:.CreationDate})'` |
| Sang CSV | `\| jq -r '.Buckets[] \| [.Name,.CreationDate] \| @csv'` |

---

## 8. Tip làm việc hiệu quả

```bash
# Alias cho gõ nhanh
alias awsl='awslocal'
alias awsls='awslocal s3 ls'

# Auto-completion cho aws cli
complete -C aws_completer aws
complete -C aws_completer awslocal

# Lưu thông tin context vào prompt (PS1) để khỏi nhầm prod / dev
# Thêm vào ~/.bashrc:
# export PS1='[AWS:$AWS_PROFILE] $PS1'
```
