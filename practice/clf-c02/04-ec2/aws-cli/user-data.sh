#!/bin/bash
# Cloud-init user-data: cài nginx + serve trang chào
dnf install -y nginx
systemctl enable --now nginx

TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
IID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/availability-zone)

cat > /usr/share/nginx/html/index.html <<EOF
<!doctype html>
<html><body>
<h1>Hello from AWS!</h1>
<p>Instance: $IID</p>
<p>AZ: $AZ</p>
<p>Booted at $(date)</p>
</body></html>
EOF
