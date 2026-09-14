# Case study: Payment System

> Đây là bài case study **kỳ lạ nhất** trong cả course. Mọi bài trước — URL shortener, news feed, YouTube, nearby friends — đều có chung một hình dạng: traffic lớn, cái khó là *chịu tải*. Payment System lật ngược hoàn toàn: **tải nhỏ đến mức buồn cười** (1 triệu giao dịch/ngày = ~12 giao dịch/giây, một con Postgres cùi cũng gánh được), nhưng **mỗi giao dịch sai là tiền thật của người thật**. Không có "eventual consistency rồi tính sau". Nếu bạn bước vào buổi phỏng vấn này và bắt đầu bằng sharding với cache, bạn đã trả lời sai câu hỏi.

Cái khó thật **không** nằm ở throughput. Nó nằm ở chỗ: hệ thống của bạn phải phối hợp với **những hệ thống bạn không kiểm soát** (ngân hàng, card network, PSP), qua **một đường mạng có thể đứt bất kỳ lúc nào**, để tạo ra một hiệu ứng **không hoàn tác dễ dàng** (tiền đã rời tài khoản người ta). Khi request timeout, bạn không biết tiền đã chuyển hay chưa. Khi bạn retry, bạn có thể trừ tiền hai lần. Khi PSP gửi webhook, nó có thể gửi ba lần, sai thứ tự, hoặc do kẻ xấu giả mạo. Và cuối tháng kế toán sẽ hỏi: *"vì sao sổ ta lệch sổ ngân hàng 1.247 đô?"* — bạn phải trả lời được, từng đồng một.

Nói cách khác: đây là bài về **tính đúng đắn trong một thế giới không đáng tin cậy**, không phải bài về quy mô. Người phỏng vấn cấp Senior/Staff mảng fintech chấm bạn ở bốn thứ: hiểu **từ vựng ngành**, xử lý **double payment** đến nơi đến chốn, biết **double-entry ledger** là gì và vì sao bắt buộc, và có **reconciliation**. Thiếu một trong bốn là rớt, dù sơ đồ đẹp đến mấy.

---

## Phần 0 — Từ vựng: bạn không thể thiết kế cái bạn không gọi tên được

Mỗi thuật ngữ ở đây tương ứng với **một thực thể hoặc một trạng thái** trong thiết kế. Không hiểu từ vựng thì state machine của bạn sẽ sai.

### 0.1 Bốn bên trong một lần quẹt thẻ

```
      ┌──────────┐   quẹt thẻ    ┌──────────────┐
      │  Payer   │ ────────────► │   Merchant   │
      │(người trả│               │ (người bán   │
      │ = buyer) │ ◄──────────── │   = payee)   │
      └────┬─────┘   hàng hoá    └──────┬───────┘
           │ thẻ do ai phát?            │ ai nhận tiền hộ merchant?
           ▼                            ▼
   ┌───────────────┐            ┌──────────────────┐
   │ Issuing bank  │            │  Acquiring bank  │
   │   (issuer)    │            │    (acquirer)    │
   │ NH của người  │            │  NH của người    │
   │     mua       │            │      bán         │
   └───────┬───────┘            └────────┬─────────┘
           └──────────┬──────────────────┘
                      ▼
            ┌────────────────────┐
            │   Card network     │  "đường ray" nối issuer
            │ Visa / Mastercard  │  với acquirer, và chạy
            │   / Amex / JCB     │  clearing & settlement
            └────────────────────┘
```

| Vai | Là ai | Vì sao bạn phải quan tâm |
|---|---|---|
| **Payer** (buyer, cardholder) | Người bỏ tiền | Là người bị trừ tiền hai lần nếu bạn sai idempotency. Cũng là người có quyền **chargeback** |
| **Payee** (merchant, seller) | Người nhận tiền | Ở marketplace, bạn **nợ** seller tiền cho tới lúc pay-out. Số nợ đó nằm ở **wallet** |
| **Issuing bank** | Ngân hàng phát hành thẻ cho payer | Bên **thực sự quyết định** duyệt hay từ chối. Bạn không bao giờ nói chuyện trực tiếp với nó |
| **Acquiring bank** | Ngân hàng nhận tiền hộ merchant | Giữ merchant account. Tiền đổ về đây trước |
| **Card network / scheme** | Visa, Mastercard, Amex, JCB, UnionPay | Định tuyến bản tin authorization, chạy clearing & settlement hằng ngày, và **đặt luật chargeback** mà bạn phải tuân theo |
| **PSP** | Stripe, Adyen, Braintree, Checkout.com, VNPay, MoMo | Lớp bọc giúp bạn không phải tự nối vào acquirer. Bán cho bạn một API HTTP thay vì một dự án 18 tháng |

Lưu ý: **PSP không phải một vai trong four-party model** — nó là lớp thương mại chen giữa merchant và acquirer. Nhiều PSP hiện đại (Adyen, Stripe) *chính là* acquirer. Điều này quan trọng khi bàn về đổi PSP: token thẻ họ cấp **không mang đi được** — một dạng lock-in rất thật (§5.4).

> 💡 **Nguyên tắc**: Vẽ đúng sơ đồ này trong 60 giây đầu và nói: *"Hệ thống tôi xây nằm giữa merchant và PSP. Tôi **không** xây issuer, **không** xây card network, và tuyệt đối **không** chạm vào số thẻ."* Câu đó đặt đúng phạm vi và loại bỏ 80% thứ bạn không cần nói.

### 0.2 Ba từ dễ nhầm nhất: authorization, capture, settlement

Ba từ này **không đồng nghĩa**, xảy ra ở **ba thời điểm khác nhau**, và trong thiết kế của bạn chúng là **ba trạng thái khác nhau**.

**Authorization (uỷ quyền)** — "Ngân hàng ơi, thẻ này có đủ 5 đô không, có phải thẻ thật không?" Issuer kiểm hạn mức, kiểm thẻ có bị khoá không, chạy vài luật chống gian lận, trả về `approved` kèm authorization code. **Tiền chưa chuyển đi đâu cả** — chỉ là một khoản **hold** trên hạn mức. Auth có **thời hạn sống** (thường 7 ngày, tới 30 ngày với khách sạn/thuê xe). Hết hạn mà chưa capture thì hold rơi và bạn **mất quyền lấy tiền**.

**Capture (thu tiền)** — "Tôi lấy thật, lấy 5 đô." Đây mới là lệnh khởi động dòng tiền. Có thể xảy ra ngay sau auth (*auth-and-capture*, điển hình cho hàng số) hoặc vài ngày sau (hàng vật lý: auth khi đặt, capture khi giao — nhiều nước cấm thu tiền trước khi giao hàng). Capture có thể **nhỏ hơn** auth (partial capture: auth 100 đô tiền phòng, capture 87 đô khi khách trả phòng sớm). Vì vậy `authorized_amount` và `captured_amount` là **hai cột khác nhau**.

**Clearing & settlement (bù trừ & quyết toán)** — Cuối ngày acquirer gom capture thành lô gửi card network; network bù trừ số dư liên ngân hàng (clearing); rồi tiền thật sự dịch chuyển (settlement), mất **T+1 đến T+3 ngày làm việc**. Đây là chỗ sinh ra thứ quan trọng nhất cho §9: **settlement file** — file PSP gửi mỗi ngày liệt kê chính xác giao dịch nào đã quyết toán, phí bao nhiêu. Đó là **sự thật từ phía ngoài** mà bạn đối chiếu với sổ của mình.

```
   Ngày 0, 14:03:22    Ngày 0, 14:03:23     Ngày 0, 23:00      Ngày +2
   AUTHORIZATION          CAPTURE             CLEARING        SETTLEMENT
  "còn đủ tiền?"       "tôi lấy thật"     batch gửi network   tiền vào TK
  hold hạn mức        dòng tiền khởi động  bù trừ liên NH      acquirer
  CHƯA chuyển tiền     vẫn CHƯA            vẫn CHƯA           CÓ tiền thật
  state: AUTHORIZED    state: CAPTURED     state: CAPTURED    state: SETTLED
```

> ⚠️ **Bẫy kinh điển**: Ứng viên nói *"thanh toán thành công thì cập nhật ví seller"*. Câu hỏi ngược: *"thành công là authorized hay settled? Cộng ví lúc authorized thì capture hỏng xử lý sao? Đợi settled thì seller chờ 3 ngày — sản phẩm chịu không?"* Câu trả lời đúng: **cộng `pending_balance` khi captured, chuyển sang `available_balance` khi settled**. Ví có hai ngăn, không phải một số.

### 0.3 Ba cách tiền chảy ngược

| Cơ chế | Khi nào | Ai khởi xướng | Đặc điểm |
|---|---|---|---|
| **Void / cancel** | Sau auth, **trước** capture | Merchant | Rẻ và sạch nhất — chỉ huỷ hold, không sinh bản ghi chuyển tiền. Thường miễn phí |
| **Refund** | Sau capture | Merchant (do khách yêu cầu) | Là một giao dịch **mới, ngược chiều**, có id riêng. Vài ngày mới về thẻ khách. Thường **không hoàn phí xử lý** |
| **Chargeback** | Sau capture/settlement | **Cardholder qua issuer** — không qua bạn | Ép buộc. Tiền bị rút kèm **phí phạt 15–100 đô**. Bạn có 7–30 ngày nộp bằng chứng (representment) |

**Chargeback là cơn ác mộng vận hành thật sự** và là lý do nhiều thứ trong thiết kế tồn tại. Khách gọi ngân hàng nói "tôi không hề mua cái này"; issuer lấy lại tiền từ acquirer, acquirer lấy lại từ bạn. Bạn phải nộp log giao dịch, IP, địa chỉ giao hàng, chữ ký nhận hàng, ảnh chụp trang checkout. **Không lưu đủ dữ liệu đó = thua mặc định.** Đây là lý do rất cụ thể để audit log phải bất biến và đầy đủ — nó là tiền, không phải "best practice".

Visa/Mastercard đặt ngưỡng: tỷ lệ chargeback vượt **~0,9–1%** thì merchant bị giám sát, phạt tiền, cuối cùng có thể **mất quyền nhận thẻ**. Đây là lý do fraud detection không phải tuỳ chọn.

### 0.4 Vài từ nữa bạn sẽ gặp

**Interchange fee** — phí issuer thu, phần lớn nhất (~1,5–2,5% ở Mỹ, bị chặn ~0,2–0,3% ở EU), không thương lượng được. **Scheme fee** — phí card network. **PSP markup** — phần PSP ăn, phần duy nhất thương lượng được; mô hình "2,9% + 30¢" gộp cả ba. **MDR** — tổng phí merchant chịu. **3DS** — lớp xác thực bổ sung; đổi conversion lấy **liability shift** (chargeback do gian lận chuyển sang issuer). **SCA** — quy định bắt buộc của EU (PSD2), thường thực hiện bằng 3DS2. **PCI DSS** — tiêu chuẩn bảo mật dữ liệu thẻ (§5). **PAN** — số thẻ 16 chữ số. **Token/nonce** — chuỗi đại diện cho thẻ. **AML/KYC** — chống rửa tiền / định danh, bắt buộc với pay-out.

---

## Phần 1 — Làm rõ yêu cầu

### 1.1 Những câu phải hỏi trước khi vẽ

"Payment system" có thể là Stripe (xây cho người khác dùng), backend thanh toán của Amazon (dùng Stripe), một ví điện tử, hay một hệ liên ngân hàng — bốn thứ khác nhau hoàn toàn. Phải chặn phạm vi.

| Câu hỏi | Giả định chốt | Hệ quả thiết kế |
|---|---|---|
| Xây cho ai? | **Backend thanh toán của sàn e-commerce kiểu Amazon** — nhiều seller, một đơn mua từ nhiều seller | Marketplace ⇒ một checkout sinh **nhiều** khoản chi trả ⇒ phải tách payment event khỏi payment order (§4.3) |
| Phương thức nào? | Chỉ **thẻ tín dụng** trong phạm vi bài | Giữ phạm vi, nhưng thiết kế phải cắm thêm được — dùng adapter cho từng PSP |
| Tự xử lý thẻ? | **Không.** Dùng PSP bên thứ ba | Quyết định lớn nhất của bài. Kéo theo toàn bộ §5 |
| Lưu số thẻ? | **Tuyệt đối không.** Chỉ token | Thu hẹp PCI scope từ ~300 yêu cầu xuống ~20 |
| Đa tiền tệ? | Toàn cầu nhưng **một tiền tệ** trong bài | Nếu đa tiền tệ: ledger phải có cột currency và **không bao giờ cộng hai currency** |
| Bao nhiêu giao dịch/ngày? | **1 triệu** | ~12 TPS. §2 — con số này là món quà để hướng cuộc trò chuyện sang tính đúng đắn |
| Có pay-out? | **Có** — trả tiền seller định kỳ | Luồng riêng với rủi ro riêng (§14) |
| Có reconciliation? | **Có, bắt buộc** | §9 |
| Refund/chargeback? | Có, ở mức mô hình hoá trạng thái | Ảnh hưởng state machine (§8) |

### 1.2 Functional requirements

1. **Pay-in** — nhận tiền từ buyer thay mặt seller. Luồng chính.
2. **Pay-out** — chuyển tiền cho seller theo lịch, sau khi trừ hoa hồng và khoản giữ lại.
3. **Tích hợp PSP bên thứ ba** — hosted payment page cho luồng nhập thẻ, API cho thao tác server-side (capture, refund, query).
4. **Reconciliation** — đối soát hằng ngày sổ nội bộ với settlement file; phát hiện và phân loại chênh lệch.
5. **Xử lý lỗi và retry** — phân loại lỗi (retry được / không), retry an toàn, cái không cứu được rơi vào nơi con người xem được.
6. **Tra cứu trạng thái** — buyer, seller và CSKH đều cần xem một giao dịch đang ở đâu.
7. **Refund** — toàn phần hoặc một phần.

### 1.3 Non-functional requirements — và thứ tự ưu tiên

1. **Correctness — ưu tiên số 1, cách biệt rất xa.** Không double charge, không mất giao dịch, ví luôn khớp ledger, ledger luôn cân. Chọn giữa "chậm nhưng đúng" và "nhanh nhưng đôi khi sai" thì chọn chậm.
2. **Durability tuyệt đối.** Đã nhận lệnh thì không được mất, kể cả mất cả một AZ. Loại bỏ mọi thiết kế "ghi vào memory rồi flush sau".
3. **Auditability.** Mỗi đồng phải giải thích được từ đâu tới, đi đâu, ai làm nó dịch chuyển. Không sửa, không xoá, chỉ thêm.
4. **Availability** cao — nhưng **không bằng mọi giá**. Hệ thanh toán thà từ chối một giao dịch còn hơn xử lý sai nó: **fail closed**, ngược với một cache hay một feed.
5. **Consistency > Availability.** Đây là hệ hiếm hoi chọn CP dứt khoát và không cần xin lỗi.
6. **Latency** vài giây cho auth — nhưng **không phải ràng buộc khó**; PSP mới là nơi tốn thời gian và bạn không kiểm soát nó.
7. **Compliance** — PCI DSS; tuỳ khu vực thêm PSD2/SCA, lưu trú dữ liệu, AML/KYC cho pay-out.

> 💡 **Nguyên tắc**: Hãy nói thành lời: *"Đây là hệ thống duy nhất tôi thiết kế mà tôi sẵn sàng đánh đổi **availability** để lấy **correctness**. Một feed sai thì user refresh. Một payment sai thì có người mất tiền và có người ra toà."*

