# Case study: Web Crawler

Nhìn từ xa, web crawler (trình thu thập dữ liệu web, còn gọi là *spider*) là bài toán dễ đến mức đáng ngờ: lấy một URL khỏi hàng đợi, tải HTML, moi các thẻ `<a href>`, đẩy ngược vào hàng đợi, lặp lại. Bốn dòng pseudo-code. Nhưng đúng cái vòng lặp đó, khi chạy ở quy mô một tỉ trang mỗi tháng, sẽ vỡ theo nhiều hướng — và gần như không hướng nào liên quan đến việc parse HTML.

Nó vỡ vì hàng đợi FIFO thuần dồn hàng trăm request vào đúng một máy chủ trong vài giây và bạn bị chặn IP. Vỡ vì web là đồ thị có chu trình, không có bộ nhớ "đã thấy URL này chưa" thì crawler tải lại cùng một trang vô số lần — mà bộ nhớ đó, ở quy mô mười tỉ URL, **không vừa RAM** nếu lưu nguyên chuỗi. Vỡ vì DNS — một lời gọi đồng bộ 50–200 ms mà không ai để ý — thành nút cổ chai lớn hơn cả băng thông. Vỡ vì có website sinh URL vô hạn một cách hợp lệ (`/calendar?month=1,2,3…` đến năm 9999). Vỡ vì ~30% nội dung tải về là bản trùng. Và vỡ vì ngày càng nhiều trang chỉ có nội dung sau khi JavaScript chạy xong.

> 💡 **Luận điểm xuyên suốt**: web crawler không phải bài toán *tải file*, mà là bài toán **quản lý một hàng đợi khổng lồ dưới ba ràng buộc kéo nhau về ba hướng** — lịch sự với máy chủ người khác (politeness), ưu tiên đúng thứ đáng tải (priority), và giữ dữ liệu tươi (freshness). Toàn bộ độ khó nằm ở chỗ hoà giải ba thứ đó. Phần còn lại là kỹ thuật đã biết cách làm.

---

## 1. Làm rõ yêu cầu

Câu hỏi đầu tiên không phải "quy mô bao nhiêu" mà **"crawler này để làm gì"**, vì mục đích quyết định gần như mọi trade-off:

| Mục đích | Quan trọng nhất | Hi sinh được |
|---|---|---|
| **Search engine indexing** (Googlebot) | Độ phủ + độ tươi của trang quan trọng | Không cần giữ HTML gốc lâu |
| **Web archiving** (Internet Archive) | Lưu nguyên vẹn, có cả ảnh/CSS/JS | Độ tươi — crawl một lần là xong |
| **Web monitoring** (vi phạm bản quyền) | Phát hiện **thay đổi** nhanh | Độ phủ toàn web |
| **Price scraping** | Tần suất rất cao trên ít domain | Politeness — và đó là lý do hay bị chặn |

Bài này chọn kịch bản kinh điển: **crawler phục vụ search engine indexing**, vì nó đòi hỏi cả bốn tính chất khó cùng lúc.

**Yêu cầu chức năng.** (1) Nhận tập **seed URL**, duyệt theo liên kết, tải **HTML** — bỏ qua ảnh/video/PDF giai đoạn 1 nhưng kiến trúc phải mở rộng được. (2) Trích liên kết và đưa trở lại vòng lặp. (3) Không tải trùng URL, không lưu trùng nội dung. (4) Phát hiện trang mới **và trang đã thay đổi** — tức phải crawl lại theo chu kỳ. (5) Tuân thủ `robots.txt`. (6) Lưu nội dung 5 năm cho tầng indexing phía sau.

**Yêu cầu phi chức năng** — bốn tính chất quen thuộc, nhưng mỗi cái có nghĩa kỹ thuật rất cụ thể:

- **Scalability** — hàng nghìn tỉ URL, bắt buộc song song nhiều máy; điều đó lập tức đặt ra câu hỏi state chung (URL đã thấy, hàng đợi) chia thế nào.
- **Politeness** — không phải phép xã giao: crawler thô bạo thực chất đang DDoS vô tình, hậu quả là IP bị chặn, ASN bị blacklist, hoặc kiện tụng.
- **Robustness** — HTML hỏng, server trả 500, server treo không đóng connection, vòng lặp redirect. Phải chạy hàng tháng không cần người can thiệp.
- **Extensibility** — mai muốn thêm ảnh, sang năm thêm module giám sát bản quyền. Nếu phải viết lại lõi thì thiết kế sai.

**Giả định chốt**: 1 tỉ trang/tháng; trang trung bình **500 KB** HTML thô; nén gzip ~5×; ~60 link/trang; lưu 5 năm; ~30% nội dung toàn web là bản trùng; peak/average = 2× (crawler tự điều tiết được nên hệ số thấp hơn hệ thống hướng người dùng).

---

## 2. Back-of-envelope estimation

Mỗi con số dưới đây **loại bỏ một phương án thiết kế** — đó mới là lý do phải tính.

### 2.1 QPS

```
1e9 trang / (30 × 24 × 3600 = 2,592e6 giây) ≈ 386  →  400 trang/giây
đỉnh ≈ 2 × 400                              =  800 trang/giây
```

400/giây nghe **nhỏ** — một API server tầm thường làm được. Đó là cái bẫy nhận thức đầu tiên: QPS không phản ánh độ khó, vì mỗi "request" ở đây đi ra **Internet công cộng**, tới máy chủ bạn không kiểm soát, với độ trễ đuôi tính bằng giây.

### 2.2 Kết nối đồng thời — con số thật sự định hình kiến trúc

Định luật Little (`concurrency = throughput × latency`), với fetch trung vị ~1 s, p95 ~4 s, timeout 10 s:

```
concurrency ≈ 400/s × ~2 s   ≈   800 kết nối đang mở
đỉnh        ≈ 800/s × ~2 s   ≈ 1.600 kết nối
```

**Hệ quả 1**: mô hình "một thread một request, block chờ I/O" cần ~1.600 thread — 1,6 GB RAM chỉ để *chờ*, cộng chi phí context switch. Crawler bắt buộc dùng **I/O bất đồng bộ** (epoll/kqueue, async/await). Đó là lý do mọi crawler thật (Heritrix, Nutch, Scrapy) đều là event-loop hoặc actor.

### 2.3 Băng thông

```
400/s × 500 KB = 200 MB/s = 1,6 Gbps   ·   đỉnh 400 MB/s = 3,2 Gbps
```

**Hệ quả 2**: dữ liệu vào từ Internet miễn phí, nhưng nếu crawler nằm trong private subnet và đi qua **NAT Gateway** thì mỗi GB tính tiền: 200 MB/s ≈ 518 TB/tháng × $0,045/GB ≈ **$23.000/tháng chỉ riêng phí NAT**. Con số này một mình quyết định kiến trúc mạng — đặt downloader ở public subnet, chứ không mặc định nhét vào private subnet như mọi service khác.

### 2.4 Storage — chỗ con số gây sốc

```
Thô:                1e9 × 500 KB       = 500 TB/tháng  →  30 PB (5 năm)
Bỏ ~30% trùng:      1e9 × 0,7 × 500 KB = 350 TB/tháng
Nén ~5×:            350 / 5            =  70 TB/tháng  →  4,2 PB (5 năm)
```

**Hệ quả 3**: khoảng cách 30 PB → 4,2 PB là **hơn 7 lần**, đến từ hai quyết định gần như miễn phí về kỹ thuật (khử trùng + nén). Ở giá S3: 30 PB Standard ≈ $690.000/tháng; 4,2 PB chia tầng (Standard cho tháng gần nhất, phần còn lại Glacier Deep Archive) rơi xuống ~**$5.000–10.000/tháng**. Không tính thì bạn không bao giờ thấy "content-seen" — một hộp nghe có vẻ phụ — chính là thứ tiết kiệm hàng trăm nghìn đô mỗi tháng.

### 2.5 URL — quy mô của bài toán "đã thấy chưa"

```
Link trích được:  400/s × 60 = 24.000 URL/s   (chỉ ~1–5% là thật sự mới)
Tập URL đã thấy sau 5 năm: cỡ 10 tỉ
Nếu lưu bằng hash set chuỗi: 10e9 × ~120 byte ≈ 1,2 TB RAM
```

**Hệ quả 4**: 1,2 TB RAM không khả thi. Đây chính là con số sinh ra **Bloom filter** (§7.2): cùng 10 tỉ phần tử với tỉ lệ dương tính giả 1% chỉ tốn ~12 GB — **giảm 100 lần**, vừa một node. Không có phép tính này, Bloom filter chỉ là thuật ngữ để khoe; có nó thì đó là kết luận bắt buộc.

### 2.6 Frontier

