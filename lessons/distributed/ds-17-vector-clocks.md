# Bài 17 — Vector clock & causal ordering

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **giới hạn chí mạng của Lamport clock**: nó cho thứ tự toàn phần nhưng **không phát hiện được concurrent** (hai event không liên quan nhân quả).
- Nắm **vector clock**: mỗi node giữ một **vector đếm**, hiểu chính xác **quy tắc cập nhật** khi làm việc nội bộ, khi gửi và khi nhận message.
- **So sánh hai vector** để kết luận một trong ba: `A → B` (A xảy ra trước B), `B → A`, hay `A ∥ B` (concurrent) — điều Lamport không làm được.
- Áp dụng vào thực chiến: **version vector** trong Dynamo/Riak để phát hiện **conflict** và sinh ra **sibling**.
- Hiểu **chi phí kích thước vector** (O(N) theo số node) và các kỹ thuật cắt giảm.
- Tự **tính tay** một kịch bản 3 node từ đầu đến cuối.

---

## 2. Lý thuyết

### 2.1 Ôn nhanh: Lamport clock làm được gì và KHÔNG làm được gì

Ở bài trước, **Lamport logical clock** cho ta một quy tắc đơn giản: mỗi event tăng bộ đếm, khi nhận message thì `counter = max(local, nhận được) + 1`. Kết quả là một tính chất một chiều:

> Nếu `a → b` (a happens-before b) thì `L(a) < L(b)`.

Vấn đề nằm ở **chiều ngược lại không đúng**: `L(a) < L(b)` **không** kéo theo `a → b`. Hai event chẳng liên quan gì nhau vẫn có thể có số Lamport khác nhau, khiến ta **tưởng nhầm** có quan hệ nhân quả. Nói cách khác, Lamport clock **nén** cả không gian nhân quả xuống một trục số duy nhất — và khi nén một đồ thị 2 chiều xuống 1 chiều, ta **mất thông tin**: không còn phân biệt được "trước sau thật sự" với "song song, tình cờ đánh số khác nhau".

Điều ta thật sự cần là một hàm clock `V` sao cho **cả hai chiều đều đúng**:

> `a → b` **khi và chỉ khi** `V(a) < V(b)`.

Vector clock chính là cấu trúc đạt được điều đó. Nó **đặc trưng hoá đầy đủ** quan hệ happens-before.

### 2.2 Analogy đời thường: nhóm chat và "ai đã đọc tới đâu"

Hãy tưởng tượng 3 người bạn — An, Bình, Chi — nhắn tin nhóm nhưng mạng chập chờn, tin đến không đồng đều. Mỗi người tự ghi một **cuốn sổ nhỏ 3 dòng**: "tính đến giờ, mình đã biết An nói bao nhiêu câu, Bình bao nhiêu câu, Chi bao nhiêu câu". Đó chính là **vector clock**.

- Khi **An tự nói** một câu, An tăng dòng "An" trong sổ của mình.
- Khi **Bình đọc** được tin của An, Bình cập nhật sổ: lấy **max từng dòng** giữa sổ mình và thông tin đính kèm trong tin của An — nghĩa là "giờ mình biết ít nhất bằng những gì An biết lúc gửi".

Nhờ đó, chỉ cần so hai cuốn sổ, ta biết **câu nào chắc chắn được viết sau khi đã đọc câu kia** (nhân quả), và câu nào **được viết mà chưa hề biết tới câu kia** (concurrent — hai người nói cùng lúc, chưa ai thấy tin của ai). Cái mà con người gọi là "ơ hai đứa nói đè lên nhau" chính là **conflict** trong hệ phân tán.

### 2.3 Định nghĩa hình thức

Trong hệ có **N** node, mỗi node `i` giữ một vector `V` gồm N phần tử số nguyên, khởi tạo tất cả bằng 0. `V[i]` = "số event nội bộ mà node i đã thực hiện"; `V[j]` = "số event của node j mà node i đã **biết tới** (trực tiếp hoặc gián tiếp qua chuỗi message)".

**Ba quy tắc cập nhật** (thuộc lòng):

1. **Internal event** (node i làm một việc nội bộ, hoặc phát sinh một sự kiện cần đánh dấu): tăng ô của chính mình
   `V_i[i] += 1`
2. **Send** (node i gửi message): trước tiên áp dụng quy tắc 1 (đây cũng là một event), rồi **đính kèm bản sao `V_i`** vào message.
3. **Receive** (node i nhận message kèm vector `Vm`): merge bằng **max theo từng phần tử**, rồi tăng ô của mình:
   `for k: V_i[k] = max(V_i[k], Vm[k])`
   `V_i[i] += 1`

