# Container & Image Security

Container không phải là một "máy ảo an toàn". Nó là một tiến trình của host được cô lập bằng namespace và cgroup. Một image dựng cẩu thả — chạy `root`, đầy package thừa, nhúng AWS key — biến mỗi container đang chạy thành một bề mặt tấn công. Bài này đi từ lúc build image cho tới lúc nó chạy trong cluster: **scan, làm gọn base, hạ quyền, ký, kèm SBOM, và canh runtime**. Mục tiêu là một image bạn dám đẩy lên production mà không phải cầu nguyện.

## Mô hình mối đe doạ: rủi ro nằm ở đâu

Trước khi sửa, phải biết đang sửa cái gì. Một image production có ba lớp rủi ro chồng lên nhau:

| Lớp | Rủi ro điển hình | Vũ khí phòng thủ |
|---|---|---|
| **Nội dung image** | CVE trong OS package & lib, secret bị nhúng, package thừa | Image scanning, minimal base, multi-stage, không nhúng secret |
| **Quyền lúc chạy (runtime)** | Chạy `root`, ghi đè filesystem, có `CAP_SYS_ADMIN`, mount Docker socket | non-root, read-only fs, drop capabilities, seccomp |
| **Chuỗi cung ứng (supply chain)** | Pull nhầm image giả, base image bị poison, không truy vết được build | Image signing (cosign), SBOM, pin digest, provenance |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba lớp rủi ro của image container và vũ khí phòng thủ tương ứng</title>
  <desc>Ba lớp rủi ro chồng lên nhau: Nội dung image (CVE, secret), Quyền lúc chạy (root, capabilities), Chuỗi cung ứng (image giả, poison); mỗi lớp kèm các công cụ phòng thủ tương ứng.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Ba lớp rủi ro của một image production</text>
  <text x="704" y="26" font-size="11.5" text-anchor="end" fill="currentColor" opacity="0.6">Rủi ro → Phòng thủ</text>
  <g>
    <rect x="16" y="42" width="688" height="68" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="32" y="66" font-size="13.5" font-weight="700" fill="currentColor">Nội dung image</text>
    <text x="32" y="86" font-size="11" fill="currentColor" opacity="0.72">Rủi ro: CVE trong OS/lib · secret bị nhúng · package thừa</text>
    <text x="32" y="103" font-size="11" fill="currentColor" opacity="0.72">Phòng thủ: image scan (Trivy) · minimal base · multi-stage · không nhúng secret</text>
  </g>
  <g>
    <rect x="16" y="118" width="688" height="68" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="32" y="142" font-size="13.5" font-weight="700" fill="currentColor">Quyền lúc chạy (runtime)</text>
    <text x="32" y="162" font-size="11" fill="currentColor" opacity="0.72">Rủi ro: chạy root · ghi đè fs · CAP_SYS_ADMIN · mount Docker socket</text>
    <text x="32" y="179" font-size="11" fill="currentColor" opacity="0.72">Phòng thủ: non-root · read-only fs · drop capabilities · seccomp</text>
  </g>
  <g>
    <rect x="16" y="194" width="688" height="68" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="32" y="218" font-size="13.5" font-weight="700" fill="currentColor">Chuỗi cung ứng (supply chain)</text>
    <text x="32" y="238" font-size="11" fill="currentColor" opacity="0.72">Rủi ro: pull nhầm image giả · base bị poison · không truy vết được build</text>
    <text x="32" y="255" font-size="11" fill="currentColor" opacity="0.72">Phòng thủ: signing (cosign) · SBOM · pin digest · provenance</text>
  </g>
  <text x="360" y="282" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.62">Ba lớp chồng nhau — cần cả ba, không lớp nào thay được lớp nào</text>
</svg>

> Ghi nhớ: Scan chỉ tìm lỗ hổng **đã biết**. Hạ quyền runtime giới hạn thiệt hại của lỗ hổng **chưa biết**. Signing + SBOM trả lời câu "image này từ đâu ra, có đúng thứ tôi build không". Cần cả ba, không thay thế nhau.

## 1. Image scanning: tìm CVE trước khi attacker tìm

