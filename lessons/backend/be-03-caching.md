# Caching Patterns trong thực tế

Cache là một trong những công cụ rẻ nhất để tăng tốc hệ thống — và cũng là nguồn gốc của những bug khó chịu nhất ở production. Câu nói kinh điển "There are only two hard things in Computer Science: cache invalidation and naming things" không phải đùa. Bài này đi qua các pattern caching phổ biến, các bẫy thực tế (stampede, hot key, stale data) và cách thiết kế cache như một Solutions Architect thay vì chỉ "thêm Redis vào cho nhanh".

## Vì sao cache, và vì sao cache nguy hiểm

Cache giải quyết 3 vấn đề:

1. **Latency**: đọc từ RAM (Redis ~ sub-ms) nhanh hơn đọc từ disk/DB (vài ms đến hàng chục ms) 10–100 lần.
2. **Throughput**: giảm tải cho DB — thường là tài nguyên đắt nhất và khó scale nhất.
3. **Chi phí**: 1 node Redis có thể đỡ lượng read mà phải vài read replica DB mới chịu nổi.

Nhưng cache đưa vào hệ thống một **bản sao dữ liệu thứ hai**, và mọi bản sao đều đặt ra câu hỏi: *khi nào hai bản sao lệch nhau, và lệch bao lâu thì chấp nhận được?* Toàn bộ độ khó của caching nằm ở câu hỏi này.

> 💡 Ghi nhớ: Cache không phải "tối ưu hoá miễn phí". Nó là một trade-off có chủ đích: đổi **consistency** và **độ phức tạp vận hành** lấy **latency** và **throughput**. Nếu bạn không trả lời được "dữ liệu này stale tối đa bao lâu thì chấp nhận được?", bạn chưa sẵn sàng cache nó.

## Bốn pattern kinh điển

### 1. Cache-aside (Lazy loading)

Pattern phổ biến nhất. Application tự quản lý cache: đọc cache trước, miss thì đọc DB rồi tự ghi vào cache.

```python
def get_user(user_id):
    key = f"user:{user_id}"
    cached = redis.get(key)
    if cached is not None:
        return deserialize(cached)          # cache hit
    user = db.query("SELECT ... WHERE id = %s", user_id)  # cache miss
    redis.set(key, serialize(user), ex=300) # TTL 5 phút
    return user
```

- **Ưu**: đơn giản, cache fail thì app vẫn chạy (chỉ chậm hơn), chỉ cache dữ liệu thực sự được đọc.
- **Nhược**: miss đầu tiên chậm (cold start), logic cache rải khắp codebase, dễ quên invalidate khi update.

### 2. Read-through

Giống cache-aside về luồng dữ liệu, nhưng **cache layer tự đi load từ DB** khi miss — application chỉ nói chuyện với cache. Cần thư viện/middleware hỗ trợ (ví dụ DAX của DynamoDB, hoặc một lớp DAO tự viết).

- **Ưu**: code application sạch, logic load tập trung một chỗ, dễ chống stampede tại tầng cache.
- **Nhược**: cache trở thành điểm phụ thuộc bắt buộc trên đường đọc; cần cache hiểu được cách load dữ liệu.

### 3. Write-through

Mỗi lần ghi, application ghi **đồng thời** vào cache và DB (cache ghi xong mới ack, hoặc ghi qua cache rồi cache ghi xuống DB).

- **Ưu**: cache luôn "ấm" và gần như đồng bộ với DB sau mỗi write — read sau write thấy ngay dữ liệu mới.
- **Nhược**: write latency tăng (2 lần ghi); tốn RAM cho dữ liệu có thể không bao giờ được đọc lại. Thường kết hợp write-through + TTL để dọn dữ liệu nguội.

### 4. Write-behind (Write-back)

Ghi vào cache, **ack ngay**, rồi cache flush xuống DB bất đồng bộ (theo batch hoặc theo chu kỳ).

- **Ưu**: write latency cực thấp, gom batch giảm tải DB — phù hợp counter, like, view count, telemetry.
- **Nhược**: **rủi ro mất dữ liệu** nếu cache chết trước khi flush. Đây là pattern duy nhất trong 4 pattern mà cache giữ dữ liệu *chưa tồn tại* trong DB — chỉ dùng cho dữ liệu chấp nhận mất một phần.

