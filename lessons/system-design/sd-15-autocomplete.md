# Case study: Search Autocomplete

> Autocomplete (còn gọi **typeahead**, **search-as-you-type**) trông như một tính năng phụ, nhưng nó vi phạm trực giác thông thường về tải: **user không gửi một request mỗi lần tìm kiếm — họ gửi một request mỗi lần gõ một phím**. Một hệ thống search 1.200 QPS bỗng thành hệ thống autocomplete 24.000 QPS, và mỗi request phải trả lời dưới 100 ms, nếu không dropdown hiện ra *sau khi* user đã gõ xong — tức vô dụng.

Bài này khó ở đúng ba chỗ:

1. **Đường đọc cực nóng, ngân sách latency cực chặt** — mỗi phím gõ là một request, không có chỗ cho một lần quét bảng hay một lần sort lớn tại thời điểm truy vấn.
2. **Truy vấn là prefix, không phải khoá chính** — "mọi thứ bắt đầu bằng `tw`, lấy 5 cái phổ biến nhất" là truy vấn *range* + *top-k*, thứ hash table không làm được và B-tree làm được nhưng quá chậm ở quy mô này.
3. **Dữ liệu nguồn khổng lồ nhưng kết quả đổi rất chậm** — "top 5 cho `tw`" gần như không đổi giữa hôm nay và tuần trước. Chính sự bất đối xứng đó mở ra lối thoát: **tính trước offline, phục vụ online chỉ bằng tra cứu**.

---

## Bước 1: Làm rõ yêu cầu

**Functional**
- Trả về **tối đa 5 gợi ý** (top-5), xếp theo **độ phổ biến (popularity)** = tần suất trong lịch sử tìm kiếm.
- **Chỉ khớp tiền tố (prefix matching)**: gõ `tw` ra `twitter`, `twitch`, `twitter login`, nhưng **không** ra `bitwise` hay `hootsuite twitter`. Đây là ràng buộc quan trọng nhất — nó cho phép dùng trie. Nếu yêu cầu là infix, toàn bộ thiết kế phải đổi.
- v1 chỉ hỗ trợ **chữ thường a–z**, không sửa lỗi chính tả, không cá nhân hoá.

**Non-functional**
- **Latency < 100 ms end-to-end** — trên ~100 ms người dùng bắt đầu cảm nhận độ trễ. Trừ RTT mạng (20–40 ms), TLS, render ở browser, **phần dành cho backend chỉ còn ~20–30 ms**.
- **High availability**, nhưng đây là tính năng *degradable* — sẽ khai thác ở phần failure mode.
- **Scalable** cho 10 triệu DAU, với QPS thật cao hơn trực giác rất nhiều.

| Giả định | Giá trị | Vì sao |
|---|---|---|
| DAU × search/ngày | 10 triệu × 10 | Mốc để tính QPS |
| Ký tự gõ mỗi lần search | ~20 | Query trung bình 4 từ × 5 ký tự |
| Gợi ý trả về; prefix tối đa | 5; 50 ký tự | Chốt cứng để giới hạn payload và độ sâu trie |
| Độ trễ dữ liệu chấp nhận | hàng tuần (v1), hàng ngày (v2) | Top-k đổi chậm |

> 💡 **Nguyên tắc**: Hai câu hỏi làm rõ có giá trị nhất là *"Prefix-only hay infix?"* và *"Dữ liệu được phép cũ bao lâu?"*. Câu đầu quyết định cấu trúc dữ liệu (trie hay n-gram), câu sau quyết định pipeline là batch hay streaming.

---

## Bước 2: Back-of-envelope estimation

Đây là chỗ bài autocomplete **khác hẳn** mọi case study khác, và cũng là chỗ ứng viên hay trượt: họ tính QPS theo *số lần tìm kiếm*, trong khi tải thật đến từ *số lần gõ phím*.

```
Số lần search/ngày = 10,000,000 DAU × 10 = 100,000,000

Nếu là hệ thống SEARCH bình thường:
  Search QPS = 100,000,000 / 86,400 ≈ 1,160 QPS   (~1.2K)

NHƯNG autocomplete gửi request theo TỪNG PHÍM GÕ:
  Mỗi search ≈ 20 ký tự → 20 request
  Autocomplete QPS = 100,000,000 × 20 / 86,400 ≈ 23,150 QPS   (~24K)
  Peak (×2 giờ cao điểm) ≈ 48,000 QPS
```

> **Search QPS ~1.2K, nhưng autocomplete QPS ~24K và đỉnh ~48K — gấp 20–40 lần.**

Autocomplete là **bộ khuếch đại tải (traffic amplifier)** với hệ số bằng đúng độ dài query trung bình. Hệ quả kiến trúc:

- Autocomplete cần **đường đi riêng, kho dữ liệu riêng, scaling riêng** — không dùng chung tầng compute/DB với search. 48K QPS, mỗi node ~2.000 QPS ⇒ ~25 node chỉ cho tầng query.
- Mọi mili-giây tiết kiệm được nhân lên 48.000 lần mỗi giây → ta sẽ chấp nhận **đánh đổi bộ nhớ rất mạnh để lấy thời gian**.
- **Debounce phía client** không phải tiểu tiết UX mà là biện pháp giảm tải hạng nặng: debounce 200 ms cắt 50–70% request, tức cắt luôn một nửa fleet.

> ⚠️ **Bẫy**: Tính "10M × 10 = 1.2K QPS, dễ mà" rồi vẽ một con DB duy nhất. Người phỏng vấn hỏi lại *"mỗi lần gõ phím thì sao?"* và cả thiết kế sụp. **Luôn nhân với số ký tự.**

```
STORAGE — 20% trong 100M query/ngày là query MỚI:
  20,000,000 × ~20 B ≈ 400 MB/ngày = 0.4 GB/ngày → một năm ≈ 146 GB (đã aggregate)
  Raw log (chỉ query ĐÃ SUBMIT): 100M × 100 B = 10 GB/ngày; 90 ngày ≈ 900 GB trên S3
BANDWIDTH — response ~200 B × 48K QPS ≈ 9.6 MB/s egress → tí hon
```

> 💡 **Nguyên tắc**: Chỉ log **query đã submit**, đừng log từng phím gõ — log phím gõ tạo 2 tỉ dòng/ngày (~200 GB) mà giá trị gần bằng 0. Một câu quyết định giảm 20× chi phí pipeline.

Kết luận: **bài này không nghẽn ở băng thông hay storage — nó nghẽn ở QPS và latency.**

---

## Bước 3: API design

API tối giản đến mức gần tầm thường — và đó là *cố ý*, vì đơn giản là điều kiện để cache được ở mọi tầng.

```
GET /api/v1/suggestions?q=tw&limit=5&locale=en-US

  200 OK
  Cache-Control: public, max-age=60
  { "prefix": "tw",
    "suggestions": [
      { "text": "twitter",       "score": 9832100 },
      { "text": "twitch",        "score": 5120400 },
      { "text": "twitter login", "score": 2210900 },
      { "text": "twin peaks",    "score": 1004300 },
      { "text": "twilight",      "score":  890200 } ] }
```

| Quyết định | Vì sao |
|---|---|
| **GET, không POST** | GET mới cache được ở browser/CDN. Với 48K QPS, khả năng cache là sống còn; POST giết chết toàn bộ tầng cache. |
| **Chuẩn hoá `q` ở client** | Lowercase, trim, gộp khoảng trắng **trước khi** gửi — nếu không, `Tw`, `tw `, `TW` thành 3 cache key và hit rate rơi thảm hại. |
| **`limit` trần 1–10; trả `score`; `Cache-Control` 30–120 s** | Trần chặn DoS xin 1000 kết quả; `score` để client xếp lại nếu muốn trộn lịch sử cá nhân; cache 60 s không mất gì (dữ liệu vốn cũ vài ngày) mà cắt lượng request khổng lồ. |
| **Không auth trên đường nóng** | Gợi ý là dữ liệu công khai. Xác thực mỗi phím gõ là tự bắn vào chân về latency; chống lạm dụng bằng rate limit theo IP. |

