# Cloud AppSec & Incident Response

Bài này dành cho kỹ sư xây hệ thống, không phải pentester. Mục tiêu là tư duy phòng thủ: giả định kẻ tấn công SẼ vào được, và chúng ta thiết kế để (1) làm họ tốn công, (2) phát hiện sớm, (3) giới hạn thiệt hại, (4) phục hồi nhanh. Chúng ta đi từ lớp ngoài (WAF, rate limiting) vào trong (pipeline, IAM, secure defaults), rồi sang quy trình khi sự cố đã xảy ra (incident response, postmortem, runbook).

> 💡 Nguyên tắc: An ninh không phải là một bức tường, mà là nhiều lớp (defense in depth). Một lớp bị xuyên thủng không được phép biến thành "game over".

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Defense in depth — các lớp phòng thủ từ rìa vào lõi</title>
  <desc>Các lớp đồng tâm bao quanh dữ liệu: ngoài cùng là Internet, rồi WAF và Shield, App với secure code, IAM least privilege, trong cùng là Data được mã hóa; lớp Detection (GuardDuty, CloudTrail) bao quanh toàn bộ. Một lớp bị thủng vẫn còn các lớp trong chặn.</desc>
  <text x="360" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Defense in depth — từ rìa vào lõi</text>
  <rect x="20" y="40" width="680" height="412" rx="14" fill="#10b981" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="6 4"/>
  <text x="360" y="60" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">Detection bao quanh tất cả — GuardDuty · CloudTrail</text>
  <rect x="48" y="74" width="624" height="362" rx="12" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="94" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Internet (không tin cậy)</text>
  <rect x="84" y="104" width="552" height="306" rx="11" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="124" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">WAF / Shield — rate limit · virtual patch</text>
  <rect x="120" y="134" width="480" height="246" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="154" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">App — secure code (validate, parameterized)</text>
  <rect x="156" y="164" width="408" height="186" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="184" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">IAM least privilege</text>
  <rect x="196" y="196" width="328" height="122" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="252" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Data</text>
  <text x="360" y="272" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">mã hóa at-rest + in-transit</text>
  <text x="360" y="430" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8" font-style="italic">Một lớp thủng ≠ game over — còn các lớp trong chặn tiếp</text>
</svg>

---

## 1. WAF & Rate Limiting — lớp phòng thủ ở rìa

Web Application Firewall (WAF) ngồi trước ứng dụng, kiểm tra HTTP request và chặn các pattern độc hại trước khi chúng chạm tới code của bạn. WAF KHÔNG thay thế việc viết code an toàn — nó là lớp đệm mua thời gian và chặn các đợt quét tự động (automated scanners).

### Tấn công cụ thể: credential stuffing + scraping

Kẻ tấn công có một danh sách 10 triệu cặp `email:password` rò rỉ từ site khác, và chúng thử lần lượt vào endpoint `POST /login` của bạn với tốc độ 5.000 request/giây từ 2.000 IP khác nhau (botnet). Nếu không có rate limiting, vài phần trăm tài khoản dùng lại mật khẩu sẽ bị chiếm.

WAF rule-based (chặn theo signature) không cứu được vì mỗi request trông hoàn toàn hợp lệ. Thứ cứu bạn là **rate limiting theo nhiều chiều**.

```nginx
# Trước: không giới hạn — login endpoint phơi mình
location /login {
    proxy_pass http://app;
}
```

```nginx
# Sau: rate limit theo IP + giới hạn burst
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /login {
    limit_req zone=login burst=3 nodelay;
    limit_req_status 429;
    proxy_pass http://app;
}
```

Nhưng rate limit theo IP là chưa đủ với botnet phân tán. Cần thêm các chiều khác:

| Chiều giới hạn | Chống được gì | Ví dụ ngưỡng |
|---|---|---|
| Theo IP | Brute force từ 1 nguồn | 5 login/phút |
| Theo username/account | Credential stuffing phân tán | 10 lần thử/giờ/account |
| Theo "fingerprint" thiết bị | Botnet đổi IP liên tục | — |
| Toàn cục (global) | Layer-7 DDoS | tổng RPS tới /login |

