# Bài 15 — OLTP vs OLAP: row vs columnar

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **OLTP** (Online Transaction Processing) và **OLAP** (Online Analytical Processing) qua *bản chất workload*, không chỉ định nghĩa thuộc lòng.
- Giải thích vì sao **row-oriented storage** tối ưu cho OLTP, còn **columnar storage** thắng áp đảo cho OLAP — bằng cách nào dữ liệu nằm trên đĩa/RAM tạo ra khác biệt.
- Hiểu ba trụ cột giúp columnar nhanh: **chỉ đọc cột cần**, **nén (compression) tốt**, **vectorized execution**.
- Phân biệt **data warehouse**, **data lake**, **lakehouse** và biết chọn cái nào.
- Nắm khái niệm **ETL vs ELT** và vì sao thời cloud data warehouse người ta lật sang ELT.

---

## 2. Lý thuyết

### 2.1 Hai loại công việc khác nhau về chất

Hãy hình dung một siêu thị. Có hai loại "việc" hoàn toàn khác nhau:

- **Quầy thu ngân (OLTP):** mỗi khách quét vài món, thanh toán, xong trong vài giây. Rất **nhiều** giao dịch nhỏ, mỗi cái chạm **ít dòng** (giỏ hàng của *một* người), cần **latency thấp** và **đúng tuyệt đối** (không được tính nhầm tiền → cần ACID).
- **Phòng phân tích cuối tháng (OLAP):** một nhân viên chạy báo cáo "doanh thu theo ngành hàng, theo vùng, 3 năm qua". Rất **ít** truy vấn, nhưng mỗi truy vấn **quét hàng triệu dòng** để cộng/gộp (aggregate), chạy vài giây tới vài phút cũng chấp nhận được.

Đây không phải cùng một hệ thống làm hai việc — mà là **hai profile workload đối lập**. Cố ép một database làm cả hai thì hoặc chậm, hoặc tốn kém, hoặc cả hai.

| Tiêu chí | **OLTP** | **OLAP** |
|----------|----------|----------|
| Mẫu truy vấn | Nhiều query nhỏ, điểm (point) | Ít query lớn, quét (scan) |
| Số dòng mỗi query | Vài dòng (theo key) | Hàng triệu–tỷ dòng |
| Số cột đụng tới | Hầu hết cột của vài dòng | Vài cột của rất nhiều dòng |
| Đọc/Ghi | Đọc **và** ghi liên tục | Chủ yếu đọc (ghi theo batch) |
| Latency mục tiêu | Mili giây | Giây → phút |
| Dữ liệu | Trạng thái *hiện tại* | Lịch sử, tích luỹ |
| Đơn vị đo | Transactions/giây (TPS) | Rows scanned/giây, GB/s |
| Ví dụ | PostgreSQL, MySQL, Oracle | BigQuery, Snowflake, Redshift, ClickHouse, DuckDB |
| Câu hỏi điển hình | "Số dư tài khoản #123?" | "Doanh thu trung bình theo tháng, theo quốc gia?" |

### 2.2 Dữ liệu nằm trên đĩa thế nào — row vs column

Cốt lõi của toàn bộ bài này: **một bảng logic 2 chiều phải được xếp tuyến tính (1 chiều) trên đĩa**. Có hai cách xếp, và lựa chọn đó quyết định cái gì nhanh.

Giả sử bảng `orders`:

| id | user_id | country | amount |
|----|---------|---------|--------|
| 1  | 42      | VN      | 100    |
| 2  | 42      | VN      | 250    |
| 3  | 77      | US      | 90     |

