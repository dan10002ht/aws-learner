# Bài 2 — Mô hình hệ thống & mô hình lỗi

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao phải mô hình hoá** một hệ phân tán trước khi thiết kế thuật toán — thay vì "cứ code rồi tính".
- Phân biệt ba **timing model**: **synchronous**, **asynchronous**, **partial synchronous** — mỗi cái giả định gì về độ trễ mạng và clock.
- Nắm bốn **failure model** theo mức độ hiểm ác tăng dần: **crash-stop → crash-recovery → omission → Byzantine**, và phân biệt **fail-stop** với **fail-silent**.
- Hiểu vì sao **cặp (timing model, failure model)** quyết định thuật toán nào *khả thi* — và tại sao kết quả **FLP** lại là hệ quả trực tiếp của việc chọn mô hình.

---

## 2. Lý thuyết

### 2.1 Vì sao phải mô hình hoá?

Bài 1 nói hệ phân tán khó vì **partial failure** và **không có clock chung**. Nhưng "khó" thì chưa lý luận được. Muốn chứng minh một thuật toán **đúng** (hay chứng minh nó *không thể* đúng), ta cần một **tập giả định rõ ràng** về:

1. **Timing** — mạng chậm tối đa bao nhiêu? Clock các máy lệch nhau tối đa bao nhiêu?
2. **Failure** — một node có thể hỏng theo những cách nào? Nó có thể "nói dối" không?

Cặp giả định đó gọi là **system model**. Nó giống như **luật chơi**: đổi luật thì thắng/thua đổi theo.

> **Analogy — hợp đồng xây nhà.** Kỹ sư kết cấu không tính "nhà chịu được bao nhiêu" một cách mơ hồ. Họ ghi rõ giả định: *gió tối đa 120 km/h, động đất cấp 7, nền đất chịu 200 kPa*. Từ giả định đó mới tính ra thiết kế **đảm bảo đúng**. Nếu thực tế vượt giả định (bão cấp 17) thì nhà sập — nhưng đó là lỗi của giả định, không phải lỗi tính toán. **System model chính là bản giả định đó cho phần mềm phân tán.**

Giá trị thực tế của việc mô hình hoá:
- **Chứng minh được**: "thuật toán X đúng **trong** mô hình M" là một phát biểu kiểm chứng được, không cãi cảm tính.
- **Biết giới hạn**: nếu ai đó hứa "consensus không cần timeout, mạng async thoải mái, vẫn luôn xong" — bạn biết ngay họ **sai** (FLP, mục 2.6).
- **Chọn đúng công cụ**: Raft, Paxos, PBFT... mỗi cái sinh ra cho **một mô hình cụ thể**. Dùng sai mô hình = dùng sai công cụ.

### 2.2 Timing models — giả định về độ trễ và clock

