# Bài 5 — Fixed timestep: vì sao dt phải là hằng số

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **bằng số** vì sao cùng một công thức vật lý chạy ở 60 Hz và 144 Hz cho ra hai thế giới khác nhau, và khác nhau đúng bao nhiêu centimet.
- Phân biệt **sai số tích phân rời rạc** với **lỗi float** chỉ bằng cách nhìn quy luật của sai số, trước khi mở debugger.
- Bác bỏ được phản xạ "**đo `dt` thật rồi dùng luôn, tổng quãng đường vẫn bằng nhau**" bằng chính bảng số trong bài.
- Tính ra cái giá của việc "chốt tick rate thật cao cho chính xác", và chỉ ra vì sao nó vẫn không giải quyết được vấn đề.
- Phát biểu lại mục tiêu của simulation từ "**chính xác**" thành "**giống nhau**", và đọc được ràng buộc đó trong một chữ ký hàm.

---

## 2. Triệu chứng

Cả chương 1 dựa vào một giả định: server có một nhịp đập đều đặn và đáng tin. Chương này tháo giả định đó ra — và chỗ nó vỡ đầu tiên không nằm ở mạng, nó nằm ở hai dòng số học.

Bạn làm một game platformer, có một cú nhảy qua vực. Bạn chỉnh tay cho tới khi nó vừa khít: mép bên kia cao **2,45 m**, nhân vật bật lên với vận tốc đầu **7 m/s**, `g = 9,8 m/s²`. Test trên máy bạn: qua được, mà chỉ vừa đủ qua — đúng cảm giác bạn muốn. Ship.

Ba ngày sau, hai bug report về cùng lúc. Nội dung **ngược nhau hoàn toàn**:

```
#218  "Không nhảy qua được vực ở màn 3. Đã thử 40 lần. Không lần nào qua."
      máy: laptop, màn hình 60 Hz

#224  "Màn 3 dễ quá, nhảy qua vực mà không cần lấy đà. Bug à?"
      máy: PC, màn hình 144 Hz
```

Cùng một build. Cùng một map. Cùng một file config. Không ai sửa gì giữa hai lần.

Bạn mở code nhảy. Nó đúng hai dòng, và **không có chỗ nào nhắc tới FPS**:

```
v -= g * dt
y += v * dt
```

Bạn chạy chính hai dòng đó ở hai tần số, in ra độ cao lớn nhất đạt được:

```
 60 Hz  →  đỉnh nhảy 2,4418 m   →  2,4418 < 2,45   không qua
144 Hz  →  đỉnh nhảy 2,4757 m   →  2,4757 > 2,45   qua
```

**Chênh 3,39 cm.** Mép vực rơi đúng vào giữa hai con số đó. Và không có dòng code nào của bạn tạo ra 3,39 cm ấy.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp. Chỗ này đáng chọn sai một lần, vì cái sai ở đây là cái sai mà phần lớn dev backend mắc.

**Hai dòng code không nhắc tới FPS. 3,39 cm kia ở đâu ra?**

```
(a) Sai số làm tròn của float32 — chuyển sang float64 là hết
(b) `dt` bị đo sai trên máy 144 Hz — vấn đề nằm ở chỗ lấy thời gian
(c) Ở đâu đó trong engine có một đoạn code phụ thuộc framerate, phải đi tìm
(d) Công thức không sai, và không có bug nào cả — phép cộng dồn rời rạc
    cho ra kết quả khác nhau khi số bước khác nhau
```

Nếu bạn chọn (a) hoặc (c), phần lớn thời gian debug sẽ đổ vào đúng chỗ không có gì. Mục 3.1 giải thích vì sao.

---

## 3. Lý thuyết

### 3.1 Không phải bug. Là số học.

Đáp án là **(d)**.

Bỏ cú nhảy sang một bên, lấy bài toán đơn giản nhất: **thả rơi tự do đúng 1 giây**. Cùng công thức Euler nửa ẩn (`v += g·dt` rồi `y += v·dt`), `g = 9,8`, chỉ đổi số bước:

| Tần số | Số bước trong 1 s | Quãng rơi sau 1 s | Lệch so với đúng |
|---|---|---|---|
| 30 Hz | 30 | 5,0633 m | **+16,3 cm** |
| 60 Hz | 60 | 4,9817 m | +8,2 cm |
| 120 Hz | 120 | 4,9408 m | +4,1 cm |
| 144 Hz | 144 | 4,9340 m | +3,4 cm |
| 240 Hz | 240 | 4,9204 m | +2,0 cm |
| *giải tích (½·g·t²)* | *∞* | *4,9000 m* | *—* |

*(Số đo bằng cách chạy chính vòng lặp đó — tự kiểm chứng được bằng vài dòng Python.)*

Không dòng nào là "đúng". Có **năm kết quả khác nhau cho cùng một hiện tượng vật lý**, và cái duy nhất phân biệt chúng là số lần bạn bấm nút cộng.

Chuyện đang xảy ra: bạn muốn tính diện tích dưới một đường cong, nhưng bạn tính bằng cách xếp hình chữ nhật. Vận tốc tăng liên tục trong khoảng `dt`, nhưng bạn nhân **một** giá trị vận tốc với **cả** khoảng đó. Ít hình chữ nhật thì thừa nhiều, nhiều hình chữ nhật thì thừa ít.

