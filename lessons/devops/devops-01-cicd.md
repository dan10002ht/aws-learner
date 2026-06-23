# CI/CD: pipeline & mindset

Bạn đã biết cloud và Docker. Giờ là lúc trả lời câu hỏi vận hành cốt lõi: **từ một commit của lập trình viên đến lúc code chạy trên production, có bao nhiêu bước và bao nhiêu bước trong đó phải làm bằng tay?** Nếu câu trả lời có chữ "tay" ở những bước quan trọng, bạn đang ngồi trên một quả bom hẹn giờ. CI/CD là kỷ luật biến quy trình đó thành một đường ống (pipeline) tự động, lặp lại được và đáng tin.

Bài này không dạy bạn cú pháp một công cụ cụ thể. Nó dạy bạn **mindset** — cách một kỹ sư vận hành tư duy về dòng chảy của code — rồi mới đến file pipeline chạy được.

## CI, CD và CD: ba khái niệm thường bị nhập làm một

Đây là chỗ gây nhầm lẫn kinh điển vì có tới hai chữ "CD".

| Khái niệm | Viết tắt | Nghĩa | Ranh giới kết thúc |
|---|---|---|---|
| Continuous Integration | CI | Mỗi commit được merge thường xuyên vào nhánh chung, tự động build + test | Có một artifact đã qua test, "xanh" |
| Continuous Delivery | CD | Mọi artifact xanh đều **sẵn sàng** deploy lên production bất cứ lúc nào, chỉ chờ một cú bấm nút (manual approval) | Artifact nằm sẵn ở cửa prod |
| Continuous Deployment | CD | Như trên nhưng **bỏ luôn cú bấm nút** — xanh là tự động lên prod | Code đã chạy trên prod |

> 💡 Ghi nhớ: **Delivery = lúc nào cũng deploy được (nhưng người quyết định bấm). Deployment = deploy luôn, không cần người.** Sự khác biệt duy nhất là cái "manual approval gate" trước production. Một đội mới làm CI/CD thường dừng ở Delivery, và đó là lựa chọn đúng đắn cho đến khi test đủ tin cậy.

Trục so sánh dưới đây làm rõ ba khái niệm cùng nằm trên **một đường ống**, chỉ khác nhau ở chỗ đặt **manual approval gate**: CI dừng ở artifact xanh; Delivery tự động tới sát cửa prod rồi chờ người bấm; Deployment xoá luôn cái cửa đó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh CI, Continuous Delivery và Continuous Deployment trên cùng một đường ống</title>
  <desc>Ba dải ngang cùng các bước commit, build, test, package, deploy staging, deploy prod. CI dừng sau test (artifact xanh). Continuous Delivery tự động tới staging rồi dừng ở manual approval gate trước prod. Continuous Deployment chạy thẳng lên prod, không có gate.</desc>
  <g font-size="10.5" fill="currentColor" opacity="0.7" text-anchor="middle">
    <text x="150" y="22">commit · build · test</text>
    <text x="345" y="22">package · deploy staging</text>
    <text x="560" y="22">deploy prod</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="3 4">
    <line x1="258" y1="30" x2="258" y2="288"/>
    <line x1="470" y1="30" x2="470" y2="288"/>
  </g>
  <!-- CI -->
  <g>
    <text x="16" y="62" font-size="12.5" font-weight="700" fill="currentColor">CI</text>
    <rect x="60" y="48" width="190" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="155" y="67" font-size="11" text-anchor="middle" fill="currentColor">tự động build + test</text>
    <rect x="252" y="50" width="118" height="26" rx="13" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="311" y="67" font-size="10.5" text-anchor="middle" fill="currentColor">artifact "xanh" → dừng</text>
  </g>
  <!-- Continuous Delivery -->
  <g>
    <text x="16" y="138" font-size="12.5" font-weight="700" fill="currentColor">Continuous</text>
    <text x="16" y="152" font-size="12.5" font-weight="700" fill="currentColor">Delivery</text>
    <rect x="60" y="128" width="404" height="30" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="262" y="147" font-size="11" text-anchor="middle" fill="currentColor">tự động: build → test → package → staging</text>
    <rect x="466" y="124" width="8" height="38" fill="#f59e0b" fill-opacity="0.9"/>
    <rect x="476" y="130" width="148" height="26" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 3"/>
    <text x="550" y="147" font-size="10.5" text-anchor="middle" fill="currentColor">prod (chờ bấm nút)</text>
    <text x="470" y="180" font-size="9.5" text-anchor="middle" fill="#f59e0b">manual approval gate</text>
  </g>
  <!-- Continuous Deployment -->
  <g>
    <text x="16" y="232" font-size="12.5" font-weight="700" fill="currentColor">Continuous</text>
    <text x="16" y="246" font-size="12.5" font-weight="700" fill="currentColor">Deployment</text>
    <rect x="60" y="222" width="564" height="30" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="342" y="241" font-size="11" text-anchor="middle" fill="currentColor">tự động hết: build → test → package → staging → prod (KHÔNG gate)</text>
  </g>
  <text x="360" y="282" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Khác biệt duy nhất giữa Delivery và Deployment = có hay không "manual approval gate" trước prod</text>
