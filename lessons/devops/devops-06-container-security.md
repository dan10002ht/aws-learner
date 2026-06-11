# Container & Image Security

Container không phải là một "máy ảo an toàn". Nó là một tiến trình của host được cô lập bằng namespace và cgroup. Một image dựng cẩu thả — chạy `root`, đầy package thừa, nhúng AWS key — biến mỗi container đang chạy thành một bề mặt tấn công. Bài này đi từ lúc build image cho tới lúc nó chạy trong cluster: **scan, làm gọn base, hạ quyền, ký, kèm SBOM, và canh runtime**. Mục tiêu là một image bạn dám đẩy lên production mà không phải cầu nguyện.

## Mô hình mối đe doạ: rủi ro nằm ở đâu

Trước khi sửa, phải biết đang sửa cái gì. Một image production có ba lớp rủi ro chồng lên nhau:

| Lớp | Rủi ro điển hình | Vũ khí phòng thủ |
|---|---|---|
| **Nội dung image** | CVE trong OS package & lib, secret bị nhúng, package thừa | Image scanning, minimal base, multi-stage, không nhúng secret |
| **Quyền lúc chạy (runtime)** | Chạy `root`, ghi đè filesystem, có `CAP_SYS_ADMIN`, mount Docker socket | non-root, read-only fs, drop capabilities, seccomp |
| **Chuỗi cung ứng (supply chain)** | Pull nhầm image giả, base image bị poison, không truy vết được build | Image signing (cosign), SBOM, pin digest, provenance |

> 💡 Ghi nhớ: Scan chỉ tìm lỗ hổng **đã biết**. Hạ quyền runtime giới hạn thiệt hại của lỗ hổng **chưa biết**. Signing + SBOM trả lời câu "image này từ đâu ra, có đúng thứ tôi build không". Cần cả ba, không thay thế nhau.

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

> ⚠️ Bẫy production: Scan **một lần lúc build là không đủ**. CVE mới được công bố mỗi ngày — một image "sạch" hôm nay có thể "bẩn" sau hai tuần dù không đổi một dòng code. Phải scan lại định kỳ các image đang chạy trong registry, không chỉ lúc CI.

## 2. Minimal base image: bề mặt tấn công nhỏ thì khó bị bắn

Mỗi binary trong image là một CVE tiềm năng. `ubuntu:latest` mang theo `apt`, `bash`, `curl`, hàng trăm package bạn không dùng nhưng attacker thì rất thích.

| Base | Kích thước (tham khảo) | Có shell? | Hợp với |
|---|---|---|---|
| `ubuntu` / `debian` | ~70–120 MB | Có | Khi thực sự cần system tooling |
| `alpine` | ~5–8 MB | Có (`sh`) | Đa số app, cần libc nhỏ (musl) |
| `gcr.io/distroless/*` | ~2–20 MB | **Không** | Production binary, bảo mật cao nhất |
| `scratch` | 0 | Không | Static binary (Go, Rust) thuần |

**Distroless** chỉ có runtime tối thiểu (libc, CA cert, tzdata) — không shell, không package manager. Attacker RCE được vào container cũng không có `sh` để chạy lệnh tiếp.

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

> 💡 Ghi nhớ: `alpine` dùng `musl` libc thay vì `glibc`. Vài binary biên dịch sẵn cho `glibc` sẽ lỗi khó hiểu trên alpine (DNS resolution, một số lib native). Nếu gặp lỗi lạ kiểu "not found" với một binary rõ ràng tồn tại, nghĩ tới musl vs glibc ngay.

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

> ⚠️ Bẫy production: Bật `readOnlyRootFilesystem` xong app crash với lỗi `read-only file system`. Nguyên nhân quen thuộc: app ghi log ra file, ghi `/tmp`, hoặc framework ghi cache vào thư mục app. Đừng tắt cờ — hãy tìm đúng path app ghi và mount `emptyDir` vào đó. Mỗi path ghi được phải là một quyết định có chủ đích.

## 4. Không nhúng secret vào image

Image là **read-once, distribute-everywhere**. Bất cứ thứ gì trong image, ai pull được image đều đọc được — kể cả secret bạn tưởng đã "xoá".

```dockerfile
# ❌ SAI: layer này nằm vĩnh viễn trong lịch sử image
ENV AWS_SECRET_ACCESS_KEY=wJalrXUt...
COPY .env /app/.env

# ❌ Cũng SAI: xoá ở layer sau KHÔNG xoá khỏi layer trước
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

> 💡 Ghi nhớ: Quy tắc một câu — *image chỉ chứa code, secret đến lúc runtime*. Scan bằng `trivy image --scanners secret myapp` để bắt secret lỡ lọt vào trước khi push.

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

> ⚠️ Bẫy production: Luôn ký và verify theo **digest** (`@sha256:...`), không theo **tag**. Tag là con trỏ có thể di chuyển — `myapp:1.4` hôm nay và tuần sau có thể trỏ tới hai image khác nhau. Ký tag là ký một cái tên, không phải ký nội dung.

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

SBOM gắn kèm + ký (signed attestation) chính là **provenance** — bằng chứng truy vết nguồn gốc, đáp ứng các chuẩn supply chain như SLSA.

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

> 💡 Ghi nhớ: Phòng thủ theo tầng (defense in depth). Image minimal làm attacker khó leo thang; non-root + drop caps + read-only fs giới hạn thiệt hại; runtime security phát hiện khi tầng trên thủng. Đừng dồn hết kỳ vọng vào một tầng.

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

> ⚠️ Bẫy production: Mắt xích yếu nhất thường là **dependency của dependency**. App của bạn import lib A, lib A kéo theo 200 transitive dependency bạn chưa từng đọc tên. SBOM + scan trên SBOM là cách duy nhất nhìn thấy chúng. Một typosquat package (tên gần giống package thật) lọt vào là cả chuỗi sụp.

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