Ở trạng thái ổn định, số URL đã biết nhưng chưa tải luôn lớn hơn số đã tải, vì mỗi trang sinh nhiều link hơn một:

```
1 tỉ URL đang chờ × ~120 byte (URL + priority, host, depth, discovered_at) ≈ 120 GB
```

**Hệ quả 5**: frontier **không vừa RAM**, nhưng cũng không nên nằm hoàn toàn trên disk (random read ở độ trễ đuôi sẽ bóp throughput). Kết luận: cấu trúc **lai RAM + disk** (§6.4).

### 2.7 DNS — nút thắt vô hình

```
Không cache: 400 lookup/s × 30–200 ms
Nhưng 1 tỉ trang chỉ nằm trên ~10–50 triệu domain → trúng cache > 95%
```

**Hệ quả 6**: cache biến 400 lookup/s thành ~20. Quan trọng hơn: `getaddrinfo` của libc **đồng bộ và block cả thread**, nên trong kiến trúc event-loop một lời gọi DNS chậm đóng băng cả downloader (§8.1).

### 2.8 Hệ quả cuối — ràng buộc ép ra hình dạng của frontier

Nếu quy tắc lịch sự là **1 request/giây/host**, thì để đạt 400 trang/giây crawler bắt buộc phải đang làm việc với **ít nhất 400 host khác nhau đồng thời**; delay 2 giây thì cần 800 host. Đây là ràng buộc toán học, không phải lựa chọn — và là lý do sâu xa khiến một FIFO duy nhất **không thể** hoạt động, bất kể cài đặt tốt đến đâu.

---

## 3. API / giao diện tối giản

Crawler không hướng người dùng, nên "API" ở đây là **hợp đồng giữa các khối** cộng một control plane nhỏ:

```
URL Frontier:
frontier.add(url, priority, discovered_from, depth)   -> void
frontier.next(worker_id)                              -> {url, host, priority} | EMPTY
frontier.ack(url, status, fetched_at, next_recrawl)   -> void
frontier.nack(url, reason, retry_after)               -> void

url_seen.check_and_add(normalized_url)    -> bool   # true = ĐÃ thấy (có thể sai dương)
content_seen.check_and_add(content_hash)  -> bool
downloader.fetch(url) -> {status, headers, body, final_url, elapsed_ms}
store.put(url_hash, raw_html, metadata)   -> object_key

Control plane cho người vận hành:
POST /v1/seeds                 {urls: [...], priority: high}
GET  /v1/stats                 -> {pages_per_sec, frontier_size, error_rate_by_host}
POST /v1/blocklist             {pattern: "*.example.com/calendar*"}
POST /v1/hosts/{host}/rate     {rps: 0.2}
```

Ba chi tiết đáng chú ý. `next()` và `ack()` **tách rời** — đúng mô hình visibility timeout của message queue: URL giao cho worker biến mất tạm thời, worker chết mà không `ack` thì URL tự quay lại; không có cơ chế này thì mỗi lần một máy chết là mất vĩnh viễn vài nghìn URL. `check_and_add` phải **nguyên tử**: với 24.000 URL/s từ hàng chục máy, khe hở giữa `check` và `add` đủ để hai worker cùng quyết định tải một URL. Và endpoint chỉnh rate theo host nghe tầm thường nhưng **luôn cần trong vận hành thật** — sẽ có lúc quản trị viên một website gửi email phàn nàn và bạn cần nút giảm tốc trong 30 giây mà không deploy lại.

---

## 4. High-level design

```
   ┌──────────┐
   │Seed URLs │ chọn theo địa lý / chủ đề / độ phổ biến
   └────┬─────┘
        ▼
 ╔═══════════════════════════════════════╗
 ║           URL FRONTIER                ║◄───────────────────┐
 ║ front queues (priority) → back queues ║                    │
 ║              (politeness: 1 host/hàng)║                    │
 ╚══════════════┬════════════════════════╝                    │
                ▼ next(url)                                   │
     ┌─────────────────────┐    ┌──────────────┐              │
     │  HTML DOWNLOADER    │◄──►│ DNS resolver │              │
     │ async I/O · timeout │    │  + DNS cache │              │
     │ retry · gzip        │◄──►│ robots cache │              │
     └──────────┬──────────┘    └──────────────┘              │
                ▼ HTML thô                                    │
     ┌─────────────────────┐                                  │
     │   CONTENT PARSER    │ loại trang lỗi/rác; trích text,  │
     └──────────┬──────────┘ title, lang, canonical           │
                ▼                                             │
     ┌─────────────────────┐   đã có    ┌──────────────────┐  │
     │   CONTENT SEEN?     │───────────►│ content hash set │  │
     └──────────┬──────────┘   → bỏ     └──────────────────┘  │
                ▼ nội dung mới                                │
     ┌─────────────────────┐            ┌──────────────────┐  │
     │  CONTENT STORAGE    │───────────►│  S3 / HDFS       │  │
     └──────────┬──────────┘            └──────────────────┘  │
                ▼                                             │
     ┌─────────────────────┐                                  │
     │   LINK EXTRACTOR    │ <a href> → URL tuyệt đối         │
     └──────────┬──────────┘                                  │
                ▼                                             │
     ┌─────────────────────┐ bỏ đuôi file không cần,          │
     │     URL FILTER      │ blocklist, URL sai/quá dài       │
     └──────────┬──────────┘                                  │
                ▼                                             │
     ┌─────────────────────┐   đã có    ┌──────────────────┐  │
     │     URL SEEN?       │───────────►│  Bloom filter    │  │
     └──────────┬──────────┘   → bỏ     │  + URL storage   │  │
                │ URL mới               └──────────────────┘  │
                └──────────────────────────────────────────────┘
```

Khi trình bày sơ đồ này, điều quan trọng không phải đọc tên từng hộp mà là chỉ ra **mỗi hộp chữa một cách hỏng cụ thể** của vòng lặp bốn dòng ban đầu:

| Khối | Nếu thiếu thì hỏng thế nào |
|---|---|
| **Seed URLs** | Không có điểm bắt đầu, hoặc bắt đầu ở góc chết của web |
| **URL Frontier** | Không politeness, không ưu tiên, không khôi phục sau crash |
| **DNS resolver + cache** | DNS thành nút thắt; một domain chậm treo cả event loop |
| **Content Parser** | HTML hỏng làm crash worker; soft-404 bị lưu như nội dung thật |
| **Content Seen?** | 30% storage bị đốt cho bản trùng; index nhiễu |
| **URL Filter** | Đi tải file `.zip` 2 GB hoặc lạc vào vùng cấm |
| **URL Seen?** | Vòng lặp vô hạn trên đồ thị có chu trình — lỗi chí mạng số một |
| **URL Storage** | Mất tiến độ khi restart; không xác nhận lại được dương tính giả |

**Luồng chạy**: nạp seed → `frontier.next()` → tra `robots.txt` trong cache (bị cấm thì `ack` là `disallowed`) → phân giải DNS qua cache → tải HTML với timeout cứng và `Accept-Encoding: gzip` → parser kiểm tra content-type, encoding, tính hợp lệ → content-seen bằng hash nội dung đã chuẩn hoá → lưu storage → trích link, biến URL tương đối thành tuyệt đối theo URL **cuối cùng sau redirect** → lọc → URL-seen → `frontier.add()` cho URL mới → `ack` kèm lịch recrawl.

**Chọn seed thế nào.** Seed quyết định crawler tới được phần nào của web, vì phần lớn web chỉ tới được qua chuỗi link. Chọn trang có **out-degree cao và uy tín** (trang chủ báo lớn, thư mục, Wikipedia, danh sách domain phổ biến kiểu Tranco), rồi phủ theo **hai chiều**: địa lý/ngôn ngữ (web mỗi nước là một cụm khá tách biệt nên mỗi quốc gia cần tập seed riêng) và chủ đề. Seed quá hẹp thì crawler dành toàn bộ ngân sách quanh một cụm và không bao giờ chạm phần còn lại.

---

## 5. Deep dive 1 — BFS, DFS, và vì sao BFS thuần vẫn hỏng

Trang là đỉnh, hyperlink là cạnh có hướng; crawl chính là duyệt đồ thị.

| | DFS | BFS |
|---|---|---|
| Cấu trúc | Stack (LIFO) | Queue (FIFO) |
| Độ sâu | **Có thể vô hạn** — web không có đáy | Kiểm soát bằng `max_depth` |
| Bộ nhớ | Nhỏ | Lớn (chiều rộng tăng theo cấp số nhân) |
| Quan hệ với chất lượng | Càng sâu càng ít giá trị | Gần seed thường quan trọng hơn |