### Bốn pattern cạnh nhau

Bốn pattern khác nhau ở hai chỗ: **ai đi load khi miss** và **write đi đường nào**. Đọc theo từng cột:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bốn cache pattern: cache-aside, read-through, write-through, write-behind</title>
  <desc>So sánh luồng read và write của bốn pattern giữa App, Cache và DB. Cache-aside: app tự đọc cache rồi load DB khi miss. Read-through: cache layer tự load DB khi miss. Write-through: app ghi cache và DB đồng bộ. Write-behind: app ghi cache, ack ngay, cache flush DB async.</desc>
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" text-anchor="middle">
    <text x="55" y="22" font-size="11" fill="currentColor" opacity="0.7">read ──</text>
    <text x="120" y="22" font-size="11" fill="currentColor" opacity="0.7">write - - -</text>
  </g>
  <g>
    <text x="95" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Cache-aside</text>
    <text x="285" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Read-through</text>
    <text x="475" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Write-through</text>
    <text x="665" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Write-behind</text>
  </g>
  <g font-size="10.5" text-anchor="middle" fill="currentColor">
    <rect x="50" y="62" width="90" height="30" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="95" y="81">App</text>
    <rect x="50" y="175" width="90" height="30" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="95" y="194">Cache</text>
    <rect x="50" y="288" width="90" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="95" y="307">DB</text>
    <rect x="240" y="62" width="90" height="30" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="285" y="81">App</text>
    <rect x="240" y="175" width="90" height="30" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="285" y="194">Cache</text>
    <rect x="240" y="288" width="90" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="285" y="307">DB</text>
    <rect x="430" y="62" width="90" height="30" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="475" y="81">App</text>
    <rect x="430" y="175" width="90" height="30" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="475" y="194">Cache</text>
    <rect x="430" y="288" width="90" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="475" y="307">DB</text>
    <rect x="620" y="62" width="90" height="30" rx="7" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="665" y="81">App</text>
    <rect x="620" y="175" width="90" height="30" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="665" y="194">Cache</text>
    <rect x="620" y="288" width="90" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="665" y="307">DB</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ar)">
    <path d="M75 92 V173"/>
    <path d="M280 92 V173"/>
    <path d="M285 205 V286"/>
    <path d="M460 92 V173"/>
    <path d="M490 205 V286"/>
    <path d="M665 92 V173"/>
    <path d="M665 205 V286" stroke-dasharray="5 4" stroke-opacity="0.7"/>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ar)" stroke-dasharray="5 4">
    <path d="M115 92 V286"/>
    <path d="M315 92 V286"/>
    <path d="M495 92 V173"/>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ar)" stroke-opacity="0.6">
    <path d="M105 173 V96"/>
    <path d="M295 173 V96"/>
  </g>
  <g font-size="9.5" fill="currentColor" opacity="0.7" text-anchor="middle">
    <text x="155" y="140">read: miss</text>
    <text x="155" y="155">→ load DB,</text>
    <text x="155" y="245">app set lại</text>
    <text x="350" y="140">cache tự</text>
    <text x="350" y="245">load khi miss</text>
    <text x="540" y="140">ghi cache</text>
    <text x="540" y="155">+ DB</text>
    <text x="540" y="245">đồng bộ</text>
    <text x="700" y="140">ack ngay</text>
    <text x="700" y="245">flush async</text>
  </g>
</svg>

### Bảng so sánh

| Pattern | Ai load khi miss | Write path | Stale risk | Mất data nếu cache chết | Use case điển hình |
|---|---|---|---|---|---|
| Cache-aside | Application | App ghi DB, (xoá/ghi cache) | Trung bình | Không | Mặc định cho hầu hết hệ thống |
| Read-through | Cache layer | App ghi DB | Trung bình | Không | Khi có sẵn lớp DAO/proxy (DAX) |
| Write-through | (cache luôn ấm) | App ghi cache + DB đồng bộ | Thấp | Không | Read-after-write quan trọng |
| Write-behind | — | Ghi cache, flush DB async | Thấp (cache là nguồn mới nhất) | **Có** | Counter, metrics, dữ liệu chịu mất |

> 💡 Ghi nhớ: 90% hệ thống dùng **cache-aside + TTL + xoá key khi update**. Bắt đầu từ đó; chỉ chuyển pattern khác khi có lý do đo đạc được.

