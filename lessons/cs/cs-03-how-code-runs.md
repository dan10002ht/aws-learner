# Cách code chạy: compile, stack/heap & GC

Bạn viết một file `.py`, `.js` hay `.go`, gõ "run", và mọi thứ chạy. Nhưng giữa dòng text bạn viết và những electron chạy trong CPU có cả một hành trình dài. Hiểu hành trình đó không phải để khoe kiến thức — nó giải thích vì sao Python chậm hơn Go, vì sao app Java "khựng" 200ms lúc cao điểm, vì sao biến của bạn bị thay đổi ngoài ý muốn, và vì sao memory cứ tăng dù bạn "chẳng làm gì".

Bài này đi qua 3 thứ: (1) source code biến thành chương trình chạy thế nào, (2) bộ nhớ chia làm `stack` và `heap` ra sao, (3) `garbage collection` dọn rác kiểu gì và vì sao nó vẫn leak.

## Từ source code đến máy chạy

CPU không hiểu `for`, `if`, `print`. Nó chỉ hiểu **machine code** — những con số nhị phân là lệnh trực tiếp cho phần cứng (cộng 2 thanh ghi, nhảy tới địa chỉ này...). Mọi ngôn ngữ đều phải biến source code thành thứ CPU hiểu. Khác nhau là biến **lúc nào** và **bằng cách nào**.

Có 3 mô hình chính:

```
COMPILED (C, C++, Go, Rust)
  source.go --[compiler]--> machine code (binary)  --> CPU chạy thẳng
                 (lúc build, 1 lần)                      (lúc run, rất nhanh)

INTERPRETED (Python, JavaScript "thuần", Ruby)
  source.py --> [interpreter đọc & thực thi từng dòng lúc run]
                 (không có file binary; chạy đến đâu dịch đến đó)

BYTECODE + JIT (Java/JVM, C#/.NET)
  source.java --[compiler]--> bytecode (.class)  --> [VM chạy bytecode]
                                                       --[JIT]--> machine code cho phần "nóng"
```

### Compiled: dịch trước, chạy thẳng

C và Go dịch toàn bộ source thành một file binary chứa machine code **trước khi** chạy. Khi bạn chạy, CPU thực thi trực tiếp — không có lớp trung gian nào diễn giải.

- **Lợi:** nhanh nhất, dùng RAM ít, không cần cài runtime trên máy đích (một binary Go là chạy được).
- **Hại:** mỗi lần sửa code phải build lại; binary build cho macbook không chạy được trên server Linux (phải build riêng cho từng `OS`/`CPU`).

```
$ go build main.go      # tạo ra ./main (binary)
$ ./main                # CPU chạy thẳng, không cần "go" nữa
```

> 💡 Ghi nhớ: Binary compiled gắn chặt với cặp `OS` + kiến trúc CPU. Đây chính là lý do Docker image cho ARM (Apple Silicon, AWS Graviton) khác với image cho x86 — và vì sao bạn cần `docker buildx` hoặc multi-arch build khi deploy lên Graviton để tiết kiệm tiền trên AWS.

### Interpreted: dịch lúc chạy, từng dòng

Python và JavaScript (theo mô hình kinh điển) có một chương trình khác — **interpreter** — đọc source và thực thi từng lệnh tại thời điểm run. Không có file binary; bản thân interpreter (ví dụ `python`) mới là chương trình machine code, còn code của bạn chỉ là dữ liệu đầu vào cho nó.

- **Lợi:** sửa là chạy ngay (vòng lặp dev nhanh), cùng một file `.py` chạy mọi nơi miễn có interpreter.
- **Hại:** chậm hơn nhiều lần vì mỗi lệnh phải qua một lớp diễn giải; cần cài runtime đúng version trên máy đích.

Ví dụ cụ thể về cái giá: một vòng lặp cộng 100 triệu lần trong C chạy ~0.1s, trong Python thuần có thể mất 5-10s. Cùng thuật toán, khác ở việc CPU chạy thẳng hay phải đi qua interpreter mỗi vòng.

