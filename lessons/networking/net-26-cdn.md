# Bài 26 — CDN từ bên trong: HIT đúng key mới có nghĩa

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ hai request và cấu hình cache key, quyết định chúng có được dùng chung một response hay không.
- Phân biệt response được phép lưu, còn fresh, và cần revalidate; chọn bằng chứng để kiểm từng quyết định.
- Tái hiện lỗi bỏ query khỏi key bằng nginx, rồi chứng minh bản sửa bằng body và log origin.
- Tính số request tới origin qua hai tầng cache mà không cộng nhầm tỷ lệ HIT.
- Tách quyết định chọn edge bằng DNS/anycast khỏi quyết định chọn object trong cache.
- Khoanh vùng nội dung cũ theo edge, shield, browser và phiên bản URL thay vì purge thử mọi nơi.

## 2. Triệu chứng

Bạn thêm cache trước một endpoint trả nội dung theo ngôn ngữ. Test tiếng Anh thành công. Request tiếng Việt cũng nhận HTTP 200 và header HIT. Dashboard cache có vẻ ổn, nhưng người dùng tiếng Việt nhận chữ tiếng Anh.

Trong lab bài này, gọi lần lượt cùng path với hai query khác nhau:

```text
GET /bad/page?lang=en
  HTTP/1.1 200 OK
  X-Cache: MISS
lang=en
GET /bad/page?lang=vi
lang=en
  HTTP/1.1 200 OK
  X-Cache: HIT
```

Đây là trích nguyên thứ tự dòng trong `out/requests.txt`; công cụ wget ghi header và body qua hai luồng nên thứ tự hiển thị của chúng có thể xen nhau. Body mới là thứ người dùng nhận. Không có lỗi kết nối, origin không trả sai tiếng Việt: request thứ hai chưa hề tới origin.

> **Đo trên lab.** nginx `1.28.3`, Docker trên colima, Linux `6.8.0-64-generic` aarch64. Origin Python trả body theo `lang`, có `Cache-Control: public, max-age=60`. Hai request trên dùng key `$scheme|$host|$uri`. Đo lại: `./run.sh` trong `~/projects/net-lab/net-26/`; xem `out/environment.txt`, `out/requests.txt`, `out/origin.txt`.

Bài [mạng cơ bản](../foundations/intro-02-networking.md) đã giải thích vì sao đặt nội dung ở edge giúp giảm đường đi tới origin. Ở đây câu hỏi khác: **edge dựa vào điều gì để nói “tôi đã có đúng câu trả lời cho request này”?**

## ⏸ Dừng lại — đoán trước #1

Cùng một URL path trả sai ngôn ngữ, request thứ hai là HIT. Thay đổi nào xử lý đúng nguyên nhân trong lab?

- (a) Giảm TTL từ 60 xuống 1 giây.
- (b) Đưa query có ảnh hưởng response vào cache key.
- (c) Đổi từ DNS-based routing sang anycast.
- (d) Thêm một origin shield để giảm tải origin.

## 3. Cơ chế

### 3.1 Key là tuyên bố hai request tương đương

Đáp án **(b)**. Cache key là định danh mà cache dùng để tra response đã lưu. Viết cùng key cho hai request tức là tuyên bố: response đã lưu của request trước có thể dùng cho request sau, sau khi xét các điều kiện tái sử dụng khác.

Theo [biến nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables), `$uri` là URI đã chuẩn hoá, không kèm query; `$request_uri` chứa URI gốc kèm arguments. Origin của lab đọc `lang` trong query, còn bản sai bỏ query khỏi key. Vì vậy origin phân biệt hai đầu vào nhưng cache gộp chúng. Lỗi xuất hiện trước khi có chuyện chọn edge ở đâu.

Nếu TTL ngắn hơn, cửa sổ trả sai có thể ngắn hơn; quan hệ tương đương sai vẫn tồn tại. Shield có thể nhân rộng response sai sang nhiều edge. Anycast chỉ thay đường gói tới edge, không tự thêm `lang` vào key.

