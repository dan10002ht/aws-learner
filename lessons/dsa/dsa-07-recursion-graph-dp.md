# Recursion, Graph & DP cơ bản

Đây là bài "tổng kết tư duy" của khoá. Ba chủ đề trong bài — **recursion (đệ quy)**, **graph (đồ thị)** và **dynamic programming (DP)** — nghe có vẻ rời rạc, nhưng thực ra chúng là một chuỗi liên tục: đệ quy là cách *diễn đạt* lời giải, graph là cách *mô hình hoá* quan hệ, còn DP là cách *tăng tốc* khi đệ quy tính lại quá nhiều thứ trùng lặp.

Mục tiêu rất thực dụng: bạn sẽ nhận ra **khi nào** một bài toán "có mùi" đệ quy, **khi nào** nó thực chất là duyệt graph, và **khi nào** thêm một cái bảng cache là biến lời giải từ chậm "vô vọng" thành nhanh tức thì. Đây cũng là nhóm câu hỏi xuất hiện dày đặc trong phỏng vấn.

## 1. Recursion — đệ quy

### 1.1. Trực giác

Đệ quy là khi một hàm **tự gọi chính nó** để giải một phiên bản *nhỏ hơn* của cùng bài toán. Hãy hình dung những con búp bê Nga (matryoshka): mở một con ra lại thấy một con nhỏ hơn bên trong, cứ thế cho đến con bé nhất không mở được nữa.

Mọi hàm đệ quy đúng đắn đều có hai phần:

- **Base case (trường hợp cơ sở)**: điều kiện dừng — con búp bê nhỏ nhất. Không có nó, hàm gọi mãi không ngừng.
- **Recursive case (bước đệ quy)**: thu nhỏ bài toán rồi gọi lại chính mình, tiến dần về base case.

Ví dụ kinh điển nhất: giai thừa `n! = n × (n-1)!`, với base case `0! = 1`.

```python
def factorial(n):
    if n <= 1:            # base case
        return 1
    return n * factorial(n - 1)   # recursive case
```
```javascript
function factorial(n) {
    if (n <= 1) return 1;              // base case
    return n * factorial(n - 1);      // recursive case
}
```
```java
static long factorial(int n) {
    if (n <= 1) return 1;             // base case
    return n * factorial(n - 1);      // recursive case
}
```
```go
func factorial(n int) int {
    if n <= 1 {                       // base case
        return 1
    }
    return n * factorial(n-1)         // recursive case
}
```

```cpp
long long factorial(int n) {
    if (n <= 1) return 1;             // base case
    return n * factorial(n - 1);      // recursive case
}
```

### 1.2. Call stack — vì sao đệ quy "ăn" bộ nhớ

Mỗi lần một hàm được gọi, máy đẩy một **stack frame** (khung chứa tham số, biến cục bộ, vị trí quay về) lên **call stack**. Với `factorial(4)`, stack chồng lên: `factorial(4)` → `factorial(3)` → `factorial(2)` → `factorial(1)`. Khi chạm base case, các frame lần lượt được lấy ra (pop) và nhân ngược lại: `1 → 2 → 6 → 24`.


<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="ds7-stack-t ds7-stack-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds7-stack-t">factorial(4): push rồi pop từ đỉnh</title>
<desc id="ds7-stack-d">Frame biến mất hẳn khi pop. Toàn cảnh chỉ còn stack trống và kết quả 24.</desc>
<defs><marker id="ds7-stack-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" text-anchor="middle" font-size="15" fill="currentColor">factorial(4): push rồi pop từ đỉnh</text>
<text x="155" y="58" text-anchor="middle" font-size="14" fill="currentColor">Call stack</text><text x="385" y="58" text-anchor="middle" font-size="14" fill="currentColor">Giá trị trả về</text><path d="M65 85 V287 H245 V85" fill="none" stroke="currentColor" stroke-opacity="0.3"/>
<g data-step="1" data-until="7"><rect x="75" y="245" width="160" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="155" y="269" text-anchor="middle" font-size="14" fill="currentColor">factorial(4)</text></g>
<g data-step="2" data-until="6"><rect x="75" y="201" width="160" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="155" y="225" text-anchor="middle" font-size="14" fill="currentColor">factorial(3)</text></g>
<g data-step="3" data-until="5"><rect x="75" y="157" width="160" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="155" y="181" text-anchor="middle" font-size="14" fill="currentColor">factorial(2)</text></g>
<g data-step="4" data-until="4"><rect x="75" y="113" width="160" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="155" y="137" text-anchor="middle" font-size="14" fill="currentColor">factorial(1)</text></g>
<g data-step="5" data-until="5"><text x="385" y="180" text-anchor="middle" font-size="17" fill="currentColor">base case → 1</text></g>
<g data-step="6" data-until="6"><text x="385" y="180" text-anchor="middle" font-size="17" fill="currentColor">2 × 1 = 2</text></g>
<g data-step="7" data-until="7"><text x="385" y="180" text-anchor="middle" font-size="17" fill="currentColor">3 × 2 = 6</text></g>
<g data-step="8"><text x="385" y="180" text-anchor="middle" font-size="17" fill="currentColor">4 × 6 = 24</text></g>
<g data-step="8"><text x="155" y="180" text-anchor="middle" font-size="14" fill="currentColor">Stack trống</text></g>
</svg>
<step-note data-step="1">Push factorial(4), chờ kết quả factorial(3).</step-note>
<step-note data-step="2">Push factorial(3), chờ factorial(2).</step-note>
<step-note data-step="3">Push factorial(2), chờ factorial(1).</step-note>
<step-note data-step="4">Push factorial(1), chạm base case; độ sâu tối đa 4 frame.</step-note>
<step-note data-step="5">Pop factorial(1), trả 1; stack còn 3 frame.</step-note>
<step-note data-step="6">Pop factorial(2), trả 2; stack còn 2 frame.</step-note>
<step-note data-step="7">Pop factorial(3), trả 6; stack còn 1 frame.</step-note>
<step-note data-step="8">Pop factorial(4), trả 24; stack trống. Thời gian O(n), bộ nhớ stack O(d).</step-note>
</step-flow>

Vì mỗi lần gọi tốn một frame, độ sâu đệ quy `d` tiêu tốn **O(d) bộ nhớ stack**. Đệ quy quá sâu (vài chục nghìn lần) sẽ tràn stack — `RecursionError` / `StackOverflowError`.

> Bẫy: Python mặc định giới hạn đệ quy ~1000 lần. Một vòng lặp đơn giản trên mảng 10^5 phần tử nếu viết kiểu đệ quy sẽ crash. Khi độ sâu có thể lớn, hãy chuyển sang **vòng lặp** hoặc dùng stack tường minh.

### 1.3. Đệ quy vs lặp (iteration)

Mọi thuật toán đệ quy đều **viết lại được** bằng vòng lặp, và ngược lại. Chọn cái nào?

| Tiêu chí | Đệ quy | Lặp |
| --- | --- | --- |
| Đọc/diễn đạt | Gọn, sát định nghĩa toán học | Dài hơn với bài "tự nhiên đệ quy" |
| Bộ nhớ | O(độ sâu) cho call stack | Thường O(1) |
| Cây/graph/chia để trị | Rất tự nhiên | Phải tự quản lý stack |
| Duyệt mảng tuyến tính | Lãng phí | Phù hợp nhất |

> Ghi nhớ: Dùng đệ quy khi bài toán **tự định nghĩa bằng chính nó** (cây, graph, chia để trị, backtracking). Dùng lặp khi chỉ đi tuyến tính qua dữ liệu — vừa nhanh hơn vừa không lo tràn stack.

## 2. Backtracking — quay lui

### 2.1. Trực giác

