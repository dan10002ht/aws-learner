# Bài 13 — Bài toán consensus & FLP impossibility

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phát biểu **chính xác** bài toán **consensus** qua bốn tính chất: **agreement, validity, integrity, termination**.
- Giải thích **vì sao consensus khó** — không phải vì kỹ sư dốt, mà vì bản chất **partial failure + không phân biệt được chậm và chết**.
- Hiểu **FLP impossibility**: trong mô hình **async** với dù chỉ **1 crash**, **không** thuật toán deterministic nào vừa **luôn an toàn** vừa **luôn terminate**.
- Biết ba cách **"lách" FLP** dùng trong thực tế: **partial synchrony + timeout**, **randomness**, và **failure detector** (◇S).
- Nhận ra consensus **tương đương** với **total order broadcast** và **atomic commit** — giải được một cái là giải được cả ba.

---

## 2. Lý thuyết

### 2.1 Consensus là gì? Analogy

> **Consensus** = nhiều node cùng **thống nhất một giá trị duy nhất**, kể cả khi một số node chết và mạng chập chờn.

Hình dung một **hội đồng bồi thẩm** phải ra **một** phán quyết chung. Mỗi người có ý kiến ban đầu (đề xuất), nhưng cuối cùng cả hội đồng phải **nói cùng một câu**. Khó ở chỗ: phòng xử ồn ào (mạng trễ), có người ngất xỉu giữa chừng (crash), và bạn không biết người im lặng kia đang **suy nghĩ** hay đã **ngất**. Nếu vội chốt khi thiếu người, hai nhóm có thể chốt hai phán quyết khác nhau — thảm hoạ.

Trong hệ thống thật, consensus là hạt nhân của: **bầu leader** (ai là primary?), **commit hay abort** một giao dịch, **thứ tự** các thao tác trong một replicated log (Raft/Paxos), **membership** (ai còn trong cluster?), **distributed lock/lease**.

### 2.2 Định nghĩa hình thức: bốn tính chất

Mỗi node có một giá trị **đề xuất** (propose) và cuối cùng **quyết định** (decide) một giá trị. Một thuật toán consensus đúng phải thoả:

| Tính chất | Phát biểu | Loại | Vi phạm nghĩa là |
|-----------|-----------|------|------------------|
| **Agreement** | Không có hai node correct nào decide hai giá trị **khác nhau** | Safety | "Split brain" — hai bên chốt hai kết quả |
| **Validity** | Giá trị được decide phải là giá trị **do một node nào đó propose** (không bịa ra từ hư không) | Safety | Chốt một giá trị chẳng ai đề xuất |
| **Integrity** | Mỗi node correct decide **tối đa một lần** (không đổi ý sau khi đã chốt) | Safety | Chốt rồi lại chốt lại giá trị khác |
| **Termination** | Mọi node correct **cuối cùng đều decide** (không treo mãi mãi) | Liveness | Cả hệ treo, không ai chốt được |

Ba tính chất đầu là **safety** — *"không bao giờ làm điều sai"* (never bad). Cái cuối là **liveness** — *"cuối cùng làm được điều tốt"* (eventually good). **Ghi nhớ sự chia đôi này** — nó chính là chỗ FLP đánh vào.