---

## Phần 2 — Back-of-the-envelope estimation

```
GIAO DỊCH
  1.000.000 / ngày,  1 ngày ≈ 10^5 s  →  TPS trung bình ≈ 11,6
  Peak ngày thường ×3       → ~35 TPS
  Peak Black Friday ×10–20  → ~120–230 TPS
  ⇒ Đỉnh cao nhất trong năm: khoảng 200 TPS.

FAN-OUT NỘI BỘ
  Mỗi checkout mua từ ~2,5 seller  → payment order ≈ 30/s (peak ~500/s)
  Mỗi order sinh ~6 dòng ledger    → ghi ledger ≈ 180 dòng/s (peak ~3.000/s)

STORAGE / NGÀY
  payment_event   ~1 KB   × 10^6            = 1,0 GB
  payment_order   ~0,5 KB × 2,5 × 10^6      = 1,25 GB
  ledger_line     ~0,3 KB × 15 × 10^6       = 4,5 GB
  audit/event log ~2 KB   × 8 × 10^6        = 16 GB
  ─────────────────────────────────────────────────
  ≈ 23 GB/ngày ≈ 8,4 TB/năm.  Lưu pháp lý 7 năm → ~60–85 TB, KHÔNG được xoá

BĂNG THÔNG   200 TPS × 2 KB = 400 KB/s (không đáng kể)
SETTLEMENT   10^6 dòng × 200 B ≈ 200 MB/ngày mỗi PSP
WEBHOOK      2–5 cái/giao dịch + retry ≈ 3–5 triệu/ngày ≈ 40–60/s
```

Phần quan trọng: **những con số này dẫn tới quyết định gì?**

| Con số | Quyết định |
|---|---|
| 11,6 TPS TB, 200 TPS đỉnh | **Không sharding. Không NoSQL vì hiệu năng. Không cache trên đường ghi.** Một cụm Postgres/Aurora primary + replica là quá đủ. Đây là sự giải phóng: ta được dùng **transaction ACID thật, khoá thật, unique constraint thật** — những thứ bài high-throughput phải hy sinh |
| Ledger ~180 dòng/s | Vẫn ACID được. **Không phải đánh đổi đúng đắn lấy tốc độ** — xa xỉ hiếm có |
| 8,4 TB/năm, giữ 7 năm | Phân tầng: nóng (90 ngày) trong DB giao dịch, nguội sang object storage dạng Parquet, truy vấn bằng công cụ phân tích. Nhưng **không xoá** |
| Settlement 200 MB/ngày | Job đối soát là **batch đêm**, ~1 triệu dòng, vài phút. Không cần Spark. Nhưng phải **idempotent** vì sẽ phải chạy lại |
| 3–5 triệu webhook/ngày | Endpoint phải **nhận nhanh, xử lý sau** — nếu không PSP timeout rồi retry, nhân tải lên đúng lúc bạn đang chậm |

> 💡 **Nguyên tắc — câu chốt của cả §2**: *"11,6 TPS nói với tôi đây **không phải bài toán scale**. Điều đó không làm bài dễ hơn — nó chuyển cái khó sang chỗ khác. Ngân sách kỹ thuật của tôi được giải phóng khỏi throughput, nên tôi tiêu toàn bộ nó vào **tính đúng đắn**: ACID, idempotency end-to-end, double-entry ledger, reconciliation."* Nếu chỉ nhớ một câu từ bài này, nhớ câu đó.

> ⚠️ **Bẫy**: Đừng vì tải thấp mà kết luận "hệ thống này dễ". Các công ty thanh toán có **đội kỹ sư đông hơn** công ty mạng xã hội cùng quy mô traffic — độ phức tạp nằm ở số lượng trạng thái, số đối tác bên ngoài và yêu cầu tuân thủ, không ở QPS.

---

## Phần 3 — API design

```
POST /v1/payments
Headers:
  Authorization: Bearer <service_token>
  Idempotency-Key: 9f1d2a44-7c1e-4c34-8f15-0d8a1b6b2a11   ← BẮT BUỘC
Body:
{
  "checkout_id": "chk_01HQ8...",
  "buyer_id":    "usr_8812",
  "payment_method": { "type": "card", "token": "tok_psp_1N2b3c..." },
  "payment_orders": [
     { "payment_order_id": "po_01HQ8A", "seller_account": "acct_A",
       "amount": "31.50", "currency": "USD" },
     { "payment_order_id": "po_01HQ8B", "seller_account": "acct_B",
       "amount": "12.00", "currency": "USD" }
  ]
}
201 → { "payment_event_id": "pe_01HQ8...", "status": "PENDING",
        "redirect_url": "https://psp.example.com/checkout/sess_abc123" }
```

Bốn chi tiết đáng bảo vệ:

**1. `Idempotency-Key` bắt buộc, không tuỳ chọn.** Thiếu thì trả `400`, không ngoại lệ. Đây là thứ duy nhất đứng giữa bạn và việc trừ tiền khách hai lần (§6).

**2. `amount` là chuỗi, không phải số thực.** `0.1 + 0.2 = 0.30000000000000004` trong IEEE 754; sai số đó tích luỹ qua hàng triệu giao dịch và làm ledger lệch. Hai cách đúng: truyền **string thập phân** rồi parse sang decimal chính xác (`DECIMAL(19,4)`, `BigDecimal`, `decimal.Decimal`); hoặc truyền **số nguyên đơn vị nhỏ nhất** (`3150` xu, cách Stripe dùng) — nhưng phải kèm currency và tra bảng số chữ số thập phân, đừng hardcode ×100 (JPY có 0 chữ số, KWD/BHD có 3).

**3. `payment_order_id` do client sinh.** Nếu server sinh, thì khi client retry vì timeout, server sinh id mới và tạo bản ghi trùng. Client sinh (UUIDv4/ULID) ⇒ retry mang cùng id ⇒ unique constraint chặn bản ghi thứ hai. Id này còn được **chuyển tiếp xuống PSP làm idempotency key của PSP** — chuỗi idempotency nối liền tới tận PSP (§6.4).

**4. `token`, không phải số thẻ.** Nếu body chứa `"card_number": "4242..."` thì toàn bộ backend vừa rơi vào PCI DSS mức cao nhất (§5.1).

```
GET  /v1/payments/{payment_event_id}
GET  /v1/payment_orders/{payment_order_id}
  → { status, authorized_amount, captured_amount, refunded_amount,
      psp_reference, state_history: [ {from, to, at, reason}, … ] }

POST /v1/payment_orders/{id}/capture   { "amount": "31.50" }   + Idempotency-Key
POST /v1/payment_orders/{id}/refund    { "amount": "10.00", "reason": "..." }
POST /v1/payment_orders/{id}/cancel    # void, chỉ hợp lệ khi AUTHORIZED
GET  /v1/wallets/{seller_id}           # số dư: available + pending
POST /v1/payouts                                              + Idempotency-Key
POST /webhooks/psp/{psp_name}          # PSP gọi vào, không phải ta gọi ra
```

`state_history` không phải trang trí. Khi CSKH nhận cuộc gọi "tôi bị trừ tiền mà đơn không lên", thứ họ cần là dòng thời gian đó. Và khi có chargeback, đây là bằng chứng.

> 💡 **Nguyên tắc**: **Mọi endpoint làm tiền dịch chuyển đều bắt buộc `Idempotency-Key`** — capture, refund, payout, không chỉ create. Ứng viên hay đặt idempotency ở `POST /payments` rồi quên refund; kết quả là hoàn tiền hai lần, mất tiền thật.

---

## Phần 4 — High-level design

### 4.1 Sơ đồ tổng thể

```
                              ┌──────────────────────────────┐
  Browser / App               │   PSP (Stripe / Adyen …)     │
      │ 1. checkout           │  ┌────────────────────────┐  │
      ├──────────────────────►│  │ Hosted Payment Page    │  │
      │ 6. redirect tới HPP   │  │ (số thẻ CHỈ ở đây)     │  │
      ▼                       │  └───────────┬────────────┘  │
┌─────────────┐               │              ▼               │
│ API Gateway │               │        ┌───────────┐         │
│   + WAF     │               │        │ Acquirer  │─────────┼─► Card Network
└──────┬──────┘               └──────┬─┴───────────┴▲────────┘        │
       ▼                    9.webhook│               │3.register       ▼
┌───────────────────────────────┐    │               │8.capture   ┌─────────┐
│      Payment Service          │◄───┘               │            │ Issuer  │
│ - nhận payment event          │                    │            └─────────┘
│ - kiểm tra idempotency        │                    │
│ - risk check (AML/fraud)      │                    │
│ - điều phối, KHÔNG gọi PSP    │                    │
└──┬────────────┬───────────────┘                    │
   │2.ghi       │4.publish (outbox)                  │
   ▼            ▼                                    │
┌────────┐  ┌──────────────────┐                     │
│Payment │  │  Message Queue   │                     │
│  DB    │  │ FIFO theo        │                     │
│(Aurora)│  │ payment_order_id │                     │
└────────┘  └────────┬─────────┘                     │
                     ▼                               │
            ┌─────────────────────┐                  │
            │  Payment Executor   │──────────────────┘
            │ 1 order = 1 lần gọi │  gọi PSP kèm idempotency key
            │ retry + backoff+DLQ │
            └─────────┬───────────┘
                      │ 10. kết quả (event bus)
        ┌─────────────┼─────────────┬──────────────────┐
        ▼             ▼             ▼                  ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐   ┌────────────────┐
   │ Ledger  │  │  Wallet  │  │  Notif.  │   │ Reconciliation │
   │append-  │  │ pending/ │  │          │   │  (batch đêm)   │
   │only     │  │available │  └──────────┘   │ ◄── settlement │
   │2-entry  │  │ số dư    │                 │     file từ PSP│
   └─────────┘  └──────────┘                 └────────────────┘
```

### 4.2 Vai trò từng thành phần, và vì sao tách như vậy

| Thành phần | Trách nhiệm | Vì sao là service riêng |
|---|---|---|
| **Payment Service** | Cổng vào: nhận payment event, kiểm idempotency, risk check (AML, sanction list, fraud scoring), tách event thành các payment order, ghi DB, publish lên queue | Chứa **logic nghiệp vụ và phối hợp**. Cố tình **không** gọi PSP trực tiếp — vì gọi PSP là thao tác chậm, hay lỗi, cần retry. Trộn hai thứ vào một service thì mỗi lần PSP chậm là API của bạn treo |
| **Payment Executor** | Đơn vị nhỏ nhất: thực thi **một** payment order với **một** PSP. Retry, backoff, timeout, và dịch qua lại giữa mô hình nội bộ và API riêng của từng PSP | Tách để **cô lập vùng lỗi** với bên ngoài: PSP chết thì executor đầy queue, payment service vẫn nhận đơn. Cũng là chỗ đặt adapter — thêm PSP mới là thêm adapter, không sửa payment service |
| **Ledger** | Sổ cái bất biến, bút toán kép, **append-only** | **Nguồn sự thật về tiền.** Mô hình dữ liệu, vòng đời và yêu cầu tuân thủ hoàn toàn khác phần còn lại. Không bao giờ được có API `UPDATE`/`DELETE` |
| **Wallet** | Số dư hiện tại của seller, tách `pending_balance` / `available_balance` | Ledger trả lời "lịch sử", wallet trả lời "bây giờ còn bao nhiêu". Wallet về lý thuyết là **materialized view** của ledger — và chính vì vậy phải được **đối soát lại với ledger định kỳ** (§9.4) |
| **PSP** | Bên thứ ba thực sự di chuyển tiền | Không phải của bạn. Coi như hệ thống **có thể sai, có thể chậm, có thể trả lời hai lần** |
| **Reconciliation** | Batch đêm: đọc settlement file, so với ledger, phân loại chênh lệch | Batch, chạy trên dữ liệu nguội, quyền đọc rộng nhưng quyền ghi rất hẹp |

### 4.3 Payment event vs payment order vs payment transaction

Đây là câu hỏi phân loại ứng viên. Nhiều người mô hình hoá "một giao dịch" là một dòng trong một bảng — ở marketplace mô hình đó gãy ngay.

```
  Buyer bấm "Đặt hàng" — giỏ có 3 món của 2 seller
                ▼
      ┌─────────────────────────┐
      │   PAYMENT EVENT         │  1 checkout = 1 event
      │   checkout_id: chk_01   │  "ý định trả tiền" của buyer
      │   tổng: $43.50          │  đơn vị người dùng NHÌN THẤY
      └────────┬────────────────┘
      ┌────────┴──────────────────┐
      ▼                           ▼
┌──────────────────┐     ┌──────────────────┐  1 order = 1 khoản trả
│ PAYMENT ORDER A  │     │ PAYMENT ORDER B  │  cho 1 payee
│ seller A, $31.50 │     │ seller B, $12.00 │  đơn vị THỰC THI &
│ po_01HQ8A        │     │ po_01HQ8B        │  đơn vị IDEMPOTENCY
└────────┬─────────┘     └──────────────────┘
         ▼
┌────────────────────┐
│ PAYMENT TRANSACTION│  type: AUTH, psp_ref: pi_3N2b
└────────┬───────────┘  1 transaction = 1 lần tương tác với PSP
         ▼ vài giờ sau
┌────────────────────┐
│ PAYMENT TRANSACTION│  type: CAPTURE   ← cùng order, transaction khác
└────────┬───────────┘
         ▼ tuần sau, khách trả hàng
┌────────────────────┐
│ PAYMENT TRANSACTION│  type: REFUND, amount: 10.00
└────────────────────┘
```

- **Payment event** là **ý định** của người dùng, thứ buyer thấy trên màn hình "Đơn hàng của bạn". Nó có thể **thành công một phần** — seller A trả được, seller B thất bại. Gộp tất cả vào một dòng thì bạn không biểu diễn được trạng thái đó, và sẽ phải hoặc huỷ cả đơn (khách bực) hoặc nói dối trạng thái (kế toán bực).
- **Payment order** là **đơn vị thực thi** và đồng thời **đơn vị idempotency**: một payee, một số tiền, một vòng đời. Retry ở tầng này an toàn vì id ổn định.
- **Payment transaction** là **một lần tương tác cụ thể với PSP**. Bạn **cần** tầng này vì một order có vòng đời dài (auth hôm nay, capture ngày mai, refund tuần sau) và phải giữ dấu vết từng bước để đối soát — settlement file liệt kê theo *transaction*, không theo *order*.

> ⚠️ **Bẫy**: Chỉ có hai tầng và nhét trạng thái capture/refund vào cột của order, thì khi đối soát thấy dòng "REFUND pi_3N2b −10.00", bạn không có bản ghi nội bộ nào để ghép. Bạn buộc phải đối soát theo tổng — và đối soát theo tổng là cách chắc chắn để **không bao giờ tìm ra** chênh lệch nằm ở đâu.

### 4.4 Mô hình dữ liệu

