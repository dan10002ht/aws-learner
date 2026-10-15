# Bài 13 — Kiểm UI: so ảnh, không so chữ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra cho một phép kiểm UI cụ thể **nó đo được gì và không đo được gì**, và lấy ví dụ hai màn hình cho cùng một kết quả đo nhưng sai khác nhau về bố cục.
- Viết done-criteria cho một màn hình dưới dạng **ảnh build đặt cạnh ảnh mockup, từng state**, kèm danh sách state phải chụp.
- Dựng một screenshot test bằng `toHaveScreenshot` của Playwright, và chứng minh bằng số rằng `threshold` / `maxDiffPixelRatio` của chính bạn **còn đỏ được** trước một lỗi bố cục.
- Đo layout shift (CLS) và bề ngang bằng browser automation với **control test** đi kèm, rồi loại một kết quả "0" khi control cũng ra 0.
- Ước lượng thời gian và token cho một đợt kiểm UI bằng agent ở quy mô vài trăm ảnh, trước khi giao cho loop.

---

## 2. Tình huống

Một team làm extension giao diện cho trang tài khoản khách hàng của một app SaaS thương mại điện tử. Có mockup HTML tĩnh do designer làm, gồm 7 màn. Việc được chia thành **11 task**, giao cho **6 worker agent**, mỗi task có verifier độc lập chấm, tổng **5 lượt verify**. Gate xanh hết. Cả 11 task được đánh dấu "xong" (case thực tế, một lần chạy, không phải benchmark).

Rồi có người mở trình duyệt và **nhìn** màn hình build cạnh mockup. Không màn nào đúng:

- Mockup lưới sản phẩm `grid-template-columns: repeat(3, 1fr)`, build ra 2 cột. Mockup chia `68% / 1fr`, build ra 50/50.
- Một section có tiêu đề kiểu "Your weekly …" nhưng **bên dưới tiêu đề là khoảng trống**, không có dòng sản phẩm nào.
- Mỗi card thiếu 4/8 phần tử: ảnh sản phẩm, badge, dòng ngày giao, subtotal.
- Tab được render bằng một component chữ thường, nên **không bấm được**.
- Một badge bị cắt cụt thành `10:00am Tu…`.
- Toolbar lẽ ra nằm sau một nút bánh răng thì lại nằm inline.

Không ai làm ẩu. Brief của mỗi task đều ghi *"match structure, order and wording — not fonts or colours"*. Mỗi lượt verify đều làm cùng một việc: lấy `document.body.innerText` của màn build, so với chữ trong file mockup. **Chữ khớp thật.** 11 task, 6 worker, 5 verifier — tất cả đều đúng theo đúng phép đo họ được giao. Phép đo đó sai.

Cùng đợt, có hai lần agent kết luận ngược hướng: "màn hình trắng hoàn toàn" và "kẹt loading vĩnh viễn". Cả hai lần đều là **ảnh chụp trước khi trang render xong** — một request mất 6,6 s vì backend gọi ước tính thuế cho từng order một (kinh nghiệm thực tế, cùng case).

---

## ⏸ Dừng lại — đoán trước

Chọn một đáp án trước khi đọc tiếp.

**Vì sao cả 11 lượt verify cùng PASS một màn hình sai bố cục?**

```
(a) Verifier lười, chỉ đọc lướt — đổi model mạnh hơn là bắt được
(b) Đơn vị đo (innerText) không chứa bố cục, và câu miễn trừ trong brief đẩy bố cục ra ngoài phạm vi chấm
(c) Mockup HTML sai, build mới đúng
(d) Thiếu test end-to-end; thêm E2E bấm qua từng màn là đủ
```

---

## 3. Cơ chế

### 3.1 Một phép đo chỉ thấy được thứ nằm trong đơn vị đo của nó

`innerText` là chuỗi chữ mà trình duyệt *sẽ hiển thị* cho một phần tử, theo thứ tự trong DOM (MDN: `HTMLElement.innerText`). Nó chứa: chữ, thứ tự chữ, và xuống dòng tương ứng với block. Nó **không** chứa:

| Thứ cần kiểm | Có trong `innerText`? | Vì sao |
|---|---|---|
| Lưới 3 cột hay 2 cột | Không | Cùng ba ô chữ, đổi cột chỉ đổi toạ độ, không đổi chuỗi |
| Tỉ lệ `68% / 1fr` vs `50/50` | Không | Bề ngang không phải ký tự |
| Ảnh sản phẩm, icon, khung xám | Không | Phần tử không có chữ đóng góp chuỗi rỗng |
| Section "có nội dung" vs "chỉ có tiêu đề" | Một nửa | Tiêu đề có trong chuỗi ⇒ dễ đọc thành "section đã render" |
| Tab bấm được hay không | Không | `<button>Tab</button>` và `<span>Tab</span>` cho cùng chữ `Tab` |
| Chữ bị cắt cụt bằng CSS (`text-overflow: ellipsis`) | Không | Chuỗi gốc còn nguyên; dấu `…` chỉ là phần vẽ |