> Một thuật toán "an toàn tuyệt đối" tầm thường: **không bao giờ decide gì cả**. Nó thoả agreement/validity/integrity (vì chẳng chốt gì thì không thể chốt sai) nhưng **phá termination**. Ngược lại, "cứ chốt bừa giá trị mình" thoả termination nhưng phá agreement. Cái khó là thoả **cả bốn cùng lúc**.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="cs-t cs-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="cs-t">Consensus: từ giá trị đề xuất tới một quyết định chung</title>
<desc id="cs-d">Ba node đề xuất các giá trị khác nhau, sau khi chạy giao thức tất cả decide cùng một giá trị</desc>
<text x="120" y="24" text-anchor="middle" font-size="13" fill="currentColor">propose</text>
<text x="580" y="24" text-anchor="middle" font-size="13" fill="currentColor">decide (agreement)</text>
<rect x="40" y="40" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="65" text-anchor="middle" font-size="12" fill="currentColor">N1: propose A</text>
<rect x="40" y="100" width="150" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="125" text-anchor="middle" font-size="12" fill="currentColor">N2: propose B</text>
<rect x="40" y="160" width="150" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="185" text-anchor="middle" font-size="12" fill="currentColor">N3: propose A</text>
<rect x="300" y="90" width="120" height="60" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="116" text-anchor="middle" font-size="12" fill="currentColor">consensus</text>
<text x="360" y="134" text-anchor="middle" font-size="12" fill="currentColor">protocol</text>
<line x1="190" y1="60" x2="300" y2="110" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="190" y1="120" x2="300" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="190" y1="180" x2="300" y2="130" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<rect x="510" y="60" width="150" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="85" text-anchor="middle" font-size="12" fill="currentColor">N1: decide A</text>
<rect x="510" y="110" width="150" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="135" text-anchor="middle" font-size="12" fill="currentColor">N3: decide A</text>
<line x1="420" y1="120" x2="510" y2="80" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="420" y1="120" x2="510" y2="130" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<text x="585" y="180" text-anchor="middle" font-size="11" fill="#f43f5e">validity: A hoặc B, không bịa C</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Vì sao consensus khó? Gốc rễ

Nhắc lại Bài 1: trong async, khi node A gửi cho B mà không thấy trả lời, A **không phân biệt được** B *đã chết* hay chỉ *đang chậm/mất mạng*. Consensus đâm thẳng vào điểm đau này:

- Nếu A **chờ mãi** B trả lời để cho chắc → khi B thật sự chết, A **treo vĩnh viễn** → mất **termination**.
- Nếu A **bỏ qua** B sau một khoảng chờ và tự chốt → khi B chỉ chậm (chưa chết) và cũng đang chốt ở nhánh khác → hai bên chốt lệch → mất **agreement**.

Đây là một **thế lưỡng nan cứng**: chờ thì mất liveness, không chờ thì mất safety. FLP chính là chứng minh toán học rằng cái lưỡng nan này **không thể giải triệt để** trong mô hình async.

---

## 3. FLP Impossibility

### 3.1 Phát biểu

Năm **1985**, Fischer, Lynch và Paterson chứng minh (giải thưởng Dijkstra):

> Trong một hệ **bất đồng bộ (asynchronous)**, **không tồn tại** thuật toán consensus **deterministic** nào bảo đảm được **cả agreement lẫn termination** nếu **dù chỉ một** process có thể **crash** (dừng im lặng).

Bốn từ khoá phải hiểu đúng, nếu không sẽ hiểu sai FLP:

| Từ khoá | Nghĩa chính xác | Nếu bỏ điều kiện này |
|---------|-----------------|----------------------|
| **Asynchronous** | Không có giới hạn trên cho độ trễ tin nhắn và tốc độ xử lý; **không có timeout tin cậy** | Nếu synchronous (có bound) → consensus giải được |
| **Deterministic** | Không dùng ngẫu nhiên; cùng input + message → cùng hành vi | Nếu cho phép randomness → giải được (xác suất) |
| **Crash (fail-stop)** | Node có thể dừng và im lặng vĩnh viễn; **không** cần Byzantine/độc hại | FLP đã áp dụng cho mô hình lỗi *yếu nhất* → càng mạnh càng khó |
| **1 fault** | Chỉ cần **một** khả năng crash là đủ phá | Không có lỗi nào → tầm thường giải được |

**Đọc kỹ**: FLP không nói "consensus là bất khả thi". Nó nói: bạn **không thể có cả hai** *(luôn an toàn)* và *(luôn kết thúc)* **cùng lúc** trong async. Trong thực tế người ta **giữ chặt safety, hy sinh guarantee về termination** (chỉ đảm bảo termination *khi mạng đủ ổn định*).

### 3.2 Trực giác về chứng minh

Ý tưởng lõi: khái niệm **cấu hình bivalent** (chưa ngã ngũ).

