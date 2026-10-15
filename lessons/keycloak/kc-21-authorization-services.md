# Bài 21 — Authorization Services: resource, policy, permission và cái giá của một round-trip

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dựng một resource server (resource, scope, policy, permission) bằng `kcadm.sh` và nói được bật Authorization thì Keycloak tạo sẵn gì.
- Tính bằng giấy UNANIMOUS / AFFIRMATIVE / CONSENSUS ở **hai tầng** (policy trong permission, permission trong resource server).
- Đoán đúng một request rơi vào resource chưa có permission sẽ ra 200 hay 403 dưới ENFORCING / PERMISSIVE / DISABLED, kể cả ca "resource có permission cho scope khác".
- Xin quyết định bằng grant `uma-ticket` ở hai dạng (decision và RPT), decode RPT, và giải thích vì sao RPT là ảnh chụp.
- So latency một lần xin decision với verify token tại chỗ và tính chi phí khi API đòi decision cho mọi request.
- Chọn giữa Authorization Services và RBAC trong code app theo tiêu chí cụ thể.

---

## 2. Triệu chứng

Một app thương mại điện tử muốn gom quyết định "ai được hoàn tiền đơn hàng" về Keycloak thay vì rải `if (user.hasRole(...))` trong code. Team bật Authorization cho client `orders-api`, tạo resource `order` với hai scope `view`, `refund`, hai role policy `p-staff` (role `staff`) và `p-support` (role `support`), rồi một scope permission `order-refund` gắn cả hai policy. Ý định ghi trong ticket: *nhân viên hoặc support đều được hoàn tiền*.

Test bằng `response_mode=decision` với ba user: alice chỉ có `staff`, bob có `staff` và `support`, carol không có role nào.

```
alice order#refund = 403 {"error":"access_denied","error_description":"not_authorized"}
bob   order#refund = 200 {"result":true}
carol order#refund = 403 (cùng body như alice)
alice order#view   = 403   bob order#view = 403   carol order#view = 403
```

Hai điều không khớp ý định. Alice là nhân viên mà bị từ chối hoàn tiền. Và `order#view`, thứ chưa ai viết dòng rule nào, bị từ chối với cả ba người, kể cả bob.

> **Đo trên lab (chạy riêng cho bài này).** Keycloak 26.8.1 `start-dev`, OpenJDK 24.0.2, Mac mini Apple M4, cổng 6200, management 7200. Kết quả trên là output thật của `uma.py matrix` (`m1.out`). Script và output: `~/projects/keycloak-lab/lab-kc21/`.

---

## ⏸ Dừng lại — đoán trước #1

Vì sao alice (có role `staff`, mà `p-staff` đòi đúng role `staff`) bị 403?

```
(a) Access token của alice không mang realm role, cần thêm mapper roles
(b) Permission mặc định đòi MỌI policy gắn vào nó cùng cho kết quả dương
(c) response_mode=decision chỉ dùng được với RPT, phải xin RPT trước
(d) Keycloak cache quyết định, đợi 5 phút là alice qua
```

---

## 3. Lý thuyết

RBAC và ABAC là gì: `security/sec-05-authn-authz.md` §6. Câu hỏi ở đây hẹp hơn: chuyển quyết định phân quyền **ra khỏi code app vào Keycloak** thì Keycloak ghép các mảnh quyết định ra sao, và mỗi request trả giá bao nhiêu.

### 3.1 Năm đối tượng, và vì sao policy tách khỏi permission

Đáp án là **(b)**. Để thấy vì sao, phải biết Keycloak chia một quyết định thành mấy mảnh.

**Resource server** là client được bật Authorization, nơi chứa mô hình quyền của một API. Chỉ client confidential (có secret) làm được: *"In Keycloak, any confidential client application can act as a resource server."* Lab với client public: **tạo mới** kèm `authorizationServicesEnabled=true`, `serviceAccountsEnabled=true` thì kcadm báo `unknown_error`, log ghi `RuntimeException: Only confidential clients are allowed to set authorization settings` (không bật service account thì lỗi là `Client does not have a service account`). **Cập nhật** một client public đã có thì không lỗi gì, nhưng `authorizationServicesEnabled` vẫn `null` và `authz/resource-server` trả "Resource not found". Script provisioning chạy xanh mà không bật gì.

**Resource** là đối tượng được bảo vệ (`order`, `invoice`), có thể kèm `type` và `uris`. Mặc định resource thuộc sở hữu resource server: *"By default, resources are owned by the resource server."* Lab đọc lại thấy `owner: orders-api` cho cả hai resource.

**Scope** là hành động trên resource. Docs gọi nó là động từ: *"In authorization policy terminology, a scope is one of the potentially many verbs that can logically apply to a resource."* Scope ở đây không phải OAuth scope trong tham số `scope=openid profile` (bài 9); trùng tên, khác tầng.

**Policy** là một điều kiện, không gắn với đối tượng nào: *"Unlike permissions, you do not specify the object being protected"*. `p-staff` chỉ nói "user có role `staff`", không biết gì về đơn hàng.

**Permission** là nơi đối tượng gặp điều kiện: *"A permission associates the object being protected with the policies that must be evaluated to determine whether access is granted."*

Tách policy khỏi permission để tái sử dụng: `p-staff` gắn được vào hàng chục permission (hoàn tiền, xem hoá đơn, xuất báo cáo), sửa điều kiện ở một chỗ. Cái giá là quyết định cuối cùng phải **ghép** nhiều kết quả, và luật ghép mới là thứ làm alice trượt.

Loại policy có sẵn trên server lab, đọc từ `GET .../authz/resource-server/policy/providers`:

```
["regex","role","resource","scope","client","time","user","client-scope","group","aggregate"]
```

Trong danh sách này, `resource` và `scope` là hai kiểu **permission**, phần còn lại là kiểu policy (`aggregate` là policy gộp nhiều policy khác). Không có `js`: tạo `policy/js` qua admin API trả "Resource not found". Khớp với docs: *"By default, JavaScript Policies can not be uploaded to the server."*

Hai kiểu permission khác nhau ở phạm vi. **Scope-based** (`order-refund`) chỉ phủ đúng các scope được liệt kê, nên `order#view` không được nó phủ. **Resource-based** phủ resource nói chung: lab tạo `invoice-staff` (resource permission, policy `p-staff`) thì `invoice#view` ra 200 cho alice và bob, 403 cho carol, dù permission không nhắc tới scope `view`.

Bật Authorization tạo sẵn gì? Lab đọc ngay sau khi tạo `orders-api` kèm cờ bật (và với `reports-api` tạo trước, bật sau, kết quả giống hệt):

```json
{"policyEnforcementMode":"ENFORCING","decisionStrategy":"UNANIMOUS",
 "allowRemoteResourceManagement":true,"resources":[],"policies":[],"scopes":[]}
```

Không có Default Resource, Policy hay Permission nào. Thứ được tạo: service account, và user `service-account-orders-api` có client role `orders-api:uma_protection`. Ảnh chụp "Default Policy" trên blog cũ không áp cho provisioning bằng API trên 26.8.1.

