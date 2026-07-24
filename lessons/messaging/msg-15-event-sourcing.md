# Bài 15 — Event Sourcing: sự thật là chuỗi sự kiện

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **bản chất** Event Sourcing: nguồn sự thật là **chuỗi event bất biến append-only**, không phải state hiện tại.
- Hiểu **current state = fold/replay** các event, và vì sao cần **snapshot** để không replay từ đầu.
- Kể tên **lợi ích** (audit log đầy đủ, time-travel/debug, nhiều read model, hợp với messaging) và **cái giá** (schema evolution, replay cost, eventual consistency, khó query ad-hoc).
- Cài đặt một aggregate tài khoản ngân hàng (`Deposited`/`Withdrawn`) tính balance bằng fold + snapshot.
- Chọn được **event store**: EventStoreDB (chuyên dụng) hay Kafka compacted topic, và biết khi nào KHÔNG nên dùng Event Sourcing.

---

## 2. Lý thuyết

### 2.1 Analogy: sao kê ngân hàng, không phải mảnh giấy ghi số dư

Hãy tưởng tượng bạn hỏi ngân hàng "tài khoản tôi còn bao nhiêu tiền?". Ngân hàng **không** giữ một mảnh giấy duy nhất ghi `balance = 4.200.000đ` rồi tẩy xoá mỗi lần giao dịch. Họ giữ **sổ cái (ledger)**: một chuỗi bút toán *chỉ ghi thêm* — nạp 5tr, rút 800k, nạp 300k... Số dư chỉ là **kết quả cộng dồn** của toàn bộ bút toán. Cuốn sổ đó **bất biến**: bút toán sai không bị xoá, người ta ghi thêm một bút toán *đảo (reversal)* để sửa.

Đó chính là Event Sourcing. Thay vì lưu **state hiện tại** (và ghi đè nó mỗi lần đổi), ta lưu **mọi thay đổi đã xảy ra** dưới dạng event, theo đúng thứ tự. State hiện tại được **suy ra** từ chuỗi event bất cứ lúc nào.

### 2.2 CRUD truyền thống đánh mất lịch sử

Cách quen thuộc (state-oriented) lưu một hàng và **UPDATE ghi đè**:

```sql
-- Trước:   balance = 5000000
UPDATE accounts SET balance = 4200000 WHERE id = 'acc-1';
-- Sau:     balance = 4200000  (5.000.000 biến mất vĩnh viễn)
```

Sau lệnh này, thông tin "trước đó là 5tr", "vì sao giảm 800k", "ai làm, lúc nào" **đã mất**. Bạn chỉ còn *ảnh chụp hiện tại*. Muốn audit, muốn biết lịch sử, bạn phải tự bịa thêm bảng log — mà bảng log đó dễ lệch với state thật (hai nguồn sự thật).

Event Sourcing lật ngược: **event là nguồn sự thật duy nhất**, state chỉ là *view dẫn xuất*.

```text
State-oriented (CRUD):   lưu STATE, mất lịch sử khi ghi đè
Event-sourced:           lưu EVENTS (append-only), state = fold(events)
```

