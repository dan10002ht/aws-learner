# Case study: Real-time Gaming Leaderboard

> Bài này nhìn thì "dễ nhất trong các case study" — chỉ là sắp xếp vài triệu con số theo thứ tự giảm dần. Nhưng nó là cái bẫy kinh điển của phỏng vấn System Design: **cái khó không nằm ở việc lấy top 10, mà nằm ở việc trả lời câu hỏi "tôi đang đứng thứ mấy?"**. Top 10 là một truy vấn có giới hạn — dù bảng có 5 triệu hay 500 triệu người, bạn vẫn chỉ đọc 10 bản ghi. Còn rank của một người ở giữa bảng là một phép đếm **trên toàn bộ tập dữ liệu**: "có bao nhiêu người điểm cao hơn tôi". Không có index nào của cơ sở dữ liệu quan hệ trả lời được câu đó trong O(log n). Cả bài học nằm ở chỗ này.

Và có một chi tiết thứ hai mà đa số ứng viên bỏ qua: hệ này **đọc nhiều hơn ghi rất nhiều**, nhưng lại bị mọi người mặc định coi là write-heavy chỉ vì nghe thấy chữ "real-time". Ghi là 600 lượt/giây. Đọc là hàng chục nghìn. Nếu bạn thiết kế cho ghi, bạn tối ưu nhầm trục — và sẽ đem một cụm Redis 20 node ra giải một bài toán mà **một dòng cache TTL 1 giây** giải xong 95%.

---

## 1. Làm rõ yêu cầu

Trước khi vẽ bất cứ cái box nào, phải hỏi cho rõ. Với bài leaderboard, những câu hỏi dưới đây quyết định thẳng kiến trúc chứ không phải hỏi cho có.

### 1.1 Những câu phải hỏi (và vì sao)

| Câu hỏi | Vì sao nó đổi thiết kế |
|---|---|
| Điểm được tính thế nào? Cộng dồn hay ghi đè bằng điểm cao nhất? | Cộng dồn → `ZINCRBY` (không cần đọc trước). Điểm cao nhất → cần so sánh (`ZADD GT`) hoặc read-modify-write. Đây là khác biệt giữa một lệnh atomic và một script Lua |
| Bảng xếp hạng có chu kỳ không? | Có chu kỳ (tháng/mùa) → mỗi chu kỳ một key riêng, TTL tự dọn, không bao giờ phải xoá dữ liệu cũ thủ công. Vĩnh viễn → dữ liệu chỉ phình, phải nghĩ đến archival từ ngày đầu |
| Tất cả người chơi vào chung một bảng, hay chia bảng nhỏ? | Chia bảng nhỏ (kiểu Duolingo: 50 người/league) **xoá sạch bài toán scale** — mỗi bảng 50 phần tử thì làm gì cũng được. Nếu đề bài cho phép, đây là câu trả lời hay nhất |
| Điểm bằng nhau thì xếp thế nào? | "Cùng hạng" → dùng `ZCOUNT`, đơn giản. "Ai đạt trước xếp trên" → phải nhúng timestamp vào score, và mất luôn `ZINCRBY` (§9) |
| Cần đúng tuyệt đối hay gần đúng được? | Đây là câu hỏi đáng giá nhất cả bài. Rank gần đúng cho người ở đáy bảng mở ra toàn bộ không gian giải pháp sharding (§8) |
| Real-time là bao nhiêu giây? | "Ngay lập tức" thường có nghĩa là "dưới 1–2 giây". Biên độ đó vừa đủ để cache top-N 1 giây — và đó là đòn bẩy lớn nhất của bài |

### 1.2 Functional requirements

- **Top 10**: hiển thị 10 người điểm cao nhất của giải hiện tại, kèm tên, avatar, điểm.
- **Rank của một người cụ thể**: "bạn đang hạng 4.301.887 / 25.000.000".
- **Ngữ cảnh quanh mình**: 4 người trên và 4 người dưới — đây là phần khiến người chơi quay lại, vì nó biến một con số vô nghĩa thành một mục tiêu ("chỉ cần thắng 2 trận là vượt được thằng kia").
- **Cập nhật điểm** khi người chơi thắng trận. Chỉ **game server** được gọi, không phải client.
- **Bảng theo chu kỳ**: mỗi tháng (hoặc mỗi mùa giải) là một bảng mới. Bảng cũ vẫn xem lại được.

### 1.3 Non-functional requirements

- **Real-time**: điểm vừa ghi phải phản ánh lên bảng trong khoảng **dưới 1 giây** với chính người đó, và **dưới vài giây** với người khác. Không chấp nhận batch hàng giờ.
- **Đọc lệch hẳn so với ghi** — xem §2.
- **Availability cao**: bảng xếp hạng sập thì game vẫn chơi được, nhưng người chơi mất động lực. Đây là hệ *quan trọng nhưng không sinh tử* — chấp nhận degrade (hiện bảng cũ 30 giây) tốt hơn là trả lỗi.
- **Durability có điều kiện**: mất bảng xếp hạng trong Redis là chấp nhận được **miễn là dựng lại được** từ nguồn sự thật. Điểm số không được mất vĩnh viễn.
- **Chống gian lận**: điểm phải do server quyết định, không do client khai báo.

### 1.4 Giả định chốt

```
DAU                        : 5.000.000
MAU                        : 25.000.000   (= cỡ tối đa của một bảng tháng)
Số trận/người/ngày         : 10
Chu kỳ bảng                : 1 tháng
Độ dài user_id             : 24 ký tự (hoặc 8 byte nếu dùng số nguyên)
Điểm tối đa một mùa        : < 1.000.000 (20 bit là thừa)
Thời gian giữ lịch sử      : vĩnh viễn, nhưng ở kho lạnh
```

> 💡 **Nguyên tắc**: Luôn hỏi "bảng này có chia nhỏ được không?". Bài toán "xếp hạng 25 triệu người trong một bảng" và bài toán "xếp hạng 500.000 bảng, mỗi bảng 50 người" khác nhau về độ khó tới ba bậc. Rất nhiều game thật đã chọn cách thứ hai **chính vì lý do kỹ thuật này**, rồi mới nghĩ ra lý do sản phẩm sau.

---

## 2. Back-of-envelope estimation

### 2.1 Write QPS — nhỏ đến mức đáng ngạc nhiên

```
Lượt chơi/ngày = 5.000.000 DAU × 10 trận = 50.000.000

Nếu là PvP 1-1 và chỉ người thắng được cộng điểm:
  số lần ghi thật = 50.000.000 / 2 = 25.000.000/ngày

Lấy trường hợp xấu nhất (cả hai bên đều được cộng/trừ điểm kiểu Elo):
  50.000.000 ghi/ngày

Write QPS trung bình = 50.000.000 / 86.400 ≈ 580 wps   (làm tròn 600)
Peak (giờ vàng buổi tối, hệ số 5×) ≈ 3.000 wps
Peak sự kiện cuối mùa giải (hệ số 10×) ≈ 6.000 wps
```

**600 ghi/giây.** Đây là con số đầu tiên và nó nói một điều rất quan trọng: *một* instance Redis đơn lẻ xử lý được khoảng **100.000 lệnh/giây** (single-threaded, lệnh O(log n) trên tập 25 triệu phần tử vẫn chỉ là ~25 bước so sánh). 3.000 wps là **3% công suất một node**. Về mặt ghi, bài này không cần sharding. Ai nhảy vào vẽ cụm 16 shard ngay từ đầu là đã over-engineer.

### 2.2 Read QPS — đây mới là trục chi phối

Đây là chỗ phần lớn ứng viên hụt. Hãy đếm xem **một lần ghi sinh ra bao nhiêu lần đọc**:

```
Mỗi trận kết thúc, màn hình kết quả hiển thị:
  - top 10 hiện tại                      → 1 đọc
  - hạng của tôi                         → 1 đọc
  - 4 người trên / 4 người dưới tôi      → 1 đọc (ghép chung được)
                                          = 3 đọc / 1 ghi

Cộng thêm: mở app xem bảng ngoài trận đấu
  5.000.000 người × 3 lần/ngày           = 15.000.000 đọc

Tổng đọc/ngày ≈ 50.000.000 × 3 + 15.000.000 ≈ 165.000.000
Làm tròn lên (widget trên màn hình chính, auto-refresh): ~300.000.000/ngày

Read QPS trung bình = 300.000.000 / 86.400 ≈ 3.500 rps
Peak (5×)          ≈ 17.000 rps
Peak sự kiện (10×) ≈ 35.000 rps  — và có thể vọt 170.000 rps
                                    trong 30 giây cuối mùa giải
```

| Trục | Trung bình | Peak thường | Peak sự kiện | Tỉ lệ so với ghi |
|---|---|---|---|---|
| Ghi điểm | 580 wps | 3.000 | 6.000 | 1× |
| Đọc (top-10 + rank) | 3.500 rps | 17.000 | 35.000–170.000 | **~6×, lúc cao điểm tới 30×** |

> 💡 **Nguyên tắc**: Nói thẳng ra trong phỏng vấn — *"Đây là hệ read-heavy, tỉ lệ đọc/ghi khoảng 6:1 ở trạng thái bình thường và 30:1 ở đỉnh. Mọi tối ưu của tôi sẽ hướng về đường đọc."* Một câu này đặt đúng khung cho toàn bộ 40 phút còn lại.

Và có một cấu trúc rất đẹp trong đường đọc: **top 10 giống hệt nhau với tất cả mọi người**. 170.000 request/giây cùng hỏi một câu và cùng nhận một câu trả lời — đó là định nghĩa hoàn hảo của thứ đáng cache. Còn "hạng của tôi" thì cá nhân hoá, không cache chung được, nhưng đổi lại nó là một lệnh `O(log n)` rẻ.

### 2.3 Bộ nhớ Redis — ra con số thật, đừng nói "vừa đủ"

Cách tính ngây thơ (như trong sách): 24 byte `user_id` + 2 byte điểm = 26 byte × 25 triệu = **650 MB**. Con số này **sai thấp khoảng 5 lần**, và nếu bạn đem nó đi định cỡ cụm production thì bạn sẽ bị OOM. Lý do: Redis không lưu byte trần, nó lưu **cấu trúc**.

Một phần tử trong sorted set (Redis 7, encoding `skiplist`) tốn:

```
┌───────────────────────────────────────────────────────────────┐
│ 1. sds cho member ("a1b2c3...", 24 ký tự)                    │
│    header sdshdr8 (3B) + 24B + NUL (1B) = 28B                │
│    → jemalloc làm tròn lên bin 32B                    = 32 B  │
├───────────────────────────────────────────────────────────────┤
│ 2. zskiplistNode                                              │
│    ele ptr        8B                                          │
│    score (double) 8B                                          │
│    backward ptr   8B                                          │
│    level[]: mỗi tầng = forward ptr 8B + span 4B (pad 8B)      │
│             số tầng trung bình = 1/(1-p) ≈ 1,33 với p = 0,25  │
│             ≈ 1,33 × 16B ≈ 21B                                │
│    tổng ≈ 45B → bin 48B                               = 48 B  │
├───────────────────────────────────────────────────────────────┤
│ 3. dictEntry của hash phụ (member → score)                    │
│    key ptr 8 + val 8 + next 8 = 24B → bin 32B         = 32 B  │
├───────────────────────────────────────────────────────────────┤
│ 4. Bucket của bảng băm (~1,5 slot/phần tử × 8B)       = 12 B  │
└───────────────────────────────────────────────────────────────┘
                                          TỔNG ≈ 124 B / phần tử
```

```
25.000.000 phần tử × ~124 B ≈ 3,1 GB

Cộng overhead chung của Redis + fragmentation (~15%)  → ~3,6 GB
Làm tròn an toàn                                       → 4 GB / bảng tháng

Giữ 3 bảng gần nhất trong RAM (tháng này + 2 tháng trước) → 12 GB
Quy tắc "nhân đôi RAM cho node ghi nhiều" (fork lúc BGSAVE,
copy-on-write có thể nhân đôi bộ nhớ trong tình huống xấu nhất)
                                                       → node 32 GB
```

**Kết luận:** một node `cache.r7g.xlarge` (~26 GB usable) hoặc `r7g.2xlarge` (~52 GB) là thừa sức. **Toàn bộ leaderboard 25 triệu người vừa trong một máy.** Đây là câu chốt của phần estimation, và nó phải được nói ra: *"Vì tất cả vừa trong một node, tôi sẽ không shard. Tôi sẽ dành thời gian còn lại nói về cache và về khôi phục — vì đó mới là rủi ro thật."*

Mẹo giảm bộ nhớ nếu cần: đổi `user_id` 24 ký tự thành số nguyên 64-bit in ra chuỗi (tối đa 20 ký tự, thường 8–10) → sds về bin 16B, tiết kiệm ~16 B/phần tử ≈ **400 MB**. Không đáng làm ở quy mô này, nhưng đáng nêu ra để cho thấy bạn biết chỗ nào tốn.

### 2.4 Các con số còn lại

```
Nhật ký sự kiện (nguồn sự thật để dựng lại):
  50.000.000 sự kiện/ngày × ~200 B  = 10 GB/ngày
                                     = 300 GB/tháng
                                     ≈ 3,6 TB/năm   → S3, nén Parquet còn ~1 TB

Hồ sơ người dùng (tên, avatar, quốc gia):
  25.000.000 × 500 B                ≈ 12,5 GB       → MySQL/DynamoDB + cache

Băng thông đường đọc:
  Một response top-10 ≈ 1 KB (10 × {id, tên, avatar_url, điểm, hạng})
  17.000 rps × 1 KB   ≈ 17 MB/s
  170.000 rps × 1 KB  ≈ 170 MB/s  → bắt buộc có CDN/cache, xem §11

Bảng phụ theo quốc gia (giả sử 200 quốc gia):
  tổng phần tử vẫn là 25 triệu, nhưng nhân đôi vì lưu 2 lần
                                    → thêm ~3,6 GB
```

---

## 3. API design

Giữ tối giản. Điểm mấu chốt: **API ghi điểm không được lộ ra client**.

```
# ---------- Đường ghi (chỉ game server gọi được) ----------
POST /v1/internal/scores
  Headers: X-Game-Server-Key, X-Signature (HMAC), X-Idempotency-Key
  Body: {
    "match_id":  "m_8f3a...",        # khoá chống ghi trùng
    "user_id":   "u_1934",
    "delta":     1,                  # hoặc "score": 1420 nếu ghi đè
    "board":     "global",           # global | country:VN | guild:1234
    "occurred_at": 1757808000
  }
  202 -> { "accepted": true }
  409 -> { "error": "duplicate_match" }     # idempotent, không lỗi thật

# ---------- Đường đọc (client gọi) ----------
GET /v1/leaderboards/{board_id}/top?limit=10
  200 -> {
    "board_id": "global:2026-09",
    "generated_at": 1757808123,
    "entries": [
      { "rank": 1, "user_id": "u_77", "name": "alice", "score": 12543 },
      { "rank": 2, "user_id": "u_12", "name": "bob",   "score": 11500 }
    ]
  }
  Cache-Control: public, max-age=1, stale-while-revalidate=5

GET /v1/leaderboards/{board_id}/users/{user_id}
  200 -> {
    "user_id": "u_1934", "score": 842,
    "rank": 4301887, "rank_exact": false,      # ⚠️ trường quan trọng
    "percentile": 82.7,
    "total_players": 25000000
  }

GET /v1/leaderboards/{board_id}/users/{user_id}/around?span=4
  200 -> { "entries": [ ...4 người trên, chính mình, 4 người dưới... ] }

GET /v1/leaderboards/{board_id}/friends?user_id=u_1934
  200 -> { "entries": [ ... ] }    # xếp hạng trong nhóm bạn bè
```

