# Scripting & Automation: Bash nâng cao + Python boto3

Là Solutions Architect, bạn sẽ không click console cả ngày — bạn viết script. Bài này nâng cấp Bash của bạn lên mức "production-safe", dạy bạn xử lý JSON từ AWS CLI bằng `jq` và JMESPath, rồi chuyển sang Python boto3 khi logic phức tạp hơn. Tất cả ví dụ đều chạy được ngay.

## 1. Bash nâng cao: viết script không tự bắn vào chân

### 1.1 Ba dòng đầu tiên của mọi script

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Tuỳ chọn | Tác dụng |
|---|---|
| `set -e` | Thoát ngay khi một lệnh trả về exit code khác 0 |
| `set -u` | Báo lỗi khi dùng biến chưa khai báo (bắt lỗi gõ sai tên biến) |
| `set -o pipefail` | Pipe `a \| b` fail nếu **bất kỳ** lệnh nào trong pipe fail, không chỉ lệnh cuối |
| `IFS=$'\n\t'` | Tách từ theo newline/tab, tránh vỡ khi dữ liệu có dấu cách |

Chạy thử để thấy khác biệt:

```bash
bash -c 'grep foo /khong/ton/tai | wc -l; echo "exit: $?"'
# exit: 0  ← nguy hiểm! pipe "thành công" dù grep fail

bash -c 'set -o pipefail; grep foo /khong/ton/tai | wc -l; echo "exit: $?"'
# grep: /khong/ton/tai: No such file or directory
# 0
# exit: 2  ← đúng như mong đợi
```

> ⚠️ **Lỗi thường gặp:** `set -e` KHÔNG có hiệu lực bên trong `if`, `while`, `&&`, `||`. Ví dụ `if my_func; then ...` — lệnh fail trong `my_func` sẽ không dừng script. Đừng tin `set -e` 100%; vẫn phải check exit code chỗ quan trọng.

### 1.2 Quoting đúng — nguồn của 80% bug Bash

Quy tắc vàng: **luôn đặt biến trong dấu nháy kép** `"$var"`, trừ khi bạn cố tình muốn word-splitting.

```bash
file="bao cao thang 6.txt"

rm $file      # SAI: chạy rm "bao" "cao" "thang" "6.txt" — xoá 4 file khác!
rm "$file"    # ĐÚNG

# Array là cách an toàn để gom tham số:
args=(--region ap-southeast-1 --output json)
aws ec2 describe-instances "${args[@]}"
```

| Cú pháp | Ý nghĩa |
|---|---|
| `"$var"` | Giá trị nguyên vẹn, không tách từ |
| `"${arr[@]}"` | Mỗi phần tử array thành một tham số riêng (luôn dùng dạng này) |
| `"${var:-default}"` | Dùng `default` nếu var rỗng/chưa set |
| `"${var:?thiếu var}"` | Thoát kèm thông báo nếu var chưa set |
| `$(cmd)` | Command substitution — dùng thay backtick |

### 1.3 Hàm, biến local, và trap dọn dẹp

```bash
#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
  echo "Đã dọn $TMP_DIR" >&2
}
trap cleanup EXIT          # chạy khi script thoát — kể cả khi lỗi hoặc Ctrl+C

log()  { echo "[$(date +%T)] $*" >&2; }    # log ra stderr, giữ stdout cho dữ liệu
die()  { log "LỖI: $*"; exit 1; }

backup_bucket() {
  local bucket="${1:?cần tên bucket}"     # local + bắt buộc tham số
  aws s3 sync "s3://$bucket" "$TMP_DIR/$bucket" || die "sync $bucket thất bại"
}

backup_bucket "my-app-config"
```

> 💡 **Ghi nhớ:** `trap cleanup EXIT` là "finally" của Bash. Mọi script tạo file tạm, port-forward, hoặc resource tạm đều nên có trap để không để rác lại khi fail giữa chừng.

### 1.4 xargs — chạy song song hàng loạt