> ⚠️ Lỗ hổng: Rate limit chỉ theo IP. Botnet xoay 50.000 IP residential proxy sẽ vượt qua dễ dàng. Luôn rate limit thêm theo **account đích** (key = username) để chặn tấn công nhằm vào một tài khoản cụ thể, và dùng exponential backoff (mỗi lần sai, thời gian chờ tăng gấp đôi).

WAF còn dùng để chặn các họ tấn công trong OWASP Top 10 2021 ở mức thô: SQL injection (A03), path traversal, các payload XSS phổ biến. Đây là "virtual patching" — khi phát hiện CVE trong thư viện mà chưa kịp vá, bạn thêm WAF rule chặn pattern khai thác trong vài phút thay vì chờ deploy.

```
# Pseudo-rule: chặn path traversal trước khi sửa được code
IF request.uri CONTAINS "../" OR request.uri CONTAINS "..%2f"
THEN BLOCK, log, alert
```

---

## 2. SAST / DAST / IAST — bắt lỗi trong pipeline

Mục tiêu của "shift left" là tìm lỗ hổng càng sớm càng rẻ. Có ba họ công cụ, bổ sung cho nhau chứ không thay thế nhau:

| Loại | Cách hoạt động | Bắt tốt | Điểm yếu |
|---|---|---|---|
| **SAST** | Phân tích source code tĩnh (không chạy) | Injection, hardcoded secret, crypto sai | Nhiều false positive, không thấy lỗi runtime |
| **DAST** | Tấn công app đang chạy từ bên ngoài | Lỗi cấu hình, authz, lỗi runtime thật | Cần app deploy, coverage phụ thuộc crawler |
| **IAST** | Agent bên trong app khi chạy test | Chính xác cao, ít false positive | Cần instrument runtime, chỉ thấy code được test chạy qua |

Bổ sung không thể thiếu: **SCA (Software Composition Analysis)** quét dependency tìm CVE đã biết (A06: Vulnerable and Outdated Components), và **secret scanning** tìm credential lỡ commit.

Mỗi công cụ bắt loại lỗi khác nhau ở một giai đoạn khác nhau của pipeline — đặt đúng chỗ là phần lớn giá trị của "shift left":

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vị trí SAST, SCA, secret-scan, IAST, DAST trong pipeline</title>
  <desc>Timeline pipeline trái sang phải: ở Pull Request chạy SAST, SCA và secret-scan (shift left, chặn merge); khi chạy test có IAST instrument trong runtime; ở staging hoặc nightly có DAST tấn công app đang chạy. Mỗi công cụ ghi rõ bắt loại lỗi nào.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Công cụ bảo mật theo giai đoạn pipeline</text>
  <line x1="40" y1="70" x2="700" y2="70" stroke="currentColor" stroke-opacity="0.4"/>
  <polygon points="700,70 690,65 690,75" fill="currentColor" fill-opacity="0.6"/>
  <text x="690" y="58" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">thời gian →</text>
  <g>
    <circle cx="150" cy="70" r="5" fill="#3b82f6"/>
    <text x="150" y="52" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Pull Request</text>
    <text x="150" y="92" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">shift left · chặn merge</text>
  </g>
  <g>
    <circle cx="390" cy="70" r="5" fill="#8b5cf6"/>
    <text x="390" y="52" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Chạy test (CI)</text>
    <text x="390" y="92" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">app chạy + instrument</text>
  </g>
  <g>
    <circle cx="600" cy="70" r="5" fill="#f59e0b"/>
    <text x="600" y="52" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Staging / nightly</text>
    <text x="600" y="92" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">app đang chạy thật</text>
  </g>
  <g>
    <rect x="46" y="120" width="208" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="58" y="140" font-size="12" font-weight="700" fill="currentColor">SAST</text>
    <text x="58" y="158" font-size="10" fill="currentColor" opacity="0.75">code tĩnh: injection, crypto sai</text>
  </g>
  <g>
    <rect x="46" y="174" width="208" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="58" y="194" font-size="12" font-weight="700" fill="currentColor">SCA</text>
    <text x="58" y="212" font-size="10" fill="currentColor" opacity="0.75">dependency: CVE đã biết (A06)</text>
  </g>
  <g>
    <rect x="46" y="228" width="208" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="58" y="248" font-size="12" font-weight="700" fill="currentColor">Secret scan</text>
    <text x="58" y="266" font-size="10" fill="currentColor" opacity="0.75">credential lỡ commit</text>
  </g>
  <g>
    <rect x="286" y="120" width="208" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="298" y="140" font-size="12" font-weight="700" fill="currentColor">IAST</text>
    <text x="298" y="158" font-size="10" fill="currentColor" opacity="0.75">agent trong runtime khi test</text>
  </g>
  <g>
    <rect x="496" y="120" width="208" height="46" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="508" y="140" font-size="12" font-weight="700" fill="currentColor">DAST</text>
    <text x="508" y="158" font-size="10" fill="currentColor" opacity="0.75">tấn công app từ ngoài: authz, config</text>
  </g>
