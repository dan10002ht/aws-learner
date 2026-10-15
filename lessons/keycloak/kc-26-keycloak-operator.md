# Bài 26 — Keycloak Operator: thứ một StatefulSet tự viết không biết về Keycloak

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê việc Keycloak Operator 26.8.1 làm mà Helm chart hay StatefulSet tự viết không làm, và chỉ ra mỗi việc nằm ở đâu trong hiện vật (CRD, manifest, mã nguồn).
- Viết CR `Keycloak` tối thiểu cho production, xếp mỗi field vào đích của nó (biến `KC_*`, object Kubernetes, lối thoát), và validate với schema thật bằng `jsonschema`.
- Đoán trước một thay đổi CR gây rolling, recreate có downtime, hay pod chết exit 2, dựa trên loại option và `update.strategy`.
- Giải thích vì sao image custom phải build sẵn, và phải có `--health-enabled=true` dù CR không có field nào như vậy.
- Nói được `KeycloakRealmImport` làm gì với realm đã tồn tại và vì sao GitOps ngây thơ vỡ ở đó.
- Tính tay thời gian rolling 3 replica từ số lab, và nói phần nào còn "chưa đo".

---

## 2. Triệu chứng

Một SaaS B2B chuyển Keycloak từ StatefulSet tự viết sang Keycloak Operator. CR có `instances: 3`, image custom `registry.example.com/iam/keycloak:26.8.0-b1` đã có sẵn một provider JAR. Tuần đầu êm.

Thứ Hai, team muốn có metric login theo client, nên thêm vào CR:

```yaml
  additionalOptions:
    - name: event-metrics-user-enabled
      value: "true"
```

`kubectl apply`. Pod `sso-2` bị thay, rồi đứng ở `CrashLoopBackOff`. Log của nó chỉ có đúng một dòng:

```
The following build time options have values that differ from what is persisted - the new values will NOT be used until another build is run: kc.event-metrics-user-enabled
```

Exit code 2. Kỳ lạ là không ai bị ảnh hưởng: `sso-0` và `sso-1` vẫn phục vụ login bình thường, và rollout đứng yên ở `sso-2`.

Thứ Tư, team gỡ dòng trên, rồi nâng image lên `26.8.1-b1` (bản vá, cùng 26.8). Lần này `kubectl get pods` cho thấy **cả ba pod Terminating cùng lúc**. Trong một khoảng, không còn pod nào nhận request, mọi trang login trả lỗi từ ingress. Những người đang nhập mật khẩu dở phải bắt đầu lại từ đầu.

Cùng Operator, cùng CR. Đổi cấu hình hỏng một pod; đổi image, nhỏ hơn về nội dung, sập cả cụm.

> **Đo trên lab.** Dòng log và exit code 2 là output thật của lab 2 (Keycloak 26.8.1 bản zip, OpenJDK 24.0.2, Mac mini Apple M4): build không có `--event-metrics-user-enabled`, rồi `start --optimized --event-metrics-user-enabled=true`. Lab chạy ngoài Kubernetes; Operator truyền option qua biến `KC_*`, và kênh đó bị kiểm y hệt (đo ở mục 3.3).

---

## ⏸ Dừng lại — đoán trước #1

Vì sao đổi tag image (26.8.0 lên 26.8.1) làm cả ba pod chết cùng lúc, trong khi đổi cấu hình chỉ thay từng pod một?

```
(a) Kubernetes luôn recreate StatefulSet khi đổi image; Operator không can thiệp được
(b) Operator mặc định chọn recreate khi image đổi, vì nó không tự biết hai bản Keycloak chạy chung cụm được không
(c) Bản 26.8.1 đổi schema DB nên bắt buộc tắt hết node cũ trước khi migrate
(d) Pod mới không join được cụm cũ vì JGroups đổi cổng giữa hai bản
```

---

## 3. Lý thuyết

### 3.1 Operator biết gì về Keycloak mà một StatefulSet không biết

Bạn đã học Operator là gì ở `cloudnative/cn-15-operators.md` (CRD, controller, reconcile loop), và StatefulSet cập nhật từng pod theo ordinal ở `cloudnative/cn-06-statefulset-daemonset-jobs.md`. Bài này chỉ nói phần riêng của Keycloak.

Bản sai dễ tin nhất: "Operator chỉ là Helm chart chạy trong cluster". Cả hai đều biến khai báo ngắn thành StatefulSet, Service, Ingress. Khác nhau ở **thời điểm ra quyết định**: Helm render template một lần lúc `helm upgrade`, dữ liệu duy nhất là values. Operator chạy liên tục, đọc cả CR lẫn trạng thái thật (StatefulSet đang chạy image nào), và có thể **chạy chính Keycloak** để hỏi một câu trước khi quyết định. Template không làm được việc cuối.