Ba chi tiết đáng nói trong thiết kế API này:

1. **`match_id` + `X-Idempotency-Key`**: retry là chuyện bình thường trong hệ phân tán. Nếu game server gọi lại vì timeout mạng, người chơi không được cộng điểm hai lần. Xử lý: `SET dedupe:{match_id} 1 NX EX 86400` — nếu trả về `nil` thì bỏ qua request. Chi tiết nhỏ này phân biệt người đã viết hệ thống ghi điểm thật với người mới đọc sách.
2. **`rank_exact: false`**: API **thành thật** về việc hạng là gần đúng. Đây là quyết định thiết kế được phơi ra tận tầng giao diện, và nó cho phép tầng dưới tự do sharding (§8).
3. **`generated_at`**: client biết dữ liệu cũ bao nhiêu giây. Với leaderboard, hiện "cập nhật 2 giây trước" là chấp nhận được và thậm chí tạo cảm giác tin cậy.

---

## 4. High-level design

```
                    ┌──────────────┐
   Người chơi ─────►│ Game Client  │
                    └──────┬───────┘
                           │ (1) kết quả trận — KHÔNG chứa điểm
                           ▼
                 ┌───────────────────┐
                 │   Game Server     │  ← nơi duy nhất quyết định
                 │ (authoritative)   │     "ai thắng, được mấy điểm"
                 └─────┬──────┬──────┘
                       │      │
         (2) ghi sự kiện│      │ (3) POST /internal/scores
                       ▼      ▼
              ┌─────────────┐  ┌────────────────────┐
              │   Kinesis   │  │ Leaderboard Service│
              │ (event log) │  └────┬───────────┬───┘
              └──────┬──────┘       │           │
                     │        ZINCRBY│           │ZREVRANK / ZREVRANGE
                     │              ▼           ▼
                     │        ┌───────────────────────┐
                     │        │   Redis Sorted Set    │
                     │        │ leaderboard:2026-09   │
                     │        │  (primary + replica)  │
                     │        └───────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐        ┌──────────────────┐
          │  S3 / Data Lake     │        │  MySQL / DynamoDB│
          │ (nguồn sự thật,     │        │  hồ sơ người chơi│
          │  dựng lại bảng)     │        │  (tên, avatar)   │
          └─────────────────────┘        └──────────────────┘

   ─────────────────────── ĐƯỜNG ĐỌC ───────────────────────
                    ┌──────────────┐
   Người chơi ─────►│  CloudFront  │  cache top-N, TTL 1s
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────┬───────┘
                           ▼
                 ┌───────────────────┐   cache cục bộ trong
                 │ Leaderboard Service│  process, TTL 1s
                 └─────────┬─────────┘
                           ▼
                    Redis (replica cho đọc)
```

Bốn quyết định đã nằm sẵn trong sơ đồ này:

**Client không bao giờ gửi điểm.** Client chỉ gửi "tôi vừa chơi xong trận này"; game server — nơi chạy logic trận đấu — mới quyết định ai thắng và được bao nhiêu điểm. Nếu client gọi thẳng `POST /scores` với điểm tự khai, một proxy MITM là đủ để leaderboard trở nên vô nghĩa trong 24 giờ. Với game server-authoritative thực thụ (MOBA, FPS), client thậm chí **không cần gọi gì cả**.

**Có một event log song song với Redis.** Đây là khác biệt lớn nhất giữa thiết kế đồ chơi và thiết kế production: Redis là **chỉ mục truy vấn**, không phải nguồn sự thật. Mọi thay đổi điểm đều ghi vào một log bền (Kinesis → S3, hoặc bảng `score_events`). Khi Redis mất sạch — và nó sẽ mất, xem §12 — bạn phát lại log để dựng lại bảng.

**Đọc đi qua replica, ghi vào primary.** Với tỉ lệ 6:1 (30:1 lúc đỉnh), tách đọc/ghi gần như miễn phí và cho phép scale đọc bằng cách thêm replica. Đánh đổi: replica trễ vài chục ms, nên request đọc rank **ngay sau khi ghi** phải đi primary (read-your-own-writes), các request khác đi replica.

**Cache nằm ở hai tầng, cả hai TTL 1 giây** — xem §11, phần giải quyết 95% tải của cả hệ.

Có nên đặt message queue giữa game server và leaderboard service? Nếu chỉ leaderboard quan tâm, gọi HTTP đồng bộ đơn giản hơn và trễ thấp hơn. Nhưng thực tế **luôn có bên thứ hai quan tâm** — quest, thành tựu, analytics, chống gian lận — nên một stream nhiều consumer là đúng, và leaderboard chỉ là một consumer. Ở phỏng vấn, nêu cả hai và nói rõ điều kiện chuyển đổi.

---

## 5. Phương án 1 — Cơ sở dữ liệu quan hệ, và vì sao nó chết

Luôn bắt đầu bằng phương án đơn giản nhất. Nếu game của bạn có 50.000 người chơi, MySQL là câu trả lời đúng và mọi thứ sau đây là lãng phí.

### 5.1 Schema và các truy vấn

```sql
CREATE TABLE leaderboard (
  season_id  VARCHAR(16)  NOT NULL,      -- '2026-09'
  user_id    VARCHAR(24)  NOT NULL,
  score      INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP    NOT NULL,
  PRIMARY KEY (season_id, user_id),
  KEY idx_season_score (season_id, score DESC)
);
```

(Lưu ý: sách gốc đề xuất **tạo một bảng mới mỗi tháng**. Đừng. Một cột `season_id` nằm trong khoá chính và trong index cho bạn đúng hiệu quả đó mà không phải làm DDL định kỳ, không phải viết code chọn tên bảng động, và cho phép truy vấn xuyên mùa. Việc dọn dữ liệu cũ thì dùng `PARTITION BY` theo `season_id` rồi `DROP PARTITION` — nhanh như xoá file.)

**Cập nhật điểm** — dễ, và làm được atomic:

```sql
INSERT INTO leaderboard (season_id, user_id, score, updated_at)
VALUES ('2026-09', 'mary1934', 1, NOW())
ON DUPLICATE KEY UPDATE score = score + 1, updated_at = NOW();
```

**Top 10** — cũng dễ, và index xử lý tốt:

```sql
SELECT user_id, score
FROM leaderboard
WHERE season_id = '2026-09'
ORDER BY score DESC
LIMIT 10;
```

Với index `(season_id, score DESC)`, đây là một **index range scan chỉ đọc 10 dòng đầu**. `EXPLAIN` sẽ cho thấy `rows: 10`, không có `Using filesort`. Truy vấn này chạy dưới 1 ms kể cả trên bảng 25 triệu dòng. **Top 10 không phải vấn đề.**

### 5.2 Chỗ nó gãy: rank của một người

```sql
-- Hạng của user 'mary1934'
SELECT COUNT(*) + 1 AS rank
FROM leaderboard
WHERE season_id = '2026-09'
  AND score > (SELECT score FROM leaderboard
               WHERE season_id = '2026-09' AND user_id = 'mary1934');
```

Truy vấn này **đúng về mặt logic** và **không thể cứu được về mặt hiệu năng**. Lý do nằm ở bản chất của B-tree:

```
B-tree index trên (season_id, score DESC) — cấu trúc khái niệm:

         [ 9000 ]
        /        \
   [5000]        [12000]
   /    \        /     \
 ...    ...    ...     ...
  |      |      |       |
 lá:  ─────────────────────────────────────►
      12543 | 11500 | 11002 | ... | 843 | 842 | 841 | ...

Câu hỏi "có bao nhiêu nút lá có score > 842?"
  → B-tree KHÔNG lưu số lượng con ở mỗi nút nội bộ.
  → Cách duy nhất để đếm là ĐI QUA TỪNG NÚT LÁ.
  → Nếu user ở hạng 4.301.887 thì phải duyệt 4,3 TRIỆU mục index.
```

Đây là điểm cốt lõi cần nói được trong phỏng vấn: **B-tree tối ưu cho "tìm phần tử" và "quét một dải", chứ không tối ưu cho "đếm bao nhiêu phần tử nằm trước một điểm"**. Cấu trúc dữ liệu trả lời được câu hỏi đó trong O(log n) là **order-statistic tree** — một cây cân bằng mà mỗi nút lưu thêm kích thước cây con. MySQL, PostgreSQL, hầu hết mọi RDBMS đều **không** cài đặt index kiểu đó.

Con số thực tế: `COUNT(*)` trên 4,3 triệu mục index (index-only scan, không chạm bảng) mất khoảng **1–3 giây** trên phần cứng tốt, và nó **ăn buffer pool** — đẩy các trang nóng khác ra ngoài. Với 3.500 rps loại truy vấn này, MySQL sẽ chết trong vài giây. Thậm chí 35 rps cũng đủ giết.

Còn truy vấn "đánh số hạng cho cả bảng" thì tệ hơn nữa:

```sql
-- ⚠️ Đừng bao giờ chạy cái này trên production
SELECT RANK() OVER (ORDER BY score DESC) AS rank, user_id, score
FROM leaderboard WHERE season_id = '2026-09';
```

Window function `RANK()` phải **materialize toàn bộ 25 triệu dòng đã sắp xếp** trước khi trả về dòng đầu tiên. Thời gian tính bằng phút, bộ nhớ tạm tính bằng GB.

### 5.3 Những cách vá — và giới hạn của chúng

| Cách vá | Cơ chế | Vì sao vẫn không đủ |
|---|---|---|
| Materialized rank column | Một job chạy mỗi phút, đánh số hạng cho toàn bảng rồi ghi vào cột `rank` | Job đó chính là truy vấn `RANK()` ở trên — mất vài phút cho 25 triệu dòng. Và "real-time" trở thành "trễ 5 phút". Vi phạm yêu cầu |
| Trigger cập nhật rank | Mỗi lần điểm đổi, cập nhật rank của những người bị ảnh hưởng | Một người tăng 1 điểm có thể đẩy hạng của **hàng nghìn người** xuống 1 bậc. Ghi khuếch đại khủng khiếp |
| Cây tổng tiền tố (Fenwick/BIT) trong bảng SQL | Lưu cây chỉ số nhị phân theo dải điểm, `COUNT` thành O(log maxScore) | Đúng về thuật toán! Nhưng bạn đang **tự cài lại sorted set bằng SQL**, với chi phí mỗi cập nhật là ~20 lượt ghi dòng. Nếu phải làm vậy thì dùng Redis luôn cho xong |
| Bảng histogram phụ (đếm theo bucket điểm) | Rank gần đúng bằng cách cộng count các bucket cao hơn | Cách này **thật sự dùng được** — xem §8.4. Nhưng nó cho rank gần đúng, tức là bạn đã chấp nhận nới lỏng yêu cầu |

> ⚠️ **Bẫy phỏng vấn**: Rất nhiều người nói "thêm index vào cột score là xong". Người phỏng vấn đang chờ đúng câu đó để hỏi ngược: *"Index giúp gì cho `COUNT(*) WHERE score > X`?"*. Câu trả lời đúng là: **giúp biến full table scan thành index scan (nhanh hơn ~10 lần vì mục index nhỏ hơn dòng dữ liệu), nhưng vẫn là O(n) — vẫn phải đếm từng mục.** Nói được câu đó cho thấy bạn hiểu index thật sự làm gì, chứ không chỉ thuộc lòng "index làm truy vấn nhanh hơn".

**Kết luận phương án 1**: MySQL thắng ở top-10, đơn giản, và bền. Nó chết ở rank cá nhân từ khoảng **vài trăm nghìn người chơi trở lên**. Vì "rank của tôi" là **chính xác cái mà người chơi quan tâm nhất**, phương án này không dùng được cho bài toán đã cho. Nhưng đừng bỏ MySQL đi — nó vẫn là **nguồn sự thật** và nơi lưu hồ sơ.

---

## 6. Phương án 2 — Redis Sorted Set (lựa chọn chính)

### 6.1 Sorted set thật ra là hai cấu trúc dữ liệu ghép lại

Đây là phần đáng đào sâu nhất, vì nó giải thích *tại sao* Redis làm được cái MySQL không làm được.

Một `zset` trong Redis (khi vượt ngưỡng `zset-max-listpack-entries`, mặc định 128) gồm **hai cấu trúc trỏ vào cùng một tập dữ liệu**:

```
┌─────────────────────────────┐      ┌──────────────────────────────────┐
│  HASH TABLE (dict)          │      │  SKIP LIST                       │
│  member → score             │      │  sắp xếp theo (score, member)     │
│                             │      │                                  │
│  "alice" → 12543            │      │  L3: HEAD ─────────────► 842 ──► ∅│
│  "bob"   → 11500            │      │  L2: HEAD ──► 11500 ──► 842 ──► ∅│
│  "mary"  →   842            │      │  L1: HEAD ─► 12543 ─► 11500 ─► …  │
│                             │      │  L0: 12543→11500→11002→…→842→841 │
│  O(1) cho ZSCORE            │      │  O(log n) cho chèn/tìm/đếm       │
└─────────────────────────────┘      └──────────────────────────────────┘
        ▲                                        ▲
        └──── cả hai trỏ tới cùng chuỗi sds ─────┘
             (member không bị lưu hai lần)
```

- **Hash table** trả lời câu hỏi *"điểm của alice là bao nhiêu?"* trong **O(1)**. Không có nó, `ZSCORE` sẽ phải quét skip list.
- **Skip list** trả lời câu hỏi *"ai đứng ở vị trí 0–9?"* và *"alice đứng thứ mấy?"* trong **O(log n)**.

Hai cấu trúc trả cái giá là bộ nhớ gấp đôi để mua hai loại truy vấn khác nhau — một đánh đổi kinh điển và rất đáng.

### 6.2 Skip list hoạt động thế nào, và tại sao nó đếm được

Skip list là một danh sách liên kết có sắp xếp, cộng thêm các **tầng chỉ mục ngẫu nhiên** bên trên. Khi chèn một phần tử, Redis tung đồng xu: với xác suất `p = 0,25`, phần tử được nâng lên tầng trên; lặp lại cho tới khi trượt hoặc chạm tầng tối đa (32). Kết quả: tầng 0 có n phần tử, tầng 1 có ~n/4, tầng 2 có ~n/16... — một cấu trúc xấp xỉ cây cân bằng nhưng **được duy trì bằng xác suất chứ không bằng phép xoay**.

Tìm kiếm đi từ tầng cao nhất sang phải cho tới khi gặp phần tử lớn hơn mục tiêu, rồi tụt xuống một tầng và lặp lại:

