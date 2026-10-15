# Bài 8 — User, group, role

## 1. Mục tiêu

Sau bài này bạn có thể:

- Nhìn một access token Keycloak và chỉ ra **từng role trong đó đến từ đâu**: gán trực tiếp, default roles, composite hay group, kể cả những role bạn chưa từng gán.
- Chọn giữa **realm role** và **client role** cho một quyền cụ thể, và nói được lựa chọn đó đổi `realm_access`, `resource_access` và `aud` của token ra sao.
- Tính tay tập role hiệu lực của một user nằm sâu trong cây group có composite role, và đặt từng tên vào đúng claim.
- Ước lượng token tăng bao nhiêu byte mỗi role bằng công thức, rồi tìm số role làm token vượt một giới hạn header cho trước.
- Giải thích vì sao **Full Scope Allowed** đang bật trên mọi client mới, nó làm token phình thế nào, và đọc được dòng WARN nó sinh ra trong log 26.8.1.
- Bác bỏ bằng con số đề xuất "đưa toàn bộ permission vào token để API khỏi gọi DB".

---

## 2. Triệu chứng

Bạn dựng realm `demo` cho một SaaS B2B, tạo user `alice`, tạo **một** realm role tên `reader` và gán đúng role đó cho cô ấy. Không gán gì khác. Alice còn được xếp vào group `engineering`, group này chưa có role nào.

Bạn đăng nhập alice qua client `spa` (authorization code + PKCE, bài 3), decode access token và thấy:

```json
"aud":"account", "azp":"spa",
"realm_access":{"roles":["reader","offline_access","default-roles-demo","uma_authorization"]},
"resource_access":{"account":{"roles":["manage-account","manage-account-links","view-profile"]}}
```

Bảy tên role, trong khi bạn gán một. `aud` là `account`, một client bạn chưa từng đụng tới. Không có dấu vết gì của group `engineering`. Token dài 1.381 byte. Còn log server thì cứ mỗi lần cấp token lại in một dòng WARN, sau một buổi chiều đo đã có 377 dòng.

Đồng nghiệp xem token và đề xuất: "Token đã mang role sẵn rồi. Mình chuyển hết permission trong DB sang role Keycloak, API đọc `resource_access` là xong, khỏi query bảng permission nữa."

> **Đo trên lab.** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4. Token của alice qua client `spa` dài 1.381 byte, payload JSON 694 byte, chữ ký 342 ký tự base64url. Đếm dòng WARN `full-scope-allowed` trong `kc.log`: 377 (api-client 213, test-direct 152, spa 10, spa-nopkce 2). Đo lại: `jq -r .access_token tok_pkce.json | tr -d '\n' | wc -c` và `grep -c full-scope-allowed kc.log`.

---

## ⏸ Dừng lại — đoán trước #1

Alice chỉ được gán `reader`. Vì sao token có thêm sáu tên?

```
(a) Keycloak luôn nhét một bộ role hệ thống cố định vào mọi token, không tắt được
(b) Lúc tạo user, Keycloak gán một role tổng hợp; token trải phẳng role đó ra
(c) Group engineering mang role, alice kế thừa từ group
(d) Client spa là public client nên được cấp thêm role mặc định của client
```

---

## 3. Lý thuyết

### 3.1 Role mapping và hai namespace

Đáp án là **(b)**. Để thấy vì sao, cần ba khái niệm theo đúng thứ tự.

**Role mapping** là việc gắn một role vào một user hoặc một group; Keycloak lưu mapping, không lưu "quyền". RBAC như một mô hình phân quyền thì bạn đã học ở `security/sec-05-authn-authz.md`, bài này chỉ nói Keycloak cất role ở đâu và đưa role vào token thế nào.

Keycloak có hai chỗ để định nghĩa role:

- **Realm role**: role sống ở cấp realm, một tên duy nhất trong cả realm. `reader` là realm role.
- **Client role**: role thuộc về một client cụ thể. `manage-account` là client role của client `account`.

Docs nói gọn: *"There is a global namespace for roles and each client also has its own dedicated namespace where roles can be defined."* Và: *"Client roles are namespaces dedicated to clients. Each client gets its own namespace."*

Vì sao phải có hai loại, thay vì chỉ một danh sách role chung? Nguyên nhân gốc là **một realm phục vụ nhiều app, và tên role không mang nghĩa ngoài app của nó**. App billing có `admin` nghĩa là được hoàn tiền; app helpdesk có `admin` nghĩa là được xoá ticket. Nếu chỉ có một namespace, hai team phải tranh nhau tên (`billing-admin`, `helpdesk-admin`), tức là tự nhét tên app vào tên role bằng tay. Client role làm đúng việc đó nhưng ở cấu trúc dữ liệu: role `admin` của client `billing-api` và role `admin` của client `helpdesk-ui` là hai bản ghi khác nhau, cùng tên.