> ⚠️ **Bẫy**: Thêm `user_id` vào API từ v1 "để sau này cá nhân hoá" là **phá vỡ khả năng cache ngay lập tức** — mỗi user một cache key, hit rate gần 0, nhân chi phí lên hàng chục lần để đổi lấy tính năng chưa tồn tại.

---

## Bước 4: Thiết kế ngây thơ — và vì sao nó chết

Trước khi vẽ kiến trúc thật, hãy làm điều mọi buổi phỏng vấn tốt đều bắt đầu: **đề xuất cách đơn giản nhất rồi tự chỉ ra nó hỏng ở đâu**.

```sql
CREATE TABLE frequency (query VARCHAR(100) PRIMARY KEY, frequency BIGINT);

-- Mỗi lần user gõ một phím:
SELECT query, frequency FROM frequency
WHERE query LIKE 'tw%' ORDER BY frequency DESC LIMIT 5;
```

Đúng ngữ nghĩa, 5 dòng code, và với 10.000 query nó chạy ngon. Vấn đề xuất hiện khi thay số thật vào.

**1. `LIKE 'tw%'` dùng được index, nhưng `ORDER BY frequency` thì không.** Index B-tree trên `query` cho phép seek đến `tw` rồi quét tiếp — tốt. Nhưng số dòng khớp `tw%` có thể là **hàng triệu**, và chúng nằm rải rác về mặt `frequency`. Để lấy top-5, DB phải đọc **toàn bộ** dòng khớp rồi mới trả về: chi phí tỉ lệ với **số dòng khớp**, không phải số dòng trả về. Và đây là nghịch lý chết người: **prefix càng ngắn thì càng nhiều dòng khớp, mà prefix ngắn lại chính là lúc được truy vấn nhiều nhất** (ai cũng gõ ký tự đầu; chỉ một phần gõ tới ký tự thứ mười). Hệ thống chậm nhất đúng lúc bị gọi nhiều nhất.

**2. Index composite cũng không cứu.** `(query, frequency)` sắp theo `query` trước, nên trong phạm vi `tw%` thứ tự `frequency` chỉ đúng cục bộ — vô dụng cho top-k toàn cục; đảo thành `(frequency, query)` thì `LIKE 'tw%'` mất khả năng seek. Mâu thuẫn cấu trúc, không phải thiếu index. **Và tải thì gấp 20 lần bạn tưởng**: 48.000 QPS × quét hàng trăm nghìn dòng — không DB quan hệ nào làm nổi ở p99 < 30 ms; read replica nhân băng thông đọc nhưng không làm *một* truy vấn nhanh hơn.

**3. Không tận dụng tính chất quan trọng nhất: dữ liệu gần như không đổi.** Ta đang **tính lại top-5 của `tw` từ đầu, 48.000 lần mỗi giây, để ra cùng một kết quả suốt cả tuần.** Câu trả lời đúng không phải "tối ưu truy vấn" mà là "**đừng truy vấn — hãy tính trước**".

Còn một phương án trung gian hay bị nhắc tới: **full-text search engine** (Elasticsearch/OpenSearch mặc định). Nó cũng không hợp ở v1 — inverted index được thiết kế cho khớp *từ*, không phải *tiền tố chuỗi*, và latency 20–100 ms ăn gần hết ngân sách. Đáp án đúng là **materialize sẵn `prefix → top5`**, và **trie** chính là cấu trúc để sinh ra bảng đó.

> 💡 **Nguyên tắc**: Khi truy vấn *đọc* quá nặng nhưng dữ liệu *thay đổi* chậm, lời giải hầu như luôn là **dịch chuyển công việc từ read-time sang write-time**. Bạn trả bằng bộ nhớ và độ tươi, mua về latency và throughput — cùng mô-típ với materialized view, fan-out-on-write của news feed, và CDN.

---

## Bước 5: High-level design

Hệ thống tách làm hai nửa gần như **độc lập hoàn toàn**, và nhìn ra sự tách đôi này là điểm mấu chốt: **Data Gathering Service** (đường ghi, offline, batch) và **Query Service** (đường đọc, online, siêu nóng, chỉ đọc). Hai nửa gặp nhau tại đúng một điểm — **snapshot của trie**. Không ghi đồng bộ, không khoá, không giao dịch bắc cầu.

```
ĐƯỜNG ĐỌC (online, 48K QPS, < 100 ms)
──────────────────────────────────────
 User gõ ─(debounce 150-250ms)─▶ [Browser cache] ─hit─▶ [CDN edge TTL 60s]
                                                            │ hit ▼
                                              [API Gateway + rate limit]
                                                            │ miss ▼
                                          ┌──────────────────────────────────────┐
                                          │ Query Service fleet (stateless, ~25) │
                                          └──────────────────┬───────────────────┘
                                          ┌──────────────────▼───────────────────┐
                                          │       Shard Map Manager (route)      │
                                          └──┬──────────────┬──────────────┬─────┘
                                    ┌────────▼───┐  ┌───────▼────┐  ┌──────▼─────┐
                                    │Trie Cache 1│  │Trie Cache 2│  │Trie Cache N│
                                    │  (a … f)   │  │  (g … r)   │  │  (s … z)   │
                                    └────────┬───┘  └───────┬────┘  └──────┬─────┘
                                             └──────────────┼──────────────┘
                                        chỉ khi khởi động/miss ▼
                                                      ┌──────────┐
                                                      │ Trie DB  │ (KV / doc store)
                                                      └────▲─────┘
ĐƯỜNG GHI (offline, batch)                                 │ snapshot + SWAP ATOMIC
──────────────────────────                                 │
 Search svc ─▶ Stream ─▶ Log store ─▶ Aggregator ─▶ Filter ─▶ Workers
 (log query   (Kafka/   (S3, append  (gộp tần suất (nhạy cảm  (dựng trie + gom
  ĐÃ SUBMIT)   Kinesis)  -only)       theo cửa sổ)  / spam)     top-k + snapshot)
```

- **Query Service stateless và chỉ-đọc** — không bao giờ ghi vào trie → scale ngang tuyến tính, chết một node không mất dữ liệu.
- **Trie nằm trong RAM, không nằm trong DB** — Trie DB chỉ lưu bền để khởi động lại và rollback; để đường nóng chạm disk/DB là thua ngân sách 30 ms.
- **Trie được xây offline rồi swap nguyên khối**, không cập nhật tại chỗ — lý do ở Deep dive 3.

---

## Deep dive 1: Trie — cấu trúc, độ phức tạp, tối ưu

**Trie** (prefix tree, từ chữ re*trie*val) là cây mà **đường đi từ gốc xuống một node chính là một tiền tố**. Mỗi cạnh mang một ký tự; node ở độ sâu *k* đại diện prefix dài *k*.

```
      (root)
     /  |  \      node "tw"  → top5 = [twitter, twitch, twitter login,
    t   c   b                          twin peaks, twilight]
   / \                 
  w   o             node "twi" → top5 = [twitter, twitch, twitter login,
 /|\                                    twilight, twilio]
i t e  →  "twitter" freq 9.8M,  "twitch" freq 5.1M
```

