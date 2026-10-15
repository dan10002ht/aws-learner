# SAA Ch4.1 — Compute Cost Optimization

> Mục tiêu: Cắt 30-70% compute bill mà không sacrifice performance. Hiểu **Savings Plan vs RI vs Spot**, Graviton ROI, **right-sizing**, autoscaling cost-aware, và serverless cost model.

Tiền đề: [[ch2-01-compute-performance]], CLF [[08-billing]].

---

## 1. Câu chuyện mở đầu — "Tôi save $480k/năm chỉ bằng 3 việc"

Real story (anonymized): SaaS B2B, compute bill $80k/tháng. SRE team làm 3 việc trong 1 sprint:

1. **Right-sizing**: dùng Compute Optimizer report → 40% instance over-provisioned (CPU < 20%). Downsize 1 step → save $20k/tháng.
2. **Savings Plan**: commit 50% baseline với Compute SP 3-year → save $15k/tháng (37% discount).
3. **Graviton migration**: Java service migrate m5 → m7g → save $5k/tháng + perf bằng/cao hơn.

Tổng: **$40k/tháng = $480k/năm**. Effort: ~2 tuần. ROI: vô cùng cao.

→ Compute cost optimization là **low-hanging fruit lớn nhất**. Bài này gom kỹ thuật.

Ba việc trên dùng ba từ chưa giải thích: "downsize 1 step" là gì (§5), "commit" với Savings Plan nghĩa là cam kết cái gì (§3), và "m5 → m7g" là đổi sang loại máy nào (§6). Trước hết cần biết AWS bán cùng một cái máy theo những cách tính tiền nào.

---

## 2. Hệ thống pricing AWS compute

### 2.1 EC2 purchase options (đã đề cập ch2.1)

Cùng một instance `m5.4xlarge` (16 vCPU, 64 GiB RAM), AWS có nhiều cách tính tiền. Máy chạy y hệt nhau; khác nhau ở chỗ **bạn hứa gì với AWS** để đổi lấy giá thấp hơn.

**On-demand — không hứa gì.** Bật lúc nào trả lúc đó, tính theo giây, tắt là hết tiền. Đây là giá gốc để mọi mức discount khác so vào: `m5.4xlarge` ở us-east-1 là ~$0,768/giờ, chạy cả tháng (730 giờ) hết ~$561.

**Savings Plan (SP) — hứa tiêu một số tiền mỗi giờ.** Bạn cam kết "mỗi giờ tôi sẽ tiêu ít nhất X đô cho compute, liên tục 1 hoặc 3 năm". Đổi lại, phần usage nằm trong X đô đó được tính giá thấp hơn on-demand. Có hai loại hay ra đề:

- **Compute Savings Plan**: giảm tới 66%. Áp cho EC2 **bất kể** instance family, size, Region, hệ điều hành, và áp luôn cho **Fargate** và **Lambda**.
- **EC2 Instance Savings Plan**: giảm tới 72%, nhưng khoá vào **một family trong một Region** (ví dụ "m5 ở us-east-1"). Trong family đó vẫn đổi được size và hệ điều hành.

(*Instance family* là phần chữ + số đầu của tên instance: `m5`, `c5`, `m7g`. Chữ là dòng máy — `m` cân bằng, `c` nhiều CPU, `r` nhiều RAM; số là thế hệ. Phần sau dấu chấm — `large`, `xlarge`, `4xlarge` — là *size*.)

**Reserved Instance (RI) — hứa dùng một loại máy cụ thể.** Mô hình cũ hơn Savings Plan. Thay vì hứa một số tiền, bạn "đặt chỗ" một cấu hình: instance type + hệ điều hành + Region (hoặc AZ), trong 1 hoặc 3 năm. Usage nào khớp cấu hình thì được giá giảm. Có hai hạng:

- **Standard RI**: giảm tới 72%. **Không đổi** được sang family khác. Chỉ *modify* được vài thuộc tính nhỏ (đổi AZ, đổi size trong cùng family với Linux). Nếu hết cần, có thể **bán lại** trên Reserved Instance Marketplace.
- **Convertible RI**: giảm tới 66% (tài liệu cũ và nhiều đề luyện ghi 54%). Được **exchange** — đổi lấy một Convertible RI khác với family, hệ điều hành, tenancy khác — miễn giá trị mới không thấp hơn. Không bán được trên Marketplace.

**Spot — không hứa gì, nhưng chấp nhận bị lấy lại máy.** Spot là capacity đang **rảnh** trong data center của AWS, bán rẻ tới 90%. Khi AWS cần lại capacity đó cho khách on-demand, instance của bạn bị ngắt với **2 phút báo trước**. Discount ở đây không đến từ cam kết mà đến từ rủi ro bị ngắt (chi tiết ở §4).

Hai lựa chọn còn lại **không phải để giảm giá**, nhưng đề hay trộn vào làm đáp án nhiễu:

- **Dedicated Host**: thuê nguyên một **máy chủ vật lý** cho riêng mình. Dùng khi compliance yêu cầu không chung phần cứng với khách khác, hoặc khi cần **BYOL** (*Bring Your Own License* — mang license phần mềm đã mua sẵn lên AWS, loại license tính theo socket/core vật lý; xem §10).
- **On-Demand Capacity Reservation**: giữ chỗ capacity trong một AZ cụ thể để **chắc chắn bật được máy** khi cần (ví dụ chuẩn bị cho ngày sale). Trả đúng giá on-demand dù có chạy máy hay không, **không có discount**, không cần cam kết kỳ hạn, huỷ lúc nào cũng được.

Đặt cạnh nhau:

| Option | Discount tối đa | Cam kết | Linh hoạt |
|--------|----------|--------|-----------|
| On-demand | 0% | Không | Tuỳ ý bật/tắt, đổi loại máy |
| **Compute Savings Plan** | ≤ 66% | 1/3 năm, tính bằng $/giờ | EC2 + Lambda + Fargate, mọi family/size/Region/OS |
| **EC2 Instance Savings Plan** | ≤ 72% | 1/3 năm, tính bằng $/giờ | Khoá 1 family + 1 Region; đổi được size, OS |
| **Standard Reserved Instance** | ≤ 72% | 1/3 năm, theo cấu hình máy | Không exchange; modify được AZ/size; bán lại được trên Marketplace |
| **Convertible Reserved Instance** | ≤ 66% (đề cũ: 54%) | 1/3 năm, theo cấu hình máy | Exchange được family/OS/tenancy; không bán lại được |
| **Spot** | ≤ 90% | Không | Bị ngắt với 2 phút báo trước |
| **Dedicated Host** | — (có Dedicated Host Reservation giảm tới 70% so với giá host on-demand) | Tuỳ | Compliance, BYOL |
| **Capacity Reservation** | 0% (giá on-demand) | Không | Đảm bảo capacity, không discount |

> Các con số 66% / 72% / 90% là **trần** AWS công bố, chỉ đạt được ở vài loại máy với kỳ hạn 3 năm trả hết trước. Mức thực tế thấp hơn nhiều — §2.2 có bảng giá thật của một instance.

