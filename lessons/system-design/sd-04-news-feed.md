# Case study: News Feed / Timeline

> Đây là một trong những bài design "kinh điển" nhất. Nó không khó vì thuật toán, mà khó vì **đánh đổi**: cùng một bài toán, hai kiến trúc ngược nhau hoàn toàn (push vs pull) đều "đúng" tùy ngữ cảnh. Mục tiêu của bài này không phải học thuộc một đáp án, mà là biết **lập luận tại sao chọn cái này thay vì cái kia**, và biết khi nào phải đổi ý.

Ta đi theo khung chuẩn: **Requirements → Estimation → API → High-level design → Deep dive → Bottleneck → Scale**.

---

## 1. Requirements — làm rõ trước khi vẽ

Bẫy lớn nhất là nhảy vào vẽ box ngay. Hãy hỏi để thu hẹp phạm vi.

**Functional (chức năng):**
- User đăng post (text, ảnh, link).
- User follow người khác (đồ thị bất đối xứng — A follow B không bắt buộc B follow A, kiểu Twitter/Instagram).
- User mở app thấy **feed**: tổng hợp post của những người mình follow, sắp xếp theo thứ tự nào đó.
- Feed cuộn vô hạn (infinite scroll), load thêm khi kéo xuống.

**Non-functional (ràng buộc chất lượng):**
- **Đọc nặng hơn ghi rất nhiều** — đây là đặc tính quyết định kiến trúc.
- Latency feed mở ra phải nhanh: p99 < 200ms.
- **Eventual consistency chấp nhận được**: bạn của tôi đăng post, tôi thấy sau 5–10 giây cũng không sao. Không ai chết vì điều đó.
- High availability quan trọng hơn strong consistency (feed lỗi vài giây tốt hơn feed sập).

> 💡 **Nguyên tắc:** Câu hỏi đầu tiên luôn là *"đọc nhiều hay ghi nhiều?"* và *"cần consistency mạnh tới đâu?"*. Hai câu này quyết định 80% kiến trúc. News Feed = **đọc cực nhiều + consistency yếu** → mở đường cho việc tính toán trước (precompute) và cache mạnh tay.

**Câu hỏi nên hỏi interviewer để định hình:**
- Có ranking phức tạp (ML) hay chỉ reverse-chronological (mới nhất lên trước)?
- Phân bố follower có lệch không? (có "celebrity" hàng chục triệu follower không?) — câu này cực quan trọng.
- Cần real-time tới mức nào?

---

## 2. Estimation — back-of-envelope có con số

Giả định để dễ tính (luôn nói rõ giả định của mình):

```
DAU (daily active users)        : 200 triệu
Post / user / ngày              : 0.5   -> 100 triệu post/ngày
Feed read / user / ngày         : 10    -> 2 tỷ read/ngày
Trung bình follow / user        : 200
```

**QPS (queries per second):**

```
Giây trong ngày ~ 86,400  (làm tròn 100k cho dễ)

Write QPS (post)  = 100tr / 86400   ≈ 1,160  /s   -> peak x3 ≈ 3,500 /s
Read QPS  (feed)  = 2 tỷ  / 86400   ≈ 23,000 /s   -> peak x3 ≈ 70,000 /s
```

> Tỷ lệ Read:Write ≈ **20:1**. Đây là con số "đắt giá" — nó nói: hãy dồn công sức tối ưu đường ĐỌC, kể cả phải làm đường GHI nặng hơn.

**Storage cho post:**

```
1 post metadata ~ 300 bytes (id, author_id, text, timestamps, counters)
100tr post/ngày x 300B = 30 GB/ngày  -> ~11 TB/năm (chưa kể ảnh)
Ảnh/video -> đẩy sang object storage (S3) + CDN, KHÔNG nhét vào DB.
```

**Feed cache (nếu precompute):**

```
Mỗi user cache 500 post-id gần nhất, mỗi id ~ 8 bytes + metadata ~ 20B = ~14 KB/user
200tr user x 14 KB ≈ 2.8 TB  -> nằm gọn trong một cluster Redis sharded.
```

