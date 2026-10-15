# Bài 16 — Networking Advanced (VPC, TGW, PrivateLink, Hybrid)

## 1. Mục tiêu
- Thiết kế VPC enterprise: multi-account hub-spoke với TGW.
- Hiểu PrivateLink, VPC Endpoint Gateway vs Interface.
- Hybrid connectivity: VPN, Direct Connect, Cloud WAN.
- Tránh cost trap (NAT GW, cross-AZ, Interface Endpoint).

Vài từ dùng suốt bài, nói trước một lần:

- **Route table** là bảng chỉ đường gắn vào subnet: mỗi dòng nói "gói tin tới dải IP này thì đưa cho cổng kia". Gói tin nào không khớp dòng nào thì bị bỏ.
- **ENI** (Elastic Network Interface) là một card mạng ảo nằm trong subnet, có private IP riêng. EC2 có ENI, và nhiều dịch vụ managed (NAT Gateway, Interface Endpoint, Lambda trong VPC) cũng "thò" vào VPC của bạn bằng một ENI.
- **IGW** (Internet Gateway) là cổng nối VPC với Internet. Subnet có route `0.0.0.0/0 → IGW` gọi là **public subnet**; không có thì là **private subnet**.
- **BGP** là giao thức để hai router tự báo cho nhau "tôi tới được những dải IP nào". Nhờ nó route được cập nhật tự động khi một đường chết, không ai phải sửa tay.

---

## 2. VPC review + advanced

### 2.1 CIDR planning

**CIDR là gì.** Ký hiệu `10.30.0.0/16` nghĩa là một dải IP trong đó 16 bit đầu cố định, phần còn lại tự do. Số sau dấu `/` càng nhỏ thì dải càng rộng:

```
/16 → 2^(32-16) = 65.536 địa chỉ
/20 → 2^(32-20) =  4.096 địa chỉ
/24 → 2^(32-24) =    256 địa chỉ
/28 → 2^(32-28) =     16 địa chỉ   (nhỏ nhất AWS cho phép; lớn nhất là /16)
```

**Vì sao phải lên kế hoạch.** Hai mạng muốn nối với nhau (peering, TGW, VPN, Direct Connect) thì **dải IP không được trùng**. Nếu VPC A và VPC B cùng là `10.0.0.0/16`, router không biết gói tin gửi tới `10.0.1.5` thuộc bên nào. CIDR chính của VPC gần như không đổi được sau khi tạo, nên chọn sai là phải dựng lại VPC. Vì vậy phải tránh trùng với on-prem, với các VPC khác và với cloud khác ngay từ đầu.

**Một quy ước đánh số dễ nhớ.** Lấy octet thứ hai để mã hoá "môi trường + region", mỗi VPC một `/16`:

| | Singapore (+1) | US (+2) |
|--|----------------|---------|
| **dev** (10) | `10.11.0.0/16` | `10.12.0.0/16` |
| **prod** (30) | `10.31.0.0/16` | `10.32.0.0/16` |

Nhìn `10.31.4.17` là biết ngay đây là prod ở Singapore, và không có hai VPC nào trùng dải.

**Chọn cỡ nào.** Một VPC prod chạy EC2 thông thường thì `/20` (4.096 IP) là đủ. EKS thì khác: với plugin mạng mặc định (VPC CNI), **mỗi pod được cấp một IP thật của VPC** (pod là đơn vị chạy container nhỏ nhất của Kubernetes), chứ không dùng chung IP của node. Một cụm 200 node, mỗi node 30 pod đã ngốn khoảng 6.000 IP, vượt cả một `/20`. Vì vậy VPC chạy EKS (kể cả EKS Fargate, mỗi pod một ENI) nên lấy hẳn `/16` cho dư.

**5 IP bị AWS giữ trong mỗi subnet.** Với subnet `10.31.0.0/24`:

| IP | AWS giữ để làm gì |
|----|-------------------|
| `.0` | Địa chỉ mạng |
| `.1` | VPC router |
| `.2` | DNS của VPC |
| `.3` | Dự phòng cho tương lai |
| `.255` | Broadcast (VPC không hỗ trợ broadcast nhưng vẫn giữ) |

```
/24 → 256 − 5 = 251 IP dùng được
/28 →  16 − 5 =  11 IP dùng được
```

> Bẫy thi: *"subnet /28 chứa được bao nhiêu instance?"* → **11**, không phải 16 hay 14.

### 2.2 Subnet pattern

Chia subnet theo vai trò, mỗi vai trò một cỡ khác nhau tuỳ số IP nó cần:

```
Public (ALB, NAT)         /24
Private app (EC2/EKS)     /22 (rộng cho pod)
Private data (RDS, Cache) /24
Private mgmt (jumpbox)    /28
```

Subnet là **zonal** (nằm trọn trong một AZ), nên bộ bốn subnet này phải lặp lại ở mỗi AZ. Chỉ lớp public có route ra IGW. Lớp app rộng nhất (`/22` = 1.019 IP dùng được) vì đó là nơi pod và instance scale ra. Lớp data và mgmt không bao giờ có đường ra Internet trực tiếp.

### 2.3 NAT Gateway deep

**Nó là gì.** Instance trong private subnet chỉ có private IP (`10.x.x.x`), mà private IP không đi được trên Internet. **NAT Gateway** là thiết bị managed đứng giữa: nó nhận gói tin từ instance, **đổi địa chỉ nguồn thành public IP của chính nó** (một Elastic IP) rồi gửi ra Internet, và nhớ lại để chuyển gói trả lời về đúng instance. NAT là viết tắt của Network Address Translation, tức "dịch địa chỉ".

Điểm quan trọng: NAT chỉ cho **chiều đi ra**. Instance chủ động gọi ra ngoài được (tải package, gọi API bên thứ ba), nhưng từ Internet không ai mở kết nối vào instance được, vì bên ngoài chỉ thấy IP của NAT Gateway.

**Nó nằm ở đâu.** NAT Gateway đặt trong **public subnet** (nó cần đường ra IGW). Route table của **private subnet** trỏ `0.0.0.0/0` về nó:

```
EC2 (private subnet)  →  NAT GW (public subnet)  →  IGW  →  Internet
route: 0.0.0.0/0 → nat-xxxx          route: 0.0.0.0/0 → igw-xxxx
```

**AZ-specific.** Mỗi NAT Gateway sống trong đúng một AZ (AWS tự dự phòng bên trong AZ đó). Nếu ba AZ dùng chung một NAT Gateway ở AZ-A và AZ-A sập, instance ở AZ-B và AZ-C vẫn chạy nhưng mất đường ra Internet. Muốn HA thì đặt **mỗi AZ một NAT Gateway**, và route table của private subnet AZ nào trỏ về NAT Gateway của AZ đó.

