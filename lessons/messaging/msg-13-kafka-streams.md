# Bài 13 — Stream processing: Kafka Streams & ksqlDB

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **stream processing** là gì và vì sao đôi khi ta cần **xử lý ngay trên luồng** thay vì đổ hết vào DB rồi query theo mẻ (batch).
- Phân biệt bản chất **KStream** (luồng event, mỗi record là một sự kiện) và **KTable** (bảng trạng thái, mỗi record là *cập nhật mới nhất* cho một key) — và **stream–table duality**.
- Nói rõ đâu là thao tác **stateless** (`map`/`filter`/`branch`) chạy được không cần nhớ gì, đâu là **stateful** (`count`/`aggregate`/`join`) cần **state store** (RocksDB local + **changelog topic** để phục hồi).
- Cấu hình **windowing** (tumbling / hopping / session / sliding) và **grace period** để xử lý **late event** đúng nghĩa.
- Bật **exactly-once** trong Kafka Streams chỉ bằng một dòng config, và hiểu nó dựa trên gì.
- Biết khi nào dùng **ksqlDB** (SQL trên stream) và khi nào phải bước sang **Apache Flink**.

---

## 2. Lý thuyết

### 2.1 Analogy: nhà máy trên băng chuyền vs kho rồi kiểm kê cuối ngày

Cách "batch" cổ điển giống một nhà kho: cả ngày cứ nhét hàng vào kho (ghi event vào DB), **đến tối** mới cho người vào **đếm và tổng kết**. Kết quả luôn **trễ** — sáng mai mới biết hôm qua bán được bao nhiêu.

**Stream processing** đảo ngược: đặt **công nhân ngay trên băng chuyền**. Mỗi món hàng (event) chạy qua là **xử lý liền** — dán nhãn, loại phế phẩm, cộng dồn vào bảng đếm treo ngay cạnh băng chuyền. Kết quả **luôn tươi**, cập nhật theo từng event. Kafka Streams chính là bộ "công nhân trên băng chuyền" đó, và điều hay là: **nó chỉ là một thư viện Java bạn nhúng vào app**, không phải một cụm server riêng phải dựng và vận hành như Spark/Flink.

Điểm mấu chốt: Kafka Streams **đọc từ topic Kafka, xử lý, ghi trả ra topic Kafka**. Input là stream, output là stream. Toàn bộ độ tin cậy (offset, replication, exactly-once) *tái sử dụng* chính hạ tầng Kafka bạn đã học ở các bài trước — không có "hệ thống thứ hai" để đồng bộ.

### 2.2 Hai công dân hạng nhất: KStream và KTable

Đây là khái niệm quan trọng nhất của cả bài. Cùng một topic, nhưng **cách bạn diễn giải** nó quyết định kết quả.

- **KStream** = một **luồng các sự kiện độc lập**. Mỗi record là một *fact đã xảy ra*, cộng dồn (append). Hai record cùng key **không** ghi đè nhau — chúng là hai sự kiện khác nhau. Nghĩ tới: "giao dịch nạp/rút", "cú click", "lượt xem".
- **KTable** = một **bảng trạng thái hiện tại** theo key, được xây từ một **changelog**. Record mới cùng key **ghi đè** (upsert) record cũ; `value = null` là **tombstone** xoá key. Nghĩ tới: "số dư tài khoản hiện tại", "trạng thái đơn hàng mới nhất", "hồ sơ user".

Ví dụ cùng chuỗi record `(alice, +100), (alice, -30)`:

| Diễn giải | Kết quả |
|-----------|---------|
| **KStream** (luồng event) | Hai sự kiện: alice nạp 100, alice rút 30. Cả hai được giữ; cộng dồn lại mới ra số dư 70. |
| **KTable** (bảng trạng thái) | Chỉ giữ **mới nhất**: alice = -30 (giá trị cuối ghi đè), không phải số dư 70. Muốn bảng số dư thì phải aggregate KStream (cộng dồn theo key); kết quả của phép đó mới là KTable "số dư hiện tại". |

