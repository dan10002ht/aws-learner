# Bài 39 — Move: resource model (Aptos & Sui)

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **tư duy resource** của Move: tài sản là **giá trị không thể copy, không thể vứt bỏ tuỳ tiện** (linear type), khác về **bản chất** với "mapping số dư" của Solidity.
- Đọc và viết được **module Move** cơ bản: `struct` có `abilities`, hàm, và cách di chuyển (move) resource giữa các nơi lưu trữ.
- Phân biệt hai mô hình lưu trữ: **Aptos (account-centric, global storage)** vs **Sui (object-centric, parallel)**.
- Nói rõ **vì sao Move an toàn hơn cho tài sản**: nhiều lớp lỗi kinh điển của Solidity (mất coin, double-spend nội bộ, re-entrancy) bị **loại bỏ ngay ở tầng type system**.
- Biết khi nào Aptos, khi nào Sui phù hợp hơn với bài toán của bạn.

---

## 2. Lý thuyết

### 2.1 Analogy — tờ tiền vật lý vs con số trong Excel

Trong Solidity, số dư token là **một con số trong một cái bảng** (`mapping(address => uint256)`). "Chuyển tiền" thực chất là: **giảm số ở ô A, tăng số ở ô B**. Con số đó có thể bị ghi đè, cộng nhầm, quên trừ — và không có gì ở tầng ngôn ngữ ngăn bạn *tạo tiền từ hư không* nếu logic sai.

Move đảo ngược triết lý: một đồng coin là **một tờ tiền vật lý**. Bạn không "sửa con số"; bạn **cầm tờ tiền và di chuyển nó** từ ví này sang ví kia. Tờ tiền:
- **Không copy được** — không thể nhân đôi (không có `copy`).
- **Không tự bốc hơi** — không thể để rơi ra khỏi tay mà trình biên dịch không bắt (không có `drop`).
- Luôn ở **đúng một nơi** tại một thời điểm.

Đây gọi là **linear type** (kiểu tuyến tính): mỗi giá trị được *tiêu dùng đúng một lần*. Đây không phải quy ước lập trình — nó được **trình biên dịch cưỡng chế**.

### 2.2 Bản chất: `mapping`-balance vs resource

<svg viewBox="0 0 720 300" role="img" aria-labelledby="cmp-t cmp-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="cmp-t">Mapping-balance của Solidity vs resource của Move</title>
<desc id="cmp-d">Bên trái Solidity chỉnh sửa hai con số trong một bảng, bên phải Move di chuyển một đối tượng coin từ chủ này sang chủ khác</desc>
<text x="180" y="26" text-anchor="middle" font-size="14" fill="currentColor">Solidity — sửa con số trong bảng</text>
<rect x="70" y="55" width="220" height="90" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="80" text-anchor="middle" font-size="12" fill="currentColor">mapping(address =&gt; uint256)</text>
<text x="105" y="108" text-anchor="start" font-size="12" fill="currentColor">Alice: 100 → 90</text>
<text x="105" y="130" text-anchor="start" font-size="12" fill="currentColor">Bob:&#160;&#160;&#160;20 → 30</text>
<text x="180" y="180" text-anchor="middle" font-size="11" fill="currentColor">Nếu quên trừ Alice → tiền in ra từ hư không</text>
<text x="180" y="200" text-anchor="middle" font-size="11" fill="currentColor">Tổng cung không được ngôn ngữ bảo vệ</text>
<line x1="360" y1="40" x2="360" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="545" y="26" text-anchor="middle" font-size="14" fill="currentColor">Move — di chuyển một tờ tiền</text>
<rect x="410" y="70" width="90" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="95" text-anchor="middle" font-size="12" fill="currentColor">Alice</text>
<rect x="425" y="150" width="60" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="455" y="172" text-anchor="middle" font-size="11" fill="currentColor">Coin 10</text>
<rect x="590" y="70" width="90" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="635" y="95" text-anchor="middle" font-size="12" fill="currentColor">Bob</text>
<line x1="490" y1="167" x2="605" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#mv)"/>
<text x="547" y="150" text-anchor="middle" font-size="11" fill="#10b981">move</text>
<text x="545" y="210" text-anchor="middle" font-size="11" fill="currentColor">Coin rời Alice thì Alice hết coin đó</text>
<text x="545" y="228" text-anchor="middle" font-size="11" fill="currentColor">Không copy, không mất — tổng cung tự bảo toàn</text>
<defs><marker id="mv" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Trong Solidity, tính đúng đắn của tài sản là **trách nhiệm của lập trình viên** (nhớ trừ, nhớ kiểm tra overflow, nhớ chống re-entrancy). Trong Move, một phần lớn tính đúng đắn ấy **là bất biến của ngôn ngữ**: bạn *không thể viết ra* code làm mất hay nhân đôi resource mà compiler không chặn.