**Băng thông.** Một NAT Gateway bắt đầu ở 5 Gbps và tự nới lên tới 100 Gbps, bạn không phải chọn size.

**Vì sao gọi là cost trap #1.** Giá (us-east-1): **~$0,045/giờ** cho việc tồn tại, cộng **~$0,045 cho mỗi GB đi qua nó** (tính cả hai chiều, và tính cả khi đích là dịch vụ AWS cùng region như S3). Tính thử một tháng 730 giờ:

```
Phí cố định:   730 giờ × $0,045            = $32,85 / NAT GW
1 TB qua NAT:  1.000 GB × $0,045           = $45,00
→ 1 NAT GW chuyển 1 TB/tháng               ≈ $77,85

HA 3 AZ (chưa có byte nào):  3 × $32,85    = $98,55 / tháng
App đẩy 10 TB log lên S3 qua NAT:  10.000 GB × $0,045 = $450 / tháng
```

Dòng cuối là cái bẫy: $450/tháng chỉ để chuyển dữ liệu **tới một dịch vụ AWS nằm ngay cùng region**. Cùng 10 TB đó đi qua S3 Gateway Endpoint (§3.1) thì phí xử lý là **$0**.

**Các cách giảm tiền:**
- **VPC Endpoint Gateway** cho S3 và DynamoDB: miễn phí, traffic không đi qua NAT nữa.
- **Interface Endpoint** cho các dịch vụ AWS gọi nhiều (ECR, SSM, Secrets Manager…): ~$0,01/GB thay vì ~$0,045/GB.
- **Một NAT Gateway dùng chung cho 3 AZ**: tiết kiệm ~$65,70/tháng phí cố định, đổi lại chấp nhận rủi ro mất egress cả ba AZ khi AZ chứa NAT sập (và trả thêm phí cross-AZ cho traffic từ hai AZ kia). Hợp với dev/test, không hợp với prod.

### 2.4 IPv6

**Vì sao IPv6 không cần NAT.** IPv4 thiếu địa chỉ nên mới phải chia "private IP bên trong, public IP bên ngoài" và dùng NAT để dịch qua lại. IPv6 có dư địa chỉ, nên trong VPC **mọi địa chỉ IPv6 đều là địa chỉ public, định tuyến được trên Internet**. Không có gì để dịch.

**Nhưng vậy thì private subnet còn "private" không?** Đây là chỗ cần **Egress-only Internet Gateway**. Với IPv4, NAT Gateway vô tình làm hai việc: dịch địa chỉ *và* chặn kết nối từ ngoài vào. IPv6 bỏ phần dịch thì mất luôn phần chặn. Egress-only IGW bù lại đúng phần đó: nó cho instance IPv6 **mở kết nối ra ngoài** và nhận gói trả lời, nhưng **từ chối mọi kết nối do bên ngoài khởi tạo**. Nó là "NAT Gateway của IPv6" về mặt hành vi, chỉ không dịch địa chỉ, và không tính phí theo giờ.

| | IPv4 private subnet | IPv6 private subnet |
|--|---------------------|---------------------|
| Ra Internet qua | NAT Gateway (trong public subnet) | Egress-only IGW |
| Có dịch địa chỉ | Có | Không |
| Bên ngoài chủ động kết nối vào | Không được | Không được |

Thêm ba ý:
- **Dual-stack**: VPC và subnet chạy song song cả IPv4 lẫn IPv6; instance có cả hai loại địa chỉ.
- NAT Gateway không làm NAT cho IPv6-sang-IPv6. Nó chỉ có NAT64: cho workload chỉ-có-IPv6 gọi tới đích IPv4.
- **Public IPv4 tính phí $0,005/giờ mỗi địa chỉ** từ 1/2/2024, kể cả đang dùng hay để không (~$3,65/tháng/địa chỉ). Địa chỉ IPv6 thì miễn phí, đó là một lý do kinh tế để chuyển dần sang IPv6.

> Bẫy thi: *"instance IPv6 trong private subnet cần tải bản vá từ Internet, không cho Internet kết nối vào"* → **Egress-only Internet Gateway**. Đáp án "NAT Gateway" là mồi nhử.

---

## 3. VPC Endpoints

**Bài toán chung.** S3, DynamoDB, SQS, ECR… đều có endpoint công khai (ví dụ `s3.us-east-1.amazonaws.com` trả về public IP). Instance trong private subnet muốn gọi chúng thì mặc định phải đi vòng qua NAT Gateway, vừa tốn ~$0,045/GB vừa buộc subnet phải có đường ra Internet. **VPC Endpoint** là lối đi riêng từ VPC tới dịch vụ AWS mà không cần IGW hay NAT.

Có hai loại, và chúng khác nhau ở **cách bẻ lái gói tin**: một loại sửa route table, một loại sửa câu trả lời DNS.

### 3.1 Gateway Endpoint

**Cơ chế: thêm một dòng vào route table.** Khi tạo Gateway Endpoint, bạn chọn các route table muốn áp dụng. AWS tự thêm vào đó một route có đích là **prefix list** (danh sách các dải public IP của S3 hoặc DynamoDB trong region, do AWS quản lý) và target là endpoint:

```
Destination        Target
10.31.0.0/16       local
pl-xxxxxxxx (S3)   vpce-1a2b3c     ← dòng AWS tự thêm
0.0.0.0/0          nat-xxxx
```

Ứng dụng không đổi gì cả: nó vẫn phân giải `s3.us-east-1.amazonaws.com` ra public IP như cũ. Nhưng khi gói tin tới route table, dòng prefix list **cụ thể hơn** dòng `0.0.0.0/0` nên thắng, và gói tin được đưa thẳng vào mạng nội bộ AWS tới S3 thay vì qua NAT.

**Đặc điểm suy ra từ cơ chế đó:**
- Chỉ có cho **S3 và DynamoDB**.
- **Miễn phí** (không phí giờ, không phí GB).
- Không tạo ENI, không chiếm IP nào trong subnet.
- Vì nó chỉ là một dòng trong route table của VPC, **chỉ tài nguyên bên trong VPC đó dùng được**. On-prem đi qua VPN/Direct Connect, hay VPC khác qua peering, không dùng nhờ được.
- Gắn được **endpoint policy** để giới hạn principal/resource nào được đi qua (§3.4).

### 3.2 Interface Endpoint (PrivateLink)