Bốn lựa chọn chính nằm trên một trục **đánh đổi**: càng cam kết (commitment) thì discount càng cao nhưng càng kém linh hoạt; ngược lại càng linh hoạt thì discount càng thấp (hoặc chấp nhận bị ngắt).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phổ EC2 purchase options theo trục discount và độ linh hoạt</title>
  <desc>Bốn lựa chọn mua EC2 đặt trên đồ thị: trục dọc là mức discount, trục ngang là độ linh hoạt giảm dần (ràng buộc tăng dần). On-demand discount 0% nhưng linh hoạt nhất; Savings Plan tới 66% (cam kết $/h); Reserved Instance tới 72% (cố định family/region); Spot tới 90% nhưng đánh đổi bằng rủi ro bị ngắt 2 phút thông báo, không phải bằng cam kết.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Phổ EC2 purchase options</text>
  <line x1="70" y1="56" x2="70" y2="320" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="70" y1="320" x2="690" y2="320" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="60" y="64" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">Discount</text>
  <text x="60" y="320" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">0%</text>
  <text x="60" y="200" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">~70%</text>
  <text x="60" y="100" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">90%</text>
  <text x="380" y="350" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">Linh hoạt giảm → (độ ràng buộc / rủi ro bị ngắt tăng)</text>
  <g stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="3 4">
    <line x1="70" y1="200" x2="690" y2="200"/>
    <line x1="70" y1="100" x2="690" y2="100"/>
  </g>
  <g>
    <circle cx="150" cy="300" r="9" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="150" y="284" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">On-demand</text>
    <text x="150" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">0% · linh hoạt nhất</text>
  </g>
  <g>
    <circle cx="320" cy="218" r="9" fill="#10b981" fill-opacity="0.95"/>
    <text x="320" y="202" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Savings Plan</text>
    <text x="320" y="188" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">≤66% · cam kết $/h 1–3 năm</text>
  </g>
  <g>
    <circle cx="490" cy="196" r="9" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="490" y="180" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Reserved Instance</text>
    <text x="490" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">≤72% · family/region cố định</text>
  </g>
  <g>
    <circle cx="630" cy="108" r="9" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="630" y="92" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Spot</text>
    <text x="684" y="132" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.65">≤90% · interrupt 2-min</text>
    <text x="684" y="146" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.65">cam kết = Không · discount do rủi ro</text>
  </g>
  <path d="M150 300 Q235 250 320 218 T490 196" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
</svg>

### 2.2 Payment options

Savings Plan và RI đều hỏi thêm một câu: **trả tiền cam kết lúc nào?**

- **All Upfront**: trả hết toàn bộ kỳ hạn ngay ngày đầu. Discount cao nhất, vì AWS cầm tiền trước.
- **Partial Upfront**: trả trước khoảng một nửa, phần còn lại chia đều theo giờ. Discount ở giữa.
- **No Upfront**: không trả trước đồng nào, trả dần mỗi tháng. Discount thấp nhất, bù lại không phải chôn một cục tiền mặt.

Chênh nhau bao nhiêu? Giá thật của `m5.4xlarge` Linux, us-east-1 (on-demand ~$0,768/giờ; tra tháng 10/2026, giá có thể đổi):

| Compute Savings Plan | No Upfront | Partial Upfront | All Upfront |
|----------------------|------------|-----------------|-------------|
| 1 năm | ~$0,564/giờ (−27%) | ~$0,537 (−30%) | ~$0,527 (−31%) |
| 3 năm | ~$0,389/giờ (−49%) | ~$0,361 (−53%) | ~$0,353 (−54%) |

Hai điều rút ra từ bảng:

- **Kỳ hạn quan trọng hơn cách trả.** Từ 1 năm lên 3 năm, discount tăng khoảng 23 điểm phần trăm. Từ No Upfront lên All Upfront chỉ thêm khoảng 5 điểm.
- **No Upfront vẫn là cam kết.** Không trả trước không có nghĩa là huỷ được: bạn vẫn nợ AWS đủ số tiền đó mỗi giờ cho tới hết kỳ hạn.

Cùng máy này với **EC2 Instance Savings Plan** 3 năm All Upfront là ~$0,289/giờ (−62%), tức thêm khoảng 8 điểm so với Compute SP. Đó là "giá" của việc khoá vào family m5.

---

## 3. Savings Plan vs Reserved Instance — chọn cái nào?

### 3.1 "Commit $/giờ" hoạt động thế nào

Đây là chỗ dễ hiểu sai nhất: Savings Plan **không** gắn vào instance nào cả. Nó là một khoản tiền cam kết cho mỗi giờ, và AWS tự áp vào usage của bạn theo ba quy tắc:

1. **Mỗi giờ tính riêng.** Giờ nào AWS cũng lấy usage compute của giờ đó, tính theo **giá Savings Plan**, rồi trừ dần vào số tiền cam kết.
2. **Dùng không hết vẫn trả đủ.** Giờ nào usage thấp hơn cam kết thì phần thừa mất luôn, không dồn sang giờ sau.
3. **Dùng vượt thì phần vượt tính on-demand.** Không bị phạt, chỉ là không có discount cho phần đó.

Lưu ý con số cam kết tính bằng **giá đã giảm**, không phải giá on-demand. Cam kết $3,89/giờ không có nghĩa là "cover $3,89 usage on-demand".

**Tính thử.** Một fleet 10 × `m5.4xlarge` chạy 24/7 ở us-east-1. Bạn mua Compute Savings Plan 3 năm, No Upfront:

```
Giá on-demand:        10 × $0,768 = $7,68/giờ   → × 730 giờ ≈ $5.606/tháng
Giá Savings Plan:     10 × $0,389 = $3,89/giờ   → đây là số cần cam kết
Bill sau khi mua SP:                $3,89/giờ   → × 730 giờ ≈ $2.840/tháng
Tiết kiệm:            ≈ $2.767/tháng (49%)
```

Bây giờ xem ba tình huống trong **một giờ** bất kỳ:

```
Chạy đúng 10 máy:   usage theo giá SP = $3,89  → dùng hết cam kết.          Trả $3,89
Đêm tắt còn 6 máy:  usage theo giá SP = 6 × $0,389 = $2,33
                    → vẫn trả đủ $3,89; $1,56 cam kết bị bỏ phí.            Trả $3,89
Peak lên 14 máy:    10 máy đầu dùng hết cam kết ($3,89)
                    4 máy vượt tính on-demand: 4 × $0,768 = $3,07           Trả $6,96
```

Tình huống thứ hai là lý do **không cam kết theo mức peak**: mọi giờ thấp hơn peak đều trả tiền cho thứ không dùng.

Phép tính này cũng cho thấy vì sao Compute SP linh hoạt: nếu năm sau bạn đổi 10 máy m5 sang m7g, hoặc chuyển một nửa sang Fargate, AWS vẫn lấy $3,89 đó trừ vào usage mới theo giá SP của loại mới. Cam kết là **tiền**, không phải **máy**.

Hai chỉ số Cost Explorer dùng để theo dõi, rất hay bị lẫn:

- **Utilization** = phần cam kết thực sự được dùng ÷ tổng cam kết. Trả lời câu "tôi có mua thừa không?". Ở tình huống 6 máy: `$2,33 ÷ $3,89 = 60%`, tức 40% tiền cam kết của giờ đó bị lãng phí.
- **Coverage** = phần usage được Savings Plan che ÷ tổng usage. Trả lời câu "tôi còn bao nhiêu usage đang trả giá on-demand?". Ở tình huống 14 máy: `10 ÷ 14 ≈ 71%`.

Utilization thấp nghĩa là cam kết **quá nhiều**. Coverage thấp nghĩa là cam kết **còn ít**, có thể mua thêm.

### 3.2 Chọn loại nào

