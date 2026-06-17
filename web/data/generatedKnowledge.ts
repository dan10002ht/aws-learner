import type { Question } from "@/lib/types";

// Auto-generated practice quizzes for knowledge courses. Chunked into arrays
// so TypeScript can type-check the literal (a single huge array overflows
// the union-complexity limit). Managed by build-content-loop/scripts/append-questions.mjs.

const k1: Question[] = [
  {
    "id": "sql-q-001",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong mô hình bảng dữ liệu, một 'hàng' (row) tương ứng với điều gì?",
    "options": [
      "Một thuộc tính của sự vật, ví dụ email",
      "Một bản ghi cụ thể, ví dụ một khách hàng cụ thể",
      "Toàn bộ cơ sở dữ liệu gồm nhiều bảng",
      "Kiểu dữ liệu của một cột"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Hàng là một bản ghi cụ thể trong bảng.\n✓ Một bản ghi cụ thể như một khách hàng đúng với định nghĩa hàng.\n✗ Một thuộc tính như email chính là cột, không phải hàng.\n✗ Toàn bộ cơ sở dữ liệu nhiều bảng là database, không phải hàng.\n✗ Kiểu dữ liệu gắn với cột, không phải hàng."
  },
  {
    "id": "sql-q-002",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Câu nào lấy ĐÚNG chỉ hai cột name và city từ bảng customers?",
    "options": [
      "SELECT * FROM customers;",
      "SELECT name, city FROM customers;",
      "SELECT customers FROM name, city;",
      "GET name, city FROM customers;"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Liệt kê tên cột sau SELECT rồi FROM tên bảng.\n✓ Liệt kê name, city rồi FROM customers là cú pháp đúng.\n✗ Dùng dấu * lấy tất cả các cột chứ không phải chỉ hai cột.\n✗ Đảo vị trí bảng và cột là sai cú pháp.\n✗ GET không phải từ khoá SQL, phải dùng SELECT."
  },
  {
    "id": "sql-q-003",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Tại sao trong code ứng dụng thật nên hạn chế dùng SELECT * ?",
    "options": [
      "SELECT * luôn bị database từ chối thực thi",
      "Lấy hết cột gây lãng phí và dễ vỡ khi schema thay đổi",
      "SELECT * không sắp xếp được kết quả",
      "SELECT * chỉ chạy được trên SQLite"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Lấy mọi cột tốn tài nguyên và dễ hỏng khi cấu trúc bảng đổi.\n✓ Lãng phí và dễ vỡ khi schema đổi là lý do nên liệt kê đúng cột cần.\n✗ SELECT * vẫn chạy bình thường, không bị từ chối.\n✗ Việc sắp xếp do ORDER BY quyết định, không liên quan dấu *.\n✗ SELECT * là cú pháp chuẩn chạy trên mọi hệ quản trị."
  },
  {
    "id": "sql-q-004",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Truy vấn sau trả về những khách nào? WHERE age BETWEEN 20 AND 35 (tuổi: Lan 28, Minh 35, Hoa 22, Tuấn 41, Bình 19, Chi 33)",
    "options": [
      "Lan, Minh, Hoa, Chi",
      "Lan, Hoa, Chi (loại Minh vì đúng 35)",
      "Lan, Minh, Tuấn, Chi",
      "Tất cả 6 khách"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "BETWEEN bao gồm cả hai đầu mút.\n✓ Lan, Minh, Hoa, Chi đều nằm trong [20,35], Minh 35 vẫn được lấy.\n✗ Loại Minh là sai vì BETWEEN bao gồm cả giá trị 35.\n✗ Tuấn 41 vượt quá 35 nên không thuộc kết quả.\n✗ Bình 19 và Tuấn 41 nằm ngoài khoảng nên không phải tất cả 6 khách."
  },
  {
    "id": "sql-q-005",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần tìm khách có city là 'Hà Nội' HOẶC 'Đà Nẵng'. Cách viết gọn và đúng nhất là gì?",
    "options": [
      "WHERE city = 'Hà Nội' AND city = 'Đà Nẵng'",
      "WHERE city IN ('Hà Nội', 'Đà Nẵng')",
      "WHERE city LIKE 'Hà Nội', 'Đà Nẵng'",
      "WHERE city = ('Hà Nội' OR 'Đà Nẵng')"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "IN thay cho nhiều điều kiện OR bằng nhau, gọn hơn.\n✓ IN với danh sách hai thành phố đúng và gọn.\n✗ Dùng AND đòi city vừa là Hà Nội vừa là Đà Nẵng nên không hàng nào khớp.\n✗ LIKE không nhận danh sách phân cách bằng dấu phẩy như vậy.\n✗ So sánh = với một biểu thức OR là cú pháp sai."
  },
  {
    "id": "sql-q-006",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Lỗi nào khiến truy vấn tìm khách chưa có email KHÔNG bao giờ trả về hàng nào?",
    "options": [
      "WHERE email IS NULL",
      "WHERE email = NULL",
      "WHERE email IS NOT NULL",
      "WHERE email = ''"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "NULL nghĩa là không biết nên email = NULL không bao giờ TRUE.\n✗ email = NULL luôn không TRUE nên không trả về hàng nào, đây là lỗi.\n✓ email IS NULL mới là cách đúng để tìm ô trống.\n✓ email IS NOT NULL trả về khách đã có email, hoạt động bình thường.\n✓ email = '' so chuỗi rỗng, có thể trả hàng nhưng khác với NULL, vẫn chạy được."
  },
  {
    "id": "sql-q-007",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Mẫu LIKE nào khớp các chuỗi email kết thúc bằng '@mail.com'?",
    "options": [
      "LIKE '@mail.com%'",
      "LIKE '%@mail.com'",
      "LIKE '_@mail.com'",
      "LIKE '@mail.com'"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Dấu % thay cho bất kỳ số ký tự nào ở phần đầu.\n✓ '%@mail.com' khớp mọi chuỗi kết thúc bằng @mail.com.\n✗ '@mail.com%' đòi chuỗi bắt đầu bằng @mail.com, sai vị trí.\n✗ '_@mail.com' chỉ cho đúng một ký tự trước @, quá hạn chế.\n✗ '@mail.com' không có % nên chỉ khớp chuỗi y hệt vậy."
  },
  {
    "id": "sql-q-008",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Truy vấn: WHERE (city = 'Đà Nẵng' OR city = 'TP HCM') AND NOT age < 20. Bình ở Đà Nẵng, 19 tuổi. Bình có trong kết quả không?",
    "options": [
      "Có, vì Bình ở Đà Nẵng thoả phần OR",
      "Không, vì NOT age < 20 loại các khách dưới 20 tuổi",
      "Có, vì NOT đảo điều kiện thành lấy người trẻ",
      "Không, vì Đà Nẵng không nằm trong danh sách"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "NOT age < 20 nghĩa là chỉ giữ tuổi từ 20 trở lên.\n✓ Bình 19 tuổi bị NOT age < 20 loại ra dù thoả phần thành phố.\n✗ Thoả phần OR là chưa đủ vì còn điều kiện tuổi nối bằng AND.\n✗ NOT age < 20 giữ người từ 20 trở lên chứ không lấy người trẻ.\n✗ Đà Nẵng có trong phần OR, không phải lý do loại Bình."
  },
  {
    "id": "sql-q-009",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Muốn lấy 3 khách lớn tuổi nhất, cần kết hợp những gì?",
    "options": [
      "Chỉ LIMIT 3 là đủ",
      "ORDER BY age DESC rồi LIMIT 3",
      "ORDER BY age ASC rồi LIMIT 3",
      "DISTINCT age rồi LIMIT 3"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Sắp giảm dần theo tuổi rồi cắt 3 hàng đầu.\n✓ ORDER BY age DESC rồi LIMIT 3 cho 3 người già nhất.\n✗ Chỉ LIMIT 3 không sắp xếp nên lấy 3 hàng bất kỳ.\n✗ ORDER BY age ASC lấy 3 người trẻ nhất, ngược yêu cầu.\n✗ DISTINCT age loại trùng tuổi chứ không cho người lớn tuổi nhất."
  },
  {
    "id": "sql-q-010",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "DISTINCT trong câu SELECT DISTINCT city FROM customers làm gì?",
    "options": [
      "Sắp xếp các thành phố theo bảng chữ cái",
      "Chỉ giữ các giá trị city khác nhau, bỏ trùng",
      "Đếm số khách ở mỗi thành phố",
      "Lọc bỏ các hàng có city là NULL"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "DISTINCT loại bỏ các giá trị trùng lặp.\n✓ Giữ các city khác nhau và bỏ trùng đúng vai trò DISTINCT.\n✗ DISTINCT không sắp xếp; việc đó do ORDER BY.\n✗ Đếm số khách cần hàm tổng hợp như COUNT, không phải DISTINCT.\n✗ DISTINCT không chuyên lọc NULL; nó chỉ gộp giá trị giống nhau."
  },
  {
    "id": "sql-q-011",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Để lấy 'trang 2' gồm 3 hàng tiếp theo sau khi đã sắp xếp, mệnh đề nào đúng?",
    "options": [
      "LIMIT 3 OFFSET 3",
      "LIMIT 3 OFFSET 1",
      "OFFSET 3 LIMIT 3 (đặt trước LIMIT)",
      "LIMIT 6 OFFSET 3"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "OFFSET bỏ qua m hàng đầu rồi LIMIT lấy n hàng tiếp.\n✓ LIMIT 3 OFFSET 3 bỏ 3 hàng đầu rồi lấy 3 hàng kế, đúng trang 2.\n✗ OFFSET 1 chỉ bỏ 1 hàng nên không đúng ranh giới trang.\n✗ Đặt OFFSET trước LIMIT sai thứ tự cú pháp.\n✗ LIMIT 6 lấy tới 6 hàng, nhiều hơn một trang 3 hàng."
  },
  {
    "id": "sql-q-012",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Những phát biểu nào ĐÚNG về cú pháp WHERE và NULL trong SQL? (chọn nhiều)",
    "options": [
      "So sánh bằng dùng một dấu = , không phải ==",
      "Chuỗi văn bản phải đặt trong dấu nháy đơn",
      "Dùng IS NULL để tìm ô không có giá trị",
      "email = NULL là cách đúng để tìm email trống",
      "BETWEEN không bao gồm hai giá trị đầu mút"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "SQL dùng một dấu =, nháy đơn cho chuỗi, và IS NULL cho ô trống.\n✓ Một dấu = là toán tử so sánh bằng trong SQL.\n✓ Chuỗi như 'Hà Nội' phải nằm trong nháy đơn.\n✓ IS NULL là cách đúng để tìm ô không có giá trị.\n✗ email = NULL không bao giờ TRUE nên là cách sai.\n✗ BETWEEN bao gồm cả hai đầu mút, không loại trừ."
  },
  {
    "id": "sql-q-013",
    "courseId": "SQL",
    "lesson": "sql-01-select-basics",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về AWS và liên hệ với SQL trong bài, những phát biểu nào ĐÚNG? (chọn nhiều)",
    "options": [
      "Amazon RDS chạy các database quan hệ như PostgreSQL, MySQL và dùng SQL y hệt bài học",
      "Amazon Aurora tương thích MySQL/PostgreSQL, gần như không phải sửa truy vấn khi chuyển từ RDS",
      "Amazon DynamoDB là NoSQL, không hỗ trợ SELECT ... WHERE tự do",
      "Trên RDS bạn phải tự lo backup và vá lỗi máy chủ",
      "DynamoDB phù hợp khi cần JOIN và truy vấn quan hệ linh hoạt"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "RDS/Aurora là SQL quan hệ, DynamoDB là NoSQL.\n✓ RDS chạy các database quan hệ và dùng SQL y hệt bài học.\n✓ Aurora tương thích MySQL/PostgreSQL nên chuyển từ RDS gần như không sửa truy vấn.\n✓ DynamoDB là NoSQL, không có SELECT ... WHERE tự do.\n✗ RDS là dịch vụ được quản lý, AWS lo backup và vá lỗi giúp bạn.\n✗ Cần JOIN và truy vấn quan hệ linh hoạt thì chọn RDS/Aurora, không phải DynamoDB."
  },
  {
    "id": "sql-q-014",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, vì sao việc lưu toàn bộ thông tin khách trong cùng một bảng đơn hàng (mỗi đơn lặp lại email, địa chỉ khách) là không tốt?",
    "options": [
      "Vì gây dư thừa dữ liệu: khi khách đổi email phải sửa nhiều dòng, sót một dòng là dữ liệu mâu thuẫn",
      "Vì SQL không cho phép một bảng có quá 5 cột",
      "Vì JOIN sẽ chạy nhanh hơn nếu mỗi bảng chỉ có một dòng",
      "Vì khoá chính không thể là kiểu số khi có thông tin khách"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vấn đề cốt lõi là dư thừa dữ liệu (data redundancy) dẫn tới mâu thuẫn khi cập nhật.\n✓ Lặp lại email/địa chỉ nhiều dòng khiến sửa một chỗ phải sửa tất cả, sót là sai lệch\n✗ SQL không có giới hạn 5 cột như vậy\n✗ Tách bảng để toàn vẹn dữ liệu chứ không phải để mỗi bảng một dòng\n✗ Khoá chính kiểu số hoàn toàn hợp lệ, không liên quan vấn đề này"
  },
  {
    "id": "sql-q-015",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong schema của bài, cột nào ở bảng `orders` đóng vai trò khoá ngoại trỏ về `customers`?",
    "options": [
      "customer_id",
      "order_id",
      "product_id",
      "quantity"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`orders.customer_id` là khoá ngoại trỏ tới khoá chính `customers.customer_id`.\n✓ Cột trỏ về định danh khách chính là khoá ngoại nối hai bảng\n✗ Định danh duy nhất của chính đơn hàng là khoá chính của orders, không trỏ sang customers\n✗ Cột trỏ về sản phẩm là khoá ngoại tới products, không phải customers\n✗ Số lượng chỉ là dữ liệu thường, không phải khoá"
  },
  {
    "id": "sql-q-016",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Với dữ liệu mẫu, câu sau trả về bao nhiêu dòng?\n```sql\nSELECT o.order_id, c.name\nFROM orders AS o\nINNER JOIN customers AS c ON o.customer_id = c.customer_id;\n```",
    "options": [
      "3 dòng (đơn 1004 bị loại vì khách số 5 không tồn tại)",
      "4 dòng (giữ cả đơn 1004 với name NULL)",
      "5 dòng (mỗi khách một dòng)",
      "6 dòng (tích Descartes của hai bảng)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "INNER JOIN chỉ giữ dòng khớp ở cả hai bên; đơn 1004 có customer_id=5 không khớp khách nào nên bị loại.\n✓ Còn lại 3 đơn khớp: 1001, 1002, 1003\n✗ Giữ đơn không khớp với NULL là hành vi của LEFT JOIN, không phải INNER\n✗ Mỗi khách một dòng không đúng vì An có 2 đơn và Châu/Dũng không có đơn\n✗ Có ON nên không tạo tích Descartes"
  },
  {
    "id": "sql-q-017",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần liệt kê NHỮNG KHÁCH HÀNG CHƯA TỪNG ĐẶT ĐƠN NÀO. Câu nào đúng?",
    "options": [
      "customers LEFT JOIN orders ON ... WHERE o.order_id IS NULL",
      "customers INNER JOIN orders ON ... WHERE o.order_id IS NULL",
      "customers RIGHT JOIN orders ON ... WHERE c.name IS NULL",
      "customers INNER JOIN orders ON ... GROUP BY c.name"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "LEFT JOIN giữ mọi khách; khách không có đơn sẽ có cột bên orders là NULL, lọc IS NULL ra đúng họ.\n✓ Giữ trọn khách rồi lọc dòng không khớp là cách tìm khách chưa đặt\n✗ INNER JOIN loại bỏ ngay những khách không khớp nên không thể có dòng order_id NULL\n✗ RIGHT JOIN giữ trọn orders chứ không giữ trọn customers, sai hướng\n✗ Chỉ GROUP BY không lọc ra khách thiếu đơn"
  },
  {
    "id": "sql-q-018",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Với dữ liệu mẫu, kết quả của câu sau bao gồm những ai?\n```sql\nSELECT c.name, o.order_id\nFROM orders AS o\nRIGHT JOIN customers AS c ON o.customer_id = c.customer_id;\n```",
    "options": [
      "An, An, Bình, Châu (NULL), Dũng (NULL) — đơn 1004 biến mất",
      "An, An, Bình và đơn 1004 với name NULL",
      "Chỉ An, An, Bình",
      "Tất cả khách và tất cả đơn, kể cả đơn 1004"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "RIGHT JOIN giữ trọn bảng bên phải (customers) nên mọi khách đều xuất hiện, kể cả Châu và Dũng chưa mua (order_id NULL).\n✓ Đủ 4 khách; Châu/Dũng có order_id NULL vì chưa có đơn\n✗ Đơn 1004 (khách 5) biến mất vì khách 5 không nằm trong customers, không thể có name NULL\n✗ Bỏ Châu/Dũng là hành vi của INNER JOIN, không phải RIGHT\n✗ Giữ cả đơn mồ côi lẫn khách thiếu đơn là FULL OUTER JOIN"
  },
  {
    "id": "sql-q-019",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, `A RIGHT JOIN B` luôn có thể viết lại thành cách nào, và thực tế người ta thường chuộng cách nào?",
    "options": [
      "Viết lại thành `B LEFT JOIN A`; thực tế đa số chuộng LEFT cho dễ đọc",
      "Viết lại thành `A INNER JOIN B`; thực tế chuộng INNER",
      "Viết lại thành `A FULL OUTER JOIN B`; thực tế chuộng FULL",
      "Không thể viết lại; RIGHT là duy nhất cho trường hợp của nó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ `A RIGHT JOIN B` tương đương `B LEFT JOIN A`, và đa số người chỉ dùng LEFT, đặt bảng muốn giữ trọn ở bên trái.\n✓ Đổi vai trái/phải biến RIGHT thành LEFT, dễ đọc hơn\n✗ INNER loại bớt dòng không khớp nên không tương đương RIGHT\n✗ FULL giữ cả hai bên, khác với RIGHT chỉ giữ một bên\n✗ RIGHT hoàn toàn viết lại được nên không phải duy nhất"
  },
  {
    "id": "sql-q-020",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bạn chạy `FULL OUTER JOIN` trên MySQL và bị lỗi cú pháp. Đâu là giải thích đúng?",
    "options": [
      "MySQL không hỗ trợ FULL OUTER JOIN trực tiếp; phải mô phỏng bằng LEFT JOIN kết hợp UNION với RIGHT JOIN",
      "FULL OUTER JOIN chỉ chạy được khi cả hai bảng cùng số dòng",
      "Phải bỏ mệnh đề ON thì FULL OUTER JOIN mới chạy",
      "FULL OUTER JOIN chỉ hợp lệ với đúng hai bảng, không quá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài lưu ý MySQL không hỗ trợ FULL OUTER JOIN trực tiếp (PostgreSQL, SQL Server thì có), nên mô phỏng bằng LEFT JOIN UNION RIGHT JOIN.\n✓ Đây là hạn chế của engine MySQL, cách khắc phục là dùng UNION\n✗ Số dòng hai bảng không liên quan tới việc hỗ trợ cú pháp\n✗ Bỏ ON không sửa được lỗi engine không hỗ trợ\n✗ Số bảng không phải nguyên nhân lỗi này"
  },
  {
    "id": "sql-q-021",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Mỗi khách có cột `credit = 100` ở bảng `customers`. Khách An có 2 đơn. Sau khi `customers INNER JOIN orders` rồi `SUM(c.credit) GROUP BY c.name`, An ra giá trị nào và vì sao?",
    "options": [
      "200, vì fan-out nhân dòng của An lên 2 nên credit bị cộng trùng",
      "100, vì SUM tự nhận biết credit thuộc bảng một và chỉ cộng một lần",
      "NULL, vì không thể SUM một cột của bảng bên trái",
      "2, vì SUM đếm số đơn của An"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đây là bẫy fan-out: An khớp 2 đơn nên dòng của An bị nhân thành 2, khiến credit=100 bị cộng hai lần thành 200 (sai).\n✓ JOIN nhân dòng làm giá trị thuộc bảng một bị cộng trùng\n✗ SUM không tự biết tránh trùng; nó cộng theo từng dòng kết quả sau JOIN\n✗ SUM một cột bảng trái vẫn cho số chứ không NULL\n✗ SUM(credit) cộng giá trị 100, không phải đếm đơn"
  },
  {
    "id": "sql-q-022",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bài 3 yêu cầu tính tổng tiền mỗi khách bằng `SUM(o.quantity * p.price)` sau khi JOIN 3 bảng. Vì sao ở đây fan-out KHÔNG gây sai dù dòng vẫn bị nhân?",
    "options": [
      "Vì biểu thức được tính trên TỪNG DÒNG đơn, nên mỗi đơn được cộng đúng một lần — nhân dòng chính là điều mong muốn",
      "Vì INNER JOIN tự động khử trùng lặp trước khi SUM",
      "Vì GROUP BY c.name xoá hết các dòng nhân thừa",
      "Vì quantity và price luôn bằng nhau nên triệt tiêu lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "SUM ở đây cộng một biểu thức theo từng dòng đơn (quantity*price), nên việc mỗi đơn thành một dòng là đúng ý muốn; fan-out chỉ nguy hiểm khi SUM giá trị thuộc bảng một.\n✓ Mỗi đơn được cộng đúng một lần vì giá trị tính theo từng dòng đơn\n✗ INNER JOIN không khử trùng lặp, nó vẫn nhân dòng bình thường\n✗ GROUP BY gom nhóm để cộng chứ không xoá dòng thừa làm sai\n✗ quantity và price không hề bằng nhau, không có chuyện triệt tiêu"
  },
  {
    "id": "sql-q-023",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Câu nào liệt kê MỌI sản phẩm kèm tổng số lượng đã bán, sản phẩm chưa bán phải hiện số 0?",
    "options": [
      "products LEFT JOIN orders ON ... GROUP BY p.name, dùng COALESCE(SUM(o.quantity), 0)",
      "products INNER JOIN orders ON ... GROUP BY p.name, dùng SUM(o.quantity)",
      "orders LEFT JOIN products ON ... GROUP BY p.name, dùng SUM(o.quantity)",
      "products RIGHT JOIN orders ON ... GROUP BY p.name, dùng COALESCE(SUM(o.quantity), 0)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phải LEFT JOIN từ products để giữ cả sản phẩm chưa có đơn; SUM của tập rỗng là NULL nên COALESCE đổi thành 0.\n✓ Giữ trọn products rồi đổi NULL thành 0 cho ra số 0 cho sản phẩm chưa bán\n✗ INNER JOIN loại mất sản phẩm chưa bán nên không thể hiện 0\n✗ Đặt orders bên trái không giữ trọn products, sản phẩm chưa bán bị mất\n✗ RIGHT JOIN với orders bên trái giữ trọn orders chứ không giữ trọn products"
  },
  {
    "id": "sql-q-024",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong câu self join tìm sếp của mỗi nhân viên, vì sao phải dùng `LEFT JOIN employees AS m ON e.manager_id = m.emp_id` thay vì INNER JOIN?",
    "options": [
      "Để không loại mất An — người không có sếp (manager_id NULL) vẫn xuất hiện",
      "Vì INNER JOIN không cho phép một bảng nối với chính nó",
      "Vì self join bắt buộc luôn dùng LEFT JOIN",
      "Vì LEFT JOIN chạy nhanh hơn INNER JOIN trên bảng nhỏ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "An là sếp cao nhất nên manager_id NULL; dùng LEFT JOIN để An không bị loại, sếp hiển thị NULL.\n✓ Giữ nhân viên không có sếp là lý do chọn LEFT thay vì INNER\n✗ INNER JOIN hoàn toàn nối được bảng với chính nó qua alias\n✗ Self join không bắt buộc LEFT; tuỳ yêu cầu có thể dùng INNER\n✗ Lựa chọn ở đây vì tính đúng đắn kết quả, không phải tốc độ"
  },
  {
    "id": "sql-q-025",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài học, những phát biểu nào về ALIAS bảng là ĐÚNG? (chọn nhiều)",
    "options": [
      "Alias là tên gọi tắt, giúp viết o.customer_id ngắn hơn orders.customer_id",
      "Alias bắt buộc khi hai bảng có cột trùng tên để tránh lỗi ambiguous column",
      "Self join bắt buộc phải có alias để phân biệt hai bản sao của cùng một bảng",
      "Từ khoá AS là bắt buộc, không thể bỏ khi đặt alias",
      "Dùng alias làm câu truy vấn chạy chậm hơn vì SQL phải dịch tên"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Alias là bí danh giúp viết gọn, tránh nhập nhằng cột, và bắt buộc trong self join.\n✓ Viết o.customer_id gọn hơn là lợi ích cơ bản của alias\n✓ Khi hai bảng cùng có cột name, alias giúp SQL biết name của bảng nào\n✓ Self join cần alias khác nhau để phân biệt hai vai của cùng bảng\n✗ AS có thể bỏ: FROM orders o tương đương FROM orders AS o\n✗ Alias không làm chậm truy vấn, chỉ là tên gọi tắt"
  },
  {
    "id": "sql-q-026",
    "courseId": "SQL",
    "lesson": "sql-02-joins",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về phần liên hệ AWS trong bài, những phát biểu nào ĐÚNG? (chọn nhiều)",
    "options": [
      "Amazon RDS là database quan hệ được quản lý; câu INNER JOIN, LEFT JOIN chạy y hệt",
      "Amazon DynamoDB là NoSQL và KHÔNG có JOIN; thường denormalize dữ liệu để đọc nhanh",
      "Amazon Aurora là database quan hệ tương thích MySQL/PostgreSQL nên JOIN không đổi",
      "Cần JOIN, quan hệ chặt chẽ, truy vấn linh hoạt thì nên chọn DynamoDB",
      "DynamoDB phù hợp khi cần độ trễ cực thấp ở quy mô lớn và chấp nhận thiết kế quanh vài kiểu truy vấn cố định"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "RDS/Aurora là quan hệ giữ nguyên JOIN; DynamoDB là NoSQL không có JOIN, hợp với quy mô lớn độ trễ thấp.\n✓ RDS quản lý engine quan hệ nên JOIN chạy như thường\n✓ DynamoDB không có JOIN nên denormalize để đọc nhanh\n✓ Aurora tương thích MySQL/PostgreSQL nên JOIN không đổi\n✓ DynamoDB hợp với độ trễ thấp quy mô lớn quanh kiểu truy vấn cố định\n✗ Cần JOIN và truy vấn linh hoạt thì chọn RDS/Aurora, không phải DynamoDB"
  },
  {
    "id": "sql-q-027",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Với bảng orders có 7 dòng, trong đó cột customer_id không có giá trị NULL nào, truy vấn nào trả về số khách hàng KHÁC NHAU đã từng mua hàng?",
    "options": [
      "SELECT COUNT(*) FROM orders;",
      "SELECT COUNT(customer_id) FROM orders;",
      "SELECT COUNT(DISTINCT customer_id) FROM orders;",
      "SELECT DISTINCT customer_id FROM orders;"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Cần đếm số giá trị khác nhau, đúng việc của COUNT(DISTINCT cot).\n✓ COUNT(DISTINCT customer_id) đếm số giá trị customer_id phân biệt → đúng số khách đã mua.\n✗ COUNT(*) đếm tổng số dòng (7 đơn), không loại trùng.\n✗ COUNT(customer_id) chỉ đếm dòng khác NULL, ở đây vẫn ra 7 vì không có NULL.\n✗ SELECT DISTINCT customer_id liệt kê các giá trị, không trả về một con số đếm."
  },
  {
    "id": "sql-q-028",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "AVG xử lý các dòng có giá trị NULL như thế nào?",
    "options": [
      "Coi NULL là 0 và cộng vào tổng",
      "Bỏ qua dòng NULL, không tính vào cả tử số lẫn mẫu số",
      "Trả về NULL cho toàn bộ kết quả nếu có một dòng NULL",
      "Báo lỗi khi gặp NULL"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "AVG bỏ qua dòng NULL chứ không coi NULL là 0.\n✓ Bỏ qua dòng NULL: nếu 1 trong 4 giá trị NULL thì chia cho 3, không phải 4.\n✗ Coi NULL là 0 là hành vi sai; muốn vậy phải dùng AVG(COALESCE(cot,0)).\n✗ AVG không trả NULL toàn bộ chỉ vì có một dòng NULL.\n✗ AVG không báo lỗi khi gặp NULL."
  },
  {
    "id": "sql-q-029",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo quy tắc vàng của GROUP BY, cột nào trong SELECT bắt buộc phải xuất hiện trong mệnh đề GROUP BY?",
    "options": [
      "Mọi cột nằm trong hàm tổng hợp",
      "Mọi cột KHÔNG nằm trong hàm tổng hợp",
      "Chỉ cột khoá chính",
      "Mọi cột được dùng trong ORDER BY"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Quy tắc vàng: cột không nằm trong hàm tổng hợp thì bắt buộc phải có trong GROUP BY.\n✓ Mọi cột không-tổng-hợp phải vào GROUP BY, nếu không sẽ lỗi hoặc trả giá trị ngẫu nhiên.\n✗ Cột nằm trong hàm tổng hợp (SUM, COUNT...) thì không cần đưa vào GROUP BY.\n✗ Không liên quan riêng đến khoá chính.\n✗ ORDER BY không phải điều kiện của quy tắc này."
  },
  {
    "id": "sql-q-030",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Thứ tự thực thi logic đúng của các mệnh đề trong một truy vấn là gì?",
    "options": [
      "SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY",
      "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY",
      "FROM → GROUP BY → WHERE → SELECT → HAVING → ORDER BY",
      "WHERE → FROM → GROUP BY → HAVING → ORDER BY → SELECT"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bài nêu rõ thứ tự thực thi logic.\n✓ FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY là thứ tự đúng.\n✗ SELECT không chạy trước FROM/WHERE.\n✗ WHERE chạy trước GROUP BY, không phải sau.\n✗ FROM luôn chạy trước WHERE, không phải ngược lại."
  },
  {
    "id": "sql-q-031",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Câu hỏi: \"Khách nào có tổng doanh thu trên 10 triệu?\". Tại sao không thể dùng WHERE doanh_thu > 10000000 thay cho HAVING?",
    "options": [
      "Vì WHERE không hỗ trợ phép so sánh số",
      "Vì lúc WHERE chạy thì SUM còn chưa được tính",
      "Vì WHERE chỉ dùng được với cột khoá chính",
      "Vì doanh_thu là bí danh nên phải đặt trong dấu nháy"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "WHERE lọc từng dòng trước khi gom nhóm, trước khi hàm tổng hợp được tính.\n✓ Lúc WHERE chạy, SUM chưa được tính nên không thể lọc theo doanh_thu tổng hợp → phải dùng HAVING.\n✗ WHERE hoàn toàn hỗ trợ so sánh số.\n✗ WHERE không bị giới hạn ở cột khoá chính.\n✗ Vấn đề là thời điểm thực thi, không phải chuyện dấu nháy bí danh."
  },
  {
    "id": "sql-q-032",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho truy vấn:\nSELECT customer_id, COUNT(*) AS so_don\nFROM orders\nWHERE ordered_at >= '2026-02-01'\nGROUP BY customer_id\nHAVING COUNT(*) >= 2;\nVới dữ liệu trong bài, kết quả là gì?",
    "options": [
      "customer_id=1, so_don=3",
      "customer_id=3, so_don=2",
      "customer_id=3, so_don=3",
      "Không có dòng nào thoả"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "WHERE giữ các đơn từ 01/02/2026, rồi HAVING lọc nhóm có >= 2 đơn.\n✓ Chỉ khách 3 có 2 đơn (15/02 và 20/02) từ tháng 2 trở đi → customer_id=3, so_don=2.\n✗ Khách 1 có 3 đơn cả năm nhưng chỉ 1 đơn (01/03) từ tháng 2, không đạt >= 2.\n✗ Khách 3 chỉ có 2 đơn từ tháng 2, không phải 3.\n✗ Có một dòng thoả nên không phải rỗng."
  },
  {
    "id": "sql-q-033",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn viết subquery trong FROM nhưng quên đặt bí danh, ví dụ:\nSELECT AVG(doanh_thu) FROM (SELECT customer_id, SUM(...) AS doanh_thu FROM ... GROUP BY customer_id);\nĐiều gì xảy ra?",
    "options": [
      "Chạy bình thường, bí danh là tuỳ chọn",
      "Báo lỗi cú pháp vì subquery trong FROM bắt buộc phải có bí danh",
      "Tự động lấy tên bảng gốc làm bí danh",
      "Trả về NULL cho mọi dòng"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Subquery trong FROM bắt buộc phải có bí danh.\n✓ Quên đặt tên (AS ...) sẽ báo lỗi cú pháp ngay.\n✗ Bí danh không phải tuỳ chọn trong trường hợp này.\n✗ Không có cơ chế tự lấy tên bảng gốc làm bí danh.\n✗ Lỗi xảy ra trước khi có kết quả, không phải trả NULL."
  },
  {
    "id": "sql-q-034",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Truy vấn nào tính ĐÚNG \"doanh thu trung bình của mỗi khách\" (tổng hợp hai tầng)?",
    "options": [
      "SELECT AVG(quantity * price) FROM orders o JOIN products p ON p.id=o.product_id;",
      "SELECT AVG(doanh_thu) FROM (SELECT customer_id, SUM(o.quantity*p.price) AS doanh_thu FROM orders o JOIN products p ON p.id=o.product_id GROUP BY customer_id) AS t;",
      "SELECT customer_id, AVG(quantity*price) FROM orders GROUP BY customer_id;",
      "SELECT SUM(quantity*price)/COUNT(*) FROM orders;"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Phải gom doanh thu mỗi khách ở tầng trong rồi lấy AVG ở tầng ngoài.\n✓ Subquery gom SUM theo customer_id rồi AVG ở ngoài → đúng doanh thu trung bình mỗi khách.\n✗ AVG(quantity*price) chỉ ra trung bình mỗi DÒNG đơn, không phải mỗi khách.\n✗ Trả về một dòng cho mỗi khách, không phải một con số trung bình giữa các khách; lại thiếu JOIN lấy price.\n✗ SUM/COUNT(*) chia tổng doanh thu cho số ĐƠN, không phải số khách."
  },
  {
    "id": "sql-q-035",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Subquery tương quan (correlated) như (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) đặt trong SELECT có đặc điểm gì?",
    "options": [
      "Chỉ chạy một lần rồi dùng lại cho mọi dòng",
      "Tham chiếu cột của dòng ngoài nên chạy lại cho mỗi dòng, dễ chậm trên dữ liệu lớn",
      "Bắt buộc phải có bí danh mới chạy được",
      "Không thể dùng hàm tổng hợp bên trong"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Subquery tương quan tham chiếu giá trị của dòng ngoài (c.id).\n✓ Vì phụ thuộc c.id của dòng ngoài, nó chạy lại cho mỗi dòng → tiện nhưng dễ chậm trên dữ liệu lớn.\n✗ Không phải chạy một lần; nó chạy lặp lại theo từng dòng.\n✗ Bí danh không phải điều kiện ở đây (đó là yêu cầu của subquery trong FROM).\n✗ Ví dụ này chính dùng COUNT(*) nên hoàn toàn dùng được hàm tổng hợp."
  },
  {
    "id": "sql-q-036",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong cùng một danh mục có hai sản phẩm cùng giá xếp đầu, sau đó là một sản phẩm rẻ hơn. Khi dùng ROW_NUMBER và RANK với ORDER BY price DESC, kết quả số thứ tự khác nhau thế nào?",
    "options": [
      "Cả hai đều cho 1, 1, 3",
      "ROW_NUMBER cho 1, 2, 3; RANK cho 1, 1, 3",
      "ROW_NUMBER cho 1, 1, 3; RANK cho 1, 2, 3",
      "Cả hai đều cho 1, 2, 3"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "ROW_NUMBER luôn đánh số liên tục không trùng; RANK cho dòng bằng nhau cùng hạng rồi nhảy số.\n✓ ROW_NUMBER cho 1,2,3 (không trùng) còn RANK cho 1,1,3 với hai dòng bằng nhau.\n✗ ROW_NUMBER không bao giờ lặp số nên không thể là 1,1,3.\n✗ Đảo ngược vai trò hai hàm là sai.\n✗ RANK gặp giá bằng nhau sẽ cho cùng hạng, không phải 1,2,3."
  },
  {
    "id": "sql-q-037",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn muốn LỌC ra các dòng có giá trị từ một window function (ví dụ chỉ giữ dòng có RANK = 1). Cách làm đúng là gì?",
    "options": [
      "Đặt điều kiện trực tiếp trong WHERE: WHERE RANK() OVER (...) = 1",
      "Đặt điều kiện trong HAVING",
      "Bọc window function trong một CTE rồi lọc ở câu ngoài",
      "Lồng window function bên trong COUNT()"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Window function không dùng được trong WHERE/HAVING và không lồng trong hàm tổng hợp.\n✓ Bọc trong CTE rồi lọc ở câu ngoài là cách đúng để lọc theo kết quả window.\n✗ Không dùng được window function trực tiếp trong WHERE.\n✗ HAVING cũng không cho dùng window function.\n✗ Không được lồng window function bên trong hàm tổng hợp như COUNT()."
  },
  {
    "id": "sql-q-038",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Phát biểu nào ĐÚNG về sự khác biệt giữa GROUP BY và window function (HAM OVER (PARTITION BY ...))?",
    "options": [
      "GROUP BY gộp nhiều dòng thành một dòng kết quả cho mỗi nhóm",
      "Window function tính toán tổng hợp nhưng vẫn giữ nguyên từng dòng",
      "PARTITION BY chia dữ liệu thành nhóm nhưng KHÔNG gộp dòng",
      "Window function chỉ chạy được khi có GROUP BY đi kèm",
      "SUM(...) OVER (ORDER BY ...) dùng để tính running total (cộng dồn)"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "Window function giữ nguyên số dòng còn GROUP BY thì gộp.\n✓ GROUP BY gộp nhiều dòng thành một dòng cho mỗi nhóm.\n✓ Window function tính tổng hợp nhưng vẫn giữ nguyên từng dòng.\n✓ PARTITION BY chia nhóm giống GROUP BY nhưng không gộp dòng.\n✓ SUM(...) OVER (ORDER BY ...) cộng dồn từ dòng đầu đến dòng hiện tại → running total.\n✗ Window function không yêu cầu phải có GROUP BY đi kèm."
  },
  {
    "id": "sql-q-039",
    "courseId": "SQL",
    "lesson": "sql-03-aggregation",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Khi đưa các truy vấn GROUP BY/CTE/window function lên AWS, phát biểu nào ĐÚNG?",
    "options": [
      "Các truy vấn này chạy nguyên xi trên Amazon RDS PostgreSQL/MySQL",
      "Amazon Aurora tương thích MySQL/PostgreSQL nên dùng cùng cú pháp WITH và window function",
      "Amazon Redshift là kho dữ liệu tối ưu cho GROUP BY + window function trên dữ liệu lớn",
      "Amazon DynamoDB là NoSQL, không dùng SQL và không có JOIN/GROUP BY kiểu này",
      "Chuyển sang AWS thì phải viết lại toàn bộ cú pháp SQL vì mỗi dịch vụ khác nhau"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "Kỹ năng SQL không phụ thuộc nhà cung cấp; chỉ phần vận hành khác nhau.\n✓ RDS chạy đúng các database SQL quen thuộc nên truy vấn chạy nguyên xi.\n✓ Aurora tương thích MySQL/PostgreSQL, cùng cú pháp WITH và window function.\n✓ Redshift là data warehouse tối ưu cho GROUP BY + window function trên dữ liệu lớn.\n✓ DynamoDB là NoSQL, không dùng SQL và không có JOIN/GROUP BY kiểu này.\n✗ Không phải viết lại toàn bộ cú pháp; SQL dùng được trên RDS, Aurora, Redshift, chỉ phần vận hành khác."
  },
  {
    "id": "sql-q-040",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn cần lưu giá tiền sản phẩm sao cho không bị sai số làm tròn. Kiểu dữ liệu nào phù hợp nhất?",
    "options": [
      "FLOAT",
      "DOUBLE",
      "DECIMAL(10,2)",
      "VARCHAR(10)"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Tiền phải dùng DECIMAL để giữ chính xác phần lẻ.\n✓ DECIMAL(10,2) lưu chính xác số có phần lẻ, đúng cho tiền.\n✗ Các kiểu dấu phẩy động làm tròn sai (0.1 + 0.2 ≠ 0.3), không nên dùng cho tiền.\n✗ Lưu tiền dưới dạng chuỗi khiến không tính toán/so sánh số được đúng cách."
  },
  {
    "id": "sql-q-041",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "PRIMARY KEY tự động mang theo hai tính chất nào?",
    "options": [
      "NULL và UNIQUE",
      "NOT NULL và UNIQUE",
      "DEFAULT và CHECK",
      "NOT NULL và FOREIGN KEY"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "PRIMARY KEY định danh duy nhất mỗi dòng nên buộc phải vừa không rỗng vừa không trùng.\n✓ NOT NULL và UNIQUE là hai tính chất PRIMARY KEY tự động có, kèm index tra cứu nhanh.\n✗ Khoá chính không thể NULL nên phương án có NULL sai.\n✗ DEFAULT, CHECK, FOREIGN KEY là ràng buộc khác, không phải tính chất mặc định của khoá chính."
  },
  {
    "id": "sql-q-042",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Quan hệ giữa khách hàng và đơn hàng: một khách có nhiều đơn, mỗi đơn thuộc một khách. Đặt khoá ngoại ở đâu?",
    "options": [
      "Ở bảng customers, trỏ về orders",
      "Ở bảng orders (phía nhiều), trỏ về customers",
      "Ở cả hai bảng",
      "Cần một bảng trung gian"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Trong quan hệ 1-n, khoá ngoại đặt ở phía nhiều.\n✓ orders là phía nhiều nên orders.customer_id trỏ về customers.id.\n✗ Đặt khoá ngoại ở phía một (customers) không biểu diễn được nhiều đơn cho một khách.\n✗ Bảng trung gian chỉ cần cho quan hệ n-n, không phải 1-n."
  },
  {
    "id": "sql-q-043",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Ràng buộc nào dùng để đảm bảo cột email không có hai dòng trùng giá trị?",
    "options": [
      "NOT NULL",
      "CHECK",
      "UNIQUE",
      "DEFAULT"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "UNIQUE chặn giá trị trùng trong cột.\n✓ UNIQUE không cho phép hai dòng có cùng email, tránh dữ liệu bẩn.\n✗ Ràng buộc bắt buộc có giá trị chỉ chặn rỗng, không chặn trùng.\n✗ Ràng buộc điều kiện và giá trị mặc định không liên quan tới việc chống trùng."
  },
  {
    "id": "sql-q-044",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một đơn hàng chứa nhiều sản phẩm, một sản phẩm xuất hiện trong nhiều đơn. Cách thiết kế đúng là gì?",
    "options": [
      "Thêm cột danh sách product_id vào bảng orders",
      "Tạo bảng trung gian order_items với khoá chính (order_id, product_id)",
      "Thêm cột order_id vào bảng products",
      "Gộp orders và products thành một bảng"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Hai phía đều 'nhiều' là quan hệ n-n, luôn cần bảng trung gian.\n✓ order_items với khoá chính tổ hợp (order_id, product_id) biểu diễn đúng n-n.\n✗ Nhồi danh sách product_id vào một cột vi phạm 1NF và không JOIN được.\n✗ Thêm order_id vào products hay gộp hai bảng đều biểu diễn sai quan hệ nhiều-nhiều."
  },
  {
    "id": "sql-q-045",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng có cột products chứa giá trị \"Áo, Quần\" trong một ô. Bảng này vi phạm chuẩn nào?",
    "options": [
      "1NF",
      "2NF",
      "3NF",
      "Không vi phạm chuẩn nào"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "1NF yêu cầu mỗi ô là một giá trị nguyên tử.\n✓ Vi phạm 1NF vì một ô đang chứa danh sách nhiều giá trị thay vì một giá trị.\n✗ 2NF nói về phụ thuộc một phần vào khoá tổ hợp, chưa phải vấn đề ở đây.\n✗ 3NF nói về phụ thuộc bắc cầu; và nói không vi phạm gì là sai."
  },
  {
    "id": "sql-q-046",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng có khoá (order_id, product) nhưng cột customer_name chỉ phụ thuộc vào order_id. Đây là lỗi gì và sửa ra sao?",
    "options": [
      "Phụ thuộc một phần (2NF); tách customer_name sang bảng orders",
      "Phụ thuộc bắc cầu (3NF); thêm UNIQUE cho customer_name",
      "Vi phạm 1NF; gộp hai cột làm một",
      "Không có lỗi; giữ nguyên"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "2NF buộc cột không-khoá phụ thuộc vào toàn bộ khoá tổ hợp.\n✓ customer_name chỉ phụ thuộc một phần khoá (order_id) nên vi phạm 2NF, tách sang bảng orders.\n✗ Đây không phải phụ thuộc bắc cầu (3NF), và thêm UNIQUE không giải quyết.\n✗ Không phải lỗi 1NF, và để nguyên thì vẫn còn dư thừa/mâu thuẫn."
  },
  {
    "id": "sql-q-047",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bảng có id, customer_id, customer_city, city_zip; trong đó city_zip phụ thuộc vào customer_city. Vấn đề là gì?",
    "options": [
      "Vi phạm 1NF vì ô chứa danh sách",
      "Phụ thuộc bắc cầu, vi phạm 3NF",
      "Thiếu khoá ngoại nên vi phạm 2NF",
      "Hoàn toàn đúng chuẩn 3NF"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "3NF cấm cột không-khoá phụ thuộc vào cột không-khoá khác.\n✓ city_zip phụ thuộc customer_city (cột không-khoá) tạo phụ thuộc bắc cầu id→city→zip, vi phạm 3NF.\n✗ Không có ô chứa danh sách nên không phải lỗi 1NF.\n✗ Vấn đề không phải thiếu khoá ngoại, và rõ ràng không đạt 3NF."
  },
  {
    "id": "sql-q-048",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Khi tạo schema, vì sao order_items thường lưu cột unit_price riêng thay vì luôn tra products.price?",
    "options": [
      "Vì DECIMAL không JOIN được",
      "Để đóng băng giá tại thời điểm mua, vì giá sản phẩm có thể đổi sau này",
      "Vì FOREIGN KEY cấm tham chiếu cột price",
      "Để bắt buộc đạt 3NF chặt chẽ hơn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Đây là denormalize có chủ đích cho dữ liệu lịch sử.\n✓ Lưu unit_price đóng băng giá lúc mua, vì products.price sẽ thay đổi về sau.\n✗ DECIMAL hoàn toàn dùng được trong JOIN và FOREIGN KEY không cấm tham chiếu cột giá.\n✗ Việc này là cố ý lặp dữ liệu (denormalize), không phải để đạt 3NF chặt hơn."
  },
  {
    "id": "sql-q-049",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Đoạn lệnh tạo bảng theo thứ tự: orders (REFERENCES customers) trước, rồi customers. Điều gì xảy ra?",
    "options": [
      "Chạy bình thường, database tự sắp xếp",
      "Lỗi vì bảng được tham chiếu (customers) phải tồn tại trước",
      "Lỗi vì thiếu AUTO_INCREMENT",
      "Tạo được nhưng khoá ngoại bị bỏ qua"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Phải tạo bảng cha trước, bảng con (tham chiếu) sau.\n✓ customers được orders REFERENCES nên phải tồn tại trước, nếu không sẽ lỗi.\n✗ Database không tự sắp xếp lại thứ tự CREATE TABLE.\n✗ Nguyên nhân không phải thiếu AUTO_INCREMENT, và khoá ngoại không bị âm thầm bỏ qua."
  },
  {
    "id": "sql-q-050",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Hệ thống đọc nhiều, ghi ít, và một phép tính tổng đơn hàng bị gọi lặp lại tốn kém. Theo bài, hướng xử lý hợp lý nhất là gì?",
    "options": [
      "Luôn giữ chuẩn hoá tuyệt đối, không bao giờ lặp dữ liệu",
      "Cân nhắc denormalize sau khi đã đo được vấn đề hiệu năng thật",
      "Denormalize ngay từ đầu để phòng xa",
      "Chuyển toàn bộ sang DynamoDB"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Mặc định chuẩn hoá, chỉ denormalize khi đo được vấn đề thật.\n✓ Đọc nhiều/tính toán lặp lại tốn kém là tình huống cân nhắc denormalize, nhưng phải dựa trên đo lường.\n✗ Khăng khăng không bao giờ lặp dữ liệu bỏ qua trường hợp hiệu năng chính đáng.\n✗ Denormalize ngay từ đầu hay đổi hẳn công cụ là tối ưu sớm/quá đà khi chưa đo được vấn đề."
  },
  {
    "id": "sql-q-051",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, những phát biểu nào về thiết kế schema là ĐÚNG?",
    "options": [
      "Nên dùng surrogate key (id vô nghĩa do hệ thống sinh) làm khoá chính thay vì email/số điện thoại",
      "Quan hệ 1-1 có thể tạo bằng khoá ngoại đặt UNIQUE",
      "Ràng buộc chỉ nên kiểm tra ở code ứng dụng, không cần ở database",
      "VARCHAR(100) chỉ tốn chỗ theo độ dài thực tế, còn CHAR(100) luôn chiếm đủ 100 ký tự",
      "FLOAT là lựa chọn tốt cho cột tiền"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "Các nguyên tắc thiết kế đúng theo bài học.\n✓ Surrogate key ổn định hơn dữ liệu nghiệp vụ như email vốn có thể đổi.\n✓ Quan hệ 1-1 đảm bảo bằng khoá ngoại UNIQUE (hoặc khoá ngoại đồng thời là khoá chính).\n✓ VARCHAR tốn chỗ theo độ dài thực, CHAR luôn chiếm đủ kích thước khai báo.\n✗ Database là tuyến phòng thủ cuối; không thể chỉ dựa vào kiểm tra ở code.\n✗ FLOAT làm tròn sai, không dùng cho tiền."
  },
  {
    "id": "sql-q-052",
    "courseId": "SQL",
    "lesson": "sql-04-schema-design",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về việc chọn dịch vụ AWS theo đặc tính dữ liệu, những phát biểu nào ĐÚNG theo bài?",
    "options": [
      "RDS chạy đúng các engine SQL quan hệ, mọi PRIMARY KEY/FOREIGN KEY/CHECK hoạt động y hệt",
      "DynamoDB khuyến khích denormalize và thường gộp nhiều thực thể vào một bảng",
      "Aurora cần đọc nhiều có thể thêm read replica thay vì vội denormalize",
      "DynamoDB hỗ trợ JOIN và FOREIGN KEY như SQL truyền thống",
      "Dữ liệu quan hệ phức tạp cần toàn vẹn thì nên chọn DynamoDB thay vì RDS"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Hiểu chuẩn hoá giúp chọn đúng công cụ AWS.\n✓ RDS chạy các engine SQL quan hệ, ràng buộc hoạt động y hệt môi trường tự host.\n✓ DynamoDB khuyến khích denormalize và single-table design ở quy mô lớn.\n✓ Aurora có thể thêm read replica để tăng tốc đọc mà vẫn giữ schema sạch.\n✗ DynamoDB không có JOIN hay FOREIGN KEY, đánh đổi tính linh hoạt truy vấn lấy độ trễ thấp.\n✗ Dữ liệu quan hệ phức tạp cần toàn vẹn nên chọn RDS/Aurora, không phải DynamoDB."
  },
  {
    "id": "sql-q-053",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Sau khi tạo INDEX trên cột email, điều gì thay đổi đối với câu `SELECT * FROM customers WHERE email = 'an@example.com'`?",
    "options": [
      "Kết quả trả về thay đổi, nhưng tốc độ giữ nguyên",
      "Tốc độ tìm ra kết quả nhanh hơn, kết quả vẫn y hệt",
      "Câu SQL phải viết lại khác đi mới chạy được",
      "Bảng customers tự động bị sắp xếp lại vĩnh viễn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "INDEX chỉ tăng tốc, không đổi kết quả.\n✓ Index tăng tốc tìm kiếm nhưng kết quả truy vấn vẫn giống hệt, câu SQL viết y nguyên.\n✗ Index không làm thay đổi kết quả trả về.\n✗ Không cần viết lại câu SQL để tận dụng index.\n✗ Index là cấu trúc phụ riêng, không sắp xếp lại bảng gốc."
  },
  {
    "id": "sql-q-054",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong PostgreSQL, kế hoạch truy vấn hiện 'Seq Scan' kèm 'Rows Removed by Filter: 1999999' trên bảng lớn có nghĩa là gì?",
    "options": [
      "Index đang được dùng hiệu quả",
      "Database quét gần như toàn bảng rồi loại bỏ phần lớn dòng — dấu hiệu xấu",
      "Truy vấn bị lỗi cú pháp",
      "Bảng đã được tối ưu hoàn hảo"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Seq Scan + nhiều dòng bị loại là dấu hiệu thiếu index.\n✓ Quét tuần tự gần hết bảng rồi vứt bỏ hàng triệu dòng là lãng phí, cần thêm index.\n✗ Seq Scan nghĩa là index KHÔNG được dùng, không phải dùng hiệu quả.\n✗ Đây là kế hoạch hợp lệ, không phải lỗi cú pháp.\n✗ Đây là dấu hiệu chưa tối ưu chứ không phải hoàn hảo."
  },
  {
    "id": "sql-q-055",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Vì sao B-tree giúp tìm kiếm nhanh hơn nhiều so với quét tuần tự?",
    "options": [
      "Vì nó nén dữ liệu nhỏ lại",
      "Vì mỗi tầng loại bỏ một phần lớn nhánh, đạt độ phức tạp O(log n) thay vì O(n)",
      "Vì nó lưu toàn bộ bảng vào RAM",
      "Vì nó bỏ qua các dòng trùng lặp"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "B-tree giảm số bước so sánh theo log n.\n✓ Cây sắp xếp nhiều tầng loại bỏ một nửa (hoặc hơn) nhánh mỗi bước, cho O(log n) thay vì O(n).\n✗ B-tree không hoạt động nhờ nén dữ liệu.\n✗ Tốc độ không đến từ việc nạp cả bảng vào RAM.\n✗ B-tree không tăng tốc bằng cách bỏ qua dòng trùng."
  },
  {
    "id": "sql-q-056",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Cột nào trong các bảng sau thường KHÔNG được database tự động đánh index?",
    "options": [
      "PRIMARY KEY customers.id",
      "Cột UNIQUE",
      "FOREIGN KEY orders.customer_id",
      "Mọi cột trên đều tự động được index"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "FOREIGN KEY không tự động có index ở nhiều database.\n✓ Cột khóa ngoại như orders.customer_id thường không được PostgreSQL tự đánh index, phải tự tạo — đây là cái bẫy kinh điển.\n✗ PRIMARY KEY tự động có index.\n✗ Cột UNIQUE tự động có index.\n✗ Không phải mọi cột đều tự động được index, khóa ngoại là ngoại lệ."
  },
  {
    "id": "sql-q-057",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Có index composite `(customer_id, status)` trên orders. Truy vấn nào KHÔNG tận dụng được index này hiệu quả?",
    "options": [
      "WHERE customer_id = 42 AND status = 'paid'",
      "WHERE customer_id = 42",
      "WHERE status = 'paid'",
      "Cả ba truy vấn đều dùng index tốt như nhau"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Quy tắc leftmost prefix: phải dùng từ cột trái nhất.\n✓ Lọc chỉ theo status mà bỏ qua customer_id (cột trái nhất) khiến index gần như vô dụng.\n✗ Dùng cả hai cột là cách tận dụng tốt nhất.\n✗ Dùng đúng cột trái nhất vẫn tận dụng được index.\n✗ Ba truy vấn không tương đương; truy vấn bỏ cột đầu kém hiệu quả hẳn."
  },
  {
    "id": "sql-q-058",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong kế hoạch EXPLAIN, sự khác biệt giữa 'Index Cond' và 'Filter' kèm 'Rows Removed by Filter' lớn là gì?",
    "options": [
      "Cả hai đều có nghĩa index đang gánh việc lọc",
      "'Index Cond' nghĩa index giải quyết điều kiện; 'Filter' kèm nhiều dòng bị loại nghĩa database vẫn đọc rồi loại thủ công",
      "'Filter' nhanh hơn 'Index Cond'",
      "Hai khái niệm này hoàn toàn không liên quan đến index"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Index Cond tốt, Filter với nhiều dòng bị loại là xấu.\n✓ Index Cond cho thấy index xử lý điều kiện; còn Filter kèm Rows Removed by Filter lớn cho thấy database phải đọc rồi loại bỏ thủ công.\n✗ Chỉ Index Cond mới nghĩa index gánh việc lọc.\n✗ Filter (loại thủ công) thường chậm hơn, không nhanh hơn.\n✗ Cả hai đều liên quan trực tiếp đến việc index có giúp được không."
  },
  {
    "id": "sql-q-059",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Có index trên email. Câu nào dưới đây làm index bị BỎ QUA và chuyển sang Seq Scan?",
    "options": [
      "WHERE email = 'an@example.com'",
      "WHERE LOWER(email) = 'an@example.com'",
      "WHERE email >= 'a' AND email < 'b'",
      "WHERE email IS NOT NULL AND email = 'an@example.com'"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bọc cột trong hàm làm index vô hiệu.\n✓ LOWER(email) bọc cột trong hàm; index nằm trên giá trị gốc nên không dùng được, dẫn tới Seq Scan.\n✗ So sánh bằng trực tiếp trên cột dùng được index.\n✗ So sánh khoảng trên chính cột vẫn tận dụng được B-tree.\n✗ Điều kiện bằng trên cột gốc vẫn cho phép dùng index."
  },
  {
    "id": "sql-q-060",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Câu LIKE nào dùng được Index Scan trên cột full_name có index B-tree?",
    "options": [
      "WHERE full_name LIKE '%Nam'",
      "WHERE full_name LIKE '%Nam%'",
      "WHERE full_name LIKE 'Nam%'",
      "WHERE LOWER(full_name) LIKE 'nam%'"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "B-tree chỉ hỗ trợ tiền tố cố định.\n✓ 'Nam%' có tiền tố cố định nên database định vị được điểm bắt đầu trong cây sắp xếp.\n✗ '%Nam' có ký tự đại diện ở đầu, không có điểm bắt đầu để định vị.\n✗ '%Nam%' cũng bắt đầu bằng ký tự đại diện nên phải Seq Scan.\n✗ Bọc cột trong LOWER() làm index trên cột gốc bị bỏ qua."
  },
  {
    "id": "sql-q-061",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Vì sao đánh index lên cột `status` (chỉ có 3 giá trị 'paid'/'pending'/'cancelled') thường là ý tưởng tồi?",
    "options": [
      "Vì cột VARCHAR không thể được đánh index",
      "Vì tính chọn lọc thấp khiến database vẫn ưu tiên Seq Scan, index tốn chỗ và chi phí ghi mà ít được dùng",
      "Vì index chỉ hoạt động trên cột số",
      "Vì status là khóa ngoại"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Cột ít giá trị phân biệt có tính chọn lọc thấp.\n✓ Cột chỉ vài giá trị có tính chọn lọc thấp, database thường vẫn chọn Seq Scan, nên index gần như vô dụng mà vẫn phạt ghi và tốn đĩa.\n✗ Cột VARCHAR hoàn toàn có thể đánh index.\n✗ Index hoạt động trên nhiều kiểu dữ liệu, không chỉ số.\n✗ status không phải khóa ngoại trong schema này."
  },
  {
    "id": "sql-q-062",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Báo cáo lọc `WHERE customer_id = 42 AND status = 'paid' AND created_at >= '2026-01-01' ORDER BY created_at DESC`. Index composite nào tối ưu nhất?",
    "options": [
      "(created_at, customer_id, status)",
      "(customer_id, status, created_at)",
      "(status, customer_id, created_at)",
      "(created_at, status, customer_id)"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Cột so sánh bằng đặt trước, cột khoảng/sắp xếp đặt sau.\n✓ (customer_id, status, created_at) đặt hai cột lọc bằng lên đầu rồi cột khoảng/ORDER BY cuối, vừa nhảy chính xác vừa phục vụ sắp xếp miễn phí.\n✗ Đặt created_at (khoảng) làm cột đầu phá vỡ leftmost prefix, không nhảy chính xác tới customer_id.\n✗ Đặt status trước customer_id không tối ưu cho truy vấn lọc theo customer_id, và tính chọn lọc của status thấp.\n✗ Lại đặt created_at khoảng làm cột trái nhất nên hiệu quả kém."
  },
  {
    "id": "sql-q-063",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Hiển thị 100 khách kèm đơn hàng bằng cách lặp 100 lần `SELECT * FROM orders WHERE customer_id = ?` chạy chậm dù mỗi câu đều có index. Nguyên nhân và cách sửa đúng là gì?",
    "options": [
      "Thiếu index trên customer_id; thêm index sẽ hết chậm",
      "Đây là vấn đề N+1: nhiều lần đi-về database cộng dồn độ trễ; sửa bằng gộp thành 1 truy vấn JOIN hoặc IN",
      "Bảng orders quá lớn; phải xóa bớt dữ liệu",
      "Phải đánh index lên mọi cột của orders"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "N+1 là vấn đề số lượt đi-về, không phải thiếu index.\n✓ 1 query gốc cộng N query con tạo nhiều lượt round-trip cộng dồn độ trễ; gộp thành một query bằng JOIN hoặc IN giải quyết được.\n✗ Vấn đề không phải thiếu index — mỗi câu đã có index rồi.\n✗ Xóa dữ liệu không giải quyết bản chất nhiều round-trip.\n✗ Đánh index mọi cột vừa không liên quan vừa phạt ghi nặng."
  },
  {
    "id": "sql-q-064",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào ĐÚNG về cái giá phải trả khi tạo nhiều index?",
    "options": [
      "Mỗi INSERT phải cập nhật thêm mọi index liên quan, làm ghi chậm hơn",
      "Index thừa làm phình dung lượng đĩa",
      "Index luôn miễn phí, càng nhiều càng tốt",
      "UPDATE cột có index có thể phải xóa mục cũ và thêm mục mới trong index",
      "Index chỉ ảnh hưởng tới đọc, không bao giờ ảnh hưởng tới ghi"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "Index là đánh đổi: đọc nhanh hơn, ghi chậm hơn và tốn chỗ.\n✓ Mỗi INSERT phải ghi vào bảng cộng mọi index nên ghi chậm hơn.\n✓ Index thừa chiếm thêm dung lượng đĩa.\n✓ UPDATE cột có index phải xóa mục cũ và thêm mục mới.\n✗ Index không miễn phí; nhiều quá sẽ phạt ghi và tốn bộ nhớ.\n✗ Index ảnh hưởng rõ rệt tới hiệu năng ghi, không chỉ đọc."
  },
  {
    "id": "sql-q-065",
    "courseId": "SQL",
    "lesson": "sql-05-indexes-performance",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi chuyển database tự quản sang Amazon RDS/Aurora hoặc DynamoDB, những phát biểu nào ĐÚNG?",
    "options": [
      "Chuyển sang RDS/Aurora tự động làm truy vấn index kém trở nên nhanh",
      "Trên RDS, CREATE INDEX và EXPLAIN hoạt động y hệt database thường",
      "RDS Performance Insights giúp tìm truy vấn chậm để biết nên đánh index ở đâu",
      "DynamoDB cho phép viết WHERE tùy ý rồi tự có index như SQL",
      "Muốn truy vấn theo thuộc tính khác trong DynamoDB phải tạo Global Secondary Index trước"
    ],
    "correctIndices": [
      1,
      2,
      4
    ],
    "explanation": "SQL trên RDS/Aurora giống hệt; DynamoDB bắt thiết kế index trước.\n✓ Trên RDS, CREATE INDEX và EXPLAIN dùng y như database thường.\n✓ Performance Insights giúp phát hiện truy vấn chậm để biết nơi cần index.\n✓ DynamoDB bắt buộc tạo GSI trước nếu muốn truy vấn theo thuộc tính khác.\n✗ Chuyển sang RDS/Aurora không tự sửa index kém; chậm vẫn chậm.\n✗ DynamoDB không cho viết WHERE tùy ý rồi mong có index như SQL."
  },
  {
    "id": "sql-q-066",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong tình huống chuyển tiền (trừ A, cộng B), tính chất nào của ACID đảm bảo \"hoặc cả hai bước cùng thành công, hoặc không bước nào xảy ra\"?",
    "options": [
      "Atomicity (nguyên tử)",
      "Consistency (nhất quán)",
      "Isolation (cô lập)",
      "Durability (bền vững)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tính chất \"tất cả-hoặc-không-gì\" chính là nguyên tử.\n✓ Tính nguyên tử đảm bảo các bước cùng sống cùng chết, không có nửa vời.\n✗ Tính nhất quán nói về dữ liệu trước/sau luôn hợp lệ, không vi phạm ràng buộc.\n✗ Tính cô lập nói về các transaction song song không giẫm chân nhau.\n✗ Tính bền vững đảm bảo dữ liệu còn sau khi đã COMMIT dù mất điện."
  },
  {
    "id": "sql-q-067",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn chạy BEGIN rồi UPDATE, SELECT thấy số đã đổi, nhưng kết nối bị đóng trước khi COMMIT. Chuyện gì xảy ra với thay đổi đó?",
    "options": [
      "Thay đổi bị ROLLBACK, coi như chưa từng xảy ra",
      "Thay đổi được tự động COMMIT khi đóng kết nối",
      "Thay đổi vẫn còn vì SELECT đã thấy giá trị mới",
      "Thay đổi được lưu tạm và áp dụng ở lần kết nối sau"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chưa COMMIT thì khi kết nối đóng mọi thứ bị huỷ.\n✓ Kết nối đóng mà chưa COMMIT khiến toàn bộ thay đổi bị ROLLBACK.\n✗ Đóng kết nối không tự COMMIT mà ngược lại tự huỷ.\n✗ SELECT thấy giá trị mới chỉ vì đang trong transaction của chính bạn, không có nghĩa đã chốt.\n✗ Thay đổi tạm không được mang sang kết nối khác."
  },
  {
    "id": "sql-q-068",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Mức isolation mặc định của PostgreSQL là gì, và nó cho phép hiện tượng lỗi nào?",
    "options": [
      "READ COMMITTED — vẫn cho phép non-repeatable read và phantom read",
      "SERIALIZABLE — không cho phép hiện tượng lỗi nào",
      "READ UNCOMMITTED — cho phép cả dirty read",
      "REPEATABLE READ — chỉ cho phép phantom read"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "PostgreSQL mặc định READ COMMITTED, chặn dirty read nhưng còn lọt non-repeatable và phantom.\n✓ READ COMMITTED là mặc định và vẫn cho phép non-repeatable read lẫn phantom read.\n✗ SERIALIZABLE chặn mọi hiện tượng nhưng không phải mặc định.\n✗ READ UNCOMMITTED cho dirty read và không phải mặc định của PostgreSQL.\n✗ REPEATABLE READ không phải mức mặc định."
  },
  {
    "id": "sql-q-069",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Hiện tượng \"trong cùng một transaction, đọc cùng một hàng hai lần ra hai giá trị khác nhau vì có transaction khác đã COMMIT\" tên là gì?",
    "options": [
      "Non-repeatable read",
      "Dirty read",
      "Phantom read",
      "Deadlock"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đọc lại cùng một hàng ra khác nhau là non-repeatable read.\n✓ Non-repeatable read đúng là đọc lại cùng một hàng ra giá trị khác do transaction khác đã COMMIT.\n✗ Dirty read là đọc dữ liệu chưa COMMIT của transaction khác.\n✗ Phantom read là số lượng hàng thoả điều kiện thay đổi, không phải giá trị một hàng.\n✗ Deadlock là hai transaction chờ khoá của nhau, không phải hiện tượng đọc."
  },
  {
    "id": "sql-q-070",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "An mua 3 \"Chuột\" (id=11) nhưng tồn kho đang là 0. Cách nào an toàn nhất để tránh trừ kho thành số âm hoặc bán hàng không có?",
    "options": [
      "Dùng UPDATE ... WHERE stock >= 3 bên trong transaction rồi kiểm tra số hàng bị ảnh hưởng",
      "SELECT stock trước khi BEGIN, nếu đủ thì BEGIN và trừ kho",
      "Cứ trừ kho rồi nếu thấy âm thì UPDATE lại về 0",
      "Tăng isolation lên SERIALIZABLE rồi SELECT bình thường"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phải kiểm tra điều kiện ngay trong câu lệnh ghi để tránh race condition giữa lúc kiểm và lúc trừ.\n✓ UPDATE ... WHERE stock >= 3 trong transaction rồi xem số hàng bị ảnh hưởng là cách an toàn, tránh khoảng trống đua tranh.\n✗ SELECT trước khi BEGIN tạo khoảng trống để người khác mua hết giữa lúc kiểm tra và trừ.\n✗ Trừ rồi sửa lại về 0 vẫn đã bán hàng không có, sai logic.\n✗ Tăng SERIALIZABLE rồi SELECT thường không tự ngăn việc trừ kho âm."
  },
  {
    "id": "sql-q-071",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Câu lệnh UPSERT sau làm gì khi sản phẩm id=11 đã tồn tại với stock=20?\nINSERT INTO products (id, name, price, stock) VALUES (11, 'Chuột', 150, 20)\nON CONFLICT (id) DO UPDATE SET stock = products.stock + EXCLUDED.stock;",
    "options": [
      "stock của sản phẩm 11 trở thành 40",
      "EXCLUDED tham chiếu hàng định chèn (giá trị 20)",
      "products.stock tham chiếu hàng đang có sẵn trong bảng",
      "Câu lệnh báo lỗi vì id đã tồn tại",
      "Một hàng mới hoàn toàn được chèn thêm vào bảng"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Khi đụng khoá trùng, nhánh DO UPDATE cộng dồn stock cũ với stock định chèn.\n✓ stock 20 cũ cộng 20 định chèn thành 40.\n✓ EXCLUDED đúng là hàng định chèn với giá trị 20.\n✓ products.stock đúng là hàng đang có sẵn trong bảng.\n✗ Câu không báo lỗi vì ON CONFLICT xử lý trùng khoá êm đẹp.\n✗ Không có hàng mới được chèn vì đụng id trùng nên chuyển sang cập nhật."
  },
  {
    "id": "sql-q-072",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bài tập yêu cầu UPSERT id=12 'Tai nghe' giá 250 stock 10; nếu đã tồn tại thì GHI ĐÈ giá nhưng CỘNG DỒN stock. Mệnh đề DO UPDATE nào đúng?",
    "options": [
      "SET price = EXCLUDED.price, stock = products.stock + EXCLUDED.stock",
      "SET price = products.price + EXCLUDED.price, stock = EXCLUDED.stock",
      "SET price = products.price, stock = products.stock + EXCLUDED.stock",
      "SET price = EXCLUDED.price, stock = EXCLUDED.stock"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ghi đè giá = lấy thẳng EXCLUDED; cộng dồn stock = giá trị cũ cộng giá trị mới.\n✓ price = EXCLUDED.price ghi đè, stock = products.stock + EXCLUDED.stock cộng dồn, đúng yêu cầu.\n✗ Cộng dồn giá và ghi đè stock là ngược lại yêu cầu.\n✗ Giữ nguyên giá cũ không phải là ghi đè giá mới.\n✗ Ghi đè cả stock làm mất phần cộng dồn."
  },
  {
    "id": "sql-q-073",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Hai transaction chạy: T1 khoá hàng id=1 rồi cố update id=2; T2 khoá hàng id=2 rồi cố update id=1. Database phản ứng thế nào và cách phòng tránh tốt nhất?",
    "options": [
      "Database phát hiện deadlock, huỷ một transaction; phòng tránh bằng cách luôn khoá các hàng theo cùng một thứ tự",
      "Database treo cả hai vĩnh viễn; phải khởi động lại server",
      "Database tự gộp hai transaction thành một; không cần làm gì",
      "Database hạ isolation xuống READ UNCOMMITTED để giải toả"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đây là deadlock kinh điển; DB tự phát hiện và huỷ một bên, còn ta phòng bằng thứ tự khoá nhất quán.\n✓ Database tự phát hiện deadlock và huỷ một transaction; chuẩn hoá thứ tự khoá (vd id nhỏ trước) ngăn vòng chờ.\n✗ Database không treo vĩnh viễn vì có cơ chế phát hiện deadlock.\n✗ Database không gộp hai transaction lại.\n✗ Hạ isolation là sai hướng, không giải quyết deadlock."
  },
  {
    "id": "sql-q-074",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Đặc điểm nào đúng về VIEW trong SQL?",
    "options": [
      "View không lưu dữ liệu; mỗi lần đọc, database chạy lại câu SELECT bên dưới",
      "View lưu sẵn dữ liệu kết quả và phải REFRESH thủ công",
      "View thay thế hoàn toàn các bảng gốc, xoá bảng gốc đi",
      "View chỉ tồn tại trong một transaction rồi biến mất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "View là câu truy vấn có sẵn, không lưu dữ liệu.\n✓ View không lưu dữ liệu mà chạy lại câu SELECT mỗi lần đọc.\n✗ Lưu sẵn dữ liệu và cần REFRESH là đặc điểm của materialized view.\n✗ View không xoá hay thay thế bảng gốc.\n✗ View tồn tại lâu dài, không giới hạn trong một transaction."
  },
  {
    "id": "sql-q-075",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần một VIEW tên rich_customers liệt kê id, name của khách có balance >= 300. Câu nào đúng?",
    "options": [
      "CREATE VIEW rich_customers AS SELECT id, name FROM customers WHERE balance >= 300;",
      "CREATE VIEW rich_customers AS SELECT * FROM customers HAVING balance >= 300;",
      "CREATE TABLE rich_customers AS SELECT id, name WHERE balance >= 300;",
      "CREATE VIEW rich_customers SELECT id, name FROM customers WHERE balance > 300;"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "View tạo bằng CREATE VIEW ... AS SELECT, lọc bằng WHERE với điều kiện >= 300.\n✓ Đúng cú pháp CREATE VIEW ... AS với WHERE balance >= 300 và chỉ chọn id, name.\n✗ HAVING dùng với GROUP BY, không thay được WHERE ở đây, và SELECT * không khớp yêu cầu cột.\n✗ CREATE TABLE tạo bảng lưu dữ liệu chứ không phải view, lại thiếu FROM.\n✗ Thiếu từ khoá AS và dùng > 300 sẽ loại nhầm khách có đúng 300."
  },
  {
    "id": "sql-q-076",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài, đâu là nguyên tắc đúng khi viết transaction ở tầng ứng dụng?",
    "options": [
      "Giữ transaction ngắn, không gọi API bên ngoài hay sleep khi đang mở",
      "Luôn có nhánh COMMIT/ROLLBACK rõ ràng, không để transaction treo",
      "Sẵn sàng retry khi gặp lỗi xung đột (SERIALIZABLE) hoặc deadlock",
      "Mở transaction rồi gọi API thanh toán bên thứ ba 5 giây xong mới COMMIT",
      "Tăng isolation lên SERIALIZABLE cho mọi transaction để chắc chắn an toàn"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Nguyên tắc vàng là giữ transaction ngắn, kết thúc rõ ràng, và sẵn sàng chạy lại khi xung đột.\n✓ Giữ transaction ngắn và tránh gọi API/sleep khi đang mở giúp không khoá hàng lâu.\n✓ Luôn có nhánh COMMIT/ROLLBACK rõ ràng để không treo transaction.\n✓ Retry khi gặp lỗi xung đột hay deadlock là cách xử lý đúng.\n✗ Gọi API thanh toán 5 giây trong transaction khoá hàng lâu, đúng là lỗi cần tránh.\n✗ Bài khuyên 99% dùng READ COMMITTED, không nên ép SERIALIZABLE cho mọi nơi vì càng chặt càng dễ phải retry."
  },
  {
    "id": "sql-q-077",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, dữ liệu nào nên đặt ở SQL (RDS/Aurora) thay vì NoSQL?",
    "options": [
      "customers, orders, products — cần ACID và JOIN, tính đúng tuyệt đối",
      "Giỏ hàng tạm và phiên đăng nhập cần đọc/ghi cực nhanh",
      "Log và bộ đếm lượt xem quy mô khổng lồ ít quan hệ",
      "Cache tốc độ cao thay đổi cấu trúc liên tục"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dữ liệu có quan hệ chặt và cần đúng tuyệt đối thuộc về SQL.\n✓ customers, orders, products cần ACID và JOIN nên hợp với SQL.\n✗ Giỏ hàng tạm và session cần nhanh, quy mô lớn hợp NoSQL.\n✗ Log và bộ đếm khổng lồ ít quan hệ hợp NoSQL.\n✗ Cache tốc độ cao đổi cấu trúc liên tục thuộc về NoSQL như Redis."
  },
  {
    "id": "sql-q-078",
    "courseId": "SQL",
    "lesson": "sql-06-transactions",
    "certifications": [
      "SQL"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "T1 chạy: BEGIN; UPDATE customers SET balance = 0 WHERE id = 1; (chưa COMMIT). T2 chạy SELECT thấy balance = 0. Sau đó T1 ROLLBACK. T2 đã gặp hiện tượng gì, và mức isolation nào ngăn được?",
    "options": [
      "Dirty read — READ COMMITTED trở lên ngăn được",
      "Phantom read — chỉ SERIALIZABLE ngăn được",
      "Non-repeatable read — REPEATABLE READ trở lên ngăn được",
      "Deadlock — chuẩn hoá thứ tự khoá ngăn được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đọc được dữ liệu chưa COMMIT rồi bị ROLLBACK chính là dirty read, bị chặn từ READ COMMITTED.\n✓ Dirty read là đọc giá trị chưa COMMIT; từ READ COMMITTED trở lên đã chặn.\n✗ Phantom read là số hàng thoả điều kiện thay đổi, không phải tình huống này.\n✗ Non-repeatable read cần transaction khác đã COMMIT, còn đây T1 lại ROLLBACK.\n✗ Deadlock là hai bên chờ khoá nhau, không liên quan đến đọc bẩn."
  },
  {
    "id": "tech-q-001",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn đang gõ một văn bản trong Word thì mất điện đột ngột mà chưa kịp bấm Lưu (Save). Phần vừa gõ thêm có còn không?",
    "options": [
      "Mất, vì nội dung mới chỉ nằm trên RAM (bàn làm việc) chứ chưa được chép vào ổ cứng",
      "Còn, vì RAM giữ dữ liệu kể cả khi tắt máy",
      "Còn, vì CPU đã ghi nhớ mọi phép tính",
      "Mất, vì Word tự xóa file khi mất điện"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi chưa Save, nội dung mới chỉ ở RAM; mà RAM tắt máy là mất sạch.\n✓ Nội dung mới chỉ nằm trên RAM nên mất khi cúp điện đột ngột — đúng theo cơ chế bàn làm việc bị quét sạch cuối ngày\n✗ RAM giữ dữ liệu khi tắt máy — sai, RAM mất hết khi mất điện\n✗ CPU ghi nhớ mọi phép tính — sai, CPU chỉ tính toán, không lưu trữ lâu dài\n✗ Word tự xóa file — sai, vấn đề là chưa cất vào tủ chứ không phải bị xóa"
  },
  {
    "id": "tech-q-002",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một người nói: \"Máy em có 500 GB RAM.\" Khả năng cao họ đang nhầm với cái gì?",
    "options": [
      "Dung lượng ổ cứng",
      "Tốc độ CPU",
      "Số nhân của CPU",
      "Tốc độ mạng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Con số hàng trăm GB gần như chắc chắn là ổ cứng, không phải RAM.\n✓ Dung lượng ổ cứng — đúng, RAM thường chỉ 4/8/16/32 GB, còn hàng trăm GB là tủ hồ sơ\n✗ Tốc độ CPU — sai, tốc độ CPU đo bằng GHz\n✗ Số nhân CPU — sai, số nhân chỉ vài đơn vị\n✗ Tốc độ mạng — sai, không liên quan đến đơn vị GB lưu trữ"
  },
  {
    "id": "tech-q-003",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong hình ảnh \"máy tính là một văn phòng\", ai là người THỰC SỰ làm mọi phép tính?",
    "options": [
      "CPU (nhân viên)",
      "RAM (bàn làm việc)",
      "Ổ cứng (tủ hồ sơ)",
      "Hệ điều hành (người quản lý)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "CPU là nhân viên duy nhất thực sự làm việc: cộng, so sánh, di chuyển dữ liệu.\n✓ CPU — đúng, mọi tính toán diễn ra ở đây\n✗ RAM — sai, chỉ là chỗ bày giấy tờ đang làm dở\n✗ Ổ cứng — sai, chỉ là nơi cất giữ lâu dài\n✗ Hệ điều hành — sai, chỉ điều phối chứ không tự làm phép tính"
  },
  {
    "id": "tech-q-004",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn cần chọn nơi để cất giữ ảnh và tài liệu LÂU DÀI, không mất khi tắt máy. Đó là?",
    "options": [
      "Ổ cứng",
      "RAM",
      "CPU",
      "Xung nhịp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ổ cứng là nơi lưu trữ lâu dài, tắt máy không mất.\n✓ Ổ cứng — đúng, là tủ hồ sơ giữ nguyên khi tắt máy\n✗ RAM — sai, tắt máy là mất sạch\n✗ CPU — sai, là bộ xử lý chứ không lưu trữ\n✗ Xung nhịp — sai, chỉ là tốc độ làm việc của CPU"
  },
  {
    "id": "tech-q-005",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Hai CPU: A là 2 nhân chạy 3.5 GHz, B là 8 nhân chạy 2.5 GHz. Theo bài học, nhận định nào ĐÚNG?",
    "options": [
      "GHz cao hơn không có nghĩa máy chắc chắn nhanh hơn; B nhiều nhân có thể mạnh hơn A",
      "A chắc chắn nhanh hơn vì xung nhịp cao hơn",
      "B chắc chắn chậm hơn vì mỗi nhịp ít hơn",
      "Số nhân không ảnh hưởng gì đến tốc độ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài học cảnh báo: GHz cao chưa chắc nhanh hơn; nhiều nhân có thể bù lại.\n✓ GHz cao chưa chắc nhanh hơn, B nhiều nhân có thể mạnh hơn — đúng như ví dụ 8 nhân viên đều tay thắng 2 nhân viên nhanh hơn chút\n✗ A chắc chắn nhanh hơn vì GHz cao — sai, đây chính là lỗi người mới hay mắc\n✗ B chắc chắn chậm hơn — sai, không thể kết luận chắc chắn như vậy\n✗ Số nhân không ảnh hưởng — sai, số nhân quyết định số việc làm cùng lúc"
  },
  {
    "id": "tech-q-006",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn nháy đúp vào biểu tượng Chrome. Thứ tự các bước xảy ra đúng là gì?",
    "options": [
      "OS tìm Chrome trong ổ cứng → nạp vào RAM → CPU thực hiện lệnh → Chrome thành tiến trình",
      "CPU chạy Chrome thẳng từ ổ cứng mà không cần RAM",
      "Chrome chạy trên ổ cứng rồi mới được CPU sao chép vào màn hình",
      "RAM tìm Chrome rồi tự thực hiện các dòng lệnh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy trình: OS lấy chương trình từ ổ cứng, nạp vào RAM, CPU thực hiện, lúc đó thành tiến trình.\n✓ OS tìm trong ổ cứng → nạp RAM → CPU thực hiện → thành tiến trình — đúng trình tự bài mô tả\n✗ CPU chạy thẳng từ ổ cứng không cần RAM — sai, phải nạp lên RAM trước\n✗ Chrome chạy trên ổ cứng — sai, chương trình phải được nạp vào RAM mới chạy\n✗ RAM tự thực hiện lệnh — sai, CPU mới là nơi thực hiện lệnh"
  },
  {
    "id": "tech-q-007",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sự khác nhau cốt lõi giữa \"chương trình\" và \"tiến trình\" là gì?",
    "options": [
      "Chương trình là phần mềm nằm yên trong ổ cứng; tiến trình là chương trình đang chạy",
      "Chương trình chạy nhanh hơn tiến trình",
      "Tiến trình nằm trong ổ cứng, chương trình nằm trong RAM",
      "Chúng hoàn toàn giống nhau, chỉ khác cách gọi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chương trình = cuốn công thức nằm yên; tiến trình = lúc đang nấu (đang chạy).\n✓ Chương trình nằm yên trong ổ cứng, tiến trình là chương trình đang chạy — đúng định nghĩa\n✗ Chương trình chạy nhanh hơn — sai, chương trình chưa chạy gì cả\n✗ Tiến trình nằm trong ổ cứng — sai, tiến trình đã được nạp vào RAM và đang chạy\n✗ Hoàn toàn giống nhau — sai, đây là điểm khác biệt quan trọng"
  },
  {
    "id": "tech-q-008",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn tải một bộ phim 4 GB qua gói mạng quảng cáo \"100 Mbps\". Vì sao không tải xong trong khoảng 40 giây như bạn tưởng?",
    "options": [
      "100 Mbps là 100 megabit/giây, chia 8 chỉ ~12,5 megabyte/giây, nên mất hơn 5 phút",
      "Mạng luôn chậm hơn quảng cáo đúng một nửa",
      "Bộ phim 4 GB thực ra là 4 megabit",
      "Vì ổ cứng ghi dữ liệu quá nhanh gây nghẽn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mbps là megabit/giây; phải chia 8 để ra megabyte/giây nên tốc độ thực thấp hơn nhiều.\n✓ 100 megabit/giây ÷ 8 ≈ 12,5 megabyte/giây nên mất hơn 5 phút — đúng, đây là nhầm lẫn bit với byte\n✗ Mạng luôn chậm hơn đúng một nửa — sai, lý do là đơn vị bit/byte chứ không phải một nửa\n✗ Phim 4 GB là 4 megabit — sai, 4 GB là gigabyte, lớn hơn nhiều\n✗ Ổ cứng ghi quá nhanh gây nghẽn — sai, không liên quan"
  },
  {
    "id": "tech-q-009",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khi RAM đầy mà bạn vẫn mở thêm nhiều thứ, OS phải làm việc cực chậm nào khiến máy ì ạch?",
    "options": [
      "Swap — tạm cất bớt dữ liệu trên RAM vào ổ cứng rồi khi cần lại lôi ra",
      "Tăng xung nhịp CPU lên gấp đôi",
      "Xóa bớt file trong ổ cứng để lấy chỗ",
      "Tự động thêm nhân cho CPU"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi RAM đầy, OS dùng swap: cất bớt sang ổ cứng rồi lấy lại, rất chậm.\n✓ Swap — tạm cất dữ liệu từ RAM sang ổ cứng rồi lôi ra lại — đúng, đây là việc cực chậm gây ì ạch\n✗ Tăng xung nhịp CPU gấp đôi — sai, máy không tự làm vậy\n✗ Xóa bớt file ổ cứng — sai, OS không tự xóa file của bạn\n✗ Tự thêm nhân CPU — sai, số nhân là phần cứng cố định"
  },
  {
    "id": "tech-q-010",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Máy bạn khựng khi mở nhiều tab trình duyệt, chuyển ứng dụng rất lâu, nhưng quạt KHÔNG kêu to và máy không nóng. Theo quy trình \"bắt bệnh\", thủ phạm khả năng nhất và cách xử lý đúng là?",
    "options": [
      "Thiếu RAM — đóng bớt tab/ứng dụng hoặc nâng cấp RAM",
      "CPU 100% — quét virus ngay lập tức",
      "Ổ cứng đầy — tăng xung nhịp CPU",
      "Quá nhiều chương trình khởi động — thay màn hình"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khựng khi mở nhiều tab mà máy không nóng là dấu hiệu thiếu RAM, không phải CPU quá tải.\n✓ Thiếu RAM, đóng bớt tab hoặc nâng RAM — đúng, dấu hiệu khớp với bàn làm việc hết chỗ\n✗ CPU 100% — sai, CPU quá tải thường khiến quạt kêu to và máy nóng, không khớp\n✗ Ổ cứng đầy rồi tăng xung nhịp — sai, cách xử lý không liên quan đến triệu chứng\n✗ Khởi động quá nhiều rồi thay màn hình — sai, thay màn hình không giải quyết gì"
  },
  {
    "id": "tech-q-011",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một máy laptop cũ chạy HDD rất chậm. Theo bài, cách \"hồi sinh\" hiệu quả nhất là gì?",
    "options": [
      "Nâng cấp từ HDD lên SSD",
      "Đổi sang ổ HDD dung lượng lớn hơn",
      "Giảm số nhân CPU để đỡ nóng",
      "Tăng dung lượng RAM lên hàng trăm GB"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ: nâng từ HDD lên SSD là cách hồi sinh máy cũ hiệu quả nhất.\n✓ Nâng HDD lên SSD — đúng, SSD nhanh gấp nhiều lần vì không có bộ phận chuyển động\n✗ Đổi HDD lớn hơn — sai, vẫn là HDD chậm, dung lượng không giải quyết tốc độ\n✗ Giảm nhân CPU — sai, làm máy yếu hơn\n✗ RAM hàng trăm GB — sai, RAM thường chỉ vài chục GB và không phải vấn đề ở đây"
  },
  {
    "id": "tech-q-012",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào về RAM là ĐÚNG theo bài học? (Chọn tất cả đáp án đúng)",
    "options": [
      "RAM lấy dữ liệu rất nhanh vì là chỗ để dữ liệu đang dùng ngay lúc này",
      "Tắt máy thì dữ liệu trên RAM mất hết",
      "RAM thường có dung lượng nhỏ, khoảng 8–32 GB",
      "RAM giữ dữ liệu lâu dài như tủ hồ sơ",
      "RAM nhanh hơn nên thay thế hoàn toàn được ổ cứng"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "RAM là bàn làm việc: nhanh, nhỏ, mất khi tắt máy.\n✓ RAM lấy dữ liệu rất nhanh — đúng, giấy tờ ngay trước mặt\n✓ Tắt máy mất hết — đúng, như cuối ngày dọn bàn\n✓ Dung lượng nhỏ 8–32 GB — đúng theo bài\n✗ Giữ dữ liệu lâu dài như tủ hồ sơ — sai, đó là vai trò của ổ cứng\n✗ Thay thế hoàn toàn ổ cứng — sai, RAM mất dữ liệu khi tắt máy nên không thể thay tủ hồ sơ"
  },
  {
    "id": "tech-q-013",
    "courseId": "TECH-101",
    "lesson": "pc-01-how-computers-work",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Hệ điều hành (OS) đảm nhận những vai trò nào trong bài? (Chọn tất cả đáp án đúng)",
    "options": [
      "Phân chia thời gian của CPU cho nhiều việc cùng lúc",
      "Cấp cho mỗi chương trình một góc RAM riêng",
      "Dùng driver để giao tiếp với bàn phím, chuột, máy in",
      "Cung cấp giao diện desktop, cửa sổ, biểu tượng cho người dùng",
      "Tự thực hiện trực tiếp các phép cộng và so sánh thay cho CPU"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "OS là người quản lý: điều phối CPU, RAM, thiết bị và cung cấp giao diện, nhưng không tự tính toán thay CPU.\n✓ Phân chia thời gian CPU cho nhiều việc — đúng, OS quyết việc nào làm trước, bao lâu\n✓ Cấp mỗi chương trình một góc RAM riêng — đúng theo bài\n✓ Dùng driver giao tiếp thiết bị — đúng, driver là phần mềm phiên dịch\n✓ Cung cấp giao diện desktop, cửa sổ — đúng, là bộ mặt của OS\n✗ Tự cộng và so sánh thay CPU — sai, mọi phép tính do CPU làm, OS chỉ điều phối"
  },
  {
    "id": "tech-q-014",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo cách ví von trong bài, khi bạn mở Facebook trên điện thoại để xem bảng tin, điện thoại của bạn đóng vai trò gì?",
    "options": [
      "Client (máy khách) — bên yêu cầu thông tin",
      "Server (máy chủ) — bên cung cấp thông tin",
      "Router — bên định tuyến dữ liệu",
      "DNS — bên tra cứu địa chỉ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thiết bị yêu cầu thông tin là client, giống thực khách gọi món.\n✓ Điện thoại yêu cầu \"cho tôi xem bảng tin\" nên là client.\n✗ Server là bên cung cấp/nấu món, tức máy chủ Facebook chứ không phải điện thoại bạn.\n✗ Router chỉ chuyển tiếp dữ liệu trong nhà, không phải vai trò của điện thoại.\n✗ DNS là hệ thống tra địa chỉ IP, không phải thiết bị của bạn."
  },
  {
    "id": "tech-q-015",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "DNS được ví như thứ gì trong đời thường, và nó làm nhiệm vụ gì?",
    "options": [
      "Danh bạ điện thoại — đổi tên miền dễ nhớ thành địa chỉ IP",
      "Bưu cục gia đình — gom yêu cầu rồi gửi ra ngoài",
      "Thẻ thành viên — giúp trang web nhớ bạn",
      "Két sắt — mã hoá dữ liệu cho an toàn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DNS giống danh bạ: bạn nhớ tên, nó tra ra số (IP).\n✓ DNS đổi tên miền như google.com thành địa chỉ IP, đúng vai \"danh bạ\".\n✗ Bưu cục gia đình là hình ảnh của router, không phải DNS.\n✗ Thẻ thành viên là cookie, dùng để trang web nhớ bạn.\n✗ Két sắt mã hoá là hình ảnh của HTTPS, không phải DNS."
  },
  {
    "id": "tech-q-016",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn thấy trang báo lỗi \"404 Not Found\". Theo bài, điều này thường nghĩa là gì?",
    "options": [
      "Trang đó đã bị xoá hoặc bạn gõ sai địa chỉ",
      "Server của trang đang bị lỗi nội bộ, nhà bếp \"cháy\"",
      "Yêu cầu đã thành công, nội dung đang được gửi về",
      "Wi-Fi nhà bạn đang yếu nên không tải được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "404 = Not Found, tức không tìm thấy thứ bạn yêu cầu.\n✓ Trang bị xoá hoặc gõ sai địa chỉ đúng là ý nghĩa của 404.\n✗ Lỗi server nội bộ (\"nhà bếp cháy\") là mã 500, không phải 404.\n✗ Thành công và đang gửi nội dung là mã 200 OK.\n✗ 404 là phản hồi từ server, không liên quan trực tiếp đến Wi-Fi yếu."
  },
  {
    "id": "tech-q-017",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Wi-Fi nhà bạn hiện đầy vạch nhưng không trang nào tải được. Theo bài, lời giải thích nào hợp lý nhất?",
    "options": [
      "Wi-Fi chỉ là chặng ngắn tới router; có thể đứt cáp của ISP ở chặng sau",
      "Wi-Fi đầy vạch thì chắc chắn vào được mạng, nên là do trình duyệt hỏng",
      "Cookie đã bị xoá nên không vào được bất kỳ trang nào",
      "Tên miền đã hết hạn nên toàn bộ Internet ngừng hoạt động"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Wi-Fi không phải là Internet, chỉ là đoạn từ điện thoại tới router.\n✓ Sóng Wi-Fi mạnh nhưng chặng sau (cáp ISP) đứt thì vẫn không vào mạng được.\n✗ Đầy vạch không bảo đảm vào được mạng, đó chính là hiểu lầm bài cảnh báo.\n✗ Xoá cookie chỉ khiến bị đăng xuất, không làm mất kết nối mạng.\n✗ Một tên miền hết hạn không thể làm \"toàn bộ Internet\" ngừng chạy."
  },
  {
    "id": "tech-q-018",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một người bạn dọn máy bằng cách \"xoá cookie\" rồi than rằng mọi trang web đều bắt đăng nhập lại. Vì sao?",
    "options": [
      "Xoá cookie giống vứt hết thẻ thành viên — mọi trang coi bạn là khách lạ",
      "Xoá cookie làm hỏng DNS nên không tra được địa chỉ IP",
      "Xoá cookie ngắt kết nối Wi-Fi với router",
      "Xoá cookie xoá luôn mã HTTPS nên trang từ chối phục vụ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cookie là \"thẻ thành viên\" giúp trang nhớ bạn đã đăng nhập.\n✓ Vứt thẻ đi thì mọi quán coi bạn là khách lạ, phải đăng nhập lại từ đầu.\n✗ Cookie và DNS là hai thứ khác nhau, xoá cookie không hỏng việc tra IP.\n✗ Cookie không liên quan đến sóng Wi-Fi giữa điện thoại và router.\n✗ HTTPS là mã hoá đường truyền, không bị ảnh hưởng bởi việc xoá cookie."
  },
  {
    "id": "tech-q-019",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn sắp gõ mật khẩu ngân hàng vào một trang. Theo bài, cách kiểm tra an toàn ĐÚNG là gì?",
    "options": [
      "Phải có HTTPS, RỒI kiểm tra tên miền có viết đúng từng chữ không",
      "Chỉ cần thấy ổ khoá 🔒 là chắc chắn trang đáng tin tuyệt đối",
      "Chỉ cần tên miền nghe quen là đủ, không cần để ý ổ khoá",
      "Chỉ cần trang tải nhanh là an toàn để nhập mật khẩu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ổ khoá chỉ niêm phong đường truyền, không bảo chứng trang là thật.\n✓ Cần có HTTPS và sau đó soi kỹ tên miền có chính xác từng chữ không.\n✗ Trang lừa đảo vẫn có thể có ổ khoá, nên ổ khoá không đồng nghĩa đáng tin tuyệt đối.\n✗ Tên miền giả như vietc0mbank-xacthuc.xyz nghe quen nhưng vẫn là giả; phải soi kỹ.\n✗ Tốc độ tải nhanh không liên quan gì đến an toàn của trang."
  },
  {
    "id": "tech-q-020",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn nhập mật khẩu trên một trang chỉ dùng HTTP thường (không có ổ khoá), khi đang ngồi quán cà phê chung Wi-Fi với nhiều người. Rủi ro lớn nhất là gì?",
    "options": [
      "Dữ liệu như bưu thiếp trần — kẻ xấu chung mạng có thể nhìn trộm mật khẩu",
      "Dữ liệu được mã hoá nên không ai đọc được, hoàn toàn an toàn",
      "Trang sẽ tự động chuyển sang HTTPS nên không cần lo",
      "Router sẽ chặn không cho gửi mật khẩu đi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "HTTP thường giống bưu thiếp không phong bì, ai cũng đọc được nội dung.\n✓ Kẻ xấu chung Wi-Fi có thể nhìn trộm mật khẩu vì dữ liệu không được mã hoá.\n✗ Chỉ HTTPS mới mã hoá; HTTP thường thì không, nên không an toàn.\n✗ HTTP không tự biến thành HTTPS; phải là trang có hỗ trợ HTTPS.\n✗ Router không có nhiệm vụ chặn mật khẩu; nó chỉ chuyển tiếp dữ liệu."
  },
  {
    "id": "tech-q-021",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong câu chuyện \"gõ URL rồi nhấn Enter\", bước nào diễn ra ĐẦU TIÊN?",
    "options": [
      "Trình duyệt hỏi DNS xem tên miền ứng với địa chỉ IP nào",
      "Server đóng gói nội dung và gửi response về",
      "Trình duyệt vẽ trang web lên màn hình",
      "Server trả mã 200 OK kèm nội dung trang"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thứ tự là: Tra (DNS) trước, rồi Gửi, Xử, Nhận, Vẽ.\n✓ Bước đầu là tra DNS để đổi tên miền thành IP rồi mới kết nối được.\n✗ Server đóng gói và gửi response xảy ra sau khi đã nhận được request.\n✗ Trình duyệt vẽ trang là bước cuối cùng, sau khi nhận đủ dữ liệu.\n✗ Mã 200 OK nằm trong response, tức ở giai đoạn sau, không phải đầu tiên."
  },
  {
    "id": "tech-q-022",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một trang web cụ thể tải rất chậm, trong khi mọi trang khác trên máy bạn vẫn nhanh bình thường. Theo mẹo trong bài, nhiều khả năng lỗi nằm ở đâu?",
    "options": [
      "Ở server của chính trang đó (có thể đang quá tải)",
      "Ở Wi-Fi nhà bạn quá yếu",
      "Ở ISP đang đứt cáp quang biển",
      "Ở DNS không tra được địa chỉ IP nào"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Nếu chỉ một trang chậm còn các trang khác vẫn nhanh thì lỗi ở trang đó.\n✓ Server của trang đó quá tải là nguyên nhân hợp lý vì máy bạn vẫn vào trang khác tốt.\n✗ Wi-Fi yếu sẽ làm MỌI trang chậm, không chỉ một trang.\n✗ ISP đứt cáp cũng ảnh hưởng toàn bộ kết nối, không riêng một trang.\n✗ DNS lỗi thường khiến không vào được trang chứ không phải chỉ riêng một trang chậm trong khi các trang khác bình thường."
  },
  {
    "id": "tech-q-023",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bài giải thích vì sao server cần cookie. Lý do gốc rễ là gì?",
    "options": [
      "Sau mỗi lượt hỏi–đáp HTTP, server \"quên\" bạn ngay, nên cần cookie để nhớ lại",
      "HTTP không thể gửi hình ảnh nên cần cookie để tải ảnh",
      "Cookie giúp tăng tốc độ Wi-Fi giữa điện thoại và router",
      "Cookie thay thế cho DNS khi tra cứu địa chỉ IP"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Server \"đãng trí\": xong mỗi lượt HTTP là quên bạn, cookie giúp nhận lại bạn.\n✓ Vì server quên sau mỗi lượt, cookie là mẩu ghi chú giúp nó nhớ bạn đã đăng nhập.\n✗ HTTP vẫn gửi được hình ảnh; cookie không liên quan đến việc tải ảnh.\n✗ Cookie không tác động đến tốc độ sóng Wi-Fi.\n✗ Cookie không thay thế DNS; hai thứ làm hai việc hoàn toàn khác nhau."
  },
  {
    "id": "tech-q-024",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài, những phát biểu nào về HTTPS và ổ khoá 🔒 là ĐÚNG?",
    "options": [
      "HTTPS mã hoá dữ liệu nên kẻ chặn giữa đường chỉ thấy ký tự lộn xộn",
      "HTTPS có chứng chỉ như \"căn cước\" xác nhận trang đúng là trang thật",
      "Có ổ khoá nghĩa là trang chắc chắn không lừa đảo",
      "Trang lừa đảo cũng có thể có ổ khoá",
      "Chữ S trong HTTPS nghĩa là Speed (tốc độ)"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "HTTPS niêm phong đường truyền và xác thực danh tính, nhưng không bảo chứng trang là tử tế.\n✓ HTTPS mã hoá nên kẻ chặn giữa đường chỉ thấy chuỗi ký tự vô nghĩa.\n✓ Chứng chỉ HTTPS như căn cước, xác nhận trang đúng là trang thật.\n✓ Trang lừa đảo vẫn có thể có ổ khoá vì kẻ trộm cũng niêm phong được thư của hắn.\n✗ Có ổ khoá KHÔNG bảo đảm trang không lừa đảo; còn phải soi tên miền.\n✗ Chữ S là Secure (an toàn), không phải Speed."
  },
  {
    "id": "tech-q-025",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi dữ liệu của một trang web được gửi về máy bạn (bước HTTP Response), những điều nào sau đây ĐÚNG theo bài?",
    "options": [
      "Dữ liệu được chia thành nhiều gói nhỏ",
      "Các gói nhỏ có thể đi theo những đường khác nhau rồi được ráp lại ở máy bạn",
      "Một trang web thường là kết quả của hàng chục, hàng trăm lượt hỏi–đáp",
      "Toàn bộ trang luôn được gửi nguyên khối trong đúng một gói duy nhất",
      "Trình duyệt chỉ hiển thị dữ liệu thô, không cần dựng lại thành trang"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Dữ liệu được chia gói, đi nhiều đường, ráp lại; mỗi trang gồm nhiều lượt hỏi–đáp.\n✓ Dữ liệu được chia thành hàng nghìn gói nhỏ khi gửi.\n✓ Mỗi gói có thể đi đường khác nhau rồi được ráp lại ở máy bạn.\n✓ Mỗi tấm hình, đoạn chữ là một lượt riêng nên một trang gồm rất nhiều lượt hỏi–đáp.\n✗ Trang không được gửi nguyên khối trong một gói; nó bị chia nhỏ.\n✗ Trình duyệt phải dựng (vẽ) dữ liệu thành trang, không chỉ hiển thị thô."
  },
  {
    "id": "tech-q-026",
    "courseId": "TECH-101",
    "lesson": "pc-02-how-internet-works",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Kẻ lừa đảo lợi dụng sự khác nhau giữa thanh địa chỉ và ô tìm kiếm của Google như thế nào, theo bài?",
    "options": [
      "Ô tìm kiếm chỉ tìm trang \"nói về\" từ khoá, nên kẻ xấu chèn trang giả mạo vào kết quả để dụ bấm",
      "Thanh địa chỉ luôn đưa bạn tới trang giả nên không nên dùng",
      "Ô tìm kiếm tự động mã hoá nên kém an toàn hơn thanh địa chỉ",
      "Thanh địa chỉ và ô tìm kiếm là hoàn toàn giống nhau, không có khác biệt"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thanh địa chỉ đưa bạn thẳng đến trang; ô tìm kiếm chỉ liệt kê các trang nói về từ khoá.\n✓ Vì ô tìm kiếm chỉ trả về trang \"nói về\" từ khoá, kẻ xấu chèn trang giả vào kết quả để dụ bạn bấm.\n✗ Thanh địa chỉ đưa bạn THẲNG tới trang bạn gõ, không phải tới trang giả.\n✗ Sự khác biệt nằm ở cách hoạt động, không phải ở chuyện mã hoá.\n✗ Bài nhấn mạnh hai thứ này KHÁC nhau, không hề giống nhau."
  },
  {
    "id": "tech-q-027",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, nếu một chiếc điện thoại bị xóa hết toàn bộ phần mềm thì nó sẽ trở thành gì?",
    "options": [
      "Một thiết bị vẫn chạy bình thường vì phần cứng tự suy nghĩ được",
      "Một cục kim loại đẹp đẽ nhưng vô dụng",
      "Một chiếc máy chỉ chạy được app web",
      "Một server phục vụ máy khác"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Phần cứng là cơ thể, phần mềm là suy nghĩ; không có phần mềm thì máy không biết làm gì.\n✓ Không có \"bản hướng dẫn\", máy chỉ là cục kim loại vô dụng.\n✗ Phần cứng không tự nghĩ được, nó chỉ làm đúng những gì được dặn.\n✗ App web vẫn cần phần mềm (trình duyệt, hệ điều hành) để chạy.\n✗ Server cũng phải có phần mềm mới phục vụ được."
  },
  {
    "id": "tech-q-028",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một người dùng muốn dùng cùng một dịch vụ trên nhiều máy lạ khác nhau (máy ở quán net, máy mượn bạn) mà không phải cài đặt gì. Loại app nào phù hợp nhất?",
    "options": [
      "App desktop",
      "App web",
      "App mobile",
      "Phần mềm đóng"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "App web chạy trong trình duyệt, gõ địa chỉ là dùng được trên bất kỳ máy nào.\n✓ App web không cần cài đặt, dùng được trên mọi máy có trình duyệt.\n✗ App desktop phải tải về và cài, cài máy nào chỉ dùng máy đó.\n✗ App mobile phải cài lên điện thoại qua cửa hàng app.\n✗ \"Phần mềm đóng\" là cách phân phối mã nguồn, không phải kiểu app theo nơi chạy."
  },
  {
    "id": "tech-q-029",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn vào Facebook bằng Chrome trên máy tính, rồi mở app Facebook trên điện thoại. Vì sao bạn thấy CÙNG bạn bè và tin nhắn ở cả hai nơi?",
    "options": [
      "Vì Chrome và app tự đồng bộ dữ liệu trực tiếp với nhau",
      "Vì dữ liệu nằm chung một nơi phía sau, trên server",
      "Vì đó thực ra là hai dịch vụ khác nhau nhưng trùng tên",
      "Vì điện thoại sao chép dữ liệu từ máy tính qua Bluetooth"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "App web và app mobile chỉ là \"cửa ra vào\" khác nhau của cùng một dịch vụ; dữ liệu nằm chung trên server.\n✓ Bạn bè, tin nhắn nằm ở một nơi chung phía sau (server), nên cửa nào vào cũng thấy.\n✗ Hai cửa vào không tự nói chuyện trực tiếp; chúng cùng lấy từ server.\n✗ Đây là cùng một dịch vụ, chỉ khác cách truy cập.\n✗ Không có chuyện chép qua Bluetooth; dữ liệu lấy từ server qua Internet."
  },
  {
    "id": "tech-q-030",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khi bạn bấm \"Đăng nhập\" trên app ngân hàng, việc KIỂM TRA mật khẩu đúng hay sai và tra số dư diễn ra ở đâu?",
    "options": [
      "Ở frontend, ngay trên điện thoại của bạn",
      "Ở backend, trên server của ngân hàng",
      "Ở trình duyệt Chrome",
      "Ở thẻ SIM của điện thoại"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Frontend gửi thông tin đi, còn backend trên server mới là nơi xử lý thật sự.\n✓ Backend (máy chủ ngân hàng) kiểm tra mật khẩu, tra số dư rồi trả kết quả về.\n✗ Frontend chỉ thu thập và hiển thị, không tự kiểm tra mật khẩu của ngân hàng.\n✗ Trình duyệt chỉ là nơi chạy giao diện, không giữ logic của ngân hàng.\n✗ Thẻ SIM dùng cho mạng di động, không xử lý đăng nhập ngân hàng."
  },
  {
    "id": "tech-q-031",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, \"server\" thực chất là gì?",
    "options": [
      "Một phần mềm đặc biệt lơ lửng trên Internet",
      "Một chiếc máy tính bình thường nhưng khỏe hơn, chạy 24/7 để phục vụ nhiều máy khách",
      "Một thiết bị chỉ có ở nhà người dùng",
      "Một loại điện thoại không màn hình"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Server là máy tính khỏe, không màn hình, bật suốt ngày đêm, đặt trong data center để phục vụ máy khách.\n✓ Đúng định nghĩa server: máy khỏe hơn, bật 24/7, phục vụ triệu máy khách.\n✗ Server là phần cứng máy tính thật, không phải thứ lơ lửng.\n✗ Server đặt trong data center chuyên dụng, không phải ở nhà người dùng.\n✗ Server không phải điện thoại; nó là máy tính phục vụ."
  },
  {
    "id": "tech-q-032",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chụp một tấm ảnh và lưu trong bộ nhớ điện thoại (không bật sao lưu cloud). Hôm sau mất điện thoại. Điều gì xảy ra với tấm ảnh, và vì sao?",
    "options": [
      "Vẫn còn, vì ảnh tự lưu trong database trên server",
      "Mất luôn, vì ảnh lưu cục bộ trong máy chứ không nằm trên server",
      "Vẫn còn, vì mọi ảnh đều tự lên cloud",
      "Mất luôn, vì frontend đã xóa ảnh khi tắt máy"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Ảnh lưu trong bộ nhớ máy là lưu cục bộ; mất máy là mất ảnh, khác với dữ liệu nằm trong database trên server.\n✓ Ảnh lưu cục bộ trong máy nên mất máy là mất ảnh.\n✗ Ảnh chỉ vào database server nếu được sao lưu lên cloud, mà ở đây thì không.\n✗ Không phải mọi ảnh đều tự lên cloud; cần bật sao lưu.\n✗ Frontend không tự xóa ảnh khi tắt máy."
  },
  {
    "id": "tech-q-033",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "App thời tiết trên điện thoại bạn hiển thị \"Hà Nội 31 độ, có mưa rào\". Theo bài, app lấy con số này từ đâu?",
    "options": [
      "App tự đo nhiệt độ bằng cảm biến của điện thoại",
      "App gọi API của một dịch vụ khí tượng để hỏi xin dữ liệu",
      "App đoán dựa trên lịch sử thời tiết lưu trong máy",
      "Người dùng phải tự nhập số liệu vào app"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "App không tự đo thời tiết; nó gọi API của một dịch vụ khí tượng để nhận dữ liệu.\n✓ App \"gọi món\" qua API của dịch vụ khí tượng và nhận về kết quả.\n✗ App không tự đo thời tiết bằng cảm biến điện thoại.\n✗ Không phải đoán từ lịch sử trong máy; dữ liệu đến từ dịch vụ ngoài.\n✗ Người dùng không phải tự nhập nhiệt độ."
  },
  {
    "id": "tech-q-034",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo analogy nhà hàng trong bài, API (người phục vụ) giúp được những điều nào sau đây? (Chọn tất cả đáp án đúng)",
    "options": [
      "Cho phép frontend gọi dịch vụ của backend mà không cần biết \"công thức trong bếp\"",
      "Cho phép một phần mềm dùng dịch vụ của phần mềm khác theo mẫu chuẩn",
      "Thay thế hoàn toàn database nên backend không cần lưu trữ gì",
      "Là cách chuẩn để hai phần mềm nói chuyện với nhau",
      "Tự nấu món ăn thay cho bếp khi bếp quá tải"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "API là người phục vụ + thực đơn chuẩn: nhận đơn theo mẫu và chuyển qua lại, không thay vai trò của bếp hay kho.\n✓ Khách không cần biết bếp nấu thế nào, chỉ gọi món qua API.\n✓ API cho phép phần mềm dùng dịch vụ của nhau theo mẫu chuẩn.\n✓ API chính là cách chuẩn để hai phần mềm nói chuyện.\n✗ API không thay thế database; backend vẫn lưu dữ liệu trong database.\n✗ API không tự nấu món; việc xử lý là của backend (bếp)."
  },
  {
    "id": "tech-q-035",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "\"Lưu ảnh lên iCloud / Google Photos\" thực ra có nghĩa là gì, theo nghĩa vật lý?",
    "options": [
      "Ảnh bay lơ lửng trên bầu trời",
      "Ảnh nằm trên server thuê của Apple/Google trong data center thật",
      "Ảnh được nén lại và giấu trong bộ nhớ điện thoại",
      "Ảnh bị xóa khỏi mọi nơi để tiết kiệm chỗ"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Cloud chỉ là máy tính của người khác; ảnh nằm trên server thật trong data center thật.\n✓ Ảnh nằm trên server thuê của Apple/Google, đặt trong data center thật.\n✗ \"Đám mây\" không phải thứ lơ lửng trên trời.\n✗ Ảnh lên cloud nằm trên server, không phải giấu trong máy.\n✗ Lưu cloud là giữ ảnh trên server, không phải xóa đi."
  },
  {
    "id": "tech-q-036",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một quán nhỏ mới mở app bán hàng, ngày thường rất ít khách nhưng ngày sale lượng truy cập tăng gấp 100 lần trong vài giờ. Vì sao dùng cloud là lựa chọn hợp lý hơn tự mua server?",
    "options": [
      "Vì cloud miễn phí hoàn toàn nên không tốn đồng nào",
      "Vì cloud co giãn được: vặn vòi to lên khi đông, vặn nhỏ lại khi vắng, trả theo mức dùng",
      "Vì tự mua server sẽ luôn nhanh hơn cloud trong mọi trường hợp",
      "Vì cloud không cần Internet nên ổn định hơn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Cloud là thuê máy trả theo mức dùng và co giãn nhanh, hợp với nhu cầu lên xuống thất thường.\n✓ Cloud co giãn trong vài phút và trả theo mức dùng, hợp với đợt sale tăng đột biến.\n✗ Cloud không miễn phí; bạn trả theo mức dùng (vài trăm nghìn/tháng khi nhỏ).\n✗ Tự mua server không phải lúc nào cũng nhanh hơn, và lãng phí khi vắng khách.\n✗ Cloud truy cập qua Internet, không phải không cần Internet."
  },
  {
    "id": "tech-q-037",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, những phát biểu nào về phần mềm open source là ĐÚNG? (Chọn tất cả đáp án đúng)",
    "options": [
      "Mã nguồn được công khai, ai cũng xem và đóng góp cải tiến được",
      "Open source luôn kém chất lượng vì miễn phí",
      "Linux (chạy đa số server) và nền của Android là ví dụ open source",
      "Chỉ công ty sở hữu mới được sửa lỗi",
      "Nhiều người cùng soi mã nguồn nên lỗi khó trốn"
    ],
    "correctIndices": [
      0,
      2,
      4
    ],
    "explanation": "Open source công khai mã nguồn, để cộng đồng cùng soi và cải tiến; nhiều phần mềm quan trọng nhất thế giới là open source.\n✓ Mã nguồn công khai, ai cũng xem và đóng góp được.\n✓ Linux và nền của Android đúng là ví dụ open source nổi tiếng.\n✓ Nhiều con mắt cùng soi thì lỗi khó trốn.\n✗ Open source không đồng nghĩa kém chất lượng; ngược lại là khác.\n✗ Việc \"chỉ công ty sở hữu được sửa\" là đặc điểm của phần mềm đóng."
  },
  {
    "id": "tech-q-038",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Ghép các vai trò: trong luồng bấm \"Đặt hàng\", phần nào ghi đơn hàng lại để mai mốt bạn tra \"lịch sử đơn hàng\" vẫn còn thấy?",
    "options": [
      "Frontend lưu vào màn hình xác nhận",
      "API giữ lại bản sao đơn",
      "Backend ghi đơn vào database",
      "Trình duyệt lưu vào lịch sử web"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Database là nơi lưu trữ dữ liệu lâu dài, có tổ chức; backend ghi đơn vào đó.\n✓ Backend ghi đơn hàng vào database nên sau này tra lịch sử vẫn còn.\n✗ Frontend chỉ hiển thị màn hình xác nhận, không lưu lâu dài.\n✗ API chỉ chuyển lời qua lại, không phải nơi lưu trữ.\n✗ Lịch sử trình duyệt là chuyện riêng của máy bạn, không phải lịch sử đơn hàng của dịch vụ."
  },
  {
    "id": "tech-q-039",
    "courseId": "TECH-101",
    "lesson": "pc-03-software-types",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một nhóm muốn làm app đặt lịch cần TẬN DỤNG camera để quét mã QR và GPS để xác định vị trí khách. Theo bài, kiểu app nào phù hợp nhất với yêu cầu này?",
    "options": [
      "App web, vì chạy trong trình duyệt nên dùng camera/GPS tốt nhất",
      "App desktop, vì mạnh và chạy offline",
      "App mobile, vì tận dụng tốt camera, GPS và thao tác chạm",
      "Phần mềm open source, vì miễn phí"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "App mobile được tối ưu để tận dụng tính năng riêng của điện thoại như camera, GPS, thông báo đẩy.\n✓ App mobile dùng camera, GPS rất tốt, hợp yêu cầu quét QR và định vị.\n✗ App web bị hạn chế với camera/GPS, không phải lựa chọn tốt nhất.\n✗ App desktop mạnh nhưng dùng camera/GPS hạn chế và không tiện mang theo.\n✗ Open source là cách phân phối mã nguồn, không quyết định việc dùng camera/GPS."
  },
  {
    "id": "tech-q-040",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một thông điệp cốt lõi của bài học về ngành tech là gì?",
    "options": [
      "Muốn vào ngành tech thì bắt buộc phải biết viết code",
      "Ngành tech chỉ dành cho người giỏi toán",
      "Một sản phẩm tech là công sức của cả đội nhiều vai trò, không chỉ lập trình viên",
      "Chỉ có một con đường duy nhất để vào ngành tech"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Bài ví ngành tech như một nhà hàng lớn, mỗi người một việc, và bạn có thể vào ngành qua nhiều cánh cửa khác nhau.\n✓ Một sản phẩm là công sức của cả đội nhiều vai trò: đúng tinh thần bài học.\n✗ Bắt buộc phải biết code: sai, có nhiều nghề như PM/BA, Designer gần như không viết code.\n✗ Chỉ dành cho người giỏi toán: sai, hầu hết nghề chỉ cần tư duy logic.\n✗ Chỉ có một con đường duy nhất: sai, có nhiều cánh cửa vào ngành."
  },
  {
    "id": "tech-q-041",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Khi bạn bấm nút 'Đặt món' và đơn hàng được lưu lại, tiền được tính, mã giảm giá được kiểm tra — phần xử lý 'hậu trường' này thuộc về ai?",
    "options": [
      "Frontend Developer",
      "Backend Developer",
      "Designer",
      "QA/Tester"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Backend là mọi thứ chạy phía sau mà người dùng không nhìn thấy: lưu đơn hàng, tính tiền, kiểm tra mã giảm giá.\n✓ Backend Developer: đúng, lo phần 'nhà bếp' hậu trường.\n✗ Frontend Developer: làm phần người dùng nhìn thấy và chạm vào, không lo lưu trữ tính toán.\n✗ Designer: chỉ vẽ giao diện, không viết code xử lý.\n✗ QA/Tester: kiểm tra phần mềm, không xây phần xử lý."
  },
  {
    "id": "tech-q-042",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Lộ trình của khoá học này được thiết kế chủ yếu cho hướng nghề nào?",
    "options": [
      "Frontend và Designer",
      "Data Scientist và AI",
      "Backend và Cloud/DevOps (AWS)",
      "Mobile Developer"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Bài nói rõ lộ trình trang web đi theo hướng Backend và Cloud/DevOps, tiến tới AWS và các chứng chỉ AWS.\n✓ Backend và Cloud/DevOps (AWS): đúng hướng của khoá học.\n✗ Frontend và Designer: không phải hướng chính của khoá.\n✗ Data Scientist và AI: là nghề cần toán nhiều, không phải hướng khoá này.\n✗ Mobile Developer: không phải hướng của khoá học."
  },
  {
    "id": "tech-q-043",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một người bạn nói: 'Mình thích cái đẹp, tỉ mỉ về giao diện, và muốn thấy ngay kết quả công sức của mình hiện ra trên màn hình.' Nghề lập trình nào hợp nhất?",
    "options": [
      "Backend Developer",
      "Frontend Developer",
      "DevOps/Cloud Engineer",
      "Data Engineer"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Frontend làm phần người dùng nhìn thấy, hợp người thích cái đẹp, tỉ mỉ giao diện, muốn thấy kết quả ngay trên màn hình.\n✓ Frontend Developer: đúng mô tả tính cách phù hợp.\n✗ Backend Developer: hợp người thích logic, giải đố, không quá quan tâm đẹp xấu.\n✗ DevOps/Cloud Engineer: không cần khiếu thẩm mỹ, không làm giao diện.\n✗ Data Engineer: làm đường ống dữ liệu, không liên quan giao diện."
  },
  {
    "id": "tech-q-044",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong app đặt đồ ăn, ai chịu trách nhiệm đảm bảo hệ thống chạy ổn định khi 1 triệu người cùng đặt món lúc 12h trưa?",
    "options": [
      "Data Analyst",
      "DevOps/Cloud Engineer",
      "PM/BA",
      "Frontend Developer"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "DevOps/Cloud Engineer đảm bảo phần mềm chạy ổn định ngoài đời thật, lo việc nhà không sập khi đông khách kéo đến cùng lúc.\n✓ DevOps/Cloud Engineer: đúng, giữ hệ thống ổn định khi tải cao.\n✗ Data Analyst: phân tích số liệu, không vận hành hệ thống.\n✗ PM/BA: quyết định làm gì tiếp, không lo vận hành kỹ thuật.\n✗ Frontend Developer: làm giao diện, không lo chịu tải hệ thống."
  },
  {
    "id": "tech-q-045",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một công ty thay vì tự mua máy chủ về đặt trong văn phòng thì thuê máy chủ qua Internet từ AWS, trả tiền theo lượng dùng. Cách làm này được gọi là gì?",
    "options": [
      "Dùng cloud (điện toán đám mây)",
      "Viết automation test",
      "Thiết kế UX",
      "Xây pipeline tự động"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cloud là thuê máy chủ qua Internet từ AWS, Google Cloud, Azure, trả tiền theo lượng dùng — giống dùng nước máy thay vì tự đào giếng.\n✓ Dùng cloud: đúng mô tả thuê máy chủ trả theo lượng dùng.\n✗ Viết automation test: là việc kiểm thử tự động của QA.\n✗ Thiết kế UX: là trải nghiệm người dùng của Designer.\n✗ Xây pipeline tự động: là dây chuyền tự động đưa code lên, không phải định nghĩa thuê máy chủ."
  },
  {
    "id": "tech-q-046",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một người trái ngành giỏi giao tiếp, thích con số và đặt câu hỏi 'tại sao' nhưng ngại viết nhiều code. Đâu là hai cửa vào ngành tech được bài học gợi ý là 'mềm' / phổ biến cho người trái ngành?",
    "options": [
      "Backend Developer và Mobile Developer",
      "Data Analyst và QA/Tester",
      "Data Scientist và DevOps",
      "Frontend Developer và Designer"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bài nói Data Analyst là cửa vào khá 'mềm' cho người trái ngành (ít code nhất), và QA/Tester cũng là cửa vào phổ biến cho người trái ngành.\n✓ Data Analyst và QA/Tester: đúng, cả hai đều được nêu là cửa vào cho người trái ngành.\n✗ Backend Developer và Mobile Developer: đều bắt buộc biết code.\n✗ Data Scientist và DevOps: Data Scientist cần toán nhiều nhất, không 'mềm'.\n✗ Frontend Developer và Designer: không được nêu là cửa vào cho người trái ngành theo cách này."
  },
  {
    "id": "tech-q-047",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bài học khuyên người mới điều gì về việc trở thành Fullstack Developer?",
    "options": [
      "Nên đặt mục tiêu fullstack ngay từ đầu vì nghe 'xịn'",
      "Không nên đặt mục tiêu fullstack ngay; hãy giỏi một mảng trước",
      "Fullstack chỉ cần biết frontend là đủ",
      "Fullstack là nghề không cần viết code"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bài nói đa số fullstack dev mạnh một bên, biết đủ dùng bên còn lại; người mới nên giỏi một mảng trước.\n✓ Không nên fullstack ngay, giỏi một mảng trước: đúng lời khuyên của bài.\n✗ Đặt mục tiêu fullstack ngay từ đầu: sai, đi ngược lời khuyên.\n✗ Chỉ cần biết frontend: sai, fullstack là frontend + backend.\n✗ Không cần viết code: sai, fullstack vẫn là nghề lập trình."
  },
  {
    "id": "tech-q-048",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn tâm sự: 'Em muốn học tech nhưng tiếng Anh em còn yếu, để em luyện tiếng Anh thật giỏi rồi mới bắt đầu học.' Theo bài học, phản hồi đúng nhất là gì?",
    "options": [
      "Đúng rồi, phải giỏi tiếng Anh nói trôi chảy trước đã",
      "Sai thứ tự — cứ học tech bằng tiếng Việt trước, gặp thuật ngữ Anh thì nhặt dần",
      "Tiếng Anh không cần thiết chút nào trong ngành tech",
      "Phải học cả nghe nói trôi chảy ngay từ đầu mới làm được"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bài cảnh báo lỗi người mới hay gặp là trì hoãn học tech 'chờ giỏi tiếng Anh đã' — đó là sai thứ tự; nên học tech trước, nhặt thuật ngữ Anh dần.\n✓ Sai thứ tự, học tech bằng tiếng Việt trước: đúng lời khuyên của bài.\n✗ Phải giỏi tiếng Anh nói trôi chảy trước: sai, nghe nói chưa cần ngay.\n✗ Tiếng Anh không cần thiết chút nào: sai, đọc hiểu là bắt buộc.\n✗ Phải học nghe nói trôi chảy ngay từ đầu: sai, chỉ cần đọc hiểu trước."
  },
  {
    "id": "tech-q-049",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một người lo lắng: 'Em sợ chọn sai nghề nên định học mỗi nghề một ít cho chắc.' Theo bài học, đây là vấn đề gì và nên làm sao?",
    "options": [
      "Cách làm đúng, nên học dàn trải để biết hết",
      "Đây là lỗi hay gặp; nên chọn MỘT hướng, đi sâu 6-12 tháng rồi mới tính rẽ nhánh",
      "Nên học cả 8 nghề cùng lúc trong 1 tháng",
      "Sợ chọn sai là vô lý vì mọi nghề đều giống nhau"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bài nêu lỗi học dàn trải 'mỗi nghề một ít' dẫn tới biết mỗi thứ một chút, không đủ sâu để xin việc; nên chọn một hướng đi sâu 6-12 tháng.\n✓ Chọn MỘT hướng, đi sâu 6-12 tháng: đúng lời khuyên của bài.\n✗ Học dàn trải để biết hết: sai, đó chính là lỗi bài cảnh báo.\n✗ Học cả 8 nghề trong 1 tháng: sai, càng dàn trải hơn.\n✗ Mọi nghề đều giống nhau: sai, mỗi nghề có tính cách phù hợp khác nhau."
  },
  {
    "id": "tech-q-050",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong các nghề sau, nghề nào là nghề DUY NHẤT mà bài học nói cần 'toán thật sự' (xác suất thống kê, đại số tuyến tính)?",
    "options": [
      "Backend Developer",
      "DevOps/Cloud Engineer",
      "Data Scientist / AI",
      "Frontend Developer"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Bài nói Data Scientist/AI mới là nghề cần toán thật: xác suất thống kê, đại số tuyến tính; các nghề còn lại chủ yếu cần logic.\n✓ Data Scientist / AI: đúng, nghề cần toán cao cấp.\n✗ Backend Developer: chỉ cần logic tốt và chút toán rời rạc, không cần giải tích.\n✗ DevOps/Cloud Engineer: chỉ cần toán ít.\n✗ Frontend Developer: toán cấp 2 là đủ."
  },
  {
    "id": "tech-q-051",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bảng tổng kết của bài, những nghề nào KHÔNG bắt buộc biết code (ít nhất là khi mới bắt đầu)? (Chọn tất cả đáp án đúng)",
    "options": [
      "PM/BA",
      "Designer",
      "QA/Tester (giai đoạn đầu)",
      "Backend Developer",
      "Mobile Developer"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bảng tổng kết: PM/BA và Designer cột 'cần code' là 'Không'; QA/Tester là 'Ban đầu không'.\n✓ PM/BA: gần như không viết code.\n✓ Designer: không cần code.\n✓ QA/Tester giai đoạn đầu: manual tester ban đầu không bắt buộc biết code.\n✗ Backend Developer: bắt buộc biết code.\n✗ Mobile Developer: bắt buộc biết code."
  },
  {
    "id": "tech-q-052",
    "courseId": "TECH-101",
    "lesson": "pc-04-roles-in-tech",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Bài học đưa ra những lý do nào khiến hướng Backend/Cloud (AWS) đáng đi với người mới trái ngành? (Chọn tất cả đáp án đúng)",
    "options": [
      "Nhu cầu tuyển dụng lớn và bền vì công ty nào lên cloud cũng cần người",
      "Có chứng chỉ AWS làm 'bằng chứng' năng lực thay cho bằng cấp IT",
      "Không đòi hỏi khiếu thẩm mỹ, hợp người thích logic, hệ thống",
      "Là nghề cần toán cao cấp nhất nên lương chắc chắn cao nhất",
      "Kiến thức nền (máy tính, Internet, server) dùng được cho nhiều nghề"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "Bài nêu 4 lý do: nhu cầu lớn và bền, có chứng chỉ làm bằng chứng, không cần khiếu thẩm mỹ, và kiến thức nền dùng chung cho nhiều nghề.\n✓ Nhu cầu tuyển dụng lớn và bền: đúng, lý do 1.\n✓ Có chứng chỉ AWS làm bằng chứng: đúng, lý do 2.\n✓ Không đòi hỏi khiếu thẩm mỹ: đúng, lý do 3.\n✓ Kiến thức nền dùng cho nhiều nghề: đúng, lý do 4.\n✗ Cần toán cao cấp nhất nên lương cao nhất: sai, Backend/Cloud chỉ cần toán ít, đây không phải lý do bài đưa ra."
  },
  {
    "id": "tech-q-053",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn cần một phần mềm để viết và chỉnh sửa code (giống Word nhưng dành cho lập trình). Theo bài, công cụ nào đúng vai trò này?",
    "options": [
      "VS Code",
      "Terminal",
      "Git",
      "DevTools"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "VS Code là trình soạn thảo mã nguồn, được ví như cuốn sổ tay thông minh để viết code.\n✓ Trình soạn thảo mã nguồn dùng để soạn và chỉnh sửa code chính là công cụ đúng.\n✗ Cửa sổ ra lệnh cho máy bằng chữ dùng để điều khiển máy, không phải để viết code.\n✗ Cỗ máy thời gian cho file dùng để lưu lịch sử thay đổi, không phải để soạn thảo.\n✗ Kính hiển vi soi trang web dùng để xem bên trong trang web, không phải để viết code."
  },
  {
    "id": "tech-q-054",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Khi cài VS Code, một bạn mới vô tình tải về phần mềm tên 'Visual Studio' (không có chữ 'Code') nặng cả chục GB. Điều gì đã xảy ra?",
    "options": [
      "Tải nhầm phần mềm khác, không phải trình soạn thảo VS Code cần dùng",
      "Đó chính là VS Code, chỉ là bản đầy đủ hơn",
      "Đó là bản VS Code dành cho máy yếu",
      "Đó là bản VS Code đã kèm sẵn Python"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Visual Studio (không có 'Code') là một phần mềm hoàn toàn khác, nặng cả chục GB, dùng cho mục đích khác.\n✓ Đây là trường hợp tải nhầm; cần đảm bảo trang web là code.visualstudio.com và tên là Visual Studio Code.\n✗ Đây không phải cùng một phần mềm; chúng khác nhau hoàn toàn.\n✗ Bài không nói đây là bản cho máy yếu; nó chỉ là phần mềm khác.\n✗ Bài không nói nó kèm sẵn Python; Python được cài riêng."
  },
  {
    "id": "tech-q-055",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trên macOS, sau khi giải nén file VS Code, bạn nên làm gì với biểu tượng Visual Studio Code?",
    "options": [
      "Kéo nó vào thư mục Applications rồi mới mở",
      "Chạy thẳng từ thư mục Downloads cho nhanh",
      "Đổi tên nó thành 'Code' rồi chạy",
      "Để nguyên trên Desktop và mở từ đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nhấn mạnh kéo biểu tượng vào thư mục Applications là bước quan trọng, đừng chạy thẳng từ Downloads.\n✓ Đưa ứng dụng vào thư mục Ứng dụng là cách cài đúng trên Mac.\n✗ Chạy thẳng từ thư mục tải về chính là điều bài dặn không nên làm.\n✗ Bài không yêu cầu đổi tên ứng dụng.\n✗ Bài không hướng dẫn để trên màn hình nền mà chạy; nơi đúng là thư mục Applications."
  },
  {
    "id": "tech-q-056",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn đang đứng trên Desktop trong terminal và muốn tạo một thư mục mới tên 'hoc-lap-trinh' rồi bước vào nó. Bộ lệnh nào đúng?",
    "options": [
      "mkdir hoc-lap-trinh rồi cd hoc-lap-trinh",
      "cd hoc-lap-trinh rồi mkdir hoc-lap-trinh",
      "ls hoc-lap-trinh rồi cd hoc-lap-trinh",
      "mkdir hoc-lap-trinh rồi ls hoc-lap-trinh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "mkdir tạo thư mục mới, sau đó cd bước vào thư mục đó.\n✓ Tạo thư mục trước rồi mới di chuyển vào là thứ tự đúng.\n✗ Di chuyển vào thư mục trước khi nó tồn tại sẽ lỗi vì chưa có thư mục để vào.\n✗ Lệnh liệt kê không tạo ra thư mục mới nên không thể bước vào.\n✗ Liệt kê sau khi tạo chỉ để xem, không đưa bạn 'bước vào' thư mục."
  },
  {
    "id": "tech-q-057",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cài Python trên Windows xong, mở terminal cũ đang mở sẵn và gõ 'python --version' thì gặp lỗi 'python' is not recognized. Nguyên nhân nào KHÔNG nằm trong các nguyên nhân bài nêu cho lỗi này?",
    "options": [
      "Python được cài đúng nhưng bản tiếng Việt nên đổi tên lệnh",
      "Quên tick 'Add python.exe to PATH' khi cài",
      "Chưa mở lại cửa sổ terminal mới sau khi cài",
      "Cần gỡ ra cài lại và nhớ tick Add to PATH"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài quy lỗi này về việc quên tick Add to PATH hoặc chưa mở terminal mới; không hề có chuyện 'bản tiếng Việt đổi tên lệnh'.\n✓ Lý do bản tiếng Việt làm đổi tên lệnh là bịa, không có trong bài.\n✗ Quên tick Add to PATH đúng là nguyên nhân bài nêu.\n✗ Chưa mở terminal mới sau khi cài đúng là một nguyên nhân thường gặp.\n✗ Gỡ ra cài lại và nhớ tick là cách sửa bài đề xuất, nên đây là điều có trong bài."
  },
  {
    "id": "tech-q-058",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn gõ trong file Python: Print(\"Xin chào\") và chạy thì gặp lỗi. Vì sao?",
    "options": [
      "Python phân biệt hoa thường, phải viết là print chứ không phải Print",
      "Phải bỏ dấu ngoặc kép quanh câu chữ",
      "File phải có đuôi .python chứ không phải .py",
      "Phải gõ chữ Print viết hoa mới đúng chuẩn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ Python phân biệt hoa thường nên phải là print, viết hoa Print sẽ gây lỗi.\n✓ Viết đúng chữ thường print mới chạy được vì Python phân biệt hoa/thường.\n✗ Bỏ dấu ngoặc kép sẽ làm câu chữ không còn là chuỗi, gây lỗi khác.\n✗ Đuôi file Python là .py, không phải .python.\n✗ Viết hoa Print chính là nguyên nhân gây lỗi, không phải cách đúng."
  },
  {
    "id": "tech-q-059",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn copy đoạn code print(\"Xin chào\") từ một file Word rồi dán vào VS Code và chạy thì bị SyntaxError dù nhìn 'giống y hệt'. Khả năng cao nhất theo bài là gì?",
    "options": [
      "Word đã đổi dấu nháy thẳng thành dấu nháy cong “ ”",
      "VS Code không hỗ trợ dán văn bản",
      "Phải lưu file dưới dạng .docx mới chạy được",
      "Python không in được tiếng Việt có dấu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài cảnh báo dấu nháy 'cong' do gõ trong Word rồi dán sang sẽ gây lỗi, nên luôn gõ code trực tiếp trong VS Code.\n✓ Dấu nháy cong thay cho nháy thẳng là nguyên nhân điển hình của lỗi này.\n✗ VS Code dán văn bản bình thường, không phải nguyên nhân.\n✗ File Python lưu đuôi .py, lưu .docx mới là sai.\n✗ Python in được tiếng Việt có dấu; ví dụ trong bài chính là lời chào tiếng Việt."
  },
  {
    "id": "tech-q-060",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong DevTools, bạn nháy đúp vào một dòng tiêu đề trên trang vnexpress.net và sửa thành chữ khác, tiêu đề đổi ngay. Điều này có ý nghĩa gì?",
    "options": [
      "Chỉ bản hiển thị trên máy bạn thay đổi, tải lại trang (F5) là về như cũ",
      "Bạn đã sửa nội dung trang web thật cho mọi người",
      "Trang web đã bị hỏng vĩnh viễn",
      "Bạn vừa hack được trang vnexpress.net"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nói rõ bạn chỉ sửa bản hiển thị trên máy mình, bấm F5 là mọi thứ về như cũ, trang thật không hề hấn gì.\n✓ Thay đổi chỉ nằm trên máy bạn và mất khi tải lại trang.\n✗ Nội dung trang web thật cho mọi người không hề bị đổi.\n✗ Trang không bị hỏng vĩnh viễn; nó phục hồi khi tải lại.\n✗ Đây không phải hành vi hack; bạn không chạm được vào máy chủ của trang."
  },
  {
    "id": "tech-q-061",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo bài, đâu là sự khác nhau giữa Git và GitHub?",
    "options": [
      "Git là phần mềm trên máy bạn, GitHub là trang web lưu trữ dự án dùng Git",
      "Git và GitHub là cùng một thứ, chỉ khác tên gọi",
      "Git là trang web, GitHub là phần mềm cài trên máy",
      "Git dùng cho Windows, GitHub dùng cho Mac"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài phân biệt Git là phần mềm trên máy còn GitHub là trang web lưu trữ dự án, ví như 'Google Drive cho code'.\n✓ Git ở trên máy bạn, GitHub là dịch vụ web lưu dự án là cách phân biệt đúng.\n✗ Hai thứ này không phải cùng một thứ.\n✗ Mô tả bị đảo ngược: Git không phải trang web, GitHub không phải phần mềm cài máy.\n✗ Sự khác nhau không liên quan tới hệ điều hành Windows hay Mac."
  },
  {
    "id": "tech-q-062",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi gõ hai lệnh git config --global user.name và user.email, terminal không hiện gì cả. Bạn nên hiểu thế nào?",
    "options": [
      "Im lặng trong terminal thường có nghĩa là thành công",
      "Lệnh đã thất bại vì không có thông báo",
      "Cần gõ lại cho tới khi hiện thông báo xác nhận",
      "Máy bị treo, cần khởi động lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ hai lệnh này chạy xong không hiện gì, và trong thế giới terminal, im lặng thường có nghĩa là thành công.\n✓ Không có thông báo lỗi tức là lệnh đã chạy ổn.\n✗ Không hiện gì không có nghĩa là thất bại; lỗi thì terminal sẽ báo.\n✗ Không cần gõ lại; lệnh đã thành công ngay lần đầu.\n✗ Máy không hề treo; đây là hành vi bình thường của terminal."
  },
  {
    "id": "tech-q-063",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Khi google một thông báo lỗi để tìm cách sửa, đâu là cách làm ĐÚNG theo bài?",
    "options": [
      "Bỏ phần riêng tư như tên máy, đường dẫn C:\\Users\\TenBan rồi dán phần lỗi chung",
      "Dán nguyên cả đường dẫn C:\\Users\\TenBan để Google tìm chính xác máy bạn",
      "Tự viết lại lỗi bằng lời của mình cho ngắn gọn",
      "Chỉ tìm bằng tiếng Việt vì kết quả luôn tốt hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài khuyên bỏ phần riêng tư (tên máy, tên thư mục) khỏi câu tìm vì người khác gặp lỗi giống nhưng đường dẫn khác.\n✓ Loại bỏ đường dẫn riêng và giữ phần lỗi chung giúp tìm trúng người cùng cảnh.\n✗ Giữ nguyên đường dẫn riêng làm câu tìm quá đặc thù, khó ra kết quả.\n✗ Bài khuyên copy nguyên văn lỗi, không tự viết lại theo ý mình.\n✗ Bài nói tìm bằng tiếng Anh thường ra kết quả tốt hơn, không phải tiếng Việt."
  },
  {
    "id": "tech-q-064",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, khi nhờ AI assistant (ChatGPT, Claude...) giúp gỡ lỗi, đâu là những cách dùng ĐÚNG? (Chọn tất cả đáp án đúng)",
    "options": [
      "Cung cấp ngữ cảnh đầy đủ: Windows hay Mac, lệnh đã gõ, lỗi nguyên văn",
      "Nhờ AI giải thích lỗi từng bước cho người mới",
      "Nhờ AI làm hộ toàn bộ rồi copy-paste mà không đọc",
      "Tin tuyệt đối câu trả lời của AI, không cần chạy thử",
      "Nhờ AI ra bài tập kiểm tra lại kiến thức vừa học"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Cách dùng AI hiệu quả là cung cấp ngữ cảnh rõ, nhờ giải thích từng bước và nhờ ra bài tập ôn.\n✓ Cung cấp ngữ cảnh đầy đủ giúp câu trả lời trúng hơn.\n✓ Nhờ giải thích từng bước cho người mới là cách học tốt.\n✓ Nhờ AI ra bài tập kiểm tra là cách củng cố kiến thức bài đề xuất.\n✗ Nhờ làm hộ toàn bộ rồi dán mà không đọc là điều bài dặn không nên.\n✗ Tin AI tuyệt đối là sai vì AI có thể trả lời sai rất tự tin (ảo giác); phải chạy thử kiểm chứng."
  },
  {
    "id": "tech-q-065",
    "courseId": "TECH-101",
    "lesson": "pc-05-setup-tools",
    "certifications": [
      "TECH-101"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Bài nói hầu hết lỗi khi cài môi trường chỉ thuộc 3 nhóm cần kiểm tra trước khi hoảng. Đâu là những nhóm đó? (Chọn tất cả đáp án đúng)",
    "options": [
      "Quên 'Add to PATH'",
      "Chưa mở lại terminal sau khi cài",
      "Gõ sai chính tả lệnh",
      "Máy tính quá yếu nên không chạy được",
      "Phải cài lại toàn bộ Windows"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bài liệt kê 3 nhóm lỗi thường gặp: quên Add to PATH, chưa mở lại terminal, và gõ sai chính tả lệnh.\n✓ Quên Add to PATH là nhóm lỗi số một.\n✓ Chưa mở lại terminal sau khi cài là nhóm lỗi thứ hai.\n✓ Gõ sai chính tả lệnh là nhóm lỗi thứ ba.\n✗ Máy quá yếu không nằm trong 3 nhóm bài nêu.\n✗ Cài lại toàn bộ Windows chính là phản ứng thái quá mà bài khuyên tránh."
  },
  {
    "id": "prog-q-001",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, một chương trình được máy tính thực hiện theo cách nào?",
    "options": [
      "Tuần tự từng dòng, từ trên xuống dưới",
      "Máy tự chọn dòng nào quan trọng để chạy trước",
      "Chạy tất cả các dòng cùng một lúc",
      "Chạy ngược từ dưới lên trên"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chương trình là dãy lệnh được máy thực hiện tuần tự, từng dòng một, theo thứ tự từ trên xuống.\n✓ Tuần tự từng dòng từ trên xuống là đúng bản chất của chương trình.\n✗ Máy không 'đoán ý' hay tự chọn dòng quan trọng để ưu tiên.\n✗ Các dòng không chạy đồng thời ở mức cơ bản này.\n✗ Không có chuyện chạy ngược từ dưới lên."
  },
  {
    "id": "prog-q-002",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong lập trình, dấu `=` mang ý nghĩa gì?",
    "options": [
      "Lấy giá trị bên phải, bỏ vào hộp (biến) bên trái",
      "So sánh hai vế xem có bằng nhau không",
      "Khẳng định hai vế luôn bằng nhau như toán học",
      "Hoán đổi giá trị giữa hai biến"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dấu `=` là phép gán: đọc từ phải sang trái, lấy thứ bên phải đổ vào hộp bên trái.\n✓ Lấy giá trị bên phải bỏ vào biến bên trái chính là phép gán.\n✗ So sánh bằng là việc của toán tử khác, không phải `=` trong gán.\n✗ `=` không mang nghĩa 'bằng nhau' như toán học.\n✗ Một mình `=` không hoán đổi giá trị hai biến."
  },
  {
    "id": "prog-q-003",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Đoạn nào sau đây là tên biến HỢP LỆ theo quy tắc đặt tên trong bài?",
    "options": [
      "tong_tien",
      "2so",
      "tong tien",
      "tổng_tiền"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tên biến dùng chữ cái, chữ số, dấu gạch dưới; không bắt đầu bằng số, không có dấu cách, và quy ước tránh tiếng Việt có dấu.\n✓ tong_tien dùng chữ và gạch dưới, hợp lệ và có nghĩa.\n✗ Bắt đầu bằng chữ số bị cấm.\n✗ Có dấu cách trong tên là không hợp lệ.\n✗ Tiếng Việt có dấu bị quy ước chung loại bỏ."
  },
  {
    "id": "prog-q-004",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Kết quả khi in ra `\"5\" + \"3\"` là gì?",
    "options": [
      "\"53\"",
      "8",
      "\"8\"",
      "Báo lỗi vì không cộng được chuỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Hễ có ngoặc kép là chuỗi, và `+` với chuỗi là phép nối, nên `\"5\" + \"3\"` cho ra chuỗi \"53\".\n✓ \"53\" là kết quả nối hai đoạn văn bản lại.\n✗ 8 chỉ đúng nếu là số `5 + 3`, không phải chuỗi.\n✗ Kết quả không phải chuỗi \"8\".\n✗ Nối hai chuỗi là hợp lệ, không báo lỗi."
  },
  {
    "id": "prog-q-005",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Người dùng nhập năm sinh qua bàn phím (Python). Vì sao phải dùng `int()` trước khi tính tuổi?",
    "options": [
      "Vì dữ liệu nhập từ bàn phím được nhận về dạng chuỗi, cần đổi sang số để tính toán",
      "Vì `int()` làm chương trình chạy nhanh hơn",
      "Vì input() chỉ nhận được số âm nếu không chuyển kiểu",
      "Vì nếu không, năm sinh sẽ tự thành số thực"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thứ người dùng gõ vào luôn được nhận về dưới dạng chuỗi (Python/JS), nên muốn tính toán phải chuyển kiểu sang số.\n✓ Input trả về chuỗi, cần int() để có con số tính toán.\n✗ int() không liên quan đến tốc độ chạy.\n✗ Không có chuyện chỉ nhận số âm khi không chuyển kiểu.\n✗ Không có việc tự biến thành số thực."
  },
  {
    "id": "prog-q-006",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn code sau in ra gì?\n\ndiem = 7\ndiem = 9\nprint(diem)",
    "options": [
      "9",
      "7",
      "79",
      "16"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Biến có thể thay đổi: lần gán thứ hai bỏ 9 vào hộp, giá trị 7 cũ biến mất.\n✓ 9 là giá trị mới nhất trong hộp diem.\n✗ 7 đã bị thay thế nên không còn.\n✗ Gán không nối các giá trị thành 79.\n✗ Không có phép cộng nào tạo ra 16."
  },
  {
    "id": "prog-q-007",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một người mới viết `int(\"hai mươi\")` để đổi sang số. Điều gì xảy ra?",
    "options": [
      "Chương trình báo lỗi và dừng vì chuỗi không phải con số",
      "Trả về 20 vì máy hiểu chữ tiếng Việt",
      "Trả về 0 mặc định",
      "Trả về chuỗi \"20\""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chỉ chuyển được chuỗi có nội dung đúng là con số; chuỗi chữ như 'hai mươi' khiến chương trình báo lỗi và dừng (ví dụ ValueError).\n✓ Báo lỗi và dừng là hành vi đúng khi chuỗi không phải số.\n✗ Máy không tự dịch chữ tiếng Việt thành số.\n✗ Không có giá trị mặc định 0.\n✗ int() trả về số, không trả về chuỗi, và ở đây còn lỗi."
  },
  {
    "id": "prog-q-008",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo bài, cách đọc một thông báo lỗi hiệu quả nhất là gì?",
    "options": [
      "Đọc dòng cuối, tìm số dòng, nhìn kỹ dòng đó và dòng ngay phía trên",
      "Đóng chương trình ngay khi thấy chữ đỏ",
      "Bỏ qua loại lỗi, chỉ cần đọc tên file",
      "Luôn sửa đúng dòng số 1 vì lỗi thường ở đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thông báo lỗi là bản chỉ đường: đọc dòng cuối (thường dễ hiểu nhất), tìm số dòng, xem dòng đó và đôi khi cả dòng ngay phía trên.\n✓ Đọc dòng cuối và tìm đúng số dòng là cách sửa lỗi nhanh.\n✗ Hoảng và đóng chương trình là phản xạ sai cần tránh.\n✗ Loại lỗi (SyntaxError, NameError...) rất quan trọng, không bỏ qua.\n✗ Lỗi không cố định ở dòng 1; phải đọc số dòng thực tế."
  },
  {
    "id": "prog-q-009",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Go, sau khi đã tạo biến bằng `diem := 7`, muốn gán giá trị mới 9 cho biến này phải viết thế nào?",
    "options": [
      "diem = 9",
      "diem := 9",
      "let diem = 9",
      "int diem = 9"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ở Go, `:=` dùng khi TẠO hộp mới; hộp đã tồn tại thì gán lại bằng `=`.\n✓ diem = 9 là gán lại cho biến đã có, đúng cú pháp Go.\n✗ Dùng lại `:=` cho biến đã tồn tại là sai.\n✗ `let` là từ khoá của JavaScript, không phải Go.\n✗ `int diem = 9` là kiểu khai báo của Java/C++, không phải Go."
  },
  {
    "id": "prog-q-010",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Người dùng nhập hai số rồi chương trình in `\"53\"` thay vì `8`. Nguyên nhân và cách sửa hợp lý nhất là gì?",
    "options": [
      "Hai giá trị vẫn là chuỗi nên `+` nối lại; cần chuyển kiểu sang số trước khi cộng",
      "Máy bị lỗi phần cứng, cần khởi động lại",
      "Phải đổi dấu `+` thành dấu khác để cộng",
      "Cần thêm dấu ngoặc kép quanh phép cộng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dữ liệu nhập về là chuỗi; `+` với chuỗi là nối, nên \"5\"+\"3\" ra \"53\". Phải chuyển kiểu sang số trước khi cộng.\n✓ Chuyển kiểu sang số rồi cộng sẽ cho ra 8.\n✗ Đây là lỗi logic kiểu dữ liệu, không phải lỗi phần cứng.\n✗ `+` với số vốn đã là phép cộng đúng; vấn đề là kiểu chứ không phải toán tử.\n✗ Thêm ngoặc kép chỉ biến thành chữ, càng sai."
  },
  {
    "id": "prog-q-011",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Python, dùng `print(tuoi)` trong khi chưa hề tạo biến `tuoi`. Loại lỗi nào xuất hiện?",
    "options": [
      "NameError — gọi tên biến chưa tồn tại",
      "SyntaxError — sai ngữ pháp",
      "TypeError — dùng sai kiểu dữ liệu",
      "ValueError — giá trị không hợp lệ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dùng hộp chưa tồn tại gây NameError (cannot find symbol / not defined).\n✓ NameError đúng với việc gọi biến chưa được tạo.\n✗ SyntaxError là khi viết sai ngữ pháp, không phải trường hợp này.\n✗ TypeError xảy ra khi dùng sai kiểu, ví dụ cộng chuỗi với số.\n✗ ValueError là khi chuyển kiểu chuỗi không phải số."
  },
  {
    "id": "prog-q-012",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào sau đây ĐÚNG theo bài học? (chọn nhiều)",
    "options": [
      "Trong JavaScript, số nguyên và số thực gộp chung một kiểu `number`",
      "Python viết `True`/`False` viết hoa, còn Java/Go/JS viết thường `true`/`false`",
      "Chú thích (comment) sau `#` hoặc `//` bị máy tính bỏ qua hoàn toàn",
      "Máy tính không phân biệt chữ hoa thường, nên `Print` và `print` như nhau",
      "Java cho phép tạo biến mà không cần khai báo kiểu trước"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Các phát biểu đúng phản ánh đặc điểm kiểu, cách viết boolean và vai trò của comment.\n✓ JavaScript gộp số nguyên và số thực vào một kiểu number.\n✓ Python viết hoa True/False, ba ngôn ngữ kia viết thường.\n✓ Comment là ghi chú cho người đọc, máy bỏ qua hoàn toàn.\n✗ Máy phân biệt hoa thường TUYỆT ĐỐI; Print khác print.\n✗ Java bắt buộc khai báo kiểu trước (int, String...)."
  },
  {
    "id": "prog-q-013",
    "courseId": "PROGRAMMING",
    "lesson": "prog-01-first-program",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Quy trình kinh điển 'Nhập → Xử lý → Xuất' áp dụng cho chương trình hỏi năm sinh rồi tính tuổi. Việc nào thuộc bước XỬ LÝ hoặc XUẤT? (chọn nhiều)",
    "options": [
      "Lấy 2026 trừ đi năm sinh để ra tuổi (Xử lý)",
      "In lời chào kèm tuổi ra màn hình (Xuất)",
      "Chuyển chuỗi năm sinh sang số nguyên để tính được (Xử lý)",
      "Hỏi và đọc năm sinh người dùng gõ vào (Nhập)",
      "Hiển thị câu hỏi 'Năm sinh của bạn?' rồi chờ gõ (Nhập)"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Xử lý là biến đổi/tính toán dữ liệu; Xuất là in kết quả ra; Nhập là lấy dữ liệu vào.\n✓ Lấy 2026 trừ năm sinh là tính toán, thuộc Xử lý.\n✓ In lời chào kèm tuổi là Xuất.\n✓ Chuyển chuỗi sang số để tính được cũng là một bước Xử lý.\n✗ Hỏi và đọc năm sinh người dùng gõ là bước Nhập.\n✗ Hiển thị câu hỏi rồi chờ gõ thuộc khâu Nhập, không phải Xử lý/Xuất."
  },
  {
    "id": "prog-q-014",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Khi nào nên dùng vòng lặp `while` thay vì `for`?",
    "options": [
      "Khi biết trước chính xác số lần lặp",
      "Khi không biết trước số lần lặp, chỉ lặp chừng nào điều kiện còn đúng",
      "Khi cần in một số cố định lần",
      "Khi muốn duyệt từ 1 đến 10"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "`while` hợp với việc lặp khi chưa biết trước bao nhiêu lần, ví dụ \"khuấy đến khi sôi\".\n✓ Lặp chừng nào điều kiện còn đúng, không biết trước số lần là đúng bản chất của while.\n✗ Biết trước chính xác số lần lặp là tình huống của for.\n✗ In một số cố định lần cũng là biết trước số lần, hợp với for.\n✗ Duyệt từ 1 đến 10 là số lần xác định, dùng for tự nhiên hơn."
  },
  {
    "id": "prog-q-015",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Lỗi kinh điển của người mới khi viết điều kiện so sánh bằng là gì?",
    "options": [
      "Viết `if x == 5` thay vì `if x = 5`",
      "Viết `if x = 5` (một dấu bằng) thay vì `if x == 5`",
      "Dùng `>=` thay cho `<=`",
      "Quên dấu ngoặc nhọn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Một dấu `=` là gán giá trị, hai dấu `==` mới là hỏi có bằng nhau không.\n✓ Viết `if x = 5` (một dấu bằng) là nhầm gán thành so sánh, lỗi kinh điển.\n✗ `if x == 5` mới là cách viết đúng, không phải lỗi.\n✗ Nhầm `>=` với `<=` là lỗi khác, không phải lỗi nhầm gán/so sánh.\n✗ Quên ngoặc nhọn là lỗi cú pháp khác, không liên quan dấu bằng."
  },
  {
    "id": "prog-q-016",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "`continue` trong vòng lặp có tác dụng gì?",
    "options": [
      "Thoát hẳn khỏi vòng lặp ngay lập tức",
      "Bỏ qua phần còn lại của lượt hiện tại, nhảy sang lượt tiếp theo",
      "Khởi động lại vòng lặp từ đầu",
      "Tạm dừng chương trình"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "`continue` bỏ qua phần còn lại của lượt này và sang lượt kế tiếp.\n✓ Bỏ qua phần còn lại của lượt hiện tại, nhảy sang lượt tiếp theo là đúng định nghĩa continue.\n✗ Thoát hẳn khỏi vòng lặp ngay lập tức là tác dụng của break.\n✗ continue không khởi động lại vòng lặp từ đầu.\n✗ continue không tạm dừng chương trình."
  },
  {
    "id": "prog-q-017",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn Python sau in ra gì?\n```python\nfor i in range(1, 11):\n    if i % 2 == 0:\n        continue\n    if i == 9:\n        break\n    print(i)\n```",
    "options": [
      "1, 3, 5, 7",
      "1, 2, 3, 4, 5, 6, 7, 8",
      "1, 3, 5, 7, 9",
      "1, 3, 5, 7, 9, 11"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Số chẵn bị continue bỏ qua; tới 9 thì break nên không in 9.\n✓ 1, 3, 5, 7 là kết quả: bỏ chẵn, dừng trước khi in 9.\n✗ 1..8 sai vì số chẵn bị bỏ qua bởi continue.\n✗ Có 9 là sai vì gặp 9 thì break trước khi print.\n✗ Có 11 sai vì range(1,11) chỉ tới 10, và đã break ở 9."
  },
  {
    "id": "prog-q-018",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Với `diem = 7.5`, chuỗi if/elif xếp loại (>=8 Giỏi, >=6.5 Khá, >=5 Trung bình, else Cần cố gắng) in ra gì?",
    "options": [
      "Giỏi",
      "Khá",
      "Trung bình",
      "Khá và Trung bình"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Máy xét từ trên xuống, chạy nhánh đầu tiên đúng rồi dừng.\n✓ Khá đúng vì 7.5>=8 sai, 7.5>=6.5 đúng nên in Khá và bỏ qua phần còn lại.\n✗ Giỏi sai vì 7.5 không >= 8.\n✗ Trung bình sai vì nhánh Khá đã khớp trước và dừng lại.\n✗ Khá và Trung bình sai vì chỉ chạy đúng một nhánh đầu tiên khớp."
  },
  {
    "id": "prog-q-019",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong FizzBuzz, vì sao nhánh kiểm tra \"chia hết cho cả 3 và 5\" phải đặt TRƯỚC nhánh \"chia hết cho 3\"?",
    "options": [
      "Vì điều kiện viết sau chạy nhanh hơn",
      "Vì if/elif chỉ chạy nhánh đầu tiên đúng; nếu xét chia hết cho 3 trước thì số 15 in 'Fizz' rồi dừng, không bao giờ tới 'FizzBuzz'",
      "Vì 'FizzBuzz' dài hơn nên ưu tiên",
      "Vì số chia hết cho 5 phải xét cuối cùng"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "if/elif dừng ở nhánh đầu tiên đúng nên điều kiện cụ thể nhất phải đặt trước.\n✓ Số 15 chia hết cho 3 sẽ khớp nhánh 'Fizz' trước và dừng, không tới 'FizzBuzz' nếu đặt sai thứ tự.\n✗ Tốc độ không liên quan đến lý do thứ tự nhánh.\n✗ Độ dài chuỗi không quyết định thứ tự kiểm tra.\n✗ Lý do không phải vì chia hết cho 5 mà vì điều kiện kết hợp cụ thể hơn."
  },
  {
    "id": "prog-q-020",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn muốn in các số từ 1 đến 10 (gồm cả 10) trong Python. Cách nào ĐÚNG?",
    "options": [
      "range(1, 10)",
      "range(1, 11)",
      "range(0, 10)",
      "range(1, 9)"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "range(a, b) không lấy số b, nên muốn tới 10 phải dùng 11.\n✓ range(1, 11) tạo dãy 1..10 vì không bao gồm số cuối 11.\n✗ range(1, 10) thiếu số 10, lỗi lệch 1.\n✗ range(0, 10) bắt đầu từ 0 và thiếu 10.\n✗ range(1, 9) chỉ tới 8, thiếu cả 9 và 10."
  },
  {
    "id": "prog-q-021",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn while sau bị lỗi gì?\n```python\ntien = 100\nngay = 0\nwhile tien >= 30:\n    ngay = ngay + 1\nprint(ngay)\n```",
    "options": [
      "Lỗi cú pháp thiếu dấu hai chấm",
      "Vòng lặp vô hạn vì điều kiện không bao giờ trở thành sai",
      "Lệch 1, in thiếu một ngày",
      "Không in gì cả vì điều kiện sai ngay từ đầu"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Thân vòng không hề thay đổi `tien` nên `tien >= 30` mãi đúng.\n✓ Vòng lặp vô hạn vì thiếu dòng giảm tien, điều kiện không bao giờ sai.\n✗ Cú pháp vẫn hợp lệ, có đủ dấu hai chấm.\n✗ Không phải lệch 1 mà là vòng vô hạn.\n✗ Điều kiện 100>=30 đúng ngay từ đầu nên vòng vẫn chạy (và chạy mãi)."
  },
  {
    "id": "prog-q-022",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Với `tuoi = 25` và `co_bang_lai = True`, biểu thức `tuoi < 12 or tuoi >= 65` cho kết quả gì?",
    "options": [
      "Đúng (true)",
      "Sai (false)",
      "Báo lỗi",
      "Phụ thuộc vào co_bang_lai"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "`or` đúng khi ít nhất một vế đúng; ở đây cả hai vế đều sai.\n✓ Sai (false) vì 25<12 sai và 25>=65 cũng sai, or của hai vế sai là sai.\n✗ Đúng sai vì không có vế nào đúng.\n✗ Không báo lỗi, đây là so sánh hợp lệ.\n✗ Biểu thức không dùng co_bang_lai nên không phụ thuộc nó."
  },
  {
    "id": "prog-q-023",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn muốn lặp ĐÚNG 10 lần với biến đếm bắt đầu từ 0. Cách viết nào đúng (kiểu C: JS/Java/Go)?",
    "options": [
      "i = 0; i <= 10",
      "i = 0; i < 10",
      "i = 1; i < 10",
      "i = 1; i <= 9"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Bắt đầu từ 0, để chạy đúng 10 lần biến chạy qua 0..9, tức điều kiện i < 10.\n✓ i = 0; i < 10 cho các giá trị 0..9, đúng 10 lần.\n✗ i = 0; i <= 10 chạy 0..10 là 11 lần, thừa 1.\n✗ i = 1; i < 10 chạy 1..9 là 9 lần, thiếu 1.\n✗ i = 1; i <= 9 chạy 1..9 là 9 lần, thiếu 1."
  },
  {
    "id": "prog-q-024",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trò đoán số dùng `while True:` rồi thoát bằng `break` khi đoán trúng. Điều này khác gì với vòng lặp vô hạn do lỗi?",
    "options": [
      "Không khác gì, cả hai đều là lỗi",
      "while True là vòng vô hạn CÓ CHỦ ĐÍCH, có lối thoát bằng break; còn vòng vô hạn do lỗi là quên làm điều kiện trở thành sai",
      "while True luôn an toàn hơn while có điều kiện",
      "while True chạy nhanh hơn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Mẫu while True + break là vòng vô hạn có lối thoát chủ động, khác hẳn lỗi quên cập nhật điều kiện.\n✓ while True có chủ đích kèm break là lối thoát hợp lệ, khác vòng vô hạn do quên làm điều kiện sai.\n✗ Không phải cả hai đều là lỗi; một cái là kỹ thuật cố ý.\n✗ while True không tự động an toàn hơn; an toàn nhờ có break.\n✗ Tốc độ không phải điểm khác biệt ở đây."
  },
  {
    "id": "prog-q-025",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào về toán tử logic `and` và `or` là ĐÚNG?",
    "options": [
      "`and` đúng khi cả hai vế cùng đúng",
      "`or` đúng khi ít nhất một vế đúng",
      "`and` chỉ cần một vế đúng là cả câu đúng",
      "`or` cần cả hai vế đúng mới đúng",
      "`5 < 12 or 5 >= 65` cho kết quả đúng vì có một vế đúng"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "`and` khó tính (cần cả hai đúng), `or` dễ tính (cần ít nhất một đúng).\n✓ and đúng khi cả hai vế cùng đúng là chính xác.\n✓ or đúng khi ít nhất một vế đúng là chính xác.\n✓ 5<12 đúng nên or cho kết quả đúng dù vế kia sai.\n✗ and chỉ cần một vế đúng là sai; and cần cả hai vế đúng.\n✗ or cần cả hai vế đúng là sai; chỉ cần một vế đúng."
  },
  {
    "id": "prog-q-026",
    "courseId": "PROGRAMMING",
    "lesson": "prog-02-control-flow",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Đâu là những nguyên nhân/dấu hiệu phổ biến của lỗi lệch 1 (off-by-one)?",
    "options": [
      "Nhầm giữa `<` và `<=` trong điều kiện vòng lặp",
      "Quên rằng `range(1, 10)` của Python không lấy số 10",
      "Tính tổng 1..100 ra 5050 thay vì kết quả mong đợi khác",
      "Vòng lặp cho kết quả 'gần đúng nhưng sai sai', thừa hoặc thiếu đúng 1 lần",
      "Quên cập nhật điều kiện khiến vòng chạy mãi mãi"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "Off-by-one là chạy thừa/thiếu đúng 1 lần, thường do nhầm </<= hoặc quên range không lấy số cuối.\n✓ Nhầm < với <= là nguyên nhân kinh điển của lệch 1.\n✓ range(1,10) không lấy 10 dễ gây thiếu một số.\n✓ Kết quả thừa/thiếu đúng 1 lần là dấu hiệu đặc trưng của off-by-one.\n✗ Tổng 1..100 ra 5050 là kết quả ĐÚNG; ra 4950 hay 5151 mới là lệch 1.\n✗ Quên cập nhật điều kiện gây vòng lặp vô hạn, không phải off-by-one."
  },
  {
    "id": "prog-q-027",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Nguyên tắc DRY (Don't Repeat Yourself) chủ yếu nhằm đạt được điều gì?",
    "options": [
      "Mỗi mẩu logic chỉ viết ở một nơi duy nhất, khi đổi chỉ sửa một chỗ",
      "Làm chương trình chạy nhanh hơn nhờ ít dòng code hơn",
      "Bắt buộc mọi biến phải là biến toàn cục để dùng chung",
      "Giảm số lượng hàm xuống mức tối thiểu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "DRY giúp logic tập trung một nơi nên khi thay đổi chỉ cần sửa duy nhất một chỗ.\n✓ Mỗi mẩu logic ở một nơi, sửa một chỗ là cập nhật mọi nơi dùng nó.\n✗ DRY không nói về tốc độ chạy; mục tiêu là dễ bảo trì, không phải hiệu năng.\n✗ DRY khuyến khích hạn chế biến toàn cục, không bắt mọi biến thành toàn cục.\n✗ DRY không nhằm giảm số hàm; thực tế thường tạo thêm hàm để gom phần lặp."
  },
  {
    "id": "prog-q-028",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Sau khi định nghĩa hàm chao(ten) như trong bài, điều gì xảy ra nếu bạn chỉ viết định nghĩa mà không có dòng nào gọi hàm?",
    "options": [
      "Không có gì xảy ra; code bên trong hàm chưa chạy",
      "Code bên trong hàm tự động chạy một lần",
      "Code bên trong hàm chạy lặp vô hạn",
      "Chương trình báo lỗi vì thiếu đối số"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Định nghĩa hàm giống viết công thức: viết xong chưa có gì xảy ra, phải gọi hàm thì code mới chạy.\n✓ Chỉ định nghĩa mà không gọi thì thân hàm không được thực thi.\n✗ Hàm không tự chạy khi mới định nghĩa.\n✗ Không có vòng lặp nào được tạo ra chỉ vì định nghĩa hàm.\n✗ Thiếu lời gọi không gây lỗi đối số; đơn giản là hàm chưa được dùng."
  },
  {
    "id": "prog-q-029",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong lời gọi tinhTien(30000, 2) với định nghĩa tinhTien(donGia, soLuong), giá trị 30000 và 2 được gọi là gì?",
    "options": [
      "Đối số (argument) — giá trị thật truyền vào lúc gọi",
      "Tham số (parameter) — biến giữ chỗ trong định nghĩa",
      "Biến toàn cục dùng chung cho mọi hàm",
      "Giá trị trả về của hàm"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giá trị thật truyền vào lúc gọi là đối số; donGia/soLuong trong định nghĩa mới là tham số.\n✓ 30000 và 2 là đối số được điền vào ô trống lúc gọi.\n✗ Tham số là tên giữ chỗ donGia, soLuong, không phải con số thật.\n✗ Chúng không phải biến toàn cục mà chỉ là giá trị truyền vào.\n✗ Đó là đầu vào, không phải giá trị hàm trả về."
  },
  {
    "id": "prog-q-030",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho hàm Python:\n\ndef f(x):\n    return x * 2\n    print(\"xong\")\n\nKhi gọi f(5), kết quả là gì?",
    "options": [
      "Trả về 10 và KHÔNG in 'xong'",
      "Trả về 10 và in 'xong'",
      "In 'xong' rồi trả về 10",
      "Báo lỗi vì có code sau return"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "return kết thúc hàm ngay lập tức nên dòng print sau nó không bao giờ chạy.\n✓ Hàm trả về 10; lệnh print nằm sau return bị bỏ qua hoàn toàn.\n✗ 'xong' không được in vì nó đứng sau return trong cùng nhánh.\n✗ print không chạy trước return; return là dòng được thực thi.\n✗ Code sau return không gây lỗi, nó chỉ là code không bao giờ chạy."
  },
  {
    "id": "prog-q-031",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một lập trình viên viết hàm chỉ print kết quả thay vì return, rồi làm tong = tinhTien(...) + 5 trong Python. Vì sao bị lỗi?",
    "options": [
      "Hàm không return nên trả về None, cộng None + 5 gây lỗi",
      "print nhanh hơn return nên gây lệch dữ liệu",
      "Python không cho phép cộng số với kết quả hàm",
      "Lỗi do truyền sai thứ tự đối số"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "print chỉ hiển thị; hàm không có return sẽ trả về None, và None + 5 là phép cộng không hợp lệ.\n✓ Hàm thiếu return trả về None nên cộng với 5 gây lỗi.\n✗ Vấn đề không phải tốc độ; print và return có mục đích khác nhau hoàn toàn.\n✗ Python cho cộng với giá trị trả về hợp lệ; vấn đề là giá trị ở đây là None.\n✗ Lỗi đến từ thiếu return, không liên quan thứ tự đối số."
  },
  {
    "id": "prog-q-032",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn code sau (mô tả chung):\n\nfunction tinhThue() {\n  thue = 0.1   // biến cục bộ\n}\ntinhThue()\nin(thue)   // dòng này\n\nVì sao dòng cuối gây lỗi 'không thấy thue'?",
    "options": [
      "thue là biến cục bộ, chỉ sống trong hàm; ngoài hàm không truy cập được",
      "Phải gọi tinhThue() hai lần thì biến mới tồn tại",
      "thue bị xoá vì giá trị 0.1 quá nhỏ",
      "Vì hàm tinhThue không có tham số"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Biến tạo bên trong hàm là biến cục bộ, giống đồ trong phòng riêng, ra ngoài là biến mất.\n✓ thue chỉ tồn tại trong phạm vi hàm nên bên ngoài không nhìn thấy.\n✗ Gọi hàm nhiều lần không làm biến cục bộ rò ra ngoài.\n✗ Giá trị nhỏ không liên quan; vấn đề là scope.\n✗ Việc có hay không có tham số không quyết định scope của biến cục bộ."
  },
  {
    "id": "prog-q-033",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo bài, cách trao đổi dữ liệu 'lành mạnh' giữa các hàm là gì, và vì sao nên hạn chế biến toàn cục?",
    "options": [
      "Đưa vào qua tham số, lấy ra qua return; biến toàn cục dễ bị nơi khác vô tình sửa",
      "Dùng biến toàn cục cho mọi thứ để các hàm khỏi cần tham số",
      "Tránh return hoàn toàn và chỉ dùng print để truyền dữ liệu",
      "Đặt mọi biến trong một hàm duy nhất rồi gọi từ đó"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trao đổi dữ liệu lành mạnh là vào qua tham số, ra qua return; biến toàn cục ai cũng đụng được nên khó truy lỗi.\n✓ Tham số và return là kênh dữ liệu rõ ràng, biến toàn cục dễ bị sửa nhầm.\n✗ Lạm dụng biến toàn cục chính là điều bài khuyên nên tránh.\n✗ print chỉ để hiển thị, không phải kênh truyền dữ liệu giữa hàm.\n✗ Dồn mọi biến vào một hàm không phải nguyên tắc bài nêu."
  },
  {
    "id": "prog-q-034",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho ba hàm: tinh_tien_hang(dg, sl) trả dg*sl; tinh_thue(t) trả t*0.1; tinh_hoa_don gọi cả hai rồi cộng lại. Gọi tinh_hoa_don(50000, 2) cho kết quả bao nhiêu?",
    "options": [
      "110000",
      "100000",
      "10000",
      "55000"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tiền hàng = 50000*2 = 100000; thuế = 100000*0.1 = 10000; tổng = 110000.\n✓ 100000 + 10000 = 110000 đúng như ví dụ trong bài.\n✗ 100000 mới chỉ là tiền hàng, còn thiếu phần thuế.\n✗ 10000 chỉ là riêng phần thuế.\n✗ 55000 không khớp với bất kỳ bước tính nào."
  },
  {
    "id": "prog-q-035",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một hàm hiện làm: tính tiền VÀ gửi email VÀ in hoá đơn. Theo nguyên tắc trong bài, điều này báo hiệu gì và nên xử lý ra sao?",
    "options": [
      "Hàm làm quá nhiều việc; nên tách thành nhiều hàm, mỗi hàm một việc",
      "Hàm rất tốt vì gom được nhiều chức năng vào một chỗ",
      "Nên đổi mọi biến trong hàm thành biến toàn cục",
      "Nên đổi tên hàm thành ham1 để dễ nhớ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Một hàm tốt làm một việc duy nhất; phải dùng chữ 'và' để mô tả là dấu hiệu nên tách hàm.\n✓ Hàm ôm nhiều việc nên được tách thành các hàm nhỏ, mỗi hàm một nhiệm vụ.\n✗ Gom nhiều chức năng vào một hàm là điều bài cảnh báo, không phải khen.\n✗ Biến toàn cục không liên quan và còn bị bài khuyên tránh.\n✗ Tên kiểu ham1 là ví dụ đặt tên tệ mà bài phê phán."
  },
  {
    "id": "prog-q-036",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong quy trình refactor 3 bước của bài, sau khi đã 'tìm phần lặp', bước tiếp theo là gì?",
    "options": [
      "Tìm phần KHÁC NHAU giữa các lần lặp — đó chính là tham số",
      "Đổi mọi biến cục bộ thành biến toàn cục",
      "Xoá hết phần lặp rồi viết lại từ đầu",
      "Đổi tên tất cả hàm sang camelCase trước"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bước 2 là tìm phần khác nhau giữa các lần lặp; chính phần đó trở thành tham số của hàm.\n✓ Phần khác nhau (tên, điểm số) được biến thành tham số của hàm gom lại.\n✗ Refactor không yêu cầu chuyển biến cục bộ thành toàn cục.\n✗ Refactor là sửa cách viết mà không đổi hành vi, không phải viết lại từ đầu.\n✗ Đổi kiểu tên không phải bước trong quy trình refactor này."
  },
  {
    "id": "prog-q-037",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, đâu là một tên hàm TỐT cho hàm kiểm tra một số có phải số chẵn không?",
    "options": [
      "laSoChan() — đọc như một câu hỏi đúng/sai",
      "kiemTra() — chung chung",
      "lam1() — ngắn gọn",
      "x() — gõ nhanh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Hàm trả về đúng/sai nên đọc như câu hỏi, ví dụ laSoChan(), isEmpty().\n✓ laSoChan() nói rõ hàm trả về đúng/sai và đọc như câu hỏi.\n✗ kiemTra() quá mơ hồ, không nói rõ kiểm tra cái gì.\n✗ lam1() là kiểu đặt tên vô nghĩa bài phê phán.\n✗ x() không cho biết hàm làm gì, là tên tệ."
  },
  {
    "id": "prog-q-038",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào sau đây ĐÚNG theo nội dung bài về return và print?",
    "options": [
      "return đưa giá trị ra cho chương trình dùng tiếp",
      "return kết thúc hàm ngay lập tức",
      "print chỉ hiển thị chữ cho con người xem, không 'bắt' lại được để tính tiếp",
      "print và return là hai cách hoàn toàn tương đương, dùng cái nào cũng như nhau",
      "Ở JavaScript, dùng kết quả của hàm chỉ print (không return) trong phép cộng có thể ra NaN"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "return trả giá trị và kết thúc hàm; print chỉ để xem; dùng nhầm print thay return gây kết quả lạ như NaN ở JS.\n✓ return đưa giá trị ra để chương trình dùng tiếp.\n✓ return kết thúc hàm ngay, code sau nó không chạy.\n✓ print chỉ hiển thị, không lấy lại được giá trị để tính tiếp.\n✓ Ở JavaScript, cộng với kết quả của hàm chỉ print có thể ra NaN.\n✗ print và return KHÔNG tương đương; mục đích khác nhau hoàn toàn."
  },
  {
    "id": "prog-q-039",
    "courseId": "PROGRAMMING",
    "lesson": "prog-03-functions",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài, những điều nào sau đây ĐÚNG về tham số, đối số và scope?",
    "options": [
      "Tham số cũng là biến cục bộ của hàm",
      "Hai hàm khác nhau có thể cùng đặt tên tham số là x mà không đụng nhau",
      "Thứ tự đối số phải khớp đúng thứ tự tham số",
      "Biến tạo bên ngoài mọi hàm là biến toàn cục, phòng nào cũng thấy",
      "Đối số là tên giữ chỗ trong định nghĩa hàm, còn tham số là giá trị thật lúc gọi"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "Tham số là biến cục bộ nên các hàm có thể trùng tên tham số; thứ tự đối số phải khớp tham số; biến ngoài hàm là toàn cục.\n✓ Tham số là biến cục bộ của hàm.\n✓ Hai hàm có thể trùng tên tham số x mà không xung đột.\n✓ Thứ tự đối số phải khớp đúng thứ tự tham số, nếu không dễ gây sai như chuyển tiền nhầm người.\n✓ Biến ngoài mọi hàm là toàn cục, mọi hàm đều thấy.\n✗ Định nghĩa bị đảo ngược: tham số mới là tên giữ chỗ, còn đối số là giá trị thật lúc gọi."
  },
  {
    "id": "prog-q-040",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Cho danh sách trai_cay = [\"táo\", \"cam\", \"chuối\"]. Lệnh truy cập trai_cay[2] cho ra giá trị nào?",
    "options": [
      "\"chuối\"",
      "\"cam\"",
      "\"táo\"",
      "Lỗi vượt phạm vi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Index bắt đầu từ 0, nên index 2 là phần tử thứ ba.\n✓ \"chuối\" nằm ở index 2 (táo=0, cam=1, chuối=2).\n✗ \"cam\" ở index 1, không phải 2.\n✗ \"táo\" ở index 0.\n✗ Danh sách có 3 phần tử nên index 2 hoàn toàn hợp lệ, không lỗi."
  },
  {
    "id": "prog-q-041",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một danh sách có 5 phần tử. Index hợp lệ cuối cùng là bao nhiêu?",
    "options": [
      "4",
      "5",
      "6",
      "0"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Danh sách N phần tử có index chạy từ 0 đến N − 1.\n✓ Với N = 5, index cuối cùng là 5 − 1 = 4.\n✗ Index 5 sẽ vượt phạm vi vì đã vượt qua phần tử cuối.\n✗ Index 6 còn vượt xa hơn.\n✗ 0 là index của phần tử đầu, không phải cuối."
  },
  {
    "id": "prog-q-042",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Đổ danh sách [3, 1, 3, 2, 3] vào một set thì set chứa bao nhiêu phần tử?",
    "options": [
      "3",
      "5",
      "1",
      "2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Set loại bỏ giá trị trùng lặp, chỉ giữ mỗi giá trị một lần.\n✓ Các giá trị khác nhau là {3, 1, 2} nên có 3 phần tử.\n✗ 5 là số phần tử của danh sách gốc, nhưng set khử trùng nên không giữ cả 5.\n✗ 1 và 2 đều quá ít so với số giá trị khác nhau."
  },
  {
    "id": "prog-q-043",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần lưu số điện thoại theo tên người để \"đưa tên vào, nhận ngay số ra\" mà không phải duyệt cả danh sách. Cấu trúc nào phù hợp nhất?",
    "options": [
      "Dictionary/Map (khóa → giá trị)",
      "List/Array có thứ tự",
      "Set (túi không trùng)",
      "Một biến chuỗi nối tất cả số lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Yêu cầu \"tra theo tên → ra thông tin\" đúng là mô hình khóa → giá trị.\n✓ Dictionary cho phép đưa khóa (tên) vào và lấy giá trị (số) ra cực nhanh.\n✗ List buộc phải duyệt từ đầu để tìm đúng người, chậm và bất tiện.\n✗ Set chỉ trả lời \"có hay không\", không gắn được thông tin số điện thoại.\n✗ Một chuỗi nối tất cả không cho phép tra cứu có cấu trúc."
  },
  {
    "id": "prog-q-044",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Chạy lần lượt: danh_ba = {\"Lan\": \"111\"}; rồi danh_ba[\"Lan\"] = \"999\". Sau đó danh_ba[\"Lan\"] cho ra gì?",
    "options": [
      "\"999\"",
      "\"111\"",
      "Cả \"111\" và \"999\"",
      "Lỗi vì khóa \"Lan\" đã tồn tại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khóa trong từ điển là duy nhất; gán lại cùng khóa sẽ ghi đè giá trị cũ.\n✓ \"999\" là giá trị mới ghi đè, nên đó là kết quả.\n✗ \"111\" đã bị ghi đè và biến mất.\n✗ Từ điển không lưu hai giá trị cho cùng một khóa.\n✗ Gán lại khóa đã có không gây lỗi, chỉ đơn giản là ghi đè."
  },
  {
    "id": "prog-q-045",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn Python sau in ra số mấy?\n\ngio_hang = [\"trứng\"]\ngio_hang.append(\"sữa\")\ngio_hang.append(\"bánh mì\")\ngio_hang.remove(\"sữa\")\nprint(len(gio_hang))",
    "options": [
      "2",
      "3",
      "1",
      "0"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bắt đầu 1 phần tử, thêm 2, rồi xóa 1.\n✓ 1 + 2 − 1 = 2, danh sách còn [\"trứng\", \"bánh mì\"].\n✗ 3 là số trước khi xóa \"sữa\".\n✗ 1 là số phần tử ban đầu, chưa tính các thao tác sau.\n✗ 0 sai vì danh sách vẫn còn phần tử."
  },
  {
    "id": "prog-q-046",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bài đếm tần suất với câu \"mèo chó mèo cá chó mèo\". Sau khi đếm, giá trị ứng với khóa \"chó\" là bao nhiêu?",
    "options": [
      "2",
      "3",
      "1",
      "6"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đếm số lần mỗi từ xuất hiện trong câu.\n✓ \"chó\" xuất hiện 2 lần nên giá trị là 2.\n✗ 3 là số lần của \"mèo\".\n✗ 1 là số lần của \"cá\".\n✗ 6 là tổng số từ trong câu, không phải số lần của riêng \"chó\"."
  },
  {
    "id": "prog-q-047",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong Go, viết gioHang := []string{\"a\"} rồi append(gioHang, \"b\") nhưng KHÔNG gán lại kết quả. Đây là lỗi gì theo bài học?",
    "options": [
      "Quên gán lại: append trả về slice mới nên gioHang vẫn không đổi",
      "Không lỗi, slice tự cập nhật tại chỗ",
      "Lỗi cú pháp khiến chương trình không biên dịch",
      "append xóa mất phần tử cũ \"a\""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài học nhấn mạnh trong Go append phải gán lại vào biến.\n✓ append trả về slice mới; quên gán lại là lỗi kinh điển khiến biến không thay đổi.\n✗ Slice không tự cập nhật tại chỗ theo cách đảm bảo, nên không gán lại là sai.\n✗ Câu lệnh vẫn biên dịch được, đây là lỗi logic chứ không phải cú pháp.\n✗ append không xóa phần tử cũ; nó tạo phiên bản mở rộng."
  },
  {
    "id": "prog-q-048",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần biết một email \"đã được gửi chưa\" để tránh gửi trùng, không quan tâm thứ tự cũng không cần đếm số lần. Cấu trúc nào hợp nhất?",
    "options": [
      "Set",
      "List/Array",
      "Dictionary/Map có giá trị là số đếm",
      "Hai biến boolean riêng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Câu hỏi \"đã có chưa?\" và \"khử trùng lặp\" chính là việc của set.\n✓ Set kiểm tra tồn tại nhanh và tự loại bỏ trùng lặp.\n✗ List phải duyệt từ đầu để kiểm tra, chậm khi dữ liệu lớn.\n✗ Dictionary với số đếm là dư thừa vì ta không cần đếm số lần.\n✗ Vài biến boolean không thể mở rộng cho số lượng email tùy ý."
  },
  {
    "id": "prog-q-049",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Go, danh_ba := map[string]string{...} chỉ có khóa \"Lan\". Khi tra danh_ba[\"Hoa\"] (khóa không tồn tại), điều gì xảy ra?",
    "options": [
      "Trả về giá trị rỗng \"\" một cách lặng lẽ, không báo lỗi",
      "Ném lỗi KeyError dừng chương trình",
      "Trả về undefined",
      "Tự động tạo khóa \"Hoa\" với giá trị \"Hoa\""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ Go trả về \"giá trị rỗng\" khi tra khóa không tồn tại, dễ gây nhầm.\n✓ Với map giá trị chuỗi, khóa thiếu trả về \"\" lặng lẽ, không lỗi.\n✗ KeyError là hành vi của Python, không phải Go.\n✗ undefined là hành vi của JavaScript Map.get.\n✗ Việc tra cứu đơn thuần không tự tạo khóa mới với giá trị bằng tên khóa."
  },
  {
    "id": "prog-q-050",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Vì sao tìm một giá trị trong list lớn lại chậm hơn tra cứu trong dictionary/set?",
    "options": [
      "List phải duyệt từ đầu để tìm, còn dictionary/set tra cứu rất nhanh dù chứa hàng triệu phần tử",
      "Dictionary luôn nhỏ hơn list nên nhanh hơn",
      "List không cho phép phần tử trùng nên phải so sánh nhiều hơn",
      "Dictionary giữ thứ tự nên tìm nhanh hơn"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khác biệt nằm ở cách truy xuất: duyệt tuần tự so với tra cứu theo khóa.\n✓ List phải đi từ đầu để tìm giá trị, chậm dần khi list lớn; dictionary/set tra cứu nhanh kể cả với hàng triệu phần tử.\n✗ Tốc độ không phụ thuộc dictionary nhỏ hơn list; cả hai có thể rất lớn.\n✗ List thực ra cho phép trùng giá trị, nên lập luận này sai.\n✗ Thứ tự các cặp trong dictionary nói chung không quan trọng và không phải lý do nhanh."
  },
  {
    "id": "prog-q-051",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào ĐÚNG về List/Array theo bài học? (chọn tất cả đáp án đúng)",
    "options": [
      "Phần tử được xếp theo thứ tự, truy cập bằng index bắt đầu từ 0",
      "Được phép chứa các giá trị trùng nhau",
      "Truy cập index N với danh sách N phần tử là hợp lệ",
      "Khóa phải duy nhất, gán lại sẽ ghi đè",
      "Index cuối cùng của danh sách N phần tử là N − 1"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "List là dãy có thứ tự, cho trùng, index từ 0 đến N − 1.\n✓ Phần tử có thứ tự, truy cập bằng index bắt đầu từ 0.\n✓ List cho phép trùng giá trị (hai học sinh cùng điểm 8).\n✓ Index cuối là N − 1.\n✗ Truy cập index N với danh sách N phần tử vượt phạm vi (chỉ tới N − 1).\n✗ \"Khóa duy nhất, ghi đè\" là đặc tính của dictionary, không phải list."
  },
  {
    "id": "prog-q-052",
    "courseId": "PROGRAMMING",
    "lesson": "prog-04-collections",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi tra một khóa KHÔNG tồn tại trong từ điển/map, hành vi nào sau đây khớp đúng với ngôn ngữ tương ứng theo bài? (chọn tất cả đáp án đúng)",
    "options": [
      "Python ném lỗi KeyError",
      "JavaScript Map.get trả về undefined",
      "Java trả về null",
      "Go ném lỗi NullPointerException",
      "Go luôn tự thêm khóa mới với giá trị do người dùng nhập"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Mỗi ngôn ngữ phản ứng khác nhau khi tra khóa thiếu.\n✓ Python ném KeyError.\n✓ JavaScript Map.get trả về undefined.\n✓ Java trả về null.\n✗ Go không ném NullPointerException; nó trả về giá trị rỗng lặng lẽ.\n✗ Go không tự thêm khóa mới với giá trị người dùng nhập khi chỉ tra cứu."
  },
  {
    "id": "prog-q-053",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Cho chuỗi s = \"HELLO\". Ký tự ở vị trí (index) số 0 là gì?",
    "options": [
      "'H'",
      "'E'",
      "'O'",
      "Không có vị trí 0, index bắt đầu từ 1"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Index của chuỗi luôn bắt đầu từ 0, nên vị trí 0 là ký tự đầu tiên.\n✓ 'H' là ký tự đầu tiên, nằm ở vị trí 0\n✗ 'E' nằm ở vị trí 1, không phải 0\n✗ 'O' là ký tự cuối, nằm ở vị trí 4\n✗ Index bắt đầu từ 0 chứ không phải 1, nên vẫn có vị trí 0"
  },
  {
    "id": "prog-q-054",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Với s = \"Hello World\", phép cắt s[0:5] trả về kết quả nào?",
    "options": [
      "\"Hello\"",
      "\"HelloW\"",
      "\"Hello \"",
      "\"ello \""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cắt [0:5] lấy từ vị trí 0 đến TRƯỚC vị trí 5, tức 5 ký tự ở vị trí 0,1,2,3,4.\n✓ \"Hello\" gồm đúng 5 ký tự ở các vị trí 0-4\n✗ \"HelloW\" lấy thêm ký tự vị trí 5, nhưng vị trí 5 không được bao gồm\n✗ \"Hello \" thêm dấu cách ở vị trí 5, vốn bị loại trừ\n✗ \"ello \" bắt đầu sai ở vị trí 1 thay vì 0"
  },
  {
    "id": "prog-q-055",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn code sau in ra gì?\ns = \"hello\"\ns.upper()\nprint(s)",
    "options": [
      "hello",
      "HELLO",
      "Hello",
      "Báo lỗi vì chuỗi bất biến"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chuỗi là bất biến: upper() trả về chuỗi MỚI nhưng không gán lại, nên s gốc không đổi.\n✓ \"hello\" vì kết quả của upper() bị vứt đi, s vẫn nguyên giá trị cũ\n✗ \"HELLO\" chỉ xảy ra nếu gán s = s.upper()\n✗ \"Hello\" không phải hành vi của upper()\n✗ Không báo lỗi: gọi upper() trên chuỗi bất biến hoàn toàn hợp lệ, chỉ là không sửa gốc"
  },
  {
    "id": "prog-q-056",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Hàm tìm kiếm vị trí (find / indexOf / strings.Index) trả về giá trị gì khi KHÔNG tìm thấy chuỗi con?",
    "options": [
      "-1",
      "0",
      "Chuỗi rỗng",
      "Văng exception"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Theo bài, các hàm tìm vị trí trả về -1 khi không tìm thấy.\n✓ -1 là quy ước báo \"không có\"\n✗ 0 là vị trí hợp lệ (vị trí đầu), không thể dùng để báo không tìm thấy\n✗ Chuỗi rỗng không phải giá trị trả về của hàm tìm vị trí\n✗ Không văng exception, hàm trả về -1 một cách bình thường"
  },
  {
    "id": "prog-q-057",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần ghép tên và tuổi vào một câu thông báo, tránh quên dấu cách và dễ đọc. Cách nào phù hợp nhất theo bài học?",
    "options": [
      "Dùng định dạng chuỗi (f-string / template literal / %s %d)",
      "Cộng từng mảnh bằng dấu + nhiều lần",
      "Dùng hàm cắt chuỗi (substring)",
      "Dùng hàm tìm kiếm indexOf"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài khuyên dùng \"khuôn mẫu có chỗ trống\" để trộn biến vào chữ, tránh nối + dài dòng dễ quên dấu cách.\n✓ Định dạng chuỗi là cách được khuyến nghị để trộn biến vào câu\n✗ Cộng + nhiều lần đúng là cách bài nói dài dòng, dễ quên dấu cách\n✗ Cắt chuỗi dùng để lấy đoạn con, không phải để ghép biến\n✗ indexOf dùng để tìm vị trí, không liên quan đến ghép câu"
  },
  {
    "id": "prog-q-058",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Go, với s = \"Hà\" (có dấu), len(s) cho kết quả thế nào?",
    "options": [
      "Lớn hơn 2 vì len đếm byte, ký tự có dấu chiếm nhiều byte",
      "Đúng bằng 2 vì len đếm ký tự",
      "Bằng 1",
      "Văng lỗi vì Go không hỗ trợ tiếng Việt"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài lưu ý: trong Go len() đếm byte, ký tự tiếng Việt có dấu chiếm nhiều byte nên kết quả lớn hơn số chữ.\n✓ Lớn hơn 2 vì 'à' chiếm nhiều byte; muốn đếm đúng ký tự dùng len([]rune(s))\n✗ Không bằng 2 vì Go đếm byte chứ không đếm ký tự\n✗ Không bằng 1\n✗ Go vẫn xử lý được tiếng Việt, không văng lỗi"
  },
  {
    "id": "prog-q-059",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Quy trình làm việc với file theo bài học gồm 3 bước nào?",
    "options": [
      "Mở → đọc/ghi → đóng",
      "Đọc → mở → ghi",
      "Ghi → đóng → mở",
      "Mở → đóng → đọc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ quy trình luôn là mở → đọc/ghi → đóng, giống mở sổ, viết, gấp sổ.\n✓ Mở → đọc/ghi → đóng là thứ tự đúng\n✗ Đọc trước khi mở là vô lý, chưa mở thì chưa thể đọc\n✗ Ghi trước rồi mới mở sai thứ tự\n✗ Đóng trước khi đọc khiến không đọc được nội dung"
  },
  {
    "id": "prog-q-060",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Những tình huống nào sau đây có thể gây ra exception (ngoại lệ) lúc chạy, theo bài học? (Chọn tất cả đáp án đúng)",
    "options": [
      "Chia một số cho 0",
      "Mở một file không tồn tại",
      "Đổi chuỗi \"abc\" thành số nguyên",
      "Lấy ký tự thứ 100 của chuỗi chỉ có 5 ký tự",
      "Nối hai chuỗi bằng dấu +"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "Bài liệt kê các nguồn lỗi kinh điển: chia 0, file không tồn tại, đổi chữ thành số thất bại, truy cập vị trí không có.\n✓ Chia cho 0 gây ZeroDivisionError / ArithmeticException\n✓ Mở file không tồn tại gây FileNotFoundError / IOException\n✓ Đổi \"abc\" thành số gây ValueError / NumberFormatException\n✓ Lấy vị trí 100 của chuỗi 5 ký tự gây IndexError / IndexOutOfBounds\n✗ Nối hai chuỗi bằng + là thao tác an toàn, không gây exception"
  },
  {
    "id": "prog-q-061",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đoạn code in ra gì?\nchuoi = \"abc\"\ntry:\n    so = int(chuoi)\n    print(\"Số:\", so)\nexcept ValueError:\n    print(\"Không hợp lệ!\")\nprint(\"Chạy tiếp.\")",
    "options": [
      "Không hợp lệ!\\nChạy tiếp.",
      "Số: abc\\nChạy tiếp.",
      "Không hợp lệ!",
      "Chương trình văng, không in gì sau lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "int(\"abc\") ném ValueError, khối except bắt và in \"Không hợp lệ!\", sau đó chương trình tiếp tục in \"Chạy tiếp.\".\n✓ In \"Không hợp lệ!\" rồi \"Chạy tiếp.\" vì try/catch đỡ lỗi, chương trình không văng\n✗ Không in \"Số:\" vì int(\"abc\") thất bại trước khi tới dòng print đó\n✗ Thiếu \"Chạy tiếp.\" là sai vì dòng đó nằm ngoài try, luôn chạy\n✗ Không văng vì đã có except bắt lỗi"
  },
  {
    "id": "prog-q-062",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong JavaScript, parseInt(\"abc\") khác với int(\"abc\") của Python ở điểm nào?",
    "options": [
      "parseInt không văng mà trả về NaN, cần kiểm tra bằng isNaN()",
      "parseInt văng exception giống Python",
      "parseInt trả về 0",
      "parseInt trả về chuỗi rỗng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu: parseInt(\"abc\") không văng mà trả về giá trị đặc biệt NaN, nên phải kiểm tra bằng isNaN().\n✓ Trả về NaN và dùng isNaN() để kiểm tra, không văng như Python\n✗ Không văng exception, đó là khác biệt chính so với int() của Python\n✗ Không trả về 0\n✗ Không trả về chuỗi rỗng, mà trả về NaN"
  },
  {
    "id": "prog-q-063",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Go xử lý lỗi theo triết lý nào khác với try/catch?",
    "options": [
      "Hàm trả về thêm giá trị err, kiểm tra if err != nil",
      "Dùng try/except giống Python",
      "Tự động bỏ qua mọi lỗi",
      "Dùng từ khóa catch để bắt lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu Go đi con đường riêng: hàm trả về thêm err, kiểm tra if err != nil (nil = không có lỗi), gần như không dùng try/catch.\n✓ Trả về err và kiểm tra if err != nil là cách của Go\n✗ Go không dùng try/except\n✗ Go không tự bỏ qua lỗi; lập trình viên phải kiểm tra err\n✗ Go không dùng từ khóa catch"
  },
  {
    "id": "prog-q-064",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, đâu là những thực hành tốt khi xử lý lỗi và validate input? (Chọn tất cả đáp án đúng)",
    "options": [
      "Chỉ bọc try/catch quanh những đoạn thật sự có thể lỗi",
      "Trong catch luôn thông báo hoặc ghi lại lỗi",
      "Thông báo lỗi nói rõ người dùng cần làm gì",
      "Kiểm tra dữ liệu người dùng trước khi dùng",
      "Bọc try/catch quanh toàn bộ chương trình và bỏ qua lỗi im lặng"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "Bài cảnh báo không bọc try/catch quanh toàn bộ rồi catch im lặng, và khuyên validate sớm, thông báo lỗi rõ ràng.\n✓ Chỉ try đoạn thật sự có thể lỗi giúp tránh bug tàng hình\n✓ Trong catch luôn báo/ghi lỗi để không bỏ sót\n✓ Thông báo lỗi nên nói người dùng cần làm gì, tránh thuật ngữ máy móc\n✓ Validate dữ liệu trước khi dùng là nguyên tắc vàng\n✗ Bọc toàn bộ rồi catch im lặng là lỗi người mới hay gặp, tạo bug tàng hình"
  },
  {
    "id": "prog-q-065",
    "courseId": "PROGRAMMING",
    "lesson": "prog-05-strings-errors",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Hàm kiem_tra_tuoi dùng chiến lược 2 lớp. Với đầu vào \"  150 \", thông báo trả về là gì?",
    "options": [
      "Tuổi phải từ 1 đến 120!",
      "Bạn chưa nhập gì cả!",
      "Tuổi phải là một con số!",
      "Hợp lệ: 150 tuổi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "\"  150 \" sau khi cắt khoảng trắng thành \"150\", không rỗng, đổi sang số thành công (150), nhưng vượt khoảng 1-120.\n✓ \"Tuổi phải từ 1 đến 120!\" vì 150 lớn hơn 120\n✗ Không phải \"chưa nhập gì\" vì sau khi trim vẫn còn \"150\"\n✗ Không phải \"phải là con số\" vì 150 đổi sang số thành công\n✗ Không \"Hợp lệ\" vì 150 nằm ngoài khoảng cho phép"
  },
  {
    "id": "prog-q-066",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo phép so sánh trong bài, mối quan hệ giữa class và object giống với cặp nào nhất?",
    "options": [
      "Khuôn bánh và chiếc bánh đúc ra từ khuôn",
      "Hai chiếc bánh giống hệt nhau",
      "Một chiếc bánh và miếng bánh cắt ra",
      "Cái đĩa và cái nĩa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Class là bản thiết kế, object là thực thể cụ thể được tạo ra từ nó.\n✓ Khuôn bánh (thiết kế) đúc ra chiếc bánh (thực thể) đúng với cặp class - object.\n✗ Hai chiếc bánh đều là object, không phải quan hệ class - object.\n✗ Bánh và miếng cắt ra là quan hệ bộ phận, không phải khuôn - sản phẩm.\n✗ Đĩa và nĩa là hai vật khác nhau, không liên quan khuôn - sản phẩm."
  },
  {
    "id": "prog-q-067",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong OOP, \"hành động mà object làm được\" (ví dụ con chó biết sủa, tài khoản biết rút tiền) được gọi là gì?",
    "options": [
      "Phương thức (method)",
      "Thuộc tính (attribute)",
      "Constructor",
      "Class cha"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phương thức là hàm gắn vào class, biểu diễn hành động object làm được.\n✓ Phương thức đúng là hành động object thực hiện như sủa, rút tiền.\n✗ Thuộc tính là dữ liệu object có (tên, số dư), không phải hành động.\n✗ Constructor chỉ là hàm chạy lúc tạo object, không phải mọi hành động.\n✗ Class cha là khái niệm về kế thừa, không phải hành động."
  },
  {
    "id": "prog-q-068",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Cú pháp gọi con chó số 1 sủa được viết đúng là?",
    "options": [
      "cho_1.sua()",
      "sua(cho_1)",
      "Cho.sua()",
      "cho_1 = sua"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Gọi phương thức theo dạng đối_tượng.phương_thức(), dấu chấm đọc là \"của\".\n✓ cho_1.sua() nghĩa là gọi hành động sủa của con chó số 1, đúng cú pháp.\n✗ sua(cho_1) là gọi hàm rời, không phải gọi phương thức trên object.\n✗ Cho.sua() là gọi trên khuôn (class), không phải trên object cụ thể.\n✗ cho_1 = sua là phép gán, không phải lời gọi phương thức."
  },
  {
    "id": "prog-q-069",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho class TaiKhoanNganHang trong bài. Chạy: tk = TaiKhoanNganHang(\"Lan\", 100); tk.gui_tien(50); tk.rut_tien(200); tk.rut_tien(120). Số dư cuối cùng của tk là bao nhiêu?",
    "options": [
      "30",
      "130",
      "80",
      "-20"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lần lượt: gửi 50 thành 150; rút 200 bị từ chối (không đủ), vẫn 150; rút 120 thành 30.\n✓ 30 đúng vì lệnh rút 200 bị chặn còn rút 120 thì thành công.\n✗ 130 sai vì coi như rút 200 thành công (100+50-200 không thể).\n✗ 80 sai vì tính nhầm các bước.\n✗ -20 sai vì rút 200 đã bị từ chối do kiểm tra số dư, không trừ."
  },
  {
    "id": "prog-q-070",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một lập trình viên mới viết trong Python: def __init__(self, ten): ten = ten. Sau khi tạo object, họ thấy object không lưu được tên. Lỗi nằm ở đâu?",
    "options": [
      "Quên self.: phải viết self.ten = ten",
      "Constructor phải tên là constructor",
      "Thiếu từ khoá new khi gán",
      "Phải khai báo kiểu dữ liệu cho ten"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Không có self. thì ten chỉ là biến cục bộ, mất đi khi hàm kết thúc, object không lưu gì.\n✓ Viết self.ten = ten mới gắn dữ liệu vào chính object đó.\n✗ Trong Python constructor có tên cố định __init__, không phải constructor.\n✗ new là từ khoá tạo object trong JS/Java, không liên quan gán trong Python.\n✗ Python không yêu cầu khai báo kiểu cho thuộc tính."
  },
  {
    "id": "prog-q-071",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi tạo tk = TaiKhoanNganHang(\"Lan\", 100) và tk2 = TaiKhoanNganHang(\"Hùng\", 999), bạn gọi tk2.rut_tien(500). Số dư của tk thay đổi thế nào?",
    "options": [
      "Không đổi, vẫn 100 — mỗi object có dữ liệu riêng",
      "Giảm xuống còn 100 - 500 = -400",
      "Giảm còn 0 vì hai object dùng chung số dư",
      "Tăng lên vì tiền của tk2 chuyển sang tk"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Mỗi object giữ một bản sao dữ liệu riêng, nên thao tác trên object này không ảnh hưởng object kia.\n✓ tk vẫn 100 vì tk và tk2 có vùng dữ liệu so_du độc lập.\n✗ tk không bị trừ vì lệnh rút chỉ tác động lên tk2.\n✗ Hai object không dùng chung số dư; mỗi object riêng biệt.\n✗ Không có chuyện tự chuyển tiền giữa hai object."
  },
  {
    "id": "prog-q-072",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Viết TaiKhoanNganHang.rut_tien(50) (gọi trực tiếp trên class) thay vì trên một object. Vì sao bài học nói cách này sai?",
    "options": [
      "Đang gọi hành động trên khuôn, chưa có object cụ thể để thao tác dữ liệu",
      "Tên phương thức rut_tien không tồn tại",
      "Phải truyền thêm tham số self bằng tay",
      "Class không thể chứa phương thức"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phương thức cần một object cụ thể để biết thao tác trên dữ liệu của ai; class chỉ là khuôn.\n✓ Gọi trên khuôn (class) là sai vì chưa có chiếc bánh nào để ăn — phải tạo object trước.\n✗ rut_tien có tồn tại trong class, lỗi không phải do thiếu tên.\n✗ Vấn đề không phải truyền self tay mà là thiếu object.\n✗ Class hoàn toàn có thể chứa phương thức; đó là bản chất của class."
  },
  {
    "id": "prog-q-073",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn cần mô hình hoá quan hệ giữa XeHoi và BanhXe. Cách thiết kế đúng theo bài là?",
    "options": [
      "XeHoi CÓ BanhXe — để BanhXe làm thuộc tính của XeHoi",
      "XeHoi kế thừa BanhXe vì cả hai đều có bánh",
      "BanhXe kế thừa XeHoi vì bánh thuộc về xe",
      "Gộp XeHoi và BanhXe thành một class duy nhất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chỉ kế thừa khi quan hệ \"là một\" đúng; quan hệ \"có một\" thì dùng thuộc tính.\n✓ Xe hơi CÓ bánh xe nên BanhXe nên là thuộc tính của XeHoi.\n✗ XeHoi không LÀ BanhXe, nên kế thừa ở đây là lạm dụng.\n✗ BanhXe cũng không LÀ XeHoi, kế thừa ngược lại vẫn sai.\n✗ Gộp làm một class xoá mất ranh giới mô hình hoá hợp lý."
  },
  {
    "id": "prog-q-074",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho TaiKhoanTietKiem kế thừa TaiKhoanNganHang và có thêm tinh_lai() (cộng 5% số dư). Chạy: tk = TaiKhoanTietKiem(\"Mai\", 1000); tk.rut_tien(100); tk.tinh_lai(). Số dư cuối là?",
    "options": [
      "945",
      "950",
      "900",
      "1050"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "rut_tien(100) thừa hưởng từ class cha đưa số dư về 900; tinh_lai cộng 5% của 900 = 45 thành 945.\n✓ 945 đúng: 900 + làm tròn(900 × 0.05) = 900 + 45.\n✗ 950 sai vì tính lãi trên 1000 thay vì trên 900 sau khi rút.\n✗ 900 sai vì bỏ qua bước tinh_lai cộng lãi.\n✗ 1050 sai vì bỏ qua bước rút 100 trước đó."
  },
  {
    "id": "prog-q-075",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong TaiKhoanTietKiem, phương thức tinh_lai() gọi self.gui_tien(lai) dù class này KHÔNG hề định nghĩa gui_tien. Vì sao vẫn chạy được?",
    "options": [
      "Kế thừa: class con tự động nhận phương thức gui_tien từ class cha",
      "Python tự sinh ra mọi phương thức bắt đầu bằng gui_",
      "gui_tien là hàm toàn cục nên mọi class đều gọi được",
      "Vì tinh_lai và gui_tien trùng tên tham số"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Class con thừa hưởng sẵn mọi thuộc tính và phương thức của class cha nên dùng lại được gui_tien.\n✓ Nhờ kế thừa, gui_tien của class cha có sẵn trong object con.\n✗ Python không tự sinh phương thức theo tiền tố tên.\n✗ gui_tien là phương thức của class cha, không phải hàm toàn cục.\n✗ Trùng tên tham số không liên quan đến việc gọi được phương thức."
  },
  {
    "id": "prog-q-076",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bài nhấn mạnh bên ngoài chỉ gọi tk.rut_tien(200) mà không cần biết bên trong kiểm tra ra sao, và object tự bảo vệ dữ liệu. Đây là biểu hiện của trụ cột OOP nào?",
    "options": [
      "Encapsulation (đóng gói)",
      "Inheritance (kế thừa)",
      "Khởi tạo (instantiate)",
      "So sánh đối tượng (is)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giấu chi tiết bên trong và chỉ phơi ra hành động chính là encapsulation.\n✓ Encapsulation đúng: object tự bảo vệ dữ liệu, người dùng chỉ gọi hành động.\n✗ Inheritance nói về việc class con nhận đặc điểm class cha, khác vấn đề này.\n✗ Khởi tạo là hành động tạo object, không phải việc giấu chi tiết.\n✗ So sánh đối tượng chỉ là kiểm tra hai object có cùng một thực thể hay không."
  },
  {
    "id": "prog-q-077",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài, những phát biểu nào về self / this là ĐÚNG?",
    "options": [
      "Nó trỏ tới chính object đang được xử lý, để phân biệt object này với object khác",
      "Trong Python phải viết self tường minh làm tham số đầu của phương thức",
      "Trong JavaScript/Java dùng this và this có sẵn, không cần khai báo",
      "self là một class cha mặc định mà mọi object kế thừa",
      "self chỉ tồn tại bên ngoài class, dùng để tạo object"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "self/this là cách object tự chỉ vào bản thân bên trong phương thức.\n✓ Nó trỏ tới object hiện tại (vd con An so với con Bình) là mô tả đúng.\n✓ Python yêu cầu viết self tường minh ở đầu mỗi phương thức.\n✓ JavaScript và Java dùng this và this có sẵn, không cần khai báo.\n✗ self không phải class cha mặc định; đó là cách hiểu sai về kế thừa.\n✗ self dùng bên trong phương thức của object, không phải bên ngoài để tạo object."
  },
  {
    "id": "prog-q-078",
    "courseId": "PROGRAMMING",
    "lesson": "prog-06-oop-basics",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những phát biểu nào về constructor là ĐÚNG theo bài học?",
    "options": [
      "Là hàm đặc biệt tự chạy đúng một lần khi object được tạo",
      "Thường dùng để nhận nguyên liệu và gán vào thuộc tính của object mới",
      "Trong Java constructor trùng tên với class",
      "Go có constructor riêng giống Python, viết là __init__",
      "Phải gọi tay sau khi tạo object thì thuộc tính mới được gán"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Constructor là hàm khởi tạo tự chạy khi object ra đời để gán giá trị ban đầu.\n✓ Nó tự chạy đúng một lần khi object được tạo.\n✓ Nó nhận nguyên liệu (tên, tuổi...) và gán vào thuộc tính object mới.\n✓ Trong Java constructor trùng tên với class.\n✗ Go KHÔNG có constructor riêng; lập trình viên tự viết hàm NewXxx theo quy ước.\n✗ Constructor tự chạy khi tạo object, không cần gọi tay sau đó."
  },
  {
    "id": "prog-q-079",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một chương trình chạy không báo lỗi gì, vẫn cho ra kết quả — nhưng kết quả lại sai so với ý muốn (định tính tổng nhưng lại ra tích). Đây là loại lỗi nào?",
    "options": [
      "Lỗi cú pháp (syntax error)",
      "Lỗi khi chạy (runtime error)",
      "Lỗi logic (logic error)",
      "Không phải lỗi, vì chương trình vẫn chạy được"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Chương trình chạy êm nhưng ra kết quả sai ý muốn chính là dấu hiệu của lỗi logic.\n✓ Lỗi logic: đúng cú pháp, chạy được, nhưng làm sai ý — và là loại khó nhất vì máy không báo gì.\n✗ Lỗi cú pháp khiến máy không hiểu và báo ngay, chương trình không chạy được.\n✗ Lỗi khi chạy làm chương trình sập giữa chừng (vd chia cho 0), không phải cho ra kết quả sai êm ru.\n✗ Kết quả sai so với ý muốn vẫn là một bug, dù chương trình không sập."
  },
  {
    "id": "prog-q-080",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, vì sao lỗi logic được coi là loại khó tìm nhất trong ba loại lỗi?",
    "options": [
      "Vì máy tính báo lỗi quá dài dòng khó đọc",
      "Vì chương trình vẫn chạy bình thường, máy không báo gì, chỉ kết quả sai",
      "Vì nó luôn làm chương trình sập ngay lập tức",
      "Vì nó chỉ xuất hiện trong các ngôn ngữ biên dịch"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Lỗi logic khó nhất vì không có dấu hiệu cảnh báo từ máy.\n✓ Chương trình chạy êm ru, không báo lỗi, chỉ cho ra kết quả sai nên rất khó phát hiện nguyên nhân.\n✗ Lỗi logic thường không kèm thông báo lỗi nào cả, nói gì đến dài dòng.\n✗ Làm sập ngay là đặc điểm của lỗi khi chạy, không phải lỗi logic.\n✗ Lỗi logic xảy ra ở mọi ngôn ngữ, không riêng ngôn ngữ biên dịch."
  },
  {
    "id": "prog-q-081",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong Java/Go, hàm tính trung bình có biến `tong` kiểu số nguyên và viết `return tong / len`. Với dữ liệu [8, 8, 9] (tổng 25, 3 phần tử), kết quả trả về sẽ là gì?",
    "options": [
      "8.33",
      "8 (do chia nguyên, mất phần thập phân)",
      "9",
      "Báo lỗi runtime vì kiểu không khớp"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "25 chia 3 trong phép chia nguyên cho ra 8, phần thập phân bị cắt bỏ.\n✓ Vì cả tử và mẫu đều là số nguyên, Java/Go làm phép chia nguyên: 25/3 = 8 (mất 0.33).\n✗ 8.33 chỉ ra được nếu ép một vế sang số thực (double/float64) TRƯỚC khi chia.\n✗ 9 không phải kết quả của bất kỳ phép chia nào ở đây.\n✗ Phép chia nguyên hai số int hoàn toàn hợp lệ, không gây lỗi runtime."
  },
  {
    "id": "prog-q-082",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một biến trong vòng lặp có giá trị bất ngờ. Bạn muốn debug bằng print. Cách in nào hữu ích nhất theo lời khuyên của bài?",
    "options": [
      "print(x) — in mỗi giá trị trần trụi để gọn màn hình",
      "print(\"x =\", x) — in kèm nhãn để biết số nào là số nào",
      "Chỉ in một lần sau khi vòng lặp kết thúc",
      "In toàn bộ 5–6 biến cùng lúc mà không nhãn để thấy hết"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "In kèm nhãn giúp bạn đọc được output, đây là mẹo cốt lõi của print debugging.\n✓ In kèm nhãn (\"x =\", x) cho biết con số thuộc về biến nào — quan sát nhiều dòng số mới không bị lẫn.\n✗ In số trần trụi khiến bạn không biết số nào là biến nào khi có nhiều dòng.\n✗ In một lần sau vòng lặp không cho thấy biến thay đổi qua từng bước — mất ý nghĩa soi từng bước.\n✗ In một loạt số không nhãn còn rối hơn, đi ngược lời khuyên in kèm nhãn."
  },
  {
    "id": "prog-q-083",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đọc stack trace của Python dưới đây, nên bắt đầu đọc từ đâu để biết loại lỗi?\n\nTraceback (most recent call last):\n  File \"main.py\", line 7, in <module>\n  File \"main.py\", line 5, in tinh_toan\n  File \"main.py\", line 2, in chia\nZeroDivisionError: division by zero",
    "options": [
      "Dòng đầu tiên 'Traceback...'",
      "Dòng cuối cùng: tên lỗi và mô tả (ZeroDivisionError)",
      "Dòng giữa, vì nó nằm chính giữa chuỗi",
      "Bất kỳ dòng nào có chữ 'main.py'"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Với Python, tên lỗi và mô tả nằm ở dòng cuối cùng của stack trace.\n✓ Đọc dòng cuối trước: ZeroDivisionError: division by zero cho biết ngay loại và bản chất lỗi.\n✗ Dòng 'Traceback...' chỉ là tiêu đề mở đầu, không cho biết lỗi gì.\n✗ Dòng giữa chỉ là một mắt xích trong chuỗi gọi hàm, không phải tên lỗi.\n✗ Nhiều dòng có 'main.py' nhưng chúng chỉ là vị trí các hàm, tên lỗi mới là thứ cần đọc đầu tiên."
  },
  {
    "id": "prog-q-084",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Stack trace cho thấy chương trình sập tại hàm `chia` (nơi thực hiện `a / b`), nhưng `main` gọi `tinh_toan`, `tinh_toan` gọi `chia(10, 0)`. Số 0 gây lỗi đến từ đâu, và điều này dạy ta nguyên tắc gì?",
    "options": [
      "Lỗi gốc ở `chia`; nơi sập luôn là nơi có lỗi gốc",
      "Số 0 truyền từ `tinh_toan`; nơi sập không phải lúc nào cũng là nơi có lỗi gốc",
      "Lỗi gốc ở `main` vì nó chạy đầu tiên",
      "Không thể biết nguyên nhân từ stack trace"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Domino đổ ở chia, nhưng số 0 được truyền vào từ tinh_toan.\n✓ Số 0 đến từ tinh_toan; bài nhấn mạnh nơi sập không nhất thiết là nơi chứa lỗi gốc.\n✗ chia là nơi đổ vỡ nhưng không phải nơi tạo ra giá trị 0 sai — đó mới là gốc.\n✗ main chỉ khởi động chuỗi gọi, không phải nơi sinh ra số 0.\n✗ Chính stack trace là bản đồ giúp lần ngược chuỗi gọi hàm để tìm nguyên nhân."
  },
  {
    "id": "prog-q-085",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong VS Code, bạn nhấn F5 để debug nhưng chương trình chạy vù một cái rồi kết thúc, không dừng lại ở đâu. Nguyên nhân phổ biến nhất là gì?",
    "options": [
      "Cài sai extension ngôn ngữ",
      "Quên đặt breakpoint trước khi nhấn F5",
      "Dùng nhầm Step Over thay vì Step Into",
      "Chương trình không có hàm main"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Không có breakpoint thì không có điểm nào để chương trình tạm dừng.\n✓ Quên đặt breakpoint: như không có barie trên đường, xe chạy thẳng về đích — đây là lỗi người mới hay gặp.\n✗ Sai extension thường khiến debug không khởi động được, không phải chạy vù rồi xong.\n✗ Step Over/Step Into chỉ dùng SAU khi đã dừng tại breakpoint.\n✗ Thiếu hàm main có thể gây lỗi khác, nhưng triệu chứng 'chạy vù rồi kết thúc' khi debug điển hình là do thiếu breakpoint."
  },
  {
    "id": "prog-q-086",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn đang debug và đặt breakpoint tại dòng GỌI hàm `xu_ly_du_lieu()`. Khi chương trình dừng ở đó, bạn nghi lỗi nằm BÊN TRONG hàm này. Nên dùng nút nào?",
    "options": [
      "Step Over (F10)",
      "Step Into (F11)",
      "Step Out (Shift+F11)",
      "Continue (F5)"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Muốn vào bên trong hàm đang được gọi thì dùng Step Into.\n✓ Step Into nhảy VÀO trong hàm tại dòng hiện tại — đúng nhu cầu xem bên trong xu_ly_du_lieu.\n✗ Step Over chạy hết hàm đó rồi dừng ở dòng kế — bỏ qua phần bên trong, không xem được.\n✗ Step Out dùng khi đang Ở TRONG một hàm và muốn chạy nốt để quay ra, không phải để đi vào.\n✗ Continue phóng tới breakpoint kế tiếp, bỏ qua việc quan sát từng bước trong hàm."
  },
  {
    "id": "prog-q-087",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Bạn vừa được giao tham gia một dự án lớn có sẵn hàng nghìn dòng code lạ. Theo bài, những cách tiếp cận nào là ĐÚNG ĐẮN? (chọn nhiều)",
    "options": [
      "Đọc README, chạy thử chương trình xem nó LÀM GÌ trước khi hiểu nó làm NHƯ THẾ NÀO",
      "Đọc tuần tự từ dòng 1 đến hết file như đọc tiểu thuyết",
      "Chọn một tính năng và lần theo một luồng dữ liệu từ đầu đến cuối",
      "Cố hiểu 100% toàn bộ codebase trước khi dám đụng vào bất cứ thứ gì",
      "Dùng F12 (Go to Definition) và đặt breakpoint chạy debug để 'đọc' code sống động"
    ],
    "correctIndices": [
      0,
      2,
      4
    ],
    "explanation": "Chiến lược đúng là đi từ tổng quan xuống chi tiết và theo luồng thực thi.\n✓ Đọc README rồi chạy thử cho thấy bức tranh tổng quan trước khi đào chi tiết.\n✓ Lần theo MỘT luồng dữ liệu của một tính năng giúp hiểu dần mà không bị quá tải.\n✓ F12 và breakpoint là công cụ đọc code sống động, lần theo luồng thực thi thật.\n✗ Đọc tuần tự dòng 1 đến hết như tiểu thuyết là sai vì code không chạy theo thứ tự viết.\n✗ Cố hiểu 100% trước khi làm gì là sai — nên chấp nhận hiểu 70% rồi vừa làm vừa hiểu thêm."
  },
  {
    "id": "prog-q-088",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn loay hoay 2 tiếng với một bug, đọc thầm code mãi không thấy. Đồng nghiệp gợi ý 'rubber duck debugging'. Tại sao kỹ thuật nói thành lời từng dòng lại hiệu quả?",
    "options": [
      "Vì nói to giúp máy tính nhận diện giọng và tự sửa lỗi",
      "Vì khi đọc thầm não đọc cái bạn TƯỞNG đã viết; nói thành lời buộc xử lý từng chi tiết thật",
      "Vì con vịt cao su có thuật toán phát hiện bug",
      "Vì nói chậm làm chương trình chạy chậm lại để dễ quan sát"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Diễn đạt thành lời buộc bạn đối mặt với code thực tế thay vì phiên bản trong đầu.\n✓ Đọc thầm khiến não lướt qua cái bạn TƯỞNG mình viết; nói thành lời từng dòng buộc xử lý từng chi tiết, lộ ra điểm bất nhất.\n✗ Rubber duck không liên quan gì đến nhận diện giọng nói của máy.\n✗ Con vịt chỉ là vật vô tri để bạn giải thích, nó không có thuật toán nào cả.\n✗ Tốc độ nói không ảnh hưởng tốc độ chạy chương trình."
  },
  {
    "id": "prog-q-089",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Bạn đang HỌC lập trình và muốn dùng AI assistant đúng cách để giỏi lên thật sự. Những hành vi nào phù hợp với tinh thần 'AI là gia sư, không phải người làm bài hộ'? (chọn nhiều)",
    "options": [
      "Khi gặp lỗi, nhờ AI giải thích vì sao lỗi xảy ra và gợi ý hướng sửa, không xin code hoàn chỉnh",
      "Bảo AI 'làm bài này cho tôi' rồi copy-paste thẳng kết quả nộp",
      "Tự thử ít nhất 15–30 phút trước khi hỏi AI",
      "Khi AI đưa đoạn code có chỗ không hiểu, hỏi tiếp cho đến khi hiểu từng dòng",
      "Luôn tin tưởng tuyệt đối code AI đưa mà không cần chạy thử kiểm chứng"
    ],
    "correctIndices": [
      0,
      2,
      3
    ],
    "explanation": "Dùng AI như gia sư nghĩa là vẫn tự tư duy và hiểu mọi thứ nhận về.\n✓ Nhờ AI giải thích vì sao lỗi và gợi ý hướng, không xin code hoàn chỉnh, giúp bạn vẫn tự sửa được.\n✓ Tự thử 15–30 phút trước giữ lại khoảnh khắc não xây kết nối.\n✓ Hỏi đến khi hiểu từng dòng đảm bảo bạn thật sự học chứ không mượn tạm.\n✗ 'Làm bài cho tôi' rồi copy-paste là dùng AI như người làm bài hộ — điểm cao hôm nay, trắng tay ngày thi.\n✗ Tin tuyệt đối không kiểm chứng là sai vì AI có thể bịa (hallucination) rất tự tin."
  },
  {
    "id": "prog-q-090",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn gặp một bug, sửa cùng lúc 4 chỗ rồi chạy lại — và lỗi biến mất. Theo bài, vấn đề của cách làm này là gì?",
    "options": [
      "Không có vấn đề gì, miễn lỗi hết là được",
      "Bạn không biết chỗ nào trong 4 chỗ đã thực sự cứu bạn (và nếu thêm lỗi cũng không biết chỗ nào gây ra)",
      "Chạy lại nhiều lần làm hỏng chương trình",
      "Sửa nhiều chỗ luôn khiến chương trình chạy chậm hơn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Thay đổi nhiều thứ một lúc làm mất khả năng truy ra nguyên nhân.\n✓ Sửa 4 chỗ cùng lúc: hết lỗi thì không biết chỗ nào cứu, thêm lỗi thì không biết chỗ nào gây — nên mỗi lần chỉ thay đổi một thứ.\n✗ 'Miễn hết lỗi là được' sai vì bạn không học được gì và có thể vẫn còn lỗi ẩn.\n✗ Chạy lại chương trình nhiều lần không làm hỏng nó.\n✗ Số chỗ sửa không quyết định tốc độ chạy theo cách này."
  },
  {
    "id": "prog-q-091",
    "courseId": "PROGRAMMING",
    "lesson": "prog-07-debugging",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo checklist debug của bài, khi bí một lỗi bạn nên hỏi AI/bạn bè vào THỜI ĐIỂM nào, và quan trọng là kèm theo gì?",
    "options": [
      "Ngay lập tức khi vừa thấy lỗi, chỉ cần dán code",
      "Sau khi đã tự thử (khoảng 30 phút), kèm mô tả rõ: muốn gì, đã thử gì, lỗi gì",
      "Chỉ sau khi đã sửa xong, để xác nhận lại",
      "Bất cứ lúc nào, không cần mô tả vì AI tự hiểu hết"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Hỏi sau khi tự thử và kèm mô tả đầy đủ giúp nhận được trợ giúp hữu ích nhất.\n✓ Bí sau khoảng 30 phút mới hỏi, kèm mô tả rõ muốn gì, đã thử gì, lỗi gì, đúng như checklist.\n✗ Hỏi ngay lập tức cướp mất khoảnh khắc não tự xây kết nối khi đang bí.\n✗ Hỏi sau khi đã sửa xong thì đâu còn cần trợ giúp để vượt qua chỗ bí.\n✗ Không mô tả khiến người/AI khó nắm vấn đề; mô tả rõ ràng là yêu cầu trong checklist."
  },
  {
    "id": "prog-q-092",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong app CLI quản lý chi tiêu, \"vòng lặp chính\" (main loop) đóng vai trò gì?",
    "options": [
      "Liên tục hiện menu, đọc lựa chọn, xử lý rồi lặp lại cho đến khi người dùng chọn Thoát",
      "Chỉ chạy đúng một lần rồi tự kết thúc chương trình",
      "Đọc toàn bộ file dữ liệu vào bộ nhớ và dừng lại",
      "Vẽ giao diện nút bấm cho người dùng tương tác"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Vòng lặp chính giống nhân viên thu ngân: chào - hỏi - phục vụ - lặp lại cho đến giờ đóng cửa.\n✓ Hiện menu, đọc lựa chọn, xử lý rồi lặp lại đến khi chọn Thoát đúng mô tả main loop.\n✗ Chạy một lần rồi kết thúc thì không phải vòng lặp.\n✗ Đọc file rồi dừng là việc của load, không phải main loop.\n✗ CLI không có nút bấm hay hình ảnh, chỉ gõ phím trong terminal."
  },
  {
    "id": "prog-q-093",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Vì sao bài học khuyên chia dự án thành 5 \"milestone\"?",
    "options": [
      "Mỗi cột mốc xong là app chạy được ngay, dễ kiểm tra từng giai đoạn",
      "Để code chạy nhanh hơn khi biên dịch",
      "Vì trình thông dịch yêu cầu chia file thành 5 phần",
      "Để tránh phải dùng vòng lặp while"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Milestone chia dự án lớn thành bước nhỏ, mỗi bước xong là app chạy được, giống xây nhà từng giai đoạn.\n✓ Mỗi cột mốc cho ra app chạy được và kiểm tra được - đúng tinh thần milestone.\n✗ Chia milestone không liên quan tốc độ biên dịch.\n✗ Không có yêu cầu kỹ thuật nào bắt chia 5 phần.\n✗ Vòng lặp while vẫn được dùng (milestone 1 chính là menu vòng lặp)."
  },
  {
    "id": "prog-q-094",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Người mới hay viết while True cho menu nhưng quên đặt lệnh break ở lựa chọn \"Thoát\". Hậu quả là gì?",
    "options": [
      "App lặp vô tận, phải bấm Ctrl+C để giết chương trình",
      "App tự thoát ngay sau vòng lặp đầu tiên",
      "App in menu hai lần rồi dừng",
      "App từ chối mọi lựa chọn khác ngoài Thoát"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Không có break thì điều kiện while True luôn đúng nên vòng lặp không bao giờ dừng.\n✓ Lặp vô tận, phải Ctrl+C - đúng hậu quả bài cảnh báo.\n✗ Tự thoát ngay là điều ngược lại với lỗi này.\n✗ In hai lần rồi dừng không xảy ra vì không có gì làm dừng vòng lặp.\n✗ Việc thiếu break không liên quan đến xử lý các lựa chọn khác."
  },
  {
    "id": "prog-q-095",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bài học khuyên gói mô tả, số tiền, danh mục vào một class Expense thay vì lưu trong 3 danh sách rời rạc. Lý do chính là gì?",
    "options": [
      "Tránh lệch pha dữ liệu (vd mô tả thứ 5 nhưng số tiền lại là thứ 6)",
      "Class giúp chương trình chạy nhanh hơn nhiều lần",
      "Danh sách không thể chứa số tiền dạng số thực",
      "Mỗi ngôn ngữ chỉ cho phép tối đa 2 danh sách"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Ba mảnh thông tin dính liền nhau; lưu rời rạc dễ lệch pha giữa các danh sách.\n✓ Tránh lệch pha dữ liệu đúng là lý do gói vào một khối như tờ phiếu điền sẵn.\n✗ Lý do không phải tốc độ chạy.\n✗ Danh sách hoàn toàn chứa được số thực.\n✗ Không có giới hạn số lượng danh sách nào như vậy."
  },
  {
    "id": "prog-q-096",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Hàm read_amount dùng vòng lặp while True bao quanh việc nhập số. Khi người dùng gõ \"ba mươi\" rồi sau đó gõ \"30000\", chuyện gì xảy ra?",
    "options": [
      "Lần đầu báo lỗi và hỏi lại; lần sau nhận 30000 và trả về",
      "Hàm trả về 0 vì lần đầu nhập sai",
      "Hàm ném lỗi và làm app sập ngay lần đầu",
      "Hàm bỏ qua cả hai lần nhập và trả về giá trị mặc định"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy tắc vàng của validate là lặp đến khi hợp lệ, cho người dùng cơ hội nhập lại ngay trong hàm.\n✓ Lần sai báo lỗi rồi hỏi lại, lần hợp lệ mới return - đúng hành vi read_amount.\n✗ Hàm không trả 0; số tiền phải lớn hơn 0 mới được nhận.\n✗ try/except bắt lỗi parse nên app không sập.\n✗ Không có giá trị mặc định; hàm chỉ thoát khi có số hợp lệ."
  },
  {
    "id": "prog-q-097",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một lập trình viên đặt dòng expenses = [] BÊN TRONG vòng lặp while của menu. Triệu chứng sẽ là gì?",
    "options": [
      "Thêm bao nhiêu khoản chi cũng \"mất\" vì danh sách bị xóa trắng mỗi vòng lặp",
      "App báo lỗi cú pháp và không chạy được",
      "Số tiền bị tính sai thành số âm",
      "Menu chỉ hiện được đúng một lần"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Biến lưu trữ lâu dài phải khai báo TRƯỚC vòng lặp; đặt trong vòng lặp thì mỗi vòng gán lại danh sách rỗng.\n✓ Thêm rồi vẫn mất vì danh sách bị reset mỗi vòng - đúng triệu chứng bài cảnh báo.\n✗ Đây là lỗi logic, không phải lỗi cú pháp.\n✗ Vị trí khai báo danh sách không làm số tiền thành âm.\n✗ Menu vẫn hiện mỗi vòng lặp bình thường."
  },
  {
    "id": "prog-q-098",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Ở milestone 4, để thống kê tổng tiền theo từng danh mục, cấu trúc dữ liệu phù hợp nhất là gì?",
    "options": [
      "Dictionary/map với khóa là tên danh mục, giá trị là tổng tiền danh mục đó",
      "Một danh sách phẳng chứa tất cả số tiền không kèm tên danh mục",
      "Một biến số duy nhất cộng dồn toàn bộ",
      "Một class Expense mới cho mỗi danh mục"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Map là bảng tra cứu khóa đến giá trị, lý tưởng để gom tổng theo tên danh mục.\n✓ Map khóa danh mục đến tổng tiền đúng cách thống kê theo danh mục.\n✗ Danh sách phẳng không gắn được tiền với danh mục.\n✗ Một biến cộng dồn chỉ cho tổng chung, không tách theo danh mục.\n✗ Tạo class mới cho mỗi danh mục là thừa và không giải quyết việc cộng dồn."
  },
  {
    "id": "prog-q-099",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Java, viết line.split(\"|\") để tách dòng \"Ăn sáng|30000|Ăn uống\" lại không cho kết quả như mong đợi. Vì sao và sửa thế nào?",
    "options": [
      "split nhận regex và \"|\" là ký tự đặc biệt; phải viết split(\"\\\\|\")",
      "Java không hỗ trợ tách chuỗi; phải dùng vòng lặp ký tự thủ công",
      "Dấu | phải đổi thành dấu phẩy mới tách được",
      "Phải gọi split hai lần liên tiếp mới đúng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Tham số của split trong Java là regex, mà | là ký tự đặc biệt trong regex nên cần escape.\n✓ Viết split(\"\\\\|\") để escape ký tự đặc biệt - đúng cách sửa bài nêu.\n✗ Java có split bình thường, không cần lặp ký tự thủ công.\n✗ Bài cố ý dùng | để mô tả chứa được dấu phẩy; không phải đổi sang phẩy.\n✗ Gọi split hai lần không sửa được vấn đề escape regex."
  },
  {
    "id": "prog-q-100",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bài học nói nên gọi save_expenses() sau MỖI lần thêm thay vì chỉ lưu một lần trước khi thoát. Lợi ích chính của lựa chọn này là gì?",
    "options": [
      "Lỡ app bị tắt đột ngột cũng không mất dữ liệu đã thêm",
      "Giúp tính tổng theo danh mục chính xác hơn",
      "Giảm số dòng trong file expenses.txt",
      "Tránh phải gọi load_expenses lúc khởi động"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lưu sau mỗi lần thêm an toàn hơn vì dữ liệu đã được ghi xuống ổ cứng ngay.\n✓ App tắt đột ngột vẫn không mất gì - đúng lợi ích bài nêu.\n✗ Thời điểm lưu file không ảnh hưởng độ chính xác của phép tính tổng.\n✗ Lưu thường xuyên không làm giảm số dòng dữ liệu.\n✗ Vẫn cần load_expenses một lần lúc khởi động để nạp dữ liệu cũ."
  },
  {
    "id": "prog-q-101",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong load_expenses (Python), khi chạy app LẦN ĐẦU và file expenses.txt chưa tồn tại, điều gì xảy ra?",
    "options": [
      "FileNotFoundError bị bắt và bỏ qua, hàm trả về danh sách rỗng - bình thường",
      "App sập vì không tìm thấy file",
      "App tự tạo file rồi điền dữ liệu mẫu vào",
      "Hàm trả về None khiến vòng lặp menu lỗi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khối try/except bắt FileNotFoundError và pass, coi đó là chuyện bình thường lần chạy đầu.\n✓ Bắt lỗi rồi trả danh sách rỗng - đúng thiết kế cho lần chạy đầu.\n✗ App không sập vì lỗi đã được bắt.\n✗ Hàm không tạo file hay điền dữ liệu mẫu; file chỉ được tạo khi save.\n✗ Hàm khởi tạo expenses = [] từ đầu nên trả danh sách rỗng, không phải None."
  },
  {
    "id": "prog-q-102",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bài học chọn dấu \"|\" thay vì dấu phẩy để ngăn cách các trường trong file. Lý do là gì?",
    "options": [
      "Để phần mô tả có thể chứa dấu phẩy thoải mái mà không làm sai cấu trúc dòng",
      "Vì hệ điều hành cấm lưu dấu phẩy trong file",
      "Vì dấu | chiếm ít dung lượng hơn dấu phẩy",
      "Vì chỉ dấu | mới ghi được tiếng Việt có dấu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dùng | làm dấu ngăn để mô tả chứa được dấu phẩy mà không phá vỡ việc tách trường.\n✓ Mô tả chứa dấu phẩy thoải mái - đúng lý do bài nêu.\n✗ Hệ điều hành không cấm dấu phẩy trong file.\n✗ Hai ký tự cùng kích thước, không liên quan dung lượng.\n✗ Encoding utf-8 mới quyết định ghi tiếng Việt, không phải dấu ngăn cách."
  },
  {
    "id": "prog-q-103",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài học, những trường hợp nào hàm validate nhập số tiền (read_amount) PHẢI từ chối và yêu cầu nhập lại? (Chọn tất cả đáp án đúng)",
    "options": [
      "Người dùng gõ \"ba mươi nghìn\" thay vì chữ số",
      "Người dùng gõ một số âm như -5000",
      "Người dùng gõ số 0",
      "Người dùng gõ 30000",
      "Người dùng gõ 7000"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "read_amount chỉ trả về khi parse được số VÀ số đó lớn hơn 0.\n✓ \"ba mươi nghìn\" không parse được thành số nên bị từ chối.\n✓ Số âm -5000 không lớn hơn 0 nên bị từ chối.\n✓ Số 0 cũng không thỏa điều kiện lớn hơn 0 (amount <= 0 bị loại).\n✗ 30000 là số hợp lệ và dương nên được nhận.\n✗ 7000 cũng hợp lệ và dương nên được nhận."
  },
  {
    "id": "prog-q-104",
    "courseId": "PROGRAMMING",
    "lesson": "prog-08-mini-project",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Checklist nghiệm thu liệt kê các bài test một tester chuyên nghiệp nên chạy. Những kỳ vọng nào dưới đây ĐÚNG theo bài? (Chọn tất cả đáp án đúng)",
    "options": [
      "Gõ lựa chọn lung tung (9, abc, Enter trống) thì app báo lỗi nhẹ nhàng, không sập",
      "Tắt app rồi mở lại thì các khoản chi đã thêm vẫn còn",
      "Xóa file expenses.txt rồi chạy thì app không sập, bắt đầu sổ mới",
      "Nhập số tiền âm thì app tự đổi thành số dương rồi lưu",
      "Xem tổng thì con số phải khớp khi tự cộng tay"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "Checklist nhấn mạnh app phải bền bỉ với input xấu, dữ liệu sống sót, và tính toán đúng.\n✓ Input lung tung phải được báo lỗi nhẹ nhàng, không sập.\n✓ Tắt mở lại vẫn còn dữ liệu là bài test quan trọng nhất.\n✓ Xóa file rồi chạy thì app bắt đầu sổ mới chứ không sập.\n✓ Tổng phải khớp khi cộng tay - đúng tiêu chí kiểm thử.\n✗ App không tự đổi số âm thành dương; nó từ chối và yêu cầu nhập lại."
  },
  {
    "id": "prog-q-105",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, nguyên tắc vàng khi tách code thành module là gì?",
    "options": [
      "Mỗi module nên có một trách nhiệm rõ ràng",
      "Mỗi module nên gom càng nhiều hàm càng tốt để tiện import",
      "Mỗi module phải có đúng một hàm duy nhất",
      "Mỗi module nên trộn nhiều việc để giảm số file"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu rõ: một module nên có một trách nhiệm rõ ràng (file payment lo thanh toán, file email lo gửi mail).\n✓ Một trách nhiệm rõ ràng đúng tinh thần chia nhỏ để giới hạn vùng ảnh hưởng.\n✗ Gom càng nhiều càng tốt đi ngược mục tiêu dễ đọc, dễ test.\n✗ Đúng một hàm duy nhất quá cực đoan; module chứa code có liên quan, không giới hạn một hàm.\n✗ Trộn nhiều việc chính là điều bài khuyên tránh."
  },
  {
    "id": "prog-q-106",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, đâu là điểm khác biệt giữa \"module\" và \"package\"?",
    "options": [
      "Module là một file (hoặc thư mục) chứa code liên quan; package là một nhóm module được đóng gói để chia sẻ",
      "Module là code của người khác; package là code của bạn",
      "Module chỉ có ở Python; package chỉ có ở JavaScript",
      "Module và package là hai tên gọi y hệt nhau cho cùng một thứ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài định nghĩa module là một file/thư mục chứa code liên quan, package là nhóm module được đóng gói để chia sẻ.\n✓ File/thư mục code liên quan vs nhóm module đóng gói là đúng định nghĩa trong bài.\n✗ Của người khác vs của bạn không phải tiêu chí phân biệt.\n✗ Cả hai khái niệm tồn tại ở mọi ngôn ngữ trong bài, không riêng một ngôn ngữ.\n✗ Chúng không phải tên gọi y hệt; khác về phạm vi."
  },
  {
    "id": "prog-q-107",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong Go, bạn đặt hàm tên `add` (chữ thường) trong package mathutils rồi cố gọi `mathutils.add(2,3)` từ package khác. Chuyện gì xảy ra?",
    "options": [
      "Không gọi được vì tên viết thường không được export ra ngoài package",
      "Gọi được bình thường vì cùng module thì mọi thứ đều thấy nhau",
      "Gọi được nhưng luôn trả về 0",
      "Báo lỗi cú pháp vì Go không cho phép hàm tên add"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong Go, quy ước tên viết HOA mới là export; tên viết thường chỉ thấy trong cùng package.\n✓ Không export được vì viết thường là đúng cảnh báo lỗi người mới trong bài.\n✗ Cùng module không tự thấy nhau; phải viết hoa mới export ra package khác.\n✗ Không phải trả về 0; vấn đề là không truy cập được, không phải sai giá trị.\n✗ Không phải lỗi cú pháp; add là tên hợp lệ, chỉ là không export."
  },
  {
    "id": "prog-q-108",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong JavaScript ESM, bạn quên ghi `export` trước một hàm rồi `import` nó ở file khác. Triệu chứng điển hình theo bài là gì?",
    "options": [
      "Giá trị import được là `undefined`, không có thông báo lỗi rõ ràng",
      "Trình biên dịch chặn lại với lỗi \"missing export\" ngay khi chạy",
      "Hàm vẫn dùng được bình thường vì JS export tất cả mặc định",
      "Toàn bộ file bị xoá khỏi node_modules"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nói trong JS ESM quên export thì import sẽ ra undefined, không báo lỗi rõ ràng nên rất khó chịu.\n✓ undefined không báo lỗi rõ đúng mô tả của bài.\n✗ Không có lỗi missing export rõ ràng; chính vì im lặng nên khó debug.\n✗ JS ESM phải ghi rõ export, không export tất cả mặc định (đó là Python).\n✗ Việc này không liên quan tới xoá file trong node_modules."
  },
  {
    "id": "prog-q-109",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, những thứ nào BẠN NÊN làm khi quản lý phụ thuộc trong git? (chọn tất cả đáp án đúng)",
    "options": [
      "Commit file khai báo phụ thuộc như requirements.txt, package.json, go.mod",
      "Thêm node_modules/ và venv/ vào .gitignore",
      "Commit cả thư mục node_modules/ để người khác khỏi cài lại",
      "Ghim (pin) phiên bản thư viện để dự án chạy giống nhau trên mọi máy",
      "Commit thư mục venv/ để chắc chắn ai cũng có cùng Python"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "Bài khuyên commit file khai báo phụ thuộc, ghim version, và KHÔNG commit node_modules/venv.\n✓ Commit file khai báo phụ thuộc giúp người khác clone về cài đủ đồ bằng một lệnh.\n✓ Thêm node_modules/venv vào .gitignore là đúng khuyến nghị.\n✓ Ghim phiên bản giúp dự án chạy nhất quán trên mọi máy.\n✗ Commit node_modules nặng hàng trăm MB và tái tạo được từ file khai báo nên không nên.\n✗ Commit venv cũng bị bài cấm vì cùng lý do."
  },
  {
    "id": "prog-q-110",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Vấn đề: dự án A cần requests 2.20, dự án B cần 2.30. Theo bài, giải pháp nào tránh việc chúng đè nhau?",
    "options": [
      "Cách ly từng dự án bằng virtual env (venv) hoặc thư mục node_modules riêng",
      "Cài cả hai phiên bản chung vào hệ thống và chọn lúc chạy",
      "Xoá dự án A đi và chỉ giữ một phiên bản duy nhất",
      "Đổi tên thư viện requests trong một dự án thành requests2"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu giải pháp là cách ly từng dự án: venv cho Python, node_modules trong dự án cho JS.\n✓ Cách ly từng dự án qua venv/node_modules đúng tinh thần bài.\n✗ Cài chung vào hệ thống chính là nguyên nhân gây đè nhau.\n✗ Xoá một dự án không giải quyết được nhu cầu hai phiên bản song song.\n✗ Đổi tên thư viện là cách chắp vá, không phải giải pháp cách ly mà bài dạy."
  },
  {
    "id": "prog-q-111",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, lợi ích LỚN NHẤT của unit test là gì?",
    "options": [
      "Cho bạn sự tự tin sửa code ngày mai mà không sợ làm vỡ thứ đang chạy",
      "Giúp chương trình chạy nhanh hơn khi triển khai",
      "Thay thế hoàn toàn nhu cầu đọc lại code",
      "Bắt được mọi bug có thể có ngay trong hôm nay"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nhấn mạnh giá trị thật của test là sự tự tin khi sửa code ngày mai, không phải bắt bug hôm nay.\n✓ Tự tin sửa code mà không làm vỡ cái cũ đúng thông điệp cốt lõi của bài.\n✗ Test không làm chương trình chạy nhanh hơn.\n✗ Test không thay thế việc đọc code.\n✗ Bài nói rõ lợi ích lớn nhất KHÔNG phải bắt bug hôm nay."
  },
  {
    "id": "prog-q-112",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn viết test cho hàm `add`: `assert add(2, 3) == add(2, 3)`. Vì sao đây là test vô dụng và sửa thế nào?",
    "options": [
      "Nó so kết quả hàm với chính nó nên luôn xanh mà không kiểm tra gì; phải so với giá trị mong đợi tự tính tay, ví dụ == 5",
      "Nó gọi hàm hai lần nên chậm; chỉ cần gọi một lần là đủ",
      "Nó thiếu từ khoá expect nên không phải test thật; thêm expect là xong",
      "Nó dùng == thay vì ===; đổi sang === sẽ kiểm tra đúng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài cảnh báo so kết quả hàm với chính output của nó khiến test luôn xanh mà không kiểm tra gì; phải so với giá trị mong đợi tự tính tay.\n✓ So với chính nó nên vô nghĩa; sửa thành == 5 đúng lời khuyên của bài.\n✗ Vấn đề không phải tốc độ gọi hai lần.\n✗ assert thủ công vẫn là test hợp lệ; không bắt buộc dùng expect.\n✗ Đổi == sang === không giải quyết gốc rễ là so sai đối tượng."
  },
  {
    "id": "prog-q-113",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Theo bố cục AAA, dòng `result = total_with_tax(cart, tax_rate)` thuộc bước nào, và đâu là thứ tự đúng của AAA?",
    "options": [
      "Act; thứ tự là Arrange - Act - Assert",
      "Assert; thứ tự là Assert - Act - Arrange",
      "Arrange; thứ tự là Act - Arrange - Assert",
      "Act; thứ tự là Act - Assert - Arrange"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "AAA gồm Arrange (chuẩn bị), Act (gọi hàm cần kiểm tra), Assert (so sánh); dòng gọi hàm là bước Act.\n✓ Gọi hàm là Act và thứ tự Arrange - Act - Assert đúng như bài định nghĩa.\n✗ So sánh kết quả mới là Assert, không phải dòng gọi hàm.\n✗ Chuẩn bị dữ liệu mới là Arrange; thứ tự liệt kê cũng sai.\n✗ Thứ tự Act - Assert - Arrange không đúng trình tự bài nêu."
  },
  {
    "id": "prog-q-114",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Với hàm `divide(a, b)`, theo phân loại trong bài, những test nào dưới đây là hợp lý nên viết? (chọn tất cả đáp án đúng)",
    "options": [
      "divide(10, 2) == 5 (trường hợp bình thường)",
      "divide(0, 5) == 0 (trường hợp biên)",
      "divide(10, 0) phải báo lỗi chia cho 0 (trường hợp lỗi)",
      "Kiểm tra rằng 1 + 1 == 2 luôn đúng trong ngôn ngữ",
      "Kiểm tra rằng divide là một hàm chứ không phải biến"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bài hướng dẫn test ba loại: bình thường, biên, lỗi; và khuyên đừng test những thứ hiển nhiên.\n✓ divide(10,2)==5 là trường hợp bình thường điển hình.\n✓ divide(0,5)==0 là trường hợp biên (số 0).\n✓ divide(10,0) báo lỗi là trường hợp lỗi cần kiểm tra.\n✗ 1+1==2 là thứ hiển nhiên của ngôn ngữ, bài bảo đừng test.\n✗ Kiểm tra divide là hàm không phải hành vi nghiệp vụ cần test."
  },
  {
    "id": "prog-q-115",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Theo bài, một test tốt có ba đặc tính nào sau đây?",
    "options": [
      "Độc lập, lặp lại được, và kiểm tra đúng một thứ",
      "Phụ thuộc test chạy trước, ngẫu nhiên, và kiểm tra nhiều thứ một lúc",
      "Chạy thật nhanh, dùng tên ngắn như test1, và không cần assert",
      "Luôn xanh, không bao giờ đỏ, và bao phủ 100% dòng code"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu test tốt là độc lập, lặp lại được và kiểm tra đúng một thứ; tên nên mô tả hành vi.\n✓ Độc lập, lặp lại được, kiểm tra một thứ đúng nguyên văn bài.\n✗ Phụ thuộc test khác và ngẫu nhiên là ngược lại đặc tính tốt.\n✗ Tên như test1 bị bài chê; assert là cốt lõi không thể bỏ.\n✗ Luôn xanh không phải tiêu chí; test phải đỏ khi code sai mới có giá trị."
  },
  {
    "id": "prog-q-116",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Ghép đúng package manager với ngôn ngữ theo bảng trong bài?",
    "options": [
      "Python dùng pip, JavaScript dùng npm, Go dùng go modules",
      "Python dùng npm, JavaScript dùng pip, Go dùng Maven",
      "Python dùng Maven, JavaScript dùng go modules, Go dùng npm",
      "Python dùng go modules, JavaScript dùng Maven, Go dùng pip"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bảng trong bài: Python - pip, JavaScript - npm, Java - Maven/Gradle, Go - go modules.\n✓ pip cho Python, npm cho JavaScript, go modules cho Go là đúng bảng.\n✗ Hoán đổi pip và npm giữa Python và JS là sai.\n✗ Maven là của Java, không phải Python hay JS.\n✗ Toàn bộ ghép sai chéo các trình quản lý gói."
  },
  {
    "id": "prog-q-117",
    "courseId": "PROGRAMMING",
    "lesson": "prog-09-modules-testing",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Dòng `dayjs@^1.11.0` trong khai báo phụ thuộc nghĩa là gì theo bài?",
    "options": [
      "Chấp nhận bản 1.11.0 trở lên nhưng dưới 2.0",
      "Chỉ chấp nhận đúng bản 1.11.0, không hơn không kém",
      "Chấp nhận mọi bản từ 1.11.0 trở lên kể cả 2.x, 3.x",
      "Luôn tải bản mới nhất hiện có dù là bản nào"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài giải thích ^1.11.0 nghĩa là chấp nhận từ 1.11.0 trở lên nhưng dưới 2.0.\n✓ Từ 1.11.0 trở lên và dưới 2.0 đúng ý nghĩa của dấu ^.\n✗ Chỉ đúng 1.11.0 là cách ghim cứng, không có dấu ^.\n✗ Bao gồm 2.x, 3.x là sai vì ^ chặn ở mốc major kế tiếp.\n✗ Luôn lấy bản mới nhất không phải ý nghĩa của ^1.11.0."
  },
  {
    "id": "prog-q-118",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn có file nhatky.txt chứa sẵn 100 dòng. Bạn muốn THÊM một dòng mới vào cuối mà KHÔNG mất dữ liệu cũ. Nên mở file với chế độ nào?",
    "options": [
      "Chế độ \"a\" (append)",
      "Chế độ \"w\" (write)",
      "Chế độ \"r\" (read)",
      "Phải xoá file rồi tạo lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chế độ append ghi nối thêm vào cuối, giữ nguyên nội dung cũ.\n✓ \"a\" (append) ghi tiếp vào cuối file, không xoá dữ liệu sẵn có.\n✗ \"w\" (write) ghi đè, xoá sạch 100 dòng cũ trước khi ghi.\n✗ \"r\" chỉ để đọc, không ghi được.\n✗ Không cần xoá rồi tạo lại; append làm đúng việc này gọn gàng."
  },
  {
    "id": "prog-q-119",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Định dạng nào được mô tả là cách phổ biến nhất để lưu dữ liệu CÓ CẤU TRÚC và trao đổi giữa các hệ thống (API, file cấu hình)?",
    "options": [
      "JSON",
      "CSV",
      "File văn bản thuần (.txt)",
      "Biến môi trường"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "JSON là định dạng chuẩn cho dữ liệu có cấu trúc (object, mảng, lồng nhau).\n✓ JSON biểu diễn object {}, mảng [], chuỗi, số... rất hợp dữ liệu phân cấp.\n✗ CSV chỉ là bảng phẳng dòng-cột, khó biểu diễn cấu trúc lồng nhau.\n✗ File .txt là text tự do, không có quy tắc cấu trúc.\n✗ Biến môi trường chứa cấu hình/bí mật, không phải định dạng trao đổi dữ liệu lồng nhau."
  },
  {
    "id": "prog-q-120",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, vì sao luôn nên chỉ định encoding=\"utf-8\" khi đọc/ghi text, đặc biệt với tiếng Việt?",
    "options": [
      "Nếu không, máy có thể dùng encoding mặc định của hệ điều hành khiến tiếng Việt thành ký tự lỗi",
      "UTF-8 giúp file chạy nhanh hơn",
      "UTF-8 tự động đóng file giúp bạn",
      "Không chỉ định thì file không mở được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Không khai báo encoding thì máy dùng mặc định của OS, gây lỗi dấu tiếng Việt (mojibake).\n✓ Encoding mặc định (vd Windows cp1252) khác UTF-8 sẽ biến tiếng Việt thành ký tự loằng ngoằng như Ã¢.\n✗ UTF-8 không liên quan tốc độ chạy.\n✗ Đóng file là cơ chế khác (with/try-with-resources), không phải do encoding.\n✗ File vẫn mở được nhưng nội dung có dấu sẽ bị hỏng."
  },
  {
    "id": "prog-q-121",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cho object {ten: \"An\", thich: [\"code\", \"trà sữa\"]}. Sau khi stringify rồi parse lại thành biến lai, lệnh in lai.thich[0] cho kết quả gì?",
    "options": [
      "code",
      "trà sữa",
      "[\"code\", \"trà sữa\"]",
      "An"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "thich là mảng, phần tử chỉ số 0 là \"code\".\n✓ thich[0] truy cập phần tử đầu của mảng, chính là \"code\".\n✗ \"trà sữa\" là phần tử chỉ số 1, không phải [0].\n✗ Cả mảng chỉ in khi viết lai.thich, không có [0].\n✗ \"An\" là giá trị của khoá ten, không liên quan thich[0]."
  },
  {
    "id": "prog-q-122",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bạn báo lỗi: file config.json parse thất bại. Nội dung file là: {\"a\": 1, \"b\": 2,}. Nguyên nhân là gì?",
    "options": [
      "JSON không cho phép dấu phẩy thừa ở cuối object",
      "Thiếu encoding utf-8",
      "Số phải để trong nháy kép",
      "JSON không cho phép nhiều hơn một khoá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dấu phẩy sau giá trị cuối (trailing comma) khiến JSON parse lỗi.\n✓ JSON không cho phép dấu phẩy thừa ở cuối; phải bỏ dấu phẩy sau số 2.\n✗ Encoding không gây lỗi cú pháp parse kiểu này.\n✗ Số trong JSON viết trần, không cần nháy kép.\n✗ JSON cho phép nhiều khoá; đó không phải vấn đề."
  },
  {
    "id": "prog-q-123",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "File CSV có ô địa chỉ \"Hà Nội, Việt Nam\" (bọc trong nháy vì chứa dấu phẩy). Cách xử lý nào ĐÚNG để không tách nhầm cột?",
    "options": [
      "Dùng thư viện CSV chuyên dụng (vd csv của Python, encoding/csv của Go)",
      "Tự split(\",\") từng dòng",
      "Thay tất cả dấu phẩy bằng dấu chấm phẩy trước khi split",
      "Đọc cả file thành một chuỗi rồi bỏ qua header"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thư viện CSV hiểu quy tắc nháy nên không tách nhầm ô chứa dấu phẩy.\n✓ Thư viện CSV xử lý đúng dấu nháy, ký tự xuống dòng trong ô và escape.\n✗ Tự split(\",\") sẽ cắt \"Hà Nội, Việt Nam\" thành hai cột sai.\n✗ Thay dấu phẩy làm hỏng dữ liệu gốc và vẫn không chuẩn.\n✗ Bỏ qua header không giải quyết việc tách ô có dấu phẩy."
  },
  {
    "id": "prog-q-124",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Chạy lệnh: python thongke.py duong_dan.csv --top 5. Trong Python, sys.argv[1] có giá trị gì?",
    "options": [
      "duong_dan.csv",
      "thongke.py",
      "--top",
      "5"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "argv[0] là tên script, tham số thật bắt đầu từ argv[1].\n✓ argv[1] là tham số đầu tiên sau tên script, tức \"duong_dan.csv\".\n✗ \"thongke.py\" là argv[0] (tên script).\n✗ \"--top\" là argv[2].\n✗ \"5\" là argv[3]."
  },
  {
    "id": "prog-q-125",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo quy tắc vàng về múi giờ trong bài, nên lưu trữ thời gian như thế nào?",
    "options": [
      "Lưu bằng UTC, chỉ đổi sang giờ địa phương khi hiển thị",
      "Lưu bằng giờ địa phương của máy chủ",
      "Lưu cả UTC lẫn giờ địa phương trong cùng một trường",
      "Lưu dạng \"11/06/2026\" cho dễ đọc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lưu UTC thống nhất, chỉ chuyển sang giờ địa phương khi hiển thị cho người dùng.\n✓ Lưu UTC tránh tính sai khoảng cách thời gian giữa các sự kiện.\n✗ Lưu giờ địa phương lẫn lộn sớm muộn gây tính toán sai.\n✗ Trộn UTC và giờ địa phương trong một trường gây mơ hồ.\n✗ Kiểu \"11/06/2026\" dễ nhầm ngày với tháng; nên dùng ISO 8601."
  },
  {
    "id": "prog-q-126",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong Python, os.environ.get(\"API_KEY\") và os.environ[\"API_KEY\"] khác nhau ra sao khi biến API_KEY CHƯA được đặt?",
    "options": [
      "get(...) trả về None (hoặc giá trị mặc định nếu truyền), còn [...] gây lỗi",
      "Cả hai đều trả về None",
      "Cả hai đều gây lỗi",
      "get(...) gây lỗi, [...] trả về chuỗi rỗng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "get an toàn khi biến thiếu, còn truy cập bằng [] bắt buộc biến phải tồn tại.\n✓ environ.get cho phép giá trị mặc định, thiếu biến không gây lỗi; environ[...] thiếu biến sẽ lỗi.\n✗ Không phải cả hai đều trả None; [...] sẽ ném lỗi.\n✗ Không phải cả hai đều lỗi; get xử lý êm.\n✗ Ngược lại: get mới là cách an toàn, không phải [...]."
  },
  {
    "id": "prog-q-127",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Chương trình đọc \"data.csv\" (đường dẫn tương đối) chạy tốt khi bạn ngồi trong thư mục dự án, nhưng đồng nghiệp chạy từ thư mục khác lại báo \"không tìm thấy file\". Nguyên nhân chính là gì?",
    "options": [
      "Đường dẫn tương đối được tính từ thư mục đang chạy lệnh, không phải thư mục chứa code",
      "File CSV bị sai encoding",
      "Quên đóng file sau khi đọc",
      "JSON có dấu phẩy thừa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đường dẫn tương đối phụ thuộc thư mục làm việc hiện tại, nên đổi chỗ chạy là không tìm thấy.\n✓ \"data.csv\" được tính từ thư mục bạn chạy lệnh, chạy từ chỗ khác sẽ không thấy file.\n✗ Encoding sai gây ký tự lỗi, không gây lỗi không tìm thấy file.\n✗ Quên đóng file gây rò rỉ tài nguyên, không phải lỗi này.\n✗ Dấu phẩy thừa là lỗi parse JSON, không liên quan."
  },
  {
    "id": "prog-q-128",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Khi xử lý một file log vài GB, vì sao đọc TỪNG DÒNG được khuyến nghị hơn đọc cả file vào một chuỗi?",
    "options": [
      "Không cần nạp toàn bộ vào RAM một lúc, tiết kiệm bộ nhớ",
      "Đọc từng dòng tự động dùng UTF-8",
      "Đọc từng dòng tự đóng file giúp bạn",
      "Đọc cả file vào RAM sẽ làm sai thứ tự dòng"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đọc từng dòng chỉ giữ một dòng trong bộ nhớ, tránh nạp cả vài GB cùng lúc.\n✓ Lặp từng dòng không cần nạp toàn bộ file vào RAM, hợp với file rất lớn.\n✗ Encoding phải tự khai báo, không tự động vì đọc từng dòng.\n✗ Việc tự đóng file do cơ chế with/try, không phải do đọc từng dòng.\n✗ Đọc cả file không làm sai thứ tự; vấn đề là tốn bộ nhớ."
  },
  {
    "id": "prog-q-129",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Những phát biểu nào ĐÚNG về việc quản lý bí mật (API key, mật khẩu DB) theo bài học? (Chọn tất cả đáp án đúng)",
    "options": [
      "Nên đọc bí mật từ biến môi trường",
      "Nên thêm file .env vào .gitignore",
      "Có thể đặt biến môi trường ngay khi chạy lệnh trên terminal",
      "Nên hard-code API key vào source để khỏi quên",
      "Nên commit file .env lên Git để đồng đội có sẵn key"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bí mật nên nằm ngoài source: dùng biến môi trường và tránh đưa .env lên Git.\n✓ Đọc bí mật từ biến môi trường là nơi chuẩn để chứa key/mật khẩu.\n✓ Thêm .env vào .gitignore để không vô tình commit bí mật.\n✓ Có thể đặt biến môi trường ngay trước lệnh chạy (vd API_KEY=abc123 python app.py).\n✗ Hard-code key vào source rồi commit là lỗ hổng bảo mật nghiêm trọng.\n✗ Commit .env lên Git làm lộ bí mật, rất khó xoá khỏi lịch sử."
  },
  {
    "id": "prog-q-130",
    "courseId": "PROGRAMMING",
    "lesson": "prog-10-files-data",
    "certifications": [
      "PROGRAMMING"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Trong mẫu công cụ thống kê CSV (đọc cột san_pham, so_luong, gia), những ý nào ĐÚNG? (Chọn tất cả đáp án đúng)",
    "options": [
      "Doanh thu mỗi dòng = so_luong * gia, rồi cộng dồn theo từng san_pham",
      "Cần ép kiểu so_luong và gia từ chuỗi sang số trước khi nhân",
      "Mẫu hình chung là: đọc → biến đổi từng dòng → gom nhóm vào map → xuất kết quả",
      "Có thể cộng trực tiếp so_luong và gia dưới dạng chuỗi mà không cần ép kiểu",
      "Sản phẩm bán chạy nhất là sản phẩm có tổng doanh thu lớn nhất trong map"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "Quy trình: ép kiểu, tính tiền mỗi dòng, gom theo sản phẩm vào map, rồi tìm max.\n✓ Doanh thu mỗi dòng là so_luong * gia, cộng dồn theo từng san_pham vào map.\n✓ Giá trị đọc từ CSV là chuỗi nên phải ép sang số trước khi nhân.\n✓ Mẫu hình đọc → biến đổi → gom nhóm vào map → xuất kết quả rất phổ biến.\n✓ Sản phẩm bán chạy nhất được tìm bằng giá trị doanh thu lớn nhất trong map.\n✗ Không thể cộng/nhân chuỗi như số; thiếu ép kiểu sẽ sai hoặc lỗi."
  },
  {
    "id": "git-q-001",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa tạo file ghichu.txt trong thư mục đã git init nhưng chưa làm gì thêm. Gõ git status, Git xếp file này vào nhóm nào?",
    "options": [
      "Untracked files (file Git chưa từng theo dõi)",
      "Changes to be committed (đã nằm trong giỏ)",
      "Committed (đã lưu vào lịch sử)",
      "Ignored (bị .gitignore lờ đi)"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "File mới tạo, chưa được git add bao giờ, nên Git chưa theo dõi nó.\n✓ Đúng: file mới chưa add nằm ở mục \"Tôi thấy file này nhưng bạn chưa bảo tôi theo dõi\" — tức untracked.\n✗ Sai: nằm trong giỏ chỉ xảy ra sau khi git add.\n✗ Sai: đã lưu lịch sử chỉ sau khi git commit.\n✗ Sai: bị lờ đi chỉ khi tên file có trong .gitignore."
  },
  {
    "id": "git-q-002",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trong analogy giỏ hàng siêu thị, lệnh git add tương ứng với hành động nào?",
    "options": [
      "Bỏ món hàng đã chọn vào giỏ",
      "Thanh toán và in hoá đơn",
      "Đặt món hàng lên kệ",
      "Lật album xem các ảnh cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git add đưa thay đổi vào staging area, được ví như bỏ vào giỏ hàng.\n✓ Đúng: add = chọn món bỏ vào giỏ (staging area).\n✗ Sai: thanh toán in hoá đơn là git commit.\n✗ Sai: đặt lên kệ tương ứng việc sửa file trong working directory.\n✗ Sai: lật album xem ảnh cũ là git log."
  },
  {
    "id": "git-q-003",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn muốn khai báo tên và email cho Git để gắn vào mỗi commit, áp dụng cho mọi dự án trên máy. Lệnh nào đúng?",
    "options": [
      "git config --global user.name \"Nguyen Van A\"",
      "git init user.name \"Nguyen Van A\"",
      "git add user.name \"Nguyen Van A\"",
      "git commit --global user.name \"Nguyen Van A\""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git config là lệnh chỉnh cài đặt; --global áp dụng cho cả máy.\n✓ Đúng: git config --global user.name \"...\" khai báo tên cho mọi dự án.\n✗ Sai: git init dùng để biến thư mục thành repo, không khai báo tên.\n✗ Sai: git add bỏ thay đổi vào giỏ, không phải cấu hình.\n✗ Sai: git commit chốt thay đổi, không có dạng cấu hình tên kiểu này."
  },
  {
    "id": "git-q-004",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn gõ git add baocao.txt, rồi sau đó SỬA TIẾP nội dung baocao.txt, rồi git commit -m \"...\". Commit vừa tạo chứa phiên bản nào của file?",
    "options": [
      "Phiên bản tại thời điểm git add (bản cũ), phần sửa sau vẫn nằm trên kệ",
      "Phiên bản mới nhất gồm cả phần vừa sửa",
      "Cả hai phiên bản được lưu thành hai commit",
      "Không có gì được commit vì file đã bị thay đổi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Giỏ hàng chỉ chứa phiên bản tại thời điểm add; sửa sau đó không tự vào giỏ.\n✓ Đúng: commit lấy bản trong giỏ (lúc add), phần sửa sau vẫn trên kệ, cần add lại.\n✗ Sai: phần sửa sau không tự động vào commit nếu chưa add lại.\n✗ Sai: một lệnh commit chỉ tạo một commit, không tách đôi.\n✗ Sai: vẫn có commit — chứa bản đã add trước đó."
  },
  {
    "id": "git-q-005",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một bạn mới lỡ commit file .env chứa mật khẩu. Sau đó bạn ấy thêm dòng .env vào .gitignore và tưởng vậy là an toàn. Điều gì thực sự xảy ra?",
    "options": [
      "Git vẫn tiếp tục theo dõi .env vì .gitignore chỉ chặn file CHƯA từng được theo dõi",
      "Git tự động xoá .env khỏi toàn bộ lịch sử",
      "File .env ngay lập tức biến mất khỏi git status và khỏi mọi commit cũ",
      "Lệnh git add . từ nay sẽ tự gỡ .env khỏi lịch sử"
    ],
    "correctIndices": [
      0
    ],
    "explanation": ".gitignore chỉ chặn file chưa từng được Git theo dõi; file đã commit thì vẫn bị theo dõi.\n✓ Đúng: file đã commit rồi thì .gitignore không gỡ được, Git vẫn theo dõi.\n✗ Sai: .gitignore không tự xoá lịch sử cũ.\n✗ Sai: commit cũ vẫn còn chứa file, không tự biến mất.\n✗ Sai: git add . không có chức năng gỡ file khỏi lịch sử."
  },
  {
    "id": "git-q-006",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đang xem git log với lịch sử dài, màn hình cuộn trang và bị \"kẹt\". Cách thoát ra là gì?",
    "options": [
      "Bấm phím q",
      "Bấm Ctrl + C rồi git init lại",
      "Gõ git exit",
      "Đóng cả cửa sổ dòng lệnh, không còn cách nào khác"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi git log cuộn trang, bấm q (quit) để thoát chế độ xem.\n✓ Đúng: bấm q để thoát màn hình cuộn của git log.\n✗ Sai: không cần và không nên git init lại — sẽ chẳng giải quyết việc thoát xem.\n✗ Sai: không có lệnh git exit.\n✗ Sai: không cần đóng cửa sổ; q là cách chuẩn."
  },
  {
    "id": "git-q-007",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong .gitignore bạn viết dòng *.log. Dòng này có tác dụng gì?",
    "options": [
      "Bỏ qua mọi file có đuôi .log",
      "Chỉ bỏ qua đúng một file tên *.log",
      "Bỏ qua nguyên một thư mục tên log",
      "Đánh dấu mọi file .log phải được commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Dấu * nghĩa là \"bất kỳ\", nên *.log khớp mọi file kết thúc bằng .log.\n✓ Đúng: *.log bỏ qua mọi file có đuôi .log.\n✗ Sai: không phải chỉ một file tên cố định — * là ký tự đại diện.\n✗ Sai: muốn bỏ qua thư mục phải viết tên kèm dấu / ở cuối.\n✗ Sai: .gitignore là danh sách thứ bị lờ đi, không phải buộc commit."
  },
  {
    "id": "git-q-008",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chạy git init trong thư mục dự án nhưng chưa làm gì thêm. Khẳng định nào đúng?",
    "options": [
      "Repo đã được tạo nhưng chưa có commit nào — phải tự git add và commit",
      "Một commit đầu tiên đã tự động được tạo chứa toàn bộ file",
      "Mọi file trong thư mục đã được lưu vào lịch sử",
      "Git đã đẩy dự án lên GitHub"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git init chỉ mở \"album trắng\"; chưa có tấm ảnh nào được chụp.\n✓ Đúng: init tạo repo nhưng chưa có commit, phải tự add rồi commit.\n✗ Sai: init không tự tạo commit nào.\n✗ Sai: file chỉ vào lịch sử sau khi commit.\n✗ Sai: GitHub là dịch vụ riêng, init không đẩy gì lên mạng."
  },
  {
    "id": "git-q-009",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn vừa sửa 5 file nhưng chỉ muốn commit thay đổi của 2 file liên quan đến một tính năng, 3 file còn lại để commit sau. Cách làm đúng theo bài là gì?",
    "options": [
      "git add đúng 2 file đó rồi git commit -m \"...\"; 3 file kia vẫn nằm trên kệ",
      "git add . rồi git commit, vì Git tự biết tách 2 file ra",
      "git commit -m \"...\" trực tiếp, không cần add file nào",
      "Phải tạo thêm thư mục mới và git init riêng cho 2 file"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Staging area cho phép chọn lọc đúng những thay đổi muốn lưu trong lần commit này.\n✓ Đúng: add đúng 2 file rồi commit; 3 file còn lại vẫn ở working directory chờ lần sau.\n✗ Sai: git add . gom hết mọi thay đổi vào giỏ, không phải chỉ 2 file.\n✗ Sai: commit thẳng không add thì không lưu được thay đổi vào giỏ.\n✗ Sai: không cần init repo mới — vô lý và sai mục đích."
  },
  {
    "id": "git-q-010",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn cho rằng \"Git và GitHub là một\". Theo bài học, phát biểu nào mô tả ĐÚNG quan hệ giữa chúng?",
    "options": [
      "Git là phần mềm chạy trên máy; GitHub là trang web để lưu trữ và chia sẻ repo Git lên Internet",
      "GitHub là phần mềm trên máy, còn Git là website lưu trữ",
      "Cả hai đều là website, chỉ khác tên gọi",
      "Git chỉ chạy được khi đã có tài khoản GitHub"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Git là phần mềm cục bộ; GitHub là dịch vụ web đồng bộ repo lên mây — như ảnh điện thoại và Google Photos.\n✓ Đúng: Git chạy trên máy, GitHub là web lưu trữ/chia sẻ repo.\n✗ Sai: đảo ngược vai trò — Git không phải website.\n✗ Sai: Git không phải website.\n✗ Sai: Git hoạt động độc lập, không cần tài khoản GitHub."
  },
  {
    "id": "git-q-011",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn tò mò xoá thư mục ẩn .git trong dự án. Hậu quả là gì?",
    "options": [
      "Toàn bộ lịch sử (mọi commit) mất sạch, nhưng các file hiện tại vẫn còn",
      "Mọi file dự án bị xoá ngay lập tức",
      "Chỉ commit gần nhất bị mất, các commit cũ vẫn còn",
      "Không sao cả, Git tự khôi phục .git khi gõ git status"
    ],
    "correctIndices": [
      0
    ],
    "explanation": ".git chứa toàn bộ album lịch sử; xoá nó là đốt cả album, mất hết quá khứ nhưng file hiện tại trong working directory vẫn còn.\n✓ Đúng: mất toàn bộ lịch sử, file hiện tại vẫn còn.\n✗ Sai: file đang làm việc nằm ngoài .git nên không bị xoá theo.\n✗ Sai: mất hết mọi commit chứ không chỉ commit gần nhất.\n✗ Sai: Git không tự khôi phục .git đã bị xoá."
  },
  {
    "id": "git-q-012",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "So với cách đặt tên file thủ công (bao_cao_final_v2_THAT.docx), Git mang lại những ưu điểm nào theo bài học? Chọn TẤT CẢ đáp án đúng.",
    "options": [
      "Mỗi commit lưu rõ tác giả, thời gian và ghi chú thay đổi",
      "Quay lại bản cũ chỉ bằng một lệnh thay vì mở từng file mò",
      "Git chỉ ra từng dòng khác nhau giữa hai phiên bản",
      "Mỗi bản lưu là một bản copy đầy đủ nên rất tốn dung lượng",
      "Tên file mới nhất luôn phải tự đoán theo hậu tố"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bài nêu Git lưu tác giả/thời gian/ghi chú, quay lui dễ, so sánh từng dòng, lại tiết kiệm dung lượng.\n✓ Đúng: mỗi commit lưu tác giả, thời gian, ghi chú.\n✓ Đúng: quay lại bản cũ chỉ một lệnh.\n✓ Đúng: Git chỉ ra từng dòng khác nhau.\n✗ Sai: Git lưu rất tiết kiệm, không phải copy đầy đủ tốn chỗ.\n✗ Sai: phải đoán theo hậu tố là nhược điểm của cách đặt tên thủ công, không phải của Git."
  },
  {
    "id": "git-q-013",
    "courseId": "GIT",
    "lesson": "git-01-why-version-control",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi viết commit message, theo bài học những lựa chọn nào là TỐT? Chọn TẤT CẢ đáp án đúng.",
    "options": [
      "git commit -m \"Sua loi hien sai ngay tren trang chu\"",
      "git commit -m \"Them trang lien he\"",
      "git commit -m \"update\"",
      "git commit -m \"abc\"",
      "git commit -m \"sua bug\""
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Message tốt trả lời rõ \"commit này làm gì\" — cụ thể, ngắn gọn, dễ tra cứu.\n✓ Đúng: mô tả sửa lỗi cụ thể (hiện sai ngày trên trang chủ) rất rõ ràng.\n✓ Đúng: nêu rõ thêm trang liên hệ, cụ thể.\n✗ Sai: \"update\" quá chung chung, không cho biết làm gì.\n✗ Sai: \"abc\" vô nghĩa, không tra cứu được.\n✗ Sai: \"sua bug\" mơ hồ, không rõ bug nào."
  },
  {
    "id": "git-q-014",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn đang ở nhánh `main` và gõ `git branch them-trang-gioi-thieu`. Ngay sau lệnh này, bạn đang đứng ở nhánh nào?",
    "options": [
      "Vẫn ở `main`, vì lệnh chỉ tạo nhánh chứ không chuyển sang",
      "Đã chuyển sang `them-trang-gioi-thieu`",
      "Cả hai nhánh cùng lúc",
      "Git báo lỗi vì thiếu cờ -c"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`git branch <ten>` chỉ tạo nhãn mới, không di chuyển bạn đi đâu cả.\n✓ Vẫn ở `main`: lệnh chỉ tạo nhánh, dấu `*` vẫn nằm ở main.\n✗ Đã chuyển sang nhánh mới: đó là việc của `git switch` hoặc `git switch -c`.\n✗ Cả hai cùng lúc: bạn luôn chỉ đứng trên đúng một nhánh.\n✗ Git báo lỗi vì thiếu -c: `-c` chỉ cần khi dùng với `git switch`, không liên quan tới `git branch`."
  },
  {
    "id": "git-q-015",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Lệnh nào vừa tạo nhánh mới vừa chuyển sang nhánh đó trong một bước (lệnh dùng nhiều nhất hằng ngày)?",
    "options": [
      "git switch -c sua-loi-dang-nhap",
      "git branch sua-loi-dang-nhap",
      "git merge sua-loi-dang-nhap",
      "git switch sua-loi-dang-nhap"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`-c` nghĩa là create, nên lệnh này tạo nhánh và nhảy sang luôn.\n✓ `git switch -c ...`: tạo + chuyển trong một lệnh.\n✗ `git branch ...`: chỉ tạo, không chuyển.\n✗ `git merge ...`: dùng để gộp nhánh, không tạo nhánh.\n✗ `git switch ...` (không có -c): chỉ chuyển sang nhánh đã tồn tại, không tạo mới."
  },
  {
    "id": "git-q-016",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, vì sao branch tạo ra rất nhanh và không tốn dung lượng gấp đôi dự án?",
    "options": [
      "Vì branch thực chất chỉ là một cái nhãn trỏ vào một commit",
      "Vì Git nén toàn bộ thư mục lại khi tạo nhánh",
      "Vì branch chỉ lưu được tối đa 5 file",
      "Vì branch xoá bớt lịch sử cũ để tiết kiệm chỗ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Branch chỉ là một nhãn dán trỏ vào commit, nên tạo trong tích tắc và gần như không tốn chỗ.\n✓ Chỉ là nhãn trỏ vào commit: đúng bản chất của branch trong Git.\n✗ Nén toàn bộ thư mục: Git không sao chép/nén toàn bộ dự án khi tạo nhánh.\n✗ Tối đa 5 file: branch không giới hạn số file.\n✗ Xoá bớt lịch sử cũ: tạo nhánh không hề xoá commit nào."
  },
  {
    "id": "git-q-017",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sơ đồ hiện tại:\n```\nA --- B --- C        <- main\n               \\\n                D --- E   <- feature/x\n```\nBạn gõ `git switch main` rồi `git merge feature/x`. Kết quả là gì?",
    "options": [
      "Fast-forward: nhãn `main` trượt lên tới E, không tạo commit mới",
      "Tạo một merge commit mới có hai cha mẹ",
      "Conflict, vì hai nhánh khác nhau",
      "Git từ chối vì main chưa có commit mới"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`main` nằm ngay trên đường thẳng dẫn tới E (main không có commit mới), nên Git chỉ trượt nhãn lên.\n✓ Fast-forward: đúng, không tạo commit mới, không thể có xung đột.\n✗ Tạo merge commit hai cha mẹ: chỉ xảy ra khi cả hai nhánh đều có commit mới sau khi rẽ.\n✗ Conflict: fast-forward không bao giờ gây conflict.\n✗ Git từ chối: việc main chưa tiến lên chính là điều kiện để fast-forward diễn ra êm đẹp."
  },
  {
    "id": "git-q-018",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn muốn gộp nhánh `feature/trang-lien-he` vào `main`. Thứ tự lệnh nào đúng?",
    "options": [
      "git switch main rồi git merge feature/trang-lien-he",
      "git switch feature/trang-lien-he rồi git merge main",
      "git merge main feature/trang-lien-he từ bất kỳ nhánh nào",
      "git switch feature/trang-lien-he rồi git merge feature/trang-lien-he"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Merge giống mời khách vào nhà: đứng ở nhánh đích (main) rồi kéo nhánh kia vào.\n✓ switch main rồi merge feature: đúng quy trình hai bước, gộp feature vào main.\n✗ switch feature rồi merge main: làm ngược lại, sẽ gộp main vào feature.\n✗ merge với hai tên nhánh từ bất kỳ đâu: không phải cú pháp gộp một nhánh vào nhánh hiện tại.\n✗ switch feature rồi merge chính feature: tự gộp vào chính mình, vô nghĩa."
  },
  {
    "id": "git-q-019",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đang giữa cuộc merge bị conflict, bạn thấy rối và muốn quay lại y nguyên trạng thái trước khi gõ `git merge`. Lệnh nào?",
    "options": [
      "git merge --abort",
      "git commit",
      "git branch -D",
      "git switch main"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`git merge --abort` huỷ toàn bộ cuộc merge và đưa mọi thứ về trạng thái trước khi merge.\n✓ `git merge --abort`: nút thoát hiểm an toàn tuyệt đối khi đang dở merge.\n✗ `git commit`: dùng để HOÀN TẤT merge sau khi đã giải xong, không phải để huỷ.\n✗ `git branch -D`: ép xoá một nhánh, không liên quan tới huỷ merge.\n✗ `git switch main`: chuyển nhánh, không huỷ cuộc merge đang dang dở."
  },
  {
    "id": "git-q-020",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong file conflict bạn thấy:\n```\n<<<<<<< HEAD\nPhở bò - 50.000đ\n=======\nPhở bò - 55.000đ\n>>>>>>> nhanh-cap-nhat-gia\n```\nDòng nằm ngay dưới `<<<<<<< HEAD` là phiên bản của ai?",
    "options": [
      "Của nhánh bạn đang đứng (HEAD)",
      "Của nhánh đang được gộp vào (nhanh-cap-nhat-gia)",
      "Của commit gốc trước khi rẽ nhánh",
      "Của bản đã được Git trộn tự động"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phần từ `<<<<<<< HEAD` tới `=======` là phiên bản của nhánh hiện tại (HEAD).\n✓ Của nhánh đang đứng: HEAD là vị trí hiện tại của bạn.\n✗ Của nhánh gộp vào: phần đó nằm giữa `=======` và `>>>>>>> nhanh-cap-nhat-gia`.\n✗ Của commit gốc: Git không hiển thị bản gốc trong dấu conflict mặc định này.\n✗ Bản đã trộn tự động: nếu trộn được thì đã không có conflict."
  },
  {
    "id": "git-q-021",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Khi giải một conflict thủ công, những việc nào BẮT BUỘC phải làm trước khi merge được coi là hoàn tất? (chọn nhiều)",
    "options": [
      "Xoá hết các ký hiệu `<<<<<<<`, `=======`, `>>>>>>>` khỏi file",
      "Chỉnh file lại đúng nội dung cuối cùng mong muốn",
      "Gõ `git add` cho file đã sửa",
      "Gõ `git commit` để hoàn tất cuộc merge",
      "Chạy `git branch -D` để xoá nhánh kia"
    ],
    "correctIndices": [
      0,
      1,
      2,
      3
    ],
    "explanation": "Quy trình giải conflict: sửa nội dung, xoá ký hiệu, `git add`, rồi `git commit`.\n✓ Xoá ký hiệu đánh dấu: nếu để sót, các ký hiệu sẽ nằm trong code gây lỗi.\n✓ Chỉnh nội dung cuối cùng: phải để lại đúng phần mình muốn giữ.\n✓ `git add` file: báo cho Git biết file này đã giải xong.\n✓ `git commit`: bước cuối hoàn tất cuộc merge.\n✗ `git branch -D`: ép xoá nhánh không phải bước giải conflict, và -D còn có thể mất commit."
  },
  {
    "id": "git-q-022",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi đã merge nhánh `feature/x` vào `main` thành công, bạn gõ `git branch -d feature/x`. Điều gì xảy ra với các commit của nhánh đó?",
    "options": [
      "Commit vẫn còn — chúng đã được gộp vào main, bạn chỉ gỡ cái nhãn xuống",
      "Toàn bộ commit của nhánh bị xoá vĩnh viễn",
      "main cũng bị xoá theo",
      "Git từ chối vì không cho xoá nhánh đã merge"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Xoá branch không xoá commit; các commit đã nằm trong main, bạn chỉ gỡ nhãn dán.\n✓ Commit vẫn còn: chúng đã được gộp vào main, chỉ cái nhãn bị gỡ.\n✗ Commit bị xoá vĩnh viễn: không đúng, dữ liệu vẫn nằm trong lịch sử main.\n✗ main bị xoá theo: lệnh chỉ tác động tới nhãn feature/x.\n✗ Git từ chối: với nhánh ĐÃ merge, `-d` xoá an toàn bình thường."
  },
  {
    "id": "git-q-023",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn tạo nhánh `experiment/giao-dien-moi`, commit vài lần nhưng KHÔNG merge vào đâu cả vì thử nghiệm thất bại. Khi gõ `git branch -d experiment/giao-dien-moi` thì điều gì xảy ra, và bạn nên làm gì để thật sự vứt nó?",
    "options": [
      "Git từ chối và cảnh báo vì nhánh chưa merge; muốn ép vứt thì dùng `git branch -D experiment/giao-dien-moi`",
      "Git xoá ngay lập tức vì nhánh nào cũng xoá được bằng -d",
      "Git tự động merge nó vào main rồi mới xoá",
      "Phải `git merge --abort` trước rồi mới xoá được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "`-d` từ chối xoá nhánh chưa merge để bảo vệ commit khỏi mồ côi; muốn ép vứt dùng `-D` hoa.\n✓ Git từ chối rồi dùng -D: đúng cơ chế, -d an toàn còn -D ép xoá bất chấp.\n✗ -d xoá được mọi nhánh: với nhánh chưa merge, -d sẽ từ chối và cảnh báo.\n✗ Tự động merge rồi xoá: Git không tự gộp gì cả.\n✗ Phải merge --abort trước: lệnh đó dùng cho merge dang dở, không liên quan ở đây."
  },
  {
    "id": "git-q-024",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn đang đứng trên nhánh `feature/x` và gõ `git branch -d feature/x`. Vì sao lệnh không thực hiện được, và cách xử lý đúng?",
    "options": [
      "Không thể xoá nhánh mình đang đứng trên đó; hãy `git switch main` trước rồi mới xoá",
      "Vì tên nhánh có dấu gạch chéo nên Git cấm xoá",
      "Vì phải dùng -D mới xoá được nhánh feature",
      "Vì chưa chạy `git status` nên Git khoá lệnh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Không thể cưa cành cây mình đang ngồi: phải rời nhánh trước khi xoá nó.\n✓ Switch sang main trước: rời khỏi nhánh rồi mới xoá được.\n✗ Do dấu gạch chéo: Git cho phép `/` trong tên nhánh, không phải nguyên nhân.\n✗ Phải dùng -D: vấn đề là đang đứng trên nhánh, không phải chuyện an toàn/ép xoá.\n✗ Do chưa chạy git status: git status không phải điều kiện để xoá nhánh."
  },
  {
    "id": "git-q-025",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn sửa vài file trên nhánh `feature/x` nhưng CHƯA commit, rồi gõ `git switch main`. Theo bài học, rủi ro là gì và thói quen tốt để tránh?",
    "options": [
      "Git có thể từ chối chuyển (báo local changes would be overwritten) hoặc mang thay đổi dở dang sang gây rối; nên `git status` trước rồi commit hoặc `git stash`",
      "Thay đổi tự động được commit vào feature/x trước khi chuyển",
      "main sẽ bị xoá để nhường chỗ",
      "Git luôn chuyển sạch sẽ, không bao giờ có vấn đề gì"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Chuyển nhánh khi còn thay đổi chưa commit có thể bị Git từ chối hoặc mang thay đổi dở dang sang nhánh kia.\n✓ Git có thể từ chối/mang sang gây rối, nên status rồi commit hoặc stash: đúng lời khuyên trong bài.\n✗ Tự động commit vào feature: Git không tự commit giúp bạn.\n✗ main bị xoá: chuyển nhánh không xoá nhánh nào.\n✗ Luôn chuyển sạch sẽ: chính tình huống chưa commit là lúc dễ gặp rắc rối."
  },
  {
    "id": "git-q-026",
    "courseId": "GIT",
    "lesson": "git-02-branches",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Nhóm bạn cần đặt tên nhánh theo quy ước trong bài. Những tên nào ĐÚNG quy ước? (chọn nhiều)",
    "options": [
      "feature/login-google",
      "hotfix/khong-thanh-toan-duoc",
      "fix/sửa lỗi đăng nhập",
      "Feature/DangKyEmail",
      "feature/123-thanh-toan-momo"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Quy ước: tiền tố thể-loại, chữ thường, nối bằng gạch ngang, không dấu cách, không tiếng Việt có dấu.\n✓ feature/login-google: chữ thường, gạch ngang, có tiền tố rõ ràng.\n✓ hotfix/khong-thanh-toan-duoc: đúng tiền tố và định dạng ASCII gạch ngang.\n✓ feature/123-thanh-toan-momo: gắn mã số việc, đúng quy ước nhóm dùng Jira/Issues.\n✗ fix/sửa lỗi đăng nhập: có dấu cách và tiếng Việt có dấu, gây rắc rối.\n✗ Feature/DangKyEmail: viết hoa kiểu CamelCase, không phải chữ thường gạch ngang."
  },
  {
    "id": "git-q-027",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa sửa code trên máy và commit xong. Khi mở repo trên GitHub thì vẫn thấy nội dung cũ. Vì sao?",
    "options": [
      "Local và remote là hai bản sao độc lập, bản trên GitHub không tự cập nhật khi bạn commit ở máy",
      "GitHub bị lỗi cần đăng nhập lại",
      "Commit ở local sẽ tự đồng bộ lên GitHub sau vài phút",
      "Phải xoá repo trên GitHub rồi tạo lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Local và remote là hai bản sao độc lập; phải chủ động push thì GitHub mới có thay đổi.\n✓ Local và remote độc lập, GitHub không tự cập nhật khi bạn commit ở máy\n✗ Không phải lỗi đăng nhập của GitHub\n✗ Commit không tự đồng bộ lên mây, bạn phải push\n✗ Không cần xoá và tạo lại repo"
  },
  {
    "id": "git-q-028",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Câu nào mô tả ĐÚNG quan hệ giữa Git và GitHub?",
    "options": [
      "Có thể dùng Git mà không cần GitHub, nhưng không thể dùng GitHub mà không có Git",
      "Git là dịch vụ web, GitHub là phần mềm cài trên máy",
      "GitHub là phiên bản mới thay thế cho Git",
      "Phải có GitHub thì Git mới chạy được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Git là công cụ chạy được offline; GitHub là dịch vụ xây dựng để chứa các kho Git.\n✓ Dùng Git không cần GitHub được, nhưng GitHub cần Git\n✗ Ngược lại: Git là phần mềm, GitHub là dịch vụ web\n✗ GitHub không thay thế Git\n✗ Git chạy hoàn toàn offline, không cần GitHub"
  },
  {
    "id": "git-q-029",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn muốn tải toàn bộ một repo có sẵn trên GitHub (cả code lẫn lịch sử commit) về máy lần đầu tiên. Dùng lệnh nào?",
    "options": [
      "git clone <link>",
      "git pull",
      "git push -u origin main",
      "git remote add origin <link>"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git clone sao chép toàn bộ repo từ GitHub về máy và tự thiết lập kết nối remote.\n✓ git clone <link> tải repo về máy lần đầu\n✗ git pull chỉ kéo commit mới về kho đã có sẵn\n✗ git push đẩy commit từ máy lên GitHub\n✗ git remote add chỉ thêm địa chỉ remote, không tải code"
  },
  {
    "id": "git-q-030",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn đã có kho Git ở máy (đã init và commit) và vừa tạo repo TRỐNG trên GitHub. Thứ tự lệnh nào đúng để đẩy code lên lần đầu?",
    "options": [
      "git remote add origin <link> → git push -u origin main",
      "git clone <link> → git push",
      "git pull → git remote add origin <link>",
      "git push -u origin main → git remote add origin <link>"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Phải khai báo remote origin trước, rồi mới push được lên đó.\n✓ Thêm remote origin trước, sau đó push -u origin main\n✗ Không clone vì code đã có sẵn ở máy\n✗ Không thể pull khi chưa có remote và remote đang trống\n✗ Không thể push khi chưa khai báo remote origin"
  },
  {
    "id": "git-q-031",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong lệnh git push -u origin main, cờ -u có tác dụng gì?",
    "options": [
      "Ghi nhớ cặp origin/main để từ lần sau chỉ cần gõ git push",
      "Ép buộc ghi đè lịch sử trên remote",
      "Tự động giải quyết mọi xung đột khi push",
      "Tạo nhánh main mới trên remote"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "-u thiết lập upstream, ghi nhớ origin/main để các lần sau chỉ cần gõ git push.\n✓ -u ghi nhớ origin/main, lần sau chỉ cần git push\n✗ Ghi đè ép buộc là --force, không phải -u\n✗ -u không giải quyết xung đột\n✗ -u không tạo nhánh, main đã được chỉ định sẵn"
  },
  {
    "id": "git-q-032",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chạy git push và bị từ chối với thông báo rejected... fetch first. Cách xử lý ĐÚNG là gì?",
    "options": [
      "Chạy git pull trước, giải quyết xung đột nếu có, rồi push lại",
      "Dùng ngay git push --force để ghi đè lên remote",
      "Xoá repo trên GitHub rồi push lại",
      "Tạo SSH key mới rồi push"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Thông báo này nghĩa là remote có commit máy bạn chưa có; pull về trước rồi push lại.\n✓ Pull trước, xử lý xung đột, rồi push lại\n✗ git push --force ghi đè lịch sử và có thể xoá công sức người khác\n✗ Không xoá repo, sẽ mất dữ liệu\n✗ Lỗi này không liên quan đến SSH key"
  },
  {
    "id": "git-q-033",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Quy trình làm việc hằng ngày được khuyến nghị trong bài là gì, và vì sao?",
    "options": [
      "pull trước, làm việc, commit, rồi push — để chắc chắn sửa trên bản mới nhất, tránh giẫm chân lên thay đổi của người khác",
      "push trước, rồi pull — để dữ liệu của mình được ưu tiên",
      "chỉ commit, không cần pull hay push",
      "clone lại repo mỗi sáng để có bản mới nhất"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Pull trước giúp bạn làm việc trên bản mới nhất, tránh xung đột với người khác.\n✓ pull trước, làm việc, commit, rồi push để tránh giẫm chân nhau\n✗ Push trước không lấy được thay đổi mới nhất của người khác\n✗ Chỉ commit thì không đồng bộ với remote\n✗ Clone lại mỗi sáng là dư thừa và mất công"
  },
  {
    "id": "git-q-034",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Về SSH key, những phát biểu nào ĐÚNG? (chọn nhiều)",
    "options": [
      "File có đuôi .pub là public key, được phép chia sẻ và dán lên GitHub",
      "Private key nằm trên máy bạn và tuyệt đối không đưa cho ai",
      "SSH key gắn với từng máy tính; có máy mới thì tạo cặp khoá mới",
      "Phải dán private key lên GitHub thì mới xác thực được",
      "Một tài khoản GitHub chỉ chứa được đúng một SSH key"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Public key (.pub) chia sẻ được, private key giữ kín; key gắn theo từng máy.\n✓ File .pub là public key, được dán lên GitHub\n✓ Private key giữ trên máy, không đưa cho ai\n✓ SSH key gắn với từng máy, máy mới tạo cặp khoá mới\n✗ Dán public key (.pub) lên GitHub, không phải private key\n✗ Một tài khoản chứa được nhiều key"
  },
  {
    "id": "git-q-035",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Một bạn dán dòng bắt đầu bằng ssh-ed25519 từ file id_ed25519.pub lên GitHub, sau đó chạy ssh -T git@github.com và thấy Hi ten-ban! You've successfully authenticated. Điều này cho thấy gì?",
    "options": [
      "Bạn đã dán đúng public key và thiết lập SSH thành công",
      "Bạn đã vô tình lộ private key lên GitHub",
      "Repo đã được clone xong về máy",
      "Bạn cần đổi mật khẩu GitHub ngay vì bị lộ khoá"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "File .pub là public key được phép chia sẻ; thông báo authenticated xác nhận SSH đã hoạt động.\n✓ Dán đúng public key (.pub) và SSH đã thiết lập thành công\n✗ id_ed25519.pub là public key, không phải private key\n✗ Lệnh ssh -T chỉ kiểm tra xác thực, không clone repo\n✗ Không lộ khoá nên không cần đổi mật khẩu"
  },
  {
    "id": "git-q-036",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn thấy một dự án mã nguồn mở hay nhưng KHÔNG có quyền sửa repo gốc, và muốn đóng góp. Bước đầu tiên đúng là gì?",
    "options": [
      "Fork repo gốc về tài khoản GitHub của mình",
      "Dùng git push --force lên repo gốc",
      "Clone thẳng repo gốc rồi push trực tiếp lên nó",
      "Gửi Pull Request trước khi sửa bất cứ gì"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy trình đóng góp open source bắt đầu bằng fork repo gốc về tài khoản mình.\n✓ Fork repo gốc về tài khoản của mình là bước đầu\n✗ Không có quyền nên không thể push (kể cả force) lên repo gốc\n✗ Clone rồi push trực tiếp lên repo gốc bị từ chối vì thiếu quyền\n✗ Pull Request gửi sau khi đã sửa và push lên bản fork"
  },
  {
    "id": "git-q-037",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "So sánh Fork và Clone, những phát biểu nào ĐÚNG? (chọn nhiều)",
    "options": [
      "Fork sao chép repo người khác sang tài khoản GitHub của bạn, vẫn nằm trên mây",
      "Clone sao chép repo từ GitHub về máy tính của bạn",
      "Fork thực hiện bằng cách bấm nút Fork trên web GitHub",
      "Clone được thực hiện bằng cách bấm nút trên web, không cần Terminal",
      "Fork và clone đều tải code thẳng về ổ cứng máy bạn"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Fork tạo bản sao trên mây ở tài khoản bạn (bấm nút web); clone tải về máy (lệnh Terminal).\n✓ Fork sao chép sang tài khoản GitHub của bạn, vẫn trên mây\n✓ Clone sao chép từ GitHub về máy tính\n✓ Fork thực hiện bằng nút Fork trên web\n✗ Clone dùng lệnh git clone trong Terminal, không bấm nút web\n✗ Fork không tải về ổ cứng, nó vẫn nằm trên mây"
  },
  {
    "id": "git-q-038",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn lỡ push file .env chứa API key lên một repo PUBLIC. Cách xử lý đúng và hậu quả là gì?",
    "options": [
      "Đổi ngay API key đó, vì thông tin đã nằm trong lịch sử Git dù bạn xoá file sau đó",
      "Chỉ cần xoá file .env và commit lại là khoá an toàn tuyệt đối",
      "Đặt repo thành Private là khoá không còn rủi ro",
      "Dùng git pull để gỡ key khỏi lịch sử"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Một khi đã push, bí mật nằm trong lịch sử Git vĩnh viễn dù xoá file, nên phải đổi khoá ngay.\n✓ Đổi API key ngay vì nó đã nằm trong lịch sử Git\n✗ Xoá file rồi commit không gỡ key khỏi lịch sử đã push\n✗ Đặt Private không an toàn tuyệt đối vì key có thể đã bị lấy\n✗ git pull không liên quan đến việc gỡ bí mật khỏi lịch sử"
  },
  {
    "id": "git-q-039",
    "courseId": "GIT",
    "lesson": "git-03-github-remote",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn muốn tạo một README hiển thị tự giới thiệu ngay đầu trang cá nhân GitHub. Cần làm gì?",
    "options": [
      "Tạo repo trùng tên username và đặt file README.md trong đó",
      "Tạo repo tên là profile và thêm README.md",
      "Đặt file README.md trong repo bất kỳ",
      "Dùng tính năng Pin để ghim README"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "README.md trong repo trùng tên username sẽ hiển thị ngay đầu trang cá nhân.\n✓ Tạo repo trùng tên username, README.md trong đó hiển thị ở trang cá nhân\n✗ Tên repo phải là username, không phải profile\n✗ README trong repo thường chỉ hiển thị trong repo đó\n✗ Pin chỉ ghim repo lên đầu, không hiển thị README giới thiệu"
  },
  {
    "id": "git-q-040",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, thứ tự đúng của quy trình làm việc nhóm chuẩn là gì?",
    "options": [
      "branch → push → Pull Request → review → merge",
      "push → branch → merge → review → Pull Request",
      "Pull Request → branch → push → merge → review",
      "merge → review → Pull Request → push → branch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy trình chuẩn gần như ở mọi công ty là tạo nhánh, đẩy lên, mở PR, được review rồi mới gộp.\n✓ Tạo nhánh trước, push lên, mở Pull Request, review, cuối cùng merge — đúng trình tự bài nêu.\n✗ Push trước khi tạo nhánh là vô lý vì chưa có gì để đẩy.\n✗ Mở Pull Request trước khi có nhánh là không thể.\n✗ Merge ngay đầu tiên đi ngược toàn bộ ý tưởng review trước khi gộp."
  },
  {
    "id": "git-q-041",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trên GitLab, khái niệm tương đương với Pull Request của GitHub được gọi là gì?",
    "options": [
      "Merge Request (MR)",
      "Commit Request",
      "Push Request",
      "Review Request"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài học nói rõ trên GitLab, Pull Request được gọi là Merge Request, cùng một khái niệm.\n✓ Merge Request (MR) là tên gọi của GitLab cho cùng khái niệm đề nghị gộp code.\n✗ Commit Request không phải thuật ngữ trong bài.\n✗ Push Request không tồn tại như một khái niệm chuẩn.\n✗ Review Request không phải tên gọi tương đương PR trên GitLab."
  },
  {
    "id": "git-q-042",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Sau khi sửa code theo góp ý review, bạn nên làm gì để PR cập nhật thay đổi mới?",
    "options": [
      "Push commit mới lên cùng nhánh đó, PR tự cập nhật",
      "Mở một Pull Request hoàn toàn mới",
      "Xoá nhánh cũ rồi tạo lại từ đầu",
      "Gửi email cho người review file đã sửa"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài học nêu: sau khi sửa, push commit mới lên cùng nhánh, PR tự động cập nhật, không cần mở PR mới.\n✓ Đẩy commit mới lên đúng nhánh đang mở PR khiến PR tự cập nhật.\n✗ Mở PR mới là thừa và làm rối quá trình review.\n✗ Xoá rồi tạo lại nhánh làm mất luôn cuộc thảo luận review.\n✗ Gửi file qua email không phải cách Git/GitHub hoạt động."
  },
  {
    "id": "git-q-043",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một đồng nghiệp tạo nhánh mới nhưng quên chạy `git pull` trên `main` trước. Hậu quả dễ gặp nhất sau một thời gian dài là gì?",
    "options": [
      "Làm việc trên nền code cũ, sau này dễ bị conflict khi gộp",
      "Git sẽ tự động từ chối tạo nhánh mới",
      "Commit message sẽ bị xoá hết",
      "Nhánh mới không thể push lên GitHub được"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài cảnh báo quên pull main trước khi tạo nhánh khiến bạn làm trên nền code cũ, dễ conflict về sau.\n✓ Làm trên code cũ rồi gộp lại chính là nguyên nhân gây conflict.\n✗ Git không từ chối tạo nhánh vì lý do này.\n✗ Commit message không bị xoá do quên pull.\n✗ Nhánh vẫn push lên GitHub bình thường dù nền code cũ."
  },
  {
    "id": "git-q-044",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn vừa làm xong nhánh `fix/loi-gio-hang` lần đầu và muốn đẩy lên GitHub. Lệnh nào đúng theo bài học?",
    "options": [
      "git push -u origin fix/loi-gio-hang",
      "git push origin main",
      "git pull -u fix/loi-gio-hang",
      "git commit -u origin fix/loi-gio-hang"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài hướng dẫn lần đầu push một nhánh dùng `git push -u origin <tên-nhánh>` để ghi nhớ liên kết.\n✓ Đẩy đúng tên nhánh lên origin kèm `-u` cho lần đầu là chính xác.\n✗ Push main trong khi đang làm trên nhánh fix không đẩy việc của bạn lên.\n✗ `git pull -u` không phải lệnh để đẩy nhánh lên.\n✗ `git commit` chỉ lưu thay đổi cục bộ, không đẩy lên remote."
  },
  {
    "id": "git-q-045",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Cờ `-u` trong `git push -u origin <nhánh>` có tác dụng gì?",
    "options": [
      "Ghi nhớ liên kết nhánh, các lần sau chỉ cần gõ `git push`",
      "Buộc mọi đồng nghiệp phải review nhánh ngay lập tức",
      "Cập nhật (update) main về phiên bản mới nhất",
      "Nén mọi commit thành một trước khi đẩy"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài giải thích `-u` chỉ cần dùng lần đầu mỗi nhánh; nó ghi nhớ liên kết để lần sau chỉ cần `git push`.\n✓ Ghi nhớ liên kết upstream giúp các lần push sau gọn hơn.\n✗ `-u` không bắt buộc ai review; review là bước riêng qua PR.\n✗ `-u` không cập nhật main; đó là việc của `git pull`.\n✗ Nén commit thành một là squash, không liên quan `-u`."
  },
  {
    "id": "git-q-046",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong review, bạn thấy một chỗ tên biến chưa ưng ý nhưng sửa hay không cũng được, không phải lỗi nghiêm trọng. Cách góp ý phù hợp theo bài là gì?",
    "options": [
      "Ghi rõ là `nit:` để báo đây là góp ý vụn vặt, tuỳ tác giả",
      "Bấm Request changes để chặn merge cho tới khi sửa",
      "Im lặng không nói gì để tránh làm phiền",
      "Bấm Approve và tự sửa thẳng vào nhánh của họ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài dạy phân biệt mức độ: lỗi nghiêm trọng mới chặn, còn ý nhỏ kiểu tên biến thì ghi `nit:`.\n✓ Đánh dấu `nit:` cho biết đây là góp ý vụn vặt, sửa hay không tuỳ tác giả.\n✗ Request changes nên dành cho lỗi nghiêm trọng, không phải ý kiến vụn vặt.\n✗ Im lặng đi ngược tinh thần chia sẻ phong cách code trong review.\n✗ Tự sửa thẳng vào nhánh người khác không phải cách góp ý lịch sự được nêu."
  },
  {
    "id": "git-q-047",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khi mở file bị conflict, bạn thấy các ký hiệu `<<<<<<<`, `=======`, `>>>>>>>`. Việc PHẢI làm trước khi commit là gì?",
    "options": [
      "Đọc cả hai phiên bản, quyết định nội dung, rồi xoá sạch các ký hiệu đánh dấu",
      "Giữ nguyên các ký hiệu đó và commit luôn để Git tự xử lý",
      "Xoá ngay phiên bản trên main vì main luôn sai",
      "Chạy `git push --force` để ghi đè lên main"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài hướng dẫn: đọc cả hai phiên bản, quyết định giữ/kết hợp, rồi xoá sạch các dòng đánh dấu trước khi commit.\n✓ Đọc kỹ cả hai bên, quyết định nội dung và xoá hết ký hiệu là quy trình đúng.\n✗ Giữ nguyên ký hiệu rồi commit sẽ để lại rác conflict trong code; Git không tự xử lý.\n✗ Xoá đại một bên (cho rằng main luôn sai) có thể xoá mất công sức đồng nghiệp.\n✗ `git push --force` không phải cách giải quyết conflict bài đề cập."
  },
  {
    "id": "git-q-048",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Nhánh của bạn có 5 commit lặt vặt: \"làm dở\", \"sửa typo\", \"sửa tiếp\", \"xong rồi\", \"à quên 1 chỗ\". Team muốn lịch sử `main` cực gọn, mỗi PR đúng 1 commit. Nên chọn cách merge nào?",
    "options": [
      "Squash and merge — nén 5 commit thành 1 commit duy nhất vào main",
      "Merge commit — giữ nguyên cả 5 commit kèm 1 commit gộp",
      "Không merge, để nhánh sống mãi để giữ lịch sử",
      "Tạo 5 PR riêng cho từng commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài nêu Squash giúp lịch sử main cực gọn — mỗi PR đúng 1 commit, đổi lại mất chi tiết từng bước nhỏ.\n✓ Squash nén toàn bộ commit nháp thành 1, đúng mục tiêu lịch sử gọn mỗi PR một commit.\n✗ Merge commit giữ cả 5 commit vụn nên main dễ thành rừng commit khó đọc.\n✗ Để nhánh sống mãi càng làm tăng nguy cơ conflict, không giải quyết việc gộp.\n✗ Chia thành 5 PR cho từng commit nháp là vô nghĩa và rườm rà."
  },
  {
    "id": "git-q-049",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Đồng nghiệp đã sửa và merge thay đổi vào `main` trong lúc bạn đang làm trên nhánh riêng, giờ GitHub báo \"This branch has conflicts\". Theo bài, cách phổ biến để xử lý là gì?",
    "options": [
      "Đứng ở nhánh của mình, chạy `git pull origin main`, sửa xung đột, rồi `git add .`, `git commit`, `git push`",
      "Bấm nút Merge ngay trên GitHub vì conflict sẽ tự biến mất",
      "Chạy `git switch main` rồi `git commit -m` để ghi đè nhánh kia",
      "Xoá nhánh của mình rồi báo đồng nghiệp làm lại từ đầu"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài hướng dẫn kéo main mới nhất vào nhánh của mình (`git pull origin main`), sửa conflict, rồi add/commit/push.\n✓ Pull main vào nhánh, giải quyết xung đột trên máy, rồi add, commit, push là quy trình bài nêu.\n✗ Bấm Merge không xoá được conflict; GitHub chặn merge cho tới khi conflict được giải quyết.\n✗ Switch sang main rồi commit không giải quyết xung đột trên nhánh của bạn.\n✗ Xoá nhánh làm mất công sức của bạn và không cần thiết."
  },
  {
    "id": "git-q-050",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Theo bài, đâu là commit message TỐT nhất?",
    "options": [
      "Sửa giỏ hàng tính sai tổng khi áp mã giảm giá",
      "cuối cùng cũng chạy!!!",
      "wip",
      "asdfgh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài dạy message phải có nghĩa, dòng đầu ngắn gọn mô tả việc đã làm, viết kiểu mệnh lệnh, không mô tả cảm xúc.\n✓ Câu mô tả rõ thay đổi (sửa lỗi tính tổng khi áp mã giảm giá) là message có nghĩa, viết cho bạn của 6 tháng sau.\n✗ \"cuối cùng cũng chạy!!!\" mô tả cảm xúc, không nói rõ đã làm gì.\n✗ \"wip\" là kiểu nháp bài cảnh báo nên tránh.\n✗ \"asdfgh\" hoàn toàn vô nghĩa, không giúp truy tìm lịch sử."
  },
  {
    "id": "git-q-051",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo bài, đâu là những MỤC ĐÍCH chính của code review? (Chọn tất cả đáp án đúng)",
    "options": [
      "Phát hiện lỗi sớm khi sửa còn rẻ",
      "Lan toả kiến thức để ít nhất 2 người hiểu đoạn code",
      "Giữ phong cách code thống nhất trong nhóm",
      "Để bắt lỗi và chứng minh ai giỏi hơn ai",
      "Để tự động nén các commit thành một"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bài nêu rõ mục đích review là phát hiện lỗi sớm, lan toả kiến thức và giữ phong cách thống nhất — không phải bắt lỗi nhau.\n✓ Phát hiện lỗi sớm vì sửa lúc này rẻ hơn khi đã chạy thật.\n✓ Lan toả kiến thức để ít nhất hai người hiểu đoạn code.\n✓ Giữ phong cách code thống nhất trong nhóm.\n✗ Chứng minh ai giỏi hơn đi ngược tinh thần \"review code, không review con người\".\n✗ Nén commit thành một là squash khi merge, không phải mục đích của review."
  },
  {
    "id": "git-q-052",
    "courseId": "GIT",
    "lesson": "git-04-team-workflow",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Theo bài, đâu là những cách giúp PHÒNG TRÁNH conflict và viết PR hiệu quả? (Chọn tất cả đáp án đúng)",
    "options": [
      "Giữ PR nhỏ và merge sớm",
      "Thường xuyên kéo `main` mới về nhánh của mình",
      "Viết tiêu đề và mô tả PR rõ ràng (Why / What / How to test)",
      "Gộp thật nhiều việc vào một PR 2000 dòng để đỡ phải mở nhiều PR",
      "Để nhánh sống càng lâu càng tốt trước khi merge"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Bài nêu cách phòng conflict tốt nhất là PR nhỏ, merge sớm, thường xuyên kéo main về; và PR cần mô tả rõ Why/What/How to test.\n✓ PR nhỏ và merge sớm giảm nguy cơ xung đột.\n✓ Thường xuyên kéo main mới về nhánh giúp nhánh không lệch quá xa.\n✓ Mô tả rõ ràng theo khung Why/What/How to test giúp review nhanh và đúng.\n✗ PR 2000 dòng thường chỉ được liếc qua rồi duyệt đại, là lúc lỗi lọt lưới.\n✗ Nhánh sống càng lâu xung đột càng nhiều, đi ngược lời khuyên của bài."
  },
  {
    "id": "git-q-053",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa sửa nát file index.html (chưa commit, chưa add) và muốn vứt hết để quay về bản như commit gần nhất. Lệnh nào đúng?",
    "options": [
      "git restore index.html",
      "git revert index.html",
      "git reset --soft index.html",
      "git stash drop index.html"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "restore lấy phiên bản file từ commit gần nhất đè lên bản đang sửa trên bàn làm việc.\n✓ Lệnh khôi phục một file về bản commit gần nhất, vứt thay đổi chưa lưu.\n✗ revert dùng cho commit (tạo commit đảo ngược), không nhận tên file kiểu này.\n✗ reset --soft dùng để gỡ commit, không phải khôi phục nội dung một file đang sửa.\n✗ stash drop dùng để vứt một gói stash, không liên quan khôi phục file."
  },
  {
    "id": "git-q-054",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn lỡ chạy git add index.html nhưng chưa muốn commit nó. Muốn rút file khỏi khu chờ mà GIỮ NGUYÊN nội dung file trên bàn làm việc, dùng lệnh nào?",
    "options": [
      "git restore --staged index.html",
      "git restore index.html",
      "git reset --hard index.html",
      "git stash index.html"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "restore --staged chỉ rút file khỏi Staging Area, không đụng nội dung file trên bàn làm việc.\n✓ Rút file khỏi khu chờ, nội dung sửa vẫn còn nguyên.\n✗ Bỏ cờ --staged sẽ khôi phục nội dung file, làm mất thay đổi đang sửa.\n✗ reset --hard xoá sạch thay đổi, đúng cái bạn muốn giữ.\n✗ stash cất tạm toàn bộ thay đổi, không phải rút riêng file khỏi khu chờ."
  },
  {
    "id": "git-q-055",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn commit xong mới nhớ ra quên thêm file style.css vào commit cuối (CHƯA push). Muốn gộp file đó vào commit cuối mà GIỮ NGUYÊN message cũ, làm thế nào?",
    "options": [
      "git add style.css rồi git commit --amend --no-edit",
      "git add style.css rồi git revert HEAD",
      "git commit --amend -m \"thêm style.css\"",
      "git reset --hard HEAD~1 rồi commit lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "--amend gộp nội dung đã add vào commit cuối; --no-edit giữ nguyên message cũ.\n✓ Add file thiếu rồi amend với --no-edit gộp file vào commit cuối, message không đổi.\n✗ revert HEAD tạo commit đảo ngược chính commit cuối, không phải bổ sung file.\n✗ Dùng -m sẽ thay đổi message, trái yêu cầu giữ nguyên message.\n✗ reset --hard sẽ xoá luôn thay đổi của commit cuối, gây mất code."
  },
  {
    "id": "git-q-056",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một commit lỗi ĐÃ được push lên GitHub và đồng đội có thể đã kéo về. Cách hoàn tác an toàn nhất, không phá lịch sử chung là gì?",
    "options": [
      "git revert <mã-commit> rồi git push",
      "git reset --hard HEAD~1 rồi git push --force",
      "git commit --amend rồi git push",
      "git restore --staged <mã-commit>"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Đã push thì revert: tạo commit mới đảo ngược, lịch sử vẫn đầy đủ và minh bạch.\n✓ revert tạo bút toán đảo ngược, an toàn với commit đã công khai, push bình thường.\n✗ reset --hard + force-push viết lại lịch sử công khai, làm lệch pha với đồng đội.\n✗ amend đổi mã commit đã push, gây xung đột lịch sử với người đã kéo về.\n✗ restore --staged chỉ thao tác khu chờ, không hoàn tác được một commit đã push."
  },
  {
    "id": "git-q-057",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chạy git reset --soft HEAD~1. Trạng thái sau lệnh là gì?",
    "options": [
      "Commit cuối bị gỡ, thay đổi của nó được GIỮ trong khu chờ (staging)",
      "Commit cuối bị gỡ và mọi thay đổi bị xoá sạch khỏi bàn làm việc",
      "Commit cuối bị gỡ, thay đổi về bàn làm việc và khu chờ trống",
      "Một commit mới được tạo để đảo ngược commit cuối"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "--soft chỉ gỡ commit cuối nhưng giữ thay đổi nằm sẵn trong khu chờ.\n✓ Commit bị gỡ, thay đổi vẫn đóng gói sẵn trong staging, sẵn sàng commit lại.\n✗ Xoá sạch bàn làm việc là hành vi của --hard, không phải --soft.\n✗ Đẩy thay đổi về bàn làm việc và dọn trống khu chờ là hành vi của --mixed.\n✗ Tạo commit đảo ngược là hành vi của revert, không phải reset."
  },
  {
    "id": "git-q-058",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn lỡ chạy git reset --hard HEAD~1 và mất một commit cả buổi chiều. Trình tự cứu đúng là gì?",
    "options": [
      "git reflog → chép mã commit đã mất → git reset --hard <mã-commit>",
      "git revert HEAD → git push",
      "git restore . → git commit lại",
      "git stash pop → git commit --amend"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Commit đã từng tạo vẫn nằm trong kho; reflog cho địa chỉ của nó để reset quay lại.\n✓ reflog là camera an ninh ghi mọi di chuyển HEAD; lấy mã rồi reset --hard về đúng commit đó.\n✗ revert HEAD chỉ đảo ngược commit hiện tại, không tìm lại được commit đã bị reset bỏ.\n✗ restore khôi phục file theo commit hiện tại, không khôi phục được commit đã mất.\n✗ stash pop chỉ lấy lại đồ đã stash, không liên quan commit bị reset --hard."
  },
  {
    "id": "git-q-059",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn đang sửa dở tính năng A (code ngổn ngang, chưa muốn commit) thì cần chuyển nhánh gấp, nhưng Git không cho chuyển vì bàn làm việc bừa bộn. Cách gọn nhất?",
    "options": [
      "git stash push -m \"dở dang A\" rồi git switch sang nhánh kia",
      "git reset --hard HEAD rồi git switch",
      "git restore . rồi git switch",
      "git commit --amend rồi git switch"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "stash cất tạm thay đổi vào ngăn kéo, bàn sạch để chuyển nhánh, sau quay lại pop ra.\n✓ stash push (kèm ghi chú) dọn sạch bàn an toàn rồi chuyển nhánh, lát quay lại lấy ra.\n✗ reset --hard xoá sạch code dở dang đang muốn giữ.\n✗ restore . cũng vứt hết thay đổi chưa commit, mất công sức tính năng A.\n✗ amend cần đã có commit để sửa; ở đây bạn chưa muốn commit code ngổn ngang."
  },
  {
    "id": "git-q-060",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Khác biệt giữa git stash pop và git stash apply là gì?",
    "options": [
      "pop lấy gói ra và XOÁ khỏi ngăn kéo; apply lấy ra nhưng VẪN GIỮ bản sao",
      "pop chỉ xem danh sách, apply mới lấy ra",
      "apply lấy ra và xoá; pop chỉ lấy gói cũ nhất",
      "Cả hai giống hệt nhau, chỉ khác tên"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "pop là apply kèm xoá gói; apply giữ lại gói để dùng tiếp.\n✓ pop lấy ra rồi xoá gói; apply lấy ra mà vẫn giữ bản sao trong ngăn kéo.\n✗ Việc xem danh sách là git stash list, không phải pop.\n✗ Mô tả này đảo ngược vai trò hai lệnh.\n✗ Hai lệnh khác nhau ở chỗ có xoá gói stash hay không."
  },
  {
    "id": "git-q-061",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn lỡ commit nhầm vào main thay vì nhánh tinh-nang (main CHƯA push). Trình tự nào đem commit sang đúng nhánh và dọn sạch main?",
    "options": [
      "git switch tinh-nang → git cherry-pick <mã-commit> → git switch main → git reset --hard HEAD~1",
      "git revert <mã-commit> trên main → git switch tinh-nang",
      "git stash trên main → git switch tinh-nang → git stash pop",
      "git restore --staged trên main → git switch tinh-nang"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "cherry-pick gắp commit sang nhánh đúng, rồi reset --hard gỡ nó khỏi main (vì main chưa push).\n✓ Gắp commit sang nhánh đúng rồi reset gỡ khỏi main, an toàn vì main chưa push.\n✗ revert trên main để lại cả commit gốc lẫn commit đảo ngược, làm bẩn lịch sử main và không mang commit sang nhánh kia.\n✗ stash chỉ cất thay đổi chưa commit; ở đây thay đổi đã thành commit nên stash không gắp được.\n✗ restore --staged chỉ thao tác khu chờ, không di chuyển một commit đã tạo."
  },
  {
    "id": "git-q-062",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn chạy git stash pop và nó báo xung đột (conflict). Điều nào ĐÚNG về tình huống này?",
    "options": [
      "Gói stash CHƯA bị xoá; sửa xong conflict, xác nhận ổn rồi mới git stash drop",
      "Gói stash đã tự động bị xoá ngay khi pop, không thể lấy lại",
      "Phải chạy git reset --hard để bỏ conflict rồi pop lại",
      "Conflict này được Git tự giải quyết, bạn không cần làm gì"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Khi pop gặp xung đột, Git giữ lại gói stash để bạn không mất dữ liệu.\n✓ Gói stash chưa bị xoá khi pop xung đột; sửa conflict xong, ổn rồi mới drop thủ công.\n✗ pop chỉ xoá gói khi áp dụng thành công; gặp conflict thì gói còn nguyên.\n✗ reset --hard sẽ xoá luôn các thay đổi đang giải quyết, làm mất công sửa.\n✗ Xung đột phải sửa tay phần giữa dấu <<<<<<< và >>>>>>>, Git không tự giải."
  },
  {
    "id": "git-q-063",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "multi",
    "question": "Những phát biểu nào ĐÚNG về git reflog? (chọn tất cả đáp án đúng)",
    "options": [
      "Nó ghi lại mọi lần con trỏ HEAD di chuyển trên máy bạn",
      "Nó có thể giúp tìm lại commit đã bị reset --hard \"xoá\"",
      "Nó được push lên GitHub để đồng đội cùng dùng",
      "Nó cứu được cả thay đổi chưa bao giờ commit",
      "Bản thân lệnh git reflog chỉ để xem, vô hại"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "reflog là nhật ký riêng từng máy, ghi mọi di chuyển HEAD và chỉ dùng để xem.\n✓ Nó ghi lại mọi lần HEAD di chuyển: commit, reset, chuyển nhánh, amend.\n✓ Nhờ nó tìm được mã commit đã bị reset --hard để khôi phục.\n✓ Bản thân lệnh chỉ xem nhật ký nên hoàn toàn vô hại.\n✗ reflog là nhật ký riêng của từng máy, KHÔNG được push lên GitHub.\n✗ Thứ chưa bao giờ commit thì reflog không cứu được."
  },
  {
    "id": "git-q-064",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Những lệnh/tình huống nào có nguy cơ LÀM MẤT dữ liệu (thay đổi chưa commit hoặc commit)? (chọn tất cả đáp án đúng)",
    "options": [
      "git restore <file> khi file đang có thay đổi chưa commit",
      "git reset --hard HEAD~1",
      "git restore --staged <file>",
      "git revert <mã-commit>",
      "git stash mà không dùng -u khi có file untracked muốn giữ"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Mất dữ liệu xảy ra khi vứt thay đổi chưa được Git chụp ảnh lưu lại.\n✓ restore một file vứt vĩnh viễn thay đổi chưa commit của file đó.\n✓ reset --hard xoá sạch thay đổi chưa commit và gỡ commit cuối, nguy cơ cao.\n✓ stash mặc định không cất file untracked, nên file mới có thể vẫn ở bàn nhưng không được cất; cần -u để cất chúng, nếu không dễ tưởng đã cất mà không có.\n✗ restore --staged chỉ rút khỏi khu chờ, nội dung file vẫn nguyên, vô hại.\n✗ revert chỉ thêm commit đảo ngược, không xoá gì khỏi lịch sử."
  },
  {
    "id": "git-q-065",
    "courseId": "GIT",
    "lesson": "git-05-undo-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Vì sao bài học khuyên ưu tiên git restore và git switch thay vì git checkout?",
    "options": [
      "checkout ôm quá nhiều việc (vừa chuyển nhánh vừa khôi phục file) nên Git tách ra cho rõ ràng",
      "checkout đã bị Git xoá bỏ hoàn toàn, không còn chạy được",
      "restore và switch chạy nhanh hơn checkout nhiều lần",
      "checkout làm mất dữ liệu còn restore thì không bao giờ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "checkout từng kiêm cả chuyển nhánh lẫn khôi phục file nên dễ nhầm; Git tách thành restore và switch.\n✓ Tách việc giúp mỗi lệnh một nhiệm vụ rõ ràng, dễ hiểu hơn.\n✗ checkout vẫn còn dùng được, bạn vẫn gặp trong bài viết cũ, chưa bị xoá bỏ.\n✗ Lý do là sự rõ ràng về ngữ nghĩa, không phải tốc độ.\n✗ restore cũng có thể làm mất thay đổi chưa commit, không phải an toàn tuyệt đối."
  },
  {
    "id": "git-q-066",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Khi nào `git merge feature` tạo ra một fast-forward (không có merge commit)?",
    "options": [
      "Khi nhánh main không có commit mới nào kể từ lúc tách nhánh feature",
      "Khi cả main và feature đều có commit mới sau điểm rẽ",
      "Khi bạn thêm cờ --no-ff",
      "Khi feature có nhiều hơn 3 commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Fast-forward xảy ra khi nhánh đích không tiến thêm, Git chỉ tua con trỏ lên.\n✓ Nhánh main không có commit mới kể từ khi tách: Git tua nhanh, không tạo commit.\n✗ Cả hai nhánh đều tiến: đây là điều kiện của 3-way merge, tạo merge commit.\n✗ Thêm --no-ff: cờ này ép TẠO merge commit, ngược lại fast-forward.\n✗ Số commit của feature không quyết định fast-forward hay không."
  },
  {
    "id": "git-q-067",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một merge commit (3-way) có đặc điểm gì?",
    "options": [
      "Có hai cha (parent): đỉnh main và đỉnh feature",
      "Không có cha nào",
      "Luôn đổi SHA của các commit cũ",
      "Chỉ tồn tại sau khi rebase"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "3-way merge tạo commit gộp ba điểm với hai cha.\n✓ Hai cha: đỉnh main và đỉnh feature, đúng bản chất merge commit.\n✗ Không có cha: chỉ đúng với commit gốc đầu tiên của repo.\n✗ Đổi SHA commit cũ là đặc trưng của rebase, không phải merge.\n✗ Merge commit sinh từ merge, không phải rebase."
  },
  {
    "id": "git-q-068",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi rebase, vì sao các commit A', B', C' có hash khác hẳn A, B, C dù nội dung giống?",
    "options": [
      "Vì rebase tái tạo từng commit với cha mới nên SHA đổi hoàn toàn",
      "Vì rebase nén nội dung lại để tiết kiệm dung lượng",
      "Vì Git ngẫu nhiên gán hash mới cho mọi lần thao tác",
      "Vì rebase đổi tên tác giả của commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rebase viết lại lịch sử: mỗi commit được áp lại trên base mới.\n✓ Tái tạo với cha mới: SHA phụ thuộc cả cha nên đổi hoàn toàn.\n✗ Nén nội dung không liên quan tới hash thay đổi.\n✗ Git không gán hash ngẫu nhiên, hash tính từ nội dung và cha.\n✗ Rebase không tự đổi tác giả; nguyên nhân là cha thay đổi."
  },
  {
    "id": "git-q-069",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn muốn LUÔN có merge commit để giữ dấu vết nhánh feature, kể cả khi fast-forward được. Dùng lệnh nào?",
    "options": [
      "git merge --no-ff feature",
      "git merge --ff-only feature",
      "git rebase feature",
      "git merge --squash feature"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "--no-ff buộc tạo merge commit dù có thể tua nhanh.\n✓ git merge --no-ff feature: giữ dấu vết nhánh, dễ revert cả cụm.\n✗ --ff-only chỉ cho phép fast-forward, ngược yêu cầu.\n✗ rebase tạo lịch sử tuyến tính, không có merge commit.\n✗ --squash gộp thành một commit nhưng không tạo merge commit hai cha."
  },
  {
    "id": "git-q-070",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong quy trình cập nhật feature riêng theo main mới nhất, lệnh nào dùng để đẩy lên sau khi rebase?",
    "options": [
      "git push --force-with-lease",
      "git push",
      "git push --force",
      "git merge --no-ff"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Rebase đổi lịch sử nên push thường bị từ chối; cần force an toàn.\n✓ --force-with-lease: ép push nhưng từ chối nếu remote đã thay đổi ngoài dự kiến.\n✗ git push trần bị reject vì non-fast-forward.\n✗ --force trần ghi đè mù quáng, có thể xoá việc người khác.\n✗ merge --no-ff là lệnh gộp, không phải lệnh push."
  },
  {
    "id": "git-q-071",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một nhánh feature ĐÃ share cho người khác cùng làm. Bạn cần gộp main vào nó. Nên dùng gì?",
    "options": [
      "merge — vì rebase sẽ phá lịch sử của người khác",
      "rebase — vì lịch sử tuyến tính đẹp hơn",
      "rebase -i để squash trước rồi force push",
      "git push --force để đồng bộ nhanh"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Golden rule: không rebase nhánh đã share.\n✓ merge: an toàn, không viết lại lịch sử mà người khác đang dùng.\n✗ rebase nhánh chung làm lịch sử của đồng đội phân nhánh, conflict hỗn loạn.\n✗ squash rồi force push cũng là viết lại lịch sử nhánh đã share, gây hoạ.\n✗ --force lên nhánh chung có thể xoá commit người khác."
  },
  {
    "id": "git-q-072",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Log feature đang có 4 commit: 'Add login form', 'wip add validation', 'asdf', 'fix typo again'. Bạn muốn gộp cả 4 thành 1 commit duy nhất tên 'Add login form', VỨT hết message của 3 commit rác. Sửa danh sách rebase -i thế nào?",
    "options": [
      "pick 'Add login form' rồi fixup cho 3 commit còn lại",
      "squash cho cả 4 dòng",
      "pick cho cả 4 dòng",
      "drop 'Add login form', pick 3 dòng còn lại"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "fixup gộp vào commit phía trên và bỏ luôn message của commit đó.\n✓ pick commit đầu + fixup 3 commit sau: gộp thành 1, giữ đúng message 'Add login form'.\n✗ squash cả 4 không hợp lệ (dòng đầu không có commit trên để gộp vào) và còn giữ message các commit rác.\n✗ pick cả 4 giữ nguyên 4 commit, không gộp.\n✗ drop commit đầu sẽ XOÁ luôn thay đổi của 'Add login form'."
  },
  {
    "id": "git-q-073",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sự khác biệt giữa `squash` và `fixup` trong rebase -i là gì?",
    "options": [
      "squash giữ cả hai lời nhắn để bạn biên tập; fixup vứt lời nhắn của commit này",
      "fixup giữ cả hai lời nhắn; squash vứt lời nhắn",
      "Cả hai đều xoá commit kèm thay đổi",
      "squash chỉ sửa message, fixup dừng để sửa nội dung"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Cả hai gộp vào commit phía trên, khác ở cách xử lý message.\n✓ squash giữ cả hai message để biên tập; fixup vứt message commit hiện tại.\n✗ Mô tả ngược: fixup mới là cái vứt message.\n✗ Xoá kèm thay đổi là drop, không phải squash/fixup.\n✗ Sửa message là reword; dừng sửa nội dung là edit."
  },
  {
    "id": "git-q-074",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Bạn vừa rebase xong và thấy nhánh hỏng, muốn quay lại trạng thái TRƯỚC khi rebase. Những cách nào đúng/khả thi theo bài?",
    "options": [
      "Dùng git reflog tìm HEAD@{n} ngay trước rebase rồi git reset --hard HEAD@{n}",
      "Nếu vẫn còn trong tiến trình rebase, git rebase --abort để về nguyên trạng",
      "Xoá thư mục .git rồi clone lại từ remote",
      "git push --force để remote ghi đè ngược về local",
      "git commit --fixup để hoàn tác"
    ],
    "correctIndices": [
      0,
      1
    ],
    "explanation": "Bài nêu reflog và --abort là phao cứu sinh.\n✓ git reflog + git reset --hard HEAD@{n}: nhảy về đúng trước rebase.\n✓ git rebase --abort: nếu còn đang trong tiến trình rebase, về nguyên trạng ban đầu.\n✗ Xoá .git rồi clone lại không được bài đề cập và sẽ mất công việc chưa push.\n✗ --force chỉ đẩy local lên remote, không giúp khôi phục local đã hỏng.\n✗ git commit --fixup tạo commit sửa lỗi, không phải để hoàn tác rebase."
  },
  {
    "id": "git-q-075",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Khi push sau rebase, vì sao nên dùng `--force-with-lease` thay vì `--force`? Chọn các phát biểu ĐÚNG.",
    "options": [
      "--force-with-lease kiểm tra remote có còn đúng như lần cuối bạn thấy không",
      "--force trần có thể âm thầm xoá commit người khác vừa push",
      "Thấy 'stale info' nghĩa là có người vừa đụng nhánh, nên fetch xem lại thay vì ép push",
      "--force-with-lease không bao giờ bị từ chối trong mọi trường hợp",
      "--force an toàn hơn --force-with-lease vì nó luôn thành công"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "--force-with-lease là force có kiểm soát theo bài.\n✓ Kiểm tra remote còn đúng như lần cuối thấy: đúng cơ chế lease.\n✓ --force trần ghi đè mù quáng, có thể xoá việc người khác.\n✓ 'stale info' báo có người vừa đụng nhánh, nên fetch xem lại.\n✗ --force-with-lease BỊ từ chối khi remote thay đổi ngoài dự kiến.\n✗ '--force an toàn hơn vì luôn thành công' sai hoàn toàn — luôn thành công chính là rủi ro."
  },
  {
    "id": "git-q-076",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đang rebase thì dính conflict. Sau khi sửa file và bỏ marker, bạn `git add <file>` rồi làm gì để áp tiếp các commit còn lại?",
    "options": [
      "git rebase --continue",
      "git rebase --abort",
      "git commit",
      "git merge --continue"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Sau khi giải quyết conflict trong rebase, dùng --continue để đi tiếp.\n✓ git rebase --continue: áp tiếp commit còn lại.\n✗ --abort sẽ bỏ cuộc và quay về nguyên trạng, không phải tiếp tục.\n✗ git commit không cần thiết và không tiếp tục tiến trình rebase.\n✗ merge --continue dành cho merge, không phải rebase."
  },
  {
    "id": "git-q-077",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Lệnh `reword` trong rebase -i làm gì?",
    "options": [
      "Giữ nguyên thay đổi của commit, chỉ sửa commit message",
      "Xoá commit kèm thay đổi của nó",
      "Gộp commit vào commit phía trên",
      "Dừng lại để sửa nội dung file trong commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "reword chỉ động tới message.\n✓ Giữ thay đổi, chỉ sửa message: đúng định nghĩa reword.\n✗ Xoá commit kèm thay đổi là drop.\n✗ Gộp vào commit phía trên là squash/fixup.\n✗ Dừng để sửa nội dung file là edit."
  },
  {
    "id": "git-q-078",
    "courseId": "GIT",
    "lesson": "git-06-rebase-merge",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn lỡ chạy `git rebase -i HEAD~20` và bị choáng, muốn huỷ ngay khi đang ở editor danh sách. Cách an toàn nhất là gì?",
    "options": [
      "Xoá hết các dòng trong editor và lưu file rỗng → rebase abort",
      "Lưu file nguyên trạng rồi xử lý từng commit",
      "Đóng terminal đột ngột",
      "Gõ :q! để thoát mà chắc chắn không có gì thay đổi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Bài chỉ rõ cách huỷ rebase -i ngay tại editor danh sách.\n✓ Xoá hết dòng và lưu file rỗng: rebase abort an toàn, không thay đổi gì.\n✗ Lưu nguyên trạng sẽ thực sự chạy rebase 20 commit, ngược ý muốn huỷ.\n✗ Đóng terminal đột ngột không phải cách an toàn được khuyến nghị.\n✗ :q! là thao tác editor cụ thể, không được bài nêu là cách chuẩn để huỷ an toàn."
  },
  {
    "id": "git-q-079",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa lỡ tay chạy `git reset --hard HEAD~3` và mất 3 commit chưa push. Việc đầu tiên nên làm để cứu là gì?",
    "options": [
      "Chạy `git reflog` để tìm hash của đỉnh trước khi reset, rồi `git reset --hard <hash>`",
      "Clone lại repo từ remote để lấy về các commit đã mất",
      "Chạy `git revert HEAD~3` để hoàn tác lệnh reset",
      "Báo mất luôn, vì `reset --hard` xoá vĩnh viễn các commit"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "reset --hard chưa thật sự xoá object; reflog ghi lại mọi lần HEAD di chuyển nên có địa chỉ để quay lại.\n✓ Dùng reflog tìm hash đỉnh cũ rồi reset --hard về đó là cách chuẩn để phục hồi\n✗ Remote không có các commit chưa push nên clone lại vô ích\n✗ revert tạo commit đảo ngược chứ không khôi phục commit đã reset, và HEAD~3 không phải lệnh reset để hoàn tác\n✗ Commit không mất vĩnh viễn — chúng còn trong kho object khoảng 30-90 ngày"
  },
  {
    "id": "git-q-080",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Một commit đã được push lên branch `main` chung của team gây lỗi production. Cách hoàn tác AN TOÀN nhất là gì?",
    "options": [
      "`git revert <hash>` rồi push, tạo commit mới đảo ngược",
      "`git reset --hard <hash trước đó>` rồi `git push --force`",
      "`git commit --amend` để sửa lại commit lỗi",
      "`git reset --soft HEAD~1` rồi push"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Lịch sử đã push thì dùng revert: nó thêm một commit đảo ngược nên không viết lại lịch sử, ai cũng pull bình thường.\n✓ revert tạo commit mới đảo ngược, an toàn cho lịch sử đã chia sẻ\n✗ reset --hard rồi force push viết lại lịch sử chung, gây lệch lịch sử và xoá việc đồng đội\n✗ amend tạo commit mới khác hash, đã push thì bị từ chối và làm loạn branch chung\n✗ reset --soft cũng viết lại con trỏ branch, không an toàn cho commit đã push"
  },
  {
    "id": "git-q-081",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bug nằm đâu đó trong 200 commit gần nhất. Vì sao `git bisect` chỉ cần khoảng 8 lần kiểm tra?",
    "options": [
      "Vì bisect dùng binary search, chia đôi liên tục (log₂200 ≈ 7.6)",
      "Vì bisect chỉ kiểm tra các commit có thay đổi file liên quan",
      "Vì bisect bỏ qua các commit merge",
      "Vì bisect chạy song song nhiều test cùng lúc"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "bisect chia đôi khoảng commit mỗi bước, nên số lần kiểm tra là logarit cơ số 2 của số commit.\n✓ Binary search chia đôi liên tục: log₂200 ≈ 7.6 nên chỉ ~8 lần test\n✗ bisect không lọc theo file liên quan, nó chia đôi theo số commit\n✗ Việc bỏ qua merge không phải lý do giảm xuống 8 lần\n✗ bisect kiểm tra tuần tự từng commit giữa, không chạy song song"
  },
  {
    "id": "git-q-082",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong script dùng cho `git bisect run`, exit code `125` mang ý nghĩa gì?",
    "options": [
      "Commit này không kiểm tra được, bỏ qua (ví dụ build lỗi vì lý do khác)",
      "Commit này là good",
      "Commit này là bad",
      "Đã tìm thấy thủ phạm, dừng bisect"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "exit 125 báo cho bisect rằng commit này không đánh giá được nên bỏ qua, tránh dùng nó cho kết quả good/bad.\n✓ 125 nghĩa là commit không kiểm tra được, bỏ qua\n✗ good tương ứng exit code 0, không phải 125\n✗ bad tương ứng exit code khác 0 (như 1), nhưng 125 được dành riêng cho skip\n✗ bisect tự kết luận thủ phạm khi thu hẹp xong, không qua exit code 125"
  },
  {
    "id": "git-q-083",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn đã commit bản vá khẩn `fix tinh tien sai` (hash 8e7f6a5) lên branch `feature/dashboard` nhưng production cần nó NGAY trên `main`, chưa thể merge cả feature. Lệnh đúng là gì?",
    "options": [
      "`git checkout main` rồi `git cherry-pick 8e7f6a5`",
      "`git checkout main` rồi `git merge feature/dashboard`",
      "`git rebase feature/dashboard` trên main",
      "`git stash` rồi `git checkout main`"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "cherry-pick sao chép nội dung của đúng một commit cần và áp lên branch hiện tại, tạo commit mới — phù hợp khi chỉ cần một commit chứ không cả feature.\n✓ Chuyển sang main rồi cherry-pick đúng commit hotfix là cách lấy riêng nó\n✗ merge sẽ kéo cả branch feature (gồm commit chưa xong) vào main\n✗ rebase không dùng để bê riêng một commit sang main trong tình huống này\n✗ stash chỉ cất thay đổi chưa commit, không liên quan commit đã có trên feature"
  },
  {
    "id": "git-q-084",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn cherry-pick commit 8e7f6a5 từ `feature/dashboard` sang `main`. Sau này bạn merge cả `feature/dashboard` vào `main`. Điều gì có thể xảy ra và chiến lược sạch hơn là gì?",
    "options": [
      "Commit có thể xuất hiện hai lần hoặc gây conflict thừa, vì cherry-pick tạo commit trùng nội dung nhưng khác hash; nên vá trên main rồi merge main ngược vào feature",
      "Không vấn đề gì vì Git tự nhận ra hai commit giống hệt và gộp lại",
      "Merge sẽ thất bại hoàn toàn và phải rebase lại feature",
      "cherry-pick đã xoá commit gốc trên feature nên merge sẽ thiếu thay đổi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "cherry-pick tạo commit mới khác hash dù nội dung trùng, nên Git xem nó là commit riêng, dễ lặp lại hoặc gây conflict khi merge sau.\n✓ Commit có thể xuất hiện hai lần / conflict thừa; vá trên main rồi merge ngược vào feature là chiến lược sạch hơn\n✗ Git không tự nhận hai commit khác hash là một để gộp\n✗ Merge không thất bại hoàn toàn, chỉ có nguy cơ conflict thừa\n✗ cherry-pick không xoá commit gốc trên feature"
  },
  {
    "id": "git-q-085",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn `git stash pop` nhưng gặp conflict khi áp lại. Sau khi sửa conflict và `git add`, trạng thái của stash trong list ra sao?",
    "options": [
      "Stash vẫn còn trong list — Git không tự drop khi pop gặp conflict, phải `git stash drop` thủ công",
      "Stash đã bị drop tự động vì pop luôn xoá khỏi list",
      "Stash chuyển thành một commit mới tự động",
      "Toàn bộ stash list bị xoá để tránh xung đột tiếp"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "pop = apply + drop, nhưng khi apply gây conflict Git không thực hiện bước drop để giữ an toàn cho dữ liệu của bạn.\n✓ Stash vẫn nằm trong list, phải drop thủ công sau khi xử lý xong\n✗ pop KHÔNG tự drop khi có conflict\n✗ Git không tự biến stash thành commit\n✗ Git không xoá cả stash list"
  },
  {
    "id": "git-q-086",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa viết code mới trong file chưa từng `git add` (untracked). Chạy `git stash` thường rồi chuyển branch — chuyện gì xảy ra với file đó?",
    "options": [
      "File untracked KHÔNG được cất, vẫn nằm trong working dir; cần `git stash -u` để cất nó",
      "File được cất bình thường như mọi thay đổi khác",
      "File bị xoá vĩnh viễn",
      "File tự động được commit trước khi stash"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git stash mặc định bỏ qua file untracked và file đã .gitignore; muốn cất file mới chưa add phải dùng -u.\n✓ File untracked không được cất, cần -u (hoặc -a cho cả ignored)\n✗ stash thường không cất file chưa được track\n✗ File không bị xoá, chỉ là không được stash\n✗ stash không tự commit file"
  },
  {
    "id": "git-q-087",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về `git commit --amend`, những phát biểu nào ĐÚNG?",
    "options": [
      "amend tạo ra commit mới hoàn toàn với hash khác, commit cũ bị bỏ",
      "`git commit --amend --no-edit` giữ nguyên message cũ, dùng khi chỉ quên thêm file",
      "Nếu commit cũ đã push, amend rồi push thường bị từ chối, cần `--force-with-lease`",
      "Nên amend thoải mái commit đã chia sẻ trên branch chung của team",
      "`--force-with-lease` an toàn hơn `--force` vì từ chối ghi đè khi remote có commit mới bạn chưa thấy"
    ],
    "correctIndices": [
      0,
      1,
      2,
      4
    ],
    "explanation": "amend thay thế commit cũ bằng commit mới khác hash, nên chỉ an toàn khi commit còn local hoặc trên branch riêng.\n✓ amend tạo commit mới hash khác, bỏ commit cũ\n✓ --amend --no-edit giữ message cũ, hợp khi chỉ thêm file quên\n✓ Commit đã push thì amend phải push lại bằng --force-with-lease\n✓ --force-with-lease an toàn hơn --force vì chặn ghi đè khi remote có commit mới\n✗ KHÔNG nên amend commit đã chia sẻ trên branch chung — chỉ amend khi còn local hoặc branch riêng"
  },
  {
    "id": "git-q-088",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn lỡ `git add` nhầm file `src/app.ts` nhưng muốn unstage mà GIỮ nguyên thay đổi trong file. Lệnh nào đúng?",
    "options": [
      "`git restore --staged src/app.ts`",
      "`git restore src/app.ts`",
      "`git reset --hard src/app.ts`",
      "`git revert src/app.ts`"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "restore --staged tác động lên vùng staging, bỏ git add nhưng giữ nội dung thay đổi trong working dir.\n✓ restore --staged unstage file mà vẫn giữ thay đổi\n✗ restore (không --staged) sẽ bỏ luôn thay đổi chưa stage của file, mất code\n✗ reset --hard không nhận tên file kiểu này và là lệnh nguy hiểm xoá thay đổi\n✗ revert dùng cho commit, không dùng để unstage file"
  },
  {
    "id": "git-q-089",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "So sánh ba mức của `git reset HEAD~1`, những phát biểu nào ĐÚNG?",
    "options": [
      "`--soft` lùi con trỏ branch 1 commit, GIỮ thay đổi ở cả staging và working dir",
      "`--mixed` (mặc định) lùi branch, BỎ staging nhưng GIỮ thay đổi ở working dir",
      "`--hard` lùi branch, BỎ cả staging lẫn working dir — có thể mất code thật sự",
      "`--soft` xoá luôn working dir như `--hard`",
      "`--mixed` xoá hết thay đổi ở working dir"
    ],
    "correctIndices": [
      0,
      1,
      2
    ],
    "explanation": "Ba mức reset khác nhau ở chỗ giữ/bỏ staging và working dir; chỉ --hard động tới working dir.\n✓ --soft giữ cả staging và working dir, chỉ lùi con trỏ\n✓ --mixed (mặc định) bỏ staging nhưng giữ working dir\n✓ --hard bỏ cả staging và working dir, dễ mất code\n✗ --soft KHÔNG xoá working dir như --hard\n✗ --mixed giữ working dir, không xoá hết"
  },
  {
    "id": "git-q-090",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Sau khi rebase 'đã xong' nhưng kết quả sai, bạn muốn quay về trạng thái ngay trước rebase. Cảnh báo nào về `git reset --hard ORIG_HEAD` là ĐÚNG?",
    "options": [
      "ORIG_HEAD chỉ lưu MỘT thao tác gần nhất; nếu sau rebase bạn lại làm thêm reset, ORIG_HEAD đã bị ghi đè, phải dùng reflog tìm tay",
      "ORIG_HEAD lưu toàn bộ lịch sử các lần rebase nên luôn dùng được",
      "ORIG_HEAD được đẩy lên remote nên đồng đội cũng khôi phục được",
      "ORIG_HEAD chỉ tồn tại khi đang ở giữa rebase chưa xong"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "ORIG_HEAD chỉ lưu một thao tác reset/rebase/merge gần nhất nên dễ bị ghi đè bởi thao tác sau đó.\n✓ ORIG_HEAD chỉ giữ một thao tác gần nhất, làm thêm reset sẽ ghi đè, lúc đó dùng reflog\n✗ Nó không lưu toàn bộ lịch sử rebase\n✗ ORIG_HEAD là local, không đẩy lên remote\n✗ Nó dùng cho rebase đã xong (--abort mới dùng khi đang giữa chừng)"
  },
  {
    "id": "git-q-091",
    "courseId": "GIT",
    "lesson": "git-07-advanced-rescue",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Sau khi `git bisect` tìm ra commit gây bug và in `... is the first bad commit`, bạn BẮT BUỘC phải làm gì tiếp theo?",
    "options": [
      "`git bisect reset` để trả về branch ban đầu",
      "`git bisect bad` một lần nữa để xác nhận",
      "`git commit` để lưu kết quả bisect",
      "Không cần làm gì, Git tự quay về branch cũ"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "bisect để bạn ở trạng thái detached HEAD giữa lịch sử; bisect reset đưa bạn về branch ban đầu.\n✓ bisect reset bắt buộc để thoát detached HEAD và trở lại branch gốc\n✗ Báo bad thêm là thừa, thủ phạm đã được xác định\n✗ commit không liên quan đến kết thúc bisect\n✗ Git không tự quay về — quên reset là kẹt ở detached HEAD"
  },
  {
    "id": "git-q-092",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Team của bạn làm web SaaS, deploy nhiều lần mỗi ngày, một môi trường production. Chiến lược branching nào là mặc định tốt nhất theo bài học?",
    "options": [
      "GitFlow với main + develop + release/* + hotfix/*",
      "GitHub Flow: main luôn deployable, mỗi việc một branch ngắn qua PR",
      "Một branch duy nhất, không bao giờ dùng PR",
      "Tạo branch dài hạn cho từng quý"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Web/SaaS deploy liên tục, một production thì GitHub Flow là mặc định tốt.\n✓ GitHub Flow giữ main luôn deployable, mỗi thay đổi đi qua PR ngắn, hợp deploy thường xuyên.\n✗ GitFlow nặng nề, dành cho sản phẩm có versioning theo lịch, đa số team web không cần.\n✗ Bỏ PR mất review, không phải khuyến nghị của bài.\n✗ Branch dài hạn theo quý đi ngược nguyên tắc branch sống ngắn."
  },
  {
    "id": "git-q-093",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài, branch lý tưởng nên sống trong khoảng bao lâu để conflict nhỏ và dễ review?",
    "options": [
      "Dưới 2-3 ngày",
      "Khoảng 3 tuần",
      "Đúng một tháng",
      "Càng lâu càng tốt để gom nhiều thay đổi"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Quy tắc vàng: branch càng sống lâu, conflict càng đau; branch lý tưởng sống dưới 2-3 ngày.\n✓ Dưới 2-3 ngày giúp integrate sớm, conflict nhỏ.\n✗ Branch sống 3 tuần với nhiều file là cơn ác mộng review và chắc chắn conflict.\n✗ Một tháng còn tệ hơn, đi ngược nguyên tắc short-lived.\n✗ Càng lâu càng tích tụ conflict, sai hoàn toàn."
  },
  {
    "id": "git-q-094",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Khi mở file đang conflict trong lúc chạy git merge (đứng trên branch của bạn), đoạn nằm giữa <<<<<<< HEAD và ======= là gì?",
    "options": [
      "Phần đến từ nhánh kia (theirs)",
      "Tổ tiên chung (BASE)",
      "Phần ở nhánh bạn đang đứng (ours)",
      "Một bản backup tự sinh"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "Trong merge, HEAD/ours đúng là nhánh bạn đang đứng.\n✓ Đoạn giữa <<<<<<< HEAD và ======= là phía của nhánh hiện tại (ours).\n✗ Phần theirs nằm sau ======= cho tới >>>>>>>.\n✗ BASE (tổ tiên chung) không hiển thị trong marker 2 chiều mặc định.\n✗ Marker không phải file backup."
  },
  {
    "id": "git-q-095",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chạy git rebase origin/main và gặp conflict. Đọc marker, đoạn dưới <<<<<<< HEAD thực chất thuộc về bên nào?",
    "options": [
      "origin/main, vì rebase phát lại commit của bạn lên trên main",
      "Commit của bạn, giống hệt như khi merge",
      "Tổ tiên chung của hai nhánh",
      "Không xác định được, phải đoán"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Trong rebase, HEAD/ours là origin/main còn theirs mới là commit của bạn, ngược với trực giác.\n✓ Rebase phát lại commit của bạn LÊN TRÊN main nên HEAD chính là origin/main.\n✗ Nói giống merge là sai vì rebase đảo nghĩa ours/theirs.\n✗ HEAD không phải tổ tiên chung; đó là BASE.\n✗ Không cần đoán, đọc tên sau >>>>>>> là biết chắc."
  },
  {
    "id": "git-q-096",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đang ở giữa một rebase dở dang nhiều conflict, bạn muốn quay về trạng thái sạch như chưa làm gì. Lệnh nào đúng?",
    "options": [
      "git rebase --continue",
      "git reset --hard HEAD",
      "git rebase --abort",
      "git merge --abort"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "git rebase --abort huỷ rebase và đưa branch về như trước khi rebase.\n✓ git rebase --abort là cách thoát an toàn khỏi rebase đang dở.\n✗ git rebase --continue đi tiếp chứ không huỷ, cần đã add file giải xong.\n✗ git reset --hard HEAD không phải cách chính tắc thoát rebase và có thể gây rối.\n✗ git merge --abort dùng cho merge, không áp dụng khi đang rebase."
  },
  {
    "id": "git-q-097",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Lỡ rebase branch riêng đã push trước đó, bây giờ cần push lại. Lệnh nào AN TOÀN nhất và vì sao?",
    "options": [
      "git push --force vì nó luôn ghi đè được",
      "git push --force-with-lease vì nó từ chối nếu remote có commit bạn chưa thấy",
      "git push thường, không cần cờ gì",
      "git push --mirror để đồng bộ toàn bộ"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "--force-with-lease an toàn hơn --force vì kiểm tra remote chưa có commit lạ trước khi ghi đè.\n✓ --force-with-lease từ chối push nếu remote có commit bạn chưa thấy, tránh xoá việc người khác.\n✗ --force ghi đè vô điều kiện, dễ xoá mất commit của người khác.\n✗ push thường sẽ bị từ chối vì lịch sử đã bị viết lại.\n✗ --mirror đồng bộ mọi ref, không phải công cụ cho tình huống này."
  },
  {
    "id": "git-q-098",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Trong lúc MERGE, bạn chắc chắn muốn lấy nguyên cả file config/prod.json theo phía nhánh đang đứng (ours). Lệnh nào đúng?",
    "options": [
      "git checkout --theirs config/prod.json",
      "git checkout --ours config/prod.json",
      "git reset config/prod.json",
      "git show :1:config/prod.json"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "git checkout --ours giữ nguyên cả file theo phía nhánh đang đứng (khi merge).\n✓ git checkout --ours config/prod.json lấy phía ours rồi git add là xong.\n✗ --theirs lấy phía nhánh được merge vào, ngược yêu cầu.\n✗ git reset không chọn một phía của conflict.\n✗ git show :1: chỉ in ra phiên bản base, không giải conflict."
  },
  {
    "id": "git-q-099",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Conflict cần GIỮ phần logic này của bên A nhưng phần signature kia của bên B trong cùng một file. Cách xử lý đúng là gì?",
    "options": [
      "Dùng git checkout --ours cho cả file",
      "Dùng git checkout --theirs cho cả file",
      "Sửa tay từng hunk theo marker, trộn đoạn cần giữ",
      "Chạy git rerere forget rồi bỏ qua"
    ],
    "correctIndices": [
      2
    ],
    "explanation": "--ours/--theirs lấy nguyên cả file một phía; muốn trộn từng phần phải sửa tay từng hunk.\n✓ Sửa tay theo marker cho phép giữ phần A và phần B trong cùng file.\n✗ checkout --ours lấy trọn một phía, mất phần của bên kia.\n✗ checkout --theirs cũng lấy trọn một phía, không trộn được.\n✗ rerere forget chỉ quên cách giải đã ghi, không giúp trộn hunk."
  },
  {
    "id": "git-q-100",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Trong bố cục mergetool 3-way, vai trò của panel BASE là gì?",
    "options": [
      "Là kết quả cuối cùng sẽ được lưu",
      "Là phiên bản trước khi hai nhánh rẽ ra, để biết mỗi bên đã đổi gì so với gốc",
      "Là phía nhánh đang đứng (ours)",
      "Là bản backup .orig sau khi giải"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "BASE là tổ tiên chung, phiên bản trước khi hai bên rẽ nhánh.\n✓ Nhìn BASE để biết mỗi bên thay đổi gì so với gốc, từ đó quyết định giữ gì.\n✗ Kết quả cuối là panel KẾT QUẢ, không phải BASE.\n✗ Phía ours là panel HEAD riêng, khác BASE.\n✗ File .orig là rác backup, không phải panel BASE; có thể tắt bằng keepBackup false."
  },
  {
    "id": "git-q-101",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn bật rerere, nhưng lần đầu giải một conflict SAI. Lần rebase sau Git báo 'Resolved ... using previous resolution' với kết quả lạ. Cách sửa đúng?",
    "options": [
      "Tắt rerere vĩnh viễn bằng rerere.enabled false",
      "git rerere forget <file> rồi giải lại cho đúng",
      "git rebase --abort và không bao giờ dùng rerere nữa",
      "git push --force để ghi đè kết quả lạ"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "rerere áp lại đúng cách bạn từng giải, kể cả khi giải sai, nên phải quên cái sai đi.\n✓ git rerere forget <file> xoá cách giải sai để bạn giải lại đúng.\n✗ Tắt rerere hẳn là phản ứng thái quá; nó vẫn rất hữu ích.\n✗ abort rồi bỏ rerere không giải quyết gốc rễ là cách giải sai đã lưu.\n✗ push --force không liên quan tới việc rerere áp lại cách giải sai."
  },
  {
    "id": "git-q-102",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Chọn TẤT CẢ phát biểu ĐÚNG về rebase so với merge khi cập nhật feature branch theo bài học.",
    "options": [
      "Rebase viết lại commit hash, tạo commit mới",
      "Merge tạo một merge commit và để lại lịch sử rẽ nhánh",
      "Rebase luôn an toàn kể cả với branch đã được người khác dùng chung",
      "Sau rebase một branch đã push, nên push lại bằng --force-with-lease",
      "Merge làm lịch sử thẳng tuyến, sạch hơn rebase"
    ],
    "correctIndices": [
      0,
      1,
      3
    ],
    "explanation": "Rebase viết lại hash và cho lịch sử thẳng; merge tạo merge commit; golden rule cấm rebase branch chung.\n✓ Rebase phát lại commit nên hash bị viết lại thành commit mới.\n✓ Merge sinh merge commit, lịch sử rẽ nhánh.\n✓ Sau rebase branch đã push thì push lại bằng --force-with-lease.\n✗ Rebase KHÔNG an toàn với branch đã share; golden rule cấm điều này.\n✗ Chính rebase mới cho lịch sử thẳng tuyến; merge để lại merge commit."
  },
  {
    "id": "git-q-103",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "multi",
    "question": "Theo phần Conventional Commits & commit message, đâu là các thực hành ĐÚNG?",
    "options": [
      "feat(auth): thêm refresh token tự động khi 401",
      "Mỗi commit nên atomic, một thay đổi logic hoàn chỉnh",
      "git commit -m \"fix\" cho nhanh gọn",
      "Gộp sửa bug + đổi format + thêm feature vào một commit",
      "Dùng BREAKING CHANGE ở footer khi thay đổi phá vỡ tương thích"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Conventional Commits đề cao message rõ type/scope, commit atomic và footer BREAKING CHANGE.\n✓ feat(auth): thêm refresh token... là message theo đúng quy ước.\n✓ Commit nên atomic, một thay đổi logic hoàn chỉnh.\n✓ BREAKING CHANGE ở footer báo phá vỡ tương thích, đúng quy ước.\n✗ \"fix\" trống nghĩa là ví dụ message tệ.\n✗ Gộp nhiều loại thay đổi khiến revert và git bisect khốn khổ."
  },
  {
    "id": "git-q-104",
    "courseId": "GIT",
    "lesson": "git-08-branching-conflict",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Trước khi gửi PR, bạn muốn xem CHÍNH XÁC những thay đổi mà PR sẽ chứa so với main. Lệnh nào phù hợp?",
    "options": [
      "git diff origin/main...HEAD",
      "git status",
      "git log --oneline",
      "git branch -a"
    ],
    "correctIndices": [
      0
    ],
    "explanation": "git diff origin/main...HEAD cho xem đúng nội dung PR để tự review trước khi gửi.\n✓ git diff origin/main...HEAD hiển thị đúng tập thay đổi PR sẽ mang.\n✗ git status chỉ liệt kê file thay đổi/chưa commit, không phải diff PR.\n✗ git log --oneline chỉ liệt kê commit, không thấy nội dung diff.\n✗ git branch -a chỉ liệt kê branch, không liên quan diff."
  },
  {
    "id": "git-q-105",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Theo bài học, Git thật ra lưu lịch sử dự án dưới dạng gì?",
    "options": [
      "Các bản diff (khác biệt) giữa từng phiên bản file",
      "Toàn bộ ảnh chụp (snapshot) qua các object blob/tree/commit",
      "Một file nhật ký text ghi mọi lệnh đã chạy",
      "Một bản nén của thư mục làm việc tại mỗi lần push"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Git là database key-value lưu ảnh chụp, không lưu diff.\n✓ Lưu toàn bộ snapshot qua blob/tree/commit, mỗi object định danh bằng SHA của nội dung.\n✗ Diff không được lưu sẵn — git diff tính ra tại chỗ bằng cách so hai ảnh chụp.\n✗ Nhật ký lệnh không phải cách Git lưu lịch sử nội dung.\n✗ Git không nén thư mục mỗi lần push thành một khối."
  },
  {
    "id": "git-q-106",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Một branch trong Git thực chất là gì?",
    "options": [
      "Một bản sao đầy đủ của toàn bộ code",
      "Một file text khoảng 41 byte chứa SHA của commit cuối",
      "Một thư mục riêng trong .git/objects",
      "Một bản diff so với nhánh main"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Branch chỉ là một con trỏ tới SHA, nằm trong .git/refs/heads/.\n✓ Là file text ~41 byte chứa SHA commit cuối → tạo branch chỉ là ghi thêm một file nhỏ.\n✗ Branch không sao chép code, đó là quan niệm sai phổ biến.\n✗ Object database (blob/tree/commit) nằm trong objects/, nhưng branch là ref, không phải object.\n✗ Branch không lưu diff so với main."
  },
  {
    "id": "git-q-107",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn chạy `git checkout 3e4d5c6` để xem lại code cũ và thấy thông báo 'detached HEAD'. Cách hiểu nào đúng?",
    "options": [
      "Repo bị hỏng, cần git clone lại",
      "HEAD đang trỏ thẳng vào commit thay vì qua một branch; không mất data",
      "Toàn bộ commit sau 3e4d5c6 đã bị xoá vĩnh viễn",
      "Bạn không thể đọc file nào trong trạng thái này"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Detached HEAD là HEAD trỏ thẳng commit, không qua branch — hữu ích để xem/thử nghiệm.\n✓ Đúng bản chất: HEAD trỏ thẳng vào commit, không mất data; chưa commit gì thì git switch main là về.\n✗ Không phải repo hỏng, không cần clone lại.\n✗ Các commit khác vẫn còn nguyên, không bị xoá.\n✗ Vẫn đọc/xem file bình thường."
  },
  {
    "id": "git-q-108",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn đang ở detached HEAD, lỡ tạo vài commit quan trọng rồi định switch sang nhánh khác. Lệnh nào giữ lại số commit đó an toàn nhất TRƯỚC khi rời đi?",
    "options": [
      "git switch -c nhanh-cuu-vot",
      "git checkout main",
      "git commit --amend",
      "git tag v0.0.1 -m \"tam\""
    ],
    "correctIndices": [
      0
    ],
    "explanation": "Commit ở detached HEAD không có nhánh trỏ tới → cần gắn branch trước khi rời.\n✓ `git switch -c nhanh-cuu-vot` gắn một branch mới ngay tại chỗ đang đứng, giữ trọn các commit.\n✗ `git checkout main` rời đi mà chưa gắn gì → các commit dễ bị 'lạc'.\n✗ `git commit --amend` chỉ sửa commit cuối, không giải quyết việc thiếu nhánh trỏ tới.\n✗ Tag không phải cách bài học khuyên để cứu nhánh đang dở; bài dùng switch -c."
  },
  {
    "id": "git-q-109",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Vì sao chỉ đặt một pre-commit hook trong `.git/hooks/` là KHÔNG đủ để cả team cùng có nó?",
    "options": [
      "Hook chỉ chạy được trên Linux",
      "Thư mục .git/hooks/ không được commit lên repo nên đồng đội không tự có",
      "Hook bị Git mã hoá nên không chia sẻ được",
      "Hook chỉ chạy lúc push, không chạy lúc commit"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Hook nằm trong .git/ — phần không được đẩy lên remote.\n✓ .git/hooks/ không được commit → người khác clone về không có hook; vì vậy thực tế dùng husky để chia sẻ được.\n✗ Hook không giới hạn theo hệ điều hành như vậy.\n✗ Git không mã hoá hook.\n✗ pre-commit chạy trước khi commit hoàn tất, không phải lúc push."
  },
  {
    "id": "git-q-110",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Theo bài học, vì sao hook ở máy local chỉ nên coi là 'tuyến phòng thủ đầu' chứ không phải tuyến bắt buộc?",
    "options": [
      "Hook chạy rất chậm nên hay bị tắt",
      "Có thể bỏ qua hook bằng git commit --no-verify nên tuyến bắt buộc phải đặt ở CI trên server",
      "Hook chỉ kiểm tra được file .js",
      "Hook luôn yêu cầu quyền admin mới chạy"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Hook chạy local nên không bắt buộc tuyệt đối.\n✓ `git commit --no-verify` bỏ qua được hook → tuyến phòng thủ thật sự, bắt buộc nằm ở CI trên server.\n✗ Vấn đề không phải tốc độ.\n✗ Hook không giới hạn ở .js (lint-staged có thể cấu hình nhiều loại).\n✗ Hook không đòi quyền admin."
  },
  {
    "id": "git-q-111",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Bạn sắp đánh dấu một bản phát hành chính thức v1.0.0. Bài học khuyên dùng cách nào?",
    "options": [
      "git tag v1.0.0 (lightweight)",
      "git tag -a v1.0.0 -m \"Ban phat hanh dau\" (annotated)",
      "git branch v1.0.0",
      "git commit -m \"v1.0.0\""
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Release chính thức nên dùng annotated tag vì mang đủ thông tin.\n✓ `git tag -a` tạo một object thật có tác giả + ngày + message, là thứ git describe và pipeline dựa vào.\n✗ Lightweight tag chỉ là con trỏ, không lưu tác giả/ngày/message → chỉ hợp đánh dấu tạm cá nhân.\n✗ Branch không phải nhãn release.\n✗ Một commit thường không phải là tag."
  },
  {
    "id": "git-q-112",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "easy",
    "type": "single",
    "question": "Bạn vừa tạo tag v1.0.0 và chạy `git push`, nhưng trên GitHub không thấy tag. Vì sao?",
    "options": [
      "Tag chỉ hiện sau 24 giờ",
      "Tag không tự push theo, phải đẩy riêng bằng git push origin v1.0.0 hoặc --tags",
      "Phải xoá branch cũ thì tag mới hiện",
      "Tag chỉ push được khi đã ký GPG"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "git push thường không đẩy tag.\n✓ Tag phải đẩy riêng: git push origin v1.0.0 hoặc git push origin --tags.\n✗ Không có chuyện trễ 24 giờ.\n✗ Không liên quan việc xoá branch.\n✗ Push tag không yêu cầu ký GPG."
  },
  {
    "id": "git-q-113",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về Git submodule, theo bài học những phát biểu nào ĐÚNG?",
    "options": [
      "Repo cha chỉ lưu một con trỏ SHA tới commit của repo con, không lưu code con",
      "Clone repo cha mà quên --recurse-submodules sẽ thấy thư mục submodule rỗng",
      "Subtree luôn khó vận hành hơn submodule",
      "Cập nhật submodule chỉ cần một bước duy nhất ở repo cha",
      "Lỡ quên có thể sửa bằng git submodule update --init --recursive"
    ],
    "correctIndices": [
      0,
      1,
      4
    ],
    "explanation": "Submodule lưu con trỏ SHA và đòi thao tác clone đặc biệt.\n✓ Repo cha chỉ giữ con trỏ SHA tới commit repo con, không lưu code con.\n✓ Quên --recurse-submodules → thư mục submodule rỗng, lỗi kinh điển.\n✓ git submodule update --init --recursive cứu được khi lỡ quên.\n✗ Bài đánh giá submodule độ phức tạp Cao, subtree Trung bình → không phải subtree luôn khó hơn.\n✗ Cập nhật submodule phải hai bước (pull ở repo con rồi commit con trỏ mới ở cha), không phải một bước."
  },
  {
    "id": "git-q-114",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Dự án của bạn cần version hoá nhiều file .psd và .mp4 lớn. Bài học khuyên xử lý thế nào và ở thời điểm nào?",
    "options": [
      "Commit thẳng file lớn vào repo, không cần công cụ gì",
      "Dùng Git LFS và bật nó TRƯỚC khi commit file lớn (cấu hình từ commit đầu)",
      "Nén file lại rồi commit, gỡ nén khi cần",
      "Để file lớn trong .gitignore và gửi qua email"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Git LFS thay file lớn bằng con trỏ text, nội dung thật nằm trên server riêng.\n✓ Dùng LFS và bật trước khi commit; file lớn lỡ vào lịch sử thì gỡ rất đau (phải git filter-repo).\n✗ Commit thẳng file lớn làm repo phình to mãi mãi, clone chậm vĩnh viễn.\n✗ Nén thủ công không giải quyết vấn đề lịch sử phình.\n✗ Đưa vào .gitignore nghĩa là không version hoá được file đó, sai yêu cầu."
  },
  {
    "id": "git-q-115",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "single",
    "question": "Bạn lỡ commit và push file `.env` chứa secret, giờ thêm `.env` vào `.gitignore`. Việc này có đủ an toàn không?",
    "options": [
      "Đủ, vì .gitignore sẽ tự xoá file khỏi mọi nơi",
      "Không — .gitignore chỉ tác dụng với file chưa từng track; phải git rm --cached .env, và vì secret đã lộ nên phải đổi secret",
      "Đủ, chỉ cần thêm vào .gitignore là Git ngừng theo dõi file đã commit",
      "Không cần làm gì, file đã push thì tự an toàn"
    ],
    "correctIndices": [
      1
    ],
    "explanation": ".gitignore không ảnh hưởng file đã được track.\n✓ Phải git rm --cached .env rồi commit; quan trọng hơn, secret đã push coi như đã lộ → phải đổi secret ngay.\n✗ .gitignore không tự gỡ file đã track ở mọi nơi.\n✗ File đã commit không tự ngừng theo dõi khi thêm vào .gitignore.\n✗ File đã push không tự an toàn — secret lộ là rủi ro thật."
  },
  {
    "id": "git-q-116",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "medium",
    "type": "single",
    "question": "Đang code dở nhánh `feature`, bạn cần gấp checkout nhánh `hotfix` để xử lý mà KHÔNG đụng tới code đang dở. Cách nào trong bài là gọn nhất?",
    "options": [
      "git clone repo lần hai vào thư mục khác",
      "git worktree add ../duan-hotfix hotfix rồi sang đó làm",
      "Xoá nhánh feature rồi tạo lại sau",
      "git reset --hard hotfix"
    ],
    "correctIndices": [
      1
    ],
    "explanation": "Worktree cho phép checkout nhiều nhánh ra nhiều thư mục, dùng chung một .git.\n✓ git worktree add tạo thư mục mới checkout sẵn hotfix, code feature đang dở giữ nguyên, không tốn dung lượng nhân đôi.\n✗ Clone lần hai nặng hơn vì không dùng chung object database.\n✗ Xoá nhánh feature làm mất chỗ đang code dở.\n✗ git reset --hard sẽ ghi đè code đang dở, mất dữ liệu chưa commit."
  },
  {
    "id": "git-q-117",
    "courseId": "GIT",
    "lesson": "git-09-internals-pro",
    "certifications": [
      "GIT"
    ],
    "difficulty": "hard",
    "type": "multi",
    "question": "Về ký commit (GPG/SSH) và .gitattributes, những phát biểu nào ĐÚNG theo bài?",
    "options": [
      "Ký commit mã hoá toàn bộ code để người khác không đọc được",
      "Ký commit chỉ xác thực danh tính, chống mạo danh; GitHub hiển thị nhãn Verified",
      "Trường author trong commit là text tự khai nên có thể bị giả mạo",
      "Đặt `* text=auto` trong .gitattributes giúp dẹp loạn CRLF/LF giữa Windows và Linux",
      "Một nhánh có thể được checkout đồng thời ở hai worktree khác nhau"
    ],
    "correctIndices": [
      1,
      2,
      3
    ],
    "explanation": "Ký commit xác thực danh tính; .gitattributes điều khiển cách xử lý file.\n✓ Ký chỉ xác thực danh tính, chống mạo danh, và GitHub hiện nhãn Verified.\n✓ author là text tự khai → ai cũng đặt được tên/email người khác, vì thế cần ký.\n✓ `* text=auto` chuẩn hoá line ending, dẹp bệnh diff báo 'cả file thay đổi' giữa các OS.\n✗ Ký commit KHÔNG mã hoá code.\n✗ Git chặn checkout một nhánh ở hai worktree cùng lúc để tránh giẫm chân nhau."
  }
];

export const generatedKnowledge: Question[] = [...k1];
