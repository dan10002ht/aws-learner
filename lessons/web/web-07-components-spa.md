# Tư duy component & SPA

Bạn đã viết được HTML, style bằng CSS, thao tác DOM bằng JS và gọi `fetch`. Bước tiếp theo để "lên đời" là thay đổi **cách suy nghĩ**: từ việc ra lệnh cho trình duyệt từng bước (imperative) sang mô tả giao diện trông như thế nào (declarative), và tổ chức UI thành các **component** tái sử dụng. Đây chính là tư duy nền tảng của mọi framework hiện đại (React, Vue, Svelte...).

Bài này không dạy sâu React. Mục tiêu là: hiểu **vì sao** framework ra đời, dựng một component nhỏ bằng vanilla JS, rồi đối chiếu với React để bạn "thông" khái niệm trước khi học framework thật.

## Component là gì?

**Component** là một mảnh UI độc lập, tái sử dụng được, gồm: cấu trúc (HTML), giao diện (CSS) và hành vi (JS) — đóng gói chung một chỗ. Bạn truyền dữ liệu vào qua **props** (properties), component trả về phần giao diện tương ứng.

Hãy nghĩ component như một **hàm**: đầu vào là props, đầu ra là UI.

```
UI = f(props, state)
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Component như một hàm: props và state vào, UI ra</title>
  <desc>Sơ đồ luồng: props (từ ngoài vào) và state (nội bộ) là đầu vào của hàm component, đầu ra là UI. Cùng input cho cùng output.</desc>
  <text x="360" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">UI = f(props, state)</text>
  <g>
    <rect x="20" y="56" width="170" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="105" y="78" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">props</text>
    <text x="105" y="94" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">vào từ ngoài (cha → con)</text>
  </g>
  <g>
    <rect x="20" y="128" width="170" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="105" y="150" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">state</text>
    <text x="105" y="166" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">nội bộ component</text>
  </g>
  <g>
    <rect x="290" y="80" width="140" height="72" rx="12" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="112" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">f( )</text>
    <text x="360" y="132" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">component</text>
  </g>
  <g>
    <rect x="530" y="80" width="170" height="72" rx="12" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="615" y="112" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">UI</text>
    <text x="615" y="132" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">giao diện trả về</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M190 80 C 240 80, 250 104, 288 110" marker-end="url(#ar1)"/>
    <path d="M190 152 C 240 152, 250 128, 288 122" marker-end="url(#ar1)"/>
    <path d="M430 116 H 528" marker-end="url(#ar1)"/>
  </g>
  <text x="360" y="204" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">Cùng (props, state) → luôn cùng một UI</text>
  <defs>
    <marker id="ar1" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

Ví dụ một thẻ người dùng (`UserCard`) nhận props là `name` và `role`, rồi vẽ ra giao diện. Cùng một component, đổi props là ra giao diện khác nhau — đó là **tái sử dụng**.

> 💡 Ghi nhớ: Component = hàm nhận `props` → trả về UI. Cùng input thì cùng output. Đây là lý do component dễ test, dễ tái dùng và dễ suy luận.

## Từ DOM thủ công đến declarative UI

Cách bạn đang làm là **imperative** — ra lệnh từng bước: tạo element, set thuộc tính, append vào cha, rồi tự tay cập nhật khi dữ liệu đổi.

```javascript
// IMPERATIVE: tự tay dựng và cập nhật từng node
const card = document.createElement("div");
card.className = "user-card";

const nameEl = document.createElement("h3");
nameEl.textContent = "An Nguyễn";
card.appendChild(nameEl);

const roleEl = document.createElement("p");
roleEl.textContent = "Frontend Dev";
card.appendChild(roleEl);

document.body.appendChild(card);