- **Compute Savings Plan** là lựa chọn mặc định cho hầu hết trường hợp. Lý do: trong 3 năm, gần như chắc chắn bạn sẽ đổi thế hệ máy (m5 → m7g), đổi Region, hoặc chuyển một phần sang container/serverless. Compute SP đi theo mọi thay đổi đó; RI và EC2 Instance SP thì không. Cái giá là discount thấp hơn vài điểm (trần 66% so với 72%; ở ví dụ §2.2 là 54% so với 62%).
- **EC2 Instance Savings Plan**: chỉ khi chắc chắn giữ nguyên một family ở một Region suốt kỳ hạn. Ví dụ một cụm database tự quản chạy `r6i` ổn định nhiều năm.
- **Convertible RI**: mô hình cũ. Việc nó làm được (đổi family) thì Compute SP làm tự động, không cần thao tác exchange. Chọn Compute SP.
- **Standard RI**: discount ngang EC2 Instance SP nhưng cứng hơn. Điểm riêng duy nhất là **bán lại được** trên Marketplace nếu không cần nữa; chỉ nên mua khi tính tới đường lui đó. Một điểm riêng khác: RI mua theo **AZ cụ thể** (zonal RI) kèm luôn **capacity reservation** ở AZ đó, còn Savings Plan thì không giữ chỗ capacity.

Thứ tự áp dụng khi có cả ba: RI trước, rồi EC2 Instance SP, cuối cùng mới tới Compute SP (cái linh hoạt nhất được để dành cho phần còn lại).

> Bẫy thi: *"giảm chi phí cho EC2 **và** Lambda/Fargate bằng một cam kết"* → **Compute Savings Plan** (RI và EC2 Instance SP không áp cho Lambda/Fargate). *"workload ổn định, cùng instance family, cùng Region, muốn discount cao nhất"* → **EC2 Instance Savings Plan** hoặc Standard RI. *"cần đảm bảo capacity trong một AZ"* → zonal RI hoặc **Capacity Reservation**, không phải Savings Plan. Spot **không** được Savings Plan che.

### 3.3 Cách commit

1. Mở **Cost Explorer → Savings Plans → Recommendations**. AWS nhìn usage 7, 30 hoặc 60 ngày gần nhất và đề xuất mức $/giờ.
2. Bắt đầu **thấp hơn baseline**. *Baseline* là mức usage thấp nhất mà giờ nào cũng có (ví dụ 3 giờ sáng Chủ nhật vẫn chạy 10 máy thì baseline là 10 máy). Cam kết 50–70% baseline trước, vì mua thêm lúc nào cũng được còn đã mua thì **không giảm, không huỷ** được.
3. Theo dõi **utilization**. Dưới ~90% là đang cam kết dư: đừng mua thêm, và tìm workload khác để dùng cho hết. Luôn 100% trong khi **coverage** còn thấp là dấu hiệu có thể mua thêm một Savings Plan nữa chồng lên (nhiều SP cộng dồn được).

---

## 4. Spot — tiết kiệm 70-90% nhưng phải design đúng

**Spot là gì và vì sao rẻ.** AWS phải xây data center đủ lớn cho lúc cao điểm, nên phần lớn thời gian có máy nằm không. Thay vì để trống, AWS bán số máy rảnh đó với giá rẻ tới 90%, kèm một điều kiện: **khi có khách on-demand cần, AWS lấy lại**. Instance của bạn nhận thông báo trước 2 phút rồi bị terminate (hoặc stop/hibernate tuỳ cấu hình).

Vậy nên câu hỏi với Spot không phải "có bị ngắt không" mà là "bị ngắt thì có sao không".

### 4.1 Eligible workload

| ✓ Phù hợp Spot | ✗ Tránh Spot |
|----------------|---------------|
| Batch (ML training, video transcoding) | Stateful DB (Postgres primary) |
| CI/CD runner | Hệ thống real-time strict latency |
| Containerized stateless API | Long-running session not-resumable |
| Big data (EMR, Glue) | Single-instance critical service |
| Dev/test | License server |

Điểm chung của cột trái: mất một máy giữa chừng thì chỉ cần chạy lại phần việc dở, không mất dữ liệu.

### 4.2 Spot Fleet & Mixed Instances Policy

**Pool — đơn vị để hiểu chuyện bị ngắt.** Capacity Spot không phải một kho chung. Nó chia thành từng **Spot capacity pool**: mỗi pool là tập máy rảnh của **một instance type trong một AZ**. `m5.large` ở `us-east-1a` là một pool; `m5.large` ở `us-east-1b` là pool khác; `m6i.large` ở `us-east-1a` lại là pool khác nữa. Mỗi pool có lượng máy rảnh riêng và cạn độc lập với nhau.

**Vì sao đa dạng hoá giảm rủi ro.** Nếu cả 20 instance của bạn cùng là `m5.large` ở `us-east-1a`, bạn nằm trọn trong **một** pool. Khi pool đó cạn, cả 20 máy mất cùng lúc. Nếu trải 20 máy trên 10 pool (5 instance type × 2 AZ), một pool cạn chỉ lấy đi 2 máy, tức 10% capacity, và phần còn lại vẫn phục vụ được trong lúc chờ bù máy.

Hai công cụ để xin Spot từ nhiều pool cùng lúc:

- **ASG Mixed Instances Policy (MIP)**: một Auto Scaling Group được khai báo **nhiều instance type** và trộn On-demand với Spot theo tỉ lệ. Đây là cách phổ biến nhất (ví dụ ở §9.3).
- **Spot Fleet / EC2 Fleet**: API xin một lượng capacity mục tiêu từ danh sách pool, không cần ASG. Hay dùng cho batch.

**Allocation strategy — fleet chọn pool nào.** Khi có nhiều pool khả dụng, chiến lược này quyết định lấy máy từ đâu:

| Strategy | Chọn pool theo | Khi nào |
|----------|----------------|---------|
| **price-capacity-optimized** | Pool còn nhiều máy rảnh nhất, rồi lấy cái rẻ nhất trong số đó | AWS khuyến nghị cho hầu hết workload hiện nay |
| **capacity-optimized** | Chỉ xét pool còn nhiều máy rảnh nhất (ít nguy cơ ngắt nhất), bỏ qua giá | Workload mà mỗi lần bị ngắt rất tốn (job dài, render, training). Đề thi hay dùng tên này |
| **diversified** | Chia đều qua mọi pool | Fleet lớn, chạy lâu |
| **lowest-price** | Pool rẻ nhất | Không khuyến nghị: pool rẻ nhất thường cũng là pool sắp cạn |

- **Spot placement score**: công cụ chấm điểm 1–10 cho biết một yêu cầu Spot (bao nhiêu máy, những loại nào) có khả năng được đáp ứng ở Region/AZ nào. Chỉ là gợi ý, không đảm bảo capacity. Cần khai ít nhất 3 instance type.

### 4.3 Graceful shutdown

Hai phút là đủ để dọn dẹp nếu ứng dụng biết mình sắp bị ngắt. Có hai cách nhận tín hiệu:

- **Instance metadata**: từ bên trong instance, gọi `http://169.254.169.254/latest/meta-data/spot/instance-action`. Bình thường trả về 404; khi sắp bị ngắt thì trả về hành động và thời điểm. AWS khuyến nghị kiểm tra mỗi 5 giây.
- **EventBridge**: event `EC2 Spot Instance Interruption Warning`, dùng khi muốn xử lý từ bên ngoài (ví dụ một Lambda rút instance khỏi load balancer).

Khi nhận tín hiệu, làm theo thứ tự: ngừng nhận việc mới (deregister khỏi ALB target group để ALB thôi gửi request), hoàn tất hoặc lưu việc đang dở ra ngoài máy (S3, DynamoDB, đẩy lại message vào queue), rồi thoát. Với container, ECS/Kubernetes gửi **SIGTERM** vào process và ứng dụng phải bắt signal này để đóng kết nối cho gọn.

