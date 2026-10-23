# Foundations 06 — Failure Modes & Cascading Failures

> Mục tiêu: Hiểu **các kiểu chết** của hệ phân tán mà naive design không xử lý được — retry storm, thundering herd, cascading failure — và các pattern phòng vệ (circuit breaker, backoff, bulkhead, load shedding). Đây là kiến thức tách biệt một "junior cloud engineer" khỏi "senior architect".

Tiền đề: [[foundations-01-cap-theorem]], [[foundations-03-replication-and-quorum]], [[foundations-04-latency-vs-consistency]].

---

## 1. Câu chuyện mở đầu — Sự cố "Black Friday" tưởng tượng

12h trưa Black Friday. Site bạn chạy bình thường, RDS 50% CPU, app 60%.

12h00m30s: 1 trong 3 EC2 chết.
- ALB redirect traffic sang 2 EC2 còn lại.
- 2 EC2 này giờ load 90%.
- Latency tăng 100ms → 500ms.

12h01m00s: User refresh vì chậm.
- QPS x2.
- 2 EC2 đầy → request queue → latency 5s.
- ALB health check timeout → đánh 1 EC2 là unhealthy.

12h01m30s: 1 EC2 còn lại nhận **toàn bộ traffic**.
- CPU 100%, OOM, restart.
- Trong lúc restart, request rớt.
- Client retry → traffic vào ALB tăng x10 (retry storm).

12h02m00s: ASG launch instance mới (mất 3 phút bootstrap).
- 3 phút không có capacity → toàn site down.

12h05m00s: Instance mới lên.
- Nhưng RDS connection pool đã exhausted vì old instance không close connection sạch.
- DB CPU 100%.
- Lambda timeout → SQS DLQ tràn → alert pager loạn.

