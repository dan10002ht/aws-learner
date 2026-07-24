# Bài 1 — Hệ phân tán là gì? Vì sao khó — 8 fallacies

## 1. Mục tiêu
Sau bài này bạn có thể:
- Định nghĩa **hệ phân tán** và nói rõ nó khác một chương trình chạy trên một máy ở điểm nào.
- Giải thích **vì sao hệ phân tán khó** một cách bản chất, không sáo rỗng — gốc rễ là **partial failure** và **không có đồng hồ chung**.
- Thuộc lòng **8 fallacies of distributed computing** và mỗi cái sai ở đâu trong thực tế.
- Nhận ra các thách thức này chính là lý do tồn tại của mọi thứ học sau: CAP, replication, consensus, Kafka, Redis, Kubernetes.

---

## 2. Lý thuyết

### 2.1 Hệ phân tán là gì?

> **Hệ phân tán** là một tập các máy tính độc lập, giao tiếp qua mạng, phối hợp để người dùng thấy như **một hệ thống duy nhất**.

Leslie Lamport (cha đẻ nhiều nền tảng lĩnh vực này) có một câu kinh điển:

> *"A distributed system is one in which the failure of a computer you didn't even know existed can render your own computer unusable."*
> (Hệ phân tán là nơi mà một máy bạn còn không biết nó tồn tại bị hỏng lại làm máy của bạn đứng hình.)

Câu đó tóm gọn toàn bộ nỗi đau: **các phần phụ thuộc nhau qua mạng, và mạng thì không đáng tin.**

### 2.2 Vì sao khó? Ba gốc rễ

Mọi khó khăn về sau đều mọc ra từ ba thứ này:

| Gốc rễ | Trên 1 máy | Trong hệ phân tán |
|--------|-----------|-------------------|
| **Partial failure** | Hoặc chạy, hoặc chết cả — biết rõ | Một phần chết, phần khác sống; và **bạn không phân biệt được** node kia *chết* hay chỉ *chậm/mất mạng* |
| **Không có đồng hồ chung** | Một clock, thứ tự rõ ràng | Mỗi máy một clock lệch nhau; "cái nào xảy ra trước" trở nên mơ hồ |
| **Concurrency & mạng** | Gọi hàm = tức thì, tin cậy | Gọi qua mạng = có độ trễ, có thể mất/lặp/đảo thứ tự gói tin |

Điểm chí mạng là dòng **partial failure**: khi gọi node B mà không thấy trả lời, bạn **không thể biết** B đã chết, hay B xử lý xong rồi nhưng trả lời bị mất, hay B chỉ đang chậm. Ba khả năng đó đòi hỏi ba cách xử lý khác nhau — mà bạn lại mù thông tin.

<svg viewBox="0 0 680 220" role="img" aria-labelledby="pf-t pf-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="pf-t">Partial failure: timeout không phân biệt được ba tình huống</title>
<desc id="pf-d">Node A gửi request tới B và bị timeout, có ba nguyên nhân khác nhau không phân biệt được</desc>
<rect x="20" y="90" width="90" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="117" text-anchor="middle" font-size="13" fill="currentColor">Node A</text>
<line x1="110" y1="112" x2="250" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#a1)"/>
<text x="180" y="103" text-anchor="middle" font-size="11" fill="currentColor">request</text>
<text x="180" y="130" text-anchor="middle" font-size="11" fill="#f43f5e">? (timeout)</text>
<rect x="255" y="20" width="180" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="45" text-anchor="middle" font-size="12" fill="currentColor">1. B đã chết</text>
<rect x="255" y="92" width="180" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="117" text-anchor="middle" font-size="12" fill="currentColor">2. B xong, reply bị mất</text>
<rect x="255" y="164" width="180" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="189" text-anchor="middle" font-size="12" fill="currentColor">3. B chỉ đang chậm</text>
<text x="565" y="112" text-anchor="middle" font-size="12" fill="currentColor">A không thể</text>
<text x="565" y="130" text-anchor="middle" font-size="12" fill="currentColor">phân biệt!</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Vì sao vẫn phải chấp nhận cái khó đó?

Không ai xây hệ phân tán cho vui. Ta buộc phải phân tán vì:
- **Scale**: một máy có trần CPU/RAM/đĩa; dữ liệu & tải vượt trần thì phải chia nhiều máy.
- **Fault tolerance**: một máy chết là sập; muốn "luôn sống" phải có nhiều bản sao ở nhiều nơi.
- **Latency địa lý**: người dùng toàn cầu cần server gần họ.

→ Ta **đánh đổi** sự đơn giản của một máy để lấy scale và độ sẵn sàng. Cả môn học này là về **quản lý cái đánh đổi đó cho đúng**.