### 2.3 Abilities — 4 "quyền" của một type

Move không có `class`/`interface`. Mỗi `struct` được gắn tối đa 4 **abilities**, quyết định giá trị của nó *được phép làm gì*:

| Ability | Ý nghĩa | Nếu THIẾU |
|---------|---------|-----------|
| `copy` | Được nhân bản giá trị | Không thể copy — mỗi giá trị là duy nhất |
| `drop` | Được huỷ bỏ ngầm khi ra khỏi scope | **Phải** được tiêu dùng tường minh; quên xử lý → **lỗi biên dịch** |
| `store` | Được lưu bên trong một struct khác trong global storage | Không thể cất giữ lâu dài |
| `key` | Được dùng làm **resource gốc** trong global storage (có địa chỉ) | Không thể `move_to`/`borrow_global` |

**Chìa khoá của tài sản**: một loại coin được khai báo **không có `copy`, không có `drop`**. Chính hai điều thiếu này biến nó thành **linear resource** — đúng nghĩa "tờ tiền": không nhân đôi được (thiếu `copy`), và **compiler bắt buộc** bạn phải nói rõ mỗi đồng coin đi đâu, không cho phép nó lặng lẽ biến mất (thiếu `drop`).

```move
module my_addr::asset {
    /// Một đồng coin: KHÔNG có `copy`, KHÔNG có `drop`.
    /// `store` để có thể cất trong ví; đây là một resource tuyến tính.
    struct Coin has store {
        value: u64,
    }

    /// Đúc coin — chỉ nơi duy nhất giá trị được TẠO ra.
    public fun mint(value: u64): Coin {
        Coin { value }
    }

    /// Gộp hai coin: coin `other` bị TIÊU DÙNG (unpack) — nó biến mất một cách hợp lệ.
    public fun merge(self: &mut Coin, other: Coin) {
        let Coin { value } = other; // phải phá cấu trúc tường minh vì Coin không drop được
        self.value = self.value + value;
    }

    /// Tách một phần giá trị ra thành coin mới — bảo toàn tổng.
    public fun split(self: &mut Coin, amount: u64): Coin {
        assert!(self.value >= amount, 1);
        self.value = self.value - amount;
        Coin { value: amount }
    }
}
```

Hãy để ý hàm `merge`: bạn **không thể** viết `public fun merge(self: &mut Coin, other: Coin) { self.value = self.value + other.value; }` rồi để `other` tự rơi. Vì `Coin` **không có `drop`**, compiler báo lỗi *"unused value without drop"*. Bạn buộc phải `let Coin { value } = other;` — **phá cấu trúc tường minh** để tiêu dùng nó. Ngôn ngữ *ép* bạn xử lý số phận của từng đồng coin.

### 2.4 So sánh gốc rễ với Solidity

| Vấn đề | Solidity (mapping-balance) | Move (resource) |
|--------|----------------------------|-----------------|
| Bản chất tài sản | Con số trong `mapping` | Giá trị có kiểu, linear |
| Nhân đôi tài sản | Có thể do bug (quên trừ) | **Không thể** — thiếu `copy` |
| Mất tài sản âm thầm | Ghi đè `mapping` là mất | **Không thể** — thiếu `drop`, compiler bắt |
| Bảo toàn tổng cung | Do lập trình viên đảm bảo | Bất biến của type system |
| Re-entrancy | Rủi ro kinh điển (DAO 2016) | Không có dynamic dispatch tới code lạ giữa chừng theo cách đó |
| Token gửi nhầm địa chỉ | Kẹt vĩnh viễn | Model resource + kiểm tra tại compile giảm mạnh lớp lỗi này |
| Formal verification | Khó | Có **Move Prover** kiểm chứng đặc tả |