Scan là hàng rào đầu tiên. Công cụ phổ biến nhất hiện nay là **Trivy** — quét OS package, dependency ngôn ngữ (npm, pip, Go modules...), secret nhúng, và misconfiguration.

```bash
# Scan một image, chỉ fail khi có CVE HIGH/CRITICAL và đã có bản vá
trivy image --severity HIGH,CRITICAL --ignore-unfixed \
  --exit-code 1 myapp:1.4.2

# Scan ngay Dockerfile + thư mục build (IaC misconfig + secret)
trivy fs --scanners vuln,secret,misconfig .
```

`--exit-code 1` là mấu chốt để cắm vào CI: pipeline đỏ khi có CVE nghiêm trọng. `--ignore-unfixed` tránh chặn build vì những CVE chưa hề có patch (nếu không bạn sẽ bị kẹt vĩnh viễn).

Trong GitHub Actions:

```yaml
- name: Scan image
  uses: aquasecurity/trivy-action@0.28.0
  with:
    image-ref: myapp:${{ github.sha }}
    severity: HIGH,CRITICAL
    ignore-unfixed: true
    exit-code: '1'
    format: sarif
    output: trivy.sarif
```

> Bẫy production: Scan **một lần lúc build là không đủ**. CVE mới được công bố mỗi ngày — một image "sạch" hôm nay có thể "bẩn" sau hai tuần dù không đổi một dòng code. Phải scan lại định kỳ các image đang chạy trong registry, không chỉ lúc CI.

## 2. Minimal base image: bề mặt tấn công nhỏ thì khó bị bắn

Mỗi binary trong image là một CVE tiềm năng. `ubuntu:latest` mang theo `apt`, `bash`, `curl`, hàng trăm package bạn không dùng nhưng attacker thì rất thích.

| Base | Kích thước (tham khảo) | Có shell? | Hợp với |
|---|---|---|---|
| `ubuntu` / `debian` | ~70–120 MB | Có | Khi thực sự cần system tooling |
| `alpine` | ~5–8 MB | Có (`sh`) | Đa số app, cần libc nhỏ (musl) |
| `gcr.io/distroless/*` | ~2–20 MB | **Không** | Production binary, bảo mật cao nhất |
| `scratch` | 0 | Không | Static binary (Go, Rust) thuần |

**Distroless** chứa thành phần tối thiểu tuỳ biến thể: `static` cho binary static (không có libc), `base`/`cc` thêm thư viện cần thiết. Tag thông thường không có shell/package manager; tag `debug` có shell. Không có `sh` làm giảm công cụ sẵn có nhưng không ngăn được mọi khai thác RCE.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 345" role="img" aria-labelledby="do06-size-t do06-size-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="sans-serif" font-size="13">
<title id="do06-size-t">Khoảng kích thước base image</title>
<desc id="do06-size-d">Trục ngang tuyến tính từ 0 đến 120 MB; các dải biểu thị đúng khoảng tham khảo trong bảng. Scratch có kích thước base bằng không.</desc>
<text x="20" y="25" text-anchor="start" fill="currentColor">Kích thước base tham khảo (MB)</text><text x="20" y="48" text-anchor="start" fill="currentColor">Dải màu = khoảng min–max, không gồm app</text><text x="20" y="85" text-anchor="start" fill="currentColor">ubuntu/debian</text><path d="M190 80 H490" fill="none" stroke="currentColor" stroke-width="2"/><rect x="365.0" y="68" width="125.0" height="24" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="190" y="105" text-anchor="start" fill="currentColor">70–120 MB</text><text x="20" y="145" text-anchor="start" fill="currentColor">alpine</text><path d="M190 140 H490" fill="none" stroke="currentColor" stroke-width="2"/><rect x="202.5" y="128" width="7.5" height="24" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="190" y="165" text-anchor="start" fill="currentColor">5–8 MB</text><text x="20" y="205" text-anchor="start" fill="currentColor">distroless</text><path d="M190 200 H490" fill="none" stroke="currentColor" stroke-width="2"/><rect x="195.0" y="188" width="45.0" height="24" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/><text x="190" y="225" text-anchor="start" fill="currentColor">2–20 MB</text><text x="20" y="265" text-anchor="start" fill="currentColor">scratch</text><path d="M190 260 H490" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="190" cy="260" r="4" fill="#8b5cf6"/><text x="190" y="285" text-anchor="start" fill="currentColor">0 MB</text><text x="190" y="325" text-anchor="start" fill="currentColor">0</text><text x="340" y="325" text-anchor="middle" fill="currentColor">60</text><text x="490" y="325" text-anchor="end" fill="currentColor">120 MB</text>
</svg>