// Muốn đổi tên? Phải tìm đúng node rồi sửa tay:
nameEl.textContent = "Bình Trần";
```

Vấn đề: khi UI phức tạp (danh sách, form, trạng thái lồng nhau), bạn phải tự nhớ **node nào cần sửa khi dữ liệu nào đổi**. Code rối, dễ sai, khó bảo trì.

**Declarative** đảo ngược: bạn chỉ mô tả "với dữ liệu này, UI trông thế nào", còn việc cập nhật DOM để khớp thì để hệ thống lo.

```javascript
// DECLARATIVE: mô tả UI từ dữ liệu
function UserCard(props) {
  return `
    <div class="user-card">
      <h3>${props.name}</h3>
      <p>${props.role}</p>
    </div>
  `;
}

// Render = lấy mô tả gắn vào DOM
document.querySelector("#app").innerHTML = UserCard({
  name: "An Nguyễn",
  role: "Frontend Dev",
});
```

Đổi dữ liệu? Gọi lại hàm với props mới, không cần biết node nào phải sửa.

| | Imperative (thủ công) | Declarative |
|---|---|---|
| Bạn viết | Từng bước thao tác DOM | UI trông thế nào theo dữ liệu |
| Khi dữ liệu đổi | Tự tìm node để sửa | Render lại từ dữ liệu |
| Độ phức tạp | Tăng nhanh theo UI | Giữ ở mức quản lý được |
| Ví dụ | `appendChild`, `setAttribute` | `return template` |

## State & ý tưởng re-render

**Props** là dữ liệu truyền **từ ngoài vào** (cha → con), component không tự sửa. **State** là dữ liệu **nội bộ** mà component sở hữu và có thể thay đổi theo thời gian (ví dụ: số lần click, nội dung input, đang loading hay không).

Ý tưởng cốt lõi của UI hiện đại:

> Khi **state thay đổi**, UI được **render lại** để khớp với state mới.

Bạn không sửa DOM trực tiếp nữa. Bạn sửa **state**, rồi yêu cầu "vẽ lại". Một component đếm số đơn giản theo tư duy này:

```javascript
function createCounter(mount) {
  let state = { count: 0 }; // state nội bộ

  function setState(next) {
    state = { ...state, ...next };
    render(); // state đổi -> vẽ lại
  }

  function render() {
    mount.innerHTML = `
      <div class="counter">
        <span>Số đếm: ${state.count}</span>
        <button id="inc">+1</button>
      </div>
    `;
    mount.querySelector("#inc").onclick = () =>
      setState({ count: state.count + 1 });
  }

  render(); // render lần đầu
}

