# Bài 14 — Khi BGP sai: hijack, leak và RPKI chặn được tới đâu?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phân loại một sự cố thành quảng bá origin trái phép, truyền route sai phạm vi, hoặc rút đường do mạng tự mất khả năng phục vụ.
- Chỉ ra vì sao một `/24` sai hút traffic nằm trong `/23` đúng dù aggregate có LOCAL_PREF cao hơn.
- Tính trạng thái Valid, Invalid, NotFound từ prefix, origin và tập VRP, kể cả bẫy maxLength và nhiều quyền chồng nhau.
- Giải thích vì sao route leak có origin hợp lệ vẫn vượt qua kiểm tra origin.
- Chạy lại thí nghiệm FRR, lưu riêng bảng BGP và lookup kernel trước/sau khi lọc quảng bá sai.
- Viết kết luận điều tra phân biệt bằng chứng quan sát được, quyền được công bố và chính sách thực thi tại mạng nhận.

## 2. Triệu chứng

Router biên r1 có đường tới `203.0.112.0/23` từ r4, origin AS65004. Đường trực tiếp có LOCAL_PREF 250. Bạn cho rằng nó đã được ưu tiên đủ cao để tránh đi vòng. Sau khi r3 khởi phát `203.0.113.0/24` với origin AS65003, lookup `203.0.113.8` lại chỉ sang r2. Aggregate vẫn còn, đường trực tiếp vẫn best cho `/23`, phiên BGP vẫn lên.

Bản sửa đầu tiên là tăng tiếp ưu tiên của aggregate. Nó đánh nhầm đối tượng: router đang có thêm một prefix cụ thể hơn, không phải thêm một ứng viên cho cùng prefix. Khi request đã đi sai cửa ra trước khi tới dịch vụ, tăng timeout HTTP chỉ kéo dài thời gian chờ.

> **Đo trên lab.** FRR `10.2.1_git` trong image `quay.io/frrouting/frr:10.2.1`, Linux aarch64 trên colima. `out/aggregate.txt` giữ LOCAL_PREF 250; `out/lookup-hijack.txt` ghi `via 10.114.12.2`, rồi `out/lookup-filtered.txt` ghi `via 10.114.14.4`. Đo lại bằng `./run.sh` trong thư mục `net-lab/net-14`; thông tin kernel và image cụ thể nằm ở `out/environment.txt`.

Ta dùng lại vòng bốn router của [net-11](net-11-bgp-co-che.md). AS, ASN, UPDATE và thứ tự chọn đường đã có ở net-10/net-11; ở đây chỉ dùng chúng làm công cụ đọc sự cố. Longest prefix match đã có ở [eng-02](../engineering/eng-02-cidr-subnetting.md) và bài net-06. Câu hỏi mới là: **một thông báo được chấp nhận bằng cơ chế BGP có thực sự được phép tồn tại và lan đi như thế không?**

## ⏸ Dừng lại — đoán trước #1

r1 có `/23` origin AS65004, LOCAL_PREF 250 và `/24` nằm bên trong, origin AS65003. Cả hai đã cài được vào kernel. Tăng LOCAL_PREF của `/23` lên 500 sẽ làm lookup tới IP thuộc `/24` đổi về aggregate chứ?

- (a) Có, vì 500 lớn hơn ưu tiên của `/24`.
- (b) Không, vì thuộc tính BGP chỉ chọn ứng viên cho từng prefix; lookup vẫn khớp `/24`.
- (c) Có, vì origin của aggregate phải được tin hơn.
- (d) Chỉ cần phiên tới r4 còn Established là `/24` bị bỏ qua.

## 3. Cơ chế

### 3.1 Hijack là sai quyền khởi phát; đường cụ thể hơn làm phạm vi bị hút có biên rõ ràng

Đáp án **(b)**. **BGP prefix hijack** là việc một mạng khởi phát quảng bá địa chỉ mà nó không được phép khởi phát, có thể do cấu hình sai hoặc hành vi có chủ ý. Không cần máy gửi giả mạo IP nguồn của từng request; điều bị thao túng là thông tin mà mạng khác dùng để quyết định đường tới địa chỉ đích.

Trong lab, quyền giả định thuộc AS65004 cho `203.0.112.0/23`; AS65003 không được cấp quyền cho `/24` bên trong. r3 vẫn có thể gõ lệnh `network` với prefix đó. Cú pháp đúng và phiên BGP hợp lệ không biến lệnh này thành quyền sử dụng prefix. Phải có một nguồn quyền riêng và policy đối chiếu tại mạng nhận.