<ab-toggle data-labels="KStream|KTable">
<svg viewBox="0 0 480 308" role="img" aria-labelledby="msg13a-t msg13a-d" font-family="ui-sans-serif, system-ui, sans-serif" style="width:100%;max-width:480px;height:auto;display:block;margin:1.25rem auto"><title id="msg13a-t">KStream: cùng input giữ cả 4 event</title><desc id="msg13a-d">Input (A,1) (B,2) (A,3) (B,4). Diễn giải KStream: mỗi record là một event, append, giữ cả 4 record, hai record cùng key không ghi đè nhau.</desc><defs><marker id="msg13a-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="240" y="22" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">Cùng input topic, theo thứ tự đến</text><rect x="30" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="75.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">A,1</text><rect x="140" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="185.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">B,2</text><rect x="250" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="295.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">A,3</text><rect x="360" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="405.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">B,4</text><path d="M240 70 V108" stroke="currentColor" stroke-opacity="0.6" fill="none" marker-end="url(#msg13a-m)"/><text x="252" y="94" font-size="13" font-weight="600" fill="currentColor">KStream: append</text><rect x="16" y="114" width="448" height="128" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/><text x="30" y="136" font-size="13" fill="currentColor" opacity="0.8">KStream: mỗi record là 1 event</text><rect x="30" y="148" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="75.0" y="170" text-anchor="middle" font-size="14" fill="currentColor">A,1</text><rect x="140" y="148" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="185.0" y="170" text-anchor="middle" font-size="14" fill="currentColor">B,2</text><rect x="250" y="148" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="295.0" y="170" text-anchor="middle" font-size="14" fill="currentColor">A,3</text><rect x="360" y="148" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="405.0" y="170" text-anchor="middle" font-size="14" fill="currentColor">B,4</text><text x="240" y="210" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">(A,1) và (A,3) là hai event khác nhau</text><text x="240" y="270" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">Giữ cả 4 record, không ghi đè</text><text x="240" y="292" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">Đếm số event của A = 2</text></svg>
<svg viewBox="0 0 480 308" role="img" aria-labelledby="msg13b-t msg13b-d" font-family="ui-sans-serif, system-ui, sans-serif" style="width:100%;max-width:480px;height:auto;display:block;margin:1.25rem auto"><title id="msg13b-t">KTable: cùng input upsert còn 2 hàng</title><desc id="msg13b-d">Input (A,1) (B,2) (A,3) (B,4). Diễn giải KTable: upsert theo key, (A,3) ghi đè (A,1), (B,4) ghi đè (B,2); bảng chỉ còn 2 hàng A → 3 và B → 4, giá trị mới nhất mỗi key.</desc><defs><marker id="msg13b-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="240" y="22" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">Cùng input topic, theo thứ tự đến</text><rect x="30" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="75.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">A,1</text><rect x="140" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="185.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">B,2</text><rect x="250" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="295.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">A,3</text><rect x="360" y="34" width="90" height="32" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="405.0" y="55" text-anchor="middle" font-size="14" fill="currentColor">B,4</text><path d="M240 70 V108" stroke="currentColor" stroke-opacity="0.6" fill="none" marker-end="url(#msg13b-m)"/><text x="252" y="94" font-size="13" font-weight="600" fill="currentColor">KTable: upsert theo key</text><rect x="16" y="114" width="448" height="128" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/><text x="30" y="136" font-size="13" fill="currentColor" opacity="0.8">KTable: trạng thái hiện tại theo key</text><rect x="30" y="148" width="90" height="34" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/><text x="75.0" y="170" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.45">A,1</text><line x1="58" y1="165" x2="92" y2="165" stroke="#f43f5e" stroke-width="2"/><rect x="140" y="148" width="90" height="34" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/><text x="185.0" y="170" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.45">B,2</text><line x1="168" y1="165" x2="202" y2="165" stroke="#f43f5e" stroke-width="2"/><rect x="250" y="148" width="90" height="34" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="295.0" y="170" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">A → 3</text><rect x="360" y="148" width="90" height="34" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="405.0" y="170" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">B → 4</text><path d="M295.0 184 Q185.0 204 75.0 186" stroke="#f43f5e" stroke-opacity="0.8" fill="none" marker-end="url(#msg13b-m)"/><path d="M405.0 184 Q295.0 222 185.0 186" stroke="#f43f5e" stroke-opacity="0.8" fill="none" marker-end="url(#msg13b-m)"/><text x="240" y="232" text-anchor="middle" font-size="13" fill="#f43f5e">ghi đè (key cũ bị thay)</text><text x="240" y="270" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">Chỉ 2 hàng, giá trị mới nhất mỗi key</text><text x="240" y="292" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">(A,1) và (B,2) đã bị ghi đè</text></svg>
<ab-note>KStream coi mỗi record là một <em>fact đã xảy ra</em>: hai record cùng key A vẫn là hai event, nên 4 record vào thì 4 record được giữ (append).</ab-note>
<ab-note>KTable coi topic là changelog: record mới cùng key ghi đè record cũ (upsert). 4 record vào nhưng chỉ có 2 key, nên bảng còn 2 hàng.</ab-note>
</ab-toggle>

