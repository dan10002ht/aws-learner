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
    "question": "Một startup muốn tránh chi phí mua trước máy chủ vật lý đắt đỏ và chỉ trả tiền cho tài nguyên thực sự sử dụng theo tháng. Lợi ích nào của AWS Cloud mô tả đúng nhất nhu cầu này?",
    "options": [
      "Trade capital expense (CapEx) for variable operational expense (OpEx)",
      "High availability nhờ nhiều Availability Zones",
      "Elasticity tự động scale theo tải",
      "Global reach nhờ nhiều AWS Regions"
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
    "question": "Một công ty thương mại điện tử có lượng truy cập tăng vọt vào dịp khuyến mãi và giảm mạnh sau đó. Họ muốn hạ tầng tự động thêm tài nguyên khi tải cao và bớt đi khi tải thấp. Đặc tính nào của AWS Cloud đáp ứng điều này?",
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
    "question": "Một nhóm phát triển muốn thử nghiệm ý tưởng sản phẩm mới và triển khai môi trường thử nghiệm chỉ trong vài phút thay vì chờ hàng tuần để mua và lắp đặt máy chủ. Lợi ích nào của AWS Cloud phù hợp nhất?",
    "options": [
      "Agility (tăng tốc độ đổi mới và triển khai)",
      "Economies of scale giúp giá rẻ hơn",
      "Trade OpEx for CapEx",
      "Data durability cao"
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
    "question": "Một công ty SaaS có người dùng ở châu Á, châu Âu và Bắc Mỹ, đang gặp độ trễ cao vì chỉ chạy ở một khu vực duy nhất. Họ muốn triển khai ứng dụng gần người dùng cuối hơn để giảm latency. Lợi ích nào của AWS global infrastructure giải quyết vấn đề này?",
    "options": [
      "Triển khai ở nhiều AWS Regions để có global reach và giảm latency",
      "Bật Multi-AZ trong cùng một Region",
      "Mua Reserved Instances dài hạn",
      "Dùng một Availability Zone lớn hơn"
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
    "question": "Một ngân hàng yêu cầu ứng dụng cốt lõi tiếp tục hoạt động ngay cả khi một trung tâm dữ liệu vật lý gặp sự cố mất điện. Họ muốn tận dụng thiết kế của AWS để đạt high availability trong một Region. Giải pháp nào phù hợp nhất?",
    "options": [
      "Phân bổ workload trên nhiều Availability Zones",
      "Đặt toàn bộ workload trong một Availability Zone duy nhất",
      "Dùng một Edge Location của CloudFront",
      "Chuyển sang On-Demand pricing"
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
    "question": "Một công ty đang lưỡng lự giữa tự xây data center và dùng AWS. Họ nhận ra AWS phục vụ hàng triệu khách hàng nên có thể mua phần cứng số lượng cực lớn và đẩy chi phí xuống thấp hơn mức công ty tự làm được. Lợi ích nào mô tả điều này?",
    "options": [
      "Economies of scale giúp giá pay-as-you-go thấp hơn",
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
    "question": "Một công ty không còn muốn dành nguồn lực để bảo trì phần cứng, thay racks, vá firmware máy chủ vật lý mà muốn tập trung vào sản phẩm khác biệt cho khách hàng. AWS value proposition nào phù hợp nhất với mong muốn này?",
    "options": [
      "Ngừng tốn tiền vận hành/bảo trì data center để tập trung vào điều khác biệt hóa doanh nghiệp",
      "Đạt durability 11 số 9 cho dữ liệu",
      "Giảm latency nhờ Edge Locations",
      "Tự động scale nhờ elasticity"
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
    "question": "Một công ty media chuyển từ data center riêng sang AWS và muốn trình bày với ban lãnh đạo những lợi ích cốt lõi của AWS Cloud value proposition. Hãy chọn HAI phát biểu ĐÚNG.",
    "options": [
      "Có thể trade upfront CapEx thành variable OpEx, chỉ trả cho tài nguyên đã dùng",
      "Có thể tăng/giảm dung lượng trong vài phút thay vì phải dự đoán nhu cầu nhiều năm trước",
      "AWS đảm bảo ứng dụng không bao giờ gặp bất kỳ sự cố nào",
      "Phải mua trọn năng lực đỉnh trước để tránh thiếu tài nguyên",
      "Triển khai cloud loại bỏ hoàn toàn nhu cầu thiết kế kiến trúc cho độ sẵn sàng"
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
    "question": "Một nhóm nghiên cứu cần 500 máy chủ để chạy mô phỏng nặng trong 3 ngày, sau đó không cần nữa. Trên on-premises việc này tốn nhiều tháng mua sắm. AWS giúp họ làm điều này gần như tức thì rồi giải phóng tài nguyên. Lợi ích nào thể hiện rõ nhất?",
    "options": [
      "Khả năng truy cập lượng lớn tài nguyên gần như tức thì và trả lại khi xong (elasticity + speed)",
      "Data durability của S3",
      "Shared Responsibility Model",
      "Compliance certifications của AWS"
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
    "question": "Một kiến trúc sư đang giải thích sự khác nhau giữa scalability và elasticity cho đội ngũ. Trong AWS, đâu là mô tả CHÍNH XÁC NHẤT về elasticity so với chỉ scalability?",
    "options": [
      "Elasticity là tự động thêm VÀ bớt tài nguyên theo nhu cầu thực tế theo thời gian thực, không chỉ tăng dung lượng",
      "Elasticity chỉ là khả năng tăng dung lượng tối đa, không bao giờ giảm",
      "Elasticity nghĩa là sao chép dữ liệu sang nhiều Region để chống mất mát",
      "Elasticity là cam kết hợp đồng 1 hoặc 3 năm để giảm giá"
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
    "question": "Một CFO muốn so sánh tổng quát mô hình tài chính giữa on-premises và AWS. Phát biểu nào phản ánh ĐÚNG NHẤT cách AWS thay đổi cấu trúc chi phí, ngoài chuyện trả theo mức dùng?",
    "options": [
      "AWS biến chi phí cố định trả trước thành chi phí biến đổi, cho phép giảm chi phí khi tối ưu và tránh dự đoán dung lượng sai",
      "AWS yêu cầu một khoản CapEx lớn cố định mỗi năm bất kể mức dùng",
      "AWS loại bỏ hoàn toàn mọi chi phí vận hành của khách hàng",
      "AWS chỉ tính phí theo gói cố định hằng tháng không đổi"
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
    "question": "Một công ty muốn mở rộng hoạt động sang nhiều quốc gia mới chỉ trong vài cú nhấp chuột, đặt ứng dụng tại các Region tương ứng mà không cần xây data center ở từng nước. Lợi ích nào của AWS Cloud được thể hiện?",
    "options": [
      "Go global in minutes nhờ global infrastructure (global reach)",
      "Tăng durability của dữ liệu lên 11 số 9",
      "Giảm chi phí nhờ Spot Instances",
      "Tăng bảo mật nhờ IAM"
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
    "question": "Một công ty muốn tự động hóa quy trình triển khai (deployment), giám sát hiệu năng bằng các chỉ số (metrics) và liên tục cải tiến các quy trình vận hành hàng ngày. Pillar nào của AWS Well-Architected Framework tập trung vào mục tiêu này?",
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
    "question": "Một tổ chức tài chính cần bảo vệ dữ liệu khách hàng, quản lý quyền truy cập bằng IAM và mã hóa dữ liệu khi lưu trữ. Những yêu cầu này thuộc pillar nào trong Well-Architected Framework?",
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
    "question": "Một công ty muốn hệ thống tự động phục hồi sau sự cố, triển khai trên nhiều Availability Zones và chịu được lỗi mà không gián đoạn dịch vụ. Pillar nào phù hợp nhất với mục tiêu này?",
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
    "question": "Một startup muốn chọn đúng loại tài nguyên compute, dùng serverless khi phù hợp và theo dõi để đảm bảo kiến trúc luôn dùng công nghệ hiệu quả nhất theo nhu cầu. Pillar nào mô tả đúng nhất các hoạt động này?",
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
    "question": "Một công ty đang chạy nhiều EC2 instances dư thừa với mức sử dụng thấp. Họ muốn phân tích chi tiêu, tắt tài nguyên không dùng và chuyển sang mô hình giá phù hợp để giảm tổng chi phí. Pillar nào hướng dẫn các hoạt động này?",
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
    "question": "Một doanh nghiệp muốn giảm tác động môi trường của khối lượng công việc trên cloud bằng cách tối đa hóa hiệu suất sử dụng tài nguyên và giảm năng lượng tiêu thụ cần thiết. Pillar nào của Well-Architected Framework đề cập trực tiếp đến mục tiêu này?",
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
    "question": "Một nhóm DevOps muốn áp dụng Infrastructure as Code (CloudFormation), thực hiện thay đổi nhỏ và có thể đảo ngược, đồng thời rút bài học từ các sự cố vận hành để cải tiến. Những thực hành này phản ánh pillar nào?",
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
    "question": "Một ứng dụng thương mại điện tử thường xuyên bị quá tải vào giờ cao điểm và downtime khi một server hỏng. Công ty muốn cải thiện để hệ thống tự phục hồi và tự động thay thế các instance lỗi. Pillar nào nên được ưu tiên cải thiện?",
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
    "question": "Một kiến trúc sư cần phân biệt hai yêu cầu: 'sử dụng đúng kích thước instance để xử lý tải hiệu quả nhất' và 'tắt instance không dùng để giảm hóa đơn'. Hai yêu cầu này lần lượt thuộc các pillar nào?",
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
    "question": "Một công ty triển khai workload mới và muốn áp dụng các thực hành thuộc pillar Security của Well-Architected Framework. Những hành động nào dưới đây phù hợp với pillar Security? (Chọn 2)",
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
    "question": "Một công ty muốn dùng các managed services và serverless để giảm thời gian chạy tài nguyên không cần thiết, đồng thời chọn Region gần người dùng để giảm lượng dữ liệu di chuyển nhằm hạ thấp dấu chân carbon. Mục tiêu chính này gắn với pillar nào?",
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
    "question": "Trong quá trình review kiến trúc, một nhóm phát hiện họ thiếu khả năng giám sát và phản hồi sự kiện vận hành theo thời gian thực bằng CloudWatch alarms và runbooks. Khoảng trống này thuộc pillar nào của Well-Architected Framework?",
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
    "question": "Một công ty muốn di chuyển ứng dụng đang chạy trên máy chủ vật lý lên AWS một cách nhanh nhất, KHÔNG thay đổi mã nguồn, bằng cách chuyển nguyên trạng sang EC2. Đây là chiến lược di chuyển nào trong 7 Rs?",
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
    "question": "Một công ty cần chuyển 80 TB dữ liệu lên Amazon S3 nhưng đường truyền internet rất chậm, việc upload qua mạng sẽ mất nhiều tuần. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn di chuyển cơ sở dữ liệu Oracle on-premises sang Amazon Aurora với thời gian downtime tối thiểu, đồng thời tiếp tục đồng bộ dữ liệu trong quá trình chuyển đổi. Dịch vụ nào nên dùng?",
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
    "question": "Khi migrate database giữa hai engine khác nhau (ví dụ Oracle sang PostgreSQL), công cụ nào giúp chuyển đổi schema và mã thủ tục trước khi dùng DMS để chuyển dữ liệu?",
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
    "question": "Một tổ chức đang lập kế hoạch chuyển đổi cloud và muốn đánh giá mức độ sẵn sàng về kỹ năng nhân sự, đào tạo và quản lý thay đổi văn hóa. Perspective nào của AWS CAF tập trung vào khía cạnh này?",
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
    "question": "Bộ phận tài chính của một công ty cần đảm bảo việc chuyển lên cloud mang lại lợi ích kinh doanh đo lường được và phù hợp mục tiêu doanh nghiệp. Perspective nào của AWS CAF phụ trách việc này?",
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
    "question": "Một công ty phát hiện một ứng dụng cũ không còn ai sử dụng và quyết định ngừng vận hành, không chuyển lên cloud để tiết kiệm chi phí. Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty chuyển ứng dụng web lên AWS và đồng thời thay thế database tự quản bằng Amazon RDS để giảm gánh nặng quản trị, nhưng KHÔNG viết lại mã ứng dụng. Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty muốn bỏ hệ thống CRM tự xây dựng và chuyển sang dùng một giải pháp SaaS thương mại (ví dụ Salesforce) theo mô hình đăng ký. Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty lập kế hoạch migration toàn diện theo AWS CAF. Họ cần xác định các perspective thuộc nhóm nền tảng kỹ thuật (technical capabilities) thay vì nhóm con người/kinh doanh. Chọn các perspective phù hợp.",
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
    "question": "Một công ty đang vận hành workload trên VMware on-premises và muốn chuyển toàn bộ sang VMware Cloud on AWS mà KHÔNG cần thay đổi hypervisor hay chuyển đổi VM. Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty có một ứng dụng phụ thuộc nhiều vào một hệ thống mainframe chưa sẵn sàng di chuyển và quyết định để nó ở on-premises trong giai đoạn này. Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty chuyển từ data center on-premises sang AWS. Trước đây họ phải mua trước máy chủ với chi phí lớn và cố định bất kể mức sử dụng. Đặc điểm chi phí nào của mô hình cloud giúp họ chỉ trả tiền theo lượng tài nguyên thực sự dùng?",
    "options": [
      "Variable cost (chi phí biến đổi) theo mức sử dụng",
      "Fixed cost (chi phí cố định) trả trước",
      "Sunk cost của phần cứng cũ",
      "Capital expenditure (CapEx) cho data center"
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
    "question": "Một startup không muốn bỏ ra khoản đầu tư vốn lớn ban đầu để mua máy chủ vật lý. Họ muốn biến chi phí hạ tầng thành chi phí vận hành trả dần. Lợi ích kinh tế nào của cloud mô tả điều này?",
    "options": [
      "Chuyển CapEx thành OpEx",
      "Tăng sunk cost ban đầu",
      "Cố định chi phí hằng tháng bất kể tải",
      "Loại bỏ hoàn toàn mọi chi phí phần mềm"
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
    "question": "Một công ty phát hiện nhiều instance EC2 đang chạy với kích thước lớn hơn nhiều so với mức CPU và RAM thực tế sử dụng. Họ muốn giảm chi phí mà vẫn đáp ứng tải. Cách tiếp cận nào phù hợp nhất?",
    "options": [
      "Rightsizing các instance về loại nhỏ hơn phù hợp tải",
      "Mua thêm Reserved Instances cho các instance lớn hiện tại",
      "Bật Multi-AZ cho mọi instance",
      "Chuyển toàn bộ sang Dedicated Hosts"
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
    "question": "Một công ty đã sở hữu giấy phép Windows Server và SQL Server mua từ trước, vẫn còn hiệu lực. Họ muốn tận dụng các license này khi chạy workload trên AWS để tránh trả phí license lần nữa. Lựa chọn nào phù hợp?",
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
    "question": "Một công ty mới, chưa có bất kỳ license phần mềm nào, muốn chạy Windows Server trên EC2 mà không phải tự quản lý việc mua và tuân thủ license. Lựa chọn nào đơn giản nhất cho họ?",
    "options": [
      "Dùng license-included EC2 instances",
      "Mua BYOL và tự quản lý tuân thủ",
      "Chạy trên Spot Instances để né license",
      "Dùng Dedicated Hosts với license cũ"
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
    "question": "Một công ty nhận thấy giá nhiều dịch vụ AWS giảm dần theo thời gian. Lý do kinh tế chính giúp AWS liên tục giảm giá và chuyển lợi ích đó cho khách hàng là gì?",
    "options": [
      "Economies of scale (lợi thế kinh tế theo quy mô)",
      "Sunk cost của khách hàng",
      "Fixed cost của data center khách hàng",
      "BYOL của khách hàng"
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
    "question": "Khi so sánh tổng chi phí sở hữu (TCO) giữa on-premises và cloud, đội tài chính nhận ra on-premises còn nhiều chi phí ẩn ngoài giá mua máy chủ. Khoản nào dưới đây là chi phí on-premises mà cloud thường giúp loại bỏ hoặc giảm đáng kể?",
    "options": [
      "Chi phí điện, làm mát và không gian data center",
      "Chi phí băng thông egress trên AWS",
      "Chi phí Savings Plans",
      "Chi phí gọi API quản lý qua AWS CLI"
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
    "question": "Một công ty muốn dùng automation để giảm chi phí và tăng hiệu quả vận hành trên AWS. Những lợi ích nào dưới đây đến từ việc tự động hóa? (Chọn 2)",
    "options": [
      "Tự động tắt các môi trường dev ngoài giờ làm việc để tiết kiệm chi phí",
      "Auto Scaling tự thêm/bớt EC2 theo tải, tránh trả tiền cho tài nguyên dư",
      "Tự động loại bỏ mọi chi phí truyền dữ liệu",
      "Đảm bảo giá EC2 luôn cố định bất kể vùng",
      "Tự động chuyển toàn bộ license sang miễn phí"
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
    "question": "Một doanh nghiệp lớn đang lập kế hoạch chuyển đổi và cần ước tính chi phí giải pháp chạy trên AWS để so sánh với on-premises nhằm thuyết phục ban lãnh đạo. Công cụ nào của AWS phù hợp nhất để mô hình hóa và ước tính trước chi phí AWS?",
    "options": [
      "AWS Pricing Calculator để ước tính và so sánh chi phí giải pháp trên AWS",
      "AWS Cost Explorer để xem chi phí on-premises hiện tại",
      "AWS Budgets để chặn chi tiêu on-premises",
      "Amazon CloudWatch để đo điện năng data center"
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
    "question": "Một công ty có workload chạy ổn định 24/7 suốt 3 năm tới. Hiện họ dùng On-Demand và chi phí cao. Họ muốn giảm chi phí compute nhiều nhất mà vẫn giữ workload luôn chạy. Đây là ví dụ tận dụng nguyên tắc kinh tế nào và lựa chọn nào phù hợp?",
    "options": [
      "Cam kết sử dụng dài hạn để đổi lấy giá thấp hơn — dùng Reserved Instances hoặc Savings Plans",
      "Trả theo giá biến đổi cao nhất — giữ nguyên On-Demand",
      "Tận dụng phần cứng dư thừa với gián đoạn — dùng Spot Instances cho workload 24/7 không gián đoạn",
      "Loại bỏ chi phí compute hoàn toàn bằng Free Tier vĩnh viễn"
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
    "question": "Một công ty có lưu lượng truy cập tăng vọt vào dịp lễ và rất thấp vào ngày thường. Trên on-premises họ phải mua dư phần cứng cho đỉnh tải nên lãng phí phần lớn thời gian. Lợi ích cloud nào giải quyết vấn đề này tốt nhất?",
    "options": [
      "Elasticity — co giãn tài nguyên theo nhu cầu, chỉ trả cho phần đang dùng",
      "Sunk cost — chấp nhận phần cứng dư",
      "Fixed cost — cố định công suất theo đỉnh tải",
      "CapEx — đầu tư vốn cho công suất đỉnh"
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
    "question": "Một CIO trình bày các lợi ích kinh tế của việc lên cloud cho ban lãnh đạo. Những phát biểu nào dưới đây mô tả CHÍNH XÁC lợi ích kinh tế của cloud so với on-premises? (Chọn 2)",
    "options": [
      "Trả tiền theo nhu cầu thay vì đầu tư trước cho công suất đỉnh",
      "Loại bỏ nhu cầu tự vận hành và bảo trì data center vật lý",
      "Mọi chi phí truyền dữ liệu ra Internet đều miễn phí",
      "Không bao giờ cần tối ưu hay rightsizing vì cloud tự rẻ tuyệt đối",
      "Giá đơn vị tăng dần theo thời gian khi quy mô AWS lớn lên"
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
    "question": "Một công ty mới chuyển sang AWS hỏi: ai chịu trách nhiệm bảo mật vật lý cho các data center chạy dịch vụ EC2 của họ?",
    "options": [
      "AWS chịu trách nhiệm bảo mật vật lý của các data center",
      "Khách hàng phải tự cử nhân viên canh gác data center",
      "Khách hàng chia sẻ chi phí an ninh vật lý với AWS theo giờ",
      "Bên thứ ba do khách hàng thuê chịu trách nhiệm an ninh vật lý"
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
    "question": "Một công ty chạy ứng dụng trên EC2 instance Linux. Theo shared responsibility model, ai chịu trách nhiệm vá (patch) hệ điều hành khách (guest OS) trên instance này?",
    "options": [
      "Khách hàng chịu trách nhiệm patch guest OS trên EC2",
      "AWS tự động patch guest OS cho mọi EC2 instance",
      "AWS Support team patch OS khi khách hàng mở ticket",
      "Nhà cung cấp Linux distro patch trực tiếp lên instance"
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
    "question": "Một công ty chuyển từ self-managed database trên EC2 sang Amazon RDS. So với khi tự chạy database trên EC2, trách nhiệm nào của khách hàng được CHUYỂN sang AWS khi dùng RDS?",
    "options": [
      "Patch database engine và OS bên dưới",
      "Cấu hình tài khoản người dùng database và phân quyền",
      "Quản lý dữ liệu được lưu trong database",
      "Cấu hình security group kiểm soát truy cập tới DB"
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
    "question": "Một kiến trúc sư triển khai hàm AWS Lambda. Trong các hạng mục sau, hạng mục nào KHÔNG còn là trách nhiệm của khách hàng vì Lambda quản lý hộ?",
    "options": [
      "Vá (patch) hệ điều hành nơi hàm chạy",
      "Viết code hàm và quản lý lỗ hổng trong code",
      "Cấu hình IAM execution role cho hàm",
      "Mã hóa và bảo vệ dữ liệu nhạy cảm hàm xử lý"
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
    "question": "Một công ty lưu trữ tệp khách hàng trên Amazon S3. Họ lo ngại dữ liệu bị truy cập trái phép. Theo shared responsibility model, ai chịu trách nhiệm cấu hình quyền truy cập (bucket policy, block public access, mã hóa) cho bucket?",
    "options": [
      "Khách hàng cấu hình quyền truy cập và mã hóa cho bucket",
      "AWS mặc định khóa mọi bucket nên khách hàng không cần làm gì",
      "AWS tự động bật mã hóa và chặn public cho mọi dữ liệu khách hàng",
      "AWS Trusted Advisor tự sửa cấu hình bucket sai cho khách hàng"
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
    "question": "Một nhóm bảo mật muốn biết AWS chịu trách nhiệm cho phần nào trong mô hình. Phát biểu nào mô tả ĐÚNG nguyên tắc tổng quát của shared responsibility model?",
    "options": [
      "AWS chịu trách nhiệm 'security OF the cloud', khách hàng chịu 'security IN the cloud'",
      "Khách hàng chịu trách nhiệm 'security OF the cloud', AWS chịu 'security IN the cloud'",
      "AWS chịu toàn bộ trách nhiệm bảo mật cho mọi dịch vụ",
      "Khách hàng chịu toàn bộ trách nhiệm bảo mật cho mọi dịch vụ"
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
    "question": "Một công ty chạy ứng dụng web trên EC2. Theo shared responsibility model, những hạng mục nào sau đây là trách nhiệm của KHÁCH HÀNG? (Chọn 2)",
    "options": [
      "Cấu hình security group và network ACL",
      "Vá (patch) guest OS và phần mềm ứng dụng trên instance",
      "Bảo trì phần cứng máy chủ vật lý",
      "Quản lý hypervisor ảo hóa",
      "Bảo mật vật lý của Availability Zone"
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
    "question": "Một công ty so sánh việc chạy database tự quản trên EC2 với dùng Amazon RDS. Với RDS, hạng mục nào sau đây VẪN là trách nhiệm của khách hàng?",
    "options": [
      "Cấu hình security group và mã hóa dữ liệu (encryption at rest/in transit)",
      "Vá (patch) hệ điều hành nền của database",
      "Cài đặt và nâng cấp database engine",
      "Sao lưu tự động và bảo trì phần cứng lưu trữ"
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
    "question": "Một kiến trúc sư xếp các dịch vụ EC2, RDS và Lambda theo mức độ trách nhiệm vận hành OS mà khách hàng phải gánh, từ NHIỀU nhất đến ÍT nhất. Thứ tự nào đúng?",
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
    "question": "Một công ty dùng S3 để lưu dữ liệu y tế và bật server-side encryption với khóa do AWS quản lý (SSE-S3). Phát biểu nào ĐÚNG về trách nhiệm liên quan đến mã hóa?",
    "options": [
      "Khách hàng quyết định BẬT mã hóa và chọn cơ chế; AWS thực thi mã hóa/giải mã dữ liệu ở tầng lưu trữ",
      "AWS tự động bật mã hóa nên khách hàng không có vai trò gì trong việc bảo vệ dữ liệu",
      "Khách hàng phải tự viết thuật toán mã hóa vì AWS không cung cấp mã hóa cho S3",
      "Mã hóa dữ liệu S3 hoàn toàn là trách nhiệm của AWS trong mọi trường hợp"
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
    "question": "Một công ty lo lắng về việc cấu hình IAM users, groups và quản lý quyền truy cập của nhân viên. Theo shared responsibility model, ai chịu trách nhiệm quản lý danh tính và quyền truy cập (IAM) trong tài khoản?",
    "options": [
      "Khách hàng chịu trách nhiệm cấu hình và quản lý IAM trong tài khoản",
      "AWS tự cấp quyền tối thiểu cho nhân viên khách hàng",
      "AWS quản lý toàn bộ IAM users thay khách hàng",
      "Phần cứng AWS tự động giới hạn quyền theo vai trò công việc"
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
    "question": "Một công ty dùng Amazon S3 (lưu trữ object). Theo shared responsibility model, những hạng mục nào là trách nhiệm của AWS? (Chọn 2)",
    "options": [
      "Bảo trì hạ tầng và phần cứng lưu trữ vật lý",
      "Vá lỗi (patch) hệ điều hành nền của dịch vụ lưu trữ",
      "Cấu hình bucket policy chống truy cập công khai",
      "Phân loại dữ liệu nhạy cảm trước khi tải lên",
      "Quản lý IAM permissions cho người dùng truy cập bucket"
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
    "question": "Một kiểm toán viên hỏi tại sao trách nhiệm của khách hàng lại khác nhau giữa EC2 và Lambda dù cùng chạy code ứng dụng. Lý do nào giải thích đúng nhất?",
    "options": [
      "Lambda là serverless nên AWS gánh thêm việc quản lý OS/runtime; EC2 là IaaS nên khách hàng tự quản OS",
      "EC2 và Lambda có trách nhiệm khách hàng giống hệt nhau vì đều chạy code",
      "Lambda buộc khách hàng tự patch runtime còn EC2 thì AWS patch OS",
      "Trách nhiệm khác nhau là do giá dịch vụ chứ không liên quan kiến trúc"
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
    "question": "Một công ty triển khai ứng dụng dùng EC2 phía sau một Application Load Balancer, lưu dữ liệu trên RDS. Trong toàn bộ kiến trúc này, hạng mục nào sau đây luôn là trách nhiệm của KHÁCH HÀNG bất kể dịch vụ nào?",
    "options": [
      "Bảo vệ và phân loại dữ liệu (customer data) của ứng dụng",
      "Patch hệ điều hành của instance RDS",
      "Bảo trì phần cứng vật lý của Load Balancer",
      "Quản lý phần mềm hypervisor chạy EC2"
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
    "question": "Một quản trị viên muốn giới hạn lưu lượng mạng tới các EC2 instance, chỉ cho phép cổng 443 (HTTPS) từ Internet. Theo shared responsibility model, ai chịu trách nhiệm cấu hình security group này?",
    "options": [
      "Khách hàng cấu hình security group để kiểm soát lưu lượng",
      "AWS tự cấu hình security group dựa trên loại ứng dụng",
      "AWS Support cấu hình security group khi nhận yêu cầu",
      "Security group được nhà mạng (ISP) cấu hình tự động"
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
    "question": "Một công ty cần tải các báo cáo tuân thủ của AWS như SOC 2 và ISO 27001 để cung cấp cho bộ phận kiểm toán của khách hàng. Dịch vụ nào cho phép họ truy cập và tải các tài liệu này theo yêu cầu (on-demand)?",
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
    "question": "Một công ty muốn ghi lại mọi lệnh gọi API trong tài khoản AWS để phục vụ kiểm toán (audit) và điều tra ai đã thực hiện hành động nào. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn liên tục đánh giá xem cấu hình các tài nguyên AWS (như S3 bucket, security group) có tuân thủ chính sách nội bộ và tự động phát hiện khi có thay đổi vi phạm. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một ngân hàng muốn phát hiện hoạt động bất thường và mối đe dọa như truy cập trái phép, gọi API đáng ngờ bằng cách phân tích thông minh VPC Flow Logs, DNS logs và CloudTrail logs. Dịch vụ nào phù hợp nhất?",
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
    "question": "Đội bảo mật của một công ty muốn có một bảng điều khiển (dashboard) tập trung tổng hợp các phát hiện bảo mật từ GuardDuty, Inspector và kiểm tra mức độ tuân thủ với các chuẩn như CIS, PCI DSS trên nhiều tài khoản. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn quét các EC2 instance và container image trong ECR để tự động phát hiện các lỗ hổng phần mềm (CVE) và phơi nhiễm mạng ngoài ý muốn. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn mã hóa dữ liệu lưu trữ (at rest) trong S3 và EBS, đồng thời quản lý vòng đời và quyền truy cập các khóa mã hóa một cách tập trung. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn đảm bảo dữ liệu được mã hóa khi truyền (in transit) giữa người dùng và ứng dụng web phía sau một Application Load Balancer. Họ cần cung cấp và gia hạn miễn phí chứng chỉ SSL/TLS. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một ứng dụng web hứng chịu các cuộc tấn công DDoS lớp mạng (Layer 3/4). Công ty muốn bảo vệ tự động cho các tài nguyên như CloudFront, ELB và Route 53. Dịch vụ nào được thiết kế cho mục đích này?",
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
    "question": "Một tổ chức trong ngành y tế cần liên tục thu thập bằng chứng (evidence) một cách tự động để chuẩn bị cho các cuộc audit theo khung như HIPAA và SOC 2, giúp giảm công sức thu thập thủ công. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty cần lưu trữ dữ liệu của công dân EU và phải tuân thủ GDPR, đồng thời đảm bảo dữ liệu không rời khỏi châu Âu. Cách tiếp cận nào phù hợp nhất với mô hình tuân thủ theo vùng của AWS?",
    "options": [
      "Chọn các AWS Region đặt tại châu Âu (như eu-west-1) để lưu trữ dữ liệu",
      "Bật AWS Shield Advanced cho toàn bộ tài khoản",
      "Dựa vào việc AWS tự động di chuyển dữ liệu về đúng vùng",
      "Sử dụng một Edge Location bất kỳ gần nhất"
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
    "question": "Một công ty đang xây dựng chiến lược giám sát bảo mật toàn diện. Họ cần (1) phát hiện hành vi đe dọa từ phân tích log và (2) một nơi tập trung để tổng hợp và ưu tiên các findings bảo mật trên nhiều tài khoản. Hãy chọn HAI dịch vụ phù hợp.",
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
    "question": "Một công ty cần giám sát số lượng request bị từ chối (4xx errors) trên ứng dụng và nhận cảnh báo tự động khi vượt ngưỡng để đội vận hành phản ứng kịp thời. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon CloudWatch (với alarm)",
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
    "question": "Sau một sự cố bảo mật, đội điều tra cần xác định chính xác lệnh gọi API nào đã thay đổi một security group và ai thực hiện, đồng thời kiểm tra cấu hình của tài nguyên đó đã thay đổi như thế nào theo thời gian. Họ nên kết hợp hai dịch vụ nào?",
    "options": [
      "AWS CloudTrail và AWS Config",
      "Amazon GuardDuty và AWS Shield",
      "AWS Artifact và Audit Manager",
      "Amazon Inspector và Amazon Macie"
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
    "question": "Một công ty fintech cần xác minh rằng AWS tuân thủ chuẩn PCI DSS để xử lý dữ liệu thẻ thanh toán, và muốn lấy chứng nhận PCI của AWS phục vụ hồ sơ kiểm toán của riêng họ. Họ nên dùng dịch vụ nào để lấy tài liệu này?",
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
    "question": "Một công ty vừa tạo tài khoản AWS mới. Theo best practice của AWS, hành động nào nên được thực hiện ngay với root user để bảo vệ tài khoản?",
    "options": [
      "Bật MFA cho root user và ngừng dùng root cho tác vụ hằng ngày",
      "Tạo access key cho root user để các script tự động dùng",
      "Chia sẻ mật khẩu root cho cả nhóm vận hành để tiện thao tác",
      "Gắn thêm IAM policy AdministratorAccess trực tiếp vào root user"
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
    "question": "Một quản trị viên cần cấp cùng một bộ quyền cho 20 nhân viên mới phòng kế toán. Cách quản lý quyền hiệu quả và dễ bảo trì nhất là gì?",
    "options": [
      "Tạo một IAM group cho phòng kế toán, gắn policy vào group rồi thêm các user vào group",
      "Gắn policy trực tiếp vào từng IAM user một cách riêng lẻ",
      "Tạo 20 IAM role và yêu cầu mỗi nhân viên tự assume role",
      "Dùng chung một IAM user cho cả 20 nhân viên"
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
    "question": "Một ứng dụng chạy trên EC2 cần đọc dữ liệu từ một S3 bucket. Giải pháp cấp quyền AN TOÀN nhất là gì?",
    "options": [
      "Gắn một IAM role với quyền đọc S3 vào EC2 instance",
      "Lưu access key của một IAM user vào file cấu hình trên EC2",
      "Hard-code access key và secret key trong mã nguồn ứng dụng",
      "Dùng access key của root user cho ứng dụng"
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
    "question": "Công ty muốn nhân viên đăng nhập AWS bằng tài khoản Active Directory hiện có và truy cập nhiều AWS account một cách tập trung. Dịch vụ nào phù hợp nhất?",
    "options": [
      "AWS IAM Identity Center (AWS Single Sign-On)",
      "Tạo IAM user riêng trong từng account cho mỗi nhân viên",
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
    "question": "Một developer chỉ cần quyền khởi động và dừng EC2 instance trong môi trường dev, nhưng IAM policy hiện tại đang cấp full quyền EC2. Điều này vi phạm nguyên tắc nào và cách khắc phục?",
    "options": [
      "Vi phạm least privilege; nên giới hạn policy chỉ cấp đúng quyền start/stop cần thiết",
      "Vi phạm high availability; nên triển khai thêm vùng khả dụng",
      "Vi phạm elasticity; nên bật Auto Scaling cho instance",
      "Không vi phạm gì; cấp full quyền EC2 là chuẩn cho developer"
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
    "question": "Account A (production) cần cho phép một service trong Account B (CI/CD) deploy tài nguyên mà không tạo IAM user dùng chung. Cơ chế nào phù hợp nhất?",
    "options": [
      "Tạo cross-account IAM role trong Account A và cho phép Account B assume role đó",
      "Tạo IAM user trong Account A rồi gửi access key cho Account B",
      "Bật MFA cho root user của cả hai account",
      "Lưu credentials của Account A vào Secrets Manager của Account B"
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
    "question": "Công ty muốn tăng cường bảo mật cho việc đăng nhập IAM user. Những biện pháp nào sau đây phù hợp? (Chọn 2)",
    "options": [
      "Bật MFA cho các IAM user",
      "Thiết lập password policy yêu cầu độ dài và độ phức tạp tối thiểu",
      "Tắt CloudTrail để giảm log",
      "Chia sẻ một bộ access key chung cho cả phòng",
      "Cấp AdministratorAccess cho mọi user để tránh bị từ chối quyền"
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
    "question": "Ứng dụng cần lưu trữ mật khẩu database và tự động xoay vòng (rotate) định kỳ. Dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "AWS Secrets Manager",
      "AWS IAM",
      "Amazon S3 với mã hóa SSE",
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
    "question": "Một công ty cần thay đổi gói AWS Support hiện tại từ Developer lên Business. Ai có thể thực hiện tác vụ này?",
    "options": [
      "Root user, hoặc IAM identity được cấp quyền support phù hợp, vì đây là tác vụ liên quan đến account-level",
      "Bất kỳ IAM user nào có quyền EC2",
      "Chỉ AWS Support tự thực hiện thay công ty",
      "Chỉ IAM role gắn vào EC2 instance"
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
    "question": "Sự khác biệt cơ bản giữa IAM user và IAM role là gì?",
    "options": [
      "IAM user gắn với một danh tính cố định và có credentials lâu dài; IAM role được assume tạm thời và cấp credentials tạm",
      "IAM role luôn có mật khẩu đăng nhập console còn IAM user thì không",
      "IAM user chỉ dùng cho dịch vụ AWS, IAM role chỉ dùng cho con người",
      "IAM role không thể gắn policy, còn IAM user thì có thể"
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
    "question": "Người dùng đăng nhập bằng Google/Facebook để truy cập một ứng dụng dùng AWS backend, công ty không muốn tạo IAM user cho từng người dùng. Khái niệm nào mô tả giải pháp này?",
    "options": [
      "Identity federation (liên kết danh tính qua nhà cung cấp bên ngoài)",
      "Tạo access key cho mỗi người dùng cuối",
      "Gắn IAM group cho từng người dùng cuối",
      "Bật password policy cho người dùng cuối"
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
    "question": "Tác vụ nào sau đây CHỈ có thể thực hiện bằng root user của AWS account? (Chọn 2)",
    "options": [
      "Đóng (close) AWS account",
      "Thay đổi tên hoặc email gắn với account (account settings)",
      "Khởi động một EC2 instance",
      "Tạo một S3 bucket",
      "Gắn policy cho một IAM group"
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
    "question": "Một IAM policy được gắn vào group có statement 'Allow s3:GetObject', nhưng một policy khác gắn trực tiếp vào user có 'Deny s3:GetObject'. Người dùng có đọc được object không?",
    "options": [
      "Không, vì explicit Deny luôn được ưu tiên hơn Allow",
      "Có, vì policy gắn vào user luôn bị bỏ qua",
      "Có, vì Allow ở group ghi đè Deny ở user",
      "Tùy thuộc vào thứ tự policy được tạo"
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
    "question": "Một nhân viên rời công ty. Hành động nào phù hợp nhất để đảm bảo bảo mật theo best practice IAM?",
    "options": [
      "Vô hiệu hóa/xóa IAM user và thu hồi access key của nhân viên đó",
      "Đổi mật khẩu root user của account",
      "Xóa toàn bộ IAM group trong account",
      "Tắt MFA cho tất cả user còn lại"
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
    "question": "Công ty muốn tránh việc lập trình viên vô tình commit access key tĩnh vào source code khi gọi AWS service từ ứng dụng chạy trên AWS. Cách tiếp cận tốt nhất là gì?",
    "options": [
      "Dùng IAM role gắn vào tài nguyên (EC2, Lambda...) để nhận credentials tạm thời, không dùng key tĩnh",
      "Mã hóa access key rồi commit vào repository",
      "Lưu access key trong biến môi trường trên máy lập trình viên và commit kèm",
      "Tạo một IAM user dùng chung và in key ra log để tiện debug"
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
    "question": "Một công ty vận hành ứng dụng web đứng sau Application Load Balancer và muốn chặn các cuộc tấn công phổ biến ở tầng ứng dụng như SQL injection và cross-site scripting (XSS). Dịch vụ nào phù hợp nhất?",
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
    "question": "Một tổ chức muốn được bảo vệ DDoS cơ bản tự động cho tất cả tài nguyên AWS mà không mất thêm chi phí. Lựa chọn nào đúng?",
    "options": [
      "AWS Shield Standard được bật tự động và miễn phí cho mọi khách hàng AWS",
      "Phải đăng ký AWS Shield Advanced mới có bất kỳ bảo vệ DDoS nào",
      "Cần mua giải pháp DDoS từ AWS Marketplace",
      "Phải cấu hình GuardDuty để bật bảo vệ DDoS"
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
    "question": "Một công ty thương mại điện tử lo ngại bị tấn công DDoS quy mô lớn trong mùa cao điểm và muốn được hỗ trợ chuyên biệt 24/7 từ đội Shield Response Team (SRT) cùng bảo vệ chi phí khi bị tấn công. Giải pháp nào phù hợp?",
    "options": [
      "AWS Shield Advanced",
      "AWS Shield Standard",
      "AWS WAF với rule giới hạn tốc độ",
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
    "question": "Một công ty muốn phát hiện hoạt động bất thường như giao tiếp với địa chỉ IP độc hại, hành vi đào tiền điện tử (crypto mining) trên EC2, và truy cập API đáng ngờ bằng cách phân tích VPC Flow Logs, CloudTrail và DNS logs. Dịch vụ nào nên dùng?",
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
    "question": "Một doanh nghiệp lớn có hàng trăm tài khoản trong AWS Organizations và muốn quản lý tập trung các rule của AWS WAF cùng chính sách Shield Advanced trên tất cả tài khoản, đảm bảo tuân thủ nhất quán. Dịch vụ nào phù hợp?",
    "options": [
      "AWS Firewall Manager",
      "AWS WAF (cấu hình từng tài khoản)",
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
    "question": "Một quản trị viên muốn nhanh chóng kiểm tra các vấn đề bảo mật phổ biến như security group mở cổng quá rộng, S3 bucket có quyền truy cập công khai, và việc bật MFA cho tài khoản root. Công cụ nào của AWS cung cấp các check này sẵn có?",
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
    "question": "Một công ty cần triển khai một giải pháp antivirus và một next-generation firewall của nhà cung cấp bên thứ ba đã được kiểm chứng để chạy trên hạ tầng AWS. Nơi nào phù hợp nhất để tìm và triển khai nhanh các sản phẩm này?",
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
    "question": "Một công ty triển khai ứng dụng web toàn cầu qua Amazon CloudFront và muốn vừa giảm nhẹ tấn công DDoS vừa chặn các request độc hại theo địa lý và mẫu tấn công đã biết. Họ nên kết hợp những dịch vụ nào? (Chọn 2)",
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
    "question": "Một tổ chức đã bật AWS Shield Advanced nhưng muốn chủ động chặn các tấn công ở tầng ứng dụng (tầng 7) đi kèm với một số đợt DDoS. Họ cần thêm thành phần nào để xử lý lưu lượng tầng 7 này?",
    "options": [
      "AWS WAF (khách hàng Shield Advanced được miễn phí dùng WAF trên tài nguyên được bảo vệ)",
      "Amazon GuardDuty để chặn traffic tầng 7",
      "AWS Firewall Manager để tự động chặn DDoS tầng 7",
      "Chỉ riêng Shield Advanced đã đủ chặn mọi tấn công tầng 7"
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
    "question": "Một công ty muốn áp dụng tự động một bộ rule WAF chuẩn cho mọi Application Load Balancer mới được tạo trong tất cả tài khoản, mà không cần ai cấu hình thủ công mỗi lần. Cách tiếp cận nào đáp ứng yêu cầu?",
    "options": [
      "Dùng AWS Firewall Manager để áp chính sách WAF tự động trên các tài nguyên phù hợp",
      "Yêu cầu mỗi đội tự thêm WAF rule khi tạo ALB",
      "Dùng AWS Trusted Advisor để tự gắn WAF",
      "Bật Amazon GuardDuty để tự gắn WAF vào ALB"
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
    "question": "Một nhóm bảo mật muốn cải thiện tư thế bảo mật chủ động: phát hiện hành vi bất thường trên tài khoản, đồng thời nhận khuyến nghị về các sai cấu hình bảo mật phổ biến như MFA root chưa bật. Họ nên dùng những dịch vụ nào? (Chọn 2)",
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
    "question": "Một kỹ sư cần tìm tài liệu hướng dẫn bảo mật, best practice và whitepaper chính thức để thiết kế kiến trúc an toàn trên AWS. Nguồn nào là phù hợp để tìm thông tin bảo mật này?",
    "options": [
      "AWS Security Documentation và whitepaper trên trang web AWS",
      "Amazon GuardDuty console",
      "AWS Shield Advanced console",
      "Chỉ liên hệ Shield Response Team"
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
    "question": "Một kỹ sư vận hành mới được giao tạo nhanh một EC2 instance để thử nghiệm, chỉ làm một lần và muốn thao tác trực quan qua giao diện đồ họa trên trình duyệt. Phương thức truy cập AWS nào phù hợp nhất?",
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
    "question": "Một công ty muốn tạo và tái tạo toàn bộ hạ tầng (VPC, EC2, RDS) một cách nhất quán, có thể version-control bằng Git và triển khai lặp lại nhiều môi trường. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Đội DevOps cần tự động hóa việc tạo hàng loạt S3 bucket trong một script chạy theo lịch (cron) trên máy chủ Linux, không cần viết ứng dụng đầy đủ. Cách tiếp cận nào phù hợp nhất?",
    "options": [
      "Dùng AWS CLI trong shell script",
      "Thao tác thủ công qua AWS Management Console mỗi lần",
      "Dùng AWS SDK for Java trong một ứng dụng web",
      "Liên hệ AWS Support để tạo bucket"
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
    "question": "Một nhóm phát triển đang xây dựng ứng dụng .NET cần upload file lên S3 và đọc dữ liệu DynamoDB trực tiếp từ code, dùng các đối tượng và phương thức của ngôn ngữ lập trình. Lựa chọn nào phù hợp nhất?",
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
    "question": "Một công ty giữ một số ứng dụng nhạy cảm chạy trong data center riêng tại chỗ, đồng thời mở rộng các workload khác lên AWS, kết nối hai môi trường qua VPN/Direct Connect. Mô hình triển khai nào mô tả đúng tình huống này?",
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
    "question": "Một tổ chức muốn áp dụng Infrastructure as Code với CloudFormation. Những lợi ích nào sau đây là đúng? (Chọn 2)",
    "options": [
      "Hạ tầng được mô tả bằng template có thể version-control và tái sử dụng",
      "Triển khai lặp lại nhất quán giữa các môi trường dev/test/prod",
      "CloudFormation tự động giảm giá EC2 so với On-Demand",
      "Template loại bỏ hoàn toàn nhu cầu về IAM permissions",
      "CloudFormation chỉ chạy được trên hạ tầng on-premises"
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
    "question": "Một startup khởi nghiệp hoàn toàn trên AWS, không sở hữu bất kỳ máy chủ vật lý nào, dùng các dịch vụ như Lambda, S3, DynamoDB và RDS. Họ muốn mô tả đúng mô hình triển khai của mình cho nhà đầu tư. Đó là mô hình nào?",
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
    "question": "Hai lập trình viên thực hiện cùng một thao tác: một người bấm nút trong AWS Management Console, người kia chạy lệnh AWS CLI. Cuối cùng, mọi yêu cầu đều được gửi tới đâu để AWS xử lý?",
    "options": [
      "AWS service API endpoints",
      "AWS Management Console backend duy nhất",
      "CloudFormation stack",
      "Một file cấu hình cục bộ trên máy người dùng"
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
    "question": "Một công ty triển khai ứng dụng web trên EC2 và muốn ứng dụng vẫn hoạt động ngay cả khi một trung tâm dữ liệu vật lý gặp sự cố mất điện hoặc cháy. Giải pháp nào phù hợp nhất?",
    "options": [
      "Triển khai EC2 trên nhiều Availability Zones trong cùng một Region",
      "Triển khai tất cả EC2 trong một Availability Zone nhưng dùng instance lớn hơn",
      "Đặt nội dung tĩnh tại các Edge Location của CloudFront",
      "Bật chế độ Multi-Region cho toàn bộ tài khoản AWS"
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
    "question": "Một startup muốn người dùng ở nhiều quốc gia tải video và hình ảnh với độ trễ thấp. Thành phần nào trong global infrastructure của AWS được thiết kế để phục vụ nội dung gần người dùng nhất?",
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
    "question": "Một ngân hàng tại Đức bị luật pháp yêu cầu mọi dữ liệu khách hàng phải được lưu trữ và xử lý trong lãnh thổ quốc gia. Yếu tố nào của AWS global infrastructure giúp họ tuân thủ yêu cầu này?",
    "options": [
      "Chọn một Region nằm trong phạm vi địa lý được phép",
      "Dùng nhiều Availability Zones trong một Region bất kỳ",
      "Phân phối dữ liệu qua các Edge Location toàn cầu",
      "Bật Cross-Region Replication sang nhiều Region"
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
    "question": "Một doanh nghiệp toàn cầu có trụ sở chính ở Mỹ nhưng lượng người dùng lớn tại Nhật Bản đang than phiền ứng dụng phản hồi chậm. Họ muốn giảm độ trễ cho người dùng Nhật bằng cách chạy bản sao của ứng dụng gần họ. Cách tiếp cận nào đúng?",
    "options": [
      "Triển khai ứng dụng tại một Region ở khu vực châu Á - Thái Bình Dương gần Nhật Bản (multi-Region)",
      "Thêm nhiều Availability Zones cho ứng dụng đang chạy ở Region Mỹ",
      "Tăng kích thước EC2 instance ở Region Mỹ",
      "Chuyển toàn bộ ứng dụng sang chạy hoàn toàn trên Edge Location"
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
    "question": "Trong một buổi review kiến trúc, một kỹ sư hỏi vì sao đặt hai EC2 instance ở hai Availability Zones khác nhau lại an toàn hơn đặt trong cùng một AZ. Câu trả lời chính xác nhất là gì?",
    "options": [
      "Các Availability Zones được cách ly về nguồn điện, làm mát và mạng vật lý, nên không chia sẻ single point of failure",
      "Các Availability Zones nằm ở các quốc gia khác nhau nên tuân thủ data sovereignty tốt hơn",
      "Mỗi Availability Zone là một Edge Location nên giảm latency cho người dùng",
      "Các Availability Zones tự động chạy ở nhiều Region khác nhau"
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
    "question": "Một công ty thương mại điện tử cần xây dựng kế hoạch Disaster Recovery để ứng dụng vẫn phục vụ được ngay cả khi toàn bộ một Region của AWS bị gián đoạn trên diện rộng. Những lựa chọn nào dưới đây phù hợp với mục tiêu này? (Chọn 2)",
    "options": [
      "Triển khai bản sao ứng dụng tại một Region thứ hai (multi-Region) và định tuyến lưu lượng khi Region chính lỗi",
      "Bật Cross-Region Replication cho dữ liệu (ví dụ S3) sang Region dự phòng",
      "Phân bổ các instance qua nhiều Availability Zones trong cùng một Region",
      "Tăng số lượng Edge Location phục vụ ứng dụng",
      "Dùng một instance lớn hơn (vertical scaling) trong Region chính"
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
    "question": "Một nhóm vận hành cần một cơ sở dữ liệu quan hệ có khả năng tự động chuyển sang bản dự phòng (failover) khi node chính gặp sự cố hạ tầng, mà không cần triển khai sang Region khác. Cấu hình nào đáp ứng tốt nhất?",
    "options": [
      "Amazon RDS với cấu hình Multi-AZ",
      "Amazon RDS chạy trong một Availability Zone duy nhất",
      "Phân phối truy vấn cơ sở dữ liệu qua Edge Location",
      "Sao chép cơ sở dữ liệu thủ công sang một Region khác mỗi đêm"
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
    "question": "Một kiến trúc sư phân loại các thành phần của AWS global infrastructure theo mục đích sử dụng. Phát biểu nào dưới đây mô tả ĐÚNG mối quan hệ và vai trò của chúng?",
    "options": [
      "Một Region chứa nhiều Availability Zones cách ly để đạt HA, còn Edge Location nằm phân tán toàn cầu để phục vụ nội dung độ trễ thấp",
      "Một Availability Zone chứa nhiều Region, và mỗi Region là một Edge Location",
      "Edge Location chứa nhiều Availability Zones, dùng để chạy cơ sở dữ liệu chính",
      "Một Region chỉ gồm đúng một Availability Zone, và HA đạt được bằng cách dùng nhiều Edge Location"
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
    "question": "Một công ty muốn chạy ứng dụng web truyền thống trên máy ảo, có toàn quyền kiểm soát hệ điều hành và lựa chọn cấu hình CPU/RAM linh hoạt. Dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "Amazon EC2",
      "AWS Lambda",
      "Amazon S3",
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
    "question": "Một ứng dụng phân tích dữ liệu in-memory cần lượng RAM rất lớn so với CPU để xử lý các tập dữ liệu khổng lồ trong bộ nhớ. Họ nên chọn EC2 instance family nào?",
    "options": [
      "Memory optimized (ví dụ R family)",
      "Compute optimized (ví dụ C family)",
      "Storage optimized (ví dụ I family)",
      "General purpose (ví dụ T family)"
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
    "question": "Một nhóm khoa học cần chạy mô phỏng HPC và mã hóa video đòi hỏi hiệu năng CPU cao liên tục, trong khi nhu cầu RAM ở mức vừa phải. EC2 instance family nào phù hợp nhất?",
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
    "question": "Một công ty triển khai data warehouse cần truy cập tuần tự thông lượng cao tới hàng chục TB dữ liệu trên đĩa cục bộ với chi phí trên mỗi GB thấp. EC2 instance family nào phù hợp nhất?",
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
    "question": "Một startup muốn chạy hàm xử lý ảnh kích hoạt mỗi khi người dùng upload ảnh lên S3, không muốn quản lý hay vận hành bất kỳ máy chủ nào và chỉ trả tiền theo thời gian chạy. Giải pháp nào phù hợp nhất?",
    "options": [
      "AWS Lambda",
      "Amazon EC2 với Auto Scaling",
      "Amazon ECS trên EC2",
      "AWS Batch trên EC2"
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
    "question": "Một công ty đã đóng gói ứng dụng thành Docker container và muốn chạy container mà KHÔNG cần quản lý, vá lỗi hay scale các EC2 instance bên dưới. Lựa chọn nào đáp ứng tốt nhất?",
    "options": [
      "AWS Fargate",
      "Amazon ECS trên EC2 launch type",
      "Amazon EC2 cài Docker thủ công",
      "Amazon EKS với managed node group EC2"
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
    "question": "Một tổ chức đã chuẩn hóa trên Kubernetes và muốn dùng một dịch vụ container orchestration tương thích Kubernetes được AWS quản lý. Dịch vụ nào phù hợp nhất?",
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
    "question": "Lưu lượng truy cập của một ứng dụng web tăng cao vào ban ngày và giảm mạnh vào ban đêm. Công ty muốn tự động thêm EC2 khi tải tăng và bớt khi tải giảm để tối ưu chi phí và hiệu năng. Giải pháp nào cung cấp tính elasticity này?",
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
    "question": "Một công ty chạy nhiều EC2 instance phục vụ cùng một ứng dụng web và cần phân phối lưu lượng đến (incoming traffic) đều giữa các instance, đồng thời ngừng gửi request tới instance bị lỗi. Dịch vụ nào đáp ứng nhu cầu này?",
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
    "question": "Một công ty muốn xây kiến trúc web có khả năng chịu lỗi và co giãn: tự động tăng/giảm số lượng EC2 theo tải, đồng thời phân phối đều request đến các instance đang khỏe mạnh. Họ nên kết hợp những thành phần nào? (Chọn 2)",
    "options": [
      "Amazon EC2 Auto Scaling",
      "Elastic Load Balancing (ELB)",
      "AWS Lambda thay cho toàn bộ EC2",
      "Amazon S3 để chạy mã ứng dụng",
      "Single Dedicated Host duy nhất"
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
    "question": "Một công ty đang chạy ứng dụng web cần một relational database fully managed, hỗ trợ MySQL và PostgreSQL engine, đồng thời muốn AWS tự xử lý patching, backup và failover. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một ứng dụng gaming cần lưu profile người chơi với độ trễ single-digit millisecond ở quy mô hàng triệu request mỗi giây, không cần schema cố định. Dịch vụ database nào phù hợp nhất?",
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
    "question": "Một website thương mại điện tử có cùng một sản phẩm bán chạy bị truy vấn lặp đi lặp lại từ database, gây tải cao và tăng độ trễ. Công ty muốn giảm tải đọc và cải thiện thời gian phản hồi. Giải pháp nào phù hợp nhất?",
    "options": [
      "Thêm Amazon ElastiCache làm lớp in-memory cache trước database",
      "Chuyển database sang Amazon Redshift",
      "Bật Multi-AZ deployment cho RDS",
      "Di chuyển dữ liệu sang Amazon DynamoDB"
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
    "question": "Một công ty muốn chạy báo cáo phân tích phức tạp (analytics) trên hàng petabyte dữ liệu lịch sử bằng truy vấn SQL, sử dụng columnar storage để tối ưu tốc độ. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty đang di chuyển database Oracle on-premises lên AWS và muốn tối thiểu downtime trong quá trình migration, đồng thời database nguồn vẫn hoạt động. Dịch vụ nào hỗ trợ thực hiện việc này?",
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
    "question": "Một công ty muốn migrate database từ Oracle sang Amazon Aurora PostgreSQL. Vì engine nguồn và đích khác nhau, họ cần chuyển đổi schema và stored procedures trước khi di chuyển dữ liệu. Công cụ nào phù hợp cho việc chuyển đổi schema này?",
    "options": [
      "AWS Schema Conversion Tool (SCT)",
      "AWS Database Migration Service (DMS) một mình",
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
    "question": "Một startup cần một relational database trên AWS với hiệu năng cao, tương thích MySQL/PostgreSQL, sao chép dữ liệu tự động qua nhiều Availability Zone và khả năng tự động scale storage. Những phát biểu nào về Amazon Aurora là ĐÚNG? (Chọn 2)",
    "options": [
      "Aurora tương thích với MySQL và PostgreSQL",
      "Aurora tự động sao chép dữ liệu qua nhiều Availability Zone",
      "Aurora là dịch vụ NoSQL key-value",
      "Aurora yêu cầu khách hàng tự quản lý OS patching trên EC2",
      "Aurora là dịch vụ in-memory cache thay thế ElastiCache"
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
    "question": "Một công ty cần chạy một database engine cũ với phiên bản đặc thù mà Amazon RDS không hỗ trợ, và họ muốn toàn quyền kiểm soát hệ điều hành cũng như cấu hình database. Cách triển khai nào phù hợp nhất?",
    "options": [
      "Tự cài database trên Amazon EC2",
      "Sử dụng Amazon RDS",
      "Sử dụng Amazon DynamoDB",
      "Sử dụng Amazon Aurora Serverless"
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
    "question": "Một công ty triển khai web server trong VPC và muốn các instance trong private subnet có thể tải bản cập nhật phần mềm từ Internet, nhưng KHÔNG cho phép kết nối từ Internet vào các instance này. Giải pháp nào phù hợp?",
    "options": [
      "NAT Gateway đặt trong public subnet",
      "Internet Gateway gắn trực tiếp vào private subnet",
      "VPC Peering tới một VPC khác",
      "Direct Connect tới on-premises"
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
    "question": "Một quản trị viên cấu hình security group cho phép inbound HTTPS (port 443). Người dùng phản ánh rằng response trả về vẫn hoạt động bình thường dù không có rule outbound tương ứng. Đặc tính nào của security group giải thích điều này?",
    "options": [
      "Security group là stateful, tự động cho phép traffic phản hồi của kết nối đã được phép",
      "Security group là stateless nên cần rule cho cả hai chiều",
      "Security group đánh giá rule theo thứ tự số (rule number)",
      "Security group áp dụng ở cấp subnet"
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
    "question": "Một công ty cần chặn một dải địa chỉ IP độc hại cụ thể ở mức toàn bộ subnet, đồng thời cho phép tất cả traffic khác. Lớp bảo mật nào trong VPC phù hợp nhất để áp dụng quy tắc deny rõ ràng (explicit deny)?",
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
    "question": "Một startup muốn đăng ký tên miền cho website và định tuyến lưu lượng người dùng tới Application Load Balancer của mình. Dịch vụ AWS nào cung cấp DNS và đăng ký domain?",
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
    "question": "Một công ty media phục vụ video và hình ảnh tĩnh cho người dùng toàn cầu, muốn giảm độ trễ bằng cách lưu nội dung ở các edge location gần người dùng. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon CloudFront",
      "Amazon Route 53",
      "AWS Global Accelerator",
      "Elastic Load Balancing"
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
    "question": "Một ngân hàng cần kết nối on-premises tới AWS với băng thông ổn định, độ trễ thấp nhất quán và không đi qua public Internet để truyền dữ liệu nhạy cảm liên tục. Giải pháp nào đáp ứng tốt nhất?",
    "options": [
      "AWS Direct Connect",
      "AWS Site-to-Site VPN qua Internet",
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
    "question": "Một kiến trúc sư so sánh security group và network ACL khi thiết kế VPC. Những phát biểu nào sau đây ĐÚNG? (Chọn 2)",
    "options": [
      "Security group là stateful và được gắn ở cấp instance/ENI",
      "Network ACL là stateless và được áp dụng ở cấp subnet",
      "Security group hỗ trợ cả allow và deny rule",
      "Network ACL không cần rule cho return traffic vì là stateful",
      "Security group được đánh giá theo thứ tự rule number"
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
    "question": "Một công ty muốn cải thiện độ sẵn sàng bằng cách triển khai ứng dụng trên hai region và tự động chuyển hướng người dùng sang region khỏe mạnh khi một region gặp sự cố. Tính năng nào của Route 53 hỗ trợ điều này?",
    "options": [
      "Route 53 health checks kết hợp failover routing policy",
      "CloudFront origin failover",
      "VPC Peering giữa hai region",
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
    "question": "Một công ty lưu trữ ảnh sản phẩm được truy cập thường xuyên và cần độ sẵn sàng cao. Họ muốn lưu các object (file) mà không quản lý server. Loại storage nào của AWS phù hợp nhất?",
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
    "question": "Một công ty cần lưu dữ liệu backup truy cập rất hiếm (1-2 lần/năm) và chấp nhận thời gian khôi phục tới 12-48 giờ để có chi phí THẤP NHẤT. Storage class nào phù hợp?",
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
    "question": "Một công ty có dữ liệu với mẫu truy cập KHÔNG dự đoán được và muốn AWS tự động chuyển dữ liệu giữa các tier để tối ưu chi phí mà không ảnh hưởng hiệu năng. Giải pháp nào phù hợp nhất?",
    "options": [
      "S3 Standard và viết script chuyển thủ công",
      "S3 Intelligent-Tiering",
      "S3 One Zone-IA",
      "Cấu hình lifecycle chuyển sang Glacier sau 30 ngày"
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
    "question": "Một công ty lưu các bản sao thumbnail có thể tạo lại dễ dàng từ ảnh gốc, ít khi truy cập. Họ muốn giảm chi phí và chấp nhận lưu trong một Availability Zone duy nhất vì dữ liệu không quan trọng. Storage class nào tối ưu chi phí nhất?",
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
    "question": "Một công ty muốn tự động chuyển log sang Standard-IA sau 30 ngày và sang Glacier sau 90 ngày, rồi xóa sau 365 ngày. Tính năng nào của S3 thực hiện điều này?",
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
    "question": "Một ứng dụng database trên EC2 cần một volume lưu trữ block hiệu năng cao, gắn vào instance và tồn tại độc lập khi instance dừng. Dịch vụ nào phù hợp?",
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
    "question": "Nhiều EC2 instance Linux trong cùng VPC cần đồng thời đọc/ghi vào một file system chung dùng giao thức NFS, tự động co giãn dung lượng. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty chạy ứng dụng Windows yêu cầu file share dùng giao thức SMB và tích hợp Active Directory. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một công ty có trung tâm dữ liệu on-premises muốn mở rộng lưu trữ lên đám mây một cách liền mạch, để ứng dụng on-prem truy cập lưu trữ AWS qua giao thức file/iSCSI tiêu chuẩn với cache cục bộ. Dịch vụ nào phù hợp?",
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
    "question": "Một công ty muốn quản lý backup TẬP TRUNG cho nhiều dịch vụ AWS (EBS, RDS, DynamoDB, EFS) với chính sách thống nhất và tuân thủ compliance. Những phát biểu nào về AWS Backup là ĐÚNG? (Chọn 2)",
    "options": [
      "AWS Backup quản lý và tự động hóa backup tập trung cho nhiều dịch vụ AWS",
      "AWS Backup cho phép định nghĩa backup plan với lịch và retention áp dụng qua tag",
      "AWS Backup chỉ hỗ trợ backup cho Amazon EBS",
      "AWS Backup là một storage class của S3",
      "AWS Backup thay thế hoàn toàn nhu cầu dùng S3 Versioning"
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
    "question": "Một công ty muốn tự động phân tích hình ảnh do người dùng tải lên để phát hiện nội dung không phù hợp (NSFW) và nhận diện đối tượng trong ảnh mà không cần huấn luyện mô hình machine learning. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một ứng dụng đọc sách cần chuyển nội dung văn bản thành giọng nói tự nhiên để người dùng nghe. Dịch vụ AWS nào phù hợp?",
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
    "question": "Một công ty muốn xây dựng chatbot hỗ trợ khách hàng có khả năng hiểu ngôn ngữ tự nhiên và xử lý hội thoại bằng cả văn bản lẫn giọng nói. Dịch vụ AWS nào nên dùng?",
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
    "question": "Một doanh nghiệp có hàng nghìn tài liệu nội bộ và muốn nhân viên tìm kiếm thông tin bằng câu hỏi ngôn ngữ tự nhiên, trả về câu trả lời chính xác thay vì danh sách từ khóa. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một nhóm phân tích muốn chạy truy vấn SQL trực tiếp trên các file log lưu trong Amazon S3 mà không cần tải dữ liệu vào database hay quản lý máy chủ. Dịch vụ nào phù hợp?",
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
    "question": "Một công ty cần xây dựng pipeline ETL serverless để khám phá, chuẩn bị và biến đổi dữ liệu từ nhiều nguồn trước khi nạp vào data warehouse, đồng thời duy trì một data catalog. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một công ty cần thu thập và xử lý dữ liệu clickstream từ website theo thời gian thực để phân tích hành vi người dùng ngay khi sự kiện xảy ra. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một công ty muốn xây dựng giải pháp phân tích phản hồi khách hàng đa quốc gia: tự động dịch các đánh giá tiếng nước ngoài sang tiếng Anh, sau đó phân tích cảm xúc (sentiment) và trích xuất thực thể từ văn bản. Những dịch vụ AWS nào nên kết hợp sử dụng? (Chọn 2)",
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
    "question": "Một công ty muốn gửi cùng một thông báo (notification) đến nhiều hệ thống đăng ký (subscribers) cùng lúc theo mô hình pub/sub, ví dụ gửi đồng thời tới email, SMS và một hàng đợi xử lý. Dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "Amazon SNS",
      "Amazon SQS",
      "Amazon Connect",
      "Amazon SES"
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
    "question": "Một ứng dụng cần tách rời (decouple) thành phần tiếp nhận đơn hàng với thành phần xử lý đơn hàng, để khi lượng đơn tăng đột biến thì các đơn được đệm lại và xử lý dần, tránh mất dữ liệu khi consumer bận. Giải pháp nào phù hợp nhất?",
    "options": [
      "Dùng Amazon SQS làm hàng đợi đệm giữa hai thành phần",
      "Dùng Amazon SNS để push trực tiếp đơn hàng tới consumer",
      "Dùng Amazon SES để email đơn hàng cho consumer",
      "Dùng AWS X-Ray để truyền đơn hàng giữa các thành phần"
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
    "question": "Một công ty muốn điều phối (route) các sự kiện từ nhiều ứng dụng SaaS và dịch vụ AWS tới các target khác nhau dựa trên quy tắc lọc sự kiện (event rules), để xây dựng kiến trúc hướng sự kiện (event-driven). Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon EventBridge",
      "Amazon SQS",
      "AWS CodePipeline",
      "Amazon AppStream 2.0"
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
    "question": "Một tổ chức muốn cung cấp cho nhân viên làm việc từ xa các máy tính desktop ảo (virtual desktops) chạy trên đám mây, được quản lý tập trung, có hệ điều hành đầy đủ để họ làm việc hằng ngày. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon WorkSpaces",
      "Amazon AppStream 2.0",
      "Amazon Connect",
      "AWS Amplify"
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
    "question": "Một startup muốn nhanh chóng xây dựng backend GraphQL có thời gian thực và đồng bộ dữ liệu offline cho ứng dụng mobile, đồng thời lưu trữ và tự động build/deploy phần frontend web. Cặp dịch vụ nào phù hợp nhất cho nhu cầu này?",
    "options": [
      "AWS AppSync cho API GraphQL và AWS Amplify cho phát triển/host frontend",
      "Amazon SQS cho API GraphQL và Amazon SES cho frontend",
      "AWS X-Ray cho API GraphQL và AWS CodeBuild cho frontend",
      "Amazon Connect cho API GraphQL và Amazon EventBridge cho frontend"
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
    "question": "Một nhóm DevOps muốn xây dựng quy trình phát hành phần mềm tự động trên AWS: biên dịch và kiểm thử mã nguồn, sau đó điều phối toàn bộ các giai đoạn build–test–deploy, và cuối cùng phân tích hiệu năng cùng truy vết (trace) request giữa các microservice để gỡ lỗi. Hãy chọn các dịch vụ phù hợp (chọn nhiều).",
    "options": [
      "AWS CodeBuild để biên dịch và chạy kiểm thử mã nguồn",
      "AWS CodePipeline để điều phối các giai đoạn build–test–deploy",
      "AWS X-Ray để truy vết và phân tích request giữa các microservice",
      "Amazon AppStream 2.0 để biên dịch mã nguồn",
      "Amazon SES để điều phối pipeline phát hành"
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
    "question": "Một công ty chạy một workload xử lý batch có thể bị gián đoạn (interruptible) và muốn tiết kiệm tối đa chi phí EC2. Công việc không cần chạy liên tục và có thể tự khởi động lại khi bị dừng. Mô hình giá nào phù hợp nhất?",
    "options": [
      "Spot Instances",
      "On-Demand Instances",
      "Reserved Instances (3 năm All Upfront)",
      "Dedicated Hosts"
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
    "question": "Một công ty chuyển dữ liệu (data ingest) lớn từ trung tâm dữ liệu của họ lên Amazon S3 và lo lắng về chi phí. Họ muốn biết chi phí của lưu lượng data transfer này. Phát biểu nào ĐÚNG?",
    "options": [
      "Inbound data transfer vào AWS thường miễn phí (free)",
      "Inbound data transfer vào AWS bị tính phí cao hơn outbound",
      "Mọi data transfer đều bị tính phí như nhau bất kể chiều",
      "Data transfer chỉ miễn phí nếu dùng AWS Direct Connect"
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
    "question": "Một công ty có workload web ổn định, chạy 24/7 trong nhiều năm và muốn linh hoạt thay đổi giữa nhiều loại instance family, kích thước, OS và Region trong khi vẫn được giảm giá đáng kể so với On-Demand. Lựa chọn nào phù hợp nhất?",
    "options": [
      "Compute Savings Plans",
      "Standard Reserved Instances",
      "Spot Instances",
      "On-Demand Capacity Reservations"
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
    "question": "Một công ty dùng AWS Organizations với consolidated billing. Một tài khoản thành viên mua Reserved Instances nhưng không sử dụng hết. Điều gì xảy ra với phần Reserved Instance chưa dùng theo mặc định?",
    "options": [
      "Lợi ích giảm giá có thể được chia sẻ (shared) cho các tài khoản khác trong tổ chức nếu RI sharing được bật",
      "Phần chưa dùng bị hủy ngay lập tức và hoàn tiền",
      "Reserved Instance không bao giờ áp dụng được trong Organizations",
      "Mọi tài khoản phải mua RI riêng, không thể chia sẻ trong mọi trường hợp"
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
    "question": "Một công ty có yêu cầu license phần mềm theo socket/core (BYOL) buộc phải chạy trên máy chủ vật lý chuyên dụng và cần khả năng nhìn thấy thông tin phần cứng vật lý để tuân thủ. Giải pháp EC2 nào đáp ứng?",
    "options": [
      "Dedicated Hosts",
      "Dedicated Instances",
      "Spot Instances",
      "On-Demand Capacity Reservations"
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
    "question": "Một công ty muốn đảm bảo luôn có đủ năng lực EC2 trong một Availability Zone cụ thể cho sự kiện quan trọng sắp tới, không lo bị thiếu capacity, nhưng KHÔNG bắt buộc cần giảm giá dài hạn. Lựa chọn nào phù hợp nhất?",
    "options": [
      "On-Demand Capacity Reservations",
      "Spot Instances",
      "Compute Savings Plans",
      "Standard Reserved Instances bán lại trên Marketplace"
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
    "question": "Một kiến trúc sư đặt một EC2 instance ở us-east-1 truy vấn một RDS database ở eu-west-1. Họ nhận thấy hóa đơn data transfer cao. Cách hiệu quả nhất để giảm chi phí data transfer này là gì?",
    "options": [
      "Đặt EC2 và RDS trong cùng một Region (và cùng AZ nếu được)",
      "Chuyển EC2 sang Spot Instances",
      "Mua Reserved Instances cho EC2",
      "Bật S3 Intelligent-Tiering"
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
    "question": "Một công ty đang tối ưu chi phí Amazon S3 cho dữ liệu có pattern truy cập khác nhau. Hãy chọn HAI lựa chọn lưu trữ/tier phù hợp với mô tả về chi phí.",
    "options": [
      "S3 Glacier Deep Archive có chi phí lưu trữ thấp nhất nhưng thời gian truy xuất dài nhất",
      "S3 Intelligent-Tiering tự động chuyển object giữa các tier truy cập để tối ưu chi phí mà không cần thao tác thủ công",
      "S3 Standard có chi phí lưu trữ thấp hơn S3 Glacier Deep Archive",
      "S3 One Zone-IA luôn đắt hơn S3 Standard do lưu nhiều bản sao hơn",
      "Mọi storage class của S3 đều có cùng mức phí lưu trữ mỗi GB"
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
    "question": "Một công ty cam kết Savings Plans nhưng muốn mức giảm giá CAO NHẤT có thể và sẵn sàng cố định loại instance family cùng Region cụ thể trong 1 năm. Loại Savings Plans nào phù hợp nhất?",
    "options": [
      "EC2 Instance Savings Plans",
      "Compute Savings Plans",
      "Standard Reserved Instances chuyển nhượng (Convertible)",
      "Spot Savings Plans"
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
    "question": "Một công ty muốn nhận cảnh báo qua email khi chi phí AWS hàng tháng vượt ngưỡng 5.000 USD đã đặt trước, để chủ động kiểm soát ngân sách. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một kiến trúc sư đang lên kế hoạch di chuyển workload lên AWS và cần ước tính chi phí hàng tháng cho EC2, S3 và RDS TRƯỚC khi triển khai bất kỳ tài nguyên nào. Công cụ nào nên dùng?",
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
    "question": "Một tập đoàn có 12 tài khoản AWS riêng cho từng phòng ban. Họ muốn nhận một hóa đơn duy nhất và tận dụng giảm giá theo bậc khối lượng (volume discount) khi gộp mức sử dụng của tất cả tài khoản. Giải pháp nào phù hợp?",
    "options": [
      "Dùng AWS Organizations với consolidated billing",
      "Tạo một AWS Budget chung cho tất cả tài khoản",
      "Bật Cost and Usage Report cho từng tài khoản",
      "Mua Reserved Instances trong tài khoản quản lý"
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
    "question": "Một công ty muốn phân bổ chi phí AWS theo từng dự án và phòng ban để biết chính xác bộ phận nào tiêu tốn bao nhiêu. Họ cần gắn nhãn metadata vào tài nguyên và kích hoạt chúng để xuất hiện trong báo cáo chi phí. Giải pháp nào đúng?",
    "options": [
      "Sử dụng cost allocation tags và kích hoạt chúng trong Billing console",
      "Tạo nhiều linked account, mỗi dự án một tài khoản, rồi đọc Cost Explorer",
      "Bật AWS Pricing Calculator cho mỗi phòng ban",
      "Dùng IAM groups để tách chi phí theo người dùng"
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
    "question": "Bộ phận tài chính cần dữ liệu chi phí và sử dụng chi tiết NHẤT, ở mức từng dòng (line item) theo giờ, để nạp vào hệ thống phân tích nội bộ trên Amazon Athena và Amazon Redshift. Nguồn dữ liệu nào phù hợp nhất?",
    "options": [
      "AWS Cost and Usage Report (CUR) lưu vào S3",
      "AWS Cost Explorer xuất CSV",
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
    "question": "Một công ty muốn phân tích xu hướng chi phí trong 6 tháng qua, lọc theo dịch vụ và region, đồng thời xem dự báo (forecast) chi phí cho 3 tháng tới bằng giao diện biểu đồ trực quan. Công cụ nào phù hợp nhất?",
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
    "question": "Một tổ chức dùng AWS Organizations với consolidated billing trên nhiều tài khoản. Những phát biểu nào về cơ chế tính phí hợp nhất là ĐÚNG? (Chọn 2)",
    "options": [
      "Mức sử dụng của tất cả tài khoản được gộp lại để hưởng giá theo bậc khối lượng (volume tiering)",
      "Lợi ích Reserved Instances và Savings Plans có thể được chia sẻ giữa các tài khoản trong tổ chức",
      "Mỗi tài khoản thành viên vẫn nhận một hóa đơn riêng từ AWS",
      "Consolidated billing tự động chuyển toàn bộ tài nguyên về một tài khoản duy nhất",
      "Consolidated billing yêu cầu mua Savings Plans mới có hiệu lực"
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
    "question": "Một startup vừa tạo tài khoản AWS đầu tiên và lo lắng về việc chi tiêu vượt mức trong tháng đầu. Họ muốn thiết lập một giới hạn ngân sách 100 USD và được thông báo khi chi phí thực tế đạt 80% giới hạn. Nên dùng gì?",
    "options": [
      "AWS Budgets với cost budget và alert ở 80%",
      "AWS Cost Explorer với báo cáo hằng ngày",
      "AWS Pricing Calculator để khóa chi tiêu ở 100 USD",
      "AWS Organizations để giới hạn chi tiêu tài khoản"
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
    "question": "Một startup nhỏ chạy workload thử nghiệm trên AWS và muốn có khả năng mở ticket hỗ trợ kỹ thuật qua email trong giờ làm việc với chi phí thấp nhất có thể. Họ chấp nhận thời gian phản hồi chậm. Support plan nào phù hợp nhất?",
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
    "question": "Một công ty vận hành ứng dụng production quan trọng cần một AWS điểm liên hệ chuyên trách (dedicated) hiểu rõ kiến trúc của họ, hỗ trợ proactive và quyền truy cập Concierge Support cho các vấn đề billing/account. Họ muốn chi phí thấp hơn gói cao nhất nhưng vẫn có TAM. Lựa chọn nào phù hợp?",
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
    "question": "Một tổ chức muốn nhận khuyến nghị tự động để giảm chi phí (idle resources), cải thiện bảo mật (security groups mở rộng), tăng fault tolerance và kiểm tra service quotas. Công cụ AWS nào cung cấp các kiểm tra (checks) này?",
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
    "question": "Đội vận hành của một công ty cần biết liệu sự cố mới phát sinh có ảnh hưởng trực tiếp đến các tài nguyên AWS cụ thể của họ hay không, và muốn nhận thông báo cá nhân hóa về maintenance theo lịch ảnh hưởng tới account của mình. Dịch vụ nào đáp ứng?",
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
    "question": "Một công ty đăng ký AWS Enterprise Support. Những lợi ích nào sau đây CHỈ có/đặc trưng của Enterprise (so với Business)? (Chọn 2)",
    "options": [
      "Technical Account Manager (TAM) chuyên trách (designated)",
      "AWS Concierge Support team",
      "Hỗ trợ kỹ thuật 24/7 qua phone, chat và email",
      "Truy cập đầy đủ tất cả các Trusted Advisor checks",
      "Mở case account và billing không giới hạn"
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
    "question": "Một doanh nghiệp cần một đối tác bên ngoài đã được AWS chứng nhận để thiết kế và triển khai giải pháp di chuyển (migration) lên cloud, hoặc mua phần mềm của bên thứ ba đã tích hợp sẵn với AWS. Họ nên tìm đến đâu?",
    "options": [
      "AWS Partner Network (APN) và AWS Marketplace",
      "AWS re:Post",
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
    "question": "Một công ty đang đăng ký Business Support gặp sự cố khiến hệ thống production bị xuống (production system down). Đây là mức severity cao nhất mà gói Business hỗ trợ. Theo cam kết của AWS Support, thời gian phản hồi mục tiêu (response time) cho trường hợp này là gì?",
    "options": [
      "Production system down — phản hồi mục tiêu < 1 giờ",
      "Production system impaired — phản hồi mục tiêu < 4 giờ",
      "General guidance — phản hồi mục tiêu < 24 giờ",
      "Production system down — phản hồi mục tiêu < 15 phút"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Với Business Support, 'production system down' là mức severity cao nhất và có response time mục tiêu dưới 1 giờ; mức 15 phút ('business-critical system down') chỉ áp dụng cho Enterprise, còn On-Ramp dùng 30 phút.\n✓ Production system down — < 1 giờ — đúng, đây là cam kết của Business Support cho mức nghiêm trọng nhất của gói này.\n✗ Production system impaired — < 4 giờ — đó là mức severity thấp hơn, hệ thống bị suy giảm chứ chưa xuống hoàn toàn.\n✗ General guidance — < 24 giờ — mức severity thấp nhất, không phù hợp với production-down.\n✗ Production system down — < 15 phút — 15 phút là cam kết cho 'business-critical system down' của Enterprise Support, không phải Business.",
    "domain": 4,
    "mock": 3
  }
,
  {"id":"clf-ext-001","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một developer muốn nhanh chóng triển khai một blog WordPress nhỏ với chi phí cố định, dễ dự đoán hàng tháng, đã bao gồm máy ảo, dung lượng lưu trữ và truyền dữ liệu trong một gói gọn. Dịch vụ nào phù hợp nhất?","options":["Amazon Lightsail","AWS Batch","Amazon EC2 với Reserved Instances","AWS Outposts"],"correctIndices":[0],"explanation":"Lightsail cung cấp gói trọn gói (VM, storage, transfer) với giá cố định hàng tháng, lý tưởng cho dự án nhỏ và người mới.\n✓ Amazon Lightsail: giá bundle cố định, dễ dự đoán, triển khai nhanh WordPress.\n✗ AWS Batch: dành cho xử lý batch job số lượng lớn, không phải web hosting.\n✗ EC2 với Reserved Instances: vẫn cần tự cấu hình nhiều thành phần, không trọn gói.\n✗ AWS Outposts: hạ tầng AWS đặt tại on-premises, chi phí lớn, không phù hợp blog nhỏ.","domain":3},
  {"id":"clf-ext-002","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Công ty cần chạy hàng nghìn job tính toán khoa học theo lô (batch), tự động cấp phát và thu hồi tài nguyên compute tùy theo khối lượng công việc, mà không phải quản lý hệ thống hàng đợi và scheduler. Dịch vụ nào phù hợp?","options":["AWS Batch","Amazon Lightsail","AWS App Runner","AWS Elastic Beanstalk"],"correctIndices":[0],"explanation":"AWS Batch tự động provision tài nguyên compute theo số lượng và yêu cầu của batch job, quản lý queue và scheduling thay bạn.\n✓ AWS Batch: chuyên cho batch computing quy mô lớn, tự động scale tài nguyên.\n✗ Amazon Lightsail: VM đơn giản giá cố định, không phải batch processing.\n✗ AWS App Runner: chạy web app/container service, không tối ưu cho batch job.\n✗ Elastic Beanstalk: triển khai web application, không phải hệ thống batch job khoa học.","domain":3},
  {"id":"clf-ext-003","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một nhóm phát triển muốn upload code ứng dụng web (Java) và để AWS tự động lo việc cung cấp EC2, load balancer, Auto Scaling và monitoring, nhưng vẫn giữ quyền truy cập đầy đủ vào các tài nguyên bên dưới khi cần tinh chỉnh. Dịch vụ nào phù hợp nhất?","options":["AWS Elastic Beanstalk","AWS Lambda","Amazon Lightsail","AWS Batch"],"correctIndices":[0],"explanation":"Elastic Beanstalk là PaaS: bạn upload code, nó tự tạo và quản lý hạ tầng (EC2, ELB, Auto Scaling) nhưng vẫn cho phép truy cập/điều chỉnh tài nguyên bên dưới.\n✓ Elastic Beanstalk: tự động hóa triển khai mà vẫn giữ quyền kiểm soát hạ tầng.\n✗ AWS Lambda: serverless, không cho truy cập trực tiếp EC2/ELB bên dưới.\n✗ Amazon Lightsail: VM đơn giản, không tự động tạo ELB và Auto Scaling cho app.\n✗ AWS Batch: dành cho batch job, không phải web app PaaS.","domain":3},
  {"id":"clf-ext-004","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một bệnh viện cần chạy workload trên hạ tầng AWS nhưng do yêu cầu về độ trễ cực thấp tới thiết bị tại chỗ và quy định lưu trữ dữ liệu trong phạm vi tòa nhà, họ phải đặt phần cứng AWS ngay trong data center của mình, được AWS quản lý. Giải pháp nào phù hợp?","options":["AWS Outposts","AWS Local Zones","Amazon Lightsail","Elastic Beanstalk"],"correctIndices":[0],"explanation":"AWS Outposts mang phần cứng và dịch vụ AWS đặt ngay tại on-premises của khách hàng, phù hợp yêu cầu low latency cục bộ và data residency tại chỗ.\n✓ AWS Outposts: rack AWS đặt trong data center khách hàng, do AWS quản lý.\n✗ AWS Local Zones: hạ tầng AWS đặt gần khu vực đô thị, không nằm trong tòa nhà khách hàng.\n✗ Amazon Lightsail: chạy trên cloud AWS, không đặt tại chỗ.\n✗ Elastic Beanstalk: dịch vụ triển khai trên cloud, không giải quyết yêu cầu on-premises.","domain":3},
  {"id":"clf-ext-005","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một studio game ở thành phố lớn cần độ trễ một chữ số mili-giây cho ứng dụng render thời gian thực phục vụ người dùng trong khu vực đô thị đó, nhưng AWS Region gần nhất lại cách quá xa gây độ trễ cao. Họ muốn đặt compute gần người dùng cuối hơn mà vẫn nằm trong hạ tầng AWS quản lý. Lựa chọn nào phù hợp?","options":["AWS Local Zones","AWS Outposts","AWS Wavelength","AWS Batch"],"correctIndices":[0],"explanation":"AWS Local Zones đặt compute và storage gần các trung tâm đô thị lớn để giảm độ trễ cho người dùng trong khu vực đó.\n✓ AWS Local Zones: mở rộng Region tới gần thành phố lớn, giảm latency cho ứng dụng nhạy cảm độ trễ.\n✗ AWS Outposts: đặt phần cứng trong cơ sở khách hàng, không phải gần khu đô thị chung.\n✗ AWS Wavelength: tối ưu cho ứng dụng trên mạng 5G của nhà mạng, không phải khu đô thị tổng quát.\n✗ AWS Batch: dịch vụ batch processing, không liên quan giảm độ trễ địa lý.","domain":3},
  {"id":"clf-ext-006","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một nhà phát triển ứng dụng AR di động cần xử lý dữ liệu ngay tại biên mạng di động 5G của nhà mạng để đạt độ trễ siêu thấp cho thiết bị di động, tránh phải định tuyến lưu lượng qua internet về Region. Dịch vụ nào được thiết kế cho mục đích này?","options":["AWS Wavelength","AWS Local Zones","AWS Outposts","Amazon Lightsail"],"correctIndices":[0],"explanation":"AWS Wavelength nhúng compute/storage vào mạng 5G của nhà cung cấp viễn thông để đạt độ trễ siêu thấp cho thiết bị di động.\n✓ AWS Wavelength: đặt hạ tầng AWS tại biên mạng 5G, lý tưởng cho ứng dụng di động độ trễ thấp.\n✗ AWS Local Zones: gần khu đô thị nhưng không nhúng trong mạng 5G của nhà mạng.\n✗ AWS Outposts: đặt tại cơ sở khách hàng, không phải mạng nhà mạng.\n✗ Amazon Lightsail: VM giá cố định, không liên quan edge 5G.","domain":3},
  {"id":"clf-ext-007","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một team muốn deploy một ứng dụng web containerized trực tiếp từ source code hoặc container image, để AWS tự động build, deploy, load balance và auto scale mà hoàn toàn không phải quản lý server hay cluster. Dịch vụ nào phù hợp nhất?","options":["AWS App Runner","AWS Elastic Beanstalk","Amazon EC2","AWS Batch"],"correctIndices":[0],"explanation":"AWS App Runner là dịch vụ fully managed để chạy web app/API container hóa, tự build, deploy, scale mà không cần quản lý hạ tầng.\n✓ AWS App Runner: chỉ cần cung cấp code/image, AWS lo toàn bộ build và vận hành container.\n✗ Elastic Beanstalk: vẫn tạo và cho truy cập EC2/ELB bên dưới, không hoàn toàn ẩn server.\n✗ Amazon EC2: phải tự quản lý instance và scaling thủ công.\n✗ AWS Batch: dành cho batch job, không phải web service liên tục.","domain":3},
  {"id":"clf-ext-008","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một tổ chức cần xây dựng và bảo trì các AMI (và container image) được cấu hình sẵn, vá bảo mật định kỳ một cách tự động theo quy trình lặp lại, đảm bảo image luôn cập nhật. Dịch vụ nào phù hợp?","options":["EC2 Image Builder","AWS Elastic Beanstalk","AWS App Runner","Amazon Lightsail"],"correctIndices":[0],"explanation":"EC2 Image Builder tự động hóa việc tạo, kiểm thử và bảo trì AMI cũng như container image theo pipeline, giúp giữ image luôn được vá và cập nhật.\n✓ EC2 Image Builder: tự động build và bảo trì image an toàn, cập nhật định kỳ.\n✗ Elastic Beanstalk: triển khai app, không chuyên về tạo và bảo trì AMI.\n✗ AWS App Runner: chạy container web app, không phải pipeline tạo image.\n✗ Amazon Lightsail: cung cấp VM trọn gói, không phải công cụ build image.","domain":3},
  {"id":"clf-ext-009","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một công ty có khối lượng compute ổn định, cam kết sử dụng tương đương 10 USD/giờ trong 1 năm, nhưng muốn linh hoạt chuyển đổi giữa EC2, Fargate và Lambda mà vẫn được giảm giá lớn so với On-Demand. Mô hình giá nào phù hợp nhất?","options":["Compute Savings Plans","EC2 Instance Savings Plans","Standard Reserved Instances","On-Demand pricing"],"correctIndices":[0],"explanation":"Compute Savings Plans cho mức giảm giá lớn dựa trên cam kết chi tiêu (USD/giờ) và áp dụng linh hoạt cho EC2, Fargate, Lambda bất kể region/family.\n✓ Compute Savings Plans: linh hoạt nhất, áp dụng cho EC2, Fargate và Lambda.\n✗ EC2 Instance Savings Plans: chỉ áp dụng cho EC2 trong một instance family/region, không bao Fargate/Lambda.\n✗ Standard Reserved Instances: gắn với cấu hình EC2 cụ thể, kém linh hoạt và không áp dụng Fargate/Lambda.\n✗ On-Demand pricing: không cam kết nên không được giảm giá.","domain":3},
  {"id":"clf-ext-010","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"hard","type":"multi","question":"Một kiến trúc sư đang đánh giá các tùy chọn compute cho nhiều workload khác nhau. Những phát biểu nào sau đây là CHÍNH XÁC? (Chọn 2)","options":["AWS Outposts cho phép chạy dịch vụ AWS trên hạ tầng đặt tại data center của khách hàng","AWS Batch tự động cấp phát loại và số lượng tài nguyên compute dựa trên yêu cầu của các batch job","Amazon Lightsail được thiết kế cho workload HPC quy mô hàng nghìn node với độ trễ thấp giữa các node","AWS Wavelength chủ yếu dùng để xây dựng và vá AMI tự động","Elastic Beanstalk yêu cầu khách hàng tự cấu hình thủ công load balancer và Auto Scaling group"],"correctIndices":[0,1],"explanation":"Outposts mang AWS tới on-premises, còn Batch tự động provision tài nguyên theo nhu cầu job.\n✓ AWS Outposts chạy trên hạ tầng tại cơ sở khách hàng: đúng định nghĩa Outposts.\n✓ AWS Batch tự cấp phát tài nguyên theo job: đúng, đây là giá trị cốt lõi của Batch.\n✗ Lightsail cho HPC hàng nghìn node: sai, Lightsail nhắm tới workload nhỏ/đơn giản.\n✗ Wavelength để vá AMI: sai, đó là vai trò của EC2 Image Builder; Wavelength dành cho edge 5G.\n✗ Beanstalk yêu cầu tự cấu hình ELB/Auto Scaling: sai, Beanstalk tự động tạo các thành phần này.","domain":3},
  {"id":"clf-ext-011","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Một công ty fintech đã cam kết Compute Savings Plan. Trong tháng, họ giảm bớt EC2 nhưng tăng mạnh việc dùng AWS Fargate và một số hàm Lambda. Điều gì xảy ra với mức giảm giá của Savings Plan?","options":["Mức giảm giá tự động áp dụng cho Fargate và Lambda, miễn là tổng chi tiêu vẫn trong cam kết","Giảm giá chỉ áp dụng cho EC2; phần Fargate và Lambda bị tính giá On-Demand","Savings Plan bị hủy vì cấu hình compute đã thay đổi","Họ phải mua thêm Reserved Instances cho Fargate để được giảm giá"],"correctIndices":[0],"explanation":"Compute Savings Plans tự động áp dụng giảm giá xuyên suốt EC2, Fargate và Lambda dựa trên cam kết chi tiêu USD/giờ, bất kể workload dịch chuyển.\n✓ Tự động áp dụng cho Fargate và Lambda: đúng đặc tính linh hoạt của Compute Savings Plans.\n✗ Chỉ áp dụng EC2: sai, đó là giới hạn của EC2 Instance Savings Plans chứ không phải Compute.\n✗ Savings Plan bị hủy khi đổi compute: sai, không bị hủy do thay đổi workload.\n✗ Phải mua Reserved Instances cho Fargate: sai, Compute Savings Plan đã bao Fargate.","domain":3},
  {"id":"clf-ext-012","courseId":"CLF-C02","lesson":"11-compute-extended","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Một nhà bán lẻ muốn triển khai nhanh một REST API container hóa cho ứng dụng web, không có đội ngũ DevOps để quản lý cluster, và muốn dịch vụ tự động scale về gần 0 khi không có traffic để tiết kiệm chi phí. Lựa chọn nào tối ưu nhất về vận hành?","options":["AWS App Runner","Amazon EC2 với Auto Scaling group","Amazon Lightsail instance đơn lẻ","AWS Outposts"],"correctIndices":[0],"explanation":"App Runner là fully managed cho web app/API container, tự build, deploy, scale (kể cả thu nhỏ khi ít traffic) mà không cần quản lý hạ tầng.\n✓ AWS App Runner: vận hành đơn giản nhất, tự scale, phù hợp đội không có DevOps.\n✗ EC2 với Auto Scaling group: cần tự quản lý instance, AMI, cấu hình scaling.\n✗ Lightsail instance đơn lẻ: không tự auto scale theo traffic, phải quản lý thủ công.\n✗ AWS Outposts: hạ tầng on-premises tốn kém, không phù hợp nhu cầu đơn giản này.","domain":3},
  {"id":"clf-ext-013","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một công ty cần lưu trữ file backup quan trọng trên S3 và muốn bảo vệ khỏi việc bị ghi đè hoặc xóa nhầm, cho phép khôi phục lại phiên bản trước đó của object. Tính năng S3 nào nên được bật?","options":["S3 Versioning","S3 Transfer Acceleration","S3 Lifecycle policy","S3 Cross-Region Replication"],"correctIndices":[0],"explanation":"S3 Versioning giữ nhiều phiên bản của cùng một object, cho phép khôi phục bản cũ khi bị ghi đè hoặc xóa nhầm.\n✓ S3 Versioning lưu lại các phiên bản cũ để khôi phục.\n✗ Transfer Acceleration chỉ tăng tốc upload/download qua edge location, không bảo vệ phiên bản.\n✗ Lifecycle policy chuyển hoặc xóa object theo thời gian, không khôi phục bản cũ.\n✗ Cross-Region Replication sao chép sang region khác, không trực tiếp cung cấp khôi phục bản ghi đè trong cùng bucket.","domain":3},
  {"id":"clf-ext-014","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một tổ chức có người dùng trên toàn cầu thường xuyên upload các file lớn lên một S3 bucket đặt tại us-east-1. Họ phàn nàn tốc độ upload chậm. Giải pháp nào cải thiện tốc độ mà không cần đổi region của bucket?","options":["Bật S3 Transfer Acceleration","Bật S3 Versioning","Chuyển sang storage class S3 Glacier","Tạo thêm một bucket ở mỗi quốc gia"],"correctIndices":[0],"explanation":"S3 Transfer Acceleration định tuyến dữ liệu qua mạng lưới edge location của CloudFront để tăng tốc upload đường dài.\n✓ Transfer Acceleration tận dụng edge location gần người dùng để tăng tốc upload toàn cầu.\n✗ Versioning chỉ quản lý phiên bản, không ảnh hưởng tốc độ.\n✗ Glacier là lưu trữ archive, làm chậm truy cập chứ không tăng tốc upload.\n✗ Tạo bucket riêng mỗi quốc gia làm phức tạp quản lý và không phải giải pháp được khuyến nghị.","domain":3},
  {"id":"clf-ext-015","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một ứng dụng .NET trên Windows cần một file share dùng chung qua giao thức SMB, tích hợp với Active Directory để phân quyền. Dịch vụ nào phù hợp nhất?","options":["Amazon FSx for Windows File Server","Amazon FSx for Lustre","Amazon EFS","Amazon S3"],"correctIndices":[0],"explanation":"FSx for Windows File Server cung cấp file share SMB gốc Windows, tích hợp Active Directory và NTFS permissions.\n✓ FSx for Windows File Server hỗ trợ SMB và tích hợp Active Directory.\n✗ FSx for Lustre dành cho high-performance computing, không phải SMB Windows.\n✗ EFS dùng giao thức NFS cho Linux, không phải SMB Windows native.\n✗ S3 là object storage, không phải file share SMB.","domain":3},
  {"id":"clf-ext-016","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một nhóm nghiên cứu cần hệ thống file hiệu năng cực cao (high-performance computing) cho khối lượng tính toán machine learning và phân tích, có khả năng liên kết với dữ liệu trong S3. Dịch vụ FSx nào phù hợp nhất?","options":["Amazon FSx for Lustre","Amazon FSx for Windows File Server","Amazon FSx for NetApp ONTAP","Amazon FSx for OpenZFS"],"correctIndices":[0],"explanation":"FSx for Lustre được thiết kế cho HPC và machine learning, có thể liên kết trực tiếp với dữ liệu trong S3.\n✓ FSx for Lustre tối ưu cho HPC/ML và tích hợp S3.\n✗ FSx for Windows File Server dành cho file share SMB doanh nghiệp.\n✗ FSx for NetApp ONTAP tập trung vào tính năng quản lý dữ liệu ONTAP đa giao thức.\n✗ FSx for OpenZFS phục vụ workload Linux/NFS thông dụng, không tối ưu HPC quy mô lớn như Lustre.","domain":3},
  {"id":"clf-ext-017","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một trung tâm dữ liệu on-premises cần truy cập kho lưu trữ object S3 như một file share NFS/SMB local để các ứng dụng cũ có thể đọc/ghi mà không cần viết lại code. Giải pháp nào nên dùng?","options":["Amazon S3 File Gateway (Storage Gateway)","AWS Snowball","Amazon FSx for Lustre","AWS DataSync"],"correctIndices":[0],"explanation":"S3 File Gateway cho phép ứng dụng on-premises dùng NFS/SMB để truy cập dữ liệu được lưu dưới dạng object trong S3.\n✓ S3 File Gateway trình bày S3 dưới dạng file share NFS/SMB cho ứng dụng local.\n✗ Snowball dùng để di chuyển dữ liệu lượng lớn offline, không phải truy cập file liên tục.\n✗ FSx for Lustre là HPC file system, không phải gateway tới S3 cho ứng dụng cũ.\n✗ DataSync chỉ đồng bộ/di chuyển dữ liệu, không cung cấp file share thường trực.","domain":3},
  {"id":"clf-ext-018","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một công ty muốn quản lý tập trung và tự động hóa lịch backup cho EBS volumes, RDS databases, DynamoDB tables và EFS file systems từ một nơi duy nhất, với chính sách lưu giữ thống nhất. Dịch vụ nào phù hợp?","options":["AWS Backup","Amazon S3 Lifecycle","AWS Storage Gateway","Amazon EBS Snapshots thủ công"],"correctIndices":[0],"explanation":"AWS Backup tập trung hóa và tự động hóa backup trên nhiều dịch vụ AWS với backup plan và retention policy thống nhất.\n✓ AWS Backup quản lý backup tập trung cho EBS, RDS, DynamoDB, EFS và nhiều dịch vụ khác.\n✗ S3 Lifecycle chỉ áp dụng cho object trong S3.\n✗ Storage Gateway kết nối on-premises với cloud storage, không phải dịch vụ backup tập trung đa dịch vụ.\n✗ EBS Snapshots thủ công chỉ cho EBS và không tự động hóa đa dịch vụ.","domain":3},
  {"id":"clf-ext-019","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một địa điểm khai thác dầu ngoài khơi không có kết nối internet ổn định cần thu thập và xử lý sơ bộ dữ liệu cảm biến (edge computing) trong môi trường khắc nghiệt, sau đó chuyển khoảng 50 TB dữ liệu về AWS. Thiết bị Snow Family nào phù hợp nhất?","options":["AWS Snowball Edge","AWS Snowmobile","Amazon S3 Transfer Acceleration","AWS Storage Gateway Tape Gateway"],"correctIndices":[0],"explanation":"Snowball Edge cung cấp khả năng lưu trữ và compute tại edge cho môi trường ngắt kết nối, phù hợp với khối lượng hàng chục TB.\n✓ Snowball Edge có compute để xử lý edge và lưu trữ vài chục TB ở môi trường offline.\n✗ Snowmobile dành cho exabyte (hàng chục PB), quá lớn cho 50 TB.\n✗ Transfer Acceleration cần kết nối internet ổn định, không phù hợp môi trường ngắt kết nối.\n✗ Tape Gateway phục vụ backup dạng băng từ ảo, không phải edge offline.","domain":3},
  {"id":"clf-ext-020","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"multi","question":"Một quản trị viên đang chọn loại EBS volume cho các workload khác nhau. Những phát biểu nào sau đây ĐÚNG? (Chọn 2)","options":["gp3 là SSD đa dụng cho phép cấu hình IOPS và throughput độc lập với dung lượng","io2 là SSD hiệu năng cao phù hợp cho database cần IOPS cao và độ bền cao","sc1 là SSD chuyên cho workload IOPS cực cao","st1 là volume SSD giá rẻ nhất, không hỗ trợ làm boot volume cho nhu cầu throughput","gp2 cho phép cấu hình throughput hoàn toàn tách rời IOPS giống gp3"],"correctIndices":[0,1],"explanation":"gp3 cho phép điều chỉnh IOPS/throughput tách biệt dung lượng, và io2 là SSD bền, IOPS cao cho database.\n✓ gp3 là SSD đa dụng với IOPS và throughput cấu hình độc lập với size.\n✓ io2 là Provisioned IOPS SSD cho database đòi hỏi IOPS cao và độ bền cao.\n✗ sc1 là HDD lạnh (cold) giá rẻ cho dữ liệu truy cập ít, không phải SSD IOPS cao.\n✗ st1 là HDD throughput-optimized, không phải SSD và không dùng làm boot volume.\n✗ gp2 ràng buộc IOPS theo dung lượng và không tách rời throughput như gp3.","domain":3},
  {"id":"clf-ext-021","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một doanh nghiệp đang dùng băng từ vật lý (physical tape) cho backup và muốn loại bỏ chi phí quản lý băng từ nhưng vẫn giữ phần mềm backup hiện tại. Giải pháp AWS nào phù hợp?","options":["Tape Gateway (Storage Gateway)","Volume Gateway","AWS Snowmobile","Amazon FSx for OpenZFS"],"correctIndices":[0],"explanation":"Tape Gateway tạo virtual tape library tương thích với phần mềm backup hiện có và lưu vào S3/Glacier.\n✓ Tape Gateway thay băng từ vật lý bằng virtual tape, tích hợp phần mềm backup sẵn có.\n✗ Volume Gateway cung cấp block storage iSCSI, không phải thay thế băng từ.\n✗ Snowmobile dùng cho di chuyển dữ liệu exabyte một lần.\n✗ FSx for OpenZFS là file system, không liên quan backup băng từ.","domain":3},
  {"id":"clf-ext-022","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một công ty cần sao chép tự động object từ một S3 bucket ở us-east-1 sang một bucket ở eu-west-1 để phục vụ tuân thủ và giảm độ trễ cho người dùng châu Âu. Tính năng nào đáp ứng?","options":["S3 Cross-Region Replication (CRR)","S3 Transfer Acceleration","S3 Same-Region Replication (SRR)","S3 Versioning đơn thuần"],"correctIndices":[0],"explanation":"S3 Cross-Region Replication tự động sao chép object giữa các bucket ở region khác nhau.\n✓ CRR sao chép object sang region khác cho compliance và giảm độ trễ.\n✗ Transfer Acceleration chỉ tăng tốc truyền, không sao chép giữa bucket.\n✗ SRR sao chép trong cùng region, không sang region khác.\n✗ Versioning chỉ giữ phiên bản trong cùng bucket, không sao chép cross-region (dù cần được bật để dùng replication).","domain":3},
  {"id":"clf-ext-023","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Một dự án phân tích di truyền cần khoảng 5 PB dữ liệu được chuyển từ data center về AWS trong vài tuần. Đường truyền internet hiện tại sẽ mất nhiều tháng để upload. Lựa chọn nào tối ưu nhất về thời gian và chi phí?","options":["Sử dụng nhiều thiết bị AWS Snowball để vận chuyển dữ liệu","Dùng AWS Snowmobile cho toàn bộ dữ liệu","Upload trực tiếp qua S3 Transfer Acceleration","Triển khai Volume Gateway để đồng bộ dần qua internet"],"correctIndices":[0],"explanation":"Với khoảng 5 PB, dùng nhiều Snowball là phương án thực tế; Snowmobile chỉ hợp lý ở quy mô hàng chục PB trở lên.\n✓ Nhiều thiết bị Snowball vận chuyển 5 PB nhanh và hiệu quả chi phí cho mức petabyte này.\n✗ Snowmobile (lên tới ~100 PB) là quá mức cho 5 PB và thường dành cho exabyte-scale.\n✗ Transfer Acceleration vẫn phụ thuộc băng thông internet, mất nhiều tháng.\n✗ Volume Gateway đồng bộ qua internet không giải quyết vấn đề băng thông hạn chế.","domain":3},
  {"id":"clf-ext-024","courseId":"CLF-C02","lesson":"12-storage-extended","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Một ứng dụng đang chạy cần lưu trữ block storage giá thấp cho dữ liệu log truy cập tuần tự, throughput lớn nhưng ít ngẫu nhiên, ví dụ big data và streaming. Loại EBS nào tiết kiệm chi phí nhất mà vẫn phù hợp?","options":["st1 (Throughput Optimized HDD)","io2 (Provisioned IOPS SSD)","gp3 (General Purpose SSD)","sc1 (Cold HDD)"],"correctIndices":[0],"explanation":"st1 là HDD tối ưu throughput, rẻ và phù hợp cho workload tuần tự, throughput cao như big data và log.\n✓ st1 phù hợp truy cập tuần tự, throughput lớn với chi phí thấp.\n✗ io2 là SSD IOPS cao đắt tiền, dư thừa cho workload tuần tự.\n✗ gp3 là SSD đa dụng, đắt hơn st1 cho nhu cầu throughput tuần tự thuần túy.\n✗ sc1 rẻ hơn nhưng dành cho dữ liệu truy cập rất ít, không đáp ứng throughput của workload đang hoạt động thường xuyên.","domain":3},
  {"id":"clf-ext-025","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một công ty lưu hàng triệu file CloudTrail log dưới dạng JSON trong Amazon S3. Team security muốn chạy các câu SQL ad-hoc để điều tra sự cố mà KHÔNG phải provision hay quản lý cluster nào. Dịch vụ nào phù hợp nhất?","options":["Amazon Athena","Amazon Redshift","Amazon EMR","Amazon Kinesis Data Streams"],"correctIndices":[0],"explanation":"Athena là serverless SQL query trực tiếp trên dữ liệu S3, lý tưởng cho phân tích ad-hoc log mà không cần quản hạ tầng.\n✓ Athena: serverless, query SQL thẳng trên S3, trả tiền theo data scanned, không cần cluster.\n✗ Redshift: là data warehouse cần load dữ liệu và (provisioned) phải quản node, phù hợp dashboard lặp lại hơn ad-hoc.\n✗ EMR: là Hadoop/Spark cluster, cần quản lý và overkill cho query SQL đơn giản.\n✗ Kinesis Data Streams: dùng để ingest real-time stream, không phải query log đã lưu trong S3.","domain":3},
  {"id":"clf-ext-026","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một tổ chức cần một data warehouse columnar quy mô petabyte để chạy các báo cáo BI phức tạp lặp lại hằng ngày trên hàng tỷ dòng dữ liệu bán hàng. Dịch vụ AWS nào được thiết kế cho mục đích này?","options":["Amazon Redshift","Amazon Athena","Amazon OpenSearch Service","AWS Glue"],"correctIndices":[0],"explanation":"Redshift là data warehouse columnar OLAP quy mô petabyte, tối ưu cho báo cáo BI phức tạp lặp lại.\n✓ Redshift: data warehouse columnar PB-scale, hiệu năng cao cho query OLAP lặp lại và dashboard.\n✗ Athena: tốt cho ad-hoc/infrequent trên S3, không tối ưu bằng cho dashboard BI tải nặng lặp lại.\n✗ OpenSearch Service: dùng cho full-text search và log analytics, không phải data warehouse.\n✗ Glue: là dịch vụ ETL + Data Catalog, không phải nơi chạy query warehouse.","domain":3},
  {"id":"clf-ext-027","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một startup cần đẩy dữ liệu streaming liên tục vào Amazon S3 với batching và nén tự động, near real-time, mà KHÔNG muốn viết code consumer hay quản lý shard. Lựa chọn nào phù hợp nhất?","options":["Amazon Data Firehose","Amazon Kinesis Data Streams","Amazon MSK","Amazon EMR"],"correctIndices":[0],"explanation":"Firehose là delivery stream tự động đẩy dữ liệu vào S3/Redshift/OpenSearch với buffering và nén, không cần code consumer.\n✓ Amazon Data Firehose: ống delivery near real-time tự buffer/compress, không cần quản shard hay viết consumer.\n✗ Kinesis Data Streams: cần developer viết consumer xử lý record và quản lý shard.\n✗ MSK: managed Kafka, cần cấu hình và quản lý topic/consumer, không phải giải pháp no-code đẩy vào S3.\n✗ EMR: là cluster big data processing, không phải pipeline delivery streaming.","domain":3},
  {"id":"clf-ext-028","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một công ty muốn xây dashboard BI cho ban lãnh đạo, dùng natural language để hỏi như 'show me sales by region last quarter', và nhúng dashboard vào ứng dụng SaaS nội bộ. Dịch vụ nào đáp ứng?","options":["Amazon QuickSight","Amazon Athena","AWS Glue DataBrew","Amazon OpenSearch Dashboards"],"correctIndices":[0],"explanation":"QuickSight là BI serverless với tính năng Q (natural language query), SPICE engine và embedded analytics.\n✓ QuickSight: BI managed, có Q để hỏi bằng ngôn ngữ tự nhiên và embedded analytics để nhúng dashboard.\n✗ Athena: chỉ là engine query SQL, không phải công cụ visualize/BI.\n✗ Glue DataBrew: dùng để clean/transform data no-code, không phải BI dashboard.\n✗ OpenSearch Dashboards: là Kibana cho log/search analytics, không có natural language BI như Q.","domain":3},
  {"id":"clf-ext-029","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Team data engineering cần tự động phát hiện schema của các file CSV/JSON mới được upload lên S3 và đưa metadata vào một catalog trung tâm để Athena query ngay. Thành phần nào của AWS Glue làm việc này?","options":["Glue Crawler kết hợp Glue Data Catalog","Glue DataBrew","Kinesis Data Firehose","Redshift Spectrum"],"correctIndices":[0],"explanation":"Glue Crawler tự scan S3, suy ra schema và đẩy vào Glue Data Catalog làm metadata trung tâm cho Athena.\n✓ Glue Crawler + Data Catalog: crawler infer schema từ file mới, lưu vào Data Catalog để Athena dùng ngay.\n✗ Glue DataBrew: làm clean/transform no-code, không phải auto-discover schema vào catalog.\n✗ Kinesis Data Firehose: là delivery stream ingest, không suy ra schema cho catalog.\n✗ Redshift Spectrum: cho phép query S3 từ Redshift nhưng không tự crawl/khám phá schema.","domain":3},
  {"id":"clf-ext-030","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một công ty cần phân tích 100 GB log nginx theo thời gian thực, hỗ trợ full-text search và dashboard trực quan kiểu Kibana cho team observability. Dịch vụ nào phù hợp nhất?","options":["Amazon OpenSearch Service","Amazon Athena","Amazon Redshift","Amazon QuickSight"],"correctIndices":[0],"explanation":"OpenSearch Service là managed Elasticsearch + dashboards (Kibana) cho log analytics real-time và full-text search.\n✓ OpenSearch Service: managed Elasticsearch, mạnh về full-text search, log analytics real-time và dashboard Kibana.\n✗ Athena: query SQL trên S3, không tối ưu cho full-text search real-time.\n✗ Redshift: data warehouse OLAP, không phải search engine.\n✗ QuickSight: là BI visualization, không phải search engine cho log.","domain":3},
  {"id":"clf-ext-031","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một team đã có nhiều ứng dụng dùng Apache Kafka on-premises và muốn chuyển lên AWS với ít thay đổi code nhất, tận dụng ecosystem Kafka quen thuộc. Dịch vụ nào nên chọn?","options":["Amazon MSK","Amazon Kinesis Data Streams","Amazon Kinesis Data Firehose","Amazon SQS"],"correctIndices":[0],"explanation":"MSK là managed Apache Kafka, giữ nguyên API và ecosystem Kafka nên migration ít thay đổi code nhất.\n✓ MSK: managed Apache Kafka, tương thích API Kafka, lý tưởng khi team đã quen ecosystem Kafka.\n✗ Kinesis Data Streams: là streaming AWS-native, không tương thích API Kafka nên phải viết lại code.\n✗ Kinesis Data Firehose: là delivery pipeline, không phải nền tảng pub/sub Kafka.\n✗ SQS: là message queue, không phải streaming platform giữ ordering/replay như Kafka.","domain":3},
  {"id":"clf-ext-032","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"multi","question":"Một công ty xây data lake trên S3 và muốn kiểm soát quyền truy cập fine-grained (row-level, column-level) cho hàng trăm người dùng phục vụ tuân thủ GDPR. Những phát biểu nào ĐÚNG về AWS Lake Formation? (Chọn 2)","options":["Lake Formation cho phép quản fine-grained permission ở mức row/column/cell trên data lake","Lake Formation hỗ trợ tag-based access control và tích hợp với Athena, Redshift Spectrum, EMR","Lake Formation là một data warehouse columnar thay thế cho Redshift","Lake Formation là công cụ BI để vẽ dashboard cho business user","Lake Formation là dịch vụ stream ingest real-time thay cho Kinesis"],"correctIndices":[0,1],"explanation":"Lake Formation tập trung vào governance/permission cho data lake trên S3, hỗ trợ fine-grained và tag-based access.\n✓ Quản row/column/cell-level: đúng, Lake Formation cung cấp fine-grained access control cho data lake.\n✓ Tag-based access + tích hợp Athena/Redshift Spectrum/EMR: đúng, đây là các engine tích hợp với Lake Formation.\n✗ Data warehouse thay Redshift: sai, Lake Formation là lớp governance, không phải warehouse.\n✗ Công cụ BI dashboard: sai, đó là vai trò của QuickSight.\n✗ Stream ingest real-time: sai, ingest là vai trò của Kinesis/MSK.","domain":3},
  {"id":"clf-ext-033","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một nhóm nghiên cứu cần chạy các job Apache Spark và Apache Hive quy mô hàng terabyte, đồng thời muốn dùng thêm HBase và Flink, với khả năng tận dụng EC2 Spot để giảm chi phí. Dịch vụ nào phù hợp nhất?","options":["Amazon EMR","AWS Glue ETL","Amazon Athena","Amazon QuickSight"],"correctIndices":[0],"explanation":"EMR là cluster managed hỗ trợ nhiều framework (Spark, Hive, HBase, Flink) và có thể chạy trên Spot để tiết kiệm.\n✓ EMR: hỗ trợ Hadoop/Spark/Hive/HBase/Flink, kiểm soát cao và chạy được Spot, hợp big data đa framework.\n✗ Glue ETL: serverless Spark đơn giản nhưng không hỗ trợ Hive/HBase/Flink đa dạng như EMR.\n✗ Athena: chỉ là query SQL serverless, không chạy job Spark/Hive tùy biến.\n✗ QuickSight: là BI visualization, không phải nền tảng xử lý big data.","domain":3},
  {"id":"clf-ext-034","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một công ty muốn mua dataset thời tiết và dữ liệu nhân khẩu học từ nhà cung cấp bên thứ ba, và để dữ liệu tự động được giao vào Amazon S3. Dịch vụ AWS nào dùng cho việc này?","options":["AWS Data Exchange","AWS Glue","Amazon Athena","AWS Lake Formation"],"correctIndices":[0],"explanation":"AWS Data Exchange là marketplace để mua dataset third-party, tự động giao vào S3/Redshift/API.\n✓ Data Exchange: marketplace dữ liệu third-party, tự động delivery dataset đã mua vào S3.\n✗ Glue: là ETL/Data Catalog, không phải nơi mua dataset bên ngoài.\n✗ Athena: chỉ query dữ liệu đã có, không cung cấp marketplace data.\n✗ Lake Formation: quản permission data lake, không bán dataset third-party.","domain":3},
  {"id":"clf-ext-035","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một ứng dụng IoT thu thập dữ liệu từ 100.000 thiết bị real-time, và cần NHIỀU consumer khác nhau (analytics, alerting, lưu trữ) cùng đọc một stream với khả năng replay dữ liệu trong nhiều ngày. Dịch vụ nào phù hợp nhất?","options":["Amazon Kinesis Data Streams","Amazon Kinesis Data Firehose","Amazon QuickSight","AWS Glue Crawler"],"correctIndices":[0],"explanation":"Kinesis Data Streams hỗ trợ nhiều consumer đọc cùng stream và retention tới 365 ngày cho replay.\n✓ Kinesis Data Streams: cho nhiều consumer đồng thời, retention 1–365 ngày để replay record real-time.\n✗ Kinesis Data Firehose: là delivery một chiều vào đích, không lưu để replay cũng không cho nhiều consumer tùy ý.\n✗ QuickSight: là BI, không phải dịch vụ ingest stream.\n✗ Glue Crawler: chỉ scan schema S3, không liên quan ingest stream real-time.","domain":3},
  {"id":"clf-ext-036","courseId":"CLF-C02","lesson":"16-analytics","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Một công ty dùng Athena query data lake trên S3 nhưng chi phí tăng cao vì mỗi truy vấn scan toàn bộ file CSV lớn. Họ muốn giảm chi phí Athena mà vẫn giữ dữ liệu trên S3. Hành động nào hiệu quả nhất?","options":["Chuyển dữ liệu sang định dạng cột nén như Parquet/ORC và partition theo cột thường lọc","Chuyển toàn bộ workload sang Amazon EMR để xử lý","Nâng cấp lên Redshift provisioned cluster cỡ lớn nhất","Bật Kinesis Data Firehose để stream lại dữ liệu vào S3"],"correctIndices":[0],"explanation":"Athena tính tiền theo lượng data scanned, nên Parquet/ORC nén cột + partition giảm scan và chi phí mạnh nhất.\n✓ Parquet/ORC + partition: giảm dữ liệu scan tới 10–100x, cắt giảm chi phí Athena hiệu quả mà vẫn dùng S3.\n✗ Chuyển sang EMR: không tự giảm chi phí và tăng độ phức tạp quản cluster.\n✗ Redshift cluster lớn nhất: tốn kém hơn và không giải quyết gốc rễ là format/scan của Athena.\n✗ Firehose stream lại: không thay đổi format/partition nên không giảm data scanned.","domain":3},
  {"id":"clf-ext-037","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một security team cần biết CHÍNH XÁC ai đã xoá một IAM user vào lúc 3 giờ sáng và từ IP nào. Họ nên xem ở đâu?","options":["AWS CloudTrail event history","Amazon CloudWatch Metrics","AWS Config configuration timeline","AWS Trusted Advisor security check"],"correctIndices":[0],"explanation":"CloudTrail ghi mọi API call (ai làm gì, lúc nào, từ đâu) nên là nguồn audit chính.\n✓ CloudTrail event history ghi lại API call DeleteUser kèm identity và source IP.\n✗ CloudWatch Metrics chỉ là số liệu time-series về hiệu năng, không ghi ai gọi API.\n✗ Config theo dõi trạng thái cấu hình resource, không trả lời 'ai' thực hiện hành động.\n✗ Trusted Advisor đưa khuyến nghị best practice, không phải log audit hành động.","domain":2},
  {"id":"clf-ext-038","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Đội vận hành muốn nhận thông báo qua SMS khi CPU của một EC2 instance vượt 80% trong 5 phút. Dịch vụ nào phù hợp nhất?","options":["Amazon CloudWatch alarm tích hợp SNS","AWS CloudTrail Insights","AWS Config rule","Amazon CloudWatch Logs Insights"],"correctIndices":[0],"explanation":"CloudWatch alarm theo dõi metric và trigger SNS khi vượt threshold.\n✓ CloudWatch alarm trên metric CPU > 80% gửi notification qua SNS topic (SMS).\n✗ CloudTrail Insights phát hiện bất thường trong API activity, không theo dõi CPU.\n✗ Config rule kiểm tra compliance cấu hình, không cảnh báo theo metric hiệu năng.\n✗ Logs Insights là công cụ query log, không trigger alarm theo threshold metric.","domain":2},
  {"id":"clf-ext-039","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Công ty cần đảm bảo TẤT CẢ S3 bucket luôn bật versioning và được đánh dấu NON_COMPLIANT nếu vi phạm. Dịch vụ nào đáp ứng?","options":["AWS Config với managed rule","AWS CloudTrail data events","Amazon CloudWatch Logs","AWS Systems Manager Patch Manager"],"correctIndices":[0],"explanation":"Config đánh giá trạng thái cấu hình resource so với rule và đánh dấu compliant/non-compliant.\n✓ Config managed rule (s3-bucket-versioning-enabled) liên tục đánh giá và mark NON_COMPLIANT.\n✗ CloudTrail data events ghi log truy cập object, không đánh giá compliance cấu hình.\n✗ CloudWatch Logs tập trung log, không có khái niệm rule compliance resource.\n✗ Patch Manager quản lý vá lỗi OS, không liên quan compliance cấu hình S3.","domain":2},
  {"id":"clf-ext-040","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Một tổ chức có 12 AWS account và muốn 1 hoá đơn duy nhất cùng việc share volume discount. Dịch vụ nào cung cấp điều này?","options":["AWS Organizations với consolidated billing","AWS Control Tower guardrails","AWS Cost Explorer","AWS Budgets"],"correctIndices":[0],"explanation":"Organizations gom nhiều account và cung cấp consolidated billing.\n✓ Organizations consolidated billing gộp 1 bill và share volume/RI discount toàn org.\n✗ Control Tower guardrails là SCP + Config rule, không phải cơ chế gộp hoá đơn.\n✗ Cost Explorer chỉ phân tích/visualize chi phí, không gộp billing.\n✗ Budgets đặt ngưỡng cảnh báo chi phí, không gộp hoá đơn nhiều account.","domain":2},
  {"id":"clf-ext-041","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Quản trị viên đã gắn SCP deny s3:DeleteBucket cho một OU, nhưng muốn cấp quyền tạo bucket cho dev trong OU đó. Họ cần làm gì?","options":["Tạo IAM policy grant s3:CreateBucket cho dev, vì SCP không tự grant quyền","Thêm Allow s3:CreateBucket vào SCP để tự động cấp quyền cho dev","Xoá SCP vì SCP ghi đè mọi IAM policy","Dùng AWS Config rule để grant quyền tạo bucket"],"correctIndices":[0],"explanation":"SCP chỉ đặt trần quyền tối đa, không tự grant; IAM policy mới grant quyền thực tế cho principal.\n✓ Cần IAM policy grant s3:CreateBucket cho dev; SCP không cấp quyền mà chỉ giới hạn.\n✗ Thêm Allow vào SCP chỉ mở rộng trần, không tự cấp quyền cho user — vẫn cần IAM policy.\n✗ Không cần xoá SCP; quyền hiệu lực là giao của SCP và IAM, hai cái hoạt động cùng nhau.\n✗ Config rule chỉ đánh giá compliance, không cấp quyền IAM.","domain":2},
  {"id":"clf-ext-042","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Doanh nghiệp lớn cần nhanh chóng dựng landing zone multi-account chuẩn best practice (audit account, log archive, SCP, Config, CloudTrail) mà không cấu hình thủ công. Dịch vụ nào?","options":["AWS Control Tower","AWS Organizations đơn thuần","AWS Service Catalog","AWS CloudFormation StackSets"],"correctIndices":[0],"explanation":"Control Tower tự setup landing zone multi-account theo best practice.\n✓ Control Tower auto provision audit/log archive account + Organizations + SCP + Config + CloudTrail.\n✗ Organizations đơn thuần cung cấp khung account nhưng phải cấu hình guardrail thủ công.\n✗ Service Catalog dùng để self-service launch product CF đã duyệt, không dựng landing zone.\n✗ StackSets deploy template nhiều account nhưng không phải giải pháp landing zone trọn gói.","domain":2},
  {"id":"clf-ext-043","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Team muốn để các BU tự launch một số kiến trúc đã được duyệt (từ CloudFormation template) nhưng vẫn đảm bảo governance. Dịch vụ nào phù hợp?","options":["AWS Service Catalog","AWS Systems Manager","AWS Config conformance pack","AWS Launch Wizard"],"correctIndices":[0],"explanation":"Service Catalog cho admin publish product (CF template duyệt) để end-user self-service.\n✓ Service Catalog cho phép self-service launch product đã duyệt, đảm bảo governance.\n✗ Systems Manager quản lý vận hành/cấu hình instance, không phải portfolio template self-service.\n✗ Config conformance pack là bộ rule compliance, không cho launch kiến trúc.\n✗ Launch Wizard hướng dẫn deploy workload cụ thể như SAP/SQL, không phải catalog tự phục vụ chung.","domain":2},
  {"id":"clf-ext-044","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"easy","type":"single","question":"Khách hàng muốn biết một sự cố AWS có đang ảnh hưởng cụ thể đến account của họ không (vd EC2 sắp retire, maintenance window). Họ nên dùng gì?","options":["AWS Health Dashboard (Your account health)","Amazon CloudWatch dashboard","AWS Trusted Advisor","Public status page chung của AWS"],"correctIndices":[0],"explanation":"AWS Health Dashboard có phần account health hiển thị event ảnh hưởng riêng account.\n✓ AWS Health Dashboard account health báo event riêng như EC2 retire, maintenance.\n✗ CloudWatch dashboard hiển thị metric, không báo sự cố/lịch bảo trì của AWS.\n✗ Trusted Advisor đưa khuyến nghị best practice, không báo sự cố hạ tầng AWS.\n✗ Public status page chỉ tổng quát theo region, không có thông tin riêng account.","domain":2},
  {"id":"clf-ext-045","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"multi","question":"AWS Trusted Advisor đưa ra khuyến nghị thuộc những mảng (category) nào sau đây? (Chọn 3)","options":["Cost optimization","Security","Service limits (quotas)","Distributed tracing","Manual penetration testing"],"correctIndices":[0,1,2],"explanation":"Trusted Advisor có 5 mảng: cost optimization, performance, security, fault tolerance, service limits.\n✓ Cost optimization là một mảng (phát hiện idle EC2, EBS unused).\n✓ Security là một mảng (MFA root, SG mở port, S3 public).\n✓ Service limits cảnh báo quota gần hết.\n✗ Distributed tracing là chức năng của X-Ray, không phải mảng của Trusted Advisor.\n✗ Penetration testing thủ công không phải mảng kiểm tra của Trusted Advisor.","domain":2},
  {"id":"clf-ext-046","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"hard","type":"single","question":"Auditor yêu cầu bằng chứng (evidence) thu thập tự động cho audit SOC 2 và PCI DSS, gom từ nhiều dịch vụ AWS theo framework có sẵn. Dịch vụ nào phù hợp nhất?","options":["AWS Audit Manager","AWS Config","AWS CloudTrail","AWS Trusted Advisor"],"correctIndices":[0],"explanation":"Audit Manager tự động collect evidence theo framework compliance (SOC 2, PCI DSS...).\n✓ Audit Manager dùng framework có sẵn để tự động thu thập evidence cho auditor.\n✗ Config đánh giá compliance cấu hình resource nhưng không tạo evidence package theo framework audit.\n✗ CloudTrail cung cấp API log thô, không tổ chức thành evidence theo chuẩn audit.\n✗ Trusted Advisor đưa khuyến nghị, không thu thập evidence audit.","domain":2},
  {"id":"clf-ext-047","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Công ty BYOL Oracle Database lên AWS và lo vi phạm số core license khi Auto Scaling tăng instance. Dịch vụ nào giúp track và enforce license?","options":["AWS License Manager","AWS Config","AWS Service Catalog","Amazon CloudWatch"],"correctIndices":[0],"explanation":"License Manager định nghĩa license rule và track usage BYOL, tránh vi phạm khi scale.\n✓ License Manager track và enforce license rule BYOL (Oracle/Microsoft...) khi auto-scale.\n✗ Config kiểm tra compliance cấu hình resource, không quản số core license phần mềm.\n✗ Service Catalog quản product CF self-service, không track license BYOL.\n✗ CloudWatch theo dõi metric/log, không quản license.","domain":2},
  {"id":"clf-ext-048","courseId":"CLF-C02","lesson":"17-monitoring-governance","certifications":["CLF-C02"],"difficulty":"medium","type":"single","question":"Một fleet 200 EC2 instance, đội tài chính muốn gợi ý right-sizing dựa trên ML để giảm chi phí (vd m5.large xuống m5.medium). Dịch vụ nào?","options":["AWS Compute Optimizer","AWS Trusted Advisor cost check","Amazon CloudWatch detailed monitoring","AWS Cost Explorer"],"correctIndices":[0],"explanation":"Compute Optimizer dùng ML phân tích metric CloudWatch để gợi ý right-sizing instance type.\n✓ Compute Optimizer phân tích metric và gợi ý downsize instance type cụ thể (m5.large→m5.medium).\n✗ Trusted Advisor cost check phát hiện idle/low utilization nhưng không gợi ý instance type bằng ML chi tiết.\n✗ CloudWatch detailed monitoring chỉ tăng độ phân giải metric, không đưa khuyến nghị right-size.\n✗ Cost Explorer phân tích chi phí lịch sử, không gợi ý right-size instance.","domain":2}
];