```
Tìm 842 trong danh sách 64 phần tử:

L3:  HEAD ──────────────────────────────────► 900 ──────────► ∅
L2:  HEAD ──────────► 5000 ────────────────► 900 ──► 400 ──► ∅
L1:  HEAD ─► 11500 ─► 5000 ─► 2100 ─► 1200 ─► 900 ─► 850 ─► 400
L0:  ...  → 851 → 850 → 849 → ... → 843 → 842 → 841 → ...
                                              ▲
   Đi 3 bước ở L3/L2, ~4 bước ở L1, ~4 bước ở L0 = ~11 bước
   Danh sách liên kết thường: 62 bước.
```

Nhưng phần thú vị hơn — và là **lý do chính Redis giải được bài này còn MySQL thì không** — là mỗi con trỏ tiến trong skip list của Redis lưu kèm một trường `span`: **số phần tử ở tầng 0 mà bước nhảy này đi qua**.

```c
typedef struct zskiplistNode {
    sds ele;
    double score;
    struct zskiplistNode *backward;
    struct zskiplistLevel {
        struct zskiplistNode *forward;
        unsigned long span;          // ← đây là chìa khoá của cả bài
    } level[];
} zskiplistNode;
```

Nhờ `span`, khi tìm một phần tử, Redis chỉ cần **cộng dồn span của các bước đã đi** là ra ngay vị trí tuyệt đối của phần tử đó. Đó chính là `ZRANK` — và nó là **O(log n)**, không phải O(n).

Nói cách khác: **skip list của Redis là một order-statistic tree**. Đây là câu trả lời chính xác cho câu hỏi "vì sao MySQL không làm được?" — B-tree của MySQL không lưu `span`, nên nó phải đếm tay.

> 💡 **Nguyên tắc**: Khi một truy vấn cần "vị trí thứ tự", hãy hỏi cấu trúc dữ liệu bên dưới có lưu **số lượng** ở nút trung gian không. Nếu không, mọi index trên đời cũng chỉ giảm hằng số, không đổi được độ phức tạp.

### 6.3 Vì sao skip list mà không phải cây đỏ-đen / AVL / B-tree?

Về lý thuyết, một cây cân bằng có lưu kích thước cây con (order-statistic tree) cho cùng độ phức tạp O(log n) và **tốn ít bộ nhớ hơn** (không có các tầng thừa). Vậy tại sao antirez chọn skip list?

| Tiêu chí | Skip list | Cây cân bằng (AVL/RB) | B-tree |
|---|---|---|---|
| Chèn/xoá/tìm | O(log n) kỳ vọng | O(log n) đảm bảo | O(log n) đảm bảo |
| Truy vấn theo **dải** (`ZRANGE 0 9`) | **Rất tự nhiên**: tìm điểm đầu O(log n) rồi đi thẳng theo danh sách liên kết tầng 0 | Phải duyệt cây theo thứ tự giữa, code phức tạp, nhảy con trỏ lung tung | Tốt, lá được liên kết |
| Độ phức tạp code | ~200 dòng, không có phép xoay, không có cân bằng lại | Phép xoay + tô màu, nhiều trường hợp biên, dễ sai | Rất phức tạp: tách/gộp trang |
| Sửa đổi đồng thời | Chỉ cần sửa vài con trỏ cục bộ → dễ làm lock mịn | Phép xoay có thể lan lên gốc → khoá rộng | Tách trang lan lên gốc |
| Thân thiện cache | Kém hơn (con trỏ rải rác) | Kém | **Tốt nhất** (nút lớn, ít lần nhảy) |
| Bộ nhớ | Cao hơn ~33% (các tầng thừa) | Thấp nhất | Thấp, nhưng có chỗ trống trong trang |
| Hợp với đĩa | Không | Không | **Có** (nút = 1 trang) |

Ba lý do thật sự: (1) **truy vấn dải là ca dùng chính của zset** — `ZRANGE`/`ZREVRANGE` đều là "tìm điểm bắt đầu rồi đi tiếp M bước", mà với skip list đó chỉ là đi theo danh sách liên kết tầng 0, còn với cây là duyệt in-order có ngăn xếp; (2) **Redis chạy trong RAM nên lợi thế lớn nhất của B-tree biến mất** — B-tree sinh ra để giảm số lần đọc đĩa bằng cách nhét nhiều khoá vào một trang, không có đĩa thì ưu thế đó chỉ còn là hiệu ứng cache CPU; (3) **code đơn giản là một tính năng** — không xoay, không tô màu, không tách trang, nên ít bug hơn ở tầng nền móng của hàng triệu hệ thống.

Điều đánh đổi cần tự nêu ra: skip list cho O(log n) **kỳ vọng**, không phải đảm bảo. Xác suất suy biến với 25 triệu phần tử nhỏ tới mức không đáng nhắc — nhưng nêu rồi tự bác bỏ là cách chứng minh bạn hiểu chứ không thuộc lòng.

### 6.4 Bộ lệnh vận hành leaderboard

| Lệnh | Độ phức tạp | Dùng làm gì |
|---|---|---|
| `ZADD key score member` | O(log n) | Ghi đè điểm. `ZADD key GT score member` chỉ ghi khi điểm mới **lớn hơn** — đúng cho "giữ điểm cao nhất" |
| `ZINCRBY key delta member` | O(log n) | Cộng dồn điểm. **Atomic**, không cần đọc trước, không cần khoá |
| `ZREVRANGE key 0 9 WITHSCORES` | O(log n + m) | Top 10. Với m=10 thì gần như O(log n) |
| `ZREVRANK key member` | O(log n) | Hạng của một người (0-based, hạng cao nhất = 0) |
| `ZSCORE key member` | **O(1)** | Điểm của một người — đi qua hash table, không đụng skip list |
| `ZCOUNT key (842 +inf` | O(log n) | **Đếm số người điểm cao hơn 842** — dùng để tính hạng thi đấu khi có đồng điểm |
| `ZCARD key` | **O(1)** | Tổng số người trong bảng — dùng cho percentile và cho sharding |
| `ZMSCORE key m1 m2 ... m200` | O(m) | Lấy điểm của 200 người bạn trong **một lượt round-trip** |
| `ZRANGESTORE dst src 0 999 REV` | O(log n + m) | Sao chép top 1000 sang key khác — dùng cho snapshot/archival |
| `ZREMRANGEBYRANK key 0 -1000001` | O(log n + m) | Cắt đuôi, chỉ giữ 1 triệu người top — dùng khi bộ nhớ căng |

Ba luồng chính của bài, viết ra thành lệnh thật:

```bash
# (1) Người chơi thắng một trận, được 1 điểm
ZINCRBY leaderboard:2026-09 1 "mary1934"
# → trả về điểm mới, ví dụ 843. Một lệnh, atomic, O(log 25.000.000) ≈ 25 bước.

# (2) Top 10
ZREVRANGE leaderboard:2026-09 0 9 WITHSCORES
# → [("alice",12543), ("bob",11500), ...]

# (3) Hạng của tôi + 4 người trên, 4 người dưới
ZREVRANK leaderboard:2026-09 "mary1934"     # → 4301886 (0-based)
ZREVRANGE leaderboard:2026-09 4301882 4301890 WITHSCORES
#          start = max(0, rank-4)   stop = rank+4
```

Bước (3) là hai lượt round-trip. Gộp thành một bằng script Lua để tiết kiệm một RTT — đáng làm khi p99 quan trọng:

```lua
-- KEYS[1] = tên bảng, ARGV[1] = user_id, ARGV[2] = span (=4)
local rank = redis.call('ZREVRANK', KEYS[1], ARGV[1])
if not rank then return {-1, {}} end            -- chưa có trong bảng
local span  = tonumber(ARGV[2])
local start = math.max(0, rank - span)
local stop  = rank + span
return { rank, redis.call('ZREVRANGE', KEYS[1], start, stop, 'WITHSCORES') }
```

> ⚠️ **Bẫy**: `ZREVRANK` trả về **vị trí 0-based**, còn người dùng muốn thấy hạng 1-based. Luôn `+1` ở tầng ứng dụng. Và khi người chơi chưa có điểm nào, `ZREVRANK` trả `nil` chứ không phải hạng cuối cùng — giao diện phải xử lý trạng thái "chưa xếp hạng" riêng, nếu không sẽ hiện "hạng null".

### 6.5 Hạng thứ tự (ordinal) vs hạng thi đấu (competition)

Đây là một chi tiết nhỏ nhưng hay bị sai, và người phỏng vấn tinh ý sẽ hỏi.

`ZREVRANK` trả về **vị trí trong danh sách đã sắp xếp**. Nếu ba người cùng 900 điểm, ba người đó có ba vị trí khác nhau: 5, 6, 7. Nhưng theo quy tắc thể thao, cả ba phải cùng hạng 6, và người tiếp theo là hạng 9 (kiểu "1224").

```
Điểm:  1000  950  900  900  900  880
ZREVRANK: 0    1    2    3    4    5    ← vị trí
Hạng thi đấu:
  1    2    3    3    3    6            ← đúng theo quy tắc thể thao
```

Cách tính hạng thi đấu đúng, vẫn O(log n):

```bash
ZSCORE leaderboard:2026-09 "mary1934"          # → 900
ZCOUNT leaderboard:2026-09 (900 +inf           # → 2  (số người điểm > 900)
# hạng thi đấu = 2 + 1 = 3
```

Cả hai lệnh đều O(log n) vì `ZCOUNT` cũng dùng `span` để đếm mà không phải duyệt. Đây là cách **đúng** khi đề bài nói "điểm bằng nhau thì cùng hạng", và nó tránh được một tình huống rất khó chịu: hai người cùng 900 điểm nhìn thấy hai hạng khác nhau và một người đi khiếu nại.

---

## 7. Thiết kế key, chu kỳ và lưu trữ lâu dài

### 7.1 Quy ước đặt key

```
leaderboard:{game}:{scope}:{period}

leaderboard:chess:global:2026-09        # bảng toàn cầu tháng 9
leaderboard:chess:global:s7             # bảng theo mùa giải 7
leaderboard:chess:country:VN:2026-09    # bảng Việt Nam
leaderboard:chess:guild:1234:2026-09    # bảng bang hội
leaderboard:chess:global:alltime        # bảng mọi thời đại (không TTL)
```

Đặt tên có cấu trúc không phải chuyện thẩm mỹ. Nó cho bạn ba thứ:

1. **Chu kỳ mới là một key mới, không phải một migration.** Ngày 1 tháng 10 lúc 00:00 UTC, ứng dụng bắt đầu ghi vào `...:2026-10`. Key này chưa tồn tại → `ZINCRBY` tự tạo. **Không có bước "khởi tạo bảng mới"**, không có downtime, không có job. Đây là ưu điểm rất lớn so với việc `TRUNCATE` một bảng SQL.
2. **Bảng cũ vẫn đọc được.** Người chơi xem lại xếp hạng tháng trước? Đọc key cũ.
3. **Rollback dễ.** Ghi nhầm cả tháng? Xoá một key, phát lại event log.

Quy tắc chốt chu kỳ nên nằm ở **một chỗ duy nhất** trong code:

```python
def board_key(game: str, scope: str, at: datetime) -> str:
    # Mốc chuyển mùa dùng UTC, KHÔNG dùng giờ địa phương —
    # nếu không, người ở UTC+7 và người ở UTC-8 sẽ ghi vào hai bảng khác nhau
    # trong cùng một khoảnh khắc.
    return f"leaderboard:{game}:{scope}:{at.strftime('%Y-%m')}"
```

> ⚠️ **Bẫy múi giờ**: Nếu chu kỳ tính theo giờ địa phương của người chơi, hai người ở hai múi giờ sẽ ghi vào hai bảng khác nhau tại cùng một thời điểm — và bảng "tháng 9" sẽ có một cửa sổ 26 giờ. Luôn dùng UTC cho mốc chu kỳ, rồi **hiển thị** theo giờ địa phương nếu muốn.

### 7.2 TTL và vòng đời

```bash
# Đặt TTL khi tạo bảng: giữ 90 ngày sau khi chu kỳ kết thúc
EXPIRE leaderboard:chess:global:2026-09 7776000
```

Nhưng đừng dựa vào TTL một cách mù quáng. Hai điều phải cẩn thận:

- **TTL của Redis xoá nguyên key, không xoá dần.** Xoá một zset 25 triệu phần tử là một thao tác **chặn** có thể mất hàng trăm ms tới vài giây — đủ để làm timeout hàng nghìn request. Giải pháp: bật `lazyfree-lazy-expire yes` (Redis 4+) để việc giải phóng bộ nhớ chạy trên luồng nền. Hoặc chủ động `UNLINK` (phiên bản bất đồng bộ của `DEL`) trong giờ thấp điểm thay vì để TTL tự bắn.
- **TTL không được là cơ chế lưu trữ lịch sử.** Trước khi key hết hạn, phải đã archival xong.

Vòng đời đầy đủ của một bảng tháng:

```
Ngày 1  00:00 UTC   bảng mới bắt đầu (tự tạo khi có ZINCRBY đầu tiên)
Trong tháng         ghi liên tục, đọc liên tục
Ngày cuối 23:59:59  đóng băng: chuyển sang chế độ chỉ đọc
Ngày 1 tháng sau    ┌ job archival:
                    │  ZRANGESTORE → snapshot top 10.000 sang key riêng
                    │  ZSCAN toàn bộ → xuất ra S3 (Parquet, nén)
                    │  ghi top 100 vào MySQL (hall of fame, tra cứu nhanh)
                    │  tính và lưu phân phối điểm (histogram) cho percentile
                    └ đặt EXPIRE 90 ngày cho key gốc
Sau 90 ngày         key biến mất khỏi RAM; truy vấn lịch sử đi S3 + Athena
```

Vì sao chỉ giữ **top 10.000** trong RAM sau khi mùa kết thúc? Vì sau khi giải đã đóng, gần như không ai tra hạng 4 triệu của tháng trước. Giữ 10.000 phần tử tốn 1,2 MB thay vì 4 GB — giảm **3.000 lần**. Ai thật sự cần tra hạng cũ của mình thì đi đường chậm qua S3/Athena, chấp nhận 2 giây.

### 7.3 Kho lạnh

Định dạng lưu ở S3 nên là **Parquet phân vùng theo mùa**:

```
s3://game-leaderboards/season=2026-09/part-0000.parquet
  cột: user_id (string), score (int32), rank (int32), updated_at (timestamp)
  25 triệu dòng, Parquet + Snappy ≈ 150–250 MB
```

Cột `rank` được tính **một lần** tại thời điểm đóng băng — chính là truy vấn `RANK()` mà ta không dám chạy khi bảng còn sống, nhưng hoàn toàn OK khi chạy offline một lần mỗi tháng. Sau đó, tra hạng lịch sử của bất kỳ ai chỉ là một lần đọc Parquet có predicate pushdown.

---

## 8. Khi một node Redis không đủ — sharding leaderboard

Với 5 triệu DAU thì không cần shard. Nhưng phỏng vấn sẽ hỏi "nếu 500 triệu DAU thì sao?", và đây là phần hay nhất của bài.

```
500 triệu DAU, 2,5 tỉ MAU:
  Bộ nhớ  = 2,5e9 × 124 B ≈ 310 GB      → không vừa một node
  Write QPS = 58.000 (peak 300.000)      → vượt trần ~100k ops/s của một node
  Read QPS  = 350.000 (peak 3.500.000)   → chắc chắn phải cache + replica
```