</svg>

```yaml
# .github/workflows/security.yml — gate bảo mật trong CI
name: security
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # SAST: phân tích code tĩnh
      - name: Semgrep SAST
        run: semgrep ci --config=auto --error   # exit != 0 nếu có finding chặn

      # SCA: quét dependency CVE
      - name: Dependency audit
        run: |
          npm audit --audit-level=high
          # hoặc: trivy fs --severity HIGH,CRITICAL --exit-code 1 .

      # Secret scanning: bắt credential lỡ commit
      - name: Gitleaks
        run: gitleaks detect --no-git -v --redact
```

> 💡 Nguyên tắc: Cấu hình gate để **fail build** ở mức severity HIGH/CRITICAL, nhưng chỉ **cảnh báo** (warn) ở mức thấp. Nếu gate quá ồn (toàn false positive), kỹ sư sẽ học cách bỏ qua nó — và thế là bạn mất luôn lớp phòng thủ.

DAST chạy chậm hơn, nên thường đặt ở stage sau (nightly hoặc trên môi trường staging) chứ không chặn mỗi PR:

```yaml
  dast:
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP baseline scan
        run: |
          docker run owasp/zap2docker-stable zap-baseline.py \
            -t https://staging.example.com -I   # -I = không fail trên warning
```

> ⚠️ Lỗ hổng: Chỉ chạy SAST rồi tự tin "đã quét bảo mật". SAST gần như không bao giờ bắt được lỗi **business logic** (ví dụ: thiếu kiểm tra quyền sở hữu khi user A sửa đơn hàng của user B — IDOR/Broken Access Control, A01). Lỗi authz phải bắt bằng DAST/IAST có authenticated session và bằng test do người viết.

---

## 3. Security Logging & Detection — log cái gì để phát hiện được

Bạn không thể điều tra (hoặc thậm chí phát hiện) một sự cố nếu không log đúng thứ. Nhưng log sai cũng nguy hiểm: log nhầm mật khẩu/token là tự tạo ra một kho dữ liệu rò rỉ.

### Cần log những gì (security-relevant events)

| Sự kiện | Lý do |
|---|---|
| Login thành công / thất bại + nguồn | Phát hiện brute force, login bất thường |
| Thay đổi quyền (role/permission grant) | Phát hiện privilege escalation |
| Truy cập dữ liệu nhạy cảm (PII, tài chính) | Điều tra rò rỉ, audit |
| Thao tác admin / cấu hình thay đổi | Bắt insider / tài khoản bị chiếm |
| Reset mật khẩu, đổi email/MFA | Bắt account takeover |
| Lỗi authz bị từ chối (403) hàng loạt | Dấu hiệu đang dò IDOR |
| Gọi API bất thường (volume, geo) | Exfiltration |

Mỗi log entry nên có: **timestamp (UTC), actor (user/service ID), action, resource, kết quả (allow/deny), correlation ID** để nối các sự kiện trong cùng một request/phiên.

```python
# Trước: log vô dụng cho điều tra + RÒ RỈ secret
logger.info(f"User logged in: {request.json}")   # dump cả password!

# Sau: structured log, có ngữ cảnh, không có secret
logger.info("auth.login", extra={
    "event": "auth.login",
    "outcome": "success",
    "user_id": user.id,
    "source_ip": client_ip,
    "user_agent_hash": hash_ua(request.headers["User-Agent"]),
    "trace_id": request.trace_id,
})
# KHÔNG BAO GIỜ log: password, token, session id đầy đủ, số thẻ, OTP
```

