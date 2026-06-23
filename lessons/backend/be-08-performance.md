# Performance & Profiling

## Vì sao bài này quan trọng

Tối ưu hiệu năng là kỹ năng phân biệt một mid-level developer với một Solutions Architect. Mid-level dev thấy chậm thì thêm cache, thêm index, đổi ngôn ngữ. Architect thì **đo trước, tìm bottleneck thật, rồi mới tối ưu đúng chỗ** — và biết khi nào *không* cần tối ưu.

> 💡 Ghi nhớ: "Premature optimization is the root of all evil" (Knuth) không có nghĩa là bỏ qua hiệu năng — mà là **không tối ưu khi chưa có số liệu**. Câu đầy đủ của Knuth còn vế sau: "yet we should not pass up our opportunities in that critical 3%".

## 1. Đo trước khi tối ưu: p50/p95/p99 và vì sao average nói dối

### Average là chỉ số tệ nhất để nhìn latency

Giả sử 100 request: 99 request mất 10ms, 1 request mất 5000ms.

- **Average** = (99×10 + 5000) / 100 ≈ **60ms** → trông "ổn"
- **p50 (median)** = 10ms → đa số user thấy nhanh
- **p99** = 5000ms → 1% user thấy hệ thống "chết"

Average bị kéo lệch bởi outlier, và tệ hơn: nó **che giấu phân phối bimodal** (hai cụm nhanh/chậm — ví dụ cache hit vs cache miss). Latency thực tế gần như không bao giờ là phân phối chuẩn, nên mean và standard deviation đều vô nghĩa.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân phối latency bimodal và vì sao average nói dối</title>
  <desc>Histogram 100 request: 99 request cụm 10ms (cache hit) và 1 request 5000ms (cache miss). p50=10ms, p99=5000ms, nhưng average ≈ 60ms bị outlier kéo lệch, nằm giữa hai cụm nơi không có request nào thật sự.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">99 request 10ms + 1 request 5000ms → 4 con số rất khác nhau</text>
  <line x1="60" y1="240" x2="700" y2="240" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="60" y1="60" x2="60" y2="240" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="52" y="244" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">0</text>
  <text x="52" y="74" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">99</text>
  <text x="20" y="160" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6" transform="rotate(-90 20 160)">số request</text>
  <text x="380" y="270" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">latency (thang log) →</text>
  <g>
    <rect x="90" y="66" width="48" height="174" rx="4" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="114" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">99 req</text>
    <text x="114" y="254" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">~10ms</text>
    <text x="114" y="200" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">cache hit</text>
  </g>
  <g>
    <rect x="612" y="232" width="48" height="8" rx="2" fill="#f59e0b" fill-opacity="0.85" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="636" y="224" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">1 req</text>
    <text x="636" y="254" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">5000ms</text>
    <text x="636" y="210" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">cache miss</text>
  </g>
  <g stroke-dasharray="4 3" stroke-width="1.5">
    <line x1="114" y1="60" x2="114" y2="240" stroke="#10b981"/>
    <line x1="300" y1="60" x2="300" y2="240" stroke="#ef4444"/>
    <line x1="636" y1="60" x2="636" y2="240" stroke="#3b82f6"/>
  </g>
  <g font-size="11" font-weight="700">
    <rect x="80" y="288" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="140" y="303" text-anchor="middle" fill="currentColor">p50 = 10ms</text>
    <rect x="246" y="288" width="148" height="22" rx="11" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="320" y="303" text-anchor="middle" fill="currentColor">average ≈ 60ms (nói dối)</text>
    <rect x="568" y="288" width="120" height="22" rx="11" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="628" y="303" text-anchor="middle" fill="currentColor">p99 = 5000ms</text>
  </g>
  <text x="320" y="58" font-size="9.5" text-anchor="middle" fill="#ef4444" opacity="0.9">average nằm ở vùng KHÔNG có request nào</text>
</svg>

