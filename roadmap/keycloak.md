# Roadmap — IAM & Keycloak: từ giao thức tới production

Lộ trình để làm được việc của một **Keycloak / IAM engineer**: đọc flow OAuth/OIDC/SAML ở mức
tham số, dựng và cấu hình Keycloak cho nhiều app, viết extension (SPI) bằng Java, rồi vận hành
một cụm Keycloak HA mà không làm rơi session của ai. Phiên bản chốt: **Keycloak 26.8.1**.

Đối tượng: **dev backend đã có nghề**. Đã làm login bằng session/JWT, đã gắn "Sign in with
Google" theo hướng dẫn, nhưng chưa từng đọc RFC 6749 và chưa từng tự vận hành một IdP.
Lab dùng **Java Spring Boot** (Spring Security resource server) và Java thuần cho SPI.

---

## Vì sao course này tách khỏi SECURITY và SAA

| Bài đã có | Dạy gì | Dừng ở đâu |
|---|---|---|
| `security/sec-05-authn-authz.md` | Session vs JWT, validate JWT, OAuth 2.1 + PKCE, refresh rotation, MFA, RBAC/ABAC, BOLA/BFLA | Đứng ở phía **app dùng IdP**. Không nói IdP lưu gì, phát token thế nào, chạy cụm ra sao |
| SAA-C03 / CLF-C02 (Cognito, IAM Identity Center) | Chọn dịch vụ AWS cho bài toán identity | Managed service, không mở nắp |
| `system-design/sd-08-tradeoff-strategy.md` | Một dòng: "Cognito hay tự host Keycloak trên EKS" | Course này là 31 bài cho đúng dòng đó |

Ranh giới cứng:

- **Không dạy lại** phần sec-05 đã có (cookie vs JWT, argon2 ở mức app, BOLA/BFLA). Nhắc một câu, trỏ sang.
- **Không dạy lại Kubernetes** (`cloudnative/`) hay cơ chế container (`containers/`). Bài Operator chỉ nói
  phần riêng của Keycloak.
- Course này đứng ở phía **người xây và vận hành IdP**.

Điều course này đảo lại so với sec-05: **login không phải một request**. Một lần bấm "Sign in"
là 6–9 HTTP round-trip giữa ba bên, và mỗi tham số trong đó chặn một kiểu tấn công cụ thể.
Hiểu được vì sao từng tham số có mặt thì đọc được mọi lỗi `invalid_grant`.

---

## Quy ước con số

Hai loại số, và bài nào cũng phải ghi rõ số thuộc loại nào:

1. **Đo thật trên lab**: Keycloak 26.8.1 chạy ở `~/projects/keycloak-lab/` (Java, Postgres, 2 node).
   Nguồn: `tmp/sources/kc-lab-protocol.md`, `tmp/sources/kc-lab-spi-cluster.md`.
   Ghi kèm máy đo: đây là máy dev, latency và throughput là **bậc độ lớn**, không phải hằng số.
2. **Từ docs/RFC**: giá trị mặc định, MUST/SHOULD, số sizing chính thức.
   Nguồn: `tmp/sources/kc-protocols-oauth-oidc.md`, `kc-saml-federation.md`, `kc-core-authn.md`,
   `kc-extend-production.md`. Có URL và trích nguyên văn.

Không có loại thứ ba. Con số không nhãn là lỗi.

---

## Chương 1 — Nền IAM và giao thức (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 1 | IdP giải bài toán gì | 5 app tự giữ mật khẩu thì có 5 chỗ rò, 5 màn MFA, 5 nơi khoá tài khoản khi nhân viên nghỉ; tách **identity** khỏi app; vai trò: resource owner, client, authorization server, resource server; authentication ≠ authorization ≠ federation; Keycloak đứng ở đâu so với Auth0/Okta/Cognito |
| 2 | OAuth 2.0 đọc ở mức tham số | Bản sai: "OAuth là để login" (nó là **ủy quyền**); authorization code flow từng bước, từng tham số (`response_type`, `client_id`, `redirect_uri`, `scope`, `state`); vì sao code đổi qua back-channel; client credentials; vì sao implicit và password grant bị loại (BCP RFC 9700, OAuth 2.1 draft) |
| 3 | PKCE và OIDC | PKCE chặn đúng một cuộc tấn công: code bị chặn giữa đường; `code_verifier` → S256 → `code_challenge`, tính tay; OIDC thêm gì lên OAuth: `id_token`, `nonce`, userinfo, discovery, JWKS; `state` khác `nonce` ở đâu |
| 4 | Token: JWT, opaque, và validate cho đúng | Giải phẫu access/id/refresh token Keycloak thật (claim, kích thước byte); validate local (chữ ký + `iss` + `aud` + `exp`) hay introspection (RFC 7662): đổi gì lấy gì; revocation; vì sao revoke một JWT là bài toán khó; `aud` mặc định của Keycloak |
| 5 | SAML 2.0 | Vì sao doanh nghiệp vẫn đòi SAML; assertion, metadata, SP/IdP-initiated, binding POST/Redirect, ký và mã hoá; XML signature wrapping; map 1-1 sang khái niệm OIDC |