Ba dòng đó là toàn bộ thuật toán. Mọi thứ còn lại là hệ quả.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="vc-t vc-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="vc-t">Ba quy tắc cập nhật vector clock</title>
<desc id="vc-d">Sơ đồ minh hoạ quy tắc internal, send và receive của vector clock giữa hai node</desc>
<rect x="20" y="20" width="320" height="260" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="380" y="20" width="320" height="260" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="45" text-anchor="middle" font-size="14" fill="currentColor">Node A (ô index 0)</text>
<text x="540" y="45" text-anchor="middle" font-size="14" fill="currentColor">Node B (ô index 1)</text>
<text x="180" y="80" text-anchor="middle" font-size="12" fill="currentColor">internal: A[0] += 1</text>
<rect x="120" y="92" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="112" text-anchor="middle" font-size="12" fill="currentColor">V_A = [1, 0]</text>
<text x="180" y="150" text-anchor="middle" font-size="12" fill="currentColor">send: A[0] += 1</text>
<rect x="120" y="162" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="182" text-anchor="middle" font-size="12" fill="currentColor">V_A = [2, 0]</text>
<line x1="240" y1="177" x2="470" y2="230" stroke="currentColor" stroke-width="1.5" marker-end="url(#va)"/>
<text x="360" y="196" text-anchor="middle" font-size="11" fill="currentColor">msg kèm [2, 0]</text>
<text x="540" y="150" text-anchor="middle" font-size="12" fill="currentColor">receive [2,0]:</text>
<text x="540" y="172" text-anchor="middle" font-size="11" fill="currentColor">max theo ô rồi B[1]+=1</text>
<rect x="470" y="215" width="140" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="235" text-anchor="middle" font-size="12" fill="currentColor">V_B = [2, 1]</text>
<defs><marker id="va" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 So sánh hai vector — trái tim của vector clock

Cho hai vector `V` và `W` cùng độ dài N. Định nghĩa quan hệ:

- `V ≤ W` khi **mọi** ô: `V[k] ≤ W[k]`.
- `V < W` (đọc: "V xảy ra trước W") khi `V ≤ W` **và** tồn tại ít nhất một ô `V[k] < W[k]` (tức V ≤ W nhưng V ≠ W).
- `V ∥ W` (**concurrent**) khi **không** `V ≤ W` **và không** `W ≤ V` — tức có ô mà V lớn hơn, đồng thời có ô khác mà W lớn hơn.

Từ đó suy ra **đúng một** trong ba kết luận cho mọi cặp event:

| Kết quả so sánh | Ý nghĩa nhân quả |
|---|---|
| `V(a) < V(b)` | `a → b`: a chắc chắn xảy ra trước và **có thể đã ảnh hưởng** tới b |
| `V(b) < V(a)` | `b → a`: chiều ngược lại |
| `V(a) ∥ V(b)` | **concurrent**: không cái nào biết tới cái nào → tiềm ẩn **conflict** |

Chính khả năng phát hiện `∥` là thứ Lamport clock **không thể** làm. Với Lamport, hai event luôn có `L(a) < L(b)` hoặc `L(b) < L(a)` (hoặc bằng nhau), không bao giờ có "song song" — nên nó **giấu mất** conflict.

**Quy tắc nhận dạng nhanh concurrent bằng mắt:** nhìn hai vector, nếu bạn thấy **một ô mà V trội hơn** VÀ **một ô khác mà W trội hơn** → concurrent. Ví dụ `[2,1,0]` và `[0,1,3]`: ô 0 thì bên trái trội (2>0), ô 2 thì bên phải trội (3>0) → **concurrent**.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="cmp-t cmp-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="cmp-t">Ba khả năng khi so sánh hai vector clock</title>
<desc id="cmp-d">So sánh cho ra trước, sau hoặc concurrent</desc>
<rect x="20" y="30" width="200" height="180" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="250" y="30" width="200" height="180" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="480" y="30" width="200" height="180" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="60" text-anchor="middle" font-size="14" fill="currentColor">a trước b</text>
<text x="120" y="110" text-anchor="middle" font-size="13" fill="currentColor">[1,0,0]</text>
<text x="120" y="135" text-anchor="middle" font-size="13" fill="currentColor">≤ [2,1,0]</text>
<text x="120" y="180" text-anchor="middle" font-size="12" fill="currentColor">mọi ô ≤, có ô &lt;</text>
<text x="350" y="60" text-anchor="middle" font-size="14" fill="currentColor">b trước a</text>
<text x="350" y="110" text-anchor="middle" font-size="13" fill="currentColor">[2,1,0]</text>
<text x="350" y="135" text-anchor="middle" font-size="13" fill="currentColor">≥ [1,0,0]</text>
<text x="350" y="180" text-anchor="middle" font-size="12" fill="currentColor">đối xứng ca bên trái</text>
<text x="580" y="60" text-anchor="middle" font-size="14" fill="currentColor">concurrent</text>
<text x="580" y="110" text-anchor="middle" font-size="13" fill="currentColor">[2,1,0]</text>
<text x="580" y="135" text-anchor="middle" font-size="13" fill="currentColor">∥ [0,1,3]</text>
<text x="580" y="180" text-anchor="middle" font-size="12" fill="currentColor">ô0 trội trái, ô2 trội phải</text>
</svg>

