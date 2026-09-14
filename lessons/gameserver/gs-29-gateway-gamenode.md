# Bài 29 — Gateway vs game node

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chứng minh **bằng xác suất** vì sao round-robin không "kém hiệu quả" ở game mà là **không dùng được**, và vì sao consistent hashing cũng không cứu.
- Chọn giữa **client nối thẳng game node** và **client đi qua gateway**, nói ra cái giá bằng mili giây của lựa chọn thứ hai.
- Chỉ ra **cái gì được phép nằm trong RAM của gateway** và cái gì không — bằng tiêu chí "restart được hay không".
- Thiết kế **bảng định tuyến theo `match_id`**: ai ghi, ai đọc, cache ở đâu, và vì sao cache ở đây **không phải một đánh đổi**.
- Viết ra **quy trình drain đầy đủ** cho node stateful, tính thời gian drain tệ nhất và số node dư phải mua để deploy không giảm sức chứa.
- Nói được **khi nào gateway là over-engineering**.

---

## 2. Triệu chứng

Game của bạn đang chạy tốt: **40.000 CCU**, trận 10 người, mỗi trận 8 phút — tức **4.000 trận đồng thời**. Một game node chịu 20 trận, nên fleet có **200 node**. Hạ tầng chuẩn: Kubernetes Deployment, Service, rolling update, thứ bạn đã làm đúng hàng trăm lần.

Thứ Ba, 14 giờ, bạn merge một fix nhỏ và bấm deploy.

```
14:02:10  rolling update bat dau, maxUnavailable=10
14:02:11  game-node-004  SIGTERM  -> 20 tran bien mat
14:02:11  game-node-017  SIGTERM  -> 20 tran bien mat
...
14:26:40  rolling update hoan tat, 200/200 pod moi, 0 error
```

Kubernetes báo deploy **thành công**, không một dòng lỗi, health check xanh từ đầu tới cuối. Trong khi đó, phía người chơi:

```
tran bi giet    : 200 node x 20 tran   = 4.000 tran
nguoi bi anh huong                     = 40.000 nguoi  (= dung bang CCU)
trung binh moi tran mat 4 phut da choi
tong thoi gian choi bi xoa: 4.000 x 10 x 4 = 160.000 phut nguoi = 2.667 gio
```

Mỗi lần deploy giết **đúng toàn bộ số trận đang đấu**. Deploy 2 lần một tuần thì mỗi tháng bạn xoá **34.640 trận**.

Và chưa phải phần tệ nhất. Tệ nhất là: sau khi pod mới lên, bạn cho client kết nối lại — gói tin của nó tới **một node ngẫu nhiên**, và node đó không biết `match_id` kia là cái gì.

Bài 1 đã nói một câu: *"route theo `match_id`, drain thay rolling deploy"*. Bài này trả nợ cả hai vế.

---

## ⏸ Dừng lại — đoán trước #1

Fleet có **M = 200** game node. Client gửi gói `{match_id: X, input: ...}` qua một load balancer round-robin thông thường. Một phiên chơi 8 phút ở 60 Hz là **28.800 gói**.

**Kết quả là gì?**

```
(a) 0,5 % gói tới đúng node — game chơi được nhưng giật khủng khiếp
(b) Sticky session / ip-hash giải quyết được: cùng một client luôn tới cùng một node
(c) Xác suất một phiên chơi trọn vẹn là 10^-66270 — tức là 0. Không có mức
    "giật", chỉ có "không tồn tại"
(d) Node nhận nhầm có thể forward sang node đúng, chi phí một chặng nội bộ
```

Đáp án ở mục 3.1, và ba phương án còn lại đều sai theo những cách khác nhau đáng học.

---

## 3. Lý thuyết

### 3.1 Round-robin không "kém", nó không dùng được

Đáp án là **(c)**.

Bài 1 và bài 2 đã chốt: một trận có **đúng một chủ sở hữu**, state nằm trong RAM của đúng một tiến trình. Xác suất định tuyến ngẫu nhiên trúng chủ sở hữu là `1/M`:

| M (số node) | P(một gói tới đúng node) | P(tới sai) |
|---|---|---|
| 10 | 10 % | 90 % |
| 50 | 2 % | 98 % |
| 200 | **0,5 %** | **99,5 %** |

Cột bên phải mới là cột phải đọc. Ở BE App, "99,5 % request tới sai node" là câu **vô nghĩa** — không có node sai, mọi node đọc cùng một DB. Ở đây nó có nghĩa: 99,5 % gói rơi vào tiến trình không có dữ liệu để xử lý chúng. Và một phiên chơi cần **28.800 gói liên tiếp** đều đúng:

```
M = 10   ->  P = 0,1^28800    = 10^-28800
M = 50   ->  P = 0,02^28800   = 10^-48930
M = 200  ->  P = 0,005^28800  = 10^-66270
```

Nên (a) sai: không có chế độ "giật khủng khiếp nhưng chơi được", hệ thống không hoạt động.