> ⚠️ Lỗ hổng: Log nhạy cảm (token, PII, request body có mật khẩu) gửi sang hệ thống log tập trung mà ai trong công ty cũng đọc được. Log trở thành mục tiêu tấn công béo bở. Hãy **redact/mask** ngay tại nguồn và giới hạn quyền đọc log production.

### Detection: từ log thành cảnh báo

Log để đó không ai đọc thì vô dụng. Cần **detection rule** biến pattern thành alert:

```
# Pseudo-detection rules
RULE "credential_stuffing":
  COUNT(event=auth.login, outcome=failure) BY source_ip > 50 IN 5m  -> alert

RULE "impossible_travel":
  same user_id login từ 2 quốc gia cách nhau > khoảng cách bay được -> alert

RULE "mass_403":
  COUNT(outcome=deny) BY user_id > 100 IN 1m  -> alert (đang dò IDOR)
```

> 💡 Nguyên tắc: Đảm bảo log **bất biến (immutable / append-only)** và lưu ở nơi tách biệt khỏi quyền của ứng dụng. Kẻ tấn công chiếm app KHÔNG được phép xóa dấu vết của chính mình.

---

## 4. Least-Privilege IAM & Secure Defaults

Phần lớn sự cố cloud lớn không bắt đầu bằng một exploit tinh vi, mà bằng một credential/role có **quá nhiều quyền** bị lộ. Nguyên tắc least privilege: mỗi identity (người hoặc service) chỉ có đúng quyền cần để làm việc của nó, không hơn.

### Tấn công cụ thể: lateral movement từ một service bị chiếm

Một microservice xử lý ảnh thumbnail bị RCE qua một thư viện image cũ. Nếu service đó chạy với một role có quyền `*:*` (hoặc đơn giản là quyền đọc toàn bộ database production + S3 bucket khách hàng), thì một lỗ hổng nhỏ trong tính năng phụ biến thành rò rỉ toàn bộ dữ liệu. Đó là **blast radius**.

```json
// Trước: IAM policy "cho nhanh" — thảm họa khi service bị chiếm
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```

```json
// Sau: chỉ đúng action, đúng resource, có điều kiện
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::thumbnails-prod/*",
  "Condition": {
    "StringEquals": { "aws:SourceVpc": "vpc-0abc123" }
  }
}
```

Cùng một lỗ RCE, hai role khác nhau cho ra blast radius khác hẳn:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Lateral movement và blast radius — role rộng vs least privilege</title>
  <desc>Hai kịch bản. Bên trái: service thumbnail bị RCE chạy với role star-star lan tới toàn bộ DB prod và S3 khách hàng, blast radius lớn. Bên phải: cùng service nhưng role chỉ có s3 GetObject và PutObject trên một bucket, thiệt hại bị giới hạn ở bucket đó.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Cùng một lỗ RCE — blast radius theo quyền của role</text>
  <text x="180" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Role "*:*" — thảm họa</text>
  <text x="540" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Least privilege — giới hạn</text>
  <line x1="360" y1="64" x2="360" y2="360" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 5"/>
  <g>
    <rect x="120" y="74" width="120" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="93" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">thumbnail svc</text>
    <text x="180" y="109" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RCE · role *:*</text>
    <g stroke="#ef4444" stroke-opacity="0.75" fill="none" stroke-width="1.5">
      <path d="M150 118 L70 180"/><polygon points="70,180 79,176 76,184" fill="#ef4444" fill-opacity="0.75" stroke="none"/>
      <path d="M180 118 L180 180"/><polygon points="180,180 176,172 184,172" fill="#ef4444" fill-opacity="0.75" stroke="none"/>
      <path d="M210 118 L290 180"/><polygon points="290,180 281,176 284,184" fill="#ef4444" fill-opacity="0.75" stroke="none"/>
    </g>
    <rect x="24" y="182" width="92" height="40" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="70" y="206" font-size="10" text-anchor="middle" fill="currentColor">DB prod</text>
    <rect x="134" y="182" width="92" height="40" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="180" y="206" font-size="10" text-anchor="middle" fill="currentColor">S3 khách hàng</text>
    <rect x="244" y="182" width="92" height="40" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="290" y="201" font-size="10" text-anchor="middle" fill="currentColor">mọi service</text>
    <text x="290" y="214" font-size="10" text-anchor="middle" fill="currentColor">khác</text>
    <text x="180" y="252" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Blast radius LỚN — lan toàn account</text>
  </g>
  <g>
    <rect x="480" y="74" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="540" y="93" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">thumbnail svc</text>
    <text x="540" y="109" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">RCE · role hẹp</text>
    <g stroke="#10b981" stroke-opacity="0.85" fill="none" stroke-width="1.5">
      <path d="M540 118 L540 180"/><polygon points="540,180 536,172 544,172" fill="#10b981" fill-opacity="0.85" stroke="none"/>
    </g>
    <rect x="474" y="182" width="132" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="540" y="201" font-size="10" text-anchor="middle" fill="currentColor">thumbnails-prod</text>
    <text x="540" y="214" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">chỉ Get/PutObject</text>
    <g stroke="currentColor" stroke-opacity="0.25" fill="none" stroke-dasharray="4 4">
      <path d="M474 202 L420 240"/><path d="M606 202 L660 240"/>
    </g>
    <text x="420" y="256" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.5">DB prod ✕</text>
    <text x="660" y="256" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.5">S3 khác ✕</text>
    <text x="540" y="292" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Thiệt hại bị giới hạn ở 1 bucket</text>
  </g>