→ **Single instance failure → site down 10 phút.** Đây là **cascading failure**, và nó **bình thường** trong mọi hệ phân tán không thiết kế chống.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 704" role="img" aria-labelledby="fd06a-t fd06a-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fd06a-t">Cascading failure Black Friday: chuỗi domino 12h00 đến 12h05</title>
<desc id="fd06a-d">Sáu mốc thời gian. Mỗi hàng có trạng thái 3 slot EC2, sự kiện và thứ khuếch đại sự cố: 1 EC2 chết dồn tải 90% lên 2 máy, user refresh làm QPS x2 và health check loại thêm 1 máy, máy cuối OOM kéo theo retry storm x10, ASG bootstrap 3 phút khiến site down, rồi RDS connection pool exhausted làm DB, Lambda, SQS hỏng theo. Kết quả: 1 instance chết, site down 10 phút.</desc>
<defs><marker id="fd06a-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="16" y="26" font-size="16" font-weight="700" fill="currentColor">Cascading failure: chuỗi domino 12h00 → 12h05</text>
<text x="16" y="56" font-size="13" fill="currentColor" opacity="0.65">Mốc</text>
<text x="108" y="56" font-size="13" fill="currentColor" opacity="0.65">3 slot EC2</text>
<text x="248" y="56" font-size="13" fill="currentColor" opacity="0.65">Chuyện gì xảy ra</text>
<text x="622" y="56" font-size="13" fill="currentColor" opacity="0.65">Thứ khuếch đại</text>
<g data-step="1">
<text x="16" y="95" font-size="13" font-weight="700" fill="currentColor">12h00m00s</text>
<rect x="108" y="84.0" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125.0" y="103.5" font-size="13" text-anchor="middle" fill="currentColor">60%</text>
<rect x="147" y="84.0" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="103.5" font-size="13" text-anchor="middle" fill="currentColor">60%</text>
<rect x="186" y="84.0" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="103.5" font-size="13" text-anchor="middle" fill="currentColor">60%</text>
<rect x="236" y="74" width="362" height="50" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="95" font-size="13" fill="currentColor">Bình thường: app 60% CPU, RDS 50% CPU</text>
<rect x="612" y="74" width="136" height="50" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
<text x="622" y="95" font-size="13" font-weight="400" fill="currentColor">mức nền</text>
<text x="622" y="112" font-size="13" font-weight="400" fill="currentColor">mỗi máy dư 40%</text>
</g>
<g data-step="2">
<line x1="417.0" y1="126" x2="417.0" y2="143" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#fd06a-arr)"/>
<text x="16" y="167" font-size="13" font-weight="700" fill="currentColor">12h00m30s</text>
<rect x="108" y="164.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125.0" y="184.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="147" y="164.5" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="184.0" font-size="13" text-anchor="middle" fill="currentColor">90%</text>
<rect x="186" y="164.5" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="184.0" font-size="13" text-anchor="middle" fill="currentColor">90%</text>
<rect x="236" y="146" width="362" height="67" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="167" font-size="13" fill="currentColor">1 trong 3 EC2 chết, ALB dồn traffic sang 2 máy</text>
<text x="248" y="184" font-size="13" fill="currentColor">2 EC2 còn lại load 90%</text>
<text x="248" y="201" font-size="13" fill="currentColor">latency 100ms → 500ms</text>
<rect x="612" y="146" width="136" height="67" rx="7" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="0"/>
<text x="622" y="167" font-size="13" font-weight="600" fill="currentColor">N-1 không đủ dư:</text>
<text x="622" y="184" font-size="13" font-weight="600" fill="currentColor">60% × 3/2 = 90%</text>
</g>
<g data-step="3">
<line x1="417.0" y1="215" x2="417.0" y2="232" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#fd06a-arr)"/>
<text x="16" y="256" font-size="13" font-weight="700" fill="currentColor">12h01m00s</text>
<rect x="108" y="253.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125.0" y="273.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="147" y="253.5" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="273.0" font-size="11.5" text-anchor="middle" fill="currentColor">loại</text>
<rect x="186" y="253.5" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="273.0" font-size="13" text-anchor="middle" fill="currentColor">đầy</text>
<rect x="236" y="235" width="362" height="67" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="256" font-size="13" fill="currentColor">User refresh vì chậm → QPS x2</text>
<text x="248" y="273" font-size="13" fill="currentColor">2 EC2 đầy → request queue → latency 5s</text>
<text x="248" y="290" font-size="13" fill="currentColor">health check timeout → ALB đánh 1 EC2 unhealthy</text>
<rect x="612" y="235" width="136" height="67" rx="7" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="0"/>
<text x="622" y="256" font-size="13" font-weight="600" fill="currentColor">user refresh x2</text>
<text x="622" y="273" font-size="13" font-weight="600" fill="currentColor">+ health check loại</text>
<text x="622" y="290" font-size="13" font-weight="600" fill="currentColor">máy còn sống</text>
</g>
<g data-step="4">
<line x1="417.0" y1="304" x2="417.0" y2="321" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#fd06a-arr)"/>
<text x="16" y="345" font-size="13" font-weight="700" fill="currentColor">12h01m30s</text>
<rect x="108" y="342.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125.0" y="362.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="147" y="342.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="362.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="186" y="342.5" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="362.0" font-size="13" text-anchor="middle" fill="currentColor">OOM</text>
<rect x="236" y="324" width="362" height="67" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="345" font-size="13" fill="currentColor">1 EC2 còn lại nhận toàn bộ traffic</text>
<text x="248" y="362" font-size="13" fill="currentColor">CPU 100%, OOM, restart → request rớt</text>
<text x="248" y="379" font-size="13" fill="currentColor">client retry → traffic vào ALB x10</text>
<rect x="612" y="324" width="136" height="67" rx="7" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="0"/>
<text x="622" y="345" font-size="13" font-weight="600" fill="currentColor">retry storm x10</text>
</g>
<g data-step="5">
<line x1="417.0" y1="393" x2="417.0" y2="410" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#fd06a-arr)"/>
<text x="16" y="434" font-size="13" font-weight="700" fill="currentColor">12h02m00s</text>
<rect x="108" y="431.5" width="34" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="3 3"/>
<text x="125.0" y="451.0" font-size="11.5" text-anchor="middle" fill="currentColor">boot</text>
<rect x="147" y="431.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="451.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="186" y="431.5" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="451.0" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="236" y="413" width="362" height="67" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="434" font-size="13" fill="currentColor">ASG launch instance mới, bootstrap mất 3 phút</text>
<text x="248" y="451" font-size="13" fill="currentColor">3 phút không có capacity → toàn site down</text>
<rect x="612" y="413" width="136" height="67" rx="7" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="0"/>
<text x="622" y="434" font-size="13" font-weight="600" fill="currentColor">ASG cần vài phút,</text>
<text x="622" y="451" font-size="13" font-weight="600" fill="currentColor">sự cố lan</text>
<text x="622" y="468" font-size="13" font-weight="600" fill="currentColor">theo giây</text>
</g>
<g data-step="6">
<line x1="417.0" y1="482" x2="417.0" y2="499" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#fd06a-arr)"/>
<text x="16" y="523" font-size="13" font-weight="700" fill="currentColor">12h05m00s</text>
<rect x="108" y="529.0" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="125.0" y="548.5" font-size="13" text-anchor="middle" fill="currentColor">mới</text>
<rect x="147" y="529.0" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="164.0" y="548.5" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="186" y="529.0" width="34" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="203.0" y="548.5" font-size="13" text-anchor="middle" fill="currentColor">✗</text>
<rect x="236" y="502" width="362" height="84" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
<text x="248" y="523" font-size="13" fill="currentColor">Instance mới lên, nhưng RDS connection pool exhausted</text>
<text x="248" y="540" font-size="13" fill="currentColor">(old instance không close connection sạch)</text>
<text x="248" y="557" font-size="13" fill="currentColor">DB CPU 100% → Lambda timeout</text>
<text x="248" y="574" font-size="13" fill="currentColor">→ SQS DLQ tràn → alert pager loạn</text>
<rect x="612" y="502" width="136" height="84" rx="7" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="0"/>
<text x="622" y="523" font-size="13" font-weight="600" fill="currentColor">connection rò</text>
<text x="622" y="540" font-size="13" font-weight="600" fill="currentColor">→ cạn tài nguyên</text>
<text x="622" y="557" font-size="13" font-weight="600" fill="currentColor">tầng sâu</text>
</g>
<rect x="16" y="604" width="728" height="44" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
<text x="32" y="622" font-size="13.5" font-weight="700" fill="currentColor">Kết quả: 1 instance chết → site down 10 phút.</text>
<text x="32" y="640" font-size="13" fill="currentColor" opacity="0.85">Mỗi bước tạo điều kiện cho bước sau: snowball, không tự thoát ra.</text>
<rect x="22" y="663" width="13" height="13" rx="3" fill="#10b981" fill-opacity="0.5"/>
<text x="41" y="674" font-size="13" fill="currentColor" opacity="0.8">bình thường</text>
<rect x="146.2" y="663" width="13" height="13" rx="3" fill="#f59e0b" fill-opacity="0.5"/>
<text x="165.2" y="674" font-size="13" fill="currentColor" opacity="0.8">quá tải lan rộng</text>
<rect x="306.4" y="663" width="13" height="13" rx="3" fill="#8b5cf6" fill-opacity="0.5"/>
<text x="325.4" y="674" font-size="13" fill="currentColor" opacity="0.8">cạn tài nguyên tầng sâu</text>
<rect x="517.0" y="663" width="13" height="13" rx="3" fill="#f43f5e" fill-opacity="0.5"/>
<text x="536.0" y="674" font-size="13" fill="currentColor" opacity="0.8">slot chết / thứ khuếch đại</text>
</svg>
<step-note data-step="1">Mỗi máy chạy 60% nghĩa là còn dư 40%, trông thoải mái. Nhưng mức dư này chỉ tính khi đủ cả 3 máy.</step-note>
<step-note data-step="2">Tải của máy chết chia cho 2 máy còn lại: 60% × 3/2 = 90%. Ở 90% CPU hàng đợi trong máy dài ra, nên latency tăng gấp 5 dù chưa máy nào sập thêm.</step-note>
<step-note data-step="3">Chậm khiến người dùng bấm lại, tải tăng đúng lúc capacity giảm. Health check không phân biệt chậm vì quá tải với chết thật, nên ALB tự rút thêm một máy vẫn đang phục vụ.</step-note>
<step-note data-step="4">Toàn bộ tải dồn vào một máy là vượt sức chứa, máy OOM và restart. Request rớt làm client retry, tải vào ALB gấp 10 đúng lúc gần như không còn ai phục vụ.</step-note>
<step-note data-step="5">Auto Scaling phản ứng theo phút còn sự cố lan theo giây. Suốt 3 phút bootstrap không có instance healthy nào, ALB không còn chỗ gửi request.</step-note>
<step-note data-step="6">Instance cũ chết không trả connection về RDS, pool cạn nên capacity đã về mà vẫn lỗi. Nghẽn lan xuống tầng sâu (DB, Lambda, SQS), nên sự cố chưa dừng khi lớp EC2 đã hồi.</step-note>
</step-flow>