</svg>

Trong thực tế, "CD" trong câu nói thường ám chỉ Delivery. Khi ai đó nói "team mình deploy tự động hoàn toàn", đó mới là Deployment.

## Vì sao phải tự động hoá: không phải vì lười

Lý do thật sự không phải để đỡ gõ lệnh. Mà là:

- **Loại bỏ lỗi con người.** Một quy trình deploy 12 bước làm bằng tay, lặp lại 5 lần/ngày, chắc chắn sẽ có lúc ai đó quên bước 7. Máy không quên.
- **Lặp lại được (reproducible).** Build trên máy bạn "chạy ngon" không có nghĩa gì. Pipeline build trong môi trường sạch, ai chạy cũng ra kết quả như nhau.
- **Phản hồi nhanh (fast feedback).** Bug được bắt 3 phút sau khi push rẻ hơn rất nhiều so với bug bị khách hàng báo 3 tuần sau.
- **Tự tin để release nhỏ và thường xuyên.** Deploy 1 dòng code mỗi ngày ít rủi ro hơn deploy 5000 dòng mỗi tháng. Pipeline tốt khiến deploy thành chuyện nhàm chán — và nhàm chán là tốt.

> ⚠️ Bẫy production: Đừng nhầm "có Jenkins/GitHub Actions" với "có CI/CD". Nhiều đội có pipeline nhưng test thì skip, deploy production thì vẫn SSH vào server kéo code. Đó là CI/CD trên giấy. Thước đo thật: **bạn có dám để pipeline tự deploy lên prod lúc 5 giờ chiều thứ Sáu không?**

## Pipeline stages: giải phẫu một đường ống