```sql
CREATE TABLE payment_event (
  payment_event_id UUID PRIMARY KEY,
  checkout_id      VARCHAR(64) NOT NULL,
  buyer_id         VARCHAR(64) NOT NULL,
  total_amount     DECIMAL(19,4) NOT NULL,
  currency         CHAR(3) NOT NULL,
  status           VARCHAR(24) NOT NULL,   -- PENDING/COMPLETED/PARTIAL/FAILED
  idempotency_key  VARCHAR(64) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (idempotency_key)                 -- ← hàng rào chống double submit
);

CREATE TABLE payment_order (
  payment_order_id  UUID PRIMARY KEY,      -- do CLIENT sinh
  payment_event_id  UUID NOT NULL REFERENCES payment_event,
  seller_account    VARCHAR(64) NOT NULL,
  amount            DECIMAL(19,4) NOT NULL,
  currency          CHAR(3) NOT NULL,
  authorized_amount DECIMAL(19,4) DEFAULT 0,
  captured_amount   DECIMAL(19,4) DEFAULT 0,
  refunded_amount   DECIMAL(19,4) DEFAULT 0,
  status            VARCHAR(24) NOT NULL,
  psp_name          VARCHAR(32),
  version           INT NOT NULL DEFAULT 0,   -- optimistic locking
  updated_at        TIMESTAMPTZ NOT NULL,
  UNIQUE (payment_event_id, seller_account)   -- chống tách đôi cùng 1 dòng giỏ
);
CREATE INDEX ON payment_order (status, updated_at);  -- cho job quét kẹt

CREATE TABLE payment_transaction (
  transaction_id   UUID PRIMARY KEY,
  payment_order_id UUID NOT NULL REFERENCES payment_order,
  type             VARCHAR(16) NOT NULL,   -- AUTH/CAPTURE/REFUND/VOID
  amount           DECIMAL(19,4) NOT NULL,
  status           VARCHAR(24) NOT NULL,
  psp_reference    VARCHAR(128),           -- id bên PSP
  psp_idem_key     VARCHAR(64) NOT NULL,
  request_payload  JSONB,                  -- đã che PII
  response_payload JSONB,
  created_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (payment_order_id, type, psp_idem_key)
);
CREATE UNIQUE INDEX ON payment_transaction (psp_reference)
  WHERE psp_reference IS NOT NULL;         -- khoá ghép webhook & settlement file

CREATE TABLE idempotency_record (
  idempotency_key VARCHAR(64) PRIMARY KEY,
  request_hash    CHAR(64) NOT NULL,       -- SHA-256 của body
  state           VARCHAR(16) NOT NULL,    -- IN_PROGRESS / COMPLETED
  response_code   INT,
  response_body   JSONB,
  locked_until    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL     -- giữ 24h–7 ngày
);
```

**Vì sao SQL chứ không NoSQL?** Ở 12 TPS, câu hỏi "cái nào nhanh hơn" là vô nghĩa; câu hỏi đúng là "cái nào giúp tôi ít sai hơn". SQL thắng ở bốn điểm: (1) **transaction ACID đa bảng** — ghi `payment_order` + `payment_transaction` + `outbox` trong **một** transaction là yêu cầu cốt lõi (§12), với NoSQL bạn phải tự dựng saga cho thứ DB đã làm sẵn; (2) **unique constraint** — vũ khí chống double payment mạnh và rẻ nhất (§6.3); (3) **hệ sinh thái tuân thủ** — auditor hiểu Postgres/Oracle, công cụ báo cáo và người vận hành đều sẵn; (4) **hồ sơ thực chiến** — ngân hàng chạy RDBMS trên tiền suốt 40 năm.

> 💡 **Nguyên tắc**: Đây là bài hiếm hoi mà câu trả lời đúng là *"dùng Postgres"*, và đó là **dấu hiệu trưởng thành chứ không phải thiếu hiểu biết**. Nói rõ lý do: *"Tôi chọn RDBMS không phải vì nó nhanh — nó không nhanh. Tôi chọn vì nó cho tôi ACID, unique constraint và decimal chính xác, và ở 12 TPS tôi thừa ngân sách hiệu năng để mua những thứ đó."*

---

## Phần 5 — Deep dive 1: Không bao giờ chạm vào số thẻ

### 5.1 PCI DSS scope quyết định kiến trúc

PCI DSS áp dụng cho **mọi tổ chức lưu trữ, xử lý, hoặc truyền tải dữ liệu thẻ**. Ba từ "lưu trữ, xử lý, **truyền tải**" là chỗ chết người: nhiều kỹ sư nghĩ "tôi không lưu số thẻ vào DB nên an toàn" — sai. Nếu số thẻ **đi qua** server của bạn, dù chỉ nằm trong RAM 3 mili-giây rồi forward sang PSP, thì server đó, load balancer trước nó, mọi hệ thống log có thể vô tình ghi request body, và toàn bộ mạng chứa chúng đều rơi vào **CDE (Cardholder Data Environment)**.

| Mức | Điều kiện điển hình | Bạn phải làm gì |
|---|---|---|
| **SAQ A** | Toàn bộ trang thanh toán do bên thứ ba cung cấp (redirect hoặc iframe). Bạn **không bao giờ** chạm dữ liệu thẻ | ~20 mục tự đánh giá. Vài ngày làm việc, gần như miễn phí |
| **SAQ A-EP** | Trang của bạn phục vụ, nhưng dữ liệu thẻ đi thẳng tới PSP bằng JS của họ | ~140 mục + quét lỗ hổng hằng quý bởi ASV |
| **SAQ D / ROC** | Dữ liệu thẻ **đi qua** server của bạn | ~300+ mục, **audit tại chỗ bởi QSA hằng năm**, pen-test, phân đoạn mạng, quản lý khoá theo quy trình kép, log tập trung bất biến, kiểm soát truy cập vật lý. Hàng trăm nghìn đô/năm và một đội chuyên trách |

Chênh lệch giữa SAQ A và SAQ D không phải "khó hơn một chút" — nó là chênh lệch giữa **một tuần công việc** và **một phòng ban vĩnh viễn**.

> 💡 **Nguyên tắc, nói nguyên văn**: *"Quyết định kiến trúc đắt giá nhất bài này là quyết định về **phạm vi tuân thủ**, không phải về công nghệ. Bằng cách để số thẻ không bao giờ chạm hệ thống của tôi, tôi kéo mình từ SAQ D xuống SAQ A — và quan trọng hơn tiền: **tôi không thể làm rò rỉ dữ liệu mà tôi không hề có.**"* Mọi vụ rò rỉ thẻ lớn trong lịch sử (Target 2013, Home Depot 2014, British Airways 2018) đều xảy ra ở nơi dữ liệu thẻ *có mặt*.

### 5.2 Ba cách tích hợp và cái giá của mỗi cách

```
 (A) REDIRECT / HOSTED PAGE      (B) IFRAME / HOSTED FIELDS    (C) SDK NATIVE
 site của bạn                    site của bạn                   app di động
 ┌───────────────┐               ┌─────────────────────┐        ┌──────────────┐
 │ [Thanh toán]  │               │ Họ tên: [______]    │        │ SDK của PSP  │
 └───────┬───────┘               │ ┌─────────────────┐ │        │ form native  │
         │ 302                   │ │iframe của PSP   │ │        └──────┬───────┘
         ▼                       │ │ số thẻ [_____]  │ │               ▼
 ┌───────────────┐               │ └─────────────────┘ │        số thẻ → PSP
 │ trang của PSP │ ← số thẻ ở đây│ [Trả tiền]          │        trả về token
 │ (domain PSP)  │               └─────────────────────┘
 └───────┬───────┘                  số thẻ → thẳng PSP
         ▼ redirect về + token
   site của bạn
```

| Tiêu chí | Redirect | Iframe / hosted fields | SDK native |
|---|---|---|---|
| **PCI scope** | Thấp nhất, rõ ràng nhất | Thấp — nhưng SAQ A-EP nếu JS của bạn đụng vào field | Thấp |
| **Kiểm soát UX** | Kém — rời site, đổi domain | Tốt — chỉ ô nhạy cảm là của PSP | Tốt nhất |
| **Conversion** | Thấp hơn (đổi domain gây nghi ngờ) | Cao | Cao |
| **3DS** | PSP lo hết, đơn giản nhất | Phức tạp hơn: challenge trong iframe/popup | SDK lo |
| **Rủi ro script độc** | Gần như không | **Có thật**: Magecart chèn JS vào trang cha rồi vẽ **input giả đè lên iframe**. Phòng bằng CSP nghiêm ngặt + SRI | Thấp |
| **Khi nào chọn** | Mặc định — ưu tiên tuân thủ và tốc độ ra mắt | Khi conversion quan trọng và bạn có năng lực bảo mật frontend | App di động |

> ⚠️ **Bẫy ít người nêu**: iframe *không* tự động cho bạn SAQ A. Nếu JavaScript **của bạn** chạy trên cùng trang chứa ô nhập thẻ và về lý thuyết có thể đọc chúng, nhiều QSA sẽ xếp bạn vào SAQ A-EP. Điểm quyết định là: PSP có phục vụ **toàn bộ** ô nhập từ domain của họ không, và trang cha có CSP chặt không.

### 5.3 Luồng hosted payment page

```
 Browser            Payment Service          PSP
   │ 1. POST /checkout    │                   │
   ├─────────────────────►│ 2. ghi payment_event + order (CREATED)
   │                      │ 3. POST /payment_sessions
   │                      │    {amount, order_id, idem_key = order_id,
   │                      │     return_url, webhook_url}
   │                      ├──────────────────►│
   │                      │◄──────────────────┤ 4. {session_token, hosted_url}
   │ 6. {hosted_url}      │ 5. lưu token (PENDING)
   │◄─────────────────────┤                   │
   │ 7. user nhập thẻ TRÊN DOMAIN CỦA PSP     │
   ├─────────────────────────────────────────►│ 8. auth qua acquirer →
   │ 9. redirect về return_url?token=…&result=│    network → issuer
   │◄─────────────────────────────────────────┤
   │10. GET /payments/{id}│◄──────────────────┤ 11. WEBHOOK (async)
   │    hiển thị trạng thái│                  │     payment.authorized
   │                      │ 12. verify chữ ký → cập nhật trạng thái →
   │                      │     ghi ledger → cộng wallet
```

Hai điều tinh tế quyết định bạn có phải người từng làm thật hay không:

**Redirect (bước 9) KHÔNG phải nguồn sự thật.** Nó là cú chuyển hướng trình duyệt, dưới quyền kiểm soát của người dùng: họ có thể đóng tab, mất mạng, hoặc **tự gõ `?result=success` vào thanh địa chỉ** để "thanh toán" miễn phí. **Nguồn sự thật duy nhất là webhook (bước 11) hoặc một lần gọi API server-to-server.** Redirect chỉ để đưa người dùng về đúng trang.

**Trang sau redirect phải chấp nhận `PENDING`**, vì webhook có thể tới **sau** khi người dùng đã quay về. Đừng thiết kế trang "Cảm ơn, thanh toán thành công" mà không có nhánh "Chúng tôi đang xác nhận" — với 3DS hay giao dịch bị soi xét thủ công, "ít phút" có thể là vài giờ.

### 5.4 Token hoá và "thanh toán lần sau"

Sau lần trả đầu, PSP cấp cho bạn một **token thẻ** dài hạn để làm thanh toán một chạm và subscription. Ba điểm:

- Token **vô giá trị nếu bị rò rỉ** ngoài ngữ cảnh tài khoản merchant của bạn — nó chỉ dùng được với API key của bạn tại PSP đó. Đó chính là ý nghĩa của token hoá: biến một bí mật **toàn cầu** (số thẻ, dùng được mọi nơi) thành một bí mật **cục bộ**.
- Token **gắn chặt với PSP**. Đổi PSP = mất toàn bộ thẻ đã lưu = khách phải nhập lại = mất doanh thu. Có quy trình migration giữa các PSP dưới giám sát PCI nhưng chậm, tốn kém, không phải PSP nào cũng chịu. **Nêu đây là rủi ro lock-in thật** khi được hỏi về multi-PSP.
- Được phép lưu để hiển thị: 4 số cuối, thương hiệu thẻ, tháng/năm hết hạn. **Tuyệt đối không lưu CVV** — PCI cấm lưu CVV sau khi authorization hoàn tất, kể cả đã mã hoá, không ngoại lệ.

---

## Phần 6 — Deep dive 2: Double payment là tội nặng nhất

### 6.1 Vì sao nó khó đến thế

Bạn muốn "gọi PSP **đúng một lần**". Nhưng trên mạng không tồn tại exactly-once ở tầng truyền tin:

```
 Executor                              PSP
    │  POST /charge {amount: 31.50}     │
    ├──────────────────────────────────►│  ✓ nhận được
    │                                   │  ✓ TRỪ TIỀN THẺ THẬT
    │        ✗ response mất             │
    │◄────────── X X X ─────────────────┤  (mạng đứt / LB restart)
    │  TIMEOUT sau 30s                  │
    │  ❓ Tiền đã trừ hay chưa?  Không có cách nào biết
    │     chỉ bằng thông tin tại chỗ.
```

Hai khả năng không phân biệt được: (a) PSP chưa nhận → phải retry, không thì khách không trả được tiền; (b) PSP đã xử lý xong, chỉ mất response → retry là trừ tiền hai lần. **Không có thuật toán nào phân biệt hai trường hợp này chỉ bằng thông tin cục bộ** — đây là bài toán Two Generals, một kết quả bất khả thi đã được chứng minh, không phải hạn chế kỹ thuật sẽ được khắc phục.

Lối thoát duy nhất: **đổi bài toán**. Thay vì cố gửi đúng một lần (bất khả thi), gửi **ít nhất một lần** (dễ: cứ retry), rồi làm cho **phía nhận xử lý nhiều lần cũng như một lần** (idempotency). At-least-once **+** at-most-once = exactly-once ở **tầng hiệu ứng**, dù tầng truyền tin vẫn lộn xộn.

> 💡 **Nguyên tắc**: *"Exactly-once **delivery** không tồn tại. Exactly-once **processing** thì có — và nó được xây từ at-least-once delivery cộng xử lý idempotent ở phía nhận. Đây không phải mẹo vặt; đây là cách duy nhất."*

### 6.2 Idempotency key: sinh ở đâu, lưu thế nào

**Sinh ở đâu.** Key phải do bên **khởi xướng ý định** sinh, và **ổn định qua mọi lần retry của cùng một ý định**:

- Người dùng bấm "Thanh toán": key sinh **khi trang checkout được render**, không phải khi bấm nút. Sinh lúc bấm thì bấm hai lần = hai key = hai giao dịch.
- Gọi giữa service: key là hàm của **id nghiệp vụ** (`payment_order_id`), không sinh UUID mới mỗi lần gọi.
- Mạnh hơn: **key suy dẫn** — `sha256(payment_order_id + ":CAPTURE:" + attempt_group)`. Bất kỳ node nào, bất kỳ lúc nào, tính lại đều ra cùng key — kể cả sau khi process chết **giữa** lúc sinh key và lúc lưu nó.

**Lưu thế nào.** Vòng đời của bảng `idempotency_record`:

```
1. Nhận request kèm key K, body B
2. BEGIN
3. INSERT (K, sha256(B), 'IN_PROGRESS', locked_until = now()+60s)
   ├─ OK          → ta là người đầu tiên, sang bước 5
   └─ vi phạm UNIQUE → đã có người khác, sang bước 4
4. Đọc bản ghi cũ:
   ├─ COMPLETED + request_hash KHỚP  → TRẢ VỀ response đã lưu, không xử lý lại
   ├─ COMPLETED + request_hash KHÁC  → 422: "key này đã dùng cho request khác"
   ├─ IN_PROGRESS, chưa hết khoá     → 409: "đang xử lý". KHÔNG chạy song song
   └─ IN_PROGRESS, khoá ĐÃ hết hạn   → node cũ có thể đã chết. Chiếm lại khoá
                                        bằng CAS, NHƯNG trước hết phải HỎI PSP
                                        xem giao dịch đã tồn tại chưa (§10.3)
5. COMMIT   ← khoá đã giữ, không ai khác vào được
6. Thực thi nghiệp vụ thật (gọi PSP…)
7. UPDATE state='COMPLETED', lưu response — lý tưởng là CÙNG transaction
   với việc ghi kết quả nghiệp vụ
```

