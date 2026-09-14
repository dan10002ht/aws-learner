# Case study: Distributed Email Service

> Email là hệ thống phân tán **cổ nhất còn sống** mà bạn sẽ phải thiết kế lại. Nó ra đời trước web, chạy trên một giao thức được viết năm 1982 (SMTP, RFC 821), và không có chủ sở hữu — không ai "sở hữu" email theo cách Meta sở hữu Messenger. Đó chính là cái bẫy của bài này: bạn **không được phép tự định nghĩa giao thức**. Bạn phải nói chuyện với hàng triệu máy chủ mail khác trên đời, phần lớn cấu hình sai, một phần đáng kể là kẻ xấu, và tất cả đều có quyền quyết định thư của bạn vào Inbox hay vào Spam — hoặc bị vứt im lặng.

Hầu hết ứng viên đi thẳng vào "web server + database + object store" rồi vẽ ba cái hộp. Nhưng bài này có **ba chỗ khó thật**, và không chỗ nào nằm ở tầng web:

1. **Metadata store** — access pattern của email không giống bất cứ thứ gì bạn đã thiết kế: đọc theo thư mục và sắp theo thời gian, dữ liệu cô lập theo từng người dùng, cần "giao dịch nhẹ", và một cột có thể nặng vài MB. Đây là lý do Gmail phải tự xây trên BigTable chứ không dùng MySQL.
2. **Deliverability** — phần *không có trong sơ đồ nào cả* nhưng quyết định sống chết. Một hệ thống hoàn hảo về kỹ thuật mà bị Gmail/Outlook xếp vào spam thì bằng không. Đây là phần 90% ứng viên bỏ qua và là chỗ ghi điểm mạnh nhất.
3. **Search** — tìm kiếm email là nghịch đảo của tìm kiếm web: mỗi người một không gian dữ liệu riêng biệt, ghi nhiều hơn đọc, và người dùng đòi kết quả **tức thì và chính xác** chứ không phải "liên quan nhất".

Nếu chỉ nhớ một câu cho cả bài: **email là một hệ thống hàng tỉ cơ sở dữ liệu tí hon, mỗi người một cái, bị ràng buộc bởi một giao thức bạn không kiểm soát.**

---

## 1. Nền tảng bắt buộc: email hoạt động thế nào

Bài này khác mọi case study khác ở một điểm: **thiếu kiến thức nền là bạn thiết kế sai ngay từ hộp đầu tiên**. Không thể "suy ra" SMTP từ nguyên lý chung. Nên ta dành hẳn một mục cho phần này — và trong phỏng vấn, trình bày gọn phần này trong 3–4 phút là cách nhanh nhất để chứng minh bạn hiểu domain chứ không đang đọc thuộc khuôn mẫu.

### 1.1 SMTP — giao thức **gửi**

SMTP (Simple Mail Transfer Protocol) là giao thức **đẩy (push)**: máy gửi chủ động mở kết nối TCP tới máy nhận và đẩy thư sang. Nó xuất hiện ở hai vị trí khác nhau mà người ta hay lẫn:

| Vị trí | Cổng | Ai nói với ai | Đặc điểm |
|---|---|---|---|
| **Submission** | 587 (STARTTLS), 465 (implicit TLS) | Client của bạn → server của bạn | **Bắt buộc xác thực**. Đây là lúc "bấm Send" |
| **Relay / MTA-to-MTA** | 25 | Server của bạn → server người nhận | **Không xác thực được** — server lạ trên Internet. Đây là gốc của mọi vấn đề spam |

Cổng 25 là trái tim và cũng là vết thương của email: bất kỳ máy nào trên Internet cũng có thể mở kết nối tới cổng 25 của bạn và nói *"tôi là paypal.com, đây là thư cho khách hàng của anh"*. Giao thức gốc **không có cơ chế xác minh danh tính người gửi**. Toàn bộ SPF/DKIM/DMARC ở §9 là những lớp vá dán chồng lên lỗ hổng này trong 40 năm.

Một phiên SMTP tối giản trông như sau — đáng nhớ vì mã trả lời của nó quyết định logic retry ở §8:

```
S: 220 mx.gmail.com ESMTP ready
C: EHLO mail.ourservice.com
S: 250-mx.gmail.com
   250-SIZE 35882577
   250-STARTTLS
   250 8BITMIME
C: STARTTLS
   ... (bắt tay TLS) ...
C: MAIL FROM:<alice@ourservice.com>
S: 250 2.1.0 OK                      ← envelope sender (Return-Path)
C: RCPT TO:<bob@gmail.com>
S: 250 2.1.5 OK                      ← envelope recipient
C: DATA
S: 354 Go ahead
C: (headers + body ... kết thúc bằng một dòng chỉ có dấu chấm)
C: .
S: 250 2.0.0 OK  queued as 4Nx2kL     ← NHẬN TRÁCH NHIỆM từ đây
C: QUIT
```

Ba điều rút ra, cả ba đều ảnh hưởng tới thiết kế:

**Envelope khác header.** `MAIL FROM` / `RCPT TO` là *phong bì*; `From:` / `To:` trong DATA là *tờ giấy bên trong*. Chúng **không bắt buộc trùng nhau** — vừa là tính năng (mailing list, forward, bounce) vừa là lỗ hổng (phishing). Người nhận nhìn `From:` header, còn SPF lại kiểm `MAIL FROM` envelope; khoảng cách đó chính là lý do DMARC phải tồn tại (§10.1). Bcc cũng sống ở đây: nó **không phải header**, chỉ là một dòng `RCPT TO` thêm vào mà không ghi vào header.

**Thời điểm chuyển giao trách nhiệm.** Trước `250 OK queued`, thư là trách nhiệm của bạn; sau mã đó là của họ. Nghĩa là ACK rồi làm mất thư là vi phạm hợp đồng cốt lõi của email — ràng buộc này quyết định thứ tự ghi ở §9: **persist rồi mới ACK, không bao giờ ngược lại.**

**Mã trả lời có ba lớp, và lớp giữa là thứ khiến email đặc biệt:**

| Mã | Nghĩa | Ta phải làm gì |
|---|---|---|
| `2xx` | Thành công | Xong. Ghi vào Sent |
| `4xx` | **Lỗi tạm thời** (greylisting, server bận, quota đầy tạm) | **Retry backoff mũ**, giữ trong queue tới 48–72 giờ |
| `5xx` | Vĩnh viễn (`550 no such user`, `552 quá lớn`, `554 bị chặn`) | **Không retry**. Sinh bounce, gỡ địa chỉ khỏi danh sách |

> 💡 **Nguyên tắc**: `4xx` không phải lỗi, nó là **lời hẹn**. Greylisting — chiến thuật chống spam phổ biến — cố tình trả `451 try again later` cho lần gửi đầu, vì bot spam thường không retry còn MTA thật thì có. Hệ thống coi mọi lỗi là vĩnh viễn sẽ mất 10–20% thư hợp lệ ngay ngày đầu chạy thật.

### 1.2 POP3 vs IMAP — giao thức **nhận**, và vì sao IMAP thắng

SMTP chỉ đưa thư *tới server* người nhận. Việc lấy thư từ server về client là một bài toán khác, và lịch sử có hai câu trả lời:

| | **POP3** (RFC 1939) | **IMAP** (RFC 3501) |
|---|---|---|
| Mô hình tinh thần | **Tải về rồi xoá** — hộp thư là đường ống | **Đồng bộ** — hộp thư là nguồn sự thật trên server |
| Nơi thư "sống" | Trên máy client | Trên server |
| Nhiều thiết bị | ❌ Hỏng hoàn toàn. Điện thoại tải trước → laptop không thấy | ✅ Mọi thiết bị thấy cùng một trạng thái |
| Trạng thái đã đọc / gắn cờ | Chỉ tồn tại cục bộ | Là **trạng thái server**, đồng bộ tới mọi thiết bị |
| Thư mục | Chỉ có một Inbox | Nhiều thư mục, tạo/đổi tên/di chuyển được |
| Tải từng phần | ❌ Tải nguyên thư mới đọc được tiêu đề | ✅ `FETCH BODYSTRUCTURE` — lấy header trước, tải attachment khi cần |
| Tìm kiếm phía server | ❌ | ✅ `SEARCH` |
| Băng thông | Tải một lần, sau đó offline | Cao hơn, cần kết nối thường xuyên |
| Gánh nặng server | **Rất nhẹ** — server là ống dẫn, xoá xong là hết | **Nặng** — server phải lưu toàn bộ thư + trạng thái mãi mãi |

POP3 thắng ở thập niên 90 vì lý do kinh tế: dung lượng server đắt kinh khủng và mỗi người chỉ có **một** máy tính, nên mô hình "tải về rồi xoá" biến server thành hạ tầng gần như không tốn gì. Hai thứ lật ngược điều đó: **giá lưu trữ sụp đổ** (Gmail ra mắt 2004 với 1 GB miễn phí), và **người ta có nhiều thiết bị** — khoảnh khắc có cả điện thoại lẫn laptop, mô hình POP3 vỡ vụn vì trạng thái đã đọc chỉ tồn tại cục bộ.

> 💡 IMAP thắng không phải vì "nhiều tính năng hơn" mà vì nó đặt **nguồn sự thật (source of truth) ở server**. Đó chính xác là quyết định kiến trúc mà bài này xây quanh: nếu server là nguồn sự thật cho hàng tỉ hộp thư, thì metadata store là component khó nhất — và ta quay lại đúng §6.

**Vậy còn HTTP?** Webmail (Gmail, Outlook Web) và app di động hiện đại **không dùng IMAP** để nói với server của chính mình — chúng dùng REST/gRPC trên HTTPS cộng WebSocket. Lý do rất thực dụng: IMAP là giao thức stateful, có phiên, cú pháp cổ, khó qua proxy/CDN, khó phân trang linh hoạt, và không mang được các khái niệm hiện đại (conversation thread, label thay vì folder, smart categories). Ta vẫn **phải** hỗ trợ IMAP/POP3 cho client bên thứ ba (Thunderbird, Apple Mail, Outlook desktop) và **bắt buộc** phải hỗ trợ SMTP cho trao đổi liên server — nhưng đường đi chính của client của ta là HTTP.

```
       ┌──────────────┐   HTTPS/WSS   ┌────────────────┐
       │ Web / Mobile │ ────────────▶ │  Hệ thống của   │
       │  (của ta)    │               │       ta        │
       └──────────────┘               │                 │
       ┌──────────────┐  IMAP/POP3    │                 │
       │ Thunderbird  │ ────────────▶ │                 │
       └──────────────┘               │                 │
                                      │                 │
       ┌──────────────┐   SMTP :25    │                 │
       │ gmail.com    │ ◀───────────▶ │                 │
       │ outlook.com  │               └────────────────┘
       └──────────────┘
        (KHÔNG kiểm soát được — phải tuân thủ tuyệt đối)
```

> ⚠️ **Bẫy phỏng vấn**: người phỏng vấn hay nói "giả sử dùng HTTP cho đơn giản" (sách Alex Xu cũng vậy). Đừng hiểu nhầm thành *"không cần SMTP"*. HTTP thay thế IMAP cho **client của ta**; SMTP thì **không thể bỏ**, vì không có nó bạn không nhận được thư từ gmail.com. Nói rõ ranh giới này ghi điểm ngay.

### 1.3 DNS và MX record — làm sao thư tìm được đường

Khi ta gửi thư tới `bob@gmail.com`, hệ thống của ta phải trả lời: *"máy nào trên Internet chịu trách nhiệm nhận thư cho gmail.com?"* Câu trả lời nằm ở **MX record** (Mail Exchanger) trong DNS:

```
$ dig MX gmail.com +short
5  gmail-smtp-in.l.google.com.
10 alt1.gmail-smtp-in.l.google.com.
20 alt2.gmail-smtp-in.l.google.com.
30 alt3.gmail-smtp-in.l.google.com.
40 alt4.gmail-smtp-in.l.google.com.
```

Số đứng trước là **priority** — **nhỏ hơn là ưu tiên cao hơn** (đây là chỗ dễ nhớ ngược). MTA thử máy có priority thấp nhất trước; nếu không kết nối được thì tụt xuống máy tiếp theo. Nếu nhiều bản ghi cùng priority, chia tải ngẫu nhiên giữa chúng. Tức là **DNS chính là load balancer + failover lớp ngoài cùng của email**, được xây sẵn vào giao thức từ 1986 — miễn phí, toàn cầu, không cần component nào của ta.

Ngoài MX, ta còn phải quản trị thêm ba loại bản ghi nữa — chúng không phải chi tiết vận hành vặt mà là **một phần của thiết kế**, vì thiếu chúng thì §9 sụp:

| Bản ghi | Kiểu | Dùng để |
|---|---|---|
| `MX` | MX | Chỉ máy nhận thư cho domain |
| `SPF` | TXT | Liệt kê IP nào **được phép** gửi thư nhân danh domain |
| `DKIM` | TXT tại `selector._domainkey` | Công bố public key để người nhận xác minh chữ ký |
| `DMARC` | TXT tại `_dmarc` | Chính sách khi SPF/DKIM fail + địa chỉ nhận báo cáo |
| `PTR` (reverse DNS) | PTR | Ánh xạ IP → hostname. **Thiếu là bị từ chối thẳng** ở nhiều nhà cung cấp |

### 1.4 Cấu trúc một email: header, body, MIME, attachment

Email trên đường truyền là **văn bản thuần US-ASCII**. Toàn bộ ảnh, PDF, tiếng Việt có dấu, HTML — mọi thứ — phải được nhồi vào khuôn văn bản đó. Đây là lý do có MIME, và là lý do attachment "25 MB" thực ra **không** chiếm 25 MB trên dây.

```
Return-Path: <alice@ourservice.com>          ← envelope sender, server thêm vào
Received: from mail.ourservice.com ...        ← MỖI hop thêm một dòng, trên cùng là mới nhất
DKIM-Signature: v=1; a=rsa-sha256; d=ourservice.com; s=s1; bh=...; b=...
Message-ID: <7BA04B2A-430C-4D12-8B57-862103C34501@ourservice.com>   ← DANH TÍNH TOÀN CẦU
In-Reply-To: <CAEWTXuPfN=LzECjDJtgY9Vu03kgFvJnJUSHTt@gmail.com>
References: <abc@x.com> <def@y.com> <CAEWTXuPfN=...@gmail.com>
Date: Tue, 14 Apr 2026 09:12:44 +0700
From: "Alice Nguyen" <alice@ourservice.com>
To: "Bob" <bob@gmail.com>
Cc: <carol@yahoo.com>
Subject: =?UTF-8?B?QsOhbyBjw6FvIHF1w70gMQ==?=      ← RFC 2047: tiếng Việt trong header
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="MIXED-BOUNDARY"

--MIXED-BOUNDARY
Content-Type: multipart/alternative; boundary="ALT-BOUNDARY"

--ALT-BOUNDARY
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

Ch=C3=A0o Bob, b=C3=A1o c=C3=A1o =C4=91=C3=ADnh k=C3=A8m nh=C3=A9.

--ALT-BOUNDARY
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

<html><body>Ch=C3=A0o Bob...</body></html>
--ALT-BOUNDARY--

--MIXED-BOUNDARY
Content-Type: application/pdf; name="baocao-q1.pdf"
Content-Disposition: attachment; filename="baocao-q1.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5ndGggNiAwIFIvRmlsdGVy...
--MIXED-BOUNDARY--
```

Những chi tiết **có hệ quả thiết kế**, không phải trang trí:

- **`Message-ID` là danh tính toàn cầu, bất biến**, do máy gửi sinh. Ta dùng nó để khử trùng lặp khi nhận (retry SMTP có thể giao cùng một thư hai lần) và để dựng chuỗi hội thoại (§7.6). **Không bao giờ dùng làm khoá chính** — nó do bên ngoài sinh, có thể trùng, thiếu, hoặc bị giả mạo.
- **`Received` là log phân tán có sẵn**: mỗi MTA *thêm* một dòng lên trên cùng. Đọc ngược từ dưới lên là có toàn bộ hành trình kèm timestamp — công cụ debug deliverability số một.
- **`multipart/alternative` vs `mixed`**: `alternative` = *cùng nội dung, nhiều định dạng, client chọn một* (plain + HTML); `mixed` = *nhiều thứ khác nhau, hiện hết* (nội dung + attachment). Nhầm chỗ này là hiển thị nội dung hai lần.
- **Base64 phình 33%.** Attachment 25 MB thật → ~34 MB trên dây; vì thế nhà cung cấp quảng cáo `SIZE 35882577` cho giới hạn "25 MB". **Kiểm tra kích thước phải làm trên kích thước đã mã hoá**, không thì ta chấp nhận thư rồi bị từ chối `552` — tự sinh bounce cho chính người dùng của mình.
- **Header cũng bị mã hoá** (RFC 2047, cái `=?UTF-8?B?...?=` kia) → **không tìm kiếm được trên byte thô của header**, phải giải mã trước khi lập chỉ mục. Lỗi kinh điển của hệ thống search email tự xây.

---

## 2. Làm rõ yêu cầu

### Functional

| # | Yêu cầu | Ghi chú phạm vi |
|---|---|---|
| 1 | **Gửi và nhận email** | Cả nội bộ (user của ta → user của ta) lẫn liên miền qua SMTP |
| 2 | **Đọc thư theo thư mục** | Inbox, Sent, Drafts, Trash, Spam + thư mục do người dùng tạo. Phân trang, sắp theo thời gian giảm dần |
| 3 | **Thao tác trạng thái** | Đánh dấu đã đọc/chưa đọc, gắn sao, di chuyển giữa thư mục, xoá |
| 4 | **Attachment tới 25 MB** | Tải lên, tải xuống, nhiều file mỗi thư |
| 5 | **Full-text search** | Trên nội dung + header (from/to/subject), có bộ lọc (`has:attachment`, `is:unread`) |
| 6 | **Chống spam và virus** | Cả chiều vào (bảo vệ người dùng) lẫn chiều ra (bảo vệ danh tiếng của ta) |
| 7 | **Thông báo realtime** | Thư mới hiện ra mà không cần F5 |
| 8 | **Conversation thread** | Gom thư trả lời qua lại thành một chuỗi |

Cố ý **bỏ ngoài phạm vi** nhưng nên nói ra: xác thực/đăng nhập, lịch và danh bạ, mã hoá đầu cuối kiểu PGP/S/MIME (nó **phá vỡ** search phía server và quét virus — một trade-off đáng nêu một câu), và giao diện quản trị doanh nghiệp.

### Non-functional

| Thuộc tính | Mục tiêu | Nó dẫn dắt thiết kế thế nào |
|---|---|---|
| **Reliability** | **Mất một thư đã ACK là sự cố nghiêm trọng** | Ràng buộc số một. Persist trước, ACK sau. Replication ≥3, ghi qua commit log |
| **Availability** | 99,99% cho đọc | Nhưng xem §11: ta **cố ý đổi một phần availability lấy consistency** cho luồng ghi metadata |
| **Consistency** | Read-your-own-writes là **bắt buộc** | Đánh dấu đã đọc rồi F5 thấy lại chưa đọc = bug, không phải "eventual" |
| **Scalability** | 1 tỉ user, tăng trưởng tuyến tính | Dữ liệu **cô lập theo user** → shard theo `user_id` là hiển nhiên và rất đẹp |
| **Latency** | Mở thư mục < 200 ms; thư mới hiện < 1 s | Cache thư gần đây; WebSocket đẩy thay vì poll |
| **Deliverability** | > 99% thư hợp lệ vào Inbox, không phải Spam | **Không đo được bằng metric nội bộ**. Xem §9 |
| **Durability** | 11 số 9 cho attachment | Object store, không phải local disk |

### Giả định chốt

```
- 1 tỉ user đăng ký, ~25% hoạt động hằng ngày (250 triệu DAU)
- Mỗi người GỬI  ~10 thư/ngày
- Mỗi người NHẬN ~40 thư/ngày   ← bất đối xứng 1:4, hệ quả của mailing list + newsletter + máy sinh
- Metadata trung bình mỗi thư (header + body text): ~50 KB
- 20% thư có attachment, trung bình 500 KB/thư có attachment
- Giữ thư VĨNH VIỄN (mô hình Gmail), không tự động xoá
- Đọc: người dùng chỉ thực sự mở ~20% số thư nhận; 90% lượt đọc rơi vào thư của 30 ngày gần nhất
```

> 💡 Giả định "đọc 20%, 90% tập trung ở 30 ngày gần nhất" không phải chi tiết mềm — nó là **giả định sinh lợi nhất cả bài**. Nó cho phép: (a) cache tầng nóng chỉ cần chứa ~1 tháng dữ liệu, (b) phân tầng lưu trữ theo tuổi thư, (c) và quan trọng nhất — chấp nhận rằng **phần lớn dữ liệu ta lưu sẽ không bao giờ được đọc lại**, nên tối ưu đường ghi quan trọng hơn tối ưu đường đọc thư cũ.

---

## 3. Back-of-envelope estimation

### QPS gửi và nhận

```
GỬI:
  1 tỉ × 10 thư/ngày = 10 tỉ thư/ngày
  10e9 ÷ 86.400 ≈ 115.000 thư/s trung bình
  peak ×3 (giờ hành chính, lệch múi giờ)  ≈ 350.000 thư/s

NHẬN (đầu vào SMTP):
  1 tỉ × 40 = 40 tỉ sự kiện giao thư/ngày ≈ 460.000/s TB, peak ≈ 1,4 triệu/s
  ⚠️ nhưng 60–80% lưu lượng tới cổng 25 trên Internet thật là SPAM
     → phải chặn RẤT SỚM, trước khi chạm bất kỳ thứ gì tốn kém

ĐỌC (API mở thư mục / mở thư):
  250 triệu DAU × ~40 lượt thao tác/ngày = 10 tỉ/ngày ≈ 115.000 rps, peak ≈ 350.000 rps
```

Con số 350.000 thư/s ở đường gửi nghe to, nhưng **nó không phải chỗ nghẽn**. Chỗ nghẽn nằm ở chỗ khác hẳn, và đây là nhận xét đáng nói sớm:

```
Số kết nối SMTP đồng thời ra ngoài:
  mỗi lần giao thư mất ~200 ms đến vài giây (DNS + TCP + TLS + DATA)
  giả sử trung bình 1 s/kết nối, 350.000 thư/s
  → ~350.000 kết nối TCP ĐỒNG THỜI mở ra Internet, liên tục
```

Đó mới là con số định hình kiến trúc: SMTP outgoing worker phải là **I/O-bound, concurrency cực cao, event-driven** (Go/Rust/Netty/async), không phải thread-per-connection. Và vì mỗi domain đích có giới hạn kết nối riêng, ta cần **queue theo domain** chứ không phải một queue phẳng (§8.3).

### Storage

```
METADATA (header + body text):
  40 tỉ thư nhận/ngày × 50 KB = 2 PB/ngày thô
  Nhưng: một thư gửi tới 1 người thì lưu 2 bản (Sent của người gửi + Inbox người nhận)
  Khử trùng lặp nội bộ và nén (text nén ~4:1) → giữ ~25%
  → ~500 TB/ngày ≈ 180 PB/năm

ATTACHMENT:
  20% × 40 tỉ = 8 tỉ file/ngày × 500 KB = 4 PB/ngày
  Dedupe theo content hash (§10) cắt ~30–40% với mailing list nội bộ
  → ~2,5 PB/ngày ≈ 900 PB/năm

TỔNG ≈ 1 EB (exabyte) MỖI NĂM, trong đó ~85% là attachment
```

> 💡 Đây là kết luận thứ nhất và nó rất quan trọng: **về số byte, bài này là bài object storage**; nhưng ta sẽ không tốn một phút deep dive nào cho nó, vì lưu blob bất biến là bài toán **đã được giải** (S3, 11 số 9, ném vào là xong). 15% còn lại — metadata — mới là chỗ phải thiết kế, vì nó **mutable, cần giao dịch, cần sắp xếp, cần truy vấn**.

### Metadata theo dòng và theo user

```
Số dòng metadata mới/ngày: ~50 tỉ (thư nhận + bản Sent + bản ghi index)
Sau 5 năm: ~90 nghìn tỉ dòng

Nhưng bóc theo user thì con số dễ chịu hẳn:
  40 thư/ngày × 365 × 5 năm ≈ 73.000 thư/user sau 5 năm
  73.000 × 50 KB ≈ 3,6 GB metadata/user
  + attachment ≈ 7 GB/user
  → ~11 GB/user
```

Đây là **kết luận thứ hai, và là chìa khoá của cả bài**: dữ liệu của một người dùng — kể cả sau 5 năm — chỉ vài GB, tức **vừa gọn trong một node**. Không có truy vấn nào cần join dữ liệu giữa hai người dùng. Không có "bảng xếp hạng toàn cục", không có "feed trộn từ nhiều người". Điều đó cho ta món quà mà news feed hay social graph không bao giờ có:

> 💡 **`user_id` là partition key hoàn hảo.** Mọi truy vấn đường nóng nằm gọn trong một partition; mọi "giao dịch" (di chuyển thư giữa thư mục + cập nhật bộ đếm chưa đọc) nằm gọn trong một partition; thêm node là thêm năng lực tuyến tính, không có truy vấn xuyên shard nào phải xử lý. Bài này **scale ngang gần như hoàn hảo** — và đó là lý do phần khó còn lại không phải "scale", mà là *chọn đúng mô hình dữ liệu* và *deliverability*.

### Băng thông

```
Vào:  4 PB/ngày attachment ÷ 86.400 ≈ 46 GB/s, peak ~140 GB/s
Ra:   người dùng chỉ tải ~20% attachment họ nhận → ~10 GB/s, peak ~30 GB/s
```

Băng thông không phải ràng buộc chi phối như trong bài Google Drive, nhưng nó nói một điều: **attachment không được đi qua application server**. Client phải PUT/GET thẳng object store bằng presigned URL, còn server chỉ cầm cái tham chiếu.

---

## 4. API design

Ba nhóm API tách bạch, vì chúng chạm ba hệ thống lưu trữ khác nhau và có đặc tính độ trễ khác nhau.

```
── Thư mục và danh sách thư (metadata store) ─────────────────────────
GET  /v1/folders
     → [{ id, name, type: "system"|"user", unread_count, total_count }]
     Loại system theo RFC 6154: All, Archive, Drafts, Flagged, Junk, Sent, Trash

GET  /v1/folders/{folder_id}/messages?cursor={c}&limit=50
     → { messages: [{ message_id, thread_id, from, subject, snippet,
                      has_attachment, is_read, ts }],
         next_cursor }
     ⚠️ Cursor dựa trên clustering key (timestamp giảm dần), KHÔNG phải OFFSET.
        OFFSET 100.000 trên một hộp thư 73.000 thư là tự sát.

GET  /v1/messages/{message_id}
     → { message_id, thread_id, headers{}, body_html, body_text,
         attachments: [{ id, filename, size, content_type, url }] }

── Thay đổi trạng thái ────────────────────────────────────────────────
POST   /v1/messages/{id}/read        { is_read: true }
POST   /v1/messages/{id}/move        { to_folder_id }
DELETE /v1/messages/{id}             (→ Trash, xoá thật sau 30 ngày)
POST   /v1/batch                     { op: "move"|"read"|"delete", ids: [...] }
       ↑ bắt buộc có: người dùng chọn 500 thư rồi bấm xoá là chuyện thường

── Gửi ───────────────────────────────────────────────────────────────
POST /v1/attachments/upload-url      { filename, size, content_type }
     → { attachment_id, presigned_put_url, expires_in: 900 }
     Client PUT THẲNG lên object store — không qua server của ta

POST /v1/messages                    Idempotency-Key: <uuid từ client>
     { to: [...], cc: [...], bcc: [...], subject, body_html, body_text,
       attachment_ids: [...], in_reply_to?: "<msg-id>" }
     → 202 Accepted { message_id, status: "queued" }
     ⚠️ 202 chứ KHÔNG phải 200: việc giao thư là bất đồng bộ, có thể mất giờ

── Tìm kiếm (search store) ────────────────────────────────────────────
GET /v1/search?q=...&folder=...&has_attachment=true&after=2026-01-01&cursor=...

── Realtime ──────────────────────────────────────────────────────────
WSS /v1/stream
     server → client: { type: "new_message", folder_id, message_id, unread_count }
                      { type: "message_updated", message_id, is_read }
```

Hai chi tiết đáng bảo vệ trong phỏng vấn:

**`202 Accepted` thay vì `200 OK`.** Bấm Send không có nghĩa thư đã tới. Nó có nghĩa ta **nhận trách nhiệm** giao thư. Trả `200 OK` là nói dối với client về một việc có thể mất 48 giờ và vẫn thất bại. Trạng thái thật của một thư đi ra là một máy trạng thái: `queued → sending → delivered | deferred | bounced`.

**`Idempotency-Key` trên POST /v1/messages.** Người dùng bấm Send, mạng rớt giữa chừng, app tự retry. Không có khoá idempotent thì Bob nhận hai bản. Đây là bug ai cũng gặp và ít ai nhắc trong phỏng vấn.

---

## 5. Vì sao kiến trúc mail server truyền thống không scale

Trước khi vẽ kiến trúc phân tán, phải hiểu rõ cái ta đang thay thế — và phải nói được **chính xác nó vỡ ở đâu**, chứ không chỉ "nó không scale".

```
   ┌──────────────────────────── MỘT MÁY ────────────────────────────┐
   │                                                                  │
   │   Postfix / Sendmail (MTA)        Dovecot / Courier (IMAP,POP3)  │
   │           │                                 │                    │
   │           ▼                                 ▼                    │
   │   ┌─────────────────────────────────────────────────────┐        │
   │   │  Hệ thống file cục bộ                                │        │
   │   │   /var/mail/alice/  cur/  new/  tmp/   ← Maildir     │        │
   │   │        1745823001.M12P4.mx,S=48213:2,S               │        │
   │   │        1745823077.M88P4.mx,S=12044:2,                │        │
   │   │   /var/mail/bob/    (mbox: TẤT CẢ thư trong MỘT file)│        │
   │   └─────────────────────────────────────────────────────┘        │
   └──────────────────────────────────────────────────────────────────┘
```

Mô hình này **hoạt động rất tốt** cho một công ty 500 người — và đó là điều nên thừa nhận trước, vì nó cho thấy bạn hiểu ngưỡng chứ không chê bai theo phản xạ. Nó có những ưu điểm thật: cực đơn giản, không phụ thuộc gì, backup bằng `rsync`, và `grep` là công cụ tìm kiếm.

Nó vỡ ở bốn chỗ, theo đúng thứ tự này:

| Thứ tự vỡ | Điều gì xảy ra | Vì sao |
|---|---|---|
| **1. Disk IOPS** | Nghẽn đầu tiên, rất sớm | Mỗi thư là **một file**. Mở Inbox 50 thư = 50 lần `open`+`read`+`close` rải rác. Một hộp thư 73.000 file làm thư mục phình, `readdir` chậm dần. Ở `mbox` còn tệ hơn: **khoá toàn bộ file** khi ghi → hai thư về cùng lúc phải xếp hàng |
| **2. Dung lượng một máy** | Không thêm được user | Đĩa lớn nhất mua được là hữu hạn. Vượt qua là phải mua máy thứ hai — mà kiến trúc này **không có khái niệm "máy thứ hai"** |
| **3. Tìm kiếm** | Không khả thi | `grep` qua 73.000 file cho **mỗi** truy vấn tìm kiếm, của **mỗi** người dùng. Không có index vì hệ thống file không phải cơ sở dữ liệu |
| **4. Điểm chết đơn (SPOF)** | Mất dữ liệu và mất dịch vụ | Đĩa hỏng = mất thư. Máy sập = **toàn bộ** user trên máy đó mất dịch vụ, kể cả nhận thư (SMTP đích không kết nối được → thư bị deferred, tới 72 giờ sau thì bounce) |

> ⚠️ **Bẫy thường gặp**: *"cứ shard theo user, mỗi shard một máy Postfix là xong"*. Nó chỉ dời vấn đề: mỗi máy vẫn là SPOF cho nhóm user của nó, rebalance khi thêm máy là chép hàng TB file, hộp thư nóng vẫn đè chết một máy, và vẫn **không có tìm kiếm**. Thứ ta cần không phải nhiều máy Postfix mà là **tách rời tính toán khỏi lưu trữ** — điều hệ thống file cục bộ về bản chất không cho phép.

Nhận xét quan trọng nhất, và là câu chuyển ý vào kiến trúc mới: **mô hình truyền thống gắn chặt "nơi xử lý thư" với "nơi lưu thư"**. Mọi thứ còn lại của bài này là hệ quả của việc gỡ hai thứ đó ra khỏi nhau.

---

## 6. High-level design

```
                                    ┌──────────────────────────────────┐
  ┌───────────┐                     │       INTERNET (SMTP :25)        │
  │ Web /     │                     │  gmail · outlook · yahoo · spam  │
  │ Mobile    │                     └───────────┬──────────────────────┘
  └─────┬─────┘                                 │
        │ HTTPS + WSS                           │ vào
        ▼                                       ▼
  ┌───────────────┐                    ┌──────────────────┐
  │ Load Balancer │                    │  SMTP Load Bal.  │  ← IP nằm trong MX
  │  (HTTP/WS)    │                    │  (NLB, lớp 4)    │
  └───┬───────┬───┘                    └────────┬─────────┘
      │       │                                 │
      │       └──────────────┐         ┌────────▼─────────┐
      ▼                      ▼         │  SMTP workers    │ ── chặn sớm:
┌───────────────┐   ┌────────────────┐ │  (nhận thư)      │    RBL, rate limit,
│  Web servers  │   │ Realtime srv   │ └────────┬─────────┘    SPF/DKIM, SIZE
│  (CRUD REST)  │   │ (WebSocket)    │          │
└───┬───┬───┬───┘   └───────▲────────┘          ▼
    │   │   │               │           ┌───────────────┐
    │   │   │               │           │ Incoming queue│
    │   │   │               │           └───────┬───────┘
    │   │   │               │                   ▼
    │   │   │               │           ┌────────────────────────┐
    │   │   │               │           │  Mail processing       │
    │   │   │               │           │  spam · virus · rule   │
    │   │   │               │           │  · thread · index      │
    │   │   │               │           └───┬────────────┬───────┘
    │   │   │               └───────────────┘            │
    │   │   │              (đẩy "thư mới")               │
    │   │   ▼                                            ▼
    │   │  ┌──────────────────────────────────────────────────────┐
    │   │  │  METADATA STORE  —  NoSQL column-family               │
    │   │  │  partition key = user_id, sort key = time-UUID        │
    │   │  │  (Cassandra / HBase / BigTable) · replica 3 · multi-AZ│
    │   │  └──────────────────────────────────────────────────────┘
    │   │
    │   ▼
    │  ┌──────────────────┐     ┌──────────────────┐
    │  │ Distributed cache│     │  Search store    │ ← cập nhật async qua
    │  │ (thư 30 ngày,    │     │  (ES, shard theo │   change-log/Kafka
    │  │  unread counter) │     │   user_id)       │
    │  └──────────────────┘     └──────────────────┘
    │
    ▼
  ┌──────────────────────┐        ┌──────────────────────────┐
  │  Attachment store    │        │  Outgoing queue          │
  │  (object store,      │        │  (phân theo domain đích) │
  │   key = sha256)      │        └────────────┬─────────────┘
  │  client PUT/GET      │                     ▼
  │  thẳng bằng presign  │        ┌──────────────────────────┐
  └──────────────────────┘        │ SMTP outgoing workers    │ ──▶ MX của
                                  │ retry 4xx · bounce 5xx   │     người nhận
                                  │ DKIM sign · IP pool      │
                                  └──────────────────────────┘
```

Điểm cần nêu rõ khi trình bày sơ đồ này: **có hai mặt tiền (front door) hoàn toàn tách biệt.** Mặt tiền HTTP phục vụ client của ta — ta kiểm soát cả hai đầu, muốn đổi gì cũng được. Mặt tiền SMTP cổng 25 phục vụ Internet — ta không kiểm soát gì cả, phải tuân thủ tuyệt đối, và phần lớn lưu lượng tới đó là rác. Trộn hai mặt tiền này vào cùng một tầng server là sai lầm kiến trúc: chúng khác nhau về mô hình bảo mật, về hình dạng lưu lượng, về cách scale, và về hậu quả khi quá tải.

Vai trò từng thành phần, và **vì sao nó tồn tại**:

| Thành phần | Vì sao phải có nó |
|---|---|
| **Web servers** | Stateless CRUD — mọi trạng thái ở store, nên scale ngang tuỳ ý và deploy không làm ai rớt |
| **Realtime servers** | Tách riêng vì WebSocket **stateful và sống lâu**. Trộn chung thì mỗi lần deploy REST là ngắt hàng trăm triệu kết nối |
| **SMTP LB + workers** | Tầng chịu tấn công. Phải **từ chối rẻ**: RBL, rate limit, SPF, SIZE — tất cả *trước khi* đọc DATA |
| **Incoming queue** | Tách "nhận trách nhiệm" khỏi "xử lý". Đã ACK `250 OK` là phải giữ được thư, kể cả khi bộ lọc spam đang sập |
| **Mail processing** | Phần tốn CPU: quét virus, chấm điểm spam, rule người dùng, dựng thread, đẩy index. Scale độc lập |
| **Metadata store** | §7 — phần khó nhất |
| **Attachment store** | Blob bất biến, địa chỉ bằng nội dung → dedupe và cache miễn phí |
| **Cache** | 90% lượt đọc rơi vào 30 ngày gần nhất → hit rate rất cao. Cũng giữ bộ đếm chưa đọc |
| **Search store** | §11. Cập nhật **bất đồng bộ** để đường ghi không bị index kéo chậm |
| **Outgoing queue + workers** | §8. Giao thư là bất đồng bộ theo bản chất, có thể mất 72 giờ |