Backtracking là đệ quy có "tẩy". Bạn **thử** một lựa chọn, đi sâu vào nhánh đó; nếu thấy bế tắc (hoặc đã ra một kết quả), bạn **quay lui** — gỡ bỏ lựa chọn vừa rồi — rồi thử lựa chọn khác. Giống đi mê cung: gặp ngõ cụt thì lùi lại ngã rẽ gần nhất và chọn hướng khác.

Khung mẫu (template) của mọi bài backtracking gần như giống hệt nhau:

```text
backtrack(trạng_thái):
    nếu trạng_thái là lời giải hoàn chỉnh: ghi nhận, return
    với mỗi lựa chọn hợp lệ tiếp theo:
        thêm lựa chọn vào trạng_thái   # chọn
        backtrack(trạng_thái)          # đi sâu
        gỡ lựa chọn khỏi trạng_thái    # quay lui (undo)
```

### 2.2. Sinh hoán vị (permutations)

Bài điển hình: liệt kê mọi hoán vị của một mảng. Ý tưởng: ở mỗi vị trí, thử lần lượt từng phần tử *chưa dùng*.

Với <code>nums=[1,2,3]</code>, viền vàng là lời gọi hiện tại; các nhánh khác là lựa chọn có thể thử. F/T tương ứng False/True.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 450" role="img" aria-labelledby="dsg07-perm-t dsg07-perm-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg07-perm-t">Hoán vị [1,2,3]: chọn → đi sâu → gỡ</title>
<desc id="dsg07-perm-d">Cây đủ sáu lá; viền vàng đánh dấu lời gọi hiện tại. Trạng thái cũ biến mất tại cùng toạ độ khi undo.</desc>
<defs><marker id="dsg07-perm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="360.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Hoán vị [1,2,3]: chọn → đi sâu → gỡ</text>
<rect x="317" y="49" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="360" y="70" text-anchor="middle" font-size="13" fill="currentColor">[]</text>
<path d="M360 81 L125 126" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="82" y="127" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="125" y="148" text-anchor="middle" font-size="13" fill="currentColor">[1]</text>
<path d="M360 81 L360 126" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="317" y="127" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="360" y="148" text-anchor="middle" font-size="13" fill="currentColor">[2]</text>
<path d="M360 81 L595 126" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="552" y="127" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="595" y="148" text-anchor="middle" font-size="13" fill="currentColor">[3]</text>
<path d="M125 159 L65 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="22" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="65" y="226" text-anchor="middle" font-size="13" fill="currentColor">[1,2]</text>
<path d="M125 159 L183 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="140" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="183" y="226" text-anchor="middle" font-size="13" fill="currentColor">[1,3]</text>
<path d="M360 159 L301 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="258" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="301" y="226" text-anchor="middle" font-size="13" fill="currentColor">[2,1]</text>
<path d="M360 159 L419 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="376" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="419" y="226" text-anchor="middle" font-size="13" fill="currentColor">[2,3]</text>
<path d="M595 159 L537 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="494" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="537" y="226" text-anchor="middle" font-size="13" fill="currentColor">[3,1]</text>
<path d="M595 159 L655 204" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="612" y="205" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="655" y="226" text-anchor="middle" font-size="13" fill="currentColor">[3,2]</text>
<path d="M65 237 L65 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="22" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="65" y="304" text-anchor="middle" font-size="13" fill="currentColor">[1,2,3]</text>
<path d="M183 237 L183 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="140" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="183" y="304" text-anchor="middle" font-size="13" fill="currentColor">[1,3,2]</text>
<path d="M301 237 L301 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="258" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="301" y="304" text-anchor="middle" font-size="13" fill="currentColor">[2,1,3]</text>
<path d="M419 237 L419 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="376" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="419" y="304" text-anchor="middle" font-size="13" fill="currentColor">[2,3,1]</text>
<path d="M537 237 L537 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="494" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="537" y="304" text-anchor="middle" font-size="13" fill="currentColor">[3,1,2]</text>
<path d="M655 237 L655 282" fill="none" stroke="currentColor" marker-end="url(#dsg07-perm-a)"/>
<rect x="612" y="283" width="86" height="32" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="655" y="304" text-anchor="middle" font-size="13" fill="currentColor">[3,2,1]</text>
<rect x="35" y="365" width="650" height="64" rx="5" fill="#14b8a6" fill-opacity=".14" stroke="#14b8a6"/>
<text x="55" y="390" text-anchor="start" font-size="13" fill="currentColor">Trạng thái hiện tại</text>
<g data-step="1" data-until="1"><rect x="313" y="45" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[F,F,F]</text></g>
<g data-step="2" data-until="2"><rect x="78" y="123" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,F,F]</text></g>
<g data-step="3" data-until="3"><rect x="18" y="201" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,2]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,F]</text></g>
<g data-step="4" data-until="4"><rect x="18" y="279" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,2,3]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,T]</text></g>
<g data-step="5" data-until="5"><rect x="18" y="201" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,2]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,F]</text></g>
<g data-step="6" data-until="6"><rect x="78" y="123" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,F,F]</text></g>
<g data-step="7" data-until="7"><rect x="136" y="201" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,3]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,F,T]</text></g>
<g data-step="8" data-until="8"><rect x="136" y="279" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,3,2]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,T]</text></g>
<g data-step="9" data-until="9"><rect x="136" y="201" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1,3]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,F,T]</text></g>
<g data-step="10" data-until="10"><rect x="78" y="123" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[1]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,F,F]</text></g>
<g data-step="11" data-until="11"><rect x="313" y="45" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[F,F,F]</text></g>
<g data-step="12" data-until="12"><rect x="313" y="123" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[2]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[F,T,F]</text></g>
<g data-step="13" data-until="13"><rect x="254" y="201" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[2,1]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,F]</text></g>
<g data-step="14" data-until="14"><rect x="254" y="279" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[2,1,3]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[T,T,T]</text></g>
<g data-step="15"><rect x="313" y="45" width="94" height="40" rx="6" fill="none" stroke="#f59e0b" stroke-width="3"/><text x="210" y="411" text-anchor="middle" font-size="15" fill="currentColor">path=[]</text><text x="495" y="411" text-anchor="middle" font-size="15" fill="currentColor">used=[F,F,F]</text></g>
<g data-step="15"><rect x="20" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><rect x="138" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><rect x="256" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><rect x="374" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><rect x="492" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><rect x="610" y="281" width="90" height="36" rx="5" fill="none" stroke="#10b981" stroke-width="2"/><text x="360" y="348" text-anchor="middle" font-size="14" fill="currentColor">res: 6 bản sao = 6 lá của cây</text></g>
</svg>
<step-note data-step="1">Bắt đầu với path rỗng; cả ba phần tử đều chưa dùng.</step-note>
<step-note data-step="2">Chọn 1: used[0]=True rồi path.append(1); đi sâu vào nhánh 1.</step-note>
<step-note data-step="3">Bỏ qua 1 đã dùng, chọn 2 rồi đi sâu.</step-note>
<step-note data-step="4">Chọn 3, đủ độ dài: lưu bản copy [1,2,3], không lưu tham chiếu path.</step-note>
<step-note data-step="5">Return: used[2]=False và path.pop(); 3 lại dùng được.</step-note>
<step-note data-step="6">Hết lựa chọn ở [1,2], tiếp tục gỡ 2; trở về [1].</step-note>
<step-note data-step="7">Thử lựa chọn kế tiếp 3 ở cùng cấp, rồi đi sâu.</step-note>
<step-note data-step="8">Chọn 2: lưu lá thứ hai [1,3,2].</step-note>
<step-note data-step="9">Gỡ 2 sau khi lưu nghiệm; trở về [1,3].</step-note>
<step-note data-step="10">Hết nhánh [1,3], gỡ 3: lùi tầng thứ nhất.</step-note>
<step-note data-step="11">Nhánh bắt đầu bằng 1 đã xong; gỡ 1: lùi tầng thứ hai tới gốc.</step-note>
<step-note data-step="12">Chọn 2 ở gốc. Undo đã trả used về toàn False nên 1 có thể dùng lại.</step-note>
<step-note data-step="13">Đi sâu, chọn 1 trong nhánh bắt đầu bằng 2.</step-note>
<step-note data-step="14">Chọn 3, lưu [2,1,3]. Các nhánh còn lại chạy cùng khung.</step-note>
<step-note data-step="15">Sau khi duyệt hết, path rỗng và used toàn False; res giữ đủ 6 bản copy. Tổng chi phí O(n × n!).</step-note>
</step-flow>