---

## 3. Ví dụ tính tay chi tiết — 3 node

Đây là phần quan trọng nhất: hãy làm chậm, từng bước. Ba node **P0, P1, P2**, vector 3 ô theo thứ tự `[P0, P1, P2]`, tất cả bắt đầu `[0,0,0]`.

Kịch bản (các sự kiện xảy ra và message được trao đổi):

1. **e1**: P0 làm một event nội bộ.
2. **e2**: P0 gửi message m1 sang P1.
3. **e3**: P1 nhận m1.
4. **e4**: P1 gửi message m2 sang P2.
5. **e5**: P2 làm một event nội bộ (**độc lập**, chưa nhận m2).
6. **e6**: P2 nhận m2.
7. **e7**: P0 làm một event nội bộ (**độc lập** với mọi thứ ở P1/P2 sau e2).

Tính từng bước (nhớ: internal → tăng ô mình; send → tăng ô mình rồi đính kèm; receive → max từng ô rồi tăng ô mình):

| Bước | Node | Loại | Phép tính | Vector sau |
|---|---|---|---|---|
| e1 | P0 | internal | P0[0] += 1 → `[0,0,0]`→ | `[1,0,0]` |
| e2 | P0 | send m1 | P0[0] += 1, đính kèm `[2,0,0]` | `[2,0,0]` |
| e3 | P1 | receive m1`[2,0,0]` | max(`[0,0,0]`,`[2,0,0]`)=`[2,0,0]`, rồi P1[1]+=1 | `[2,1,0]` |
| e4 | P1 | send m2 | P1[1] += 1, đính kèm `[2,2,0]` | `[2,2,0]` |
| e5 | P2 | internal | P2[2] += 1 | `[0,0,1]` |
| e6 | P2 | receive m2`[2,2,0]` | max(`[0,0,1]`,`[2,2,0]`)=`[2,2,1]`, rồi P2[2]+=1 | `[2,2,2]` |
| e7 | P0 | internal | P0[0] += 1 (P0 vẫn ở `[2,0,0]`) | `[3,0,0]` |

Giờ **đọc kết quả** — đây là chỗ vector clock toả sáng:

- **e1 `[1,0,0]` vs e3 `[2,1,0]`**: mọi ô của e1 ≤ e3 và có ô nhỏ hơn → `e1 → e3`. Đúng: message m1 mang thông tin từ P0 sang P1, có quan hệ nhân quả.
- **e5 `[0,0,1]` vs e4 `[2,2,0]`**: ô 2 thì e5 trội (1>0), ô 0 và 1 thì e4 trội → **`e5 ∥ e4`, concurrent**. Đúng bản chất: khi P2 tự làm e5, nó **chưa hề** nhận m2, hai việc xảy ra song song.
- **e6 `[2,2,2]` vs e5 `[0,0,1]`**: mọi ô e5 ≤ e6, có ô nhỏ hơn → `e5 → e6`. Đúng: e6 xảy ra sau e5 trên chính P2 (cùng node thì luôn có thứ tự).
- **e7 `[3,0,0]` vs e3 `[2,1,0]`**: ô 0 thì e7 trội (3>2), ô 1 thì e3 trội (1>0) → **`e7 ∥ e3`, concurrent**. Đúng: sau khi gửi m1, P0 làm việc riêng của nó, còn P1 xử lý m1; hai bên không biết về nhau.
- **e7 `[3,0,0]` vs e6 `[2,2,2]`**: ô 0 e7 trội, ô 1 và 2 e6 trội → **concurrent**. Hợp lý: nhánh P0 và nhánh P1→P2 tách nhau từ sau e2.