createCounter(document.querySelector("#app"));
```

Để ý mẫu hình lặp lại: **đổi state → render lại → giao diện tự khớp**. Bạn không bao giờ viết `span.textContent = ...`. Đây đúng là tư duy mà React/Vue tự động hoá.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 270" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng lặp đơn hướng: state → render → UI → setState</title>
  <desc>Vòng lặp một chiều: state chạy qua render tạo ra UI; hành động người dùng gọi setState để đổi state rồi quay lại đầu vòng. Bạn sửa state, không sửa DOM trực tiếp.</desc>
  <g>
    <rect x="40" y="100" width="160" height="64" rx="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="120" y="130" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">state</text>
    <text x="120" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">nguồn sự thật</text>
  </g>
  <g>
    <rect x="280" y="100" width="160" height="64" rx="11" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="360" y="130" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">render()</text>
    <text x="360" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">mô tả UI từ state</text>
  </g>
  <g>
    <rect x="520" y="100" width="160" height="64" rx="11" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="130" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">UI</text>
    <text x="600" y="148" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">giao diện hiển thị</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M200 132 H 278" marker-end="url(#ar2)"/>
    <path d="M440 132 H 518" marker-end="url(#ar2)"/>
    <path d="M600 164 C 600 224, 120 224, 120 166" marker-end="url(#ar2)"/>
  </g>
  <g>
    <rect x="300" y="200" width="120" height="34" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="360" y="222" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">setState()</text>
  </g>
  <text x="360" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">người dùng bấm nút → setState → quay lại đầu vòng</text>
  <text x="360" y="40" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Sửa state, KHÔNG sửa DOM trực tiếp</text>
  <defs>
    <marker id="ar2" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy: Cách `innerHTML = ...` ở trên **xoá và dựng lại toàn bộ** mỗi lần render. Mọi state của DOM (focus ô input, vị trí cuộn, animation) bị mất, và với danh sách lớn thì rất chậm. Đây chính là vấn đề mà **Virtual DOM** sinh ra để giải quyết.

## Virtual DOM — ý tưởng

Render lại toàn bộ thì đơn giản nhưng tốn kém. Thao tác DOM thật là **chậm** so với chạy JS thuần. Giải pháp của React: dùng **Virtual DOM**.

Virtual DOM là **bản mô tả UI bằng object JS** (nhẹ, nhanh), không phải DOM thật. Quy trình:

1. State đổi → tạo cây Virtual DOM **mới** (chỉ là object JS).
2. **So sánh** (diffing) cây mới với cây cũ.
3. Tính ra **danh sách thay đổi tối thiểu** cần áp dụng.
4. Chỉ chạm vào những **node DOM thật** thực sự đổi (patch).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Quy trình Virtual DOM: tạo cây mới, diff, patch tối thiểu</title>
  <desc>State đổi tạo cây VDOM mới (object JS), so sánh diff với cây cũ, tính patch tối thiểu, chỉ chạm node DOM thật thay đổi. Ví như vẽ nháp trên giấy nháp rồi chỉ sửa đúng chỗ trên giấy thật.</desc>
  <text x="360" y="26" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Vẽ lại trên "giấy nháp" (object JS) → chỉ sửa đúng chỗ trên "giấy thật" (DOM)</text>
  <g>
    <rect x="14" y="56" width="150" height="90" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="89" y="84" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">state đổi</text>
    <text x="89" y="104" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">tạo cây VDOM</text>
    <text x="89" y="119" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">MỚI (object JS)</text>
    <text x="89" y="137" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.5">giấy nháp</text>
  </g>
  <g>
    <rect x="200" y="56" width="150" height="90" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="275" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">diff</text>
    <text x="275" y="112" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">so sánh cây</text>
    <text x="275" y="127" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">mới vs cũ</text>
  </g>
  <g>
    <rect x="386" y="56" width="150" height="90" rx="10" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="461" y="92" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">patch tối thiểu</text>
    <text x="461" y="112" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">danh sách thay</text>
    <text x="461" y="127" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đổi nhỏ nhất</text>
  </g>
  <g>
    <rect x="572" y="56" width="134" height="90" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="639" y="88" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">DOM thật</text>
    <text x="639" y="108" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">chỉ chạm node</text>
    <text x="639" y="123" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">thực sự đổi</text>
    <text x="639" y="137" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.5">giấy thật</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M164 101 H 198" marker-end="url(#ar3)"/>
    <path d="M350 101 H 384" marker-end="url(#ar3)"/>
    <path d="M536 101 H 570" marker-end="url(#ar3)"/>
  </g>
  <g>
    <rect x="200" y="180" width="150" height="40" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="275" y="205" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cây VDOM CŨ</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.4" stroke-dasharray="4 3">
    <path d="M275 180 V 148" marker-end="url(#ar3)"/>
  </g>
  <defs>
    <marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

```javascript
// Virtual DOM chỉ là object mô tả node, KHÔNG phải DOM thật
const vnode = {
  tag: "div",
  props: { class: "user-card" },
  children: [
    { tag: "h3", children: ["An Nguyễn"] },
    { tag: "p", children: ["Frontend Dev"] },
  ],
};
// Framework so sánh object cũ vs mới -> chỉ sửa phần khác biệt trên DOM thật
```

Nhờ đó bạn vẫn viết kiểu declarative "vẽ lại tất cả", nhưng framework chỉ cập nhật phần tối thiểu — vừa dễ viết vừa nhanh.

> 💡 Ghi nhớ: Virtual DOM = "vẽ lại trên giấy nháp (object JS) rồi chỉ sửa đúng chỗ khác biệt trên giấy thật (DOM)". Bạn được sự đơn giản của declarative mà không trả giá hiệu năng.

## SPA vs MPA

**MPA (Multi Page Application)** — kiểu web truyền thống: mỗi lần bấm link, trình duyệt **tải một trang HTML mới** từ server, vẽ lại toàn bộ.

**SPA (Single Page Application)** — tải **một** trang HTML duy nhất lúc đầu, sau đó JS **tự thay đổi nội dung** ngay trên trình duyệt mà không reload. Dữ liệu mới lấy về qua `fetch` (API), JS dựng lại phần UI cần thiết.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh MPA và SPA khi người dùng bấm link</title>
  <desc>MPA: mỗi click tải một trang HTML mới từ server, reload toàn trang. SPA: tải HTML một lần, sau đó JS đổi nội dung và fetch dữ liệu, không reload.</desc>
  <g>
    <rect x="14" y="40" width="334" height="226" rx="12" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="181" y="64" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">MPA — đa trang</text>
    <text x="181" y="82" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">mỗi click = reload toàn trang</text>
    <rect x="38" y="100" width="90" height="40" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="83" y="124" font-size="10.5" text-anchor="middle" fill="currentColor">Trình duyệt</text>
    <rect x="234" y="100" width="90" height="40" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="279" y="124" font-size="10.5" text-anchor="middle" fill="currentColor">Server</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
      <path d="M128 112 H 232" marker-end="url(#ar4)"/>
      <path d="M232 130 H 130" marker-end="url(#ar4)"/>
    </g>
    <text x="181" y="108" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">click → xin trang</text>
    <text x="181" y="152" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">trả HTML MỚI</text>
    <text x="181" y="186" font-size="11" text-anchor="middle" fill="currentColor">↻ vẽ lại toàn bộ trang</text>
    <text x="181" y="210" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">mỗi điều hướng lặp lại vòng này</text>
    <text x="181" y="244" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">VD: Wikipedia, blog</text>
  </g>
  <g>
    <rect x="372" y="40" width="334" height="226" rx="12" fill="#3b82f6" fill-opacity="0.11" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="539" y="64" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">SPA — đơn trang</text>
    <text x="539" y="82" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">tải 1 lần, JS đổi nội dung, không reload</text>
    <rect x="396" y="100" width="90" height="40" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="441" y="124" font-size="10.5" text-anchor="middle" fill="currentColor">Trình duyệt</text>
    <rect x="592" y="100" width="90" height="40" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="637" y="124" font-size="10.5" text-anchor="middle" fill="currentColor">Server / API</text>
    <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.5" stroke-dasharray="4 3">
      <path d="M486 112 H 590" marker-end="url(#ar4)"/>
      <path d="M590 130 H 488" marker-end="url(#ar4)"/>
    </g>
    <text x="539" y="108" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ fetch dữ liệu (JSON)</text>
    <text x="539" y="152" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">không gửi lại HTML</text>
    <text x="539" y="186" font-size="11" text-anchor="middle" fill="currentColor">JS dựng lại phần UI cần</text>
    <text x="539" y="210" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">trang không reload, mượt như app</text>
    <text x="539" y="244" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">VD: Gmail, Trello, Figma</text>
  </g>
  <defs>
    <marker id="ar4" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

| | MPA (đa trang) | SPA (đơn trang) |
|---|---|---|
| Chuyển trang | Server trả HTML mới, reload | JS đổi nội dung, không reload |
| Tải lần đầu | Nhẹ, nhanh | Nặng hơn (tải JS bundle) |
| Sau đó | Mỗi click chờ server | Mượt, như app desktop |
| SEO | Dễ (mặc định) | Cần xử lý thêm (SSR) |
| Ví dụ | Wikipedia, blog | Gmail, Trello, Figma |

SPA cho trải nghiệm mượt như app native, nhưng đổi lại: bundle JS lớn, SEO khó hơn, và bạn phải **tự quản lý việc chuyển trang** — đó là client-side routing.

## Client-side routing

Trong MPA, URL `/about` ứng với một file/route trên server. Trong SPA, **trình duyệt không gọi server** khi bạn đổi route — JS phải nghe URL đổi rồi render component tương ứng. Dùng **History API** (`history.pushState`) để đổi URL mà không reload:

```javascript
const routes = {
  "/": () => "<h1>Trang chủ</h1>",
  "/about": () => "<h1>Giới thiệu</h1>",
  "/contact": () => "<h1>Liên hệ</h1>",
};