> **Nguồn.** Guide 26.8.1 không nhắc Default Resource/Policy/Permission; code `RepresentationToModel.createResourceServer` tag 26.8.1 chỉ tạo resource server, role `uma_protection`, bật service account. Chặn client public: *"throw new RuntimeException("Only confidential clients are allowed to set authorization settings");"* ([RepresentationToModel.java#L1863](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/utils/RepresentationToModel.java#L1863)). Định nghĩa: [terminology](https://www.keycloak.org/docs/latest/authorization_services/index.html#_overview_terminology).

> **Chưa đo.** Lab chỉ đi qua Admin REST API; Admin Console có tự tạo đối tượng mẫu không thì chưa kiểm. Đo bằng: bật trên console cho client mới, rồi `kc get clients/<id>/authz/resource-server/resource -r <realm>`.

### 3.2 Decision strategy: hai tầng ghép, cả hai mặc định UNANIMOUS

Quyết định đi qua hai lần ghép. Tầng một, **trong mỗi permission**: ghép kết quả các policy gắn vào nó. Tầng hai, **trong resource server**: ghép kết quả các permission cùng phủ một resource/scope được hỏi. Mỗi tầng có `decisionStrategy` riêng, và cả hai mặc định là UNANIMOUS.

<svg viewBox="0 0 700 290" role="img" aria-labelledby="kc21-a-t kc21-a-d" style="width:100%;height:auto">
<title id="kc21-a-t">Hai tầng decision strategy</title>
<desc id="kc21-a-d">Policy p-staff và p-support cho kết quả dương hoặc âm, được ghép trong permission order-refund theo strategy của permission; các permission cùng phủ order refund lại được ghép trong resource server theo strategy của resource server, rồi mới ra quyết định 200 hoặc 403.</desc>
<defs><marker id="kc21-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="90" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Policy</text>
<text x="330" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Tầng 1: permission</text>
<text x="575" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Tầng 2: resource server</text>
<rect x="20" y="40" width="140" height="40" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="90" y="57" text-anchor="middle" font-size="11" fill="currentColor">p-staff</text>
<text x="90" y="72" text-anchor="middle" font-size="11" fill="currentColor">alice: dương</text>
<rect x="20" y="100" width="140" height="40" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="90" y="117" text-anchor="middle" font-size="11" fill="currentColor">p-support</text>
<text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor">alice: âm</text>
<rect x="20" y="190" width="140" height="40" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="90" y="207" text-anchor="middle" font-size="11" fill="currentColor">p-support</text>
<text x="90" y="222" text-anchor="middle" font-size="11" fill="currentColor">alice: âm</text>
<rect x="240" y="60" width="180" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="330" y="82" text-anchor="middle" font-size="11" fill="currentColor">order-refund</text>
<text x="330" y="98" text-anchor="middle" font-size="11" fill="currentColor">strategy: UNANIMOUS</text>
<text x="330" y="112" text-anchor="middle" font-size="11" fill="currentColor">mặc định</text>
<rect x="240" y="180" width="180" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="330" y="202" text-anchor="middle" font-size="11" fill="currentColor">order-refund-support</text>
<text x="330" y="218" text-anchor="middle" font-size="11" fill="currentColor">strategy: UNANIMOUS</text>
<rect x="490" y="110" width="170" height="70" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="575" y="132" text-anchor="middle" font-size="11" fill="currentColor">orders-api</text>
<text x="575" y="148" text-anchor="middle" font-size="11" fill="currentColor">strategy: UNANIMOUS</text>
<text x="575" y="164" text-anchor="middle" font-size="11" fill="currentColor">ghép mọi permission</text>
<rect x="510" y="225" width="130" height="40" rx="8" fill="#ef4444" fill-opacity="0.25"/>
<text x="575" y="249" text-anchor="middle" font-size="11" fill="currentColor">alice: 403</text>
<line x1="160" y1="60" x2="238" y2="82" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
<line x1="160" y1="120" x2="238" y2="100" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
<line x1="160" y1="210" x2="238" y2="210" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
<line x1="420" y1="90" x2="488" y2="135" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
<line x1="420" y1="210" x2="488" y2="160" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
<line x1="575" y1="180" x2="575" y2="223" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc21-a-arrow)"/>
</svg>

Ba strategy, áp giống nhau ở cả hai tầng:

- **UNANIMOUS**: mọi thành phần phải dương. Một âm là âm.
- **AFFIRMATIVE**: chỉ cần một thành phần dương.
- **CONSENSUS**: đếm, dương nhiều hơn âm thì dương; **hoà thì âm**.

Alice ở permission `order-refund`: `p-staff` dương, `p-support` âm. UNANIMOUS ra âm. Đó là toàn bộ triệu chứng: ý định "staff **hoặc** support" là AFFIRMATIVE, còn mặc định là "staff **và** support". Lab đổi strategy của riêng permission đó, giữ nguyên mọi thứ khác:

| Strategy của `order-refund` | alice (staff) | bob (staff + support) | carol (không role) |
|---|---|---|---|
| UNANIMOUS (mặc định) | 403 | 200 | 403 |
| AFFIRMATIVE | 200 | 200 | 403 |
| CONSENSUS | 403 (1 dương, 1 âm, hoà) | 200 | 403 |

Dòng CONSENSUS hay bị đoán sai: với **hai** policy, CONSENSUS không bao giờ khác UNANIMOUS, vì 1–1 là hoà và hoà ra âm; nó chỉ có nghĩa từ ba policy trở lên.

Tầng hai chỉ lộ ra khi có từ hai permission phủ cùng một chỗ. Lab đặt `order-refund` thành AFFIRMATIVE (alice qua), rồi thêm permission thứ hai `order-refund-support` chỉ gắn `p-support`, cũng phủ `order#refund`:

| Strategy của resource server `orders-api` | alice | bob | carol |
|---|---|---|---|
| UNANIMOUS (mặc định) | 403 | 200 | 403 |
| AFFIRMATIVE | 200 | 200 | 403 |

Alice qua tầng một, trượt ở tầng hai vì permission thứ hai âm. Lỗi này xuất hiện khi hai người thêm permission vào cùng resource ở hai thời điểm: không ai sửa permission của ai, nhưng quyết định của người trước bị lật.

> **Nguồn.** Mặc định ở tầng permission/policy: *"The default strategy if none is provided. In this case, all policies must evaluate to a positive decision for the final decision to be also positive."*; hoà ở CONSENSUS: *"If the number of positive and negative decisions is the same, the final decision will be negative."* ([decision strategy](https://www.keycloak.org/docs/latest/authorization_services/index.html#decision-strategy-for-aggregated-policies)). Tầng resource server: *"Affirmative means that at least one permission must evaluate to a positive decision in order grant access to a resource and its scopes."* ([resource server settings](https://www.keycloak.org/docs/latest/authorization_services/index.html#resource_server_settings)); mặc định khi không chỉ định: *"decisionStrategy = DecisionStrategy.UNANIMOUS;"* ([RepresentationToModel.java#L1300](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/models/utils/RepresentationToModel.java#L1300)).

---

## ⏸ Dừng lại — đoán trước #2

Quay về triệu chứng thứ hai: `order#view` 403 với mọi người. Một người đề xuất đổi Policy Enforcement Mode của `orders-api` từ ENFORCING sang PERMISSIVE "để những gì chưa có rule thì cho qua". Sau khi đổi, với bob:

```
(a) order#view = 200, invoice#view = 200 (cả hai chưa có rule cho view)
(b) order#view = 403, invoice#view = 200
(c) order#view = 200, invoice#view = 403
(d) Cả hai vẫn 403, PERMISSIVE chỉ ảnh hưởng policy adapter phía app
```

(Ở thời điểm này `invoice` chưa có permission nào.)

---

### 3.3 Policy enforcement mode: "không có policy" tính theo resource, không theo cặp resource#scope

Đáp án là **(b)**. Enforcement mode quyết định số phận của request **không được permission nào phủ**:

- **ENFORCING** (mặc định): từ chối. *"(default mode) Requests are denied by default even when there is no policy associated with a given resource."*
- **PERMISSIVE**: cho đi qua. *"Requests are allowed even when there is no policy associated with a given resource."*
- **DISABLED**: không đánh giá gì, cho qua tất.

Lab chạy cùng ma trận dưới cả ba mode (permission `order-refund` UNANIMOUS):

| Mode | `order#refund` alice / bob / carol | `order#view` cả ba | `invoice#view` cả ba |
|---|---|---|---|
| ENFORCING | 403 / 200 / 403 | 403 | 403 |
| PERMISSIVE | 403 / 200 / 403 | **403** | **200** |
| DISABLED | 200 / 200 / 200 | 200 | 200 |

Cột giữa là bài học. Câu docs nói về một *resource* không có policy. `invoice` không có permission nào nên PERMISSIVE thả nó. `order` **có** permission (cho scope `refund`), nên vẫn là resource đã được quản, và scope `view` chưa được phủ vẫn ra 403.

Source cho thấy cơ chế. Với `resource#scope` được hỏi, Keycloak gom permission gắn với chính resource (scope permission có liệt kê resource cũng tính), với `type` của resource, và permission **chỉ gắn scope, không gắn resource** có scope được hỏi. Có ít nhất một thì đánh giá như ENFORCING; không có mới thả. Nguồn thứ ba là ngoại lệ: scope permission không gắn resource phủ scope đó trên **mọi** resource.

> **Đo trên lab (critic, 26.8.1).** Bản sao dữ liệu lab, PERMISSIVE, resource mới `doc` (view, refund) và `doc2` (view) lúc chưa có permission cho 200 với cả ba user. Sau đó (`tmp-critic-kc21-permissive.sh`, output `critic-ch5b/permissive.out`):
>
> ```
> [2 them scope permission doc-refund (doc, refund, p-staff)] doc#refund: alice=200 bob=200 carol=403 | doc#view: alice=403 bob=403 carol=403
> [3 xoa order-refund va order-refund-support (order het permission)] order#refund: alice=200 bob=200 carol=200 | order#view: alice=200 bob=200 carol=200
> [5 them scope permission any-view (chi scope view, KHONG resource, p-staff)] doc2#view: alice=200 bob=200 carol=403 | order#view: alice=200 bob=200 carol=403 | order#refund: alice=200 bob=200 carol=200
> ```

> **Nguồn.** Source 26.8.1 `DefaultPolicyEvaluator.evaluate`: gom theo resource, type, scope rồi mới tới `if (PolicyEnforcementMode.PERMISSIVE.equals(enforcementMode)) {`, nhánh này bỏ qua resource bật User-Managed Access ([L61-L82](https://github.com/keycloak/keycloak/blob/26.8.1/server-spi-private/src/main/java/org/keycloak/authorization/policy/evaluation/DefaultPolicyEvaluator.java#L61-L82)); nhánh scope chỉ tìm permission không gắn resource ([JPAPolicyStore.java#L277-L278](https://github.com/keycloak/keycloak/blob/26.8.1/model/jpa/src/main/java/org/keycloak/authorization/jpa/store/JPAPolicyStore.java#L277-L278)); DISABLED cho qua ngay đầu hàm (L50–L52).

Dòng DISABLED: carol không có role nào vẫn được hoàn tiền, và decision endpoint vẫn trả `{"result":true}` như thường. Một biến môi trường sai trong script provisioning là mở toang.

> **Nguồn.** Hai câu ENFORCING và PERMISSIVE ở trên trích từ [resource server settings](https://www.keycloak.org/docs/latest/authorization_services/index.html#resource_server_settings).

### 3.4 Hỏi Keycloak: grant `uma-ticket`, hai dạng trả lời

API hỏi Keycloak qua token endpoint với grant `uma-ticket`, gửi access token của user làm Bearer:

```bash
curl -s -X POST "$KC/realms/shop/protocol/openid-connect/token" \
  -H "Authorization: Bearer $ALICE_AT" \
  -d grant_type=urn:ietf:params:oauth:grant-type:uma-ticket \
  -d audience=orders-api \
  -d permission='order#refund' \
  -d response_mode=decision
```

`permission` có dạng `resource#scope`. Khi có `permission` thì `audience` (client id của resource server) là bắt buộc.

**Dạng 1, `response_mode=decision`.** Trả `{"result":true}` khi được, và khi không: *"If the authorization request does not map to any permission, a 403 HTTP status code is returned instead."* Body 403 là `not_authorized` như mục 2. Không có token nào sinh ra; mỗi lần hỏi là một lần đánh giá lại.

**Dạng 2, bỏ `response_mode`.** Keycloak trả một access token mới mang danh sách quyền. Docs gọi nó là RPT: *"the access token with permissions is called a Requesting Party Token or RPT for short."* RPT của bob khi xin `order#refund` (mục 4, bước 5): `authorization.permissions` chứa một mục `order` / `refund`; `aud` là `orders-api`, khác access token gốc; response kèm `refresh_token` và `upgraded:false`; RPT dài 1.433 byte so với 1.270 byte của access token gốc. Bỏ cả tham số `permission` thì RPT liệt kê **mọi** quyền user đang có trên resource server; sau khi thêm permission cho `invoice`, RPT "xin tất" của bob lên 1.546 byte với hai mục `order/refund` và `invoice/view`, tức khoảng 113 byte mỗi mục.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc21-b-t kc21-b-d" style="width:100%;height:auto">
<title id="kc21-b-t">Decision mỗi request so với RPT</title>
<desc id="kc21-b-d">Đường A: mỗi request của app tới orders-api, API gọi Keycloak xin decision rồi mới trả lời. Đường B: app xin RPT một lần, các request sau API chỉ verify chữ ký RPT tại chỗ, không gọi Keycloak, nhưng quyền trong RPT không đổi tới khi hết hạn.</desc>
<defs><marker id="kc21-b-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="40" y="10" width="120" height="30" rx="8" fill="#64748b" fill-opacity="0.25"/>
<text x="100" y="30" text-anchor="middle" font-size="11" fill="currentColor">App (client web)</text>
<rect x="290" y="10" width="120" height="30" rx="8" fill="#84cc16" fill-opacity="0.25"/>
<text x="350" y="30" text-anchor="middle" font-size="11" fill="currentColor">orders-api</text>
<rect x="540" y="10" width="120" height="30" rx="8" fill="#f59e0b" fill-opacity="0.25"/>
<text x="600" y="30" text-anchor="middle" font-size="11" fill="currentColor">Keycloak</text>
<line x1="100" y1="40" x2="100" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<line x1="350" y1="40" x2="350" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<line x1="600" y1="40" x2="600" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<text x="20" y="62" font-size="11" font-weight="bold" fill="currentColor">A. decision</text>
<line x1="100" y1="75" x2="348" y2="75" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="225" y="70" text-anchor="middle" font-size="11" fill="currentColor">1. POST /refund + AT</text>
<line x1="350" y1="98" x2="598" y2="98" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="475" y="93" text-anchor="middle" font-size="11" fill="currentColor">2. uma-ticket, decision</text>
<line x1="600" y1="121" x2="352" y2="121" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="475" y="116" text-anchor="middle" font-size="11" fill="currentColor">3. result:true hoặc 403</text>
<line x1="350" y1="144" x2="102" y2="144" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="225" y="139" text-anchor="middle" font-size="11" fill="currentColor">4. response</text>
<text x="20" y="180" font-size="11" font-weight="bold" fill="currentColor">B. RPT</text>
<line x1="100" y1="195" x2="598" y2="195" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="475" y="190" text-anchor="middle" font-size="11" fill="currentColor">1. uma-ticket (một lần)</text>
<line x1="600" y1="218" x2="102" y2="218" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="475" y="213" text-anchor="middle" font-size="11" fill="currentColor">2. RPT, sống 300 s</text>
<line x1="100" y1="250" x2="348" y2="250" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#kc21-b-arrow)"/>
<text x="225" y="245" text-anchor="middle" font-size="11" fill="currentColor">3..n. POST /refund + RPT</text>
<rect x="360" y="236" width="220" height="28" rx="6" fill="#84cc16" fill-opacity="0.2"/>
<text x="470" y="254" text-anchor="middle" font-size="11" fill="currentColor">verify chữ ký tại chỗ, đọc claim</text>
</svg>

---

## ⏸ Dừng lại — đoán trước #3

Đổi strategy của `order-refund` sang AFFIRMATIVE, xin RPT cho alice (có `order/refund`). Rồi đổi lại UNANIMOUS. Ngay sau đó, với RPT cũ của alice:

```
(a) RPT bị vô hiệu ngay, introspection trả active:false
(b) RPT còn active, nhưng introspection tính lại quyền và trả permissions rỗng
(c) RPT còn active và introspection vẫn trả permission order/refund
(d) Keycloak từ chối đổi strategy khi còn RPT đang lưu hành
```

---

### 3.5 RPT là ảnh chụp

Đáp án là **(c)**. Lab đo đúng kịch bản trên:

```
alice RPT 200
flipped to UNANIMOUS
introspect after flip: active True permissions [{'scopes': ['refund'], 'rsid': '6eecf9f8-...', 'rsname': 'order', ...}]
decision after flip (403, b'{"error":"access_denied","error_description":"not_authorized"}')
```

Cùng user, cùng giây: decision nói không, RPT nói có. Cơ chế chung của JWT tự chứa (bài 4): quyền được đánh giá **lúc cấp** và đóng băng vào claim có chữ ký. Introspection ở lab cũng chỉ đọc lại token, không đánh giá lại policy; và phải gửi `token_type_hint=requesting_party_token` thì response mới có trường `permissions`.

Hai dạng trả lời vì vậy đứng ở hai đầu một trục đánh đổi:

| | `response_mode=decision` | RPT |
|---|---|---|
| Gọi Keycloak | mỗi request API | một lần mỗi đời RPT (lab: 300 s) |
| Quyền mới nhất | ✓ đánh giá lại mỗi lần | ✗ đóng băng tới `exp` |
| Keycloak chết | API không quyết định được | API chạy tiếp tới khi RPT hết hạn |

> **Nguồn.** `uma-ticket` là grant bắt buộc: *"This parameter is required. Must be urn:ietf:params:oauth:grant-type:uma-ticket."*; `audience` bắt buộc khi có `permission`: *"The client identifier of the resource server to which the client is seeking access. This parameter is mandatory"*; câu 403 và câu định nghĩa RPT trích ở trên ([obtaining permissions](https://www.keycloak.org/docs/latest/authorization_services/index.html#_service_obtaining_permissions), [authorization services](https://www.keycloak.org/docs/latest/authorization_services/index.html)).

### 3.6 UMA ở mức ý tưởng

Mọi thứ phía trên vẫn là "resource server sở hữu resource, admin viết policy". UMA 2.0 giải bài toán khác: **user sở hữu resource** và tự quyết ai được xem (chia sẻ một tài liệu, một hồ sơ). Keycloak tuyên bố *"Keycloak is a UMA 2.0 compliant authorization server that provides most UMA capabilities."* và công bố metadata ở `/realms/${realm-name}/.well-known/uma2-configuration`; lab đọc thấy `permission_endpoint`, `resource_registration_endpoint`, `policy_endpoint` ở đó.

Dòng chảy, theo docs và lab:

1. Resource server lấy PAT, tức *"A protection API token (PAT) is a special OAuth2 access token with a scope defined as uma_protection."* Lab lấy PAT bằng client credentials của `orders-api`; token có client role `orders-api: uma_protection` trong `resource_access`, còn trường `scope` chỉ là `profile email`.
2. Client gọi API không có RPT. Resource server xin **permission ticket** cho resource/scope bị gọi (lab: `POST /authz/protection/permission` trả 201, ticket dài 569 ký tự) và trả 401 với header `WWW-Authenticate: UMA realm="${realm-name}",` kèm ticket.
3. Client đổi ticket lấy RPT bằng chính grant `uma-ticket` (tham số `ticket` thay cho `permission`). Lab: bob nhận RPT có `order/refund`; carol nhận 403 `{"error":"access_denied","error_description":"request_submitted"}`.

Mặc định liên quan: *"By default, Remote Resource Management is enabled."* Đây là cửa để resource server đăng ký resource qua Protection API lúc runtime, ví dụ mỗi tài liệu user tạo là một resource.

> **Suy luận.** Bộ nguồn không có câu nói UMA dành cho "user sở hữu resource" (đó là tóm tắt mục đích UMA 2.0), cũng không giải thích `request_submitted`; đọc theo tên: yêu cầu bị từ chối và được ghi lại chờ chủ resource duyệt. Chưa kiểm trong Account Console.

### 3.7 Bản sai: "đưa mọi permission vào Keycloak là chuẩn"

Lập luận nghe rất đúng. Quyền rải trong code năm service là năm cách hiểu chữ "support". Gom về một chỗ: một màn hình cho audit, đổi luật không cần deploy, mọi service hỏi cùng một nguồn. Thế thì sao không đưa **mọi** kiểm tra quyền vào đây?

Phá bằng ba cơ chế.

**Một: mỗi request API thêm một round-trip.** Muốn quyền luôn mới thì phải dùng decision, tức API gọi Keycloak trước khi trả lời. Lab đo 50 lần decision liên tiếp, một luồng, keep-alive, localhost:

| Ca | p50 | p95 | ghi chú |
|---|---|---|---|
| decision, lượt chạy đầu (JVM chưa nóng) | 1,77 ms | 4,20 ms | n = 50 |
| decision, lượt chạy thứ hai | 0,75 ms | 0,89 ms | n = 50 |
| decision, 200 lần sau đó | 0,52 ms | 1,00 ms | n = 200 |
| RPT `order#refund`, lượt thứ hai | 1,88 ms | 3,48 ms | n = 50 |
| verify RS256 + kiểm `exp` + kiểm role tại chỗ | 0,13 ms | 0,13 ms | Python thuần, n = 50 |

Các số này đo trên máy dev, chỉ đọc như bậc độ lớn và tỷ lệ. Thêm permission thứ hai không làm decision chậm đi đo được (lượt đo sau đó: 0,47 ms p50 bob, 0,41 ms alice): chi phí nằm ở **cuộc gọi**, không ở việc đánh giá policy. Ở localhost, decision ấm vẫn đắt gấp khoảng 4 đến 6 lần verify tại chỗ, mà verify tại chỗ ở đây là Python thuần; ra mạng thật còn cộng RTT, TLS và hàng đợi khi Keycloak bận.

> **Chưa đo.** Lab chỉ có localhost, một luồng, H2. Latency qua mạng, dưới tải đồng thời, trên Postgres, và CPU mỗi decision chưa có số. Đo bằng: `uma.py bench` từ máy khác, nhiều luồng, kèm metrics CPU.

**Hai: Keycloak nằm trên critical path của mọi request.** Trước đây Keycloak chỉ bị gọi lúc login và refresh; với decision, tần suất gọi bằng tổng traffic API. Keycloak chậm thì mọi API chậm; Keycloak chết thì không request nào quyết định được, và theo tinh thần ENFORCING thì phải từ chối. Né bằng RPT thì quay về bài toán ảnh chụp ở 3.5.

**Ba: policy nằm ngoài code app.** Role policy sửa trên Admin Console không đi qua merge request, không có diff trong git, không chạy trong unit test (trừ khi bạn tự dựng config-as-code cho realm, bài 24); muốn test thì CI phải dựng Keycloak thật như lab này. Luật dựa trên dữ liệu nghiệp vụ ("chỉ hoàn tiền đơn của shop mình, dưới 5 triệu, trong 30 ngày") cần dữ liệu đơn hàng mà Keycloak không có, trừ khi bạn đăng ký mỗi đơn là một resource và đồng bộ sang; RPT "xin tất" khi đó phình theo số đơn.

> **Suy luận.** Docs không so sánh Authorization Services với RBAC trong app. Bảng dưới là kết luận từ các số đo trên (round-trip, ảnh chụp RPT, kích thước theo số mục) và cơ chế ENFORCING. Kiểm bằng: áp vào một API thật của bạn, đếm số request/s cần decision và số resource mỗi user.

| Tiêu chí | Nghiêng về Authorization Services | Nghiêng về RBAC trong code app |
|---|---|---|
| Ai đổi luật | Người không deploy code (admin, bộ phận an ninh) | Dev, qua code review |
| Luật phụ thuộc gì | Role, group, client, giờ: thứ Keycloak đã biết | Dữ liệu nghiệp vụ (chủ đơn, số tiền, trạng thái) |
| Ai sở hữu resource | User tự chia sẻ cho user khác (UMA) | Hệ thống |
| Độ tươi của quyền | Chấp nhận trễ tới `exp` của RPT, hoặc trả round-trip mỗi request | Phải tức thì, không round-trip |
| Số service dùng chung luật | Nhiều service, nhiều ngôn ngữ | Một hai service |
| Tải | Thấp, hoặc chấp nhận Keycloak scale theo traffic API | Cao, không muốn IdP trên critical path |

Một cách kết hợp hợp với các tiêu chí trên (cũng là suy luận, không phải khuyến nghị của docs): role thô nằm trong access token (bài 8), API kiểm tại chỗ; Authorization Services dành cho phần thật sự cần đổi luật không qua deploy, hoặc cần chia sẻ do user quyết.

---

## 4. Lab

Môi trường: Keycloak 26.8.1 giải nén riêng vào `~/projects/keycloak-lab/lab-kc21/`, `start-dev --http-port=6200 --http-management-port=7200`, OpenJDK 24.0.2, Mac mini Apple M4. Wrapper `./kc` = `kcadm.sh "$@" --config ./kcadm.config`. Output đầy đủ: các file `*.out` cùng thư mục.

**Bước 1.** `setup.sh` tạo realm `shop`, role `staff`, `support`, ba user như mục 2, client `web` (confidential, bật direct access grants chỉ để lab lấy token nhanh).

**Bước 2: bật Authorization và xem cái gì được tạo.**

```bash
./kc create clients -r shop -s clientId=orders-api -s publicClient=false -s secret=orders-secret \
  -s standardFlowEnabled=false -s serviceAccountsEnabled=true -s authorizationServicesEnabled=true -i
./kc get clients/$ID/authz/resource-server -r shop
./kc get clients/$ID/authz/resource-server/resource -r shop   # [ ]
./kc get clients/$ID/authz/resource-server/policy -r shop     # [ ]
```

Thấy: `ENFORCING`, `UNANIMOUS`, ba danh sách rỗng; `service-account-orders-api` có `["default-roles-shop","orders-api:uma_protection"]`. ENFORCING trên nền trắng nghĩa là mọi thứ đang bị cấm.

**Bước 3: resource, scope, policy, permission** (`authz.sh`, rút gọn):

```bash
B=clients/$ID/authz/resource-server
for s in view refund; do ./kc create $B/scope -r shop -s name=$s; done
./kc create $B/resource -r shop -f - <<J
{"name":"order","type":"urn:orders-api:resources:order","uris":["/orders/*"],
 "scopes":[{"name":"view"},{"name":"refund"}]}
J
# policy dựa trên realm role staff
./kc create $B/policy/role -r shop -f - <<J
{"name":"p-staff","logic":"POSITIVE","roles":[{"id":"$STAFF","required":false}]}
J
# p-support tương tự với role support; resource invoice (scope view) tương tự order
./kc create $B/permission/scope -r shop -f - <<J
{"name":"order-refund","resources":["order"],"scopes":["refund"],
 "policies":["p-staff","p-support"],"decisionStrategy":"UNANIMOUS"}
J
```

Đọc lại `.../policy/$P/associatedPolicies` ra `["p-staff","p-support"]`: permission nhận **tên** policy/resource/scope trong JSON, không cần id.

**Bước 4: decision cho ba user.** `uma.py matrix` lấy access token qua `web` (password grant), gọi `uma-ticket` `response_mode=decision` cho `order#refund`, `order#view`, `invoice#view`: ma trận ở mục 2.

**Bước 5: xin RPT và decode.** Bỏ `response_mode`:

```
bob ['order#refund'] 200 len= 1433 upgraded= False expires_in= 300
  authorization= {"permissions": [{"scopes": ["refund"], "rsid": "6eecf9f8-...", "rsname": "order"}]}
  aud= orders-api azp= web exp-iat= 300
bob AT len 1270
```

Alice xin RPT (không quyền nào) nhận 403 `not_authorized`, không phải RPT rỗng.

**Bước 6: đo latency.** `uma.py bench 50`: 5 lần khởi động rồi 50 lần mỗi ca; `uma.py local` verify RS256 bằng JWKS, kiểm `exp` và role:

```
decision bob order#refund  n=50 p50=0.75 p95=0.89 p99=1.02 min=0.64 max=1.02
rpt bob order#refund        n=50 p50=1.88 p95=3.48 p99=6.41 min=1.66 max=6.41
local verify+role check n=50 p50=131.6us p95=134.5us min=130.5 max=137.4
```

Đây là lượt thứ hai; lượt đầu và lượt n = 200 ở bảng 3.7. JVM còn đang nóng lên, chỉ đọc như bậc độ lớn.

**Bước 7: đổi decision strategy.** `./kc update $B/permission/scope/$P -r shop -s decisionStrategy=AFFIRMATIVE` rồi chạy lại ma trận; sau đó CONSENSUS; sau đó thêm permission thứ hai và đổi `decisionStrategy` của chính resource server. Thấy: hai bảng ở 3.2. Sau mỗi `update`, `associatedPolicies` vẫn đủ hai policy, quyết định đổi ngay ở request kế tiếp.

**Bước 8: enforcement mode và RPT cũ.** `./kc update $B -r shop -s policyEnforcementMode=PERMISSIVE` (rồi DISABLED) cho bảng ở 3.3. `snap3.py` làm kịch bản ở hộp ⏸ #3, introspect bằng credential của `orders-api`.

Dừng: `kill $(lsof -tiTCP:6200 -sTCP:LISTEN)`.

---

## 5. Tính tay

**Bài 1: ba policy, ba strategy.** Permission `refund-hours` gắn ba policy: P1 role `staff`, P2 role `support`, P3 time policy "8:00 đến 18:00". Alice có `staff`, không có `support`. Tính quyết định lúc 10:00 và 22:00 với từng strategy.

- 10:00: P1 dương, P2 âm, P3 dương. UNANIMOUS: có một âm, **từ chối**. AFFIRMATIVE: có dương, **cho**. CONSENSUS: 2 dương so với 1 âm, **cho**.
- 22:00: P1 dương, P2 âm, P3 âm. UNANIMOUS: **từ chối**. AFFIRMATIVE: P1 dương, **cho**. CONSENSUS: 1 so với 2, **từ chối**.

AFFIRMATIVE làm P3 vô dụng với ai có `staff`. Ý định "staff hoặc support, nhưng chỉ trong giờ hành chính" cần hai tầng: aggregate policy (P1 AFFIRMATIVE P2) rồi UNANIMOUS với P3. Thêm policy thứ tư dương cho alice lúc 22:00 thì CONSENSUS thành 2–2, hoà, vẫn **từ chối**.

**Bài 2: decision cho mọi request.** API hoàn tiền và xem đơn nhận 2.000 request/s, mỗi request xin decision. Từ số lab ở localhost: decision ấm 0,52 đến 0,75 ms p50, verify tại chỗ 0,13 ms.

- Latency thêm tối thiểu mỗi request: 0,52 − 0,13 = 0,39 ms tới 0,75 − 0,13 = 0,62 ms, **chưa cộng RTT mạng thật** (chưa đo).
- Tải lên Keycloak: 2.000 decision/s, tức 2.000 × 86.400 = 172,8 triệu lần/ngày, so với gần 0 nếu API chỉ verify chữ ký.
- Mỗi decision chờ 0,6 ms thì 2.000 request/s cộng lại chờ 2.000 × 0,6 = 1.200 ms mỗi giây đồng hồ: một luồng tuần tự không theo kịp, cần ít nhất 2 luồng hoặc gọi bất đồng bộ chỉ cho phần chờ này.

Đổi sang RPT với 5.000 user hoạt động, mỗi user một RPT mỗi 300 s: 5.000 / 300 ≈ 16,7 lần xin RPT mỗi giây. Rẻ hơn khoảng 120 lần về số cuộc gọi, đổi lại cửa sổ trễ quyền tới 300 s.

**Bài 3: cửa sổ ảnh chụp và kích thước.** Bob nhận RPT lúc 09:58:30. Lúc 10:00:00 admin gỡ role `support` của bob. RPT còn hợp lệ tới 09:58:30 + 300 s = 10:03:30, tức bob còn **210 s** hoàn tiền được với API chỉ đọc RPT; introspection cũng không cứu (3.5). Nếu thiết kế "mỗi đơn hàng là một resource" và bob được hoàn tiền 200 đơn, RPT "xin tất" ước khoảng 1.433 + 199 × 113 = 23.920 byte, gần 24 KB trong header `Authorization` của mọi request. Hãy so con số này với giới hạn header của reverse proxy và web server trước API của bạn.

---

## 6. Chuyển giao

1. Một team đặt resource server `reports-api` sang PERMISSIVE "trong giai đoạn chuyển đổi", rồi thêm resource `report` chỉ với permission cho scope `export`. Scope `view` của `report` từ hôm đó cho qua hay chặn? Trước khi thêm permission thì sao?
2. Bạn muốn rule "support được hoàn tiền, trừ khi user đó là chủ đơn". Diễn đạt bằng các loại policy có trong danh sách providers của lab được không? Thông tin "chủ đơn" phải nằm ở đâu để Keycloak đánh giá được?
3. Một service Go không có policy enforcer, chỉ verify JWT. Bạn chọn đưa nó RPT hay để nó gọi decision? Viết ra một tiêu chí mà nếu đổi thì lựa chọn của bạn cũng đổi.
4. Script provisioning chạy `kc update` để bật Authorization cho một client mà ai đó đã lỡ đặt public. Script báo thành công. Bạn phát hiện bằng lệnh gì, và assertion nào đáng thêm vào CI?
5. Sáu tháng sau, resource server có 40 permission do bốn team thêm vào, strategy resource server vẫn UNANIMOUS mặc định. Một team đổi strategy sang AFFIRMATIVE để sửa lỗi của mình. Liệt kê kiểu permission nào của ba team còn lại có thể đổi nghĩa mà không ai sửa nó.
6. Một SaaS B2B có 3.000 tenant, mỗi tenant tự định nghĩa vai trò nội bộ và muốn tự sửa quyền không qua dev. Tải đỉnh 5.000 request/s, yêu cầu gỡ quyền có hiệu lực dưới 10 giây, và Keycloak đang là một cụm dùng chung cho mọi tenant. Thiết kế phân quyền nào thoả cả bốn điều kiện, và bạn sẽ đo những con số nào trước khi tin thiết kế đó?

---

## 7. Tóm tắt

- Chỉ client confidential làm resource server. Bật Authorization cho client public qua `create` thì lỗi `unknown_error`, qua `update` thì **im lặng không bật**.
- Bật Authorization qua Admin REST API trên 26.8.1 không tạo Default Resource/Policy/Permission; chỉ có resource server rỗng, service account, role `uma_protection`. Mặc định ENFORCING, UNANIMOUS.
- Policy là điều kiện không gắn đối tượng; permission gắn resource/scope với policy. Scope permission phủ đúng scope liệt kê, resource permission phủ cả resource.
- Decision strategy có hai tầng (policy trong permission, permission trong resource server), cả hai mặc định UNANIMOUS. CONSENSUS hoà thì từ chối, nên với hai policy nó trùng UNANIMOUS.
- PERMISSIVE chỉ thả request không có permission nào gắn với resource, type của nó, hay (permission không gắn resource) scope được hỏi; scope chưa phủ của resource đã có permission vẫn 403. DISABLED cho qua cả user không role.
- `response_mode=decision` trả `{"result":true}` hoặc 403; không có nó thì nhận RPT với `authorization.permissions`, 1.433 byte so với 1.270, thêm khoảng 113 byte mỗi quyền.
- RPT là ảnh chụp: đổi luật xong, decision ra 403 ngay nhưng RPT cũ và introspection vẫn báo có quyền tới `exp` (300 s).
- Lab localhost (bậc độ lớn): decision 0,52 đến 1,77 ms p50, verify tại chỗ 0,13 ms. Decision cho mọi request thêm một round-trip và đặt IdP lên critical path.
- Suy luận từ các số đo (docs không so sánh): Authorization Services hợp khi luật do người không deploy code đổi, dựa trên thứ Keycloak đã biết, hoặc user tự chia sẻ (UMA). Luật dựa trên dữ liệu nghiệp vụ, cần tươi tức thì, để trong code app.

→ **Bài 22 — SPI và custom authenticator**: khi luật bạn cần không có trong danh sách policy và authenticator dựng sẵn, cách duy nhất là viết Java chạy bên trong chính Keycloak, và bài sau làm việc đó từ `ProviderFactory` tới `kc.sh build`.