---

## 7. Deep dive 1 — Metadata store (phần khó nhất)

Đây là chỗ bài này khác mọi case study khác, và là chỗ nên dành nhiều thời gian nhất. Sai ở đây thì không component nào khác cứu được.

### 7.1 Access pattern — tại sao email "không giống ai"

Trước khi chọn cơ sở dữ liệu, phải mô tả **hình dạng** của tải. Sáu đặc tính, và mỗi cái loại bỏ một lựa chọn:

| # | Đặc tính | Hệ quả |
|---|---|---|
| 1 | **Mọi truy vấn đều là "đọc thư mục X của user Y, mới nhất trước, 50 dòng"** | Ta cần dữ liệu **đã được sắp xếp sẵn trên đĩa theo thời gian**, không phải sắp lúc truy vấn. Điều này trỏ thẳng tới clustering key |
| 2 | **Dữ liệu cô lập tuyệt đối theo user** | Không có join xuyên user. `user_id` là partition key hoàn hảo (§3) |
| 3 | **Header nhỏ, đọc rất nhiều; body to, đọc đúng một lần** | Nên **tách** header và body thành hai đơn vị lưu trữ. Đọc danh sách 50 thư mà kéo theo 50 × 50 KB body là lãng phí 100 lần |
| 4 | **Một "cột" có thể nặng vài MB** (body HTML của newsletter) | Loại bỏ các store tối ưu cho giá trị nhỏ. Cần hệ chịu được giá trị lớn mà không phân mảnh |
| 5 | **Cần "giao dịch nhẹ"** | Di chuyển thư giữa hai thư mục + cập nhật hai bộ đếm chưa đọc phải nguyên tử — nhưng **chỉ trong một user**. Không cần giao dịch phân tán, chỉ cần giao dịch trong một partition |
| 6 | **Ghi nhiều hơn người ta tưởng** | 50 tỉ dòng/ngày, và mỗi thao tác đánh dấu đã đọc cũng là một lần ghi. Cần đường ghi rẻ → **LSM-tree**, không phải B-tree |
| 7 | **Mất dữ liệu là không chấp nhận được** | Replication ≥3, ghi qua commit log bền, quorum |

### 7.2 So sánh các lựa chọn

| Lựa chọn | Mạnh | Vì sao **không** chọn ở quy mô này |
|---|---|---|
| **RDBMS sharded** (MySQL/Postgres) | Giao dịch ACID thật, index linh hoạt, `WHERE is_read=false` là chuyện vặt, ai cũng biết vận hành | **B-tree ghi đắt**: mỗi insert là random write + cập nhật nhiều index. Ở 50 tỉ dòng/ngày, write amplification giết IOPS. Bảng vài nghìn tỉ dòng khiến index không nằm vừa RAM. Thêm shard là thao tác thủ công đau đớn; failover vài chục giây. Body vài MB thành TOAST/BLOB làm phình page. **Vẫn đúng cho vài triệu user — sai cho một tỉ** |
| **Object store thuần** (mỗi thư một object) | Rẻ nhất, durability sẵn, dung lượng vô hạn | Không liệt kê theo thứ tự thời gian hiệu quả, không có bộ đếm, không đánh dấu đã đọc, không giao dịch. LIST trên prefix là O(n). **Hợp làm tầng lạnh và backup, không hợp làm store chính** |
| **Document store** (MongoDB) | Mô hình dữ liệu tự nhiên cho thư, có index phụ | Khá hợp, nhưng ở quy mô này việc cân bằng shard và độ trễ ghi kém hơn column-family. Index phụ toàn cục trở thành gánh nặng đúng lúc ta **không cần** chúng |
| **NoSQL column-family** ✅ (Cassandra / HBase / BigTable) | **LSM-tree → ghi tuần tự, rất rẻ.** Partition key + clustering key cho ra *"lấy N dòng mới nhất của user X"* mà không sort. Wide row chứa được cột vài MB. Scale ngang thêm node là xong. Replication + tunable consistency có sẵn | Đánh đổi: **không truy vấn được trên cột không phải khoá** → phải denormalize (§7.4). Không có join. Không có giao dịch đa partition. **Tất cả những thứ ta không cần** |
| **Tự xây** (cái Gmail thật sự làm) | Tối ưu đúng IOPS của email, gộp search vào luôn | Nhiều năm kỹ thuật. Trong phỏng vấn: **nêu ra như lựa chọn đúng ở quy mô Google, rồi nói vì sao ta không chọn** |

> 💡 Cách phát biểu quyết định này cho gọn: *"Email có đúng một hình dạng truy vấn — lấy N dòng mới nhất trong một partition thuộc một user. Tôi chọn column-family vì nó cho tôi chính xác hình dạng đó với chi phí ghi thấp nhất, và tôi sẵn sàng trả giá bằng việc mất truy vấn linh hoạt — vì tôi **không có** truy vấn linh hoạt nào cả."*

> ⚠️ Đừng nói "NoSQL scale tốt hơn SQL". Đó là câu trả lời của người học thuộc. Câu trả lời của người hiểu là: *"đường ghi của tôi là 50 tỉ dòng/ngày với pattern append-theo-thời-gian; LSM-tree hợp với nó còn B-tree thì không — và tôi không đánh đổi gì cả vì tôi vốn không dùng tới index phụ hay join."*

### 7.3 Thiết kế bảng

Quy ước: `K` = partition key, `C` = clustering key (thứ tự sắp xếp trong partition).

**Bảng `folders`** — danh sách thư mục của một người, kèm bộ đếm:

```
folders
┌──────────┬───────────┬──────────────┬──────────────┬──────────────┐
│ user_id K│ folder_id C│ folder_name  │ unread_count │ total_count  │
├──────────┼───────────┼──────────────┼──────────────┼──────────────┤
│ u_1029   │ f_inbox   │ Inbox        │ 37           │ 12.483       │
│ u_1029   │ f_sent    │ Sent         │ 0            │ 3.011        │
│ u_1029   │ f_work    │ Công việc    │ 4            │ 892          │
└──────────┴───────────┴──────────────┴──────────────┴──────────────┘
  → toàn bộ thư mục của một user nằm trong MỘT partition, một lần đọc
  ⚠️ unread_count là COUNTER — xem §7.5, đây là chỗ dễ sai nhất
```

**Bảng `emails`** — chỉ **header và tóm tắt**, đủ để render danh sách:

```
emails
┌──────────┬───────────┬──────────────┬──────────┬──────────┬──────────┬──────────┐
│ user_id K│ folder_id K│ email_id C ▼ │ from     │ subject  │ snippet  │ has_att  │
├──────────┼───────────┼──────────────┼──────────┼──────────┼──────────┼──────────┤
│ u_1029   │ f_inbox   │ tuuid_9f2... │ bob@...  │ Báo cáo  │ "Chào…"  │ true     │
│ u_1029   │ f_inbox   │ tuuid_7a1... │ carol@…  │ Re: Họp  │ "OK em…" │ false    │
└──────────┴───────────┴──────────────┴──────────┴──────────┴──────────┴──────────┘
  Partition key = (user_id, folder_id)  ← thư mục là một phần của khoá, không phải cột
  Clustering key = email_id là TimeUUID, sắp GIẢM DẦN
```

Hai quyết định đáng giải thích. **Vì sao `folder_id` nằm trong partition key chứ không phải là một cột?** Vì truy vấn luôn có dạng "thư mục X". Nếu nó là cột thường, ta phải quét cả partition rồi lọc — Cassandra thậm chí **cấm** làm vậy nếu không `ALLOW FILTERING`. Đưa vào khoá biến truy vấn thành một lần đọc tuần tự đúng chỗ. Giá phải trả: **di chuyển thư giữa thư mục = xoá ở partition cũ + ghi ở partition mới**, chứ không phải `UPDATE` một cột — đánh đổi tốt, vì người ta mở thư mục nhiều gấp hàng nghìn lần di chuyển thư.

**Vì sao `email_id` là TimeUUID?** Vì nó gộp định danh duy nhất *và* thứ tự thời gian. Clustering giảm dần nghĩa là **dòng mới nhất nằm ngay đầu partition trên đĩa** — "lấy 50 thư mới nhất" là đọc 50 dòng liền kề, không seek, không sort. Phân trang thành *"cho tôi 50 dòng có `email_id` nhỏ hơn cursor"*, ổn định cả khi có thư mới chen vào giữa hai lần lật trang (điều `OFFSET` không làm được).

**Vì sao tách body ra bảng riêng?** Vì §7.1 đặc tính 3:

```
email_bodies
┌──────────┬──────────────┬───────────────┬────────────┬────────────┐
│ user_id K│ email_id C   │ body_html     │ body_text  │ raw_headers│
└──────────┴──────────────┴───────────────┴────────────┴────────────┘
  Chỉ đọc khi người dùng THỰC SỰ mở thư (~20% số thư)
```

Render một trang Inbox chạm bảng `emails` và không bao giờ chạm `email_bodies`. Nếu gộp chung, mỗi lần liệt kê 50 thư là kéo 50 × 50 KB = 2,5 MB từ đĩa để hiển thị 50 dòng tiêu đề — lãng phí gần 100 lần, ở mọi lượt xem trang, của 250 triệu người.

**Bảng `attachments`** — metadata, không chứa byte:

```
attachments
┌──────────┬──────────────┬──────────────┬──────────┬──────────┬──────────────────┐
│ user_id K│ email_id C   │ filename C   │ size     │ mime     │ blob_key (sha256)│
└──────────┴──────────────┴──────────────┴──────────┴──────────┴──────────────────┘
  blob_key trỏ vào object store. NHIỀU dòng có thể trỏ cùng một blob → dedupe (§11)
```

### 7.4 Denormalize: cái giá của column-family

Yêu cầu "hiện thư chưa đọc" tầm thường trong SQL: `WHERE is_read = false`. Trong column-family thì **không lọc được trên cột không phải khoá**. Đọc hết rồi lọc trong bộ nhớ là bất khả thi với hộp thư 73.000 thư; index phụ của Cassandra lại dở đúng ở cardinality thấp (`is_read` chỉ có 2 giá trị) — nó tạo partition khổng lồ và tra cứu tán xạ khắp cụm. Nên ta chọn cách thứ ba: **bảng denormalize**, ghi hai lần để đọc một lần.

```
unread_emails                        (đường nóng: badge "37 chưa đọc" + bộ lọc Unread)
┌──────────┬───────────┬──────────────┬──────────┬──────────┐
│ user_id K│ folder_id K│ email_id C ▼ │ from     │ subject  │
└──────────┴───────────┴──────────────┴──────────┴──────────┘

read_emails  — cùng cấu trúc (tuỳ chọn; chỉ cần nếu bộ lọc "chỉ thư đã đọc" đủ phổ biến)
```

Đánh dấu một thư là đã đọc trở thành: xoá dòng khỏi `unread_emails`, (tuỳ chọn) chèn vào `read_emails`, giảm `unread_count` trong `folders`. Ba thao tác, cùng một `user_id`, nên **cùng một partition** → gói trong một logged batch của Cassandra là được nguyên tử ở mức cần thiết. Đây chính là "giao dịch nhẹ" ở §7.1 đặc tính 5: ta không cần 2PC, ta chỉ cần nguyên tử trong phạm vi một người dùng — và mô hình dữ liệu đã bảo đảm điều đó *vì partition key là `user_id`*.

> 💡 **Nguyên tắc của column-family**: bạn không thiết kế bảng rồi viết truy vấn; bạn **liệt kê truy vấn rồi thiết kế một bảng cho mỗi truy vấn**. Dư thừa dữ liệu không phải lỗi thiết kế — nó là *cách thanh toán*. Đĩa rẻ; random read ở quy mô này thì không.

### 7.5 Bộ đếm chưa đọc — cái bẫy nhỏ mà đau