**Vì sao (b) sai.** Sticky session (ip-hash, cookie affinity) đảm bảo *cùng một client luôn tới cùng một node*. Nhưng "cùng một node" ≠ "đúng node": LB băm theo **địa chỉ client**, còn chủ sở hữu trận do **allocator** chọn theo sức chứa và vùng địa lý (bài 2, bước 5). Hai hàm không liên quan, nên xác suất trùng vẫn `1/M`. Sticky session biến lỗi ngẫu nhiên thành lỗi **ổn định** — dễ debug hơn, vẫn hỏng hoàn toàn.

**Vì sao (d) sai.** Node nhận nhầm *có thể* forward — nhưng lúc đó mọi game node đều phải giữ bảng định tuyến toàn cụm, và 99,5 % gói đi qua hai tiến trình thay vì một. Đó là gateway dán vào chỗ sai. Đằng nào cũng cần lớp định tuyến thì tách hẳn nó ra.

### 3.2 Bản sai chạy trước: "băm `match_id` là xong"

Ai cũng nghĩ ra cách này trong ba mươi giây, và nó *nghe* rất đẹp:

```go
// Gateway khong can bang dinh tuyen, khong can Redis, khong can gi ca.
node := nodes[hash(matchID) % len(nodes)]
```

Không state, không I/O, deterministic, mọi gateway tự ra cùng một đáp án. Nếu bạn từng dùng consistent hashing cho cache shard thì phản xạ này rất mạnh. Nó hỏng vì hai lý do, và lý do thứ hai mới giết nó.

**Hỏng 1 — fleet đổi kích thước.** Autoscale thêm một node: `M` đi từ 200 lên 201. Với modulo hashing, mô phỏng trên 200.000 khoá ngẫu nhiên:

```
hash % 200 == hash % 201 : 0,482 %  ->  99,518 % match_id doi node
=> 3.981 / 4.000 tran dang dau bi tro sang node khong giu chung
```

Consistent hashing sửa đúng chỗ này — chỉ ~0,5 % khoá phải dời khi thêm một node, tức khoảng 20 trận. Nhưng 20 trận chết vẫn là 20 trận chết, và autoscale chạy hàng chục lần một ngày.

**Hỏng 2 — chỗ chết thật.** Hàm băm *quyết định* trận chạy ở đâu. Nhưng ở bài 2, kẻ quyết định là **allocator**, dựa trên: node nào còn slot, node nào đúng region với nhóm người chơi, node nào đang chạy build cũ và sắp drain. Không dữ kiện nào trong số đó nằm trong `hash(match_id)`. Ép hash quyết định là vứt bỏ toàn bộ khả năng cân tải — node đầy vẫn nhận thêm trận vì hàm băm bảo thế.

> Băm hoạt động khi **bất kỳ vị trí nào cũng đúng, miễn là nhất quán**. Nó hỏng khi **có đúng một vị trí đúng và người khác chọn nó**. Game node thuộc loại thứ hai — nên **phải có một bảng tra cứu thật**, ghi bởi kẻ đã ra quyết định. Mục 3.5 dựng nó.

---

## ⏸ Dừng lại — đoán trước #2

Trước khi dựng bảng định tuyến, phải chọn **ai** tra nó. Hai kiến trúc:

```
(A) Client  ------------------->  game-node-042
    (dia chi node nam trong ticket, client noi thang)

(B) Client  -->  Gateway  ---->  game-node-042
    (gateway giu WebSocket/TLS, chuyen tiep theo match_id)
```

Ngân sách độ trễ của bài 8 là **182 ms**, trong đó A→server 20 ms và server→B 20 ms.

**Kiến trúc (B) cộng bao nhiêu ms vào 182 ms đó**, nếu gateway cùng datacenter với game node (~0,5 ms một chặng)? Và nếu khác AZ (~2 ms)? Cẩn thận: một sự kiện gameplay vượt ranh giới client–server **hai** lần.

---

### 3.3 Hai kiến trúc và cái giá bằng mili giây

Một sự kiện "A bấm chuột → B nhìn thấy" vượt ranh giới hai lần: input của A đi vào, snapshot tới B đi ra. Gateway nằm trên cả hai, nên nhân đôi:

| Vị trí gateway | Một chặng | Cộng vào ngân sách | Ngân sách mới | % của 182 ms |
|---|---|---|---|---|
| Cùng datacenter | 0,5 ms | **+1,0 ms** | 183,0 ms | **0,55 %** |
| Khác AZ | 2,0 ms | **+4,0 ms** | 186,0 ms | **2,20 %** |

Đặt cạnh bảng "bốn cách cắt ngân sách" của bài 8: nâng sim tick 60 → 128 Hz mua được **4,4 ms** bằng **gấp đôi CPU**. Gateway đặt nhầm AZ **xoá sạch 4,0 ms** — gần bằng toàn bộ thành quả đó, không đổi lại gì.

> Gateway và game node **phải cùng AZ**. Không phải cùng region — cùng AZ. Chênh lệch giữa hai mức là 3 ms, tức 1,65 % ngân sách, đắt hơn mọi thứ bạn sẽ tối ưu được ở chương 9.