**Subprefix hijack** là hijack một khối cụ thể hơn nằm trong khối của bên bị ảnh hưởng. r1 chọn đường best cho `/23` và best cho `/24` một cách riêng rẽ; sau đó kernel chọn `/24` khi lookup IP thuộc nó. Không có một cuộc bầu chọn LOCAL_PREF giữa hai độ dài prefix. Vì vậy bản sửa tăng ưu tiên aggregate có thể chạy thành công, log không báo lỗi, nhưng vẫn không đổi lookup gây sự cố.

<step-flow>
<svg viewBox="0 0 520 290" role="img" aria-labelledby="net14-a-t net14-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net14-a-t">Một /24 chiếm lưu lượng trong /23</title>
<desc id="net14-a-d">Quảng bá đi về r1; lookup sau khi có /24 đi về r2. Các mũi tên khác màu có chiều khác nhau.</desc>
<defs><marker id="net14-a-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="30" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="100" y="58" text-anchor="middle">r1 · 65001</text>
<rect x="330" y="30" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="58" text-anchor="middle">r4 · 65004</text>
<rect x="20" y="220" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="100" y="248" text-anchor="middle">r2 · 65002</text>
<rect x="330" y="220" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="248" text-anchor="middle">r3 · 65003</text>
<g data-step="1"><path d="M330 52L180 52" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net14-a-a)"/><text x="255" y="32" text-anchor="middle">/23 hợp lệ</text></g>
<g data-step="2"><path d="M330 242L180 242" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net14-a-a)"/><path d="M100 220L100 75" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net14-a-a)"/><text x="255" y="215" text-anchor="middle">/24 origin 65003</text></g>
<g data-step="1" data-until="2"><path d="M180 92L330 92" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net14-a-a)"/><text x="255" y="118" text-anchor="middle">lookup .113.8 → r4</text></g>
<g data-step="3"><path d="M130 75L130 220" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net14-a-a)"/><text x="275" y="160" text-anchor="middle">lookup .113.8 → r2</text></g>
</g>
</svg>
<step-note data-step="1">r4 quảng bá aggregate trực tiếp; r1 còn nhận một ứng viên vòng cho cùng /23.</step-note>
<step-note data-step="2">r3 tự khởi phát /24; r2 truyền nó tới r1. Bộ lọc ở r4 chỉ xuất /23 trên liên kết trực tiếp.</step-note>
<step-note data-step="3">Lookup dùng /24 đã được cài. LOCAL_PREF 250 của /23 không được đem so với thuộc tính của /24.</step-note>
</step-flow>

Với cùng prefix thì khác: nếu một origin sai cũng quảng bá đúng `/23`, nó phải cạnh tranh với ứng viên `/23` hợp lệ theo policy của bên nhận. Không thể kết luận “hijack luôn thắng” hoặc “AS_PATH ngắn nhất luôn thắng”. Cần biết prefix nào được nhận, ứng viên nào đủ điều kiện và policy tại chính điểm quan sát. Net-11 đã chứng minh policy có thể đổi best; bài này thêm câu hỏi về tính được phép của route trước khi cho nó tham gia lựa chọn.

Một đường sai có thể gây **blackhole**, tức gói bị đưa tới nơi không chuyển được tiếp, hoặc khiến gói đi qua một mạng ngoài dự định. Riêng bảng BGP không chứng minh bên kia đã đọc, sửa hay chuyển tiếp payload. TLS còn có cơ chế xác thực riêng đã học ở eng-03; route sai không tự cấp chứng chỉ hợp lệ cho kẻ nhận. Chiều ngược lại cũng phải giữ: TLS không tạo lại đường IP bị mất, nên xác thực ứng dụng đúng không cứu được lỗi reachability.

### 3.2 YouTube 2008: một quảng bá cục bộ trở thành lỗi ngoài phạm vi

