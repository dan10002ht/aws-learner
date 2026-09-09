# Bài 2 — Bản đồ một hệ thống game online

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ được **bản đồ đầy đủ** một hệ thống game online và gọi đúng tên từng thành phần.
- Tách hệ thống thành **hai mặt phẳng** — meta plane và game plane — và chứng minh bằng số vì sao chúng không thể dùng chung hạ tầng.
- Kể lại **vòng đời một trận** từ lúc mở app tới lúc điểm được ghi vào DB, chỉ ra chỗ nào có thể hỏng.
- Xác định **hướng gọi an toàn** qua ranh giới hai mặt phẳng, và vì sao hướng ngược lại tạo ra sự cố dây chuyền.
- Trả lời được: nửa nào sập thì cái gì còn sống, và thiết kế thế nào để câu trả lời đó có lợi cho bạn.

---

## 2. Triệu chứng

Game của bạn đã chạy. Kiến trúc gọn gàng: một cụm service backend lo tài khoản, cửa hàng, bảng xếp hạng; một cụm game node lo trận đấu. Cùng một Kubernetes cluster, cùng một Postgres, cùng một Redis.

Thứ Bảy, 20 giờ, đông người nhất trong tuần. Ai đó mở tính năng **bảng xếp hạng toàn server** — một truy vấn `ORDER BY score DESC LIMIT 100` trên bảng 4 triệu dòng, chưa có index đúng.

Postgres tăng tải. Connection pool cạn. Và rồi:

```
20:14:02  leaderboard API  p99 4,2s   (dự kiến — truy vấn nặng)
20:14:19  matchmaking      timeout    (dùng chung pool)
20:14:31  game-node-07     6 trận bị huỷ giữa chừng
20:14:33  game-node-11     9 trận bị huỷ giữa chừng
20:15:10  ~400 người chơi mất trận đang đấu dở
```

**Một truy vấn xếp hạng thiếu index vừa giết 400 trận đấu đang diễn ra.**

Điều kỳ lạ: các trận đó không hề cần bảng xếp hạng. Chúng chạy hoàn toàn trong RAM. Chúng lẽ ra không việc gì.

---

## ⏸ Dừng lại — đoán trước #1

**Vì sao trận đấu chạy trong RAM lại chết vì một truy vấn xếp hạng?**

```
(a) Game node đọc DB mỗi tick — vi phạm nguyên tắc bài 1
(b) Kubernetes evict pod vì node hết tài nguyên
(c) Game node có gọi DB, nhưng không phải mỗi tick — chỉ ở vài thời điểm,
    và những thời điểm đó nằm trên đường sống chết của trận
(d) Postgres chậm làm chậm cả mạng nội bộ
```

Đáp án nằm ở mục 3.4. Nó là (c), nhưng phần đáng học là **"vài thời điểm" đó là những lúc nào** — vì đó chính là ranh giới giữa hai mặt phẳng.

---

## 3. Lý thuyết

### 3.1 Hai mặt phẳng

Bài 1 kết thúc bằng nhận xét "một nửa hệ thống vẫn là BE App". Giờ vẽ ra đầy đủ. Một hệ thống game online luôn tách thành hai mặt phẳng có **tính chất vật lý khác nhau**:

<svg viewBox="0 0 720 380" role="img" aria-labelledby="gs2-a-t gs2-a-d" style="width:100%;height:auto">
<title id="gs2-a-t">Bản đồ hệ thống game online: meta plane và game plane</title>
<desc id="gs2-a-d">Client nói chuyện với meta plane qua REST cho login, shop, leaderboard, và với game plane qua WebSocket hoặc UDP. Meta plane gồm các service stateless dùng chung Postgres và Redis. Game plane gồm gateway, matchmaker, allocator và các game node giữ state trong RAM.</desc>
<rect x="20" y="16" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/>
<text x="80" y="38" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">CLIENT</text>
<text x="80" y="53" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">app / trình duyệt</text>
<rect x="180" y="16" width="520" height="130" rx="10" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="196" y="36" font-size="12" font-weight="bold" fill="currentColor">META PLANE — stateless, request/response</text>
<rect x="196" y="46" width="110" height="38" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="251" y="70" text-anchor="middle" font-size="10" fill="currentColor">Auth / Account</text>
<rect x="316" y="46" width="110" height="38" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="371" y="70" text-anchor="middle" font-size="10" fill="currentColor">Shop / Inventory</text>
<rect x="436" y="46" width="110" height="38" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="491" y="70" text-anchor="middle" font-size="10" fill="currentColor">Leaderboard</text>
<rect x="556" y="46" width="128" height="38" rx="6" fill="#3b82f6" fill-opacity="0.25"/>
<text x="620" y="70" text-anchor="middle" font-size="10" fill="currentColor">Guild / Social</text>
<rect x="196" y="94" width="230" height="36" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="311" y="117" text-anchor="middle" font-size="10" fill="currentColor">Postgres — persistent state</text>
<rect x="436" y="94" width="248" height="36" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="560" y="117" text-anchor="middle" font-size="10" fill="currentColor">Redis — session, hàng đợi, cache</text>
<rect x="180" y="176" width="520" height="188" rx="10" fill="#84cc16" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="196" y="196" font-size="12" font-weight="bold" fill="currentColor">GAME PLANE — stateful, tick liên tục</text>
<rect x="196" y="206" width="140" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="266" y="224" text-anchor="middle" font-size="10" fill="currentColor">Gateway</text>
<text x="266" y="238" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">auth vé, giữ WS</text>
<rect x="352" y="206" width="150" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="427" y="224" text-anchor="middle" font-size="10" fill="currentColor">Matchmaker</text>
<text x="427" y="238" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">ghép người → trận</text>
<rect x="518" y="206" width="166" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="601" y="224" text-anchor="middle" font-size="10" fill="currentColor">Allocator</text>
<text x="601" y="238" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">chọn node còn chỗ</text>
<rect x="196" y="266" width="150" height="82" rx="6" fill="#65a30d" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="271" y="286" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">game-node-01</text>
<text x="271" y="304" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">room A · tick 60Hz</text>
<text x="271" y="319" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">room B · tick 60Hz</text>
<text x="271" y="338" text-anchor="middle" font-size="9" font-style="italic" fill="currentColor">state trong RAM</text>
<rect x="362" y="266" width="150" height="82" rx="6" fill="#65a30d" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
<text x="437" y="286" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">game-node-02</text>
<text x="437" y="304" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">room C · tick 60Hz</text>
<text x="437" y="338" text-anchor="middle" font-size="9" font-style="italic" fill="currentColor">state trong RAM</text>
<rect x="528" y="266" width="156" height="82" rx="6" fill="#65a30d" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
<text x="606" y="310" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">game-node-N …</text>
<line x1="140" y1="34" x2="180" y2="60" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="128" y="86" font-size="9" fill="currentColor" opacity="0.8">REST</text>
<line x1="140" y1="52" x2="180" y2="222" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="118" y="180" font-size="9" fill="currentColor" opacity="0.8">WebSocket / UDP</text>
<line x1="440" y1="146" x2="440" y2="176" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="450" y="167" font-size="9" font-style="italic" fill="currentColor" opacity="0.85">ranh giới — chỉ gọi ở 3 thời điểm</text>
</svg>

Khác biệt không nằm ở công nghệ. Nó nằm ở **ba tính chất vật lý**:

| | Meta plane | Game plane |
|---|---|---|
| Công việc do ai khởi tạo | Request của client | **Thời gian** |
| State ở đâu | DB, process stateless | **RAM của đúng một process** |
| Trả lời muộn thì sao | Chậm là chậm | **Chậm bằng hỏng** |
| Định tuyến | Node nào cũng đúng | Phải tới **đúng** node giữ trận |
| Deploy | Rolling, kill pod thoải mái | **Drain** — chờ trận xong |
| Scale theo | CPU / QPS | **Số trận** |

### 3.2 Vòng đời một trận

Đây là thứ phải thuộc, vì mọi sự cố vận hành đều rơi vào một trong các bước này:

```
 1. Mở app        → Auth service          → JWT                      [meta]
 2. Vào sảnh      → Profile, Shop         → REST                     [meta]
 3. Bấm "Tìm trận"→ Matchmaker            → vào hàng đợi (Redis)     [meta→game]
 4. Đủ người      → Matchmaker ghép nhóm  → tạo match_id             [game]
 5. Xin chỗ       → Allocator             → chọn game-node còn slot  [game]
 6. Phát vé       → trả về {node, port, ticket}                      [game]
 7. Kết nối       → Client → Gateway → game-node → vào room          [game]
 8. Chơi          → tick 60Hz, snapshot 20Hz, KHÔNG chạm DB          [game]
 9. Kết thúc      → node gửi kết quả → Match Result service → DB     [game→meta]
10. Về sảnh       → Leaderboard đã cập nhật                          [meta]
```