### Multi-stage build: tách build khỏi runtime

Đây là kỹ thuật quan trọng nhất để image nhỏ và sạch. Compiler, dev dependency, source code đều ở stage build và **không bao giờ** lọt vào image cuối.

```dockerfile
# ---- Stage build ----
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app ./cmd/server

# ---- Stage runtime ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
```

Image cuối chỉ có đúng một binary tĩnh + tag `:nonroot` đã sẵn user không phải root. Không Go toolchain, không source, không shell.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Multi-stage build tách stage build khỏi stage runtime</title>
  <desc>Stage build chứa toolchain, source code và dev dependency để biên dịch ra binary; chỉ binary được copy sang stage runtime gọn nhẹ dùng distroless non-root, các thứ còn lại bị bỏ lại nên image cuối nhỏ và sạch.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Multi-stage build: chỉ binary đi sang image cuối</text>
  <g>
    <rect x="16" y="44" width="300" height="206" rx="11" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="32" y="68" font-size="13" font-weight="700" fill="currentColor">Stage build</text>
    <text x="32" y="85" font-size="10.5" fill="currentColor" opacity="0.6">FROM golang:1.23 AS build</text>
    <g font-size="11.5" fill="currentColor">
      <rect x="32" y="98" width="268" height="30" rx="7" fill="currentColor" fill-opacity="0.07"/>
      <text x="46" y="117">Go toolchain / compiler</text>
      <rect x="32" y="134" width="268" height="30" rx="7" fill="currentColor" fill-opacity="0.07"/>
      <text x="46" y="153">Source code</text>
      <rect x="32" y="170" width="268" height="30" rx="7" fill="currentColor" fill-opacity="0.07"/>
      <text x="46" y="189">Dev dependency, go.mod cache</text>
      <rect x="32" y="206" width="268" height="30" rx="7" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="46" y="225" font-weight="700">/app  (binary tĩnh)</text>
    </g>
  </g>
  <g>
    <line x1="318" y1="221" x2="404" y2="221" stroke="currentColor" stroke-opacity="0.7" stroke-width="2"/>
    <path d="M404 221 l-9 -5 v10 z" fill="currentColor" fill-opacity="0.8"/>
    <text x="361" y="214" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">COPY --from=build</text>
    <text x="361" y="241" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.55">chỉ binary</text>
  </g>
  <g>
    <rect x="404" y="44" width="300" height="206" rx="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="420" y="68" font-size="13" font-weight="700" fill="currentColor">Stage runtime (image cuối)</text>
    <text x="420" y="85" font-size="10.5" fill="currentColor" opacity="0.6">FROM distroless/static:nonroot</text>
    <g font-size="11.5" fill="currentColor">
      <rect x="420" y="98" width="268" height="34" rx="7" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="434" y="120" font-weight="700">/app  (binary tĩnh)</text>
      <rect x="420" y="138" width="268" height="26" rx="7" fill="currentColor" fill-opacity="0.07"/>
      <text x="434" y="155" font-size="11">static: CA cert + tzdata</text>
      <rect x="420" y="170" width="268" height="26" rx="7" fill="currentColor" fill-opacity="0.07"/>
      <text x="434" y="187" font-size="11">USER nonroot</text>
    </g>
    <text x="420" y="222" font-size="11" fill="currentColor" opacity="0.7">Không toolchain · không source · không shell</text>
    <text x="420" y="240" font-size="11" fill="currentColor" opacity="0.7">→ nhỏ &amp; sạch, bề mặt tấn công tối thiểu</text>
  </g>