Cả hai trục đều vỡ. Phải chia. Có hai cách chia, và chúng cho hai bộ đánh đổi hoàn toàn khác nhau.

### 8.1 Shard theo dải điểm (range partitioning) — cách dùng được

Ý tưởng: chia không gian **điểm** thành các dải, mỗi dải một node.

```
┌──────────────────────────────────────────────────────────────┐
│ Shard 4 (node D)  điểm 10.000 → ∞      :    120.000 người    │
│ Shard 3 (node C)  điểm 1.000 → 9.999   :  8.400.000 người    │
│ Shard 2 (node B)  điểm 100 → 999       : 41.000.000 người    │
│ Shard 1 (node A)  điểm 0 → 99          : 2.450.000.000 người │
└──────────────────────────────────────────────────────────────┘
        ▲                                        ▲
     rất ít người                          RẤT nhiều người
     (đuôi trên)                           (đuôi dưới)
```

**Top 10** trở nên tầm thường: chỉ hỏi shard cao nhất. `ZREVRANGE shard4 0 9`. Một round-trip, không merge. Đây là ưu điểm quyết định.

**Hạng toàn cục** tính được **chính xác**, và đây là mẹo đẹp nhất của bài:

```
Người chơi 'mary' có 842 điểm → thuộc Shard 2.

rank_toàn_cục = (số người ở MỌI shard có dải điểm CAO HƠN)
              + (rank cục bộ của mary trong Shard 2)

Bước 1:  ZCARD shard4   → 120.000        ─┐
         ZCARD shard3   → 8.400.000       ├─ mỗi lệnh O(1)!
                          ────────────    │  Redis lưu sẵn số phần tử
                          8.520.000      ─┘  trong header của zset

Bước 2:  ZREVRANK shard2 'mary' → 15.230.400     (O(log n))

rank = 8.520.000 + 15.230.400 + 1 = 23.750.401
```

**`ZCARD` là O(1)** vì Redis giữ sẵn biến đếm `length` trong cấu trúc zset — không phải đếm gì cả. Nên với S shard, tính hạng toàn cục chính xác tốn **O(S) lệnh O(1) + 1 lệnh O(log n)**, và tất cả gửi được trong một pipeline. Với S = 8, đó là một round-trip. **Chính xác tuyệt đối, không xấp xỉ.**

Đây là câu trả lời "đúng" cho bài toán này, và nó xứng đáng được nói ra thật rõ ràng trong phỏng vấn.

Nhưng range partitioning có **ba vấn đề thật**, và người phỏng vấn giỏi sẽ hỏi cả ba:

**(a) Phân phối điểm cực kỳ lệch.** Điểm tuân theo power-law: đại đa số ở đáy. Shard 1 chứa 2,45 tỉ người trong khi Shard 4 chứa 120.000 — Shard 1 vừa hết RAM vừa nhận gần như toàn bộ lượt ghi. *Cách xử lý*: chia dải **không đều** dựa trên phân phối thật, sao cho **số người mỗi shard xấp xỉ bằng nhau** (Shard 1: điểm 0–3, Shard 2: 4–11, Shard 3: 12–35, … Shard 8: 4.000–∞). Biên dải tính lại mỗi ngày từ histogram, và vì phân phối **dịch chuyển lên** suốt mùa giải nên biên phải trôi theo — đây là chi phí vận hành thật của phương án này.

**(b) Người chơi di chuyển giữa các shard.** Khi `mary` từ 99 lên 100 điểm, cô ấy phải rời Shard 1 sang Shard 2 — hai lệnh trên hai node, **không atomic**: lỗi giữa chừng thì mary biến mất, hoặc có mặt ở cả hai shard. Đây là bài toán two-phase commit thu nhỏ, và cách rẻ nhất là **ghi vào shard mới trước, xoá ở shard cũ sau** — trạng thái xấu tạm thời là "có mặt hai nơi" (đếm dư 1) chứ không phải "mất", và một job dọn rác chạy nền sẽ so khớp rồi xoá bản thừa. Hai lựa chọn còn lại: khoá phân tán (đúng hơn nhưng thêm một round-trip cho **mọi** lượt ghi vượt biên, mà vùng điểm thấp thì vượt biên liên tục), hoặc phát lại event log mỗi giờ để tự chữa.

**(c) Phải có bản đồ user → shard.** Để biết `mary` ở shard nào mà không hỏi cả 8 node, cần một bảng tra `user_id → shard_id` (Redis hash hoặc DynamoDB) được cập nhật đồng bộ với việc di chuyển. Thêm một round-trip cho mọi thao tác — trừ khi cache ở tầng ứng dụng, mà dữ liệu này đổi rất chậm nên cache rất hiệu quả.

### 8.2 Shard theo hash (Redis Cluster) — dễ vận hành, khó truy vấn

Cách còn lại là để Redis Cluster tự phân bố: `slot = CRC16(key) mod 16384`. Nhưng lưu ý — nếu bạn dùng **một key duy nhất** cho cả bảng, Redis Cluster **không giúp gì cả**: một key chỉ nằm trên một node. Để thật sự chia, bạn phải tự tay tạo N key:

```
leaderboard:2026-09:{0}, leaderboard:2026-09:{1}, ..., leaderboard:2026-09:{15}
shard = hash(user_id) % 16
```

**Ghi**: hoàn hảo. `hash(user_id)` phân bố đều → không có hot shard, không có di chuyển giữa các shard (một người ở mãi một shard suốt mùa), thêm node là scale tuyến tính.

**Top K**: phải **scatter-gather**. Lấy top K từ *mỗi* shard rồi merge:

```
                 ┌──► shard0: ZREVRANGE 0 9  ─┐
Leaderboard Svc ─┼──► shard1: ZREVRANGE 0 9  ─┼──► merge 16×10 = 160
                 ├──► ...                     │    phần tử, sắp xếp,
                 └──► shard15: ZREVRANGE 0 9 ─┘    lấy 10 đầu
```

Điều này **đúng** (người hạng 1 toàn cục chắc chắn nằm trong top 10 của shard chứa anh ta), nhưng độ trễ giờ là **max** của 16 request chứ không phải trung bình: với 16 node, xác suất gặp ít nhất một node đang ở p99 là `1 − 0,99^16 ≈ 15%` — **p50 của bạn giờ gần bằng p85 của một node**. Đây là hiệu ứng "tail at scale" và phải được nêu ra. Với K lớn (top 1.000) thì còn phải kéo 16.000 phần tử mỗi lần.

**Hạng của một người**: vẫn tính được chính xác — `ZCOUNT shard_i (842 +inf` trên **mọi** shard rồi cộng lại, tất cả gửi trong một pipeline. Nhưng chi phí là **O(S) lệnh O(log n)** thay vì O(S) lệnh O(1) của range sharding, và mỗi truy vấn chạm **mọi node**. Với S = 128 và 350.000 rps đọc, đó là **44,8 triệu lệnh/giây** trên cụm — sập; cộng thêm một node chậm sẽ làm chậm **mọi** truy vấn.

Nên câu trả lời đầy đủ là: *"Hash sharding tính được hạng chính xác, nhưng chi phí O(số shard) cho mỗi truy vấn và mỗi truy vấn chạm mọi node — nó không scale theo chiều ta cần. Range sharding chỉ tốn O(1) mỗi shard nhờ `ZCARD`, và đó là lý do tôi chọn nó."*

### 8.3 So sánh hai cách shard

| Tiêu chí | Shard theo dải điểm | Shard theo hash |
|---|---|---|
| Top 10 | **1 shard, 1 round-trip** | Scatter-gather 16 shard, merge |
| Hạng chính xác | **O(S) lệnh O(1) + 1 lệnh O(log n)** nhờ `ZCARD` | O(S) lệnh **O(log n)** bằng `ZCOUNT` — đắt hơn nhiều |
| Phân bố ghi | **Lệch nặng**, shard đáy nhận gần hết | **Đều hoàn hảo** |
| Người chơi đổi shard | Có, và không atomic — bài toán khó nhất | **Không bao giờ** |
| Bản đồ user→shard | Cần, phải đồng bộ | **Không cần** (tính từ hash) |
| Thêm/bớt node | Phải tính lại biên dải + di chuyển hàng loạt | **Resharding chuẩn của Redis Cluster** |
| Tail latency | Thấp (chạm ít node) | **Cao** (mọi truy vấn chạm mọi node) |
| Độ phức tạp vận hành | Cao (biên dải trôi theo thời gian) | Thấp |

**Lựa chọn**: **Range partitioning cho leaderboard**, vì hai truy vấn quan trọng nhất (top-N và rank) đều hưởng lợi trực tiếp, và đó là toàn bộ lý do hệ này tồn tại. Chấp nhận trả giá bằng độ phức tạp vận hành của việc quản lý biên dải.

Nhưng — và đây là phần thông minh — **có một cách thứ ba tốt hơn cả hai**.

### 8.4 Kiến trúc hai tầng: chính xác ở đỉnh, gần đúng ở đuôi

Quan sát then chốt về mặt sản phẩm:

> **Không ai quan tâm mình là hạng 4.301.887 hay 4.301.902.**

Nhưng **ai cũng quan tâm** mình là hạng 7 hay hạng 8. Độ chính xác cần thiết **không đồng đều theo vị trí** — nó tỉ lệ nghịch với hạng. Thiết kế nên phản ánh đúng điều đó.

```
┌─────────────────────────────────────────────────────────────────┐
│ TẦNG NÓNG — một zset duy nhất, không shard                      │
│   leaderboard:2026-09:top                                       │
│   Chứa 1 triệu người điểm cao nhất (~124 MB — bé xíu)          │
│   → ZREVRANK cho hạng CHÍNH XÁC tuyệt đối                       │
│   → ZREVRANGE cho top N và cho ±4 người quanh mình              │
│   Cắt đuôi định kỳ: ZREMRANGEBYRANK key 0 -1000001              │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ TẦNG LẠNH — histogram phân phối điểm                            │
│   leaderboard:2026-09:hist  (một Redis hash, ~1.000 trường)     │
│   HINCRBY hist "bucket_842" 1  mỗi khi có người vào bucket đó    │
│   → hạng GẦN ĐÚNG bằng cách cộng count các bucket cao hơn        │
│   → sai số ≤ kích thước một bucket                              │
└─────────────────────────────────────────────────────────────────┘
```

Cách tính hạng gần đúng từ histogram:

```python
def approximate_rank(score: int, hist: dict[int, int]) -> tuple[int, bool]:
    # hist: {bucket_index: số người trong bucket}, bucket rộng W điểm
    W = 10
    my_bucket = score // W
    # Cộng dồn số người ở mọi bucket cao hơn mình — O(số bucket), không O(n)
    above = sum(c for b, c in hist.items() if b > my_bucket)
    # Nội suy tuyến tính trong bucket của mình:
    # giả định điểm phân bố đều trong bucket
    in_bucket   = hist.get(my_bucket, 0)
    pos_in_buck = ((my_bucket + 1) * W - score) / W
    return int(above + in_bucket * pos_in_buck) + 1, False   # rank_exact=False
```

Với 1.000 bucket, tổng cộng dồn là 1.000 phép cộng trên một dict nằm trong bộ nhớ ứng dụng — **micro giây**, và **không chạm Redis** vì histogram được cache cục bộ và làm mới mỗi 10 giây (nó thay đổi rất chậm ở quy mô triệu người).

Sai số: nếu một bucket 10 điểm chứa 500.000 người, hạng có thể lệch tới ±250.000 quanh vị trí nội suy. Nghe thì to, nhưng **sai 250.000 trên tổng 25 triệu là sai 1%** — và người ở hạng 4 triệu sẽ không bao giờ phát hiện ra. Với người ở hạng 50.000, bucket của họ chỉ chứa vài chục người nên sai số gần như bằng 0. **Sai số tự động nhỏ đi ở chỗ người ta quan tâm** — đó là dấu hiệu của một thiết kế khớp với bài toán.

Cách trình bày điều này ở giao diện cũng quan trọng: thay vì "Hạng 4.301.887", hiện **"Top 18%"** hoặc **"Hạng ~4,3 triệu"**. Con số làm tròn vừa trung thực về độ chính xác vừa dễ hiểu hơn với người chơi.

| Vị trí người chơi | Cách tính | Chính xác? | Chi phí |
|---|---|---|---|
| Hạng 1 – 1.000.000 | `ZREVRANK` trên tầng nóng | **Tuyệt đối** | 1 lệnh O(log n) |
| Hạng > 1.000.000 | Nội suy histogram | Sai ~1% | 0 lệnh Redis (cache cục bộ) |
| Percentile (mọi hạng) | Histogram | Sai < 0,1% | 0 lệnh |

Thiết kế này **xoá hẳn nhu cầu sharding** cho tới quy mô rất lớn: tầng nóng chỉ 1 triệu phần tử = 124 MB, và histogram là hằng số. Thứ duy nhất còn cần đủ chỗ là **điểm số của mọi người** — nhưng cái đó có thể sống trong DynamoDB (một khoá, một giá trị, không cần sắp xếp) thay vì trong RAM.

> 💡 **Nguyên tắc**: Trước khi shard một cấu trúc dữ liệu, hãy hỏi *"có phải mọi phần dữ liệu đều cần cùng một mức chất lượng không?"*. Rất thường xuyên là không — và khi đó, hạ chất lượng ở phần không ai nhìn sẽ rẻ hơn nhiều so với nhân đôi hạ tầng.

---

## 9. Phá thế đồng điểm (tie-breaking) bằng chính con số score

Yêu cầu: hai người cùng 900 điểm thì **ai đạt mốc đó trước xếp trên**. Đây là quy tắc rất phổ biến trong game (và trong mọi cuộc thi), và nó có một lời giải đẹp bất ngờ.

### 9.1 Vì sao không thể dùng field thứ hai

Redis sorted set sắp xếp theo `(score, member)` — khi trùng điểm, nó dùng **thứ tự từ điển của member** làm tie-break. Đó là một quy tắc xác định nhưng **vô nghĩa với người dùng**: "alice" luôn xếp trên "zoe" chỉ vì chữ cái. Không có cách nào bảo Redis "dùng field khác làm tie-break" — zset chỉ có một số thực để sắp xếp.

Nên giải pháp là: **nhét cả hai thông tin vào cùng một con số**.

### 9.2 Score của Redis là IEEE 754 double — có bao nhiêu bit dùng được?

```
IEEE 754 double precision (64 bit):
  1 bit dấu | 11 bit mũ | 52 bit phần định trị (mantissa)

Số nguyên biểu diễn CHÍNH XÁC (không mất bit nào):
  từ -(2^53) đến 2^53  =  ±9.007.199.254.740.992  ≈ 9 × 10^15

⚠️ Vượt 2^53 thì 2^53 + 1 == 2^53 — phép cộng biến mất im lặng.
   Đây là bug kinh điển và rất khó tìm.
```

Vậy ta có **53 bit** để chia cho hai mục đích. Thiết kế bố cục bit:

```
  bit 52 ────────────── bit 22 │ bit 21 ────────────── bit 0
 ┌──────────────────────────────┬──────────────────────────────┐
 │   ĐIỂM  (31 bit)             │  TIMESTAMP ĐẢO  (22 bit)     │
 │   0 … 2.147.483.647          │  0 … 4.194.303 giây          │
 │                              │  ≈ 48,5 ngày — thừa cho      │
 │                              │  một mùa giải 1 tháng        │
 └──────────────────────────────┴──────────────────────────────┘

   combined = score × 2^22 + (T_MAX − Δt)

   Δt     = số giây từ lúc mùa giải bắt đầu tới lúc đạt điểm
   T_MAX  = 2^22 − 1 = 4.194.303
```

Vì sao phải **đảo** timestamp (`T_MAX − Δt`)? Vì zset sắp giảm dần theo score, mà ta muốn **người đạt điểm SỚM xếp TRÊN**. Người đạt sớm có `Δt` nhỏ → `T_MAX − Δt` lớn → `combined` lớn hơn → xếp trên. Đúng ý.

```python
SEASON_START = 1756684800          # 2026-09-01 00:00:00 UTC
TS_BITS      = 22
TS_MAX       = (1 << TS_BITS) - 1  # 4.194.303

def encode(score: int, achieved_at: int) -> int:
    delta = min(achieved_at - SEASON_START, TS_MAX)   # kẹp để không tràn
    return (score << TS_BITS) | (TS_MAX - delta)

def decode(combined: int) -> tuple[int, int]:
    score = combined >> TS_BITS
    delta = TS_MAX - (combined & TS_MAX)
    return score, SEASON_START + delta
```

Kiểm tra bằng ví dụ:

```
alice: 900 điểm, đạt lúc Δt = 100.000 s
  combined = 900 × 4.194.304 + (4.194.303 − 100.000)
           = 3.774.873.600 + 4.094.303
           = 3.778.967.903

bob:   900 điểm, đạt lúc Δt = 500.000 s (muộn hơn)
  combined = 3.774.873.600 + 3.694.303
           = 3.778.567.903

alice > bob  ✓  — cùng 900 điểm, alice đạt trước nên xếp trên.

carol: 901 điểm, đạt muộn nhất Δt = 4.194.303
  combined = 901 × 4.194.304 + 0 = 3.779.067.904
  carol > alice ✓ — điểm cao hơn luôn thắng, bất kể thời gian.
```

Điều kiện đúng đắn quan trọng: **phần timestamp phải không bao giờ tràn sang phần điểm**. Vì `T_MAX − Δt ≤ 2^22 − 1` luôn nhỏ hơn `2^22`, nên nó không bao giờ cộng thêm vào bit điểm. Bảo đảm này phải được viết thành unit test.

Kiểm tra tổng số bit: `31 + 22 = 53` — vừa khít giới hạn `2^53`. Nếu điểm tối đa chỉ 1 triệu thì chỉ cần 20 bit, dư ra 33 bit cho timestamp (đủ 272 năm ở độ phân giải giây, hoặc độ phân giải mili-giây cho 99 ngày). **Luôn tính số bit cụ thể cho ràng buộc của bạn thay vì đoán.**

### 9.3 Cái giá phải trả: mất `ZINCRBY`

Đây là đánh đổi thật và phải nêu ra, vì nó là hệ quả trực tiếp.

Với score thuần, cộng điểm là **một lệnh atomic**: `ZINCRBY key 1 user`. Với score đã mã hoá, `ZINCRBY 1` sẽ cộng 1 vào **phần timestamp**, không phải phần điểm — sai hoàn toàn. Muốn cộng 1 điểm thật, bạn phải: đọc combined → giải mã ra score → tăng score → mã hoá lại với timestamp **mới** → ghi. Đó là read-modify-write, và nếu hai request chạy song song thì mất cập nhật (lost update).

Giải pháp: gói vào một script Lua — Redis chạy script **atomic** vì nó single-threaded:

```lua
-- KEYS[1]=board, ARGV[1]=user_id, ARGV[2]=delta, ARGV[3]=now_epoch
local TS_BITS, TS_MAX, SEASON_START = 22, 4194303, 1756684800

local cur = redis.call('ZSCORE', KEYS[1], ARGV[1])
local old_score = 0
if cur then
  old_score = math.floor(tonumber(cur) / (TS_MAX + 1))
end

local new_score = old_score + tonumber(ARGV[2])
local delta_t   = math.min(tonumber(ARGV[3]) - SEASON_START, TS_MAX)
local combined  = new_score * (TS_MAX + 1) + (TS_MAX - delta_t)

redis.call('ZADD', KEYS[1], combined, ARGV[1])
return {new_score, combined}
```

Chi phí: script này là 2 lệnh thay vì 1, nhưng vẫn **một round-trip** và vẫn atomic. Thông lượng giảm khoảng 30–40% so với `ZINCRBY` thuần — từ ~100k xuống ~65k ops/s. Với 3.000 wps của ta thì không đáng lo, nhưng ở quy mô 300.000 wps thì nó đẩy nhu cầu sharding sớm hơn. Đó chính là kiểu đánh đổi đáng nêu ra trong phỏng vấn: *"tie-breaking không miễn phí — nó đổi một lệnh atomic gốc lấy một script, và cắt khoảng 35% thông lượng ghi."*

### 9.4 Các cách phá thế đồng điểm khác

| Cách | Cơ chế | Khi nào dùng |
|---|---|---|
| **Nhúng timestamp vào score** | Như trên | Khi "ai đạt trước xếp trên" là quy tắc chính thức. Đúng đắn tuyệt đối, chi phí là mất `ZINCRBY` |
| **Dùng phần thập phân** | `score + (1 − Δt/T_MAX)` dưới dạng số thực | Đơn giản hơn về code, nhưng **phụ thuộc vào độ chính xác dấu phẩy động** và dễ sinh lỗi làm tròn khi điểm lớn. Tránh — mã hoá bit tường minh an toàn hơn |
| **Zset thứ hai lưu timestamp** | `ZADD ts_key now user`, tie-break ở tầng ứng dụng | Chỉ đúng khi tie-break trong **một trang kết quả nhỏ** (top 10, ±4 người). **Không** tính được rank toàn cục đúng, vì Redis vẫn sắp theo từ điển member |
| **Chấp nhận cùng hạng** | `ZCOUNT` (§6.5) | Khi đề bài nói "bằng điểm thì cùng hạng". Đơn giản nhất, giữ được `ZINCRBY` |
| **Tie-break bằng member** (mặc định) | Thứ tự từ điển | Không bao giờ nên để lộ ra người dùng — nó tạo thiên vị hệ thống cho người có tên bắt đầu bằng 'a' |

---

## 10. Các loại bảng khác: bạn bè, quốc gia, và league

### 10.1 Bảng xếp hạng theo bạn bè — đừng vật chất hoá

Yêu cầu "xem tôi đứng thứ mấy trong nhóm bạn bè" nghe giống một leaderboard nữa, nhưng nó là bài toán hoàn toàn khác.

**Cách sai**: duy trì một zset riêng cho mỗi người, chứa bạn bè của họ.

```
❌ friends_board:{user_id} → zset gồm bạn bè
   Bộ nhớ  : 25 triệu user × 150 bạn × 124 B = 465 GB
   Ghi     : mỗi lần MỘT người đổi điểm, phải cập nhật zset của
             TẤT CẢ 150 người bạn → 600 wps × 150 = 90.000 wps
   → Vừa đắt bộ nhớ vừa khuếch đại ghi 150 lần. Vô lý.
```

**Cách đúng**: tính lúc đọc, tận dụng `ZSCORE` là **O(1)**.

```python
def friends_leaderboard(user_id: str, board: str) -> list[dict]:
    friends = social_service.get_friends(user_id)        # ~150 id, đã cache
    friends.append(user_id)
    # MỘT lượt round-trip cho cả 150 người:
    scores = redis.zmscore(board, friends)               # O(150), mỗi cái O(1)
    pairs  = [(f, s) for f, s in zip(friends, scores) if s is not None]
    pairs.sort(key=lambda p: -p[1])                      # 150 phần tử — tức thì
    return [{"rank": i + 1, "user_id": f, "score": s}
            for i, (f, s) in enumerate(pairs)]
```

Chi phí: **một round-trip Redis + sắp xếp 150 phần tử trong bộ nhớ ứng dụng**. Tổng cộng dưới 2 ms. Không tốn thêm byte bộ nhớ nào, không khuếch đại ghi.

Vì sao cách này thắng tuyệt đối? Vì **nhóm bạn bè nhỏ có chặn trên**. 150, 500, thậm chí 5.000 bạn — sắp xếp trong RAM ứng dụng là chuyện vặt. Bài học tổng quát: **khi tập cần sắp xếp có kích thước bị chặn nhỏ, đừng dựng index; hãy lấy dữ liệu thô rồi sắp xếp tại chỗ đọc.** Chỉ vật chất hoá khi tập vượt quá khả năng sắp xếp tại chỗ.

(Ngoại lệ: người chơi có 50.000 "bạn" — streamer, người nổi tiếng. Với những tài khoản đó thì cắt xuống top N bạn thân/tương tác gần đây, hoặc chuyển sang bảng được vật chất hoá riêng. Đây là lần nữa cái đuôi dài buộc ta làm hai đường code khác nhau.)

### 10.2 Bảng theo quốc gia — ghi kép

```bash
# Một lần ghi điểm → hai lệnh, gói trong MULTI hoặc script Lua
MULTI
ZINCRBY leaderboard:global:2026-09    1 "mary1934"
ZINCRBY leaderboard:country:VN:2026-09 1 "mary1934"
EXEC
```

Chi phí: nhân đôi lượt ghi (600 → 1.200 wps) và gần như nhân đôi bộ nhớ (mỗi người xuất hiện ở hai zset). Với ta thì hoàn toàn chấp nhận được.

Lợi ích bất ngờ: **bảng quốc gia chính là một dạng sharding tự nhiên và có ý nghĩa với người dùng**. Bảng Việt Nam có vài triệu người thay vì 25 triệu; bảng Iceland có vài chục nghìn. Hạng trong nước vừa chính xác hơn (tập nhỏ hơn) vừa **có ý nghĩa hơn với người chơi** ("hạng 340 Việt Nam" thú vị hơn "hạng 4.301.887 toàn cầu" rất nhiều). Nhiều game thật đã bỏ hẳn bảng toàn cầu cho đa số người chơi vì lý do này.

Lưu ý về quốc gia của người chơi: nó **có thể đổi** (di cư, VPN). Khi đổi thì phải `ZREM` khỏi bảng cũ và `ZADD` vào bảng mới — chính là bài toán di chuyển shard ở §8.1. Ràng buộc chống lạm dụng: chỉ cho đổi quốc gia một lần mỗi mùa giải, và không cho đổi trong 7 ngày cuối.

### 10.3 League / bucket — cách giết chết bài toán từ gốc

Đây là kiến trúc Duolingo, Clash Royale và rất nhiều game thật dùng: thay vì **một** bảng 25 triệu người, dùng **500.000 phòng, mỗi phòng 50 người cùng trình độ**. Mỗi tuần, top 10 mỗi phòng thăng hạng, đáy 10 rớt hạng, phòng được xáo lại. Hệ quả kỹ thuật:

| | Bảng đơn 25 triệu | 500.000 phòng × 50 |
|---|---|---|
| Cấu trúc Redis | `skiplist`, 124 B/phần tử | **`listpack`** (< 128 phần tử) ≈ **30 B/phần tử** |
| Bộ nhớ | 3,1 GB | **~750 MB** |
| Rank | O(log 25.000.000) ≈ 25 bước | **O(50) trên mảng liền kề — nhanh hơn nhờ cache CPU** |
| Sharding | Khó (§8) | **Tầm thường**: key phòng là đơn vị shard hoàn hảo |
| "±4 người quanh tôi" | Cần 2 lệnh | Lấy cả phòng 50 người về, làm gì cũng được |
| Giá trị sản phẩm | Hạng 4 triệu — vô nghĩa, gây nản | **Hạng 12/50 — có thể vươn tới được** |

Cần nói rõ: **listpack** là encoding nén của Redis cho collection nhỏ — một mảng byte liền kề, không con trỏ, không hash table. Truy vấn là O(n) nhưng n ≤ 128 và dữ liệu nằm trong vài dòng cache CPU, nên thực tế nó **nhanh hơn** skip list. Redis tự chuyển sang skiplist khi vượt ngưỡng `zset-max-listpack-entries` (128) hoặc `zset-max-listpack-value` (64 byte).

> 💡 **Nguyên tắc**: Câu trả lời hay nhất cho một bài toán scale đôi khi là **thay đổi bài toán**. Nếu bạn nêu được kiến trúc league trong phỏng vấn — kèm lý do nó vừa tốt hơn về kỹ thuật vừa tốt hơn về sản phẩm — bạn đang thể hiện tư duy của người thiết kế sản phẩm chứ không chỉ người viết code. Nhưng hãy nêu nó như **một lựa chọn có điều kiện**, rồi quay lại giải bài đã cho — đừng dùng nó để né câu hỏi.

---

## 11. Cache và fanout — nơi giải quyết 95% tải

Nhắc lại con số ở §2.2: đỉnh đọc có thể lên **170.000 rps**, trong đó tuyệt đại đa số là **top 10 — một câu trả lời giống hệt nhau cho tất cả mọi người**.

### 11.1 Ba tầng cache, và tầng nào gánh bao nhiêu

```
170.000 rps từ client
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ TẦNG 1 — CDN (CloudFront), TTL 1 giây                    │
│ Cache-Control: public, max-age=1, stale-while-revalidate=5│
│ Tỉ lệ hit ≈ 99%+                                          │
│ Vì sao: 400 POP × 1 request/giây mỗi POP = 400 rps        │
│         đi tiếp về origin                                 │
└──────────────────────────┬───────────────────────────────┘
                           ▼  ~400 rps
┌──────────────────────────────────────────────────────────┐
│ TẦNG 2 — cache TRONG PROCESS của app server, TTL 1 giây  │
│ Một biến trong RAM + một goroutine/timer làm mới nền     │
│ 20 instance × 1 lần làm mới/giây = 20 rps                │
└──────────────────────────┬───────────────────────────────┘
                           ▼  ~20 rps
┌──────────────────────────────────────────────────────────┐
│ TẦNG 3 — Redis                                            │
│ 20 lệnh ZREVRANGE/giây. Tức là 0,02% công suất một node. │
└──────────────────────────────────────────────────────────┘
```

**170.000 rps xuống còn 20 rps.** Giảm 8.500 lần, bằng hai dòng cấu hình và một biến trong bộ nhớ. Đây là kết luận quan trọng nhất của cả bài về mặt vận hành, và nó đáng được nói ngay trước khi bàn tới sharding — vì rất nhiều ứng viên vẽ cụm Redis 20 node cho một tải mà một node dùng 0,02%.

### 11.2 Vì sao TTL 1 giây là đúng, không phải 60 giây và không phải 0