---

## 2. Các kiểu failure cơ bản

| Loại | Mô tả | Ví dụ AWS |
|------|-------|-----------|
| **Crash failure** | Node chết hẳn, không response | EC2 hardware fail |
| **Omission failure** | Drop message ngẫu nhiên | Network packet loss |
| **Timing failure** | Response trễ vượt deadline | DB query chậm |
| **Byzantine failure** | Trả response **sai** (bit flip, malicious) | Hiếm, nhưng có; Aurora dùng checksum |
| **Partial failure** | Một số request thành công, một số fail | Khu vực 1 AZ degraded |
| **Gray failure** | Service "có vẻ" sống nhưng performance kém | EBS volume IOPS giảm âm thầm |

**Gray failure** là khó debug nhất. Health check 200 OK, nhưng p99 latency 5s. Đây là lý do health check cần check **performance**, không chỉ liveness.

---

## 3. Cascading failure — anatomy

Cascading failure xảy ra khi 1 failure → tạo điều kiện cho failure tiếp → snowball.

### 3.1 Retry storm
- Service B chậm.
- Service A timeout → retry.
- Mỗi user request giờ thành 3 backend request → B chịu 3x tải → càng chậm.
- A retry tiếp → B chết hẳn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Retry storm — vòng xoáy feedback so với backoff + jitter làm phẳng</title>
  <desc>Bên trái: B chậm khiến A timeout rồi retry ngay, tải B nhân lên, B chậm hơn, tạo vòng xoáy. Bên phải: thêm exponential backoff và jitter làm phẳng tải, B kịp hồi phục.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Retry storm vs. backoff + jitter</text>
  <defs>
    <marker id="fmArrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/>
    </marker>
    <marker id="fmArrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#10b981"/>
    </marker>
  </defs>
  <text x="180" y="50" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">✗ Retry ngay — vòng xoáy</text>
  <g fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#fmArrowRed)">
    <path d="M180 88 C 300 78, 300 130, 192 138"/>
    <path d="M168 158 C 60 168, 60 118, 168 102"/>
  </g>
  <g>
    <rect x="96" y="68" width="168" height="28" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="180" y="86" font-size="11.5" text-anchor="middle" fill="currentColor">B chậm → A timeout</text>
    <rect x="96" y="128" width="168" height="28" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="180" y="146" font-size="11.5" text-anchor="middle" fill="currentColor">A retry ngay lập tức</text>
    <rect x="96" y="188" width="168" height="28" rx="7" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="180" y="206" font-size="11.5" text-anchor="middle" fill="currentColor">tải B nhân lên (x3)</text>
  </g>
  <path d="M180 156 V 188" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#fmArrowRed)"/>
  <text x="180" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">→ B chết hẳn</text>
  <path d="M180 216 V 232" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#fmArrowRed)"/>
  <line x1="370" y1="44" x2="370" y2="300" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="545" y="50" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">✓ Backoff + jitter — phẳng</text>
  <g>
    <rect x="461" y="68" width="168" height="28" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="545" y="86" font-size="11.5" text-anchor="middle" fill="currentColor">B chậm → A timeout</text>
    <rect x="461" y="128" width="168" height="28" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="545" y="146" font-size="11.5" text-anchor="middle" fill="currentColor">chờ 2ⁿ + random rồi mới thử</text>
    <rect x="461" y="188" width="168" height="28" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="545" y="206" font-size="11.5" text-anchor="middle" fill="currentColor">tải trải đều, không trùng đỉnh</text>
  </g>
  <g fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#fmArrowGreen)">
    <path d="M545 96 V 128"/>
    <path d="M545 156 V 188"/>
    <path d="M545 216 V 232"/>
  </g>
  <text x="545" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">→ B kịp hồi phục</text>