<ab-toggle data-labels="30 Hz|240 Hz">
<svg viewBox="0 0 520 338" role="img" aria-labelledby="gs05-vis-30-t gs05-vis-30-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="gs05-vis-30-t">Sai số Euler nửa ẩn theo kích thước bước</title>
<desc id="gs05-vis-30-d">Cùng trục vận tốc và thời gian; tam giác hồng là phần cộng dư của mỗi hình chữ nhật.</desc>
<text x="35" y="24" font-size="13" text-anchor="start" fill="currentColor">30 Hz · 30 bước trong 1 giây</text>
<text x="35" y="48" font-size="13" text-anchor="start" fill="currentColor">v = g·t; phần hồng nằm ngoài diện tích đúng</text>
<rect x="45.0" y="215.0" width="14.666666666666666" height="5.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M45.0 215.0 H59.666666666666664 L45.0 220.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="59.666666666666664" y="210.0" width="14.666666666666666" height="10.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M59.666666666666664 210.0 H74.33333333333333 L59.666666666666664 215.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="74.33333333333333" y="205.0" width="14.666666666666666" height="15.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M74.33333333333333 205.0 H89.0 L74.33333333333333 210.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="89.0" y="200.0" width="14.666666666666666" height="20.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M89.0 200.0 H103.66666666666667 L89.0 205.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="103.66666666666666" y="195.0" width="14.666666666666666" height="25.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M103.66666666666666 195.0 H118.33333333333333 L103.66666666666666 200.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="118.33333333333333" y="190.0" width="14.666666666666666" height="30.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M118.33333333333333 190.0 H133.0 L118.33333333333333 195.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="133.0" y="185.0" width="14.666666666666666" height="35.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M133.0 185.0 H147.66666666666666 L133.0 190.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="147.66666666666669" y="180.0" width="14.666666666666666" height="40.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M147.66666666666669 180.0 H162.33333333333334 L147.66666666666669 185.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="162.33333333333331" y="175.0" width="14.666666666666666" height="45.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M162.33333333333331 175.0 H176.99999999999997 L162.33333333333331 180.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="177.0" y="170.0" width="14.666666666666666" height="50.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M177.0 170.0 H191.66666666666666 L177.0 175.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="191.66666666666666" y="165.0" width="14.666666666666666" height="55.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M191.66666666666666 165.0 H206.33333333333331 L191.66666666666666 170.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="206.33333333333334" y="160.0" width="14.666666666666666" height="60.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M206.33333333333334 160.0 H221.0 L206.33333333333334 165.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="221.0" y="155.0" width="14.666666666666666" height="65.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M221.0 155.0 H235.66666666666666 L221.0 160.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="235.66666666666666" y="150.0" width="14.666666666666666" height="70.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M235.66666666666666 150.0 H250.33333333333331 L235.66666666666666 155.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="250.33333333333334" y="145.0" width="14.666666666666666" height="75.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M250.33333333333334 145.0 H265.0 L250.33333333333334 150.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="265.0" y="140.0" width="14.666666666666666" height="80.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M265.0 140.0 H279.6666666666667 L265.0 145.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="279.66666666666663" y="135.0" width="14.666666666666666" height="85.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M279.66666666666663 135.0 H294.3333333333333 L279.66666666666663 140.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="294.33333333333337" y="130.0" width="14.666666666666666" height="90.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M294.33333333333337 130.0 H309.00000000000006 L294.33333333333337 135.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="309.0" y="125.0" width="14.666666666666666" height="95.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M309.0 125.0 H323.6666666666667 L309.0 130.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="323.6666666666667" y="120.0" width="14.666666666666666" height="100.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M323.6666666666667 120.0 H338.33333333333337 L323.6666666666667 125.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="338.3333333333333" y="115.0" width="14.666666666666666" height="105.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M338.3333333333333 115.0 H353.0 L338.3333333333333 120.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="353.0" y="110.0" width="14.666666666666666" height="110.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M353.0 110.0 H367.6666666666667 L353.0 115.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="367.6666666666667" y="105.0" width="14.666666666666666" height="115.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M367.6666666666667 105.0 H382.33333333333337 L367.6666666666667 110.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="382.3333333333333" y="100.0" width="14.666666666666666" height="120.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M382.3333333333333 100.0 H397.0 L382.3333333333333 105.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="397.0" y="95.0" width="14.666666666666666" height="125.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M397.0 95.0 H411.6666666666667 L397.0 100.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="411.6666666666667" y="90.0" width="14.666666666666666" height="130.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M411.6666666666667 90.0 H426.33333333333337 L411.6666666666667 95.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="426.3333333333333" y="85.0" width="14.666666666666666" height="135.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M426.3333333333333 85.0 H441.0 L426.3333333333333 90.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="441.0" y="80.0" width="14.666666666666666" height="140.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M441.0 80.0 H455.6666666666667 L441.0 85.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="455.6666666666667" y="75.0" width="14.666666666666666" height="145.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M455.6666666666667 75.0 H470.33333333333337 L455.6666666666667 80.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="470.3333333333333" y="70.0" width="14.666666666666666" height="150.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M470.3333333333333 70.0 H485.0 L470.3333333333333 75.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<line x1="45" y1="220" x2="485" y2="70" stroke="#3b82f6" stroke-width="2"/>
<line x1="45" y1="220" x2="495" y2="220" stroke="currentColor" />
<line x1="45" y1="220" x2="45" y2="63" stroke="currentColor" />
<text x="28" y="68" font-size="13" text-anchor="start" fill="currentColor">v</text>
<text x="487" y="240" font-size="13" text-anchor="end" fill="currentColor">1 s</text>
<text x="45" y="245" font-size="13" text-anchor="start" fill="currentColor">0</text>
<text x="45" y="272" font-size="13" text-anchor="start" fill="currentColor">5,0633 m · cộng dư 16,3 cm</text>
<rect x="45" y="290" width="326" height="15" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="45" y="327" font-size="13" fill="currentColor">Độ dài thanh = sai số · cùng thang đo</text>
</svg>
<svg viewBox="0 0 520 338" role="img" aria-labelledby="gs05-vis-240-t gs05-vis-240-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="gs05-vis-240-t">Sai số Euler nửa ẩn theo kích thước bước</title>
<desc id="gs05-vis-240-d">Cùng trục vận tốc và thời gian; tam giác hồng là phần cộng dư của mỗi hình chữ nhật.</desc>
<text x="35" y="24" font-size="13" text-anchor="start" fill="currentColor">240 Hz · 240 bước trong 1 giây</text>
<text x="35" y="48" font-size="13" text-anchor="start" fill="currentColor">v = g·t; phần hồng nằm ngoài diện tích đúng</text>
<rect x="45.0" y="219.375" width="1.8333333333333333" height="0.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M45.0 219.375 H46.833333333333336 L45.0 220.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="46.833333333333336" y="218.75" width="1.8333333333333333" height="1.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M46.833333333333336 218.75 H48.66666666666667 L46.833333333333336 219.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="48.666666666666664" y="218.125" width="1.8333333333333333" height="1.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M48.666666666666664 218.125 H50.5 L48.666666666666664 218.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="50.5" y="217.5" width="1.8333333333333333" height="2.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M50.5 217.5 H52.333333333333336 L50.5 218.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="52.333333333333336" y="216.875" width="1.8333333333333333" height="3.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M52.333333333333336 216.875 H54.16666666666667 L52.333333333333336 217.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="54.166666666666664" y="216.25" width="1.8333333333333333" height="3.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M54.166666666666664 216.25 H56.0 L54.166666666666664 216.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="56.0" y="215.625" width="1.8333333333333333" height="4.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M56.0 215.625 H57.833333333333336 L56.0 216.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="57.833333333333336" y="215.0" width="1.8333333333333333" height="5.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M57.833333333333336 215.0 H59.66666666666667 L57.833333333333336 215.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="59.666666666666664" y="214.375" width="1.8333333333333333" height="5.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M59.666666666666664 214.375 H61.5 L59.666666666666664 215.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="61.5" y="213.75" width="1.8333333333333333" height="6.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M61.5 213.75 H63.333333333333336 L61.5 214.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="63.33333333333333" y="213.125" width="1.8333333333333333" height="6.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M63.33333333333333 213.125 H65.16666666666666 L63.33333333333333 213.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="65.16666666666667" y="212.5" width="1.8333333333333333" height="7.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M65.16666666666667 212.5 H67.0 L65.16666666666667 213.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="67.0" y="211.875" width="1.8333333333333333" height="8.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M67.0 211.875 H68.83333333333333 L67.0 212.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="68.83333333333333" y="211.25" width="1.8333333333333333" height="8.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M68.83333333333333 211.25 H70.66666666666666 L68.83333333333333 211.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="70.66666666666667" y="210.625" width="1.8333333333333333" height="9.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M70.66666666666667 210.625 H72.5 L70.66666666666667 211.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="72.5" y="210.0" width="1.8333333333333333" height="10.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M72.5 210.0 H74.33333333333333 L72.5 210.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="74.33333333333333" y="209.375" width="1.8333333333333333" height="10.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M74.33333333333333 209.375 H76.16666666666666 L74.33333333333333 210.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="76.16666666666667" y="208.75" width="1.8333333333333333" height="11.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M76.16666666666667 208.75 H78.0 L76.16666666666667 209.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="78.0" y="208.125" width="1.8333333333333333" height="11.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M78.0 208.125 H79.83333333333333 L78.0 208.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="79.83333333333334" y="207.5" width="1.8333333333333333" height="12.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M79.83333333333334 207.5 H81.66666666666667 L79.83333333333334 208.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="81.66666666666666" y="206.875" width="1.8333333333333333" height="13.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M81.66666666666666 206.875 H83.49999999999999 L81.66666666666666 207.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="83.5" y="206.25" width="1.8333333333333333" height="13.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M83.5 206.25 H85.33333333333333 L83.5 206.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="85.33333333333334" y="205.625" width="1.8333333333333333" height="14.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M85.33333333333334 205.625 H87.16666666666667 L85.33333333333334 206.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="87.16666666666666" y="205.0" width="1.8333333333333333" height="15.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M87.16666666666666 205.0 H88.99999999999999 L87.16666666666666 205.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="89.0" y="204.375" width="1.8333333333333333" height="15.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M89.0 204.375 H90.83333333333333 L89.0 205.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="90.83333333333334" y="203.75" width="1.8333333333333333" height="16.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M90.83333333333334 203.75 H92.66666666666667 L90.83333333333334 204.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="92.66666666666666" y="203.125" width="1.8333333333333333" height="16.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M92.66666666666666 203.125 H94.49999999999999 L92.66666666666666 203.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="94.5" y="202.5" width="1.8333333333333333" height="17.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M94.5 202.5 H96.33333333333333 L94.5 203.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="96.33333333333334" y="201.875" width="1.8333333333333333" height="18.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M96.33333333333334 201.875 H98.16666666666667 L96.33333333333334 202.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="98.16666666666666" y="201.25" width="1.8333333333333333" height="18.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M98.16666666666666 201.25 H99.99999999999999 L98.16666666666666 201.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="100.0" y="200.625" width="1.8333333333333333" height="19.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M100.0 200.625 H101.83333333333333 L100.0 201.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="101.83333333333334" y="200.0" width="1.8333333333333333" height="20.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M101.83333333333334 200.0 H103.66666666666667 L101.83333333333334 200.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="103.66666666666666" y="199.375" width="1.8333333333333333" height="20.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M103.66666666666666 199.375 H105.49999999999999 L103.66666666666666 200.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="105.5" y="198.75" width="1.8333333333333333" height="21.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M105.5 198.75 H107.33333333333333 L105.5 199.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="107.33333333333334" y="198.125" width="1.8333333333333333" height="21.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M107.33333333333334 198.125 H109.16666666666667 L107.33333333333334 198.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="109.16666666666667" y="197.5" width="1.8333333333333333" height="22.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M109.16666666666667 197.5 H111.0 L109.16666666666667 198.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="111.0" y="196.875" width="1.8333333333333333" height="23.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M111.0 196.875 H112.83333333333333 L111.0 197.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="112.83333333333333" y="196.25" width="1.8333333333333333" height="23.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M112.83333333333333 196.25 H114.66666666666666 L112.83333333333333 196.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="114.66666666666667" y="195.625" width="1.8333333333333333" height="24.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M114.66666666666667 195.625 H116.5 L114.66666666666667 196.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="116.5" y="195.0" width="1.8333333333333333" height="25.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M116.5 195.0 H118.33333333333333 L116.5 195.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="118.33333333333333" y="194.375" width="1.8333333333333333" height="25.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M118.33333333333333 194.375 H120.16666666666666 L118.33333333333333 195.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="120.16666666666667" y="193.75" width="1.8333333333333333" height="26.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M120.16666666666667 193.75 H122.0 L120.16666666666667 194.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="122.0" y="193.125" width="1.8333333333333333" height="26.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M122.0 193.125 H123.83333333333333 L122.0 193.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="123.83333333333333" y="192.5" width="1.8333333333333333" height="27.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M123.83333333333333 192.5 H125.66666666666666 L123.83333333333333 193.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="125.66666666666667" y="191.875" width="1.8333333333333333" height="28.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M125.66666666666667 191.875 H127.5 L125.66666666666667 192.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="127.5" y="191.25" width="1.8333333333333333" height="28.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M127.5 191.25 H129.33333333333334 L127.5 191.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="129.33333333333331" y="190.625" width="1.8333333333333333" height="29.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M129.33333333333331 190.625 H131.16666666666666 L129.33333333333331 191.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="131.16666666666669" y="190.0" width="1.8333333333333333" height="30.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M131.16666666666669 190.0 H133.00000000000003 L131.16666666666669 190.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="133.0" y="189.375" width="1.8333333333333333" height="30.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M133.0 189.375 H134.83333333333334 L133.0 190.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="134.83333333333331" y="188.75" width="1.8333333333333333" height="31.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M134.83333333333331 188.75 H136.66666666666666 L134.83333333333331 189.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="136.66666666666669" y="188.125" width="1.8333333333333333" height="31.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M136.66666666666669 188.125 H138.50000000000003 L136.66666666666669 188.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="138.5" y="187.5" width="1.8333333333333333" height="32.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M138.5 187.5 H140.33333333333334 L138.5 188.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="140.33333333333331" y="186.875" width="1.8333333333333333" height="33.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M140.33333333333331 186.875 H142.16666666666666 L140.33333333333331 187.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="142.16666666666669" y="186.25" width="1.8333333333333333" height="33.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M142.16666666666669 186.25 H144.00000000000003 L142.16666666666669 186.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="144.0" y="185.625" width="1.8333333333333333" height="34.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M144.0 185.625 H145.83333333333334 L144.0 186.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="145.83333333333331" y="185.0" width="1.8333333333333333" height="35.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M145.83333333333331 185.0 H147.66666666666666 L145.83333333333331 185.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="147.66666666666669" y="184.375" width="1.8333333333333333" height="35.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M147.66666666666669 184.375 H149.50000000000003 L147.66666666666669 185.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="149.5" y="183.75" width="1.8333333333333333" height="36.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M149.5 183.75 H151.33333333333334 L149.5 184.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="151.33333333333331" y="183.125" width="1.8333333333333333" height="36.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M151.33333333333331 183.125 H153.16666666666666 L151.33333333333331 183.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="153.16666666666669" y="182.5" width="1.8333333333333333" height="37.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M153.16666666666669 182.5 H155.00000000000003 L153.16666666666669 183.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="155.0" y="181.875" width="1.8333333333333333" height="38.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M155.0 181.875 H156.83333333333334 L155.0 182.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="156.83333333333331" y="181.25" width="1.8333333333333333" height="38.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M156.83333333333331 181.25 H158.66666666666666 L156.83333333333331 181.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="158.66666666666669" y="180.625" width="1.8333333333333333" height="39.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M158.66666666666669 180.625 H160.50000000000003 L158.66666666666669 181.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="160.5" y="180.0" width="1.8333333333333333" height="40.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M160.5 180.0 H162.33333333333334 L160.5 180.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="162.33333333333331" y="179.375" width="1.8333333333333333" height="40.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M162.33333333333331 179.375 H164.16666666666666 L162.33333333333331 180.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="164.16666666666669" y="178.75" width="1.8333333333333333" height="41.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M164.16666666666669 178.75 H166.00000000000003 L164.16666666666669 179.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="166.0" y="178.125" width="1.8333333333333333" height="41.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M166.0 178.125 H167.83333333333334 L166.0 178.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="167.83333333333331" y="177.5" width="1.8333333333333333" height="42.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M167.83333333333331 177.5 H169.66666666666666 L167.83333333333331 178.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="169.66666666666669" y="176.875" width="1.8333333333333333" height="43.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M169.66666666666669 176.875 H171.50000000000003 L169.66666666666669 177.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="171.5" y="176.25" width="1.8333333333333333" height="43.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M171.5 176.25 H173.33333333333334 L171.5 176.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="173.33333333333334" y="175.625" width="1.8333333333333333" height="44.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M173.33333333333334 175.625 H175.16666666666669 L173.33333333333334 176.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="175.16666666666666" y="175.0" width="1.8333333333333333" height="45.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M175.16666666666666 175.0 H177.0 L175.16666666666666 175.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="177.0" y="174.375" width="1.8333333333333333" height="45.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M177.0 174.375 H178.83333333333334 L177.0 175.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="178.83333333333334" y="173.75" width="1.8333333333333333" height="46.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M178.83333333333334 173.75 H180.66666666666669 L178.83333333333334 174.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="180.66666666666666" y="173.125" width="1.8333333333333333" height="46.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M180.66666666666666 173.125 H182.5 L180.66666666666666 173.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="182.5" y="172.5" width="1.8333333333333333" height="47.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M182.5 172.5 H184.33333333333334 L182.5 173.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="184.33333333333334" y="171.875" width="1.8333333333333333" height="48.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M184.33333333333334 171.875 H186.16666666666669 L184.33333333333334 172.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="186.16666666666666" y="171.25" width="1.8333333333333333" height="48.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M186.16666666666666 171.25 H188.0 L186.16666666666666 171.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="188.0" y="170.625" width="1.8333333333333333" height="49.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M188.0 170.625 H189.83333333333334 L188.0 171.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="189.83333333333334" y="170.0" width="1.8333333333333333" height="50.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M189.83333333333334 170.0 H191.66666666666669 L189.83333333333334 170.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="191.66666666666666" y="169.375" width="1.8333333333333333" height="50.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M191.66666666666666 169.375 H193.5 L191.66666666666666 170.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="193.5" y="168.75" width="1.8333333333333333" height="51.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M193.5 168.75 H195.33333333333334 L193.5 169.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="195.33333333333334" y="168.125" width="1.8333333333333333" height="51.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M195.33333333333334 168.125 H197.16666666666669 L195.33333333333334 168.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="197.16666666666666" y="167.5" width="1.8333333333333333" height="52.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M197.16666666666666 167.5 H199.0 L197.16666666666666 168.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="199.0" y="166.875" width="1.8333333333333333" height="53.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M199.0 166.875 H200.83333333333334 L199.0 167.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="200.83333333333334" y="166.25" width="1.8333333333333333" height="53.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M200.83333333333334 166.25 H202.66666666666669 L200.83333333333334 166.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="202.66666666666666" y="165.625" width="1.8333333333333333" height="54.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M202.66666666666666 165.625 H204.5 L202.66666666666666 166.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="204.5" y="165.0" width="1.8333333333333333" height="55.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M204.5 165.0 H206.33333333333334 L204.5 165.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="206.33333333333334" y="164.375" width="1.8333333333333333" height="55.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M206.33333333333334 164.375 H208.16666666666669 L206.33333333333334 165.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="208.16666666666666" y="163.75" width="1.8333333333333333" height="56.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M208.16666666666666 163.75 H210.0 L208.16666666666666 164.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="210.0" y="163.125" width="1.8333333333333333" height="56.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M210.0 163.125 H211.83333333333334 L210.0 163.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="211.83333333333334" y="162.5" width="1.8333333333333333" height="57.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M211.83333333333334 162.5 H213.66666666666669 L211.83333333333334 163.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="213.66666666666666" y="161.875" width="1.8333333333333333" height="58.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M213.66666666666666 161.875 H215.5 L213.66666666666666 162.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="215.5" y="161.25" width="1.8333333333333333" height="58.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M215.5 161.25 H217.33333333333334 L215.5 161.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="217.33333333333334" y="160.625" width="1.8333333333333333" height="59.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M217.33333333333334 160.625 H219.16666666666669 L217.33333333333334 161.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="219.16666666666666" y="160.0" width="1.8333333333333333" height="60.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M219.16666666666666 160.0 H221.0 L219.16666666666666 160.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="221.0" y="159.375" width="1.8333333333333333" height="60.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M221.0 159.375 H222.83333333333334 L221.0 160.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="222.83333333333334" y="158.75" width="1.8333333333333333" height="61.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M222.83333333333334 158.75 H224.66666666666669 L222.83333333333334 159.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="224.66666666666666" y="158.125" width="1.8333333333333333" height="61.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M224.66666666666666 158.125 H226.5 L224.66666666666666 158.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="226.5" y="157.5" width="1.8333333333333333" height="62.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M226.5 157.5 H228.33333333333334 L226.5 158.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="228.33333333333334" y="156.875" width="1.8333333333333333" height="63.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M228.33333333333334 156.875 H230.16666666666669 L228.33333333333334 157.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="230.16666666666666" y="156.25" width="1.8333333333333333" height="63.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M230.16666666666666 156.25 H232.0 L230.16666666666666 156.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="232.0" y="155.625" width="1.8333333333333333" height="64.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M232.0 155.625 H233.83333333333334 L232.0 156.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="233.83333333333334" y="155.0" width="1.8333333333333333" height="65.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M233.83333333333334 155.0 H235.66666666666669 L233.83333333333334 155.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="235.66666666666666" y="154.375" width="1.8333333333333333" height="65.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M235.66666666666666 154.375 H237.5 L235.66666666666666 155.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="237.5" y="153.75" width="1.8333333333333333" height="66.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M237.5 153.75 H239.33333333333334 L237.5 154.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="239.33333333333334" y="153.125" width="1.8333333333333333" height="66.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M239.33333333333334 153.125 H241.16666666666669 L239.33333333333334 153.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="241.16666666666666" y="152.5" width="1.8333333333333333" height="67.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M241.16666666666666 152.5 H243.0 L241.16666666666666 153.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="243.0" y="151.875" width="1.8333333333333333" height="68.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M243.0 151.875 H244.83333333333334 L243.0 152.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="244.83333333333334" y="151.25" width="1.8333333333333333" height="68.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M244.83333333333334 151.25 H246.66666666666669 L244.83333333333334 151.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="246.66666666666666" y="150.625" width="1.8333333333333333" height="69.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M246.66666666666666 150.625 H248.5 L246.66666666666666 151.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="248.5" y="150.0" width="1.8333333333333333" height="70.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M248.5 150.0 H250.33333333333334 L248.5 150.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="250.33333333333334" y="149.375" width="1.8333333333333333" height="70.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M250.33333333333334 149.375 H252.16666666666669 L250.33333333333334 150.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="252.16666666666666" y="148.75" width="1.8333333333333333" height="71.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M252.16666666666666 148.75 H254.0 L252.16666666666666 149.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="254.0" y="148.125" width="1.8333333333333333" height="71.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M254.0 148.125 H255.83333333333334 L254.0 148.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="255.83333333333334" y="147.5" width="1.8333333333333333" height="72.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M255.83333333333334 147.5 H257.6666666666667 L255.83333333333334 148.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="257.66666666666663" y="146.875" width="1.8333333333333333" height="73.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M257.66666666666663 146.875 H259.49999999999994 L257.66666666666663 147.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="259.5" y="146.25" width="1.8333333333333333" height="73.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M259.5 146.25 H261.3333333333333 L259.5 146.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="261.33333333333337" y="145.625" width="1.8333333333333333" height="74.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M261.33333333333337 145.625 H263.1666666666667 L261.33333333333337 146.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="263.16666666666663" y="145.0" width="1.8333333333333333" height="75.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M263.16666666666663 145.0 H264.99999999999994 L263.16666666666663 145.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="265.0" y="144.375" width="1.8333333333333333" height="75.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M265.0 144.375 H266.8333333333333 L265.0 145.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="266.83333333333337" y="143.75" width="1.8333333333333333" height="76.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M266.83333333333337 143.75 H268.6666666666667 L266.83333333333337 144.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="268.66666666666663" y="143.125" width="1.8333333333333333" height="76.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M268.66666666666663 143.125 H270.49999999999994 L268.66666666666663 143.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="270.5" y="142.5" width="1.8333333333333333" height="77.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M270.5 142.5 H272.3333333333333 L270.5 143.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="272.33333333333337" y="141.875" width="1.8333333333333333" height="78.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M272.33333333333337 141.875 H274.1666666666667 L272.33333333333337 142.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="274.16666666666663" y="141.25" width="1.8333333333333333" height="78.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M274.16666666666663 141.25 H275.99999999999994 L274.16666666666663 141.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="276.0" y="140.625" width="1.8333333333333333" height="79.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M276.0 140.625 H277.8333333333333 L276.0 141.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="277.83333333333337" y="140.0" width="1.8333333333333333" height="80.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M277.83333333333337 140.0 H279.6666666666667 L277.83333333333337 140.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="279.66666666666663" y="139.375" width="1.8333333333333333" height="80.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M279.66666666666663 139.375 H281.49999999999994 L279.66666666666663 140.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="281.5" y="138.75" width="1.8333333333333333" height="81.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M281.5 138.75 H283.3333333333333 L281.5 139.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="283.33333333333337" y="138.125" width="1.8333333333333333" height="81.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M283.33333333333337 138.125 H285.1666666666667 L283.33333333333337 138.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="285.16666666666663" y="137.5" width="1.8333333333333333" height="82.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M285.16666666666663 137.5 H286.99999999999994 L285.16666666666663 138.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="287.0" y="136.875" width="1.8333333333333333" height="83.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M287.0 136.875 H288.8333333333333 L287.0 137.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="288.83333333333337" y="136.25" width="1.8333333333333333" height="83.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M288.83333333333337 136.25 H290.6666666666667 L288.83333333333337 136.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="290.66666666666663" y="135.625" width="1.8333333333333333" height="84.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M290.66666666666663 135.625 H292.49999999999994 L290.66666666666663 136.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="292.5" y="135.0" width="1.8333333333333333" height="85.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M292.5 135.0 H294.3333333333333 L292.5 135.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="294.33333333333337" y="134.375" width="1.8333333333333333" height="85.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M294.33333333333337 134.375 H296.1666666666667 L294.33333333333337 135.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="296.16666666666663" y="133.75" width="1.8333333333333333" height="86.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M296.16666666666663 133.75 H297.99999999999994 L296.16666666666663 134.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="298.0" y="133.125" width="1.8333333333333333" height="86.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M298.0 133.125 H299.8333333333333 L298.0 133.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="299.83333333333337" y="132.5" width="1.8333333333333333" height="87.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M299.83333333333337 132.5 H301.6666666666667 L299.83333333333337 133.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="301.6666666666667" y="131.875" width="1.8333333333333333" height="88.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M301.6666666666667 131.875 H303.5 L301.6666666666667 132.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="303.5" y="131.25" width="1.8333333333333333" height="88.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M303.5 131.25 H305.3333333333333 L303.5 131.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="305.3333333333333" y="130.625" width="1.8333333333333333" height="89.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M305.3333333333333 130.625 H307.16666666666663 L305.3333333333333 131.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="307.1666666666667" y="130.0" width="1.8333333333333333" height="90.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M307.1666666666667 130.0 H309.0 L307.1666666666667 130.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="309.0" y="129.375" width="1.8333333333333333" height="90.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M309.0 129.375 H310.8333333333333 L309.0 130.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="310.8333333333333" y="128.75" width="1.8333333333333333" height="91.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M310.8333333333333 128.75 H312.66666666666663 L310.8333333333333 129.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="312.6666666666667" y="128.125" width="1.8333333333333333" height="91.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M312.6666666666667 128.125 H314.5 L312.6666666666667 128.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="314.5" y="127.5" width="1.8333333333333333" height="92.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M314.5 127.5 H316.3333333333333 L314.5 128.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="316.3333333333333" y="126.875" width="1.8333333333333333" height="93.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M316.3333333333333 126.875 H318.16666666666663 L316.3333333333333 127.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="318.1666666666667" y="126.25" width="1.8333333333333333" height="93.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M318.1666666666667 126.25 H320.0 L318.1666666666667 126.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="320.0" y="125.625" width="1.8333333333333333" height="94.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M320.0 125.625 H321.8333333333333 L320.0 126.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="321.8333333333333" y="125.0" width="1.8333333333333333" height="95.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M321.8333333333333 125.0 H323.66666666666663 L321.8333333333333 125.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="323.6666666666667" y="124.375" width="1.8333333333333333" height="95.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M323.6666666666667 124.375 H325.5 L323.6666666666667 125.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="325.5" y="123.75" width="1.8333333333333333" height="96.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M325.5 123.75 H327.3333333333333 L325.5 124.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="327.3333333333333" y="123.125" width="1.8333333333333333" height="96.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M327.3333333333333 123.125 H329.16666666666663 L327.3333333333333 123.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="329.1666666666667" y="122.5" width="1.8333333333333333" height="97.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M329.1666666666667 122.5 H331.0 L329.1666666666667 123.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="331.0" y="121.875" width="1.8333333333333333" height="98.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M331.0 121.875 H332.8333333333333 L331.0 122.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="332.8333333333333" y="121.25" width="1.8333333333333333" height="98.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M332.8333333333333 121.25 H334.66666666666663 L332.8333333333333 121.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="334.6666666666667" y="120.625" width="1.8333333333333333" height="99.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M334.6666666666667 120.625 H336.5 L334.6666666666667 121.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="336.5" y="120.0" width="1.8333333333333333" height="100.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M336.5 120.0 H338.3333333333333 L336.5 120.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="338.3333333333333" y="119.375" width="1.8333333333333333" height="100.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M338.3333333333333 119.375 H340.16666666666663 L338.3333333333333 120.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="340.1666666666667" y="118.75" width="1.8333333333333333" height="101.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M340.1666666666667 118.75 H342.0 L340.1666666666667 119.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="342.0" y="118.125" width="1.8333333333333333" height="101.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M342.0 118.125 H343.8333333333333 L342.0 118.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="343.8333333333333" y="117.5" width="1.8333333333333333" height="102.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M343.8333333333333 117.5 H345.66666666666663 L343.8333333333333 118.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="345.6666666666667" y="116.875" width="1.8333333333333333" height="103.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M345.6666666666667 116.875 H347.5 L345.6666666666667 117.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="347.5" y="116.25" width="1.8333333333333333" height="103.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M347.5 116.25 H349.3333333333333 L347.5 116.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="349.3333333333333" y="115.625" width="1.8333333333333333" height="104.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M349.3333333333333 115.625 H351.16666666666663 L349.3333333333333 116.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="351.1666666666667" y="115.0" width="1.8333333333333333" height="105.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M351.1666666666667 115.0 H353.0 L351.1666666666667 115.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="353.0" y="114.375" width="1.8333333333333333" height="105.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M353.0 114.375 H354.8333333333333 L353.0 115.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="354.8333333333333" y="113.75" width="1.8333333333333333" height="106.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M354.8333333333333 113.75 H356.66666666666663 L354.8333333333333 114.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="356.6666666666667" y="113.125" width="1.8333333333333333" height="106.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M356.6666666666667 113.125 H358.5 L356.6666666666667 113.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="358.5" y="112.5" width="1.8333333333333333" height="107.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M358.5 112.5 H360.3333333333333 L358.5 113.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="360.3333333333333" y="111.875" width="1.8333333333333333" height="108.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M360.3333333333333 111.875 H362.16666666666663 L360.3333333333333 112.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="362.1666666666667" y="111.25" width="1.8333333333333333" height="108.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M362.1666666666667 111.25 H364.0 L362.1666666666667 111.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="364.0" y="110.625" width="1.8333333333333333" height="109.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M364.0 110.625 H365.8333333333333 L364.0 111.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="365.8333333333333" y="110.0" width="1.8333333333333333" height="110.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M365.8333333333333 110.0 H367.66666666666663 L365.8333333333333 110.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="367.6666666666667" y="109.375" width="1.8333333333333333" height="110.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M367.6666666666667 109.375 H369.5 L367.6666666666667 110.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="369.5" y="108.75" width="1.8333333333333333" height="111.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M369.5 108.75 H371.3333333333333 L369.5 109.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="371.3333333333333" y="108.125" width="1.8333333333333333" height="111.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M371.3333333333333 108.125 H373.16666666666663 L371.3333333333333 108.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="373.1666666666667" y="107.5" width="1.8333333333333333" height="112.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M373.1666666666667 107.5 H375.0 L373.1666666666667 108.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="375.0" y="106.875" width="1.8333333333333333" height="113.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M375.0 106.875 H376.8333333333333 L375.0 107.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="376.8333333333333" y="106.25" width="1.8333333333333333" height="113.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M376.8333333333333 106.25 H378.66666666666663 L376.8333333333333 106.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="378.6666666666667" y="105.625" width="1.8333333333333333" height="114.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M378.6666666666667 105.625 H380.5 L378.6666666666667 106.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="380.5" y="105.0" width="1.8333333333333333" height="115.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M380.5 105.0 H382.3333333333333 L380.5 105.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="382.3333333333333" y="104.375" width="1.8333333333333333" height="115.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M382.3333333333333 104.375 H384.16666666666663 L382.3333333333333 105.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="384.1666666666667" y="103.75" width="1.8333333333333333" height="116.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M384.1666666666667 103.75 H386.0 L384.1666666666667 104.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="386.0" y="103.125" width="1.8333333333333333" height="116.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M386.0 103.125 H387.8333333333333 L386.0 103.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="387.8333333333333" y="102.5" width="1.8333333333333333" height="117.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M387.8333333333333 102.5 H389.66666666666663 L387.8333333333333 103.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="389.6666666666667" y="101.875" width="1.8333333333333333" height="118.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M389.6666666666667 101.875 H391.5 L389.6666666666667 102.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="391.5" y="101.25" width="1.8333333333333333" height="118.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M391.5 101.25 H393.3333333333333 L391.5 101.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="393.3333333333333" y="100.625" width="1.8333333333333333" height="119.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M393.3333333333333 100.625 H395.16666666666663 L393.3333333333333 101.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="395.1666666666667" y="100.0" width="1.8333333333333333" height="120.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M395.1666666666667 100.0 H397.0 L395.1666666666667 100.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="397.0" y="99.375" width="1.8333333333333333" height="120.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M397.0 99.375 H398.8333333333333 L397.0 100.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="398.8333333333333" y="98.75" width="1.8333333333333333" height="121.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M398.8333333333333 98.75 H400.66666666666663 L398.8333333333333 99.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="400.6666666666667" y="98.125" width="1.8333333333333333" height="121.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M400.6666666666667 98.125 H402.5 L400.6666666666667 98.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="402.5" y="97.5" width="1.8333333333333333" height="122.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M402.5 97.5 H404.3333333333333 L402.5 98.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="404.3333333333333" y="96.875" width="1.8333333333333333" height="123.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M404.3333333333333 96.875 H406.16666666666663 L404.3333333333333 97.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="406.1666666666667" y="96.25" width="1.8333333333333333" height="123.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M406.1666666666667 96.25 H408.0 L406.1666666666667 96.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="408.0" y="95.625" width="1.8333333333333333" height="124.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M408.0 95.625 H409.8333333333333 L408.0 96.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="409.8333333333333" y="95.0" width="1.8333333333333333" height="125.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M409.8333333333333 95.0 H411.66666666666663 L409.8333333333333 95.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="411.6666666666667" y="94.375" width="1.8333333333333333" height="125.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M411.6666666666667 94.375 H413.5 L411.6666666666667 95.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="413.5" y="93.75" width="1.8333333333333333" height="126.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M413.5 93.75 H415.3333333333333 L413.5 94.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="415.3333333333333" y="93.125" width="1.8333333333333333" height="126.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M415.3333333333333 93.125 H417.16666666666663 L415.3333333333333 93.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="417.1666666666667" y="92.5" width="1.8333333333333333" height="127.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M417.1666666666667 92.5 H419.0 L417.1666666666667 93.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="419.0" y="91.875" width="1.8333333333333333" height="128.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M419.0 91.875 H420.8333333333333 L419.0 92.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="420.8333333333333" y="91.25" width="1.8333333333333333" height="128.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M420.8333333333333 91.25 H422.66666666666663 L420.8333333333333 91.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="422.6666666666667" y="90.625" width="1.8333333333333333" height="129.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M422.6666666666667 90.625 H424.5 L422.6666666666667 91.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="424.5" y="90.0" width="1.8333333333333333" height="130.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M424.5 90.0 H426.3333333333333 L424.5 90.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="426.3333333333333" y="89.375" width="1.8333333333333333" height="130.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M426.3333333333333 89.375 H428.16666666666663 L426.3333333333333 90.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="428.1666666666667" y="88.75" width="1.8333333333333333" height="131.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M428.1666666666667 88.75 H430.0 L428.1666666666667 89.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="430.0" y="88.125" width="1.8333333333333333" height="131.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M430.0 88.125 H431.8333333333333 L430.0 88.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="431.8333333333333" y="87.5" width="1.8333333333333333" height="132.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M431.8333333333333 87.5 H433.66666666666663 L431.8333333333333 88.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="433.6666666666667" y="86.875" width="1.8333333333333333" height="133.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M433.6666666666667 86.875 H435.5 L433.6666666666667 87.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="435.5" y="86.25" width="1.8333333333333333" height="133.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M435.5 86.25 H437.3333333333333 L435.5 86.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="437.3333333333333" y="85.625" width="1.8333333333333333" height="134.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M437.3333333333333 85.625 H439.16666666666663 L437.3333333333333 86.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="439.1666666666667" y="85.0" width="1.8333333333333333" height="135.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M439.1666666666667 85.0 H441.0 L439.1666666666667 85.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="441.0" y="84.375" width="1.8333333333333333" height="135.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M441.0 84.375 H442.8333333333333 L441.0 85.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="442.8333333333333" y="83.75" width="1.8333333333333333" height="136.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M442.8333333333333 83.75 H444.66666666666663 L442.8333333333333 84.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="444.6666666666667" y="83.125" width="1.8333333333333333" height="136.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M444.6666666666667 83.125 H446.5 L444.6666666666667 83.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="446.5" y="82.5" width="1.8333333333333333" height="137.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M446.5 82.5 H448.3333333333333 L446.5 83.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="448.3333333333333" y="81.875" width="1.8333333333333333" height="138.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M448.3333333333333 81.875 H450.16666666666663 L448.3333333333333 82.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="450.1666666666667" y="81.25" width="1.8333333333333333" height="138.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M450.1666666666667 81.25 H452.0 L450.1666666666667 81.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="452.0" y="80.625" width="1.8333333333333333" height="139.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M452.0 80.625 H453.8333333333333 L452.0 81.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="453.8333333333333" y="80.0" width="1.8333333333333333" height="140.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M453.8333333333333 80.0 H455.66666666666663 L453.8333333333333 80.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="455.6666666666667" y="79.375" width="1.8333333333333333" height="140.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M455.6666666666667 79.375 H457.5 L455.6666666666667 80.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="457.5" y="78.75" width="1.8333333333333333" height="141.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M457.5 78.75 H459.3333333333333 L457.5 79.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="459.3333333333333" y="78.125" width="1.8333333333333333" height="141.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M459.3333333333333 78.125 H461.16666666666663 L459.3333333333333 78.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="461.1666666666667" y="77.5" width="1.8333333333333333" height="142.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M461.1666666666667 77.5 H463.0 L461.1666666666667 78.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="463.0" y="76.875" width="1.8333333333333333" height="143.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M463.0 76.875 H464.8333333333333 L463.0 77.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="464.8333333333333" y="76.25" width="1.8333333333333333" height="143.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M464.8333333333333 76.25 H466.66666666666663 L464.8333333333333 76.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="466.6666666666667" y="75.625" width="1.8333333333333333" height="144.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M466.6666666666667 75.625 H468.5 L466.6666666666667 76.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="468.5" y="75.0" width="1.8333333333333333" height="145.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M468.5 75.0 H470.3333333333333 L468.5 75.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="470.3333333333333" y="74.375" width="1.8333333333333333" height="145.625" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M470.3333333333333 74.375 H472.16666666666663 L470.3333333333333 75.0 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="472.1666666666667" y="73.75" width="1.8333333333333333" height="146.25" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M472.1666666666667 73.75 H474.0 L472.1666666666667 74.375 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="474.0" y="73.125" width="1.8333333333333333" height="146.875" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M474.0 73.125 H475.8333333333333 L474.0 73.75 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="475.8333333333333" y="72.5" width="1.8333333333333333" height="147.5" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M475.8333333333333 72.5 H477.66666666666663 L475.8333333333333 73.125 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="477.6666666666667" y="71.875" width="1.8333333333333333" height="148.125" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M477.6666666666667 71.875 H479.5 L477.6666666666667 72.5 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="479.5" y="71.25" width="1.8333333333333333" height="148.75" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M479.5 71.25 H481.3333333333333 L479.5 71.875 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="481.3333333333333" y="70.625" width="1.8333333333333333" height="149.375" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M481.3333333333333 70.625 H483.16666666666663 L481.3333333333333 71.25 Z" fill="#f43f5e" fill-opacity="0.55"/>
<rect x="483.1666666666667" y="70.0" width="1.8333333333333333" height="150.0" fill="#3b82f6" fill-opacity="0.14"/>
<path d="M483.1666666666667 70.0 H485.0 L483.1666666666667 70.625 Z" fill="#f43f5e" fill-opacity="0.55"/>
<line x1="45" y1="220" x2="485" y2="70" stroke="#3b82f6" stroke-width="2"/>
<line x1="45" y1="220" x2="495" y2="220" stroke="currentColor" />
<line x1="45" y1="220" x2="45" y2="63" stroke="currentColor" />
<text x="28" y="68" font-size="13" text-anchor="start" fill="currentColor">v</text>
<text x="487" y="240" font-size="13" text-anchor="end" fill="currentColor">1 s</text>
<text x="45" y="245" font-size="13" text-anchor="start" fill="currentColor">0</text>
<text x="45" y="272" font-size="13" text-anchor="start" fill="currentColor">4,9204 m · cộng dư 2,0 cm</text>
<rect x="45" y="290" width="40" height="15" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="45" y="327" font-size="13" fill="currentColor">Độ dài thanh = sai số · cùng thang đo</text>
</svg>
<ab-note>Bước rộng dùng vận tốc cuối bước cho cả khoảng, nên diện tích bị cộng dư nhiều.</ab-note>
<ab-note>Cùng một giây, bước nhỏ làm tổng phần dư giảm; kết quả vẫn chưa bằng 4,9000 m giải tích.</ab-note>
</ab-toggle>

