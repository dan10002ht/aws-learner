# Bài 17 — Organizations và multi-tenancy

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng một realm B2B cho ba kiểu khách (IdP riêng, IdP dùng chung, mật khẩu) bằng Organizations, domain và domain routing qua `kcadm.sh` + Admin REST.
- Đoán trước, với một email bất kỳ, identity-first login ra form mật khẩu hay `303` sang IdP của khách.
- Chỉ ra account nào bị xoá khi gỡ member hoặc xoá org, từ membership type và con đường user vào org.
- Giải thích vì sao realm nâng lên 26.8 có link IdP–org là MANAGED, còn link tạo mới trên 26.8 là UNMANAGED.
- Xin token với `organization`, `organization:<alias>`, `organization:*` và nói trước claim `organization` là mảng hay object.
- Bật SCIM cho realm và đoán đúng mã lỗi khi thiếu `aud` hoặc role.

---

## 2. Triệu chứng

Một SaaS B2B chạy trên realm `saas`. Khách Acme dùng Azure AD, các công ty con của Globex dùng chung một IdP, khách nhỏ dùng mật khẩu. Team bật Organizations, tạo org `acme` với domain `acme.com`, gắn IdP `corp-oidc`, bật Auto redirect. Chiều đó có hai ticket.

Ticket một: `dave@acme.com` gõ email ở trang login thì bị chuyển thẳng sang IdP của Acme, đúng ý. Nhưng `alice@acme.com`, cùng domain, gõ email xong lại thấy **form mật khẩu** của SaaS. Admin kiểm: alice là member của `acme`, domain `acme.com` có routing `corp-oidc`, `autoRedirect: true`, `verified: false`.

Ticket hai: admin gỡ dave khỏi org `acme` để dọn dữ liệu, rồi gỡ erin khỏi org `globex` bằng đúng lệnh đó. Cả hai lệnh trả `204`. Tìm lại trong realm:

```
== go dave (MANAGED) khoi acme
  [HTTP 204]
   user dave trong realm: <khong con>
== go erin (UNMANAGED) khoi globex
  [HTTP 204]
   user erin trong realm: 94a96e5b-4487-4185-9f9c-d1ac8e021c9b
```

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev`, Java 24, Mac mini Apple M4, cổng 6600 / management 7600, ngày 2026-10-15. Realm `corp` đóng vai IdP của khách (broker OIDC như bài 15); `flow.sh` đi luồng trình duyệt bằng `curl`. Output: `~/projects/keycloak-lab/lab-kc17/run10.txt`, `run12.txt`.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao alice thấy form mật khẩu thay vì bị chuyển sang IdP của Acme?

```
(a) Domain acme.com có verified: false; Auto redirect chỉ chạy với domain đã xác minh
(b) alice đã có mật khẩu trong realm saas, nên Keycloak hỏi credential thay vì redirect
(c) alice được admin thêm tay (UNMANAGED); routing chỉ áp dụng cho member MANAGED
(d) Client không xin scope organization nên identity-first không biết user thuộc org nào
```

---

## 3. Lý thuyết

Bài 15 dạy brokering, bài 7 dạy realm là ranh giới cách ly. Bài này ráp hai thứ cho nhiều khách doanh nghiệp: một chỗ đăng nhập, mỗi khách một cách xác thực.

### 3.1 Hai cách cắt tenant

**Realm-per-tenant.** Mỗi khách một realm, có user, role, client, flow, key và cấu hình session riêng. Cái giá nhân theo số khách: mỗi realm có một client `<realm>-realm` trong master, mỗi client mang 21 role quản trị. Lab đo đúng số này: `saas-realm` và `corp-realm` mỗi cái 21 role, composite `admin` của master chứa 64 mapping khi server có 3 realm. App muốn đăng nhập cho khách nào thì phải biết realm (issuer) của khách đó trước.

**Organizations.** Organization là thực thể BÊN TRONG một realm, đại diện cho một khách; member của nó vẫn là user của realm, có thêm liên kết tới org. Một issuer, một bộ client; org nào do email user và cấu hình org quyết định lúc đăng nhập.

Bản sai hay gặp: "organization là realm con", vì admin console cho org tab member, group, IdP riêng. Nhưng docs không mô tả token lifespan, theme hay key riêng cho org; member nằm trong bảng user chung, IdP tạo ở cấp realm rồi mới link vào org. Khách A đòi access token 5 phút, khách B đòi 30 phút: Organizations không đáp ứng.

| Tiêu chí | Organizations | Realm-per-tenant |
|---|---|---|
| Session/token/key khác nhau theo khách | ✗ dùng chung của realm | ✓ |
| Một người thuộc nhiều khách (consultant) | ✓ một account, nhiều org | ✗ mỗi realm một account |
| App phải biết khách trước khi login | ✗ email quyết định | ✓ để chọn issuer |
| Chi phí quản trị theo số khách | một realm | 21 role/realm trong master, cache theo số realm |

Docs không đặt trần số realm, chỉ cảnh báo token admin không lightweight có thể vượt giới hạn header khi có hàng trăm realm; `admin-cli` đã dùng lightweight token (lab: 750 ký tự, không có role). Bài 30 so sánh sâu.

Organizations preview ở Keycloak 25, supported từ 26, và bật theo từng realm: trên lab, `POST /admin/realms/saas/organizations` khi `organizationsEnabled=false` nhận `Resource not found`.

> **Nguồn.** *"It enables multi-tenancy within a realm so that users can have access to protected resources from a realm but with a more restricted and controlled context, that context being the organization to which they belong."* ([_managing_organizations](https://www.keycloak.org/docs/latest/server_admin/#_managing_organizations)). *"An organization member is basically a realm user but with a link to one or more organizations."* ([_managing_members_](https://www.keycloak.org/docs/latest/server_admin/#_managing_members_)). *"Starting with Keycloak 26, the Organizations feature is fully supported."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/#organizations-supported)). *"For example, with 100 realms, the admin composite contains over 2,000 role mappings (approximately 21 roles per realm)."* ([multi-realm-administration-considerations](https://www.keycloak.org/docs/latest/server_admin/#multi-realm-administration-considerations)); cùng mục đó nói về header, lightweight token, cache.

### 3.2 Domain: đoán khách từ email

Ở trang login, thứ duy nhất Keycloak có là chuỗi người dùng gõ. Nó tách phần sau `@`, so với domain của mọi org trong realm, chọn ra **đúng một** org. Muốn ra đúng một thì cần luật phá thế hoà:

1. Một domain không thuộc hai org trong cùng realm. Lab: tạo org thứ hai với `acme.com` nhận `Domain acme.com is already linked to organization Acme in realm saas`.
2. Wildcard phủ domain gốc và mọi cấp subdomain.
3. Cùng số phần thì exact thắng wildcard.

Lab dựng ca chồng lấn: `globex` giữ `*.globex.com`, `globex-labs` giữ `labs.globex.com`; cả hai route về `corp-oidc` nhưng chỉ `globex` bật Auto redirect, nên redirect hay không cho biết org nào thắng:

| Email gõ vào | Kết quả | Org được chọn |
|---|---|---|
| `ghost@globex.com` | `303` sang `corp-oidc` | `globex` (wildcard phủ cả gốc) |
| `ghost@deep.eng.globex.com` | `303` sang `corp-oidc` | `globex` (mọi cấp) |
| `ghost@labs.globex.com` | `200` form mật khẩu | `globex-labs` (exact thắng) |

Chỗ docs và API lệch nhau trên 26.8.1. Docs viết wildcard bằng dấu chấm đứng đầu (`.example.com`) và giới hạn 10 phần. Admin REST của chính bản 26.8.1:

```
== org globex (wildcard .globex.com)
Invalid domain format: .globex.com
== globex *.globex.com
1e5989ac-9c03-4c72-abd6-abb7ae303bbf
== domain a.b.c.d.e.f.g.h.i.j.k.l.com
e529e8ad-d7a1-4b03-be90-bb563c753be6
== domain *.com
Domain must have at least 2 parts (e.g. 'example.com'): com
```

API nhận `*.globex.com`, từ chối `.globex.com`, nhận domain 13 phần; luật chặn wildcard trên TLD trần thì có.

> **Chưa đo.** Admin Console có tự đổi `.example.com` thành `*.example.com` không. Đo bằng: tạo domain qua Console rồi `GET /organizations/{id}`.

Domain là tuỳ chọn (org `initech` không có). Alias bất biến: đổi `acme` thành `acme-inc` nhận `Cannot change the alias`; alias đi vào token và scope, chọn nó như chọn khoá chính. Domain không chặn admin: lab thêm `carol@consult.io` vào `acme` và `frank@gmail.com` vào `globex`, đều `201`.

> **Nguồn.** *"A domain cannot be shared by different organizations within a realm."*, *"Once defined, the alias cannot be changed afterwards."* ([creating-an-organization](https://www.keycloak.org/docs/latest/server_admin/#creating-an-organization)). *".example.com matches user@example.com, user@sub.example.com, and user@deep.sub.example.com."* ([domain-types](https://www.keycloak.org/docs/latest/server_admin/#domain-types)). *"When two domains have the same number of parts, an exact match wins over a wildcard."* ([mapping-email-addresses-to-organizations](https://www.keycloak.org/docs/latest/server_admin/#mapping-email-addresses-to-organizations)). *"A domain cannot have more than 10 parts."* ([validation-rules](https://www.keycloak.org/docs/latest/server_admin/#validation-rules)). Domain tuỳ chọn từ 26.4: [release notes](https://www.keycloak.org/docs/latest/release_notes/#optional-email-domain-for-organizations).

> **Đo trên lab (critic, 26.8.1).** Dựng lại hai org chồng lấn trên cổng 2200: `ghost@x.labs.globex.com` và `ghost@a.b.labs.globex.com` đều `303` sang `corp-oidc` (rơi về `globex`), `ghost@labs.globex.com` vẫn `200` form mật khẩu. Exact chỉ khớp đúng giá trị, không phủ subdomain của nó. Output `~/projects/keycloak-lab/critic-ch4/run-kc17.txt`.

### 3.3 Identity-first login: email trước, credential sau

Muốn route theo email thì phải có email **trước** khi hỏi mật khẩu. Bật Organizations thì browser flow mặc định thành identity-first: trang đầu chỉ có ô username/email. Realm tạo mới trên 26.8.1 có sẵn sub-flow này:

```
{"l":0,"name":"Identity Provider Redirector","req":"ALTERNATIVE"}
{"l":0,"name":"Organization","req":"ALTERNATIVE"}
{"l":2,"name":"Organization Identity-First Login","req":"ALTERNATIVE"}
{"l":0,"name":"forms","req":"ALTERNATIVE"}
```

`Organization` đứng trước `forms` và là ALTERNATIVE: xác thực được qua IdP thì `forms` không chạy (bài 18 mổ requirement). Realm cũ có flow tuỳ biến phải tự thêm sub-flow; bật cờ không sửa hộ.

Có email rồi, `Organization Identity-First Login` hỏi ba câu theo thứ tự dưới đây. Câu cuối là đáp án ⏸ #1.

<svg viewBox="0 0 700 410" role="img" aria-labelledby="kc17-a-t kc17-a-d" style="width:100%;height:auto">
<title id="kc17-a-t">Identity-first login quyết định redirect hay hỏi mật khẩu</title>
<desc id="kc17-a-d">Sau khi user gõ email, Keycloak tìm org khớp domain, kiểm domain có IdP và Auto redirect trên org đang bật, rồi kiểm user đã có credential bậc 1; chỉ khi chưa có credential thì trình duyệt mới bị chuyển 303 sang IdP của khách, kèm ví dụ email từ lab.</desc>
<defs>
<marker id="kc17-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
</defs>
<rect x="60" y="16" width="340" height="40" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="230" y="41" text-anchor="middle" font-size="11" fill="currentColor">Trang 1: chỉ một ô username/email</text>
<line x1="230" y1="56" x2="230" y2="86" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<rect x="60" y="88" width="340" height="50" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="230" y="108" text-anchor="middle" font-size="11" fill="currentColor">Tách domain, chọn đúng một org khớp nhất</text>
<text x="230" y="126" text-anchor="middle" font-size="11" fill="currentColor">(cùng số phần thì exact thắng wildcard)</text>
<line x1="230" y1="138" x2="230" y2="168" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<rect x="60" y="170" width="340" height="50" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="230" y="190" text-anchor="middle" font-size="11" fill="currentColor">Domain có IdP + Auto redirect,</text>
<text x="230" y="208" text-anchor="middle" font-size="11" fill="currentColor">và org đang bật?</text>
<line x1="400" y1="195" x2="468" y2="195" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<text x="434" y="188" text-anchor="middle" font-size="11" fill="currentColor">Không</text>
<rect x="470" y="170" width="215" height="50" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="577" y="190" text-anchor="middle" font-size="11" fill="currentColor">Form mật khẩu</text>
<text x="577" y="208" text-anchor="middle" font-size="11" fill="currentColor">ghost@labs.globex.com</text>
<line x1="230" y1="220" x2="230" y2="258" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<text x="250" y="243" font-size="11" fill="currentColor">Có</text>
<rect x="60" y="260" width="340" height="50" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="230" y="280" text-anchor="middle" font-size="11" fill="currentColor">User đã tồn tại và có credential bậc 1</text>
<text x="230" y="298" text-anchor="middle" font-size="11" fill="currentColor">(mật khẩu, passwordless, kerberos)?</text>
<line x1="400" y1="285" x2="468" y2="285" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<text x="434" y="278" text-anchor="middle" font-size="11" fill="currentColor">Có</text>
<rect x="470" y="260" width="215" height="50" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="577" y="280" text-anchor="middle" font-size="11" fill="currentColor">Form mật khẩu</text>
<text x="577" y="298" text-anchor="middle" font-size="11" fill="currentColor">alice@acme.com</text>
<line x1="230" y1="310" x2="230" y2="346" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc17-a-arrow)"/>
<text x="250" y="333" font-size="11" fill="currentColor">Không</text>
<rect x="60" y="348" width="340" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="230" y="368" text-anchor="middle" font-size="11" fill="currentColor">303 sang IdP của khách (bài 15)</text>
<text x="230" y="386" text-anchor="middle" font-size="11" fill="currentColor">dave@acme.com, ghost@eng.globex.com</text>
</svg>

**Đáp án ⏸ #1 là (b).** alice có mật khẩu trong realm `saas`, nên identity-first hỏi credential của alice thay vì đẩy sang IdP: account đã có cách đăng nhập riêng thì Keycloak không đổi phương thức xác thực sau lưng chủ account. Ba phương án kia bị lab bác. (a): `acme.com` của lab cũng `verified: false`, dave vẫn bị redirect. (c): routing chạy trước khi xét membership; lúc gõ email, dave còn chưa là user. (d): `portal` có xin `scope=openid organization`, alice vẫn ra form mật khẩu; routing dựa trên domain.

Hệ quả: chuyển khách đang dùng mật khẩu sang SSO, bật Auto redirect là chưa đủ. Account cũ còn mật khẩu vẫn vào bằng mật khẩu, kể cả khi nhân viên đã nghỉ và bị khoá ở Azure AD: lỗ hổng offboarding, phải gỡ mật khẩu của các account cũ. Muốn chỉ nhận member của org, bật **Requires user membership** trên `Organization Identity-First Login`.

> **Nguồn.** Identity-first: [authenticating-members](https://www.keycloak.org/docs/latest/server_admin/#authenticating-members_server_administration_guide). *"If a user has first-factor credentials configured (for example, a password), the user is not automatically redirected but asked to authenticate using their credentials."* ([configuring-domain-routing](https://www.keycloak.org/docs/latest/server_admin/#configuring-domain-routing)). Realm cũ: [configuring-existing-authentication-flows](https://www.keycloak.org/docs/latest/server_admin/#configuring-existing-authentication-flows). Requires user membership: [configuring-how-users-authenticate](https://www.keycloak.org/docs/latest/server_admin/#configuring-how-users-authenticate).

### 3.4 IdP và org trên 26.8: nhiều-nhiều, cấu hình nằm trên link

IdP trong Organizations là IdP cấp realm của bài 15, được **link** vào org. Trước 26.8, mỗi IdP chỉ link được một org, nên Globex phải tạo nhiều IdP trỏ cùng một chỗ. Bản 26.8 đổi sang nhiều-nhiều và đặt hai cấu hình lên chính cái link:

- **Auto membership**: user đăng nhập qua IdP này có tự thành member không. Mặc định bật, nhưng phải qua *domain gate*: email user phải khớp một domain của org (org không domain thì bỏ qua gate).
- **Membership type**: user tự vào qua link thành MANAGED hay UNMANAGED. Mặc định UNMANAGED.

Lab link `corp-oidc` vào `acme` và `globex`, đổi `acme` thành MANAGED, rồi thử hai cấu hình bị cấm. Cả hai trả `400`:

```bash
api PUT organizations/$GLOBEX/identity-providers/corp-oidc \
  '{"autoMembership":true,"membershipType":"MANAGED"}' | jq -r .errorMessage