Vì sao trie hợp tự nhiên: **tra prefix = đi xuống đúng `p` bước** (không quét, không so chuỗi đầy đủ); các query **chia sẻ tiền tố** nên `twitter`, `twitter login`, `twitter status` dùng chung nhánh `t-w-i-t-t-e-r`; và cấu trúc cây khớp đúng ngữ nghĩa **"prefix-only"** đã chốt ở Bước 1 — nếu yêu cầu là infix thì trie mất giá trị ngay.

### Thuật toán ngây thơ và độ phức tạp

```
suggest(prefix):
  1. node = đi từ root theo từng ký tự               → O(p)
  2. DFS toàn bộ subtree dưới node, gom mọi query    → O(c)
  3. sort theo frequency, lấy 5 cái đầu              → O(c log c)
```

Tổng **O(p) + O(c) + O(c·log c)**, với `p` = độ dài prefix (≤ 50) và `c` = **số node trong subtree**. Vấn đề nằm trọn ở `c`: với prefix `t`, subtree chứa gần như mọi query bắt đầu bằng `t` — hàng triệu node. Lại đúng nghịch lý cũ: prefix càng ngắn thì `c` càng lớn, mà prefix ngắn được truy vấn nhiều nhất.

> ⚠️ **Bẫy**: Nhiều ứng viên dừng ở đây, hài lòng vì "đã dùng trie". Người phỏng vấn sẽ hỏi: *"Với prefix `a`, subtree có bao nhiêu node? Bạn sort bao nhiêu phần tử, 48.000 lần mỗi giây?"*. Trie **trần** chỉ giải quyết phần tìm prefix, không giải quyết phần top-k.

### Tối ưu 1: cache top-k ngay tại mỗi node

Ý tưởng cốt lõi của toàn bài: **mỗi node lưu sẵn danh sách top-5 của subtree bên dưới nó** (xem sơ đồ trên). Khi đó `suggest(prefix)` = đi xuống `p` bước rồi trả `node.top5` → **O(p)**, `p` trung bình 2–8. Vài chục phép so sánh con trỏ, thời gian tính bằng micro-giây; ngân sách 30 ms bỗng dư dả đến mức nực cười.

| Trục | Trie trần | Trie có cache top-k |
|---|---|---|
| Thời gian truy vấn | O(p + c + c·log c) | **O(p)**, `p ≤ 50` |
| Bộ nhớ mỗi node; chi phí dựng | 1 mảng con trỏ + freq; duyệt 1 lần | + 5 tham chiếu ≈ **gấp 2–3 lần**; duyệt post-order gom top-k từ lá lên gốc |
| Cập nhật & độ tươi | Sửa 1 nhánh; cập nhật tại chỗ được | Phải cập nhật top-k của **mọi tổ tiên** → rất đắt, đẩy về batch offline |

Dòng cuối là cầu nối sang Deep dive 3: **chính vì cache top-k làm việc cập nhật trở nên đắt, nên ta chấp nhận dựng lại trie theo lô.** Chuỗi nhân quả này cần trình bày liền mạch, không phải hai quyết định rời rạc.

> 💡 **Nguyên tắc — đổi bộ nhớ lấy thời gian**: Nhân bộ nhớ lên 2–3 lần để giảm truy vấn từ O(c·log c) xuống O(p). Với `c` có thể là 10⁶ và `p` ≤ 50, đây là một trong những vụ đổi chác lời nhất trong System Design. RAM mua được; 48.000 lần sort một triệu phần tử mỗi giây thì không.

**Mẹo cài đặt**: đừng lưu **chuỗi** trong top-k của mỗi node — lưu **id/con trỏ**. Lưu chuỗi đầy đủ thì `twitter` bị lặp ở cả 7 prefix của nó, bộ nhớ phình theo bình phương độ dài; id 4 byte thì 5 mục tốn 20 B/node thay vì ~125 B.

### Tối ưu 2: giới hạn độ dài prefix

Chỉ xây và phục vụ trie tới độ sâu tối đa (ví dụ 50; thực tế 20–30 là quá đủ). Điều này cho **độ phức tạp một trần cứng** — O(p) thành O(50) = O(1) thực dụng, không request nào bắt hệ thống làm việc lâu hơn mức đã biết, và prefix 10.000 ký tự của kẻ tấn công chỉ bị cắt ở ký tự thứ 50. Nó cũng **giảm bộ nhớ** đáng kể: nhánh sâu là nhánh tần suất thấp nhất (query rất dài thì hiếm), đóng góp nhiều node nhất với giá trị gợi ý thấp nhất.

Khi dựng offline còn một phép cắt tỉa nữa rất mạnh: **cắt theo tần suất tối thiểu** — bỏ query xuất hiện < N lần (ví dụ 20) trong cửa sổ. Query 3 lượt/tuần **không bao giờ** lọt top-5 của prefix có nghĩa nhưng vẫn chiếm node; phép cắt này loại **70–90% số query riêng biệt** (đuôi dài) mà gần như không đổi kết quả.

---

## Deep dive 2: Bộ nhớ trie và sharding

```
Cài đặt ngây thơ — mảng 26 con trỏ mỗi node:
  26 con trỏ × 8 B = 208 B | frequency 8 B | top-k 5×id 4 B = 20 B | flag+padding ~8 B
  ≈ 244 B/node  (làm tròn ~250 B)

Số node: query chia sẻ tiền tố, hệ số chia sẻ thực nghiệm ~0.4
  50 triệu query riêng biệt × 20 ký tự × 0.4 ≈ 400 triệu node
Bộ nhớ ≈ 400,000,000 × 250 B = 100 GB
```

**100 GB.** Con số này dẫn tới quyết định tiếp theo: không máy nào tiện lợi để giữ trọn trie trong RAM và phục vụ 48K QPS *có dự phòng*. Nhưng trước khi shard, hãy hỏi: giảm được không?

| Kỹ thuật | Ý tưởng | Tiết kiệm |
|---|---|---|
| **Hash map / mảng thưa thay mảng 26** | Đa số node chỉ có 1–3 con nhưng vẫn tốn 208 B cho 26 slot rỗng | Node còn ~40–60 B → **giảm 4–5×** |
| **Radix tree (PATRICIA)** | Gộp chuỗi node chỉ-một-con thành cạnh nhiều ký tự (`t→w→i→t` → `twit`) | Giảm **50–70% số node** |
| **Cắt tần suất tối thiểu** | Bỏ query < 20 lượt/tuần | Giảm **70–90%** query riêng biệt |
| **Giới hạn độ sâu 30; lưu id thay chuỗi trong top-k** | Cắt nhánh sâu hiếm; 20 B thay vì ~125 B cho top-k | Giảm thêm 10–20%, và ~100 B/node |

Áp dụng cả gói, 100 GB xuống còn **10–20 GB** — vẫn nên shard để có dự phòng và phân tải, nhưng đã ở mức một cụm cache vừa phải xử lý được.

> 💡 **Nguyên tắc**: Trong phỏng vấn, đưa con số ngây thơ trước (*"mảng 26 con trỏ → 250 B/node → 100 GB"*) rồi **tự** tối ưu xuống. Trình tự "ước lượng thô → chỉ ra vấn đề → tối ưu có định lượng" thuyết phục hơn nhiều so với nhảy thẳng vào đáp án.

### Vì sao phải shard, và shard thế nào

Ba lý do độc lập, mỗi cái tự nó đã đủ: **bộ nhớ** (10–100 GB vượt mức thoải mái của một node, lại cần nhiều bản sao), **throughput** (48K QPS đỉnh), **blast radius** (một node chết không được sập cả hệ thống).

**Cách hiển nhiên là shard theo ký tự đầu** — a–f → shard 1, g–r → shard 2, s–z → shard 3, định tuyến cực đơn giản. **Và đây chính là chỗ nó hỏng**, vì phân bố ký tự đầu của query **cực kỳ lệch (skewed)**:

```
 a ████████████████████ amazon, apple…   g ██████████████████ google, gmail…
 f ████████████████ facebook, fb…        s ██████████████████ spotify, shopee…
 x ▌ xbox… và gần như hết                z ▌ zoom, zara… và hết
```

Chia a–f / g–r / s–z thì shard chứa `a` và shard chứa `s` nóng gấp hàng chục lần shard chứa `x`, `z`. Kết quả: một shard rớt request trong khi shard khác nhàn rỗi — **tệ hơn cả không shard**, vì bạn trả tiền cho cả cụm mà chỉ dùng được một phần.

**Lời giải: Shard Map Manager** — giữ bản đồ phân bố **thực tế đo được**, định tuyến theo dữ liệu chứ không theo giả định về bảng chữ cái.

```
1. Đo TRỌNG SỐ TRUY VẤN (query volume) của mỗi prefix từ bảng tần suất đã aggregate
   — KHÔNG đếm số query riêng biệt.
2. Chia thành N nhóm có tổng trọng số xấp xỉ bằng nhau:
      1: a | 2: b,c,d,e | 3: f,g | 4: h..r | 5: s | 6: t,u,v,w,x,y,z
3. Prefix quá nóng thì chia sâu thêm một cấp:  'a' → aa-ag | ah-an | ao-az
4. Phát bản đồ cho mọi Query Service node; tính lại mỗi lần rebuild trie.
```

- **Đo bằng trọng số truy vấn, không phải số query riêng biệt.** Shard có 10 triệu query hiếm thì nhẹ QPS nhưng nặng RAM; shard có 1.000 query siêu nóng thì ngược lại. Nếu phải chọn, **cân bằng QPS trước** — RAM mua được, quá tải thì rớt request ngay. Bản đồ được tính lại mỗi chu kỳ build, nên không cần cơ chế rebalancing động.
- **Consistent hashing** rất hạn chế ở đây: băm khoá **phá mất tính liên tục của prefix**, mà ta cần các prefix cùng nhánh nằm cùng chỗ để đi xuống cây. Nó chỉ hữu ích khi chuyển sang mô hình "bảng phẳng `prefix → top5`".

Hai phương án thay thế đáng cân nhắc: **nhân bản toàn bộ trie lên mọi node** (bỏ hẳn định tuyến, mọi node trả lời mọi prefix — chỉ khả thi khi trie nén xuống vài GB), hoặc **phẳng hoá `prefix → top5` rồi băm** (dùng KV store phân tán sẵn có, scale tự động, mất cấu trúc cây nhưng vận hành đơn giản hơn hẳn).

> 💡 **Nguyên tắc thực chiến**: Nếu sau khi cắt tỉa và nén, trie xuống dưới ~10 GB, hãy **nhân bản thay vì shard** — không shard map, không lệch tải, một node chết chẳng mất prefix nào. Sharding một dataset vài GB là tự chuốc độ phức tạp.

---

## Deep dive 3: Data Gathering — vì sao KHÔNG cập nhật realtime

Trực giác đầu tiên: mỗi lần user search thì tăng `frequency` và cập nhật trie ngay. Sai ở ba mức độ khác nhau.

**1. Khối lượng ghi.** 100 triệu query/ngày ≈ 1.200 wps trung bình, 2.400 đỉnh — nghe không đáng sợ, cho đến khi nhớ mỗi lần ghi không phải một phép tăng đơn giản.

**2. Cập nhật top-k lan ngược lên mọi tổ tiên.** Đây là đòn chí mạng. Khi `twitter` tăng tần suất, top-5 của **mọi prefix của nó** — `t`, `tw`, `twi`, `twit`, `twitt`, `twitte`, `twitter` — có thể phải đổi. Mỗi lần ghi chạm `p ≈ 20` node, vậy 2.400 × 20 = **48.000 lần cập nhật node mỗi giây, trên một cấu trúc đang được đọc bởi 48.000 QPS khác**. Cần khoá hoặc cấu trúc lock-free, và đường đọc mất ngay tính chất quý nhất: nó không còn chỉ-đọc thuần tuý.

**3. Mỉa mai nhất: kết quả gần như không đổi.** `twitter` đang có 9.832.100 lượt; thêm một lượt thành 9.832.101 — top-5 của `tw` **không đổi**. Ta vừa trả một cái giá vận hành khổng lồ để đổi lấy đúng số 0 về giá trị.

> 💡 **Nguyên tắc**: Hỏi "**kết quả thay đổi nhanh thế nào?**" chứ không phải "**dữ liệu đến nhanh thế nào?**". Dữ liệu đến liên tục, nhưng *kết luận rút ra từ dữ liệu* (top-5) ổn định hàng ngày, hàng tuần. Tần suất cập nhật phải bám theo tốc độ đổi của **kết luận**, không phải của **input** — áp dụng được cho trending, leaderboard, recommendation.

### Pipeline batch

```
Search svc ── user BẤM ENTER (KHÔNG log từng phím gõ!) → {query, ts, locale, device, user_hash}
  ▼ Stream (Kafka/Kinesis)      buffer, phân vùng, chịu đỉnh tải
  ▼ Log store (S3)              APPEND-ONLY, KHÔNG index; /logs/dt=2026-09-14/hh=07/ ~10 GB/ngày
  ▼ Aggregator (Spark/EMR/Glue) cửa sổ tuần/ngày/giờ; GROUP BY query → SUM(count);
                                lọc bot, chuẩn hoá, cắt count < N → (query, frequency)
  ▼ Filter layer                chặn từ khoá nhạy cảm / spam
  ▼ Workers                     dựng trie, duyệt post-order gom top-k → serialize snapshot
  ▼ Trie DB                     lưu snapshot CÓ PHIÊN BẢN: trie_v42
  ▼ Trie Cache                  nạp snapshot mới → SWAP ATOMIC → phục vụ
```

**Vì sao log store append-only, không index**: nó chỉ được đọc **tuần tự theo lô**, không bao giờ truy vấn theo điểm — index chỉ làm chậm ghi và tốn chỗ. **Vì sao có Stream ở giữa** thay vì ghi thẳng S3: hấp thụ đỉnh tải, tách vòng đời deploy của search service khỏi pipeline analytics, và cho **cùng luồng dữ liệu** chảy song song sang nhánh trending mà không sửa producer.

| Cửa sổ aggregate | Độ tươi | Chi phí | Phù hợp |
|---|---|---|---|
| Hàng tuần | Cũ tới 7 ngày | Thấp nhất | Search tổng quát, e-commerce ổn định (mặc định của Alex Xu) |
| Hàng ngày | Cũ tới 24 giờ | Vừa | Thực dụng nhất cho đa số sản phẩm |
| Hàng giờ → realtime | 1 giờ → giây–phút | Cao → rất cao | Tin tức, thể thao; Twitter/X nơi "trending" **chính là** sản phẩm |

Cách dung hoà thực tế: **hai tầng** — trie nền dựng theo lô lo phần lớn lưu lượng, cộng overlay nhỏ vài nghìn query trending cập nhật gần realtime từ stream, trộn lúc trả kết quả.

### Swap atomic

```
1. Worker dựng xong trie_v42, serialize, ghi vào Trie DB.
2. Trie Cache node nạp v42 vào MỘT VÙNG NHỚ MỚI (giữ ĐỒNG THỜI v41 phục vụ + v42 nạp).
3. Kiểm tra chất lượng: số node hợp lý? top-5 của 1.000 prefix mẫu trùng ≥ 80% bản trước?
4. Đổi MỘT con trỏ:  active_trie = trie_v42     ← nguyên tử
5. Giải phóng v41 sau khi mọi request đang bay đã xong.
```