Câu hỏi cốt lõi: **khi gửi một message, sau bao lâu thì nó tới? Và clock hai máy lệch nhau bao nhiêu?** Có ba mức trả lời.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="tm-t tm-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="tm-t">Ba timing model theo mức độ giả định về độ trễ mạng</title>
<desc id="tm-d">Synchronous có chặn trên độ trễ cố định, asynchronous không có chặn trên nào, partial synchronous có chặn trên nhưng chỉ đúng sau một thời điểm không biết trước</desc>
<rect x="15" y="30" width="205" height="185" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="117" y="55" text-anchor="middle" font-size="14" fill="currentColor">Synchronous</text>
<text x="117" y="82" text-anchor="middle" font-size="11" fill="currentColor">Delay ≤ D (biết trước)</text>
<text x="117" y="104" text-anchor="middle" font-size="11" fill="currentColor">Clock lệch ≤ ε</text>
<text x="117" y="126" text-anchor="middle" font-size="11" fill="currentColor">Timeout đáng tin 100%</text>
<text x="117" y="155" text-anchor="middle" font-size="11" fill="currentColor">→ Dễ nhất, mạnh nhất</text>
<text x="117" y="185" text-anchor="middle" font-size="10.5" fill="currentColor">Hiếm ngoài đời thực</text>
<rect x="247" y="30" width="205" height="185" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="349" y="55" text-anchor="middle" font-size="14" fill="currentColor">Partial synchronous</text>
<text x="349" y="82" text-anchor="middle" font-size="11" fill="currentColor">Có chặn D nhưng...</text>
<text x="349" y="104" text-anchor="middle" font-size="11" fill="currentColor">chỉ đúng sau GST</text>
<text x="349" y="126" text-anchor="middle" font-size="11" fill="currentColor">(thời điểm không biết)</text>
<text x="349" y="155" text-anchor="middle" font-size="11" fill="currentColor">→ Sát thực tế nhất</text>
<text x="349" y="185" text-anchor="middle" font-size="10.5" fill="currentColor">Raft, Paxos sống ở đây</text>
<rect x="479" y="30" width="205" height="185" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="581" y="55" text-anchor="middle" font-size="14" fill="currentColor">Asynchronous</text>
<text x="581" y="82" text-anchor="middle" font-size="11" fill="currentColor">Delay hữu hạn nhưng</text>
<text x="581" y="104" text-anchor="middle" font-size="11" fill="currentColor">KHÔNG có chặn trên</text>
<text x="581" y="126" text-anchor="middle" font-size="11" fill="currentColor">Không clock tin được</text>
<text x="581" y="155" text-anchor="middle" font-size="11" fill="currentColor">→ Khó nhất, yếu nhất</text>
<text x="581" y="185" text-anchor="middle" font-size="10.5" fill="currentColor">Timeout vô nghĩa</text>
</svg>

**a) Synchronous model.** Có một chặn trên **D** đã biết cho độ trễ message, và một chặn **ε** cho độ lệch clock giữa các máy. Hệ quả cực mạnh: nếu gửi request rồi chờ quá **D**, bạn **chắc chắn** node kia đã chết chứ không phải chậm. Tức là **timeout trở thành một failure detector hoàn hảo**. Trong mô hình này gần như mọi bài toán (consensus, election...) đều giải được dễ dàng. Nhược điểm: **ngoài đời gần như không tồn tại** — GC pause, network congestion, một VM bị "steal" CPU... đều có thể phá vỡ chặn D bất cứ lúc nào.

**b) Asynchronous model.** Message **chắc chắn tới** (không mất vĩnh viễn) nhưng **không có bất kỳ chặn trên nào** cho độ trễ; và không có clock đáng tin. Đây là mô hình **bi quan nhất, ít giả định nhất** — nên thuật toán đúng trong async sẽ đúng ở *mọi* mạng thực. Cái giá: **timeout trở nên vô nghĩa** (chờ mãi vẫn có thể là "sắp tới"), nên bạn **không thể phân biệt node chết với node chậm** — đúng nỗi đau partial failure ở Bài 1, giờ được phát biểu hình thức.

**c) Partial synchronous model (Dwork–Lynch–Stockmeyer, 1988).** Mô hình dung hoà và **sát thực tế nhất**: hệ thống *đa phần* hoạt động như synchronous (delay ≤ D), nhưng thỉnh thoảng có giai đoạn "loạn" (D bị vi phạm). Cụ thể: tồn tại một thời điểm **GST — Global Stabilization Time** mà **sau đó** mạng trở lại tuân thủ chặn D; nhưng **không ai biết GST là lúc nào**. Đây chính là hình ảnh đúng của một data center: 99% thời gian mạng nhanh và ổn, thỉnh thoảng có sự cố rồi phục hồi. **Raft và Paxos được thiết kế cho mô hình này**: chúng **luôn an toàn (safety)** kể cả khi mạng đang loạn, và **chỉ đảm bảo tiến triển (liveness)** khi mạng đã ổn định trở lại sau GST.

| Timing model | Chặn trên độ trễ | Timeout dùng được? | Sát thực tế | Consensus giải được? |
|---|---|---|---|---|
| **Synchronous** | Có, biết trước (D) | Tin 100% | Hiếm | Dễ |
| **Partial synchronous** | Có, nhưng chỉ sau GST | Có, sau khi ổn định | **Cao nhất** | Được (an toàn luôn, tiến triển khi ổn) |
| **Asynchronous** | Không có | Vô nghĩa | Đúng nhưng bi quan | **Không** (FLP) |

