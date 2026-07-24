# Bài 15 — Paxos ý niệm & coordination (ZooKeeper/etcd)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **ý niệm Paxos / Multi-Paxos** — vai trò **proposer / acceptor / learner**, hai pha **prepare / accept**, và **vì sao Paxos khó cài đúng** đến mức người ta thường chỉ dùng nó gián tiếp.
- Hiểu bản chất một **coordination service**: vì sao ta không tự viết consensus mà "thuê ngoài" một cụm nhỏ đáng tin để lưu **metadata quan trọng**.
- Nắm mô hình dữ liệu **ZooKeeper** (znode, ephemeral, sequential, watch) và **etcd** (key-value, lease, watch, revision — trên nền Raft).
- Áp dụng bốn **công thức kinh điển**: distributed lock, leader election, config/service discovery, membership.
- Chống **split-brain** đúng cách bằng **fencing token** — và hiểu vì sao "lock để đảm bảo an toàn" mà thiếu fencing là một cái bẫy.

---

## 2. Lý thuyết

### 2.1 Bài toán: nhiều node phải "đồng ý" một giá trị

Ở Bài 5 bạn đã gặp **consensus**: một tập node phải thống nhất **một giá trị duy nhất**, kể cả khi có node chết và mạng chập chờn. Đó là hạt nhân của mọi thứ "một-lần-đúng" trong hệ phân tán: ai là leader? bản ghi log số 42 là gì? cấu hình hiện tại là gì?

**Paxos** (Leslie Lamport, 1998) là thuật toán consensus đầu tiên được chứng minh đúng dưới **crash-fault + async network** (mất gói, trễ, đảo thứ tự — chỉ cần **không** có node nói dối kiểu Byzantine). Nó là nền lý thuyết; Raft (Bài 5) là bản "dễ hiểu hơn" ra đời sau để cùng giải bài toán đó.

> **Điều kiện sống còn:** mọi thuật toán loại này cần **quorum = đa số** (majority). Với 2f+1 node chịu được f node chết. Hai quorum bất kỳ **luôn giao nhau ở ít nhất 1 node** — chính giao điểm đó ngăn hai quyết định mâu thuẫn cùng được chốt.

### 2.2 Paxos một quyết định (single-decree) — ba vai + hai pha

Các node đóng ba **vai** (một tiến trình có thể kiêm nhiều vai):

| Vai | Nhiệm vụ |
|-----|----------|
| **Proposer** | Đề xuất một giá trị, cố gắng làm nó được chốt |
| **Acceptor** | "Cử tri" — bỏ phiếu; **trạng thái bền** của hệ nằm ở đây; cần **đa số acceptor** đồng ý |
| **Learner** | Học ra giá trị đã được chốt để đem đi dùng |

Mỗi lần đề xuất mang một **proposal number** `n` — số **tăng đơn điệu & duy nhất toàn cục** (ví dụ ghép `(counter, serverId)`). Số lớn hơn "át" số nhỏ hơn. Consensus chạy qua **hai pha**:

<svg viewBox="0 0 700 300" role="img" aria-labelledby="px-t px-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="px-t">Hai pha của Paxos: Prepare và Accept</title>
<desc id="px-d">Proposer gửi prepare(n) tới các acceptor rồi accept(n,v), cần đa số phản hồi ở mỗi pha</desc>
<text x="60" y="24" text-anchor="middle" font-size="13" fill="currentColor">Proposer</text>
<text x="300" y="24" text-anchor="middle" font-size="13" fill="currentColor">Acceptor A</text>
<text x="440" y="24" text-anchor="middle" font-size="13" fill="currentColor">Acceptor B</text>
<text x="580" y="24" text-anchor="middle" font-size="13" fill="currentColor">Acceptor C</text>
<line x1="60" y1="34" x2="60" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="300" y1="34" x2="300" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="440" y1="34" x2="440" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="580" y1="34" x2="580" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="20" y="52" width="200" height="26" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="69" text-anchor="middle" font-size="12" fill="currentColor">Pha 1: PREPARE(n)</text>
<line x1="60" y1="90" x2="300" y2="98" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="60" y1="90" x2="440" y2="104" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="60" y1="90" x2="580" y2="110" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<text x="150" y="128" text-anchor="middle" font-size="11" fill="currentColor">promise(n): không nhận n' &lt; n</text>
<line x1="300" y1="135" x2="60" y2="150" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar)"/>
<line x1="440" y1="140" x2="60" y2="152" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar)"/>
<rect x="20" y="168" width="230" height="26" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="135" y="185" text-anchor="middle" font-size="12" fill="currentColor">Pha 2: ACCEPT(n, v)</text>
<line x1="60" y1="206" x2="300" y2="214" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="60" y1="206" x2="440" y2="220" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<line x1="60" y1="206" x2="580" y2="226" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar)"/>
<text x="150" y="250" text-anchor="middle" font-size="11" fill="#10b981">accepted(n,v) từ đa số =&gt; CHỐT</text>
<line x1="300" y1="256" x2="60" y2="268" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar)"/>
<line x1="440" y1="258" x2="60" y2="270" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar)"/>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Pha 1 — Prepare (giành quyền):** proposer chọn `n` rồi gửi `prepare(n)` tới các acceptor.
- Acceptor nhận `prepare(n)`: nếu `n` **lớn hơn** mọi số nó từng thấy, nó **hứa (promise)** sẽ không chấp nhận đề xuất nào có số `< n` nữa, và **kèm theo** giá trị nó đã accept trước đó (nếu có) cùng số của giá trị đó.
- Proposer chờ **promise từ đa số**. Nếu trong đám promise đó có acceptor đã từng accept giá trị nào, proposer **buộc phải dùng lại** giá trị có số cao nhất trong đó — đây là mấu chốt an toàn: nó không được ghi đè một giá trị có thể đã được chốt. Nếu không ai đã accept gì, proposer tự do chọn giá trị của mình.

**Pha 2 — Accept (chốt):** proposer gửi `accept(n, v)` với `v` chọn ở trên.
- Acceptor nhận `accept(n, v)`: nếu nó **chưa hứa** với số nào `> n`, nó **accept** `(n, v)` và ghi bền.
- Khi **đa số acceptor** accept cùng `(n, v)` → giá trị **v được chốt** (chosen). Learner học ra `v` và không gì thay đổi được nữa.

**Vì sao đúng?** Hai quorum đa số giao nhau ≥ 1 acceptor. Acceptor giao đó "nhớ" giá trị đã chốt và ép mọi proposer sau (số lớn hơn) phải lặp lại đúng giá trị đó ở Pha 1. Nhờ vậy **chỉ một giá trị được chốt** dù có bao nhiêu proposer đua nhau.

### 2.3 Multi-Paxos: từ một quyết định thành một chuỗi log

Single-decree Paxos chỉ chốt **một** giá trị. Hệ thực tế cần chốt **một chuỗi lệnh** (log entry 1, 2, 3, ...) — đó là **replicated state machine**: mọi node chạy cùng chuỗi lệnh trên cùng trạng thái đầu → ra cùng kết quả (đây chính là mô hình Raft ở Bài 5).

Chạy Paxos đầy đủ 2 pha cho **mỗi** entry thì quá tốn. **Multi-Paxos** tối ưu: bầu ra một **leader ổn định** (distinguished proposer). Leader chạy **Pha 1 một lần** để giành quyền cho **cả dải slot** tương lai, sau đó với mỗi lệnh mới chỉ cần **Pha 2** (một vòng round-trip tới đa số). Khi ổn định, chi phí một lệnh ≈ **1 RTT tới quorum** — bằng đúng Raft.

| | Single-decree Paxos | Multi-Paxos |
|---|---|---|
| Chốt được | 1 giá trị | 1 chuỗi log (state machine) |
| Chi phí/lệnh khi ổn định | 2 pha | 1 pha (Pha 2) nhờ leader ổn định |
| Vai leader | không bắt buộc | có leader ổn định cho hiệu năng |

### 2.4 Vì sao Paxos "khó cài đúng"?