- **Không có trạng thái lai** (request luôn thấy một trie nhất quán) và **không khoá trên đường đọc** (đọc con trỏ là thao tác rẻ nhất có thể).
- **Rollback tức thì**: build mới có vấn đề thì trỏ về `v41` — lý do phải **giữ phiên bản**, đừng ghi đè. Triển khai cuốn chiếu từng phần fleet: một phần user thấy v41, một phần thấy v42 — **chấp nhận được**, vì không ai thiệt hại khi thấy gợi ý của tuần trước.
- **Cái giá**: node cần RAM giữ **hai trie cùng lúc** lúc nạp; phải tính vào sizing, hoặc swap theo từng shard để trải chi phí.

> ⚠️ **Bẫy**: Build trie từ dữ liệu lỗi (job chạy trên partition thiếu, log rỗng do sự cố) rồi swap thẳng vào production — autocomplete trống trơn hoặc đầy rác trên toàn hệ thống trong vài giây. **Luôn có cổng kiểm tra trước khi swap.**

---

## Deep dive 4: Lưu trie ở đâu — Trie Cache và Trie DB

Phân biệt rành mạch hai thứ hay bị gộp: **Trie Cache** là bản in-memory phân tán phục vụ mọi request đọc (quyết định latency); **Trie DB** là kho bền vững giữ snapshot để khởi động lại, thêm node, rollback — **không nằm trên đường nóng**.

**Cách A — Document store** (MongoDB / object S3): serialize toàn bộ trie thành blob có phiên bản. ✅ Một lần ghi, một lần đọc, một đơn vị phiên bản; nạp cực nhanh khi khởi động (đọc tuần tự một file lớn nhanh hơn hàng triệu lần đọc điểm); rollback = trỏ về object cũ. ⚠️ Không đọc được một phần; blob nhiều GB cần chia theo shard.

**Cách B — KV store phẳng** (`prefix → top-k`): bỏ cấu trúc cây, mỗi prefix là một khoá.

```
key "t"   → ["twitter","tiktok","target","temu","tesla"]
key "tw"  → ["twitter","twitch","twitter login","twin peaks","twilight"]
key "twi" → ["twitter","twitch","twitter login","twilight","twilio"]
```

✅ Tra cứu **O(1)** thật sự — một hash lookup, không cần đi xuống cây. Dùng được KV store phân tán sẵn có (DynamoDB, Redis, Cassandra) → **sharding, replication, scaling là việc của hệ thống khác**: lợi ích vận hành cực lớn. ⚠️ **Số khoá bùng nổ** (mọi prefix của mọi query là một khoá; với trần độ dài 30 và cắt tần suất thì thực tế ở mức hàng chục tới hàng trăm triệu khoá — vẫn trong tầm DynamoDB/Redis), và mất chia sẻ tiền tố nên tốn chỗ hơn trie.

Tóm lại: document store nhỏ hơn (chia sẻ tiền tố), rollback dễ (đổi phiên bản blob), nhưng **bạn tự lo sharding**; KV phẳng tốn chỗ hơn và cần tiền tố phiên bản trong khoá (`v42#tw`) để rollback, đổi lại **độ phức tạp vận hành thấp hơn đáng kể**.

> 💡 **Nguyên tắc thực chiến**: Ở phần lớn sản phẩm thật, **KV phẳng là lựa chọn tốt hơn** dù "kém thanh lịch" hơn về thuật toán — bạn đẩy toàn bộ bài toán sharding/replication/failover sang một hệ thống đã được vận hành kỹ. Trie khi đó đóng vai trò **công cụ để tính ra bảng đó ở tầng offline**, nơi độ phức tạp không gây hại.

**Trie Cache**: dù lưu bền kiểu nào, tầng phục vụ vẫn in-memory — Redis giữ `prefix → top5` (thêm ~0.5–1 ms cho một network hop, đổi lại Query Service nhẹ và scale độc lập với dữ liệu), hoặc trie nạp thẳng vào heap Query Service (nhanh nhất nhưng mỗi node cần đủ RAM, khởi động chậm). Với ngân sách 30 ms, thêm 1 ms là chấp nhận được — Redis thường là lựa chọn đúng.

---

## Deep dive 5: Phía client — nơi giảm tải rẻ nhất

Phần này hay bị coi nhẹ, nhưng như estimation đã chỉ ra, **client là nơi cắt được nhiều QPS nhất với chi phí thấp nhất**.

```javascript
let timer = null, lastRequest = null;

input.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();   // chuẩn hoá TRƯỚC khi gửi
  clearTimeout(timer);
  if (lastRequest) lastRequest.abort();            // huỷ request đã lỗi thời
  if (q.length < 2) { render([]); return; }        // prefix quá ngắn: không gọi
  timer = setTimeout(() => {
    lastRequest = fetchSuggestions(q);             // chỉ gọi khi NGỪNG gõ ~200ms
  }, 200);
});
```

| Kỹ thuật | Giải quyết gì | Hiệu quả |
|---|---|---|
| **Debounce 150–250 ms** | Người gõ nhanh tạo request cho mọi prefix dở dang họ không bao giờ nhìn thấy | Cắt **50–70% request** — biện pháp giảm tải lớn nhất toàn hệ thống |
| **Bỏ prefix < 2 ký tự** | Prefix 1 ký tự cho kết quả vô dụng nhưng lại là subtree lớn nhất | Cắt thêm 10–20%, và đúng những request đắt nhất |
| **Huỷ request lỗi thời; chuẩn hoá `q`** | Response về sai thứ tự làm dropdown "nhảy" về prefix cũ; `Tw`/`tw `/`TW` thành 3 cache key | Sửa lỗi UX kinh điển, giảm tải, và tăng mạnh cache hit rate mọi tầng |

200 ms là điểm cân bằng phổ biến: dưới 100 ms tiết kiệm ít, trên 300 ms thì user gõ chậm *cảm thấy* trễ.

**Browser cache**: cùng prefix trả cùng kết quả trong nhiều ngày, và user liên tục gõ đi gõ lại cùng prefix. Server đặt `Cache-Control: public, max-age=60`; browser tự cache GET → prefix đã gõ trong phiên tốn **0 ms, 0 request**. Client cũng nên giữ một `Map` trong phiên và có thể **prefetch** vài nhánh xác suất cao (`tw` → nạp trước `twi`, `twe`).

**CDN**: API là GET không auth, kết quả giống nhau cho mọi người → **cache được ở edge**, cắt RTT từ 100 ms xuống 10–20 ms. Hit rate rất cao vì phân bố prefix cực lệch — **quy luật 80/20 ở đây còn cực đoan hơn bình thường**, 1% số prefix có thể chiếm 50% lưu lượng. Tách cache key theo `locale` nếu đa ngôn ngữ, nhưng **đừng tách theo user**.

Phân rã ngân sách 100 ms cho thấy thứ bậc rõ ràng: hit browser cache ~0 ms, hit CDN edge 10–25 ms, hit Trie Cache 30–60 ms — còn **phải đọc Trie DB thì 80–150 ms, tức vượt ngân sách**. Đó là lý do Trie DB **không được nằm trên đường nóng**, và node cache phải **nạp đầy trước khi nhận traffic** (warm-up trước khi vào load balancer).

---

## Bottleneck & failure mode

**Cái gì nghẽn trước:**