> 💡 **Nguyên tắc:** Estimation không cần chính xác, cần **đúng order-of-magnitude** để ra quyết định. "2.8 TB cache" cho ta biết: dùng được Redis cluster, không cần kiến trúc kỳ dị. "70k read QPS" cho ta biết: một DB đơn không gánh nổi đường đọc → phải cache / precompute.

---

## 3. API design

Giữ API mỏng, REST/JSON. Phân trang bằng **cursor**, không dùng `offset/limit`.

```
POST /v1/posts
  body: { text, media_ids[] }
  -> 201 { post_id, created_at }

GET  /v1/feed?cursor=<opaque>&limit=20
  -> 200 {
       items: [ {post_id, author, text, media_urls, score, created_at}, ... ],
       next_cursor: "<opaque>"   // null nếu hết
     }

POST /v1/follow   { target_user_id }
DELETE /v1/follow/{target_user_id}
```

> ⚠️ **Bẫy thiết kế:** Đừng dùng `GET /feed?page=5&size=20` (offset pagination). Khi có post mới chèn vào đầu feed, mọi offset bị **lệch** → user thấy post trùng hoặc nhảy mất post. Hơn nữa `OFFSET 100000` bắt DB quét bỏ 100k dòng. Cursor (con trỏ tới vị trí cuối đã đọc, ví dụ `created_at + post_id`) ổn định và O(1).

---

## 4. High-level design

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc tổng News Feed — đường ghi và đường đọc tách bạch</title>
  <desc>Client qua API Gateway rẽ hai nhánh: Post service (ghi) lưu Post DB và Graph follow rồi phát sự kiện post created vào Queue cho fan-out workers ghi Feed Cache; Feed service (đọc) đọc từ Feed Cache.</desc>
  <defs>
    <marker id="ah4" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Kiến trúc tổng: đường GHI (post) vs đường ĐỌC (feed) tách bạch</text>
  <g font-size="12" stroke="currentColor" fill="none">
    <!-- nodes -->
    <g>
      <rect x="20" y="200" width="110" height="48" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.3"/>
      <text x="75" y="229" font-size="12.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Client</text>
    </g>
    <g>
      <rect x="172" y="200" width="118" height="48" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.3"/>
      <text x="231" y="223" font-size="12.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">API Gateway</text>
      <text x="231" y="239" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.65">auth · route</text>
    </g>
    <!-- write branch -->
    <g>
      <rect x="340" y="120" width="128" height="50" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.3"/>
      <text x="404" y="142" font-size="12.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Post service</text>
      <text x="404" y="158" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.65">(write)</text>
    </g>
    <g>
      <rect x="520" y="108" width="180" height="74" rx="10" fill="#3b82f6" fill-opacity="0.1" stroke-opacity="0.3"/>
      <text x="610" y="132" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Post DB</text>
      <text x="610" y="150" font-size="11" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.8">Graph (follow)</text>
      <text x="610" y="167" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">ghi-một-lần · 2 chiều</text>
    </g>
    <!-- read branch -->
    <g>
      <rect x="340" y="278" width="128" height="50" rx="10" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.3"/>
      <text x="404" y="300" font-size="12.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Feed service</text>
      <text x="404" y="316" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.65">(read)</text>
    </g>
    <g>
      <rect x="520" y="276" width="180" height="54" rx="10" fill="#10b981" fill-opacity="0.12" stroke-opacity="0.3"/>
      <text x="610" y="299" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Feed Cache (Redis)</text>
      <text x="610" y="316" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">user_id → [post_id…]</text>
    </g>
    <!-- async fan-out -->
    <g>
      <rect x="340" y="372" width="128" height="48" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.3"/>
      <text x="404" y="394" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Queue / Bus</text>
      <text x="404" y="410" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">"post created"</text>
    </g>
    <g>
      <rect x="520" y="372" width="180" height="48" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.3"/>
      <text x="610" y="394" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">Fan-out workers</text>
      <text x="610" y="410" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">ghi Feed Cache</text>
    </g>
    <!-- edges -->
    <path d="M130 224 H168" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <path d="M290 218 C320 200 320 160 338 150" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <path d="M290 230 C320 250 320 295 338 300" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <path d="M468 145 H516" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <path d="M468 303 H516" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <!-- post svc -> queue (event): vòng tránh hộp Feed service qua khe x=492 -->
    <path d="M450 170 C492 200 492 220 492 240 C492 320 444 340 422 366" stroke-opacity="0.45" stroke-dasharray="5 4" marker-end="url(#ah4)"/>
    <path d="M468 396 H516" stroke-opacity="0.5" marker-end="url(#ah4)"/>
    <!-- workers -> feed cache (write) -->
    <path d="M610 372 V334" stroke-opacity="0.5" marker-end="url(#ah4)"/>
  </g>
  <g font-size="9.5" stroke="none" fill="currentColor" opacity="0.6">
    <text x="476" y="232" text-anchor="middle">event (async)</text>
  </g>