### 2.3 Failure models — một node hỏng theo cách nào?

Timing nói về **mạng/clock**. Failure model nói về **hành vi của node khi hỏng**. Xếp theo mức độ hiểm ác **tăng dần** — mô hình sau **bao trùm** mô hình trước:

<svg viewBox="0 0 680 250" role="img" aria-labelledby="fm-t fm-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="fm-t">Bốn failure model xếp theo mức độ hiểm ác tăng dần, bao trùm lẫn nhau</title>
<desc id="fm-d">Byzantine bao trùm omission, omission bao trùm crash-recovery, crash-recovery bao trùm crash-stop; càng ra ngoài càng khó chống đỡ</desc>
<rect x="20" y="15" width="640" height="220" rx="12" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="35" text-anchor="middle" font-size="13" fill="currentColor">Byzantine — node làm BẤT KỲ điều gì, kể cả nói dối, gửi tin mâu thuẫn</text>
<rect x="55" y="48" width="570" height="170" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="68" text-anchor="middle" font-size="13" fill="currentColor">Omission — node bỏ sót gửi/nhận một số message (nhưng không nói dối)</text>
<rect x="95" y="82" width="490" height="126" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="102" text-anchor="middle" font-size="13" fill="currentColor">Crash-recovery — node chết rồi sống lại, có thể mất state trong RAM</text>
<rect x="140" y="116" width="400" height="82" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="138" text-anchor="middle" font-size="13" fill="currentColor">Crash-stop — node chạy đúng</text>
<text x="340" y="158" text-anchor="middle" font-size="13" fill="currentColor">rồi dừng hẳn, không quay lại</text>
<text x="340" y="184" text-anchor="middle" font-size="11" fill="currentColor">Dễ chống đỡ nhất (lõi trong cùng)</text>
</svg>

**a) Crash-stop.** Node chạy **đúng theo giao thức** cho đến một lúc nào đó thì **dừng hẳn và không bao giờ quay lại**. Không gửi tin sai, không hồi sinh. Đây là mô hình lỗi **đơn giản nhất, lạc quan nhất**. (Lưu ý: crash-stop nói về *hành vi* của node; việc các node khác có **phát hiện** được cú dừng đó hay không lại là chuyện của timing model — xem mục 2.4 về **fail-stop** vs **fail-silent**.) Rất nhiều thuật toán kinh điển (bản gốc của consensus) giả định crash-stop cho gọn.

**b) Crash-recovery.** Thực tế hơn: node chết nhưng **sống lại** (process restart, VM reboot). Vấn đề mới sinh ra: khi sống lại, **state trong RAM đã mất**, chỉ còn những gì đã kịp **ghi xuống đĩa (persistent storage)**. Đây là lý do Raft **bắt buộc** phải fsync `currentTerm`, `votedFor`, và log entries xuống đĩa **trước khi** trả lời — để sau khi crash-recovery, node không "quên" mình đã bầu cho ai mà đi bầu lại, gây bầu hai leader.

**c) Omission.** Node **bỏ sót** — gửi thiếu hoặc nhận thiếu message — nhưng **những gì nó làm vẫn đúng** (không bịa). Chia hai loại: *send-omission* (quên gửi) và *receive-omission* (rớt tin đến). Về bản chất omission thường **khó phân biệt** với crash tạm thời hoặc network drop, nên nhiều thiết kế gộp chung xử lý.

**d) Byzantine (arbitrary).** Mô hình **hiểm ác nhất**: node hỏng có thể làm **bất kỳ điều gì** — gửi tin sai, gửi **tin mâu thuẫn cho các node khác nhau**, giả mạo, cấu kết với node lỗi khác để phá hệ thống. Tên gọi đến từ bài toán **Byzantine Generals** của Lamport (1982). Đây là mô hình cho hệ thống có kẻ tấn công hoặc bug tuỳ tiện: **blockchain, hàng không, tài chính liên tổ chức**. Chống Byzantine **đắt hơn hẳn**: cần **≥ 3f + 1** node để chịu được **f** node lỗi (so với **2f + 1** cho crash), và cần chữ ký số + nhiều vòng message (PBFT, Tendermint).