> **Nguồn.** [RFC 9111 §2](https://www.rfc-editor.org/rfc/rfc9111.txt) đặt nền tảng key ở method và target URI. [nginx, proxy_cache_key](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_key) công bố default `$scheme$proxy_host$request_uri`. Lab cố ý thay default bằng key thiếu query để cho bản sai chạy trước.

<svg viewBox="0 0 520 250" role="img" aria-labelledby="net26-key-t net26-key-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net26-key-t">Hai request khác ngôn ngữ bị ép về một ô cache</title>
<desc id="net26-key-d">Hai đường query en và vi hội tụ vào cùng key bad/page, trong khi key good/page giữ hai ô riêng.</desc>
<defs><marker id="net26-key-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="20" y="24" fill="currentColor" font-size="15">Bản sai: mất chiều lang</text>
<text x="20" y="62" fill="currentColor" font-size="14">?lang=en</text>
<text x="20" y="108" fill="currentColor" font-size="14">?lang=vi</text>
<path d="M110 58 L242 80 M110 104 L242 80" fill="none" stroke="currentColor" marker-end="url(#net26-key-arrow)"/>
<rect x="250" y="56" width="240" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="85" text-anchor="middle" fill="currentColor" font-size="14">/bad/page → lang=en</text>
<text x="20" y="145" fill="currentColor" font-size="15">Bản sửa: giữ chiều lang</text>
<text x="20" y="181" fill="currentColor" font-size="14">?lang=en</text>
<text x="20" y="227" fill="currentColor" font-size="14">?lang=vi</text>
<path d="M110 177 L242 177" fill="none" stroke="currentColor" marker-end="url(#net26-key-arrow)"/>
<path d="M110 223 L242 223" fill="none" stroke="currentColor" marker-end="url(#net26-key-arrow)"/>
<rect x="250" y="158" width="240" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="250" y="204" width="240" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="370" y="180" text-anchor="middle" fill="currentColor" font-size="14">en → lang=en</text>
<text x="370" y="226" text-anchor="middle" fill="currentColor" font-size="14">vi → lang=vi</text>
</svg>

Đừng sửa theo phản xạ “cho mọi header vào key”. Header không ảnh hưởng response làm cache phân mảnh mà không tăng tính đúng. Ví dụ `User-Agent` có nhiều giá trị nhưng origin chỉ trả một bản HTML như nhau: tách theo toàn bộ chuỗi ấy tạo thêm ô rỗng cần làm nóng. Ngược lại, bỏ host trong một hệ nhiều hostname có thể gộp nội dung của các site khác nhau.

Cách chọn là đi từ hợp đồng origin: path nào public, query nào thay đổi body, header nào chọn representation, request nào mang danh tính. Rồi đối chiếu chính sách CDN có forward đúng đầu vào ấy hay không. **Forward đến origin và đưa vào key là hai quyết định khác nhau.** Forward một header chọn ngôn ngữ nhưng bỏ khỏi key chính là cách tái tạo lỗi lab bằng header thay cho query.

Trong ví dụ công khai chỉ khác ngôn ngữ, key có query là bản sửa đủ cho phép thử. Nó không biến endpoint cá nhân thành endpoint dùng chung an toàn. Danh tính và quyền phải được xác minh; một `X-User` client tự gửi không phải căn cứ tin cậy để phân vùng dữ liệu riêng tư.

Có một ranh giới nữa giữa chuẩn hoá và gộp sai. Hai query chứa cùng cặp tham số nhưng khác thứ tự có thể cho cùng body mà vẫn tạo hai key khi dùng nguyên request URI. Đó là bỏ lỡ tái sử dụng, chưa phải trả sai dữ liệu. Nếu muốn sắp xếp tham số để gộp key, phải kiểm cả tham số lặp: origin có thể lấy giá trị đầu, giá trị cuối hoặc toàn bộ danh sách. Cache và origin hiểu khác nhau sẽ biến phép tối ưu thành lỗi chọn response.

Tương tự, không tự chuyển path sang chữ thường chỉ vì hostname không phân biệt hoa thường. Path có thể được origin xử lý phân biệt chữ hoa; key phải theo hợp đồng origin đang chạy. Lab dùng request URI nguyên bản để giữ các biến thể đã thử, chưa đo thuật toán chuẩn hoá query. Khi thay cấu hình, giữ một bộ request đối chứng gồm trường hợp khác body và trường hợp chỉ khác cách viết; cả tính đúng lẫn khả năng chia sẻ đều cần được kiểm.

### 3.2 Có key chưa đồng nghĩa được trả object ngay

**Shared cache** là cache dùng chung giữa nhiều client; **representation** là một dạng biểu diễn của tài nguyên, chẳng hạn nội dung tiếng Anh hay tiếng Việt. Một shared cache phải trả lời nối tiếp: response có được lưu không, request có khớp bản đã lưu không, bản đó có còn fresh không, nếu không thì có được dùng stale hay phải hỏi origin.

Freshness là thời gian cache được tái sử dụng response mà không cần xác nhận với origin. Nó không phải cam kết rằng dữ liệu trong database chưa đổi. Origin có thể đổi ngay sau khi phát response, còn cache tiếp tục phục vụ bản cũ trong freshness lifetime được cho phép.

Đọc directive theo nghĩa cụ thể:

- `public` cho phép shared cache lưu trong những trường hợp được RFC cho phép, nhưng không sửa một key thiếu chiều dữ liệu.
- `private` không cho shared cache lưu response dạng không có field-name; browser cache vẫn có thể lưu theo luật còn lại.
- `no-store` cấm lưu response; không phải chỉ “TTL bằng không”.
- `no-cache` vẫn có thể lưu nhưng yêu cầu validation trước khi tái sử dụng.
- `s-maxage` điều khiển freshness ở shared cache, có thể khác `max-age` mà browser dùng.

Đây là các quy tắc [RFC 9111 §5.2.2](https://www.rfc-editor.org/rfc/rfc9111.txt). Chính sách override của nhà cung cấp phải được đọc riêng; không suy hành vi CDN chỉ từ một header origin khi bạn đã cấu hình ghi đè nó.

**Validation** là việc cache hỏi origin xem bản đã lưu còn dùng được không, thường bằng `If-None-Match` chứa ETag. Nếu origin trả `304 Not Modified`, cache có thể cập nhật metadata rồi dùng body đã lưu. Một response đến người dùng từ cache vì thế vẫn có thể đã tiêu một lượt hỏi origin. Chỉ đếm body download để suy origin request count sẽ thiếu các lần validation.

**Vary** là response header chỉ ra những request header cần xét khi chọn bản lưu phù hợp. Ví dụ `Vary: Accept-Language` nối việc chọn representation với header ngôn ngữ; nó không thể diễn đạt “query lang”. Với query, target URI/key phải phân biệt đúng. Theo [RFC 9111 §4.1](https://www.rfc-editor.org/rfc/rfc9111.txt), cache phải xét các header được Vary nêu trước khi tái sử dụng response.

Trong nginx, tài liệu `proxy_cache_valid` mô tả việc xử lý `Vary`, bao gồm không cache khi giá trị là `*`. Với một CDN managed, kiểm cache policy và origin request policy của sản phẩm đó. Không mang một kết quả nginx đi khẳng định cấu hình tương ứng của mọi CDN.

### 3.3 Age đo tuổi response, không đo thời gian từ lúc deploy

**Age** là ước lượng tuổi của response do cache cung cấp, tính theo giây và có tính tới thời gian response đã ở các cache trước đó. Một shield có thể trả object đã có tuổi cho edge: edge vừa lưu object không có nghĩa Age bắt đầu lại bằng không.

[RFC 9111 §4.2–4.2.3](https://www.rfc-editor.org/rfc/rfc9111.txt) định nghĩa freshness và cách tính tuổi có hiệu chỉnh thời gian truyền. Dùng Age để giải thích “vì sao còn fresh” phải đọc cùng Cache-Control, Date và thời điểm quan sát. Nó không phải timestamp source code hay tuổi bản ghi database.

Với dữ liệu thay đổi, có hai cách đặt hợp đồng. URL có phiên bản, như `/assets/app.hash.js`, cho mỗi nội dung một tên mới; client nhận HTML mới sẽ yêu cầu asset mới. URL giữ nguyên cần TTL, validation hoặc invalidation. **Invalidation/purge** là yêu cầu loại đối tượng cache trước khi nó tự hết hạn. Cơ chế ấy tác động vào một tập key ở một số tầng, và có thời gian truyền; không phải một giao dịch đồng bộ với commit database.

> **Suy luận.** Nếu browser đã có một response fresh và không gửi request, purge edge không thể trực tiếp thay body trong browser ấy. Suy ra từ vị trí cache và luật freshness trong RFC 9111. Kiểm bằng browser cache và log edge khi vận hành; lab bài này chỉ gọi wget, không đo browser hay purge của CDN managed.

Thêm query phiên bản cũng chỉ có tác dụng khi cache thật sự đưa query ấy vào key. `?v=new` không cứu được cấu hình `$uri` của nhánh bad. Đó là một kiểm tra nên làm trước khi chấp nhận “đã cache busting”.

## ⏸ Dừng lại — đoán trước #2

Một edge vừa khởi động, chưa có object; shield còn object fresh với đúng key. Request đầu đến edge sẽ gây điều gì?

- (a) Edge MISS nên chắc chắn origin nhận request.
- (b) Edge MISS nhưng shield có thể HIT, origin không cần nhận request ấy.
- (c) Shield tự đồng bộ mọi object xuống edge ngay khi edge khởi động.
- (d) DNS trả được IP edge thì edge chắc chắn đã có nội dung.

### 3.4 Shield làm hội tụ cache miss, không làm nội dung đúng hơn

Đáp án **(b)**. **Origin shield** là tầng cache tập trung hơn nằm giữa các cache phía người dùng và origin. **PoP** là điểm hiện diện chứa hạ tầng phục vụ client tại một địa điểm mạng. Các PoP có thể cùng thiếu một object; đưa miss qua một shield cho chúng thêm cơ hội dùng chung object trước khi đánh tới origin.

Không có shield, từng edge lạnh tự fetch về origin. Có shield, edge lạnh hỏi shield; nếu shield đã giữ bản phù hợp, request dừng ở đó. Nếu shield cũng miss, nó fetch origin rồi các tầng có thể lưu response theo chính sách của mình.

[CloudFront Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) mô tả tầng cache bổ sung và khả năng gom request đồng thời cùng object. Đây là tính năng của sản phẩm được dẫn nguồn, không phải bảo đảm của bất kỳ proxy nào bạn đặt thêm.

<step-flow>
<svg viewBox="0 0 640 330" role="img" aria-labelledby="net26-shield-t net26-shield-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net26-shield-t">Edge thứ hai có thể miss mà origin không nhận thêm request</title>
<desc id="net26-shield-d">Hai edge hội tụ vào một shield. Edge A làm nóng shield qua origin; edge B sau đó lấy cùng key từ shield.</desc>
<defs><marker id="net26-shield-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-size="15" text-anchor="middle">
<text x="320" y="37">Cùng /good/page?lang=vi</text>
</g>
<rect x="25" y="75" width="135" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="25" y="235" width="135" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="285" y="145" width="130" height="80" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="500" y="155" width="120" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<g fill="currentColor" font-size="15" text-anchor="middle"><text x="92" y="110">Edge A</text><text x="92" y="270">Edge B</text><text x="350" y="173">Shield</text><text x="560" y="190">Origin</text></g>
<g data-step="1"><path d="M160 105 L285 160" stroke="currentColor" marker-end="url(#net26-shield-arrow)"/><text x="200" y="114" fill="currentColor" font-size="14">MISS</text></g>
<g data-step="2"><path d="M415 175 L500 175" stroke="currentColor" marker-end="url(#net26-shield-arrow)"/><text x="449" y="149" fill="currentColor" font-size="14">fetch</text></g>
<g data-step="3"><path d="M500 204 L415 204" stroke="currentColor" marker-end="url(#net26-shield-arrow)"/><text x="350" y="203" fill="currentColor" font-size="14" text-anchor="middle">lang=vi</text></g>
<g data-step="4"><path d="M160 265 L285 210" stroke="currentColor" marker-end="url(#net26-shield-arrow)"/><text x="200" y="235" fill="currentColor" font-size="14">MISS</text><path d="M300 225 L160 290" stroke="#10b981" marker-end="url(#net26-shield-arrow)"/><text x="260" y="306" fill="currentColor" font-size="14">HIT tại shield</text></g>
</svg>
<step-note data-step="1">Edge A chưa có key này nên chuyển miss lên tầng trên. Chưa thể kết luận origin đã nhận request.</step-note>
<step-note data-step="2">Trong tình huống đang xét, shield cũng lạnh nên cần fetch origin. Đây là lần lấy body từ origin.</step-note>
<step-note data-step="3">Shield lưu bản được phép cache. Hình mô tả cơ chế có nguồn, không phải kết quả lab nhiều PoP.</step-note>
<step-note data-step="4">Edge B lạnh nhưng shield đã nóng với cùng key. Đường hồi đáp dừng ở shield, không cần cạnh fetch origin.</step-note>
</step-flow>

**Request collapsing** là gom những lần fetch đồng thời cho cùng key để chỉ một lần đi upstream, các request còn lại chờ kết quả đó. Nó xử lý đợt miss trùng thời gian; cache reuse xử lý request tới sau khi đã có bản lưu. Hai cơ chế liên quan nhưng không đồng nhất: đặt thêm shield mà không có lock/collapse phù hợp vẫn có thể tạo nhiều fetch cùng lúc khi shield lạnh.

Trong nginx, `proxy_cache_lock` là cấu hình có thể dùng để khảo sát hành vi ấy. Không bật hoặc đo lock trong lab dưới đây, nên không suy từ log tuần tự ra số fetch khi hàng nghìn request đến cùng lúc. Chờ lock cũng có timeout: muốn đo phải cố ý làm origin chậm, chạy client đồng thời rồi đếm request origin.

Shield thêm một chặng cho request đi qua nó. Lợi ích không phải mọi MISS đều có latency nhỏ hơn, mà là giảm số lần và số đường phải tới origin, có thể tái sử dụng kết nối upstream và tận dụng cache ở tầng hội tụ. Bài toán vận hành phải đo riêng latency HIT edge, HIT shield, MISS origin và tỷ lệ của từng nhóm.

### 3.5 Đến edge nào là quyết định khác với HIT object nào

**DNS-based routing** chọn địa chỉ trả trong DNS theo chính sách, vị trí quan sát resolver, sức khoẻ hoặc tải. Sau khi client có IP, gói IP được chuyển theo routing bình thường. Nếu DNS trả IP unicast của một PoP, đổi đáp án sau đó không làm một kết nối đang mở tự chuyển PoP.

Theo [RFC 4786 §2](https://www.rfc-editor.org/rfc/rfc4786.txt), **anycast** là nhiều địa điểm cùng quảng bá một địa chỉ/prefix, để routing chọn một đường tới một trong các địa điểm ấy. Xem bài net-13 trong roadmap để học cơ chế BGP; ở đây chỉ cần tách nó khỏi DNS. Một hostname CDN vẫn cần DNS để ra IP anycast. Do đó “có DNS” và “dùng anycast” không phải hai thuộc tính loại trừ nhau.

[Kiến trúc CDN của Cloudflare](https://developers.cloudflare.com/reference-architecture/architectures/cdn/) trình bày việc dùng anycast để đưa traffic vào mạng của họ. “Gần nhất” trong ngữ cảnh này là kết quả đường mạng/chính sách, không phải đo khoảng cách địa lý từ trình duyệt. Một PoP gần trên bản đồ chưa chắc nằm trên đường được BGP chọn.

<svg viewBox="0 0 520 295" role="img" aria-labelledby="net26-route-t net26-route-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net26-route-t">Quyết định DNS đứng trước quyết định routing</title>
<desc id="net26-route-d">Client hỏi DNS lấy IP rồi routing đưa gói tới một edge; hai edge giữ các cache riêng nên cùng IP anycast không đồng nghĩa chung object.</desc>
<defs><marker id="net26-route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<rect x="20" y="30" width="110" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="330" y="30" width="165" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="59" fill="currentColor" text-anchor="middle" font-size="15">Client</text>
<text x="412" y="59" fill="currentColor" text-anchor="middle" font-size="15">DNS → IP</text>
<path d="M130 54 L330 54 M75 78 L75 155 L195 155" fill="none" stroke="currentColor" marker-end="url(#net26-route-arrow)"/>
<text x="225" y="40" fill="currentColor" text-anchor="middle" font-size="14">Hỏi tên</text>
<rect x="195" y="130" width="125" height="50" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="257" y="160" fill="currentColor" text-anchor="middle" font-size="15">IP routing</text>
<rect x="55" y="230" width="160" height="48" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="340" y="230" width="160" height="48" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<path d="M235 180 L135 230" fill="none" stroke="currentColor" marker-end="url(#net26-route-arrow)"/>
<path d="M285 180 L420 230" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="135" y="259" fill="currentColor" text-anchor="middle" font-size="14">Edge A · cache A</text>
<text x="420" y="259" fill="currentColor" text-anchor="middle" font-size="14">Edge B · cache B</text>
<text x="310" y="113" fill="currentColor" text-anchor="middle" font-size="13">Anycast: routing chọn điểm vào</text>
</svg>

Một CDN có thể phối hợp cả hai: DNS điều khiển tập địa chỉ trả ra, routing điều khiển đường tới địa chỉ được chọn. “DNS-based” không mặc định chậm hay chính xác hơn; resolver cache làm thay đổi có độ trễ theo TTL, còn routing hội tụ theo hệ thống định tuyến. Không lấy TTL DNS để suy thời gian object hết cache, và không lấy TTL object để suy lúc client nhận IP mới.

Cùng IP anycast không có nghĩa cùng cache RAM/disk. Client ở hai mạng khác nhau có thể tới hai PoP và nhận HIT/MISS khác nhau. Ngược lại, hai PoP khác nhau có thể cùng dùng shield và cùng giảm request origin. Khi debug, ghi hostname, DNS answer, PoP identifier nếu sản phẩm có, thời điểm và request headers. Không chỉ ghi URL rồi kết luận “CDN lúc đúng lúc sai”.

### 3.6 Quy trình chứng minh nội dung sai nằm ở tầng nào

Bắt đầu bằng body và representation mong muốn. Gọi trực tiếp origin bằng một đường được phép, giữ host và các input ảnh hưởng nội dung; đối chiếu với request qua edge. Nếu origin cũng sai thì chưa có bằng chứng cache gây lỗi. Nếu origin đúng, edge sai và HIT thì xem key cùng metadata lưu.

Tiếp theo phân biệt các khả năng có thể bác bỏ. Query bị bỏ khỏi key: thay query vẫn HIT cùng body, như lab. Header không được forward: MISS vẫn ra representation mặc định ở origin. Origin mới nhưng shield cũ: edge MISS có thể lấy bản cũ từ shield, cần log tầng trên. Browser cũ: edge không thấy request khi người dùng mở lại nội dung.

Không dùng header `X-Cache` như một chuẩn HTTP chung. Trong lab đó là header tự thêm từ `$upstream_cache_status`. CDN khác có header riêng, có thể chứa trạng thái của nhiều tầng; đọc tài liệu của chính sản phẩm để giải nghĩa. `Age` cũng không xác thực nội dung: response sai key vẫn có Age hoàn toàn hợp lệ.

Với endpoint có dữ liệu theo tài khoản, ưu tiên chặn shared caching ở đường cần riêng tư, dùng policy tường minh và xác minh bằng request của hai danh tính thử nghiệm. Cấu hình đúng với public asset chưa đủ cho response kèm cookie, Authorization hoặc tenant. Không triển khai lab cố tình sai ở một route chứa dữ liệu thật.

## 4. Lab

### 4.1 Dựng một edge có hai chính sách

Các file ở `~/projects/net-lab/net-26/`: `run.sh`, `origin.py`, `nginx.conf`. Script dựng network `net26-wire`, origin và edge rồi dọn chúng khi thoát. Không publish port ra host; các request đi qua `docker exec`.

```sh
cd ~/projects/net-lab/net-26
./run.sh
cat out/environment.txt
cat out/requests.txt
cat out/origin.txt
```

Đây là một reverse proxy cache làm mô hình edge, không phải triển khai CDN có nhiều PoP. Nó kiểm cơ chế key và tái sử dụng response mà không dựa vào trạng thái cache của một dịch vụ Internet thật.

Origin có đúng một nhiệm vụ: đọc query và trả `lang=<giá trị>`, với Cache-Control public, max-age 60. Không có dữ liệu người dùng. Hai location nginx đều chuyển request về origin nhưng dùng key khác nhau:

```nginx
# Trích nginx.conf; hai đoạn nằm trong hai location khác nhau.
# Bản sai /bad/
proxy_cache_key "$scheme|$host|$uri";
# Bản sửa /good/
proxy_cache_key "$scheme|$host|$request_uri";
```

Nhánh good giữ toàn bộ query nên đủ cho endpoint lab. Với production, bạn có thể chỉ đưa những query thật sự chọn representation vào key để bỏ tham số tracking; cần chuẩn hoá và kiểm từng biến thể hợp lệ, không sao chép cấu hình một cách máy móc.

### 4.2 Cho bản sai chạy trước

Script gửi tiếng Anh trước, tiếng Việt sau. Output ở mục Triệu chứng cho thấy request tiếng Việt lấy body tiếng Anh. Bằng chứng bổ sung ở `out/origin.txt`: nhánh bad chỉ làm origin nhận `/page?lang=en`; không có lần fetch riêng cho tiếng Việt của nhánh này.

Vì sao không chỉ kiểm header? Một HIT có thể đúng với cấu hình cache nhưng sai với hợp đồng ứng dụng. Vì sao không chỉ gọi tiếng Việt một lần? Nếu cache trống, nó MISS và trả tiếng Việt đúng; request tiếng Anh đến sau mới bị sai. Thứ tự làm nóng cache là một phần điều kiện tái hiện.

### 4.3 Giữ biến thể trong key rồi thử lại

```text
GET /good/page?lang=en
lang=en
  HTTP/1.1 200 OK
  X-Cache: MISS
GET /good/page?lang=vi
  HTTP/1.1 200 OK
  X-Cache: MISS
lang=vi
GET /good/page?lang=vi
lang=vi
  HTTP/1.1 200 OK
  X-Cache: HIT
```

Trích `out/requests.txt`. Lần tiếng Việt đầu đi upstream vì chưa có ô tương ứng; lần sau dùng đúng ô tiếng Việt. Bằng chứng là đồng thời có MISS/HIT chuyển trạng thái và body không đổi sang tiếng Anh.

`out/origin.txt` có một request `/` do readiness check, sau đó ba fetch `/page...`: tiếng Anh của bad, tiếng Anh của good, tiếng Việt của good. Đừng đếm readiness thành cache miss của phép thử. Trong năm request nghiệp vụ tuần tự, origin nhận ba; hai request còn lại dừng ở edge. Những số này thuộc kịch bản lab, không phải tỷ lệ của một website thực.

### 4.4 Biết phép thử chưa chứng minh điều gì

> **Chưa đo.** Lab chưa có shield thật, revalidation, Age qua nhiều cache, purge, routing anycast, HTTP/3 hay nhiều client đồng thời. Đo shield bằng hai edge trỏ cùng cache upstream, gắn log theo request và đếm riêng ở từng tầng. Đo collapsing bằng origin cố ý chậm và client đồng thời; không suy từ năm request tuần tự trong bài.

Muốn mở rộng bài tập, trước hết giữ nguyên ca sai/sửa đã tái hiện, rồi thay một biến mỗi lượt: thêm tham số tracking không đổi body, thêm header chọn representation, hoặc đặt response no-store ở một path khác. Lưu cấu hình và output mới vào file riêng để không trộn số liệu của những chính sách khác nhau.

## 5. Tính tay

Các số trong phần này là **giả thiết bài tập**, không phải số đo CDN. Kết quả đã đối chiếu bằng Python; phép tính lưu ở `out/calculations.txt`.

### 5.1 Hai tầng HIT có cộng lại không?

Giả sử có 10.000 request, edge HIT 80% toàn bộ request. Trong những request còn lại, shield HIT 75%. Bỏ qua validation, retry và collapsing.

Edge xử lý `10.000 × 0,8 = 8.000`. Shield nhận 2.000, xử lý `2.000 × 0,75 = 1.500`. Origin nhận `2.000 × 0,25 = 500`, tức 5% tổng request. Tỷ lệ được cache phục vụ ở một trong hai tầng là 95%, không phải 155%.

Công thức origin fraction là `(1 − h_edge) × (1 − h_shield_conditional)`. Phải biết mẫu số của mỗi tỷ lệ: nếu dashboard shield tính theo toàn bộ viewer request, không được thay thẳng số vào công thức có mẫu số là edge miss.

### 5.2 Thêm chiều vào key tốn bao nhiêu ô?

Giả sử một endpoint có 100 path, mỗi path có 2 ngôn ngữ và 3 loại tiền tệ, mọi tổ hợp đều tạo response khác và đều được request. Cần tối đa `100 × 2 × 3 = 600` biến thể đang xét. Nếu thêm một request ID riêng cho từng lần gọi vào key, việc chia sẻ gần như mất vì mỗi lần lại có key mới.

Bỏ currency khỏi key giảm số ô nhưng phá tính đúng; thêm request ID tăng số ô mà không giúp chọn representation. Không tối ưu hit ratio trước khi xác định ranh giới dùng chung hợp lệ.

### 5.3 Shield có thể làm MISS chậm thêm mà trung bình vẫn giảm không?

Giả sử HIT edge mất 10 ms, MISS edge được HIT shield mất 30 ms, MISS cả hai mất 150 ms. Phân bố 80%, 15%, 5% tương ứng như bài 5.1.

Trung bình là `0,8 × 10 + 0,15 × 30 + 0,05 × 150 = 20 ms`. Đây là trung bình có trọng số, không phải p95. Muốn nói p95 cần phân bố thực và quy tắc tính percentile; ba nhãn nhóm không chứa đủ chi tiết latency trong từng nhóm để suy một giá trị p95 production.

## 6. Chuyển giao

1. Origin trả currency theo cookie, CDN forward cookie nhưng key chỉ có path. Bạn viết hai request kiểm thử theo thứ tự nào để phát hiện lỗi dù từng request ở cache trống đều đúng?
2. Một URL có thêm `utm_source` nhưng body không đổi. Bạn cần xác minh điều gì trước khi loại tham số ấy khỏi key ở cả edge và shield?
3. Deploy asset mới, purge edge xong nhưng một client không tạo request mới. Cache nào có thể giữ nội dung, và log nào giúp bác bỏ giả thuyết edge vẫn trả bản cũ?
4. Edge ghi MISS, origin không thấy request tương ứng. Hãy nêu hai khả năng có thể kiểm chứng, thay vì kết luận mất log.
5. Hai ISP cùng phân giải ra một IP nhưng một bên HIT, một bên MISS. Vì sao điều ấy chưa chứng minh DNS lỗi?
6. Một CDN có shield, validation và request collapsing. Dashboard chỉ cung cấp viewer hit ratio và tổng byte origin. Bạn phải bổ sung những phép đo nào để chứng minh origin request giảm mà tính đúng theo tenant vẫn giữ được khi một PoP đổi đường vào giữa lúc purge?

Câu cuối là bài thiết kế phép đo mở; bài không đưa đáp án hoàn chỉnh.

## 7. Tóm tắt

- Key phải giữ những chiều đầu vào làm response khác nhau; lab bỏ query đã trả tiếng Anh cho request tiếng Việt.
- Freshness cho phép tái sử dụng trong một thời hạn; nó không đồng bộ với lần ghi database.
- No-cache yêu cầu validation; no-store cấm lưu theo RFC 9111, hai directive không đồng nghĩa.
- Edge MISS không đủ suy origin MISS khi còn một shield ở giữa.
- Routing chọn điểm vào; cache policy chọn response. Cùng IP anycast không đồng nghĩa cùng cache.
- Trong lab có năm request nghiệp vụ, ba fetch origin và hai edge HIT; kết luận không bao gồm tải đồng thời hay CDN managed.

→ **Bài 27 — Mạng container và Kubernetes**: sau khi request rời cache và tới cụm chạy ứng dụng, lần theo VIP, rule kernel và lớp đóng gói xuyên node để biết gói thật sự đi đâu.