Bài báo mô tả single-decree Paxos rất gọn, nhưng khoảng cách từ đó tới một hệ chạy production là khổng lồ. Google (Chubby) từng viết hẳn một paper "Paxos Made Live" kể về cái hố này:

- **Bài báo chỉ nói single-decree.** Mọi thứ thực dụng — chuỗi log, chọn leader, xử lý slot trống (no-op) — phải tự thiết kế, mỗi chỗ là một cơ hội sai.
- **Liveness không được đảm bảo** (do FLP — Bài 5): hai proposer có thể **đua vô tận**, mỗi anh lại nâng `n` cao hơn làm anh kia hỏng Pha 2, lặp mãi (livelock). Phải thêm leader election + backoff ngẫu nhiên — nằm ngoài "Paxos thuần".
- **Bền vững & phục hồi:** promise/accept phải **fsync xuống đĩa** trước khi trả lời; khôi phục sau crash, log compaction, **snapshot**, thay đổi thành viên cụm (membership change) — toàn phần khó, dễ sai kín đáo.
- **Rất khó test:** lỗi chỉ lộ ra dưới tổ hợp hiếm của mất gói + trễ + crash đúng thời điểm. Không có framework kiểm thử tốt là gần như chắc chắn có bug ngủ đông.

> **Kết luận thực dụng:** **đừng tự cài Paxos/Raft cho ứng dụng của bạn.** Hãy để một **coordination service** đã được đội ngũ chuyên trách làm đúng và tôi luyện qua hàng tỉ giờ chạy làm hộ. Bạn dùng API của nó. Đó là lý do ZooKeeper và etcd tồn tại.

---

## 3. Coordination service: "thuê ngoài" consensus

### 3.1 Ý tưởng cốt lõi

Thay vì rải consensus khắp ứng dụng, ta dựng **một cụm nhỏ (thường 3 hoặc 5 node) cực kỳ đáng tin**, chạy consensus bên trong, và **phơi ra một kho key-value bé xíu nhưng nhất quán tuyến tính (linearizable)**. Ứng dụng của bạn (có thể hàng nghìn instance) trở thành **client** của cụm này, dùng nó để lưu **metadata quan trọng, thay đổi không thường xuyên**: ai là leader, danh sách node sống, cấu hình, khóa phân tán.

<svg viewBox="0 0 680 260" role="img" aria-labelledby="cs-t cs-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="cs-t">Kiến trúc coordination service</title>
<desc id="cs-d">Nhiều app instance làm client của một cụm ZooKeeper hoặc etcd ba node chạy consensus với một leader</desc>
<rect x="30" y="30" width="110" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="52" text-anchor="middle" font-size="12" fill="currentColor">App inst 1</text>
<rect x="30" y="110" width="110" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="132" text-anchor="middle" font-size="12" fill="currentColor">App inst 2</text>
<rect x="30" y="190" width="110" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="212" text-anchor="middle" font-size="12" fill="currentColor">App inst N</text>
<rect x="330" y="20" width="320" height="220" rx="12" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="42" text-anchor="middle" font-size="13" fill="currentColor">Cụm coordination (3 node)</text>
<rect x="360" y="60" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="84" text-anchor="middle" font-size="12" fill="currentColor">Leader</text>
<rect x="500" y="60" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="84" text-anchor="middle" font-size="12" fill="currentColor">Follower</text>
<rect x="430" y="130" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="154" text-anchor="middle" font-size="12" fill="currentColor">Follower</text>
<text x="490" y="205" text-anchor="middle" font-size="11" fill="currentColor">consensus (Zab / Raft)</text>
<text x="490" y="223" text-anchor="middle" font-size="11" fill="currentColor">quorum = đa số</text>
<line x1="140" y1="47" x2="360" y2="75" stroke="currentColor" stroke-width="1.3" marker-end="url(#c1)"/>
<line x1="140" y1="127" x2="360" y2="85" stroke="currentColor" stroke-width="1.3" marker-end="url(#c1)"/>
<line x1="140" y1="207" x2="360" y2="92" stroke="currentColor" stroke-width="1.3" marker-end="url(#c1)"/>
<defs><marker id="c1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> **Nguyên tắc dung lượng:** coordination service **không phải database**. Nó giữ tổng dữ liệu nhỏ (thường vừa trong RAM, cỡ vài trăm MB), ghi không thường xuyên. Đừng nhét payload lớn hay traffic ghi cao vào — sẽ giết cụm. Nó là "bảng điều khiển", không phải "kho hàng".