> ⚠️ Bẫy: Đừng dịch chữ "interpreted" thành "không bao giờ compile". Python thực ra compile source thành **bytecode** (`.pyc`) rồi mới interpret bytecode đó — đó là vì sao bạn thấy thư mục `__pycache__`. JavaScript trong V8 (Chrome, Node.js) còn có cả JIT. Ranh giới "interpreted vs compiled" ngày nay mờ hơn nhiều so với sách giáo khoa.

### Bytecode + JIT: cân bằng giữa hai thế giới

Java và C# đi đường giữa. Compiler dịch source thành **bytecode** — một dạng lệnh trung gian, gọn và độc lập với CPU thật. Bytecode chạy trên một **Virtual Machine** (JVM cho Java, CLR cho .NET). VM ban đầu interpret bytecode, nhưng nó quan sát: phần code nào chạy đi chạy lại nhiều (gọi là "hot path") thì **JIT compiler** (Just-In-Time) dịch luôn phần đó sang machine code ngay lúc chạy, rồi cache lại để lần sau chạy thẳng.

```
Lúc khởi động:   bytecode được interpret  -> chậm (warm-up)
Sau vài giây:    JIT đã dịch hot path     -> nhanh gần bằng C
```

Đây là lý do thực tế của hiện tượng "**warm-up**": một service Java vừa khởi động (hoặc một AWS Lambda Java vừa cold-start) chạy chậm trong vài request đầu, rồi nhanh dần lên khi JIT làm việc. Nếu bạn benchmark ngay sau khi start, con số sẽ tệ hơn thực tế.

| Mô hình | Ví dụ | Dịch khi nào | Tốc độ chạy | Khởi động | Cần runtime? |
|---|---|---|---|---|---|
| Compiled | C, Go, Rust | Trước, 1 lần | Nhanh nhất | Tức thì | Không |
| Interpreted | Python, Ruby | Lúc chạy, từng dòng | Chậm | Tức thì | Có |
| Bytecode + JIT | Java, C# | Bytecode trước, JIT lúc chạy | Nhanh (sau warm-up) | Có warm-up | Có (VM) |

## Bộ nhớ lúc chạy: stack vs heap

Khi chương trình chạy, nó xin `OS` cấp một vùng RAM. Vùng này chia thành nhiều phần, nhưng hai phần bạn phải nắm là **stack** và **heap**. Chúng khác nhau căn bản về cách quản lý, và hiểu sự khác biệt này giải thích hàng loạt bug "biến lạ", crash, và rò rỉ bộ nhớ.

```
Bộ nhớ của 1 process:

  Địa chỉ thấp ┌────────────────────┐
              │  Code (lệnh)       │  machine code của bạn
              ├────────────────────┤
              │  Static / Globals  │  biến toàn cục, hằng số
              ├────────────────────┤
              │       HEAP         │  object cấp phát động
              │         ↓          │  (lớn lên xuống dưới)
              │                    │
              │         ↑          │
              │       STACK        │  biến local, call frame
  Địa chỉ cao └────────────────────┘  (lớn lên trên)
```

### Stack: nhanh, gọn, tự dọn

Mỗi khi bạn **gọi một hàm**, một khối gọi là **stack frame** được đẩy lên stack. Frame đó chứa: tham số của hàm, biến local, và địa chỉ để quay về sau khi hàm xong. Khi hàm `return`, frame của nó bị **pop** (gỡ bỏ) ngay lập tức — bộ nhớ tự thu hồi, không cần ai dọn.

```
func a() {          STACK lúc đang ở trong c():
  b()                 ┌─────────┐
}                     │ frame c │  <- top (đang chạy)
func b() {            ├─────────┤
  c()                 │ frame b │
}                     ├─────────┤
func c() {            │ frame a │
  x := 5              ├─────────┤
}                     │ main    │
                      └─────────┘
                   c() return -> frame c pop ngay, x biến mất
```

