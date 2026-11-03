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

<svg viewBox="0 0 520 430" role="img" aria-labelledby="eng01-tree-t eng01-tree-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng01-tree-t">Cây thư mục Linux</title>
<desc id="eng01-tree-d">Mọi nhánh bắt đầu ở /. /var/log là con của /var; /usr/bin và /usr/local/bin thuộc /usr.</desc>
<text x="18" y="25" font-size="14" text-anchor="start" fill="currentColor">Một gốc / — đường nối biểu thị thư mục cha</text><rect x="18" y="42" width="65" height="32" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="50" y="64" font-size="18" text-anchor="middle" fill="currentColor">/</text><path d="M50 74 L50 105" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 105 L110 105" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="110" font-size="14" text-anchor="start" fill="currentColor">/etc</text><path d="M50 74 L50 139" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 139 L110 139" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="144" font-size="14" text-anchor="start" fill="currentColor">/var</text><path d="M175 139 L245 139" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="144" font-size="14" text-anchor="start" fill="currentColor">/var/log</text><path d="M50 74 L50 173" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 173 L110 173" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="178" font-size="14" text-anchor="start" fill="currentColor">/proc</text><path d="M50 74 L50 207" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 207 L110 207" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="212" font-size="14" text-anchor="start" fill="currentColor">/home</text><path d="M50 74 L50 241" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 241 L110 241" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="246" font-size="14" text-anchor="start" fill="currentColor">/root</text><path d="M50 74 L50 275" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 275 L110 275" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="280" font-size="14" text-anchor="start" fill="currentColor">/tmp</text><path d="M50 74 L50 309" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 309 L110 309" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="314" font-size="14" text-anchor="start" fill="currentColor">/usr</text><path d="M175 309 L245 309" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="314" font-size="14" text-anchor="start" fill="currentColor">/usr/bin</text><path d="M220 309 L220 335" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M220 335 L245 335" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="255" y="340" font-size="14" text-anchor="start" fill="currentColor">/usr/local/bin</text><path d="M50 74 L50 343" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 343 L110 343" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="348" font-size="14" text-anchor="start" fill="currentColor">/opt</text><path d="M50 74 L50 377" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M50 377 L110 377" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="120" y="382" font-size="14" text-anchor="start" fill="currentColor">/dev</text>
</svg>

```bash
# Thử ngay: xem dung lượng đĩa và RAM
df -h          # disk theo filesystem
free -h        # RAM và swap
lsblk          # liệt kê block device (EBS volume hiện ở đây)
```

> Ghi nhớ: `/proc` và `/sys` không phải file thật trên đĩa — chúng là cửa sổ nhìn vào kernel. `cat /proc/uptime` đọc trực tiếp từ kernel, không tốn I/O đĩa.

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

> Lỗi thường gặp: `rm -rf` với biến chưa gán — `rm -rf $APP_DIR/` khi `$APP_DIR` rỗng sẽ thành `rm -rf /`. Trong script luôn dùng `rm -rf "${APP_DIR:?}/"` để bash báo lỗi nếu biến rỗng.

## 3. Permissions — rwx, chmod, chown, sudo

Mỗi file có 3 nhóm quyền cho 3 đối tượng: **u**ser (chủ sở hữu), **g**roup, **o**ther.

```
-rwxr-x r--  1 ec2-user ec2-user 1234 Jun 11 10:00 deploy.sh
 │└┬┘└┬┘└┬┘
 │ u   g  o      u=rwx (7), g=r-x (5), o=r-- (4)  → 754
 └ loại file: - thường, d thư mục, l symlink
```