*(0,5 ms trong AZ và 2 ms giữa các AZ là bậc độ lớn thường gặp trên cloud công cộng — đo lại trên hạ tầng của bạn.)*

<svg viewBox="0 0 720 300" role="img" aria-labelledby="gs29-a-t gs29-a-d" style="width:100%;height:auto">
<title id="gs29-a-t">Hai kiến trúc kết nối: client nối thẳng game node và client đi qua gateway</title>
<desc id="gs29-a-d">Kiến trúc A cho client nối thẳng tới game node bằng địa chỉ trong ticket, không thêm chặng nào nhưng phơi IP của mọi node ra Internet. Kiến trúc B đặt một tầng gateway giữ WebSocket và TLS, chuyển tiếp theo match_id, thêm một phần trăm nhỏ vào ngân sách độ trễ nhưng chỉ phơi một điểm vào.</desc>
<rect x="16" y="14" width="688" height="126" rx="10" fill="#f59e0b" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="32" y="34" font-size="12" font-weight="bold" fill="currentColor">(A) NOI THANG — +0 ms, moi node lo IP ra Internet</text>
<rect x="32" y="46" width="92" height="40" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="78" y="70" text-anchor="middle" font-size="10" fill="currentColor">Client</text>
<line x1="124" y1="66" x2="276" y2="66" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="200" y="60" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">ticket cha {ip:port}</text>
<rect x="276" y="46" width="120" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="336" y="64" text-anchor="middle" font-size="10" fill="currentColor">game-node-042</text>
<text x="336" y="78" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">TLS + DDoS tu lo</text>
<rect x="412" y="46" width="120" height="40" rx="6" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
<text x="472" y="70" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">node-043 … 200</text>
<text x="560" y="62" font-size="10" fill="currentColor" opacity="0.9">200 dia chi cong khai</text>
<text x="560" y="78" font-size="10" fill="currentColor" opacity="0.9">200 chung chi TLS</text>
<text x="32" y="112" font-size="10" fill="currentColor" opacity="0.85">Deploy node = dut ket noi. Khong dat sau CDN/WAF duoc.</text>
<text x="32" y="128" font-size="10" fill="currentColor" opacity="0.85">Be mat tan cong = ca fleet.</text>
<rect x="16" y="156" width="688" height="132" rx="10" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.3"/>
<text x="32" y="176" font-size="12" font-weight="bold" fill="currentColor">(B) QUA GATEWAY — +1,0 ms cung DC (0,55% ngan sach), mot diem vao</text>
<rect x="32" y="188" width="92" height="40" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="78" y="212" text-anchor="middle" font-size="10" fill="currentColor">Client</text>
<line x1="124" y1="208" x2="180" y2="208" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<rect x="180" y="188" width="130" height="40" rx="6" fill="#3b82f6" fill-opacity="0.3"/>
<text x="245" y="206" text-anchor="middle" font-size="10" fill="currentColor">Gateway</text>
<text x="245" y="220" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">WS + TLS, KHONG state tran</text>
<line x1="310" y1="208" x2="376" y2="208" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="343" y="202" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">0,5 ms</text>
<rect x="376" y="188" width="120" height="40" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="436" y="212" text-anchor="middle" font-size="10" fill="currentColor">game-node-042</text>
<rect x="512" y="188" width="120" height="40" rx="6" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
<text x="572" y="212" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">mang noi bo</text>
<rect x="180" y="244" width="130" height="32" rx="6" fill="#64748b" fill-opacity="0.25"/>
<text x="245" y="264" text-anchor="middle" font-size="9" fill="currentColor">cache: match_id -&gt; node</text>
<line x1="245" y1="228" x2="245" y2="244" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="330" y="258" font-size="10" fill="currentColor" opacity="0.85">Deploy node KHONG dut ket noi client.</text>
<text x="330" y="273" font-size="10" fill="currentColor" opacity="0.85">Node khong co IP public. Mot chung chi TLS.</text>
</svg>

Bảng đầy đủ:

| | (A) Nối thẳng game node | (B) Qua gateway |
|---|---|---|
| Độ trễ thêm | **0 ms** | +1,0 ms cùng DC · +4,0 ms khác AZ |
| Địa chỉ công khai | **200 IP:port** ra Internet | **1** điểm vào |
| Chứng chỉ TLS | mỗi node tự quản | tập trung ở gateway |
| Chống DDoS | mỗi node tự lo | một chỗ để đặt scrubbing/WAF |
| Đặt sau CDN / anycast | rất khó (địa chỉ động theo pod) | bình thường |
| Deploy game node | **đứt kết nối client** | client không thấy gì |
| Firewall | node phải mở cổng ra ngoài | node chỉ nghe mạng nội bộ |
| Số tiến trình phải vận hành | 200 | 200 + 8 |
| Hợp với | LAN, game nhỏ, UDP thuần độ trễ cực thấp | mọi thứ chạy trên cloud công cộng |