# kết quả: Another organization already has MANAGED membership type for this identity provider
api PUT organizations/$GLOBEX/identity-providers/corp-oidc \
  '{"autoMembership":false,"membershipType":"MANAGED"}' | jq -r .errorMessage
# kết quả: Auto-membership must be enabled when membership type is MANAGED
```

Luật "mỗi IdP tối đa một org MANAGED" có lý do: MANAGED nghĩa là org sở hữu vòng đời account (mục 3.5). Hai org cùng sở hữu một account thì xoá org này là xoá account của org kia.

<svg viewBox="0 0 700 340" role="img" aria-labelledby="kc17-b-t kc17-b-d" style="width:100%;height:auto">
<title id="kc17-b-t">Một IdP cấp realm link vào ba organization</title>
<desc id="kc17-b-d">Trong realm saas, IdP corp-oidc được tạo ở cấp realm và link vào ba org acme, globex, globex-labs; mỗi link có membership type riêng, chỉ link tới acme là MANAGED; mọi member đều nằm trong bảng user chung của realm.</desc>
<rect x="10" y="10" width="680" height="320" rx="10" fill="#64748b" fill-opacity="0.08"/>
<text x="24" y="30" font-size="11" fill="currentColor">realm saas: một issuer, một bảng user, một bộ client</text>
<rect x="30" y="140" width="190" height="56" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="125" y="163" text-anchor="middle" font-size="11" fill="currentColor">IdP corp-oidc</text>
<text x="125" y="181" text-anchor="middle" font-size="11" fill="currentColor">(tạo ở cấp realm, bài 15)</text>
<rect x="400" y="44" width="275" height="72" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="537" y="64" text-anchor="middle" font-size="11" fill="currentColor">org acme | domain acme.com</text>
<text x="537" y="82" text-anchor="middle" font-size="11" fill="currentColor">route corp-oidc, auto redirect bật</text>
<text x="537" y="100" text-anchor="middle" font-size="11" fill="currentColor">alice (U), carol (U), dave (M)</text>
<rect x="400" y="132" width="275" height="72" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="537" y="152" text-anchor="middle" font-size="11" fill="currentColor">org globex | domain *.globex.com</text>
<text x="537" y="170" text-anchor="middle" font-size="11" fill="currentColor">route corp-oidc, auto redirect bật</text>
<text x="537" y="188" text-anchor="middle" font-size="11" fill="currentColor">erin (U), frank (U)</text>
<rect x="400" y="220" width="275" height="72" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="537" y="240" text-anchor="middle" font-size="11" fill="currentColor">org globex-labs | labs.globex.com</text>
<text x="537" y="258" text-anchor="middle" font-size="11" fill="currentColor">route corp-oidc, auto redirect tắt</text>
<text x="537" y="276" text-anchor="middle" font-size="11" fill="currentColor">bob (U)</text>
<line x1="220" y1="160" x2="398" y2="80" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
<text x="300" y="106" text-anchor="middle" font-size="11" fill="currentColor">MANAGED</text>
<line x1="220" y1="168" x2="398" y2="168" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="310" y="161" text-anchor="middle" font-size="11" fill="currentColor">UNMANAGED</text>
<line x1="220" y1="176" x2="398" y2="256" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="300" y="236" text-anchor="middle" font-size="11" fill="currentColor">UNMANAGED</text>
<text x="24" y="318" font-size="11" fill="currentColor">(U) unmanaged, (M) managed. Tối đa một link MANAGED cho mỗi IdP; org initech không có domain, không có IdP.</text>
</svg>

Domain gate giữ cho IdP dùng chung không trộn khách. Lab: erin (`@eng.globex.com`) và dave (`@acme.com`) cùng đăng nhập qua `corp-oidc`; erin chỉ vào `globex` (UNMANAGED, theo link của globex), dave chỉ vào `acme` (MANAGED).

**Bản sai khi nâng cấp.** "Link mặc định UNMANAGED" đúng cho link tạo mới, sai cho realm nâng cấp: link cũ được migrate thành `AUTO_MEMBERSHIP=true, MEMBERSHIP_TYPE=MANAGED`. Realm nâng cấp có thể đang có link MANAGED mà không ai chọn, tức nút xoá org mang quyền xoá hàng loạt account. Sau khi lên 26.8: đọc `organizationLinks` của từng IdP và quyết định lại.

Lời mời đi vòng qua toàn bộ thuật toán trên: người được mời luôn thành UNMANAGED.

> **Chưa đo.** Lab không có SMTP nên không gửi lời mời. Đo bằng: Mailpit + SMTP cho realm, mời từ tab Members, xem `membershipType` sau khi chấp nhận.

> **Nguồn.** Nhiều-nhiều và *"Existing identity provider-to-organization links are migrated to the new ORG_IDENTITY_PROVIDER join table with AUTO_MEMBERSHIP=true and MEMBERSHIP_TYPE=MANAGED, preserving the previous default behavior."* ([migrating-to-26-8-0](https://www.keycloak.org/docs/latest/upgrading/#migrating-to-26-8-0)). *"By default, new links use the unmanaged membership type, but this can be changed to managed when linking the identity provider to the organization."* ([_onboard_member_identity_provider_](https://www.keycloak.org/docs/latest/server_admin/#_onboard_member_identity_provider_)). *"At most one organization can have managed membership type for a given identity provider."* ([linking-an-identity-provider-to-an-organization](https://www.keycloak.org/docs/latest/server_admin/#linking-an-identity-provider-to-an-organization)). Lời mời: [how-organization-membership-is-determined-during-broker-login](https://www.keycloak.org/docs/latest/server_admin/#how-organization-membership-is-determined-during-broker-login).

---

## ⏸ Dừng lại — đoán trước #2

Org `globex` có erin (vào qua IdP, link UNMANAGED, không có mật khẩu ở `saas`) và frank (admin thêm tay, có mật khẩu). Admin **tắt** (không xoá) `globex`. Chuyện gì xảy ra?

```
(a) Cả hai bị khoá đăng nhập, vì member của org bị tắt không authenticate được
(b) frank vẫn lấy được token, nhưng token không còn claim organization
(c) Cả hai đăng nhập bình thường, token vẫn có globex vì membership chưa bị gỡ
(d) frank vẫn đăng nhập; một email mới @eng.globex.com vẫn bị đẩy sang corp-oidc
```

---

### 3.5 MANAGED và UNMANAGED: ai sở hữu vòng đời account

Câu hỏi thật: khi quan hệ giữa user và khách chấm dứt, account còn lý do tồn tại không.

- **MANAGED**: account sinh ra vì khách, nguồn sự thật là org (thường là IdP của khách). Gỡ member hoặc xoá org thì account bị xoá khỏi realm. Đó là dave ở ticket hai.
- **UNMANAGED**: account thuộc realm trước, rồi mới gắn vào org. Gỡ member chỉ gỡ liên kết. Đó là erin.

Type được quyết định **lúc vào**, theo con đường, không theo việc user là ai:

| Con đường vào org | Membership type | Lab |
|---|---|---|
| Admin thêm user có sẵn | UNMANAGED | alice, carol, frank, bob |
| Qua IdP, link MANAGED, qua domain gate | MANAGED | dave → `acme` |
| Qua IdP, link UNMANAGED, qua domain gate | UNMANAGED | erin → `globex` |
| Lời mời | luôn UNMANAGED | chưa đo |

**Đáp án ⏸ #2 là (b).** Lab tắt `globex`: frank xin token với `scope=openid organization` (direct grant) vẫn được, nhưng claim `organization` vắng mặt. Email mới `ghost2@eng.globex.com` nhận `200` form mật khẩu, không còn `303`: link của org bị tắt đã ngừng. (a) sai vì frank là UNMANAGED, account thuộc realm, có mật khẩu. (c) sai vì claim biến mất. (d) sai vì routing tắt theo org. Riêng erin không có mật khẩu, mà đường IdP của `globex` đã đóng.

Docs lại nói member của org bị tắt *không authenticate được*. Critic đo thêm qua trình duyệt, với frank và gina (`gina@eng.globex.com`, khớp domain của `globex`, có mật khẩu, UNMANAGED):

| `globex` tắt | Trình duyệt (identity-first) | Direct grant |
|---|---|---|
| Cấu hình mặc định | cả hai: form mật khẩu, token không claim | `200`, không claim |
| Bật Requires user membership | cả hai: `403` ngay sau ô email, trang ghi `User is not a member of any organization` | `200`, không claim |

Bật lại `globex` thì cả hai qua cả hai đường, claim `["globex"]`. Câu docs chỉ đúng ở dòng hai, cột trình duyệt: phép chặn nằm trong authenticator `Organization Identity-First Login` của browser flow, direct grant không đi qua nó.

> **Đo trên lab (critic, 26.8.1).** Cổng 2200, máy đang tải bởi agent khác (không lấy latency). Config `requiresUserMembership=true` gắn vào execution `Organization Identity-First Login`. Script `~/projects/keycloak-lab/tmp-critic-kc17-flow.py`, output `critic-ch4/run-kc17.txt`.

Hệ quả: "tắt khách" **không** đồng nghĩa "khách không vào được app". App chỉ kiểm chữ ký + `aud` mà không kiểm claim `organization` vẫn phục vụ người của khách đã tắt, và client nào còn bật direct grant là một cửa vòng qua mọi cấu hình ở trên.

> **Nguồn.** *"If you remove the organization or the member, the account is also removed from the realm."* ([_managed_unmanaged_members_](https://www.keycloak.org/docs/latest/server_admin/#_managed_unmanaged_members_)). *"When an organization is disabled, you can still manage it through the management interfaces, but the organization members cannot authenticate to the realm, including authenticating through identity providers linked to the organization."* ([disabling-an-organization](https://www.keycloak.org/docs/latest/server_admin/#disabling-an-organization)).

### 3.6 Claim `organization`: app biết khách bằng cách nào

App chỉ biết org qua token. Claim `organization` do mapper của client scope `organization` sinh ra, một optional scope dựng sẵn: client `portal` mới tạo có ngay nó trong `optionalClientScopes`. Không xin thì không có claim (bài 9).

Ba dạng scope là ba câu hỏi: `organization` (thuộc org nào; nhiều org thì chọn lúc login), `organization:<alias>` (có thuộc đúng org này không), `organization:*` (mọi org). Trộn dạng bị cấm vì các câu hỏi mâu thuẫn; lab nhận `invalid_scope` cho `organization organization:acme` và `organization:acme organization:*`.

Hai hành vi direct grant dễ gây bất ngờ, vì direct grant không có màn hình để chọn:

- carol thuộc `acme` và `initech`, xin `organization`: token có scope nhưng **không có claim**. Cùng request qua trình duyệt thì sau trang username có trang `Select an organization to proceed: Acme Initech`; chọn `initech` thì claim chỉ có `initech`.
- bob không thuộc `acme`, xin `organization:acme`: không lỗi, scope bị bỏ im lặng. Docs mô tả trường hợp này là bị từ chối.

> **Chưa đo.** Cùng request của bob qua authorization code có bị từ chối như docs không. Đo bằng: `flow.sh` với scope `openid organization:acme`.

**Kiểu JSON của claim đổi theo cấu hình mapper.** Mặc định (không id, không attribute) claim là **mảng alias**; bật `addOrganizationId`/`addOrganizationAttributes` thì thành **object** lồng nhau (lab bước 4). Đổi `jsonType.label` không làm gì khác.

> **Suy luận.** Lab không chạy Spring cho bài này. Resource server bài 12 đọc claim bằng kiểu cố định, ví dụ `jwt.getClaimAsStringList("organization")`, sẽ nhận object khi admin bật Add organization id, và phần map sang authority hỏng mà Keycloak không báo gì. Kiểm bằng: chạy app bài 12, log `jwt.getClaims().get("organization").getClass()` trước và sau khi bật cờ.

> **Nguồn.** *"The organization scope is a built-in optional client scope at the realm."*, *"By default, the organization id and attributes are not included in the organization claim."* ([_mapping_organization_claims_](https://www.keycloak.org/docs/latest/server_admin/#_mapping_organization_claims_)).

### 3.7 SCIM: khi khách muốn tự đẩy user vào

Routing giải bài đăng nhập. Còn bài **đồng bộ**: Acme muốn nhân viên mới có mặt trong SaaS trước lần login đầu, người nghỉ việc biến mất ngay. Brokering chỉ tạo user lúc login. SCIM (RFC 7643/7644) là giao thức REST chuẩn để hệ thống ngoài tạo, sửa, xoá user/group.

Keycloak đóng vai **SCIM service provider**: hệ thống ngoài gọi vào. SCIM lên preview ở 26.7, supported ở 26.8, feature `scim-api` bật sẵn trên server, nhưng phải bật cho từng realm. Lab đi qua ba cửa, mỗi cửa một mã lỗi:

| Thiếu gì | Lab nhận |
|---|---|
| Realm chưa bật `scimApiEnabled` | `404` |
| Token không có `aud` là base URL SCIM | `401`, detail `Invalid token audience` |
| Chỉ có `view-users`, `query-users` mà gọi `POST /Users` | `403` |

Token client credentials mặc định mang `aud` = `realm-management` (nơi chứa role), không phải URL SCIM; phải thêm audience mapper với đúng `http://localhost:6600/realms/saas/scim/v2`, cùng cơ chế `aud` của bài 9 và 12.