Nếu dùng **Lamport clock** cho cùng kịch bản này, e5 và e4 sẽ nhận hai con số khác nhau (chẳng hạn 1 và 4) và bạn sẽ **tưởng lầm** e5 xảy ra trước e4 — trong khi thực tế chúng **song song, không liên quan**. Đó chính là thông tin mà vector clock giữ lại còn Lamport vứt đi.

---

## 4. Ứng dụng thực chiến: version vector, conflict & sibling trong Dynamo

Amazon Dynamo (và bản mã nguồn mở kế thừa **Riak**, **Voldemort**) là ví dụ kinh điển. Dynamo là hệ **leaderless, AP** (xem lại CAP): để luôn ghi được kể cả khi mạng chia cắt, nó **cho phép hai client ghi cùng một key ở hai replica khác nhau đồng thời**. Câu hỏi sống còn: khi hai bản ghi gặp lại nhau, cái nào mới hơn, hay chúng **mâu thuẫn**?

Dùng timestamp vật lý (last-write-wins) sẽ **âm thầm mất dữ liệu** vì clock lệch. Dynamo thay vào đó gắn cho **mỗi version của value** một **version vector** (một biến thể của vector clock, đánh index theo node/coordinator thay vì theo client).

Cơ chế:
- Mỗi lần ghi, coordinator **tăng ô của mình** trong version vector rồi lưu kèm value.
- Khi đọc/ghi, so sánh version vector của các bản sao:
  - Nếu `V_cũ < V_mới` → bản mới **kế thừa** bản cũ, ghi đè an toàn (không mất gì).
  - Nếu **concurrent (∥)** → hai bản là **conflict thật**, Dynamo giữ **cả hai** dưới dạng **sibling** và **trả cả hai về cho ứng dụng** khi đọc.
- Ứng dụng (hoặc CRDT logic) phải **reconcile** sibling — ví dụ giỏ hàng thì **hợp (union)** các món, nên Dynamo nổi tiếng với case "món đã xoá đôi khi sống lại".

<svg viewBox="0 0 720 320" role="img" aria-labelledby="dyn-t dyn-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="dyn-t">Version vector sinh sibling khi hai ghi concurrent trong Dynamo</title>
<desc id="dyn-d">Hai client ghi đồng thời tạo hai version concurrent, hệ giữ lại làm sibling để ứng dụng reconcile</desc>
<rect x="270" y="20" width="180" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="46" text-anchor="middle" font-size="12" fill="currentColor">v0: cart={sách}  [1,0]</text>
<line x1="330" y1="62" x2="180" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="390" y1="62" x2="540" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<rect x="70" y="112" width="220" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="180" y="132" text-anchor="middle" font-size="12" fill="currentColor">ClientA + bút → coordinator Sx</text>
<text x="180" y="150" text-anchor="middle" font-size="12" fill="currentColor">va: {sách,bút}  [2,0]</text>
<rect x="430" y="112" width="220" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="132" text-anchor="middle" font-size="12" fill="currentColor">ClientB + vở → coordinator Sy</text>
<text x="540" y="150" text-anchor="middle" font-size="12" fill="currentColor">vb: {sách,vở}  [1,1]</text>
<line x1="180" y1="158" x2="330" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<line x1="540" y1="158" x2="390" y2="210" stroke="currentColor" stroke-width="1.5" marker-end="url(#da)"/>
<rect x="240" y="212" width="240" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="232" text-anchor="middle" font-size="12" fill="currentColor">[2,0] ∥ [1,1] → CONFLICT</text>
<text x="360" y="250" text-anchor="middle" font-size="12" fill="currentColor">giữ cả hai làm sibling</text>
<rect x="240" y="272" width="240" height="40" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="360" y="297" text-anchor="middle" font-size="12" fill="currentColor">app reconcile: union → {sách,bút,vở}</text>
<defs><marker id="da" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Trong sơ đồ: bắt đầu từ `v0=[1,0]`. ClientA đọc v0, thêm "bút", coordinator Sx tăng ô của nó → `[2,0]`. Song song, ClientB cũng đọc v0, thêm "vở", coordinator Sy tăng ô nó → `[1,1]`. Khi so `[2,0]` với `[1,1]`: ô 0 trội trái, ô 1 trội phải → **concurrent** → Dynamo không dám vứt bên nào, giữ **hai sibling**. Lần đọc sau, app nhận cả hai và **hợp** thành `{sách, bút, vở}` với version vector merge `[2,1]`.