Ba chi tiết hay bị bỏ sót:

**(1) `request_hash` để làm gì?** Phát hiện client tái dùng key cho request khác. Nếu key K lần đầu dùng trả 31,50 đô, lần sau trả 3.150 đô, thì hoặc client có bug, hoặc có kẻ đang thử tấn công. Lỗi rõ ràng còn hơn im lặng trả kết quả cũ (khách tưởng đã trả 3.150) hoặc xử lý như mới (double charge).

**(2) Vì sao cần trạng thái `IN_PROGRESS`?** Vì hai request cùng key có thể tới **đồng thời** ở hai node. Nếu chỉ ghi bản ghi sau khi xử lý xong, cả hai node đều thấy "chưa có" và cả hai đều gọi PSP. Ghi `IN_PROGRESS` **trước** khi gọi PSP, trong một transaction, là thứ biến unique constraint thành một **khoá phân tán**.

**(3) Vì sao cần `locked_until`?** Vì node giữ khoá có thể chết vĩnh viễn, và key sẽ kẹt mãi. Nhưng chiếm lại khoá là thao tác nguy hiểm — node cũ có thể đã kịp gọi PSP. Nên trước khi chiếm lại, **bắt buộc truy vấn PSP bằng chính key đó**.

> ⚠️ **Bẫy phổ biến nhất**: dùng Redis `SETNX` làm kho idempotency. Nhanh và gọn, nhưng Redis mặc định **không bền** — mất một node, failover, hoặc AOF chưa fsync là key biến mất, và retry sẽ tính tiền lần hai. Với **tiền**, kho idempotency phải nằm trong **cùng cơ sở dữ liệu giao dịch** với dữ liệu nghiệp vụ, để "ghi khoá" và "ghi kết quả" nằm trong **cùng một transaction**. Redis chỉ là lớp chặn nhanh phía trước, **không bao giờ** là hàng phòng thủ cuối cùng.

### 6.3 Unique constraint là hàng phòng thủ mạnh nhất

```
  CHECK-THEN-ACT (SAI)                  INSERT-AND-CATCH (ĐÚNG)
  T1: SELECT … key=K  → trống           T1: INSERT … key=K  → OK
  T2: SELECT … key=K  → trống           T2: INSERT … key=K  → ERROR 23505
  T1: INSERT … key=K  → OK              T2: bắt lỗi, đọc bản ghi cũ,
  T2: INSERT … key=K  → OK                  trả về kết quả đã có
  ⇒ HAI bản ghi. Double charge.         ⇒ MỘT bản ghi. An toàn.
```

Cách sai chứa một cửa sổ đua giữa `SELECT` và `INSERT`. Ở 12 TPS bạn có thể chạy nhiều tháng không gặp — cho tới hôm Black Friday, khi người dùng bấm nút hai lần và hai request rơi vào hai pod cách nhau 40 mili-giây. Ba lớp constraint nên có, mỗi lớp bắt một kiểu trùng:

```sql
UNIQUE (idempotency_key)                      -- chặn cùng 1 request HTTP gửi 2 lần
UNIQUE (payment_event_id, seller_account)     -- chặn tách đôi cùng 1 dòng giỏ hàng
UNIQUE (payment_order_id, type, psp_idem_key) -- chặn gọi PSP 2 lần cùng mục đích
```

> 💡 **Nguyên tắc**: **Bất biến nào database ép buộc được thì đừng ép bằng code ứng dụng.** Code có bug, có race, có version cũ chạy song song version mới khi deploy. Unique index thì đúng **ngay cả khi mọi tầng phía trên đã sai** — trong hệ thống tiền, hãy chọn hàng phòng thủ không phụ thuộc vào sự cẩn thận của lập trình viên.

### 6.4 Chuỗi idempotency phải liền mạch từ đầu tới cuối

```
Browser ─K1─► API GW ─K1─► Payment ─K2─► Queue ─K2─► Executor ─K3─► PSP
                            Service
  K1 = idempotency key của phiên checkout
  K2 = payment_order_id (dedup id của queue)
  K3 = payment_order_id + ":AUTH" (Idempotency-Key header gửi PSP)
  MỌI mắt xích đều có bảo vệ riêng. Chuỗi chỉ mạnh bằng mắt yếu nhất.
```

| Mắt xích | Rủi ro trùng | Bảo vệ |
|---|---|---|
| Browser → API | User bấm hai lần; trình duyệt tự retry | `Idempotency-Key` sinh lúc render + vô hiệu hoá nút (UX, không phải bảo mật) |
| API → Payment Service | LB retry; client timeout rồi thử lại | Bảng `idempotency_record` + unique constraint |
| Payment Service → Queue | Publish hai lần do retry sau timeout | **Outbox pattern** (§12) + dedup id của queue |
| Queue → Executor | Queue giao lại (at-least-once là mặc định) | Kiểm trạng thái order trước khi hành động; unique trên `payment_transaction` |
| Executor → PSP | Timeout mạng rồi retry | `Idempotency-Key` header của PSP — PSP trả **cùng** kết quả cũ |
| PSP → Webhook → ta | PSP gửi nhiều lần | Dedup theo `psp_event_id` + xử lý idempotent (§11) |

> ⚠️ **Bẫy**: Đặt idempotency ở tầng API rồi coi như xong. Nhưng cú gọi PSP nằm **sau** queue, và queue là at-least-once. Không gửi `Idempotency-Key` xuống PSP thì một lần queue giao lại message = một lần trừ tiền nữa — trong khi tầng API vẫn "đúng".

Một điểm về **phía PSP** rất ít người nêu: PSP giữ idempotency key trong khoảng 24 giờ (Stripe) tới vài ngày. Nếu bạn retry **sau** cửa sổ đó, PSP coi là request mới và **tính tiền lần nữa**. Vì vậy **chính sách retry của bạn phải kết thúc trước khi cửa sổ idempotency của PSP hết hạn**; quá hạn thì không retry mù mà phải chuyển sang truy vấn trạng thái (§10.3).

---

## Phần 7 — Deep dive 3: Ledger và bút toán kép

### 7.1 Vì sao không thể chỉ lưu một cột `balance`

Cách ngây thơ: `UPDATE account SET balance = balance − 31.50 WHERE id = buyer`. Nó chạy được, và sai ở bốn chỗ chí mạng: (1) **không trả lời được "vì sao"** — số dư là 1.284,30 đô, vì sao? không biết, không có lịch sử, chỉ có kết quả; (2) **không phát hiện được lỗi** — một bug làm mất một lần `UPDATE` thì tiền biến mất và **không có gì báo động**, số dư vẫn là một số hợp lệ; (3) **không hoàn tác được có kiểm soát**; (4) **không chịu được kiểm toán** — `UPDATE` phá huỷ trail theo định nghĩa.

Bút toán kép (double-entry bookkeeping) — phát minh của thương gia Venice thế kỷ 15, được Luca Pacioli hệ thống hoá năm 1494 — giải quyết cả bốn, và vẫn là nền tảng của mọi hệ thống tài chính nghiêm túc sau **năm thế kỷ**. Đó không phải sự trì trệ: nó là một cấu trúc dữ liệu có **bất biến kiểm tra được**, thứ rất ít cấu trúc dữ liệu có.

### 7.2 Debit và credit thực sự nghĩa là gì

Trực giác "debit = trừ, credit = cộng" **sai**. Định nghĩa đúng, thuần cơ học: **debit** ghi vào **cột trái**, **credit** ghi vào **cột phải**; việc nó làm số dư tăng hay giảm **phụ thuộc loại tài khoản**.

```
 Loại tài khoản          Debit (trái)  Credit (phải)   Ví dụ
 ──────────────────────────────────────────────────────────────────────
 Asset    (tài sản)         TĂNG ↑       giảm ↓        tiền ở ngân hàng
 Expense  (chi phí)         TĂNG ↑       giảm ↓        phí PSP
 Liability(nợ phải trả)     giảm ↓       TĂNG ↑        tiền ta nợ seller (ví!)
 Equity   (vốn)             giảm ↓       TĂNG ↑
 Revenue  (doanh thu)       giảm ↓       TĂNG ↑        hoa hồng sàn

 Ghi nhớ DEALER: Debit tăng  = Expense, Asset, Dividend
                 Credit tăng = Liability, Equity, Revenue
```

Chi tiết quan trọng nhất cho một sàn e-commerce: **số dư ví của seller là một khoản NỢ PHẢI TRẢ của bạn, không phải tài sản của bạn.** Bạn đang giữ hộ tiền của người khác. Nên khi seller có thêm tiền, bạn **credit** ví họ (nợ của bạn tăng). Hiểu sai điều này là hiểu sai bản chất kinh doanh — và ở nhiều khu vực pháp lý, tiền giữ hộ phải nằm trong **tài khoản tách biệt (segregated account)**, không được trộn với tiền vận hành.

**Bất biến tối thượng: trong mọi bút toán, TỔNG DEBIT = TỔNG CREDIT.** Không ngoại lệ. Đây là một **checksum tích hợp sẵn trên tiền**: lệch một xu là có bug, và bạn biết **ngay lập tức** chứ không phải ba tháng sau.

### 7.3 Ghi sổ cho một giao dịch thật

Buyer trả 31,50 đô cho seller A. Sàn ăn hoa hồng 10% (3,15 đô). PSP thu phí 1,21 đô.

```
 JE-1001  ref: po_01HQ8A  type: CAPTURE   (tiền về acquirer, ta chưa nhận thật)
 Account                          Debit     Credit
 ───────────────────────────────────────────────────
 Asset:PSP_Receivable             31.50
 Liability:Seller_A:Pending                  28.35
 Revenue:Platform_Commission                  3.15
 ───────────────────────────────────────────────────
 TỔNG                             31.50     31.50   ✓ CÂN
```

Đọc thành lời: "PSP đang nợ ta 31,50 (tài sản tăng → debit). Trong đó ta nợ seller A 28,35 (nợ tăng → credit) và ta kiếm 3,15 doanh thu." Tiền chưa vào ngân hàng ta, nên **không** đụng `Asset:Bank`.

```
 JE-1042  ref: settlement_2026-03-12  type: SETTLEMENT   (T+2, trừ phí)
 Asset:Bank_Operating             30.29
 Expense:PSP_Fees                  1.21
 Asset:PSP_Receivable                        31.50
 ───────────────────────────────────────────────────
 TỔNG                             31.50     31.50   ✓ CÂN
```

Chú ý: `PSP_Receivable` bị credit đúng 31,50 — **triệt tiêu** khoản debit ở JE-1001. Nếu sau settlement mà `PSP_Receivable` còn số dư khác 0 cho giao dịch đó, bạn vừa **tự động phát hiện một chênh lệch**. Đây chính là cơ chế của §9.

```
 JE-1043  type: FUNDS_AVAILABLE          JE-2051  type: PAYOUT
 Liability:Seller_A:Pending   28.35      Liability:Seller_A:Available  28.35
 Liability:Seller_A:Available     28.35  Asset:Bank_Operating               28.35
 ───────────────────────────────────     ────────────────────────────────────────
 TỔNG  28.35 = 28.35  ✓                  TỔNG  28.35 = 28.35  ✓
```

```
 JE-3077  ref: po_01HQ8A  type: REFUND  amount: 10.00   (khách trả hàng 1 phần)
 Liability:Seller_A:Available      9.00
 Revenue:Platform_Commission       1.00
 Asset:Bank_Operating                        10.00
 ───────────────────────────────────────────────────
 TỔNG                             10.00     10.00   ✓ CÂN
```

Điều quan trọng: **ta KHÔNG sửa JE-1001.** Nó tồn tại vĩnh viễn, ghi lại sự thật rằng ngày 10/3 đã có giao dịch 31,50 đô. Refund là một **bút toán mới, ngược chiều**. Đây là ý nghĩa thực tế của append-only: lịch sử không bao giờ bị viết lại, chỉ được bổ sung. Ghi sai thì ghi một **bút toán đảo (reversing entry)** kèm lý do — không `UPDATE`, không `DELETE`.

### 7.4 Lược đồ ledger

```sql
CREATE TABLE journal_entry (
  entry_id        BIGSERIAL PRIMARY KEY,
  reference_type  VARCHAR(32) NOT NULL,   -- PAYMENT_ORDER/SETTLEMENT/PAYOUT
  reference_id    VARCHAR(64) NOT NULL,
  entry_type      VARCHAR(32) NOT NULL,   -- CAPTURE/REFUND/…
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,  -- ghi sổ cũng phải idempotent!
  effective_at    TIMESTAMPTZ NOT NULL,   -- thời điểm NGHIỆP VỤ
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),  -- thời điểm GHI SỔ
  prev_hash       CHAR(64), entry_hash CHAR(64),       -- chuỗi băm chống sửa
  metadata        JSONB
);

CREATE TABLE journal_line (
  line_id   BIGSERIAL PRIMARY KEY,
  entry_id  BIGINT NOT NULL REFERENCES journal_entry,
  account   VARCHAR(128) NOT NULL,        -- 'Liability:Seller_A:Pending'
  direction CHAR(2) NOT NULL CHECK (direction IN ('DR','CR')),
  amount    DECIMAL(19,4) NOT NULL CHECK (amount > 0),   -- LUÔN DƯƠNG
  currency  CHAR(3) NOT NULL
);
CREATE INDEX ON journal_line (account, entry_id);

REVOKE UPDATE, DELETE ON journal_entry, journal_line FROM app_user;
```

Bốn chi tiết đáng bảo vệ:

- **`amount` luôn dương, chiều nằm ở `direction`.** Cho phép số âm nghĩa là có hai cách biểu diễn cùng một việc (`DR −10` và `CR +10`), và mọi truy vấn tổng hợp phải xử lý cả hai. Một cách biểu diễn duy nhất = ít bug hơn.
- **`effective_at` tách khỏi `recorded_at`.** Giao dịch xảy ra 23:58 ngày 10/3 nhưng webhook tới 00:03 ngày 11/3. Báo cáo tài chính theo `effective_at`; điều tra sự cố theo `recorded_at`. Trộn hai cái là nguồn gốc của những chênh lệch cuối tháng không ai giải thích nổi.
- **`idempotency_key` trên bút toán.** Ghi sổ cũng bị gọi lại khi consumer retry. Không có key này thì ledger có bút toán trùng — và tệ hơn, nó vẫn **cân** (bản sao cũng cân), nên bất biến tổng không bắt được: wallet phồng lên, ledger vẫn "hợp lệ", và bạn mất rất lâu để tìm ra.
- **Ép append-only bằng quyền của DB** + trigger chặn `UPDATE`/`DELETE`. "Chúng tôi quy ước không update" không phải một biện pháp kiểm soát; auditor không chấp nhận.

### 7.5 Bất biến phải được kiểm tra liên tục