Lý do thật sự bỏ DFS: **web không có đáy**. Chuỗi "bài liên quan → bài liên quan → …" dài vô tận mà không quay lại, nên DFS tiêu hết ngân sách cho một nhánh — có thể là nhánh rác — và không bao giờ chạm 99,99% còn lại; thêm nữa link trong một trang phần lớn trỏ **cùng domain** nên DFS tự nhiên vi phạm politeness nặng nhất. BFS thì có tính chất quý: **khoảng cách tới seed tương quan khá tốt với tầm quan trọng** (trang chủ ở độ sâu 0–1, bài chính ở 2–3, độ sâu 8 thường là trang lọc/phân trang ít giá trị), nên `max_depth` vừa là biện pháp an toàn vừa là bộ lọc chất lượng thô.

Nhưng **BFS với một FIFO duy nhất vẫn hỏng**, vì hai lý do.

**Lý do 1 — impoliteness.** Crawler tải trang chủ `wikipedia.org`; trang đó có ~300 link và gần như toàn bộ trỏ nội bộ. Với FIFO thuần, 300 URL đó nằm cạnh nhau; khi 300 worker cùng rút ra, cả 300 request đập vào Wikipedia trong cùng một khoảnh khắc:

```
queue: [wiki/A, wiki/B, wiki/C, …(300 URL cùng host)…, news.com/x]
        └────────── 300 request đồng thời vào 1 host ──────────┘
kết quả: 429 → 403 → IP bị chặn
```

Đây không phải trường hợp hiếm mà là **hành vi mặc định** của BFS trên web, vì web có tính cụm rất mạnh. Nói cách khác, FIFO thuần *bảo đảm* vi phạm politeness chứ không phải *có thể*.

**Lý do 2 — không có ưu tiên.** FIFO coi mọi URL bằng nhau, nhưng trang chủ `nytimes.com` và `blog-nao-do.wordpress.com/2009/tag/abc?page=47` không cùng giá trị. Ngân sách crawl hữu hạn; tiêu nó theo thứ tự ngẫu nhiên nghĩa là index đầy rác trước khi có nội dung tốt.

> ⚠️ **Bẫy phỏng vấn**: nói "dùng BFS" rồi dừng. Câu trả lời tốt: *"BFS là hướng đúng, nhưng một FIFO duy nhất hỏng vì nó dồn request vào một host và không biết ưu tiên. Cả hai được chữa bên trong URL frontier — component khó nhất của bài này."*

---

## 6. Deep dive 2 — URL Frontier: trái tim của crawler

Frontier phải làm bốn việc mâu thuẫn: **ưu tiên**, **lịch sự**, **tươi**, và **bền**. Cách giải kinh điển là tách thành **hai tầng hàng đợi**, mỗi tầng lo một mối quan tâm.

### 6.1 Back queues — politeness

Ý tưởng cốt lõi: **mỗi hàng đợi chỉ chứa URL của đúng một host, và mỗi worker gắn chặt với đúng một hàng đợi**. Khi đó "không hai request đồng thời vào cùng một host" đúng **theo cấu trúc** — không cần khoá, không cần phối hợp giữa các worker.

```
              URL từ front queues
                      ▼
            ┌──────────────────┐      ┌────────────────────┐
            │   QUEUE ROUTER   │◄────►│   MAPPING TABLE    │
            │ đọc host của URL │      │ wikipedia.org → b1 │
            └────────┬─────────┘      │ nytimes.com   → b2 │
                     │                └────────────────────┘
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
     ┌─────┐      ┌─────┐      ┌─────┐      ┌─────┐
     │ b1  │      │ b2  │      │ b3  │ ···  │ bn  │  FIFO, 1 host/hàng
     └──┬──┘      └──┬──┘      └──┬──┘      └──┬──┘
   ┌────▼────────────▼────────────▼────────────▼────┐
   │   QUEUE SELECTOR — chọn hàng "đã tới giờ"      │
   │            (now ≥ next_allowed_at)             │
   └────┬────────────┬────────────┬────────────┬────┘
        ▼            ▼            ▼            ▼
    worker 1     worker 2     worker 3  ···  worker n
    (tải tuần tự, nghỉ delay giữa 2 request cùng host)
```

Ba chi tiết dễ bị bỏ qua:

**(a) `delay` tính thế nào.** Cách ngây thơ là hằng số 1 giây/host. Cách đúng hơn là **tỉ lệ với thời gian phản hồi của chính host đó**: `delay = k × thời_gian_tải_lần_trước` với `k ≈ 10`. Máy chủ nhanh (100 ms) chịu được 1 req/giây; máy chủ yếu (3 giây) chỉ nên nhận 1 req mỗi 30 giây. Quy tắc này tự thích nghi và là cách Mercator/Heritrix làm. Nếu `robots.txt` khai `Crawl-delay`, lấy giá trị **lớn hơn** giữa hai nguồn.

**(b) "Một host" nghĩa là gì.** Politeness đúng ra là theo **địa chỉ IP**: hàng nghìn domain shared-hosting nằm trên cùng một máy, lịch sự với từng domain riêng lẻ vẫn là 1.000 req/giây vào một máy. Nhưng IP thay đổi, và với CDN thì nhiều site lớn dùng chung IP Cloudflare nên gom theo IP lại quá bảo thủ. Thoả hiệp thực tế: gom theo **registered domain (eTLD+1)** kèm danh sách ngoại lệ cho CDN lớn.

**(c) Số back queue quyết định throughput.** Với delay 1 giây cần ≥ 400 back queue *đang hoạt động*; thực tế nên dư nhiều (vài nghìn đến vài chục nghìn) vì phần lớn queue tại một thời điểm đang nghỉ. Quá ít queue thì worker **ngồi không chờ delay** và throughput sụp — triệu chứng rất hay gặp mà nhìn CPU/băng thông không thấy gì bất thường.

### 6.2 Front queues — priority

```
              URL mới (đã qua filter)
                      ▼
             ┌─────────────────┐  điểm ưu tiên: PageRank, traffic,
             │   PRIORITIZER   │  độ sâu, tần suất đổi, domain trust
             └────────┬────────┘
        ┌──────┬──────┴──────┬──────┐
        ▼      ▼             ▼      ▼
     ┌────┐ ┌────┐        ┌────┐ ┌────┐
     │ f1 │ │ f2 │        │ f3 │ │ fn │   f1 = ưu tiên cao nhất
     └──┬─┘ └──┬─┘        └──┬─┘ └──┬─┘
        └──────┴──────┬──────┴──────┘
                      ▼
          ┌───────────────────────┐  chọn NGẪU NHIÊN CÓ THIÊN VỊ
          │    QUEUE SELECTOR     │  (vd f1:f2:f3:f4 = 8:4:2:1)
          └───────────┬───────────┘
                      ▼  xuống back queues
```

Điểm tinh tế nhất: selector chọn **ngẫu nhiên có thiên vị**, không phải "luôn lấy ưu tiên cao nhất trước". Lý do là **starvation**: với ưu tiên tuyệt đối, `fn` sẽ không bao giờ được phục vụ khi `f1` còn URL — mà trên web `f1` gần như không bao giờ cạn. Trọng số cho phép trang quan trọng đi trước **nhưng vẫn bảo đảm mọi thứ cuối cùng đều được tải**.

Điểm ưu tiên lấy từ đâu, xếp theo mức dễ có:

| Tín hiệu | Nguồn | Mạnh yếu |
|---|---|---|
| Độ sâu từ seed | Có sẵn, miễn phí | Yếu nhưng rẻ, luôn nên dùng |
| In-degree / PageRank / TrustRank | Job offline theo lô trên dữ liệu crawl | Mạnh nhất, nhưng chậm và tốn |
| Lưu lượng truy cập thật | Log tìm kiếm, toolbar, DNS | Mạnh nhất thực tế — Google có, bạn thì không |
| Kiểu URL (pattern) | Heuristic thủ công | Rẻ và hiệu quả: hạ điểm mọi URL có `?sort=`, `?page=`, `/tag/` |

> 💡 **Hai tầng, hai câu hỏi**: front queue quyết định **cái gì được tải trước**, back queue quyết định **khi nào được phép tải**. Tách bạch được hai câu này là toàn bộ thiết kế frontier; gộp chúng là chỗ hầu hết thiết kế tự chế thất bại.

### 6.3 Freshness — crawl lại thế nào cho đúng

Với search engine, **index cũ là index sai**: giá đã đổi, bài đã sửa, trang đã bị xoá. Nhưng crawl lại tất cả mỗi ngày thì nhân ngân sách lên 30 lần. Quan sát then chốt: **tần suất thay đổi chênh nhau hàng nghìn lần** — trang chủ báo đổi 50 lần/ngày, bài blog năm 2011 không bao giờ đổi nữa. Nên chiến lược đúng là **recrawl thích nghi**:

```
Sau mỗi lần crawl lại:
  nội dung ĐỔI:       interval = max(interval / 2,   1 giờ)
  nội dung KHÔNG đổi: interval = min(interval × 1,5, 30 ngày)
  interval cuối = interval / trọng_số_quan_trọng
```

Chu kỳ cố định thì đơn giản nhưng phí với trang tĩnh và quá chậm với trang động; chỉ theo tầm quan trọng thì bỏ rơi long tail; công thức trên kết hợp cả hai, đổi lại có nhiều tham số phải chỉnh. Hai mẹo tiết kiệm băng thông rất lớn: **conditional GET** (`If-Modified-Since` / `If-None-Match`) — response `304` tốn ~300 byte thay vì 500 KB, tức **rẻ hơn 1.700 lần**, và nếu 70% lần recrawl trả 304 thì băng thông recrawl gần như biến mất; và **`sitemap.xml` có `lastmod`** — đọc một file 5 MB rẻ hơn thăm dò từng URL, dù nên hoài nghi vì nhiều CMS đặt `lastmod` bằng thời gian hiện tại cho mọi trang.

> ⚠️ **Bẫy**: đo "trang có đổi không" bằng hash toàn bộ HTML. Hầu hết trang có timestamp, quảng cáo xoay vòng, CSRF token — nên **mọi lần tải đều ra hash khác**, crawler kết luận "trang này đổi liên tục" rồi crawl nó mỗi giờ mãi mãi. Phải hash **phần nội dung chính đã chuẩn hoá** (§7.1).

### 6.4 Lưu frontier: lai RAM + disk

```
Mỗi back queue:
  ┌─────────── RAM ───────────┐   ┌───── DISK / DB ─────┐
  │ buffer đầu (vài nghìn URL)│◄──│  phần thân hàng đợi │
  │ buffer cuối(vài nghìn URL)│──►│  (ghi lô, tuần tự)  │
  └───────────────────────────┘   └─────────────────────┘
       worker đọc từ đây            nạp lại khi buffer đầu cạn
```

Phần lớn thao tác chạm RAM; disk chỉ nhận **I/O tuần tự theo lô** — kiểu truy cập rẻ nhất. Khi crash chỉ mất phần chưa flush, và phần đó sẽ được phát hiện lại từ một trang khác trong vòng crawl sau. Nếu dùng hạ tầng có sẵn thay vì tự viết: một **message queue bền vững** (Kafka/SQS) làm phần thân cộng bảng KV `host → next_allowed_at` làm lớp politeness — đánh đổi bàn ở §11.4.

---

## 7. Deep dive 3 — Khử trùng lặp: hai bài toán khác nhau bị gọi cùng một tên

Có **hai** câu hỏi "đã thấy chưa", và gộp chúng là lỗi thiết kế phổ biến:

- **URL-seen?** — *"Đã từng tải URL này chưa?"* Hỏi **trước** khi tải, để tránh vòng lặp vô hạn. Quy mô **10 tỉ**, cần cực nhanh và cực gọn.
- **Content-seen?** — *"Nội dung này đã lưu ở đâu chưa?"* Hỏi **sau** khi tải, để tiết kiệm storage và làm sạch index. Quy mô nhỏ hơn, chậm hơn được nhưng cần chính xác hơn.

### 7.1 Content-seen — hash, nhưng hash cái gì mới là vấn đề

So từng byte với một tỉ trang cũ là không tưởng, nên rút mỗi trang thành một **checksum**. Với 1 tỉ mục và hash 64 bit, xác suất có va chạm (nghịch lý ngày sinh) là `n²/(2·2⁶⁴) ≈ 2,7%` — nghe nhỏ, nhưng mỗi va chạm là **một trang thật bị vứt vĩnh viễn mà không ai biết**, và ở 10 tỉ mục thì gần như chắc chắn xảy ra. Nên dùng hash **128 bit** (MD5 cắt gọn, hoặc xxHash128/BLAKE3 — nhanh hơn nhiều và không cần tính chất mật mã ở đây): `1e9 × 16 byte = 16 GB`, cộng overhead ~2–3× → 40–50 GB, shard vài node là xong.

**Hash cái gì** mới quyết định hiệu quả. Hash HTML thô gần như vô dụng: hai bản sao của cùng một bài hiếm khi giống nhau từng byte vì banner quảng cáo xoay vòng, dòng "Cập nhật lúc 14:32", CSRF token, khối "Bài liên quan". Phải **chuẩn hoá trước khi băm**: bỏ `<script>`, `<style>`, comment; bóc nội dung chính khỏi nav/header/footer/sidebar (boilerplate removal kiểu Readability); chuẩn hoá khoảng trắng và chữ hoa thường — rồi hash cái văn bản chính đó. Nhưng ngay cả sau chuẩn hoá, hai trang khác nhau 1% từ vẫn ra hash hoàn toàn khác, trong khi với web thì "gần giống" cũng là trùng: một bản tin thông tấn xuất hiện trên 200 báo, chỉ khác câu mở.

| Kỹ thuật | Nguyên lý | Bắt được | Chi phí |
|---|---|---|---|
| Hash mật mã (MD5/SHA) | Khác 1 bit → hash khác hẳn | Chỉ trùng **tuyệt đối** | Rẻ nhất |
| **SimHash** | Fingerprint 64 bit; tài liệu giống nhau → Hamming ≤ 3 | Trùng **gần đúng** | Trung bình; tra cứu cần chỉ mục theo khối bit |
| **MinHash + LSH** | Ước lượng Jaccard trên tập shingle | Gần đúng, chỉnh được ngưỡng | Đắt hơn |

Chiến lược hai tầng: **hash chính xác** trên đường đi nóng (bắt 100% bản trùng tuyệt đối, chi phí gần bằng 0), rồi **SimHash chạy offline theo lô** để gom nhóm gần trùng và chọn bản đại diện. Đừng đưa SimHash vào đường đồng bộ — tra Hamming ≤ 3 trên một tỉ fingerprint đắt hơn nhiều một lần `GET` khoá chính xác.

> 💡 **Mẹo rẻ, hiệu quả lớn**: tôn trọng `<link rel="canonical">` — lời khai của chính website rằng "URL chính thức là cái kia". Một dòng code loại bỏ đáng kể bản trùng mà không cần hash. Nhưng nhiều site khai sai, nên coi là **tín hiệu mạnh**, không phải chân lý.

### 7.2 URL-seen — Bloom filter và cái giá của dương tính giả

| Phương án cho 10 tỉ URL | Bộ nhớ | Nhận xét |
|---|---|---|
| Hash set chuỗi URL | ~1,2 TB | Không khả thi |
| Hash set lưu MD5 128 bit | ~400 GB | Vẫn quá lớn |
| Bảng trên đĩa (RocksDB/LSM) | Không giới hạn RAM | Chính xác 100%, nhưng random read thành nút thắt |
| **Bloom filter (p=1%)** | **~12 GB** | Vừa RAM, nhanh nhất — đổi lại có sai số |
| Bloom filter (p=0,1%) | ~18 GB | Sai ít hơn 10 lần, vẫn vừa RAM |

Mảng `m` bit và `k` hàm băm. Thêm phần tử → bật `k` bit. Kiểm tra → **có bit nào bằng 0** thì **chắc chắn chưa thấy**; tất cả bằng 1 thì **có lẽ đã thấy**.

```
Thêm A: h→ 7, 12, 20        Thêm B: h→ 3, 20, 31
bitmap: 0001000100001000000010000000001
            ▲   ▲       ▲       ▲       ▲
            3   7      12      20      31
Kiểm tra C: h→ 3, 12, 31 → cả ba bit đang bật (do A và B)
  → báo "ĐÃ THẤY" dù C chưa bao giờ được thêm   ← DƯƠNG TÍNH GIẢ

m = -n·ln p / (ln2)²      k = (m/n)·ln2
p = 1%   → 9,6 bit/phần tử → 12 GB, k = 7
p = 0,1% → 14,4 bit        → 18 GB, k = 10
```

Bloom filter **không bao giờ âm tính giả** — nói "chưa thấy" thì chắc chắn chưa. Nó chỉ sai một chiều, và trong crawler hệ quả là **một URL chưa từng crawl bị bỏ qua vĩnh viễn**: **mất độ phủ**, không phải mất tính đúng đắn. Với `p = 1%` trên 10 tỉ URL là ~100 triệu URL bị sót — nghe to nhưng nhẹ hơn vẻ ngoài, vì phần lớn URL trên web là rác (phân trang, tham số sắp xếp, calendar) và một trang có giá trị hầu như luôn được nhiều trang khác trỏ tới nên thường vào được qua một biến thể URL khác. Không chấp nhận được thì hạ `p` xuống 0,1%, chỉ tốn thêm 6 GB.