Stack nhanh vì cấp phát chỉ là "dịch con trỏ top lên/xuống" — không phải đi tìm chỗ trống. Và nó tự dọn theo đúng thứ tự gọi hàm (vào sau ra trước, LIFO).

**Nhưng stack có giới hạn** — thường vài MB. Nếu bạn gọi hàm lồng quá sâu (thường là **đệ quy không có điểm dừng** hoặc đệ quy quá sâu), stack đầy và chương trình crash với lỗi kinh điển:

```python
def f(n):
    return f(n + 1)   # không bao giờ dừng
f(0)
# RecursionError / StackOverflowError / segfault
```

Đây chính là **stack overflow**. Mỗi lần gọi `f` đẩy một frame mới mà không bao giờ pop, đến khi stack hết chỗ.

> ⚠️ Bẫy: Đệ quy đẹp về mặt thuật toán nhưng nguy hiểm về stack. Duyệt một cây cân bằng sâu 30 tầng thì ổn; duyệt một linked list 1 triệu phần tử bằng đệ quy sẽ overflow. Với input lớn không kiểm soát được độ sâu, hãy chuyển sang vòng lặp + `stack` tự quản trên heap.

### Heap: linh hoạt, sống lâu, phải quản lý

Khi bạn tạo một object có kích thước không biết trước lúc biên dịch, hoặc cần nó sống **lâu hơn hàm đã tạo ra nó**, object đó nằm trên **heap**. Ví dụ: một `list` bạn append dần, một object `User` trả về từ hàm rồi dùng ở nơi khác, một mảng người dùng nhập kích thước lúc runtime.

Heap không tự dọn theo thứ tự gọi hàm. Object trên heap sống đến khi **không còn ai dùng nó nữa**. Câu hỏi "khi nào dọn?" chính là vấn đề trung tâm — và mỗi ngôn ngữ trả lời khác nhau:

- **C/C++:** bạn tự dọn bằng `free`/`delete`. Quên dọn → memory leak. Dọn rồi vẫn dùng → "use-after-free" (bug bảo mật nghiêm trọng).
- **Java, Python, Go, JS:** một bộ phận tên là **garbage collector** tự tìm và dọn (xem phần sau).
- **Rust:** compiler dùng "ownership" để chèn lệnh dọn tự động lúc build, không cần GC lúc chạy.

| | Stack | Heap |
|---|---|---|
| Lưu gì | Biến local, tham số, call frame | Object động, dữ liệu sống lâu |
| Tốc độ | Rất nhanh (dịch con trỏ) | Chậm hơn (tìm chỗ, quản lý) |
| Dọn dẹp | Tự động khi hàm return | GC, hoặc tay (C/C++) |
| Kích thước | Nhỏ, cố định (vài MB) | Lớn (gần hết RAM còn lại) |
| Lỗi điển hình | Stack overflow | Memory leak, fragmentation |

## Value vs reference: cái bẫy "biến bị đổi ngoài ý muốn"

Đây là chỗ stack/heap gặp bug hằng ngày của bạn. Một biến có thể chứa **chính giá trị** (value) hoặc chỉ chứa **địa chỉ trỏ tới giá trị nằm trên heap** (reference/pointer).

```
int x = 5;                  REFERENCE:
                            list = [1, 2, 3]
VALUE (nằm trên stack):
  ┌─────┐                   stack          heap
  │ x=5 │                   ┌────────┐     ┌───────────┐
  └─────┘                   │ list ──┼────>│ [1, 2, 3] │
                            └────────┘     └───────────┘
  Bản thân biến CHỨA 5      Biến chứa ĐỊA CHỈ, dữ liệu ở heap
```

Hệ quả thực tế nằm ở chuyện **gán** và **truyền vào hàm**:

```python
# Value: copy giá trị, hai biến độc lập
a = 5
b = a
b = 10
print(a)   # 5  -> a không đổi

# Reference: copy địa chỉ, hai biến trỏ CÙNG một object
x = [1, 2, 3]
y = x          # y trỏ cùng list với x
y.append(4)
print(x)   # [1, 2, 3, 4]  <- x "bị" đổi!
```