Chú ý ba chỗ đánh dấu chuyển mặt phẳng — bước 3, bước 5–6, và bước 9. **Chỉ có ba chỗ đó.** Bước 8, chiếm 99 % thời gian của người chơi, không chạm meta plane một lần nào.

### 3.3 Bất đối xứng 2.000 lần

Vì sao hai mặt phẳng không thể dùng chung hạ tầng? Tính ra bằng số. Một trận **100 người, 10 phút**, sim 60 Hz, snapshot 20 Hz:

| | Meta plane | Game plane |
|---|---|---|
| Đơn vị công việc | request | tick, packet |
| Tổng trong 10 phút | 100 người × 6 request = **600** | snapshot gửi ra **1.200.000** bản tin |
| | | input nhận vào **3.600.000** gói |
| Tốc độ | **1 request/giây** | **2.000 bản tin/giây** ra, **6.000 gói/giây** vào |
| Tỉ lệ | 1 | **2.000 ×** |

*(6 request/người/phiên là ước lượng thực dụng: login, hồ sơ, hai lần đọc sảnh, ghép trận, ghi kết quả. Con số chính xác đổi theo game, nhưng bậc độ lớn thì không.)*

Một request meta được phép tốn 200 ms. Một tick game có **16,67 ms** cho toàn bộ mọi việc. Đặt hai thứ chênh nhau 2.000 lần về tần suất và chênh nhau 12 lần về hạn chót lên **cùng một connection pool** thì bên có hạn chót ngặt hơn sẽ chết trước — đúng như sự cố ở mục 2.

> Đây là dạng lập luận sẽ lặp lại suốt course: **hai thứ có ràng buộc thời gian khác nhau một bậc độ lớn thì không được chia sẻ tài nguyên bị giới hạn.** Connection pool, thread pool, hàng đợi, băng thông — đều vậy.

---

## ⏸ Dừng lại — đoán trước #2

Ranh giới giữa hai mặt phẳng có hai hướng gọi. Một hướng an toàn, một hướng nguy hiểm.

```
Hướng A:  meta plane  →  gọi vào  →  game plane
          (ví dụ: "cho tôi biết trận X đang thế nào")

Hướng B:  game plane  →  gọi ra   →  meta plane
          (ví dụ: "ghi kết quả trận X vào DB")
```

**Hướng nào nguy hiểm hơn, và vì sao?** Gợi ý: nghĩ theo câu "chậm bằng hỏng" ở bên nào.

---

### 3.4 Ba thời điểm chạm ranh giới — và cách làm cho chúng an toàn

Đáp án: **hướng B nguy hiểm hơn.** Meta plane gọi vào game plane thì cùng lắm meta chờ — mà meta thì chờ được. Game plane gọi ra meta plane nghĩa là **một tiến trình có hạn chót 16,67 ms đang chờ một hệ thống không có hạn chót nào**. Đó chính là cơ chế của sự cố ở mục 2.

Quay lại vòng đời: game plane chạm meta đúng ba lần. Với mỗi lần, có một cách làm sai hiển nhiên và một cách làm đúng.

**① Lúc cấp phát (bước 5–6).** Allocator phải biết node nào còn chỗ.

- ✗ Sai: allocator truy vấn DB mỗi lần cấp phát.
- ✓ Đúng: game node **tự báo cáo** sức chứa lên Redis vài giây một lần; allocator chỉ đọc Redis. Nếu Redis chết, allocator dùng bản ghi cuối cùng và chấp nhận sai một chút — **trận đang chạy không bị ảnh hưởng**.

**② Lúc người chơi vào trận (bước 7).** Game node cần biết người này là ai, mang skin gì, chỉ số gì.

- ✗ Sai: game node truy vấn Postgres lấy hồ sơ khi người chơi kết nối. Đây chính là dòng gãy trong sự cố ở mục 2 — connection pool cạn, node không nạp được hồ sơ, người chơi treo ở màn hình loading, node coi là timeout và huỷ trận.
- ✓ Đúng: **nhét hồ sơ vào cái vé**. Matchmaker đọc DB một lần (nó ở meta plane, nó được phép chậm), ký một ticket chứa sẵn mọi thứ game node cần, client mang ticket sang. Game node chỉ **xác minh chữ ký** — không I/O, không mạng, vài micro giây.