Quan trọng hơn: nếu chọn cấu trúc có thể **âm tính giả**, hậu quả là **crawl lại vô hạn** — vòng lặp chết. Hướng sai của Bloom filter đúng là hướng bài toán này chịu được. *Đó* mới là lý do nó phù hợp, không phải vì "tiết kiệm bộ nhớ".

> ⚠️ **Bẫy 1 — không xoá được.** Bloom filter chuẩn không hỗ trợ xoá (xoá một bit phá các phần tử dùng chung bit đó). Nhưng crawler *cần* crawl lại URL cũ. Nghĩa là nó chỉ trả lời "có nên đưa vào frontier lần đầu không"; **lịch recrawl phải nằm ở cấu trúc khác** (bảng URL storage có `last_crawled_at`). Ai gộp hai vai trò này sẽ không bao giờ crawl lại được gì. Cần xoá thật thì dùng **Counting Bloom filter** (counter 4 bit, tốn gấp 4) hoặc **Cuckoo filter**.

> ⚠️ **Bẫy 2 — filter đầy dần.** `p` tính theo `n` dự kiến; vượt `n` thì tỉ lệ sai tăng rất nhanh và âm thầm — crawler đột nhiên "thấy quen" mọi thứ và ngừng phát hiện trang mới trong khi mọi biểu đồ vẫn bình thường. Phải giám sát **tỉ lệ bit đã bật**; vượt ~50% là lúc xoay vòng, hoặc dùng **Scalable Bloom filter** (đầy thì tạo filter mới lớn hơn, kiểm tra tuần tự qua chuỗi).

**Chuẩn hoá URL trước khi băm**, nếu không filter sẽ tràn bởi các biến thể của cùng một trang: hạ chữ thường scheme/host; bỏ cổng mặc định `:80`/`:443`; thống nhất `www`; **bỏ hẳn fragment** (`#section` không tới server); bỏ tham số theo dõi theo danh sách đen (`utm_*`, `fbclid`, `gclid`, `ref`, `sessionid`); sắp xếp tham số theo tên; thống nhất dấu `/` cuối; giải mã `%7E` → `~`; rút gọn `/a/./b/../c` → `/a/c`. Việc này thường **giảm 20–40% số URL duy nhất** — vừa thu nhỏ Bloom filter, vừa tiết kiệm crawl budget, vừa giảm trùng nội dung.

> ⚠️ **Bẫy 3 — chuẩn hoá quá tay**: bỏ hết query string thì `?id=123` và `?id=456` thành một trang, và bạn mất cả một site thương mại điện tử. Phải là **danh sách đen cụ thể**, không phải quy tắc tổng quát.

### 7.3 URL storage — vẫn cần một bảng thật

Bloom filter là bộ lọc, không phải cơ sở dữ liệu. Song song phải có bảng bền vững `url_hash → {url, host, first_seen, last_crawled_at, last_status, content_hash, etag, next_recrawl_at, priority, error_count}`, phục vụ ba việc Bloom filter không làm được: **lập lịch recrawl**, **xác nhận lại dương tính giả**, và **dựng lại Bloom filter** sau sự cố hoặc khi đổi kích thước. Nó nằm ngoài đường đi nóng nên có thể là kho trên đĩa rẻ tiền.

---

## 8. Deep dive 4 — HTML Downloader: nơi chạm vào thế giới thật

### 8.1 DNS — nút thắt không ai ngờ

Ba vấn đề. **(a)** DNS chậm và phương sai cao (10–200 ms, lên vài giây khi resolver ngược dòng quá tải) — thêm 100 ms mỗi fetch là tăng ~50% độ trễ pipeline mà không tải thêm byte nào. **(b)** `getaddrinfo` **block cả thread**, nên gọi trong event loop sẽ đóng băng toàn bộ worker; phải dùng DNS async thuần (c-ares, `aiodns`, resolver của Go) hoặc đẩy sang thread pool riêng. **(c)** Không cache thì lãng phí khủng khiếp, vì tỉ lệ trúng cache lý thuyết > 95%.

```
worker ─► cache in-process (LRU, vài chục nghìn entry, ns)
            │ miss ─► cache chung (Redis, vài triệu entry, ~0,5 ms)
            │ miss ─► resolver riêng (Unbound/CoreDNS cạnh crawler)
            │ miss ─► DNS công cộng / authoritative
```

Cache lâu hơn TTL là sai (IP đổi, site chuyển nhà), nhưng nhiều CDN đặt TTL 30–60 giây nên gần như không cache được gì. Thoả hiệp: `ttl_hiệu_dụng = clamp(ttl_gốc, 60 giây, 1 giờ)`; khi gặp lỗi kết nối thì **làm mất hiệu lực cache ngay** rồi phân giải lại trước khi kết luận host chết.

> 💡 **Chi tiết thực chiến ít được nhắc**: cache cả **kết quả âm** (NXDOMAIN). Crawler lớn liên tục gặp link tới domain đã chết; không cache lỗi thì bạn bắn hàng nghìn truy vấn/giây vào domain không tồn tại và tự biến mình thành nguồn nhiễu DNS.

### 8.2 robots.txt — hợp đồng ngầm của web

```
User-agent: *
Disallow: /admin/
Crawl-delay: 10
Sitemap: https://example.com/sitemap.xml
```

1. **Cache theo host, TTL ~24 giờ**, ở store chung — tải lại `robots.txt` cho mỗi URL là tăng gấp đôi lưu lượng và cực kỳ bất lịch sự.
2. **Xử lý đúng khi không lấy được** (chỗ nhiều cài đặt sai): `404` → không có luật, **được phép crawl**; `5xx`/timeout → **coi như cấm tạm thời**, thử lại sau; `403` → cấm.
3. **Tôn trọng `Crawl-delay`**, lấy giá trị lớn hơn giữa nó và delay thích nghi của bạn.
4. **Đọc dòng `Sitemap:`** — món quà miễn phí: danh sách URL do chính site cung cấp, thường kèm `lastmod`. Crawl sitemap trước rồi mới đi theo link là cách đạt độ phủ nhanh nhất trên một domain.
5. **Khai User-Agent trung thực** kèm URL giải thích và email. Đây không chỉ là lịch sự mà là biện pháp **vận hành**: quản trị viên gặp vấn đề sẽ email cho bạn thay vì lẳng lặng chặn cả dải IP.

`robots.txt` không phải cơ chế bảo mật và cũng không phải luật, nhưng vi phạm có hậu quả rất thật: bị chặn, bị đưa vào blocklist công khai, và ở nhiều nơi còn liên quan tới điều khoản sử dụng.

### 8.3 Timeout, retry, giới hạn

Internet công cộng đầy máy chủ chấp nhận kết nối rồi **không bao giờ trả lời**. Không có timeout cứng, vài nghìn host như vậy đủ chiếm hết connection pool và crawler đứng im dù CPU và băng thông đều rảnh.

| Giới hạn | Giá trị | Lý do |
|---|---|---|
| Connect timeout | 3–5 s | Host chết phải phát hiện nhanh |
| Read timeout mỗi lần đọc | 5–10 s | Chặn tấn công nhỏ giọt (slowloris) |
| Tổng thời gian một request | 15–30 s | Chặn trên tuyệt đối |
| Kích thước response | 5–10 MB | Không tải file 2 GB tưởng là HTML |
| Số redirect | 5 | Chặn vòng lặp chuyển hướng |
| Độ dài URL | 2.000 ký tự | Vũ khí đơn giản chống spider trap |
| Độ sâu | 10–20 | Chặn trên cho BFS |

Retry phải phân biệt theo loại lỗi — retry mù là cách nhanh nhất để tự biến thành kẻ tấn công:

| Phản hồi | Hành động | Vì sao |
|---|---|---|
| `301/302` | Đi theo (≤5 lần), ghi URL-seen cho **cả chuỗi** | Tránh crawl lại chuỗi redirect |
| `304` | Chỉ cập nhật `last_crawled_at`, giãn chu kỳ recrawl | Tiết kiệm ~99,9% băng thông |
| `404` / `410` | Đánh dấu chết; `410` xoá khỏi lịch luôn | `410 Gone` là khẳng định vĩnh viễn |
| `403` | Không retry, hạ điểm host | Thường là bị chặn có chủ đích |
| `429` | Tôn trọng `Retry-After`, **tăng mạnh delay của host** | Tín hiệu rõ rằng bạn đang quá tay |
| `5xx` | Exponential backoff + jitter, tối đa 3 lần | Có thể là sự cố tạm thời |
| Timeout | Retry 2 lần rồi hạ ưu tiên host | Phân biệt lỗi tạm thời và host chết |

Trên nữa nên có **circuit breaker theo host**: 20 request gần nhất tới một host đều lỗi → ngắt host khỏi lịch 1 giờ. Không có nó, một domain lớn bị sập sẽ liên tục chiếm chỗ trong frontier và nuốt crawl budget.