<svg viewBox="0 0 680 250" role="img" aria-labelledby="es-t es-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="es-t">CRUD ghi đè state vs Event Sourcing append event rồi fold</title>
<desc id="es-d">Bên trái mỗi thay đổi ghi đè ô balance làm mất giá trị cũ; bên phải mỗi thay đổi là một event append vào log và balance được tính bằng fold</desc>
<text x="150" y="20" text-anchor="middle" font-size="13" fill="currentColor">CRUD: UPDATE ghi đè</text>
<rect x="70" y="40" width="160" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="61" text-anchor="middle" font-size="11" fill="currentColor">balance = 5.000.000</text>
<line x1="150" y1="74" x2="150" y2="100" stroke="currentColor" stroke-width="1" marker-end="url(#ea)"/>
<text x="205" y="92" text-anchor="middle" font-size="9" fill="currentColor">rút 800k</text>
<rect x="70" y="103" width="160" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="124" text-anchor="middle" font-size="11" fill="currentColor">balance = 4.200.000</text>
<line x1="150" y1="137" x2="150" y2="163" stroke="currentColor" stroke-width="1" marker-end="url(#ea)"/>
<text x="205" y="155" text-anchor="middle" font-size="9" fill="currentColor">nạp 300k</text>
<rect x="70" y="166" width="160" height="34" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="187" text-anchor="middle" font-size="11" fill="currentColor">balance = 4.500.000</text>
<text x="150" y="224" text-anchor="middle" font-size="10" fill="currentColor">5tr và 4.2tr đã mất — chỉ còn ảnh chụp</text>
<text x="520" y="20" text-anchor="middle" font-size="13" fill="currentColor">Event Sourcing: append-only</text>
<rect x="400" y="40" width="240" height="28" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="58" text-anchor="middle" font-size="10" fill="currentColor">#1 Deposited 5.000.000</text>
<rect x="400" y="72" width="240" height="28" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="90" text-anchor="middle" font-size="10" fill="currentColor">#2 Withdrawn 800.000</text>
<rect x="400" y="104" width="240" height="28" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="122" text-anchor="middle" font-size="10" fill="currentColor">#3 Deposited 300.000</text>
<line x1="520" y1="132" x2="520" y2="158" stroke="currentColor" stroke-width="1" marker-end="url(#ea)"/>
<text x="590" y="150" text-anchor="middle" font-size="9" fill="currentColor">fold</text>
<rect x="400" y="161" width="240" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="182" text-anchor="middle" font-size="11" fill="currentColor">balance = 4.500.000 (dẫn xuất)</text>
<text x="520" y="224" text-anchor="middle" font-size="10" fill="currentColor">Toàn bộ lịch sử còn nguyên, tái tạo được</text>
<defs><marker id="ea" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Event là quá khứ, bất biến, và có nghĩa nghiệp vụ

Ba tính chất bắt buộc của một event trong Event Sourcing:

1. **Đã xảy ra (past tense)**: tên event ở thì quá khứ — `AccountOpened`, `MoneyDeposited`, `MoneyWithdrawn`, `AccountFrozen`. Nó *ghi lại sự thật đã diễn ra*, không phải một yêu cầu. Đây là chỗ khác **command** (`Withdraw` — một *ý định* có thể bị từ chối). Command → (validate) → sinh ra Event.
2. **Bất biến (immutable)**: một khi đã ghi, event **không sửa, không xoá**. Muốn "sửa" thì append một event mới (ví dụ `TransactionReversed`). Đây là điều làm nên audit log đáng tin.
3. **Mang ngữ nghĩa nghiệp vụ**: event mô tả *cái gì đã xảy ra theo nghĩa business*, không phải diff kỹ thuật của hàng DB. `MoneyWithdrawn{amount, reason}` giàu ý nghĩa hơn `balance changed from X to Y`.

### 2.4 Current state = fold (left fold) các event

Toán học của Event Sourcing chính là phép **fold** (còn gọi *reduce/aggregate*): bắt đầu từ state rỗng, **áp dụng lần lượt** từng event để cho ra state mới.

```text
state = fold(apply, INITIAL_STATE, [event₁, event₂, ..., eventₙ])

apply(state, MoneyDeposited{a})  =  state với balance += a
apply(state, MoneyWithdrawn{a})  =  state với balance -= a
```

Hàm `apply` phải **thuần (pure)** và **deterministic**: cùng một chuỗi event luôn cho ra cùng một state. Đây là chìa khoá cho **replay** và **time-travel**: muốn biết state tại thời điểm event thứ k, chỉ cần fold k event đầu tiên.

> **Aggregate**: đơn vị nhất quán trong Event Sourcing (thường theo DDD). Mỗi aggregate (ví dụ một `Account` với `accountId`) có một **stream event riêng**. State của aggregate = fold stream của chính nó. Ranh giới aggregate cũng là ranh giới **transaction/consistency**.

### 2.5 Snapshot: đừng replay từ Big Bang

Vấn đề hiển nhiên: một tài khoản hoạt động 10 năm có thể có **hàng trăm nghìn event**. Fold lại từ đầu mỗi lần load là lãng phí. Giải pháp: **snapshot** — chụp lại state đã fold tới một version nhất định, lưu riêng.

```text
Không snapshot:  fold 200.000 event  →  chậm
Có snapshot:     load snapshot@v199000  →  fold chỉ 1.000 event còn lại
```

Nguyên tắc vàng: **snapshot chỉ là tối ưu, không phải nguồn sự thật**. Event log vẫn là chân lý; xoá sạch mọi snapshot thì hệ thống vẫn tái tạo được state đầy đủ (chỉ chậm hơn). Vì thế snapshot có thể sai/hỏng mà không nguy hiểm — cứ vứt đi và fold lại.