<svg viewBox="0 0 660 300" role="img" aria-labelledby="rc-t rc-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="rc-t">Row-oriented vs Columnar layout trên đĩa</title>
<desc id="rc-d">Row store lưu các cột của cùng một dòng cạnh nhau; columnar store lưu tất cả giá trị của cùng một cột cạnh nhau</desc>
<text x="150" y="24" text-anchor="middle" font-size="14" fill="currentColor">Row-oriented (OLTP)</text>
<rect x="20" y="40" width="60" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="80" y="40" width="60" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="140" y="40" width="60" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="200" y="40" width="60" height="30" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="50" y="60" text-anchor="middle" font-size="11" fill="currentColor">1</text>
<text x="110" y="60" text-anchor="middle" font-size="11" fill="currentColor">42</text>
<text x="170" y="60" text-anchor="middle" font-size="11" fill="currentColor">VN</text>
<text x="230" y="60" text-anchor="middle" font-size="11" fill="currentColor">100</text>
<rect x="20" y="70" width="60" height="30" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="80" y="70" width="60" height="30" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="140" y="70" width="60" height="30" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="200" y="70" width="60" height="30" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="50" y="90" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="110" y="90" text-anchor="middle" font-size="11" fill="currentColor">42</text>
<text x="170" y="90" text-anchor="middle" font-size="11" fill="currentColor">VN</text>
<text x="230" y="90" text-anchor="middle" font-size="11" fill="currentColor">250</text>
<text x="150" y="128" text-anchor="middle" font-size="11" fill="currentColor">Cả một dòng nằm liền nhau →</text>
<text x="150" y="144" text-anchor="middle" font-size="11" fill="currentColor">lấy trọn 1 order rất rẻ</text>
<text x="510" y="24" text-anchor="middle" font-size="14" fill="currentColor">Columnar (OLAP)</text>
<rect x="380" y="40" width="60" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="440" y="40" width="60" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="500" y="40" width="60" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="60" text-anchor="middle" font-size="11" fill="currentColor">1</text>
<text x="470" y="60" text-anchor="middle" font-size="11" fill="currentColor">2</text>
<text x="530" y="60" text-anchor="middle" font-size="11" fill="currentColor">3</text>
<text x="600" y="60" font-size="10" fill="currentColor">id</text>
<rect x="380" y="70" width="60" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="440" y="70" width="60" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="500" y="70" width="60" height="30" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="90" text-anchor="middle" font-size="11" fill="currentColor">VN</text>
<text x="470" y="90" text-anchor="middle" font-size="11" fill="currentColor">VN</text>
<text x="530" y="90" text-anchor="middle" font-size="11" fill="currentColor">US</text>
<text x="600" y="90" font-size="10" fill="currentColor">country</text>
<rect x="380" y="100" width="60" height="30" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="440" y="100" width="60" height="30" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="500" y="100" width="60" height="30" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="120" text-anchor="middle" font-size="11" fill="currentColor">100</text>
<text x="470" y="120" text-anchor="middle" font-size="11" fill="currentColor">250</text>
<text x="530" y="120" text-anchor="middle" font-size="11" fill="currentColor">90</text>
<text x="600" y="120" font-size="10" fill="currentColor">amount</text>
<text x="470" y="164" text-anchor="middle" font-size="11" fill="currentColor">Cả một cột nằm liền nhau →</text>
<text x="470" y="180" text-anchor="middle" font-size="11" fill="currentColor">SUM(amount) chỉ đọc đúng 1 dải</text>
</svg>

- **Row store** ghi lần lượt `(1,42,VN,100)(2,42,VN,250)(3,77,US,90)`. Muốn lấy toàn bộ order id=2 → đọc **một** vùng liền mạch. Tuyệt cho OLTP: một dòng = một record nghiệp vụ.
- **Column store** ghi `[1,2,3][42,42,77][VN,VN,US][100,250,90]`. Muốn `SELECT SUM(amount)` → chỉ đọc **đúng dải `amount`**, bỏ qua hoàn toàn `user_id`, `country`.

### 2.3 Vì sao columnar thắng OLAP — ba trụ cột

**(1) Chỉ đọc cột cần (column pruning).** Bảng thực tế thường có 50–200 cột. Một query analytics điển hình đụng 3–5 cột. Với row store, để cộng `amount` bạn vẫn phải lôi *cả dòng* (200 cột) từ đĩa vào rồi vứt đi 195 cột — lãng phí I/O khủng khiếp. Columnar chỉ chạm 3/200 cột → giảm I/O ~**40–60 lần** ngay lập tức.