Dòng đáng giá nhất là **"Deploy game node"**: ở (A) địa chỉ node nằm trong ticket và trong socket của client nên thay pod là đứt; ở (B) client chỉ biết gateway, node đổi thì gateway đổi đích luồng chuyển tiếp, socket phía client không hay biết. Đó là thứ mở đường cho mục 3.6. Còn 0,55 % thì trung thực mà nói là rẻ — trừ fighting game rollback (bài 22) nơi từng frame 16,67 ms đáng giá.

### 3.4 Gateway không được giữ state trận — và tiêu chí để biết

Bài 2 gọi đây là **bẫy số 2** và hẹn bài này mổ xẻ. Cám dỗ rất mạnh: gateway *đã* giữ WebSocket, *đã* biết người này ở trận nào — cho nó chạy luôn simulation thì bớt hẳn một chặng mà vẫn có một điểm vào. Tiêu chí phân định chỉ một câu, và nó không nói về hiệu năng:

> **Nếu khởi động lại tiến trình này làm hỏng một trận đang đấu, nó là game node.** Không quan trọng bạn đặt tên file là `gateway.go`.

Áp vào từng thứ gateway có thể giữ:

| Thứ gateway giữ | Mất khi restart thì sao | Kết luận |
|---|---|---|
| Socket TCP/WebSocket | client reconnect 1–2 s, mang theo ticket | **được** |
| Phiên TLS | bắt tay lại | **được** |
| `conn → (player_id, match_id, node)` | dựng lại từ ticket lúc reconnect | **được** |
| Cache `match_id → node` | đọc lại từ Redis | **được** |
| Rate limit counter mỗi kết nối | mất vài giây dữ liệu chống spam | **được** |
| Vị trí/HP/inventory của entity | **trận hỏng** | **cấm** |
| Hàng đợi input chưa xử lý | thiếu tick, sai lệch mô phỏng | **cấm** |
| Snapshot gần nhất để làm delta (bài 25) | client không giải nén được delta | **cấm** |

Ba dòng cuối *có vẻ* thuộc tầng mạng — đặc biệt delta compression: nén là chuyện đường truyền mà. Nhưng baseline là **state** gắn với tiến trình đang mô phỏng; đặt ở gateway là mất quyền restart tự do. Mọi thứ được phép giữ đều nhỏ; với 40.000 kết nối:

```
40.000 x 64 B  = 2,56 MB   bang conn -> (match_id, node)
40.000 x 8 KB  = 328 MB    buffer doc/ghi socket (phan that su ton RAM)
```

Bảng định tuyến chỉ **2,56 MB**. Cái ăn RAM của gateway là buffer socket, không phải state — dấu hiệu của gateway làm đúng việc: RAM tỉ lệ với **số kết nối**, không tỉ lệ với **nội dung trận đấu**.

Hệ quả gói trong một phép so sánh: deploy gateway **sạch state** là 40.000 kết nối reconnect trong 1–2 giây và **0 trận chết**; deploy gateway **giữ state trận** là **4.000 trận chết**. Reconnect là một cú giật hình; trận bị xoá là một người chơi mất 4 phút. Kèm theo: gateway sạch state thêm/bớt pod tuỳ ý, gateway bẩn không scale độc lập với game node được.

### 3.5 Bảng định tuyến theo `match_id`

**Ai ghi: allocator** — kẻ ra quyết định (bài 2, bước 5) là kẻ duy nhất biết sự thật. Nó ghi vào **Redis** ngay khi cấp phát, **trước** khi ticket tới tay client. Đúng loại việc Redis sinh ra để làm: khoá nhỏ, TTL tự nhiên bằng độ dài trận, ghi hiếm đọc nhiều.

```go
node := pickNode(region, capacity)          // quyet dinh that su o day
rdb.Set(ctx, "route:"+matchID, node.Addr, matchLen+graceWindow)
ticket := sign(Ticket{MatchID: matchID, Player: pid, ...})
// ticket KHONG chua dia chi node — do la khac biet voi kien truc (A)
```

**Ai đọc: gateway.** Đây là chỗ phải tính trước khi viết dòng code nào. Nếu gateway tra Redis **mỗi gói**:

```
40.000 nguoi x 60 goi/s              = 2.400.000 lookup/s
Redis mot instance ~100.000 ops/s    -> can 24 instance CHI de tra bang
do tre them: 0,5 ms moi chieu x 2    = +1,0 ms vao ngan sach 182 ms (0,55%)
```

Hai cách chết khác nhau. Độ trễ: **bạn vừa trả cái giá của gateway một lần nữa** — +2,0 ms thay vì +1,0 ms. Ops/s: 24 instance Redis để làm việc mà một `map` trong RAM làm trong ~100 ns, tức **5.000 lần** chậm hơn — đúng dạng lập luận bài 1 dùng để đuổi DB ra khỏi đường tick, chỉ nhỏ hơn 100 lần.

Nên gateway phải cache. Phản xạ tiếp theo là hỏi "TTL bao nhiêu?" rồi lo cache stale: trận kết thúc với nhịp `4.000 / (8 × 60) = 8,33 trận/giây`, nên cửa sổ TTL 60 giây chứa tối đa 500 entry đã chết — 12,5 % bảng. Con số đó **không có ý nghĩa gì**, vì câu hỏi đặt sai:

> **`match_id → node` là bất biến trong suốt vòng đời của trận.** Trận không di cư. Không có handoff. Node giữ nó từ lúc sinh tới lúc chết.

Một entry chỉ có hai trạng thái: **đúng**, hoặc **thuộc về trận không còn tồn tại**. Không bao giờ có "trỏ sang node sai", mà entry của trận đã chết thì cũng không ai gửi gói tới. Cache ở đây **không phải đánh đổi nhất quán**, chỉ là chuyện dọn rác:

```
cache miss           -> doc Redis 1 lan, nho lai
node tra "unknown"   -> xoa entry, doc lai Redis, thu lai 1 lan
tran ket thuc        -> node bao gateway, gateway xoa entry
TTL                  -> do dai tran toi da + le, chi de don rac
```

Tần suất đọc rơi từ "mỗi gói" xuống "mỗi kết nối mới":

```
ket noi moi/s = 40.000 / (8 x 60) = 83,3 /s
2.400.000 / 83,3                  = giam 28.800 lan
ti le doc : ghi = 2.400.000 : 8,33 = 288.000 : 1
```

Tỉ lệ `288.000 : 1` cũng là lý do Redis chết mà trận đang chạy vẫn chạy (đúng dòng "Redis" trong bảng cô lập lỗi bài 2): 99,9997 % lượt tra cứu không tới Redis. *(~100.000 ops/s một instance là bậc độ lớn cho lệnh nhỏ trên phần cứng phổ thông.)*

Bài 32 phá đúng giả định "trận không di cư" khi một trận quá đông phải cắt sang nhiều node — lúc đó cache mới thành bài toán nhất quán.

---

## ⏸ Dừng lại — đoán trước #3

Quay lại sự cố mục 2 để sửa. Node stateful không được `SIGTERM` rồi chết — nó phải **drain**: ngừng nhận trận mới, chờ trận hiện tại xong. Trận dài **8 phút**, fleet **200 node**, mỗi node 20 trận, đang chạy đúng công suất.

**Thời gian drain tệ nhất của MỘT node là bao nhiêu, và để deploy cả 200 node mà không giảm sức chứa thì bạn phải mua thêm bao nhiêu node?**

```
(a) Drain ~4 phut (trung binh), khong can node du — cac node khac ganh duoc
(b) Drain 8 phut, can du dung so node drain song song cung luc
(c) Drain 8 phut, khong can du vi node dang drain van con cho trong
(d) Drain khong the co gioi han tren
```

---

### 3.6 Drain: quy trình, thời gian, và số node phải mua thêm

Đáp án là **(b)**, với một cảnh báo về (d) ở cuối mục.

**Tệ nhất là 8 phút, không phải 4 phút.** Trung bình một trận đã chạy 4 phút, nhưng bạn chờ trận *cuối cùng*, và có thể có trận vừa bắt đầu 1 giây trước khi cờ drain bật. Drain là bài toán **max**, không phải **mean** — cùng nhầm lẫn với đọc p50 thay vì p99 ở bài 8.

<svg viewBox="0 0 720 240" role="img" aria-labelledby="gs29-b-t gs29-b-d" style="width:100%;height:auto">
<title id="gs29-b-t">Năm trạng thái của một game node khi drain</title>
<desc id="gs29-b-d">Node đi từ trạng thái sẵn sàng sang cordon khi ngừng nhận trận mới, rồi draining khi số trận giảm dần, rồi flush để đẩy kết quả vào hàng đợi bền, rồi thoát. Trục thời gian cho thấy số trận giảm từ hai mươi về không trong tối đa tám phút.</desc>
<rect x="16" y="16" width="128" height="52" rx="8" fill="#84cc16" fill-opacity="0.28"/>
<text x="80" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">1 READY</text>
<text x="80" y="55" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">20 tran · nhan moi</text>
<rect x="160" y="16" width="128" height="52" rx="8" fill="#f59e0b" fill-opacity="0.28"/>
<text x="224" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">2 CORDON</text>
<text x="224" y="55" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">allocator bo qua</text>
<rect x="304" y="16" width="128" height="52" rx="8" fill="#f59e0b" fill-opacity="0.28"/>
<text x="368" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">3 DRAINING</text>
<text x="368" y="55" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">20 → 0, toi da 8 phut</text>
<rect x="448" y="16" width="128" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.28"/>
<text x="512" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">4 FLUSH</text>
<text x="512" y="55" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">ket qua → hang doi</text>
<rect x="592" y="16" width="112" height="52" rx="8" fill="#64748b" fill-opacity="0.28"/>
<text x="648" y="38" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">5 EXIT</text>
<text x="648" y="55" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">code 0</text>
<line x1="144" y1="42" x2="160" y2="42" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="288" y1="42" x2="304" y2="42" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="432" y1="42" x2="448" y2="42" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="576" y1="42" x2="592" y2="42" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="60" y1="200" x2="660" y2="200" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="60" y1="200" x2="60" y2="96" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="46" y="100" text-anchor="end" font-size="9" fill="currentColor" opacity="0.8">20</text>
<text x="46" y="204" text-anchor="end" font-size="9" fill="currentColor" opacity="0.8">0</text>
<text x="30" y="150" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.8">tran</text>
<line x1="60" y1="96" x2="224" y2="96" stroke="#84cc16" stroke-width="3"/>
<line x1="224" y1="96" x2="600" y2="200" stroke="#f59e0b" stroke-width="3"/>
<line x1="600" y1="200" x2="660" y2="200" stroke="#64748b" stroke-width="3"/>
<line x1="224" y1="88" x2="224" y2="208" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="228" y="222" font-size="9" fill="currentColor" opacity="0.85">t=0 bat co drain</text>
<line x1="600" y1="88" x2="600" y2="208" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="596" y="222" text-anchor="end" font-size="9" fill="currentColor" opacity="0.85">t ≤ 8 phut: tran cuoi ket thuc</text>
<text x="300" y="128" font-size="9" font-style="italic" fill="currentColor" opacity="0.9">node van phuc vu day du 20 tran nay — drain KHONG phai degrade</text>
</svg>