**Đây là toàn bộ lý do vector/version clock tồn tại trong hệ AP**: nó là cơ chế phân biệt **"ghi đè hợp lệ"** với **"xung đột cần con người/logic giải quyết"** mà không phụ thuộc đồng hồ vật lý.

### 4.1 Đọc version vector trong Riak (thực hành)

Riak trả version vector dưới header `X-Riak-Vclock` (đã mã hoá base64). Bật cho phép sibling rồi quan sát:

```bash
# Bật allow_mult để Riak giữ sibling thay vì last-write-wins
curl -XPUT http://localhost:8098/buckets/cart/props \
  -H "Content-Type: application/json" \
  -d '{"props":{"allow_mult":true}}'

# ClientA ghi (chưa gắn vclock -> tạo version gốc)
curl -i -XPUT http://localhost:8098/buckets/cart/keys/user42 \
  -H "Content-Type: application/json" \
  -d '{"items":["sach","but"]}'

# ClientB ghi ĐỒNG THỜI, cũng không gắn vclock hiện tại -> concurrent
curl -i -XPUT http://localhost:8098/buckets/cart/keys/user42 \
  -H "Content-Type: application/json" \
  -d '{"items":["sach","vo"]}'

# Đọc lại: vì hai bản concurrent, Riak trả 300 Multiple Choices + các sibling
curl -i http://localhost:8098/buckets/cart/keys/user42
# HTTP/1.1 300 Multiple Choices
# X-Riak-Vclock: a85hYGBgzGDKBVI...   <- version vector đã merge
# Siblings:
#   6dQZ...   <- {"items":["sach","but"]}
#   9kLm...   <- {"items":["sach","vo"]}
```

Sau khi reconcile, client ghi lại value đã hợp nhất **kèm đúng `X-Riak-Vclock` vừa nhận** — hành động này báo cho Riak biết "tôi đã thấy cả hai nhánh", nên các sibling được **thu gọn** về một version duy nhất descendant của cả hai:

```bash
curl -i -XPUT http://localhost:8098/buckets/cart/keys/user42 \
  -H "Content-Type: application/json" \
  -H "X-Riak-Vclock: a85hYGBgzGDKBVI..." \
  -d '{"items":["sach","but","vo"]}'
```

Điểm mấu chốt cần khắc cốt: **gắn lại vclock khi ghi** = "tôi đọc trước khi ghi", giúp version vector `<` (kế thừa) thay vì `∥` (đẻ thêm sibling). Quên gắn vclock → mỗi lần ghi lại sinh conflict mới.

### 4.2 Minh hoạ logic so sánh (pseudo-code chạy được)

```python
def compare(v, w):
    # v, w: dict {node_id: counter}, ô thiếu coi như 0
    keys = set(v) | set(w)
    v_greater = any(v.get(k, 0) > w.get(k, 0) for k in keys)
    w_greater = any(w.get(k, 0) > v.get(k, 0) for k in keys)
    if v_greater and w_greater:
        return "concurrent"      # ∥  -> conflict, giữ sibling
    if v_greater:
        return "v_after_w"       # w -> v
    if w_greater:
        return "w_after_v"       # v -> w
    return "equal"               # cùng một version

def merge(v, w):
    # dùng khi reconcile: lấy max từng ô
    return {k: max(v.get(k, 0), w.get(k, 0)) for k in set(v) | set(w)}

# Ví dụ đúng với sơ đồ Dynamo ở trên
va = {"Sx": 2, "Sy": 0}   # [2,0]
vb = {"Sx": 1, "Sy": 1}   # [1,1]
print(compare(va, vb))    # -> concurrent
print(merge(va, vb))      # -> {'Sx': 2, 'Sy': 1}  (version của bản đã reconcile)
```

Lưu ý mẹo dùng **dict thay vì mảng cố định**: version vector chỉ chứa ô cho những node **thật sự từng ghi** key đó, ô vắng mặt ngầm hiểu là 0 — đây chính là bước đệm cho tối ưu kích thước ở mục sau.

---

## 5. Chi phí kích thước vector & cách cắt giảm

Vector clock **không miễn phí**. Đây là nhược điểm phải hiểu rõ để dùng đúng chỗ:

| Vấn đề | Bản chất |
|---|---|
| **Kích thước O(N)** | Vector dài bằng số node/actor. Hệ có hàng nghìn client cùng ghi → vector phình theo. |
| **Đính kèm mọi message** | Mỗi message/version phải mang cả vector → overhead băng thông và storage. |
| **Node đến/đi (churn)** | Số ô tăng theo **lịch sử** actor từng ghi, không chỉ actor đang sống → càng chạy lâu càng phình. |