**(2) Nén tốt (compression).** Dữ liệu *cùng một cột* thì cùng kiểu, giá trị gần nhau, lặp nhiều → nén cực hiệu quả:
- **Run-length encoding (RLE):** cột `country` là `VN,VN,VN,...,US,US` → lưu "VN×1_000_000, US×500_000" thay vì 1.5 triệu chuỗi.
- **Dictionary encoding:** thay `"Vietnam"` bằng số nguyên 0, `"United States"` bằng 1 → so sánh số nhanh, tốn ít byte.
- **Delta / bit-packing** cho cột số tăng dần (id, timestamp).

Row store *không* nén tốt như vậy vì trong một dòng các kiểu khác nhau (int, string, float) nằm xen kẽ. Thực tế columnar warehouse thường đạt tỉ lệ nén **3×–10×**. Nén nhiều = ít byte đọc từ đĩa = nhanh hơn nữa (I/O thường là nút cổ chai, không phải CPU).

**(3) Vectorized execution.** Vì một cột là một mảng giá trị cùng kiểu nằm liền nhau trong RAM, engine xử lý theo **lô (batch/vector) hàng nghìn giá trị một lần** thay vì từng-dòng-một. Điều này khai thác **SIMD** (một lệnh CPU cộng 8–16 số cùng lúc), cache CPU nóng, và ít vòng lặp/nhánh hơn. Engine kiểu row (tuple-at-a-time) tốn nhiều overhead cho mỗi dòng. Vectorization thường cho tốc độ CPU gấp **nhiều lần** trên workload aggregate.

> **Con số trực giác:** bảng 1 tỷ dòng × 100 cột, mỗi giá trị ~8 byte → ~800 GB nếu quét cả bảng.
> - Row store cho `SELECT SUM(amount)`: buộc quét gần **toàn bộ 800 GB**.
> - Columnar: chỉ cột `amount` = ~8 GB thô, nén 4× còn **~2 GB**. Khác biệt I/O **~400×**. Đây là lý do một câu analytics chạy trên warehouse nhanh hơn cùng câu đó trên OLTP database hàng trăm lần.

### 2.4 Nhưng đừng dùng columnar cho OLTP

Columnar dở tệ ở đúng việc OLTP giỏi:
- **Ghi một dòng** (`INSERT` một order) phải đụng vào *tất cả* các cột-file → nhiều thao tác rời rạc, đắt. Vì vậy columnar thích **ghi theo batch** (nạp hàng triệu dòng một lần), không thích ghi lắt nhắt từng dòng.
- **Lấy trọn một dòng** (`SELECT * WHERE id=123`) phải nhặt một giá trị từ mỗi cột-file rải rác → chậm hơn row store nhiều.
- **UPDATE/DELETE điểm** và giao dịch ACID nhiều dòng là điểm yếu cố hữu.

→ Không có kẻ thắng tuyệt đối. **Chọn theo workload.** Đó là lý do kiến trúc thực tế tách hai hệ: OLTP database phục vụ ứng dụng, dữ liệu được *đưa sang* một hệ analytical riêng.

---

## 3. Nơi chứa dữ liệu phân tích: Warehouse, Lake, Lakehouse

Khi tách analytics ra khỏi OLTP, câu hỏi kế: đổ dữ liệu vào đâu?

### 3.1 Data Warehouse
Kho dữ liệu **có cấu trúc (schema)**, tối ưu cho truy vấn SQL analytical, thường **columnar** bên trong. Dữ liệu được làm sạch, chuẩn hoá, mô hình hoá (star schema: fact + dimension) *trước khi* nạp. Ví dụ: **Snowflake, BigQuery, Redshift, Teradata**.
- Ưu: query nhanh, quản trị/quyền/chất lượng dữ liệu tốt, người dùng BI quen thuộc.
- Nhược: kém linh hoạt với dữ liệu phi cấu trúc (ảnh, log, JSON tự do); phải định nghĩa schema trước (**schema-on-write**).