| Percentile | Ý nghĩa | Dùng để |
|---|---|---|
| p50 | Trải nghiệm "điển hình" | Theo dõi xu hướng chung |
| p95 | 1/20 request chậm hơn mức này | SLO phổ biến cho API nội bộ |
| p99 | 1/100 request | SLO cho API user-facing |
| p99.9 | Tail thực sự | Hệ thống quy mô lớn, fan-out |

### Tail latency khuếch đại theo fan-out

Đây là insight quan trọng nhất (từ paper "The Tail at Scale" của Google): nếu 1 trang web gọi **100 service con**, và mỗi service có p99 = 1s, thì xác suất *toàn bộ trang* nhanh là 0.99¹⁰⁰ ≈ **37%** — tức **63% request của user chạm tail** dù mỗi service riêng lẻ "chỉ" có 1% chậm.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tail latency khuếch đại theo fan-out</title>
  <desc>Một request của user fan-out gọi 100 service con song song. Mỗi service nhanh với xác suất 0.99 (p99=1s). Trang chỉ nhanh khi TẤT CẢ nhanh: 0.99 mũ 100 ≈ 0.37, nên 63% request chạm tail.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Fan-out: trang nhanh chỉ khi TẤT CẢ con nhanh</text>
  <g>
    <rect x="276" y="44" width="168" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">1 request của user</text>
    <text x="360" y="80" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trang web</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.3" fill="none">
    <path d="M360 88 C 360 120, 70 110, 70 150"/>
    <path d="M360 88 C 360 120, 180 110, 180 150"/>
    <path d="M360 88 V 150"/>
    <path d="M360 88 C 360 120, 540 110, 540 150"/>
    <path d="M360 88 C 360 120, 650 110, 650 150"/>
  </g>
  <g font-size="10" font-weight="600">
    <rect x="38" y="150" width="64" height="40" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="167" text-anchor="middle" fill="currentColor">svc 1</text>
    <text x="70" y="182" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">0.99 nhanh</text>
    <rect x="148" y="150" width="64" height="40" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="167" text-anchor="middle" fill="currentColor">svc 2</text>
    <text x="180" y="182" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">0.99 nhanh</text>
    <rect x="328" y="150" width="64" height="40" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="172" text-anchor="middle" fill="currentColor" opacity="0.7">…</text>
    <rect x="508" y="150" width="64" height="40" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="167" text-anchor="middle" fill="currentColor">svc 99</text>
    <text x="540" y="182" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">0.99 nhanh</text>
    <rect x="618" y="150" width="64" height="40" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="650" y="167" text-anchor="middle" fill="currentColor">svc 100</text>
    <text x="650" y="182" font-size="9" text-anchor="middle" fill="#f59e0b" opacity="0.95">chạm tail!</text>
  </g>
  <text x="360" y="216" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">100 service con, gọi song song</text>
  <g>
    <rect x="120" y="236" width="480" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="263" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">P(cả trang nhanh) = 0.99¹⁰⁰ ≈ 0.37</text>
  </g>
  <text x="360" y="306" font-size="12" font-weight="700" text-anchor="middle" fill="#f59e0b">→ 63% request của user CHẠM tail (≥1 service chậm)</text>
</svg>

> ⚠️ Bẫy production: KHÔNG được lấy average của percentile từ nhiều server (`avg(p99 của 10 instance)` là con số vô nghĩa về mặt toán học). Percentile phải tính từ phân phối gộp — dùng histogram (HDR Histogram, t-digest) rồi merge, không merge percentile.

### Kỹ thuật chống tail latency

- **Hedged request**: gửi request thứ hai nếu request đầu chậm hơn p95, lấy kết quả nào về trước.
- **Timeout + retry có jitter**: cắt tail thay vì chờ.
- **Load shedding**: từ chối sớm khi quá tải còn hơn để mọi request đều chậm.

## 2. Profiling: CPU vs Memory vs I/O

Trước khi profile, hỏi: **hệ thống đang bound bởi cái gì?**