## Chương 2 — Keycloak core (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 6 | Kiến trúc Keycloak | Quarkus, build-time vs runtime option, `kc.sh build/start/start-dev`, DB, Infinispan cache, management port; khởi động thật đo bao lâu, ăn bao nhiêu RAM; master realm và vì sao không đặt app vào master |
| 7 | Realm và client | Realm là ranh giới cách ly; client public/confidential (và bearer-only đã đi đâu); các phương thức xác thực client; luật khớp `redirect_uri`, wildcard và cuộc tấn công open redirect |
| 8 | User, group, role | Realm role vs client role, composite role, default roles; group kế thừa role; role trong token nằm ở claim nào; bản sai "nhét mọi permission vào token" và token phình bao nhiêu byte |
| 9 | Client scope và protocol mapper | Default vs optional scope; full scope allowed; mapper quyết định claim; audience mapper để `aud` đúng; nhìn token đổi theo từng thay đổi cấu hình |
| 10 | Session và token lifetime | SSO session idle/max, client session, access token lifespan, offline session; refresh rotation; tính tay: user idle 25 phút với cấu hình X thì còn đăng nhập không; vì sao access token ngắn + refresh dài |

## Chương 3 — Tích hợp app (4 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 11 | SPA, PKCE và BFF | Token trong `localStorage` và XSS; pattern Backend-for-Frontend; cookie `HttpOnly` + session ở BFF; so sánh 3 kiến trúc bằng bảng rủi ro |
| 12 | Spring Boot làm resource server | `issuer-uri`, JWKS fetch và cache, map `realm_access.roles` → authorities (Spring mặc định đọc `scope`), 401 vs 403; lab chạy thật |
| 13 | Service-to-service | Client credentials, token exchange (RFC 8693) trong Keycloak 26.x, chuyển tiếp danh tính qua chuỗi service; scope tối thiểu |
| 14 | Logout và SSO nhiều app | Logout ở app ≠ logout ở IdP; RP-initiated, front-channel, back-channel logout; tại sao front-channel hỏng khi trình duyệt chặn cookie bên thứ ba |

## Chương 4 — Federation (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 15 | Identity brokering | Login bằng Google/Azure AD/SAML IdP khác; first broker login flow; account linking theo email và lỗ hổng chiếm tài khoản khi email chưa xác minh |
| 16 | LDAP / Active Directory | User federation: edit mode, sync, mapper, mật khẩu có về DB Keycloak không; Kerberos ở mức ý tưởng |
| 17 | Organizations và multi-tenancy | Organizations trong 26.x: domain, IdP theo domain, mời thành viên; so với realm-per-tenant |

## Chương 5 — Authentication và bảo mật (4 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 18 | Authentication flow | Browser flow mổ từng execution; REQUIRED/ALTERNATIVE/CONDITIONAL; sub-flow; step-up theo ACR/LoA |
| 19 | MFA: OTP và WebAuthn/passkey | TOTP tính tay (30 s, 6 chữ số, look-ahead); WebAuthn chống phishing vì sao; passkey; required action |
| 20 | Brute force, password policy, hashing | Tham số brute force và mặc định; tính tay số lần đoán/ngày; hash algorithm và tham số mặc định của 26.x, giá CPU mỗi lần login |
| 21 | Authorization Services | Resource, scope, policy, permission, decision strategy, UMA; khi nào nên dùng và khi nào RBAC trong app rẻ hơn |

## Chương 6 — Mở rộng (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 22 | SPI và custom authenticator | ProviderFactory/Provider, ServiceLoader, `providers/` + `kc.sh build`; viết authenticator bằng Java, chạy thật |
| 23 | Event listener và user storage | EventListenerProvider (đẩy event login ra ngoài), UserStorageProvider (user nằm ở DB cũ); API nào là public, API nào là private và vỡ khi nâng version |
| 24 | Theme, Admin API, config-as-code | Theme types; Admin REST và kcadm; realm export/import, Terraform provider, keycloak-config-cli; vì sao bấm tay trên admin console là nợ kỹ thuật |

## Chương 7 — Production (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 25 | Clustering | Cache Infinispan nào giữ gì, owners, JGroups discovery; persistent user sessions; lab 2 node: kill một node, session còn không |
| 26 | Keycloak Operator | CRD Keycloak/KeycloakRealmImport; Operator làm gì mà Helm chart không; hostname, TLS, DB secret |
| 27 | Sizing và tuning | Số sizing chính thức (vCPU theo login/s, theo client credentials/s, memory); tính tay cho 1 triệu user; hashing chiếm CPU; số đo trên lab |
| 28 | Observability và audit | Health, metrics, event metrics; login event, admin event; báo động gì |
| 29 | Nâng version, xoay key, DR | Upgrade path, rolling update, xoay signing key (active/passive) mà không làm 401 cả hệ thống; backup DB; multi-site |

## Chương 8 — Kiến trúc và tổng kết (2 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 30 | IAM cho SaaS multi-tenant và chọn IdP | Realm-per-tenant vs Organizations vs một realm; so Keycloak với Auth0/Okta/Cognito/Zitadel theo chi phí vận hành, lock-in, khả năng tuỳ biến |
| 31 | Sự cố thường gặp và checklist Keycloak engineer | Đọc lỗi `invalid_grant`, `invalid_redirect_uri`, clock skew, issuer lệch sau proxy; checklist go-live; câu hỏi phỏng vấn |