`unread_count` bị đọc ở **mọi** lần render và ghi ở **mọi** thao tác, và nó có ba vấn đề thường chỉ lộ ra trên production. (1) **Counter của Cassandra không idempotent** — một lệnh tăng timeout rồi retry thì không biết lần đầu đã áp dụng chưa. Cách chữa: coi counter là **cache tái tạo được**, giữ thật ở Redis (`INCR`/`DECR`), cộng job nền tính lại từ `unread_emails` để tự chữa lành. (2) **Hộp thư nóng** — `support@` nhận 100 thư/giây làm một dòng bị ghi 100 lần/giây; chữa bằng **sharded counter** (N dòng con, ghi ngẫu nhiên, đọc thì cộng lại). (3) **Đếm chính xác không đáng giá** — Gmail hiện "99+" là có lý do: trên một ngưỡng, con số chính xác không thêm thông tin nhưng lại đòi hỏi nhất quán mạnh.

### 7.6 Email threading — dựng chuỗi hội thoại

Người dùng nghĩ theo *cuộc trò chuyện*, giao thức thì chỉ biết *từng thư rời rạc*. Việc ghép chúng lại là một thuật toán thật, và nó dựa trên ba header ở §1.4:

```
Message-ID:  <D@ourservice.com>            ← danh tính của CHÍNH thư này
In-Reply-To: <C@gmail.com>                 ← CHA trực tiếp (một giá trị)
References:  <A@x.com> <B@y.com> <C@gmail.com>   ← ĐƯỜNG ĐI từ gốc tới cha
```

Cây hội thoại tái dựng được từ chúng:

```
   A  "Kế hoạch Q2"                         References của D = [A, B, C]
   ├── B  "Re: Kế hoạch Q2"                 ⇒ gốc là A ⇒ D thuộc thread của A
   │   └── C  "Re: Kế hoạch Q2"
   │       └── D  "Re: Kế hoạch Q2"   ← thư vừa tới
   └── E  "Re: Kế hoạch Q2"  (rẽ nhánh: hai người trả lời cùng lúc)
```

Thuật toán chuẩn là **JWZ** (Jamie Zawinski, viết cho Netscape Mail năm 1997, tới nay vẫn là tham chiếu). Rút gọn còn ba bước có thể trình bày trong 60 giây:

1. **Dựng container theo `Message-ID`.** Mỗi thư một node. Nếu `References` nhắc tới một `Message-ID` ta chưa có (thư đó bị xoá, hoặc người dùng chỉ được Cc ở giữa chuỗi), vẫn **tạo node rỗng** làm chỗ móc — đây là mấu chốt khiến JWZ khác các cách làm ngây thơ: cây phải chịu được lỗ hổng.
2. **Nối cha–con theo `References`**, đọc từ cuối lên (phần tử cuối là cha trực tiếp). Dùng `In-Reply-To` làm dự phòng khi `References` thiếu. Trước khi nối phải **kiểm tra chu trình** — header là dữ liệu bên ngoài, có thể bị dựng để tạo vòng lặp; nối mù là treo cả tiến trình indexing.
3. **Gom nhóm dự phòng theo subject đã chuẩn hoá** (bỏ tiền tố `Re:`, `Fwd:`, `RE:`, `回复:`, khoảng trắng). Chỉ dùng khi bước 2 thất bại, vì có client cũ không sinh `References`.

> ⚠️ Bước 3 là **con dao hai lưỡi** và đây là chỗ nên tự nêu trước khi bị hỏi: gom theo subject sẽ nhét chung mọi thư tên *"Xin chào"* hoặc *"Hỏi giá"* từ những người xa lạ vào một chuỗi. Ràng buộc thực tế: chỉ gom theo subject khi các thư **cùng tập người tham gia** và **cách nhau dưới ~7 ngày**. Nêu được giới hạn này cho thấy bạn đã va vào nó thật.

Lưu trữ thì đơn giản: mỗi thư mang thêm cột `thread_id` (bằng `Message-ID` của gốc, chuẩn hoá thành id nội bộ), và một bảng phụ để mở cả chuỗi bằng một lần đọc:

```
threads
┌──────────┬────────────┬──────────────┬──────────┬──────────────┬─────────────┐
│ user_id K│ thread_id K│ email_id C ▼ │ from     │ ts           │ is_read     │
└──────────┴────────────┴──────────────┴──────────┴──────────────┴─────────────┘
```

Và một điểm dễ bỏ sót: **`thread_id` là cục bộ theo từng người dùng.** Alice và Bob có thể thấy hai chuỗi hội thoại khác nhau cho cùng một cuộc trao đổi, vì Bob bị Cc vào từ giữa chuỗi nên không có các thư đầu. Điều này **đúng và mong muốn** — nó là hệ quả trực tiếp của việc phân vùng theo `user_id`, và cố gắng tạo một thread toàn cục là đi ngược lại toàn bộ mô hình dữ liệu.

---

## 8. Deep dive 2 — Luồng gửi thư

```
 ① POST /v1/messages ──▶ LB (rate limit theo user: N thư/giờ)
                          │
                          ▼
 ② Web server: validation RẺ, đồng bộ
      · kích thước sau base64 ≤ 35 MB      · địa chỉ đúng cú pháp
      · quota gửi của user                  · attachment_ids tồn tại trong object store
      ✗ fail → 4xx NGAY (người dùng còn ngồi đó, sửa được)
                          │
                          ▼
 ③ Ghi vào folder Sent (metadata store)  ← TRƯỚC khi enqueue. Người dùng phải
                          │                 thấy thư mình vừa gửi ngay lập tức
                          ▼
 ④ Enqueue vào OUTGOING QUEUE (phân theo domain đích) ──▶ 202 Accepted
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
 ⑤ Người nhận NỘI BỘ                 ⑥ Người nhận NGOÀI
    short-circuit: ghi thẳng vào        SMTP outgoing worker:
    Inbox người nhận, KHÔNG ra           · quét spam/virus chiều ra
    Internet. Vẫn phải quét spam.        · ký DKIM
    Tiết kiệm ~30% lưu lượng SMTP        · chọn IP pool theo loại thư
                                         · dig MX → TCP → STARTTLS → DATA
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                   2xx delivered        4xx deferred           5xx bounced
                   ghi trạng thái       retry backoff:         sinh DSN gửi
                   vào Sent             1m,5m,15m,1h,4h…       cho người gửi,
                                        bỏ cuộc sau 72h        gỡ địa chỉ khỏi
                                        → bounce               danh sách
```

**Vì sao bước ③ đứng trước ④?** Vì "thư đã vào Sent" là điều người dùng kiểm chứng được ngay, còn "thư đã tới Bob" thì không. Enqueue trước rồi ghi Sent sau, một sự cố giữa hai bước tạo ra thư đang trên đường đi mà người gửi không thấy dấu vết — không hiển thị được, không thu hồi được. Thứ tự ngược lại chỉ tạo rủi ro nhẹ: thư nằm trong Sent với trạng thái `queued`, một job dò tìm sẽ enqueue lại.

**Vì sao short-circuit nội bộ (⑤) đáng làm?** Với 1 tỉ user, xác suất người nhận cũng ở trên hệ thống ta rất cao; đi vòng ra Internet rồi quay lại là lãng phí DNS/TCP/TLS và đưa thư của ta ra trước bộ lọc spam của chính ta. ⚠️ Nhưng **vẫn phải quét spam** — tài khoản bị chiếm quyền là nguồn spam nội bộ, short-circuit không được thành đường vòng qua kiểm duyệt.

### 8.1 Vì sao phải có queue

Queue ở đây không phải để "giảm tải" — nó là **ranh giới giữa hai mô hình thời gian**. Người dùng sống ở thang mili giây; SMTP sống ở thang giờ. Không có queue, request HTTP phải mở kết nối tới gmail.com rồi chờ: gmail chậm 5 giây là hàng trăm nghìn request web server bị treo, retry không có chỗ để sống vì HTTP đã kết thúc, và một domain sập kéo sập toàn hệ thống. Có queue, web server trả 202 trong 30 ms và thậm chí không cần biết gmail tồn tại.

### 8.2 Retry và bounce

```
Máy trạng thái của một thư đi ra:

  queued ──▶ sending ──▶ delivered        (2xx — kết thúc, thành công)
     ▲          │
     │          ├──────▶ deferred  ──┐    (4xx — tạm thời)
     └──────────┘                     │
         backoff mũ + jitter  ◀───────┘
         1m → 5m → 15m → 1h → 4h → 8h → …
         bỏ cuộc sau 72h  ──▶ bounced

               └──────────▶ bounced       (5xx — vĩnh viễn, KHÔNG retry)
                             │
                             ▼
                        sinh DSN (RFC 3464) gửi về người gửi,
                        đồng thời ghi vào suppression list
```

Bốn chi tiết quyết định chất lượng phần này:

- **Jitter là bắt buộc.** Không có nó, khi một domain lớn phục hồi sau sự cố, toàn bộ hàng triệu thư deferred sẽ lao vào cùng một lúc — bạn tự DDoS họ, và họ chặn IP của bạn.
- **Phân biệt hard bounce và soft bounce.** Hard (`550 user unknown`) → đưa vào **suppression list vĩnh viễn**; gửi tiếp vào địa chỉ không tồn tại là tín hiệu spam mạnh nhất mà bạn có thể tự tạo ra. Soft (`452 mailbox full`) → thử lại, và chỉ chuyển thành hard sau nhiều lần liên tiếp.
- **Bounce phải đi qua `Return-Path`, không phải `From`.** Đây là lý do envelope tồn tại tách khỏi header (§1.1). Với thư gửi hàng loạt, dùng VERP (Variable Envelope Return Path — nhúng id người nhận vào địa chỉ envelope) để biết chính xác địa chỉ nào bounce mà không phải phân tích DSN bằng biểu thức chính quy.
- **Bounce là thư → nó cũng có thể bounce.** Nếu không chặn, hai server cấu hình sai tạo vòng lặp vô hạn. Quy ước: DSN gửi với `MAIL FROM:<>` (envelope rỗng), và thư có envelope rỗng thì **không bao giờ sinh bounce**.

### 8.3 Vì sao queue phải phân theo domain đích

Một queue phẳng có lỗi chí mạng: yahoo.com sập → hàng triệu thư yahoo tồn ở đầu queue → thư gửi gmail phía sau bị chặn theo. Đây là **head-of-line blocking**, và nó biến sự cố của người khác thành sự cố của bạn.

Ngoài ra mỗi nhà cung cấp áp giới hạn riêng (số kết nối đồng thời, số thư/kết nối, số thư/giờ trên mỗi IP). Ta phải tôn trọng giới hạn đó **chủ động** — vượt là bị throttle rồi bị chặn. Nên: một hàng đợi logic cho mỗi (domain đích × IP nguồn), mỗi hàng có bộ điều tiết riêng, cộng cơ chế **circuit breaker** — một domain trả 4xx liên tục thì giảm tốc thay vì đập cửa.

> 💡 Metric cần theo dõi không phải "độ dài queue" mà là **tuổi của thư cũ nhất trong mỗi hàng đợi domain**. Queue dài vì lưu lượng tăng là bình thường; thư nằm 4 giờ chưa gửi được là sự cố. Hai điều này trông giống nhau trên biểu đồ tổng.

---

## 9. Deep dive 3 — Luồng nhận thư

```
 Internet :25 ──▶ SMTP LB (NLB lớp 4) ──▶ SMTP workers
                                            │
   ┌────────────── LỌC SỚM, RẺ TRƯỚC ────────┴────────────────────┐
   │ trước EHLO : IP có trong RBL/blocklist?     → 554, đóng       │
   │ trước DATA : reverse DNS có?  SPF pass?     → 550             │
   │              rate limit theo IP?             → 421 slow down  │
   │              SIZE vượt 35 MB?                → 552            │
   │              RCPT TO có tồn tại?             → 550 (KHÔNG     │
   │                                  chấp nhận rồi bounce sau)    │
   └───────────────────────────┬───────────────────────────────────┘
                               ▼ qua được (≈20–40% lưu lượng)
               đọc DATA → attachment tách ra object store
                               │
                               ▼   rồi mới ──▶ 250 OK queued
                       ┌──────────────┐
                       │Incoming queue│
                       └───────┬──────┘
                               ▼
        ┌───────────────── Mail processing workers ──────────────┐
        │ ① xác thực: DKIM verify · DMARC align                  │
        │ ② quét virus (ClamAV/thương mại) trên attachment       │
        │ ③ chấm điểm spam (Bayes + reputation + ML)             │
        │ ④ áp rule của người dùng (chuyển thư mục, gắn nhãn)    │
        │ ⑤ dựng thread (§7.6) · khử trùng lặp theo Message-ID   │
        └───────┬───────────────┬──────────────┬────────────────-┘
                ▼               ▼              ▼
        metadata store   search index    realtime server
        (emails,         (async qua      ──▶ WebSocket đẩy
         unread_emails,   change-log)         "thư mới"
         folders counter)                 (offline → lấy khi online)
```

