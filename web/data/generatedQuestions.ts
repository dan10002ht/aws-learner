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
    "question": "Một developer muốn nhanh chóng triển khai một blog WordPress nhỏ với chi phí cố định, dễ dự đoán hàng tháng, đã bao gồm máy ảo, dung lượng lưu trữ và truyền dữ liệu trong một gói gọn. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon Lightsail",
      "AWS Batch",
      "Amazon EC2 với Reserved Instances",
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
    "question": "Công ty cần chạy hàng nghìn job tính toán khoa học theo lô (batch), tự động cấp phát và thu hồi tài nguyên compute tùy theo khối lượng công việc, mà không phải quản lý hệ thống hàng đợi và scheduler. Dịch vụ nào phù hợp?",
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
    "question": "Một nhóm phát triển muốn upload code ứng dụng web (Java) và để AWS tự động lo việc cung cấp EC2, load balancer, Auto Scaling và monitoring, nhưng vẫn giữ quyền truy cập đầy đủ vào các tài nguyên bên dưới khi cần tinh chỉnh. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một nhóm nghiên cứu cần hệ thống file hiệu năng cực cao (high-performance computing) cho khối lượng tính toán machine learning và phân tích, có khả năng liên kết với dữ liệu trong S3. Dịch vụ FSx nào phù hợp nhất?",
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
    "question": "Một trung tâm dữ liệu on-premises cần truy cập kho lưu trữ object S3 như một file share NFS/SMB local để các ứng dụng cũ có thể đọc/ghi mà không cần viết lại code. Giải pháp nào nên dùng?",
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
    "question": "Một công ty muốn quản lý tập trung và tự động hóa lịch backup cho EBS volumes, RDS databases, DynamoDB tables và EFS file systems từ một nơi duy nhất, với chính sách lưu giữ thống nhất. Dịch vụ nào phù hợp?",
    "options": [
      "AWS Backup",
      "Amazon S3 Lifecycle",
      "AWS Storage Gateway",
      "Amazon EBS Snapshots thủ công"
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
    "question": "Một địa điểm khai thác dầu ngoài khơi không có kết nối internet ổn định cần thu thập và xử lý sơ bộ dữ liệu cảm biến (edge computing) trong môi trường khắc nghiệt, sau đó chuyển khoảng 50 TB dữ liệu về AWS. Thiết bị Snow Family nào phù hợp nhất?",
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
    "question": "Một quản trị viên đang chọn loại EBS volume cho các workload khác nhau. Những phát biểu nào sau đây ĐÚNG? (Chọn 2)",
    "options": [
      "gp3 là SSD đa dụng cho phép cấu hình IOPS và throughput độc lập với dung lượng",
      "io2 là SSD hiệu năng cao phù hợp cho database cần IOPS cao và độ bền cao",
      "sc1 là SSD chuyên cho workload IOPS cực cao",
      "st1 là volume SSD giá rẻ nhất, không hỗ trợ làm boot volume cho nhu cầu throughput",
      "gp2 cho phép cấu hình throughput hoàn toàn tách rời IOPS giống gp3"
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
    "question": "Một doanh nghiệp đang dùng băng từ vật lý (physical tape) cho backup và muốn loại bỏ chi phí quản lý băng từ nhưng vẫn giữ phần mềm backup hiện tại. Giải pháp AWS nào phù hợp?",
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
    "question": "Một công ty cần sao chép tự động object từ một S3 bucket ở us-east-1 sang một bucket ở eu-west-1 để phục vụ tuân thủ và giảm độ trễ cho người dùng châu Âu. Tính năng nào đáp ứng?",
    "options": [
      "S3 Cross-Region Replication (CRR)",
      "S3 Transfer Acceleration",
      "S3 Same-Region Replication (SRR)",
      "S3 Versioning đơn thuần"
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
    "question": "Một dự án phân tích di truyền cần khoảng 5 PB dữ liệu được chuyển từ data center về AWS trong vài tuần. Đường truyền internet hiện tại sẽ mất nhiều tháng để upload. Lựa chọn nào tối ưu nhất về thời gian và chi phí?",
    "options": [
      "Sử dụng nhiều thiết bị AWS Snowball để vận chuyển dữ liệu",
      "Dùng AWS Snowmobile cho toàn bộ dữ liệu",
      "Upload trực tiếp qua S3 Transfer Acceleration",
      "Triển khai Volume Gateway để đồng bộ dần qua internet"
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
    "question": "Một ứng dụng đang chạy cần lưu trữ block storage giá thấp cho dữ liệu log truy cập tuần tự, throughput lớn nhưng ít ngẫu nhiên, ví dụ big data và streaming. Loại EBS nào tiết kiệm chi phí nhất mà vẫn phù hợp?",
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
    "question": "Một công ty lưu hàng triệu file CloudTrail log dưới dạng JSON trong Amazon S3. Team security muốn chạy các câu SQL ad-hoc để điều tra sự cố mà KHÔNG phải provision hay quản lý cluster nào. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một tổ chức cần một data warehouse columnar quy mô petabyte để chạy các báo cáo BI phức tạp lặp lại hằng ngày trên hàng tỷ dòng dữ liệu bán hàng. Dịch vụ AWS nào được thiết kế cho mục đích này?",
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
    "question": "Một startup cần đẩy dữ liệu streaming liên tục vào Amazon S3 với batching và nén tự động, near real-time, mà KHÔNG muốn viết code consumer hay quản lý shard. Lựa chọn nào phù hợp nhất?",
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
    "question": "Một công ty muốn xây dashboard BI cho ban lãnh đạo, dùng natural language để hỏi như 'show me sales by region last quarter', và nhúng dashboard vào ứng dụng SaaS nội bộ. Dịch vụ nào đáp ứng?",
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
    "question": "Team data engineering cần tự động phát hiện schema của các file CSV/JSON mới được upload lên S3 và đưa metadata vào một catalog trung tâm để Athena query ngay. Thành phần nào của AWS Glue làm việc này?",
    "options": [
      "Glue Crawler kết hợp Glue Data Catalog",
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
    "question": "Một công ty cần phân tích 100 GB log nginx theo thời gian thực, hỗ trợ full-text search và dashboard trực quan kiểu Kibana cho team observability. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một team đã có nhiều ứng dụng dùng Apache Kafka on-premises và muốn chuyển lên AWS với ít thay đổi code nhất, tận dụng ecosystem Kafka quen thuộc. Dịch vụ nào nên chọn?",
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
    "question": "Một công ty xây data lake trên S3 và muốn kiểm soát quyền truy cập fine-grained (row-level, column-level) cho hàng trăm người dùng phục vụ tuân thủ GDPR. Những phát biểu nào ĐÚNG về AWS Lake Formation? (Chọn 2)",
    "options": [
      "Lake Formation cho phép quản fine-grained permission ở mức row/column/cell trên data lake",
      "Lake Formation hỗ trợ tag-based access control và tích hợp với Athena, Redshift Spectrum, EMR",
      "Lake Formation là một data warehouse columnar thay thế cho Redshift",
      "Lake Formation là công cụ BI để vẽ dashboard cho business user",
      "Lake Formation là dịch vụ stream ingest real-time thay cho Kinesis"
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
    "question": "Một nhóm nghiên cứu cần chạy các job Apache Spark và Apache Hive quy mô hàng terabyte, đồng thời muốn dùng thêm HBase và Flink, với khả năng tận dụng EC2 Spot để giảm chi phí. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn mua dataset thời tiết và dữ liệu nhân khẩu học từ nhà cung cấp bên thứ ba, và để dữ liệu tự động được giao vào Amazon S3. Dịch vụ AWS nào dùng cho việc này?",
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
    "question": "Một ứng dụng IoT thu thập dữ liệu từ 100.000 thiết bị real-time, và cần NHIỀU consumer khác nhau (analytics, alerting, lưu trữ) cùng đọc một stream với khả năng replay dữ liệu trong nhiều ngày. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty dùng Athena query data lake trên S3 nhưng chi phí tăng cao vì mỗi truy vấn scan toàn bộ file CSV lớn. Họ muốn giảm chi phí Athena mà vẫn giữ dữ liệu trên S3. Hành động nào hiệu quả nhất?",
    "options": [
      "Chuyển dữ liệu sang định dạng cột nén như Parquet/ORC và partition theo cột thường lọc",
      "Chuyển toàn bộ workload sang Amazon EMR để xử lý",
      "Nâng cấp lên Redshift provisioned cluster cỡ lớn nhất",
      "Bật Kinesis Data Firehose để stream lại dữ liệu vào S3"
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
    "question": "Một security team cần biết CHÍNH XÁC ai đã xoá một IAM user vào lúc 3 giờ sáng và từ IP nào. Họ nên xem ở đâu?",
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
    "question": "Đội vận hành muốn nhận thông báo qua SMS khi CPU của một EC2 instance vượt 80% trong 5 phút. Dịch vụ nào phù hợp nhất?",
    "options": [
      "Amazon CloudWatch alarm tích hợp SNS",
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
    "question": "Công ty cần đảm bảo TẤT CẢ S3 bucket luôn bật versioning và được đánh dấu NON_COMPLIANT nếu vi phạm. Dịch vụ nào đáp ứng?",
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
    "question": "Một tổ chức có 12 AWS account và muốn 1 hoá đơn duy nhất cùng việc share volume discount. Dịch vụ nào cung cấp điều này?",
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
    "question": "Quản trị viên đã gắn SCP deny s3:DeleteBucket cho một OU, nhưng muốn cấp quyền tạo bucket cho dev trong OU đó. Họ cần làm gì?",
    "options": [
      "Tạo IAM policy grant s3:CreateBucket cho dev, vì SCP không tự grant quyền",
      "Thêm Allow s3:CreateBucket vào SCP để tự động cấp quyền cho dev",
      "Xoá SCP vì SCP ghi đè mọi IAM policy",
      "Dùng AWS Config rule để grant quyền tạo bucket"
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
    "question": "Doanh nghiệp lớn cần nhanh chóng dựng landing zone multi-account chuẩn best practice (audit account, log archive, SCP, Config, CloudTrail) mà không cấu hình thủ công. Dịch vụ nào?",
    "options": [
      "AWS Control Tower",
      "AWS Organizations đơn thuần",
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
    "question": "Team muốn để các BU tự launch một số kiến trúc đã được duyệt (từ CloudFormation template) nhưng vẫn đảm bảo governance. Dịch vụ nào phù hợp?",
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
    "question": "Khách hàng muốn biết một sự cố AWS có đang ảnh hưởng cụ thể đến account của họ không (vd EC2 sắp retire, maintenance window). Họ nên dùng gì?",
    "options": [
      "AWS Health Dashboard (Your account health)",
      "Amazon CloudWatch dashboard",
      "AWS Trusted Advisor",
      "Public status page chung của AWS"
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
    "question": "AWS Trusted Advisor đưa ra khuyến nghị thuộc những mảng (category) nào sau đây? (Chọn 3)",
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
    "question": "Auditor yêu cầu bằng chứng (evidence) thu thập tự động cho audit SOC 2 và PCI DSS, gom từ nhiều dịch vụ AWS theo framework có sẵn. Dịch vụ nào phù hợp nhất?",
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
    "question": "Công ty BYOL Oracle Database lên AWS và lo vi phạm số core license khi Auto Scaling tăng instance. Dịch vụ nào giúp track và enforce license?",
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
    "question": "Một fleet 200 EC2 instance, đội tài chính muốn gợi ý right-sizing dựa trên ML để giảm chi phí (vd m5.large xuống m5.medium). Dịch vụ nào?",
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
    "question": "Một startup thương mại điện tử vừa ra mắt và không thể dự đoán lượng truy cập. Họ muốn hạ tầng tự động tăng tài nguyên khi có chương trình khuyến mãi và giảm xuống khi vắng khách, để chỉ trả tiền cho thứ thực sự dùng. Đặc tính nào của AWS Cloud đáp ứng nhu cầu này?",
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
    "question": "Một công ty truyền thống mua sẵn các máy chủ vật lý đắt tiền cho trung tâm dữ liệu, đầu tư lớn ngay từ đầu dù chưa biết có dùng hết công suất hay không. Khi chuyển sang AWS, lợi ích kinh tế cốt lõi nào họ nhận được?",
    "options": [
      "Chuyển chi phí từ CapEx sang OpEx, trả theo mức sử dụng",
      "Loại bỏ hoàn toàn mọi chi phí vận hành hằng tháng",
      "Được AWS bảo hành phần cứng vật lý tại văn phòng của họ",
      "Sở hữu vĩnh viễn các máy chủ AWS sau 12 tháng"
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
    "question": "Một nền tảng game trực tuyến có người chơi ở châu Á, châu Âu và Bắc Mỹ phàn nàn về độ trễ cao. Đội kỹ thuật muốn triển khai máy chủ gần người chơi ở từng khu vực để giảm latency mà không cần xây trung tâm dữ liệu riêng. Đặc tính nào của AWS Cloud cho phép điều này?",
    "options": [
      "Global reach thông qua các AWS Regions trên toàn thế giới",
      "Vertical scaling máy chủ trong một Availability Zone",
      "Tăng dung lượng lưu trữ Amazon S3 cho mỗi bucket",
      "Sử dụng Reserved Instances để giảm chi phí EC2"
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
    "question": "Một nhóm nghiên cứu cần chạy thử nghiệm phân tích dữ liệu lớn trong vài ngày. Trước đây họ phải chờ hàng tuần để mua và lắp đặt máy chủ. Trên AWS, họ khởi tạo hàng trăm instance trong vài phút và xóa khi xong. Lợi ích nào của AWS Cloud được thể hiện rõ nhất ở đây?",
    "options": [
      "Agility — triển khai tài nguyên nhanh để thử nghiệm và đổi mới",
      "Fault tolerance — hệ thống tiếp tục chạy khi một thành phần lỗi",
      "Economies of scale — giá thấp hơn nhờ quy mô của AWS",
      "Shared responsibility — phân chia trách nhiệm bảo mật"
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
    "question": "Một ngân hàng yêu cầu ứng dụng giao dịch trực tuyến luôn truy cập được, kể cả khi một data center gặp sự cố. Kiến trúc sư triển khai ứng dụng trên nhiều Availability Zones trong một Region. Lợi ích nào của AWS Cloud là động lực chính cho thiết kế này?",
    "options": [
      "High availability",
      "Elasticity",
      "Chuyển đổi CapEx sang OpEx",
      "Edge computing với AWS Wavelength"
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
    "question": "Một CFO đang chuẩn bị business case chuyển data center on-premises sang AWS Cloud và cần nêu ĐÚNG một lợi ích tài chính/vận hành thực sự của AWS. Phát biểu nào sau đây là lợi ích hợp lệ?",
    "options": [
      "Trả theo mức sử dụng (pay-as-you-go) thay vì đầu tư vốn lớn ban đầu",
      "Chuyển sang AWS sẽ loại bỏ hoàn toàn trách nhiệm bảo mật của khách hàng",
      "AWS đảm bảo ứng dụng sẽ không bao giờ phát sinh bất kỳ chi phí nào",
      "AWS sẽ tự viết và bảo trì mã nguồn ứng dụng của khách hàng"
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
    "question": "Một nhà sản xuất xe tự hành cần xử lý dữ liệu cảm biến với độ trễ cực thấp ngay tại các thành phố lớn, dùng mạng 5G của nhà mạng viễn thông để dữ liệu không phải đi xa tới Region. Giải pháp AWS nào phù hợp nhất với yêu cầu edge computing trên hạ tầng 5G này?",
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
    "question": "Một công ty bảo hiểm muốn xây dựng ứng dụng chatbot sinh ngôn ngữ tự nhiên dựa trên các foundation model có sẵn, đồng thời tùy biến theo dữ liệu nội bộ, mà không phải tự huấn luyện mô hình từ đầu hay quản lý hạ tầng. Dịch vụ AWS nào phù hợp nhất để xây dựng ứng dụng generative AI này?",
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
    "question": "Một công ty thương mại điện tử muốn giảm tác động môi trường của hạ tầng cloud bằng cách chuyển workload sang Graviton instances và chọn region dùng nhiều năng lượng tái tạo. Mục tiêu này thuộc pillar nào của AWS Well-Architected Framework?",
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
    "question": "Một ngân hàng muốn đảm bảo hệ thống core banking tiếp tục hoạt động và tự động khôi phục khi một Availability Zone bị lỗi, với RTO dưới 5 phút. Yêu cầu này phù hợp nhất với pillar nào?",
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
    "question": "Một startup deploy hạ tầng thủ công qua AWS Console, không có quy trình rollback và không monitor. Họ muốn cải thiện bằng cách quản lý hạ tầng bằng CloudFormation, deploy nhỏ thường xuyên và thêm CloudWatch alarm. Những cải tiến này chủ yếu thuộc pillar nào?",
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
    "question": "Một công ty SaaS phục vụ người dùng toàn cầu phàn nàn về độ trễ cao. Đội kiến trúc muốn dùng CloudFront, chọn đúng EC2 instance family cho workload và áp dụng serverless để scale theo nhu cầu. Các quyết định này phản ánh pillar nào?",
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
    "question": "CFO của một doanh nghiệp yêu cầu giảm hóa đơn AWS bằng cách mua Savings Plans cho compute ổn định, bật S3 Intelligent-Tiering và dùng AWS Budgets để theo dõi chi tiêu. Hoạt động này thuộc pillar nào của Well-Architected Framework?",
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
    "question": "Một bệnh viện cần tuân thủ quy định bảo vệ dữ liệu bệnh nhân. Họ bật mã hóa at-rest bằng KMS, mã hóa in-transit bằng TLS, áp dụng least privilege qua IAM và bật MFA cho mọi tài khoản. Những biện pháp này thuộc pillar nào?",
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
    "question": "Một đội DevOps quyết định chạy batch processing không quan trọng trên Spot Instances để tiết kiệm tới 90% chi phí, chấp nhận rằng instance có thể bị reclaim. Theo tinh thần Well-Architected Framework, nhận định nào MÔ TẢ ĐÚNG NHẤT tình huống này?",
    "options": [
      "Đây là một explicit trade-off: tăng Cost Optimization nhưng có thể giảm Reliability, và WAF khuyến khích chấp nhận trade-off khi đã cân nhắc",
      "Đây là vi phạm nghiêm trọng vì WAF cấm dùng Spot Instances trong mọi trường hợp",
      "Spot Instances cải thiện đồng thời cả Cost Optimization và Reliability mà không có đánh đổi",
      "Quyết định này thuộc Performance Efficiency pillar vì Spot giúp hệ thống chạy nhanh hơn"
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
    "question": "Một kiến trúc sư thay thế các server và database tự quản lý trên EC2 bằng AWS managed services như RDS, Lambda và DynamoDB. Theo Well-Architected Framework, đâu là mô tả ĐÚNG về lợi ích mà managed services mang lại?",
    "options": [
      "Cost Optimization được hỗ trợ vì loại bỏ undifferentiated heavy lifting",
      "Security được cải thiện vì managed services tự động vô hiệu hóa toàn bộ IAM",
      "Reliability được đảm bảo vì managed services loại bỏ hoàn toàn nhu cầu backup và DR",
      "Operational Excellence không liên quan vì managed services làm tăng operational burden"
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
    "question": "Một công ty có ứng dụng web cũ chạy trên on-premises servers. Họ muốn nhanh chóng chuyển ứng dụng lên AWS mà KHÔNG thay đổi code, chỉ đơn giản 'lift and shift' lên EC2 instances. Chiến lược migration nào trong 7 Rs phù hợp nhất?",
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
    "question": "Một tổ chức đang lập kế hoạch chuyển đổi đám mây và muốn đảm bảo nhân viên có đủ kỹ năng cloud, đồng thời xây dựng văn hóa thay đổi và quản lý đào tạo. Perspective nào trong AWS Cloud Adoption Framework (CAF) tập trung vào khía cạnh này?",
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
    "question": "Một công ty cần migrate 200 TB dữ liệu từ data center lên Amazon S3. Đường truyền internet của họ chậm và việc truyền qua mạng sẽ mất nhiều tuần. Giải pháp nào giúp chuyển lượng dữ liệu lớn này lên AWS nhanh chóng và an toàn?",
    "options": [
      "AWS Snowball",
      "AWS DataSync qua internet",
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
    "question": "Một doanh nghiệp đang dùng máy chủ email Microsoft Exchange tự quản. Khi lên cloud, họ quyết định bỏ hệ thống tự quản và chuyển sang dùng dịch vụ email SaaS (như Microsoft 365). Đây là chiến lược nào trong 7 Rs?",
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
    "question": "Một công ty muốn di chuyển cơ sở dữ liệu Oracle on-premises sang Amazon Aurora với thời gian gián đoạn (downtime) tối thiểu, và cần chuyển đổi giữa hai loại database engine khác nhau. Dịch vụ AWS nào hỗ trợ tốt nhất cho việc này?",
    "options": [
      "AWS Database Migration Service (DMS) kết hợp Schema Conversion Tool (SCT)",
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
    "question": "Một tổ chức đang phân loại ứng dụng theo chiến lược di trú 7 Rs. Tình huống nào sau đây được ánh xạ ĐÚNG với chiến lược tương ứng?",
    "options": [
      "Một ứng dụng nội bộ không còn ai dùng và sẽ được tắt hoàn toàn — Retire",
      "Chuyển ứng dụng lên EC2 nhưng đổi self-managed MySQL sang Amazon RDS — Refactor",
      "Viết lại hoàn toàn monolith thành microservices serverless — Rehost",
      "Mua thiết bị Snowball để chuyển dữ liệu — Replatform"
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
    "question": "Trong AWS Cloud Adoption Framework, đội ngũ cần thiết lập kiểm soát danh tính, phát hiện mối đe dọa, quản lý quyền truy cập và bảo vệ dữ liệu trong suốt quá trình chuyển đổi cloud. Perspective nào của CAF chịu trách nhiệm chính cho các năng lực này?",
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
    "question": "Một công ty đang chạy ứng dụng trên VMware tại data center và muốn nhanh chóng di chuyển toàn bộ môi trường VMware lên AWS Cloud mà không cần mua lại license, không thay đổi kiến trúc hay hệ điều hành. Chiến lược 7 Rs nào mô tả đúng nhất việc này?",
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
    "question": "Một công ty đang lập kế hoạch ngân sách hàng tháng cho hệ thống chạy trên EC2 với mô hình On-Demand, nơi số lượng instance tăng giảm theo lưu lượng truy cập thực tế. Theo nguyên tắc cloud economics, chi phí EC2 On-Demand này được phân loại là gì?",
    "options": [
      "Variable cost (chi phí biến đổi) vì thay đổi theo mức sử dụng",
      "Fixed cost (chi phí cố định) vì luôn trả một khoản như nhau mỗi tháng",
      "Capital expenditure (CapEx) vì là khoản đầu tư trả trước",
      "Sunk cost vì không thể thu hồi"
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
    "question": "Một doanh nghiệp di chuyển từ data center on-premises lên AWS và muốn so sánh chi phí. Yếu tố chi phí nào sau đây tồn tại trong môi trường on-premises nhưng được AWS đảm nhận, giúp giảm Total Cost of Ownership (TCO)?",
    "options": [
      "Chi phí điện, làm mát và bảo trì phần cứng vật lý của data center",
      "Chi phí lưu lượng dữ liệu ra Internet (data transfer out)",
      "Chi phí cấp phép phần mềm ứng dụng bên thứ ba do công ty tự mua",
      "Chi phí nhân sự phát triển ứng dụng nội bộ"
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
    "question": "Công ty hiện sở hữu giấy phép Microsoft SQL Server đã mua trước đây và muốn tiếp tục tận dụng khi chạy trên AWS để tránh trả thêm phí license. Cách tiếp cận license nào phù hợp nhất?",
    "options": [
      "Bring Your Own License (BYOL), mang giấy phép hiện có sang AWS",
      "License-included, dùng RDS với chi phí license đã gộp vào giá giờ",
      "Mua mới license trực tiếp từ AWS Marketplace cho mỗi instance",
      "Sử dụng phiên bản open-source thay thế để khỏi cần license"
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
    "question": "AWS có thể cung cấp dịch vụ với giá thấp hơn so với việc mỗi công ty tự xây data center riêng. Nguyên tắc cloud economics nào giải thích điều này?",
    "options": [
      "Economies of scale (lợi thế quy mô)",
      "Loose coupling kiến trúc",
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
    "question": "Đội vận hành phát hiện nhiều EC2 instance loại m5.4xlarge nhưng CPU và bộ nhớ chỉ dùng dưới 10% trong thời gian dài. Hành động tối ưu chi phí nào phù hợp nhất theo nguyên tắc cloud economics?",
    "options": [
      "Rightsizing — chuyển sang instance type nhỏ hơn phù hợp với tải thực tế",
      "Mua Reserved Instances cho chính các m5.4xlarge này để được giảm giá",
      "Bật Multi-AZ để phân tán tải tốt hơn",
      "Chuyển toàn bộ sang S3 để lưu trữ rẻ hơn"
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
    "question": "Một startup muốn cắt giảm chi phí cloud bằng cách áp dụng nguyên tắc automation và elasticity, tránh lãng phí tài nguyên. Biện pháp nào sau đây áp dụng ĐÚNG nguyên tắc này?",
    "options": [
      "Dùng Auto Scaling để tự động giảm số EC2 instance khi lưu lượng thấp",
      "Mua trước nhiều EC2 On-Demand chạy 24/7 để luôn sẵn sàng cho cao điểm",
      "Triển khai instance cố định kích thước tối đa quanh năm cho an toàn",
      "Tắt thủ công từng server vào cuối mỗi ngày làm việc"
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
    "question": "Giám đốc tài chính yêu cầu giải thích vì sao việc chuyển lên AWS giúp chuyển đổi cơ cấu chi phí. Đặc điểm nào mô tả đúng sự thay đổi từ on-premises sang AWS?",
    "options": [
      "Chuyển từ chi phí cố định trả trước (CapEx) sang chi phí biến đổi theo mức dùng (OpEx)",
      "Chuyển từ chi phí biến đổi sang chi phí cố định trả trước hằng năm",
      "Loại bỏ hoàn toàn mọi chi phí biến đổi liên quan data transfer",
      "Buộc phải trả trước toàn bộ hạ tầng 3 năm để được dùng dịch vụ"
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
    "question": "Một ứng dụng có tải nền ổn định 24/7 đã biết trước trong 3 năm, cộng thêm các đợt tăng đột biến không thể dự đoán. Để tối ưu chi phí theo cloud economics, cách kết hợp mua nào hợp lý nhất?",
    "options": [
      "Dùng Savings Plans/Reserved Instances cho phần tải nền ổn định, và On-Demand/Spot cho phần tải đột biến",
      "Dùng toàn bộ On-Demand cho cả tải nền lẫn tải đột biến để giữ linh hoạt tối đa",
      "Dùng toàn bộ Reserved Instances cam kết theo công suất đỉnh cao nhất từng ghi nhận",
      "Dùng toàn bộ Spot Instances cho cả tải nền và tải đột biến để có giá rẻ nhất"
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
    "question": "Một công ty chạy ứng dụng trên Amazon EC2. Theo AWS Shared Responsibility Model, ai chịu trách nhiệm cài đặt các bản patch bảo mật cho hệ điều hành (guest OS) trên instance đó?",
    "options": [
      "Khách hàng (customer)",
      "AWS",
      "Nhà cung cấp phần cứng của trung tâm dữ liệu",
      "AWS Support, miễn phí ở mọi tier"
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
    "question": "Trong AWS Shared Responsibility Model, hạng mục nào LUÔN thuộc về AWS bất kể khách hàng dùng dịch vụ nào?",
    "options": [
      "Bảo mật vật lý của các trung tâm dữ liệu (physical security)",
      "Cấu hình Security Group",
      "Quản lý IAM users và policies",
      "Mã hóa dữ liệu phía client (client-side encryption)"
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
    "question": "Một nhóm DevOps chuyển workload từ Amazon EC2 (tự cài database) sang Amazon RDS. Sau khi chuyển, trách nhiệm nào của họ ĐƯỢC GIẢM (chuyển sang AWS) nhờ dịch vụ quản lý?",
    "options": [
      "Vá lỗi (patching) hệ điều hành nền của database engine",
      "Thiết kế schema và viết câu truy vấn của ứng dụng",
      "Quản lý quyền truy cập IAM vào RDS",
      "Cấu hình Security Group cho RDS instance"
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
    "question": "Một developer build ứng dụng serverless bằng AWS Lambda. Hạng mục nào KHÔNG còn là trách nhiệm của họ vì Lambda quản lý sẵn?",
    "options": [
      "Vá lỗi và bảo trì hệ điều hành chạy code",
      "Bảo mật code của function (tránh lỗ hổng trong logic)",
      "Quản lý IAM execution role gán cho function",
      "Cấu hình biến môi trường và quyền truy cập tài nguyên"
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
    "question": "Một công ty lưu trữ tài liệu nhạy cảm trong Amazon S3. Họ lo ngại bị rò rỉ dữ liệu. Theo Shared Responsibility Model, ai chịu trách nhiệm BẬT mã hóa và cấu hình quyền truy cập (bucket policy) cho dữ liệu này?",
    "options": [
      "Khách hàng",
      "AWS, vì S3 là dịch vụ được quản lý",
      "AWS, vì mã hóa hạ tầng là 'security OF the cloud'",
      "Cả hai cùng cấu hình quyền truy cập theo từng object"
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
    "question": "Một kiến trúc sư review môi trường gồm EC2, RDS và Lambda theo Shared Responsibility Model. Hạng mục nào LUÔN là trách nhiệm của khách hàng bất kể dùng dịch vụ nào?",
    "options": [
      "Quản lý IAM (users, roles, policies) và quyền truy cập",
      "Vá lỗi (patch) hypervisor bên dưới",
      "Bảo trì phần cứng máy chủ vật lý",
      "Kiểm soát truy cập vật lý vào trung tâm dữ liệu"
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
    "question": "Một team chuyển một loạt workload từ EC2 sang các managed/serverless services. Phát biểu nào MÔ TẢ ĐÚNG cách trách nhiệm dịch chuyển dọc theo phổ EC2 → RDS → Lambda?",
    "options": [
      "Càng dùng dịch vụ được quản lý nhiều, AWS đảm nhận thêm phần OS/runtime, khách hàng tập trung vào dữ liệu và cấu hình",
      "Khi dùng Lambda, khách hàng chịu trách nhiệm nhiều hơn vì phải quản lý cả OS lẫn scaling",
      "Với RDS, khách hàng phải tự vá lỗi database engine giống hệt như EC2",
      "Khi dùng dịch vụ managed, AWS sẽ tự cấu hình IAM và quyền truy cập dữ liệu cho khách hàng"
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
    "question": "Một auditor phát hiện một EC2 instance bị xâm nhập do guest OS chưa cài bản vá lỗ hổng đã công bố 6 tháng trước, và một Security Group mở port 22 cho 0.0.0.0/0. Theo Shared Responsibility Model, kết luận nào ĐÚNG về trách nhiệm?",
    "options": [
      "Cả việc patch OS lẫn cấu hình Security Group đều là trách nhiệm của khách hàng",
      "AWS chịu trách nhiệm vì lỗ hổng OS nằm trong hạ tầng AWS cung cấp",
      "AWS chịu trách nhiệm cấu hình Security Group vì đó là tài nguyên mạng của AWS",
      "Trách nhiệm patch OS thuộc AWS, còn Security Group thuộc khách hàng"
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
    "question": "Một công ty dùng Amazon RDS làm database chính. Khi áp dụng Shared Responsibility Model, những hạng mục nào dưới đây vẫn THUỘC TRÁCH NHIỆM của khách hàng dù RDS là managed service? (Chọn 2)",
    "options": [
      "Bật mã hóa at-rest và cấu hình quản lý key cho database",
      "Cấu hình quyền truy cập network (Security Group, subnet) tới RDS",
      "Vá lỗi hệ điều hành nền của RDS",
      "Bảo trì và thay thế ổ đĩa phần cứng lưu trữ",
      "Cài đặt và nâng cấp phiên bản minor của database engine theo lịch bảo trì tự động"
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
    "question": "Phát biểu nào tóm tắt ĐÚNG nguyên tắc cốt lõi của AWS Shared Responsibility Model?",
    "options": [
      "AWS chịu trách nhiệm bảo mật OF the cloud (hạ tầng); khách hàng chịu trách nhiệm bảo mật IN the cloud (dữ liệu, cấu hình, truy cập)",
      "AWS chịu trách nhiệm toàn bộ bảo mật, khách hàng chỉ trả tiền",
      "Khách hàng chịu trách nhiệm bảo mật phần cứng vật lý của data center",
      "Trách nhiệm bảo mật được chia 50/50 cố định cho mọi dịch vụ"
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
    "question": "Đội bảo mật muốn biết ai đã gọi API để xóa một S3 bucket và vào thời điểm nào, nhằm phục vụ điều tra. Dịch vụ nào ghi lại lịch sử các API call trong tài khoản AWS?",
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
    "question": "Đội DevOps cần tự động quét các EC2 instance và container image để phát hiện các lỗ hổng phần mềm đã biết (CVE) và các vấn đề về network exposure. Dịch vụ AWS nào được thiết kế cho mục đích này?",
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
      "Dùng ACM cấp TLS certificate cho ALB để mã hóa in transit, và bật encryption with KMS cho RDS để mã hóa at rest",
      "Dùng KMS cho cả mã hóa in transit ở ALB và at rest ở RDS",
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
      "Bật MFA cho root user và tạo IAM user riêng cho công việc hằng ngày",
      "Xóa root user và chỉ dùng IAM users",
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
      "Tạo IAM group, gắn policy vào group rồi thêm các user vào group",
      "Tạo 50 policy giống nhau gán riêng từng user",
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
      "Gán IAM role cho EC2 instance (instance profile)",
      "Lưu access key trong file cấu hình trên EC2",
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
    "question": "Doanh nghiệp đang dùng Microsoft Active Directory nội bộ và muốn nhân viên đăng nhập vào nhiều AWS account bằng tài khoản công ty hiện có, quản lý quyền tập trung. Dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "AWS IAM Identity Center (SSO)",
      "Tạo IAM user trùng tên cho từng nhân viên trong mỗi account",
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
    "question": "Đội bảo mật rà soát một AWS account và lập danh sách các tác vụ CHỈ root user mới thực hiện được (không thể ủy quyền cho IAM user). Chọn HAI tác vụ chỉ root làm được.",
    "options": [
      "Thay đổi AWS Support plan của account",
      "Đóng (close) AWS account",
      "Tạo một IAM user mới",
      "Gắn policy vào IAM group",
      "Khởi chạy một EC2 instance"
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
    "question": "Đội bảo mật muốn lọc các request HTTP độc hại như SQL injection và cross-site scripting (XSS) tới một Application Load Balancer và Amazon CloudFront. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Đội vận hành muốn phát hiện hành vi bất thường như EC2 instance giao tiếp với địa chỉ IP của máy chủ điều khiển malware hoặc truy cập trái phép vào tài khoản, bằng cách phân tích VPC Flow Logs, DNS logs và CloudTrail. Dịch vụ nào được thiết kế cho việc này?",
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
    "question": "Một công ty đang chạy database PostgreSQL self-managed trên một EC2 instance. Đội vận hành phải tự lo việc patch hệ điều hành, cài đặt bản vá engine, cấu hình backup và monitoring. Họ muốn chuyển sang một managed service để AWS lo các tác vụ vận hành này mà vẫn giữ engine PostgreSQL. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một ứng dụng web thương mại điện tử dùng Amazon RDS làm primary database. Khi khuyến mãi, lượng truy vấn ĐỌC (đọc catalog sản phẩm) tăng vọt và làm primary instance quá tải, trong khi lượng ghi không đổi. Đội kỹ thuật muốn phân tải các truy vấn đọc ra nhiều instance. Giải pháp nào phù hợp nhất?",
    "options": [
      "Tạo RDS Read Replica để serve các truy vấn đọc",
      "Bật Multi-AZ deployment để standby instance xử lý truy vấn đọc",
      "Tăng backup retention period lên 35 ngày",
      "Bật Deletion Protection trên primary instance"
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
    "question": "Một startup gaming xây dựng tính năng giỏ hàng (shopping cart) và session người dùng cần độ trễ truy cập sub-millisecond, dữ liệu mang tính tạm thời. Họ muốn một in-memory data store managed để giảm tải cho database chính. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một doanh nghiệp đang vận hành database Oracle on-premises và muốn migrate sang Amazon Aurora PostgreSQL. Vì engine nguồn (Oracle) và engine đích (PostgreSQL) khác nhau, họ cần chuyển đổi schema và stored procedures trước, sau đó di chuyển dữ liệu với downtime tối thiểu. Tổ hợp dịch vụ AWS nào phù hợp nhất?",
    "options": [
      "AWS Schema Conversion Tool (SCT) để chuyển đổi schema, sau đó AWS Database Migration Service (DMS) để di chuyển dữ liệu",
      "Chỉ dùng AWS DMS để vừa chuyển schema vừa di chuyển dữ liệu giống hệt nhau",
      "Amazon Redshift Spectrum để query trực tiếp database Oracle",
      "AWS Glue Crawler để tự động chuyển đổi schema Oracle sang PostgreSQL"
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
    "question": "Một công ty social media cần một database phục vụ workload key-value với hàng triệu request mỗi giây, độ trễ single-digit millisecond ổn định, và quy mô tăng trưởng gần như vô hạn mà không cần quản lý server. Họ chọn Amazon DynamoDB. Những phát biểu nào sau đây ĐÚNG về DynamoDB? (Chọn 2)",
    "options": [
      "DynamoDB là serverless NoSQL, không cần provision hay quản lý server",
      "DynamoDB cung cấp DynamoDB Global Tables cho multi-region active-active replication",
      "DynamoDB hỗ trợ SQL JOIN phức tạp giữa nhiều bảng giống RDS",
      "DynamoDB yêu cầu bạn tự patch hệ điều hành của các node",
      "DynamoDB chỉ chạy được trong một Availability Zone duy nhất"
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
    "question": "Một công ty triển khai web server trong public subnet. Họ muốn cho phép HTTPS inbound từ Internet nhưng tạm thời CHẶN một dải IP cụ thể đang tấn công. Họ chỉ cần tạo rule DENY ở đâu trong VPC?",
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
    "question": "Một startup cần giảm độ trễ khi phân phối video và ảnh tĩnh cho người dùng toàn cầu bằng cách cache nội dung tại edge locations. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một công ty cần kết nối data center on-premises với AWS qua một đường truyền RIÊNG, băng thông ổn định, độ trễ thấp và nhất quán để truyền khối lượng dữ liệu lớn hằng ngày. Giải pháp nào phù hợp nhất?",
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
    "question": "Một kiến trúc sư cần cấu hình để instance trong private subnet có thể tải bản cập nhật từ Internet nhưng KHÔNG cho phép Internet khởi tạo kết nối đến instance đó. Những thành phần nào cần dùng? (Chọn 2)",
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
    "question": "Một quản trị viên cấu hình Security Group cho phép inbound HTTPS (port 443) nhưng KHÔNG thêm bất kỳ outbound rule nào cho phản hồi. Người dùng vẫn nhận được phản hồi từ web server thành công. Vì sao?",
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
    "question": "Một công ty cần lưu trữ các bản backup mà họ hiếm khi truy cập (vài lần mỗi năm), chấp nhận thời gian truy xuất vài giờ và muốn chi phí lưu trữ THẤP NHẤT có thể. Storage class nào của Amazon S3 phù hợp nhất?",
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
    "question": "Một ứng dụng phân tích log có mẫu truy cập KHÔNG dự đoán được: một số object được đọc liên tục trong tháng đầu rồi gần như không bao giờ đụng tới, một số khác thì ngược lại. Công ty muốn tối ưu chi phí mà KHÔNG phải tự phân tích và di chuyển dữ liệu thủ công. Lựa chọn nào tốt nhất?",
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
    "question": "Một ứng dụng EC2 chạy database cần block storage hiệu năng cao mà dữ liệu phải TỒN TẠI ngay cả khi instance bị stop hoặc terminate. Loại storage nào đáp ứng?",
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
    "question": "Nhiều EC2 instance trên Linux trong cùng một ứng dụng cần CÙNG truy cập đọc/ghi vào một hệ thống file dùng chung, tự động co giãn dung lượng. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty muốn TỰ ĐỘNG chuyển object từ S3 Standard sang S3 Standard-IA sau 30 ngày và xóa chúng sau 365 ngày để giảm chi phí. Tính năng nào của S3 thực hiện việc này?",
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
    "question": "Một trung tâm dữ liệu on-premises muốn cung cấp cho ứng dụng nội bộ quyền truy cập file qua giao thức NFS/SMB với độ trễ thấp (cache cục bộ), trong khi dữ liệu thực tế được lưu bền vững trên Amazon S3. Giải pháp nào phù hợp?",
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
    "question": "Một tổ chức muốn quản lý backup TẬP TRUNG và tự động theo policy cho nhiều dịch vụ AWS từ một nơi duy nhất. AWS Backup có thể bảo vệ những tài nguyên nào sau đây? (Chọn 2)",
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
    "question": "Một startup muốn xây dựng nhanh một ứng dụng chatbot tư vấn sản phẩm dựa trên large language model (như Claude), không có data scientist và không muốn train model từ đầu. Họ chỉ cần gọi foundation model qua API và thêm guardrails. Dịch vụ AWS nào phù hợp nhất?",
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
    "question": "Một bệnh viện cần chuyển các file ghi âm cuộc trao đổi giữa bác sĩ và bệnh nhân thành văn bản text để lưu hồ sơ, với thuật ngữ y khoa chính xác. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một công ty bảo hiểm cần tự động trích xuất số tiền, ngày, và các trường form từ hàng nghìn file PDF hóa đơn và đơn yêu cầu bồi thường scan. Dịch vụ AWS nào được thiết kế chuyên cho việc này?",
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
    "question": "Team analytics cần chạy truy vấn SQL ad-hoc trực tiếp trên các file log định dạng CSV/Parquet đang lưu trong Amazon S3, mà không muốn dựng và quản lý server database. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một doanh nghiệp xây dựng pipeline phân tích dữ liệu: thu thập clickstream real-time từ website, làm sạch/biến đổi (ETL) và tạo data catalog, rồi cuối cùng trình bày kết quả bằng dashboard tương tác cho lãnh đạo. Hãy chọn các dịch vụ phù hợp với từng giai đoạn (chọn 3).",
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
    "question": "Một tập đoàn có hàng triệu tài liệu nội bộ nằm rải rác trên Amazon S3, SharePoint và Confluence. Nhân viên muốn đặt câu hỏi bằng ngôn ngữ tự nhiên (ví dụ 'chính sách nghỉ phép thai sản là gì?') và nhận câu trả lời chính xác từ kho tài liệu này. Dịch vụ AWS chuyên cho enterprise search NLU này là gì?",
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
    "question": "Một công ty muốn gửi thông báo cùng lúc đến nhiều endpoint khác nhau (email, SMS và một số hàng đợi xử lý) theo mô hình publish/subscribe, mỗi message được đẩy ngay đến tất cả subscriber. Dịch vụ nào phù hợp nhất?",
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
    "question": "Một nhóm DevOps muốn tự động hóa toàn bộ quy trình: lấy code từ repo, build, test rồi deploy qua nhiều giai đoạn (staging, production). Dịch vụ nào điều phối (orchestrate) toàn bộ pipeline CI/CD end-to-end này?",
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
    "question": "Một ứng dụng cần định tuyến sự kiện từ nhiều nguồn (SaaS bên thứ ba, dịch vụ AWS, ứng dụng nội bộ) đến các target khác nhau dựa trên rule mà không cần viết code polling. Dịch vụ serverless nào đáp ứng tốt nhất?",
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
    "question": "Một startup muốn xây dựng ứng dụng web/mobile nhanh với backend GraphQL real-time, đồng thời triển khai và hosting frontend với CI/CD tích hợp. Những dịch vụ AWS nào phù hợp cho mục tiêu này? (Chọn 2)",
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
    "question": "Một công ty chạy một batch job xử lý ảnh chạy vào ban đêm. Job có thể bị gián đoạn và tự khởi động lại từ checkpoint mà không ảnh hưởng nghiệp vụ. Họ muốn giảm chi phí EC2 tối đa. Mô hình giá nào phù hợp nhất?",
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
    "question": "Một startup cam kết chi tiêu $10/giờ cho compute trong 1 năm và muốn được giảm giá nhưng vẫn linh hoạt thay đổi giữa EC2, Lambda và Fargate, đổi instance family, kích thước, OS và Region. Lựa chọn nào đáp ứng?",
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
    "question": "Trong AWS, hướng truyền dữ liệu nào thường KHÔNG bị tính phí data transfer?",
    "options": [
      "Dữ liệu inbound đi vào AWS từ Internet",
      "Dữ liệu outbound từ EC2 ra Internet",
      "Dữ liệu chuyển giữa hai Region khác nhau",
      "Dữ liệu chuyển giữa hai Availability Zone trong cùng Region"
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
    "question": "Đội vận hành muốn nhận thông báo cá nhân hóa về các sự kiện bảo trì theo lịch và các vấn đề ảnh hưởng TRỰC TIẾP đến tài nguyên AWS cụ thể của tài khoản họ (ví dụ một EC2 instance sắp bị retire). Công cụ nào đáp ứng nhu cầu này?",
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
    "id": "saa-m1-001",
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
    "id": "saa-m2-001",
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
    "id": "saa-m3-001",
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
    "id": "saa-m1-002",
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
    "id": "saa-m2-002",
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
    "id": "saa-m3-002",
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
    "id": "saa-m1-003",
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
    "id": "saa-m1-004",
    "courseId": "SAA-C03",
    "lesson": "ch3-01-iam-deep-dive",
    "certifications": [
      "SAA-C03"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Để bảo vệ root user của AWS account theo best practice, Solutions Architect nên thực hiện những hành động nào? (Chọn 2)",
    "options": [
      "Bật MFA cho root user",
      "Khóa lại access key của root user và không tạo access key cho root để dùng hàng ngày",
      "Dùng root user cho mọi hoạt động vận hành hàng ngày để dễ kiểm soát",
      "Chia sẻ mật khẩu root cho toàn bộ admin team để đảm bảo tính sẵn sàng",
      "Gắn SCP trực tiếp lên root user để giới hạn quyền"
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
    "id": "saa-m2-003",
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
    "id": "saa-m3-003",
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
    "id": "saa-m1-005",
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
    "id": "saa-m2-004",
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
    "id": "saa-m3-004",
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
    "id": "saa-m1-006",
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
    "id": "saa-m2-005",
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
    "id": "saa-m3-005",
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
    "id": "saa-m2-006",
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
    "id": "saa-m1-007",
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
    "id": "saa-m2-007",
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
    "id": "saa-m3-006",
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
    "id": "saa-m1-008",
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
    "id": "saa-m2-008",
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
    "id": "saa-m3-007",
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
    "id": "saa-m1-009",
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
    "id": "saa-m2-009",
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
    "id": "saa-m3-008",
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
    "id": "saa-m1-010",
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
    "id": "saa-m2-010",
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
    "id": "saa-m3-009",
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
    "id": "saa-m1-011",
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
    "id": "saa-m2-011",
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
    "id": "saa-m3-010",
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
    "id": "saa-m1-012",
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
    "id": "saa-m3-011",
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
    "id": "saa-m1-013",
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
    "id": "saa-m2-012",
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
    "id": "saa-m3-012",
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
    "id": "saa-m2-013",
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
    "id": "saa-m3-013",
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
    "id": "saa-m2-014",
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
    "id": "saa-m3-014",
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
    "id": "saa-m2-015",
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
    "id": "saa-m3-015",
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
    "id": "saa-m2-016",
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
    "id": "saa-m3-016",
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
    "id": "saa-m2-017",
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
    "id": "saa-m3-017",
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
    "id": "saa-m2-018",
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
    "id": "saa-m3-018",
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
    "id": "saa-m3-019",
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
    "id": "saa-m1-021",
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
    "id": "saa-m2-021",
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
    "id": "saa-m3-021",
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
    "id": "saa-m1-022",
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
    "id": "saa-m2-022",
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
    "id": "saa-m3-022",
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
    "id": "saa-m1-023",
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
    "id": "saa-m2-023",
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
    "id": "saa-m3-023",
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
    "id": "saa-m1-024",
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
    "id": "saa-m2-024",
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
    "id": "saa-m3-024",
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
    "id": "saa-m1-025",
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
    "id": "saa-m2-025",
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
    "id": "saa-m3-025",
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
    "id": "saa-m1-026",
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
    "id": "saa-m2-026",
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
    "id": "saa-m3-026",
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
    "id": "saa-m2-027",
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
    "id": "saa-m3-027",
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
    "id": "saa-m2-028",
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
    "id": "saa-m3-028",
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
    "id": "saa-m2-029",
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
    "id": "saa-m3-029",
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
    "id": "saa-m2-030",
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
    "id": "saa-m3-030",
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
    "id": "saa-m2-031",
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
    "id": "saa-m3-031",
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
    "id": "saa-m3-032",
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
    "id": "saa-m3-033",
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
    "id": "saa-m1-038",
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
    "mock": 1
  },
  {
    "id": "saa-m2-038",
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
    "mock": 2
  },
  {
    "id": "saa-m3-037",
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
    "mock": 3
  },
  {
    "id": "saa-m1-039",
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
    "mock": 1
  },
  {
    "id": "saa-m2-039",
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
    "mock": 2
  },
  {
    "id": "saa-m3-038",
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
    "mock": 3
  },
  {
    "id": "saa-m1-040",
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
    "id": "saa-m1-041",
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
    "mock": 1
  },
  {
    "id": "saa-m2-040",
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
    "mock": 2
  },
  {
    "id": "saa-m3-039",
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
    "mock": 3
  },
  {
    "id": "saa-m1-042",
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
    "mock": 1
  },
  {
    "id": "saa-m2-041",
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
    "mock": 2
  },
  {
    "id": "saa-m3-040",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-042",
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
    "mock": 2
  },
  {
    "id": "saa-m3-041",
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
    "mock": 3
  },
  {
    "id": "saa-m2-043",
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
    "id": "saa-m1-044",
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
    "mock": 1
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
    "mock": 2
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
    "mock": 3
  },
  {
    "id": "saa-m1-045",
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
    "mock": 1
  },
  {
    "id": "saa-m2-045",
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
    "mock": 2
  },
  {
    "id": "saa-m3-043",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-046",
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
    "mock": 2
  },
  {
    "id": "saa-m3-044",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m3-045",
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
    "id": "saa-m2-047",
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
    "mock": 2
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
    "mock": 3
  },
  {
    "id": "saa-m1-048",
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
    "mock": 1
  },
  {
    "id": "saa-m2-048",
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
    "mock": 2
  },
  {
    "id": "saa-m3-047",
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
    "mock": 3
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
    "mock": 1
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
    "mock": 2
  },
  {
    "id": "saa-m3-048",
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
    "mock": 3
  },
  {
    "id": "saa-m1-050",
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
    "id": "saa-m1-051",
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
    "mock": 1
  },
  {
    "id": "saa-m2-050",
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
    "mock": 2
  },
  {
    "id": "saa-m3-049",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-051",
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
    "mock": 2
  },
  {
    "id": "saa-m3-050",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-052",
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
    "mock": 2
  },
  {
    "id": "saa-m3-051",
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
    "mock": 3
  },
  {
    "id": "saa-m2-053",
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
    "id": "saa-m1-054",
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
    "mock": 1
  },
  {
    "id": "saa-m1-055",
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
    "mock": 1
  },
  {
    "id": "saa-m2-054",
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
    "mock": 2
  },
  {
    "id": "saa-m3-052",
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
    "mock": 3
  },
  {
    "id": "saa-m1-056",
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
    "id": "saa-m1-057",
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
    "mock": 1
  },
  {
    "id": "saa-m2-055",
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
    "mock": 2
  },
  {
    "id": "saa-m3-053",
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
    "mock": 3
  },
  {
    "id": "saa-m1-058",
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
    "mock": 1
  },
  {
    "id": "saa-m2-056",
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
    "id": "saa-m2-057",
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
    "mock": 2
  },
  {
    "id": "saa-m3-054",
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-058",
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
    "mock": 2
  },
  {
    "id": "saa-m3-055",
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
    "mock": 3
  },
  {
    "id": "saa-m1-060",
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
    "mock": 1
  },
  {
    "id": "saa-m2-059",
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
    "mock": 2
  },
  {
    "id": "saa-m3-056",
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
    "id": "saa-m3-057",
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
    "mock": 3
  },
  {
    "id": "saa-m1-061",
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
    "mock": 1
  },
  {
    "id": "saa-m2-060",
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
    "mock": 2
  },
  {
    "id": "saa-m3-058",
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
    "mock": 3
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
    "mock": 1
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
    "mock": 2
  },
  {
    "id": "saa-m3-059",
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
    "mock": 3
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
    "id": "saa-m2-062",
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
    "mock": 2
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
    "mock": 3
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
    "mock": 1
  },
  {
    "id": "saa-m2-063",
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
    "mock": 2
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
    "mock": 3
  },
  {
    "id": "saa-m2-064",
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
    "id": "saa-m1-066",
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
    "mock": 1
  },
  {
    "id": "saa-m2-065",
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
    "mock": 2
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
    "mock": 3
  },
  {
    "id": "saa-m1-067",
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
    "mock": 1
  }
];