Ngoài ra còn tín hiệu sớm hơn: **rebalance recommendation**, phát ra khi AWS thấy instance có nguy cơ bị ngắt tăng cao, thường trước cả thông báo 2 phút. Bật **Capacity Rebalancing** trên ASG thì ASG tự khởi động máy thay thế ngay từ tín hiệu này.

### 4.4 Spot best practices

1. Multi-AZ, multi-instance-type — tức là nhiều pool, theo đúng lý do ở §4.2.
2. Diversify family (m5, m6i, m6a, c5, c6i…). Các loại cùng số vCPU và RAM thường thay nhau được.
3. Strategy **price-capacity-optimized** hoặc **capacity-optimized**, không dùng lowest-price.
4. Workload **fully stateless** hoặc state external (S3/DB). Máy mất thì không mất gì theo.
5. Combine Spot + On-demand baseline qua ASG MIP: phần tối thiểu phải có chạy On-demand, phần co giãn chạy Spot.

### 4.5 EC2 Spot tactical

- **Giá Spot không còn nhảy thất thường.** Trước 2017, Spot là đấu giá: bạn đặt bid, giá vọt qua bid là mất máy, nên giá có thể tăng gấp nhiều lần trong vài phút. Từ cuối 2017, AWS tự đặt giá cho từng pool và điều chỉnh **chậm** theo cung cầu dài hạn. Bạn không cần bid nữa (vẫn đặt được giá trần, mặc định bằng giá on-demand). Hệ quả: bây giờ bị ngắt gần như luôn vì **hết capacity**, không phải vì giá.
- **Tần suất bị ngắt.** AWS công bố mức trung bình lịch sử trên mọi Region và instance type là **dưới 5% mỗi tháng** (tỉ lệ instance Spot bị thu hồi trong tháng). Từng pool thì khác nhau nhiều; **Spot Instance Advisor** xếp mỗi instance type vào các bậc <5%, 5–10%, 10–15%, 15–20%, >20% để bạn tránh pool hay bị ngắt.

> Bẫy thi: Spot **không** dành cho workload không chịu được gián đoạn, dù đề có nói "tiết kiệm nhất". Thấy "fault-tolerant", "stateless", "có thể chạy lại", "batch", "flexible start time" → Spot. Thấy "không được gián đoạn", "database", "phải chạy liên tục 1 năm" → Savings Plan/RI.

---

## 5. Right-sizing

**Right-sizing** là chọn lại size (và family) instance cho khớp với tải thật. Lý do nó đứng đầu danh sách: mọi discount ở §2–§4 đều tính trên số máy bạn đang chạy, nên giảm giá 50% cho một máy to gấp đôi mức cần vẫn là lãng phí.

**"Downsize 1 step" nghĩa là gì.** Trong một family, mỗi bậc size gấp đôi bậc dưới về cả vCPU, RAM lẫn giá:

```
m5.large     2 vCPU   8 GiB   $0,096/giờ
m5.xlarge    4 vCPU  16 GiB   $0,192/giờ
m5.2xlarge   8 vCPU  32 GiB   $0,384/giờ
m5.4xlarge  16 vCPU  64 GiB   $0,768/giờ
```

Hạ một bậc là **cắt đôi tiền** của instance đó. Ví dụ 20 × `m5.4xlarge` chạy 24/7 với CPU trung bình 25%:

```
Trước:  20 × $0,768 × 730 giờ ≈ $11.213/tháng
Sau:    20 × $0,384 × 730 giờ ≈ $5.606/tháng   (m5.2xlarge)
→ tiết kiệm ≈ $5.606/tháng; CPU trung bình lên khoảng 50%
```

CPU 25% trên máy 16 vCPU tương đương 50% trên máy 8 vCPU, vẫn còn chỗ cho lúc peak. Nếu peak hiện tại đã chạm 60–70% thì hạ một bậc sẽ đẩy peak vượt 100%, lúc đó không hạ được. Vì vậy phải nhìn cả **peak**, không chỉ trung bình.

### 5.1 AWS Compute Optimizer

Dịch vụ miễn phí, tự làm việc so sánh trên cho toàn bộ account.

- **Đọc dữ liệu gì**: metric CloudWatch của từng resource (CPU, network, disk I/O, và RAM nếu có) trong **14 ngày** gần nhất, lấy điểm cao nhất của mỗi khoảng 5 phút. Cần ít nhất 30 giờ dữ liệu mới ra đề xuất. Bật tuỳ chọn trả phí *enhanced infrastructure metrics* thì nhìn lại tới 93 ngày, hữu ích với workload có chu kỳ theo tháng.
- **Trả về gì**: xếp mỗi resource vào *over-provisioned* (thừa), *under-provisioned* (thiếu) hoặc *optimized*, kèm vài instance type đề xuất và mức tiết kiệm ước tính.
- **Áp dụng cho**: EC2 instance, Auto Scaling Group, EBS volume, Lambda function (memory), ECS service trên Fargate, RDS/Aurora.
- **Action**: review hằng tuần, hạ size cái thừa, **tăng size cái thiếu** (right-sizing không chỉ có một chiều).

### 5.2 CloudWatch agent

EC2 mặc định chỉ gửi lên CloudWatch những metric mà hypervisor nhìn thấy từ **bên ngoài** máy ảo: CPU, network, disk I/O. **RAM đang dùng bao nhiêu** là chuyện bên trong hệ điều hành nên không có sẵn. Muốn có phải cài **CloudWatch agent** vào instance.

Hệ quả cho right-sizing: không có metric RAM thì Compute Optimizer chỉ dựa vào CPU. Một service Java dùng 10% CPU nhưng 85% RAM sẽ bị đánh giá là "thừa" và được đề xuất hạ size; làm theo thì hết RAM. Với workload ăn RAM (cache, JVM, database), cài agent trước rồi mới tin đề xuất.

### 5.3 Right-sizing pitfalls

- **Hạ quá tay.** Trung bình thấp không có nghĩa peak thấp. Hạ xong mà lúc cao điểm chạm trần CPU/RAM thì latency tăng hoặc OOM.
- **Đổi thẳng trên production.** Đổi instance type cần stop/start. Thử ở staging với tải giống thật trước, rồi rollout dần.
- **License tính theo vCPU.** Một số phần mềm (SQL Server, Oracle) thu tiền theo số vCPU/core. Tăng size kéo theo tiền license, hạ size có thể tiết kiệm license nhiều hơn cả tiền máy.

> Bẫy thi: *"công cụ nào đề xuất instance type tối ưu dựa trên utilization?"* → **Compute Optimizer**. **Trusted Advisor** chỉ ra instance **idle/low-utilization** nhưng không đề xuất type cụ thể. **Cost Explorer** có right-sizing recommendation cho EC2 và là nơi xem Savings Plan recommendation.

---

## 6. Graviton — free 20-40% discount

**Graviton là gì.** Là dòng **CPU do AWS tự thiết kế**, dùng kiến trúc **ARM** (cùng họ với chip điện thoại và Apple Silicon) thay vì **x86** của Intel/AMD. Trên tên instance, chữ **`g`** sau số thế hệ là Graviton: `m7g`, `c7g`, `r7g`, `t4g`. Vậy "migrate m5 → m7g" ở §1 nghĩa là chuyển từ máy Intel thế hệ 5 sang máy Graviton thế hệ 7.

**Vì sao rẻ hơn.** AWS tự làm chip nên không trả phần lợi nhuận cho Intel/AMD, và chip ARM tốn ít điện hơn cho cùng lượng việc (AWS công bố tới 60% ít năng lượng hơn). Phần tiết kiệm đó được chuyển vào giá.

**Rẻ hơn bao nhiêu.** Cùng 2 vCPU, 8 GiB RAM, on-demand us-east-1:

```
m7i.large  (Intel, thế hệ 7)     $0,1008/giờ
m5.large   (Intel, thế hệ 5)     $0,0960/giờ
m7g.large  (Graviton3)           $0,0816/giờ   → rẻ hơn m7i 19%, rẻ hơn m5 15%
```

Vậy con số trong tiêu đề gồm hai thứ khác nhau: **giá instance** thấp hơn khoảng 15–20% (AWS ghi "tới 20%"), còn **40%** là mức cải thiện *price-performance* AWS công bố cho M6g so với M5, tức gộp cả giá thấp hơn lẫn mỗi vCPU làm được nhiều việc hơn. Mức thực tế phụ thuộc workload, phải benchmark mới biết.

Chữ "free" trong tiêu đề nghĩa là không cần cam kết gì và **cộng dồn được** với Savings Plan lẫn Spot. Nhưng không free về công: bạn phải chạy được trên ARM.

### 6.1 Ai chạy được?

Chương trình biên dịch cho x86 **không chạy** được trên ARM. Câu hỏi là code của bạn có bản ARM hay không:

- **Ngôn ngữ chạy qua runtime** (Java/Kotlin, Python, Node.js, .NET 6+): code của bạn không đổi, chỉ cần cài runtime bản ARM. Gần như không tốn công.
- **Ngôn ngữ biên dịch** (Go, Rust, C/C++): build lại với target `arm64`. Go và Rust làm việc này bằng một cờ build.
- **Container**: image cũng gắn với kiến trúc CPU, nên phải build lại image cho `arm64`.
- **Managed service** (RDS, Aurora, ElastiCache, OpenSearch, EMR): chỉ cần chọn instance class Graviton. AWS lo phần engine.
- Chỉ áp dụng cho **Linux**.

### 6.2 Ai chưa?

- Thư viện native chỉ có bản x86: code C/C++ dùng lệnh SIMD riêng của Intel, hoặc thư viện đóng của bên thứ ba không phát hành bản ARM. Chỗ hay vấp là dependency native nằm sâu trong package Python/Node.
- .NET Framework đời cũ, vì chỉ chạy trên Windows.
- Workload GPU/CUDA phụ thuộc phần mềm chỉ build cho x86.

### 6.3 Migration approach

1. Chạy thử ở dev/staging với `t4g`/`m7g`.
2. Benchmark: đo throughput và latency trên cùng tải, chia cho giá để ra chi phí mỗi request.
3. CI build **multi-arch image** (`docker buildx`): một tag image chứa cả bản x86 lẫn ARM, node nào kéo về cũng lấy đúng bản của mình.
4. Rolling deploy production: thêm node Graviton vào chung với node x86, chuyển tải dần.
5. Theo dõi error rate và latency sau khi chuyển, giữ đường rollback về x86.

> Chỗ dễ ăn nhất là managed database: Aurora PostgreSQL/MySQL và RDS trên Graviton (ví dụ `db.r7g`) chỉ cần đổi instance class, ứng dụng không phải sửa hay build lại gì vì nó chỉ nói chuyện với database qua mạng.

---

## 7. Serverless cost model

Với EC2 bạn trả tiền theo **thời gian máy bật**, có request hay không cũng vậy. Serverless đảo lại: trả theo **việc thực sự làm**, không có request thì không mất tiền. Rẻ hay đắt hơn tuỳ vào máy của bạn bận bao nhiêu phần trăm thời gian (§7.5).

### 7.1 Lambda

Lambda tính hai khoản (us-east-1, x86):

- **Request**: $0,20 cho mỗi 1 triệu lần gọi.
- **Duration**: $0,0000166667 cho mỗi **GB-second**.

**GB-second là gì.** Là "1 GB memory được cấp trong 1 giây". Số GB-second của một lần chạy = memory cấu hình (đổi ra GB) × thời gian chạy (giây). Tính theo memory **cấu hình**, không phải memory thực dùng; thời gian làm tròn lên từng mili giây.

```
Function 512 MB chạy 400 ms:    0,5 GB × 0,4 s = 0,2 GB-second
Function 2.048 MB chạy 3 s:     2 GB   × 3 s   = 6 GB-second
```

**Tính thử một tháng.** Function 512 MB, mỗi lần 400 ms, 5 triệu lần gọi/tháng:

```
Duration:  5.000.000 × 0,2 GB-s = 1.000.000 GB-s × $0,0000166667 ≈ $16,67
Request:   5 triệu × $0,20/triệu                                 = $1,00
Tổng                                                             ≈ $17,67/tháng

Trừ free tier (1 triệu request + 400.000 GB-s mỗi tháng):
Duration:  600.000 GB-s × $0,0000166667 ≈ $10,00
Request:   4 triệu × $0,20/triệu        = $0,80
Tổng                                    ≈ $10,80/tháng
```

Tiền duration thường lớn hơn tiền request nhiều lần, nên tối ưu Lambda chủ yếu là giảm GB-second.

**Memory tune — tăng memory có thể làm bill giảm.** Lambda không cho chỉnh CPU riêng: CPU được cấp **tỉ lệ thuận với memory** (ở 1.769 MB function có tương đương 1 vCPU; memory chỉnh được từ 128 MB tới 10.240 MB). Function nặng CPU chạy trên 512 MB chỉ có khoảng 0,3 vCPU nên chạy chậm. Gấp đôi memory thì giá mỗi giây gấp đôi, nhưng nếu thời gian chạy giảm **hơn** một nửa thì tổng tiền giảm:

```
512 MB,   400 ms:  0,5 × 0,40 = 0,200 GB-s/lần  → $16,67 cho 5 triệu lần
1.024 MB, 180 ms:  1,0 × 0,18 = 0,180 GB-s/lần  → $15,00  (rẻ hơn VÀ nhanh hơn 2 lần)
2.048 MB, 150 ms:  2,0 × 0,15 = 0,300 GB-s/lần  → $25,00  (nhanh thêm chút, đắt hơn hẳn)
```

Điểm tối ưu nằm ở giữa và mỗi function một khác. Function chủ yếu ngồi chờ I/O (gọi API, query DB) thì thêm CPU không nhanh hơn, tăng memory chỉ tốn thêm. **Lambda Power Tuning** (công cụ open-source chạy trên Step Functions) tự chạy function của bạn ở nhiều mức memory rồi vẽ đường cong chi phí/thời gian để chọn.

Hai nút chỉnh giá còn lại:

- **ARM (Graviton2)**: giá duration là $0,0000133334/GB-s, **rẻ hơn 20%** so với x86 cho cùng cấu hình. Ví dụ trên từ $16,67 xuống ~$13,33. Đổi một dòng cấu hình (`arm64`), với điều kiện dependency có bản ARM (§6).
- **Provisioned Concurrency**: giữ sẵn N môi trường chạy luôn "ấm" để không có **cold start** (độ trễ vài trăm ms tới vài giây khi Lambda phải khởi tạo môi trường mới). Bạn trả **theo thời gian giữ ấm**, có request hay không cũng trả: $0,0000041667/GB-s.

```
Giữ 10 môi trường × 1 GB × cả tháng (730 giờ = 2.628.000 giây):
26.280.000 GB-s × $0,0000041667 ≈ $109,50/tháng — kể cả khi không có request nào
```

Tức là Provisioned Concurrency đưa Lambda quay lại mô hình "trả tiền cho thứ nằm chờ". Nó là công cụ giảm **latency**, không phải giảm cost; chỉ bật khi cold start thật sự là vấn đề.

### 7.2 Fargate

