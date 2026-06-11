# Linux & Terminal cho kỹ sư Cloud

Hơn 90% workload trên AWS chạy Linux. Khi bạn SSH vào một EC2 instance để debug, viết user data script, hay đọc log qua SSM Session Manager — tất cả đều là kỹ năng terminal. Bài này gom đủ những gì một kỹ sư Cloud cần dùng hằng ngày, với lệnh chạy thử được ngay trên Amazon Linux 2023 (AL2023) hoặc Ubuntu.

## 1. Filesystem hierarchy — bản đồ hệ thống

Linux tổ chức mọi thứ thành một cây duy nhất bắt đầu từ `/`. Bạn không cần thuộc hết, chỉ cần biết "đồ gì nằm ở đâu":

| Thư mục | Chứa gì | Tình huống Cloud hay gặp |
|---|---|---|
| `/etc` | File cấu hình hệ thống | `/etc/ssh/sshd_config`, `/etc/nginx/nginx.conf` |
| `/var` | Dữ liệu thay đổi: log, cache, spool | `/var/log/` — nơi đầu tiên cần xem khi debug |
| `/var/log` | Log hệ thống và ứng dụng | `cloud-init.log`, `messages`, `nginx/access.log` |
| `/proc` | Filesystem ảo — thông tin kernel/process | `cat /proc/meminfo`, `cat /proc/cpuinfo` |
| `/home` | Thư mục người dùng | `/home/ec2-user` trên AL2023 |
| `/root` | Home của user root | Khác `/` nhé! |
| `/tmp` | File tạm, thường bị xoá khi reboot | Lambda cũng cho ghi vào `/tmp` (tối đa 10 GB) |
| `/usr/bin`, `/usr/local/bin` | Binary chương trình | `which aws` thường ra `/usr/local/bin/aws` |
| `/opt` | Phần mềm bên thứ ba tự cài | CloudWatch agent cài vào `/opt/aws/amazon-cloudwatch-agent` |
| `/dev` | Device file | `/dev/xvda`, `/dev/nvme0n1` — EBS volume |

```bash
# Thử ngay: xem dung lượng đĩa và RAM
df -h          # disk theo filesystem
free -h        # RAM và swap
lsblk          # liệt kê block device (EBS volume hiện ở đây)
```

> 💡 Ghi nhớ: `/proc` và `/sys` không phải file thật trên đĩa — chúng là cửa sổ nhìn vào kernel. `cat /proc/uptime` đọc trực tiếp từ kernel, không tốn I/O đĩa.

## 2. Điều hướng & thao tác file

```bash
pwd                     # đang đứng ở đâu
ls -lah                 # liệt kê chi tiết, gồm file ẩn, size dễ đọc
cd /var/log && cd -     # cd - quay lại thư mục trước đó
mkdir -p app/logs/2026  # -p tạo cả cây thư mục
cp -r src/ backup/      # -r để copy thư mục
mv old.conf old.conf.bak
rm -rf build/           # cẩn thận: xoá không hỏi, không có thùng rác
find /var/log -name "*.log" -mtime -1   # file .log sửa trong 24h qua
du -sh /var/log/*       # thư mục nào ngốn đĩa
```

Xem nội dung file:

```bash
cat file.txt            # in toàn bộ — chỉ dùng cho file nhỏ
less /var/log/messages  # xem theo trang: /từ_khoá để tìm, q để thoát
head -n 20 app.log      # 20 dòng đầu
tail -n 50 app.log      # 50 dòng cuối
tail -f app.log         # theo dõi realtime — lệnh debug số 1
```

> ⚠️ Lỗi thường gặp: `rm -rf` với biến chưa gán — `rm -rf $APP_DIR/` khi `$APP_DIR` rỗng sẽ thành `rm -rf /`. Trong script luôn dùng `rm -rf "${APP_DIR:?}/"` để bash báo lỗi nếu biến rỗng.

## 3. Permissions — rwx, chmod, chown, sudo

Mỗi file có 3 nhóm quyền cho 3 đối tượng: **u**ser (chủ sở hữu), **g**roup, **o**ther.

```
-rwxr-x r--  1 ec2-user ec2-user 1234 Jun 11 10:00 deploy.sh
 │└┬┘└┬┘└┬┘
 │ u   g  o      u=rwx (7), g=r-x (5), o=r-- (4)  → 754
 └ loại file: - thường, d thư mục, l symlink
```

Tính nhanh số octal: **r=4, w=2, x=1**, cộng lại.

| Octal | Quyền | Dùng cho |
|---|---|---|
| `755` | rwxr-xr-x | Script, thư mục public |
| `644` | rw-r--r-- | File config, file thường |
| `600` | rw------- | File chứa secret, credentials |
| `400` | r-------- | **SSH private key (.pem)** — bắt buộc |