```python
def permutations(nums):
    res, used, path = [], [False] * len(nums), []
    def backtrack():
        if len(path) == len(nums):
            res.append(path[:])          # copy lời giải
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True; path.append(nums[i])   # chọn
            backtrack()                            # đi sâu
            used[i] = False; path.pop()            # quay lui
    backtrack()
    return res
```
```javascript
function permutations(nums) {
    const res = [], used = Array(nums.length).fill(false), path = [];
    function backtrack() {
        if (path.length === nums.length) { res.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true; path.push(nums[i]);     // chọn
            backtrack();                            // đi sâu
            used[i] = false; path.pop();            // quay lui
        }
    }
    backtrack();
    return res;
}
```
```java
static List<List<Integer>> permutations(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    boolean[] used = new boolean[nums.length];
    List<Integer> path = new ArrayList<>();
    backtrack(nums, used, path, res);
    return res;
}
static void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; path.add(nums[i]);          // chọn
        backtrack(nums, used, path, res);           // đi sâu
        used[i] = false; path.remove(path.size() - 1); // quay lui
    }
}
```
```go
func permutations(nums []int) [][]int {
    res := [][]int{}
    used := make([]bool, len(nums))
    path := []int{}
    var backtrack func()
    backtrack = func() {
        if len(path) == len(nums) {
            cp := append([]int{}, path...)
            res = append(res, cp)
            return
        }
        for i := range nums {
            if used[i] {
                continue
            }
            used[i] = true; path = append(path, nums[i])     // chọn
            backtrack()                                      // đi sâu
            used[i] = false; path = path[:len(path)-1]        // quay lui
        }
    }
    backtrack()
    return res
}
```

```cpp
std::vector<std::vector<int>> permutations(const std::vector<int>& nums) {
    std::vector<std::vector<int>> res;
    std::vector<bool> used(nums.size(), false);
    std::vector<int> path;
    std::function<void()> backtrack = [&]() {
        if (path.size() == nums.size()) {
            res.push_back(path);                 // copy lời giải
            return;
        }
        for (size_t i = 0; i < nums.size(); i++) {
            if (used[i]) continue;
            used[i] = true; path.push_back(nums[i]);     // chọn
            backtrack();                                 // đi sâu
            used[i] = false; path.pop_back();            // quay lui
        }
    };
    backtrack();
    return res;
}
```

Số hoán vị là `n!`, nên độ phức tạp là **O(n × n!)** — backtracking vốn dĩ "đắt", chỉ dùng khi `n` nhỏ.

> Ghi nhớ: **Tổ hợp (combinations)** chỉ khác hoán vị ở một chỗ — để tránh đếm lặp `{1,2}` và `{2,1}`, ta truyền thêm một chỉ số `start` và vòng lặp chỉ chạy từ `start` trở đi, không quay lại các phần tử đã xét.

### 2.3. Ý tưởng N-queens

Bài N-queens: đặt `N` quân hậu lên bàn cờ `N×N` sao cho không quân nào ăn được quân nào (không cùng hàng, cột, đường chéo). Cách tiếp cận backtracking:

- Đặt **mỗi hàng đúng một quân hậu** (vì hai hậu cùng hàng là ăn nhau ngay).
- Ở hàng `r`, thử từng cột `c`. Kiểm tra `c` có an toàn không bằng ba tập đã chiếm: `cols`, đường chéo `\` (`r - c`), đường chéo `/` (`r + c`).
- An toàn thì đặt, đệ quy sang hàng `r+1`; xong thì gỡ ra (quay lui) để thử cột khác.

Mẹo phỏng vấn: dùng `set` để kiểm tra xung đột đường chéo trong O(1) thay vì quét cả bàn cờ — đây chính là chỗ kiến thức hash set của bài trước phát huy.

Bấm từng bước để thấy hậu bị gỡ khi một hàng không còn ô an toàn.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 350" role="img" aria-labelledby="dsg07-queen-t dsg07-queen-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg07-queen-t">4-Queens: thử cột, cắt nhánh, quay lui</title>
<desc id="dsg07-queen-d">Một bàn cờ cố định; hậu bị gỡ và các giá trị tập cũ biến mất. Đi hết nhánh cột 0 trước khi tìm nghiệm cột [1,3,0,2].</desc>
<defs><marker id="dsg07-queen-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">4-Queens: thử cột, cắt nhánh, quay lui</text>
<text x="155" y="52" text-anchor="middle" font-size="13" fill="currentColor">Cột c</text>
<text x="380" y="52" text-anchor="middle" font-size="14" fill="currentColor">Tập đã chiếm</text><text x="71" y="65" text-anchor="middle" font-size="13" fill="currentColor">0</text><text x="123" y="65" text-anchor="middle" font-size="13" fill="currentColor">1</text><text x="175" y="65" text-anchor="middle" font-size="13" fill="currentColor">2</text><text x="227" y="65" text-anchor="middle" font-size="13" fill="currentColor">3</text>
<text x="22" y="99" text-anchor="middle" font-size="14" fill="currentColor">0</text>
<rect x="45" y="70" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="97" y="70" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="149" y="70" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="201" y="70" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<text x="22" y="151" text-anchor="middle" font-size="14" fill="currentColor">1</text>
<rect x="45" y="122" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="97" y="122" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="149" y="122" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="201" y="122" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<text x="22" y="203" text-anchor="middle" font-size="14" fill="currentColor">2</text>
<rect x="45" y="174" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="97" y="174" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="149" y="174" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="201" y="174" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<text x="22" y="255" text-anchor="middle" font-size="14" fill="currentColor">3</text>
<rect x="45" y="226" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="97" y="226" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="149" y="226" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="201" y="226" width="52" height="52" rx="5" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
<text x="155" y="307" text-anchor="middle" font-size="13" fill="currentColor">Q: hậu đã đặt · đỏ: bị tấn công</text>
<text x="155" y="329" text-anchor="middle" font-size="13" fill="currentColor">Viền vàng: ô đang thử</text>
<g data-step="2" data-until="10"><text x="71" y="104" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="12"><rect x="46" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><text x="123" y="104" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="2" data-until="10"><rect x="98" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="150" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="150" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="202" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="202" y="71" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="46" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="46" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="98" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="98" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="3" data-until="4"><text x="175" y="156" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="6" data-until="9"><rect x="150" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="150" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="6" data-until="9"><text x="227" y="156" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="14"><text x="227" y="156" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="3" data-until="4"><rect x="202" y="123" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="15"><text x="71" y="208" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="2" data-until="10"><rect x="46" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="7" data-until="8"><text x="123" y="208" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="3" data-until="4"><rect x="98" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="98" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="150" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="14"><rect x="150" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="3" data-until="4"><rect x="202" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="6" data-until="9"><rect x="202" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="202" y="175" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="46" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="15"><rect x="46" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="6" data-until="9"><rect x="98" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="12"><rect x="98" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="16"><text x="175" y="260" text-anchor="middle" font-size="25" fill="currentColor">Q</text></g>
<g data-step="3" data-until="4"><rect x="150" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="7" data-until="8"><rect x="150" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="2" data-until="10"><rect x="202" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="14"><rect x="202" y="227" width="50" height="50" fill="#f43f5e" fill-opacity="0.35"/></g>
<g data-step="1" data-until="1"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = []</text></g>
<g data-step="2" data-until="2"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0]</text></g>
<g data-step="3" data-until="3"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,2}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-1,0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,3}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,2]</text></g>
<g data-step="4" data-until="4"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,2}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-1,0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,3}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,2]</text><rect x="100" y="177" width="46" height="46" fill="none" stroke="#f59e0b" stroke-width="4"/></g>
<g data-step="5" data-until="5"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0]</text></g>
<g data-step="6" data-until="6"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,3]</text></g>
<g data-step="7" data-until="7"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,1,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,0,1}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,3,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,3,1]</text></g>
<g data-step="8" data-until="8"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,1,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,0,1}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,3,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,3,1]</text><rect x="152" y="229" width="46" height="46" fill="none" stroke="#f59e0b" stroke-width="4"/></g>
<g data-step="9" data-until="9"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0,3]</text></g>
<g data-step="10" data-until="10"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {0}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {0}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [0]</text></g>
<g data-step="11" data-until="11"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = []</text></g>
<g data-step="12" data-until="12"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {1}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-1}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {1}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [1]</text></g>
<g data-step="13" data-until="13"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {1}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-1}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {1}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [1]</text><rect x="48" y="125" width="46" height="46" fill="none" stroke="#f59e0b" stroke-width="4"/></g>
<g data-step="14" data-until="14"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {1,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,-1}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {1,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [1,3]</text></g>
<g data-step="15" data-until="15"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,1,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,-1,2}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {1,2,4}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [1,3,0]</text></g>
<g data-step="16"><text x="280" y="95" text-anchor="start" font-size="14" fill="currentColor">cols = {0,1,2,3}</text><text x="280" y="150" text-anchor="start" font-size="14" fill="currentColor">r-c = {-2,-1,1,2}</text><text x="280" y="205" text-anchor="start" font-size="14" fill="currentColor">r+c = {1,2,4,5}</text><text x="280" y="265" text-anchor="start" font-size="14" fill="currentColor">path = [1,3,0,2]</text></g>
</svg>
<step-note data-step="1">Hàng/cột đánh số 0..3. Mỗi hàng đặt một hậu; ô màu đỏ nhạt bị các hậu hiện tại tấn công.</step-note>
<step-note data-step="2">Đặt Q tại (0,0); thêm c=0, r-c=0, r+c=0 vào ba tập.</step-note>
<step-note data-step="3">Hàng 1 bỏ cột 0,1 vì xung đột; đặt tại cột 2, lựa chọn an toàn đầu tiên.</step-note>
<step-note data-step="4">Hàng 2 không có cột an toàn: ô thử (2,1) có r+c=3 trùng hậu (1,2). Cắt nhánh, không đặt hậu vào ô thử.</step-note>
<step-note data-step="5">Gỡ Q(1,2), đồng thời xoá 2, -1, 3 khỏi ba tập. Thử cột kế tiếp ở hàng 1.</step-note>
<step-note data-step="6">Đặt Q(1,3), rồi đi sâu xuống hàng 2.</step-note>
<step-note data-step="7">Đặt Q(2,1), lựa chọn an toàn đầu tiên ở hàng 2.</step-note>
<step-note data-step="8">Hàng 3 hết chỗ: (3,2) trùng r-c=1 với (2,1); các cột khác cũng bị tấn công.</step-note>
<step-note data-step="9">Gỡ Q(2,1); các cột còn lại của hàng 2 cũng xung đột nên trả về.</step-note>
<step-note data-step="10">Gỡ Q(1,3); hàng 1 không còn cột để thử.</step-note>
<step-note data-step="11">Gỡ Q(0,0): cả nhánh bắt đầu cột 0 đã thất bại, ba tập rỗng trở lại.</step-note>
<step-note data-step="12">Hàng 0 chuyển sang cột 1, bắt đầu nhánh mới.</step-note>
<step-note data-step="13">Thử (1,0): r+c=1 trùng (0,1); cột 1 và 2 cũng không hợp lệ. Kiểm tra set trung bình O(1).</step-note>
<step-note data-step="14">Đặt Q(1,3), cột an toàn duy nhất tại hàng 1.</step-note>
<step-note data-step="15">Đặt Q(2,0); ba tập không có xung đột.</step-note>
<step-note data-step="16">Đặt Q(3,2), đủ 4 hàng: ghi nhận nghiệm [1,3,0,2]. Nếu cần mọi nghiệm thì tiếp tục undo sau khi copy.</step-note>
</step-flow>

## 3. Graph — đồ thị

### 3.1. Khái niệm & biểu diễn

Graph gồm các **node (đỉnh)** nối với nhau bằng **edge (cạnh)**. Nó mô hình hoá *quan hệ*: mạng xã hội (ai theo dõi ai), bản đồ đường đi, dependency giữa các task, đồ thị gọi hàm... Rất nhiều bài "thực tế" thực ra là bài graph trá hình.

Cách biểu diễn thực dụng nhất là **adjacency list (danh sách kề)**: với mỗi node, lưu danh sách các node mà nó nối tới. Tốn **O(V + E)** bộ nhớ (V = số đỉnh, E = số cạnh), gọn hơn nhiều so với adjacency matrix `O(V²)` khi đồ thị thưa.



<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 240" role="img" aria-labelledby="dsg07-edge-t dsg07-edge-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg07-edge-t">Một cạnh vô hướng: hai lần append</title>
<desc id="dsg07-edge-d">Một cạnh vô hướng: hai lần append</desc>
<defs><marker id="dsg07-edge-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Một cạnh vô hướng: hai lần append</text>
<text x="260" y="53" text-anchor="middle" font-size="14" fill="currentColor">Cạnh vô hướng: add_edge(0,1)</text>
<rect x="60" y="100" width="60" height="50" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="90" y="132" text-anchor="middle" font-size="18" fill="currentColor">0</text>
<rect x="210" y="100" width="60" height="50" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="240" y="132" text-anchor="middle" font-size="18" fill="currentColor">1</text>
<text x="340" y="117" text-anchor="middle" font-size="14" fill="currentColor">graph[0]</text>
<text x="340" y="187" text-anchor="middle" font-size="14" fill="currentColor">graph[1]</text>
<g data-step="1"><path d="M120 125 L207 125" fill="none" stroke="currentColor" marker-end="url(#dsg07-edge-a)"/><text x="430" y="117" text-anchor="middle" font-size="16" fill="currentColor">[1]</text></g>
<g data-step="2"><path d="M210 139 L123 139" fill="none" stroke="currentColor" marker-end="url(#dsg07-edge-a)"/><text x="430" y="187" text-anchor="middle" font-size="16" fill="currentColor">[0]</text></g>
</svg>
<step-note data-step="1">Thêm v=1 vào graph[0]; chiều 0 → 1 đã có trong danh sách kề.</step-note>
<step-note data-step="2">Thêm u=0 vào graph[1] để có chiều ngược lại. Một cạnh vô hướng được lưu hai lần; tổng bộ nhớ O(V+E).</step-note>
</step-flow>

```python
from collections import defaultdict
graph = defaultdict(list)
def add_edge(u, v):          # cạnh vô hướng
    graph[u].append(v)
    graph[v].append(u)
```
```javascript
const graph = new Map();
function addEdge(u, v) {                 // cạnh vô hướng
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u).push(v);
    graph.get(v).push(u);
}
```
```java
Map<Integer, List<Integer>> graph = new HashMap<>();
void addEdge(int u, int v) {             // cạnh vô hướng
    graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
    graph.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
}
```
```go
graph := map[int][]int{}
addEdge := func(u, v int) {              // cạnh vô hướng
    graph[u] = append(graph[u], v)
    graph[v] = append(graph[v], u)
}
```

```cpp
std::unordered_map<int, std::vector<int>> graph;
auto addEdge = [&](int u, int v) {       // cạnh vô hướng
    graph[u].push_back(v);
    graph[v].push_back(u);
};
```

### 3.2. BFS — duyệt theo chiều rộng

BFS lan từ node nguồn ra **theo từng lớp**: thăm tất cả hàng xóm trực tiếp trước, rồi mới đến hàng xóm-của-hàng-xóm. Dùng một **queue (FIFO)** và một tập `visited`. BFS đặc biệt giá trị vì trên đồ thị **không trọng số**, nó tìm được **đường đi ngắn nhất** (ít cạnh nhất).

```python
from collections import deque
def bfs(graph, start):
    visited, order = {start}, []
    q = deque([start])
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                q.append(nb)
    return order