| Loại bound | Triệu chứng | Công cụ |
|---|---|---|
| CPU-bound | CPU 100%, latency tăng tuyến tính với load | CPU profiler (flame graph): `py-spy`, `pprof`, `async-profiler`, `perf` |
| Memory-bound | GC pause, OOM kill, RSS tăng dần | Heap profiler, allocation tracking, `memray` |
| I/O-bound | CPU thấp nhưng latency cao, thread chờ | Distributed tracing, `iostat`, off-CPU flame graph |
| Lock contention | CPU thấp, throughput không tăng khi thêm thread | Off-CPU profiling, mutex profiling |

### Flame graph — đọc thế nào

- Trục ngang = **tỷ lệ thời gian CPU** (không phải thứ tự thời gian).
- Trục dọc = call stack.
- Tìm **plateau rộng** (hàm chiếm nhiều % ngang) chứ không phải đỉnh cao.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cách đọc flame graph</title>
  <desc>Flame graph: trục ngang là phần trăm thời gian CPU (không phải thứ tự thời gian), trục dọc là call stack — hàm cha ở dưới, hàm con xếp lên trên. Tìm plateau rộng (hàm chiếm nhiều % ngang) chứ không phải đỉnh cao. Một nhánh hẹp nhưng cao chỉ là stack sâu, không tốn CPU.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Flame graph: tìm PLATEAU rộng, không phải đỉnh cao</text>
  <text x="16" y="46" font-size="11" fill="currentColor" opacity="0.7">trục dọc ↑ = call stack (cha dưới, con trên)</text>
  <text x="704" y="288" font-size="11" text-anchor="end" fill="currentColor" opacity="0.7">trục ngang → = % thời gian CPU (không phải thứ tự)</text>
  <g font-size="10" font-weight="600" text-anchor="middle">
    <rect x="40" y="232" width="640" height="26" rx="3" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="249" fill="currentColor">main()  — 100%</text>
    <rect x="40" y="204" width="180" height="26" rx="3" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="130" y="221" fill="currentColor">handler() 28%</text>
    <rect x="224" y="204" width="456" height="26" rx="3" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="452" y="221" fill="currentColor">serialize() — 71%</text>
    <rect x="40" y="176" width="96" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="88" y="193" fill="currentColor">auth 15%</text>
    <rect x="224" y="176" width="456" height="26" rx="3" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="452" y="193" fill="currentColor">json.encode() — 71% ← PLATEAU rộng</text>
    <rect x="40" y="148" width="40" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="60" y="165" font-size="9" fill="currentColor">hash</text>
    <rect x="224" y="148" width="36" height="26" rx="3" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="242" y="165" font-size="8" fill="currentColor">esc</text>
    <rect x="264" y="148" width="36" height="80" rx="3" fill="none" stroke="none"/>
    <rect x="600" y="148" width="80" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="640" y="165" font-size="9" fill="currentColor">utf8 12%</text>
    <rect x="600" y="120" width="80" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="640" y="137" font-size="9" fill="currentColor">deep…</text>
    <rect x="600" y="92" width="80" height="26" rx="3" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="640" y="109" font-size="9" fill="currentColor">…sâu</text>
  </g>
  <g font-size="10.5" font-weight="700">
    <text x="452" y="86" text-anchor="middle" fill="#f59e0b">↓ hàm rộng = ăn nhiều CPU → tối ưu ở đây</text>
    <text x="624" y="58" text-anchor="middle" fill="currentColor" opacity="0.6">đỉnh cao mà hẹp</text>
    <text x="624" y="72" text-anchor="middle" fill="currentColor" opacity="0.6">= stack sâu, KHÔNG tốn CPU</text>
  </g>
</svg>

> 💡 Ghi nhớ: **On-CPU profiling** trả lời "CPU đang làm gì". **Off-CPU profiling** trả lời "thread đang *chờ* cái gì" (lock, disk, network). Hệ backend đa số là I/O-bound — nếu chỉ nhìn on-CPU flame graph, bạn sẽ tối ưu nhầm chỗ.