Theo [case study của RIPE NCC](https://www.ripe.net/about-us/news/youtube-hijacking-a-ripe-ncc-ris-case-study/), ngày 24/02/2008, YouTube AS36561 đang quảng bá `208.65.152.0/22`. Lúc 18:47 UTC, Pakistan Telecom AS17557 khởi phát `208.65.153.0/24`; upstream AS3491 truyền tiếp ra ngoài. Khối cụ thể hơn kéo traffic tới phía Pakistan. Nguồn và mốc này nằm ở `src/youtube.txt`.

Không cần biết cấu hình của từng mạng để thấy cơ chế hút traffic trong phần bị bao phủ. Nhưng muốn nói tỷ lệ người dùng toàn cầu bị ảnh hưởng, collector chưa đủ: RIPE cũng giới hạn kết luận theo góc nhìn các peer mà RIS thu được. Tránh đổi “được quan sát lan rộng” thành “mọi router trên Internet đều chọn cùng đường”.

YouTube quảng bá lại cùng `/24`, rồi các `/25` cụ thể hơn. Cùng `/24` đưa cạnh tranh trở về policy BGP; `/25` chỉ giúp ở nơi chấp nhận và nhận được nó. Chính case study ghi nhận độ lan của `/25` thấp hơn aggregate. Vì thế “cứ chia prefix nhỏ hơn để lấy lại traffic” không phải quy trình khắc phục có bảo đảm. Bên nhận có thể đặt giới hạn độ dài prefix, và việc phản ứng còn phải tuân thủ quyền quảng bá của chủ tài nguyên.

Trường hợp này có cả một origin không được phép và một bước upstream truyền thông báo ra ngoài. Gọi mọi sự cố truyền sai là hijack sẽ bỏ mất câu hỏi quan trọng: nếu origin vẫn đúng nhưng route được xuất nhầm sang đối tác thì sao?

### 3.3 Route leak: đúng đích xuất phát, sai phạm vi truyền

**Route leak** là sự lan truyền thông tin định tuyến vượt ra ngoài phạm vi mà chính sách dự kiến cho phép; định nghĩa và các dạng leak nằm trong [RFC 7908](https://www.rfc-editor.org/rfc/rfc7908). Nó được nhận diện bằng quan hệ và policy, không chỉ bằng số ASN trong đường.

Ta gán ý nghĩa cho vòng lab: r1 và r3 là hai upstream của r2; r3 có đường tới origin r4. r2 được dùng đường học từ r3 cho nhu cầu của nó và customer được phép, nhưng không được biến mình thành transit giữa hai upstream. Khi r2 xuất đường đó sang r1, route đã vượt phạm vi dự kiến. r1 có thể coi route nhận từ r2 là route customer và ưu tiên nó; đường vòng trở thành đường đang dùng dù origin cuối vẫn AS65004.

<step-flow>
<svg viewBox="0 0 520 285" role="img" aria-labelledby="net14-c-t net14-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net14-c-t">Origin đúng vẫn có thể leak</title>
<desc id="net14-c-d">Theo giả định quan hệ thương mại, r2 không được xuất route upstream sang upstream r1. Origin không đổi.</desc>
<defs><marker id="net14-c-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="25" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="100" y="53" text-anchor="middle">r1 · 65001</text><rect x="330" y="25" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="53" text-anchor="middle">r4 · 65004</text><rect x="20" y="210" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="100" y="238" text-anchor="middle">r2 · 65002</text><rect x="330" y="210" width="160" height="45" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="410" y="238" text-anchor="middle">r3 · 65003</text><g data-step="1"><path d="M410 70L410 210" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net14-c-a)"/><path d="M330 232L180 232" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net14-c-a)"/><text x="260" y="205" text-anchor="middle">/23 · origin 65004</text></g><g data-step="2"><path d="M100 210L100 70" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#net14-c-a)"/><text x="270" y="120" text-anchor="middle">r2 xuất route học từ upstream</text></g><g data-step="3"><path d="M130 70L130 210" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net14-c-a)"/><text x="300" y="160" text-anchor="middle">ROV: Valid · export: sai</text></g>
</g>
</svg>
<step-note data-step="1">Đường từ r4 được truyền qua r3 tới r2. Giả định r3 là upstream của r2.</step-note>
<step-note data-step="2">r2 truyền tiếp sang upstream r1, vượt phạm vi được phép. Đó là lỗi export theo quan hệ đã giả định.</step-note>
<step-note data-step="3">r1 ưu tiên route từ customer với LOCAL_PREF 300. Kiểm origin vẫn Valid nên cần policy xuất/nhập riêng.</step-note>
</step-flow>

Đây là **giả định quan hệ của thí nghiệm**, không phải điều FRR tự suy ra từ topology. FRR không đọc hợp đồng transit. Một đường `65002 65003 65004` có thể hoàn toàn được phép trong topology khác. Chỉ nhìn thấy đường dài lên chưa đủ kết luận leak; phải đối chiếu import/export policy và vai trò hai đầu phiên. Tương tự, một AS xuất hiện trong path không chứng minh nó cố ý tấn công.

**Suy luận:** áp prefix allow-list chỉ cho đúng aggregate có thể chặn `/24` origin sai trong thí nghiệm, nhưng vẫn cho aggregate leak qua. Prefix đúng giải một câu hỏi; quyền xuất tới peer cụ thể là câu hỏi khác. Lab sẽ giữ cả hai sự kiện để bản sửa đầu tiên có một đối chứng không được nó bảo vệ.

## ⏸ Dừng lại — đoán trước #2

Bạn công bố quyền cho AS65004 quảng bá `203.0.112.0/23` và các prefix dài tối đa `/24`. Route nhận được là `/23`, đường `65002 65003 65004`; r2 lỡ xuất nó từ upstream này sang upstream kia. Kiểm tra origin trả gì?