**③ Lúc kết thúc trận (bước 9).** Kết quả phải xuống DB.

- ✗ Sai: node gọi đồng bộ `POST /match-result` rồi mới giải phóng room. Meta chậm → room không giải phóng → node hết slot → allocator không cấp được → hàng đợi dồn.
- ✓ Đúng: node ghi kết quả vào một **hàng đợi bền** (outbox, stream, message queue) rồi giải phóng room ngay. Một worker ở meta plane tiêu thụ hàng đợi đó. Kết quả tới DB muộn vài giây — không ai chết vì điều đó.

Rút thành một quy tắc:

> **Game plane không bao giờ được chờ đồng bộ meta plane.** Mọi thứ nó cần phải được đẩy tới trước (ticket) hoặc đẩy đi sau (hàng đợi). Không có cuộc gọi nào nằm giữa.

### 3.5 Cô lập lỗi — nửa nào sập thì cái gì còn sống

Nếu đã đặt ranh giới đúng, bảng này là kết quả tự nhiên. Nếu đặt sai, không dòng nào đúng.

| Cái gì sập | Trận đang chạy | Trận mới | Sảnh / shop |
|---|---|---|---|
| Leaderboard service | **vẫn chạy** | vẫn tạo được | hỏng phần xếp hạng |
| Postgres | **vẫn chạy hết trận** | không tạo được (không đọc được hồ sơ) | hỏng |
| Redis | **vẫn chạy** | ghép trận hỏng | phần cache hỏng |
| Matchmaker | **vẫn chạy** | không tạo được | vẫn chạy |
| Một game node | **mất đúng các trận trên node đó** | vẫn tạo trên node khác | vẫn chạy |
| Gateway | mất kết nối, cần reconnect | vẫn tạo được | vẫn chạy |

Đọc cột "trận đang chạy": gần như mọi thứ có thể sập mà trận vẫn đấu xong. **Đó không phải may mắn, đó là thứ bạn mua bằng ba quyết định ở mục 3.4.**

Và đọc dòng "một game node": mất đúng các trận trên node đó, không hơn. Đây là lý do bài 31 dành hẳn một mục cho graceful shutdown — vì đó là cách biến "mất trận" thành "lưu được state rồi mới chết".

### 3.6 Ba cái bẫy khi đặt ranh giới sai

**Bẫy 1 — dùng chung connection pool.** Chính là sự cố ở mục 2. Sửa: pool riêng, hoặc tốt hơn là game node **không có** credential DB nào cả. Không có đường thì không đi nhầm được.

**Bẫy 2 — gateway giữ luôn state trận.** Nghe tiện: gateway đã giữ WebSocket rồi, cho nó chạy simulation luôn. Hậu quả: không deploy được gateway mà không giết trận, và không scale được hai thứ độc lập. Gateway phải **không có state trận** — nó chỉ chuyển tiếp và giữ kết nối. Bài 29 mổ xẻ đầy đủ.

**Bẫy 3 — matchmaker gọi thẳng game node.** Matchmaker quyết định ghép ai với ai; allocator quyết định trận đó chạy ở đâu. Gộp hai việc thì mỗi lần đổi chính sách ghép trận là phải deploy thứ đang giữ trận. Tách ra, matchmaker deploy được bất cứ lúc nào.

---

## 4. So sánh nhanh

| Câu hỏi | Meta plane | Game plane |
|---|---|---|
| Giao thức | HTTP / gRPC | WebSocket / UDP |
| Đơn vị scale | pod theo QPS | node theo **số trận** |
| Hạn chót | ~200 ms, mềm | **16,67 ms, cứng** |
| Mất một instance | không ai nhận ra | **mất các trận trên đó** |
| Deploy | rolling | **drain** |
| DB | trên critical path, bình thường | **cấm nằm trên đường tick** |
| Test | integration test thường | cần bot client (bài 39) |

---

## 5. Tính tay

