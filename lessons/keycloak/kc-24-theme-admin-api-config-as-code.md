# Bài 24 — Theme, Admin API, config-as-code

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc log khởi động có `--import-realm` và nói được file realm đã được áp hay bị bỏ qua, trước khi user báo lỗi 403.
- Tạo một service account chỉ có đúng role của client `realm-management` mà script cần, và đoán trước request Admin API nào của nó trả 403.
- Liệt kê ba loại dữ liệu nhạy cảm nằm trong file `kc.sh export` (secret client, hash mật khẩu, private key ký token) và thay secret bằng placeholder `${VAR}` trước khi đưa file vào Git.
- Chọn giữa `--import-realm`, `kc.sh import --override` và một công cụ reconcile (Terraform provider, keycloak-config-cli) theo ba câu hỏi: chạy lại có an toàn không, xoá được thứ đã gỡ khỏi file không, secret nằm ở đâu.
- Dựng một login theme kế thừa `keycloak.v2` bằng ba file, và biết khi nào thay đổi theme cần restart, khi nào cần `kc.sh build`.
- Giải thích vì sao sửa CSS của theme trên production mà trình duyệt người dùng vẫn thấy bản cũ.

---

## 2. Triệu chứng

Một SaaS B2B chạy Keycloak ở ba môi trường dev, staging, prod. Sau một sự cố "staging login được, prod thì không" (ai đó thêm redirect URI bằng tay trên admin console của staging rồi quên prod), team quyết định: realm `shop` phải nằm trong Git. Họ chạy `kc.sh export --realm shop`, commit file `shop-realm.json`, và cho container khởi động với `--import-realm`.

Hai tuần sau, một PR thêm realm role `order.write` vào file và thêm một redirect URI cho client `web`. PR được duyệt, pipeline xanh, Keycloak restart bình thường. Sáng hôm sau API đơn hàng (Spring, `hasAuthority('order.write')`, bài 12) trả 403 cho mọi người dùng. Mở admin console của prod: role `order.write` không tồn tại. Redirect URI mới cũng không có.

Log khởi động của Keycloak có đúng ba dòng liên quan, cả ba ở mức `INFO`:

```
KC-SERVICES0030: Full model import requested. Strategy: IGNORE_EXISTING
Realm 'shop' already exists. Import skipped
KC-SERVICES0032: Import finished successfully
```

Không `WARN`, không `ERROR`, dòng cuối còn ghi "successfully".

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 bản zip, OpenJDK 24.0.2, Mac mini Apple M4, cổng 4401 / management 5400 (cổng 4400 đã có process khác chiếm). Realm `shop` tạo bằng `kcadm.sh`, export bằng `kc.sh export`, sửa file bằng `jq` (thêm `order.write`, thêm redirect URI), chép vào `data/import/` rồi `start-dev --import-realm`. Ba dòng log trên trích nguyên từ `kc2.log`; sau đó `kcadm get roles -r shop` vẫn chỉ có `default-roles-shop`, `offline_access`, `uma_authorization`, `order.read`. Script và log: `~/projects/keycloak-lab/lab-kc24/`.

---

## ⏸ Dừng lại — đoán trước #1

File đúng định dạng, đúng thư mục, Keycloak có đọc nó. Vì sao role mới không vào DB?

```
(a) File phải tên đúng <realm>-realm.json; đặt tên khác thì Keycloak đọc nhưng không áp
(b) --import-realm chỉ tạo realm chưa có; realm đã tồn tại thì bỏ qua cả file
(c) Thay file trong data/import là thay đổi build-time, phải chạy kc.sh build trước khi start
(d) Import có áp, nhưng role nằm trong cache Infinispan cũ; restart lần nữa là thấy
```

---

## 3. Lý thuyết

### 3.1 Vì sao bấm tay là nợ, và vì sao file import chưa trả được nợ

Đáp án là **(b)**. Docs nói thẳng: *"If a realm already exists in the server, the import operation is skipped."* `--import-realm` là cơ chế **khởi tạo** (seed) cho realm chưa có, không phải cơ chế **đồng bộ**. Log `Strategy: IGNORE_EXISTING` đã nói đúng điều đó, ở mức INFO vì với Keycloak đây là hành vi bình thường. (a) sai: file đã đúng quy ước *"The realm file to be imported must be named <realm name>-realm.json"* và log gọi đúng realm `shop`. (c) sai: file import là dữ liệu, không phải build option (bài 6). (d) sai: `kcadm` đọc thẳng DB qua Admin API.

Nhưng lý do team đi tới file import mới là thứ cần hiểu. Cấu hình realm không nằm trong file nào cả, nó là các dòng trong DB của mỗi môi trường. Ba môi trường là ba DB, mỗi DB bị sửa bởi một nhóm người khác nhau qua console. **Drift** (trôi cấu hình) là trạng thái hai môi trường lẽ ra giống nhau mà khác nhau, và không ai biết khác ở đâu, vì không có bản ghi nào nói "ai đổi gì, lúc nào, so với cái gì".

Realm `shop` trong lab chỉ có 2 client tự tạo, 1 user, 2 role, còn lại mặc định. File dài 83.867 byte, 2.272 dòng, 121 khoá ở cấp cao nhất (`accessTokenLifespan`, `bruteForceProtected`, `otpPolicyDigits`, `browserFlow`, `clientPolicies`...). Mỗi khoá là một ô console có thể bị đổi ở staging rồi quên ở prod.

Config-as-code giải bài này bằng hai mảnh, thiếu mảnh nào cũng không xong:

1. **Một nguồn sự thật** đọc được bằng diff: file trong Git, review qua PR.
2. **Một cơ chế hội tụ** (reconcile): đọc trạng thái thật của Keycloak, so với file, rồi sửa cho khớp, chạy lại bao nhiêu lần cũng ra cùng kết quả.