## TTL & Invalidation — vì sao là bài toán khó

Có hai chiến lược làm cache "hết sai": **TTL** (để key tự chết) và **invalidation chủ động** (xoá/ghi đè key khi dữ liệu gốc thay đổi).

### TTL: đơn giản nhưng là phép đánh đổi

- TTL ngắn → ít stale, nhưng hit ratio thấp, DB chịu tải nhiều hơn.
- TTL dài → hit ratio cao, nhưng user có thể thấy dữ liệu cũ hàng phút/giờ.
- TTL đúng = trả lời câu hỏi nghiệp vụ: *"giá sản phẩm sai trong 60 giây có gây thiệt hại không?"* — đây là quyết định **product**, không phải quyết định kỹ thuật thuần.

### Invalidation chủ động: vì sao khó

Lý thuyết thì dễ: update DB xong thì `DEL` key. Thực tế:

1. **Race condition kinh điển của cache-aside**:

```text
T1 (reader): cache miss → đọc DB được giá trị CŨ
T2 (writer): update DB → DEL cache key
T1 (reader): SET cache = giá trị CŨ   ← cache giờ sai cho đến hết TTL!
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" role="img" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Race condition kinh điển của cache-aside theo timeline</title>
  <desc>Sequence theo thời gian đi xuống với hai tác nhân T1 reader và T2 writer cùng tác động lên Cache và DB. T1 đọc DB được giá trị cũ, T2 update DB rồi DEL cache, sau đó T1 SET lại giá trị cũ khiến cache sai đến hết TTL.</desc>
  <defs>
    <marker id="ra2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">
    <text x="100" y="26">T1 (reader)</text>
    <text x="300" y="26">Cache</text>
    <text x="480" y="26">DB</text>
    <text x="630" y="26">T2 (writer)</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4">
    <path d="M100 36 V340"/>
    <path d="M300 36 V340"/>
    <path d="M480 36 V340"/>
    <path d="M630 36 V340"/>
  </g>
  <text x="16" y="50" font-size="10" fill="currentColor" opacity="0.55">thời gian</text>
  <path d="M24 58 V330" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#ra2)" fill="none"/>
  <g stroke="currentColor" fill="none" marker-end="url(#ra2)">
    <path d="M100 78 H296"/>
    <path d="M100 130 H476"/>
    <path d="M630 200 H484"/>
    <path d="M630 250 H304"/>
    <path d="M100 308 H296"/>
  </g>
  <g font-size="10.5" fill="currentColor">
    <text x="120" y="72">① đọc cache → MISS</text>
    <text x="120" y="124">② đọc DB → nhận giá trị CŨ (v1)</text>
    <text x="350" y="194" text-anchor="end">③ UPDATE DB → v2</text>
    <text x="350" y="244" text-anchor="end">④ DEL cache key</text>
    <text x="120" y="302" fill="#f59e0b">⑤ SET cache = v1 (CŨ!)</text>
  </g>
  <rect x="44" y="318" width="612" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="350" y="337" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Cache giữ v1 (sai) đến khi hết TTL — dù DB đã là v2</text>
</svg>

Cửa sổ race này nhỏ nhưng ở traffic lớn thì *chắc chắn* xảy ra. Giải pháp thực dụng: luôn đặt TTL làm lưới an toàn (stale tối đa = TTL), hoặc dùng versioning/compare-and-set, hoặc "delayed double delete" (xoá lần 2 sau vài trăm ms).

2. **DB commit và cache delete không atomic**: nếu ghi DB thành công nhưng xoá cache fail (network blip), cache sai vô thời hạn nếu không có TTL. Hệ thống lớn hay dùng **CDC (Change Data Capture)** — đọc binlog/WAL của DB rồi invalidate cache — để tách invalidation khỏi code application.

3. **Một bản ghi nằm trong nhiều key**: user A xuất hiện trong `user:A`, `team:42:members`, `search:abc`, trang HTML đã render... Update user A phải biết xoá *tất cả*. Đây là lý do nên hạn chế cache dữ liệu đã denormalize/tổng hợp, hoặc chấp nhận TTL ngắn cho chúng.

> ⚠️ Bẫy production: Xoá cache **trước** khi update DB là sai (reader chen vào giữa sẽ cache lại giá trị cũ). Thứ tự đúng cho cache-aside là: **update DB trước, xoá cache sau**, kèm TTL. Và "update cache thay vì xoá" còn nguy hiểm hơn — hai writer đồng thời có thể ghi cache theo thứ tự ngược với DB.

## Cache stampede (dogpile) và cách chống

Kịch bản: key `homepage:feed` được 5.000 request/giây đọc. Đúng lúc TTL hết, **cả nghìn request cùng miss và cùng lao vào DB** chạy một query nặng. DB nghẽn → request chậm → càng nhiều request dồn lại → sập dây chuyền. Đây là stampede.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache stampede so với single-flight</title>
  <desc>Hai cột. Bên trái: TTL hết, hàng nghìn request cùng miss cùng lao vào DB gây nghẽn. Bên phải single-flight: chỉ một request đi tính lại và ghi cache, các request còn lại chờ hoặc dùng giá trị stale, DB nhẹ tải.</desc>
  <defs>
    <marker id="st1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Stampede (dogpile)</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Single-flight</text>
  <line x1="360" y1="14" x2="360" y2="316" stroke="currentColor" stroke-opacity="0.2"/>
  <g font-size="10" text-anchor="middle" fill="currentColor">
    <rect x="30" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="55" y="61">req</text>
    <rect x="90" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="115" y="61">req</text>
    <rect x="150" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="175" y="61">req</text>
    <rect x="210" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="235" y="61">req</text>
    <rect x="270" y="44" width="60" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="300" y="61">×1000</text>
  </g>
  <text x="180" y="98" font-size="10.5" text-anchor="middle" fill="#f59e0b">TTL hết → tất cả cùng MISS</text>
  <g stroke="currentColor" fill="none" marker-end="url(#st1)" stroke-opacity="0.7">
    <path d="M55 106 L170 158"/>
    <path d="M115 106 L178 158"/>
    <path d="M175 106 L182 158"/>
    <path d="M235 106 L188 158"/>
    <path d="M300 106 L195 158"/>
  </g>
  <rect x="120" y="162" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="180" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
  <text x="180" y="195" font-size="9.5" text-anchor="middle" fill="currentColor">query nặng ×1000</text>
  <text x="180" y="230" font-size="11" font-weight="700" text-anchor="middle" fill="#f59e0b">DB nghẽn → sập dây chuyền</text>
  <g font-size="10" text-anchor="middle" fill="currentColor">
    <rect x="390" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="415" y="61">req</text>
    <rect x="450" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="475" y="61">req</text>
    <rect x="510" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="535" y="61">req</text>
    <rect x="570" y="44" width="50" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="595" y="61">req</text>
    <rect x="630" y="44" width="60" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/><text x="660" y="61">×1000</text>
  </g>
  <rect x="400" y="92" width="280" height="26" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="540" y="109" font-size="10" text-anchor="middle" fill="currentColor">lock / single-flight — chỉ 1 request qua</text>
  <g stroke="currentColor" fill="none" marker-end="url(#st1)">
    <path d="M415 118 L495 158"/>
  </g>
  <g stroke="currentColor" fill="none" stroke-dasharray="4 4" stroke-opacity="0.6">
    <path d="M475 118 V140"/><path d="M535 118 V140"/><path d="M595 118 V140"/><path d="M660 118 V140"/>
  </g>
  <text x="600" y="135" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">chờ / serve stale</text>
  <rect x="480" y="162" width="120" height="40" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="540" y="180" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">DB</text>
  <text x="540" y="195" font-size="9.5" text-anchor="middle" fill="currentColor">1 query duy nhất</text>
  <text x="540" y="230" font-size="11" font-weight="700" text-anchor="middle" fill="#10b981">DB nhẹ tải → ổn định</text>
</svg>

Ba kỹ thuật chống, thường dùng kết hợp:

### 1. Lock / single-flight

Chỉ cho **một** request đi tính lại giá trị; số còn lại đợi hoặc tạm dùng giá trị stale.

```python
def get_feed():
    val = redis.get("feed")
    if val: return val
    # Chỉ 1 process lấy được lock
    if redis.set("feed:lock", "1", nx=True, ex=10):
        try:
            val = expensive_db_query()
            redis.set("feed", val, ex=300)
        finally:
            redis.delete("feed:lock")
        return val
    # Không lấy được lock: serve stale hoặc retry ngắn
    return redis.get("feed:stale") or retry_with_backoff()