### 2.3 Stream–table duality: hai mặt của một tờ giấy

Đây là ý tưởng sâu nhất: **stream và table có thể chuyển qua lại**.
- **Stream → Table**: "phát lại" (replay) một stream, upsert theo key, ta được table (đây chính là **log compaction** ở Bài 9 — Kafka giữ bản mới nhất mỗi key).
- **Table → Stream**: mỗi lần một hàng trong table **đổi giá trị**, phát ra một record thay đổi. Dòng các thay đổi đó gọi là **changelog stream**.

Nói cách khác: **một table chính là ảnh chụp (snapshot) của một changelog stream tại một thời điểm; một stream chính là đạo hàm (dòng delta) của một table theo thời gian.** Chính duality này cho phép Kafka Streams phục hồi trạng thái sau sự cố: state store local (RocksDB) có thể **dựng lại toàn bộ** bằng cách phát lại changelog topic — sẽ nói ở 2.5.

### 2.4 Stateless vs stateful

| | **Stateless** | **Stateful** |
|--|---------------|--------------|
| Cần nhớ gì? | Không — xử lý từng record độc lập | Có — phải nhớ kết quả tích luỹ giữa các record |
| Thao tác | `map`, `mapValues`, `filter`, `flatMap`, `branch`/`split`, `selectKey` | `count`, `reduce`, `aggregate`, `join`, mọi phép có `window` |
| Chi phí | Rẻ, không cần lưu trữ | Cần **state store** + changelog topic |
| Ví dụ | Lọc đơn > 1 triệu; đổi format JSON→Avro | Đếm số click mỗi user; join order với customer |

Stateless thì dễ: mỗi event vào — ra, không quan tâm quá khứ. Stateful mới là "linh hồn" của stream processing: `count` cần nhớ *đang đếm tới bao nhiêu*, `join` cần nhớ *bên kia đã thấy record nào*. Chỗ "nhớ" đó là **state store**.

### 2.5 State store: RocksDB local + changelog topic

Khi một operator stateful chạy, Kafka Streams tạo cho mỗi task một **state store** — mặc định là **RocksDB**, một key-value store nhúng, ghi xuống **đĩa local** của chính instance app (không phải RAM thuần, nên state lớn hơn RAM vẫn chạy được).

Nhưng đĩa local **không bền**: pod chết, ổ mất, rebalance sang máy khác thì state đi đâu? Lời giải là **changelog topic**: **mọi cập nhật vào state store đồng thời được ghi vào một topic Kafka nội bộ** (tên kiểu `app-id-storename-changelog`, được tạo tự động, **compacted**). Đây chính là stream–table duality áp dụng thực chiến:

- State store (table) = ảnh chụp hiện tại.
- Changelog topic (stream) = nhật ký mọi thay đổi, được Kafka replicate như mọi topic khác nên **bền**.
- Khi task chuyển sang instance mới, Streams **phát lại changelog** để **dựng lại RocksDB** y hệt trạng thái cũ. Không mất một phép đếm nào.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">State store local RocksDB được sao lưu bởi changelog topic</title>
<desc id="st-d">Operator ghi vào RocksDB local và đồng thời vào changelog topic bền trên Kafka; khi phục hồi thì phát lại changelog để dựng lại store</desc>
<rect x="30" y="90" width="110" height="46" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="85" y="110" text-anchor="middle" font-size="11" fill="currentColor">count/aggregate</text>
<text x="85" y="126" text-anchor="middle" font-size="10" fill="currentColor">(stateful op)</text>
<line x1="140" y1="105" x2="210" y2="105" stroke="currentColor" stroke-width="1.5" marker-end="url(#as)"/>
<text x="175" y="98" text-anchor="middle" font-size="9" fill="currentColor">update</text>
<rect x="212" y="84" width="120" height="58" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="272" y="106" text-anchor="middle" font-size="11" fill="currentColor">RocksDB</text>
<text x="272" y="122" text-anchor="middle" font-size="10" fill="currentColor">state store</text>
<text x="272" y="135" text-anchor="middle" font-size="9" fill="currentColor">(đĩa local)</text>
<line x1="272" y1="142" x2="272" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#as)"/>
<text x="330" y="166" text-anchor="middle" font-size="9" fill="currentColor">ghi song song</text>
<rect x="180" y="182" width="185" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="272" y="200" text-anchor="middle" font-size="11" fill="currentColor">changelog topic (compacted)</text>
<text x="272" y="214" text-anchor="middle" font-size="9" fill="currentColor">replicated → bền trên Kafka</text>
<rect x="470" y="84" width="150" height="58" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="104" text-anchor="middle" font-size="11" fill="currentColor">Instance mới</text>
<text x="545" y="120" text-anchor="middle" font-size="10" fill="currentColor">(sau khi pod chết</text>
<text x="545" y="133" text-anchor="middle" font-size="10" fill="currentColor">hoặc rebalance)</text>
<line x1="365" y1="200" x2="545" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#as)"/>
<line x1="545" y1="200" x2="545" y2="142" stroke="currentColor" stroke-width="1.5" marker-end="url(#as)"/>
<text x="455" y="192" text-anchor="middle" font-size="9" fill="currentColor">phát lại → dựng lại store</text>
<defs><marker id="as" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì changelog là compacted, dung lượng của nó xấp xỉ kích thước state (một bản mới nhất mỗi key) chứ không phình vô hạn. Có thể bật `standby replicas` để giữ sẵn bản sao state trên instance khác, rút ngắn thời gian phục hồi từ "phát lại toàn bộ changelog" xuống gần như tức thì.

### 2.6 Windowing — gom stateful theo thời gian

`count` toàn cục thì đếm mãi mãi; nhưng thực tế ta thường hỏi "bao nhiêu click **trong mỗi 1 phút**". Đó là **windowing**: chia trục thời gian thành các cửa sổ và tổng hợp trong từng cửa sổ.

| Loại window | Hình dạng | Dùng khi |
|-------------|-----------|----------|
| **Tumbling** | Cửa sổ **cố định, không chồng lấn**, kề nhau (mỗi event thuộc đúng 1 window) | Thống kê theo mốc chuẩn: click/phút, doanh thu/giờ |
| **Hopping** | Kích thước cố định nhưng **nhảy** theo bước < size ⇒ **chồng lấn** (mỗi event có thể thuộc nhiều window) | "Trung bình 5 phút, cập nhật mỗi 1 phút" |
| **Sliding** | Cửa sổ trượt định nghĩa theo *khoảng cách giữa các record*, chỉ tạo window khi có event | Join/aggregate nhạy theo độ gần thời gian, ít window rỗng |
| **Session** | Kích thước **động**: gom event thành phiên, đóng khi **im lặng > inactivity gap** | Phiên hoạt động user: gom cho tới khi user nghỉ 5 phút |

