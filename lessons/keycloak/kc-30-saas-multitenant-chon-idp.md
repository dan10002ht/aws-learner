# Bài 30 — IAM cho SaaS multi-tenant và chọn IdP

## 1. Mục tiêu

Sau bài này bạn có thể:

- Xếp một yêu cầu của khách ("SSO bằng Azure AD", "token 5 phút", "trang login mang logo của chúng tôi") vào đúng mô hình: một realm có attribute, một realm + Organizations, hay realm-per-tenant, và nói cơ chế nào của Keycloak quyết định điều đó.
- Tính chi phí quản trị của realm-per-tenant theo số khách N bằng công thức rút từ lab: số role trong composite `admin` của `master`, độ dài token admin đầy đủ, số entry cache `realms`, số file cấu hình phải review.
- Đọc composite `admin` của `master` và token admin trên một server thật, giải thích vì sao token của `admin-cli` đứng yên ở 750 ký tự trong khi token của một client tự tạo trong `master` tăng 546 ký tự mỗi realm.
- Thiết kế mô hình lai cho SaaS 300 khách có 20 khách đòi SSO riêng, rồi kiểm lại thiết kế đó khi số khách lên 3.000.
- So Keycloak tự host với một IdP managed theo ba trục: ai vận hành cái gì, tuỳ biến tới đâu, lock-in nằm ở đâu, và ghi ra các câu phải hỏi vendor trước khi ký.
- Ước lượng phần việc vận hành Keycloak bằng số đã có trong course (vCPU, IOPS, nâng version, SPI nội bộ) thay vì bằng cảm giác "tự host thì rẻ".

---

## 2. Triệu chứng

Một SaaS B2B đã chọn realm-per-tenant từ ngày đầu, với lý do "mỗi khách một realm cho sạch". Hiện có 50 khách. Đội vận hành có một công cụ nội bộ `ops-portal`: một client public tạo trong realm `master`, đăng nhập bằng user `admin`, gọi Admin REST API để tạo realm cho khách mới. Không ai bật gì thêm cho client này.

Sales vừa báo quý sau ký thêm 250 khách. Kỹ sư phụ trách in độ dài access token của `ops-portal` và của `admin-cli` (client dựng sẵn mà `kcadm.sh` dùng), cả hai lấy cùng user, cùng lúc:

```
realm trên server        : 51 (master + 50 khách)
composite admin (master) : 1072 role
token admin-cli          : 750 ký tự
token ops-portal         : 29058 ký tự, resource_access có 52 client, 1074 role
```

Cùng user, cùng quyền, hai token chênh nhau gần 39 lần. Một người đề xuất "nâng giới hạn header của reverse proxy lên 64 KB là xong", người khác đòi chuyển hết sang Organizations. Chưa ai trả lời được: token đó dài bao nhiêu khi có 300 khách, và mô hình nào đúng cho 300 khách.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 bản zip, `start-dev` (H2 dev-file), OpenJDK 24.0.2, Mac mini Apple M4 10 core 16 GB, cổng 1500 / management 2500, ngày 2026-10-15. Client `admin-full` trong `master` đóng vai `ops-portal`. Máy đang chạy việc khác song song (load average 4–7), nên mọi số thời gian và bộ nhớ chỉ là bậc độ lớn. Script `~/projects/keycloak-lab/tmp-kc30-lab.py`, output `~/projects/keycloak-lab/lab-kc30/run1.txt`.

---

## ⏸ Dừng lại — đoán trước #1

Giữ nguyên cách tạo realm như trên, lên 300 khách. Token của `ops-portal` dài khoảng bao nhiêu?

```
(a) Vẫn khoảng 29 KB: các role trùng tên (view-users, manage-realm...) được gom lại
(b) Khoảng 58 KB: token tăng theo căn bậc hai số realm vì composite được nén
(c) Khoảng 160 KB: token tăng tuyến tính theo số realm
(d) Không tới được: Keycloak từ chối tạo realm thứ 101
```

---

## 3. Lý thuyết

Bài 7 dạy realm, bài 17 dạy Organizations. Bài này đặt chúng cạnh nhau và đo giá của từng cái khi số khách tăng.

### 3.1 Vì sao token admin phình: master realm giữ một bản sao quyền của mọi realm

Bài 6 đã nêu hai cơ chế của `master`: role `admin` ở đó là superuser của mọi realm, và mỗi realm có một client đại diện tên `<realm>-realm` nằm trong `master`. Ghép hai cơ chế lại thì ra công thức phình.

Mỗi lần tạo một realm, Keycloak tạo client `<tên>-realm` trong `master` với 21 client role (`view-users`, `manage-users`, `manage-realm`, `impersonation`, `manage-organizations`...) và nhét cả 21 role đó vào composite `admin`. Lab đếm composite ở bốn mốc:

| Realm khách (N) | Composite `admin` | 21N + 22 |
|---|---|---|
| 0 | 22 | 22 |
| 1 | 43 | 43 |
| 10 | 232 | 232 |
| 50 | 1.072 | 1.072 |

Hằng số 22 là 21 role của `master-realm` cộng role cấp realm duy nhất trong composite, `create-realm` (lab đọc ra). Với 100 realm khách, công thức cho 2.122, khớp con số "hơn 2.000" của docs.

Phần đắt nằm ở token. Một client mới tạo có Full Scope Allowed bật (bài 8), nên mọi client role user nắm đều vào `resource_access` (và, theo hộp suy luận dưới, tên client vào `aud`). User `admin` nắm cả 1.074 role, nên token mang đủ 1.074 tên. Mỗi realm thêm vào token một mục `"t1-realm":{"roles":[...21 tên...]},` 397 byte JSON (lab in khối này kèm cặp ngoặc ngoài: 398 byte), cộng `"t1-realm",` 11 byte trong `aud`: 408 byte. Tên `t10` đến `t50` dài hơn 1 ký tự ở cả hai chỗ. Cộng 50 realm: 50 × 408 + 41 × 2 = 20.482 byte, qua base64url thành 20.482 × 4/3 ≈ 27.309 ký tự. Lab đo: 29.058 − 1.749 = 27.309, tức 546,2 ký tự mỗi realm. Vẫn là công thức (L + 3) × 4/3 của bài 8, chỉ là L giờ là cả một khối 21 role.