```

Trong một process, Go có `singleflight`, Node có thể dedupe bằng cách share cùng một Promise đang pending.

### 2. Early refresh (refresh-ahead / probabilistic early expiration)

Đừng đợi key chết mới load lại. Khi key sắp hết hạn (ví dụ còn <10% TTL), một request "tình nguyện" refresh nền trong khi những request khác vẫn dùng giá trị cũ. Biến thể xác suất (XFetch) cho mỗi request một xác suất nhỏ refresh sớm, tăng dần khi gần expiry — tránh việc tất cả cùng refresh tại một thời điểm.

Một biến thể quan trọng: **stale-while-revalidate** — serve giá trị đã hết hạn ngay lập tức, đồng thời refresh nền. Latency của user không bao giờ phải trả giá cho cache miss.

### 3. Jitter cho TTL

Nếu bạn warm 10.000 key cùng lúc với TTL 300s, đúng 300s sau bạn có 10.000 miss cùng lúc. Thêm jitter ngẫu nhiên:

```python
ttl = 300 + random.randint(0, 60)   # 300–360s, dàn đều expiry
```

> ⚠️ Bẫy production: Stampede hay xuất hiện lần đầu sau một lần **deploy hoặc restart Redis** (cache lạnh toàn bộ). Hãy có kế hoạch cold-start: warm-up script, rate limit xuống DB, hoặc circuit breaker — đừng để "restart cache" đồng nghĩa "sập DB".

## Hot key

Hot key là một key nhận lượng truy cập áp đảo — sản phẩm đang flash sale, profile của celebrity, config toàn cục. Vấn đề: trong Redis Cluster, **một key chỉ nằm trên một shard** → một shard gánh toàn bộ tải, thêm node không giúp gì.

Cách xử lý:

- **Local cache phía trước** (in-process, TTL 1–5 giây): chặn phần lớn request trước khi chạm Redis. Hot key thường chịu được stale vài giây.
- **Key replication**: nhân bản thành `product:123:#0` ... `product:123:#9`, client đọc random một bản — dàn tải ra nhiều shard. Đổi lại: invalidate phải xoá cả 10 bản.
- **Phát hiện**: dùng `redis-cli --hotkeys`, hoặc metrics per-shard (một shard CPU cao bất thường là dấu hiệu).