**Cơ chế: đặt một ENI vào subnet và đổi câu trả lời DNS.** Khi tạo Interface Endpoint cho một dịch vụ (ví dụ SQS), AWS đặt vào mỗi subnet bạn chọn **một ENI có private IP** (thường mỗi AZ một cái). ENI đó là đầu vào của một đường hầm riêng tới dịch vụ; công nghệ bên dưới tên là **PrivateLink**.

Bật tuỳ chọn *private DNS* thì trong VPC, tên `sqs.us-east-1.amazonaws.com` **phân giải ra private IP của ENI** thay vì public IP:

```
Không có endpoint:  sqs.us-east-1.amazonaws.com → public IP   (public) → phải qua NAT
Có Interface EP:    sqs.us-east-1.amazonaws.com → 10.31.4.25  (ENI)    → đi trong VPC
```

Ứng dụng vẫn không sửa dòng code nào; nó chỉ nhận được một IP khác.

**Đặc điểm suy ra từ cơ chế đó:**
- Có cho **hầu hết dịch vụ AWS** và cả dịch vụ của bên thứ ba (SaaS).
- Vì là một IP thật trong VPC, **mọi thứ route được tới VPC đều dùng được**: on-prem qua Direct Connect/VPN, VPC khác qua peering/TGW.
- ENI gắn được **security group**, nên kiểm soát được ai gọi tới endpoint.
- **Có phí**: ~$0,01/giờ cho **mỗi ENI (mỗi AZ)** + ~$0,01/GB xử lý.

```
1 endpoint × 3 AZ:   3 × 730 giờ × $0,01   = $21,90 / tháng
5 dịch vụ × 3 AZ:    5 × $21,90            = $109,50 / tháng  (chưa tính GB)
1 TB qua endpoint:   1.000 GB × $0,01      = $10     (qua NAT GW là $45)
```

Phép tính cho thấy vì sao **không bật Interface Endpoint cho mọi dịch vụ**: mỗi cái là ~$22/tháng phí nền. Chỉ đáng khi dịch vụ đó có lưu lượng lớn, hoặc khi subnet bắt buộc không được có đường ra Internet.

**VPC Endpoint Service (phía publisher).** PrivateLink không chỉ dành cho dịch vụ của AWS. Bạn đặt service của mình sau một **NLB**, đăng ký NLB đó thành *VPC Endpoint Service*, và VPC khác (kể cả account khác) tạo Interface Endpoint trỏ tới. Chi tiết ở §3.3.

**Đặt hai loại cạnh nhau:**

| | **Gateway Endpoint** | **Interface Endpoint** |
|--|----------------------|------------------------|
| Bẻ lái bằng | Route table (prefix list) | DNS trả private IP của ENI |
| Dịch vụ | Chỉ S3, DynamoDB | Hầu hết dịch vụ AWS + SaaS |
| Tạo ENI trong subnet | Không | Có, mỗi AZ một cái |
| Giá | Miễn phí | ~$0,01/giờ/AZ + ~$0,01/GB |
| Dùng được từ on-prem / VPC khác | Không | Có |
| Kiểm soát truy cập | Endpoint policy | Endpoint policy + security group |

> Bẫy thi: *"private subnet truy cập S3, rẻ nhất"* → **Gateway Endpoint**. *"on-prem qua Direct Connect truy cập S3 bằng private IP"* → **Interface Endpoint cho S3** (Gateway Endpoint không dùng được từ ngoài VPC). *"truy cập SQS/ECR/Secrets Manager không qua Internet"* → **Interface Endpoint** (Gateway không hỗ trợ các dịch vụ này).

### 3.3 PrivateLink pattern

```
[Provider VPC]                     [Consumer VPC]
  NLB ─→ EC2/ECS                     Endpoint (ENI)
   │                                   │
   └─ VPC Endpoint Service ←───────────┘
        (whitelist consumer accounts)
```

Use case: SaaS provider expose service không qua Internet.

Điểm khác với peering: PrivateLink chỉ mở **đúng một service theo một chiều** (consumer gọi tới provider), không nối hai mạng với nhau. Vì vậy hai VPC **trùng CIDR vẫn dùng được**, và provider không nhìn thấy gì khác trong VPC của khách.

### 3.4 Endpoint policy
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": { "aws:PrincipalAccount": "${aws:ResourceAccount}" }
    }
  }]
}
```

→ Endpoint chỉ cho phép access bucket cùng account → chống exfiltration.

---

## 4. VPC Peering

**Nó là gì.** Một kết nối riêng giữa **đúng hai VPC**, để tài nguyên hai bên gọi nhau bằng private IP như thể chung một mạng. Traffic đi trên mạng nội bộ AWS, không qua Internet, không có thiết bị trung gian nào để thành nút cổ chai.

**Không transitive (không bắc cầu), và vì sao.** Giả sử có ba VPC, peering A–B và B–C:

```
A ──peering── B ──peering── C

A → B : được
B → C : được
A → C : KHÔNG được, dù cả hai đều nối với B
```

Lý do: một kết nối peering chỉ chuyển gói tin có **nguồn và đích nằm trong chính hai VPC đó**. Gói từ A gửi tới IP của C đi vào B thì B không chuyển tiếp hộ; nó không phải router. Muốn A nói chuyện với C thì phải tạo thêm peering A–C. Cũng vì lý do này mà A không "đi nhờ" được NAT Gateway, IGW hay VPN của B.

Hệ quả là muốn mọi VPC gọi được nhau thì phải nối **từng cặp** (full mesh):

```
Số kết nối full mesh = n × (n − 1) ÷ 2

 5 VPC →  5 × 4 ÷ 2  =  10 peering