Hàng cuối là lý do badge `10:00am Tu…` lọt qua: `innerText` vẫn trả `10:00am Tuesday`, phần bị cắt chỉ tồn tại trên pixel.

Hệ quả chung: phép so chữ **không phân biệt được** "build đúng" với "build sai bố cục nhưng đúng chữ". Theo nghĩa của [[ag-11-gate-xanh-gia]], nó là một thước không đỏ được trước đúng loại lỗi bạn đang lo. Ở bài 11 là gate quan sát sai tầng; ở đây là gate dùng **sai đơn vị** — text đo nội dung, không đo hình.

Đáp án câu ⏸ là **(b)**. (a) sai vì model mạnh hơn vẫn chỉ nhận chuỗi; nó không có dữ liệu bố cục để bắt. (d) bắt được tab không bấm được, nhưng một E2E bấm-và-kiểm-chữ vẫn mù trước 3 cột vs 2 cột.

### 3.2 Câu miễn trừ khái quát nuốt mất bố cục

Câu *"match structure, order and wording — not fonts or colours"* được viết để miễn trừ thứ **không làm được**: trên nền tảng đó, extension không chỉnh được font và màu chính xác. Nhưng "structure" không được định nghĩa, còn "not fonts or colours" được đọc rộng thành "không chấm phần nhìn". Bố cục rơi vào nhóm "phần nhìn", và thế là bị miễn.

Kinh nghiệm thực tế từ case: khi một tiêu chí có phần miễn trừ, **phần miễn trừ phải liệt kê đích danh** thứ được bỏ qua. Dùng một chữ khái quát ("cosmetic", "skin", "styling") thì người và agent chấm sau sẽ xếp vào đó thứ bất tiện nhất cho họ. So hai cách viết:

```text
# Miễn trừ khái quát — hỏng
Match structure, order and wording — not fonts or colours.

# Miễn trừ đích danh — kiểm được
PHẢI KHỚP mockup: số cột của lưới, tỉ lệ cột, thứ tự section, đủ 8 phần tử mỗi card,
  phần tử tương tác (tab, nút) bấm được, không chữ nào bị cắt cụt.
ĐƯỢC LỆCH: font-family, mã màu chính xác, bo góc (nền tảng không cho chỉnh).
Bằng chứng: ảnh build + ảnh mockup cùng viewport, từng state trong danh sách STATES.
```

Bản thứ hai biến một câu văn thành danh sách các thứ có thể đo, đúng tinh thần [[ag-10-done-criteria-va-gate]].

### 3.3 Done-criteria của một màn hình là ảnh, từng state

Luật rút ra từ case: **done-criteria của một màn hình là ảnh mockup đặt cạnh ảnh build, từng màn.** Có ba chi tiết làm luật này dùng được:

**(1) Mockup HTML phải được render ra ảnh rồi mới so.** Agent đọc file HTML của mockup, thấy `repeat(3, 1fr)`, rồi đọc code build thấy component lưới — rồi kết luận "khớp". Đọc HTML rồi dừng ở đó chính là lỗi so chữ, chỉ đổi từ chữ hiển thị sang chữ nguồn. Render mockup bằng chính browser automation, cùng viewport với build.

**(2) Liệt kê state space trước khi chụp.** State là một tổ hợp điều kiện làm màn hình trông khác: tab đang chọn, chế độ grid/list, có/không dữ liệu, modal mở/đóng. Một mockup dạng SPA thường giữ mọi màn sẵn trong DOM, nên đọc danh sách control (tab, toggle, link) là ra toàn bộ bề mặt. Trong case, danh sách đó cho ra 7 màn: hai nhóm tab × hai chế độ hiển thị, cộng ba màn chi tiết. Chụp thiếu một state là bỏ lọt cả một layout.

```ts
// states.ts — danh sách state là một phần của done-criteria (minh hoạ, đổi selector theo app của bạn)
export const STATES = [
  { name: 'upcoming-grid', steps: ['tab:Upcoming', 'view:grid'] },
  { name: 'upcoming-list', steps: ['tab:Upcoming', 'view:list'] },
  { name: 'mine-grid',     steps: ['tab:Mine',     'view:grid'] },
  { name: 'mine-list',     steps: ['tab:Mine',     'view:list'] },
  { name: 'detail',        steps: ['open:first-card'] },
  { name: 'order-detail',  steps: ['open:first-order'] },
  { name: 'history',       steps: ['tab:History'] },
  // state hay bị quên: modal mở, danh sách rỗng, lỗi API, mobile 375px
];
```