### 3.2 Data Lake
Đổ **mọi thứ ở dạng thô** vào object storage rẻ (S3, GCS, HDFS): CSV, JSON, Parquet, ảnh, log... Không ép schema khi ghi; áp schema khi *đọc* (**schema-on-read**).
- Ưu: rẻ, chứa được dữ liệu phi/bán cấu trúc, hợp ML/data science.
- Nhược: dễ thành **"data swamp"** (đầm lầy) — không quản trị, không đảm bảo chất lượng, không giao dịch, khó dùng cho BI trực tiếp.

### 3.3 Lakehouse
Kiến trúc lai: giữ **object storage rẻ + file mở (Parquet)** của lake, nhưng gắn thêm một **table format giao dịch** (**Apache Iceberg, Delta Lake, Apache Hudi**) mang lại ACID, schema evolution, time-travel, `UPDATE/DELETE` — những thứ trước đây chỉ warehouse có. Engine như **Spark, Trino, Databricks, DuckDB** đọc trực tiếp.
- Ý tưởng: *một* bản sao dữ liệu trên storage mở phục vụ cả BI (SQL) lẫn ML, tránh chép dữ liệu hai nơi (lake + warehouse).

| | Data Warehouse | Data Lake | Lakehouse |
|--|----------------|-----------|-----------|
| Dữ liệu | Có cấu trúc | Thô, mọi loại | Thô + có bảng giao dịch |
| Schema | On-write (trước) | On-read (sau) | On-read + governance |
| Storage | Độc quyền/tối ưu | Object storage rẻ | Object storage + open format |
| Giao dịch/ACID | Có | Không | Có (Iceberg/Delta/Hudi) |
| Hợp cho | BI, báo cáo | ML, data thô | Cả hai |
| Rủi ro | Đắt, cứng | "Data swamp" | Non hơn, phức tạp vận hành |

> **Định dạng file cột nền tảng:** **Apache Parquet** (và ORC) là cách đóng gói columnar + nén ngay trên object storage — chính là "columnar layout" ở mục 2.2 hiện hình thành file thật. Hiểu Parquet = hiểu vì sao lake/lakehouse query nhanh được.

---

## 4. Đưa dữ liệu vào kho: ETL vs ELT

Dữ liệu sinh ra ở OLTP (và log, API...) phải chảy vào warehouse/lake. Có hai thứ tự:

- **ETL — Extract, Transform, Load:** rút dữ liệu → **biến đổi/làm sạch ở một tầng riêng** → *rồi mới* nạp bản đã xử lý vào warehouse. Kiểu cổ điển khi lưu trữ/compute của warehouse đắt: chỉ nạp thứ đã tinh gọn.
- **ELT — Extract, Load, Transform:** rút dữ liệu → **nạp thẳng dạng thô** vào warehouse/lake → **biến đổi bằng chính SQL/compute của warehouse** *sau khi* đã ở trong đó.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="etl-t etl-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="etl-t">ETL so với ELT</title>
<desc id="etl-d">ETL biến đổi dữ liệu trước khi nạp; ELT nạp thô rồi biến đổi bên trong warehouse</desc>
<text x="320" y="24" text-anchor="middle" font-size="14" fill="currentColor">ETL — transform TRƯỚC khi load</text>
<rect x="20" y="40" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="64" text-anchor="middle" font-size="12" fill="currentColor">Extract</text>
<rect x="150" y="40" width="110" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="58" text-anchor="middle" font-size="12" fill="currentColor">Transform</text>
<text x="205" y="73" text-anchor="middle" font-size="10" fill="currentColor">(tầng riêng)</text>
<rect x="300" y="40" width="90" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="64" text-anchor="middle" font-size="12" fill="currentColor">Load</text>
<rect x="430" y="40" width="120" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="64" text-anchor="middle" font-size="12" fill="currentColor">Warehouse</text>
<line x1="110" y1="60" x2="148" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<line x1="260" y1="60" x2="298" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<line x1="390" y1="60" x2="428" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<text x="320" y="140" text-anchor="middle" font-size="14" fill="currentColor">ELT — load thô, transform BÊN TRONG</text>
<rect x="20" y="156" width="90" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="65" y="180" text-anchor="middle" font-size="12" fill="currentColor">Extract</text>
<rect x="150" y="156" width="90" height="40" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="195" y="180" text-anchor="middle" font-size="12" fill="currentColor">Load thô</text>
<rect x="280" y="146" width="270" height="60" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="415" y="170" text-anchor="middle" font-size="12" fill="currentColor">Warehouse / Lakehouse</text>
<text x="415" y="188" text-anchor="middle" font-size="11" fill="currentColor">Transform bằng SQL/compute tại chỗ</text>
<line x1="110" y1="176" x2="148" y2="176" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<line x1="240" y1="176" x2="278" y2="176" stroke="currentColor" stroke-width="1.5" marker-end="url(#ea)"/>
<defs><marker id="ea" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Vì sao cloud lật sang ELT?** Warehouse hiện đại (BigQuery, Snowflake) **tách storage và compute**, storage rẻ, compute co giãn và mạnh. Nạp thô rồi transform bằng SQL ngay trong đó vừa **linh hoạt** (giữ raw để tái xử lý khi logic thay đổi), vừa **tận dụng sức mạnh song song** của warehouse, vừa hợp công cụ như **dbt** (transform bằng SQL versioned). ETL cổ điển vẫn hợp khi phải làm sạch/ẩn danh dữ liệu nhạy cảm *trước khi* nó chạm kho, hoặc khi nguồn quá bẩn.

