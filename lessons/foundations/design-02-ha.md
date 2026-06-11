# High Availability & Redundancy

Hãy tưởng tượng một cửa hàng phở chỉ có **một** đầu bếp. Ngày nào ông ấy ốm, cửa hàng đóng cửa, khách bỏ đi, doanh thu mất trắng. Bây giờ tưởng tượng cửa hàng có **hai** đầu bếp làm song song, một máy phát điện dự phòng, và hai nhà cung cấp bánh phở khác nhau. Một người ốm? Cửa hàng vẫn bán. Mất điện? Máy phát chạy. Đó chính là tinh thần của **High Availability (HA)**: hệ thống vẫn phục vụ được người dùng ngay cả khi từng bộ phận bên trong gặp sự cố.

Bài này sẽ đi từ gốc: tại sao hệ thống sập, làm sao tìm điểm yếu, các chiến lược dự phòng, đo lường "độ sẵn sàng" bằng con số, và cách giới hạn thiệt hại khi sự cố xảy ra.

## 1. Tiền đề quan trọng nhất: mọi thứ ĐỀU sẽ hỏng

Trong hệ phân tán, câu nói kinh điển của Werner Vogels (CTO của Amazon) là:

> "Everything fails, all the time."

Ổ cứng hỏng, dây mạng đứt, data center mất điện, phần mềm có bug, con người gõ nhầm lệnh. Câu hỏi đúng **không phải** là "làm sao để không bao giờ hỏng?" (bất khả thi), mà là:

> "Khi một bộ phận hỏng, người dùng có nhận ra không?"

Hệ thống High Availability là hệ thống được **thiết kế để chịu lỗi** (design for failure), chứ không phải hệ thống "may mắn chưa hỏng".

> 💡 **Ghi nhớ:** High Availability không có nghĩa là "không bao giờ có lỗi". Nó có nghĩa là "lỗi xảy ra nhưng dịch vụ vẫn tiếp tục" — vì ta đã chuẩn bị sẵn phương án dự phòng.

## 2. SPOF — Single Point of Failure

### 2.1 SPOF là gì?

**SPOF (Single Point of Failure)** là một thành phần mà **nếu nó chết, toàn bộ hệ thống chết theo**. Giống như cây cầu duy nhất nối vào một hòn đảo: cầu sập, đảo bị cô lập, dù mọi thứ trên đảo vẫn nguyên vẹn.

Xét một kiến trúc web "kinh điển" của người mới:

```
   Người dùng
       |
       v
  [ 1 Web Server ]   <-- SPOF #1
       |
       v
  [ 1 Database ]     <-- SPOF #2
       |
       v
  [ 1 Ổ cứng ]       <-- SPOF #3
```

Mỗi tầng chỉ có đúng một bản — bất kỳ tầng nào hỏng là cả hệ thống ngừng hoạt động. Đây là kiến trúc có tới ba SPOF chồng lên nhau.

### 2.2 Cách tìm SPOF: bài tập "rút dây"

Cách thực dụng nhất để tìm SPOF là chơi trò **"nếu tôi tắt cái này thì sao?"** (thought experiment, hoặc làm thật trong môi trường test — gọi là *chaos engineering*):

1. Vẽ sơ đồ toàn bộ hệ thống: server, database, load balancer, DNS, mạng, nguồn điện, cả... con người và quy trình.
2. Lần lượt chỉ vào từng thành phần và hỏi: *"Nếu cái này biến mất ngay bây giờ, người dùng còn dùng được không?"*
3. Nếu câu trả lời là "không" → đó là SPOF.

Những SPOF hay bị bỏ sót:

| SPOF "ẩn" | Ví dụ |
|---|---|
| DNS | Cả hệ thống có 10 server nhưng chỉ 1 DNS server |
| Load balancer | Dự phòng web server nhưng load balancer chỉ có 1 con |
| Chứng chỉ / secret | TLS certificate hết hạn làm sập toàn bộ |
| Dịch vụ bên thứ ba | Cổng thanh toán duy nhất bị sập |
| Con người | Chỉ một người duy nhất biết cách deploy ("bus factor = 1") |
| Vị trí địa lý | Tất cả server cùng một toà nhà — cháy là mất hết |