**(3) Assert "đã render" trước khi tin ảnh.** Hai kết luận "trắng hoàn toàn" / "kẹt vĩnh viễn" trong case đều là ảnh chụp sớm. Một ảnh không tự nói nó được chụp lúc nào. Trước mỗi lần chụp, chờ một điều kiện **nội dung** chứ không chờ thời gian: số card bằng N, bảng có ≥1 dòng, spinner đã biến mất. Playwright có sẵn kiểu chờ này: `await expect(locator).toHaveCount(n)` tự retry tới khi đúng hoặc hết timeout (docs: playwright.dev/docs/test-assertions). Không dựa vào `waitForLoadState('networkidle')` — docs Playwright ghi rõ state này là **DISCOURAGED** (playwright.dev/docs/api/class-page, mục `waitForLoadState`).

### 3.4 Ai so hai ảnh: pixel diff, mắt model, hay probe cấu trúc

Có ba cách biến "ảnh build vs ảnh mockup" thành một verdict, và mỗi cách hợp một hoàn cảnh khác nhau. Lý do khác nhau nằm ở chỗ **baseline từ đâu ra**.

**Pixel diff — khi baseline được render bằng cùng công nghệ.** Đây là regression test: ảnh hôm qua của chính app vs ảnh hôm nay. Playwright Test làm việc này bằng `toHaveScreenshot` (docs: playwright.dev/docs/test-snapshots):

```js
await expect(page).toHaveScreenshot('weekly.png');
```

Theo docs:
- Lần chạy đầu sinh ảnh tham chiếu; tên file gắn hậu tố nền tảng (ví dụ `example-test-1-chromium-darwin.png`). Cập nhật baseline bằng `npx playwright test --update-snapshots`.
- *"Browser rendering can vary based on the host OS, version, settings, hardware"* — nên baseline phải sinh trong cùng môi trường chạy test (thường là cùng Docker image trên CI).
- Assertion chờ tới khi **hai ảnh chụp liên tiếp giống nhau** rồi mới so với baseline — một lớp chống chụp sớm, nhưng không thay được assert nội dung ở 3.3: một trang kẹt spinner tĩnh cũng cho hai ảnh liên tiếp giống nhau.
- Mặc định `animations: "disabled"`, `caret: "hide"`, `threshold: 0.2`; có `mask` để che vùng động (giờ, avatar), `maxDiffPixels` / `maxDiffPixelRatio` để cho phép lệch (docs: playwright.dev/docs/api/class-pageassertions).

**Mắt model — khi baseline là mockup làm bằng công nghệ khác.** Mockup HTML tĩnh và extension build bằng component của nền tảng sẽ không bao giờ trùng pixel: font khác, bo góc khác, khoảng cách lệch vài px. Pixel diff ở đây đỏ toàn bộ và vô dụng. Cách dùng được: chụp cả hai cùng viewport, đặt cạnh nhau, và giao cho một agent **nhìn** với checklist đích danh từ 3.2. Claude Code đọc được ảnh: tool `Read` trả file PNG/JPG về dạng nội dung hình (docs: code.claude.com/docs/en/tools-reference, mục Read tool behavior). Prompt cho verifier ảnh nên ép trả lời từng mục, không cho phép một câu "looks good":

```text
Ảnh 1: mockup, state "upcoming-grid", 1280x720. Ảnh 2: build, cùng state, cùng viewport.
Với MỖI mục dưới đây, trả "KHỚP" hoặc "LỆCH: <mô tả ngắn, nêu vị trí>":
1. Số cột của lưới sản phẩm
2. Tỉ lệ bề ngang cột trái / cột phải
3. Mỗi card có đủ: ảnh, tên, badge, ngày giao, giá, subtotal, nút sửa, nút bỏ qua
4. Section nào có tiêu đề nhưng không có nội dung bên dưới
5. Chữ nào bị cắt bằng dấu "…"
Không chấm: font-family, mã màu, bo góc.
Verdict: PASS chỉ khi cả 5 mục KHỚP.
```

Theo docs vision, model có giới hạn về đếm và định vị chính xác (*"Counting: Claude can give approximate counts…"*, platform.claude.com/docs/en/build-with-claude/vision, mục Limitations). Nên mục nào đếm được bằng máy thì đếm bằng máy.

**Probe cấu trúc — đếm bằng máy những gì đếm được.** Đây là lớp giữa: không so pixel, không nhờ mắt, mà hỏi DOM những câu có đáp án số. Số cột lấy từ `getComputedStyle(el).gridTemplateColumns` (giá trị đã resolve ra danh sách px, mỗi cột một giá trị); số phần tử con lấy bằng `locator.toHaveCount`; vị trí lấy bằng `locator.boundingBox()`. Probe bắt được "3 cột vs 2 cột" và "thiếu ảnh trong card" một cách tất định, chạy trong mili giây.