10 VPC → 10 × 9 ÷ 2  =  45 peering
30 VPC → 30 × 29 ÷ 2 = 435 peering
```

Mỗi peering lại kéo theo việc **tự thêm route ở cả hai phía** (peering không tự cập nhật route table). 435 kết nối nghĩa là hàng trăm dòng route phải giữ cho đúng bằng tay.

**Các tính chất còn lại:**
- Nối được cùng region hoặc khác region, cùng account hoặc khác account.
- Hai VPC **không được trùng CIDR**.
- Bản thân kết nối peering không tính phí. Traffic trong cùng AZ miễn phí; traffic qua AZ khác tính ~$0,01/GB mỗi chiều; khác region tính phí data transfer liên region.
- Hạn mức: mặc định **50** peering đang hoạt động trên một VPC, xin tăng được tới **125**.

→ Dùng cho **2-5 VPC**. Hơn thì → TGW.

---

## 5. Transit Gateway (TGW)

### 5.1 Đặc điểm

**Nó là gì.** Một **router trung tâm do AWS quản lý**. Thay vì nối từng cặp VPC, mỗi VPC nối một lần vào TGW, và TGW chuyển tiếp gói tin giữa chúng. Mô hình này gọi là **hub-and-spoke**: TGW là trục (hub), các VPC và mạng on-prem là nan hoa (spoke). Khác với peering, TGW **có** bắc cầu: A và C cùng nối vào TGW là gọi được nhau.

```
30 VPC, peering full mesh:  435 kết nối
30 VPC, qua TGW:             30 attachment
```

- Một TGW nhận tới **5.000 attachment** (mặc định, xin tăng được), gồm cả VPC, VPN và Direct Connect.
- TGW là tài nguyên **theo region**. Nối TGW của hai region bằng **TGW Peering**.
- Giá (us-east-1): ~$0,05/giờ cho **mỗi attachment** + ~$0,02 cho mỗi GB đi qua.

```
30 VPC:  30 attachment × 730 giờ × $0,05 = $1.095 / tháng   (chưa tính GB)
1 TB qua TGW:  1.000 GB × $0,02          = $20
```

Đó là cái giá của sự gọn: peering cùng region gần như miễn phí, còn TGW trả tiền theo cả giờ lẫn GB.

### 5.2 Components

- **TGW**: bản thân cái hub.
- **Attachment**: một "dây cắm" nối một thứ gì đó vào TGW. Các loại: VPC, VPN, Direct Connect (qua DX Gateway), TGW peering, và Connect (dành cho thiết bị SD-WAN).
- **TGW Route Table**: bảng chỉ đường **của riêng TGW**, khác với route table của subnet. Một TGW có thể có nhiều bảng, và đó là công cụ để cô lập traffic (ví dụ prod gọi được shared services nhưng không gọi được dev).

Hai thao tác trên route table hay bị lẫn với nhau:

| | **Association** | **Propagation** |
|--|-----------------|-----------------|
| Trả lời câu hỏi | Gói tin **đi vào** từ attachment này thì **tra bảng nào**? | Dải IP của attachment này được **ghi vào những bảng nào**? |
| Số lượng | Mỗi attachment gắn với **đúng một** bảng | Một attachment propagate được vào **nhiều** bảng |
| Hình dung | "Tôi dùng bản đồ nào" | "Tôi có mặt trên những bản đồ nào" |

Ví dụ: attachment của `prod-vpc` **associate** với `prod-rt`, nên gói tin từ prod đi vào TGW sẽ tra `prod-rt`. Nếu `shared-vpc` **propagate** vào `prod-rt` thì trong bảng đó có dòng "dải IP của shared → attachment shared", và prod tới được shared. Nếu `dev-vpc` **không** propagate vào `prod-rt` thì prod không có đường nào tới dev: gói tin bị bỏ.

Propagation là tự động: gắn VPC vào thì CIDR của nó tự xuất hiện trong các bảng được chọn; với VPN/DX thì các route học qua BGP tự xuất hiện. Không muốn tự động thì thêm static route bằng tay.

### 5.3 Segmentation pattern
```
TGW Route Tables:
- prod-rt:     prod-vpc, shared-services
- dev-rt:      dev-vpc, shared-services
- shared-rt:   shared-vpc, prod-vpc, dev-vpc
```

→ prod ↔ shared OK, dev ↔ shared OK, prod ↮ dev (isolation).

### 5.4 TGW vs VPC Peering

Sau khi hiểu cơ chế của cả hai, bảng dưới đây chỉ là tóm tắt:

| | Peering | TGW |
|--|---------|-----|
| Topology | Mesh | Hub-spoke |
| Transitive | ✗ | ✓ |
| Scale | < 5 VPC | 1000s |
| Cost | Free (same region) | Per attachment + GB |
| Latency | Lower | Higher (qua hub) |
| Cross-account | ✓ | ✓ (qua RAM share) |

Hai dòng cần lời giải thích. **Latency**: peering là đường thẳng giữa hai VPC, còn TGW thêm một chặng trung gian nên chậm hơn một chút. **Cross-account**: peering thì account kia bấm chấp nhận lời mời; TGW thì account chủ dùng **AWS RAM** (Resource Access Manager, dịch vụ chia sẻ tài nguyên giữa các account) để chia sẻ TGW, rồi account khác gắn VPC của họ vào.

> Bẫy thi: *"hai VPC, lưu lượng lớn, chi phí thấp nhất"* → **Peering**. *"hàng chục VPC + on-prem, quản lý tập trung, cần bắc cầu"* → **TGW**.

### 5.5 Cloud WAN (2022)

Khi mạng trải nhiều region, bạn phải tự dựng một TGW ở mỗi region, tự peering chúng với nhau và tự giữ cho các route table khớp nhau. **Cloud WAN** làm việc đó thay bạn:

- Là dịch vụ WAN managed cho mạng toàn cầu, nhiều region, nhiều account.
- **Policy-based (khai báo)**: bạn viết một tài liệu policy mô tả "có những segment nào (prod, dev…), segment nào ở region nào, segment nào được nói chuyện với nhau", thay vì cấu hình từng route table.
- Từ policy đó AWS tự dựng phần hạ tầng tương đương TGW ở mỗi region, tự peering và tự chia segment.
- Use case: enterprise có mặt ở trên 5 region.

---

## 6. Hybrid connectivity

"Hybrid" là nối mạng on-prem (data center, văn phòng) với VPC. Có hai con đường: **đi nhờ Internet và mã hoá** (VPN), hoặc **kéo một đường dây riêng** (Direct Connect). Hai thuật ngữ gặp trong cả hai:

- **VGW (Virtual Private Gateway)**: cổng phía AWS, gắn vào **một** VPC, là nơi VPN hoặc Direct Connect cập bến.
- **CGW (Customer Gateway)**: router hoặc firewall phía on-prem của bạn.

### 6.1 Site-to-Site VPN

**Nó là gì.** Một đường hầm mã hoá **IPsec** chạy **trên Internet công cộng**, nối router on-prem (CGW) với VGW hoặc TGW. IPsec là bộ giao thức mã hoá và xác thực từng gói IP, nên dù đi qua Internet, người ở giữa không đọc được nội dung.

- Mỗi VPN connection có **2 tunnel**, kết thúc ở hai AZ khác nhau phía AWS. Một tunnel chết (hoặc AWS bảo trì) thì còn tunnel kia.
- Băng thông: **tối đa 1,25 Gbps mỗi tunnel**. Đây là con số đề thi dùng. Docs hiện có thêm loại "large bandwidth tunnel" tới 5 Gbps. Muốn nhiều hơn một tunnel thì gắn VPN vào **TGW** và bật ECMP (chia tải đều trên nhiều tunnel); VGW không hỗ trợ ECMP.
- Dựng xong trong **vài phút tới vài giờ**, vì chỉ là cấu hình, không cần kéo dây.
- Điểm yếu: chạy trên Internet nên **độ trễ và băng thông thực tế không ổn định**, phụ thuộc nhà mạng ở giữa.
- Vai trò hay gặp trong đề: **backup cho Direct Connect**.

### 6.2 Client VPN

Site-to-Site nối **cả một mạng** với VPC. **Client VPN** nối **từng máy tính cá nhân**: nhân viên làm từ xa mở phần mềm VPN trên laptop và vào được VPC.

- Là dịch vụ managed, dựa trên **OpenVPN**, nên dùng được mọi client tương thích OpenVPN.
- Ba cách xác thực người dùng: **Active Directory**; **SAML** (chuẩn đăng nhập một lần, dùng lại tài khoản công ty qua Okta, Entra ID…); và **mutual TLS** (mỗi máy có một chứng chỉ riêng, hai bên kiểm chứng chỉ của nhau).

### 6.3 Direct Connect (DX)

**Nó là gì.** Một **đường cáp quang riêng** giữa router của bạn và router của AWS, đặt tại một **Direct Connect location** (một data center trung lập của Equinix, Megaport, AT&T…). Traffic không đi qua Internet, nên băng thông và độ trễ **ổn định, đoán trước được**. Đó là thứ VPN không cho được.

**Hai cách mua:**

| | **Dedicated connection** | **Hosted connection** |
|--|--------------------------|------------------------|
| Là gì | Một cổng vật lý của riêng bạn trên router AWS | Một phần dung lượng trên đường của partner |
| Tốc độ | **1, 10, 100 Gbps** (docs hiện có thêm 400 Gbps) | 50 Mbps → 25 Gbps |
| Đặt qua | AWS console, rồi tự thuê đấu nối chéo tại location | Partner làm hộ |

**Setup mất vài tuần tới vài tháng**, vì có khâu vật lý: đấu cáp tại location và thuê đường truyền từ văn phòng tới location. Đề thi nói "cần kết nối trong vài ngày" là loại DX, chọn VPN.

**Không mã hoá mặc định.** Đường dây là riêng (không ai khác dùng chung) nhưng dữ liệu chạy trên đó ở dạng thường. "Private" không có nghĩa là "encrypted". Cần mã hoá thì có hai cách:
- **MACsec**: mã hoá ở tầng 2 (tầng Ethernet), ngay trên chặng cáp giữa router của bạn và router AWS. Chỉ có trên **dedicated connection 10 Gbps trở lên** (10/100/400 Gbps), không có trên hosted connection. Không tính thêm phí.
- **VPN chạy trên DX** (§6.4): mã hoá IPsec đầu-cuối, dùng được với mọi tốc độ nhưng bị giới hạn bởi băng thông tunnel.

**VIF (Virtual Interface) — chia một sợi cáp thành nhiều kênh.** Một connection vật lý chưa dùng được ngay. Bạn phải tạo trên nó một hay nhiều **VIF**: mỗi VIF là một **VLAN** (một kênh logic, đánh dấu bằng một nhãn số trên gói tin) kèm **một phiên BGP riêng** để hai bên trao đổi route. Loại VIF quyết định đầu bên AWS của kênh đó dẫn tới đâu:

| VIF | Dẫn tới | Dùng địa chỉ | Kịch bản |
|-----|---------|--------------|----------|
| **Private VIF** | **Một VPC** (qua VGW), hoặc nhiều VPC qua DX Gateway | Private IP | Server on-prem gọi RDS, EC2 trong VPC bằng `10.x.x.x` |
| **Public VIF** | **Mọi dịch vụ public của AWS** (S3, DynamoDB, API endpoint…) ở mọi region | Public IP | Job backup on-prem đẩy hàng chục TB lên S3 qua đường riêng thay vì Internet |
| **Transit VIF** | **Transit Gateway** (qua DX Gateway) | Private IP | Công ty có 40 VPC sau một TGW; một kênh là tới được tất cả |

Chú ý Public VIF **không** cho bạn vào VPC. Nó chỉ thay đường Internet bằng đường riêng để tới các endpoint công khai của AWS.

**DX Gateway.** Private VIF cắm thẳng vào VGW thì chỉ tới được **một VPC ở một region**. **Direct Connect Gateway** là một tài nguyên toàn cầu đứng giữa: VIF cắm vào DX Gateway, rồi DX Gateway nối ra nhiều VGW hoặc nhiều TGW, **ở nhiều region và nhiều account**. Nhờ vậy một đường DX ở Singapore tới được cả VPC ở Tokyo và Frankfurt.

```
On-prem ── DX connection ── Private VIF ── DX Gateway ──┬── VGW (VPC Singapore)
                                                        ├── VGW (VPC Tokyo)
                                                        └── VGW (VPC Frankfurt)