### Continuous profiling

Chuẩn 2025: profiling không còn là việc "bật lên khi có sự cố" mà chạy liên tục ở production với overhead ~1-2% (sampling profiler dựa trên eBPF như Parca, Pyroscope, Datadog Continuous Profiler). Sự cố hiệu năng tái hiện được ngay từ dữ liệu lịch sử.

## 3. N+1 và chattiness — kẻ giết hiệu năng số một

### N+1 query

```python
orders = db.query("SELECT * FROM orders WHERE user_id = ?", uid)  # 1 query
for o in orders:
    o.items = db.query("SELECT * FROM items WHERE order_id = ?", o.id)  # N queries!
```

100 order = 101 round-trip. Mỗi round-trip tốn ~0.5-2ms trong VPC → 100-200ms chỉ cho network, chưa tính query.

Sửa: **JOIN**, **batch IN-clause**, hoặc **DataLoader pattern** (gom các lookup trong cùng tick thành một batch — bắt buộc với GraphQL):

```python
items = db.query("SELECT * FROM items WHERE order_id IN (...)", [o.id for o in orders])
# rồi group theo order_id trong memory
```

### Chattiness giữa service

N+1 không chỉ ở DB. Microservice gọi nhau trong vòng lặp là N+1 qua network — đắt gấp 10-100 lần. Nguyên tắc: **API nhận và trả batch** (`GET /users?ids=1,2,3` thay vì gọi `GET /users/{id}` N lần).

> ⚠️ Bẫy production: ORM với lazy loading mặc định (Hibernate, SQLAlchemy, Prisma include lồng nhau) là nguồn N+1 phổ biến nhất. Nó **chạy ổn ở dev** (10 bản ghi) và **chết ở production** (10.000 bản ghi). Bật log SQL ở môi trường staging và đếm số query mỗi request — đó là một test đáng viết.

## 4. Connection pool sizing — Little's Law

### Little's Law

```
L = λ × W
(số connection cần dùng đồng thời) = (request/giây) × (thời gian giữ connection mỗi request)
```

Ví dụ: 500 req/s, mỗi request giữ DB connection 20ms → L = 500 × 0.02 = **10 connection** đang dùng đồng thời. Pool size ~15-20 (thêm headroom) là đủ — không phải 200.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Connection pool sizing bằng Little's Law</title>
  <desc>Little's Law: L = λ × W. Với 500 req/s và mỗi request giữ connection 20ms thì L = 500 × 0.02 = 10 connection đồng thời. Khi autoscale app từ 10 lên 50 instance, tổng connection = pool × số instance = 20 × 50 = 1000 đè lên DB, cần connection proxy.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Little's Law cho connection pool</text>
  <g font-size="13" font-weight="700">
    <rect x="40" y="48" width="150" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="115" y="70" font-size="12" text-anchor="middle" fill="currentColor">λ = 500 req/s</text>
    <text x="115" y="88" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">tốc độ đến</text>
    <text x="206" y="78" font-size="20" text-anchor="middle" fill="currentColor">×</text>
    <rect x="222" y="48" width="150" height="48" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="297" y="70" font-size="12" text-anchor="middle" fill="currentColor">W = 20ms</text>
    <text x="297" y="88" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">giữ conn / request</text>
    <text x="388" y="78" font-size="20" text-anchor="middle" fill="currentColor">=</text>
    <rect x="404" y="48" width="190" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="499" y="70" font-size="12" text-anchor="middle" fill="currentColor">L = 10 connection</text>
    <text x="499" y="88" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">đồng thời → pool ~15-20</text>
  </g>
  <line x1="40" y1="120" x2="680" y2="120" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="16" y="150" font-size="13" font-weight="700" fill="currentColor">Nhưng autoscale nhân tổng connection lên DB:</text>
  <g font-size="10.5" font-weight="600" text-anchor="middle">
    <rect x="40" y="170" width="280" height="120" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="180" y="190" font-size="11" fill="currentColor">10 instance × pool 20</text>
    <g>
      <rect x="56" y="200" width="38" height="22" rx="4" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="100" y="200" width="38" height="22" rx="4" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
      <rect x="144" y="200" width="38" height="22" rx="4" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="220" y="216" fill="currentColor" opacity="0.6">…10 app</text>
    </g>
    <text x="180" y="262" font-size="14" font-weight="700" fill="currentColor">= 200 connection</text>
  </g>
  <text x="350" y="236" font-size="22" text-anchor="middle" fill="#f59e0b" font-weight="700">→</text>
  <g font-size="10.5" font-weight="600" text-anchor="middle">
    <rect x="380" y="170" width="300" height="120" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="530" y="190" font-size="11" fill="currentColor">50 instance × pool 20</text>
    <text x="530" y="236" font-size="16" font-weight="700" fill="#f59e0b">= 1000 connection 💥</text>
    <text x="530" y="268" font-size="9.5" fill="currentColor" opacity="0.75">DB quá tải → cần PgBouncer / RDS Proxy</text>
  </g>