1. **QPS ở tầng Query Service** — 48K đỉnh. Xử lý: stateless → scale ngang; quan trọng hơn là đẩy tải ngược về CDN/browser bằng debounce và cache.
2. **RAM của Trie Cache** — phình theo số query riêng biệt, tăng khi mở rộng nhiều ngôn ngữ. Xử lý: cắt tần suất tối thiểu (đòn bẩy lớn nhất), radix tree, tách trie theo locale.
3. **Prefix nóng (hot key)** — prefix `a` có thể nhận hàng nghìn QPS vào **một** khoá. Xử lý: nhân bản shard nóng; cache vài nghìn prefix siêu nóng trong bộ nhớ Query Service; và để CDN hấp thụ — prefix càng nóng thì hit rate edge càng cao, nên hot key ở đây **tự triệt tiêu một phần**.
4. **Thời gian job build** — job hàng ngày chạy mất 26 giờ thì pipeline vỡ. Xử lý: build theo shard độc lập, aggregate tăng dần (cộng delta ngày mới thay vì quét lại 90 ngày).
5. **Băng thông và storage** — gần như không bao giờ nghẽn ở bài này.

| Component chết | Ảnh hưởng | Xử lý |
|---|---|---|
| **Một node Query Service** | Không đáng kể — stateless, LB loại khỏi vòng | Health check + auto scaling |
| **Một shard Trie Cache** | Mất gợi ý cho cả **dải prefix** đó (mọi query bắt đầu bằng `s`) | Mỗi shard **≥ 2 replica**; không kịp failover thì **fail-open trả rỗng** |
| **Toàn bộ Trie Cache** | Không ai có gợi ý | **Degrade êm ái**: trả `200 OK` với danh sách rỗng, **tuyệt đối không 5xx**; search vẫn chạy |
| **Trie DB** | Đường đọc **không bị ảnh hưởng** (cache đã nóng); chỉ node mới không khởi động được | Minh chứng cho việc tách Trie DB khỏi đường nóng |
| **Job build lỗi** | Gợi ý "đóng băng" ở bản cuối | **Hầu như không ai nhận ra trong nhiều ngày** — phải alert theo **tuổi của snapshot**, nếu không sẽ đóng băng hàng tháng |
| **CDN edge lỗi / log ingestion chết** | Latency tăng và tải dồn về origin; hoặc mất dữ liệu một khoảng thời gian | Origin sizing đủ cho trường hợp không CDN; mất log ảnh hưởng nhỏ vì thống kê tích luỹ trên cửa sổ dài, buffer ở stream chịu được gián đoạn ngắn |

> 💡 **Nguyên tắc quan trọng nhất về failure mode**: Autocomplete là tính năng **suy giảm êm ái được (gracefully degradable)** — không có gợi ý thì user vẫn gõ xong và bấm Enter. Vì vậy **luôn fail-open và trả về rỗng, đừng bao giờ để lỗi autocomplete chặn ô tìm kiếm**. Đặt timeout rất ngắn ở client (~300 ms) và bỏ qua response đến muộn.

> ⚠️ **Bẫy**: Để autocomplete dùng chung connection pool / thread pool với search service — khi autocomplete quá tải, nó kéo sập luôn search. **Cô lập tài nguyên (bulkhead) là bắt buộc**, vì autocomplete có tải gấp 20 lần và biến động mạnh hơn nhiều.

---

## Mở rộng: những câu hỏi tiếp theo trong phỏng vấn

### 1. Đa ngôn ngữ và Unicode

Giả định "chỉ a–z" sụp ngay khi có người dùng tiếng Việt, Nhật, Ả Rập. **Trie không còn 26 nhánh nữa** — Unicode có hơn 140.000 code point, không thể cấp mảng cố định mỗi node, nên **bắt buộc dùng hash map / mảng thưa** (may mắn là ta *nên* làm vậy từ đầu vì lý do bộ nhớ). Duyệt trie theo **byte UTF-8** là cách thực dụng nhất: ký tự tiếng Việt có dấu chiếm 2–3 cạnh, trie sâu hơn nhưng vẫn đúng. **Chuẩn hoá Unicode (NFC/NFD) là bắt buộc** — `ế` có thể mã hoá bằng một code point hoặc `e` + hai dấu tổ hợp; không chuẩn hoá thì hai chuỗi trông y hệt lại nằm hai nhánh khác nhau, lỗi cực khó debug. Ngôn ngữ còn mang thói quen gõ riêng: tiếng Việt thường gõ **không dấu** (`dien thoai`) nhưng mong ra `điện thoại` → index thêm dạng bỏ dấu trỏ về cùng query gốc; CJK khó hơn vì user gõ romaji/pinyin rồi mới chuyển kanji → index theo **nhiều cách đọc**.

**Chiến lược thực dụng: tách trie theo locale/quốc gia.** Một trie Unicode khổng lồ thì định tuyến đơn giản nhưng rất lớn, kết quả lẫn ngôn ngữ, khó cắt tỉa. Trie riêng theo locale nhỏ hơn, tươi hơn, deploy độc lập — và **trie tiếng Nhật chỉ cần đặt ở region châu Á**, giảm cả chi phí lẫn latency.

### 2. Dung sai lỗi chính tả (typo tolerance)

User gõ `twiiter` vẫn mong thấy `twitter`. **Rất khó với trie**, và giải thích được vì sao là câu hỏi phân loại ứng viên: trie xây trên giả định **khớp tiền tố chính xác từng ký tự**, nên một lỗi ở ký tự thứ 5 làm rẽ nhầm nhánh ở độ sâu 5 và mọi thứ bên dưới đều sai — không có cách "quay lại" mà không mất tính chất O(p).

| Phương án | Chi phí / đánh đổi |
|---|---|
| **Bỏ qua** — user tự xoá gõ lại | Rẻ nhất; hợp lý ở v1 vì user đang gõ và tự thấy lỗi |
| **Fuzzy trên trie, ED ≤ 1** — cho phép nhánh thay/chèn/xoá; bản gọn hơn là giữ một hàng ma trận DP Levenshtein khi DFS rồi cắt tỉa | **Số nhánh bùng nổ** — mỗi vị trí lỗi nhân ~26 nhánh. Khả thi cho ED=1, **bất khả thi cho ED=2** ở 48K QPS |
| **Từ điển sửa lỗi tính trước** — học từ log các cặp (sai → đúng) mà user tự sửa | **Cách các công cụ lớn thực sự dùng** — chuyển bài toán từ runtime sang offline; chỉ phủ lỗi phổ biến, nhưng lỗi phổ biến chiếm đa số |

> 💡 **Nguyên tắc**: **Thử khớp chính xác trước (O(p), rẻ), chỉ khi kết quả quá ít mới rơi xuống đường fuzzy đắt tiền** — hoặc một index n-gram/BK-tree song song. Vì đa số request gõ đúng, chi phí trung bình vẫn gần O(p): mô-típ "fast path / slow path".

### 3. Cá nhân hoá (personalization)

**Mâu thuẫn cốt lõi: cá nhân hoá phá huỷ khả năng cache.** Nếu kết quả phụ thuộc `user_id` thì CDN vô dụng, trie dùng chung vô dụng, và bạn phải tính riêng cho 10 triệu người. Bốn mức từ rẻ đến đắt: **trộn ở client** (client trộn lịch sử lưu trong máy vào top-5 chung — gần như miễn phí, giữ nguyên cache, tốt cho quyền riêng tư, hiệu quả bất ngờ vì user hay tìm lại thứ đã tìm); **theo phân khúc** (vài chục segment theo quốc gia/ngôn ngữ/thiết bị, cache key = segment nên vẫn hiệu quả); **tầng cá nhân mỏng** (trie chung + danh sách nhỏ riêng của user ở KV, thêm 1–2 ms trên đường nóng); **rerank bằng ML** trên top-20 lấy từ trie (đắt nhất, cần feature store và model serving).

> 💡 **Nguyên tắc**: Cá nhân hoá nên được **cộng thêm vào một kết quả chung cache được**, không phải thứ *thay thế* nó.

### 4. Trending / realtime — vì sao Twitter khác Google