- **TTL = 0 (không cache)**: Redis chịu toàn bộ 170.000 rps. Một node không gánh nổi. Phải thêm 10–20 replica chỉ để phục vụ **cùng một câu trả lời** lặp đi lặp lại. Lãng phí ngớ ngẩn.
- **TTL = 1 giây**: người chơi thấy bảng trễ tối đa 1 giây. **Không ai phân biệt được** — thời gian để mắt đọc xong 10 dòng còn lâu hơn thế. Đồng thời giảm tải 8.500 lần.
- **TTL = 60 giây**: giảm thêm không đáng kể (từ 20 rps xuống 0,3 rps — Redis chả quan tâm), nhưng phá vỡ cảm giác "real-time". Người chơi vừa lên hạng 3 mà bảng vẫn hiện hạng cũ suốt một phút thì họ sẽ nghĩ hệ thống hỏng.

Đường cong lợi ích **bão hoà gần như hoàn toàn ở 1 giây**. Đó là lý do 1 giây là con số đúng, chứ không phải vì nó tròn.

`stale-while-revalidate=5` là chi tiết đáng thêm: khi cache hết hạn, CDN **trả ngay bản cũ** cho người dùng rồi mới đi làm mới ở nền. Người dùng không bao giờ phải chờ. Nó cũng chống được **cache stampede** — tình huống cache hết hạn và 1.000 request cùng lúc lao về origin.

### 11.3 Rank cá nhân — không cache chung được, nhưng vẫn cache được

"Hạng của tôi" là cá nhân hoá, nên không dùng chung được giữa các user. Nhưng:

- **Cache theo user, TTL 5 giây**, key `rank:{board}:{user_id}`. Client thường poll màn hình leaderboard vài lần mỗi phút; 5 giây là đủ tươi.
- **Đẩy chủ động thay vì hỏi liên tục**: khi người chơi vừa kết thúc trận, server đã biết điểm mới → trả luôn hạng mới trong response của chính request ghi điểm (`POST /scores` trả về `{new_score, new_rank}`). Client không phải hỏi lại. **Một round-trip bị xoá hoàn toàn**, và đây là request phổ biến nhất trong cả hệ.
- Với người ở đuôi bảng, hạng dùng histogram (§8.4) → **không chạm Redis chút nào**, và histogram thay đổi rất chậm nên cache được 10–30 giây.

### 11.4 Ba bẫy cache phải nêu

> ⚠️ **Cache stampede**: Nếu 20 app instance cùng có TTL hết hạn vào cùng một giây (rất dễ xảy ra vì tất cả đều khởi động cùng lúc lúc deploy), Redis nhận 20 request đồng thời — vô hại ở đây, nhưng cùng cơ chế đó ở quy mô lớn hơn (2.000 instance) sẽ giết origin. Phòng: thêm **jitter** vào TTL (`1s ± 200ms` ngẫu nhiên), và dùng single-flight (chỉ một goroutine đi làm mới, các goroutine khác chờ kết quả của nó).

> ⚠️ **Cache của top 10 phải bao gồm cả hồ sơ người chơi**. Nếu bạn cache 10 `(user_id, score)` rồi mỗi request lại đi tra 10 cái tên/avatar ở MySQL, bạn chỉ chuyển vấn đề sang chỗ khác — 170.000 rps × 10 lookup = 1,7 triệu truy vấn/giây. Hãy cache **response đã render hoàn chỉnh**, kèm tên và URL avatar. Vì top 10 đổi chậm, hồ sơ của họ có thể cache rất lâu (5 phút).

> ⚠️ **Đừng cache "hạng của tôi" ở CDN.** Response cá nhân hoá phải có `Cache-Control: private`. Một lỗi cấu hình ở đây khiến người dùng A nhìn thấy hạng của người dùng B — một sự cố rò rỉ dữ liệu thật sự đã xảy ra ở nhiều hệ thống.

---

## 12. Availability và khôi phục sau sự cố

### 12.1 Redis có phải single point of failure không?

Nếu chạy một node đơn: **có, và đó là rủi ro lớn nhất của cả thiết kế**. Hãy phân tích thẳng thắn.

| Kịch bản hỏng | Hậu quả nếu không phòng | Cách phòng |
|---|---|---|
| Process Redis crash | Mất toàn bộ dữ liệu trong RAM. Leaderboard về 0 | Persistence (AOF/RDB) + replica |
| Máy chủ chết | Như trên + downtime cho tới khi dựng máy mới | Replica ở AZ khác + tự động failover |
| Mất cả AZ | Mất cả primary lẫn replica nếu cùng AZ | Replica **bắt buộc** ở AZ khác |
| Xoá nhầm key (`FLUSHALL`) | Mất sạch, và replica **sao chép luôn lệnh xoá** | Đổi tên lệnh nguy hiểm (`rename-command`), backup định kỳ, dựng lại từ event log |
| Mất dữ liệu im lặng do OOM | Redis evict phần tử theo `maxmemory-policy` → người chơi biến mất khỏi bảng một cách ngẫu nhiên | Đặt **`maxmemory-policy noeviction`** cho leaderboard. Thà lỗi ghi rõ ràng còn hơn mất dữ liệu âm thầm |

Mục cuối đáng nhấn mạnh: mặc định của nhiều cụm cache là `allkeys-lru`, nghĩa là khi hết bộ nhớ, Redis **tự xoá bớt phần tử**. Với một cache thì đó là hành vi đúng. Với một leaderboard thì đó là thảm hoạ — người chơi biến mất khỏi bảng mà không có log nào. **Leaderboard là kho dữ liệu, không phải cache**, nên phải cấu hình như kho dữ liệu.

### 12.2 Persistence: RDB vs AOF

| | RDB (snapshot) | AOF (append-only file) |
|---|---|---|
| Cơ chế | `fork()` định kỳ, ghi ảnh chụp nhị phân toàn bộ dataset | Ghi mọi lệnh ghi vào một file log |
| Mất dữ liệu khi crash | Tới **toàn bộ khoảng giữa hai snapshot** (thường 5–15 phút) | `appendfsync everysec` → tối đa **1 giây** |
| Chi phí lúc chạy | `fork()` một tiến trình 4 GB: copy-on-write khiến bộ nhớ có thể **tăng vọt** nếu đang ghi nhiều | Ghi tuần tự, rẻ, nhưng file phình → cần rewrite định kỳ |
| Thời gian khôi phục | **Nhanh** (nạp file nhị phân) | Chậm (phát lại từng lệnh) |
| Kích thước file | Nhỏ, nén | To hơn nhiều |

**Lựa chọn cho bài này: bật cả hai.** RDB mỗi 15 phút cho khôi phục nhanh, AOF `everysec` cho ranh giới mất mát 1 giây. Redis 7 có **AOF đa phần (multi-part AOF)** kết hợp một snapshot nền + các file incremental, giải quyết gần hết vấn đề phình file.

Nhưng đây là câu quan trọng nhất phải nói: **kể cả với AOF, bạn vẫn có thể mất 1 giây dữ liệu — và điều đó hoàn toàn chấp nhận được, vì Redis không phải nguồn sự thật.** Event log mới là nguồn sự thật.

### 12.3 Khôi phục từ nguồn sự thật — tính ra thời gian cụ thể

Đây là phần mà ứng viên giỏi tách khỏi ứng viên trung bình: **không dừng ở "dựng lại từ DB", mà tính xem dựng lại mất bao lâu.**

```
Kịch bản: Redis mất sạch dữ liệu bảng tháng 9, vào ngày 20/9.

Cách 1 — phát lại toàn bộ event log:
  Số sự kiện từ ngày 1 tới ngày 20 = 50.000.000 × 20 = 1 tỉ
  Tốc độ nạp bằng pipeline (batch 1.000 lệnh/lần gửi):
    ~500.000 ZINCRBY/giây trên một node (pipeline rất hiệu quả)
  Thời gian = 1.000.000.000 / 500.000 = 2.000 giây ≈ 33 phút
  ⚠️ 33 phút không có leaderboard. Quá lâu.

Cách 2 — snapshot điểm số + phát lại phần delta:
  Mỗi 10 phút, một job xuất trạng thái điểm hiện tại
  (user_id, score) ra S3 — 25 triệu dòng, Parquet ≈ 200 MB
  Khôi phục:
    (a) nạp snapshot: 25.000.000 ZADD qua pipeline
        = 25.000.000 / 500.000 = 50 giây
    (b) phát lại delta tối đa 10 phút = 600 s × 580 wps
        = 348.000 sự kiện = dưới 1 giây
  Tổng ≈ 1 phút.  ✓
```

**Snapshot định kỳ rút thời gian khôi phục từ 33 phút xuống 1 phút.** Đây là con số đáng nói to, vì nó biến "chúng ta có backup" thành "RTO của chúng ta là 1 phút".

Có thể làm tốt hơn nữa bằng cách giữ một **replica ấm ở region khác** — nhưng lúc đó chi phí gấp đôi và bạn phải hỏi lại: leaderboard sập 1 phút có đáng để trả gấp đôi không? Câu trả lời thường là không. Đây là chỗ để nói về việc gắn quyết định kỹ thuật với giá trị kinh doanh.

### 12.4 Chế độ suy giảm (graceful degradation)

Khi Redis không sẵn sàng, **đừng trả lỗi 500**. Xếp theo thứ tự ưu tiên những gì còn phục vụ được:

```
1. Top 10 từ cache CDN (còn sống thêm được vài phút nhờ stale-while-revalidate
   và, nếu cấu hình, stale-if-error=300)
2. Top 100 từ snapshot MySQL cập nhật mỗi phút
3. Điểm của chính người chơi từ DynamoDB/MySQL (không có hạng)
4. Hạng gần đúng từ histogram (§8.4) — histogram nhỏ, dễ nhân bản ở nhiều nơi
5. Cuối cùng: hiện thông báo "bảng xếp hạng đang cập nhật, điểm của bạn
   vẫn được ghi nhận đầy đủ" — và điều đó PHẢI đúng, tức là
   đường ghi vào event log phải độc lập với Redis
```

Điểm mấu chốt của danh sách này: **đường ghi và đường đọc phải hỏng độc lập với nhau**. Nếu game server ghi thẳng vào Redis rồi mới ghi log, thì Redis chết sẽ làm mất điểm. Nếu ghi vào Kinesis trước rồi mới cập nhật Redis (hoặc ghi song song), thì Redis chết chỉ làm mất **hiển thị**, không mất **dữ liệu**. Người chơi tha thứ cho bảng xếp hạng trễ; họ không tha thứ cho việc mất điểm.

### 12.5 Các chế độ hỏng khác

| Chế độ hỏng | Triệu chứng | Xử lý |
|---|---|---|
| **Hot key** — mọi request đọc cùng một key | Một node Redis bão hoà CPU trong khi các node khác nhàn rỗi | Đây chính xác là thứ cache §11 giải quyết. Ngoài ra có thể nhân bản key top-N sang nhiều node (`leaderboard:top:copy0..3`) và cho client chọn ngẫu nhiên |
| **Lệnh chậm chặn cả server** | `ZRANGE key 0 -1` trên 25 triệu phần tử chặn Redis vài giây → **mọi** client timeout | Cấm lệnh không giới hạn ở tầng thư viện client. Đặt `slowlog-log-slower-than 10000` và cảnh báo. Dùng `ZSCAN` cho việc quét toàn bộ |
| **Replica trễ (lag)** | Người chơi ghi điểm xong đọc lại thấy điểm cũ → tưởng mất điểm | Read-your-own-writes: request ngay sau ghi thì đọc primary. Hoặc client hiển thị giá trị lạc quan từ response của lệnh ghi |
| **Đồng hồ lệch** giữa các game server | Tie-breaking theo timestamp bị sai thứ tự | Timestamp phải do **leaderboard service** gắn (một nguồn), không do game server gửi lên. Hoặc dùng NTP + chấp nhận sai vài chục ms |
| **Chuyển giao mùa giải** lúc 00:00 UTC | Mọi client cùng lúc gọi bảng mới → cache lạnh toàn cục, đồng thời bảng cũ bị đọc dồn để xem kết quả cuối | Làm ấm cache trước (pre-warm), và **giữ bảng cũ ở chế độ chỉ đọc 24 giờ** thay vì ẩn ngay |
| **Sự kiện cuối mùa** | 170.000 rps trong 30 giây cuối | Cache đã xử lý. Ngoài ra: tăng công suất theo lịch (scheduled scaling), không đợi autoscale phản ứng |

---

## 13. Chống gian lận điểm

Một leaderboard bị gian lận là một leaderboard chết — người chơi nghiêm túc bỏ đi trong vài tuần. Đây không phải phần "nếu còn thời gian"; với sản phẩm thật, nó là yêu cầu chính.

### 13.1 Server-authoritative — nền tảng của mọi thứ

```
❌ SAI:  Client ──"tôi thắng, +500 điểm"──► Leaderboard Service
         Một proxy MITM là đủ để leo lên hạng 1 trong 5 phút.

✅ ĐÚNG: Client ──"nước đi của tôi"──► Game Server (mô phỏng trận đấu)
                                          │
                                          │ Game Server tự quyết định
                                          │ ai thắng và được mấy điểm
                                          ▼
                                    Leaderboard Service
```

Với game mà logic chạy trên server (cờ vua, MOBA, game bài), điều này là tự nhiên. Với game chạy hoàn toàn trên client (game giải đố offline, endless runner), đây là **bài toán khó thật sự** — bạn không thể tin bất cứ thứ gì client gửi. Các biện pháp thực tế:

- **Gửi kèm bản ghi lại (replay)** toàn bộ input của người chơi, server mô phỏng lại để xác nhận điểm. Tốn tài nguyên nhưng rất hiệu quả — chỉ mô phỏng lại các điểm số đủ cao để lọt vào top.
- **Kiểm tra tính hợp lý (plausibility check)**: điểm 500.000 trong một trận 90 giây là bất khả thi về mặt vật lý của game. Ngưỡng này rút ra từ phân phối điểm thật.
- **Chứng thực thiết bị** (Play Integrity API, App Attest) để phát hiện thiết bị root/jailbreak và app đã bị sửa.

### 13.2 Các lớp phòng thủ

```
┌─── Lớp 1: Danh tính & xác thực ────────────────────────────────┐
│ API ghi điểm chỉ nhận từ game server, xác thực bằng mTLS       │
│ hoặc HMAC ký trên toàn bộ body + timestamp + nonce             │
│ signature = HMAC-SHA256(secret, body + ts + nonce)             │
│ Từ chối nếu |now − ts| > 30 s  → chặn replay attack            │
└────────────────────────────────────────────────────────────────┘
┌─── Lớp 2: Idempotency ─────────────────────────────────────────┐
│ SET dedupe:{match_id} 1 NX EX 86400                            │
│ Trả về nil → trận này đã ghi rồi → bỏ qua                      │
│ Chặn cả retry vô hại lẫn replay cố ý                           │
└────────────────────────────────────────────────────────────────┘
┌─── Lớp 3: Rate limit theo ngữ nghĩa game ──────────────────────┐
│ Không phải "100 req/phút" mà là ràng buộc CỦA GAME:            │
│   - một trận cờ không thể ngắn hơn 30 giây                     │
│   - tối đa 200 trận/ngày cho một tài khoản                     │
│   - điểm tăng tối đa X/giờ                                     │
│ Rate limit theo luật game bắt được thứ mà rate limit theo       │
│ HTTP không bao giờ bắt được.                                    │
└────────────────────────────────────────────────────────────────┘
┌─── Lớp 4: Phát hiện bất thường (offline) ──────────────────────┐
│ Job chạy trên event log ở S3:                                   │
│   - tỉ lệ thắng > 99% qua 200 trận                             │
│   - thời lượng trận lệch chuẩn > 4σ so với phân phối           │
│   - nhiều tài khoản chung IP/thiết bị luân phiên thắng nhau     │
│     (win-trading — cực phổ biến và rất khó bắt bằng luật đơn)  │
│   - điểm tăng theo bậc thang hoàn hảo (dấu hiệu của bot)       │
└────────────────────────────────────────────────────────────────┘
┌─── Lớp 5: Xử lý ───────────────────────────────────────────────┐
│ Shadow ban: người gian lận vẫn thấy điểm mình tăng, nhưng       │
│ ZREM khỏi bảng công khai. Họ không biết mình bị bắt nên          │
│ không đi tìm cách né mới. Hiệu quả hơn ban thẳng rất nhiều.     │
│ Bảng "đã kiểm chứng" riêng: chỉ gồm tài khoản đã qua            │
│ xác minh, dùng cho giải đấu có thưởng.                          │
└────────────────────────────────────────────────────────────────┘
```