Điểm mấu chốt: Solidity đặt tài sản ở **tầng dữ liệu** (số trong storage) và để logic đúng đắn cho developer. Move nâng tài sản lên **tầng type**, biến các bất biến kinh tế thành các bất biến ngôn ngữ mà compiler cưỡng chế.

### 2.5 Aptos — mô hình account-centric (global storage)

Aptos kế thừa mô hình Move gốc từ Diem: có một **global storage** dạng bản đồ hai chiều — được đánh chỉ mục theo `(address, type)`. Resource **sống dưới địa chỉ của account**. Bốn phép toán lõi thao tác trên storage này:

- `move_to<T>(&signer, resource)` — đặt resource `T` dưới account của signer.
- `move_from<T>(address): T` — rút resource ra (tiêu dùng).
- `borrow_global<T>(address): &T` — mượn tham chiếu đọc.
- `borrow_global_mut<T>(address): &mut T` — mượn tham chiếu ghi.

`signer` là một **capability không giả mạo được**: chỉ có được khi giao dịch được ký đúng — nó chứng minh quyền sở hữu account, thay cho `msg.sender` của Solidity nhưng an toàn hơn (không thể "giả" signer).

```move
module my_addr::wallet {
    use std::signer;

    /// Resource GỐC: có `key` để sống trong global storage dưới một address.
    struct Wallet has key {
        balance: u64,
    }

    /// Mở ví cho chính mình — move_to đặt resource dưới account của signer.
    public entry fun open(account: &signer) {
        move_to(account, Wallet { balance: 0 });
    }

    /// Nạp tiền vào ví của mình.
    public entry fun deposit(account: &signer, amount: u64) acquires Wallet {
        let addr = signer::address_of(account);
        let w = borrow_global_mut<Wallet>(addr);
        w.balance = w.balance + amount;
    }

    public fun balance_of(addr: address): u64 acquires Wallet {
        borrow_global<Wallet>(addr).balance
    }
}
```

`acquires Wallet` là khai báo bắt buộc: hàm nào chạm global storage của type `Wallet` phải khai báo — giúp compiler và người đọc biết chính xác hàm động tới resource nào. `entry` đánh dấu hàm có thể được gọi trực tiếp từ một transaction.

### 2.6 Sui — mô hình object-centric (parallel)

Sui **bỏ global storage kiểu Aptos**. Mọi thứ là **object** có **UID** duy nhất, được đánh chỉ mục toàn cục **theo object ID chứ không theo address**. Address chỉ là *chủ sở hữu* của object. Đây là khác biệt lớn nhất giữa hai chain.

<svg viewBox="0 0 720 260" role="img" aria-labelledby="as-t as-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="as-t">Aptos account-centric vs Sui object-centric</title>
<desc id="as-d">Aptos lưu resource dưới địa chỉ account, Sui lưu các object độc lập có ID riêng cho phép xử lý song song</desc>
<text x="180" y="24" text-anchor="middle" font-size="14" fill="currentColor">Aptos — resource dưới account</text>
<rect x="90" y="45" width="180" height="150" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="68" text-anchor="middle" font-size="12" fill="currentColor">address 0xA</text>
<rect x="110" y="82" width="140" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="104" text-anchor="middle" font-size="11" fill="currentColor">Wallet { 50 }</text>
<rect x="110" y="124" width="140" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="146" text-anchor="middle" font-size="11" fill="currentColor">NFT #7</text>
<text x="180" y="182" text-anchor="middle" font-size="10" fill="currentColor">Chỉ mục theo (address, type)</text>
<line x1="360" y1="30" x2="360" y2="235" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="545" y="24" text-anchor="middle" font-size="14" fill="currentColor">Sui — object độc lập có UID</text>
<rect x="410" y="55" width="120" height="42" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="72" text-anchor="middle" font-size="11" fill="currentColor">Coin 0x1f… owner 0xA</text>
<text x="470" y="88" text-anchor="middle" font-size="10" fill="currentColor">value 50</text>
<rect x="560" y="55" width="120" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="620" y="72" text-anchor="middle" font-size="11" fill="currentColor">NFT 0x9c… owner 0xA</text>
<text x="620" y="88" text-anchor="middle" font-size="10" fill="currentColor">#7</text>
<rect x="410" y="112" width="120" height="42" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="129" text-anchor="middle" font-size="11" fill="currentColor">Coin 0x33… owner 0xB</text>
<text x="470" y="145" text-anchor="middle" font-size="10" fill="currentColor">value 10</text>
<text x="545" y="180" text-anchor="middle" font-size="10" fill="currentColor">TX chạm object khác nhau → thực thi SONG SONG</text>
<text x="545" y="200" text-anchor="middle" font-size="10" fill="currentColor">Không đụng cùng state → không cần xếp hàng tuần tự</text>
</svg>