Sau khi đã hiểu nguồn gốc của từng cách, bảng chọn:

| Cách | Baseline | Bắt tốt | Mù trước | Chi phí mỗi state |
|---|---|---|---|---|
| So `innerText` | Chữ mockup | Sai chữ, thiếu chữ | Mọi lỗi bố cục, phần tử không chữ, tương tác | Gần 0 |
| Pixel diff (`toHaveScreenshot`) | Ảnh cũ cùng công nghệ | Mọi thay đổi pixel vượt ngưỡng | Thay đổi nằm dưới `threshold`; không dùng được khi baseline khác công nghệ | Mili giây + lưu ảnh |
| Probe cấu trúc | Con số rút từ mockup | Số cột, số phần tử, kích thước | Thứ bạn không nghĩ ra để probe | Mili giây |
| Mắt model với checklist | Ảnh mockup bất kỳ | Bố cục tổng thể, phần tử thiếu, chữ cắt cụt | Đếm chính xác, lệch vài px | Token ảnh (tính ở 3.6) |

Trong thực tế bạn ghép: probe cho thứ đếm được, mắt model cho thứ phải nhìn, pixel diff để giữ màn đã duyệt khỏi trôi về sau.

### 3.5 Pixel diff cũng nói dối nếu ngưỡng nuốt mất lỗi

Pixel diff nghe như phép đo không thể sai. Phần Làm thử (§4) cho thấy điều ngược lại, và đây là số đo thật khi tác giả bài chạy bài tập (Playwright 1.64.0, Chromium headless, macOS, viewport 1280×720, một lần chạy — không phải benchmark). Mockup là lưới 3 cột có ô ảnh xám nhạt `#ddd` và viền `#ccc`; build là lưới 2 cột, mất ô ảnh:

```text
threshold   pixel khác / 921 600     tỉ lệ
0.2 (mặc định)      1 177             0.13%
0.1                92 028             9.99%
0                  93 368            10.13%
```

Với ngưỡng mặc định, một màn mất toàn bộ ảnh sản phẩm và đổi 3 cột thành 2 chỉ "khác" 0,13% pixel. Nguyên nhân gốc: `threshold` là độ lệch màu tối thiểu để một pixel bị tính là khác, theo thang 0–1 trong không gian màu cảm nhận (docs: *"threshold defines which pixels are considered different"*, mặc định 0.2). Xám `#ddd` trên nền trắng và viền `#ccc` nằm dưới ngưỡng đó, nên cả khối ảnh và cả khung card biến mất khỏi phép đo. Phần còn lại chỉ là chữ đổi chỗ.

Giờ thêm một dòng cấu hình trông rất hợp lý để chống flaky:

```js
expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } }   // "cho phép lệch 1%"
```

0,13% < 1% ⇒ **test PASS.** Màn hình sai bố cục qua cổng pixel diff, đúng như nó từng qua cổng so chữ.

Cách chặn bằng cơ chế, không bằng "chọn ngưỡng cẩn thận": mỗi khi đặt hoặc nới ngưỡng, **chạy một control đỏ** — một bản build cố ý sai (bỏ một cột, xoá ảnh card) — và yêu cầu test phải fail. Control pass ⇒ ngưỡng đang nuốt đúng loại lỗi bạn lo; hạ `threshold` cho vùng đó hoặc chuyển sang probe cấu trúc. Đây là luật "thước phải đỏ được" của [[ag-11-gate-xanh-gia]] áp vào pixel.

### 3.6 Đo bằng browser automation: assert cái thước trước khi tin số

Kiểm UI không chỉ là ảnh tĩnh. Hai phép đo hay gặp — layout shift và bề ngang — có chung một kiểu hỏng: **thước hỏng thì ra số đẹp**, mà số đẹp thì không ai nghi.

**Layout shift (CLS).** Trình duyệt phát một `LayoutShift` entry mỗi lần phần tử nhìn thấy được bị dịch chỗ; `value` = phần viewport bị dịch × quãng dịch (MDN: `LayoutShift`). Cách đọc chuẩn:

```js
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) if (!e.hadRecentInput) sum += e.value;
}).observe({ type: 'layout-shift', buffered: true });
```

`buffered: true` lấy cả các entry đã xảy ra trước khi observer được tạo. Thiếu nó, script chạy sau khi trang load sẽ bỏ lỡ toàn bộ shift lúc load. MDN cũng ghi API này **chưa Baseline** — không có trên mọi trình duyệt, nên chỉ đo trên Chromium.