```
 Mức 1 — MỖI BÚT TOÁN, trong cùng transaction:
   SUM(DR) = SUM(CR) trong cùng entry_id, cùng currency. Vi phạm → rollback.
   Kiểm tra rẻ nhất và bắt được nhiều bug nhất.

 Mức 2 — MỖI GIỜ, trial balance toàn hệ thống:
   SELECT currency, SUM(CASE WHEN direction='DR' THEN amount ELSE -amount END)
   FROM journal_line GROUP BY currency;
   PHẢI bằng 0 cho mọi currency. Khác 0 → cảnh báo mức cao nhất.

 Mức 3 — MỖI NGÀY, đối chiếu ledger ↔ wallet:
   wallet.balance của seller X == SUM journal_line 'Liability:Seller_X:*' ?
   Lệch ⇒ wallet đã drift khỏi nguồn sự thật ⇒ dựng lại wallet từ ledger.
```

> 💡 **Nguyên tắc**: Wallet là **view**, ledger là **sự thật**. Khi hai cái lệch, **ledger luôn đúng** và wallet phải tính lại từ ledger. Thiết kế wallet sao cho **tái tạo hoàn toàn được** bằng cách phát lại ledger từ đầu — khả năng đó là bảo hiểm của bạn, và phải **diễn tập định kỳ**, đừng đợi tới lúc khủng hoảng mới thử lần đầu.

> ⚠️ **Bẫy**: Đừng tính số dư bằng `SUM` toàn bộ lịch sử trên đường nóng — sau vài năm là hàng tỉ dòng. Dùng **snapshot số dư theo ngày** rồi cộng dồn delta. Snapshot là tối ưu hoá, **không phải nguồn sự thật**, và phải được kiểm chứng lại bằng full replay theo lịch.

---

## Phần 8 — Deep dive 4: State machine của một payment

### 8.1 Vì sao phải mô hình hoá tường minh

Cám dỗ lớn nhất là dùng vài cột boolean: `is_paid`, `is_captured`, `is_refunded`, `ledger_updated`. Nó hỏng vì ba lý do: (1) **tổ hợp vô nghĩa tồn tại được** — 5 boolean = 32 tổ hợp, chỉ ~8 hợp lệ, phần còn lại là trạng thái mà DB **cho phép** nhưng nghiệp vụ **cấm** (`is_refunded=true` mà `is_captured=false`), và sớm muộn một bug sẽ tạo ra chúng; (2) **không biết chuyển tiếp nào hợp lệ** — có được refund một giao dịch `PENDING` không? với boolean, không nơi nào trong code trả lời, mỗi chỗ tự đoán và đoán khác nhau; (3) **không có chỗ móc vào** cho audit, thông báo, phát sự kiện.

### 8.2 State machine

```
                        ┌──────────┐
                        │ CREATED  │  ghi DB, chưa gọi ai
                        └────┬─────┘
                        ┌────▼─────┐
              ┌─────────│ PENDING  │────────┐ PSP từ chối (thẻ hết hạn,
   risk hold /│         └────┬─────┘        │ không đủ tiền)
   3DS chờ    │              │ approved     ▼
        ┌─────▼──────┐  ┌────▼──────┐   ┌────────┐
        │ REQUIRES_  │  │AUTHORIZED │   │ FAILED │ ← CUỐI. Thử lại = ORDER MỚI
        │ ACTION     │  └──┬─────┬──┘   └────────┘
        └─────┬──────┘     │     │ void
              └────────────┘     ▼
                     │      ┌──────────┐
            capture  │      │ CANCELED │ ← CUỐI (hold được thả)
                     ▼      └──────────┘
               ┌──────────┐
               │ CAPTURED │  tiền đang trên đường
               └────┬─────┘
                    │ settlement file xác nhận
               ┌────▼─────┐
               │ SETTLED  │  tiền đã vào TK ta
               └────┬─────┘
          ┌─────────┴──────────┐
          ▼ refund             ▼ khách khiếu nại lên ngân hàng
   ┌────────────────┐    ┌──────────┐
   │ REFUNDED /     │    │ DISPUTED │
   │ PARTIALLY_     │    └────┬─────┘ ta nộp bằng chứng
   │ REFUNDED       │    ┌────┴──────────┐
   └────────────────┘    ▼               ▼
                  ┌─────────────┐  ┌──────────────┐
                  │ DISPUTE_WON │  │ CHARGED_BACK │ ← mất tiền + phí phạt
                  └─────────────┘  └──────────────┘
```

Ba điều lộ ra ngay mà mô hình boolean không cho thấy:

- **`REQUIRES_ACTION` là trạng thái thật, không phải lỗi.** Với 3DS/SCA, giao dịch dừng ở đây chờ người dùng xác nhận trên app ngân hàng. Không có trạng thái này thì code coi nó là "đang lỗi" và retry — tạo giao dịch thứ hai trong khi giao dịch thứ nhất vẫn đang chờ khách bấm OK.
- **`DISPUTED` đến từ **bên ngoài**, hàng tháng sau khi đã `SETTLED`.** Vòng đời một payment order **không** kết thúc khi tiền vào tài khoản. Đừng archive dữ liệu quá sớm.
- **`FAILED` là trạng thái cuối, không quay lại `PENDING`.** Muốn thử lại thì tạo **payment order mới** với id mới. Vì sao? Vì nếu cho quay lại, lịch sử trạng thái thành một vòng lặp và bạn không phân biệt được "lần thử thứ nhất thất bại" với "lần thử thứ ba thành công" khi đối soát.

### 8.3 Ép chuyển tiếp hợp lệ ngay ở tầng dữ liệu

```sql
UPDATE payment_order
   SET status = 'CAPTURED', version = version + 1, updated_at = now()
 WHERE payment_order_id = $1
   AND status  = 'AUTHORIZED'    -- ← chỉ đi được từ đúng trạng thái nguồn
   AND version = $2;
-- Ảnh hưởng 0 dòng ⇒ ai đó đã đổi trước ta ⇒ đọc lại và quyết định,
-- TUYỆT ĐỐI không ghi đè mù.

CREATE TABLE payment_state_history (       -- append-only
  id BIGSERIAL PRIMARY KEY,
  payment_order_id UUID NOT NULL,
  from_state VARCHAR(24), to_state VARCHAR(24) NOT NULL,
  reason VARCHAR(64),       -- 'psp_webhook' / 'manual_ops' / 'timeout_job'
  actor  VARCHAR(64),       -- service nào, hoặc user nào
  psp_event_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Mệnh đề `AND status = 'AUTHORIZED'` là chi tiết nhỏ nhưng quan trọng bậc nhất: nó biến `UPDATE` thành một phép **compare-and-swap**. Khi hai webhook đến sai thứ tự (§11.3), cái đi sau sẽ ảnh hưởng 0 dòng và bị bỏ qua an toàn, thay vì kéo trạng thái **lùi**.

### 8.4 Job quét giao dịch kẹt

Hệ thanh toán nào cũng có giao dịch kẹt: webhook không bao giờ tới, PSP quên, mạng đứt đúng lúc.

```
Mỗi 5 phút:
  SELECT * FROM payment_order
   WHERE status IN ('PENDING','REQUIRES_ACTION','AUTHORIZED')
     AND updated_at < now() - INTERVAL '15 minutes'  LIMIT 500;

  Với mỗi bản ghi → GỌI PSP HỎI TRẠNG THÁI (không retry mù!)
     ├─ succeeded   → tiến trạng thái, ghi ledger
     ├─ failed      → chuyển FAILED, thông báo user
     ├─ vẫn pending → để yên, tăng attempt_count
     └─ không biết  → an toàn để gửi lại (dùng đúng idem key)

  Ngưỡng leo thang:
     PENDING     > 1 giờ   → cảnh báo on-call
     AUTHORIZED  > 5 ngày  → SẮP HẾT HẠN AUTH, phải capture hoặc void NGAY
     bất kỳ      > 7 ngày  → hàng đợi xử lý thủ công
```

> 💡 **Nguyên tắc**: Trong hệ thanh toán, **thời gian là một sự kiện**. Nhiều thứ quan trọng nhất được biểu diễn bằng "một khoảng thời gian đã trôi qua mà không có gì xảy ra" — và không message queue nào phát ra sự kiện đó cho bạn. Một hệ thanh toán không có timeout sweeper là một hệ thanh toán sẽ âm thầm đánh mất giao dịch.

---

## Phần 9 — Deep dive 5: Reconciliation (đối soát)

### 9.1 Vì sao bắt buộc

§6–§8 là phòng thủ **chủ động**: cố làm đúng ngay từ đầu. Đối soát là phòng thủ **bị động**: giả định rằng bất chấp mọi nỗ lực vẫn sẽ có sai, và xây cơ chế **phát hiện ra cái sai đó**. Vì sao phải giả định vậy? Vì bạn phối hợp với hệ thống bạn không kiểm soát, qua kênh không đáng tin, với đối tác có thể tự đổi hành vi. Webhook mất vĩnh viễn. PSP có bug. Ngân hàng trừ phí bạn không lường trước. **Và khả năng "ta có bug" không bao giờ bằng 0.**

Trong ngành tài chính, câu hỏi không phải "hệ thống có sai không" mà là "**bao lâu thì ta biết mình sai**". Đối soát là câu trả lời — và nó là yêu cầu **pháp lý**, không phải lựa chọn kỹ thuật.

### 9.2 Luồng đối soát

```
 23:00 ─ PSP đóng sổ trong ngày, sinh settlement file
 02:00 ─ File trên SFTP/S3:  settlement_2026-03-12.csv
         psp_ref, merchant_ref, type, gross, fee, net, currency, status, ts
         pi_3N2b, po_01HQ8A, CAPTURE, 31.50, 1.21, 30.29, USD, settled, …
 02:05 ─ Tải file, kiểm checksum + chữ ký, lưu BẢN GỐC vào object storage
         BẤT BIẾN — đây là bằng chứng pháp lý, không được sửa
 02:10 ─ Nạp vào bảng staging settlement_line
 02:15 ─ MATCHING: ghép settlement_line ↔ payment_transaction
         khoá chính: psp_reference │ dự phòng: (merchant_ref, amount, ngày)
 02:30 ─ Sinh báo cáo chênh lệch, phân loại, tự xử cái tự xử được
 03:00 ─ Ghi bút toán SETTLEMENT vào ledger (JE-1042 kiểu §7.3)
 08:00 ─ Đội tài chính mở dashboard, xử lý phần còn lại
```

### 9.3 Phân loại chênh lệch

| Nhóm | Nghĩa là gì | Nguyên nhân thường gặp | Xử lý |
|---|---|---|---|
| **MATCHED** | Có ở cả hai bên, số khớp | Đường hạnh phúc — mong đợi ≥99,5% | Ghi bút toán settlement, đóng |
| **MISMATCH** (lệch số tiền) | Có cả hai bên, số khác | Phí PSP khác dự tính; quy đổi ngoại tệ; partial capture ta chưa biết; làm tròn | Lệch trong ngưỡng phí đã biết → **tự động** điều chỉnh bằng bút toán `Expense:PSP_Fees`. Ngoài ngưỡng → hàng đợi thủ công |
| **MISSING_INTERNAL** | Có ở PSP, **không có** ở ta | Webhook mất; ta crash sau khi gọi PSP trước khi ghi DB; giao dịch do chính PSP khởi tạo (chargeback, phí tháng) | **Nghiêm trọng nhất** — PSP đã lấy tiền của khách mà ta không biết. Truy vấn PSP lấy chi tiết, tạo bản ghi bù, ghi ledger, và **kiểm xem đơn hàng đã giao chưa** |
| **MISSING_EXTERNAL** | Có ở ta, **không có** ở PSP | Ta ghi optimistic trước khi PSP xác nhận; thuộc chu kỳ settlement sau; PSP đã void không báo | Nếu giao dịch mới hôm qua, có thể chỉ lệch chu kỳ — **đợi thêm một ngày** rồi mới báo động. Quá 3 ngày → điều tra |
| **DUPLICATE** | Cùng `psp_reference` hai lần | Idempotency thủng ở đâu đó; PSP gửi lại dòng cũ | Nếu ta thật sự tính tiền hai lần → **refund ngay, chủ động**, đừng đợi khách phát hiện. Đồng thời mở điều tra sự cố |

Ba mức tự động hoá, đúng như thực tế vận hành:

```
 Nhóm A — phân loại được VÀ có quy trình chuẩn   → TỰ ĐỘNG hoàn toàn
    vd: lệch = phí PSP đã biết → sinh bút toán điều chỉnh, đóng
    Mục tiêu: ≥95% số dòng chênh lệch rơi vào đây
 Nhóm B — phân loại được NHƯNG cần người quyết   → HÀNG ĐỢI CHO OPS
    vd: chargeback mới → có nộp bằng chứng không?
    Giao diện phải đủ ngữ cảnh, và MỌI hành động đều sinh bút toán ghi rõ ai làm
 Nhóm C — không phân loại được                   → ĐIỀU TRA
    treo vào 'Asset:Suspense' để ledger vẫn CÂN trong lúc điều tra
```

Tài khoản **Suspense** (tài khoản treo) là mẹo kế toán cổ điển rất đáng nêu: khi có tiền không biết xếp vào đâu, bạn vẫn **phải** ghi nó vào đâu đó để bảo toàn bất biến cân bằng. Nguyên tắc vận hành: **theo dõi số dư Suspense như một chỉ số sức khoẻ hệ thống** — nó tăng dần nghĩa là có thứ gì đó đang hỏng một cách hệ thống, và nó phải về gần 0 sau mỗi chu kỳ.

### 9.4 Đối soát nội bộ — cái nhiều người quên

```
 (a) ledger ↔ wallet     SUM('Liability:Seller_X:*') == wallet.balance?
     Lệch ⇒ wallet drift ⇒ dựng lại wallet từ ledger.
 (b) payment_order ↔ ledger   Mọi order CAPTURED/SETTLED phải có bút toán.
     Order không có bút toán = tiền đã chuyển mà chưa ghi sổ — lỗ hổng
     nguy hiểm nhất.
 (c) ledger ↔ sao kê ngân hàng   Asset:Bank_Operating == số dư thật ở NH?
     Điểm neo cuối cùng vào thực tại. Mọi thứ khác có thể sai cùng nhau;
     sao kê ngân hàng thì không.
```

> 💡 **Nguyên tắc**: Đối soát là **vòng phản hồi** của hệ thanh toán. Không có nó, hệ chạy **mở vòng**: bạn ra lệnh rồi **hy vọng** thế giới làm theo. Có nó, bạn đo được thực tại và sửa sai. Chỉ số quan trọng nhất của nó không phải "số chênh lệch" mà là **thời gian trung bình từ lúc sai tới lúc biết mình sai**.

---

## Phần 10 — Deep dive 6: Xử lý lỗi, retry, và vì sao timeout không phải thất bại

### 10.1 Phân loại lỗi trước, retry sau

| Loại lỗi | Ví dụ | Retry? | Vì sao |
|---|---|---|---|
| **Tạm thời** | `503`, `429`, timeout kết nối, đứt mạng | **Có**, backoff luỹ thừa | Nguyên nhân sẽ tự hết |
| **Vĩnh viễn — nghiệp vụ** | `card_declined`, `insufficient_funds`, `expired_card` | **Không** | Thử 5 lần vẫn declined, chỉ tốn phí và làm issuer gắn cờ bạn |
| **Vĩnh viễn — kỹ thuật** | `400 invalid_request`, sai chữ ký, thiếu trường | **Không** | Là bug của bạn. Retry chỉ nhân bug lên. Cảnh báo ngay |
| **Không xác định** | Timeout **sau khi đã gửi**, `502` từ proxy | **Không retry mù — TRUY VẤN TRẠNG THÁI TRƯỚC** | §10.3 |

Sắc thái đáng nêu: `insufficient_funds` là vĩnh viễn ở thang **giây**, nhưng tạm thời ở thang **ngày** (lương về). Với subscription, retry sau 3/5/7 ngày (*dunning*) là chuẩn ngành. Với thanh toán một lần thì không — người dùng đang đứng ở quầy.

### 10.2 Backoff luỹ thừa có jitter

```
 delay = min(base × 2^n, cap) × random(0.5, 1.5)
 1: ngay │ 2: ~1s │ 3: ~2s │ 4: ~4s │ 5: ~8s │ 6: ~16s …
 Dừng khi: đạt 8 lần  HOẶC  tổng > 10 phút
           HOẶC  sắp hết CỬA SỔ IDEMPOTENCY CỦA PSP  → đẩy vào DLQ