### 3.2 ZooKeeper — mô hình znode

ZooKeeper (nền của Kafka cũ, HBase, Hadoop) phơi ra một **cây thư mục** giống filesystem. Mỗi nút là một **znode** vừa như file (giữ data nhỏ) vừa như thư mục (có con). Đường dẫn kiểu `/services/payment/leader`.

Ba loại cờ khi tạo znode — chính là bộ "nguyên tố" để xây mọi primitive:

| Cờ znode | Ý nghĩa | Dùng để |
|---|---|---|
| **(persistent)** | Tồn tại đến khi bị xóa tường minh | Config, cấu trúc cây cố định |
| **ephemeral** | **Tự biến mất khi session client tạo ra nó hết hạn** (client chết/mất kết nối) | Membership, phát hiện node chết |
| **sequential** | ZooKeeper gắn **hậu tố số tăng đơn điệu** vào tên | Xếp thứ tự, lock công bằng (FIFO) |

Client giữ một **session** với cụm bằng heartbeat. Ephemeral znode sống-chết theo session này — đó là cơ chế **failure detection** tích hợp: node chết → session timeout → ephemeral znode của nó bị xóa tự động → cả hệ biết ngay.

**watch:** client đăng ký `watch` trên một znode. Khi znode đổi (data/con/bị xóa), cụm gửi **một** thông báo (one-shot) tới client → client biết mà không cần polling. Đây là "trái tim" của mọi luồng phản ứng: lock được nhả, leader chết, config đổi.

### 3.3 etcd — key-value, lease, revision (nền Raft)

etcd (nền của **Kubernetes** — mọi object k8s nằm trong etcd) là **key-value phẳng, có sắp thứ tự**, chạy **Raft**. Khác biệt so với ZooKeeper về idiom:

| Khái niệm etcd | Vai trò | Tương đương ZooKeeper |
|---|---|---|
| **key/value** (không gian phẳng, sort được, range query) | Lưu dữ liệu | znode path |
| **revision** | **Số phiên bản toàn cục tăng đơn điệu** cho mọi thay đổi | zxid |
| **lease** | "Hợp đồng thuê có TTL"; gắn key vào lease → **lease hết hạn thì key tự xóa**; client `keepAlive` để gia hạn | ~ session của ephemeral |
| **watch** | Theo dõi key/prefix, **stream liên tục** từ một revision (không one-shot, không sót sự kiện) | watch (mạnh hơn) |
| **txn (compare-and-swap)** | So sánh điều kiện (vd `Version==0`) rồi thực hiện atomically | version check |

Điểm cực mạnh của etcd: **MVCC + revision**. Mọi key có `CreateRevision`, `ModRevision`, `Version`. Nhờ đó etcd có **CAS thực thụ** (`If(cond).Then(...).Else(...)`) và watch **không sót** sự kiện (stream từ revision X trở đi). Lease thay cho session: bạn tạo lease TTL=10s, gắn key vào; nếu client chết không keepAlive → sau ≤10s key biến mất.

---

## 4. Bốn công thức dùng coordination service

### 4.1 Distributed lock (khóa phân tán)

**Ý tưởng ZooKeeper (lock công bằng, tránh herd effect):**
1. Client tạo **ephemeral + sequential** znode dưới `/lock/`, ví dụ được `/lock/req-0000000007`.
2. Liệt kê con của `/lock/`. Nếu số của **mình là nhỏ nhất** → **giành được lock**.
3. Nếu không, chỉ **watch znode đứng ngay trước mình** (số liền kề nhỏ hơn) — không watch toàn bộ, để tránh **herd effect** (mọi client cùng bị đánh thức).
4. Khi znode phía trước biến mất (nhả lock hoặc chủ nó chết) → watch bắn → quay lại bước 2.
5. Nhả lock = xóa znode của mình. **Client chết** → ephemeral tự xóa → lock tự nhả, **không kẹt vĩnh viễn**.