```

**Độ sẵn sàng.** Một đường cáp là một điểm chết. SLA của AWS phản ánh đúng điều đó:

| Cấu hình | Cam kết uptime | Tương đương downtime cho phép |
|----------|----------------|-------------------------------|
| Nhiều location, mỗi location nhiều đường (multi-site redundant) | **99,99%** | ~4,4 phút/tháng |
| Nhiều location, mỗi location một đường (multi-site non-redundant) | **99,9%** | ~44 phút/tháng |
| **Một connection đơn lẻ** | **95%** | ~36,5 giờ/tháng |

Vì vậy hệ thống quan trọng luôn cần **hai đường DX ở hai location khác nhau**, hoặc tối thiểu **một DX + VPN backup**.

> Bẫy thi: *"băng thông ổn định, độ trễ nhất quán, lưu lượng lớn"* → **Direct Connect**. *"cần ngay, rẻ, chấp nhận Internet"* → **VPN**. *"DX phải được mã hoá"* → **MACsec** (nếu là dedicated 10/100 Gbps) hoặc **VPN over DX**. *"một DX, nhiều VPC nhiều region"* → **DX Gateway**. *"DX tới TGW"* → **Transit VIF**.

### 6.4 DX + VPN

Hai dịch vụ này bù cho nhau theo hai cách khác hẳn, đừng lẫn:

- **VPN làm backup cho DX.** Ngày thường dữ liệu chạy trên DX. Một Site-to-Site VPN qua Internet nối cùng on-prem đó với cùng VGW/TGW, để sẵn. Cả hai đường đều quảng bá route bằng BGP, và AWS **ưu tiên route học từ DX hơn route học từ VPN** khi hai route cùng đích. Khi DX đứt, phiên BGP của nó mất, route DX bị rút, chỉ còn route VPN nên traffic tự chuyển sang VPN mà không ai phải can thiệp. Cái giá: băng thông tụt về mức VPN (1,25 Gbps/tunnel) cho tới khi DX phục hồi.
- **VPN chạy bên trên DX để mã hoá (compliance).** Ở đây VPN không đi qua Internet. Tunnel IPsec được dựng **trên chính đường DX**, nên vừa có sự ổn định của đường riêng vừa có mã hoá đầu-cuối.

### 6.5 Global Accelerator

**Bài toán.** User ở Việt Nam gọi một app đặt ở `us-east-1`. Trên Internet công cộng, gói tin nhảy qua nhiều nhà mạng, mỗi nhà mạng chọn đường theo lợi ích chi phí của họ chứ không theo tốc độ. Kết quả là độ trễ cao và lúc nhanh lúc chậm.

**Cơ chế.** Global Accelerator cấp cho bạn **2 địa chỉ IPv4 tĩnh** (dual-stack thì thêm 2 IPv6). Hai IP đó được quảng bá bằng **anycast**: *cùng một địa chỉ IP* được công bố đồng thời từ rất nhiều **edge location** của AWS trên khắp thế giới, và cơ chế định tuyến của Internet tự đưa mỗi user tới điểm công bố gần họ nhất. Từ edge location đó, gói tin đi nốt quãng đường tới region **trên mạng cáp riêng của AWS (backbone)**.

```
Không có GA:  User VN ──── Internet công cộng, nhiều nhà mạng ────→ us-east-1
Có GA:        User VN ─→ edge gần nhất ═══ AWS backbone ═══→ us-east-1
              (chặng Internet ngắn)   (mạng riêng, AWS tự tối ưu đường đi)