```
```javascript
function bfs(graph, start) {
    const visited = new Set([start]), order = [];
    const q = [start];
    while (q.length) {
        const node = q.shift();
        order.push(node);
        for (const nb of (graph.get(node) || [])) {
            if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
        }
    }
    return order;
}
```
```java
static List<Integer> bfs(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>(); visited.add(start);
    List<Integer> order = new ArrayList<>();
    Deque<Integer> q = new ArrayDeque<>(); q.add(start);
    while (!q.isEmpty()) {
        int node = q.poll();
        order.add(node);
        for (int nb : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(nb)) { visited.add(nb); q.add(nb); }
        }
    }
    return order;
}
```
```go
func bfs(graph map[int][]int, start int) []int {
    visited := map[int]bool{start: true}
    order := []int{}
    q := []int{start}
    for len(q) > 0 {
        node := q[0]
        q = q[1:]
        order = append(order, node)
        for _, nb := range graph[node] {
            if !visited[nb] {
                visited[nb] = true
                q = append(q, nb)
            }
        }
    }
    return order
}
```

```cpp
std::vector<int> bfs(std::unordered_map<int, std::vector<int>>& graph, int start) {
    std::unordered_set<int> visited{start};
    std::vector<int> order;
    std::queue<int> q;
    q.push(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        order.push_back(node);
        for (int nb : graph[node]) {
            if (!visited.count(nb)) {
                visited.insert(nb);
                q.push(nb);
            }
        }
    }
    return order;
}
```

### 3.3. DFS — duyệt theo chiều sâu

DFS đi **sâu hết một nhánh** rồi mới quay lại. Viết tự nhiên bằng đệ quy (dùng call stack) hoặc bằng stack tường minh. DFS hợp cho: phát hiện chu trình, đếm thành phần liên thông, topological sort, "flood fill".

```python
def dfs(graph, node, visited, order):
    visited.add(node)
    order.append(node)
    for nb in graph[node]:
        if nb not in visited:
            dfs(graph, nb, visited, order)
    return order