</svg>

### Vì sao pool to hơn không nhanh hơn

DB chỉ thực thi song song hiệu quả bằng số core (+ một phần chờ I/O). Công thức kinh nghiệm của HikariCP:

```
pool_size ≈ cores × 2 + số_disk_spindle
```

Pool quá to → context switch, lock contention trong DB, mỗi connection Postgres tốn vài MB RAM → **tổng throughput giảm**. Pool quá nhỏ → request xếp hàng chờ connection (nhưng xếp hàng ở app rẻ hơn nghẽn ở DB).

> 💡 Ghi nhớ: Khi DB quá tải, **giảm** pool size thường giúp throughput tăng. Hàng đợi nên nằm ở tầng app (rẻ, kiểm soát được, timeout được) chứ không phải trong DB.

> ⚠️ Bẫy production: Tổng pool = pool_size × số instance app. Autoscale app từ 10 lên 50 instance với pool 20 mỗi instance = 1000 connection đè lên DB → cần connection proxy (PgBouncer/RDS Proxy).

## 5. Serialization cost — chi phí vô hình

Serialize/deserialize JSON thường chiếm **10-30% CPU** của một API service điển hình, và là nguồn allocation lớn nhất (gây áp lực GC).

| Format | Tốc độ | Kích thước | Schema | Khi nào dùng |
|---|---|---|---|---|
| JSON | Chậm | Lớn | Không | Public API, debug dễ |
| Protobuf | Nhanh | Nhỏ (~3-10x so JSON) | Có, evolution tốt | gRPC nội bộ |
| Avro | Nhanh | Nhỏ | Có, schema registry | Kafka/streaming |
| MessagePack | Khá | Nhỏ vừa | Không | Cache value, drop-in thay JSON |

Mẹo thực tế:

- **Đừng deserialize rồi serialize lại** khi chỉ proxy/forward — pass-through bytes.
- Trả về ít field hơn (projection) rẻ hơn mọi tối ưu serializer.
- Với Python, `orjson` nhanh hơn `json` chuẩn 5-10x — một dòng đổi import.
- Nén (gzip/brotli/zstd) đổi CPU lấy bandwidth — đáng làm cho response >1KB qua internet, thường không đáng trong nội bộ VPC băng thông cao.

## 6. Batch & Streaming

### Batching: amortize chi phí cố định

Mỗi thao tác có chi phí cố định (syscall, network round-trip, fsync, transaction overhead). Batch chia chi phí đó cho N item:

- 1000 INSERT riêng lẻ: 1000 round-trip + 1000 fsync.
- 1 INSERT 1000 row (hoặc `COPY`): 1 round-trip → nhanh hơn 50-100x.

Trade-off: batch tăng **latency của item đầu tiên** (phải chờ gom đủ batch hoặc hết timeout). Pattern chuẩn: **batch theo size HOẶC time, cái nào đến trước** (giống Kafka `linger.ms` + `batch.size`).