> 💡 **Nguyên tắc**: Rate limit theo **ngữ nghĩa miền** luôn mạnh hơn rate limit theo giao thức. "Tối đa 100 request/phút" chặn được bot ngu; "một trận cờ không thể kết thúc dưới 30 giây" chặn được bot thông minh, vì nó ràng buộc vào một sự thật của game mà kẻ tấn công không lách được nếu không làm chậm chính mình.

Một chi tiết vận hành: khi phát hiện gian lận sau nhiều ngày, bạn phải **gỡ điểm về**. Nếu Redis là nguồn sự thật thì bạn phải đoán xem trừ bao nhiêu. Nếu event log là nguồn sự thật, bạn **đánh dấu các sự kiện gian lận là vô hiệu rồi dựng lại bảng** — chính xác tuyệt đối. Đây là lý do thực dụng thứ hai để có event log, bên cạnh khôi phục sau sự cố.

---

## 14. Phương án 3 — NoSQL (DynamoDB)

Nếu vì lý do nào đó bạn không muốn dùng Redis (ví dụ: yêu cầu độ bền tuyệt đối, hoặc tổ chức không muốn vận hành thêm một loại datastore), DynamoDB làm được — nhưng bạn nên hiểu rõ mình đang đánh đổi cái gì.

### 14.1 Vấn đề của thiết kế ngây thơ

```
Bảng: leaderboard
  PK (partition key) = season_id  ("2026-09")
  SK (sort key)      = score      (số)
```

Thiết kế này hỏng ngay ở ba chỗ:

1. **Một partition cho cả mùa**: DynamoDB giới hạn **3.000 RCU và 1.000 WCU cho mỗi partition vật lý**. 3.000 wps ghi vào một partition key sẽ bị throttle ngay. Đây là "hot partition" kinh điển.
2. **`score` làm sort key nhưng score lại thay đổi**: khoá chính trong DynamoDB **bất biến**. Đổi điểm = xoá item cũ + tạo item mới. Hai thao tác, và cần `TransactWriteItems` để atomic (đắt gấp đôi).
3. **Không unique**: hai người cùng điểm sẽ đè lên nhau vì `(season, score)` trùng.

### 14.2 Thiết kế đúng: write sharding + GSI

```
Bảng chính (nguồn sự thật của điểm số):
  PK = "SEASON#2026-09#USER#u_1934"
  attributes: score (N), updated_at (N), shard (N)
  → UpdateItem với ADD score :delta  — atomic, không cần đọc trước
  → phân bố hoàn hảo vì PK chứa user_id

Global Secondary Index (để truy vấn theo điểm):
  GSI-PK = "SEASON#2026-09#SHARD#7"     (shard = hash(user_id) % 32)
  GSI-SK = score (N)
  → Query GSI-PK = shard cụ thể, ScanIndexForward=false, Limit=10
```

Sơ đồ ghi và đọc:

```
GHI (rất tốt):
   UpdateItem PK="SEASON#2026-09#USER#u_1934"  ADD score 1
   → một thao tác, atomic, phân bố đều trên mọi partition
   → DynamoDB tự cập nhật GSI ở nền (bất đồng bộ)

ĐỌC TOP 10 (tạm được):
   ┌─► Query GSI shard 0, Limit 10  ─┐
   ├─► Query GSI shard 1, Limit 10  ─┤   32 truy vấn song song
   ├─► ...                           ├─► merge 320 item → lấy 10
   └─► Query GSI shard 31, Limit 10 ─┘

ĐỌC HẠNG CỦA MỘT NGƯỜI (không làm được):
   ✗ Không có cách nào đếm "bao nhiêu item có score > X" trong O(log n).
     DynamoDB Query trả về item, không trả về số đếm theo thứ tự.
     Muốn đếm thì phải Scan — và Scan 25 triệu item là chuyện của phút,
     không phải mili-giây.
```

### 14.3 Chọn số shard: đánh đổi giữa ghi và đọc

| Số shard | Thông lượng ghi | Chi phí đọc top-10 | Ghi chú |
|---|---|---|---|
| 1 | 1.000 WCU — **bị throttle** | 1 query | Không dùng được |
| 32 | 32.000 WCU | 32 query song song, merge 320 item | Cân bằng hợp lý |
| 256 | 256.000 WCU | 256 query — độ trễ = max của 256, tail latency tệ | Chỉ khi ghi cực lớn |

Quy tắc: **số shard = ceil(peak WCU / 1.000) × hệ số an toàn 2**. Với 6.000 wps peak → `ceil(6) × 2 = 12`, làm tròn lên luỹ thừa của 2 → **16 shard**. Và điểm này phải nói rõ: **đây là con số cần benchmark, không phải suy luận** — vì kích thước item, độ dài attribute, và mẫu truy cập thật đều ảnh hưởng.

Lưu ý thêm: GSI của DynamoDB được cập nhật **bất đồng bộ**, thường trễ vài chục tới vài trăm ms. Nghĩa là top 10 của bạn có thể trễ một chút so với bảng chính — hoàn toàn chấp nhận được với leaderboard, nhưng phải biết là nó tồn tại.

### 14.4 Giải bài toán hạng bằng percentile

Vì không tính được hạng chính xác, ta chuyển sang **percentile tính offline** — chính là ý tưởng histogram ở §8.4:

```
Job cron mỗi 10 phút:
  1. Đọc phân phối điểm (từ DynamoDB Streams → Kinesis → aggregation,
     hoặc quét bảng mỗi giờ với Parallel Scan)
  2. Tính bảng ngưỡng percentile, lưu vào một item duy nhất:
     PK = "SEASON#2026-09#PERCENTILES"
     data = { "p99": 6500, "p95": 3200, "p90": 1800, ...,
              "p10": 100, "p01": 5 }
  3. Ứng dụng cache item này (nó bé, đổi chậm)

Truy vấn "hạng của tôi":
  - score 842 nằm giữa p80 (700) và p85 (950)
  - → "Bạn thuộc top 18%"  hoặc  "hạng khoảng 4,5 triệu"
```

Với người chơi ở đuôi bảng thì đây là **câu trả lời tốt hơn** một con số chính xác: "Top 18%" dễ hiểu và tạo động lực hơn "hạng 4.301.887". Nhưng với top 1.000 thì không chấp nhận được — nên vẫn cần một zset Redis nhỏ (hoặc một item DynamoDB chứa cả mảng top 1.000) cho phần đỉnh. Tức là **cuối cùng bạn vẫn quay về kiến trúc hai tầng của §8.4**.

### 14.5 So sánh ba phương án

| Tiêu chí | MySQL | **Redis Sorted Set** | DynamoDB |
|---|---|---|---|
| Top 10 | Tốt (index + LIMIT) | **Xuất sắc** — O(log n + 10) | Tạm — scatter-gather N shard |
| Hạng chính xác | **Không thể ở quy mô lớn** — O(n) | **O(log n)** | **Không thể** — chỉ có percentile |
| ±4 người quanh mình | Không thể (cần rank trước) | **Một lệnh** | Không thể |
| Thông lượng ghi | ~5–10k wps (với tuning) | **~100k ops/s một node** | **Không giới hạn** (trả tiền là có) |
| Độ bền | **Xuất sắc** | Yếu (AOF 1 s) — trừ MemoryDB | **Xuất sắc** — nhân bản 3 AZ |
| Độ trễ p99 | 1–50 ms | **< 1 ms** | 5–15 ms (GSI eventually consistent) |
| Chi phí ở quy mô này | Thấp | Thấp (một node r7g) | Trung bình–cao (trả theo request) |
| Gánh nặng vận hành | Trung bình | Trung bình (failover, bộ nhớ) | **Gần bằng 0** |
| **Kết luận** | Nguồn sự thật + hồ sơ | **Chỉ mục xếp hạng chính** | Lưu điểm bền + phương án không cần vận hành |

**Kiến trúc cuối cùng dùng cả ba, mỗi cái đúng việc của nó**: DynamoDB (hoặc MySQL) giữ điểm số bền vững và hồ sơ người chơi; Redis giữ chỉ mục xếp hạng; S3 + Athena giữ lịch sử và phục vụ phân tích. Redis **có thể mất sạch mà hệ thống vẫn đúng** — nó chỉ là một chỉ mục dựng lại được. Nói được câu đó là đã trả lời xong câu hỏi "Redis có phải single point of failure không".

---

## 15. Bottleneck: cái gì nghẽn trước?

Xếp theo thứ tự thật sự sẽ gặp khi tăng tải:

```
1. ĐỌC TOP-10 (nghẽn đầu tiên, ở mức ~50k rps nếu KHÔNG có cache)
   → Giải bằng cache TTL 1 s. Sau khi có cache, trục này biến mất
     hoàn toàn cho tới quy mô hàng triệu rps. §11

2. CPU của node Redis (ở mức ~100k ops/s)
   → Redis single-threaded cho việc xử lý lệnh. Không thể "thêm core".
   → Giải bằng: replica cho đọc, rồi sharding cho ghi. §8
   → Ở 5M DAU: dùng 3% công suất. Còn rất xa.

3. BỘ NHỚ (ở mức ~50 triệu phần tử trên một node 16 GB)
   → Giải bằng: cắt đuôi (giữ top 1M) + histogram. §8.4
   → Nhớ chừa chỗ cho fork lúc BGSAVE.

4. TRUY VẤN HẠNG SAU KHI SHARD (ở mức S > 32 shard)
   → Mỗi truy vấn chạm mọi shard → chi phí O(S), tail latency tệ.
   → Giải bằng: range sharding (ZCARD O(1)) hoặc hạng gần đúng. §8

5. GHI KHI SỐ BẢNG NHÂN LÊN
   → Mỗi lần ghi điểm phải cập nhật: bảng toàn cầu + quốc gia +
     bang hội + all-time + bảng tuần = 5 lệnh
   → 600 wps trở thành 3.000 wps. Vẫn nhỏ, nhưng phải nhớ nhân lên
     khi định cỡ, và cân nhắc gộp thành một script Lua để tiết kiệm RTT.

6. THỜI GIAN KHÔI PHỤC (không phải throughput, nhưng là ràng buộc thật)
   → 33 phút phát lại log là không chấp nhận được.
   → Giải bằng snapshot 10 phút → RTO 1 phút. §12.3
```