```bash
chmod +x deploy.sh            # thêm quyền execute
chmod 600 ~/.ssh/id_ed25519   # khoá private key
chown ec2-user:ec2-user app/  # đổi chủ sở hữu
chown -R nginx:nginx /var/www # -R đệ quy cả cây
sudo systemctl restart nginx  # chạy lệnh với quyền root
sudo -i                       # mở shell root (cẩn trọng)
```

> 💡 Ghi nhớ: SSH từ chối hoạt động nếu private key có quyền quá rộng — lỗi kinh điển `WARNING: UNPROTECTED PRIVATE KEY FILE!`. Sửa bằng `chmod 400 my-key.pem`.

> ⚠️ Lỗi thường gặp: với **thư mục**, `x` nghĩa là "được đi vào" (cd), không phải execute. Thư mục có `r` mà không có `x` thì liệt kê được tên file nhưng không mở được file.

## 4. Process — ps, top, kill, signals

```bash
ps aux                       # tất cả process
ps aux | grep nginx          # lọc theo tên
top                          # realtime; bấm M sort theo RAM, P theo CPU, q thoát
htop                         # đẹp hơn (AL2023: sudo dnf install -y htop)
pgrep -f gunicorn            # lấy PID theo tên
```

Gửi signal cho process:

| Lệnh | Signal | Ý nghĩa |
|---|---|---|
| `kill PID` | SIGTERM (15) | Yêu cầu thoát êm — process được dọn dẹp. **Luôn thử trước** |
| `kill -9 PID` | SIGKILL (9) | Giết ngay, không cho dọn dẹp — phương án cuối |
| `kill -HUP PID` | SIGHUP (1) | Nhiều daemon hiểu là "reload config" |
| Ctrl+C | SIGINT (2) | Ngắt process foreground |

```bash
# Tìm process chiếm port 8080 rồi tắt
sudo lsof -i :8080
sudo kill $(sudo lsof -t -i :8080)
```

> ⚠️ Lỗi thường gặp: quen tay `kill -9` ngay. SIGKILL không cho ứng dụng flush dữ liệu, đóng connection, xoá lock file — dễ gây hỏng dữ liệu. ECS/Kubernetes cũng theo logic này: gửi SIGTERM, chờ hết grace period (ECS `stopTimeout`, mặc định 30s) rồi mới SIGKILL.

## 5. systemd — systemctl & journalctl

Mọi distro lớn hiện nay (AL2023, Ubuntu, RHEL) đều dùng systemd để quản lý service.

```bash
sudo systemctl status nginx     # đang chạy? PID? log gần nhất?
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx    # tắt rồi bật lại
sudo systemctl reload nginx     # nạp lại config, không downtime (nếu hỗ trợ)
sudo systemctl enable nginx     # tự khởi động khi boot — QUAN TRỌNG
sudo systemctl enable --now nginx  # enable + start một lệnh
systemctl list-units --type=service --state=running
```

Đọc log của service bằng journalctl:

```bash
journalctl -u nginx                  # toàn bộ log của unit nginx
journalctl -u nginx -f               # theo dõi realtime (như tail -f)
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx -p err           # chỉ mức error trở lên
journalctl -b                        # log từ lần boot này
```

> 💡 Ghi nhớ: `start` ≠ `enable`. `start` chạy ngay bây giờ; `enable` đăng ký chạy khi boot. Instance trong Auto Scaling group bị thay thế thường xuyên — quên `enable` thì instance mới lên sẽ không chạy app. Đây là bug user data phổ biến nhất.

Một unit file tối giản (`/etc/systemd/system/myapp.service`):

```ini
[Unit]
Description=My App
After=network.target

[Service]
User=ec2-user
ExecStart=/usr/bin/python3 /home/ec2-user/app/main.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Sau khi tạo/sửa unit file: `sudo systemctl daemon-reload`.

## 6. SSH — key-based auth, ssh-agent, scp

SSH dùng cặp khoá: **private key** giữ ở máy bạn, **public key** nằm trong `~/.ssh/authorized_keys` trên server.

```bash
# Tạo cặp khoá (ed25519 là chuẩn hiện nay, thay cho RSA cũ)
ssh-keygen -t ed25519 -C "dan@laptop"

# Kết nối EC2 (AL2023 user mặc định là ec2-user; Ubuntu là ubuntu)
ssh -i my-key.pem ec2-user@ec2-3-1-2-3.ap-southeast-1.compute.amazonaws.com

# ssh-agent: nạp key một lần, khỏi gõ -i và passphrase mỗi lần
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
ssh-add -l                    # liệt kê key đã nạp