<svg viewBox="0 0 660 170" role="img" aria-labelledby="sn-t sn-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="sn-t">Snapshot rồi chỉ fold các event sau snapshot</title>
<desc id="sn-d">Một snapshot ở version 199000 được load trực tiếp, chỉ các event từ 199001 tới 200000 cần fold thêm</desc>
<rect x="30" y="60" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="80" text-anchor="middle" font-size="11" fill="currentColor">Snapshot</text>
<text x="90" y="96" text-anchor="middle" font-size="9" fill="currentColor">state @ v199000</text>
<line x1="150" y1="83" x2="195" y2="83" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="198" y="64" width="70" height="38" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="233" y="87" text-anchor="middle" font-size="9" fill="currentColor">ev 199001</text>
<rect x="274" y="64" width="70" height="38" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="309" y="87" text-anchor="middle" font-size="9" fill="currentColor">ev 199002</text>
<text x="372" y="87" text-anchor="middle" font-size="14" fill="currentColor">...</text>
<rect x="392" y="64" width="70" height="38" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="427" y="87" text-anchor="middle" font-size="9" fill="currentColor">ev 200000</text>
<line x1="462" y1="83" x2="507" y2="83" stroke="currentColor" stroke-width="1.5" marker-end="url(#sa)"/>
<rect x="510" y="60" width="120" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="80" text-anchor="middle" font-size="11" fill="currentColor">current state</text>
<text x="570" y="96" text-anchor="middle" font-size="9" fill="currentColor">@ v200000</text>
<text x="330" y="35" text-anchor="middle" font-size="12" fill="currentColor">Chỉ fold ~1.000 event sau snapshot, không phải 200.000</text>
<text x="330" y="140" text-anchor="middle" font-size="10" fill="currentColor">Snapshot là cache tái tạo được — event log vẫn là nguồn sự thật</text>
<defs><marker id="sa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 3. Cài đặt: aggregate tài khoản ngân hàng

Đây là một cài đặt tối giản nhưng đầy đủ khái niệm bằng TypeScript: định nghĩa event, hàm `apply` (fold), lệnh (command) sinh event kèm **validate invariant**, snapshot, và load.

```typescript
// ---- 1. Định nghĩa Event (thì quá khứ, bất biến) ----
type AccountEvent =
  | { type: 'AccountOpened';  accountId: string; owner: string;  at: string }
  | { type: 'MoneyDeposited'; accountId: string; amount: number; at: string }
  | { type: 'MoneyWithdrawn'; accountId: string; amount: number; at: string }
  | { type: 'AccountFrozen';  accountId: string; reason: string; at: string };

// ---- 2. State dẫn xuất ----
interface AccountState {
  accountId: string;
  owner: string;
  balance: number;   // đơn vị: đồng
  frozen: boolean;
  version: number;   // số event đã fold — dùng cho optimistic concurrency
}

const EMPTY: AccountState = {
  accountId: '', owner: '', balance: 0, frozen: false, version: 0,
};

// ---- 3. apply: hàm THUẦN, deterministic — trái tim của fold ----
function apply(state: AccountState, e: AccountEvent): AccountState {
  switch (e.type) {
    case 'AccountOpened':
      return { ...state, accountId: e.accountId, owner: e.owner,
               balance: 0, frozen: false, version: state.version + 1 };
    case 'MoneyDeposited':
      return { ...state, balance: state.balance + e.amount, version: state.version + 1 };
    case 'MoneyWithdrawn':
      return { ...state, balance: state.balance - e.amount, version: state.version + 1 };
    case 'AccountFrozen':
      return { ...state, frozen: true, version: state.version + 1 };
  }
}

// current state = fold toàn bộ stream (hoặc từ snapshot)
function fold(events: AccountEvent[], from: AccountState = EMPTY): AccountState {
  return events.reduce(apply, from);
}
```

Chú ý: `apply` **không validate gì cả**, không throw — nó chỉ "áp dụng sự thật đã xảy ra". Event trong log *đã* là sự thật, replay không được phép từ chối chúng. Việc validate nằm ở **command handler**:

```typescript
// ---- 4. Command handler: validate invariant RỒI sinh event ----
// Command = ý định, có thể bị từ chối. Nếu hợp lệ -> trả về event(s).
function withdraw(state: AccountState, amount: number, at: string): AccountEvent[] {
  if (state.frozen)            throw new Error('Account frozen');
  if (amount <= 0)             throw new Error('Amount must be positive');
  if (amount > state.balance)  throw new Error('Insufficient funds'); // invariant!
  return [{ type: 'MoneyWithdrawn', accountId: state.accountId, amount, at }];
}
```

Vòng đời một thao tác: **load** (fold event/snapshot ra state) → **decide** (command handler validate trên state, sinh event mới) → **append** (ghi event vào store, atomic) → event mới cập nhật read model.

```typescript
// ---- 5. Snapshot: cắt ngắn replay ----
interface Snapshot { state: AccountState; version: number }

const SNAPSHOT_EVERY = 100; // chụp mỗi 100 event

function loadAccount(
  streamEvents: AccountEvent[],   // toàn bộ event của aggregate này
  snapshot?: Snapshot,
): AccountState {
  if (snapshot) {
    // chỉ fold các event SAU version của snapshot
    const tail = streamEvents.slice(snapshot.version);
    return fold(tail, snapshot.state);
  }
  return fold(streamEvents);
}

function maybeSnapshot(state: AccountState): Snapshot | null {
  return state.version % SNAPSHOT_EVERY === 0 ? { state, version: state.version } : null;
}
```

Chạy thử chuỗi event và thấy balance là **kết quả fold**, không phải giá trị được lưu:

```typescript
const stream: AccountEvent[] = [
  { type: 'AccountOpened',  accountId: 'acc-1', owner: 'Lan',    at: '2026-01-02T09:00:00Z' },
  { type: 'MoneyDeposited', accountId: 'acc-1', amount: 5_000_000, at: '2026-01-02T09:01:00Z' },
  { type: 'MoneyWithdrawn', accountId: 'acc-1', amount:   800_000, at: '2026-03-10T14:00:00Z' },
  { type: 'MoneyDeposited', accountId: 'acc-1', amount:   300_000, at: '2026-05-01T08:00:00Z' },
];

const now = fold(stream);
console.log(now.balance); // 4_500_000  ← dẫn xuất, không lưu đâu cả

// TIME-TRAVEL: balance sau 2 event đầu ("hồi tháng 1 còn bao nhiêu?")
const inJan = fold(stream.slice(0, 2));
console.log(inJan.balance); // 5_000_000
```

Đúng một dòng `stream.slice(0, k)` cho ta **time-travel** — một khả năng CRUD ghi đè không bao giờ có được.

---

## 4. Vì sao Event Sourcing hợp tự nhiên với messaging

Event Sourcing và event streaming là **hai mặt của cùng một đồng xu**: cái ta *lưu* (event) đúng bằng cái ta *phát đi*.

- **Nguồn sự thật chính là stream để publish**: mỗi event ghi vào store cũng là một event có thể phát cho các consumer. Không cần "dịch" từ bảng state sang message — tránh được vấn đề dual-write (ghi DB xong quên gửi message).
- **Read model = một consumer**: mỗi khi có event mới, các projection (view đọc) tự cập nhật. Đây là nền của **CQRS** (Bài kế): tách đường ghi (append event) khỏi đường đọc (projection tối ưu cho query).
- **Nhiều read model từ một stream**: cùng chuỗi event `MoneyDeposited/Withdrawn` có thể fold thành *nhiều* view khác nhau — bảng balance để tra cứu nhanh, bảng thống kê chi tiêu theo tháng, chỉ mục Elasticsearch để tìm kiếm, cảnh báo gian lận... Mỗi view là một fold khác nhau của **cùng một sự thật**.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="rm-t rm-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rm-t">Một event stream fold thành nhiều read model độc lập</title>
<desc id="rm-d">Event store phát event cho ba projection khác nhau tạo balance view, báo cáo chi tiêu và chỉ mục tìm kiếm</desc>
<rect x="30" y="90" width="130" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="114" text-anchor="middle" font-size="11" fill="currentColor">Event Store</text>
<text x="95" y="132" text-anchor="middle" font-size="9" fill="currentColor">(nguồn sự thật)</text>
<line x1="160" y1="105" x2="230" y2="55" stroke="currentColor" stroke-width="1.2" marker-end="url(#ra)"/>
<line x1="160" y1="120" x2="230" y2="120" stroke="currentColor" stroke-width="1.2" marker-end="url(#ra)"/>
<line x1="160" y1="135" x2="230" y2="185" stroke="currentColor" stroke-width="1.2" marker-end="url(#ra)"/>
<rect x="233" y="34" width="180" height="42" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="323" y="52" text-anchor="middle" font-size="10" fill="currentColor">Projection: Balance view</text>
<text x="323" y="68" text-anchor="middle" font-size="9" fill="currentColor">(tra cứu số dư nhanh)</text>
<rect x="233" y="99" width="180" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="323" y="117" text-anchor="middle" font-size="10" fill="currentColor">Projection: Chi tiêu/tháng</text>
<text x="323" y="133" text-anchor="middle" font-size="9" fill="currentColor">(báo cáo analytics)</text>
<rect x="233" y="164" width="180" height="42" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="323" y="182" text-anchor="middle" font-size="10" fill="currentColor">Projection: Search index</text>
<text x="323" y="198" text-anchor="middle" font-size="9" fill="currentColor">(Elasticsearch)</text>
<text x="500" y="115" text-anchor="middle" font-size="10" fill="currentColor">Mỗi view là một</text>
<text x="500" y="131" text-anchor="middle" font-size="10" fill="currentColor">fold khác nhau của</text>
<text x="500" y="147" text-anchor="middle" font-size="10" fill="currentColor">CÙNG một stream</text>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 5. Cái giá — Event Sourcing không miễn phí