**Google / e-commerce**: top gợi ý cho `fa` là `facebook` hôm nay, tuần sau, năm sau — batch hàng tuần là đủ, và sự ổn định còn là **tính năng**. **Twitter/X, TikTok, tin tức**: sự kiện xảy ra lúc 14:00, đến 14:10 đã có hàng triệu người tìm — autocomplete chỉ phản ánh tuần trước là **sai về mặt sản phẩm**, mù đúng lúc user cần nhất.

| Trục | Google-style | Twitter-style |
|---|---|---|
| Cửa sổ / xử lý | Tuần–ngày, batch trên log lịch sử | Phút–giây, stream processing |
| Cấu trúc & tín hiệu | Trie tĩnh swap định kỳ; tần suất tuyệt đối | Trie nền + **overlay trending liên tục**; **tốc độ tăng (velocity)** |
| Phần cần tươi | Toàn bộ trie | Vài nghìn query — đủ nhỏ để realtime |

Với trending, **tín hiệu đúng là đạo hàm chứ không phải giá trị tuyệt đối**: một hashtag mới có 50.000 lượt trong 10 phút phải xếp trên từ khoá có 50 triệu lượt tích luỹ 5 năm — `trending_score(q) = count_window(q, 10 phút) / (baseline(q) + smoothing)`, trong đó `smoothing` tránh chia cho 0 và tránh để một query mới toanh với 5 lượt nhảy lên số 1. Điểm kiến trúc: **không cần dựng lại toàn bộ trie realtime** — chỉ vài nghìn query trending cần tươi, giữ chúng trong một sorted set Redis rồi trộn vào kết quả trie nền lúc trả lời. Bạn có độ tươi của streaming với chi phí của batch.

### 5. Lọc từ khoá nhạy cảm và spam

Autocomplete có đặc tính nguy hiểm: **nó phát biểu thay cho hệ thống**. Khi ô tìm kiếm gợi ý một câu phân biệt chủng tộc, user không nghĩ "đó là thống kê" — họ nghĩ "công ty này gợi ý điều đó". Rủi ro pháp lý và thương hiệu có thật, vì dữ liệu nguồn là **hành vi thật của người dùng** — vốn chứa nội dung thù ghét, tin sai, và spam do bot bơm.

```
Bảng tần suất ──▶ [ FILTER LAYER ] ──▶ Worker dựng trie ──▶ snapshot
   blocklist khớp chính xác · luật theo mẫu (regex, biến thể lách) · mô hình phân
   loại nội dung độc hại · luật riêng theo vùng/pháp lý · chặn theo thực thể
```

Vì sao lọc **ở tầng offline, trước khi dựng trie**: đường nóng không phải trả thêm chi phí nào (quan trọng với 48K QPS); luật lọc có thể phức tạp và chậm tuỳ ý vì chạy trong job batch; và nội dung xấu **không bao giờ tồn tại** trong dữ liệu phục vụ nên không rò rỉ qua cache/CDN. Nhưng cần **thêm** một lớp trên đường nóng cho khẩn cấp — khi phát hiện gợi ý xấu trong production, không thể đợi chu kỳ build tiếp theo (có thể một tuần) → một **blocklist nóng, nhỏ, đọc từ cache, áp ngay trước khi trả về**; xoá vật lý khỏi trie/DB làm bất đồng bộ sau.

> 💡 **Nguyên tắc**: **Lọc offline cho toàn bộ, lọc online cho khẩn cấp** — cùng mô hình hai tốc độ với trie nền + overlay trending.

Về **spam bơm từ khoá** (kẻ xấu tự động search một cụm từ hàng triệu lần để đẩy nó lên gợi ý — một hình thức SEO đen có thật), phòng thủ nằm ở **tầng aggregate**: **khử trùng lặp theo user** — đếm *số user riêng biệt*, không đếm *số lần tìm*, nên bot dù search một triệu lần cũng chỉ tính một user. Bổ sung: loại traffic từ IP/device bất thường, đặt ngưỡng tối thiểu N user riêng biệt từ M mạng khác nhau.

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Cache gợi ý ở edge, cắt RTT | **CloudFront** | GET công khai, giống nhau cho mọi user → cache edge TTL 30–120 s; phân bố prefix cực lệch nên hit rate rất cao |
| Cổng vào, throttling; tầng Query Service | **API Gateway** + **WAF**; **ECS/EKS (Fargate/EC2)** hoặc Lambda | Usage plan/throttle chặn client gửi quá nhiều phím gõ, WAF chặn bot scrape. Tải 48K QPS ổn định → container chạy liên tục rẻ hơn và không cold start; Lambda hợp giai đoạn đầu |
| Trie Cache / bảng top-k in-memory | **ElastiCache for Redis** | Latency dưới ms; cluster mode tự shard; replica cho HA; **sorted set** tiện giữ top-k và trending |
| Bảng `prefix → top5` tính sẵn | **DynamoDB** (partition key `prefix`, tiền tố phiên bản `v42#tw`) | Point lookup một chữ số ms, tự scale hàng trăm nghìn RPS, không phải tự quản shard; **DAX** thêm cache. Hiện thực trực tiếp của "KV phẳng" |
| Trie DB dạng snapshot serialize | **S3** (versioning) + **DynamoDB** giữ con trỏ phiên bản active | Blob lớn nằm S3 rẻ và bền; **swap atomic = cập nhật một item DynamoDB**; rollback = trỏ ngược lại |
| Thu thập & đổ log thô | **Kinesis Data Streams** (hoặc **MSK**) → **Firehose → S3** | Stream hấp thụ đỉnh, tách search service khỏi pipeline analytics, cho nhánh trending đọc song song; Firehose tự buffer, nén Parquet, phân vùng `dt=/hh=` — đúng nhu cầu "append-only, không index" |
| Aggregate + dựng trie/bảng top-k offline | **EMR (Spark)** / **AWS Glue** → **S3** → bulk load **DynamoDB**/**Redis** | Quét partition S3, `GROUP BY query`, khử trùng lặp theo user, cắt ngưỡng, rồi dựng bảng top-k. Toàn bộ độ phức tạp thuật toán nằm ở tầng offline — đúng nguyên tắc "dịch việc sang write-time" |
| Điều phối pipeline; truy vấn ad-hoc | **Step Functions** + **EventBridge Scheduler**; **Athena** | Chuỗi aggregate → filter → build → validate → swap cần retry và **cổng kiểm tra trước khi swap**. Athena chạy SQL thẳng trên S3 để điều tra gợi ý lạ và **tính shard map** |
| Thay thế trie tự xây | **Amazon OpenSearch Service** — `completion suggester` / `edge_ngram` | Xem bảng so sánh bên dưới |
| Rerank; lọc độc hại | **Personalize**/**SageMaker**; **Comprehend** + blocklist ở **DynamoDB** | Rerank ML trên top-20 từ trie; Comprehend gắn nhãn offline, blocklist nóng cho khẩn cấp |
| Chuẩn hoá prefix, blocklist tại edge | **CloudFront Functions** / **Lambda@Edge** | Lowercase/trim tại edge để tăng cache hit; áp blocklist khẩn cấp không cần chạm origin |
| Giám sát | **CloudWatch** + **X-Ray** | p99 latency, cache hit rate, và **tuổi của snapshot trie** — metric hay bị quên đặt alert nhất |

### OpenSearch vs trie tự xây

Câu hỏi gần như chắc chắn sẽ đến trong phỏng vấn thiên về AWS: *"Sao không dùng luôn OpenSearch?"*.