`/ServiceProviderConfig` của lab trả `bulk.supported=false`, `filter.maxResults=100`, `changePassword.supported=false`. Docs thêm: PATCH tối đa 100 operation, filter tối đa 2048 ký tự, user/group có quyền quản trị không sửa được qua SCIM.

Hai bản sai. "Keycloak SCIM đẩy user sang Slack/GitHub": docs chỉ mô tả chiều vào. "SCIM tạo member cho từng org": chương SCIM không có cơ chế chọn org, resource User của lab chỉ có `active, emails, id, meta, name, schemas, userName`; gắn vào org vẫn qua admin, lời mời hoặc IdP.

> **Nguồn.** *"Keycloak supports SCIM APIs for managing users and groups within a realm."* ([_managing_scim](https://www.keycloak.org/docs/latest/server_admin/#_managing_scim)). *"In this release, the SCIM API is promoted from preview to supported."* ([scim-api-supported](https://www.keycloak.org/docs/latest/release_notes/#scim-api-supported)). *"Once the feature is enabled on the server, you must also enable SCIM for each realm individually."* ([_enabling_scim_](https://www.keycloak.org/docs/latest/server_admin/#_enabling_scim_)). `aud`: [_scim_accessing_endpoints_](https://www.keycloak.org/docs/latest/server_admin/#_scim_accessing_endpoints_). Bulk, mật khẩu, 100 kết quả: [supported-and-unsupported-capabilities](https://www.keycloak.org/docs/latest/server_admin/#supported-and-unsupported-capabilities). Filter 2048 ký tự: [filtering-constraints-and-limitations](https://www.keycloak.org/docs/latest/server_admin/#filtering-constraints-and-limitations).

---

## ⏸ Dừng lại — đoán trước #3

alice (member duy nhất của `acme`) xin token qua direct grant với `scope=openid organization`, mapper mặc định. Claim `organization` trông thế nào?

```
(a) "organization": "acme"
(b) "organization": ["acme"]
(c) "organization": {"acme": {"id": "e4044796-..."}}
(d) Không có claim: direct grant không đi qua identity-first nên không biết org
```

---

## 4. Lab

Script đầy đủ ở `~/projects/keycloak-lab/lab-kc17/`. `kc` là wrapper `kcadm.sh` với config riêng; `api` là hàm `curl` gắn token admin (`adm.sh`).

**Bước 1. Server, realm, hai cờ.**

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  bin/kc.sh start-dev --http-port=6600 --http-management-port=7600 --health-enabled=true
kc create realms -s realm=saas -s enabled=true
kc get realms/saas | jq 'with_entries(select(.key|test("organi|scim";"i")))'
# {"organizationsEnabled": false, "scimApiEnabled": false}
kc update realms/saas -s organizationsEnabled=true
```

**Bước 2. Org, link, routing.** Realm `corp` đóng vai Azure AD (user `dave@acme.com`, `erin@eng.globex.com`); IdP `corp-oidc` broker sang nó như bài 15, `trustEmail=true`.

```bash
kc create organizations -r saas -s name=Acme -s alias=acme -s 'domains=[{"name":"acme.com"}]' -i
# tạo globex tương tự với *.globex.com, rồi link IdP: body là chuỗi JSON, không phải object
api POST organizations/$ACME/identity-providers '"corp-oidc"'
# link vừa tạo: autoMembership true, membershipType UNMANAGED (đọc qua GET organizationLinks)
body=$(api GET organizations/$ACME | jq -c '.domains=[{"name":"acme.com","identityProviderAlias":"corp-oidc","autoRedirect":true}]')
api PUT organizations/$ACME "$body"
```

Routing nằm trên domain, không trên link.

**Bước 3. Đi luồng trình duyệt.** `flow.sh <email> [user-ở-corp]` gọi `/auth` của client `portal`, gửi email, đi theo `Location`, đăng nhập ở `corp` nếu bị đẩy sang, rồi đổi code lấy token. Với dave:

```
[2] POST username=dave@acme.com
>> HTTP/1.1 303 See Other  Location: http://localhost:6600/realms/saas/broker/corp-oidc/login
>> HTTP/1.1 303 See Other  Location: http://localhost:6600/realms/corp/protocol/openid-connect/auth
[corp] POST login dave
>> HTTP/1.1 302 Found  Location: http://localhost:6600/realms/saas/broker/corp-oidc/endpoint
>> HTTP/1.1 302 Found  Location: http://localhost:6600/realms/saas/login-actions/first-broker-login
>> HTTP/1.1 302 Found  Location: http://localhost:6600/realms/saas/broker/after-first-broker-login
>> HTTP/1.1 302 Found  Location: http://localhost:3000/cb
```

Dòng `303` đầu là identity-first (mục 3.3). Bốn dòng cuối là bài 15; ở `first-broker-login`, sub-flow `Organization Member Onboard` thêm dave vào `acme` với `membershipType` `MANAGED`.

**Bước 4. Đọc claim.** `dec.py` decode payload, chỉ in claim đang bàn; bảng gom output của `run6.txt` và `run7.txt`:

| User, scope | `organization` trong access token | Độ dài token |
|---|---|---|
| alice, `openid` | vắng | 1.325 ký tự |
| alice, `openid organization` | `["acme"]` | 1.374 ký tự |
| carol, `openid organization:*` | `["acme", "initech"]` | 1.393 ký tự |
| alice, `openid organization`, sau khi bật id + attribute | `{"acme": {"tier": ["gold"], "id": "e4044796-..."}}` | 1.457 ký tự |
| alice, `openid organization organization:acme` | lỗi `invalid_scope` | |

Đáp án ⏸ #3 là **(b)**. (a) sai vì mapper là multivalued; (c) chỉ đúng sau khi bật `addOrganizationId`; (d) sai: thuộc một org thì không cần chọn. ID token mang cùng giá trị. `tier=gold` là attribute đặt trên org: claim mang gói dịch vụ của khách, thứ app thường tra DB riêng.

**Bước 5. SCIM.**

```bash
kc create clients -r saas -s clientId=scim-client -s publicClient=false -s secret=scim-secret \
  -s serviceAccountsEnabled=true -s standardFlowEnabled=false -s fullScopeAllowed=false
# gán view-users, query-users, query-groups (realm-management) cho service account + scope mapping
kc update realms/saas -s scimApiEnabled=true
# thêm oidc-audience-mapper với included.custom.audience = base URL SCIM, rồi:
curl -s $B/Users -H "Authorization: Bearer $T" -H 'Accept: application/scim+json' | jq -c '{totalResults,itemsPerPage}'
# trả về HTTP/1.1 200 OK, Content-Type: application/scim+json;charset=UTF-8
# {"totalResults":5,"itemsPerPage":5}
```

Năm user là alice, bob, carol, erin, frank; dave đã bị xoá ở mục 3.5.

> **Đo trên lab (chạy riêng cho bài này).** Output: `run1.txt` đến `run14.txt` trong `~/projects/keycloak-lab/lab-kc17/`. Khởi động lần đầu: augmentation 11.971 ms, `started in 5.615s`. Dừng bằng SIGTERM: `Keycloak stopped in 1.074s`.

---

## 5. Tính tay

**Bài 1. Phân giải domain.** Org `A` giữ `*.globex.com` (route IdP X, Auto redirect), `B` giữ `labs.globex.com` (không routing), `C` giữ `eu.globex.com` (route IdP Y, Auto redirect). User chưa tồn tại, trừ khi ghi khác:

| Email | Khớp | Kết quả |
|---|---|---|
| `p@globex.com` | `A` (wildcard phủ gốc) | `303` sang X |
| `q@labs.globex.com` | `B` (exact thắng) | form mật khẩu |
| `r@x.labs.globex.com` | exact `labs` không phủ subdomain → `A` | `303` sang X |
| `s@eu.globex.com` | `C` | `303` sang Y |
| `t@eu.globex.com`, đã có mật khẩu | `C` | form mật khẩu |

Dòng `q` và `r` là kết quả đo được với cấu hình tương đương (mục 3.2).

**Bài 2. Xoá một khách.** IdP `entra` link vào `A` (MANAGED) và `B` (UNMANAGED). `A` có 120 member vào qua `entra`, 15 do admin thêm, 8 qua lời mời. Xoá `A`: 120 account bị xoá, 15 + 8 = 23 ở lại như user thường. Nếu link của `A` là link cũ từ 26.7 chưa ai sửa, vẫn là 120 (đã migrate thành MANAGED). Link `entra` vào org thứ ba với MANAGED: `400`.

**Bài 3. Đếm chi phí quản trị.** 400 khách. Realm-per-tenant: 400 × 21 = 8.400 role trong composite `admin` (lab: 3 realm cho 64 = 3 × 21 + 1; cái +1 là suy luận, nhiều khả năng là role `create-realm`). Organizations: một realm, 21 role, 400 org. Đồng bộ qua SCIM cho khách lớn nhất, 2.350 nhân viên: đọc hết cần ít nhất ⌈2.350 / 100⌉ = 24 `GET`; tạo lần đầu cần 2.350 `POST`, vì không có `/Bulk`.

> **Chưa đo.** Thời gian và CPU cho 2.350 lần `POST /Users`. Đo bằng: vòng lặp `curl` 1.000 user, ghi `time` và `process_cpu_seconds_total` ở cổng 7600.

---

## 6. Chuyển giao

1. Acme đổi domain sang `acme-group.com`, bạn gỡ `acme.com` khỏi org. `alice@acme.com` đăng nhập thế nào sau đó, bước nào trong sơ đồ mục 3.3 đổi kết quả?
2. Một consultant làm cho cả Acme và Globex (cả hai Auto redirect sang IdP riêng), dùng email công ty tư vấn. Gắn người này vào hai org bằng đường nào, và app biết họ đang làm cho khách nào bằng scope nào?
3. Bạn muốn MANAGED cho cả hai công ty con của Globex dùng chung một Azure AD, nhưng luật một-org-MANAGED-mỗi-IdP chặn. Thiết kế lại để vẫn đạt "nhân viên rời công ty con thì account biến mất".
4. App kiểm `organization` để chặn khách bị tắt. Access token phát ra 2 phút trước khi org bị tắt, lifespan 5 phút. Người của khách đó còn gọi được API trong bao lâu, và bài 10 cho cơ chế nào để thu hẹp?
5. Nhân viên Acme đã rời Azure AD phải bị khoá trong SaaS trong 15 phút; Acme không có SCIM client, account cũ còn mật khẩu. Liệt kê các đường người đã nghỉ vẫn vào được, đường nào Organizations tự đóng.
6. 30 khách lớn đòi access token 5 phút và MFA bắt buộc, 3.000 khách nhỏ dùng mặc định. Thiết kế lai realm-per-tenant và Organizations: ranh giới realm đặt ở đâu, app chọn issuer thế nào khi user mới chỉ gõ email, và khi một khách nhỏ phải chuyển sang realm riêng, làm sao giữ nguyên `sub` của user trong DB của app?

---

## 7. Tóm tắt

- Organizations là multi-tenancy bên trong một realm; member là user của realm có liên kết tới org; không có token lifespan, theme hay key riêng theo org. Preview ở 25, supported từ 26, bật theo realm (`organizationsEnabled`).
- Realm-per-tenant: mỗi realm thêm 21 role vào master (lab: 3 realm → 64 mapping trong `admin`); docs không đặt trần số realm.
- Domain unique trong realm; wildcard phủ mọi cấp; cùng số phần thì exact thắng. REST API 26.8.1 nhận `*.globex.com`, từ chối `.globex.com`, nhận domain 13 phần dù docs ghi tối đa 10. Alias bất biến.
- Identity-first: org khớp → domain có IdP + Auto redirect, org đang bật → user chưa có credential bậc 1 thì mới `303` sang IdP. `verified: false` không chặn redirect.
- 26.8: IdP–org nhiều-nhiều; link mới: auto membership bật, UNMANAGED, có domain gate; tối đa một link MANAGED mỗi IdP; link cũ khi nâng cấp thành MANAGED.
- MANAGED: gỡ member hoặc xoá org là xoá account. Tắt org: member có mật khẩu vẫn lấy token, mất claim `organization`, routing ngừng; trình duyệt chỉ bị chặn (`403`) khi bật Requires user membership, direct grant không bị chặn.
- Claim `organization` cần optional scope `organization`; mặc định là mảng alias, bật id/attribute thì thành object (token alice 1.325 → 1.374 → 1.457 ký tự). Trộn dạng scope trả `invalid_scope`.
- SCIM 26.8: supported, bật theo realm, chỉ chiều vào, cần `aud` đúng base URL (thiếu: `401`) và role realm-management (thiếu: `403`); không Bulk, không đổi mật khẩu, tối đa 100 kết quả, không gắn với org.

→ **Bài 18 — Authentication flow**: bài này dựa vào việc `Organization` đứng trước `forms` trong browser flow; bài sau mổ từng execution, REQUIRED/ALTERNATIVE/CONDITIONAL và sub-flow, để bạn tự sửa flow tuỳ biến khi bật Organizations cho realm cũ.