Trong một chiến dịch giảm CLS (kinh nghiệm thực tế), số lần "CLS = 0" do harness hỏng nhiều hơn số lần do fix ăn. Ba cơ chế đã gặp:

| Triệu chứng | Nguyên nhân gốc |
|---|---|
| Mọi route ra 0, kể cả trang chưa fix | Script bám vào tab nền; tab ẩn không render nên không phát entry |
| Observer chạy nhưng callback không bắn | Eval chạy trong isolated world và không dùng `buffered: true` |
| Tab mở nhiều giờ qua nhiều navigation ra 0 tuyệt đối | Tab đã ngừng ghi nhận shift; cả `body.style.marginTop='120px'` cũng không sinh entry |

Một **control test** bắt cả ba: chèn một khối 200px vào đầu trang để ép một shift mà bạn biết chắc phải có. Control ra 0 ⇒ vứt phép đo, sửa harness, không kết luận gì về code. Thêm ba luật từ cùng chiến dịch:

- **Assert render cùng với con số.** Một trang vỡ không render bảng nào cũng có CLS = 0. Mỗi phép đo kèm một assert nội dung (`rows === 10`).
- **Đo ≥5 lần mỗi nhánh, so tỉ lệ.** Cùng một trang từng ra 0.0432 ở lần 1 và 0 ở lần 2, tuỳ data về trước hay sau paint. "3/5 lần có shift" vs "0/5" mới là so sánh.
- **Chọn đúng frame.** App nhúng trong iframe của trang host: đo ở frame top là đo giao diện của host. Playwright lấy frame theo URL bằng `page.frame({ url: /app-origin/ })` (docs: playwright.dev/docs/api/class-page, mục `page.frame`).

**Bề ngang.** Một phiên đo email HTML ở 277/320/375px vấp ba cái thước tự nói dối (kinh nghiệm thực tế):

| Thước | Nói dối thế nào | Assert |
|---|---|---|
| Chrome headless chạy với `--window-size=320` | `window.innerWidth` vẫn là 500 — quan sát trong lần chạy đó, chưa đối chiếu docs Chrome | In `innerWidth` và so với số mình đặt, trước mọi phép đo khác |
| `scrollWidth` bên trong iframe | Luôn bằng đúng bề ngang iframe ⇒ không bao giờ báo tràn | Đo `getBoundingClientRect().right` của phần tử ngoài cùng, hoặc chụp ảnh và nhìn |
| `document.documentElement.scrollWidth` | Theo cửa sổ, không theo nội dung | Đo `offsetWidth` của khối ngoài cùng của nội dung |

Hậu quả trong case không dừng ở kết luận sai: con số "sàn 500px" giả được đưa vào brief vòng 2 cho một agent khác, agent bám theo và đổi bố cục dòng hàng, đẻ ra bug số tiền bị ngắt giữa chữ số trong email. **Harness sai trở thành yêu cầu sai cho người/agent tiếp theo.** Hai người đo ra hai số khác nhau thì đi tìm harness khác nhau trước — ở case này, một bên đo bằng Playwright trong Docker nên không dính sàn. Với Playwright, `page.setViewportSize({ width, height })` đặt kích thước trang (docs: class-page); bài tập §4 assert `innerWidth` đúng bằng số đặt ở 320/375/414.

### 3.7 Quy mô: vài trăm ảnh và một lỗi sót

Case đổi giao diện cả một app bằng **một brief + loop** đã kể ở [[ag-01-bay-level]] (phát biểu của một người làm, một lần chạy, không phải benchmark): tester agent chụp **324 ảnh**, mỗi ảnh khoảng 3 phút, khoảng **2 000 test case**, sót đúng **1 lỗi** kích thước modal.

Tính thử chi phí của cách làm này để biết khi nào nó đáng:

```text
# Thời gian nếu chạy tuần tự (số từ case)
324 ảnh × 3 phút = 972 phút ≈ 16,2 giờ

# Token ảnh (docs vision: ảnh tốn ⌈w/28⌉ × ⌈h/28⌉ visual token)
1280×720   → 46 × 26  = 1 196 token/ảnh
390×844    → 14 × 31  =   434 token/ảnh   (mobile)
1280×2400  → 46 × 86  = 3 956 token/ảnh   (full page)
Mỗi state gửi 2 ảnh (cũ + mới), viewport 1280×720:
324 × 2 × 1 196 = 775 008 token ảnh
Ở giá ví dụ trong docs vision cho Opus 5.5 ($4 / 1M input token): ≈ $3,10
```

Con số token ảnh là chặn dưới: chưa tính prompt, checklist, câu trả lời, và việc cả hội thoại bị gửi lại mỗi lượt khi ảnh nằm trong history (docs vision khuyên dùng Files API cho trường hợp này). Thời gian 16 giờ mới là chi phí thật nếu tuần tự — đó là lý do việc chụp được chia cho nhiều agent song song ở level 5 ([[ag-14-subagent-va-brief]]).