Team trong triệu chứng có mảnh 1, còn mảnh 2 của họ chỉ hội tụ đúng một lần, lúc realm chưa tồn tại. Mọi cơ chế ở đó đều đi qua cùng một cửa: Admin REST API.

> **Nguồn.** `--import-realm` bỏ qua realm đã có (importExport, dòng #70); quy ước tên file (dòng #67) ([importExport](https://www.keycloak.org/server/importExport)).

### 3.2 Admin REST API: mọi cú click là một HTTP call

*"Keycloak comes with a fully functional Admin REST API with all features provided by the Admin Console."* Admin console (React) là một client của API này. `kcadm.sh` cũng vậy: *"The Admin CLI makes HTTP requests to Admin REST endpoints."* Không có thao tác nào console làm được mà API không làm được, nên mọi công cụ config-as-code bên dưới đều là "một client HTTP khác của cùng API".

API cần access token, và câu hỏi thật là **token của ai, mang quyền gì**.

Cách mặc định trong docs: đăng nhập `admin-cli` ở realm `master` bằng user admin. Lab đo token đó: `exp - iat = 60` giây, đúng như docs ghi *"By default this token expires in 1 minute"*. Decode ra không có `realm_access` hay `resource_access`: từ 26.0 `admin-cli` phát **lightweight access token** (token rút gọn, bỏ các claim như role), 750 byte mà không kể quyền gì. Quyền thật của user đó là role `admin` của master: *"Users with the admin role are superusers and have full access to manage any realm on the server."* Một script CI cầm credential này là cầm chìa khoá của **mọi realm**, kể cả xoá realm.

`kcadm config credentials` lưu access token và refresh token vào file config (lab: quyền `-rw-------`, 1.715 byte) để các lệnh sau dùng lại, tự refresh khi access token hết 60 giây. Lab đọc được refresh token của phiên đó hết hạn 1.800 giây sau khi phát. `--no-config` thì xác thực lại mỗi lệnh, không ghi gì xuống đĩa, hợp với CI hơn vì không để lại token trên runner.

Cách hẹp hơn là **least privilege** (chỉ cấp quyền tối thiểu cho việc cần làm): mỗi realm có sẵn client `realm-management`, mang các client role chia nhỏ quyền quản trị realm đó. Lab đếm được 22 role, từ `view-users`, `query-clients` tới `manage-clients`, `manage-users`, `manage-realm` và `realm-admin` (gộp tất cả). Tạo một service account ngay trong realm `shop` (bài 13 đã dạy service account), gán duy nhất `manage-clients`:

```bash
kc add-roles -r shop --uusername service-account-ops-bot \
   --cclientid realm-management --rolename manage-clients
```

Token client credentials của nó mang `"resource_access":{"realm-management":{"roles":["manage-clients"]}}` (token realm thường, không lightweight, nên role nằm trong token). Bốn request:

| Request bằng token `ops-bot` | HTTP |
|---|---|
| `POST /admin/realms/shop/clients` (tạo client `report-svc`) | 201 |
| `POST /admin/realms/shop/users` (tạo user `bob`) | 403 |
| `GET /admin/realms/shop/users` (chỉ đọc) | 403 |
| `GET /admin/realms/master/clients` (realm khác) | 403 |

Hai ranh giới: `manage-clients` không kèm quyền đọc user, và role của `shop` không với sang realm khác.

Chỗ hay sai: ví dụ trong docs tạo service account ở **master** rồi gán realm role `admin`: một superuser, quá rộng cho pipeline của một app.

Còn một tính chất của API quyết định mọi thứ phía sau: nó **mệnh lệnh** (imperative), không khai báo. Chạy lại `kc create clients -r shop -s clientId=report-svc` lần hai thì nhận `409` và `Client report-svc already exists`. Script bash gồm 40 lệnh `kcadm create` chỉ chạy đúng lần đầu; muốn chạy lại phải tự viết "có chưa thì tạo, có rồi thì so rồi sửa". Đó chính là việc các công cụ ở 3.4 làm hộ.

> **Nguồn.** Admin REST phủ mọi tính năng console; token admin-cli hết hạn sau 1 phút; ví dụ service account gán realm role `admin` (server_development, dòng #52–#54). Lightweight token cho `admin-cli` (release notes, dòng #55). kcadm là client HTTP, lưu token, `--no-config` (server_admin, dòng #56, #58, #59). Role `admin` của master là superuser (core-authn, dòng #29). Số 60 giây, 750 byte, 1.800 giây, 22 role, bảng 201/403 và 409: đo trên lab, `~/projects/keycloak-lab/lab-kc24/`.

---

## ⏸ Dừng lại — đoán trước #2

Bạn sắp commit file `kc.sh export --realm shop` vào Git. Trong bốn thứ sau, file chứa những gì?

```
(1) secret của client confidential (web, ops-bot)
(2) hash mật khẩu của user alice
(3) private key RSA dùng để ký access token của realm
(4) session đang đăng nhập của alice
```

---

### 3.3 Realm export/import: thứ nằm trong file, và hai kiểu import

Đáp án: **(1), (2), (3) có; (4) không.** Lab đếm 8 dòng nhạy cảm trong file:

- `"secret": "web-secret-123"`, `"secret": "ops-secret"` và secret 86 ký tự Keycloak tự sinh cho `report-svc`, đều ở dạng rõ.
- `credentials` của alice: `"algorithm":"argon2"`, `"hashIterations":5`, `memory 7168`, kèm `value` và `salt`. Hash chứ không phải mật khẩu, nhưng là đúng thứ kẻ tấn công cần để brute-force offline (bài 20).
- Component `rsa-generated` có `privateKey` bắt đầu bằng `MIIEogIBAAKCAQEA...`, cùng `secret` của key `aes-generated` và `hmac-generated-hs512`.

Private key nghĩa là: ai có file này ký được access token mà mọi API của bạn chấp nhận, đến khi bạn xoay key (bài 29). Session thì không có: *"Exported data does not include user and admin events, persisted sessions, workflow state or revoked tokens."*

Hai hệ quả. Thứ nhất, export bằng CLI là bản đầy đủ, dùng để chuyển server; export từng phần trên console thì che secret bằng dấu `*`, nên không dùng để tái tạo được, đúng như docs ghi *"Only CLI exports are suitable for backups or data transfer between servers."* Thứ hai, file CLI export không commit nguyên trạng được. Cách docs hỗ trợ là placeholder: *"You are able to use placeholders to resolve values from environment variables for any realm configuration."* Lab thay secret của `web` bằng `"${WEB_SECRET}"`, chạy `WEB_SECRET=from-env-777 kc.sh import --file ...`: client credentials với `from-env-777` qua bước xác thực client, còn với secret cũ `web-secret-123` thì `Invalid client or Invalid client credentials`. User và key thì không nên nằm trong file cấu hình: user là dữ liệu (bài 16, 23), key nên để Keycloak tự sinh ở mỗi môi trường.

Giờ đến import. Có hai đường, khác nhau ở đúng một điểm: gặp realm đã tồn tại thì làm gì.

**`--import-realm` lúc start** (3.1): `IGNORE_EXISTING`, bỏ qua.

**Lệnh `kc.sh import`**: *"The import and export commands are server launches that perform the import or export, then exit before bringing up the full server."* Và *"By default, the --override option is set to true so that realms are always overridden with the new configuration."* "Override" ở đây có nghĩa cụ thể. Lab tạo thêm client `hotfix-client` bằng tay (không có trong file), dừng server, chạy `kc.sh import --file shop-realm.json`. Log:

```
Realm 'shop' already exists. Removing it before import
Realm 'shop' imported
```

Sau khi start lại: `order.write` có, redirect URI mới có, `hotfix-client` **biến mất**. Realm bị xoá rồi tạo lại từ file. `id` của realm và `kid` của key RS256 giữ nguyên vì cả hai nằm trong file; đó là lý do token phát trước lúc import vẫn verify được. Lệnh mất 20,36 giây, trong đó 13,1 giây là augmentation.

Override nghe giống reconcile nhưng có ba cái giá. Nó xoá thứ không có trong file. Nó đòi dừng **mọi** node: *"The command does not attach to the cache cluster, so overwriting a realm will lead to inconsistent caches in the cluster, which then would show and use inconsistent or outdated information."* Và nó xoá cả realm, nên thứ không nằm trong file cũng đi theo (session, event).

<svg viewBox="0 0 700 290" role="img" aria-labelledby="kc24-a-t kc24-a-d" style="width:100%;height:auto">
<title id="kc24-a-t">Ba cách đưa file realm vào một realm đã tồn tại</title>
<desc id="kc24-a-d">Cùng file shop-realm.json có thêm role order.write, realm shop đã tồn tại và có client hotfix-client tạo tay. Cột một: start --import-realm bỏ qua, DB không đổi. Cột hai: kc.sh import với override xoá realm rồi tạo lại, order.write có nhưng hotfix-client mất và phải dừng mọi node. Cột ba: công cụ reconcile đọc trạng thái qua Admin API, so sánh rồi chỉ gửi POST, PUT hoặc DELETE cho phần khác, server vẫn chạy.</desc>
<defs><marker id="kc24-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="200" y="10" width="300" height="40" rx="8" fill="#64748b" fill-opacity="0.2"/>
<text x="350" y="27" text-anchor="middle" font-size="11" fill="currentColor">shop-realm.json (thêm order.write)</text>
<text x="350" y="42" text-anchor="middle" font-size="11" fill="currentColor">realm shop đã có, kèm hotfix-client</text>
<line x1="300" y1="50" x2="125" y2="78" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<line x1="350" y1="50" x2="350" y2="78" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<line x1="400" y1="50" x2="575" y2="78" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<rect x="20" y="80" width="210" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="125" y="101" text-anchor="middle" font-size="11" fill="currentColor">start --import-realm</text>
<rect x="245" y="80" width="210" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="350" y="101" text-anchor="middle" font-size="11" fill="currentColor">kc.sh import (override=true)</text>
<rect x="470" y="80" width="210" height="34" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="575" y="101" text-anchor="middle" font-size="11" fill="currentColor">Terraform / keycloak-config-cli</text>
<rect x="20" y="126" width="210" height="58" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="125" y="146" text-anchor="middle" font-size="11" fill="currentColor">Strategy: IGNORE_EXISTING</text>
<text x="125" y="162" text-anchor="middle" font-size="11" fill="currentColor">Realm 'shop' already exists.</text>
<text x="125" y="177" text-anchor="middle" font-size="11" fill="currentColor">Import skipped</text>
<rect x="245" y="126" width="210" height="58" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="350" y="146" text-anchor="middle" font-size="11" fill="currentColor">Realm 'shop' already exists.</text>
<text x="350" y="162" text-anchor="middle" font-size="11" fill="currentColor">Removing it before import</text>
<text x="350" y="177" text-anchor="middle" font-size="11" fill="currentColor">(server phải dừng)</text>
<rect x="470" y="126" width="210" height="58" rx="8" fill="#64748b" fill-opacity="0.15"/>
<text x="575" y="146" text-anchor="middle" font-size="11" fill="currentColor">GET trạng thái qua Admin API</text>
<text x="575" y="162" text-anchor="middle" font-size="11" fill="currentColor">so file, rồi POST/PUT/DELETE</text>
<text x="575" y="177" text-anchor="middle" font-size="11" fill="currentColor">(server vẫn chạy)</text>
<line x1="125" y1="184" x2="125" y2="206" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<line x1="350" y1="184" x2="350" y2="206" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<line x1="575" y1="184" x2="575" y2="206" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-a-arrow)"/>
<rect x="20" y="208" width="210" height="58" rx="8" fill="#ef4444" fill-opacity="0.22"/>
<text x="125" y="230" text-anchor="middle" font-size="11" fill="currentColor">DB không đổi</text>
<text x="125" y="246" text-anchor="middle" font-size="11" fill="currentColor">order.write: không có</text>
<rect x="245" y="208" width="210" height="58" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="350" y="230" text-anchor="middle" font-size="11" fill="currentColor">order.write: có</text>
<text x="350" y="246" text-anchor="middle" font-size="11" fill="currentColor">hotfix-client: mất</text>
<rect x="470" y="208" width="210" height="58" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="230" text-anchor="middle" font-size="11" fill="currentColor">chỉ phần khác bị sửa</text>
<text x="575" y="246" text-anchor="middle" font-size="11" fill="currentColor">(cơ chế, chưa chạy trong lab)</text>
<text x="350" y="284" text-anchor="middle" font-size="11" fill="currentColor">Hai cột trái: đo trên lab 26.8.1. Cột phải: cơ chế theo README, không đo.</text>
</svg>

Operator không cứu được chỗ này: CR `KeycloakRealmImport` cũng chỉ tạo mới, *"The Realm Import CR only supports creation of new realms and does not update or delete those."* (bài 26).

> **Nguồn.** Lệnh import/export là một lần khởi động riêng, `--override` mặc định true, override cần dừng mọi node (dòng #60, #63, #64); export không chứa event/session/revoked token (#62); placeholder `${VAR}` (#71); export từ console che secret, chỉ CLI export dùng để chuyển server (#72, #73) ([importExport](https://www.keycloak.org/server/importExport)). Realm Import CR chỉ tạo mới (dòng #74, #75) ([realm-import](https://www.keycloak.org/operator/realm-import)).

> **Suy luận.** Docs không nói `kc.sh import --override` làm mất session của realm. Nó suy ra từ hai dữ kiện: log ghi realm bị xoá trước khi import (lab), và file export không chứa persisted session (dòng #62), nên không có gì để tạo lại. Kiểm bằng: đăng nhập alice, giữ refresh token, chạy import override, rồi gọi refresh; kỳ vọng `invalid_grant`.

### 3.4 Công cụ reconcile: Terraform provider và keycloak-config-cli

Mảnh còn thiếu là một vòng lặp **đọc, so, sửa** chạy qua Admin API khi server đang chạy. Có hai công cụ phổ biến, cả hai đều nằm ngoài docs keycloak.org.

**Terraform provider `keycloak/keycloak`.** Fork từ provider cộng đồng (mrparkers), nay duy trì trong tổ chức Keycloak trên GitHub; README ghi *"This provider will officially support the latest three minor versions of Keycloak, although older versions may still work."* Mỗi client, role, mapper là một resource. Terraform giữ một **state file** ghi những resource nó đã tạo, và mỗi lần `plan` nó gọi API đọc trạng thái thật, so với file `.tf`, in ra diff trước khi `apply`.

Hai chi tiết trong docs provider đổi file dưới. Client `web` đã có (từ file import), nên phải khai `import = true`: *"When `true`, the client with the specified `client_id` is assumed to already exist, and it will be imported into state instead of being created."* Thiếu dòng đó, `apply` gửi POST và gặp `409` như ở 3.2. Service account ở realm `shop` được phép, nhưng từ 26.4: *"If your service account operates in a non-`master` realm without one of these roles, the provider cannot automatically detect the Keycloak version."* Provider chỉ cảnh báo rồi giả định bản mới nhất; ghim `keycloak_version` để bỏ phỏng đoán.

```hcl
# Minh hoạ cấu trúc — chưa chạy thật (máy lab không có terraform)
# Tên thuộc tính đối chiếu với docs provider keycloak/keycloak (critic)
terraform { required_providers { keycloak = { source = "keycloak/keycloak" } } }
provider "keycloak" {
  url           = "http://localhost:4401"   # Quarkus: không có /auth, base_path để trống
  realm         = "shop"                    # realm của service account, mặc định master
  client_id     = "ops-bot"                 # service account manage-clients ở 3.2
  client_secret = var.ops_secret
}
resource "keycloak_openid_client" "web" {
  realm_id            = "shop"
  client_id           = "web"
  access_type         = "CONFIDENTIAL"
  import              = true                # web đã có từ file import: nhận vào state, không POST
  valid_redirect_uris = ["https://shop.example/cb", "https://staging.shop.example/cb"]
}
```

**keycloak-config-cli** của adorsys, không thuộc tổ chức Keycloak: *"It is a Keycloak utility to ensure the desired configuration state for a realm based on a JSON/YAML file."* Định dạng file chính là định dạng realm export, nên đi từ file ở 3.3 sang công cụ này không phải viết lại.

So ba cách:

| | `--import-realm` / `KeycloakRealmImport` | `kc.sh import --override` | Terraform / keycloak-config-cli |
|---|---|---|---|
| Chạy lại trên realm đã có | ✓ an toàn, nhưng vì không làm gì | ✗ xoá rồi tạo lại cả realm | ✓ chỉ sửa phần khác (cơ chế) |
| Server phải dừng | ✗ không, chạy lúc start | ✓ mọi node phải dừng | ✗ không, gọi Admin API |
| Xoá thứ đã gỡ khỏi file | ✗ | ✓ xoá mọi thứ không có trong file, kể cả thứ tạo tay | Terraform: xoá resource có trong state; config-cli: xem dưới |
| Secret nằm ở đâu | trong file, hoặc `${VAR}` | trong file, hoặc `${VAR}` | biến khi chạy; Terraform còn ghi vào state |

Ba ô cuối cần nhãn riêng vì không đo.

> **Nguồn.** Terraform provider duy trì trong dự án Keycloak, hỗ trợ 3 minor mới nhất (README, dòng #78, #79) ([terraform-provider-keycloak](https://github.com/keycloak/terraform-provider-keycloak)). Thuộc tính resource, `import`, version từ 26.4, `client_secret_wo` (dòng T2–T4) ([openid_client](https://github.com/keycloak/terraform-provider-keycloak/blob/main/docs/resources/openid_client.md)). keycloak-config-cli của adorsys, áp YAML/JSON theo định dạng export qua Admin API (dòng #80) ([keycloak-config-cli](https://github.com/adorsys/keycloak-config-cli)). Docs keycloak.org không nhắc Terraform và không gọi keycloak-config-cli là công cụ chính thức (file nguồn, mục "Nguồn KHÔNG nói").

> **Chưa đo.** Ba điều trong bảng không có nguồn và chưa chạy (máy lab không có `terraform`): (1) Terraform chỉ biết xoá resource nằm trong state của nó, client tạo tay trên console thì Terraform không thấy, nên drift kiểu "thêm" vẫn lọt; (2) state file chứa secret ở dạng đọc được (docs chỉ nói thuộc tính write-only `client_secret_wo` thì *"Terraform does not store them in state or plan files"*); (3) keycloak-config-cli có xoá thứ bị gỡ khỏi file hay không, và theo cấu hình nào. Đo bằng: `terraform apply` một client, tạo tay một client khác, chạy `terraform plan` xem có đề xuất xoá không; `terraform state pull | grep client_secret`; với config-cli, gỡ một role khỏi YAML rồi chạy lại và `kcadm get roles`.

---

## ⏸ Dừng lại — đoán trước #3

Bạn có một login theme `acme` (đổi CSS và một câu chữ). Server prod chạy `kc.sh build` rồi `start --optimized`. Bạn thử hai cách giao theme: (A) thư mục `themes/acme/` chép vào sau khi build; (B) file `acme-theme.jar` chép vào `providers/` sau khi build. Rồi restart bằng đúng lệnh `start --optimized` cũ. Kết quả?

```
(a) Cả hai chạy, theme là tài nguyên tĩnh, không liên quan build
(b) Cả hai fail, mọi thay đổi ở thư mục cài đặt đều cần kc.sh build
(c) A chạy; B làm server từ chối khởi động cho tới khi build lại
(d) B chạy; A bị bỏ qua vì --optimized không quét thư mục themes/
```

---

### 3.5 Theme: kế thừa, cache, và hai cách deploy

**Theme** là bộ template, CSS, ảnh và file message quyết định giao diện các trang Keycloak tự render. Có năm loại: Account, Admin, Email, Login, Welcome; mọi loại trừ welcome chọn được theo realm trên console. Trang login dùng template Apache FreeMarker (`.ftl`) render ở server. Hệ quả bảo mật: *"Themes contain FreeMarker templates that the server renders at runtime, so a malicious template can run code as the Keycloak process."* Cài theme bên thứ ba là cài code chạy với quyền Keycloak, cạnh DB password và private key.

Docs dặn không sửa theme đóng gói sẵn mà tạo theme con: *"To simplify upgrading, do not edit the bundled themes directly. Instead create your own theme that extends one of the bundled themes."* Cơ chế kế thừa là khai `parent` trong `theme.properties`; khi cần một template, một file CSS hay một khoá message, Keycloak tìm ở theme con trước, không có thì hỏi parent, rồi parent của parent. Realm mới của 26 dùng `keycloak.v2` làm login theme mặc định, nên đó là parent hợp lý.

Theme `acme` trong lab chỉ có ba file:

```
themes/acme/login/theme.properties              parent=keycloak.v2
                                                import=common/keycloak
                                                styles=css/styles.css css/acme.css
themes/acme/login/resources/css/acme.css        .pf-v5-c-login__main { border-top: 6px solid #e11d48; }
themes/acme/login/messages/messages_en.properties  loginAccountTitle=Sign in to ACME Shop
```

<svg viewBox="0 0 700 250" role="img" aria-labelledby="kc24-b-t kc24-b-d" style="width:100%;height:auto">
<title id="kc24-b-t">Một trang login được ghép từ ba theme</title>
<desc id="kc24-b-d">Realm shop chọn login theme acme. Khi render trang login, khoá message loginAccountTitle lấy từ acme, file login.ftl và css/styles.css lấy từ keycloak.v2, phần message còn lại lấy từ base. Mỗi lần không tìm thấy ở theme con thì Keycloak hỏi parent.</desc>
<defs><marker id="kc24-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="20" width="200" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.22"/>
<text x="120" y="42" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">acme</text>
<text x="120" y="62" text-anchor="middle" font-size="11" fill="currentColor">css/acme.css</text>
<text x="120" y="78" text-anchor="middle" font-size="11" fill="currentColor">loginAccountTitle</text>
<text x="120" y="94" text-anchor="middle" font-size="11" fill="currentColor">(3 file tự viết)</text>
<rect x="250" y="20" width="200" height="90" rx="8" fill="#3b82f6" fill-opacity="0.22"/>
<text x="350" y="42" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">keycloak.v2</text>
<text x="350" y="62" text-anchor="middle" font-size="11" fill="currentColor">login.ftl (3.291 byte)</text>
<text x="350" y="78" text-anchor="middle" font-size="11" fill="currentColor">css/styles.css (4.243 byte)</text>
<text x="350" y="94" text-anchor="middle" font-size="11" fill="currentColor">class PatternFly v5</text>
<rect x="480" y="20" width="200" height="90" rx="8" fill="#64748b" fill-opacity="0.22"/>
<text x="580" y="42" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">base (abstract)</text>
<text x="580" y="62" text-anchor="middle" font-size="11" fill="currentColor">messages_en (31.634 byte)</text>
<text x="580" y="78" text-anchor="middle" font-size="11" fill="currentColor">40 locale</text>
<text x="580" y="94" text-anchor="middle" font-size="11" fill="currentColor">template gốc</text>
<line x1="220" y1="65" x2="248" y2="65" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-b-arrow)"/>
<line x1="450" y1="65" x2="478" y2="65" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc24-b-arrow)"/>
<text x="350" y="132" text-anchor="middle" font-size="11" fill="currentColor">mũi tên: parent; không tìm thấy ở theme trái thì hỏi theme phải</text>
<rect x="120" y="150" width="460" height="86" rx="8" fill="#84cc16" fill-opacity="0.2"/>
<text x="350" y="170" text-anchor="middle" font-size="11" fill="currentColor">GET /realms/shop/.../auth (loginTheme=acme) render ra:</text>
<text x="350" y="188" text-anchor="middle" font-size="11" fill="currentColor">tiêu đề "Sign in to ACME Shop"  (từ acme)</text>
<text x="350" y="204" text-anchor="middle" font-size="11" fill="currentColor">.../acme/css/styles.css: 200, 4.243 byte (từ keycloak.v2)</text>
<text x="350" y="220" text-anchor="middle" font-size="11" fill="currentColor">.../acme/css/acme.css: 200, 56 byte (từ acme)</text>
</svg>

Đặt `loginTheme=acme` cho realm `shop`: trang login đổi tiêu đề, HTML nạp `.../login/acme/css/styles.css` dù file nằm trong `keycloak.v2`. URL mang tên theme con, việc tìm file đi theo chuỗi parent. Phải liệt kê lại `css/styles.css` trong `styles=` vì khoá này thay hẳn danh sách của parent chứ không cộng thêm. Lab kiểm bằng theme `acme3` chỉ ghi `styles=css/acme.css`: HTML còn hai file PatternFly (đến từ `stylesCommon`, khoá khác) và `acme.css`, mất hẳn `styles.css` của `keycloak.v2`.

**Cache.** Ở `start-dev`, sửa `messages_en.properties` lúc server đang chạy rồi tải lại trang: thấy ngay chữ mới, và CSS trả `Cache-Control: no-cache`. Ở `start --optimized`, cùng thao tác đó: trang vẫn hiện chữ cũ, CSS trả `Cache-Control: max-age=2592000` (30 ngày). Docs đưa ba option để tắt cache khi phát triển, *"--spi-theme--static-max-age=-1 --spi-theme--cache-themes=false --spi-theme--cache-templates=false"*, và dặn *"Be sure to re-enable caching in production as it will significantly impact performance."*

**Deploy: thư mục hay JAR.** Đáp án hộp ⏸ #3 là **(c)**. Docs ở đây mâu thuẫn và cần đọc cả hai bên. Guide theme chỉ nói đóng theme thành archive (JAR có `META-INF/keycloak-themes.json`) rồi *"To deploy the archive to Keycloak, add it to the providers/ directory of..."*, kèm restart, không nhắc build. Guide SPI nói mọi thứ trong `providers/` cần build lại: *"After registering new providers or dependencies Keycloak needs to be re-built with a non-optimized start or the..."* Lab đo cả hai đường trên cùng bản cài đã `kc.sh build`:

- JAR `acme-theme.jar` (1.949 byte, 12 entry) chép vào `providers/`, chạy `start --optimized`: process thoát sau 0,58 giây, mã thoát 2, đúng một dòng `A provider JAR was updated since the last build, please rebuild for this to be fully utilized.` (cùng thông báo bài 22 gặp với authenticator). Sau `kc.sh build` (13,63 giây) thì start được và theme `acme-jar` render đúng.
- Thư mục `themes/acme2/` chép vào **sau** lần build đó, chạy `start --optimized`: start bình thường, đặt `loginTheme=acme2` là thấy chữ của nó. `serverinfo` liệt kê `acme`, `acme-jar`, `acme2`, `keycloak`, `keycloak.v2`.

Vậy trên 26.8.1: JAR theme theo luật provider (bài 22), thư mục `themes/` thì chỉ cần restart. Với `start` không `--optimized`, docs nói build ngầm chạy lúc start (dòng #36, bài 6), nên JAR cũng qua, đổi lại mỗi lần start trả thêm bước augmentation (lab: 12,5 đến 13,1 giây).

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1, `kc.sh build --db=dev-file --health-enabled=true` rồi `start --optimized --http-enabled=true --hostname-strict=false`, cổng 4401. Kết quả cache (`no-cache` ở dev, `max-age=2592000` ở prod, sửa message không hiện ở prod), mã thoát 2 với JAR chưa build, thư mục thêm sau build vẫn chạy: `kc4.log`, `kc5b.log`, `kc6.log`, `build2.log` trong `~/projects/keycloak-lab/lab-kc24/`.

> **Nguồn.** Năm loại theme, mọi loại trừ welcome chọn trên console, không sửa theme bundled, FreeMarker chạy với quyền process, ba option tắt cache và dặn bật lại ở production, deploy JAR vào `providers/` (dòng #40–#48) ([themes](https://www.keycloak.org/ui-customization/themes)). `keycloak.v2` là login theme mặc định cho realm mới (dòng #49, release notes). Thêm provider phải build lại (dòng #8) ([server_development](https://www.keycloak.org/docs/latest/server_development/index.html)).

> **Suy luận.** Đoạn `lfdqf` trong `/resources/lfdqf/login/...` giống hệt nhau ở 4 lần khởi động (1 dev, 3 prod) và 2 lần `kc.sh build` trên lab, dù nội dung theme đã đổi giữa các lần. Kết hợp với `max-age=2592000`: trình duyệt đã tải `acme.css` có quyền dùng bản cũ tới 30 ngày mà không hỏi lại server, vì URL không đổi. Docs không nói đoạn này sinh từ đâu và khi nào đổi. Kiểm bằng: so đoạn đó giữa hai bản Keycloak khác nhau; nếu chỉ đổi khi nâng version thì sửa CSS giữa hai lần nâng phải đổi tên file (`acme-v2.css`) để phá cache.

---

## 4. Lab

Chạy trên `~/projects/keycloak-lab/lab-kc24/keycloak-26.8.1` (giải nén từ zip), wrapper `kc` = `kcadm.sh "$@" --config .../lab-kc24/kcadm.config`. Output của các bước đã trích ở mục 3 thì ở đây chỉ trỏ lại.

**Bước 1: dựng realm bằng Admin API.** Làm gì: `start-dev` cổng 4401, đăng nhập kcadm vào master, tạo realm, client, role, user.

```bash
kc config credentials --server http://localhost:4401 --realm master --user admin --password admin
kc create realms -s realm=shop -s enabled=true -i
kc create clients -r shop -s clientId=web -s publicClient=false -s secret=web-secret-123 \
   -s 'redirectUris=["https://shop.example/cb"]' -i
kc create clients -r shop -s clientId=ops-bot -s publicClient=false -s secret=ops-secret \
   -s serviceAccountsEnabled=true -s standardFlowEnabled=false -i
```

Thấy gì: mỗi lệnh `-i` in ra id; lần start đầu augmentation 12690 ms, `started in 7.532s`. Vì sao: mỗi `kc create` là một `POST /admin/realms/...` như console gửi.

**Bước 2: service account hẹp.** Gán `manage-clients` (lệnh ở 3.2), lấy token client credentials, gọi bốn request: kết quả là bảng 201/403 ở 3.2. Token `ops-bot` có `exp - iat = 300` giây (realm `shop` để mặc định), so với 60 giây của token admin-cli ở master.

**Bước 3: export.** Dừng server trước, vì *"Consistency of an export is not guaranteed unless all Keycloak nodes are stopped prior to running the export."* Rồi `bin/kc.sh export --realm shop --file ../shop-realm.json`. Thấy gì: `KC-SERVICES0034: Export of realm 'shop' requested.` rồi `KC-SERVICES0035: Export finished successfully`, tổng 18,28 giây (12,6 giây là augmentation). File 83.867 byte; user `alice` 717 byte khi nén một dòng. Nội dung nhạy cảm: 3.3.

**Bước 4 và 5: hai kiểu import.** `start-dev --import-realm` với file đã sửa: ba dòng INFO ở mục 2. Tạo tay `hotfix-client`, dừng server, `kc.sh import --file ...`: kết quả 3.3, realm id `33f39852-...` giữ nguyên, JWKS vẫn kid `WuH34-8GkJJn1hDXZkQkhE-...` trùng header của token `ops-bot` phát trước import.

**Bước 6: placeholder.** Secret của `web` thành `"${WEB_SECRET}"`, chạy `WEB_SECRET=from-env-777 kc.sh import ...`, rồi gọi client credentials bằng hai secret. Với `from-env-777`: `unauthorized_client`, mô tả lỗi nói client chưa bật service account, tức đã qua bước xác thực client. Với `web-secret-123`: `Invalid client or Invalid client credentials`. Placeholder đã được thay lúc import.

**Bước 7: theme.** Ba file `acme`, `kcadm update realms/shop -s loginTheme=acme`, `curl` URL `/auth?client_id=web&...`; rồi lần lượt sửa message ở `start-dev`, sửa message ở `start --optimized`, chép JAR, chép thư mục `acme2`, thử `acme3`. Kết quả: 3.5.

**Terraform: chưa chạy.** Máy lab không có `terraform` lẫn `tofu`. Kỳ vọng với file ở 3.4: `ops-bot` của bước 2 `apply` được `keycloak_openid_client`, khai `keycloak_user` thì 403 như bước 2.

Dừng server bằng SIGTERM sau bước cuối; `lsof -iTCP:4401` không còn process.

---

## 5. Tính tay

**Bài 1: token admin trong job CI.** Job deploy chạy `kcadm config credentials` lúc 10:00:00 (user admin, realm master), rồi chạy migration DB 35 phút, rồi gọi `kcadm update clients/...` lúc 10:35:00. Số từ lab: access token 60 giây, refresh token 1.800 giây kể từ lúc phát. Lệnh lúc 10:35 có chạy không?

Access token hết lúc 10:01:00. kcadm sẽ refresh, nhưng refresh token hết lúc 10:00:00 + 1.800 s = 10:30:00, sớm hơn lệnh 5 phút. Refresh fail, lệnh fail dù job "đã đăng nhập". Hai cách sửa, mỗi cách theo một cơ chế: đăng nhập lại ngay trước bước gọi API, hoặc dùng `--no-config` với service account để mỗi lệnh tự xin token mới. Cách thứ hai còn bỏ được credential superuser (3.2).

**Bài 2: export một realm 120.000 user.** Docs: trên 50.000 user thì export ra thư mục, chiến lược `different_files` mặc định 50 user/file. Số file user: 120.000 / 50 = **2.400 file**. Ước dung lượng phần user: 120.000 × 717 byte = 86.040.000 byte ≈ 86 MB, cộng phần cấu hình realm (63.593 byte ở lab, không đổi theo số user).

> **Suy luận.** Docs không cho kích thước mỗi user trong file export. 717 byte là user `alice` ở lab: một credential, không attribute, không group. User có OTP, nhiều attribute hay federation link sẽ lớn hơn; nhân 120.000 chỉ cho cận dưới. Kiểm bằng: export realm thật ra thư mục, `du -sh`.

**Bài 3: CSS cũ sau khi deploy.** Bạn sửa `acme.css` (đổi màu thương hiệu), build image mới, deploy lúc 09:00 ngày 1/11. Một khách hàng đã mở trang login lần cuối lúc 14:00 ngày 20/10 với bản cũ. Theo `max-age=2592000` và đường dẫn `/resources/lfdqf/...` không đổi (hộp Suy luận ở 3.5), trình duyệt đó được phép dùng bản cũ tới 14:00 ngày 19/11, tức 18 ngày 5 giờ sau khi deploy (20/10 + 30 ngày = 19/11). Đổi tên file sang `acme-v2.css` và sửa dòng `styles=` làm URL đổi, trình duyệt tải bản mới ngay lần mở kế tiếp.

---

## 6. Chuyển giao

1. Một đồng nghiệp đề xuất dùng `kc.sh import --override` trong pipeline mỗi lần merge PR, "vì nó áp được thay đổi lên realm đã có". Cụm prod có 3 node. Liệt kê những gì phải xảy ra quanh lệnh đó để nó không làm hỏng cache, và người dùng đang đăng nhập thấy gì.
2. Bạn cần một pipeline chỉ được tạo và sửa client của realm `shop`, không được đụng user. Ngoài `manage-clients`, nó có cần `view-clients` hay `query-clients` để Terraform `plan` chạy được không? Bạn kiểm điều đó bằng request nào trước khi cấp?
3. Theme email: một template email đặt lại mật khẩu đổi câu chữ. Nó thuộc loại theme nào, chọn ở đâu, và trường hợp nào bạn không kiểm được nó bằng `curl` như theme login?
4. File realm trong Git dùng `${WEB_SECRET}`. Có người chạy `kc.sh export` lại trên prod để "cập nhật file cho khớp" rồi commit. Commit đó chứa gì, và bạn chặn chuyện này ở bước nào của pipeline?
5. Realm `shop` ở staging và prod được import từ cùng một file có chứa key RSA. Một access token phát ở staging gửi tới API prod có verify được chữ ký không? Còn bị chặn ở bước kiểm nào khác (bài 12)?
6. Team chọn keycloak-config-cli cho config realm và Terraform cho client. Hai công cụ cùng quản lý realm `shop`, mỗi cái có ý niệm riêng về "trạng thái mong muốn". Nếu một client xuất hiện trong YAML của config-cli (vì ai đó export lại cả realm) nhưng đồng thời là resource Terraform với redirect URI khác, mỗi lần pipeline chạy thì chuyện gì xảy ra, và bạn chia quyền sở hữu giữa hai công cụ thế nào để mỗi đối tượng có đúng một chủ?

---

## 7. Tóm tắt

- Cấu hình realm là dòng trong DB từng môi trường; bấm tay thì không có diff, không có lịch sử, drift là mặc định. Realm tối giản ở lab đã có 121 khoá cấp cao, 83.867 byte.
- Admin REST API phủ mọi tính năng console; console, `kcadm.sh`, Terraform provider và keycloak-config-cli đều là client của nó. API là mệnh lệnh: tạo trùng client trả 409.
- Token `admin-cli` của master sống 60 giây, lightweight, và mang quyền superuser mọi realm. Service account trong realm đích với một role `realm-management` (lab: `manage-clients`) tạo được client (201) nhưng 403 với user và với realm khác.
- `kc.sh export` từ CLI chứa secret client dạng rõ, hash argon2 của user, private key ký token; không chứa session, event, revoked token. Placeholder `${VAR}` thay secret lúc import (đo được).
- `--import-realm` và `KeycloakRealmImport` chỉ tạo realm mới; realm đã có thì bỏ qua, log mức INFO `Import skipped`. `kc.sh import` mặc định override: xoá realm rồi tạo lại, mất cả thứ tạo tay, và đòi dừng mọi node.
- Reconcile liên tục cần công cụ ngoài docs: Terraform provider `keycloak/keycloak` (dự án Keycloak duy trì, hỗ trợ 3 minor mới nhất) hoặc keycloak-config-cli (adorsys, không chính thức). Hành vi xoá và chỗ secret nằm trong state: chưa đo.
- Theme có 5 loại, kế thừa qua `parent` (nên extend `keycloak.v2`), template FreeMarker chạy với quyền process Keycloak; `styles=` thay hẳn danh sách của parent.
- Dev: cache theme tắt, CSS `no-cache`. Prod: cache bật, CSS `max-age=2592000` (30 ngày), sửa file không hiện tới khi restart. JAR theme trong `providers/` với `start --optimized` chưa build: thoát mã 2; thư mục `themes/` chỉ cần restart.

→ **Bài 25 — Clustering**: lệnh import override phải dừng mọi node vì nó không gắn vào cache cluster; bài sau mở chính cache cluster đó ra: Infinispan giữ gì, node tìm nhau thế nào, và giết một node thì session còn không.