```

**Jitter mới là phần quan trọng, không phải backoff.** Nếu PSP sập 30 giây và bạn có 500 giao dịch đang chờ, backoff thuần khiến cả 500 cùng thử lại tại đúng giây thứ 1, 2, 4 — một đợt dội đúng lúc PSP yếu nhất, kéo dài sự cố. Bổ sung: **tôn trọng `Retry-After`** nếu PSP gửi (họ biết rõ hơn bạn), và **circuit breaker** — tỷ lệ lỗi vượt ngưỡng thì **mở mạch**, ngừng gọi hẳn, trả về nhanh, định tuyến sang PSP dự phòng nếu có, thăm dò lại mỗi 30 giây. Không có circuit breaker, mọi thread của bạn sẽ bị chôn trong các cuộc gọi đang chờ timeout.

### 10.3 Timeout KHÔNG có nghĩa là thất bại

Đây là bài học đắt giá nhất của cả bài.

```
  Bạn biết:       "tôi không nhận được phản hồi trong 30 giây"
  Bạn KHÔNG biết: request có tới PSP không / PSP có xử lý không /
                  thẻ khách có bị trừ không / tiền có đang trên đường không
  ⇒ Timeout là VẮNG MẶT THÔNG TIN, không phải thông tin.
```

Quy trình đúng:

```
1. KHÔNG đổi trạng thái sang FAILED.   ← sai lầm phổ biến nhất
   Đặt UNKNOWN / PENDING_VERIFICATION.
2. Đợi 2–5 s để PSP kịp hoàn tất phía họ.
3. TRUY VẤN PSP bằng idempotency key hoặc merchant reference:
   ├─ succeeded → cập nhật theo, KHÔNG gọi lại
   ├─ failed    → chuyển FAILED, an toàn
   ├─ pending   → tiếp tục chờ webhook + để job §8.4 quét lại
   └─ không tìm thấy → CHƯA hề tới nơi → an toàn gửi lại
4. Nếu API truy vấn cũng không gọi được (PSP sập hoàn toàn):
   để yên ở PENDING_VERIFICATION cho job quét. KHÔNG ĐOÁN.
   Không bao giờ đoán về tiền.
5. Chốt chặn cuối: settlement file đêm nay sẽ nói sự thật.
   Có ở đó mà ta không có → MISSING_INTERNAL → §9.3.
```

> ⚠️ **Bẫy chết người**: Đánh dấu `FAILED` khi timeout, hiển thị "Thanh toán thất bại", khách trả lại bằng thẻ khác, rồi hôm sau settlement file cho thấy **cả hai giao dịch đều thành công**. Khách bị trừ tiền hai lần và bạn biết sau 24 giờ — qua một bài đăng trên mạng xã hội. Đây là lỗi có thật, xảy ra thường xuyên, và nó bắt nguồn từ đúng một dòng code coi timeout là failure.

> 💡 **Nguyên tắc**: **"Tôi không biết" là một trạng thái hợp lệ và phải được mô hình hoá tường minh.** Hệ non tay chỉ có hai trạng thái — thành công và thất bại — nên khi gặp điều thứ ba, chúng buộc phải nói dối. Hệ trưởng thành có trạng thái thứ ba và một quy trình giải quyết nó.

### 10.4 Dead Letter Queue

```
   Queue chính ──► Executor ──► thành công ──► event bus
       ▲               │ lỗi tạm thời, còn lượt
       └───────────────┤
                       │ hết lượt / lỗi vĩnh viễn / cần người quyết
                       ▼
              ┌──────────────────┐
              │ Dead Letter Queue│  KHÔNG BAO GIỜ được im lặng
              └────────┬─────────┘
         cảnh báo on-call │ dashboard ops │ phân tích lỗi theo nhóm
         (SLA 1 giờ)        (xem, sửa, replay)
```

Ba nguyên tắc khác với DLQ ở hệ thống thường: (1) **DLQ có message = có người mất tiền hoặc không mua được hàng** — đó là sự cố khách hàng, không phải mục log; phải có cảnh báo và SLA, không để tới sprint sau. (2) **Replay phải đi qua đúng đường idempotency** — không tạo lối tắt "ops bấm nút là gọi thẳng PSP", lối tắt đó bỏ qua mọi hàng rào ở §6. (3) **Trước khi replay, luôn truy vấn trạng thái ở PSP** — message có thể đã nằm trong DLQ nhiều giờ và PSP đã xử lý xong.

---

## Phần 11 — Deep dive 7: Webhook từ PSP

Webhook là **nguồn sự thật chính** về kết quả thanh toán (§5.3), đồng thời là bề mặt tấn công và nguồn của những bug khó chịu nhất. Bốn vấn đề, không được bỏ cái nào.

### 11.1 Xác thực chữ ký — bắt buộc

Endpoint webhook là một URL công khai nhận lệnh làm tiền dịch chuyển. Không xác thực = ai cũng `POST` "payment.succeeded" và nhận hàng miễn phí.

```
 PSP ký:  signature = HMAC_SHA256(secret, timestamp + "." + raw_body)
 Header:  Stripe-Signature: t=1741609403,v1=5257a869e7ec...

 Bên nhận PHẢI:
  1. Dùng RAW BODY, không phải JSON đã parse rồi serialize lại.
     Thứ tự khoá / khoảng trắng đổi ⇒ chữ ký sai ⇒ 100% thất bại.
  2. So sánh CONSTANT-TIME (hmac.compare_digest), KHÔNG dùng ==.
     So sánh chuỗi thường rò rỉ thông tin qua thời gian thực thi.
  3. Kiểm timestamp trong cửa sổ ±5 phút ⇒ chống replay attack.
  4. Xoay khoá định kỳ; hỗ trợ hai khoá cùng lúc trong lúc xoay.
  5. Ghim IP của PSP nếu họ công bố — phòng thủ theo lớp,
     KHÔNG thay thế được chữ ký.
```

### 11.2 Trùng lặp — PSP sẽ gửi lại

Mọi PSP gửi webhook theo mô hình at-least-once. Trả `500`, hoặc trả `200` chậm quá timeout của họ (5–20 giây), là họ gửi lại nhiều lần trong nhiều giờ.

```sql
CREATE TABLE webhook_event (
  psp_name     VARCHAR(32)  NOT NULL,
  psp_event_id VARCHAR(128) NOT NULL,   -- id sự kiện của PSP: evt_1N2b…
  event_type   VARCHAR(64)  NOT NULL,
  payload      JSONB NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  PRIMARY KEY (psp_name, psp_event_id)  -- ← dedup bằng chính DB
);
```

```
POST /webhooks/psp/stripe            — NHẬN NHANH, LÀM SAU
  1. verify chữ ký                                     (~1 ms)
  2. INSERT INTO webhook_event …                       (~2 ms)
       ├─ vi phạm PK ⇒ đã thấy rồi ⇒ trả 200 ngay, KHÔNG xử lý lại
       └─ OK ⇒ đi tiếp
  3. TRẢ 200 NGAY LẬP TỨC                              ← tổng < 50 ms
  4. Xử lý BẤT ĐỒNG BỘ qua queue: cập nhật trạng thái, ghi ledger,
     cộng wallet, gửi thông báo
```

Vì sao trả `200` trước khi xử lý? Vì xử lý mất vài giây; giữ kết nối tới lúc xong thì PSP timeout và gửi lại, nhân tải lên đúng lúc bạn đang chậm — một vòng xoáy tử thần. Đánh đổi: bạn đã "hứa" nhận sự kiện, nên **phải** bền hoá nó ở bước 2 trước khi ack. Bước 2 là điểm bền hoá, bước 3 là lời hứa.

> ⚠️ **Bẫy**: Trả `400` cho `event_type` bạn không quan tâm. PSP sẽ retry mãi một sự kiện bạn vốn không cần, và cuối cùng có thể **vô hiệu hoá endpoint của bạn** vì tỷ lệ lỗi cao — khiến bạn mất luôn các sự kiện quan trọng. Trả `200` và ghi log.

### 11.3 Đến sai thứ tự — vấn đề khó nhất

```
   PSP gửi:                       Bạn nhận:
   t=100  payment.authorized      t=103  payment.captured    ← tới TRƯỚC!
   t=101  payment.captured        t=107  payment.authorized  ← tới SAU

   Xử lý ngây thơ:
     captured   → chưa có AUTHORIZED → lỗi, hoặc tạo trạng thái sai
     authorized → ghi đè CAPTURED bằng AUTHORIZED → TRẠNG THÁI LÙI!
     ⇒ Job §8.4 thấy AUTHORIZED quá hạn → capture LẦN NỮA → double charge
```

Bốn lớp phòng thủ, nên dùng cả bốn:

**(a) Compare-and-swap theo trạng thái nguồn** (§8.3). `UPDATE … WHERE status='AUTHORIZED'` — sự kiện `authorized` tới muộn ảnh hưởng 0 dòng vì trạng thái đã là `CAPTURED`. Bỏ qua an toàn.

**(b) Dấu thời gian đơn điệu.** Lưu `last_event_at`, bỏ qua sự kiện có timestamp cũ hơn — dùng timestamp **của PSP**, không phải lúc bạn nhận.

**(c) Thứ hạng trạng thái.** `CREATED=0, PENDING=1, AUTHORIZED=2, CAPTURED=3, SETTLED=4` — **chỉ cho tiến, không cho lùi**, trừ các chuyển tiếp lùi liệt kê tường minh (`SETTLED → REFUNDED`, `SETTLED → DISPUTED`).

**(d) Khi bí, hỏi lại nguồn.** Nhận `captured` mà nội bộ chưa có `authorized`? Đừng đoán — gọi `GET /payment_intents/{id}` lấy **trạng thái đầy đủ hiện tại** và đồng bộ theo đó. Webhook chỉ là **tín hiệu "có gì đó đổi rồi"**; API mới là nguồn sự thật đầy đủ. Coi webhook như một cú ping thay vì như dữ liệu tin cậy giúp bạn tránh cả một lớp bug.

### 11.4 Khi webhook không bao giờ tới

Nó sẽ xảy ra: PSP có sự cố, endpoint của bạn sập 20 phút và họ bỏ cuộc, cấu hình sai URL sau một lần deploy. Ba lớp dự phòng: **job quét trạng thái kẹt** (§8.4) bắt trong vòng phút; **đối soát đêm** (§9) bắt trong vòng ngày; và **polling chủ động** cho giao dịch giá trị lớn (ví dụ > 1.000 đô) — không đợi webhook.

---

## Phần 12 — Consistency: outbox và exactly-once trong thực tế

### 12.1 Vấn đề dual-write

Payment service phải ghi DB **và** publish message — hai hệ thống khác nhau, **không có transaction chung**.

```
   Cách A: ghi DB trước                 Cách B: publish trước
   BEGIN; INSERT …; COMMIT;  ✓          publish(msg)              ✓
   💥 crash                              💥 crash
   publish(msg)              ✗          BEGIN; INSERT …; COMMIT;  ✗
   ⇒ DB có đơn, không ai xử lý.          ⇒ Executor xử lý một đơn KHÔNG
     Tiền không bao giờ được thu.          TỒN TẠI trong DB. Tiền bị thu,
     Khách tưởng đã mua.                   không có sổ.
```

Không thứ tự nào cứu được bạn — vấn đề là **tính nguyên tử giữa hai hệ thống**.

### 12.2 Transactional Outbox

Đưa message vào **cùng cơ sở dữ liệu**, để ghi nghiệp vụ và ghi ý định gửi tin nằm trong **cùng một transaction ACID**.

```sql
CREATE TABLE outbox (
  outbox_id    BIGSERIAL PRIMARY KEY,
  aggregate_id VARCHAR(64) NOT NULL,   -- payment_order_id → giữ thứ tự
  event_type   VARCHAR(64) NOT NULL,
  payload      JSONB NOT NULL,
  dedup_id     VARCHAR(128) NOT NULL UNIQUE,
  published_at TIMESTAMPTZ
);
```

```
 BEGIN;
   INSERT INTO payment_order       (…);
   INSERT INTO payment_transaction (…);
   INSERT INTO outbox              (…);   ← CÙNG transaction
 COMMIT;                                   ← nguyên tử: cả ba hoặc không cái nào

 ┌──────────────────────────────────────────────────────────┐
 │ Relay: đọc CDC / replication log (tốt hơn polling) →     │
 │        publish lên queue  (có thể trùng ⇒ AT-LEAST-ONCE) │
 │        → UPDATE outbox SET published_at = now()          │
 └──────────────────────────────────────────────────────────┘
