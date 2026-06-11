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

```
 commit ──► [Build] ──► [Test] ──► [Scan] ──► [Package] ──► [Deploy dev]
                                                                 │
                                              [Deploy staging] ◄─┘
                                                     │
                                            (approval gate)
                                                     │
                                              [Deploy prod]
```

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