- (a) Invalid vì đường có ba ASN.
- (b) NotFound vì có leak.
- (c) Valid, vì origin và độ dài vẫn khớp quyền; lỗi export không nằm trong kiểm tra này.
- (d) Valid đồng nghĩa đường đã được ký xác thực qua từng AS.

### 3.4 ROA tạo quyền; ROV đối chiếu một route với quyền ấy

Đáp án **(c)**. **RPKI — Resource Public Key Infrastructure — là hạ tầng chứng chỉ gắn quyền tài nguyên số Internet với khoá công khai.** **ROA — Route Origin Authorization — là đối tượng được ký, cho phép một AS khởi phát những prefix xác định.** Cấu trúc ROA hiện hành được mô tả trong [RFC 9582](https://www.rfc-editor.org/rfc/rfc9582). Không có “chữ ký RPKI cho nguyên đường BGP” nằm sẵn trong mọi UPDATE.

Một **validator**, tức phần mềm kiểm chữ ký và chuỗi quyền tài nguyên, tải các đối tượng RPKI và xuất tập quyền đã kiểm. Router thường không tự tải mọi repository rồi kiểm toàn bộ chứng chỉ. Nó nhận **VRP — Validated ROA Payload — là bộ dữ liệu prefix, độ dài tối đa và origin ASN đã qua bước xác thực**. **ROV — Route Origin Validation — là bước đối chiếu prefix và origin của route BGP với tập quyền này.** [RFC 6811 §2](https://www.rfc-editor.org/rfc/rfc6811#section-2) mô tả cơ sở dữ liệu và thuật toán.

Chuỗi trách nhiệm là: chủ tài nguyên phát hành ROA → validator kiểm ra tập VRP → router đối chiếu route → import policy quyết định nhận hay loại. Nếu thiếu bước cuối, có trạng thái validation không đồng nghĩa traffic đã được bảo vệ. Nếu validator thiếu hoặc dùng dữ liệu cũ, trạng thái tại hai mạng có thể khác. RFC 6811 cũng nhắc tính nhất quán lỏng của dữ liệu cache; ảnh chụp một công cụ không đại diện toàn bộ mạng nhận.

Trong ví dụ chính, VRP là `(203.0.112.0/23, maxLength 24, AS65004)`. Prefix route phải nằm trong `/23`, độ dài không vượt 24, origin phải AS65004. **maxLength** là độ dài prefix tối đa được quyền đó cho phép, không phải giới hạn số route và không phải “cứ dài hơn aggregate là tốt”. Không khai maxLength trong ROA thì quyền chỉ dành cho chính độ dài prefix được liệt kê; đừng tự hiểu mặc định là mọi độ dài tới `/32`.

<svg viewBox="0 0 520 300" role="img" aria-labelledby="net14-b-t net14-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net14-b-t">Cùng prefix, khác quyền origin</title>
<desc id="net14-b-d">Hai route cùng nằm trong VRP nhưng chỉ origin 65004 khớp.</desc>
<defs><marker id="net14-b-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" font-family="sans-serif" font-size="14">
<rect x="20" y="35" width="480" height="50" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/><text x="260" y="65" text-anchor="middle">VRP: 203.0.112.0/23 · maxLength 24 · AS65004</text><rect x="20" y="120" width="238" height="110" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><rect x="262" y="120" width="238" height="110" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/><text x="139" y="150" text-anchor="middle">203.0.113.0/24</text><text x="139" y="180" text-anchor="middle">origin 65004 → Valid</text><text x="381" y="150" text-anchor="middle">203.0.113.0/24</text><text x="381" y="180" text-anchor="middle">origin 65003 → Invalid</text><path d="M140 85L140 120" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net14-b-a)"/><path d="M380 85L380 120" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net14-b-a)"/><text x="260" y="270" text-anchor="middle">Bao phủ prefix chưa đủ: phải khớp ASN và độ dài.</text>
</g>
</svg>

Vì sao phải có ràng buộc độ dài? Chủ khối có thể muốn cho phép một aggregate mà không cấp quyền cho mọi phân mảnh của nó. Mở maxLength rộng hơn nhu cầu làm tập prefix có thể mang đúng origin lớn hơn; một thông báo giả giữ origin được phép sẽ không bị ROV bắt chỉ vì nó cụ thể hơn aggregate. Điều này không khiến ROA vô ích: nó nói đúng phạm vi mà bạn đã ký. Cần chọn phạm vi theo kế hoạch quảng bá thật, rồi kiểm trước khi chuyển đổi hoặc thêm đích dự phòng.

> **Nguồn.** RFC 6811 nêu giới hạn *“the complete path attestation against the AS_PATH attribute”* là ngoài phạm vi của tài liệu ([§1](https://www.rfc-editor.org/rfc/rfc6811#section-1), bản tải `src/rfc6811.txt`). ROV không xác thực toàn bộ chuỗi AS; leak giữ origin hoặc một path giả giữ origin được phép có thể vẫn Valid.

Không suy ngược “Valid = an toàn” từ tên trạng thái. Nó chỉ trả lời một phép kiểm quyền origin trên bộ dữ liệu tại thời điểm đó. ROA hợp lệ cũng không chứng minh router origin đang phục vụ HTTP, không đo chiều về và không xác nhận quan hệ transit của các AS trung gian.

### 3.5 Ba trạng thái, một quyết định policy riêng

Với tập VRP đang xét, trước hết tìm **tất cả** VRP có prefix bao phủ route. Không có VRP bao phủ thì **NotFound**. Có ít nhất một VRP vừa khớp origin vừa cho phép độ dài thì **Valid**. Có bao phủ nhưng không cái nào cho phép cả hai điều kiện thì **Invalid**. Đây là trạng thái theo RFC 6811, không phải suy đoán động cơ của người quảng bá.

Điểm dễ sai là dừng ở VRP đầu tiên. Khi có nhiều ROA hoặc quyền chồng lấn, một cái không khớp không đủ làm route Invalid nếu còn cái khác cho phép nó. Cũng không đổi NotFound thành Invalid: chưa có quyền trong tập dữ liệu khác với có quyền bao phủ nhưng route vi phạm quyền ấy. Cả hai đều cần policy vận hành, và xử lý chúng như nhau có thể cắt các mạng chưa triển khai ROA.

| Route theo tập VRP ví dụ | Trạng thái | Nguyên nhân quyết định |
|---|---|---|
| `/23`, origin 65004 | Valid | Đúng ASN, độ dài nằm trong giới hạn |
| `203.0.113.0/24`, origin 65003 | Invalid | Có bao phủ, sai origin |
| `203.0.113.0/24`, origin 65004 | Valid | Prefix con được maxLength 24 cho phép |
| `203.0.113.0/25`, origin 65004 | Invalid | Đúng ASN nhưng vượt maxLength |
| `198.51.100.0/24`, origin 65003 | NotFound | Không VRP nào trong tập ví dụ bao phủ |

Bảng là bài tập trên **tập VRP giả định**, không phải kết quả truy vấn quyền RPKI Internet của các dải địa chỉ tài liệu. Các trạng thái sẽ được tính lại bằng script; không gọi output Python là xác minh chữ ký ROA.

Một policy triển khai thường loại Invalid và xử lý riêng các trạng thái còn lại theo yêu cầu mạng. Trước khi áp dụng, cần có cách quan sát route bị loại, dữ liệu validator và thay đổi ROA. Khi chuyển origin sang AS mới mà chưa cập nhật quyền, route chính chủ vẫn có thể Invalid. Trạng thái phản ánh độ khớp với quyền đã công bố; nó không tự biết kế hoạch chuyển đổi đang nằm trong ticket nội bộ.

Để giảm leak, cần import/export theo vai trò peer và customer prefix, giới hạn số prefix hợp lý, cùng cơ chế kiểm quan hệ khi được hỗ trợ. **BGP Roles/OTC — Only to Customer — là cơ chế biểu diễn vai trò phiên và ràng buộc phạm vi truyền route**, được chuẩn hoá trong [RFC 9234](https://www.rfc-editor.org/rfc/rfc9234). Nó bổ sung đúng lớp câu hỏi mà ROV không trả lời. Lab này chưa cấu hình Roles/OTC, nên không đưa ra kết quả tương thích giữa các implementation hay mức độ triển khai trên Internet.

### 3.6 Facebook 2021: rút route hợp lệ vẫn đủ làm DNS mất đường tới

Sự cố ngày 04/10/2021 không cần một AS bên ngoài chiếm origin. [Báo cáo gốc của Meta](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) giải thích lệnh bảo trì làm backbone mất kết nối giữa các datacenter. Các điểm DNS có cơ chế rút quảng bá BGP khi không nói chuyện được với datacenter; khi backbone mất, chúng cùng coi mạng là không khoẻ và rút quảng bá. DNS server vẫn có thể đang chạy nhưng bên ngoài không tới được địa chỉ của nó.

Chuỗi nhân quả này giúp tránh sửa nhầm tầng: DNS không trả lời → chưa chắc bản ghi bị xoá; kiểm route tới authoritative → có thể thấy prefix đã rút → quay lại cơ chế health và backbone khiến quảng bá bị rút. Bản thân DNS cache không khôi phục được tuyến IP. Cũng không thể đổ mọi nguyên nhân cho “BGP bị hack”: giao thức đã lan trạng thái mà hệ thống vận hành yêu cầu nó lan.

RPKI không tạo route thay cho một prefix đã bị rút. Một ROA vẫn còn đúng chỉ chứng minh ai được phép khởi phát khi có quảng bá, không buộc origin phát ra quảng bá hay giữ backbone hoạt động. Trường hợp này đối chiếu với hijack và leak để tách ba hướng sửa: chặn quảng bá không được phép, ngăn xuất sai phạm vi, hoặc khôi phục chính khả năng phục vụ và điều kiện xuất route.

**Suy luận về debug:** nếu DNS timeout và route mất xảy ra cùng lúc, đừng suy thứ tự nhân quả chỉ từ hai dashboard. Cần log thay đổi backbone, điều kiện health, withdrawal và góc nhìn bên ngoài có mốc thời gian. Ở lab này ta đo lookup và route state; chưa tái tạo sự cố DNS/backbone của Meta.

## 4. Lab

### 4.1 Dựng tiếp từ vòng FRR của net-11

Bộ lab nằm ở `net-lab/net-14/`, gồm `run.sh`, `origin-check.py`, `config/`, `src/`, `out/`. Chạy trong thư mục đó:

```bash
./run.sh | tee out/replay.txt
```

Script chỉ tạo container `net14-r1` tới `net14-r4` và network `net14-l12`, `l23`, `l34`, `l14` cùng tiền tố. Chúng có `--internal`; không có BGP peer tới Internet. Trap dọn container/network khi script kết thúc, kể cả lúc assertion thất bại. Thư mục config và log còn nguyên để đối chiếu. Đừng chạy `docker system prune` vì có thể có lab khác trên cùng máy.

Kế thừa cách bật zebra/bgpd/staticd, kiểm hai path bằng JSON và tách bảng kernel từ net-11. Đổi subnet liên kết sang `10.114.<link>.0/24`; giữ ASN65001–65004. r4 xuất aggregate `/23`. r1 chặn xuất về r2 như bài trước; r4 chỉ xuất aggregate sang r1 để thông báo sai `/24` không quay về trên cạnh trực tiếp. Tình huống này được cố ý thu hẹp để chỉ có một nhánh mang `/24`.

Các lệnh `no bgp ebgp-requires-policy` và `no bgp network import-check` phục vụ thí nghiệm. Lệnh thứ hai cho phép quảng bá prefix dù chưa có mạng dịch vụ gắn thật. Vì vậy lookup trong bài chứng minh **chọn cửa ra**, không chứng minh có web server ở cuối đường hoặc ping end-to-end thành công. Đừng đem cấu hình không yêu cầu policy này làm mẫu router production.

### 4.2 Chạy bản sai: ưu tiên aggregate rồi khởi phát prefix con trái phép

Các lệnh quyết định bên dưới nằm trong script, chạy trước khi trap dọn container:

```bash
docker exec net14-r1 vtysh -c 'configure terminal' \
  -c 'route-map DIRECT permit 10' -c 'set local-preference 250' \
  -c 'router bgp 65001' -c 'address-family ipv4 unicast' \
  -c 'neighbor 10.114.14.4 route-map DIRECT in'
docker exec net14-r1 vtysh -c 'clear bgp 10.114.14.4 soft in'
docker exec net14-r3 vtysh -c 'configure terminal' \
  -c 'router bgp 65003' -c 'address-family ipv4 unicast' \
  -c 'network 203.0.113.0/24'
```

Trong `out/aggregate.txt`, hai dòng quyết định:

```text
  65004
      Origin IGP, metric 0, localpref 250, valid, external, best (Local Pref)
```

Trong `out/hijack.txt`, đường cho prefix cụ thể hơn đi qua r2:

```text
  65002 65003
    10.114.12.2 from 10.114.12.2 (10.255.0.2)
```

`out/lookup-hijack.txt` là đối chứng cho bản sửa sai:

```text
203.0.113.8 via 10.114.12.2 dev eth0 src 10.114.12.1 uid 0
```

Dòng trên bỏ khoảng trắng cuối dòng khi trích; không bỏ thông tin quyết định. **Thấy gì:** aggregate vẫn best ở chính prefix của nó, trong khi IP cần tới đi cửa khác. **Vì sao:** kernel có một route khớp cụ thể hơn. Không cần đặt LOCAL_PREF 500 để đo lại một luật lookup đã thấy trực tiếp; thí nghiệm 250 đủ phân biệt “aggregate ưu tiên cao sẽ thắng mọi prefix con” với mô hình đúng.

Chữ `valid` thông thường trong output FRR ở đây **không phải** trạng thái RPKI Valid. Nó là trạng thái đường đủ điều kiện trong xử lý BGP; lab chưa cấu hình một cache RPKI. Đồng nhất hai chữ này sẽ làm bạn báo “đã bật xác thực” khi chưa có gì đối chiếu quyền origin.

### 4.3 Chặn đúng thứ đang phá lookup, rồi xem phạm vi của bản sửa

Áp allow-list chỉ nhận đúng aggregate trên nhánh r2:

```bash
docker exec net14-r1 vtysh -c 'configure terminal' \
  -c 'ip prefix-list CUSTOMER seq 10 permit 203.0.112.0/23' \
  -c 'router bgp 65001' -c 'address-family ipv4 unicast' \
  -c 'neighbor 10.114.12.2 prefix-list CUSTOMER in'
docker exec net14-r1 vtysh -c 'clear bgp 10.114.12.2 soft in'
```

Không có `le 24`, nên câu permit chỉ nhận đúng `/23`; các prefix không khớp bị từ chối theo prefix-list. Đây là quyền nhận tự cấu hình, không tự động theo ROA. `out/filtered.txt` và `out/lookup-filtered.txt` lần lượt ghi:

```text
% Network not in table
203.0.113.8 via 10.114.14.4 dev eth1 src 10.114.14.1 uid 0
```

**Thấy gì:** `/24` biến mất khỏi bảng BGP r1 và lookup dùng lại aggregate. **Vì sao:** không còn route cụ thể hơn đủ điều kiện. Kết luận có giới hạn: allow-list này sửa trường hợp được dựng. Nó chưa phân biệt đúng/sai origin cho cùng `/23`, chưa xác thực ROA và chưa biết r2 có quyền xuất đường học từ upstream hay không.

### 4.4 Để leak của aggregate đi qua bản sửa vừa làm

Script tăng LOCAL_PREF cho route nhận từ r2 lên 300, mô hình hoá r1 ưu tiên đường customer. Các quan hệ upstream/customer là giả định đã nêu ở §3.3; không nằm trong gói BGP. Sau thay đổi, trích `out/leak.txt`:

```text
  65002 65003 65004
    10.114.12.2 from 10.114.12.2 (10.255.0.2)
      Origin IGP, localpref 300, valid, external, best (Local Pref)
```

Origin vẫn AS65004. Prefix-list cho đúng `/23` không chặn nó. Lookup `out/lookup-leak.txt` trở lại r2. Bản sửa đã đạt mục tiêu chặn prefix con, nhưng không đạt mục tiêu rộng hơn là chặn leak giữa hai upstream. Muốn làm tiếp, sửa export ở r2 theo quan hệ hoặc import ở r1 theo tập route customer thực sự được phép xuất, rồi đo lại chính đường này.

> **Chưa đo.** Lab không có validator, repository RPKI, phiên RTR chuyển VRP tới router, BGP Roles/OTC, capture gói hay probe HTTP. Nó không chứng minh thời gian hội tụ, tỷ lệ mất request hoặc khả năng một router production từ chối route RPKI Invalid. Đo phần ROV thực thi bằng một cache thử nghiệm có VRP kiểm soát, cấu hình policy loại Invalid, rồi lưu trạng thái validation, route bị loại và lookup trước/sau.

### 4.5 Tính origin validation độc lập để không tráo bằng chứng

Chạy `python3 origin-check.py | tee out/origin-check.txt`. Script nạp đúng một VRP giả định và cài phép kiểm ở §3.5. Nó dùng `any(...)` trên mọi quyền khớp, nhưng tập đầu vào của lần chạy chỉ có một quyền. Trích output thật:

```text
203.0.112.0/23 origin 65004 Valid
203.0.113.0/24 origin 65003 Invalid
203.0.113.0/24 origin 65004 Valid
203.0.113.0/25 origin 65004 Invalid
198.51.100.0/24 origin 65003 NotFound
leak path 65002 65003 65004: Valid
```

> **Đo trên lab.** `out/origin-check.txt` là kết quả chạy bài tập thuật toán trên tập VRP tự đặt. Nó không phải câu trả lời từ validator Internet. Các path FRR và lookup nằm trong những file riêng ở trên; không gộp chúng thành lời khẳng định “FRR đã loại Invalid bằng RPKI”.

Khi viết báo cáo vận hành, hãy giữ sự tách biệt ấy: đường quan sát từ router, quyền từ validator tại thời điểm xác định, policy thực thi và bằng chứng data plane. Một dòng “RPKI xanh” thiếu tập quyền và nơi áp dụng policy không đủ để kết thúc điều tra.

## 5. Tính tay

Các kết quả số học dưới đây được tính lại trong `out/origin-check.txt`; chúng là suy luận từ prefix và tập quyền đã đặt, không phải số người dùng bị ảnh hưởng.

### 5.1 Prefix con chiếm bao nhiêu địa chỉ?

Aggregate `203.0.112.0/23` có bao nhiêu địa chỉ, `/24` sai có bao nhiêu, chiếm phần nào aggregate? Có được nói phần đó bằng tỷ lệ request bị lỗi không?

**Lời giải:** `/23` có `2^(32−23) = 512` địa chỉ; `/24` có `256`. Phần địa chỉ là `256 / 512 = 0,5 = 50%`. Tỷ lệ request không suy ra được: có thể toàn bộ request dịch vụ nhắm một IP nằm trong nửa bị hút, cũng có thể không có request nào tới nửa ấy. Chưa đo phân bố traffic thì không dùng tỷ lệ không gian địa chỉ làm tỷ lệ lỗi.

### 5.2 maxLength mở bao nhiêu quyền prefix?

VRP `/23`, maxLength 24, origin65004 cho phép bao nhiêu prefix khác nhau nếu đếm cả aggregate? Nếu chỉ cho exact `/23` thì sao? `/25` đúng origin bị đánh dấu gì?

**Lời giải:** một `/23` và hai `/24` bên trong: `1 + 2 = 3` prefix. Quyền exact chỉ có một. `/25` vẫn nằm trong khối nhưng quá giới hạn nên Invalid nếu không có VRP khác cho phép nó. Đây là số prefix **được quyền**, không phải ba route đang tồn tại trong BGP. Đừng tạo ROA quá rộng chỉ để giảm số dòng cấu hình rồi quên tập quyền đã tăng.

### 5.3 Quyền chồng nhau: một cái sai khớp không phủ quyết một cái đúng

Có VRP A `203.0.112.0/23`, maxLength23, origin65004; VRP B `203.0.113.0/24`, maxLength24, origin65003. Route `/24` origin65003 được đánh dấu gì? Nếu rút B thì sao? Nếu route không còn được quảng bá mà A/B vẫn còn thì có đường tới đích không?

**Lời giải:** khi còn B, route Valid vì tồn tại quyền cho cả prefix, độ dài và origin; A không cho phép nhưng không phủ quyết B. Rút B khỏi tập quyền được router sử dụng khiến nó Invalid theo A còn bao phủ, sau khi dữ liệu đã cập nhật. Nếu không có route, ROA không tạo ra route: vẫn phải kiểm bảng định tuyến. Từ thời điểm rút ROA tại repository chưa suy ra được chính xác giây mọi router đổi trạng thái vì còn các bước tải, kiểm và chuyển dữ liệu.

## 6. Chuyển giao

1. Một collector thấy thêm origin, còn router biên của bạn chưa nhận đường đó. Bạn cần ghi những thời điểm, góc nhìn và prefix nào trước khi nói dịch vụ của mình bị hijack?
2. Một mạng dự phòng bắt đầu quảng bá đúng prefix nhưng bị Invalid sau khi đổi ASN. Bạn kiểm quyền đã công bố và dữ liệu cache thế nào trước khi yêu cầu mọi upstream tắt ROV?
3. ROA cho đúng `/24`, route cũng đúng origin, nhưng một mạng trung gian bất ngờ hút traffic. Những bằng chứng nào phân biệt leak giữ origin, path bị giả và chuyển tuyến hợp lệ?
4. Đội DNS đổi bản ghi sau một sự cố mà authoritative IP không còn route từ nhiều mạng. Thử nghiệm nào giúp xác định tầng cần sửa trước khi chờ TTL?
5. Sau khi lọc Invalid, vài mạng vẫn đi tới origin sai. Bạn kiểm phạm vi triển khai, NotFound, maxLength và nguồn quan sát ra sao mà không gán mọi lỗi cho validator?
6. Thiết kế một lần chuyển origin có hai upstream, ROA chồng lấn, validator tạm mất đồng bộ và một customer xuất leak aggregate. Hãy chọn trình tự thay đổi, điều kiện rollback và bằng chứng đủ để vừa không cắt đường hợp lệ vừa nhận ra leak còn Valid. Đây là câu khó nhất, không có đáp án trong bài.

## 7. Tóm tắt

- Một `/24` đã cài có thể hút phần địa chỉ nằm trong `/23` dù aggregate có LOCAL_PREF 250; lab ghi riêng BGP và lookup kernel.
- Hijack hỏi quyền khởi phát; leak hỏi phạm vi truyền theo policy và quan hệ mạng.
- ROV đối chiếu prefix, độ dài và origin với tập VRP; Valid không xác thực toàn bộ AS_PATH.
- NotFound nghĩa không có VRP bao phủ trong tập đang dùng; Invalid nghĩa có bao phủ nhưng không quyền nào cho phép route.
- Allow-list trong lab chặn prefix con rồi vẫn cho aggregate leak qua; nó không phải RPKI validator.
- Sự cố Meta năm 2021 có chuỗi backbone mất → điểm DNS rút quảng bá; ROA không khôi phục route đã rút.

→ **Bài 15 — BGP trong cloud**: đi từ quyền và policy giữa các mạng sang nơi route được nhận, ưu tiên và cài vào đường đi của VPC.