1. **CORDON** — node đặt cờ `accepting=false` trong báo cáo sức chứa lên Redis (bài 2, mục ①); allocator bỏ qua nó. Người chơi không nhận tín hiệu gì. Tốn ~1 chu kỳ heartbeat.
2. **DRAINING** — node **vẫn chạy 20 trận ở đầy đủ 60 Hz**. Khác biệt lớn nhất với rolling update: không degrade, không "connection draining" kiểu HTTP; số trận giảm theo nhịp tự nhiên của chúng.
3. **FLUSH** — trận cuối kết thúc, node đẩy kết quả vào hàng đợi bền (bài 2, mục ③) và **chờ ack**. Đây là chỗ duy nhất được phép gọi ra meta plane, và được phép vì không còn trận nào có hạn chót 16,67 ms.
4. **EXIT** — thoát code 0.
5. Và trước tất cả: `terminationGracePeriodSeconds` phải **lớn hơn drain tệ nhất** — trận 8 phút thì `480 + lề`. Mặc định Kubernetes là **30 giây**: làm đúng bốn bước trên mà quên bước này thì node vẫn bị `SIGKILL` ở giây 30, vẫn 4.000 trận chết.

**Bao nhiêu node dư?** Node đang drain vẫn chiếm 20 slot nhưng **không nhận trận mới**, nên mỗi node bị cordon là 20 slot biến khỏi nguồn cung — phải bù đúng bằng số node drain song song `B`:

| B (song song) | Số lượt | Tổng thời gian deploy | Node dư phải mua | Chi phí thêm |
|---|---|---|---|---|
| 10 | 20 | **160 phút** (2 h 40) | 10 | +5 % |
| 20 | 10 | 80 phút | 20 | **+10 %** |
| 40 | 5 | 40 phút | 40 | +20 % |
| 50 | 4 | 32 phút | 50 | +25 % |
| 200 | 1 | **8 phút** (sàn tuyệt đối) | 200 | **+100 %** |

*(Mô hình bảo thủ: mỗi lượt chờ trọn 8 phút mới bắt đầu lượt sau. Cho lượt sau khởi động ngay khi một node trống thì tổng ngắn hơn, nhưng sàn 8 phút không phá được.)*

**Tốc độ deploy của hệ stateful mua bằng tiền hạ tầng, và sàn cứng là độ dài một trận.** Không cấu hình nào cho bạn deploy 200 node trong 2 phút khi trận dài 8 phút — khác hẳn BE App, nơi tốc độ deploy chỉ phụ thuộc thời gian pull image.

Vì sao **(d) gần đúng**: chế độ không giới hạn thời gian — cờ vua không đồng hồ, MMO zone, sandbox — thì drain **thật sự** không có cận trên. Lúc đó phải có trần cưỡng bức, và trần đó có giá đo được:

| Trần drain | % trận bị giết | Trận / node | Tổng trận bị giết |
|---|---|---|---|
| 0 phút (= rolling update) | 100 % | 20 | **4.000** |
| 2 phút | 75 % | 15 | 3.000 |
| 4 phút | 50 % | 10 | 2.000 |
| 6 phút | 25 % | 5 | 1.000 |
| 8 phút | 0 % | 0 | **0** |

*(Giả định thời điểm bắt đầu các trận phân bố đều — đúng khi nhịp tạo trận ổn định.)*

Hàng đầu chính là sự cố ở mục 2. Trần 6 phút đã cắt 75 % thiệt hại; trần 8 phút xoá sạch.

### 3.7 Đo cái gì

Bốn metric, mỗi cái bắt một dạng hỏng:

| Metric | Ngưỡng lành mạnh | Vượt ngưỡng nghĩa là |
|---|---|---|
| **Tỉ lệ gói định tuyến sai** (node trả `unknown match`) | ~0, tăng vọt ngắn khi trận kết thúc | Cache không được invalidate, hoặc allocator và gateway bất đồng — lỗi nặng nhất trong bài |
| **Độ trễ thêm do gateway**, p50/p99 | p50 ≈ 0,5 ms; **p99 < 2 ms** | Gateway bị CPU-bound hoặc GC (bài 37), hoặc đã lỡ đặt khác AZ |
| **Tuổi entry cache routing** | ≤ độ dài trận tối đa | Rò rỉ entry của trận đã chết — chưa giết ai, nhưng là bug chờ nổ ở bài 32 |
| **Thời gian drain thực tế**, phân phối đầy đủ | max ≤ độ dài trận tối đa | Có trận chạy quá dài (overtime, AFK, bug vòng lặp), và `terminationGracePeriodSeconds` đang tính sai |

Cả hai metric thời gian đọc bằng đuôi phân phối, không phải trung bình — nguyên văn lập luận bài 8. Với gateway: 1 % gói trễ 20 ms là 1 % số lần bắn bị sai. Với drain: trung bình 4 phút không nói gì, bạn cần **max** — đó mới là thứ `terminationGracePeriodSeconds` phải lớn hơn.

---

## 4. Khi nào KHÔNG cần gateway

Gateway là một tầng nữa phải vận hành, một chặng nữa trong ngân sách, một nguồn sự cố nữa. Ba trường hợp nó không đáng:

**① Một node duy nhất.** `M = 1` thì `1/M = 1` — định tuyến ngẫu nhiên *luôn* đúng, toàn bộ mục 3.1 bốc hơi. Game 200 CCU chạy trên một máy: dựng gateway lúc này là dựng tầng chuyển tiếp giữa tiến trình A và tiến trình A. Ngưỡng để bắt đầu nghĩ tới gateway là lúc cần node thứ hai, không sớm hơn.

**② Orchestration đã cấp `IP:port` trực tiếp.** Agones và các hệ tương tự (bài 40) trả địa chỉ thật của game server ngay trong lời đáp cấp phát — allocator, bảng định tuyến và gateway gộp làm một. Đó là kiến trúc (A) có người vận hành hộ: 0 ms thêm, nhưng vẫn tự lo IP node phơi ra Internet, chống DDoS ở tầng node, và TLS nếu client dùng WebSocket.

**③ Mạng kín.** LAN tournament, arcade, playtest nội bộ: một điểm vào, TLS tập trung, giấu IP — vô nghĩa khi không có Internet công cộng.

Ngược lại, gateway gần như bắt buộc khi có **bất kỳ** dấu hiệu nào: client là trình duyệt (bắt buộc WSS, mà cấp chứng chỉ cho 200 pod là cơn ác mộng riêng), game từng bị DDoS, hoặc cần deploy node giờ cao điểm mà không ai nhận ra.

Và một cảnh báo về thứ tự: **đừng dựng gateway để sửa chuyện deploy.** Gateway giữ cho client không đứt kết nối khi node đổi, nhưng **không** cứu trận đang chạy — trận nằm trong RAM của node, gateway không biết gì về nó. Thứ cứu trận là drain, và drain chạy được **không cần gateway**.

---

## 5. Tính tay

**Bài 1.** Đổi sang battle royale: trận **100 người, 25 phút**, một node chịu **4 trận**, vẫn 40.000 CCU.
- Bao nhiêu trận đồng thời, bao nhiêu node? Rolling update giết bao nhiêu trận, bao nhiêu người?
- Drain tệ nhất bao nhiêu, và với ngân sách node dư **+10 %** thì deploy cả fleet mất bao lâu?
- So với trận 8 phút ở mục 2, thời gian deploy đổi mấy lần — và vì sao tỉ số đó không bằng 25/8?

**Bài 2.** Gateway đang tra Redis mỗi gói, 2.400.000 lookup/s. Bạn thêm cache nhưng đặt TTL đúng **1 giây** thay vì bằng độ dài trận.
- Với 40.000 kết nối, số lookup/s bây giờ là bao nhiêu? Giảm mấy lần so với 2.400.000, và cao gấp mấy lần bản cache đúng (83,3 /s)?
- Vẫn cần bao nhiêu instance Redis ở mức 100.000 ops/s?

**Bài 3.** Ngân sách 182 ms. Bạn đặt gateway đúng AZ (+1,0 ms) nhưng quên cache routing (+1,0 ms nữa).
- Tổng mới là bao nhiêu, bằng bao nhiêu phần trăm 182 ms?
- Bài 8 nói hạ interpolation buffer 100 → 50 ms mua được 50 ms miễn phí. Làm cả hai việc thì ngân sách cuối là bao nhiêu?
- Con số cuối đó có biện minh cho việc bỏ qua cache không? Lập luận của bạn sai ở đâu?

---

## 6. Chuyển giao

**Bạn vận hành một MMO thế giới mở.** Không có "trận": người chơi vào thế giới và ở lại **hàng giờ**. Thế giới chia 40 zone, mỗi zone là một tiến trình giữ state trong RAM, người chơi đi bộ từ zone này sang zone khác liên tục.