Minh hoạ gộp bước của hình cũ: 5 bước lớn so với 10 bước nhỏ thì phần dư giảm một nửa; trong phép đo, 60 Hz cho 4,9817 m (+8,2 cm).

Không có "phiên bản đúng" trên máy tính — có vô số kết quả, mỗi tần số một cái. Ngay cả 240 Hz vẫn lệch 2 cm.

### 3.2 Dấu vân tay của sai số: đúng một nửa mỗi lần gấp đôi

Nhìn lại cột lệch, nhưng lần này nhìn **tỉ lệ giữa các dòng**:

```
16,3 → 8,2 → 4,1 → 2,0
 ×2     ×2     ×2
```

Tỉ lệ đo được là **2,000** ở cả ba lần gấp đôi tần số. Không phải "khoảng 2". Đúng 2.

Đây là công cụ chẩn đoán, không phải kiến thức trang trí:

> Sai số của tích phân bậc nhất tỉ lệ nghịch với số bước — gấp đôi tần số thì giảm đúng một nửa, mỗi lần, không lệch. **Lỗi float không bao giờ có quy luật đó**: nó phụ thuộc giá trị cụ thể và thứ tự phép tính, và nó nhảy loạn xạ chứ không xếp thành cấp số nhân.

Nên khi gặp chênh lệch giữa hai máy, bạn có bài test 30 giây trước khi mở debugger: **chạy lại ở gấp đôi tần số**. Giảm đúng một nửa → bài toán tích phân, đi tiếp mục 3.4. Nhảy lung tung hoặc không đổi → chuyện khác, bài 10 nói về nhóm đó.

