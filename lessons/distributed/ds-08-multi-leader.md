# Bài 8 — Multi-leader & conflict resolution

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **khi nào** cần **multi-leader replication** thay vì single-leader: multi-datacenter, client offline, collaborative editing.
- Hiểu **bản chất** vì sao multi-leader **luôn** đẻ ra **write conflict** — đó không phải bug, mà là hệ quả toán học của việc cho phép ghi song song ở nhiều nơi.
- So sánh các chiến lược giải quyết xung đột: **last-write-wins** (mất dữ liệu), **version vector** (phát hiện), **merge/CRDT** (tự hoà giải) — kèm ví dụ counter và set.
- Chọn **topology** replication đúng (all-to-all, star, ring) và biết cạm bẫy của từng loại.

---

## 2. Lý thuyết

### 2.1 Ôn lại: single-leader và giới hạn của nó

Ở single-leader (bài trước), **mọi write đi qua đúng một leader**. Leader áp một **thứ tự tuyến tính** cho mọi thao tác rồi stream xuống follower. Ưu điểm: **không bao giờ có conflict** — vì chỉ một nơi quyết định thứ tự.

Nhưng single-leader có ba điểm chết:
- **Ghi phải đi tới leader**: nếu leader ở data center (DC) Mỹ, user ở Việt Nam ghi phải chịu round-trip xuyên Thái Bình Dương (~150–200ms mỗi write).
- **Leader chết là ngừng ghi** cho tới khi failover xong.
- **Client offline không ghi được**: điện thoại mất mạng thì không có leader để gửi tới.

Multi-leader sinh ra để phá đúng ba điểm này: cho phép **nhiều node đều nhận write**, mỗi leader vừa nhận write cục bộ vừa replicate (bất đồng bộ) sang các leader khác.

### 2.2 Ba tình huống điển hình cần multi-leader

| Tình huống | Mỗi "leader" là gì | Vì sao cần |
|-----------|--------------------|-----------|
| **Multi-datacenter** | Mỗi DC có 1 leader | User ghi vào DC gần → latency thấp; 1 DC chết vẫn ghi được ở DC khác |
| **Client offline** (app calendar, note) | Mỗi thiết bị là 1 leader (local DB) | Ghi được cả khi mất mạng; đồng bộ khi online lại |
| **Collaborative editing** (Google Docs, Figma) | Mỗi client soạn thảo là 1 leader | Nhiều người gõ đồng thời, ai cũng thấy phản hồi tức thì |

Điểm chung: **write phải được chấp nhận cục bộ ngay lập tức**, không chờ điều phối với nơi khác. Đó chính là cái làm conflict thành **không thể tránh**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="ml-t ml-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="ml-t">Multi-datacenter multi-leader replication</title>
<desc id="ml-d">Hai data center, mỗi cái có một leader nhận write cục bộ và replicate bất đồng bộ cho nhau</desc>
<rect x="20" y="30" width="300" height="190" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="170" y="52" text-anchor="middle" font-size="13" fill="currentColor">DC1 (Singapore)</text>
<rect x="60" y="70" width="100" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="95" text-anchor="middle" font-size="12" fill="currentColor">Leader 1</text>
<rect x="60" y="160" width="100" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="183" text-anchor="middle" font-size="11" fill="currentColor">follower</text>
<rect x="185" y="160" width="100" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="235" y="183" text-anchor="middle" font-size="11" fill="currentColor">follower</text>
<line x1="110" y1="110" x2="110" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="130" y1="110" x2="235" y2="160" stroke="currentColor" stroke-width="1.3"/>
<rect x="380" y="30" width="300" height="190" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="530" y="52" text-anchor="middle" font-size="13" fill="currentColor">DC2 (Frankfurt)</text>
<rect x="420" y="70" width="100" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="95" text-anchor="middle" font-size="12" fill="currentColor">Leader 2</text>
<rect x="420" y="160" width="100" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="183" text-anchor="middle" font-size="11" fill="currentColor">follower</text>
<rect x="545" y="160" width="100" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="595" y="183" text-anchor="middle" font-size="11" fill="currentColor">follower</text>
<line x1="470" y1="110" x2="470" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="490" y1="110" x2="595" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="160" y1="82" x2="420" y2="82" stroke="currentColor" stroke-width="2" marker-end="url(#m1)"/>
<line x1="420" y1="98" x2="160" y2="98" stroke="currentColor" stroke-width="2" marker-end="url(#m1)"/>
<text x="290" y="76" text-anchor="middle" font-size="10" fill="#f43f5e">async replication (2 chiều)</text>
<defs><marker id="m1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Vì sao write conflict là BẢN CHẤT, không phải lỗi