## Negative caching

Cache cả câu trả lời **"không tồn tại"**. Nếu không, mỗi request hỏi `user:999999` (không có trong DB) đều xuyên thẳng xuống DB — và attacker có thể lợi dụng điều này (cache penetration) bằng cách bắn hàng loạt ID không tồn tại.

```python
user = db.find(user_id)
if user is None:
    redis.set(key, "__NULL__", ex=30)   # TTL ngắn hơn dữ liệu thật
    return None
```

Lưu ý: TTL của negative cache nên **ngắn** (user vừa được tạo phải xuất hiện sớm). Với keyspace cực lớn, có thể chặn bằng **Bloom filter** trước cache.

## Cache key design

Key tốt là key **đoán được, có namespace, có version**:

```text
{app}:{entity}:{version}:{id}[:{biến_thể}]
shop:product:v2:12345
shop:product:v2:12345:locale=vi
```

Nguyên tắc:

- **Namespace theo entity + schema version**: đổi format dữ liệu cache (thêm field, đổi serializer) → bump `v2` lên `v3`, toàn bộ key cũ tự nhiên bị bỏ qua thay vì phải flush. Đây là cách "invalidate hàng loạt" rẻ nhất.
- **Mọi tham số ảnh hưởng kết quả phải nằm trong key**: locale, currency, user tier, query params. Thiếu một tham số = hai user thấy nhầm dữ liệu của nhau — đây là **lỗi bảo mật**, không chỉ là bug.
- **Chuẩn hoá trước khi tạo key**: sort query params, lowercase, trim — `?a=1&b=2` và `?b=2&a=1` phải ra cùng key.
- Đừng nhét raw user input dài vào key — hash nó (`sha256[:16]`) để tránh key khổng lồ và ký tự lạ.

