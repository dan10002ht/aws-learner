import type { Question } from "@/lib/types";
import { generatedQuestions } from "./generatedQuestions";
import { generatedKnowledge } from "./generatedKnowledge";

const curatedQuestions: Question[] = [
  // ============================================================
  // LESSON 01: CLOUD CONCEPTS
  // ============================================================
  {
    id: "clf-01-001",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Đâu là lợi ích chính của việc chuyển từ CapEx (capital expenditure) sang OpEx (operational expenditure) khi dùng AWS?",
    options: [
      "Trả phí cố định hàng tháng giống thuê server vật lý",
      "Trả tiền theo mức sử dụng, không cần đầu tư hạ tầng trước",
      "AWS sẽ mua hardware giúp khách hàng",
      "Giảm tổng chi phí xuống còn 0",
    ],
    correctIndices: [1],
    explanation:
      "Cloud chuyển CapEx → OpEx: thay vì bỏ tiền lớn ban đầu (CapEx) để mua server, datacenter, khách hàng trả theo lượng dùng thực tế hàng tháng (OpEx). Đây là một trong 6 lợi ích của cloud (Trade fixed expense for variable expense). Đáp án A sai vì pricing không cố định — nó scale theo usage. C/D sai về bản chất.",
  },
  {
    id: "clf-01-002",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Mô hình dịch vụ nào cho phép khách hàng kiểm soát nhiều nhất về OS, networking, và storage?",
    options: ["SaaS", "PaaS", "IaaS", "FaaS"],
    correctIndices: [2],
    explanation:
      "IaaS (Infrastructure as a Service) — ví dụ EC2 — cho phép control mức thấp nhất: chọn OS, cấu hình network, quản lý storage. PaaS (Elastic Beanstalk) ẩn OS đi, chỉ deploy code. SaaS (Gmail, Salesforce) là app hoàn chỉnh, không control gì về hạ tầng. FaaS (Lambda) là serverless, chỉ viết function.",
  },
  {
    id: "clf-01-003",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "multi",
    question: "Chọn các mô hình deployment của cloud (deployment models):",
    options: ["Public Cloud", "Private Cloud", "Hybrid Cloud", "Modular Cloud"],
    correctIndices: [0, 1, 2],
    explanation:
      "3 deployment models chính là Public (AWS, GCP, Azure), Private (on-premise cloud — vd VMware), và Hybrid (kết hợp cả hai, vd dùng AWS Outposts hoặc VPN tới datacenter). 'Modular Cloud' không tồn tại — đây là distractor thường gặp trong đề.",
  },
  {
    id: "clf-01-004",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Công ty cần chạy ứng dụng có lượng người dùng tăng/giảm rất bất thường theo giờ. Tính năng cloud nào hữu ích nhất?",
    options: [
      "High availability",
      "Elasticity",
      "Fault tolerance",
      "Durability",
    ],
    correctIndices: [1],
    explanation:
      "Elasticity = tự động scale up/down theo demand. Khác với scalability (chỉ scale up khi cần lớn hơn), elasticity scale CẢ HAI chiều. HA = luôn online (dù có hỏng). Fault tolerance = chịu được lỗi mà vẫn hoạt động bình thường. Durability = không mất dữ liệu (vd S3 11x9).",
  },
  {
    id: "clf-01-005",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Đâu KHÔNG phải là một trong 6 lợi ích của Cloud Computing theo AWS?",
    options: [
      "Trade fixed expense for variable expense",
      "Benefit from massive economies of scale",
      "Stop guessing about capacity",
      "Tự động viết code cho khách hàng",
    ],
    correctIndices: [3],
    explanation:
      "6 lợi ích chính thức: (1) Trade fixed for variable expense, (2) Benefit from massive economies of scale, (3) Stop guessing capacity, (4) Increase speed & agility, (5) Stop spending money on running datacenters, (6) Go global in minutes. AWS không viết code thay khách hàng.",
  },
  {
    id: "clf-01-006",
    courseId: "CLF-C02",
    lesson: "01-cloud-concepts",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Một startup muốn deploy app ra nhiều quốc gia nhanh nhất có thể. Lợi ích cloud nào liên quan trực tiếp nhất?",
    options: [
      "Economies of scale",
      "Go global in minutes",
      "Stop guessing capacity",
      "Pay-as-you-go",
    ],
    correctIndices: [1],
    explanation:
      "'Go global in minutes' — AWS có 30+ Region trên toàn thế giới, deploy tới Region khác chỉ vài click. Các lợi ích khác đều quan trọng nhưng không nói tới việc mở rộng địa lý.",
  },

  // ============================================================
  // LESSON 02: SHARED RESPONSIBILITY
  // ============================================================
  {
    id: "clf-02-001",
    courseId: "CLF-C02",
    lesson: "02-shared-responsibility",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Trong Shared Responsibility Model, ai chịu trách nhiệm bảo mật vật lý của datacenter?",
    options: ["Khách hàng (customer)", "AWS", "Cả hai cùng chịu", "Bên thứ ba độc lập"],
    correctIndices: [1],
    explanation:
      "AWS chịu trách nhiệm 'security OF the cloud' — bao gồm phần cứng, datacenter, network vật lý, hypervisor. Khách hàng chịu trách nhiệm 'security IN the cloud' — data, IAM, OS patching (với EC2), application security.",
  },
  {
    id: "clf-02-002",
    courseId: "CLF-C02",
    lesson: "02-shared-responsibility",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "multi",
    question: "Đâu là trách nhiệm của KHÁCH HÀNG khi dùng EC2?",
    options: [
      "Vá lỗi (patch) OS guest",
      "Bảo mật vật lý datacenter",
      "Cấu hình security group",
      "Quản lý hypervisor",
    ],
    correctIndices: [0, 2],
    explanation:
      "Với EC2 (IaaS), khách hàng tự patch OS, cấu hình firewall/SG, quản lý application, mã hóa data. AWS chịu trách nhiệm phần cứng và hypervisor. Đây là điểm khác biệt với managed services (vd RDS) — RDS thì AWS patch OS giúp.",
  },
  {
    id: "clf-02-003",
    courseId: "CLF-C02",
    lesson: "02-shared-responsibility",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Khi dùng Amazon RDS, ai sẽ chịu trách nhiệm patch OS của database server?",
    options: ["Khách hàng", "AWS", "Cả hai chia đôi", "Tùy vào instance type"],
    correctIndices: [1],
    explanation:
      "RDS là managed service — AWS quản lý OS, patching, backup tự động, monitoring hạ tầng. Khách hàng vẫn chịu trách nhiệm DB users, schema, data, network access (security groups, VPC). Đây là điểm khác EC2 (khách phải tự patch OS).",
  },
  {
    id: "clf-02-004",
    courseId: "CLF-C02",
    lesson: "02-shared-responsibility",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Customer data trong S3 thuộc trách nhiệm của ai?",
    options: ["AWS — vì data nằm trong AWS", "Khách hàng — phải tự classify, encrypt, control access", "Không ai cả", "AWS Support"],
    correctIndices: [1],
    explanation:
      "Data LUÔN LUÔN là trách nhiệm của khách hàng, kể cả khi để trên S3. Khách hàng phải classify (PII? Internal?), bật encryption, set bucket policy, IAM permissions. AWS chỉ đảm bảo hạ tầng S3 chạy đúng.",
  },
  {
    id: "clf-02-005",
    courseId: "CLF-C02",
    lesson: "02-shared-responsibility",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "multi",
    question: "Chọn các phát biểu ĐÚNG về Shared Responsibility Model:",
    options: [
      "Trách nhiệm khác nhau tùy theo service (IaaS/PaaS/SaaS)",
      "AWS luôn chịu trách nhiệm cho IAM users và policies của khách hàng",
      "Với Lambda, AWS quản lý OS và runtime, khách hàng chỉ chịu code và data",
      "Encryption-at-rest luôn do AWS bật mặc định cho tất cả service",
    ],
    correctIndices: [0, 2],
    explanation:
      "A đúng — trách nhiệm 'dịch chuyển' khi đi từ IaaS (khách lo nhiều) → PaaS → SaaS (AWS lo nhiều). C đúng — Lambda là serverless, AWS quản OS/runtime/scaling. B sai — IAM là trách nhiệm khách hàng. D sai — encryption không tự bật mặc định cho mọi service (vd S3 default encryption mới bật từ 2023 nhưng EBS volumes phải opt-in).",
  },

  // ============================================================
  // LESSON 03: IAM
  // ============================================================
  {
    id: "clf-03-001",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Best practice nào sau đây liên quan đến root account của AWS?",
    options: [
      "Dùng root account hàng ngày để quản lý",
      "Lock root, bật MFA, chỉ dùng cho tác vụ đặc biệt",
      "Chia sẻ password root cho cả team",
      "Tạo access key cho root để dùng AWS CLI",
    ],
    correctIndices: [1],
    explanation:
      "Best practice: KHÔNG dùng root account hàng ngày. Bật MFA cho root, không tạo access key cho root, tạo IAM user admin riêng để dùng. Root chỉ dùng cho các tác vụ ÉP BUỘC phải root như đóng tài khoản, thay đổi billing info.",
  },
  {
    id: "clf-03-002",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Một ứng dụng chạy trên EC2 cần đọc file từ S3. Cách AN TOÀN NHẤT để cấp quyền là gì?",
    options: [
      "Lưu access key của IAM user vào file config trên EC2",
      "Hard-code access key trong source code",
      "Gán IAM Role cho EC2 instance",
      "Mở public bucket cho EC2",
    ],
    correctIndices: [2],
    explanation:
      "IAM Role gán cho EC2 là cách an toàn nhất — AWS tự rotate credentials, không lộ access key. A/B sai vì lưu key cứng = rủi ro leak. D sai vì mở public bucket là thảm họa bảo mật. Câu hỏi này gần như chắc chắn xuất hiện trong CLF/SAA.",
  },
  {
    id: "clf-03-003",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02", "SAA-C03"],
    difficulty: "medium",
    type: "single",
    question: "IAM Policy được viết bằng định dạng gì?",
    options: ["XML", "YAML", "JSON", "Plain text"],
    correctIndices: [2],
    explanation:
      "IAM Policy là JSON document có cấu trúc: Version, Statement (Effect: Allow/Deny, Action, Resource, Condition). Đây là kiến thức nền tảng và xuất hiện rất thường xuyên.",
  },
  {
    id: "clf-03-004",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "MFA (Multi-Factor Authentication) trong AWS hoạt động dựa trên những yếu tố gì?",
    options: [
      "Chỉ password",
      "Password + thiết bị/token mà bạn sở hữu",
      "Chỉ vân tay",
      "Email confirmation duy nhất",
    ],
    correctIndices: [1],
    explanation:
      "MFA = 'thứ bạn biết' (password) + 'thứ bạn có' (token, app như Authy/Google Authenticator, hardware key như YubiKey). Đây gọi là two-factor. AWS hỗ trợ Virtual MFA, U2F, Hardware MFA.",
  },
  {
    id: "clf-03-005",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "multi",
    question: "Phát biểu nào ĐÚNG về IAM?",
    options: [
      "IAM là dịch vụ global, không thuộc Region cụ thể",
      "IAM User có thể được gán nhiều policy",
      "IAM Group có thể chứa Group khác (nested groups)",
      "IAM Role có temporary credentials, không có password vĩnh viễn",
    ],
    correctIndices: [0, 1, 3],
    explanation:
      "A đúng — IAM là global service. B đúng — user có thể có nhiều policy attach trực tiếp hoặc qua group. D đúng — role dùng STS tạm thời. C SAI — IAM Group KHÔNG nested (group chứa user, không chứa group). Đây là bẫy thường gặp.",
  },
  {
    id: "clf-03-006",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "single",
    question: "Một IAM user có 2 policy: Policy A cho phép s3:GetObject, Policy B từ chối s3:GetObject. Khi user gọi GetObject, kết quả là gì?",
    options: [
      "Allow — Allow thắng Deny",
      "Deny — explicit Deny luôn thắng",
      "Phụ thuộc vào thứ tự attach policy",
      "Yêu cầu MFA bổ sung",
    ],
    correctIndices: [1],
    explanation:
      "Quy tắc IAM evaluation: (1) Mặc định deny, (2) Explicit Allow ghi đè default deny, (3) Explicit Deny LUÔN ghi đè mọi Allow. Cho nên Deny sẽ thắng. Đây là kiến thức rất hay hỏi.",
  },
  {
    id: "clf-03-007",
    courseId: "CLF-C02",
    lesson: "03-iam",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Principle of Least Privilege nghĩa là gì?",
    options: [
      "Cấp quyền AdministratorAccess cho mọi user để đơn giản",
      "Chỉ cấp quyền tối thiểu cần thiết để hoàn thành công việc",
      "Không cấp bất kỳ quyền nào",
      "Cấp quyền theo cảm tính của admin",
    ],
    correctIndices: [1],
    explanation:
      "Least Privilege = chỉ cấp đúng quyền cần thiết, không hơn. Vd: app chỉ đọc S3 thì chỉ cấp s3:GetObject, không cấp s3:* hay AdministratorAccess. Đây là nguyên tắc bảo mật cốt lõi của AWS Well-Architected Framework.",
  },

  // ============================================================
  // LESSON 04: EC2
  // ============================================================
  {
    id: "clf-04-001",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "EC2 viết tắt của cụm từ nào?",
    options: [
      "Elastic Compute Cloud",
      "Enterprise Cloud Computing",
      "Easy Cloud Connect",
      "Elastic Container Cloud",
    ],
    correctIndices: [0],
    explanation:
      "EC2 = Elastic Compute Cloud — dịch vụ virtual machine của AWS. 'Elastic' nhấn mạnh khả năng scale up/down nhanh chóng.",
  },
  {
    id: "clf-04-002",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Workload chạy ổn định 24/7 trong 3 năm. Pricing model nào TIẾT KIỆM nhất?",
    options: ["On-Demand", "Spot Instances", "Reserved Instances (3-year, all upfront)", "Dedicated Host"],
    correctIndices: [2],
    explanation:
      "Reserved Instances 3-year all-upfront giảm tới ~72% so với On-Demand cho workload steady, predictable. Spot rẻ hơn nhưng có thể bị reclaim bất kỳ lúc nào → không phù hợp 24/7 critical. On-Demand đắt nhất. Savings Plans cũng là lựa chọn tương tự RI nhưng linh hoạt hơn.",
  },
  {
    id: "clf-04-003",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Workload chạy phân tích batch, có thể bị gián đoạn và retry. Pricing nào rẻ nhất?",
    options: ["On-Demand", "Reserved Instances", "Spot Instances", "Savings Plans"],
    correctIndices: [2],
    explanation:
      "Spot Instances giảm tới 90% so với On-Demand nhưng có thể bị AWS reclaim với thông báo 2 phút trước. Phù hợp batch processing, big data, CI/CD, render farms — workload chịu được gián đoạn.",
  },
  {
    id: "clf-04-004",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Security Group hoạt động ở tầng nào?",
    options: ["Instance level (như firewall của VM)", "Subnet level", "VPC level", "Account level"],
    correctIndices: [0],
    explanation:
      "Security Group = firewall ở instance level (ENI). NACL (Network ACL) mới là firewall ở subnet level. SG stateful (return traffic tự cho qua), NACL stateless. Đây là sự khác biệt rất hay hỏi.",
  },
  {
    id: "clf-04-005",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "multi",
    question: "Phát biểu nào ĐÚNG về EBS (Elastic Block Store)?",
    options: [
      "EBS volume gắn được vào nhiều EC2 cùng lúc (mặc định)",
      "EBS volume nằm trong cùng AZ với EC2 instance",
      "EBS snapshot có thể được copy sang Region khác",
      "EBS volume tự động bị xóa khi terminate EC2 (mặc định cho root volume)",
    ],
    correctIndices: [1, 2, 3],
    explanation:
      "B đúng — EBS bị bound vào 1 AZ, muốn dùng AZ khác phải qua snapshot. C đúng — snapshot copy cross-region để DR. D đúng — root EBS mặc định 'Delete on Termination = true'. A SAI — EBS gp2/gp3 chỉ attach 1 instance; chỉ EBS Multi-Attach (io1/io2) mới hỗ trợ nhiều instance.",
  },
  {
    id: "clf-04-006",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "AMI là gì?",
    options: [
      "Một loại instance type",
      "Image dùng để launch EC2 instance (chứa OS, app preconfigured)",
      "Một dạng billing report",
      "Một service load balancer",
    ],
    correctIndices: [1],
    explanation:
      "AMI = Amazon Machine Image — template chứa OS, libraries, app để launch EC2. Có AMI từ AWS, từ Marketplace, hoặc tự tạo (custom AMI). AMI thuộc 1 Region, muốn dùng region khác phải copy.",
  },
  {
    id: "clf-04-007",
    courseId: "CLF-C02",
    lesson: "04-ec2",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "single",
    question: "Một game studio cần chạy EC2 trên hardware vật lý ISOLATED, không share với khách hàng khác (yêu cầu compliance). Lựa chọn nào phù hợp nhất?",
    options: ["Spot Instance", "Reserved Instance", "Dedicated Host", "Standard On-Demand"],
    correctIndices: [2],
    explanation:
      "Dedicated Host = bạn được cấp riêng 1 server vật lý, không share. Khác với Dedicated Instance (vẫn AWS quản lý host, chỉ đảm bảo không share). Dedicated Host cho phép BYOL (Bring Your Own License) như Windows Server, SQL Server vì có visibility tới socket/core count.",
  },

  // ============================================================
  // LESSON 05: S3
  // ============================================================
  {
    id: "clf-05-001",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "S3 là loại storage nào?",
    options: ["Block storage", "File storage (NFS)", "Object storage", "Tape storage"],
    correctIndices: [2],
    explanation:
      "S3 = Object storage — lưu file dưới dạng object (key + value + metadata) trong bucket. Block storage = EBS. File storage = EFS / FSx. Tape = không có (gần nhất là S3 Glacier Deep Archive).",
  },
  {
    id: "clf-05-002",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Storage class nào RẺ NHẤT cho dữ liệu archive truy cập rất hiếm (vài lần/năm), chấp nhận retrieval mất nhiều giờ?",
    options: ["S3 Standard", "S3 Standard-IA", "S3 Glacier Instant Retrieval", "S3 Glacier Deep Archive"],
    correctIndices: [3],
    explanation:
      "S3 Glacier Deep Archive: rẻ nhất (~$0.00099/GB), retrieval 12-48 giờ. Glacier Flexible (1 phút - 12h), Glacier Instant (millisecond, đắt hơn). Standard-IA cho data ít access nhưng vẫn cần ngay. Deep Archive phù hợp backup, compliance archive 7-10 năm.",
  },
  {
    id: "clf-05-003",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "S3 durability là bao nhiêu '9'?",
    options: ["99.9% (3 nines)", "99.99% (4 nines)", "99.999999999% (11 nines)", "100%"],
    correctIndices: [2],
    explanation:
      "S3 Standard durability = 99.999999999% (11 nines) — nghĩa là nếu lưu 10 triệu object thì kỳ vọng mất 1 object mỗi 10,000 năm. Đừng nhầm với availability (Standard = 99.99%, tức 4 nines).",
  },
  {
    id: "clf-05-004",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Để KHÔNG vô tình bị xóa object trong S3, nên bật tính năng gì?",
    options: ["S3 Transfer Acceleration", "S3 Versioning", "S3 Replication", "S3 Select"],
    correctIndices: [1],
    explanation:
      "S3 Versioning lưu mọi phiên bản của object. Khi 'xóa', S3 chỉ đặt delete marker — object cũ vẫn ở đó, có thể restore. Kết hợp MFA Delete để chắc hơn. Transfer Acceleration để upload nhanh, Replication để sync cross-region, S3 Select để query dữ liệu.",
  },
  {
    id: "clf-05-005",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "multi",
    question: "Cách kiểm soát truy cập (access control) tới S3 bucket gồm:",
    options: ["Bucket Policy", "IAM Policy", "ACL (Access Control List)", "Security Group"],
    correctIndices: [0, 1, 2],
    explanation:
      "S3 access control gồm: Bucket Policy (JSON, gán vào bucket), IAM Policy (gán vào user/role), ACL (legacy, không khuyến khích nữa). Security Group chỉ dùng cho EC2/ENI, KHÔNG áp dụng cho S3.",
  },
  {
    id: "clf-05-006",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "single",
    question: "Bucket tên 'my-bucket' tạo ở Region us-east-1. Nếu một user khác cố tạo bucket cùng tên ở eu-west-1 thì kết quả?",
    options: [
      "OK vì bucket khác region thì độc lập",
      "Lỗi — tên bucket S3 là duy nhất TOÀN CẦU",
      "OK nhưng phải bật replication",
      "OK nhưng phải xin AWS Support",
    ],
    correctIndices: [1],
    explanation:
      "Tên S3 bucket là globally unique — không 2 tài khoản nào có thể có bucket cùng tên, kể cả ở Region khác. Đây là tính chất của S3 namespace. URL cũng phản ánh điều này: https://<bucket>.s3.amazonaws.com.",
  },
  {
    id: "clf-05-007",
    courseId: "CLF-C02",
    lesson: "05-s3",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Tính năng nào tự động chuyển object giữa các storage class theo thời gian?",
    options: ["S3 Versioning", "S3 Lifecycle Rule", "S3 Replication", "CloudFront"],
    correctIndices: [1],
    explanation:
      "S3 Lifecycle Rule: vd 30 ngày đầu Standard → 90 ngày sau chuyển Standard-IA → 365 ngày chuyển Glacier → 7 năm xóa. Tự động hóa cost optimization. S3 Intelligent-Tiering làm việc tương tự nhưng auto theo access pattern.",
  },

  // ============================================================
  // LESSON 06: VPC
  // ============================================================
  {
    id: "clf-06-001",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "VPC là gì?",
    options: [
      "Một loại EC2 instance",
      "Mạng ảo cô lập (isolated virtual network) trong AWS",
      "Một dịch vụ database",
      "Một loại storage",
    ],
    correctIndices: [1],
    explanation:
      "VPC = Virtual Private Cloud — mạng ảo cô lập trong 1 Region của AWS. Bạn định nghĩa CIDR (vd 10.0.0.0/16), chia subnet, thiết lập route table. VPC là nền tảng để mọi resource networking khác chạy trên đó.",
  },
  {
    id: "clf-06-002",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Sự khác biệt chính giữa Security Group và NACL là gì?",
    options: [
      "Cả hai đều stateful",
      "Security Group stateful (instance level), NACL stateless (subnet level)",
      "Security Group ở subnet level, NACL ở instance level",
      "NACL chỉ deny, SG chỉ allow",
    ],
    correctIndices: [1],
    explanation:
      "SG stateful = nếu cho phép inbound thì outbound response tự cho qua. NACL stateless = phải khai báo cả inbound VÀ outbound. SG ở instance/ENI level, chỉ có allow rule. NACL ở subnet level, có cả allow và deny rule. Câu này CỰC KỲ HAY HỎI.",
  },
  {
    id: "clf-06-003",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "EC2 ở private subnet cần gọi API ra Internet (vd download package). Cần thành phần nào?",
    options: ["Internet Gateway", "NAT Gateway", "VPC Peering", "Transit Gateway"],
    correctIndices: [1],
    explanation:
      "NAT Gateway cho phép private subnet truy cập Internet (outbound) mà KHÔNG cho phép Internet truy cập vào (inbound). NAT GW đặt ở public subnet, route table của private subnet trỏ tới NAT. IGW chỉ cho public subnet.",
  },
  {
    id: "clf-06-004",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Internet Gateway (IGW) đóng vai trò gì?",
    options: [
      "Tường lửa của subnet",
      "Cổng kết nối VPC với Internet (2 chiều)",
      "Kết nối 2 VPC với nhau",
      "Kết nối VPC tới datacenter on-prem",
    ],
    correctIndices: [1],
    explanation:
      "IGW = cổng 2 chiều giữa VPC và Internet, gắn vào VPC. Public subnet có route 0.0.0.0/0 → IGW. VPC Peering = nối 2 VPC. Direct Connect / VPN = nối tới on-prem.",
  },
  {
    id: "clf-06-005",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "multi",
    question: "Để nối on-premise datacenter với AWS VPC, các tùy chọn gồm:",
    options: ["AWS Direct Connect", "AWS Site-to-Site VPN", "VPC Peering", "AWS Transit Gateway (với attachment phù hợp)"],
    correctIndices: [0, 1, 3],
    explanation:
      "Direct Connect = đường truyền vật lý private (bandwidth lớn, không qua Internet). Site-to-Site VPN = encrypted tunnel qua Internet (rẻ, nhanh setup nhưng phụ thuộc Internet). Transit Gateway = hub nối nhiều VPC + on-prem qua VPN/DX attachment. VPC Peering CHỈ nối VPC ↔ VPC, không nối on-prem.",
  },
  {
    id: "clf-06-006",
    courseId: "CLF-C02",
    lesson: "06-vpc",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Public subnet là subnet được định nghĩa như thế nào?",
    options: [
      "Có route 0.0.0.0/0 trỏ tới Internet Gateway",
      "Có địa chỉ IP public sẵn",
      "Nằm trong AZ public",
      "Có tag 'Public=true'",
    ],
    correctIndices: [0],
    explanation:
      "Một subnet được coi là 'public' khi route table của nó có default route 0.0.0.0/0 → IGW. Subnet 'private' không có route đó (chỉ ra Internet qua NAT GW). Đây là định nghĩa kỹ thuật, không phụ thuộc tag hay tên.",
  },

  // ============================================================
  // LESSON 07: DATABASES
  // ============================================================
  {
    id: "clf-07-001",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "RDS hỗ trợ những engine nào sau đây?",
    options: [
      "MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Aurora",
      "Chỉ MySQL và PostgreSQL",
      "MongoDB và Cassandra",
      "Chỉ Aurora",
    ],
    correctIndices: [0],
    explanation:
      "RDS là managed relational database, hỗ trợ 6 engine: MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, và Amazon Aurora. MongoDB → DocumentDB, Cassandra → Keyspaces (đều là service riêng).",
  },
  {
    id: "clf-07-002",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "DynamoDB là loại database gì?",
    options: ["Relational SQL", "NoSQL key-value/document, fully managed", "Graph database", "Time-series database"],
    correctIndices: [1],
    explanation:
      "DynamoDB = NoSQL key-value/document, serverless, single-digit millisecond latency, scale gần như vô hạn. Graph = Neptune. Time-series = Timestream. Trong CLF, hay phân biệt: cần SQL → RDS/Aurora; cần NoSQL siêu nhanh → DynamoDB.",
  },
  {
    id: "clf-07-003",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Để giảm tải đọc cho RDS database, nên dùng tính năng gì?",
    options: ["Multi-AZ", "Read Replicas", "Automated Backups", "Tăng instance class"],
    correctIndices: [1],
    explanation:
      "Read Replicas = bản sao read-only, phục vụ read traffic, giảm tải primary. Multi-AZ là HA (failover), KHÔNG dùng để load-balance read. Phân biệt: Multi-AZ = uptime; Read Replica = performance.",
  },
  {
    id: "clf-07-004",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Multi-AZ trong RDS dùng để làm gì?",
    options: [
      "Tăng performance đọc",
      "High Availability (HA) — tự động failover khi AZ chính hỏng",
      "Giảm chi phí lưu trữ",
      "Tự động backup hàng ngày",
    ],
    correctIndices: [1],
    explanation:
      "Multi-AZ = 1 standby ở AZ khác, sync replication, tự động failover khi primary hỏng. Standby KHÔNG phục vụ traffic (không đọc/ghi gì cả). Đây là điểm khác Read Replica (replica thì serve read).",
  },
  {
    id: "clf-07-005",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "ElastiCache cung cấp dịch vụ gì?",
    options: [
      "Object storage",
      "In-memory cache (Redis, Memcached)",
      "Data warehouse",
      "Email service",
    ],
    correctIndices: [1],
    explanation:
      "ElastiCache = managed in-memory cache, hỗ trợ Redis (rich features, persistence, pub/sub) và Memcached (đơn giản, multi-thread). Dùng để cache DB query, session, leaderboard — giảm tải DB và tăng tốc app.",
  },
  {
    id: "clf-07-006",
    courseId: "CLF-C02",
    lesson: "07-databases",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "single",
    question: "Aurora khác RDS MySQL/PostgreSQL ở điểm nào QUAN TRỌNG nhất?",
    options: [
      "Aurora không hỗ trợ MySQL",
      "Aurora là engine custom của AWS, performance gấp 3-5x, storage tự scale tới 128TB",
      "Aurora không tương thích MySQL/PostgreSQL",
      "Aurora chỉ chạy ở 1 AZ",
    ],
    correctIndices: [1],
    explanation:
      "Aurora là engine do AWS phát triển, tương thích wire-protocol với MySQL/PostgreSQL nhưng được tối ưu hóa: storage tách rời compute, tự replicate 6 copies qua 3 AZ, tự scale từ 10GB → 128TB. Performance ~5x MySQL, ~3x PostgreSQL theo AWS.",
  },

  // ============================================================
  // LESSON 08: BILLING & PRICING
  // ============================================================
  {
    id: "clf-08-001",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "AWS Free Tier có những loại nào?",
    options: [
      "Chỉ Always Free",
      "Always Free, 12 Months Free, và Trials",
      "Chỉ 12 Months Free",
      "Free Tier không tồn tại",
    ],
    correctIndices: [1],
    explanation:
      "AWS Free Tier có 3 loại: (1) Always Free (vd Lambda 1M requests/tháng mãi mãi), (2) 12 Months Free (vd EC2 t2.micro 750h/tháng trong 12 tháng đầu), (3) Trials (free dùng thử trong N ngày, vd Inspector).",
  },
  {
    id: "clf-08-002",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Dịch vụ nào giúp bạn DỰ BÁO chi phí AWS theo tháng và phân tích chi phí theo service/tag?",
    options: ["AWS Budgets", "AWS Cost Explorer", "AWS Trusted Advisor", "AWS Compute Optimizer"],
    correctIndices: [1],
    explanation:
      "Cost Explorer = visualize và forecast chi phí, group by service/tag/region/account. Budgets = set ngưỡng và cảnh báo khi vượt. Trusted Advisor = best-practice check. Compute Optimizer = recommend instance type tối ưu.",
  },
  {
    id: "clf-08-003",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Bạn muốn nhận email cảnh báo khi chi phí AWS tháng này vượt $100. Dùng dịch vụ nào?",
    options: ["AWS Budgets", "AWS Cost Explorer", "AWS CloudWatch", "AWS Pricing Calculator"],
    correctIndices: [0],
    explanation:
      "AWS Budgets cho phép tạo budget (cost, usage, reservation, savings plan) và set alert qua SNS/email khi sắp/đã vượt. Cost Explorer chỉ visualize, không set alert. CloudWatch alarms có thể alert chi phí qua billing metric, nhưng Budgets là công cụ chuyên dụng.",
  },
  {
    id: "clf-08-004",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "AWS Pricing Calculator dùng để làm gì?",
    options: [
      "Tính chi phí ƯỚC LƯỢNG TRƯỚC khi deploy resource",
      "Tính chi phí thực tế đã dùng",
      "Tự động tối ưu chi phí",
      "Hoàn tiền cho user",
    ],
    correctIndices: [0],
    explanation:
      "Pricing Calculator = công cụ web để ước lượng cost của một kiến trúc trước khi triển khai. Dùng để lập kế hoạch, đề xuất ngân sách. Khác với Cost Explorer (chi phí đã dùng).",
  },
  {
    id: "clf-08-005",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "hard",
    type: "multi",
    question: "Phát biểu nào ĐÚNG về AWS Organizations?",
    options: [
      "Cho phép Consolidated Billing — gộp hóa đơn của nhiều account",
      "Hỗ trợ volume discount khi tổng usage cao",
      "Service Control Policies (SCP) áp dụng giới hạn quyền cho member account",
      "Mỗi tổ chức chỉ được có tối đa 5 account",
    ],
    correctIndices: [0, 1, 2],
    explanation:
      "AWS Organizations: A đúng — consolidated billing là tính năng cốt lõi. B đúng — gộp usage giúp đạt tier discount (vd S3, EC2 RI sharing). C đúng — SCP là guardrail ở org/OU/account level, chặn API call ngay cả admin. D SAI — không giới hạn 5 account (mặc định 10 nhưng có thể request tăng, thực tế cty lớn có hàng trăm account).",
  },
  {
    id: "clf-08-006",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "medium",
    type: "single",
    question: "Plan support nào của AWS có 24/7 access tới Cloud Support Engineer qua phone, chat, email với response time < 15 phút cho production-down?",
    options: ["Basic", "Developer", "Business", "Enterprise"],
    correctIndices: [3],
    explanation:
      "4 mức support: Basic (free, chỉ docs/forum), Developer ($29+, email business hour), Business ($100+, 24/7 phone, prod-down < 1h), Enterprise (TAM, prod-down < 15 phút, business-critical < 1h). Enterprise có Technical Account Manager (TAM) riêng.",
  },
  {
    id: "clf-08-007",
    courseId: "CLF-C02",
    lesson: "08-billing",
    certifications: ["CLF-C02"],
    difficulty: "easy",
    type: "single",
    question: "Dịch vụ AWS nào hoàn toàn KHÔNG mất phí (free)?",
    options: ["IAM", "EC2", "S3", "RDS"],
    correctIndices: [0],
    explanation:
      "IAM, AWS Organizations, AWS Cost Explorer (interface), VPC (bản thân VPC — chỉ tính NAT/DX/data transfer), CloudFormation engine — đều free. EC2/S3/RDS đều tính phí theo usage.",
  },
];

export const questions: Question[] = [...curatedQuestions, ...generatedQuestions, ...generatedKnowledge];

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}