Vì sao sót modal? Note gốc không ghi nguyên nhân. Một giả thuyết đáng kiểm trong lần chạy sau: modal là một **state** (phải bấm mới hiện), và danh sách state chụp không có nó — đúng loại lỗi 3.3(2) cảnh báo. Cách kiểm: lấy danh sách state đã chụp, tìm xem có state nào mở modal đó không. Nếu có thì giả thuyết sai và phải tìm chỗ khác (ví dụ checklist không hỏi kích thước modal).

---

## 4. Làm thử

Mục tiêu: tự tay thấy ba phép kiểm cho ba verdict khác nhau trên cùng một màn sai, rồi dựng control cho phép đo CLS. Toàn bộ chạy được trên máy có Node 18+; đã chạy với Playwright 1.64.0.

**Bước 1 — dựng thư mục**

```bash
mkdir ui-check && cd ui-check
npm init -y
npm i -D @playwright/test
npx playwright install chromium
mkdir tests
```

**Bước 2 — hai màn hình cùng chữ, khác bố cục**

`mockup.html`:

```html
<!doctype html>
<html><head><meta charset="utf-8"><style>
  body  { margin: 0; font: 16px/1.4 sans-serif; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; }
  .thumb { height: 80px; background: #ddd; }
</style></head><body>
  <h1>Your weekly box</h1>
  <div class="grid" data-testid="grid">
    <div class="card"><div class="thumb"></div><p>Oat milk</p></div>
    <div class="card"><div class="thumb"></div><p>Sourdough</p></div>
    <div class="card"><div class="thumb"></div><p>Eggs x12</p></div>
  </div>
</body></html>
```

`build.html` — giống hệt, trừ hai chỗ: `repeat(2, 1fr)` và không có `<div class="thumb"></div>` nào.

`playwright.config.js`:

```js
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  use: { viewport: { width: 1280, height: 720 } },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } }, // "cho phép lệch 1%"
});
```

**Bước 3 — ba phép kiểm**

`tests/ui.spec.js`:

```js
const { test, expect } = require('@playwright/test');
const path = require('path');
const url = (f) => 'file://' + path.resolve(__dirname, '..', f);
const TARGET = process.env.TARGET || 'build.html';

test('1. so chữ: innerText giống nhau', async ({ page }) => {
  await page.goto(url('mockup.html'));
  const want = await page.locator('body').innerText();
  await page.goto(url('build.html'));
  expect(await page.locator('body').innerText()).toBe(want);
});

test('2. so ảnh: khớp baseline', async ({ page }) => {
  await page.goto(url(TARGET));
  await expect(page.locator('[data-testid=grid] .card')).toHaveCount(3); // assert đã render
  await expect(page).toHaveScreenshot('weekly.png',
    { threshold: Number(process.env.T ?? 0.2) });
});

test('3. probe cấu trúc: số cột và ảnh mỗi card', async ({ page }) => {
  await page.goto(url(TARGET));
  const cols = await page.locator('[data-testid=grid]').evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(3);
  await expect(page.locator('.card .thumb')).toHaveCount(3);
});
```

Chạy — baseline sinh từ mockup, rồi so build:

```bash
TARGET=mockup.html npx playwright test --update-snapshots   # 3 passed, sinh baseline
TARGET=build.html  npx playwright test --reporter=list
```

Kết quả mong đợi (khớp lần chạy của tác giả bài): test 1 **PASS**, test 2 **PASS**, test 3 **FAIL** (`Expected: 3, Received: 2`). Hai cổng xanh, một cổng đỏ.

**Bước 4 — làm cổng ảnh đỏ được**

Xoá dòng `expect: { toHaveScreenshot: … }` khỏi config, rồi chạy test 2 với ba ngưỡng:

```bash
for T in 0.2 0.1 0; do T=$T TARGET=build.html npx playwright test -g "so ảnh" --reporter=list | grep "pixels ("; done
```

Ghi lại số pixel khác ở mỗi ngưỡng. Mở `test-results/*/weekly-diff.png` bằng agent (`Read`) hoặc bằng mắt: vùng đỏ là pixel khác. So vùng đỏ ở `T=0.2` và `T=0`.

**Bước 5 — control test cho CLS**

`tests/cls.spec.js`:

```js
const { test, expect } = require('@playwright/test');
const path = require('path');
const url = (f) => 'file://' + path.resolve(__dirname, '..', f);

async function measureCLS(page, control) {
  return page.evaluate(async (control) => {
    let sum = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) sum += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    if (control) {                          // ép một shift biết chắc phải có
      const b = document.createElement('div');
      b.style.height = '200px';
      document.body.prepend(b);
    }
    await new Promise((r) => setTimeout(r, 1000));
    return sum;
  }, control);
}

test('control: chèn khối 200px phải ra CLS > 0', async ({ page }) => {
  await page.goto(url('mockup.html'));
  await expect(page.locator('.card')).toHaveCount(3);
  const cls = await measureCLS(page, true);
  console.log('control CLS =', cls.toFixed(4));
  expect(cls).toBeGreaterThan(0);           // control ra 0 => vứt harness
});

test('đo thật: 5 lần, báo tỉ lệ', async ({ page }) => {
  const runs = [];
  for (let i = 0; i < 5; i++) {
    await page.goto(url('build.html'));
    await expect(page.locator('.card')).toHaveCount(3);
    runs.push(await measureCLS(page, false));
  }
  console.log('có shift:', runs.filter((v) => v > 0).length, '/ 5');
});
```

```bash
npx playwright test tests/cls.spec.js --reporter=list
```

Lần chạy của tác giả bài: control in `0.0800`, đo thật `0 / 5` (trang tĩnh, không có gì dịch).

Rồi **phá harness có chủ đích** để thấy control làm việc: trong `measureCLS`, cho đoạn chèn khối 200px chạy trước, `await` 500 ms cho shift xảy ra xong, *rồi* mới tạo observer — một lần với `buffered: true`, một lần bỏ hẳn tuỳ chọn đó. Lần chạy của tác giả bài: `buffered=true → 0.0800`, không `buffered → 0.0000`. Bản thứ hai là đúng tình huống "script gắn vào sau khi trang đã load": nó báo 0 cho một trang **chắc chắn có shift**.

Chi tiết đáng ghi: nếu chỉ chuyển lệnh chèn khối lên ngay trước `new PerformanceObserver(...)` (cùng một tick, không `await`), observer vẫn nhận được entry vì entry được phát sau frame kế tiếp — phá harness kiểu đó **không** phá được. Muốn biết control của mình có bắt được một lỗi harness cụ thể, phải dựng đúng lỗi đó và chạy, không suy luận.

**Tiêu chí "xong" — kiểm được:**

- [ ] Bước 3: đúng 1 failed, 2 passed, và test fail là probe cấu trúc.
- [ ] Bước 4: bảng ba dòng `threshold → số pixel khác`; giải thích một câu vì sao `0.2` + `maxDiffPixelRatio: 0.01` cho PASS.
- [ ] Bước 4: một cấu hình ngưỡng mới cho dự án của bạn, kèm lệnh chạy control đỏ chứng minh nó fail trên `build.html`.
- [ ] Bước 5: control in ra số > 0; bản observer tạo sau shift mà không `buffered` in ra 0 và làm `expect(cls).toBeGreaterThan(0)` **fail**.
- [ ] Viết lại câu *"match structure, order and wording — not fonts or colours"* thành dạng miễn trừ đích danh cho một màn hình thật trong dự án của bạn, kèm danh sách STATES.

---

## 5. Bẫy thường gặp

### So chữ rồi gọi là kiểm UI

Verifier PASS, rồi người mở trình duyệt thấy sai bố cục: `innerText` không chứa bố cục, phần tử không chữ, khả năng tương tác, hay phần bị cắt bằng CSS. Done-criteria của task UI phải có trường `evidence: screenshots/<state>.png` cho từng state, và verifier từ chối PASS khi thiếu ảnh. Luật này đặt trong file định nghĩa verifier ([[ag-12-verifier-doc-lap]]), không nằm trong lời dặn của từng task.

### Brief miễn trừ bằng chữ khái quát

Brief ghi "không chấm phần nhìn" hay "bỏ qua styling", và lỗi 3 cột vs 2 cột bị xếp luôn vào đó. Chữ khái quát để người chấm tự quyết ranh giới, và họ chọn ranh giới ít việc nhất. Template brief nên có hai danh sách bắt buộc `PHẢI KHỚP` và `ĐƯỢC LỆCH`, kèm một gate lint brief từ chối khi `ĐƯỢC LỆCH` chứa từ trong danh sách cấm (`styling`, `cosmetic`, `visual`, `look and feel`).

### Dùng pixel diff sai chỗ hoặc với ngưỡng nuốt lỗi

`toHaveScreenshot` PASS trên một màn đã đổi bố cục, vì `threshold` mặc định 0.2 bỏ qua màu nhạt (khung xám, viền) và `maxDiffPixelRatio` bù phần còn lại. Đặt một test control đỏ ngay trong suite: chạy `toHaveScreenshot` trên một bản cố ý sai và kỳ vọng nó fail (`test.fail()` của Playwright đánh dấu test phải fail). **Ai nới ngưỡng tới mức control pass thì CI đỏ.**