> ⚠️ Bẫy production: Cache response API theo URL mà quên rằng response phụ thuộc header `Authorization` → user A nhận về giỏ hàng của user B. Lỗi này xuất hiện đều đặn hằng năm ở các công ty lớn (kể cả qua CDN). Quy tắc: **dữ liệu cá nhân hoá thì key phải chứa định danh user, hoặc đừng cache ở tầng dùng chung.**

## Local cache vs distributed cache

| Tiêu chí | Local (in-process: dict, Caffeine, lru-cache) | Distributed (Redis, Memcached) |
|---|---|---|
| Latency | ~100ns (không network) | ~0.5–1ms (network hop) |
| Consistency giữa các instance | Mỗi instance một bản — lệch nhau | Một bản dùng chung |
| Dung lượng | Giới hạn bởi heap/RAM của process | Scale riêng, hàng trăm GB |
| Mất khi deploy/restart | Có (mỗi lần deploy là cold) | Không |
| Invalidation | Khó (phải pub/sub broadcast tới mọi instance) | Một lệnh DEL |
| Chi phí vận hành | Gần như 0 | Một hệ thống phải quản lý, monitor, failover |

Kiến trúc thực dụng là **multi-tier (L1/L2)**: local cache TTL rất ngắn (1–10s) chặn hot path, Redis phía sau TTL dài hơn làm nguồn dùng chung, DB cuối cùng. L1 hấp thụ hot key và spike; L2 giữ hit ratio cao và nhất quán giữa các instance. Nếu cần invalidate L1 chủ động, dùng Redis pub/sub hoặc client-side caching (Redis 6+ có `CLIENT TRACKING` push invalidation về client).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc multi-tier read path: CDN → L1 → L2 → read replica → DB</title>
  <desc>Chuỗi tầng đọc từ user xuống nguồn dữ liệu. Mỗi tầng hấp thụ phần lớn request và chỉ để lọt phần miss cho tầng sau: CDN edge, local cache L1, distributed cache L2 Redis, read replica, cuối cùng là DB chính. Số request giảm dần qua từng tầng.</desc>
  <defs>
    <marker id="mt1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="12.5" font-weight="700" fill="currentColor">Read path — mỗi tầng chặn bớt request cho tầng sau</text>
  <g text-anchor="middle">
    <rect x="20" y="80" width="100" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="105" font-size="12" font-weight="700" fill="currentColor">CDN / edge</text>
    <text x="70" y="123" font-size="9.5" fill="currentColor" opacity="0.7">gần user nhất</text>
    <rect x="158" y="80" width="100" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="208" y="101" font-size="12" font-weight="700" fill="currentColor">Local L1</text>
    <text x="208" y="118" font-size="9.5" fill="currentColor" opacity="0.7">in-process</text>
    <text x="208" y="130" font-size="9.5" fill="currentColor" opacity="0.7">TTL 1–10s</text>
    <rect x="296" y="80" width="110" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="351" y="101" font-size="12" font-weight="700" fill="currentColor">Distributed L2</text>
    <text x="351" y="118" font-size="9.5" fill="currentColor" opacity="0.7">Redis dùng chung</text>
    <text x="351" y="130" font-size="9.5" fill="currentColor" opacity="0.7">TTL dài hơn</text>
    <rect x="444" y="80" width="110" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="499" y="105" font-size="12" font-weight="700" fill="currentColor">Read replica</text>
    <text x="499" y="123" font-size="9.5" fill="currentColor" opacity="0.7">đọc scale-out</text>
    <rect x="592" y="80" width="108" height="56" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="646" y="105" font-size="12" font-weight="700" fill="currentColor">DB chính</text>
    <text x="646" y="123" font-size="9.5" fill="currentColor" opacity="0.7">nguồn sự thật</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#mt1)">
    <path d="M120 108 H156"/>
    <path d="M258 108 H294"/>
    <path d="M406 108 H442"/>
    <path d="M554 108 H590"/>
  </g>
  <g font-size="9" fill="currentColor" opacity="0.7" text-anchor="middle">
    <text x="138" y="100">miss</text>
    <text x="276" y="100">miss</text>
    <text x="424" y="100">miss</text>
    <text x="572" y="100">miss</text>
  </g>
  <text x="20" y="180" font-size="10" fill="currentColor" opacity="0.7">Lượng request lọt xuống tầng sau (giảm dần):</text>
  <g>
    <rect x="20" y="190" width="100" height="20" rx="4" fill="#3b82f6" fill-opacity="0.5"/>
    <rect x="158" y="190" width="70" height="20" rx="4" fill="#10b981" fill-opacity="0.5"/>
    <rect x="296" y="190" width="44" height="20" rx="4" fill="#10b981" fill-opacity="0.5"/>
    <rect x="444" y="190" width="26" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.5"/>
    <rect x="592" y="190" width="14" height="20" rx="4" fill="#f59e0b" fill-opacity="0.6"/>
  </g>
  <text x="360" y="248" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Đẩy cache càng gần user càng tốt — với điều kiện dữ liệu chịu được stale</text>