Hệ quả rút thẳng từ tỉ lệ 2: muốn sai số quãng rơi 1 giây xuống **dưới 1 cm**, cần khoảng **490 Hz** — mục 3.5 dùng lại con số này.

### 3.3 Từ quãng rơi tới mép vực

Quay lại cú nhảy. Ở tần số thấp mỗi bước "rơi dư" một chút nên nhân vật mất độ cao nhanh hơn, và cú nhảy lên **thấp hơn**. Cùng `v0 = 7 m/s`:

| Tần số | Đỉnh nhảy | Mép vực 2,45 m |
|---|---|---|
| 30 Hz | 2,3847 m | ✗  không qua |
| 60 Hz | 2,4418 m | ✗  không qua |
| 120 Hz | 2,4709 m | ✓  qua |
| 144 Hz | 2,4757 m | ✓  qua |
| 240 Hz | 2,4854 m | ✓  qua |
| *giải tích (v0²/2g)* | *2,5000 m* | *✓* |

<svg viewBox="0 0 700 190" role="img" aria-labelledby="gs5-b-t gs5-b-d" style="width:100%;height:auto">
<title id="gs5-b-t">Đỉnh nhảy ở từng tần số so với mép vực 2,45 mét</title>
<desc id="gs5-b-d">Trục số từ 2,38 tới 2,51 mét. Mép vực nằm ở 2,45 mét chia trục làm hai. Đỉnh nhảy ở 30 Hz và 60 Hz nằm bên trái nên không qua được, còn 120 Hz, 144 Hz, 240 Hz và giá trị giải tích nằm bên phải nên qua được.</desc>
<rect x="40" y="70" width="343" height="34" fill="#ef4444" fill-opacity="0.12"/>
<rect x="383" y="70" width="277" height="34" fill="#84cc16" fill-opacity="0.14"/>
<line x1="40" y1="104" x2="670" y2="104" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="383" y1="52" x2="383" y2="124" stroke="#ef4444" stroke-width="3"/>
<text x="383" y="44" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">mép vực 2,45 m</text>
<text x="200" y="92" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">KHÔNG QUA</text>
<text x="520" y="92" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">QUA</text>
<circle cx="82" cy="104" r="5" fill="#ef4444"/>
<text x="82" y="126" text-anchor="middle" font-size="10" fill="currentColor">30 Hz</text>
<text x="82" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,3847</text>
<circle cx="345" cy="104" r="5" fill="#ef4444"/>
<text x="340" y="126" text-anchor="middle" font-size="10" fill="currentColor">60 Hz</text>
<text x="340" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4418</text>
<circle cx="480" cy="104" r="5" fill="#84cc16"/>
<text x="480" y="126" text-anchor="middle" font-size="10" fill="currentColor">120 Hz</text>
<text x="480" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4709</text>
<circle cx="502" cy="104" r="5" fill="#84cc16"/>
<text x="516" y="158" text-anchor="middle" font-size="10" fill="currentColor">144 Hz</text>
<text x="516" y="172" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4757</text>
<line x1="502" y1="110" x2="512" y2="146" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<circle cx="546" cy="104" r="5" fill="#84cc16"/>
<text x="580" y="126" text-anchor="middle" font-size="10" fill="currentColor">240 Hz</text>
<text x="580" y="140" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,4854</text>
<line x1="546" y1="110" x2="572" y2="118" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
<circle cx="614" cy="104" r="5" fill="#3b82f6"/>
<text x="640" y="160" text-anchor="middle" font-size="10" fill="currentColor">giải tích</text>
<text x="640" y="174" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">2,5000</text>
<line x1="614" y1="110" x2="634" y2="148" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>
</svg>