<svg viewBox="0 0 660 210" role="img" aria-labelledby="wd-t wd-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="wd-t">Tumbling vs Hopping vs Session window</title>
<desc id="wd-d">Tumbling là các cửa sổ kề nhau không chồng, hopping chồng lấn nhau, session gom theo khoảng im lặng</desc>
<text x="20" y="30" font-size="12" fill="currentColor">Tumbling (kề, không chồng)</text>
<rect x="20" y="38" width="120" height="26" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="142" y="38" width="120" height="26" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="264" y="38" width="120" height="26" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="55" text-anchor="middle" font-size="10" fill="currentColor">[0,5)</text>
<text x="202" y="55" text-anchor="middle" font-size="10" fill="currentColor">[5,10)</text>
<text x="324" y="55" text-anchor="middle" font-size="10" fill="currentColor">[10,15)</text>
<text x="20" y="96" font-size="12" fill="currentColor">Hopping (size 5, hop 2 — chồng lấn)</text>
<rect x="20" y="104" width="120" height="20" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="68" y="128" width="120" height="20" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="116" y="152" width="120" height="20" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="118" font-size="11" fill="currentColor">Một event trong vùng chồng</text>
<text x="400" y="134" font-size="11" fill="currentColor">thuộc NHIỀU window cùng lúc</text>
<text x="20" y="196" font-size="12" fill="currentColor">Session: gom tới khi im lặng > gap</text>
<rect x="270" y="182" width="70" height="18" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="360" y="182" width="40" height="18" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="440" y="182" width="90" height="18" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="305" y="195" text-anchor="middle" font-size="9" fill="currentColor">phiên 1</text>
<text x="380" y="195" text-anchor="middle" font-size="9" fill="currentColor">p2</text>
<text x="485" y="195" text-anchor="middle" font-size="9" fill="currentColor">phiên 3</text>
</svg>

### 2.7 Late event và grace period

Stream dùng **event-time** (thời điểm ghi trong record), không phải lúc nó *đến* broker. Mạng trễ, mobile offline rồi đồng bộ lại... nên một event mang timestamp `10:00:03` có thể **đến sau** event `10:00:30`. Đó là **late/out-of-order event**.

Câu hỏi: window `[10:00:00, 10:00:05)` đã "đóng sổ", giờ mới có event thuộc về nó — có tính không? **Grace period** trả lời: giữ window "mở để nhận muộn" thêm một khoảng sau khi hết giờ; event tới **trong grace** vẫn được cộng vào (và phát ra kết quả cập nhật), event tới **sau grace** bị **bỏ**. Đây là đánh đổi kinh điển: grace dài → kết quả chính xác hơn nhưng **chốt chậm hơn** và tốn state hơn; grace ngắn → chốt nhanh nhưng dễ bỏ sót event muộn.

```java
TimeWindows.ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1));
// window 5 phút, chấp nhận event tới muộn tối đa 1 phút sau khi window hết giờ
```

### 2.8 Exactly-once trong Kafka Streams

Bài trước bạn đã thấy exactly-once của Kafka dựa trên **idempotent producer** + **transaction** (ghi nhiều partition + commit offset **nguyên tử** trong một transaction). Kafka Streams **gói toàn bộ** cái đó lại sau **một dòng config**:

```properties
processing.guarantee=exactly_once_v2
```

Khi bật, mỗi vòng xử lý của Streams thực hiện **nguyên tử** ba việc trong một transaction: (1) ghi record output ra topic đích, (2) cập nhật changelog của state store, (3) commit offset input đã đọc. Hoặc **cả ba cùng thành công**, hoặc **cả ba bị huỷ** — không có chuyện "đã cộng vào count rồi nhưng offset chưa commit" khiến restart đếm hai lần. Lưu ý phạm vi: đảm bảo này áp dụng **trong biên giới Kafka** (Kafka→xử lý→Kafka). Nếu operator gọi ra hệ ngoài (ghi DB, gọi API) thì phần đó nằm ngoài transaction — cần idempotency riêng.