| Failure model | Node có thể... | Nói dối? | Chi phí chịu f lỗi | Ví dụ thực tế |
|---|---|---|---|---|
| **Crash-stop** | dừng hẳn | Không | 2f + 1 | Raft/Paxos lý thuyết |
| **Crash-recovery** | chết rồi sống lại, mất RAM | Không | 2f + 1 + persist | etcd, ZooKeeper, DB replica |
| **Omission** | bỏ sót gửi/nhận | Không | 2f + 1 | mạng rớt gói, buffer tràn |
| **Byzantine** | làm bất kỳ điều gì | **Có** | **3f + 1** + chữ ký | Blockchain, PBFT, hàng không |

### 2.4 fail-stop vs fail-silent — một điểm hay bị nhầm

Hai thuật ngữ này nói về **việc phát hiện lỗi có dễ hay không**, dễ lẫn lộn:

- **fail-stop**: node dừng, **và** các node khác **phát hiện được chắc chắn** rằng nó đã dừng (có tín hiệu tin cậy). Đây là giả định **rất mạnh** — thực chất chỉ tồn tại đầy đủ trong **synchronous model** (nơi timeout là failure detector hoàn hảo).
- **fail-silent**: node dừng **nhưng "im lặng"** — nó không phát tín hiệu gì, các node khác **không thể chắc chắn** nó chết hay chỉ chậm. Đây mới là **thực tế trong async/partial-sync**: bạn chỉ thấy "không có phản hồi", không thấy "báo tử".

> **Điểm mấu chốt:** cùng là "crash", nhưng crash mà **phát hiện được** (fail-stop) thì dễ xử lý hơn nhiều so với crash **im lặng** (fail-silent). Sự khác biệt này **không nằm ở node**, mà nằm ở **timing model**: chính giả định về mạng quyết định bạn có failure detector đáng tin hay không. Đây là cầu nối trực tiếp tới FLP.

### 2.5 Ghép lại: (timing × failure) quyết định thuật toán

Một thuật toán không đúng "chung chung" — nó đúng trong **một ô** của bảng dưới. Đổi ô là đổi bài toán:

| | Crash-stop | Byzantine |
|---|---|---|
| **Synchronous** | Rất dễ (timeout hoàn hảo) | Giải được — Byzantine Generals cần ≥ 3f+1 |
| **Partial synchronous** | **Raft, Paxos, Multi-Paxos** | **PBFT, Tendermint** (BFT thực dụng) |
| **Asynchronous** | **KHÔNG deterministic** (FLP) → cần randomness/timeout | Không (Byzantine async, cần randomness — Ben-Or) |

Nhìn bảng này bạn hiểu tại sao câu hỏi phỏng vấn "Raft chạy trong mô hình nào?" có đáp án chính xác: **partial synchronous, crash-recovery (fail-silent)**. Và tại sao không có "consensus tổng quát cho mọi trường hợp".

### 2.6 FLP — hệ quả trực tiếp của việc chọn mô hình

Kết quả nổi tiếng nhất của lĩnh vực, **FLP (Fischer–Lynch–Paterson, 1985)**:

> Trong một hệ **asynchronous**, chỉ cần **một** node có thể **crash**, thì **không tồn tại** thuật toán **deterministic** nào giải được **consensus** vừa **luôn an toàn** vừa **luôn kết thúc**.

Chú ý: chỉ **một** lỗi crash — mô hình lỗi *nhẹ nhất* — vẫn đủ làm consensus bất khả thi trong async. Vì sao? Bản chất đã lộ ở mục 2.4: trong async, **fail-silent không phân biệt được với chậm**. Không có failure detector đáng tin, nên luôn tồn tại một kịch bản mà thuật toán bị treo ở trạng thái "chưa quyết được", mãi mãi.