### Streaming: đừng giữ cả dataset trong RAM

```python
# OOM với 10 triệu row:
rows = db.fetch_all("SELECT * FROM events")
return json(rows)

# Streaming — memory phẳng, time-to-first-byte thấp:
for chunk in db.cursor("SELECT * FROM events", chunk_size=5000):
    yield serialize(chunk)
```

Áp dụng: export CSV, response lớn (chunked transfer / NDJSON), xử lý file upload, ETL. Quy tắc: **memory sử dụng không được tỷ lệ với kích thước dữ liệu**, chỉ tỷ lệ với chunk size.

## 7. Async I/O vs Thread

| | Thread-per-request | Async I/O (event loop) |
|---|---|---|
| Mô hình | Block trong khi chờ I/O | Một thread phục vụ nghìn connection |
| Chi phí mỗi connection | ~1MB stack + context switch | Vài KB (coroutine/task) |
| Phù hợp | Concurrency thấp-vừa, code đơn giản | Nhiều connection chờ I/O lâu (websocket, fan-out) |
| Điểm chết | Hết thread khi I/O chậm | **Một đoạn CPU-bound block cả event loop** |
| CPU-bound | OK (nhiều thread, nhiều core) | Phải đẩy sang worker pool/process |

> ⚠️ Bẫy production: Trong Node.js/Python asyncio, một hàm sync chậm (parse JSON 50MB, bcrypt, gọi thư viện blocking) sẽ **đóng băng mọi request đang phục vụ** trên event loop đó. Triệu chứng: p99 tăng vọt toàn bộ endpoint dù chỉ một endpoint có lỗi. Theo dõi event loop lag như một metric hạng nhất.

Lưu ý 2025: virtual threads (Java 21+ Loom), goroutine (Go) cho mô hình lập trình sync với chi phí gần như async — xu hướng là runtime lo việc này thay developer. Async/await tường minh vẫn thống trị ở Python/TypeScript/Rust.

Quan trọng nhất: **async không làm một request nhanh hơn** — nó làm hệ thống chịu được nhiều request đồng thời hơn. Nếu vấn đề là latency của một call, async không cứu được.

## 8. Benchmark đúng cách

Benchmark sai còn nguy hiểm hơn không benchmark — vì nó cho quyết định sai một vẻ ngoài khoa học.

### Checklist benchmark

1. **Warmup**: JIT (JVM, V8) cần hàng nghìn lần chạy để compile hot path; connection pool cần fill; cache cần ấm. Bỏ kết quả vài nghìn iteration đầu.
2. **Đo nhiều lần, báo cáo phân phối**: chạy ≥5 lần, báo p50/p99 và variance — không báo "best of N" hay một con số duy nhất.
3. **Môi trường giống production**: cùng instance type, cùng kích thước dữ liệu, network thật. Benchmark trên laptop (turbo boost, thermal throttle, background process) gần như vô nghĩa.
4. **Dữ liệu thực tế**: 1000 row khác 100 triệu row (index fit RAM hay không, plan khác nhau). Phân phối key thực (hot key, skew) khác uniform random.
5. **Load generator không được là bottleneck**: kiểm tra CPU của máy bắn load.
6. **Closed-loop vs open-loop** — dẫn đến coordinated omission bên dưới.

### Coordinated omission

Lỗi kinh điển của load test (Gil Tene chỉ ra): tool dạng closed-loop (gửi request → **chờ response** → gửi tiếp) sẽ **tự động ngừng gửi khi server chậm**. Khi server stall 5 giây, tool chỉ ghi nhận 1 request chậm thay vì hàng trăm request *lẽ ra* đã được gửi trong 5 giây đó — kết quả p99 đẹp giả tạo.