Vì mỗi object độc lập, Sui biết trước một transaction **đọc/ghi những object nào** (khai báo ở đầu vào). Hai transaction *không đụng chung object nào* có thể chạy **song song** trên nhiều lõi — không cần sắp xếp tuần tự toàn cục. Đây là nền tảng cho thông lượng cao của Sui. Với **owned object** (một chủ), Sui thậm chí bỏ qua consensus toàn phần cho đường đi nhanh; chỉ **shared object** (nhiều bên cùng chạm, ví dụ pool DEX) mới cần đi qua consensus.

```move
module my_addr::sui_wallet {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer;

    /// Object phải có field `id: UID` và ability `key`.
    struct Wallet has key, store {
        id: UID,
        balance: u64,
    }

    /// Tạo ví như một OBJECT mới rồi chuyển cho người gọi.
    public entry fun open(ctx: &mut TxContext) {
        let w = Wallet { id: object::new(ctx), balance: 0 };
        transfer::transfer(w, tx_context::sender(ctx));
    }

    /// Nạp tiền: nhận tham chiếu &mut tới object ví do người gọi sở hữu.
    public entry fun deposit(w: &mut Wallet, amount: u64) {
        w.balance = w.balance + amount;
    }
}
```

Khác biệt trực quan: Aptos dùng `move_to(account, ...)` để cất resource *dưới địa chỉ*; Sui tạo `object::new(ctx)` rồi `transfer::transfer(obj, addr)` để *chuyển quyền sở hữu object*. Ở Sui bạn thao tác trực tiếp trên object truyền vào (`w: &mut Wallet`), runtime tự nạp object theo ID.

### 2.7 Aptos vs Sui — chọn cái nào

| Tiêu chí | Aptos | Sui |
|----------|-------|-----|
| Mô hình lưu trữ | Account-centric, global storage | Object-centric, mỗi object 1 UID |
| Đơn vị state | Resource dưới `(address, type)` | Object độc lập |
| Song song hoá | Block-STM (song song lạc quan, tự phát hiện xung đột) | Song song tường minh theo object đầu vào |
| Owned vs shared | Không phân biệt ở tầng model | Owned object đi đường nhanh (bỏ qua consensus đầy đủ) |
| Trực giác cho dev | Gần Move gốc/Diem, quen với "account có tài sản" | Cần tư duy "mọi thứ là object có chủ" |
| Hợp với | Ứng dụng account-based, DeFi truyền thống | NFT/gaming, khối lượng object lớn, cần TPS cao & độ trễ thấp |

Cả hai đều là **Move**, nhưng "flavor" Move khác nhau: Aptos gần Move nguyên bản; Sui có **Sui Move** với hệ object và luật `transfer` riêng. Kỹ năng cốt lõi (abilities, linear resource, borrow) dùng chung; API lưu trữ khác nhau.

### 2.8 Vì sao Move an toàn hơn cho tài sản