- Một **cấu hình** (configuration) = trạng thái toàn hệ tại một thời điểm.
- Cấu hình **univalent**: kết quả cuối đã bị "khoá" (chắc chắn sẽ decide 0, hoặc chắc chắn decide 1).
- Cấu hình **bivalent**: **cả hai** kết cục 0 và 1 đều còn khả dĩ tuỳ vào diễn biến sau đó.

Chứng minh gồm hai bước:
1. **Tồn tại một cấu hình khởi đầu bivalent** — luôn có một cách chọn đề xuất ban đầu khiến kết cục chưa ngã ngũ.
2. **Từ một cấu hình bivalent, kẻ đối kháng luôn ép được hệ đi tới một cấu hình bivalent khác** — bằng cách **trì hoãn đúng một tin nhắn then chốt** đúng lúc. Vì async cho phép trễ tuỳ ý (không bị timeout bắt bài), kẻ đối kháng cứ hoãn đúng tin nhắn quyết định, giữ hệ mãi ở trạng thái "chưa ngã ngũ".

→ Tồn tại một **lịch trình vô hạn** (dù *rất hiếm* và cần đối kháng tinh vi) mà hệ **không bao giờ decide**. Chỉ cần **một** lịch trình như vậy là đủ phá cam kết "**luôn** terminate".

<svg viewBox="0 0 700 250" role="img" aria-labelledby="flp-t flp-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="flp-t">FLP: kẻ đối kháng giữ hệ mãi ở cấu hình bivalent</title>
<desc id="flp-d">Từ cấu hình bivalent, việc trì hoãn một tin nhắn dẫn tới một cấu hình bivalent khác thay vì ngã ngũ, tạo lịch trình vô hạn không quyết định</desc>
<rect x="30" y="100" width="130" height="50" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="122" text-anchor="middle" font-size="12" fill="currentColor">bivalent C0</text>
<text x="95" y="140" text-anchor="middle" font-size="11" fill="currentColor">(chưa ngã ngũ)</text>
<line x1="160" y1="125" x2="250" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#ax)"/>
<text x="205" y="115" text-anchor="middle" font-size="10" fill="#f43f5e">hoãn 1 msg</text>
<rect x="250" y="100" width="130" height="50" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="122" text-anchor="middle" font-size="12" fill="currentColor">bivalent C1</text>
<text x="315" y="140" text-anchor="middle" font-size="11" fill="currentColor">(vẫn chưa)</text>
<line x1="380" y1="125" x2="470" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#ax)"/>
<text x="425" y="115" text-anchor="middle" font-size="10" fill="#f43f5e">hoãn 1 msg</text>
<rect x="470" y="100" width="130" height="50" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="122" text-anchor="middle" font-size="12" fill="currentColor">bivalent C2</text>
<text x="535" y="140" text-anchor="middle" font-size="11" fill="currentColor">...mãi mãi</text>
<line x1="600" y1="125" x2="660" y2="125" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ax)"/>
<rect x="250" y="200" width="130" height="40" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="315" y="224" text-anchor="middle" font-size="11" fill="currentColor">univalent (decide)</text>
<line x1="315" y1="150" x2="315" y2="200" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#ax)"/>
<text x="410" y="200" text-anchor="start" font-size="11" fill="currentColor">lối ra bị né tránh</text>
<defs><marker id="ax" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.3 Đọc FLP cho đúng — điều nó KHÔNG nói

- FLP **không** nói mọi thuật toán consensus đều treo. Trong thực tế lịch trình ác mộng đó **cực hiếm**; hệ thống thật gần như luôn quyết định nhanh.
- FLP **không** áp dụng cho mô hình **synchronous** (có bound thời gian) — ở đó consensus giải được (dù tốn round).
- FLP là kết quả về **giới hạn lý thuyết**: nó bảo bạn *đừng phí công tìm* một thuật toán deterministic async hoàn hảo cả safety lẫn liveness — hãy đi đường vòng.

---

## 4. Cách "lách" FLP trong thực tế

FLP cấm *"cả safety lẫn liveness, deterministic, trong async, luôn luôn"*. Muốn lách, chỉ cần **phá bỏ một giả thiết** — nhưng **không được hy sinh safety** (safety là thứ tuyệt đối không thương lượng). Có hai hướng chính.