Fargate chạy container mà không cần quản EC2. Bạn khai mỗi task cần bao nhiêu vCPU và GB memory, rồi trả theo giây cho đúng lượng đã khai, trong lúc task chạy (us-east-1, Linux/x86):

```
~$0,04048 / vCPU-giờ  +  ~$0,004445 / GB-giờ

1 task 1 vCPU + 2 GB chạy cả tháng:
(0,04048 + 2 × 0,004445) × 730 giờ ≈ $36/tháng
```

Khác Lambda ở chỗ: task chạy liên tục thì tính tiền liên tục, kể cả lúc không có request. Fargate là "EC2 không phải quản máy", không phải "trả theo request".

- **Fargate Spot**: giảm tới 70%, cùng cơ chế với EC2 Spot (capacity rảnh, bị thu hồi với 2 phút báo trước). Hợp với task chạy lại được.
- **ARM (Graviton)**: rẻ hơn 20% so với x86.
- **Compute Savings Plan** áp được cho Fargate.

### 7.3 API Gateway

- **HTTP API** giá ~$1,00 mỗi triệu request, **REST API** ~$3,50 mỗi triệu: HTTP API rẻ hơn khoảng 71%. HTTP API rẻ vì ít tính năng hơn (không có API key/usage plan, không cache, không request validation). Nếu chỉ cần proxy tới Lambda kèm JWT auth thì HTTP API là đủ.
- **Caching** (chỉ REST API): API Gateway giữ response trong một khoảng TTL và trả thẳng cho các request giống nhau, không gọi backend. Mỗi request trúng cache là một lần **không** phải trả tiền Lambda. Cache tính tiền theo giờ theo dung lượng (ví dụ ~$0,038/giờ cho 1,6 GB), nên chỉ lời khi tỉ lệ trúng cache đủ cao.

### 7.4 Step Functions

Step Functions điều phối một chuỗi bước (gọi Lambda, chờ, rẽ nhánh). Hai loại workflow tính tiền theo hai cách khác hẳn:

- **Standard**: tính theo **state transition** (mỗi lần workflow chuyển từ bước này sang bước kế), $0,025 mỗi 1.000 transition. Chạy lâu bao nhiêu không ảnh hưởng tiền; một execution được chạy tới 1 năm.
- **Express**: tính theo **số lần chạy** ($1,00 mỗi triệu) cộng **duration × memory** (~$0,00001667/GB-s), giống Lambda. Số bước không ảnh hưởng tiền; một execution tối đa 5 phút.

```
Workflow 10 bước, chạy 1 triệu lần/tháng, mỗi lần 1 giây, dùng 64 MB:

Standard:  10.000.000 transition × $0,025/1.000                       = $250
Express:   $1,00 (request) + 1.000.000 × 1 s × 0,0625 GB × $0,00001667 ≈ $2
```

Chênh hơn 100 lần. Workflow ngắn, chạy với tần suất lớn (xử lý event, IoT, streaming) → Express. Workflow dài, có bước chờ người duyệt hoặc cần lịch sử từng execution để audit → Standard.

### 7.5 Serverless vs container vs EC2 cost tipping point

Điểm hoà vốn không nằm ở một con số request cố định. Nó nằm ở chỗ **máy của bạn bận bao nhiêu phần trăm thời gian**. Tính thử với một API cụ thể: mỗi request chạy 100 ms trên 512 MB.

```
Lambda, mỗi 1 triệu request:
  $0,20 + (1.000.000 × 0,1 s × 0,5 GB × $0,0000166667) ≈ $1,03

Phương án thay thế: 2 × m7g.large (2 máy để có HA) chạy 24/7
  2 × $0,0816 × 730 giờ ≈ $119/tháng — cố định, dù có 0 hay 100 triệu request
```

| Request/tháng | Trung bình | Lambda | 2 × m7g.large | Rẻ hơn |
|---------------|------------|--------|----------------|--------|
| 1 triệu | 0,4 req/s | ~$1 | ~$119 | Lambda, hơn 100 lần |
| 10 triệu | 4 req/s | ~$10 | ~$119 | Lambda |
| 100 triệu | 38 req/s | ~$103 | ~$119 | Gần hoà |
| 300 triệu | 114 req/s | ~$310 | ~$119 (tới ~$238 nếu cần 4 máy) | EC2 |

Hoà vốn: `$119 ÷ $1,03 ≈ 115 triệu request/tháng`, tức khoảng 44 request/giây **đều đặn suốt tháng**. Dưới mức đó, hai cái máy phần lớn thời gian ngồi không mà vẫn tính tiền; trên mức đó, trả theo từng request đắt hơn thuê đứt máy.

Con số 115 triệu chỉ đúng cho function nhẹ này. Function nặng hơn thì điểm hoà vốn tụt rất nhanh:

```
Function 1 GB chạy 1 giây: mỗi triệu request = $0,20 + $16,67 ≈ $16,87
Hoà vốn với $119: chỉ ~7 triệu request/tháng
```

Từ đó ra quy tắc:

- **Dưới ~100k request/tháng**: Lambda gần như miễn phí (nằm trong free tier).
- **1 triệu – 100 triệu request/tháng**: phải tính như trên, với memory và duration thật của function. Function nhẹ thì Lambda thắng tới gần 100 triệu; function nặng thì thua từ vài triệu.
- **Trên ~100 triệu request/tháng và tải đều**: container/EC2 thường rẻ hơn, nhất là khi cộng thêm Savings Plan hoặc Spot (Savings Plan giảm cho EC2 tới 66% nhưng với Lambda chỉ khoảng 12–17%).
- **Tải spiky** (vài đợt bùng rồi im lặng): serverless thắng dù tổng request lớn, vì EC2 phải được cấp theo **đỉnh** và trả tiền cả lúc im lặng.

Phép so trên mới tính tiền compute. EC2/container còn kèm load balancer, công vận hành, patch OS; Lambda thì gần như không. Đề thi coi "ít vận hành nhất" là một tiêu chí riêng, tách khỏi "rẻ nhất".

---

## 8. Container cost optimization

Mấy từ dùng trong phần này: trong Kubernetes (EKS), **pod** là đơn vị chạy nhỏ nhất, gồm một hoặc vài container chạy cùng nhau; **node** là một máy (EC2 instance) chứa nhiều pod. Bên ECS, khái niệm tương ứng với pod là **task**. Tiền bạn trả là tiền **node**, nên tối ưu cost container thực chất là nhét pod vào node cho khít và tắt node thừa.

### 8.1 ECS / EKS

- **Resource request phải sát thực tế.** Mỗi pod khai một *request*: "tôi cần X vCPU, Y GB RAM". Scheduler xếp pod vào node dựa trên **request**, không dựa trên mức dùng thật. Pod khai 4 vCPU nhưng chỉ dùng 0,5 thì vẫn chiếm chỗ 4 vCPU: một node 16 vCPU chỉ xếp được 4 pod như vậy trong khi thực tế đang dùng có 2 vCPU. Cluster phải bật thêm node cho thứ không ai dùng. Đây là nguồn lãng phí lớn nhất của container.
- **Cluster Autoscaler**: công cụ Kubernetes tự thêm node khi có pod không xếp được chỗ và bỏ node khi node gần trống. Nó làm việc qua các Auto Scaling Group có sẵn, nên chỉ chọn được trong những instance type bạn đã khai.
- **Karpenter**: công cụ scale node do AWS phát triển, thay cho Cluster Autoscaler. Nó nhìn tổng request của các pod đang chờ rồi tự chọn instance type vừa khít và rẻ nhất, gọi thẳng EC2 không qua ASG. Nó cũng chủ động dồn pod sang ít node hơn để tắt node thừa (*consolidation*).
- **Fargate Spot** cho task/pod không critical (§7.2).