Cái bẫy kinh điển của Dynamo đời đầu: nếu index version vector theo **client**, mà một key bị hàng nghìn client khác nhau ghi, vector có hàng nghìn ô. Các kỹ thuật giảm:

- **Index theo server coordinator, không theo client**: số node server hữu hạn và ổn định (chục–trăm), nên vector nhỏ và không phình theo lượng client. Đây là lựa chọn của Dynamo/Riak thực tế.
- **Dotted Version Vectors (DVV)**: bản cải tiến Riak dùng, tránh **false conflict** khi cùng một client ghi liên tiếp, đồng thời giữ vector gọn — theo dõi từng "dot" (event đơn) thay vì gộp thô.
- **Prune theo thời gian/số ô**: Dynamo giới hạn số cặp (node, counter); khi vượt ngưỡng, cắt bỏ ô cũ nhất kèm timestamp. Đánh đổi: có thể sinh **false conflict** hiếm gặp (thà thừa sibling còn hơn mất dữ liệu).
- **Interval Tree Clocks (ITC)**: cấu trúc cho hệ có node vào/ra động, cấp phát và thu hồi "danh phận" mà không cần biết trước N.

Nguyên tắc chọn dùng: vector/version clock **tuyệt vời khi số "người viết độc lập" nhỏ và ổn định** (số replica/coordinator). Khi mỗi end-user là một actor riêng, phải tối ưu (index theo server, prune, DVV) nếu không sẽ trả giá bằng metadata phình to hơn cả dữ liệu.

---

## 6. Vector clock vs Lamport clock — bảng chốt

| Tiêu chí | Lamport clock | Vector clock |
|---|---|---|
| Cấu trúc | 1 số nguyên | Vector N số nguyên |
| `a → b ⇒ clock(a) < clock(b)` | Có | Có |
| `clock(a) < clock(b) ⇒ a → b` | **KHÔNG** | **Có** (đặc trưng đầy đủ) |
| Phát hiện concurrent (`∥`) | **Không** | **Có** — đây là điểm cốt lõi |
| Cho thứ tự toàn phần | Có (kèm tie-break theo node id) | Chỉ thứ tự **bộ phận** (partial order) |
| Kích thước metadata | O(1) | O(N) |
| Dùng ở đâu | Total ordering rẻ, mutual exclusion | Phát hiện conflict, version vector (Dynamo/Riak), causal consistency |

Ghi nhớ một câu: **Lamport rẻ nhưng mù về concurrent; vector đắt hơn nhưng nhìn thấy conflict.** Chọn theo việc bạn có cần biết "hai thứ này có xung đột không" hay không.

---

## 7. Tóm tắt
- **Lamport clock** chỉ đảm bảo một chiều (`a → b ⇒ L(a) < L(b)`), nên **không phân biệt được concurrent** — nén nhân quả 2 chiều xuống 1 trục số làm mất thông tin.
- **Vector clock**: mỗi node giữ vector N ô. Ba quy tắc — internal (`V[i]+=1`), send (tăng rồi đính kèm), receive (**max từng ô** rồi `V[i]+=1`).
- **So sánh**: `V<W` ⇒ trước-sau nhân quả; **có ô trội hai phía** ⇒ **concurrent (`∥`)**. Vector clock **đặc trưng hoá đầy đủ** happens-before — điều Lamport không làm được.
- Tính tay 3 node cho thấy nó bắt đúng các cặp concurrent (e5∥e4, e7∥e3) mà Lamport sẽ đánh số sai thành có thứ tự.
- **Version vector** trong Dynamo/Riak dùng chính cơ chế này để tách **ghi đè hợp lệ** (`<`) khỏi **conflict** (`∥`); conflict thì giữ **sibling** cho app **reconcile** (union giỏ hàng...). Nhớ **gắn lại vclock khi ghi**.
- Giá phải trả là **kích thước O(N)** và metadata phình theo số actor/churn; giảm bằng **index theo server coordinator**, **pruning**, **DVV**, **ITC**.

> **Bài tiếp theo (Bài 18):** từ "phát hiện" thứ tự nhân quả, ta tiến sang **áp đặt** nó — **causal consistency & causal broadcast**: đảm bảo mọi node giao message theo đúng thứ tự nhân quả, nền tảng cho CRDT và collaborative editing.