| Thách thức | Bản chất & cách giảm đau |
|-----------|--------------------------|
| **Schema evolution** | Event đã ghi là bất biến, nhưng code đổi theo thời gian. Không được sửa event cũ → phải **versioning** (`MoneyDeposited_v2`) + **upcasting** (hàm nâng event cũ lên định dạng mới lúc đọc). Đây là thách thức lớn nhất, phải thiết kế ngay từ đầu. |
| **Replay cost** | Aggregate dài → fold chậm; rebuild toàn bộ projection từ đầu có thể mất hàng giờ. Giảm bằng **snapshot** cho aggregate, và projection có thể rebuild song song/incremental. |
| **Eventual consistency** | Read model cập nhật *sau* khi event được ghi → đọc ngay sau ghi có thể thấy dữ liệu cũ. Ứng dụng phải chấp nhận (hoặc đọc lại từ aggregate cho tác vụ cần chính xác tức thì). |
| **Query ad-hoc khó** | Không thể "SELECT WHERE balance > X" trực tiếp trên event log — log không phải bảng để query. Phải dựng **projection** đúng cho từng nhu cầu query trước. Câu hỏi mới = projection mới. |
| **Xoá dữ liệu / GDPR** | Bất biến đụng "quyền được lãng quên". Giải pháp: **crypto-shredding** (mã hoá dữ liệu cá nhân bằng key riêng, xoá key = xoá dữ liệu về mặt hiệu lực) thay vì xoá event. |

> **Quy tắc dùng đúng chỗ:** Event Sourcing toả sáng khi **lịch sử/audit là yêu cầu nghiệp vụ** (tài chính, kế toán, y tế, đơn hàng, kho vận), khi cần **nhiều read model**, hoặc **temporal query** ("trạng thái lúc đó ra sao"). Với CRUD đơn giản (một form admin, một catalog ít đổi), Event Sourcing là **over-engineering** — độ phức tạp không đáng.

---

## 6. Event store: lưu chuỗi event ở đâu?

Event store cần: (1) **append-only** với **thứ tự trong một stream**, (2) đọc được **theo stream** để fold, (3) **optimistic concurrency** (từ chối append nếu version không khớp — chống race), (4) **subscribe** để đẩy event cho projection.

| | **EventStoreDB** (chuyên dụng) | **Kafka** (log/compacted topic) |
|--|-------------------------------|--------------------------------|
| Mô hình | Stream-per-aggregate, gốc rễ cho Event Sourcing | Topic + partition; log bất biến, có compaction |
| Đọc theo aggregate | Native: đọc đúng stream `account-acc1` | Phải cùng key vào một partition; đọc cả partition rồi lọc |
| Optimistic concurrency | Có sẵn (`expectedVersion`) | Không có sẵn cho từng aggregate — phải tự lo |
| Subscribe/projection | Built-in catch-up & persistent subscriptions | Consumer group, là thế mạnh của Kafka |
| Giữ vô hạn | Đúng thiết kế | Cần cấu hình retention/compaction cẩn thận |
| Khi nào chọn | Cần đúng semantics Event Sourcing, nhiều aggregate nhỏ | Đã có Kafka, cần fan-out mạnh cho nhiều consumer |