---

## 3. Thực hành: viết một topology

### 3.1 Word count kinh điển (stateful) bằng Kafka Streams (Java)

```java
Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "wordcount-app"); // = consumer group + prefix state/changelog
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092");
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, "exactly_once_v2");

StreamsBuilder builder = new StreamsBuilder();

// Nguồn là một KStream: mỗi record là một dòng text (một event)
KStream<String, String> lines = builder.stream("text-input");

KTable<String, Long> counts = lines
    .flatMapValues(v -> Arrays.asList(v.toLowerCase().split("\\W+"))) // stateless: tách từ
    .filter((k, word) -> !word.isBlank())                            // stateless: bỏ rỗng
    .groupBy((k, word) -> word)                                      // đổi key = từ (repartition)
    .count(Materialized.as("counts-store"));                         // STATEFUL: state store + changelog

// KTable.toStream(): table -> changelog stream để ghi ra topic
counts.toStream().to("word-counts", Produced.with(Serdes.String(), Serdes.Long()));

KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();
Runtime.getRuntime().addShutdownHook(new Thread(streams::close)); // đóng sạch, commit nốt
```

Đọc topology: `stream("text-input")` là **KStream** (append). `flatMapValues`/`filter` **stateless**. `count()` trả về **KTable** và **tự tạo** state store `counts-store` (RocksDB) + changelog topic `wordcount-app-counts-store-changelog`. `toStream().to(...)` biến table trở lại **changelog stream** để ghi ra topic đích. Chú ý `groupBy` đổi key ⇒ Streams **repartition** dữ liệu qua một topic nội bộ để mọi record cùng từ về cùng partition/task.

### 3.2 Stream–Table join: làm giàu event bằng trạng thái

Tình huống thực: `clicks` là **KStream** (event), `users` là **KTable** (hồ sơ user hiện tại). Ta muốn gắn tên nước vào mỗi click:

```java
KStream<String, Click> clicks = builder.stream("clicks");
KTable<String, User> users = builder.table("users"); // topic compacted -> table trạng thái

KStream<String, Enriched> enriched = clicks.join(
    users,
    (click, user) -> new Enriched(click, user.country()) // mỗi click tra bảng user để làm giàu
);
enriched.to("clicks-enriched");
```

Đây là **KStream–KTable join**: mỗi **event** click tra vào **trạng thái mới nhất** của user. Khác với KStream–KStream join (phải có **window** vì hai bên đều là dòng event chảy, cần giới hạn "gần nhau về thời gian mới ghép") — KStream–KTable join **không cần window** vì một bên đã là bảng tra cứu.

### 3.3 Cùng bài toán bằng ksqlDB (SQL trên stream)

Không phải ai cũng muốn viết Java. **ksqlDB** cho bạn khai báo **stream/table bằng SQL**, và bên dưới nó **biên dịch thành đúng một Kafka Streams topology** rồi chạy trên cụm ksqlDB server:

```sql
-- Khai báo STREAM (append) trên topic clicks
CREATE STREAM clicks (user_id VARCHAR, url VARCHAR)
  WITH (KAFKA_TOPIC='clicks', VALUE_FORMAT='JSON');

-- Khai báo TABLE (upsert theo key) trên topic users compacted
CREATE TABLE users (user_id VARCHAR PRIMARY KEY, country VARCHAR)
  WITH (KAFKA_TOPIC='users', VALUE_FORMAT='JSON');

-- Aggregate có window: đếm click mỗi user mỗi 1 phút
CREATE TABLE clicks_per_min AS
  SELECT user_id, COUNT(*) AS c
  FROM clicks
  WINDOW TUMBLING (SIZE 1 MINUTE, GRACE PERIOD 10 SECONDS)
  GROUP BY user_id
  EMIT CHANGES;
```