**Đáp án ⏸ #1 là (c).** Ngoại suy tuyến tính từ bốn mốc đo (0–50 realm): 1.749 + 546,2 × 300 ≈ 165.600 ký tự, khoảng 162 KiB. (a) sai vì role của hai client khác nhau là hai role khác nhau dù trùng tên, `resource_access` liệt kê theo từng client. (b) sai, không có nén nào. (d) sai, docs không đặt trần số realm.

`admin-cli` thoát khỏi chuyện này vì từ Keycloak 26 nó và `security-admin-console` phát **lightweight access token**: payload chỉ còn `azp, exp, iat, iss, jti, scope, sid, typ`, không role nào, 750 ký tự ở cả bốn mốc. Quyền được Keycloak tra phía server khi token tới Admin API. Vậy cách chữa đúng cho `ops-portal` không phải nâng header proxy mà là bật lightweight cho client đó, hoặc dùng service account chỉ mang role của đúng realm cần quản.

> **Suy luận.** Lab không in `aud`; phần 11 byte mỗi realm trong `aud` suy ra từ việc phép cộng trên khớp số đo tới từng ký tự, docs không nói. Kiểm bằng: decode token `admin-full` ở N = 50, đếm phần tử của `aud`.

> **Chưa đo.** Giới hạn header của proxy cụ thể nào chặn token 29 KB hay 162 KB: không file nguồn nào của course có số đó và lab không dựng proxy (bài 8 cũng để ngỏ). Đo bằng: gửi `Authorization: Bearer` dài dần qua proxy/ingress bạn thật sự dùng, ghi status code ở ngưỡng bị từ chối.

