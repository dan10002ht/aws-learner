# Practice 04 — EC2

Liên kết bài: [lessons/04-ec2.md](../../lessons/04-ec2.md)

## Mục tiêu
- Launch + terminate EC2 bằng CLI.
- Cấu hình SG, key pair, IMDSv2.
- So sánh pricing 4 model.
- Spot Instance, User Data, Instance Profile.

⚠️ **Trước khi chạy lab có phí:** đảm bảo Budget alert đã set, login bằng IAM user `learner`, region `ap-southeast-1`.

---

## Exercise 1 — Launch EC2 đầu tiên (Free Tier)
Mục tiêu: tạo 1 EC2 `t3.micro`, SSH vào, terminate sạch sẽ.

```bash
cd practice/04-ec2/aws-cli
./setup.sh           # tạo key pair + SG
./launch.sh          # launch EC2
./ssh.sh             # SSH vào
./teardown.sh        # 🚨 xóa hết
```

**Tiêu chí pass:**
- [ ] SSH thành công.
- [ ] `aws ec2 describe-instances` sau teardown trả empty.
- [ ] Billing không tăng (sau 1h kiểm tra).

---

## Exercise 2 — User Data tự cài nginx
Sửa `launch.sh` thêm `--user-data file://user-data.sh`:

```bash
#!/bin/bash
dnf install -y nginx
systemctl enable --now nginx
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
IID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
echo "<h1>Hello from $IID</h1>" > /usr/share/nginx/html/index.html
```

Mở port 80 trong SG, curl public IP → thấy hello message.

**Câu hỏi:**
1. User data chạy với user nào? (`whoami` trong script)
2. Log của user data ở file nào?
3. Nếu sửa user data rồi reboot, có chạy lại không?

→ Đáp án [solution.md § Ex2](solution.md#exercise-2).

---

## Exercise 3 — IMDSv2 enforce
Launch 2 instance:
- A: `HttpTokens=optional` (v1 OK).
- B: `HttpTokens=required` (v2 only).

Trên mỗi instance:
```bash
# v1 style (không token)
curl -s http://169.254.169.254/latest/meta-data/instance-id
# v2 style
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id
```

So sánh: trên B, v1 trả về gì? (Hint: 401 Unauthorized)

---

## Exercise 4 — Instance Profile thay access key
```bash
./create-role.sh   # tạo role + instance profile s3-readonly
./launch.sh --profile learn-ec2-s3-profile
```

SSH vào, chạy `aws s3 ls` — **không cần** `aws configure`. Verify credential từ IMDS:
```bash
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/learn-ec2-s3
```

---

## Exercise 5 — Spot Instance
```bash
./launch-spot.sh  # MaxPrice=0.01, type=one-time
```

Xem giá history:
```bash
aws ec2 describe-spot-price-history --instance-types t3.micro \
  --product-descriptions "Linux/UNIX" --max-items 10
```

Trong instance, watch interruption notice:
```bash
while true; do
  curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/spot/instance-action
  echo " - $(date)"
  sleep 5
done
```

**Câu hỏi:**
1. Spot price hiện tại so với On-Demand?
2. Nếu được interrupt, bạn có bao nhiêu phút?
3. Làm sao app graceful shutdown trong 2 phút?

---

## Exercise 6 — Pricing comparison (no-cost, giấy)
Workload: 4 vCPU + 16GB RAM, chạy 24/7 trong 3 năm, region `ap-southeast-1`.

Tính cost (dùng https://instances.vantage.sh/ hoặc Pricing Calculator):

| Model | $/tháng | $/3 năm | Saving vs On-Demand |
|-------|---------|---------|---------------------|
| On-Demand `m6i.xlarge` | | | 0% |
| RI `m6i.xlarge` 3y all-upfront | | | |
| Compute SP 3y no-upfront | | | |
| EC2 Instance SP 3y all-upfront | | | |
| Spot avg (90% off) | | | ~90% |
| Graviton `m7g.xlarge` On-Demand | | | |
| Graviton `m7g.xlarge` SP 3y | | | |

→ Đáp án trong [solution.md § Ex6](solution.md#exercise-6).

---

## Exercise 7 — Schedule stop/start dev/test (advanced)
Setup Lambda + EventBridge để stop EC2 18:00 GMT+7 weekday, start 8:00:

```bash
# Tag EC2 cần schedule
aws ec2 create-tags --resources $INSTANCE --tags Key=AutoStop,Value=true

# EventBridge rule cron(0 11 ? * MON-FRI *)  # 18:00 ICT = 11:00 UTC
# Lambda: describe-instances filter tag AutoStop=true → stop
```

Snippet Lambda (Python):
```python
import boto3
ec2 = boto3.client('ec2')
def handler(event, context):
    action = event.get('action', 'stop')
    instances = ec2.describe_instances(Filters=[
        {'Name': 'tag:AutoStop', 'Values': ['true']},
        {'Name': 'instance-state-name', 'Values': ['running' if action=='stop' else 'stopped']}
    ])
    ids = [i['InstanceId'] for r in instances['Reservations'] for i in r['Instances']]
    if ids:
        (ec2.stop_instances if action=='stop' else ec2.start_instances)(InstanceIds=ids)
    return {'affected': ids}
```

**Tiêu chí pass:** instance tự stop lúc 18:00, start lúc 8:00 ngày làm việc.

---

## Exercise 8 — Vẽ diagram (no-cost)
Vẽ kiến trúc 3-tier trên Excalidraw:
- VPC `ap-southeast-1` với 3 AZ.
- ALB ở 3 public subnet.
- ASG (min 2, max 6) EC2 ở 3 private subnet.
- RDS Multi-AZ ở 3 DB subnet.
- NAT GW per AZ.
- SG chain: ALB-SG → App-SG → DB-SG.

Lưu vào `diagrams/3-tier.excalidraw`.

---

## Teardown checklist
```bash
./teardown.sh
```
Verify:
```bash
aws ec2 describe-instances --filters Name=tag:Project,Values=aws-learner \
  --query 'Reservations[].Instances[?State.Name!=`terminated`]' --output table
# → empty
aws ec2 describe-security-groups --filters Name=group-name,Values=learn-* --output table
# → empty
aws ec2 describe-volumes --filters Name=tag:Project,Values=aws-learner --output table
# → empty
```

Mở Billing Dashboard 1h sau → confirm $0.