```bash
# Xoá 50 object S3, 8 luồng song song:
aws s3api list-objects-v2 --bucket my-bucket \
  --query 'Contents[?LastModified<`2025-01-01`].Key' --output text \
  | tr '\t' '\n' \
  | xargs -P 8 -I {} aws s3 rm "s3://my-bucket/{}"
```

| Flag | Tác dụng |
|---|---|
| `-P 8` | Chạy tối đa 8 process song song |
| `-I {}` | Thay `{}` bằng từng dòng input |
| `-r` | Không chạy gì nếu input rỗng (tránh chạy lệnh với tham số trống) |
| `-0` | Đọc input phân tách bằng NUL — đi cặp với `find -print0`, an toàn với tên file có dấu cách |

### 1.5 jq — dao Thuỵ Sĩ cho JSON

AWS CLI với `--output json` + `jq` là combo kinh điển:

```bash
aws ec2 describe-instances --output json | jq -r '
  .Reservations[].Instances[]
  | select(.State.Name == "running")
  | [.InstanceId, .InstanceType, (.Tags[]? | select(.Key=="Name") | .Value) // "no-name"]
  | @tsv'
```

Output mẫu:

```
i-0abc123def456	t3.medium	web-prod-1
i-0fed654cba321	m5.large	worker-2
```

Bảng tra nhanh jq:

| Biểu thức | Ý nghĩa |
|---|---|
| `.Reservations[]` | Duyệt từng phần tử mảng |
| `select(.x == "y")` | Lọc |
| `.Tags[]?` | `?` = không lỗi nếu Tags null |
| `// "default"` | Giá trị mặc định khi null |
| `-r` | Raw output (bỏ dấu nháy kép) — gần như luôn dùng |
| `@tsv`, `@csv` | Format thành tab/comma-separated |
| `jq -s 'length'` | Gom toàn bộ input thành mảng rồi đếm |
| `to_entries`, `from_entries` | Chuyển object ↔ mảng key/value |

### 1.6 cron & systemd timer

```bash
# crontab -e
# phút giờ ngày tháng thứ
30 2 * * * /opt/scripts/cleanup-snapshots.sh >> /var/log/cleanup.log 2>&1
```

> ⚠️ **Lỗi thường gặp với cron:** (1) PATH của cron rất tối giản — luôn dùng đường dẫn tuyệt đối hoặc set PATH đầu script. (2) Không có biến môi trường AWS — phải chỉ rõ `AWS_PROFILE` hoặc dùng instance role. (3) Quên redirect output → lỗi biến mất không dấu vết.

systemd timer hiện đại hơn cron (log vào journal, retry, tránh chạy chồng):

```ini
# /etc/systemd/system/cleanup.timer
[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true          # chạy bù nếu máy tắt lúc đến giờ

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now cleanup.timer
systemctl list-timers          # xem lịch chạy kế tiếp
journalctl -u cleanup.service  # xem log
```

## 2. AWS CLI thực dụng

### 2.1 Profiles

```bash
# ~/.aws/config
[profile dev]
region = ap-southeast-1
output = json

[profile prod]
region = ap-southeast-1
role_arn = arn:aws:iam::222222222222:role/ReadOnly
source_profile = dev
```

```bash
aws sts get-caller-identity --profile prod   # luôn kiểm tra "mình là ai" trước
export AWS_PROFILE=dev                       # đặt mặc định cho session
```

### 2.2 --query (JMESPath) vs --filter vs jq

| Cơ chế | Chạy ở đâu | Khi nào dùng |
|---|---|---|
| `--filters` | **Server-side** | Giảm dữ liệu trả về — luôn ưu tiên dùng trước |
| `--query` (JMESPath) | Client-side, trong CLI | Cắt gọn output nhanh, không cần cài gì thêm |
| `jq` | Client-side, ngoài CLI | Biến đổi phức tạp, join, group_by |

```bash
# Kết hợp cả hai: filter server-side, query client-side
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" "Name=tag:Env,Values=prod" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,PrivateIpAddress]' \
  --output table
```