Chiều ngược lại là so mockup HTML với build bằng `toHaveScreenshot`: đỏ 100% mọi lần, rồi team tắt test, vì font, bo góc và khoảng cách của hai công nghệ render không bao giờ trùng pixel. Chọn phép kiểm theo nguồn baseline (bảng 3.4): mockup khác công nghệ thì dùng probe cấu trúc cộng mắt model với checklist, pixel diff chỉ dành cho baseline cùng công nghệ.

### Tin ảnh hay con số khi chưa kiểm cái thước

Agent kết luận "trang trắng" hoặc "kẹt loading" trong khi người thật mở thì thấy bình thường. Ảnh được chụp theo thời gian cố định hoặc theo `networkidle`, lúc một request chậm (6,6 s trong case) chưa về. Helper chụp ảnh nên nhận tham số bắt buộc `ready: Locator` và gọi `toHaveCount`/`toBeVisible` trước `screenshot`, không có overload nào chụp mà thiếu `ready`.

Phép đo số cũng vậy: CLS = 0 hay innerWidth = 500 trông đẹp bất thường, hoặc hai người đo ra hai số, vì tab nền, thiếu `buffered: true`, sai frame, sàn viewport, `scrollWidth` bị kẹp. Mọi script đo cần một bước assert thước ở đầu (control shift > 0; `innerWidth === width đặt`) và fail ngay nếu sai, trước khi in số đo thật.

### Không biết mình bỏ sót state nào

Kiểm vài trăm ảnh mà sót đúng thứ phải bấm mới hiện (modal, trạng thái rỗng, lỗi), vì danh sách state được suy từ route/URL chứ không từ control trên màn hình. Cho một script liệt kê mọi phần tử tương tác trên mockup (`getByRole('button')`, `getByRole('tab')`, `getByRole('link')`) rồi đối chiếu với STATES; control nào không xuất hiện trong STATES nào thì gate báo.

---

## 6. Chuyển giao

- Bài này là trường hợp riêng của [[ag-11-gate-xanh-gia]] (thước phải đỏ được) và [[ag-12-verifier-doc-lap]] (verifier phải có bằng chứng phân biệt được). Ở UI, bằng chứng rẻ nhất phân biệt được "đúng" với "sai bố cục" là **một ảnh**, và bằng chứng rẻ nhất phân biệt được "thước còn sống" với "thước chết" là **một control test**.
- Cách browser automation được nối vào agent (MCP server cho browser, profile riêng, headless) nằm ở [[ag-09-mcp]].
- Level 5 bắt đầu từ chỗ bài này dừng: 324 ảnh × 3 phút là 16 giờ nếu một agent làm. [[ag-14-subagent-va-brief]] chia việc chụp và chấm cho nhiều agent; [[ag-17-soat-cheo-noi-dung]] xử lý chuyện N agent chấm N màn mà mỗi người dùng một chuẩn.
- Ở level 6, danh sách STATES và checklist ảnh trở thành một phần của brief mà loop đọc mỗi lượt ([[ag-19-vong-lap-nhat-task]]) — người không cần nhìn từng ảnh nữa, chỉ nhìn ảnh mà verifier đánh LỆCH.
- Nền về test frontend nói chung: [[fe-08-testing]].

---

## 7. Tóm tắt

- Một phép kiểm chỉ thấy thứ có trong đơn vị đo của nó; `innerText` không chứa bố cục, phần tử không chữ, tương tác, hay chữ bị cắt bằng CSS.
- Miễn trừ phải đích danh (`PHẢI KHỚP` / `ĐƯỢC LỆCH`); chữ khái quát như "not fonts or colours" sẽ nuốt luôn bố cục.
- Done-criteria của màn hình = ảnh build cạnh ảnh mockup, từng state trong một danh sách STATES liệt kê trước; assert nội dung đã render trước khi chụp.
- Chọn phép so theo nguồn baseline: pixel diff khi cùng công nghệ, probe cấu trúc cho thứ đếm được, mắt model với checklist cho phần còn lại.
- Pixel diff cũng nói dối: trong bài tập, `threshold` 0.2 thu 93 368 pixel khác xuống 1 177, và `maxDiffPixelRatio: 0.01` cho PASS. Mọi ngưỡng phải có control đỏ.
- Đo CLS/bề ngang: control test trước, `buffered: true`, ≥5 lần so tỉ lệ, đúng frame, assert `innerWidth` bằng số đã đặt.
- Ở quy mô vài trăm ảnh, chi phí chính là thời gian (324 × 3 phút ≈ 16,2 giờ tuần tự), không phải token ảnh (≈775k token cho 648 ảnh 1280×720).