**Vì sao "lọc sớm, rẻ trước" là nguyên tắc tổ chức chứ không phải tối ưu vặt?** Vì 60–80% lưu lượng tới cổng 25 là rác. Nếu ta chấp nhận thư rồi mới chấm điểm spam, ta vừa nhân chi phí hạ tầng lên 3–5 lần một cách vô ích. Thứ tự kiểm tra đi từ rẻ tới đắt: tra IP trong blocklist (một lần tra cache, micro giây) → kiểm SPF (một truy vấn DNS) → kiểm SIZE (một con số trong `EHLO`) → xác minh DKIM (mã hoá bất đối xứng, tốn CPU) → quét virus (đắt nhất). Mỗi tầng giảm khối lượng cho tầng sau.

**Vì sao "RCPT TO không tồn tại → từ chối ngay" quan trọng?** Vì nếu chấp nhận rồi sinh bounce, ta trở thành **backscatter source**: spammer giả mạo địa chỉ nạn nhân làm người gửi, ta bounce về nạn nhân, và ta bị đưa vào blocklist. Từ chối tại `RCPT TO` đẩy trách nhiệm về đúng chỗ — server gửi.

**Vì sao ACK `250 OK` chỉ được trả sau khi thư đã bền?** Đây là ràng buộc ở §1.1: sau mã đó, người gửi có quyền quên thư đi. Nên thứ tự bắt buộc là: ghi attachment vào object store → ghi thư vào incoming queue (có replication, có persist) → **rồi mới** `250 OK`. Không bao giờ ACK dựa trên bộ nhớ.

> ⚠️ **Khử trùng lặp là bắt buộc, không phải tuỳ chọn.** Kịch bản: ta persist thư xong, `250 OK` bị mất trên đường về, server gửi timeout và retry → thư tới lần hai. Đây là chuyện *bình thường* trong SMTP. Khử trùng lặp bằng `(Message-ID, recipient)` trong một cửa sổ vài ngày. Vì `Message-ID` do bên ngoài sinh và có thể thiếu hoặc bị giả, dùng hash của `(Message-ID, envelope_from, rcpt, ngày)` an toàn hơn là tin nó trực tiếp.

---

## 10. Deep dive 4 — Deliverability: phần quyết định sống chết

Đây là phần không có trong sơ đồ kiến trúc nào và cũng không đo được bằng metric nội bộ — nhưng nếu làm sai, mọi thứ còn lại thành vô nghĩa. **Dựng một server gửi được thư mất một buổi chiều; khiến thư vào được Inbox chứ không phải Spam mất nhiều tháng.** Lý do: người quyết định không phải bạn, mà là thuật toán của Gmail/Outlook, và nó mặc định **không tin ai cả**.

### 10.1 Ba trụ xác thực

| | Xác minh cái gì | Cơ chế | Điểm yếu |
|---|---|---|---|
| **SPF** | *IP nào được gửi thay mặt domain* | TXT record liệt kê IP/dải được phép. Người nhận so IP kết nối với danh sách | **Vỡ khi forward**: A gửi B, B tự động chuyển tiếp cho C — IP của B không nằm trong SPF của A → fail. Chỉ kiểm envelope `MAIL FROM`, không kiểm `From:` mà người dùng nhìn thấy |
| **DKIM** | *Nội dung không bị sửa và thật sự do domain ký* | Người gửi ký header + body bằng private key, công bố public key ở `selector._domainkey`. Người nhận xác minh | Sống sót qua forward đơn giản, nhưng **vỡ nếu mailing list sửa subject hoặc chèn footer** |
| **DMARC** | *Buộc `From:` khớp với SPF/DKIM, và nói phải làm gì khi fail* | TXT ở `_dmarc`: `v=DMARC1; p=quarantine; rua=mailto:...` | Chỉ có tác dụng khi SPF hoặc DKIM **align** với domain trong `From:` |

DMARC là mảnh ghép khép kín lỗ hổng lớn nhất của §1.1: SPF và DKIM đều không bắt buộc kiểm cái header `From:` mà **người dùng thật sự nhìn thấy**. DMARC thêm yêu cầu *alignment* — domain trong `From:` phải khớp domain đã pass SPF hoặc DKIM. Không có DMARC, kẻ tấn công vẫn pass SPF bằng domain của chính hắn trong khi hiển thị `From: security@yourbank.com`.

Lộ trình triển khai trong thực tế — và đây là chi tiết chứng tỏ kinh nghiệm:

```
p=none        → chỉ thu thập báo cáo, không ảnh hưởng gì. Chạy 2–4 tuần
              (luôn có hệ thống gửi thư bạn đã quên: CRM, hoá đơn, monitoring)
p=quarantine  → fail thì vào Spam. Tăng dần pct=10 → 50 → 100
p=reject      → fail thì từ chối thẳng. Đích đến
```

> ⚠️ Bật `p=reject` ngay ngày đầu là cách nhanh nhất để chặn chính thư hoá đơn của công ty mình. `rua=` (báo cáo tổng hợp hằng ngày từ các nhà cung cấp lớn) là công cụ duy nhất cho bạn thấy **ai đang gửi thư nhân danh domain của bạn** — kể cả những hệ thống bạn không biết là tồn tại.

### 10.2 Danh tiếng IP và warming

Danh tiếng được tính trên hai trục: **IP** và **domain**. Chúng tích luỹ chậm và mất rất nhanh.

Một IP mới tinh là một ẩn số — và với bộ lọc spam, ẩn số đồng nghĩa đáng ngờ. Gửi 1 triệu thư từ IP chưa từng gửi gì trong ngày đầu là dấu hiệu kinh điển của botnet. **IP warming** là tăng khối lượng theo cấp số, mỗi ngày một bậc, để xây lịch sử:

```
Ngày 1: 50 thư     Ngày 4: 500      Ngày 10: 20.000    Ngày 20: 500.000
Ngày 2: 100        Ngày 6: 2.000    Ngày 14: 100.000   Ngày 30: đủ tải
Ngày 3: 250        Ngày 8: 5.000
Toàn bộ quá trình: 2–6 tuần. Và phải warm RIÊNG cho từng nhà cung cấp lớn —
Gmail, Outlook, Yahoo giữ reputation độc lập với nhau.
```

Ưu tiên trong giai đoạn warming: gửi cho **những người hay mở thư nhất trước**. Tín hiệu tương tác tích cực sớm dựng reputation nhanh hơn nhiều so với gửi đều cho toàn bộ danh sách.

### 10.3 Phân tách luồng theo loại thư

Đây là quyết định kiến trúc, không phải mẹo vận hành: **không bao giờ gửi thư giao dịch và thư tiếp thị từ cùng một IP pool.**

| Pool | Loại thư | Vì sao tách |
|---|---|---|
| **Transactional** | Đặt lại mật khẩu, hoá đơn, mã OTP | Tỉ lệ mở rất cao, tỉ lệ khiếu nại gần 0 → reputation xuất sắc. **Phải tới nơi**. Người dùng đang ngồi chờ |
| **Marketing** | Newsletter, khuyến mãi | Tỉ lệ khiếu nại cao hơn hàng chục lần. Một chiến dịch tệ làm hỏng reputation cả pool |
| **Bulk/notification** | Thông báo hệ thống, digest | Khối lượng lớn, tương tác thấp |

Nếu trộn chung: một chiến dịch marketing bị nhiều người bấm "Báo cáo spam" sẽ kéo reputation của cả IP xuống, và **email đặt lại mật khẩu bắt đầu rơi vào Spam**. Người dùng không đăng nhập được. Đó là một sự cố sản phẩm gây ra bởi một quyết định hạ tầng.

### 10.4 Feedback loop và vệ sinh danh sách

Các ISP lớn cung cấp **feedback loop (FBL)**: khi người dùng bấm "Báo cáo spam", họ gửi lại cho bạn một bản sao. Bạn phải đăng ký, và phải **xử lý tự động**: gỡ địa chỉ đó khỏi mọi danh sách trong vòng vài phút. Ngưỡng khiếu nại của Gmail là khoảng **0,3%** — vượt qua là bắt đầu bị lọc; 0,1% là mức nên giữ.

Bốn việc còn lại thuộc nhóm "không làm thì hỏng, làm thì không ai khen":

- **Suppression list là bắt buộc và toàn cục**: mọi hard bounce, mọi khiếu nại, mọi lần unsubscribe vào chung một danh sách chặn, kiểm tra **trước** mỗi lần gửi. Gửi lại vào địa chỉ đã hard bounce là tín hiệu xấu mạnh nhất.
- **Spam trap**: địa chỉ đã ngừng hoạt động nhiều năm được ISP tái kích hoạt làm bẫy. Gửi trúng là bằng chứng bạn không dọn danh sách. Cách tránh duy nhất: tự động loại bỏ địa chỉ không tương tác trong 6–12 tháng.
- **List-Unsubscribe header** (RFC 8058, một-cú-nhấp): người dùng huỷ đăng ký thay vì bấm "spam". Gmail và Yahoo **bắt buộc** với người gửi khối lượng lớn từ 2024.
- **Phát hiện tài khoản bị chiếm quyền theo thời gian thực**: một tài khoản đột ngột gửi 5.000 thư trong 10 phút phải bị chặn tự động. Ban spammer chậm một giờ là đủ để đốt reputation của cả một IP pool.

> 💡 **Câu chốt cho phần này**: *"Deliverability không phải tính năng, nó là **tài sản tích luỹ**. Nó được xây trong nhiều tháng và mất trong vài giờ, nên hệ thống phải coi reputation là một tài nguyên chung cần bảo vệ — đó là lý do tôi tách IP pool, tôi áp suppression list ở đường ghi chứ không ở đường gửi, và tôi chặn tài khoản bất thường tự động thay vì chờ người xem."*

---

## 11. Deep dive 5 — Tìm kiếm

### 11.1 Vì sao index ngược cho email khó hơn cho web

| | Tìm kiếm web | **Tìm kiếm email** |
|---|---|---|
| Phạm vi | Một index toàn cục khổng lồ | **Một tỉ index tí hon, cô lập tuyệt đối.** Không ai được thấy dữ liệu người khác |
| Sắp xếp | Theo độ liên quan | Chủ yếu **theo thời gian**, kèm bộ lọc (`is:unread`, `has:attachment`, `from:`) |
| Độ trễ index | Vài phút tới vài giờ là chấp nhận được | Thư vừa tới **phải tìm được gần như ngay** |
| Tỉ lệ đọc/ghi | Đọc áp đảo ghi | **Ghi áp đảo đọc**: mỗi thư đều phải index, nhưng người dùng hiếm khi tìm kiếm |
| Sai sót | Bỏ sót một trang là bình thường | Bỏ sót đúng cái thư người dùng đang tìm là **bug** |

Ba điểm giữa là gốc rễ của cái khó. Index ngược cổ điển hiệu quả nhờ **gom chung**: posting list của từ "hợp đồng" trải trên hàng triệu tài liệu, nén delta rất tốt. Ở email ta buộc phải **phân mảnh theo user** — posting list của "hợp đồng" trong hộp thư Alice chỉ có 30 phần tử, nên mất gần hết lợi ích nén và locality, đổi lấy sự cách ly dữ liệu bắt buộc. Và tỉ lệ ghi/đọc ngược đời khiến mọi trực giác về search engine sai: ta trả chi phí index cho **mọi** thư trong khi chỉ một phần nhỏ được tìm tới — đó là lý do đường index **phải bất đồng bộ**, nếu không ta đã đánh đổi độ trễ nhận thư (quan trọng) lấy độ trễ tìm kiếm (hiếm khi xảy ra).

### 11.2 Elasticsearch hay tự xây

```
Mail processing ──▶ change-log (Kafka) ──▶ indexer workers ──▶ ES cluster
                     (bất đồng bộ)                              routing = user_id
                                                                  │
GET /v1/search ──────────────────────────────────────────────────┘ (đồng bộ)
```

`routing = user_id` là chi tiết quan trọng: nó ép toàn bộ tài liệu của một người vào **một shard**, nên mọi truy vấn tìm kiếm chỉ chạm một shard thay vì tán xạ khắp cụm rồi gộp kết quả. Ở một tỉ user thì khác biệt này là sống còn — scatter-gather trên 500 shard cho mỗi truy vấn sẽ làm sập cụm.