```
---------------------------------------------------
|                DescribeInstances                |
+----------------------+------------+-------------+
|  i-0abc123def456     |  t3.medium |  10.0.1.15  |
|  i-0fed654cba321     |  m5.large  |  10.0.2.40  |
+----------------------+------------+-------------+
```

JMESPath tra nhanh:

| Biểu thức | Ý nghĩa |
|---|---|
| `Reservations[].Instances[]` | Flatten mảng lồng nhau |
| `Instances[?State.Name=='running']` | Lọc (chuỗi dùng nháy đơn, backtick cho literal) |
| `[InstanceId,Tags[?Key=='Name'].Value\|[0]]` | Chọn nhiều field, pipe lấy phần tử đầu |
| `sort_by(@, &LaunchTime)` | Sắp xếp |

### 2.3 Pagination

AWS CLI v2 **tự động phân trang** cho hầu hết lệnh `list-*`/`describe-*`. Nhưng:

```bash
# Tắt auto-pagination khi muốn tự kiểm soát (dataset cực lớn):
aws s3api list-objects-v2 --bucket big-bucket --max-items 1000 \
  --starting-token "$NEXT_TOKEN"
```

> 💡 **Ghi nhớ:** Nếu kết quả "thiếu" một cách bí ẩn, kiểm tra xem bạn có đang dùng `--page-size` nhầm với `--max-items` không. `--page-size` chỉ chỉnh kích thước từng API call (tránh timeout), còn `--max-items` mới giới hạn tổng kết quả.

## 3. Python + boto3

### 3.1 client vs resource

```python
import boto3

ec2_client = boto3.client("ec2")      # ánh xạ 1-1 với API, trả về dict
s3_resource = boto3.resource("s3")    # hướng đối tượng, tiện nhưng đã "feature-freeze"
```

> 💡 **Ghi nhớ:** Từ 2023, AWS đã ngừng phát triển interface `resource` (vẫn dùng được nhưng không thêm service mới). **Mặc định dùng `client`** — đầy đủ API, dễ tra cứu vì khớp tài liệu API reference.

### 3.2 Paginator — đừng tự viết vòng while NextToken

```python
ec2 = boto3.client("ec2")
paginator = ec2.get_paginator("describe_instances")

for page in paginator.paginate(
    Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
):
    for res in page["Reservations"]:
        for inst in res["Instances"]:
            print(inst["InstanceId"], inst["InstanceType"])
```

### 3.3 Waiter — chờ resource sẵn sàng không cần sleep

```python
instance_id = ec2.run_instances(...)["Instances"][0]["InstanceId"]

waiter = ec2.get_waiter("instance_running")
waiter.wait(InstanceIds=[instance_id], WaiterConfig={"Delay": 5, "MaxAttempts": 60})
print(f"{instance_id} đã running")
```

### 3.4 Error handling với ClientError

```python
from botocore.exceptions import ClientError

def get_object_safe(bucket: str, key: str):
    s3 = boto3.client("s3")
    try:
        return s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "NoSuchKey":
            return None                      # trường hợp dự kiến — xử lý êm
        if code in ("AccessDenied", "ExpiredToken"):
            raise SystemExit(f"Lỗi credential/quyền: {code}")
        raise                                # lỗi lạ — đừng nuốt, ném tiếp
```

> ⚠️ **Lỗi thường gặp:** `except Exception: pass` trong script vận hành. Khi script "dọn dẹp" nuốt lỗi AccessDenied rồi báo cáo "đã xoá 0 snapshot, thành công!", bạn sẽ phát hiện ra sau 6 tháng kèm hoá đơn EBS. Chỉ catch mã lỗi cụ thể mình hiểu.

### 3.5 Script thật #1: dọn EBS snapshot cũ (idempotent + dry-run)