```

Nhanh và ổn định hơn vì phần lớn quãng đường nằm trên mạng do một bên duy nhất vận hành, không tắc nghẽn theo giờ, không phụ thuộc thoả thuận giữa các nhà mạng.

**Các tính chất:**
- Hoạt động ở **Layer 4**: chuyển tiếp TCP/UDP, không hiểu HTTP và không cache gì.
- Endpoint phía sau có thể là ALB, NLB, EC2 hoặc Elastic IP, ở một hay nhiều region.
- **Tự failover giữa các region**: GA liên tục kiểm tra sức khoẻ endpoint và chuyển traffic sang region khoẻ. IP không đổi nên **không phải chờ DNS cache hết hạn** như khi failover bằng Route 53.
- Use case: app TCP/UDP toàn cầu (game, IoT, VoIP), và hệ thống legacy hoặc firewall của khách hàng cần **whitelist IP tĩnh**.

So với CloudFront, cả hai đều dùng edge location của AWS nhưng làm việc khác nhau. CloudFront là **cache**: nó giữ bản sao nội dung ở edge và trả luôn cho user. Global Accelerator là **đường tắt**: nó không giữ gì, chỉ đưa gói tin tới origin nhanh hơn.

| | CloudFront | Global Accelerator |
|--|-----------|---------------------|
| Layer | 7 (HTTP/HTTPS) | 4 (TCP/UDP) |
| Cache | ✓ | ✗ |
| Static IP | ✗ | ✓ (2 anycast) |
| Use case | Web cache static + dynamic | Global TCP/UDP |
| Pricing | Per GB egress + req | $0.025/h + per GB |

Phí cố định của một accelerator là ~$18,25/tháng (730 giờ × $0,025), cộng phí "Data Transfer-Premium" theo GB, tuỳ cặp region–edge.

> Bẫy thi: *"static IP"*, *"UDP"*, *"game / VoIP"*, *"failover nhanh không phụ thuộc DNS"* → **Global Accelerator**. *"cache nội dung"*, *"HTTP"*, *"giảm tải origin"* → **CloudFront**.

---

## 7. Route 53 advanced

Route 53 là dịch vụ DNS của AWS: nó trả lời câu hỏi "tên miền này ứng với IP nào". Điều cần nhớ xuyên suốt: Route 53 **chỉ trả lời câu hỏi DNS, nó không chuyển tiếp traffic**. Mọi kiểu "routing" dưới đây thực chất là *chọn trả về IP nào* cho mỗi câu hỏi.

### 7.1 Routing policies (recap, đi sâu cho SAA)

Có **8 routing policy** (tài liệu cũ đếm 7 vì chưa có IP-based). Ví dụ chung: `app.example.com` có server ở Singapore và ở Virginia.

**Simple.** Một record, trả về đúng những gì bạn khai. Không gắn được health check. Dùng khi chỉ có một tài nguyên.

**Weighted.** Mỗi record có một trọng số; Route 53 trả lời theo tỉ lệ. Hai record trọng số 90 và 10 thì khoảng 90% câu hỏi nhận IP thứ nhất, 10% nhận IP thứ hai. Dùng cho A/B testing và canary (đưa 10% user sang bản mới trước).

**Latency.** Route 53 trả về region có **độ trễ mạng thấp nhất tính từ vị trí của user**, dựa trên số liệu đo độ trễ mà AWS thu thập liên tục giữa các vùng mạng và các region. User ở Hà Nội nhận IP Singapore. Lưu ý: "độ trễ thấp nhất" thường là region gần nhất nhưng không phải lúc nào cũng vậy.

**Failover.** Hai record, một **primary** và một **secondary**, gắn health check. Primary khoẻ thì luôn trả primary; primary chết thì trả secondary. Đây là active-passive.

**Geolocation.** Trả lời theo **vị trí địa lý của user** (châu lục, quốc gia, hoặc bang của Mỹ). Mục đích không phải tốc độ mà là **quy định và nội dung**: user ở Đức phải vào server ở EU vì luật dữ liệu; user ở Nhật thấy bản tiếng Nhật. Nên có một record *default* cho những nơi không khớp luật nào, nếu không các user đó nhận câu trả lời rỗng.

**Geoproximity.** Trả về tài nguyên **gần user nhất tính theo khoảng cách địa lý**, và cho phép bạn "kéo" hoặc "đẩy" ranh giới bằng một con số gọi là **bias**, từ −99 tới +99. Route 53 không dùng khoảng cách thật mà dùng khoảng cách đã chỉnh:

```
Khoảng cách tính toán = khoảng cách thật × (1 − bias ÷ 100)