### 8.4 Crawl phân tán

Chia việc theo **hash của host**, không phải hash của URL — vì politeness đòi hỏi mọi URL cùng host phải do **cùng một node** xử lý, nếu không hai node sẽ đồng thời bắn vào cùng một máy chủ và không có cách phối hợp rẻ tiền nào ngăn được.

```
node_id = consistent_hash(registered_domain(url)) mod N
```

Dùng **consistent hashing** (xem `sd-09`) thay vì modulo thường: modulo xáo trộn gần như toàn bộ ánh xạ host→node khi thêm/bớt node, làm mất sạch state politeness (`next_allowed_at`), cache DNS và cache robots của mọi host cùng lúc; consistent hashing chỉ di chuyển `1/N`.

| Việc | Chia thế nào |
|---|---|
| Frontier + downloader | Shard theo **host** — điều kiện bắt buộc của politeness |
| Bloom filter URL-seen / content-seen | Shard theo **hash** — phân bố đều, không cần theo host |
| DNS / robots cache | Chia sẻ toàn cụm — trúng cache chéo rất có giá trị |
| Content storage | Object store chung, không shard thủ công |

**Phân tán theo địa lý**: crawl site Nhật từ `ap-northeast-1` thay vì `us-east-1` cắt RTT ~150 ms → ~10 ms; theo định luật Little, cùng số kết nối mà mỗi lần ngắn đi thì **throughput tăng trực tiếp**. Khi một node chết, URL đã giao mà chưa `ack` tự quay lại frontier sau visibility timeout — mất node chỉ làm vài nghìn URL chậm hơn, với điều kiện frontier **bền vững ngoài node**.

---

## 9. Nội dung có vấn đề — nơi lý thuyết gặp web thật

### 9.1 Spider trap

Những trang sinh ra **vô hạn URL hợp lệ**, thường không ác ý mà chỉ là hệ quả của web động:

```
/calendar?year=2024&month=5 → "tháng sau" → month=6 → … → year=9999
/products?page=1&sort=price&color=red&size=M&brand=X…  (tổ hợp facet bùng nổ)
/a/b/a/b/a/b/…                (lỗi link tương đối → path lặp vô hạn)
/wiki/Trang?action=edit&oldid=…&diff=…   (mọi cặp phiên bản = tổ hợp)
```

Không có cách phát hiện tổng quát hoàn hảo, nên phải xếp nhiều lớp:

| Phòng thủ | Bắt được gì |
|---|---|
| `max_depth = 15` | Bẫy path lặp |
| Bỏ URL > 2.000 ký tự | Path lặp, tham số chồng chất |
| **Ngân sách cứng theo domain** (vd 1 triệu URL) | **Mọi loại bẫy — mạnh nhất** |
| Bỏ URL có > 6 tham số query | Bùng nổ tổ hợp facet |
| Nhóm URL theo "hình dạng" (số → `#`), chặn khi một mẫu vượt ngưỡng | Bẫy calendar, phân trang vô hạn |
| Nhiều URL khác nhau ra cùng content hash → chặn cả nhánh | Bẫy sinh trang giống nhau |

Mạnh nhất là **ngân sách theo domain**, vì nó không cần hiểu bẫy là gì: domain ngốn một triệu URL mà chỉ đóng góp vài nghìn nội dung duy nhất thì tự động bị cắt. Đây cũng là phòng thủ duy nhất hiệu quả với loại bẫy bạn chưa từng thấy.

> 💡 **Tín hiệu vàng**: theo dõi `số nội dung duy nhất / số URL đã crawl` **theo từng host**. Host lành mạnh có tỉ lệ 0,5–0,9; rơi xuống 0,01 thì gần như chắc chắn là spider trap hoặc trang sinh tự động.

### 9.2 Redirect loop

```
A →301→ B →301→ C →301→ A                         (vòng lặp)
A →302→ A?lang=vi →302→ A?lang=vi&sid=1 →302→ …   (sinh URL mới mỗi bước)
```

Phòng thủ: đếm số bước (≤5), lưu tập URL đã đi qua **trong một chuỗi** để phát hiện lặp, và quan trọng nhất — **đưa mọi URL trong chuỗi vào URL-seen**, không chỉ URL cuối; nếu chỉ ghi URL cuối, crawler sẽ tải lại cả chuỗi mỗi lần gặp bất kỳ URL trung gian nào. Dạng tinh vi hơn là **redirect có trạng thái**: mỗi lần ghé sinh một session id mới → vô hạn URL "mới" với nội dung giống hệt; content-seen bắt được nội dung trùng nhưng tập URL vẫn phình, nên phải chuẩn hoá bỏ tham số session.

### 9.3 Nội dung trùng ở quy mô web

~30% nội dung web là bản trùng: `http`/`https`, `www`/không `www`, có/không `/` cuối; trang in và bản AMP; tin thông tấn đăng lại trên hàng trăm báo; site mirror, CDN domain, staging domain bị index nhầm; cùng tập sản phẩm với 20 thứ tự sắp xếp. Cách phát hiện đã bàn ở §7.1; điều cần thêm là **chọn bản đại diện**: ưu tiên URL có `rel=canonical` trỏ tới → ngắn hơn → domain uy tín hơn → HTTPS → phát hiện sớm hơn. **Chọn nhất quán quan trọng hơn chọn tối ưu**, vì nếu mỗi vòng crawl lại chọn một bản khác thì index sẽ nhấp nháy.

### 9.4 Trang render bằng JavaScript — vấn đề lớn nhất của web hiện đại

Một SPA trả về HTML gần như rỗng: `<div id="root"></div>` cộng một thẻ `<script>`. Crawler HTTP thuần nhìn thấy **không nội dung và không link nào cả** — toàn bộ nhánh cây web phía sau site đó biến mất khỏi crawl.

Giải pháp là **headless browser** (Puppeteer/Playwright + Chromium), nhưng cái giá rất đắt:

| | Fetch HTTP thuần | Headless Chrome |
|---|---|---|
| Thời gian mỗi trang | ~0,3–1 s | **~3–10 s** |
| RAM mỗi trang song song | vài chục KB | **~150–300 MB** |
| CPU | gần như 0 | **một lõi gần trọn thời gian** |
| Băng thông | 500 KB (chỉ HTML) | **2–5 MB** (JS + CSS + ảnh + font) |
| Trang/giây trên 1 vCPU | ~50–200 | **~0,2–0,5** |

Quy đổi thẳng: render 400 trang/giây bằng headless cần cỡ **1.000 lõi CPU** và hàng TB RAM — chênh hai đến ba bậc độ lớn. Không ai render toàn bộ web. Cách làm thực tế là **pipeline hai tầng, render có chọn lọc**:

```
URL ─► fetch HTTP (rẻ, 400/s) ─► cần render không?
                                 · text < 500 byte?  · 0 link?
                                 · dấu hiệu SPA / domain whitelist?
             không ◄─────────────┴──────────────► có
        xử lý bình thường            hàng đợi render (headless pool)
                                     chỉ ~1–5% tổng số trang
```

Giảm chi phí tầng render bằng: **chặn tải ảnh, font, media, quảng cáo, analytics** (giảm 60–80% băng thông và thời gian); ngân sách thời gian cứng (5 giây rồi chụp DOM dù chưa xong); tái dùng browser instance nhưng đổi context mỗi trang; và **tìm nguồn rẻ hơn trước** — nhiều SPA gọi một REST/GraphQL API trả JSON sạch, hoặc có sẵn bản SSR/sitemap; gọi thẳng API rẻ hơn render hàng nghìn lần.

> 💡 **Cách nói khi phỏng vấn**: *"Tôi sẽ không render mọi trang — headless đắt hơn 10–100 lần. Fetch HTTP trước, phát hiện trang rỗng nội dung hoặc không có link, rồi đưa số ít đó vào hàng đợi render riêng có ngân sách giới hạn."* Câu này cho thấy bạn biết cả giải pháp lẫn **giá** của nó — mà biết giá mới là phần khó.

### 9.5 Nhiễu và spam

Content farm, trang sinh tự động bằng mô hình ngôn ngữ, doorway page nhồi từ khoá, parked domain, site clone — chúng ăn crawl budget, làm bẩn index và làm hỏng tín hiệu ưu tiên. Tín hiệu nhận biết: tỉ lệ text/HTML rất thấp; mật độ từ khoá bất thường; tỉ lệ link ra ngoài rất cao (link farm); gần trùng với trang khác (scrape lại nội dung người khác); domain rất mới mà có rất nhiều trang; và mạnh nhất — **không có lưu lượng truy cập thật**, tín hiệu mà chỉ công cụ tìm kiếm lớn mới có.