```python
#!/usr/bin/env python3
"""Xoá snapshot tự tạo cũ hơn N ngày. Mặc định dry-run."""
import argparse
from datetime import datetime, timedelta, timezone

import boto3
from botocore.exceptions import ClientError

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--apply", action="store_true", help="thực sự xoá")
    args = ap.parse_args()

    ec2 = boto3.client("ec2")
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    deleted = skipped = 0

    paginator = ec2.get_paginator("describe_snapshots")
    for page in paginator.paginate(
        OwnerIds=["self"],
        Filters=[{"Name": "tag:ManagedBy", "Values": ["backup-script"]}],
    ):
        for snap in page["Snapshots"]:
            if snap["StartTime"] >= cutoff:
                continue
            sid = snap["SnapshotId"]
            if not args.apply:
                print(f"[DRY-RUN] sẽ xoá {sid} ({snap['StartTime']:%Y-%m-%d})")
                continue
            try:
                ec2.delete_snapshot(SnapshotId=sid)
                deleted += 1
            except ClientError as e:
                if e.response["Error"]["Code"] == "InvalidSnapshot.InUse":
                    skipped += 1   # đang được AMI dùng — bỏ qua, không fail
                else:
                    raise
    print(f"Xoá: {deleted}, bỏ qua (đang dùng): {skipped}")

if __name__ == "__main__":
    main()
```

Điểm đáng học: chỉ đụng snapshot **có tag** `ManagedBy=backup-script` (không bao giờ xoá theo "tất cả những gì cũ"), dry-run là mặc định, chạy lại nhiều lần cho cùng kết quả.

### 3.6 Script thật #2: quét tag thiếu trên nhiều region

```python
import boto3

REQUIRED = {"Env", "Owner", "CostCenter"}

regions = [r["RegionName"] for r in boto3.client("ec2").describe_regions()["Regions"]]
for region in regions:
    ec2 = boto3.client("ec2", region_name=region)
    for page in ec2.get_paginator("describe_instances").paginate():
        for res in page["Reservations"]:
            for inst in res["Instances"]:
                tags = {t["Key"] for t in inst.get("Tags", [])}
                missing = REQUIRED - tags
                if missing:
                    print(f"{region}\t{inst['InstanceId']}\tthiếu: {','.join(sorted(missing))}")
```

### 3.7 Script thật #3: báo cáo chi phí theo service (Cost Explorer)

```python
import boto3
from datetime import date, timedelta

ce = boto3.client("ce", region_name="us-east-1")
end = date.today().replace(day=1)
start = (end - timedelta(days=1)).replace(day=1)   # tháng trước

resp = ce.get_cost_and_usage(
    TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
    Granularity="MONTHLY",
    Metrics=["UnblendedCost"],
    GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
)
rows = resp["ResultsByTime"][0]["Groups"]
rows.sort(key=lambda g: float(g["Metrics"]["UnblendedCost"]["Amount"]), reverse=True)
for g in rows[:10]:
    amount = float(g["Metrics"]["UnblendedCost"]["Amount"])
    print(f"{amount:>10.2f} USD  {g['Keys'][0]}")
```

## 4. Khi nào Bash đủ, khi nào chuyển Python?

| Tiêu chí | Bash + AWS CLI + jq | Python + boto3 |
|---|---|---|
| Độ dài | < ~100 dòng | Bất kỳ |
| Logic | Tuyến tính: gọi API → lọc → in/xoá | Phân nhánh, retry, state, tính toán |
| Cấu trúc dữ liệu | 1-2 cấp JSON | Lồng sâu, join nhiều nguồn |
| Error handling | Exit code là đủ | Cần phân biệt từng loại lỗi |
| Song song | `xargs -P` đơn giản | `concurrent.futures`, kiểm soát rate |
| Test | Khó | `pytest` + `moto`/`botocore stubber` |
| Glue nhanh trong CI/CD, một lần dùng | ✅ | quá nặng |
| Chạy định kỳ trong production | rủi ro | ✅ |