</svg>

Checklist least-privilege:

- [ ] Mỗi service có **role riêng**, không dùng chung một "god role".
- [ ] Bắt đầu từ deny-all, chỉ thêm quyền khi có nhu cầu thật (đo bằng access analyzer).
- [ ] Không dùng wildcard `*` trên Action/Resource ở production.
- [ ] Dùng **credential tạm thời** (short-lived token, OIDC federation) thay cho long-lived access key.
- [ ] Tách quyền theo môi trường: role dev không chạm được data prod.
- [ ] Review định kỳ và thu hồi quyền không dùng (least privilege là quá trình, không phải cấu hình một lần).

### Secure defaults cloud

> 💡 Nguyên tắc: Trạng thái an toàn phải là **mặc định**, và sự kém an toàn phải cần một hành động có chủ đích, được review. Không phải ngược lại.

Checklist secure defaults:

- [ ] Storage bucket **private mặc định**, chặn public access ở cấp tổ chức (block public access).
- [ ] Mã hóa at-rest và in-transit (TLS) bật mặc định cho mọi data store.
- [ ] Security group / firewall mặc định deny inbound; mở port là ngoại lệ phải khai báo.
- [ ] Không có resource nào có thể được tạo ra ở trạng thái public mà không qua guardrail (policy-as-code, ví dụ OPA/Conftest trên IaC).
- [ ] MFA bắt buộc cho mọi human account, đặc biệt account có quyền admin.
- [ ] Tắt/cô lập các region và service không dùng để giảm bề mặt tấn công.

```hcl
# Guardrail dạng policy-as-code trên Terraform — chặn bucket public ngay từ plan
# (chạy bằng Conftest/OPA trong CI trước khi apply)
deny[msg] {
  resource := input.resource.aws_s3_bucket[name]
  resource.acl == "public-read"
  msg := sprintf("Bucket %s không được public-read", [name])
}
```

---

## 5. Incident Response Cycle

Giả định không phải "nếu" mà "khi nào" sẽ có sự cố. Một quy trình rõ ràng giúp đội không hoảng loạn và không vô tình phá hủy bằng chứng. Vòng đời (theo NIST) gồm bốn pha chính:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời Incident Response theo NIST</title>
  <desc>Vòng lặp bốn pha: Detect, Contain, Eradicate, Recover nối tiếp nhau bằng mũi tên; sau Recover, vòng Post-incident learning quay ngược về Detect để khép vòng và cải thiện.</desc>
  <text x="360" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Incident Response Cycle (NIST)</text>
  <g>
    <rect x="40" y="70" width="140" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="110" y="96" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Detect</text>
    <text x="110" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">phát hiện · phân loại</text>
  </g>
  <g>
    <rect x="218" y="70" width="140" height="56" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="288" y="96" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Contain</text>
    <text x="288" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">cô lập · giữ bằng chứng</text>
  </g>
  <g>
    <rect x="396" y="70" width="140" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="466" y="96" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Eradicate</text>
    <text x="466" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">diệt nguyên nhân gốc</text>
  </g>
  <g>
    <rect x="574" y="70" width="140" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="644" y="96" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Recover</text>
    <text x="644" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">phục hồi có kiểm soát</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M180 98 L212 98"/><polygon points="212,98 203,93 203,103" fill="currentColor" fill-opacity="0.6" stroke="none"/>
    <path d="M358 98 L390 98"/><polygon points="390,98 381,93 381,103" fill="currentColor" fill-opacity="0.6" stroke="none"/>
    <path d="M536 98 L568 98"/><polygon points="568,98 559,93 559,103" fill="currentColor" fill-opacity="0.6" stroke="none"/>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-width="1.6" stroke-dasharray="6 4">
    <path d="M644 126 L644 220 L110 220 L110 130"/>
    <polygon points="110,130 105,140 115,140" fill="currentColor" fill-opacity="0.6" stroke="none"/>
  </g>
  <text x="377" y="214" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Post-incident learning → quay về Detect</text>