function render() {
  const view = routes[location.pathname] || (() => "<h1>404</h1>");
  document.querySelector("#app").innerHTML = view();
}

// Bắt click trên link nội bộ, đổi URL mà KHÔNG reload
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;
  e.preventDefault();
  history.pushState(null, "", link.href); // đổi URL
  render();                               // render lại view
});

// Nút Back/Forward của trình duyệt
window.addEventListener("popstate", render);

render(); // render lần đầu
```

```html
<nav>
  <a href="/" data-link>Trang chủ</a>
  <a href="/about" data-link>Giới thiệu</a>
  <a href="/contact" data-link>Liên hệ</a>
</nav>
<div id="app"></div>
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 240" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng client-side routing trong SPA</title>
  <desc>Click link nội bộ gọi preventDefault, rồi history.pushState đổi URL mà không gọi server, sau đó render component theo route. Cảnh báo server cần fallback về index.html.</desc>
  <g>
    <rect x="12" y="50" width="160" height="74" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="92" y="80" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">click link nội bộ</text>
    <text x="92" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">a[data-link]</text>
  </g>
  <g>
    <rect x="190" y="50" width="160" height="74" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="270" y="80" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">preventDefault()</text>
    <text x="270" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">chặn tải trang mặc định</text>
  </g>
  <g>
    <rect x="368" y="50" width="170" height="74" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="453" y="76" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">history.pushState</text>
    <text x="453" y="94" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">đổi URL</text>
    <text x="453" y="109" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">KHÔNG gọi server</text>
  </g>
  <g>
    <rect x="556" y="50" width="150" height="74" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="631" y="80" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">render()</text>
    <text x="631" y="100" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">component theo route</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M172 87 H 188" marker-end="url(#ar5)"/>
    <path d="M350 87 H 366" marker-end="url(#ar5)"/>
    <path d="M538 87 H 554" marker-end="url(#ar5)"/>
  </g>
  <g>
    <rect x="120" y="166" width="480" height="50" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 3"/>
    <text x="360" y="188" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">⚠ Server phải fallback mọi đường dẫn về index.html</text>
    <text x="360" y="205" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">gõ thẳng URL /about mà không fallback → server trả 404</text>
  </g>
  <defs>
    <marker id="ar5" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy: Vì server không biết về route phía client, gõ thẳng `tên-miền/about` rồi Enter sẽ làm server trả 404. Cấu hình server **fallback mọi đường dẫn về `index.html`** để SPA tự xử lý route. Đây là lỗi deploy SPA kinh điển.