# Copy file hai chiều
scp -i my-key.pem app.tar.gz ec2-user@1.2.3.4:/home/ec2-user/
scp -i my-key.pem ec2-user@1.2.3.4:/var/log/app.log ./
```

File `~/.ssh/config` giúp gõ ngắn:

```
Host web1
    HostName 3.1.2.3
    User ec2-user
    IdentityFile ~/.ssh/my-key.pem
```

Sau đó chỉ cần `ssh web1`, `scp app.tar.gz web1:~/`.

> ⚠️ Lỗi thường gặp: `Permission denied (publickey)` thường do (1) sai user (`ec2-user` vs `ubuntu`), (2) sai key, (3) quyền key chưa phải 400. Thêm `-v` để SSH in ra nó đang thử key nào.

## 7. Package manager — dnf / apt

| Việc | AL2023 / RHEL (dnf) | Ubuntu / Debian (apt) |
|---|---|---|
| Cập nhật danh mục | `sudo dnf check-update` | `sudo apt update` |
| Nâng cấp gói | `sudo dnf upgrade -y` | `sudo apt upgrade -y` |
| Cài | `sudo dnf install -y nginx` | `sudo apt install -y nginx` |
| Gỡ | `sudo dnf remove nginx` | `sudo apt remove nginx` |
| Tìm | `dnf search nginx` | `apt search nginx` |

> 💡 Ghi nhớ: Amazon Linux 2023 dùng **dnf** (kế nhiệm yum; gõ `yum` vẫn chạy vì là alias). AL2023 còn có cơ chế *deterministic upgrades* — repository được "đóng băng" theo phiên bản, giúp các instance trong fleet cài đúng cùng một bộ gói. Amazon Linux 2 đã hết hỗ trợ chuẩn (EOL 30/06/2026) — dự án mới hãy dùng AL2023.

Trong script tự động (user data) luôn thêm `-y` để không bị treo chờ xác nhận.

## 8. Pipes, redirection & bộ ba grep / awk / sed

Triết lý Unix: mỗi lệnh làm một việc, nối với nhau bằng pipe `|`.

```bash
# Redirection
echo "hello" > out.txt        # ghi đè
echo "again" >> out.txt       # ghi nối
./deploy.sh > deploy.log 2>&1 # gom cả stdout lẫn stderr vào file
./noisy.sh 2>/dev/null        # vứt bỏ stderr

# grep — lọc dòng
grep "ERROR" app.log                  # dòng chứa ERROR
grep -i "error" app.log               # không phân biệt hoa thường
grep -rn "TODO" src/                  # tìm đệ quy, in số dòng
grep -c "500" access.log              # đếm số dòng khớp
grep -v "healthcheck" access.log      # LOẠI các dòng khớp

# awk — cắt cột
awk '{print $1}' access.log           # cột 1 (IP client)
awk '$9 == 500 {print $7}' access.log # URL của các request lỗi 500

# sed — thay thế
sed 's/staging/production/g' config.yml          # in ra, không sửa file
sed -i 's/listen 80/listen 8080/' nginx.conf     # -i sửa trực tiếp file
```

Ví dụ tổng hợp kinh điển — top 5 IP gọi nhiều nhất trong access log:

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5
```

```
   4821 10.0.1.55
   1203 10.0.2.18
    877 203.0.113.9
    402 10.0.1.7
     98 198.51.100.3
```

Đọc từ phải sang trái khi giải thích pipeline: lấy 5 dòng đầu ← sort giảm dần theo số đếm ← đếm số lần xuất hiện ← sort (uniq cần input đã sort) ← lấy cột IP.

> ⚠️ Lỗi thường gặp: `uniq` chỉ gộp các dòng **liền kề** giống nhau, nên luôn phải `sort` trước `uniq`.

## 9. Bash scripting căn bản

```bash
#!/bin/bash
set -euo pipefail   # thoát khi có lỗi, biến chưa gán, lỗi giữa pipe

APP_NAME="myapp"
LOG_DIR="/var/log/${APP_NAME}"

# Điều kiện
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    echo "Đã tạo $LOG_DIR"
fi

# Vòng lặp
for env in dev staging prod; do
    echo "Deploy tới $env..."
done

# Đọc tham số dòng lệnh: ./script.sh prod
TARGET="${1:-dev}"   # mặc định dev nếu không truyền

# Exit code: 0 = thành công, khác 0 = lỗi
if curl -sf http://localhost:8080/health > /dev/null; then
    echo "Service OK"
else
    echo "Service lỗi, exit code: $?"
    exit 1
fi
```

Quy tắc sống còn:

- `$?` là exit code của lệnh vừa chạy; `0` = thành công. Cú pháp `cmd1 && cmd2` chỉ chạy cmd2 nếu cmd1 thành công; `cmd1 || cmd2` chạy cmd2 khi cmd1 thất bại.
- **Luôn đặt biến trong nháy kép**: `"$FILE"` chứ không `$FILE` — tránh vỡ khi giá trị có dấu cách.
- `set -euo pipefail` ở đầu mọi script — script chết sớm còn hơn chạy tiếp trong trạng thái sai.

> 💡 Ghi nhớ: khi logic vượt quá ~50 dòng bash hoặc cần gọi API AWS phức tạp, chuyển sang Python + **boto3** (AWS SDK for Python). Ý tưởng: thay vì `aws ec2 describe-instances` rồi vật lộn parse text, boto3 trả về dict Python — lọc, lặp, retry, xử lý lỗi đều tự nhiên hơn. Bash để "dán" lệnh, Python để viết logic.

```python
# Mức ý tưởng: liệt kê instance đang chạy bằng boto3
import boto3
ec2 = boto3.client("ec2")
resp = ec2.describe_instances(
    Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
)
for r in resp["Reservations"]:
    for i in r["Instances"]:
        print(i["InstanceId"], i["InstanceType"])
```

## 10. Bảng tra nhanh

| Cần làm gì | Lệnh |
|---|---|
| Theo dõi log realtime | `tail -f file.log` hoặc `journalctl -u svc -f` |
| Đĩa đầy ở đâu? | `df -h` rồi `du -sh /var/* \| sort -rh \| head` |
| Process nào ăn CPU/RAM? | `top` (M/P để sort) |
| Port 8080 ai chiếm? | `sudo lsof -i :8080` |
| Service chạy khi boot | `sudo systemctl enable --now svc` |
| Khoá quyền key SSH | `chmod 400 key.pem` |
| Đếm lỗi trong log | `grep -c "ERROR" app.log` |
| Gom stdout+stderr vào file | `cmd > out.log 2>&1` |

## Liên hệ sang AWS

**EC2 user data** — chính là một bash script chạy bằng root khi instance khởi động lần đầu. Mọi kỹ năng ở trên hội tụ tại đây:

```bash
#!/bin/bash
dnf upgrade -y
dnf install -y nginx
systemctl enable --now nginx
echo "Deployed $(date)" > /usr/share/nginx/html/index.html
```

Debug user data thất bại? SSH/SSM vào và đọc `/var/log/cloud-init-output.log` — câu hỏi troubleshooting quen thuộc trong đề SAA/DVA. Nhớ: user data mặc định **chỉ chạy ở lần boot đầu tiên**, chạy với quyền root, và không cần `sudo` bên trong.

**SSM Session Manager thay SSH** — best practice hiện nay: không mở port 22, không quản lý key. Instance chỉ cần SSM Agent (cài sẵn trên AL2023) và IAM role có policy `AmazonSSMManagedInstanceCore`. Bạn vào shell qua console hoặc `aws ssm start-session --target i-xxxx`, phiên làm việc được ghi log vào CloudTrail/CloudWatch. Đề SAA rất hay hỏi: "truy cập instance trong private subnet không có bastion, không mở inbound port" → đáp án là Session Manager.

**CloudWatch agent** — `tail -f` chỉ xem được một máy; với fleet hàng chục instance, CloudWatch agent đẩy file log (ví dụ `/var/log/nginx/access.log`) lên CloudWatch Logs và thu thêm metric mà EC2 không tự có (RAM, disk used %). Agent là một systemd service — bạn `systemctl status amazon-cloudwatch-agent` để kiểm tra y như mọi service khác. Đề thi: "cần metric memory của EC2" → mặc định không có, phải cài CloudWatch agent.

**Amazon Linux 2023** — AMI mặc định cho bài lab và nhiều câu hỏi đề thi: dùng `dnf`, systemd, user `ec2-user`, SSM Agent cài sẵn, SELinux bật ở chế độ permissive mặc định. AL2 sắp EOL (06/2026) nên tài liệu và đề thi mới đều xoay quanh AL2023.

**Signals & graceful shutdown** — kiến thức SIGTERM/SIGKILL xuất hiện lại trong ECS (`stopTimeout`), Spot Instance interruption (2 phút để dọn dẹp), và Auto Scaling lifecycle hooks: ứng dụng tốt phải bắt SIGTERM để thoát êm.

Thành thạo các lệnh trong bài này, bạn đọc hiểu được mọi user data script trong đề thi, debug được instance thật, và viết được automation đầu tiên — nền móng trực tiếp cho track SAA và DVA.