Từ nguyên nhân đó suy ra hai hệ quả mà bạn sẽ đụng hằng ngày:

1. **Claim tách đôi.** Realm role vào `realm_access.roles`, một mảng phẳng. Client role vào `resource_access.<clientId>.roles`, tức là key của object chính là tên client. API đọc quyền của chính nó tại `resource_access.<clientId của mình>`, không phải ở mảng chung.
2. **Client role mang thông tin "quyền này dành cho app nào"**, thứ realm role không có. Keycloak dùng chính thông tin đó để tính `aud`. Mapper Audience Resolve, nằm sẵn trong client scope mặc định `roles`, làm việc này: *"The mapper checks for clients that have at least one client role available for the current token."* Alice có client role của `account`, nên `aud` là `account`. Đó là toàn bộ lời giải cho chữ `account` trong triệu chứng.

Vì hệ quả thứ hai, "realm hay client role" không chỉ là chuyện đặt tên. Quyền chỉ một API hiểu thì đặt làm client role của client đại diện cho API đó: vừa đúng namespace, vừa đưa API vào `aud` mà API phải kiểm khi validate (bài 4). Realm role hợp với thuộc tính đúng ở mọi app, kiểu `employee`. Chỗ hay sai: tưởng `aud` là client nhận token; client đó nằm ở `azp` (`spa`). Audience mapper để bài 9.

Một biên nữa từ 26.8.0: client bị disable thì role của nó cũng biến khỏi token, *"A disabled or removed client is never added to the aud claim of a token, and its client roles are not present in the resource_access claim."* Disable một client vì nghi lộ secret cũng đồng thời tước quyền của mọi API đang đọc `resource_access.<client đó>`.