```

Relay có thể crash **sau** khi publish, **trước** khi đánh dấu → message gửi hai lần. Đó là **chấp nhận được và đã tính trước**: outbox cho bạn at-least-once, và consumer idempotent (§6) biến nó thành exactly-once ở tầng hiệu ứng. Ưu tiên đọc **CDC/replication log** thay vì polling: không thêm tải lên DB chính, độ trễ thấp hơn, thứ tự đảm bảo theo commit log.

### 12.3 Thứ tự và phân vùng

Với một payment order, thứ tự **quan trọng**: `authorized` phải xử lý trước `captured`. Dùng hàng đợi bảo đảm thứ tự **theo nhóm**, khoá nhóm = `payment_order_id`. Các order khác nhau xử lý song song; cùng một order thì tuần tự. Đây chính xác là ngữ nghĩa `MessageGroupId` của SQS FIFO hoặc partition key của Kafka.

> 💡 **Nguyên tắc**: Đảm bảo đúng đắn của cả hệ được xây từ **bốn lớp chồng lên nhau**, mỗi lớp bắt cái lớp trước lọt: (1) **unique constraint** — chặn trùng ở mức cấu trúc; (2) **idempotency key end-to-end** — chặn trùng ở mức luồng; (3) **outbox + transaction** — chặn mất tin; (4) **đối soát** — bắt mọi thứ đã lọt qua ba lớp trên. **Không lớp nào đủ một mình, và đó là chủ ý.**

---

## Phần 13 — Bảo mật và tuân thủ

| Mối đe doạ | Phòng thủ | Ghi chú thực chiến |
|---|---|---|
| Nghe lén đường truyền | TLS 1.3, HSTS, certificate pinning cho app di động | Với PSP, ưu tiên đường riêng (PrivateLink/VPN) thay vì Internet công cộng |
| Giả mạo webhook | HMAC + so sánh constant-time + cửa sổ thời gian (§11.1) | Hàng phòng thủ quan trọng nhất của toàn bộ bề mặt bên ngoài |
| Lộ dữ liệu thẻ | **Không lưu** (§5). Chỉ token, 4 số cuối, thương hiệu. **Không bao giờ lưu CVV** | Phòng thủ tốt nhất là không có dữ liệu |
| Dữ liệu nhạy cảm khi nghỉ | Mã hoá ổ đĩa + mã hoá cột ở tầng ứng dụng cho PII, khoá do HSM quản lý | Khoá phải xoay được; ghi log mọi lần dùng khoá |
| Bí mật lẫn trong code | Kho bí mật tập trung, tự xoay vòng | API key của PSP là mục tiêu giá trị cao nhất |
| Rò rỉ qua log | **Che (redact) ở tầng thư viện log**, whitelist trường được phép ghi | Kênh rò rỉ phổ biến nhất thực tế: ai đó log nguyên `request_body` để debug rồi quên xoá |
| Lạm quyền nội bộ | RBAC chi tiết, đặc quyền tối thiểu, **phê duyệt kép (four-eyes)** cho pay-out lớn và điều chỉnh sổ thủ công | Rủi ro nội bộ ở fintech lớn hơn rủi ro bên ngoài |
| Sửa/xoá dấu vết | Audit log **chỉ ghi thêm**, lưu ở nơi chống ghi đè (WORM), **băm nối chuỗi** để phát hiện can thiệp | Thứ auditor hỏi đầu tiên |
| Từ chối dịch vụ | Rate limit theo IP/tài khoản/**thẻ**, WAF, tách hạ tầng webhook khỏi hạ tầng API người dùng | Rate limit theo **thẻ** chặn tấn công dò thẻ (card testing) |
| Gian lận | Quy tắc + học máy: vận tốc giao dịch, khớp địa chỉ (AVS), CVV, vân tay thiết bị, độ lệch địa lý, danh sách đen | Ngưỡng chargeback ~0,9% là ranh giới sống còn (§0.3) |
| Rửa tiền | Sàng lọc danh sách trừng phạt, KYC seller, báo cáo giao dịch đáng ngờ | Bắt buộc theo luật với pay-out |
| Thẻ bị đánh cắp | **3DS2 / SCA** cho giao dịch rủi ro cao | Đổi conversion lấy **liability shift**. Dùng **có chọn lọc** theo điểm rủi ro |

Hai điểm đáng nói sâu hơn:

**Audit log bất biến không phải chuyện bật một flag.** Yêu cầu thực tế: mỗi bản ghi chứa băm của bản ghi trước (chuỗi băm), lưu ở kho chỉ-ghi-một-lần với chính sách lưu giữ khoá cứng, và **ngay cả tài khoản quản trị tối cao cũng không xoá được** trong thời hạn lưu giữ. Nếu quản trị viên xoá được, nó không phải bằng chứng.

**3DS là quyết định kinh doanh được ngụy trang thành quyết định kỹ thuật.** Bật cho mọi giao dịch thì giảm gian lận nhưng rớt 5–15% đơn hàng vì ma sát. Cách đúng: chấm điểm rủi ro, chỉ challenge phần đuôi rủi ro cao, tận dụng miễn trừ SCA (giao dịch nhỏ, giao dịch lặp lại đã tin cậy). Nêu được đánh đổi này cho thấy bạn hiểu hệ thanh toán tồn tại để **kiếm tiền**, không chỉ để **an toàn**.

---

## Phần 14 — Pay-out và những rủi ro riêng

```
  Lịch (hằng tuần)
       ▼
  ┌────────────────┐  1. chốt kỳ, đóng băng giao dịch trong kỳ
  │ Payout Service │  2. tính: available_balance − reserve − khoản tranh chấp
  └────┬───────────┘        − hoàn tiền đang chờ − thuế/khấu trừ
       │              3. kiểm KYC/AML/danh sách trừng phạt  ← CHẶN nếu fail
       │              4. trên ngưỡng → phê duyệt kép
       ▼
  ┌────────────────┐
  │ Payout Executor│ → nhà cung cấp chi trả (Tipalti/Wise/ACH/SEPA)
  └────┬───────────┘   idempotency key = payout_id
       ▼  ghi ledger: DR Liability:Seller:Available / CR Asset:Bank
  ┌────────────────┐
  │  Đối soát      │ ← sao kê ngân hàng: tiền đã THẬT SỰ rời đi chưa?
  └────────────────┘
```

| Khía cạnh | Pay-in | Pay-out |
|---|---|---|
| Hoàn tác | Refund được, tương đối dễ | **Gần như không thể** — tiền đã vào tài khoản người khác, ngân hàng khác, có khi nước khác. ACH/SEPA không có nút undo |
| Hậu quả khi tính sai | Thu thiếu → đòi thêm | **Trả thừa → mất trắng.** Trả nhầm người → có thể là tội hình sự |
| Tuân thủ | PCI DSS | **AML/KYC, danh sách trừng phạt, khấu trừ thuế, báo cáo giao dịch đáng ngờ** — nặng hơn nhiều |
| Tấn công | Gian lận thẻ (tiền của người khác) | **Chiếm đoạt tài khoản seller rồi đổi số tài khoản nhận tiền** — kẻ tấn công rút tiền thật của bạn |
| Phê duyệt | Tự động hoàn toàn | Tự động tới ngưỡng, trên ngưỡng cần **người** |

Bốn biện pháp kiểm soát đặc thù:

1. **Thời gian chờ khi đổi tài khoản nhận tiền.** Seller đổi số tài khoản → **treo mọi pay-out 24–72 giờ** + xác minh ngoài luồng (gọi điện, email tới địa chỉ cũ). Đây là biện pháp chống chiếm đoạt tài khoản hiệu quả nhất, và nó là **quy trình**, không phải kỹ thuật.
2. **Reserve.** Giữ lại 5–10% doanh thu trong 30–90 ngày để bù chargeback đến muộn. Không có reserve, một seller có thể bán hàng, rút tiền, biến mất — và bạn gánh toàn bộ chargeback.
3. **Phê duyệt kép và hạn mức cứng.** Trên ngưỡng cần hai người khác nhau duyệt. Có hạn mức tối đa mỗi kỳ mà **code không vượt được** — một bug về đơn vị tiền tệ (nhân 100 nhầm) sẽ bị chặn bởi hạn mức cứng thay vì làm bay 100 lần số tiền thật.
4. **Đối soát sao kê ngân hàng cho pay-out** nghiêm ngặt như đối soát settlement file cho pay-in. "Đã gửi lệnh" không bằng "tiền đã rời đi".

---

## Phần 15 — Bottleneck và failure mode

### 15.1 Cái gì nghẽn trước?

| # | Điểm nghẽn | Vì sao | Cách xử |
|---|---|---|---|
| 1 | **PSP** — hạn mức API, độ trễ, thời gian sập của họ | Bạn không kiểm soát. Có SLA nhưng vẫn có sự cố | Circuit breaker, hàng đợi làm bộ đệm, **multi-PSP** với định tuyến dự phòng |
| 2 | **Đội vận hành xử lý chênh lệch** | Tự động hoá 80% thì 1 triệu giao dịch/ngày để lại vài trăm dòng cần người xem. Nghẽn **con người**, tăng tuyến tính theo doanh số | Đẩy tự động hoá nhóm A lên ≥95%; đầu tư công cụ cho ops — lợi tức cao hơn tối ưu code |
| 3 | **Cửa sổ batch đối soát** | Job đêm chạy 6 giờ, một lần lỗi làm trễ cả ngày báo cáo | Job phải **idempotent và chạy lại được từng phần**; chia lô |
| 4 | **Khoá hàng nóng trên wallet** | Một seller flash sale nhận 500 giao dịch/s → 500 `UPDATE` cùng một dòng ví | Ledger **append-only** (không tranh chấp) + cộng dồn wallet theo lô; hoặc **tách ví thành N sub-balance** rồi cộng khi đọc |
| 5 | Kết nối DB | Chỉ là vấn đề nếu pool cấu hình sai | PgBouncer / RDS Proxy |

> 💡 **Nguyên tắc**: Điểm nghẽn của hệ thanh toán là **hệ thống bên ngoài và con người**, không phải máy tính của bạn. Nói thẳng câu này trong phỏng vấn — nó cho thấy bạn hiểu bài toán thật thay vì áp khuôn "scale-out" đã học thuộc.

### 15.2 Component chết thì sao?

| Thành phần chết | Hậu quả | Thiết kế để chịu được |
|---|---|---|
| **PSP sập** | Không auth được giao dịch mới | Circuit breaker mở → nhận đơn vào hàng đợi, hiển thị "đang xử lý" thay vì "thất bại". Có PSP thứ hai thì chuyển sang. Giao dịch cũ vẫn hoàn tất nhờ webhook/đối soát |
| **Executor chết** | Message tồn trong queue | Queue là bộ đệm; message quay lại sau visibility timeout. **Không mất gì**, chỉ chậm |
| **DB primary chết** | Không nhận thanh toán mới | Đa AZ, tự failover 30–120 s. **Trong lúc đó ta từ chối chứ không đoán** — fail closed |
| **Ledger chết** | Giao dịch chạy nhưng chưa ghi sổ | Outbox giữ sự kiện bền trong DB; ledger phát lại khi sống dậy. Đối soát bắt phần lọt |
| **Wallet chết** | Seller không xem được số dư | Chỉ ảnh hưởng đọc. Dựng lại hoàn toàn từ ledger |
| **Endpoint webhook chết** | PSP retry vài giờ rồi bỏ | Lý do §8.4 và §9 tồn tại. Sau hồi phục, chủ động polling bù cho khoảng thời gian mất |
| **Mất một AZ** | Mất một phần công suất | Đa AZ mọi tầng. Ở 200 TPS, cấp dư là chuyện dễ và rẻ |
| **Mất cả region** | Ngừng nhận thanh toán | Bản sao liên vùng + quy trình chuyển vùng **có diễn tập**. RPO phải ~0 với dữ liệu tiền ⇒ sao chép đồng bộ, hoặc chấp nhận phục hồi lâu hơn nhưng **không mất dữ liệu** |

> ⚠️ **Bẫy**: Thiết kế để "luôn nhận được thanh toán" bằng cách ghi tạm vào bộ nhớ khi DB chết. **Đừng.** Từ chối một giao dịch là phiền toái; chấp nhận rồi đánh mất nó là một sự cố tài chính. Khi nghi ngờ, **fail closed**.

### 15.3 Chỉ số phải theo dõi

```
 Nghiệp vụ:  tỷ lệ auth thành công (theo PSP / loại thẻ / nước)
             tỷ lệ decline theo mã lý do   ← tăng đột biến = có chuyện
             tỷ lệ chargeback (< 0,9%)
             GIÁ TRỊ giao dịch mỗi phút    ← rơi đột ngột = sự cố thầm lặng
 Đúng đắn:   số dòng chênh lệch mỗi ngày (và xu hướng)
             số dư tài khoản Suspense      ← phải quanh 0
             số bút toán KHÔNG CÂN         ← phải LUÔN bằng 0
             độ lệch wallet ↔ ledger       ← phải bằng 0
 Vận hành:   độ sâu DLQ  ← cảnh báo khi > 0, không phải khi > 100
             số giao dịch kẹt quá 15 phút
             tuổi giao dịch AUTHORIZED lâu nhất (nguy cơ hết hạn auth)
             độ trễ & tỷ lệ lỗi p99 của PSP; độ trễ xử lý webhook