Bạn không viết một game. Bạn vô tình viết **một họ game**, đánh số bằng framerate của máy người chơi, và mép vực 2,45 m là đường phân chia họ đó làm hai. Khoảng cách 30 Hz ↔ 144 Hz là **9,11 cm** — biên độ mà thiết kế màn chơi của bạn đang trôi qua lại, không kiểm soát được.

> Người có máy mạnh không "chơi mượt hơn". Họ **chơi một game khác**.

Và cả hai bug report **đều đúng** — không report nào đóng được là "không tái hiện được". Ở BE App, hai report ngược nhau trên cùng một input là dấu hiệu có race condition. Ở đây không có race nào cả, chỉ có hai máy chạy hai số bước khác nhau.

---

## ⏸ Dừng lại — đoán trước #2

Bạn đã biết nguyên nhân. Giờ chọn cách sửa. Hai phương án dưới đây là hai phản xạ tự nhiên nhất.

```
(a) Đo dt thật mỗi frame rồi dùng luôn: dt = now - lastFrame.
    Máy nhanh bước nhỏ, máy chậm bước to — tổng quãng đường vẫn bằng nhau.

(b) Chốt cứng 240 Hz. Bảng nói rõ tần số càng cao càng gần đúng,
    nên lấy mức cao nhất máy chịu được là xong.

(c) Cả hai đều sai, và lý do khiến (a) sai đã nằm sẵn trong bài rồi.
```