```
```javascript
function dfs(graph, node, visited, order) {
    visited.add(node);
    order.push(node);
    for (const nb of (graph.get(node) || [])) {
        if (!visited.has(nb)) dfs(graph, nb, visited, order);
    }
    return order;
}
```
```java
static void dfs(Map<Integer, List<Integer>> graph, int node,
                Set<Integer> visited, List<Integer> order) {
    visited.add(node);
    order.add(node);
    for (int nb : graph.getOrDefault(node, List.of())) {
        if (!visited.contains(nb)) dfs(graph, nb, visited, order);
    }
}
```
```go
func dfs(graph map[int][]int, node int, visited map[int]bool, order *[]int) {
    visited[node] = true
    *order = append(*order, node)
    for _, nb := range graph[node] {
        if !visited[nb] {
            dfs(graph, nb, visited, order)
        }
    }
}
```

```cpp
void dfs(std::unordered_map<int, std::vector<int>>& graph, int node,
         std::unordered_set<int>& visited, std::vector<int>& order) {
    visited.insert(node);
    order.push_back(node);
    for (int nb : graph[node]) {
        if (!visited.count(nb)) dfs(graph, nb, visited, order);
    }
}
```

Cả BFS và DFS đều chạy **O(V + E)** vì mỗi đỉnh và mỗi cạnh được xét đúng một lần.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="ds7-bfs-t ds7-bfs-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds7-bfs-t">BFS: frontier lan theo lớp</title>
<desc id="ds7-bfs-d">BFS: frontier lan theo lớp. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds7-bfs-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">BFS: frontier lan theo lớp</text>
<path d="M260 65 L150 140" stroke="currentColor" stroke-opacity="0.2"/><path d="M260 65 L370 140" stroke="currentColor" stroke-opacity="0.2"/><path d="M150 140 L85 230" stroke="currentColor" stroke-opacity="0.2"/><path d="M150 140 L215 230" stroke="currentColor" stroke-opacity="0.2"/><path d="M370 140 L410 230" stroke="currentColor" stroke-opacity="0.2"/>
<g data-step="1"><circle cx="260" cy="65" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="70" font-size="14" text-anchor="middle" fill="currentColor">A</text><text x="290" y="53" font-size="13" text-anchor="middle" fill="currentColor">1</text></g>
<g data-step="2"><circle cx="150" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="150" y="145" font-size="14" text-anchor="middle" fill="currentColor">B</text><text x="180" y="128" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="370" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="370" y="145" font-size="14" text-anchor="middle" fill="currentColor">C</text><text x="400" y="128" font-size="13" text-anchor="middle" fill="currentColor">3</text></g>
<g data-step="3"><circle cx="85" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="85" y="235" font-size="14" text-anchor="middle" fill="currentColor">D</text><text x="115" y="218" font-size="13" text-anchor="middle" fill="currentColor">4</text><circle cx="215" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="215" y="235" font-size="14" text-anchor="middle" fill="currentColor">E</text><text x="245" y="218" font-size="13" text-anchor="middle" fill="currentColor">5</text></g>
<g data-step="4"><circle cx="410" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="235" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="440" y="218" font-size="13" text-anchor="middle" fill="currentColor">6</text></g>
</svg>
<step-note data-step="1">Khởi tạo queue [A], đánh dấu A ngay khi enqueue.</step-note>
<step-note data-step="2">Pop A, enqueue B rồi C: queue [B,C]. Hai node ở lớp cách A một cạnh đã được đánh dấu.</step-note>
<step-note data-step="3">Pop B, enqueue D rồi E: queue [C,D,E]. D và E cách A hai cạnh, vẫn phải đợi C.</step-note>
<step-note data-step="4">Pop C, enqueue F: queue [D,E,F]. Sau đó pop D, E, F, queue rỗng; thứ tự A, B, C, D, E, F. Tổng O(V+E).</step-note>
</step-flow>

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="ds7-dfs-t ds7-dfs-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds7-dfs-t">DFS: đi sâu rồi quay về</title>
<desc id="ds7-dfs-d">DFS: đi sâu rồi quay về. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds7-dfs-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">DFS: đi sâu rồi quay về</text>
<path d="M260 65 L150 140" stroke="currentColor" stroke-opacity="0.2"/><path d="M260 65 L370 140" stroke="currentColor" stroke-opacity="0.2"/><path d="M150 140 L85 230" stroke="currentColor" stroke-opacity="0.2"/><path d="M150 140 L215 230" stroke="currentColor" stroke-opacity="0.2"/><path d="M370 140 L410 230" stroke="currentColor" stroke-opacity="0.2"/>
<g data-step="1"><circle cx="260" cy="65" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="70" font-size="14" text-anchor="middle" fill="currentColor">A</text><text x="290" y="53" font-size="13" text-anchor="middle" fill="currentColor">1</text></g>
<g data-step="2"><circle cx="150" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="150" y="145" font-size="14" text-anchor="middle" fill="currentColor">B</text><text x="180" y="128" font-size="13" text-anchor="middle" fill="currentColor">2</text></g>
<g data-step="3"><circle cx="85" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="85" y="235" font-size="14" text-anchor="middle" fill="currentColor">D</text><text x="115" y="218" font-size="13" text-anchor="middle" fill="currentColor">3</text></g>
<g data-step="4"><circle cx="215" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="215" y="235" font-size="14" text-anchor="middle" fill="currentColor">E</text><text x="245" y="218" font-size="13" text-anchor="middle" fill="currentColor">4</text></g>
<g data-step="5"><circle cx="370" cy="140" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="370" y="145" font-size="14" text-anchor="middle" fill="currentColor">C</text><text x="400" y="128" font-size="13" text-anchor="middle" fill="currentColor">5</text></g>
<g data-step="6"><circle cx="410" cy="230" r="21" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="235" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="440" y="218" font-size="13" text-anchor="middle" fill="currentColor">6</text></g>
</svg>
<step-note data-step="1">Vào A, đánh dấu visited; thử B trước C.</step-note>
<step-note data-step="2">Vào B; A đã thăm nên bỏ qua cạnh quay về.</step-note>
<step-note data-step="3">Vào D; hết hàng xóm chưa thăm nên trả về B.</step-note>
<step-note data-step="4">B thử E sau khi D trả về; xong E, B trả về A.</step-note>
<step-note data-step="5">A tiếp tục vào C: nhánh B đã hoàn tất.</step-note>
<step-note data-step="6">Vào F rồi trả về C và A. Thứ tự A, B, D, E, C, F; O(V+E).</step-note>
</step-flow>

| Thuật toán | Cấu trúc | Đường ngắn nhất (không trọng số)? | Hợp cho |
| --- | --- | --- | --- |
| BFS | Queue (FIFO) | Có | Khoảng cách ngắn nhất, lan theo lớp |
| DFS | Stack / đệ quy | Không | Chu trình, liên thông, topo sort |

> Bẫy: **Luôn đánh dấu `visited`** trước/ngay khi đưa node vào queue/stack. Quên bước này, đồ thị có chu trình sẽ khiến bạn lặp vô hạn. Lỗi kinh điển: đánh dấu `visited` ở lúc *lấy ra* thay vì lúc *đưa vào* queue → cùng một node bị nhồi vào queue nhiều lần.

## 4. Dynamic Programming nhập môn

### 4.1. Khi nào dùng DP?

DP áp dụng khi bài toán có **hai dấu hiệu**:

1. **Overlapping subproblems (bài con trùng lặp)**: cùng một bài con bị tính đi tính lại nhiều lần.
2. **Optimal substructure (cấu trúc con tối ưu)**: lời giải tối ưu của bài lớn ghép từ lời giải tối ưu của các bài con.

Ý tưởng cốt lõi: **tính mỗi bài con đúng một lần và lưu kết quả lại** để dùng lại. Có hai trường phái:

- **Memoization (top-down)**: vẫn viết đệ quy như bình thường, nhưng thêm một cache; trước khi tính, kiểm tra cache.
- **Tabulation (bottom-up)**: bỏ đệ quy, điền dần một bảng từ bài con nhỏ nhất lên.

### 4.2. Fibonacci — minh hoạ sức mạnh của cache

`fib(n) = fib(n-1) + fib(n-2)`. Đệ quy ngây thơ là **O(2^n)** vì `fib(n-2)` bị tính lại vô số lần. Thêm cache → **O(n)**.

<ab-toggle data-labels="Chưa cache|Có memo">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 374" role="img" aria-labelledby="dsa07-memo-0-t dsa07-memo-0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa07-memo-0-t">Cây fib(5) có và không memo</title>
<desc id="dsa07-memo-0-d">Cùng cây lời gọi, các cây con dưới cache hit bị làm mờ. Duyệt nhánh trái trước.</desc>
<text x="260" y="22" font-size="14" text-anchor="middle" fill="currentColor">fib(5) : cây lời gọi</text>
<g opacity="1">
<path d="M260 62 L166 94" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M260 62 L406 94" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M166 122 L102 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M166 122 L240 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M406 122 L364 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M406 122 L462 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M102 182 L62 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M102 182 L154 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M240 182 L210 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M240 182 L274 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M364 182 L336 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M364 182 L400 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M62 242 L32 274" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M62 242 L92 274" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<rect x="237" y="34" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="53" font-size="13" text-anchor="middle" fill="currentColor">f(5)</text>
</g>
<g opacity="1">
<rect x="143" y="94" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="166" y="113" font-size="13" text-anchor="middle" fill="currentColor">f(4)</text>
</g>
<g opacity="1">
<rect x="383" y="94" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="406" y="113" font-size="13" text-anchor="middle" fill="currentColor">f(3)</text>
</g>
<g opacity="1">
<rect x="79" y="154" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="102" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(3)</text>
</g>
<g opacity="1">
<rect x="217" y="154" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="240" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<g opacity="1">
<rect x="341" y="154" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="364" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<g opacity="1">
<rect x="439" y="154" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="462" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="39" y="214" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="62" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<g opacity="1">
<rect x="131" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="154" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="187" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="210" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="251" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="274" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<g opacity="1">
<rect x="313" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="336" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="377" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="400" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<g opacity="1">
<rect x="9" y="274" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="32" y="293" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="69" y="274" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="92" y="293" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<text x="260" y="330" font-size="13" text-anchor="middle" fill="currentColor">f(3): 2 lần; f(2): 3 lần</text>
<text x="260" y="354" font-size="13" text-anchor="middle" fill="currentColor">Cam: bài con lặp</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 374" role="img" aria-labelledby="dsa07-memo-1-t dsa07-memo-1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa07-memo-1-t">Cây fib(5) có và không memo</title>
<desc id="dsa07-memo-1-d">Cùng cây lời gọi, các cây con dưới cache hit bị làm mờ. Duyệt nhánh trái trước.</desc>
<text x="260" y="22" font-size="14" text-anchor="middle" fill="currentColor">fib(5) : cây lời gọi</text>
<g opacity="1">
<path d="M260 62 L166 94" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M260 62 L406 94" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M166 122 L102 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M166 122 L240 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M406 122 L364 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M406 122 L462 154" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M102 182 L62 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M102 182 L154 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M240 182 L210 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M240 182 L274 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M364 182 L336 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.12">
<path d="M364 182 L400 214" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M62 242 L32 274" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<path d="M62 242 L92 274" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<rect x="237" y="34" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="53" font-size="13" text-anchor="middle" fill="currentColor">f(5)</text>
</g>
<g opacity="1">
<rect x="143" y="94" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="166" y="113" font-size="13" text-anchor="middle" fill="currentColor">f(4)</text>
</g>
<g opacity="1">
<rect x="383" y="94" width="46" height="28" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="406" y="113" font-size="13" text-anchor="middle" fill="currentColor">f(3)</text>
</g>
<text x="406" y="139" font-size="13" text-anchor="middle" fill="currentColor">hit</text>
<g opacity="1">
<rect x="79" y="154" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="102" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(3)</text>
</g>
<g opacity="1">
<rect x="217" y="154" width="46" height="28" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/>
<text x="240" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<text x="240" y="199" font-size="13" text-anchor="middle" fill="currentColor">hit</text>
<g opacity="0.12">
<rect x="341" y="154" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="364" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<g opacity="0.12">
<rect x="439" y="154" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="462" y="173" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="39" y="214" width="46" height="28" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/>
<text x="62" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(2)</text>
</g>
<g opacity="1">
<rect x="131" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="154" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="0.12">
<rect x="187" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="210" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="0.12">
<rect x="251" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="274" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<g opacity="0.12">
<rect x="313" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="336" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="0.12">
<rect x="377" y="214" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="400" y="233" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<g opacity="1">
<rect x="9" y="274" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="32" y="293" font-size="13" text-anchor="middle" fill="currentColor">f(1)</text>
</g>
<g opacity="1">
<rect x="69" y="274" width="46" height="28" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="92" y="293" font-size="13" text-anchor="middle" fill="currentColor">f(0)</text>
</g>
<text x="260" y="330" font-size="13" text-anchor="middle" fill="currentColor">Hit: trả cache; không mở rộng cây con</text>
<text x="260" y="354" font-size="13" text-anchor="middle" fill="currentColor">Mờ: lời gọi không xảy ra; xanh lá: hit</text>
</svg>
<ab-note>fib(3) được tính hai lần, fib(2) ba lần; fib(1) và fib(0) cũng bị gọi lặp lại.</ab-note>
<ab-note>Duyệt trái trước: các hit ở fib(2) và fib(3) dùng kết quả đã tính. Node hit vẫn là một lời gọi; chỉ các hậu duệ mờ bị bỏ qua. Base case không cần cache trong ví dụ này.</ab-note>
</ab-toggle>

```python
from functools import lru_cache
@lru_cache(maxsize=None)          # memoization (top-down)
def fib_memo(n):
    if n < 2:
        return n
    return fib_memo(n - 1) + fib_memo(n - 2)