### 8.2 Vertical Pod Autoscaler (VPA)

Công cụ Kubernetes theo dõi CPU/RAM pod **thực sự dùng** rồi đề xuất (hoặc tự chỉnh) request cho khớp. Nó giải đúng vấn đề request khai thừa ở §8.1, giống Compute Optimizer nhưng ở cấp pod.

### 8.3 Spot mix

- Karpenter kết hợp Spot đa dạng instance type có thể giảm tiền node 60–80% cho phần workload chạy được trên Spot. Mức cụ thể phụ thuộc tỉ lệ Spot trong cluster và giá Spot của từng pool.
- Cần một thành phần nghe tín hiệu ngắt 2 phút để *drain* node (chuyển pod đi nơi khác trước khi máy mất). Thường là một **DaemonSet** — loại workload Kubernetes chạy đúng một pod trên **mỗi** node — ví dụ AWS Node Termination Handler. Karpenter có sẵn phần xử lý này.

---

## 9. ASG cost-aware patterns

Auto Scaling Group (ASG) có ba kiểu scaling, khác nhau ở **thông tin dùng để quyết định**:

| Kiểu | Quyết định dựa trên | Phản ứng | Hợp khi |
|------|---------------------|----------|---------|
| **Dynamic** (target tracking, step) | Metric **hiện tại** (CPU đang 80%) | Sau khi tải đã tăng | Tải khó đoán |
| **Scheduled** | **Lịch bạn tự đặt** (8h sáng lên 10 máy) | Đúng giờ, bất kể tải | Bạn biết chắc lịch |
| **Predictive** | **Dự báo** từ lịch sử metric | Trước khi tải tăng | Tải lặp theo chu kỳ ngày/tuần |

### 9.1 Predictive scaling

- **Dựa trên gì**: ASG phân tích metric tải (ví dụ CPU hoặc số request) của tối đa **14 ngày** gần nhất để tìm quy luật theo giờ trong ngày và ngày trong tuần. Cần ít nhất 24 giờ dữ liệu.
- **Dự báo ra sao**: tạo dự báo capacity theo **từng giờ cho 48 giờ tới**, cập nhật lại mỗi 6 giờ.
- **Hành động**: đầu mỗi giờ, ASG đưa capacity lên mức dự báo của giờ đó. Có thể cho khởi động máy sớm hơn vài phút (*pre-launch*) để máy kịp boot trước khi tải tới.
- **Giới hạn**: predictive scaling **chỉ scale out**, không tự scale in. Vì vậy luôn dùng kèm một dynamic policy để thu máy về khi tải giảm và để đỡ khi tải vượt dự báo.
- Có chế độ *forecast only* để xem dự báo chuẩn tới đâu trước khi cho nó thật sự scale.

Liên quan tới cost: không có predictive, team thường giữ một baseline cao "cho chắc" vì dynamic scaling phản ứng chậm hơn thời gian boot. Có dự báo thì hạ baseline đó xuống được.

Khác scheduled ở chỗ: scheduled là bạn tự nhập lịch và tự sửa khi quy luật đổi; predictive tự học và tự cập nhật.

### 9.2 Scheduled scaling

Hợp nhất với môi trường chỉ dùng trong giờ làm việc. Cho ASG về 0 máy ngoài giờ:

```
Một tuần có 168 giờ. Giờ làm việc: 10 giờ × 5 ngày = 50 giờ ≈ 30%
→ tắt 70% thời gian còn lại = cắt ~70% tiền compute

Môi trường dev 10 × m5.large:
  Chạy 24/7:        10 × $0,096 × 730 giờ          ≈ $701/tháng
  Chỉ giờ làm việc: 10 × $0,096 × ~217 giờ/tháng   ≈ $208/tháng
```

Đó là nguồn gốc con số "save 60–70% cho dev/test". Lưu ý EBS volume của máy bị tắt vẫn tính tiền.

### 9.3 Spot + On-demand mix

ASG Mixed Instances Policy mua theo **lớp**: một **baseline** chạy On-demand / Savings Plan luôn được đảm bảo capacity, còn phần **scale-out** dùng Spot diversified (nhiều instance type, allocation **capacity-optimized**) để cắt cost mà vẫn chịu được khi một pool Spot bị ngắt.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Layered purchase trong ASG Mixed Instances Policy</title>
  <desc>Lớp dưới là baseline đảm bảo: On-demand hoặc Savings Plan, ví dụ 2 instance. Lớp trên là scale-out dùng Spot diversified qua nhiều instance type với chiến lược capacity-optimized, ví dụ 8 instance. Baseline luôn chạy, Spot co giãn theo tải.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">ASG Mixed Instances — mua theo lớp</text>
  <rect x="40" y="46" width="640" height="118" rx="10" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="56" y="70" font-size="13" font-weight="700" fill="currentColor">Scale-out — 8 × Spot diversified (co giãn theo tải)</text>
  <text x="56" y="88" font-size="11" fill="currentColor" opacity="0.7">≤90% rẻ · 4+ instance type · capacity-optimized · nhiều AZ · ngắt 1 pool → ASG bù pool khác</text>
  <g>
    <rect x="56" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="136" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="216" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="296" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="376" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="456" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="536" y="100" width="68" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
    <rect x="616" y="100" width="48" height="48" rx="7" fill="#8b5cf6" fill-opacity="0.9"/>
  </g>
  <rect x="40" y="178" width="640" height="96" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="56" y="202" font-size="13" font-weight="700" fill="currentColor">Baseline — 2 × On-demand / Savings Plan (luôn đảm bảo)</text>
  <text x="56" y="220" font-size="11" fill="currentColor" opacity="0.7">capacity guaranteed · cover bằng Savings Plan để có discount</text>
  <g>
    <rect x="56" y="232" width="120" height="30" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <rect x="188" y="232" width="120" height="30" rx="7" fill="#10b981" fill-opacity="0.95"/>
  </g>
  <text x="360" y="300" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Tổng 10 instance: 2 chắc chắn (baseline) + 8 rẻ, co giãn (Spot)</text>
</svg>

### 9.4 Hibernate

Bình thường *stop* một instance là mất hết những gì trong RAM; lần sau bật lên ứng dụng phải khởi động lại từ đầu. **Hibernate** ghi toàn bộ RAM xuống EBS root volume trước khi dừng, và khi start lại thì nạp RAM từ đó, nên process tiếp tục đúng chỗ đang dở.

- Trong lúc hibernate, bạn **không trả tiền instance**, chỉ trả tiền EBS (gồm cả phần chứa RAM).
- Điều kiện: root volume là EBS, **bắt buộc encrypted**, đủ chỗ chứa RAM; RAM dưới 150 GiB (Linux); phải bật tính năng ngay từ lúc launch.
- Use case: dev workstation tắt ngoài giờ mà không mất phiên làm việc; ứng dụng nạp cache rất lâu mới ấm.

---

## 10. License & BYOL

Với Windows Server, SQL Server, Oracle… tiền license có thể lớn hơn tiền máy. Có hai cách trả:

- **License Included**: AWS gộp tiền license vào giá giờ của instance. Không cần hợp đồng riêng với hãng phần mềm, tắt máy là hết tiền license.
- **BYOL (Bring Your Own License)**: dùng license công ty **đã mua** từ trước, chỉ trả AWS tiền máy. Rẻ hơn nếu license đó đằng nào cũng đã trả tiền.

### 10.1 Windows / SQL Server