RBAC trong manifest `kubernetes.yml` 26.8.1 cho thấy phạm vi: controller của CR `Keycloak` có quyền trên `statefulsets` (không phải `deployments`), `services`, `ingresses`, `networkpolicies`, `servicemonitors`, `secrets`, `configmaps`; controller RealmImport có quyền trên `jobs`. Không có gì chạm tới database.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="kc26-a-t kc26-a-d" style="width:100%;height:auto">
<title id="kc26-a-t">Operator reconcile CR Keycloak thành các object Kubernetes</title>
<desc id="kc26-a-d">CR Keycloak được Operator theo dõi; Operator sinh StatefulSet, hai Service, Ingress, NetworkPolicy và ServiceMonitor, Secret admin ban đầu và Job kiểm tra tương thích khi nâng cấp; PostgreSQL nằm ngoài phạm vi Operator.</desc>
<defs><marker id="kc26-a-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" fill-opacity="0.6"/></marker></defs>
<rect x="20" y="110" width="160" height="60" rx="8" fill="#3b82f6" fill-opacity="0.25"/>
<text x="100" y="135" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">CR Keycloak</text>
<text x="100" y="153" text-anchor="middle" font-size="11" fill="currentColor">(trạng thái mong muốn)</text>
<line x1="180" y1="140" x2="246" y2="140" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#kc26-a-arrow)"/>
<text x="213" y="132" text-anchor="middle" font-size="11" fill="currentColor">watch</text>
<rect x="250" y="95" width="170" height="90" rx="8" fill="#8b5cf6" fill-opacity="0.25"/>
<text x="335" y="120" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">Keycloak Operator</text>
<text x="335" y="140" text-anchor="middle" font-size="11" fill="currentColor">so spec với thứ</text>
<text x="335" y="156" text-anchor="middle" font-size="11" fill="currentColor">đang chạy, rồi sửa</text>
<text x="335" y="174" text-anchor="middle" font-size="10" fill="currentColor">keycloak-operator:26.8.1</text>
<rect x="470" y="15" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="33" text-anchor="middle" font-size="11" fill="currentColor">StatefulSet (spec.instances)</text>
<rect x="470" y="50" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="68" text-anchor="middle" font-size="11" fill="currentColor">Service + discovery Service</text>
<rect x="470" y="85" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="103" text-anchor="middle" font-size="11" fill="currentColor">Ingress (mặc định bật)</text>
<rect x="470" y="120" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="138" text-anchor="middle" font-size="11" fill="currentColor">NetworkPolicy, ServiceMonitor</text>
<rect x="470" y="155" width="210" height="28" rx="6" fill="#84cc16" fill-opacity="0.25"/>
<text x="575" y="173" text-anchor="middle" font-size="11" fill="currentColor">Secret sso-initial-admin</text>
<rect x="470" y="190" width="210" height="28" rx="6" fill="#f59e0b" fill-opacity="0.25"/>
<text x="575" y="208" text-anchor="middle" font-size="11" fill="currentColor">Job update-compatibility</text>
<line x1="420" y1="130" x2="466" y2="29" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<line x1="420" y1="134" x2="466" y2="64" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<line x1="420" y1="138" x2="466" y2="99" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<line x1="420" y1="142" x2="466" y2="134" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<line x1="420" y1="146" x2="466" y2="169" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<line x1="420" y1="150" x2="466" y2="204" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" marker-end="url(#kc26-a-arrow)"/>
<rect x="225" y="240" width="220" height="46" rx="8" fill="#64748b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="5 4"/>
<text x="335" y="259" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">PostgreSQL</text>
<text x="335" y="277" text-anchor="middle" font-size="11" fill="currentColor">bạn tự dựng, tự backup</text>
<line x1="335" y1="185" x2="335" y2="238" stroke="#ef4444" stroke-opacity="0.7" stroke-width="1.5" stroke-dasharray="4 4"/>
<text x="345" y="216" font-size="11" fill="currentColor">không quản</text>
<text x="575" y="240" text-anchor="middle" font-size="10" fill="currentColor">(Job chỉ có khi strategy Auto)</text>
</svg>

Mã nguồn Operator cho thấy năm thứ nó "biết" về Keycloak mà template thường không có:

1. **Hai option luôn được thêm**: `health-enabled=true`, `cache=ispn`. CR không có field cho `health-enabled`; Operator tự đặt vì probe cần nó.
2. **Probe đúng chỗ**: `health/ready`, `health/live`, `health/started` trên cổng management 9000, không phải 8443. Lab 2 xác nhận cổng chính trả 404 cho `/health/ready`.
3. **`--optimized` theo image**: lệnh mặc định `--verbose start`, thêm `--optimized` khi có `spec.image` (mục 3.3).
4. **Cụm tự thành hình**: `-Djgroups.bind.address` theo IP pod, machine name theo node, stack `jdbc-ping` (bài 25).
5. **Quyết định kiểu cập nhật**: thứ template không làm nổi, đáp án hộp ⏸ #1 (mục 3.4).

> **Nguồn.** Phạm vi: *"The Keycloak Operator does not manage the database and you need to provision it yourself."* ([basic-deployment](https://www.keycloak.org/operator/basic-deployment)). Admin ban đầu: *"The Secret name is derived from the Keycloak CR name plus the fixed suffix -initial-admin."* (cùng trang). Cache: *"Consequently, the Keycloak Operator now uses the jdbc-ping cache stack by default."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)); *"The Keycloak Operator automatically configure the machine name based on the Kubernetes node."* ([caching](https://www.keycloak.org/server/caching)). Hai option mặc định (`DEFAULT_DIST_CONFIG_LIST`) và `KEYCLOAK_MANAGEMENT_PORT = 9000` ở [Constants.java](https://raw.githubusercontent.com/keycloak/keycloak/26.8.1/operator/src/main/java/org/keycloak/operator/Constants.java) tag 26.8.1; probe, lệnh start, `--optimized` ở [KeycloakDeploymentDependentResource.java](https://raw.githubusercontent.com/keycloak/keycloak/26.8.1/operator/src/main/java/org/keycloak/operator/controllers/KeycloakDeploymentDependentResource.java).

### 3.2 CR `Keycloak`: 31 field, không field nào bắt buộc

Schema `v2beta1` của CRD thật (mục 4): `spec` có **31 field cấp 1**, **không có `required`**, cả cây chỉ có **5 `default`** và **1 `enum`** (`update.strategy`). CR chỉ có `metadata.name` vẫn qua API server; quên `db` hay `hostname` chỉ lộ ra lúc Keycloak khởi động.

Đọc 31 field nhanh nhất bằng câu hỏi **mỗi field đi đâu**:

| Nhóm | Field | Thành cái gì |
|---|---|---|
| Option có field riêng ("first-class") | `db`, `hostname`, `http`, `httpManagement`, `proxy`, `features`, `cache`, `tracing`, `truststores`... | Biến `KC_*` (`db.vendor` thành `KC_DB`) |
| Object Kubernetes | `instances`, `image`, `resources`, `scheduling`, `ingress`, `networkPolicy`, `serviceMonitor`, probe, `update` | StatefulSet, Ingress, NetworkPolicy, Job |
| Lối thoát | `additionalOptions`, `env`, `unsupported.podTemplate` | Option bất kỳ, biến tuỳ ý, merge vào pod template |

Ba chỗ hay sai, đều đọc được từ schema:

**`additionalOptions` không phải thùng rác.** Nó nhận `name`/`value` hoặc `name`/`secret` cho mọi option. Đặt `hostname` vào đó thay vì `spec.hostname.hostname` thì Operator ghi vào status cảnh báo *"You need to specify these fields as the first-class citizen of the CR: "* kèm tên option. Mô tả của `env` nói thẳng: *"Use additionalOptions for first-class options rather than KC_ values here."* Thứ tự đúng: field riêng nếu có, rồi `additionalOptions`, `env` là cuối cùng.

**`unsupported.podTemplate` chiếm 63,7% schema nhưng không được hỗ trợ.** Cây con của nó có 1.313 trên 2.062 node của `spec` (cả PodTemplateSpec được nhúng vào). Nó merge vào pod template của Operator, và Operator chỉ sinh probe khi template chưa có, nên một `readinessProbe` trong podTemplate thay hẳn probe cổng 9000. Mô tả field: *"In this section you can configure podTemplate advanced features, not production-ready, and not supported settings."*

**Mô tả trong CRD không phải docs.** `hostname.hostname` 26.8.1 vẫn ghi *"Hostname for the Keycloak server. Applicable for Hostname v1 and v2."*, dù hostname v1 đã gỡ ở 26. Tin kiểu và enum của schema; câu mô tả thì đối chiếu với guide.

> **Nguồn.** Đếm trên CRD `keycloaks.k8s.keycloak.org-v1.yml` tag 26.8.1 ([CRD](https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.8.1/kubernetes/keycloaks.k8s.keycloak.org-v1.yml)). Cảnh báo first-class và đổi tên sang `KC_*`: [KeycloakDistConfigurator.java](https://raw.githubusercontent.com/keycloak/keycloak/26.8.1/operator/src/main/java/org/keycloak/operator/controllers/KeycloakDistConfigurator.java). Hostname v1: *"The deprecated hostname v1 feature was removed."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/index.html)).

---

## ⏸ Dừng lại — đoán trước #2

Image custom được build bằng `kc.sh build --db=postgres --metrics-enabled=true` (quên `--health-enabled`). CR có `spec.image` trỏ image đó, không đặt `startOptimized`. Pod sẽ ra sao?

```
(a) Lên bình thường; health-enabled là runtime option
(b) Lên, nhưng /health trả 404 nên readiness fail mãi, pod không bao giờ Ready
(c) Thoát exit code 2 ngay khi start, CrashLoopBackOff
(d) Tự build lại ngầm khoảng 13 s rồi lên bình thường
```

---

### 3.3 Image custom và `--optimized`: vì sao Operator đẩy bạn về bài 6

Bài 6 đã dạy: `kc.sh build` chốt build option vào image, `start --optimized` bỏ qua kiểm và build lại, build option lúc start khác giá trị đã chốt thì thoát mã 2. Còn lại: Operator chọn `--optimized` khi nào?

Mã nguồn: thêm `--optimized` nếu `startOptimized: true`, **hoặc** `startOptimized` để trống và CR có `spec.image`. Mô tả field: *"If left unspecified the operator will assume custom images have already been augmented."* Hai nhánh:

- **Không có `spec.image`**: pod chạy image chuẩn `quay.io/keycloak/keycloak:26.8.1` (`RELATED_IMAGE_KEYCLOAK` trong manifest), không `--optimized`. Operator truyền `KC_DB`, `KC_HEALTH_ENABLED` khác cấu hình chốt sẵn trong image chuẩn, nên mỗi lần pod khởi động Keycloak build lại ngầm, trên lab tốn 13,03 đến 13,53 s.
- **Có `spec.image`**: `--optimized` bật, image phải chứa đúng tập build option CR sẽ đòi.

Đáp án hộp ⏸ #2 là **(c)**. Operator luôn thêm `health-enabled=true` (mục 3.1), đó là build option, và image build thiếu nó đang chốt giá trị false. Pod start `--optimized` với `KC_HEALTH_ENABLED=true` gặp đúng tình huống lab 2: exit 2. Phương án (d) đúng cho nhánh không có `spec.image`, sai ở đây vì `--optimized` tắt build ngầm.

Cùng cơ chế giải thích triệu chứng thứ Hai: `event-metrics-user-enabled` là build option mà image `26.8.0-b1` không có. Đổi cấu hình nên StatefulSet rolling, `sso-2` chết ở exit 2, StatefulSet dừng vì pod đó chưa Ready, hai pod cũ vẫn phục vụ. Rolling che lỗi khỏi người dùng; nó không sửa lỗi.

Quy tắc: **mọi build option CR sẽ bật, kể cả cái Operator tự thêm, phải có trong `kc.sh build` của Dockerfile**: `--db=<spec.db.vendor>`, `--health-enabled=true`, mọi `features`, và option build-time trong `additionalOptions` (tra icon trên All configuration như bài 6).

> **Đo trên lab.** Lab 2, Mac mini Apple M4: `kc.sh build` 5 lần `real 13.18 / 13.53 / 13.31 / 13.14 / 13.03 s`. Thay provider JAR mà không build lại rồi `start --optimized`: `A provider JAR was updated since the last build, please rebuild for this to be fully utilized.`, cũng exit 2.

> **Đo trên lab (critic, 26.8.1).** Bản zip, `kc.sh build --db=dev-file` (không `--health-enabled`), rồi `KC_HEALTH_ENABLED=true kc.sh start --optimized ...`: `exit=2`, đúng một dòng `The following build time options have values that differ from what is persisted - the new values will NOT be used until another build is run: kc.health-enabled`, y hệt khi truyền cờ `--health-enabled=true`. Cùng biến, bỏ `--optimized`: log in `Changes detected in configuration. Updating the server image.` rồi mới start.

> **Suy luận.** Đo ngoài container và ngoài Operator; "pod chết exit 2 dưới Operator" và "image chuẩn build ngầm mỗi lần start" ghép từ số đo trên với `Constants.java`, chưa quan sát trên cluster. 13 s là thời gian build ngoài container.

> **Nguồn.** *"The --optimized parameter tells Keycloak to assume a pre-built, already optimized Keycloak image is used."* và *"By default, when you use the start or start-dev command, Keycloak runs a build command under the covers for convenience reasons."* ([configuration](https://www.keycloak.org/server/configuration)). *"It is possible to enable the health checks using the build time option health-enabled:"* ([health](https://www.keycloak.org/observability/health)).

Thêm hai số từ CRD: startup probe mặc định `periodSeconds: 1`, `failureThreshold: 600`, tức 600 s để khởi động trước khi bị giết; readiness và liveness 10 s, ngưỡng 3.

### 3.4 Chiến lược cập nhật: Operator không biết hai bản có chung cụm được không

Quay lại hộp ⏸ #1. Đáp án là **(b)**.

Rolling nghĩa là có một khoảng pod bản cũ và bản mới cùng ở một cụm Infinispan, cùng ghi một database. Điều đó chỉ an toàn khi hai bản tương thích: cùng định dạng dữ liệu cache, cùng schema DB, cùng cache stack. Operator không có bảng tra cho câu hỏi đó, nên mặc định `update.strategy: RecreateOnImageChange` (giá trị `default` của schema) chọn hướng an toàn về dữ liệu: đổi cấu hình thì rolling, đổi tên hoặc tag image thì recreate.

Recreate trong mã nguồn làm đúng điều triệu chứng thứ Tư thấy: giữ image cũ, đặt `replicas: 0`, chờ về 0 pod, rồi mới scale lên với image mới. Khoảng giữa không có pod nào. Flow đăng nhập dở (authentication session, chỉ nằm trong cache) mất; user session thì còn, vì từ 26 chúng nằm trong DB (bài 25).

Phương án (c) sai ở chữ "bắt buộc": tắt hết node để migrate là yêu cầu khi lên minor/major; bản vá cùng 26.8 thì Keycloak hỗ trợ rolling từ 26.6.0. Chỉ là Operator mặc định không tự kiểm điều đó.

Muốn nó tự kiểm, chọn `strategy: Auto`. Khi image đổi, Operator tạo Job `<tên CR>-update-job` gồm hai container chung một volume:

1. Init container `actual` chạy **image đang chạy**: `update-compatibility metadata --file ...`, ghi metadata bản hiện tại.
2. Container `desired` chạy **image mới**: `update-compatibility check --file ...`, đọc metadata đó và thoát bằng mã (0 là rolling được, 3 là không).

Job có `backoffLimit: 0` và tự xoá sau 30 phút. Chỉ mã 0 dẫn tới rolling; mọi kết cục khác, kể cả container crash, đều rơi về recreate. Operator chọn hướng hỏng an toàn: thà downtime còn hơn chạy chung hai bản chưa được xác nhận. Đây là việc "chạy chính Keycloak để hỏi nó" ở mục 3.1; Helm không có lúc nào để chạy image mới trước khi quyết định cách rollout image đó.

Strategy thứ ba, `Explicit`, để bạn tự quyết bằng `revision`; schema có luật CEL *"The 'revision' field is required when 'Explicit' strategy is used"*. Dùng khi CI của bạn đã tự chạy `update-compatibility check`.

<svg viewBox="0 0 700 270" role="img" aria-labelledby="kc26-b-t kc26-b-d" style="width:100%;height:auto">
<title id="kc26-b-t">Recreate và rolling khi đổi image, ba pod</title>
<desc id="kc26-b-d">Với RecreateOnImageChange cả ba pod cũ dừng trước, có một khoảng không pod nào Ready, rồi pod mới lên lần lượt sso-0, sso-1, sso-2; với Auto, Job kiểm tương thích chạy trước, rồi từng pod được thay từ sso-2 xuống sso-0 và luôn còn hai pod phục vụ.</desc>
<text x="20" y="20" font-size="12" font-weight="bold" fill="currentColor">RecreateOnImageChange (mặc định), đổi tag image</text>
<text x="20" y="44" font-size="11" fill="currentColor">sso-0</text>
<text x="20" y="64" font-size="11" fill="currentColor">sso-1</text>
<text x="20" y="84" font-size="11" fill="currentColor">sso-2</text>
<rect x="250" y="30" width="80" height="62" fill="#ef4444" fill-opacity="0.18"/>
<text x="290" y="106" text-anchor="middle" font-size="10" fill="currentColor">0 pod Ready</text>
<rect x="80" y="34" width="170" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="80" y="54" width="170" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="80" y="74" width="170" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="330" y="34" width="350" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="400" y="54" width="280" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="470" y="74" width="210" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<text x="20" y="138" font-size="12" font-weight="bold" fill="currentColor">Auto, Job check thoát mã 0 (bản vá cùng major.minor)</text>
<text x="20" y="162" font-size="11" fill="currentColor">Job</text>
<text x="20" y="182" font-size="11" fill="currentColor">sso-0</text>
<text x="20" y="202" font-size="11" fill="currentColor">sso-1</text>
<text x="20" y="222" font-size="11" fill="currentColor">sso-2</text>
<rect x="80" y="152" width="110" height="14" rx="3" fill="#8b5cf6" fill-opacity="0.45"/>
<text x="135" y="163" text-anchor="middle" font-size="10" fill="currentColor">check</text>
<rect x="80" y="172" width="370" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="470" y="172" width="210" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="80" y="192" width="285" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="385" y="192" width="295" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="80" y="212" width="200" height="14" rx="3" fill="#64748b" fill-opacity="0.45"/>
<rect x="300" y="212" width="380" height="14" rx="3" fill="#84cc16" fill-opacity="0.5"/>
<rect x="80" y="240" width="14" height="10" fill="#64748b" fill-opacity="0.45"/>
<text x="100" y="249" font-size="10" fill="currentColor">bản cũ</text>
<rect x="160" y="240" width="14" height="10" fill="#84cc16" fill-opacity="0.5"/>
<text x="180" y="249" font-size="10" fill="currentColor">bản mới</text>
<text x="250" y="249" font-size="10" fill="currentColor">Trục ngang chỉ thứ tự, không theo tỷ lệ; độ dài thật: Chưa đo (mục 5)</text>
</svg>

Giới hạn của `Auto`: lên minor hay major vẫn recreate (bài 29 đo lệnh check: 26.7.5 lên 26.8.1 trả 3, 26.8.0 lên 26.8.1 trả 0); rolling theo định nghĩa của docs cần ít nhất hai node, nên `instances: 1` thì cập nhật nào cũng là downtime; và đổi `cache-stack` làm cụm không thành hình trong lúc rolling.

> **Nguồn.** *"By default, the Keycloak Operator will perform rolling updates on configuration changes without downtime, and recreate updates with downtime when the image name or tag changes."* và *"It performs a rolling update if the Keycloak version is the same or when upgrading to a newer patch version in the same major.minor release stream."* ([rolling-updates](https://www.keycloak.org/operator/rolling-updates)). *"Starting with Keycloak 26.6.0 rolling updates of patch releases are supported."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)); *"When using the Keycloak Operator, set the update strategy to Auto to benefit from this functionality."* ([release notes](https://www.keycloak.org/docs/latest/release_notes/index.html)). Hai node: *"In this guide, a rolling update is an update that can be performed with zero downtime for your deployment, which consists of at least two nodes."*; cache stack: *"Changing stack will result in the cluster not forming during rolling update and will lead to data loss."* ([update-compatibility](https://www.keycloak.org/server/update-compatibility)). Flow dở: *"Currently ongoing authentication flows are only stored in the internal caches that are cleared when Keycloak is shut down."* ([upgrading](https://www.keycloak.org/docs/latest/upgrading/index.html)). Cơ chế recreate, Job và bảng exit code: mã nguồn tag 26.8.1, `KeycloakDeploymentDependentResource.java`, `KeycloakUpdateJobDependentResource.java`, [AutoUpdateLogic.java](https://raw.githubusercontent.com/keycloak/keycloak/26.8.1/operator/src/main/java/org/keycloak/operator/update/impl/AutoUpdateLogic.java) (URL đủ ở file nguồn, mục 1b).

---

## ⏸ Dừng lại — đoán trước #3

Realm `b2b` được quản bằng một `KeycloakRealmImport` trong Git, ArgoCD tự sync. Bạn thêm một `redirectUris` mới cho client `portal` trong CR, commit. ArgoCD báo Synced, màu xanh. Mười phút sau, login từ URL mới báo `invalid_redirect_uri`. Vì sao?

```
(a) Import Job đang chạy, chờ thêm
(b) CR chỉ tạo realm mới; realm b2b đã có nên thay đổi bị bỏ qua
(c) Cần restart pod Keycloak để nạp lại realm
(d) ArgoCD prune mất field redirectUris vì schema không biết nó
```

---

### 3.5 `KeycloakRealmImport`: một lần tạo, không phải nguồn sự thật

Schema RealmImport đòi đúng hai field: `keycloakCRName` (CR `Keycloak` cùng namespace) và `realm` (RealmRepresentation, 153 field cấp 1, định dạng realm export của bài 24); thêm `placeholders` để thay `${VAR}` từ Secret.

Đáp án hộp ⏸ #3 là **(b)**. Job import trong mã nguồn chạy `kc.sh --verbose import --file=/mnt/realm-import/<realm>-realm.json --override=false`, và docs ghi hệ quả: CR chỉ tạo realm mới, không cập nhật, không xoá, realm trùng tên không bị ghi đè. ArgoCD báo Synced là đúng, vì nó đồng bộ object Kubernetes chứ không đồng bộ trạng thái bên trong Keycloak. Git nói một đằng, realm sống một nẻo, và không có tín hiệu nào báo lệch.

Lý do thiết kế đọc ngược từ bài 24: import có override thì phải dừng hết node vì lệnh không gắn vào cache cluster. CR tự ghi đè realm trên cụm đang chạy sẽ gặp đúng vấn đề đó, nên Operator chỉ làm phần an toàn: tạo lần đầu. Hệ quả: dùng RealmImport để **bootstrap** (staging dựng lại, cụm DR); thay đổi về sau đi qua Terraform provider `keycloak/keycloak` hoặc keycloak-config-cli (bài 24). CR `KeycloakOIDCClient`/`KeycloakSAMLClient` đã có controller trong manifest 26.8.1, nhưng docs ghi đang preview và cần feature `client-admin-api:v2`.

> **Nguồn.** *"The Realm Import CR only supports creation of new realms and does not update or delete those."* và *"If a Realm with the same name already exists in Keycloak, it will not be overwritten."* ([realm-import](https://www.keycloak.org/operator/realm-import)). Client CR: *"This guide is describing a feature which is currently in preview."* và *"The client-admin-api:v2 feature must be enabled on the Keycloak server."* ([managing-clients](https://www.keycloak.org/operator/managing-clients)). Override: *"The command does not attach to the cache cluster, so overwriting a realm will lead to inconsistent caches in the cluster, which then would show and use inconsistent or outdated information."* ([importExport](https://www.keycloak.org/server/importExport)). Schema: [RealmImport CRD](https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.8.1/kubernetes/keycloakrealmimports.k8s.keycloak.org-v1.yml).

> **Suy luận.** "Operator chọn `--override=false` vì override cần dừng hết node" là cách đọc của bài này, ghép từ cờ trong `KeycloakRealmImportJobDependentResource.java` và câu trích về cache; docs Operator không nêu lý do.

So sánh cuối, giờ đã đủ cơ chế để đọc:

| Việc | StatefulSet/Helm tự viết | Keycloak Operator 26.8.1 |
|---|---|---|
| Option `health-enabled`, `cache=ispn` | Bạn tự nhớ | Luôn thêm |
| Probe trên cổng 9000 | Bạn tự viết | Sinh sẵn, 3 loại |
| `--optimized` | Bạn tự đặt | Theo `spec.image` / `startOptimized` |
| Kiểu cập nhật khi đổi image | Luôn rolling (StatefulSet), kể cả khi không tương thích | Recreate, hoặc hỏi `update-compatibility` (Auto) |
| Database, realm sau lần tạo đầu | Không | Không |

Hàng thứ tư đáng giá nhất: StatefulSet tự viết đổi image là rolling mù, nhanh hơn recreate cho tới ngày bạn nhảy minor version và hai bản không tương thích cùng ghi một cụm cache.

---

## 4. Lab

Máy lab không có Kubernetes, nên mục này đọc hiện vật thật đúng tag 26.8.1, rồi viết một CR production và kiểm nó với schema.

**Bước 1: tải hiện vật.**

```bash
mkdir -p ~/projects/keycloak-lab/lab-kc26 && cd ~/projects/keycloak-lab/lab-kc26
B=https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/26.8.1/kubernetes
for f in keycloaks.k8s.keycloak.org-v1.yml keycloakrealmimports.k8s.keycloak.org-v1.yml kubernetes.yml; do
  curl -sSfLO $B/$f; done
shasum -a 256 *
# 20c51247...  keycloaks.k8s.keycloak.org-v1.yml   (10.009 dòng)
# 8d552e18...  keycloakrealmimports.k8s.keycloak.org-v1.yml (8.427 dòng)
# a6927644...  kubernetes.yml (441 dòng)
```

CRD `Keycloak` dài 10.009 dòng vì chứa hai version gần giống nhau: `v2beta1` là storage version, `v2alpha1` mang `deprecated: true`.

**Bước 2: đếm schema.** Script `tmp-kc26-schema.py` (PyYAML) duyệt `openAPIV3Schema` của `v2beta1`. Trích output:

```
version v2beta1 served True storage True
spec required None
n spec fields 31
{'default': 5, 'enum': 1, 'required': 2, 'nodes': 2074}
.spec.networkPolicy.enabled default True
.spec.update.strategy default RecreateOnImageChange
.spec.update.strategy enum ['Auto', 'Explicit', 'RecreateOnImageChange']
podTemplate nodes 1313 spec nodes 2062
```

Hai `required` duy nhất nằm ở `truststores.*.secret`/`configMap` (đòi `name`), không ở `db` hay `hostname`. `networkPolicy.enabled` mặc định true: Operator tạo NetworkPolicy dù bạn không xin. CRD khai subresource `scale` trỏ `.spec.instances`, nên `kubectl scale kc/sso` và HPA tác động lên CR. Với CRD RealmImport, cùng script cho `spec required ['keycloakCRName', 'realm']`, `realm props 153`.

**Bước 3: đọc manifest Operator** (1 ServiceAccount, 5 ClusterRole, 6 binding, 1 Service, 1 Deployment):

```
image: quay.io/keycloak/keycloak-operator:26.8.1
- name: RELATED_IMAGE_KEYCLOAK
  value: quay.io/keycloak/keycloak:26.8.1
keycloakcontroller-cluster-role: statefulsets, services, ingresses, networkpolicies, servicemonitors, secrets, configmaps, pods, pods/log
```

Operator chạy 1 replica; nó chết thì pod Keycloak vẫn chạy (StatefulSet tự giữ pod), chỉ thay đổi CR là chờ. Các biến `..._NAMESPACES` là `JOSDK_WATCH_CURRENT`: chỉ watch namespace được cài.

**Bước 4: CR production tối thiểu** (`cr/keycloak-prod.yaml`):

```yaml
apiVersion: k8s.keycloak.org/v2beta1
kind: Keycloak
metadata: {name: sso}
spec:
  instances: 3
  image: registry.example.com/iam/keycloak:26.8.1-b1   # xem lệnh build ở dưới
  db:
    vendor: postgres
    host: pg-primary.db.svc
    database: keycloak
    usernameSecret: {name: kc-db, key: username}
    passwordSecret: {name: kc-db, key: password}
    poolInitialSize: 30
    poolMinSize: 30
    poolMaxSize: 30
  hostname: {hostname: https://sso.example.com}
  http: {tlsSecret: sso-tls}
  ingress: {enabled: false}
  features: {enabled: [token-exchange]}
  update: {strategy: Auto}
  additionalOptions:
    - {name: metrics-enabled, value: "true"}
```

Image đó build bằng `kc.sh build --db=postgres --health-enabled=true --metrics-enabled=true --features=token-exchange`.

Đối chiếu từng field với hiện vật:

| Field | Trong schema | Vì sao đặt |
|---|---|---|
| `instances: 3` | integer, không default (mô tả ghi 1) | Rolling cần ít nhất 2 node |
| `image`, không `startOptimized` | string | Kéo theo `--optimized`; build khớp `db`, `features`, `metrics-enabled`, cộng `health-enabled` |
| `db.*Secret` | object `{name, key}` | Không để mật khẩu trong CR |
| `db.pool*` bằng nhau | integer | Docs khuyên initial = min = max; 30 là ví dụ, bài 27 tính |
| `hostname.hostname` | string | Field riêng, không qua `additionalOptions` |
| `http.tlsSecret` | string | HTTPS; probe tự chuyển sang HTTPS |
| `ingress.enabled: false` | boolean | Mặc định có ingress "basic" |
| `update.strategy: Auto` | enum | Bản vá rolling được |
| `metrics-enabled` | `additionalOptions[]` | Không có field riêng |

**Bước 5: validate** bằng jsonschema (Draft 7) trên `openAPIV3Schema` đã bỏ khoá `x-kubernetes-*`, kèm liệt kê field lạ. Thêm hai CR hỏng: `sso-broken` (`instances: "3"`, gõ sai `hostnme`, `strategy: Rolling`) và `sso-explicit` (`Explicit` thiếu `revision`):

```
sso: 0 loi
sso-broken: 2 loi
    spec.instances -> '3' is not of type 'integer'
    spec.update.strategy -> 'Rolling' is not one of ['Auto', 'Explicit', 'RecreateOnImageChange']
    UNKNOWN (bi prune): spec.hostnme
sso-explicit: 0 loi
```

Ba dòng cuối dạy nhiều hơn dòng đầu. `hostnme` không phải lỗi schema: schema không cấm field lạ, API server sẽ prune nó im lặng, và Keycloak khởi động không có hostname. `sso-explicit` lọt vì luật CEL bị bỏ khi chuyển sang jsonschema; API server thật chạy CEL và từ chối nó. Kiểm offline bắt được kiểu và enum, không bắt được field gõ sai và CEL.

> **Đo trên lab (chạy riêng cho bài này).** 2026-10-15, macOS 15.2, Python 3.14, PyYAML 6.0.3, jsonschema 4.26.0. Output trên là output thật của các script `tmp-kc26-*.py` trong `~/projects/keycloak-lab/kc26-scripts/`; CR ở `~/projects/keycloak-lab/lab-kc26/cr/`. Không có cluster, chưa `kubectl apply` thật: prune và CEL ở trên là theo đặc tả CRD của Kubernetes, chưa quan sát.

**Bước 6: đọc mã nguồn Operator** để kiểm mục 3. Trích `KeycloakDeploymentDependentResource.java` tag 26.8.1 (bỏ phần dựng probe, chỉ giữ giá trị mặc định ở comment):

```java
if (Boolean.TRUE.equals(keycloakCR.getSpec().getStartOptimized())
        || keycloakCR.getSpec().getStartOptimized() == null
                && (customImage.isPresent() || operatorConfig.keycloak().startOptimized())) {
    containerBuilder.addToArgs(OPTIMIZED_ARG);
}
// readiness, liveness: period 10, threshold 3; startup: period 1, threshold 600
specBuilder.withTerminationGracePeriodSeconds(30L);   // nếu podTemplate không đặt
```

`operatorConfig.keycloak().startOptimized()` là cấu hình cấp Operator; manifest 26.8.1 không đặt biến nào cho nó.

---

## 5. Tính tay

**Bài 1: rolling 3 replica khi Job check trả 0.** StatefulSet thay từng pod, chờ pod mới Ready rồi mới sang pod kế (`cloudnative/cn-06`). Mỗi pod gồm ba đoạn:

- Dừng: pre-shutdown delay 1 s, shutdown timeout 10 s; `terminationGracePeriodSeconds` 30 s lớn hơn 11 s nên không cắt ngang. Dừng mất 1 đến 11 s.
- Lên: lab 2 đo node join cụm đang chạy Ready sau 3 đến 4 s (`--optimized`).
- Phát hiện Ready: readiness chu kỳ 10 s, nên kubelet có thể thấy Ready trễ tới 10 s.

Mỗi pod: thấp nhất 1 + 3 = 4 s, cao nhất 1 + 10 + 4 + 10 = 25 s. Ba pod: **12 đến 75 s**. Nhánh không có `spec.image` cộng thêm một lần build ngầm 13,03 đến 13,53 s mỗi pod, tức 39,09 đến 40,59 s mỗi lần rollout.

> **Chưa đo.** Thời gian Job `update-compatibility`, kéo image, lập lịch, và tổng rollout thật trên cluster: lab không có cluster, docs không cho số. Đo bằng: `kubectl get pods -w` có timestamp từ lúc `kubectl apply` tới pod cuối Ready, cộng `kubectl get job sso-update-job -o jsonpath='{.status.startTime} {.status.completionTime}'`.

**Bài 2: recreate và ngân sách startup probe.** Ba pod dừng song song (tối đa 11 s), rồi `sso-0` lên; Service có endpoint lại khi `sso-0` Ready. Recreate dừng pod bằng SIGTERM, nên `jgroups_ping` được dọn; bài 25 đo đúng ca này: node đầu tiên Ready sau 4 s. Ca xấu là cả cụm chết cứng (SIGKILL): Ready sau 53 s (lab 2), vì JOIN tới dòng xác trong `jgroups_ping` rồi cluster health check báo split-brain (bài 25).

Ngân sách startup probe: 1 s × 600 = 600 s. 53 s là 8,8% ngân sách, probe mặc định không giết pod trong ca xấu nhất của lab. Còn migrate DB khi lên minor: timeout migrate mặc định 30 phút, tức 1.800 s, gấp 3 lần 600 s. Migrate dài hơn 10 phút sẽ bị kubelet giết giữa chừng.

> **Suy luận.** Docs không nói migrate dài sẽ va startup probe; nó suy ra từ hai số: `failureThreshold 600` × `periodSeconds 1` (CRD) và timeout migrate 30 phút (upgrading guide, bài 29). Kiểm bằng: trước khi lên minor, đo thời gian migrate trên bản sao DB production; nếu gần 600 s, tăng `startupProbe.failureThreshold` trong CR.

**Bài 3: kết nối DB trong lúc cập nhật.** Pool 30, `instances: 3`: 3 × 30 = 90 kết nối. StatefulSet không tạo pod thừa khi rolling (không có `maxSurge` như Deployment), recreate thì về 0 trước, nên cả hai không vượt 90. Thứ nằm ngoài phép tính: Job RealmImport chạy `kc.sh import`, mà lệnh import là *"server launches that perform the import or export, then exit before bringing up the full server"*, nên nó mở pool DB riêng. So tổng với `max_connections` của Postgres, không phải với 90.

---

## 6. Chuyển giao

1. Team muốn thêm một provider JAR mới. Họ sửa Dockerfile, build image `26.8.1-b2`, đổi `spec.image`. Với `strategy: Auto`, Job check sẽ trả gì, và rollout là rolling hay recreate? Provider mới có thay đổi gì trong câu trả lời không?
2. Bạn đặt `additionalOptions: [{name: health-enabled, value: "false"}]` để "tắt health cho nhẹ". Liệt kê theo thứ tự những gì xảy ra với pod, probe và rollout.
3. Một team dùng `unsupported.podTemplate` thêm sidecar, tiện tay khai `readinessProbe` trỏ cổng 8443 `/realms/master`. Sau này bạn chặn `/realms/master/` ở reverse proxy. Readiness có bị ảnh hưởng không, và probe đó còn sai ở điểm nào?
4. Staging và production dùng chung một instance Postgres nhưng hai database khác nhau, mỗi bên một CR `Keycloak` tên `sso`. Có rủi ro gộp cụm như bài 25 cảnh báo không? Nếu hai bên dùng chung **một database** thì sao?
5. `kubectl edit statefulset sso` để tăng memory limit gấp đôi cho kịp sự cố. Một lúc sau giá trị về như cũ. Vì sao, và sửa đúng ở đâu?
6. Bạn muốn GitOps thật cho realm: xoá client trong Git thì client biến mất trong Keycloak, nên dùng Terraform provider. Thiết kế pipeline để dựng lại cụm DR từ DB trống ra đúng realm như production, mà không có hai công cụ cùng ghi một realm. Bước nào chạy trước, secret client nằm ở đâu, và chuyện gì xảy ra nếu Terraform chạy đúng lúc Operator đang recreate cả ba pod?

---

## 7. Tóm tắt

- Operator khác Helm ở thời điểm quyết định: đọc trạng thái thật, chạy image mới (`update-compatibility check`) trước khi chọn cách rollout. Quản StatefulSet, Service, Ingress, NetworkPolicy, ServiceMonitor; không quản database.
- Luôn thêm `health-enabled=true` và `cache=ispn`; probe `health/ready|live|started` trên cổng 9000; `jdbc-ping`; grace period 30 s.
- CRD `v2beta1`: 31 field cấp 1, không field bắt buộc, 5 default, 1 enum. Field gõ sai bị prune im lặng; `unsupported.podTemplate` là 63,7% schema và không được hỗ trợ.
- Field riêng trước, `additionalOptions` sau, `env` cuối.
- Có `spec.image`, không `startOptimized` thì là `--optimized`: image phải build với mọi build option CR đòi, cộng `--health-enabled=true`, lệch là exit 2. Không `spec.image` thì build ngầm mỗi lần start, khoảng 13 s trên lab.
- Mặc định `RecreateOnImageChange`: đổi cấu hình rolling, đổi image về 0 pod. `Auto` chỉ rolling khi Job check trả 0 (bản vá, từ 26.6.0). Rolling cần ít nhất 2 instance.
- Startup probe cho 600 s; lab xấu nhất 53 s; timeout migrate DB 30 phút.
- `KeycloakRealmImport` chạy import với `--override=false`: chỉ tạo, không cập nhật, không xoá. Bootstrap bằng nó, thay đổi sau đó qua Terraform hoặc keycloak-config-cli.
- Rolling 3 replica theo số lab: 12 đến 75 s, chưa tính Job, kéo image, lập lịch (chưa đo).

→ **Bài 27 — Sizing và tuning**: CR đã có chỗ cho `resources` và pool DB; bài sau điền chúng bằng số sizing chính thức thay vì đoán.