### Ví dụ ELT bằng SQL trong warehouse

```sql
-- Bước LOAD: dữ liệu order thô đã được nạp thẳng vào bảng staging (chưa xử lý)
-- Bước TRANSFORM: dựng bảng phân tích bằng chính SQL của warehouse.
-- Trên columnar engine, câu GROUP BY này chỉ đọc 3 cột: country, order_date, amount.
CREATE TABLE analytics.revenue_by_country AS
SELECT
    country,
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*)          AS num_orders,
    SUM(amount)       AS revenue,
    AVG(amount)       AS avg_order_value
FROM staging.orders_raw
WHERE status = 'paid'
GROUP BY country, DATE_TRUNC('month', order_date);
```

Câu này là **OLAP kinh điển**: quét nhiều dòng, đụng ít cột, aggregate. Trên columnar warehouse nó bay; chạy y hệt trên PostgreSQL OLTP với vài trăm triệu dòng sẽ chậm hơn nhiều vì phải quét dữ liệu theo dòng.

---

## 5. Tóm tắt
- **OLTP** = nhiều giao dịch **nhỏ**, đọc/ghi vài dòng theo key, latency mili giây, cần ACID → **row-oriented** (một dòng nằm liền nhau, lấy/ghi cả record rẻ).
- **OLAP** = ít truy vấn nhưng **quét/aggregate hàng triệu dòng**, đụng ít cột → **columnar** thắng nhờ ba trụ cột: **chỉ đọc cột cần**, **nén 3–10×**, **vectorized execution (SIMD, batch)**. Chênh lệch I/O có thể tới hàng trăm lần.
- Columnar **dở** ở ghi từng dòng, lấy trọn dòng, UPDATE điểm → tách hai hệ: OLTP cho app, hệ analytical riêng cho báo cáo.
- **Warehouse** (schema-on-write, có cấu trúc) vs **Lake** (schema-on-read, thô, rẻ, dễ thành swamp) vs **Lakehouse** (open format + table format Iceberg/Delta/Hudi cho ACID trên lake). Parquet là file columnar nền tảng.
- **ETL** transform trước khi load; **ELT** load thô rồi transform trong warehouse — cloud ưu ELT vì storage rẻ + compute co giãn + giữ được raw.

> **Bài tiếp theo:** đi vào **modeling cho warehouse** — star schema, fact vs dimension, và vì sao denormalize lại đúng đắn ở thế giới analytics (ngược với normalize của OLTP).