### 4.1 Partial synchrony + timeout (hướng phổ biến nhất)

Mô hình **partial synchrony** (Dwork–Lynch–Stockmeyer, 1988): mạng **thường** có bound độ trễ, chỉ **thi thoảng** bung ra (partition, GC pause, mạng nghẽn). Nói cách khác: tồn tại một thời điểm **GST (Global Stabilization Time)** mà sau đó mạng cư xử synchronous "đủ lâu".

Cơ chế lách:
- Dùng **timeout** làm **failure detector không hoàn hảo**: hết timeout thì *nghi* node kia chết và hành động (bầu leader mới, chuyển round).
- **Trong lúc mạng loạn**: timeout có thể sai (nghi nhầm node còn sống) → hệ **không quyết định được**, nhưng **vẫn giữ agreement**. Ta chỉ mất **liveness tạm thời**.
- **Khi mạng ổn lại** (sau GST): timeout đoán đúng → hệ **tiến triển và decide**. → **Liveness được khôi phục**.

Đây chính là chỗ FLP bị né: thuật toán **không hứa luôn terminate**, chỉ hứa *"terminate khi mạng đủ ổn định"*. Safety thì **luôn** giữ.

> **Raft và Multi-Paxos đều theo hướng này.** Raft dùng **randomized election timeout** (ví dụ 150–300ms mỗi node random khác nhau) để tránh hai node cùng ứng cử mãi (livelock) — đây là **lai** cả partial synchrony **lẫn** một chút randomness ở tầng election.

Minh hoạ cấu hình Raft (etcd) — chính là consensus thực chiến:

```bash
# 3 node Raft cluster (etcd). Quorum = 2/3 -> chịu được 1 node chết.
etcd --name n1 \
  --initial-cluster n1=http://10.0.0.1:2380,n2=http://10.0.0.2:2380,n3=http://10.0.0.3:2380 \
  --heartbeat-interval 100 \      # leader gửi heartbeat mỗi 100ms
  --election-timeout 1000 \       # 1000ms không nghe heartbeat -> nghi leader chết -> bầu lại
  --listen-peer-urls http://10.0.0.1:2380
```

- `heartbeat-interval` = nhịp leader chứng minh "tôi còn sống" (đây là dùng timeout như failure detector).
- `election-timeout` phải **lớn hơn nhiều** heartbeat (thường 10x) để tránh bầu lại nhầm khi mạng chỉ trễ nhẹ. Quy tắc: `broadcast-time << election-timeout << MTBF`.
- Chọn số node **lẻ** (3, 5, 7): quorum = `⌊N/2⌋+1`. N=3 chịu 1 lỗi, N=5 chịu 2 lỗi. Node chẵn tốn thêm 1 máy mà không tăng khả năng chịu lỗi.

### 4.2 Randomness (phá giả thiết "deterministic")

FLP giả định thuật toán **deterministic**. Cho phép mỗi node **tung đồng xu**, ta có thuật toán **randomized consensus** (Ben-Or 1983) với đảm bảo:

- **Safety (agreement/validity) vẫn tuyệt đối** — không bao giờ sai.
- **Termination trở thành xác suất**: `P(decide sau t round) → 1` khi `t → ∞`. Kỳ vọng số round hữu hạn.

Trực giác: kẻ đối kháng trong FLP thắng nhờ **đoán trước** node sẽ làm gì để hoãn đúng tin nhắn. Khi node tung xu, kẻ đối kháng **không đoán được** → không giữ nổi hệ ở bivalent mãi → gần như chắc chắn thoát ra. Randomness được dùng nhiều trong **BFT** và blockchain (ví dụ leader/committee chọn bằng VRF).

### 4.3 So sánh các hướng lách