> 💡 **Ghi nhớ:** SPOF không chỉ là máy móc. DNS, load balancer, nhà cung cấp bên thứ ba, thậm chí "anh A là người duy nhất biết mật khẩu" — đều là SPOF. Cách tìm: lần lượt giả định từng thành phần biến mất và xem hệ thống còn sống không.

## 3. Redundancy — Dự phòng

Thuốc giải cho SPOF là **redundancy**: có **nhiều hơn một** bản của thành phần quan trọng. Nhưng "có hai bản" thì hai bản đó phối hợp với nhau kiểu gì? Có hai mô hình chính.

### 3.1 Active-Passive (chủ động – dự bị)

Một bản **active** phục vụ toàn bộ traffic; bản **passive** (standby) đứng chờ, chỉ tiếp quản khi bản chính chết.

```
            bình thường                    khi sự cố
   Users ──► [Server A] (active)    Users ──X [Server A] (chết)
             [Server B] (ngủ chờ)   Users ──► [Server B] (tiếp quản)
```

Analogy: **lốp dự phòng** trong cốp xe. Bình thường nó nằm im, không giúp xe chạy nhanh hơn; nhưng khi thủng lốp, bạn thay vào và đi tiếp (mất vài phút thay lốp = thời gian failover).

### 3.2 Active-Active (cùng chạy song song)

Cả hai (hoặc nhiều) bản **cùng phục vụ traffic** đồng thời, thường đứng sau một load balancer. Một bản chết thì các bản còn lại gánh phần việc của nó.

```
                ┌──► [Server A] (đang phục vụ)
   Users ──► [LB]
                └──► [Server B] (đang phục vụ)
```

Analogy: quán phở có **hai đầu bếp cùng nấu** mỗi ngày. Một người nghỉ, người kia nấu chậm hơn một chút nhưng quán không đóng cửa — và ngày thường thì quán phục vụ được gấp đôi khách.

### 3.3 So sánh

| Tiêu chí | Active-Passive | Active-Active |
|---|---|---|
| Bản dự phòng có phục vụ traffic? | Không (đứng chờ) | Có (chia tải) |
| Tận dụng tài nguyên | Lãng phí hơn (máy chờ không làm gì) | Tốt hơn (mọi máy đều làm việc) |
| Thời gian chuyển đổi khi sự cố | Có độ trễ failover (giây → phút) | Gần như tức thì (LB chỉ ngừng gửi tới máy chết) |
| Độ phức tạp | Đơn giản hơn | Phức tạp hơn (đồng bộ dữ liệu, session, xung đột ghi) |
| Phù hợp với | Database truyền thống, hệ thống khó chạy song song | Web server stateless, API |

Lưu ý quan trọng: với **database**, active-active khó hơn nhiều vì hai bản cùng **ghi** dữ liệu có thể xung đột. Vì vậy database thường dùng active-passive (một primary ghi, một standby đồng bộ theo), còn tầng web stateless thì dùng active-active thoải mái.

> 💡 **Ghi nhớ:** Active-passive = lốp dự phòng (chờ, có độ trễ khi thay). Active-active = hai đầu bếp cùng nấu (chia tải, chuyển đổi tức thì, nhưng phức tạp hơn — nhất là khi có ghi dữ liệu).

## 4. Health Check & Failover — phát hiện và chuyển hướng

Có dự phòng thôi chưa đủ. Câu hỏi tiếp theo: **ai phát hiện máy chính chết, và ai quyết định chuyển sang máy dự phòng?**

### 4.1 Health check — "bắt mạch" định kỳ

**Health check** là việc một thành phần giám sát (load balancer, DNS, hệ thống monitoring) **định kỳ hỏi thăm** từng server: "Cậu còn sống không?". Thường là gửi một HTTP request tới endpoint kiểu `/health` mỗi vài giây:

```
LB ──► GET /health ──► Server A ──► 200 OK   ✓ khoẻ
LB ──► GET /health ──► Server B ──► timeout  ✗ nghi ngờ
LB ──► GET /health ──► Server B ──► timeout  ✗ nghi ngờ lần 2
LB ──► GET /health ──► Server B ──► timeout  ✗ → đánh dấu UNHEALTHY
```

Vài khái niệm thực tế:

- **Interval**: bao lâu kiểm tra một lần (vd: 10 giây).
- **Threshold**: phải fail liên tiếp mấy lần mới kết luận chết (tránh báo động giả vì một lần mạng chập chờn).
- **Shallow vs deep check**: check nông ("server có trả lời HTTP không?") vs check sâu ("server có kết nối được database không?"). Check sâu chính xác hơn nhưng cẩn thận: nếu database chậm, *tất cả* server có thể bị đánh dấu chết cùng lúc.

### 4.2 Failover — chuyển giao quyền

**Failover** là hành động tự động chuyển traffic từ thành phần hỏng sang thành phần dự phòng. Chuỗi sự kiện điển hình:

```
[1] Server A chết
        │
[2] Health check fail liên tiếp N lần (mất ~vài chục giây để phát hiện)
        │
[3] Hệ thống đánh dấu A unhealthy
        │
[4] Traffic được chuyển sang B
     - Với load balancer: ngừng gửi request tới A
     - Với DNS failover: đổi bản ghi DNS trỏ sang B
     - Với database: promote bản standby lên làm primary
        │
[5] Người dùng tiếp tục dùng (lý tưởng là không nhận ra gì)
```

Thời gian từ bước [1] đến [5] gọi là **thời gian failover** — và đây chính là lý do "có dự phòng" không đồng nghĩa "không downtime": phát hiện lỗi và chuyển giao đều tốn thời gian.

> 💡 **Ghi nhớ:** Redundancy là *có* phương án B; health check là *phát hiện* phương án A đã chết; failover là *chuyển sang* phương án B. Thiếu một trong ba thì HA không hoạt động — có lốp dự phòng nhưng không biết lốp thủng thì vẫn nằm đường.

## 5. "Nines of availability" — đo độ sẵn sàng bằng số 9

### 5.1 Công thức

Availability (độ sẵn sàng) = tỉ lệ thời gian hệ thống hoạt động:

```
Availability = uptime / (uptime + downtime)
```

Ngành công nghiệp đo bằng **số chữ số 9**: "three nines" = 99.9%, "four nines" = 99.99%... Nghe khác nhau có 0.09%, nhưng quy ra thời gian downtime cho phép thì khác nhau **một trời một vực**:

| Mức | Tên gọi | Downtime tối đa / năm | Downtime / tháng | Cảm nhận thực tế |
|---|---|---|---|---|
| 99% | two nines | ~3.65 ngày | ~7.3 giờ | Sập gần nửa ngày mỗi tháng — người dùng kêu trời |
| 99.9% | three nines | ~8.77 giờ | **~43.8 phút** | Mức "tạm ổn" cho nhiều dịch vụ nội bộ |
| 99.95% | | ~4.38 giờ | ~21.9 phút | SLA phổ biến của nhiều cloud service |
| 99.99% | four nines | ~52.6 phút | ~4.4 phút | Chỉ đạt được khi failover hoàn toàn tự động |
| 99.999% | five nines | **~5.26 phút/năm** | ~26 giây | Viễn thông, hàng không — cực kỳ đắt đỏ |

Cách nhớ nhanh con số kinh điển: **99.9% ≈ 43–44 phút downtime mỗi tháng, ~8.8 giờ mỗi năm**.

### 5.2 Hai bài học từ bảng trên

**Thứ nhất — mỗi số 9 thêm vào đắt gấp bội.** Từ 99.9% lên 99.99% không phải "cố thêm tí" mà thường là thay đổi kiến trúc: thêm vùng địa lý, tự động hoá failover, loại bỏ mọi thao tác thủ công (vì 4.4 phút/tháng thì con người không kịp phản ứng — máy phải tự xử lý).

**Thứ hai — availability của chuỗi là TÍCH các thành phần.** Nếu hệ thống gồm web (99.9%) nối tiếp database (99.9%) nối tiếp DNS (99.9%):

```
99.9% × 99.9% × 99.9% ≈ 99.7%
```

Chuỗi nối tiếp càng dài, độ sẵn sàng tổng càng giảm. Ngược lại, đặt các bản dự phòng **song song** thì availability tăng vọt: hai server 99% chạy song song (chỉ chết khi cả hai cùng chết) đạt `1 − 0.01 × 0.01 = 99.99%`. Đây chính là lý do toán học khiến redundancy hiệu quả.