</svg>

### 3.2 Thundering herd
- Cache key TTL expire cùng lúc.
- 1000 request đều miss cache cùng giây → 1000 request đập DB → DB chết.
- Hoặc: service restart → 1000 client cùng reconnect → restart server lại chết.

### 3.3 Connection pool exhaustion
- DB slow query → connection giữ lâu hơn.
- App vẫn nhận request → mở thêm connection.
- DB max_connections cap → app fail mở mới → trả 500 cho user.

### 3.4 Queue backup
- Producer ghi vào SQS nhanh, consumer xử lý chậm.
- Queue depth tăng.
- Visibility timeout expire → message reprocess → consumer càng quá tải.

### 3.5 Metastable failure
- Hệ thống vào trạng thái xấu mà tự nó **không thoát ra được** dù tải giảm. Cần can thiệp thủ công.
- Ví dụ: GC thrash → request chậm → retry tăng → GC nhiều hơn → vĩnh viễn không recover trừ khi restart.

---

## 4. Pattern phòng vệ

### 4.1 Retry với exponential backoff + jitter

✗ Sai: `for i in 1..3: retry()` ngay lập tức.
✓ Đúng: chờ `min(cap, base * 2^attempt) + random_jitter()`.

- **Backoff**: lần retry sau cách lần trước lâu hơn (2x, 4x, 8x…).
- **Jitter**: thêm random để 1000 client không retry cùng lúc (chống thundering herd).
- **Cap**: giới hạn max delay (vd 30s).

