# Cách code chạy: compile, stack/heap & GC

Bạn viết một file `.py`, `.js` hay `.go`, gõ "run", và mọi thứ chạy. Nhưng giữa dòng text bạn viết và những electron chạy trong CPU có cả một hành trình dài. Hiểu hành trình đó không phải để khoe kiến thức — nó giải thích vì sao Python chậm hơn Go, vì sao app Java "khựng" 200ms lúc cao điểm, vì sao biến của bạn bị thay đổi ngoài ý muốn, và vì sao memory cứ tăng dù bạn "chẳng làm gì".

Bài này đi qua 3 thứ: (1) source code biến thành chương trình chạy thế nào, (2) bộ nhớ chia làm `stack` và `heap` ra sao, (3) `garbage collection` dọn rác kiểu gì và vì sao nó vẫn leak.

## Từ source code đến máy chạy

CPU không hiểu `for`, `if`, `print`. Nó chỉ hiểu **machine code** — những con số nhị phân là lệnh trực tiếp cho phần cứng (cộng 2 thanh ghi, nhảy tới địa chỉ này...). Mọi ngôn ngữ đều phải biến source code thành thứ CPU hiểu. Khác nhau là biến **lúc nào** và **bằng cách nào**.

Có 3 mô hình chính:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba mô hình thực thi code: compiled, interpreted, bytecode + JIT</title>
  <desc>Ba luồng song song. Compiled: source qua compiler thành binary machine code, CPU chạy thẳng. Interpreted: interpreter đọc và thực thi từng dòng source lúc chạy. Bytecode + JIT: source thành bytecode, VM chạy bytecode, JIT dịch hot path sang machine code.</desc>
  <defs>
    <marker id="ar1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <g font-size="12" fill="currentColor" text-anchor="middle">
    <text x="120" y="22" font-size="13" font-weight="700">COMPILED</text>
    <text x="120" y="38" font-size="10" opacity="0.6">C · C++ · Go · Rust</text>
    <text x="360" y="22" font-size="13" font-weight="700">INTERPRETED</text>
    <text x="360" y="38" font-size="10" opacity="0.6">Python · JS thuần · Ruby</text>
    <text x="600" y="22" font-size="13" font-weight="700">BYTECODE + JIT</text>
    <text x="600" y="38" font-size="10" opacity="0.6">Java/JVM · C#/.NET</text>
  </g>
  <line x1="240" y1="14" x2="240" y2="346" stroke="currentColor" stroke-opacity="0.15"/>
  <line x1="480" y1="14" x2="480" y2="346" stroke="currentColor" stroke-opacity="0.15"/>
  <g stroke="currentColor" stroke-opacity="0.45" marker-end="url(#ar1)" fill="none"><path d="M120 76 v18"/><path d="M120 132 v18"/></g>
  <g font-size="11.5" fill="currentColor" text-anchor="middle">
    <rect x="60" y="50" width="120" height="26" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="67">source.go</text>
    <rect x="60" y="94" width="120" height="38" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="110">binary</text>
    <text x="120" y="125" font-size="9.5" opacity="0.6">machine code</text>
    <rect x="60" y="150" width="120" height="38" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="120" y="166">CPU chạy thẳng</text>
    <text x="120" y="181" font-size="9.5" opacity="0.6">rất nhanh</text>
    <text x="120" y="86" font-size="9.5" opacity="0.55">compiler · lúc build</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.45" marker-end="url(#ar1)" fill="none"><path d="M360 76 v18"/></g>
  <g font-size="11.5" fill="currentColor" text-anchor="middle">
    <rect x="300" y="50" width="120" height="26" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="67">source.py</text>
    <rect x="300" y="94" width="120" height="94" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="118" font-weight="700">interpreter</text>
    <text x="360" y="138" font-size="10" opacity="0.7">đọc &amp; thực thi</text>
    <text x="360" y="153" font-size="10" opacity="0.7">từng dòng lúc run</text>
    <text x="360" y="174" font-size="9.5" opacity="0.55">không có binary</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.45" marker-end="url(#ar1)" fill="none"><path d="M600 76 v18"/><path d="M600 132 v18"/></g>
  <g font-size="11.5" fill="currentColor" text-anchor="middle">
    <rect x="540" y="50" width="120" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="67">source.java</text>
    <rect x="540" y="94" width="120" height="38" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="110">bytecode</text>
    <text x="600" y="125" font-size="9.5" opacity="0.6">.class · gọn, độc lập</text>
    <rect x="540" y="150" width="120" height="38" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="166">VM chạy bytecode</text>
    <text x="600" y="181" font-size="9.5" opacity="0.6">JVM · CLR</text>
    <text x="600" y="86" font-size="9.5" opacity="0.55">compiler · lúc build</text>
  </g>
  <g stroke="#f59e0b" stroke-opacity="0.7" marker-end="url(#ar1)" fill="none"><path d="M600 188 v18"/></g>
  <rect x="528" y="208" width="144" height="42" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="600" y="226" font-size="11.5" fill="currentColor" text-anchor="middle" font-weight="700">JIT → machine code</text>
  <text x="600" y="241" font-size="9.5" fill="currentColor" text-anchor="middle" opacity="0.65">cho hot path (phần "nóng")</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400" role="img" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bố cục bộ nhớ của một process: code, static/globals, heap, khoảng trống, stack</title>
  <desc>Từ địa chỉ thấp xuống địa chỉ cao: vùng Code chứa lệnh, vùng Static/Globals chứa biến toàn cục và hằng số, vùng Heap cấp phát động lớn dần xuống dưới, khoảng trống ở giữa, vùng Stack chứa biến local và call frame lớn dần lên trên. Heap và stack tăng trưởng ngược hướng nhau, gặp nhau ở giữa.</desc>
  <defs>
    <marker id="ad" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 0 L5 10 z" fill="currentColor"/></marker>
    <marker id="au" viewBox="0 0 10 10" refX="5" refY="1" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 10 L10 10 L5 0 z" fill="currentColor"/></marker>
  </defs>
  <text x="40" y="26" font-size="13" font-weight="700" fill="currentColor">Bộ nhớ của 1 process</text>
  <text x="40" y="52" font-size="10.5" fill="currentColor" opacity="0.6">Địa chỉ thấp</text>
  <text x="40" y="386" font-size="10.5" fill="currentColor" opacity="0.6">Địa chỉ cao</text>
  <rect x="120" y="44" width="240" height="44" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="63" font-size="12.5" font-weight="700" fill="currentColor" text-anchor="middle">Code (lệnh)</text>
  <text x="240" y="79" font-size="10" fill="currentColor" text-anchor="middle" opacity="0.6">machine code của bạn</text>
  <rect x="120" y="92" width="240" height="44" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="111" font-size="12.5" font-weight="700" fill="currentColor" text-anchor="middle">Static / Globals</text>
  <text x="240" y="127" font-size="10" fill="currentColor" text-anchor="middle" opacity="0.6">biến toàn cục, hằng số</text>
  <rect x="120" y="140" width="240" height="58" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="162" font-size="12.5" font-weight="700" fill="currentColor" text-anchor="middle">HEAP</text>
  <text x="240" y="178" font-size="10" fill="currentColor" text-anchor="middle" opacity="0.6">object cấp phát động</text>
  <line x1="240" y1="186" x2="240" y2="230" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#ad)"/>
  <text x="372" y="172" font-size="10" fill="currentColor" opacity="0.7">lớn dần xuống ↓</text>
  <rect x="120" y="200" width="240" height="96" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="4 4"/>
  <text x="160" y="252" font-size="10.5" fill="currentColor" text-anchor="middle" opacity="0.5">khoảng trống</text>
  <line x1="300" y1="290" x2="300" y2="262" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#au)"/>
  <rect x="120" y="298" width="240" height="58" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="240" y="320" font-size="12.5" font-weight="700" fill="currentColor" text-anchor="middle">STACK</text>
  <text x="240" y="336" font-size="10" fill="currentColor" text-anchor="middle" opacity="0.6">biến local, call frame</text>
  <text x="372" y="332" font-size="10" fill="currentColor" opacity="0.7">lớn dần lên ↑</text>
</svg>

### Stack: nhanh, gọn, tự dọn

Mỗi khi bạn **gọi một hàm**, một khối gọi là **stack frame** được đẩy lên stack. Frame đó chứa: tham số của hàm, biến local, và địa chỉ để quay về sau khi hàm xong. Khi hàm `return`, frame của nó bị **pop** (gỡ bỏ) ngay lập tức — bộ nhớ tự thu hồi, không cần ai dọn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 320" role="img" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Stack frame theo LIFO: chuỗi gọi a, b, c đẩy frame chồng lên rồi pop khi return</title>
  <desc>Bên trái: chuỗi gọi main gọi a, a gọi b, b gọi c, mỗi lần gọi đẩy một stack frame chồng lên trên. Khi đang ở trong c, stack từ dưới lên là main, frame a, frame b, frame c ở đỉnh đang chạy. Khi c return, frame c bị pop ngay lập tức và biến local x biến mất, theo nguyên tắc vào sau ra trước.</desc>
  <text x="20" y="26" font-size="13" font-weight="700" fill="currentColor">Chuỗi gọi hàm</text>
  <g font-size="11.5" fill="currentColor" text-anchor="middle">
    <rect x="20" y="44" width="150" height="34" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="95" y="66">main()</text>
    <rect x="40" y="98" width="150" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="115" y="120">a() → gọi b()</text>
    <rect x="60" y="152" width="150" height="34" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="135" y="174">b() → gọi c()</text>
    <rect x="80" y="206" width="150" height="48" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="155" y="226">c()</text>
    <text x="155" y="243" font-size="10" opacity="0.7">x := 5 (local)</text>
  </g>
  <line x1="395" y1="40" x2="395" y2="296" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="430" y="26" font-size="13" font-weight="700" fill="currentColor">STACK lúc đang ở trong c()</text>
  <g font-size="11.5" fill="currentColor" text-anchor="middle">
    <rect x="430" y="44" width="160" height="34" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="510" y="66" font-weight="700">frame c</text>
    <text x="608" y="65" font-size="10" text-anchor="start" opacity="0.75">← top (đang chạy)</text>
    <rect x="430" y="84" width="160" height="34" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="510" y="106">frame b</text>
    <rect x="430" y="124" width="160" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="510" y="146">frame a</text>
    <rect x="430" y="164" width="160" height="34" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="510" y="186">main</text>
  </g>
  <line x1="615" y1="60" x2="615" y2="232" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="624" y="150" font-size="10" fill="currentColor" opacity="0.65">đẩy chồng lên (LIFO)</text>
  <rect x="430" y="244" width="250" height="52" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 4"/>
  <text x="445" y="266" font-size="11" fill="currentColor" text-anchor="start">c() return → frame c <tspan font-weight="700">pop ngay</tspan>,</text>
  <text x="445" y="284" font-size="11" fill="currentColor" text-anchor="start">biến local x biến mất.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 270" role="img" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Value so với reference: biến chứa thẳng giá trị so với biến chứa địa chỉ trỏ tới heap</title>
  <desc>Bên trái là value: biến x bằng 5 nằm thẳng trên stack, bản thân biến chứa giá trị 5. Bên phải là reference: biến list nằm trên stack chỉ chứa một địa chỉ, mũi tên từ stack trỏ sang danh sách [1, 2, 3] nằm trên heap, dữ liệu thật ở heap.</desc>
  <text x="20" y="26" font-size="13" font-weight="700" fill="currentColor">VALUE</text>
  <text x="20" y="44" font-size="10.5" fill="currentColor" opacity="0.6">int x = 5 — biến chứa thẳng giá trị</text>
  <text x="56" y="86" font-size="10.5" fill="currentColor" opacity="0.6" text-anchor="middle">stack</text>
  <rect x="20" y="92" width="120" height="56" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="80" y="118" font-size="14" font-weight="700" fill="currentColor" text-anchor="middle">x = 5</text>
  <text x="80" y="136" font-size="9.5" fill="currentColor" text-anchor="middle" opacity="0.6">giá trị nằm đây</text>
  <text x="20" y="178" font-size="11" fill="currentColor">Bản thân biến <tspan font-weight="700">CHỨA 5</tspan>.</text>
  <line x1="320" y1="14" x2="320" y2="256" stroke="currentColor" stroke-opacity="0.15"/>
  <defs>
    <marker id="arf" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="350" y="26" font-size="13" font-weight="700" fill="currentColor">REFERENCE</text>
  <text x="350" y="44" font-size="10.5" fill="currentColor" opacity="0.6">list = [1, 2, 3] — biến chứa địa chỉ</text>
  <text x="412" y="86" font-size="10.5" fill="currentColor" opacity="0.6" text-anchor="middle">stack</text>
  <text x="580" y="86" font-size="10.5" fill="currentColor" opacity="0.6" text-anchor="middle">heap</text>
  <rect x="350" y="92" width="124" height="56" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="412" y="118" font-size="13" font-weight="700" fill="currentColor" text-anchor="middle">list ●</text>
  <text x="412" y="136" font-size="9.5" fill="currentColor" text-anchor="middle" opacity="0.6">địa chỉ</text>
  <line x1="474" y1="120" x2="514" y2="120" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#arf)"/>
  <rect x="518" y="92" width="124" height="56" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="580" y="124" font-size="13" font-weight="700" fill="currentColor" text-anchor="middle">[1, 2, 3]</text>
  <text x="350" y="178" font-size="11" fill="currentColor">Biến chứa <tspan font-weight="700">ĐỊA CHỈ</tspan>, dữ liệu ở heap.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 330" role="img" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Garbage collection mark-and-sweep: pha mark đánh dấu object sống, pha sweep dọn rác</title>
  <desc>Pha MARK: bắt đầu từ roots gồm biến local trên stack và biến global, đi theo mọi reference đánh dấu các object còn với tới được là A, B, D, E. Object C không có ai trỏ tới nên không được đánh dấu. Pha SWEEP: quét toàn heap, object C không được đánh dấu là rác nên bị thu hồi, các object A, B, D, E được giữ lại.</desc>
  <defs>
    <marker id="arg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="20" y="24" font-size="13" font-weight="700" fill="currentColor">1. MARK — đi từ roots, đánh dấu object còn với tới được</text>
  <rect x="20" y="40" width="96" height="60" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="68" y="66" font-size="12" font-weight="700" fill="currentColor" text-anchor="middle">roots</text>
  <text x="68" y="84" font-size="9" fill="currentColor" text-anchor="middle" opacity="0.6">stack + global</text>
  <g font-size="13" font-weight="700" text-anchor="middle">
    <circle cx="200" cy="70" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="200" y="68" fill="currentColor">A</text>
    <text x="200" y="84" font-size="8.5" font-weight="400" fill="currentColor" opacity="0.7">sống</text>
    <circle cx="300" cy="70" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="300" y="68" fill="currentColor">B</text>
    <text x="300" y="84" font-size="8.5" font-weight="400" fill="currentColor" opacity="0.7">sống</text>
    <circle cx="430" cy="70" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="430" y="68" fill="currentColor">D</text>
    <text x="430" y="84" font-size="8.5" font-weight="400" fill="currentColor" opacity="0.7">sống</text>
    <circle cx="530" cy="70" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="530" y="68" fill="currentColor">E</text>
    <text x="530" y="84" font-size="8.5" font-weight="400" fill="currentColor" opacity="0.7">sống</text>
    <circle cx="630" cy="70" r="24" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/>
    <text x="630" y="68" fill="currentColor">C</text>
    <text x="630" y="86" font-size="8.5" font-weight="400" fill="currentColor" opacity="0.7">rác</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#arg)">
    <path d="M116 70 H172"/>
    <path d="M224 70 H272"/>
    <path d="M116 80 C 250 150, 320 150, 412 86"/>
    <path d="M454 70 H502"/>
  </g>
  <text x="630" y="112" font-size="9.5" fill="currentColor" text-anchor="middle" opacity="0.7">không ai trỏ tới</text>
  <line x1="20" y1="142" x2="680" y2="142" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="20" y="172" font-size="13" font-weight="700" fill="currentColor">2. SWEEP — quét heap, object không đánh dấu = rác → thu hồi</text>
  <g font-size="13" font-weight="700" text-anchor="middle">
    <circle cx="200" cy="220" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="200" y="225" fill="currentColor">A</text>
    <circle cx="300" cy="220" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="300" y="225" fill="currentColor">B</text>
    <circle cx="430" cy="220" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="430" y="225" fill="currentColor">D</text>
    <circle cx="530" cy="220" r="24" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="530" y="225" fill="currentColor">E</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35">
    <line x1="614" y1="204" x2="646" y2="236"/>
    <line x1="646" y1="204" x2="614" y2="236"/>
  </g>
  <text x="630" y="262" font-size="9.5" fill="currentColor" text-anchor="middle" opacity="0.7">C bị sweep</text>
  <text x="20" y="262" font-size="11" fill="currentColor" opacity="0.75">A, B, D, E reachable → giữ lại.</text>
  <text x="20" y="282" font-size="11" fill="currentColor" opacity="0.75">C không reachable → bộ nhớ được thu hồi.</text>
</svg>

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