Nếu bạn chọn (c), hãy tự trả lời tiếp: **cái gì trong bài đã là phản chứng của (a)?** Chỉ ra được đúng chỗ đó thì mục sau bạn đọc trong 20 giây.

---

### 3.4 Cách sửa thứ nhất: đo `dt` thật rồi dùng luôn

Đây là phản xạ đầu tiên của gần như tất cả mọi người, kể cả người viết engine:

```go
dt := now.Sub(lastFrame)   // máy nhanh bước nhỏ, máy chậm bước to
world.Update(dt)           // tổng quãng đường thì vẫn bằng nhau chứ?
```

Lập luận nghe kín kẽ: đi 10 bước mỗi bước 0,1 giây hay 100 bước mỗi bước 0,01 giây thì cũng là 1 giây. Thời gian có mất đi đâu.

**Nhưng bảng ở mục 3.1 chính là bảng đó.** Mỗi dòng *là* một `dt` đo được khác nhau: dòng 30 Hz là `dt = 33,3 ms`, dòng 144 Hz là `dt = 6,94 ms`. Cả hai đều đúng 1 giây, và chúng cho ra 5,0633 m với 4,9340 m — chênh 12,9 cm. Variable timestep không sửa vấn đề, **nó là vấn đề**, chỉ khác cái tên.