**Bài 1.** Game của bạn có 10.000 CCU, trận 10 người, mỗi trận 8 phút.
- Mỗi giây có bao nhiêu trận kết thúc, tức bao nhiêu bản ghi kết quả cần xuống DB?
- Nếu mỗi bản ghi là một `INSERT` + một `UPDATE` xếp hạng, DB chịu bao nhiêu write/giây?
- Con số đó có cần hàng đợi không, hay ghi thẳng cũng được? Đổi CCU lên 1 triệu thì câu trả lời có đổi không?

**Bài 2.** Vẫn 10.000 CCU, trận 10 người. Một game node chịu được 20 trận đồng thời.
- Cần bao nhiêu game node?
- Một node chết thì bao nhiêu người mất trận, tính theo phần trăm tổng CCU?
- Muốn con số đó xuống một nửa, bạn đổi gì — và cái giá là gì?

**Bài 3.** Quay lại sự cố ở mục 2.
- Nếu game node **không có** credential Postgres, dòng nào trong log sự cố biến mất?
- Nếu hồ sơ người chơi nằm trong ticket đã ký, bước nào trong vòng đời không còn chạm DB?
- Sau hai thay đổi đó, truy vấn xếp hạng thiếu index còn giết được bao nhiêu trận?

---

## 6. Chuyển giao

**Bạn được giao thiết kế backend cho một game đua xe**: mỗi cuộc đua 8 người, 3 phút, có bảng xếp hạng theo mùa, có shop bán skin, và có chế độ "đua lại đường đua của bạn bè" — tức phải lưu và phát lại toàn bộ hành trình của một lượt đua cũ.

1. Vẽ bản đồ hai mặt phẳng cho game này. Cái gì ở đâu?
2. Bản ghi replay (hành trình một lượt đua) thuộc tầng state nào trong ba tầng ở bài 1? Nó đi qua ranh giới ở bước nào?
3. Replay cần lưu cái gì để phát lại được — vị trí xe mỗi frame, hay input của người chơi? Cách nào rẻ hơn, và cách đó đòi hỏi tính chất gì của simulation?
4. Người chơi mua skin **giữa lúc đang đua**. Shop ở meta plane, xe ở game plane. Skin xuất hiện lúc nào, và ai là người quyết định?
5. Game node chết ở giây thứ 150 của cuộc đua 180 giây. Bạn thiết kế thế nào để người chơi mất ít nhất? Có cách nào để họ không mất gì không, và cái giá là bao nhiêu?
6. **Câu khó nhất:** ba quy tắc của bài này — ticket đẩy tới trước, hàng đợi đẩy đi sau, không gọi đồng bộ qua ranh giới — cái nào bạn **bỏ được** khi game chỉ có 100 CCU, và ở mốc CCU nào thì bỏ nó bắt đầu trả giá? Trả lời bằng phép tính, không bằng cảm giác.

---

## 7. Tóm tắt

- Hệ thống game tách thành **hai mặt phẳng** khác nhau về vật lý: meta plane (stateless, request-driven, hạn chót mềm) và game plane (stateful, time-driven, hạn chót cứng 16,67 ms).
- Bất đối xứng đo được: cùng một trận 100 người 10 phút, meta plane làm **1 request/giây**, game plane làm **2.000 bản tin/giây** ra và **6.000 gói/giây** vào — chênh **2.000 lần**.
- Hai thứ chênh nhau một bậc độ lớn về tần suất và hạn chót **không được chia sẻ tài nguyên bị giới hạn** (connection pool, thread pool, băng thông).
- Vòng đời một trận có **10 bước**, nhưng chỉ **3 bước** chạm ranh giới: cấp phát, vào trận, kết thúc trận.
- Quy tắc ranh giới: **game plane không bao giờ chờ đồng bộ meta plane.** Cần gì thì đẩy tới trước bằng **ticket đã ký**; sinh ra gì thì đẩy đi sau bằng **hàng đợi bền**.
- Làm đúng ba chỗ đó thì gần như mọi thành phần có thể sập mà **trận đang chạy vẫn đấu xong** — đó là thứ mua được, không phải may.
- Ba cái bẫy: dùng chung connection pool, gateway giữ state trận, gộp matchmaker với allocator.

→ **Bài 3 — Thể loại game quyết định netcode**: cùng một bản đồ này, nhưng cờ vua, RTS, FPS và MMO đặt ra bốn bộ ràng buộc hoàn toàn khác nhau — và đó là lý do không tồn tại "netcode đúng".