Hầu hết ngôn ngữ phổ biến là **pass-by-value**, nhưng "value" được truyền cho object lại là **địa chỉ** (con trỏ). Nên gọi là "pass reference by value". Kết quả: hàm có thể **sửa nội dung** object bạn truyền vào, nhưng không thể làm biến gốc trỏ sang object khác.

```python
def add_item(lst):
    lst.append(99)      # sửa nội dung -> ảnh hưởng biến gốc
    lst = [0, 0]        # gán lại biến local -> KHÔNG ảnh hưởng biến gốc

data = [1, 2]
add_item(data)
print(data)   # [1, 2, 99]  -> chỉ append có tác dụng
```

> ⚠️ Bẫy: Đây là nguồn của vô số bug khó chịu: bạn truyền một `dict` config vào hàm để "đọc", hàm vô tình `.update()` nó, và config toàn cục bị thay đổi cho phần còn lại của chương trình. Khi nghi ngờ, hãy copy (`list(x)`, `dict(x)`, deep copy nếu lồng nhau) trước khi đưa vào hàm có thể ghi.

## Garbage collection: dọn rác trên heap

Với ngôn ngữ có GC, bạn không tự `free`. Một tiến trình nền tự xác định object nào "đã chết" (không còn ai trỏ tới) và thu hồi bộ nhớ. Ý tưởng cốt lõi dễ hiểu nhất là **mark-and-sweep**:

```
1. MARK:  Bắt đầu từ "roots" (biến local trên stack, biến global),
          đi theo mọi reference, đánh dấu tất cả object còn "với tới được".

2. SWEEP: Quét toàn heap. Object nào KHÔNG được đánh dấu = rác -> thu hồi.

  roots ──> A ──> B        C   D ──> E
            (sống)(sống)  (rác)(sống)(sống)

  C không ai trỏ tới -> bị sweep.
```

Object còn "với tới được" (reachable) từ root thì còn sống. Object không thể với tới từ bất kỳ root nào là rác — kể cả khi hai object rác trỏ vào nhau, chúng vẫn bị dọn vì không root nào với tới được (mark-sweep xử lý được vòng lặp tham chiếu, khác với cách "đếm reference" thuần).

### Vì sao GC gây "pause"

Để mark cho chính xác, GC thường phải tạm dừng việc chạy code ứng dụng một chút — gọi là **stop-the-world pause**. Trong lúc pause, app không xử lý request. Với heap nhỏ thì pause vài ms không ai để ý. Nhưng với app Java giữ vài chục GB object sống, một lần GC lớn có thể pause **hàng trăm ms tới vài giây**.

Biểu hiện thực tế bạn sẽ gặp ở production:

```
Latency p50 = 8ms   (bình thường)
Latency p99 = 600ms (??!)   <- nhiều khả năng là GC pause
```

Một số request lẻ tẻ chậm bất thường dù CPU không cao, thường là dấu hiệu GC. Đây là lý do GC hiện đại (G1, ZGC trong JVM; GC của Go) thiết kế để pause cực ngắn và chạy đồng thời với app, đánh đổi bằng việc tốn CPU/RAM nhiều hơn.

> 💡 Ghi nhớ: GC giải phóng bạn khỏi quản lý bộ nhớ tay, nhưng không miễn phí — nó "ăn" CPU và gây pause. Khi tune một service có GC, ba nút vặn chính là: kích thước heap, thuật toán GC, và **lượng rác bạn tạo ra**. Tạo ít object tạm (đặc biệt trong vòng lặp nóng) là cách rẻ nhất để giảm áp lực GC.

### Có GC vẫn leak được