| | **Elasticsearch/OpenSearch** | **Tự xây (LSM, gộp vào store chính)** |
|---|---|---|
| Thời gian ra mắt | Vài tuần | Nhiều năm |
| Tối ưu cho write-heavy | Segment merge tốn tài nguyên; refresh gần realtime tốn kém | Điều chỉnh được đúng theo pattern email |
| Hệ thống phải vận hành | **Một hệ thứ hai** + đường đồng bộ giữa hai bên | Một hệ duy nhất, không lệch dữ liệu |
| Nhất quán | **Eventual** — thư mới có thể chưa tìm thấy trong 1–2 s | Có thể index cùng lúc ghi |
| Chi phí ở EB scale | Rất cao (ES thích RAM) | Thấp hơn nhiều nếu làm đúng |
| Rủi ro | Thấp | Cao |

Cách tự xây là dùng **LSM-tree** cho chính index ngược: ghi tích trong memtable, flush thành segment bất biến, merge dần xuống tầng dưới. Đường ghi thuần tuần tự — đúng thứ email cần, và đúng thứ Cassandra/BigTable/RocksDB đã làm cho dữ liệu. Vì metadata store của ta **đã là** LSM, việc đặt index vào cùng hệ đó loại bỏ hẳn một lớp đồng bộ và một lớp lệch dữ liệu.

> 💡 Cách trả lời ghi điểm: *"Tôi bắt đầu với OpenSearch, routing theo `user_id`, cập nhật bất đồng bộ qua change-log. Nó đúng trong 2–3 năm đầu. Tôi cũng biết vì sao Gmail không dùng nó: chi phí vận hành hai hệ thống ở quy mô exabyte, và cơ hội gộp index vào chính LSM-tree của store. Nhưng đó là quyết định đúng **sau khi** đã có sản phẩm, không phải ngày đầu."*

⚠️ Một chi tiết dễ quên: **xoá.** Người dùng xoá thư thì index phải mất trong vài giây, không phải "eventual". Với ES, xoá là tombstone và tài liệu chỉ biến mất thật sau merge — nên phải lọc lại kết quả dựa trên metadata store trước khi trả về, nếu không người dùng tìm thấy thư mình vừa xoá.

---

## 12. Attachment: kích thước lớn và khử trùng lặp

**Đường đi của byte không bao giờ qua application server.** Client xin presigned URL, PUT thẳng lên object store, rồi gửi `attachment_id` kèm thư. Tương tự khi tải về. Với 46 GB/s vào lúc cao điểm, cho lưu lượng này đi qua server của ta là tự nhân chi phí và tự tạo nghẽn.

**Khử trùng lặp theo nội dung.** Key của object là `sha256(nội dung)`. Hệ quả trực tiếp: một file 20 MB gửi cho 200 người trong công ty được lưu **một lần**, không phải 200 lần. Bảng `attachments` của 200 người cùng trỏ về một `blob_key`.

```
attachment_blobs
┌────────────────────┬──────────┬──────────┬──────────────┬────────────┐
│ blob_key (sha256) K│ size     │ mime     │ ref_count    │ virus_scan │
└────────────────────┴──────────┴──────────┴──────────────┴────────────┘
```

Ba hệ quả phải nói kèm, vì dedupe không miễn phí:

- **Quét virus cũng dedupe theo.** Một file đã quét sạch thì 200 người sau không cần quét lại — tiết kiệm rất lớn trên thành phần đắt nhất của luồng nhận. Nhưng phải lưu **phiên bản định nghĩa virus** lúc quét, và quét lại khi định nghĩa cập nhật nếu blob vẫn còn được tham chiếu.
- **Xoá phải theo reference count**, không phải theo thư. Alice xoá thư không có nghĩa xoá blob — 199 người còn lại vẫn cần nó. Giảm `ref_count`, dọn rác bằng job nền quét blob có `ref_count = 0` quá N ngày. ⚠️ Bộ đếm tham chiếu **luôn** lệch theo thời gian; đừng xoá thẳng khi về 0, hãy đánh dấu và chờ.
- **Dedupe xuyên tenant là một existence oracle.** Nếu client hỏi *"blob này có sẵn chưa?"* trước khi upload, kẻ tấn công dò được sự tồn tại của một file cụ thể trên hệ thống. Cách chữa: **dedupe ở phía server** (luôn nhận upload, hợp nhất sau), mất chút băng thông nhưng oracle không tồn tại. Hoặc chỉ dedupe trong phạm vi một tổ chức.

**Thư quá lớn.** Nếu tổng vượt giới hạn, hai lựa chọn: từ chối ngay ở bước validation (rẻ, rõ ràng), hoặc tự động chuyển thành **link chia sẻ** (kiểu Google Drive) — thư mang một URL có thời hạn thay vì byte. Cách hai giữ được trải nghiệm nhưng ⚠️ tạo vấn đề mới: người nhận ngoài hệ thống phải truy cập được link, tức là một mặt phẳng phân quyền hoàn toàn khác.

---

## 13. Consistency, backup và tuân thủ

**Consistency — ta cố ý chọn C thay vì A.** Đây là một trong số ít hệ thống người dùng cuối mà điều đó đúng. Lý do: người dùng **hành động** dựa trên trạng thái họ thấy. Đánh dấu đã đọc rồi refresh thấy lại chưa đọc, hoặc xoá thư rồi thấy nó quay về, là bug — không phải "độ trễ đồng bộ". Cụ thể với Cassandra: ghi `QUORUM`, đọc `QUORUM` (W + R > N với N = 3) cho metadata; chấp nhận rằng khi mất quorum do phân vùng mạng, **một phần nhỏ người dùng tạm thời không sửa được trạng thái**. Họ vẫn đọc được thư cũ từ cache, và thư đến vẫn được nhận vào queue — tức là **suy giảm cục bộ, không mất mát**.

Ba loại dữ liệu, ba mức khác nhau, và việc phân biệt được chúng mới là câu trả lời hay:

| Dữ liệu | Mức | Vì sao |
|---|---|---|
| Metadata thư, cờ đã đọc, thư mục | **Strong (quorum)** | Người dùng ra quyết định dựa trên nó |
| Bộ đếm chưa đọc | **Eventual, tự chữa** | Sai lệch tạm thời vô hại; job nền tính lại |
| Search index | **Eventual (1–2 s)** | Đánh đổi rõ ràng để không làm chậm đường nhận thư |

**Backup.** Replication không phải backup — nó nhân bản cả lỗi logic. Ba tầng: (1) snapshot tăng dần của metadata store, lưu sang object store ở vùng khác; (2) versioning + object lock cho attachment, chống chính job dọn rác của ta xoá nhầm; (3) **thùng rác 30 ngày** ở tầng ứng dụng — lớp bảo vệ duy nhất mà người dùng thật sự dùng tới. Và quy tắc bất di bất dịch: **backup chưa từng khôi phục thử thì không phải backup.** Diễn tập khôi phục một hộp thư ngẫu nhiên định kỳ, tự động.

**GDPR và quyền được xoá.** Đây là chỗ kiến trúc va vào pháp lý theo cách khó chịu:

- **Xoá phải lan tới mọi nơi**: metadata store, bảng denormalize, cache, search index, backup, và attachment (giảm `ref_count`). Bỏ sót search index là lỗi kinh điển — dữ liệu "đã xoá" vẫn tìm thấy được.
- **Backup là vấn đề nan giải**: không thể sửa một snapshot bất biến. Cách xử lý được chấp nhận trong ngành: giữ **danh sách chặn (tombstone)** áp dụng khi khôi phục, cộng với chu kỳ giữ backup hữu hạn (ví dụ 90 ngày) để dữ liệu tự hết hạn.
- **Crypto-shredding**: mã hoá dữ liệu mỗi user bằng một khoá riêng; xoá user = **huỷ khoá**. Dữ liệu còn trên đĩa nhưng vĩnh viễn không đọc được. Đây là cách duy nhất giải quyết gọn bài toán backup, và là câu trả lời đáng nhớ khi bị hỏi về GDPR.
- **Data residency**: người dùng EU có thể bị yêu cầu lưu dữ liệu trong EU. May mắn là mô hình phân vùng theo `user_id` khiến việc này khả thi — gán user vào một cụm theo vùng. ⚠️ Nhưng thư **đi qua biên giới** theo bản chất của email; ranh giới cư trú áp cho dữ liệu lưu trữ, không phải cho việc truyền.

---

## 14. Bottleneck và failure mode

**Cái gì nghẽn trước?** Theo thứ tự xuất hiện thực tế:

1. **Số kết nối SMTP đi ra** (§3): ~350.000 kết nối đồng thời. Nghẽn ở số file descriptor, số cổng ephemeral, và khả năng xử lý DNS. Chữa: worker event-driven, cache DNS mạnh, gộp nhiều thư cùng domain vào một kết nối (pipelining).
2. **Lưu lượng spam vào cổng 25**: 3–5 lần lưu lượng hợp lệ. Chữa: lọc sớm và rẻ (§9), rate limit ở tầng L4.
3. **Fan-out ghi metadata**: mỗi thư nhận sinh ~4 lần ghi (`emails`, `unread_emails`, counter, index). Chữa: gói batch trong cùng partition, đẩy index ra bất đồng bộ.
4. **Hộp thư nóng**: `support@` hay một CEO. Partition đơn bị ghi dồn. Chữa: sharded counter, và tách partition theo `(user_id, folder_id, khoảng_thời_gian)` khi partition vượt ngưỡng.

**Component chết thì sao?**

| Chết | Hậu quả tức thì | Cách hệ thống chịu đựng |
|---|---|---|
| **Web server** | Không có — stateless | LB gỡ khỏi pool, health check |
| **Realtime server** | Mất đẩy thư mới | Client fallback long-polling; thư **không mất**, chỉ chậm hiện. Đây là suy giảm đúng đắn |
| **SMTP inbound worker** | Không nhận thư mới | Server gửi nhận `4xx` → họ **retry trong 72 giờ**. Giao thức tự có lưới an toàn. ⚠️ Nhưng đừng ACK nếu chưa persist được |
| **SMTP outbound worker** | Thư ứ trong queue | Không mất. Tăng consumer. Theo dõi **tuổi thư cũ nhất**, không phải độ dài queue |
| **Metadata store — mất một replica** | Không có | Quorum vẫn đạt với 2/3 |
| **Metadata store — mất quorum** | Một phần user không sửa được trạng thái | Đọc từ cache vẫn chạy; thư đến vẫn vào queue và replay khi hồi phục. Đây là cái giá của việc chọn C |
| **Cache** | Độ trễ tăng mạnh, tải store tăng đột ngột | ⚠️ **Thundering herd** — nguy hiểm hơn cả sự cố gốc. Cần request coalescing và khởi động lại cache theo từng phần |
| **Search store** | Không tìm kiếm được | Duyệt thư mục vẫn chạy bình thường. Index rebuild từ change-log. Tính năng phụ, không phải đường sống |
| **Object store** | Không mở/gửi được attachment | Thư vẫn đọc được phần text. Suy giảm cục bộ |
| **Mất cả một vùng** | Mất dịch vụ cho user thuộc vùng đó | Replication liên vùng + chuyển đổi; ⚠️ **RPO vài phút, phải nói rõ** thay vì hứa bằng 0 |