1. **Bảo toàn tài sản là bất biến ngôn ngữ**: thiếu `copy`/`drop` khiến "in tiền từ hư không" hay "làm mất tiền âm thầm" *không biên dịch được*, thay vì chỉ là lỗi logic runtime.
2. **Bounds & type an toàn tại compile-time**: không có con trỏ tự do, không truy cập ngoài giới hạn; global storage truy cập qua `acquires` được kiểm soát.
3. **Không có re-entrancy kiểu DAO**: Move không cho phép callback tuỳ ý vào code người ngoài ở giữa việc cập nhật state theo cách để lộ trạng thái nửa vời như pattern call-trước-cập-nhật của Solidity.
4. **`signer` không giả mạo**: quyền sở hữu được biểu diễn bằng capability, không phải một địa chỉ có thể bị spoof.
5. **Move Prover**: có công cụ **formal verification** ngay trong hệ sinh thái, cho phép viết đặc tả (`spec`) và chứng minh hàm thoả bất biến (ví dụ "tổng cung không đổi sau chuyển tiền").

Move **không** biến hợp đồng thành bất khả xâm phạm — lỗi logic nghiệp vụ, oracle sai, quản trị key kém vẫn gây thiệt hại. Nhưng nó **loại bỏ nguyên cả một họ lỗi** tốn kém nhất của Solidity ngay từ tầng type.

---

## 3. Ví dụ thực tế: chuyển coin an toàn (Aptos)

```move
module my_addr::wallet {
    use std::signer;

    struct Wallet has key { balance: u64 }
    struct Coin has store { value: u64 }

    const E_INSUFFICIENT: u64 = 100;

    /// Rút ra một Coin resource từ ví — số dư giảm, coin được TẠO như tài sản linear.
    public fun withdraw(account: &signer, amount: u64): Coin acquires Wallet {
        let w = borrow_global_mut<Wallet>(signer::address_of(account));
        assert!(w.balance >= amount, E_INSUFFICIENT);
        w.balance = w.balance - amount;
        Coin { value: amount }
    }

    /// Nạp một Coin vào ví người nhận — coin bị TIÊU DÙNG (unpack) tại đây.
    public fun deposit(to: address, coin: Coin) acquires Wallet {
        let Coin { value } = coin;                 // phá cấu trúc — coin biến mất hợp lệ
        borrow_global_mut<Wallet>(to).balance =
            borrow_global_mut<Wallet>(to).balance + value;
    }

    /// Chuyển tiền = withdraw rồi deposit. Coin không thể "mất" giữa đường:
    /// nếu quên deposit, compiler báo lỗi vì Coin không có `drop`.
    public entry fun transfer(from: &signer, to: address, amount: u64) acquires Wallet {
        let coin = withdraw(from, amount);
        deposit(to, coin);
    }
}
```

Điểm quan trọng: giữa `withdraw` và `deposit`, đồng `coin` là một **resource sống trong stack**. Nếu bạn viết thiếu `deposit(to, coin);`, chương trình **không biên dịch** — vì `Coin` không `drop` được, một giá trị chưa được tiêu dùng là lỗi. Ở Solidity, quên cộng cho người nhận chỉ đơn giản là… mất tiền, và compiler im lặng.

---

## 4. Tóm tắt
- Move mô hình hoá tài sản là **resource tuyến tính** — như tờ tiền vật lý: **không copy, không tự mất**, luôn ở đúng một nơi.
- **Abilities** (`copy`, `drop`, `store`, `key`) quyết định một type được làm gì; coin điển hình **thiếu `copy` và `drop`** để trở thành tài sản an toàn.
- Khác biệt bản chất với Solidity: Solidity đặt tài sản ở **tầng dữ liệu** (số trong `mapping`) và phó thác đúng đắn cho developer; Move nâng nó lên **tầng type** mà compiler cưỡng chế.
- **Aptos**: account-centric, global storage `(address, type)`, thao tác bằng `move_to`/`borrow_global`, song song bằng Block-STM.
- **Sui**: object-centric, mọi thứ là object có UID, chuyển bằng `transfer`, cho phép **thực thi song song** và đường đi nhanh cho owned object.
- Move an toàn hơn vì **bảo toàn tài sản, loại re-entrancy kiểu DAO, `signer` không giả mạo, và có Move Prover** — xoá bỏ cả một họ lỗi đắt giá của Solidity ngay tại compile-time.

> **Bài tiếp theo:** so sánh hệ sinh thái L1 hiệu năng cao và cách chọn nền tảng theo bài toán — từ mô hình thực thi tới trải nghiệm developer.