</svg>

## CDN cache cho API

Cache không chỉ cho HTML/ảnh. API response **public, đọc nhiều, ít đổi** (danh mục sản phẩm, config, kết quả search phổ biến) cache ở CDN edge là rẻ và hiệu quả nhất — request không bao giờ chạm vào server của bạn.

Điều khiển bằng HTTP headers chuẩn:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=300
Vary: Accept-Language
ETag: "abc123"
```

- `max-age`: TTL tại edge và browser. `s-maxage` nếu muốn TTL riêng cho shared cache.
- `stale-while-revalidate`: CDN serve bản cũ trong khi fetch bản mới — user không thấy miss.
- `Vary`: khai báo header nào tạo ra biến thể response (cẩn thận — `Vary` sai gây leak dữ liệu như đã nói ở trên).
- `private` / `no-store`: bắt buộc cho response có dữ liệu user.
- Invalidation chủ động qua **purge API** của CDN khi dữ liệu đổi — nhưng purge là thao tác chậm và có giới hạn rate, đừng thiết kế hệ thống phụ thuộc purge liên tục.

> 💡 Ghi nhớ: Thứ tự ưu tiên khi tối ưu read path: **CDN/edge → local cache → distributed cache → read replica → DB**. Mỗi tầng chặn được request thì các tầng sau rẻ đi tương ứng. Đẩy cache càng gần user càng tốt — với điều kiện dữ liệu chịu được stale.

## Consistency giữa cache và DB

Hãy chấp nhận sự thật: với cache-aside + invalidation, bạn có **eventual consistency**, không hơn. Câu hỏi đúng không phải "làm sao để strong consistency với cache" (gần như bất khả thi mà vẫn giữ được lợi ích cache), mà là:

1. **Bound staleness**: TTL là cận trên của độ lệch. Mọi key đều phải có TTL, kể cả khi bạn invalidate chủ động — TTL là lưới an toàn cho mọi race và mọi lần invalidate fail.
2. **Read-your-own-writes khi cần**: user vừa sửa profile phải thấy ngay bản mới. Giải pháp: sau write, đọc thẳng DB (bypass cache) cho chính user đó trong N giây, hoặc write-through cho riêng entity đó.
3. **CDC-based invalidation** cho hệ thống lớn: consumer đọc binlog/DynamoDB Streams → xoá cache. Invalidation trở thành sự kiện đáng tin, không phụ thuộc mọi code path ghi DB đều nhớ gọi `DEL`.
4. **Đường nào cần đúng tuyệt đối thì đừng đi qua cache**: kiểm tra số dư trước khi trừ tiền, check quyền trước thao tác nhạy cảm — đọc DB (hoặc dùng conditional write tại DB). Cache phục vụ hiển thị, DB phục vụ quyết định.

## Metrics phải theo dõi

Cache không có metrics là cache bạn không biết đang giúp hay đang hại.

| Metric | Ý nghĩa | Ngưỡng/dấu hiệu |
|---|---|---|
| **Hit ratio** (hits / (hits+misses)) | Hiệu quả tổng thể của cache | <80% với read-heavy: xem lại TTL, key design, dung lượng. Theo dõi **per key-pattern**, không chỉ tổng |
| **Eviction rate** | Key bị đuổi vì hết RAM trước khi hết TTL | Eviction cao + hit ratio giảm = cache thiếu RAM hoặc đang cache rác |
| **Latency p99 của cache** | Redis chậm = mọi thứ chậm | p99 > vài ms: nghi network, big key, lệnh O(N) (`KEYS`, `SMEMBERS` lớn) |
| **Memory usage & fragmentation** | Sắp đầy → eviction storm | Cảnh báo từ 80% |
| **DB load tương quan** | Mục tiêu cuối của cache | Hit ratio tăng mà DB load không giảm → đang cache sai thứ |
| **Stale-serve count / lock wait** | Sức khoẻ cơ chế chống stampede | Tăng đột biến quanh thời điểm deploy/expiry |

> ⚠️ Bẫy production: Hit ratio 99% nghe đẹp nhưng có thể vô nghĩa — nếu 99% đó là các key rẻ tiền còn 1% miss rơi đúng vào query nặng nhất. Luôn đo **chi phí của miss** (DB time tiết kiệm được), không chỉ đếm hit. Và nhớ: khi cache hit ratio quá cao quá lâu, DB của bạn đã "quen" tải thấp — một lần cache flush có thể là lần đầu DB thấy 100% traffic sau nhiều tháng.

## Checklist thiết kế cache (tóm tắt)

- [ ] Dữ liệu này stale tối đa bao lâu thì chấp nhận được? → quyết định TTL.
- [ ] Mọi key đều có TTL (kể cả khi có invalidation chủ động) + jitter.
- [ ] Thứ tự write: DB trước, xoá cache sau.
- [ ] Key có namespace, version, và chứa đủ mọi tham số tạo biến thể.
- [ ] Có cơ chế chống stampede cho key đắt tiền (lock/single-flight hoặc stale-while-revalidate).
- [ ] Negative caching cho lookup "không tồn tại".
- [ ] Cache fail thì app degrade (chậm) chứ không chết — timeout ngắn + fallback DB + circuit breaker.
- [ ] Dashboard: hit ratio per pattern, eviction, p99, memory.
- [ ] Đường quyết định nghiệp vụ quan trọng không phụ thuộc cache.

## Liên hệ sang AWS

| Khái niệm trong bài | Service AWS | Ghi chú |
|---|---|---|
| Distributed cache (cache-aside, write-through) | **ElastiCache for Redis / Valkey** | Managed Redis: replication, Multi-AZ failover, cluster mode để shard. ElastiCache Serverless tự scale, hợp với tải biến động. Memcached cho cache thuần KV không cần persistence/pub-sub |
| Read-through / write-through tự động | **DynamoDB Accelerator (DAX)** | Đúng nghĩa read-through + write-through cho DynamoDB: app gọi qua DAX client, không phải tự viết logic cache. Microsecond read, eventual consistency |
| CDN cache cho API, stale-while-revalidate, purge | **CloudFront** | Cache theo `Cache-Control`, cache policy điều khiển key (header/query/cookie nào vào cache key — chính là "cache key design"), invalidation API, origin shield giảm stampede về origin |
| Cache ngay tại tầng API | **API Gateway cache** | Bật cache per-stage (REST API), TTL 0–3600s, cache key theo query/header. Lưu ý: là giải pháp nhanh nhưng đắt hơn và kém linh hoạt hơn CloudFront đứng trước |
| CDC-based invalidation | **DynamoDB Streams / DMS + Kinesis → Lambda** | Lambda consume stream sự kiện thay đổi dữ liệu và DEL key trên ElastiCache — invalidation tách khỏi application code |
| Metrics & alarm | **CloudWatch** | ElastiCache metrics: `CacheHitRate`, `Evictions`, `DatabaseMemoryUsagePercentage`, `EngineCPUUtilization`; CloudFront: `CacheHitRate` per distribution |
| Hot key / L1 local cache | — | Trên AWS vẫn là bài toán application-level: local cache trong container/Lambda + ElastiCache cluster mode; dùng `--hotkeys` và per-node CloudWatch metrics để phát hiện shard nóng |

Khi thi SAA hay thiết kế thực tế trên AWS, mẫu câu hỏi điển hình: *"giảm read load cho RDS/Aurora"* → ElastiCache (cache-aside) hoặc read replica; *"microsecond latency cho DynamoDB mà không sửa nhiều code"* → DAX; *"giảm latency cho user toàn cầu với API ít đổi"* → CloudFront trước API. Bản chất mỗi đáp án đều quay về các pattern và trade-off trong bài này.