<svg viewBox="0 0 520 238" role="img" aria-labelledby="eng01-perm-t eng01-perm-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng01-perm-t">Chín bit quyền của chmod 755</title>
<desc id="eng01-perm-d">Ba nhóm user group other, mỗi nhóm r w x với trọng số 4 2 1. 755 bật rwx, r-x, r-x.</desc>
<text x="18" y="26" font-size="14" text-anchor="start" fill="currentColor">755 = 7 | 5 | 5 — mỗi nhóm gồm ba bit</text><text x="90" y="60" font-size="14" text-anchor="middle" fill="currentColor">user</text><rect x="18" y="77" width="44" height="42" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="40" y="104" font-size="18" text-anchor="middle" fill="currentColor">r</text><text x="40" y="143" font-size="14" text-anchor="middle" fill="currentColor">4</text><rect x="66" y="77" width="44" height="42" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="88" y="104" font-size="18" text-anchor="middle" fill="currentColor">w</text><text x="88" y="143" font-size="14" text-anchor="middle" fill="currentColor">2</text><rect x="114" y="77" width="44" height="42" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="136" y="104" font-size="18" text-anchor="middle" fill="currentColor">x</text><text x="136" y="143" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="90" y="178" font-size="14" text-anchor="middle" fill="currentColor">4 + 2 + 1 = 7</text><text x="258" y="60" font-size="14" text-anchor="middle" fill="currentColor">group</text><rect x="186" y="77" width="44" height="42" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="208" y="104" font-size="18" text-anchor="middle" fill="currentColor">r</text><text x="208" y="143" font-size="14" text-anchor="middle" fill="currentColor">4</text><rect x="234" y="77" width="44" height="42" rx="4" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="256" y="104" font-size="18" text-anchor="middle" fill="currentColor">-</text><text x="256" y="143" font-size="14" text-anchor="middle" fill="currentColor">0</text><rect x="282" y="77" width="44" height="42" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="304" y="104" font-size="18" text-anchor="middle" fill="currentColor">x</text><text x="304" y="143" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="258" y="178" font-size="14" text-anchor="middle" fill="currentColor">4 + 0 + 1 = 5</text><text x="426" y="60" font-size="14" text-anchor="middle" fill="currentColor">other</text><rect x="354" y="77" width="44" height="42" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="376" y="104" font-size="18" text-anchor="middle" fill="currentColor">r</text><text x="376" y="143" font-size="14" text-anchor="middle" fill="currentColor">4</text><rect x="402" y="77" width="44" height="42" rx="4" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="424" y="104" font-size="18" text-anchor="middle" fill="currentColor">-</text><text x="424" y="143" font-size="14" text-anchor="middle" fill="currentColor">0</text><rect x="450" y="77" width="44" height="42" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="472" y="104" font-size="18" text-anchor="middle" fill="currentColor">x</text><text x="472" y="143" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="426" y="178" font-size="14" text-anchor="middle" fill="currentColor">4 + 0 + 1 = 5</text><text x="18" y="215" font-size="14" text-anchor="start" fill="currentColor">Ô tô màu: quyền bật; ô nét đứt: quyền tắt.</text>
</svg>

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

> Ghi nhớ: SSH từ chối hoạt động nếu private key có quyền quá rộng — lỗi kinh điển `WARNING: UNPROTECTED PRIVATE KEY FILE!`. Sửa bằng `chmod 400 my-key.pem`.

> Lỗi thường gặp: với **thư mục**, `x` nghĩa là "được đi vào" (cd), không phải execute. Thư mục có `r` mà không có `x` thì liệt kê được tên file nhưng không mở được file.

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

> Lỗi thường gặp: quen tay `kill -9` ngay. SIGKILL không cho ứng dụng flush dữ liệu, đóng connection, xoá lock file — dễ gây hỏng dữ liệu. ECS/Kubernetes cũng theo logic này: gửi SIGTERM, chờ hết grace period (ECS `stopTimeout`, mặc định 30s) rồi mới SIGKILL.

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

> Ghi nhớ: `start` ≠ `enable`. `start` chạy ngay bây giờ; `enable` đăng ký chạy khi boot. Instance trong Auto Scaling group bị thay thế thường xuyên — quên `enable` thì instance mới lên sẽ không chạy app. Đây là bug user data phổ biến nhất.

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

SSH dùng cặp khoá: **private key** giữ ở máy bạn, **public key** nằm trong `~/.ssh/authorized_keys` trên server. Không bao giờ private key rời khỏi laptop — server chỉ ra một "đố" (challenge), client ký bằng private key, server kiểm chữ ký bằng public key tương ứng.