def fib_tab(n):                   # tabulation (bottom-up)
    if n < 2:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```
```javascript
function fibMemo(n, cache = new Map()) {     // memoization
    if (n < 2) return n;
    if (cache.has(n)) return cache.get(n);
    const v = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
    cache.set(n, v);
    return v;
}
function fibTab(n) {                          // tabulation
    if (n < 2) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
}
```
```java
static Map<Integer, Long> cache = new HashMap<>();
static long fibMemo(int n) {                  // memoization
    if (n < 2) return n;
    if (cache.containsKey(n)) return cache.get(n);
    long v = fibMemo(n - 1) + fibMemo(n - 2);
    cache.put(n, v);
    return v;
}
static long fibTab(int n) {                    // tabulation
    if (n < 2) return n;
    long a = 0, b = 1;
    for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; }
    return b;
}
```
```go
func fibMemo(n int, cache map[int]int) int {   // memoization
    if n < 2 {
        return n
    }
    if v, ok := cache[n]; ok {
        return v
    }
    v := fibMemo(n-1, cache) + fibMemo(n-2, cache)
    cache[n] = v
    return v
}
func fibTab(n int) int {                        // tabulation
    if n < 2 {
        return n
    }
    a, b := 0, 1
    for i := 2; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}
```

```cpp
long long fibMemo(int n, std::unordered_map<int, long long>& cache) {  // memoization
    if (n < 2) return n;
    auto it = cache.find(n);
    if (it != cache.end()) return it->second;
    long long v = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
    cache[n] = v;
    return v;
}
long long fibTab(int n) {                        // tabulation
    if (n < 2) return n;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) { long long t = a + b; a = b; b = t; }
    return b;
}
```

| Cách | Hướng | Bộ nhớ | Ưu điểm |
| --- | --- | --- | --- |
| Memoization | Top-down (đệ quy + cache) | O(n) + call stack | Viết nhanh, sát công thức truy hồi |
| Tabulation | Bottom-up (vòng lặp) | O(n), thường tối ưu xuống O(1) | Không tràn stack, hằng số nhỏ hơn |

### 4.3. Climbing stairs

Có `n` bậc thang, mỗi bước leo 1 hoặc 2 bậc. Hỏi có bao nhiêu cách leo lên đỉnh? Để tới bậc `n`, bạn vừa ở bậc `n-1` (rồi bước 1) hoặc bậc `n-2` (rồi bước 2). Vậy `ways(n) = ways(n-1) + ways(n-2)` — chính là **Fibonacci**! Đây là ví dụ tuyệt vời cho thấy nhiều bài DP nhập môn cùng một bộ xương: tìm **công thức truy hồi (recurrence)** rồi điền bảng.



<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="dsg07-stairs-t dsg07-stairs-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsg07-stairs-t">Climbing stairs: ways(n−1) + ways(n−2)</title>
<desc id="dsg07-stairs-d">Hai bậc viền vàng là hai trạng thái đầu vào; số cách xuất hiện lần lượt trên mỗi bậc.</desc>
<defs><marker id="dsg07-stairs-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="24" text-anchor="middle" font-size="16" fill="currentColor">Climbing stairs: ways(n−1) + ways(n−2)</text>
<rect x="45" y="240" width="65" height="30" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="77" y="262" text-anchor="middle" font-size="13" fill="currentColor">n=0</text>
<g data-step="1"><text x="77" y="228" text-anchor="middle" font-size="16" fill="currentColor">1</text></g>
<rect x="121" y="210" width="65" height="60" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="153" y="232" text-anchor="middle" font-size="13" fill="currentColor">n=1</text>
<g data-step="2"><text x="153" y="198" text-anchor="middle" font-size="16" fill="currentColor">1</text></g>
<rect x="197" y="180" width="65" height="90" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="229" y="202" text-anchor="middle" font-size="13" fill="currentColor">n=2</text>
<g data-step="3"><text x="229" y="168" text-anchor="middle" font-size="16" fill="currentColor">2</text></g>
<rect x="273" y="150" width="65" height="120" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="305" y="172" text-anchor="middle" font-size="13" fill="currentColor">n=3</text>
<g data-step="4"><text x="305" y="138" text-anchor="middle" font-size="16" fill="currentColor">3</text></g>
<rect x="349" y="120" width="65" height="150" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="381" y="142" text-anchor="middle" font-size="13" fill="currentColor">n=4</text>
<g data-step="5"><text x="381" y="108" text-anchor="middle" font-size="16" fill="currentColor">5</text></g>
<rect x="425" y="90" width="65" height="180" rx="5" fill="#3b82f6" fill-opacity=".14" stroke="#3b82f6"/>
<text x="457" y="112" text-anchor="middle" font-size="13" fill="currentColor">n=5</text>
<g data-step="6"><text x="457" y="78" text-anchor="middle" font-size="16" fill="currentColor">8</text></g>
<g data-step="3" data-until="3"><rect x="43" y="238" width="69" height="34" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="3" data-until="3"><rect x="119" y="208" width="69" height="64" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="4" data-until="4"><rect x="119" y="208" width="69" height="64" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="4" data-until="4"><rect x="195" y="178" width="69" height="94" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="5" data-until="5"><rect x="195" y="178" width="69" height="94" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="5" data-until="5"><rect x="271" y="148" width="69" height="124" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="6"><rect x="271" y="148" width="69" height="124" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
<g data-step="6"><rect x="347" y="118" width="69" height="154" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/></g>
</svg>
<step-note data-step="1">Quy ước ways(0)=1: một cách không bước nào, làm base case.</step-note>
<step-note data-step="2">ways(1)=1: chỉ có bước dài 1.</step-note>
<step-note data-step="3">ways(2)=1+1=2: bước cuối dài 1 hoặc 2, hai nhóm rời nhau.</step-note>
<step-note data-step="4">ways(3)=ways(2)+ways(1)=2+1=3.</step-note>
<step-note data-step="5">ways(4)=3+2=5; hai trạng thái nhỏ hơn đã được tính.</step-note>
<step-note data-step="6">ways(5)=5+3=8. Điền lần lượt O(n), giữ hai giá trị gần nhất thì O(1) bộ nhớ.</step-note>
</step-flow>

### 4.4. Coin change — bài toán điển hình

Cho danh sách mệnh giá `coins` và số tiền `amount`, tìm **số đồng xu ít nhất** để gộp đúng `amount` (mỗi loại dùng vô hạn lần). Công thức truy hồi:

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 275" role="img" aria-labelledby="ds7-coins-t ds7-coins-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds7-coins-t">Coin change: điền bảng từ trái sang phải</title>
<desc id="ds7-coins-d">Coin change: điền bảng từ trái sang phải. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds7-coins-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Coin change: điền bảng từ trái sang phải</text>
<text x="260" y="55" font-size="14" text-anchor="middle" fill="currentColor">coins = [1,3,4], amount = 6</text><rect x="40" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="66" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=0</text><rect x="104" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="130" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=1</text><rect x="168" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="194" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=2</text><rect x="232" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="258" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=3</text><rect x="296" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="322" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=4</text><rect x="360" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="386" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=5</text><rect x="424" y="180" width="52" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="450" y="240" font-size="13" text-anchor="middle" fill="currentColor">x=6</text>
<g data-step="1"><text x="66" y="204" font-size="16" text-anchor="middle" fill="currentColor">0</text></g>
<g data-step="2"><text x="130" y="204" font-size="16" text-anchor="middle" fill="currentColor">1</text></g>
<g data-step="2" data-until="2"><path d="M66 175 V145 H130 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="3"><text x="194" y="204" font-size="16" text-anchor="middle" fill="currentColor">2</text></g>
<g data-step="3" data-until="3"><path d="M130 175 V145 H194 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="4"><text x="258" y="204" font-size="16" text-anchor="middle" fill="currentColor">1</text></g>
<g data-step="4" data-until="4"><path d="M194 175 V145 H258 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/><path d="M66 175 V117 H258 V175" fill="none" stroke="#10b981" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="5"><text x="322" y="204" font-size="16" text-anchor="middle" fill="currentColor">1</text></g>
<g data-step="5" data-until="5"><path d="M258 175 V145 H322 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/><path d="M130 175 V117 H322 V175" fill="none" stroke="#10b981" marker-end="url(#ds7-coins-a)"/><path d="M66 175 V89 H322 V175" fill="none" stroke="#f59e0b" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="6"><text x="386" y="204" font-size="16" text-anchor="middle" fill="currentColor">2</text></g>
<g data-step="6" data-until="6"><path d="M322 175 V145 H386 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/><path d="M194 175 V117 H386 V175" fill="none" stroke="#10b981" marker-end="url(#ds7-coins-a)"/><path d="M130 175 V89 H386 V175" fill="none" stroke="#f59e0b" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="7"><text x="450" y="204" font-size="16" text-anchor="middle" fill="currentColor">2</text></g>
<g data-step="7" data-until="7"><path d="M386 175 V145 H450 V175" fill="none" stroke="#3b82f6" marker-end="url(#ds7-coins-a)"/><path d="M258 175 V117 H450 V175" fill="none" stroke="#10b981" marker-end="url(#ds7-coins-a)"/><path d="M194 175 V89 H450 V175" fill="none" stroke="#f59e0b" marker-end="url(#ds7-coins-a)"/></g>
<g data-step="8"><text x="260" y="267" font-size="13" text-anchor="middle" fill="currentColor">dp[6] = 2: dùng 3 + 3</text></g>
</svg>
<step-note data-step="1">Khởi tạo <code>dp[0]=0</code>; các ô còn lại khởi tạo INF để biểu diễn chưa tạo được số tiền.</step-note>
<step-note data-step="2">Với x=1, xét dp[0]=0; lấy min rồi cộng 1 → <code>dp[1]=1</code>. Chỉ đọc ô đã tính ở bên trái.</step-note>
<step-note data-step="3">Với x=2, xét dp[1]=1; lấy min rồi cộng 1 → <code>dp[2]=2</code>. Chỉ đọc ô đã tính ở bên trái.</step-note>
<step-note data-step="4">Với x=3, xét dp[2]=2, dp[0]=0; lấy min rồi cộng 1 → <code>dp[3]=1</code>. Chỉ đọc ô đã tính ở bên trái.</step-note>
<step-note data-step="5">Với x=4, xét dp[3]=1, dp[1]=1, dp[0]=0; lấy min rồi cộng 1 → <code>dp[4]=1</code>. Chỉ đọc ô đã tính ở bên trái.</step-note>
<step-note data-step="6">Với x=5, xét dp[4]=1, dp[2]=2, dp[1]=1; lấy min rồi cộng 1 → <code>dp[5]=2</code>. Chỉ đọc ô đã tính ở bên trái.</step-note>
<step-note data-step="7">Với x=6, xét dp[5]=2, dp[3]=1, dp[2]=2; lấy min rồi cộng 1 → <code>dp[6]=2</code>. Hai đồng 3 tạo 6, tốt hơn 4+1+1; tổng O(amount × số loại coin).</step-note>
<step-note data-step="8">Hoàn tất: chỉ giữ kết quả; bỏ cung chuyển tạm. Hai đồng 3 là tối ưu; tổng O(amount × số loại coin).</step-note>
</step-flow>

```text
dp[x] = số xu ít nhất tạo ra x
dp[0] = 0
dp[x] = 1 + min(dp[x - c])  với mọi coin c <= x
```

```python
def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    return -1 if dp[amount] == INF else dp[amount]
```
```javascript
function coinChange(coins, amount) {
    const INF = Infinity;
    const dp = new Array(amount + 1).fill(INF);
    dp[0] = 0;
    for (let x = 1; x <= amount; x++) {
        for (const c of coins) {
            if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
    }
    return dp[amount] === INF ? -1 : dp[amount];
}
```
```java
static int coinChange(int[] coins, int amount) {
    int INF = amount + 1;
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, INF);
    dp[0] = 0;
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```
```go
func coinChange(coins []int, amount int) int {
    INF := amount + 1
    dp := make([]int, amount+1)
    for i := range dp {
        dp[i] = INF
    }
    dp[0] = 0
    for x := 1; x <= amount; x++ {
        for _, c := range coins {
            if c <= x && dp[x-c]+1 < dp[x] {
                dp[x] = dp[x-c] + 1
            }
        }
    }
    if dp[amount] > amount {
        return -1
    }
    return dp[amount]
}
```

```cpp
int coinChange(const std::vector<int>& coins, int amount) {
    int INF = amount + 1;
    std::vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```

Độ phức tạp **O(amount × số loại coin)** thời gian, **O(amount)** bộ nhớ.

> Ghi nhớ: Quy trình giải mọi bài DP gồm 4 bước — (1) định nghĩa **trạng thái** `dp[...]` nghĩa là gì; (2) viết **công thức truy hồi** nối trạng thái lớn với trạng thái nhỏ; (3) xác định **base case**; (4) chọn thứ tự điền bảng (top-down hay bottom-up). Nắm chắc bước 1 và 2 là giải được 80% bài.

> Bẫy: Với coin change, **không** tham lam chọn đồng mệnh giá lớn nhất trước. Ví dụ `coins = [1, 3, 4]`, `amount = 6`: tham lam ra `4+1+1 = 3 xu`, nhưng đáp án tối ưu là `3+3 = 2 xu`. Greedy chỉ đúng với một số hệ tiền tệ đặc biệt — DP mới luôn đúng.

## 5. Tổng kết & bản đồ quyết định

| Bài toán có dạng... | Công cụ nên nghĩ tới |
| --- | --- |
| Tự định nghĩa bằng phiên bản nhỏ hơn (cây, chia để trị) | Recursion |
| Liệt kê *mọi* khả năng / cấu hình hợp lệ | Backtracking |
| Quan hệ giữa các thực thể, "đi từ A tới B" | Graph (BFS/DFS) |
| Đường đi ít cạnh nhất, đồ thị không trọng số | BFS |
| Phát hiện chu trình, liên thông, topo sort | DFS |
| "Đếm số cách" / "tối ưu" + bài con trùng lặp | Dynamic Programming |

Bốn chủ đề này gắn kết hơn vẻ ngoài: backtracking là đệ quy có quay lui; DFS chính là đệ quy trên graph; DP là đệ quy được cache lại. Khi luyện phỏng vấn, hãy tập **đặt tên đúng cho bài toán trước** — nhận ra "à, đây là graph" hay "đây là DP" — vì một khi gắn đúng nhãn, bộ khung lời giải gần như tự hiện ra.

> Ghi nhớ cuối bài: Đừng học thuộc lời giải từng bài. Hãy thuộc **bộ khung (template)**: khung backtracking (chọn–đi sâu–quay lui), khung BFS/DFS (queue/đệ quy + visited), khung DP (định nghĩa trạng thái + truy hồi). Hàng trăm bài phỏng vấn chỉ là biến thể của vài bộ khung này.