Và nó tệ hơn một bậc so với tình trạng hiện tại: `dt` giờ khác nhau **giữa hai frame trên cùng một máy**. Frame nào GC chạy, frame nào OS lấy CPU đi làm việc khác, frame đó `dt` dài ra. Hậu quả:

- Cùng một người chơi, cùng một cú nhảy, độ cao khác nhau tuỳ máy có đang bận hay không.
- Bug hết tái hiện được. Ở mục 2, người ở #218 ít nhất còn *luôn luôn* không qua nên debug được; với variable timestep anh ta qua được 7 lần trong 40 lần thử và không ai biết vì sao.
- Test tự động mất tác dụng: cùng kịch bản chạy hai lần trên cùng một máy ra hai kết quả.

Bạn vừa đổi một bug tất định lấy một bug ngẫu nhiên. Đây là chỗ trực giác phản bội, nên nó đáng ghi lại:

> Phép tích phân rời rạc **không tuyến tính theo số bước**. Chia nhỏ rồi cộng lại không cho ra cùng một kết quả. Mọi lập luận kiểu "tổng thì vẫn bằng nhau" đều sai ở đây, nghe hợp lý đến đâu cũng vậy.

### 3.5 Cách sửa thứ hai: vậy chốt 240 Hz cho chính xác

Phương án này thông minh hơn hẳn: nó **cố định** `dt`, nên đã đi đúng nửa đường. Lập luận: tần số càng cao càng gần đúng, vậy chốt mức cao nhất máy chịu được. Ba vấn đề, xếp theo mức chí tử tăng dần.

**Một — đắt gấp 4.** Ngân sách mỗi bước tụt từ **16,67 ms xuống 4,17 ms**. Với một game server chạy nhiều trận trên một máy, số trận mỗi máy chia 4. Đây là tiền thật, trả hàng tháng.

**Hai — vẫn không đúng.** 240 Hz lệch **2,0 cm**. Bạn vừa trả gấp 4 tiền để mua một con số **vẫn sai**, chỉ là sai ít hơn. Muốn xuống dưới 1 cm cần ~490 Hz (mục 3.2), gấp hơn 8 lần 60 Hz — và vẫn không phải 0. Đường tiệm cận này không chạm đáy: mỗi centimet tiếp theo đắt gấp đôi centimet trước.

**Ba — chỗ chết: không phải máy nào cũng giữ nổi 240 Hz.** Một máy tụt xuống 180 Hz vì tải, vì pin yếu, vì thermal throttling — và bạn quay về đúng bài toán ban đầu:

```
180 Hz → đỉnh nhảy 2,4806 m
240 Hz → đỉnh nhảy 2,4854 m
chênh 4,8 mm — hai máy, hai kết quả, y hệt vấn đề cũ
```

4,8 mm nhỏ hơn 3,39 cm rất nhiều, nhưng "nhỏ hơn" không phải "hết". Mép vực nào rơi vào khe đó sẽ tạo ra đúng cặp bug report ở mục 2 — và lần này bạn debug lâu hơn, vì con số nhỏ nên nó trông giống lỗi float hơn.

Đây là chỗ nhận ra bạn đã hỏi sai câu hỏi ngay từ đầu:

> Vấn đề chưa bao giờ là **"sai số bao nhiêu"**. Vấn đề là **"sai số của tôi có bằng sai số của bạn không"**.

Tăng Hz tấn công câu hỏi thứ nhất. Câu hỏi thứ hai nó không chạm được — và đó mới là câu tạo ra bug report.

### 3.6 Cách sửa đúng: bỏ mục tiêu "chính xác", lấy mục tiêu "giống nhau"

```go
const dt = time.Second / 60   // 16,666666 ms — hằng số của hệ thống, không bao giờ đổi
```

Với hằng số này, nhân vật rơi 4,9817 m thay vì 4,9000 m. Sai **8,2 cm** so với vật lý thật — **vĩnh viễn, ở mọi máy, ở mọi lần chạy**.

Và điều đó hoàn toàn ổn. Bạn không mô phỏng vũ trụ, bạn mô phỏng một game — `g = 9,8` cũng đã là con số bịa, vì nhân vật của bạn nhảy cao 2,5 m thì chẳng ai trên Trái Đất làm được. Nếu 8,2 cm làm cú nhảy sai ý đồ thiết kế, bạn chỉnh `v0`: một hằng số trong file config, sửa một lần, mọi máy nhận cùng một sửa đổi.

Sai số hệ thống thì chỉnh được bằng một hằng số. Sai số *khác nhau giữa các máy* thì không chỉnh được bằng bất cứ gì, vì bạn không biết máy nào đang chạy ở đâu.

Câu hỏi tiếp theo: **máy chậm thì sao?** Nếu nó không chạy nổi 60 bước mỗi giây?

> Simulation không được phép biết máy nhanh hay chậm.
> Máy chậm chạy **ít bước hơn trong một giây**, chứ không phải chạy **bước dài hơn**.

Hai vế nghe gần giống nhau nhưng khác hẳn về hậu quả. "Bước dài hơn" nghĩa là máy chậm mô phỏng ra một thế giới khác — đúng bug ở mục 2. "Ít bước hơn" nghĩa là nó mô phỏng ra **cùng một thế giới, chỉ tụt lại phía sau thời gian thật**. Vấn đề thứ hai có cách xử lý, và cách xử lý đó là bài 6.

### 3.7 Đóng đinh ràng buộc vào chữ ký hàm

Một hằng số `dt` không tự bảo vệ được mình: sáu tháng nữa sẽ có người thêm hiệu ứng mới và gọi `time.Now()` bên trong nó, vì lúc đó đó là cách nhanh nhất làm xong việc. Cách chặn không phải comment, là chữ ký hàm:

```go
func Run(ctx context.Context, cfg Config, sched Scheduler, step func(dt time.Duration), st *Stats)
```

`step` **nhận `dt` từ bên ngoài** và bên trong nó **không có đường nào lấy được thời gian thật**. Không phải viết thế cho đẹp — mà vì nếu để ngỏ, người dùng sai sẽ không nhận được lỗi biên dịch, không panic, không log. Họ nhận được hai bug report ngược nhau, sáu tháng sau, từ người chơi.

Nguyên tắc thì backend đã quen ở chỗ khác — truyền `context` vào thay vì để hàm tự tạo, truyền `clock` vào thay vì gọi `time.Now()` để test được: **thứ gì là nguồn của sự không xác định thì phải đi qua tham số**. Ở game server nó không phải best practice mà là điều kiện để hệ thống chạy đúng. Và `dt` cố định mở đường cho một tính chất lớn hơn nhiều — cùng state đầu vào cộng cùng chuỗi input cho ra cùng kết quả, ở mọi máy — thứ mà chương 3 và bài 9 dựng lên.

---

## 4. Ngành đã vấp đúng chỗ này, ở những chỗ không ai ngờ

**Đánh dấu mức độ chắc chắn trước khi đọc.** Hai ví dụ dưới đây được biết rộng rãi trong cộng đồng game nhưng tôi **không verify được từ nguồn gốc** (mã nguồn, thông báo chính thức của studio) trong lúc viết bài. Đọc như **giai thoại kỹ thuật để nhớ hình dạng của lỗi**, đừng trích như tài liệu chính thống.