**FLP không phải lời nguyền — nó chỉ bảo ta không được ở ô async.** Cách thực tế "lách" FLP:
- **Thêm timeout / partial synchrony**: giả định mạng *rồi sẽ* ổn định (sau GST). Raft/Paxos làm đúng thế — **an toàn luôn luôn**, chỉ **trì hoãn tiến triển** trong lúc mạng loạn, thay vì trả lời sai. Đây là cách CS công nghiệp chọn.
- **Thêm randomness**: thuật toán ngẫu nhiên (Ben-Or) kết thúc với xác suất 1 dù ở async — đánh đổi tính deterministic.

> Nói cách khác: **FLP là hệ quả logic của việc chọn cặp (asynchronous, crash).** Đổi timing model sang partial-synchronous là bạn thoát nó. Đây là ví dụ đắt giá nhất cho luận điểm mở bài: **chọn mô hình = quyết định cái gì khả thi.**

---

## 3. Ví dụ thực tế & con số

**etcd / ZooKeeper** (Raft, ZAB) chạy trong **partial synchronous + crash-recovery**. Cấu hình điển hình phản ánh đúng mô hình:
- `election-timeout ≈ 1000ms`, `heartbeat-interval ≈ 100ms`: đây chính là **giả định độ trễ D** được cụ thể hoá. Đặt quá thấp trong mạng "chậm nhưng bình thường" → leader bị coi là chết oan → **bầu cử liên miên** (đúng hậu quả của việc mô hình timing sai thực tế).
- Bắt buộc **fsync WAL** trước khi ack: phản ánh giả định **crash-recovery** — node phải nhớ state qua reboot.
- Cần **quorum (majority)**: chịu **f** node crash với **2f + 1** — ví dụ cụm 5 node chịu được 2 node chết. Không dùng 3f+1 vì **không giả định Byzantine**.

**Blockchain (Bitcoin, Ethereum, Tendermint)** chọn **Byzantine** vì các bên **không tin nhau và có kẻ tấn công**. Hệ quả trực tiếp từ mô hình: Tendermint cần **≥ 3f + 1** validator (chịu < 1/3 lỗi/gian lận), mỗi block qua **hai vòng bỏ phiếu** có chữ ký. Chi phí cao hơn hẳn etcd — **cái giá của việc đổi failure model từ crash sang Byzantine.**

**Sự cố thật thường là "mô hình sai", không phải "code sai":** một GC pause 8 giây trên leader làm follower tưởng leader chết (vi phạm chặn D ngầm định) → bầu leader mới → khi leader cũ "tỉnh dậy" thì đã có leader khác. Raft *xử lý đúng* nhờ term number (leader cũ bị từ chối), nhưng nếu ai đó tự viết consensus mà **giả định synchronous** thì đây là lúc hệ thống sinh **split-brain**.

---

## 4. Tóm tắt
- **Mô hình hoá = viết ra luật chơi**: cặp **(timing model, failure model)** là bộ giả định để chứng minh thuật toán đúng và biết giới hạn của nó.
- **Timing**: **synchronous** (có chặn D, timeout hoàn hảo, hiếm thực tế) — **asynchronous** (không chặn trên, timeout vô nghĩa, bi quan) — **partial synchronous** (ổn sau GST không biết trước, **sát thực tế nhất**, nơi Raft/Paxos sống).
- **Failure** (hiểm ác tăng dần, bao trùm nhau): **crash-stop → crash-recovery** (mất RAM, phải persist) **→ omission** (bỏ sót) **→ Byzantine** (nói dối, cần 3f+1).
- **fail-stop** (crash + phát hiện chắc chắn) khác **fail-silent** (crash im lặng, không phân biệt được với chậm) — khác biệt nằm ở **timing model**, không phải ở node.
- **FLP** là hệ quả của việc chọn ô **(async, crash)**: consensus deterministic bất khả thi. Công nghiệp thoát bằng **partial synchrony + timeout** (an toàn luôn, tiến triển khi mạng ổn) hoặc **randomness**.
- Thông điệp lớn: **chọn mô hình chính là quyết định thuật toán nào khả thi** — không có "consensus tổng quát cho mọi mạng, mọi loại lỗi".

> **Bài tiếp theo (Bài 3):** từ mô hình lỗi bước sang **replication & quorum** — cách nhân bản dữ liệu qua nhiều node và dùng đa số để vẫn đúng khi một phần chết.