Thực dụng nhất là một **điểm tin cậy cấp domain** (kiểu TrustRank: lan truyền độ tin cậy từ tập seed thủ công qua đồ thị link) đưa vào prioritizer. Domain điểm thấp **không bị cấm**, chỉ xếp vào front queue ưu tiên thấp nhất với ngân sách nhỏ — cấm hẳn là sai vì mọi site mới đều bắt đầu từ điểm thấp.

---

## 10. Bottleneck & failure mode

| # | Nút thắt | Triệu chứng | Cách gỡ |
|---|---|---|---|
| 1 | **Politeness delay** (hầu như luôn là đầu tiên) | Throughput chạm trần dù CPU, RAM, băng thông đều rảnh | Tăng **độ đa dạng host**, không phải tăng số worker |
| 2 | **DNS** | p99 nhảy vọt, worker chờ ở bước resolve | Cache 2 tầng, resolver async, cache cả NXDOMAIN |
| 3 | **URL-seen store** | 24.000 lượt tra/giây thành hot path | Bloom filter trong RAM mỗi node + shard theo hash |
| 4 | **Ghi vào frontier** | Ghi nhiều hơn đọc ~60 lần | Ghi theo lô, lọc trùng cục bộ trước khi ghi |
| 5 | **Content storage** | Nghẽn ở ghi object nhỏ, hoặc chi phí request | Gộp thành file lớn (WARC/Parquet), ghi async |
| 6 | **Băng thông / NAT** | Hoá đơn tăng, throughput không tăng | Public subnet, gzip, giới hạn kích thước, conditional GET |
| 7 | **CPU parse & render** | Chỉ nghẽn khi bật headless quy mô lớn | Tách pool render riêng, chặn tài nguyên không cần |

Dòng đầu phản trực giác nhưng rất quan trọng: **thêm máy không tăng throughput nếu frontier không đủ host khác nhau** — lúc đó worker phần lớn thời gian đang *ngủ chờ delay*. Chữa bằng cách mở rộng chiều rộng crawl (nạp thêm seed đa dạng, hạ ưu tiên host đang bão hoà).

| Thành phần chết | Hậu quả | Giảm nhẹ |
|---|---|---|
| Một node downloader | URL chưa `ack` treo tới hết visibility timeout | Frontier bền vững ngoài node; consistent hashing chỉ chuyển `1/N` host |
| Frontier store | **Toàn bộ crawl dừng** — SPOF thật sự | Replicate + shard theo host; buffer cục bộ chạy tiếp vài phút |
| Bloom filter (mất RAM) | Tưởng chưa thấy gì → crawl lại mọi thứ | Snapshot định kỳ xuống object store; dựng lại từ URL storage |
| Content-seen store | Lưu trùng → tốn tiền, không sai | Fail-open: cứ lưu, dọn bằng job offline |
| DNS cache | Truy vấn tăng vọt, throughput sụt | Fail-open về resolver, có giới hạn tốc độ |
| Content storage | Không lưu được → không `ack` được | Buffer trên đĩa + retry; frontier tự trả URL về |
| Robots cache | Tải lại `robots.txt` liên tục | Fail-**closed** cho host chưa biết luật; TTL âm cho lỗi |

> 💡 **Triết lý fail mode**: crawler là hệ thống **chịu mất mát**. Mất một URL không phải thảm hoạ — nó sẽ được tìm lại từ trang khác ở vòng sau. Nên hầu hết thành phần **fail-open**, đánh đổi tính đầy đủ lấy tính sẵn sàng. Hai ngoại lệ **phải fail-closed**: kiểm tra `robots.txt` (crawl chỗ bị cấm là vấn đề pháp lý, không phải chất lượng) và giới hạn politeness (mất kiểm soát tốc độ là tấn công người khác).

**Chỉ số phải giám sát**: `pages_per_second`; `frontier_size` (tăng đều là bình thường, về 0 là sắp đói, bùng nổ là có bẫy); `unique_content / pages_crawled` **theo host**; phân bố mã trạng thái theo host (429/403 tăng = đang bất lịch sự); fill ratio của Bloom filter; tỉ lệ trúng DNS/robots cache; và **tuổi trung bình của nội dung trong index** — chỉ số chất lượng thật sự, đo hiệu quả chiến lược recrawl.

---

## 11. Mở rộng & biến thể

**11.1 Extensibility.** Coi phần sau parser như **pipeline cắm mô-đun**, phân nhánh theo `Content-Type`:

```
Downloader ─► router ─┬─► HTML module   → parse, trích link
  (theo Content-Type) ├─► Image module  → thumbnail, EXIF, perceptual hash
                      ├─► PDF module    → trích text, metadata
                      └─► Monitor module→ so khớp vi phạm bản quyền
```

Mỗi module khai báo kiểu nó nhận và trả về nội dung chuẩn hoá cùng danh sách URL mới; lõi (frontier, dedup, politeness, storage) **không đổi một dòng**. Đó là định nghĩa thực dụng của "extensible", và là câu trả lời cho yêu cầu phi chức năng thứ tư ở §1.

**11.2 Server-side rendering như lối thoát rẻ hơn.** Trước khi bỏ tiền vào headless, hãy thử: bản SSR sẵn có (Next.js/Nuxt), sitemap, RSS/Atom feed, hoặc chính API JSON mà SPA gọi. Crawler thông minh **tìm con đường rẻ nhất tới nội dung**, không mặc định dùng con đường mạnh nhất.

**11.3 Anti-crawling.** Website chống crawler bằng kiểm tra User-Agent, rate limit theo IP, CAPTCHA, fingerprint TLS (JA3), thử thách JavaScript, honeypot link ẩn, và nội dung chỉ hiện sau đăng nhập. Ranh giới cần nói rõ trong review: crawler hợp pháp thì **khai danh tính trung thực, tuân thủ `robots.txt`, và giảm tốc khi bị yêu cầu**; vượt CAPTCHA, giả fingerprint, xoay IP để né rate limit là bước sang scraping đối kháng — bài toán và rủi ro pháp lý khác. Đáng nhắc thêm: honeypot link (ẩn bằng CSS hoặc bị `robots.txt` cấm) là bẫy đơn giản và hiệu quả nhất để phát hiện bot xấu — thêm một lý do thực tế để tuân thủ `robots.txt`.

**11.4 Tự viết frontier hay dùng hàng đợi có sẵn.**

| Phương án | Ưu | Nhược |
|---|---|---|
| **Tự viết** (buffer RAM + file đĩa) | Kiểm soát hoàn toàn ưu tiên/delay; nhanh nhất | Tự lo bền vững, sharding, vận hành |
| **Kafka / SQS** làm phần thân | Bền, co giãn, vận hành gần bằng 0 | Không có ưu tiên và không có delay từng message (SQS tối đa 15 phút) |
| **Redis sorted set** làm lớp lịch | Score = `next_allowed_at` → chọn "đã tới giờ" rất tự nhiên | Nằm hoàn toàn trong RAM, đắt ở quy mô lớn |
| **Lai (thực dụng nhất)** | Redis giữ lịch politeness + ưu tiên; SQS/Kafka giữ khối lượng | Hai hệ thống phải đồng bộ với nhau |