**Dark Souls II (2014) — độ bền vũ khí.** Cộng đồng ghi nhận: độ bền vũ khí bị trừ **mỗi frame** thay vì mỗi đơn vị thời gian. Trên console 30 FPS thì cân bằng đúng thiết kế. Bản PC chạy 60 FPS, vũ khí hỏng **nhanh gấp đôi**.

Điều đáng rút ra không phải "họ ẩu" — FromSoftware năm 2014 có nhiều kinh nghiệm hơn bạn và tôi cộng lại — mà là **lỗi này không nằm ở chỗ bạn nhìn**:

> Không ai đi review dòng code trừ độ bền vũ khí để tìm bug phụ thuộc framerate. Người ta đi review code vật lý.

Lỗi loại này xuất hiện ở **bất cứ đâu có đại lượng bị cộng hoặc trừ theo frame** — hồi chiêu, độc, hồi máu, tích nộ, tăng nhiệt, đếm combo. Danh sách đó rất dài, nằm rải rác khắp codebase gameplay, và phần lớn do người viết gameplay viết chứ không phải người viết engine.

**Dòng engine của Bethesda (Skyrim, Fallout 4) — vật lý gắn vào framerate.** Chuyện được biết rộng rãi: vật lý Havok trong dòng engine này chạy theo nhịp frame, nên trên màn hình trên 60 Hz thì đồ vật rung, bay lên, một số chuyển động đổi tốc độ. Đây là lý do các game đó từng khoá FPS ở 60 và người chơi PC phải vá tay.

Hai ví dụ, một hình dạng chung — chính là câu ở mục 3.6 nhìn từ phía hậu quả:

> Chỗ nào trong code có phép `x += something` chạy mỗi frame mà không nhân với `dt`, chỗ đó đang đo thời gian bằng đơn vị "frame". Và "frame" không phải đơn vị thời gian — nó là đơn vị **phần cứng**.

Cả hai trường hợp đều sống qua nhiều bản vá, ở những studio làm game hàng chục năm.

---

## 5. Tính tay

Giấy và bút. Mọi số cần thiết đều có trong bài.

**Bài 1 — ngoại suy sai số.**
Bảng mục 3.1: cứ gấp đôi tần số thì sai số quãng rơi 1 giây giảm đúng một nửa.
- Từ mốc 240 Hz lệch 2,0 cm, suy ra sai số ở 480 Hz và ở 960 Hz.
- Muốn sai số dưới 1 cm thì cần bao nhiêu Hz? Dưới 1 mm thì cần bao nhiêu?
- Ngân sách mỗi bước ở tần số cuối cùng đó là bao nhiêu mili giây? So với 16,67 ms.

**Bài 2 — thiết kế màn chơi ngược.**
Bạn muốn cú nhảy `v0 = 7 m/s` qua được vực ở **mọi** tần số từ 30 Hz tới 240 Hz.
- Mép vực cao nhất bạn được phép đặt là bao nhiêu? (Dùng bảng mục 3.3, chú ý lấy dòng nào.)
- Bây giờ đảo lại: bạn muốn nó **không** qua được ở mọi tần số. Mép vực thấp nhất là bao nhiêu?
- Khoảng ở giữa hai con số đó rộng bao nhiêu centimet? Đó chính là **vùng cấm thiết kế** nếu bạn dùng variable timestep. Bạn có sẵn sàng nhớ tránh nó ở 200 màn chơi không?

**Bài 3 — cái giá của "chính xác".**
Server 60 Hz, mỗi bước sim tốn 1,18 µs cho 1.000 entity (số đo thật, bài 8 sẽ dùng lại).
- Ở 60 Hz, sim chiếm bao nhiêu phần trăm ngân sách 16,67 ms?
- Chuyển lên 490 Hz để mua sai số dưới 1 cm: ngân sách mỗi bước còn bao nhiêu, và sim chiếm bao nhiêu phần trăm?
- Con số thứ hai vẫn rất nhỏ. Vậy vì sao **vẫn không nên** làm thế? (Gợi ý: lý do không nằm ở CPU. Nó nằm ở mục 3.5, vấn đề số ba.)

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn được giao làm một game idle/incremental.** Người chơi mua máy sản xuất, mỗi máy sinh tài nguyên theo thời gian. Không vật lý, không va chạm. Đặc điểm riêng: game vẫn **tính tiếp khi người chơi đóng app** — mở lại sau 3 ngày phải nhận đủ tài nguyên của 3 ngày đó. Người chơi trả tiền thật để mua máy, nên số liệu sai là mất tiền của họ.

1. Ở đây có phép tích phân rời rạc không? Nếu tốc độ sản xuất là hằng số, sai số ở mục 3.1 có xuất hiện không — và câu trả lời đổi thế nào nếu tốc độ sản xuất **tăng dần theo số máy đang có**?
2. "Nhận đủ tài nguyên của 3 ngày offline" — tính bằng cách chạy bù 3 ngày × 60 bước/giây, hay bằng một công thức đóng? Mỗi cách trả giá bằng gì?
3. Nếu dùng công thức đóng cho phần offline nhưng vẫn tick 60 Hz khi app mở, bạn vừa tạo ra **hai đường tính khác nhau cho cùng một đại lượng**. Người tắt-mở app liên tục nhận được nhiều hay ít hơn người để app chạy suốt?
4. Người chơi báo: "tôi để máy 8 tiếng được ít tài nguyên hơn bạn tôi, cùng cấu hình". Bạn kiểm tra ba giả thuyết nào, theo thứ tự nào? Bài test 30 giây ở mục 3.2 dùng được ở đây không?
5. Tick rate game này nên là bao nhiêu, và lập luận khác gì với game bắn súng? **Cái gì trong bài này vẫn đúng** dù tick rate xuống 1 Hz?
6. **Câu khó nhất:** sai số 8,2 cm ở mục 3.6 quy sang game này là "người chơi nhận ít hơn 1,67% tài nguyên so với công thức toán học đúng". Bạn **chấp nhận** nó vĩnh viễn như bài này khuyên, hay bạn **không được phép**? Trả lời rồi hỏi tiếp: điều gì ở game này khác platformer khiến câu trả lời đổi — và nếu không được phép chấp nhận, thì nguyên tắc "giống nhau quan trọng hơn chính xác" còn đúng không, hay nó chỉ đúng trong một lớp bài toán cụ thể?

Câu 6 đo xem bạn đã hiểu hay chỉ vừa đọc xong. Mọi nguyên tắc kỹ thuật đều có một miền hiệu lực, và người dùng nguyên tắc mà không biết miền của nó sẽ áp nó vào đúng chỗ nó sai.

---

## 7. Tóm tắt

- Cùng công thức, chỉ đổi số bước, ra **năm kết quả khác nhau**: rơi 1 giây được 5,0633 m ở 30 Hz và 4,9340 m ở 144 Hz; giải tích 4,9000 m. Không dòng nào là "đúng".
- Sai số giảm **đúng một nửa mỗi lần gấp đôi tần số** (tỉ lệ đo được 2,000) — dấu vân tay của tích phân bậc nhất. **Lỗi float không có quy luật đó**, nên đây là bài test 30 giây trước khi mở debugger.
- Đỉnh nhảy `v0 = 7 m/s`: **2,4418 m ở 60 Hz, 2,4757 m ở 144 Hz**, mép vực 2,45 m rơi đúng vào giữa. Hai bug report ngược nhau, cả hai đều đúng, không có bug nào để sửa.
- "Đo `dt` thật rồi dùng luôn" **không sửa gì** — bảng sai số chính là bảng các `dt` khác nhau — và còn tệ hơn: `dt` đổi giữa hai frame trên **cùng một máy**, biến bug tất định thành bug ngẫu nhiên.
- "Chốt 240 Hz cho chính xác" tốn **CPU gấp 4** (ngân sách 16,67 → 4,17 ms), **vẫn sai 2,0 cm**, và chết khi một máy tụt xuống 180 Hz — chênh 4,8 mm là vấn đề cũ với con số nhỏ hơn.
- Câu hỏi đúng không phải "sai số bao nhiêu" mà **"sai số của tôi có bằng sai số của bạn không"**. Tăng Hz chỉ tấn công câu thứ nhất.
- `dt` là **hằng số của hệ thống**. Sai 8,2 cm vĩnh viễn ở mọi máy thì chỉnh được bằng một hằng số config; hai máy ra hai kết quả thì không chỉnh được bằng gì.
- **Máy chậm chạy ít bước hơn, không phải bước dài hơn.** Ràng buộc đóng đinh vào chữ ký `step(dt time.Duration)` — không có đường lấy thời gian thật từ bên trong, cố ý.
- Lỗi này không nằm ở code vật lý mà ở mọi chỗ có `x += something` mỗi frame: độ bền vũ khí, hồi chiêu, độc, hồi máu. *(Dark Souls II và dòng engine Bethesda — giai thoại kỹ thuật được biết rộng rãi, không verify từ nguồn gốc.)*

→ **Bài 6 — Accumulator, catch-up & spiral of death**: `dt` cố định rồi, nhưng thời gian thật thì không — ai nối hai cái lại?