**etcd** đóng gói sẵn primitive này trong package `concurrency` (lease + CAS + watch). Ví dụ Go:

```go
package main

import (
	"context"
	"log"
	"time"

	clientv3 "go.etcd.io/etcd/client/v3"
	"go.etcd.io/etcd/client/v3/concurrency"
)

func main() {
	cli, err := clientv3.New(clientv3.Config{
		Endpoints:   []string{"127.0.0.1:2379"},
		DialTimeout: 5 * time.Second,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	// Session gắn với 1 lease TTL=10s; keepAlive tự động chạy nền.
	// Client chết -> lease hết hạn -> lock tự nhả (không kẹt vĩnh viễn).
	sess, err := concurrency.NewSession(cli, concurrency.WithTTL(10))
	if err != nil {
		log.Fatal(err)
	}
	defer sess.Close()

	mu := concurrency.NewMutex(sess, "/locks/order-42")

	// Lock() tạo key ephemeral+sequential, chờ tới lượt bằng watch key liền trước.
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := mu.Lock(ctx); err != nil {
		log.Fatal("không giành được lock: ", err)
	}
	log.Println("Đã giữ lock, revision =", mu.Header().Revision)

	// --- vùng găng: chỉ 1 client vào tại một thời điểm ---
	doCriticalWork()

	if err := mu.Unlock(context.Background()); err != nil {
		log.Fatal(err)
	}
	log.Println("Đã nhả lock")
}

func doCriticalWork() { time.Sleep(2 * time.Second) }
```

### 4.2 Leader election

Leader election **chính là** distributed lock: ai giữ được "lock" thì là leader; giữ đến khi chết. Với etcd, dùng thẳng `concurrency.Election`:

```go
sess, _ := concurrency.NewSession(cli, concurrency.WithTTL(15))
el := concurrency.NewElection(sess, "/leader/scheduler")

// Campaign chặn tới khi node này TRỞ THÀNH leader (mọi node khác xếp hàng sau).
if err := el.Campaign(context.Background(), "node-A"); err != nil {
	log.Fatal(err)
}
log.Println("Tôi là leader. Bắt đầu làm việc của leader...")

// Các node khác theo dõi ai đang là leader mà không cần tự tranh:
// ch := el.Observe(ctx); cur := <-ch; fmt.Println(string(cur.Kvs[0].Value))

// Khi session mất (leader này chết) -> lease hết hạn -> node kế trong hàng
// tự động lên làm leader. Chủ động rời ghế: el.Resign(ctx)
```

Với ZooKeeper: mỗi ứng cử viên tạo ephemeral+sequential dưới `/election/`; số nhỏ nhất là leader; các node còn lại watch node liền trước — **hệt như lock**. Leader chết → ephemeral xóa → node kế lên.

### 4.3 Config & service discovery

- **Config động:** để config ở một key/znode (vd `/config/feature-flags`). Mọi instance **watch** key đó. Đổi giá trị một lần → cụm đẩy sự kiện → toàn bộ instance nạp lại **không cần restart**. Đây là "dynamic configuration" đúng nghĩa.
- **Service discovery:** mỗi instance khi khởi động **tự đăng ký** dưới một prefix, ví dụ etcd key `/services/payment/10.0.3.7:8080` gắn vào **lease TTL ngắn** (hoặc ZooKeeper **ephemeral** znode). Client của service đó **watch prefix `/services/payment/`** để có danh sách endpoint sống, cập nhật realtime. Instance chết → lease hết hạn → key biến mất → tự động rớt khỏi danh sách.

### 4.4 Membership (ai đang sống trong cụm)

Mỗi node tạo một **ephemeral** znode (ZK) hoặc key gắn **lease** (etcd) mang tên/địa chỉ của mình dưới `/members/`. Danh sách con dưới `/members/` **chính là** tập node đang sống. Node chết → session/lease hết → tự rời danh sách. Ai cần biết thành viên chỉ việc **watch prefix**. Đây là nền của failure detection ở tầng ứng dụng, chuẩn xác hơn nhiều so với tự viết heartbeat.