**11.5 Dark web.** Nội dung `.onion` chỉ tới được qua proxy SOCKS5 của Tor: độ trễ cao gấp 5–20 lần, không có DNS thông thường (địa chỉ onion là khoá công khai), tỉ lệ lỗi rất cao, không phân tán theo địa lý được. Về kiến trúc chỉ là **một loại downloader khác** cắm vào cùng lõi — đúng thứ §11.1 dự trù — nhưng mọi tham số phải chỉnh lại: timeout dài hơn nhiều, throughput mỗi node thấp hơn hàng chục lần, politeness nghiêm ngặt hơn vì dịch vụ ẩn thường chạy trên hạ tầng rất nhỏ.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Phần thân URL frontier | **SQS** | Visibility timeout khớp đúng cặp `next()`/`ack()`; DLQ bắt URL lỗi lặp. Hạn chế: **không có ưu tiên** → mô phỏng bằng nhiều hàng đợi `frontier-p1..p4` đọc theo trọng số; `DelaySeconds` tối đa 15 phút nên không dùng cho lịch recrawl dài |
| Frontier thông lượng rất cao, cần replay | **Kinesis** / **MSK** | Retention cho phép phát lại khi đổi thuật toán parse; partition key = host → mọi URL cùng host về cùng shard |
| Lớp politeness + ưu tiên (`host → next_allowed_at`) | **ElastiCache Redis** (sorted set) | `ZRANGEBYSCORE 0 now` lấy đúng host đã tới giờ, `ZADD` đặt lại lịch sau mỗi lần tải — cấu trúc khớp bài toán nhất trong AWS |
| URL-seen (Bloom filter) | **RedisBloom** (`BF.ADD`/`BF.EXISTS`), hoặc filter trong RAM mỗi node | 12 GB cho 10 tỉ URL vừa một node `r7g.xlarge`; bản in-process nhanh hơn nhưng phải shard theo host. Snapshot xuống S3 để dựng lại sau sự cố |
| Cache DNS + robots.txt | **ElastiCache Redis** | Chia sẻ toàn cụm → trúng cache chéo rất cao; TTL native khớp thẳng TTL của DNS record và vòng đời 24 giờ của `robots.txt` |
| Phân giải DNS | **Route 53 Resolver** endpoint + resolver cục bộ | Tránh phụ thuộc resolver công cộng; chú ý **hạn mức 1.024 gói/giây mỗi ENI** — nút thắt DNS ở §2.7 hiện ra dưới dạng một hạn mức AWS rất cụ thể |
| Kho HTML thô | **S3** + lifecycle | 4,2 PB: Standard cho 30 ngày gần nhất, Glacier Deep Archive cho phần còn lại → chênh ~20 lần tiền. Gộp trang nhỏ thành **WARC/Parquet** để không trả phí PUT cho một tỉ object mỗi tháng |
| Metadata URL (`last_crawled_at`, etag, hash) | **DynamoDB** | Khoá chính `url_hash`; TTL tự dọn URL chết; GSI theo `next_recrawl_at` để lấy việc recrawl theo lô |
| Downloader (workload chính) | **ECS/Fargate** hoặc **EC2 Spot** | Tiến trình sống lâu, giữ hàng nghìn kết nối, cần cache in-memory và connection pool. **Spot** rất hợp vì crawler chịu được gián đoạn (URL chưa `ack` tự quay lại); EC2 thắng Fargate ở quy mô lớn nhờ mạng tốt hơn và rẻ hơn |
| Downloader bằng **Lambda**? | Có, nhưng có điều kiện | Hợp cho crawl từng đợt nhỏ và cho tầng render. **Không hợp** làm downloader chính: tối đa 15 phút nên không giữ kết nối lâu; không có state giữa các lần gọi (mất cache DNS/robots và lớp politeness trong bộ nhớ); đắt hơn nhiều khi tác vụ chủ yếu là **chờ I/O**; concurrency bùng nổ dễ vô tình phá politeness |
| Tầng render JavaScript | **Fargate** chạy Playwright, hoặc **Lambda** container image | Tài nguyên khác hẳn downloader (CPU/RAM cao, throughput thấp) → auto-scale riêng theo độ dài hàng đợi |
| IP đi ra & chi phí mạng | **Public subnet + IP public** thay vì NAT | §2.3: 518 TB/tháng qua NAT Gateway tốn ~$23.000 — quyết định kiến trúc, không phải tinh chỉnh |
| Phân tán theo địa lý | Cụm ECS ở nhiều **region** | Cắt RTT ~150 ms → ~10 ms; theo Little, giảm độ trễ là tăng throughput trực tiếp |
| Chia việc theo host | Consistent hashing trong ứng dụng (`sd-09`) | Thêm/bớt node chỉ chuyển `1/N` host → giữ được cache DNS/robots và state politeness |
| Index tìm kiếm sau crawl | **OpenSearch Service** | Nhận nội dung đã parse; k-NN nếu cần tìm kiếm ngữ nghĩa |
| Job theo lô (SimHash, PageRank, đồ thị link) | **EMR / Glue / Athena** trên S3 | Vốn là batch — tách khỏi đường đi nóng, chạy ngay trên kho S3 |
| Giám sát / cấu hình sửa nóng | **CloudWatch** / **SSM Parameter Store** | `pages/s`, frontier size, tỉ lệ 429/403 theo host, fill ratio Bloom filter; blocklist và giới hạn theo host sửa không cần deploy |

**Kiến trúc AWS mặc định gọn**: ECS trên EC2 Spot ở public subnet (downloader async) → ElastiCache Redis giữ lớp politeness (sorted set `host → next_allowed_at`), Bloom filter URL-seen, cache DNS và robots → SQS nhiều hàng đợi theo mức ưu tiên làm phần thân frontier → S3 lưu WARC gộp có lifecycle chuyển tầng → DynamoDB giữ metadata và lịch recrawl → pool Fargate riêng chạy Playwright cho 1–5% trang cần render → EMR chạy job theo lô → OpenSearch nhận index.

---

## Cách trình bày khi phỏng vấn / review

1. **Hỏi mục đích trước khi hỏi quy mô.** "Để index tìm kiếm, để lưu trữ, hay để giám sát?" — câu trả lời đổi hẳn thiết kế (§1).
2. **Ra số sớm, và nói rõ số đó ép ra quyết định gì**: "30 PB thô là không chấp nhận được nên khử trùng và nén là **bắt buộc**, không phải tối ưu hoá"; "1,2 TB nếu dùng hash set nên phải là Bloom filter". Mỗi con số phải **giết một phương án**.
3. **Vẽ vòng lặp bốn dòng trước, rồi thêm từng hộp như một liều thuốc** chữa một bệnh cụ thể. Người nghe sẽ hiểu *vì sao* kiến trúc có hình dạng đó thay vì chỉ nhìn một sơ đồ 11 hộp.
4. **Nói BFS, nhưng nói ngay vì sao BFS thuần hỏng**, bằng ví dụ cụ thể: "trang chủ Wikipedia có 300 link gần như toàn bộ trỏ nội bộ; với một FIFO duy nhất thì 300 request đập vào một host cùng lúc."
5. **Dành nhiều thời gian nhất cho URL frontier** — component khó nhất. Vẽ hai tầng, nói rõ front queue = *cái gì trước*, back queue = *khi nào được phép*. Thêm một câu về **starvation** ("chọn ngẫu nhiên có thiên vị, không ưu tiên tuyệt đối") là điểm cộng lớn. Nói thêm rằng politeness đúng ra tính theo **IP** chứ không chỉ theo domain (shared hosting), kèm mặt trái là với CDN thì quá bảo thủ.
6. **Tách bạch hai bài toán "đã thấy chưa"** — URL-seen trước khi tải (10 tỉ phần tử, Bloom filter) và content-seen sau khi tải (hash/SimHash). Gộp chúng là dấu hiệu chưa nghĩ kỹ.
7. **Giải thích dương tính giả theo hệ quả, không theo định nghĩa**: *"Bloom filter chỉ sai một chiều — có thể nói 'đã thấy' cho URL chưa crawl, ta mất 1% độ phủ; chiều còn lại không bao giờ sai nên không có nguy cơ vòng lặp vô hạn. Đó là hướng sai mà crawler chịu được."* Và chủ động nêu rằng **Bloom filter không xoá được**, nên lịch recrawl phải nằm ở bảng khác — rất nhiều người dùng nó rồi tự mâu thuẫn với yêu cầu "phát hiện trang đã cập nhật".
8. **Đừng quên DNS** — nút thắt bị bỏ sót nhiều nhất. Hai câu là đủ: cache hai tầng, và resolver async vì `getaddrinfo` block cả thread.
9. **Nói robots.txt ở mức vận hành**, không chỉ "tôi sẽ tuân thủ": cache theo host TTL một ngày, `404` là được phép, `5xx` là cấm tạm thời, và đọc luôn dòng `Sitemap:` để lấy URL miễn phí.
10. **Liệt kê bẫy chủ động**: spider trap, redirect loop, trùng nội dung, trang render bằng JS, spam — mỗi cái một biện pháp. Riêng headless browser thì nêu **con số giá** (đắt 10–100 lần) và nói chỉ render 1–5% trang.
11. **Chốt bằng freshness** — nhiều người quên hẳn yêu cầu "phát hiện trang mới và trang đã cập nhật": recrawl thích nghi, conditional GET với ETag, và bẫy hash toàn trang khiến mọi trang trông như luôn thay đổi.
12. **Kết bằng cách hỏng**: *"Crawler là hệ thống chịu mất mát — mất một URL không nghiêm trọng vì nó sẽ được tìm lại. Nên hầu hết thành phần fail-open, trừ kiểm tra robots.txt và giới hạn politeness phải fail-closed."*

> 💡 **Nếu chỉ nhớ một điều**: độ khó của web crawler không nằm ở việc tải trang, mà ở **một hàng đợi bị kéo về ba hướng** — tải cái quan trọng trước, nhưng đừng làm phiền ai, nhưng cũng đừng để dữ liệu cũ đi. Kiến trúc front queue/back queue là câu trả lời cho hai hướng đầu, recrawl thích nghi là câu trả lời cho hướng thứ ba. Mọi thứ còn lại — Bloom filter, DNS cache, SimHash, headless browser — là kỹ thuật để cái vòng lặp đó chạy được ở quy mô một tỉ trang mà không phá sản và không bị chặn.