```

> 💡 **Nguyên tắc**: Chỉ số quan trọng nhất là **giá trị tiền xử lý thành công mỗi phút**, so với cùng kỳ tuần trước. Nó bắt được mọi kiểu hỏng — kể cả những kiểu mà mọi dashboard kỹ thuật vẫn xanh lè, ví dụ một thay đổi cấu hình khiến toàn bộ thẻ của một quốc gia bị từ chối.

---

## Liên hệ sang AWS

Đây là workload mà AWS có nhiều dịch vụ *phù hợp bất ngờ* — nhưng cũng dễ chọn sai nhất, vì trực giác "chọn cái scale tốt nhất" không áp dụng. Tiêu chí ở đây là **đúng đắn, bền vững, và chứng minh được với auditor**.

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp (và bẫy) |
|---|---|---|
| DB giao dịch chính | **Aurora PostgreSQL** Multi-AZ (Aurora Global cho DR) | ACID thật, `DECIMAL` chính xác, unique constraint — đúng ba thứ §4.4 và §6.3 cần. Ở 200 TPS đỉnh thì một instance cỡ vừa là dư. ⚠️ **Aurora Backtrack** ("tua ngược" cụm về một thời điểm trong vài phút, cực giá trị khi deploy sai làm hỏng dữ liệu) **chỉ có ở Aurora MySQL**, *không* có ở Aurora PostgreSQL — với Postgres phải dùng **PITR**, và hiểu rằng PITR tạo cụm mới chứ không tua tại chỗ |
| **Sổ cái append-only** | **Bảng ledger append-only trên Aurora**, hoặc **DynamoDB** với chính sách chỉ-ghi-thêm | ⚠️ **Trạng thái hiện tại của QLDB**: Amazon QLDB (sổ cái bất biến có xác minh mật mã) đã **ngừng phát triển và không nhận khách hàng mới**, AWS hướng dẫn chuyển sang Aurora PostgreSQL. **Khuyến nghị: đừng thiết kế mới quanh QLDB.** Tự dựng `journal_entry`/`journal_line` append-only trên Aurora với `REVOKE UPDATE, DELETE` + trigger chặn, cộng **chuỗi băm** (mỗi bút toán chứa băm của bút toán trước) để có khả năng phát hiện can thiệp tương đương phần giá trị nhất của QLDB. Trên DynamoDB thì `ConditionExpression: attribute_not_exists(pk)` để ghi một lần, không bao giờ ghi đè |
| Idempotency store | **Chính Aurora** (bảng `idempotency_record`), hoặc **DynamoDB conditional write** | Ở cùng Aurora thì được nằm trong **cùng transaction** với ghi nghiệp vụ — mạnh nhất, và là mặc định nên chọn. Nếu tách: `PutItem` + `ConditionExpression: attribute_not_exists(key)` là compare-and-swap **bền vững**, cộng TTL tự dọn. ⚠️ **Tuyệt đối không dùng ElastiCache/Redis làm hàng phòng thủ cuối** — không bền (§6.2) |
| Điều phối vòng đời giao dịch | **Step Functions** (Standard) | State machine §8 ánh xạ gần như một-một. Standard lưu **lịch sử thực thi tới 1 năm** — chính là audit trail từng giao dịch, miễn phí. Có retry/backoff/catch khai báo sẵn và `Wait` cho chờ webhook. ⚠️ Dùng **Standard**, không phải Express (Express giữ log 5 phút, ngữ nghĩa at-least-once). ⚠️ Nó **không thay thế** state machine trong DB — DB vẫn là nguồn sự thật, Step Functions chỉ điều phối |
| Queue Payment Service → Executor | **SQS FIFO**, `MessageGroupId = payment_order_id` | Đúng nhu cầu §12.3: thứ tự trong một order, song song giữa các order. Có sẵn **dedup 5 phút** theo `MessageDeduplicationId` — một lớp phòng thủ nữa. ⚠️ FIFO giới hạn 300 tin/s mỗi group không batch (3.000 khi batch) — thừa cho 200 TPS, nhưng cần biết con số |
| Hàng đợi lỗi | **SQS DLQ** + alarm CloudWatch khi `ApproximateNumberOfMessagesVisible > 0` | §10.4: ngưỡng cảnh báo là **> 0**, không phải một con số lớn |
| Nhận & định tuyến webhook | **API Gateway → Lambda → EventBridge** (hoặc EventBridge Partner Event Source) | Lambda verify chữ ký, ghi bản ghi dedup vào DynamoDB (`attribute_not_exists`), trả `200` trong vài chục ms, rồi đẩy sự kiện lên EventBridge để nhiều consumer (ledger, wallet, thông báo, phân tích) tự đăng ký — đúng mô hình nhiều-người-nhận. EventBridge có **archive + replay**, rất hữu ích khi một consumer có bug và cần xử lý lại lịch sử |
| Outbox → queue | **Aurora + Debezium/DMS trên MSK**, hoặc **DynamoDB Streams** | DynamoDB Streams là cách rẻ và gọn nhất nếu bảng đã ở DynamoDB. Với Aurora, CDC tốt hơn polling (§12.2) |
| Settlement file | **S3 + S3 Object Lock** (chế độ Compliance) cho bản gốc; **Athena/Glue** hoặc job container để đối soát | Object Lock khiến file **không thể xoá hoặc sửa** kể cả bởi tài khoản gốc trong thời hạn giữ — biến settlement file thành bằng chứng pháp lý thực sự. Athena quét 1 triệu dòng CSV/Parquet mất vài giây, trả tiền theo lượng quét |
| Job đối soát đêm & quét kẹt | **EventBridge Scheduler → ECS Fargate** (hoặc Step Functions + Lambda) | Fargate hợp hơn cho job vài chục phút cần nhiều bộ nhớ. ⚠️ Lambda giới hạn 15 phút — đủ cho quét kẹt, **không đủ** cho đối soát lớn |
| Lưu trữ 7 năm | **S3 Intelligent-Tiering → Glacier Deep Archive** + Object Lock | 85 TB trên Deep Archive rẻ hơn giữ trong Aurora vài bậc. Giữ chỉ mục trong Athena để vẫn truy vấn được |
| Quản lý khoá mã hoá | **KMS** (mặc định); **CloudHSM** khi có yêu cầu FIPS 140-2 Level 3 hoặc phải chứng minh quyền kiểm soát khoá độc quyền | KMS đủ cho 95% trường hợp và rẻ hơn nhiều. CloudHSM chỉ khi auditor/PSP **yêu cầu cụ thể** — nêu được ranh giới này quan trọng hơn nêu tên dịch vụ |
| API key PSP, secret webhook | **Secrets Manager** (bật xoay vòng tự động) | ⚠️ Không để trong biến môi trường của task — chúng hiện trong định nghĩa task và trong log. Parameter Store rẻ hơn nhưng không có xoay vòng tự động |
| Kết nối tới PSP | **PrivateLink** nếu PSP có endpoint; nếu không thì **NAT Gateway + Elastic IP cố định** | PrivateLink giữ lưu lượng trong mạng AWS — giảm bề mặt tấn công và là điểm cộng khi audit. Nếu buộc đi Internet, EIP cố định cho phép PSP **ghim IP của bạn vào allowlist** |
| Audit log bất biến | **CloudTrail** (+ CloudTrail Lake) ghi vào **S3 có Object Lock**, ở **tài khoản log tách riêng** | Mẫu chuẩn: tài khoản log là một tài khoản AWS khác, nơi đội ứng dụng **không có quyền xoá**. Đây là thứ biến audit log thành bằng chứng chứ không phải tập tin |
| Chống gian lận | **Amazon Fraud Detector** + quy tắc tự viết | Fraud Detector huấn luyện trên dữ liệu của bạn, có mẫu dựng sẵn cho "online payment fraud". Thực tế nên **kết hợp**: quy tắc cứng cho cái đã biết (danh sách đen, vận tốc), mô hình cho cái chưa biết. ⚠️ Cần đủ dữ liệu mới huấn luyện tốt; giai đoạn đầu quy tắc hiệu quả hơn |
| Cách ly CDE (nếu buộc phải vào) | **Tài khoản AWS riêng** + VPC riêng + **AWS Config** + **Security Hub** bộ chuẩn **PCI DSS** | Phân đoạn bằng ranh giới **tài khoản** là cách mạnh nhất để thu hẹp phạm vi audit. Security Hub dùng như bản đồ, **không phải** như chứng nhận |
| Quan sát nghiệp vụ | **CloudWatch custom metrics** + **Managed Grafana**; **X-Ray** cho truy vết xuyên service | Chỉ số §15.3 là **metric nghiệp vụ tự phát**, không phải metric hạ tầng. Alarm trên "giá trị giao dịch mỗi phút" bằng **anomaly detection**, không phải ngưỡng tĩnh |
| Hạn mức & cô lập | **Service Quotas**, **WAF** rate-based rule, **API Gateway usage plan** | Rate limit theo **thẻ/tài khoản** phải làm ở tầng ứng dụng — WAF chỉ thấy IP |

**Ba câu chốt đáng nhớ:**

1. *"QLDB từng là câu trả lời hiển nhiên cho ledger, nhưng nó **đã bị khai tử và không nhận khách mới**. Nên tôi không thiết kế quanh nó. Tôi dựng bảng append-only trên Aurora, khoá `UPDATE`/`DELETE` bằng **quyền của database** chứ không bằng quy ước, và thêm chuỗi băm để tự phát hiện can thiệp. Tôi lấy lại phần giá trị nhất của QLDB mà không nhận rủi ro nhà cung cấp."*
2. *"Tôi dùng **DynamoDB conditional write** cho idempotency chỉ khi nó phải tách riêng vì lý do vận hành. Mặc định tôi để bảng idempotency **trong cùng Aurora** với dữ liệu nghiệp vụ — vì khi đó 'ghi khoá' và 'ghi kết quả' nằm trong **cùng một transaction**, và đó là hàng rào chống double payment mạnh nhất tồn tại."*
3. *"**S3 Object Lock** là thứ biến settlement file và audit log từ 'tập tin chúng tôi lưu' thành 'bằng chứng không ai sửa được'. Đặt nó ở một tài khoản AWS tách biệt mà đội ứng dụng không có quyền xoá. Khi auditor hỏi 'làm sao tôi biết các anh không sửa log', đây là câu trả lời — và nó là câu trả lời bằng **kiến trúc**, không bằng lời hứa."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng việc lật ngược kỳ vọng về quy mô.** Tính trong 30 giây rồi nói thẳng: *"Một triệu giao dịch mỗi ngày là **12 TPS**. Đây không phải bài toán scale. Và điều đó không làm nó dễ hơn — nó chuyển toàn bộ độ khó sang **tính đúng đắn**. Tôi sẽ tiêu ngân sách kỹ thuật vào ACID, idempotency, double-entry ledger và reconciliation, chứ không vào sharding."* Câu này lập tức tách bạn khỏi người sắp vẽ ba tầng cache.

2. **Chứng minh bạn nói được ngôn ngữ ngành.** Vẽ four-party model trong một phút và dùng đúng từ: *"authorization chỉ là hold hạn mức, chưa có tiền chuyển; capture mới khởi động dòng tiền; settlement là T+2 và là lúc tôi nhận **settlement file** — file đó chính là nguồn sự thật bên ngoài cho reconciliation."*

3. **Chốt phạm vi PCI ngay, và nói vì sao đó là quyết định kiến trúc đắt nhất.** *"Số thẻ không bao giờ chạm hệ thống của tôi. Không phải vì bảo mật chung chung, mà vì nó kéo tôi từ **SAQ D** — 300 yêu cầu, audit QSA hằng năm, một phòng ban vĩnh viễn — xuống **SAQ A**, khoảng 20 mục. Và dữ liệu tôi không có thì không ai đánh cắp được từ tôi."*

4. **Đưa ra ba tầng dữ liệu trước khi được hỏi.** Payment **event** (ý định của buyer, có thể thành công một phần), payment **order** (đơn vị thực thi + đơn vị idempotency, một payee), payment **transaction** (một lần tương tác với PSP). Đây là câu hỏi phân loại, và nhiều người mô hình hoá phẳng thành một bảng.

5. **Dành nhiều thời gian nhất cho double payment — bắt đầu bằng lý do bất khả thi.** *"Exactly-once delivery không tồn tại: khi request timeout, tôi không phân biệt được 'chưa tới nơi' với 'đã xong nhưng mất response'. Đó là Two Generals, đã chứng minh là không giải được. Nên tôi đổi bài toán: at-least-once **cộng** xử lý idempotent bằng nhau exactly-once **ở tầng hiệu ứng**."*

6. **Nói rõ idempotency là một CHUỖI, không phải một tính năng.** Vẽ browser → API → queue → executor → PSP và chỉ ra cơ chế ở **từng mắt xích**. Nhấn: *"Nhiều người đặt idempotency ở tầng API rồi coi như xong. Nhưng cú gọi PSP nằm sau queue, và queue là at-least-once. Không truyền `Idempotency-Key` xuống PSP thì một lần giao lại message là một lần trừ tiền nữa."* Thêm chi tiết ít người biết: *"và cửa sổ idempotency của PSP chỉ 24 giờ — nên chính sách retry của tôi phải kết thúc trước đó, quá hạn thì chuyển sang truy vấn trạng thái chứ không retry."*

7. **Chọn `INSERT`-rồi-bắt-lỗi thay vì `SELECT`-rồi-`INSERT`.** *"Check-then-act có cửa sổ đua — unique constraint thì đúng **ngay cả khi code của tôi sai**, và đó là loại phòng thủ tôi muốn khi làm việc với tiền."*

8. **Vẽ một bảng ghi sổ thật, có số.** Đừng chỉ nói "dùng double-entry". Viết `DR Asset:PSP_Receivable 31.50 / CR Liability:Seller_A 28.35 / CR Revenue:Commission 3.15` rồi chỉ vào dòng tổng: *"tổng debit bằng tổng credit — đây là một **checksum tích hợp sẵn trên tiền**. Lệch một xu là tôi biết ngay trong transaction đó, không phải ba tháng sau."* Rồi thêm điểm ít người nói: *"và số dư ví của seller là một khoản **nợ phải trả** của tôi, không phải tài sản — tôi đang giữ hộ tiền của người khác."*

9. **Nhấn append-only:** *"Refund không sửa bút toán gốc — nó là bút toán mới, ngược chiều. Và tôi ép điều này bằng `REVOKE UPDATE, DELETE` ở database; 'chúng tôi quy ước không update' không phải biện pháp kiểm soát mà auditor chấp nhận."*

10. **Trình bày state machine như sơ đồ, không như danh sách cột boolean.** Chỉ ra ba điều: `REQUIRES_ACTION` là trạng thái thật (3DS), `DISPUTED` đến từ bên ngoài hàng tháng sau khi đã `SETTLED`, và `FAILED` là trạng thái cuối — thử lại nghĩa là **order mới**. Rồi nói về `UPDATE … WHERE status = 'AUTHORIZED'` như một compare-and-swap chống webhook đến sai thứ tự.

11. **Đưa reconciliation vào sớm, và định nghĩa nó bằng thời gian.** *"Câu hỏi không phải 'hệ thống của tôi có sai không' — nó sẽ sai. Câu hỏi là **bao lâu thì tôi biết mình sai**."* Rồi liệt kê bốn nhóm chênh lệch và nói **MISSING_INTERNAL nguy hiểm nhất** — PSP đã lấy tiền của khách mà ta không hề biết.

12. **Nêu tài khoản Suspense.** Ít ứng viên biết: *"Khi có khoản không phân loại được, tôi vẫn phải ghi nó vào đâu đó để giữ bất biến cân bằng. Tôi treo vào `Asset:Suspense` và theo dõi số dư của nó **như một chỉ số sức khoẻ hệ thống** — nó tăng dần nghĩa là có thứ gì đó đang hỏng một cách hệ thống."*

13. **Dừng lại và nhấn mạnh: timeout không phải thất bại.** Đây là câu đáng giá nhất trong cả buổi: *"Timeout là **sự vắng mặt của thông tin**, không phải thông tin. Tôi không đánh dấu FAILED. Tôi chuyển sang `PENDING_VERIFICATION`, **truy vấn PSP bằng chính idempotency key**, và chỉ gửi lại khi PSP xác nhận chưa từng thấy giao dịch đó. Lỗi 'đánh dấu thất bại rồi bảo khách trả lại bằng thẻ khác' là cách chắc chắn nhất để trừ tiền hai lần và biết điều đó sau 24 giờ, qua mạng xã hội."*

14. **Xử lý webhook như một hệ thống, không như một endpoint.** Gọi tên đủ bốn vấn đề: chữ ký (HMAC trên **raw body**, so sánh constant-time, cửa sổ thời gian), trùng lặp (khoá chính trên `psp_event_id`, nhận nhanh trả `200` rồi xử lý sau), sai thứ tự (compare-and-swap + thứ hạng trạng thái + khi bí thì **hỏi lại API**), và không bao giờ tới (job quét + đối soát). Thêm: *"redirect sau thanh toán **không phải nguồn sự thật** — nó nằm dưới quyền kiểm soát của người dùng. Nếu tôi tin `?result=success` trong query string thì ai cũng mua hàng miễn phí được."*

15. **Đóng gói tính đúng đắn thành bốn lớp.** *"Không lớp nào đủ một mình, và đó là chủ ý: unique constraint chặn trùng ở mức cấu trúc; idempotency key end-to-end chặn trùng ở mức luồng; outbox trong cùng transaction chặn mất tin; và reconciliation bắt mọi thứ đã lọt qua ba lớp trên."*

16. **Khi được hỏi về pay-out, đổi hẳn giọng sang rủi ro.** *"Pay-out không phải pay-in chạy ngược. Pay-in sai thì tôi refund được; pay-out sai thì tiền đã ở ngân hàng khác, có khi ở nước khác, và không có nút undo. Nên: reserve 5–10% trong 90 ngày để bù chargeback đến muộn, **treo 24–72 giờ mọi lần seller đổi số tài khoản nhận tiền** — biện pháp chống chiếm đoạt tài khoản hiệu quả nhất và nó là quy trình chứ không phải kỹ thuật — phê duyệt kép trên ngưỡng, và hạn mức cứng mà code không vượt được."*

17. **Chỉ đúng điểm nghẽn thật khi được hỏi về scale.** *"Ở 200 TPS đỉnh, nghẽn không nằm ở máy tính của tôi. Thứ nhất là **PSP**; thứ hai là **đội vận hành xử lý chênh lệch** — nó tăng tuyến tính theo doanh số, và đầu tư vào công cụ cho ops cho lợi tức cao hơn tối ưu code. Nghẽn duy nhất thuộc về kỹ thuật là **hàng nóng trên ví của seller lớn**."*

18. **Chốt bằng triết lý fail-closed.** *"Đây là hệ thống duy nhất tôi thiết kế mà tôi chọn **consistency trên availability** không cần xin lỗi. Khi DB primary đang failover, tôi **từ chối** giao dịch mới chứ không đoán. Từ chối một giao dịch là phiền toái cho một khách hàng; chấp nhận rồi đánh mất nó là một sự cố tài chính cho tất cả."*

> 💡 **Nguyên tắc cuối, gói cả bài trong một câu**: Mọi bài case study khác dạy bạn cách làm hệ thống **chịu được nhiều hơn**. Bài này dạy bạn cách làm hệ thống **sai ít hơn, và biết mình sai nhanh hơn**. Khi hiệu ứng của một thao tác không hoàn tác được, mọi công cụ quen thuộc đều đảo chiều: bạn chọn SQL thay vì NoSQL, chọn từ chối thay vì chấp nhận, chọn ghi thêm thay vì ghi đè, chọn hỏi lại thay vì đoán — và bạn xây một **vòng phản hồi** đối soát với thực tại, vì niềm tin rằng mình đã làm đúng không bao giờ là bằng chứng rằng mình đã làm đúng.