> 💡 **Ghi nhớ:** 99.9% = ~43.8 phút downtime/tháng. Thành phần nối tiếp làm availability *nhân nhau* (giảm xuống); thành phần song song dự phòng làm xác suất chết *nhân nhau* (availability tăng lên). Muốn thêm một số 9, chi phí và độ phức tạp tăng theo cấp số nhân.

## 6. RTO vs RPO — hai câu hỏi khi thảm hoạ xảy ra

Khi sự cố lớn xảy ra (mất cả database, cháy data center), có hai câu hỏi hoàn toàn khác nhau mà người mới rất hay nhầm:

- **RTO (Recovery Time Objective)** — *"Bao lâu nữa thì hệ thống chạy lại?"* → đo bằng **thời gian phục hồi**.
- **RPO (Recovery Point Objective)** — *"Mất bao nhiêu dữ liệu?"* → đo bằng **khoảng thời gian dữ liệu bị mất**, tính ngược từ thời điểm sự cố về lần backup/đồng bộ gần nhất.

Hình dung trên trục thời gian:

```
 ──────●───────────────✖───────────────●──────► thời gian
   backup cuối       SỰ CỐ         chạy lại
       │◄─── RPO ─────►│◄──── RTO ────►│
       (dữ liệu bị mất)  (thời gian chết)
```

Analogy: bạn đang viết luận văn và máy tính cháy.

- **RPO** = lần bấm "Save" gần nhất cách đây bao lâu → mất chừng đó công sức gõ.
- **RTO** = mất bao lâu để mượn máy mới, cài Word, mở lại file → khoảng thời gian không làm việc được.

| | RTO | RPO |
|---|---|---|
| Câu hỏi | Downtime kéo dài bao lâu? | Mất bao nhiêu dữ liệu? |
| Quyết định bởi | Tốc độ phát hiện + failover + khôi phục | Tần suất backup / cơ chế đồng bộ (replication) |
| Muốn RPO ≈ 0 | — | Cần đồng bộ dữ liệu liên tục (synchronous replication) |
| Muốn RTO ≈ 0 | Cần hệ thống dự phòng luôn sẵn sàng chạy ngay | — |

Quy tắc kinh doanh: RTO/RPO càng nhỏ càng đắt. Backup mỗi đêm (RPO = 24 giờ) rất rẻ; đồng bộ từng giao dịch (RPO ≈ 0) đòi hỏi hạ tầng đắt hơn nhiều. Việc của kiến trúc sư là hỏi nghiệp vụ: *"Mất 1 giờ dữ liệu thì thiệt hại bao nhiêu tiền?"* rồi chọn mức đầu tư tương xứng.

> 💡 **Ghi nhớ:** RTO = thời gian chết (bao lâu chạy lại). RPO = lượng dữ liệu mất (save gần nhất cách bao lâu). Mẹo nhớ: **T**ime = thời gian phục hồi, **P**oint = điểm dữ liệu cuối cùng còn giữ được.

## 7. Graceful Degradation — xuống cấp có kiểm soát

Không phải lúc nào cũng giữ được 100% tính năng khi sự cố. **Graceful degradation** là triết lý: khi một phần hỏng, hệ thống **hy sinh tính năng phụ để giữ tính năng cốt lõi**, thay vì sập toàn bộ.

Analogy: máy bay mất một động cơ **không rơi** — nó bay chậm hơn, thấp hơn, và hạ cánh ở sân bay gần nhất. Xuống cấp, nhưng có kiểm soát.

Ví dụ với một trang thương mại điện tử khi service gợi ý sản phẩm (recommendation) bị sập:

| Cách xử lý | Kết quả |
|---|---|
| ❌ Không degradation | Trang chủ chờ recommendation → timeout → **cả trang lỗi 500**, không ai mua được hàng |
| ✅ Graceful degradation | Trang chủ hiện danh sách sản phẩm phổ biến (cache sẵn) thay cho gợi ý cá nhân hoá → **vẫn mua hàng bình thường** |

Các kỹ thuật phổ biến:

- **Fallback**: có phương án thay thế rẻ tiền (dữ liệu cache cũ, giá trị mặc định) khi nguồn chính lỗi.
- **Feature toggle**: tắt nhanh tính năng phụ đang gây lỗi mà không cần deploy lại.
- **Timeout + circuit breaker**: không chờ mãi một service đang hấp hối — cắt sớm và dùng fallback, tránh việc một service chậm kéo sập cả chuỗi.
- **Phân loại tính năng từ trước**: cái gì là cốt lõi (thanh toán, đăng nhập), cái gì hy sinh được (gợi ý, ảnh chất lượng cao, thống kê) — quyết định này phải làm lúc thiết kế, không phải lúc đang cháy nhà.

> 💡 **Ghi nhớ:** Câu hỏi thiết kế quan trọng: *"Khi service X chết, người dùng nên thấy gì?"* Nếu câu trả lời là "trang lỗi trắng" thì bạn chưa có graceful degradation. Hệ thống tốt thua từng phần, không thua cả ván.

## 8. Blast Radius & Isolation — giới hạn bán kính thiệt hại

### 8.1 Blast radius là gì?

**Blast radius** (bán kính vụ nổ) = **phạm vi thiệt hại khi một thứ hỏng**. Một thay đổi cấu hình sai làm sập 1 server thì blast radius nhỏ; làm sập toàn bộ 3 region thì blast radius khổng lồ.

Analogy: tàu thuỷ được chia thành nhiều **khoang kín nước** (bulkhead). Thủng một khoang, nước chỉ ngập khoang đó, tàu vẫn nổi. Tàu không có vách ngăn thì một lỗ thủng = chìm cả tàu.

### 8.2 Isolation — kỹ thuật chia khoang

Nguyên tắc: **chia hệ thống thành các ngăn độc lập, để lỗi ở ngăn này không lan sang ngăn khác**.

```
  Không isolation:                Có isolation:
  ┌──────────────────┐            ┌─────┐ ┌─────┐ ┌─────┐
  │  TẤT CẢ user     │            │ ô 1 │ │ ô 2 │ │ ô 3 │
  │  trên 1 cụm      │            │ 33% │ │ 33% │ │ 33% │
  │  → lỗi = 100%    │            │users│ │users│ │users│
  │    user bị ảnh   │            └──✖──┘ └─────┘ └─────┘
  │    hưởng         │             lỗi ô 1 → chỉ 33% bị
  └──────────────────┘             ảnh hưởng
```

Các hình thức isolation thường gặp:

- **Isolation vật lý / địa lý**: các bản dự phòng đặt ở toà nhà, thành phố khác nhau — cháy nổ, mất điện, thiên tai chỉ quét một nơi.
- **Cell-based architecture**: chia người dùng thành các "ô" (cell) độc lập, mỗi ô có hạ tầng riêng; lỗi ô nào chỉ ảnh hưởng ô đó.
- **Triển khai dần (rolling/canary deployment)**: deploy phiên bản mới cho 1% người dùng trước; có bug thì blast radius chỉ là 1%, không phải 100%.
- **Giới hạn quyền (least privilege)**: một credential bị lộ hoặc một script chạy sai chỉ phá được trong phạm vi quyền hạn của nó.

Lưu ý sự đánh đổi: isolation và tận dụng tài nguyên kéo nhau ngược chiều. Gộp chung tất cả vào một cụm thì rẻ và dễ quản lý, nhưng blast radius là 100%. Thiết kế HA là nghệ thuật chọn điểm cân bằng.

> 💡 **Ghi nhớ:** Trước mỗi quyết định kiến trúc hay mỗi lần thay đổi hệ thống, hãy hỏi: *"Nếu cái này hỏng/sai, bao nhiêu phần trăm người dùng bị ảnh hưởng?"* Đó chính là blast radius. Mục tiêu không chỉ là giảm xác suất lỗi, mà là giảm **phạm vi** của lỗi.

## 9. Ghép tất cả lại: một kiến trúc HA mẫu