- Vì sao BYOL hay đi cùng **Dedicated Host**: nhiều license cũ tính theo **socket hoặc core vật lý** của máy chủ. Trên EC2 thường (shared tenancy), bạn không biết và không kiểm soát được instance nằm trên máy vật lý nào, nên không chứng minh được mình dùng bao nhiêu core. Dedicated Host cho bạn nguyên một máy vật lý và cho thấy số socket, core của nó, đủ để đếm license đúng điều khoản.
- **Software Assurance (SA)** là gói bảo trì trả thêm của Microsoft; nó kèm quyền **License Mobility**, cho phép mang một số license (điển hình là SQL Server) lên cloud mà không cần Dedicated Host. Windows Server không có quyền này nên BYOL thường phải dùng Dedicated Host.
- **AWS License Manager**: dịch vụ khai báo quy tắc license (ví dụ "tối đa 96 core SQL Server Enterprise") rồi tự đếm mức dùng trên các instance/host và chặn launch khi vượt. Mục đích là tránh vi phạm license khi bị audit và tránh mua thừa.

### 10.2 SAP / Oracle

- Một số điều khoản license yêu cầu phần cứng riêng → Dedicated Host.
- License Manager theo dõi mức dùng tương tự như trên.

> Bẫy thi: *"dùng lại license Windows Server/SQL Server hiện có tính theo socket/core"* → **Dedicated Host** (Dedicated **Instance** cũng là phần cứng riêng nhưng không cho thấy socket/core nên không đủ cho loại license này). *"theo dõi và giới hạn việc dùng license"* → **License Manager**.

---

## 11. Cost optimization workflow

Tối ưu cost không phải việc làm một lần, vì tải và giá đều thay đổi. Một nhịp review thường thấy:

### 11.1 Weekly review
- Cost Explorer: xu hướng chi phí so với tuần trước, tìm chỗ tăng bất thường.
- Compute Optimizer: đề xuất right-sizing mới (§5.1).
- Savings Plan: **utilization** có trên 95% không (không mua thừa), **coverage** có trên ~70% baseline không (không bỏ sót phần đáng lẽ được giảm giá). Hai chỉ số này định nghĩa ở §3.1.

### 11.2 Monthly review
- Trusted Advisor cost check: instance idle, EBS volume không gắn vào đâu, Elastic IP không dùng.
- Top 10 service theo chi phí.
- Dọn resource không có tag (không biết của ai thì không ai chịu trách nhiệm tắt).

### 11.3 Quarterly review
- Đàm phán lại **Enterprise Discount Program (EDP)** — hợp đồng riêng giữa công ty và AWS: cam kết tổng chi tiêu nhiều năm để nhận một mức giảm trên toàn bộ bill. Chỉ dành cho khách chi tiêu lớn; ngoài phạm vi đề SAA.
- Chỉnh mức cam kết Savings Plan: mua thêm nếu coverage thấp; để SP cũ hết hạn mà không gia hạn nếu utilization thấp.
- Review kiến trúc: workload nào nên chuyển sang serverless, container, Graviton.

---

## 12. Ví dụ tối ưu cho 3 use case

### 12.1 SaaS web app, 80% traffic predictable
- Baseline 70% → Compute Savings Plan 3-year. Phần này chạy suốt nên cam kết không bị bỏ phí.
- Burst 30% → On-demand. Phần này lúc có lúc không; cam kết cho nó thì utilization thấp.
- Async worker → Spot. Job lấy từ queue, mất máy thì message quay lại queue.
- Dev/staging → scheduled scale-down + Spot.
- Graviton cho Java tier (JVM có bản ARM, không phải sửa code).
- Lambda cho image processing (spiky, EC2 sẽ ngồi không phần lớn thời gian).

### 12.2 CI/CD farm
- 100% Spot. CI job chạy lại được nên bị ngắt chỉ mất vài phút.
- Karpenter trên EKS chọn instance vừa với từng build job.
- Cache dependency trên S3 để máy mới không phải tải lại từ đầu.

### 12.3 ML training pipeline
- **EC2 Spot** dòng GPU (P, G) hoặc Trainium (Trn), lưu **checkpoint** ra S3 định kỳ. Bị ngắt thì máy mới nạp checkpoint gần nhất và chạy tiếp, không train lại từ đầu.
- **SageMaker managed spot training**: SageMaker tự xin Spot, tự chờ và resume từ checkpoint khi bị ngắt.
- Khai nhiều AZ và nhiều instance type để có nhiều pool. (Từ "bid" trong tài liệu cũ là di sản của mô hình đấu giá trước 2017 — xem §4.5.)

---

## 13. Cạm bẫy đề thi (SAA)

1. **"Reserved Instance = best discount"** → **Sai**, Spot tới 90% > RI 72%. Tùy workload: Spot chỉ dùng được khi chịu được ngắt.
2. **"Compute Savings Plan chỉ cho EC2"** → **Sai**, cover Lambda + Fargate + EC2.
3. **"Spot phù hợp DB primary"** → **Sai**. DB primary giữ state và không chịu được việc mất máy sau 2 phút báo trước.
4. **"Auto Scaling tự giảm cost"** → **Đúng một phần**. Scale-down phải có policy đúng (cooldown, instance protection). Predictive scaling còn không tự scale in (§9.1).
5. **"Graviton compatible mọi app"** → **Sai**. Phải có bản ARM của code và mọi dependency native (§6.2).
6. **"Provisioned concurrency giảm cost"** → **Sai**, tăng cost vì trả tiền cả lúc không có request. Nó giảm latency cold start.
7. **"Lambda free tier vô tận"** → **Sai**, 1M req + 400k GB-s free/tháng.
8. **"Right-sizing là one-time"** → **Sai**, tải thay đổi → review định kỳ.

---

## 14. Tóm tắt 1 dòng

> **Right-size + Savings Plan + Spot + Graviton** = 50-70% cut compute bill. Free wins trước: Compute Optimizer, scheduled scale-down dev, Graviton migration. Commit Savings Plan conservative, layer Spot trên top.

Thứ tự có lý do: right-size trước rồi mới cam kết, nếu không sẽ cam kết 3 năm cho những cái máy to hơn mức cần.

---

## 15. Bài tập tự kiểm tra

1. Fleet 20 instance m5.4xlarge chạy 24/7 ở us-east-1 (~$11,2k/tháng on-demand). Cost Explorer cho thấy CPU avg 25%. Bạn làm gì trước? Quantify expected saving?
2. Lambda function memory 256MB, duration 5s, 10M req/tháng. Tăng memory 1024MB còn duration 1s. Tổng cost thay đổi thế nào?
3. So sánh Compute SP vs EC2 Instance SP cho team đang chạy m5/m6i/m7g lung tung. Chọn cái nào & vì sao?
4. CI/CD chạy 1000 build/ngày, mỗi build 10 phút, cần c5.4xlarge. Design compute strategy?
5. Production có 24/7 baseline 30 instance, peak 100 lúc business hour. Layered purchase plan?
6. Team Java migrate sang Graviton. Checklist 5 thứ test trước production rollout?

Gợi ý chỗ học cách làm: bài 1 → §5; bài 2 → phép tính GB-second ở §7.1; bài 3 → §3.2; bài 4 → §4 (giá on-demand `c5.4xlarge` us-east-1 ~$0,68/giờ); bài 5 → §3.1 và §9.3; bài 6 → §6.

---

## 16. Đọc thêm

- AWS Whitepaper — *AWS Well-Architected Cost Optimization Pillar*.
- AWS Builder's Library — *Cost Optimization*.
- *Lambda Power Tuning* tool (Alex Casalboni).
- AWS docs — *Savings Plans*, *EC2 Spot best practices*.

---

**Bài tiếp theo**: [[ch4-02-storage-cost]] — S3 tier, lifecycle, EBS optimization, snapshot cost.