Trong React/Vue bạn không tự viết đoạn này — dùng thư viện như **React Router** / **Vue Router** đã đóng gói sẵn.

## Khi nào cần framework, khi nào vanilla JS?

Framework không miễn phí: thêm bundle, thêm khái niệm phải học, thêm bước build. Đừng vác React cho mọi thứ.

**Dùng vanilla JS khi:**
- Trang chủ yếu là nội dung tĩnh, ít tương tác (blog, landing page).
- Chỉ vài widget nhỏ rời rạc (một form, một slider).
- Bạn muốn bundle cực nhẹ, tải nhanh.

**Dùng framework khi:**
- UI phức tạp, nhiều state thay đổi liên tục (dashboard, app realtime).
- Nhiều component tái sử dụng và lồng nhau sâu.
- Nhiều người cùng làm, cần cấu trúc và quy ước chung.
- Bạn thấy mình đang **tự viết lại** state-management, routing, diffing — tức là đang viết lại một framework tồi hơn.

> 💡 Ghi nhớ: Khi code vanilla của bạn bắt đầu chứa "mini framework" tự chế (hệ thống re-render, router, quản lý state), đó là tín hiệu rõ ràng nên chuyển sang framework thật.

## React/Vue ở mức khái niệm

Cả hai đều xoay quanh đúng những ý tưởng trên: **component**, **props**, **state**, **declarative**, **virtual DOM** (hoặc cơ chế tương đương).