Một pipeline là chuỗi các **stage** chạy tuần tự (hoặc song song khi có thể), mỗi stage là một cổng kiểm soát. Một stage fail thì cả pipeline dừng — đây chính là nguyên tắc **fail fast**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng pipeline stages với fail-fast và manual approval gate</title>
  <desc>Đường ống chạy tuần tự: commit, Build, Test, Scan, Package, Deploy dev, Deploy staging, manual approval gate rồi Deploy prod. Mỗi stage là một cổng kiểm soát; stage nào fail thì pipeline dừng ngay (fail fast). Approval gate trước prod phân biệt Continuous Delivery với Continuous Deployment.</desc>
  <defs>
    <marker id="cicdArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="22" font-size="11" fill="currentColor" opacity="0.7">commit của lập trình viên</text>
  <!-- hàng 1: commit -> Build -> Test -> Scan -->
  <g stroke="currentColor" fill="none" marker-end="url(#cicdArrow)" stroke-opacity="0.55">
    <line x1="120" y1="55" x2="160" y2="55"/>
    <line x1="252" y1="55" x2="292" y2="55"/>
    <line x1="384" y1="55" x2="424" y2="55"/>
  </g>
  <g>
    <rect x="16" y="38" width="104" height="34" rx="7" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="68" y="60" font-size="12" text-anchor="middle" fill="currentColor">commit</text>
    <rect x="160" y="38" width="92" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="206" y="60" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Build</text>
    <rect x="292" y="38" width="92" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="338" y="60" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Test</text>
    <rect x="424" y="38" width="92" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="470" y="60" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Scan</text>
  </g>
  <!-- gập xuống hàng 2 -->
  <path d="M470 72 V96 H206" stroke="currentColor" fill="none" stroke-opacity="0.55" marker-end="url(#cicdArrow)"/>
  <!-- hàng 2: Package -> Deploy dev -> Deploy staging -->
  <g stroke="currentColor" fill="none" marker-end="url(#cicdArrow)" stroke-opacity="0.55">
    <line x1="252" y1="125" x2="292" y2="125"/>
    <line x1="424" y1="125" x2="464" y2="125"/>
  </g>
  <g>
    <rect x="160" y="108" width="92" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="206" y="130" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Package</text>
    <rect x="292" y="108" width="132" height="34" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="358" y="130" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Deploy dev</text>
    <rect x="464" y="108" width="148" height="34" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="538" y="130" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">Deploy staging</text>
  </g>
  <!-- gập xuống approval gate -->
  <path d="M538 142 V172 H360" stroke="currentColor" fill="none" stroke-opacity="0.55" marker-end="url(#cicdArrow)"/>
  <!-- approval gate + prod -->
  <g>
    <rect x="160" y="184" width="200" height="40" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.9" stroke-dasharray="5 3"/>
    <text x="260" y="200" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">manual approval gate</text>
    <text x="260" y="216" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">có gate = Delivery · bỏ gate = Deployment</text>
    <line x1="360" y1="204" x2="400" y2="204" stroke="currentColor" fill="none" stroke-opacity="0.55" marker-end="url(#cicdArrow)"/>
    <rect x="400" y="186" width="120" height="36" rx="7" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="460" y="208" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Deploy prod</text>
  </g>
  <!-- fail fast -->
  <g>
    <line x1="338" y1="72" x2="338" y2="278" stroke="#ef4444" stroke-opacity="0.0"/>
    <path d="M206 78 v200" stroke="#ef4444" stroke-opacity="0.5" stroke-dasharray="3 4" fill="none"/>
    <rect x="540" y="252" width="172" height="50" rx="7" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="626" y="272" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">fail fast</text>
    <text x="626" y="289" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">stage nào fail → dừng cả pipeline</text>
  </g>
  <g font-size="9.5" fill="#ef4444" opacity="0.85" text-anchor="middle">
    <text x="206" y="296">✗ rớt bất kỳ stage nào ở trên = dừng ngay, không chạy tiếp</text>
  </g>
</svg>

Các stage điển hình:

1. **Build** — biên dịch, cài dependency, đóng gói. Nếu không build được thì dừng ngay, không phí công chạy test.
2. **Test** — unit test trước (nhanh, chạy trước để fail fast), rồi integration test. Nhanh ở trên, chậm ở dưới.
3. **Scan** — quét bảo mật: SAST (phân tích mã nguồn), dependency scan (CVE trong thư viện), secret scan (lỡ commit API key), và quét image (Trivy, Grype).
4. **Package / Artifact** — tạo ra artifact bất biến (immutable): một Docker image có tag cố định, một file `.jar`, một zip.
5. **Deploy** — đẩy artifact đó lên môi trường, tiến dần dev → staging → prod.