> **Nguồn.** *"For example, with 100 realms, the admin composite contains over 2,000 role mappings (approximately 21 roles per realm)."*, *"With hundreds of realms, the token can exceed HTTP header size limits enforced by load balancers or reverse proxies."*, *"The security-admin-console and admin-cli clients use lightweight access tokens by default since Keycloak 26."*, *"Deployments with many realms should ensure that the realms, users, and authorization local caches are properly sized."* ([multi-realm-administration-considerations](https://www.keycloak.org/docs/latest/server_admin/#multi-realm-administration-considerations)). *"One Keycloak deployment can define, store, and manage as many realms as there is space for in the database."* ([_configuring-realms](https://www.keycloak.org/docs/latest/server_admin/#_configuring-realms)).

### 3.2 Ba mô hình, đọc theo ba câu hỏi

Token admin chỉ là triệu chứng dễ thấy nhất. Ba mô hình đặt ranh giới tenant ở ba tầng khác nhau, nên trả lời khác nhau cho ba câu:

1. **Ai biết khách là ai, và lúc nào?** Trước login (app phải chọn issuer hoặc gửi gợi ý) hay trong login (Keycloak đoán từ email).
2. **Cấu hình nào thuộc về khách?** Khoá ký token, session lifespan, flow, password policy, theme, IdP.
3. **Cái gì nhân lên theo N?** Role trong `master`, file cấu hình, issuer mà resource server phải tin.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc30-a-t kc30-a-d" style="width:100%;height:auto">
<title id="kc30-a-t">Ba mô hình multi-tenant trên Keycloak</title>
<desc id="kc30-a-d">Mô hình A đặt mọi khách vào một realm và phân biệt bằng attribute; mô hình B đặt mọi khách vào một realm và phân biệt bằng organization có IdP và domain riêng; mô hình C cho mỗi khách một realm, mỗi realm thêm 21 role vào composite admin của master.</desc>
<text x="120" y="20" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">A. Một realm, tenant = attribute</text>
<text x="350" y="20" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">B. Một realm + Organizations</text>
<text x="580" y="20" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">C. Realm-per-tenant</text>
<rect x="15" y="32" width="210" height="172" rx="8" fill="#3b82f6" fill-opacity="0.15"/>
<text x="120" y="52" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">realm saas</text>
<text x="120" y="74" text-anchor="middle" font-size="10" fill="currentColor">chung issuer, key, session</text>
<text x="120" y="96" text-anchor="middle" font-size="10" fill="currentColor">user: tenant_id = acme | globex</text>
<text x="120" y="118" text-anchor="middle" font-size="10" fill="currentColor">IdP cấp realm, bật cho mọi app</text>
<text x="120" y="140" text-anchor="middle" font-size="10" fill="currentColor">app chọn IdP bằng kc_idp_hint</text>
<text x="120" y="162" text-anchor="middle" font-size="10" fill="currentColor">gắn IdP với khách: app tự làm</text>
<text x="120" y="184" text-anchor="middle" font-size="10" fill="currentColor">cách ly dữ liệu: app tự làm</text>
<rect x="245" y="32" width="210" height="172" rx="8" fill="#84cc16" fill-opacity="0.15"/>
<text x="350" y="52" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">realm saas</text>
<text x="350" y="74" text-anchor="middle" font-size="10" fill="currentColor">chung issuer, key, session</text>
<rect x="257" y="86" width="90" height="46" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="302" y="104" text-anchor="middle" font-size="10" fill="currentColor">org acme</text>
<text x="302" y="122" text-anchor="middle" font-size="10" fill="currentColor">IdP: entra</text>
<rect x="353" y="86" width="90" height="46" rx="6" fill="#84cc16" fill-opacity="0.3"/>
<text x="398" y="104" text-anchor="middle" font-size="10" fill="currentColor">org globex</text>
<text x="398" y="122" text-anchor="middle" font-size="10" fill="currentColor">IdP: okta</text>
<text x="350" y="154" text-anchor="middle" font-size="10" fill="currentColor">email, rồi domain, rồi org, rồi IdP</text>
<text x="350" y="176" text-anchor="middle" font-size="10" fill="currentColor">app đọc claim organization</text>
<rect x="475" y="32" width="210" height="50" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="580" y="52" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">realm acme</text>
<text x="580" y="70" text-anchor="middle" font-size="10" fill="currentColor">issuer, key, session, theme riêng</text>
<rect x="475" y="90" width="210" height="50" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="580" y="110" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">realm globex</text>
<text x="580" y="128" text-anchor="middle" font-size="10" fill="currentColor">issuer, key, session, theme riêng</text>
<rect x="475" y="148" width="210" height="56" rx="8" fill="#f59e0b" fill-opacity="0.2"/>
<text x="580" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">... N realm</text>
<text x="580" y="190" text-anchor="middle" font-size="10" fill="currentColor">app phải chọn issuer trước login</text>
<rect x="15" y="222" width="440" height="62" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="235" y="246" text-anchor="middle" font-size="11" fill="currentColor">master: 1 client saas-realm</text>
<text x="235" y="268" text-anchor="middle" font-size="11" fill="currentColor">composite admin: 21 + 22 = 43 role, không đổi theo số khách</text>
<rect x="475" y="222" width="210" height="62" rx="8" fill="#ef4444" fill-opacity="0.18"/>
<text x="580" y="246" text-anchor="middle" font-size="11" fill="currentColor">master: N client tenant-realm</text>
<text x="580" y="268" text-anchor="middle" font-size="11" fill="currentColor">composite admin: 21N + 22</text>
</svg>

**Mô hình A: một realm, tenant là attribute hoặc group.** Keycloak không biết khái niệm khách: bạn đặt `tenant_id` lên user, mapper đưa nó vào token (bài 9), app lọc dữ liệu theo claim đó. Ổn khi khách chỉ dùng mật khẩu, gãy ở khách đầu tiên đòi SSO: IdP được tạo ở cấp realm và bật cho mọi app theo mặc định, nên IdP Azure AD của Acme có mặt trên trang login của người Globex. Để đẩy đúng người sang đúng IdP, app phải biết khách **trước** khi login (subdomain, đường dẫn) rồi gửi `kc_idp_hint`. Và ràng buộc "ai đi qua IdP của Acme thì có `tenant_id=acme`" là việc bạn tự dựng bằng mapper hay flow, không phải luật của Keycloak.

**Mô hình B: một realm + Organizations.** Chính những chỗ A bắt bạn tự dựng, Organizations có sẵn: domain email quyết định org, org quyết định IdP (identity-first, bài 17), domain gate giữ cho IdP dùng chung không trộn khách, membership MANAGED gắn vòng đời account với khách, claim `organization` mang khách vào token. Cái nó **không** có: org không có key, token lifespan, flow hay theme riêng. Mọi khách dùng chung khoá ký, chung SSO Session Max, chung password policy.

**Mô hình C: realm-per-tenant.** Mỗi realm có bộ key riêng (realm `demo` của lab 1 có 4 key active), session lifespan, flow, brute force, password policy, theme, IdP riêng. Khách A đòi token 5 phút, khách B đòi 30 phút: chỉ C đáp ứng. Cái giá là mọi thứ ở mục 3.1 nhân theo N, cộng thêm: N issuer, nên resource server phải tin N `iss` và N JWKS thay vì một (Spring ở bài 12 cấu hình một `issuer-uri`); và một người làm cho hai khách cần hai account.

> **Nguồn.** *"Keycloak creates identity providers for each realm and enables them for every application by default."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)). *"OIDC applications can bypass the Keycloak login page by hinting at the identity provider they want to use."* ([_client_suggested_idp](https://www.keycloak.org/docs/latest/server_admin/#_client_suggested_idp)). *"It enables multi-tenancy within a realm so that users can have access to protected resources from a realm but with a more restricted and controlled context, that context being the organization to which they belong."* ([_managing_organizations](https://www.keycloak.org/docs/latest/server_admin/#_managing_organizations)). *"The name of the client is <realm name>-realm."* ([master realm access control](https://www.keycloak.org/docs/latest/server_admin/index.html#_master_realm_access_control)).

---

## ⏸ Dừng lại — đoán trước #2

Khách Initech đang ở realm chung (mô hình B) với IdP `initech-entra` link vào org `initech`. Họ đòi token 5 phút, nên bạn chuyển họ sang realm riêng `initech`, giữ nguyên alias IdP. Bên Azure AD của Initech phải làm gì?

```
(a) Không gì cả: alias IdP giữ nguyên nên mọi URL giữ nguyên
(b) Cập nhật redirect URI / metadata SP, vì URL broker chứa tên realm
(c) Chỉ đổi client secret, vì realm mới sinh secret mới
(d) Không gì cả, nhưng user phải đăng ký lại tài khoản trong realm mới
```

---

### 3.3 Bảng so sánh: đặt sau cơ chế, không thay cơ chế

Mỗi ô có lý do hoặc số. Số lab là của mục 4; số docs có nguồn ở các hộp trong bài.

| Tiêu chí | A. Một realm, attribute | B. Một realm + Organizations | C. Realm-per-tenant |
|---|---|---|---|
| Khoá ký token | ✗ chung | ✗ chung, org không có key | ✓ riêng mỗi realm |
| Session/token lifespan, password policy, brute force | ✗ chung | ✗ chung | ✓ riêng |
| Theme login theo khách | ✗ một theme cho realm | ✗ docs không mô tả theme theo org | ✓ riêng |
| IdP riêng mỗi khách | gượng: IdP bật cho mọi app, app phải gửi `kc_idp_hint` | ✓ link IdP vào org, route theo domain; 26.8 nhiều-nhiều | ✓ IdP nằm trong realm khách |
| Ai biết khách trước login | app (subdomain/đường dẫn) | Keycloak, từ email | app, để chọn issuer |
| Một người, nhiều khách | app tự xử attribute đa trị | ✓ một account, chọn org lúc login | ✗ một account mỗi realm |
| Resource server tin bao nhiêu issuer | 1 | 1 | N |
| Composite `admin` của `master` | 43, cố định | 43, cố định | 21N + 22 |
| Token admin đầy đủ | 2.293 ký tự | 2.293 ký tự | 1.749 + 546N ký tự |
| Cache `realms` | 1 realm | 1 realm | khoảng 18 entry mỗi realm vừa chạm discovery; trần mặc định 10.000 |
| Config-as-code | 1 file realm (~84 KB ở bài 24) | 1 file | N file |

Hai dòng cache và config của C là thứ đội vận hành gánh. Cache: docs đặt mặc định 10.000 entry cho cache `realms`, `users`, `authorization` và dặn chỉnh khi có nhiều realm. Lab thấy mỗi realm vừa được gọi discovery chiếm thêm 18 entry (4 → 154 lúc khởi động với 51 realm, rồi +18 cho mỗi realm chạm vào). Realm thật có client, role, flow riêng sẽ chiếm nhiều hơn một realm rỗng. Config: realm `shop` ở bài 24 gần như mặc định đã là 83.867 byte; 300 realm là khoảng 25 MB JSON mà mỗi lần đổi một cấu hình chung (thêm một mapper cho mọi khách) phải áp 300 lần.

> **Suy luận.** Docs không có bảng so sánh ba mô hình nào; bảng trên là đánh giá của bài, ghép từ dữ kiện có nguồn và số lab. Dòng "theme theo org" dựa trên việc docs không mô tả, không phải docs nói không có. Con số 18 entry mỗi realm là của realm rỗng chỉ bị gọi discovery: 10.000 / 18 ≈ 555 realm rỗng trước khi cache `realms` đầy; realm thật sẽ đầy sớm hơn. Kiểm bằng: tạo realm có 10 client, 20 role, gọi token endpoint cho mỗi realm, đọc `vendor_statistics_number_of_entries{cache="realms"}`.

> **Nguồn.** *"Local caches for realms, users, and authorization are configured to hold up to 10,000 entries per default."* ([caching](https://www.keycloak.org/server/caching)). Release 26.3 về nhiều realm: *"There is no longer a cumulative performance degradation for each additional realm processed."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/#performance-improvements-to-import-export-and-migration)).

### 3.4 Bản sai "realm-per-tenant thì chuyển khách dễ", và cái URL mà khách đã cấu hình

Bản sai thường đi cùng mô hình lai: "cứ để khách ở realm chung, khách nào đòi gì đặc biệt thì chuyển sang realm riêng, export/import là xong". Phía Keycloak thì đúng là export/import được (bài 24). Phía **khách** thì không.

Khi Keycloak broker sang IdP của khách, IdP đó phải biết trả kết quả về đâu. Với OIDC, alias của IdP dựng nên redirect URI; với SAML, metadata SP của broker công khai ở một URL dạng `/realms/{realm-name}/broker/{broker-alias}/endpoint/descriptor`. Cả hai đều chứa **tên realm**. Admin của Initech đã dán URL đó vào Azure AD của họ. Chuyển Initech sang realm `initech` thì URL đổi, và đăng nhập SSO của Initech gãy cho tới khi admin bên họ sửa xong.

**Đáp án ⏸ #2 là (b).** (a) sai vì alias chỉ là một phần của URL; phần `/realms/saas/` đổi thành `/realms/initech/`. (c) sai vì secret do Azure AD cấp cho Keycloak, không do realm mới sinh; cấu hình phía Keycloak copy được. (d) không đúng như phát biểu: user import được, nhưng xem hộp suy luận dưới về `sub`.

Hệ quả thiết kế: **quyết định khách nào ở realm riêng phải làm trước khi gửi URL cho khách**, không phải sau. Đó là lý do mô hình lai nên cắt theo tiêu chí biết được lúc onboard (hợp đồng có đòi token lifespan/MFA/theme riêng không), không cắt theo "khi nào khách kêu".

> **Suy luận.** Đổi realm còn đổi `iss` của token khách đó, và nếu user được tạo lại thay vì import kèm id, `sub` cũng đổi; app nào khoá dữ liệu theo `sub` sẽ mất liên kết. Docs không mô tả việc giữ id user khi chuyển realm. Kiểm bằng: export realm có user, import sang tên realm khác, so `id` của user trước và sau.

> **Nguồn.** *"Keycloak uses the alias to build redirect URIs for OpenID Connect protocols that require a redirect URI or callback URL to communicate with an identity provider."* ([_general-idp-config](https://www.keycloak.org/docs/latest/server_admin/#_general-idp-config)). Metadata SP của broker: *"http[s]://{host:port}/realms/{realm-name}/broker/{broker-alias}/endpoint/descriptor"* ([_identity_broker_saml_sp_descriptor](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_saml_sp_descriptor)).

---

## ⏸ Dừng lại — đoán trước #3

Bạn cân nhắc rời Keycloak sang một IdP managed. Trong các thứ dưới đây, thứ nào **không** phụ thuộc vào việc IdP là sản phẩm gì?

```
(a) Resource server kiểm chữ ký RS256 qua JWKS, cùng iss, aud, exp
(b) Converter Spring đọc realm_access.roles thành authority
(c) Giá trị sub mà DB của app dùng làm khoá user
(d) URL broker mà 20 khách đã dán vào Azure AD/Okta của họ
```

---

### 3.5 Tự host Keycloak: phần việc có số

"Keycloak miễn phí" chỉ đúng với license. Phần còn lại là việc, và course này đã đo hoặc trích được phần lớn việc đó:

| Việc | Số trong course | Bài |
|---|---|---|
| CPU cho login mật khẩu | 1 vCPU mỗi 15 login/s (Argon2, 5 vòng), cộng 150% headroom | 27 |
| CPU cho client credentials / refresh | 1 vCPU mỗi 120 request/s | 27 |
| Bộ nhớ nền mỗi pod | 1.250 MB gồm cache realm và 10.000 session | 27 |
| IOPS ghi của DB | 1.400 write IOPS mỗi 100 login/logout/refresh mỗi giây | 27 |
| Đổi provider/build option | `kc.sh build` ~13 s mỗi lần, bỏ quên thì server thoát exit code 2 | 6, 22 |
| SPI tuỳ biến | Authentication SPI và Event Listener SPI là SPI nội bộ, đổi không báo trước; log `KC-SERVICES0047` mỗi lần build | 22, 23 |
| Nâng patch | rolling update được từ 26.6.0, cần ít nhất 2 node | 29 |
| Nâng minor/major | tắt hết node bản cũ để migrate DB; không rollback schema, quay lại phải restore DB | 29 |
| Xoay signing key | làm tay, khuyến nghị 3–6 tháng một lần | 29 |
| Chặn bề mặt | không expose `/realms/master/`, không proxy cổng 9000 | 6, 28 |

Không dòng nào khó; cái giá là chúng **không bao giờ xong**: mỗi bản minor là một lần đọc ghi chú nâng cấp, build lại SPI, test lại flow tuỳ biến, và một cửa sổ downtime.

Đổi lại, tự host cho hai thứ: chạy code của mình **trong** luồng login (authenticator bài 22, event listener và user storage bài 23), và dữ liệu identity, hash mật khẩu, session nằm trong DB của bạn, ở vùng bạn chọn.

> **Nguồn.** *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."*, *"Leave 150% extra head-room for CPU usage to handle spikes in the load."* ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). *"This is an internal SPI. While it was stable in the previous releases, any new release of Keycloak can change it without prior notice."* ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)). *"Starting with Keycloak 26.6.0 rolling updates of patch releases are supported."* và rollback DB phải restore từ backup ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)). *"Consider creating new keys every three to six months and deleting old keys one to two months after you create the new keys."* ([server_admin](https://www.keycloak.org/docs/latest/server_admin/index.html)).

### 3.6 IdP managed: ai vận hành gì, và lock-in nằm ở đâu

Course này không có nguồn nào về Auth0, Okta, Cognito, Zitadel hay Microsoft Entra External ID: không giá, không giới hạn, không tính năng. Nên mục này so **mô hình vận hành**, không so sản phẩm; mọi phát biểu về phía managed là suy luận, phải kiểm trong tài liệu và hợp đồng của vendor cụ thể.

| Trục | Keycloak tự host | IdP managed (suy luận) |
|---|---|---|
| Chạy process, sizing, DB, backup | bạn (bảng 3.5) | vendor |
| Nâng version, vá CVE | bạn chọn lúc nào, chịu downtime minor | vendor chọn lúc nào, bạn không chọn được version |
| Tuỳ biến luồng login | Java SPI chạy trong process, làm gì cũng được, vỡ khi nâng version | trong phạm vi extension vendor cung cấp |
| Dữ liệu identity ở đâu | DB của bạn | hạ tầng vendor |
| On-call khi IdP chết | bạn | vendor, theo SLA |

**Đáp án ⏸ #3 là (a).** Kiểm chữ ký JWS qua JWKS và kiểm `iss`/`aud`/`exp` là chuẩn (bài 4, bài 12), mọi IdP OIDC đều phải đáp ứng; đổi IdP thì chỉ đổi URL issuer. Ba thứ kia là ba điểm lock-in, mỗi cái một cơ chế:

1. **Định dạng token (b).** `realm_access.roles` và `resource_access` là cách Keycloak đặt role, không phải chuẩn; bài 12 phải viết converter riêng cho nó. Mọi chỗ trong app đọc claim riêng của IdP là code phải viết lại. Cách giảm: gom việc đọc claim vào một lớp, hoặc dùng mapper phát claim theo tên của bạn.
2. **Định danh user (c).** `sub` do IdP sinh (Keycloak sinh UUID, lab thấy `df9c8cc1-...`). DB của app khoá theo `sub` thì đổi IdP là phải map lại mọi user. Cách giảm: app giữ user id riêng, `sub` chỉ là một cột tra cứu.
3. **Hợp đồng federation với khách (d).** Mục 3.4 cho thấy đổi realm đã bắt khách sửa cấu hình. Đổi cả IdP còn nặng hơn: URL, entity ID, cert ký đều đổi, và việc đó nằm trong tay 20 admin bên khách, không trong tay bạn.

Điểm thứ tư là **hash mật khẩu**. `kc.sh export` từ CLI chứa hash Argon2id kèm tham số (bài 24), nên rời Keycloak không bắt user đặt lại mật khẩu nếu đích nhận được hash đó. Với vendor, câu hỏi ngược lại: có export được hash không; không thì rời vendor là mọi user đặt lại mật khẩu.

Bốn câu phải có trả lời bằng văn bản trước khi ký với vendor nào: export được hash + tham số không; token có claim role theo tên mình đặt được không; viết logic tuỳ biến trong luồng login bằng cơ chế gì, giới hạn gì; URL và entity ID mà khách cấu hình có đặt được trên domain của mình không.

> **Suy luận.** Toàn bộ cột "IdP managed" và bốn câu hỏi trên là suy luận từ mô hình dịch vụ managed, không có nguồn về sản phẩm cụ thể nào. Kiểm bằng: tài liệu export dữ liệu, tài liệu custom claim, tài liệu extension và custom domain của vendor, cùng SLA trong hợp đồng.

### 3.7 Cây quyết định

Cây dưới gom mục 3.2 đến 3.6. Câu 1 tách Keycloak khỏi managed bằng thứ chỉ tự host làm được; câu 3 và 4 chọn mô hình tenant bằng cơ chế ở mục 3.2.

<svg viewBox="0 0 700 430" role="img" aria-labelledby="kc30-b-t kc30-b-d" style="width:100%;height:auto">
<title id="kc30-b-t">Cây quyết định chọn IdP và mô hình tenant</title>
<desc id="kc30-b-d">Câu 1 hỏi có cần code chạy trong luồng login hoặc dữ liệu identity trên hạ tầng của mình không; câu 2 hỏi có người vận hành IdP không; nếu chọn Keycloak, câu 3 hỏi có khách cần cấu hình riêng như lifespan, key, flow, theme, câu 4 hỏi khách có IdP riêng hoặc cần định tuyến theo email.</desc>
<defs><marker id="kc30-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/></marker></defs>
<rect x="110" y="10" width="480" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="350" y="29" text-anchor="middle" font-size="11" fill="currentColor">1. Có code tự viết phải chạy trong luồng login (SPI),</text>
<text x="350" y="46" text-anchor="middle" font-size="11" fill="currentColor">hoặc identity phải nằm trên hạ tầng của bạn?</text>
<rect x="10" y="94" width="330" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="175" y="113" text-anchor="middle" font-size="11" fill="currentColor">2. Có người trực IdP: nâng version,</text>
<text x="175" y="130" text-anchor="middle" font-size="11" fill="currentColor">xoay key, backup DB, sizing?</text>
<rect x="420" y="94" width="270" height="46" rx="8" fill="#84cc16" fill-opacity="0.3"/>
<text x="555" y="113" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">Keycloak tự host</text>
<text x="555" y="130" text-anchor="middle" font-size="11" fill="currentColor">phần việc: bảng mục 3.5</text>
<line x1="250" y1="56" x2="185" y2="92" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="196" y="72" text-anchor="middle" font-size="11" fill="currentColor">Không</text>
<line x1="450" y1="56" x2="540" y2="92" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="514" y="72" text-anchor="middle" font-size="11" fill="currentColor">Có</text>
<line x1="340" y1="117" x2="418" y2="117" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="380" y="110" text-anchor="middle" font-size="10" fill="currentColor">Có</text>
<line x1="110" y1="140" x2="110" y2="174" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="132" y="162" text-anchor="middle" font-size="11" fill="currentColor">Không</text>
<rect x="10" y="176" width="230" height="46" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="125" y="195" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">IdP managed</text>
<text x="125" y="212" text-anchor="middle" font-size="11" fill="currentColor">hỏi 4 câu lock-in ở mục 3.6</text>
<line x1="555" y1="140" x2="555" y2="180" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<rect x="360" y="182" width="330" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="525" y="201" text-anchor="middle" font-size="11" fill="currentColor">3. Có khách cần lifespan, key, flow</text>
<text x="525" y="218" text-anchor="middle" font-size="11" fill="currentColor">hoặc theme khác phần còn lại?</text>
<line x1="440" y1="228" x2="320" y2="270" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="366" y="244" text-anchor="middle" font-size="11" fill="currentColor">Không</text>
<line x1="620" y1="228" x2="590" y2="270" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="622" y="252" text-anchor="middle" font-size="11" fill="currentColor">Có</text>
<rect x="150" y="272" width="300" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.2"/>
<text x="300" y="291" text-anchor="middle" font-size="11" fill="currentColor">4. Khách mang IdP riêng, hoặc cần</text>
<text x="300" y="308" text-anchor="middle" font-size="11" fill="currentColor">định tuyến theo domain email?</text>
<rect x="470" y="272" width="220" height="64" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="580" y="292" text-anchor="middle" font-size="11" fill="currentColor">Lai: realm riêng cho nhóm đó,</text>
<text x="580" y="309" text-anchor="middle" font-size="11" fill="currentColor">Organizations cho phần còn lại</text>
<text x="580" y="326" text-anchor="middle" font-size="10" fill="currentColor">quyết lúc onboard (mục 3.4)</text>
<line x1="230" y1="318" x2="130" y2="368" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="160" y="338" text-anchor="middle" font-size="11" fill="currentColor">Không</text>
<line x1="370" y1="318" x2="350" y2="368" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc30-b-arrow)"/>
<text x="376" y="346" text-anchor="middle" font-size="11" fill="currentColor">Có</text>
<rect x="10" y="370" width="230" height="46" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="125" y="389" text-anchor="middle" font-size="11" fill="currentColor">Một realm, tenant là</text>
<text x="125" y="406" text-anchor="middle" font-size="11" fill="currentColor">attribute hoặc group</text>
<rect x="260" y="370" width="220" height="46" rx="8" fill="#84cc16" fill-opacity="0.3"/>
<text x="370" y="389" text-anchor="middle" font-size="11" fill="currentColor">Một realm + Organizations</text>
<text x="370" y="406" text-anchor="middle" font-size="11" fill="currentColor">(bài 17)</text>
</svg>

Nhánh "Có" của câu 2 không tự động là Keycloak: nó chỉ làm phép so giữa phần việc ở bảng 3.5 (vCPU, DB, giờ người) và phí vendor trở nên có nghĩa.

---

## 4. Lab

Đọc hiện vật thật ở 0, 1, 10, 50 realm khách. Script Python gọi Admin REST bằng `urllib`.

**Bước 1. Server riêng cho bài.** Unzip bản 26.8.1 vào `~/projects/keycloak-lab/lab-kc30/`:

```bash
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  bin/kc.sh start-dev --http-port=1500 --http-management-port=2500 --health-enabled=true
# [start first] ready_after=19.5s started_in=5.683s augmentation=12275ms
```

Lần đầu có bước augmentation 12,3 s như bài 6; tới khi `/health/ready` ở cổng 2500 trả 200 là 19,5 s.

**Bước 2. Client đóng vai `ops-portal`.** Client public trong `master`, bật password grant, không đụng gì khác:

```bash
# script gửi đúng body này qua POST /admin/realms/master/clients; bản kcadm tương đương:
kc create clients -r master -s clientId=admin-full -s publicClient=true \
  -s directAccessGrantsEnabled=true -s standardFlowEnabled=false
# [setup] create admin-full 201
```

**Bước 3. Tạo realm và đếm.** Vòng lặp `POST /admin/realms` với body `{"realm":"tN","enabled":true}`, lấy token admin mới trước mỗi lần (token `admin-cli` của `master` sống 60 s, bài 24). Sau mỗi mốc: `GET /admin/realms/master/roles/admin/composites`, và token của hai client.

```
[N=0]  admin_composites=22   admin-cli=750   admin-full=1749  (2 client, 24 role)
[create -> N=1]  1 realm, ms: median=446
[N=1]  admin_composites=43   admin-cli=750   admin-full=2293  (3 client, 45 role)
[create -> N=10] 9 realm, ms: min=148 median=255 max=540 total=2.5s
[N=10] admin_composites=232  admin-cli=750   admin-full=7191  (12 client, 234 role)
[create -> N=50] 40 realm, ms: min=185 median=277 max=567 total=12.1s
[N=50] admin_composites=1072 admin-cli=750   admin-full=29058 (52 client, 1074 role)
```

Composite tăng đúng 21 mỗi realm; token đầy đủ tăng đều, `admin-cli` đứng yên. Payload `admin-full` có thêm `realm_access` (`create-realm`, `admin`, `default-roles-master`, `offline_access`, `uma_authorization`) và một `resource_access` với 52 client. Mục của một realm, nguyên văn:

```
{"t1-realm":{"roles":["view-realm","view-identity-providers","manage-organizations",
 "manage-identity-providers","impersonation","create-client","manage-users","query-realms",
 ... 13 tên nữa ...]}}          # 398 byte JSON
```

Trong 21 tên có cả `manage-organizations`, `view-organizations`, `query-organizations`.

**Bước 4. Khởi động lại theo N.** SIGTERM rồi start lại cùng lệnh (không augmentation vì đã build):

| N | `started in` | tới `/health/ready` |
|---|---|---|
| 1 | 2,769 s | 3,1 s |
| 10 | 3,071 s | 3,3 s |
| 50 | 3,454 s | 3,7 s |

Thêm 49 realm rỗng, sẵn sàng chậm thêm 0,6 s, trên máy đang tải nên chưa tách được khỏi nhiễu. Kết luận được phép: ở 50 realm rỗng, khởi động không phải nút thắt; không ngoại suy ra 3.000.

**Bước 5. Cache `realms` và bộ nhớ.** Start lại với `--metrics-enabled=true`, gọi `/.well-known/openid-configuration` của 1, 10, rồi 50 realm, đọc metric ở cổng 2500 (`tmp-kc30-cache.py`, `run2.txt`):

```
DB chỉ có master        : vendor_statistics_number_of_entries{cache="realms"} 4
51 realm, vừa khởi động : 154
chạm 1 / 10 / 50 realm  : 172 / 334 / 1054
```

Mỗi realm chạm vào thêm đúng 18 entry. Bộ nhớ idle 20 s: DB chỉ có `master` RSS 416.448 KB, footprint 428 MB; 51 realm đã chạm hết RSS 506.256 KB, footprint 464 MB. Lab 1 của course thấy RSS một node dev dao động 442–514 MiB chỉ theo tải và GC, nên chênh 36 MB footprint này chưa đủ để viết "mỗi realm tốn X MB".

> **Đo trên lab (chạy riêng cho bài này).** Cấu hình như hộp ở mục 2. Output `run1.txt` (bước 1–4), `run2.txt` (cache, bộ nhớ 51 realm), `run3.txt` (bộ nhớ DB chỉ có master; chạy trên bản sao DB rỗng rồi trả lại DB 51 realm). Lần đo RSS bằng `ps` trong `run1.txt` cho các giá trị 36–428 MB không nhất quán dưới áp lực bộ nhớ của máy (macOS nén trang), nên bài chỉ dùng cặp số đo kèm `footprint` ở bước 5. Server đã dừng sau mỗi lượt.

> **Chưa đo.** Thời gian migrate DB khi nâng minor với N realm, và kích thước cache `realms` cho realm có client, role, flow thật. Đo bằng: dựng 500 realm từ một file mẫu của bài 24, nâng từ một bản minor cũ lên 26.8.1, đo thời gian từ start tới ready; đọc metric cache sau khi gọi token endpoint ở mọi realm.

---

## 5. Tính tay

**Bài 1. SaaS 300 khách B2B, 20 khách đòi SSO riêng (Azure AD, Okta, SAML).** Hợp đồng của cả 300 không ai đòi token lifespan, MFA policy hay theme riêng.

Thử C (realm-per-tenant):

- Composite `admin`: 21 × 300 + 22 = 6.322 role.
- Token admin đầy đủ: 1.749 + 546,2 × 300 ≈ 165.600 ký tự. Mọi client tự tạo trong `master` mà không bật lightweight đều mang cục này.
- Cache `realms` nếu cả 300 realm được dùng: tối thiểu 300 × 18 = 5.400 entry cho realm rỗng, hơn nửa trần 10.000.
- Config: 300 × 83.867 byte ≈ 25,2 MB; thêm một mapper cho mọi khách là 300 lần áp.
- Resource server tin 300 issuer.

Thử B (một realm + Organizations): 300 org; 20 org có IdP link và domain có Auto redirect; 280 org dùng mật khẩu, có thể không cần domain (tuỳ chọn từ 26.4, release notes). Composite giữ ở 43, token admin đầy đủ 2.293 ký tự, một issuer, một file cấu hình.

Câu 3 của cây trả lời "Không", câu 4 trả lời "Có": **B**. Lý do quyết định không phải là C đắt, mà là C mua cách ly key/session/theme mà không khách nào yêu cầu. Hai điểm phải làm thêm với B: bật Requires user membership nếu app chỉ phục vụ member, và dọn mật khẩu cũ của khách chuyển sang SSO (bài 17).

**Bài 2. Cùng SaaS, 3.000 khách; 30 khách lớn đòi access token 5 phút và MFA bắt buộc.**

C thuần, **ngoại suy** tuyến tính từ lab 0–50 realm rỗng (lab không dựng quá 50): composite 21 × 3.000 + 22 = 63.022; token đầy đủ 1.749 + 546,2 × 3.000 ≈ 1,64 triệu ký tự, khoảng 1,56 MiB, không đi qua header nào được; cache `realms` tối thiểu 3.000 × 18 = 54.000 entry, gấp 5,4 lần trần mặc định. C thuần bị loại bằng số.

Lai: realm `saas` cho 2.970 khách dùng Organizations, cộng realm riêng cho 30 khách lớn. Composite 21 × 31 + 22 = 673 role; token admin đầy đủ 1.749 + 546,2 × 31 ≈ 18.700 ký tự (nhưng cấu hình đúng là bật lightweight, còn 750); cache tối thiểu 31 × 18 = 558 entry. Resource server tin 31 issuer: một danh sách tĩnh.

Biến thể: dồn 30 khách lớn vào **một** realm thứ hai `saas-strict` (token 5 phút, MFA bắt buộc), composite 64, nhưng 30 khách chung key và session với nhau. Hợp đồng đòi "cấu hình khác" thì một realm cho cả nhóm là đủ; đòi "key riêng" thì phải 30 realm.

> **Chưa đo.** Số organization tối đa trong một realm và hiệu năng identity-first với 3.000 org: docs không có, lab không dựng. Đo bằng: tạo 3.000 org có domain qua Admin REST, đo latency bước nhập email bằng `flow.sh` của bài 17.

**Bài 3. Phần CPU của SaaS 300 khách nếu tự host.** Giả định (không phải số đo): trung bình 150 user mỗi khách, tức 45.000 user; 50% đăng nhập trong 15 phút đầu giờ; access token 5 phút nên mỗi session refresh khoảng mỗi 300 s.

- Login: 22.500 / 900 s = 25 login/s → 25 / 15 = 1,67 vCPU.
- Refresh: 22.500 session / 300 s = 75 refresh/s → 75 / 120 = 0,63 vCPU.
- Cộng 2,29 vCPU, nhân 2,5 cho 150% headroom: 5,73 vCPU cho cả cluster.
- DB: (25 + 75) / 100 × 1.400 = 1.400 write IOPS ở đỉnh.
- Ít nhất 2 node để rolling patch, mỗi node nền 1.250 MB.

Con số nhỏ. Thứ **không** nằm trong nó (người trực, tắt cluster mỗi lần nâng minor, build và test lại SPI) mới chi phối chi phí tự host ở quy mô này; phép so với phí vendor phải đặt giờ người cạnh máy.

---

## 6. Chuyển giao

1. Một khách ở realm chung đòi "trang login mang logo và màu của chúng tôi", không đòi gì khác. Bạn làm được mà không tách realm không, và cơ chế nào của theme (bài 24) quyết định câu trả lời?
2. `ops-portal` phải tạo realm cho khách mới nhưng không nên đọc user của mọi khách. Thiết kế quyền cho nó từ các role ở bước 3 của lab: role nào trong `master`, role nào trong realm mới, và token của nó còn tăng theo N không?
3. Bạn chạy 40 realm khách. Một CVE buộc nâng minor trong tuần. Liệt kê các bước theo thứ tự, chỗ nào downtime, chỗ nào phải có backup, và N = 40 thay đổi bước nào so với N = 1.
4. Khách lớn muốn tự xoá nhân viên nghỉ việc khỏi SaaS ngay lập tức nhưng không chịu cấu hình SCIM. Trong mô hình B, con đường nào khiến account biến mất khi Azure AD của họ khoá người đó, và con đường nào không?
5. Đội đề xuất chuyển từ Keycloak sang một IdP managed trong một quý. Dựa vào bốn câu hỏi ở mục 3.6, viết ra thứ tự migrate: cái gì đổi trước để cái sau không gãy, và cửa sổ nào hai IdP phải chạy song song?
6. Một SaaS có 2.000 khách ở Organizations và 20 khách ở realm riêng. Một khách ở realm riêng muốn quay về realm chung để được dùng chung tài khoản của consultant với các khách khác. Thiết kế cuộc di chuyển sao cho 300 nhân viên của khách đó không mất dữ liệu trong app khoá theo `sub`, SSO với Okta của họ không gãy quá một khung giờ đã báo trước, và token đang lưu hành của họ (lifespan 5 phút ở realm cũ) không bị app hiểu nhầm là của khách khác trong lúc chuyển.

---

## 7. Tóm tắt

- Mỗi realm thêm client `<realm>-realm` với 21 role vào `master`; composite `admin` = 21N + 22 (lab: 22, 43, 232, 1.072 ở N = 0, 1, 10, 50), khớp "hơn 2.000 với 100 realm" của docs.
- Token đầy đủ của một client trong `master` tăng 546,2 ký tự mỗi realm (1.749 → 29.058 ở 50 realm, ~165.600 ở 300); `admin-cli` lightweight đứng yên 750 ký tự. Chữa bằng lightweight hoặc quyền hẹp, không bằng nâng header proxy.
- Docs không đặt trần số realm, chỉ nói tuỳ dung lượng DB và dặn chỉnh cache `realms`/`users`/`authorization` (mặc định 10.000 entry). Lab: 18 entry mỗi realm rỗng vừa chạm discovery.
- Ở 50 realm rỗng, tạo realm ~0,25–0,28 s mỗi cái, khởi động lại 3,1 → 3,7 s: không phải nút thắt.
- A (attribute) không ràng IdP với khách; B (Organizations) ràng bằng domain và link nhưng chung key, session, theme; C (realm riêng) cách ly hết, trả giá theo N và bắt app chọn issuer trước login.
- Chuyển khách giữa realm đổi URL broker mà khách đã cấu hình: quyết định realm riêng phải chốt lúc onboard.
- Tự host trả bằng vận hành (15 login/s và 120 CC hoặc refresh/s mỗi vCPU, 150% headroom, 1.400 IOPS mỗi 100 thao tác/s, minor phải tắt cluster, SPI nội bộ); đổi lại được code trong luồng login và dữ liệu trên hạ tầng của mình.
- Lock-in nằm ở claim riêng của IdP, `sub` làm khoá, URL federation trong tay khách, và khả năng export hash; chữ ký JWS + `iss`/`aud`/`exp` thì không.

→ **Bài 31 — Sự cố thường gặp và checklist Keycloak engineer**: bài này chọn kiến trúc; bài cuối đọc những lỗi kiến trúc đó sinh ra lúc chạy thật, từ `invalid_grant` tới issuer lệch sau proxy, và gom mọi con số của course thành một checklist go-live.