</svg>

Hai đường tách bạch: **đường ghi (post)** và **đường đọc (feed)**. Câu hỏi trung tâm: *feed được tạo ra LÚC NÀO?* — đây chính là chỗ rẽ push vs pull.

---

## 5. Deep dive — Fan-out: trái tim của bài toán

### 5.1 Fan-out on write (PUSH model)

Khi user đăng post, ta **đẩy ngay** post-id đó vào feed cache của **từng follower**. Feed của mỗi người được dựng sẵn (precomputed).

```
A đăng post
   │
   ▼  lấy danh sách follower của A (vd 200 người)
   ├─▶ prepend post_id vào feed_cache[follower_1]
   ├─▶ prepend post_id vào feed_cache[follower_2]
   └─▶ ... (200 lần ghi)

Đọc feed: chỉ việc đọc feed_cache[me] -> trả về ngay. SIÊU NHANH.
```

- **Đọc:** O(1), một lần đọc Redis list → p99 cực thấp. Tuyệt vời cho 70k read QPS.
- **Ghi:** đắt. Một post của người có F follower → F lần ghi. Đẩy việc nặng sang lúc ghi (offline, qua queue).

### 5.2 Fan-out on read (PULL model)

Không precompute gì cả. Khi user mở feed, ta mới **gom** post: lấy danh sách following → query post mới nhất của từng người → merge → sort → trả về.

```
Đọc feed của Me:
   following = [u1, u2, ... u200]
   for each u: lấy N post mới nhất của u
   merge-sort theo time/score -> trả 20 post đầu
```

- **Ghi:** O(1), chỉ ghi 1 dòng post.
- **Đọc:** đắt. Mỗi lần mở feed phải fan-out query nhiều nguồn → chậm, tốn DB. Tệ với read:write 20:1.