> 💡 Ghi nhớ: Sắp xếp stage theo nguyên tắc **rẻ và nhanh chạy trước**. Lint/unit test mất 30 giây nên đặt trước integration test mất 10 phút. Bắt được lỗi ở giây thứ 30 thì tiết kiệm 10 phút cho cả đội.

## Artifact & versioning: build một lần, deploy mọi nơi

Sai lầm phổ biến: build lại image ở mỗi môi trường. Build cho dev, rồi build lại cho staging, rồi build lại cho prod. Vấn đề là **ba lần build có thể ra ba kết quả khác nhau** (dependency vừa cập nhật, base image vừa đổi). Thứ bạn test ở staging không phải thứ chạy ở prod.

Nguyên tắc vàng: **build once, deploy everywhere.** Artifact được tạo một lần ở stage Package, rồi cùng artifact đó (cùng một digest) được promote qua các môi trường.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Build once, deploy everywhere — một artifact duy nhất promote qua dev, staging, prod</title>
  <desc>Stage Package tạo ra một artifact duy nhất với một digest sha256 cố định. Chính artifact đó được promote lần lượt sang dev, staging rồi prod; ba môi trường chạy cùng một image, chỉ khác config (biến môi trường) bơm vào lúc chạy.</desc>
  <!-- Package tạo artifact -->
  <rect x="16" y="110" width="150" height="70" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="91" y="134" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Package</text>
  <text x="91" y="152" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">build MỘT lần</text>
  <rect x="30" y="158" width="122" height="16" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="91" y="170" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.85">@sha256:a1b2c3…</text>
  <!-- mũi tên promote -->
  <defs>
    <marker id="promoteArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g stroke="currentColor" fill="none" stroke-opacity="0.55" marker-end="url(#promoteArrow)">
    <path d="M166 145 H210 V70 H262"/>
    <path d="M166 145 H210 V145 H392"/>
    <path d="M166 145 H210 V220 H522"/>
  </g>
  <g font-size="9.5" fill="currentColor" opacity="0.7">
    <text x="226" y="62">promote</text>
    <text x="226" y="137">promote</text>
    <text x="226" y="212">promote</text>
  </g>
  <!-- ba môi trường, cùng artifact -->
  <g>
    <rect x="262" y="44" width="150" height="52" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="337" y="64" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">dev</text>
    <text x="337" y="82" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.85">@sha256:a1b2c3…</text>
    <rect x="392" y="119" width="150" height="52" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="467" y="139" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">staging</text>
    <text x="467" y="157" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.85">@sha256:a1b2c3…</text>
    <rect x="522" y="194" width="150" height="52" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="597" y="214" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">prod</text>
    <text x="597" y="232" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.85">@sha256:a1b2c3…</text>
  </g>
  <!-- config khác nhau -->
  <g font-size="9.5" fill="#f59e0b" opacity="0.9">
    <text x="416" y="64">+ config dev</text>
    <text x="546" y="139">+ config staging</text>
    <text x="597" y="262" text-anchor="middle">+ config prod</text>
  </g>
  <text x="360" y="288" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">Cùng MỘT digest ở cả ba môi trường — chỉ khác config bơm vào lúc chạy (12-Factor)</text>
</svg>

Versioning artifact đúng cách:

```bash
# Tag image bằng git SHA — truy vết được chính xác commit nào
IMAGE="registry.example.com/payment-api"
SHA=$(git rev-parse --short HEAD)        # vd: a1b2c3d
docker build -t "$IMAGE:$SHA" .
docker push "$IMAGE:$SHA"

# Thêm tag semantic version khi release chính thức (SemVer)
docker tag "$IMAGE:$SHA" "$IMAGE:1.4.2"
docker push "$IMAGE:1.4.2"
```

> ⚠️ Bẫy production: **Tuyệt đối không deploy bằng tag `latest` lên production.** `latest` là tag di động — hôm nay nó trỏ image này, mai trỏ image khác. Khi cần rollback bạn sẽ không biết "bản trước" là image nào. Luôn deploy bằng tag bất biến (git SHA hoặc SemVer). Tốt hơn nữa: pin theo digest `@sha256:...`.

## Environments: dev / staging / prod

Code không nhảy thẳng từ máy lập trình viên lên prod. Nó đi qua một chuỗi môi trường, mỗi cái giống prod hơn cái trước:

| Môi trường | Mục đích | Dữ liệu | Ai dùng |
|---|---|---|---|
| dev | Tích hợp sớm, kiểm tra build chạy được | Dữ liệu giả | Lập trình viên |
| staging | Bản sao gần giống prod để test cuối | Dữ liệu giống prod (đã ẩn danh) | QA, lập trình viên |
| prod | Phục vụ khách hàng thật | Dữ liệu thật | Người dùng cuối |

Quy tắc cốt lõi: **staging phải càng giống prod càng tốt** — cùng version K8s, cùng cấu hình network, cùng cách inject secret. Khác nhau giữa staging và prod chính là nơi bug sống sót qua test. Khác biệt về config phải đến từ biến môi trường / config bên ngoài, **không phải từ việc build lại artifact**.

> 💡 Ghi nhớ: Cùng một artifact, khác config theo môi trường. Đây là tinh thần của 12-Factor App: tách config ra khỏi code.

## Trunk-based vs GitFlow: chọn nhánh, chọn tốc độ

Branching strategy quyết định pipeline của bạn trông ra sao.

| | Trunk-based | GitFlow |
|---|---|---|
| Nhánh chính | Một `main`, mọi người merge thẳng (qua PR ngắn) | `main` + `develop` + nhiều `feature/`, `release/`, `hotfix/` |
| Tuổi đời branch | Vài giờ đến 1-2 ngày | Có thể nhiều tuần |
| Merge conflict | Hiếm và nhỏ | Hay gặp và đau ("merge hell") |
| Hợp với | CI/CD liên tục, deploy nhiều lần/ngày | Release theo phiên bản, có lịch phát hành cố định |
| Feature chưa xong | Giấu sau **feature flag** | Để trong feature branch |

Năm 2025, đa số đội làm CI/CD hiện đại chọn **trunk-based development**: branch sống ngắn, merge thường xuyên vào `main`, dùng feature flag để giấu tính năng chưa hoàn thiện. GitFlow vẫn hợp lý cho phần mềm phát hành theo version (desktop app, thư viện, firmware).

> ⚠️ Bẫy production: GitFlow + deploy liên tục là kết hợp gây đau đớn. Branch sống lâu nghĩa là code của bạn càng ngày càng lệch khỏi `main`, đến lúc merge thì xung đột chồng chất và bạn test một thứ rất khác với thứ sẽ chạy thật.

## Pipeline as Code: pipeline phải nằm trong repo

Cấu hình pipeline phải là **code**, nằm cùng repo với ứng dụng, đi qua review và versioning như mọi file khác. Thời "vào UI Jenkins bấm chuột cấu hình job" đã qua.

Lợi ích:

- Thay đổi pipeline cũng qua PR, có người review, có lịch sử.
- Onboard người mới: pipeline tự mô tả chính nó trong repo.
- Khôi phục được: server CI cháy thì pipeline vẫn còn trong git.

Các định dạng: `.github/workflows/*.yml` (GitHub Actions), `.gitlab-ci.yml` (GitLab), `Jenkinsfile` (Jenkins), `buildspec.yml` (AWS CodeBuild).

## Ví dụ: pipeline GitHub Actions chạy được

Đây là pipeline thực tế: build → test → scan → package → deploy staging, deploy prod cần approval.

```yaml
name: ci-cd
on:
  push:
    branches: [main]
  pull_request:

env:
  IMAGE: ghcr.io/${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run lint        # rẻ + nhanh, chạy trước (fail fast)
      - run: npm test -- --coverage

  scan:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Trivy quét lỗ hổng filesystem
        uses: aquasecurity/trivy-action@0.28.0
        with:
          scan-type: fs
          severity: CRITICAL,HIGH
          exit-code: "1"          # có CVE nặng thì fail pipeline

  build-push:
    runs-on: ubuntu-latest
    needs: scan
    if: github.ref == 'refs/heads/main'   # chỉ build artifact từ main
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build & push (build once)
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ env.IMAGE }}:${{ github.sha }}   # tag bằng SHA, không dùng latest

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-push
    environment: staging
    steps:
      - run: ./deploy.sh staging ${{ env.IMAGE }}:${{ github.sha }}

  deploy-prod:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production        # GitHub bắt buộc manual approval ở đây
    steps:
      - run: ./deploy.sh production ${{ env.IMAGE }}:${{ github.sha }}
```

Để ý: `deploy-prod` gắn `environment: production`. Bạn cấu hình "Required reviewers" cho environment này trên GitHub, biến nó thành **manual approval gate** — chính là ranh giới Continuous Delivery. Bỏ reviewer đi thì nó thành Continuous Deployment.

Cùng artifact `${{ github.sha }}` được dùng cho cả staging và prod — đúng nguyên tắc build once, deploy everywhere.

## Fail fast: dừng sớm, dừng rẻ

Triết lý xuyên suốt pipeline: **fail ở chỗ rẻ nhất, sớm nhất.**

- Lint (giây) trước unit test (chục giây) trước integration test (phút) trước deploy.
- Stage fail thì pipeline dừng, **không** chạy tiếp các stage sau — đừng tốn 10 phút deploy một build đã fail test.
- Trong scan, set `exit-code: 1` để CVE nặng làm fail pipeline, thay vì chỉ in cảnh báo rồi cho qua.

> 💡 Ghi nhớ: Pipeline tốt là pipeline **ồn ào khi sai và im lặng khi đúng**. Nếu mọi người đã quen click bỏ qua cảnh báo đỏ, pipeline của bạn đã chết về mặt tác dụng.

## Liên hệ sang AWS

Trên AWS, các khái niệm trong bài ánh xạ trực tiếp sang bộ Developer Tools:

- **AWS CodePipeline** — bộ điều phối (orchestrator) các stage. Mỗi stage (Source → Build → Test → Deploy) tương đương các job ở trên. Approval gate trước prod là một **Manual Approval action** — đúng tinh thần Continuous Delivery.
- **AWS CodeBuild** — chạy build/test/scan. Pipeline as Code của nó là file `buildspec.yml` đặt trong repo, mô tả các phase `install / pre_build / build / post_build`.
- **AWS CodeDeploy** — lo phần deploy lên EC2, ECS hoặc Lambda, hỗ trợ blue/green và canary (sẽ học sâu ở bài deploy nâng cao).
- **Amazon ECR** — registry lưu Docker image. Bật **image scanning** (tích hợp Trivy/Inspector) đúng vai trò stage Scan. Đẩy image tag bằng git SHA vào ECR, không dùng `latest`.
- **CodeArtifact** — lưu trữ package/artifact (npm, Maven, PyPI) phục vụ "build once, deploy everywhere".

Thực tế 2025-2026, rất nhiều đội AWS dùng **GitHub Actions** (như ví dụ trên) để build/test/scan rồi chỉ dùng **OIDC role** assume vào AWS để deploy — bỏ qua CodePipeline. Đây là lựa chọn phổ biến: giữ trải nghiệm CI quen thuộc, vẫn deploy native lên ECS/EKS/Lambda mà không cần lưu AWS access key dài hạn trong CI.

Bài sau: **Infrastructure as Code với Terraform** — cách dựng chính những môi trường dev/staging/prod ở trên bằng code thay vì bấm console.