---

## 5. Split-brain & fencing token (phần dễ sai chết người)

### 5.1 Vì sao lock **không đủ** để đảm bảo an toàn

Có một hiểu lầm nguy hiểm: "tôi giữ lock nên chắc chắn chỉ mình tôi ghi". **Sai.** Xét kịch bản kinh điển (Martin Kleppmann):

1. Client 1 giành lock, chuẩn bị ghi vào storage.
2. Client 1 bị **stop-the-world GC pause** (hoặc mất mạng) **13 giây** — lâu hơn TTL của lease.
3. Coordination service thấy lease hết hạn → **thu hồi lock** → cấp lock cho **Client 2**.
4. Client 2 ghi vào storage — hợp lệ, nó đang giữ lock.
5. Client 1 **tỉnh dậy**, vẫn "tưởng" mình giữ lock, và ghi đè lên storage.

→ **Hai client cùng ghi = split-brain.** Lock đã bị thu hồi nhưng Client 1 không hề biết. Bản thân lock **không thể** ngăn được, vì cái ghi cuối cùng xảy ra ở **storage**, nơi không tham gia vào lock.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="fb-t fb-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="fb-t">Split-brain do GC pause và cách fencing token chặn nó</title>
<desc id="fb-d">Client 1 pause quá TTL, lock chuyển sang Client 2; storage từ chối ghi có token cũ nhỏ hơn</desc>
<text x="70" y="22" text-anchor="middle" font-size="12" fill="currentColor">Client 1</text>
<text x="70" y="130" text-anchor="middle" font-size="12" fill="currentColor">Client 2</text>
<text x="620" y="76" text-anchor="middle" font-size="12" fill="currentColor">Storage</text>
<line x1="70" y1="30" x2="70" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="30" y="40" width="80" height="24" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="56" text-anchor="middle" font-size="10" fill="currentColor">lock, tok=33</text>
<rect x="130" y="40" width="120" height="24" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="190" y="56" text-anchor="middle" font-size="10" fill="currentColor">GC pause 13s...</text>
<line x1="70" y1="150" x2="70" y2="235" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="30" y="150" width="130" height="24" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="166" text-anchor="middle" font-size="10" fill="currentColor">nhận lock, tok=34</text>
<line x1="160" y1="162" x2="560" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#f1)"/>
<text x="360" y="132" text-anchor="middle" font-size="10" fill="#10b981">write(tok=34) OK</text>
<line x1="250" y1="52" x2="560" y2="100" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#f1)"/>
<text x="380" y="70" text-anchor="middle" font-size="10" fill="#f43f5e">write(tok=33) tỉnh dậy, ghi muộn</text>
<rect x="560" y="40" width="120" height="90" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="92" text-anchor="middle" font-size="10" fill="currentColor">max_seen=34</text>
<text x="620" y="108" text-anchor="middle" font-size="10" fill="#f43f5e">33 &lt; 34: TỪ CHỐI</text>
<defs><marker id="f1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 5.2 Fencing token: lời giải đúng

**Fencing token** là một **số tăng đơn điệu** mà coordination service cấp **mỗi lần lock được trao**. Client phải **đính token này vào mọi thao tác ghi** xuống storage. **Storage ghi nhớ token lớn nhất từng thấy và từ chối bất kỳ ghi nào mang token nhỏ hơn.**

Quay lại kịch bản: Client 1 giữ token **33**; Client 2 lấy lock sau nên có token **34**; storage đã thấy 34. Khi Client 1 tỉnh dậy ghi với token **33 < 34** → **storage từ chối**. Split-brain bị chặn tại đúng nơi ghi thật sự xảy ra.

**Nguồn token có sẵn, không cần bịa:**
- **etcd:** dùng `ModRevision` / `revision` của key lock — luôn tăng đơn điệu toàn cục. Hoặc `Version` của key. Chính là fencing token trời cho.
- **ZooKeeper:** dùng **`zxid`** của thao tác tạo, hoặc **số sequential** của znode lock (`req-0000000034` → token 34).