User thật là **open-loop**: họ đến theo nhịp của họ, không chờ user khác xong. Dùng tool open-loop / có hiệu chỉnh coordinated omission (wrk2, k6 với arrival-rate executor, Vegeta) và đo latency từ **thời điểm lẽ ra request được gửi**, không phải thời điểm gửi thực tế.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Coordinated omission: closed-loop vs open-loop khi server stall 5 giây</title>
  <desc>Khi server stall 5 giây: tool closed-loop chờ response nên ngừng gửi, chỉ ghi 1 request chậm, bỏ sót hàng trăm request lẽ ra đã gửi, cho p99 đẹp giả. Tool open-loop vẫn gửi theo lịch và đo từ thời điểm lẽ ra request được gửi nên ghi nhận đúng độ trễ của mọi request bị xếp hàng.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Server stall 5 giây — hai tool đo ra hai p99 khác hẳn</text>
  <rect x="280" y="40" width="160" height="24" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="57" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">server stall 5s</text>
  <g stroke="currentColor" stroke-opacity="0.4">
    <line x1="40" y1="110" x2="680" y2="110"/>
    <line x1="40" y1="250" x2="680" y2="250"/>
  </g>
  <text x="40" y="92" font-size="12" font-weight="700" fill="currentColor">CLOSED-LOOP (sai)</text>
  <text x="460" y="92" font-size="10" fill="currentColor" opacity="0.7">gửi → chờ response → mới gửi tiếp</text>
  <g>
    <circle cx="70" cy="110" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="130" cy="110" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="190" cy="110" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="280" cy="110" r="6" fill="#ef4444" fill-opacity="0.9"/>
    <text x="280" y="98" font-size="9" text-anchor="middle" fill="#ef4444">1 request chậm</text>
    <line x1="280" y1="110" x2="440" y2="110" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3"/>
    <circle cx="500" cy="110" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="560" cy="110" r="5" fill="#10b981" fill-opacity="0.9"/>
  </g>
  <text x="360" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">trong 5s stall: tool ĐỨNG IM chờ → không gửi gì → bỏ sót hàng trăm request</text>
  <rect x="120" y="150" width="480" height="24" rx="11" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="167" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">→ p99 ĐẸP giả (chỉ 1 mẫu chậm bị ghi nhận)</text>
  <text x="40" y="232" font-size="12" font-weight="700" fill="currentColor">OPEN-LOOP (đúng)</text>
  <text x="300" y="232" font-size="10" fill="currentColor" opacity="0.7">gửi theo LỊCH, không chờ request trước</text>
  <g>
    <circle cx="70" cy="250" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="130" cy="250" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="190" cy="250" r="5" fill="#10b981" fill-opacity="0.9"/>
    <g fill="#ef4444" fill-opacity="0.85">
      <circle cx="280" cy="250" r="5"/>
      <circle cx="310" cy="250" r="5"/>
      <circle cx="340" cy="250" r="5"/>
      <circle cx="370" cy="250" r="5"/>
      <circle cx="400" cy="250" r="5"/>
      <circle cx="430" cy="250" r="5"/>
    </g>
    <circle cx="500" cy="250" r="5" fill="#10b981" fill-opacity="0.9"/>
    <circle cx="560" cy="250" r="5" fill="#10b981" fill-opacity="0.9"/>
  </g>
  <text x="360" y="278" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">mọi request đến đúng lịch vẫn được tính, đo từ thời điểm LẼ RA được gửi</text>
  <rect x="120" y="290" width="480" height="24" rx="11" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="360" y="307" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">→ p99 THẬT (hàng trăm request xếp hàng đều chậm)</text>
</svg>

> 💡 Ghi nhớ: Nếu kết quả load test cho p99 thấp đáng ngờ trong khi production kêu ca, nghi ngờ coordinated omission đầu tiên.

## 9. Capacity planning cơ bản

Quy trình 4 bước:

1. **Đo đơn vị công suất**: 1 instance chịu được bao nhiêu req/s ở mức latency chấp nhận được? (Tìm bằng load test tăng dần đến khi p99 vượt SLO — đó là công suất thực, không phải điểm CPU 100%.)
2. **Dự báo nhu cầu**: peak traffic = baseline × hệ số peak (daily/seasonal) × tăng trưởng dự kiến. Plan cho **peak**, không phải average.
3. **Headroom**: chạy ở ~50-70% công suất tại peak. Trên 70-80% utilization, queueing theory cho thấy latency tăng phi tuyến (W ~ 1/(1−ρ)) — hệ thống 90% utilization không còn buffer cho spike hay mất một AZ.
4. **Tìm bottleneck kế tiếp**: scale app gấp đôi thì DB, cache, downstream API có chịu nổi không? Capacity planning là bài toán **chuỗi**, mắt xích yếu nhất quyết định.

> ⚠️ Bẫy production: Autoscaling không thay thế capacity planning — scale-out mất 1-5 phút (boot, warmup, health check), trong khi spike đến trong giây. Cần đủ headroom để *sống sót đến khi* autoscale kịp, và DB thường không autoscale theo app.

## Liên hệ sang AWS

| Khái niệm trong bài | Service / tính năng AWS |
|---|---|
| p50/p95/p99 | **CloudWatch** hỗ trợ percentile (`p99`) trên metric — nhưng chỉ khi publish dữ liệu thô/histogram; với metric tự đẩy, dùng **EMF (Embedded Metric Format)** hoặc high-resolution metrics. Average của ALB `TargetResponseTime` nói dối y như bài đã phân tích — luôn xem p99 |
| Distributed tracing, tìm N+1 và chattiness | **AWS X-Ray** (và **CloudWatch Application Signals**): service map hiện rõ một request gọi DynamoDB 50 lần; subsegment cho thấy thời gian từng call |
| CPU vs memory bound | **Lambda**: memory và CPU bị **ghép cặp** — tăng memory đồng thời tăng CPU (1769MB ≈ 1 vCPU). Hàm CPU-bound chậm? Tăng memory có khi vừa nhanh hơn vừa *rẻ hơn* (billing = GB-giây, chạy nhanh hơn bù lại). Dùng **AWS Lambda Power Tuning** để tìm điểm tối ưu |
| Profiling DB, tìm query nóng | **RDS Performance Insights**: biểu đồ Average Active Sessions, top SQL, wait event (lock, I/O, CPU) — chính là phân loại CPU/memory/I/O-bound cho database |
| Connection pool & autoscale | **RDS Proxy** đóng vai PgBouncer managed — bắt buộc cân nhắc khi Lambda/Fargate scale-out nối thẳng vào RDS |
| Batch | SQS `SendMessageBatch`/`ReceiveMessage` (tối đa 10), DynamoDB `BatchWriteItem` (25), Kinesis `PutRecords` (500), Firehose buffer theo size-or-time |
| Streaming | S3 multipart, Lambda response streaming, Kinesis/Data Firehose cho pipeline |
| Serialization | API Gateway + payload nhỏ; gRPC qua ALB/App Mesh cho nội bộ; DynamoDB tính phí theo kích thước item — payload gọn = rẻ hơn trực tiếp |
| Capacity & headroom | Auto Scaling target tracking (đặt target ~50-60% CPU, không phải 85%), **provisioned concurrency** cho Lambda chống cold start lúc peak, Compute Optimizer gợi ý right-sizing |
| Continuous profiling | **Amazon CodeGuru Profiler** (flame graph production, gợi ý dòng code đắt nhất) |

### Tự kiểm tra

1. Vì sao `avg(p99)` từ 10 instance là con số vô nghĩa, và cách gộp đúng là gì?
2. Hệ thống 500 req/s, mỗi request giữ connection 40ms — pool size hợp lý khoảng bao nhiêu? Điều gì xảy ra khi autoscale lên 30 instance?
3. Load test của bạn báo p99 = 50ms nhưng user phàn nàn treo vài giây — cơ chế nào của tool có thể gây ra kết quả đẹp giả tạo này?
4. Lambda của bạn CPU-bound và đang để memory 256MB — vì sao tăng lên 1024MB có thể giảm cả latency lẫn chi phí?