```
                    Users
                      │
              [ DNS + health check ]      ← failover giữa các site
                      │
              [ Load Balancer ]           ← bản thân LB cũng phải dự phòng!
               ┌──────┴──────┐
        ╔══════▼═════╗ ╔═════▼══════╗
        ║  Khoang A  ║ ║  Khoang B  ║    ← 2 vị trí vật lý tách biệt
        ║ [Web x2]   ║ ║ [Web x2]   ║      (isolation, active-active)
        ║     │      ║ ║     │      ║
        ║ [DB primary]◄──►[DB standby]    ← active-passive + replication
        ╚════════════╝ ╚════════════╝      (RPO nhỏ nhờ đồng bộ liên tục)
```

Đối chiếu với các khái niệm đã học:

- Không còn SPOF: mọi tầng đều có ít nhất 2 bản, ở 2 vị trí.
- Web tier: **active-active** sau load balancer, có **health check** loại máy chết.
- Database: **active-passive**, standby đồng bộ liên tục → **RPO ≈ 0**, failover tự động → **RTO** tính bằng phút hoặc giây.
- Hai khoang vật lý tách biệt → **blast radius** của một sự cố hạ tầng chỉ là một khoang.
- Nếu một tính năng phụ chết → **graceful degradation** giữ tính năng cốt lõi sống.

## 10. Liên hệ sang AWS

Mọi khái niệm trong bài đều có "hiện thân" trực tiếp trong AWS — bạn sẽ gặp lại chúng liên tục khi học CLF/SAA/DVA:

| Khái niệm trong bài | Trên AWS |
|---|---|
| Isolation vật lý / "khoang tàu" | **Availability Zone (AZ)** — các cụm data center tách biệt trong một **Region**; thiết kế chuẩn là trải tài nguyên qua **nhiều AZ (Multi-AZ)** |
| Active-passive cho database + failover tự động | **RDS Multi-AZ** — standby ở AZ khác, đồng bộ synchronous (RPO ≈ 0), tự failover khi primary chết |
| Active-active cho web tier | Nhiều **EC2 instance** qua nhiều AZ sau **Elastic Load Balancer (ELB)**, kết hợp **Auto Scaling Group** tự thay máy chết |
| Health check + loại máy hỏng | **ELB health checks** — LB tự ngừng gửi traffic tới target unhealthy |
| Failover ở tầng DNS giữa các site/region | **Route 53 failover routing** — health check endpoint chính, tự trỏ DNS sang endpoint dự phòng |
| Nines / cam kết availability | **SLA** của từng dịch vụ AWS (vd: nhiều dịch vụ cam kết 99.9%–99.99%) |
| RTO/RPO & backup | **AWS Backup**, snapshot, cross-region replication — chọn chiến lược DR theo RTO/RPO mục tiêu |
| Giảm blast radius khi deploy | Deploy theo từng AZ/Region, canary deployment (CodeDeploy), giới hạn quyền bằng **IAM** |

Khi đọc tài liệu AWS, mỗi lần thấy "Multi-AZ", hãy dịch trong đầu thành: *"redundancy + isolation + failover tự động"* — chính là bộ ba bạn vừa học.

## Tóm tắt

1. **Mọi thứ đều sẽ hỏng** — thiết kế để chịu lỗi, không cầu may.
2. **SPOF** là thành phần mà chết nó là chết cả hệ thống; tìm bằng cách giả định từng thứ biến mất (kể cả DNS, LB, con người).
3. **Redundancy**: active-passive (lốp dự phòng — đơn giản, có độ trễ) vs active-active (hai đầu bếp — chia tải, phức tạp hơn).
4. **Health check** phát hiện lỗi, **failover** chuyển traffic — thiếu chúng thì dự phòng vô dụng.
5. **Nines**: 99.9% ≈ 43.8 phút downtime/tháng; mỗi số 9 thêm vào đắt gấp bội; chuỗi nối tiếp làm giảm, song song làm tăng availability.
6. **RTO** = bao lâu chạy lại; **RPO** = mất bao nhiêu dữ liệu.
7. **Graceful degradation**: hy sinh tính năng phụ, giữ tính năng cốt lõi.
8. **Blast radius & isolation**: chia khoang để lỗi không lan; luôn hỏi "hỏng cái này thì bao nhiêu % user bị ảnh hưởng?".

Bài tiếp theo, các khái niệm này sẽ là nền để hiểu vì sao AWS xây Region/AZ như vậy — và vì sao đề thi chứng chỉ hỏi đi hỏi lại về Multi-AZ.