Analogy đời thường: hai biên tập viên cầm **hai bản in giấy** của cùng một chương sách, ngồi ở hai thành phố, cùng sửa dòng tiêu đề mà **không nói chuyện với nhau**. Người A đổi thành "Chương 8 — Multi-leader", người B đổi thành "Chương 8 — Replication đa chủ". Khi hai bản gặp nhau, **cùng một chỗ có hai giá trị khác nhau**. Không có "ai đúng" khách quan — vì hai người sửa **đồng thời**, không ai thấy sửa của người kia.

Bản chất kỹ thuật: multi-leader cho phép hai write **cùng khoá** xảy ra ở hai leader mà **không cái nào happens-before cái kia** — chúng **concurrent**. Không có thứ tự tuyến tính toàn cục để nói cái nào trước. Replication bất đồng bộ nghĩa là leader chấp nhận write cục bộ **trước** khi biết leader khác vừa làm gì. Vậy nên:

> Đã cho phép ghi song song ở nhiều nơi + replicate bất đồng bộ ⇒ **chắc chắn** có lúc hai write concurrent trên cùng dữ liệu. Conflict là **định nghĩa của mô hình**, không phải sự cố hạ tầng.

Single-leader né được conflict chỉ vì nó **hy sinh** khả năng ghi cục bộ độc lập. Multi-leader lấy lại khả năng đó, nên **phải trả giá bằng conflict resolution**. Đây là một đánh đổi, không có bữa trưa miễn phí.

---

## 3. Ba lớp chiến lược giải quyết conflict

Có ba tầng tư duy, từ thô tới tinh: **tránh né → phát hiện → tự hoà giải**.

### 3.1 Conflict avoidance (tránh, không phải giải)

Cách rẻ nhất: **định tuyến sao cho mọi write của một khoá luôn về cùng một leader**. Ví dụ: mọi thao tác của user X luôn đi DC gần X. Nếu record chỉ do một người sửa (hồ sơ cá nhân), conflict gần như biến mất.

Hạn chế: khi cần **failover** (DC của X chết, route sang DC khác) hoặc khi user di chuyển, đảm bảo "cùng leader" bị phá vỡ và conflict quay lại. Avoidance là tối ưu **thường ngày**, không phải bảo đảm.

### 3.2 Last-Write-Wins (LWW) — đơn giản nhưng MẤT DỮ LIỆU

Ý tưởng: mỗi write gắn một **timestamp**; khi hai write đụng nhau, **giữ cái timestamp lớn hơn, vứt cái kia**. Đây là mặc định của Cassandra và nhiều hệ AP.

Vấn đề chí mạng — **âm thầm mất dữ liệu (silent data loss)**:
- Hai write **concurrent** (thật sự đồng thời, không ai thấy ai) đều là ghi hợp lệ của người dùng, nhưng LWW **xoá vĩnh viễn một cái** mà không báo. Người dùng B tưởng đã lưu, thực ra bị đè.
- Timestamp dựa vào **wall clock** — mà clock giữa các node **lệch nhau** (clock skew, xem lại bài fallacies). Node có clock chạy nhanh sẽ luôn "thắng", kể cả khi write của nó thật sự cũ hơn về mặt nhân quả.

<svg viewBox="0 0 680 210" role="img" aria-labelledby="lww-t lww-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="lww-t">Last-Write-Wins làm mất write concurrent</title>
<desc id="lww-d">Hai write đồng thời trên cùng khoá, LWW giữ timestamp lớn hơn và vứt bỏ write còn lại</desc>
<rect x="20" y="40" width="180" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="60" text-anchor="middle" font-size="12" fill="currentColor">Write A: x="cat"</text>
<text x="110" y="77" text-anchor="middle" font-size="11" fill="currentColor">ts=10:00.500</text>
<rect x="20" y="128" width="180" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="148" text-anchor="middle" font-size="12" fill="currentColor">Write B: x="dog"</text>
<text x="110" y="165" text-anchor="middle" font-size="11" fill="currentColor">ts=10:00.512</text>
<line x1="200" y1="63" x2="340" y2="95" stroke="currentColor" stroke-width="1.4" marker-end="url(#l1)"/>
<line x1="200" y1="151" x2="340" y2="115" stroke="currentColor" stroke-width="1.4" marker-end="url(#l1)"/>
<rect x="345" y="82" width="150" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="420" y="102" text-anchor="middle" font-size="11" fill="currentColor">so sánh timestamp</text>
<text x="420" y="119" text-anchor="middle" font-size="11" fill="currentColor">.512 &gt; .500</text>
<line x1="495" y1="105" x2="560" y2="105" stroke="currentColor" stroke-width="1.4" marker-end="url(#l1)"/>
<rect x="565" y="82" width="100" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="615" y="102" text-anchor="middle" font-size="12" fill="currentColor">x="dog"</text>
<text x="615" y="119" text-anchor="middle" font-size="10" fill="#f43f5e">"cat" mất</text>
<defs><marker id="l1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