| Hướng | Phá giả thiết nào của FLP | Safety | Termination | Ví dụ thực tế |
|-------|---------------------------|--------|-------------|---------------|
| **Partial synchrony + timeout** | "async tuyệt đối" | Luôn giữ | Chỉ khi mạng ổn (sau GST) | **Raft, Paxos, ZAB (ZooKeeper), Viewstamped Replication** |
| **Randomness** | "deterministic" | Luôn giữ | Xác suất → 1 | **Ben-Or, BFT/blockchain (Algorand, HoneyBadgerBFT)** |
| **Failure detector ◇S** | "không có gợi ý về lỗi" | Luôn giữ | Khi detector đủ chính xác | Chandra–Toueg (nền lý thuyết của Paxos) |

Điểm chung: **mọi hệ thực đều hy sinh cam kết liveness tuyệt đối, không bao giờ hy sinh safety.** Một hệ "chậm quyết định lúc mạng loạn" thì chấp nhận được; một hệ "chốt sai gây split brain" thì không.

---

## 5. Consensus tương đương với gì?

Đây là insight sâu và cực hữu ích: **nhiều bài toán tưởng khác nhau thực ra là consensus đội lốt**. Giải được consensus là giải được cả nhóm; và tất cả đều bị FLP chặn như nhau.

### 5.1 Total Order Broadcast (atomic broadcast)

**Total order broadcast** = mọi node nhận **cùng một tập** message theo **cùng một thứ tự**. Đây chính là trái tim của **state machine replication**: nếu mọi replica áp cùng chuỗi lệnh theo cùng thứ tự từ cùng trạng thái đầu → chúng luôn ở cùng trạng thái.

**Tương đương consensus:**
- Có total order broadcast → giải consensus: mọi node propose bằng cách broadcast giá trị của mình, rồi **decide message đầu tiên** trong thứ tự chung. Vì thứ tự chung nên ai cũng thấy "message đầu" giống nhau → agreement.
- Có consensus → giải total order broadcast: chạy **một chuỗi phiên consensus** (consensus thứ i quyết định "message thứ i trong log là gì").

> Vì thế **Raft/Paxos thực chất tạo ra một replicated log có thứ tự toàn cục** — chúng là total order broadcast, và mỗi entry trong log là một quyết định consensus. Kafka với `min.insync.replicas` + leader epoch cũng đang xây một dạng total order broadcast trên từng partition.

### 5.2 Atomic Commit (2PC / giao dịch phân tán)

**Atomic commit**: nhiều participant của một giao dịch phải **cùng commit hoặc cùng abort** — không được kẻ commit người abort. Nghe rất giống agreement.

Nhưng **khác một điểm tinh tế** ở validity:

| | Consensus | Atomic Commit |
|--|-----------|---------------|
| Giá trị decide | Bất kỳ giá trị **do ai đó propose** | Chỉ commit **nếu MỌI participant vote "yes"**; **một** "no" (hoặc một crash) → **phải abort** |
| Quyền phủ quyết | Không có | **Mỗi** node có quyền veto |

Vì đòi hỏi *mọi* node đồng ý mới commit, **2PC nhạy cảm với lỗi hơn** consensus: coordinator chết sau khi participant vote "yes" nhưng trước khi ra lệnh → participant **kẹt** giữ khoá, không dám commit cũng không dám abort (**blocking**). Đó là lý do sinh ra **3PC** và các biến thể **non-blocking atomic commit** dựa trên consensus (chạy 2PC nhưng thay coordinator đơn lẻ bằng một nhóm consensus như Raft — ví dụ **Google Spanner** dùng Paxos group cho mỗi shard rồi 2PC bắc cầu giữa các group).