Hai mô hình đặt cạnh nhau — chú ý công việc nặng nằm ở **lúc ghi** (push) hay **lúc đọc** (pull):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh Fan-out on write (push) và Fan-out on read (pull)</title>
  <desc>Bên trái push: lúc ghi prepend post_id vào feed cache của từng follower nên đọc chỉ O(1). Bên phải pull: lúc ghi chỉ 1 dòng nên đọc phải gom following rồi merge-sort.</desc>
  <text x="180" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Fan-out on WRITE (push)</text>
  <text x="540" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Fan-out on READ (pull)</text>
  <line x1="360" y1="36" x2="360" y2="414" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <defs>
    <marker id="ah5" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor"/></marker>
  </defs>
  <!-- PUSH side -->
  <g font-size="11" stroke="currentColor" fill="none">
    <text x="20" y="58" font-size="11" font-weight="700" stroke="none" fill="currentColor" opacity="0.7">LÚC GHI (đắt):</text>
    <rect x="20" y="68" width="120" height="40" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="80" y="92" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">A đăng post</text>
    <path d="M80 108 V128" stroke-opacity="0.5" marker-end="url(#ah5)"/>
    <rect x="20" y="132" width="200" height="86" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke-opacity="0.3"/>
    <text x="120" y="152" font-size="10.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.75">prepend post_id vào feed_cache</text>
    <text x="120" y="167" font-size="10.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.75">của TỪNG follower:</text>
    <g stroke="none" fill="currentColor">
      <rect x="34" y="176" width="172" height="15" rx="4" fill="#3b82f6" fill-opacity="0.18" stroke="none"/>
      <text x="40" y="187" font-size="9.5">feed_cache[follower_1] ← post_id</text>
      <rect x="34" y="194" width="172" height="15" rx="4" fill="#3b82f6" fill-opacity="0.18" stroke="none"/>
      <text x="40" y="205" font-size="9.5">feed_cache[follower_2] … (F lần)</text>
    </g>
    <text x="20" y="262" font-size="11" font-weight="700" stroke="none" fill="currentColor" opacity="0.7">LÚC ĐỌC (rẻ):</text>
    <rect x="20" y="272" width="200" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="120" y="291" font-size="11" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">đọc feed_cache[me]</text>
    <text x="120" y="307" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">1 lần đọc → trả ngay</text>
    <rect x="20" y="332" width="320" height="64" rx="9" fill="#10b981" fill-opacity="0.1" stroke-opacity="0.25"/>
    <text x="32" y="352" font-size="11" stroke="none" fill="currentColor">Đọc: <tspan font-weight="700">O(1)</tspan> — p99 cực thấp, hợp read-heavy</text>
    <text x="32" y="371" font-size="11" stroke="none" fill="currentColor">Ghi: <tspan font-weight="700">đắt</tspan> — F lần ghi/post (qua queue, async)</text>
    <text x="32" y="388" font-size="10" stroke="none" fill="currentColor" opacity="0.7">→ feed dựng SẴN (precomputed)</text>
  </g>
  <!-- PULL side -->
  <g font-size="11" stroke="currentColor" fill="none">
    <text x="380" y="58" font-size="11" font-weight="700" stroke="none" fill="currentColor" opacity="0.7">LÚC GHI (rẻ):</text>
    <rect x="380" y="68" width="200" height="40" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="480" y="86" font-size="11" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">A đăng post → ghi 1 dòng</text>
    <text x="480" y="101" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">không fan-out gì cả</text>
    <text x="380" y="138" font-size="11" font-weight="700" stroke="none" fill="currentColor" opacity="0.7">LÚC ĐỌC (đắt):</text>
    <rect x="380" y="148" width="180" height="38" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="470" y="171" font-size="10.5" text-anchor="middle" stroke="none" fill="currentColor">gom following = [u1…u200]</text>
    <path d="M470 186 V204" stroke-opacity="0.5" marker-end="url(#ah5)"/>
    <rect x="380" y="208" width="180" height="38" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="470" y="231" font-size="10.5" text-anchor="middle" stroke="none" fill="currentColor">query N post mới của từng u</text>
    <path d="M470 246 V264" stroke-opacity="0.5" marker-end="url(#ah5)"/>
    <rect x="380" y="268" width="180" height="38" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="470" y="291" font-size="10.5" text-anchor="middle" stroke="none" fill="currentColor">merge-sort → trả 20 đầu</text>
    <rect x="380" y="332" width="320" height="64" rx="9" fill="#f59e0b" fill-opacity="0.1" stroke-opacity="0.25"/>
    <text x="392" y="352" font-size="11" stroke="none" fill="currentColor">Ghi: <tspan font-weight="700">O(1)</tspan> — chỉ 1 dòng post</text>
    <text x="392" y="371" font-size="11" stroke="none" fill="currentColor">Đọc: <tspan font-weight="700">đắt</tspan> — fan-out query + merge runtime</text>
    <text x="392" y="388" font-size="10" stroke="none" fill="currentColor" opacity="0.7">→ tệ với read:write 20:1, nhưng luôn tươi</text>
  </g>
</svg>

### 5.3 Bảng trade-off PUSH vs PULL