User cách server A 150 km, cách server B 100 km.
Không bias:   A = 150, B = 100              → chọn B (gần hơn)
A có bias +50: A = 150 × (1 − 0,5) = 75 km  → chọn A (75 < 100)
```

Bias dương làm tài nguyên "trông gần hơn", tức vùng phủ của nó **nở ra** và hút thêm traffic. Bias âm thì ngược lại. Dùng khi muốn dồn bớt tải từ một region đang quá tải sang region bên cạnh mà vẫn giữ nguyên tắc "gần thì ưu tiên".

**Multi-value.** Trả về **tối đa 8 record khoẻ mạnh**, chọn ngẫu nhiên; client tự thử một cái. Mỗi record gắn health check riêng nên IP chết bị loại khỏi câu trả lời. Đây là "load balancer của người nghèo": chia tải thô ở tầng DNS, không thay được ELB.

**IP-based** (mới). Bạn khai sẵn các dải CIDR của user và ánh xạ mỗi dải tới một endpoint. Dùng khi bạn biết rõ user đến từ mạng nào, ví dụ đưa khách của một ISP cụ thể tới endpoint tối ưu cho ISP đó.

**Ba cái hay bị lẫn:**

| | Quyết định dựa trên | Mục đích |
|--|---------------------|----------|
| **Latency** | Độ trễ mạng đo được | Nhanh nhất cho user |
| **Geolocation** | User đang ở nước/châu lục nào | Tuân thủ luật, nội dung theo vùng |
| **Geoproximity** | Khoảng cách địa lý + bias | Gần nhất, có thể chỉnh tay để dồn tải |

### 7.2 Health Checks

Các policy trên chỉ có ích nếu Route 53 biết endpoint nào còn sống. Có ba loại health check:

- **Endpoint check.** Các máy kiểm tra (health checker) của Route 53 đặt ở nhiều region trên thế giới gửi request HTTP, HTTPS hoặc TCP tới endpoint của bạn. Vì chúng nằm **bên ngoài VPC của bạn**, endpoint phải có **public IP** và security group phải cho phép dải IP của health checker.
- **Calculated check.** Một health check "cha" gộp kết quả của nhiều health check "con" theo logic AND, OR, hoặc "ít nhất X trong Y cái khoẻ". Ví dụ: coi app là khoẻ khi ít nhất 2 trong 3 web server khoẻ.
- **CloudWatch alarm check.** Health check theo trạng thái của một CloudWatch alarm. Đây là cách kiểm tra **tài nguyên private** (RDS trong private subnet, hàng đợi quá dài…) mà health checker bên ngoài không với tới được.

**Bao lâu thì phát hiện lỗi?** Hai tham số quyết định:

- **Request interval**: **30 giây (standard, mặc định)** hoặc **10 giây (fast, tính thêm phí)**.
- **Failure threshold**: số lần liên tiếp phải fail (hoặc pass) thì mới đổi trạng thái. Mặc định **3**, chỉnh được từ 1 tới 10.

```
Standard:  30 giây × 3 lần fail = ~90 giây mới coi là unhealthy
Fast:      10 giây × 3 lần fail = ~30 giây
```

Cộng thêm thời gian **TTL của record** (thời gian resolver của user được phép giữ câu trả lời cũ trong cache) thì mới ra thời gian failover thực tế. TTL 60 giây và check standard nghĩa là có user còn bị trỏ vào server chết tới ~2,5 phút. Đây chính là điểm Global Accelerator (§6.5) làm tốt hơn.

### 7.3 Hybrid DNS

Bài toán: server trong VPC và server on-prem cần phân giải được tên miền nội bộ của nhau.

- **Private Hosted Zone (PHZ)**: một vùng DNS chỉ trả lời cho các VPC được gắn vào. Ví dụ `db.internal.acme.com` chỉ phân giải được từ bên trong VPC; từ Internet hỏi thì không có.
- **Route 53 Resolver** là DNS server mặc định của VPC (địa chỉ `.2` ở §2.1). Vấn đề: nó **chỉ nghe được từ bên trong VPC**, on-prem không hỏi nó trực tiếp được. Hai loại endpoint dưới đây mở đường theo hai chiều:
  - **Resolver Inbound Endpoint** — chiều **on-prem hỏi AWS**. Nó tạo các ENI có private IP trong VPC; DNS server on-prem được cấu hình *forward* các câu hỏi về `*.aws.internal` tới những IP đó (đi qua VPN/DX).
  - **Resolver Outbound Endpoint** — chiều **AWS hỏi on-prem**. Kèm các *forwarding rule* kiểu "mọi tên `*.corp.acme.com` thì chuyển câu hỏi tới DNS server on-prem tại `192.168.1.10`".
- **DNS Firewall**: lọc các câu hỏi DNS đi ra từ VPC theo danh sách tên miền, chặn domain độc hại. Nó chặn được kiểu tuồn dữ liệu ra ngoài qua DNS, thứ mà security group không nhìn thấy.

Mẹo nhớ chiều: **Inbound = câu hỏi đi VÀO AWS**, **Outbound = câu hỏi đi RA khỏi AWS**.

### 7.4 Domain registration
- Route 53 cũng là **registrar** (nơi mua tên miền): khoảng $12–$50/năm tuỳ đuôi (TLD).
- Hỗ trợ auto-renew và chuyển tên miền từ registrar khác về.
- Mua tên miền (registrar) và phân giải tên miền (hosted zone) là hai việc tách rời: mua ở nơi khác vẫn dùng Route 53 làm DNS được, và ngược lại.

---

## 8. Tự kiểm tra

1. 30 VPC cần kết nối full-mesh. Peering hay TGW?
   <details><summary>Đáp án</summary>**TGW** — full mesh bằng peering cần n×(n−1)÷2 kết nối (30 VPC = 435 peering), TGW chỉ 30 attachment.</details>

2. App private subnet cần access S3 không trả phí NAT data. Setup?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** — free, route table entry.</details>

3. Expose SaaS service tới customer VPC mà không qua Internet?
   <details><summary>Đáp án</summary>**PrivateLink + VPC Endpoint Service** — NLB phía bạn, endpoint phía customer.</details>

4. Hybrid app cần private connection, throughput 5 Gbps stable, latency ổn định. VPN hay DX?
   <details><summary>Đáp án</summary>**Direct Connect** (10 Gbps port). VPN chạy trên Internet nên không ổn định, và theo con số đề thi chỉ 1,25 Gbps/tunnel. DX không encrypt mặc định nên + VPN over DX (hoặc MACsec) nếu compliance.</details>

5. Global TCP game app cần static IP + low latency toàn cầu?
   <details><summary>Đáp án</summary>**Global Accelerator** — 2 anycast IP, AWS backbone routing. CloudFront không phải L4.</details>

6. EC2 private subnet không có route Internet, cần download package từ S3?
   <details><summary>Đáp án</summary>**S3 Gateway Endpoint** (free). Hoặc NAT GW (đắt).</details>

7. TGW segmentation: prod ↔ shared OK, prod ↮ dev. Setup?
   <details><summary>Đáp án</summary>**Multiple TGW Route Tables** — prod-rt và dev-rt riêng, cùng có route → shared, nhưng không có route lẫn nhau.</details>

8. DX bị down. Auto failover sang VPN không?
   <details><summary>Đáp án</summary>**Có** nếu set up đúng — cả DX và VPN cùng quảng bá route bằng BGP; AWS ưu tiên route DX, nên khi phiên BGP của DX mất và route bị rút thì route VPN được dùng. Việc này diễn ra ở tầng định tuyến, không cần Route 53 failover.</details>

9. On-prem cần resolve `api.internal.aws.acme.com` (Private Hosted Zone). Setup?
   <details><summary>Đáp án</summary>**Route 53 Resolver Inbound Endpoint** — IP trong VPC, on-prem DNS forward query đến đó.</details>

10. App cần latency-routing 5 region, mỗi region có ALB. Setup?
    <details><summary>Đáp án</summary>**Route 53 Latency routing policy** — 5 records, mỗi cái trỏ ALB region đó. Plus health check + failover backup.</details>

---

## 9. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| VPC regional | VPC **global** |
| Subnet zonal | Subnet **regional** |
| NAT Gateway | Cloud NAT |
| TGW | **Network Connectivity Center** |
| VPC Peering | VPC Peering (non-transitive both) |
| Gateway Endpoint S3/DDB | **Private Google Access** (free) |
| Interface Endpoint | **Private Service Connect** |
| PrivateLink service | **PSC published service** |
| Site-to-Site VPN | Cloud VPN (HA, Classic) |
| Direct Connect | Cloud Interconnect (Dedicated/Partner) |
| Global Accelerator | (không có direct) — Global LB anycast |
| Route 53 | Cloud DNS |
| Route 53 Resolver Inbound | Cloud DNS Inbound Forwarding |
| Cloud WAN | Network Connectivity Center |

**Bẫy:**
1. **GCP VPC global** — 1 VPC trải mọi region, không cần peering/TGW intra-VPC. AWS phải VPC mỗi region + peer.
2. **GCP Private Google Access** free, AWS Gateway Endpoint S3/DDB free nhưng Interface Endpoint có phí.
3. **GCP Cloud Interconnect Partner** giống AWS DX Partner. **Dedicated** cũng giống.
4. **Anycast Global LB** GCP built-in. AWS phải kết hợp Global Accelerator + ALB.

---

## 10. Lưu ý SAA

- **Gateway Endpoint** free (S3/DDB). **Interface Endpoint** có phí.
- **PrivateLink** = expose service qua VPC Endpoint Service.
- **TGW** cho > 5 VPC, **Peering** cho 2-5.
- **Cloud WAN** cho enterprise > 5 region.
- **DX + VPN backup** SLA mission-critical.
- **DX Gateway** 1 DX nhiều VPC nhiều region.
- **Global Accelerator** L4, static IP, anycast.
- **CloudFront** L7, cache.
- **Route 53 8 routing policies** (tài liệu cũ ghi 7, chưa tính IP-based).
- **Resolver Inbound/Outbound** hybrid DNS.
- **Egress-only IGW** IPv6 outbound private.
- **NAT GW per AZ** HA.

## 11. Lưu ý đi làm

### Cost optimization
- **VPC Endpoint Gateway** S3/DDB → save NAT data fee.
- **Interface Endpoint** chỉ cho service hay dùng (ECR, SSM, Secrets...).
- **Cross-AZ traffic** ($0.01/GB) — đặt service cùng AZ, ASG balance.
- **IPv4 public** $0.005/h từ 2024 — release EIP idle, dùng IPv6 nếu được.
- **1 NAT GW 3 AZ** chấp nhận risk thay 3 NAT GW.

### Security
- **VPC Flow Logs** prod + S3 + Athena query.
- **GuardDuty** dùng VPC Flow + DNS.
- **DNS Firewall** block malicious domain.
- **Network Firewall** L3-7 firewall managed (deep packet inspection).
- **VPC Endpoint Policy** + `aws:SourceVpce` chống exfiltration.

### Architecture
- **Landing zone** với Control Tower → mỗi account có VPC chuẩn template.
- **Shared services account** (Route53 PHZ, AD, monitoring) qua TGW.
- **RAM share** subnet/TGW cross-account.

### Anti-pattern
- ✗ Full mesh peering > 5 VPC → TGW.
- ✗ NAT GW serve S3 traffic → Gateway Endpoint.
- ✗ Single NAT GW cho 3 AZ → AZ-A down = mất egress AZ-A,B,C.
- ✗ DX không backup VPN → SLA của một connection đơn lẻ chỉ 95%, không đủ.
- ✗ VPC CIDR overlap → cannot peer/TGW future.
- ✗ Public RDS với SG `0.0.0.0/0`.

## 12. Foundations
- [[foundations-06-failure-modes]] — network partition là chủ đề CAP.

## 13. Flashcard

- **VPC** regional, **Subnet** zonal, reserve 5 IP.
- **Gateway Endpoint** S3+DDB, free.
- **Interface Endpoint** PrivateLink, $/h + $/GB.
- **VPC Endpoint Service** = publisher PrivateLink via NLB.
- **Peering** 1-1, non-transitive, no CIDR overlap.
- **TGW** hub-spoke 1000s VPC, $0.05/h/attachment.
- **TGW Route Table** segmentation.
- **Cloud WAN** policy-based global network.
- **DX** private fiber, GBps, không encrypt mặc định, + VPN backup.
- **DX Gateway** 1 DX nhiều VPC region.
- **Public/Private/Transit VIF**.
- **MACsec** DX L2 encrypt.
- **VPN** IPsec qua Internet.
- **Global Accelerator** L4 anycast static IP.
- **CloudFront** L7 cache.
- **Route 53** 8 policies + health check + alias.
- **PHZ** private DNS in VPC.
- **Resolver Endpoint** hybrid DNS.
- **DNS Firewall** block domain.
- **NAT GW** per AZ, $0.045/h + GB.
- **Egress-only IGW** IPv6.
- **IPv4 public** $0.005/h 2024+.