> 💡 **Nguyên tắc**: Trong bài này, thứ nghẽn trước không phải thứ khó nhất. **Đọc top-10 nghẽn trước nhưng dễ giải nhất** (một dòng `Cache-Control`). **Hạng chính xác khó nhất nhưng nghẽn muộn nhất**. Thứ tự này phải được trình bày đúng — nếu bạn dành 20 phút nói về sharding mà không nói về cache, bạn đang tối ưu cái chưa vỡ.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp (và bẫy) |
|---|---|---|
| Sorted set leaderboard — **lựa chọn mặc định** | **ElastiCache for Redis/Valkey**, cluster mode **tắt**, 1 primary + 1–2 replica khác AZ | 25 triệu phần tử = 3,1 GB, vừa gọn một node `cache.r7g.xlarge` (~26 GB). Cluster mode tắt vì ta chỉ có **một key lớn** — bật cluster mode cũng chẳng chia được một key ra nhiều slot. ⚠️ Đặt `maxmemory-policy` = **`noeviction`**, không phải `allkeys-lru` mặc định của tư duy cache: leaderboard bị evict âm thầm là mất dữ liệu không có log |
| Sorted set khi **không được phép mất dữ liệu** | **MemoryDB for Redis/Valkey** | Đây là điểm quan trọng nhất của bài trên AWS. MemoryDB có API Redis y hệt nhưng **ghi vào một nhật ký giao dịch phân tán đa AZ trước khi ACK** → **durability thật sự, mất dữ liệu bằng 0**, và failover **không mất ghi nào**. ⚠️ Cái giá: **ghi mất mili-giây một chữ số** thay vì micro-giây của ElastiCache (chậm hơn khoảng **10×**), và giá cao hơn ~40–60%. Với **600 wps** của bài này thì độ trễ ghi hoàn toàn không thành vấn đề — nên **nếu bạn muốn bỏ event log và dùng Redis làm nguồn sự thật, MemoryDB là câu trả lời**. Chọn ElastiCache khi bạn đã có event log; chọn MemoryDB khi bạn muốn ít bộ phận chuyển động hơn |
| Điểm số bền + hồ sơ người chơi | **DynamoDB** (PK = `SEASON#…#USER#…`), on-demand | `UpdateItem ... ADD score :delta` là atomic và không cần đọc trước — khớp hoàn hảo với ngữ nghĩa cộng điểm. Phân bố đều vì PK chứa `user_id`. ⚠️ Nếu dùng GSI với PK = mùa giải thì **hot partition** ngay: phải write-shard (§14.2) |
| Truy vấn top-N thuần DynamoDB | **DynamoDB GSI** (`GSI-PK = SEASON#SHARD#n`, `GSI-SK = score`) | Query giảm dần + `Limit 10` trên mỗi shard rồi merge. ⚠️ GSI cập nhật **bất đồng bộ** (trễ vài chục–vài trăm ms) — chấp nhận được cho leaderboard, nhưng phải biết. ⚠️ GSI tiêu WCU **riêng** với bảng chính: mỗi lần điểm đổi là một lần ghi GSI nữa |
| Cache top-N | **CloudFront**, `max-age=1, stale-while-revalidate=5, stale-if-error=300` | Giảm 170.000 rps xuống ~400 rps về origin (§11). `stale-if-error` là mảnh ghép sống còn: khi origin/Redis chết, CloudFront vẫn trả bản cũ 5 phút thay vì lỗi. ⚠️ Response cá nhân hoá ("hạng của tôi") phải là `private` — cấu hình sai là rò rỉ dữ liệu người dùng |
| Ghi điểm (đường nóng) | **API Gateway (private/internal) → Lambda**, hoặc **ALB → ECS Fargate** | 600 wps là quá nhỏ để cần server thường trực → Lambda rất hợp. ⚠️ **Lambda trong VPC để gọi ElastiCache**: Hyperplane ENI đã làm cold start VPC gần như biến mất, nhưng vẫn phải quản lý **connection pool** — mỗi execution environment giữ một kết nối Redis, 1.000 concurrent Lambda = 1.000 kết nối. Redis chịu được, nhưng đặt `maxclients` cho đúng |
| Đọc leaderboard | **API Gateway → Lambda** (hoặc ECS) | Nhờ cache, Lambda chỉ chạy ~400 lần/giây. ⚠️ Nếu bỏ cache, 170.000 concurrent Lambda vượt xa quota mặc định 1.000 — đây là ví dụ rõ nhất về việc cache không chỉ tiết kiệm tiền mà còn tránh chạm trần dịch vụ |
| Luồng sự kiện điểm (nguồn sự thật) | **Kinesis Data Streams** (on-demand), hoặc **MSK** nếu đã có Kafka | 600 rec/s × 200 B = 120 KB/s → **1 shard** là đủ (1 MB/s hoặc 1.000 rec/s mỗi shard); dùng 2 shard cho peak. Nhiều consumer độc lập: leaderboard, quest, chống gian lận, analytics. Giữ lại 7 ngày (tối đa 365) để phát lại |
| Ghi điểm bất đồng bộ vào Redis | **Lambda consumer của Kinesis**, batch 500 record | Batch giúp gộp thành pipeline Redis → thông lượng gấp 10. ⚠️ Cấu hình `bisectBatchOnFunctionError` + DLQ, nếu không một record hỏng sẽ chặn cả shard vĩnh viễn (**poison pill**) |
| Kho lạnh + lịch sử | **Kinesis Firehose → S3** (Parquet + Snappy, phân vùng `season=`) → **Athena** | 10 GB/ngày thô → ~2 GB Parquet. Athena tính tiền theo **byte quét** nên phân vùng và cột hoá là thứ quyết định hoá đơn. Tra hạng lịch sử = một query có predicate pushdown, ~2 giây, vài cent |
| Snapshot để khôi phục nhanh | **Lambda/ECS job mỗi 10 phút → S3**; hoặc **MemoryDB snapshot** | Rút RTO từ 33 phút xuống 1 phút (§12.3). MemoryDB có snapshot tích hợp — thêm một lý do để chọn nó |
| Chống gian lận (offline) | **Athena / EMR** trên S3, **SageMaker** cho mô hình phát hiện bất thường, **DynamoDB** cho danh sách chặn | Phát hiện win-trading cần phân tích đồ thị trên toàn bộ lịch sử — việc của batch, không phải đường nóng. Danh sách chặn phải đọc được với độ trễ thấp → DynamoDB + DAX |
| Bảng theo quốc gia | Cùng cụm Redis, key riêng theo quốc gia | ⚠️ Trong Redis Cluster, nhiều key thuộc nhiều slot khác nhau thì **không dùng chung `MULTI` được**. Dùng **hash tag** `leaderboard:{2026-09}:country:VN` để ép cùng slot, hoặc bỏ atomicity và chấp nhận lệch tạm thời |
| Quan sát hệ thống | **CloudWatch** metric của ElastiCache: `EngineCPUUtilization` (**không phải** `CPUUtilization`), `DatabaseMemoryUsagePercentage`, `Evictions`, `ReplicationLag`, `CurrConnections` | ⚠️ `CPUUtilization` là trung bình mọi core, nhưng Redis chỉ chạy lệnh trên **một** core — nó sẽ hiện 25% trong khi engine đã bão hoà 100%. **`EngineCPUUtilization` mới là chỉ số thật.** Cảnh báo `Evictions > 0` là cảnh báo P1: nó nghĩa là bạn đang **mất người chơi khỏi bảng** |
| Đa vùng (nếu game toàn cầu) | **Global Datastore** cho ElastiCache, hoặc **DynamoDB Global Tables** | ⚠️ Global Datastore là nhân bản **một chiều** (một region ghi, các region kia chỉ đọc) — đủ cho leaderboard vì ghi ít và đọc nhiều, đọc cục bộ ở mỗi region là thắng lớn. Global Tables ghi nhiều region nhưng **last-writer-wins** sẽ làm hỏng phép cộng dồn điểm |

**Ba câu chốt đáng nhớ:**

1. *"Redis của tôi là **chỉ mục**, không phải **nguồn sự thật**. Điểm số thật nằm ở Kinesis và S3. Nghĩa là Redis có thể mất sạch dữ liệu mà hệ thống vẫn đúng — tôi chỉ mất một phút để dựng lại từ snapshot. Nếu tôi muốn bỏ cả event log đi, tôi sẽ đổi ElastiCache lấy **MemoryDB**: cùng API, nhưng ghi được bền hoá đa AZ trước khi ACK. Tôi trả giá bằng độ trễ ghi mili-giây thay vì micro-giây — và ở **600 ghi/giây** thì tôi chẳng cảm thấy gì."*
2. *"Trục chi phối của bài này là **đọc**, không phải ghi — 6:1 lúc thường, 30:1 lúc đỉnh. Và vì top 10 giống hệt nhau với tất cả mọi người, một dòng `Cache-Control: max-age=1` ở CloudFront biến 170.000 rps thành 20 lệnh Redis mỗi giây. Tôi làm việc đó **trước** khi nghĩ đến sharding."*
3. *"Trên ElastiCache, chỉ số CPU phải nhìn là **`EngineCPUUtilization`**, không phải `CPUUtilization`. Redis xử lý lệnh trên một luồng, nên dashboard mặc định sẽ hiện 25% trong khi engine đã kín 100% — và bạn sẽ không hiểu vì sao p99 nổ."*

---

## Cách trình bày khi phỏng vấn / review

1. **Tách ngay hai câu hỏi ra, trong 60 giây đầu.** *"Bài này có hai truy vấn với độ khó cách nhau rất xa. **Top 10 là truy vấn có giới hạn** — dù bảng 5 triệu hay 500 triệu người, tôi vẫn chỉ đọc 10 bản ghi, và một index B-tree bình thường giải xong. **Hạng của một người là một phép đếm trên toàn tập** — 'bao nhiêu người điểm cao hơn tôi' — và đó mới là cả bài toán."* Một câu này đặt đúng khung cho toàn bộ phần còn lại, và cho thấy bạn phân loại được độ khó thay vì xử lý mọi yêu cầu như nhau.

2. **Ra số, rồi chỉ ra rằng trục chi phối là ĐỌC.** *"600 ghi/giây, 3.000 lúc đỉnh. Một node Redis làm 100.000 ops/s — tôi đang dùng 3%. Nhưng đọc là 3.500 rps, đỉnh 17.000, và có thể vọt 170.000 trong 30 giây cuối mùa giải. Tỉ lệ đọc/ghi là 6:1, lúc đỉnh là 30:1."* Rất nhiều ứng viên nghe "real-time gaming" rồi mặc định đây là hệ write-heavy và tối ưu nhầm trục cả buổi.

3. **Giết phương án SQL bằng B-tree, không phải bằng "nó chậm".** *"Index trên `score` biến full table scan thành index scan — nhanh hơn khoảng 10 lần vì mục index nhỏ hơn dòng dữ liệu. Nhưng vẫn là **O(n)**: để trả lời `COUNT(*) WHERE score > 842`, engine phải **đi qua từng mục** ở tầng lá, vì B-tree **không lưu số lượng phần tử con ở nút trung gian**. Người ở hạng 4,3 triệu tốn 4,3 triệu bước."* Rồi chốt: *"Cấu trúc làm được việc này là **order-statistic tree**, và gần như không RDBMS nào cài đặt nó."*

4. **Giải thích `span` — đây là khoảnh khắc ghi điểm cao nhất của bài.** *"Skip list của Redis lưu thêm một trường `span` trên mỗi con trỏ tiến: số phần tử ở tầng đáy mà bước nhảy này đi qua. Nên khi tìm một phần tử, chỉ cần **cộng dồn span của các bước đã đi** là ra ngay vị trí tuyệt đối. Đó chính là `ZRANK`, và nó O(log n). **Skip list của Redis chính là một order-statistic tree** — đó là toàn bộ lý do nó giải được bài mà MySQL không giải được."* Nói được câu này là bạn đã vượt qua tầng "thuộc tên lệnh".

5. **Ra con số bộ nhớ thật, đừng nói "vừa đủ".** *"26 byte mỗi người là con số của sách và nó **sai thấp 5 lần**. Thực tế mỗi phần tử tốn ~124 byte: sds cho member 32 B, node skip list 48 B, dictEntry 32 B, bucket 12 B. 25 triệu người là **3,1 GB** — vẫn vừa một node `r7g.xlarge`. Kết luận: **tôi không shard**, và tôi sẽ dành thời gian còn lại cho cache và khôi phục vì đó mới là rủi ro thật."* Việc **từ chối sharding có lý do** mạnh hơn việc vẽ một cụm 16 node.

6. **Nói về cache TRƯỚC khi nói về sharding.** *"Top 10 giống hệt nhau với tất cả mọi người. `Cache-Control: max-age=1` ở CloudFront cộng một biến trong bộ nhớ app server biến **170.000 rps thành 20 lệnh Redis mỗi giây** — giảm 8.500 lần. Và người chơi không phân biệt được dữ liệu trễ 1 giây, vì đọc xong 10 dòng còn lâu hơn thế."* Thứ tự trình bày này thể hiện bạn tối ưu cái đang vỡ chứ không phải cái nghe kêu.

7. **Chủ động nêu ra sự thật sản phẩm về độ chính xác.** *"**Không ai quan tâm mình là hạng 4.301.887 hay 4.301.902.** Nhưng ai cũng quan tâm mình là hạng 7 hay hạng 8. Độ chính xác cần thiết **tỉ lệ nghịch với hạng** — nên thiết kế của tôi cũng vậy: một zset chính xác tuyệt đối cho 1 triệu người top (chỉ 124 MB), cộng một histogram 1.000 bucket cho phần đuôi. Sai số ở đuôi khoảng 1%, và nó tự nhỏ đi ở chỗ người ta quan tâm."* Đây là cách bạn chứng minh mình **nới lỏng yêu cầu một cách có kiểm soát** thay vì chỉ nhận yêu cầu rồi cố làm.

8. **Khi được hỏi về sharding, so sánh hai cách bằng `ZCARD`.** *"Range partitioning thắng vì hai lý do đúng với đúng hai truy vấn của bài: top 10 chỉ cần hỏi **một** shard cao nhất, và hạng toàn cục tính được **chính xác** bằng cách cộng `ZCARD` của các shard điểm cao hơn — mà `ZCARD` là **O(1)** vì Redis giữ sẵn biến đếm. Hash sharding cũng tính được hạng chính xác bằng `ZCOUNT` trên mọi shard, nhưng đó là O(S) lệnh **O(log n)** và mỗi truy vấn chạm **mọi** node — tail latency nổ theo số shard."* Rồi **tự nêu cái giá của range**: phân phối điểm lệch nặng nên phải chia dải không đều và tính lại biên hằng ngày, và người chơi **di chuyển giữa các shard** — một thao tác không atomic mà bạn phải xử lý bằng "ghi mới trước, xoá cũ sau" cộng job dọn rác.

9. **Trình bày tie-breaking bằng bố cục bit, không bằng lời.** *"Score của Redis là IEEE 754 double, biểu diễn chính xác số nguyên tới 2^53. Tôi chia: 31 bit cho điểm, 22 bit cho timestamp **đảo ngược** — `combined = score × 2^22 + (T_MAX − Δt)`. Đảo vì người đạt sớm phải xếp trên. 22 bit cho 48,5 ngày, thừa cho một mùa giải một tháng."* Rồi nói **cái giá** ngay: *"Đổi lại tôi **mất `ZINCRBY`** — cộng điểm giờ là read-modify-write, phải gói trong script Lua để giữ atomic, và thông lượng ghi giảm khoảng 35%. Ở 3.000 wps thì không sao, ở 300.000 wps thì nó đẩy nhu cầu sharding sớm hơn."*

10. **Trả lời câu 'Redis là single point of failure' bằng cách định nghĩa lại vai trò của nó.** *"Redis của tôi là **chỉ mục**, không phải nguồn sự thật. Mọi thay đổi điểm đi qua Kinesis xuống S3 trước. Redis mất sạch thì hệ thống vẫn **đúng** — chỉ mất khả năng hiển thị. Và tôi tính luôn thời gian dựng lại: phát lại toàn bộ 1 tỉ sự kiện mất **33 phút**, nên tôi thêm snapshot mỗi 10 phút → nạp 25 triệu `ZADD` qua pipeline mất **50 giây**, cộng delta dưới 1 giây. **RTO của tôi là 1 phút.**"* Việc **tính ra thời gian khôi phục** thay vì chỉ nói "có backup" là dấu hiệu rõ nhất của người đã trực sự cố thật.

11. **Nêu MemoryDB như một lựa chọn có chủ đích, không phải một cái tên.** *"Nếu tôi không muốn duy trì event log chỉ để chống mất dữ liệu, tôi đổi ElastiCache lấy **MemoryDB**: cùng API Redis, nhưng ghi được bền hoá vào nhật ký giao dịch đa AZ **trước khi ACK** — RPO bằng 0, failover không mất ghi nào. Cái giá là ghi mất mili-giây thay vì micro-giây, chậm hơn khoảng 10 lần. Ở **600 ghi/giây** tôi không cảm thấy gì cả — nên với bài này MemoryDB thật sự là lựa chọn hợp lý, dù ít người nghĩ tới nó."* Biết **khi nào cái chậm hơn lại là lựa chọn đúng** là thứ phân biệt kinh nghiệm thật với kiến thức đọc được.

12. **Đưa chống gian lận vào như ràng buộc kiến trúc, không phải một lời hứa.** *"Client **không bao giờ** gửi điểm — nó gửi kết quả trận, và game server quyết định điểm. Rồi ba lớp: `match_id` làm khoá idempotency (`SET NX`) chặn replay; rate limit theo **ngữ nghĩa game** chứ không theo HTTP — 'một trận cờ không thể ngắn hơn 30 giây' bắt được thứ mà '100 request/phút' không bao giờ bắt được; và phát hiện bất thường offline trên event log cho win-trading."* Thêm một câu rất thực tế: *"Xử lý bằng **shadow ban** — người gian lận vẫn thấy điểm mình tăng nhưng bị `ZREM` khỏi bảng công khai, nên họ không biết mình bị bắt và không đi tìm cách né mới."*

13. **Đóng lại bằng kiến trúc league — nhưng như một lựa chọn, không phải một cách né.** *"Nếu tôi được quyết định sản phẩm, tôi sẽ hỏi lại liệu bảng 25 triệu người có phải thứ ta thật sự muốn không. Chia thành 500.000 phòng, mỗi phòng 50 người cùng trình độ: Redis chuyển sang encoding **listpack** nên bộ nhớ rơi từ 3,1 GB xuống 750 MB, sharding trở thành chuyện tầm thường vì mỗi phòng là một key độc lập, và quan trọng hơn cả — **'hạng 12/50' là mục tiêu người chơi vươn tới được, còn 'hạng 4,3 triệu' chỉ làm người ta bỏ cuộc**. Đôi khi câu trả lời tốt nhất cho một bài toán scale là thay đổi bài toán."*