| Tiêu chí | Fan-out on WRITE (push) | Fan-out on READ (pull) |
|---|---|---|
| Latency đọc feed | **Rất thấp** (đọc sẵn) | Cao (gom + merge runtime) |
| Chi phí lúc ghi | Cao (F lần ghi/post) | Thấp (1 lần ghi) |
| Hợp với read-heavy | **Có** (đa số mạng xã hội) | Không |
| User có **rất nhiều follower** (celebrity) | **Thảm họa** (fan-out hàng chục triệu) | Tốt (không nhân bản) |
| User ít hoạt động / inactive | Lãng phí (ghi feed cho người không đọc) | Không lãng phí |
| Độ tươi (freshness) | Hơi trễ (phụ thuộc worker) | Luôn mới nhất lúc đọc |
| Độ phức tạp | Cao (queue, worker, cache invalidation) | Thấp hơn |
| Storage | Tốn (nhân bản feed) | Tiết kiệm |

> 💡 **Nguyên tắc:** Push tối ưu cho **đọc**, Pull tối ưu cho **ghi**. Vì News Feed đọc gấp 20 lần ghi → **mặc định nghiêng về push**. Nhưng push gãy ngay khi gặp celebrity. Lời giải thực tế gần như luôn là **hybrid**.

---

## 6. Bottleneck — bài toán Hot User / Celebrity

Đây là chỗ phân biệt ứng viên junior với senior. Push model giả định F nhỏ (~200). Nhưng nếu một celebrity có **50 triệu** follower đăng 1 post:

```
1 post  ->  50 triệu lần ghi vào feed cache
Nếu celebrity đăng dồn dập -> hàng trăm triệu thao tác ghi
-> "fan-out storm": queue ngập, worker quá tải, feed update trễ hàng phút,
   Redis nóng một vùng (hot shard).
```

### 6.1 Lời giải: HYBRID (push cho đa số, pull cho celebrity)

Phân loại tác giả theo số follower:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mô hình HYBRID — push cho tác giả thường, pull cho celebrity, merge lúc đọc</title>
  <desc>Lúc ghi: post tác giả thường được push vào feed cache follower; post celebrity lưu riêng không fan-out. Lúc đọc feed của Me: lấy base_feed đã push rồi merge với celeb_posts pull rồi sort ra trang đầu.</desc>
  <defs>
    <marker id="ah6" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="24" font-size="13" font-weight="700" fill="currentColor">LÚC GHI — phân loại theo số follower</text>
  <g font-size="11" stroke="currentColor" fill="none">
    <!-- normal author -->
    <rect x="16" y="40" width="200" height="44" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="116" y="59" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">post tác giả "thường"</text>
    <text x="116" y="75" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">follower &lt; ngưỡng (vd 10k)</text>
    <path d="M116 84 V108" stroke-opacity="0.5" marker-end="url(#ah6)"/>
    <rect x="16" y="112" width="200" height="44" rx="9" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.3"/>
    <text x="116" y="131" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">PUSH → feed cache</text>
    <text x="116" y="147" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">fan-out vào follower (5.1)</text>
    <!-- celebrity -->
    <rect x="248" y="40" width="200" height="44" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="348" y="59" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">post "celebrity"</text>
    <text x="348" y="75" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">follower &gt; ngưỡng</text>
    <path d="M348 84 V108" stroke-opacity="0.5" marker-end="url(#ah6)"/>
    <rect x="248" y="112" width="200" height="44" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke-opacity="0.3"/>
    <text x="348" y="131" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">KHÔNG fan-out</text>
    <text x="348" y="147" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">lưu riêng "celeb timeline"</text>
  </g>
  <line x1="16" y1="186" x2="704" y2="186" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/>
  <text x="16" y="210" font-size="13" font-weight="700" fill="currentColor">LÚC ĐỌC feed của Me — merge hai nguồn</text>
  <g font-size="11" stroke="currentColor" fill="none">
    <rect x="16" y="226" width="220" height="58" rx="9" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="126" y="248" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">base_feed</text>
    <text x="126" y="265" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.75">= đọc feed_cache[me]</text>
    <text x="126" y="279" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">(đã push sẵn — rẻ)</text>
    <rect x="16" y="296" width="220" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="126" y="318" font-size="11.5" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">celeb_posts</text>
    <text x="126" y="335" font-size="10" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.75">= PULL celebrity Me follow</text>
    <text x="126" y="349" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.6">(vài chục → rẻ)</text>
    <!-- merge -->
    <path d="M236 255 C300 255 300 290 336 290" stroke-opacity="0.5" marker-end="url(#ah6)"/>
    <path d="M236 325 C300 325 300 290 336 290" stroke-opacity="0.5" marker-end="url(#ah6)"/>
    <rect x="340" y="262" width="170" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="425" y="285" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">merge → sort</text>
    <text x="425" y="303" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">theo time/score</text>
    <path d="M510 290 H548" stroke-opacity="0.5" marker-end="url(#ah6)"/>
    <rect x="552" y="262" width="152" height="56" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.3"/>
    <text x="628" y="285" font-size="12" font-weight="700" text-anchor="middle" stroke="none" fill="currentColor">trang đầu</text>
    <text x="628" y="303" font-size="9.5" text-anchor="middle" stroke="none" fill="currentColor" opacity="0.7">trả về Me</text>
  </g>
  <text x="16" y="382" font-size="10.5" stroke="none" fill="currentColor" opacity="0.7">→ lấy phần tốt của cả hai: đa số push (đọc nhanh), celebrity pull (không bùng nổ fan-out).</text>