</svg>

> Ghi nhớ: `alpine` dùng `musl` libc thay vì `glibc`. Vài binary biên dịch sẵn cho `glibc` sẽ lỗi khó hiểu trên alpine (DNS resolution, một số lib native). Nếu gặp lỗi lạ kiểu "not found" với một binary rõ ràng tồn tại, nghĩ tới musl vs glibc ngay.

## 3. Chạy non-root & read-only filesystem

Mặc định container chạy `root` (UID 0). Nếu container thoát ly được (container escape), `root` trong container có thể thành `root` trên host. Nguyên tắc: **không bao giờ chạy production container bằng root**.

Trong Dockerfile:

```dockerfile
# Tạo user thường, cấp quyền đúng thư mục, rồi switch sang nó
RUN addgroup -S app && adduser -S -G app app
USER app
```

Nhưng `USER` trong Dockerfile có thể bị override khi chạy. Lớp phòng thủ thật nằm ở **orchestrator**. Trên Kubernetes, ép buộc bằng `securityContext`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true          # Pod fail nếu image cố chạy root
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault       # bật seccomp lọc syscall nguy hiểm
      containers:
        - name: api
          image: myrepo/api@sha256:abc123...   # pin theo digest, không dùng tag
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true        # fs gốc chỉ đọc
            capabilities:
              drop: ["ALL"]                      # bỏ hết Linux capability
          volumeMounts:
            - name: tmp
              mountPath: /tmp        # app cần ghi -> cấp volume riêng
      volumes:
        - name: tmp
          emptyDir: {}
```

Giải thích các field then chốt:

- `runAsNonRoot: true` — Kubernetes **từ chối khởi động** pod nếu image cố chạy UID 0. Đây là cái chốt cứng, không phụ thuộc Dockerfile.
- `readOnlyRootFilesystem: true` — attacker không ghi được binary/script vào fs. App cần ghi (cache, tmp, upload) thì mount `emptyDir` đúng chỗ đó.
- `capabilities.drop: ["ALL"]` — Linux capability chia nhỏ quyền root. Phần lớn app web **không cần một capability nào cả**. Nếu cần bind port < 1024, thêm `add: ["NET_BIND_SERVICE"]` thay vì chạy root.
- `allowPrivilegeEscalation: false` — chặn `setuid` binary leo thang quyền.

> Bẫy production: Bật `readOnlyRootFilesystem` xong app crash với lỗi `read-only file system`. Nguyên nhân quen thuộc: app ghi log ra file, ghi `/tmp`, hoặc framework ghi cache vào thư mục app. Đừng tắt cờ — hãy tìm đúng path app ghi và mount `emptyDir` vào đó. Mỗi path ghi được phải là một quyết định có chủ đích.

## 4. Không nhúng secret vào image

Image là **read-once, distribute-everywhere**. Bất cứ thứ gì trong image, ai pull được image đều đọc được — kể cả secret bạn tưởng đã "xoá".

```dockerfile
# ✗ SAI: layer này nằm vĩnh viễn trong lịch sử image
ENV AWS_SECRET_ACCESS_KEY=wJalrXUt...
COPY .env /app/.env

# ✗ Cũng SAI: xoá ở layer sau KHÔNG xoá khỏi layer trước
COPY secrets.json /tmp/secrets.json
RUN ./use-secret.sh && rm /tmp/secrets.json   # secret vẫn còn trong layer COPY
```

`docker history` và `docker save` lôi ra mọi layer. Một secret từng `COPY` vào là lộ vĩnh viễn, kể cả khi `rm` ở bước sau.

Cách đúng:

- **Build-time secret** (token để pull private dependency): dùng BuildKit secret mount, không ghi vào layer.

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npmtoken \
    NPM_TOKEN=$(cat /run/secrets/npmtoken) npm ci
```
```bash
docker build --secret id=npmtoken,src=$HOME/.npmtoken .
```

- **Runtime secret** (DB password, API key): tiêm lúc chạy qua secret manager, không bao giờ vào image. Trên K8s dùng Secret tham chiếu từ external store; trên AWS dùng Secrets Manager / SSM Parameter Store.