**EventStoreDB** — append với `expectedVersion` để bảo vệ invariant (chống hai lệnh rút cùng lúc):

```bash
# Append event vào stream của một aggregate (HTTP API).
# ES-ExpectedVersion: 2  -> chỉ ghi nếu stream hiện có đúng 3 event (v0,v1,v2);
#                          nếu ai đó chen event trước, ghi này bị từ chối (409) -> retry.
curl -i -X POST http://localhost:2113/streams/account-acc1 \
  -H 'Content-Type: application/vnd.eventstore.events+json' \
  -H 'ES-ExpectedVersion: 2' \
  -d '[{
        "eventId": "b3f1...-uuid",
        "eventType": "MoneyWithdrawn",
        "data": { "accountId": "acc-1", "amount": 800000, "at": "2026-03-10T14:00:00Z" }
      }]'

# Đọc stream theo thứ tự để fold ra state
curl http://localhost:2113/streams/account-acc1/0/forward/100 \
  -H 'Accept: application/vnd.eventstore.atom+json'
```

**Kafka làm event store** — dùng **compacted topic** khi muốn giữ *bản ghi mới nhất theo key* (thường cho snapshot/state), còn stream event thô để **retention dài + partition theo key aggregate**:

```bash
# Topic sự kiện thô: partition theo accountId để mọi event của 1 account
# rơi vào CÙNG partition -> giữ đúng thứ tự per-aggregate. Giữ vô hạn.
kafka-topics.sh --create --topic account-events \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=-1 \
  --config min.insync.replicas=2 \
  --bootstrap-server localhost:9092

# Topic compacted cho snapshot state mới nhất theo key (accountId):
# Kafka dọn bản cũ, chỉ giữ value cuối cùng của mỗi key -> "current state store".
kafka-topics.sh --create --topic account-snapshots \
  --partitions 12 --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.1 \
  --bootstrap-server localhost:9092
```

Producer **phải** đặt `key = accountId` để cùng aggregate vào cùng partition (giữ thứ tự) — đây là điều kiện sống còn cho việc fold đúng:

```java
// key = accountId  =>  ordering per-aggregate được đảm bảo trong partition
producer.send(new ProducerRecord<>("account-events",
    "acc-1",                                   // KEY: aggregate id
    serialize(new MoneyWithdrawn("acc-1", 800_000, Instant.now())))); // VALUE: event
```

> Lưu ý: Kafka **không** có optimistic concurrency per-aggregate sẵn. Nếu cần chống hai command đồng thời trên một aggregate, phải tự thêm cơ chế (single-writer per key, hoặc dùng transaction/idempotent producer + kiểm tra version ở tầng ứng dụng). Đây là lý do nhiều team chọn EventStoreDB khi Event Sourcing là *chính*, còn Kafka khi *streaming/fan-out* là chính.

---

## 7. Tóm tắt
- Event Sourcing: **nguồn sự thật là chuỗi event bất biến, append-only** — không lưu state hiện tại và ghi đè.
- **Current state = fold(apply, INITIAL, events)** bằng hàm `apply` **thuần & deterministic**; mỗi aggregate có stream riêng.
- **Snapshot** cắt ngắn replay (load snapshot rồi chỉ fold event sau đó) — chỉ là **cache tái tạo được**, không phải nguồn sự thật.
- Lợi ích: **audit log đầy đủ, time-travel/debug, nhiều read model, hợp tự nhiên với messaging/CQRS**.
- Cái giá: **schema evolution (versioning + upcasting), replay cost, eventual consistency, khó query ad-hoc, GDPR** — dùng khi lịch sử/audit là yêu cầu, tránh cho CRUD đơn giản.
- Event store: **EventStoreDB** (stream-per-aggregate, optimistic concurrency sẵn) hoặc **Kafka** (partition theo key aggregate, compacted topic cho snapshot; tự lo concurrency).

> **Bài tiếp theo:** **CQRS** — tách đường ghi (command → append event) khỏi đường đọc (projection/read model tối ưu cho truy vấn), người bạn đồng hành tự nhiên của Event Sourcing.