> ⚠️ **Chế độ hỏng tệ nhất không nằm trong bảng trên**: IP pool bị đưa vào blocklist lớn. Mọi máy chạy tốt, mọi dashboard xanh, và thư vẫn không tới được ai. Không có health check nội bộ nào phát hiện được. Đây là lý do phải giám sát **tín hiệu bên ngoài**: tỉ lệ bounce theo từng nhà cung cấp, Google Postmaster Tools, seed list (tài khoản thử ở mỗi nhà cung cấp lớn, kiểm tra tự động xem thư vào Inbox hay Spam), và báo cáo DMARC.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Gửi thư ra Internet (MTA outbound) | **SES** — SendEmail / SendRawEmail | Thay ta lo phần khó nhất: quan hệ với ISP, hạ tầng IP, ký DKIM, xử lý bounce. ⚠️ Tài khoản mới nằm trong **sandbox** (chỉ gửi tới địa chỉ đã xác minh, 200 thư/ngày) — phải xin thoát sandbox, và hạn mức tăng dần |
| Nhận thư từ Internet (MTA inbound) | **SES receiving** + rule set → S3 / SNS / Lambda | Ta trỏ MX record về endpoint SES. SES nhận thư, lưu thẳng object vào S3, kích hoạt Lambda. ⚠️ Chỉ có ở một số Region — kiểm tra trước khi chọn Region |
| Bounce & complaint | **SES → SNS topic** (`Bounce`, `Complaint`, `Delivery`) | Đây là **feedback loop tự động** ở §10.4. Bắt buộc phải đăng ký và xử lý — SES sẽ tạm ngưng tài khoản nếu tỉ lệ bounce > 5% hoặc complaint > 0,1%. Đẩy vào SQS rồi cập nhật suppression list |
| Suppression list | **SES account-level suppression** + bảng riêng của ta | SES tự chặn địa chỉ đã hard bounce trên toàn tài khoản. Ta vẫn nên giữ danh sách riêng để kiểm tra **trước khi** gọi API — rẻ hơn và kiểm soát được |
| Tách luồng transactional / marketing | **SES configuration set** + **dedicated IP pool** riêng cho mỗi loại | Đúng §10.3. Configuration set gắn với mỗi lần gửi, quyết định IP pool, nơi đẩy sự kiện, và chính sách TLS |
| IP warming | **Dedicated IP (managed)** hoặc dedicated IP tự quản | Managed để AWS tự chạy lịch warming — đúng cho phần lớn trường hợp. Tự quản khi cần kiểm soát chính xác lịch tăng tải. ⚠️ IP dùng chung (mặc định) reputation phụ thuộc khách hàng khác |
| Theo dõi deliverability | **SES Virtual Deliverability Manager (VDM)** | Cho thấy tỉ lệ vào Inbox theo từng nhà cung cấp, chẩn đoán theo domain — chính là "tín hiệu bên ngoài" ở §14 mà health check nội bộ không thấy |
| MX, SPF, DKIM, DMARC | **Route 53** (MX + TXT + CNAME) | DKIM qua **Easy DKIM**: SES sinh ba CNAME, tự xoay khoá. ⚠️ Nhớ `_dmarc` với `p=none` trước, và `MAIL FROM` domain riêng để SPF **align** cho DMARC |
| Hộp thư người dùng cuối (nếu là sản phẩm doanh nghiệp) | **WorkMail** | Khi yêu cầu là "cho nhân viên một hộp thư" chứ không phải "xây Gmail": IMAP/SMTP/EWS sẵn, tích hợp AD, tuân thủ sẵn. Nói ra để phân biệt *mua* và *xây* |
| Attachment store | **S3**, key = `sha256(content)` | Blob bất biến, durability 11 số 9, dedupe miễn phí nhờ địa chỉ theo nội dung. **Presigned URL** cho client PUT/GET thẳng — 46 GB/s không chạm server ta |
| Metadata store | **Keyspaces** (Cassandra-compatible) hoặc **DynamoDB** (PK `user_id#folder_id`, SK `email_id` TimeUUID) | Đúng mô hình §7. DynamoDB: `Query` với `ScanIndexForward=false` cho "mới nhất trước", `TransactWriteItems` cho thao tác nguyên tử trong một user, on-demand cho tải không đoán được. ⚠️ Giới hạn **item 400 KB** → body lớn phải để ngoài trong S3, đúng như §7.3 đã tách bảng |
| Bộ đếm chưa đọc, cache thư nóng | **ElastiCache (Redis/Valkey)** | `INCR`/`DECR` nguyên tử; cache 30 ngày gần nhất cho tỉ lệ hit rất cao. Cũng làm pub/sub cho thông báo |
| Outgoing queue | **SQS** (một hàng cho mỗi nhóm domain) + **DLQ** | Tách thang thời gian §8.1. Dùng nhiều hàng để tránh head-of-line blocking. ⚠️ SQS giữ tối đa **14 ngày** — đủ cho retry 72 giờ. `maxReceiveCount` → DLQ cho thư không gửi được |
| Incoming queue + xử lý | **SQS / Kinesis** → **Lambda** hoặc ECS | Lambda hợp với luồng sự kiện (áp rule người dùng, dựng thread). ⚠️ Quét virus và xử lý attachment lớn thì ECS/Fargate hợp hơn — Lambda giới hạn 15 phút và bộ nhớ tạm |
| Áp rule người dùng khi thư tới | **SES receipt rule → Lambda** | Rule set của SES đã là một cỗ máy quy tắc: theo người nhận, theo domain, kèm hành động (S3, SNS, Lambda, bounce, stop). Lambda cho logic phức tạp hơn |
| Search | **OpenSearch Service**, `routing = user_id` | §11.2. Cập nhật bất đồng bộ từ **DynamoDB Streams → Lambda**. ⚠️ Chi phí RAM là khoản lớn — cân nhắc UltraWarm cho dữ liệu cũ, và chỉ index thư của N năm gần nhất |
| Realtime đẩy thư mới | **API Gateway WebSocket API** | Có `@connections` để đẩy, không phải tự quản kết nối. ⚠️ Tính tiền **theo phút kết nối** — ở 250 triệu DAU phải tính kỹ; cân nhắc ALB + ECS tự quản hoặc **AppSync Events** |
| Quét virus | **GuardDuty Malware Protection for S3**, hoặc ECS chạy ClamAV | Kích hoạt theo sự kiện S3, kết quả gắn vào tag object. Kết quả cache theo `sha256` → dedupe quét như §12 |

**Ba câu chốt đáng nhớ:**

1. *"S3 giải phần to (85% byte là attachment bất biến), DynamoDB/Keyspaces giải phần khó (metadata mutable cần sắp xếp và giao dịch trong một user). Cái tôi thật sự thiết kế là ranh giới giữa hai cái đó."*
2. *"SES không phải 'API gửi mail'. Giá trị thật của nó là **reputation, IP pool và feedback loop** — đúng cái phần mà một hệ thống tự xây phải mất nhiều tháng mới có, và mất vài giờ để đánh mất."*
3. *"`user_id` làm partition key khiến bài này scale ngang gần như hoàn hảo: không truy vấn xuyên shard, không giao dịch phân tán, thêm node là thêm năng lực. Phần khó còn lại không phải scale, mà là mô hình dữ liệu và deliverability."*

---

## Cách trình bày khi phỏng vấn / review

1. **Dành 3–4 phút đầu cho nền tảng giao thức, và nói rõ vì sao.** *"Bài này khác các bài khác ở chỗ tôi không được tự định nghĩa giao thức — SMTP, MX, MIME là ràng buộc cho trước, và chúng quyết định hình dạng kiến trúc."* Rồi vẽ nhanh SMTP hai vị trí (587 có auth / 25 không auth), IMAP vs POP3 một câu, MX một câu. Người phỏng vấn phân loại bạn ngay ở đoạn này.

2. **Nêu ba mã trả lời SMTP và ý nghĩa của `4xx`.** *"`4xx` không phải lỗi, nó là lời hẹn — greylisting cố tình trả 451 cho lần đầu. Hệ thống coi mọi lỗi là vĩnh viễn sẽ mất 10–20% thư hợp lệ ngày đầu chạy thật."* Chi tiết nhỏ này chứng minh bạn đã vận hành mail thật.

3. **Ra số rồi bóc số.** Đừng dừng ở "1 EB/năm": *"85% là attachment — nhưng đó là bài đã giải, ném vào S3. 15% metadata mới là chỗ tôi thiết kế, vì nó mutable và cần giao dịch."* Rồi nêu con số ít người thấy: *"350.000 kết nối SMTP đồng thời ra Internet — đó mới là thứ định hình tầng worker, không phải QPS."*

4. **Phát biểu món quà của bài này thật sớm**: *"Dữ liệu email cô lập tuyệt đối theo user — vài GB mỗi người, không join xuyên user, không feed toàn cục. `user_id` là partition key hoàn hảo, nên scale ngang gần như miễn phí. Vậy phần khó không phải scale."* Câu này vừa cho thấy bạn đã tính, vừa dọn đường để dành thời gian cho đúng chỗ khó.

5. **Dành nhiều thời gian nhất cho metadata store, và dẫn dắt bằng access pattern chứ không bằng tên công nghệ.** Liệt kê sáu đặc tính ở §7.1 trước, rồi mới nói "vậy nên tôi chọn column-family". ⚠️ Tuyệt đối tránh câu *"NoSQL scale tốt hơn SQL"* — thay bằng: *"đường ghi của tôi là 50 tỉ dòng/ngày kiểu append-theo-thời-gian; LSM hợp, B-tree không. Và tôi không mất gì cả, vì tôi vốn không có truy vấn linh hoạt nào."*

6. **Giải thích `folder_id` nằm trong partition key kèm cái giá của nó**: *"Đổi lại, di chuyển thư giữa thư mục là xoá + ghi chứ không phải UPDATE. Đó là đánh đổi tốt — người ta mở thư mục nhiều gấp hàng nghìn lần di chuyển thư."* Chủ động nêu cái giá quan trọng hơn nêu cái lợi.

7. **Dùng bảng denormalize `unread_emails` để thể hiện bạn hiểu triết lý, không chỉ cú pháp**: *"Trong column-family, tôi không thiết kế bảng rồi viết truy vấn — tôi liệt kê truy vấn rồi tạo một bảng cho mỗi truy vấn. Dư thừa không phải lỗi, nó là cách thanh toán."*

8. **Threading: nói thuật toán, rồi tự nêu chỗ nó hỏng.** Ba bước JWZ trong 60 giây, node rỗng cho thư thiếu, kiểm tra chu trình vì header là dữ liệu bên ngoài. Rồi: *"Gom theo subject là dự phòng nguy hiểm — mọi thư tên 'Xin chào' sẽ thành một chuỗi. Tôi giới hạn theo cùng tập người tham gia và cửa sổ 7 ngày."*

9. **Chủ động mở phần deliverability — đây là chỗ ghi điểm lớn nhất và 90% ứng viên bỏ qua.** *"Có một phần không nằm trong sơ đồ nào nhưng quyết định sống chết."* Rồi SPF/DKIM/DMARC (nhấn: DMARC tồn tại vì SPF và DKIM đều không kiểm cái `From:` mà người dùng nhìn thấy), IP warming 2–6 tuần, tách IP pool transactional khỏi marketing kèm **hệ quả sản phẩm**: *"trộn chung thì một chiến dịch marketing tệ làm email đặt lại mật khẩu rơi vào Spam — người dùng không đăng nhập được."*

10. **Search: dẫn bằng nghịch đảo, không bằng 'dùng Elasticsearch'.** *"Tìm kiếm email ngược với tìm kiếm web ở ba điểm: một tỉ index cô lập thay vì một index toàn cục, ghi áp đảo đọc, và bỏ sót là bug chứ không phải chuyện thường."* Rồi nêu `routing = user_id` để tránh scatter-gather, và chốt bằng lộ trình: OpenSearch trước, cân nhắc gộp index vào LSM của store chính khi quy mô biện minh được.

11. **Với consistency, nói vì sao email khác các hệ eventual khác**: *"Người dùng **hành động** dựa trên trạng thái họ thấy. Đánh dấu đã đọc rồi thấy lại chưa đọc là bug, không phải độ trễ. Nên tôi chọn C thay vì A cho metadata — và nói rõ cái giá: khi mất quorum, một phần user tạm thời không sửa được trạng thái, nhưng không ai mất thư, vì thư đến vẫn nằm trong queue."*

12. **Khi nói failure, nêu chế độ hỏng mà dashboard không thấy**: *"Tệ nhất không phải node chết — mà là IP pool bị blocklist. Mọi máy xanh, mọi metric đẹp, và không thư nào tới được ai. Nên tôi giám sát tín hiệu bên ngoài: bounce theo từng nhà cung cấp, Postmaster Tools, seed list, báo cáo DMARC."* Loại hiểu biết này chỉ đến từ vận hành thật.

13. **Nếu còn thời gian, nêu hai điều ít ai nhắc**: khử trùng lặp khi nhận (retry SMTP giao cùng một thư hai lần là *bình thường*, nên cần `Message-ID` + cửa sổ thời gian), và crypto-shredding cho GDPR (*"không thể sửa một snapshot backup bất biến; nên tôi mã hoá theo từng user và xoá user bằng cách huỷ khoá"*).

> 💡 **Nguyên tắc cuối**: cả bài gói trong một câu — **email là một tỉ cơ sở dữ liệu tí hon, mỗi người một cái, bị ràng buộc bởi một giao thức bạn không kiểm soát.** Vế đầu cho bạn món quà: phân vùng theo `user_id` khiến scale ngang gần như miễn phí, nên đừng tiêu thời gian phỏng vấn vào đó. Vế sau cho bạn bài toán thật: bạn phải tuân thủ SMTP tuyệt đối, phải thiết kế mô hình dữ liệu quanh đúng một hình dạng truy vấn, và phải kiếm được lòng tin của những người bạn không quen — vì **thư gửi đi mà vào Spam thì hệ thống hoàn hảo của bạn cũng bằng không.**