</svg>

Như vậy: số celebrity một người follow thường nhỏ (vài chục) → pull phần này rẻ; còn lại push. Ta lấy phần tốt của cả hai.

> ⚠️ **Bẫy thiết kế:** Ngưỡng phân loại không nên cứng nhắc và vĩnh viễn. Một user có thể "nổi" qua đêm (post viral). Cần job đánh giá lại nhãn celebrity/normal định kỳ, và xử lý lúc chuyển nhãn (backfill feed). Đừng hứa với interviewer một con số ngưỡng "thần thánh" — hãy nói nó là tham số cần đo và điều chỉnh.

### 6.2 Các kỹ thuật giảm tải push khác (nêu ra để ghi điểm)
- **Chỉ push cho user active gần đây**: nếu một follower không mở app 30 ngày, đừng tốn ghi feed cho họ — khi nào họ quay lại thì backfill (pull bù).
- **Async qua queue + batching**: gom nhiều thao tác ghi cache thành batch (pipeline Redis) để giảm round-trip.
- **Rate-limit / throttle** fan-out của tài khoản đăng quá nhanh.

---

## 7. Feed Ranking

Reverse-chronological (mới nhất lên đầu) là baseline đơn giản — sort theo `created_at`. Nhưng hầu hết mạng lớn dùng **ranked feed** (chọn cái user muốn xem, không phải cái mới nhất).

```
score = w1*recency + w2*affinity(me, author) + w3*engagement(post)
        + w4*content_type_pref - w5*đã_xem_rồi ...
```

Trade-off:

| Cách | Ưu | Nhược |
|---|---|---|
| Chronological | Đơn giản, dễ debug, "công bằng", dễ cache | Bỏ lỡ post hay của bạn thân nếu họ đăng lâu rồi |
| Ranked (ML) | Engagement cao, cá nhân hóa | Phức tạp, khó cache (score đổi), cần feature store + model serving, dễ tạo "bong bóng" |

Thực tế: precompute một **candidate set** (push/pull ra ~vài trăm post ứng viên), rồi **rank tại read-time** bằng model nhẹ trên candidate đó. Tách "lấy ứng viên" (rẻ, cache được) khỏi "chấm điểm" (cá nhân hóa, tươi).

> 💡 **Nguyên tắc:** Khi ranking phức tạp, đừng cố cache feed cuối cùng. Hãy cache **candidate set** ổn định, rank ở tầng đọc. Cache cái ít thay đổi, tính cái hay thay đổi.

---

## 8. Lưu trữ dữ liệu: Post & Relationship

**Post store** — key-value tra cứu theo `post_id`, ghi-một-lần đọc-nhiều:

```
PK = post_id
attrs: author_id, text, media_ids, created_at, counters(like/comment)
```

**Social graph (follow)** — cần truy vấn 2 chiều:

```
followers_of(user)  : ai follow user X?  (dùng khi fan-out push)
following_of(user)  : user X follow ai?  (dùng khi pull / build feed)
```