> **Quy tắc vàng chống split-brain:** *Lock cấp quyền, nhưng phải có **fencing token + storage biết kiểm token** thì mới thật sự an toàn.* Nếu backend (DB, object store) **không** kiểm được token thì lock chỉ đảm bảo **hiệu quả** (giảm đụng độ), **không** đảm bảo **đúng đắn**. Đây là ranh giới phải luôn tỉnh táo.

### 5.3 Tại sao cụm phải là số lẻ (3, 5)

Quorum = đa số. Cụm **3 node** chịu **1** node chết (2/3 vẫn là đa số). Cụm **5 node** chịu **2**. Thêm node chẵn **không** tăng khả năng chịu lỗi mà còn hại: 4 node vẫn chỉ chịu 1 chết như 3 node, lại nhiều điểm hỏng hơn và **latency ghi cao hơn** (phải chờ quorum lớn hơn). → Luôn chọn **số lẻ**, thường **3** (đủ cho hầu hết) hoặc **5** (hệ cực quan trọng).

---

## 6. Ví dụ thực tế & con số

- **Kubernetes** giữ **toàn bộ** trạng thái cluster (Pod, Service, Secret, ...) trong **etcd**; controller **watch** etcd để phản ứng khi state đổi. etcd chết/mất quorum → control plane "đơ" (workload đang chạy vẫn sống nhưng không lên lịch/đổi được gì).
- **Kafka** (bản cũ) dùng **ZooKeeper** cho controller election, cấu hình topic, membership của broker (ephemeral znode). Bản mới (KRaft) tự chạy Raft **thay** ZooKeeper — minh chứng consensus là hạ tầng cốt lõi bên dưới.
- **Kích thước cụm:** gần như luôn là **3 hoặc 5 node**, dữ liệu vừa trong RAM. Ghi qua quorum thường cho throughput **hàng nghìn–chục nghìn ghi/giây** và độ trễ **vài ms trong cùng DC** — đủ cho metadata, **không** đủ (và không nên) cho traffic dữ liệu ứng dụng.
- **Session/lease timeout** điển hình **vài giây tới ~15s**: quá ngắn thì node khoẻ cũng bị coi là chết khi mạng chớp; quá dài thì phát hiện chết chậm. Phải cân với thực tế mạng.

---

## 7. Tóm tắt
- **Paxos** giải consensus dưới crash-fault + async: **proposer/acceptor/learner**, hai pha **prepare/accept**, an toàn nhờ **quorum đa số giao nhau**; ép proposer sau lặp lại giá trị đã có thể chốt.
- **Multi-Paxos** = bầu **leader ổn định** để mỗi lệnh chỉ tốn **Pha 2 (1 RTT)** → xây replicated log/state machine; ngang Raft về hiệu năng.
- Paxos **khó cài đúng**: bài báo chỉ single-decree, không đảm bảo liveness (livelock), phần bền vững/snapshot/membership dễ sai và cực khó test → **đừng tự cài**.
- **Coordination service** (ZooKeeper/etcd) "thuê ngoài" consensus: một cụm nhỏ 3–5 node phơi ra kho KV **linearizable** cho metadata. ZooKeeper: **znode + ephemeral + sequential + watch**. etcd: **key/value + lease + revision + watch + txn(CAS)**, nền **Raft**.
- Bốn công thức: **lock** (ephemeral+sequential, watch node trước), **leader election** (= lock), **config/discovery** (watch + lease/ephemeral tự rớt), **membership**.
- Chống **split-brain**: lock **không đủ**; phải có **fencing token** (dùng `ModRevision`/`zxid`/số sequential) và **storage từ chối token cũ**. Cụm luôn **số lẻ** để quorum tối ưu.

> **Bài tiếp theo (Bài 16):** từ "đồng ý một giá trị" sang **thời gian & thứ tự** — đồng bộ hoá đồng hồ, **TrueTime** (Spanner) và cách các hệ thực tế xếp thứ tự sự kiện toàn cục.