Hiểu lầm phổ biến: "ngôn ngữ có GC thì không thể memory leak". Sai. GC chỉ dọn được object **không còn ai trỏ tới**. Nếu bạn vô tình giữ một reference, object đó vẫn "sống" dưới mắt GC dù bạn không còn cần nó. Đó là **logical leak** — và nó âm thầm hơn leak ở C vì không có lỗi rõ ràng, chỉ là RAM cứ tăng dần đến khi crash hoặc bị OOM.

Thủ phạm kinh điển:

```python
cache = {}                       # global, sống mãi

def handle(request):
    cache[request.id] = request  # thêm vào, không bao giờ xoá
    # ... cache phình to vô hạn -> "leak" dù có GC
```

```javascript
// JS: event listener không gỡ -> giữ reference tới DOM/closure
element.addEventListener('click', handler);
// quên removeEventListener -> object liên quan không bao giờ được GC
```

Các nguồn leak "có GC" hay gặp: cache/collection toàn cục không có giới hạn, event listener/callback không gỡ, closure giữ object lớn, biến `static`/singleton tích luỹ. Cách tìm: dùng **heap profiler** (VisualVM cho JVM, `tracemalloc` cho Python, Chrome DevTools Memory tab cho JS) chụp heap ở hai thời điểm, so sánh xem loại object nào tăng và **ai đang giữ reference** tới nó (gọi là "retention path").

> ⚠️ Bẫy: Triệu chứng "service chạy vài tiếng rồi bị restart liên tục" trên Kubernetes/ECS rất hay là logical leak: RAM chạm `memory limit` của container → bị OOM-kill → restart → lặp lại. Đừng vội tăng limit; hãy profile heap để tìm collection nào đang phình.

## Ghép lại: một dòng đời ví dụ

```
1. Bạn viết source code.
2. Compiler/interpreter biến nó thành thứ CPU chạy được
   (machine code thẳng, hoặc bytecode + JIT, hoặc interpret từng dòng).
3. Khi chạy, mỗi lời gọi hàm đẩy frame lên STACK (biến local, tự dọn khi return).
4. Object động sống trên HEAP; biến giữ REFERENCE trỏ tới chúng.
5. GC định kỳ mark từ roots, sweep object không ai trỏ tới
   -> có thể gây pause; nếu bạn lỡ giữ reference -> leak.
```

## Vì sao kỹ sư cần biết

- **Debug "biến bị đổi vô cớ":** hiểu value vs reference giúp bạn nhận ra ngay rằng một hàm đã sửa object bạn truyền vào (vì truyền là truyền địa chỉ). Đây là một trong những lớp bug bạn sẽ gặp nhiều nhất trong nghề.
- **Debug crash & đệ quy sâu:** `StackOverflowError` không phải lỗi ngẫu nhiên — nó nói bạn gọi hàm lồng quá sâu. Biết stack có giới hạn giúp bạn chọn vòng lặp thay đệ quy cho input lớn.
- **Performance & latency đuôi:** p99 cao đột biến mà CPU thấp thường là GC pause. Biết điều này, bạn nhìn vào GC log thay vì đoán mò, và hiểu rằng "tạo ít rác" là cách tối ưu rẻ nhất.
- **Memory leak có GC:** RAM tăng đều đến khi OOM gần như luôn là một collection/cache/listener bạn quên dọn. Biết GC chỉ dọn thứ "không ai trỏ tới" giúp bạn tìm đúng retention path bằng profiler thay vì tăng RAM một cách mù quáng.
- **System design & chọn ngôn ngữ:** compiled (Go/Rust) cho service cần latency ổn định, khởi động tức thì, RAM thấp; JIT (Java/.NET) cho throughput cao sau warm-up; interpreted cho tốc độ phát triển. Hiểu trade-off này giúp bạn chọn đúng cho từng workload.
- **Chạm AWS:** binary compiled gắn với cặp `OS`/CPU → đây là gốc của việc build multi-arch cho **Graviton (ARM)** để giảm chi phí; warm-up của JIT giải thích cold-start chậm của **Lambda** Java/.NET; logical leak là nguyên nhân phổ biến của container bị **OOM-kill** rồi restart liên tục trên **ECS/EKS**.
