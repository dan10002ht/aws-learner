# Bài 1 — Cloud Concepts & AWS Global Infrastructure

## 1. Mục tiêu
Sau bài này bạn có thể:
- Định nghĩa cloud computing và 6 lợi thế của nó.
- Phân biệt IaaS / PaaS / SaaS.
- Phân biệt Public / Private / Hybrid / Multi-cloud.
- Vẽ được quan hệ Region ↔ AZ ↔ Edge Location.

## 2. Lý thuyết

### 2.1 Cloud computing là gì?
Là việc **thuê tài nguyên IT (compute, storage, network, database…) qua Internet, trả theo mức dùng (pay-as-you-go)**, thay vì tự mua server bỏ vào phòng máy.

### 2.2 6 lợi thế của cloud (AWS hay hỏi nguyên văn)
1. **Trade capital expense (CapEx) for variable expense (OpEx)** — không phải mua máy trước, trả theo dùng.
2. **Benefit from massive economies of scale** — AWS mua chung nên rẻ hơn bạn tự mua.
3. **Stop guessing capacity** — scale up/down theo nhu cầu thực.
4. **Increase speed and agility** — provision tài nguyên trong phút, không phải tuần/tháng.
5. **Stop spending money running and maintaining data centers** — AWS lo hạ tầng vật lý.
6. **Go global in minutes** — deploy ra nhiều Region trên thế giới chỉ vài click.

### 2.3 Mô hình dịch vụ
| Model | AWS quản lý | Bạn quản lý | Ví dụ |
|-------|-------------|-------------|-------|
| **IaaS** | Hạ tầng ảo hoá, network, storage | OS, runtime, app, data | **EC2**, EBS |
| **PaaS** | + OS, runtime, middleware | Chỉ app + data | **Elastic Beanstalk**, RDS, Lambda (*) |
| **SaaS** | Tất cả | Chỉ cấu hình sử dụng | **WorkMail**, Chime, QuickSight |

(*) Lambda thường được xếp là FaaS/Serverless, một dạng PaaS.

### 2.4 Deployment models
- **Public cloud** — AWS, Azure, GCP. Đa người dùng, Internet.
- **Private cloud** — on-prem hoặc VMware Cloud on AWS, riêng 1 tổ chức.
- **Hybrid** — kết hợp, ví dụ data nhạy cảm on-prem + web app trên AWS, nối bằng **Direct Connect / VPN**.
- **Multi-cloud** — dùng nhiều cloud provider song song (AWS + Azure).

### 2.5 AWS Global Infrastructure
- **Region** — 1 vùng địa lý (ví dụ `ap-southeast-1` Singapore). Mỗi region độc lập về data (trừ khi bạn replicate).
- **Availability Zone (AZ)** — 1 hoặc nhiều data center trong 1 region, cách nhau vài chục km, nối bằng fiber low-latency. Mỗi region thường có **≥ 3 AZ**.
- **Edge Location (PoP)** — nhiều hơn AZ, dùng cho CloudFront, Route 53, Global Accelerator — cache content gần user.
- **Local Zone** — mini-region gần thành phố lớn (ví dụ Los Angeles), cho workload cần latency cực thấp.
- **Wavelength Zone** — nhúng compute vào mạng 5G của telco.
- **Outposts** — AWS rack đặt tại văn phòng bạn, chạy giống AWS nhưng on-prem.

**Quy tắc chọn Region:**
1. **Compliance** (data phải ở nước nào?).
2. **Latency** tới user.
3. **Giá** (us-east-1 thường rẻ nhất).
4. **Service availability** (không phải region nào cũng có đủ mọi service).

## 3. Hands-on có account
1. Đăng ký tại https://aws.amazon.com/free/.
2. Vào IAM → bật **MFA** cho root user (Google Authenticator).
3. Vào **Billing** → **Budgets** → tạo budget $1 alert qua email.
4. Mở console, ở góc trên phải đổi region giữa `ap-southeast-1`, `us-east-1` → xem danh sách service thay đổi.

## 4. Hands-on không tốn tiền
- Mở https://aws.amazon.com/about-aws/global-infrastructure/, click các Region. Ghi chú region nào **chưa** có service `Bedrock` hoặc `Local Zones`.
- Vẽ (Excalidraw) sơ đồ: 1 Region chứa 3 AZ, mỗi AZ 2 data center, bên ngoài region có 5 Edge Location. Thêm mũi tên từ user → Edge Location → AZ.

## 5. Tự kiểm tra
1. Công ty muốn giảm CapEx và không phải tự bảo trì server — thuộc lợi thế nào của cloud?
2. Bạn thuê 1 EC2 instance — đây là IaaS, PaaS hay SaaS?
3. Một region có tối thiểu bao nhiêu AZ (theo thiết kế khuyến nghị của AWS)?
4. Edge Location khác AZ chỗ nào?
5. Khách hàng có data bắt buộc ở Đức — bạn chọn Region nào? (gợi ý: `eu-central-1` Frankfurt).

## 6. Đối chiếu GCP
- **AWS Region** ≈ **GCP Region** (ví dụ `asia-southeast1` Singapore ≈ `ap-southeast-1`).
- **AWS Availability Zone** ≈ **GCP Zone** (`asia-southeast1-a`).
- **AWS Edge Location** ≈ **GCP PoP / Cloud CDN edge**.
- **AWS Local Zone** ≈ **GCP không có equivalent trực tiếp** (gần nhất: Edge network).
- **AWS Outposts** ≈ **Google Distributed Cloud (Edge)** / **Anthos on-prem**.
- Khác biệt cốt lõi: **AWS VPC là regional, subnet là zonal**. GCP VPC **global**, subnet **regional**. Đây là bẫy #1 cho người từ GCP qua AWS.

## 7. Flashcard
- **Region** — vùng địa lý, độc lập về data.
- **AZ** — 1+ datacenter trong region, nối fiber low-latency.
- **Edge Location** — điểm cache CDN toàn cầu.
- **IaaS** — thuê máy ảo (EC2).
- **PaaS** — thuê platform (Beanstalk, RDS).
- **SaaS** — thuê phần mềm (WorkMail).
- **CapEx → OpEx** — đổi chi phí cố định thành biến đổi.