- **React**: component là hàm JS trả về JSX (cú pháp giống HTML trong JS). State quản lý bằng "hooks" như `useState`. Dùng Virtual DOM.
- **Vue**: tách template / script / style trong file `.vue`, state phản ứng (reactivity) tự động theo dõi dữ liệu nào được dùng để cập nhật chính xác.

Bạn **không cần** chọn ngay. Hiểu khái niệm chung quan trọng hơn cú pháp cụ thể.

## Đối chiếu: vanilla JS vs React

Cùng một component đếm số. Bản vanilla bạn đã thấy ở trên (tự `setState` rồi tự `render`). Bản React:

```javascript
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0); // state nội bộ

  return (
    <div className="counter">
      <span>Số đếm: {count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Hãy đặt cạnh nhau để thấy React chỉ **tự động hoá** những gì bạn vừa làm tay:

| Việc cần làm | Vanilla JS (tự làm) | React (lo giùm) |
|---|---|---|
| Khai báo state | `let state = {...}` | `useState(0)` |
| Đổi state | Tự viết `setState` | `setCount(...)` |
| Render lại khi state đổi | Tự gọi `render()` | Tự động |
| Cập nhật DOM tối thiểu | Tự tay (hoặc không) | Virtual DOM lo |
| Gắn sự kiện | Tự `onclick` sau mỗi render | `onClick` trong JSX |

Điểm mấu chốt: **tư duy hoàn toàn giống nhau** — `UI = f(state)`, đổi state thì UI tự khớp. React chỉ xoá đi phần lặp đi lặp lại và xử lý hiệu năng. Một khi bạn "thấm" mẫu hình này bằng vanilla, học React/Vue chỉ còn là học cú pháp.

> 💡 Ghi nhớ: Framework không phải phép màu — nó là phần "tự động hoá việc re-render và cập nhật DOM" mà bạn vừa tự viết tay. Hiểu cái tay làm trước, framework sẽ trở nên hiển nhiên.

## Tóm tắt

- **Component** = hàm nhận `props` → trả về UI; tái sử dụng được.
- **Declarative** (mô tả UI theo dữ liệu) thay cho **imperative** (thao tác DOM từng bước).
- **State đổi → render lại**: bạn sửa dữ liệu, không sửa DOM trực tiếp.
- **Virtual DOM** cho phép viết kiểu "vẽ lại tất cả" mà chỉ cập nhật phần khác biệt.
- **SPA** đổi nội dung không reload; cần **client-side routing** và fallback `index.html`.
- Chọn **vanilla** cho việc nhỏ, **framework** khi UI phức tạp / nhiều state.
- **React/Vue** tự động hoá đúng mẫu hình `UI = f(state)` bạn vừa dựng tay.

---

Lưu ý: tôi đã viết nội dung bài học dưới dạng Markdown như yêu cầu (không frontmatter, không bọc toàn bài trong code fence). Nội dung này chưa được ghi vào file dữ liệu nào — nếu bạn muốn tôi chèn nó vào `/Users/dantt1002/projects/aws/web/data/lessons.ts` (cần slug, courseId `WEB`, chapter, order), hãy cho biết slug và chương để tôi wire vào đúng chỗ.
