import type { Question } from "@/lib/types";

// Auto-generated CLF-C02 mock question bank (3 blueprint-balanced mocks of 65 each).
// Generated + adversarially verified via the clf-c02-mock-bank multi-agent workflow.
// Domain mix per mock follows the official CLF-C02 blueprint (D1 24% / D2 30% / D3 34% / D4 12%).
// To regenerate, re-run the workflow rather than hand-editing entries.
export const generatedQuestions: Question[] = [
  {
    "id": "clf-m1-001",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup wants to avoid high upfront costs of purchasing physical servers and only pay for resources actually used each month. Which AWS Cloud benefit best describes this requirement?",
    "options": [
      "Trade capital expense (CapEx) for variable operational expense (OpEx)",
      "High availability across multiple Availability Zones",
      "Elasticity to automatically scale based on load",
      "Global reach across multiple AWS Regions"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trả tiền theo mức dùng thay vì mua phần cứng trước chính là chuyển CapEx thành OpEx biến đổi.\n✓ Trade CapEx for variable OpEx — đúng, không cần đầu tư phần cứng trước, trả theo nhu cầu.\n✗ High availability — nói về độ sẵn sàng, không phải mô hình chi phí.\n✗ Elasticity — nói về co giãn tài nguyên, không trực tiếp về CapEx/OpEx.\n✗ Global reach — nói về phạm vi địa lý, không liên quan chi phí trả trước.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-001",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An e-commerce company experiences traffic spikes during sales promotions and drops significantly afterward. They want the infrastructure to automatically add resources when load is high and reduce resources when load is low. Which AWS Cloud characteristic fulfills this?",
    "options": [
      "Elasticity",
      "Fault tolerance",
      "Durability",
      "Vendor lock-in"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tự động tăng/giảm tài nguyên theo nhu cầu thực tế chính là elasticity.\n✓ Elasticity — đúng, co giãn tài nguyên lên/xuống theo tải.\n✗ Fault tolerance — khả năng chịu lỗi, không phải co giãn theo tải.\n✗ Durability — độ bền dữ liệu, không liên quan scale.\n✗ Vendor lock-in — là một bất lợi tiềm tàng, không phải lợi ích.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-001",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A development team wants to experiment with a new product idea and deploy a test environment in just minutes instead of waiting weeks to purchase and install servers. Which AWS Cloud benefit is most suitable?",
    "options": [
      "Agility (increased speed of innovation and deployment)",
      "Economies of scale help reduce costs",
      "Trade OpEx for CapEx",
      "High data durability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khả năng nhanh chóng tạo tài nguyên để thử nghiệm và đổi mới chính là agility.\n✓ Agility — đúng, triển khai nhanh, thử nghiệm và đổi mới nhanh.\n✗ Economies of scale — giúp giảm giá, nhưng không nói về tốc độ triển khai.\n✗ Trade OpEx for CapEx — ngược logic của cloud (đúng phải là CapEx -> OpEx).\n✗ Data durability — độ bền dữ liệu, không liên quan tốc độ thử nghiệm.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-002",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A SaaS company has users in Asia, Europe, and North America and is experiencing high latency because it runs in only a single region. They want to deploy the application closer to end users to reduce latency. Which AWS global infrastructure benefit addresses this issue?",
    "options": [
      "Deploy across multiple AWS Regions for global reach and reduced latency",
      "Enable Multi-AZ within the same Region",
      "Purchase long-term Reserved Instances",
      "Use a larger Availability Zone"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Để phục vụ người dùng toàn cầu với độ trễ thấp, cần triển khai ở nhiều Region gần người dùng (global reach).\n✓ Nhiều AWS Regions — đúng, đặt tài nguyên gần người dùng giúp giảm latency toàn cầu.\n✗ Multi-AZ trong một Region — tăng tính sẵn sàng nội vùng, không giảm latency cho người dùng ở châu lục khác.\n✗ Reserved Instances — mô hình giá, không ảnh hưởng độ trễ địa lý.\n✗ Một AZ lớn hơn — vẫn ở một vị trí địa lý, không giảm latency toàn cầu.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-002",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A bank requires its critical application to continue operating even if a physical data center experiences a power outage. They want to leverage AWS design to achieve high availability within a Region. Which solution is most suitable?",
    "options": [
      "Distribute workload across multiple Availability Zones",
      "Place all workload in a single Availability Zone",
      "Use a CloudFront Edge Location",
      "Switch to On-Demand pricing"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi AZ là một hay nhiều data center tách biệt; trải workload qua nhiều AZ cho high availability khi một AZ gặp sự cố.\n✓ Nhiều Availability Zones — đúng, nếu một AZ hỏng, các AZ khác vẫn phục vụ.\n✗ Một AZ duy nhất — là single point of failure, không có HA.\n✗ Edge Location của CloudFront — dùng để cache nội dung, không phải để chạy workload cốt lõi với HA.\n✗ On-Demand pricing — mô hình giá, không tạo high availability.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-002",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company is deciding between building its own data center and using AWS. They realize AWS serves millions of customers, so it can purchase hardware in extremely large quantities and drive costs down lower than the company could achieve on its own. Which benefit describes this?",
    "options": [
      "Economies of scale help lower pay-as-you-go pricing",
      "Elasticity",
      "Agility",
      "Fault tolerance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS tổng hợp nhu cầu từ rất nhiều khách hàng nên đạt economies of scale và chuyển lợi ích giá xuống người dùng.\n✓ Economies of scale — đúng, quy mô lớn giúp giá thấp hơn so với tự xây.\n✗ Elasticity — về co giãn tài nguyên, không phải về giá theo quy mô.\n✗ Agility — về tốc độ đổi mới, không phải giá.\n✗ Fault tolerance — về chịu lỗi, không liên quan economies of scale.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-003",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company no longer wants to spend resources maintaining hardware, replacing racks, or patching physical server firmware, and instead wants to focus on products that differentiate for customers. Which AWS value proposition best aligns with this goal?",
    "options": [
      "Stop spending money on data center operations and maintenance to focus on business differentiation",
      "Achieve 11-9s durability for data",
      "Reduce latency through Edge Locations",
      "Automatically scale through elasticity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS gánh việc vận hành hạ tầng, giúp doanh nghiệp dồn nguồn lực vào việc tạo giá trị khác biệt cho khách hàng.\n✓ Ngừng tốn nguồn lực vận hành data center — đúng, để tập trung vào khác biệt hóa kinh doanh.\n✗ Durability 11 số 9 — đặc tính của S3, không phải điều công ty đang quan tâm.\n✗ Giảm latency nhờ Edge Locations — về hiệu năng, không phải về giảm gánh nặng vận hành.\n✗ Elasticity — về co giãn, không trực tiếp về việc bỏ bảo trì phần cứng.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-003",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A media company is transitioning from its own data center to AWS and wants to present the core benefits of AWS Cloud value proposition to executive leadership. Choose TWO correct statements.",
    "options": [
      "Can trade upfront CapEx for variable OpEx, paying only for resources used",
      "Can increase/decrease capacity in minutes instead of having to forecast demand years in advance",
      "AWS guarantees applications never experience any outages",
      "Must purchase peak capacity upfront to avoid resource shortages",
      "Cloud deployment completely eliminates the need to architect for high availability"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Hai lợi ích đúng là chuyển CapEx sang OpEx và co giãn nhanh thay vì dự đoán dung lượng trước.\n✓ Trade CapEx thành variable OpEx — đúng, trả theo mức dùng.\n✓ Tăng/giảm dung lượng trong vài phút — đúng, không phải dự đoán nhu cầu nhiều năm.\n✗ Không bao giờ gặp sự cố — sai, AWS hoạt động theo mô hình SLA, không tuyệt đối 100%.\n✗ Mua trọn năng lực đỉnh trước — sai, đó là cách của on-premises, trái với elasticity.\n✗ Loại bỏ hoàn toàn nhu cầu thiết kế HA — sai, khách hàng vẫn phải kiến trúc đúng (ví dụ Multi-AZ).",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-003",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A research team needs 500 servers to run heavy simulations for 3 days, then won't need them anymore. On-premises, this would take many months of procurement. AWS allows them to do this almost instantly and then release resources. Which benefit demonstrates this most clearly?",
    "options": [
      "Ability to access large quantities of resources nearly instantly and release when finished (elasticity + speed)",
      "S3 data durability",
      "Shared Responsibility Model",
      "AWS compliance certifications"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khả năng huy động rất nhiều tài nguyên nhanh chóng rồi giải phóng khi hoàn tất thể hiện elasticity kết hợp tốc độ triển khai.\n✓ Truy cập tức thì lượng lớn tài nguyên rồi trả lại — đúng, co giãn nhanh theo nhu cầu ngắn hạn.\n✗ Data durability của S3 — về độ bền lưu trữ, không phải về cấp phát compute nhanh.\n✗ Shared Responsibility Model — mô hình trách nhiệm bảo mật, không liên quan.\n✗ Compliance certifications — về tuân thủ, không phải về tốc độ cấp tài nguyên.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-004",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A solutions architect is explaining the difference between scalability and elasticity to the team. In AWS, which is the MOST ACCURATE description of elasticity compared to just scalability?",
    "options": [
      "Elasticity is automatically adding AND reducing resources based on actual demand in real time, not just increasing capacity",
      "Elasticity is only the ability to increase to maximum capacity, never reducing",
      "Elasticity means replicating data across multiple Regions to prevent loss",
      "Elasticity is a 1 or 3-year commitment to reduce prices"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elasticity nhấn mạnh việc tự động co giãn cả lên lẫn xuống khớp với nhu cầu thực tế, vượt hơn khái niệm scalability đơn thuần.\n✓ Tự động thêm và bớt tài nguyên theo nhu cầu — đúng, đây là bản chất elasticity.\n✗ Chỉ tăng, không bao giờ giảm — sai, đó gần với scalability một chiều, không phải elasticity.\n✗ Sao chép dữ liệu sang nhiều Region — đó là chủ đề durability/DR, không phải elasticity.\n✗ Cam kết hợp đồng 1-3 năm — đó là Reserved Instances, một mô hình giá.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-004",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A CFO wants to broadly compare the financial model between on-premises and AWS. Which statement MOST ACCURATELY reflects how AWS changes cost structure, beyond just paying for usage?",
    "options": [
      "AWS transforms upfront fixed costs into variable costs, allowing cost reduction through optimization and avoiding incorrect capacity forecasting",
      "AWS requires a large fixed CapEx every year regardless of usage level",
      "AWS completely eliminates all operational costs for customers",
      "AWS only charges fixed monthly packages with no variation"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giá trị tài chính của AWS là biến đổi hóa chi phí, gắn chi tiêu với mức dùng và tránh phải đầu tư đoán trước.\n✓ Biến chi phí cố định trả trước thành biến đổi, tránh dự đoán dung lượng sai — đúng, đây là bản chất CapEx -> OpEx.\n✗ Yêu cầu CapEx lớn cố định mỗi năm — sai, trái ngược mô hình pay-as-you-go.\n✗ Loại bỏ hoàn toàn chi phí vận hành — sai, vẫn còn chi phí vận hành/sử dụng dịch vụ.\n✗ Chỉ tính gói cố định hằng tháng không đổi — sai, chi phí biến đổi theo mức sử dụng.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-004",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to expand operations to multiple new countries with just a few clicks, deploying its application to corresponding Regions without needing to build data centers in each country. Which AWS Cloud benefit is demonstrated?",
    "options": [
      "Go global in minutes thanks to global infrastructure (global reach)",
      "Increase data durability to 11-9s",
      "Reduce costs through Spot Instances",
      "Increase security through IAM"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khả năng mở rộng sang nhiều khu vực địa lý nhanh chóng nhờ hạ tầng toàn cầu của AWS chính là 'go global in minutes'.\n✓ Go global in minutes nhờ global reach — đúng, triển khai ở nhiều Region nhanh chóng.\n✗ Durability 11 số 9 — đặc tính lưu trữ S3, không phải mở rộng địa lý.\n✗ Spot Instances — mô hình giá tiết kiệm, không liên quan global reach.\n✗ IAM — về quản lý quyền truy cập, không liên quan mở rộng toàn cầu.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-005",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to automate deployment processes, monitor performance using metrics, and continuously improve daily operational procedures. Which pillar of the AWS Well-Architected Framework focuses on this objective?",
    "options": [
      "Operational Excellence",
      "Security",
      "Cost Optimization",
      "Reliability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Operational Excellence tập trung vào vận hành, tự động hóa, giám sát và cải tiến liên tục các quy trình.\n✓ Operational Excellence — đúng, bao gồm automation deployment, monitoring và cải tiến quy trình.\n✗ Security — bảo vệ dữ liệu và hệ thống, không phải trọng tâm vận hành.\n✗ Cost Optimization — tối ưu chi phí, không liên quan tự động hóa quy trình.\n✗ Reliability — khả năng phục hồi và chịu lỗi, không phải cải tiến quy trình vận hành.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-005",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A financial organization needs to protect customer data, manage access using IAM, and encrypt data at rest. Which pillar of the Well-Architected Framework do these requirements belong to?",
    "options": [
      "Security",
      "Performance Efficiency",
      "Sustainability",
      "Operational Excellence"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security pillar bao gồm bảo vệ dữ liệu, quản lý danh tính/quyền truy cập và mã hóa.\n✓ Security — đúng, gồm IAM, mã hóa và bảo vệ dữ liệu.\n✗ Performance Efficiency — tập trung dùng tài nguyên hiệu quả, không phải bảo mật.\n✗ Sustainability — giảm tác động môi trường, không liên quan bảo vệ dữ liệu.\n✗ Operational Excellence — vận hành và quy trình, không phải kiểm soát truy cập.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-005",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants the system to automatically recover from failures, deploy across multiple Availability Zones, and tolerate faults without service interruption. Which pillar best aligns with this objective?",
    "options": [
      "Reliability",
      "Cost Optimization",
      "Security",
      "Sustainability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Reliability pillar tập trung vào khả năng phục hồi sau lỗi và đảm bảo hệ thống hoạt động liên tục.\n✓ Reliability — đúng, gồm tự phục hồi, multi-AZ và chịu lỗi.\n✗ Cost Optimization — chỉ tối ưu chi phí, không bảo đảm khả năng phục hồi.\n✗ Security — bảo vệ hệ thống, không phải khả năng chịu lỗi.\n✗ Sustainability — môi trường, không liên quan độ tin cậy.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-006",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A startup wants to select the right type of compute resources, use serverless where appropriate, and monitor to ensure the architecture always uses the most efficient technology for the need. Which pillar most accurately describes these activities?",
    "options": [
      "Performance Efficiency",
      "Operational Excellence",
      "Reliability",
      "Cost Optimization"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Performance Efficiency tập trung sử dụng tài nguyên compute hiệu quả và áp dụng công nghệ phù hợp theo nhu cầu.\n✓ Performance Efficiency — đúng, gồm chọn đúng resource type, serverless và tối ưu công nghệ.\n✗ Operational Excellence — vận hành quy trình, không phải chọn tài nguyên hiệu năng.\n✗ Reliability — chịu lỗi và phục hồi, không phải hiệu năng.\n✗ Cost Optimization — tập trung giảm chi phí, không phải hiệu năng kỹ thuật.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-006",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company is running multiple EC2 instances with excess capacity and low utilization. They want to analyze spending, turn off unused resources, and switch to appropriate pricing models to reduce total costs. Which pillar guides these activities?",
    "options": [
      "Cost Optimization",
      "Performance Efficiency",
      "Operational Excellence",
      "Sustainability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cost Optimization tập trung loại bỏ chi phí không cần thiết và chọn mô hình giá phù hợp.\n✓ Cost Optimization — đúng, gồm phân tích chi tiêu, tắt tài nguyên thừa và chọn pricing model.\n✗ Performance Efficiency — tối ưu hiệu năng, không phải chi phí.\n✗ Operational Excellence — quy trình vận hành, không phải tiết kiệm chi phí.\n✗ Sustainability — giảm tác động môi trường, nhưng trọng tâm yêu cầu ở đây là giảm tổng chi phí.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-006",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A business wants to reduce the environmental impact of its cloud workloads by maximizing resource utilization efficiency and reducing necessary energy consumption. Which pillar of the Well-Architected Framework directly addresses this objective?",
    "options": [
      "Sustainability",
      "Cost Optimization",
      "Reliability",
      "Performance Efficiency"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sustainability là pillar tập trung giảm tác động môi trường và tiêu thụ năng lượng của workload.\n✓ Sustainability — đúng, mục tiêu giảm carbon và năng lượng tiêu thụ.\n✗ Cost Optimization — giảm chi phí, không phải tác động môi trường.\n✗ Reliability — độ tin cậy, không liên quan môi trường.\n✗ Performance Efficiency — hiệu năng kỹ thuật, không phải tác động môi trường.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-007",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A DevOps team wants to apply Infrastructure as Code (CloudFormation), make small and reversible changes, and extract lessons from operational incidents to improve. Which pillar do these practices reflect?",
    "options": [
      "Operational Excellence",
      "Reliability",
      "Security",
      "Performance Efficiency"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Operational Excellence khuyến khích IaC, thay đổi nhỏ có thể đảo ngược và học hỏi từ sự cố.\n✓ Operational Excellence — đúng, gồm IaC, small reversible changes và rút kinh nghiệm vận hành.\n✗ Reliability — chịu lỗi và phục hồi, không phải quy trình thay đổi.\n✗ Security — bảo mật, không liên quan IaC cải tiến vận hành.\n✗ Performance Efficiency — hiệu năng, không phải quy trình vận hành.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-007",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An e-commerce application frequently becomes overloaded during peak hours and goes down when a server fails. The company wants to improve so the system self-recovers and automatically replaces failed instances. Which pillar should be prioritized for improvement?",
    "options": [
      "Reliability",
      "Cost Optimization",
      "Sustainability",
      "Security"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Reliability đảm bảo hệ thống phục hồi sau lỗi và thay thế tự động instance bị hỏng.\n✓ Reliability — đúng, gồm tự phục hồi và thay thế instance lỗi để tránh downtime.\n✗ Cost Optimization — chi phí, không giải quyết downtime.\n✗ Sustainability — môi trường, không liên quan khả năng phục hồi.\n✗ Security — bảo mật, không phải nguyên nhân downtime ở đây.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-007",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A solutions architect needs to distinguish between two requirements: 'right-size instances to handle load most efficiently' and 'turn off unused instances to reduce the bill.' Which pillars do these requirements respectively belong to?",
    "options": [
      "Performance Efficiency và Cost Optimization",
      "Cost Optimization và Performance Efficiency",
      "Operational Excellence và Cost Optimization",
      "Performance Efficiency và Reliability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Right-sizing để xử lý tải hiệu quả thuộc Performance Efficiency; tắt tài nguyên thừa để giảm hóa đơn thuộc Cost Optimization.\n✓ Right-sizing xử lý tải hiệu quả là Performance Efficiency, và tắt instance thừa giảm hóa đơn là Cost Optimization — đúng thứ tự.\n✗ Đảo ngược hai pillar — sai vì right-sizing hiệu năng không phải chi phí, và tắt tài nguyên không phải hiệu năng.\n✗ Yêu cầu đầu gắn Operational Excellence — sai, right-sizing là hiệu năng, không phải vận hành quy trình.\n✗ Yêu cầu thứ hai gắn Reliability — sai, giảm hóa đơn là Cost Optimization, không phải độ tin cậy.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-008",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company is deploying a new workload and wants to apply practices from the Security pillar of the Well-Architected Framework. Which of the following actions align with the Security pillar? (Select 2)",
    "options": [
      "Áp dụng nguyên tắc least privilege bằng IAM policies",
      "Bật mã hóa dữ liệu at-rest và in-transit",
      "Dùng Auto Scaling để hệ thống tự phục hồi sau lỗi",
      "Chọn Reserved Instances để giảm chi phí compute",
      "Right-size instance để cải thiện thông lượng xử lý"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Security pillar gồm quản lý danh tính theo least privilege và bảo vệ dữ liệu bằng mã hóa.\n✓ Least privilege bằng IAM — đúng, kiểm soát truy cập là Security.\n✓ Mã hóa at-rest và in-transit — đúng, bảo vệ dữ liệu là Security.\n✗ Auto Scaling tự phục hồi — thuộc Reliability.\n✗ Reserved Instances giảm chi phí — thuộc Cost Optimization.\n✗ Right-size cải thiện thông lượng — thuộc Performance Efficiency.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-008",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company wants to use managed services and serverless to reduce unnecessary resource runtime and choose Regions near users to reduce data movement to lower their carbon footprint. Which pillar does this primary objective tie to?",
    "options": [
      "Sustainability",
      "Performance Efficiency",
      "Cost Optimization",
      "Operational Excellence"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mục tiêu giảm dấu chân carbon và tài nguyên tiêu thụ là trọng tâm của Sustainability.\n✓ Sustainability — đúng, giảm tác động môi trường bằng managed services và tối ưu vị trí workload.\n✗ Performance Efficiency — dù serverless cũng liên quan, mục tiêu nêu rõ là carbon, không phải hiệu năng.\n✗ Cost Optimization — tiết kiệm chi phí, không phải dấu chân carbon.\n✗ Operational Excellence — vận hành quy trình, không liên quan môi trường.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-008",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "During an architecture review, a team discovers they lack the ability to monitor and respond to operational events in real time using CloudWatch alarms and runbooks. Which pillar of the Well-Architected Framework does this gap belong to?",
    "options": [
      "Operational Excellence",
      "Reliability",
      "Security",
      "Performance Efficiency"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giám sát vận hành thời gian thực, alarms và runbooks để phản hồi sự kiện thuộc Operational Excellence.\n✓ Operational Excellence — đúng, gồm monitoring, alarms và quy trình phản hồi runbook.\n✗ Reliability — tập trung phục hồi sau lỗi hạ tầng, không phải quy trình giám sát vận hành.\n✗ Security — bảo mật, không phải giám sát vận hành.\n✗ Performance Efficiency — hiệu năng tài nguyên, không phải runbook vận hành.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-009",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to migrate an application running on physical servers to AWS as quickly as possible, WITHOUT changing the source code, by moving it as-is to EC2. Which of the 7 Rs migration strategies is this?",
    "options": [
      "Rehost (lift-and-shift)",
      "Refactor",
      "Repurchase",
      "Retire"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rehost (lift-and-shift) là chuyển nguyên trạng workload sang cloud mà không sửa mã, nhanh và ít rủi ro.\n✓ Rehost (lift-and-shift) — đúng, di chuyển nguyên trạng lên EC2 không đổi mã.\n✗ Refactor — viết lại/kiến trúc lại ứng dụng, tốn nhiều công sức.\n✗ Repurchase — chuyển sang sản phẩm SaaS khác.\n✗ Retire — loại bỏ ứng dụng không còn dùng.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-009",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company needs to transfer 80 TB of data to Amazon S3 but has very slow internet bandwidth; uploading over the network would take many weeks. Which service is most appropriate?",
    "options": [
      "AWS Snowball",
      "Amazon CloudFront",
      "AWS Direct Connect chỉ để upload một lần",
      "Amazon S3 Transfer Acceleration qua đường truyền hiện tại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Snowball là thiết bị vật lý để chuyển khối lượng lớn dữ liệu offline khi băng thông không đủ.\n✓ AWS Snowball — đúng, vận chuyển vật lý hàng chục TB không phụ thuộc internet.\n✗ Amazon CloudFront — CDN phân phối nội dung, không dùng để migrate dữ liệu.\n✗ AWS Direct Connect — kết nối mạng riêng dài hạn, không hợp lý cho một lần và vẫn cần thời gian thiết lập.\n✗ S3 Transfer Acceleration — vẫn dùng internet hiện tại vốn đã quá chậm.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-009",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to migrate an Oracle database from on-premises to Amazon Aurora with minimal downtime while continuing to synchronize data during the migration. Which service should be used?",
    "options": [
      "AWS Database Migration Service (DMS)",
      "Amazon RDS Read Replica",
      "AWS Snowball Edge",
      "AWS Backup"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS DMS hỗ trợ migrate database với continuous replication (CDC), giảm tối đa downtime và cho phép đổi engine.\n✓ AWS DMS — đúng, di chuyển và đồng bộ liên tục dữ liệu giữa các hệ quản trị khác nhau.\n✗ Amazon RDS Read Replica — chỉ tạo bản sao đọc cùng engine, không phải công cụ migrate cross-engine.\n✗ AWS Snowball Edge — chuyển dữ liệu offline, không đồng bộ liên tục.\n✗ AWS Backup — sao lưu/khôi phục, không phải migrate database trực tuyến.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-010",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "When migrating a database between different database engines (for example, Oracle to PostgreSQL), which tool helps convert schemas and stored procedures before using DMS to transfer data?",
    "options": [
      "AWS Schema Conversion Tool (SCT)",
      "AWS Glue",
      "Amazon Athena",
      "AWS DataSync"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS SCT chuyển đổi schema, stored procedure và code giữa các engine khác nhau, bổ trợ cho DMS.\n✓ AWS Schema Conversion Tool (SCT) — đúng, chuyển đổi schema heterogeneous trước khi DMS chuyển dữ liệu.\n✗ AWS Glue — dịch vụ ETL serverless, không chuyên chuyển đổi schema database.\n✗ Amazon Athena — truy vấn dữ liệu trên S3 bằng SQL, không liên quan.\n✗ AWS DataSync — đồng bộ file giữa on-premises và AWS storage, không xử lý schema.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-010",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An organization is planning cloud transformation and wants to assess readiness in terms of workforce skills, training, and cultural change management. Which perspective of the AWS CAF focuses on this aspect?",
    "options": [
      "People perspective",
      "Platform perspective",
      "Operations perspective",
      "Governance perspective"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "People perspective của AWS CAF tập trung vào con người: kỹ năng, đào tạo, vai trò và thay đổi văn hóa tổ chức.\n✓ People perspective — đúng, liên quan kỹ năng, đào tạo và change management về con người.\n✗ Platform perspective — kiến trúc hạ tầng và workload kỹ thuật.\n✗ Operations perspective — vận hành, giám sát, quản lý dịch vụ hàng ngày.\n✗ Governance perspective — quản trị, kiểm soát danh mục đầu tư và rủi ro.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-010",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's finance department needs to ensure cloud migration delivers measurable business benefits and aligns with business objectives. Which perspective of the AWS CAF is responsible for this?",
    "options": [
      "Business perspective",
      "Security perspective",
      "Platform perspective",
      "People perspective"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Business perspective của AWS CAF gắn kết đầu tư IT với kết quả và mục tiêu kinh doanh đo lường được.\n✓ Business perspective — đúng, đảm bảo cloud tạo giá trị kinh doanh và phù hợp chiến lược.\n✗ Security perspective — bảo mật và tuân thủ, không phải giá trị kinh doanh.\n✗ Platform perspective — kiến trúc kỹ thuật của nền tảng.\n✗ People perspective — kỹ năng và văn hóa nhân sự.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-011",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company discovers an old application that no one uses anymore and decides to stop operating it without migrating to cloud to save costs. Which strategy among the 7 Rs is this?",
    "options": [
      "Retire",
      "Retain",
      "Relocate",
      "Replatform"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Retire là loại bỏ những ứng dụng không còn cần thiết, giúp giảm chi phí và phạm vi migrate.\n✓ Retire — đúng, ngừng vận hành ứng dụng không còn dùng.\n✗ Retain — giữ lại on-premises tạm thời, ứng dụng vẫn được dùng.\n✗ Relocate — chuyển hạ tầng (ví dụ VMware) sang cloud không đổi.\n✗ Replatform — tối ưu nhỏ khi chuyển nhưng vẫn giữ ứng dụng.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-011",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company migrates a web application to AWS and simultaneously replaces self-managed database with Amazon RDS to reduce management burden, but does NOT rewrite application code. Which strategy among the 7 Rs is this?",
    "options": [
      "Replatform (lift-tinker-and-shift)",
      "Rehost",
      "Refactor",
      "Repurchase"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Replatform giữ kiến trúc cốt lõi nhưng tối ưu một vài thành phần (như đổi sang managed RDS) mà không viết lại toàn bộ.\n✓ Replatform (lift-tinker-and-shift) — đúng, tối ưu nhỏ như dùng RDS managed mà không đổi mã chính.\n✗ Rehost — chuyển nguyên trạng, không tối ưu thành phần nào.\n✗ Refactor — viết lại/đổi kiến trúc đáng kể.\n✗ Repurchase — chuyển sang một sản phẩm SaaS khác.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-011",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company wants to abandon its self-built CRM system and switch to a commercial SaaS solution (e.g., Salesforce) with a subscription model. Which strategy among the 7 Rs is this?",
    "options": [
      "Repurchase (drop-and-shop)",
      "Replatform",
      "Refactor",
      "Relocate"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Repurchase là chuyển từ hệ thống hiện tại sang một sản phẩm khác, thường là SaaS thương mại.\n✓ Repurchase (drop-and-shop) — đúng, thay hệ thống cũ bằng SaaS đăng ký.\n✗ Replatform — vẫn giữ ứng dụng cũ, chỉ tối ưu một phần.\n✗ Refactor — viết lại ứng dụng hiện có, không mua sản phẩm mới.\n✗ Relocate — di chuyển hạ tầng nguyên trạng, không thay sản phẩm.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-012",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company plans comprehensive migration according to AWS CAF. They need to identify perspectives belonging to the technical capabilities group (not the business/people group). Select appropriate perspectives.",
    "options": [
      "Platform",
      "Security",
      "Operations",
      "Business",
      "People"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "AWS CAF chia 6 perspectives thành nhóm business (Business, People, Governance) và nhóm technical (Platform, Security, Operations).\n✓ Platform — đúng, thuộc nhóm kỹ thuật, kiến trúc hạ tầng và workload.\n✓ Security — đúng, thuộc nhóm kỹ thuật, bảo mật và tuân thủ.\n✓ Operations — đúng, thuộc nhóm kỹ thuật, vận hành và giám sát.\n✗ Business — thuộc nhóm business (con người/kinh doanh).\n✗ People — thuộc nhóm business, về kỹ năng và văn hóa.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-012",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company operates workload on on-premises VMware and wants to move entire infrastructure to VMware Cloud on AWS WITHOUT changing the hypervisor or converting VMs. Which strategy among the 7 Rs is this?",
    "options": [
      "Relocate",
      "Rehost",
      "Replatform",
      "Retain"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Relocate chuyển hạ tầng (như cụm VMware) sang dịch vụ tương đương trên AWS mà không đổi hypervisor hay kiến trúc.\n✓ Relocate — đúng, chuyển VMware sang VMware Cloud on AWS không cần chuyển đổi VM.\n✗ Rehost — thường chuyển VM riêng lẻ sang EC2, cần ánh xạ lại máy chủ.\n✗ Replatform — tối ưu thành phần khi chuyển, không áp dụng cho di chuyển nguyên cụm VMware.\n✗ Retain — giữ nguyên on-premises, không chuyển đi.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-012",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has an application heavily dependent on a mainframe system that is not ready to migrate and decides to keep it on-premises at this stage. Which strategy among the 7 Rs is this?",
    "options": [
      "Retain (revisit)",
      "Retire",
      "Repurchase",
      "Refactor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Retain là tạm thời giữ lại workload on-premises để xem xét lại sau, phù hợp khi chưa sẵn sàng migrate.\n✓ Retain (revisit) — đúng, giữ lại on-premises và đánh giá lại sau.\n✗ Retire — loại bỏ ứng dụng không còn dùng, nhưng ở đây vẫn cần dùng.\n✗ Repurchase — thay bằng sản phẩm khác, không phải giữ nguyên.\n✗ Refactor — viết lại ứng dụng, ngược với việc tạm hoãn di chuyển.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-013",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company migrates from on-premises data center to AWS. Previously they had to purchase servers upfront with large fixed costs regardless of usage level. Which cost characteristic of the cloud model helps them pay only for the resources they actually use?",
    "options": [
      "Variable cost based on usage level",
      "Fixed cost paid upfront",
      "Sunk cost of old hardware",
      "Capital expenditure (CapEx) for data center"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cloud chuyển chi phí từ cố định (CapEx) sang biến đổi (OpEx) trả theo nhu cầu sử dụng thực tế.\n✓ Variable cost theo mức sử dụng — đúng, pay-as-you-go đặc trưng của cloud.\n✗ Fixed cost trả trước — chính là mô hình on-premises mà họ muốn rời bỏ.\n✗ Sunk cost của phần cứng cũ — chi phí đã chi, không liên quan cách trả tiền cloud.\n✗ CapEx cho data center — đầu tư vốn lớn, ngược với mô hình biến đổi của cloud.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-013",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup does not want to invest large upfront capital to purchase physical servers. They want to convert infrastructure costs into gradually paid operating costs. Which economic benefit of cloud describes this?",
    "options": [
      "Converting CapEx to OpEx",
      "Increasing initial sunk cost",
      "Fixed monthly cost regardless of load",
      "Completely eliminating all software costs"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cloud cho phép trả theo mức dùng, biến đầu tư vốn (CapEx) thành chi phí vận hành (OpEx).\n✓ Chuyển CapEx thành OpEx — đúng, không cần mua trước phần cứng.\n✗ Tăng sunk cost ban đầu — ngược lại, cloud giúp tránh sunk cost.\n✗ Cố định chi phí hằng tháng bất kể tải — cloud là biến đổi theo nhu cầu, không cố định.\n✗ Loại bỏ hoàn toàn mọi chi phí phần mềm — không đúng, vẫn có chi phí license/dịch vụ.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-013",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company finds many EC2 instances running with much larger size than actual CPU and RAM usage. They want to reduce costs while still meeting load requirements. What is the most appropriate approach?",
    "options": [
      "Rightsizing instances to smaller types matching the load",
      "Purchasing additional Reserved Instances for current large instances",
      "Enabling Multi-AZ for all instances",
      "Converting entirely to Dedicated Hosts"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rightsizing điều chỉnh tài nguyên về đúng nhu cầu thực tế để cắt lãng phí chi phí.\n✓ Rightsizing về loại nhỏ hơn — đúng, loại bỏ tài nguyên dư thừa.\n✗ Mua Reserved Instances cho instance lớn — cam kết dài hạn cho tài nguyên đang lãng phí, càng tốn.\n✗ Bật Multi-AZ cho mọi instance — tăng tính sẵn sàng nhưng tăng chi phí, không giải quyết lãng phí.\n✗ Chuyển sang Dedicated Hosts — đắt hơn, không liên quan việc instance quá lớn.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-014",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company already owns Windows Server and SQL Server licenses purchased previously, still valid. They want to utilize these licenses when running workload on AWS to avoid paying for licenses again. What option is appropriate?",
    "options": [
      "Bring Your Own License (BYOL)",
      "License-included instances",
      "Spot Instances",
      "Savings Plans"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "BYOL cho phép dùng lại license đã mua, tránh trả phí license lần nữa qua AWS.\n✓ Bring Your Own License (BYOL) — đúng, tận dụng license đang có.\n✗ License-included instances — giá đã gồm phí license, sẽ trả lại tiền cho phần mềm họ đã sở hữu.\n✗ Spot Instances — chỉ là mô hình giá compute, không liên quan license.\n✗ Savings Plans — mô hình giảm giá compute theo cam kết, không xử lý license.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-014",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A new company, without any existing software licenses, wants to run Windows Server on EC2 without having to self-manage license purchasing and compliance. What is the simplest option for them?",
    "options": [
      "Use license-included EC2 instances",
      "Purchase BYOL and self-manage compliance",
      "Run on Spot Instances to avoid licensing",
      "Use Dedicated Hosts with old licenses"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "License-included gói chi phí phần mềm vào giá instance, AWS lo việc cấp phép giúp công ty không có sẵn license.\n✓ License-included EC2 instances — đúng, giá đã gồm license, không cần tự quản lý.\n✗ Mua BYOL và tự quản lý — cần đã sở hữu license và phải lo tuân thủ.\n✗ Chạy Spot để né license — Spot là mô hình giá, không miễn license.\n✗ Dedicated Hosts với license cũ — họ không có license cũ để dùng.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-014",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company notices many AWS service prices have decreased over time. What is the main economic reason that enables AWS to continuously reduce prices and pass savings to customers?",
    "options": [
      "Economies of scale",
      "Customer sunk cost",
      "Fixed cost of customer data center",
      "Customer BYOL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy mô khổng lồ của AWS giúp giảm chi phí đơn vị và chuyển phần tiết kiệm cho khách hàng.\n✓ Economies of scale — đúng, mua khối lượng lớn giảm chi phí, kéo giá xuống.\n✗ Sunk cost của khách hàng — không liên quan việc AWS giảm giá.\n✗ Fixed cost của data center khách hàng — đây là chi phí phía khách, không phải lý do AWS giảm giá.\n✗ BYOL của khách hàng — chỉ liên quan license, không phải lý do giảm giá tổng thể.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-015",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "When comparing total cost of ownership (TCO) between on-premises and cloud, the finance team realizes on-premises has many hidden costs beyond server purchase price. Which of the following is an on-premises cost that cloud typically helps eliminate or significantly reduce?",
    "options": [
      "Electricity, cooling and data center space costs",
      "AWS egress bandwidth costs",
      "Savings Plans costs",
      "Costs of management API calls via AWS CLI"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "On-premises gánh nhiều chi phí cơ sở vật chất mà nhà cung cấp cloud hấp thụ nhờ quy mô.\n✓ Chi phí điện, làm mát, không gian — đúng, là chi phí on-premises cloud giúp loại bỏ.\n✗ Băng thông egress trên AWS — đây là chi phí phát sinh khi đã ở trên cloud.\n✗ Chi phí Savings Plans — là cơ chế giảm giá trên cloud, không phải chi phí on-premises.\n✗ Chi phí gọi API quản lý qua AWS CLI — bản thân lời gọi API quản lý không tính phí, không liên quan.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-015",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company wants to use automation to reduce costs and increase operational efficiency on AWS. Which benefits below come from automation? (Choose 2)",
    "options": [
      "Automatically shutting down dev environments outside business hours to save costs",
      "Auto Scaling automatically adds/removes EC2 based on load, avoiding payment for excess resources",
      "Automatically eliminating all data transfer costs",
      "Ensuring EC2 price is always fixed regardless of region",
      "Automatically converting all licenses to free"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Automation giúp khớp tài nguyên với nhu cầu thực, cắt lãng phí và công sức thủ công.\n✓ Tự động tắt môi trường dev ngoài giờ — đúng, chỉ trả tiền khi cần dùng.\n✓ Auto Scaling theo tải — đúng, tránh trả cho tài nguyên dư thừa.\n✗ Loại bỏ mọi chi phí truyền dữ liệu — automation không xóa được phí data transfer.\n✗ Giá EC2 cố định bất kể vùng — giá khác nhau theo Region, automation không làm cố định.\n✗ Chuyển license sang miễn phí — automation không khiến license trở nên miễn phí.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-015",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A large enterprise is planning digital transformation and needs to estimate AWS solution costs to compare with on-premises to convince leadership. Which AWS tool is best suited to model and estimate AWS costs beforehand?",
    "options": [
      "AWS Pricing Calculator to estimate and compare solution costs on AWS",
      "AWS Cost Explorer to view current on-premises costs",
      "AWS Budgets to block on-premises spending",
      "Amazon CloudWatch to measure data center electricity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Pricing Calculator cho phép mô hình hóa và ước tính chi phí giải pháp AWS trước khi triển khai để so sánh phương án.\n✓ AWS Pricing Calculator — đúng, ước tính trước chi phí và so sánh phương án.\n✗ Cost Explorer xem chi phí on-premises — Cost Explorer chỉ phân tích chi phí AWS đã phát sinh, không đọc on-premises.\n✗ AWS Budgets chặn chi tiêu on-premises — Budgets cảnh báo/quản lý ngân sách AWS, không kiểm soát on-premises.\n✗ CloudWatch đo điện năng data center — CloudWatch giám sát tài nguyên AWS, không đo điện on-premises.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-016",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company has workload running stably 24/7 for the next 3 years. Currently using On-Demand with high costs. They want to reduce compute costs the most while keeping workload always running. Which economic principle does this exemplify and what is the appropriate option?",
    "options": [
      "Long-term commitment in exchange for lower price — use Reserved Instances or Savings Plans",
      "Pay highest variable price — keep On-Demand",
      "Leverage excess hardware with interruptions — use Spot Instances for non-interruptible 24/7 workload",
      "Completely eliminate compute costs using Free Tier forever"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cam kết dài hạn cho tải ổn định đổi lấy mức giá thấp hơn đáng kể so với On-Demand.\n✓ Cam kết dài hạn với Reserved Instances/Savings Plans — đúng, lý tưởng cho tải ổn định 24/7.\n✗ Giữ nguyên On-Demand — chính là mô hình đắt mà họ muốn rời bỏ.\n✗ Spot cho workload không gián đoạn — Spot có thể bị thu hồi, không hợp với yêu cầu luôn chạy.\n✗ Free Tier vĩnh viễn — Free Tier giới hạn và phần lớn chỉ 12 tháng, không đủ cho production 24/7.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "clf-m2-016",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company experiences traffic spikes during holidays and very low traffic on regular days. On-premises they had to purchase excess hardware for peak load causing waste most of the time. Which cloud benefit best solves this problem?",
    "options": [
      "Elasticity — scale resources to demand, pay only for what's being used",
      "Sunk cost — accept excess hardware",
      "Fixed cost — fix capacity to peak load",
      "CapEx — invest capital for peak capacity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elasticity cho phép tăng/giảm tài nguyên theo tải, tránh phải đầu tư dư cho đỉnh tải.\n✓ Elasticity — đúng, scale theo nhu cầu và chỉ trả cho phần dùng.\n✗ Sunk cost chấp nhận dư — chính là vấn đề lãng phí họ muốn tránh.\n✗ Fixed cost cố định theo đỉnh — vẫn lãng phí khi tải thấp, không khác on-premises.\n✗ CapEx cho công suất đỉnh — đầu tư vốn dư thừa, ngược với mục tiêu.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "clf-m3-016",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A CIO presents economic benefits of cloud migration to leadership. Which statements below ACCURATELY describe economic benefits of cloud compared to on-premises? (Choose 2)",
    "options": [
      "Pay by demand instead of investing upfront for peak capacity",
      "Eliminate the need to self-operate and maintain physical data center",
      "All data transfer costs to Internet are free",
      "Never need to optimize or rightsize because cloud is inherently cheapest",
      "Unit price increases over time as AWS scale grows"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Cloud cho phép trả theo nhu cầu và loại bỏ gánh nặng vận hành data center.\n✓ Trả theo nhu cầu thay vì đầu tư trước — đúng, đặc trưng kinh tế cốt lõi của cloud.\n✓ Loại bỏ tự vận hành/bảo trì data center vật lý — đúng, AWS lo phần hạ tầng.\n✗ Mọi chi phí truyền dữ liệu ra Internet miễn phí — sai, egress thường tính phí.\n✗ Không bao giờ cần rightsizing — sai, tối ưu chi phí vẫn rất cần thiết.\n✗ Giá đơn vị tăng dần khi quy mô AWS lớn lên — sai, economies of scale giúp giá đơn vị giảm dần.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "clf-m1-017",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A newly AWS-migrated company asks: who is responsible for physical security of the data centers running their EC2 service?",
    "options": [
      "AWS is responsible for physical security of data centers",
      "Customer must assign employees to guard the data center",
      "Customer shares physical security costs with AWS by the hour",
      "Third party hired by customer is responsible for physical security"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "An ninh vật lý của hạ tầng (data center, phần cứng) luôn thuộc 'security OF the cloud' do AWS đảm nhận.\n✓ AWS chịu trách nhiệm bảo mật vật lý — đúng, đây là phần security of the cloud.\n✗ Khách hàng tự canh gác — sai, khách hàng không được tiếp cận data center.\n✗ Chia sẻ chi phí an ninh theo giờ — sai, không có mô hình như vậy.\n✗ Bên thứ ba do khách hàng thuê — sai, AWS quản lý hoàn toàn hạ tầng vật lý.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-017",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company runs application on EC2 instance Linux. Under shared responsibility model, who is responsible for patching the guest OS on this instance?",
    "options": [
      "Customer is responsible for patching guest OS on EC2",
      "AWS automatically patches guest OS for all EC2 instances",
      "AWS Support team patches OS when customer opens a ticket",
      "Linux distro provider patches directly to the instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với EC2 (IaaS), guest OS thuộc phần 'security IN the cloud' của khách hàng.\n✓ Khách hàng patch guest OS — đúng, EC2 là IaaS nên OS do khách hàng quản lý.\n✗ AWS tự động patch guest OS — sai, AWS chỉ patch hạ tầng nền bên dưới hypervisor.\n✗ AWS Support patch OS — sai, Support không vá OS hộ khách hàng.\n✗ Nhà cung cấp distro patch trực tiếp — sai, không có cơ chế này trên EC2.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-017",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company switches from self-managed database on EC2 to Amazon RDS. Compared to running database on EC2 yourself, which responsibility of customer is TRANSFERRED to AWS when using RDS?",
    "options": [
      "Patching database engine and underlying OS",
      "Configuring database user accounts and permissions",
      "Managing data stored in the database",
      "Configuring security group controlling access to DB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS là managed service nên AWS đảm nhận patching OS và database engine, vốn là việc khách hàng phải làm khi tự chạy trên EC2.\n✓ Patch database engine và OS bên dưới — đúng, đây là phần được dịch chuyển sang AWS với RDS.\n✗ Cấu hình user và phân quyền DB — sai, vẫn thuộc khách hàng.\n✗ Quản lý dữ liệu trong DB — sai, dữ liệu luôn là trách nhiệm khách hàng.\n✗ Cấu hình security group — sai, kiểm soát truy cập mạng vẫn là việc khách hàng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-018",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An architect deploys AWS Lambda functions. In the following items, which item is NO LONGER a customer responsibility because Lambda manages it?",
    "options": [
      "Patching the operating system where the function runs",
      "Writing function code and managing code vulnerabilities",
      "Configuring IAM execution role for the function",
      "Encrypting and protecting sensitive data the function processes"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda là serverless nên AWS quản lý hệ điều hành và runtime nền; khách hàng chỉ lo code, IAM và dữ liệu.\n✓ Patch OS nơi hàm chạy — đúng, AWS quản lý OS với Lambda.\n✗ Viết code và quản lý lỗ hổng code — sai, vẫn là trách nhiệm khách hàng.\n✗ Cấu hình IAM execution role — sai, khách hàng phải cấu hình.\n✗ Mã hóa và bảo vệ dữ liệu — sai, dữ liệu luôn thuộc khách hàng.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-018",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company stores customer files on Amazon S3. They are concerned about unauthorized data access. According to shared responsibility model, who is responsible for configuring access permissions (bucket policy, block public access, encryption) for the bucket?",
    "options": [
      "Customer configures access permissions and encryption for the bucket",
      "AWS locks all buckets by default so customer doesn't need to do anything",
      "AWS automatically enables encryption and blocks public for all customer data",
      "AWS Trusted Advisor automatically fixes incorrect bucket configuration for customer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với S3, AWS bảo vệ hạ tầng lưu trữ nhưng cấu hình truy cập và mã hóa thuộc 'security in the cloud' của khách hàng.\n✓ Khách hàng cấu hình quyền và mã hóa — đúng, đây là trách nhiệm khách hàng.\n✗ AWS mặc định khóa mọi bucket — sai, khách hàng vẫn phải cấu hình đúng; Block Public Access bật mặc định nhưng phân quyền tổng thể vẫn do khách hàng.\n✗ AWS tự động bật mã hóa và chặn public — sai, đây là lựa chọn và trách nhiệm cấu hình của khách hàng.\n✗ Trusted Advisor tự sửa — sai, nó chỉ cảnh báo, không tự sửa cấu hình.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-018",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A security team wants to know which part AWS is responsible for in the model. Which statement CORRECTLY describes the general principle of shared responsibility model?",
    "options": [
      "AWS is responsible for 'security OF the cloud', customer is responsible for 'security IN the cloud'",
      "Customer is responsible for 'security OF the cloud', AWS is responsible for 'security IN the cloud'",
      "AWS is responsible for all security for all services",
      "Customer is responsible for all security for all services"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mô hình chia rõ: AWS lo hạ tầng (of the cloud), khách hàng lo những gì họ đặt lên đó (in the cloud).\n✓ AWS 'of the cloud', khách hàng 'in the cloud' — đúng, đây là nguyên tắc cốt lõi.\n✗ Khách hàng 'of the cloud' — sai, đảo ngược vai trò.\n✗ AWS chịu toàn bộ — sai, trách nhiệm được chia sẻ.\n✗ Khách hàng chịu toàn bộ — sai, AWS vẫn lo hạ tầng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-019",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company runs web application on EC2. Under shared responsibility model, which of the following items are CUSTOMER responsibility? (Choose 2)",
    "options": [
      "Configuring security groups and network ACLs",
      "Patching guest OS and application software on the instance",
      "Maintaining physical server hardware",
      "Managing the virtualization hypervisor",
      "Physical security of Availability Zone"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Với EC2 (IaaS), khách hàng quản lý OS, ứng dụng và cấu hình mạng logic; AWS lo phần cứng, hypervisor và an ninh vật lý.\n✓ Cấu hình security group và NACL — đúng, kiểm soát mạng logic thuộc khách hàng.\n✓ Patch guest OS và ứng dụng — đúng, thuộc khách hàng với EC2.\n✗ Bảo trì phần cứng máy chủ — sai, thuộc AWS.\n✗ Quản lý hypervisor — sai, AWS quản lý lớp ảo hóa.\n✗ Bảo mật vật lý của AZ — sai, thuộc AWS.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-019",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company compares running self-managed database on EC2 versus using Amazon RDS. With RDS, which of the following is still a customer responsibility?",
    "options": [
      "Configuring security group and data encryption (encryption at rest/in transit)",
      "Patching the underlying database operating system",
      "Installing and upgrading database engine",
      "Automatic backups and maintaining storage hardware"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS là managed service nên AWS lo OS, engine và phần cứng, nhưng kiểm soát truy cập mạng và quyết định mã hóa vẫn thuộc khách hàng.\n✓ Cấu hình security group và mã hóa — đúng, vẫn thuộc khách hàng với RDS.\n✗ Patch OS nền — sai, AWS đảm nhận với RDS.\n✗ Cài và nâng cấp engine — sai, AWS quản lý.\n✗ Sao lưu tự động và phần cứng — sai, AWS lo phần này.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-019",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An architect ranks EC2, RDS and Lambda by the level of OS management responsibility that customer must bear, from MOST to LEAST. Which order is correct?",
    "options": [
      "EC2 > RDS > Lambda",
      "Lambda > RDS > EC2",
      "RDS > EC2 > Lambda",
      "EC2 > Lambda > RDS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Càng managed thì trách nhiệm OS của khách hàng càng giảm: EC2 (IaaS) nhiều nhất, RDS (managed) ở giữa, Lambda (serverless) ít nhất.\n✓ EC2 > RDS > Lambda — đúng, phản ánh mức độ managed tăng dần.\n✗ Lambda > RDS > EC2 — sai, đảo ngược.\n✗ RDS > EC2 > Lambda — sai, EC2 đòi hỏi quản lý OS nhiều hơn RDS.\n✗ EC2 > Lambda > RDS — sai, Lambda ít trách nhiệm OS hơn RDS.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-020",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company uses S3 to store health data and enables server-side encryption with AWS-managed keys (SSE-S3). Which statement is CORRECT about encryption responsibility?",
    "options": [
      "Customer decides to ENABLE encryption and chooses the mechanism; AWS implements encryption/decryption at storage layer",
      "AWS automatically enables encryption so customer has no role in data protection",
      "Customer must write encryption algorithm themselves because AWS does not provide encryption for S3",
      "S3 data encryption is entirely AWS responsibility in all cases"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dữ liệu là trách nhiệm khách hàng: họ chọn bật và cấu hình mã hóa, còn AWS cung cấp và vận hành cơ chế mã hóa.\n✓ Khách hàng quyết định bật/chọn cơ chế, AWS thực thi — đúng, phản ánh đúng phân chia trách nhiệm.\n✗ Khách hàng không có vai trò gì — sai, cấu hình và dữ liệu thuộc khách hàng.\n✗ Khách hàng tự viết thuật toán — sai, AWS cung cấp sẵn cơ chế mã hóa.\n✗ Mã hóa hoàn toàn của AWS — sai, khách hàng vẫn quyết định và quản lý dữ liệu.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-020",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company is concerned about configuring IAM users, groups and managing employee access permissions. Under shared responsibility model, who is responsible for identity and access management (IAM) in the account?",
    "options": [
      "Customer is responsible for configuring and managing IAM in the account",
      "AWS automatically grants minimum privileges to customer employees",
      "AWS manages all IAM users on behalf of customer",
      "AWS hardware automatically restricts permissions by job role"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quản lý danh tính và quyền truy cập (IAM, MFA, phân quyền) thuộc 'security in the cloud' của khách hàng.\n✓ Khách hàng cấu hình và quản lý IAM — đúng, đây là trách nhiệm khách hàng.\n✗ AWS tự cấp quyền tối thiểu — sai, khách hàng tự thiết lập least privilege.\n✗ AWS quản lý toàn bộ IAM users — sai, khách hàng quản lý.\n✗ Phần cứng tự giới hạn quyền — sai, không có cơ chế như vậy.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-020",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company uses Amazon S3 (object storage). Under shared responsibility model, which items are AWS responsibility? (Choose 2)",
    "options": [
      "Maintaining infrastructure and physical storage hardware",
      "Patching underlying operating system of storage service",
      "Configuring bucket policy against public access",
      "Classifying sensitive data before uploading",
      "Managing IAM permissions for users accessing the bucket"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Với S3, AWS lo toàn bộ hạ tầng và phần mềm nền của dịch vụ; cấu hình truy cập và dữ liệu thuộc khách hàng.\n✓ Bảo trì hạ tầng/phần cứng lưu trữ — đúng, thuộc AWS.\n✓ Patch OS nền của dịch vụ — đúng, AWS quản lý nền tảng S3.\n✗ Cấu hình bucket policy — sai, thuộc khách hàng.\n✗ Phân loại dữ liệu nhạy cảm — sai, dữ liệu là trách nhiệm khách hàng.\n✗ Quản lý IAM permissions — sai, thuộc khách hàng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-021",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An auditor asks why customer responsibility differs between EC2 and Lambda even though both run application code. Which explanation is most accurate?",
    "options": [
      "Lambda is serverless so AWS manages OS/runtime; EC2 is IaaS so customers manage the OS",
      "EC2 and Lambda have identical customer responsibilities since both run code",
      "Lambda requires customers to patch the runtime while EC2 requires AWS to patch the OS",
      "The different responsibilities are due to pricing, not architecture"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ranh giới trách nhiệm dịch chuyển theo mức độ managed của dịch vụ; serverless đẩy nhiều việc OS sang AWS.\n✓ Lambda serverless nên AWS quản OS/runtime, EC2 IaaS nên khách hàng tự quản — đúng.\n✗ Trách nhiệm giống hệt nhau — sai, khác nhau theo mô hình dịch vụ.\n✗ Lambda buộc khách hàng patch runtime — sai, AWS patch runtime Lambda.\n✗ Khác do giá — sai, do kiến trúc/mức managed.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-021",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company deploys an application using EC2 behind an Application Load Balancer, storing data in RDS. Across this entire architecture, which item is ALWAYS the customer's responsibility regardless of service?",
    "options": [
      "Protection and classification of application customer data",
      "Patching the operating system of RDS instances",
      "Physical hardware maintenance of the Load Balancer",
      "Managing the hypervisor software running EC2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Customer data luôn nằm ở phía khách hàng trong shared responsibility model, không phụ thuộc dịch vụ nào.\n✓ Bảo vệ và phân loại customer data — đúng, luôn thuộc khách hàng.\n✗ Patch OS của RDS — sai, AWS lo với RDS managed.\n✗ Bảo trì phần cứng Load Balancer — sai, thuộc AWS.\n✗ Quản lý hypervisor — sai, thuộc AWS.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-021",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An administrator wants to restrict network traffic to EC2 instances, allowing only port 443 (HTTPS) from the Internet. According to the shared responsibility model, who is responsible for configuring this security group?",
    "options": [
      "The customer configures the security group to control traffic",
      "AWS automatically configures the security group based on application type",
      "AWS Support configures the security group upon request",
      "The network provider (ISP) configures the security group automatically"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cấu hình mạng logic như security group là 'security in the cloud' thuộc khách hàng.\n✓ Khách hàng cấu hình security group — đúng, kiểm soát firewall logic thuộc khách hàng.\n✗ AWS tự cấu hình theo ứng dụng — sai, AWS không tự đoán quy tắc.\n✗ AWS Support cấu hình — sai, Support không làm thay.\n✗ ISP cấu hình — sai, security group thuộc khách hàng trong VPC.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-022",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company needs to download AWS compliance reports such as SOC 2 and ISO 27001 to provide to their audit department. Which service allows them to access and download these documents on-demand?",
    "options": [
      "AWS Artifact",
      "AWS Audit Manager",
      "AWS Config",
      "AWS CloudTrail"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Artifact là kho tự phục vụ cung cấp các báo cáo tuân thủ và thỏa thuận của AWS như SOC, ISO, PCI.\n✓ AWS Artifact — đúng, cho phép tải on-demand các báo cáo compliance của AWS.\n✗ AWS Audit Manager — tự động thu thập bằng chứng cho audit của bạn, không phải kho báo cáo của AWS.\n✗ AWS Config — đánh giá cấu hình tài nguyên, không cung cấp báo cáo compliance của AWS.\n✗ AWS CloudTrail — ghi log API, không cung cấp tài liệu chứng nhận.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-022",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to record all API calls in their AWS account for auditing purposes and to investigate who performed which actions. Which service is most suitable?",
    "options": [
      "AWS CloudTrail",
      "Amazon CloudWatch",
      "AWS Trusted Advisor",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS CloudTrail ghi lại lịch sử các lệnh gọi API (ai, khi nào, từ đâu) phục vụ audit và điều tra.\n✓ AWS CloudTrail — đúng, ghi log hoạt động API cho mục đích audit.\n✗ Amazon CloudWatch — giám sát metrics và logs vận hành, không tập trung vào audit API.\n✗ AWS Trusted Advisor — đưa ra khuyến nghị tối ưu, không ghi log API.\n✗ Amazon Inspector — quét lỗ hổng bảo mật, không ghi lịch sử API.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-022",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to continuously assess whether AWS resource configurations (such as S3 buckets and security groups) comply with internal policies and automatically detect violations. Which service is most suitable?",
    "options": [
      "AWS Config",
      "AWS CloudTrail",
      "Amazon GuardDuty",
      "AWS Artifact"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Config theo dõi và đánh giá liên tục cấu hình tài nguyên so với các rule tuân thủ.\n✓ AWS Config — đúng, giám sát cấu hình và đánh giá compliance theo rule.\n✗ AWS CloudTrail — ghi lại lệnh gọi API, không đánh giá tuân thủ cấu hình theo rule.\n✗ Amazon GuardDuty — phát hiện mối đe dọa qua phân tích log, không kiểm tra cấu hình theo chính sách.\n✗ AWS Artifact — cung cấp báo cáo compliance của AWS, không đánh giá tài nguyên của bạn.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-023",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A bank wants to detect unusual activity and threats such as unauthorized access and suspicious API calls by intelligently analyzing VPC Flow Logs, DNS logs, and CloudTrail logs. Which service is most suitable?",
    "options": [
      "Amazon GuardDuty",
      "AWS Config",
      "Amazon Inspector",
      "AWS Shield"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon GuardDuty là dịch vụ phát hiện mối đe dọa thông minh, phân tích VPC Flow Logs, DNS logs và CloudTrail logs.\n✓ Amazon GuardDuty — đúng, threat detection dựa trên phân tích log thông minh.\n✗ AWS Config — đánh giá cấu hình tài nguyên, không phát hiện threat.\n✗ Amazon Inspector — quét lỗ hổng phần mềm/EC2, không phân tích log threat.\n✗ AWS Shield — bảo vệ chống DDoS, không phân tích hành vi bất thường tổng quát.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-023",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's security team wants a centralized dashboard to aggregate security findings from GuardDuty, Inspector and compliance checks against standards such as CIS and PCI DSS across multiple accounts. Which service is most suitable?",
    "options": [
      "AWS Security Hub",
      "Amazon CloudWatch",
      "AWS CloudTrail",
      "AWS Artifact"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Security Hub tổng hợp findings từ nhiều dịch vụ bảo mật và đối chiếu với các chuẩn tuân thủ trong một dashboard tập trung.\n✓ AWS Security Hub — đúng, trung tâm tổng hợp findings và đánh giá theo security standards.\n✗ Amazon CloudWatch — giám sát vận hành, không tổng hợp findings bảo mật theo chuẩn.\n✗ AWS CloudTrail — ghi log API, không tổng hợp các phát hiện bảo mật.\n✗ AWS Artifact — kho báo cáo compliance của AWS, không phải dashboard findings.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-023",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to scan EC2 instances and container images in ECR to automatically detect software vulnerabilities (CVEs) and unintended network exposure. Which service is most suitable?",
    "options": [
      "Amazon Inspector",
      "Amazon GuardDuty",
      "AWS Config",
      "AWS Security Hub"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon Inspector tự động quét lỗ hổng phần mềm (CVE) và phơi nhiễm mạng cho EC2 và container image.\n✓ Amazon Inspector — đúng, đánh giá lỗ hổng (vulnerability assessment) cho workload.\n✗ Amazon GuardDuty — phát hiện threat qua log, không quét CVE phần mềm.\n✗ AWS Config — đánh giá cấu hình tài nguyên, không quét lỗ hổng phần mềm.\n✗ AWS Security Hub — tổng hợp findings, bản thân không quét lỗ hổng (nhận từ Inspector).",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-024",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to encrypt data at rest in S3 and EBS while managing the lifecycle and access to encryption keys centrally. Which service is most suitable?",
    "options": [
      "AWS Key Management Service (KMS)",
      "AWS Certificate Manager (ACM)",
      "AWS Secrets Manager",
      "AWS Shield"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS KMS tạo và quản lý khóa mã hóa tập trung, tích hợp với S3, EBS và nhiều dịch vụ để mã hóa dữ liệu at rest.\n✓ AWS Key Management Service (KMS) — đúng, quản lý khóa cho mã hóa at rest.\n✗ AWS Certificate Manager (ACM) — quản lý SSL/TLS certificate cho mã hóa in transit.\n✗ AWS Secrets Manager — lưu và xoay vòng secrets/credentials, không phải khóa mã hóa dữ liệu.\n✗ AWS Shield — bảo vệ DDoS, không liên quan mã hóa.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-024",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to ensure data is encrypted in transit between users and a web application behind an Application Load Balancer. They need to provision and automatically renew SSL/TLS certificates for free. Which service is most suitable?",
    "options": [
      "AWS Certificate Manager (ACM)",
      "AWS KMS",
      "AWS Artifact",
      "Amazon Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Certificate Manager (ACM) cung cấp và tự động gia hạn chứng chỉ SSL/TLS để bật mã hóa in transit (HTTPS).\n✓ AWS Certificate Manager (ACM) — đúng, quản lý certificate cho encryption in transit.\n✗ AWS KMS — quản lý khóa mã hóa cho dữ liệu at rest, không cấp SSL/TLS cert.\n✗ AWS Artifact — kho báo cáo compliance, không cấp certificate.\n✗ Amazon Macie — phát hiện dữ liệu nhạy cảm trong S3, không liên quan TLS.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-024",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A web application is experiencing large Layer 3/4 DDoS attacks. A company wants automatic protection for resources like CloudFront, ELB, and Route 53. Which service is designed for this purpose?",
    "options": [
      "AWS Shield",
      "Amazon GuardDuty",
      "AWS WAF",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Shield cung cấp bảo vệ chống DDoS cho các dịch vụ như CloudFront, ELB và Route 53.\n✓ AWS Shield — đúng, chuyên bảo vệ chống DDoS lớp mạng (L3/L4).\n✗ Amazon GuardDuty — phát hiện threat qua log, không chống DDoS.\n✗ AWS WAF — lọc traffic lớp ứng dụng (Layer 7), không chuyên chống DDoS L3/L4.\n✗ Amazon Inspector — quét lỗ hổng, không chống DDoS.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-025",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A healthcare organization needs to continuously collect evidence automatically to prepare for audits under frameworks like HIPAA and SOC 2, reducing manual effort. Which service is most suitable?",
    "options": [
      "AWS Audit Manager",
      "AWS Artifact",
      "AWS Config",
      "AWS Security Hub"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Audit Manager tự động thu thập bằng chứng và ánh xạ vào các khung tuân thủ như HIPAA, SOC 2 để chuẩn bị audit.\n✓ AWS Audit Manager — đúng, tự động hóa thu thập evidence cho audit.\n✗ AWS Artifact — cung cấp báo cáo compliance của AWS, không thu thập evidence từ workload của bạn.\n✗ AWS Config — đánh giá cấu hình, không quản lý quy trình audit theo framework.\n✗ AWS Security Hub — tổng hợp findings bảo mật, không tạo gói bằng chứng audit.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-025",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to store EU citizen data and comply with GDPR while ensuring data never leaves Europe. Which approach aligns best with AWS's regional compliance model?",
    "options": [
      "Choose AWS Regions located in Europe (such as eu-west-1) to store the data",
      "Enable AWS Shield Advanced for the entire account",
      "Rely on AWS to automatically move data to the correct region",
      "Use any Edge Location nearby"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khách hàng kiểm soát Region nơi dữ liệu được lưu; chọn Region tại châu Âu giúp giữ dữ liệu trong khu vực để hỗ trợ tuân thủ GDPR.\n✓ Chọn AWS Region tại châu Âu — đúng, khách hàng kiểm soát vị trí lưu trữ dữ liệu theo Region.\n✗ Bật AWS Shield Advanced — chống DDoS, không liên quan data residency.\n✗ Dựa vào AWS tự di chuyển — sai, AWS không tự ý di chuyển dữ liệu giữa các Region.\n✗ Dùng Edge Location gần nhất — Edge phục vụ caching CDN, không quyết định nơi lưu trữ dữ liệu gốc.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-025",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company is building a comprehensive security monitoring strategy. They need (1) threat detection from log analysis and (2) a centralized place to aggregate and prioritize security findings across multiple accounts. Select TWO suitable services.",
    "options": [
      "Amazon GuardDuty",
      "AWS Security Hub",
      "AWS Artifact",
      "Amazon CloudFront",
      "AWS Budgets"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "GuardDuty phát hiện threat từ phân tích log, còn Security Hub tổng hợp và ưu tiên findings tập trung trên nhiều tài khoản.\n✓ Amazon GuardDuty — đúng, threat detection dựa trên log.\n✓ AWS Security Hub — đúng, tổng hợp và ưu tiên findings bảo mật tập trung.\n✗ AWS Artifact — kho báo cáo compliance, không phát hiện hay tổng hợp findings.\n✗ Amazon CloudFront — CDN, không phải dịch vụ bảo mật giám sát.\n✗ AWS Budgets — quản lý chi phí, không liên quan bảo mật.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-026",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to monitor the number of rejected requests (4xx errors) on an application and receive automatic alerts when exceeding a threshold so the operations team can respond quickly. Which service is most suitable?",
    "options": [
      "Amazon CloudWatch (with alarms)",
      "AWS CloudTrail",
      "AWS Config",
      "AWS Artifact"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon CloudWatch thu thập metrics, logs và cho phép tạo alarm để cảnh báo tự động khi vượt ngưỡng.\n✓ Amazon CloudWatch (với alarm) — đúng, giám sát metrics và cảnh báo theo ngưỡng.\n✗ AWS CloudTrail — ghi log API cho audit, không tạo alarm metrics vận hành.\n✗ AWS Config — đánh giá cấu hình tài nguyên, không cảnh báo metrics ứng dụng.\n✗ AWS Artifact — cung cấp báo cáo compliance, không giám sát.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-026",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "After a security incident, the investigation team needs to identify exactly which API call changed a security group and who performed it, while also checking how the resource configuration changed over time. Which two services should they use together?",
    "options": [
      "AWS CloudTrail and AWS Config",
      "Amazon GuardDuty and AWS Shield",
      "AWS Artifact and Audit Manager",
      "Amazon Inspector and Amazon Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudTrail cho biết ai gọi API nào, Config cho biết lịch sử thay đổi cấu hình của tài nguyên theo thời gian — kết hợp giúp điều tra đầy đủ.\n✓ AWS CloudTrail và AWS Config — đúng, CloudTrail trả lời 'ai/khi nào' còn Config trả lời 'cấu hình thay đổi ra sao'.\n✗ Amazon GuardDuty và AWS Shield — phát hiện threat và chống DDoS, không truy vết lịch sử API/cấu hình chi tiết.\n✗ AWS Artifact và Audit Manager — liên quan tài liệu và evidence audit, không điều tra thay đổi cụ thể.\n✗ Amazon Inspector và Amazon Macie — quét lỗ hổng và phát hiện dữ liệu nhạy cảm, không truy vết thay đổi cấu hình.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-026",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A fintech company needs to verify that AWS complies with PCI DSS standards for processing payment card data and wants to obtain AWS's PCI certification for their own audit records. Which service should they use to get this document?",
    "options": [
      "AWS Artifact",
      "Amazon Inspector",
      "AWS CloudTrail",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Artifact cung cấp các chứng nhận tuân thủ của AWS như PCI DSS để khách hàng tải về phục vụ audit của họ.\n✓ AWS Artifact — đúng, nơi tải chứng nhận PCI DSS và các báo cáo compliance khác của AWS.\n✗ Amazon Inspector — quét lỗ hổng workload, không cấp tài liệu PCI của AWS.\n✗ AWS CloudTrail — ghi log API, không cung cấp chứng nhận.\n✗ Amazon GuardDuty — phát hiện threat, không cung cấp tài liệu tuân thủ.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-027",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company just created a new AWS account. According to AWS best practices, which action should be taken immediately with the root user to protect the account?",
    "options": [
      "Enable MFA for the root user and stop using it for daily tasks",
      "Create access keys for the root user for automated scripts",
      "Share the root password with the operations team for convenience",
      "Attach AdministratorAccess policy directly to the root user"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS khuyến nghị bật MFA cho root và chỉ dùng root cho các tác vụ bắt buộc, còn lại dùng IAM user/role.\n✓ Bật MFA cho root và ngừng dùng hằng ngày — đúng best practice bảo vệ tài khoản.\n✗ Tạo access key cho root — nên tránh, dễ lộ và rủi ro cao.\n✗ Chia sẻ mật khẩu root — vi phạm nguyên tắc bảo mật, không có trách nhiệm cá nhân.\n✗ Gắn AdministratorAccess vào root — root đã có toàn quyền, gắn policy là thừa và sai cách.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-027",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An administrator needs to grant the same set of permissions to 20 new employees in the accounting department. What is the most efficient and maintainable way to manage permissions?",
    "options": [
      "Create an IAM group for the accounting department, attach a policy to the group, then add users to the group",
      "Attach policies directly to each IAM user individually",
      "Create 20 IAM roles and require each employee to assume a role",
      "Use a single IAM user shared by all 20 employees"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM group cho phép gắn policy một lần và áp dụng cho nhiều user, dễ quản lý và mở rộng.\n✓ Tạo group, gắn policy vào group — đúng, quản lý tập trung và dễ bảo trì.\n✗ Gắn policy vào từng user — tốn công, dễ sai sót khi cần thay đổi.\n✗ Tạo 20 role để user assume — phức tạp không cần thiết cho quyền truy cập thường xuyên.\n✗ Dùng chung một user — mất khả năng truy vết cá nhân, vi phạm bảo mật.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-027",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An application running on EC2 needs to read data from an S3 bucket. What is the MOST SECURE way to grant permissions?",
    "options": [
      "Attach an IAM role with S3 read permissions to the EC2 instance",
      "Save an IAM user's access key in a configuration file on EC2",
      "Hard-code access key and secret key in the application source code",
      "Use the root user's access key for the application"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role cho EC2 cung cấp credentials tạm thời tự động xoay vòng, không cần lưu key tĩnh.\n✓ Gắn IAM role vào EC2 — đúng, an toàn nhất, không lộ key.\n✗ Lưu access key vào file cấu hình — key tĩnh dễ bị lộ và phải tự xoay vòng.\n✗ Hard-code key trong mã nguồn — cực kỳ rủi ro, dễ rò rỉ qua source control.\n✗ Dùng access key root — vi phạm nghiêm trọng best practice.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-028",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants employees to log in to AWS using their existing Active Directory accounts and access multiple AWS accounts centrally. Which service is most suitable?",
    "options": [
      "AWS IAM Identity Center (AWS Single Sign-On)",
      "Create separate IAM users in each account for each employee",
      "Amazon Cognito user pools",
      "AWS Secrets Manager"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM Identity Center cho phép SSO và quản lý truy cập tập trung vào nhiều account, tích hợp được với Active Directory.\n✓ IAM Identity Center (SSO) — đúng, đăng nhập tập trung và liên kết AD.\n✗ Tạo IAM user trong từng account — không tập trung, khó quản lý ở quy mô lớn.\n✗ Cognito user pools — dành cho xác thực người dùng của ứng dụng web/mobile, không phải quản trị AWS.\n✗ Secrets Manager — quản lý secrets, không liên quan đăng nhập nhân viên.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-028",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A developer only needs permissions to start and stop EC2 instances in the dev environment, but the current IAM policy grants full EC2 permissions. Which principle does this violate and how should it be fixed?",
    "options": [
      "Violates least privilege; the policy should be limited to only start/stop permissions needed",
      "Violates high availability; additional availability zones should be deployed",
      "Violates elasticity; Auto Scaling should be enabled for instances",
      "No violation; granting full EC2 permissions to developers is standard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Least privilege yêu cầu chỉ cấp đúng quyền tối thiểu cần để hoàn thành công việc.\n✓ Vi phạm least privilege, thu hẹp quyền về start/stop — đúng.\n✗ High availability — liên quan độ sẵn sàng hệ thống, không phải quyền.\n✗ Elasticity — liên quan co giãn tài nguyên, không liên quan quyền IAM.\n✗ Cấp full quyền là chuẩn — sai, mâu thuẫn trực tiếp với least privilege.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-028",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Account A (production) needs to allow a service in Account B (CI/CD) to deploy resources without creating a shared IAM user. Which mechanism is most suitable?",
    "options": [
      "Create a cross-account IAM role in Account A and allow Account B to assume that role",
      "Create an IAM user in Account A and send the access key to Account B",
      "Enable MFA for the root user of both accounts",
      "Store Account A's credentials in Secrets Manager in Account B"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cross-account role cho phép Account B assume role tạm thời để truy cập Account A mà không cần chia sẻ key tĩnh.\n✓ Cross-account IAM role để Account B assume — đúng, an toàn và đúng mô hình.\n✗ Tạo IAM user và gửi access key — key tĩnh chia sẻ, rủi ro lộ và khó xoay vòng.\n✗ Bật MFA cho root — không giải quyết vấn đề truy cập cross-account.\n✗ Lưu credentials vào Secrets Manager — vẫn dùng key tĩnh, không bằng role tạm thời.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-029",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company wants to increase security for IAM user login. Which measures below are appropriate? (Select 2)",
    "options": [
      "Enable MFA for IAM users",
      "Establish a password policy requiring minimum length and complexity",
      "Disable CloudTrail to reduce logging",
      "Share a common access key set with the entire department",
      "Grant AdministratorAccess to all users to avoid permission denials"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "MFA và password policy đều là biện pháp tăng cường bảo mật đăng nhập theo best practice.\n✓ Bật MFA — thêm lớp xác thực, ngăn truy cập trái phép.\n✓ Password policy độ dài/phức tạp — buộc mật khẩu mạnh hơn.\n✗ Tắt CloudTrail — giảm khả năng audit, làm yếu bảo mật.\n✗ Chia sẻ access key chung — mất truy vết, rủi ro lộ key.\n✗ Cấp AdministratorAccess cho mọi user — vi phạm least privilege.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-029",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An application needs to store a database password and automatically rotate it on a schedule. Which AWS service is most suitable?",
    "options": [
      "AWS Secrets Manager",
      "AWS IAM",
      "Amazon S3 with SSE encryption",
      "AWS Certificate Manager"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager lưu trữ và tự động xoay vòng credentials như mật khẩu database.\n✓ Secrets Manager — đúng, hỗ trợ rotation tự động cho secrets.\n✗ IAM — quản lý danh tính và quyền, không lưu mật khẩu DB.\n✗ S3 với SSE — lưu object mã hóa nhưng không có rotation cho secrets.\n✗ Certificate Manager — quản lý chứng chỉ SSL/TLS, không phải mật khẩu DB.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-029",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company needs to upgrade its AWS Support plan from Developer to Business. Who can perform this task?",
    "options": [
      "The root user, or an IAM identity with appropriate support permissions, as this is an account-level task",
      "Any IAM user with EC2 permissions",
      "Only AWS Support can perform this change for the company",
      "Only an IAM role attached to an EC2 instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thay đổi gói Support là tác vụ cấp account, do root user hoặc IAM identity được cấp quyền support phù hợp thực hiện.\n✓ Root user hoặc IAM identity có quyền support — đúng, đây là account-level task.\n✗ IAM user có quyền EC2 — quyền EC2 không liên quan tới quản lý gói Support.\n✗ Chỉ AWS Support tự thực hiện — không, khách hàng tự thay đổi gói.\n✗ Chỉ IAM role gắn EC2 — không phù hợp cho tác vụ cấp account.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-030",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "What is the fundamental difference between an IAM user and an IAM role?",
    "options": [
      "An IAM user is associated with a fixed identity and has long-term credentials; an IAM role is assumed temporarily and provides temporary credentials",
      "An IAM role always has a console password while an IAM user does not",
      "IAM users are only for AWS services, IAM roles are only for people",
      "IAM roles cannot have policies attached, while IAM users can"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM user là danh tính cố định với credentials lâu dài; IAM role được assume để nhận credentials tạm thời.\n✓ User cố định với credentials lâu dài, role assume tạm thời — đúng.\n✗ Role luôn có mật khẩu console — sai, role không có mật khẩu, được assume.\n✗ User chỉ cho dịch vụ, role chỉ cho người — sai, ngược lại và không tuyệt đối.\n✗ Role không thể gắn policy — sai, role có gắn permission policy.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-030",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Users log in via Google/Facebook to access an application with an AWS backend. The company does not want to create IAM users for each person. Which concept describes this solution?",
    "options": [
      "Identity federation (using an external provider for identity)",
      "Create an access key for each end user",
      "Attach an IAM group to each end user",
      "Enable password policy for end users"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Federation cho phép người dùng dùng danh tính bên ngoài (Google, Facebook, SAML) để nhận credentials tạm thời mà không cần IAM user.\n✓ Identity federation — đúng, dùng IdP bên ngoài, không cần tạo IAM user.\n✗ Tạo access key cho mỗi người dùng — không khả thi và không an toàn ở quy mô lớn.\n✗ Gắn IAM group cho người dùng cuối — group dành cho IAM user, không cho end-user app.\n✗ Bật password policy — không liên quan tới đăng nhập qua IdP bên ngoài.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-030",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Which tasks below can ONLY be performed by the root user of an AWS account? (Select 2)",
    "options": [
      "Close (close) an AWS account",
      "Change the name or email associated with the account (account settings)",
      "Launch an EC2 instance",
      "Create an S3 bucket",
      "Attach a policy to an IAM group"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Một số tác vụ cấp account chỉ root mới làm được, như đóng account và thay đổi thông tin liên hệ/email của account.\n✓ Đóng AWS account — chỉ root thực hiện được.\n✓ Thay đổi email/tên account — tác vụ account settings dành cho root.\n✗ Khởi động EC2 instance — IAM user/role với quyền phù hợp làm được.\n✗ Tạo S3 bucket — không cần root, chỉ cần quyền IAM.\n✗ Gắn policy cho IAM group — IAM admin user làm được, không cần root.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-031",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An IAM policy attached to a group contains 'Allow s3:GetObject', but another policy directly attached to a user has 'Deny s3:GetObject'. Can the user read the object?",
    "options": [
      "No, because explicit Deny always takes precedence over Allow",
      "Yes, because policy attached to user is always ignored",
      "Yes, because Allow from group overrides Deny from user",
      "It depends on the order in which policies were created"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong IAM, explicit Deny luôn thắng mọi Allow, bất kể gắn ở đâu.\n✓ Không, explicit Deny ưu tiên — đúng nguyên tắc đánh giá policy.\n✗ Policy user bị bỏ qua — sai, policy user vẫn được đánh giá.\n✗ Allow group ghi đè Deny — sai, Deny luôn thắng.\n✗ Tùy thứ tự tạo — sai, IAM không đánh giá theo thứ tự tạo.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-031",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An employee is leaving the company. Which action best ensures security according to IAM best practices?",
    "options": [
      "Disable/delete the employee's IAM user and revoke their access keys",
      "Change the root user password of the account",
      "Delete all IAM groups in the account",
      "Disable MFA for all remaining users"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi nhân viên rời đi, cần thu hồi quyền truy cập bằng cách vô hiệu hóa/xóa user và credentials của họ.\n✓ Vô hiệu hóa/xóa user và thu hồi access key — đúng, cắt quyền truy cập.\n✗ Đổi mật khẩu root — không liên quan trực tiếp tới user nhân viên.\n✗ Xóa toàn bộ IAM group — ảnh hưởng nhiều người không liên quan.\n✗ Tắt MFA cho user còn lại — làm yếu bảo mật, sai hoàn toàn.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-031",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to prevent developers from accidentally committing static access keys to source code when calling AWS services from an application running on AWS. What is the best approach?",
    "options": [
      "Use IAM roles attached to resources (EC2, Lambda, etc.) to obtain temporary credentials instead of using static keys",
      "Encrypt access keys and commit them to the repository",
      "Store access keys in environment variables on developer machines and commit them",
      "Create a shared IAM user and print keys to logs for debugging convenience"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role cung cấp credentials tạm thời tự động, loại bỏ nhu cầu nhúng key tĩnh trong mã.\n✓ Dùng IAM role gắn vào tài nguyên — đúng, không cần key tĩnh, tránh rò rỉ.\n✗ Mã hóa key rồi commit — vẫn rủi ro, không nên đưa key vào repo.\n✗ Lưu key trong env rồi commit — vẫn lộ key qua source control.\n✗ User dùng chung và in key ra log — cực kỳ rủi ro, mất truy vết.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-032",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company operates a web application behind an Application Load Balancer and wants to block common application-layer attacks such as SQL injection and cross-site scripting (XSS). Which service is most suitable?",
    "options": [
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Shield Standard",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS WAF lọc lưu lượng HTTP/HTTPS ở tầng 7, cho phép tạo rule chặn SQL injection và XSS.\n✓ AWS WAF — đúng, web application firewall chặn tấn công tầng ứng dụng phổ biến.\n✗ Amazon GuardDuty — là dịch vụ phát hiện mối đe dọa, không lọc/chặn request.\n✗ AWS Shield Standard — chống DDoS ở tầng mạng/giao vận, không lọc SQLi/XSS.\n✗ Amazon Inspector — đánh giá lỗ hổng (vulnerability), không chặn traffic thời gian thực.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-032",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An organization wants automatic basic DDoS protection for all AWS resources at no additional cost. Which option is correct?",
    "options": [
      "AWS Shield Standard is automatically enabled and free for all AWS customers",
      "You must subscribe to AWS Shield Advanced to have any DDoS protection",
      "You must purchase a DDoS solution from AWS Marketplace",
      "You must configure GuardDuty to enable DDoS protection"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Shield Standard được kích hoạt mặc định cho mọi khách hàng AWS, miễn phí, chống DDoS phổ biến tầng 3/4.\n✓ AWS Shield Standard miễn phí tự động — đúng, bảo vệ DDoS cơ bản cho mọi khách hàng.\n✗ Phải đăng ký Shield Advanced mới có bảo vệ — sai, Standard đã có sẵn miễn phí.\n✗ Mua từ AWS Marketplace — không cần, bảo vệ cơ bản đã tích hợp sẵn.\n✗ Cấu hình GuardDuty — GuardDuty phát hiện đe dọa, không cung cấp bảo vệ DDoS.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-032",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An e-commerce company is concerned about large-scale DDoS attacks during peak season and wants 24/7 specialized support from the Shield Response Team (SRT) along with cost protection during attacks. Which solution is suitable?",
    "options": [
      "AWS Shield Advanced",
      "AWS Shield Standard",
      "AWS WAF with rate-limiting rules",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Shield Advanced cung cấp bảo vệ DDoS nâng cao, truy cập Shield Response Team 24/7 và cost protection cho các đợt scale do tấn công.\n✓ AWS Shield Advanced — đúng, có SRT 24/7 và DDoS cost protection.\n✗ AWS Shield Standard — chỉ bảo vệ cơ bản, không có SRT hay cost protection.\n✗ AWS WAF rate limiting — giúp giảm nhẹ nhưng không cung cấp SRT hay cost protection.\n✗ Amazon GuardDuty — phát hiện đe dọa, không phải dịch vụ chống DDoS.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-033",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to detect unusual activity such as communication with malicious IP addresses, crypto mining behavior on EC2, and suspicious API access by analyzing VPC Flow Logs, CloudTrail, and DNS logs. Which service should be used?",
    "options": [
      "Amazon GuardDuty",
      "AWS WAF",
      "AWS Firewall Manager",
      "AWS Shield Advanced"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "GuardDuty là dịch vụ threat detection phân tích CloudTrail, VPC Flow Logs và DNS logs để phát hiện hành vi bất thường.\n✓ Amazon GuardDuty — đúng, phát hiện đe dọa dựa trên phân tích log thông minh.\n✗ AWS WAF — lọc traffic web, không phân tích log để phát hiện đe dọa.\n✗ AWS Firewall Manager — quản lý tập trung chính sách firewall, không phát hiện đe dọa.\n✗ AWS Shield Advanced — chống DDoS, không phát hiện crypto mining hay truy cập API đáng ngờ.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-033",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A large enterprise has hundreds of accounts in AWS Organizations and wants to centrally manage AWS WAF rules and Shield Advanced policies across all accounts to ensure consistent compliance. Which service is suitable?",
    "options": [
      "AWS Firewall Manager",
      "AWS WAF (configured per account)",
      "AWS Trusted Advisor",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firewall Manager cho phép quản lý tập trung WAF, Shield Advanced và security group trên nhiều tài khoản trong AWS Organizations.\n✓ AWS Firewall Manager — đúng, quản lý chính sách bảo mật tập trung trên nhiều tài khoản.\n✗ AWS WAF cấu hình từng tài khoản — không tập trung, khó đảm bảo nhất quán ở quy mô lớn.\n✗ AWS Trusted Advisor — đưa khuyến nghị tối ưu, không quản lý rule firewall.\n✗ Amazon GuardDuty — phát hiện đe dọa, không quản lý chính sách WAF/Shield.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-033",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An administrator wants to quickly check for common security issues such as security groups with overly open ports, S3 buckets with public access, and MFA enabled for the root account. Which AWS tool provides these checks out of the box?",
    "options": [
      "AWS Trusted Advisor",
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Firewall Manager"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trusted Advisor có nhóm Security checks kiểm tra security group, S3 public, MFA root và nhiều best practice khác.\n✓ AWS Trusted Advisor — đúng, cung cấp các security check sẵn có theo best practice.\n✗ AWS WAF — lọc traffic web, không kiểm tra cấu hình bảo mật tài khoản.\n✗ Amazon GuardDuty — phát hiện đe dọa thời gian thực, không phải check cấu hình tĩnh.\n✗ AWS Firewall Manager — quản lý chính sách firewall, không cung cấp security check tổng quát.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-034",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to deploy a third-party antivirus solution and a next-generation firewall that have been verified to run on AWS infrastructure. Where is the best place to find and quickly deploy these products?",
    "options": [
      "AWS Marketplace",
      "AWS Trusted Advisor",
      "AWS Artifact",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Marketplace là nơi tìm, mua và triển khai phần mềm bảo mật của bên thứ ba như antivirus và firewall.\n✓ AWS Marketplace — đúng, cung cấp giải pháp bảo mật bên thứ ba đã được kiểm duyệt.\n✗ AWS Trusted Advisor — đưa khuyến nghị, không bán phần mềm bên thứ ba.\n✗ AWS Artifact — kho tài liệu tuân thủ/báo cáo, không cung cấp phần mềm.\n✗ Amazon Inspector — đánh giá lỗ hổng, không phải nơi mua phần mềm.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-034",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company deploys a global web application via Amazon CloudFront and wants to both mitigate DDoS attacks and block malicious requests based on geography and known attack patterns. Which services should they combine? (Choose 2)",
    "options": [
      "AWS Shield",
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Artifact",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Shield giảm nhẹ DDoS còn WAF chặn request độc hại theo geo và mẫu tấn công; cả hai tích hợp với CloudFront.\n✓ AWS Shield — đúng, bảo vệ DDoS cho CloudFront.\n✓ AWS WAF — đúng, chặn request theo địa lý và mẫu tấn công.\n✗ Amazon GuardDuty — phát hiện đe dọa, không chặn request hay chống DDoS.\n✗ AWS Artifact — kho tài liệu tuân thủ, không liên quan bảo vệ traffic.\n✗ AWS Trusted Advisor — đưa khuyến nghị cấu hình, không lọc traffic thời gian thực.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-034",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An organization has enabled AWS Shield Advanced but wants to proactively block application-layer (Layer 7) attacks that may accompany DDoS attacks. What additional component do they need to handle this Layer 7 traffic?",
    "options": [
      "AWS WAF (Shield Advanced customers get free WAF usage on protected resources)",
      "Amazon GuardDuty to block Layer 7 traffic",
      "AWS Firewall Manager to automatically block Layer 7 DDoS",
      "Shield Advanced alone is sufficient to block all Layer 7 attacks"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Shield Advanced bảo vệ tầng 3/4, nhưng tấn công tầng 7 cần WAF; khách hàng Shield Advanced được dùng WAF miễn phí trên tài nguyên được bảo vệ để giảm nhẹ tầng ứng dụng.\n✓ AWS WAF kết hợp Shield Advanced — đúng, xử lý tấn công tầng 7 và được miễn phí WAF.\n✗ Amazon GuardDuty chặn tầng 7 — sai, GuardDuty chỉ phát hiện, không chặn.\n✗ Firewall Manager tự chặn DDoS tầng 7 — Firewall Manager quản lý chính sách, không tự chặn tấn công.\n✗ Chỉ Shield Advanced là đủ — sai, Shield tập trung tầng mạng/giao vận, cần WAF cho tầng 7.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-035",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to automatically apply a standard set of WAF rules to every new Application Load Balancer created across all accounts without requiring manual configuration each time. Which approach meets this requirement?",
    "options": [
      "Use AWS Firewall Manager to automatically apply WAF policies to appropriate resources",
      "Require each team to manually add WAF rules when creating ALBs",
      "Use AWS Trusted Advisor to automatically attach WAF",
      "Enable Amazon GuardDuty to automatically attach WAF to ALBs"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firewall Manager áp dụng chính sách WAF tự động cho tài nguyên hiện có và mới trong Organizations, đảm bảo bao phủ nhất quán.\n✓ AWS Firewall Manager áp chính sách tự động — đúng, bao phủ cả tài nguyên mới.\n✗ Mỗi đội tự thêm thủ công — không tự động, dễ bỏ sót.\n✗ AWS Trusted Advisor tự gắn WAF — sai, chỉ khuyến nghị, không tự cấu hình.\n✗ Amazon GuardDuty tự gắn WAF — sai, GuardDuty không cấu hình WAF.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "clf-m2-035",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A security team wants to improve their proactive security posture: detect abnormal behavior on accounts while receiving recommendations about common security misconfigurations like missing root account MFA. Which services should they use? (Choose 2)",
    "options": [
      "Amazon GuardDuty",
      "AWS Trusted Advisor",
      "AWS Shield Standard",
      "AWS Marketplace",
      "AWS WAF"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "GuardDuty phát hiện hành vi bất thường còn Trusted Advisor khuyến nghị sai cấu hình bảo mật như MFA root.\n✓ Amazon GuardDuty — đúng, phát hiện hành vi bất thường trong tài khoản.\n✓ AWS Trusted Advisor — đúng, kiểm tra và khuyến nghị các sai cấu hình bảo mật.\n✗ AWS Shield Standard — chỉ chống DDoS cơ bản, không phát hiện hành vi hay khuyến nghị cấu hình.\n✗ AWS Marketplace — nơi mua phần mềm, không phát hiện hay khuyến nghị.\n✗ AWS WAF — lọc traffic web, không thực hiện hai nhu cầu nêu trên.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "clf-m3-035",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An engineer needs to find security documentation, best practices, and official whitepapers to design a secure architecture on AWS. Which source is appropriate for finding this security information?",
    "options": [
      "AWS Security Documentation and whitepapers on the AWS website",
      "Amazon GuardDuty console",
      "AWS Shield Advanced console",
      "Only contact the Shield Response Team"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tài liệu bảo mật, best practice và whitepaper chính thức được công bố trên trang documentation/whitepaper của AWS.\n✓ AWS Security Documentation và whitepaper — đúng, nguồn thông tin bảo mật chính thức.\n✗ Amazon GuardDuty console — hiển thị phát hiện đe dọa, không phải kho tài liệu hướng dẫn.\n✗ AWS Shield Advanced console — quản lý bảo vệ DDoS, không phải nơi tra cứu best practice tổng quát.\n✗ Chỉ liên hệ SRT — Shield Response Team hỗ trợ sự cố DDoS, không phải nguồn tài liệu thiết kế.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "clf-m1-036",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A new operations engineer is tasked with quickly creating an EC2 instance for testing, doing it just once, and wants to use a visual graphical interface in a web browser. Which AWS access method is most appropriate?",
    "options": [
      "AWS Management Console",
      "AWS CLI",
      "AWS SDK",
      "AWS CloudFormation"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Management Console là giao diện web trực quan, lý tưởng cho thao tác one-time và người mới.\n✓ AWS Management Console — giao diện đồ họa qua trình duyệt, phù hợp thử nghiệm thủ công một lần.\n✗ AWS CLI — thao tác bằng dòng lệnh, không phải giao diện đồ họa.\n✗ AWS SDK — dùng để gọi AWS trong code ứng dụng, không phải GUI.\n✗ AWS CloudFormation — dùng cho IaC lặp lại, thừa thãi cho một thử nghiệm một lần.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-036",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to create and recreate its entire infrastructure (VPC, EC2, RDS) consistently, version-control it with Git, and deploy it repeatedly across multiple environments. Which AWS service is most appropriate?",
    "options": [
      "AWS CloudFormation",
      "AWS Management Console",
      "Amazon EC2",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFormation là dịch vụ Infrastructure as Code (IaC), mô tả hạ tầng bằng template để triển khai lặp lại nhất quán.\n✓ AWS CloudFormation — IaC, template version-control được, triển khai lặp lại nhiều môi trường.\n✗ AWS Management Console — thao tác thủ công, không nhất quán và khó lặp lại.\n✗ Amazon EC2 — chỉ là dịch vụ compute, không phải công cụ IaC.\n✗ AWS Trusted Advisor — công cụ khuyến nghị tối ưu, không triển khai hạ tầng.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-036",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The DevOps team needs to automate the creation of multiple S3 buckets in a script that runs on schedule (cron) on a Linux server without needing to write a full application. Which approach is most appropriate?",
    "options": [
      "Use AWS CLI in a shell script",
      "Manually perform operations through AWS Management Console each time",
      "Use AWS SDK for Java in a web application",
      "Contact AWS Support to create buckets"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS CLI cho phép gọi API AWS từ dòng lệnh, dễ nhúng vào shell script và cron để tự động hóa.\n✓ Dùng AWS CLI trong shell script — phù hợp tự động hóa bằng script/cron, không cần ứng dụng đầy đủ.\n✗ Thao tác thủ công qua Console mỗi lần — không tự động hóa được, dễ sai sót.\n✗ AWS SDK for Java trong ứng dụng web — nặng nề, vượt nhu cầu của một script đơn giản.\n✗ Liên hệ AWS Support — Support không tạo tài nguyên thay khách hàng.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-037",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A development team building a .NET application needs to upload files to S3 and read DynamoDB data directly from code using objects and methods of the programming language. Which option is most appropriate?",
    "options": [
      "AWS SDK for .NET",
      "AWS CLI",
      "AWS Management Console",
      "AWS CloudFormation"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS SDK cung cấp thư viện theo ngôn ngữ để gọi dịch vụ AWS ngay trong mã ứng dụng.\n✓ AWS SDK for .NET — thư viện lập trình tích hợp vào code .NET để gọi S3, DynamoDB.\n✗ AWS CLI — công cụ dòng lệnh, không nhúng trực tiếp dưới dạng đối tượng trong code.\n✗ AWS Management Console — GUI thủ công, không dùng trong ứng dụng.\n✗ AWS CloudFormation — tạo hạ tầng, không phải gọi dịch vụ trong logic ứng dụng.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-037",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company keeps some sensitive applications running in its own on-premises data center while expanding other workloads to AWS, connecting the two environments via VPN/Direct Connect. Which deployment model correctly describes this situation?",
    "options": [
      "Hybrid deployment",
      "Cloud (all-in) deployment",
      "On-premises deployment",
      "Multi-Region deployment"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kết hợp tài nguyên on-premises với tài nguyên cloud và liên kết chúng chính là mô hình hybrid.\n✓ Hybrid deployment — kết hợp data center tại chỗ và AWS, kết nối qua VPN/Direct Connect.\n✗ Cloud (all-in) deployment — toàn bộ chạy trên cloud, không còn hạ tầng tại chỗ.\n✗ On-premises deployment — chỉ chạy tại data center riêng, không dùng cloud.\n✗ Multi-Region deployment — triển khai nhiều Region trên cloud, không nói về tại chỗ.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-037",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "An organization wants to apply Infrastructure as Code with CloudFormation. Which of the following benefits are correct? (Choose 2)",
    "options": [
      "Infrastructure described in templates can be version-controlled and reused",
      "Consistent repeated deployment across dev/test/prod environments",
      "CloudFormation automatically reduces EC2 pricing compared to On-Demand",
      "Templates completely eliminate the need for IAM permissions",
      "CloudFormation only works on on-premises infrastructure"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "IaC với CloudFormation mang lại tính nhất quán, lặp lại và quản lý template như mã nguồn.\n✓ Template version-control và tái sử dụng — đúng, hạ tầng được khai báo dạng code.\n✓ Triển khai lặp lại nhất quán giữa môi trường — đúng, cùng template tạo cùng kết quả.\n✗ Tự động giảm giá EC2 — sai, CloudFormation không thay đổi mô hình giá.\n✗ Loại bỏ nhu cầu IAM permissions — sai, vẫn cần quyền để tạo tài nguyên.\n✗ Chỉ chạy on-premises — sai, CloudFormation là dịch vụ quản lý hạ tầng AWS.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-038",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A startup is built entirely on AWS without owning any physical servers, using services like Lambda, S3, DynamoDB, and RDS. They want to correctly describe their deployment model to investors. Which model is it?",
    "options": [
      "Cloud (all-in) deployment",
      "Hybrid deployment",
      "On-premises deployment",
      "Edge deployment"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vận hành 100% trên dịch vụ cloud, không có hạ tầng vật lý riêng, là mô hình cloud/all-in.\n✓ Cloud (all-in) deployment — toàn bộ workload chạy trên dịch vụ AWS, không có máy chủ tại chỗ.\n✗ Hybrid deployment — cần có cả hạ tầng tại chỗ lẫn cloud, không đúng vì startup không có máy vật lý.\n✗ On-premises deployment — chạy tại data center riêng, trái ngược tình huống.\n✗ Edge deployment — không phải mô hình triển khai chuẩn trong câu hỏi này.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-038",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Two programmers perform the same operation: one clicks a button in AWS Management Console, the other runs an AWS CLI command. Ultimately, where are all requests sent for AWS to process?",
    "options": [
      "AWS service API endpoints",
      "Only the AWS Management Console backend",
      "CloudFormation stack",
      "A configuration file on the user's local machine"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Console, CLI và SDK đều là các giao diện khác nhau, nhưng tất cả cuối cùng đều gọi tới AWS API endpoints.\n✓ AWS service API endpoints — mọi phương thức (Console, CLI, SDK) đều dịch thành lệnh gọi API tới AWS.\n✗ Console backend duy nhất — CLI không đi qua Console.\n✗ CloudFormation stack — chỉ liên quan khi dùng IaC, không phải mọi thao tác.\n✗ File cấu hình cục bộ — file local chỉ lưu credentials/cấu hình, không xử lý yêu cầu.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-038",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company deploys a web application on EC2 and wants it to continue functioning even if a physical data center experiences a power outage or fire. Which solution is most appropriate?",
    "options": [
      "Deploy EC2 across multiple Availability Zones in the same Region",
      "Deploy all EC2 instances in a single Availability Zone but use larger instances",
      "Place static content at CloudFront Edge Locations",
      "Enable Multi-Region mode for the entire AWS account"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi Availability Zone gồm một hoặc nhiều trung tâm dữ liệu độc lập, không chia sẻ single point of failure, nên trải EC2 qua nhiều AZ giúp chịu được sự cố một AZ.\n✓ Triển khai EC2 trên nhiều Availability Zones trong cùng một Region — đúng, các AZ độc lập về nguồn điện/làm mát nên một AZ chết, AZ khác vẫn chạy.\n✗ Triển khai tất cả EC2 trong một Availability Zone nhưng dùng instance lớn hơn — vẫn nằm trong một AZ, sự cố AZ làm sập toàn bộ.\n✗ Đặt nội dung tĩnh tại các Edge Location của CloudFront — Edge Location dùng để cache/giảm latency, không cung cấp HA cho compute.\n✗ Bật chế độ Multi-Region cho toàn bộ tài khoản AWS — không tồn tại 'chế độ' bật như vậy và là dư thừa cho yêu cầu một-Region.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-039",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup wants users in multiple countries to download videos and images with low latency. Which component in AWS's global infrastructure is designed to serve content closest to users?",
    "options": [
      "Edge Location",
      "Availability Zone",
      "Region",
      "Virtual Private Cloud (VPC)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Edge Location là điểm hiện diện dùng để cache và phân phối nội dung (qua CloudFront) gần người dùng cuối nhằm giảm latency.\n✓ Edge Location — đúng, phục vụ nội dung cache gần người dùng để giảm độ trễ.\n✗ Availability Zone — là tập trung tâm dữ liệu trong một Region, dùng cho HA chứ không tối ưu phân phối nội dung toàn cầu.\n✗ Region — vùng địa lý chứa nhiều AZ; chọn Region không đủ gần mọi người dùng toàn cầu.\n✗ Virtual Private Cloud (VPC) — mạng ảo riêng, không liên quan tới phân phối nội dung edge.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-039",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A bank in Germany is legally required to store and process all customer data within the country's territory. Which element of AWS's global infrastructure helps them comply with this requirement?",
    "options": [
      "Choose a Region located within the geographically permitted area",
      "Use multiple Availability Zones in any Region",
      "Distribute data across Edge Locations globally",
      "Enable Cross-Region Replication to multiple Regions"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vấn đề data sovereignty được giải quyết bằng cách chọn Region đặt ở quốc gia/khu vực mà luật cho phép, vì Region xác định vị trí địa lý lưu trữ dữ liệu.\n✓ Chọn một Region nằm trong phạm vi địa lý được phép — đúng, Region quyết định vị trí địa lý của dữ liệu, đáp ứng data sovereignty.\n✗ Dùng nhiều Availability Zones trong một Region bất kỳ — AZ cho HA nhưng nếu Region sai vị trí thì vẫn vi phạm luật.\n✗ Phân phối dữ liệu qua các Edge Location toàn cầu — đẩy dữ liệu ra ngoài lãnh thổ, vi phạm yêu cầu.\n✗ Bật Cross-Region Replication sang nhiều Region — sao chép dữ liệu ra Region khác có thể vi phạm yêu cầu lưu trú dữ liệu.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-039",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A global enterprise headquartered in the US but with a large user base in Japan is experiencing complaints about slow application response. They want to reduce latency for Japanese users by running a copy of the application near them. Which approach is correct?",
    "options": [
      "Deploy the application at a Region in the Asia-Pacific area near Japan (multi-Region)",
      "Add multiple Availability Zones for the application running in the US Region",
      "Increase EC2 instance size in the US Region",
      "Move the entire application to run solely on Edge Locations"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi cần low latency cho người dùng ở khu vực địa lý khác, triển khai multi-Region đặt ứng dụng tại Region gần người dùng là giải pháp đúng.\n✓ Triển khai ứng dụng tại một Region ở khu vực châu Á - Thái Bình Dương gần Nhật Bản (multi-Region) — đúng, đặt compute gần người dùng giúp giảm độ trễ.\n✗ Thêm nhiều Availability Zones cho ứng dụng đang chạy ở Region Mỹ — cải thiện HA nhưng người dùng Nhật vẫn phải kết nối qua khoảng cách xa.\n✗ Tăng kích thước EC2 instance ở Region Mỹ — tăng compute không giảm khoảng cách mạng địa lý.\n✗ Chuyển toàn bộ ứng dụng sang chạy hoàn toàn trên Edge Location — Edge Location không chạy ứng dụng backend đầy đủ, chỉ cache/edge compute giới hạn.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-040",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "In an architecture review session, an engineer asks why placing two EC2 instances in two different Availability Zones is safer than placing them in the same AZ. What is the most accurate answer?",
    "options": [
      "Availability Zones are isolated in terms of power, cooling, and physical networks, so they don't share a single point of failure",
      "Availability Zones are located in different countries so they comply better with data sovereignty",
      "Each Availability Zone is an Edge Location so it reduces latency for users",
      "Availability Zones automatically run in multiple different Regions"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AZ trong cùng Region được thiết kế cách ly vật lý (nguồn điện, làm mát, mạng riêng) và đủ xa để một thảm họa cục bộ không lan, nên không chia sẻ single point of failure.\n✓ Các Availability Zones được cách ly về nguồn điện, làm mát và mạng vật lý, nên không chia sẻ single point of failure — đúng, đây là lý do multi-AZ tăng HA.\n✗ Các Availability Zones nằm ở các quốc gia khác nhau nên tuân thủ data sovereignty tốt hơn — sai, các AZ nằm trong cùng một Region/khu vực địa lý.\n✗ Mỗi Availability Zone là một Edge Location nên giảm latency cho người dùng — sai, AZ và Edge Location là hai khái niệm khác nhau.\n✗ Các Availability Zones tự động chạy ở nhiều Region khác nhau — sai, AZ thuộc về một Region duy nhất.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-040",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "An e-commerce company needs to build a Disaster Recovery plan so the application continues to serve even if an entire AWS Region is broadly disrupted. Which options below are suitable for this goal? (Choose 2)",
    "options": [
      "Deploy application copies in a second Region (multi-Region) and route traffic when the primary Region fails",
      "Enable Cross-Region Replication for data (e.g., S3) to a backup Region",
      "Distribute instances across multiple Availability Zones in the same Region",
      "Increase the number of Edge Locations serving the application",
      "Use a larger instance (vertical scaling) in the primary Region"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "DR ở cấp độ chịu lỗi toàn Region đòi hỏi tài nguyên và dữ liệu tồn tại ngoài Region chính, tức multi-Region kèm sao chép dữ liệu cross-Region.\n✓ Triển khai bản sao ứng dụng tại một Region thứ hai (multi-Region) và định tuyến lưu lượng khi Region chính lỗi — đúng, có Region dự phòng để chuyển sang khi Region chính sập.\n✓ Bật Cross-Region Replication cho dữ liệu (ví dụ S3) sang Region dự phòng — đúng, đảm bảo dữ liệu sẵn có ở Region thứ hai.\n✗ Phân bổ các instance qua nhiều Availability Zones trong cùng một Region — chỉ bảo vệ khỏi lỗi cấp AZ, không cứu được khi cả Region gián đoạn.\n✗ Tăng số lượng Edge Location phục vụ ứng dụng — Edge Location cache nội dung, không thay thế backend khi Region lỗi.\n✗ Dùng một instance lớn hơn (vertical scaling) trong Region chính — vẫn nằm trong Region chính nên không chống được lỗi toàn Region.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-040",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An operations team needs a relational database that can automatically failover to a standby when the primary node experiences infrastructure issues without needing to deploy to another Region. Which configuration best meets this need?",
    "options": [
      "Amazon RDS with Multi-AZ configuration",
      "Amazon RDS running in a single Availability Zone",
      "Distribute database queries across Edge Locations",
      "Manually replicate the database to another Region each night"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS Multi-AZ duy trì bản standby ở một AZ khác trong cùng Region và tự động failover khi AZ/primary gặp sự cố, đáp ứng HA mà không cần multi-Region.\n✓ Amazon RDS với cấu hình Multi-AZ — đúng, standby ở AZ khác cho phép failover tự động trong cùng Region.\n✗ Amazon RDS chạy trong một Availability Zone duy nhất — không có dự phòng, AZ lỗi là database ngừng.\n✗ Phân phối truy vấn cơ sở dữ liệu qua Edge Location — Edge Location không vận hành cơ sở dữ liệu quan hệ.\n✗ Sao chép cơ sở dữ liệu thủ công sang một Region khác mỗi đêm — không tự động failover và có nguy cơ mất dữ liệu giữa các lần sao chép.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-041",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An architect classifies the components of AWS global infrastructure by purpose. Which of the following statements CORRECTLY describes their relationship and role?",
    "options": [
      "A Region contains multiple isolated Availability Zones to achieve HA, while Edge Locations are distributed globally to serve content with low latency",
      "An Availability Zone contains multiple Regions, and each Region is an Edge Location",
      "Edge Locations contain multiple Availability Zones and are used to run primary databases",
      "A Region consists of exactly one Availability Zone, and HA is achieved by using multiple Edge Locations"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quan hệ phân cấp đúng: Region > nhiều AZ (cho HA), và Edge Location là lớp riêng phân tán toàn cầu để phục vụ nội dung gần người dùng.\n✓ Một Region chứa nhiều Availability Zones cách ly để đạt HA, còn Edge Location nằm phân tán toàn cầu để phục vụ nội dung độ trễ thấp — đúng, mô tả chính xác vai trò từng thành phần.\n✗ Một Availability Zone chứa nhiều Region, và mỗi Region là một Edge Location — sai, ngược cấp bậc; Region mới chứa AZ.\n✗ Edge Location chứa nhiều Availability Zones, dùng để chạy cơ sở dữ liệu chính — sai, Edge Location không chứa AZ và không chạy database chính.\n✗ Một Region chỉ gồm đúng một Availability Zone, và HA đạt được bằng cách dùng nhiều Edge Location — sai, Region có nhiều AZ và HA dựa trên multi-AZ chứ không phải Edge Location.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-041",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to run a traditional web application on a virtual machine with full OS control and flexible CPU/RAM configuration. Which AWS service is most suitable?",
    "options": [
      "Amazon EC2 with Auto Scaling",
      "AWS Lambda",
      "Amazon S3 to run application code",
      "Amazon RDS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 cung cấp máy ảo (virtual server) với toàn quyền kiểm soát OS và nhiều instance type.\n✓ Amazon EC2 — đúng, máy ảo IaaS, chọn được CPU/RAM và quản lý OS.\n✗ AWS Lambda — serverless, không truy cập OS, chạy theo sự kiện.\n✗ Amazon S3 — dịch vụ lưu trữ object, không phải compute.\n✗ Amazon RDS — database được quản lý, không phải máy chủ đa dụng.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-041",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An in-memory data analytics application needs extremely high RAM relative to CPU to process massive datasets in memory. Which EC2 instance family should be chosen?",
    "options": [
      "Memory optimized (e.g., R family)",
      "Compute optimized (e.g., C family)",
      "Storage optimized (e.g., I family)",
      "General purpose (e.g., T family)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Workload in-memory cần nhiều RAM nên dùng memory optimized.\n✓ Memory optimized (R family) — đúng, tối ưu cho khối lượng dữ liệu lớn trong bộ nhớ.\n✗ Compute optimized (C family) — tối ưu CPU cao, hợp batch/HPC chứ không phải RAM lớn.\n✗ Storage optimized (I family) — tối ưu I/O đĩa cục bộ, không phải RAM.\n✗ General purpose (T family) — cân bằng CPU/RAM, không tối ưu RAM lớn.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-042",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A scientific team needs to run HPC simulations and video encoding requiring high sustained CPU performance, while RAM needs are moderate. Which EC2 instance family is most suitable?",
    "options": [
      "Compute optimized (C family)",
      "Memory optimized (X family)",
      "Storage optimized (D family)",
      "General purpose (M family)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khối lượng công việc gắn nặng vào CPU nên chọn compute optimized.\n✓ Compute optimized (C family) — đúng, dành cho HPC, batch processing, media transcoding.\n✗ Memory optimized (X family) — dành cho RAM cực lớn, không tối ưu CPU.\n✗ Storage optimized (D family) — tối ưu throughput đĩa, không phải CPU.\n✗ General purpose (M family) — cân bằng, không tối đa hóa CPU.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-042",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company deploying a data warehouse needs high sequential throughput access to tens of TB of data on local disk with low per-GB cost. Which EC2 instance family is most suitable?",
    "options": [
      "Storage optimized (D family)",
      "Compute optimized (C family)",
      "Memory optimized (R family)",
      "General purpose (T family)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu thông lượng đĩa cục bộ cao cho dữ liệu lớn nên dùng storage optimized.\n✓ Storage optimized (D family) — đúng, tối ưu cho truy cập tuần tự thông lượng cao, data warehouse.\n✗ Compute optimized (C family) — tối ưu CPU, không phải đĩa.\n✗ Memory optimized (R family) — tối ưu RAM, không phải đĩa cục bộ.\n✗ General purpose (T family) — cân bằng, không tối ưu storage.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-042",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup wants to run image processing functions triggered each time a user uploads an image to S3, without managing any servers and paying only for execution time. Which solution is most suitable?",
    "options": [
      "AWS Lambda",
      "Amazon EC2 with Auto Scaling",
      "Amazon ECS on EC2",
      "AWS Batch on EC2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu serverless, chạy theo sự kiện, trả tiền theo thời gian thực thi là đặc trưng của Lambda.\n✓ AWS Lambda — đúng, serverless, kích hoạt bởi sự kiện S3, không quản lý máy chủ.\n✗ Amazon EC2 với Auto Scaling — vẫn phải quản lý máy chủ và OS.\n✗ Amazon ECS trên EC2 — phải quản lý cụm EC2 bên dưới.\n✗ AWS Batch trên EC2 — dành cho batch jobs, vẫn dựa trên hạ tầng máy chủ.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-043",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has packaged an application as Docker containers and wants to run them WITHOUT managing, patching, or scaling the underlying EC2 instances. Which option best meets this requirement?",
    "options": [
      "AWS Fargate",
      "Amazon ECS with EC2 launch type",
      "Amazon EC2 with manually installed Docker",
      "Amazon EKS with managed EC2 node group"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fargate là compute engine serverless cho container, loại bỏ việc quản lý EC2 bên dưới.\n✓ AWS Fargate — đúng, chạy container không cần quản lý server.\n✗ Amazon ECS trên EC2 launch type — vẫn phải quản lý các EC2 instance.\n✗ Amazon EC2 cài Docker thủ công — toàn bộ vận hành OS và scaling do bạn lo.\n✗ Amazon EKS với managed node group EC2 — vẫn có các EC2 node phải quản lý.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-043",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An organization has standardized on Kubernetes and wants to use a Kubernetes-compatible container orchestration service managed by AWS. Which service is most suitable?",
    "options": [
      "Amazon EKS",
      "Amazon ECS",
      "AWS Lambda",
      "Amazon Lightsail"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EKS là dịch vụ Kubernetes được quản lý của AWS, phù hợp tổ chức đã dùng Kubernetes.\n✓ Amazon EKS — đúng, managed Kubernetes, tương thích hệ sinh thái Kubernetes.\n✗ Amazon ECS — orchestrator riêng của AWS, không phải Kubernetes.\n✗ AWS Lambda — serverless functions, không phải orchestration Kubernetes.\n✗ Amazon Lightsail — máy chủ ảo đơn giản, không phải Kubernetes.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-043",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Web application traffic spikes during the day and drops significantly at night. A company wants to automatically add EC2 instances when load increases and remove them when load decreases to optimize cost and performance. Which solution provides this elasticity?",
    "options": [
      "Amazon EC2 Auto Scaling",
      "Reserved Instances",
      "Dedicated Hosts",
      "Amazon Machine Image (AMI)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Auto Scaling cung cấp elasticity, tự thêm/bớt EC2 theo tải thực tế.\n✓ Amazon EC2 Auto Scaling — đúng, scale in/out theo nhu cầu.\n✗ Reserved Instances — chỉ là mô hình giá cam kết, không tự scale.\n✗ Dedicated Hosts — phần cứng vật lý riêng, không liên quan elasticity.\n✗ Amazon Machine Image (AMI) — mẫu để khởi tạo instance, không tự scale.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-044",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company runs multiple EC2 instances serving the same web application and needs to distribute incoming traffic evenly across instances while stopping requests to failed instances. Which service meets this need?",
    "options": [
      "Elastic Load Balancing (ELB)",
      "Amazon Route 53 latency routing",
      "AWS Auto Scaling",
      "Amazon CloudFront"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ELB phân phối traffic giữa nhiều target và thực hiện health check để loại bỏ instance lỗi.\n✓ Elastic Load Balancing (ELB) — đúng, cân bằng tải và kiểm tra health của các instance.\n✗ Amazon Route 53 latency routing — định tuyến DNS theo độ trễ, không cân bằng tải ở mức request giữa instance.\n✗ AWS Auto Scaling — thêm/bớt instance, không phân phối từng request.\n✗ Amazon CloudFront — CDN cache nội dung, không phải mục đích cân bằng tải backend.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-044",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company wants to build a fault-tolerant and elastic web architecture: automatically scale EC2 instances up/down based on load while distributing requests evenly to healthy instances. Which components should be combined? (Select 2)",
    "options": [
      "Amazon EC2 Auto Scaling",
      "Elastic Load Balancing (ELB)",
      "AWS Lambda to replace all EC2",
      "Amazon S3 to run application code",
      "Single Dedicated Host only"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Auto Scaling lo elasticity còn ELB lo phân phối traffic tới instance khỏe mạnh; hai dịch vụ này thường đi cùng nhau.\n✓ Amazon EC2 Auto Scaling — đúng, tự tăng/giảm instance theo tải.\n✓ Elastic Load Balancing (ELB) — đúng, phân phối request và health check.\n✗ AWS Lambda thay cho toàn bộ EC2 — đổi mô hình kiến trúc, không phải yêu cầu của tình huống dựa trên EC2.\n✗ Amazon S3 để chạy mã ứng dụng — S3 là lưu trữ object, không chạy mã ứng dụng.\n✗ Single Dedicated Host duy nhất — một máy duy nhất không co giãn và là single point of failure.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-044",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company running a web application needs a fully managed relational database supporting MySQL and PostgreSQL engines, with AWS handling patching, backup, and failover. Which service is most suitable?",
    "options": [
      "Amazon RDS",
      "Amazon DynamoDB",
      "Amazon ElastiCache",
      "Amazon Redshift"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon RDS là managed relational database hỗ trợ nhiều engine và tự lo patching/backup/failover.\n✓ Amazon RDS — đúng, managed relational DB hỗ trợ MySQL/PostgreSQL.\n✗ Amazon DynamoDB — là NoSQL key-value, không phải relational.\n✗ Amazon ElastiCache — in-memory cache, không phải primary relational DB.\n✗ Amazon Redshift — data warehouse cho analytics, không dành cho OLTP web app.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-045",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A gaming application needs to store player profiles with single-digit millisecond latency at millions of requests per second, without requiring a fixed schema. Which database service is most suitable?",
    "options": [
      "Amazon DynamoDB",
      "Amazon RDS for MySQL",
      "Amazon Aurora",
      "Amazon Redshift"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DynamoDB là NoSQL fully managed cho độ trễ ms ổn định ở quy mô cực lớn, không cần schema cố định.\n✓ Amazon DynamoDB — đúng, NoSQL, single-digit ms latency, scale lớn.\n✗ Amazon RDS for MySQL — relational, khó scale tới hàng triệu request/giây.\n✗ Amazon Aurora — relational, mạnh nhưng vẫn theo mô hình schema cố định.\n✗ Amazon Redshift — data warehouse cho analytics, không phải workload latency thấp.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-045",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An e-commerce website has a best-selling product that is repeatedly queried from the database, causing high load and increased latency. The company wants to reduce read load and improve response time. Which solution is most suitable?",
    "options": [
      "Add Amazon ElastiCache as an in-memory cache layer in front of the database",
      "Migrate database to Amazon Redshift",
      "Enable Multi-AZ deployment for RDS",
      "Move data to Amazon DynamoDB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ElastiCache lưu kết quả truy vấn nóng trong bộ nhớ, giảm tải đọc và tăng tốc phản hồi.\n✓ Amazon ElastiCache — đúng, in-memory cache cho dữ liệu đọc nhiều.\n✗ Amazon Redshift — data warehouse, không giải quyết caching cho web app.\n✗ Multi-AZ cho RDS — tăng tính sẵn sàng/failover, không giảm tải đọc.\n✗ Di chuyển sang DynamoDB — thay đổi lớn, không phải cách trực tiếp để cache truy vấn nóng.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-045",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to run complex analytics reports on petabytes of historical data using SQL queries with columnar storage optimization. Which service is most suitable?",
    "options": [
      "Amazon Redshift",
      "Amazon DynamoDB",
      "Amazon ElastiCache",
      "Amazon RDS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Redshift là data warehouse columnar, tối ưu cho analytics SQL trên dữ liệu cực lớn.\n✓ Amazon Redshift — đúng, data warehouse columnar cho analytics petabyte-scale.\n✗ Amazon DynamoDB — NoSQL cho workload transactional latency thấp, không cho analytics phức tạp.\n✗ Amazon ElastiCache — in-memory cache, không phải kho phân tích.\n✗ Amazon RDS — OLTP relational, không tối ưu cho phân tích petabyte.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-046",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company is migrating an on-premises Oracle database to AWS and wants minimal downtime during migration while the source database remains operational. Which service supports this?",
    "options": [
      "AWS Database Migration Service (DMS)",
      "AWS Snowball",
      "Amazon CloudWatch",
      "AWS Config"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DMS sao chép dữ liệu sang AWS với downtime tối thiểu trong khi nguồn vẫn chạy.\n✓ AWS Database Migration Service (DMS) — đúng, migrate database với minimal downtime.\n✗ AWS Snowball — di chuyển dữ liệu khối lượng lớn qua thiết bị vật lý, không phải replication database liên tục.\n✗ Amazon CloudWatch — monitoring, không di chuyển database.\n✗ AWS Config — đánh giá cấu hình tài nguyên, không liên quan migration.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-046",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company wants to migrate from Oracle to Amazon Aurora PostgreSQL. Since the source and target engines are different, they need to convert schema and stored procedures before migrating data. Which tool is suitable for schema conversion?",
    "options": [
      "AWS Schema Conversion Tool (SCT)",
      "AWS Database Migration Service (DMS) alone",
      "Amazon Aurora Serverless",
      "AWS DataSync"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SCT chuyển đổi schema/code giữa các engine khác nhau (heterogeneous), sau đó DMS di chuyển dữ liệu.\n✓ AWS Schema Conversion Tool (SCT) — đúng, chuyển đổi schema giữa engine khác nhau.\n✗ DMS một mình — di chuyển dữ liệu nhưng không tự chuyển đổi schema heterogeneous đầy đủ.\n✗ Amazon Aurora Serverless — chế độ tính toán của Aurora, không phải công cụ chuyển schema.\n✗ AWS DataSync — di chuyển file/object storage, không chuyển đổi schema database.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-046",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A startup needs a high-performance relational database on AWS compatible with MySQL/PostgreSQL, automatically replicating data across multiple Availability Zones with automatic storage scaling. Which statements about Amazon Aurora are TRUE? (Select 2)",
    "options": [
      "Aurora is compatible with MySQL and PostgreSQL",
      "Aurora automatically replicates data across multiple Availability Zones",
      "Aurora is a NoSQL key-value service",
      "Aurora requires customers to manage OS patching on EC2",
      "Aurora is an in-memory cache service replacing ElastiCache"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Aurora là managed relational DB tương thích MySQL/PostgreSQL với storage tự sao chép qua nhiều AZ.\n✓ Tương thích MySQL và PostgreSQL — đúng, đây là đặc điểm cốt lõi của Aurora.\n✓ Tự động sao chép qua nhiều AZ — đúng, Aurora replicate dữ liệu qua các AZ để bền vững.\n✗ NoSQL key-value — sai, đó là DynamoDB; Aurora là relational.\n✗ Tự quản lý OS patching trên EC2 — sai, Aurora là managed, AWS lo patching.\n✗ In-memory cache thay thế ElastiCache — sai, Aurora không phải cache.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-047",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to run an old database engine with a specific version that Amazon RDS doesn't support, and wants full control over the OS and database configuration. Which deployment approach is most suitable?",
    "options": [
      "Install database manually on Amazon EC2",
      "Use Amazon RDS",
      "Use Amazon DynamoDB",
      "Use Amazon Aurora Serverless"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi cần phiên bản engine không được RDS hỗ trợ và quyền kiểm soát OS đầy đủ, chạy DB tự quản trên EC2 là phù hợp.\n✓ Tự cài database trên EC2 — đúng, cho toàn quyền kiểm soát OS và engine, đánh đổi là khách hàng tự quản lý.\n✗ Amazon RDS — managed nhưng không hỗ trợ engine/phiên bản đặc thù đó và không cho truy cập OS.\n✗ Amazon DynamoDB — NoSQL managed, không thay thế được engine relational cụ thể.\n✗ Aurora Serverless — managed, không cho kiểm soát OS hay engine tùy ý.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-047",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company deploying web servers in VPC wants instances in private subnets to download software updates from the Internet but NOT allow inbound connections from the Internet. Which solution is suitable?",
    "options": [
      "NAT Gateway placed in a public subnet",
      "Internet Gateway attached directly to private subnet",
      "VPC Peering to another VPC",
      "Direct Connect to on-premises"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NAT Gateway cho phép instance ở private subnet khởi tạo kết nối ra Internet nhưng chặn kết nối khởi tạo từ bên ngoài vào.\n✓ NAT Gateway đặt trong public subnet — đúng, cho outbound nhưng không cho inbound.\n✗ Internet Gateway gắn trực tiếp vào private subnet — sẽ biến nó thành public và cho phép inbound.\n✗ VPC Peering tới một VPC khác — kết nối giữa hai VPC, không cấp truy cập Internet.\n✗ Direct Connect tới on-premises — kết nối riêng tới data center, không phải để ra Internet.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-047",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An administrator configures a security group to allow inbound HTTPS (port 443). Users report that responses work normally even without a corresponding outbound rule. Which characteristic of security groups explains this?",
    "options": [
      "Security groups are stateful and automatically allow return traffic of permitted connections",
      "Security groups are stateless so rules are needed for both directions",
      "Security groups evaluate rules by rule number order",
      "Security groups apply at the subnet level"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security group có tính stateful: khi một kết nối inbound được cho phép, traffic phản hồi (return traffic) được tự động cho phép ra mà không cần outbound rule.\n✓ Security group là stateful, tự động cho phép traffic phản hồi — đúng.\n✗ Security group là stateless nên cần rule hai chiều — đó là đặc tính của network ACL.\n✗ Đánh giá rule theo thứ tự số — là cơ chế của network ACL.\n✗ Áp dụng ở cấp subnet — network ACL áp dụng ở subnet, security group áp dụng ở ENI/instance.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-048",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to block a specific range of malicious IP addresses at the subnet level while allowing all other traffic. Which VPC security layer is most suitable for applying explicit deny rules?",
    "options": [
      "Network ACL",
      "Security group",
      "IAM policy",
      "Route table"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Network ACL hoạt động ở cấp subnet và hỗ trợ cả allow và deny rule, phù hợp để chặn IP cụ thể.\n✓ Network ACL — đúng, stateless, cấp subnet, hỗ trợ explicit deny.\n✗ Security group — chỉ hỗ trợ allow rule, không có explicit deny.\n✗ IAM policy — kiểm soát quyền truy cập API/dịch vụ, không lọc traffic mạng.\n✗ Route table — định tuyến traffic, không lọc theo IP nguồn để chặn.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-048",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup wants to register a domain name for its website and route user traffic to its Application Load Balancer. Which AWS service provides DNS and domain registration?",
    "options": [
      "Amazon Route 53",
      "Amazon CloudFront",
      "AWS Direct Connect",
      "Amazon VPC"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Route 53 là dịch vụ DNS có khả năng cao và cũng cho phép đăng ký tên miền.\n✓ Amazon Route 53 — đúng, DNS và domain registration.\n✗ Amazon CloudFront — CDN phân phối nội dung, không phải DNS chính.\n✗ AWS Direct Connect — kết nối mạng riêng tới AWS.\n✗ Amazon VPC — mạng ảo riêng, không cung cấp DNS công cộng cho domain.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-048",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A media company serving videos and images to global users wants to reduce latency by storing content at edge locations near users. Which service is most suitable?",
    "options": [
      "Amazon CloudFront",
      "Amazon Route 53",
      "AWS Global Accelerator",
      "Elastic Load Balancing (ELB)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFront là CDN, cache nội dung tại các edge location toàn cầu để giảm độ trễ.\n✓ Amazon CloudFront — đúng, CDN với edge caching.\n✗ Amazon Route 53 — DNS, không cache nội dung.\n✗ AWS Global Accelerator — tối ưu định tuyến qua mạng AWS nhưng không cache nội dung tĩnh.\n✗ Elastic Load Balancing — phân phối tải trong một region, không phải CDN toàn cầu.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-049",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A bank needs to connect on-premises to AWS with stable bandwidth, consistently low latency and without going through the public Internet to transmit sensitive data continuously. Which solution best meets this?",
    "options": [
      "AWS Direct Connect",
      "AWS Site-to-Site VPN over the Internet",
      "NAT Gateway",
      "Internet Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Direct Connect cung cấp kết nối vật lý chuyên dụng, băng thông ổn định và không qua public Internet, lý tưởng cho dữ liệu nhạy cảm liên tục.\n✓ AWS Direct Connect — đúng, kết nối riêng nhất quán, không qua Internet.\n✗ AWS Site-to-Site VPN qua Internet — mã hóa nhưng vẫn đi qua public Internet, độ trễ kém ổn định.\n✗ NAT Gateway — cho instance private ra Internet, không phải kết nối on-premises.\n✗ Internet Gateway — cấp truy cập Internet cho VPC, không phải kết nối riêng.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-049",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "An architect compares security groups and network ACLs when designing VPC. Which of the following statements are TRUE? (Select 2)",
    "options": [
      "Security groups are stateful and attached at the instance/ENI level",
      "Network ACLs are stateless and applied at the subnet level",
      "Security groups support both allow and deny rules",
      "Network ACLs don't need return traffic rules because they're stateful",
      "Security groups are evaluated by rule number order"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Security group stateful ở cấp instance; network ACL stateless ở cấp subnet.\n✓ Security group là stateful và gắn ở cấp instance/ENI — đúng.\n✓ Network ACL là stateless và áp dụng ở cấp subnet — đúng.\n✗ Security group hỗ trợ cả allow và deny — sai, chỉ allow.\n✗ Network ACL không cần rule return traffic vì stateful — sai, network ACL là stateless nên cần rule hai chiều.\n✗ Security group đánh giá theo rule number — sai, đó là network ACL.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-049",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company wants to improve availability by deploying an application across two regions and automatically redirecting users to the healthy region when one fails. Which Route 53 feature supports this?",
    "options": [
      "Route 53 health checks combined with failover routing policy",
      "CloudFront origin failover",
      "VPC Peering between two regions",
      "Security group cross-region reference"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Route 53 health checks giám sát endpoint và failover routing policy tự động chuyển DNS sang region khỏe mạnh.\n✓ Route 53 health checks kết hợp failover routing policy — đúng, đáp ứng yêu cầu DNS-level failover.\n✗ CloudFront origin failover — chỉ failover giữa origin trong CDN, không định tuyến DNS đa region kiểu này.\n✗ VPC Peering giữa hai region — kết nối mạng, không tự chuyển hướng người dùng khi region lỗi.\n✗ Security group cross-region reference — không tồn tại tính năng định tuyến failover như vậy.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-050",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company stores product images that are frequently accessed and need high availability. They want to store objects (files) without managing servers. Which AWS storage type is most suitable?",
    "options": [
      "Amazon EBS (block storage)",
      "Amazon S3 (object storage)",
      "Amazon EC2 instance store",
      "Amazon EFS (file storage)"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "S3 là object storage, lưu file dưới dạng object trong bucket, không cần quản lý server, độ bền và sẵn sàng cao.\n✓ Amazon S3 (object storage) — đúng, lưu object qua HTTP API, không cần server.\n✗ Amazon EBS (block storage) — volume gắn vào 1 EC2, không phải lưu trữ object độc lập.\n✗ Amazon EC2 instance store — lưu trữ tạm thời (ephemeral), mất dữ liệu khi instance dừng.\n✗ Amazon EFS (file storage) — file system NFS dùng chung, không tối ưu cho object như ảnh phục vụ web.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-050",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company needs to store backup data that is accessed very rarely (1-2 times/year) and accepts recovery time up to 12-48 hours for the LOWEST cost. Which storage class is suitable?",
    "options": [
      "S3 Standard",
      "S3 Standard-IA",
      "S3 Glacier Flexible Retrieval",
      "S3 Glacier Deep Archive"
    ],
    "correctIndices": [
      3
    ],
    "explanation": "S3 Glacier Deep Archive có chi phí lưu trữ thấp nhất, retrieval 12-48 giờ, lý tưởng cho archive dài hạn.\n✓ S3 Glacier Deep Archive — đúng, rẻ nhất, retrieval tính bằng giờ.\n✗ S3 Standard — đắt nhất, dùng cho dữ liệu truy cập thường xuyên.\n✗ S3 Standard-IA — cho dữ liệu ít truy cập nhưng vẫn cần lấy ngay, đắt hơn Glacier.\n✗ S3 Glacier Flexible Retrieval — rẻ nhưng vẫn đắt hơn Deep Archive.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-050",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has data with unpredictable access patterns and wants AWS to automatically move data between tiers to optimize cost without impacting performance. Which solution is most suitable?",
    "options": [
      "S3 Standard with manual migration scripts",
      "S3 Intelligent-Tiering",
      "S3 One Zone-IA",
      "Configure lifecycle transition to Glacier after 30 days"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "S3 Intelligent-Tiering tự động di chuyển object giữa các access tier dựa trên mẫu truy cập, không phí truy cập và không ảnh hưởng hiệu năng.\n✓ S3 Intelligent-Tiering — đúng, tự động tối ưu cho mẫu truy cập không dự đoán được.\n✗ S3 Standard và viết script chuyển thủ công — tốn công, không tự động.\n✗ S3 One Zone-IA — lưu 1 AZ, dùng cho data tái tạo được, không giải quyết mẫu truy cập biến động.\n✗ Lifecycle chuyển sang Glacier sau 30 ngày — quy tắc cố định, không thích ứng với truy cập bất thường.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-051",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company stores thumbnail copies that can be easily recreated from the original image and are rarely accessed. They want to reduce costs and accept storing in a single Availability Zone because the data is not critical. Which storage class optimizes cost the most?",
    "options": [
      "S3 Standard",
      "S3 One Zone-IA",
      "S3 Glacier Deep Archive",
      "S3 Standard-IA"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "S3 One Zone-IA lưu dữ liệu trong 1 Availability Zone, rẻ hơn ~20% so với Standard-IA, phù hợp cho dữ liệu tái tạo được, ít truy cập.\n✓ S3 One Zone-IA — đúng, rẻ cho dữ liệu có thể tạo lại, chấp nhận lưu 1 AZ.\n✗ S3 Standard — đắt, lưu nhiều AZ, thừa cho dữ liệu tái tạo được.\n✗ S3 Glacier Deep Archive — retrieval hàng giờ, không hợp với thumbnail cần lấy nhanh.\n✗ S3 Standard-IA — lưu nhiều AZ nên đắt hơn One Zone-IA, không cần thiết ở đây.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-051",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to automatically transition logs to Standard-IA after 30 days and to Glacier after 90 days, then delete after 365 days. Which S3 feature implements this?",
    "options": [
      "S3 Versioning",
      "S3 Lifecycle policy",
      "S3 Replication",
      "S3 Object Lock"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "S3 Lifecycle policy định nghĩa quy tắc tự động chuyển storage class (transition) và xóa object (expiration) theo tuổi của object.\n✓ S3 Lifecycle policy — đúng, tự động transition và expire object theo thời gian.\n✗ S3 Versioning — giữ nhiều phiên bản object, không chuyển tier theo lịch.\n✗ S3 Replication — sao chép object sang bucket khác, không quản lý vòng đời.\n✗ S3 Object Lock — chống xóa/ghi đè (WORM), không phải tự động chuyển tier.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-051",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A database application on EC2 needs a high-performance block storage volume attached to the instance that persists independently when the instance is stopped. Which service is appropriate?",
    "options": [
      "Amazon S3",
      "Amazon EBS",
      "Amazon EC2 instance store",
      "Amazon S3 Glacier"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Amazon EBS cung cấp block storage gắn vào EC2, dữ liệu tồn tại độc lập (persistent) sau khi instance dừng.\n✓ Amazon EBS — đúng, block storage bền vững cho database.\n✗ Amazon S3 — object storage, không phải block, không gắn như volume.\n✗ Amazon EC2 instance store — block nhưng ephemeral, mất dữ liệu khi instance dừng.\n✗ Amazon S3 Glacier — archive, không dùng làm volume database.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-052",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Multiple Linux EC2 instances within the same VPC need to simultaneously read/write to a shared file system using the NFS protocol that automatically scales capacity. Which service is most appropriate?",
    "options": [
      "Amazon EBS",
      "Amazon EFS",
      "Amazon S3",
      "Amazon FSx for Windows File Server"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Amazon EFS là file storage dùng NFS, cho phép nhiều EC2 (Linux) truy cập đồng thời và tự động co giãn dung lượng.\n✓ Amazon EFS — đúng, file system NFS dùng chung, đàn hồi.\n✗ Amazon EBS — thường gắn vào 1 instance tại 1 thời điểm, không phải NFS dùng chung đàn hồi.\n✗ Amazon S3 — object storage, không phải file system NFS.\n✗ Amazon FSx for Windows File Server — dùng SMB cho Windows, không phải NFS.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-052",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company runs a Windows application that requires a file share using the SMB protocol and Active Directory integration. Which AWS service is most appropriate?",
    "options": [
      "Amazon EFS",
      "Amazon FSx for Windows File Server",
      "Amazon S3",
      "Amazon EBS"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Amazon FSx for Windows File Server cung cấp file system Windows native dùng SMB và tích hợp Active Directory.\n✓ Amazon FSx for Windows File Server — đúng, hỗ trợ SMB và AD cho workload Windows.\n✗ Amazon EFS — dùng NFS cho Linux, không phù hợp SMB/Windows native.\n✗ Amazon S3 — object storage, không phải file share SMB.\n✗ Amazon EBS — block storage gắn 1 instance, không phải file share dùng chung.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-052",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has an on-premises data center and wants to seamlessly expand storage to the cloud, allowing on-premises applications to access AWS storage via standard file/iSCSI protocols with local caching. Which service is appropriate?",
    "options": [
      "AWS Direct Connect",
      "AWS Storage Gateway",
      "AWS DataSync",
      "Amazon S3 Transfer Acceleration"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "AWS Storage Gateway là cầu nối hybrid, cho phép ứng dụng on-prem dùng giao thức NFS/SMB/iSCSI để truy cập lưu trữ trên AWS (S3, EBS, tape) với cache cục bộ.\n✓ AWS Storage Gateway — đúng, kết nối storage on-prem với AWS qua giao thức tiêu chuẩn.\n✗ AWS Direct Connect — kết nối mạng riêng, không phải gateway lưu trữ.\n✗ AWS DataSync — di chuyển/đồng bộ dữ liệu khối lượng lớn, không phải truy cập liên tục qua iSCSI/file.\n✗ Amazon S3 Transfer Acceleration — tăng tốc upload lên S3 qua edge, không phải gateway hybrid.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-053",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company wants CENTRALIZED backup management for multiple AWS services (EBS, RDS, DynamoDB, EFS) with unified policies and compliance requirements. Which statements about AWS Backup are CORRECT? (Choose 2)",
    "options": [
      "AWS Backup manages and automates centralized backups for multiple AWS services",
      "AWS Backup allows defining backup plans with schedules and retention policies applied via tags",
      "AWS Backup only supports backup for Amazon EBS",
      "AWS Backup is a storage class of S3",
      "AWS Backup completely replaces the need for S3 Versioning"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "AWS Backup là dịch vụ quản lý backup tập trung, dùng backup plan (lịch + retention) và có thể áp dụng theo tag để bảo vệ nhiều dịch vụ.\n✓ AWS Backup quản lý và tự động hóa backup tập trung cho nhiều dịch vụ — đúng, hỗ trợ EBS, RDS, DynamoDB, EFS, v.v.\n✓ AWS Backup cho phép định nghĩa backup plan với lịch và retention áp dụng qua tag — đúng, dùng tag-based resource assignment.\n✗ AWS Backup chỉ hỗ trợ backup cho Amazon EBS — sai, hỗ trợ nhiều dịch vụ.\n✗ AWS Backup là một storage class của S3 — sai, đây là dịch vụ backup, không phải storage class.\n✗ AWS Backup thay thế hoàn toàn nhu cầu dùng S3 Versioning — sai, hai tính năng phục vụ mục đích khác nhau.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-053",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to automatically analyze images uploaded by users to detect inappropriate content (NSFW) and identify objects in images without training a machine learning model. Which AWS service is most appropriate?",
    "options": [
      "Amazon Rekognition",
      "Amazon Comprehend",
      "Amazon Polly",
      "Amazon Transcribe"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rekognition là dịch vụ phân tích hình ảnh và video được huấn luyện sẵn, hỗ trợ nhận diện đối tượng và kiểm duyệt nội dung.\n✓ Amazon Rekognition — đúng, phân tích ảnh/video, phát hiện nội dung không phù hợp, nhận diện đối tượng.\n✗ Amazon Comprehend — NLP cho văn bản, không xử lý hình ảnh.\n✗ Amazon Polly — chuyển văn bản thành giọng nói (text-to-speech).\n✗ Amazon Transcribe — chuyển giọng nói thành văn bản (speech-to-text).",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-053",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A reading application needs to convert text content to natural-sounding speech so users can listen. Which AWS service is appropriate?",
    "options": [
      "Amazon Polly",
      "Amazon Transcribe",
      "Amazon Translate",
      "Amazon Lex"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Polly chuyển văn bản thành giọng nói (text-to-speech) với giọng tự nhiên.\n✓ Amazon Polly — đúng, text-to-speech.\n✗ Amazon Transcribe — speech-to-text, ngược lại với yêu cầu.\n✗ Amazon Translate — dịch ngôn ngữ, không tạo giọng nói.\n✗ Amazon Lex — xây dựng chatbot/voice bot, không phải dịch vụ đọc văn bản.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-054",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to build a chatbot with support for natural language understanding and conversation handling in both text and voice. Which AWS service should be used?",
    "options": [
      "Amazon Lex",
      "Amazon Kendra",
      "Amazon Comprehend",
      "Amazon Personalize"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lex là dịch vụ xây dựng giao diện hội thoại (chatbot) hỗ trợ cả văn bản và giọng nói, dùng cùng công nghệ với Alexa.\n✓ Amazon Lex — đúng, xây dựng conversational chatbot (text và voice).\n✗ Amazon Kendra — dịch vụ tìm kiếm thông minh trong tài liệu doanh nghiệp.\n✗ Amazon Comprehend — phân tích văn bản (sentiment, entity), không tạo hội thoại.\n✗ Amazon Personalize — đưa ra gợi ý/đề xuất (recommendations).",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-054",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A business has thousands of internal documents and wants employees to search for information using natural language questions, returning accurate answers rather than keyword lists. Which AWS service is most appropriate?",
    "options": [
      "Amazon Kendra",
      "Amazon Lex",
      "Amazon Athena",
      "Amazon Comprehend"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kendra là dịch vụ tìm kiếm doanh nghiệp dựa trên ML, hiểu câu hỏi ngôn ngữ tự nhiên và trả về câu trả lời từ kho tài liệu.\n✓ Amazon Kendra — đúng, intelligent enterprise search trên tài liệu.\n✗ Amazon Lex — xây chatbot hội thoại, không phải search tài liệu.\n✗ Amazon Athena — truy vấn SQL trên dữ liệu trong S3, không phải tìm kiếm ngôn ngữ tự nhiên trong tài liệu.\n✗ Amazon Comprehend — phân tích văn bản nhưng không cung cấp công cụ tìm kiếm.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-054",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An analytics team wants to run SQL queries directly on log files stored in Amazon S3 without loading data into a database or managing servers. Which service is appropriate?",
    "options": [
      "Amazon Athena",
      "Amazon EMR",
      "Amazon QuickSight",
      "AWS Glue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena là dịch vụ serverless cho phép truy vấn SQL trực tiếp dữ liệu trong S3, trả phí theo lượng dữ liệu quét.\n✓ Amazon Athena — đúng, serverless SQL query trực tiếp trên S3.\n✗ Amazon EMR — cụm big data (Spark/Hadoop) cần quản lý cluster.\n✗ Amazon QuickSight — công cụ BI/dashboard trực quan hóa, không phải engine truy vấn ad-hoc.\n✗ AWS Glue — dịch vụ ETL, dùng để chuẩn bị dữ liệu chứ không phải để chạy truy vấn phân tích.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-055",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to build a serverless ETL pipeline to discover, prepare, and transform data from multiple sources before loading into a data warehouse, while maintaining a data catalog. Which AWS service is most appropriate?",
    "options": [
      "AWS Glue",
      "Amazon Kinesis Data Streams",
      "Amazon Athena",
      "Amazon Redshift"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Glue là dịch vụ ETL serverless, có Glue Data Catalog để quản lý metadata và crawler tự động phát hiện schema.\n✓ AWS Glue — đúng, serverless ETL kèm Data Catalog.\n✗ Amazon Kinesis Data Streams — thu thập dữ liệu streaming real-time, không phải ETL batch.\n✗ Amazon Athena — truy vấn SQL, không phải công cụ ETL.\n✗ Amazon Redshift — data warehouse đích, không phải công cụ ETL chuẩn bị dữ liệu.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-055",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to collect and process clickstream data from their website in real-time to analyze user behavior as events occur. Which AWS service is most appropriate?",
    "options": [
      "Amazon Kinesis",
      "AWS Glue",
      "Amazon Athena",
      "Amazon QuickSight"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kinesis được thiết kế để thu thập, xử lý và phân tích dữ liệu streaming theo thời gian thực.\n✓ Amazon Kinesis — đúng, ingest và xử lý streaming data real-time.\n✗ AWS Glue — ETL theo lô (batch), không tối ưu cho streaming real-time.\n✗ Amazon Athena — truy vấn dữ liệu tĩnh đã lưu, không xử lý luồng real-time.\n✗ Amazon QuickSight — công cụ BI để trực quan hóa, không thu thập dữ liệu streaming.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-055",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company wants to build a solution to analyze multi-national customer feedback: automatically translate foreign-language reviews to English, then analyze sentiment and extract entities from the text. Which AWS services should be combined? (Choose 2)",
    "options": [
      "Amazon Translate",
      "Amazon Comprehend",
      "Amazon Polly",
      "Amazon Rekognition",
      "Amazon Transcribe"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Translate dịch văn bản giữa các ngôn ngữ, Comprehend phân tích sentiment và trích xuất entity từ văn bản.\n✓ Amazon Translate — đúng, dịch đánh giá tiếng nước ngoài sang tiếng Anh.\n✓ Amazon Comprehend — đúng, phân tích cảm xúc và trích xuất thực thể (NLP).\n✗ Amazon Polly — text-to-speech, không liên quan đến dịch hay phân tích cảm xúc.\n✗ Amazon Rekognition — phân tích ảnh/video, không xử lý văn bản.\n✗ Amazon Transcribe — speech-to-text, không cần vì dữ liệu đầu vào đã là văn bản.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-056",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company is implementing a highly available web application using EC2 instances in multiple Availability Zones, needs to ensure users can reach at least one healthy instance, and wants automatic failover if an AZ becomes unavailable. How can this architecture be designed? (Choose 2)",
    "options": [
      "Place EC2 instances in different Availability Zones within the same region",
      "Use an Application Load Balancer across multiple Availability Zones with health checks",
      "Use a single EC2 instance with high instance type for redundancy",
      "Rely on Amazon CloudFront to handle multi-AZ failover",
      "Configure NAT Gateway in each Availability Zone"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SNS là dịch vụ pub/sub, đẩy (push) một message tới nhiều subscriber cùng lúc (fan-out).\n✓ Amazon SNS — đúng, mô hình pub/sub push tới nhiều endpoint (email, SMS, SQS, Lambda) cùng lúc.\n✗ Amazon SQS — là hàng đợi pull, mỗi message thường chỉ một consumer xử lý, không phải pub/sub.\n✗ Amazon Connect — là contact center (tổng đài) đám mây, không phải messaging pub/sub.\n✗ Amazon SES — chỉ gửi/nhận email, không fan-out đa kênh tới nhiều loại subscriber.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-056",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's website experiences unexpected traffic spikes and needs to scale automatically. They use Application Load Balancer to distribute traffic and want to add/remove EC2 instances automatically when CPU utilization exceeds 70%. Which service enables this?",
    "options": [
      "AWS Auto Scaling",
      "Amazon CloudWatch only",
      "Elastic Load Balancing alone",
      "Amazon Machine Image (AMI) templates"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SQS là message queue, đệm message để consumer pull và xử lý theo tốc độ của mình, giúp decouple và chống mất dữ liệu khi tải tăng.\n✓ Amazon SQS làm hàng đợi đệm — đúng, buffer các đơn và xử lý dần (decoupling).\n✗ SNS push trực tiếp — push không đệm, nếu consumer quá tải dễ mất hoặc dồn dập, không phải hàng đợi.\n✗ SES email — dịch vụ email, không dùng để đệm/xử lý đơn hàng nội bộ.\n✗ AWS X-Ray — công cụ tracing/gỡ lỗi ứng dụng phân tán, không truyền dữ liệu nghiệp vụ.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-056",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to consolidate management of network connectivity between multiple VPCs within the same region and an on-premises data center into a central location. Which service enables this central management?",
    "options": [
      "AWS Transit Gateway",
      "Amazon VPC Peering",
      "AWS Direct Connect alone",
      "Internet Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge là event bus serverless, định tuyến event từ nhiều nguồn (AWS, SaaS, ứng dụng custom) tới target dựa trên rule, lý tưởng cho kiến trúc event-driven.\n✓ Amazon EventBridge — đúng, event bus với rule lọc và route tới nhiều target.\n✗ Amazon SQS — hàng đợi point-to-point, không có cơ chế rule routing đa nguồn/đa target như event bus.\n✗ AWS CodePipeline — dịch vụ CI/CD pipeline phát hành phần mềm, không phải event router chung.\n✗ Amazon AppStream 2.0 — streaming ứng dụng desktop, không liên quan event routing.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-057",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company monitors its AWS infrastructure and wants to receive notifications when CPU utilization on an EC2 instance exceeds 80%, or when database connections reach 1000 on an RDS database. Which service enables these custom monitoring and alerting?",
    "options": [
      "Amazon CloudWatch",
      "AWS CloudTrail",
      "Amazon CloudFront",
      "AWS Config"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "WorkSpaces cung cấp Desktop-as-a-Service (DaaS) — máy desktop ảo bền vững cho từng người dùng làm việc hằng ngày.\n✓ Amazon WorkSpaces — đúng, virtual desktop được quản lý cho người dùng cuối.\n✗ Amazon AppStream 2.0 — stream từng ứng dụng riêng lẻ, không phải một desktop đầy đủ bền vững.\n✗ Amazon Connect — contact center đám mây, không phải desktop ảo.\n✗ AWS Amplify — framework phát triển và host ứng dụng web/mobile, không liên quan desktop ảo.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "clf-m2-057",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to audit and track all API calls made to AWS services (who called what, when, from where) for compliance purposes, and store the audit logs for 2 years. Which service provides this capability?",
    "options": [
      "AWS CloudTrail",
      "Amazon CloudWatch",
      "AWS CloudFormation",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AppSync cung cấp managed GraphQL API (real-time, offline sync), còn Amplify giúp build/host frontend web/mobile nhanh chóng.\n✓ AppSync + Amplify — đúng, đúng cặp cho GraphQL backend và phát triển/host frontend.\n✗ SQS + SES — hàng đợi và email, không phải GraphQL hay framework frontend.\n✗ X-Ray + CodeBuild — tracing và build code, không cung cấp GraphQL API.\n✗ Connect + EventBridge — contact center và event bus, không liên quan GraphQL/frontend.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "clf-m3-057",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company has hundreds of AWS resources and wants to check if all EC2 instances have encryption enabled and all S3 buckets have versioning enabled across their entire AWS account. Which service helps assess compliance against these rules?",
    "options": [
      "AWS Config",
      "Amazon CloudWatch",
      "AWS CloudTrail",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "CodeBuild build/test, CodePipeline điều phối các stage, X-Ray trace request — đúng bộ công cụ cho CI/CD và gỡ lỗi phân tán.\n✓ AWS CodeBuild — đúng, dịch vụ build và chạy test được quản lý.\n✓ AWS CodePipeline — đúng, điều phối luồng build–test–deploy.\n✓ AWS X-Ray — đúng, distributed tracing để phân tích hiệu năng giữa microservice.\n✗ Amazon AppStream 2.0 — streaming ứng dụng desktop, không build mã nguồn.\n✗ Amazon SES — dịch vụ email, không điều phối pipeline.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "clf-m1-058",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to automatically scan EC2 instances for software vulnerabilities (CVE) and security issues without having to manually audit each instance. Which AWS service automates this vulnerability assessment?",
    "options": [
      "Amazon Inspector",
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Spot Instances tận dụng năng lực dư thừa của AWS với giá giảm tới 90%, lý tưởng cho workload chịu được gián đoạn.\n✓ Spot Instances — đúng, giá rẻ nhất cho workload interruptible, batch có thể restart.\n✗ On-Demand Instances — không cam kết nhưng giá cao nhất, không tối ưu tiết kiệm.\n✗ Reserved Instances (3 năm All Upfront) — rẻ nhưng cần cam kết dài hạn và phù hợp tải ổn định, không phải batch ngắt quãng.\n✗ Dedicated Hosts — phần cứng vật lý riêng, đắt, dùng cho yêu cầu license/compliance.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-058",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company runs internet-facing web applications and wants to protect them from DDoS attacks and common web exploits (SQL injection, cross-site scripting). Which AWS service filters malicious web traffic?",
    "options": [
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Shield only",
      "VPC Security Group only"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS thường không tính phí cho dữ liệu đi VÀO (inbound/data in) AWS; phí chủ yếu phát sinh khi dữ liệu đi RA (outbound).\n✓ Inbound data transfer vào AWS thường miễn phí — đúng, đây là nguyên tắc pricing cơ bản của AWS.\n✗ Inbound bị tính phí cao hơn outbound — sai, ngược lại, inbound thường free.\n✗ Mọi data transfer tính phí như nhau — sai, chiều và phạm vi (Region) ảnh hưởng giá.\n✗ Chỉ miễn phí nếu dùng Direct Connect — sai, inbound free không phụ thuộc Direct Connect.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-058",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company continuously analyzes VPC Flow Logs and CloudTrail events to detect unusual API activity and potential unauthorized access patterns in real-time. Which AWS service intelligently detects threats?",
    "options": [
      "Amazon GuardDuty",
      "AWS WAF",
      "Amazon Inspector",
      "AWS Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Savings Plans cam kết một mức chi tiêu ($/giờ) và tự động áp dụng giảm giá cho mọi instance family, size, OS, Region và cả Fargate/Lambda.\n✓ Compute Savings Plans — đúng, linh hoạt nhất qua family/size/Region/OS với mức giảm tương đương RI.\n✗ Standard Reserved Instances — giảm giá cao nhưng kém linh hoạt, gắn với cấu hình cụ thể.\n✗ Spot Instances — rẻ nhưng có thể bị gián đoạn, không phù hợp web 24/7.\n✗ On-Demand Capacity Reservations — đảm bảo năng lực nhưng không giảm giá tự thân.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-059",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has petabytes of sensitive customer data stored in S3 buckets and wants to automatically discover and catalog personally identifiable information (PII) like credit card numbers and social security numbers. Which AWS service automates this discovery?",
    "options": [
      "AWS Macie",
      "Amazon Rekognition",
      "AWS Secrets Manager",
      "AWS KMS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong consolidated billing, lợi ích RI/Savings Plans có thể được chia sẻ giữa các tài khoản khi tính năng sharing được bật (mặc định bật ở cấp tổ chức).\n✓ Lợi ích có thể được chia sẻ cho các tài khoản khác khi RI sharing bật — đúng, đây là lợi ích của consolidated billing.\n✗ Bị hủy và hoàn tiền — sai, RI không hoạt động như vậy.\n✗ RI không áp dụng được trong Organizations — sai.\n✗ Không thể chia sẻ trong mọi trường hợp — sai, sharing là tính năng được hỗ trợ.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-059",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company stores database passwords and API keys in AWS and wants to automatically rotate them, control who can access them, and audit access. Which service manages secrets?",
    "options": [
      "AWS Secrets Manager",
      "AWS Systems Manager Parameter Store only",
      "IAM Policy Documents",
      "Environment Variables in EC2 AMI"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dedicated Hosts cung cấp máy chủ vật lý chuyên dụng và hiển thị số socket/core, hỗ trợ BYOL theo license gắn với phần cứng.\n✓ Dedicated Hosts — đúng, thấy được sockets/cores, phù hợp BYOL theo phần cứng.\n✗ Dedicated Instances — chạy trên hardware chuyên dụng nhưng không expose chi tiết socket/core cho license.\n✗ Spot Instances — không liên quan license/phần cứng vật lý chuyên dụng.\n✗ On-Demand Capacity Reservations — chỉ đảm bảo năng lực, không phải hardware riêng cho license.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-059",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company has sensitive data that must be encrypted both in transit and at rest, and wants AWS to manage encryption keys while maintaining full control over key lifecycle. Which key management service is appropriate?",
    "options": [
      "AWS Key Management Service (KMS)",
      "AWS Secrets Manager only",
      "Amazon S3 Server-Side Encryption with S3-managed keys (SSE-S3)",
      "SSL/TLS certificates only"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "On-Demand Capacity Reservations dành riêng năng lực EC2 trong một AZ cụ thể mà không yêu cầu cam kết dài hạn.\n✓ On-Demand Capacity Reservations — đúng, đảm bảo capacity trong AZ, linh hoạt tạo/hủy.\n✗ Spot Instances — có thể bị thu hồi, không đảm bảo năng lực.\n✗ Compute Savings Plans — chỉ là cam kết chi tiêu để giảm giá, không reserve capacity.\n✗ Standard RI bán lại trên Marketplace — liên quan thanh lý cam kết, không phải đảm bảo capacity tức thời.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-060",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's IAM policy allows users to create, modify, and delete resources, but a manager wants to prevent a user from deleting a critical database even though the policy would normally allow it. Which mechanism enforces this protection?",
    "options": [
      "IAM Permission Boundaries",
      "Service Control Policies (SCP)",
      "Resource-based policy tags",
      "IAM roles only"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Data transfer cross-Region bị tính phí, trong khi lưu lượng cùng Region (đặc biệt cùng AZ) rẻ hơn nhiều hoặc miễn phí.\n✓ Đặt EC2 và RDS cùng Region/AZ — đúng, loại bỏ phí cross-Region đắt đỏ.\n✗ Chuyển sang Spot — chỉ giảm giá compute, không liên quan data transfer cross-Region.\n✗ Mua Reserved Instances — giảm chi phí instance, không phải data transfer.\n✗ S3 Intelligent-Tiering — tối ưu chi phí lưu trữ S3, không liên quan.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-060",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A large organization has multiple AWS accounts for different departments and wants to enforce organizational policies (like requiring encryption, preventing public S3 access) across all accounts in one place. Which service provides this central governance?",
    "options": [
      "AWS Organizations with Service Control Policies",
      "IAM Policy alone",
      "VPC Peering",
      "AWS Config only"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Chi phí lưu trữ S3 giảm dần khi tần suất truy cập thấp đi; Deep Archive rẻ nhất, Intelligent-Tiering tự động hóa việc chuyển tier.\n✓ S3 Glacier Deep Archive chi phí thấp nhất, truy xuất lâu nhất — đúng, dành cho lưu trữ lâu dài hiếm truy cập.\n✓ S3 Intelligent-Tiering tự động chuyển tier — đúng, tối ưu chi phí không cần can thiệp.\n✗ S3 Standard rẻ hơn Deep Archive — sai, Standard đắt hơn nhiều cho lưu trữ.\n✗ S3 One Zone-IA luôn đắt hơn Standard — sai, One Zone-IA rẻ hơn vì chỉ lưu một AZ.\n✗ Mọi storage class cùng phí mỗi GB — sai, phí khác nhau theo tier.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-060",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company wants to grant temporary AWS access to a third-party auditor for 24 hours without creating a long-term IAM user and without sharing permanent credentials. Which approach provides secure temporary access? (Choose 2)",
    "options": [
      "Use AWS STS (Security Token Service) to assume an IAM role with time-limited session",
      "Create an IAM user with a one-time password that expires after 24 hours",
      "Share the root account credentials for 24 hours only",
      "Use Amazon Cognito for federated access to grant temporary credentials",
      "Create an EC2 instance key pair and share it verbally"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 Instance Savings Plans cho mức giảm giá cao nhất (tương đương Standard RI) nhưng cố định instance family trong một Region.\n✓ EC2 Instance Savings Plans — đúng, giảm giá sâu nhất khi cố định family + Region.\n✗ Compute Savings Plans — linh hoạt hơn nhưng mức giảm thấp hơn EC2 Instance Savings Plans.\n✗ Convertible Reserved Instances — linh hoạt đổi cấu hình nhưng giảm giá thấp hơn Standard.\n✗ Spot Savings Plans — không tồn tại loại sản phẩm này.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-061",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to receive an email alert when its monthly AWS expenses exceed $5,000, to proactively control its budget. Which service is the best fit?",
    "options": [
      "AWS Budgets",
      "AWS Cost Explorer",
      "AWS Pricing Calculator",
      "AWS Cost and Usage Report (CUR)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Budgets cho phép đặt ngưỡng chi phí/sử dụng và gửi cảnh báo khi vượt hoặc dự báo vượt.\n✓ AWS Budgets — đúng, đặt ngưỡng và gửi alert chủ động qua email/SNS.\n✗ AWS Cost Explorer — chỉ trực quan hóa và phân tích chi phí quá khứ, không gửi cảnh báo ngưỡng.\n✗ AWS Pricing Calculator — ước tính chi phí trước khi triển khai, không theo dõi chi phí thực tế.\n✗ AWS Cost and Usage Report (CUR) — báo cáo chi tiết nhất dạng file, không có cơ chế cảnh báo.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-061",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An architect is planning to migrate a workload to AWS and needs to estimate monthly costs for EC2, S3, and RDS BEFORE deploying any resources. Which tools should I use?",
    "options": [
      "AWS Pricing Calculator",
      "AWS Cost Explorer",
      "AWS Budgets",
      "AWS Billing Dashboard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Pricing Calculator giúp ước tính chi phí trước khi triển khai dựa trên cấu hình dự kiến.\n✓ AWS Pricing Calculator — đúng, ước tính chi phí cho tài nguyên chưa tồn tại.\n✗ AWS Cost Explorer — chỉ phân tích chi phí thực tế đã phát sinh.\n✗ AWS Budgets — đặt ngưỡng và cảnh báo, không phải công cụ ước tính ban đầu.\n✗ AWS Billing Dashboard — hiển thị hóa đơn hiện tại, không ước tính kế hoạch tương lai.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-061",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A corporation has 12 separate AWS accounts for each department. They want to receive a single invoice and take advantage of volume discounts when aggregating the usage of all accounts. Which solution is right for you?",
    "options": [
      "Using AWS Organizations with consolidated billing",
      "Create an AWS Budget common to all accounts",
      "Enable Cost and Usage Report for each account",
      "Buy Reserved Instances in management account"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Consolidated billing trong AWS Organizations gộp sử dụng nhiều tài khoản để đạt mức giảm giá theo bậc và một hóa đơn duy nhất.\n✓ Dùng AWS Organizations với consolidated billing — đúng, một hóa đơn và aggregate usage để hưởng volume discount.\n✗ Tạo một AWS Budget chung — chỉ theo dõi/cảnh báo chi phí, không gộp hóa đơn hay giảm giá.\n✗ Bật Cost and Usage Report cho từng tài khoản — chỉ tạo báo cáo, không gộp hóa đơn.\n✗ Mua Reserved Instances trong tài khoản quản lý — là mô hình giá, không tự tạo hóa đơn hợp nhất.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-062",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to allocate AWS costs by project and department to see exactly how much it costs. They need to label their resources with metadata and enable them to appear in the expense report. Which solution is right?",
    "options": [
      "Use cost allocation tags and activate them in Billing console",
      "Create multiple linked accounts, one per project, then read Cost Explorer",
      "Enable AWS Pricing Calculator per department",
      "Use IAM groups to split costs by user"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cost allocation tags gắn nhãn (vd Project, Department) lên tài nguyên và sau khi kích hoạt sẽ phân tách chi phí trong báo cáo.\n✓ Sử dụng cost allocation tags và kích hoạt chúng trong Billing console — đúng, đây là cơ chế gắn nhãn metadata để phân bổ chi phí.\n✗ Tạo nhiều linked account mỗi dự án một tài khoản — không phải cách gắn nhãn metadata được hỏi, nặng nề và không tách chi phí trong cùng một tài khoản.\n✗ Bật AWS Pricing Calculator cho mỗi phòng ban — chỉ ước tính, không phân bổ chi phí thực.\n✗ Dùng IAM groups để tách chi phí — IAM quản lý quyền truy cập, không phân bổ chi phí.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-062",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "The finance department needs the MOST detailed cost and usage data, line item by line hourly, to feed into the internal analytics system on Amazon Athena and Amazon Redshift. Which data source is the best fit?",
    "options": [
      "AWS Cost and Usage Report (CUR) saved to S3",
      "AWS Cost Explorer export CSV",
      "AWS Budgets reports",
      "AWS Billing Dashboard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CUR cung cấp dữ liệu chi phí/sử dụng chi tiết nhất ở mức line item theo giờ, lưu vào S3 và tích hợp được với Athena/Redshift/QuickSight.\n✓ AWS Cost and Usage Report (CUR) lưu vào S3 — đúng, dữ liệu chi tiết nhất cho phân tích lớn.\n✗ AWS Cost Explorer xuất CSV — phân tích trực quan, độ chi tiết thấp hơn CUR, không tối ưu cho ingest vào Athena/Redshift.\n✗ AWS Budgets reports — báo cáo trạng thái ngân sách, không phải line item chi tiết.\n✗ AWS Billing Dashboard — tổng quan hóa đơn, không có dữ liệu thô chi tiết.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-062",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to analyze cost trends over the past 6 months, filter by service and region, and see cost forecasts for the next 3 months using an intuitive charting interface. Which tool is the best fit?",
    "options": [
      "AWS Cost Explorer",
      "AWS Pricing Calculator",
      "AWS Cost and Usage Report (CUR)",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cost Explorer cung cấp biểu đồ trực quan, lọc theo dịch vụ/region, phân tích xu hướng quá khứ và forecast chi phí tương lai.\n✓ AWS Cost Explorer — đúng, trực quan hóa xu hướng và dự báo chi phí.\n✗ AWS Pricing Calculator — ước tính trước triển khai, không phân tích chi phí lịch sử.\n✗ AWS Cost and Usage Report (CUR) — dữ liệu thô chi tiết, không có giao diện biểu đồ/forecast sẵn.\n✗ AWS Trusted Advisor — đưa khuyến nghị tối ưu, không phân tích xu hướng chi phí dạng biểu đồ.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-063",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "An organization uses AWS Organizations with consolidated billing across multiple accounts. What statements about the consolidated charging mechanism are TRUE? (Select 2)",
    "options": [
      "Usage of all pooled accounts for volume tiering",
      "Reserved Instances and Savings Plans benefits can be shared between accounts within the organization",
      "Each member account still receives a separate invoice from AWS",
      "Consolidated billing automatically transfers all resources to a single account",
      "Consolidated billing new Savings Plans in effect"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Consolidated billing gộp usage để hưởng volume discount và cho phép chia sẻ lợi ích RI/Savings Plans giữa các tài khoản trong tổ chức (mặc định bật).\n✓ Mức sử dụng của tất cả tài khoản được gộp để hưởng giá theo bậc — đúng, aggregate usage cho volume tiering.\n✓ Lợi ích RI và Savings Plans có thể chia sẻ giữa các tài khoản — đúng, discount sharing trong Organizations.\n✗ Mỗi tài khoản thành viên vẫn nhận hóa đơn riêng — sai, chỉ có một hóa đơn hợp nhất từ management account.\n✗ Tự động chuyển toàn bộ tài nguyên về một tài khoản — sai, tài nguyên vẫn nằm ở từng tài khoản, chỉ gộp billing.\n✗ Yêu cầu mua Savings Plans mới có hiệu lực — sai, consolidated billing không phụ thuộc vào việc mua Savings Plans.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-063",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup has just created its first AWS account and is worried about overspending for the first month. They want to set a budget limit of $100 and be notified when the actual cost reaches 80% of the limit. What to use?",
    "options": [
      "AWS Budgets with cost budget and alerts at 80%",
      "AWS Cost Explorer with daily reports",
      "AWS Pricing Calculator to lock in spending at $100",
      "AWS Organizations to limit account spend"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Budgets cho phép tạo cost budget và cấu hình alert theo ngưỡng phần trăm chi tiêu thực tế.\n✓ AWS Budgets với cost budget và alert ở 80% — đúng, đặt ngân sách và cảnh báo theo ngưỡng.\n✗ AWS Cost Explorer với báo cáo hằng ngày — phân tích chi phí, không đặt ngưỡng cảnh báo chủ động.\n✗ AWS Pricing Calculator để khóa chi tiêu — chỉ ước tính, không thực sự giới hạn hay khóa chi tiêu.\n✗ AWS Organizations để giới hạn chi tiêu — Organizations quản lý nhiều tài khoản, không đặt giới hạn chi tiêu cho một tài khoản đơn lẻ.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-063",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A small startup running a test workload on AWS wants the ability to open an email technical support ticket during business hours at the lowest possible cost. They accept slow response times. Which support plan is the best fit?",
    "options": [
      "AWS Developer Support",
      "AWS Basic Support",
      "AWS Business Support",
      "AWS Enterprise Support"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Developer Support là gói trả phí thấp nhất cho phép mở case kỹ thuật qua email trong giờ làm việc, hợp với môi trường test/dev.\n✓ AWS Developer Support — đúng, hỗ trợ kỹ thuật qua email trong business hours, giá thấp nhất trong các gói có technical support.\n✗ AWS Basic Support — miễn phí nhưng KHÔNG có technical support theo case (chỉ account/billing và tài liệu).\n✗ AWS Business Support — đắt hơn, hỗ trợ 24/7 qua phone/chat, vượt nhu cầu test.\n✗ AWS Enterprise Support — đắt nhất, có TAM, dành cho production quy mô lớn.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-064",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company that runs critical production applications needs a dedicated AWS point of contact that understands their architecture, proactive support, and Concierge Support access for billing/account issues. They want the cost to be lower than the highest plan but still have TAM. Which option is right for you?",
    "options": [
      "AWS Business Support",
      "AWS Enterprise On-Ramp",
      "AWS Developer Support",
      "AWS Basic Support"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Enterprise On-Ramp cung cấp TAM (qua pool) và Concierge với chi phí thấp hơn Enterprise đầy đủ, hợp với production muốn proactive guidance vừa phải.\n✓ AWS Enterprise On-Ramp — đúng, có quyền truy cập TAM (pool of TAMs) và Concierge, rẻ hơn Enterprise.\n✗ AWS Business Support — không bao gồm TAM hay Concierge.\n✗ AWS Developer Support — chỉ email business hours, không TAM/Concierge.\n✗ AWS Basic Support — không có technical support theo case.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-064",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An organization wants to receive automated recommendations to reduce costs (idle resources), improve security (extended security groups), increase fault tolerance, and test service quotas. Which AWS tools provide these checks?",
    "options": [
      "AWS Trusted Advisor",
      "AWS Health Dashboard",
      "AWS Config",
      "Amazon CloudWatch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trusted Advisor đưa ra best-practice checks theo 5 nhóm gồm cost optimization, security, fault tolerance, performance và service limits.\n✓ AWS Trusted Advisor — đúng, cung cấp các check tối ưu chi phí/bảo mật/fault tolerance/service quotas.\n✗ AWS Health Dashboard — thông báo về tình trạng sức khỏe dịch vụ AWS, không phải best-practice checks.\n✗ AWS Config — đánh giá compliance cấu hình resource theo rule, không phải cost/security best-practice tổng hợp.\n✗ Amazon CloudWatch — giám sát metrics/logs, không đưa khuyến nghị best practice.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-064",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's operations team needs to know if a new outage is directly affecting their specific AWS resources, and wants to receive scheduled maintenance personalized notifications that affect their account. What services are available?",
    "options": [
      "AWS Personal Health Dashboard (AWS Health Dashboard - Your account health)",
      "AWS Service Health Dashboard (Open status, public)",
      "AWS Trusted Advisor",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Personal Health Dashboard hiển thị các sự kiện ảnh hưởng riêng tới tài nguyên/account của bạn, kèm thông báo và lịch maintenance cá nhân hóa.\n✓ AWS Personal Health Dashboard — đúng, cảnh báo riêng cho tài nguyên/account của bạn.\n✗ AWS Service Health Dashboard (public) — chỉ hiển thị trạng thái chung của dịch vụ AWS, không cá nhân hóa theo account.\n✗ AWS Trusted Advisor — best-practice checks, không phải health events.\n✗ Amazon Inspector — quét lỗ hổng bảo mật workload, không liên quan health events.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-m1-065",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company that subscribes to AWS Enterprise Support. Which of the following benefits ARE unique/characteristic of Enterprise (compared to Business)? (Select 2)",
    "options": [
      "Technical Account Manager (TAM) designated",
      "AWS Concierge Support team",
      "24/7 technical support via phone, chat and email",
      "Full access to all Trusted Advisor checks",
      "Open case account and unlimited billing"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "TAM chuyên trách (designated) và Concierge Support là đặc trưng của Enterprise Support (On-Ramp dùng pool TAM); một số quyền lợi khác có ở cả Business.\n✓ Technical Account Manager (designated) — đúng, TAM chuyên trách chỉ có ở Enterprise.\n✓ AWS Concierge Support team — đúng, Concierge có ở Enterprise (và On-Ramp dạng pool), không có ở Business.\n✗ Hỗ trợ 24/7 phone/chat/email — Business đã có, không phải đặc trưng riêng Enterprise.\n✗ Full set of Trusted Advisor checks — Business cũng đã được full checks.\n✗ Mở case account/billing không giới hạn — có ở cả Basic trở lên, không đặc trưng Enterprise.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "clf-m2-065",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An enterprise needs an AWS-certified external partner to design and deploy a migration solution to the cloud, or to purchase third-party software that is already integrated with AWS. Where should they go?",
    "options": [
      "AWS Partner Network (APN) and AWS Marketplace",
      "AWS re:post",
      "AWS Trusted Advisor",
      "AWS Basic Support"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "APN tập hợp các Consulting/Technology Partner được chứng nhận; AWS Marketplace là nơi mua phần mềm bên thứ ba tích hợp AWS.\n✓ AWS Partner Network (APN) và AWS Marketplace — đúng, tìm partner triển khai và mua phần mềm bên thứ ba.\n✗ AWS re:Post — cộng đồng hỏi đáp do AWS quản lý, không phải mạng lưới partner.\n✗ AWS Trusted Advisor — best-practice checks, không tìm partner.\n✗ AWS Basic Support — gói support miễn phí, không liên quan partner.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "clf-m3-065",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company that is applying for Business Support has a problem that causes the production system to be down. This is the highest severity level supported by the Business plan. Per AWS Support commitment, what is the target response time for this instance?",
    "options": [
      "Production system down — target response < 1 hour",
      "Production system impaired — target response < 4 hours",
      "General guidance — goal response < 24 hours",
      "Production system down — target feedback < 15 minutes"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với Business Support, 'production system down' là mức severity cao nhất và có response time mục tiêu dưới 1 giờ; mức 15 phút ('business-critical system down') chỉ áp dụng cho Enterprise, còn On-Ramp dùng 30 phút.\n✓ Production system down — < 1 giờ — đúng, đây là cam kết của Business Support cho mức nghiêm trọng nhất của gói này.\n✗ Production system impaired — < 4 giờ — đó là mức severity thấp hơn, hệ thống bị suy giảm chứ chưa xuống hoàn toàn.\n✗ General guidance — < 24 giờ — mức severity thấp nhất, không phù hợp với production-down.\n✗ Production system down — < 15 phút — 15 phút là cam kết cho 'business-critical system down' của Enterprise Support, không phải Business.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "clf-ext-001",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A developer wants to quickly deploy a small WordPress blog with a fixed, predictable monthly cost that includes virtual machines, storage, and data transfer in one package. Which service is the best fit?",
    "options": [
      "Amazon Lightsail",
      "AWS Batch",
      "Amazon EC2 with Reserved Instances",
      "AWS Outposts"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lightsail cung cấp gói trọn gói (VM, storage, transfer) với giá cố định hàng tháng, lý tưởng cho dự án nhỏ và người mới.\n✓ Amazon Lightsail: giá bundle cố định, dễ dự đoán, triển khai nhanh WordPress.\n✗ AWS Batch: dành cho xử lý batch job số lượng lớn, không phải web hosting.\n✗ EC2 với Reserved Instances: vẫn cần tự cấu hình nhiều thành phần, không trọn gói.\n✗ AWS Outposts: hạ tầng AWS đặt tại on-premises, chi phí lớn, không phù hợp blog nhỏ.",
    "domain": 3
  },
  {
    "id": "clf-ext-002",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The company needs to run thousands of scientific calculation jobs in batches, automatically allocate and recover compute resources depending on the workload, without having to manage the queue system and scheduler. Which service is suitable?",
    "options": [
      "AWS Batch",
      "Amazon Lightsail",
      "AWS App Runner",
      "AWS Elastic Beanstalk"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Batch tự động provision tài nguyên compute theo số lượng và yêu cầu của batch job, quản lý queue và scheduling thay bạn.\n✓ AWS Batch: chuyên cho batch computing quy mô lớn, tự động scale tài nguyên.\n✗ Amazon Lightsail: VM đơn giản giá cố định, không phải batch processing.\n✗ AWS App Runner: chạy web app/container service, không tối ưu cho batch job.\n✗ Elastic Beanstalk: triển khai web application, không phải hệ thống batch job khoa học.",
    "domain": 3
  },
  {
    "id": "clf-ext-003",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A development team wants to upload web application code (Java) and let AWS take care of EC2 provisioning, load balancer, Auto Scaling, and monitoring automatically, but keep full access to the underlying resources when fine-tuning is required. Which service is the best fit?",
    "options": [
      "AWS Elastic Beanstalk",
      "AWS Lambda",
      "Amazon Lightsail",
      "AWS Batch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elastic Beanstalk là PaaS: bạn upload code, nó tự tạo và quản lý hạ tầng (EC2, ELB, Auto Scaling) nhưng vẫn cho phép truy cập/điều chỉnh tài nguyên bên dưới.\n✓ Elastic Beanstalk: tự động hóa triển khai mà vẫn giữ quyền kiểm soát hạ tầng.\n✗ AWS Lambda: serverless, không cho truy cập trực tiếp EC2/ELB bên dưới.\n✗ Amazon Lightsail: VM đơn giản, không tự động tạo ELB và Auto Scaling cho app.\n✗ AWS Batch: dành cho batch job, không phải web app PaaS.",
    "domain": 3
  },
  {
    "id": "clf-ext-004",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bệnh viện cần chạy workload trên hạ tầng AWS nhưng do yêu cầu về độ trễ cực thấp tới thiết bị tại chỗ và quy định lưu trữ dữ liệu trong phạm vi tòa nhà, họ phải đặt phần cứng AWS ngay trong data center của mình, được AWS quản lý. Giải pháp nào phù hợp?",
    "options": [
      "AWS Outposts",
      "AWS Local Zones",
      "Amazon Lightsail",
      "Elastic Beanstalk"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Outposts mang phần cứng và dịch vụ AWS đặt ngay tại on-premises của khách hàng, phù hợp yêu cầu low latency cục bộ và data residency tại chỗ.\n✓ AWS Outposts: rack AWS đặt trong data center khách hàng, do AWS quản lý.\n✗ AWS Local Zones: hạ tầng AWS đặt gần khu vực đô thị, không nằm trong tòa nhà khách hàng.\n✗ Amazon Lightsail: chạy trên cloud AWS, không đặt tại chỗ.\n✗ Elastic Beanstalk: dịch vụ triển khai trên cloud, không giải quyết yêu cầu on-premises.",
    "domain": 3
  },
  {
    "id": "clf-ext-005",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một studio game ở thành phố lớn cần độ trễ một chữ số mili-giây cho ứng dụng render thời gian thực phục vụ người dùng trong khu vực đô thị đó, nhưng AWS Region gần nhất lại cách quá xa gây độ trễ cao. Họ muốn đặt compute gần người dùng cuối hơn mà vẫn nằm trong hạ tầng AWS quản lý. Lựa chọn nào phù hợp?",
    "options": [
      "AWS Local Zones",
      "AWS Outposts",
      "AWS Wavelength",
      "AWS Batch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Local Zones đặt compute và storage gần các trung tâm đô thị lớn để giảm độ trễ cho người dùng trong khu vực đó.\n✓ AWS Local Zones: mở rộng Region tới gần thành phố lớn, giảm latency cho ứng dụng nhạy cảm độ trễ.\n✗ AWS Outposts: đặt phần cứng trong cơ sở khách hàng, không phải gần khu đô thị chung.\n✗ AWS Wavelength: tối ưu cho ứng dụng trên mạng 5G của nhà mạng, không phải khu đô thị tổng quát.\n✗ AWS Batch: dịch vụ batch processing, không liên quan giảm độ trễ địa lý.",
    "domain": 3
  },
  {
    "id": "clf-ext-006",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhà phát triển ứng dụng AR di động cần xử lý dữ liệu ngay tại biên mạng di động 5G của nhà mạng để đạt độ trễ siêu thấp cho thiết bị di động, tránh phải định tuyến lưu lượng qua internet về Region. Dịch vụ nào được thiết kế cho mục đích này?",
    "options": [
      "AWS Wavelength",
      "AWS Local Zones",
      "AWS Outposts",
      "Amazon Lightsail"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Wavelength nhúng compute/storage vào mạng 5G của nhà cung cấp viễn thông để đạt độ trễ siêu thấp cho thiết bị di động.\n✓ AWS Wavelength: đặt hạ tầng AWS tại biên mạng 5G, lý tưởng cho ứng dụng di động độ trễ thấp.\n✗ AWS Local Zones: gần khu đô thị nhưng không nhúng trong mạng 5G của nhà mạng.\n✗ AWS Outposts: đặt tại cơ sở khách hàng, không phải mạng nhà mạng.\n✗ Amazon Lightsail: VM giá cố định, không liên quan edge 5G.",
    "domain": 3
  },
  {
    "id": "clf-ext-007",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một team muốn deploy một ứng dụng web containerized trực tiếp từ source code hoặc container image, để AWS tự động build, deploy, load balance và auto scale mà hoàn toàn không phải quản lý server hay cluster. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS App Runner",
      "AWS Elastic Beanstalk",
      "Amazon EC2",
      "AWS Batch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS App Runner là dịch vụ fully managed để chạy web app/API container hóa, tự build, deploy, scale mà không cần quản lý hạ tầng.\n✓ AWS App Runner: chỉ cần cung cấp code/image, AWS lo toàn bộ build và vận hành container.\n✗ Elastic Beanstalk: vẫn tạo và cho truy cập EC2/ELB bên dưới, không hoàn toàn ẩn server.\n✗ Amazon EC2: phải tự quản lý instance và scaling thủ công.\n✗ AWS Batch: dành cho batch job, không phải web service liên tục.",
    "domain": 3
  },
  {
    "id": "clf-ext-008",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức cần xây dựng và bảo trì các AMI (và container image) được cấu hình sẵn, vá bảo mật định kỳ một cách tự động theo quy trình lặp lại, đảm bảo image luôn cập nhật. Dịch vụ nào phù hợp?",
    "options": [
      "EC2 Image Builder",
      "AWS Elastic Beanstalk",
      "AWS App Runner",
      "Amazon Lightsail"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 Image Builder tự động hóa việc tạo, kiểm thử và bảo trì AMI cũng như container image theo pipeline, giúp giữ image luôn được vá và cập nhật.\n✓ EC2 Image Builder: tự động build và bảo trì image an toàn, cập nhật định kỳ.\n✗ Elastic Beanstalk: triển khai app, không chuyên về tạo và bảo trì AMI.\n✗ AWS App Runner: chạy container web app, không phải pipeline tạo image.\n✗ Amazon Lightsail: cung cấp VM trọn gói, không phải công cụ build image.",
    "domain": 3
  },
  {
    "id": "clf-ext-009",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty có khối lượng compute ổn định, cam kết sử dụng tương đương 10 USD/giờ trong 1 năm, nhưng muốn linh hoạt chuyển đổi giữa EC2, Fargate và Lambda mà vẫn được giảm giá lớn so với On-Demand. Mô hình giá nào phù hợp nhất?",
    "options": [
      "Compute Savings Plans",
      "EC2 Instance Savings Plans",
      "Standard Reserved Instances",
      "On-Demand pricing"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Savings Plans cho mức giảm giá lớn dựa trên cam kết chi tiêu (USD/giờ) và áp dụng linh hoạt cho EC2, Fargate, Lambda bất kể region/family.\n✓ Compute Savings Plans: linh hoạt nhất, áp dụng cho EC2, Fargate và Lambda.\n✗ EC2 Instance Savings Plans: chỉ áp dụng cho EC2 trong một instance family/region, không bao Fargate/Lambda.\n✗ Standard Reserved Instances: gắn với cấu hình EC2 cụ thể, kém linh hoạt và không áp dụng Fargate/Lambda.\n✗ On-Demand pricing: không cam kết nên không được giảm giá.",
    "domain": 3
  },
  {
    "id": "clf-ext-010",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một kiến trúc sư đang đánh giá các tùy chọn compute cho nhiều workload khác nhau. Những phát biểu nào sau đây là CHÍNH XÁC? (Chọn 2)",
    "options": [
      "AWS Outposts cho phép chạy dịch vụ AWS trên hạ tầng đặt tại data center của khách hàng",
      "AWS Batch tự động cấp phát loại và số lượng tài nguyên compute dựa trên yêu cầu của các batch job",
      "Amazon Lightsail được thiết kế cho workload HPC quy mô hàng nghìn node với độ trễ thấp giữa các node",
      "AWS Wavelength chủ yếu dùng để xây dựng và vá AMI tự động",
      "Elastic Beanstalk yêu cầu khách hàng tự cấu hình thủ công load balancer và Auto Scaling group"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Outposts mang AWS tới on-premises, còn Batch tự động provision tài nguyên theo nhu cầu job.\n✓ AWS Outposts chạy trên hạ tầng tại cơ sở khách hàng: đúng định nghĩa Outposts.\n✓ AWS Batch tự cấp phát tài nguyên theo job: đúng, đây là giá trị cốt lõi của Batch.\n✗ Lightsail cho HPC hàng nghìn node: sai, Lightsail nhắm tới workload nhỏ/đơn giản.\n✗ Wavelength để vá AMI: sai, đó là vai trò của EC2 Image Builder; Wavelength dành cho edge 5G.\n✗ Beanstalk yêu cầu tự cấu hình ELB/Auto Scaling: sai, Beanstalk tự động tạo các thành phần này.",
    "domain": 3
  },
  {
    "id": "clf-ext-011",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty fintech đã cam kết Compute Savings Plan. Trong tháng, họ giảm bớt EC2 nhưng tăng mạnh việc dùng AWS Fargate và một số hàm Lambda. Điều gì xảy ra với mức giảm giá của Savings Plan?",
    "options": [
      "Mức giảm giá tự động áp dụng cho Fargate và Lambda, miễn là tổng chi tiêu vẫn trong cam kết",
      "Giảm giá chỉ áp dụng cho EC2; phần Fargate và Lambda bị tính giá On-Demand",
      "Savings Plan bị hủy vì cấu hình compute đã thay đổi",
      "Họ phải mua thêm Reserved Instances cho Fargate để được giảm giá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Savings Plans tự động áp dụng giảm giá xuyên suốt EC2, Fargate và Lambda dựa trên cam kết chi tiêu USD/giờ, bất kể workload dịch chuyển.\n✓ Tự động áp dụng cho Fargate và Lambda: đúng đặc tính linh hoạt của Compute Savings Plans.\n✗ Chỉ áp dụng EC2: sai, đó là giới hạn của EC2 Instance Savings Plans chứ không phải Compute.\n✗ Savings Plan bị hủy khi đổi compute: sai, không bị hủy do thay đổi workload.\n✗ Phải mua Reserved Instances cho Fargate: sai, Compute Savings Plan đã bao Fargate.",
    "domain": 3
  },
  {
    "id": "clf-ext-012",
    "courseId": "CLF-C02",
    "lesson": "11-compute-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một nhà bán lẻ muốn triển khai nhanh một REST API container hóa cho ứng dụng web, không có đội ngũ DevOps để quản lý cluster, và muốn dịch vụ tự động scale về gần 0 khi không có traffic để tiết kiệm chi phí. Lựa chọn nào tối ưu nhất về vận hành?",
    "options": [
      "AWS App Runner",
      "Amazon EC2 với Auto Scaling group",
      "Amazon Lightsail instance đơn lẻ",
      "AWS Outposts"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "App Runner là fully managed cho web app/API container, tự build, deploy, scale (kể cả thu nhỏ khi ít traffic) mà không cần quản lý hạ tầng.\n✓ AWS App Runner: vận hành đơn giản nhất, tự scale, phù hợp đội không có DevOps.\n✗ EC2 với Auto Scaling group: cần tự quản lý instance, AMI, cấu hình scaling.\n✗ Lightsail instance đơn lẻ: không tự auto scale theo traffic, phải quản lý thủ công.\n✗ AWS Outposts: hạ tầng on-premises tốn kém, không phù hợp nhu cầu đơn giản này.",
    "domain": 3
  },
  {
    "id": "clf-ext-013",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty cần lưu trữ file backup quan trọng trên S3 và muốn bảo vệ khỏi việc bị ghi đè hoặc xóa nhầm, cho phép khôi phục lại phiên bản trước đó của object. Tính năng S3 nào nên được bật?",
    "options": [
      "S3 Versioning",
      "S3 Transfer Acceleration",
      "S3 Lifecycle policy",
      "S3 Cross-Region Replication"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Versioning giữ nhiều phiên bản của cùng một object, cho phép khôi phục bản cũ khi bị ghi đè hoặc xóa nhầm.\n✓ S3 Versioning lưu lại các phiên bản cũ để khôi phục.\n✗ Transfer Acceleration chỉ tăng tốc upload/download qua edge location, không bảo vệ phiên bản.\n✗ Lifecycle policy chuyển hoặc xóa object theo thời gian, không khôi phục bản cũ.\n✗ Cross-Region Replication sao chép sang region khác, không trực tiếp cung cấp khôi phục bản ghi đè trong cùng bucket.",
    "domain": 3
  },
  {
    "id": "clf-ext-014",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức có người dùng trên toàn cầu thường xuyên upload các file lớn lên một S3 bucket đặt tại us-east-1. Họ phàn nàn tốc độ upload chậm. Giải pháp nào cải thiện tốc độ mà không cần đổi region của bucket?",
    "options": [
      "Bật S3 Transfer Acceleration",
      "Bật S3 Versioning",
      "Chuyển sang storage class S3 Glacier",
      "Tạo thêm một bucket ở mỗi quốc gia"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Transfer Acceleration định tuyến dữ liệu qua mạng lưới edge location của CloudFront để tăng tốc upload đường dài.\n✓ Transfer Acceleration tận dụng edge location gần người dùng để tăng tốc upload toàn cầu.\n✗ Versioning chỉ quản lý phiên bản, không ảnh hưởng tốc độ.\n✗ Glacier là lưu trữ archive, làm chậm truy cập chứ không tăng tốc upload.\n✗ Tạo bucket riêng mỗi quốc gia làm phức tạp quản lý và không phải giải pháp được khuyến nghị.",
    "domain": 3
  },
  {
    "id": "clf-ext-015",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng .NET trên Windows cần một file share dùng chung qua giao thức SMB, tích hợp với Active Directory để phân quyền. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon FSx for Windows File Server",
      "Amazon FSx for Lustre",
      "Amazon EFS",
      "Amazon S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FSx for Windows File Server cung cấp file share SMB gốc Windows, tích hợp Active Directory và NTFS permissions.\n✓ FSx for Windows File Server hỗ trợ SMB và tích hợp Active Directory.\n✗ FSx for Lustre dành cho high-performance computing, không phải SMB Windows.\n✗ EFS dùng giao thức NFS cho Linux, không phải SMB Windows native.\n✗ S3 là object storage, không phải file share SMB.",
    "domain": 3
  },
  {
    "id": "clf-ext-016",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A research team needs a high-performance file system for machine learning and analytics workloads, capable of linking to data in S3. Which FSx service is most suitable?",
    "options": [
      "Amazon FSx for Lustre",
      "Amazon FSx for Windows File Server",
      "Amazon FSx for NetApp ONTAP",
      "Amazon FSx for OpenZFS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FSx for Lustre được thiết kế cho HPC và machine learning, có thể liên kết trực tiếp với dữ liệu trong S3.\n✓ FSx for Lustre tối ưu cho HPC/ML và tích hợp S3.\n✗ FSx for Windows File Server dành cho file share SMB doanh nghiệp.\n✗ FSx for NetApp ONTAP tập trung vào tính năng quản lý dữ liệu ONTAP đa giao thức.\n✗ FSx for OpenZFS phục vụ workload Linux/NFS thông dụng, không tối ưu HPC quy mô lớn như Lustre.",
    "domain": 3
  },
  {
    "id": "clf-ext-017",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An on-premises data center needs to access the S3 object store as a local NFS/SMB file share so that legacy applications can read/write without rewriting code. Which solution should I use?",
    "options": [
      "Amazon S3 File Gateway (Storage Gateway)",
      "AWS Snowball",
      "Amazon FSx for Lustre",
      "AWS DataSync"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 File Gateway cho phép ứng dụng on-premises dùng NFS/SMB để truy cập dữ liệu được lưu dưới dạng object trong S3.\n✓ S3 File Gateway trình bày S3 dưới dạng file share NFS/SMB cho ứng dụng local.\n✗ Snowball dùng để di chuyển dữ liệu lượng lớn offline, không phải truy cập file liên tục.\n✗ FSx for Lustre là HPC file system, không phải gateway tới S3 cho ứng dụng cũ.\n✗ DataSync chỉ đồng bộ/di chuyển dữ liệu, không cung cấp file share thường trực.",
    "domain": 3
  },
  {
    "id": "clf-ext-018",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to centrally manage and automate backup schedules for EBS volumes, RDS databases, DynamoDB tables and EFS file systems from a single place, with a unified retention policy. Which service is suitable?",
    "options": [
      "AWS Backup",
      "Amazon S3 Lifecycle",
      "AWS Storage Gateway",
      "Amazon EBS Manual Snapshots"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Backup tập trung hóa và tự động hóa backup trên nhiều dịch vụ AWS với backup plan và retention policy thống nhất.\n✓ AWS Backup quản lý backup tập trung cho EBS, RDS, DynamoDB, EFS và nhiều dịch vụ khác.\n✗ S3 Lifecycle chỉ áp dụng cho object trong S3.\n✗ Storage Gateway kết nối on-premises với cloud storage, không phải dịch vụ backup tập trung đa dịch vụ.\n✗ EBS Snapshots thủ công chỉ cho EBS và không tự động hóa đa dịch vụ.",
    "domain": 3
  },
  {
    "id": "clf-ext-019",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An offshore oil site without a stable internet connection needs to collect and preprocess sensor data (edge ​​computing) in a harsh environment, then transfer about 50 TB of data to AWS. Which Snow Family device is best suited?",
    "options": [
      "AWS Snowball Edge",
      "AWS Snowmobile",
      "Amazon S3 Transfer Acceleration",
      "AWS Storage Gateway Tape Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Snowball Edge cung cấp khả năng lưu trữ và compute tại edge cho môi trường ngắt kết nối, phù hợp với khối lượng hàng chục TB.\n✓ Snowball Edge có compute để xử lý edge và lưu trữ vài chục TB ở môi trường offline.\n✗ Snowmobile dành cho exabyte (hàng chục PB), quá lớn cho 50 TB.\n✗ Transfer Acceleration cần kết nối internet ổn định, không phù hợp môi trường ngắt kết nối.\n✗ Tape Gateway phục vụ backup dạng băng từ ảo, không phải edge offline.",
    "domain": 3
  },
  {
    "id": "clf-ext-020",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "An administrator is selecting EBS volume types for different workloads. Which of the following statements are TRUE? (Choose 2)",
    "options": [
      "gp3 is a general-purpose SSD that allows IOPS and throughput to be configured independently of capacity",
      "io2 is a high-performance SSD suitable for databases that require high IOPS and high endurance",
      "sc1 is an SSD specialized for extremely high IOPS workloads",
      "st1 is the cheapest SSD volume, does not support being a boot volume for throughput needs",
      "gp2 allows throughput configuration completely separate from IOPS like gp3"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "gp3 cho phép điều chỉnh IOPS/throughput tách biệt dung lượng, và io2 là SSD bền, IOPS cao cho database.\n✓ gp3 là SSD đa dụng với IOPS và throughput cấu hình độc lập với size.\n✓ io2 là Provisioned IOPS SSD cho database đòi hỏi IOPS cao và độ bền cao.\n✗ sc1 là HDD lạnh (cold) giá rẻ cho dữ liệu truy cập ít, không phải SSD IOPS cao.\n✗ st1 là HDD throughput-optimized, không phải SSD và không dùng làm boot volume.\n✗ gp2 ràng buộc IOPS theo dung lượng và không tách rời throughput như gp3.",
    "domain": 3
  },
  {
    "id": "clf-ext-021",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A business is using physical tape for backup and wants to eliminate tape management costs while keeping its current backup software. Which AWS solution is right?",
    "options": [
      "Tape Gateway (Storage Gateway)",
      "Volume Gateway",
      "AWS Snowmobile",
      "Amazon FSx for OpenZFS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tape Gateway tạo virtual tape library tương thích với phần mềm backup hiện có và lưu vào S3/Glacier.\n✓ Tape Gateway thay băng từ vật lý bằng virtual tape, tích hợp phần mềm backup sẵn có.\n✗ Volume Gateway cung cấp block storage iSCSI, không phải thay thế băng từ.\n✗ Snowmobile dùng cho di chuyển dữ liệu exabyte một lần.\n✗ FSx for OpenZFS là file system, không liên quan backup băng từ.",
    "domain": 3
  },
  {
    "id": "clf-ext-022",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to automatically copy objects from an S3 bucket in us-east-1 to a bucket in eu-west-1 for compliance and reduced latency for European users. Which features are met?",
    "options": [
      "S3 Cross-Region Replication (CRR)",
      "S3 Transfer Acceleration",
      "S3 Same-Region Replication (SRR)",
      "Simple S3 Versioning"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Cross-Region Replication tự động sao chép object giữa các bucket ở region khác nhau.\n✓ CRR sao chép object sang region khác cho compliance và giảm độ trễ.\n✗ Transfer Acceleration chỉ tăng tốc truyền, không sao chép giữa bucket.\n✗ SRR sao chép trong cùng region, không sang region khác.\n✗ Versioning chỉ giữ phiên bản trong cùng bucket, không sao chép cross-region (dù cần được bật để dùng replication).",
    "domain": 3
  },
  {
    "id": "clf-ext-023",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A genetic analysis project requires about 5 PB of data transferred from the data center to AWS in a few weeks. Current internet connections will take many months to upload. Which option is the most optimal in terms of time and cost?",
    "options": [
      "Use multiple AWS Snowball devices to transport data",
      "Use AWS Snowmobile for all data",
      "Upload directly via S3 Transfer Acceleration",
      "Deploy Volume Gateway to gradually synchronize over the internet"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với khoảng 5 PB, dùng nhiều Snowball là phương án thực tế; Snowmobile chỉ hợp lý ở quy mô hàng chục PB trở lên.\n✓ Nhiều thiết bị Snowball vận chuyển 5 PB nhanh và hiệu quả chi phí cho mức petabyte này.\n✗ Snowmobile (lên tới ~100 PB) là quá mức cho 5 PB và thường dành cho exabyte-scale.\n✗ Transfer Acceleration vẫn phụ thuộc băng thông internet, mất nhiều tháng.\n✗ Volume Gateway đồng bộ qua internet không giải quyết vấn đề băng thông hạn chế.",
    "domain": 3
  },
  {
    "id": "clf-ext-024",
    "courseId": "CLF-C02",
    "lesson": "12-storage-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A running application needs low-cost block storage for sequentially accessed log data, large throughput but little randomness, for example big data and streaming. Which type of EBS is most cost-effective and still suitable?",
    "options": [
      "st1 (Throughput Optimized HDD)",
      "io2 (Provisioned IOPS SSD)",
      "gp3 (General Purpose SSD)",
      "sc1 (Cold HDD)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "st1 là HDD tối ưu throughput, rẻ và phù hợp cho workload tuần tự, throughput cao như big data và log.\n✓ st1 phù hợp truy cập tuần tự, throughput lớn với chi phí thấp.\n✗ io2 là SSD IOPS cao đắt tiền, dư thừa cho workload tuần tự.\n✗ gp3 là SSD đa dụng, đắt hơn st1 cho nhu cầu throughput tuần tự thuần túy.\n✗ sc1 rẻ hơn nhưng dành cho dữ liệu truy cập rất ít, không đáp ứng throughput của workload đang hoạt động thường xuyên.",
    "domain": 3
  },
  {
    "id": "clf-ext-025",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company saves millions of CloudTrail log files as JSON in Amazon S3. The security team wants to run ad-hoc SQL queries to investigate problems WITHOUT provisioning or managing any cluster. Which service is most suitable?",
    "options": [
      "Amazon Athena",
      "Amazon Redshift",
      "Amazon EMR",
      "Amazon Kinesis Data Streams"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena là serverless SQL query trực tiếp trên dữ liệu S3, lý tưởng cho phân tích ad-hoc log mà không cần quản hạ tầng.\n✓ Athena: serverless, query SQL thẳng trên S3, trả tiền theo data scanned, không cần cluster.\n✗ Redshift: là data warehouse cần load dữ liệu và (provisioned) phải quản node, phù hợp dashboard lặp lại hơn ad-hoc.\n✗ EMR: là Hadoop/Spark cluster, cần quản lý và overkill cho query SQL đơn giản.\n✗ Kinesis Data Streams: dùng để ingest real-time stream, không phải query log đã lưu trong S3.",
    "domain": 3
  },
  {
    "id": "clf-ext-026",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An organization needs a petabyte-scale columnar data warehouse to run complex BI reports that repeat daily on billions of lines of sales data. Which AWS services are designed for this purpose?",
    "options": [
      "Amazon Redshift",
      "Amazon Athena",
      "Amazon OpenSearch Service",
      "AWS Glue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Redshift là data warehouse columnar OLAP quy mô petabyte, tối ưu cho báo cáo BI phức tạp lặp lại.\n✓ Redshift: data warehouse columnar PB-scale, hiệu năng cao cho query OLAP lặp lại và dashboard.\n✗ Athena: tốt cho ad-hoc/infrequent trên S3, không tối ưu bằng cho dashboard BI tải nặng lặp lại.\n✗ OpenSearch Service: dùng cho full-text search và log analytics, không phải data warehouse.\n✗ Glue: là dịch vụ ETL + Data Catalog, không phải nơi chạy query warehouse.",
    "domain": 3
  },
  {
    "id": "clf-ext-027",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A startup needs to push streaming data continuously into Amazon S3 with automatic batching and compression, near real-time, without wanting to write consumer code or manage shards. Which option is most suitable?",
    "options": [
      "Amazon Data Firehose",
      "Amazon Kinesis Data Streams",
      "Amazon MSK",
      "Amazon EMR"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firehose là delivery stream tự động đẩy dữ liệu vào S3/Redshift/OpenSearch với buffering và nén, không cần code consumer.\n✓ Amazon Data Firehose: ống delivery near real-time tự buffer/compress, không cần quản shard hay viết consumer.\n✗ Kinesis Data Streams: cần developer viết consumer xử lý record và quản lý shard.\n✗ MSK: managed Kafka, cần cấu hình và quản lý topic/consumer, không phải giải pháp no-code đẩy vào S3.\n✗ EMR: là cluster big data processing, không phải pipeline delivery streaming.",
    "domain": 3
  },
  {
    "id": "clf-ext-028",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to build a BI dashboard for management, use natural language to ask questions like 'show me sales by region last quarter', and embed the dashboard into an internal SaaS application. Which service is available?",
    "options": [
      "Amazon QuickSight",
      "Amazon Athena",
      "AWS Glue DataBrew",
      "Amazon OpenSearch Dashboards"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "QuickSight là BI serverless với tính năng Q (natural language query), SPICE engine và embedded analytics.\n✓ QuickSight: BI managed, có Q để hỏi bằng ngôn ngữ tự nhiên và embedded analytics để nhúng dashboard.\n✗ Athena: chỉ là engine query SQL, không phải công cụ visualize/BI.\n✗ Glue DataBrew: dùng để clean/transform data no-code, không phải BI dashboard.\n✗ OpenSearch Dashboards: là Kibana cho log/search analytics, không có natural language BI như Q.",
    "domain": 3
  },
  {
    "id": "clf-ext-029",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The data engineering team needs to automatically detect the schema of newly uploaded CSV/JSON files to S3 and put the metadata into a central catalog for Athena to query immediately. Which AWS Glue component does this?",
    "options": [
      "Glue Crawler combines Glue Data Catalog",
      "Glue DataBrew",
      "Kinesis Data Firehose",
      "Redshift Spectrum"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Glue Crawler tự scan S3, suy ra schema và đẩy vào Glue Data Catalog làm metadata trung tâm cho Athena.\n✓ Glue Crawler + Data Catalog: crawler infer schema từ file mới, lưu vào Data Catalog để Athena dùng ngay.\n✗ Glue DataBrew: làm clean/transform no-code, không phải auto-discover schema vào catalog.\n✗ Kinesis Data Firehose: là delivery stream ingest, không suy ra schema cho catalog.\n✗ Redshift Spectrum: cho phép query S3 từ Redshift nhưng không tự crawl/khám phá schema.",
    "domain": 3
  },
  {
    "id": "clf-ext-030",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs real-time analysis of 100 GB of nginx logs, full-text search support, and a visual Kibana-style dashboard for team observability. Which service is most suitable?",
    "options": [
      "Amazon OpenSearch Service",
      "Amazon Athena",
      "Amazon Redshift",
      "Amazon QuickSight"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "OpenSearch Service là managed Elasticsearch + dashboards (Kibana) cho log analytics real-time và full-text search.\n✓ OpenSearch Service: managed Elasticsearch, mạnh về full-text search, log analytics real-time và dashboard Kibana.\n✗ Athena: query SQL trên S3, không tối ưu cho full-text search real-time.\n✗ Redshift: data warehouse OLAP, không phải search engine.\n✗ QuickSight: là BI visualization, không phải search engine cho log.",
    "domain": 3
  },
  {
    "id": "clf-ext-031",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A team had multiple applications using Apache Kafka on-premises and wanted to migrate to AWS with minimal code changes, leveraging the familiar Kafka ecosystem. Which service should I choose?",
    "options": [
      "Amazon MSK",
      "Amazon Kinesis Data Streams",
      "Amazon Kinesis Data Firehose",
      "Amazon SQS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "MSK là managed Apache Kafka, giữ nguyên API và ecosystem Kafka nên migration ít thay đổi code nhất.\n✓ MSK: managed Apache Kafka, tương thích API Kafka, lý tưởng khi team đã quen ecosystem Kafka.\n✗ Kinesis Data Streams: là streaming AWS-native, không tương thích API Kafka nên phải viết lại code.\n✗ Kinesis Data Firehose: là delivery pipeline, không phải nền tảng pub/sub Kafka.\n✗ SQS: là message queue, không phải streaming platform giữ ordering/replay như Kafka.",
    "domain": 3
  },
  {
    "id": "clf-ext-032",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "A company builds a data lake on S3 and wants to control fine-grained (row-level, column-level) access for hundreds of users to comply with GDPR. Which statements are TRUE about AWS Lake Formation? (Choose 2)",
    "options": [
      "Lake Formation allows fine-grained permission management at the row/column/cell level on the data lake",
      "Lake Formation supports tag-based access control and integrates with Athena, Redshift Spectrum, EMR",
      "Lake Formation is a columnar data warehouse alternative to Redshift",
      "Lake Formation is a BI tool to draw dashboards for business users",
      "Lake Formation is a real-time streaming service that replaces Kinesis"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Lake Formation tập trung vào governance/permission cho data lake trên S3, hỗ trợ fine-grained và tag-based access.\n✓ Quản row/column/cell-level: đúng, Lake Formation cung cấp fine-grained access control cho data lake.\n✓ Tag-based access + tích hợp Athena/Redshift Spectrum/EMR: đúng, đây là các engine tích hợp với Lake Formation.\n✗ Data warehouse thay Redshift: sai, Lake Formation là lớp governance, không phải warehouse.\n✗ Công cụ BI dashboard: sai, đó là vai trò của QuickSight.\n✗ Stream ingest real-time: sai, ingest là vai trò của Kinesis/MSK.",
    "domain": 3
  },
  {
    "id": "clf-ext-033",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A research team needs to run terabyte-scale Apache Spark and Apache Hive jobs and wants to add HBase and Flink, with the ability to leverage EC2 Spot to reduce costs. Which service is most suitable?",
    "options": [
      "Amazon EMR",
      "AWS Glue ETL",
      "Amazon Athena",
      "Amazon QuickSight"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EMR là cluster managed hỗ trợ nhiều framework (Spark, Hive, HBase, Flink) và có thể chạy trên Spot để tiết kiệm.\n✓ EMR: hỗ trợ Hadoop/Spark/Hive/HBase/Flink, kiểm soát cao và chạy được Spot, hợp big data đa framework.\n✗ Glue ETL: serverless Spark đơn giản nhưng không hỗ trợ Hive/HBase/Flink đa dạng như EMR.\n✗ Athena: chỉ là query SQL serverless, không chạy job Spark/Hive tùy biến.\n✗ QuickSight: là BI visualization, không phải nền tảng xử lý big data.",
    "domain": 3
  },
  {
    "id": "clf-ext-034",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to purchase a dataset of weather and demographic data from a third-party supplier, and have the data automatically delivered to Amazon S3. Which AWS service is used for this?",
    "options": [
      "AWS Data Exchange",
      "AWS Glue",
      "Amazon Athena",
      "AWS Lake Formation"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Data Exchange là marketplace để mua dataset third-party, tự động giao vào S3/Redshift/API.\n✓ Data Exchange: marketplace dữ liệu third-party, tự động delivery dataset đã mua vào S3.\n✗ Glue: là ETL/Data Catalog, không phải nơi mua dataset bên ngoài.\n✗ Athena: chỉ query dữ liệu đã có, không cung cấp marketplace data.\n✗ Lake Formation: quản permission data lake, không bán dataset third-party.",
    "domain": 3
  },
  {
    "id": "clf-ext-035",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An IoT application collects data from 100,000 real-time devices, and needs MANY different consumers (analytics, alerting, storage) to read the same stream with the ability to replay data for days. Which service is most suitable?",
    "options": [
      "Amazon Kinesis Data Streams",
      "Amazon Kinesis Data Firehose",
      "Amazon QuickSight",
      "AWS Glue Crawler"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kinesis Data Streams hỗ trợ nhiều consumer đọc cùng stream và retention tới 365 ngày cho replay.\n✓ Kinesis Data Streams: cho nhiều consumer đồng thời, retention 1–365 ngày để replay record real-time.\n✗ Kinesis Data Firehose: là delivery một chiều vào đích, không lưu để replay cũng không cho nhiều consumer tùy ý.\n✗ QuickSight: là BI, không phải dịch vụ ingest stream.\n✗ Glue Crawler: chỉ scan schema S3, không liên quan ingest stream real-time.",
    "domain": 3
  },
  {
    "id": "clf-ext-036",
    "courseId": "CLF-C02",
    "lesson": "16-analytics",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A company uses Athena query data lake on S3 but the cost increases because each query scans the entire large CSV file. They wanted to reduce Athena costs while still keeping data on S3. Which action is most effective?",
    "options": [
      "Convert data to a compressed column format such as Parquet/ORC and partition by filtered columns",
      "Transfer entire workload to Amazon EMR for processing",
      "Upgrade to the largest sized Redshift provisioned cluster",
      "Turn on Kinesis Data Firehose to stream data back to S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena tính tiền theo lượng data scanned, nên Parquet/ORC nén cột + partition giảm scan và chi phí mạnh nhất.\n✓ Parquet/ORC + partition: giảm dữ liệu scan tới 10–100x, cắt giảm chi phí Athena hiệu quả mà vẫn dùng S3.\n✗ Chuyển sang EMR: không tự giảm chi phí và tăng độ phức tạp quản cluster.\n✗ Redshift cluster lớn nhất: tốn kém hơn và không giải quyết gốc rễ là format/scan của Athena.\n✗ Firehose stream lại: không thay đổi format/partition nên không giảm data scanned.",
    "domain": 3
  },
  {
    "id": "clf-ext-037",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A security team needs to know EXACTLY who deleted an IAM user at 3am and from what IP. Where should they watch?",
    "options": [
      "AWS CloudTrail event history",
      "Amazon CloudWatch Metrics",
      "AWS Config configuration timeline",
      "AWS Trusted Advisor security check"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudTrail ghi mọi API call (ai làm gì, lúc nào, từ đâu) nên là nguồn audit chính.\n✓ CloudTrail event history ghi lại API call DeleteUser kèm identity và source IP.\n✗ CloudWatch Metrics chỉ là số liệu time-series về hiệu năng, không ghi ai gọi API.\n✗ Config theo dõi trạng thái cấu hình resource, không trả lời 'ai' thực hiện hành động.\n✗ Trusted Advisor đưa khuyến nghị best practice, không phải log audit hành động.",
    "domain": 2
  },
  {
    "id": "clf-ext-038",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The operations team wants to receive SMS notifications when the CPU of an EC2 instance exceeds 80% for 5 minutes. Which service is most suitable?",
    "options": [
      "Amazon CloudWatch alarm integrates with SNS",
      "AWS CloudTrail Insights",
      "AWS Config rule",
      "Amazon CloudWatch Logs Insights"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudWatch alarm theo dõi metric và trigger SNS khi vượt threshold.\n✓ CloudWatch alarm trên metric CPU > 80% gửi notification qua SNS topic (SMS).\n✗ CloudTrail Insights phát hiện bất thường trong API activity, không theo dõi CPU.\n✗ Config rule kiểm tra compliance cấu hình, không cảnh báo theo metric hiệu năng.\n✗ Logs Insights là công cụ query log, không trigger alarm theo threshold metric.",
    "domain": 2
  },
  {
    "id": "clf-ext-039",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The company needs to ensure ALL S3 buckets always have versioning enabled and are marked NON_COMPLIANT if violated. Which service is available?",
    "options": [
      "AWS Config với managed rule",
      "AWS CloudTrail data events",
      "Amazon CloudWatch Logs",
      "AWS Systems Manager Patch Manager"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Config đánh giá trạng thái cấu hình resource so với rule và đánh dấu compliant/non-compliant.\n✓ Config managed rule (s3-bucket-versioning-enabled) liên tục đánh giá và mark NON_COMPLIANT.\n✗ CloudTrail data events ghi log truy cập object, không đánh giá compliance cấu hình.\n✗ CloudWatch Logs tập trung log, không có khái niệm rule compliance resource.\n✗ Patch Manager quản lý vá lỗi OS, không liên quan compliance cấu hình S3.",
    "domain": 2
  },
  {
    "id": "clf-ext-040",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An organization has 12 AWS accounts and wants a single invoice and shared volume discount. Which service provides this?",
    "options": [
      "AWS Organizations với consolidated billing",
      "AWS Control Tower guardrails",
      "AWS Cost Explorer",
      "AWS Budgets"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Organizations gom nhiều account và cung cấp consolidated billing.\n✓ Organizations consolidated billing gộp 1 bill và share volume/RI discount toàn org.\n✗ Control Tower guardrails là SCP + Config rule, không phải cơ chế gộp hoá đơn.\n✗ Cost Explorer chỉ phân tích/visualize chi phí, không gộp billing.\n✗ Budgets đặt ngưỡng cảnh báo chi phí, không gộp hoá đơn nhiều account.",
    "domain": 2
  },
  {
    "id": "clf-ext-041",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "The administrator has attached SCP deny s3:DeleteBucket to an OU, but wants to grant permission to create buckets to devs in that OU. What do they need to do?",
    "options": [
      "Create IAM policy grant s3:CreateBucket for dev, because SCP does not grant permissions itself",
      "Add Allow s3:CreateBucket to SCP to automatically grant permissions to devs",
      "Delete SCP because SCP overrides all IAM policies",
      "Use AWS Config rule to grant permission to create a bucket"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SCP chỉ đặt trần quyền tối đa, không tự grant; IAM policy mới grant quyền thực tế cho principal.\n✓ Cần IAM policy grant s3:CreateBucket cho dev; SCP không cấp quyền mà chỉ giới hạn.\n✗ Thêm Allow vào SCP chỉ mở rộng trần, không tự cấp quyền cho user — vẫn cần IAM policy.\n✗ Không cần xoá SCP; quyền hiệu lực là giao của SCP và IAM, hai cái hoạt động cùng nhau.\n✗ Config rule chỉ đánh giá compliance, không cấp quyền IAM.",
    "domain": 2
  },
  {
    "id": "clf-ext-042",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Large businesses need to quickly set up best practice multi-account landing zones (audit account, log archive, SCP, Config, CloudTrail) without manual configuration. Which service?",
    "options": [
      "AWS Control Tower",
      "AWS Organizations simply",
      "AWS Service Catalog",
      "AWS CloudFormation StackSets"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Control Tower tự setup landing zone multi-account theo best practice.\n✓ Control Tower auto provision audit/log archive account + Organizations + SCP + Config + CloudTrail.\n✗ Organizations đơn thuần cung cấp khung account nhưng phải cấu hình guardrail thủ công.\n✗ Service Catalog dùng để self-service launch product CF đã duyệt, không dựng landing zone.\n✗ StackSets deploy template nhiều account nhưng không phải giải pháp landing zone trọn gói.",
    "domain": 2
  },
  {
    "id": "clf-ext-043",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The team wants to let the BUs launch some approved architectures (from the CloudFormation template) but still ensure governance. Which service is suitable?",
    "options": [
      "AWS Service Catalog",
      "AWS Systems Manager",
      "AWS Config conformance pack",
      "AWS Launch Wizard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Service Catalog cho admin publish product (CF template duyệt) để end-user self-service.\n✓ Service Catalog cho phép self-service launch product đã duyệt, đảm bảo governance.\n✗ Systems Manager quản lý vận hành/cấu hình instance, không phải portfolio template self-service.\n✗ Config conformance pack là bộ rule compliance, không cho launch kiến trúc.\n✗ Launch Wizard hướng dẫn deploy workload cụ thể như SAP/SQL, không phải catalog tự phục vụ chung.",
    "domain": 2
  },
  {
    "id": "clf-ext-044",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Customers want to know if an AWS incident is specifically affecting their account (e.g. EC2 is retiring, maintenance window). What should they use?",
    "options": [
      "AWS Health Dashboard (Your account health)",
      "Amazon CloudWatch dashboard",
      "AWS Trusted Advisor",
      "Public status page of AWS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Health Dashboard có phần account health hiển thị event ảnh hưởng riêng account.\n✓ AWS Health Dashboard account health báo event riêng như EC2 retire, maintenance.\n✗ CloudWatch dashboard hiển thị metric, không báo sự cố/lịch bảo trì của AWS.\n✗ Trusted Advisor đưa khuyến nghị best practice, không báo sự cố hạ tầng AWS.\n✗ Public status page chỉ tổng quát theo region, không có thông tin riêng account.",
    "domain": 2
  },
  {
    "id": "clf-ext-045",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "AWS Trusted Advisor makes recommendations in which of the following categories? (Choose 3)",
    "options": [
      "Cost optimization",
      "Security",
      "Service limits (quotas)",
      "Distributed tracing",
      "Manual penetration testing"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Trusted Advisor có 5 mảng: cost optimization, performance, security, fault tolerance, service limits.\n✓ Cost optimization là một mảng (phát hiện idle EC2, EBS unused).\n✓ Security là một mảng (MFA root, SG mở port, S3 public).\n✓ Service limits cảnh báo quota gần hết.\n✗ Distributed tracing là chức năng của X-Ray, không phải mảng của Trusted Advisor.\n✗ Penetration testing thủ công không phải mảng kiểm tra của Trusted Advisor.",
    "domain": 2
  },
  {
    "id": "clf-ext-046",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An auditor requires automatically collected evidence for SOC 2 and PCI DSS audits, aggregated from multiple AWS services according to a pre-built framework. Which service is most suitable?",
    "options": [
      "AWS Audit Manager",
      "AWS Config",
      "AWS CloudTrail",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Audit Manager tự động collect evidence theo framework compliance (SOC 2, PCI DSS...).\n✓ Audit Manager dùng framework có sẵn để tự động thu thập evidence cho auditor.\n✗ Config đánh giá compliance cấu hình resource nhưng không tạo evidence package theo framework audit.\n✗ CloudTrail cung cấp API log thô, không tổ chức thành evidence theo chuẩn audit.\n✗ Trusted Advisor đưa khuyến nghị, không thu thập evidence audit.",
    "domain": 2
  },
  {
    "id": "clf-ext-047",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company brings its BYOL Oracle Database to AWS and is concerned about license core violations when Auto Scaling increases instances. Which service helps track and enforce licenses?",
    "options": [
      "AWS License Manager",
      "AWS Config",
      "AWS Service Catalog",
      "Amazon CloudWatch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "License Manager định nghĩa license rule và track usage BYOL, tránh vi phạm khi scale.\n✓ License Manager track và enforce license rule BYOL (Oracle/Microsoft...) khi auto-scale.\n✗ Config kiểm tra compliance cấu hình resource, không quản số core license phần mềm.\n✗ Service Catalog quản product CF self-service, không track license BYOL.\n✗ CloudWatch theo dõi metric/log, không quản license.",
    "domain": 2
  },
  {
    "id": "clf-ext-048",
    "courseId": "CLF-C02",
    "lesson": "17-monitoring-governance",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "With a fleet of 200 EC2 instances, the finance team wants ML-based right-sizing recommendations to reduce costs (e.g., from m5.large to m5.medium). Which service provides this?",
    "options": [
      "AWS Compute Optimizer",
      "AWS Trusted Advisor cost check",
      "Amazon CloudWatch detailed monitoring",
      "AWS Cost Explorer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Optimizer dùng ML phân tích metric CloudWatch để gợi ý right-sizing instance type.\n✓ Compute Optimizer phân tích metric và gợi ý downsize instance type cụ thể (m5.large→m5.medium).\n✗ Trusted Advisor cost check phát hiện idle/low utilization nhưng không gợi ý instance type bằng ML chi tiết.\n✗ CloudWatch detailed monitoring chỉ tăng độ phân giải metric, không đưa khuyến nghị right-size.\n✗ Cost Explorer phân tích chi phí lịch sử, không gợi ý right-size instance.",
    "domain": 2
  },
  {
    "id": "clf-m4-001",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An e-commerce startup has just launched and cannot predict traffic volume. They want infrastructure that automatically increases resources during promotions and decreases during slow periods, paying only for what they actually use. Which AWS Cloud characteristic meets this requirement?",
    "options": [
      "Elasticity",
      "High availability",
      "Fault tolerance",
      "Disaster recovery"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elasticity cho phép tự động tăng/giảm tài nguyên theo nhu cầu thực tế.\n✓ Elasticity — đúng, scale tài nguyên lên/xuống theo tải, chỉ trả cho phần dùng.\n✗ High availability — đảm bảo hệ thống luôn hoạt động, không nói về co giãn theo tải.\n✗ Fault tolerance — khả năng chịu lỗi mà không gián đoạn, không phải co giãn theo nhu cầu.\n✗ Disaster recovery — khôi phục sau thảm họa, không liên quan tự động scale theo traffic.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-001",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A traditional company purchases expensive physical servers for its data center with large upfront investment, even though they don't know if they'll use full capacity. When moving to AWS, which core economic benefit do they gain?",
    "options": [
      "Convert capital expenditure (CapEx) to operational expenditure (OpEx), paying based on usage",
      "Completely eliminate all monthly operational expenses",
      "Receive AWS warranty for physical hardware at your office",
      "Permanently own AWS servers after 12 months"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS chuyển đầu tư vốn cố định (CapEx) thành chi phí vận hành theo mức dùng (OpEx).\n✓ Chuyển CapEx sang OpEx — đúng, trả theo mức sử dụng thay vì mua trước phần cứng.\n✗ Loại bỏ mọi chi phí vận hành — sai, vẫn trả phí dịch vụ hằng tháng theo mức dùng.\n✗ Bảo hành phần cứng tại văn phòng — sai, AWS quản lý phần cứng trong data center của AWS.\n✗ Sở hữu vĩnh viễn máy chủ — sai, mô hình cloud là thuê/trả theo dùng, không sở hữu.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-002",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An online gaming platform has players in Asia, Europe, and North America complaining about high latency. The technical team wants to deploy servers near players in each region to reduce latency without building separate data centers. Which AWS Cloud characteristic enables this?",
    "options": [
      "Global reach through AWS Regions worldwide",
      "Vertical scaling servers within one Availability Zone",
      "Increase Amazon S3 storage capacity for each bucket",
      "Use Reserved Instances to reduce EC2 costs"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Triển khai gần người dùng ở nhiều khu vực địa lý là nhờ phạm vi toàn cầu của AWS Regions.\n✓ Global reach qua AWS Regions — đúng, triển khai workload gần người dùng để giảm latency.\n✗ Vertical scaling trong một AZ — chỉ tăng sức mạnh máy đơn lẻ, không giải quyết khoảng cách địa lý.\n✗ Tăng dung lượng S3 — về lưu trữ, không liên quan độ trễ địa lý.\n✗ Reserved Instances — mô hình giá tiết kiệm chi phí, không giảm latency địa lý.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-002",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A research group needs to run large data analysis experiments for a few days. Previously, they had to wait weeks to purchase and set up servers. On AWS, they provision hundreds of instances in minutes and delete them when done. Which AWS Cloud benefit is most clearly demonstrated here?",
    "options": [
      "Agility — quickly deploy resources for experimentation and innovation",
      "Fault tolerance — system continues operating when a component fails",
      "Economies of scale — lower prices due to AWS scale",
      "Shared responsibility — division of security responsibility"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khả năng triển khai tài nguyên trong vài phút thay vì hàng tuần thể hiện tính nhanh nhạy (agility).\n✓ Agility — đúng, cung cấp tài nguyên nhanh chóng giúp thử nghiệm và đổi mới mau lẹ.\n✗ Fault tolerance — về chịu lỗi, không nói về tốc độ triển khai.\n✗ Economies of scale — về chi phí thấp do quy mô, không phải tốc độ.\n✗ Shared responsibility — về mô hình trách nhiệm bảo mật, không liên quan tình huống.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-003",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A bank requires that its online transaction application is always accessible, even if a data center fails. The architect deploys the application across multiple Availability Zones within one Region. Which AWS Cloud benefit is the primary driver for this design?",
    "options": [
      "High availability",
      "Elasticity",
      "Converting CapEx to OpEx",
      "Edge computing with AWS Wavelength"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Triển khai đa AZ để ứng dụng luôn truy cập được dù một AZ lỗi chính là high availability.\n✓ High availability — đúng, nhiều AZ giúp ứng dụng tiếp tục hoạt động khi một AZ gặp sự cố.\n✗ Elasticity — về co giãn theo tải, không phải mục tiêu sẵn sàng cao ở đây.\n✗ CapEx sang OpEx — lợi ích tài chính, không phải lý do kiến trúc đa AZ.\n✗ Edge computing với Wavelength — về độ trễ 5G ở biên, không liên quan đa AZ.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-003",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A CFO is preparing a business case to move an on-premises data center to AWS Cloud and needs to state one CORRECT financial/operational benefit of AWS. Which statement is a valid benefit?",
    "options": [
      "Pay-as-you-go pricing instead of large upfront capital investment",
      "Moving to AWS will completely eliminate all security responsibility of the customer",
      "AWS guarantees the application will never incur any additional costs",
      "AWS will automatically write and maintain your application source code"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lợi ích cốt lõi của cloud là chuyển CapEx sang OpEx, trả theo mức dùng thực tế.\n✓ Pay-as-you-go thay cho đầu tư vốn lớn ban đầu là lợi ích tài chính chuẩn của AWS\n✗ Khách hàng vẫn giữ trách nhiệm bảo mật theo mô hình Shared Responsibility, không bị loại bỏ\n✗ Dùng AWS vẫn phát sinh chi phí theo tài nguyên sử dụng\n✗ Bảo trì mã ứng dụng vẫn là trách nhiệm của khách hàng, không phải AWS",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-004",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An autonomous vehicle manufacturer needs to process sensor data with ultra-low latency directly in major cities, using telecom carrier 5G networks so data doesn't have to travel far to a Region. Which AWS solution best fits this 5G edge computing requirement?",
    "options": [
      "AWS Wavelength",
      "AWS Local Zones",
      "Amazon CloudFront",
      "AWS Outposts"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Xử lý độ trễ cực thấp trên mạng 5G của nhà mạng là đúng vai trò của AWS Wavelength.\n✓ AWS Wavelength — đúng, nhúng hạ tầng AWS vào mạng 5G của telco cho ứng dụng độ trễ siêu thấp.\n✗ AWS Local Zones — đưa tài nguyên gần đô thị lớn nhưng không gắn trực tiếp vào mạng 5G của nhà mạng.\n✗ Amazon CloudFront — CDN cache nội dung tĩnh ở edge, không xử lý dữ liệu cảm biến thời gian thực trên 5G.\n✗ AWS Outposts — đưa hạ tầng AWS vào data center của khách hàng, không phải mạng 5G của telco.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-004",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An insurance company wants to build a natural language generation chatbot based on pre-built foundation models, customized with internal data, without having to train models from scratch or manage infrastructure. Which AWS service is most suitable for building this generative AI application?",
    "options": [
      "Amazon Bedrock",
      "Amazon SageMaker",
      "Amazon Comprehend",
      "Amazon Rekognition"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Xây ứng dụng generative AI từ các foundation model dựng sẵn, có quản lý, là vai trò của Amazon Bedrock.\n✓ Amazon Bedrock — đúng, truy cập foundation model qua API, tùy biến với dữ liệu nội bộ mà không quản hạ tầng.\n✗ Amazon SageMaker — nền tảng để tự build/train/deploy mô hình ML, đòi hỏi nhiều công sức hơn so với dùng FM dựng sẵn.\n✗ Amazon Comprehend — NLP để phân tích văn bản (sentiment, entity), không phải xây chatbot gen-AI.\n✗ Amazon Rekognition — phân tích hình ảnh và video, không liên quan sinh ngôn ngữ.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-005",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An e-commerce company wants to reduce the environmental impact of its cloud infrastructure by switching workloads to Graviton instances and choosing regions that use renewable energy. Which AWS Well-Architected Framework pillar does this goal belong to?",
    "options": [
      "Sustainability",
      "Cost Optimization",
      "Performance Efficiency",
      "Operational Excellence"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giảm carbon footprint, chọn Graviton và region renewable energy là trọng tâm của Sustainability pillar.\n✓ Sustainability — đúng, tập trung giảm tác động môi trường (carbon, energy) của workload.\n✗ Cost Optimization — về chi phí thấp nhất, dù Graviton có rẻ hơn nhưng mục tiêu nêu là môi trường.\n✗ Performance Efficiency — về dùng đúng tài nguyên cho đúng workload, không phải môi trường.\n✗ Operational Excellence — về vận hành, runbook, automation.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-005",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A bank wants to ensure its core banking system continues operating and automatically recovers when an Availability Zone fails, with RTO under 5 minutes. Which pillar does this requirement best align with?",
    "options": [
      "Reliability",
      "Security",
      "Cost Optimization",
      "Sustainability"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tự động recover khi AZ fail, RTO/RPO, Multi-AZ là trọng tâm của Reliability pillar.\n✓ Reliability — đúng, workload thực hiện đúng chức năng và recover khi fail (HA, Multi-AZ, RTO/RPO).\n✗ Security — về bảo vệ data và quyền truy cập, không phải khôi phục lỗi.\n✗ Cost Optimization — về chi phí; HA thường làm tăng cost.\n✗ Sustainability — về môi trường, carbon.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-006",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A startup manually deploys infrastructure through the AWS Console with no rollback process and no monitoring. They want to improve by managing infrastructure with CloudFormation, deploying small updates frequently, and adding CloudWatch alarms. Which pillar do these improvements primarily belong to?",
    "options": [
      "Operational Excellence",
      "Reliability",
      "Performance Efficiency",
      "Security"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Infrastructure as code, frequent small reversible changes và observability là các design principle cốt lõi của Operational Excellence.\n✓ Operational Excellence — đúng, IaC, deploy nhỏ dễ rollback, monitor/observability.\n✗ Reliability — dù monitoring giúp HA, trọng tâm câu là quy trình vận hành và automation.\n✗ Performance Efficiency — về right-size, latency, scale, không phải IaC.\n✗ Security — về IAM, encrypt, không phải deploy automation.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-006",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A global SaaS company receives complaints about high latency. The architecture team wants to use CloudFront, choose the right EC2 instance family for the workload, and apply serverless to scale on demand. Which pillar do these decisions reflect?",
    "options": [
      "Performance Efficiency",
      "Cost Optimization",
      "Reliability",
      "Operational Excellence"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giảm latency, dùng đúng tài nguyên (instance family/serverless), scale on demand và go global là trọng tâm Performance Efficiency.\n✓ Performance Efficiency — đúng, dùng đúng tài nguyên cho đúng workload, low latency, go global, serverless.\n✗ Cost Optimization — về chi phí thấp nhất, không phải giảm latency.\n✗ Reliability — về HA và recover từ failure.\n✗ Operational Excellence — về vận hành, IaC, monitor.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-007",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company's CFO requires reducing the AWS bill by purchasing Savings Plans for stable compute, enabling S3 Intelligent-Tiering, and using AWS Budgets to track spending. Which Well-Architected Framework pillar does this activity belong to?",
    "options": [
      "Cost Optimization",
      "Performance Efficiency",
      "Sustainability",
      "Operational Excellence"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Right pricing model (Savings Plans), eliminate waste (Intelligent-Tiering) và measure (Budgets) là trọng tâm Cost Optimization.\n✓ Cost Optimization — đúng, đạt mục tiêu business với chi phí thấp nhất qua pricing model và đo lường.\n✗ Performance Efficiency — về tài nguyên cho hiệu năng, không phải giảm chi phí.\n✗ Sustainability — về môi trường; dù right-size giúp carbon, mục tiêu nêu rõ là chi phí.\n✗ Operational Excellence — về vận hành và automation.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-007",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A hospital needs to comply with patient data protection regulations. They enable encryption at-rest with KMS, encryption in-transit with TLS, apply least privilege through IAM, and enable MFA for all accounts. Which pillar do these measures belong to?",
    "options": [
      "Security",
      "Reliability",
      "Operational Excellence",
      "Cost Optimization"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mã hóa data, least privilege và MFA là các design principle cốt lõi của Security pillar.\n✓ Security — đúng, bảo vệ data và quản lý quyền (identity foundation, encrypt at rest/in transit).\n✗ Reliability — về HA và recover, không phải bảo mật.\n✗ Operational Excellence — về vận hành và automation.\n✗ Cost Optimization — về chi phí.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-008",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A DevOps team decides to run non-critical batch processing on Spot Instances to save up to 90% on costs, accepting that instances may be reclaimed. According to the Well-Architected Framework spirit, which statement BEST DESCRIBES this situation?",
    "options": [
      "This is an explicit trade-off: increasing Cost Optimization but potentially decreasing Reliability, and WAF encourages accepting trade-offs when considered",
      "This is a serious violation because WAF prohibits using Spot Instances in all cases",
      "Spot Instances improve both Cost Optimization and Reliability simultaneously without trade-offs",
      "This decision belongs to the Performance Efficiency pillar because Spot makes the system run faster"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "WAF coi trade-off là khái niệm cốt lõi; chọn Spot là tăng Cost nhưng giảm Reliability, và WAF khuyến khích trade-off rõ ràng khi phù hợp business.\n✓ Explicit trade-off Cost tăng / Reliability giảm — đúng, đây là tinh thần WAF: ghi rõ mình đang trade-off.\n✗ WAF cấm Spot — sai, WAF là checklist khuyến nghị, không cấm; Spot hợp lý cho workload fault-tolerant.\n✗ Cải thiện cả hai không đánh đổi — sai, Spot có thể bị reclaim sau cảnh báo 2 phút làm giảm reliability.\n✗ Thuộc Performance Efficiency — sai, Spot liên quan pricing/cost, không làm chạy nhanh hơn.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-008",
    "courseId": "CLF-C02",
    "lesson": "09-well-architected",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An architect replaces self-managed servers and databases on EC2 with AWS managed services like RDS, Lambda, and DynamoDB. According to the Well-Architected Framework, which statement CORRECTLY describes the benefits managed services provide?",
    "options": [
      "Cost Optimization is supported because managed services eliminate undifferentiated heavy lifting",
      "Security is improved because managed services automatically disable all IAM",
      "Reliability is guaranteed because managed services completely eliminate the need for backup and DR",
      "Operational Excellence is irrelevant because managed services increase operational burden"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Managed services giúp AWS gánh phần vận hành nền tảng, đây là undifferentiated heavy lifting, hỗ trợ Cost Optimization và Operational Excellence.\n✓ Loại bỏ undifferentiated heavy lifting giúp tối ưu chi phí và công sức vận hành\n✗ IAM vẫn cần thiết và do khách hàng quản lý, managed services không vô hiệu hóa IAM\n✗ Khách hàng vẫn cần cấu hình backup/DR phù hợp; managed services không loại bỏ hoàn toàn nhu cầu này\n✗ Managed services giảm chứ không tăng operational burden, hỗ trợ trực tiếp Operational Excellence",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-009",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company has a legacy web application running on on-premises servers. They want to quickly move it to AWS WITHOUT changing code, simply 'lift and shift' to EC2 instances. Which of the 7 Rs migration strategies is most appropriate?",
    "options": [
      "Rehost",
      "Refactor",
      "Repurchase",
      "Retire"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rehost (lift and shift) là di chuyển ứng dụng nguyên trạng lên cloud mà không thay đổi code.\n✓ Rehost — đúng, chuyển nguyên trạng lên EC2, nhanh, không sửa code.\n✗ Refactor — viết lại kiến trúc/code, tốn nhiều công sức.\n✗ Repurchase — thay bằng sản phẩm SaaS khác.\n✗ Retire — loại bỏ ứng dụng không còn dùng.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-009",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An organization is planning cloud transformation and wants to ensure employees have sufficient cloud skills, build a change culture, and manage training. Which perspective in the AWS Cloud Adoption Framework (CAF) focuses on this aspect?",
    "options": [
      "People perspective",
      "Platform perspective",
      "Governance perspective",
      "Operations perspective"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "People perspective trong CAF tập trung vào con người: kỹ năng, đào tạo, văn hóa và quản lý thay đổi tổ chức.\n✓ People perspective — đúng, lo về kỹ năng, đào tạo, văn hóa, change management.\n✗ Platform perspective — xây dựng kiến trúc và hạ tầng cloud.\n✗ Governance perspective — quản trị, đo lường giá trị kinh doanh, rủi ro.\n✗ Operations perspective — vận hành và quản lý workloads.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-010",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to migrate 200 TB of data from a data center to Amazon S3. Their internet connection is slow and network transfer would take many weeks. Which solution helps move this large amount of data to AWS quickly and securely?",
    "options": [
      "AWS Snowball",
      "AWS DataSync over internet",
      "Amazon S3 Transfer Acceleration",
      "AWS Direct Connect 1 Gbps"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Snowball là thiết bị vật lý dùng để chuyển khối lượng dữ liệu lớn (hàng chục đến hàng trăm TB) khi mạng quá chậm.\n✓ AWS Snowball — đúng, thiết bị vật lý vận chuyển dữ liệu lớn offline, an toàn.\n✗ AWS DataSync qua internet — vẫn phụ thuộc băng thông internet chậm.\n✗ S3 Transfer Acceleration — tăng tốc upload nhưng vẫn dùng internet, không tối ưu cho 200 TB qua đường chậm.\n✗ Direct Connect 1 Gbps — cần thời gian thiết lập và vẫn lâu cho 200 TB.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-010",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A business currently uses self-managed Microsoft Exchange email servers. When moving to cloud, they decide to abandon the self-managed system and switch to a SaaS email service (like Microsoft 365). Which of the 7 Rs strategy is this?",
    "options": [
      "Repurchase",
      "Replatform",
      "Rehost",
      "Relocate"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Repurchase (drop and shop) là thay thế ứng dụng hiện tại bằng một sản phẩm khác, thường là SaaS.\n✓ Repurchase — đúng, thay hệ thống tự quản bằng sản phẩm SaaS thương mại.\n✗ Replatform — thay đổi một số thành phần (vd dùng managed DB) nhưng giữ ứng dụng cốt lõi.\n✗ Rehost — chuyển nguyên trạng lên cloud.\n✗ Relocate — di chuyển hạ tầng (vd VMware) mà không mua lại hay đổi kiến trúc.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-011",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to migrate an on-premises Oracle database to Amazon Aurora with minimal downtime, and needs to convert between two different database engines. Which AWS service best supports this?",
    "options": [
      "AWS Database Migration Service (DMS) combined with Schema Conversion Tool (SCT)",
      "Amazon S3 cross-region replication",
      "AWS Snowcone",
      "Amazon RDS automated backup"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS DMS giúp migrate database với downtime tối thiểu; SCT chuyển đổi schema giữa các engine khác nhau (Oracle sang Aurora).\n✓ DMS + SCT — đúng, di chuyển dữ liệu liên tục với downtime thấp và chuyển đổi schema khác engine.\n✗ S3 cross-region replication — chỉ sao chép object trong S3, không dành cho database.\n✗ Snowcone — thiết bị edge nhỏ chuyển dữ liệu, không làm migration database liên tục.\n✗ RDS automated backup — sao lưu, không phải công cụ migration heterogeneous.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-011",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An organization is categorizing applications according to the 7 Rs migration strategies. Which scenario is CORRECTLY mapped to its corresponding strategy?",
    "options": [
      "A legacy internal application no longer used by anyone will be completely shut down — Retire",
      "Moving the application to EC2 but changing self-managed MySQL to Amazon RDS — Refactor",
      "Completely rewriting a monolith as serverless microservices — Rehost",
      "Purchasing Snowball equipment to transfer data — Replatform"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "7 Rs gồm Retire, Retain, Rehost, Replatform, Repurchase, Refactor, Relocate; mỗi tình huống phải khớp đúng định nghĩa.\n✓ Ứng dụng không còn dùng và bị tắt hoàn toàn chính là Retire\n✗ Đưa lên EC2 và đổi MySQL sang RDS là thay đổi nhỏ về nền tảng — đó là Replatform, không phải Refactor\n✗ Viết lại monolith thành microservices serverless là Refactor (re-architect), không phải Rehost\n✗ Mua Snowball chỉ là công cụ chuyển dữ liệu, không phải một chiến lược trong 7 Rs",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-012",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "In the AWS Cloud Adoption Framework, teams need to establish identity controls, detect threats, manage access, and protect data throughout cloud transformation. Which CAF perspective is primarily responsible for these capabilities?",
    "options": [
      "Security perspective",
      "Business perspective",
      "Platform perspective",
      "People perspective"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security perspective của CAF tập trung vào bảo mật: identity, threat detection, quản lý quyền truy cập, bảo vệ dữ liệu và hạ tầng.\n✓ Security perspective — đúng, lo về identity, threat detection, data protection.\n✗ Business perspective — gắn kết chiến lược IT với mục tiêu kinh doanh.\n✗ Platform perspective — xây dựng nền tảng hạ tầng cloud.\n✗ People perspective — kỹ năng, đào tạo, văn hóa con người.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-012",
    "courseId": "CLF-C02",
    "lesson": "10-migration-caf",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company runs applications on VMware in its data center and wants to quickly move the entire VMware environment to AWS Cloud without repurchasing licenses, without changing architecture or operating systems. Which 7 Rs strategy best describes this?",
    "options": [
      "Relocate",
      "Repurchase",
      "Refactor",
      "Retire"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Relocate là di chuyển hạ tầng (ví dụ workloads VMware) lên cloud mà không thay đổi hệ điều hành, kiến trúc hay mua lại license.\n✓ Relocate — đúng, chuyển VMware lên AWS không đổi kiến trúc/OS.\n✗ Repurchase — thay bằng sản phẩm/SaaS khác.\n✗ Refactor — thay đổi kiến trúc/code đáng kể.\n✗ Retire — loại bỏ ứng dụng không dùng.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-013",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company is planning monthly budgets for systems running on EC2 with On-Demand pricing, where the number of instances increases and decreases with actual traffic. According to cloud economics principles, how is this EC2 On-Demand cost classified?",
    "options": [
      "Variable cost (changes based on usage)",
      "Fixed cost (same amount paid each month)",
      "Capital expenditure (CapEx) as a prepaid investment",
      "Sunk cost as it cannot be recovered"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 On-Demand tính theo mức sử dụng thực tế nên là variable cost.\n✓ Variable cost — đúng, hóa đơn thay đổi theo số instance và thời gian chạy.\n✗ Fixed cost — sai, khoản này không cố định mà dao động theo tải.\n✗ CapEx — sai, đây là OpEx trả theo nhu cầu, không phải đầu tư trả trước.\n✗ Sunk cost — sai, khái niệm không phù hợp với mô hình pay-as-you-go.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-013",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A business moves from an on-premises data center to AWS and wants to compare costs. Which of the following cost factors exists in the on-premises environment but is borne by AWS, helping reduce Total Cost of Ownership (TCO)?",
    "options": [
      "Electricity, cooling, and physical hardware maintenance costs of the data center",
      "Data transfer charges going out to the Internet (data transfer out)",
      "Third-party software licensing costs purchased by the company",
      "Internal application development staff costs"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS gánh chi phí vận hành hạ tầng vật lý mà on-premises phải tự lo.\n✓ Điện, làm mát, bảo trì phần cứng — đúng, đây là chi phí data center AWS đảm nhận thay khách hàng.\n✗ Data transfer out — sai, khách hàng vẫn trả phí này trên AWS.\n✗ License phần mềm bên thứ ba tự mua — sai, vẫn do công ty chịu (BYOL).\n✗ Nhân sự phát triển ứng dụng — sai, không liên quan hạ tầng vật lý.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-014",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company currently owns previously purchased Microsoft SQL Server licenses and wants to continue using them when running on AWS to avoid paying additional licensing fees. Which licensing approach is most appropriate?",
    "options": [
      "Bring Your Own License (BYOL), bringing existing licenses to AWS",
      "License-included, using RDS with license cost already included in hourly price",
      "Purchase new licenses directly from AWS Marketplace for each instance",
      "Use open-source versions instead to avoid needing a license"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tận dụng giấy phép đã có chính là mô hình BYOL.\n✓ BYOL — đúng, mang license SQL Server hiện có sang AWS, tránh trả lại phí.\n✗ License-included — sai, sẽ trả license lần nữa trong giá giờ dù đã sở hữu.\n✗ Mua mới từ Marketplace — sai, lãng phí vì đã có license.\n✗ Chuyển open-source — sai, không phải yêu cầu và đòi thay đổi ứng dụng.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-014",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "AWS can provide services at lower costs than if each company built their own data center. Which cloud economics principle explains this?",
    "options": [
      "Economies of scale",
      "Loose coupling architecture",
      "Multi-AZ deployment",
      "Vertical scaling"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS mua hạ tầng ở quy mô khổng lồ nên đơn giá thấp hơn và chuyển lợi ích cho khách hàng.\n✓ Economies of scale — đúng, quy mô lớn giúp giảm chi phí trên mỗi đơn vị.\n✗ Loose coupling — sai, là nguyên tắc thiết kế, không liên quan giá.\n✗ Multi-AZ — sai, là tính sẵn sàng cao, không phải lý do giá rẻ.\n✗ Vertical scaling — sai, là cách scale, không giải thích đơn giá.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-015",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Operations team discovers many m5.4xlarge EC2 instances but CPU and memory are used less than 10% for extended periods. What is the most appropriate cost optimization action according to cloud economics principles?",
    "options": [
      "Rightsizing — migrate to a smaller instance type that matches actual load",
      "Purchase Reserved Instances for these m5.4xlarge instances to get a discount",
      "Enable Multi-AZ to distribute load better",
      "Migrate everything to S3 for cheaper storage"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tài nguyên dùng dưới mức nên giải pháp là rightsizing về kích thước phù hợp.\n✓ Rightsizing — đúng, giảm xuống instance nhỏ hơn để khớp nhu cầu và cắt chi phí lãng phí.\n✗ RI cho m5.4xlarge — sai, cam kết dài hạn cho tài nguyên đang quá dư là sai lầm.\n✗ Multi-AZ — sai, tăng chi phí mà không giải quyết tài nguyên dư.\n✗ Chuyển sang S3 — sai, S3 không thay thế được compute.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-015",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A startup wants to reduce cloud costs by applying automation and elasticity principles to avoid resource waste. Which of the following measures correctly applies this principle?",
    "options": [
      "Use Auto Scaling to automatically reduce the number of EC2 instances when traffic is low",
      "Purchase many EC2 On-Demand instances in advance running 24/7 to always be ready for peak loads",
      "Deploy instances at fixed maximum size year-round for safety",
      "Manually shut down each server at the end of each business day"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elasticity và automation nghĩa là tài nguyên tự co giãn theo nhu cầu, không cần can thiệp thủ công và không over-provision.\n✓ Auto Scaling tự động co giãn EC2 theo lưu lượng, tiết kiệm khi nhu cầu thấp\n✗ Mua nhiều On-Demand chạy 24/7 gây lãng phí khi tải thấp, không phải elasticity\n✗ Provision cố định kích thước tối đa quanh năm là over-provisioning, trái nguyên tắc\n✗ Tắt thủ công từng server là vận hành thủ công, không phải automation",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-016",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The CFO asks for an explanation of why migrating to AWS helps transform cost structure. Which characteristic correctly describes the shift from on-premises to AWS?",
    "options": [
      "Shift from upfront fixed costs (CapEx) to variable costs based on usage (OpEx)",
      "Shift from variable costs to fixed costs paid annually upfront",
      "Eliminate all variable costs related to data transfer",
      "Must pay for all infrastructure in advance for 3 years to use the service"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS biến đầu tư hạ tầng trả trước thành chi phí vận hành trả theo nhu cầu.\n✓ CapEx sang OpEx biến đổi — đúng, không cần mua phần cứng trước, trả theo mức dùng.\n✗ Biến đổi sang cố định hằng năm — sai, ngược với bản chất pay-as-you-go.\n✗ Loại bỏ mọi chi phí biến đổi — sai, vẫn còn data transfer và usage.\n✗ Buộc trả trước 3 năm — sai, On-Demand không yêu cầu cam kết.",
    "domain": 1,
    "mock": 4
  },
  {
    "id": "clf-m5-016",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An application has a stable 24/7 baseline load predictable for 3 years, plus unpredictable traffic spikes. To optimize costs according to cloud economics, which combination purchase strategy makes the most sense?",
    "options": [
      "Use Savings Plans/Reserved Instances for stable baseline load and On-Demand/Spot for traffic spikes",
      "Use On-Demand exclusively for both baseline and spike loads to maintain maximum flexibility",
      "Use Reserved Instances exclusively committed to the highest peak capacity ever recorded",
      "Use Spot Instances exclusively for both baseline and spike loads for the lowest price"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kết hợp cam kết cho phần ổn định và mô hình linh hoạt cho phần biến động là tối ưu chi phí nhất.\n✓ Savings Plans/RI cho tải nền + On-Demand/Spot cho đột biến — đúng, giảm giá phần biết trước, linh hoạt phần khó đoán.\n✗ Toàn bộ On-Demand — sai, bỏ lỡ giảm giá lớn cho phần tải nền ổn định.\n✗ Toàn bộ RI theo đỉnh cao nhất — sai, cam kết dư thừa gây lãng phí khi không đỉnh.\n✗ Toàn bộ Spot — sai, Spot có thể bị ngắt, không phù hợp tải nền 24/7 quan trọng.",
    "domain": 1,
    "mock": 5
  },
  {
    "id": "clf-m4-017",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company runs an application on Amazon EC2. According to the AWS Shared Responsibility Model, who is responsible for installing security patches for the operating system (guest OS) on that instance?",
    "options": [
      "Customer",
      "AWS",
      "Data center hardware provider",
      "AWS Support, free at all tiers"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với EC2 (IaaS), khách hàng quản lý guest OS bao gồm vá lỗi.\n✓ Khách hàng — đúng, patch guest OS, ứng dụng, cấu hình là trách nhiệm của khách hàng (security IN the cloud).\n✗ AWS — chỉ chịu trách nhiệm hạ tầng vật lý, hypervisor (security OF the cloud), không patch guest OS của EC2.\n✗ Nhà cung cấp phần cứng — không phải một bên trong mô hình trách nhiệm chia sẻ.\n✗ AWS Support — không tự động patch guest OS thay khách hàng.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-017",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "In the AWS Shared Responsibility Model, which category ALWAYS belongs to AWS regardless of which service the customer uses?",
    "options": [
      "Physical security of data centers",
      "Configure Security Group",
      "Manage IAM users and policies",
      "Client-side data encryption"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS luôn chịu trách nhiệm 'security OF the cloud', gồm cơ sở hạ tầng vật lý.\n✓ Bảo mật vật lý của trung tâm dữ liệu — đúng, luôn là AWS, khách hàng không bao giờ chạm tới phần cứng.\n✗ Cấu hình Security Group — luôn là trách nhiệm khách hàng.\n✗ Quản lý IAM users/policies — luôn là trách nhiệm khách hàng.\n✗ Client-side encryption — do khách hàng thực hiện.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-018",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A DevOps team migrates workloads from Amazon EC2 (self-managed database) to Amazon RDS. After migration, which responsibility is REDUCED (transferred to AWS) thanks to the managed service?",
    "options": [
      "Patching the underlying operating system of the database engine",
      "Design schema and write application queries",
      "Manage IAM access to RDS",
      "Configure Security Group for RDS instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS là managed service nên AWS đảm nhận patch OS và database engine, giảm gánh nặng vận hành cho khách hàng.\n✓ Patching OS nền của database engine — đúng, với RDS AWS lo việc này; với EC2 tự cài thì khách hàng phải làm.\n✗ Thiết kế schema/truy vấn — vẫn luôn là trách nhiệm khách hàng.\n✗ Quản lý IAM — vẫn là trách nhiệm khách hàng.\n✗ Cấu hình Security Group — vẫn là trách nhiệm khách hàng.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-018",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A developer builds a serverless application using AWS Lambda. Which category is NO LONGER their responsibility because Lambda manages it?",
    "options": [
      "Patch and maintain the operating system running code",
      "Secure function code (avoid logic vulnerabilities)",
      "Manage IAM execution role assigned to function",
      "Configure environment variables and resource access"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda trừu tượng hóa hạ tầng nên AWS quản lý OS và runtime, khách hàng chỉ lo code và cấu hình.\n✓ Patch/bảo trì OS chạy code — đúng, AWS lo phần này trong mô hình serverless.\n✗ Bảo mật code function — vẫn là trách nhiệm khách hàng.\n✗ Quản lý IAM execution role — vẫn là trách nhiệm khách hàng.\n✗ Cấu hình biến môi trường/quyền truy cập — vẫn là trách nhiệm khách hàng.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-019",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company stores sensitive documents in Amazon S3. They are concerned about data leaks. According to the Shared Responsibility Model, who is responsible for ENABLING encryption and configuring access permissions (bucket policy) for this data?",
    "options": [
      "Customer",
      "AWS, because S3 is a managed service",
      "AWS, because infrastructure encryption is 'security OF the cloud'",
      "Both configure access permissions per object together"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dù S3 là managed service, việc cấu hình access control và quản lý mã hóa của dữ liệu thuộc 'security IN the cloud' của khách hàng.\n✓ Khách hàng — đúng, khách hàng cấu hình bucket policy/quyền truy cập và quản lý mã hóa (chọn loại SSE, quản lý key) cho dữ liệu của mình.\n✗ AWS vì S3 managed — AWS chỉ bảo vệ hạ tầng, không cấu hình quyền dữ liệu của khách hàng.\n✗ AWS vì mã hóa hạ tầng — mã hóa hạ tầng vật lý khác với việc khách hàng cấu hình mã hóa dữ liệu của mình.\n✗ Cả hai cùng cấu hình — AWS không cấu hình quyền truy cập dữ liệu của khách hàng.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-019",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An architect reviews an environment with EC2, RDS, and Lambda according to the Shared Responsibility Model. Which category is ALWAYS the customer's responsibility regardless of which service is used?",
    "options": [
      "Manage IAM (users, roles, policies) and access permissions",
      "Patch the underlying hypervisor",
      "Maintain physical server hardware",
      "Control physical access to data centers"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Theo Shared Responsibility Model, khách hàng luôn chịu trách nhiệm về security IN the cloud, trong đó IAM là cốt lõi cho mọi dịch vụ.\n✓ Quản lý IAM và quyền truy cập luôn thuộc khách hàng với mọi dịch vụ\n✗ Vá hypervisor là trách nhiệm của AWS\n✗ Bảo trì phần cứng vật lý là trách nhiệm của AWS\n✗ Kiểm soát truy cập vật lý vào data center là trách nhiệm của AWS",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-020",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A team migrates multiple workloads from EC2 to managed/serverless services. Which statement CORRECTLY DESCRIBES how responsibilities shift along the spectrum EC2 → RDS → Lambda?",
    "options": [
      "The more managed services are used, AWS assumes more OS/runtime responsibility, customer focuses on data and configuration",
      "With Lambda, customer assumes more responsibility because they must manage both OS and scaling",
      "With RDS, customer must patch database engine themselves just like EC2",
      "When using managed services, AWS automatically configures IAM and data access permissions for the customer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phổ IaaS → PaaS → serverless cho thấy AWS gánh thêm trách nhiệm khi mức quản lý tăng.\n✓ Dùng managed nhiều hơn, AWS lo OS/runtime — đúng, khách hàng dịch lên lo dữ liệu và cấu hình.\n✗ Lambda khách hàng quản OS/scaling — sai, Lambda AWS lo OS và scaling.\n✗ RDS tự vá engine như EC2 — sai, RDS AWS vá engine.\n✗ AWS tự cấu hình IAM/quyền dữ liệu — sai, đó luôn là việc của khách hàng.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-020",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An auditor discovers an EC2 instance was compromised because the guest OS didn't have patches for a vulnerability disclosed 6 months ago, and a Security Group opens port 22 to 0.0.0.0/0. According to the Shared Responsibility Model, which conclusion about responsibility is CORRECT?",
    "options": [
      "Both OS patching and Security Group configuration are the customer's responsibility",
      "AWS is responsible because the OS vulnerability lies in AWS infrastructure",
      "AWS is responsible for Security Group configuration because it's an AWS network resource",
      "OS patching responsibility is AWS, Security Group is customer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với EC2, cả guest OS patching lẫn cấu hình network control đều thuộc 'security IN the cloud' của khách hàng.\n✓ Cả patch OS lẫn Security Group là của khách hàng — đúng, đây là hai trách nhiệm điển hình của khách hàng trên EC2.\n✗ AWS chịu trách nhiệm lỗ hổng OS — sai, AWS không patch guest OS của EC2.\n✗ AWS cấu hình Security Group — sai, khách hàng cấu hình Security Group.\n✗ Patch OS thuộc AWS — sai với EC2.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-021",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A company uses Amazon RDS as the primary database. When applying the Shared Responsibility Model, which of the following categories remain the CUSTOMER'S RESPONSIBILITY even though RDS is a managed service? (Select 2)",
    "options": [
      "Enable at-rest encryption and configure key management for the database",
      "Configure network access permissions (Security Group, subnet) to RDS",
      "Patch the underlying RDS operating system",
      "Maintain and replace storage hardware drives",
      "Install and upgrade minor database engine versions according to auto-maintenance schedule"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "RDS giảm gánh nặng OS/engine nhưng khách hàng vẫn lo bảo mật dữ liệu và truy cập mạng.\n✓ Bật encryption at-rest và quản lý key — đúng, khách hàng quyết định bật và cấu hình.\n✓ Cấu hình Security Group/subnet — đúng, kiểm soát truy cập mạng là của khách hàng.\n✗ Vá OS nền RDS — AWS lo.\n✗ Bảo trì/thay ổ đĩa phần cứng — AWS lo.\n✗ Nâng cấp minor engine theo bảo trì tự động — AWS thực hiện trong cửa sổ maintenance của managed service.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-021",
    "courseId": "CLF-C02",
    "lesson": "02-shared-responsibility",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Which statement correctly summarizes the core principle of the AWS Shared Responsibility Model?",
    "options": [
      "AWS is responsible for security OF the cloud (infrastructure); customer is responsible for security IN the cloud (data, configuration, access)",
      "AWS is responsible for all security, customer only pays",
      "Customer is responsible for physical security of data center hardware",
      "Security responsibility is fixed 50/50 for all services"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mô hình phân biệt rõ 'security OF the cloud' (AWS) và 'security IN the cloud' (khách hàng).\n✓ AWS lo OF the cloud, khách hàng lo IN the cloud — đúng, đây là nguyên tắc nền tảng.\n✗ AWS lo toàn bộ — sai, khách hàng vẫn có trách nhiệm.\n✗ Khách hàng lo phần cứng vật lý — sai, đó là AWS.\n✗ Chia 50/50 cố định — sai, ranh giới dịch chuyển tùy dịch vụ.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-022",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty cần tải các báo cáo tuân thủ (compliance reports) của AWS như SOC 2 và ISO 27001 để cung cấp cho bộ phận kiểm toán. Dịch vụ nào cho phép họ truy cập và tải về các báo cáo này theo nhu cầu?",
    "options": [
      "AWS Artifact",
      "AWS Trusted Advisor",
      "AWS Config",
      "AWS CloudTrail"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Artifact là cổng self-service cung cấp các báo cáo bảo mật và tuân thủ của AWS.\n✓ AWS Artifact — đúng, cung cấp on-demand các báo cáo như SOC, ISO, PCI.\n✗ AWS Trusted Advisor — chỉ đưa khuyến nghị tối ưu cost/security/performance.\n✗ AWS Config — đánh giá cấu hình resource, không cung cấp báo cáo audit của AWS.\n✗ AWS CloudTrail — ghi log API calls, không phải báo cáo tuân thủ.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-022",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The security team wants to know who called an API to delete an S3 bucket and at what time for investigation purposes. Which service records the history of API calls in an AWS account?",
    "options": [
      "AWS CloudTrail",
      "Amazon CloudWatch",
      "AWS Config",
      "Amazon Inspector"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS CloudTrail ghi lại ai đã gọi API nào, khi nào, từ đâu — phục vụ audit và điều tra.\n✓ AWS CloudTrail — đúng, ghi log hoạt động API và account activity.\n✗ Amazon CloudWatch — giám sát metric và log ứng dụng, không tập trung audit API.\n✗ AWS Config — theo dõi thay đổi cấu hình resource, không phải lịch sử API caller.\n✗ Amazon Inspector — quét lỗ hổng bảo mật, không ghi log API.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-023",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng lưu dữ liệu nhạy cảm trong Amazon S3 và cần mã hóa at rest với các khóa được quản lý tập trung, có thể tạo, xoay vòng (rotate) và kiểm soát quyền sử dụng khóa. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Key Management Service (KMS)",
      "AWS Certificate Manager (ACM)",
      "AWS Secrets Manager",
      "Amazon Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS KMS tạo và quản lý khóa mã hóa, hỗ trợ rotation và kiểm soát quyền truy cập khóa.\n✓ AWS KMS — đúng, quản lý encryption keys tập trung cho mã hóa at rest.\n✗ AWS Certificate Manager — quản lý SSL/TLS certificate cho mã hóa in transit.\n✗ AWS Secrets Manager — lưu và xoay vòng secret như mật khẩu DB, không phải khóa mã hóa dữ liệu S3.\n✗ Amazon Macie — phát hiện dữ liệu nhạy cảm trong S3, không quản lý khóa.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-023",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn được thông báo khi có hoạt động bất thường nghi ngờ độc hại, ví dụ giao tiếp với địa chỉ IP độc hại đã biết hoặc hành vi truy cập bất thường, bằng cách phân tích thông minh các nguồn log như VPC Flow Logs, DNS logs và CloudTrail. Dịch vụ nào nên dùng?",
    "options": [
      "Amazon GuardDuty",
      "Amazon Inspector",
      "AWS Config",
      "AWS Shield"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon GuardDuty là dịch vụ threat detection phân tích log để phát hiện hoạt động độc hại/bất thường.\n✓ Amazon GuardDuty — đúng, dùng ML phân tích VPC Flow Logs, DNS logs, CloudTrail để phát hiện threat.\n✗ Amazon Inspector — quét lỗ hổng phần mềm và cấu hình EC2/container, không phân tích traffic threat.\n✗ AWS Config — đánh giá compliance cấu hình, không phải threat detection.\n✗ AWS Shield — chống tấn công DDoS.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-024",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The DevOps team needs to automatically scan EC2 instances and container images to detect known software vulnerabilities (CVEs) and network exposure issues. Which AWS service is designed for this purpose?",
    "options": [
      "Amazon Inspector",
      "Amazon GuardDuty",
      "AWS Security Hub",
      "Amazon Detective"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon Inspector tự động quét lỗ hổng (CVE) cho EC2, container và Lambda.\n✓ Amazon Inspector — đúng, vulnerability scanning cho workload, phát hiện CVE và network reachability.\n✗ Amazon GuardDuty — phát hiện threat từ log, không quét CVE phần mềm.\n✗ AWS Security Hub — tổng hợp findings, không tự quét CVE trực tiếp.\n✗ Amazon Detective — điều tra root cause, không phải vulnerability scanner.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-024",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức dùng nhiều dịch vụ bảo mật (GuardDuty, Inspector, Macie) và muốn một bảng điều khiển TẬP TRUNG hợp nhất các finding bảo mật, đồng thời kiểm tra mức tuân thủ theo các tiêu chuẩn như CIS AWS Foundations. Dịch vụ nào đáp ứng?",
    "options": [
      "AWS Security Hub",
      "AWS Trusted Advisor",
      "Amazon CloudWatch",
      "AWS Artifact"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Security Hub là trung tâm tổng hợp findings từ nhiều dịch vụ và chấm điểm compliance theo standard.\n✓ AWS Security Hub — đúng, central dashboard hợp nhất findings và kiểm tra theo CIS, PCI DSS.\n✗ AWS Trusted Advisor — khuyến nghị tổng quát, không tổng hợp security findings đa dịch vụ.\n✗ Amazon CloudWatch — giám sát metric/log, không phải security posture management.\n✗ AWS Artifact — cung cấp báo cáo tuân thủ của AWS, không tổng hợp findings tài khoản.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-025",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một website chạy trên AWS thường xuyên bị tấn công gây quá tải làm gián đoạn dịch vụ. Công ty muốn bảo vệ chống lại các cuộc tấn công DDoS ở tầng network và transport. Dịch vụ nào được thiết kế chuyên cho việc này?",
    "options": [
      "AWS Shield",
      "AWS WAF",
      "Amazon GuardDuty",
      "AWS Firewall Manager"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Shield là dịch vụ bảo vệ chống DDoS; Shield Standard tự động bật cho mọi khách hàng.\n✓ AWS Shield — đúng, chuyên bảo vệ chống tấn công DDoS ở tầng network/transport.\n✗ AWS WAF — lọc traffic web theo rule (SQL injection, XSS) ở tầng application, không phải DDoS network layer chuyên biệt.\n✗ Amazon GuardDuty — phát hiện threat, không chặn DDoS.\n✗ AWS Firewall Manager — quản lý chính sách firewall tập trung, không phải bảo vệ DDoS.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-025",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bộ phận quản trị cần liên tục đánh giá xem các S3 bucket có vô tình bị cấu hình cho phép public access hay không, và nhận cảnh báo khi cấu hình resource lệch khỏi tiêu chuẩn nội bộ. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Config",
      "AWS CloudTrail",
      "Amazon Inspector",
      "AWS Artifact"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Config liên tục theo dõi và đánh giá cấu hình resource so với các rule mong muốn.\n✓ AWS Config — đúng, đánh giá compliance cấu hình và phát hiện drift (ví dụ S3 public).\n✗ AWS CloudTrail — ghi log API call, không đánh giá trạng thái cấu hình theo rule.\n✗ Amazon Inspector — quét lỗ hổng phần mềm, không kiểm tra cấu hình S3 public.\n✗ AWS Artifact — cung cấp báo cáo tuân thủ, không giám sát cấu hình.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-026",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một công ty đang chuẩn bị cho kỳ audit và muốn TỰ ĐỘNG HÓA việc thu thập bằng chứng (evidence) liên tục để chứng minh tuân thủ các khung như GDPR hay HIPAA. Họ cũng cần đảm bảo dữ liệu nhạy cảm được mã hóa in transit. Chọn HAI dịch vụ phù hợp với hai nhu cầu này.",
    "options": [
      "AWS Audit Manager",
      "AWS Certificate Manager (ACM)",
      "AWS Artifact",
      "Amazon GuardDuty",
      "AWS Config"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Audit Manager tự động thu thập evidence cho audit; ACM cung cấp TLS certificate cho mã hóa in transit.\n✓ AWS Audit Manager — đúng, tự động thu thập evidence liên tục theo framework (GDPR, HIPAA).\n✓ AWS Certificate Manager (ACM) — đúng, cấp và quản lý TLS/SSL certificate để mã hóa in transit.\n✗ AWS Artifact — cung cấp báo cáo của AWS, không tự thu thập evidence của tài khoản khách hàng.\n✗ Amazon GuardDuty — threat detection, không liên quan thu thập evidence hay mã hóa.\n✗ AWS Config — đánh giá cấu hình, không phải framework-based evidence collection cho audit.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-026",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một kiến trúc sư cần mã hóa lưu lượng giữa người dùng và Application Load Balancer (in transit) đồng thời mã hóa dữ liệu lưu trong Amazon RDS (at rest). Phát biểu nào mô tả đúng cách dùng dịch vụ AWS cho hai yêu cầu này?",
    "options": [
      "Use ACM to issue TLS certificates for ALB for in-transit encryption, and enable encryption with KMS for RDS for at-rest encryption",
      "Use KMS for both in-transit encryption at ALB and at-rest encryption at RDS",
      "Dùng AWS Shield để mã hóa in transit và AWS Artifact để mã hóa at rest",
      "Dùng CloudTrail để mã hóa in transit và Inspector để mã hóa at rest"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "In transit dùng TLS certificate (ACM) trên ALB; at rest dùng encryption tích hợp KMS của RDS.\n✓ ACM cho TLS in transit + KMS cho RDS at rest — đúng, đúng vai trò từng dịch vụ.\n✗ KMS cho cả hai — KMS quản lý khóa at rest, không cấp TLS certificate cho in transit.\n✗ Shield/Artifact — Shield chống DDoS, Artifact là báo cáo tuân thủ, không mã hóa dữ liệu.\n✗ CloudTrail/Inspector — là dịch vụ logging và vulnerability scanning, không mã hóa.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-027",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty startup vừa tạo AWS account mới bằng email công ty. Đội bảo mật khuyến nghị KHÔNG dùng tài khoản root cho công việc hằng ngày. Theo best practice của AWS, sau khi tạo account, hành động nào nên thực hiện ĐẦU TIÊN để bảo vệ root user?",
    "options": [
      "Enable MFA for root user and create separate IAM users for daily work",
      "Delete root user and use only IAM users",
      "Chia sẻ mật khẩu root cho cả đội qua Secrets Manager",
      "Tạo access keys cho root user để dùng với AWS CLI"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bảo vệ root bằng MFA và chuyển sang IAM user cho tác vụ thường ngày là best practice.\n✓ Bật MFA cho root + tạo IAM user — đúng, root chỉ dùng cho vài tác vụ đặc biệt, MFA tăng bảo vệ.\n✗ Xóa root user — không thể xóa, root gắn liền với account.\n✗ Chia sẻ mật khẩu root — vi phạm bảo mật nghiêm trọng.\n✗ Tạo access keys cho root — AWS khuyến nghị KHÔNG tạo access key cho root.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-027",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một tổ chức có 50 nhân viên cùng cần quyền đọc một bucket S3. Thay vì gán policy cho từng người, giải pháp IAM nào giúp quản lý quyền hiệu quả và dễ bảo trì nhất?",
    "options": [
      "Create IAM group, attach policy to group, then add users to the group",
      "Create 50 identical policies and assign them individually to each user",
      "Dùng chung một access key cho cả 50 người",
      "Bật root user cho từng nhân viên"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM group cho phép gán quyền một lần và áp dụng cho nhiều user.\n✓ IAM group + policy — đúng, quản lý tập trung, dễ thêm/bớt user.\n✗ 50 policy riêng — khó bảo trì, dễ lỗi.\n✗ Dùng chung access key — vi phạm bảo mật và không truy vết được.\n✗ Bật root cho từng người — không thể và cực kỳ rủi ro.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-028",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng chạy trên EC2 cần truy cập bucket S3 để đọc file cấu hình. Đội DevOps muốn tránh lưu credentials cứng (hard-coded) trong code. Giải pháp AWS nào phù hợp nhất?",
    "options": [
      "Assign IAM role to EC2 instance (instance profile)",
      "Store access key in config file on EC2",
      "Dùng access key của root user trong biến môi trường",
      "Nhúng access key của một IAM user vào source code"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role gắn vào EC2 cung cấp credentials tạm thời tự động xoay vòng, không cần lưu key.\n✓ IAM role cho EC2 — đúng, an toàn, không hard-code credentials.\n✗ Lưu access key trên EC2 — rủi ro lộ key, không xoay vòng.\n✗ Access key root — tuyệt đối tránh.\n✗ Nhúng key vào source code — rủi ro lộ qua repo, vi phạm best practice.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-028",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty cần lưu trữ và tự động xoay vòng (rotate) mật khẩu database RDS, đồng thời cho ứng dụng truy xuất an toàn qua API. Dịch vụ AWS nào đáp ứng tốt nhất yêu cầu này?",
    "options": [
      "AWS Secrets Manager",
      "AWS IAM Identity Center",
      "Amazon S3",
      "AWS Budgets"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager lưu trữ secret và hỗ trợ tự động rotation cho database credentials.\n✓ Secrets Manager — đúng, lưu trữ và tự động rotate mật khẩu, truy xuất qua API.\n✗ IAM Identity Center — quản lý truy cập SSO, không lưu secret database.\n✗ S3 — lưu object, không có rotation tích hợp cho credentials.\n✗ AWS Budgets — công cụ quản lý chi phí.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-029",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A business uses Microsoft Active Directory internally and wants employees to log in to multiple AWS accounts using AD credentials without creating separate IAM users. Which solution?",
    "options": [
      "AWS IAM Identity Center (SSO)",
      "Create IAM users with the same names for each employee in each account",
      "AWS Secrets Manager",
      "Amazon Cognito user pool cho nhân viên nội bộ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM Identity Center cung cấp SSO và liên kết với identity provider như Active Directory cho nhiều account.\n✓ IAM Identity Center — đúng, SSO tập trung, tích hợp AD, quản lý nhiều account.\n✗ IAM user trùng tên mỗi account — không tập trung, khó bảo trì.\n✗ Secrets Manager — không phải dịch vụ đăng nhập.\n✗ Cognito — thiên về định danh cho ứng dụng khách (end-user), không phải SSO nhân viên nội bộ với AD.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-029",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer được giao nhiệm vụ chỉ thao tác với một bảng DynamoDB cụ thể. Người quản trị nên áp dụng nguyên tắc nào khi cấp quyền IAM cho developer này?",
    "options": [
      "Least privilege — chỉ cấp đúng quyền cần thiết trên bảng đó",
      "Cấp quyền AdministratorAccess để tránh phải chỉnh sửa sau này",
      "Thêm developer vào nhóm có quyền truy cập toàn bộ tài khoản",
      "Cấp quyền root tạm thời cho developer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nguyên tắc least privilege cấp tối thiểu quyền cần thiết để hoàn thành công việc.\n✓ Least privilege — đúng, giảm bề mặt rủi ro, chỉ quyền cần thiết.\n✗ AdministratorAccess — quyền quá rộng, vi phạm least privilege.\n✗ Nhóm full access — cấp dư thừa quyền.\n✗ Quyền root — không thể chia sẻ root và cực kỳ rủi ro.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-030",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "The security team reviews an AWS account and makes a list of tasks that ONLY the root user can perform (cannot be delegated to IAM users). Select TWO tasks that only root can do.",
    "options": [
      "Change the AWS Support plan of the account",
      "Close the AWS account",
      "Create a new IAM user",
      "Attach a policy to an IAM group",
      "Launch an EC2 instance"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Một số tác vụ ở cấp account chỉ root mới thực hiện được, như đổi support plan và đóng account.\n✓ Thay đổi AWS Support plan — đúng, là tác vụ chỉ root.\n✓ Đóng AWS account — đúng, chỉ root mới đóng được account.\n✗ Tạo IAM user — IAM user có quyền phù hợp làm được.\n✗ Gắn policy vào group — tác vụ IAM thông thường, không cần root.\n✗ Khởi chạy EC2 — IAM user có quyền EC2 làm được.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-030",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Account A (sản xuất) cần cho phép một dịch vụ ở Account B (giám sát) đọc log mà không tạo IAM user trong Account A. Cách tiếp cận IAM nào đúng?",
    "options": [
      "Tạo cross-account IAM role trong Account A, cho phép Account B assume role",
      "Chia sẻ access key của IAM user Account A cho Account B",
      "Bật MFA cho root của Account B",
      "Tạo IAM user mới trong Account A và gửi credentials cho Account B"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cross-account role cho phép principal ở account khác assume role với credentials tạm thời, không cần chia sẻ key.\n✓ Cross-account IAM role + assume — đúng, an toàn, không lộ credentials dài hạn.\n✗ Chia sẻ access key — vi phạm bảo mật, không xoay vòng.\n✗ MFA cho root Account B — không liên quan tới việc cấp quyền cross-account.\n✗ Tạo IAM user và gửi credentials — chính là điều cần tránh.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-031",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một nhân viên rời công ty. Người này từng dùng IAM user có access key để gọi AWS CLI. Để thu hồi quyền truy cập NGAY và an toàn nhất, quản trị viên nên làm gì?",
    "options": [
      "Vô hiệu hóa hoặc xóa access key và xóa/disable IAM user đó",
      "Đổi mật khẩu root của account",
      "Bật MFA cho IAM user đã rời đi",
      "Tạo IAM group mới và không thêm user vào"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thu hồi truy cập programmatic nghĩa là vô hiệu hóa access key và loại bỏ IAM user.\n✓ Vô hiệu/xóa access key + xóa IAM user — đúng, chặn ngay truy cập CLI và console.\n✗ Đổi mật khẩu root — không ảnh hưởng tới access key của IAM user.\n✗ Bật MFA cho user đã rời — không thu hồi quyền.\n✗ Tạo group mới — không liên quan tới việc thu hồi quyền hiện có.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-031",
    "courseId": "CLF-C02",
    "lesson": "03-iam",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn tăng cường bảo mật xác thực IAM theo best practice của AWS. Biện pháp nào sau đây giúp tăng cường bảo mật danh tính và truy cập?",
    "options": [
      "Yêu cầu Multi-Factor Authentication (MFA) cho các user có quyền cao",
      "Tạo một access key dùng chung cho toàn bộ phòng ban để tiện chia sẻ",
      "Tắt CloudTrail để giảm chi phí logging",
      "Cấp AdministratorAccess cho mọi user để thuận tiện vận hành"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Best practice IAM hướng tới xác thực mạnh và least privilege; MFA là lớp bảo vệ then chốt.\n✓ Bật MFA cho user quyền cao tăng cường bảo mật xác thực theo best practice\n✗ Access key dùng chung phá vỡ truy vết và least privilege, là anti-pattern\n✗ Tắt CloudTrail làm mất khả năng audit, giảm chứ không tăng bảo mật\n✗ Cấp AdministratorAccess cho mọi user vi phạm nguyên tắc least privilege",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-032",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty mới đăng ký AWS và muốn biết mình ĐÃ tự động được bảo vệ DDoS ở mức cơ bản (network/transport layer) mà KHÔNG mất thêm phí, không cần đăng ký. Dịch vụ nào cung cấp khả năng này?",
    "options": [
      "AWS Shield Standard",
      "AWS Shield Advanced",
      "AWS WAF",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Shield Standard bảo vệ DDoS layer 3/4 tự động, miễn phí cho mọi khách hàng AWS.\n✓ AWS Shield Standard — đúng, tự động bật, không tính phí thêm.\n✗ AWS Shield Advanced — có phí thuê bao, cần đăng ký, thêm bảo vệ nâng cao và hỗ trợ DRT.\n✗ AWS WAF — lọc traffic web layer 7 theo rule, có phí, không tự động.\n✗ Amazon GuardDuty — phát hiện mối đe dọa qua phân tích log, không phải chống DDoS.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-032",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The security team wants to filter malicious HTTP requests such as SQL injection and cross-site scripting (XSS) to an Application Load Balancer and Amazon CloudFront. Which AWS service is most suitable?",
    "options": [
      "AWS WAF",
      "AWS Shield Standard",
      "Amazon Inspector",
      "AWS Config"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS WAF cho phép tạo rule lọc request web layer 7, bao gồm SQL injection và XSS.\n✓ AWS WAF — đúng, bảo vệ web application khỏi exploit phổ biến, gắn vào ALB/CloudFront/API Gateway.\n✗ AWS Shield Standard — chỉ chống DDoS layer 3/4.\n✗ Amazon Inspector — quét lỗ hổng (vulnerability) trên EC2/container, không lọc traffic.\n✗ AWS Config — đánh giá cấu hình resource so với quy tắc compliance.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-033",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức quản lý hàng trăm tài khoản AWS trong AWS Organizations và muốn áp dụng và thực thi (enforce) tập rule AWS WAF NHẤT QUÁN trên tất cả tài khoản và resource một cách tập trung. Dịch vụ nào nên dùng?",
    "options": [
      "AWS Firewall Manager",
      "AWS WAF triển khai thủ công ở từng tài khoản",
      "Amazon GuardDuty",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Firewall Manager quản lý tập trung WAF rule, Shield Advanced và security group trên nhiều tài khoản qua Organizations.\n✓ AWS Firewall Manager — đúng, áp dụng và thực thi policy bảo mật nhất quán toàn tổ chức.\n✗ WAF thủ công từng tài khoản — không tập trung, dễ sai lệch và tốn công.\n✗ Amazon GuardDuty — phát hiện mối đe dọa, không quản lý WAF rule.\n✗ AWS Trusted Advisor — đưa khuyến nghị best practice, không thực thi WAF policy.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-033",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The operations team wants to detect abnormal behavior such as EC2 instances communicating with malware command-and-control server IP addresses or unauthorized access to accounts, by analyzing VPC Flow Logs, DNS logs, and CloudTrail. Which service is designed for this?",
    "options": [
      "Amazon GuardDuty",
      "AWS WAF",
      "AWS Shield Advanced",
      "Amazon Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon GuardDuty là dịch vụ threat detection phân tích log để phát hiện hoạt động độc hại/bất thường.\n✓ Amazon GuardDuty — đúng, dùng machine learning trên Flow Logs, DNS logs, CloudTrail để phát hiện đe dọa.\n✗ AWS WAF — lọc request web, không phân tích log để phát hiện đe dọa.\n✗ AWS Shield Advanced — chống DDoS nâng cao, không phát hiện malware C2.\n✗ Amazon Macie — phát hiện dữ liệu nhạy cảm (PII) trong S3, không phải threat detection mạng.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-034",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một startup chạy ứng dụng quan trọng và lo ngại về các cuộc tấn công DDoS lớn ở layer 7. Họ muốn có quyền truy cập 24/7 vào AWS DDoS Response Team (DRT) và được bảo vệ tài chính (cost protection) cho phí scale phát sinh do DDoS. Họ nên chọn gì?",
    "options": [
      "AWS Shield Advanced",
      "AWS Shield Standard",
      "AWS WAF (chỉ riêng)",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Shield Advanced cung cấp bảo vệ DDoS nâng cao, hỗ trợ DRT 24/7 và cost protection.\n✓ AWS Shield Advanced — đúng, có DRT, bảo vệ layer 3/4/7 nâng cao và hoàn phí scale do DDoS.\n✗ AWS Shield Standard — miễn phí nhưng không có DRT hay cost protection.\n✗ AWS WAF riêng — lọc web nhưng không cung cấp DRT hay cost protection cho DDoS.\n✗ Amazon GuardDuty — phát hiện đe dọa, không chống DDoS.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-034",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một quản trị viên đăng nhập AWS Trusted Advisor và muốn xem các khuyến nghị bảo mật như security group mở cổng quá rộng (ví dụ SSH 0.0.0.0/0), MFA chưa bật trên root account, và S3 bucket có quyền truy cập public. Trusted Advisor cung cấp các kiểm tra này trong nhóm nào?",
    "options": [
      "Nhóm Security checks",
      "Nhóm Cost Optimization checks",
      "Nhóm Performance checks",
      "Nhóm Fault Tolerance checks"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trusted Advisor có 5 nhóm; các kiểm tra security group, MFA root, S3 public thuộc nhóm Security.\n✓ Nhóm Security checks — đúng, cảnh báo cấu hình rủi ro như cổng mở, thiếu MFA, bucket public.\n✗ Cost Optimization — phát hiện resource lãng phí, không liên quan MFA.\n✗ Performance — gợi ý tối ưu hiệu năng resource.\n✗ Fault Tolerance — kiểm tra dự phòng, backup, Multi-AZ.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-035",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một công ty cần một giải pháp tường lửa thế hệ mới (next-generation firewall) của nhà cung cấp bên thứ ba và một công cụ antivirus chuyên dụng để triển khai nhanh trên hạ tầng AWS, với thanh toán hợp nhất qua hóa đơn AWS. Hai phát biểu nào ĐÚNG? (Chọn 2)",
    "options": [
      "AWS Marketplace cho phép tìm, mua và triển khai phần mềm bảo mật của bên thứ ba",
      "Chi phí phần mềm bên thứ ba mua qua AWS Marketplace xuất hiện trên hóa đơn AWS hợp nhất",
      "AWS Marketplace chỉ cung cấp phần mềm do AWS tự phát triển",
      "Sản phẩm trên AWS Marketplace không thể triển khai dưới dạng AMI hay container",
      "Trusted Advisor sẽ tự động cài đặt phần mềm firewall bên thứ ba"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "AWS Marketplace là chợ phần mềm bên thứ ba với thanh toán qua hóa đơn AWS.\n✓ Tìm/mua/triển khai phần mềm bảo mật bên thứ ba — đúng, đó là mục đích của Marketplace.\n✓ Chi phí trên hóa đơn AWS hợp nhất — đúng, billing tích hợp tiện lợi.\n✗ Chỉ phần mềm do AWS phát triển — sai, chủ yếu là sản phẩm của ISV bên thứ ba.\n✗ Không thể triển khai AMI/container — sai, hỗ trợ nhiều dạng gồm AMI và container.\n✗ Trusted Advisor tự cài firewall — sai, Trusted Advisor chỉ khuyến nghị, không cài phần mềm.",
    "domain": 2,
    "mock": 4
  },
  {
    "id": "clf-m5-035",
    "courseId": "CLF-C02",
    "lesson": "18-security-extended",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một kiến trúc sư cần ghép đôi (pair) hai dịch vụ để vừa lọc các request web độc hại theo rule tùy chỉnh, vừa được bảo vệ DDoS nâng cao với cost protection cho một ứng dụng phía sau CloudFront. Tổ hợp nào phù hợp nhất?",
    "options": [
      "AWS WAF kết hợp AWS Shield Advanced",
      "Amazon GuardDuty kết hợp AWS Config",
      "AWS Shield Standard kết hợp Amazon Inspector",
      "AWS Firewall Manager kết hợp Amazon Macie"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "WAF lọc request web layer 7 theo rule, Shield Advanced cung cấp chống DDoS nâng cao kèm cost protection; hai dịch vụ này bổ trợ nhau.\n✓ AWS WAF + AWS Shield Advanced — đúng, vừa lọc web exploit vừa chống DDoS nâng cao có cost protection.\n✗ GuardDuty + Config — phát hiện đe dọa và đánh giá cấu hình, không lọc web hay chống DDoS.\n✗ Shield Standard + Inspector — Shield Standard không có cost protection; Inspector quét lỗ hổng.\n✗ Firewall Manager + Macie — quản lý policy và phát hiện dữ liệu nhạy cảm, không trực tiếp lọc/chống DDoS theo yêu cầu.",
    "domain": 2,
    "mock": 5
  },
  {
    "id": "clf-m4-036",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty muốn định nghĩa toàn bộ hạ tầng AWS (VPC, EC2, RDS, Security Group) bằng file template để có thể tái tạo y hệt môi trường ở nhiều region khác nhau. Dịch vụ nào của AWS phù hợp nhất với cách tiếp cận Infrastructure as Code (IaC) này?",
    "options": [
      "AWS CloudFormation",
      "AWS Systems Manager",
      "Amazon EC2 Auto Scaling",
      "AWS Config"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFormation cho phép định nghĩa hạ tầng dưới dạng template (IaC) và triển khai lặp lại nhất quán.\n✓ AWS CloudFormation — đúng, dùng template để khai báo và tái tạo hạ tầng repeatable.\n✗ AWS Systems Manager — quản lý/vận hành tài nguyên, không phải IaC khai báo hạ tầng.\n✗ Amazon EC2 Auto Scaling — chỉ scale instance theo tải, không định nghĩa toàn bộ hạ tầng.\n✗ AWS Config — đánh giá tuân thủ cấu hình, không provision hạ tầng.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-036",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một kỹ sư cần ghi script tự động hóa các tác vụ AWS lặp đi lặp lại hàng ngày trong pipeline CI/CD chạy trên Linux, gọi nhiều dịch vụ và lưu lại lệnh trong file. Phương thức tương tác nào với AWS phù hợp nhất?",
    "options": [
      "AWS Management Console",
      "AWS Command Line Interface (CLI)",
      "AWS Personal Health Dashboard",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "AWS CLI cho phép đưa lệnh vào script để tự động hóa lặp lại trong pipeline.\n✓ AWS Command Line Interface (CLI) — đúng, scriptable, lý tưởng cho tự động hóa CI/CD lặp lại.\n✗ AWS Management Console — giao diện đồ họa, thao tác thủ công, khó script.\n✗ AWS Personal Health Dashboard — theo dõi tình trạng dịch vụ, không dùng để triển khai.\n✗ AWS Trusted Advisor — đưa khuyến nghị tối ưu, không thực thi script.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-037",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty đang chạy ứng dụng trên data center riêng và muốn mở rộng một phần workload lên AWS, kết nối hai môi trường để dùng chung tài nguyên. Đây là mô hình triển khai (deployment model) nào?",
    "options": [
      "Cloud (all-in)",
      "Hybrid",
      "On-premises",
      "Multi-tenant"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Kết hợp data center riêng với AWS là mô hình hybrid.\n✓ Hybrid — đúng, kết nối hạ tầng on-premises với cloud của AWS.\n✗ Cloud (all-in) — toàn bộ workload chạy trên cloud, không còn data center riêng.\n✗ On-premises — toàn bộ chạy tại chỗ, không dùng cloud.\n✗ Multi-tenant — kiến trúc chia sẻ tài nguyên giữa khách hàng, không phải mô hình triển khai cloud/hybrid.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-037",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer cần tạo và xóa tài nguyên AWS trực tiếp từ trong ứng dụng Python, gọi theo chương trình thay vì thao tác thủ công. Cách nào sau đây phù hợp để tương tác với AWS theo chương trình (programmatic)?",
    "options": [
      "Dùng AWS SDK for Python (Boto3) trong mã ứng dụng",
      "Đăng nhập AWS Management Console và bấm tạo tài nguyên",
      "Mở AWS Billing Dashboard để xem hóa đơn",
      "Dùng Amazon QuickSight để trực quan hóa dữ liệu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tương tác programmatic với AWS được thực hiện qua SDK, CLI hoặc gọi trực tiếp service API; Boto3 là SDK chính thức cho Python.\n✓ AWS SDK for Python (Boto3) cho phép gọi API tạo/xóa tài nguyên ngay trong ứng dụng Python\n✗ Management Console là thao tác thủ công qua giao diện, không phải programmatic\n✗ Billing Dashboard chỉ để xem chi phí, không tạo/xóa tài nguyên\n✗ QuickSight là công cụ BI trực quan hóa, không dùng để quản lý tài nguyên theo chương trình",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-038",
    "courseId": "CLF-C02",
    "lesson": "13-deploy-iac",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một quản trị viên cần nhanh chóng tạo một S3 bucket thử nghiệm chỉ một lần để kiểm tra, không cần lặp lại hay lưu cấu hình. Phương thức triển khai nào phù hợp nhất cho tác vụ one-time đơn giản này?",
    "options": [
      "AWS Management Console",
      "AWS CloudFormation StackSets",
      "AWS CodeDeploy",
      "Viết module Terraform tái sử dụng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Console phù hợp cho tác vụ one-time, nhanh, không cần lặp lại.\n✓ AWS Management Console — đúng, giao diện trực quan lý tưởng cho thao tác one-time nhanh.\n✗ AWS CloudFormation StackSets — dành cho triển khai lặp lại trên nhiều account/region.\n✗ AWS CodeDeploy — tự động hóa deploy ứng dụng, dư thừa cho một bucket test.\n✗ Viết module Terraform tái sử dụng — hướng tới repeatable IaC, không cần cho one-time.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-038",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một startup muốn phân phối video tĩnh và file tải xuống đến người dùng toàn cầu với độ trễ thấp nhất, bằng cách lưu bản sao nội dung gần người dùng cuối. Thành phần nào của AWS global infrastructure phục vụ mục đích này?",
    "options": [
      "Edge Location (qua Amazon CloudFront)",
      "Availability Zone",
      "AWS Region",
      "VPC subnet"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Edge Location lưu cache nội dung gần người dùng cuối để giảm độ trễ.\n✓ Edge Location (qua Amazon CloudFront) — đúng, cache nội dung tại điểm gần người dùng để phân phối nhanh.\n✗ Availability Zone — là nhóm data center trong một Region, không dùng để cache nội dung biên.\n✗ AWS Region — vùng địa lý chứa nhiều AZ, không phải điểm phân phối biên.\n✗ VPC subnet — phân đoạn mạng trong một AZ, không liên quan tới phân phối biên.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-039",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web chạy trên các EC2 instance đặt sau một load balancer. Đội kỹ thuật muốn ứng dụng vẫn hoạt động ngay cả khi một data center gặp sự cố mất điện. Cách triển khai nào đạt high availability tốt nhất với chi phí và độ phức tạp hợp lý?",
    "options": [
      "Triển khai EC2 instance trên nhiều Availability Zone trong cùng một Region",
      "Triển khai tất cả EC2 instance trong một Availability Zone duy nhất",
      "Triển khai EC2 instance trên nhiều Edge Location",
      "Triển khai một EC2 instance lớn hơn trong một AZ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi AZ có nguồn điện, làm mát và kết nối mạng độc lập nên không chia sẻ single point of failure; trải instance qua nhiều AZ đảm bảo HA.\n✓ Nhiều Availability Zone trong cùng một Region — đúng, AZ độc lập về hạ tầng nên sự cố một AZ không ảnh hưởng AZ khác.\n✗ Một Availability Zone duy nhất — toàn bộ ứng dụng sập nếu AZ đó gặp sự cố.\n✗ Nhiều Edge Location — Edge Location dùng để cache nội dung, không chạy ứng dụng EC2.\n✗ Một EC2 instance lớn hơn trong một AZ — vẫn là single point of failure, không cải thiện HA.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-039",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một công ty đang cân nhắc triển khai kiến trúc multi-Region. Những lý do nào dưới đây là động lực HỢP LÝ để chọn multi-Region thay vì chỉ multi-AZ? (Chọn 2)",
    "options": [
      "Đáp ứng yêu cầu data sovereignty buộc dữ liệu cư trú trong một quốc gia/khu vực cụ thể",
      "Giảm độ trễ cho người dùng phân tán ở các châu lục khác nhau",
      "Bảo vệ ứng dụng khỏi mất điện của một data center đơn lẻ",
      "Tăng dung lượng lưu trữ của một Amazon S3 bucket",
      "Cho phép nhiều instance chia sẻ chung một địa chỉ IP private"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Multi-Region được dùng khi cần tuân thủ chủ quyền dữ liệu, giảm độ trễ toàn cầu, hoặc disaster recovery quy mô lớn.\n✓ Data sovereignty — đúng, một số luật buộc dữ liệu phải nằm trong Region thuộc quốc gia/khu vực nhất định.\n✓ Giảm độ trễ cho người dùng ở các châu lục khác nhau — đúng, đặt workload gần người dùng tại nhiều Region giảm latency.\n✗ Bảo vệ khỏi mất điện một data center đơn lẻ — chỉ cần multi-AZ là đủ, không cần multi-Region.\n✗ Tăng dung lượng S3 bucket — S3 lưu trữ vốn không giới hạn dung lượng, không liên quan multi-Region.\n✗ Nhiều instance chia sẻ một IP private — không phải lý do và cũng không phải cách hoạt động của multi-Region.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-040",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhà phát triển game di động cần xử lý dữ liệu với độ trễ cực thấp cho người dùng kết nối qua mạng 5G của nhà mạng. Dịch vụ AWS nào được thiết kế để chạy workload tại biên mạng 5G của nhà mạng?",
    "options": [
      "AWS Wavelength",
      "AWS Outposts",
      "Amazon CloudFront",
      "AWS Global Accelerator"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Wavelength nhúng hạ tầng compute/storage vào mạng 5G của nhà mạng để đạt độ trễ siêu thấp.\n✓ AWS Wavelength — đúng, đặt tài nguyên AWS ngay tại biên mạng 5G của nhà mạng.\n✗ AWS Outposts — đưa hạ tầng AWS vào data center on-premises của khách hàng, không phải mạng 5G.\n✗ Amazon CloudFront — CDN cache nội dung, không xử lý compute độ trễ thấp tại biên 5G.\n✗ AWS Global Accelerator — tối ưu định tuyến qua mạng AWS, không chạy workload tại biên 5G.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-040",
    "courseId": "CLF-C02",
    "lesson": "01-cloud-concepts",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty truyền thông ở một thành phố lớn cần độ trễ một chữ số mili-giây cho ứng dụng render đồ họa thời gian thực phục vụ người dùng ngay trong thành phố đó, nhưng Region AWS gần nhất cách quá xa nên gây độ trễ cao. Họ muốn dùng dịch vụ AWS đặt compute gần người dùng đô thị mà vẫn liền mạch với Region. Lựa chọn nào phù hợp nhất?",
    "options": [
      "AWS Local Zones",
      "Thêm một Availability Zone mới vào Region hiện tại",
      "Amazon CloudFront Edge Location",
      "Triển khai một Region thứ hai cách đó hàng nghìn km"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Local Zones đặt compute, storage gần các trung tâm dân cư/đô thị lớn, kết nối liền mạch với một Region cha để đạt độ trễ rất thấp.\n✓ AWS Local Zones — đúng, mở rộng Region tới gần người dùng đô thị cho workload độ trễ cực thấp như render thời gian thực.\n✗ Thêm một Availability Zone mới — khách hàng không thể tự thêm AZ; AZ vẫn nằm trong cùng vùng địa lý của Region xa.\n✗ Amazon CloudFront Edge Location — chỉ cache nội dung, không chạy được compute render thời gian thực.\n✗ Region thứ hai cách hàng nghìn km — không giải quyết độ trễ tới người dùng trong chính thành phố đó.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-041",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một startup chạy ứng dụng web với lượng traffic biến động mạnh theo giờ trong ngày. Họ muốn số lượng EC2 instance tự động tăng khi tải cao và giảm khi tải thấp để tối ưu chi phí. Tính năng AWS nào trực tiếp cung cấp khả năng elasticity này?",
    "options": [
      "Amazon EC2 Auto Scaling",
      "Reserved Instances",
      "Amazon Machine Image (AMI)",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 Auto Scaling tự động thêm/bớt instance theo nhu cầu, hiện thực hóa nguyên lý elasticity.\n✓ Amazon EC2 Auto Scaling — đúng, tự động scale in/out theo tải.\n✗ Reserved Instances — chỉ là mô hình giá cam kết, không tự scale.\n✗ Amazon Machine Image (AMI) — là template tạo instance, không quản lý số lượng.\n✗ AWS Trusted Advisor — công cụ khuyến nghị tối ưu, không tự scale.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-041",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhóm phát triển muốn chạy ứng dụng đóng gói trong container nhưng KHÔNG muốn quản lý hay vận hành bất kỳ EC2 instance nào làm worker node. Họ cần một compute engine serverless cho container. Lựa chọn nào phù hợp nhất?",
    "options": [
      "AWS Fargate",
      "Amazon EC2 với Auto Scaling",
      "Amazon Machine Image tùy chỉnh",
      "AWS Batch trên EC2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fargate là serverless compute engine cho container, không cần quản lý server.\n✓ AWS Fargate — đúng, chạy container không cần quản lý EC2.\n✗ Amazon EC2 với Auto Scaling — vẫn phải quản lý các instance.\n✗ Amazon Machine Image tùy chỉnh — chỉ là template OS, không liên quan serverless container.\n✗ AWS Batch trên EC2 — vẫn dựa trên EC2 cần quản lý.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-042",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng phân tích in-memory cần lượng RAM rất lớn so với vCPU để giữ toàn bộ dataset trong bộ nhớ, ví dụ cơ sở dữ liệu in-memory như Redis. Họ nên chọn họ EC2 instance nào?",
    "options": [
      "Memory optimized (ví dụ họ R)",
      "Compute optimized (ví dụ họ C)",
      "Storage optimized (ví dụ họ I)",
      "General purpose (ví dụ họ T)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Workload cần nhiều RAM cho dữ liệu in-memory phù hợp với memory optimized.\n✓ Memory optimized (họ R) — đúng, tỷ lệ RAM/vCPU cao cho in-memory.\n✗ Compute optimized (họ C) — tối ưu cho tác vụ nặng CPU như xử lý batch, encoding.\n✗ Storage optimized (họ I) — tối ưu cho I/O đĩa cao, không phải RAM lớn.\n✗ General purpose (họ T) — cân bằng, không tối ưu RAM cực lớn.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-042",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn xử lý ảnh tự động mỗi khi người dùng upload file lên Amazon S3. Họ không muốn vận hành server và chỉ trả tiền cho thời gian thực thi của đoạn code. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Lambda",
      "Amazon EC2 Spot Instances",
      "Amazon ECS trên EC2",
      "AWS Elastic Beanstalk"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda chạy code theo sự kiện, serverless, tính phí theo thời gian chạy — lý tưởng cho xử lý event-driven từ S3.\n✓ AWS Lambda — đúng, serverless, kích hoạt bởi S3 event, trả tiền theo execution.\n✗ Amazon EC2 Spot Instances — vẫn cần vận hành server.\n✗ Amazon ECS trên EC2 — phải quản lý EC2 nền tảng.\n✗ AWS Elastic Beanstalk — triển khai app nhưng vẫn cấp phát hạ tầng bên dưới.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-043",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web có nhiều EC2 instance chạy phía sau. Công ty muốn phân phối lưu lượng HTTP/HTTPS đến các instance dựa trên nội dung URL path (ví dụ /api và /images đi tới target group khác nhau). Loại Elastic Load Balancer nào phù hợp?",
    "options": [
      "Application Load Balancer (ALB)",
      "Network Load Balancer (NLB)",
      "Gateway Load Balancer",
      "Classic Load Balancer chỉ với TCP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ALB hoạt động ở tầng 7, hỗ trợ định tuyến theo path/host của HTTP/HTTPS.\n✓ Application Load Balancer (ALB) — đúng, path-based routing tầng 7.\n✗ Network Load Balancer (NLB) — tầng 4, định tuyến theo TCP/UDP, không hiểu URL path.\n✗ Gateway Load Balancer — dùng cho thiết bị ảo network (firewall, IDS/IPS).\n✗ Classic Load Balancer chỉ với TCP — không hỗ trợ content-based routing nâng cao.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-043",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một tổ chức đang lựa chọn giữa Amazon ECS và Amazon EKS để chạy container. Những phát biểu nào sau đây ĐÚNG? (Chọn 2)",
    "options": [
      "Amazon EKS chạy Kubernetes được quản lý, phù hợp khi đội ngũ đã có kỹ năng và công cụ Kubernetes",
      "Cả ECS và EKS đều có thể dùng AWS Fargate làm compute engine serverless",
      "Amazon ECS bắt buộc phải tự cài đặt và vận hành control plane Kubernetes",
      "Amazon EKS không thể tích hợp với IAM để phân quyền",
      "ECS và EKS đều là dịch vụ lưu trữ object thay thế cho Amazon S3"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "EKS là Kubernetes managed; cả hai orchestrator đều hỗ trợ launch type Fargate.\n✓ EKS chạy Kubernetes managed — đúng, lý tưởng cho đội đã quen Kubernetes.\n✓ Cả ECS và EKS dùng được Fargate — đúng, Fargate là compute engine serverless chung.\n✗ ECS bắt buộc tự vận hành control plane Kubernetes — sai, ECS là orchestrator riêng của AWS, không phải Kubernetes.\n✗ EKS không tích hợp IAM — sai, EKS tích hợp IAM cho xác thực/phân quyền.\n✗ ECS/EKS là dịch vụ lưu trữ object — sai, chúng là dịch vụ container orchestration.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-044",
    "courseId": "CLF-C02",
    "lesson": "04-ec2",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một workload video transcoding nặng CPU cần tỷ lệ vCPU cao so với bộ nhớ để xử lý nhanh nhất với chi phí hợp lý. Họ EC2 instance nào được thiết kế cho mục đích này?",
    "options": [
      "Compute optimized",
      "Memory optimized",
      "Storage optimized",
      "Accelerated computing"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tác vụ nặng CPU như transcoding, batch, gaming server phù hợp compute optimized.\n✓ Compute optimized — đúng, tối ưu hiệu năng CPU cao.\n✗ Memory optimized — dành cho workload nhiều RAM như in-memory DB.\n✗ Storage optimized — dành cho I/O đĩa cao như data warehouse.\n✗ Accelerated computing — dùng GPU/FPGA cho ML, đồ họa, không tối ưu CPU thuần.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-044",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company is running a self-managed PostgreSQL database on an EC2 instance. The operations team must handle OS patching, install engine patches, configure backup and monitoring themselves. They want to switch to a managed service where AWS handles operational tasks while maintaining the PostgreSQL engine. Which service is most appropriate?",
    "options": [
      "Amazon RDS for PostgreSQL",
      "Amazon DynamoDB",
      "Amazon ElastiCache",
      "Amazon Redshift"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS là managed relational database, AWS lo OS patch, engine patch, backup, monitoring trong khi vẫn giữ engine PostgreSQL.\n✓ Amazon RDS for PostgreSQL — đúng, managed RDB hỗ trợ engine PostgreSQL, giảm gánh nặng vận hành.\n✗ Amazon DynamoDB — NoSQL key-value, không phải PostgreSQL relational.\n✗ Amazon ElastiCache — in-memory cache (Redis/Memcached), không phải relational DB.\n✗ Amazon Redshift — data warehouse OLAP, không dùng cho OLTP PostgreSQL thông thường.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-045",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An e-commerce web application uses Amazon RDS as primary database. During promotional campaigns, READ query volume (reading product catalogs) spikes and overloads the primary instance, while write volume remains constant. The technical team wants to distribute read queries across multiple instances. Which solution is most appropriate?",
    "options": [
      "Create an RDS Read Replica to serve read queries",
      "Enable Multi-AZ deployment for standby instance to handle read queries",
      "Increase backup retention period to 35 days",
      "Enable Deletion Protection on primary instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Read Replica dùng async replication, có thể nhận traffic đọc, giúp giảm tải đọc cho primary.\n✓ Tạo RDS Read Replica — đúng, replica phục vụ truy vấn đọc, scale read tách khỏi primary.\n✗ Bật Multi-AZ — standby chỉ đứng chờ failover (HA), KHÔNG serve read traffic.\n✗ Tăng backup retention — chỉ ảnh hưởng thời gian giữ backup, không giúp scale read.\n✗ Bật Deletion Protection — chỉ ngăn xóa nhầm DB, không liên quan tải đọc.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-045",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A gaming startup is building a shopping cart feature and user sessions need sub-millisecond access latency; data is temporary. They want a managed in-memory data store to reduce load on the main database. Which service is most appropriate?",
    "options": [
      "Amazon ElastiCache",
      "Amazon Athena",
      "Amazon Neptune",
      "AWS Glue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ElastiCache là in-memory cache managed (Redis/Memcached), cung cấp độ trễ sub-millisecond, lý tưởng cho session/cart tạm thời.\n✓ Amazon ElastiCache — đúng, in-memory store sub-ms latency, giảm tải DB chính.\n✗ Amazon Athena — serverless SQL query trên S3, không phải in-memory store.\n✗ Amazon Neptune — graph database, không tối ưu cho cache session.\n✗ AWS Glue — dịch vụ ETL managed, không phải data store cho ứng dụng.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-046",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An enterprise is operating an Oracle database on-premises and wants to migrate to Amazon Aurora PostgreSQL. Since the source engine (Oracle) and target engine (PostgreSQL) are different, they need to convert schema and stored procedures first, then migrate data with minimal downtime. Which combination of AWS services is most appropriate?",
    "options": [
      "AWS Schema Conversion Tool (SCT) to convert schema, then AWS Database Migration Service (DMS) to migrate data",
      "Use only AWS DMS to both convert schema and migrate data identically",
      "Amazon Redshift Spectrum to query Oracle database directly",
      "AWS Glue Crawler to automatically convert schema from Oracle to PostgreSQL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Migration heterogeneous (khác engine) cần SCT chuyển schema/stored procedure, rồi DMS di chuyển dữ liệu (hỗ trợ CDC giảm downtime).\n✓ SCT chuyển schema + DMS di chuyển dữ liệu — đúng, đúng quy trình heterogeneous migration.\n✗ Chỉ DMS làm tất cả — DMS di chuyển dữ liệu nhưng không chuyển đổi schema phức tạp giữa engine khác; cần SCT.\n✗ Redshift Spectrum — query S3, không migrate Oracle.\n✗ Glue Crawler — discover schema cho Data Catalog, không chuyển đổi schema engine.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-046",
    "courseId": "CLF-C02",
    "lesson": "07-databases",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A social media company needs a database to serve key-value workloads with millions of requests per second, stable single-digit millisecond latency, and nearly unlimited growth without server management. They choose Amazon DynamoDB. Which of the following statements about DynamoDB are TRUE? (Select 2)",
    "options": [
      "DynamoDB is serverless NoSQL, no need to provision or manage servers",
      "DynamoDB provides DynamoDB Global Tables for multi-region active-active replication",
      "DynamoDB supports complex SQL JOINs between multiple tables like RDS",
      "DynamoDB requires you to patch the OS of nodes yourself",
      "DynamoDB can only run in a single Availability Zone"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "DynamoDB là serverless NoSQL fully managed, và Global Tables cho phép multi-region active-active.\n✓ Serverless NoSQL không cần quản lý server — đúng, AWS lo toàn bộ hạ tầng.\n✓ Global Tables multi-region active-active — đúng, replicate đa vùng với eventual consistency.\n✗ Hỗ trợ SQL JOIN phức tạp — sai, DynamoDB là key-value/document, không làm JOIN ad-hoc như RDS.\n✗ Tự patch OS các node — sai, DynamoDB fully managed, không truy cập OS.\n✗ Chỉ chạy một AZ — sai, DynamoDB tự replicate dữ liệu trên nhiều AZ trong region.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-047",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company deploys web servers in a public subnet. They want to allow HTTPS inbound from the Internet but temporarily BLOCK a specific IP range that is attacking. Where do they only need to create a DENY rule in the VPC?",
    "options": [
      "Network ACL (NACL) của subnet — vì NACL hỗ trợ explicit DENY rule",
      "Security Group của instance — vì Security Group hỗ trợ DENY rule",
      "Route table của subnet",
      "IAM policy gắn vào instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NACL là lớp stateless ở cấp subnet và hỗ trợ cả ALLOW lẫn DENY, phù hợp để chặn một dải IP.\n✓ Network ACL — đúng, là tường lửa stateless cấp subnet duy nhất hỗ trợ explicit DENY.\n✗ Security Group — sai, Security Group chỉ có ALLOW (implicit deny), không tạo được rule DENY tường minh.\n✗ Route table — sai, chỉ điều hướng traffic, không lọc theo IP nguồn.\n✗ IAM policy — sai, kiểm soát quyền API/người dùng, không lọc network traffic.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-047",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup needs to reduce latency when distributing videos and static images to global users by caching content at edge locations. Which AWS service is most appropriate?",
    "options": [
      "Amazon CloudFront",
      "Amazon Route 53",
      "AWS Direct Connect",
      "Amazon VPC Peering"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFront là CDN cache nội dung tại các edge location gần người dùng để giảm latency.\n✓ Amazon CloudFront — đúng, CDN phân phối nội dung qua edge locations toàn cầu.\n✗ Route 53 — sai, là DNS service, không cache nội dung.\n✗ Direct Connect — sai, kết nối riêng từ on-premises tới AWS, không phải CDN.\n✗ VPC Peering — sai, kết nối hai VPC, không liên quan phân phối nội dung edge.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-048",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company needs to connect an on-premises data center to AWS via a PRIVATE connection with stable bandwidth, low and consistent latency to transfer large volumes of data daily. Which solution is most appropriate?",
    "options": [
      "AWS Direct Connect",
      "AWS Site-to-Site VPN",
      "Amazon CloudFront",
      "AWS Transit Gateway qua Internet công cộng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Direct Connect cung cấp kết nối vật lý riêng, băng thông ổn định và độ trễ nhất quán, không đi qua Internet công cộng.\n✓ AWS Direct Connect — đúng, đường truyền riêng dành riêng, hiệu năng nhất quán cho dữ liệu lớn.\n✗ Site-to-Site VPN — sai, đi qua Internet công cộng nên độ trễ/băng thông kém ổn định hơn.\n✗ CloudFront — sai, là CDN phân phối nội dung, không phải kết nối lai.\n✗ Transit Gateway qua Internet — sai, vẫn phụ thuộc Internet công cộng, không phải đường riêng.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-048",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "An architect needs to configure instances in a private subnet to download updates from the Internet but NOT allow the Internet to initiate connections to those instances. Which components are needed? (Select 2)",
    "options": [
      "NAT Gateway đặt trong public subnet",
      "Route trong private subnet trỏ traffic Internet (0.0.0.0/0) tới NAT Gateway",
      "Internet Gateway gắn trực tiếp vào private subnet",
      "Public IP gắn vào instance trong private subnet",
      "Security Group cho phép inbound 0.0.0.0/0 từ Internet"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "NAT Gateway trong public subnet cộng với route từ private subnet tới NAT cho phép outbound mà chặn inbound từ Internet.\n✓ NAT Gateway trong public subnet — đúng, cho phép instance private đi ra Internet.\n✓ Route 0.0.0.0/0 tới NAT Gateway — đúng, định tuyến traffic ra ngoài qua NAT.\n✗ Internet Gateway gắn vào private subnet — sai, làm subnet thành public, cho phép inbound từ Internet.\n✗ Public IP cho instance — sai, biến instance thành truy cập được từ Internet.\n✗ Security Group inbound 0.0.0.0/0 — sai, mở cổng cho Internet khởi tạo kết nối, vi phạm yêu cầu.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-049",
    "courseId": "CLF-C02",
    "lesson": "06-vpc",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An administrator configures a Security Group to allow inbound HTTPS (port 443) but does NOT add any outbound rules for responses. Users still receive responses from the web server successfully. Why?",
    "options": [
      "Security Group là stateful — phản hồi cho kết nối inbound được phép tự động được cho phép đi ra",
      "Security Group là stateless nên cần rule outbound riêng, nhưng NACL đã tự xử lý",
      "Route table đã tự động cho phép traffic phản hồi",
      "Mọi outbound đều bị chặn nên web server gửi qua Internet Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security Group là stateful nên traffic phản hồi của một kết nối đã được phép tự động cho phép, không cần outbound rule tương ứng.\n✓ Security Group stateful — đúng, phản hồi của kết nối inbound được phép tự động đi ra.\n✗ Security Group stateless + NACL — sai, NACL mới là stateless; Security Group là stateful.\n✗ Route table cho phép phản hồi — sai, route table chỉ định tuyến, không theo dõi trạng thái kết nối.\n✗ Mọi outbound bị chặn — sai, mặc định Security Group cho phép tất cả outbound.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-049",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company needs to store backups that they rarely access (a few times per year), accept retrieval time of several hours, and want the LOWEST possible storage cost. Which Amazon S3 storage class is most appropriate?",
    "options": [
      "S3 Glacier Deep Archive",
      "S3 Standard",
      "S3 Standard-IA",
      "S3 Intelligent-Tiering"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Glacier Deep Archive có chi phí lưu trữ thấp nhất, dành cho dữ liệu archive truy cập rất hiếm và chấp nhận truy xuất hàng giờ.\n✓ S3 Glacier Deep Archive — đúng, rẻ nhất cho archive dài hạn, truy xuất vài giờ.\n✗ S3 Standard — chi phí cao, dành cho dữ liệu truy cập thường xuyên.\n✗ S3 Standard-IA — rẻ hơn Standard nhưng vẫn đắt hơn Glacier nhiều cho dữ liệu hiếm truy cập.\n✗ S3 Intelligent-Tiering — tự động chuyển tầng, không phải rẻ nhất tuyệt đối cho dữ liệu biết chắc hiếm truy cập.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-050",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A log analytics application has UNPREDICTABLE access patterns: some objects are read continuously in the first month then rarely accessed, others are the opposite. The company wants to optimize costs WITHOUT manually analyzing and moving data. Which option is best?",
    "options": [
      "S3 Intelligent-Tiering",
      "S3 Standard-IA",
      "S3 Glacier Flexible Retrieval",
      "S3 One Zone-IA"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Intelligent-Tiering tự động chuyển object giữa các access tier dựa trên mẫu truy cập, lý tưởng khi pattern không dự đoán được.\n✓ S3 Intelligent-Tiering — đúng, tự động tối ưu chi phí cho truy cập không dự đoán.\n✗ S3 Standard-IA — phù hợp dữ liệu ít truy cập đều đặn, không tự thích nghi với pattern thay đổi.\n✗ S3 Glacier Flexible Retrieval — cho archive, không hợp dữ liệu đọc liên tục lúc đầu.\n✗ S3 One Zone-IA — rủi ro vì chỉ 1 AZ và không tự động chuyển tầng theo truy cập.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-050",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An EC2 application running a database needs high-performance block storage where data must PERSIST even if the instance is stopped or terminated. Which storage type meets this requirement?",
    "options": [
      "Amazon EBS",
      "EC2 Instance Store",
      "Amazon S3",
      "Amazon EFS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon EBS là block storage bền vững, tồn tại độc lập với vòng đời của EC2 instance.\n✓ Amazon EBS — đúng, block storage persistent, gắn vào EC2, dữ liệu giữ lại khi stop/terminate.\n✗ EC2 Instance Store — ephemeral, mất dữ liệu khi instance stop/terminate.\n✗ Amazon S3 — object storage, không phải block storage cho database.\n✗ Amazon EFS — file storage (NFS), không phải block storage cho database hiệu năng cao.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-051",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Multiple Linux EC2 instances in the same application need shared read/write access to a common file system that automatically scales. Which service is most appropriate?",
    "options": [
      "Amazon EFS",
      "Amazon EBS",
      "Amazon FSx for Windows File Server",
      "S3 Standard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon EFS là shared file system (NFS) cho Linux, nhiều instance gắn đồng thời và tự động co giãn.\n✓ Amazon EFS — đúng, file system dùng chung cho nhiều EC2 Linux, elastic.\n✗ Amazon EBS — volume thường gắn 1 instance, không phải shared file system điển hình.\n✗ Amazon FSx for Windows File Server — dành cho workload Windows/SMB, không phải Linux NFS.\n✗ S3 Standard — object storage, không phải file system gắn mount được như NFS.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-051",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company wants to AUTOMATICALLY transition objects from S3 Standard to S3 Standard-IA after 30 days and delete them after 365 days to reduce costs. Which S3 feature accomplishes this?",
    "options": [
      "S3 Lifecycle configuration",
      "S3 Versioning",
      "S3 Cross-Region Replication",
      "S3 Transfer Acceleration"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Lifecycle cho phép định nghĩa rule tự động chuyển tầng (transition) và xóa (expiration) object theo thời gian.\n✓ S3 Lifecycle configuration — đúng, tự động transition và expire object theo tuổi.\n✗ S3 Versioning — giữ nhiều phiên bản object, không tự chuyển tầng/xóa theo tuổi.\n✗ S3 Cross-Region Replication — sao chép object sang region khác, không quản lý vòng đời chi phí.\n✗ S3 Transfer Acceleration — tăng tốc upload/download, không liên quan chuyển tầng.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-052",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An on-premises data center wants to provide internal applications with file access via NFS/SMB protocol with low latency (local cache) while actual data is persistently stored on Amazon S3. Which solution is appropriate?",
    "options": [
      "AWS Storage Gateway (Amazon S3 File Gateway)",
      "AWS DataSync",
      "AWS Snowball",
      "Amazon FSx for Lustre"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 File Gateway của AWS Storage Gateway cung cấp truy cập file NFS/SMB tại chỗ với cache cục bộ, lưu dữ liệu vào S3.\n✓ AWS Storage Gateway (S3 File Gateway) — đúng, hybrid file access NFS/SMB với cache, backend là S3.\n✗ AWS DataSync — di chuyển/đồng bộ dữ liệu theo lô, không phải truy cập file liên tục với cache.\n✗ AWS Snowball — thiết bị vận chuyển dữ liệu vật lý offline, không phải truy cập file thường trực.\n✗ Amazon FSx for Lustre — file system hiệu năng cao cho HPC, không phải hybrid gateway tới S3.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-052",
    "courseId": "CLF-C02",
    "lesson": "05-s3",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "An organization wants centralized backup management and automatic policy-based backups for multiple AWS services from a single location. Which of the following resources can AWS Backup protect? (Select 2)",
    "options": [
      "Amazon EBS volumes",
      "Amazon RDS databases",
      "Một website tĩnh được host bên ngoài AWS",
      "Amazon CloudFront distribution",
      "Amazon API Gateway stage"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "AWS Backup quản lý tập trung backup cho nhiều dịch vụ AWS như EBS, RDS, DynamoDB, EFS, FSx.\n✓ Amazon EBS volumes — đúng, được AWS Backup hỗ trợ.\n✓ Amazon RDS databases — đúng, được AWS Backup hỗ trợ.\n✗ Website tĩnh host ngoài AWS — không nằm trong phạm vi AWS Backup.\n✗ Amazon CloudFront distribution — là CDN, không phải resource lưu trữ được AWS Backup.\n✗ Amazon API Gateway stage — không phải tài nguyên dữ liệu mà AWS Backup quản lý.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-053",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A startup wants to quickly build a product recommendation chatbot based on a large language model (like Claude) without a data scientist and without training a model from scratch. They only need to call foundation models via API and add guardrails. Which AWS service is most appropriate?",
    "options": [
      "Amazon Bedrock",
      "Amazon SageMaker",
      "Amazon Comprehend",
      "Amazon Lex"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bedrock cung cấp foundation model (Claude, Titan, Llama...) qua API kèm Guardrails, không cần train.\n✓ Amazon Bedrock — đúng, API tới foundation model gen-AI, có Guardrails, không cần ML team.\n✗ Amazon SageMaker — platform để train/deploy custom model, thừa và phức tạp cho nhu cầu này.\n✗ Amazon Comprehend — NLP pre-trained (sentiment, entity), không phải LLM gen-AI.\n✗ Amazon Lex — chatbot intent/slot truyền thống, không phải LLM foundation model.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-053",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A hospital needs to convert audio recordings of conversations between doctors and patients into text for medical records with accurate medical terminology. Which service is most appropriate?",
    "options": [
      "Amazon Transcribe Medical",
      "Amazon Polly",
      "Amazon Comprehend Medical",
      "Amazon Textract"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu là speech-to-text (audio → text) chuyên y khoa.\n✓ Amazon Transcribe Medical — đúng, STT chuyên thuật ngữ y khoa.\n✗ Amazon Polly — text-to-speech (ngược chiều), không chuyển âm thanh thành text.\n✗ Amazon Comprehend Medical — NLP trích entity y khoa từ text có sẵn, không transcribe audio.\n✗ Amazon Textract — OCR trích text từ document/ảnh, không xử lý audio.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-054",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An insurance company needs to automatically extract amounts, dates, and form fields from thousands of scanned PDF invoices and claim requests. Which AWS service is specifically designed for this?",
    "options": [
      "Amazon Textract",
      "Amazon Rekognition",
      "Amazon Kendra",
      "Amazon Comprehend"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần OCR và trích form/table từ document — đó là chuyên môn của Textract.\n✓ Amazon Textract — đúng, OCR + extract form, table, key-value từ document/PDF scan.\n✗ Amazon Rekognition — phân tích image/video (object, face, moderation), OCR chỉ ở mức nhẹ, không chuyên form document.\n✗ Amazon Kendra — enterprise search NLU, không trích trường dữ liệu từ hóa đơn.\n✗ Amazon Comprehend — NLP trên text, không OCR document scan.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-054",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Analytics team needs to run ad-hoc SQL queries directly on log files in CSV/Parquet format stored in Amazon S3 without building and managing a database server. Which service is most appropriate?",
    "options": [
      "Amazon Athena",
      "Amazon Kinesis Data Streams",
      "Amazon QuickSight",
      "AWS Glue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena là serverless query engine chạy SQL trực tiếp trên dữ liệu trong S3.\n✓ Amazon Athena — đúng, serverless, truy vấn SQL trực tiếp file trong S3, không cần server.\n✗ Amazon Kinesis Data Streams — ingest streaming data real-time, không phải query SQL trên file tĩnh.\n✗ Amazon QuickSight — công cụ BI dashboard/visualization, không phải engine truy vấn ad-hoc trên S3.\n✗ AWS Glue — ETL và data catalog; Glue cung cấp catalog cho Athena nhưng bản thân không phải engine SQL ad-hoc.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-055",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "An enterprise builds a data analytics pipeline: collect real-time clickstream from website, clean/transform (ETL) and create data catalog, then finally present results with interactive dashboards for leadership. Choose services appropriate for each stage (select 3).",
    "options": [
      "Amazon Kinesis — ingest clickstream streaming real-time",
      "AWS Glue — ETL và tạo data catalog",
      "Amazon QuickSight — dashboard BI tương tác",
      "Amazon Polly — chuyển dữ liệu thành giọng nói",
      "Amazon Lex — xây chatbot trả lời truy vấn"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Pipeline analytics: Kinesis ingest → Glue ETL/catalog → QuickSight visualize.\n✓ Amazon Kinesis — đúng, ingest streaming clickstream real-time.\n✓ AWS Glue — đúng, ETL serverless và data catalog.\n✓ Amazon QuickSight — đúng, dashboard BI tương tác.\n✗ Amazon Polly — text-to-speech, không liên quan pipeline analytics dữ liệu.\n✗ Amazon Lex — chatbot, không phải bước trong pipeline xử lý/trình bày dữ liệu.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-055",
    "courseId": "CLF-C02",
    "lesson": "15-ai-ml",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "A corporation has millions of internal documents scattered across Amazon S3, SharePoint and Confluence. Employees want to ask questions in natural language (e.g., 'what is the maternity leave policy?') and get accurate answers from this document repository. Which AWS service specializes in this enterprise search NLU?",
    "options": [
      "Amazon Kendra",
      "Amazon Athena",
      "Amazon Comprehend",
      "Amazon Rekognition"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kendra là enterprise search dùng NLU, hiểu câu hỏi tự nhiên và tìm trên nhiều nguồn (S3, SharePoint, Confluence).\n✓ Amazon Kendra — đúng, intelligent enterprise search với NLU trên nhiều connector dữ liệu.\n✗ Amazon Athena — query SQL trên dữ liệu có cấu trúc trong S3, không phải natural-language search tài liệu.\n✗ Amazon Comprehend — phân tích NLP (sentiment, entity) trên text, không phải search engine doanh nghiệp.\n✗ Amazon Rekognition — phân tích image/video, không liên quan tìm kiếm tài liệu.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-056",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "A company wants to send notifications simultaneously to multiple different endpoints (email, SMS, and processing queues) using a publish/subscribe model, with each message pushed immediately to all subscribers. Which service is most appropriate?",
    "options": [
      "Amazon SNS",
      "Amazon SQS",
      "Amazon Connect",
      "Amazon SES"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SNS là dịch vụ pub/sub đẩy (push) message tới nhiều subscriber đồng thời.\n✓ Amazon SNS — đúng, mô hình publish/subscribe, fan-out tới email, SMS, SQS, Lambda.\n✗ Amazon SQS — hàng đợi pull, một message thường được một consumer xử lý, không phải fan-out.\n✗ Amazon Connect — contact center/call center, không phải messaging pub/sub.\n✗ Amazon SES — chỉ gửi/nhận email, không fan-out đa kênh.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-056",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A DevOps team wants to automate the entire process: pull code from repo, build, test, and deploy across multiple stages (staging, production). Which service orchestrates this entire end-to-end CI/CD pipeline?",
    "options": [
      "AWS CodePipeline",
      "AWS CodeBuild",
      "AWS X-Ray",
      "Amazon EventBridge"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodePipeline điều phối các giai đoạn source/build/test/deploy thành một pipeline liên tục.\n✓ AWS CodePipeline — đúng, orchestrate toàn bộ workflow CI/CD qua nhiều stage.\n✗ AWS CodeBuild — chỉ thực hiện bước build và test, không điều phối cả pipeline.\n✗ AWS X-Ray — phân tích/trace request trong ứng dụng phân tán, không phải CI/CD.\n✗ Amazon EventBridge — event bus định tuyến sự kiện, không phải công cụ CI/CD.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-057",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An application needs to route events from multiple sources (third-party SaaS, AWS services, internal applications) to different targets based on rules without writing polling code. Which serverless service best meets this requirement?",
    "options": [
      "Amazon EventBridge",
      "Amazon SQS",
      "AWS AppSync",
      "Amazon IoT Core"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge là serverless event bus, định tuyến sự kiện theo rule từ nhiều nguồn (gồm SaaS) tới target.\n✓ Amazon EventBridge — đúng, event-driven routing theo rule, tích hợp SaaS partner.\n✗ Amazon SQS — hàng đợi đệm message, không định tuyến theo rule và không tích hợp SaaS event.\n✗ AWS AppSync — managed GraphQL API, không phải event router.\n✗ Amazon IoT Core — kết nối thiết bị IoT, không phải bus sự kiện ứng dụng tổng quát.",
    "domain": 3,
    "mock": 4
  },
  {
    "id": "clf-m5-057",
    "courseId": "CLF-C02",
    "lesson": "14-app-integration",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "A startup wants to quickly build web/mobile applications with real-time GraphQL backend while deploying and hosting frontend with integrated CI/CD. Which AWS services are appropriate for this goal? (Select 2)",
    "options": [
      "AWS Amplify",
      "AWS AppSync",
      "Amazon AppStream 2.0",
      "AWS X-Ray",
      "Amazon Connect"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Amplify hỗ trợ build/deploy/hosting frontend full-stack với CI/CD; AppSync cung cấp GraphQL API real-time cho backend.\n✓ AWS Amplify — đúng, framework/hosting + CI/CD cho ứng dụng web/mobile.\n✓ AWS AppSync — đúng, managed GraphQL API với real-time (subscriptions) và offline sync.\n✗ Amazon AppStream 2.0 — streaming ứng dụng desktop, không liên quan backend GraphQL.\n✗ AWS X-Ray — tracing/debugging, không phải nền tảng phát triển ứng dụng.\n✗ Amazon Connect — contact center, không liên quan.",
    "domain": 3,
    "mock": 5
  },
  {
    "id": "clf-m4-058",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A company runs an image processing batch job at night. The job can be interrupted and automatically restart from a checkpoint without affecting business. They want to minimize EC2 costs. Which pricing model is most appropriate?",
    "options": [
      "Spot Instances",
      "On-Demand Instances",
      "Reserved Instances (1-year, All Upfront)",
      "Dedicated Hosts"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Workload chịu được gián đoạn (fault-tolerant, có checkpoint) là trường hợp lý tưởng cho mô hình giá rẻ nhất với mức giảm tới ~90%.\n✓ Spot Instances — đúng, rẻ nhất cho workload chịu gián đoạn, có thể bị reclaim nhưng job tự khởi động lại từ checkpoint.\n✗ On-Demand Instances — linh hoạt nhưng đắt nhất, không tối ưu chi phí.\n✗ Reserved Instances (1-year, All Upfront) — tiết kiệm cho tải ổn định 24/7 dài hạn, lãng phí cho job chỉ chạy ban đêm.\n✗ Dedicated Hosts — dành cho yêu cầu compliance/licensing, đắt và không cần thiết.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-058",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "A startup commits to spending $10/hour on compute over 1 year and wants discounts but still has flexibility to change between EC2, Lambda and Fargate, switch instance families, sizes, OS and Region. Which option meets this?",
    "options": [
      "Compute Savings Plans",
      "EC2 Instance Savings Plans",
      "Standard Reserved Instances",
      "Spot Instances"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần cam kết theo $/giờ nhưng linh hoạt tối đa trên EC2, Lambda, Fargate, mọi family/Region.\n✓ Compute Savings Plans — đúng, linh hoạt nhất, phủ cả Lambda và Fargate, đổi family/size/OS/Region tự do.\n✗ EC2 Instance Savings Plans — chỉ cho EC2 trong một instance family/Region nhất định, không phủ Lambda/Fargate.\n✗ Standard Reserved Instances — giảm giá cao nhưng kém linh hoạt, không áp dụng cho Lambda/Fargate.\n✗ Spot Instances — không phải mô hình cam kết, có thể bị gián đoạn.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-059",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "In AWS, which direction of data transmission is typically NOT charged for data transfer?",
    "options": [
      "Inbound data coming into AWS from the Internet",
      "Outbound data from EC2 to the Internet",
      "Data transfer between two different Regions",
      "Data transfer between two Availability Zones in the same Region"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Data transfer IN từ Internet vào AWS nhìn chung miễn phí; phí phát sinh khi dữ liệu đi ra hoặc chuyển chéo.\n✓ Dữ liệu inbound từ Internet vào AWS — đúng, thường miễn phí.\n✗ Dữ liệu outbound ra Internet — bị tính phí data transfer out.\n✗ Dữ liệu chuyển giữa hai Region — bị tính phí inter-Region transfer.\n✗ Dữ liệu chuyển giữa hai AZ trong cùng Region — bị tính phí cross-AZ transfer.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-059",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty dùng AWS Organizations với consolidated billing. Một account mua một Reserved Instance nhưng tháng đó không dùng hết. Điều gì xảy ra với phần RI chưa dùng (giả định RI sharing đang bật)?",
    "options": [
      "Discount của RI được chia sẻ và áp dụng cho instance phù hợp ở các account khác trong Organization",
      "Phần RI chưa dùng bị mất hoàn toàn và không account nào được lợi",
      "RI tự động được hoàn tiền vào account quản lý (management account)",
      "RI chỉ áp dụng cho đúng account đã mua, không bao giờ chia sẻ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với consolidated billing và RI sharing (mặc định bật), discount RI chưa dùng áp dụng cho instance phù hợp ở account khác trong Organization.\n✓ Chia sẻ discount cho instance phù hợp ở account khác — đúng, đây là lợi ích của consolidated billing.\n✗ Bị mất hoàn toàn — sai, RI sharing tránh lãng phí này.\n✗ Tự động hoàn tiền vào management account — RI không hoàn tiền theo cơ chế này.\n✗ Chỉ áp dụng đúng account mua, không bao giờ chia sẻ — sai khi RI sharing được bật.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-060",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức cần chạy phần mềm có license tính theo physical core/socket và yêu cầu kiểm soát vị trí instance trên server vật lý cụ thể (host visibility) để tuân thủ. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Dedicated Hosts",
      "Dedicated Instances",
      "Spot Instances",
      "Reserved Instances"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần nhìn thấy socket/core và kiểm soát host vật lý cho BYOL theo socket/core và compliance.\n✓ Dedicated Hosts — đúng, cho host visibility (socket/core) phục vụ licensing và compliance.\n✗ Dedicated Instances — chạy trên phần cứng riêng nhưng KHÔNG cho visibility socket/core như Hosts.\n✗ Spot Instances — mô hình giá gián đoạn, không liên quan licensing theo core.\n✗ Reserved Instances — mô hình giá tiết kiệm, không cung cấp host visibility.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-060",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một công ty lưu trữ dữ liệu log trên Amazon S3. Phần lớn log hiếm khi được truy cập sau 30 ngày nhưng vẫn cần giữ lại nhiều năm cho audit, và khi cần truy xuất có thể chấp nhận chờ vài giờ. Những lựa chọn nào giúp TỐI ƯU CHI PHÍ lưu trữ? (Chọn 2)",
    "options": [
      "Tạo lifecycle policy chuyển object sang S3 Glacier Deep Archive sau 30 ngày",
      "Dùng S3 Intelligent-Tiering để tự động chuyển dữ liệu sang tier truy cập thấp khi access pattern không chắc chắn",
      "Giữ tất cả log ở S3 Standard mãi mãi để truy cập tức thì",
      "Lưu log trên Amazon EBS volume gắn vào một EC2 instance chạy 24/7",
      "Bật S3 Transfer Acceleration cho bucket log"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Dữ liệu hiếm truy cập, giữ lâu, chấp nhận chờ vài giờ phù hợp với archive giá rẻ; lifecycle hoặc Intelligent-Tiering đều giảm chi phí.\n✓ Lifecycle sang S3 Glacier Deep Archive sau 30 ngày — đúng, rẻ nhất cho archive dài hạn ít truy cập, chấp nhận retrieval vài giờ.\n✓ S3 Intelligent-Tiering — đúng, tự tối ưu khi access pattern không chắc chắn, không phí retrieval.\n✗ Giữ S3 Standard mãi mãi — đắt nhất cho dữ liệu hiếm truy cập.\n✗ EBS trên EC2 24/7 — tốn chi phí compute và storage, không phù hợp archive.\n✗ S3 Transfer Acceleration — tăng tốc upload/download, không giảm chi phí lưu trữ.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-061",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một startup muốn nhận cảnh báo qua email NGAY khi chi phí AWS thực tế trong tháng vượt 500 USD, đồng thời cảnh báo khi DỰ BÁO (forecast) chi phí cuối tháng vượt 800 USD. Công cụ nào phù hợp nhất?",
    "options": [
      "AWS Budgets",
      "AWS Cost Explorer",
      "AWS Pricing Calculator",
      "AWS Cost and Usage Report (CUR)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Budgets cho phép đặt ngưỡng chi phí và gửi alert khi vượt actual hoặc forecast.\n✓ AWS Budgets — đúng, hỗ trợ ngưỡng theo cả actual và forecasted cost, gửi cảnh báo email/SNS.\n✗ Cost Explorer — chỉ trực quan hóa và phân tích chi phí lịch sử/dự báo, không tự gửi alert khi vượt ngưỡng.\n✗ Pricing Calculator — ước tính chi phí TRƯỚC khi triển khai, không theo dõi chi tiêu thực tế.\n✗ Cost and Usage Report — báo cáo dữ liệu chi tiết nhất nhưng không tự cảnh báo theo ngưỡng.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-061",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trước khi triển khai một kiến trúc gồm EC2, RDS và S3, nhóm kỹ thuật cần lập dự toán chi phí hằng tháng để trình ban lãnh đạo phê duyệt ngân sách. Công cụ nào nên dùng?",
    "options": [
      "AWS Pricing Calculator",
      "AWS Cost Explorer",
      "AWS Budgets",
      "AWS Billing Dashboard"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pricing Calculator dùng để ước tính chi phí của kiến trúc dự kiến trước khi triển khai.\n✓ AWS Pricing Calculator — đúng, lập dự toán chi phí cho dịch vụ chưa chạy.\n✗ Cost Explorer — phân tích chi phí ĐÃ phát sinh, không dùng cho dịch vụ chưa triển khai.\n✗ AWS Budgets — đặt ngưỡng và cảnh báo chi tiêu thực tế, không phải lập dự toán kiến trúc mới.\n✗ Billing Dashboard — hiển thị hóa đơn hiện tại, không ước tính tương lai.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-062",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một doanh nghiệp có 6 AWS account riêng cho từng phòng ban, quản lý trong AWS Organizations với consolidated billing. Lợi ích chính về chi phí mà mô hình này mang lại là gì?",
    "options": [
      "Gộp mức sử dụng (aggregated usage) qua các account để hưởng volume discount và một hóa đơn duy nhất",
      "Tự động mua Reserved Instances cho tất cả account mà không cần cấu hình",
      "Loại bỏ hoàn toàn chi phí truyền dữ liệu giữa các account",
      "Cung cấp giảm giá 50% cố định cho mọi dịch vụ trong tổ chức"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Consolidated billing gộp usage để đạt bậc giá tốt hơn và một hóa đơn cho cả tổ chức.\n✓ Aggregated usage hưởng volume discount và một hóa đơn — đúng, đây là lợi ích cốt lõi của consolidated billing.\n✗ Tự động mua RI cho mọi account — sai, việc mua RI/Savings Plans vẫn cần cấu hình, chỉ là RI có thể chia sẻ (share) trong tổ chức.\n✗ Loại bỏ chi phí truyền dữ liệu — sai, consolidated billing không miễn phí data transfer giữa account.\n✗ Giảm 50% cố định — sai, không có mức giảm cố định như vậy.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-062",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một công ty muốn phân bổ chi phí AWS theo từng dự án và bộ phận để báo cáo nội bộ chi tiết. Họ cần dữ liệu chi phí ở mức chi tiết nhất, có thể truy vấn bằng SQL. Những hành động/công cụ nào phù hợp? (Chọn 2)",
    "options": [
      "Kích hoạt cost allocation tags (user-defined) và gắn tag cho tài nguyên theo dự án/bộ phận",
      "Bật AWS Cost and Usage Report (CUR) lưu vào S3 và truy vấn bằng Amazon Athena",
      "Dùng AWS Pricing Calculator để phân tách chi phí theo tag",
      "Dùng AWS Trusted Advisor để gán cost allocation tags tự động",
      "Tắt Billing Dashboard để buộc dữ liệu chuyển sang CUR"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Cost allocation tags phân loại chi phí, còn CUR cung cấp dữ liệu chi tiết nhất truy vấn được bằng Athena.\n✓ Kích hoạt cost allocation tags và gắn tag theo dự án/bộ phận — đúng, cho phép phân bổ chi phí theo nhãn.\n✓ Bật CUR lưu S3 và truy vấn bằng Athena — đúng, CUR là dữ liệu billing chi tiết nhất, query được bằng SQL.\n✗ Pricing Calculator phân tách chi phí theo tag — sai, công cụ này chỉ ước tính trước, không xử lý chi phí thực theo tag.\n✗ Trusted Advisor gán tag tự động — sai, Trusted Advisor đưa ra khuyến nghị, không tự gán cost allocation tags.\n✗ Tắt Billing Dashboard — sai, không liên quan và không cần thiết.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-063",
    "courseId": "CLF-C02",
    "lesson": "08-billing",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Giám đốc tài chính muốn xem biểu đồ trực quan về xu hướng chi phí EC2 trong 12 tháng qua, lọc theo region và phân tích nguyên nhân chi phí tăng đột biến. Công cụ nào đáp ứng tốt nhất?",
    "options": [
      "AWS Cost Explorer",
      "AWS Budgets",
      "AWS Pricing Calculator",
      "AWS Organizations"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cost Explorer cung cấp biểu đồ trực quan và bộ lọc để phân tích chi phí lịch sử.\n✓ AWS Cost Explorer — đúng, trực quan hóa, lọc theo service/region và phân tích xu hướng tới 12 tháng (và dự báo).\n✗ AWS Budgets — đặt ngưỡng và cảnh báo, không phải công cụ phân tích trực quan xu hướng.\n✗ Pricing Calculator — chỉ ước tính chi phí trước triển khai.\n✗ AWS Organizations — quản lý account và consolidated billing, không phải công cụ phân tích chi phí trực quan.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-063",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một startup mới chuyển sang AWS muốn có một kênh hỗ trợ kỹ thuật cho phép mở case khi gặp lỗi triển khai, nhưng ngân sách rất hạn chế nên chỉ cần phản hồi trong giờ làm việc và không cần hỗ trợ 24/7. Support plan nào RẺ NHẤT vẫn cho phép mở technical support case?",
    "options": [
      "AWS Basic Support",
      "AWS Developer Support",
      "AWS Business Support",
      "AWS Enterprise Support"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Developer Support là gói rẻ nhất có quyền mở technical support case (giờ làm việc, qua email/web).\n✓ AWS Developer Support — đúng, có technical support trong giờ làm việc, chi phí thấp nhất trong các gói trả phí.\n✗ AWS Basic Support — miễn phí nhưng KHÔNG cho mở technical support case (chỉ billing/account và tài liệu).\n✗ AWS Business Support — có hỗ trợ 24/7 nhưng đắt hơn, vượt nhu cầu.\n✗ AWS Enterprise Support — đắt nhất, dành cho workload quan trọng quy mô lớn.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-064",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty chạy production workload trên AWS cần truy cập một Technical Account Manager (TAM) và được hướng dẫn proactive, nhưng họ muốn chi phí thấp hơn gói Enterprise đầy đủ vì chưa phải doanh nghiệp lớn. Support plan nào phù hợp NHẤT?",
    "options": [
      "AWS Business Support",
      "AWS Enterprise On-Ramp",
      "AWS Developer Support",
      "AWS Enterprise Support"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Enterprise On-Ramp cung cấp quyền truy cập TAM (theo pool) và hướng dẫn proactive với chi phí thấp hơn Enterprise đầy đủ.\n✓ AWS Enterprise On-Ramp — đúng, có TAM theo pool, nằm giữa Business và Enterprise về giá.\n✗ AWS Business Support — KHÔNG có TAM, chỉ có Cloud Support Engineers.\n✗ AWS Developer Support — không có TAM, không khuyến nghị cho production.\n✗ AWS Enterprise Support — có TAM chuyên trách (designated) nhưng đắt nhất, vượt nhu cầu nêu ra.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-064",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The operations team wants to receive personalized notifications about scheduled maintenance events and issues that directly impact their specific AWS resources (for example, an EC2 instance about to be retired). Which tool meets this need?",
    "options": [
      "AWS Trusted Advisor",
      "AWS Health Dashboard (Your account health)",
      "AWS re:Post",
      "AWS Cost Explorer"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "AWS Health Dashboard (Your account health) cung cấp cảnh báo cá nhân hóa về sự kiện ảnh hưởng đến tài nguyên cụ thể của tài khoản.\n✓ AWS Health Dashboard — đúng, hiển thị sự kiện và bảo trì ảnh hưởng trực tiếp đến tài nguyên của bạn.\n✗ AWS Trusted Advisor — đưa khuyến nghị tối ưu cost/security/performance/fault tolerance, không cảnh báo sự kiện bảo trì tài nguyên.\n✗ AWS re:Post — diễn đàn hỏi đáp cộng đồng, không phải cảnh báo sự kiện.\n✗ AWS Cost Explorer — phân tích chi phí, không liên quan health.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "clf-m4-065",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một kiến trúc sư muốn dùng AWS Trusted Advisor để rà soát môi trường. NHỮNG hạng mục kiểm tra nào nằm trong năm trụ cột (categories) của Trusted Advisor? (Chọn 2)",
    "options": [
      "Cost optimization (tối ưu chi phí)",
      "Security (bảo mật)",
      "Viết mã ứng dụng tự động",
      "Đào tạo chứng chỉ cho nhân viên",
      "Đàm phán hợp đồng Enterprise Agreement"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Trusted Advisor có 5 nhóm: cost optimization, security, fault tolerance, performance, service limits (service quotas).\n✓ Cost optimization — đúng, là một category chính.\n✓ Security — đúng, là một category chính.\n✗ Viết mã ứng dụng tự động — Trusted Advisor không sinh code.\n✗ Đào tạo chứng chỉ — không phải chức năng của Trusted Advisor.\n✗ Đàm phán hợp đồng — không liên quan đến Trusted Advisor.",
    "domain": 4,
    "mock": 4
  },
  {
    "id": "clf-m5-065",
    "courseId": "CLF-C02",
    "lesson": "19-other-services",
    "certifications": [
      "CLF-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một doanh nghiệp lớn cần một đội ngũ chuyên gia của CHÍNH AWS tham gia trực tiếp cùng đội nội bộ trong một dự án di chuyển (migration) phức tạp kéo dài nhiều tháng, hỗ trợ thiết kế và triển khai theo hợp đồng có tính phí. Tài nguyên AWS nào phù hợp NHẤT?",
    "options": [
      "AWS Professional Services",
      "AWS Partner Network (APN)",
      "AWS re:Post",
      "AWS Trusted Advisor"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Professional Services là tổ chức tư vấn của chính AWS, làm việc trực tiếp cùng khách hàng trong các dự án có tính phí.\n✓ AWS Professional Services — đúng, đội chuyên gia của AWS tham gia trực tiếp dự án migration phức tạp.\n✗ AWS Partner Network (APN) — mạng lưới đối tác bên thứ ba, không phải đội của chính AWS.\n✗ AWS re:Post — diễn đàn hỏi đáp cộng đồng miễn phí, không phải engagement dự án.\n✗ AWS Trusted Advisor — công cụ khuyến nghị tự động, không cung cấp nhân sự.",
    "domain": 4,
    "mock": 5
  },
  {
    "id": "dva-m1-001",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Developer dùng BatchWriteItem để nạp dữ liệu hàng loạt vào DynamoDB. Những phát biểu nào về BatchWriteItem là ĐÚNG? (Chọn 2)",
    "options": [
      "Mỗi lệnh BatchWriteItem ghi tối đa 25 item (Put/Delete)",
      "Response có thể chứa UnprocessedItems mà ứng dụng phải tự retry, nên dùng exponential backoff",
      "BatchWriteItem là atomic: nếu một item fail thì toàn bộ batch rollback",
      "BatchWriteItem hỗ trợ UpdateItem để cập nhật từng phần thuộc tính",
      "BatchWriteItem tự động đảm bảo strongly consistent cho mọi write"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "BatchWriteItem giới hạn 25 item/lần, không atomic, và có thể trả về UnprocessedItems cần tự retry.\n✓ Tối đa 25 item mỗi lệnh — đúng (và ≤16MB).\n✓ UnprocessedItems phải tự retry với exponential backoff — đúng, một số item có thể chưa xử lý do throttle.\n✗ Atomic/rollback toàn batch — sai, BatchWriteItem KHÔNG atomic; muốn all-or-nothing dùng Transactions.\n✗ Hỗ trợ UpdateItem — sai, batch chỉ Put/Delete, không có UpdateItem.\n✗ Tự đảm bảo strongly consistent — sai, consistency là khái niệm của read; phát biểu này không hợp lệ cho write batch.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-002",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một GET endpoint trên REST API trả về danh mục sản phẩm ít thay đổi và đang chịu tải đọc rất cao gây độ trễ và chi phí backend. Bạn muốn giảm tải và tăng tốc bằng API Gateway caching. Những phát biểu nào ĐÚNG về caching này? (Chọn 2)",
    "options": [
      "Caching được bật ở cấp STAGE và có thể cấu hình TTL cho từng method",
      "Có thể chọn các request parameter làm cache key để phân biệt các response khác nhau",
      "Caching chỉ áp dụng cho method POST và PUT, không áp dụng cho GET",
      "API Gateway cache là miễn phí và tự bật mặc định cho mọi stage",
      "Cache được lưu phía client trình duyệt, không nằm ở API Gateway"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "API Gateway cache bật ở stage, có TTL và hỗ trợ cache key dựa trên parameter; cache này có tính phí.\n✓ Bật ở cấp stage và TTL theo method: caching cấu hình trên stage (kích thước cache) và TTL có thể override cho từng method.\n✓ Cache key theo parameter: chọn query string/header/path làm cache key để phân tách các kết quả khác nhau.\n✗ Chỉ cho POST/PUT: ngược lại, caching hữu ích nhất cho GET (đọc nhiều, ít đổi).\n✗ Miễn phí và mặc định: cache có tính phí theo dung lượng và phải bật thủ công.\n✗ Lưu ở trình duyệt: cache nằm tại API Gateway, không phải client.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-003",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer gọi DynamoDB Query với FilterExpression và Limit. Ở lần gọi đầu, response trả về Items rỗng nhưng vẫn có LastEvaluatedKey. Code hiện tại dừng vòng lặp ngay khi Items rỗng. Vấn đề là gì?",
    "options": [
      "Một page có thể rỗng do filter/limit nhưng vẫn còn dữ liệu; phải tiếp tục đến khi không còn LastEvaluatedKey",
      "Items rỗng nghĩa là bảng không có bản ghi nào khớp; dừng là đúng",
      "LastEvaluatedKey rỗng là tín hiệu duy nhất để dừng; Items không liên quan",
      "FilterExpression không bao giờ trả về page rỗng nên đây là lỗi của SDK"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DynamoDB áp Limit trên số item đọc được trước khi áp FilterExpression nên một page có thể rỗng items mà vẫn còn LastEvaluatedKey; điều kiện dừng đúng là khi LastEvaluatedKey vắng mặt.\n✓ Page rỗng do filter/limit là bình thường; phải lặp tới khi không còn LastEvaluatedKey.\n✗ Items rỗng KHÔNG đồng nghĩa hết dữ liệu vì còn LastEvaluatedKey.\n✗ Việc dừng dựa trên LastEvaluatedKey là đúng, nhưng nói Items không liên quan là sai logic vì chính lỗi ở đây là code dừng theo Items rỗng.\n✗ FilterExpression hoàn toàn có thể tạo page rỗng; đây không phải lỗi SDK.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-004",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng có Lambda function được gọi đột biến tới 3000 concurrent invocation, làm cạn account concurrency và khiến các function quan trọng khác bị throttle. Đội muốn giới hạn function này tối đa 500 concurrent và đảm bảo các function khác luôn còn capacity. Cấu hình nào đúng?",
    "options": [
      "Đặt reserved concurrency = 500 cho function này",
      "Đặt provisioned concurrency = 500 cho function này",
      "Tăng account-level concurrency limit lên 3000 qua Service Quotas",
      "Bật Lambda Destinations để chuyển hướng các invocation vượt quá 500"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Reserved concurrency vừa đặt trần (cap) cho function vừa dành riêng phần concurrency đó khỏi pool chung.\n✓ Reserved concurrency = 500 giới hạn function ở 500 đồng thời và bảo vệ pool chung cho các function khác.\n✗ Provisioned concurrency giữ ấm môi trường (chống cold start) nhưng không phải là cơ chế đặt trần để bảo vệ function khác khỏi throttle.\n✗ Tăng account limit không ngăn function này tiếp tục ăn hết capacity.\n✗ Destinations định tuyến kết quả thành công/thất bại của async invocation, không phải để giới hạn concurrency.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-005",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The development team wants to integrate a third-party monitoring tool to collect telemetry and push Lambda function logs to their own observability system, running as an independent process alongside the runtime without modifying function code. Which Lambda mechanism is most appropriate?",
    "options": [
      "Lambda Extension (external extension) running in parallel within the same execution environment",
      "Lambda Layer containing logging libraries",
      "Lambda Destinations on-success",
      "Environment variable pointing to the observability system's endpoint"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda Extensions chạy như tiến trình riêng trong execution environment, dùng cho telemetry/observability mà không sửa code.\n✓ External Extension tích hợp công cụ giám sát/telemetry, chạy độc lập bên cạnh runtime, không cần sửa code function.\n✗ Layer chỉ chia sẻ code/dependency, không chạy như tiến trình song song.\n✗ Destinations định tuyến kết quả async invocation, không phải thu thập telemetry liên tục.\n✗ Env var chỉ là cấu hình, không phải cơ chế chạy agent giám sát.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-006",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần một authorizer cho API Gateway dựa trên một header Authorization tùy chỉnh chứa token bên thứ ba (không phải Cognito), với logic xác thực riêng và muốn cache kết quả phân quyền để giảm số lần gọi. Cách nào phù hợp nhất?",
    "options": [
      "Lambda authorizer kiểu TOKEN, dùng Identity Source là header Authorization và bật TTL cache cho policy trả về",
      "Cognito user pool authorizer trỏ tới một user pool trống",
      "IAM authorizer và yêu cầu client ký SigV4",
      "Resource policy chặn theo IP và bỏ qua token"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Token bên thứ ba với logic tùy chỉnh cần Lambda authorizer kiểu TOKEN, có thể cache theo identity source.\n✓ Lambda authorizer TOKEN và cache: nhận token từ header, chạy logic verify tùy chỉnh, trả về IAM policy; bật authorization caching (TTL) theo identity source để giảm số lần gọi.\n✗ Cognito authorizer: chỉ verify JWT của user pool, không xử lý token bên thứ ba.\n✗ IAM authorizer: yêu cầu credential AWS, không phù hợp token bên thứ ba.\n✗ Resource policy theo IP: không xác thực token, không đáp ứng yêu cầu.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-007",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng DynamoDB dùng partition key là 'status' với chỉ 3 giá trị (ACTIVE, PENDING, CLOSED). Đa số traffic dồn vào ACTIVE. Ứng dụng bị throttle dù tổng provisioned capacity vẫn còn dư nhiều. Nguyên nhân gốc và cách khắc phục tốt nhất là gì?",
    "options": [
      "Hot partition do partition key cardinality thấp; thiết kế lại key có cardinality cao, phân bố đều",
      "Thiếu RCU/WCU; tăng provisioned capacity của bảng lên gấp đôi",
      "Region quá tải; chuyển bảng sang Region khác",
      "Thiếu index; thêm một LSI trên thuộc tính status"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Throttle dù còn capacity là dấu hiệu kinh điển của hot partition do key cardinality thấp.\n✓ Hot partition do cardinality thấp, redesign key phân bố đều — đúng, traffic dồn vào ít giá trị PK gây nóng một partition.\n✗ Tăng provisioned capacity — capacity tổng còn dư nên vấn đề không nằm ở thiếu RCU/WCU; tăng thêm vẫn nóng partition đó.\n✗ Chuyển Region — không liên quan, vấn đề là thiết kế key.\n✗ Thêm LSI trên status — LSI dùng chung PK với bảng, không giải quyết hot partition mà còn tệ hơn.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-008",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một consumer poll SQS bằng short polling (WaitTimeSeconds=0) và đang phát sinh rất nhiều empty receive (phản hồi rỗng), làm tăng chi phí API call. Cách tối ưu nhất để giảm số empty response và giảm chi phí là gì?",
    "options": [
      "Bật long polling bằng cách đặt ReceiveMessageWaitTimeSeconds lên 20",
      "Tăng visibility timeout của queue lên 12 giờ",
      "Chuyển queue từ Standard sang FIFO",
      "Giảm MaxNumberOfMessages mỗi lần receive xuống 1"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Long polling chờ tới khi có message hoặc hết thời gian (tối đa 20s) thay vì trả về ngay → giảm empty receive và chi phí.\n✓ Đặt ReceiveMessageWaitTimeSeconds=20: bật long polling, giảm số phản hồi rỗng, giảm chi phí polling và latency.\n✗ Tăng visibility timeout: chỉ ảnh hưởng thời gian message bị ẩn sau khi nhận, không liên quan tới empty receive.\n✗ Chuyển sang FIFO: thay đổi thứ tự/dedup chứ không giải quyết empty polling.\n✗ Giảm MaxNumberOfMessages: làm tệ hơn, vẫn poll rỗng và còn ít message mỗi lần.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-009",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng gọi ec2.run_instances trong một workflow có retry. Đôi khi do timeout mạng, request được gửi lại và tạo ra nhiều instance trùng nhau ngoài ý muốn. Cách khắc phục đúng và rẻ nhất là gì?",
    "options": [
      "Truyền cùng một ClientToken (idempotency token) cố định cho các lần retry của cùng thao tác",
      "Sinh một ClientToken (UUID) mới cho mỗi lần retry để phân biệt request",
      "Tắt toàn bộ retry của SDK để không bao giờ gọi lại RunInstances",
      "Sau khi tạo, gọi DescribeInstances rồi terminate các instance dư thừa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RunInstances hỗ trợ ClientToken làm idempotency key; gọi lại với cùng token sẽ không tạo thêm instance.\n✓ Giữ cố định cùng ClientToken khi retry đảm bảo idempotent, không tạo trùng.\n✗ Sinh token mới mỗi lần retry khiến mỗi request bị coi là khác nhau, vẫn tạo trùng.\n✗ Tắt retry làm mất khả năng phục hồi khi lỗi tạm thời, không phải giải pháp tốt.\n✗ Tạo rồi dọn dẹp thủ công tốn kém, dễ race condition và lãng phí tài nguyên.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-010",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function có độ trễ p99 cao do cold start nghiêm trọng, ảnh hưởng tới API đồng bộ phục vụ người dùng. Yêu cầu là giảm cold start một cách đáng tin cậy cho lưu lượng dự đoán được, chấp nhận chi phí. Giải pháp tối ưu là gì?",
    "options": [
      "Cấu hình Provisioned Concurrency và dùng Application Auto Scaling để scale theo lịch lưu lượng",
      "Tăng reserved concurrency của function lên mức tối đa",
      "Tăng memory-size lên 10240 MB để loại bỏ cold start",
      "Chuyển deployment package từ container image sang .zip để tránh cold start hoàn toàn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Provisioned Concurrency giữ sẵn các execution environment đã khởi tạo, loại bỏ cold start cho số lượng đã cấu hình.\n✓ Provisioned Concurrency kết hợp Application Auto Scaling theo lịch xử lý lưu lượng dự đoán được, giảm cold start tin cậy.\n✗ Reserved concurrency chỉ giới hạn/dành chỗ concurrency, không giữ ấm môi trường nên không giảm cold start.\n✗ Tăng memory có thể rút ngắn init đôi chút nhưng không loại bỏ cold start.\n✗ Đổi sang .zip không loại bỏ cold start; cold start vẫn xảy ra với mọi định dạng package.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-011",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web chạy tại https://app.example.com gọi một REST API trên API Gateway tại một domain khác. Trình duyệt báo lỗi CORS khi gửi request POST với header Content-Type: application/json. Cách xử lý đúng tại API Gateway là gì?",
    "options": [
      "Bật CORS để API Gateway trả về header Access-Control-Allow-Origin và cấu hình method OPTIONS (preflight)",
      "Thêm header X-Forwarded-For vào tất cả response của method POST",
      "Chuyển integration từ Lambda proxy sang non-proxy để tự thêm header",
      "Bật API caching trên stage để cache kết quả preflight"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CORS yêu cầu API trả về các header Access-Control-Allow-* và xử lý preflight OPTIONS.\n✓ Bật CORS và OPTIONS: trình duyệt gửi preflight OPTIONS trước POST có Content-Type không phải dạng đơn giản; API Gateway cần trả Access-Control-Allow-Origin/Methods/Headers.\n✗ X-Forwarded-For: không liên quan tới CORS.\n✗ Đổi sang non-proxy: không bắt buộc; vấn đề là thiếu header CORS, không phải kiểu integration.\n✗ Caching: không giải quyết lỗi CORS.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-012",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer cần truy xuất tất cả order của một customer cụ thể, biết trước customerId là partition key của bảng Orders. Thao tác nào hiệu quả và tiết kiệm chi phí nhất?",
    "options": [
      "Query với KeyConditionExpression theo customerId",
      "Scan toàn bảng rồi filter theo customerId",
      "Scan với FilterExpression theo customerId",
      "BatchGetItem cho tất cả order của customer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Biết partition key → Query chỉ đọc đúng partition, nhanh và rẻ hơn Scan.\n✓ Query theo customerId — đúng, chỉ tiêu thụ RCU cho dữ liệu khớp key, hiệu quả nhất.\n✗ Scan rồi filter client-side — đọc toàn bảng, tốn RCU cho mọi item kể cả không liên quan.\n✗ Scan + FilterExpression — Filter áp dụng SAU khi đọc, vẫn tính RCU trên toàn bộ item quét qua.\n✗ BatchGetItem — yêu cầu biết full primary key (PK+SK) của từng item, không lấy được \"tất cả\" theo một customerId.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-013",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bảng cần phản ứng real-time mỗi khi item thay đổi: khi giá sản phẩm cập nhật, một Lambda phải tính delta giữa giá cũ và giá mới rồi gửi notification. Cấu hình DynamoDB Streams nào phù hợp nhất?",
    "options": [
      "Bật Streams với StreamViewType = NEW_AND_OLD_IMAGES và gắn Lambda trigger",
      "Bật Streams với StreamViewType = NEW_IMAGE và gắn Lambda trigger",
      "Bật Streams với StreamViewType = KEYS_ONLY và để Lambda GetItem giá cũ",
      "Dùng TTL để phát sinh sự kiện thay đổi giá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần cả giá cũ lẫn mới để tính delta → StreamViewType NEW_AND_OLD_IMAGES.\n✓ NEW_AND_OLD_IMAGES + Lambda — đúng, stream record chứa cả image cũ và mới, Lambda tính delta trực tiếp.\n✗ NEW_IMAGE — chỉ có giá mới, không có giá cũ để tính delta.\n✗ KEYS_ONLY + GetItem giá cũ — stream chỉ có key; GetItem chỉ lấy được giá hiện tại (mới), không lấy lại được giá cũ đã bị ghi đè.\n✗ TTL — chỉ để xóa item hết hạn, không phải cơ chế bắt sự kiện thay đổi giá.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-014",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The DevOps team needs to run a Lambda function to clean up temporary data daily at 02:00 UTC using a serverless model without managing a cron server. What is the correct and most optimal implementation approach?",
    "options": [
      "EventBridge rule (or EventBridge Scheduler) with cron expression cron(0 2 * * ? *) targeting Lambda",
      "SQS delay queue with DelaySeconds calculated to 24 hours to trigger Lambda",
      "Step Functions Standard with a Wait state for 24 hours looping infinitely",
      "SNS topic publishing periodically via a CloudWatch alarm"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chạy task theo lịch cron/rate serverless → EventBridge scheduled rule/Scheduler là cách chuẩn thay cho cron server.\n✓ EventBridge cron(0 2 * * ? *) target Lambda: đúng cú pháp lịch, serverless, không cần quản lý server.\n✗ SQS delay queue: DelaySeconds tối đa chỉ 15 phút, không thể lên lịch hằng ngày.\n✗ Step Functions Wait lặp: cồng kềnh, tốn state transition và không phải cách lên lịch chuẩn.\n✗ SNS + CloudWatch alarm: alarm dựa trên metric, không phải cơ chế lập lịch theo thời gian.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-015",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một request từ một thiết bị IoT tự ký SigV4 (không dùng SDK) tới một API liên tục thất bại với SignatureDoesNotMatch, dù access key, secret và region đều đúng và IAM policy cho phép. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "Đồng hồ hệ thống của thiết bị bị lệch (clock skew) khiến timestamp trong chữ ký không hợp lệ",
      "IAM policy thiếu quyền nên cần thêm Allow cho action tương ứng",
      "Resource đích không tồn tại nên trả về lỗi chữ ký",
      "Thiết bị thiếu AWS_SESSION_TOKEN nên không thể ký request"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SignatureDoesNotMatch là lỗi chữ ký, thường do clock skew làm timestamp dùng để tính chữ ký bị sai; nó khác AccessDenied (vấn đề IAM).\n✓ Đồng hồ lệch khiến timestamp trong canonical request sai, dẫn tới chữ ký không khớp.\n✗ Thiếu quyền IAM sẽ trả về AccessDenied, không phải SignatureDoesNotMatch.\n✗ Resource không tồn tại sẽ trả về lỗi ResourceNotFound/404, không phải lỗi chữ ký.\n✗ Session token chỉ cần với credentials tạm thời; thiếu nó (khi dùng key thường) không gây SignatureDoesNotMatch.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-016",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function dùng environment variable chứa API key. Yêu cầu bảo mật là key phải được mã hóa at rest bằng customer managed KMS key và chỉ giải mã trong runtime khi cần, đồng thời kiểm soát được ai giải mã được. Cách nào đúng nhất?",
    "options": [
      "Bật encryption helper với customer managed CMK cho env var, giải mã bằng KMS Decrypt trong code khi khởi tạo",
      "Để nguyên env var dạng plaintext vì Lambda đã tự mã hóa bằng AWS managed key mặc định",
      "Lưu API key trực tiếp trong deployment package code",
      "Đặt API key vào /tmp và mã hóa file bằng OpenSSL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda cho phép mã hóa env var bằng customer managed CMK và giải mã runtime qua KMS, kiểm soát qua key policy/IAM.\n✓ Encryption helper với CMK mã hóa giá trị, code gọi KMS Decrypt khi init; quyền decrypt được kiểm soát bằng KMS key policy/IAM.\n✗ AWS managed key mặc định mã hóa at rest nhưng giá trị hiển thị plaintext trong console và không kiểm soát decrypt theo CMK riêng.\n✗ Hardcode key trong code là anti-pattern, không mã hóa và khó xoay vòng.\n✗ /tmp là ephemeral và không cung cấp kiểm soát truy cập key tập trung.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-017",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function async đôi khi thất bại do lỗi tạm thời (throttle downstream). Đội muốn function tự retry các lỗi này một số lần và sau khi hết retry thì payload thất bại được lưu lại để điều tra, với cấu hình đơn giản. Lựa chọn nào đúng?",
    "options": [
      "Cấu hình Maximum Retry Attempts cho async invocation và đặt một on-failure Destination (hoặc DLQ) để lưu event thất bại",
      "Tăng reserved concurrency để loại bỏ mọi lỗi throttle",
      "Bật Provisioned Concurrency để tránh thất bại",
      "Đặt batch size nhỏ hơn để giảm lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Async invocation hỗ trợ cấu hình số lần retry và đích on-failure (Destination hoặc DLQ) để lưu event thất bại.\n✓ Maximum Retry Attempts xử lý lỗi tạm thời, on-failure Destination/DLQ lưu payload thất bại để điều tra.\n✗ Reserved concurrency không loại bỏ lỗi throttle ở downstream service.\n✗ Provisioned Concurrency chống cold start, không xử lý lỗi runtime.\n✗ Batch size không áp dụng cho async invocation đơn lẻ kiểu này.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-018",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong non-proxy integration của một REST API, bạn cần đọc một path parameter tên 'orderId' và một query string 'status' rồi đưa chúng vào JSON body gửi tới backend qua mapping template. Biểu thức VTL nào lấy đúng các giá trị này?",
    "options": [
      "$input.params('orderId') cho path và $input.params('status') cho query string",
      "$context.requestId cho path và $stageVariables.status cho query string",
      "$input.body.orderId và $input.body.status",
      "$util.escapeJavaScript($input.path) cho cả hai giá trị"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong VTL của API Gateway, $input.params('name') lấy được path, query và header parameter theo tên.\n✓ $input.params('orderId') / $input.params('status'): hàm params() truy xuất tham số từ path/query/header theo tên, đúng cho cả hai.\n✗ $context.requestId / $stageVariables: không phải tham số request của client; stageVariables là biến cấu hình stage.\n✗ $input.body.orderId: body không chứa path/query parameter.\n✗ $util.escapeJavaScript($input.path): escape là tiện ích chuỗi, không truy xuất tham số riêng lẻ.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-019",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng đọc nặng (read-heavy) cần giảm latency truy vấn DynamoDB từ vài mili giây xuống microsecond, và muốn thay đổi code tối thiểu vì API phải tương thích DynamoDB. Dữ liệu đọc chấp nhận eventually consistent. Giải pháp tối ưu là gì?",
    "options": [
      "Thêm DynamoDB Accelerator (DAX) trước bảng",
      "Triển khai Amazon ElastiCache for Redis với cache-aside thủ công",
      "Bật strongly consistent read trên mọi truy vấn",
      "Tăng provisioned RCU và bật Auto Scaling"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Read microsecond + API tương thích + code tối thiểu → DAX là lựa chọn chuẩn cho DynamoDB.\n✓ DAX — đúng, in-memory cache quản lý sẵn, API tương thích DynamoDB, đưa read xuống microsecond với code thay đổi tối thiểu.\n✗ ElastiCache Redis — phải tự viết logic cache-aside, nhiều code hơn DAX.\n✗ Strongly consistent read — không giảm latency, thậm chí tốn RCU gấp đôi và không dùng được cache.\n✗ Tăng RCU + Auto Scaling — cải thiện throughput chứ không hạ latency xuống microsecond.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-020",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một service xử lý đơn hàng nhận traffic dạng burst: vào giờ khuyến mãi, lượng request tăng đột biến rồi giảm. Đội phát triển muốn tách rời (decouple) producer và consumer, hấp thụ (buffer) các đỉnh tải để worker xử lý dần, đảm bảo không mất message. Mỗi message chỉ cần một consumer xử lý. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon SQS Standard queue",
      "Amazon SNS topic với nhiều email subscriber",
      "Amazon Kinesis Data Streams với nhiều shard",
      "AWS Step Functions Express workflow"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Use case kinh điển của SQS: decouple, buffer, hấp thụ burst, point-to-point (1 message → 1 consumer).\n✓ SQS Standard queue: hấp thụ đỉnh tải, worker kéo về xử lý dần, throughput gần như không giới hạn, đúng mô hình point-to-point.\n✗ SNS topic: là pub/sub fan-out (1 message → nhiều subscriber), không phải hàng đợi buffer cho 1 consumer.\n✗ Kinesis Data Streams: dành cho streaming real-time/replay nhiều consumer, phức tạp và đắt hơn cho nhu cầu buffer đơn thuần.\n✗ Step Functions Express: là orchestration workflow, không phải hàng đợi đệm message.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "dva-m1-021",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Bạn đang chọn giữa Secrets Manager và SSM Parameter Store cho các tình huống khác nhau. Những phát biểu nào ĐÚNG? (Chọn 2)",
    "options": [
      "Secrets Manager hỗ trợ automatic rotation tích hợp sẵn còn Parameter Store thì không có native rotation",
      "Parameter Store standard tier với String parameter không phát sinh phí lưu trữ, còn mỗi secret trong Secrets Manager bị tính phí hàng tháng",
      "Parameter Store SecureString không hỗ trợ mã hoá bằng KMS, chỉ Secrets Manager mới mã hoá được",
      "Secrets Manager không thể lưu giá trị tuỳ ý dạng key-value, chỉ lưu được database credential",
      "Parameter Store không cho phép tổ chức tham số theo cấu trúc phân cấp (hierarchy)"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "So sánh cốt lõi: rotation và chi phí là hai khác biệt quan trọng nhất.\n✓ Secrets Manager có native rotation qua Lambda; Parameter Store không có rotation tích hợp sẵn.\n✓ Parameter Store standard String miễn phí lưu trữ; Secrets Manager tính phí mỗi secret mỗi tháng cộng phí API.\n✗ SecureString chính là kiểu được mã hoá bằng KMS, nên phát biểu này sai.\n✗ Secrets Manager lưu được cả JSON key-value tuỳ ý, không giới hạn ở database credential.\n✗ Parameter Store hỗ trợ hierarchy bằng đường dẫn như /app/prod/db, nên phát biểu này sai.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-022",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một team triển khai REST API trên API Gateway với Cognito authorizer (User Pool). Khi client gọi API, họ cần biết phải gửi token nào và xác thực diễn ra ra sao. Những phát biểu nào sau đây ĐÚNG? (Chọn 2)",
    "options": [
      "Client gửi ID token hoặc access token của User Pool trong header Authorization để authorizer verify",
      "Cognito authorizer tự kiểm tra chữ ký, hết hạn và issuer của JWT mà không cần code",
      "Client phải gửi temporary AWS credentials từ Identity Pool vào header để được phép gọi",
      "Authorizer dùng refresh token để xác thực mỗi request đến API",
      "API Gateway gọi STS AssumeRole để xác thực JWT của người dùng"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Cognito authorizer nhận JWT (ID/access token) trong Authorization header và tự verify mà không cần code.\n✓ Gửi ID/access token để verify — đúng, đây là token User Pool dùng cho authorizer.\n✓ Authorizer tự verify chữ ký/hết hạn/issuer — đúng, tích hợp sẵn, không cần code.\n✗ Gửi temporary AWS credentials — đó là cho gọi dịch vụ AWS qua Identity Pool, không phải Cognito authorizer.\n✗ Dùng refresh token mỗi request — refresh token chỉ để đổi token mới, không gửi để xác thực API.\n✗ API Gateway gọi STS AssumeRole — verify JWT không liên quan STS AssumeRole.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-023",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một Identity Pool cho phép người dùng đăng nhập truy cập DynamoDB, nhưng yêu cầu mỗi người dùng chỉ được đọc/ghi các item có partition key bằng chính Cognito identity ID của họ (fine-grained access). Cách cấu hình đúng là gì?",
    "options": [
      "Dùng IAM policy với điều kiện ${cognito-identity.amazonaws.com:sub} so khớp với leading key của DynamoDB",
      "Viết Lambda authorizer kiểm tra identity ID trước mỗi request DynamoDB",
      "Tạo một IAM role riêng cho mỗi người dùng khi họ đăng ký",
      "Bật DynamoDB encryption at rest để cô lập dữ liệu từng người dùng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fine-grained access tới DynamoDB dùng IAM policy condition với biến cognito-identity sub khớp leading key.\n✓ Policy condition với cognito-identity sub — đúng, hạn chế truy cập theo identity ID ở partition key.\n✗ Lambda authorizer — dùng cho API Gateway, không kiểm soát truy cập trực tiếp item DynamoDB qua SDK.\n✗ Role riêng mỗi người dùng — không khả thi và không mở rộng được.\n✗ Encryption at rest — bảo vệ dữ liệu lúc lưu, không kiểm soát quyền truy cập theo người dùng.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-024",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty cần người dùng đăng nhập bằng Facebook và Google, sau đó nhận temporary AWS credentials để upload ảnh lên S3. Họ KHÔNG cần quản lý directory người dùng riêng (không cần username/password riêng). Kiến trúc tối ưu nhất là gì?",
    "options": [
      "Dùng Cognito Identity Pool với Facebook và Google làm external providers, không cần User Pool",
      "Bắt buộc tạo User Pool và liên kết mọi người dùng social vào đó trước",
      "Tạo IAM user cho mỗi người dùng social và cấp access key",
      "Dùng API Gateway Lambda authorizer để đổi social token lấy access key"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Identity Pool hỗ trợ trực tiếp social IdP để đổi token lấy AWS credentials, không bắt buộc User Pool.\n✓ Identity Pool với Facebook/Google trực tiếp — đúng, tối ưu khi chỉ cần AWS credentials, không cần directory.\n✗ Bắt buộc User Pool — không cần thiết khi không quản lý directory, thêm phức tạp.\n✗ IAM user + access key — credentials tĩnh, không mở rộng, kém an toàn.\n✗ Lambda authorizer đổi lấy access key — không phải cơ chế cấp AWS credentials, sai mô hình.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-025",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Account A sở hữu một KMS key. Một Lambda function ở Account B cần dùng key này để giải mã dữ liệu. Cần cấu hình gì để hoạt động?",
    "options": [
      "Chỉ cần thêm IAM policy cho role Lambda ở Account B với kms:Decrypt",
      "Chỉ cần sửa key policy ở Account A cho phép Account B",
      "Key policy ở Account A cho phép principal của Account B, VÀ IAM policy của role Lambda ở Account B cho phép gọi kms:Decrypt trên ARN key đó",
      "Tạo bản sao key trong Account B bằng GenerateDataKeyWithoutPlaintext"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Cross-account KMS cần cả hai phía: key policy bên chủ key và IAM policy bên dùng key.\n✓ Account A mở quyền trong key policy cho Account B, và Account B cấp IAM policy gọi kms:Decrypt trên ARN đầy đủ của key.\n✗ Chỉ IAM policy bên B mà key policy A chưa mở vẫn AccessDenied.\n✗ Chỉ key policy A mà role B không có IAM cho phép cũng AccessDenied.\n✗ Không thể sao chép một KMS key sang account khác như vậy.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-026",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer dùng AWS managed key (aws/s3) cho bucket nhưng sếp yêu cầu: (1) tự định nghĩa key policy chi tiết, (2) tự bật/tắt rotation, (3) cấp quyền cross-account. AWS managed key có đáp ứng được không, và nên làm gì?",
    "options": [
      "Có, AWS managed key cho phép sửa key policy và rotation tùy ý",
      "Không, AWS managed key không cho sửa key policy và không tự bật/tắt rotation; cần chuyển sang customer managed key",
      "Có, chỉ cần bật automatic rotation trên AWS managed key",
      "Không, nhưng giải pháp là dùng AWS owned key thay thế"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "AWS managed key bị hạn chế: không sửa key policy, không tự điều khiển rotation.\n✓ Cần customer managed key để tự định nghĩa key policy, kiểm soát rotation và cấp quyền cross-account.\n✗ AWS managed key không cho sửa key policy và rotation cố định mỗi năm.\n✗ Không thể bật/tắt rotation tùy ý trên AWS managed key.\n✗ AWS owned key thậm chí không thấy được trong account, càng không kiểm soát được.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-027",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần lưu một chuỗi cấu hình dài 8 KB trong SSM Parameter Store. Tier standard chỉ hỗ trợ tối đa 4 KB mỗi parameter. Cần làm gì?",
    "options": [
      "Dùng advanced tier của Parameter Store, hỗ trợ giá trị tới 8 KB",
      "Tách chuỗi thành hai standard parameter và tự ghép lại trong code",
      "Chuyển sang dùng environment variable của Lambda thay vì Parameter Store",
      "Nén chuỗi rồi lưu base64 trong một standard String parameter"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Advanced tier hỗ trợ giá trị tới 8 KB và nhiều parameter hơn, có tính phí.\n✓ Advanced tier nâng giới hạn kích thước lên 8 KB, đúng nhu cầu, đổi lại phát sinh phí.\n✗ Tách parameter rồi tự ghép gây phức tạp và dễ lỗi không cần thiết.\n✗ Env var của Lambda có giới hạn riêng và không phù hợp lưu cấu hình chia sẻ.\n✗ Nén/base64 có thể vượt giới hạn 4 KB tuỳ dữ liệu và làm khó đọc/bảo trì.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-028",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một backend microservice nhận request kèm JWT từ Cognito User Pool và cần tự verify chữ ký của token trong code (không qua API Gateway). Developer cần lấy public key để kiểm tra chữ ký. Nguồn nào cung cấp các khóa này?",
    "options": [
      "JWKS endpoint của User Pool tại .../.well-known/jwks.json",
      "AWS KMS customer managed key của tài khoản",
      "AWS Secrets Manager nơi lưu khóa private của User Pool",
      "STS endpoint trả về khóa công khai của session"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito User Pool công bố public key tại JWKS endpoint để bên thứ ba verify chữ ký JWT.\n✓ JWKS endpoint — đúng, chứa các public key (kid) để kiểm tra chữ ký token.\n✗ KMS key — không lưu khóa ký JWT của User Pool.\n✗ Secrets Manager — User Pool quản lý khóa private nội bộ, không expose ra Secrets Manager.\n✗ STS endpoint — cấp credentials, không cung cấp khóa verify JWT.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-029",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong khi gỡ lỗi, developer thấy API Gateway trả về 401 Unauthorized cho mọi request dù client gửi JWT hợp lệ trong header. Nguyên nhân phổ biến nào sau đây nên kiểm tra ĐẦU TIÊN với Cognito authorizer?",
    "options": [
      "Token được gửi sai header hoặc sai tên (mặc định authorizer mong đợi header Authorization)",
      "User Pool đã bị xóa hoàn toàn khỏi Region",
      "DynamoDB table thiếu encryption at rest",
      "S3 bucket policy chặn API Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lỗi 401 thường do token không gửi đúng header mà authorizer mong đợi (mặc định là Authorization).\n✓ Sai header/tên token — đúng, nguyên nhân phổ biến nhất gây 401 dù token hợp lệ.\n✗ User Pool bị xóa — sẽ gây lỗi cấu hình rõ ràng hơn, không phải nguyên nhân phổ biến nhất.\n✗ DynamoDB encryption — không liên quan xác thực API.\n✗ S3 bucket policy — không liên quan đến authorizer JWT của API Gateway.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-030",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Dữ liệu được mã hóa bằng KMS ở us-east-1 và lưu vào DynamoDB Global Table replicate sang eu-west-1. Ứng dụng ở eu-west-1 cần giải mã nhanh mà không gọi cross-Region tới us-east-1. Giải pháp nào đúng?",
    "options": [
      "Dùng single-Region KMS key bình thường, KMS tự xử lý cross-Region",
      "Tạo multi-Region KMS key với replica ở cả us-east-1 và eu-west-1",
      "Bật automatic rotation để key dùng được ở nhiều Region",
      "Dùng SSE-C để client tự mang key qua các Region"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Ciphertext của single-Region key không dùng được ở Region khác; cần multi-Region key.\n✓ Multi-Region key có cùng key ID và cùng material ở nhiều Region; ciphertext mã hóa ở us-east-1 decrypt được ở eu-west-1 không cần gọi lại Region gốc.\n✗ Single-Region key không cho decrypt ciphertext ở Region khác.\n✗ Rotation không biến key single-Region thành multi-Region.\n✗ SSE-C là phương án S3, không giải quyết bản chất multi-Region của KMS key.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-031",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer lưu API key của bên thứ ba trong SSM Parameter Store dạng SecureString. Khi đọc qua AWS CLI bằng lệnh get-parameter, giá trị trả về vẫn ở dạng mã hoá (ciphertext). Cần làm gì để nhận giá trị plaintext?",
    "options": [
      "Thêm tham số --with-decryption vào lệnh get-parameter",
      "Đổi parameter sang kiểu String thay vì SecureString",
      "Cấp quyền kms:Encrypt cho IAM role đang dùng",
      "Bật parameter policy với Expiration để buộc giải mã"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SecureString chỉ được giải mã khi yêu cầu --with-decryption và caller có quyền kms:Decrypt.\n✓ Cờ --with-decryption yêu cầu Parameter Store giải mã giá trị bằng KMS trước khi trả về.\n✗ Đổi sang String làm mất tính bảo mật, không phải cách đúng để lấy plaintext an toàn.\n✗ Giải mã cần kms:Decrypt chứ không phải kms:Encrypt.\n✗ Parameter policy điều khiển vòng đời (expiration, notification), không liên quan đến giải mã.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-032",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một RDS MySQL database được quản lý credential bằng Secrets Manager với rotation 30 ngày dùng rotation function 'single user'. Sau lần rotate đầu tiên, ứng dụng báo lỗi xác thực. Nguyên nhân khả năng cao nhất?",
    "options": [
      "Ứng dụng đang cache password cũ và không gọi lại GetSecretValue sau khi rotate",
      "Rotation single user không được Secrets Manager hỗ trợ cho RDS MySQL",
      "Secrets Manager đã xoá secret sau khi rotate nên không còn giá trị để đọc",
      "RDS không cho phép thay đổi password qua Secrets Manager rotation function"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sau rotation, password trong DB đã đổi; ứng dụng cache password cũ sẽ xác thực thất bại.\n✓ Ứng dụng cache password cũ và không refresh từ Secrets Manager là nguyên nhân phổ biến gây lỗi sau rotation.\n✗ Rotation single-user được hỗ trợ cho RDS; đây không phải nguyên nhân.\n✗ Secrets Manager không xoá secret sau rotation; nó cập nhật phiên bản AWSCURRENT.\n✗ Rotation function chính là cơ chế đổi password trên RDS, nên phát biểu này sai.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-033",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng dùng Cognito Identity Pool với cả authenticated và unauthenticated (guest) access. Người dùng đăng nhập (authenticated) được phép ghi vào bucket S3, còn khách (guest) chỉ được đọc một số object công khai. Cách triển khai đúng theo best practice là gì?",
    "options": [
      "Gán hai IAM role riêng cho authenticated role và unauthenticated role với policy phù hợp",
      "Dùng chung một IAM role cho cả hai và kiểm tra trong code ứng dụng",
      "Gán policy trực tiếp lên Identity Pool thay vì dùng IAM role",
      "Tắt unauthenticated access và cấp access key tĩnh cho khách"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Identity Pool hỗ trợ tách biệt authenticated role và unauthenticated role, mỗi role có quyền riêng.\n✓ Hai IAM role riêng — đúng, authenticated role có quyền ghi, unauthenticated role chỉ đọc.\n✗ Một role chung + kiểm tra trong code — kém an toàn, vi phạm least privilege và dễ bị lạm dụng.\n✗ Policy trực tiếp lên Identity Pool — Identity Pool ánh xạ tới IAM role, không gắn policy trực tiếp kiểu đó.\n✗ Access key tĩnh — chống lại nguyên tắc dùng temporary credentials, không an toàn.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-034",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng dùng Cognito User Pool để đăng nhập, sau đó cần gọi cả (1) một REST API tùy biến của công ty và (2) ghi file trực tiếp lên S3 bằng SDK. Cách kết hợp đúng các thành phần Cognito là gì?",
    "options": [
      "Gửi JWT của User Pool tới REST API (qua Cognito authorizer); đồng thời đưa JWT vào Identity Pool để lấy AWS credentials gọi S3",
      "Dùng access token của User Pool trực tiếp làm AWS credentials để gọi S3",
      "Dùng temporary AWS credentials từ Identity Pool làm Bearer token cho REST API",
      "Dùng refresh token cho cả gọi REST API và gọi S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "JWT dùng cho API (authentication); Identity Pool đổi JWT lấy AWS credentials để gọi S3.\n✓ JWT tới API + Identity Pool cho S3 — đúng, tách đúng hai luồng token và credentials.\n✗ Access token làm AWS credentials — sai, JWT không phải AWS credentials để gọi S3.\n✗ AWS credentials làm Bearer token — sai, credentials không phải JWT để gọi API qua Cognito authorizer.\n✗ Refresh token cho cả hai — refresh token chỉ để đổi token mới, không gọi API hay S3.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-035",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng phân tích lưu lượng cao ghi hàng nghìn object/giây vào S3 với SSE-KMS và bắt đầu bị throttle vì quá nhiều lời gọi KMS. Cách giảm số lần gọi KMS hiệu quả nhất là gì?",
    "options": [
      "Chuyển toàn bộ sang SSE-C để không gọi KMS nữa",
      "Bật S3 Bucket Keys để dùng một data key cấp bucket, giảm số lần gọi KMS",
      "Tắt mã hóa cho bucket để loại bỏ KMS",
      "Tăng giới hạn 4 KB của KMS Encrypt API"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Mỗi PUT/GET SSE-KMS gọi KMS; S3 Bucket Keys giảm đáng kể số lần gọi.\n✓ S3 Bucket Keys tạo một data key cấp bucket, giảm số lần gọi GenerateDataKey/Decrypt tới KMS, hạ throttle và chi phí.\n✗ SSE-C tự giữ key mỗi request, đổi mô hình bảo mật và không phải giải pháp throttle KMS mong muốn.\n✗ Tắt mã hóa vi phạm yêu cầu bảo mật.\n✗ Giới hạn 4 KB là cố định, không tăng được và không liên quan throttle SSE-KMS.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-036",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng cần lưu connection string của database, gồm username và password, và yêu cầu password được tự động xoay (rotate) mỗi 30 ngày mà không cần viết code lập lịch. Dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "AWS Secrets Manager với automatic rotation bật cho secret",
      "SSM Parameter Store với SecureString và một CloudWatch Events rule tự viết",
      "S3 bucket được mã hoá bằng SSE-KMS lưu file JSON chứa credential",
      "DynamoDB table với encryption at rest lưu username và password"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager hỗ trợ tự động xoay credential bằng Lambda rotation function tích hợp sẵn, không cần tự viết lịch.\n✓ Secrets Manager có automatic rotation native, lý tưởng cho database credential cần xoay định kỳ.\n✗ Parameter Store không có auto-rotation native, phải tự xây dựng toàn bộ logic xoay.\n✗ S3 chỉ lưu trữ và mã hoá, không có cơ chế xoay credential tự động.\n✗ DynamoDB là database, không cung cấp tính năng quản lý hay xoay secret.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-037",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "An application storing medical records (PHI) must comply with HIPAA. Application logs accidentally record both patient insurance numbers and diagnoses in CloudWatch Logs. What is the best way to reduce the risk of PHI disclosure in logs?",
    "options": [
      "Apply data masking/sanitization at the application layer before logging, and enable CloudWatch Logs data protection policy to mask sensitive data",
      "Disable logging entirely to prevent any data from being recorded",
      "Move all logs to a public S3 bucket with versioning",
      "Increase the retention of the log group to unlimited for easier auditing later"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "PHI cần được mask trước khi ghi (application-level sanitization) kết hợp CloudWatch Logs data protection để phát hiện/che.\n✓ Mask ở tầng ứng dụng kết hợp CloudWatch Logs data protection policy là cách phòng thủ nhiều lớp đúng chuẩn.\n✗ Tắt logging làm mất khả năng quan sát và audit cần thiết cho vận hành/tuân thủ.\n✗ S3 public bucket khiến PHI bị phơi bày rộng, vi phạm HIPAA nghiêm trọng.\n✗ Tăng retention không giải quyết vấn đề lộ dữ liệu, chỉ kéo dài thời gian dữ liệu nhạy cảm tồn tại.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "dva-m1-038",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một developer cần truyền thông tin của một resource AWS::SQS::Queue (logical ID MyQueue) sang nơi khác trong CÙNG template. Những phát biểu nào về intrinsic functions là ĐÚNG? (Chọn 3)",
    "options": [
      "Ref MyQueue trả về URL của queue",
      "Fn::GetAtt MyQueue.Arn trả về ARN của queue",
      "Ref MyQueue trả về ARN của queue",
      "Fn::GetAtt MyQueue.QueueName phải dùng Fn::ImportValue để hoạt động",
      "Fn::Sub có thể nhúng ${MyQueue} để chèn giá trị Ref của queue vào chuỗi"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Mỗi resource định nghĩa giá trị riêng cho Ref và các thuộc tính GetAtt; Fn::Sub có thể nội suy Ref.\n✓ Với AWS::SQS::Queue, Ref trả về queue URL\n✓ GetAtt MyQueue.Arn trả về ARN của queue\n✓ Fn::Sub cho phép nhúng ${MyQueue} tương đương Ref bên trong chuỗi\n✗ Ref của SQS queue trả về URL, không phải ARN\n✗ GetAtt trong cùng template không cần Fn::ImportValue; ImportValue chỉ dùng cho cross-stack export",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-039",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Team đang chọn cách tổ chức hạ tầng CloudFormation. Những phát biểu nào về nested stacks và cross-stack export là ĐÚNG? (Chọn 3)",
    "options": [
      "Nested stack được tham chiếu bằng resource AWS::CloudFormation::Stack trỏ tới template con trên S3",
      "Cross-stack reference dùng Outputs với Export ở stack nguồn và Fn::ImportValue ở stack đích",
      "Nested stack chỉ chia sẻ giá trị qua Fn::ImportValue giữa các cây stack độc lập",
      "Cross-stack export cho phép import giá trị giữa các region khác nhau tự do",
      "Không thể xóa stack nguồn khi giá trị export của nó đang được stack khác import"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Nested stack và cross-stack export là hai mô hình tái sử dụng khác nhau với ràng buộc riêng.\n✓ Nested stack khai báo bằng AWS::CloudFormation::Stack với TemplateURL trỏ template con trên S3\n✓ Cross-stack dùng Export trong Outputs và Fn::ImportValue để nhập ở stack khác\n✓ CloudFormation chặn xóa/thay đổi export đang được stack khác import\n✗ Nested stack truyền giá trị qua Parameters/Outputs của stack con, không phải Fn::ImportValue\n✗ Export chỉ dùng được trong cùng region và account, không xuyên region tự do",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-040",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Developer muốn test một Lambda function được định nghĩa trong SAM template ngay trên máy local, kích hoạt bằng một event JSON mẫu, trước khi deploy lên AWS. Lệnh nào phù hợp nhất?",
    "options": [
      "sam local invoke với tham số --event",
      "sam deploy --guided rồi gọi từ console",
      "aws lambda invoke trỏ tới function ARN",
      "sam build --use-container"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SAM CLI hỗ trợ chạy và test function cục bộ trong container Docker mô phỏng môi trường Lambda.\n✓ sam local invoke chạy function trên máy local với event JSON truyền qua --event\n✗ sam deploy --guided thực sự triển khai lên AWS, không phải test local\n✗ aws lambda invoke yêu cầu function đã được deploy lên AWS\n✗ sam build chỉ build artifact, không thực thi function với event",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-041",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong một CodePipeline, developer muốn output (mã nguồn đã được build) từ stage Build được dùng làm input cho stage Deploy. Cơ chế nào của CodePipeline cho phép truyền dữ liệu giữa các stage?",
    "options": [
      "Output artifacts và input artifacts được lưu trong artifact store (S3)",
      "Biến môi trường được export trực tiếp giữa các action",
      "CodePipeline tự sao chép file qua EFS được mount vào mọi stage",
      "Truyền qua tham số SSM Parameter Store giữa các stage"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodePipeline dùng artifact store để chuyển dữ liệu giữa các stage.\n✓ Mỗi action có output artifact và input artifact; CodePipeline lưu chúng trong artifact store S3 và truyền giữa các stage\n✗ Env vars không phải cơ chế truyền artifact giữa các stage trong CodePipeline\n✗ CodePipeline không mount EFS để chia sẻ file giữa stage\n✗ SSM Parameter Store dùng cho cấu hình/tham số, không phải để truyền artifact build",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-042",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer cần triển khai phiên bản mới của ứng dụng lên môi trường staging nội bộ. Yêu cầu đơn giản: nhanh nhất có thể, chấp nhận downtime ngắn vì không có người dùng thật. Chiến lược deployment nào phù hợp nhất?",
    "options": [
      "All-at-once: cập nhật toàn bộ instance cùng lúc",
      "Blue/green: tạo môi trường mới hoàn toàn rồi chuyển traffic",
      "Canary 10% trong 10 phút rồi mới chuyển hết",
      "Rolling with additional batch để giữ nguyên capacity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Môi trường staging không người dùng thật, ưu tiên tốc độ và chấp nhận downtime.\n✓ All-at-once nhanh nhất, đơn giản nhất nhưng có downtime ngắn, phù hợp cho staging.\n✗ Blue/green tốn tài nguyên gấp đôi và phức tạp, không cần cho staging.\n✗ Canary kéo dài thời gian triển khai không cần thiết.\n✗ Rolling with additional batch giữ capacity nhưng chậm hơn và không cần khi chấp nhận downtime.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-043",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer triển khai ứng dụng web lên Elastic Beanstalk với 8 EC2 instances. Yêu cầu: trong suốt quá trình deploy version mới, ứng dụng phải LUÔN duy trì đủ 8 instances phục vụ (không được giảm capacity) và KHÔNG có downtime, đồng thời chi phí tăng thêm tạm thời được chấp nhận. Deployment policy nào phù hợp nhất nếu muốn chi phí thấp HƠN immutable nhưng vẫn không giảm capacity?",
    "options": [
      "Rolling with additional batch",
      "Rolling",
      "All at once",
      "Immutable"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần duy trì đủ full capacity (không giảm) và zero-downtime, chi phí thấp hơn immutable.\n✓ Rolling with additional batch: thêm 1 batch instances mới trước, nên trong lúc deploy luôn giữ đủ capacity gốc, chi phí chỉ tăng 1 batch.\n✗ Rolling: deploy theo batch tại chỗ nên capacity bị GIẢM tạm thời trong mỗi batch.\n✗ All at once: deploy đồng loạt, gây downtime hoàn toàn.\n✗ Immutable: zero-downtime và giữ capacity nhưng nhân đôi instances nên chi phí cao hơn yêu cầu.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-044",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong một CloudFormation template, developer cần truyền tên (resource name) của một S3 bucket vừa tạo vào biến môi trường của Lambda. Với AWS::S3::Bucket, hàm intrinsic nào trả về chính tên bucket?",
    "options": [
      "Ref đối với logical ID của bucket",
      "Fn::GetAtt với thuộc tính Arn",
      "Fn::ImportValue với tên bucket",
      "Fn::FindInMap với mapping bucket"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi resource quy định giá trị mà Ref và GetAtt trả về; với AWS::S3::Bucket, Ref trả về tên bucket.\n✓ Ref logical ID của AWS::S3::Bucket trả về bucket name\n✗ GetAtt Arn trả về ARN đầy đủ (arn:aws:s3:::...) chứ không phải chỉ tên\n✗ ImportValue dùng để nhập giá trị đã export từ stack khác, không liên quan ở đây\n✗ FindInMap tra giá trị tĩnh trong section Mappings, không lấy thuộc tính runtime của resource",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-045",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer dùng AWS CDK (TypeScript) để định nghĩa hạ tầng. Trong CI/CD, bước nào tạo ra CloudFormation template từ code CDK để sau đó có thể deploy?",
    "options": [
      "cdk synth biên dịch constructs thành CloudFormation template",
      "cdk deploy trực tiếp gọi SAM Transform",
      "cdk bootstrap sinh ra template ứng dụng",
      "sam build chuyển CDK app thành template"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CDK định nghĩa hạ tầng bằng code rồi tổng hợp ra CloudFormation.\n✓ cdk synth biên dịch các construct thành CloudFormation template (trong cdk.out)\n✗ cdk deploy thực hiện synth rồi triển khai, nhưng không dùng SAM Transform; bước sinh template là synth\n✗ cdk bootstrap chuẩn bị môi trường (S3/ECR/role) cho CDK, không sinh template ứng dụng\n✗ sam build dành cho SAM project, không xử lý CDK app",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-046",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "CodeBuild của một dự án cần truy cập một mật khẩu database để chạy integration test, nhưng không được hardcode trong buildspec.yml. Cách bảo mật được khuyến nghị để inject giá trị này vào biến môi trường của build là gì?",
    "options": [
      "Tham chiếu Secrets Manager (hoặc SSM Parameter Store) qua mục env/secrets-manager hoặc env/parameter-store trong buildspec.yml",
      "Ghi mật khẩu plaintext vào phần env/variables trong buildspec.yml",
      "Lưu mật khẩu trong appspec.yml và để CodeBuild đọc",
      "Đính kèm mật khẩu vào output artifact để stage sau đọc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeBuild có thể lấy secret runtime từ Secrets Manager/Parameter Store.\n✓ Khai báo trong env/secrets-manager hoặc env/parameter-store của buildspec để inject giá trị bí mật vào biến môi trường mà không hardcode\n✗ Ghi plaintext vào env/variables làm lộ secret trong source, không an toàn\n✗ appspec.yml thuộc CodeDeploy, không phải nơi CodeBuild đọc env var\n✗ Đưa secret vào artifact làm rò rỉ và sai mục đích của artifact",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-047",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một REST API trên API Gateway có stage PROD trỏ tới Lambda alias. Khi triển khai version mới, developer muốn dùng stage variable để dễ dàng trỏ stage tới một Lambda alias khác mà không phải sửa code integration. Cách cấu hình đúng là gì?",
    "options": [
      "Dùng stage variable trong ARN integration kiểu Function:${stageVariables.lambdaAlias} và đặt giá trị biến ở từng stage",
      "Hard-code version number của Lambda trực tiếp trong integration request",
      "Tạo một API Gateway riêng cho mỗi alias Lambda",
      "Bật caching ở stage để tự động chuyển sang alias mới"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Stage variables giúp cùng một định nghĩa API trỏ tới các target khác nhau theo stage.\n✓ Tham chiếu ${stageVariables.lambdaAlias} trong ARN integration cho phép mỗi stage trỏ tới alias mong muốn mà không sửa code.\n✗ Hard-code version làm mất tính linh hoạt và phải redeploy khi đổi.\n✗ Tạo API riêng cho mỗi alias là dư thừa và khó quản lý.\n✗ Caching không liên quan tới việc chọn alias đích.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-048",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The DevOps team wants each new version deployment to Elastic Beanstalk to be performed on a COMPLETELY new set of instances in a temporary Auto Scaling group; if health checks fail, they want to rollback extremely fast by terminating the new group without affecting running instances. They accept the temporary double cost. Which policy best meets the requirements?",
    "options": [
      "Immutable",
      "Rolling with additional batch",
      "All at once",
      "Rolling"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu: instances hoàn toàn mới trong ASG tạm thời, rollback an toàn nhất, chấp nhận double capacity.\n✓ Immutable: tạo full set instances mới trong group tạm; lỗi thì chỉ cần xóa instances mới, instances cũ nguyên vẹn nên rollback an toàn nhất.\n✗ Rolling with additional batch: vẫn deploy in-place trên một phần instances cũ, không tạo full set mới.\n✗ All at once: thay thế tại chỗ, không an toàn, có downtime.\n✗ Rolling: deploy in-place trên instances hiện có, rollback phức tạp hơn.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-049",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Stack A export tên của một VPC Subnet bằng Outputs với Export Name. Stack B (triển khai sau, độc lập) cần dùng subnet này. Trong template Stack B, cách đúng để tham chiếu giá trị đã export là gì?",
    "options": [
      "Fn::ImportValue với tên export do Stack A khai báo",
      "Fn::GetAtt trỏ tới resource subnet của Stack A",
      "Ref tới logical ID của subnet trong Stack A",
      "Định nghĩa subnet là nested stack của Stack A bên trong Stack B"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cross-stack reference dùng cơ chế Export (ở stack nguồn) và Fn::ImportValue (ở stack đích).\n✓ Fn::ImportValue lấy giá trị đã được export từ stack khác trong cùng region/account\n✗ GetAtt chỉ truy cập resource trong cùng template, không xuyên stack\n✗ Ref chỉ tham chiếu resource/parameter trong cùng template\n✗ Nested stack là quan hệ cha-con trong cùng deployment, khác hoàn toàn cross-stack export",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-050",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer cần định nghĩa các lệnh build chạy trong CodeBuild cho một ứng dụng Node.js (cài dependency, chạy test, đóng gói artifact). File cấu hình nào CodeBuild sử dụng và đặt mặc định ở đâu?",
    "options": [
      "buildspec.yml ở thư mục gốc của source repository",
      "appspec.yml ở thư mục gốc của source repository",
      "buildspec.json trong S3 bucket của pipeline",
      "Dockerfile ở thư mục gốc của source repository"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeBuild đọc buildspec để biết các lệnh build theo từng phase.\n✓ buildspec.yml đặt mặc định ở root của source là file CodeBuild dùng để định nghĩa phases và artifacts\n✗ appspec.yml là file của CodeDeploy, không phải CodeBuild\n✗ CodeBuild dùng định dạng YAML (buildspec.yml/.yaml), không phải buildspec.json\n✗ Dockerfile chỉ build image, không định nghĩa các phase build của CodeBuild",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-051",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một pipeline có stage Build (CodeBuild) tạo file đóng gói, và stage Deploy (CodeDeploy lên EC2). Deployment liên tục thất bại với lỗi không tìm thấy appspec.yml. Source code build ra một thư mục con 'dist/' chứa app và appspec.yml nằm trong dist/. Nguyên nhân và cách khắc phục đúng nhất là gì?",
    "options": [
      "appspec.yml phải nằm ở root của input artifact mà CodeDeploy nhận; cấu hình artifacts base-directory hoặc files trong buildspec để appspec.yml ở gốc artifact",
      "CodeDeploy không hỗ trợ appspec.yml từ CodeBuild; phải tự upload thủ công lên S3",
      "Phải đổi tên appspec.yml thành buildspec.yml để CodeDeploy nhận diện",
      "Thêm hook DownloadBundle vào appspec.yml để chỉ định lại vị trí file"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeDeploy yêu cầu appspec.yml ở root của bundle (artifact) nhận được.\n✓ Khi appspec.yml nằm trong dist/, nó không ở root artifact; dùng artifacts base-directory hoặc files trong buildspec để đưa appspec.yml ra gốc artifact là cách sửa đúng\n✗ CodeDeploy hỗ trợ nhận artifact từ pipeline; không cần upload thủ công\n✗ buildspec.yml và appspec.yml có vai trò khác nhau, đổi tên là sai hoàn toàn\n✗ DownloadBundle không phải hook bạn cấu hình để định vị appspec.yml",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-052",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The DevOps team wants to deploy an ECS service with the ability to: run new and old task sets in parallel, test using a test listener before switching production traffic, and be able to rollback instantly. Which solution is correct?",
    "options": [
      "ECS blue/green deployment via CodeDeploy with production and test listeners on Application Load Balancer",
      "ECS rolling update (default deployment type of ECS service)",
      "Write your own script to manually change the desired count of two ECS services",
      "Use AWS Batch to run the new task set in parallel"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu test listener và chuyển traffic tức thì là đặc trưng của blue/green qua CodeDeploy.\n✓ ECS blue/green với CodeDeploy tạo replacement task set, cho test qua test listener rồi reroute production listener, rollback nhanh.\n✗ ECS rolling update thay thế task tại chỗ, không có test listener riêng và không reroute tức thì.\n✗ Script thủ công dễ lỗi, không có cơ chế rollback tự động.\n✗ AWS Batch dùng cho batch jobs, không phải triển khai service.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-053",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng xử lý job nền đọc message từ Amazon SQS, không cần phục vụ HTTP request từ người dùng cuối. Team muốn dùng Elastic Beanstalk để quản lý. Cấu hình environment nào phù hợp?",
    "options": [
      "Worker environment tier (Beanstalk tự cài daemon đọc SQS và POST vào ứng dụng)",
      "Web server environment tier với một Application Load Balancer public",
      "Web server environment tier với CNAME swap",
      "Tạo một environment tier tùy chỉnh tên là 'queue tier'"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ứng dụng xử lý job nền từ SQS, không phục vụ HTTP trực tiếp cho user.\n✓ Worker environment tier: Beanstalk chạy một SQS daemon đọc message và POST tới đường dẫn cục bộ của ứng dụng, đúng cho workload xử lý nền.\n✗ Web server tier với ALB public: dành cho ứng dụng nhận HTTP request từ client, không tối ưu cho consumer SQS.\n✗ Web server tier với CNAME swap: CNAME swap là kỹ thuật blue/green cho web tier, không liên quan workload SQS.\n✗ 'queue tier' tùy chỉnh: Beanstalk chỉ có hai tier là web server và worker, không có tier tùy chỉnh này.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "dva-m1-054",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một team muốn: (1) đếm số dòng OutOfMemory trong log để dựng alarm, và (2) khi alarm kích hoạt thì gửi thông báo email cho on-call. Những thành phần nào cần dùng? (Chọn 2)",
    "options": [
      "Metric filter với pattern OutOfMemory để phát một CloudWatch metric",
      "CloudWatch alarm với action trỏ tới một SNS topic (subscriber là email)",
      "Subscription filter đẩy log sang Firehose để đếm OutOfMemory",
      "Logs Insights query chạy theo lịch để tạo metric thường trực",
      "Composite alarm bắt buộc để gửi được email qua SNS"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Đếm pattern trong log để alarm dùng metric filter; gửi email dùng alarm action tới SNS.\n✓ Metric filter biến số dòng OutOfMemory thành metric để alarm theo dõi.\n✓ Alarm action trỏ tới SNS topic có subscriber email gửi thông báo cho on-call.\n✗ Firehose dùng để nạp/lưu log, không phải để đếm pattern tạo metric.\n✗ Logs Insights là query ad-hoc, không tạo metric thường trực để alarm.\n✗ Composite alarm không bắt buộc; một metric alarm đơn đã đủ gửi SNS.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-055",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một SNS topic gửi mọi thông báo đơn hàng tới nhiều SQS queue, nhưng mỗi consumer chỉ quan tâm một loại sự kiện (ví dụ chỉ order_cancelled). Hiện consumer phải nhận tất cả rồi tự lọc, gây xử lý thừa và tốn chi phí. Những hành động nào giúp giảm xử lý thừa? (Chọn 2)",
    "options": [
      "Gắn subscription filter policy trên mỗi SQS subscription để chỉ nhận message khớp thuộc tính",
      "Thêm message attributes vào message publish để filter policy đánh giá được",
      "Tăng visibility timeout của các queue để consumer có thêm thời gian lọc",
      "Bật long polling trên các queue để giảm số message nhận về",
      "Chuyển sang FIFO topic để message tự động được phân loại theo nội dung"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "SNS message filtering cho phép mỗi subscription chỉ nhận message khớp filter policy, loại bỏ xử lý thừa ngay tại nguồn.\n✓ Filter policy trên subscription — đúng, chỉ chuyển message phù hợp tới từng queue.\n✓ Thêm message attributes khi publish — đúng, filter policy mặc định đánh giá dựa trên message attributes nên cần đính kèm chúng.\n✗ Tăng visibility timeout — chỉ ảnh hưởng thời gian message bị ẩn khi đang xử lý, không giảm lượng message thừa.\n✗ Long polling — giảm empty receive/chi phí polling chứ không lọc bỏ message không liên quan.\n✗ FIFO topic — đảm bảo thứ tự/loại trùng, không tự phân loại theo nội dung.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-056",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Team muốn stream toàn bộ log của một log group gần real-time vào S3 để lưu trữ và phân tích sau, KHÔNG muốn viết code xử lý log. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Subscription filter trỏ tới Kinesis Data Firehose delivery stream ghi vào S3",
      "Subscription filter trỏ tới một Lambda function ghi từng batch vào S3",
      "Metric filter trỏ tới S3",
      "Logs Insights query xuất kết quả tự động vào S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firehose là đường nạp dữ liệu vào S3/OpenSearch/Redshift mà không cần code.\n✓ Subscription filter → Firehose → S3 là cấu hình managed, không cần viết code xử lý.\n✗ Subscription filter → Lambda yêu cầu viết code xử lý batch.\n✗ Metric filter chỉ tạo metric, không stream log và không trỏ tới S3.\n✗ Logs Insights là công cụ query ad-hoc, không phải pipeline lưu trữ liên tục.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-057",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng chạy trên EC2 đã được instrument bằng X-Ray SDK. Code chạy bình thường nhưng không có trace nào xuất hiện trong X-Ray console. CloudWatch Logs cho thấy lỗi 'unable to send segments'. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "X-Ray daemon không chạy trên EC2 nên SDK không có nơi gửi segment qua UDP",
      "Sampling rule đang đặt fixed rate = 100% nên X-Ray từ chối nhận trace",
      "Annotation chưa được khai báo nên X-Ray không tạo segment",
      "Service map chưa được tạo thủ công trong console trước khi gửi trace"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trên EC2, SDK gửi segment qua UDP tới X-Ray daemon; thiếu daemon là nguyên nhân phổ biến gây mất trace.\n✓ Không có daemon chạy thì SDK không gửi được segment, gây lỗi 'unable to send segments'.\n✗ Sampling 100% chỉ làm gửi nhiều hơn, không gây từ chối.\n✗ Annotation không liên quan tới việc tạo/gửi segment.\n✗ Service map được tự sinh từ trace, không cần tạo thủ công.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-058",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một hàm Lambda xử lý ảnh đang chạy chậm và developer nghi ngờ bị giới hạn CPU. Trong Lambda, mối quan hệ giữa memory và CPU được cấu hình như thế nào, và công cụ nào giúp tìm cấu hình memory tối ưu về chi phí/hiệu năng?",
    "options": [
      "CPU được cấp tỉ lệ thuận theo memory; dùng AWS Lambda Power Tuning để tìm memory tối ưu",
      "CPU cấu hình độc lập với memory qua tham số vCPU; dùng Compute Optimizer để chỉnh vCPU",
      "Memory không ảnh hưởng CPU; chỉ tăng timeout để hàm có thêm thời gian CPU",
      "CPU tỉ lệ nghịch với memory; giảm memory để được nhiều CPU hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong Lambda bạn chỉ chọn memory, còn CPU (và network) được cấp tỉ lệ thuận theo lượng memory đó.\n✓ CPU tỉ lệ thuận memory + Power Tuning — đúng, tăng memory cũng tăng CPU; AWS Lambda Power Tuning dùng Step Functions để so sánh nhiều mức memory về chi phí và thời gian.\n✗ Cấu hình vCPU độc lập — Lambda không cho đặt vCPU riêng.\n✗ Memory không ảnh hưởng CPU — sai, CPU gắn liền với memory.\n✗ CPU tỉ lệ nghịch — sai hoàn toàn, giảm memory làm giảm CPU.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-059",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Team phát hiện một log group đang lưu log vĩnh viễn (Never expire) và chi phí lưu trữ tăng dần. Cách xử lý tối ưu, ít tốn công nhất là gì?",
    "options": [
      "Đặt retention policy cho log group (ví dụ retention-in-days = 30)",
      "Viết một Lambda chạy theo lịch để gọi API xóa các log event cũ",
      "Tạo metric filter để tự động xóa log khi vượt ngưỡng dung lượng",
      "Bật detailed monitoring để CloudWatch tự dọn log cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Retention policy là cơ chế gốc để giới hạn thời gian giữ log.\n✓ Đặt retention-in-days giúp CloudWatch tự xóa log quá hạn, không cần code.\n✗ Tự viết Lambda xóa log là cách thủ công, kém tối ưu và dễ lỗi.\n✗ Metric filter chỉ phát sinh metric từ log, không xóa log.\n✗ Detailed monitoring không liên quan đến dọn dẹp log.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-060",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một pipeline cần stream log gần real-time với throughput rất cao, nhiều consumer độc lập đọc song song và cần khả năng replay/giữ thứ tự để xử lý phức tạp. Destination nào của subscription filter phù hợp nhất?",
    "options": [
      "Kinesis Data Streams",
      "Kinesis Data Firehose",
      "Một Lambda function duy nhất",
      "S3 trực tiếp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kinesis Data Streams hợp với throughput cao, nhiều consumer, replay/ordering.\n✓ Kinesis Data Streams hỗ trợ nhiều consumer song song, replay theo shard và giữ thứ tự.\n✗ Firehose là delivery managed vào S3/OpenSearch, không cho nhiều consumer độc lập replay.\n✗ Một Lambda đơn không đáp ứng nhiều consumer độc lập và replay.\n✗ Subscription filter không trỏ trực tiếp tới S3; phải qua Firehose.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-061",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer thấy chi phí X-Ray tăng cao vì một endpoint health-check nội bộ tạo hàng triệu trace mỗi ngày, trong khi các endpoint nghiệp vụ khác cần giữ tỉ lệ lấy mẫu cao. Giải pháp tối ưu nhất là gì?",
    "options": [
      "Tạo sampling rule riêng cho path health-check với reservoir và fixed rate rất thấp (gần 0), giữ default rule cho phần còn lại",
      "Tắt instrument X-Ray trên toàn bộ ứng dụng để loại trace health-check",
      "Chuyển mọi annotation của health-check thành metadata để giảm chi phí",
      "Định tuyến health-check qua một X-Ray daemon riêng với buffer nhỏ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sampling rule có thể match theo thuộc tính như URL path, cho phép lấy mẫu khác nhau theo endpoint.\n✓ Rule riêng match path health-check với rate gần 0 cắt phần lớn trace tốn kém, vẫn giữ rule mặc định cho nghiệp vụ.\n✗ Tắt toàn bộ instrument làm mất trace nghiệp vụ cần thiết.\n✗ Đổi annotation sang metadata không giảm số trace.\n✗ Daemon riêng không thay đổi tỉ lệ lấy mẫu theo endpoint.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-062",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhóm cần lớp caching in-memory hỗ trợ các kiểu dữ liệu phong phú (sorted set, list), replication, persistence và pub/sub cho một bảng xếp hạng (leaderboard) thời gian thực. Engine ElastiCache nào phù hợp nhất?",
    "options": [
      "ElastiCache for Redis",
      "ElastiCache for Memcached",
      "DynamoDB DAX",
      "Amazon CloudFront"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu sorted set, replication, persistence, pub/sub là đặc trưng của Redis.\n✓ ElastiCache for Redis — đúng, hỗ trợ kiểu dữ liệu phong phú (sorted set lý tưởng cho leaderboard), replication, persistence và pub/sub.\n✗ Memcached — chỉ là cache key-value đơn giản, đa luồng, không có sorted set/persistence/replication/pub-sub.\n✗ DAX — chỉ là cache cho DynamoDB, không phải cache đa năng với các kiểu dữ liệu trên.\n✗ CloudFront — là CDN cache nội dung HTTP, không phải in-memory data store.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-063",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Team cần monitor memory utilization (% RAM đã dùng) của các EC2 instance và đẩy lên CloudWatch để dựng alarm. Cách đúng là gì?",
    "options": [
      "Cài CloudWatch Agent (unified agent) trên instance để thu thập và đẩy memory metric",
      "Bật detailed monitoring để CloudWatch lấy memory metric mỗi 1 phút",
      "Dùng metric MemoryUtilization có sẵn trong namespace AWS/EC2",
      "Tạo metric filter trên log group của instance để trích memory"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EC2 không tự gửi memory/disk usage vì hypervisor không nhìn thấy bên trong OS.\n✓ CloudWatch Agent thu thập memory/disk từ trong OS và đẩy lên CloudWatch.\n✗ Detailed monitoring chỉ đưa metric có sẵn (CPU, network...) về 1 phút, KHÔNG thêm memory.\n✗ Namespace AWS/EC2 không có MemoryUtilization mặc định.\n✗ Metric filter chỉ trích từ log đã có, instance không tự log memory.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-064",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong một trace, developer muốn đính kèm toàn bộ payload JSON của một request (object lớn, nhiều trường) để debug nhưng KHÔNG cần dùng để filter. Cách lưu phù hợp nhất là gì?",
    "options": [
      "Ghi payload dưới dạng metadata bằng put_metadata",
      "Ghi payload dưới dạng annotation bằng put_annotation",
      "Đặt toàn bộ payload làm trace ID",
      "Lưu payload vào sampling rule để hiển thị kèm trace"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Metadata để đính kèm dữ liệu chi tiết không cần filter; annotation chỉ nên dùng cho giá trị filter được.\n✓ Metadata phù hợp lưu object JSON lớn dùng để debug, không bị index.\n✗ Annotation chỉ nhận kiểu giá trị đơn giản và để filter, không hợp cho payload lớn.\n✗ Trace ID là định danh, không dùng lưu payload.\n✗ Sampling rule kiểm soát lấy mẫu, không lưu dữ liệu hiển thị.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m1-065",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer triển khai ElastiCache theo chiến lược lazy loading (cache-aside) cho dữ liệu sản phẩm. Vấn đề nào là nhược điểm CỐ HỮU của lazy loading mà developer cần lường trước?",
    "options": [
      "Dữ liệu trong cache có thể cũ (stale) vì cache chỉ cập nhật khi có cache miss",
      "Mọi lần ghi đều phải ghi đồng thời vào cache làm tăng độ trễ ghi",
      "Cache luôn chứa cả dữ liệu không bao giờ được đọc, gây lãng phí bộ nhớ",
      "Không thể đặt TTL cho các key trong ElastiCache"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lazy loading chỉ nạp dữ liệu vào cache khi xảy ra cache miss, nên không tự cập nhật khi dữ liệu nguồn thay đổi.\n✓ Dữ liệu có thể stale — đúng, vì cache chỉ refresh khi miss; thường kết hợp TTL để hạn chế.\n✗ Mọi lần ghi vào cache — đó là đặc điểm của write-through, không phải lazy loading.\n✗ Cache chứa dữ liệu không bao giờ đọc — đó là nhược điểm của write-through (ghi cả dữ liệu chưa được đọc).\n✗ Không thể đặt TTL — sai, ElastiCache hỗ trợ TTL.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "dva-m2-001",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "The development team needs to ensure idempotency when clients might retry operations. For each service, which mechanism is the correct way to prevent duplicate processing/creation? (Select 2)",
    "options": [
      "DynamoDB: use conditional write with ConditionExpression attribute_not_exists(orderId)",
      "SQS FIFO: use MessageDeduplicationId to deduplicate messages within a 5-minute window",
      "S3: use ContinuationToken to ensure PutObject does not create duplicate objects",
      "EC2: increase max_attempts in retry config to ensure RunInstances only creates one instance",
      "Lambda: enable adaptive retry mode to make synchronous invoke idempotent"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Idempotency đạt được bằng cơ chế dedup/điều kiện phù hợp từng service: conditional write cho DynamoDB và deduplication ID cho SQS FIFO.\n✓ ConditionExpression attribute_not_exists đảm bảo chỉ ghi khi item chưa tồn tại, chống tạo trùng trong DynamoDB.\n✓ MessageDeduplicationId của SQS FIFO loại bỏ message trùng trong cửa sổ 5 phút.\n✗ ContinuationToken là cơ chế phân trang của S3, không liên quan idempotency của PutObject.\n✗ Tăng max_attempts chỉ tăng số lần retry, càng dễ tạo trùng nếu không dùng ClientToken.\n✗ adaptive retry mode chỉ điều tiết tốc độ/retry, không làm invoke trở nên idempotent.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-002",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer chạy ứng dụng Python trên EC2 instance đã gắn instance profile có quyền truy cập S3. Tuy nhiên, trên instance này cũng có biến môi trường AWS_ACCESS_KEY_ID và AWS_SECRET_ACCESS_KEY (của một IAM user khác) được set sẵn. Khi code khởi tạo client mà KHÔNG truyền key, SDK sẽ dùng credentials nào?",
    "options": [
      "Credentials từ environment variables (IAM user)",
      "Credentials từ instance profile (IMDS) vì code chạy trên EC2",
      "SDK ném lỗi vì có hai nguồn credentials xung đột",
      "Credentials trong file ~/.aws/credentials nếu tồn tại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Credential provider chain dừng ngay khi tìm thấy nguồn đầu tiên; environment variables đứng TRƯỚC instance profile/IMDS nên thắng.\n✓ Environment variables được duyệt trước IMDS trong chain nên SDK dùng key của IAM user, bỏ qua instance role.\n✗ Instance profile (IMDS) đứng gần cuối chain, chỉ được dùng khi các nguồn trước không có.\n✗ Chain không báo lỗi xung đột; nó chỉ lấy nguồn đầu tiên tìm thấy.\n✗ Shared credentials file đứng sau env vars, không được ưu tiên ở đây.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-003",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hàm Lambda gọi EC2 DescribeInstances và xử lý lỗi. Trong một burst, nó nhận lỗi RequestLimitExceeded. Đồng thời ở một nhánh khác, nó nhận ValidationException do tham số sai. Cách xử lý đúng cho từng loại lỗi là gì?",
    "options": [
      "RequestLimitExceeded: retry với exponential backoff + jitter; ValidationException: KHÔNG retry, sửa tham số",
      "Cả hai đều retry với exponential backoff vì đều là lỗi tạm thời",
      "Cả hai đều KHÔNG retry vì đều là lỗi 4xx phía client",
      "RequestLimitExceeded: sửa code ngay; ValidationException: retry vì sẽ tự khỏi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RequestLimitExceeded là throttling (retryable) trong khi ValidationException là lỗi client non-retryable cần sửa request.\n✓ Throttling thì retry với backoff + jitter; lỗi validation thì sửa tham số chứ retry vô ích.\n✗ ValidationException không tự khỏi khi retry vì tham số vẫn sai.\n✗ Không phải mọi lỗi 4xx đều non-retryable; throttling là 4xx đặc thù nhưng retryable.\n✗ Đảo ngược cách xử lý hai loại lỗi là sai hoàn toàn.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-004",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Nhiều Lambda function trong một tổ chức cùng dùng chung một bộ thư viện chia sẻ nặng (~40 MB) và các binary phụ trợ. Đội muốn tránh đóng gói lặp lại trong từng deployment package và quản lý phiên bản tập trung. Giải pháp nào phù hợp nhất?",
    "options": [
      "Đóng gói thư viện thành một Lambda Layer và gắn layer đó vào các function",
      "Dùng Lambda Extensions để inject thư viện vào runtime",
      "Tải thư viện từ S3 vào /tmp ở mỗi cold start",
      "Tăng ephemeral storage /tmp lên 10 GB và copy thư viện vào đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda Layers cho phép chia sẻ code/dependency giữa nhiều function và quản lý phiên bản tập trung.\n✓ Layer chứa thư viện chung được nhiều function gắn vào, tránh đóng gói lặp và được versioned riêng.\n✗ Extensions dùng cho công cụ giám sát/observability/secrets, không phải để phân phối thư viện ứng dụng.\n✗ Tải từ S3 mỗi cold start làm tăng latency và phức tạp, không phải cách quản lý tập trung tốt nhất.\n✗ Tăng /tmp không giải quyết việc đóng gói và versioning thư viện chung.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-005",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một nhóm phát triển cần xây dựng một REST API đơn giản chỉ làm proxy chuyển tiếp HTTP request tới các hàm Lambda, với chi phí thấp nhất và độ trễ thấp. Họ KHÔNG cần các tính năng như request validation phức tạp, usage plans hay API keys. Loại API nào của API Gateway là phù hợp NHẤT?",
    "options": [
      "HTTP API",
      "REST API",
      "WebSocket API",
      "GraphQL API qua AppSync"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "HTTP API được thiết kế cho proxy Lambda/HTTP đơn giản, rẻ hơn và độ trễ thấp hơn REST API.\n✓ HTTP API: chi phí thấp hơn (tới khoảng 70%), độ trễ thấp, hỗ trợ Lambda proxy và JWT authorizer, lý tưởng cho proxy đơn giản.\n✗ REST API: nhiều tính năng (API keys, usage plans, request validation, caching) nhưng đắt hơn và không cần thiết ở đây.\n✗ WebSocket API: dành cho kết nối hai chiều thời gian thực, không phù hợp mô hình request/response HTTP.\n✗ AppSync GraphQL: là dịch vụ khác, không phải API Gateway và không cần thiết cho proxy đơn giản.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-006",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một REST API có 3 stage: dev, test, prod, mỗi stage cần gọi một hàm Lambda khác nhau (myfunc-dev, myfunc-test, myfunc-prod) mà KHÔNG phải tạo lại integration cho từng stage. Cách làm tối ưu là gì?",
    "options": [
      "Dùng stage variable (ví dụ ${stageVariables.lambdaAlias}) trong cấu hình integration URI và đặt giá trị khác nhau cho mỗi stage",
      "Tạo 3 REST API riêng biệt, mỗi API trỏ tới một Lambda",
      "Hard-code ARN của prod và dùng resource policy để chuyển hướng theo stage",
      "Dùng Lambda alias 'PROD' cho cả ba stage và phân biệt bằng API key"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Stage variables cho phép một integration trỏ động tới các target khác nhau theo stage.\n✓ Stage variable trong integration URI: tham chiếu ${stageVariables.xxx} để mỗi stage gọi Lambda/alias tương ứng, một định nghĩa dùng cho nhiều môi trường.\n✗ 3 API riêng: trùng lặp cấu hình, khó bảo trì, không tối ưu.\n✗ Hard-code prod và resource policy: resource policy không định tuyến tới Lambda khác nhau.\n✗ Cùng alias PROD và API key: API key không chọn backend; mọi stage sẽ gọi cùng một hàm.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-007",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Nhiều client cùng cập nhật thuộc tính 'stock' của một item product, gây ra lost update (ghi đè lẫn nhau). Developer muốn đảm bảo chỉ ghi nếu item chưa bị thay đổi kể từ lúc đọc. Cách triển khai chuẩn trong DynamoDB là gì?",
    "options": [
      "Optimistic locking: thêm thuộc tính 'version', dùng ConditionExpression 'version = :v' và tăng version mỗi lần update",
      "Dùng BatchWriteItem để gom các update thành một lần ghi",
      "Bật strongly consistent read khi GetItem rồi PutItem bình thường",
      "Tăng WCU của bảng để các write không tranh chấp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tránh lost update khi nhiều client sửa cùng item → optimistic locking với version + ConditionExpression.\n✓ Optimistic locking version + ConditionExpression — đúng, write chỉ thành công nếu version chưa đổi, nếu không thì fail để client retry.\n✗ BatchWriteItem — không atomic, không hỗ trợ điều kiện theo version, không ngăn lost update.\n✗ Strongly consistent read rồi PutItem — đọc mới vẫn không khóa ghi; giữa đọc và ghi client khác có thể chen vào.\n✗ Tăng WCU — giải quyết throttling chứ không phải tranh chấp logic/lost update.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-008",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một hệ thống thanh toán xử lý giao dịch tài khoản: các giao dịch trên cùng một tài khoản phải được xử lý đúng thứ tự và tuyệt đối không được xử lý trùng lặp. Throughput khoảng vài trăm message mỗi giây. Lựa chọn nào đúng nhất?",
    "options": [
      "SQS FIFO queue, dùng MessageGroupId theo accountId",
      "SQS Standard queue và thiết kế consumer idempotent",
      "SNS Standard topic với filter policy theo accountId",
      "Kinesis Data Streams với partition key là accountId"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu thứ tự + không trùng lặp + throughput vừa phải → SQS FIFO, dùng MessageGroupId để giữ thứ tự trong từng tài khoản.\n✓ SQS FIFO với MessageGroupId=accountId: đảm bảo thứ tự trong từng nhóm và exactly-once (khử trùng lặp).\n✗ Standard + idempotent: idempotent tránh tác động trùng nhưng Standard là best-effort ordering, không đảm bảo thứ tự xử lý.\n✗ SNS topic: là pub/sub, không phải hàng đợi giữ thứ tự xử lý point-to-point.\n✗ Kinesis: giữ thứ tự theo shard nhưng không khử trùng lặp built-in; nặng hơn nhu cầu này.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-009",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng .NET (SDK không bật adaptive mode) gọi nhiều API DynamoDB song song với mức concurrency rất cao và liên tục bị throttle dù đã có exponential backoff + jitter ở mỗi client. Cấu hình SDK nào giúp giảm throttle hiệu quả nhất ở phía client?",
    "options": [
      "Bật retry mode adaptive để SDK tự áp client-side rate limiting, giảm tốc độ gửi khi bị throttle",
      "Tăng read_timeout và connect_timeout để mỗi request chờ lâu hơn",
      "Chuyển sang legacy retry mode để giảm số lần retry",
      "Hard-code access key vào client để bỏ qua bước dò credential chain cho nhanh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi concurrency cao gây throttle có hệ thống, adaptive mode bổ sung client-side rate limiting để tự bóp tốc độ gửi, vượt trội so với chỉ backoff đơn lẻ.\n✓ Adaptive mode kết hợp retry standard và rate limiting phía client, giảm áp lực gửi khi bị throttle nhiều.\n✗ Tăng timeout chỉ thay đổi thời gian chờ kết nối/đọc, không giảm tỉ lệ throttle.\n✗ Legacy mode retry ít loại lỗi hơn và yếu hơn standard/adaptive, không giúp với throttle quy mô lớn.\n✗ Hard-code key không liên quan tới throttle và còn vi phạm best practice bảo mật.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-010",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function được gọi ASYNCHRONOUSLY bởi S3 event. Khi function ném lỗi sau khi hết số lần retry, đội muốn ghi lại payload event thất bại để phân tích VÀ cũng muốn nhận kết quả thành công gửi tới một SQS queue khác. Cấu hình nào đáp ứng cả hai yêu cầu một cách hiện đại nhất?",
    "options": [
      "Dùng Lambda Destinations: on-failure tới một SQS queue và on-success tới SQS queue khác",
      "Dùng DLQ (SQS) cho thất bại và poll function thủ công để gửi kết quả thành công",
      "Bật X-Ray để capture cả event thành công lẫn thất bại",
      "Tăng số lần Maximum Retry Attempts để event tự xử lý thành công"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda Destinations cho async invocation hỗ trợ định tuyến cả on-success và on-failure, kèm context phong phú hơn DLQ.\n✓ Destinations cho phép cấu hình đích riêng cho on-failure và on-success, đáp ứng cả hai yêu cầu.\n✗ DLQ chỉ bắt được thất bại và chỉ chứa payload, không xử lý kết quả thành công.\n✗ X-Ray dùng để trace/quan sát, không lưu payload event để xử lý lại.\n✗ Tăng retry không đảm bảo thành công và không ghi lại thất bại hay định tuyến thành công.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-011",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một REST API cung cấp cho khách hàng bên thứ ba. Bạn cần giới hạn mỗi khách hàng tối đa 10.000 request/ngày và 50 request/giây, đồng thời nhận diện từng khách hàng. Cách triển khai đúng là gì?",
    "options": [
      "Tạo usage plan với throttling và quota, gắn API key cho mỗi khách hàng và liên kết với usage plan",
      "Bật account-level throttling và cấp cùng một API key cho tất cả khách hàng",
      "Dùng Lambda authorizer để tự đếm request trong DynamoDB cho từng khách hàng",
      "Cấu hình WAF rate-based rule giới hạn 50 request/giây cho toàn API"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Usage plan và API key là cơ chế gốc của API Gateway để áp quota/throttle theo từng client.\n✓ Usage plan và API key: usage plan định nghĩa quota (10.000/ngày) và rate/burst (50 rps); mỗi API key gắn với plan để nhận diện và đo từng khách hàng.\n✗ Account-level throttle và key chung: không tách biệt theo khách hàng, không có quota riêng.\n✗ Lambda authorizer tự đếm: phức tạp, tốn kém, trùng lặp tính năng có sẵn.\n✗ WAF rate-based: áp cho IP/toàn API, không gắn quota theo khách hàng cụ thể.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-012",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng Products đã chạy production với partition key 'productId'. Team cần thêm một access pattern mới: truy vấn sản phẩm theo 'categoryId'. Họ cần một index tạo được trên bảng đang chạy, không cần strongly consistent read. Giải pháp nào đúng?",
    "options": [
      "Tạo Global Secondary Index (GSI) với partition key categoryId",
      "Tạo Local Secondary Index (LSI) với sort key categoryId",
      "Tạo lại bảng từ đầu để thêm LSI categoryId",
      "Dùng Scan với FilterExpression theo categoryId"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "LSI chỉ tạo được lúc tạo bảng; thêm index sau khi bảng chạy → GSI.\n✓ GSI partition key categoryId — đúng, GSI tạo/xóa được bất kỳ lúc nào và hỗ trợ partition key khác bảng gốc.\n✗ LSI sort key categoryId — LSI phải được tạo cùng lúc với bảng, không thêm được vào bảng đang chạy.\n✗ Tạo lại bảng để thêm LSI — tốn kém, gây downtime/migration không cần thiết khi GSI giải quyết được.\n✗ Scan + Filter — đọc toàn bảng mỗi lần, tốn kém và chậm cho access pattern lặp lại.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-013",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng ở chế độ provisioned có một GSI để truy vấn theo một access pattern phụ. Trong giờ cao điểm, các write vào BẢNG GỐC bắt đầu bị throttle dù bảng gốc còn dư WCU. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "GSI bị thiếu WCU, khiến write vào bảng gốc cũng bị throttle theo",
      "Strongly consistent read trên GSI tiêu thụ hết WCU của bảng",
      "GSI tự động dùng chung WCU với bảng nên không bao giờ throttle riêng",
      "LSI trên bảng đã hết dung lượng 10GB cho partition"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong provisioned mode, nếu GSI thiếu WCU để cập nhật, write vào bảng gốc cũng bị throttle (back-pressure).\n✓ GSI thiếu WCU làm write bảng gốc throttle — đúng, GSI có capacity riêng; khi GSI không theo kịp, DynamoDB tạo back-pressure chặn write gốc.\n✗ Strongly consistent read trên GSI — GSI không hỗ trợ strongly consistent read, và read tiêu RCU chứ không tiêu WCU.\n✗ GSI dùng chung WCU, không throttle riêng — sai, GSI có capacity tách biệt và có thể throttle riêng.\n✗ LSI hết 10GB partition — đây nói về giới hạn LSI chứ không phải nguyên nhân throttle write do GSI; đề không có LSI.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-014",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer dùng Boto3 để Scan một bảng DynamoDB lớn. Code chỉ đọc resp['Items'] một lần rồi dừng, nên thường thiếu nhiều bản ghi. Cần kiểm tra/đọc trường nào trong response để biết còn dữ liệu cần phân trang tiếp?",
    "options": [
      "LastEvaluatedKey trong response, truyền lại làm ExclusiveStartKey ở lần gọi kế tiếp",
      "NextToken trong response, truyền lại làm NextToken ở lần gọi kế tiếp",
      "NextContinuationToken trong response, truyền lại làm ContinuationToken",
      "IsTruncated trong response, truyền lại làm Marker"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DynamoDB Scan/Query dùng LastEvaluatedKey (response) và ExclusiveStartKey (request kế tiếp); khi LastEvaluatedKey vắng mặt là đã hết dữ liệu.\n✓ LastEvaluatedKey/ExclusiveStartKey là cặp phân trang đúng của DynamoDB.\n✗ NextToken là cơ chế của nhiều API generic, không phải của DynamoDB Scan/Query.\n✗ NextContinuationToken/ContinuationToken thuộc S3 ListObjectsV2.\n✗ IsTruncated/Marker thuộc các API kiểu cũ của S3 (ListObjects v1), không áp dụng cho DynamoDB.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-015",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một script Boto3 chạy trong container ECS (đã có task role phù hợp) bị lỗi NoRegionError khi khởi tạo client DynamoDB. Cách khắc phục đúng và phù hợp best practice nhất là gì?",
    "options": [
      "Đặt region qua tham số region_name khi tạo client hoặc qua biến môi trường AWS_REGION/AWS_DEFAULT_REGION",
      "Hard-code access key và secret vào code để SDK tự suy ra region",
      "Gắn thêm một instance profile cho container vì task role không cung cấp region",
      "Chuyển sang dùng raw HTTP API và tự ký SigV4 để bỏ qua yêu cầu region"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NoRegionError xảy ra khi không xác định được region từ tham số, env var hay file config; cách đúng là cung cấp region.\n✓ Truyền region_name hoặc set AWS_REGION/AWS_DEFAULT_REGION là cách chuẩn để giải quyết.\n✗ Hard-code key không liên quan tới region và vi phạm best practice; credentials và region là hai khái niệm khác nhau.\n✗ Trên ECS dùng task role, không gắn instance profile để lấy region; region không đến từ role.\n✗ Tự ký SigV4 vẫn cần region trong canonical request nên không bỏ qua được yêu cầu region.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-016",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một Lambda function được trigger bởi SQS standard queue qua event source mapping với batch size = 10. Khi xử lý một batch, message thứ 5 ném lỗi còn các message khác thành công. Mặc định, toàn bộ batch quay lại queue và bị xử lý lại, gây trùng lặp. Cách hiệu quả nhất để chỉ message lỗi được retry là gì?",
    "options": [
      "Bật ReportBatchItemFailures và trả về danh sách batchItemFailures chứa messageId của các message thất bại",
      "Đặt batch size = 1 để mỗi message là một invocation riêng",
      "Chuyển sang FIFO queue để Lambda tự bỏ qua message lỗi",
      "Bật DLQ trên function để tự động loại các message lỗi khỏi batch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Partial batch response (ReportBatchItemFailures) cho phép báo riêng các message lỗi để chỉ chúng được trả về queue.\n✓ Bật ReportBatchItemFailures và trả batchItemFailures giúp chỉ message thất bại được retry, tránh xử lý lại cả batch.\n✗ Batch size = 1 giải quyết trùng lặp nhưng kém hiệu quả và tốn kém hơn nhiều, không phải cách tối ưu.\n✗ FIFO không tự bỏ qua message lỗi; nó còn block xử lý theo message group.\n✗ DLQ trên function (async) không áp dụng cho event source mapping SQS theo cách này; redrive là cấu hình trên queue.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-017",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Với Lambda proxy integration trên API Gateway REST API, hàm Lambda phải trả về kết quả như thế nào để client nhận HTTP 200 kèm body JSON đúng?",
    "options": [
      "Trả về object có dạng { \"statusCode\": 200, \"headers\": {...}, \"body\": \"<chuỗi JSON>\" }",
      "Trả về trực tiếp object JSON nghiệp vụ; API Gateway tự bọc thành response",
      "Trả về { \"status\": 200, \"payload\": {...} } và để mapping template chuyển đổi",
      "Trả về chuỗi rỗng và đặt statusCode trong stage variable"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda proxy yêu cầu output đúng cấu trúc statusCode/headers/body, với body là chuỗi (string).\n✓ { statusCode, headers, body }: đây là định dạng bắt buộc của proxy integration; body phải là chuỗi (thường dùng JSON.stringify).\n✗ Trả object nghiệp vụ trực tiếp: đó là hành vi của non-proxy; với proxy sẽ gây lỗi 502 Malformed Lambda proxy response.\n✗ { status, payload }: sai tên trường, không đúng contract của proxy.\n✗ Chuỗi rỗng và stage variable: stage variable không dùng để đặt statusCode.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-018",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một backend cần xây dựng kênh giao tiếp hai chiều thời gian thực để server có thể chủ động đẩy thông báo tới các client đang kết nối (ví dụ ứng dụng chat). Loại API Gateway nào phù hợp nhất?",
    "options": [
      "WebSocket API với các route $connect, $disconnect và route tùy chỉnh",
      "REST API với long polling và API caching",
      "HTTP API với JWT authorizer và CORS",
      "REST API với Lambda proxy integration và usage plans"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "WebSocket API hỗ trợ kết nối hai chiều bền vững, cho phép server đẩy dữ liệu tới client.\n✓ WebSocket API: duy trì kết nối, dùng route $connect/$disconnect và route tùy chỉnh; server đẩy message qua @connections API, lý tưởng cho chat/real-time.\n✗ REST và long polling: mô phỏng được nhưng kém hiệu quả, tăng độ trễ và chi phí.\n✗ HTTP API: chỉ request/response, không có kết nối bền vững hai chiều.\n✗ REST và Lambda proxy: vẫn là mô hình request/response, không đẩy chủ động được.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-019",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Developer viết code Query và in ra số item nhận được, nhưng phát hiện chỉ nhận về một phần kết quả (khoảng 1MB dữ liệu) dù bảng có nhiều dữ liệu khớp hơn. Nguyên nhân và cách sửa là gì?",
    "options": [
      "Response giới hạn 1MB; phải lặp dùng LastEvaluatedKey truyền vào ExclusiveStartKey để lấy các trang tiếp",
      "Bảng thiếu RCU; tăng provisioned read capacity",
      "Phải dùng Scan thay vì Query để lấy đủ dữ liệu",
      "Đặt Limit lớn hơn để DynamoDB trả tất cả trong một response"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Một response Query/Scan giới hạn 1MB; còn dữ liệu thì có LastEvaluatedKey cần phân trang.\n✓ Lặp với LastEvaluatedKey → ExclusiveStartKey — đúng, đây là pagination chuẩn để lấy hết các trang.\n✗ Tăng RCU — capacity không liên quan tới giới hạn 1MB mỗi response.\n✗ Đổi sang Scan — Scan cũng giới hạn 1MB mỗi response, vấn đề không được giải quyết.\n✗ Đặt Limit lớn hơn — Limit giới hạn số item tối đa mỗi trang, không vượt được trần 1MB/response.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-020",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khi một đơn hàng được tạo, hệ thống cần kích hoạt đồng thời ba xử lý độc lập: cập nhật kho, gửi email xác nhận, và đẩy dữ liệu sang analytics. Mỗi hệ thống cần buffer riêng, retry riêng và độ bền (không mất message nếu một consumer tạm down). Kiến trúc nào phù hợp nhất?",
    "options": [
      "SNS topic fan-out, mỗi hệ thống có một SQS queue riêng subscribe vào topic",
      "Một SQS Standard queue duy nhất cho cả ba hệ thống cùng poll",
      "SNS topic với ba Lambda subscriber trực tiếp, không có SQS",
      "Kinesis Data Streams với ba consumer dùng enhanced fan-out"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pattern SNS + SQS fan-out: 1 event → nhiều consumer độc lập, mỗi consumer có buffer/retry/DLQ riêng và độ bền cao.\n✓ SNS fan-out + SQS riêng mỗi hệ thống: mỗi service xử lý theo nhịp riêng, có buffer và độ bền, không mất message khi một consumer down.\n✗ Một SQS queue chung: 1 message chỉ 1 consumer lấy → không thể cả ba cùng xử lý độc lập.\n✗ SNS + Lambda trực tiếp không SQS: nếu subscriber down, message có thể mất, thiếu buffer/độ bền.\n✗ Kinesis enhanced fan-out: phù hợp streaming/replay analytics, nặng và phức tạp hơn nhu cầu fan-out sự kiện đơn giản này.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "dva-m2-021",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi phân loại dữ liệu (data classification) cho một ứng dụng, những hành động nào là best practice để bảo vệ PII/PHI? (Chọn 2)",
    "options": [
      "Dùng Amazon Macie để tự động phát hiện và phân loại dữ liệu nhạy cảm như PII trong S3",
      "Áp dụng mã hoá at-rest và in-transit cho dữ liệu được phân loại là nhạy cảm",
      "Lưu PII không mã hoá nhưng đặt tag 'sensitive' lên object để cảnh báo",
      "Ghi đầy đủ PII vào application logs để dễ truy vết khi cần điều tra",
      "Cấp quyền đọc PII cho mọi developer để tăng tốc độ phát triển"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Bảo vệ PII/PHI cần phát hiện tự động và mã hoá đầu cuối, kèm least privilege.\n✓ Macie tự động phát hiện và phân loại PII trong S3, hỗ trợ data classification ở quy mô lớn.\n✓ Mã hoá at-rest và in-transit là yêu cầu cơ bản để bảo vệ dữ liệu nhạy cảm.\n✗ Chỉ gắn tag mà không mã hoá vẫn để lộ PII ở dạng plaintext.\n✗ Ghi PII vào logs làm tăng bề mặt rò rỉ, cần mask thay vì ghi đầy đủ.\n✗ Cấp quyền PII rộng rãi vi phạm least privilege và quy định bảo mật.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-022",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web sử dụng Amazon Cognito User Pool để đăng nhập người dùng. Sau khi xác thực thành công, ứng dụng cần gọi một API backend và phải gửi kèm token để chứng minh danh tính người dùng đã đăng nhập, đồng thời chứa các claim như email và tên hiển thị. Loại token nào của Cognito User Pool phù hợp nhất để truyền thông tin danh tính người dùng?",
    "options": [
      "ID token (JWT) chứa các claim về danh tính người dùng",
      "Access token (JWT) dùng để cấp quyền truy cập resource server scope",
      "Refresh token dùng để lấy token mới khi token cũ hết hạn",
      "Temporary AWS credentials do STS cấp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ID token là JWT chứa các claim về danh tính (email, name, sub...) dùng để xác thực ai là người dùng.\n✓ ID token — đúng, chứa thông tin danh tính người dùng dùng để authenticate.\n✗ Access token — chủ yếu chứa scope/quyền truy cập resource server, không tập trung vào claim danh tính.\n✗ Refresh token — chỉ để đổi lấy ID/access token mới, không truyền danh tính.\n✗ Temporary AWS credentials — đến từ Identity Pool/STS để gọi dịch vụ AWS, không phải để authenticate người dùng tới API thường.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-023",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Khi Cognito Identity Pool cấp temporary AWS credentials cho người dùng đã federate qua một web identity provider (như Cognito User Pool hoặc Google), STS API nào được sử dụng phía sau để giả lập IAM role?",
    "options": [
      "AssumeRoleWithWebIdentity",
      "AssumeRole",
      "AssumeRoleWithSAML",
      "GetFederationToken"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với web/OIDC identity, Identity Pool dùng STS AssumeRoleWithWebIdentity để cấp credentials.\n✓ AssumeRoleWithWebIdentity — đúng, dùng cho danh tính web/OIDC như Cognito/Google.\n✗ AssumeRole — dùng giữa các IAM principal/role, không phải web identity.\n✗ AssumeRoleWithSAML — dùng cho federation SAML, không phải web identity provider.\n✗ GetFederationToken — federation kiểu cũ qua IAM user credentials, không dùng trong luồng này.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-024",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer cần mã hóa một file log 8 GB lưu trên EC2 trước khi upload lên S3, sử dụng KMS key của công ty. Cách tiếp cận đúng là gì?",
    "options": [
      "Gọi KMS Encrypt trực tiếp với toàn bộ 8 GB dữ liệu và KeyId của CMK",
      "Dùng envelope encryption: gọi GenerateDataKey để lấy plaintext data key, mã hóa file tại EC2 bằng AES, lưu encrypted data key cạnh file",
      "Chia file thành các block 4 KB rồi gọi Encrypt nhiều lần cho từng block",
      "Gọi GenerateDataKeyWithoutPlaintext rồi dùng ciphertext blob để mã hóa trực tiếp 8 GB"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "KMS Encrypt chỉ xử lý tối đa 4 KB nên không dùng được cho file lớn.\n✓ Envelope encryption với GenerateDataKey: KMS trả plaintext data key (mã hóa data tại chỗ) và encrypted data key (lưu cạnh file).\n✗ Gọi Encrypt trực tiếp 8 GB vượt giới hạn 4 KB.\n✗ Chia 4 KB rồi Encrypt nhiều lần là kém tối ưu, tốn vô số request KMS và sai mô hình.\n✗ GenerateDataKeyWithoutPlaintext không trả plaintext key nên không thể mã hóa data ngay tại client.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-025",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một service cần được cấp quyền tạm thời, chi tiết để dùng một KMS key cho việc mã hóa, mà không muốn sửa key policy mỗi lần. Cơ chế KMS nào phù hợp nhất?",
    "options": [
      "Thêm dòng Allow vĩnh viễn vào key policy cho service",
      "Tạo Grant bằng CreateGrant và thu hồi bằng RevokeGrant khi xong",
      "Gắn IAM policy inline vào root account",
      "Dùng AWS managed key vì nó tự cấp grant"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Grant cấp quyền tạm thời, chi tiết cho một principal, thích hợp cho delegation ngắn hạn.\n✓ CreateGrant cấp quyền dùng key cho principal cụ thể trong thời gian ngắn, RevokeGrant thu hồi, không cần sửa key policy.\n✗ Thêm Allow vĩnh viễn vào key policy không phải tạm thời và phải sửa policy.\n✗ IAM policy gắn vào root không phải cơ chế delegation tạm thời của KMS.\n✗ AWS managed key không cho bạn tự cấp grant tùy ý và không sửa được policy.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-026",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The development team needs to store approximately 500 application configurations as plain text (non-sensitive) such as feature flags and endpoint URLs, prioritizing THE LOWEST COST. Which option is optimal?",
    "options": [
      "SSM Parameter Store standard tier with String type (free)",
      "AWS Secrets Manager, one secret per configuration",
      "AWS AppConfig with hosted configuration profile for each value",
      "SSM Parameter Store advanced tier with SecureString type"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Parameter Store standard tier String parameters miễn phí, phù hợp cho cấu hình không nhạy cảm.\n✓ Parameter Store standard tier String không tính phí lưu trữ, tối ưu chi phí cho dữ liệu không nhạy cảm.\n✗ Secrets Manager tính phí mỗi secret mỗi tháng, lãng phí cho dữ liệu không nhạy cảm.\n✗ AppConfig phục vụ quản lý cấu hình động/triển khai, dư thừa cho giá trị tĩnh đơn giản.\n✗ Advanced tier SecureString phát sinh phí, không cần thiết cho plain text không nhạy cảm.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-027",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng mobile cần cho phép người dùng đã đăng nhập qua Cognito User Pool truy cập trực tiếp các object trong Amazon S3 và ghi vào DynamoDB bằng AWS SDK. Thành phần nào của Cognito chịu trách nhiệm đổi token xác thực lấy temporary AWS credentials để gọi các dịch vụ AWS này?",
    "options": [
      "Cognito Identity Pool (Federated Identities)",
      "Cognito User Pool app client",
      "Cognito Hosted UI",
      "Cognito Pre Token Generation Lambda trigger"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Identity Pool nhận token (từ User Pool hoặc IdP khác) và đổi lấy temporary AWS credentials qua STS.\n✓ Identity Pool — đúng, cấp temporary AWS credentials để gọi trực tiếp S3/DynamoDB.\n✗ User Pool app client — quản lý cấu hình OAuth/đăng nhập, không cấp AWS credentials.\n✗ Hosted UI — chỉ là giao diện đăng nhập, không cấp credentials.\n✗ Pre Token Generation Lambda — chỉ tùy biến claim trong token, không cấp AWS credentials.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-028",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một API Gateway HTTP API cần ủy quyền request bằng JWT do một OIDC provider bên thứ ba (không phải Cognito) phát hành, kiểm tra issuer và audience. Developer muốn cấu hình native, ít code nhất. Loại authorizer nào nên dùng?",
    "options": [
      "JWT authorizer của HTTP API, cấu hình issuer và audience",
      "Lambda authorizer dạng REQUEST gọi tới IdP để introspect token",
      "Cognito authorizer trỏ tới một User Pool giả lập",
      "IAM authorizer với SigV4"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "HTTP API hỗ trợ JWT authorizer native cho mọi OIDC provider, chỉ cần khai báo issuer/audience.\n✓ JWT authorizer — đúng, hỗ trợ OIDC bất kỳ, ít cấu hình, verify token tự động.\n✗ Lambda authorizer introspect — chạy được nhưng phải viết code, phức tạp hơn cần thiết.\n✗ Cognito authorizer — gắn với User Pool, không dùng được cho IdP bên thứ ba.\n✗ IAM authorizer/SigV4 — dành cho danh tính IAM, không verify JWT OIDC.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-029",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "An application needs to store a small API token (approximately 200 bytes) encrypted with KMS in a configuration table. Which API should the developer call to encrypt it directly?",
    "options": [
      "GenerateDataKey with KeySpec AES_256",
      "Encrypt with the KeyId of the KMS key",
      "CreateGrant then pass the token to the grant",
      "GenerateDataKeyWithoutPlaintext"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Dữ liệu nhỏ (≤ 4 KB) như token có thể mã hóa trực tiếp bằng KMS.\n✓ Encrypt phù hợp cho dữ liệu nhỏ ≤ 4 KB, KMS trả ciphertext trực tiếp, không cần tự quản data key.\n✗ GenerateDataKey dùng cho envelope encryption với dữ liệu lớn, dư thừa cho 200 byte.\n✗ CreateGrant chỉ cấp quyền dùng key, không mã hóa dữ liệu.\n✗ GenerateDataKeyWithoutPlaintext sinh data key chưa dùng ngay, không mã hóa token.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-030",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khách hàng muốn S3 mã hóa object phía server nhưng KHÔNG muốn AWS giữ key mã hóa; thay vào đó client gửi kèm key trong mỗi request. Lựa chọn nào đúng và yêu cầu kèm theo là gì?",
    "options": [
      "SSE-S3, bắt buộc dùng HTTPS",
      "SSE-KMS, key lưu trong KMS",
      "SSE-C, bắt buộc dùng HTTPS vì key đi qua header",
      "Client-side encryption, S3 chỉ thấy ciphertext"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "SSE-C để server (S3) mã hóa nhưng key do client cung cấp mỗi request.\n✓ SSE-C: client gửi key trong header mỗi request, S3 mã hóa rồi quên key; bắt buộc HTTPS vì key truyền qua header.\n✗ SSE-S3 dùng key AWS quản lý, không phải client cung cấp.\n✗ SSE-KMS lưu key trong KMS, không phải client mang theo.\n✗ Client-side là client tự mã hóa trước khi gửi, không phải server mã hóa.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-031",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi Secrets Manager rotate password, ứng dụng của bạn đôi khi vẫn nhận password CŨ trong vài giây đầu. Bạn muốn luôn lấy phiên bản đang hoạt động hiện tại. Tham số nào khi gọi GetSecretValue đảm bảo điều này?",
    "options": [
      "Dùng VersionStage = AWSCURRENT (giá trị mặc định)",
      "Dùng VersionStage = AWSPREVIOUS",
      "Dùng VersionStage = AWSPENDING",
      "Truyền VersionId của phiên bản đầu tiên được tạo"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager dùng staging label để định danh phiên bản; AWSCURRENT là bản đang hoạt động.\n✓ AWSCURRENT trỏ tới phiên bản đang sử dụng hiện tại và là mặc định khi không chỉ định version.\n✗ AWSPREVIOUS là phiên bản cũ ngay trước, sẽ lấy password đã hết hiệu lực.\n✗ AWSPENDING là bản mới đang trong quá trình rotation, chưa được kích hoạt.\n✗ VersionId của bản đầu tiên trỏ tới giá trị cũ, không phải giá trị hiện hành.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-032",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần password để kết nối tới database của bên thứ ba (không phải RDS, Redshift hay DocumentDB) và muốn rotation tự động. Cách triển khai đúng với Secrets Manager?",
    "options": [
      "Tạo Lambda rotation function tuỳ chỉnh theo bốn bước (createSecret, setSecret, testSecret, finishSecret) cho secret",
      "Bật RDS-managed rotation vì nó hỗ trợ mọi loại database",
      "Dùng SecureString của Parameter Store vì nó tự rotate mọi credential",
      "Không thể rotate vì Secrets Manager chỉ hỗ trợ database AWS-native"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với database không native, cần Lambda rotation function tuỳ chỉnh theo 4 bước chuẩn.\n✓ Lambda rotation function tuỳ chỉnh với bốn bước cho phép rotate credential của bất kỳ hệ thống nào.\n✗ RDS-managed rotation chỉ áp dụng cho các database AWS được hỗ trợ, không phải bên thứ ba bất kỳ.\n✗ SecureString của Parameter Store không có rotation tự động native.\n✗ Secrets Manager hỗ trợ rotate cả non-native qua custom Lambda, nên phát biểu này sai.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-033",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty enterprise muốn nhân viên đăng nhập ứng dụng bằng tài khoản công ty (corporate directory) đã hỗ trợ SAML 2.0, sau đó nhận temporary AWS credentials để gọi dịch vụ AWS. Họ muốn dùng Cognito. Kiến trúc đúng là gì?",
    "options": [
      "Cấu hình SAML IdP làm identity provider cho Cognito, rồi dùng Identity Pool đổi lấy AWS credentials",
      "Tạo IAM user cho mỗi nhân viên và phân phối access key",
      "Dùng API key của API Gateway cho từng nhân viên",
      "Lưu mật khẩu corporate vào Cognito User Pool và xác thực trực tiếp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Federation SAML kết hợp Identity Pool cho phép đổi danh tính liên kết lấy temporary AWS credentials.\n✓ SAML IdP + Identity Pool — đúng, federate corporate directory rồi cấp AWS credentials tạm thời.\n✗ IAM user + access key — không mở rộng và dùng credentials tĩnh, kém an toàn.\n✗ API key — chỉ định danh client cho API Gateway, không phải xác thực nhân viên.\n✗ Lưu mật khẩu corporate vào User Pool — sao chép credentials, vi phạm bảo mật và mục tiêu federation.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-034",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một website tĩnh phục vụ qua CloudFront cần HTTPS với chứng chỉ tự động gia hạn và miễn phí. Giải pháp nào phù hợp nhất?",
    "options": [
      "Tự mua chứng chỉ từ CA bên ngoài rồi import vào EC2",
      "Dùng ACM public certificate ở Region us-east-1 và gắn vào CloudFront distribution",
      "Dùng AWS Private CA để cấp chứng chỉ nội bộ cho CloudFront",
      "Tạo self-signed certificate và import vào ACM"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "ACM cung cấp chứng chỉ public miễn phí, tự gia hạn, tích hợp CloudFront.\n✓ ACM public certificate miễn phí, tự renew; CloudFront yêu cầu chứng chỉ nằm ở us-east-1.\n✗ Mua chứng chỉ ngoài rồi import vào EC2 không liên quan CloudFront và không tự gia hạn.\n✗ Private CA dành cho chứng chỉ nội bộ, không được trình duyệt công cộng tin cậy.\n✗ Self-signed certificate không được trình duyệt tin cậy, gây cảnh báo bảo mật.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-035",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Developer cần re-encrypt một ciphertext nhỏ (dưới 4 KB) từ KMS key cũ sang KMS key mới mà không để lộ plaintext ra ngoài KMS. API nào nên dùng?",
    "options": [
      "Decrypt bằng key cũ rồi Encrypt lại bằng key mới ở phía client",
      "ReEncrypt để KMS đổi key trực tiếp mà plaintext không rời KMS",
      "GenerateDataKey với key mới",
      "CreateGrant trỏ ciphertext sang key mới"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "ReEncrypt đổi data từ key này sang key khác hoàn toàn bên trong KMS.\n✓ ReEncrypt: KMS giải mã rồi mã hóa lại bằng key mới mà plaintext không bao giờ rời KMS, áp dụng cho dữ liệu ≤ 4 KB.\n✗ Decrypt rồi Encrypt lại ở client làm plaintext lộ ra ngoài KMS, kém an toàn.\n✗ GenerateDataKey sinh data key mới, không re-encrypt ciphertext sẵn có.\n✗ CreateGrant chỉ cấp quyền, không chuyển đổi ciphertext.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-036",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Lambda function cần truy cập một database password. Yêu cầu: dùng Secrets Manager, giảm số lần gọi API tới Secrets Manager (tránh throttling và chi phí), nhưng vẫn lấy được giá trị mới sau khi rotate. Cách triển khai tối ưu?",
    "options": [
      "Dùng AWS Parameters and Secrets Lambda Extension để cache secret trong bộ nhớ với TTL",
      "Lưu password vào environment variable lúc deploy bằng CloudFormation",
      "Gọi GetSecretValue ở mỗi lần invoke không cache",
      "Hardcode password trong code và rotate thủ công khi cần"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda Extension cache secret với TTL, giảm gọi API mà vẫn refresh khi hết TTL.\n✓ Parameters and Secrets Lambda Extension cache cục bộ với TTL, giảm gọi API nhưng tự refresh để bắt giá trị sau rotation.\n✗ Lưu vào env var lúc deploy khiến giá trị cũ sau khi rotate, không tự cập nhật.\n✗ Gọi GetSecretValue mỗi invoke tốn API call và dễ bị throttle, không tối ưu.\n✗ Hardcode password vi phạm best practice bảo mật nghiêm trọng.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-037",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Team muốn tổ chức cấu hình theo môi trường: /myapp/dev/db-url, /myapp/prod/db-url. Họ cần một lệnh duy nhất lấy tất cả parameter dưới /myapp/prod/. API nào của Parameter Store phù hợp?",
    "options": [
      "GetParametersByPath với Path = /myapp/prod/ và Recursive = true",
      "GetParameter gọi lần lượt cho từng tên parameter đầy đủ",
      "DescribeParameters lọc theo prefix rồi đọc từng cái",
      "PutParameter với Overwrite để gom các giá trị lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Hierarchy cho phép dùng GetParametersByPath để lấy hàng loạt theo đường dẫn.\n✓ GetParametersByPath với path prefix và Recursive trả về tất cả parameter trong nhánh chỉ với một lời gọi.\n✗ Gọi GetParameter từng cái không tận dụng hierarchy và tốn nhiều request.\n✗ DescribeParameters trả metadata chứ không trả giá trị, và lọc kém hiệu quả.\n✗ PutParameter dùng để ghi, không phải để đọc nhiều giá trị.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "dva-m2-038",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một developer cần một CodeBuild build (giai đoạn build) xuất ra HAI loại đầu ra: (1) các file ứng dụng đã đóng gói để CodeDeploy dùng, và (2) báo cáo kết quả unit test để hiển thị trong CodeBuild. Trong buildspec.yml, những phần nào được dùng đúng mục đích? (Chọn 2)",
    "options": [
      "Phần artifacts để khai báo các file output (gồm appspec.yml và app) chuyển sang stage sau",
      "Phần reports để khai báo report group chứa kết quả test (ví dụ JUnit/Cucumber)",
      "Phần hooks với BeforeInstall/AfterInstall để gắn kết quả test",
      "Phần phases/post_build dùng để định nghĩa report group test",
      "Phần cache để lưu báo cáo test giữa các lần build"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "buildspec có phần artifacts cho output và phần reports cho test report.\n✓ artifacts khai báo các file output (gồm appspec.yml, app) để truyền sang stage Deploy\n✓ reports khai báo report group chứa kết quả test theo định dạng như JUnit để CodeBuild hiển thị\n✗ hooks BeforeInstall/AfterInstall là khái niệm của appspec.yml CodeDeploy, không thuộc buildspec\n✗ post_build chạy lệnh, không phải nơi định nghĩa report group (report group khai báo ở phần reports)\n✗ cache dùng tái sử dụng dependency, không phải lưu báo cáo test",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-039",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Trong một bài kiểm tra, developer cần CHỌN các deployment policy của Elastic Beanstalk vừa đảm bảo ZERO-DOWNTIME vừa KHÔNG làm GIẢM capacity sẵn sàng trong suốt quá trình deploy. Chọn TẤT CẢ đáp án đúng.",
    "options": [
      "Immutable",
      "Rolling with additional batch",
      "Rolling",
      "All at once",
      "Single instance recreate"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Cần đồng thời zero-downtime và không giảm capacity.\n✓ Immutable: tạo full set instances mới song song nên không giảm capacity và zero-downtime.\n✓ Rolling with additional batch: thêm 1 batch dư trước khi deploy nên luôn giữ đủ capacity gốc và zero-downtime.\n✗ Rolling: deploy in-place theo batch nên capacity bị giảm tạm thời trong mỗi batch.\n✗ All at once: thay thế đồng loạt gây downtime và giảm capacity.\n✗ Single instance recreate: không phải policy giữ capacity, gây gián đoạn.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-040",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trước khi cập nhật một CloudFormation stack production quan trọng, team muốn xem CHÍNH XÁC những resource nào sẽ được thêm, sửa, hoặc XÓA/thay thế (replacement) mà chưa áp dụng thay đổi. Tính năng nào nên dùng?",
    "options": [
      "Tạo và review một change set trước khi execute",
      "Bật termination protection rồi update trực tiếp",
      "Chạy drift detection trên stack",
      "Dùng update với rollback configuration"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Change set cho biết tác động dự kiến của một update trước khi thực thi.\n✓ Change set liệt kê các action Add/Modify/Remove và đánh dấu resource bị replacement, an toàn để review trước\n✗ Termination protection chỉ chống xóa stack, không xem trước thay đổi\n✗ Drift detection phát hiện cấu hình thực tế lệch khỏi template, không dự đoán tác động update sắp tới\n✗ Rollback configuration xử lý khi update lỗi, không hiển thị thay đổi trước",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-041",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một CodeDeploy deployment lên EC2 in-place cần dừng web server cũ trước khi cài bản mới và chạy smoke test sau khi cài đặt. Developer cấu hình các script này ở đâu và theo lifecycle hook nào?",
    "options": [
      "Trong appspec.yml: dừng server ở hook ApplicationStop hoặc BeforeInstall, smoke test ở hook ValidateService",
      "Trong buildspec.yml: dừng server ở phase pre_build, smoke test ở phase post_build",
      "Trong appspec.yml: cả hai script đặt ở hook AfterInstall vì hook này chạy mọi script",
      "Trong buildspec.yml phase install và trong appspec.yml hook BeforeAllowTraffic"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeDeploy dùng appspec.yml và lifecycle hooks để chạy script triển khai.\n✓ appspec.yml định nghĩa hooks; ApplicationStop/BeforeInstall để dừng server cũ, ValidateService để smoke test sau khi cài là đúng vòng đời\n✗ buildspec.yml thuộc CodeBuild, không điều khiển lifecycle deploy của CodeDeploy\n✗ Đặt cả hai vào AfterInstall sai vì dừng server cần xảy ra trước khi cài, và validate cần ở cuối\n✗ Trộn buildspec với hook BeforeAllowTraffic không phù hợp; BeforeAllowTraffic là hook của blue/green, không cho EC2 in-place đơn giản này",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-042",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng production chạy trên Elastic Beanstalk cần triển khai version mới với yêu cầu: KHÔNG được giảm capacity tổng dưới mức hiện tại trong suốt quá trình deploy, và muốn tránh chi phí duy trì hai môi trường đầy đủ. Chính sách deployment nào tối ưu?",
    "options": [
      "Rolling with additional batch",
      "All-at-once",
      "Blue/green",
      "Immutable với toàn bộ instance mới rồi mới swap"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu giữ nguyên capacity nhưng không muốn nhân đôi toàn bộ môi trường.\n✓ Rolling with additional batch khởi tạo một batch phụ trước để duy trì full capacity trong khi cập nhật từng batch, chi phí tăng nhẹ chứ không gấp đôi.\n✗ All-at-once gây giảm capacity và downtime.\n✗ Blue/green nhân đôi môi trường, tốn kém hơn yêu cầu.\n✗ Immutable tạo toàn bộ instance mới song song, chi phí tạm thời cao hơn additional batch.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-043",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "To achieve blue/green deployment with zero-downtime on Elastic Beanstalk, the developer clones the current environment (blue) to a new environment (green), deploys the new version to green and tests. What is the final step to shift traffic to green with minimal interruption?",
    "options": [
      "Perform Swap Environment URLs between the two environments (swap CNAME)",
      "Terminate environment blue then manually point DNS Route 53 to green",
      "Change the deployment policy of blue to immutable",
      "Use all-at-once deployment again on blue with green's version"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Blue/green trên Beanstalk hoàn tất bằng việc hoán đổi CNAME giữa hai environments.\n✓ Swap Environment URLs: Beanstalk đổi CNAME của blue và green, traffic chuyển ngay sang green mà không downtime, dễ rollback bằng cách swap lại.\n✗ Terminate blue rồi sửa DNS thủ công: gây downtime và mất khả năng rollback nhanh.\n✗ Đổi policy blue sang immutable: deployment policy không thực hiện chuyển traffic giữa hai environments.\n✗ All-at-once deploy lại trên blue: phá vỡ mục đích blue/green và gây downtime trên blue.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-044",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function (SAM) cần quyền đọc/ghi vào một bảng DynamoDB tên Orders. Developer muốn cấp quyền theo least privilege mà không tự viết IAM policy JSON dài dòng. Cách tốt nhất trong SAM là gì?",
    "options": [
      "Dùng SAM policy template DynamoDBCrudPolicy với tham số TableName",
      "Gắn managed policy AmazonDynamoDBFullAccess vào function role",
      "Đặt AssumeRole tới một role có quyền admin DynamoDB",
      "Thêm resource-based policy trên bảng DynamoDB cho function ARN"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SAM cung cấp policy templates đã được giới hạn phạm vi theo tham số, giúp least privilege dễ dàng.\n✓ DynamoDBCrudPolicy với TableName giới hạn quyền CRUD đúng vào bảng Orders\n✗ AmazonDynamoDBFullAccess cấp quyền lên mọi bảng, vi phạm least privilege\n✗ AssumeRole tới role admin là quá rộng và không cần thiết\n✗ Resource-based policy không phải cách SAM cấp quyền theo policy template và không giải quyết yêu cầu least privilege qua cấu hình SAM ở đây",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-045",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The development team wants the pipeline to automatically run as soon as a new commit is pushed to the main branch of the CodeCommit repository. What is the recommended configuration approach (near real-time, no polling)?",
    "options": [
      "Use Amazon EventBridge (CloudWatch Events) rule to capture CodeCommit commit events to trigger the pipeline",
      "Enable periodic polling of CodePipeline to check the repository every few minutes",
      "Create a cron job on EC2 to call StartPipelineExecution every minute",
      "Configure S3 event notification on CodeCommit repository"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge cho phép trigger pipeline gần realtime khi có commit.\n✓ EventBridge rule bắt sự kiện thay đổi reference của CodeCommit và khởi động pipeline là cách được khuyến nghị, nhanh và không tốn polling\n✗ Polling gây độ trễ và tốn API call, không phải lựa chọn tối ưu\n✗ Cron job trên EC2 phức tạp, tốn chi phí và không cần thiết\n✗ CodeCommit không phải S3, không tạo S3 event notification",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-046",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "The deployment team runs a service on Amazon ECS using CodeDeploy blue/green. The appspec.yml for ECS is different from the one for EC2. Which REQUIRED component must be declared in appspec.yml for ECS deployment?",
    "options": [
      "Resources pointing to TaskDefinition and LoadBalancerInfo (ContainerName, ContainerPort)",
      "File list mapping source/destination like EC2 in-place deployment",
      "ApplicationStop and ApplicationStart hooks to stop/start containers",
      "Path to buildspec.yml for CodeDeploy to rebuild the task"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "appspec.yml cho ECS có cấu trúc riêng dựa trên TaskDefinition và container.\n✓ Phần Resources phải trỏ tới TaskDefinition và LoadBalancerInfo gồm ContainerName/ContainerPort cho deployment ECS\n✗ Ánh xạ file source/destination chỉ áp dụng cho deployment EC2/on-premises, không dùng cho ECS\n✗ ApplicationStop/ApplicationStart là hook cho EC2/on-premises, không phải cho ECS\n✗ CodeDeploy không build task qua buildspec; appspec không tham chiếu buildspec.yml",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-047",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Sau khi CodeDeploy hoàn tất chuyển 100% traffic sang Lambda version mới và deployment báo Succeeded, đội phát hiện lỗi nghiêm trọng 30 phút sau. CloudWatch alarm gắn trong deployment không còn kích hoạt rollback vì deployment đã kết thúc. Cách nhanh nhất để khôi phục là gì?",
    "options": [
      "Cập nhật weighted alias PROD trỏ 100% về version cũ ngay lập tức",
      "Khởi động một deployment CodeDeploy mới và chờ canary chạy lại",
      "Xóa version Lambda mới để traffic tự quay về version cũ",
      "Tạo lại alias PROD từ đầu trỏ tới version cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sau khi deployment Succeeded, alarm-based rollback của CodeDeploy không còn tác dụng; cần hành động thủ công nhanh nhất.\n✓ Trỏ alias PROD 100% về version cũ là thao tác tức thì, không cần deploy lại.\n✗ Deployment CodeDeploy mới với canary tốn thời gian, không phải nhanh nhất khi đang sự cố.\n✗ Xóa version có thể làm alias trỏ tới version không tồn tại và gây lỗi invoke, không khôi phục đúng.\n✗ Tạo lại alias từ đầu phức tạp và rủi ro hơn so với chỉ cập nhật version trỏ tới.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-048",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một environment Beanstalk được tạo với database RDS gắn kèm (coupled) qua console trong cùng environment. Team lo ngại rằng khi terminate environment sẽ mất dữ liệu. Giải pháp BEST practice cho production để bảo toàn dữ liệu là gì?",
    "options": [
      "Tạo RDS instance tách rời (decoupled) bên ngoài Beanstalk và truyền endpoint qua environment variables",
      "Đặt deletion policy của RDS coupled thành Retain qua .ebextensions và giữ nguyên coupling",
      "Bật Multi-AZ cho RDS coupled để tránh mất dữ liệu khi terminate",
      "Chuyển environment sang worker tier để RDS không bị xóa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS coupled vào environment sẽ bị xóa cùng environment, rủi ro cho production.\n✓ Tạo RDS decoupled bên ngoài và truyền endpoint qua env variables: vòng đời database tách khỏi environment, terminate environment không xóa DB, đây là best practice production.\n✗ Đặt deletion policy Retain cho RDS coupled: chỉ giảm rủi ro xóa nhưng database vẫn nằm trong vòng đời environment và khó quản lý.\n✗ Bật Multi-AZ: tăng high availability chứ không ngăn việc database bị xóa khi terminate environment.\n✗ Chuyển sang worker tier: không liên quan tới coupling của RDS.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-049",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function cần thư viện numpy/pandas dung lượng lớn được chia sẻ với nhiều function khác, đồng thời giữ kích thước gói deployment của mỗi function nhỏ. Cách đóng gói TỐI ƯU là gì?",
    "options": [
      "Đưa các thư viện chung vào một Lambda layer và attach cho các function",
      "Tăng giới hạn package size bằng cách dùng S3 cho mỗi zip",
      "Đóng gói mỗi function dưới dạng container image 10 GB",
      "Dùng AppConfig để phân phối thư viện lúc runtime"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda layer cho phép tách dependency dùng chung khỏi mã function.\n✓ Layer chứa numpy/pandas được nhiều function tái sử dụng, giữ gói code từng function nhỏ\n✗ Dùng S3 cho zip chỉ giúp upload package lớn, không chia sẻ và không giảm trùng lặp\n✗ Container image 10 GB cho mỗi function là khả thi nhưng kém tối ưu khi mục tiêu là chia sẻ thư viện và gói nhỏ\n✗ AppConfig phân phối cấu hình/feature flag chứ không phân phối thư viện code",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-050",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong buildspec.yml, developer cần chạy lệnh cài đặt runtime và dependency TRƯỚC khi biên dịch source. Sau khi build xong cần đẩy Docker image lên ECR. Các lệnh đó nên đặt vào những phase nào?",
    "options": [
      "Cài runtime/dependency vào phase install, đẩy image lên ECR vào phase post_build",
      "Cài runtime/dependency vào phase build, đẩy image lên ECR vào phase pre_build",
      "Cài runtime/dependency vào phase pre_build, đẩy image lên ECR vào phase install",
      "Đặt tất cả lệnh vào phase build vì các phase khác không chạy lệnh shell"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thứ tự phase của buildspec: install, pre_build, build, post_build.\n✓ install dùng để cài runtime/dependency, post_build chạy sau build để đẩy image lên ECR là đúng best practice\n✗ build là nơi biên dịch, không phải để cài runtime; pre_build chạy trước build nên không hợp để push image sau build\n✗ pre_build dùng cho việc chuẩn bị (như login ECR), không nên đặt cài runtime ở đó; install không chạy sau build\n✗ Mọi phase đều có thể chạy lệnh shell; gom hết vào build là kém tổ chức",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-051",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một pipeline đa stage cần stage Deploy chỉ được thực thi sau khi có người quản lý phê duyệt thủ công ngay sau stage Build. Cách triển khai đúng trong CodePipeline là gì?",
    "options": [
      "Thêm một action loại Manual approval (action category Approval) trước stage Deploy, tùy chọn gửi thông báo qua SNS",
      "Cấu hình một CodeBuild action chạy lệnh chờ input từ console",
      "Đặt một Lambda action poll bảng DynamoDB cho đến khi có cờ approve",
      "Bật chế độ pause của artifact store để dừng pipeline cho tới khi resume"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodePipeline có sẵn action loại Manual approval cho việc phê duyệt thủ công.\n✓ Thêm Approval action trước stage Deploy, có thể tích hợp SNS để thông báo người duyệt là cách chuẩn và tối ưu\n✗ CodeBuild chờ input từ console không phải cơ chế approval và sẽ timeout\n✗ Lambda poll DynamoDB là giải pháp tự chế phức tạp, không cần thiết khi đã có Manual approval\n✗ Artifact store không có chế độ pause/resume pipeline",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-052",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Developer dùng AWS SAM để triển khai Lambda với traffic shifting. Trong mục DeploymentPreference, họ muốn tăng traffic đều đặn 10% mỗi 2 phút cho tới khi đạt 100%. Type nào cần khai báo?",
    "options": [
      "Linear10PercentEvery2Minutes",
      "Canary10Percent2Minutes",
      "AllAtOnce",
      "Canary10Percent30Minutes"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tăng đều theo bước cố định là linear.\n✓ Linear10PercentEvery2Minutes tăng 10% mỗi 2 phút cho đến 100% — đúng yêu cầu tăng đều.\n✗ Canary chỉ có hai bước (một phần ngay rồi phần còn lại), không tăng đều liên tục.\n✗ AllAtOnce chuyển toàn bộ một lần, không có shifting dần.\n✗ Canary10Percent30Minutes vẫn là canary hai bước, không phải tăng đều mỗi 2 phút.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-053",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Developer cần cài thêm package OS, chạy lệnh khởi tạo và đặt option settings cho environment Beanstalk một cách khai báo trong source bundle. Cơ chế nào nên dùng?",
    "options": [
      "Thêm các file cấu hình YAML/JSON trong thư mục .ebextensions của application source bundle",
      "Sửa trực tiếp user data của Launch Template sau khi environment chạy",
      "Đặt mọi thứ vào Dockerrun.aws.json bất kể platform",
      "Dùng AWS Systems Manager State Manager thủ công ngoài Beanstalk"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Beanstalk cho phép tùy biến environment khai báo qua .ebextensions.\n✓ .ebextensions với file YAML/JSON: cho phép khai báo packages, commands, container_commands, option_settings... được Beanstalk áp dụng khi deploy, đúng cơ chế chuẩn.\n✗ Sửa user data Launch Template thủ công: Beanstalk quản lý launch config, thay đổi thủ công sẽ bị ghi đè và không lặp lại được.\n✗ Dockerrun.aws.json cho mọi platform: chỉ dùng cho platform Docker, không phải cơ chế chung.\n✗ State Manager thủ công ngoài Beanstalk: không tích hợp vào source bundle và lệch khỏi quy trình Beanstalk.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "dva-m2-054",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "The team is preparing to enable X-Ray for a container application on EC2 using X-Ray SDK. They need to ensure segments are sent and displayed successfully. Which of the following conditions are necessary? (Select 2)",
    "options": [
      "IAM role attached to instance/task with xray:PutTraceSegments and xray:PutTelemetryRecords permissions",
      "X-Ray daemon running and listening on UDP port 2000 to receive segments from SDK",
      "Each downstream call must be recorded as an annotation to send a segment",
      "Must disable sampling completely so every request is sent",
      "Must pre-create service map in console matching service names"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Trên EC2/ECS, gửi trace cần IAM permission đúng và một daemon nhận segment qua UDP.\n✓ IAM role cần xray:PutTraceSegments và xray:PutTelemetryRecords để daemon đẩy được trace.\n✓ X-Ray daemon phải chạy và nghe UDP 2000 để nhận segment từ SDK.\n✗ Downstream call không bắt buộc thành annotation để gửi segment.\n✗ Không cần tắt sampling; sampling giúp giảm chi phí, không chặn hiển thị.\n✗ Service map tự sinh từ trace, không cần tạo trước.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-055",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Khi so sánh Embedded Metric Format (EMF) và PutMetricData để phát custom metric trong môi trường Lambda, những phát biểu nào ĐÚNG? (Chọn 2)",
    "options": [
      "EMF không thêm network call/latency vì chỉ ghi log JSON, CloudWatch tự trích metric",
      "PutMetricData gọi API trực tiếp tới CloudWatch nên thêm latency và có thể bị throttle",
      "EMF tạo metric miễn phí còn PutMetricData luôn tính phí",
      "PutMetricData giữ được context log đi kèm metric còn EMF thì không",
      "Chỉ PutMetricData mới hỗ trợ dimensions, EMF không hỗ trợ dimensions"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Khác biệt cốt lõi nằm ở cách truyền và chi phí runtime/API, không phải giá metric.\n✓ EMF chỉ ghi log JSON nên không thêm network call/latency.\n✓ PutMetricData là API call đồng bộ, thêm latency và có thể bị throttle.\n✗ Cả hai đều tạo custom metric tính phí như nhau ở mức metric; EMF không miễn phí.\n✗ Ngược lại: EMF giữ context log đi kèm metric, PutMetricData chỉ có số.\n✗ Cả EMF và PutMetricData đều hỗ trợ dimensions.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-056",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một dịch vụ cần alarm phản ứng trong vòng dưới 1 phút khi traffic burst đột ngột (period 10 giây). Cấu hình metric nào bắt buộc để alarm period 10s hợp lệ?",
    "options": [
      "Custom metric high-resolution (StorageResolution = 1)",
      "Custom metric standard (StorageResolution = 60)",
      "Bật detailed monitoring để metric về 1 giây",
      "Standard metric với evaluation period nhiều data point hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Alarm period 10s/30s chỉ dùng được với metric high-resolution.\n✓ High-resolution metric (StorageResolution = 1, granularity 1 giây) cho phép alarm period 10s/30s.\n✗ Standard metric (60s) chỉ cho alarm period tối thiểu 60s.\n✗ Detailed monitoring đưa metric EC2 về 1 phút, không phải 1 giây, không liên quan high-resolution.\n✗ Tăng số data point không thay đổi được period tối thiểu của metric standard.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-057",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer instrument ứng dụng ECS trên Fargate bằng X-Ray SDK. Họ muốn segment được gửi tới X-Ray. Thành phần nào cần được triển khai trong task để nhận segment từ SDK và chuyển tới X-Ray?",
    "options": [
      "Chạy X-Ray daemon như một sidecar container trong task definition",
      "Bật Active tracing trong cấu hình task definition của Fargate",
      "Gắn một X-Ray VPC endpoint vào ENI của task thay cho daemon",
      "Cài CloudWatch agent để chuyển segment X-Ray"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trên ECS/Fargate, SDK gửi segment qua UDP tới X-Ray daemon; daemon thường chạy dưới dạng sidecar.\n✓ X-Ray daemon dạng sidecar container nhận segment qua UDP và đẩy lên X-Ray.\n✗ Active tracing là tính năng của Lambda, không phải tùy chọn task definition cho SDK của ECS.\n✗ VPC endpoint chỉ giúp kết nối riêng, không thay thế vai trò gom segment của daemon.\n✗ CloudWatch agent không phải thành phần nhận segment X-Ray.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-058",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng dùng write-through cache với ElastiCache: mỗi lần ghi dữ liệu đều cập nhật cả database và cache. Nhược điểm chính của write-through là gì, và cách giảm thiểu phổ biến nào nên áp dụng?",
    "options": [
      "Cache có thể chứa nhiều dữ liệu không bao giờ được đọc; giảm thiểu bằng cách đặt TTL để loại bỏ key ít dùng",
      "Cache luôn trả dữ liệu stale; giảm thiểu bằng cách tắt TTL hoàn toàn",
      "Read luôn miss lần đầu; giảm thiểu bằng cách bật lazy loading thay thế",
      "Ghi sẽ không bao giờ cập nhật cache; giảm thiểu bằng cách thêm DAX"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Write-through ghi mọi dữ liệu vào cache kể cả dữ liệu hiếm khi được đọc, làm phình cache.\n✓ Cache chứa dữ liệu không được đọc + TTL — đúng, đó là điểm yếu của write-through; đặt TTL để dọn các key ít dùng và tránh phình bộ nhớ.\n✗ Luôn trả stale + tắt TTL — sai, write-through giữ cache mới; tắt TTL không phải giảm thiểu.\n✗ Read luôn miss lần đầu — đó là đặc điểm của lazy loading, không phải write-through.\n✗ Ghi không cập nhật cache — sai, bản chất write-through là cập nhật cache khi ghi.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-059",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer cần điều tra một sự cố đã xảy ra hôm qua bằng cách phân tích các log event CŨ trong một log group (đếm số lỗi theo từng khoảng 5 phút). Công cụ nào phù hợp nhất?",
    "options": [
      "CloudWatch Logs Insights query trên log group",
      "Tạo metric filter mới với pattern ERROR rồi xem metric",
      "Subscription filter đẩy log sang Lambda để đếm",
      "PutMetricData để ghi số lỗi vào CloudWatch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Logs Insights phân tích được log đã có sẵn, kể cả log cũ.\n✓ Logs Insights query (filter + stats count by bin) phân tích log quá khứ tương tác.\n✗ Metric filter chỉ áp dụng cho log MỚI ghi sau khi tạo, không hồi tố log cũ.\n✗ Subscription filter chỉ xử lý log mới đến gần real-time, không phân tích log cũ.\n✗ PutMetricData chỉ ghi metric thủ công, không phân tích log có sẵn.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-060",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer bật tracing cho ứng dụng và muốn lọc (filter) các trace theo userId để nhanh chóng tìm request của một khách hàng cụ thể trong X-Ray console. Cách ghi dữ liệu nào cho phép lọc trực tiếp theo userId?",
    "options": [
      "Ghi userId dưới dạng annotation bằng put_annotation — annotation được index và filter được qua filter expression",
      "Ghi userId dưới dạng metadata bằng put_metadata — metadata được index và search được",
      "Ghi userId vào CloudWatch Logs rồi dùng Logs Insights để liên kết với trace",
      "Ghi userId vào tên của subsegment để X-Ray tự động index"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "X-Ray có annotation (indexed, filter được) và metadata (không index).\n✓ Annotation được index và dùng được trong filter expression nên lọc theo userId nhanh.\n✗ Metadata KHÔNG được index, không filter được, chỉ để đính kèm dữ liệu chi tiết.\n✗ Logs Insights không phải cách filter trace gốc trong X-Ray và phức tạp hơn.\n✗ Tên subsegment không phải cơ chế index annotation và không filter theo giá trị tùy ý.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-061",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer chạy hàm Lambda được gọi liên tục và muốn loại bỏ độ trễ do cold start gây ra ngay cả khi không có request nào trong vài phút. Tính năng nào của Lambda giữ sẵn các execution environment đã được khởi tạo để phục vụ request ngay lập tức?",
    "options": [
      "Provisioned concurrency",
      "Reserved concurrency",
      "Tăng giá trị timeout của hàm",
      "Bật Lambda SnapStart cho runtime Python"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Để loại bỏ cold start cần giữ sẵn các môi trường đã được khởi tạo (initialized) trước khi request đến.\n✓ Provisioned concurrency — đúng, khởi tạo sẵn một số môi trường để không có cold start.\n✗ Reserved concurrency — chỉ giới hạn/đảm bảo số concurrency tối đa cho hàm, không làm ấm sẵn môi trường.\n✗ Tăng timeout — chỉ cho phép hàm chạy lâu hơn, không ảnh hưởng cold start.\n✗ SnapStart — giảm cold start bằng snapshot nhưng không giữ sẵn môi trường đã khởi tạo theo kiểu warm như provisioned concurrency, và không phù hợp với mô tả 'giữ sẵn environment để phục vụ ngay'.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-062",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng Lambda (Node.js) cần phát một custom business metric (ví dụ số đơn hàng đã xử lý) lên CloudWatch nhưng team muốn tránh tăng thời gian thực thi và tránh gọi API đồng bộ tới CloudWatch trong mỗi invocation. Giải pháp tối ưu là gì?",
    "options": [
      "Ghi metric theo Embedded Metric Format (EMF) ra log; CloudWatch tự trích metric từ log",
      "Gọi cloudwatch.putMetricData() đồng bộ ở cuối mỗi invocation",
      "Tạo metric filter trên log group để đếm số đơn hàng",
      "Bật high-resolution metric trong cấu hình Lambda"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EMF cho phép ghi metric kèm log JSON mà không tốn API call hay latency.\n✓ EMF chỉ ghi log ra stdout, CloudWatch trích metric, không thêm latency và không gọi API đồng bộ.\n✗ PutMetricData đồng bộ thêm một network call và latency vào mỗi invocation.\n✗ Metric filter chỉ đếm pattern có sẵn trong log, không phải cách phát business metric có cấu trúc với dimensions tùy ý hiệu quả như EMF, và phụ thuộc bạn đã log đúng định dạng.\n✗ High-resolution là độ phân giải metric, không giải quyết vấn đề latency/API.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-063",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "The development team wants to enable X-Ray for a Python Lambda function to view traces in the service map. What is the simplest, most recommended way to enable tracing?",
    "options": [
      "Enable Active tracing in Lambda function configuration (with X-Ray IAM permission)",
      "Install and run X-Ray daemon as a background process within Lambda runtime",
      "Create a separate EC2 instance running X-Ray daemon for Lambda to send UDP to",
      "Configure CloudWatch Synthetics canary to generate traces for Lambda"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với Lambda, dùng Active tracing thay vì tự chạy daemon.\n✓ Bật Active tracing là cách chuẩn; AWS quản lý daemon, chỉ cần thêm IAM permission cho X-Ray.\n✗ Không cần (và không nên) tự chạy X-Ray daemon trong Lambda runtime.\n✗ EC2 chạy daemon là mô hình cho EC2/ECS, không phù hợp Lambda và tốn kém.\n✗ Synthetics canary là để giám sát endpoint, không phải cách bật tracing cho function.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-064",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Sau khi bật Active tracing cho Lambda, trace của Lambda xuất hiện nhưng các lời gọi downstream tới DynamoDB và một HTTP API bên ngoài KHÔNG hiện thành subsegment trên service map. Code không có thay đổi gì khác. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "AWS SDK client trong code chưa được patch/instrument bằng X-Ray SDK nên không sinh subsegment cho downstream call",
      "IAM role Lambda thiếu quyền dynamodb:DescribeTable nên X-Ray ẩn subsegment",
      "Active tracing chỉ tạo segment chứ không bao giờ tạo subsegment",
      "Sampling rule mặc định loại bỏ mọi subsegment của downstream"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Active tracing tạo segment cho lần gọi Lambda, nhưng subsegment cho downstream cần SDK được instrument (patch AWS SDK / HTTP client).\n✓ Chưa patch AWS SDK / HTTP client bằng X-Ray SDK nên downstream call không sinh subsegment.\n✗ Thiếu dynamodb:DescribeTable không liên quan tới việc ẩn subsegment tracing.\n✗ Active tracing vẫn cho phép subsegment khi SDK được instrument.\n✗ Sampling không chọn lọc bỏ riêng subsegment downstream theo cách này.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m2-065",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một REST API trên API Gateway gọi backend tốn kém cho cùng các tham số được lặp lại nhiều lần. Developer muốn giảm tải backend bằng cách cache phản hồi và đảm bảo mỗi tổ hợp tham số/header có entry cache riêng. Cấu hình nào đúng?",
    "options": [
      "Bật API Gateway caching cho stage, đặt TTL và chọn các tham số làm cache key",
      "Bật CloudFront trước API Gateway và để mặc định cache theo toàn bộ query string",
      "Tăng provisioned concurrency của Lambda backend để phản hồi nhanh hơn",
      "Bật lazy loading trong API Gateway integration request"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "API Gateway có caching ở mức stage với TTL và cho phép chọn method request parameter làm cache key để phân biệt entry per-key.\n✓ Bật caching ở stage + TTL + cache key — đúng, đáp ứng yêu cầu cache theo từng tổ hợp tham số.\n✗ CloudFront cache mặc định toàn bộ query string — có thể hỗ trợ nhưng không trực tiếp là tính năng per-key cache key của API Gateway và phức tạp hơn cho REST API nội bộ này.\n✗ Provisioned concurrency — chỉ giảm cold start, không cache kết quả nên backend vẫn bị gọi mỗi lần.\n✗ Lazy loading trong integration — không phải tính năng của API Gateway.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "dva-m3-001",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một Lambda function trong VPC gặp tình trạng lúc cao điểm bị lỗi liên quan tới ENI và đôi khi cold start lâu hơn. Đội muốn tối ưu kiến trúc mạng và hiệu năng. Những phát biểu nào sau đây ĐÚNG về Lambda networking và performance? (Chọn 2)",
    "options": [
      "Lambda dùng Hyperplane ENI, được chia sẻ giữa các execution environment cùng function/subnet/security group, giúp giảm cold start so với mô hình ENI cũ",
      "Để truy cập service AWS như S3/DynamoDB từ Lambda trong VPC mà không qua NAT Gateway, có thể dùng VPC Gateway/Interface Endpoint",
      "Mỗi concurrent invocation của Lambda trong VPC luôn tạo một ENI mới riêng, nên cần nhiều IP private",
      "Gán Provisioned Concurrency làm Lambda thoát khỏi VPC để giảm cold start",
      "Đặt function vào một subnet duy nhất (single-AZ) làm tăng độ sẵn sàng và lượng IP khả dụng"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Câu hỏi kiểm tra hiểu biết về Hyperplane ENI và VPC endpoints.\n✓ Lambda dùng Hyperplane ENI chia sẻ theo bộ (function/subnet/SG), giảm đáng kể cold start liên quan ENI so với trước.\n✓ VPC Gateway Endpoint (S3, DynamoDB) hoặc Interface Endpoint cho phép truy cập service mà không cần NAT Gateway.\n✗ Mô hình hiện tại KHÔNG tạo ENI mới cho mỗi concurrent invocation; đó là hành vi cũ trước Hyperplane.\n✗ Provisioned Concurrency không làm function rời khỏi VPC; cấu hình VPC vẫn áp dụng.\n✗ Đặt function vào một subnet duy nhất (single-AZ) làm giảm độ sẵn sàng và pool IP; nên dùng nhiều subnet ở nhiều AZ.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-002",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một script tự code vòng lặp retry cho lời gọi API bị throttle. Hiện tại tất cả các instance của ứng dụng retry sau đúng các mốc 1s, 2s, 4s, 8s. Vào giờ cao điểm, các retry vẫn dồn cục và tiếp tục bị throttle. Thay đổi nào khắc phục tốt nhất?",
    "options": [
      "Thêm jitter (nhiễu ngẫu nhiên) vào thời gian chờ exponential backoff",
      "Tăng số lần retry tối đa từ 4 lên 50 để chắc chắn thành công",
      "Giảm thời gian chờ về 0 để retry càng nhanh càng tốt",
      "Bỏ exponential backoff, chuyển sang khoảng chờ cố định 1 giây"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Các client backoff theo cùng mốc thời gian cố định sẽ retry đồng loạt (thundering herd); jitter phân tán các lần retry.\n✓ Jitter ngẫu nhiên hóa thời điểm retry nên các client không dồn cục, giảm throttle.\n✗ Tăng số lần retry không giải quyết việc dồn cục; chỉ kéo dài và làm trầm trọng tải.\n✗ Chờ 0 giây khiến tất cả retry ngay lập tức, làm throttle nặng hơn.\n✗ Khoảng chờ cố định vẫn khiến các client đồng bộ thời điểm retry, không tốt bằng backoff + jitter.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-003",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một Lambda function viết bằng Node.js mở một connection pool tới Amazon RDS. Developer muốn giảm latency của các invocation sau lần gọi đầu tiên bằng cách tái dùng connection. Cách triển khai nào là tối ưu?",
    "options": [
      "Khởi tạo connection pool BÊN NGOÀI hàm handler (ở phạm vi module/global) để tái dùng qua execution context được warm",
      "Khởi tạo connection pool BÊN TRONG handler ở đầu mỗi invocation rồi đóng lại ở cuối",
      "Lưu connection object vào /tmp dưới dạng file và đọc lại ở invocation sau",
      "Bật Provisioned Concurrency để Lambda tự động chia sẻ connection giữa các function khác nhau"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Code khởi tạo nằm ngoài handler chỉ chạy một lần khi tạo execution context và được tái dùng ở các warm start.\n✓ Đặt connection pool ngoài handler giúp tái dùng giữa các invocation trên cùng execution context, giảm latency.\n✗ Khởi tạo trong handler tạo lại connection mỗi lần gọi, làm tăng latency và gây cạn connection ở RDS.\n✗ /tmp chỉ lưu được file/byte, không serialize được socket/connection object đang sống.\n✗ Provisioned Concurrency giữ ấm môi trường nhưng không chia sẻ connection giữa các function khác nhau; nó không phải cơ chế tái dùng connection ở đây.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-004",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một Lambda function tiêu thụ một Kinesis Data Stream với 1 shard qua event source mapping. Khi một record gây lỗi, toàn bộ shard bị chặn (poison pill) vì Lambda retry vô hạn theo thứ tự. Đội cần tránh block shard nhưng không mất dữ liệu lỗi để điều tra. Cấu hình event source mapping nào phù hợp nhất?",
    "options": [
      "Đặt MaximumRetryAttempts hữu hạn, BisectBatchOnFunctionError = true và cấu hình on-failure destination (SQS/SNS)",
      "Đặt ParallelizationFactor = 10 để xử lý song song nhiều record",
      "Tăng batch size lên mức tối đa để xử lý nhanh hơn qua record lỗi",
      "Chuyển trigger sang SQS DLQ trực tiếp từ Kinesis"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với stream, cần giới hạn retry, chia nhỏ batch khi lỗi và gửi record lỗi tới destination để không mất dữ liệu và không block shard.\n✓ MaximumRetryAttempts hữu hạn + BisectBatchOnFunctionError + on-failure destination giúp cô lập record lỗi, gửi đi điều tra và bỏ qua để không block shard.\n✗ ParallelizationFactor tăng song song trong một shard nhưng không giải quyết poison pill block.\n✗ Tăng batch size không vượt qua được record lỗi; vẫn bị block.\n✗ Kinesis không gắn DLQ trực tiếp như vậy; on-failure destination mới là cơ chế đúng.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-005",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một REST API cần biến đổi body request đến từ client (XML) sang JSON trước khi gửi tới một HTTP backend, và biến đổi ngược lại response. Backend KHÔNG nên thấy định dạng gốc. Giải pháp phù hợp nhất là gì?",
    "options": [
      "Dùng non-proxy integration với mapping templates (VTL) cho cả Integration Request và Integration Response",
      "Dùng Lambda proxy integration và để client tự chuyển đổi",
      "Bật request validation để API Gateway tự chuyển XML sang JSON",
      "Dùng stage variables để chỉ định bộ chuyển đổi tại runtime"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Việc transform request/response cần non-proxy integration với mapping templates VTL.\n✓ Non-proxy và mapping templates: cho phép viết VTL để map/transform body ở Integration Request và Integration Response.\n✗ Lambda proxy: proxy chuyển nguyên payload, không cho phép mapping template biến đổi.\n✗ Request validation: chỉ kiểm tra schema/tham số bắt buộc, không chuyển đổi định dạng.\n✗ Stage variables: chỉ là biến cấu hình theo stage, không thực hiện transform.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-006",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng mới ra mắt có lưu lượng truy cập rất khó dự đoán, lúc tăng đột biến lúc gần như không có. Team không muốn dành thời gian tinh chỉnh capacity và muốn tránh throttling khi traffic spike. Chế độ capacity nào của DynamoDB phù hợp nhất?",
    "options": [
      "On-demand capacity mode",
      "Provisioned capacity với giá trị RCU/WCU cố định cao",
      "Provisioned capacity với Reserved Capacity dài hạn",
      "Provisioned capacity với Auto Scaling target 70%"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Traffic spiky/khó đoán và không muốn quản lý capacity → On-demand tự scale gần như tức thì.\n✓ On-demand — đúng, tự động scale theo từng request, không cần tinh chỉnh, hạn chế throttling khi spike.\n✗ Provisioned RCU/WCU cố định cao — lãng phí tiền khi tải thấp và vẫn có thể throttle nếu spike vượt mức.\n✗ Reserved Capacity — cam kết dài hạn cho tải ổn định, không hợp ứng dụng mới khó đoán.\n✗ Provisioned + Auto Scaling — phản ứng chậm hơn on-demand với burst đột ngột nên dễ throttle lúc spike.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-007",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bảng session lưu các phiên đăng nhập tạm thời. Team muốn DynamoDB tự động xóa các item hết hạn để tiết kiệm chi phí lưu trữ, không tốn WCU cho việc xóa thủ công. Cách cấu hình đúng là gì?",
    "options": [
      "Bật TTL trên một thuộc tính chứa epoch timestamp tính bằng giây (Number)",
      "Bật TTL trên một thuộc tính chứa ISO 8601 datetime string",
      "Tạo một Lambda chạy theo lịch để Scan và DeleteItem các item cũ",
      "Đặt một thuộc tính expiresAt bằng milliseconds và bật TTL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "TTL yêu cầu attribute là epoch time tính bằng giây (Number) và xóa nền không tốn WCU.\n✓ TTL với epoch seconds (Number) — đúng, đây là format bắt buộc để TTL hoạt động và item được xóa tự động không tính WCU.\n✗ ISO 8601 string — sai format, TTL chỉ đọc Number epoch giây nên item sẽ không bị xóa.\n✗ Lambda Scan + DeleteItem định kỳ — tốn RCU/WCU và chi phí Lambda, không tối ưu so với TTL.\n✗ Milliseconds — TTL hiểu giá trị là giây; dùng milliseconds khiến thời điểm xóa sai lệch rất xa.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-008",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng Lambda gọi DynamoDB và đôi khi nhận lỗi ProvisionedThroughputExceededException trong giai đoạn lưu lượng tăng đột biến ngắn. Cách xử lý ĐÚNG NHẤT theo best practice của AWS là gì?",
    "options": [
      "Retry request với exponential backoff cộng jitter",
      "Tăng vĩnh viễn RCU/WCU của bảng lên mức tối đa ngay khi gặp lỗi đầu tiên",
      "Bắt lỗi và bỏ qua (swallow) để ứng dụng không bị crash",
      "Chuyển sang gọi API bằng raw HTTP và tự ký SigV4 để vượt rate limit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ProvisionedThroughputExceededException là lỗi throttling retryable; phản ứng chuẩn là retry với exponential backoff và jitter.\n✓ Exponential backoff + jitter giúp giãn các lần retry, tránh thundering herd và xử lý được spike ngắn.\n✗ Tăng capacity ngay lên tối đa gây tốn chi phí và không cần thiết cho spike ngắn; backoff thường đủ.\n✗ Bỏ qua lỗi làm mất dữ liệu/giao dịch, không phải xử lý đúng.\n✗ Tự ký SigV4 không vượt được rate limit; throttling do service áp đặt bất kể cách ký.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-009",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một Lambda function CPU-bound xử lý ảnh hiện cấu hình 256 MB memory và chạy khá chậm. Đội phát triển muốn giảm thời gian thực thi mà KHÔNG viết lại code, đồng thời có thể rẻ hơn. Hành động nào phù hợp nhất?",
    "options": [
      "Tăng memory-size của function lên mức cao hơn (ví dụ 1024 MB) vì CPU được cấp tỉ lệ thuận với memory",
      "Tăng timeout của function lên 900 giây",
      "Giảm memory-size xuống 128 MB để tiết kiệm chi phí mỗi ms",
      "Bật reserved concurrency để Lambda ưu tiên CPU cho function này"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong Lambda, CPU (và network) được cấp tỉ lệ thuận với memory; tăng memory làm function CPU-bound chạy nhanh hơn.\n✓ Tăng memory cấp nhiều CPU hơn, giảm thời gian chạy; với tác vụ CPU-bound, tổng chi phí có thể giảm dù giá mỗi ms tăng.\n✗ Tăng timeout chỉ cho phép chạy lâu hơn trước khi bị kill, không làm function nhanh hơn.\n✗ Giảm memory làm CPU ít đi, function chạy chậm hơn nữa.\n✗ Reserved concurrency chỉ giới hạn/đảm bảo số concurrency, không cấp thêm CPU.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-010",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một Lambda function được API Gateway gọi đồng bộ. Khi traffic tăng và Lambda bị throttle do vượt concurrency, đội muốn client thấy hành vi đúng và có khả năng tự retry hợp lý. Phát biểu nào mô tả đúng hành vi và best practice?",
    "options": [
      "Synchronous invocation trả về lỗi throttling 429 (TooManyRequestsException) và client nên áp dụng exponential backoff để retry",
      "Lambda tự động đưa các invocation bị throttle vào DLQ để xử lý lại",
      "Synchronous throttle khiến Lambda tự retry hai lần trước khi trả lỗi cho client",
      "Lambda chuyển các request bị throttle sang chế độ async và xử lý sau"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với invocation đồng bộ, throttling trả lỗi 429 ngay cho caller; caller chịu trách nhiệm retry với backoff.\n✓ Throttle đồng bộ trả 429/TooManyRequestsException; client áp dụng exponential backoff (và jitter) để retry là best practice.\n✗ DLQ và auto-retry chỉ áp dụng cho async invocation, không phải sync.\n✗ Lambda không tự retry cho sync invocation; trách nhiệm retry thuộc về caller.\n✗ Lambda không tự chuyển sync request bị throttle sang async.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-011",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một POST endpoint nhận JSON. Bạn muốn API Gateway từ chối sớm (HTTP 400) các request thiếu trường bắt buộc hoặc sai kiểu dữ liệu để tránh gọi Lambda lãng phí, mà không viết thêm code. Cách triển khai đúng là gì?",
    "options": [
      "Tạo Model (JSON Schema) cho request body và bật Request Validator kiểm tra body trên method",
      "Dùng mapping template VTL để throw lỗi khi thiếu trường",
      "Bật API caching để loại bỏ request không hợp lệ",
      "Thêm Lambda authorizer kiểm tra schema của body"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Request validation bằng Model (JSON Schema) cho phép API Gateway tự reject body không hợp lệ trước khi gọi backend.\n✓ Model và Request Validator: định nghĩa JSON Schema (required/type), gắn validator kiểu 'validate body' để API Gateway trả 400 mà không gọi Lambda.\n✗ Mapping template VTL: có thể kiểm tra nhưng phức tạp và là cách thủ công, không phải cơ chế validation chuẩn.\n✗ API caching: không có vai trò xác thực dữ liệu đầu vào.\n✗ Lambda authorizer: dùng cho phân quyền, không nhận hay kiểm tra request body.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-012",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Hệ thống ngân hàng cần chuyển tiền: trừ tiền tài khoản A và cộng tiền tài khoản B trên cùng một bảng DynamoDB. Hai thao tác phải cùng thành công hoặc cùng thất bại (all-or-nothing). API nào phù hợp?",
    "options": [
      "TransactWriteItems",
      "BatchWriteItem",
      "Hai lần UpdateItem riêng biệt có ConditionExpression",
      "PutItem với ReturnValues = ALL_OLD"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nhiều thao tác ghi all-or-nothing trên cùng region/account → TransactWriteItems (ACID).\n✓ TransactWriteItems — đúng, đảm bảo atomic all-or-nothing cho nhiều item/bảng.\n✗ BatchWriteItem — KHÔNG atomic, một item fail không rollback các item khác.\n✗ Hai UpdateItem riêng — nếu lệnh thứ hai fail, lệnh đầu đã commit, không rollback được.\n✗ PutItem ALL_OLD — chỉ ghi một item và trả giá trị cũ, không bao trùm hai thao tác nguyên tử.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-013",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Lambda được trigger bởi SQS (event source mapping) với function timeout là 60 giây. Trong production, một số message bị xử lý lặp lại nhiều lần dù logic xử lý không lỗi. Nguyên nhân khả dĩ nhất và cách khắc phục là gì?",
    "options": [
      "Visibility timeout nhỏ hơn thời gian xử lý; đặt visibility timeout ít nhất bằng 6 lần function timeout (ví dụ 360 giây)",
      "Queue đang là Standard; chuyển sang FIFO để bật exactly-once",
      "Long polling đang tắt; bật ReceiveMessageWaitTimeSeconds=20",
      "Thiếu DLQ; gắn DLQ vào Lambda function để chặn message lặp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nếu visibility timeout nhỏ hơn thời gian xử lý, message hiện lại trước khi consumer kịp DeleteMessage → bị xử lý lại.\n✓ Đặt visibility timeout ít nhất bằng 6 lần function timeout (360s): best practice cho SQS+Lambda, đủ thời gian xử lý và retry mà không bị hiện lại sớm.\n✗ Chuyển sang FIFO: FIFO có dedup nhưng vấn đề ở đây là cấu hình visibility timeout, không phải bản chất Standard.\n✗ Bật long polling: chỉ giảm empty receive, không liên quan message bị xử lý lặp.\n✗ DLQ trên Lambda: với SQS+Lambda, DLQ đặt trên SQS queue chứ không phải trên function; và DLQ không ngăn xử lý lặp.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-014",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-01-sdk-api",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Boto3 client được cấu hình Config(retries={'max_attempts': 4, 'mode': 'standard'}). Với một request liên tục bị ThrottlingException, SDK sẽ thực hiện tổng cộng bao nhiêu lần gọi tới service trước khi ném lỗi ra ngoài?",
    "options": [
      "4 lần gọi (1 lần đầu + 3 lần retry)",
      "5 lần gọi (1 lần đầu + 4 lần retry)",
      "3 lần gọi vì standard mode luôn cố định 3",
      "8 lần gọi do exponential nhân đôi số lần thử"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Trong boto3 Config, key retries[max_attempts] là số lần RETRY (chưa gồm lần gọi đầu) — tổng số lần gọi = max_attempts + 1. Chỉ retries[total_max_attempts] và biến môi trường AWS_MAX_ATTEMPTS mới tính cả lần gọi đầu.\n✓ 5 lần gọi (1 lần đầu + 4 retry) — đúng, vì max_attempts=4 trong dict retries nghĩa là 4 lần retry thêm.\n✗ 4 lần gọi — nhầm max_attempts với total_max_attempts/AWS_MAX_ATTEMPTS (các cấu hình đó mới gồm lần đầu).\n✗ standard mode không cố định 3; số lần do cấu hình quyết định.\n✗ Exponential backoff chỉ ảnh hưởng thời gian chờ giữa các lần thử, không nhân đôi số lần.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-015",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function cần truy cập một database trong VPC private subnet VÀ gọi một third-party API public trên Internet. Sau khi gắn function vào VPC, các call tới database thành công nhưng call ra Internet bị timeout. Giải pháp đúng để cả hai hoạt động là gì?",
    "options": [
      "Đặt Lambda ENI vào private subnet và thêm route tới NAT Gateway (nằm ở public subnet) để có Internet outbound",
      "Gán một Elastic IP trực tiếp cho Lambda function để nó truy cập Internet",
      "Đặt Lambda vào public subnet và gán public IP cho ENI của Lambda",
      "Thêm Internet Gateway route trực tiếp vào private subnet nơi Lambda chạy"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda trong VPC không có public IP; ra Internet phải đi qua NAT Gateway đặt ở public subnet.\n✓ Đặt ENI ở private subnet và route 0.0.0.0/0 tới NAT Gateway cho phép outbound Internet trong khi vẫn truy cập database nội bộ.\n✗ Lambda không nhận Elastic IP gán trực tiếp; ENI do Lambda quản lý không có public IP.\n✗ Đặt Lambda vào public subnet không cấp public IP cho ENI của Lambda, nên vẫn không ra được Internet.\n✗ Route IGW trong private subnet không giúp được vì ENI của Lambda không có public IP để IGW định tuyến.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-016",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-02-lambda",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function tải một model ML (~200 MB) từ S3 để inference. Mỗi invocation lại tải lại model làm latency cao. Đội muốn tránh tải lại trong cùng execution environment được warm. Cách tối ưu nhất là gì?",
    "options": [
      "Tải model về /tmp (hoặc biến global) một lần ở cold start và tái dùng cho các warm invocation tiếp theo",
      "Tăng batch size của event source mapping để tải model ít lần hơn",
      "Lưu model vào environment variable đã mã hóa KMS",
      "Đặt timeout lớn hơn để có thời gian tải model mỗi lần"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nội dung /tmp và biến global tồn tại giữa các invocation trên cùng execution context được warm.\n✓ Tải model vào /tmp hoặc biến global một lần ở cold start rồi tái dùng giúp warm invocation không tải lại, giảm latency.\n✗ Tăng batch size không liên quan tới việc cache model trong môi trường.\n✗ Env var giới hạn 4 KB tổng, không thể chứa model 200 MB.\n✗ Tăng timeout không loại bỏ việc tải lại model mỗi lần.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-017",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-03-api-gateway",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Người dùng đã đăng nhập qua một Amazon Cognito user pool và nhận được ID token (JWT). Bạn muốn API Gateway REST API tự xác thực token này và từ chối request không hợp lệ mà không cần viết code authorizer. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Cognito user pool authorizer",
      "IAM authorizer (AWS_IAM) với SigV4",
      "Lambda (TOKEN) authorizer tự viết để verify JWT",
      "API key gắn với usage plan"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito user pool authorizer xác thực JWT từ user pool một cách tự nhiên, không cần code.\n✓ Cognito user pool authorizer: client gửi ID/Access token trong header; API Gateway tự verify với user pool, không cần Lambda.\n✗ IAM (SigV4): dùng cho credential AWS/role, không hợp với JWT của người dùng đăng nhập qua Cognito.\n✗ Lambda authorizer tự viết: làm được nhưng phải tự code verify JWT, không tối ưu khi đã có sẵn Cognito authorizer.\n✗ API key: chỉ để định danh/đo lường, KHÔNG phải cơ chế xác thực người dùng.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-018",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Yêu cầu nghiệp vụ: sau khi một item được ghi, mọi lần đọc tiếp theo PHẢI thấy ngay giá trị mới nhất (không chấp nhận dữ liệu cũ). Khi gọi GetItem, developer cần cấu hình gì?",
    "options": [
      "Đặt ConsistentRead = true (strongly consistent read)",
      "Để mặc định eventually consistent read cho nhanh",
      "Đọc qua một Global Secondary Index",
      "Đặt ReturnConsumedCapacity = TOTAL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần thấy ngay dữ liệu mới nhất → strongly consistent read bằng ConsistentRead=true.\n✓ ConsistentRead=true — đúng, đảm bảo đọc phản ánh mọi write thành công trước đó.\n✗ Eventually consistent (mặc định) — có thể trả về bản cũ trong khoảng thời gian ngắn.\n✗ Đọc qua GSI — GSI KHÔNG hỗ trợ strongly consistent read, luôn eventually consistent.\n✗ ReturnConsumedCapacity — chỉ trả về thông tin capacity tiêu thụ, không ảnh hưởng consistency.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-019",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-04-dynamodb",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bảng có item kích thước 8KB. Ứng dụng cần thực hiện 100 strongly consistent read mỗi giây trên các item này ở chế độ provisioned. Cần provision tối thiểu bao nhiêu RCU?",
    "options": [
      "200 RCU",
      "100 RCU",
      "400 RCU",
      "50 RCU"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "1 RCU = 1 strongly consistent read item ≤4KB; item 8KB = 2 × 4KB → 2 RCU/read, ×100 = 200.\n✓ 200 RCU — đúng: 8KB làm tròn lên bội số 4KB = 2 block → 2 RCU mỗi strongly consistent read, ×100 read/s = 200 RCU.\n✗ 100 RCU — bỏ qua việc item 8KB cần 2 RCU mỗi read (chỉ đúng nếu item ≤4KB).\n✗ 400 RCU — gấp đôi không cần thiết; 400 ứng với item 16KB hoặc tính nhầm đơn vị.\n✗ 50 RCU — đó là con số cho eventually consistent (½ RCU/read), không phải strongly consistent.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-020",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một quy trình duyệt chi phí gồm nhiều bước có thứ tự, nhánh điều kiện, retry chi tiết, và có một bước cần con người phê duyệt (có thể mất vài giờ tới vài ngày) trước khi tiếp tục. Cần audit lịch sử từng bước. Giải pháp tối ưu nhất là gì?",
    "options": [
      "Step Functions Standard, dùng callback pattern waitForTaskToken cho bước human approval",
      "Step Functions Express, dùng state Wait cho bước phê duyệt",
      "Chuỗi Lambda gọi nhau trực tiếp, lưu trạng thái vào DynamoDB",
      "EventBridge choreography: mỗi service tự phản ứng với event mà không có điều phối trung tâm"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Workflow dài, có audit chi tiết, có human approval → Step Functions Standard với waitForTaskToken để chờ phản hồi bên ngoài rồi tiếp tục.\n✓ Standard + waitForTaskToken: hỗ trợ workflow tới 1 năm, lịch sử thực thi chi tiết, callback chờ người phê duyệt rồi resume.\n✗ Express + Wait: Express tối đa 5 phút và không lưu lịch sử thực thi chi tiết, không hợp cho phê duyệt kéo dài nhiều giờ/ngày.\n✗ Lambda gọi nhau + DynamoDB: tự xây orchestration thủ công, khó retry/branching/audit, dễ lỗi và Lambda tối đa 15 phút.\n✗ EventBridge choreography: không có điều phối trung tâm, khó theo dõi thứ tự/trạng thái và bước phê duyệt tuần tự.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "dva-m3-021",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một developer xây dựng hệ thống lưu file lớn (lớn hơn 4 KB) đã mã hóa lên S3 và phải audit mọi lần dữ liệu được giải mã. Những phát biểu nào về KMS và mã hóa là ĐÚNG? (Chọn 2)",
    "options": [
      "KMS Encrypt/Decrypt API chỉ xử lý tối đa 4 KB, nên file lớn phải dùng envelope encryption với GenerateDataKey",
      "Mọi lời gọi KMS được ghi vào CloudTrail, cho phép audit ai dùng key và lúc nào",
      "GenerateDataKey chỉ trả về encrypted data key, không trả plaintext",
      "SSE-C dùng KMS key để mã hóa và ghi audit qua CloudTrail",
      "Automatic rotation của customer managed key đổi cả key ID lẫn ARN sau mỗi chu kỳ"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Câu hỏi kiểm tra giới hạn 4 KB, audit qua CloudTrail và vài bẫy phổ biến.\n✓ KMS Encrypt/Decrypt giới hạn 4 KB; file lớn dùng GenerateDataKey (envelope encryption).\n✓ Mọi lời gọi KMS ghi vào CloudTrail, phục vụ audit việc dùng key.\n✗ GenerateDataKey trả CẢ plaintext lẫn encrypted data key (chỉ GenerateDataKeyWithoutPlaintext mới bỏ plaintext).\n✗ SSE-C không liên quan KMS; key do client cung cấp mỗi request.\n✗ Automatic rotation giữ nguyên key ID/ARN, chỉ đổi key material bên trong.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-022",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn tự động thêm một custom claim 'department' vào ID token mà Cognito User Pool phát hành, dựa trên thuộc tính người dùng, để API backend đọc và phân quyền. Cơ chế nào của Cognito User Pool nên dùng?",
    "options": [
      "Pre Token Generation Lambda trigger",
      "Pre Sign-up Lambda trigger",
      "Post Confirmation Lambda trigger",
      "Migrate User Lambda trigger"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pre Token Generation trigger cho phép thêm/sửa claim trong token ngay trước khi phát hành.\n✓ Pre Token Generation — đúng, tùy biến claim trong ID/access token.\n✗ Pre Sign-up — chạy khi đăng ký, để tự xác nhận/validate, không sửa token.\n✗ Post Confirmation — chạy sau khi xác nhận tài khoản, không liên quan token claim.\n✗ Migrate User — dùng khi di trú người dùng từ directory cũ, không sửa claim token.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-023",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer cần phân biệt rõ vai trò của Cognito User Pool và Identity Pool trong ứng dụng. Phát biểu nào mô tả ĐÚNG sự khác biệt cốt lõi?",
    "options": [
      "User Pool xử lý đăng nhập và phát hành JWT (authentication); Identity Pool đổi danh tính lấy temporary AWS credentials (authorization tới AWS)",
      "User Pool cấp temporary AWS credentials; Identity Pool phát hành JWT",
      "Cả hai đều phát hành JWT giống hệt nhau, chỉ khác tên",
      "Identity Pool dùng để đăng ký người dùng, User Pool chỉ để gọi dịch vụ AWS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đây là bẫy kinh điển: User Pool = token/xác thực, Identity Pool = AWS credentials.\n✓ User Pool phát hành JWT, Identity Pool cấp AWS credentials — đúng, phân vai trò chuẩn.\n✗ User Pool cấp AWS credentials — sai, đó là việc của Identity Pool.\n✗ Cả hai phát hành JWT giống nhau — sai, chỉ User Pool phát hành JWT người dùng.\n✗ Đảo vai trò đăng ký/gọi dịch vụ — sai hoàn toàn về chức năng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-024",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một IAM user đã có IAM policy cho phép kms:Decrypt trên một customer managed key, nhưng khi gọi Decrypt vẫn nhận AccessDenied. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "User cần bật MFA mới gọi được KMS API",
      "Key policy của KMS key chưa cấp quyền cho user/account đó nên IAM policy không có hiệu lực",
      "KMS key chưa bật automatic rotation",
      "User đang gọi sai Region nên KMS từ chối"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Với KMS, key policy là cổng chính; nếu key policy không mở, IAM policy vô dụng.\n✓ Key policy phải cho phép account (thường qua dòng root) thì IAM policy mới có hiệu lực.\n✗ MFA không phải yêu cầu mặc định để gọi KMS API.\n✗ Rotation không liên quan tới quyền Decrypt; data cũ vẫn giải mã được.\n✗ Sai Region trả lỗi NotFound/khác, không phải AccessDenied do quyền, và đề nói user có policy đúng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-025",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ALB cần phục vụ HTTPS cho ứng dụng public và đội vận hành không muốn lo việc gia hạn chứng chỉ thủ công. Đồng thời backend microservice nội bộ (không expose internet) cần chứng chỉ TLS riêng. Cặp giải pháp nào đúng?",
    "options": [
      "ACM public certificate cho ALB; AWS Private CA cho microservice nội bộ",
      "AWS Private CA cho ALB; ACM public certificate cho microservice nội bộ",
      "Self-signed cert cho ALB; ACM public certificate cho microservice nội bộ",
      "ACM public certificate cho cả hai vì nó miễn phí"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Public HTTPS dùng ACM public cert; chứng chỉ nội bộ dùng Private CA.\n✓ ACM public certificate cho ALB (miễn phí, tự gia hạn, được trình duyệt tin cậy); Private CA cấp chứng chỉ nội bộ cho microservice.\n✗ Đảo ngược: Private CA cho ALB public sẽ không được trình duyệt công cộng tin cậy.\n✗ Self-signed trên ALB gây cảnh báo bảo mật cho người dùng.\n✗ ACM public cert không phù hợp cho microservice nội bộ không expose internet; nên dùng Private CA.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-026",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Tổ chức cần chia sẻ một secret (license key dùng chung) từ Account A cho ứng dụng chạy ở Account B. Cách đúng để cho phép cross-account access tới secret trong Secrets Manager?",
    "options": [
      "Gắn resource policy lên secret cho phép principal của Account B, và cấp quyền KMS key tương ứng cho Account B",
      "Copy secret thành environment variable rồi gửi qua email cho team Account B",
      "Bật public access cho secret để mọi account đọc được",
      "Tạo IAM user trong Account A và chia sẻ access key cho Account B"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cross-account secret cần resource-based policy trên secret và quyền dùng KMS key (phải là customer managed key, không dùng default AWS managed key).\n✓ Resource policy cho phép principal Account B kèm quyền dùng customer managed KMS key là cách chuẩn cho cross-account.\n✗ Gửi secret qua email là rò rỉ dữ liệu nhạy cảm, không phải giải pháp kỹ thuật.\n✗ Secrets Manager không có chế độ public access; phơi bày secret là sai hoàn toàn.\n✗ Chia sẻ access key của IAM user là anti-pattern, vi phạm least privilege và khó audit.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-027",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một SPA (single-page app) dùng Cognito Hosted UI với OAuth 2.0. Access token có hiệu lực 1 giờ và đã hết hạn, nhưng người dùng vẫn đang trong phiên làm việc dài. Ứng dụng cần lấy access token mới mà KHÔNG bắt người dùng đăng nhập lại. Cách đúng là gì?",
    "options": [
      "Dùng refresh token để yêu cầu access token và ID token mới",
      "Dùng access token cũ để tự gia hạn chính nó",
      "Gọi STS GetSessionToken để tạo access token mới",
      "Tải lại JWKS endpoint để làm mới chữ ký token"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Refresh token được dùng để lấy access/ID token mới khi chúng hết hạn, tránh đăng nhập lại.\n✓ Refresh token — đúng, đổi lấy token mới trong thời gian refresh token còn hiệu lực.\n✗ Access token cũ tự gia hạn — token JWT đã hết hạn không thể tự làm mới.\n✗ STS GetSessionToken — cấp AWS credentials, không liên quan token User Pool.\n✗ Tải lại JWKS — JWKS chỉ là khóa public để verify chữ ký, không tạo token mới.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-028",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng cần cho phép người dùng dùng thử các tính năng cơ bản (ví dụ tải vài ảnh mẫu từ S3) mà KHÔNG cần đăng nhập, nhưng vẫn phải gọi dịch vụ AWS một cách an toàn bằng quyền hạn chế. Tính năng nào của Cognito hỗ trợ điều này?",
    "options": [
      "Unauthenticated (guest) access của Identity Pool với IAM role quyền tối thiểu",
      "Hosted UI ở chế độ ẩn danh của User Pool",
      "Refresh token vô thời hạn của User Pool",
      "API key public của API Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Identity Pool có unauthenticated role cho phép guest gọi AWS với quyền hạn chế mà không cần đăng nhập.\n✓ Unauthenticated guest access — đúng, cấp temporary credentials hạn chế cho khách.\n✗ Hosted UI ẩn danh — Hosted UI dùng để đăng nhập, không có chế độ guest cấp AWS credentials.\n✗ Refresh token vô thời hạn — không liên quan và không phải cơ chế guest.\n✗ API key public — chỉ định danh client, không cấp quyền gọi dịch vụ AWS an toàn.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-029",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The security team requires that every time an object in S3 is decrypted, it must be audited (who, when), and they need to control key policy and rotation. Which S3 encryption option best meets the requirements?",
    "options": [
      "SSE-S3 with aws/s3 key managed by AWS",
      "SSE-KMS with customer-managed key",
      "SSE-C with key provided by client per request",
      "Client-side encryption with AWS Encryption SDK"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Yêu cầu audit từng lần dùng key cộng kiểm soát key policy và rotation chỉ thỏa với SSE-KMS dùng customer managed key.\n✓ SSE-KMS với customer managed key ghi mọi lần Decrypt/GenerateDataKey vào CloudTrail, cho kiểm soát key policy và rotation.\n✗ SSE-S3 dùng key AWS quản lý, không cho kiểm soát key policy/rotation chi tiết.\n✗ SSE-C không liên quan KMS, không có audit qua CloudTrail cho việc dùng key.\n✗ Client-side encryption khả thi nhưng phức tạp hơn và không phải lựa chọn tối ưu khi chỉ cần audit phía S3/KMS.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-030",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong luồng envelope encryption, sau khi gọi GenerateDataKey và dùng plaintext data key để mã hóa file, đâu là bước xử lý đúng với best practice?",
    "options": [
      "Lưu cả plaintext data key lẫn encrypted data key cạnh file để giải mã nhanh sau này",
      "Xóa plaintext data key khỏi bộ nhớ ngay sau khi mã hóa xong, chỉ lưu encrypted data key (CiphertextBlob) cạnh file",
      "Gửi plaintext data key lên KMS để KMS lưu hộ",
      "Lưu plaintext data key vào file mã hóa rồi gửi cả lên S3"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bí quyết bảo mật của envelope encryption: không bao giờ lưu plaintext data key.\n✓ Xóa plaintext data key khỏi RAM ngay sau khi dùng, chỉ lưu encrypted data key cạnh file; khi cần thì gọi Decrypt để lấy lại plaintext key.\n✗ Lưu cả plaintext data key phá vỡ bảo mật vì lộ key thật.\n✗ KMS không lưu data key của bạn; KMS chỉ giữ CMK.\n✗ Nhúng plaintext data key vào dữ liệu rồi gửi đi làm lộ key hoàn toàn.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-031",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng multi-tenant SaaS lưu dữ liệu của nhiều khách hàng trong cùng một DynamoDB table, mỗi item có thuộc tính tenantId làm partition key. Yêu cầu: mỗi tenant chỉ truy cập được dữ liệu của mình, dùng IAM một cách tối ưu nhất. Giải pháp đúng?",
    "options": [
      "Dùng IAM policy với điều kiện dynamodb:LeadingKeys ràng buộc theo tenantId (partition key) để giới hạn truy cập theo tenant",
      "Tạo một IAM user riêng và một bảng DynamoDB riêng cho mỗi tenant",
      "Cho tất cả tenant dùng chung một IAM role với quyền full access và lọc dữ liệu ở phía client",
      "Mã hoá mỗi item bằng một KMS key riêng cho từng tenant và bỏ qua IAM"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Điều kiện dynamodb:LeadingKeys cho phép giới hạn truy cập theo partition key value, lý tưởng cho fine-grained multi-tenant.\n✓ dynamodb:LeadingKeys ràng buộc truy cập theo giá trị partition key (tenantId), thực thi cô lập tenant ở tầng IAM.\n✗ Tạo bảng và user riêng cho mỗi tenant không mở rộng được khi số tenant lớn.\n✗ Lọc ở client với quyền full access không an toàn vì IAM vẫn cho phép đọc dữ liệu tenant khác.\n✗ Mã hoá per-tenant không thay thế được kiểm soát truy cập IAM; vẫn cần authorization ở tầng API.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-032",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer cấu hình REST API trên Amazon API Gateway và muốn API tự động kiểm tra JWT do Cognito User Pool phát hành (kiểm tra chữ ký, issuer, hết hạn) mà không phải viết code xác thực thủ công. Họ muốn cấu hình đơn giản nhất, ít code nhất. Giải pháp nào phù hợp?",
    "options": [
      "Dùng Cognito authorizer của API Gateway, trỏ tới User Pool",
      "Viết Lambda authorizer tự tải JWKS và verify chữ ký JWT thủ công",
      "Bật IAM authorization và ký request bằng SigV4",
      "Dùng API key gắn vào usage plan để kiểm soát truy cập"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito authorizer tích hợp sẵn với User Pool và tự verify JWT, ít cấu hình và không cần code.\n✓ Cognito authorizer — đúng, tự kiểm tra token User Pool, đơn giản nhất.\n✗ Lambda authorizer thủ công — chạy được nhưng phải tự viết logic verify/JWKS, nhiều code không cần thiết.\n✗ IAM authorization/SigV4 — dùng cho danh tính IAM/credentials, không xác thực JWT người dùng cuối.\n✗ API key — chỉ để định danh client và throttling, không xác thực người dùng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-033",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-01-auth",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng dùng Cognito User Pool. Developer thấy access token chứa scope như 'aws.cognito.signin.user.admin' và các custom scope của resource server, còn ID token thì chứa email, name. Khi gọi một resource server tự định nghĩa với OAuth scopes để phân quyền, token nào nên được gửi đi?",
    "options": [
      "Access token vì nó mang OAuth scopes dùng để authorize",
      "ID token vì nó mang thông tin danh tính người dùng",
      "Refresh token vì nó tồn tại lâu nhất",
      "Bất kỳ token nào cũng được vì cả ba đều là JWT"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Access token mang scope để authorize truy cập resource server; ID token để authenticate danh tính.\n✓ Access token — đúng, chứa OAuth scopes dùng cho authorization tới resource server.\n✗ ID token — dùng để xác thực danh tính, không chứa scope authorize resource server theo chuẩn.\n✗ Refresh token — chỉ để đổi token mới, không gọi resource server.\n✗ Bất kỳ token nào — sai, mỗi loại token có mục đích riêng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-034",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Công ty muốn KMS key tự động đổi key material định kỳ mà không cần sửa code ứng dụng hay cập nhật alias. Cấu hình nào đáp ứng?",
    "options": [
      "Bật automatic key rotation trên một customer managed symmetric key",
      "Thực hiện manual rotation: tạo key mới và cập nhật alias trỏ sang",
      "Dùng AWS owned key vì nó tự rotate",
      "Import key material mới mỗi năm vào cùng key"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Automatic rotation đổi key material nhưng giữ nguyên key ID/ARN nên ứng dụng không phải sửa gì.\n✓ Automatic rotation trên customer managed symmetric key: key ID không đổi, AWS tự sinh material mới, không cần sửa code/alias.\n✗ Manual rotation buộc cập nhật alias trỏ sang key mới, ứng dụng có thể cần điều chỉnh.\n✗ AWS owned key bạn không kiểm soát và thường không thấy trong account.\n✗ Import material thủ công không phải cách tự động và phức tạp.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-035",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-02-encryption",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "The DevOps team needs to share an encrypted EBS snapshot (with customer-managed KMS key) to another AWS account so that account can restore the volume. Besides sharing the snapshot, what else needs to be done for the other account to decrypt?",
    "options": [
      "No additional steps needed, sharing the snapshot is sufficient",
      "Update the KMS key policy to allow the other account to use the key (kms:Decrypt, kms:CreateGrant...) and share the snapshot",
      "Convert the snapshot to SSE-S3 before sharing",
      "Enable automatic rotation for the KMS key"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Snapshot mã hóa cần cả quyền dùng KMS key ở account đích.\n✓ Phải sửa key policy của KMS key cho phép account kia (kms:Decrypt, kms:CreateGrant...) ngoài việc share snapshot, nếu không account kia không decrypt được.\n✗ Chỉ share snapshot mà không share quyền key thì account kia không giải mã được.\n✗ SSE-S3 không liên quan tới snapshot EBS.\n✗ Rotation không cấp quyền cross-account.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-036",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer muốn mã hoá các environment variable của Lambda chứa thông tin nhạy cảm bằng customer managed KMS key, và giải mã ngay trong handler bằng encryption helper. Cấu hình nào đúng?",
    "options": [
      "Bật 'Enable helpers for encryption in transit' trên env var, dùng customer managed KMS key, và gọi kms:Decrypt trong code khi khởi tạo",
      "Để Lambda dùng KMS key mặc định và đọc env var trực tiếp là đã được mã hoá in transit",
      "Lưu giá trị nhạy cảm vào /tmp của Lambda rồi đọc lại",
      "Đặt giá trị nhạy cảm vào Lambda layer và import lúc runtime"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Encryption helpers mã hoá env var bằng customer managed key; code dùng kms:Decrypt để giải mã in-memory lúc khởi tạo.\n✓ Bật encryption helper với customer managed key và gọi kms:Decrypt trong code là cách chuẩn để bảo vệ env var nhạy cảm.\n✗ Lambda mặc định đã mã hoá env var at rest, nhưng giá trị vẫn hiện plaintext trong console; cần helper và customer managed key để mã hoá in transit.\n✗ Ghi vào /tmp không mã hoá và không giải quyết vấn đề bảo mật env var.\n✗ Lambda layer lưu code/thư viện, không phải nơi an toàn để giấu secret.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-037",
    "courseId": "DVA-C02",
    "lesson": "dva-d2-03-secrets",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn muốn nhận thông báo và tự động hoá khi một secret trong Secrets Manager sắp tới hạn rotation hoặc khi rotation thất bại. Cách giám sát phù hợp nhất?",
    "options": [
      "Dùng EventBridge bắt sự kiện từ Secrets Manager/CloudTrail và CloudWatch Alarm để cảnh báo khi rotation thất bại",
      "Bật S3 access logging trên bucket chứa secret",
      "Dùng VPC Flow Logs để theo dõi truy cập vào secret",
      "Tạo một cron job trên EC2 đọc secret mỗi phút để kiểm tra"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giám sát rotation dùng EventBridge/CloudTrail events kết hợp CloudWatch để cảnh báo và tự động hoá.\n✓ EventBridge bắt sự kiện rotation và CloudWatch Alarm cảnh báo khi thất bại là cách giám sát chuẩn, không tốn polling.\n✗ Secrets không lưu trong S3 nên S3 access logging không liên quan.\n✗ VPC Flow Logs ghi lưu lượng mạng, không phản ánh trạng thái rotation của secret.\n✗ Cron đọc secret mỗi phút gây tốn API call và không phát hiện được lỗi rotation hiệu quả.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "dva-m3-038",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một đội triển khai Lambda production dùng CodeDeploy canary và muốn cơ chế rollback an toàn cùng kiểm thử trước khi shift. Những thành phần/khái niệm nào sau đây ĐÚNG và nên áp dụng? (Chọn 2)",
    "options": [
      "Gắn CloudWatch alarm vào deployment group để CodeDeploy tự rollback khi alarm ALARM trong lúc canary",
      "Dùng BeforeAllowTraffic và AfterAllowTraffic Lambda hooks để chạy validation trước/sau khi cho traffic",
      "Để client gọi trực tiếp $LATEST nhằm luôn nhận version mới nhất trong production",
      "Đặt traffic shifting trên chính số version thay vì alias để đơn giản hóa",
      "Bật API Gateway request validation để tự động rollback Lambda khi có lỗi 5xx"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "CodeDeploy Lambda dựa vào alias, alarm và lifecycle hooks.\n✓ CloudWatch alarm gắn vào deployment group cho phép automatic rollback trong canary.\n✓ BeforeAllowTraffic/AfterAllowTraffic hooks chạy hàm validation trước và sau khi shift traffic.\n✗ Gọi $LATEST trong production là anti-pattern, không cho phép traffic shifting có kiểm soát.\n✗ Traffic shifting hoạt động trên alias chứ không phải số version cố định.\n✗ API Gateway request validation chỉ kiểm tra schema request, không rollback Lambda.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-039",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một developer viết file template SAM để định nghĩa một Lambda function (AWS::Serverless::Function) và một API Gateway. Khi chạy sam deploy, CloudFormation báo lỗi không nhận diện được resource type AWS::Serverless::Function. Nguyên nhân nào KHẢ DĨ NHẤT?",
    "options": [
      "Template thiếu dòng Transform: AWS::Serverless-2016-10-31 ở cấp cao nhất",
      "Template thiếu section Resources",
      "Region chưa bật service AWS SAM",
      "Function thiếu thuộc tính Runtime"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SAM template được CloudFormation xử lý qua macro Transform để chuyển các resource AWS::Serverless::* thành resource CloudFormation chuẩn.\n✓ Thiếu Transform: AWS::Serverless-2016-10-31 khiến CloudFormation không biết cách diễn giải AWS::Serverless::Function\n✗ Thiếu Resources sẽ báo lỗi khác (template phải có Resources) chứ không phải lỗi không nhận diện resource type\n✗ Không có khái niệm bật service SAM theo region; SAM chỉ là framework trên CloudFormation\n✗ Thiếu Runtime cũng gây lỗi nhưng là lỗi validate thuộc tính, không phải lỗi unknown resource type",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-040",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Team có một dependency đặc thù cần kích thước lớn (>250 MB unzipped) và một runtime tùy biến không có sẵn. Họ muốn đóng gói Lambda function bằng công cụ container quen thuộc và đẩy lên ECR. Lựa chọn đóng gói nào phù hợp nhất?",
    "options": [
      "Đóng gói function dưới dạng container image (tối đa 10 GB) lưu ở ECR",
      "Tách dependency thành nhiều Lambda layer cộng dồn quá 250 MB",
      "Dùng zip deployment package upload qua S3",
      "Triển khai code lên EC2 và mô phỏng Lambda runtime"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Container image hỗ trợ artifact lớn và runtime tùy biến, vượt giới hạn của zip.\n✓ Container image cho Lambda hỗ trợ tới 10 GB và runtime tùy biến, lưu trên ECR, hợp nhu cầu\n✗ Layer cũng bị giới hạn tổng unzipped 250 MB cho cả function + layers nên không vượt được\n✗ Zip package bị giới hạn 250 MB unzipped, không đủ\n✗ Triển khai lên EC2 phá vỡ mô hình serverless và không phải đóng gói Lambda",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-041",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một developer triển khai một hàm Lambda qua CodeDeploy với canary deployment. Cần chạy một script kiểm tra phiên bản mới trước khi chuyển hoàn toàn traffic sang nó. Lifecycle hook nào của CodeDeploy (Lambda) nên dùng để validate trước khi shift traffic?",
    "options": [
      "BeforeAllowTraffic",
      "AfterAllowTraffic",
      "ApplicationStop",
      "DownloadBundle"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Deployment Lambda của CodeDeploy chỉ có hai hook: BeforeAllowTraffic và AfterAllowTraffic.\n✓ BeforeAllowTraffic chạy trước khi traffic được chuyển sang version mới, phù hợp để validate\n✗ AfterAllowTraffic chạy sau khi đã chuyển traffic, không validate trước được\n✗ ApplicationStop là hook của deployment EC2/on-premises, không áp dụng cho Lambda\n✗ DownloadBundle là sự kiện nội bộ trên EC2 agent, không phải hook cho Lambda",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-042",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một fintech yêu cầu: khi deploy Lambda version mới, chuyển 10% traffic ngay lập tức, theo dõi trong 10 phút, rồi nếu ổn thì chuyển 100%. Đây là canary deployment qua CodeDeploy. Họ chọn preset nào?",
    "options": [
      "CodeDeployDefault.LambdaCanary10Percent10Minutes",
      "CodeDeployDefault.LambdaLinear10PercentEvery10Minutes",
      "CodeDeployDefault.LambdaLinear10PercentEvery1Minute",
      "CodeDeployDefault.LambdaAllAtOnce"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Canary = chuyển một phần ngay, chờ rồi chuyển phần còn lại; linear = tăng đều theo bước.\n✓ LambdaCanary10Percent10Minutes shift 10% ngay, chờ 10 phút rồi shift nốt 90% — đúng mô tả.\n✗ Linear10PercentEvery10Minutes tăng dần 10% mỗi 10 phút (mất khoảng 90 phút), không phải canary hai bước.\n✗ Linear10PercentEvery1Minute cũng là tăng dần đều, không phải canary.\n✗ AllAtOnce chuyển 100% ngay, không có giai đoạn canary.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-043",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Team muốn lưu lại toàn bộ cấu hình của một environment Beanstalk (instance type, env variables, option settings) để sau này tạo nhanh các environment mới giống hệt và đưa cấu hình vào source control. Tính năng nào phù hợp nhất?",
    "options": [
      "Saved configurations (lưu dưới dạng template cấu hình của application)",
      "Snapshot EBS của các instances trong environment",
      "CloudWatch Logs export định kỳ",
      "Tạo một AMI từ instance hiện tại và clone bằng AMI đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần lưu và tái sử dụng cấu hình environment, đưa vào source control.\n✓ Saved configurations: lưu option settings/cấu hình của environment thành template gắn với application, có thể tạo environment mới từ template và quản lý qua thư mục .elasticbeanstalk, phù hợp source control.\n✗ Snapshot EBS: chỉ sao lưu dữ liệu disk, không lưu cấu hình environment.\n✗ CloudWatch Logs export: chỉ lưu log, không phải cấu hình.\n✗ Tạo AMI và clone: lưu image hệ điều hành chứ không lưu option settings/env variables của Beanstalk một cách quản lý được.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-044",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi một stack được deploy, một kỹ sư đã sửa thủ công Security Group của một EC2 instance qua console. Team muốn phát hiện những thay đổi ngoài-template như vậy. CloudFormation cung cấp cơ chế nào?",
    "options": [
      "Drift detection để so sánh cấu hình thực tế với template",
      "Change set so sánh trạng thái stack",
      "Stack policy chặn mọi thay đổi thủ công",
      "Fn::ImportValue kiểm tra tính toàn vẹn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Drift detection xác định resource đã bị thay đổi ngoài CloudFormation.\n✓ Drift detection báo cáo từng resource có cấu hình lệch (DRIFTED) so với template đã deploy\n✗ Change set dùng để xem trước thay đổi của một update, không phát hiện sửa đổi thủ công đã xảy ra\n✗ Stack policy giới hạn update qua CloudFormation, không ngăn được sửa trực tiếp trên resource và không phát hiện drift\n✗ Fn::ImportValue là hàm tham chiếu giá trị, không liên quan kiểm tra toàn vẹn",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-045",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Build của một ứng dụng Java mất nhiều thời gian vì CodeBuild tải lại toàn bộ Maven dependency mỗi lần. Cách tối ưu nhất để rút ngắn thời gian build mà chỉ thay đổi cấu hình CodeBuild là gì?",
    "options": [
      "Bật CodeBuild local/S3 caching và khai báo thư mục .m2 trong mục cache của buildspec.yml",
      "Tăng compute type của CodeBuild lên loại lớn nhất để tải dependency nhanh hơn",
      "Chuyển toàn bộ dependency vào Docker image custom rồi rebuild image mỗi lần build",
      "Đặt dependency vào output artifact của stage trước và truyền sang stage build"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeBuild hỗ trợ caching để tái sử dụng dependency giữa các lần build.\n✓ Bật caching (local hoặc S3) và khai báo path .m2 trong phần cache của buildspec giúp tái sử dụng dependency, giảm thời gian build\n✗ Tăng compute type tốn chi phí và không giải quyết việc tải lại dependency\n✗ Rebuild Docker image mỗi lần build vẫn tốn thời gian và phức tạp\n✗ Truyền dependency qua artifact giữa stage không phải cơ chế cache dependency tiêu chuẩn và dễ lỗi",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-046",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một Lambda function được gọi qua một alias tên PROD. Developer muốn chuyển dần 10% lưu lượng sang version mới mà KHÔNG cần đổi cấu hình ở phía client gọi function. Cách làm đúng là gì?",
    "options": [
      "Cấu hình weighted alias trên alias PROD, trỏ 90% sang version cũ và 10% sang version mới",
      "Tạo một alias mới và yêu cầu client gọi cả hai alias",
      "Publish version mới và cho client gọi trực tiếp số version mới với 10% request",
      "Dùng $LATEST cho cả hai version và để client tự phân bổ traffic"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Weighted alias cho phép một alias chia traffic giữa hai version mà client không đổi gì.\n✓ Cấu hình tỷ trọng (additional version weight) trên alias PROD giúp shift 10% traffic mà client vẫn gọi cùng alias.\n✗ Tạo alias mới buộc client phải thay đổi cách gọi.\n✗ Gọi trực tiếp số version cũng buộc client thay đổi và không phải best practice.\n✗ $LATEST không thể gán weight và không nên dùng cho production.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-047",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng EC2 trong Auto Scaling group triển khai qua CodeDeploy. Doanh nghiệp muốn quá trình deploy không bao giờ làm giảm số instance phục vụ traffic, đồng thời mỗi version mới chạy trên instance hoàn toàn mới để tránh trạng thái cũ tồn dư. Cấu hình CodeDeploy nào phù hợp?",
    "options": [
      "Blue/green deployment với CodeDeploy provisioning instance mới rồi chuyển traffic qua Load Balancer",
      "In-place deployment với CodeDeployDefault.AllAtOnce",
      "In-place deployment với OneAtATime trên chính các instance hiện có",
      "All-at-once với hook tự dọn dẹp file cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu instance hoàn toàn mới và không giảm capacity hướng tới blue/green.\n✓ Blue/green của CodeDeploy tạo instance mới (môi trường green), kiểm tra rồi reroute traffic qua ELB, giữ capacity và loại bỏ trạng thái cũ.\n✗ In-place AllAtOnce cập nhật tại chỗ, có downtime và vẫn là instance cũ.\n✗ In-place OneAtATime vẫn deploy lên instance hiện có, không phải instance mới hoàn toàn.\n✗ All-at-once kèm dọn file không đảm bảo instance mới và không giữ capacity.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-048",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một team dùng AWS SAM. Họ muốn nhiều Lambda function trong cùng template đều có chung Runtime, Timeout=30 và một biến môi trường LOG_LEVEL=INFO mà không phải lặp lại cấu hình ở từng function. Cách TỐI ƯU nhất là gì?",
    "options": [
      "Khai báo các giá trị mặc định trong section Globals của template SAM",
      "Tạo một CloudFormation nested stack riêng cho mỗi function",
      "Dùng Fn::FindInMap để map cấu hình rồi GetAtt vào từng function",
      "Định nghĩa một Lambda layer chứa cấu hình Runtime và Timeout"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SAM cung cấp section Globals để đặt thuộc tính chung cho tất cả resource cùng loại, tránh lặp lại.\n✓ Globals: Function: cho phép đặt Runtime, Timeout, Environment chung; từng function vẫn override được\n✗ Nested stack cho mỗi function làm phức tạp không cần thiết và không giải quyết việc dùng chung cấu hình\n✗ FindInMap chỉ tra giá trị tĩnh, vẫn phải khai báo lặp ở mỗi function\n✗ Layer dùng để chia sẻ code/thư viện, không đặt được Runtime hay Timeout của function",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-049",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-01-packaging-iac",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng cần bật/tắt tính năng mới (feature flag) cho người dùng mà KHÔNG cần deploy lại Lambda, và muốn cập nhật cấu hình được kiểm soát, có validation và khả năng rollback. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS AppConfig với feature flags và deployment strategy",
      "Đặt feature flag trong biến môi trường Lambda và cập nhật qua CloudFormation",
      "Lưu cờ trong một CloudFormation parameter và update stack",
      "Dùng Lambda layer để chứa file cấu hình cờ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AppConfig quản lý cấu hình/feature flag tách rời khỏi vòng đời deploy code.\n✓ AppConfig hỗ trợ feature flags, validators, deployment strategy theo phần trăm và rollback dựa trên CloudWatch alarm, không cần deploy lại code\n✗ Biến môi trường Lambda thay đổi đòi hỏi update function (deploy lại cấu hình), thiếu validation/rollback tinh vi\n✗ CloudFormation parameter buộc update stack mỗi lần đổi cờ, không linh hoạt\n✗ Layer chứa file cờ vẫn cần publish version mới và cập nhật function",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-050",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-02-cicd",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Tổ chức muốn lưu trữ và chia sẻ các package npm và Maven nội bộ một cách an toàn, đồng thời proxy các public package. Dịch vụ AWS nào phù hợp nhất để tích hợp với CodeBuild?",
    "options": [
      "AWS CodeArtifact",
      "AWS CodeCommit",
      "Amazon ECR",
      "AWS CodePipeline"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeArtifact là dịch vụ quản lý artifact/package nội bộ.\n✓ CodeArtifact lưu trữ, chia sẻ package npm/Maven/PyPI và proxy public repository, tích hợp tốt với CodeBuild\n✗ CodeCommit là dịch vụ Git repository cho source code, không phải package manager\n✗ ECR dùng cho Docker container image, không phải npm/Maven package\n✗ CodePipeline là dịch vụ orchestration CI/CD, không lưu trữ package",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-051",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "The development team deploys Lambda via AWS CodeDeploy with the CodeDeployDefault.LambdaCanary10Percent5Minutes preset. They want to automatically rollback if the error rate increases during the canary phase. Which configuration achieves this?",
    "options": [
      "Associate a CloudWatch alarm monitoring error rate to the deployment group and enable automatic rollback when the alarm is triggered",
      "Enable CloudTrail logging and write a Lambda manually to revert the alias when seeing error logs",
      "Set reserved concurrency = 0 for the new version when errors occur",
      "Rely on API Gateway throttling to automatically block the failing version"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CodeDeploy hỗ trợ automatic rollback dựa trên CloudWatch alarm.\n✓ Gắn CloudWatch alarm (ví dụ Errors hoặc error rate) vào deployment group và bật rollback giúp CodeDeploy tự dịch alias về version cũ khi alarm ALARM.\n✗ CloudTrail dùng để audit, không phải để giám sát metric lỗi thời gian thực và rollback.\n✗ Reserved concurrency = 0 chỉ chặn invoke chứ không rollback traffic shifting.\n✗ API Gateway throttling không liên quan tới rollback của CodeDeploy.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-052",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-03-deploy-strategies",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Developer cấu hình DeploymentPreference cho Lambda trong SAM với Type là Canary10Percent5Minutes và một Alarm theo dõi lỗi. Trong giai đoạn 5 phút canary, alarm chuyển sang ALARM. Điều gì xảy ra?",
    "options": [
      "CodeDeploy tự động rollback, dịch alias về version cũ và đánh dấu deployment thất bại",
      "Deployment tiếp tục shift 100% vì 5 phút canary đã được lên lịch cố định",
      "Lambda tự xóa version mới và giữ nguyên 10% traffic",
      "API Gateway tự chuyển toàn bộ traffic sang stage cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Alarm gắn vào DeploymentPreference kích hoạt automatic rollback của CodeDeploy.\n✓ Khi alarm vào trạng thái ALARM trong canary, CodeDeploy dừng và rollback alias về version cũ, deployment báo Failed.\n✗ Deployment KHÔNG tiếp tục shift khi alarm kích hoạt; rollback được ưu tiên.\n✗ Lambda không tự xóa version; CodeDeploy chỉ chuyển alias về version cũ.\n✗ API Gateway không tham gia cơ chế rollback của CodeDeploy Lambda.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-053",
    "courseId": "DVA-C02",
    "lesson": "dva-d3-04-beanstalk",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một environment đang dùng policy Rolling thỉnh thoảng để lại các instances ở trạng thái không nhất quán khi một batch deploy thất bại giữa chừng, khiến traffic vẫn vào instances lỗi. Team muốn một policy mà nếu deploy thất bại thì instances đang phục vụ KHÔNG bị ảnh hưởng và rollback chỉ là hủy instances mới. Nên đổi sang policy nào?",
    "options": [
      "Immutable",
      "All at once",
      "Rolling với batch size lớn hơn",
      "Giữ Rolling nhưng tắt health check trong khi deploy"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vấn đề: Rolling deploy in-place nên lỗi giữa chừng làm instances đang phục vụ bị ảnh hưởng.\n✓ Immutable: deploy lên instances hoàn toàn mới; nếu lỗi chỉ cần xóa instances mới, instances cũ đang phục vụ không bị đụng tới, rollback an toàn nhất.\n✗ All at once: thay thế đồng loạt, lỗi gây downtime toàn bộ.\n✗ Rolling batch lớn hơn: vẫn in-place, lỗi vẫn ảnh hưởng instances đang chạy và còn rủi ro hơn.\n✗ Tắt health check: che giấu lỗi và làm traffic vào instances hỏng, nguy hiểm hơn.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "dva-m3-054",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một ứng dụng trên EC2 đã chạy X-Ray daemon và instrument đúng nhưng KHÔNG có trace nào xuất hiện. Những nguyên nhân nào sau đây có thể giải thích việc thiếu trace? (Chọn 2)",
    "options": [
      "IAM role của EC2 thiếu quyền xray:PutTraceSegments (và xray:PutTelemetryRecords)",
      "Sampling rule đặt reservoir = 0 và fixed rate = 0 nên không request nào được trace",
      "Annotation được khai báo bằng put_metadata thay vì put_annotation",
      "Service map chưa được publish lên CloudWatch Logs",
      "Subsegment được đặt tên trùng với tên segment cha"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Thiếu trace thường do thiếu IAM, daemon, hoặc sampling chặn hết.\n✓ Thiếu quyền xray:PutTraceSegments khiến daemon không gửi được segment lên X-Ray.\n✓ Sampling rule với reservoir=0 và rate=0 làm không request nào được lấy mẫu nên không có trace.\n✗ Dùng put_metadata chỉ làm dữ liệu không filter được, vẫn có trace.\n✗ Service map tự sinh từ trace, không cần publish lên Logs.\n✗ Trùng tên subsegment không ngăn trace xuất hiện.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-055",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một Lambda function chạy thành công (trả về kết quả đúng) nhưng team không thấy bất kỳ dòng log nào trong CloudWatch Logs. Nguyên nhân khả dĩ nhất là gì?",
    "options": [
      "Execution role của Lambda thiếu các quyền logs:CreateLogGroup, logs:CreateLogStream và logs:PutLogEvents",
      "Log group /aws/lambda/<function-name> đã hết hạn retention nên log bị xóa ngay",
      "Function chưa được bật detailed monitoring nên không ghi log",
      "Cần cấu hình subscription filter thì Lambda mới ghi được log"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda tự ghi log qua console.log/print nhưng cần quyền IAM trong execution role.\n✓ Thiếu logs:CreateLogGroup/CreateLogStream/PutLogEvents khiến function chạy ok nhưng không ghi được log.\n✗ Retention chỉ quyết định thời gian giữ log đã ghi, không chặn việc ghi.\n✗ Detailed monitoring là khái niệm của metric EC2, không liên quan ghi log Lambda.\n✗ Subscription filter chỉ stream log đã có đi nơi khác, không phải điều kiện để ghi log.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-056",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer tạo metric filter với pattern ERROR trên một log group đã chạy nhiều tuần, rồi tạo alarm trên metric đó. Vài phút sau alarm ở trạng thái INSUFFICIENT_DATA và không thấy số liệu cho khoảng thời gian trước khi tạo filter. Giải thích đúng là gì?",
    "options": [
      "Metric filter chỉ áp dụng cho log event MỚI ghi sau khi tạo, không hồi tố log cũ",
      "Metric filter cần bật detailed monitoring mới phát ra số liệu",
      "Pattern ERROR phải viết dưới dạng JSON thì mới khớp được log",
      "Alarm cần composite alarm thì mới đọc được metric từ metric filter"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Metric filter không hồi tố: chỉ xử lý log ghi vào sau khi filter được tạo.\n✓ Vì vậy không có data cho khoảng trước đó; muốn phân tích log cũ phải dùng Logs Insights.\n✗ Detailed monitoring không liên quan đến metric filter.\n✗ Pattern term như ERROR vẫn khớp được, không bắt buộc JSON.\n✗ Composite alarm không phải điều kiện để đọc metric từ metric filter.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-057",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Kiến trúc: API Gateway -> Lambda A (đã bật Active tracing) -> gửi message vào SQS -> Lambda B (đã bật Active tracing) xử lý. Trên service map, trace bị đứt giữa Lambda A và Lambda B dù cả hai đều có trace riêng. Cách đúng để nối liền trace qua SQS là gì?",
    "options": [
      "Truyền trace context của X-Ray qua message attribute của SQS để Lambda B tiếp tục cùng trace",
      "Bật Active tracing trên SQS queue để SQS tự nối hai segment",
      "Ghi cùng một annotation traceId thủ công ở Lambda A và Lambda B",
      "Tăng sampling rate lên 100% để X-Ray tự liên kết hai Lambda"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Để trace liên tục qua message queue, trace header phải được truyền qua message; SQS hỗ trợ truyền trace context qua message system attribute.\n✓ Truyền X-Ray trace context qua message attribute giúp Lambda B kế thừa cùng trace ID.\n✗ SQS không có tùy chọn Active tracing để tự nối segment.\n✗ Ghi annotation trùng tay không tạo liên kết parent/child thật trong trace.\n✗ Tăng sampling không giải quyết việc đứt context qua queue.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-058",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một website dùng CloudFront. Backend trả nội dung khác nhau tùy ngôn ngữ trong header Accept-Language và tham số ?currency. Hiện tại người dùng đôi khi nhận nội dung sai ngôn ngữ/tiền tệ do cache. Cần cấu hình gì để cache đúng mà vẫn giữ hit rate hợp lý?",
    "options": [
      "Dùng cache policy đưa Accept-Language và query string currency vào cache key",
      "Đặt TTL = 0 để CloudFront luôn bỏ qua cache",
      "Forward toàn bộ mọi header và mọi cookie vào origin",
      "Tắt CloudFront và phục vụ trực tiếp từ origin"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFront phục vụ nội dung khác nhau theo cache key; nếu key không bao gồm yếu tố quyết định nội dung thì người dùng nhận bản cache sai.\n✓ Cache policy đưa header và query string cần thiết vào cache key — đúng, tách cache theo ngôn ngữ và tiền tệ mà vẫn cache hiệu quả.\n✗ TTL = 0 — vô hiệu hóa cache, mất lợi ích CDN và tăng tải origin.\n✗ Forward toàn bộ header/cookie — làm cache key quá phân mảnh, hit rate sụt giảm nghiêm trọng.\n✗ Tắt CloudFront — mất hoàn toàn lợi ích caching/CDN.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-059",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Team đang nhận quá nhiều cảnh báo lẻ và chỉ muốn được thông báo khi CẢ HAI điều kiện cùng đúng: CPU cao VÀ latency cao. Giải pháp tối ưu là gì?",
    "options": [
      "Tạo composite alarm kết hợp hai alarm bằng logic AND",
      "Tăng evaluation periods của cả hai alarm để giảm noise",
      "Gộp hai metric vào một metric filter duy nhất",
      "Tạo một alarm trên metric math cộng CPU và latency lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Composite alarm kết hợp nhiều alarm bằng logic AND/OR để giảm noise.\n✓ Composite alarm với ALARM(HighCPU) AND ALARM(HighLatency) chỉ báo khi cả hai cùng đúng.\n✗ Tăng evaluation periods chỉ làm chậm cảnh báo, không kết hợp điều kiện.\n✗ Metric filter tạo metric từ log, không kết hợp hai metric độc lập theo logic.\n✗ Cộng CPU và latency bằng metric math là vô nghĩa về đơn vị và không thể hiện logic AND.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-060",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong một service đã instrument, developer muốn bao một lời gọi tới database PostgreSQL thành một đơn vị thời gian riêng bên trong segment của request để biết câu query mất bao lâu. Cấu trúc X-Ray phù hợp là gì?",
    "options": [
      "Tạo một subsegment bao quanh lời gọi database bên trong segment hiện tại",
      "Tạo một segment mới riêng cho mỗi câu query database",
      "Ghi thời gian query vào một annotation và bỏ qua subsegment",
      "Tạo một service map node thủ công cho PostgreSQL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Segment đại diện cho công việc của toàn service; subsegment chia nhỏ công việc bên trong (vd downstream call).\n✓ Subsegment bao quanh lời gọi database cho phép đo riêng thời gian query trong segment.\n✗ Mỗi service tạo một segment cho request, không tạo segment mới cho từng query.\n✗ Annotation chỉ lưu giá trị filter được, không thay thế được việc đo thời gian như subsegment.\n✗ Node service map được tự sinh từ trace, không tạo thủ công.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-061",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng đọc nhiều từ DynamoDB với các truy vấn key lặp lại và cần độ trễ microsecond cho read, đồng thời giữ nguyên DynamoDB API hiện có với thay đổi code tối thiểu. Giải pháp caching nào phù hợp nhất?",
    "options": [
      "Amazon DynamoDB Accelerator (DAX)",
      "ElastiCache for Redis với lazy loading do ứng dụng tự quản lý",
      "ElastiCache for Memcached đặt trước DynamoDB",
      "Bật DynamoDB Global Tables ở một Region thứ hai"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần cache microsecond, tích hợp sẵn với DynamoDB và ít sửa code.\n✓ DAX — đúng, là cache in-memory write-through chuyên cho DynamoDB, tương thích API DynamoDB nên hầu như không phải đổi code, độ trễ microsecond.\n✗ ElastiCache for Redis tự quản lý — chạy được nhưng phải tự viết logic cache, đổi nhiều code và đạt độ trễ millisecond chứ không microsecond cho mẫu này.\n✗ ElastiCache for Memcached — tương tự, phải tự quản lý cache và không tích hợp gốc với DynamoDB.\n✗ Global Tables — phục vụ multi-Region/độ sẵn sàng, không phải để giảm độ trễ đọc bằng cache.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-062",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-01-observability",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng dùng PutMetricData và đặt dimension userId (giá trị duy nhất cho mỗi người dùng) với hàng triệu user. Hệ quả chính là gì và nên sửa thế nào?",
    "options": [
      "Mỗi tổ hợp dimension tạo một custom metric riêng tính phí riêng → chi phí nổ; nên dùng dimension cardinality thấp như Env/Region",
      "Metric sẽ bị throttle vì vượt giới hạn 30 dimensions cho mỗi metric",
      "Dữ liệu vẫn gộp chung thành một metric duy nhất, không ảnh hưởng chi phí",
      "CloudWatch tự động bỏ qua các dimension cardinality cao nên không vấn đề gì"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi tổ hợp dimension khác nhau là một time series/metric riêng và tính phí riêng.\n✓ userId cardinality cao tạo hàng triệu custom metric → chi phí lớn; nên chọn dimension cardinality thấp.\n✗ Giới hạn 30 là số dimension cho một metric, không phải số giá trị; vấn đề ở đây là cardinality.\n✗ Các dimension khác nhau KHÔNG gộp chung; mỗi tổ hợp là metric riêng.\n✗ CloudWatch không tự bỏ qua dimension cardinality cao.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-063",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-02-xray",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một API có lưu lượng rất lớn. Đội ngũ muốn vẫn nhìn được bức tranh đại diện về hiệu năng trên X-Ray nhưng GIẢM chi phí và lượng dữ liệu trace thu thập. Giải pháp đúng nhất là gì?",
    "options": [
      "Cấu hình sampling rule để chỉ thu thập một phần request (vd 1 req/giây + 5% phần còn lại)",
      "Tắt hoàn toàn X-Ray vào giờ cao điểm rồi bật lại lúc thấp điểm",
      "Chuyển toàn bộ annotation sang metadata để giảm dung lượng trace",
      "Tăng kích thước buffer của X-Ray daemon để gộp segment lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sampling rule kiểm soát tỉ lệ request được trace, là cách chuẩn để giảm chi phí mà vẫn có dữ liệu đại diện.\n✓ Đặt reservoir (vd 1 req/giây) cộng fixed rate (vd 5%) giảm khối lượng trace và chi phí.\n✗ Tắt/bật thủ công gây mất dữ liệu lúc cao điểm và khó vận hành.\n✗ Chuyển annotation sang metadata làm mất khả năng filter, không phải cách giảm số trace.\n✗ Buffer daemon không giảm số trace gửi lên X-Ray.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-064",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng có 200 hàm Lambda dùng chung account concurrency limit là 1000. Một hàm xử lý thanh toán quan trọng thỉnh thoảng bị throttle vì các hàm khác chiếm hết concurrency. Developer muốn ĐẢM BẢO hàm thanh toán luôn có sẵn một lượng concurrency riêng mà không bị các hàm khác lấn át. Giải pháp nào phù hợp nhất?",
    "options": [
      "Cấu hình reserved concurrency cho hàm thanh toán",
      "Cấu hình provisioned concurrency cho tất cả 200 hàm",
      "Tăng memory của hàm thanh toán lên tối đa 10240 MB",
      "Đặt một SQS queue trước hàm thanh toán với batch size lớn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu là dành riêng một phần concurrency để hàm quan trọng không bị các hàm khác chiếm hết.\n✓ Reserved concurrency — đúng, dành riêng một phần concurrency cho hàm đó, đồng thời giới hạn các hàm khác không vượt quá phần còn lại.\n✗ Provisioned concurrency cho tất cả — tốn kém và không giải quyết việc phân bổ riêng phần concurrency để chống tranh chấp.\n✗ Tăng memory — cải thiện CPU/tốc độ nhưng không đảm bảo concurrency riêng, không chống throttle.\n✗ SQS với batch lớn — chỉ đệm request, không đảm bảo concurrency riêng và còn làm tăng độ trễ thanh toán.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-m3-065",
    "courseId": "DVA-C02",
    "lesson": "dva-d4-03-optimization",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một developer đặt provisioned concurrency = 50 cho một hàm Lambda nhưng vào giờ cao điểm hàm vẫn thỉnh thoảng có cold start trong CloudWatch. Nguyên nhân khả dĩ nhất và cách khắc phục đúng best practice là gì?",
    "options": [
      "Lưu lượng vượt quá 50 đồng thời nên phần dư dùng on-demand concurrency (có cold start); dùng Application Auto Scaling để mở rộng provisioned concurrency theo lịch/đo lường",
      "Provisioned concurrency không bao giờ loại bỏ cold start; phải chuyển sang reserved concurrency",
      "Cold start xảy ra vì memory quá cao; giảm memory để hết cold start",
      "Provisioned concurrency chỉ áp dụng cho phiên bản $LATEST nên cần xóa mọi alias"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Provisioned concurrency chỉ làm ấm sẵn đúng số lượng đã đặt; khi vượt ngưỡng đó, các invocation dư sẽ chạy bằng on-demand và có cold start.\n✓ Vượt 50 đồng thời + Application Auto Scaling — đúng, cần scale provisioned concurrency theo lịch hoặc theo utilization để bao phủ giờ cao điểm.\n✗ Provisioned concurrency không loại bỏ cold start — sai, nó loại bỏ cold start trong phạm vi đã cấp; reserved concurrency không làm ấm môi trường.\n✗ Giảm memory để hết cold start — không liên quan, memory không phải nguyên nhân ở đây.\n✗ Chỉ áp dụng cho $LATEST — sai, provisioned concurrency cấu hình trên version/alias chứ không phải $LATEST.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "dva-ext-001",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Nền tảng analytics cần ingest clickstream real-time. Yêu cầu: nhiều ứng dụng độc lập phải đọc CÙNG luồng dữ liệu (một app tính metric, một app lưu vào S3, một app phát hiện gian lận), và phải có khả năng replay dữ liệu trong 7 ngày khi pipeline lỗi. Dịch vụ nào đáp ứng tốt nhất?",
    "options": [
      "Amazon Kinesis Data Streams với retention 7 ngày và nhiều consumer",
      "Amazon SQS Standard với ba consumer group cùng poll",
      "Amazon SNS + ba SQS queue fan-out",
      "Amazon MQ với một topic JMS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nhiều ứng dụng đọc cùng luồng + replay được + streaming real-time → Kinesis Data Streams, không phải SQS.\n✓ Kinesis Data Streams: giữ dữ liệu (retention tới 365 ngày, đặt 7 ngày), nhiều consumer đọc lại cùng data, replay được, thứ tự theo shard.\n✗ SQS Standard: 1 message → 1 consumer, xóa sau khi xử lý, không replay, không cho nhiều app đọc cùng data.\n✗ SNS + SQS fan-out: mỗi queue có bản sao riêng và bị xóa sau xử lý → không replay được như stream.\n✗ Amazon MQ: message broker truyền thống, không tối ưu cho streaming analytics quy mô lớn với replay theo retention.",
    "domain": 1
  },
  {
    "id": "dva-ext-002",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng ghi vào Kinesis Data Stream chế độ provisioned. Producer liên tục nhận lỗi ProvisionedThroughputExceededException trong khi tổng lượng ghi của cả stream vẫn dưới giới hạn lý thuyết. Nguyên nhân gốc khả dĩ nhất là gì?",
    "options": [
      "Partition key phân bố lệch khiến một shard bị nóng (hot shard); cần chọn partition key phân tán đều hơn hoặc tăng shard",
      "Retention period quá ngắn khiến record bị hết hạn khi ghi",
      "Consumer dùng enhanced fan-out chiếm hết băng thông ghi của producer",
      "Stream đang ở chế độ on-demand nên throughput bị giới hạn cứng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi shard có giới hạn riêng (1 MB/s hoặc 1000 record/s khi ghi). Partition key lệch dồn nhiều record vào một shard → hot shard → lỗi dù tổng stream chưa đầy.\n✓ Hot shard do partition key lệch: chọn partition key phân tán đều hoặc tăng số shard để giải nhiệt.\n✗ Retention ngắn: ảnh hưởng thời gian lưu/replay, không gây lỗi throughput khi ghi.\n✗ Enhanced fan-out: cấp băng thông đọc riêng cho consumer, không lấy băng thông ghi của producer.\n✗ On-demand: chế độ này tự scale, không gây ProvisionedThroughputExceeded; lỗi này thuộc về phân bố trên shard provisioned.",
    "domain": 1
  },
  {
    "id": "dva-ext-003",
    "courseId": "DVA-C02",
    "lesson": "dva-d1-05-app-integration",
    "certifications": [
      "DVA-C02"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một SQS Standard queue được tiêu thụ bởi Lambda qua event source mapping. Thỉnh thoảng có một message bị lỗi parse (poison pill) khiến function fail liên tục, làm message quay lại queue mãi và chặn tiến độ. Đội cần xử lý 'poison pill' và đảm bảo phần còn lại của batch vẫn chạy. Chọn HAI biện pháp đúng.",
    "options": [
      "Cấu hình redrive policy với DLQ và maxReceiveCount (ví dụ 5) để chuyển message lỗi sang DLQ điều tra",
      "Bật ReportBatchItemFailures để Lambda chỉ trả lại message lỗi thay vì cả batch",
      "Tăng visibility timeout lên 12 giờ để message lỗi không quay lại",
      "Chuyển queue sang FIFO để tự động loại bỏ message lỗi",
      "Tắt long polling để worker bỏ qua message lỗi nhanh hơn"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Poison pill cần DLQ (qua maxReceiveCount) để cô lập message lỗi, và ReportBatchItemFailures để không kéo cả batch fail theo.\n✓ DLQ + maxReceiveCount: sau N lần receive không xóa được, message bị đẩy sang DLQ, không chặn queue.\n✓ ReportBatchItemFailures: Lambda chỉ trả lại các message lỗi trong batch, các message thành công vẫn được xử lý/xóa.\n✗ Tăng visibility timeout 12 giờ: chỉ trì hoãn message hiện lại, không loại bỏ poison pill, vẫn quay lại sau đó.\n✗ Chuyển sang FIFO: FIFO không tự loại bỏ message lỗi parse; còn có thể chặn cả MessageGroup khi message đầu fail.\n✗ Tắt long polling: chỉ ảnh hưởng cách poll, không xử lý được message lỗi.",
    "domain": 1
  },
  {
    "id": "saa-m1-001",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "To protect the root user of an AWS account according to best practices, which actions should a Solutions Architect perform? (Select 2)",
    "options": [
      "Enable MFA for the root user",
      "Lock down the root user's access keys and do not create access keys for root for daily use",
      "Use the root user for all daily operational activities for easier control",
      "Share the root password with the entire admin team to ensure availability",
      "Attach SCP directly to the root user to restrict permissions"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Bảo vệ root gồm bật MFA và loại bỏ/không dùng access key của root, chỉ dùng root cho các tác vụ bắt buộc.\n✓ Bật MFA cho root: lớp bảo vệ thiết yếu chống chiếm tài khoản.\n✓ Không tạo/khóa access key root: tránh long-term credentials quyền tối cao bị lộ.\n✗ Dùng root hàng ngày: vi phạm least privilege, nên dùng IAM role/user thường ngày.\n✗ Chia sẻ mật khẩu root: cực kỳ rủi ro, mất khả năng truy vết và kiểm soát.\n✗ SCP trực tiếp lên root user: SCP áp dụng cho account/OU, không gắn lên một principal cụ thể.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-002",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Khi so sánh security group và network ACL trong VPC, các phát biểu nào ĐÚNG? (Chọn 2)",
    "options": [
      "Security group là stateful; NACL là stateless và cần rule cho cả chiều đi và về",
      "NACL hỗ trợ explicit deny; security group chỉ hỗ trợ allow",
      "Security group đánh giá rule theo thứ tự số nhỏ tới lớn rồi dừng",
      "NACL gắn vào ENI của từng instance",
      "Security group áp dụng ở cấp subnet cho mọi instance trong subnet"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Khác biệt cốt lõi: state (stateful vs stateless) và khả năng deny.\n✓ SG stateful, NACL stateless cần cả hai chiều — đúng.\n✓ NACL có explicit deny, SG chỉ allow — đúng.\n✗ SG đánh giá theo thứ tự số rồi dừng — sai, đó là NACL; SG đánh giá tập hợp allow.\n✗ NACL gắn ENI instance — sai, NACL gắn subnet; SG gắn ENI/instance.\n✗ SG áp cấp subnet — sai, NACL mới áp cấp subnet.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-003",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty có nhiều ứng dụng EC2 cần truy cập một S3 bucket để lưu log. Hiện tại developer đang nhúng access key vào code chạy trên các instance này. Là Solutions Architect, bạn cần loại bỏ long-term credentials mà vẫn cấp quyền truy cập S3 với least operational overhead. Giải pháp nào phù hợp nhất?",
    "options": [
      "Tạo IAM role với policy truy cập S3 và gán role đó vào instance profile của các EC2 instance",
      "Tạo một IAM user dùng chung, gắn policy S3, rồi phân phối access key cho tất cả instance qua Systems Manager Parameter Store",
      "Lưu access key trong Secrets Manager và để ứng dụng đọc key khi khởi động",
      "Bật S3 bucket policy cho phép truy cập public và giới hạn bằng VPC endpoint"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role gắn qua instance profile cung cấp temporary credentials tự động xoay vòng, loại bỏ hoàn toàn long-term key.\n✓ IAM role + instance profile: EC2 nhận temporary credentials qua STS, không cần quản lý key, least operational overhead.\n✗ IAM user dùng chung + access key: vẫn là long-term credentials, vi phạm best practice và khó xoay vòng.\n✗ Lưu access key trong Secrets Manager: vẫn tồn tại long-term key, thêm phức tạp vận hành.\n✗ Bucket policy public: tạo lỗ hổng bảo mật, không giải quyết vấn đề credential.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-004",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một IAM user có một identity-based policy ALLOW s3:GetObject trên bucket X. Account chứa user này nằm trong OU có SCP chỉ cho phép các action EC2 (không bao gồm S3). Đồng thời bucket X (cùng account) có bucket policy ALLOW user đó GetObject. Khi user gọi s3:GetObject, kết quả là gì?",
    "options": [
      "Bị từ chối, vì SCP không cho phép S3 nên permission tối đa của account đã loại trừ s3:GetObject",
      "Được phép, vì cả identity-based policy lẫn resource-based policy đều ALLOW",
      "Được phép, vì resource-based policy luôn ưu tiên hơn SCP",
      "Bị từ chối, vì cần thêm một explicit allow trong permission boundary"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SCP đặt trần quyền tối đa; nếu action không nằm trong SCP allow thì coi như implicit deny, request bị chặn dù các policy khác allow.\n✓ Bị từ chối do SCP: SCP chỉ allow EC2, s3:GetObject nằm ngoài giới hạn nên bị implicit deny ở cấp account.\n✗ Được phép vì identity + resource policy allow: SCP được đánh giá và giới hạn permission tối đa, nên các allow này không có hiệu lực.\n✗ Resource-based policy ưu tiên hơn SCP: sai, SCP luôn giới hạn boundary của account trước.\n✗ Cần explicit allow trong permission boundary: tình huống không đề cập permission boundary; vấn đề nằm ở SCP.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-005",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một nền tảng cho phép nhiều team tự tạo IAM role cho ứng dụng của họ. Security team lo ngại các team sẽ tự cấp quyền quá rộng (ví dụ AdministratorAccess). Yêu cầu: cho phép team tạo role nhưng đảm bảo các role họ tạo KHÔNG BAO GIỜ có quyền vượt quá một tập giới hạn cho trước. Cơ chế nào phù hợp nhất?",
    "options": [
      "Buộc các role do team tạo phải gắn một permission boundary do security team định nghĩa, và dùng IAM policy điều kiện để chỉ cho phép tạo role khi có boundary đó",
      "Áp dụng SCP deny mọi action iam:CreateRole cho các team",
      "Tạo sẵn tất cả role và không cho team quyền tạo role nào",
      "Gắn AWS Config rule cảnh báo khi role có quyền quá rộng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Permission boundary đặt trần quyền tối đa cho một entity; bắt buộc gắn boundary khi tạo role cho phép delegation an toàn.\n✓ Permission boundary bắt buộc khi tạo role: role do team tạo không bao giờ vượt boundary, vẫn cho phép team tự tạo role, đúng yêu cầu delegation.\n✗ SCP deny CreateRole: chặn hoàn toàn việc tạo role, mâu thuẫn với yêu cầu cho team tự tạo.\n✗ Tạo sẵn mọi role: không scale, mất tính tự phục vụ, vận hành nặng.\n✗ Config rule cảnh báo: detective, role rộng quyền vẫn tồn tại đến khi được phát hiện và sửa.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-006",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong policy evaluation logic của IAM, một request có: identity-based policy ALLOW action, không có SCP nào liên quan, permission boundary của principal KHÔNG bao gồm action đó, và resource-based policy (cùng account) có explicit ALLOW cho principal. Kết quả cuối cùng đối với một IAM role principal là gì?",
    "options": [
      "Bị từ chối, vì permission boundary giới hạn quyền hiệu lực và action không nằm trong boundary",
      "Được phép, vì resource-based policy explicit ALLOW luôn thắng permission boundary",
      "Được phép, vì identity-based ALLOW kết hợp resource-based ALLOW là đủ",
      "Bị từ chối, vì thiếu explicit ALLOW trong SCP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Permission boundary đặt trần quyền hiệu lực của principal; trong cùng account, action phải được cả identity policy lẫn boundary cho phép.\n✓ Bị từ chối do permission boundary: quyền hiệu lực là giao của identity policy và boundary; action ngoài boundary nên không được phép trong cùng account.\n✗ Resource-based luôn thắng boundary: chỉ đúng trong cross-account; ở cùng account vẫn chịu giới hạn của boundary.\n✗ Identity + resource ALLOW là đủ: bỏ qua giới hạn của permission boundary trong cùng account.\n✗ Thiếu ALLOW trong SCP: đề nêu không có SCP liên quan, không phải nguyên nhân.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-007",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Account Production (A) chứa role có quyền deploy. Một CI/CD pipeline chạy trong account Tooling (B) cần assume role này. Security team yêu cầu chỉ pipeline cụ thể được assume, ngăn 'confused deputy', kể cả khi role ARN bị lộ. Biện pháp bổ sung nào trong trust policy là phù hợp nhất?",
    "options": [
      "Thêm điều kiện sts:ExternalId (hoặc aws:PrincipalArn cụ thể) trong trust policy của role ở account A",
      "Cấp quyền AdministratorAccess cho role ở account A để pipeline chạy trơn tru",
      "Dùng access key của một IAM user trong account A và lưu trong pipeline",
      "Mở trust policy cho phép Principal là * và lọc bằng bucket policy"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ExternalId (hoặc giới hạn principal ARN cụ thể) trong trust policy chống confused deputy và giới hạn chính xác ai được assume.\n✓ sts:ExternalId / PrincipalArn cụ thể: chỉ caller biết đúng ExternalId hoặc đúng ARN mới assume được, chống confused deputy.\n✗ AdministratorAccess: không liên quan tới kiểm soát ai được assume, lại vi phạm least privilege.\n✗ Access key IAM user trong pipeline: long-term credentials, đi ngược best practice AssumeRole.\n✗ Principal * + bucket policy: trust policy quá mở, bucket policy không kiểm soát việc assume role.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-008",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web chạy trên EC2 dùng IAM role qua instance profile. Developer phàn nàn rằng đôi khi ứng dụng nhận lỗi do credentials hết hạn vì code tự đọc và cache credentials. Solutions Architect nên hướng dẫn điều gì là đúng nhất về temporary credentials từ instance profile?",
    "options": [
      "AWS SDK tự động lấy và làm mới credentials từ Instance Metadata Service; ứng dụng nên dùng SDK thay vì cache credentials thủ công",
      "Cần tạo IAM user và gắn access key cố định để tránh hết hạn",
      "Phải tăng thời hạn session lên 1 năm trong instance profile",
      "Phải gọi STS GetSessionToken thủ công mỗi giờ và lưu vào file"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Credentials từ instance profile là tạm thời và được xoay vòng tự động; AWS SDK lấy/làm mới chúng qua IMDS, ứng dụng không nên tự cache.\n✓ Dùng SDK để lấy/làm mới từ IMDS: SDK xử lý refresh tự động, tránh lỗi credentials hết hạn.\n✗ IAM user access key cố định: long-term credentials, sai best practice và không cần thiết.\n✗ Tăng thời hạn lên 1 năm: instance profile credentials không cấu hình kiểu đó; vấn đề là cache thủ công.\n✗ Gọi GetSessionToken thủ công lưu file: phức tạp không cần thiết, SDK đã tự xử lý.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-009",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web chạy trên EC2 trong public subnet. Security group hiện cho phép inbound HTTPS (443) từ 0.0.0.0/0. Team muốn cho phép trả response về client mà không cần khai báo thêm rule outbound nào. Đặc tính nào của security group giải thích vì sao điều này hoạt động?",
    "options": [
      "Security group là stateful: traffic phản hồi của một kết nối inbound được tự động cho phép ra",
      "Security group là stateless nên cần thêm outbound rule cho ephemeral ports",
      "NACL stateful tự động cho phép response",
      "Security group đánh giá rule theo thứ tự số như NACL"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security group là stateful nên response của kết nối inbound được tự động cho qua, không cần outbound rule tương ứng.\n✓ Stateful, response tự động cho ra — đúng bản chất security group.\n✗ Stateless cần ephemeral ports — đó là đặc tính của NACL, không phải security group.\n✗ NACL stateful — sai, NACL là stateless.\n✗ Đánh giá theo thứ tự số — đó là NACL; security group đánh giá tất cả rule (allow-only).",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-010",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Admin cần truy cập shell quản trị các EC2 trong private subnet. Công ty muốn loại bỏ bastion host và không mở cổng 22 inbound nào, đồng thời ghi log mọi phiên. Giải pháp least operational overhead nào nên dùng?",
    "options": [
      "AWS Systems Manager Session Manager qua SSM Agent và VPC endpoints",
      "Bastion host trong public subnet với security group giới hạn IP văn phòng",
      "Client VPN endpoint cho phép SSH trực tiếp vào instance",
      "Mở port 22 và dùng key pair luân phiên định kỳ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Session Manager cho phép truy cập không cần mở inbound port, không cần bastion, và log phiên ra CloudWatch/S3.\n✓ SSM Session Manager — đúng, không mở cổng 22, không bastion, có log phiên.\n✗ Bastion host — vẫn cần host, vẫn mở port 22, nhiều vận hành hơn.\n✗ Client VPN + SSH — vẫn phải mở 22 và quản lý VPN, không loại bỏ inbound port.\n✗ Mở port 22 — trái yêu cầu không mở inbound port.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-011",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web sau ALB hứng đợt tấn công SQL injection và HTTP flood ở Layer 7. Công ty muốn lọc request độc hại theo pattern và rate-limit theo IP với least operational overhead. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS WAF với managed rule groups và rate-based rules gắn vào ALB",
      "AWS Network Firewall đặt trước ALB",
      "Security group thắt chặt trên các instance backend",
      "AWS Shield Standard tự bảo vệ Layer 7"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "WAF hoạt động ở Layer 7, có managed rules cho SQLi và rate-based rules, gắn trực tiếp vào ALB.\n✓ AWS WAF + managed rules + rate-based — đúng cho SQLi và HTTP flood ở L7.\n✗ Network Firewall — lọc L3/L4 (và một số L7) ở cấp VPC, không tối ưu cho web exploits theo HTTP pattern như WAF.\n✗ Security group — chỉ lọc IP/port, không hiểu nội dung HTTP.\n✗ Shield Standard — chống DDoS L3/L4 cơ bản, không lọc SQLi L7.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-012",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng RDS PostgreSQL dùng username/password được hardcode trong code. Team muốn lưu credential an toàn và tự động luân phiên password định kỳ với least operational overhead. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Secrets Manager với automatic rotation cho RDS",
      "AWS Systems Manager Parameter Store SecureString tự viết Lambda rotation",
      "Lưu credential trong S3 bucket được mã hóa bằng KMS",
      "Lưu credential trong biến môi trường EC2 mã hóa bằng KMS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager hỗ trợ tích hợp sẵn automatic rotation cho RDS, ít vận hành nhất.\n✓ Secrets Manager + auto rotation — đúng, rotation tích hợp sẵn cho RDS.\n✗ Parameter Store + tự viết Lambda rotation — Parameter Store không có rotation tích hợp, phải tự xây dựng, nhiều vận hành.\n✗ S3 mã hóa KMS — lưu được nhưng không có rotation tự động.\n✗ Biến môi trường — không có rotation và khó quản lý vòng đời bí mật.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-013",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ALB phục vụ ứng dụng cần chỉ chấp nhận traffic từ CloudFront, không cho client truy cập trực tiếp ALB DNS. Giải pháp nào phù hợp và ít vận hành?",
    "options": [
      "Dùng AWS managed prefix list của CloudFront trong security group của ALB và header secret kiểm tra ở WAF",
      "Đặt ALB vào private subnet và bỏ Internet gateway",
      "Chặn mọi IP công khai bằng NACL trên subnet của ALB",
      "Bật Shield Advanced để ẩn ALB khỏi Internet"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Security group dùng managed prefix list của CloudFront giới hạn nguồn, kết hợp custom header verify ở WAF chặn truy cập trực tiếp.\n✓ CloudFront prefix list + header check ở WAF — đúng, chỉ cho CloudFront tới ALB.\n✗ ALB private subnet bỏ IGW — CloudFront vẫn cần tới được origin; private-only phá vỡ kiến trúc CloudFront->ALB công khai.\n✗ NACL chặn mọi IP công khai — sẽ chặn luôn CloudFront, không phân biệt được nguồn hợp lệ.\n✗ Shield Advanced — bảo vệ DDoS, không ẩn ALB hay giới hạn nguồn truy cập.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-014",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng dùng Interface VPC endpoint cho Secrets Manager. Team muốn đảm bảo chỉ một số IAM principal nhất định được dùng endpoint này và chỉ truy cập một secret cụ thể. Cơ chế nào kiểm soát điều đó tại endpoint?",
    "options": [
      "VPC endpoint policy giới hạn principal và resource (ARN của secret) được phép qua endpoint",
      "Security group của endpoint chặn theo IAM principal",
      "NACL trên subnet của endpoint lọc theo secret ARN",
      "Resource policy của S3 bucket chứa secret"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "VPC endpoint policy là IAM resource policy gắn trên endpoint, kiểm soát principal/action/resource đi qua endpoint.\n✓ VPC endpoint policy — đúng, giới hạn principal và ARN secret qua endpoint.\n✗ Security group endpoint — chỉ lọc IP/port, không hiểu IAM principal hay secret ARN.\n✗ NACL theo secret ARN — NACL chỉ làm việc IP/port.\n✗ S3 bucket policy — Secrets Manager không lưu secret trong bucket của khách; không liên quan.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-015",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty lưu trữ các báo cáo tài chính trong một S3 bucket. Yêu cầu compliance bắt buộc dữ liệu phải được encrypted at rest, nhưng team không muốn quản lý bất kỳ key material nào và muốn least operational overhead. Giải pháp nào phù hợp nhất?",
    "options": [
      "Bật server-side encryption với Amazon S3 managed keys (SSE-S3)",
      "Dùng SSE-C, nơi client cung cấp encryption key trong mỗi request",
      "Mã hoá file phía client bằng OpenSSL trước khi upload lên S3",
      "Triển khai CloudHSM cluster và tự mã hoá dữ liệu trước khi lưu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SSE-S3 mã hoá at rest hoàn toàn do AWS quản lý, không cần thao tác key, đáp ứng least operational overhead.\n✓ SSE-S3: AWS quản lý toàn bộ key, bật một lần, đáp ứng compliance encryption at rest mà không cần vận hành key.\n✗ SSE-C: client phải tự lưu giữ và truyền key trong mỗi request, tăng overhead đáng kể.\n✗ Mã hoá phía client bằng OpenSSL: phải tự quản lý key và quy trình, nhiều thao tác thủ công.\n✗ CloudHSM: dùng cho yêu cầu HSM chuyên dụng/FIPS 140-2 Level 3, quá phức tạp và tốn kém cho nhu cầu này.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-016",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một tổ chức trong ngành y tế phải tuân thủ FIPS 140-2 Level 3 cho việc quản lý cryptographic key, yêu cầu single-tenant hardware và toàn quyền kiểm soát HSM. Họ cũng cần dùng key này để mã hoá dữ liệu trong các ứng dụng tự xây. Giải pháp nào phù hợp nhất?",
    "options": [
      "AWS CloudHSM cluster, ứng dụng tích hợp qua PKCS#11/JCE",
      "AWS KMS customer managed key với automatic rotation",
      "AWS KMS AWS managed key",
      "AWS Secrets Manager để lưu trữ và rotate key material"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudHSM cung cấp HSM single-tenant đạt FIPS 140-2 Level 3 với toàn quyền kiểm soát, tích hợp qua chuẩn PKCS#11/JCE.\n✓ CloudHSM: single-tenant dedicated HSM, FIPS 140-2 Level 3, khách hàng toàn quyền quản lý, tích hợp ứng dụng qua PKCS#11/JCE/OpenSSL.\n✗ KMS customer managed key: KMS là dịch vụ multi-tenant, không đáp ứng yêu cầu single-tenant hardware toàn quyền kiểm soát.\n✗ KMS AWS managed key: thậm chí còn ít kiểm soát hơn, không đáp ứng yêu cầu.\n✗ Secrets Manager: dùng để lưu secrets/credentials, không phải HSM cho cryptographic operations.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-017",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty dùng SSE-KMS với customer managed key cho S3 bucket lưu hàng triệu object được đọc với tần suất rất cao. Họ nhận thấy chi phí KMS API request tăng mạnh và đôi khi bị throttling. Giải pháp tối ưu chi phí mà vẫn dùng KMS là gì?",
    "options": [
      "Bật S3 Bucket Keys để giảm số lần gọi KMS",
      "Chuyển sang SSE-C để loại bỏ hoàn toàn gọi KMS",
      "Yêu cầu tăng KMS request quota và chấp nhận chi phí cao hơn",
      "Chuyển toàn bộ object sang S3 One Zone-IA để giảm chi phí"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Bucket Keys tạo một bucket-level key giảm mạnh số lần gọi KMS GenerateDataKey/Decrypt, giảm chi phí và throttling.\n✓ S3 Bucket Keys: giảm tới ~99% số request tới KMS, hạ chi phí và tránh throttling mà vẫn dùng SSE-KMS.\n✗ SSE-C: chuyển gánh nặng quản lý key sang client và thay đổi toàn bộ ứng dụng, không phải giải pháp tối ưu.\n✗ Tăng quota: chỉ giải quyết throttling chứ không giảm chi phí, ngược lại còn tốn hơn.\n✗ One Zone-IA: thay đổi storage class/độ bền, không liên quan tới chi phí KMS.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-018",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bucket policy cần cho phép một IAM role trong account khác đọc object, nhưng phải từ chối mọi request không dùng HTTPS để đảm bảo encryption in transit. Điều kiện policy nào nên dùng để enforce TLS?",
    "options": [
      "Thêm statement Deny khi điều kiện aws:SecureTransport là false",
      "Thêm statement Allow khi điều kiện s3:x-amz-server-side-encryption tồn tại",
      "Dùng điều kiện aws:SourceIp để giới hạn IP",
      "Dùng điều kiện s3:x-amz-acl bằng private"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "aws:SecureTransport=false xác định request không qua HTTPS; Deny trên điều kiện này enforce encryption in transit.\n✓ Deny khi aws:SecureTransport là false: chặn mọi request HTTP, bắt buộc dùng TLS/HTTPS.\n✗ s3:x-amz-server-side-encryption: liên quan encryption at rest chứ không phải in transit.\n✗ aws:SourceIp: giới hạn theo IP, không enforce TLS.\n✗ s3:x-amz-acl=private: kiểm soát ACL object, không liên quan transport security.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-019",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng cần lưu database credentials và tự động rotate chúng định kỳ mà không cần thay đổi code khi rotate, đồng thời mã hoá credentials at rest bằng KMS. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Secrets Manager",
      "AWS Systems Manager Parameter Store (Standard, không rotation)",
      "AWS KMS lưu trực tiếp credentials",
      "Lưu credentials trong file mã hoá trên EBS volume"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Secrets Manager mã hoá secret bằng KMS và hỗ trợ automatic rotation tích hợp (đặc biệt với RDS) mà app chỉ cần fetch khi cần.\n✓ Secrets Manager: lưu credentials mã hoá bằng KMS, có built-in automatic rotation, app lấy giá trị mới mà không sửa code.\n✗ Parameter Store Standard: không có automatic rotation tích hợp sẵn cho database credentials.\n✗ KMS lưu credentials: KMS quản lý key chứ không lưu trữ secret payload.\n✗ File mã hoá trên EBS: phải tự xây cơ chế rotation và phân phối, nhiều overhead.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-020",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty muốn dùng key material của riêng họ (do tổ chức tự sinh trong HSM nội bộ) cho KMS thay vì để KMS sinh, nhằm đáp ứng yêu cầu kiểm soát nguồn gốc key (key provenance) trong khi vẫn dùng SSE-KMS cho S3. Giải pháp nào đúng?",
    "options": [
      "Tạo KMS key với origin EXTERNAL và import key material do tổ chức tự sinh",
      "Dùng AWS managed key và bật automatic rotation",
      "Dùng SSE-S3 vì AWS sẽ tự quản lý key material",
      "Lưu key material trong Secrets Manager và tham chiếu từ S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "KMS hỗ trợ Bring Your Own Key (BYOK) qua key có origin EXTERNAL, cho phép import key material tự sinh để đáp ứng key provenance.\n✓ KMS key origin EXTERNAL + import key material: cho phép dùng key tự sinh, đáp ứng yêu cầu kiểm soát nguồn gốc key mà vẫn dùng SSE-KMS.\n✗ AWS managed key: AWS sinh và quản lý hoàn toàn, không kiểm soát được provenance.\n✗ SSE-S3: hoàn toàn do AWS quản lý key, không đáp ứng BYOK.\n✗ Secrets Manager: lưu secrets, không phải cơ chế cung cấp KMS encryption key material cho S3.",
    "domain": 1,
    "mock": 1
  },
  {
    "id": "saa-m1-021",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một kiến trúc sư đang thiết kế một tier xử lý đơn hàng bất đồng bộ resilient bằng SQS. Những thực hành nào sau đây giúp tier này highly available và fault tolerant? (Chọn 2)",
    "options": [
      "Đặt consumer trong một Auto Scaling group trải trên nhiều Availability Zones",
      "Cấu hình DLQ để cô lập các message liên tục xử lý thất bại",
      "Đặt visibility timeout về 0 để message luôn sẵn sàng được nhận",
      "Cho một consumer EC2 duy nhất xử lý toàn bộ queue để đảm bảo thứ tự",
      "Tắt retry để tránh xử lý message nhiều lần"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Consumer trải nhiều AZ trong Auto Scaling group đảm bảo HA, và DLQ cô lập poison message để hệ thống không nghẽn.\n✓ Auto Scaling consumer trên nhiều AZ — đúng, mất một AZ vẫn còn consumer khác xử lý, highly available.\n✓ DLQ cô lập message lỗi — đúng, tăng độ bền và ngăn message hỏng làm nghẽn xử lý.\n✗ Visibility timeout = 0 — sai, message bị nhiều worker nhận đồng thời, gây xử lý trùng nghiêm trọng.\n✗ Một consumer duy nhất — sai, single point of failure, không HA.\n✗ Tắt retry — sai, SQS không hoạt động theo cách đó; mất khả năng thử lại làm giảm độ bền.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-022",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web ghi các đơn hàng vào một tier xử lý backend. Khi backend tạm thời quá tải, đơn hàng bị mất. Kiến trúc sư muốn decouple hai tier để đơn hàng được giữ lại và xử lý sau. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Đặt một Amazon SQS queue giữa web tier và backend tier",
      "Cho web tier gọi trực tiếp backend qua Application Load Balancer",
      "Lưu đơn hàng vào Amazon S3 rồi cho backend poll danh sách object",
      "Dùng Amazon Kinesis Data Firehose để stream đơn hàng tới backend"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SQS làm buffer bền giữa producer và consumer, hấp thụ tải đột biến và cho phép xử lý bất đồng bộ (queue-based load leveling).\n✓ SQS queue giữa hai tier — đúng, message được giữ bền cho tới khi backend xử lý xong, decouple hoàn toàn.\n✗ Gọi trực tiếp qua ALB — vẫn là kết nối đồng bộ, backend quá tải vẫn làm mất/timeout request.\n✗ S3 + poll list object — S3 không phải hàng đợi message, polling list kém hiệu quả và không có visibility/retry semantics.\n✗ Kinesis Firehose — dùng để load streaming data vào kho lưu trữ, không phải hàng đợi công việc xử lý từng đơn.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-023",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng dùng Amazon SQS. Một số message bị lỗi (poison message) và liên tục được xử lý lại, làm nghẽn consumer và che lấp message hợp lệ. Giải pháp nào xử lý các message hỏng này mà ít vận hành nhất?",
    "options": [
      "Cấu hình một Dead-Letter Queue (DLQ) với maxReceiveCount phù hợp",
      "Tăng visibility timeout để giảm số lần message được nhận lại",
      "Xóa và tạo lại queue mỗi khi phát hiện message lỗi",
      "Bật FIFO queue để loại bỏ message trùng lặp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DLQ tự động chuyển message vượt quá số lần nhận tối đa ra khỏi queue chính để cô lập và phân tích sau.\n✓ DLQ với maxReceiveCount — đúng, message lỗi quá ngưỡng tự động chuyển sang DLQ, queue chính không còn nghẽn.\n✗ Tăng visibility timeout — chỉ làm message hỏng quay lại chậm hơn, không cô lập chúng.\n✗ Xóa/tạo lại queue — thủ công, mất cả message hợp lệ, rủi ro cao.\n✗ FIFO — chống trùng lặp, không xử lý vấn đề poison message liên tục fail.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-024",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một REST API nhận lưu lượng không thể đoán trước, từ 0 tới hàng nghìn request mỗi giây. Công ty muốn kiến trúc serverless, chỉ trả tiền khi có request và tự scale. Lựa chọn nào tối ưu nhất?",
    "options": [
      "Amazon API Gateway tích hợp với AWS Lambda",
      "Application Load Balancer phân phối tới một Auto Scaling group EC2",
      "Amazon EC2 đặt sau Network Load Balancer với scaling theo lịch",
      "Amazon API Gateway tích hợp với một EC2 instance cố định"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "API Gateway + Lambda là kiến trúc serverless, scale tự động từ 0 lên hàng nghìn request và chỉ tính phí theo lượng dùng.\n✓ API Gateway + Lambda — đúng, fully serverless, scale tự động, pay-per-use, ít vận hành nhất.\n✗ ALB + Auto Scaling EC2 — chạy được nhưng luôn có instance tối thiểu, không scale-to-zero, vận hành nhiều hơn.\n✗ EC2 sau NLB scaling theo lịch — scaling theo lịch không hợp với tải khó đoán; tốn phí khi nhàn rỗi.\n✗ API Gateway + EC2 cố định — EC2 cố định không tự scale và không serverless.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-025",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một fleet EC2 web server đứng sau Application Load Balancer lưu session người dùng trong bộ nhớ cục bộ của từng instance. Khi Auto Scaling thu hồi instance, người dùng bị đăng xuất. Cách tốt nhất để làm tier này stateless và resilient là gì?",
    "options": [
      "Lưu session ở một store dùng chung như Amazon ElastiCache hoặc DynamoDB",
      "Bật sticky sessions trên ALB để giữ người dùng ở cùng một instance",
      "Tăng cooldown của Auto Scaling để instance ít bị thu hồi hơn",
      "Lưu session vào ổ EBS gắn vào từng instance"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đưa session ra store ngoài (ElastiCache/DynamoDB) làm các instance stateless, có thể thay thế tự do mà không mất session.\n✓ Session store dùng chung — đúng, tier stateless, instance thay thế thoải mái, người dùng không bị đăng xuất.\n✗ Sticky sessions — vẫn gắn người dùng vào một instance; instance bị thu hồi là mất session.\n✗ Tăng cooldown — chỉ trì hoãn vấn đề, không làm tier stateless.\n✗ Session trên EBS — EBS gắn theo instance; instance mất thì session mất, không dùng chung được.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-026",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng dùng SNS để gửi thông báo. Đội phát triển muốn đảm bảo nếu việc gửi tới một subscriber endpoint thất bại liên tục thì message không bị mất mà được lưu để xử lý lại. Cách tốt nhất là gì?",
    "options": [
      "Cấu hình một dead-letter queue (SQS) cho SNS subscription",
      "Tăng số lần retry mặc định của SNS lên tối đa",
      "Chuyển sang SQS standard queue thay cho SNS",
      "Bật message filtering để bỏ qua message lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SNS subscription hỗ trợ DLQ (một SQS queue) để giữ các message giao không thành công sau khi hết retry.\n✓ DLQ cho SNS subscription — đúng, message giao thất bại được chuyển vào SQS DLQ, không bị mất.\n✗ Tăng retry — retry có giới hạn; nếu endpoint hỏng lâu thì message vẫn mất khi không có DLQ.\n✗ Chuyển hẳn sang SQS — mất khả năng fan-out pub/sub của SNS; không phải giải pháp cho nhu cầu này.\n✗ Message filtering — chỉ quyết định message nào được gửi, không cứu message giao thất bại.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-027",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng three-tier có web tier, application tier và database tier. Đội bảo mật muốn application tier có thể scale độc lập với web tier và không bị ảnh hưởng khi tải web tăng đột biến. Cách decouple hai tier tốt nhất là gì?",
    "options": [
      "Chèn một SQS queue giữa web tier và application tier để xử lý bất đồng bộ",
      "Đặt cả hai tier trong cùng một Auto Scaling group",
      "Tăng kích thước instance của application tier",
      "Cho web tier gọi application tier trực tiếp qua synchronous HTTP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SQS giữa hai tier giúp chúng scale độc lập và hấp thụ đột biến tải mà không ảnh hưởng lẫn nhau.\n✓ SQS giữa web và application tier — đúng, decoupled, mỗi tier scale độc lập, đột biến web không làm sập app tier.\n✗ Cùng một Auto Scaling group — gắn chặt hai tier, không scale độc lập được.\n✗ Tăng kích thước instance — vertical scaling có giới hạn, không giải quyết coupling.\n✗ Gọi synchronous HTTP — kết nối chặt, đột biến web tier trực tiếp dội sang app tier.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-028",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng xử lý video upload. Khi có upload, công ty muốn Lambda function được gọi tự động, nhưng nếu lượng upload đột biến vượt giới hạn concurrency của Lambda thì các yêu cầu không được mất. Kiến trúc nào đảm bảo điều này tốt nhất?",
    "options": [
      "Đưa sự kiện vào SQS queue, cho Lambda đọc từ queue như event source",
      "Cho S3 gọi trực tiếp Lambda đồng bộ với mỗi upload",
      "Tăng reserved concurrency của Lambda lên mức tối đa của account",
      "Cho API Gateway gọi Lambda đồng bộ cho mỗi upload"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SQS làm buffer trước Lambda; khi vượt concurrency, message vẫn nằm trong queue và được xử lý dần, không mất yêu cầu.\n✓ SQS làm buffer + Lambda đọc từ queue — đúng, queue hấp thụ đột biến, Lambda xử lý theo concurrency mà không mất event.\n✗ S3 gọi Lambda đồng bộ — S3 thực ra gọi Lambda bất đồng bộ, nhưng khi throttle kéo dài và hết retry vẫn có thể mất event nếu không có buffer/DLQ.\n✗ Tăng reserved concurrency — vẫn có trần account-level, đột biến lớn vẫn có thể throttle và mất.\n✗ API Gateway đồng bộ — gọi đồng bộ vẫn bị throttle khi vượt concurrency, không buffer.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-029",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng publish event tới EventBridge. Đôi khi target (một API endpoint) tạm thời không khả dụng và một số event giao thất bại sau khi retry. Công ty không muốn mất các event này. Cách tốt nhất để giữ lại chúng là gì?",
    "options": [
      "Cấu hình dead-letter queue (SQS) cho EventBridge target",
      "Tăng số retry attempt của EventBridge lên vô hạn",
      "Chuyển event qua SNS thay vì EventBridge",
      "Ghi log mọi event ra CloudWatch Logs để gửi lại thủ công"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge target hỗ trợ DLQ (SQS) để giữ event không giao được sau khi hết retry.\n✓ DLQ (SQS) cho EventBridge target — đúng, event thất bại được giữ trong DLQ để xử lý lại, không mất.\n✗ Retry vô hạn — không khả thi/khuyến nghị; vẫn có thể mất sau ngưỡng tối đa.\n✗ Chuyển sang SNS — không tự giải quyết vấn đề mất event và làm lại kiến trúc không cần thiết.\n✗ Log ra CloudWatch rồi gửi lại thủ công — nhiều vận hành, dễ sai sót, không tự động.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-030",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web chạy trên Amazon RDS for PostgreSQL trong một Single-AZ deployment. Doanh nghiệp yêu cầu database phải tự động chuyển đổi (failover) sang một instance dự phòng khi AZ chứa database gặp sự cố, mà không cần thay đổi connection string của ứng dụng. Giải pháp nào đáp ứng yêu cầu với ít thao tác vận hành nhất?",
    "options": [
      "Bật Multi-AZ deployment cho RDS instance để AWS duy trì một standby instance đồng bộ ở AZ khác và tự động failover",
      "Tạo một Read Replica ở AZ khác và cấu hình ứng dụng tự động promote replica khi primary lỗi",
      "Lên lịch snapshot mỗi giờ và khôi phục thủ công sang AZ khác khi xảy ra sự cố",
      "Triển khai thêm một RDS instance ở AZ khác và dùng một Lambda function tùy chỉnh để đồng bộ dữ liệu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Multi-AZ deployment của RDS cung cấp standby đồng bộ ở AZ khác và tự động failover qua DNS endpoint, không đổi connection string.\n✓ Bật Multi-AZ: AWS quản lý standby đồng bộ và failover tự động qua cùng một endpoint, ít vận hành nhất.\n✗ Read Replica là replication bất đồng bộ phục vụ scale đọc, không tự động failover và promote cần thao tác thủ công, có thể mất dữ liệu.\n✗ Snapshot khôi phục thủ công có RTO/RPO cao và nhiều thao tác.\n✗ Lambda tự đồng bộ là giải pháp tự xây dựng, nhiều vận hành và rủi ro.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-031",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một startup muốn chiến lược disaster recovery cho hệ thống dựa trên EC2 và RDS với chi phí thấp nhất, chấp nhận RTO vài giờ và RPO vài giờ. Hiện tại họ chưa chạy bất kỳ tài nguyên nào ở Region dự phòng. Chiến lược DR nào phù hợp nhất với yêu cầu chi phí?",
    "options": [
      "Backup and Restore: sao lưu định kỳ (AMI, snapshot) sang Region khác và chỉ khôi phục tài nguyên khi có thảm họa",
      "Pilot Light: luôn duy trì database replica đang chạy và core services tối thiểu ở Region dự phòng",
      "Warm Standby: duy trì một bản sao thu nhỏ của toàn bộ hệ thống luôn chạy ở Region dự phòng",
      "Multi-Site active-active: chạy đầy đủ hệ thống ở cả hai Region và phân tải giữa chúng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Backup and Restore rẻ nhất vì không duy trì hạ tầng chạy ở Region dự phòng, phù hợp RTO/RPO vài giờ.\n✓ Backup and Restore: chỉ trả phí lưu trữ backup, dựng tài nguyên khi cần, chi phí thấp nhất với RTO/RPO chấp nhận được.\n✗ Pilot Light duy trì core đang chạy nên đắt hơn và không cần thiết khi RTO vài giờ.\n✗ Warm Standby chạy bản thu nhỏ liên tục, chi phí cao hơn nhiều.\n✗ Multi-Site active-active đắt nhất, dành cho RTO/RPO gần 0.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-032",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức cần một giải pháp tập trung để lên lịch và quản lý backup cho nhiều dịch vụ: EBS volumes, RDS databases, DynamoDB tables và EFS file systems, đồng thời áp dụng chính sách lưu trữ (retention) thống nhất và sao chép backup sang Region khác. Dịch vụ nào phù hợp nhất với ít thao tác vận hành nhất?",
    "options": [
      "AWS Backup với backup plan và cross-Region copy",
      "Viết script tùy chỉnh dùng AWS CLI để tạo snapshot cho từng dịch vụ",
      "Amazon Data Lifecycle Manager chỉ cho EBS snapshots",
      "Bật versioning trên S3 và copy thủ công các backup vào đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Backup là dịch vụ quản lý backup tập trung cho nhiều dịch vụ với policy và cross-Region copy tích hợp.\n✓ AWS Backup: một backup plan duy nhất quản lý EBS, RDS, DynamoDB, EFS, áp retention thống nhất và copy cross-Region, ít vận hành nhất.\n✗ Script CLI tùy chỉnh nhiều vận hành và dễ lỗi.\n✗ Data Lifecycle Manager chỉ quản lý EBS/AMI snapshots, không bao phủ RDS/DynamoDB/EFS.\n✗ S3 versioning không tạo backup cho các dịch vụ trên.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-033",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng dùng Amazon Aurora MySQL. Nhóm phát triển muốn giảm tải đọc khỏi instance ghi chính và tăng tính sẵn sàng bằng cách cho phép một replica được tự động promote thành primary khi primary lỗi, tất cả trong cùng một Region. Giải pháp nào phù hợp nhất?",
    "options": [
      "Thêm Aurora Replicas trong cùng Aurora cluster trải trên nhiều AZ",
      "Tạo một RDS Read Replica truyền thống ở Region khác",
      "Bật S3 Cross-Region Replication cho dữ liệu database",
      "Chuyển sang DynamoDB Global Tables"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora Replicas trong cluster vừa phục vụ đọc vừa là ứng viên failover tự động trong Region.\n✓ Aurora Replicas đa AZ: phục vụ đọc và được Aurora tự động promote khi primary lỗi, HA trong Region.\n✗ RDS Read Replica cross-Region không tự promote và nhằm DR/đọc cross-Region.\n✗ S3 CRR không liên quan đến failover database.\n✗ DynamoDB Global Tables là NoSQL, thay đổi cả mô hình dữ liệu, không cần thiết.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-034",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng quan trọng yêu cầu RTO và RPO gần như bằng 0, người dùng toàn cầu phải luôn được phục vụ bởi cả hai Region cùng lúc, và nếu một Region mất hoàn toàn thì Region kia phải tiếp tục xử lý 100% traffic ngay lập tức. Chiến lược DR nào phù hợp nhất?",
    "options": [
      "Multi-Site active-active với cả hai Region cùng phục vụ traffic qua Route 53",
      "Warm Standby với Region thứ cấp chạy bản thu nhỏ",
      "Pilot Light với chỉ database được replicate",
      "Backup and Restore với cross-Region snapshot"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Multi-Site active-active đạt RTO/RPO gần 0 vì cả hai Region đều phục vụ traffic thật.\n✓ Multi-Site active-active: cả hai Region xử lý production đồng thời, mất một Region thì Region kia tiếp nhận ngay, RTO/RPO gần 0.\n✗ Warm Standby cần scale out khi failover nên RTO không bằng 0.\n✗ Pilot Light cần dựng app tier khi thảm họa, RTO cao hơn.\n✗ Backup and Restore có RTO/RPO cao nhất.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-035",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một Application Load Balancer phân phối traffic tới các EC2 instance trong một target group. Kiến trúc sư muốn ALB tự động ngừng gửi request tới các instance không phản hồi đúng và chỉ gửi tới các instance khỏe mạnh. Tính năng nào của ALB thực hiện điều này?",
    "options": [
      "Health checks của target group",
      "Sticky sessions",
      "Cross-zone load balancing",
      "SSL/TLS termination"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Health checks của target group xác định instance khỏe mạnh để định tuyến traffic.\n✓ Health checks: ALB ngừng gửi request tới target không qua health check và chỉ phục vụ instance khỏe mạnh.\n✗ Sticky sessions giữ phiên người dùng trên cùng target, không kiểm tra sức khỏe.\n✗ Cross-zone load balancing phân bố đều giữa các AZ, không kiểm tra sức khỏe.\n✗ SSL/TLS termination xử lý mã hóa, không liên quan tới sức khỏe target.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-036",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng yêu cầu shared file storage được nhiều EC2 instance ở các AZ khác nhau cùng mount, và phải vẫn sẵn sàng khi một AZ gặp sự cố. Giải pháp lưu trữ nào phù hợp nhất?",
    "options": [
      "Amazon EFS với mount target ở mỗi AZ",
      "Một EBS volume gắn vào instance ở một AZ và chia sẻ qua NFS tự cấu hình",
      "Instance store volume trên mỗi instance",
      "Amazon S3 mount qua một single-AZ gateway tùy chỉnh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EFS là file system được chia sẻ, dữ liệu được lưu dư thừa trên nhiều AZ.\n✓ EFS với mount target mỗi AZ: nhiều instance đa AZ cùng truy cập, vẫn sẵn sàng khi một AZ lỗi.\n✗ EBS gắn một AZ là single point of failure và (theo chuẩn) chỉ gắn một instance.\n✗ Instance store là ephemeral, mất dữ liệu khi instance dừng và không chia sẻ.\n✗ S3 qua gateway single-AZ tạo điểm lỗi đơn và không phải POSIX file system tự nhiên.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-037",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một kiến trúc sư so sánh giữa triển khai Multi-AZ và Multi-Region cho một workload. Phát biểu nào mô tả ĐÚNG nhất sự khác biệt quan trọng giữa hai cách tiếp cận?",
    "options": [
      "Multi-AZ bảo vệ chống lỗi cấp data center/AZ với độ trễ thấp trong một Region; Multi-Region bảo vệ chống thảm họa cấp Region nhưng phức tạp và tốn kém hơn",
      "Multi-AZ và Multi-Region cung cấp mức bảo vệ tương đương, chỉ khác tên gọi",
      "Multi-Region luôn rẻ hơn Multi-AZ vì dùng ít tài nguyên hơn",
      "Multi-AZ bảo vệ chống thảm họa toàn Region còn Multi-Region chỉ bảo vệ trong một AZ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Multi-AZ là HA trong một Region; Multi-Region là DR/khả năng chịu lỗi ở quy mô Region với chi phí và độ phức tạp cao hơn.\n✓ Multi-AZ chống lỗi AZ với độ trễ thấp; Multi-Region chống thảm họa Region nhưng phức tạp/tốn kém hơn.\n✗ Hai cách không tương đương về phạm vi bảo vệ.\n✗ Multi-Region thường tốn kém hơn, không rẻ hơn.\n✗ Mô tả đảo ngược vai trò là sai.",
    "domain": 2,
    "mock": 1
  },
  {
    "id": "saa-m1-038",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một ứng dụng cần scratch storage cho dữ liệu tạm trong quá trình xử lý: hiệu năng I/O cực cao, độ trễ thấp nhất, và chấp nhận mất dữ liệu khi instance dừng. Đồng thời cần kết quả cuối được lưu durable. Chọn HAI lựa chọn đúng cho kiến trúc này.",
    "options": [
      "Dùng instance store NVMe SSD làm vùng scratch tạm trong khi xử lý",
      "Ghi kết quả cuối cùng ra Amazon S3 để lưu trữ durable",
      "Dùng EBS sc1 làm vùng scratch để tiết kiệm chi phí",
      "Lưu dữ liệu tạm trên Amazon S3 Glacier để truy xuất nhanh",
      "Dùng EFS Infrequent Access cho dữ liệu scratch I/O cao"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Instance store cho I/O nhanh nhất và phù hợp dữ liệu ephemeral, còn S3 đảm bảo lưu trữ durable cho kết quả cuối.\n✓ Instance store NVMe cung cấp I/O cực cao, latency thấp, lý tưởng cho scratch chấp nhận mất khi instance dừng.\n✓ Amazon S3 lưu kết quả cuối với durability 11 số 9, đúng yêu cầu durable.\n✗ sc1 là HDD lạnh chi phí thấp nhưng hiệu năng rất thấp, không hợp scratch I/O cao.\n✗ S3 Glacier là lưu trữ lạnh truy xuất chậm, hoàn toàn sai cho dữ liệu tạm cần tốc độ.\n✗ EFS IA tối ưu chi phí dữ liệu ít truy cập, không phải scratch I/O cao.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-039",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một ứng dụng web toàn cầu dùng CloudFront trước ALB. Đội vận hành thấy cache hit ratio chỉ 35% và muốn tăng tỉ lệ cache hit cũng như giảm tải lên origin. Những hành động nào sẽ giúp đạt mục tiêu này? (Chọn 2)",
    "options": [
      "Cấu hình cache policy để KHÔNG đưa các cookie và query string không cần thiết vào cache key",
      "Bật Origin Shield để thêm một lớp cache tập trung trước origin",
      "Giảm TTL của tất cả object xuống 0 để luôn lấy bản mới nhất",
      "Chuyển CloudFront price class sang chỉ dùng các edge location đắt nhất",
      "Tắt compression Gzip/Brotli để giảm thời gian xử lý tại edge"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Tăng cache hit ratio bằng cách giảm số biến thể cache key và thêm lớp cache tập trung gom request tới origin.\n✓ Không đưa cookie/query string thừa vào cache key: giảm số biến thể cache key, nhiều request trúng cùng object nên hit ratio tăng.\n✓ Origin Shield: lớp cache trung tâm gom request từ nhiều POP, giảm origin request đáng kể và tăng hiệu quả cache.\n✗ Giảm TTL về 0: ép mọi request đi tới origin, hit ratio giảm và tải origin tăng — ngược mục tiêu.\n✗ Đổi price class sang edge đắt nhất: chỉ ảnh hưởng vùng phục vụ/chi phí, không cải thiện hit ratio.\n✗ Tắt compression: không liên quan cache hit và còn làm payload lớn hơn, chậm hơn.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-040",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một hệ thống phân tích log ghi dữ liệu vào S3 với tốc độ rất cao và liên tục đạt giới hạn request. Mọi object hiện đều dùng cùng một prefix dạng logs/. Kiến trúc sư cần tăng throughput request mà không đổi sang dịch vụ khác. Cách nào hiệu quả nhất?",
    "options": [
      "Phân tán key object qua nhiều prefix (ví dụ logs/2026/01/, logs/2026/02/) để tăng số request song song",
      "Bật S3 Versioning để mỗi version được xử lý bởi partition riêng",
      "Chuyển bucket sang storage class S3 Intelligent-Tiering để tăng throughput",
      "Gom nhiều log thành một object lớn duy nhất rồi ghi mỗi giờ một lần"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 scale theo prefix: mỗi prefix hỗ trợ tới 3.500 PUT/COPY/POST/DELETE và 5.500 GET/HEAD mỗi giây, nên phân tán key qua nhiều prefix sẽ nhân throughput.\n✓ Nhiều prefix tạo nhiều partition song song, tăng tổng số request mỗi giây.\n✗ Versioning không liên quan đến giới hạn request rate theo prefix.\n✗ Intelligent-Tiering tối ưu chi phí lưu trữ, không thay đổi request rate.\n✗ Gom thành một object lớn ghi mỗi giờ làm mất tính real-time và không phải cách scale request rate.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-041",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một cơ sở dữ liệu quan hệ self-managed trên EC2 cần volume EBS cung cấp IOPS và throughput ổn định ở mức cao, đồng thời cho phép điều chỉnh IOPS và throughput độc lập với dung lượng để tối ưu chi phí. Loại volume nào phù hợp nhất?",
    "options": [
      "EBS gp3",
      "EBS gp2",
      "EBS st1 (Throughput Optimized HDD)",
      "EBS sc1 (Cold HDD)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "gp3 cho phép cấu hình IOPS và throughput độc lập với dung lượng, hiệu năng baseline ổn định và rẻ hơn gp2.\n✓ gp3 tách rời IOPS/throughput khỏi size, cost-effective cho database cần hiệu năng dự đoán được.\n✗ gp2 gắn IOPS theo dung lượng (3 IOPS/GB) và phụ thuộc burst credit, kém linh hoạt và đắt hơn gp3.\n✗ st1 là HDD throughput-optimized cho sequential, không phù hợp database transactional cần IOPS.\n✗ sc1 là HDD lạnh chi phí thấp cho dữ liệu ít truy cập, không đáp ứng hiệu năng database.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-042",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một nhóm Linux developer cần một shared file system có thể tự động co giãn dung lượng, gắn đồng thời từ nhiều EC2 instance qua NFS trên nhiều Availability Zone, với least operational overhead. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon EFS",
      "Amazon EBS Multi-Attach io2",
      "Amazon FSx for Windows File Server",
      "Amazon S3 mount như một ổ đĩa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EFS là file system NFS managed, tự động co giãn và truy cập đồng thời từ nhiều instance trên nhiều AZ với vận hành tối thiểu.\n✓ EFS hỗ trợ NFS, multi-AZ, elastic capacity và truy cập đồng thời, least operational overhead.\n✗ EBS Multi-Attach io2 chỉ trong một AZ và yêu cầu cluster-aware file system, phức tạp hơn nhiều.\n✗ FSx for Windows dùng SMB cho Windows, không phù hợp NFS trên Linux.\n✗ S3 là object storage, không phải file system POSIX để mount tự nhiên cho dev workflow.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-043",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web có lưu lượng dao động trong ngày. Đội vận hành muốn Auto Scaling group tự động giữ mức trung bình CPU utilization của các instance quanh 50% với cấu hình đơn giản, ít thao tác vận hành nhất. Chính sách scaling nào phù hợp nhất?",
    "options": [
      "Target tracking scaling policy với metric Average CPU Utilization = 50%",
      "Simple scaling policy dựa trên CloudWatch alarm khi CPU > 80%",
      "Step scaling policy với nhiều bậc điều chỉnh theo CPU",
      "Scheduled scaling theo khung giờ cố định"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Target tracking tự điều chỉnh số instance để giữ metric quanh giá trị mục tiêu, ít cấu hình và ít vận hành nhất.\n✓ Target tracking với CPU = 50% — đúng, AWS tự tính số instance cần để giữ metric quanh mục tiêu, đơn giản nhất.\n✗ Simple scaling theo alarm — cần cooldown thủ công, phản ứng chậm và nhiều cấu hình hơn.\n✗ Step scaling nhiều bậc — linh hoạt nhưng phức tạp, cần định nghĩa từng bậc thủ công.\n✗ Scheduled scaling — chỉ tốt khi tải có lịch dự đoán trước cố định, không bám theo CPU thực tế.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-044",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một workload HPC (mô phỏng tính toán) chạy trên một cụm nhiều EC2 instance cần băng thông cao và độ trễ network cực thấp GIỮA CÁC NODE trong cùng một AZ để trao đổi dữ liệu liên tục. Cấu hình nào tối ưu nhất cho hiệu năng giao tiếp giữa các node?",
    "options": [
      "Cluster placement group kết hợp Elastic Fabric Adapter (EFA)",
      "Spread placement group để phân tán các node trên nhiều hardware",
      "Partition placement group trên nhiều rack",
      "Đặt các instance ở nhiều AZ và bật Enhanced Networking"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cluster placement group gom các instance gần nhau để có băng thông cao và độ trễ thấp, còn EFA cho phép giao tiếp HPC/MPI hiệu năng cao bỏ qua OS kernel.\n✓ Cluster placement group + EFA — đúng, gom node cùng AZ với độ trễ thấp, EFA tối ưu giao tiếp inter-node cho HPC.\n✗ Spread placement group — phân tán phần cứng để giảm rủi ro cùng lỗi, không tối ưu độ trễ giữa node.\n✗ Partition placement group — cho dữ liệu phân tán lớn (Hadoop/Kafka), không tối ưu low-latency inter-node.\n✗ Nhiều AZ + Enhanced Networking — đặt ở nhiều AZ làm tăng độ trễ giữa các node.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-045",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng phân tích chạy theo lô lớn, có thể chịu được việc instance bị gián đoạn và tự khởi động lại task. Đội muốn giảm chi phí compute tối đa cho phần workload không khẩn cấp này. Phương án cost-effective nhất cho phần workload chịu gián đoạn?",
    "options": [
      "Dùng Spot Instances cho phần workload chịu gián đoạn",
      "Dùng On-Demand Instances để đảm bảo không gián đoạn",
      "Mua Reserved Instances 3 năm cho toàn bộ workload",
      "Dùng Dedicated Hosts cho phần workload này"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Spot Instances rẻ nhất (tới ~90%) và phù hợp workload chịu được gián đoạn như batch/analytics có thể retry.\n✓ Spot Instances — đúng, rẻ nhất cho workload fault-tolerant chịu được interruption.\n✗ On-Demand — không gián đoạn nhưng đắt hơn nhiều, lãng phí cho workload chịu được gián đoạn.\n✗ RI 3 năm cho toàn bộ — cam kết dài hạn không hợp với phần tải biến động/không khẩn.\n✗ Dedicated Hosts — đắt nhất, dùng cho yêu cầu license/compliance, không tối ưu chi phí.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-046",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nền tảng gaming dùng DynamoDB lưu bảng xếp hạng (leaderboard) với hàng triệu lượt đọc mỗi giây trong giờ cao điểm. Hồ sơ người chơi được đọc lặp lại liên tục và yêu cầu độ trễ ở mức microsecond. Hiện tại độ trễ single-digit millisecond của DynamoDB chưa đủ nhanh. Giải pháp nào đáp ứng yêu cầu với ít thay đổi ứng dụng nhất?",
    "options": [
      "Thêm DynamoDB Accelerator (DAX) làm in-memory cache trước DynamoDB",
      "Đặt Amazon ElastiCache for Redis trước DynamoDB và tự quản lý logic cache",
      "Bật DynamoDB Global Tables để giảm độ trễ đọc",
      "Chuyển bảng sang chế độ provisioned capacity với auto scaling"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DAX là in-memory cache được thiết kế riêng cho DynamoDB, cung cấp độ trễ microsecond với API tương thích nên gần như không phải sửa code.\n✓ DAX cho độ trễ microsecond cho read-heavy, tích hợp gốc với DynamoDB, ít thay đổi ứng dụng.\n✗ ElastiCache for Redis cũng cache được nhưng phải tự viết logic cache-aside, operational overhead cao hơn DAX.\n✗ Global Tables giải quyết replication đa region, không giảm độ trễ đọc xuống microsecond.\n✗ Provisioned capacity điều chỉnh throughput chứ không hạ độ trễ xuống mức microsecond.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-047",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng web dùng DynamoDB với primary key là CustomerId. Sản phẩm cần truy vấn đơn hàng theo OrderStatus và theo OrderDate, đây là các thuộc tính không phải key. Hiện tại ứng dụng đang Scan toàn bảng rồi lọc, gây tốn kém và chậm. Cách tối ưu nhất để hỗ trợ các truy vấn này?",
    "options": [
      "Tạo Global Secondary Index (GSI) với OrderStatus và OrderDate làm key để Query trực tiếp",
      "Tạo Local Secondary Index (LSI) trên OrderStatus và OrderDate",
      "Bật DynamoDB Streams và xây bảng phụ được denormalize theo OrderStatus",
      "Tăng provisioned read capacity để các thao tác Scan chạy nhanh hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "GSI cho phép truy vấn theo các thuộc tính không phải primary key gốc với partition/sort key khác, thay thế Scan tốn kém bằng Query hiệu quả.\n✓ GSI tạo index với OrderStatus/OrderDate làm key, cho phép Query thay vì Scan toàn bảng — nhanh và rẻ hơn nhiều.\n✗ LSI phải dùng chung partition key với bảng gốc (CustomerId) và chỉ tạo được lúc tạo bảng — không hỗ trợ truy vấn theo OrderStatus độc lập.\n✗ DynamoDB Streams + bảng phụ giải quyết được nhưng phức tạp, tốn công maintain so với GSI native.\n✗ Tăng read capacity chỉ làm Scan tốn kém hơn về chi phí, không giải quyết bản chất kém hiệu quả của Scan.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-048",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một startup ra mắt ứng dụng mới và không thể dự đoán traffic; có thể tăng vọt bất ngờ rồi giảm về gần 0. Họ muốn dùng DynamoDB nhưng lo lắng về việc throttling khi chưa provisioned đủ capacity và lãng phí khi provisioned quá mức. Giải pháp nào phù hợp nhất mà LEAST operational overhead?",
    "options": [
      "Dùng DynamoDB on-demand capacity mode",
      "Dùng provisioned capacity với auto scaling cấu hình thủ công",
      "Provisioned capacity cao cố định để tránh throttling",
      "Dùng provisioned capacity thấp kết hợp DynamoDB Accelerator (DAX)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "On-demand mode tự động phục vụ throughput theo lưu lượng thực tế, không cần dự đoán capacity, lý tưởng cho traffic không đoán trước.\n✓ On-demand tự scale tức thời theo traffic, chỉ trả tiền theo request thực dùng — không cần planning, ít vận hành nhất.\n✗ Provisioned + auto scaling cần cấu hình ngưỡng và có độ trễ scaling, không lý tưởng cho burst đột ngột không đoán trước.\n✗ Provisioned cao cố định lãng phí lớn khi traffic giảm về 0.\n✗ DAX là caching layer giảm độ trễ đọc, không giải quyết vấn đề capacity planning cho ghi/burst.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-049",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nền tảng game multiplayer chạy trên EC2 fleet sau NLB, dùng giao thức UDP, triển khai ở hai region (us-east-1 và ap-southeast-1). Yêu cầu: client cần một địa chỉ IP cố định để whitelist, latency thấp ổn định, và failover giữa region trong vòng dưới một giây khi một region down. Giải pháp nào phù hợp nhất?",
    "options": [
      "AWS Global Accelerator với hai static anycast IP, endpoint trỏ tới NLB ở mỗi region",
      "Amazon CloudFront với NLB làm origin và Origin Failover group giữa hai region",
      "Route 53 failover routing với TTL 30 giây trỏ tới NLB của từng region",
      "Route 53 latency-based routing kết hợp health check trên hai NLB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Global Accelerator cung cấp static anycast IP, định tuyến UDP qua AWS backbone với latency thấp và failover dưới một giây — đúng mọi yêu cầu.\n✓ Global Accelerator: 2 static IP để whitelist, hỗ trợ UDP (L4), failover region dưới 1s không phụ thuộc DNS.\n✗ CloudFront: là CDN L7 HTTP/HTTPS, không hỗ trợ UDP game traffic và không cho static IP.\n✗ Route 53 failover TTL 30s: phụ thuộc DNS cache của client/resolver, failover thường chậm hơn nhiều giây, không cho static IP.\n✗ Route 53 latency-based: vẫn là DNS, không đảm bảo failover dưới 1s và không cấp static IP cho whitelist.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-050",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một doanh nghiệp tài chính cần kết nối data center on-premises với AWS để truyền dữ liệu liên tục 2 Gbps với latency thấp và ổn định, và yêu cầu compliance không cho phép traffic đi qua public internet. Giải pháp nào đáp ứng tốt nhất?",
    "options": [
      "AWS Direct Connect với dedicated connection 10 Gbps",
      "Site-to-Site VPN với hai tunnel để tăng throughput tổng",
      "Site-to-Site VPN qua AWS Global Accelerator để tối ưu route",
      "Nhiều Site-to-Site VPN connection gộp lại bằng ECMP để đạt 2 Gbps"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Direct Connect cung cấp kết nối riêng với throughput, latency ổn định và không đi qua internet — đáp ứng cả hiệu năng lẫn compliance.\n✓ Direct Connect 10 Gbps: throughput trên 2 Gbps consistent, latency predictable, traffic không qua public internet, thỏa compliance.\n✗ VPN hai tunnel: mỗi tunnel khoảng 1.25 Gbps và đi qua public internet, không thỏa yêu cầu compliance.\n✗ VPN qua Global Accelerator: vẫn dựa trên internet ở chặng cuối tới on-prem, không thỏa yêu cầu no internet.\n✗ Nhiều VPN + ECMP: phức tạp, jitter cao, và vẫn đi qua public internet.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-051",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty chạy hai bản sao của ứng dụng web ở us-east-1 và eu-west-1, mỗi bản sau một ALB riêng. Họ muốn user được tự động định tuyến tới region có độ trễ mạng thấp nhất từ vị trí của họ. Routing policy nào của Route 53 phù hợp nhất?",
    "options": [
      "Latency-based routing với health check trên mỗi ALB",
      "Weighted routing chia 50/50 giữa hai region",
      "Geolocation routing theo quốc gia của user",
      "Simple routing trỏ tới cả hai ALB cùng lúc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Latency-based routing định tuyến user tới region cho latency thấp nhất từ resolver của họ, kèm health check để bỏ qua region lỗi.\n✓ Latency-based routing: chọn region latency thấp nhất tự động, health check loại region down — đúng mục tiêu.\n✗ Weighted 50/50: chia theo tỉ lệ cố định, không tối ưu theo latency địa lý.\n✗ Geolocation: định tuyến theo ranh giới địa lý cố định, không phản ánh latency thực tế và dễ bỏ sót vùng chưa map.\n✗ Simple routing nhiều giá trị: trả về ngẫu nhiên không xét latency và không health check.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-052",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty lưu hàng terabyte log JSON thô trong S3. Đội data muốn chạy các truy vấn SQL ad-hoc không thường xuyên trực tiếp trên dữ liệu này mà không cần load vào database hay vận hành cluster, và chỉ trả tiền theo dung lượng quét. Giải pháp nào tối ưu nhất về cost-effective và least operational overhead?",
    "options": [
      "Amazon Athena truy vấn trực tiếp dữ liệu S3, dùng AWS Glue Data Catalog làm schema",
      "Amazon Redshift provisioned cluster với COPY toàn bộ dữ liệu từ S3 vào rồi truy vấn",
      "Amazon EMR với Hive chạy liên tục để phục vụ truy vấn ad-hoc",
      "Amazon RDS for PostgreSQL với dữ liệu được import định kỳ từ S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena là serverless query engine query trực tiếp trên S3, tính phí theo dữ liệu quét, lý tưởng cho truy vấn ad-hoc không thường xuyên.\n✓ Athena serverless, không cần cluster, trả tiền theo lượng quét, dùng Glue Data Catalog cho schema.\n✗ Redshift provisioned cluster chạy liên tục tốn chi phí cố định, thừa cho truy vấn không thường xuyên.\n✗ EMR Hive chạy liên tục đòi hỏi quản lý cluster và chi phí cao khi truy vấn thưa thớt.\n✗ RDS cần import dữ liệu và không phù hợp để quét hàng terabyte log thô trong S3.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-053",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một pipeline streaming dùng Kinesis Data Streams cần biến đổi nhẹ từng record (làm sạch, enrich) ngay trước khi lưu vào S3 cho data lake. Lượng dữ liệu lớn nhưng transform đơn giản, và đội muốn tránh quản lý hạ tầng tối đa. Kiến trúc nào tối ưu nhất về least operational overhead?",
    "options": [
      "Kết nối Amazon Data Firehose vào stream và bật tích hợp Lambda transformation để biến đổi record trước khi ghi S3",
      "Triển khai một consumer application Spark Streaming trên EMR đọc stream, transform và ghi S3",
      "Dùng KCL consumer chạy trên một Auto Scaling group EC2 để transform và ghi S3",
      "Ghi raw vào S3 bằng Firehose rồi chạy Glue ETL batch định kỳ để transform sau"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firehose với Lambda transformation cho phép biến đổi từng record inline rồi tự ghi vào S3, fully managed cho transform nhẹ trên stream.\n✓ Firehose + Lambda transformation managed hoàn toàn, biến đổi record inline và tự ghi S3, ít vận hành nhất.\n✗ Spark Streaming trên EMR đòi hỏi quản lý cluster, quá nặng cho transform đơn giản.\n✗ KCL consumer trên EC2 ASG buộc tự viết và vận hành ứng dụng, nhiều operational overhead.\n✗ Ghi raw rồi Glue batch thêm độ trễ và một bước xử lý, không tối ưu khi transform có thể làm inline.",
    "domain": 3,
    "mock": 1
  },
  {
    "id": "saa-m1-054",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một tổ chức có hàng nghìn EBS volume và muốn giảm chi phí cũng như rủi ro của việc quản lý EBS snapshot thủ công (tạo snapshot định kỳ, giữ lại theo policy, xóa snapshot cũ). Họ muốn least operational overhead. Chọn HAI hành động giúp đạt mục tiêu này.",
    "options": [
      "Dùng Amazon Data Lifecycle Manager (DLM) để tự động tạo, giữ và xóa EBS snapshot theo policy",
      "Cấu hình DLM lưu trữ các snapshot ít dùng vào EBS Snapshots Archive tier để giảm chi phí lưu trữ snapshot dài hạn",
      "Viết một cron job trên mỗi EC2 instance gọi AWS CLI để tạo snapshot",
      "Copy thủ công snapshot sang một Region khác mỗi tuần để giảm chi phí",
      "Bật EBS encryption để giảm chi phí lưu trữ snapshot"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "DLM tự động hóa vòng đời snapshot, và DLM có thể lưu trữ snapshot ít dùng vào EBS Snapshots Archive tier rẻ hơn cho dài hạn, cùng giảm chi phí lẫn vận hành.\n✓ Amazon Data Lifecycle Manager — đúng, tự động hóa toàn bộ vòng đời snapshot, giảm thao tác thủ công.\n✓ DLM lưu vào EBS Snapshots Archive tier — đúng, hạ chi phí lưu trữ snapshot giữ lâu mà ít truy cập.\n✗ Cron job trên mỗi instance — tăng operational overhead và dễ lỗi, trái mục tiêu.\n✗ Copy snapshot sang Region khác hằng tuần — phục vụ DR/độ bền chứ không giảm chi phí, còn tăng phí.\n✗ Bật EBS encryption — liên quan bảo mật, không ảnh hưởng chi phí lưu trữ snapshot.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-055",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Solutions Architect review một Amazon RDS for PostgreSQL Multi-AZ instance đang chạy db.r5.4xlarge. Báo cáo CloudWatch cho thấy CPU trung bình 12%, FreeableMemory cao liên tục, IOPS thấp suốt 60 ngày. Mục tiêu là cost-optimize database mà vẫn giữ tính sẵn sàng cho production. Những hành động nào hợp lý? (Chọn 2)",
    "options": [
      "Right-size xuống một instance class nhỏ hơn (ví dụ db.r5.large) dựa trên metric thực tế",
      "Mua Reserved Instance cho instance class mới sau khi đã right-size và xác nhận ổn định",
      "Tắt Multi-AZ để tiết kiệm một nửa chi phí compute",
      "Bật thêm 3 read replicas để phân tán tải CPU 12%",
      "Chuyển ngay sang db.r5.8xlarge để có headroom cho tương lai"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Metric thấp kéo dài cho thấy instance bị over-provisioned: nên right-size xuống rồi mới cam kết RI cho instance class mới để khóa chiết khấu lâu dài.\n✓ Right-size xuống instance nhỏ hơn — đúng, CPU/RAM/IOPS thấp suốt 60 ngày là dấu hiệu rõ ràng over-provisioned.\n✓ Mua RI sau khi right-size — đúng, cam kết RI cho size đúng để tối ưu chi phí dài hạn của production ổn định.\n✗ Tắt Multi-AZ — hy sinh tính sẵn sàng của production, vi phạm yêu cầu giữ HA.\n✗ Thêm read replicas — CPU mới 12%, không có tải để phân tán; chỉ làm tăng chi phí.\n✗ Lên db.r5.8xlarge — phóng to ngược lại khi đang dư thừa, càng lãng phí.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-056",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty media lưu các bản ghi log truy cập vào S3. Log được phân tích nhiều trong 30 ngày đầu, sau đó hiếm khi cần nhưng vẫn phải truy xuất trong vài giờ nếu có yêu cầu audit, và phải giữ tổng cộng 7 năm vì lý do compliance. Giải pháp lifecycle nào TỐI ƯU CHI PHÍ nhất?",
    "options": [
      "Giữ ở S3 Standard 30 ngày, chuyển sang S3 Glacier Flexible Retrieval, rồi sang S3 Glacier Deep Archive, xóa sau 7 năm",
      "Giữ ở S3 Standard 30 ngày rồi chuyển thẳng sang S3 Glacier Deep Archive, xóa sau 7 năm",
      "Giữ ở S3 Standard-IA toàn bộ 7 năm",
      "Giữ ở S3 Standard 30 ngày rồi chuyển sang S3 Standard-IA cho 7 năm còn lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần truy xuất trong vài giờ ở giai đoạn đầu sau 30 ngày (phù hợp Glacier Flexible Retrieval), rồi mới hạ xuống Deep Archive rẻ nhất cho phần đuôi dài.\n✓ Standard → Glacier Flexible Retrieval → Deep Archive — đúng, cân bằng giữa yêu cầu truy xuất vài giờ và chi phí thấp nhất về dài hạn.\n✗ Standard → thẳng Deep Archive — Deep Archive cần tới ~12 giờ để truy xuất, không đáp ứng được nhu cầu audit vài giờ trong giai đoạn đầu.\n✗ Standard-IA toàn bộ 7 năm — đắt hơn nhiều so với Glacier cho dữ liệu hầu như không truy cập.\n✗ Standard → Standard-IA cho 7 năm — vẫn đắt hơn nhiều so với tier archive cho dữ liệu lưu trữ dài hạn.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-057",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty dùng Amazon EFS để lưu file của ứng dụng. Phân tích cho thấy phần lớn file chỉ được truy cập trong vài ngày đầu rồi gần như không động đến nữa, nhưng đôi khi vẫn cần đọc lại với độ trễ chấp nhận được. Họ muốn giảm chi phí lưu trữ EFS mà KHÔNG thay đổi code ứng dụng. Cách TỐI ƯU CHI PHÍ nhất là gì?",
    "options": [
      "Bật EFS Lifecycle Management để tự động chuyển file ít truy cập sang EFS Infrequent Access (IA), và bật Intelligent-Tiering để tự đưa file trở lại khi được truy cập",
      "Di chuyển toàn bộ file sang một EFS file system mới dùng One Zone storage class",
      "Sao chép file ít dùng sang S3 Glacier bằng script tùy biến và xóa khỏi EFS",
      "Tăng provisioned throughput của EFS để xử lý nhanh hơn rồi xóa file cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EFS Lifecycle Management cùng Intelligent-Tiering tự chuyển file ít truy cập xuống tier IA rẻ hơn (và đưa lại Standard khi được truy cập), giảm chi phí mà không sửa code.\n✓ EFS Lifecycle Management + IA + Intelligent-Tiering — đúng, tự động dịch chuyển file theo mẫu truy cập, minh bạch với ứng dụng.\n✗ EFS One Zone — giảm chi phí nhưng hạ độ bền (một AZ) và đòi di chuyển dữ liệu, không phải giải pháp tier hóa theo truy cập.\n✗ Script copy sang Glacier rồi xóa khỏi EFS — tăng operational overhead lớn và thay đổi cách truy cập file, đòi sửa ứng dụng.\n✗ Tăng provisioned throughput — làm tăng chi phí, không liên quan tối ưu lưu trữ.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-058",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty chạy một workload phân tích batch trên EC2. Workload có thể bị gián đoạn bất cứ lúc nào, tự lưu checkpoint và chạy lại từ checkpoint khi cần. Công ty muốn giảm chi phí compute tối đa. Giải pháp nào là MOST cost-effective?",
    "options": [
      "Chạy workload trên EC2 Spot Instances",
      "Mua Standard Reserved Instances kỳ hạn 1 năm",
      "Chạy trên EC2 On-Demand Instances",
      "Mua EC2 Instance Savings Plans kỳ hạn 3 năm"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Workload chịu được gián đoạn và có checkpoint là use case kinh điển cho Spot, vốn rẻ tới ~90% so với On-Demand.\n✓ Spot Instances tận dụng capacity dư thừa với giá thấp nhất, phù hợp workload fault-tolerant, có thể gián đoạn.\n✗ Reserved Instances cam kết 1 năm phù hợp workload chạy liên tục, không khai thác được tính fault-tolerant để giảm chi phí tối đa.\n✗ On-Demand đắt nhất, lãng phí khi workload chấp nhận được gián đoạn.\n✗ Savings Plans 3 năm cam kết chi tiêu cố định, không rẻ bằng Spot cho workload gián đoạn được.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-059",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty chạy API REST có lưu lượng rất biến động: cao điểm ngắn vào giờ làm việc và gần như không có request vào ban đêm và cuối tuần. Hiện tại API chạy trên một EC2 Auto Scaling Group với mức tối thiểu luôn bật, dẫn đến trả tiền cho thời gian rỗi. Kiến trúc sư muốn giải pháp MOST cost-effective và serverless. Phương án nào tốt nhất?",
    "options": [
      "Tái kiến trúc API dùng Amazon API Gateway và AWS Lambda",
      "Giảm minimum size của Auto Scaling Group xuống 1 và dùng Spot Instances",
      "Chuyển sang AWS Fargate với một service luôn chạy 2 task",
      "Mua Compute Savings Plans cho Auto Scaling Group hiện tại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với lưu lượng spiky và nhiều thời gian rỗi, mô hình pay-per-request của Lambda + API Gateway loại bỏ hoàn toàn chi phí idle và là kiến trúc serverless.\n✓ API Gateway + Lambda chỉ tính tiền theo số request/thời gian chạy, không trả tiền khi không có traffic, tối ưu nhất cho tải biến động và đúng yêu cầu serverless.\n✗ Giảm min size + Spot vẫn phải trả tiền cho instance đang chạy và không phải serverless.\n✗ Fargate với 2 task luôn chạy vẫn tốn tiền suốt thời gian rỗi ban đêm và cuối tuần.\n✗ Savings Plans cam kết chi tiêu cố định, lãng phí khi tải gần như bằng 0 phần lớn thời gian.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-060",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty fintech chạy fleet EC2 stateless lớn cho fanout xử lý sự kiện. Họ muốn dùng Spot để tiết kiệm nhưng cần giảm thiểu khả năng cả fleet bị gián đoạn cùng lúc khi capacity một pool cạn. Cấu hình nào giúp đạt MOST resilient mà vẫn tối ưu chi phí Spot?",
    "options": [
      "Dùng EC2 Auto Scaling với allocation strategy price-capacity-optimized và đa dạng hóa qua nhiều instance type và Availability Zone",
      "Dùng một Spot Fleet chỉ chọn instance type duy nhất rẻ nhất trong một AZ",
      "Dùng allocation strategy lowest-price chỉ giới hạn ở hai instance type rẻ nhất",
      "Đặt một maximum Spot price thật cao để không bao giờ bị gián đoạn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đa dạng hóa qua nhiều instance type/AZ với price-capacity-optimized giúp Auto Scaling rút từ các pool dồi dào nhất, giảm rủi ro gián đoạn đồng loạt.\n✓ price-capacity-optimized + đa dạng hóa instance type và AZ phân tán rủi ro qua nhiều Spot pool, vừa rẻ vừa bền vững nhất.\n✗ Một instance type trong một AZ tập trung rủi ro vào một pool duy nhất, dễ bị reclaim toàn bộ.\n✗ lowest-price giới hạn 2 type ưu tiên giá nhưng vẫn ít pool, dễ cạn capacity cùng lúc.\n✗ Đặt max price cao không ngăn được gián đoạn do thiếu capacity — Spot bị reclaim khi hết capacity, không chỉ vì giá.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-061",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng SaaS dùng Amazon Aurora MySQL. Lưu lượng database có pattern khó dự đoán: gần như không có tải vào ban đêm và cuối tuần, nhưng tăng vọt bất ngờ trong giờ làm việc. Hiện tại provisioned instance được cấu hình theo peak nên lãng phí lớn lúc thấp tải. Giải pháp cost-effective nhất với least operational overhead là gì?",
    "options": [
      "Chuyển sang Aurora Serverless v2, đặt Aurora Capacity Units min/max phù hợp",
      "Giữ provisioned instance nhưng viết Lambda + scheduler để stop/start theo giờ",
      "Tạo thêm Aurora read replicas và phân tải bằng Route 53 weighted routing",
      "Right-size provisioned instance xuống bằng tải trung bình hàng ngày"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora Serverless v2 tự scale ACU lên/xuống gần như tức thời theo tải biến động khó dự đoán, chỉ trả tiền cho capacity thực dùng, không cần tự quản lý lịch.\n✓ Aurora Serverless v2 — đúng, tự co giãn theo spike, scale gần 0 lúc nhàn rỗi, least operational overhead.\n✗ Lambda stop/start theo giờ — không xử lý được spike bất ngờ và thêm gánh nặng vận hành lịch.\n✗ Read replicas + Route 53 — tăng chi phí và chỉ giúp đọc, không giải quyết lãng phí lúc thấp tải.\n✗ Right-size xuống mức trung bình — sẽ không chịu nổi spike giờ làm việc, gây nghẽn hiệu năng.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-062",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng báo cáo dùng Amazon RDS for MySQL (Single-AZ). Phần lớn tải là các truy vấn analytics đọc nặng chạy ban ngày, làm primary instance quá tải, trong khi ghi rất ít. Team muốn giảm tải cho primary và tối ưu chi phí thay vì nâng cấp primary lên instance class lớn hơn nhiều. Giải pháp nào tốt nhất?",
    "options": [
      "Thêm một RDS read replica và định tuyến truy vấn analytics đọc sang replica",
      "Bật Multi-AZ rồi đọc từ standby instance để giảm tải primary",
      "Scale up primary lên instance class lớn gấp đôi để chịu tải đọc",
      "Chuyển toàn bộ workload sang Aurora Serverless v2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Read replica cho phép offload truy vấn đọc nặng khỏi primary với chi phí một instance bổ sung, rẻ và linh hoạt hơn nhiều so với phóng to primary.\n✓ Read replica + định tuyến đọc — đúng, giảm tải đọc cho primary đúng chỗ, chi phí tăng có kiểm soát.\n✗ Multi-AZ standby — standby trong RDS MySQL không phục vụ đọc; chỉ để failover.\n✗ Scale up primary gấp đôi — đắt và vẫn dùng một instance gánh cả đọc lẫn ghi, kém tối ưu chi phí.\n✗ Chuyển sang Aurora Serverless v2 — thay đổi engine/kiến trúc lớn, quá mức cho nhu cầu offload đọc.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-063",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng e-commerce dùng DynamoDB với traffic có baseline ổn định khá lớn suốt ngày, nhưng đột biến gấp 8-10 lần trong các đợt flash sale theo lịch định trước vài lần mỗi tháng. Họ muốn cost-effective cho phần baseline nhưng tránh throttling lúc flash sale. Cách tiếp cận nào tối ưu nhất?",
    "options": [
      "Provisioned capacity với auto scaling cho baseline, và lên lịch tăng target capacity trước mỗi flash sale",
      "Để bảng ở On-demand capacity mode suốt thời gian để khỏi lo capacity",
      "Provisioned capacity cố định ở mức peak flash sale để luôn đủ throughput",
      "Provisioned capacity ở mức baseline và dựa hoàn toàn vào burst capacity lúc flash sale"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Baseline lớn và ổn định nên dùng Provisioned (rẻ hơn On-demand) với auto scaling; vì flash sale theo lịch, có thể scheduled scaling nâng capacity trước sự kiện để tránh throttling.\n✓ Provisioned + auto scaling + lên lịch tăng trước flash sale — đúng, rẻ cho baseline và chủ động đủ capacity cho spike đã biết lịch.\n✗ On-demand suốt thời gian — an toàn nhưng đắt hơn nhiều cho phần baseline lớn, ổn định.\n✗ Provisioned cố định ở peak — trả tiền cho 8-10x capacity cả lúc bình thường, cực lãng phí.\n✗ Dựa vào burst capacity — burst chỉ là dự trữ ngắn hạn nhỏ, không đủ cho spike 8-10x kéo dài.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-064",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một kiến trúc multi-tier có web tier và database tier (Amazon RDS) được triển khai trên cùng một Region. Để đạt high availability, đội kỹ thuật đặt EC2 web instances trải đều trên ba Availability Zones, còn RDS Multi-AZ với primary ở AZ-a. Họ nhận thấy chi phí data transfer giữa các tier khá cao. Cách nào giảm cross-AZ data transfer cost mà vẫn duy trì tính sẵn sàng cao?",
    "options": [
      "Sử dụng RDS Proxy và đặt read replica ở mỗi AZ để các web instances đọc từ replica cùng AZ, đồng thời giữ Multi-AZ cho failover",
      "Gom tất cả EC2 web instances vào cùng một AZ với RDS primary để loại bỏ hoàn toàn cross-AZ traffic",
      "Chuyển RDS sang Single-AZ deployment để tránh phí đồng bộ giữa primary và standby",
      "Dùng một Cluster placement group cho các web instances để giảm độ trễ mạng giữa chúng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đặt read replica ở mỗi AZ cho phép phần lớn lưu lượng đọc diễn ra trong cùng AZ (không phát sinh cross-AZ cost) trong khi vẫn giữ Multi-AZ cho HA.\n✓ Read replica theo từng AZ giúp read traffic ở lại trong AZ, giảm cross-AZ cost mà vẫn giữ Multi-AZ failover cho tính sẵn sàng cao.\n✗ Gom hết web instances vào một AZ phá vỡ high availability — mất một AZ là sập toàn bộ web tier.\n✗ Single-AZ RDS loại bỏ HA của database, đi ngược yêu cầu.\n✗ Cluster placement group nằm trong một AZ và không phù hợp cho thiết kế HA đa AZ, không giải quyết cost giữa tier.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m1-065",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng phân tán có các microservices chạy trên EC2 ở hai Region khác nhau (us-east-1 và eu-west-1) để phục vụ người dùng địa phương. Các service gọi chéo Region khá thường xuyên qua public endpoints, làm chi phí inter-Region data transfer và độ trễ tăng cao. Cách nào giảm chi phí và độ trễ của giao tiếp cross-Region HIỆU QUẢ NHẤT?",
    "options": [
      "Thiết kế lại để mỗi Region tự chứa dữ liệu cần thiết (data locality) và chỉ đồng bộ không thường xuyên qua kết nối riêng, giảm thiểu các cuộc gọi đồng bộ cross-Region",
      "Định tuyến toàn bộ traffic cross-Region qua một NAT Gateway trung tâm để tổng hợp chi phí",
      "Tăng kích thước instance ở cả hai Region để xử lý độ trễ cross-Region nhanh hơn",
      "Dùng S3 Cross-Region Replication cho mọi request giữa các service"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giảm số lượng cuộc gọi đồng bộ cross-Region qua data locality là cách trực tiếp nhất để cắt cả chi phí inter-Region transfer lẫn độ trễ.\n✓ Đưa dữ liệu về local và hạn chế đồng bộ cross-Region loại bỏ phần lớn inter-Region data transfer đắt đỏ và độ trễ.\n✗ NAT Gateway không xử lý inter-Region traffic theo cách này và chỉ thêm chi phí data processing.\n✗ Tăng kích thước instance không thay đổi lượng dữ liệu truyền giữa các Region hay đơn giá transfer.\n✗ Cross-Region Replication cho mọi request không phù hợp với giao tiếp service synchronous và tăng chi phí replication.",
    "domain": 4,
    "mock": 1
  },
  {
    "id": "saa-m2-001",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một công ty triển khai AWS IAM Identity Center cho 50 account trong Organizations. Họ muốn quản lý quyền truy cập hiệu quả và an toàn. Những phát biểu nào về permission set là ĐÚNG? (Chọn 2)",
    "options": [
      "Một permission set có thể được gán cho nhiều account và nhóm user, giúp quản lý quyền tập trung",
      "Khi user đăng nhập, Identity Center cấp temporary credentials qua role tương ứng trong account đích",
      "Permission set chỉ áp dụng cho một account duy nhất và phải tạo lại cho mỗi account",
      "Permission set cấp long-term access key cho mỗi user để dùng lâu dài",
      "Permission set thay thế hoàn toàn nhu cầu dùng SCP làm guardrail"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Permission set là tập quyền tái sử dụng được gán cho nhiều account/nhóm và cấp temporary credentials khi đăng nhập.\n✓ Gán cho nhiều account/nhóm: permission set tái sử dụng, quản lý tập trung trên nhiều account.\n✓ Cấp temporary credentials qua role: Identity Center tạo IAM role trong account đích và cấp credentials tạm thời.\n✗ Chỉ cho một account: sai, permission set được thiết kế để dùng lại trên nhiều account.\n✗ Cấp long-term access key: sai, credentials là tạm thời.\n✗ Thay thế SCP: SCP và permission set bổ trợ nhau; SCP vẫn là guardrail cấp account/OU.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-002",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một công ty fintech cần thiết kế lớp data protection cho S3 bucket chứa hồ sơ khách hàng. Họ muốn: kiểm soát key, audit truy cập key, ngăn public access, và enforce mã hoá khi upload. Chọn HAI hành động giúp đạt mục tiêu này.",
    "options": [
      "Dùng SSE-KMS với customer managed key và bật key rotation",
      "Bật S3 Block Public Access ở cấp account và bucket",
      "Lưu trữ dữ liệu ở storage class S3 One Zone-IA",
      "Tắt S3 Versioning để giảm số lượng object",
      "Cho phép truy cập bucket qua ACL public-read cho tiện chia sẻ"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Customer managed KMS key cho kiểm soát+audit key, Block Public Access ngăn lộ dữ liệu công khai.\n✓ SSE-KMS customer managed key + rotation: kiểm soát key policy và audit qua CloudTrail.\n✓ Block Public Access ở account và bucket: chặn mọi cấu hình public, bảo vệ hồ sơ nhạy cảm.\n✗ One Zone-IA: liên quan độ bền/chi phí lưu trữ, không phải mục tiêu data protection.\n✗ Tắt Versioning: làm giảm khả năng phục hồi, không liên quan mục tiêu.\n✗ ACL public-read: trực tiếp gây lộ dữ liệu, sai hoàn toàn yêu cầu.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-003",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức quản lý nhiều AWS account bằng AWS Organizations. Security team muốn đảm bảo rằng KHÔNG account thành viên nào, kể cả admin của account đó, có thể tắt CloudTrail hoặc tạo tài nguyên ngoài region eu-west-1. Giải pháp nào thực thi điều này một cách tập trung và hiệu quả nhất?",
    "options": [
      "Áp dụng Service Control Policy (SCP) ở cấp OU để deny các action cloudtrail:StopLogging và deny mọi action ngoài eu-west-1",
      "Gắn IAM permission boundary cho mọi IAM user trong các account thành viên",
      "Tạo IAM policy deny gắn trực tiếp vào từng role admin của mỗi account",
      "Bật AWS Config rule để phát hiện và tự động bật lại CloudTrail khi bị tắt"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SCP đặt giới hạn quyền tối đa cho toàn bộ account thành viên, kể cả admin của account đó, và được quản lý tập trung.\n✓ SCP ở cấp OU: chặn được mọi IAM principal trong account (kể cả admin), thực thi tập trung, đúng mục tiêu phòng ngừa.\n✗ Permission boundary cho từng user: chỉ giới hạn user/role cụ thể, admin có thể bỏ qua bằng cách tạo entity khác, không tập trung.\n✗ IAM deny policy trên từng role: admin có thể chỉnh sửa hoặc gỡ policy, không ngăn chặn triệt để.\n✗ AWS Config auto-remediation: mang tính phản ứng (detective) chứ không phòng ngừa, CloudTrail vẫn bị tắt trong khoảng thời gian giữa.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-004",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty dùng Active Directory on-premises và muốn cho phép nhân viên đăng nhập AWS Management Console bằng tài khoản AD hiện có, không tạo IAM user riêng cho từng người, và quản lý quyền tập trung trên nhiều account trong Organizations. Giải pháp nào phù hợp nhất với least operational overhead?",
    "options": [
      "Triển khai AWS IAM Identity Center, kết nối với AD qua AWS Managed Microsoft AD hoặc AD Connector, và gán permission set cho các account",
      "Tạo IAM user cho từng nhân viên trong mỗi account và đồng bộ mật khẩu thủ công với AD",
      "Thiết lập SAML federation trực tiếp giữa AD FS và từng IAM identity provider trong mỗi account",
      "Dùng Amazon Cognito user pool để federate nhân viên vào console"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM Identity Center tích hợp AD và quản lý quyền truy cập đa account tập trung qua permission set, giảm tối đa vận hành.\n✓ IAM Identity Center + AD: SSO tập trung, gán permission set cho nhiều account, không cần IAM user, least operational overhead.\n✗ IAM user từng account đồng bộ mật khẩu: vận hành cực lớn, không scale, không tập trung.\n✗ SAML federation riêng cho từng account: cấu hình IdP lặp lại ở mỗi account, vận hành nặng so với Identity Center.\n✗ Cognito user pool: dành cho ứng dụng web/mobile customer-facing, không tối ưu cho SSO console của nhân viên với AD.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-005",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty có hàng nghìn project, mỗi project cần một bộ tài nguyên EC2/S3 riêng. Họ muốn một mô hình phân quyền nơi mỗi engineer chỉ truy cập tài nguyên có tag Project khớp với tag Project gắn trên principal của họ, tránh phải viết policy riêng cho từng project. Cách tiếp cận nào tối ưu?",
    "options": [
      "Dùng ABAC: gắn tag cho principal và resource, viết một IAM policy dùng điều kiện aws:PrincipalTag khớp với aws:ResourceTag",
      "Dùng RBAC: tạo một IAM role riêng cho mỗi project và viết policy liệt kê ARN cụ thể",
      "Tạo một group cho mỗi project và gán user vào group tương ứng theo cách thủ công",
      "Dùng SCP với điều kiện tag để giới hạn từng project"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ABAC dùng tag trên principal và resource để cấp quyền động, cho phép một policy duy nhất phục vụ hàng nghìn project và scale tốt.\n✓ ABAC với PrincipalTag/ResourceTag: một policy duy nhất, tự động khớp quyền theo tag, scale tới hàng nghìn project, ít bảo trì.\n✗ RBAC với role/policy riêng từng project: bùng nổ số lượng policy/role, vận hành nặng khi có hàng nghìn project.\n✗ Group thủ công cho mỗi project: không scale, vẫn cần policy riêng cho từng group.\n✗ SCP theo tag: SCP là guardrail cấp account/OU, không phải cơ chế phân quyền chi tiết động cho engineer.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-006",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một team có 15 developer cần cùng một bộ quyền truy cập vào môi trường dev. Quản trị viên muốn quản lý quyền cho cả nhóm một cách hiệu quả và dễ bảo trì khi có người vào/ra. Cách tổ chức IAM nào phù hợp nhất?",
    "options": [
      "Tạo một IAM group cho team dev, gắn policy vào group, và thêm/bớt user vào group",
      "Gắn policy trực tiếp vào từng IAM user của 15 developer",
      "Tạo một IAM user dùng chung cho cả 15 developer",
      "Tạo 15 IAM role và yêu cầu mỗi developer assume role của mình"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM group cho phép quản lý quyền tập trung cho nhiều user và dễ thêm/bớt thành viên.\n✓ IAM group + policy: quản lý quyền một nơi, thêm/bớt user đơn giản, dễ bảo trì.\n✗ Policy gắn trực tiếp từng user: trùng lặp, khó đồng bộ khi thay đổi quyền.\n✗ User dùng chung: mất khả năng truy vết hành động từng cá nhân, rủi ro bảo mật.\n✗ 15 role riêng: phức tạp không cần thiết cho nhóm có quyền giống nhau.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-007",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty muốn áp dụng nguyên tắc least privilege khi tạo IAM policy mới cho một service team, nhưng không chắc team thực sự cần những action nào. Công cụ AWS nào giúp xác định quyền tối thiểu dựa trên hoạt động thực tế đã xảy ra?",
    "options": [
      "IAM Access Analyzer (policy generation dựa trên CloudTrail activity)",
      "Amazon Inspector",
      "AWS Trusted Advisor cost check",
      "Amazon GuardDuty"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM Access Analyzer có thể sinh policy least-privilege dựa trên hoạt động thực tế ghi trong CloudTrail.\n✓ IAM Access Analyzer: phân tích CloudTrail để gợi ý policy chỉ chứa action thực sự được dùng, hỗ trợ least privilege.\n✗ Amazon Inspector: quét lỗ hổng workload, không sinh IAM policy.\n✗ Trusted Advisor cost check: kiểm tra chi phí, không liên quan quyền.\n✗ GuardDuty: phát hiện mối đe dọa, không sinh policy least-privilege.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-008",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một tổ chức muốn các developer chỉ có thể thao tác trong region us-east-1 và ap-southeast-1, áp dụng cho TẤT CẢ principal trong một OU gồm 30 account, đồng thời vẫn cho phép một số global service hoạt động. Cách thiết kế guardrail nào hợp lý và ít vận hành nhất?",
    "options": [
      "Dùng SCP gắn ở OU với điều kiện aws:RequestedRegion để deny action ngoài hai region, kèm NotAction loại trừ các global service cần thiết",
      "Viết IAM policy region-restriction và gắn thủ công vào từng role trong 30 account",
      "Tạo permission boundary region-restriction cho từng user trong mỗi account",
      "Dùng AWS Config rule để xóa tài nguyên tạo sai region sau khi phát hiện"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SCP với điều kiện aws:RequestedRegion và NotAction loại trừ global service thực thi guardrail region tập trung cho cả OU với ít vận hành.\n✓ SCP với RequestedRegion + NotAction global service: áp dụng tự động cho mọi principal trong OU, loại trừ global service, tập trung và ít bảo trì.\n✗ IAM policy gắn thủ công từng role: vận hành cực lớn trên 30 account, dễ bỏ sót.\n✗ Permission boundary từng user: chỉ giới hạn user gắn boundary, không bao trùm mọi principal, vận hành nặng.\n✗ Config auto-delete: detective và phá hủy tài nguyên sau khi đã tạo, không phải guardrail phòng ngừa.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-009",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty cần chặn một dải IP độc hại cụ thể (CIDR) ở cấp subnet, áp dụng cho mọi instance trong subnet đó, kể cả khi rule chặn cần đứng trước rule allow. Cơ chế nào phù hợp nhất?",
    "options": [
      "Network ACL với explicit deny rule có số thứ tự thấp",
      "Security group với deny rule",
      "AWS WAF web ACL gắn vào subnet",
      "Route table với blackhole route cho CIDR đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NACL hỗ trợ explicit deny và đánh giá theo thứ tự số, áp ở cấp subnet — phù hợp để chặn một CIDR.\n✓ NACL explicit deny rule số thấp — đúng, NACL có deny và xét theo thứ tự.\n✗ Security group deny rule — security group chỉ có allow, không có deny.\n✗ WAF gắn vào subnet — WAF gắn vào ALB/CloudFront/API Gateway, không gắn subnet.\n✗ Blackhole route — chỉ ảnh hưởng routing đích, không lọc theo source IP độc hại.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-010",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng EC2 trong private subnet cần đọc/ghi object trong Amazon S3 mà KHÔNG đi qua Internet và muốn tránh chi phí xử lý dữ liệu của NAT gateway. Giải pháp cost-effective nào phù hợp?",
    "options": [
      "Gateway VPC endpoint cho S3 và thêm route vào route table của private subnet",
      "Interface VPC endpoint (PrivateLink) cho S3 với phí giờ và phí GB",
      "NAT gateway cho instance ra Internet truy cập S3 public endpoint",
      "VPC peering giữa VPC và một VPC do AWS quản lý chứa S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Gateway endpoint cho S3 không tính phí và định tuyến qua mạng AWS, tránh hoàn toàn NAT.\n✓ Gateway VPC endpoint cho S3 — đúng, miễn phí và không qua Internet/NAT.\n✗ Interface endpoint cho S3 — tốn phí giờ + GB, kém cost-effective hơn gateway endpoint cho cùng mục đích.\n✗ NAT gateway ra public endpoint — phát sinh phí xử lý GB qua NAT, kém cost-effective.\n✗ VPC peering tới VPC chứa S3 — S3 không nằm trong VPC khách, không peer được như vậy.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-011",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một sàn giao dịch tài chính chạy ứng dụng quan trọng sau ALB và CloudFront. Họ cần bảo vệ DDoS nâng cao với cam kết phản hồi từ SRT (Shield Response Team) và bảo vệ chi phí scaling khi bị tấn công. Giải pháp nào?",
    "options": [
      "Đăng ký AWS Shield Advanced và bật bảo vệ cho ALB, CloudFront cùng WAF",
      "Chỉ dựa vào AWS Shield Standard miễn phí cho mọi tài nguyên",
      "Triển khai AWS Network Firewall để hấp thụ tấn công DDoS thể tích lớn",
      "Dùng nhiều NACL rule để chặn IP tấn công thủ công"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Shield Advanced cung cấp bảo vệ DDoS nâng cao, hỗ trợ SRT và cost protection cho scaling do tấn công.\n✓ Shield Advanced — đúng, có SRT support và DDoS cost protection.\n✗ Shield Standard — chỉ bảo vệ cơ bản L3/L4, không có SRT hay cost protection.\n✗ Network Firewall — không phải dịch vụ chống DDoS thể tích và không có SRT.\n✗ NACL thủ công — không khả thi để chống DDoS quy mô lớn theo thời gian thực.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-012",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một mobile/web app cần đăng ký, đăng nhập người dùng và phát hành token để gọi API Gateway, hỗ trợ cả social login (Google, Facebook) và MFA, với least operational overhead. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon Cognito user pools làm identity provider phát hành JWT cho API Gateway",
      "IAM users tạo cho từng người dùng cuối của ứng dụng",
      "AWS Directory Service với một AD tự quản",
      "Lưu user/password trong DynamoDB và tự viết logic xác thực"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito user pools cung cấp đăng ký/đăng nhập, federation social, MFA và phát hành JWT tích hợp với API Gateway.\n✓ Cognito user pools — đúng, quản lý user, social IdP, MFA, token cho API Gateway.\n✗ IAM users cho end users — IAM dành cho người/dịch vụ vận hành AWS, không scale cho end users app.\n✗ Directory Service tự quản — phức tạp, nặng vận hành cho app web/mobile công khai.\n✗ Tự viết auth trên DynamoDB — nhiều vận hành và rủi ro bảo mật cao.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-013",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty SaaS muốn cung cấp dịch vụ của mình cho khách hàng truy cập riêng tư từ VPC của khách hàng mà không đi qua Internet, không cần VPC peering và che giấu hạ tầng. Giải pháp nào phù hợp?",
    "options": [
      "Tạo VPC endpoint service (PrivateLink) sau một Network Load Balancer cho khách hàng tạo interface endpoint",
      "Thiết lập VPC peering với từng VPC khách hàng",
      "Phơi bày dịch vụ qua một public ALB và hạn chế bằng security group",
      "Dùng Transit Gateway kết nối tất cả VPC khách hàng vào VPC của mình"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "PrivateLink endpoint service sau NLB cho phép khách hàng truy cập riêng tư qua interface endpoint, không cần peering, ẩn hạ tầng.\n✓ Endpoint service (PrivateLink) sau NLB — đúng, truy cập riêng tư một chiều, không lộ mạng.\n✗ VPC peering từng khách hàng — lộ CIDR hai bên, không scale, dễ trùng IP.\n✗ Public ALB — đi qua Internet, không riêng tư theo yêu cầu.\n✗ Transit Gateway nối mọi VPC khách — kết nối mạng rộng, lộ hạ tầng và phức tạp quản trị.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-014",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng đa Region cần chống lại tấn công DDoS L3/L4 thể tích lớn và cũng cần lọc bot xấu ở L7 trên CloudFront. Giải pháp tích hợp nào tối ưu nhất?",
    "options": [
      "Shield Advanced cho bảo vệ DDoS L3/L4 kết hợp AWS WAF Bot Control trên CloudFront",
      "Chỉ dùng AWS WAF với rate-based rules cho cả DDoS thể tích và bot",
      "Chỉ dùng Network Firewall đặt trước CloudFront",
      "Shield Standard kết hợp NACL chặn IP bot"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DDoS L3/L4 thể tích lớn cần Shield Advanced, còn lọc bot L7 cần WAF Bot Control; kết hợp là tối ưu.\n✓ Shield Advanced + WAF Bot Control — đúng, mỗi lớp xử lý đúng loại tấn công.\n✗ Chỉ WAF rate-based — không thay thế bảo vệ DDoS thể tích L3/L4 của Shield Advanced.\n✗ Chỉ Network Firewall trước CloudFront — không đặt được trước CloudFront và không phải dịch vụ DDoS thể tích.\n✗ Shield Standard + NACL — không đủ chống DDoS quy mô lớn và bot L7.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-015",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ngân hàng cần mã hoá dữ liệu trong S3 và yêu cầu kiểm soát chi tiết: có audit log mỗi lần key được dùng, tự định nghĩa key rotation policy, và giới hạn IAM principal nào được phép dùng key. Giải pháp nào đáp ứng tốt nhất?",
    "options": [
      "SSE-KMS với customer managed key (CMK) trong AWS KMS",
      "SSE-S3 với Amazon S3 managed keys",
      "SSE-KMS với AWS managed key (aws/s3)",
      "SSE-C với key do ứng dụng cung cấp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Customer managed key trong KMS cho phép tự định nghĩa key policy, rotation và audit chi tiết qua CloudTrail.\n✓ SSE-KMS với customer managed key: kiểm soát key policy, rotation tuỳ chỉnh, và mỗi lần dùng key được ghi vào CloudTrail.\n✗ SSE-S3: không cho phép kiểm soát key policy hay audit từng lần dùng key.\n✗ AWS managed key (aws/s3): không thể chỉnh sửa key policy hay rotation, audit hạn chế hơn.\n✗ SSE-C: client phải tự quản lý key, không có audit tập trung trong KMS/CloudTrail.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-016",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một public-facing web app cần đảm bảo encryption in transit cho người dùng cuối. Team muốn cung cấp và tự động gia hạn TLS certificate cho Application Load Balancer với least operational overhead. Giải pháp nào tốt nhất?",
    "options": [
      "Cấp certificate công khai từ AWS Certificate Manager (ACM) và gắn vào HTTPS listener của ALB",
      "Mua certificate từ third-party CA và tự cài, đặt lịch nhắc gia hạn thủ công",
      "Tự tạo self-signed certificate và phân phối cho client",
      "Dùng CloudHSM để sinh certificate rồi import vào ALB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ACM cấp public certificate miễn phí và tự động gia hạn, tích hợp trực tiếp với ALB, least operational overhead.\n✓ ACM public certificate trên ALB: cấp miễn phí, auto-renew, tích hợp native với HTTPS listener.\n✗ Third-party CA tự cài: phải gia hạn thủ công, nhiều overhead và rủi ro hết hạn.\n✗ Self-signed certificate: trình duyệt người dùng cuối sẽ cảnh báo không tin cậy.\n✗ CloudHSM sinh certificate: phức tạp và không cần thiết, ACM đã giải quyết trọn vẹn.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-017",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty có hàng petabyte dữ liệu trong S3 và lo ngại có thể chứa PII (số thẻ, số an sinh xã hội) chưa được phân loại. Họ cần một dịch vụ managed tự động khám phá và phân loại dữ liệu nhạy cảm. Dịch vụ nào phù hợp?",
    "options": [
      "Amazon Macie",
      "AWS Config",
      "Amazon Inspector",
      "AWS Glue DataBrew"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Amazon Macie dùng ML/pattern matching để tự động khám phá và phân loại dữ liệu nhạy cảm (PII) trong S3.\n✓ Macie: managed service chuyên discover và classify PII/dữ liệu nhạy cảm trong S3, đúng nhu cầu.\n✗ AWS Config: theo dõi cấu hình resource và compliance, không phân loại nội dung dữ liệu.\n✗ Inspector: quét lỗ hổng bảo mật của EC2/ECR/Lambda, không phân loại dữ liệu S3.\n✗ Glue DataBrew: chuẩn bị/làm sạch dữ liệu cho analytics, không phải công cụ phát hiện PII compliance.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-018",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty đa quốc gia muốn dùng cùng một logical encryption key để mã hoá S3 object ở nhiều region (us-east-1, eu-west-1) nhằm đơn giản hoá quản lý key cho dữ liệu được replicate, tránh phải re-encrypt khi failover giữa region. Giải pháp KMS nào phù hợp nhất?",
    "options": [
      "AWS KMS multi-Region keys",
      "AWS KMS customer managed key riêng cho từng region không liên quan nhau",
      "CloudHSM cluster trải rộng nhiều region",
      "Import cùng một key material thủ công vào các single-region key độc lập"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "KMS multi-Region keys là các replica có cùng key ID và key material, cho phép giải mã cross-region mà không cần re-encrypt.\n✓ Multi-Region keys: primary và replica chia sẻ key material, ciphertext mã hoá ở một region có thể giải mã ở region khác, lý tưởng cho DR/replication.\n✗ Customer managed key riêng từng region: key material khác nhau nên phải re-encrypt khi chuyển region.\n✗ CloudHSM nhiều region: không cung cấp khái niệm shared multi-Region key kiểu KMS và tăng độ phức tạp.\n✗ Import key material thủ công vào key độc lập: dễ lỗi và không được KMS quản lý như multi-Region keys.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-019",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bucket dùng SSE-KMS với customer managed key. Một IAM user có quyền s3:GetObject nhưng khi tải object lại bị AccessDenied. Nguyên nhân khả dĩ nhất và cách khắc phục là gì?",
    "options": [
      "User thiếu quyền kms:Decrypt trên KMS key; cần cấp quyền trong key policy/IAM",
      "Bucket chưa bật Versioning nên object không đọc được",
      "S3 Block Public Access đang chặn user nội bộ",
      "Object đang ở Glacier Deep Archive nên cần restore"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với SSE-KMS, để giải mã object user cần cả s3:GetObject lẫn kms:Decrypt trên key dùng để mã hoá.\n✓ Thiếu kms:Decrypt: dù có GetObject, không có quyền giải mã KMS key sẽ bị AccessDenied; cấp kms:Decrypt khắc phục.\n✗ Versioning: không ảnh hưởng quyền đọc object hiện tại.\n✗ Block Public Access: chỉ chặn truy cập public, không chặn IAM principal có quyền hợp lệ.\n✗ Glacier Deep Archive: sẽ báo lỗi InvalidObjectState, không phải AccessDenied.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-020",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức cần đảm bảo rằng tất cả object upload vào một S3 bucket bắt buộc phải dùng SSE-KMS, từ chối bất kỳ upload nào không có header mã hoá đúng. Cách enforce hiệu quả nhất là gì?",
    "options": [
      "Bucket policy Deny PutObject khi s3:x-amz-server-side-encryption không phải aws:kms",
      "Bật S3 default encryption và tin rằng client luôn gửi đúng header",
      "Dùng Macie để phát hiện object chưa mã hoá sau khi upload",
      "Bật S3 Versioning để giữ lịch sử object chưa mã hoá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bucket policy với điều kiện Deny dựa trên header server-side-encryption enforce bắt buộc SSE-KMS ngay tại thời điểm upload.\n✓ Deny PutObject khi không phải aws:kms: chủ động từ chối mọi upload không dùng SSE-KMS, enforce ở thời điểm ghi.\n✗ Default encryption đơn thuần: tự áp dụng mã hoá nhưng không từ chối các request cố tình chỉ định kiểu khác; bucket policy mạnh hơn để enforce KMS cụ thể.\n✗ Macie phát hiện sau: chỉ phát hiện chứ không ngăn upload không mã hoá.\n✗ Versioning: không liên quan tới enforce encryption.",
    "domain": 1,
    "mock": 2
  },
  {
    "id": "saa-m2-021",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một ứng dụng global yêu cầu một database NoSQL có khả năng đọc-ghi với độ trễ thấp ở nhiều Region đồng thời (active-active), tự động sao chép giữa các Region, và chịu được lỗi toàn bộ một Region mà ứng dụng vẫn ghi được ở Region khác. Những phát biểu nào ĐÚNG về giải pháp phù hợp? (Chọn 2)",
    "options": [
      "Amazon DynamoDB Global Tables cung cấp replication active-active multi-Region, cho phép đọc-ghi ở mỗi Region tham gia",
      "DynamoDB Global Tables sử dụng cơ chế last-writer-wins để giải quyết xung đột ghi đồng thời",
      "Aurora Global Database cho phép ghi đồng thời ở mọi secondary Region với độ trễ thấp",
      "Phải tự xây dựng một Lambda pipeline để sao chép dữ liệu giữa các bảng DynamoDB ở mỗi Region",
      "DynamoDB Global Tables yêu cầu cấu hình thủ công cross-Region replication qua Kinesis cho mỗi item"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "DynamoDB Global Tables là giải pháp NoSQL multi-Region active-active được quản lý hoàn toàn, dùng last-writer-wins để xử lý xung đột.\n✓ Global Tables hỗ trợ đọc-ghi ở mọi Region tham gia, replication tự động.\n✓ Cơ chế giải quyết xung đột là last-writer-wins dựa trên timestamp.\n✗ Aurora Global Database chỉ có một writer Region; secondary là read-only, không phải active-active ghi.\n✗ Không cần tự xây Lambda pipeline vì replication là tính năng tích hợp.\n✗ Không cần cấu hình Kinesis thủ công; Global Tables tự sao chép.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-022",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một hệ thống xử lý giao dịch tài chính yêu cầu các message phải được xử lý đúng MỘT lần và đúng THỨ TỰ chúng được gửi. Loại Amazon SQS queue nào đáp ứng yêu cầu này?",
    "options": [
      "FIFO queue",
      "Standard queue",
      "Standard queue với long polling",
      "Standard queue có bật server-side encryption"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FIFO queue đảm bảo thứ tự và exactly-once processing, đúng yêu cầu giao dịch tài chính.\n✓ FIFO queue — đúng, đảm bảo ordering và exactly-once processing.\n✗ Standard queue — chỉ best-effort ordering và at-least-once delivery (có thể trùng).\n✗ Standard + long polling — long polling chỉ giảm empty response, không đảm bảo thứ tự.\n✗ Standard + encryption — mã hóa không liên quan tới ordering hay duplication.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-023",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khi một ảnh được tải lên, hệ thống cần kích hoạt đồng thời nhiều xử lý độc lập: tạo thumbnail, đánh chỉ mục tìm kiếm, và gửi thông báo. Mỗi xử lý có queue riêng. Kiến trúc decoupled fan-out nào phù hợp nhất?",
    "options": [
      "Publish một message tới Amazon SNS topic, subscribe nhiều SQS queue vào topic đó",
      "Cho ứng dụng ghi tuần tự cùng một message vào ba SQS queue",
      "Dùng một SQS queue duy nhất với ba consumer group khác nhau",
      "Dùng Amazon Kinesis Data Streams với một shard cho mỗi xử lý"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SNS fan-out cho phép một message được phát tới nhiều SQS queue subscriber cùng lúc, mỗi tier xử lý độc lập.\n✓ SNS topic + nhiều SQS subscriber — đúng, mẫu fan-out chuẩn, một publish tới nhiều queue, decoupled và resilient.\n✗ Ghi tuần tự vào ba queue — producer phải biết mọi consumer, coupling cao, lỗi giữa chừng gây thiếu sót.\n✗ Một queue, ba consumer group — SQS không có khái niệm consumer group; mỗi message chỉ được một consumer xử lý.\n✗ Kinesis một shard mỗi xử lý — Kinesis dùng cho streaming, không phải fan-out pub/sub tới các queue độc lập.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-024",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần một load balancer hoạt động ở tầng TCP/UDP (Layer 4), xử lý hàng triệu request mỗi giây với độ trễ cực thấp và hỗ trợ static IP. Loại load balancer nào phù hợp nhất?",
    "options": [
      "Network Load Balancer (NLB)",
      "Application Load Balancer (ALB)",
      "Gateway Load Balancer (GWLB)",
      "Classic Load Balancer (CLB)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NLB hoạt động ở Layer 4, cung cấp throughput cực cao, độ trễ thấp và static IP per AZ.\n✓ NLB — đúng, Layer 4, ultra-low latency, hàng triệu request/giây, hỗ trợ static/Elastic IP.\n✗ ALB — Layer 7, định tuyến theo HTTP/HTTPS, không tối ưu cho TCP/UDP thuần và không có static IP gốc.\n✗ GWLB — dùng cho triển khai virtual appliance bảo mật (firewall), không phải cân bằng tải ứng dụng thông thường.\n✗ CLB — thế hệ cũ, không khuyến nghị cho thiết kế mới, thiếu nhiều tính năng.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-025",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một worker tier xử lý job từ SQS queue. Đội ngũ muốn số lượng EC2 worker tự động tăng khi backlog message lớn và giảm khi backlog nhỏ, để cân bằng chi phí và tốc độ xử lý. Cách triển khai tốt nhất là gì?",
    "options": [
      "Auto Scaling group dùng target tracking dựa trên metric ApproximateNumberOfMessagesVisible (qua backlog per instance)",
      "Auto Scaling theo lịch cố định mỗi giờ tăng giảm số instance",
      "Scale thủ công dựa trên báo cáo backlog hằng ngày",
      "Auto Scaling theo CPUUtilization trung bình của fleet"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Scaling theo độ sâu queue (backlog per instance) phản ánh đúng lượng công việc tồn đọng, là chỉ số chuẩn để scale worker tier.\n✓ Auto Scaling theo số message visible / backlog per instance — đúng, scale theo khối lượng công việc thực tế trong queue.\n✗ Scaling theo lịch — không phản ứng với biến động backlog thực tế.\n✗ Scale thủ công hằng ngày — chậm, nhiều vận hành, không kịp xử lý đột biến.\n✗ Scale theo CPU — CPU không nhất thiết tương quan với backlog; queue có thể đầy mà CPU vẫn thấp.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-026",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống đặt vé dùng SQS FIFO queue để đảm bảo thứ tự xử lý theo từng sự kiện. Hiện throughput bị giới hạn vì tất cả message dùng chung một MessageGroupId. Cách tăng throughput mà vẫn giữ thứ tự trong phạm vi mỗi sự kiện là gì?",
    "options": [
      "Dùng MessageGroupId riêng cho mỗi sự kiện để các nhóm được xử lý song song",
      "Chuyển sang standard queue để có throughput không giới hạn",
      "Tăng số consumer đọc cùng một message group",
      "Bật high throughput mode nhưng giữ một MessageGroupId duy nhất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FIFO chỉ đảm bảo thứ tự trong cùng một MessageGroupId; tách nhóm theo sự kiện cho phép xử lý song song giữa các nhóm trong khi vẫn giữ thứ tự nội bộ mỗi nhóm.\n✓ MessageGroupId riêng mỗi sự kiện — đúng, các group được xử lý song song, tăng throughput, vẫn giữ ordering trong từng sự kiện.\n✗ Chuyển standard queue — mất đảm bảo thứ tự, vi phạm yêu cầu.\n✗ Nhiều consumer cùng một group — message trong một group vẫn được xử lý tuần tự, không tăng được throughput của group đó.\n✗ High throughput mode với một group duy nhất — vẫn nghẽn vì cùng một MessageGroupId xử lý tuần tự.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-027",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng dùng SNS fan-out tới nhiều SQS queue. Một microservice mới chỉ quan tâm tới event có thuộc tính 'eventType' bằng 'order_created', không muốn nhận các loại event khác để tránh xử lý lãng phí. Cách tối ưu nhất để chỉ nhận đúng loại event này là gì?",
    "options": [
      "Áp dụng SNS subscription filter policy trên subscription của queue đó",
      "Cho consumer đọc mọi message rồi tự lọc và xóa message không liên quan",
      "Tạo một SNS topic riêng cho mỗi loại event",
      "Dùng EventBridge thay thế toàn bộ kiến trúc SNS hiện có"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SNS message filtering cho phép subscription chỉ nhận message khớp filter policy, giảm xử lý thừa mà không đổi kiến trúc.\n✓ SNS subscription filter policy — đúng, chỉ message khớp 'order_created' được đẩy vào queue, tối ưu và ít thay đổi nhất.\n✗ Đọc rồi tự lọc — vẫn nhận và xử lý mọi message, lãng phí tài nguyên và chi phí.\n✗ Topic riêng mỗi loại event — tăng phức tạp quản lý và producer phải biết route, kém linh hoạt.\n✗ Thay toàn bộ bằng EventBridge — over-engineering cho một nhu cầu lọc đơn giản đã có sẵn trong SNS.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-028",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một microservice cần gọi đồng bộ một service khác qua nhiều bước có điều kiện rẽ nhánh, retry, và xử lý lỗi rõ ràng, với khả năng quan sát từng bước. Đội muốn tránh nhồi logic điều phối vào trong code Lambda. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Step Functions để điều phối workflow",
      "Amazon SQS chuỗi nhiều queue nối tiếp nhau",
      "Amazon SNS fan-out tới các Lambda từng bước",
      "Amazon EventBridge bus với nhiều rule nối tiếp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Step Functions cung cấp workflow có state, rẽ nhánh, retry/catch tích hợp và observability từng bước, tách logic điều phối khỏi code.\n✓ Step Functions — đúng, điều phối có điều kiện, retry/error handling khai báo, theo dõi từng state.\n✗ Chuỗi SQS nối tiếp — phải tự viết logic rẽ nhánh/retry và khó quan sát toàn workflow.\n✗ SNS fan-out — phát song song, không phù hợp cho luồng tuần tự có điều kiện và state.\n✗ EventBridge nhiều rule nối tiếp — khó biểu diễn rẽ nhánh/retry phức tạp và theo dõi trạng thái từng bước.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-029",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng đặt sau Application Load Balancer cần ALB ngừng gửi lưu lượng tới các instance không lành mạnh để duy trì độ sẵn sàng. Tính năng nào của ALB đảm nhiệm việc này?",
    "options": [
      "Health checks tới target group",
      "Sticky sessions",
      "Cross-zone load balancing",
      "SSL/TLS termination"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Health check của ALB liên tục kiểm tra target và chỉ route tới các target lành mạnh.\n✓ Health checks — đúng, ALB tự động ngừng gửi traffic tới instance unhealthy, duy trì availability.\n✗ Sticky sessions — giữ người dùng ở cùng target, không liên quan loại bỏ target hỏng.\n✗ Cross-zone load balancing — phân phối đều giữa các AZ, không phải phát hiện target hỏng.\n✗ SSL/TLS termination — giải mã TLS tại LB, không liên quan health.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-030",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty thương mại điện tử toàn cầu chạy ứng dụng trên hai Region: us-east-1 và eu-west-1, mỗi Region có một Application Load Balancer. Họ muốn người dùng được định tuyến tới Region có độ trễ thấp nhất, đồng thời tự động chuyển hướng khỏi Region nào không khỏe mạnh. Cấu hình Route 53 nào phù hợp nhất?",
    "options": [
      "Latency-based routing kết hợp với Route 53 health checks gắn vào từng record của hai Region",
      "Geolocation routing dựa trên quốc gia người dùng mà không cần health checks",
      "Weighted routing với trọng số bằng nhau cho hai Region",
      "Simple routing trỏ tới cả hai ALB và để client tự chọn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Latency-based routing chọn Region độ trễ thấp nhất, còn health checks loại bỏ endpoint không khỏe mạnh.\n✓ Latency-based + health checks: định tuyến theo độ trễ thấp nhất và tự động bỏ qua Region không khỏe mạnh.\n✗ Geolocation định tuyến theo vị trí địa lý chứ không theo độ trễ, và không có health checks thì không failover.\n✗ Weighted phân chia theo tỷ lệ cố định, không tối ưu độ trễ.\n✗ Simple routing không hỗ trợ health checks và trả nhiều giá trị ngẫu nhiên, không đảm bảo độ trễ thấp nhất.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-031",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web stateless chạy sau Application Load Balancer với Auto Scaling group. Hiện tại tất cả EC2 instances nằm trong một Availability Zone duy nhất. Kiến trúc sư muốn tăng khả năng chịu lỗi (fault tolerance) để ứng dụng vẫn hoạt động khi một AZ gặp sự cố. Hành động nào đạt mục tiêu hiệu quả nhất?",
    "options": [
      "Cấu hình Auto Scaling group trải trên nhiều subnet thuộc các AZ khác nhau và bật cross-zone load balancing",
      "Tăng kích thước instance type để mỗi instance chịu tải lớn hơn",
      "Bật detailed CloudWatch monitoring cho các instance trong AZ hiện tại",
      "Đặt một Network Load Balancer trước Application Load Balancer hiện tại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trải instances trên nhiều AZ là cách cơ bản để chịu được lỗi một AZ.\n✓ ASG đa AZ + cross-zone LB: nếu một AZ lỗi, các instance ở AZ khác vẫn phục vụ, đạt fault tolerance.\n✗ Tăng instance type không giúp gì khi cả AZ chứa toàn bộ instance bị mất.\n✗ Detailed monitoring chỉ tăng độ chi tiết metric, không tăng khả năng chịu lỗi.\n✗ Đặt NLB trước ALB không giải quyết vấn đề tập trung trong một AZ.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-032",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty media lưu nội dung quan trọng trong một S3 bucket ở us-east-1. Để tuân thủ quy định, một bản sao của tất cả object phải tồn tại ở một Region khác và được cập nhật tự động khi có object mới. Giải pháp nào phù hợp nhất?",
    "options": [
      "Bật S3 Cross-Region Replication (CRR) tới một bucket đích ở Region khác",
      "Bật S3 Versioning và chạy một AWS Lambda định kỳ để copy object sang Region khác",
      "Dùng S3 Transfer Acceleration để tăng tốc tải object lên",
      "Bật S3 Same-Region Replication (SRR) sang một bucket khác trong cùng Region"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Cross-Region Replication tự động sao chép object sang bucket ở Region khác khi có thay đổi.\n✓ CRR: sao chép tự động, bất đồng bộ object mới sang Region khác, đáp ứng tuân thủ multi-Region.\n✗ Lambda định kỳ copy là tự xây dựng, không tự động tức thì và nhiều vận hành.\n✗ Transfer Acceleration chỉ tăng tốc upload, không tạo bản sao Region khác.\n✗ SRR sao chép trong cùng Region, không đáp ứng yêu cầu Region khác.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-033",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một dịch vụ API nhận traffic từ người dùng ở nhiều quốc gia. Vì lý do tuân thủ dữ liệu, người dùng ở Đức phải luôn được phục vụ bởi endpoint ở eu-central-1, người dùng ở Nhật bởi ap-northeast-1, còn lại đi tới us-east-1. Cấu hình Route 53 nào phù hợp nhất?",
    "options": [
      "Geolocation routing với record riêng cho Đức, Nhật và một default record cho phần còn lại",
      "Latency-based routing giữa ba Region",
      "Weighted routing chia đều cho ba Region",
      "Failover routing với us-east-1 là primary"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Geolocation routing định tuyến dựa trên vị trí địa lý của người dùng, phù hợp yêu cầu tuân thủ dữ liệu theo quốc gia.\n✓ Geolocation routing: ánh xạ quốc gia tới Region cụ thể và có default record cho các vị trí khác, đáp ứng tuân thủ.\n✗ Latency-based chọn theo độ trễ, không đảm bảo người Đức luôn tới eu-central-1.\n✗ Weighted chia ngẫu nhiên theo tỷ lệ, vi phạm tuân thủ.\n✗ Failover là active-passive, không phục vụ theo địa lý.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-034",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng dùng Amazon RDS Multi-AZ. Kiến trúc sư cần xác nhận hành vi khi AZ chứa primary instance gặp sự cố. Phát biểu nào mô tả ĐÚNG nhất điều xảy ra?",
    "options": [
      "RDS tự động failover sang standby instance ở AZ khác và cập nhật DNS endpoint để trỏ tới instance mới",
      "RDS tự động tạo một Read Replica mới và promote nó thành primary",
      "Ứng dụng phải tự đổi connection string sang IP của standby instance",
      "RDS yêu cầu khôi phục thủ công từ snapshot gần nhất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Multi-AZ duy trì standby đồng bộ và tự động failover bằng cách trỏ lại DNS endpoint.\n✓ Tự động failover + cập nhật DNS: ứng dụng dùng cùng endpoint nên không cần đổi cấu hình.\n✗ Standby trong Multi-AZ không phải là Read Replica; nó không phục vụ đọc và đã tồn tại sẵn.\n✗ Không cần đổi connection string vì endpoint không đổi.\n✗ Không cần khôi phục thủ công từ snapshot.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-035",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty đang chuyển dần traffic sang một phiên bản mới của ứng dụng đặt ở một nhóm server riêng. Họ muốn gửi 10% traffic tới phiên bản mới và 90% tới phiên bản cũ, sau đó tăng dần tỷ lệ. Cấu hình Route 53 nào phù hợp nhất?",
    "options": [
      "Weighted routing với trọng số 10 cho phiên bản mới và 90 cho phiên bản cũ",
      "Latency-based routing giữa hai phiên bản",
      "Failover routing với phiên bản mới là primary",
      "Geolocation routing dựa trên quốc gia người dùng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Weighted routing cho phép chia traffic theo tỷ lệ tùy chỉnh, lý tưởng cho canary/blue-green dần dần.\n✓ Weighted routing 10/90: phân phối traffic theo tỷ lệ và tăng dần bằng cách đổi trọng số.\n✗ Latency-based định tuyến theo độ trễ, không kiểm soát tỷ lệ traffic.\n✗ Failover là active-passive, không chia tỷ lệ.\n✗ Geolocation chia theo vị trí, không theo tỷ lệ phần trăm.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-036",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một doanh nghiệp cần đảm bảo các backup do AWS Backup tạo ra được giữ ở một tài khoản riêng và một Region khác để chống lại việc xóa do lỗi hoặc tấn công ransomware vào tài khoản chính. Tính năng nào phù hợp nhất?",
    "options": [
      "Cross-account và cross-Region backup copy của AWS Backup vào một vault có Vault Lock",
      "Bật S3 Versioning trên bucket chứa backup trong cùng tài khoản",
      "Lên lịch snapshot EBS thủ công và copy bằng tay khi cần",
      "Sử dụng RDS Multi-AZ để có thêm bản sao database"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AWS Backup hỗ trợ copy backup sang Region và tài khoản khác, kết hợp Vault Lock chống xóa.\n✓ Cross-account + cross-Region copy với Vault Lock: cách ly backup khỏi tài khoản chính và bảo vệ bất biến (immutable).\n✗ S3 Versioning trong cùng tài khoản không cách ly khỏi tấn công vào tài khoản đó.\n✗ Snapshot thủ công nhiều vận hành và không tự bảo vệ cross-account.\n✗ Multi-AZ là HA trong Region, không phải cơ chế backup cách ly.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-037",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web cần điểm vào (entry point) tĩnh, hiệu năng cao trên toàn cầu và tự động failover nhanh giữa các endpoint ở nhiều Region khi một Region không khỏe mạnh, với failover ở mức nhanh hơn DNS TTL của Route 53. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Global Accelerator với endpoint ở nhiều Region và health checks",
      "Route 53 weighted routing giữa các Region",
      "Amazon CloudFront với một origin duy nhất",
      "Một Network Load Balancer duy nhất trong một Region"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Global Accelerator cung cấp anycast IP tĩnh và failover nhanh không phụ thuộc DNS TTL.\n✓ Global Accelerator: IP tĩnh toàn cầu, định tuyến qua mạng AWS, failover nhanh dựa trên health check, nhanh hơn DNS-based.\n✗ Route 53 weighted phụ thuộc DNS TTL nên failover chậm hơn và không cung cấp IP tĩnh anycast.\n✗ CloudFront với một origin không cung cấp failover multi-Region cho origin.\n✗ NLB một Region không bảo vệ thảm họa Region.",
    "domain": 2,
    "mock": 2
  },
  {
    "id": "saa-m2-038",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một kiến trúc sư đang tối ưu chi phí và hiệu năng cho nhiều workload khác nhau. Hãy chọn HAI phát biểu ĐÚNG về việc lựa chọn EC2 instance family và compute.",
    "options": [
      "Compute optimized (họ C) phù hợp workload nặng CPU như batch processing và high-performance web servers",
      "Memory optimized (họ R/X) phù hợp database in-memory và xử lý dữ liệu lớn trong RAM",
      "General purpose (họ M/T) chỉ nên dùng cho workload cần GPU",
      "Storage optimized (họ I/D) tối ưu cho workload cần thông lượng network giữa các node HPC",
      "Burstable (họ T) không bao giờ phù hợp cho môi trường production"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Mỗi instance family được thiết kế cho một loại tài nguyên chủ đạo; chọn đúng họ giúp tối ưu hiệu năng/giá.\n✓ Compute optimized (C) cho workload nặng CPU — đúng, lý tưởng cho batch và web server hiệu năng cao.\n✓ Memory optimized (R/X) cho in-memory DB — đúng, nhiều RAM cho dữ liệu lớn trong bộ nhớ.\n✗ General purpose chỉ cho GPU — sai, GPU thuộc accelerated computing (họ P/G), không phải M/T.\n✗ Storage optimized cho HPC network — sai, I/D tối ưu I/O đĩa cao, không phải network HPC.\n✗ Burstable không bao giờ dùng production — sai, họ T hợp lý cho workload tải thấp/biến động trong production.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-039",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Một đội đang thiết kế ingestion layer cho data lake trên S3. Họ cần (1) nhận nhiều nguồn streaming với khả năng delivery vào S3 fully managed, và (2) tối ưu chi phí query về sau bằng cách lưu dữ liệu ở định dạng cột nén. Hãy chọn HAI hành động phù hợp nhất.",
    "options": [
      "Dùng Amazon Data Firehose để delivery streaming data vào S3 với buffering và retry tự động",
      "Cấu hình Firehose chuyển đổi record format sang Apache Parquet trước khi ghi vào S3",
      "Lưu toàn bộ dữ liệu dưới dạng raw JSON không nén để Athena dễ đọc nhất",
      "Dùng Kinesis Data Streams và tự viết consumer EC2 để ghi từng record nhỏ riêng lẻ vào S3",
      "Bật S3 Versioning trên bucket để tối ưu chi phí query Athena"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Firehose managed delivery cộng với chuyển sang Parquet là cặp giải pháp đúng cho ingestion fully managed và query tiết kiệm.\n✓ Firehose delivery streaming vào S3 fully managed với buffering/retry, đáp ứng yêu cầu ingestion.\n✓ Firehose convert sang Parquet (cột, nén) giảm dữ liệu Athena phải quét, tối ưu chi phí query.\n✗ JSON thô không nén làm tăng dung lượng quét và chi phí Athena, không tối ưu.\n✗ Tự viết consumer EC2 ghi file nhỏ tăng operational overhead và gây small-file problem.\n✗ S3 Versioning không liên quan đến tối ưu chi phí query Athena.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-040",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một cụm HPC chạy mô phỏng khí động học cần đọc/ghi dataset hàng trăm TB với throughput hàng trăm GB/s và độ trễ submillisecond, dữ liệu nguồn đang nằm trên S3. Loại lưu trữ nào phù hợp nhất?",
    "options": [
      "Amazon FSx for Lustre liên kết với S3 bucket chứa dataset",
      "Amazon EFS với throughput mode là Elastic",
      "Amazon EBS gp3 volume gắn vào từng node tính toán",
      "Amazon FSx for Windows File Server với SSD storage"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FSx for Lustre là file system song song hiệu năng cao chuyên cho HPC, đạt throughput tới hàng trăm GB/s và độ trễ submillisecond, lại tích hợp trực tiếp với S3.\n✓ FSx for Lustre xử lý workload HPC dữ liệu lớn và lazy-load/đồng bộ dữ liệu từ S3.\n✗ EFS phù hợp file sharing NFS chung nhưng không đạt mức throughput/latency của Lustre cho HPC.\n✗ EBS gp3 gắn từng node là block storage không chia sẻ, không cung cấp file system song song dùng chung cho cả cụm.\n✗ FSx for Windows File Server phục vụ workload Windows/SMB, không phải HPC Linux hiệu năng cao.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-041",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một cơ sở dữ liệu giao dịch quan trọng yêu cầu một EBS volume duy nhất cung cấp tới hàng trăm nghìn IOPS, sub-millisecond latency, và durability rất cao với SLA 99.999%. Workload đang chạy trên instance Nitro thế hệ mới. Loại lưu trữ nào đáp ứng tốt nhất?",
    "options": [
      "EBS io2 Block Express",
      "EBS io1 với multi-attach",
      "Instance store NVMe SSD",
      "EBS gp3 cấu hình IOPS tối đa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "io2 Block Express là EBS hiệu năng cao nhất, đạt tới 256.000 IOPS mỗi volume, sub-millisecond latency và durability 99.999% — đúng yêu cầu database giao dịch quan trọng.\n✓ io2 Block Express cung cấp IOPS rất cao (tới 256.000/volume), latency thấp và durability 99.999% trên instance Nitro.\n✗ io1 giới hạn 64.000 IOPS/volume, thấp hơn nhiều so với hàng trăm nghìn IOPS, và multi-attach không cần thiết khi chỉ cần một volume.\n✗ Instance store NVMe nhanh nhưng ephemeral, mất dữ liệu khi stop instance, không durable cho database quan trọng.\n✗ gp3 tối đa 80.000 IOPS/volume, không đủ cho yêu cầu hàng trăm nghìn IOPS.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-042",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một workload phân tích đọc tuần tự (sequential) khối lượng lớn dữ liệu log lưu trên một EBS volume — như big data, MapReduce và data warehouse — và cần throughput cao trên mỗi đô la chứ không cần IOPS ngẫu nhiên cao. Loại EBS volume nào cost-effective nhất?",
    "options": [
      "EBS st1 (Throughput Optimized HDD)",
      "EBS io2 (Provisioned IOPS SSD)",
      "EBS gp3 (General Purpose SSD)",
      "EBS sc1 (Cold HDD)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "st1 là HDD tối ưu throughput cho truy cập sequential khối lượng lớn với chi phí thấp, đúng cho big data/log analytics.\n✓ st1 cung cấp throughput cao chi phí thấp cho workload sequential như MapReduce, data warehouse.\n✗ io2 là SSD IOPS cao đắt tiền, lãng phí cho workload sequential không cần random IOPS.\n✗ gp3 là SSD đa dụng, đắt hơn st1 cho khối lượng lớn dữ liệu throughput-bound.\n✗ sc1 là Cold HDD throughput thấp hơn, dành cho dữ liệu ít truy cập, không tối ưu cho workload analytics thường xuyên.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-043",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một sàn thương mại điện tử biết trước rằng lưu lượng tăng theo chu kỳ rõ rệt mỗi sáng và mỗi tối dựa trên dữ liệu lịch sử nhiều tuần. Họ thấy target tracking phản ứng hơi trễ khi tải tăng đột ngột đầu mỗi đợt, gây độ trễ tạm thời. Giải pháp nào giúp chuẩn bị capacity TRƯỚC khi nhu cầu tăng, dựa trên mẫu lịch sử?",
    "options": [
      "Bật predictive scaling cho Auto Scaling group",
      "Giảm cooldown của simple scaling xuống mức tối thiểu",
      "Tăng giá trị target của target tracking lên 80% CPU",
      "Chuyển toàn bộ sang Spot Instances để có thêm capacity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Predictive scaling dùng machine learning phân tích lịch sử để dự báo và cấp capacity trước khi nhu cầu đến, giải quyết độ trễ phản ứng.\n✓ Predictive scaling — đúng, dựa trên mẫu lịch sử dự báo và tăng capacity trước khi tải đến.\n✗ Giảm cooldown simple scaling — vẫn phản ứng sau khi tải đã tăng, không chủ động.\n✗ Tăng target lên 80% CPU — khiến hệ thống chịu tải cao hơn trước khi scale, làm trễ tệ hơn.\n✗ Chuyển sang Spot — về giá/sẵn capacity, không giải quyết việc chuẩn bị trước theo mẫu lịch sử.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-044",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty container hóa các microservice và muốn chạy chúng mà KHÔNG phải quản lý hay vá EC2 instance bên dưới, trả tiền theo tài nguyên container sử dụng, với least operational overhead. Họ đã chuẩn hóa trên Amazon ECS. Compute option nào phù hợp nhất?",
    "options": [
      "AWS Fargate làm launch type cho ECS",
      "ECS trên EC2 launch type với Auto Scaling group tự quản lý",
      "Chạy container trực tiếp trên EC2 với Docker tự cài",
      "AWS Batch trên EC2 managed compute environment"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fargate là serverless compute cho container: không quản lý server, trả theo tài nguyên task, ít vận hành nhất.\n✓ Fargate launch type — đúng, không cần quản lý/vá EC2, trả theo vCPU/memory của task.\n✗ ECS trên EC2 tự quản lý — vẫn phải vá và scale EC2, nhiều vận hành hơn.\n✗ Docker tự cài trên EC2 — quản lý thủ công nhiều nhất.\n✗ AWS Batch trên EC2 — hợp cho batch job, vẫn dựa trên EC2 cần quản lý hơn Fargate.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-045",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một đội muốn triển khai ứng dụng web đơn giản và chỉ cần upload mã nguồn, để AWS tự lo provisioning EC2, load balancer, Auto Scaling và health monitoring, với least operational overhead nhưng vẫn giữ quyền truy cập vào tài nguyên bên dưới khi cần. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Elastic Beanstalk",
      "Tự dựng EC2 với Auto Scaling group và ALB thủ công",
      "AWS Lambda với API Gateway",
      "Amazon Lightsail với blueprint thủ công"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Elastic Beanstalk tự lo provisioning, load balancing, scaling và monitoring từ mã nguồn upload lên, nhưng vẫn cho truy cập tài nguyên EC2/ASG bên dưới.\n✓ Elastic Beanstalk — đúng, chỉ cần upload code, AWS tự dựng và quản lý nền tảng, vẫn truy cập được tài nguyên.\n✗ Tự dựng EC2/ASG/ALB — nhiều thao tác vận hành nhất.\n✗ Lambda + API Gateway — serverless nhưng đòi tái cấu trúc ứng dụng theo function, không phải web app truyền thống.\n✗ Lightsail — đơn giản nhưng hạn chế tích hợp và ít kiểm soát tài nguyên AWS bên dưới hơn.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-046",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng serverless dùng AWS Lambda kết nối tới Amazon RDS for PostgreSQL. Khi lưu lượng tăng đột biến, hàng nghìn Lambda concurrent mở quá nhiều kết nối database khiến RDS cạn connection và lỗi 'too many connections'. Giải pháp nào giải quyết vấn đề với LEAST operational overhead?",
    "options": [
      "Triển khai Amazon RDS Proxy để pool và chia sẻ các kết nối database",
      "Tăng tham số max_connections trên RDS và scale up instance",
      "Tự xây dựng connection pooler chạy trên EC2 trước RDS",
      "Thêm Read Replica để phân tán kết nối qua nhiều endpoint"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS Proxy là managed connection pooler được thiết kế riêng cho workload serverless/Lambda với nhiều kết nối ngắn.\n✓ RDS Proxy pool và tái sử dụng kết nối, hấp thụ burst của Lambda, fully managed nên ít vận hành.\n✗ Tăng max_connections và scale up chỉ trì hoãn vấn đề, mỗi kết nối vẫn tốn bộ nhớ và không bền vững.\n✗ Tự xây pooler trên EC2 thêm hạ tầng phải quản lý, vá lỗi, HA — operational overhead lớn.\n✗ Read Replica giúp offload đọc nhưng không giải quyết cạn kiệt kết nối, ghi vẫn dồn vào primary.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-047",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần cache session của người dùng. Yêu cầu: dữ liệu session phải tồn tại qua các lần khởi động lại node (persistence), hỗ trợ replication để high availability, và có thể dùng các cấu trúc dữ liệu phong phú như sorted set cho leaderboard. Engine ElastiCache nào phù hợp?",
    "options": [
      "Amazon ElastiCache for Redis",
      "Amazon ElastiCache for Memcached",
      "Amazon DynamoDB với TTL",
      "Amazon RDS for PostgreSQL với in-memory tablespace"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Redis hỗ trợ persistence, replication/Multi-AZ với automatic failover và các kiểu dữ liệu nâng cao như sorted set — Memcached thì không.\n✓ ElastiCache for Redis có persistence, replication HA và cấu trúc dữ liệu phong phú (sorted set, hash) — đáp ứng mọi yêu cầu.\n✗ Memcached là cache đơn giản multi-threaded, KHÔNG có persistence, replication hay cấu trúc dữ liệu nâng cao.\n✗ DynamoDB với TTL lưu được session nhưng không phải in-memory cache, độ trễ cao hơn và không có sorted set native.\n✗ RDS PostgreSQL không phải caching layer in-memory, không phù hợp cho session caching tốc độ cao.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-048",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một database RDS for MySQL có một truy vấn báo cáo nặng chạy mỗi đêm trên Read Replica. Nhóm phân tích phàn nàn rằng đôi khi dữ liệu trên replica trễ vài giây so với primary. Để hiểu và xử lý đúng, kiến trúc sư nên nhận định điều gì về RDS Read Replicas?",
    "options": [
      "Read Replicas dùng asynchronous replication nên có thể có replica lag; phù hợp khi ứng dụng chấp nhận eventual consistency cho đọc",
      "Read Replicas dùng synchronous replication nên dữ liệu luôn nhất quán tuyệt đối với primary",
      "Replica lag chỉ xảy ra khi cấu hình sai và có thể loại bỏ hoàn toàn bằng cách bật Multi-AZ",
      "Read Replicas đảm bảo strong consistency giống như đọc từ primary endpoint"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RDS Read Replicas dùng asynchronous replication, nên replica lag là hành vi bình thường và phù hợp cho workload đọc chấp nhận eventual consistency.\n✓ Asynchronous replication vốn dĩ có thể gây lag — đúng bản chất, phù hợp báo cáo chấp nhận eventual consistency.\n✗ Read Replicas KHÔNG dùng synchronous replication; chỉ Multi-AZ standby mới synchronous.\n✗ Replica lag là vốn có của async replication, không thể loại bỏ hoàn toàn; Multi-AZ phục vụ HA chứ không loại bỏ lag của read replica.\n✗ Read Replicas cho eventual consistency, không đảm bảo strong consistency như primary.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-049",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "EC2 instance trong private subnet đang tải về và đẩy lên hàng terabyte dữ liệu mỗi tháng từ/đến Amazon S3 trong cùng region. Hóa đơn NAT Gateway tăng vọt do data processing charge. Giải pháp nào giảm chi phí này một cách cost-effective nhất mà không ảnh hưởng kết nối tới các dịch vụ khác?",
    "options": [
      "Tạo S3 Gateway VPC endpoint và thêm route tới endpoint trong route table của private subnet",
      "Tạo Interface VPC endpoint (PrivateLink) cho S3 ở mỗi AZ",
      "Di chuyển EC2 instance ra public subnet và gán Elastic IP",
      "Thay NAT Gateway bằng NAT instance EC2 tự quản lý loại nhỏ hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Gateway endpoint miễn phí và định tuyến traffic S3 qua mạng AWS private, loại bỏ hoàn toàn data processing charge của NAT cho phần traffic này.\n✓ S3 Gateway endpoint: free, traffic S3 không đi qua NAT nữa, vẫn giữ NAT cho các dịch vụ khác — cost-effective nhất.\n✗ Interface endpoint cho S3: tính phí theo giờ per-AZ cộng phí data; Gateway endpoint cho S3 thì miễn phí nên rẻ hơn.\n✗ Đưa EC2 ra public subnet: phá vỡ mô hình bảo mật private và vẫn tính internet egress.\n✗ NAT instance tự quản lý: vẫn tốn data transfer, thêm operational overhead, không giải quyết gốc.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-050",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng HPC chạy MPI giữa hàng trăm EC2 instance đòi hỏi inter-node communication latency cực thấp và network throughput cao trong cùng một cluster. Kết hợp nào tối ưu nhất cho yêu cầu network performance này?",
    "options": [
      "Cluster placement group kết hợp Elastic Fabric Adapter (EFA) trên các instance hỗ trợ",
      "Spread placement group kết hợp Elastic Network Adapter (ENA) tiêu chuẩn",
      "Partition placement group trải trên nhiều AZ để tăng độ bền",
      "Cluster placement group kết hợp jumbo frames qua NAT Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cluster placement group đặt instance gần nhau trong cùng AZ cho latency thấp nhất, còn EFA cho phép OS-bypass tối ưu MPI/HPC.\n✓ Cluster placement group + EFA: low latency intra-cluster, high throughput, EFA tối ưu cho MPI HPC — đúng nhất.\n✗ Spread placement group + ENA: spread đặt instance tách xa nhau để giảm tương quan lỗi, ngược mục tiêu low latency.\n✗ Partition group trải nhiều AZ: cross-AZ latency cao hơn, tối ưu cho big data/HA chứ không cho HPC latency thấp.\n✗ Jumbo frames qua NAT Gateway: jumbo frames không hoạt động ra internet/NAT, và NAT không liên quan inter-node MPI.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-051",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty thu thập clickstream từ website thương mại điện tử và cần đẩy dữ liệu này vào một S3 data lake để phân tích batch hàng ngày. Họ không cần xử lý real-time, không muốn quản lý cluster, và muốn giải pháp có least operational overhead để load dữ liệu vào S3 với khả năng tự động buffer, nén và partition theo thời gian. Giải pháp nào phù hợp nhất?",
    "options": [
      "Amazon Data Firehose ghi trực tiếp vào S3 với buffering, nén (GZIP/Snappy) và dynamic partitioning theo thời gian",
      "Amazon Kinesis Data Streams kết hợp consumer application chạy trên EC2 tự ghi dữ liệu vào S3",
      "Amazon MSK với một custom Kafka Connect S3 sink connector tự vận hành",
      "Amazon EMR cluster đọc dữ liệu từ một SQS queue rồi ghi xuống S3 theo lịch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firehose là dịch vụ fully managed để load streaming data vào S3 với buffering, nén và partition, đúng nhu cầu ingestion với least operational overhead.\n✓ Amazon Data Firehose fully managed, tự buffer/nén/partition và ghi vào S3, không cần quản lý hạ tầng.\n✗ Kinesis Data Streams cần tự viết và vận hành consumer trên EC2, tăng operational overhead.\n✗ MSK + Kafka Connect tự vận hành đòi hỏi quản lý cluster và connector, quá nặng cho nhu cầu này.\n✗ EMR cluster cho batch ETL là thừa thãi và tốn kém cho việc chỉ load dữ liệu vào S3.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-052",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức cần chạy job ETL theo lịch để làm sạch, biến đổi và join nhiều nguồn dữ liệu trong S3 trước khi nạp vào data lake dạng Parquet. Họ muốn giải pháp serverless, tự động khám phá schema và sinh code transformation, với least operational overhead. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS Glue (Crawler khám phá schema + ETL jobs trên Spark serverless) ghi output Parquet vào S3",
      "Amazon EMR cluster với Spark được khởi tạo theo lịch để chạy job ETL",
      "AWS Lambda functions được orchestrate bằng Step Functions để transform toàn bộ dữ liệu",
      "Amazon Managed Service for Apache Flink xử lý dữ liệu rồi ghi vào S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Glue là dịch vụ ETL serverless với crawler khám phá schema và job Spark managed, lý tưởng cho batch ETL nạp data lake.\n✓ Glue serverless, crawler tự phát hiện schema, ETL job sinh code và ghi Parquet, least operational overhead.\n✗ EMR cần cấu hình và quản lý cluster Spark, nhiều operational overhead hơn Glue.\n✗ Lambda có giới hạn 15 phút và bộ nhớ, không hợp cho ETL nặng join nhiều nguồn TB dữ liệu.\n✗ Managed Service for Apache Flink dành cho streaming real-time, không phải batch ETL theo lịch.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-053",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty cần xử lý batch khổng lồ (hàng petabyte) bằng các framework big data như Apache Spark, Hive và Presto, với các job chạy không liên tục. Họ muốn tối ưu chi phí bằng cách dùng Spot Instances cho compute và tách storage khỏi compute. Giải pháp nào phù hợp nhất?",
    "options": [
      "Amazon EMR với transient cluster đọc/ghi dữ liệu trên S3 (EMRFS) và dùng Spot Instances cho task nodes",
      "AWS Glue ETL chạy tất cả job Spark petabyte-scale theo mô hình serverless",
      "Amazon Athena chạy mọi job transformation big data trực tiếp trên S3",
      "Amazon Redshift Spectrum xử lý toàn bộ workload Spark và Hive"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EMR transient cluster với EMRFS tách storage (S3) khỏi compute và dùng Spot cho task nodes, tối ưu chi phí cho big data batch petabyte-scale.\n✓ EMR hỗ trợ Spark/Hive/Presto, dùng S3 làm storage tách rời, Spot Instances giảm chi phí cho job không liên tục.\n✗ Glue serverless tiện nhưng kém kinh tế và linh hoạt hơn EMR cho workload petabyte cần Spot và nhiều framework.\n✗ Athena là query engine SQL, không chạy được job Spark/Hive tùy biến petabyte-scale.\n✗ Redshift Spectrum chỉ query S3 từ Redshift, không phải nền tảng chạy Spark/Hive.",
    "domain": 3,
    "mock": 2
  },
  {
    "id": "saa-m2-054",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một data lake trên S3 dùng S3 Intelligent-Tiering. Kiến trúc sư muốn tối ưu thêm chi phí cho dữ liệu archive sâu nhưng vẫn giữ tính tự động của Intelligent-Tiering, đồng thời nắm rõ các đặc tính chi phí. Chọn HAI phát biểu ĐÚNG về cách tối ưu và đặc tính chi phí của S3 Intelligent-Tiering.",
    "options": [
      "Có thể bật Archive Access và Deep Archive Access tier (opt-in) trong Intelligent-Tiering để tự động chuyển object không truy cập lâu xuống tier archive rẻ hơn",
      "S3 Intelligent-Tiering tính một khoản phí monitoring/automation nhỏ theo từng object, nên cần cân nhắc khi có rất nhiều object nhỏ",
      "S3 Intelligent-Tiering áp dụng phí truy xuất (retrieval fee) cho mọi lần đọc object ở Frequent Access tier",
      "Object nhỏ hơn 128 KB luôn bị tính phí truy xuất khi được tự động chuyển xuống Deep Archive Access tier",
      "Khi bật Deep Archive Access tier, object được truy xuất tức thì (milliseconds) giống như ở Frequent Access tier"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Intelligent-Tiering hỗ trợ opt-in Archive/Deep Archive Access tier để tự động hạ chi phí sâu hơn, và nó tính một khoản phí monitoring/automation nhỏ theo object cần cân nhắc.\n✓ Bật Archive/Deep Archive Access tier (opt-in) — đúng, cho phép tự động chuyển object lạnh xuống tier archive rẻ hơn trong Intelligent-Tiering.\n✓ Có phí monitoring/automation nhỏ trên mỗi object — đúng, đây là chi phí ngầm cần cân nhắc, đặc biệt với rất nhiều object nhỏ.\n✗ Tính phí truy xuất cho mọi lần đọc ở Frequent Access tier — sai, Intelligent-Tiering không tính phí truy xuất khi truy cập object giữa các access tier thông thường.\n✗ Object nhỏ hơn 128 KB luôn bị tính phí truy xuất khi xuống Deep Archive — sai, object nhỏ hơn 128 KB không được tự động chuyển xuống tier archive mà giữ ở Frequent Access.\n✗ Deep Archive Access truy xuất tức thì — sai, object ở Deep Archive Access cần tới hàng giờ để khôi phục, không tức thì.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-055",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một fleet EC2 trong private subnets cần truy cập nhiều AWS service trong cùng Region: S3, DynamoDB, Amazon ECR (kéo container images), và CloudWatch Logs. Toàn bộ traffic hiện đi qua NAT Gateway, chi phí data processing rất cao. Đội kiến trúc muốn giảm tối đa traffic qua NAT Gateway. Những hành động nào nên thực hiện? (Chọn HAI)",
    "options": [
      "Tạo Gateway VPC endpoints cho S3 và DynamoDB",
      "Tạo Interface VPC endpoints cho ECR (ecr.api, ecr.dkr) và CloudWatch Logs",
      "Thay thế NAT Gateway bằng NAT instance trên một EC2 nhỏ để giảm chi phí",
      "Tạo Interface VPC endpoint cho S3 và DynamoDB để dùng PrivateLink",
      "Chuyển tất cả service calls qua một Internet Gateway gắn vào private subnet"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "S3 và DynamoDB hỗ trợ Gateway endpoint (miễn phí), còn ECR và CloudWatch Logs cần Interface endpoint; kết hợp cả hai loại bỏ phần lớn traffic qua NAT Gateway.\n✓ Gateway endpoints cho S3 và DynamoDB miễn phí và đưa traffic ra khỏi NAT Gateway.\n✓ Interface endpoints cho ECR (ecr.api, ecr.dkr) và CloudWatch Logs cho phép truy cập riêng tư các service này không qua NAT.\n✗ NAT instance phải tự quản lý, không có HA mặc định và vẫn xử lý cùng lượng traffic — không phải tối ưu.\n✗ S3 và DynamoDB dùng Gateway endpoint (miễn phí), dùng Interface endpoint sẽ phát sinh phí giờ và phí xử lý không cần thiết.\n✗ Không thể gắn Internet Gateway để định tuyến cho một private subnet theo cách đó; điều đó biến nó thành public subnet và phá vỡ thiết kế.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-056",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng tạo ra hàng triệu object nhỏ (mỗi object khoảng 50 KB) trên S3. Dữ liệu được truy cập không thường xuyên sau 30 ngày nhưng cần truy xuất tức thì (milliseconds) khi cần. Kiến trúc sư muốn giảm chi phí nhưng lo ngại về phí tối thiểu. Lựa chọn TỐI ƯU CHI PHÍ nhất là gì?",
    "options": [
      "Giữ object ở S3 Standard vì S3 Standard-IA có kích thước object tối thiểu tính phí 128 KB",
      "Chuyển object sang S3 Standard-IA sau 30 ngày bằng lifecycle policy",
      "Chuyển object sang S3 One Zone-IA sau 30 ngày bằng lifecycle policy",
      "Chuyển object sang S3 Glacier Instant Retrieval sau 30 ngày"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với hàng triệu object 50 KB, các tier IA tính phí lưu trữ tối thiểu theo 128 KB/object nên thực tế đắt hơn Standard; truy xuất tức thì còn loại Glacier truyền thống.\n✓ Giữ ở S3 Standard — đúng, vì object dưới 128 KB bị tính phí như 128 KB ở tier IA, khiến IA đắt hơn cho object rất nhỏ và nhiều.\n✗ Standard-IA sau 30 ngày — phí tối thiểu 128 KB/object làm chi phí thực tế cao hơn với object 50 KB.\n✗ One Zone-IA sau 30 ngày — cũng bị phí tối thiểu 128 KB và giảm độ bền (một AZ).\n✗ Glacier Instant Retrieval — cũng có kích thước tối thiểu tính phí 128 KB và phí truy xuất, không tối ưu cho object nhỏ truy cập tức thì.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-057",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty lưu các bản backup database vào S3, chỉ truy cập lại khi cần khôi phục thảm họa (rất hiếm). Yêu cầu RTO cho phép vài giờ để truy xuất backup. Backup này KHÔNG cần độ bền multi-AZ vì đã có bản gốc ở nơi khác. Mục tiêu là chi phí lưu trữ thấp nhất có thể. Storage class nào phù hợp nhất?",
    "options": [
      "S3 Glacier Flexible Retrieval",
      "S3 One Zone-IA",
      "S3 Glacier Deep Archive",
      "S3 Glacier Instant Retrieval"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Truy xuất hiếm với RTO vài giờ khớp đúng Glacier Flexible Retrieval (standard retrieval 3-5 giờ), rẻ hơn nhiều so với các tier truy cập nhanh trong khi vẫn đáp ứng RTO.\n✓ Glacier Flexible Retrieval — đúng, chi phí lưu trữ rất thấp và truy xuất trong vài giờ đáp ứng RTO.\n✗ One Zone-IA — chi phí lưu trữ cao hơn nhiều Glacier và phù hợp dữ liệu cần truy xuất tức thì hơn.\n✗ Deep Archive — rẻ hơn nữa nhưng truy xuất ~12 giờ có thể vượt RTO vài giờ.\n✗ Glacier Instant Retrieval — tối ưu cho truy cập tức thì nhưng đắt hơn Flexible Retrieval cho dữ liệu chỉ cần trong vài giờ.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-058",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web Java chạy ổn định 24/7 trên các EC2 instance họ m5 trong suốt 3 năm tới với mức sử dụng dự đoán được. Kiến trúc sư muốn giảm chi phí nhưng vẫn giữ linh hoạt thay đổi instance family, size và Region khi cần. Lựa chọn nào tối ưu nhất?",
    "options": [
      "Compute Savings Plans kỳ hạn 3 năm",
      "Standard Reserved Instances kỳ hạn 3 năm gắn với họ m5",
      "EC2 Spot Instances trong một Spot Fleet",
      "On-Demand Capacity Reservations"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Savings Plans cho giảm giá tương đương RI nhưng linh hoạt qua mọi instance family, size, OS, Region và cả Fargate/Lambda.\n✓ Compute Savings Plans áp dụng tự động khi bạn đổi family/size/Region, lý tưởng cho nhu cầu giữ linh hoạt với cam kết dài hạn.\n✗ Standard Reserved Instances 3 năm cho discount cao nhưng gắn cứng vào họ m5, khó đổi family/Region.\n✗ Spot không phù hợp cho web app cần chạy liên tục 24/7 ổn định.\n✗ On-Demand Capacity Reservations chỉ đảm bảo capacity, không tự giảm giá đáng kể.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-059",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng backend chạy trên EC2 m5.4xlarge. Sau khi xem AWS Compute Optimizer và CloudWatch, đội nhận thấy CPU trung bình chỉ ~8% và memory ~15% trong nhiều tuần. Ứng dụng là Java thuần, đã được kiểm thử chạy tốt trên ARM. Hành động nào MOST cost-effective?",
    "options": [
      "Right-size xuống một instance dựa trên Graviton (ví dụ m7g) có kích thước nhỏ hơn theo khuyến nghị của Compute Optimizer",
      "Mua Standard Reserved Instances 3 năm cho m5.4xlarge để khóa giá thấp",
      "Bật EC2 Auto Scaling để thêm m5.4xlarge khi tải tăng",
      "Chuyển ứng dụng sang Spot Instances cùng kích thước m5.4xlarge"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Instance over-provisioned nghiêm trọng; right-sizing xuống bậc nhỏ hơn và sang Graviton vừa giảm lãng phí vừa cải thiện price/performance.\n✓ Right-size theo khuyến nghị Compute Optimizer + chuyển sang Graviton (m7g) cắt giảm cả số core thừa lẫn đơn giá, tối ưu chi phí nhất cho app ARM-ready.\n✗ Reserved Instances 3 năm cho m5.4xlarge khóa giá cho một instance vốn đã quá lớn, cố định lãng phí.\n✗ Auto Scaling thêm instance không giải quyết được việc instance hiện tại đã quá khổ.\n✗ Spot cùng size m5.4xlarge giảm đơn giá nhưng vẫn trả cho tài nguyên thừa và thêm rủi ro gián đoạn.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-060",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một nền tảng SaaS chạy hàng nghìn Lambda function được gọi liên tục với khối lượng rất lớn và ổn định mỗi tháng. Hóa đơn Lambda đang tăng nhanh. Các function là Node.js thuần, không phụ thuộc kiến trúc. Kiến trúc sư muốn giảm chi phí Lambda mà giữ kiến trúc serverless và LEAST operational overhead. Kết hợp nào hợp lý nhất?",
    "options": [
      "Mua Compute Savings Plans để phủ phần Lambda usage ổn định và chuyển function sang kiến trúc Graviton (arm64)",
      "Tăng memory cấp cho mỗi function lên mức tối đa để chạy nhanh hơn",
      "Di trú toàn bộ function sang EC2 On-Demand để có giá compute rẻ hơn",
      "Bật Provisioned Concurrency tối đa cho mọi function để giảm chi phí mỗi lần gọi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Compute Savings Plans cũng áp dụng cho Lambda, và Graviton/arm64 cho Lambda rẻ hơn cùng price/performance tốt hơn — cả hai giữ nguyên serverless.\n✓ Compute Savings Plans phủ Lambda usage ổn định để giảm giá, cộng arm64 (Graviton) hạ thêm chi phí mỗi GB-giây với ít thay đổi vận hành.\n✗ Tăng memory tối đa làm tăng chi phí GB-giây trừ khi rút ngắn đáng kể thời gian chạy; bừa bãi sẽ đắt hơn.\n✗ Di trú sang EC2 đánh mất serverless và tăng mạnh operational overhead quản lý hạ tầng.\n✗ Provisioned Concurrency tối đa cho mọi function làm TĂNG chi phí vì trả tiền giữ sẵn capacity, không phải để giảm giá.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-061",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bảng Amazon DynamoDB phục vụ cho tính năng mới vừa ra mắt. Lưu lượng hiện rất thấp và cực kỳ khó dự đoán vì chưa rõ tốc độ tăng trưởng người dùng. Team không muốn phải tự dự báo capacity và muốn tránh throttling khi traffic tăng đột ngột. Capacity mode nào phù hợp nhất?",
    "options": [
      "On-demand capacity mode",
      "Provisioned capacity mode với auto scaling",
      "Provisioned capacity mode với reserved capacity",
      "On-demand capacity mode kèm DynamoDB Accelerator (DAX)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với traffic mới, thấp và không dự đoán được, On-demand loại bỏ hoàn toàn việc dự báo capacity và tự xử lý spike, chỉ trả theo request thực tế.\n✓ On-demand — đúng, không cần dự báo, hấp thụ spike tức thì, lý tưởng cho workload mới/khó đoán.\n✗ Provisioned + auto scaling — auto scaling phản ứng chậm hơn với spike đột ngột và vẫn cần đặt min/max ban đầu.\n✗ Provisioned + reserved capacity — cam kết trước cho tải không dự đoán được là rủi ro lãng phí lớn.\n✗ On-demand + DAX — DAX là cache giải quyết latency đọc, không liên quan bài toán capacity/dự báo.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-062",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty fintech chạy Aurora PostgreSQL cluster cho hệ thống giao dịch. Tải đọc tăng đều theo tăng trưởng và họ đã thêm 4 read replicas, nhưng nhiều replica chỉ đạt ~20% sử dụng vào ban đêm, gây lãng phí. Họ cần đảm bảo đủ capacity đọc lúc cao điểm nhưng cost-effective lúc thấp điểm, với least operational overhead. Giải pháp nào tốt nhất?",
    "options": [
      "Dùng Aurora Auto Scaling cho read replicas dựa trên CPU/connections để tự thêm bớt replica theo tải",
      "Thay tất cả replica bằng một Aurora Serverless v2 reader duy nhất rồi tự scale ACU",
      "Đặt CloudWatch alarm gửi SNS để DBA thủ công thêm/xóa replica theo ca",
      "Chuyển toàn bộ replica sang Reserved Instances để giảm giá mỗi replica"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora Auto Scaling tự động thêm/bớt read replicas theo metric tải, đảm bảo capacity lúc peak và cắt giảm replica thừa lúc nhàn rỗi mà không cần can thiệp thủ công.\n✓ Aurora Auto Scaling cho read replicas — đúng, tự co giãn số replica theo tải, tối ưu chi phí và least operational overhead.\n✗ Một Serverless v2 reader duy nhất — mất tính dự phòng nhiều replica và giới hạn khả năng phân tải đọc lớn lúc peak.\n✗ CloudWatch alarm + DBA thủ công — phụ thuộc thao tác tay, operational overhead cao, dễ phản ứng chậm.\n✗ Reserved Instances cho mọi replica — cam kết trước cho replica vốn lãng phí ban đêm chỉ khóa cứng sự lãng phí đó.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-063",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty chạy nhiều EC2 instances trong private subnets. Các instances này thường xuyên đọc và ghi một lượng lớn dữ liệu vào một S3 bucket trong cùng Region. Hiện tại traffic đi qua NAT Gateway, và hóa đơn data processing của NAT Gateway đang rất cao. Giải pháp nào giảm chi phí HIỆU QUẢ NHẤT mà không ảnh hưởng đến khả năng truy cập S3?",
    "options": [
      "Tạo một Gateway VPC endpoint cho S3 và cập nhật route table của private subnets để định tuyến traffic tới S3 qua endpoint này",
      "Tạo một Interface VPC endpoint (PrivateLink) cho S3 và tính phí theo giờ cộng phí xử lý dữ liệu",
      "Di chuyển các EC2 instances sang public subnets và gán Elastic IP cho mỗi instance",
      "Tăng số lượng NAT Gateway lên nhiều AZ để phân tải và giảm chi phí data processing"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Gateway VPC endpoint cho S3 hoàn toàn miễn phí và loại bỏ traffic S3 khỏi NAT Gateway, cắt giảm phí data processing.\n✓ Gateway VPC endpoint cho S3 không tính phí giờ hay phí xử lý dữ liệu, traffic tới S3 đi nội bộ trong AWS network thay vì qua NAT Gateway.\n✗ Interface endpoint cho S3 phát sinh phí giờ và phí xử lý dữ liệu — Gateway endpoint mới là lựa chọn miễn phí tối ưu.\n✗ Chuyển sang public subnets làm mất tính bảo mật và vẫn phát sinh chi phí internet egress.\n✗ Thêm nhiều NAT Gateway chỉ làm tăng chi phí, không loại bỏ phí data processing.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-064",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một doanh nghiệp có on-premises data center cần truyền 50 TB dữ liệu mỗi tháng lên AWS một cách ổn định và cần băng thông nhất quán cho ứng dụng nhạy cảm độ trễ. Hiện họ dùng Site-to-Site VPN qua internet và chi phí data transfer cùng độ trễ không ổn định là vấn đề. Giải pháp nào tối ưu chi phí dài hạn và đảm bảo băng thông ổn định?",
    "options": [
      "Thiết lập AWS Direct Connect với một dedicated connection từ on-premises tới AWS",
      "Mở rộng Site-to-Site VPN thành nhiều tunnel để tăng băng thông tổng",
      "Dùng AWS DataSync qua internet để tối ưu hóa tốc độ truyền dữ liệu",
      "Sử dụng AWS Snowball để vận chuyển dữ liệu định kỳ mỗi tháng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Direct Connect cung cấp băng thông ổn định, độ trễ nhất quán và giá data transfer out thấp hơn đáng kể so với internet/VPN, tối ưu cho khối lượng lớn ổn định dài hạn.\n✓ Direct Connect đảm bảo dedicated bandwidth, độ trễ ổn định và data transfer rate rẻ hơn internet — lý tưởng cho 50 TB/tháng đều đặn.\n✗ Nhiều VPN tunnel vẫn đi qua internet công cộng, băng thông và độ trễ không đảm bảo.\n✗ DataSync qua internet không giải quyết được vấn đề độ trễ ổn định và vẫn chịu phí internet transfer.\n✗ Snowball phù hợp cho di chuyển một lần lượng cực lớn, không phù hợp cho luồng dữ liệu liên tục cần băng thông realtime.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m2-065",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống xử lý dữ liệu lớn dùng EMR đọc dữ liệu từ S3. Các EMR cluster nằm trong private subnets và truy cập S3 cùng Region qua NAT Gateway. Khối lượng đọc rất lớn (hàng trăm TB mỗi ngày), khiến phí data processing của NAT Gateway chiếm phần lớn hóa đơn mạng. Ngoài chi phí, một vấn đề khác là NAT Gateway giới hạn throughput. Giải pháp nào giải quyết CẢ chi phí lẫn throughput tốt nhất?",
    "options": [
      "Triển khai Gateway VPC endpoint cho S3 để traffic đi trực tiếp tới S3 không qua NAT Gateway",
      "Nâng cấp lên nhiều NAT Gateway và bật enhanced networking trên các EMR nodes",
      "Bật S3 Transfer Acceleration để tăng throughput đọc dữ liệu từ S3",
      "Đặt một Interface VPC endpoint cho S3 để giảm phụ thuộc vào NAT Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Gateway endpoint cho S3 miễn phí và không bị giới hạn throughput như NAT Gateway, giải quyết đồng thời cost và bottleneck.\n✓ Gateway endpoint loại bỏ phí data processing của NAT Gateway và không áp đặt giới hạn throughput của NAT, lý tưởng cho khối lượng đọc S3 cực lớn.\n✗ Nhiều NAT Gateway vẫn phát sinh phí data processing cao và tốn kém hơn nhiều so với Gateway endpoint miễn phí.\n✗ Transfer Acceleration phụ thu phí và hướng tới truyền qua internet, không giải quyết NAT cost nội Region.\n✗ Interface endpoint cho S3 phát sinh phí giờ và phí xử lý — Gateway endpoint mới là lựa chọn miễn phí và phù hợp throughput cao.",
    "domain": 4,
    "mock": 2
  },
  {
    "id": "saa-m3-001",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một kiến trúc 3-tier: web tier (public subnet) gọi app tier (private subnet) trên TCP 8080, app tier gọi RDS (private subnet) trên TCP 5432. Cần cấu hình security group theo least privilege. Hai cấu hình nào ĐÚNG? (Chọn 2)",
    "options": [
      "App tier SG cho phép inbound 8080 với source là security group của web tier",
      "RDS SG cho phép inbound 5432 với source là security group của app tier",
      "App tier SG cho phép inbound 8080 từ 0.0.0.0/0 để đơn giản hóa",
      "RDS SG cho phép inbound 5432 từ CIDR của toàn VPC",
      "Web tier SG cho phép inbound 5432 từ RDS security group"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Tham chiếu security group làm source giúp least privilege và tự co giãn theo instance.\n✓ App tier nhận 8080 từ SG web tier — đúng, chỉ web tier gọi được app tier.\n✓ RDS nhận 5432 từ SG app tier — đúng, chỉ app tier gọi được DB.\n✗ App tier mở 8080 từ 0.0.0.0/0 — quá rộng, vi phạm least privilege.\n✗ RDS mở 5432 cho toàn VPC CIDR — rộng hơn cần thiết, không least privilege.\n✗ Web tier nhận 5432 từ RDS SG — sai chiều luồng; web tier không nhận kết nối DB.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-002",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một công ty bị yêu cầu compliance: dữ liệu PII trong S3 phải được phân loại, mã hoá at rest bằng key có thể audit, và mọi truy cập object phải qua HTTPS. Chọn HAI biện pháp trực tiếp đáp ứng các yêu cầu này (ngoài việc bật mã hoá SSE-KMS đã có sẵn).",
    "options": [
      "Bật Amazon Macie để khám phá và phân loại dữ liệu PII",
      "Thêm bucket policy Deny khi aws:SecureTransport là false",
      "Chuyển dữ liệu sang S3 Standard-IA để giảm chi phí",
      "Tắt CloudTrail để giảm log noise",
      "Dùng SSE-C để client tự giữ key"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Macie xử lý yêu cầu phân loại PII; bucket policy chặn non-HTTPS enforce encryption in transit.\n✓ Macie: tự động khám phá và phân loại PII, đáp ứng yêu cầu data classification.\n✓ Deny khi aws:SecureTransport là false: bắt buộc mọi truy cập object qua HTTPS.\n✗ Standard-IA: liên quan chi phí lưu trữ, không đáp ứng yêu cầu compliance nêu ra.\n✗ Tắt CloudTrail: làm mất khả năng audit, đi ngược yêu cầu.\n✗ SSE-C: key do client giữ, không audit tập trung được như yêu cầu key auditable.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-003",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Account A chứa một S3 bucket cần được account B truy cập đọc dữ liệu. Yêu cầu là account B chỉ được cấp quyền tạm thời và account A muốn kiểm soát chính xác principal nào ở account B được phép. Cách triển khai cross-account access nào là tối ưu và an toàn nhất?",
    "options": [
      "Tạo IAM role trong account A với trust policy cho phép account B AssumeRole, và account B dùng STS AssumeRole để lấy temporary credentials",
      "Tạo IAM user trong account A và chia sẻ access key với account B",
      "Gắn bucket policy trong account A cho phép Principal là toàn bộ account B (root)",
      "Bật S3 Access Points và cấp quyền public-read cho bucket"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role với trust policy cung cấp cross-account access bằng temporary credentials và cho phép kiểm soát chi tiết principal được tin tưởng.\n✓ IAM role + STS AssumeRole: temporary credentials, trust policy kiểm soát chính xác ai được assume, best practice cho cross-account.\n✗ Chia sẻ access key của IAM user: long-term credentials, rủi ro cao, vi phạm least privilege.\n✗ Bucket policy cho toàn bộ root account B: cấp quyền quá rộng, mọi principal account B đều truy cập được, không kiểm soát chi tiết.\n✗ Public-read access point: lộ dữ liệu ra ngoài, không phù hợp yêu cầu cấp quyền có kiểm soát.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-004",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một mobile app cần cho phép hàng triệu người dùng cuối upload ảnh lên S3. App dùng Google và Facebook để đăng nhập. Bạn cần cấp temporary AWS credentials cho từng người dùng với quyền giới hạn, không tạo IAM user cho mỗi người. Giải pháp nào tối ưu?",
    "options": [
      "Dùng Amazon Cognito identity pool để federate người dùng qua các OIDC provider và cấp temporary credentials qua STS",
      "Tạo một IAM role chung và nhúng access key của role vào app",
      "Tạo IAM user cho mỗi người dùng cuối thông qua API tự động",
      "Dùng SCP để giới hạn quyền upload của từng người dùng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito identity pool được thiết kế để federate người dùng web/mobile qua social IdP và cấp temporary AWS credentials theo từng người với quyền giới hạn.\n✓ Cognito identity pool + OIDC: web identity federation, temporary credentials qua STS, scale tới hàng triệu user, không tạo IAM user.\n✗ Nhúng access key của role: role không có long-term key để nhúng; nhúng key tĩnh trong app là rủi ro nghiêm trọng.\n✗ IAM user cho mỗi người dùng: vượt quota IAM user và không scale tới hàng triệu người.\n✗ SCP: dùng cho account trong Organizations, không liên quan tới người dùng cuối của app.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-005",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function cần ghi vào DynamoDB và đọc một secret từ Secrets Manager. Solutions Architect muốn cấp quyền theo least privilege và least operational overhead. Cách nào đúng nhất?",
    "options": [
      "Tạo một IAM execution role cho Lambda với policy chỉ cho phép các action cụ thể trên đúng bảng DynamoDB và đúng secret ARN",
      "Tạo IAM user, sinh access key và lưu vào biến môi trường của Lambda",
      "Gắn AdministratorAccess vào execution role để đảm bảo function chạy được",
      "Dùng resource-based policy trên Lambda để cấp quyền truy cập DynamoDB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda execution role với policy giới hạn đúng action và đúng ARN tài nguyên là cách chuẩn theo least privilege.\n✓ Execution role với quyền cụ thể: temporary credentials tự động, chỉ đúng quyền cần thiết, ít vận hành.\n✗ IAM user + access key trong env: long-term credentials, rủi ro lộ key, sai best practice.\n✗ AdministratorAccess: vi phạm least privilege nghiêm trọng.\n✗ Resource-based policy trên Lambda: kiểm soát ai được gọi Lambda, không cấp quyền cho Lambda truy cập DynamoDB.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-006",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng on-premises cần gọi AWS API để upload dữ liệu vào S3. Yêu cầu là không lưu long-term IAM credentials trên máy chủ on-premises. Hệ thống on-premises đã có một OIDC identity provider. Giải pháp nào tối ưu để cấp quyền tạm thời?",
    "options": [
      "Cấu hình IAM OIDC identity provider và để ứng dụng dùng web identity token gọi STS AssumeRoleWithWebIdentity lấy temporary credentials",
      "Tạo IAM user, sinh access key và lưu trong file cấu hình trên máy chủ on-premises",
      "Dùng IAM Roles Anywhere với access key tĩnh",
      "Tạo một IAM role và chia sẻ secret key của role cho ứng dụng on-premises"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "OIDC federation cho phép workload bên ngoài đổi token sang temporary AWS credentials mà không cần lưu long-term key.\n✓ IAM OIDC provider + AssumeRoleWithWebIdentity: dùng token OIDC sẵn có, nhận temporary credentials, không lưu long-term key.\n✗ IAM user access key trong file: chính là long-term credentials cần tránh.\n✗ IAM Roles Anywhere với access key tĩnh: Roles Anywhere dùng X.509 certificate, không dùng access key tĩnh; mô tả sai.\n✗ Chia sẻ secret key của role: role không có long-term secret key để chia sẻ.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-007",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một policy có một explicit Deny cho s3:DeleteObject với điều kiện aws:MultiFactorAuthPresent là false, và một policy khác Allow s3:DeleteObject. Một user không dùng MFA gọi s3:DeleteObject. Theo policy evaluation logic, kết quả là gì?",
    "options": [
      "Bị từ chối, vì explicit Deny luôn ưu tiên hơn mọi Allow khi điều kiện Deny khớp",
      "Được phép, vì có một Allow rõ ràng cho action",
      "Được phép, vì điều kiện MFA chỉ là cảnh báo chứ không chặn",
      "Bị từ chối, vì thiếu resource-based policy"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong IAM, explicit Deny luôn thắng Allow; vì user không có MFA nên điều kiện Deny khớp và request bị chặn.\n✓ Bị từ chối do explicit Deny: điều kiện MFA-false khớp, explicit Deny override Allow.\n✗ Được phép vì có Allow: explicit Deny luôn ưu tiên hơn Allow.\n✗ Điều kiện MFA chỉ cảnh báo: sai, điều kiện trong Deny thực sự chặn request.\n✗ Thiếu resource-based policy: không liên quan; nguyên nhân là explicit Deny.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-008",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhà thầu bên ngoài cần truy cập tạm thời vào một số tài nguyên trong account của bạn trong 2 tuần. Bạn muốn cấp quyền an toàn, có thể thu hồi dễ dàng, không tạo credentials lâu dài. Cách tiếp cận nào tối ưu?",
    "options": [
      "Tạo một IAM role với trust policy cho phép account của nhà thầu AssumeRole, gắn policy least-privilege, và xóa/điều chỉnh trust sau 2 tuần",
      "Tạo IAM user cho nhà thầu với access key và xóa sau 2 tuần",
      "Gắn AdministratorAccess cho một IAM user mới của nhà thầu",
      "Chia sẻ mật khẩu root account cho nhà thầu trong thời gian làm việc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "IAM role với cross-account trust cấp temporary credentials, dễ thu hồi bằng cách sửa/xóa trust policy, không tạo long-term credentials.\n✓ IAM role + cross-account AssumeRole: temporary credentials least-privilege, thu hồi dễ bằng cách chỉnh trust, an toàn cho truy cập tạm.\n✗ IAM user + access key: long-term credentials, rủi ro lộ và khó kiểm soát hơn.\n✗ AdministratorAccess cho user mới: vi phạm least privilege nghiêm trọng.\n✗ Chia sẻ root: cực kỳ nguy hiểm, không bao giờ làm.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-009",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Các EC2 trong private subnet cần kéo OS patches từ Internet nhưng KHÔNG được nhận kết nối khởi tạo từ Internet. Giải pháp nào highly available và least operational overhead?",
    "options": [
      "Triển khai NAT gateway tại mỗi AZ và trỏ route private subnet ra NAT gateway cùng AZ",
      "Gán Elastic IP cho từng instance để chúng tự ra Internet",
      "Triển khai một NAT instance EC2 tự quản tại một AZ duy nhất",
      "Dùng Internet gateway và đặt instance vào public subnet"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "NAT gateway là managed, HA trong AZ; đặt một NAT gateway mỗi AZ tránh single point of failure và phí cross-AZ.\n✓ NAT gateway mỗi AZ — đúng, HA và ít vận hành nhất (managed).\n✗ Elastic IP cho từng instance — biến instance thành public, nhận được kết nối từ Internet, vi phạm yêu cầu.\n✗ NAT instance một AZ — phải tự vá/scale, single point of failure, nhiều vận hành.\n✗ Public subnet + IGW — phơi bày instance ra Internet.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-010",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Các EC2 private cần gọi AWS Systems Manager, Secrets Manager và KMS API nhưng VPC không có NAT gateway hay Internet gateway và phải giữ traffic trong mạng AWS. Giải pháp nào đáp ứng?",
    "options": [
      "Tạo Interface VPC endpoints (PrivateLink) cho từng service đó",
      "Tạo một Gateway VPC endpoint chung cho cả ba service",
      "Thêm NAT gateway để instance gọi public API endpoints",
      "Bật VPC peering tới VPC dịch vụ của AWS"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Các API như SSM/Secrets Manager/KMS chỉ hỗ trợ Interface endpoint (PrivateLink), giữ traffic riêng tư qua ENI trong VPC.\n✓ Interface VPC endpoints — đúng, PrivateLink cho các API service này, không cần Internet.\n✗ Gateway endpoint chung — gateway endpoint chỉ hỗ trợ S3 và DynamoDB.\n✗ NAT gateway — đưa traffic ra Internet, trái yêu cầu giữ trong mạng AWS.\n✗ VPC peering tới VPC AWS — không phải cách truy cập các API service này.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-011",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một tổ chức cần kiểm soát egress: cho phép EC2 chỉ gọi ra các domain được allowlist (vd *.example.com) và chặn mọi domain khác, áp dụng tập trung ở biên VPC với khả năng inspect TLS SNI. Giải pháp nào phù hợp nhất?",
    "options": [
      "AWS Network Firewall với stateful rule group lọc theo domain/SNI",
      "Security group outbound rule liệt kê domain được phép",
      "NACL outbound chặn theo domain name",
      "NAT gateway với danh sách domain cho phép cấu hình sẵn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Network Firewall hỗ trợ stateful domain filtering (HTTP host/TLS SNI) ở cấp VPC để kiểm soát egress tập trung.\n✓ Network Firewall domain/SNI filtering — đúng, lọc egress theo domain tập trung.\n✗ Security group theo domain — security group chỉ chấp nhận IP/CIDR/port, không phải domain.\n✗ NACL theo domain — NACL cũng chỉ làm việc với IP/port.\n✗ NAT gateway — không có chức năng lọc domain allowlist.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-012",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một web app cần truy cập tạm thời vào S3 và DynamoDB từ người dùng đã đăng nhập qua Cognito. Kiến trúc nào cấp quyền AWS theo nguyên tắc least privilege mà không nhúng AWS credential dài hạn vào client?",
    "options": [
      "Cognito identity pools đổi token lấy temporary IAM credentials qua STS gắn IAM role",
      "Tạo một IAM access key chung nhúng vào ứng dụng client",
      "Dùng API key của API Gateway thay cho IAM credentials",
      "Cấp cho mỗi user một IAM user với access key riêng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cognito identity pools đổi token (từ user pool/IdP) lấy temporary credentials qua STS với IAM role có quyền hạn chế.\n✓ Cognito identity pools + STS temporary credentials — đúng, không nhúng credential dài hạn, least privilege qua role.\n✗ Access key chung nhúng client — credential dài hạn lộ ra client, rất rủi ro.\n✗ API key của API Gateway — chỉ để định danh/throttle, không cấp quyền truy cập S3/DynamoDB.\n✗ IAM user mỗi end user — không scale và vẫn dùng credential dài hạn.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-013",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một subnet được coi là 'public' khi nào trong VPC design?",
    "options": [
      "Khi route table của subnet có route 0.0.0.0/0 trỏ tới Internet gateway",
      "Khi subnet có NAT gateway trong cùng AZ",
      "Khi instance trong subnet có private IP thuộc dải public",
      "Khi NACL của subnet cho phép inbound từ 0.0.0.0/0"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Subnet là public khi route table của nó có default route ra Internet gateway.\n✓ Route 0.0.0.0/0 tới IGW — đúng định nghĩa public subnet.\n✗ Có NAT gateway cùng AZ — NAT phục vụ egress cho private subnet, không làm subnet thành public.\n✗ Private IP thuộc dải public — IP nội bộ không quyết định tính public của subnet.\n✗ NACL cho inbound 0.0.0.0/0 — chỉ là rule lọc, không tạo đường ra Internet.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-014",
    "courseId": "SAA-C03",
    "lesson": "ch3-02-network-security",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một Lambda function cần đọc secret từ Secrets Manager và cần truy cập riêng tư không qua Internet. Lambda đã được cấu hình chạy trong VPC (private subnet). Cần thêm gì để Lambda lấy secret thành công mà không cần NAT?",
    "options": [
      "Tạo Interface VPC endpoint cho Secrets Manager trong VPC và cho phép SG của Lambda tới endpoint",
      "Tạo Gateway VPC endpoint cho Secrets Manager",
      "Gắn Internet gateway vào private subnet của Lambda",
      "Bật public IP cho Lambda ENI"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lambda trong VPC không có route Internet sẽ cần Interface endpoint (PrivateLink) cho Secrets Manager để gọi API riêng tư.\n✓ Interface endpoint cho Secrets Manager + SG cho phép — đúng, truy cập riêng tư không cần NAT.\n✗ Gateway endpoint cho Secrets Manager — gateway endpoint chỉ hỗ trợ S3/DynamoDB.\n✗ IGW vào private subnet — biến subnet thành public và không phải cách Lambda truy cập riêng tư API.\n✗ Public IP cho Lambda ENI — Lambda ENI trong VPC không hỗ trợ public IP theo cách này.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-015",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần mã hoá khối lượng lớn dữ liệu (hàng terabyte) tại client trước khi gửi lên S3. Để tránh gọi KMS cho từng object nhỏ và giảm chi phí API, kiến trúc nào áp dụng đúng nguyên lý envelope encryption?",
    "options": [
      "Gọi KMS GenerateDataKey để lấy data key, dùng plaintext data key mã hoá dữ liệu local, lưu encrypted data key cùng object",
      "Gửi toàn bộ terabyte dữ liệu trực tiếp tới KMS Encrypt API để mã hoá",
      "Dùng một KMS key riêng cho mỗi object và gọi Encrypt cho từng file",
      "Lưu plaintext data key trong S3 metadata để giải mã sau này"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Envelope encryption: KMS chỉ sinh/mã hoá data key, còn dữ liệu lớn được mã hoá local bằng data key, giảm tải KMS.\n✓ GenerateDataKey + mã hoá local: dùng data key để mã hoá khối lượng lớn, chỉ lưu encrypted data key, đúng envelope encryption và tiết kiệm gọi KMS.\n✗ Gửi terabyte tới KMS Encrypt: KMS giới hạn 4KB mỗi request, không thể mã hoá file lớn trực tiếp.\n✗ KMS key riêng mỗi object: tốn kém và không cần thiết, không phải nguyên lý envelope.\n✗ Lưu plaintext data key: phá vỡ bảo mật vì ai đọc được object cũng giải mã được.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-016",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một S3 bucket vô tình bị cấu hình cho phép public read và đã làm lộ dữ liệu. Solutions Architect muốn ngăn chặn ở mức tổ chức để không bucket nào trong account có thể public, bất kể ACL hay bucket policy được đặt sai. Cách nào đảm bảo tốt nhất?",
    "options": [
      "Bật S3 Block Public Access ở cấp account",
      "Thêm explicit deny vào từng bucket policy",
      "Bật S3 Versioning trên toàn bộ bucket",
      "Dùng Amazon Macie để phát hiện bucket public và cảnh báo"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Block Public Access ở cấp account override mọi ACL/policy cho phép public, ngăn chặn tập trung và chắc chắn.\n✓ Account-level Block Public Access: chặn mọi cấu hình public ở mọi bucket hiện tại và tương lai, bất kể ACL/policy.\n✗ Explicit deny từng bucket: phải làm thủ công cho mỗi bucket và dễ bỏ sót bucket mới.\n✗ S3 Versioning: chống ghi đè/xoá, không liên quan tới public access.\n✗ Macie: phát hiện và cảnh báo nhưng không chủ động chặn public access.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-017",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một tổ chức cần bản sao dữ liệu S3 ở một region khác để đáp ứng yêu cầu compliance về data residency và disaster recovery. Dữ liệu được mã hoá bằng SSE-KMS với customer managed key. Cấu hình nào đảm bảo cross-region replication hoạt động đúng?",
    "options": [
      "Bật S3 Cross-Region Replication và cấu hình replica dùng một KMS key ở destination region",
      "Bật S3 Cross-Region Replication; KMS key ở source region tự động dùng được ở destination",
      "Dùng S3 Same-Region Replication rồi copy thủ công sang region khác",
      "Tắt mã hoá ở destination bucket để replication không bị lỗi key"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "KMS key mang tính region-specific, nên replica ở destination cần một KMS key của chính region đó để mã hoá lại.\n✓ CRR với KMS key ở destination region: bắt buộc vì single-Region KMS key không dùng được cross-region; cấu hình replica key cho phép re-encrypt object tại destination.\n✗ Dùng lại source key ở destination: không hợp lệ vì single-Region KMS key bị giới hạn theo region.\n✗ Same-Region Replication + copy thủ công: tăng overhead và không phải giải pháp CRR tự động.\n✗ Tắt mã hoá ở destination: vi phạm yêu cầu compliance encryption at rest.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-018",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một team muốn đảm bảo dữ liệu trong Amazon EBS volume gắn vào EC2 instance được encrypted at rest với least operational overhead. Cách nào đơn giản nhất?",
    "options": [
      "Bật EBS encryption khi tạo volume, dùng KMS key để mã hoá",
      "Tự cài đĩa mã hoá phần mềm bên trong OS cho mỗi instance",
      "Mã hoá từng file trong ứng dụng trước khi ghi xuống đĩa",
      "Dùng instance store và mã hoá thủ công bằng dm-crypt"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EBS encryption tích hợp với KMS, mã hoá transparent at rest và in transit giữa instance và volume, gần như không cần thao tác.\n✓ EBS encryption với KMS: bật một lần khi tạo volume, mã hoá/giải mã transparent, least operational overhead.\n✗ Đĩa mã hoá phần mềm trong OS: phải tự quản lý cấu hình và key trên từng instance.\n✗ Mã hoá từng file trong app: thay đổi mã ứng dụng và tự quản lý key, nhiều overhead.\n✗ Instance store + dm-crypt: dữ liệu ephemeral và phải tự vận hành mã hoá, phức tạp.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-019",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty media phân phối nội dung qua CloudFront và cần đảm bảo encryption in transit từ viewer đến edge và từ edge đến origin (S3). Họ muốn least operational overhead cho certificate. Cấu hình nào đúng?",
    "options": [
      "Dùng ACM certificate (trong us-east-1) cho CloudFront, đặt Viewer Protocol Policy là Redirect HTTP to HTTPS và origin protocol là HTTPS",
      "Dùng self-signed certificate trên CloudFront và cho phép HTTP cho viewer",
      "Để CloudFront chỉ phục vụ HTTP để giảm độ trễ, mã hoá ở tầng ứng dụng",
      "Mua certificate third-party và cài thủ công trên từng edge location"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ACM certificate (us-east-1 cho CloudFront) cùng Redirect HTTP to HTTPS và HTTPS tới origin đảm bảo end-to-end TLS, auto-renew.\n✓ ACM + Redirect HTTPS + HTTPS origin: bảo đảm encryption in transit cả viewer-edge và edge-origin, certificate tự gia hạn.\n✗ Self-signed + cho phép HTTP: không an toàn và viewer không được bảo vệ TLS.\n✗ Chỉ HTTP: vi phạm yêu cầu encryption in transit.\n✗ Third-party cài thủ công trên edge: không khả thi và nhiều overhead; CloudFront dùng ACM.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-020",
    "courseId": "SAA-C03",
    "lesson": "ch3-03-data-protection",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng analytics cần chia sẻ dataset đã được phân loại nhạy cảm chỉ với một số AWS account đối tác cụ thể, dữ liệu mã hoá bằng customer managed KMS key. Để đối tác đọc được object, cần cấu hình gì ngoài bucket policy cho phép?",
    "options": [
      "Cập nhật KMS key policy để cấp quyền kms:Decrypt cho các account đối tác",
      "Bật S3 Block Public Access để dữ liệu tự động chia sẻ an toàn",
      "Đổi sang SSE-S3 để bỏ qua yêu cầu quyền KMS",
      "Bật cross-region replication tới bucket của đối tác"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với SSE-KMS, đối tác cần quyền kms:Decrypt trên key; do đó key policy phải cấp quyền cho các account đó.\n✓ Cập nhật KMS key policy cấp kms:Decrypt cho account đối tác: bắt buộc để họ giải mã object ngoài quyền S3.\n✗ Block Public Access: ngăn public, không cấp quyền chia sẻ cho account cụ thể.\n✗ Đổi SSE-S3: thay đổi mô hình bảo mật và mất kiểm soát key, không đúng yêu cầu.\n✗ Cross-region replication: sao chép dữ liệu chứ không giải quyết quyền giải mã cho đối tác.",
    "domain": 1,
    "mock": 3
  },
  {
    "id": "saa-m3-021",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một kiến trúc sư đang thiết kế Route 53 health checks cho một ứng dụng failover multi-Region. Những phát biểu nào ĐÚNG về Route 53 health checks? (Chọn 2)",
    "options": [
      "Route 53 health check có thể giám sát một endpoint qua HTTP/HTTPS/TCP và đánh dấu không khỏe mạnh khi vượt ngưỡng lỗi",
      "Calculated health check có thể kết hợp trạng thái của nhiều health check con để quyết định trạng thái tổng",
      "Route 53 health check chỉ hoạt động với các endpoint nằm trong AWS, không hỗ trợ endpoint on-premises",
      "Health check phải được gắn vào một CloudFront distribution thì mới có hiệu lực",
      "Route 53 chỉ failover khi toàn bộ Region của AWS bị down, không phản ứng với lỗi endpoint đơn lẻ"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Route 53 health checks giám sát endpoint qua nhiều giao thức và có thể tổng hợp qua calculated health check.\n✓ Health check hỗ trợ HTTP/HTTPS/TCP với failure threshold để xác định trạng thái.\n✓ Calculated (parent) health check kết hợp nhiều child health check.\n✗ Health check hỗ trợ cả endpoint ngoài AWS (on-premises có IP công khai).\n✗ Không bắt buộc gắn vào CloudFront; gắn vào DNS record.\n✗ Failover phản ứng với lỗi endpoint, không cần cả Region down.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-022",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một consumer đọc message từ Amazon SQS queue và mất tới 8 phút để xử lý mỗi message. Hiện một số message bị xử lý nhiều lần vì worker khác nhận lại chúng trước khi worker đầu tiên hoàn tất. Cách least operational overhead để khắc phục là gì?",
    "options": [
      "Tăng visibility timeout của queue lên lớn hơn thời gian xử lý tối đa",
      "Chuyển sang FIFO queue để loại bỏ trùng lặp",
      "Giảm số lượng consumer xuống còn một worker duy nhất",
      "Bật long polling với WaitTimeSeconds là 20"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Message bị nhận lại do visibility timeout ngắn hơn thời gian xử lý; tăng timeout là cách trực tiếp và đơn giản nhất.\n✓ Tăng visibility timeout > thời gian xử lý — đúng, message ẩn đủ lâu để worker hoàn tất trước khi worker khác thấy lại.\n✗ Chuyển FIFO — FIFO chống trùng khi gửi, nhưng vấn đề ở đây là timeout xử lý, không phải duplicate khi produce; còn giới hạn throughput.\n✗ Giảm còn một worker — làm mất khả năng scale và không giải quyết gốc rễ.\n✗ Long polling — chỉ giảm empty receive, không liên quan tới việc message bị reprocess.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-023",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn route các event giữa nhiều SaaS application và AWS service dựa trên nội dung event, với khả năng lọc và biến đổi event, mà không phải tự viết code routing. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon EventBridge với rule và event pattern",
      "Amazon SQS với nhiều queue lọc thủ công",
      "Amazon SNS với message filtering policy đơn giản",
      "AWS Step Functions điều phối luồng giữa các service"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge là event bus serverless hỗ trợ tích hợp SaaS partner và content-based routing qua rule/event pattern.\n✓ EventBridge với rule/event pattern — đúng, route theo nội dung, tích hợp sẵn SaaS partner, lọc và biến đổi event, ít code.\n✗ SQS lọc thủ công — SQS là hàng đợi point-to-point, không có routing theo nội dung và không tích hợp SaaS.\n✗ SNS filtering — lọc theo message attribute đơn giản, không có schema registry/SaaS integration mạnh như EventBridge.\n✗ Step Functions — điều phối workflow trạng thái, không phải event router giữa nhiều nguồn SaaS.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-024",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần route request tới các target group khác nhau dựa trên đường dẫn URL (ví dụ /api tới một nhóm, /images tới nhóm khác) và hostname. Loại load balancer nào phù hợp?",
    "options": [
      "Application Load Balancer (ALB)",
      "Network Load Balancer (NLB)",
      "Gateway Load Balancer (GWLB)",
      "AWS Global Accelerator"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ALB hỗ trợ content-based routing theo path và host header ở Layer 7.\n✓ ALB — đúng, định tuyến theo URL path và hostname, lý tưởng cho microservices HTTP/HTTPS.\n✗ NLB — Layer 4, không hiểu HTTP path/host nên không route theo nội dung được.\n✗ GWLB — dùng cho appliance bảo mật, không route theo URL path.\n✗ Global Accelerator — cải thiện routing toàn cầu qua AWS backbone, không phải path-based routing trong một region.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-025",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty đang chuyển một ứng dụng monolith sang microservices chạy trong container. Họ không muốn quản lý EC2 instance hay cluster của control plane container, chỉ muốn deploy container và để AWS lo phần hạ tầng. Lựa chọn nào ít operational overhead nhất?",
    "options": [
      "Amazon ECS với AWS Fargate launch type",
      "Amazon ECS với EC2 launch type",
      "Amazon EKS với self-managed node group EC2",
      "Chạy container trực tiếp trên EC2 với Docker tự cài"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fargate là compute serverless cho container, loại bỏ việc quản lý EC2 và scaling node.\n✓ ECS + Fargate — đúng, không quản lý server/node, chỉ định nghĩa task, AWS lo hạ tầng, ít vận hành nhất.\n✗ ECS + EC2 launch type — vẫn phải quản lý và patch các EC2 container instance.\n✗ EKS + self-managed node — phải tự quản lý và vận hành node group EC2.\n✗ Docker tự cài trên EC2 — vận hành nhiều nhất, không có orchestration được quản lý.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-026",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một pipeline cần ingest và xử lý real-time hàng trăm nghìn clickstream event mỗi giây, cho phép nhiều consumer độc lập đọc lại cùng dữ liệu trong cửa sổ thời gian, và xử lý theo thứ tự trong từng partition. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon Kinesis Data Streams",
      "Amazon SQS standard queue",
      "Amazon SNS topic với nhiều subscriber",
      "Amazon SQS FIFO queue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kinesis Data Streams được thiết kế cho ingestion real-time throughput cao, cho phép nhiều consumer đọc lại dữ liệu trong retention window và giữ thứ tự theo partition key (shard).\n✓ Kinesis Data Streams — đúng, throughput cao, replay được, nhiều consumer độc lập, ordering theo shard.\n✗ SQS standard — message bị xóa sau khi consume, không replay được, không nhiều consumer đọc lại cùng message.\n✗ SNS — fan-out push, không lưu trữ để replay theo cửa sổ thời gian.\n✗ SQS FIFO — giữ thứ tự nhưng throughput thấp hơn nhiều và không hỗ trợ replay/nhiều consumer đọc lại.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-027",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty muốn lập lịch chạy một tác vụ làm sạch dữ liệu mỗi ngày lúc 2 giờ sáng bằng cách kích hoạt một Lambda function, theo cách serverless và ít vận hành. Dịch vụ nào phù hợp nhất để kích hoạt theo lịch?",
    "options": [
      "Amazon EventBridge Scheduler (rule theo cron)",
      "Một EC2 instance chạy cron job gọi Lambda",
      "Amazon SQS với delay queue đặt 24 giờ",
      "AWS Step Functions polling liên tục cho tới 2 giờ sáng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EventBridge Scheduler kích hoạt target theo biểu thức cron/rate, serverless và không cần hạ tầng quản lý.\n✓ EventBridge Scheduler theo cron — đúng, serverless, kích hoạt Lambda đúng lịch, ít vận hành nhất.\n✗ EC2 chạy cron — phải duy trì và patch một instance chỉ để chạy lịch, vận hành nhiều.\n✗ SQS delay queue 24 giờ — delay tối đa của SQS là 15 phút, không dùng cho lịch hằng ngày được.\n✗ Step Functions polling — lãng phí và phức tạp, không phải công cụ lập lịch.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-028",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty chạy microservices trên Amazon EKS và cần một load balancer phân phối lưu lượng HTTP tới các pod, hỗ trợ định tuyến theo path và tích hợp tự động với Kubernetes Ingress. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Application Load Balancer (qua AWS Load Balancer Controller)",
      "Network Load Balancer cho lưu lượng HTTP nội bộ",
      "Classic Load Balancer cấu hình thủ công",
      "Gateway Load Balancer đặt trước cluster"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ALB qua AWS Load Balancer Controller tích hợp với Kubernetes Ingress, định tuyến HTTP theo path tới các pod.\n✓ ALB qua Load Balancer Controller — đúng, Layer 7, path-based routing, tích hợp Ingress chuẩn cho EKS.\n✗ NLB cho HTTP — NLB là Layer 4, không định tuyến theo path; thường dùng cho Service type LoadBalancer L4.\n✗ CLB thủ công — lỗi thời, không tích hợp Ingress hiện đại tốt.\n✗ GWLB — dành cho appliance bảo mật, không phải ingress ứng dụng.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-029",
    "courseId": "SAA-C03",
    "lesson": "resilient-01-decoupling",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống IoT nhận hàng triệu message nhỏ mỗi phút từ thiết bị, cần buffer để load leveling trước khi xử lý bằng một fleet worker có thể scale, với chi phí thấp và không yêu cầu thứ tự nghiêm ngặt. Lựa chọn decoupling nào tối ưu nhất về chi phí và đơn giản?",
    "options": [
      "Amazon SQS standard queue làm buffer, worker tier scale theo độ sâu queue",
      "Amazon SQS FIFO queue để đảm bảo thứ tự tuyệt đối",
      "Amazon Kinesis Data Streams với hàng nghìn shard provisioned",
      "Kết nối thiết bị trực tiếp tới worker EC2 qua TCP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Không cần thứ tự nghiêm ngặt nên SQS standard là lựa chọn rẻ và đơn giản nhất để buffer và load-level, kết hợp worker scale theo độ sâu queue.\n✓ SQS standard + worker scale theo queue depth — đúng, throughput gần như không giới hạn, chi phí thấp, đơn giản, đúng nhu cầu.\n✗ FIFO queue — đắt hơn và giới hạn throughput hơn, không cần vì không yêu cầu thứ tự.\n✗ Kinesis nghìn shard provisioned — phức tạp và tốn kém hơn cho nhu cầu buffer đơn giản không cần replay.\n✗ Kết nối trực tiếp TCP tới worker — coupling chặt, không có buffer, mất message khi worker quá tải.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-030",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng tài chính yêu cầu RPO gần bằng 0 và RTO chỉ vài phút cho database quan hệ, với khả năng đọc với độ trễ thấp ở nhiều Region và khả năng promote một Region thứ cấp lên primary trong dưới 1 phút khi xảy ra thảm họa Region. Giải pháp nào phù hợp nhất?",
    "options": [
      "Amazon Aurora Global Database với một primary Region và các secondary Region read-only",
      "Amazon RDS Multi-AZ deployment trong một Region duy nhất",
      "Amazon RDS cross-Region Read Replicas được promote thủ công khi cần",
      "Sao chép EBS snapshots của database sang Region khác mỗi 15 phút"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora Global Database replicate với độ trễ thường dưới 1 giây và cho phép promote secondary Region trong khoảng 1 phút.\n✓ Aurora Global Database: replication storage-level rất nhanh, RPO gần 0, RTO thấp, đọc low-latency ở secondary Region.\n✗ RDS Multi-AZ chỉ bảo vệ trong một Region, không chống thảm họa cấp Region.\n✗ RDS cross-Region Read Replica có độ trễ replication cao hơn và promote chậm hơn Aurora Global.\n✗ EBS snapshot mỗi 15 phút cho RPO tới 15 phút và RTO cao, không đạt yêu cầu.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-031",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty cần triển khai trang bảo trì (maintenance page) lưu trên S3 để hiển thị cho người dùng khi ứng dụng chính ở một Region không khỏe mạnh. Họ muốn Route 53 tự động chuyển traffic từ ứng dụng chính sang trang bảo trì. Cấu hình routing nào phù hợp nhất?",
    "options": [
      "Failover routing với primary record (ALB) gắn health check và secondary record trỏ tới S3 static website",
      "Weighted routing chia 90% cho ALB và 10% cho S3 static website",
      "Multivalue answer routing trả về cả ALB và S3 endpoint",
      "Latency-based routing giữa ALB và S3 static website"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Failover routing được thiết kế đúng cho mô hình active-passive primary/secondary.\n✓ Failover routing với health check: khi primary ALB không khỏe mạnh, Route 53 trả về secondary trỏ S3, hiển thị trang bảo trì.\n✗ Weighted vẫn gửi 10% traffic sang S3 ngay cả khi ALB khỏe mạnh, không đúng mục tiêu.\n✗ Multivalue answer trả nhiều giá trị song song, không phải mô hình failover passive.\n✗ Latency-based không xét trạng thái active-passive.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-032",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống thương mại điện tử dùng Warm Standby ở Region thứ cấp. Trong DR test, đội vận hành nhận thấy khi failover, ứng dụng cần xử lý lưu lượng production đầy đủ nhưng Region thứ cấp chỉ chạy số lượng instance tối thiểu. Cách nào giúp Region thứ cấp đáp ứng tải production nhanh nhất khi failover, đồng thời giữ chi phí thấp khi chưa failover?",
    "options": [
      "Giữ Auto Scaling group ở Region thứ cấp với số instance tối thiểu và cấu hình scaling policy để mở rộng nhanh khi traffic chuyển tới",
      "Chạy sẵn toàn bộ số lượng instance production ở Region thứ cấp 24/7",
      "Tắt hoàn toàn Region thứ cấp và chỉ tạo instance khi xảy ra thảm họa",
      "Chuyển sang Multi-AZ trong một Region duy nhất thay vì dùng Region thứ cấp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Warm Standby duy trì bản thu nhỏ luôn chạy và mở rộng (scale out) khi failover, cân bằng tốc độ và chi phí.\n✓ ASG tối thiểu + scaling policy: chạy nhỏ để tiết kiệm, tự mở rộng nhanh đáp ứng tải production khi failover.\n✗ Chạy full 24/7 biến nó thành active-active/hot, chi phí cao không cần thiết.\n✗ Tắt hoàn toàn là Backup and Restore/Pilot Light, RTO cao hơn, mâu thuẫn với Warm Standby.\n✗ Multi-AZ một Region không bảo vệ thảm họa cấp Region.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-033",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ngân hàng triển khai chiến lược Pilot Light. Database primary ở Region chính được sao chép liên tục sang Region dự phòng, nhưng application/web tier ở Region dự phòng KHÔNG chạy thường xuyên. Khi xảy ra thảm họa, điều gì PHẢI xảy ra để khôi phục dịch vụ, và đây là đặc trưng nào của Pilot Light?",
    "options": [
      "Khởi chạy (provision và scale up) application/web tier từ AMI/template ở Region dự phòng rồi điều hướng traffic; đặc trưng là core data luôn chạy còn app tier được dựng khi cần",
      "Không cần làm gì vì toàn bộ tier đã chạy sẵn; đặc trưng là active-active",
      "Phục hồi toàn bộ từ snapshot kể cả database; đặc trưng là Backup and Restore",
      "Chỉ cần đổi DNS vì bản thu nhỏ của toàn hệ thống đã chạy liên tục; đặc trưng là Warm Standby"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pilot Light giữ phần lõi dữ liệu luôn được replicate/chạy, còn app tier chỉ được dựng khi cần.\n✓ Khởi chạy app tier từ template + điều hướng traffic: đúng bản chất Pilot Light với data core luôn sẵn sàng.\n✗ Không phải active-active vì app tier không chạy sẵn đầy đủ.\n✗ Không phải Backup and Restore vì database đã được replicate liên tục, không khôi phục từ snapshot.\n✗ Không phải Warm Standby vì Warm Standby chạy bản thu nhỏ của toàn hệ thống liên tục, còn Pilot Light app tier thường tắt.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-034",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng phân tích chạy ở us-east-1 và đọc dữ liệu từ một Aurora MySQL cluster. Đội phân tích ở châu Âu cần đọc cùng dữ liệu với độ trễ thấp mà không làm tăng tải lên writer ở us-east-1, và yêu cầu sẵn sàng promote châu Âu thành primary khi cần DR. Giải pháp nào phù hợp nhất?",
    "options": [
      "Aurora Global Database với secondary Region ở châu Âu phục vụ đọc low-latency",
      "Tạo nhiều Aurora Replicas trong us-east-1",
      "Bật S3 Cross-Region Replication cho các export dữ liệu",
      "Dùng DynamoDB Global Tables để nhân bản dữ liệu phân tích"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora Global Database cung cấp secondary Region đọc low-latency và khả năng promote cho DR.\n✓ Aurora Global Database: secondary Region châu Âu phục vụ đọc nhanh, không tải lên writer chính, và promote được khi DR.\n✗ Aurora Replicas trong us-east-1 không giảm độ trễ cho người dùng châu Âu.\n✗ S3 CRR cho export không cung cấp truy vấn quan hệ low-latency theo thời gian thực.\n✗ DynamoDB Global Tables đổi mô hình dữ liệu sang NoSQL, không phù hợp truy vấn quan hệ hiện có.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-035",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống xử lý đơn hàng dùng một SQS queue giữa web tier và worker tier chạy trên EC2 trong một Auto Scaling group đa AZ. Trong giờ cao điểm, worker không theo kịp và một số đơn bị mất khi instance bị terminate giữa chừng. Thay đổi nào cải thiện fault tolerance của quá trình xử lý đơn tốt nhất?",
    "options": [
      "Đảm bảo worker chỉ xóa message khỏi queue sau khi xử lý thành công và cấu hình visibility timeout phù hợp để message được xử lý lại nếu worker lỗi",
      "Chuyển SQS sang một database RDS Multi-AZ để lưu đơn hàng",
      "Tăng instance type của worker để xử lý nhanh hơn",
      "Bật cross-zone load balancing trên ALB của web tier"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SQS đảm bảo không mất message nếu worker xóa message chỉ sau khi xử lý xong và visibility timeout đủ dài.\n✓ Xóa message sau xử lý + visibility timeout đúng: nếu worker chết giữa chừng, message trở lại queue và được xử lý lại, không mất đơn.\n✗ Thay SQS bằng RDS bỏ đi decoupling và không tự nhiên giải quyết retry.\n✗ Tăng instance type giảm tồn đọng nhưng không ngăn mất đơn khi instance bị terminate.\n✗ Cross-zone LB cải thiện cân bằng web tier, không liên quan tới mất message ở worker.",
    "domain": 2,
    "mock": 3
  },
  {
    "id": "saa-m3-036",
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng chạy active-active trên hai Region với DynamoDB Global Tables. Trong một sự cố mạng, cùng một item được cập nhật gần như đồng thời ở cả hai Region với hai giá trị khác nhau. Kết quả cuối cùng được xác định như thế nào và đây là cân nhắc thiết kế nào?",
    "options": [
      "Global Tables áp dụng last-writer-wins dựa trên timestamp; ứng dụng phải thiết kế chấp nhận eventual consistency cross-Region và khả năng mất một bản ghi xung đột",
      "Global Tables khóa item trên toàn bộ Region để đảm bảo strong consistency cross-Region, không có xung đột",
      "Global Tables từ chối cả hai ghi và trả lỗi cho ứng dụng",
      "Global Tables gộp (merge) hai giá trị thành một bản ghi kết hợp tự động"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DynamoDB Global Tables giải quyết xung đột bằng last-writer-wins và chỉ đảm bảo eventual consistency cross-Region.\n✓ Last-writer-wins theo timestamp + eventual consistency: ứng dụng phải chấp nhận một bản ghi xung đột có thể bị ghi đè.\n✗ Global Tables không cung cấp strong consistency cross-Region hay khóa toàn cục.\n✗ Nó không từ chối cả hai ghi.\n✗ Nó không tự merge hai giá trị; chỉ giữ giá trị ghi sau cùng.",
    "domain": 2,
    "mock": 3
  },
  {
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty chạy ứng dụng web quan trọng trên các EC2 instances phía sau một Application Load Balancer trong một Auto Scaling group, trải rộng trên hai Availability Zones tại Region us-east-1. Dữ liệu lưu trong Amazon RDS for PostgreSQL Single-AZ. Trong một sự cố mất điện AZ gần đây, cơ sở dữ liệu không thể truy cập trong nhiều giờ dù tầng web vẫn hoạt động. Yêu cầu RTO của doanh nghiệp là dưới 5 phút và không được thay đổi mã ứng dụng. Solutions Architect nên làm gì để cải thiện tính sẵn sàng của tầng cơ sở dữ liệu?",
    "options": [
      "Chuyển đổi RDS instance sang triển khai Multi-AZ để AWS tự động failover sang standby ở AZ khác khi có sự cố",
      "Tạo một read replica của RDS ở AZ thứ hai và cấu hình ứng dụng tự chuyển sang read replica khi primary lỗi",
      "Bật automated backups và snapshot mỗi 5 phút, khôi phục thủ công khi xảy ra sự cố AZ",
      "Triển khai một RDS instance dự phòng ở Region khác và dùng Route 53 failover routing để chuyển sang đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu RTO < 5 phút, không đổi mã ứng dụng, và chống lỗi cấp AZ cho tầng database.\n✓ Multi-AZ tự động failover sang standby synchronous ở AZ khác trong vài phút, DNS endpoint giữ nguyên nên không cần đổi mã.\n✗ Read replica là asynchronous, không tự failover và việc chuyển kết nối sang replica đòi hỏi sửa logic ứng dụng, có rủi ro mất dữ liệu.\n✗ Khôi phục thủ công từ snapshot không thể đạt RTO 5 phút và là quy trình thủ công dễ lỗi.\n✗ Standby cross-Region với Route 53 là giải pháp DR cho lỗi cấp Region, quá mức cần thiết và phức tạp cho lỗi AZ.",
    "domain": 2,
    "mock": 3,
    "id": "saa-m3-037"
  },
  {
    "id": "saa-m3-038",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một database Aurora MySQL phục vụ ứng dụng read-heavy với lưu lượng đọc dao động mạnh theo thời gian trong ngày. Kiến trúc sư muốn vừa tự động scale dung lượng đọc theo nhu cầu vừa đảm bảo ứng dụng luôn kết nối tới một endpoint ổn định cho các truy vấn đọc. Nên áp dụng những giải pháp nào? (Chọn 2)",
    "options": [
      "Bật Aurora Auto Scaling cho Aurora Replicas dựa trên CPU hoặc số kết nối",
      "Cấu hình ứng dụng dùng Aurora reader endpoint để cân bằng tải đọc qua các replica",
      "Định tuyến mọi truy vấn đọc trực tiếp tới Aurora writer endpoint",
      "Tạo thủ công số Aurora Replica cố định tối đa và để chạy 24/7",
      "Dùng một instance endpoint duy nhất của một replica cụ thể cho tất cả truy vấn đọc"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Aurora Auto Scaling tự thêm/bớt replica theo tải, còn reader endpoint cung cấp một điểm kết nối ổn định tự cân bằng qua các replica đang có.\n✓ Aurora Auto Scaling tự điều chỉnh số replica theo nhu cầu đọc dao động — cost-effective và đàn hồi.\n✓ Reader endpoint là endpoint ổn định, tự load balance qua tất cả replica kể cả khi auto scaling thêm/bớt node.\n✗ Writer endpoint chỉ trỏ tới primary, dồn tải đọc vào instance ghi — phản tác dụng offload.\n✗ Chạy số replica tối đa cố định 24/7 lãng phí chi phí trong giờ thấp điểm.\n✗ Instance endpoint của một replica cụ thể không cân bằng tải và mất kết nối khi replica đó bị thay thế.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-039",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng web lưu hàng triệu ảnh trên Amazon S3. Người dùng trên toàn cầu phàn nàn việc upload ảnh từ các châu lục xa region của bucket rất chậm. Giải pháp nào cải thiện tốc độ upload với least operational overhead?",
    "options": [
      "Bật S3 Transfer Acceleration trên bucket để upload qua edge location của CloudFront",
      "Tạo bucket S3 ở mỗi region và dùng S3 Cross-Region Replication để đồng bộ",
      "Đặt một CloudFront distribution phía trước bucket và cho người dùng upload qua CloudFront",
      "Dùng AWS Global Accelerator để định tuyến traffic upload đến bucket"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Transfer Acceleration tận dụng mạng edge của CloudFront để tăng tốc upload xuyên lục địa chỉ bằng một thiết lập bật/tắt.\n✓ Transfer Acceleration định tuyến upload qua edge location gần người dùng rồi đi trên backbone AWS, least operational overhead.\n✗ Tạo bucket mỗi region kèm replication phức tạp và bản thân upload ban đầu vẫn phải đi xa.\n✗ CloudFront tối ưu cho phân phối (download/cache), không phải kênh tăng tốc upload trực tiếp như Transfer Acceleration.\n✗ Global Accelerator dùng cho endpoint như ALB/NLB/EC2, không hỗ trợ upload trực tiếp vào S3 bucket.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-040",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng .NET cũ chạy trên fleet EC2 Windows cần một shared file system hỗ trợ SMB, NTFS permissions và tích hợp Active Directory để nhiều instance cùng truy cập. Giải pháp managed nào phù hợp nhất?",
    "options": [
      "Amazon FSx for Windows File Server",
      "Amazon EFS mount qua NFS trên các instance Windows",
      "Amazon FSx for Lustre",
      "Một EC2 Windows tự cấu hình làm file server chia sẻ EBS volume"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FSx for Windows File Server là dịch vụ managed cung cấp SMB, NTFS và tích hợp AD đúng nhu cầu workload Windows.\n✓ FSx for Windows File Server hỗ trợ native SMB protocol, NTFS ACL và join Active Directory.\n✗ EFS chỉ hỗ trợ NFS, không phù hợp SMB/NTFS cho ứng dụng Windows.\n✗ FSx for Lustre dành cho HPC Linux, không cung cấp SMB cho Windows.\n✗ Tự dựng file server trên EC2 tăng operational overhead về vận hành, HA và backup.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-041",
    "courseId": "SAA-C03",
    "lesson": "ch2-02-storage-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một cụm máy học cần đọc dataset training khổng lồ từ S3 liên tục cho nhiều epoch. Yêu cầu throughput đọc cực cao chia sẻ giữa hàng trăm GPU instance, và sau khi train xong kết quả phải đồng bộ ngược về S3. Workload chỉ chạy theo đợt rồi xóa. Giải pháp tối ưu nhất?",
    "options": [
      "Amazon FSx for Lustre với S3 data repository association, dùng scratch file system",
      "Tải toàn bộ dataset xuống EBS gp3 trên mỗi GPU instance",
      "Mount S3 trực tiếp qua một gateway và đọc object từng lần",
      "Amazon EFS với Max I/O performance mode dùng chung cho cả cụm"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "FSx for Lustre scratch tích hợp S3 cho throughput đọc cực cao chia sẻ, đồng bộ kết quả ngược S3, và chi phí thấp cho workload tạm thời.\n✓ FSx for Lustre scratch kèm S3 repository association cung cấp throughput cao, lazy-load dataset và export kết quả về S3, phù hợp ML chạy theo đợt.\n✗ Tải dataset về EBS mỗi instance tốn dung lượng, không chia sẻ và lặp lại tốn kém với hàng trăm GPU.\n✗ Đọc trực tiếp từng object qua gateway không đạt throughput tổng hợp cần cho training nhiều epoch.\n✗ EFS Max I/O có latency cao hơn và throughput không sánh được với Lustre cho HPC/ML quy mô lớn.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-042",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một nhóm phát triển chạy workload Java backend trên EC2 với CPU sử dụng ổn định. Họ muốn giảm chi phí compute mà không phải viết lại ứng dụng phức tạp, và ứng dụng đã được biên dịch lại để hỗ trợ kiến trúc ARM. Lựa chọn nào giúp giảm chi phí và tăng hiệu năng/giá tốt nhất?",
    "options": [
      "Chuyển sang các EC2 instance dùng AWS Graviton (ví dụ họ m7g/c7g)",
      "Chuyển sang các EC2 instance họ m5 với nhiều vCPU hơn",
      "Bật EC2 Detailed Monitoring để tối ưu CPU",
      "Chuyển sang EC2 instance họ x2idn tối ưu bộ nhớ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Graviton (ARM) cho price/performance tốt hơn và ứng dụng đã hỗ trợ ARM nên chuyển sang là tối ưu.\n✓ Graviton instances (m7g/c7g) — đúng, ARM-based, hiệu năng/giá cao hơn, ứng dụng đã hỗ trợ ARM nên dễ chuyển.\n✗ m5 nhiều vCPU hơn — tăng chi phí mà không khai thác lợi thế giá của Graviton.\n✗ Detailed Monitoring — chỉ tăng độ chi tiết metric, không giảm chi phí compute.\n✗ x2idn tối ưu bộ nhớ — đắt và phù hợp workload nặng RAM, không phải mục tiêu price/performance ở đây.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-043",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một API serverless chạy trên Lambda phục vụ người dùng tương tác. Đội phát triển nhận thấy một số request đầu tiên sau thời gian không hoạt động có độ trễ cao do cold start. Họ cần đảm bảo một số lượng môi trường thực thi luôn được khởi tạo sẵn để giảm cold start, với least operational overhead. Giải pháp nào phù hợp nhất?",
    "options": [
      "Cấu hình Provisioned Concurrency cho function/alias",
      "Tăng memory của Lambda lên mức tối đa",
      "Tăng Reserved Concurrency cho function",
      "Đặt Lambda trong VPC để cải thiện thời gian khởi tạo"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Provisioned Concurrency giữ sẵn các execution environment đã khởi tạo, loại bỏ cold start cho lượng concurrency đã cấp.\n✓ Provisioned Concurrency — đúng, giữ môi trường sẵn sàng, loại bỏ cold start cho phần đã provision.\n✗ Tăng memory tối đa — có thể giảm nhẹ thời gian init nhưng không loại bỏ cold start và tốn chi phí.\n✗ Reserved Concurrency — chỉ giới hạn/đảm bảo số concurrency tối đa, không làm ấm sẵn môi trường.\n✗ Đặt trong VPC — thường làm init lâu hơn chứ không nhanh hơn.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-044",
    "courseId": "SAA-C03",
    "lesson": "ch2-01-compute-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một function Lambda gọi đồng thời rất nhiều và đôi khi làm cạn kiệt account concurrency, gây throttling cho các function khác trong cùng account. Đội kiến trúc muốn GIỚI HẠN số concurrency tối đa mà function 'gây ồn' này có thể dùng, để bảo vệ các function còn lại. Giải pháp nào đúng?",
    "options": [
      "Đặt Reserved Concurrency cho function gây ồn",
      "Đặt Provisioned Concurrency cho function gây ồn",
      "Tăng account-level concurrency limit qua support",
      "Bật DLQ (dead-letter queue) cho function gây ồn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Reserved Concurrency vừa đảm bảo vừa GIỚI HẠN concurrency tối đa của một function, ngăn nó chiếm hết pool chung của account.\n✓ Reserved Concurrency — đúng, đặt trần concurrency cho function đó nên không làm cạn pool chung.\n✗ Provisioned Concurrency — chỉ làm ấm môi trường sẵn, không đặt trần dùng tài nguyên.\n✗ Tăng account limit — chỉ tăng tổng quota, function ồn vẫn có thể chiếm hết.\n✗ DLQ — xử lý event thất bại, không liên quan giới hạn concurrency.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-045",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một ứng dụng thương mại điện tử chạy trên Amazon RDS for MySQL (Single-AZ). Trang dashboard báo cáo và các truy vấn analytics đọc nhiều dữ liệu đang làm CPU của database tăng cao, ảnh hưởng đến các giao dịch ghi của khách hàng. Lượng ghi vẫn ổn định, chỉ có lượng đọc tăng đột biến. Giải pháp nào giúp giảm tải đọc khỏi instance chính với LEAST operational overhead?",
    "options": [
      "Tạo một hoặc nhiều RDS Read Replicas và định tuyến các truy vấn báo cáo/analytics chỉ-đọc sang đó",
      "Bật Multi-AZ deployment để standby instance phục vụ các truy vấn đọc",
      "Tăng kích thước instance lên loại lớn hơn để xử lý cả đọc và ghi",
      "Chuyển toàn bộ database sang Amazon Redshift để xử lý truy vấn báo cáo"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Read Replicas tách tải đọc khỏi primary, lý tưởng cho báo cáo chỉ-đọc mà không ảnh hưởng giao dịch ghi.\n✓ Read Replicas phục vụ truy vấn đọc song song, giảm CPU primary, đúng use case offload read.\n✗ Standby của Multi-AZ KHÔNG phục vụ đọc — chỉ dùng cho failover, không giảm tải.\n✗ Tăng kích thước instance tốn kém hơn và vẫn dồn đọc/ghi vào một instance.\n✗ Migrate sang Redshift là thay đổi lớn, OLAP riêng, operational overhead cao cho nhu cầu chỉ offload read.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-046",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty cần lưu trữ và truy vấn dữ liệu quan hệ với throughput đọc cao, khả năng tự động phục hồi sau lỗi, và muốn database tự scale storage. Họ cần tương thích MySQL nhưng yêu cầu hiệu năng cao hơn RDS for MySQL tiêu chuẩn và khả năng có tới 15 read replica với độ trễ replication thấp. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Amazon Aurora MySQL-Compatible Edition",
      "Amazon RDS for MySQL với Multi-AZ và 5 read replica",
      "Amazon DynamoDB với MySQL compatibility layer",
      "Amazon Redshift với storage tự động mở rộng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Aurora cung cấp throughput cao gấp nhiều lần RDS MySQL, tới 15 read replica với độ trễ thấp, storage tự scale và self-healing.\n✓ Aurora MySQL hỗ trợ tới 15 low-latency read replicas, storage tự mở rộng, tương thích MySQL — khớp mọi yêu cầu.\n✗ RDS for MySQL chỉ tối đa 5 read replicas và độ trễ replication cao hơn Aurora.\n✗ DynamoDB là NoSQL key-value, không phải database quan hệ tương thích MySQL.\n✗ Redshift là kho dữ liệu OLAP, không phù hợp workload giao dịch quan hệ throughput cao.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-047",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một mạng xã hội cần lưu mối quan hệ giữa người dùng (bạn bè, theo dõi) và chạy các truy vấn duyệt nhiều bậc như 'bạn của bạn' hay đường nối ngắn nhất giữa hai người. Các truy vấn này liên kết sâu nhiều cấp. Database nào được tối ưu cho workload này?",
    "options": [
      "Amazon Neptune",
      "Amazon Aurora PostgreSQL với nhiều bảng join",
      "Amazon DynamoDB với adjacency list pattern",
      "Amazon Timestream"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Neptune là graph database được tối ưu riêng cho dữ liệu quan hệ liên kết cao và các truy vấn duyệt đồ thị nhiều bậc.\n✓ Neptune là managed graph database, xử lý hiệu quả truy vấn 'bạn của bạn' và đường đi ngắn nhất bằng Gremlin/SPARQL.\n✗ Aurora PostgreSQL có thể join nhưng truy vấn duyệt nhiều bậc đệ quy trở nên rất chậm và phức tạp khi độ sâu tăng.\n✗ DynamoDB adjacency list mô phỏng được graph nhưng truy vấn duyệt nhiều bậc rất khó và kém hiệu quả.\n✗ Timestream là time-series database, không phù hợp với dữ liệu quan hệ đồ thị.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-048",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty host static website (HTML, CSS, JS, ảnh) trên Amazon S3, phục vụ user toàn cầu. User ở châu Á và châu Âu phàn nàn trang load chậm vì bucket nằm ở us-east-1. Giải pháp nào cải thiện latency hiệu quả nhất với LEAST operational overhead?",
    "options": [
      "Tạo Amazon CloudFront distribution với S3 bucket làm origin, dùng OAC để bảo vệ origin",
      "Bật S3 Cross-Region Replication sang nhiều region và để user tự chọn region gần nhất",
      "Đặt Global Accelerator phía trước S3 bucket để định tuyến qua AWS backbone",
      "Chuyển sang Route 53 latency-based routing trỏ về cùng một S3 bucket ở us-east-1"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFront cache static content tại hàng trăm edge location gần user, giảm latency mà không cần vận hành nhiều bản sao.\n✓ CloudFront + S3 origin: cache static tại edge, OAC bảo mật origin, fully managed, ít overhead nhất.\n✗ Cross-Region Replication nhiều region: tốn storage, phức tạp, và user phải tự chọn region — không tự động tối ưu.\n✗ Global Accelerator: hoạt động ở L4 cho TCP/UDP và KHÔNG cache; static content nên dùng CDN.\n✗ Route 53 latency-based về cùng 1 bucket us-east-1: vẫn chỉ 1 origin ở US, không giảm khoảng cách vật lý.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-049",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức có 12 VPC trên nhiều account, cần kết nối mạng full-mesh để các VPC có thể giao tiếp với nhau và với mạng on-premises. Họ muốn tránh sự bùng nổ số lượng peering connection và quản lý routing tập trung. Giải pháp nào tốt nhất?",
    "options": [
      "AWS Transit Gateway làm hub trung tâm, chia sẻ qua Resource Access Manager (RAM)",
      "VPC peering full-mesh giữa tất cả 12 VPC",
      "AWS PrivateLink expose từng VPC như một endpoint service riêng",
      "Một VPN connection riêng giữa từng cặp VPC qua Site-to-Site VPN"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Transit Gateway là hub-and-spoke hỗ trợ transitive routing, scale tuyến tính thay vì bậc hai, và quản lý routing tập trung.\n✓ Transit Gateway + RAM: hub trung tâm, transitive routing, kết nối luôn on-prem, chia sẻ cross-account dễ dàng.\n✗ VPC peering full-mesh: 12 VPC cần 66 peering, không transitive, quản lý route bùng nổ — không scale.\n✗ PrivateLink: chỉ expose một service cụ thể một chiều, không phải kết nối mạng full-mesh hai chiều.\n✗ VPN giữa từng cặp VPC: cực kỳ phức tạp, tốn kém, không phải pattern kết nối nội bộ VPC.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-050",
    "courseId": "SAA-C03",
    "lesson": "ch2-04-network-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một SaaS provider muốn cho phép hàng trăm khách hàng (mỗi khách hàng một VPC ở account riêng) truy cập an toàn vào một dịch vụ nội bộ chạy sau NLB trong VPC của provider. Yêu cầu: traffic không đi qua internet, khách hàng không cần biết hay route tới IP/CIDR của provider, và không xảy ra xung đột CIDR. Giải pháp nào phù hợp nhất?",
    "options": [
      "AWS PrivateLink: tạo endpoint service trên NLB của provider, khách hàng tạo interface endpoint trong VPC của họ",
      "VPC peering giữa VPC của provider và từng VPC khách hàng",
      "Transit Gateway kết nối tất cả VPC khách hàng với VPC của provider",
      "Đặt dịch vụ sau ALB public và bảo vệ bằng security group theo IP khách hàng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "PrivateLink expose dịch vụ một chiều qua interface endpoint, không cần route hay biết IP của provider và tránh xung đột CIDR.\n✓ PrivateLink endpoint service + interface endpoint: traffic private qua ENI, khách hàng không cần route/IP provider, không lo CIDR overlap — đúng cho SaaS multi-tenant.\n✗ VPC peering: cần route tới CIDR của nhau, không transitive, dễ xung đột CIDR với hàng trăm khách hàng.\n✗ Transit Gateway: kết nối mạng đầy đủ hai chiều, lộ topology provider và vẫn có nguy cơ CIDR overlap.\n✗ ALB public + security group: traffic đi qua internet, vi phạm yêu cầu private.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-051",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nền tảng IoT nhận hàng triệu sự kiện mỗi giây từ cảm biến. Đội phân tích cần xử lý các sự kiện này theo thứ tự cho từng thiết bị (ordered per device), với độ trễ dưới một giây, và đồng thời cho phép nhiều consumer application khác nhau (real-time dashboard, anomaly detection) đọc lại cùng một luồng dữ liệu trong cửa sổ tối đa 7 ngày. Dịch vụ nào đáp ứng tốt nhất?",
    "options": [
      "Amazon Kinesis Data Streams với partition key theo deviceId, bật extended retention và Enhanced Fan-Out cho nhiều consumer",
      "Amazon Data Firehose ghi vào S3 rồi các consumer query qua Athena",
      "Amazon SQS Standard queue với nhiều consumer poll song song",
      "Amazon SNS fan-out đến nhiều SQS Standard queue cho từng consumer application"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Kinesis Data Streams đảm bảo ordering theo shard (partition key), retention tới 7+ ngày và Enhanced Fan-Out cho nhiều consumer real-time với độ trễ thấp.\n✓ Kinesis Data Streams giữ thứ tự per-device qua partition key, hỗ trợ replay và nhiều consumer real-time với Enhanced Fan-Out.\n✗ Firehose chỉ ghi batch vào S3, không phải real-time sub-second và không hỗ trợ replay luồng theo thứ tự.\n✗ SQS Standard không đảm bảo ordering và không cho phép nhiều consumer độc lập đọc lại cùng message.\n✗ SNS+SQS Standard không giữ ordering nghiêm ngặt per device và không hỗ trợ replay dữ liệu lịch sử.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-052",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty đang dùng Apache Kafka tự host on-premises và muốn migrate lên AWS. Họ phụ thuộc vào hệ sinh thái Kafka (Kafka Connect, Schema Registry, các producer/consumer dùng Kafka API) và không muốn viết lại ứng dụng. Họ cần một managed service giảm gánh nặng vận hành broker nhưng giữ tương thích Kafka API. Lựa chọn nào tối ưu nhất?",
    "options": [
      "Amazon MSK (Managed Streaming for Apache Kafka)",
      "Amazon Kinesis Data Streams thay thế Kafka và viết lại ứng dụng dùng KPL/KCL",
      "Tự cài đặt Kafka cluster trên EC2 với Auto Scaling group",
      "Amazon SQS FIFO kết hợp Lambda để mô phỏng hành vi Kafka"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "MSK là Kafka được AWS quản lý, giữ nguyên Kafka API và hệ sinh thái, cho phép migrate mà không viết lại ứng dụng.\n✓ MSK tương thích Kafka API, hỗ trợ Kafka Connect/Schema Registry, AWS quản lý broker, ít vận hành hơn self-managed.\n✗ Kinesis Data Streams không tương thích Kafka API, buộc viết lại toàn bộ producer/consumer.\n✗ Self-managed Kafka trên EC2 vẫn để công ty gánh patching, scaling và vận hành broker.\n✗ SQS FIFO không cung cấp Kafka API, không hỗ trợ Kafka Connect/Schema Registry và mô hình consumer group.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-053",
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng cần xử lý các file CSV được upload không thường xuyên vào S3: mỗi khi có file mới, hệ thống phải parse, validate và ghi kết quả vào DynamoDB. Khối lượng xử lý mỗi file nhỏ và hoàn tất trong vài giây. Đội muốn giải pháp event-driven, serverless, chỉ trả tiền khi chạy. Kiến trúc nào phù hợp nhất?",
    "options": [
      "S3 Event Notification kích hoạt một Lambda function để parse file và ghi vào DynamoDB",
      "Một EMR cluster chạy liên tục poll S3 để phát hiện file mới và xử lý",
      "Một Glue job được lên lịch chạy mỗi 5 phút để quét bucket tìm file mới",
      "Một EC2 instance chạy cron job kiểm tra S3 và xử lý file định kỳ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Event Notification + Lambda là kiến trúc event-driven serverless, chỉ chạy và tính phí khi có file mới upload.\n✓ S3 event trigger Lambda xử lý ngay khi có file, serverless, chỉ trả tiền theo lần chạy.\n✗ EMR cluster chạy liên tục tốn chi phí cố định và là overkill cho file nhỏ không thường xuyên.\n✗ Glue job theo lịch thêm độ trễ và chi phí khi không có file, kém hơn mô hình event-driven.\n✗ EC2 cron poll tốn chi phí thường trực và tăng operational overhead so với serverless.",
    "domain": 3,
    "mock": 3
  },
  {
    "id": "saa-m3-054",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Một tổ chức đang chạy nhiều workload và muốn lập chương trình tối ưu chi phí compute toàn diện. Họ cần khuyến nghị dựa trên dữ liệu sử dụng thực tế và các pattern cam kết phù hợp. Những hành động nào sau đây giúp giảm chi phí compute một cách hợp lý? (Chọn 2)",
    "options": [
      "Dùng AWS Compute Optimizer để xác định instance over-provisioned và right-size theo khuyến nghị dựa trên metrics",
      "Áp dụng Savings Plans cho phần tải compute baseline ổn định, dài hạn",
      "Bật detailed monitoring trên mọi instance để tự động giảm đơn giá compute",
      "Chuyển toàn bộ workload sang Dedicated Hosts để giảm chi phí",
      "Mua nhiều Elastic IP để dự phòng nhằm tiết kiệm chi phí EC2"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Tối ưu chi phí dựa vào loại bỏ tài nguyên thừa (right-sizing) và cam kết cho phần tải ổn định (Savings Plans).\n✓ Compute Optimizer phân tích metrics để chỉ ra instance quá khổ và đề xuất right-sizing, cắt lãng phí trực tiếp.\n✓ Savings Plans cho baseline ổn định mang lại discount đáng kể so với On-Demand cho phần luôn chạy.\n✗ Detailed monitoring tăng độ chi tiết metrics nhưng còn tính thêm phí, không tự giảm đơn giá compute.\n✗ Dedicated Hosts thường đắt hơn, dùng cho licensing/compliance chứ không phải để tiết kiệm chung.\n✗ Elastic IP không liên quan giảm chi phí compute; EIP còn bị tính phí và nay tính phí cho cả IPv4 public đang dùng.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-055",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty lưu trữ dữ liệu trên S3 với mẫu truy cập không thể dự đoán: một số object được truy cập thường xuyên, số khác hầu như không bao giờ, và mẫu này thay đổi theo thời gian. Họ muốn tối ưu chi phí lưu trữ một cách tự động mà KHÔNG cần phân tích thủ công hay viết lifecycle policy phức tạp. Giải pháp nào phù hợp nhất?",
    "options": [
      "Dùng S3 Intelligent-Tiering để tự động chuyển object giữa các access tier theo mẫu truy cập",
      "Dùng S3 Standard cho mọi object để đảm bảo hiệu năng",
      "Tạo lifecycle policy chuyển tất cả object sang S3 Standard-IA sau 30 ngày",
      "Chuyển toàn bộ dữ liệu sang S3 Glacier Flexible Retrieval để giảm chi phí"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mẫu truy cập không dự đoán được và hay thay đổi là đúng kịch bản của Intelligent-Tiering, vốn tự dịch chuyển object giữa các tier mà không có phí truy xuất.\n✓ S3 Intelligent-Tiering — đúng, tự động tối ưu chi phí theo mẫu truy cập thay đổi, không cần phân tích thủ công.\n✗ S3 Standard cho mọi object — không tối ưu chi phí cho dữ liệu ít truy cập.\n✗ Lifecycle sang Standard-IA sau 30 ngày — giả định cứng nhắc, có thể tính phí truy xuất nếu object lại được truy cập nhiều.\n✗ Glacier Flexible Retrieval — gây độ trễ truy xuất cho object đang được truy cập thường xuyên.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-056",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhóm phân tích cần quản trị tập trung toàn bộ hàng trăm bucket S3 trên nhiều tài khoản trong AWS Organizations. Họ muốn hiểu xu hướng dung lượng lưu trữ, phát hiện bucket có nhiều object không được truy cập và tìm cơ hội tiết kiệm chi phí (ví dụ object nên chuyển tier). Công cụ AWS nào phù hợp nhất?",
    "options": [
      "S3 Storage Lens với dashboard nâng cao (advanced metrics) ở cấp organization",
      "Amazon CloudWatch metrics cho từng bucket riêng lẻ",
      "S3 Inventory report kết hợp Amazon Athena cho mỗi bucket",
      "AWS Cost Explorer lọc theo dịch vụ S3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "S3 Storage Lens cung cấp khả năng quan sát dung lượng và hoạt động trên toàn organization với khuyến nghị tối ưu chi phí, đúng nhu cầu tập trung đa tài khoản.\n✓ S3 Storage Lens advanced ở cấp organization — đúng, cung cấp insight toàn tổ chức và khuyến nghị tối ưu chi phí cho hàng trăm bucket.\n✗ CloudWatch metrics từng bucket — không tập trung, không có khuyến nghị tối ưu, tốn công gộp thủ công.\n✗ S3 Inventory + Athena mỗi bucket — cho danh sách object nhưng đòi nhiều thao tác phân tích thủ công, không có dashboard tổng hợp tổ chức.\n✗ Cost Explorer lọc S3 — cho biết chi phí tổng nhưng không phân tích chi tiết hành vi truy cập object để khuyến nghị chuyển tier.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-057",
    "courseId": "SAA-C03",
    "lesson": "ch4-02-storage-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bucket S3 bật versioning. Theo thời gian, các noncurrent (previous) version của object tích lũy và làm tăng chi phí lưu trữ đáng kể, dù chúng hiếm khi cần. Cách TỐI ƯU CHI PHÍ với least operational overhead để quản lý các version cũ này là gì?",
    "options": [
      "Cấu hình lifecycle rule chuyển noncurrent version sang Glacier sau X ngày và xóa (expire) chúng sau Y ngày",
      "Tắt versioning trên bucket để ngừng tạo version mới",
      "Viết một Lambda chạy hằng đêm liệt kê và xóa noncurrent version cũ",
      "Bật S3 Replication để chuyển version cũ sang bucket rẻ hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lifecycle rule dành riêng cho noncurrent version cho phép tự động hạ tier rồi expire chúng, giảm chi phí mà không cần code.\n✓ Lifecycle rule cho noncurrent version (chuyển Glacier + expire) — đúng, tự động hóa hoàn toàn việc tier hóa và dọn dẹp version cũ.\n✗ Tắt versioning — không xóa version cũ đã tồn tại và làm mất khả năng bảo vệ dữ liệu.\n✗ Lambda xóa hằng đêm — tăng operational overhead và rủi ro lỗi so với lifecycle dựng sẵn.\n✗ S3 Replication — sao chép thêm dữ liệu làm tăng chi phí, không xử lý việc dọn version cũ.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-058",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một đội phát triển chạy ứng dụng microservices trên Amazon ECS với EC2 launch type. Họ phát hiện cluster thường xuyên có nhiều CPU và memory nhàn rỗi vào ban đêm, gây lãng phí chi phí. Họ muốn giảm chi phí với LEAST operational overhead. Giải pháp nào tốt nhất?",
    "options": [
      "Chuyển sang ECS với AWS Fargate và bật Fargate Spot cho các task không quan trọng",
      "Cấu hình EC2 Auto Scaling với target tracking và ECS Cluster Auto Scaling (capacity provider) để tự động scale in các node nhàn rỗi vào ban đêm",
      "Mua Reserved Instances cho toàn bộ EC2 trong cluster để giảm đơn giá",
      "Tăng kích thước instance để gộp nhiều task hơn trên ít node hơn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Idle về đêm là vấn đề về capacity dư thừa; ECS Cluster Auto Scaling (capacity provider) phối hợp EC2 Auto Scaling tự động scale in để loại bỏ node nhàn rỗi.\n✓ ECS Cluster Auto Scaling qua capacity provider kết hợp EC2 Auto Scaling tự co giãn theo số task thực, loại bỏ node idle ban đêm với ít vận hành.\n✗ Chuyển toàn bộ sang Fargate là thay đổi launch type lớn, nhiều overhead di trú và không phải lúc nào cũng rẻ hơn cho tải ổn định.\n✗ Reserved Instances giảm đơn giá nhưng vẫn trả tiền cho node idle ban đêm, không giải quyết lãng phí.\n✗ Tăng instance size không tự giảm capacity khi tải thấp về đêm.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-059",
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một hệ thống xử lý hàng đợi đọc message từ Amazon SQS và xử lý ảnh. Tải nền (baseline) ổn định khoảng 10 instance suốt ngày đêm, nhưng có spike xử lý theo lô có thể chịu gián đoạn. Công ty muốn cấu trúc chi phí tối ưu cho cả baseline lẫn spike. Cách tiếp cận nào tốt nhất?",
    "options": [
      "Dùng Savings Plans (hoặc Reserved Instances) cho ~10 instance baseline và dùng Spot Instances cho phần spike fault-tolerant",
      "Dùng On-Demand cho toàn bộ baseline và spike để đơn giản hóa vận hành",
      "Mua Reserved Instances cho cả baseline lẫn công suất spike đỉnh",
      "Dùng Spot Instances cho toàn bộ cả baseline lẫn spike để giá rẻ nhất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phối hợp commitment cho phần luôn chạy và Spot cho phần co giãn fault-tolerant là pattern tối ưu chi phí kinh điển.\n✓ Savings Plans/RI phủ baseline ổn định với discount, còn Spot phủ spike chịu gián đoạn được giá rẻ nhất — tối ưu cả hai phần.\n✗ On-Demand toàn bộ đơn giản nhưng đắt nhất, bỏ qua cơ hội discount cho baseline.\n✗ RI cho cả công suất spike đỉnh lãng phí vì spike không thường trực, cam kết phần ít dùng.\n✗ Spot cho toàn bộ rủi ro cho baseline cần độ ổn định, có thể bị reclaim đồng loạt.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-060",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty chạy ứng dụng nội bộ trên Amazon RDS for PostgreSQL với tải ổn định, dự đoán được và sẽ vận hành liên tục ít nhất 3 năm tới. Họ muốn giảm chi phí database đáng kể nhất mà không thay đổi kiến trúc. Giải pháp cost-effective nhất là gì?",
    "options": [
      "Mua RDS Reserved Instances kỳ hạn 3 năm cho instance đang dùng",
      "Chuyển sang Aurora Serverless v2 để tự scale theo tải",
      "Bật Multi-AZ để tận dụng instance dự phòng",
      "Chuyển sang DynamoDB on-demand capacity mode"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tải ổn định, dự đoán được và cam kết dùng dài hạn là điều kiện lý tưởng cho RDS Reserved Instances, tiết kiệm tới ~60% so với On-Demand.\n✓ RDS Reserved Instances 3 năm — đúng, tải ổn định + cam kết dài hạn cho chiết khấu cao nhất mà không đổi kiến trúc.\n✗ Aurora Serverless v2 — tối ưu cho tải biến động, không tiết kiệm bằng RI khi tải đã ổn định và chạy liên tục.\n✗ Multi-AZ — tăng độ sẵn sàng nhưng tăng gấp đôi chi phí compute, không phải tối ưu chi phí.\n✗ DynamoDB on-demand — đổi hẳn mô hình dữ liệu (NoSQL) và On-Demand đắt hơn cho tải ổn định.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-061",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bảng DynamoDB đã chạy ổn định 18 tháng với throughput rất đều đặn, dự đoán tốt và nằm ở mức cao liên tục. Hiện đang dùng On-demand capacity mode và hóa đơn khá lớn. Solutions Architect muốn giảm chi phí. Cách tối ưu chi phí nhất là gì?",
    "options": [
      "Chuyển sang Provisioned capacity với auto scaling và mua reserved capacity",
      "Giữ On-demand nhưng bật DynamoDB Standard-IA table class",
      "Bật DynamoDB auto scaling trên chính bảng On-demand hiện tại",
      "Chuyển dữ liệu sang Aurora Serverless v2 để rẻ hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Throughput cao, đều và dự đoán được là điều kiện lý tưởng để rời On-demand sang Provisioned; reserved capacity còn giảm thêm chi phí cho phần baseline cam kết.\n✓ Provisioned + auto scaling + reserved capacity — đúng, rẻ hơn nhiều On-demand với tải đều đặn, dự đoán được.\n✗ Standard-IA table class — chỉ giảm chi phí storage cho dữ liệu ít truy cập, không giảm chi phí throughput cao.\n✗ Auto scaling trên On-demand — On-demand không dùng auto scaling capacity; tùy chọn này không hợp lệ về bản chất.\n✗ Chuyển sang Aurora Serverless v2 — di chuyển sang mô hình quan hệ là thay đổi lớn, không cần thiết khi DynamoDB đang phù hợp.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-062",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty có hai môi trường: production database (Aurora MySQL) chạy tải ổn định 24/7 dự đoán tốt, và một fleet các test/dev database chạy không liên tục, hay được tạo/xóa theo dự án. Họ muốn tối ưu chi phí toàn bộ với least operational overhead. Chiến lược nào phù hợp nhất cho từng môi trường?",
    "options": [
      "Production dùng provisioned + Reserved Instances; test/dev dùng Aurora Serverless v2",
      "Cả hai môi trường dùng Aurora Serverless v2 để đồng nhất quản lý",
      "Cả hai môi trường mua Reserved Instances 1 năm để giảm giá tối đa",
      "Production dùng Aurora Serverless v2; test/dev mua Reserved Instances"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tải ổn định 24/7 hợp với provisioned + RI để chiết khấu tối đa, còn test/dev chạy không liên tục hợp với Serverless v2 vì tự scale về thấp khi nhàn rỗi.\n✓ Production RI + test/dev Serverless v2 — đúng, mỗi môi trường dùng mô hình giá tối ưu theo đặc tính tải.\n✗ Cả hai Serverless v2 — production tải ổn định sẽ bỏ lỡ chiết khấu RI, đắt hơn không cần thiết.\n✗ Cả hai mua RI — test/dev không liên tục mà cam kết RI sẽ trả tiền cả lúc không dùng, lãng phí.\n✗ Đảo ngược (prod Serverless, dev RI) — sai cả hai chiều: prod mất chiết khấu, dev bị khóa cam kết lãng phí.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-063",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng web phục vụ nội dung tĩnh (hình ảnh, video, JS, CSS) từ một S3 bucket cho người dùng toàn cầu. Chi phí data transfer out từ S3 ra internet đang tăng nhanh, và người dùng ở xa Region phàn nàn về độ trễ. Kiến trúc nào vừa giảm chi phí egress vừa cải thiện hiệu năng HIỆU QUẢ NHẤT?",
    "options": [
      "Đặt một CloudFront distribution trước S3 bucket, dùng Origin Access Control để chỉ cho CloudFront truy cập origin",
      "Bật S3 Transfer Acceleration trên bucket để tăng tốc độ tải xuống cho người dùng toàn cầu",
      "Sao chép (replicate) bucket sang nhiều Region bằng S3 Cross-Region Replication và dùng Route 53 latency routing",
      "Chuyển S3 sang storage class S3 One Zone-IA để giảm chi phí lưu trữ và data transfer"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CloudFront cache nội dung tại edge locations, giảm số request tới origin và data transfer từ S3 ra CloudFront rẻ hơn (thậm chí miễn phí), đồng thời phục vụ người dùng từ edge gần nhất.\n✓ CloudFront giảm origin egress nhờ caching và data transfer S3→CloudFront không tính phí, cải thiện độ trễ qua edge locations.\n✗ S3 Transfer Acceleration tối ưu cho upload và còn tính phí phụ thu, không giảm egress cost cho phân phối nội dung.\n✗ Cross-Region Replication tăng chi phí lưu trữ và replication, phức tạp hơn nhiều so với CloudFront.\n✗ Storage class chỉ ảnh hưởng phí lưu trữ, không giảm data transfer out ra internet.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-064",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một công ty media streaming phục vụ video on-demand toàn cầu qua CloudFront với origin là S3. Họ muốn giảm thêm chi phí và có cam kết lưu lượng lớn ổn định hàng tháng, đồng thời một phần lớn người dùng nằm ở các khu vực mà giá data transfer của CloudFront cao. Cách nào giảm chi phí phân phối HIỆU QUẢ NHẤT mà vẫn giữ chất lượng phục vụ toàn cầu?",
    "options": [
      "Cấu hình CloudFront price class để giới hạn edge locations ở các Region chi phí thấp hơn, kết hợp với CloudFront Security Savings Bundle (cam kết mức sử dụng hàng tháng để được giảm giá tới 30%)",
      "Tắt CloudFront và phục vụ trực tiếp từ S3 với S3 Transfer Acceleration để tiết kiệm phí CloudFront",
      "Bật field-level encryption trên CloudFront để giảm kích thước payload truyền tải",
      "Chuyển origin từ S3 sang một EC2 Auto Scaling group để kiểm soát chi phí egress tốt hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Price class giới hạn việc dùng các edge locations đắt tiền (cân bằng chi phí/độ phủ), và CloudFront Security Savings Bundle giảm đơn giá cho lưu lượng cam kết hàng tháng — cả hai trực tiếp giảm chi phí phân phối.\n✓ Giới hạn price class loại bỏ chi phí từ edge locations đắt nhất, còn Security Savings Bundle cam kết mức sử dụng hàng tháng để giảm giá tới 30% trên CloudFront usage gồm data transfer out.\n✗ Phục vụ trực tiếp từ S3 mất caching ở edge, làm tăng origin egress và độ trễ, không tiết kiệm.\n✗ Field-level encryption bảo vệ dữ liệu nhạy cảm, không giảm chi phí data transfer.\n✗ EC2 origin tự quản lý phức tạp hơn và không vốn dĩ rẻ hơn S3 cho việc phục vụ nội dung tĩnh qua CloudFront.",
    "domain": 4,
    "mock": 3
  },
  {
    "id": "saa-m3-065",
    "courseId": "SAA-C03",
    "lesson": "ch4-03-db-network-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một startup vận hành một ứng dụng đơn giản trong một VPC. Các instances trong private subnet chỉ thỉnh thoảng cần tải bản cập nhật phần mềm nhỏ từ internet qua NAT Gateway. Đội tài chính nhận thấy NAT Gateway tính phí theo giờ ngay cả khi gần như không có traffic. Đối với một workload lưu lượng rất thấp và không liên tục, lựa chọn nào tối ưu chi phí nhất trong khi vẫn cho phép outbound internet khi cần?",
    "options": [
      "Cân nhắc dùng NAT instance trên một instance nhỏ (ví dụ t-family) thay cho NAT Gateway để giảm chi phí cố định theo giờ cho workload lưu lượng thấp",
      "Giữ NAT Gateway nhưng triển khai thêm ở mỗi AZ để giảm chi phí trung bình",
      "Gán Elastic IP trực tiếp cho các private instances để chúng tự ra internet",
      "Dùng một Interface VPC endpoint cho mọi truy cập internet outbound"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với lưu lượng rất thấp và không liên tục, NAT instance trên một instance nhỏ có chi phí cố định thấp hơn NAT Gateway, dù phải tự quản lý.\n✓ NAT instance nhỏ tránh được phí theo giờ và phí data processing cao của NAT Gateway, phù hợp workload lưu lượng thấp với chi phí thấp hơn.\n✗ Thêm NAT Gateway ở mỗi AZ làm tăng tổng chi phí, không giảm.\n✗ Gán Elastic IP cho private instance không cho ra internet nếu không có Internet Gateway và route phù hợp — và làm vậy biến chúng thành public, kém an toàn.\n✗ VPC endpoint chỉ truy cập AWS services cụ thể, không cung cấp truy cập internet công cộng chung chung.",
    "domain": 4,
    "mock": 3
  },
  {
    "courseId": "SAA-C03",
    "lesson": "resilient-02-ha-fault-tolerance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hệ thống xử lý đơn hàng nhận các yêu cầu đột biến (spiky) từ một frontend. Các yêu cầu được gửi trực tiếp tới một Auto Scaling group EC2 để xử lý đồng bộ. Khi lưu lượng tăng đột ngột, các instances bị quá tải và nhiều đơn hàng bị mất vì frontend gọi synchronous và hết timeout. Công ty cần đảm bảo không mất đơn hàng ngay cả khi tầng xử lý tạm thời không theo kịp, và muốn tầng xử lý co giãn theo khối lượng công việc thực tế. Giải pháp nào TỐI ƯU nhất?",
    "options": [
      "Đặt một Amazon SQS queue giữa frontend và EC2; frontend ghi đơn vào queue, Auto Scaling group scale theo CloudWatch metric độ sâu queue",
      "Tăng kích thước instance và đặt giá trị maximum của Auto Scaling group lên cao hơn để xử lý mọi đỉnh tải",
      "Dùng Amazon SNS để publish mỗi đơn hàng và cho các EC2 instances subscribe nhận trực tiếp",
      "Đặt một Application Load Balancer phía trước Auto Scaling group và bật connection draining để giữ kết nối"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần decoupling để buffer các đỉnh tải, không mất đơn hàng, và scale theo khối lượng công việc thực tế.\n✓ SQS làm buffer giữ đơn hàng bền vững khi tầng xử lý chậm, biến cuộc gọi synchronous thành asynchronous; scale theo độ sâu queue khớp năng lực với tải thực tế.\n✗ Tăng instance và max chỉ trì hoãn vấn đề, vẫn synchronous nên đơn hàng vẫn mất khi vượt ngưỡng và lãng phí chi phí lúc nhàn rỗi.\n✗ SNS là pub/sub fan-out không bền bỉ lưu trữ để buffer; nếu consumer bận, thông điệp không được giữ lại để xử lý sau, vẫn mất đơn.\n✗ ALB chỉ phân phối tải và connection draining xử lý lúc scale-in, không buffer hay chống mất đơn khi toàn tầng quá tải.",
    "domain": 2,
    "id": "saa-ext-001"
  },
  {
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một ứng dụng game đọc bảng leaderboard từ DynamoDB với tần suất rất cao. Yêu cầu độ trễ ở mức microseconds cho các thao tác đọc các item phổ biến, trong khi DynamoDB hiện cho độ trễ single-digit milliseconds. Giải pháp nào TỐI ƯU nhất để giảm độ trễ đọc mà không phải thay đổi nhiều logic ứng dụng?",
    "options": [
      "Triển khai DynamoDB Accelerator (DAX) làm lớp cache in-memory cho DynamoDB",
      "Đặt Amazon ElastiCache for Redis trước DynamoDB và tự quản lý logic cache",
      "Bật DynamoDB Global Tables để sao chép dữ liệu sang nhiều Region",
      "Tăng provisioned read capacity units (RCU) của bảng DynamoDB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cần độ trễ microseconds cho đọc DynamoDB với thay đổi logic tối thiểu.\n✓ DAX là cache in-memory tích hợp sẵn cho DynamoDB, cho độ trễ microseconds và tương thích API DynamoDB nên gần như không cần sửa logic.\n✗ ElastiCache for Redis đạt được độ trễ thấp nhưng phải tự viết logic cache-aside, phức tạp hơn nhiều so với DAX.\n✗ Global Tables giải quyết replication đa Region, không nhằm giảm độ trễ đọc cục bộ xuống microseconds.\n✗ Tăng RCU chỉ tăng throughput chứ vẫn giữ độ trễ ở mức milliseconds, không đạt microseconds.",
    "domain": 3,
    "id": "saa-ext-002"
  },
  {
    "courseId": "SAA-C03",
    "lesson": "ch2-03-database-performance",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một ứng dụng serverless dùng hàng nghìn hàm Lambda kết nối tới một Aurora MySQL DB instance. Khi tải tăng đột biến, số kết nối mở vượt giới hạn khiến database bị quá tải và xuất hiện lỗi 'too many connections'. Giải pháp nào TỐI ƯU nhất để xử lý vấn đề bùng nổ kết nối này?",
    "options": [
      "Sử dụng Amazon RDS Proxy để pool và chia sẻ kết nối database giữa các hàm Lambda",
      "Thêm Aurora read replicas và phân tải các truy vấn đọc sang đó",
      "Tăng kích thước Aurora DB instance lên loại lớn hơn để chịu nhiều kết nối hơn",
      "Đặt Amazon ElastiCache trước Aurora để giảm số lần truy vấn database"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vấn đề là bùng nổ số kết nối từ nhiều Lambda đồng thời tới Aurora.\n✓ RDS Proxy duy trì connection pool dùng chung, giảm số kết nối thực tế tới database và xử lý đúng tình huống Lambda mở nhiều kết nối.\n✗ Thêm read replicas giúp phân tải đọc nhưng không giải quyết gốc rễ tình trạng quá nhiều kết nối, vẫn có thể vượt giới hạn.\n✗ Tăng kích thước instance chỉ nâng giới hạn tạm thời, không bền vững khi Lambda scale lớn và tốn chi phí.\n✗ Đặt ElastiCache giảm truy vấn đọc nhưng các thao tác ghi và miss cache vẫn mở kết nối, không xử lý triệt để vấn đề kết nối.",
    "domain": 3,
    "id": "saa-ext-003"
  },
  {
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty chạy ứng dụng web sản xuất trên một fleet Amazon EC2 với mức tải nền (baseline) ổn định 24/7 trong suốt 3 năm tới, cộng thêm các đợt tăng tải đột biến không thể đoán trước vào giờ cao điểm. Workload xử lý đợt tăng tải có thể chịu được việc instance bị thu hồi (fault-tolerant, stateless). Solutions Architect cần thiết kế giải pháp compute có CHI PHÍ THẤP NHẤT mà vẫn đảm bảo phần baseline luôn sẵn sàng. Phương án nào tối ưu nhất?",
    "options": [
      "Dùng Compute Savings Plans (cam kết 3 năm) cho phần baseline và Spot Instances cho phần tải đột biến fault-tolerant",
      "Dùng On-Demand Instances cho toàn bộ fleet để đảm bảo tính sẵn sàng tối đa cho cả baseline và đợt tăng tải",
      "Dùng Standard Reserved Instances (3 năm) cho toàn bộ fleet bao gồm cả phần tải đột biến",
      "Dùng Spot Instances cho toàn bộ fleet và cấu hình Spot Fleet để xử lý cả baseline lẫn tải đột biến"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Baseline ổn định nên cam kết để giảm giá; phần đột biến fault-tolerant phù hợp Spot.\n✓ Compute Savings Plans 3 năm phủ baseline với giá thấp và linh hoạt, Spot phủ phần fault-tolerant với giá rẻ nhất.\n✗ On-Demand cho toàn bộ là đắt nhất, không tận dụng cam kết hay Spot cho phần ổn định/chịu lỗi.\n✗ Reserved 3 năm cho cả phần đột biến gây trả tiền cho capacity không dùng đến, lãng phí.\n✗ Spot cho cả baseline khiến phần production ổn định có nguy cơ bị thu hồi, không đảm bảo sẵn sàng.",
    "domain": 4,
    "id": "saa-ext-004"
  },
  {
    "courseId": "SAA-C03",
    "lesson": "ch4-01-compute-cost",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một startup chạy backend microservices trên Amazon ECS dùng AWS Fargate và một cơ sở dữ liệu PostgreSQL trên Amazon RDS. Lưu lượng dao động mạnh: gần như bằng 0 vào ban đêm và tăng vọt vào ban ngày, đôi khi tăng gấp 10 lần trong vài phút. Đội ngũ muốn GIẢM CHI PHÍ database và compute mà không phải quản lý việc scale thủ công, đồng thời các service Java hiện tại đã được rebuild để chạy trên kiến trúc ARM. Kết hợp nào tối ưu nhất về chi phí?",
    "options": [
      "Chuyển database sang Aurora Serverless v2 (PostgreSQL-compatible) tự co giãn theo tải, và chạy Fargate tasks trên Graviton (ARM)",
      "Giữ RDS PostgreSQL với một instance lớn provisioned để chịu được peak, và chạy Fargate trên kiến trúc x86",
      "Chuyển sang Aurora provisioned với một reader instance cố định luôn bật, và dùng Fargate Spot cho toàn bộ task production quan trọng",
      "Dùng RDS Multi-AZ với Auto Scaling storage và chuyển Fargate tasks sang EC2 launch type x86 với cluster Auto Scaling"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tải dao động mạnh và về gần 0 ban đêm cần database tự co giãn; service ARM hợp Graviton.\n✓ Aurora Serverless v2 tự động co giãn capacity theo tải (kể cả xuống thấp ban đêm), Graviton Fargate rẻ hơn cho workload ARM đã rebuild.\n✗ RDS instance lớn provisioned trả tiền cho peak suốt 24/7 dù ban đêm gần như rảnh, lãng phí; x86 đắt hơn Graviton.\n✗ Aurora provisioned reader luôn bật vẫn tốn chi phí cố định; Fargate Spot cho task production quan trọng gây rủi ro bị gián đoạn.\n✗ RDS Multi-AZ cố định không giải quyết tải dao động về compute database; EC2 launch type thêm gánh nặng quản lý cluster và x86 đắt hơn.",
    "domain": 4,
    "id": "saa-ext-005"
  },
  {
    "id": "saa-ext-006",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một công ty cần đồng bộ mỗi đêm 2 TB file mới từ NAS on-prem (giao thức NFS) sang EFS để phân tích, đường truyền Internet dư băng thông. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS DataSync với lịch chạy incremental",
      "AWS Snowball Edge Storage Optimized",
      "AWS Storage Gateway — Volume Gateway",
      "AWS DMS với CDC"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đồng bộ file NFS qua mạng theo lịch, băng thông đủ → đây đúng là bài toán online scheduled của DataSync.\n✓ DataSync incremental: chuyên chuyển file NFS/SMB sang EFS/FSx/S3, chạy theo lịch, băng thông đủ nên đi online.\n✗ Snowball Edge Storage Optimized: offline gửi thiết bị, chỉ hợp khi dữ liệu quá lớn hoặc mạng yếu, không hợp job đồng bộ mỗi đêm.\n✗ Volume Gateway: là hybrid cho app truy cập block iSCSI liên tục, không phải công cụ đồng bộ file.\n✗ DMS với CDC: dành cho database, không hiểu file/object.",
    "domain": 3
  },
  {
    "id": "saa-ext-007",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cần đưa 500 TB dữ liệu trên NAS lên S3, đường truyền chỉ 500 Mbps, hạn hoàn thành trong vòng vài ngày. Cách nào đáp ứng được thời hạn?",
    "options": [
      "Gửi AWS Snowball Edge, copy dữ liệu vào thiết bị rồi ship trả cho AWS",
      "Dùng DataSync để tối ưu băng thông và chuyển online",
      "Chạy aws s3 cp song song nhiều luồng",
      "Dựng Storage Gateway File Gateway rồi copy dần"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "500 TB qua 500 Mbps mất khoảng 92 ngày nếu online, nên phải chuyển offline bằng thiết bị vật lý mới kịp vài ngày.\n✓ Snowball Edge offline: ship thiết bị chỉ mất vài ngày, đây chính là kịch bản dữ liệu lớn + băng thông thấp + hạn gấp.\n✗ DataSync online: dù tối ưu vẫn phụ thuộc 500 Mbps, mất hàng tuần đến hàng tháng, không kịp.\n✗ aws s3 cp song song: vẫn bị chặn bởi băng thông vật lý 500 Mbps, không thể rút xuống vài ngày.\n✗ File Gateway copy dần: cũng đi qua mạng, không giải quyết được nút thắt băng thông.",
    "domain": 3
  },
  {
    "id": "saa-ext-008",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhà máy ở vùng sâu, mạng vệ tinh chập chờn, cần vừa thu thập vừa lọc/nén dữ liệu cảm biến ngay tại chỗ rồi định kỳ gửi về AWS. Lựa chọn nào đúng nhất?",
    "options": [
      "Snowball Edge Compute Optimized",
      "Snowball Edge Storage Optimized",
      "DataSync chạy trên agent tại nhà máy",
      "Storage Gateway — Tape Gateway"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu có hai phần: xử lý (compute) tại edge và transfer offline vì mạng yếu.\n✓ Snowball Edge Compute Optimized: có GPU/compute để chạy xử lý tại edge trước khi gửi, đồng thời chuyển offline phù hợp mạng yếu.\n✗ Snowball Edge Storage Optimized: chỉ để chứa và chuyển data, không chạy được compute tại chỗ.\n✗ DataSync trên agent: là công cụ online, mạng vệ tinh chập chờn không đảm bảo, và cũng không xử lý dữ liệu.\n✗ Tape Gateway: dùng thay thư viện băng từ backup, không liên quan thu thập/xử lý cảm biến tại edge.",
    "domain": 3
  },
  {
    "id": "saa-ext-009",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cần di chuyển Oracle 11g on-prem sang Aurora PostgreSQL với downtime tối thiểu. Kiến trúc migration nào đúng?",
    "options": [
      "Dùng SCT để chuyển schema/stored-procedure, rồi DMS chuyển dữ liệu với CDC",
      "Chỉ dùng DMS chạy trực tiếp, không cần công cụ khác",
      "Dùng DataSync để copy file dữ liệu của Oracle sang Aurora",
      "Dùng Application Migration Service (MGN) để rehost database"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Oracle sang Aurora PostgreSQL là đổi engine (heterogeneous), cần chuyển schema trước rồi mới chuyển data.\n✓ SCT + DMS với CDC: SCT chuyển schema/stored-procedure khác engine, DMS chuyển dữ liệu và CDC giữ downtime tối thiểu.\n✗ Chỉ DMS trực tiếp: đúng cho homogeneous (cùng engine); đổi engine thì schema không tự chuyển được.\n✗ DataSync: chỉ hiểu file/object, không hiểu schema database, không dùng để migrate DB.\n✗ MGN: dùng rehost VM/server lên EC2, không phải migration database đổi engine.",
    "domain": 3
  },
  {
    "id": "saa-ext-010",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "App kế toán on-prem ghi file qua SMB, muốn backend là S3 để tận dụng lifecycle và versioning, nhưng không đổi ứng dụng và app vẫn dùng SMB liên tục. Dịch vụ nào?",
    "options": [
      "Storage Gateway — File Gateway",
      "DataSync một lần rồi chuyển hẳn lên S3",
      "Transfer Family với endpoint SFTP",
      "Snowball Edge Storage Optimized"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "App vẫn dùng SMB liên tục và cần backend S3 — đây là truy cập hybrid liên tục, không phải chuyển một lần.\n✓ File Gateway: cho app truy cập qua NFS/SMB nhưng lưu thành object trên S3, tận dụng lifecycle/Glacier, app không đổi.\n✗ DataSync một lần: chỉ chuyển rồi thôi, không cung cấp lối truy cập SMB liên tục cho app.\n✗ Transfer Family SFTP: cho đối tác dùng SFTP/FTPS, không phải mount SMB cho app on-prem đang chạy.\n✗ Snowball Edge: offline chuyển khối lượng lớn, không phục vụ truy cập liên tục.",
    "domain": 3
  },
  {
    "id": "saa-ext-011",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Nhiều đối tác đang dùng SFTP để upload file và không muốn đổi quy trình, nhưng dữ liệu cần đáp thẳng vào S3 mà không phải tự nuôi server FTP. Dịch vụ nào?",
    "options": [
      "AWS Transfer Family",
      "AWS Storage Gateway — File Gateway",
      "AWS DataSync",
      "AWS Snowcone"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giữ nguyên giao thức SFTP của đối tác nhưng lưu vào S3 mà không tự quản server là đặc trưng của Transfer Family.\n✓ Transfer Family: cổng SFTP/FTPS/FTP/AS2 quản lý, dữ liệu đáp thẳng vào S3 hoặc EFS.\n✗ File Gateway: dùng NFS/SMB cho app on-prem, không phải cổng SFTP cho đối tác bên ngoài.\n✗ DataSync: công cụ đồng bộ file do bạn điều khiển, không cung cấp endpoint SFTP cho đối tác.\n✗ Snowcone: thiết bị offline nhỏ, không liên quan cổng SFTP.",
    "domain": 3
  },
  {
    "id": "saa-ext-012",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một trung tâm dữ liệu muốn loại bỏ tủ băng từ (tape library) vật lý nhưng vẫn giữ nguyên phần mềm backup cũ vốn chỉ biết 'ghi ra tape'. Giải pháp AWS nào phù hợp?",
    "options": [
      "Storage Gateway — Tape Gateway (VTL)",
      "Storage Gateway — Volume Gateway Stored",
      "AWS Backup ghi trực tiếp lên S3 Glacier",
      "DataSync đẩy bản backup lên Glacier theo lịch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phần mềm backup cũ chỉ hiểu tape, nên cần một 'tape ảo' để không phải thay đổi phần mềm.\n✓ Tape Gateway (VTL): giả lập thư viện băng từ qua iSCSI VTL, phần mềm cũ vẫn ghi tape nhưng thật ra lưu lên S3/Glacier.\n✗ Volume Gateway Stored: cung cấp block volume iSCSI, không giả lập tape nên phần mềm backup không dùng như tape được.\n✗ AWS Backup lên Glacier: đòi thay đổi cách phần mềm backup hoạt động, không giữ được giao diện tape.\n✗ DataSync lên Glacier: đồng bộ file, không cung cấp giao diện tape cho phần mềm cũ.",
    "domain": 3
  },
  {
    "id": "saa-ext-013",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Chọn TẤT CẢ phát biểu ĐÚNG khi phân biệt DataSync và Storage Gateway.",
    "options": [
      "DataSync chuyển dữ liệu một chiều rồi thôi (migration/replication), còn Storage Gateway phục vụ truy cập lai liên tục cho app on-prem",
      "Tình huống 'one-time hoặc scheduled transfer' nghiêng về DataSync",
      "Tình huống 'app on-prem vẫn dùng đều kho lưu trữ' nghiêng về Storage Gateway",
      "Storage Gateway chỉ chạy được với database, không hỗ trợ file",
      "DataSync không thể chạy theo lịch, chỉ chuyển đúng một lần"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "DataSync là chuyển rồi thôi (có thể theo lịch), còn Storage Gateway là lối truy cập hybrid liên tục cho app on-prem.\n✓ 'DataSync một chiều rồi thôi, Storage Gateway truy cập lai liên tục': đúng bản chất khác biệt của hai dịch vụ.\n✓ 'one-time/scheduled → DataSync': đúng, DataSync hợp migration và replication theo lịch.\n✓ 'app on-prem dùng đều → Storage Gateway': đúng, đây là kịch bản hybrid truy cập liên tục.\n✗ 'Storage Gateway chỉ chạy với database': sai, Storage Gateway phục vụ file (File), block (Volume) và tape (Tape), không phải database.\n✗ 'DataSync không thể chạy theo lịch': sai, DataSync chạy được một lần hoặc theo lịch incremental.",
    "domain": 3
  },
  {
    "id": "saa-ext-014",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cần migrate một database MySQL on-prem sang Aurora MySQL với downtime tối thiểu, giữ đồng bộ thay đổi trong khi copy. Cách làm đúng?",
    "options": [
      "Dùng DMS trực tiếp (homogeneous) với CDC, không cần SCT",
      "Dùng DMS kèm SCT vì bắt buộc chuyển schema",
      "Dùng DataSync để copy file dữ liệu MySQL",
      "Dùng Storage Gateway Volume Gateway Cached"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "MySQL sang Aurora MySQL là cùng engine (homogeneous) nên không cần chuyển schema.\n✓ DMS trực tiếp với CDC: homogeneous chạy thẳng, CDC bắt thay đổi để downtime tối thiểu, không cần SCT.\n✗ DMS kèm SCT: SCT chỉ cần khi đổi engine (heterogeneous); cùng engine không cần.\n✗ DataSync: chỉ hiểu file/object, không migrate được database.\n✗ Volume Gateway Cached: là hybrid block storage, không phải công cụ migration database.",
    "domain": 3
  },
  {
    "id": "saa-ext-015",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Với yêu cầu 'backup block storage on-prem lên cloud nhưng giữ dữ liệu chính/nóng ở on-prem để độ trễ thấp', chọn TẤT CẢ phát biểu ĐÚNG.",
    "options": [
      "Nên dùng Storage Gateway — Volume Gateway Stored: dữ liệu chính ở on-prem, async backup lên S3 (EBS snapshot)",
      "Volume Gateway dùng giao thức iSCSI (block)",
      "Nếu ngược lại, dữ liệu chính ở S3 và chỉ cache nóng on-prem thì đó là Volume Gateway Cached",
      "File Gateway là lựa chọn đúng vì nó lưu block trên S3",
      "DMS là dịch vụ phù hợp cho yêu cầu backup block này"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Giữ dữ liệu chính on-prem và chỉ backup lên cloud là đặc trưng của Volume Gateway ở chế độ Stored.\n✓ 'Volume Gateway Stored': dữ liệu chính nằm on-prem, async backup lên S3 dưới dạng EBS snapshot, đúng yêu cầu.\n✓ 'Volume Gateway dùng iSCSI (block)': đúng, đây là giao thức block của Volume Gateway.\n✓ 'ngược lại là Cached': đúng, Cached để dữ liệu chính ở S3 và chỉ giữ cache nóng on-prem.\n✗ 'File Gateway lưu block trên S3': sai, File Gateway dùng NFS/SMB lưu file thành object, không phải block.\n✗ 'DMS phù hợp': sai, DMS là migration database, không dùng cho backup block storage.",
    "domain": 3
  },
  {
    "id": "saa-ext-016",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cần lift-and-shift nhiều máy chủ VM on-prem lên EC2 với thay đổi tối thiểu, dùng block-level replication rồi cutover. Dịch vụ nào?",
    "options": [
      "AWS Application Migration Service (MGN)",
      "AWS DMS",
      "AWS DataSync",
      "AWS Snowball Edge Compute Optimized"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rehost VM/server nguyên trạng lên EC2 bằng block-level replication rồi cutover là nhiệm vụ của MGN.\n✓ MGN: chuyên rehost (lift-and-shift) máy chủ vật lý/VM lên EC2 với thay đổi tối thiểu.\n✗ DMS: migrate database, không rehost cả server.\n✗ DataSync: chuyển file/object, không di chuyển nguyên máy chủ thành EC2.\n✗ Snowball Edge Compute Optimized: chạy compute tại edge và chuyển offline, không phải công cụ rehost server lên EC2.",
    "domain": 3
  },
  {
    "id": "saa-ext-017",
    "courseId": "SAA-C03",
    "lesson": "ch2-05-migration-transfer",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Có 200 TB video archive, đường truyền 1 Gbps, cần đưa lên S3 rồi chuyển sang Glacier trong vòng 2 tuần. Phương án nào an toàn nhất về thời hạn?",
    "options": [
      "Snowball Edge Storage Optimized, sau đó dùng lifecycle chuyển sang Glacier",
      "DataSync online chuyển thẳng vào S3 Glacier",
      "Storage Gateway Tape Gateway ghi trực tiếp lên Glacier",
      "Transfer Family để upload video qua SFTP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "200 TB qua 1 Gbps mất khoảng 18+ ngày, vượt hạn 2 tuần và rủi ro, nên chuyển offline mới an toàn.\n✓ Snowball Edge Storage Optimized rồi lifecycle sang Glacier: ship vài ngày, chắc chắn trong 2 tuần, sau đó lifecycle hạ tầng lưu trữ.\n✗ DataSync online: qua 1 Gbps mất 18+ ngày, sát/vượt hạn, rủi ro cao.\n✗ Tape Gateway lên Glacier: dùng thay băng từ backup, không phải công cụ chuyển khối archive lớn kịp hạn.\n✗ Transfer Family SFTP: vẫn phụ thuộc băng thông online 1 Gbps, không giải quyết được thời hạn.",
    "domain": 3
  },
  {
    "id": "saa-ext-018",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một team muốn nạp clickstream vào S3 để phân tích, với yêu cầu số một là VẬN HÀNH ÍT NHẤT: không quản lý shard, không viết consumer, tự động buffer và giao dữ liệu. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Kinesis Data Firehose",
      "Kinesis Data Streams",
      "Amazon MSK",
      "Managed Service for Apache Flink"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Firehose là đường ống nạp 'lười', tự buffer + deliver vào S3/Redshift/OpenSearch, không cần quản lý shard/consumer.\n✓ Đường ống tự buffer và deliver vào S3, no-code, không quản shard/consumer đúng với yêu cầu ít vận hành nhất.\n✗ Ingest thô cần bạn tự viết consumer (Lambda/KCL) và quản shard, nhiều vận hành hơn.\n✗ Hệ Kafka managed chỉ chọn khi cần Kafka API/đã có hệ Kafka, không phải mục tiêu ít vận hành nạp thẳng S3.\n✗ Dịch vụ tính toán trong luồng dùng để phân tích/biến đổi real-time, không phải để nạp lười vào S3.",
    "domain": 3
  },
  {
    "id": "saa-ext-019",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Nhiều nhóm ứng dụng cần cùng đọc một luồng giao dịch real-time, mỗi nhóm xử lý độc lập với offset riêng, và phải PHÁT LẠI (replay) dữ liệu trong 7 ngày khi cần. Chọn dịch vụ đúng.",
    "options": [
      "Kinesis Data Streams",
      "Kinesis Data Firehose",
      "Amazon SQS Standard",
      "Amazon QuickSight"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Data Streams giữ dữ liệu 1–365 ngày, cho nhiều consumer đọc độc lập (mỗi consumer offset riêng) và replay.\n✓ Giữ dữ liệu nhiều ngày, multi-consumer độc lập và replay đúng khớp yêu cầu.\n✗ Đường ống nạp lười không có replay, không giữ dữ liệu, nạp xong là xong.\n✗ Hàng đợi message không giữ nhiều consumer đọc độc lập cùng dữ liệu kèm replay theo cách stream.\n✗ Đây là dịch vụ BI/dashboard, không phải để ingest stream.",
    "domain": 3
  },
  {
    "id": "saa-ext-020",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một hệ thống cần TÍNH TOÁN CỬA SỔ THỜI GIAN (windowing), aggregate và anomaly detection NGAY TRONG LUỒNG streaming bằng SQL hoặc Apache Flink. Dịch vụ nào?",
    "options": [
      "Managed Service for Apache Flink",
      "Kinesis Data Firehose",
      "AWS Glue ETL",
      "Amazon Athena"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Managed Service for Apache Flink phân tích/biến đổi ngay trong luồng: windowing, aggregate, anomaly detection real-time.\n✓ Xử lý cửa sổ thời gian và tính toán real-time trong luồng bằng SQL/Flink đúng mô tả.\n✗ Đường ống nạp lười chỉ buffer + deliver, không làm windowing/aggregate trong luồng.\n✗ ETL Spark serverless là xử lý batch biến đổi dữ liệu, không phải tính toán real-time trong luồng streaming.\n✗ SQL serverless truy vấn file S3, không xử lý windowing trên luồng đang chảy.",
    "domain": 3
  },
  {
    "id": "saa-ext-021",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Data analyst chỉ THỈNH THOẢNG chạy SQL ad-hoc trên log lưu ở S3 và không muốn quản lý bất kỳ hạ tầng nào. Giải pháp chi phí/vận hành hợp lý nhất là gì?",
    "options": [
      "Athena, và chuyển dữ liệu sang Parquet + partition để giảm dữ liệu quét",
      "Load toàn bộ log vào một Redshift cluster chạy 24/7 rồi query",
      "Dựng EMR cluster Hadoop để chạy các câu SQL",
      "Nạp log vào RDS rồi query trực tiếp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Athena là SQL serverless query thẳng S3, trả tiền theo GB quét, hợp ad-hoc/không thường xuyên; Parquet + partition giảm mạnh dữ liệu quét.\n✓ Query serverless trên S3 kèm Parquet + partition đúng cho ad-hoc và tối ưu cost.\n✗ Nuôi cluster 24/7 tốn kém và thừa cho nhu cầu query thỉnh thoảng.\n✗ Cụm Hadoop vận hành cao nhất, thừa cho vài câu SQL ad-hoc.\n✗ RDS là OLTP row-based, gục trước khối lượng quét phân tích lớn.",
    "domain": 3
  },
  {
    "id": "saa-ext-022",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Athena tính tiền theo lượng dữ liệu quét. Đội bạn đang lưu dữ liệu dạng CSV và muốn giảm chi phí query mà vẫn nhanh hơn. Cách hiệu quả nhất là gì?",
    "options": [
      "Chuyển CSV sang Parquet (columnar, nén) và partition theo ngày",
      "Gộp tất cả CSV thành một file lớn duy nhất",
      "Bật replay để đọc lại dữ liệu nhiều lần",
      "Tăng số shard để đọc song song"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Parquet columnar + nén + partition theo ngày có thể giảm >90% dữ liệu quét → rẻ và nhanh hơn nhiều.\n✓ Chuyển sang định dạng cột hoá và partition trực tiếp cắt giảm lượng dữ liệu Athena phải quét.\n✗ Gộp thành một file lớn không giảm dữ liệu quét, còn mất khả năng loại partition.\n✗ Replay là khái niệm của stream ingest, không liên quan chi phí quét của Athena.\n✗ Shard thuộc Kinesis, không ảnh hưởng cost query của Athena.",
    "domain": 3
  },
  {
    "id": "saa-ext-023",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "BI team cần dashboard doanh thu chạy HẰNG NGÀY, nhiều JOIN phức tạp trên dữ liệu có cấu trúc, đòi hỏi hiệu năng ổn định và lặp lại. Engine phân tích nào phù hợp nhất?",
    "options": [
      "Amazon Redshift",
      "Amazon Athena",
      "Amazon EMR",
      "Kinesis Data Streams"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Redshift là data warehouse columnar MPP cho phân tích phức tạp, lặp lại, join nhiều, cần hiệu năng ổn định (BI/báo cáo).\n✓ Warehouse cho workload BI lặp lại, join phức tạp, hiệu năng ổn định đúng nhu cầu.\n✗ Query serverless hợp ad-hoc/thỉnh thoảng, không tối ưu cho báo cáo nặng chạy hằng ngày với hiệu năng ổn định.\n✗ Cụm Hadoop/Spark dành cho big-data transform tùy biến/ML, không phải BI dashboard SQL lặp lại.\n✗ Đây là dịch vụ ingest stream, không phải engine phân tích cho dashboard.",
    "domain": 3
  },
  {
    "id": "saa-ext-024",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Team ML cần chạy job Apache Spark khổng lồ biến đổi hàng petabyte với framework Hadoop cụ thể và cấu hình tùy biến. Lựa chọn đúng là gì?",
    "options": [
      "Amazon EMR",
      "Amazon Athena",
      "Amazon Redshift Serverless",
      "AWS Lake Formation"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "EMR là cụm Hadoop/Spark/Hive/Presto managed cho big-data xử lý nặng, tùy biến (ML, transform khối lượng lớn, framework Hadoop cụ thể).\n✓ Cụm Spark/Hadoop tùy biến cho transform petabyte và ML đúng mô tả.\n✗ Query SQL serverless trên S3 không dành cho job Spark tùy biến khối lượng lớn.\n✗ Data warehouse dù serverless vẫn không chạy được framework Spark/Hadoop tùy biến.\n✗ Đây là dịch vụ phân quyền data lake, không phải engine chạy Spark.",
    "domain": 3
  },
  {
    "id": "saa-ext-025",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một tổ chức muốn PHÂN QUYỀN TẬP TRUNG, fine-grained theo bảng/cột/hàng cho data lake trên S3 + Glue Catalog, thay vì rải rác IAM/bucket policy. Dịch vụ nào?",
    "options": [
      "AWS Lake Formation",
      "AWS Glue Crawler",
      "Amazon QuickSight",
      "Redshift Spectrum"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lake Formation dựng và phân quyền tập trung fine-grained (bảng/cột/hàng) cho data lake trên S3 + Glue Catalog.\n✓ Phân quyền tập trung fine-grained cho data lake đúng vai trò của dịch vụ này.\n✗ Crawler chỉ quét S3 suy ra schema và tạo table trong Catalog, không quản phân quyền.\n✗ Đây là BI/dashboard, không phải công cụ phân quyền data lake.\n✗ Đây là tính năng query S3 từ Redshift, không phải quản lý quyền tập trung.",
    "domain": 3
  },
  {
    "id": "saa-ext-026",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Business users cần một công cụ BI SERVERLESS để dựng dashboard, có SPICE (in-memory tăng tốc) và ML Insights. Chọn dịch vụ.",
    "options": [
      "Amazon QuickSight",
      "Amazon Athena",
      "AWS Glue Data Catalog",
      "Kinesis Data Firehose"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "QuickSight là BI serverless với dashboard, SPICE in-memory và ML Insights cho business users.\n✓ BI serverless kèm SPICE và ML Insights cho dashboard đúng mô tả.\n✗ SQL serverless để query S3, không phải công cụ dựng dashboard cho business.\n✗ Đây là kho metadata schema/partition, không phải công cụ BI.\n✗ Đây là đường ống nạp dữ liệu, không phải BI.",
    "domain": 3
  },
  {
    "id": "saa-ext-027",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về AWS Glue trong pipeline data lake, những phát biểu nào ĐÚNG? (Chọn tất cả đáp án đúng)",
    "options": [
      "Glue Data Catalog là kho metadata trung tâm được Athena, Redshift Spectrum và EMR dùng chung",
      "Glue Crawler tự quét S3, suy ra schema và tạo table trong Catalog",
      "Glue ETL (Spark serverless) có thể biến đổi CSV → Parquet mà không cần quản server",
      "Glue là data warehouse columnar MPP để chạy BI dashboard lặp lại",
      "Glue giữ dữ liệu streaming 1–365 ngày cho nhiều consumer replay"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Glue gồm Data Catalog (metadata dùng chung), Crawler (suy schema) và ETL Spark serverless (ví dụ CSV→Parquet).\n✓ Data Catalog là metadata trung tâm được Athena/Redshift Spectrum/EMR dùng chung.\n✓ Crawler tự quét S3, suy schema và tạo table trong Catalog.\n✓ ETL Spark serverless biến đổi CSV→Parquet, làm sạch, join mà không quản server.\n✗ Data warehouse columnar MPP cho BI lặp lại là vai trò của Redshift, không phải Glue.\n✗ Giữ dữ liệu nhiều ngày cho multi-consumer replay là đặc điểm của Kinesis Data Streams, không phải Glue.",
    "domain": 3
  },
  {
    "id": "saa-ext-028",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "So sánh Kinesis Data Streams và Kinesis Data Firehose, những phát biểu nào ĐÚNG? (Chọn tất cả đáp án đúng)",
    "options": [
      "Data Streams giữ dữ liệu 1–365 ngày và hỗ trợ replay; Firehose không giữ dữ liệu, không replay",
      "Firehose tự động buffer + deliver vào S3/Redshift/OpenSearch/Splunk mà không cần quản shard/consumer",
      "Firehose có thể convert dữ liệu sang Parquet/ORC và transform bằng Lambda ngay trong đường ống",
      "Firehose cho nhiều consumer đọc độc lập với offset riêng",
      "Data Streams giao dữ liệu no-code vào Redshift mà không cần viết consumer"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Data Streams giữ dữ liệu và cho replay/multi-consumer; Firehose là đường ống near-real-time no-code có convert Parquet/ORC và transform Lambda.\n✓ Giữ dữ liệu nhiều ngày + replay là đặc điểm Data Streams, còn Firehose nạp xong là hết.\n✓ Firehose tự buffer + deliver vào S3/Redshift/OpenSearch/Splunk không cần quản shard/consumer.\n✓ Firehose có thể convert sang Parquet/ORC và transform bằng Lambda ngay trong đường ống.\n✗ Cho nhiều consumer đọc độc lập với offset riêng là đặc điểm của Data Streams, không phải Firehose.\n✗ Giao no-code vào Redshift không cần viết consumer là đặc điểm của Firehose; Data Streams thì cần bạn tự viết consumer.",
    "domain": 3
  },
  {
    "id": "saa-ext-029",
    "courseId": "SAA-C03",
    "lesson": "ch2-06-data-ingestion-analytics",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Kiến trúc data lake điển hình end-to-end được đề xuất trong bài là thứ tự nào?",
    "options": [
      "Nguồn → Kinesis/Firehose → S3 raw (CSV/JSON) → Glue ETL → S3 curated (Parquet) → Athena/Redshift → QuickSight",
      "Nguồn → RDS → Glue Crawler → EMR → QuickSight → S3",
      "Nguồn → QuickSight → Athena → S3 raw → Glue → Redshift",
      "Nguồn → S3 Parquet → Firehose → RDS → Lake Formation → EMR"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pipeline chuẩn: nguồn → Kinesis → S3 raw → Glue → S3 Parquet → Athena/Redshift → QuickSight.\n✓ Thứ tự ingest qua Kinesis/Firehose, lưu raw, Glue biến đổi sang Parquet curated, rồi query và BI đúng như bài mô tả.\n✗ Đưa RDS làm lớp lưu trung tâm và đảo vị trí các bước không khớp pipeline data lake.\n✗ Đặt BI/QuickSight ở đầu và raw ở sau là sai chiều dòng dữ liệu.\n✗ Trộn Firehose sau S3 Parquet rồi đổ vào RDS là thứ tự vô nghĩa so với pipeline chuẩn.",
    "domain": 3
  }
];