<svg viewBox="0 0 640 220" role="img" aria-labelledby="eq-t eq-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="eq-t">Consensus là hạt nhân tương đương với total order broadcast và atomic commit</title>
<desc id="eq-d">Consensus ở trung tâm, hai chiều tương đương với total order broadcast và liên hệ với atomic commit</desc>
<rect x="230" y="80" width="180" height="60" rx="12" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="107" text-anchor="middle" font-size="14" fill="currentColor">Consensus</text>
<text x="320" y="126" text-anchor="middle" font-size="11" fill="currentColor">(agreement + terminate)</text>
<rect x="20" y="85" width="170" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="107" text-anchor="middle" font-size="12" fill="currentColor">Total Order</text>
<text x="105" y="124" text-anchor="middle" font-size="12" fill="currentColor">Broadcast</text>
<line x1="190" y1="110" x2="230" y2="110" stroke="currentColor" stroke-width="1.4" marker-end="url(#ae)"/>
<line x1="230" y1="122" x2="190" y2="122" stroke="currentColor" stroke-width="1.4" marker-end="url(#ae)"/>
<text x="210" y="150" text-anchor="middle" font-size="10" fill="currentColor">tương đương</text>
<rect x="450" y="85" width="170" height="50" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="107" text-anchor="middle" font-size="12" fill="currentColor">Atomic Commit</text>
<text x="535" y="124" text-anchor="middle" font-size="11" fill="currentColor">(2PC, veto)</text>
<line x1="410" y1="110" x2="450" y2="110" stroke="currentColor" stroke-width="1.4" marker-end="url(#ae)"/>
<text x="430" y="150" text-anchor="middle" font-size="10" fill="currentColor">họ hàng gần</text>
<text x="320" y="185" text-anchor="middle" font-size="12" fill="currentColor">Cả ba đều bị FLP chặn như nhau trong async</text>
<defs><marker id="ae" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 6. Ví dụ thực tế & con số

**Tình huống split brain nếu bỏ quorum.** Cluster 4 node bị partition thành 2+2. Nếu thuật toán cho phép "2 node là chốt được", **cả hai bên** đều tự bầu leader và cùng commit ghi khác nhau → khi mạng lành lại, hai lịch sử mâu thuẫn → **agreement vỡ**. Cách chặn: chỉ **quorum = đa số nghiêm ngặt** (`⌊N/2⌋+1`) mới được quyết định. Với N=4 quorum=3 → **không** bên 2 node nào đạt quorum → cả hai **dừng ghi** (mất liveness tạm) nhưng **không split brain**. Đây đúng là FLP tại hiện trường: **thà treo còn hơn chốt sai**.

**Con số để nhớ:**
- Raft/etcd: election-timeout điển hình **150ms–1s**; heartbeat **~1/10** con số đó. Một lần bầu leader thường xong trong **vài trăm ms**.
- ZooKeeper (ZAB): tolerate `f` lỗi cần `2f+1` node → **5 node chịu 2 lỗi** là cấu hình production phổ biến.
- Vì mọi ghi phải qua quorum, **thêm node KHÔNG làm ghi nhanh hơn** — thậm chí chậm hơn (phải chờ nhiều ack hơn). Cluster consensus tối ưu quanh **3–5–7 node**, không phải hàng trăm.

---

## 7. Tóm tắt
- **Consensus** = nhiều node thống nhất **một** giá trị, định nghĩa bởi bốn tính chất: **agreement, validity, integrity** (safety) và **termination** (liveness).
- Nó khó vì **không phân biệt được node chậm và node chết**: chờ thì mất liveness, không chờ thì mất safety.
- **FLP impossibility (1985)**: trong **async** với dù chỉ **1 crash**, **không** thuật toán **deterministic** nào đảm bảo **cả** safety **lẫn** termination. FLP không cấm consensus — nó cấm sự hoàn hảo *"luôn luôn"*.
- **Lách FLP** mà **không hy sinh safety**: (1) **partial synchrony + timeout** làm failure detector — chỉ terminate khi mạng ổn (Raft, Paxos, ZAB); (2) **randomness** — termination thành xác suất → 1 (Ben-Or, BFT).
- Consensus **tương đương total order broadcast** (nền của state machine replication / replicated log) và **họ hàng gần với atomic commit** (2PC có thêm quyền veto, dễ blocking). Giải một là giải cả nhóm; cả nhóm cùng bị FLP chặn.
- Nguyên tắc vàng thực chiến: **quorum đa số, số node lẻ, thà treo còn hơn split brain.**

> **Bài tiếp theo (Bài 14):** đi sâu vào một thuật toán consensus cụ thể, thực chiến — **Raft**: leader election, log replication, safety và cách nó biến lý thuyết ở bài này thành một replicated log chạy được trong etcd/Consul.