Lưu cả hai chiều (denormalize) để mỗi truy vấn là O(1) theo partition key, đổi lại tốn gấp đôi storage và phải ghi 2 bản khi follow/unfollow.

**Feed cache** — Redis, mỗi user một list/sorted-set giới hạn ~500–1000 phần tử (cắt đuôi để không phình). `ZADD` theo score, `ZREVRANGE` để đọc trang đầu.

> ⚠️ **Bẫy thiết kế:** Đừng lưu nội dung post đầy đủ trong feed cache của từng follower (nhân 50tr lần = nổ RAM). Chỉ lưu **post_id** (con trỏ); lúc đọc thì hydrate nội dung từ Post store / một cache post riêng. Tách "danh sách feed" khỏi "nội dung post".

---

## 9. Eventual consistency — chấp nhận có chủ đích

Hệ này **cố tình** không strong-consistent:

- Post đã ghi vào Post store, nhưng worker fan-out chưa chạy xong → vài giây sau follower mới thấy. **Chấp nhận được.**
- Unfollow xong nhưng feed cache vẫn còn vài post cũ của người đó → lọc lúc đọc (read-time filter) hoặc để tự rơi khỏi cửa sổ. **Chấp nhận được.**
- Counter like/comment hiển thị xấp xỉ (approximate). **Chấp nhận được.**

> 💡 **Nguyên tắc:** Eventual consistency không phải "bug được tha thứ" — nó là **lựa chọn kiến trúc** đổi consistency lấy availability + throughput. Điều quan trọng là **nói rõ ranh giới**: cái gì được phép trễ (feed của người khác) và cái gì KHÔNG (chính bạn vừa đăng phải thấy post của mình ngay → "read-your-own-write", thường giải bằng cách chèn post của chính mình vào feed ngay ở client/đọc).

---

## 10. Scale — khi lớn lên thì gãy ở đâu

| Bottleneck | Triệu chứng | Cách xử lý |
|---|---|---|
| Đường đọc DB | Feed chậm khi DAU tăng | Cache feed (push), tách read replica, CDN cho media |
| Fan-out storm (celebrity) | Queue ngập, feed trễ phút | Hybrid push/pull, throttle, chỉ push cho active user |
| Hot Redis shard | 1 celebrity / 1 key bị dồn | Shard theo user_id (consistent hashing), tách celebrity ra store riêng |
| Feed cache phình RAM | Chi phí Redis tăng | Cắt đuôi list (cap 500), TTL, chỉ giữ active user |
| Worker fan-out không kịp | Lag tăng dần | Scale out worker theo độ sâu queue, batching, partition queue |
| Media | Băng thông, latency ảnh | Object storage + CDN, KHÔNG để qua app server |

Mở rộng theo trục: **stateless service** (scale ngang sau load balancer), **shard cache & DB** theo `user_id`, **queue phân vùng** để fan-out song song, **CDN** đẩy media ra biên.

---

## 11. Liên hệ sang AWS

Ánh xạ kiến trúc trên sang service cụ thể (luôn nhớ: service chỉ là phương tiện, **trade-off vẫn vậy**):

| Thành phần thiết kế | AWS service | Vì sao |
|---|---|---|
| Post store & social graph | **DynamoDB** | Key-value, single-digit ms, scale ∞, on-demand. Dùng **single-table design** + **GSI** cho `followers_of` / `following_of` 2 chiều. Hợp access-pattern đọc-theo-key. |
| Feed cache | **ElastiCache (Redis)** | Sorted set cho feed list, sub-ms, `ZADD`/`ZREVRANGE`, cluster mode để shard theo user. |
| Hàng đợi fan-out | **SQS** | Tách post-write khỏi fan-out (async). Consumer là worker. Có DLQ cho post lỗi. Đơn giản, độ bền cao. |
| Sự kiện "post created" throughput cực cao / nhiều consumer | **Kinesis Data Streams** | Khi cần ordered, replayable, nhiều consumer (fan-out worker + ranking pipeline + analytics) đọc cùng stream. Shard theo author_id. |
| Worker fan-out | **Lambda** (event-driven) hoặc **ECS/EKS** (long-running, batch lớn) | Lambda hợp burst & đơn giản; container hợp khi fan-out celebrity cần batch nặng, kiểm soát concurrency. |
| Media (ảnh/video) | **S3 + CloudFront** | Object storage + CDN ở biên — đúng nguyên tắc "media không đi qua app". |
| Feed ranking / feature | **DynamoDB (feature)** + **SageMaker** (serving) | Tách candidate (cache) khỏi scoring (model). |