`EMIT CHANGES` chính là **table → changelog stream**: kết quả được **phát liên tục** mỗi khi có thay đổi, không phải một truy vấn chạy một lần rồi thôi. ksqlDB rất hợp cho lọc/nối/tổng hợp mức SQL, prototyping nhanh, đội không chuyên Java. Đổi lại nó **kém linh hoạt** hơn khi cần logic tuỳ biến phức tạp (khi đó viết Kafka Streams trực tiếp).

---

## 4. Khi nào cần Apache Flink?

Kafka Streams tuyệt vời khi bài toán **quanh Kafka**: nguồn và đích đều là topic, bạn muốn nhúng xử lý vào chính microservice của mình mà **không dựng cụm riêng**. Nhưng nó có giới hạn.

| Tiêu chí | **Kafka Streams / ksqlDB** | **Apache Flink** |
|----------|----------------------------|------------------|
| Hình thái triển khai | **Thư viện** nhúng vào app; scale bằng cách chạy thêm instance | **Cluster** riêng (JobManager + TaskManager) phải vận hành |
| Nguồn/đích | Chủ yếu **Kafka ↔ Kafka** | **Đa nguồn**: Kafka, Kinesis, files, JDBC, CDC, filesystem... |
| State cực lớn | Ổn với RocksDB + changelog | Mạnh hơn cho **state hàng TB**, checkpoint/savepoint tinh vi |
| Late data / event-time | Grace period, đủ dùng | **Watermark** rất mạnh, xử lý out-of-order phức tạp tốt hơn |
| Batch + Stream chung | Thiên về stream | **Thống nhất batch & stream** trong một engine |
| Vận hành | Nhẹ — không thêm hệ thống | Nặng hơn — thêm một cụm phải quản |

**Chọn Flink khi**: bạn cần trộn nhiều nguồn không chỉ Kafka; state khổng lồ với yêu cầu checkpoint/savepoint (dừng job, nâng cấp, phát lại từ điểm lưu) tinh vi; xử lý event-time/out-of-order phức tạp cần watermark linh hoạt; hoặc muốn **một engine** cho cả batch lẫn stream ở quy mô tổ chức. **Ở lại Kafka Streams khi**: dữ liệu sống trong Kafka, bạn muốn *một binary* microservice tự co giãn, không muốn gánh thêm một cụm để vận hành. Quy tắc thực dụng: **bắt đầu bằng Kafka Streams/ksqlDB; chỉ bước sang Flink khi chạm đúng một trong các giới hạn trên** — đừng dựng Flink chỉ để đếm click.

---

## 5. Tóm tắt
- **Stream processing** = xử lý **ngay trên luồng event**, kết quả luôn tươi; Kafka Streams là **thư viện** Kafka→xử lý→Kafka, không phải cụm riêng.
- **KStream** = luồng event (append, hai record cùng key là hai fact); **KTable** = bảng trạng thái (upsert theo key, `null` = tombstone). **Duality**: table là snapshot của một changelog stream; stream là dòng delta của một table.
- **Stateless** (`map`/`filter`/`branch`) không nhớ gì; **stateful** (`count`/`aggregate`/`join`) cần **state store** = **RocksDB local** + **changelog topic** (compacted, replicated) để **phục hồi** trạng thái khi rebalance/pod chết.
- **Windowing**: tumbling (kề, không chồng), hopping (chồng lấn), sliding (theo khoảng cách record), session (theo inactivity gap). **Grace period** quyết định event muộn nào còn được tính.
- **Exactly-once** bật bằng `processing.guarantee=exactly_once_v2`: ghi output + cập nhật state + commit offset **nguyên tử** trong một Kafka transaction (trong biên giới Kafka).
- **ksqlDB** = SQL trên stream, biên dịch xuống Kafka Streams; hợp prototyping & đội không Java. **Flink** cần khi: đa nguồn, state hàng TB, watermark phức tạp, hợp nhất batch+stream — nếu không, ở lại Kafka Streams cho nhẹ.

> **Bài tiếp theo (Bài 14):** so sánh và chọn nền tảng — Kafka vs RabbitMQ vs Pulsar vs cloud-managed (SQS/SNS/Kinesis) — theo throughput, ordering, retention và chi phí vận hành.