</svg>

**1. Detect (phát hiện & phân loại).** Alert nổ, một người gọi điện, hoặc khách báo. Việc đầu tiên: xác nhận đây có phải sự cố thật không, và gán mức độ (severity). Chỉ định một **Incident Commander (IC)** — một người điều phối, ra quyết định; những người khác báo cáo về IC. Mở một kênh chat riêng và một tài liệu timeline.

**2. Contain (cô lập).** Ngăn thiệt hại lan rộng, NHƯNG giữ bằng chứng. Ví dụ: thay vì tắt server bị chiếm (mất RAM forensics), hãy cô lập nó về một security group cách ly, thu hồi (revoke) credential bị lộ, vô hiệu hóa session/token của tài khoản bị nghi.

> ⚠️ Lỗ hổng: Phản xạ "tắt máy / xóa ngay cho an toàn". Việc này phá hủy bằng chứng và đôi khi kích hoạt cơ chế phá hủy của malware. Hãy **cô lập trước, bảo toàn bằng chứng (snapshot), rồi mới hành động.**

**3. Eradicate (loại trừ).** Tìm và diệt nguyên nhân gốc: vá lỗ hổng đã bị khai thác, gỡ backdoor/webshell, xoay toàn bộ secret có thể đã lộ. Không chỉ xử lý triệu chứng. Nếu một access key bị lộ, giả định **mọi thứ key đó chạm tới đều đã bị xâm phạm**.

**4. Recover (phục hồi).** Đưa hệ thống về hoạt động bình thường một cách có kiểm soát: khôi phục từ backup sạch (đã xác minh không nhiễm), giám sát chặt để chắc chắn kẻ tấn công không quay lại, dần gỡ các biện pháp containment.

> 💡 Nguyên tắc: Quyết định lớn nhất trong containment là đánh đổi giữa "dừng thiệt hại ngay" và "quan sát để hiểu phạm vi". IC là người cân nhắc và chịu trách nhiệm cho đánh đổi đó — đừng để cả đội tranh cãi trong lúc nhà đang cháy.

---

## 6. Blameless Postmortem

Sau khi recover, viết postmortem. Mục tiêu là **học để hệ thống không lặp lại sự cố**, không phải tìm người để đổ lỗi.

> 💡 Nguyên tắc: Con người vận hành trong một hệ thống. Nếu một kỹ sư gây ra sự cố, câu hỏi đúng không phải "tại sao anh ta cẩu thả" mà "tại sao hệ thống cho phép một hành động đơn lẻ gây ra hậu quả lớn đến vậy, và không có lớp chặn nào".

Blameless không có nghĩa là không có trách nhiệm — nghĩa là tập trung vào **nguyên nhân hệ thống và hành động sửa chữa**, vì chỉ khi mọi người an toàn về tâm lý họ mới kể thật chuyện đã xảy ra. Đổ lỗi khiến người ta giấu thông tin, và bạn mất chính dữ liệu cần để sửa.

Cấu trúc một postmortem:

| Mục | Nội dung |
|---|---|
| Tóm tắt | Chuyện gì xảy ra, ảnh hưởng (user, data, tiền) |
| Timeline | Mốc thời gian (UTC): từ phát hiện tới recover |
| Phân tích nguyên nhân gốc | Dùng "5 Whys"; thường ra nhiều nguyên nhân hệ thống |
| Cái gì đã hoạt động tốt | Detection nhanh? Runbook hữu ích? |
| Cái gì cần cải thiện | Thiếu alert? Quyền quá rộng? |
| Action items | Có **owner** và **deadline** cụ thể, được theo dõi |

Action item không có người chịu trách nhiệm và hạn chót thì sẽ không bao giờ được làm — và sự cố sẽ lặp lại.

---

## 7. Runbook Bảo Mật

Runbook là quy trình viết sẵn cho một tình huống cụ thể, để người trực (kể cả không phải chuyên gia) xử lý được lúc 3 giờ sáng mà không phải tự nghĩ ra mọi thứ trong lúc căng thẳng.

```markdown
# RUNBOOK: Nghi ngờ Access Key bị lộ

## Khi nào dùng
- Secret scanner báo key xuất hiện trong public repo
- Alert phát hiện key dùng từ địa điểm/IP bất thường

## Hành động ngay (theo thứ tự)
1. [CONTAIN] Vô hiệu hóa (deactivate, KHÔNG xóa vội) key bị lộ.
2. [CONTAIN] Tạo key mới, cập nhật vào secret manager, deploy.
3. [DETECT] Xem audit log: key đã làm gì trong 90 ngày? (xuất ra file)
4. [ERADICATE] Liệt kê mọi resource key chạm tới -> coi như đã lộ.
5. [ERADICATE] Xoay mọi secret downstream key đó có thể đọc.
6. [RECOVER] Sau xác minh, xóa hẳn key cũ.
7. Mở incident nếu audit log cho thấy truy cập trái phép.

## Liên hệ leo thang
- Security on-call: <pager>
- Incident Commander: <quy trình mở incident>
```

Checklist một runbook tốt:

- [ ] Bắt đầu bằng "khi nào dùng" rõ ràng (điều kiện kích hoạt).
- [ ] Các bước **đánh số, làm được ngay**, không cần phán đoán mơ hồ.
- [ ] Ghi rõ bước nào thuộc pha nào (contain/eradicate/recover).
- [ ] Có ngưỡng leo thang và thông tin liên hệ.
- [ ] Được **diễn tập định kỳ** (game day / tabletop). Runbook chưa từng test là runbook sẽ hỏng đúng lúc cần.
- [ ] Lưu ở nơi truy cập được KỂ CẢ khi hệ thống chính sập (không để runbook chỉ nằm trong wiki chạy trên hạ tầng đang cháy).

---

## Liên hệ sang AWS

Mọi khái niệm trên đều có dịch vụ tương ứng trên AWS. Bản đồ nhanh:

| Khái niệm trong bài | Dịch vụ AWS |
|---|---|
| WAF & rate limiting | **AWS WAF** (rate-based rules, managed rule groups), **Shield** (DDoS) |
| Least-privilege identity | **IAM** (policy, roles), **IAM Access Analyzer** (tìm quyền thừa & resource public) |
| Credential tạm thời | **IAM Roles**, **STS** (AssumeRole), **OIDC federation** cho CI/CD |
| Quản lý secret | **Secrets Manager**, **SSM Parameter Store** (auto-rotation) |
| Mã hóa at-rest | **KMS** (quản lý khóa, audit dùng khóa) |
| Security logging | **CloudTrail** (API audit log), **VPC Flow Logs**, **CloudWatch Logs** |
| Detection / threat intel | **GuardDuty** (phát hiện hành vi bất thường), **Security Hub** (tổng hợp finding) |
| SAST/SCA trong pipeline | **CodeGuru Security**, **Inspector** (CVE cho container/EC2/Lambda) |
| Secure defaults & guardrail | **Organizations SCP**, **Config rules**, **Control Tower**, S3 Block Public Access |
| Incident containment | Tách **Security Group**, revoke STS session, snapshot **EBS** để forensics |

> 💡 Nguyên tắc: GuardDuty + CloudTrail + Security Hub là bộ ba "detect"; IAM + KMS + SCP là bộ ba "least privilege & secure defaults"; WAF + Shield là lớp rìa. Bật chúng từ ngày đầu — bật detection SAU khi bị tấn công thì đã muộn, vì bạn không có log của quá khứ để điều tra.