> **Khi nào LWW chấp nhận được?** Khi mất một trong hai write concurrent **không hại** — ví dụ cache, dữ liệu ghi-đè-được kiểu "trạng thái hiện tại của cảm biến", hoặc khi ứng dụng bảo đảm mỗi khoá chỉ một writer. Với dữ liệu người dùng quý (giỏ hàng, tài liệu) thì **không dùng LWW**.

### 3.3 Version vector — PHÁT HIỆN conflict thay vì giấu nó

Vấn đề của LWW là dùng timestamp vật lý để giả vờ có thứ tự. Cách đúng: dùng **thông tin nhân quả** để biết hai write là **concurrent** hay một cái **kế thừa** cái kia.

**Version vector** (họ hàng với vector clock, bài 6) gán cho mỗi khoá một map `{replica_id → counter}`. Mỗi lần một replica ghi, nó tăng counter của chính nó. Khi client đọc, server trả về version hiện tại; khi client ghi lại, nó **kèm version đã đọc** — server dùng đó để biết write mới **dựa trên** phiên bản nào.

Quy tắc so sánh hai version vector V1, V2:
- V1 **≤** V2 ở mọi thành phần → V1 là **tổ tiên**, V2 mới hơn, ghi đè an toàn.
- Không cái nào ≤ cái kia (mỗi cái lớn hơn ở một thành phần) → **concurrent** → **conflict thật sự**, phải giữ **cả hai** dưới dạng **siblings**.

Điểm mấu chốt: version vector **không tự giải** conflict — nó **phát hiện chính xác** và **không mất dữ liệu**. Nó đẩy quyết định hoà giải lên tầng ứng dụng (hoặc CRDT). Đây là cách DynamoDB/Riak làm: trả về nhiều siblings để app merge (ví dụ giỏ hàng: **hợp nhất** hai giỏ, thà thừa món còn hơn mất món).

| Chiến lược | Mất dữ liệu? | Phát hiện concurrent? | Ai hoà giải |
|-----------|-------------|----------------------|-------------|
| **LWW** | Có (âm thầm) | Không | Không ai — vứt bớt |
| **Version vector** | Không | Có, chính xác | Ứng dụng (giữ siblings) |
| **CRDT** | Không | Không cần | Tự động, theo cấu trúc dữ liệu |

### 3.4 CRDT & merge — TỰ hoà giải, không cần điều phối

**CRDT** (Conflict-free Replicated Data Type) là các kiểu dữ liệu được **thiết kế toán học** sao cho **mọi thứ tự merge đều cho cùng kết quả**. Hàm merge phải **giao hoán, kết hợp, và idempotent** (commutative, associative, idempotent). Nhờ đó các replica hội tụ (converge) về cùng một trạng thái **mà không cần đồng thuận**, bất kể message tới theo thứ tự nào hay lặp lại.

**Ví dụ 1 — Grow-only Counter (G-Counter).** Đếm like/view khi nhiều DC cùng tăng. Nếu chỉ giữ một số nguyên rồi merge bằng "lấy max", ta sẽ **mất lượt tăng**. Cách CRDT: mỗi replica giữ **một ô riêng**, chỉ tăng ô của mình; giá trị thật = **tổng các ô**; merge = **lấy max từng ô**.

```text
# 3 replica A, B, C — mỗi cái một ô đếm riêng
A: {A:5, B:0, C:0}     B: {A:0, B:3, C:0}     C: {A:0, B:0, C:2}

# merge (per-element max) khi 3 replica gặp nhau:
merge = {A:max(5,0,0), B:max(0,3,0), C:max(0,0,2)} = {A:5, B:3, C:2}
value = 5 + 3 + 2 = 10   # đúng tổng, không mất lượt nào, không cần khoá
```
Vì merge dùng max từng ô, gửi lặp cùng một state cũng không cộng dồn sai (idempotent). Muốn **giảm được** (like rồi unlike) thì dùng **PN-Counter** = hai G-Counter, một cho tăng `P`, một cho giảm `N`; value = ΣP − ΣN.