> ⚠️ **Bẫy thiết kế (AWS):** Đừng quăng celebrity fan-out vào DynamoDB không suy nghĩ — 50tr lần ghi dồn vào partition theo author sẽ gây **hot partition** và bị throttle. Đây chính là lý do kỹ thuật để tách celebrity sang nhánh pull. Trade-off ở tầng thiết kế (push vs pull) phản chiếu trực tiếp xuống tầng hạ tầng (hot partition của DynamoDB / hot key của Redis).

**SQS vs Kinesis cho fan-out (một đánh đổi hay bị hỏi):**

| | SQS | Kinesis |
|---|---|---|
| Thứ tự | Không đảm bảo (trừ FIFO, throughput thấp hơn) | Ordered theo shard |
| Replay | Không (đã xử lý là mất) | Có (giữ tới 365 ngày) |
| Nhiều consumer độc lập | Cần nhiều queue | Nhiều consumer cùng đọc 1 stream |
| Khi nào chọn | Chỉ cần fan-out worker, đơn giản | Cần thêm pipeline (ranking, analytics) đọc lại cùng dòng sự kiện |

---

## 12. Cách trình bày khi phỏng vấn / review

Cấu trúc 8–10 phút để không lan man:

1. **Làm rõ scope (1 phút):** "Tôi giả định read-heavy, eventual consistency OK, có celebrity. Đúng không ạ?" — chốt giả định trước khi vẽ.
2. **Đọc to con số estimation:** "~70k read QPS peak, 20:1 read:write → tôi sẽ tối ưu đường đọc bằng precompute." Con số dẫn dắt quyết định.
3. **Nêu trục đánh đổi chính ngay:** "Câu hỏi cốt lõi là feed dựng lúc nào — write hay read. Tôi đi push vì read-heavy, **nhưng** sẽ phải xử lý celebrity, nên thực tế là hybrid." Cho thấy bạn thấy trước cái bẫy.
4. **Vẽ high-level trước, deep-dive sau:** đừng sa vào schema khi chưa có bức tranh tổng.
5. **Chủ động tấn công thiết kế của chính mình:** "Điểm gãy là celebrity fan-out storm và hot shard — đây là cách tôi xử lý." Senior là người tự tìm ra bottleneck trước khi bị hỏi.
6. **Luôn nói trade-off, không nói 'cái này tốt nhất':** "Push đổi chi phí ghi lấy độ trễ đọc thấp; với workload này, đáng."

> 💡 **Nguyên tắc trình bày:** Interviewer không chấm "đáp án đúng" — họ chấm **chất lượng lập luận đánh đổi**. Một câu "tùy vào X, nếu X thì tôi chọn A, nếu Y thì chọn B" giá trị hơn một sơ đồ đẹp mà không giải thích vì sao.

> ⚠️ **Bẫy phỏng vấn:** Tránh hai cực: (1) over-engineer ngay từ đầu (nhét Kinesis + ML ranking khi chưa ai hỏi quy mô) — thừa và lộ thiếu phán đoán; (2) bỏ qua celebrity — gần như chắc chắn bị hỏi, không nói trước là mất điểm lớn. Bắt đầu đơn giản (push thuần), rồi **chủ động** phá nó bằng celebrity và nâng lên hybrid.

---

### Tóm tắt một dòng để nhớ
News Feed = **read-heavy + eventual consistency** → mặc định **push (fan-out on write) + cache feed**, **pull cho celebrity** (hybrid), **cursor pagination**, **rank candidate ở read-time**. Trên AWS: DynamoDB (post/graph) + ElastiCache (feed) + SQS/Kinesis (fan-out) + S3/CloudFront (media).