<step-flow>
<svg viewBox="0 0 720 452" role="img" aria-labelledby="e01s-t e01s-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="e01s-t">Xác thực SSH bằng cặp khoá: challenge và chữ ký</title>
<desc id="e01s-d">Laptop giữ private key ~/.ssh/id_ed25519, EC2 giữ public key trong ~/.ssh/authorized_keys. Bốn bước: client xin vào và nêu key muốn dùng, server gửi challenge là số ngẫu nhiên, client ký challenge bằng private key ngay trên laptop rồi gửi chữ ký, server kiểm chữ ký bằng public key và cho vào. Private key không bao giờ rời laptop, chỉ chữ ký đi qua mạng. Quyền file key phải là 400.</desc>
<defs>
<marker id="e01s-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
</defs>
<text x="20" y="26" font-size="15" font-weight="700" fill="currentColor">Xác thực SSH bằng cặp khoá (key-based auth)</text>
<rect x="20" y="42" width="280" height="84" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
<text x="160" y="66" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Laptop (client)</text>
<rect x="36" y="80" width="248" height="34" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
<text x="48" y="102" font-size="13" font-weight="700" fill="currentColor">PRIVATE</text>
<text x="122" y="102" font-size="13" fill="currentColor">~/.ssh/id_ed25519</text>
<rect x="420" y="42" width="280" height="84" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
<text x="560" y="66" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">EC2 (server)</text>
<rect x="436" y="80" width="248" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
<text x="448" y="102" font-size="13" font-weight="700" fill="currentColor">PUBLIC</text>
<text x="512" y="102" font-size="13" fill="currentColor">~/.ssh/authorized_keys</text>
<line x1="160" y1="126" x2="160" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<line x1="560" y1="126" x2="560" y2="372" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<g data-step="1">
<text x="360" y="155" text-anchor="middle" font-size="13" fill="currentColor">1  "Tôi muốn vào, dùng key này"</text>
<line x1="160" y1="164" x2="556" y2="164" stroke="currentColor" stroke-opacity="0.6" stroke-width="2" marker-end="url(#e01s-arrow)"/>
</g>
<g data-step="2">
<text x="360" y="201" text-anchor="middle" font-size="13" fill="currentColor">2  Challenge (số ngẫu nhiên)</text>
<line x1="560" y1="210" x2="164" y2="210" stroke="currentColor" stroke-opacity="0.6" stroke-width="2" marker-end="url(#e01s-arrow)"/>
</g>
<g data-step="3">
<text x="360" y="283" text-anchor="middle" font-size="13" fill="currentColor">3  Gửi CHỮ KÝ (không gửi key)</text>
<line x1="160" y1="292" x2="556" y2="292" stroke="#10b981" stroke-width="2" marker-end="url(#e01s-arrow)"/>
<rect x="40" y="226" width="240" height="30" rx="7" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-opacity="0.6"/>
<text x="160" y="246" text-anchor="middle" font-size="13" fill="currentColor">ký challenge bằng private key</text>
</g>
<g data-step="4">
<text x="360" y="355" text-anchor="middle" font-size="13" fill="currentColor">4  Chữ ký khớp → cho vào shell</text>
<line x1="560" y1="364" x2="164" y2="364" stroke="currentColor" stroke-opacity="0.6" stroke-width="2" marker-end="url(#e01s-arrow)"/>
<rect x="440" y="306" width="240" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6" stroke-opacity="0.6"/>
<text x="560" y="326" text-anchor="middle" font-size="13" fill="currentColor">kiểm chữ ký bằng public key</text>
</g>
<rect x="20" y="386" width="680" height="54" rx="8" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
<text x="360" y="408" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Private key KHÔNG BAO GIỜ rời laptop: chỉ chữ ký đi qua mạng.</text>
<text x="360" y="429" font-size="13" text-anchor="middle" fill="currentColor">Quyền file key phải là 400 (chmod 400).</text>
</svg>
<step-note data-step="1">Client nêu public key định dùng; server tra <code>~/.ssh/authorized_keys</code> xem key đó có được phép không. Chưa có gì bí mật đi qua mạng.</step-note>
<step-note data-step="2">Challenge là số ngẫu nhiên mới cho mỗi lần đăng nhập, nên một chữ ký nghe lén từ lần trước không dùng lại được.</step-note>
<step-note data-step="3">Việc ký diễn ra ngay trên laptop; thứ rời máy chỉ là chữ ký của đúng challenge này. Private key nằm yên trong <code>~/.ssh/id_ed25519</code>.</step-note>
<step-note data-step="4">Chỉ private key ghép cặp mới tạo được chữ ký mà public key kiểm ra là đúng, nên server không cần giữ bí mật nào. Ngược lại, ai có file private key là vào được: vì vậy quyền file phải là <code>400</code>.</step-note>
</step-flow>

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

> Lỗi thường gặp: `Permission denied (publickey)` thường do (1) sai user (`ec2-user` vs `ubuntu`), (2) sai key, (3) quyền key chưa phải 400. Thêm `-v` để SSH in ra nó đang thử key nào.

## 7. Package manager — dnf / apt

| Việc | AL2023 / RHEL (dnf) | Ubuntu / Debian (apt) |
|---|---|---|
| Cập nhật danh mục | `sudo dnf check-update` | `sudo apt update` |
| Nâng cấp gói | `sudo dnf upgrade -y` | `sudo apt upgrade -y` |
| Cài | `sudo dnf install -y nginx` | `sudo apt install -y nginx` |
| Gỡ | `sudo dnf remove nginx` | `sudo apt remove nginx` |
| Tìm | `dnf search nginx` | `apt search nginx` |

> Ghi nhớ: Amazon Linux 2023 dùng **dnf** (kế nhiệm yum; gõ `yum` vẫn chạy vì là alias). AL2023 còn có cơ chế *deterministic upgrades* — repository được "đóng băng" theo phiên bản, giúp các instance trong fleet cài đúng cùng một bộ gói. Amazon Linux 2 đã hết hỗ trợ chuẩn (EOL 30/06/2026) — dự án mới hãy dùng AL2023.

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

> Lỗi thường gặp: `uniq` chỉ gộp các dòng **liền kề** giống nhau, nên luôn phải `sort` trước `uniq`.

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

> Ghi nhớ: khi logic vượt quá ~50 dòng bash hoặc cần gọi API AWS phức tạp, chuyển sang Python + **boto3** (AWS SDK for Python). Ý tưởng: thay vì `aws ec2 describe-instances` rồi vật lộn parse text, boto3 trả về dict Python — lọc, lặp, retry, xử lý lỗi đều tự nhiên hơn. Bash để "dán" lệnh, Python để viết logic.

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