> Ghi nhớ: Quy tắc một câu — *image chỉ chứa code, secret đến lúc runtime*. Scan bằng `trivy image --scanners secret myapp` để bắt secret lỡ lọt vào trước khi push.

## 5. Registry & image signing với cosign

Scan xong, build sạch — nhưng làm sao cluster biết image nó pull **đúng là** image bạn build, không bị tráo ở registry hay man-in-the-middle? Câu trả lời: **ký image**.

**Cosign** (thuộc Sigstore) ký image và lưu chữ ký ngay cạnh image trong registry.

```bash
# Ký bằng keyless (OIDC) — không cần quản lý private key
cosign sign myrepo/api@sha256:abc123...

# Hoặc ký bằng key cặp truyền thống
cosign generate-key-pair
cosign sign --key cosign.key myrepo/api@sha256:abc123...

# Verify trước khi deploy
cosign verify --key cosign.pub myrepo/api@sha256:abc123...
```

Rồi **ép buộc** admission controller chỉ chấp nhận image đã ký. Với Kyverno trên K8s:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["myrepo/*"]
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      ...
                      -----END PUBLIC KEY-----
```

Pod nào dùng image chưa ký (hoặc ký bằng key lạ) sẽ bị từ chối ngay tại admission.

> Bẫy production: Luôn ký và verify theo **digest** (`@sha256:...`), không theo **tag**. Tag là con trỏ có thể di chuyển — `myapp:1.4` hôm nay và tuần sau có thể trỏ tới hai image khác nhau. Cosign có thể resolve tag thành digest khi ký; rủi ro là tag đổi đích giữa các bước. Pin digest để build, ký và verify cùng một artifact.

## 6. SBOM: danh sách thành phần để truy vết

**SBOM** (Software Bill of Materials) là bản kê khai mọi thành phần trong image: package nào, version nào, license gì. Khi một CVE kiểu Log4Shell nổ ra lúc 2 giờ sáng, SBOM cho bạn trả lời trong vài phút câu hỏi *"image nào của mình có lib này?"* thay vì grep mò cả ngày.

```bash
# Sinh SBOM bằng Syft (định dạng chuẩn CycloneDX hoặc SPDX)
syft myapp:1.4.2 -o cyclonedx-json > sbom.json

# Trivy cũng xuất được SBOM
trivy image --format cyclonedx --output sbom.json myapp:1.4.2

# Sau này quét lại CVE TRỰC TIẾP trên SBOM, không cần image
trivy sbom sbom.json

# Gắn SBOM như attestation đã ký vào image (cosign)
cosign attest --predicate sbom.json --type cyclonedx \
  myrepo/api@sha256:abc123...
```

SBOM gắn kèm + ký là **attestation về thành phần**. **Build provenance** theo SLSA mô tả quá trình build, builder và đầu vào; cần sinh attestation riêng, chữ ký không biến SBOM thành provenance.

## 7. Runtime security: image sạch vẫn cần canh lúc chạy

Mọi thứ ở trên là phòng thủ tĩnh, tại thời điểm build/deploy. Nhưng zero-day xảy ra lúc container đang chạy. **Runtime security** giám sát hành vi bất thường theo thời gian thực — bằng **eBPF**, công cụ phổ biến là **Falco** hoặc Tetragon.

Ý tưởng cốt lõi: định nghĩa "hành vi bình thường", cảnh báo khi lệch. Ví dụ một rule Falco:

```yaml
- rule: Shell trong container production
  desc: Container không được phép spawn shell tương tác
  condition: >
    spawned_process and container
    and proc.name in (bash, sh, zsh)
    and not container.image.repository in (allowed_debug_images)
  output: "Shell spawned in container (pod=%k8s.pod.name image=%container.image.repository)"
  priority: WARNING