- **`completion suggester`** dùng **FST (Finite State Transducer)** nằm hoàn toàn trong bộ nhớ — về bản chất *chính là* một trie đã nén rất mạnh do Lucene cài đặt, hỗ trợ `weight` (tương đương `frequency`), trả kết quả prefix dưới mili-giây.
- **`edge_ngram` analyzer** sinh sẵn mọi tiền tố lúc index (`twitter` → `tw`, `twi`, `twit`…) rồi index như term thường; truy vấn prefix thành term match.

| Tiêu chí | Trie tự xây | `completion suggester` | `edge_ngram` |
|---|---|---|---|
| Latency | Tốt nhất | Rất tốt (FST in-memory) | Tốt (5–30 ms) |
| Công sức xây dựng | **Cao** — tự lo shard, snapshot, swap, HA | Thấp — cấu hình mapping | Thấp |
| Xếp hạng; fuzzy; infix | Kiểm soát hoàn toàn; fuzzy phải tự làm (rất khó); không infix | `weight` ít linh hoạt hơn; **fuzzy có sẵn**; infix hạn chế | BM25 + boost; fuzzy có sẵn; **infix làm được** (`ngram`) |
| Phù hợp khi | Quy mô cực lớn, cần kiểm soát từng ms và từng GB | **Phần lớn trường hợp thực tế** | Cần khớp giữa chuỗi, hoặc đã có OpenSearch cho search chính |

> 💡 **Nguyên tắc thực chiến**: Trong công việc thật, **bắt đầu bằng `completion suggester`** (hoặc đơn giản hơn: một bảng DynamoDB `prefix → top5` sinh từ job Glue), chỉ tự xây trie khi đã **đo được** rằng giải pháp sẵn có không đạt latency hoặc quá đắt. Trong phỏng vấn thì ngược lại — người ta muốn nghe bạn **hiểu trie**; hãy trình bày trie như lõi thuật toán rồi *chủ động* nhắc rằng thực tế `completion suggester` giải quyết 90% nhu cầu với 10% công sức.

Ghép lại: **đọc** = Browser (debounce + local cache) → CloudFront → API Gateway → ECS Fargate → DynamoDB (`prefix→top5`, +DAX) hoặc Redis. **Ghi** = Search svc → Kinesis → Firehose → S3 → Glue/EMR → Filter → bulk load DynamoDB (`v42#…`) → Step Functions kiểm tra → đổi con trỏ phiên bản (swap atomic). **Trending** = Kinesis → Managed Service for Apache Flink → Redis sorted set overlay.

**Đường đọc không hề biết đến sự tồn tại của đường ghi** — chúng chỉ gặp nhau ở một item DynamoDB giữ con trỏ phiên bản. Đây là sự tách rời triệt để nhất mà bài toán cho phép, và là lý do hệ thống vừa nhanh vừa dễ vận hành.

---

## Cách trình bày khi phỏng vấn / review

1. **Mở màn bằng con số gây sốc về QPS.** *"Autocomplete không phải một request mỗi lần search — mà một request mỗi phím gõ. 10M DAU × 10 search × 20 ký tự ≈ 24K QPS, đỉnh 48K — gấp 20 lần search QPS."* Câu này lập tức định khung cả bài.

2. **Chốt hai câu hỏi làm rõ then chốt** — *"Prefix-only hay infix?"* và *"Dữ liệu được phép cũ bao lâu?"* — chúng trực tiếp quyết định trie-hay-không và batch-hay-streaming.

3. **Nêu phương án ngây thơ rồi tự bác bỏ.** Vẽ `WHERE query LIKE 'tw%' ORDER BY frequency LIMIT 5`, rồi chỉ điểm chết: *"index prefix thì được, nhưng `ORDER BY frequency` buộc đọc hết hàng triệu dòng khớp; chi phí tỉ lệ với số dòng khớp chứ không phải số dòng trả về; và tệ nhất là prefix ngắn — lại đúng là prefix được gọi nhiều nhất."*

4. **Trình bày trie theo hai nhịp.** Nhịp một: trie trần, O(p + c + c·log c), `c` có thể hàng triệu. Nhịp hai: cache top-k tại node → O(p) ≤ O(50), **giá là** bộ nhớ gấp 2–3 lần và cập nhật đắt hơn hẳn. Rồi nối sang batch bằng quan hệ nhân quả: *"chính vì cache top-k khiến mỗi lần ghi phải cập nhật mọi tổ tiên nên realtime không khả thi — và cũng không cần, vì thêm 1 vào 9.832.100 không đổi thứ hạng."* Chuỗi nhân quả này là dấu hiệu rõ nhất của tư duy hệ thống.

5. **Tính bộ nhớ ra con số rồi tự tối ưu**: *"26 con trỏ × 8 B = 208 B + metadata ≈ 250 B/node; 400 triệu node ≈ 100 GB"* → hash map thay mảng 26, radix tree, cắt tần suất → còn 10–20 GB. Rồi **chủ động nêu lệch tải khi shard.** *"Shard theo ký tự đầu là hiển nhiên nhưng sai — `a`, `s`, `g` nhiều gấp chục lần `x`, `z`. Cần shard map manager đo phân bố **trọng số truy vấn** thực tế rồi chia nhóm cân bằng."* Và nhắc: nếu trie đủ nhỏ (< ~10 GB) thì **nhân bản còn tốt hơn shard** — chọn giải pháp đơn giản khi được phép là tín hiệu trưởng thành.

6. **Đừng bỏ qua client.** Debounce 200 ms cắt 50–70% request — biện pháp giảm tải lớn nhất toàn hệ thống, tốn ba dòng JavaScript; kèm bỏ prefix < 2 ký tự, huỷ request lỗi thời, chuẩn hoá prefix.

7. **Nói rõ triết lý failure**: *"Autocomplete suy giảm êm ái được. Trie cache chết thì trả 200 với mảng rỗng, tuyệt đối không 5xx, và phải cô lập tài nguyên khỏi search — tính năng phụ không được phép kéo sập tính năng chính."*

8. **Trả lời câu hỏi mở rộng theo ba nhịp**: *vấn đề là gì → vì sao thiết kế hiện tại không xử lý được → phương án và cái giá*. Ví dụ typo: *"Trie giả định khớp chính xác từng ký tự nên một lỗi ở ký tự thứ 5 làm rẽ nhầm nhánh; ED=1 còn khả thi, ED=2 thì bùng nổ. Cách thực tế là học bảng `typo → correct` từ hành vi user tự sửa."* Tương tự với độ tươi (**Google-style batch hàng tuần, Twitter-style cần stream và xếp hạng theo tốc độ tăng**) và với lọc nội dung — nhắc nó dù không ai hỏi: lọc offline cho toàn bộ, blocklist nóng cho khẩn cấp, chống spam bằng đếm user riêng biệt.

9. **Với phỏng vấn AWS, chủ động so sánh với OpenSearch.** `completion suggester` về bản chất là một trie (FST) Lucene cài sẵn; thực tế nên bắt đầu từ đó hoặc từ bảng DynamoDB precompute, chỉ tự xây trie khi đã **đo được** là không đủ. Phân biệt được "bài tập thuật toán" và "quyết định kỹ thuật thực tế" là dấu hiệu người đã làm nghề.

> 💡 **Nguyên tắc cuối**: Bài autocomplete là minh hoạ đẹp nhất cho một tư tưởng xuyên suốt System Design — **khi đọc nặng mà dữ liệu đổi chậm, hãy dịch chuyển công việc sang write-time**. Trie có cache top-k, snapshot dựng offline, bảng `prefix → top5` tính sẵn, cache ở CDN và browser: tất cả là cùng một ý tưởng lặp lại ở các tầng khác nhau — trả bằng bộ nhớ và độ tươi, mua về latency và throughput. Nhận ra rằng **năm quyết định tưởng rời rạc thực chất là một nguyên lý duy nhất** — đó mới là thứ người phỏng vấn đang tìm.