1. `match_id` ở đây tương ứng với cái gì? Bảng định tuyến khoá theo cái gì, và nó còn **bất biến** nữa không?
2. Người chơi bước qua ranh giới zone: ai cập nhật bảng định tuyến, và giữa lúc zone cũ nhả và zone mới nhận, gói tin của người chơi đi đâu?
3. Giả định "bất biến" đã mất thì quy tắc cache ở mục 3.5 hỏng ở chỗ nào? Bạn sửa bằng TTL, bằng invalidation chủ động, hay cách khác — và cách của bạn sai được bao nhiêu mili giây trước khi người chơi nhận ra?
4. Drain một zone: không có "trận kết thúc" để chờ. Điều kiện dừng của bạn là gì, và nó có thể **không bao giờ** thoả — xử lý ra sao?
5. Zone thủ đô có 3.000 người, zone sa mạc có 12. Deploy cả 40 zone: bạn xếp thứ tự drain thế nào, theo tiêu chí gì?
6. Gateway bắt đầu giữ một thứ trông vô hại: **danh sách bạn bè đang online của từng kết nối**, để bắn thông báo "bạn X vừa vào game". Theo tiêu chí mục 3.4 thì được hay không? Trả lời bằng câu "restart gateway thì cái gì hỏng".
7. **Câu khó nhất:** mục 3.6 chấp nhận trả **+10 % hạ tầng** để deploy trong 80 phút với trận 8 phút. MMO có phiên 4 giờ. Giữ nguyên +10 % node dư thì deploy cả fleet mất bao lâu — và nếu con số đó dài hơn khoảng cách giữa hai lần deploy thì **hệ thống đang ở trạng thái gì**, thoát ra bằng cách nào mà **không** mua thêm node?

---

## 7. Tóm tắt

- Định tuyến ngẫu nhiên trúng chủ sở hữu với xác suất `1/M`: **10 % (M=10), 2 % (M=50), 0,5 % (M=200)**. Một phiên 8 phút là 28.800 gói, nên xác suất phiên đó sống sót ở M=200 là **10^-66270** — round-robin không kém, nó không tồn tại.
- **Sticky session và băm `match_id` đều không cứu.** Modulo 200 → 201 làm **99,5 %** khoá đổi node (3.981/4.000 trận), consistent hashing còn ~0,5 %; nhưng lỗi thật là cả hai đều không biết node nào còn slot — chỉ **allocator** biết.
- Gateway cộng **+1,0 ms** (cùng DC, **0,55 %** của 182 ms) hoặc **+4,0 ms** (khác AZ, 2,20 %) — con số sau xoá gần hết **4,4 ms** mà tick 60→128 Hz mua bằng gấp đôi CPU. **Gateway phải cùng AZ.** Đổi lại 0,55 %: một điểm vào thay vì 200 IP công khai, TLS tập trung, node không nghe Internet, deploy node không đứt kết nối client.
- Tiêu chí phân định duy nhất: **restart tiến trình này có làm hỏng trận đang đấu không.** Gateway được giữ socket, phiên TLS, `conn → (match_id, node)`, cache routing — **2,56 MB** cho 40.000 kết nối; cấm state entity, hàng đợi input, baseline delta. Sạch state: deploy = **40.000 reconnect, 0 trận chết**; bẩn: **4.000 trận chết**.
- **Allocator ghi** bảng định tuyến vào Redis, **gateway đọc**. Tra mỗi gói = **2.400.000 lookup/s**, cần **24 instance**, cộng thêm **1,0 ms**, chậm hơn `map` RAM **5.000 lần**. Cache **không phải đánh đổi nhất quán** vì `match_id → node` **bất biến trong vòng đời trận**: nó kéo tra cứu xuống **83,3 /s, giảm 28.800 lần**, tỉ lệ đọc:ghi **288.000 : 1**. Bài 32 phá giả định này.
- Drain: **CORDON → DRAINING → FLUSH → EXIT**, cộng `terminationGracePeriodSeconds` lớn hơn drain tệ nhất — mặc định Kubernetes **30 giây** và nó sẽ `SIGKILL` bạn. Tệ nhất là **trọn độ dài trận (8 phút)**, bài toán max chứ không phải mean; node đang drain vẫn chạy đủ 20 trận ở 60 Hz.
- Tốc độ deploy mua bằng tiền: **+10 % node dư → 80 phút**, +25 % → 32 phút, +100 % → 8 phút, **sàn cứng bằng độ dài một trận**. Trần drain cưỡng bức: 6 phút giết 25 % trận, 4 phút giết 50 %, rolling update là trần 0 phút — **100 %, 4.000 trận**.
- **Không cần gateway khi** một node duy nhất, orchestration đã cấp `IP:port` trực tiếp (bài 40), hoặc mạng kín. Và **đừng dựng gateway để sửa chuyện deploy** — thứ cứu trận đang chạy là drain, chạy được mà không cần gateway.

→ **Bài 30 — Matchmaking**: biết gửi người chơi tới đâu rồi. Bài sau hỏi câu trước đó: ghép ai với ai, và vì sao chờ lâu hơn đôi khi lại là trận đấu tệ hơn.