> **Nguồn.** Namespace: Server Admin Guide, *"There is a global namespace for roles and each client also has its own dedicated namespace where roles can be defined."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)); client role ([con-client-roles](https://www.keycloak.org/docs/latest/server_admin/index.html#con-client-roles_server_administration_guide)). Audience Resolve ([_audience_resolve](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience_resolve)). Client disable từ 26.8.0 ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html#disabled-clients-are-no-longer-added-to-the-token-audience)).

### 3.2 Composite role và default roles

**Composite role** là một role chứa các role khác; gán composite cho user là user có luôn mọi role con. Docs: *"This inheritance is recursive so users also inherit any composite of composites."* Và quan trọng cho token: *"When creating tokens and SAML assertions, any composite also has its associated roles added to the claims and assertions of the authentication response sent back to the client."*

Câu thứ hai là cơ chế phình token đầu tiên: **token chứa tập role đã trải phẳng, không phải tập bạn gán**. Gán một composite có 30 con thì token có 31 tên (token lab giữ cả tên `default-roles-demo` trong mảng). Đếm role trên màn hình user không cho biết token dài bao nhiêu.

**Default roles** giải bài toán: user mới sinh ra phải có sẵn một bộ quyền tối thiểu, dù tạo tay, tự đăng ký hay đi vào qua Google. Docs: *"Use default roles to automatically assign user role mappings when a user is created or imported through Identity Brokering."*

Cơ chế không phải "copy danh sách role vào user lúc tạo". Khi tạo realm, Keycloak tạo một **composite role** tên `default-roles-<tên realm viết thường>` và gán composite đó cho mỗi user mới:

```java
// RealmManager.java, tag 26.8.1, dòng 139
KeycloakModelUtils.setupDefaultRole(realm, Constants.DEFAULT_ROLES_ROLE_PREFIX + "-" + name.toLowerCase());
// Constants.java dòng 52: DEFAULT_ROLES_ROLE_PREFIX = "default-roles"
```

Realm `demo` vì thế có `default-roles-demo`. Trong lab, composite này gồm realm role `offline_access`, `uma_authorization` và client role của `account`: `manage-account`, `manage-account-links`, `view-profile`. Đối chiếu với triệu chứng: đó chính là sáu tên thừa.

Còn một tầng composite nữa ẩn trong đó. Source khai báo role mặc định của client `account` chỉ có hai: `String[] DEFAULT = {VIEW_PROFILE, MANAGE_ACCOUNT};`. Token lại có ba. Tên thứ ba đến từ chính `manage-account`: nó cũng là composite, chứa `manage-account-links`. Token alice là ví dụ "composite of composites" hai tầng: `default-roles-demo` -> `manage-account` -> `manage-account-links`.

> **Đo trên lab (critic, 26.8.1).** `kc get clients/<account-id>/roles/manage-account -r demo` trả `"composite":true`; `.../roles/manage-account/composites` trả đúng một tên `["manage-account-links"]`.

Hệ quả vận hành của việc default roles là một composite:

Docs chỉ nói default roles áp "when a user is created or imported", nghe như chỉ chạm user mới. Nhưng mỗi user mang mapping tới composite `default-roles-demo`, và composite trải phẳng lúc **cấp token**, nên thêm một role con vào nó sẽ tới **mọi user cũ** ở token kế tiếp. Một thao tác trong tab Default roles là đổi quyền toàn realm.

> **Đo trên lab (critic, 26.8.1).** Alice tạo từ trước. `kc create roles -r demo -s name=beta-tester`, rồi `kc add-roles -r demo --rname default-roles-demo --rolename beta-tester`. Token kế tiếp của alice: `realm_access.roles` có thêm `beta-tester`, token dài thêm 18 byte (1.465 lên 1.483).

> **Nguồn.** Composite đệ quy và đưa vào claim ([_composite-roles](https://www.keycloak.org/docs/latest/server_admin/index.html#_composite-roles)). Default roles ([_default_roles](https://www.keycloak.org/docs/latest/server_admin/index.html#_default_roles)). Tên `default-roles-<realm>`: [RealmManager.java#L139](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/RealmManager.java#L139), [Constants.java#L52](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/Constants.java#L52). Default của `account`: [AccountRoles.java#L36](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/AccountRoles.java#L36); thêm vào default roles khi tạo realm: [RealmManager.java#L494](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/managers/RealmManager.java#L494).

### 3.3 Group: kế thừa xuống, không có nhánh trừ

**Group** là tập user dùng chung role mapping và attribute; gán role cho group là mọi thành viên có role đó. Group lồng nhau thành cây: *"A group can have multiple subgroups but a group can have only one parent."* Và chiều kế thừa: *"Subgroups inherit the attributes and role mappings from their parent."*

Ghép hai câu: user ở group lá `/staff/support/leads` có role của `leads`, của `support` và của `staff`. Role của user là **hợp** của bốn nguồn: mapping trực tiếp, mapping của mọi group mình thuộc cùng toàn bộ tổ tiên của các group đó, default roles, rồi tất cả trải phẳng composite.

Hai chỗ hay sai về group:

- **Group không tự hiện ra trong token.** Lab: alice thuộc `engineering` nhưng token không có claim `groups`, vì realm mới không có mapper groups mặc định. Group chỉ ảnh hưởng token **gián tiếp**, qua role nó mang. Muốn có tên group trong token thì cần mapper (bài 9).
- **Kế thừa chỉ cộng, không trừ.** Hai câu docs trên chỉ mô tả chiều cha cho con. Không có câu nào về việc group con "chặn" một role của cha. Cây group vì thế phải thiết kế sao cho quyền rộng nằm ở lá, quyền hẹp nằm ở gốc, ngược trực giác "tổ chức to ở trên".

<svg viewBox="0 0 800 330" role="img" aria-labelledby="kc8-a-t kc8-a-d" style="width:100%;height:auto">
<title id="kc8-a-t">Từ role mapping tới claim trong access token</title>
<desc id="kc8-a-d">Ba nguồn role mapping của user (gán trực tiếp, default roles, group) được trải phẳng composite đệ quy, lọc theo client bằng Full Scope Allowed, rồi chia vào realm_access, resource_access và sinh ra aud qua Audience Resolve; số đếm lấy từ token lab của alice.</desc>
<defs>
<marker id="kc8-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/>
</marker>
</defs>
<rect x="20" y="30" width="210" height="56" rx="8" fill="#3b82f6" fill-opacity="0.2"/>
<text x="125" y="53" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">1. Gán trực tiếp</text>
<text x="125" y="72" text-anchor="middle" font-size="11" fill="currentColor">reader</text>
<rect x="20" y="110" width="210" height="72" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="125" y="132" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">2. Default roles</text>
<text x="125" y="151" text-anchor="middle" font-size="11" fill="currentColor">default-roles-demo</text>
<text x="125" y="169" text-anchor="middle" font-size="11" fill="currentColor">(composite, mọi user mới)</text>
<rect x="20" y="206" width="210" height="72" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="125" y="228" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">3. Group và mọi tổ tiên</text>
<text x="125" y="247" text-anchor="middle" font-size="11" fill="currentColor">engineering: chưa gán role</text>
<text x="125" y="265" text-anchor="middle" font-size="11" fill="currentColor">con kế thừa role của cha</text>
<rect x="280" y="110" width="175" height="96" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="367" y="133" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Trải phẳng composite</text>
<text x="367" y="152" text-anchor="middle" font-size="11" fill="currentColor">đệ quy, giữ cả tên cha</text>
<text x="367" y="171" text-anchor="middle" font-size="11" fill="currentColor">manage-account</text>
<text x="367" y="189" text-anchor="middle" font-size="11" fill="currentColor">-> manage-account-links</text>
<rect x="500" y="110" width="130" height="96" rx="8" fill="#ef4444" fill-opacity="0.2"/>
<text x="565" y="133" text-anchor="middle" font-size="11" fill="currentColor" font-weight="bold">Lọc theo client</text>
<text x="565" y="152" text-anchor="middle" font-size="11" fill="currentColor">Full Scope</text>
<text x="565" y="171" text-anchor="middle" font-size="11" fill="currentColor">Allowed = ON</text>
<text x="565" y="189" text-anchor="middle" font-size="11" fill="currentColor">giữ tất cả</text>
<rect x="665" y="30" width="125" height="72" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="727" y="53" text-anchor="middle" font-size="11" fill="currentColor">realm_access</text>
<text x="727" y="72" text-anchor="middle" font-size="11" fill="currentColor">4 tên, có cả</text>
<text x="727" y="90" text-anchor="middle" font-size="11" fill="currentColor">tên composite</text>
<rect x="665" y="122" width="125" height="72" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="727" y="145" text-anchor="middle" font-size="11" fill="currentColor">resource_access</text>
<text x="727" y="164" text-anchor="middle" font-size="11" fill="currentColor">.account</text>
<text x="727" y="182" text-anchor="middle" font-size="11" fill="currentColor">3 tên</text>
<rect x="665" y="214" width="125" height="64" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="727" y="238" text-anchor="middle" font-size="11" fill="currentColor">aud = account</text>
<text x="727" y="257" text-anchor="middle" font-size="11" fill="currentColor">Audience Resolve</text>
<line x1="230" y1="58" x2="278" y2="140" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="230" y1="146" x2="278" y2="158" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="230" y1="242" x2="278" y2="178" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="455" y1="158" x2="498" y2="158" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="630" y1="140" x2="663" y2="70" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="630" y1="158" x2="663" y2="158" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc8-a-arrow)"/>
<line x1="727" y1="194" x2="727" y2="212" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#kc8-a-arrow)"/>
<text x="400" y="312" text-anchor="middle" font-size="11" fill="currentColor">Số đếm lấy từ token lab: user alice, client spa, Keycloak 26.8.1. Mũi tên đứt: client role sinh ra aud.</text>
</svg>

> **Nguồn.** Group một cha, nhiều con; subgroup kế thừa ([proc-managing-groups](https://www.keycloak.org/docs/latest/server_admin/index.html#proc-managing-groups_server_administration_guide)).

---

## ⏸ Dừng lại — đoán trước #2

Bạn tạo client `orders-api` (chỉ nhận token, không login) và một client role `orders.read` của nó, gán cho alice. Alice vẫn đăng nhập qua `spa`, client chưa từng được cấu hình gì về `orders-api`. Token mới:

```
(a) Không đổi: spa không liên quan tới orders-api nên role đó bị lọc
(b) Có resource_access.orders-api, aud vẫn chỉ là "account"
(c) Có resource_access.orders-api, và aud thành ["orders-api","account"]
(d) Có role, nhưng nằm trong realm_access vì spa không có client role
```

---

### 3.4 Full Scope Allowed: vì sao token của spa chứa quyền của mọi app

Đáp án là **(c)**, đã đo (hộp dưới). Lý do là một switch trên client mà gần như không ai bật, vì nó đã bật sẵn.

**Full Scope Allowed** là switch quyết định client có được nhận **mọi** role của user hay chỉ những role được khai báo trong role scope mapping của nó. Docs nói mặc định: *"By default, each client gets all the role mappings of the user."* Upgrading guide 26.8.0 nói rõ hơn: *"When Full Scope Allowed is enabled (which is the default for new clients), every access token issued for that client contains all roles the authenticated user holds across all clients and the realm."*

Ghép với ba mục trước, đây là chuỗi nhân quả đầy đủ cho token của alice:

1. Alice có mapping `reader` và `default-roles-demo` (3.2), cộng role của group nếu có (3.3).
2. Keycloak trải phẳng composite: 7 tên.
3. Client `spa` bật Full Scope Allowed (lab: `"fullScopeAllowed":true` cho client tạo bằng API không set gì), nên **không lọc** tên nào.
4. Có client role của `account` lọt qua, Audience Resolve đưa `account` vào `aud`.

Thêm `orders.read` là thêm vào bước 1, và bước 3 không chặn: token của SPA giờ mang quyền đọc đơn hàng và có `orders-api` trong `aud`. Token cấp cho **bất kỳ client nào** alice đăng nhập cũng mang đủ quyền của mọi app khác. Bị lộ token của app ít quan trọng nhất là lộ quyền của app quan trọng nhất, trong 300 giây sống của token.

> **Đo trên lab (critic, 26.8.1).** Chạy các lệnh ở 4.5, lấy lại token alice qua `spa` (không đổi cấu hình `spa`): `"aud":["orders-api","account"]`, `"resource_access":{"orders-api":{"roles":["orders.read"]},"account":{...}}`. Token từ 1.373 lên 1.445 byte.

Keycloak đang rút switch này lại. Từ 26.8.0: *"The Full Scope Allowed switch on OIDC clients is deprecated and will be removed in a future release."* và *"Starting with this release, Keycloak logs a WARN-level message at token-issuance time for every client that still has Full Scope Allowed enabled."* Đó là 377 dòng trong triệu chứng: không phải một dòng mỗi client khi khởi động, mà **một dòng mỗi lần cấp token**. Ở 10 lần login/giây, đó là 10 dòng WARN/giây nhân với số giây bạn chưa sửa.

Chỗ hay sai: tưởng deprecated nghĩa là đã tắt. Docs không nói switch đã bị gỡ; nó vẫn bật mặc định cho client mới ở 26.8.1. Cách tắt và khai role scope mapping cho từng client là việc của bài 9.

> **Nguồn.** Mặc định nhận mọi role ([_role_scope_mappings](https://www.keycloak.org/docs/latest/server_admin/index.html#_role_scope_mappings)). Deprecated, bật cho client mới, WARN mỗi lần cấp token ([migrating-to-26-8-0](https://www.keycloak.org/docs/latest/upgrading/index.html#migrating-to-26-8-0)).

### 3.5 Bản sai: "đưa hết permission vào token"

Đề xuất của đồng nghiệp chạy ngon trong demo: `reader` đi vào token, API kiểm `realm_access.roles` sau khi verify chữ ký offline (~124–134 µs mỗi token trên lab, Python thuần), không chạm DB. Cho tới khi số permission lớn lên.

Đo trước phần role chiếm bao nhiêu trong token thật. Bỏ hai claim `realm_access` và `resource_access` khỏi payload lab rồi encode lại: token còn 1.126 byte. Bảy tên role chiếm 255 byte, tức 18,5% token.

Mỗi role thêm vào tốn bao nhiêu? Trong JSON compact, thêm một tên dài L ký tự vào mảng là thêm `,"<tên>"`, tức L + 3 byte. Payload bị base64url, mỗi 3 byte thành 4 ký tự, nên token tăng khoảng (L + 3) × 4/3 ký tự. Với tên kiểu `invoice.read`, `subscription.update` (trung bình ~14 ký tự): (14 + 3) × 4/3 = 22,7 byte mỗi role.

## ⏸ Dừng lại — đoán trước #3

SaaS của bạn có 75 loại tài nguyên, mỗi loại 4 hành động (read/create/update/delete): 300 permission, đặt làm client role của `app-api`. User admin có đủ 300. Access token của admin dài khoảng bao nhiêu?

```
(a) ~1,7 KB: tên role ngắn, không đáng kể
(b) ~4 KB
(c) ~8 KB
(d) ~30 KB
```

---

Đáp án là **(c)**. Tính bằng python trên chính token lab, thêm 300 tên vào `resource_access.app-api` và thêm `app-api` vào `aud` như Audience Resolve sẽ làm, rồi encode lại:

| Số role thêm | Token (byte) | Tăng so với 1.381 | Byte mỗi role |
|---|---|---|---|
| 1 | 1.446 | 65 | 65 (gồm vỏ `"app-api":{"roles":[...]}` và `aud`) |
| 40 | 2.306 | 925 | 23,1 |
| 100 | 3.695 | 2.314 | 23,1 |
| 200 | 6.039 | 4.658 | 23,3 |
| 300 | 8.362 | 6.981 | 23,3 |
| 400 | 10.706 | 9.325 | 23,3 |

Con số mô phỏng (23,3) khớp công thức (22,7) vì tên trong mô phỏng dài trung bình 14,3–14,4 ký tự: (14,4 + 3) × 4/3 = 23,2. Token thật khớp công thức tới từng byte: thêm `support-lead` (12 ký tự) qua group làm token tăng đúng (12 + 3) × 4/3 = 20 byte (mục 4.5).

> **Suy luận.** Đây là **ước lượng**, không phải token Keycloak phát ra: lấy payload thật của lab, thêm tên role giả định, encode base64url lại, giữ nguyên header 111 ký tự và chữ ký 342 ký tự. Bỏ qua mọi claim khác có thể thay đổi. Kiểm bằng: tạo 300 client role thật bằng `kcadm`, gán cho một user, đo `wc -c` token.

Token 8 KB rồi thì sao? Nó đi trong header `Authorization: Bearer <token>` của **mọi** request. Tới đây đề xuất gãy theo ba cách, xếp theo thứ tự bạn sẽ gặp:

**Gãy 1: header vượt giới hạn của proxy.** Load balancer và reverse proxy đặt trần cho kích thước header. Keycloak tự gặp chuyện này với chính token admin của nó. Composite `admin` của master realm chứa role quản trị cho mọi realm: *"For example, with 100 realms, the admin composite contains over 2,000 role mappings (approximately 21 roles per realm)."* Và hậu quả: *"With hundreds of realms, the token can exceed HTTP header size limits enforced by load balancers or reverse proxies."* Cách Keycloak tự chữa không phải tăng giới hạn proxy mà là bỏ role khỏi token: *"The security-admin-console and admin-cli clients use lightweight access tokens by default since Keycloak 26."*

> **Chưa đo.** Không file nguồn nào của course cho con số giới hạn header của một proxy cụ thể, và lab không dựng proxy. Mọi ngưỡng ở mục 5 (4 KB, 8 KB, 16 KB) là **giá trị giả định** để tính. Đo bằng: đọc cấu hình giới hạn header của proxy/ingress bạn thật sự dùng, rồi gửi một request có header `Authorization` dài dần tới khi bị từ chối, ghi lại status code.

**Gãy 2: quyền trong token cũ đi tới 300 giây.** Thu hồi permission trong DB có hiệu lực ở request kế tiếp. Thu hồi role trong Keycloak thì API verify offline vẫn thấy role cũ trong token cho tới `exp`. Lab đo hiện tượng cùng gốc: sau logout, introspect trả `active:false` nhưng token vẫn hợp lệ chữ ký và còn 300 giây tới `exp`, resource server kiểm offline vẫn nhận. Rút ngắn access token thì số lần refresh tăng tỉ lệ nghịch, mỗi lần kéo về 8 KB.

**Gãy 3: quyền của mọi app đi trong token của mọi client.** Với Full Scope Allowed mặc định (3.4), 300 role của `app-api` đi cả vào token của SPA, của app mobile, của service batch. Token phình ở **mọi** client, không chỉ ở client cần quyền đó.

Ba cách gãy chung một gốc: token là **bản chụp quyền lúc cấp, gửi kèm mọi request**. Nó hợp với vai trò ít và đổi chậm (`employee`, `support-agent`), không hợp với ma trận permission. Ma trận đó thuộc về DB của app (BOLA/BFLA đã ở sec-05) hoặc Authorization Services (bài 21).

> **Nguồn.** Admin multi-realm và giới hạn header; lightweight token mặc định cho admin console ([multi-realm-administration-considerations](https://www.keycloak.org/docs/latest/server_admin/#multi-realm-administration-considerations)).

---

## 4. Lab

Realm `demo` từ lab bài 6–7, Keycloak 26.8.1 `start-dev`. `kc` là wrapper `kcadm.sh "$@" --config ~/projects/keycloak-lab/lab1/kcadm.config`.

### 4.1 Tạo role, gán, xếp group

```bash
kc create roles -r demo -s name=reader -s description="read access" -i
kc create groups -r demo -s name=engineering -i
kc add-roles -r demo --uusername alice --rolename reader
kc update users/<alice-id>/groups/<group-id> -r demo -s realm=demo -s userId=<alice-id> -s groupId=<group-id> -n
kc add-roles -r demo --uusername service-account-api-client --rolename reader
```

Không lệnh nào nhắc tới `default-roles-demo`: composite đó đã được gán lúc **tạo user**.

### 4.2 Đọc default role của realm

```bash
kc get realms/demo | jq .defaultRole
```
```json
{"id":"3dfb38a5-...","name":"default-roles-demo","description":"${role_default-roles}",
 "composite":true,"clientRole":false,"containerId":"bb8aceae-..."}
```

`composite: true`, `clientRole: false`: default roles là một **realm role composite**, không phải danh sách đặc biệt. Bên trong (lab): `offline_access`, `uma_authorization`, và client role `account`: `manage-account`, `manage-account-links`, `view-profile`.

### 4.3 Decode token và đặt từng role về nguồn của nó

Lấy token qua `pkce.sh` (bài 3), decode bằng `jwt.py` của lab: ba claim đúng như đoạn trích ở mục 2. Đặt từng tên về nguồn:

| Tên trong token | Claim | Đến từ |
|---|---|---|
| `reader` | `realm_access` | gán trực tiếp (4.1) |
| `default-roles-demo` | `realm_access` | gán khi tạo user, tên composite cũng được giữ |
| `offline_access`, `uma_authorization` | `realm_access` | con của `default-roles-demo` |
| `manage-account`, `view-profile` | `resource_access.account` | con của `default-roles-demo` |
| `manage-account-links` | `resource_access.account` | con của composite `manage-account` (3.2) |
| `account` | `aud` | Audience Resolve, vì có client role của `account` |

Không có claim `groups`, dù alice thuộc `engineering`: group chưa mang role và realm không có mapper groups.

Token client credentials của `api-client` (service account) cũng có đúng bảy tên đó, gồm cả `manage-account`. Service account là một user (`service-account-api-client`), nên nó cũng nhận default roles khi được tạo.

> **Đo trên lab.** Token `spa` 1.381 byte; bỏ `realm_access` và `resource_access` rồi encode lại: 1.126 byte, tức role chiếm 255 byte (18,5%). Token client credentials `api-client` 1.255 byte, cùng `realm_access`/`resource_access` như token alice. Đo lại: `python3 jwt.py "$(jq -r .access_token tok_pkce.json)" | jq '.payload | {aud,azp,realm_access,resource_access}'`.

### 4.4 Đọc dòng WARN

```
WARN [org.keycloak.protocol.oidc.endpoints.TokenEndpoint.full-scope-allowed] Client 'spa' in the realm 'demo' has 'Full scope allowed'
switch enabled. This client switch is deprecated and will be removed in the future. Please update your client settings to disable
the switch and configure needed roles, which this client application needs, to the client role scope
```

Tên client và realm nằm ngay trong dòng. `api-client` chiếm 213 trên 377 dòng vì nó chạy ~210 lượt client credentials trong benchmark: một dòng mỗi lần cấp token. Lọc log theo `Client '...'` là ra danh sách client cần khai role scope ở bài 9.

### 4.5 Client role, composite, group mang role

Chạy trên một instance 26.8.1 `start-dev` riêng (critic), dựng lại realm `demo`, `spa`, alice, `reader`, `engineering` như 4.1. Token gốc của alice ở instance này dài 1.373 byte (khác 1.381 của lab chính vì thông tin user khác nhau).

```bash
kc create clients -r demo -s clientId=orders-api -s standardFlowEnabled=false -i
kc create clients/<orders-api-id>/roles -r demo -s name=orders.read
kc add-roles -r demo --uusername alice --cclientid orders-api --rolename orders.read
kc create roles -r demo -s name=support-lead
kc add-roles -r demo --rname support-lead --rolename reader       # support-lead thành composite
kc add-roles -r demo --gname engineering --rolename support-lead  # group mang role
```

Lấy lại token alice qua `spa` sau ba lệnh đầu, rồi sau ba lệnh cuối:

| Sau | `aud` | Tên mới | Token (byte) |
|---|---|---|---|
| gốc | chuỗi `account` | | 1.373 |
| client role `orders.read` | mảng `orders-api`, `account` | `resource_access.orders-api` | 1.445 (+72) |
| group mang `support-lead` | không đổi | `support-lead` trong `realm_access` | 1.465 (+20) |

Ba điều đọc ra. Lần đầu thêm client role của một client mới tốn 72 byte, không phải 20: payload JSON thêm 39 byte vỏ `"orders-api":{"roles":["orders.read"]},` và 15 byte vì `aud` từ chuỗi thành mảng, 54 × 4/3 = 72. Group mang role thì role hiện ra, tên group thì không. Và `reader` không xuất hiện hai lần dù alice có nó cả trực tiếp lẫn qua composite `support-lead`: token chứa tập hợp, không phải danh sách mapping.

---

## 5. Tính tay

### 5.1 Tập role hiệu lực trong cây group

Realm `shop`, client `helpdesk-ui` và `billing-api`. Cây group và mapping:

```
/staff                 realm role: employee
/staff/support         client role helpdesk-ui: ticket.read, ticket.reply
/staff/support/leads   realm role composite support-lead
                         = report.view (realm) + refund.approve (client role billing-api)
default-roles-shop     = offline_access, uma_authorization, account: manage-account, view-profile
```

User `linh` mới tạo, chỉ nằm trong `/staff/support/leads`, không có mapping trực tiếp. Client đăng nhập: `helpdesk-ui`, Full Scope Allowed để mặc định.

Tính `realm_access.roles`: kế thừa `employee` từ `/staff`; `support-lead` từ `leads` cùng con realm của nó `report.view`; `default-roles-shop` cùng `offline_access`, `uma_authorization`. Tổng 6 tên.

Tính `resource_access`: `helpdesk-ui` có `ticket.read`, `ticket.reply` (kế thừa từ `/staff/support`); `billing-api` có `refund.approve` (con của composite); `account` có `manage-account`, `manage-account-links` (con của `manage-account`, 3.2), `view-profile`.

Tính `aud`: mọi client có ít nhất một client role trong token, tức `helpdesk-ui`, `billing-api`, `account`.

Kết quả: 12 tên role, 3 audience, trong khi linh không có một mapping trực tiếp nào. Và token cấp cho **giao diện helpdesk** mang quyền duyệt hoàn tiền của `billing-api`.

Bước tiếp: chuyển linh từ `leads` sang `/staff/support` lúc 10:00:00, token cuối cùng cấp lúc 09:58:30, access token 300 giây. `billing-api` verify offline còn thấy `refund.approve` tới 10:03:30, tức 210 giây sau khi bạn đã tước quyền.

### 5.2 Bao nhiêu role thì chạm một giới hạn header cho trước

Giả sử proxy giới hạn một dòng header 8.192 byte (giá trị giả định, xem hộp Chưa đo ở 3.5). Dòng header là `Authorization: Bearer ` (22 ký tự) cộng token. Token gốc khi đã có vỏ `app-api` và `aud` mảng: 1.446 byte với 1 role.

Số role N tối đa: 1.446 + (N − 1) × 23,3 + 22 ≤ 8.192, tức N − 1 ≤ 6.724 / 23,3 = 288,6, N ≈ 289.

Mô phỏng bằng python cho ra role thứ 292 là role đầu tiên làm vượt (token 8.181 byte cộng 22 là 8.203). Chênh 3 role vì tên trong mô phỏng dài dần (`invoice10.read` dài hơn `invoice.read`). Cùng cách tính, giới hạn 4.096 byte bị vượt ở role thứ 116, giới hạn 16.384 byte ở role thứ 630.

Đọc ngược con số: gấp đôi giới hạn header chỉ mua thêm khoảng 340 role. Bài toán của bạn có số permission tăng theo số tính năng; nâng giới hạn proxy là chạy theo nó.

---

## 6. Chuyển giao

Không có đáp án trong bài. Dùng cơ chế ở mục 3 để tự suy.

1. Ba app trong cùng realm đều cần một role tên `admin`, mỗi app một nghĩa. Bạn đặt chúng ở đâu, và nếu đặt nhầm làm realm role thì API của app thứ ba phân biệt `admin` của mình với `admin` của hai app kia bằng cách nào?
2. Service account của `api-client` mang `manage-account` qua default roles (lab). Một token client credentials bị lộ thì kẻ có token làm được gì với client `account`, và bạn sửa ở default roles hay ở chính service account?
3. Bạn thêm role `beta-tester` vào `default-roles-demo` để thử tính năng với user mới. Sáng hôm sau, 100% user cũ thấy tính năng beta. Giải thích bằng cơ chế, và cách gán để chỉ user tạo từ nay về sau có role này.
4. Một team đổi `clientId` của `orders-api` thành `order-service` cho đẹp. Token mới vẫn hợp lệ chữ ký, nhưng API trả 403 cho mọi người. Vì sao, và claim nào đổi?
5. Bạn disable client `billing-api` trong 5 phút để xoay secret. Trong 5 phút đó, các API khác đang đọc `resource_access.billing-api.roles` để quyết định một tính năng thấy gì?
6. **Câu khó nhất.** Một SaaS B2B có 2.000 tenant. Mỗi user có thể là admin ở tenant A, chỉ đọc ở tenant B, không có quyền ở 1.998 tenant còn lại; một user tư vấn có thể thuộc 300 tenant. Đội muốn API quyết định quyền **không gọi DB** và thu hồi quyền có hiệu lực trong **30 giây**. Hai yêu cầu đó có thể cùng đúng với token Keycloak không? Nếu không, bạn bỏ yêu cầu nào, và quyền theo tenant sống ở realm role, client role, group, attribute, hay ngoài Keycloak?

---

## 7. Tóm tắt

- Keycloak có hai namespace role: **realm role** (một namespace toàn realm, vào `realm_access.roles`) và **client role** (mỗi client một namespace, vào `resource_access.<clientId>.roles`). Hai loại tồn tại vì tên role chỉ có nghĩa trong app của nó.
- Client role mang thông tin "quyền của app nào", và Audience Resolve dùng đúng thông tin đó để đưa client vào `aud`. `aud` mặc định `"account"` trong lab là do client role của `account`, không phải do client nhận token.
- **Composite role** trải phẳng đệ quy vào token, giữ cả tên composite. Token chứa tập role đã trải phẳng, không phải tập bạn gán: lab gán 1, token có 7.
- **Default roles** là composite realm role `default-roles-<realm viết thường>`, gán cho user khi tạo hoặc import qua brokering; service account cũng nhận.
- Group lồng nhau mỗi group một cha; subgroup kế thừa role và attribute của cha. Kế thừa chỉ cộng. Group không tự vào token: không có claim `groups` mặc định.
- **Full Scope Allowed** bật mặc định cho client mới ở 26.8.1: token của mọi client mang mọi role của user. Switch deprecated từ 26.8.0 và log một dòng WARN **mỗi lần cấp token** (lab: 377 dòng).
- Role chiếm 255 / 1.381 byte (18,5%) token lab. Mỗi role thêm tốn khoảng (L + 3) × 4/3 byte, ~23 byte với tên 14 ký tự. Ước lượng: 300 permission đưa token lên ~8,4 KB, vượt dòng header 8.192 byte ở role thứ 292.
- Docs cảnh báo token admin với hàng trăm realm vượt giới hạn header của proxy; Keycloak 26 chữa bằng lightweight access token cho admin console và admin-cli, tức bỏ role khỏi token.
- Token là bản chụp quyền lúc cấp: thu hồi role không có hiệu lực với API verify offline cho tới `exp` (mặc định 300 giây). Role trong token hợp với vai trò ít và đổi chậm, không hợp với ma trận permission.

→ **Bài 9 — Client scope và protocol mapper**: tắt Full Scope Allowed, khai role scope cho từng client, và dùng mapper để quyết định chính xác claim nào (kể cả `groups` và `aud`) đi vào token của client nào.