**Ví dụ 2 — Set (thêm/xoá phần tử).** Bài toán khó: nếu A thêm phần tử `x` trong khi B xoá `x` **đồng thời**, kết quả nên là gì? Một CRDT phổ biến là **OR-Set** (Observed-Remove Set): mỗi lần thêm gắn một **tag duy nhất**; xoá chỉ loại các tag **đã quan sát được**. Nếu add và remove concurrent, tag của add mới **chưa bị remove nhìn thấy** → phần tử **vẫn còn** (thiên về "add thắng"). Nhờ vậy merge xác định và không phụ thuộc thứ tự.

```text
A: add(x) tạo tag x#a1  ->  set = { x: {a1} }
B: (chưa thấy a1) remove(x) chỉ xoá tag nó biết -> set = { }
# merge: x có tag a1 chưa bị ai xoá  ->  x còn trong set
```

**Ứng dụng thực tế:** collaborative editing (văn bản là **sequence CRDT** như RGA/Yjs/Automerge), Redis CRDT (Active-Active), Riak, cursor/presence trong Figma. CRDT trả giá bằng **metadata** (tag, tombstone, per-replica counter) phình theo lịch sử — nên có các biến thể nén/dọn tombstone.

---

## 4. Topology replication

Khi có N leader, cần quyết **ai gửi write log cho ai**. Ba dạng phổ biến:

<svg viewBox="0 0 700 230" role="img" aria-labelledby="tp-t tp-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="tp-t">Ba topology replication: all-to-all, star, ring</title>
<desc id="tp-d">So sánh cách các leader kết nối và truyền write cho nhau trong ba kiểu topology</desc>
<text x="115" y="24" text-anchor="middle" font-size="13" fill="currentColor">All-to-all</text>
<circle cx="60" cy="70" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="170" cy="70" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="60" cy="170" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="170" cy="170" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="78" y1="70" x2="152" y2="70" stroke="currentColor"/>
<line x1="60" y1="88" x2="60" y2="152" stroke="currentColor"/>
<line x1="170" y1="88" x2="170" y2="152" stroke="currentColor"/>
<line x1="78" y1="170" x2="152" y2="170" stroke="currentColor"/>
<line x1="76" y1="84" x2="154" y2="156" stroke="currentColor"/>
<line x1="154" y1="84" x2="76" y2="156" stroke="currentColor"/>
<text x="355" y="24" text-anchor="middle" font-size="13" fill="currentColor">Star</text>
<circle cx="355" cy="120" r="18" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="124" text-anchor="middle" font-size="10" fill="currentColor">hub</text>
<circle cx="290" cy="55" r="16" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="420" cy="55" r="16" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="290" cy="185" r="16" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="420" cy="185" r="16" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="340" y1="108" x2="302" y2="67" stroke="currentColor"/>
<line x1="370" y1="108" x2="408" y2="67" stroke="currentColor"/>
<line x1="340" y1="132" x2="302" y2="173" stroke="currentColor"/>
<line x1="370" y1="132" x2="408" y2="173" stroke="currentColor"/>
<text x="600" y="24" text-anchor="middle" font-size="13" fill="currentColor">Ring</text>
<circle cx="600" cy="60" r="16" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="660" cy="120" r="16" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="600" cy="180" r="16" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<circle cx="540" cy="120" r="16" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<line x1="612" y1="71" x2="649" y2="109" stroke="currentColor" marker-end="url(#t1)"/>
<line x1="654" y1="134" x2="611" y2="170" stroke="currentColor" marker-end="url(#t1)"/>
<line x1="588" y1="170" x2="551" y2="133" stroke="currentColor" marker-end="url(#t1)"/>
<line x1="546" y1="108" x2="589" y2="72" stroke="currentColor" marker-end="url(#t1)"/>
<defs><marker id="t1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