```

Những hành vi đáng cảnh báo điển hình: spawn shell trong container production, ghi vào `/etc` hoặc binary path, kết nối ra ngoài tới IP lạ, đọc `/etc/shadow`, hay tiến trình đào crypto. Distroless + read-only fs khiến những hành vi này gần như chắc chắn là tấn công, vì app bình thường không bao giờ làm vậy.

> Ghi nhớ: Phòng thủ theo tầng (defense in depth). Image minimal làm attacker khó leo thang; non-root + drop caps + read-only fs giới hạn thiệt hại; runtime security phát hiện khi tầng trên thủng. Đừng dồn hết kỳ vọng vào một tầng.

## 8. Supply chain: khoá toàn bộ đường đi của image

Ráp tất cả thành một chuỗi liền mạch từ source tới chạy:

1. **Pin base image theo digest**, không `latest`. `FROM gcr.io/distroless/static@sha256:...` để base không bị đổi ngầm dưới chân.
2. **Build trong CI sạch**, không build trên máy lập trình viên. Build reproducible càng tốt.
3. **Scan** (Trivy) ngay trong pipeline, fail khi có CVE nghiêm trọng.
4. **Sinh SBOM** (Syft) và gắn vào image.
5. **Ký image + ký SBOM** (cosign keyless qua OIDC để không phải giữ key).
6. **Admission control** (Kyverno/Cosign policy) chỉ cho deploy image đã ký, đúng digest.
7. **Scan lại định kỳ** image đang chạy trong registry để bắt CVE mới công bố.
8. **Runtime monitoring** (Falco) canh hành vi lúc chạy.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 468" role="img" aria-labelledby="fixeng-supply-t fixeng-supply-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fixeng-supply-t">Supply chain: artifact, metadata và enforcement</title>
<desc id="fixeng-supply-d">Artifact đi từ base qua CI vào registry rồi qua admission tới runtime; SBOM và chữ ký gắn với artifact, scan và Falco rẽ sang nhánh phát hiện.</desc>
<defs><marker id="fixeng-supply-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<text x="260" y="24" font-size="15" text-anchor="middle" fill="currentColor">Artifact qua ranh giới admission</text><rect x="12" y="60" width="136" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="80.0" y="90.0" font-size="13" text-anchor="middle" fill="currentColor">Base @digest</text><rect x="194" y="60" width="136" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="262.0" y="90.0" font-size="13" text-anchor="middle" fill="currentColor">CI sạch</text><rect x="376" y="60" width="132" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="442.0" y="90.0" font-size="13" text-anchor="middle" fill="currentColor">Registry</text><rect x="376" y="330" width="132" height="50" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="442.0" y="360.0" font-size="13" text-anchor="middle" fill="currentColor">Runtime</text><path d="M350 280 H516" stroke="#f43f5e" stroke-dasharray="5 4" stroke-width="2"/><text x="215" y="319" font-size="13" text-anchor="middle" fill="currentColor">Ranh giới policy</text><rect x="12" y="160" width="136" height="46" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="80.0" y="188.0" font-size="13" text-anchor="middle" fill="currentColor">Trivy: CVE</text><rect x="194" y="160" width="136" height="46" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="262.0" y="188.0" font-size="13" text-anchor="middle" fill="currentColor">Syft: SBOM</text><rect x="194" y="232" width="136" height="46" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="262.0" y="260.0" font-size="13" text-anchor="middle" fill="currentColor">cosign: ký</text><rect x="12" y="330" width="136" height="50" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="80.0" y="360.0" font-size="13" text-anchor="middle" fill="currentColor">Scan định kỳ</text><rect x="194" y="330" width="136" height="50" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="262.0" y="360.0" font-size="13" text-anchor="middle" fill="currentColor">Falco: hành vi</text><g data-step="1"><path d="M148 85 L190 85" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="2"><path d="M330 85 L372 85" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="3"><path d="M260 110 L80 156" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="4"><path d="M442 110 V135 H262 V156" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="5"><path d="M262 206 L262 228" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/><path d="M330 255 H350 V135 H442" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="6"><path d="M442 110 L442 326" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/><text x="442" y="250" font-size="13" text-anchor="middle" fill="currentColor">Kyverno: verify</text></g><g data-step="7"><path d="M376 100 H360 V300 H80 V326" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><g data-step="8"><path d="M376 355 L334 355" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-supply-a)"/></g><text x="260" y="420" font-size="13" text-anchor="middle" fill="currentColor">Vàng: inventory / phát hiện, không tự chặn.</text><text x="260" y="445" font-size="13" text-anchor="middle" fill="currentColor">Admission Enforce mới từ chối image sai policy.</text>
</svg>
<step-note data-step="1">Pin digest tránh base đổi ngầm; vẫn phải kiểm độ tin cậy và lỗ hổng của base.</step-note>
<step-note data-step="2">Build trong CI sạch giảm phụ thuộc máy dev; không tự bảo đảm reproducible build.</step-note>
<step-note data-step="3">Trivy phát hiện CVE đã biết trong OS/lib; CI phải dùng kết quả để chặn theo policy.</step-note>
<step-note data-step="4">Syft tạo inventory giúp truy vết dependency, kể cả transitive; không tự phát hiện hay chặn typosquat.</step-note>
<step-note data-step="5">Cosign ký digest để verifier phát hiện artifact bị tráo; chữ ký phải được kiểm với danh tính tin cậy.</step-note>
<step-note data-step="6">Kyverno ở chế độ Enforce từ chối image chưa ký hoặc không đạt policy digest trước khi chạy.</step-note>
<step-note data-step="7">Quét lại image trong registry phát hiện CVE mới sau khi push; cần quy trình khắc phục riêng.</step-note>
<step-note data-step="8">Falco cảnh báo hành vi bất thường lúc chạy; không tự chặn mọi zero-day, cần response/enforcement riêng.</step-note>
</step-flow>

> Bẫy production: Mắt xích yếu nhất thường là **dependency của dependency**. App của bạn import lib A, lib A kéo theo 200 transitive dependency bạn chưa từng đọc tên. SBOM + scan trên SBOM là cách duy nhất nhìn thấy chúng. Một typosquat package (tên gần giống package thật) lọt vào là cả chuỗi sụp.

## Liên hệ sang AWS

Toàn bộ vòng đời ở trên đều có dịch vụ AWS tương ứng — và nếu chạy trên EKS/ECS thì đây là đường mặc định nên đi:

| Khái niệm trong bài | Dịch vụ AWS |
|---|---|
| Registry lưu image | **Amazon ECR** (private/public registry) |
| Image scanning | **ECR Image Scanning** — *Basic* (Clair) hoặc *Enhanced* (Amazon Inspector) |
| Scan liên tục image trong registry | **Amazon Inspector** — quét lại tự động khi có CVE mới, không chỉ lúc push |
| Secret runtime | **AWS Secrets Manager** / **SSM Parameter Store**, tiêm qua task definition (ECS) hoặc CSI driver (EKS) |
| Chạy non-root, drop caps | **ECS task `user` + `linuxParameters`**, hoặc Pod `securityContext` trên **EKS** |
| Image signing & admission | **cosign + ECR**, ép buộc qua Kyverno/Gatekeeper trên EKS |
| Chuỗi cung ứng build | **CodeBuild/CodePipeline** sinh artifact, scan, ký rồi push lên ECR |
| Runtime security | **GuardDuty Runtime Monitoring** cho EKS/ECS, bổ sung cho Falco self-hosted |

- **ECR Enhanced Scanning** chính là Amazon Inspector chạy phía sau: bật một lần, mọi image push lên được quét OS + dependency ngôn ngữ, và **quét lại tự động** khi NVD công bố CVE mới — giải đúng bài toán "image sạch hôm nay bẩn ngày mai".
- **Inspector** chấm điểm và ưu tiên theo khả năng khai thác thực tế (network reachability), không chỉ liệt kê CVE thô — giúp đội nhỏ biết vá cái nào trước.
- Trên **EKS**, ghép `securityContext` + Kyverno verify cosign + ECR Enhanced Scan + GuardDuty Runtime Monitoring là bạn đã có gần đủ chuỗi phòng thủ trong bài này bằng dịch vụ managed.
- Đừng quên **IAM roles cho task/pod** (IRSA trên EKS, task role trên ECS): container không nên giữ static AWS key — đó cũng chính là tinh thần "không nhúng secret vào image" áp dụng cho quyền AWS.