> 💡 **Ghi nhớ:** Quy tắc thực dụng — khi bạn bắt đầu viết `if/else` lồng 3 cấp, parse JSON bằng 2 lần `jq` nối nhau, hoặc cần retry logic trong Bash: đó là tín hiệu chuyển sang Python. Chi phí viết lại lúc đó rẻ hơn chi phí debug Bash 300 dòng lúc 2 giờ sáng.

## 5. Idempotency cho script vận hành

Script vận hành tốt = chạy 1 lần hay 10 lần đều cho cùng trạng thái cuối. Nguyên tắc:

1. **Kiểm tra trước khi tạo** — "tồn tại chưa? rồi thì bỏ qua", hoặc dùng API vốn idempotent (`put_*` thường ghi đè an toàn, `create_*` thường không).
2. **Dùng client token** khi API hỗ trợ: `ec2 run-instances --client-token`, nhiều API `Create*` có `ClientRequestToken` — gọi lại với cùng token không tạo bản sao.
3. **Chọn theo tag/định danh, không theo "tất cả"** — script xoá chỉ đụng resource nó quản lý.
4. **Dry-run mặc định, `--apply` mới hành động** — như script snapshot ở trên.
5. **Hành động hội tụ về trạng thái mong muốn** thay vì "thực hiện thao tác": "đảm bảo tag X tồn tại" thay vì "thêm tag X" (chạy 2 lần không tạo tag trùng/lỗi).
6. **Lock chống chạy chồng**: `flock` trong Bash khi script chạy bằng cron:

```bash
exec 9>/var/lock/cleanup.lock
flock -n 9 || { echo "Đang có instance khác chạy, thoát."; exit 0; }
```

> ⚠️ **Lỗi thường gặp:** Script "tăng dần" — ví dụ mỗi lần chạy append một rule vào security group mà không kiểm tra rule đã có. Sau 30 ngày cron, bạn có 30 rule trùng và chạm limit. Luôn nghĩ: "lần chạy thứ 2 sẽ làm gì?"

## Liên hệ sang AWS

Mọi pattern trong bài đều có "phiên bản managed" trên AWS — đây là điều examiner SAA và khách hàng thật đều hỏi:

- **cron / systemd timer → EventBridge Scheduler + Lambda.** Thay vì nuôi một EC2 chỉ để chạy crontab (single point of failure, phải vá OS), đưa script Python vào Lambda và đặt lịch bằng EventBridge Scheduler (hỗ trợ cron expression, timezone, retry, dead-letter queue, one-time schedule). Script dọn snapshot ở mục 3.5 chuyển thành Lambda gần như nguyên xi — boto3 có sẵn trong runtime.
- **SSH + chạy script trên fleet → SSM Run Command.** Thay vì `for host in ...; do ssh ...` qua bastion, dùng `aws ssm send-command --document-name AWS-RunShellScript --targets Key=tag:Env,Values=prod` — không cần mở port 22, có log tập trung, rate control và output về S3.
- **Runbook nhiều bước → SSM Automation.** Quy trình "snapshot → vá → reboot → verify" viết tay trong Bash trở thành Automation document có approval step, rollback và audit trail.
- **Idempotency & retry tự viết → Step Functions.** Khi script Python của bạn bắt đầu có "bước 1 xong mới đến bước 2, fail thì retry 3 lần", đó chính là state machine — Step Functions làm việc này declarative, kèm visual debug.
- **Báo cáo tag thiếu tự viết → AWS Config rules + Tag Policies** (Organizations) làm việc này liên tục thay vì theo lịch.

Kỹ năng script không mất đi khi lên managed service — Lambda handler của bạn vẫn là boto3 + paginator + ClientError handling y như mục 3. Bạn chỉ đổi "ai gọi script" từ cron sang EventBridge.

**Bài tập về nhà:** Viết script (Bash hoặc Python tuỳ bạn chọn — và giải thích vì sao chọn) liệt kê mọi security group có rule mở `0.0.0.0/0` trên port 22, in ra dạng TSV gồm region, group-id, group-name. Sau đó nâng cấp: thêm `--apply` để revoke rule đó, đảm bảo idempotent.