| Topology | Cách hoạt động | Ưu | Nhược |
|----------|----------------|-----|-------|
| **All-to-all** | Mọi leader gửi write của nó cho **tất cả** leader khác | Không single point of failure; đường ngắn nhất, chịu lỗi tốt | Message có thể **tới sai thứ tự** (đường A→C nhanh hơn A→B→C) → cần causal ordering (version vector) |
| **Star** | Một **hub** trung tâm nhận và phát lại cho các node lá | Đơn giản, dễ kiểm soát | **Hub chết là đứt** toàn bộ; hub là nút cổ chai |
| **Ring** | Mỗi node chuyển tiếp write cho node kế bên theo vòng | Băng thông đều, cấu hình gọn | **Một node chết là đứt vòng**; write phải đi qua nhiều chặng → trễ; dễ **lặp vô hạn** nếu không gắn ID để chặn |

Cạm bẫy kinh điển của **all-to-all**: vì async, một write và bản "cập nhật dựa trên nó" có thể tới node đích **sai thứ tự nhân quả** (write "tạo row" tới sau write "sửa row" đó). Đây đúng là lý do multi-leader thực tế **phải** đi kèm cơ chế **causal ordering** (version vector / dependency tracking), không thể chỉ dựa timestamp.

Với **star** và **ring**, phải gắn **định danh node vào mỗi write** để một node nhận lại chính write của mình thì **bỏ qua**, tránh vòng lặp replication vô hạn.

---

## 5. Ví dụ thực tế & con số

**Calendar app đa thiết bị (client offline).** Bạn sửa cuộc họp trên điện thoại (đang trên máy bay, offline) đổi giờ sang 15:00; đồng thời trợ lý sửa trên laptop đổi sang 16:00. Cả hai là "leader" cục bộ, đều lưu thành công. Khi điện thoại online:
- **LWW**: một trong hai giờ **biến mất** không dấu vết — người kia tưởng đã đổi mà không hiểu vì sao mất.
- **Version vector**: hệ phát hiện concurrent, hiện **cả hai** ("có 2 phiên bản, chọn cái nào?") — người dùng quyết định, **không mất dữ liệu**.

**Multi-DC thương mại điện tử.** Amazon Dynamo (bài báo 2007) chọn **không dùng LWW cho giỏ hàng**: khi có siblings, app **merge = hợp** hai giỏ. Hệ quả có thật: một món đã xoá đôi khi **hiện lại** trong giỏ. Họ chấp nhận vì với kinh doanh, **"thêm nhầm một món" rẻ hơn "mất một món khách định mua"**. Đây là bài học kinh điển: chiến lược conflict phải khớp **ngữ nghĩa nghiệp vụ**, không phải chọn cái tiện kỹ thuật.

**Con số cần nhớ:** replication multi-DC async thường có **replication lag** từ vài chục ms tới vài giây tuỳ khoảng cách và tải; trong cửa sổ đó mọi write cùng khoá ở hai DC đều là ứng viên conflict. Cửa sổ càng dài (lag cao, mạng liên lục địa), xác suất conflict càng lớn — nên thiết kế **phải** giả định conflict xảy ra thường xuyên, không phải hiếm.

---

## 6. Tóm tắt
- **Multi-leader** cho phép nhiều node cùng nhận write, dùng khi cần **multi-DC** (latency + chịu lỗi), **client offline**, hoặc **collaborative editing** — nơi write phải được chấp nhận cục bộ ngay.
- **Write conflict là bản chất** của mô hình: ghi song song + replicate async ⇒ tất yếu có write **concurrent** không cái nào happens-before cái kia. Đó không phải bug.
- **LWW**: đơn giản, nhưng **âm thầm mất dữ liệu** và lệ thuộc clock skew — chỉ dùng khi mất write không hại.
- **Version vector**: **phát hiện** concurrent chính xác, **không mất dữ liệu**, đẩy hoà giải lên ứng dụng (giữ siblings — như giỏ hàng Dynamo).
- **CRDT/merge**: kiểu dữ liệu **tự hội tụ** (merge giao hoán/kết hợp/idempotent), không cần đồng thuận — G/PN-Counter cho đếm, OR-Set cho tập hợp, sequence CRDT cho soạn thảo.
- **Topology**: all-to-all (khoẻ nhưng cần causal ordering), star (hub là điểm chết), ring (đứt vòng, cần chặn loop). Multi-leader thực tế **luôn** phải kèm cơ chế theo dõi nhân quả.

> **Bài tiếp theo (Bài 9):** đi vào **leaderless replication** (Dynamo-style) — quorum đọc/ghi (R + W > N), read repair và anti-entropy, khi không còn khái niệm "leader" nào cả.