---

## 3. 8 Fallacies of Distributed Computing

Năm 1994, các kỹ sư ở Sun Microsystems đúc kết 8 **giả định sai** mà lập trình viên mới hay mắc khi bước vào hệ phân tán. Thuộc nó giúp bạn tránh 80% lỗi ngây thơ.

| # | Fallacy (giả định sai) | Thực tế phũ phàng |
|---|------------------------|-------------------|
| 1 | **The network is reliable** | Gói tin mất, kết nối rớt, switch hỏng. Luôn phải xử lý lỗi gọi mạng. |
| 2 | **Latency is zero** | Gọi qua mạng chậm hơn gọi hàm cục bộ hàng nghìn–triệu lần. Đừng chatty. |
| 3 | **Bandwidth is infinite** | Băng thông hữu hạn & tốn tiền; payload lớn làm nghẽn. |
| 4 | **The network is secure** | Mạng có kẻ nghe lén/giả mạo. Phải mã hoá & xác thực (mTLS...). |
| 5 | **Topology doesn't change** | Node thêm/bớt, IP đổi, DNS đổi liên tục (nhất là cloud/k8s). |
| 6 | **There is one administrator** | Nhiều team, nhiều hệ, nhiều chính sách — không ai nắm toàn cục. |
| 7 | **Transport cost is zero** | Serialize/deserialize + hạ tầng mạng tốn CPU & tiền thật. |
| 8 | **The network is homogeneous** | Nhiều loại thiết bị/giao thức/phiên bản cùng tồn tại. |

> **Cách dùng thực tế:** mỗi khi bạn viết một lời gọi tới service khác, tự hỏi: *"Nếu cái này chậm 5 giây thì sao? Nếu nó timeout thì sao? Nếu gói tin bị lặp thì sao?"* — đó chính là fallacy 1 & 2 đang nhắc bạn.

---

## 4. Bản đồ: các thách thức này dẫn tới cái gì

Mỗi khó khăn ở trên là **lý do tồn tại** của một chủ đề bạn sẽ học:

| Thách thức | Sinh ra chủ đề (bài/chương sau) |
|-----------|-------------------------------|
| Không có clock chung | Logical clock, vector clock (Ch.6) |
| Partial failure khi ghi nhiều bản | Replication & quorum (Ch.3) |
| Nhiều node phải "đồng ý" một giá trị | Consensus, Raft (Ch.5) |
| Dữ liệu vượt 1 máy | Partitioning, consistent hashing (Ch.4) |
| Đánh đổi nhất quán ↔ sẵn sàng | CAP / PACELC (Ch.2) |
| Retry an toàn khi mạng mất reply | Idempotency, exactly-once (Ch.7) |
| Giao dịch qua nhiều service | 2PC, Saga (Ch.7) |

→ Đừng học rời rạc. Hãy nhớ: **tất cả đều là cách con người thuần hoá ba gốc rễ ở mục 2.2.**

---

## 5. Ví dụ đời thường

Hãy hình dung **đặt món qua app**: app gọi *Order service*, nó gọi *Payment*, *Inventory*, rồi *Delivery*. Bốn service, bốn máy khác nhau qua mạng.
- Payment trừ tiền xong nhưng reply bị mất → app tưởng thất bại, người dùng bấm lại → **trừ tiền hai lần** (fallacy 1 + thiếu idempotency).
- Inventory ở data center khác, clock lệch → log hai nơi ghi thứ tự mâu thuẫn (không có clock chung).
- Delivery đang deploy, IP đổi → gọi vào IP cũ, timeout (fallacy 5).

Cả cuốn giáo trình này dạy bạn xử lý đúng từng tình huống đó.

---

## 6. Tóm tắt
- **Hệ phân tán** = nhiều máy độc lập qua mạng, hiện ra như một hệ thống; ta chấp nhận nó để có **scale, fault tolerance, latency thấp**.
- Ba gốc rễ của mọi khó khăn: **partial failure**, **không có đồng hồ chung**, **mạng không tin cậy/có độ trễ**.
- Chí mạng nhất là **timeout không phân biệt được** node chết / reply mất / node chậm.
- **8 fallacies** là danh sách giả định sai phải luôn ghi nhớ khi gọi qua mạng.
- Mọi chủ đề sau (CAP, replication, consensus, idempotency...) đều là **giải pháp cho các gốc rễ này** — học theo mạch đó sẽ thấy tất cả liền một khối.

> **Bài tiếp theo (Bài 2):** hình thức hoá các giả định — **mô hình hệ thống (sync/async) & mô hình lỗi (crash → Byzantine)**, ngôn ngữ chung để lý luận chặt chẽ về mọi thuật toán phân tán.