AWS SDK mặc định có exponential backoff cho hầu hết service.

> Công thức AWS khuyên dùng: `delay = random_between(0, min(cap, base * 2^attempt))` — "full jitter".

### 4.2 Circuit breaker

3 trạng thái:
- **Closed**: request đi qua bình thường.
- **Open**: ngắt mạch, fail-fast ngay (không gọi downstream). Sau N giây → half-open.
- **Half-open**: cho 1-2 request thử. Thành công → close. Fail → open lại.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Circuit breaker — máy trạng thái Closed, Open, Half-open</title>
  <desc>Closed cho request đi qua; lỗi vượt ngưỡng chuyển sang Open fail-fast; sau N giây sang Half-open thử vài request; thử thành công quay về Closed, thử fail quay lại Open.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Circuit breaker — máy trạng thái</text>
  <defs>
    <marker id="cbArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="40" y="120" width="160" height="70" rx="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Closed</text>
    <text x="120" y="170" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">request đi qua bình thường</text>
  </g>
  <g>
    <rect x="520" y="120" width="160" height="70" rx="12" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Open</text>
    <text x="600" y="170" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">fail-fast, không gọi downstream</text>
  </g>
  <g>
    <rect x="280" y="120" width="160" height="70" rx="12" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Half-open</text>
    <text x="360" y="170" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">cho 1-2 request thử</text>
  </g>
  <g fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" marker-end="url(#cbArrow)">
    <path d="M200 138 H 516"/>
    <path d="M520 172 H 444"/>
    <path d="M280 138 H 204"/>
  </g>
  <text x="358" y="112" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">lỗi vượt ngưỡng</text>
  <text x="482" y="190" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">sau N giây</text>
  <text x="242" y="112" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">thử thành công → Closed</text>
  <path d="M340 190 C 320 250, 540 250, 580 192" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" marker-end="url(#cbArrow)"/>
  <text x="455" y="262" font-size="11" font-weight="600" text-anchor="middle" fill="currentColor">thử fail → Open lại</text>
  <text x="40" y="290" font-size="11" fill="currentColor" opacity="0.7">Open = ngăn cascading failure: B chết thì A fail nhanh, không phí thread/timeout.</text>
</svg>

→ Ngăn cascading failure: nếu B chết, A không phí thời gian gọi nữa, fail nhanh, free up resource.

**AWS**: không có service "circuit breaker" sẵn (trừ App Mesh, Istio nếu dùng service mesh). Thường implement trong code (Hystrix kiểu cũ, resilience4j, AWS SDK retry config).

### 4.3 Timeout aggressive

✗ Default `connect timeout = 30s, read timeout = 60s` → quá lâu, giữ connection chết.
✓ Set timeout **ngắn hơn upstream**. Vd: nếu Lambda timeout 6s, gọi DynamoDB nên timeout 1s.

Quy tắc: **timeout phải có**, default vô hạn là bug.

### 4.4 Bulkhead

Tên gọi từ tàu thủy: chia khoang để 1 khoang ngập không chìm cả tàu.

- Tách thread pool / connection pool theo loại request.
- Vd: critical path (checkout) dùng pool riêng; non-critical (recommend) pool khác. Recommend chết không kéo checkout chết.
- **AWS**: tách Lambda, tách ASG, tách DB read replica theo workload.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bulkhead — tách thread/connection pool theo loại request</title>
  <desc>So sánh: pool chung khiến recommend quá tải nuốt hết thread làm checkout chết theo; còn tách pool riêng cho checkout và recommend thì recommend chết không kéo checkout chết.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Bulkhead — chia khoang thread/connection pool</text>
  <text x="180" y="54" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">✗ Pool chung</text>
  <rect x="40" y="68" width="280" height="180" rx="12" fill="#f59e0b" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="180" y="90" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.8">1 thread pool dùng chung</text>
  <g>
    <rect x="62" y="104" width="110" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="117" y="125" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">checkout</text>
    <text x="117" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(critical)</text>
    <rect x="188" y="104" width="110" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="243" y="125" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">recommend</text>
    <text x="243" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">quá tải </text>
  </g>
  <text x="180" y="186" font-size="11.5" text-anchor="middle" fill="currentColor">recommend nuốt hết thread</text>
  <text x="180" y="222" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">→ checkout cũng chết theo</text>
  <text x="540" y="54" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">✓ Pool tách riêng</text>
  <rect x="400" y="68" width="280" height="180" rx="12" fill="#10b981" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.22"/>
  <g>
    <rect x="420" y="100" width="115" height="120" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="477" y="124" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">checkout</text>
    <text x="477" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">pool riêng</text>
    <text x="477" y="200" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">vẫn sống ✓</text>
  </g>
  <g>
    <rect x="545" y="100" width="115" height="120" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="602" y="124" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">recommend</text>
    <text x="602" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">pool riêng</text>
    <text x="602" y="200" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">chết </text>
  </g>
  <text x="540" y="240" font-size="11.5" text-anchor="middle" fill="currentColor">khoang ngập không chìm cả tàu</text>
  <text x="40" y="296" font-size="11" fill="currentColor" opacity="0.7">Tên từ tàu thủy: chia khoang để một khoang ngập không kéo chìm cả con tàu.</text>
</svg>

### 4.5 Load shedding

Khi quá tải, **chủ động** từ chối 1 số request thay vì cố xử lý hết → chết cả.

- Trả 503 nhanh cho low-priority request.
- Giữ capacity cho high-priority (logged-in user > anonymous).
- **AWS**: API Gateway throttling, ALB target group threshold.

### 4.6 Hedged request

Cho 1 user request → gửi đồng thời tới 2 replica, dùng response đến trước, cancel cái kia.

- Giảm p99 latency (loại bỏ slow tail).
- Tốn x2 backend resource → chỉ dùng khi tail latency thực sự đau.
- DynamoDB SDK có thể bật.

### 4.7 Health check 2 tầng

- **Shallow** (liveness): "process còn sống?" → restart nếu fail.
- **Deep** (readiness): "có thể serve request thật?" → bỏ khỏi LB nếu fail (nhưng không restart).

ALB / Target Group: nên check deep, nhưng không gọi downstream DB trong check (recursive failure).

### 4.8 Idempotency

Retry chỉ an toàn khi operation **idempotent**: gọi 2 lần = gọi 1 lần.

- `GET` luôn idempotent.
- `PUT` thường idempotent.
- `POST` **không** mặc định → cần `Idempotency-Key`.

DynamoDB `TransactWriteItems` có `ClientRequestToken`. Stripe API có `Idempotency-Key`. Lambda + SQS có **message deduplication** trong FIFO queue.

### 4.9 Chaos engineering

Chủ động inject failure trong production-like → tìm cascading failure trước khi user tìm thấy.

- **AWS Fault Injection Service** (FIS): kill EC2, throttle DB, drop network.
- Netflix Chaos Monkey là ông tổ.
- Quy tắc: bắt đầu small (1 instance, off-peak), monitor kỹ, có rollback.

---

## 5. Map vào AWS — built-in protections

| Pattern | AWS service làm sẵn |
|---------|---------------------|
| Backoff + jitter | AWS SDK mặc định |
| Throttling | API Gateway, AWS WAF rate limit |
| Circuit breaker | App Mesh, AWS SDK (retry config) |
| Bulkhead | ALB target group / weighted routing, separate ASG |
| Health check | ALB, Route 53, ASG |
| Idempotency | SQS FIFO dedup, DynamoDB `ClientRequestToken` |
| Load shedding | ALB / NLB target unhealthy, throttle 4xx |
| Chaos testing | AWS FIS |
| Auto-recovery | EC2 Auto Recovery, ASG Replace Unhealthy |

---

## 6. Anti-pattern thường thấy

### 6.1 Retry vô hạn
```python
while True:
    try: call(); break
    except: continue  # retry storm guaranteed
```
**Fix**: max attempts + exponential backoff + jitter.

### 6.2 Synchronous chain dài
A → B → C → D, mỗi gọi sync.
- Một service chậm → toàn chain chậm.
- Latency cộng dồn.
- 1 fail → cả chain fail.

**Fix**: chuyển sang async (SQS, EventBridge) ở những chỗ không cần response ngay.

### 6.3 Cache stampede
TTL 60s, cache miss → 1000 request đập DB.

**Fix**:
- Stale-while-revalidate: trả stale data trong khi 1 request refresh background.
- Lock: chỉ 1 request được refresh cache, các request khác chờ.
- TTL với jitter (60s ± 10s) để không expire cùng lúc.

### 6.4 Tight coupling
Service A "gọi" service B trực tiếp. B down → A down.

**Fix**: event-driven. A publish event, B subscribe. B down → event tích lại trong queue, không kéo A chết.

### 6.5 Không có circuit breaker → cả mesh cùng chết
Microservice A,B,C,D,E. C chết. A,B,D,E vẫn cố gọi C → tốn thread, queue đầy → A,B,D,E lần lượt chết.

**Fix**: circuit breaker ở mọi outbound call.

### 6.6 Health check gọi DB
Mỗi 5s, 100 instance, mỗi check 1 query → 2000 QPS chỉ cho healthcheck. DB chậm → health check fail → instance bị remove → traffic dồn vào ít hơn → DB chậm hơn → cascading.

**Fix**: health check không gọi downstream. Cache trạng thái downstream với TTL.

---

## 7. Số RPO/RTO và availability — toán cơ bản

| Service | Uptime |
|---------|--------|
| 99% | 3.65 ngày down/năm |
| 99.9% ("three nines") | 8.76h |
| 99.95% | 4.38h |
| 99.99% ("four nines") | 52.6 phút |
| 99.999% ("five nines") | 5.26 phút |

**Composite availability**: nếu 2 service phụ thuộc nhau (cả 2 phải up), availability = A1 × A2.
- 99.99% × 99.99% × 99.99% × 99.99% = **99.96%**. 4 services 99.99% chain lại được 99.96%.

→ Hệ thống có nhiều dependency → đừng hứa nines cao trừ khi mỗi component có nhiều nines hơn nữa.

**RPO** (Recovery Point Objective): mất tối đa bao nhiêu data?
**RTO** (Recovery Time Objective): bao lâu thì up lại?

| Strategy | RPO | RTO | Cost |
|----------|-----|-----|------|
| Backup & restore | Giờ | Giờ | $ |
| Pilot light | Phút | 10s phút | $$ |
| Warm standby | Giây | Phút | $$$ |
| Active-active | ~0 | ~0 | $$$$ |

(Bài [[foundations-04-latency-vs-consistency]] đã đi sâu trade-off này.)

---

## 8. Ví dụ — design defenses cho 3 use case

### 8.1 API public-facing
- API Gateway throttle theo API key.
- Lambda concurrency limit per function (bulkhead).
- DynamoDB on-demand (không lo RCU/WCU).
- Circuit breaker cho mọi outbound (gọi 3rd-party).
- WAF rate-based rule chặn bot.

### 8.2 Payment processing
- SQS FIFO với dedup (idempotency).
- Lambda xử lý → outbound call payment provider có retry + circuit breaker.
- Outbox pattern: ghi DB + queue trong cùng transaction.
- DLQ + alarm khi message vào DLQ.

### 8.3 Internal microservice mesh
- App Mesh / Istio cho circuit breaker, retry policy.
- mTLS để defend giả mạo.
- Health check 2 tầng.
- Chaos testing hàng tuần với AWS FIS.

---

## 9. Cạm bẫy đề thi (SAA)

1. **"Multi-AZ = không bao giờ down"** → **Sai**. Multi-AZ giảm RPO/RTO không phải 0. Cascading failure có thể vẫn xảy ra (xem mục 1).
2. **"Auto Scaling fix mọi vấn đề scale"** → **Sai**. Scale-out mất phút (bootstrap). Burst traffic vẫn drop. Cần buffer trước (warm pool, pre-warmed capacity).
3. **"DLQ là giải pháp"** → DLQ là **placeholder cho bug**, không phải fix. Cần monitor + alarm + root cause.
4. **"Retry là an toàn"** → Chỉ nếu **idempotent**. POST tạo order 2 lần = 2 đơn.
5. **"Health check pass = service healthy"** → Gray failure: pass health nhưng latency cao. Cần monitor p99 ngoài health check.
6. **"99.99% × 99.99% = 99.99%"** → **Sai**, ~99.98%. Composite availability giảm theo dependency count.

---

## 10. Tóm tắt 1 dòng

> Hệ phân tán **luôn fail** — câu hỏi chỉ là "fail thế nào". Defense in depth: timeout, retry với jitter, circuit breaker, bulkhead, idempotency, chaos testing. **Không có defense = cascading failure chỉ là vấn đề thời gian.**

---

## 11. Bài tập tự kiểm tra

1. Hệ thống của bạn có 5 microservice, mỗi cái SLA 99.95%. Composite SLA là bao nhiêu? Nếu cần 99.99% end-to-end, làm gì?
2. Bạn thấy DLQ tăng đều đặn 100 msg/h. Hành động đầu tiên là gì? (Không phải "tăng worker".)
3. Cache TTL 5 phút. Bạn quan sát mỗi 5 phút DB CPU spike. Vì sao? 3 cách fix?
4. Lambda gọi DynamoDB throttle, retry. Sau 10 phút, DynamoDB OK nhưng Lambda vẫn lỗi. Nguyên nhân có thể? (≥2 nguyên nhân)
5. Bạn dùng SQS standard. Consumer đọc message, xử lý 5 phút, ack. Visibility timeout mặc định 30s. Vấn đề gì xảy ra?
6. Service A gọi B đồng bộ. B response p50=50ms, p99=2s. A có timeout 5s. Tại sao A vẫn có thể chết khi B chậm?

---

## 12. Đọc thêm

- *Release It!* — Michael Nygard (kinh điển về stability patterns).
- AWS Builder's Library — gần như **mọi bài** đều liên quan: *Timeouts, retries, and backoff with jitter*, *Avoiding fallback in distributed systems*, *Workload isolation*, *Caching challenges and strategies*, *Implementing health checks*.
- *Google SRE Book* — chương về cascading failures, overload, addressing failure.
- Marc Brooker (AWS) blog — nhiều bài về metastable failure & feedback loops.
- AWS Well-Architected — Reliability Pillar.

---

**Chúc mừng!** Bạn đã hoàn thành 6 bài foundations về distributed systems. Giờ khi vào SAA-C03, mỗi service bạn học sẽ "có chỗ đứng" trong khung tư duy CAP / consistency / replication / partition / failure mode — thay vì memorize rời rạc.

**Đề xuất bài tiếp**: trở lại course CLF-C02 finish (nếu chưa xong), hoặc bắt đầu series SAA chuyên sâu — *Reliability Pillar*, *Performance Pillar*, *Security Pillar* của AWS Well-Architected.
