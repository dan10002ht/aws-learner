# Deployment Strategies & Rollbacks

Domain 3 (Deployment) chiếm ~17% đề DVA-C02, và phần "chiến lược deploy" gần như **chắc chắn** xuất hiện vài câu. Đề thi không bắt bạn cấu hình hạ tầng phức tạp, mà hỏi kiểu: "Cần zero-downtime + rollback nhanh → chọn gì?", "Muốn test 10% traffic trước → strategy nào?". Bài này tập trung vào việc **ra quyết định** và những cái bẫy hay gặp.

## 1. Bức tranh tổng quan: 6 chiến lược deploy

Trước hết phải nắm trục so sánh: **downtime**, **chi phí hạ tầng** (có cần nhân đôi không), **rollback nhanh hay chậm**, **blast radius** (lỗi ảnh hưởng bao nhiêu % user).

| Strategy | Downtime | Nhân đôi hạ tầng | Rollback | Blast radius nếu deploy lỗi |
|---|---|---|---|---|
| **All-at-once** | Có (ngắn) | Không | Phải redeploy bản cũ | 100% ngay lập tức |
| **Rolling** | Không | Không | Chậm (rolling ngược) | Một phần (giảm capacity) |
| **Rolling with additional batch** | Không | Một phần (thêm batch) | Chậm | Một phần, giữ nguyên capacity |
| **Blue/Green** | Không | Có (2 môi trường) | **Cực nhanh** (switch ngược) | 0 cho tới khi switch |
| **Canary** | Không | Tùy (Lambda thì không) | Nhanh | Nhỏ (vài %) rồi tăng dần |
| **Linear** | Không | Tùy | Nhanh | Tăng đều theo bước |

### Phân biệt nhanh từng cái

- **All-at-once**: triển khai cùng lúc lên tất cả instance. Nhanh, rẻ, nhưng có downtime và nếu lỗi thì sập toàn bộ. Hợp cho dev/test.
- **Rolling**: chia instance thành batch, update lần lượt. Trong lúc deploy, **capacity bị giảm** (vì một batch đang offline để update).
- **Rolling with additional batch**: thêm hẳn một batch instance mới trước, nên **không giảm capacity**, nhưng tốn thêm tiền tạm thời. Chọn khi cần giữ đủ tải sản xuất.
- **Blue/Green**: dựng môi trường mới (green) song song với cũ (blue), test xong **chuyển toàn bộ traffic** sang green. Rollback = trỏ lại blue. Tốn gấp đôi hạ tầng tạm thời.
- **Canary**: đẩy **một phần nhỏ traffic** (vd 10%) sang bản mới, theo dõi, rồi đẩy phần còn lại. Thường là **2 bước**: x% rồi 100%.
- **Linear**: tăng traffic **đều đặn theo từng bước** (vd +10% mỗi 1 phút) cho tới 100%.

> ⚠️ **Bẫy kinh điển: Canary vs Linear vs Blue/Green.**
> - **Canary** = 2 nhịp: một phần nhỏ → (đợi/theo dõi) → toàn bộ. "Test 10% rồi nhảy 100%".
> - **Linear** = nhiều nhịp đều: 10% → 20% → ... → 100%, mỗi bước cách đều thời gian.
> - **Blue/Green** = nhảy 0% → 100% một phát (sau khi green sẵn sàng). Không có "một phần traffic".
> Đề hay mô tả "shift 10% traffic, đợi 10 phút, rồi shift hết" → đó là **Canary**, KHÔNG phải linear.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Đồ thị % traffic chuyển sang bản mới theo thời gian — Canary, Linear, Blue/Green, All-at-once</title>
  <desc>Trục ngang là thời gian, trục dọc là phần trăm traffic sang bản mới. Canary nhảy lên một phần nhỏ rồi nhảy thẳng 100%. Linear tăng đều từng bước 10%. Blue/Green và All-at-once nhảy thẳng 0 lên 100% trong một lần chuyển.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">% traffic sang bản mới theo thời gian</text>

  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M70 40 V300"/>
    <path d="M70 300 H660"/>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.7">
    <text x="64" y="60" text-anchor="end">100%</text>
    <text x="64" y="174" text-anchor="end">50%</text>
    <text x="64" y="304" text-anchor="end">0%</text>
    <text x="360" y="328" text-anchor="middle">thời gian →</text>
    <text x="40" y="170" text-anchor="middle" transform="rotate(-90 40 170)">% traffic</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.12" fill="none">
    <path d="M70 56 H660"/>
    <path d="M70 178 H660"/>
  </g>

  <g stroke-width="2.5" fill="none" stroke-linejoin="round">
    <path d="M70 300 H300 V274 H470 V56 H660" stroke="#3b82f6"/>
    <path d="M70 300 H120 L300 105 V56 H660" stroke="#10b981"/>
    <path d="M70 300 H440 V56 H660" stroke="#8b5cf6"/>
    <path d="M70 300 H120 V56 H660" stroke="#f59e0b" stroke-dasharray="6 4"/>
  </g>
  <g fill="currentColor">
    <circle cx="300" cy="274" r="3.5" fill="#3b82f6"/>
    <circle cx="470" cy="56" r="3.5" fill="#3b82f6"/>
    <circle cx="120" cy="261" r="3" fill="#10b981"/>
    <circle cx="210" cy="183" r="3" fill="#10b981"/>
    <circle cx="300" cy="105" r="3" fill="#10b981"/>
  </g>

  <g font-size="11">
    <rect x="486" y="246" width="12" height="12" rx="2" fill="#3b82f6"/>
    <text x="503" y="256" fill="currentColor">Canary (10% → 100%)</text>
    <rect x="486" y="266" width="12" height="12" rx="2" fill="#10b981"/>
    <text x="503" y="276" fill="currentColor">Linear (+10% mỗi bước)</text>
    <rect x="486" y="286" width="12" height="12" rx="2" fill="#8b5cf6"/>
    <text x="503" y="296" fill="currentColor">Blue/Green (0→100% 1 lần)</text>
    <rect x="486" y="306" width="12" height="12" rx="2" fill="#f59e0b"/>
    <text x="503" y="316" fill="currentColor">All-at-once (tức thì)</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.7">
    <text x="306" y="270">đợi rồi nhảy 100%</text>
    <text x="124" y="255">bước đều</text>
  </g>
</svg>

## 2. Deploy trên Elastic Beanstalk (hay bị nhầm lẫn)

Beanstalk hỗ trợ sẵn các policy này — đề hay hỏi "muốn không downtime + không giảm capacity → chọn cái nào?".

| Policy EB | Downtime | Giảm capacity | Rollback |
|---|---|---|---|
| All at once | Có | — | Manual redeploy |
| Rolling | Không | **Có** | Chậm |
| Rolling with additional batch | Không | **Không** | Chậm |
| Immutable | Không | Không (dựng instance mới hoàn toàn) | **Nhanh** (xóa instance mới) |
| Traffic splitting | Không | Không | Nhanh (canary-style) |
| Blue/Green (qua swap URL) | Không | Không | Nhanh (swap ngược) |

> 💡 **Mẹo thi:** Trên Beanstalk, **Immutable** và **Blue/Green** cho rollback an toàn nhất. Câu hỏi "muốn giữ nguyên capacity production trong lúc deploy" → loại **Rolling** (vì nó giảm capacity), chọn **Rolling with additional batch** hoặc **Immutable**.

## 3. Lambda: Versions & Aliases — nền tảng của traffic shifting

Đây là phần **bị hỏi nhiều nhất** trong domain này. Phải nắm chắc.

### Version
- Mỗi lần `PublishVersion`, Lambda tạo một **version bất biến** (immutable snapshot của code + config), đánh số `1`, `2`, `3`...
- `$LATEST` là bản đang sửa được (mutable). Version đã publish thì **không sửa được**.

```bash
# Publish version mới
aws lambda publish-version --function-name myFunc
# → trả về "Version": "2"
```

### Alias
- Alias là **con trỏ có tên** (vd `prod`, `dev`) trỏ tới một version.
- Client gọi qua alias ARN, không cần biết version số mấy. Đổi version chỉ cần đổi alias trỏ.

```bash
aws lambda create-alias --function-name myFunc \
  --name prod --function-version 1
```

### Weighted alias = Traffic shifting (CỰC KỲ HAY THI)
Một alias có thể trỏ tới **2 version cùng lúc** với tỉ lệ phần trăm → đây chính là cơ chế canary/linear của Lambda.

```bash
# Alias 'prod' gửi 90% sang v1, 10% sang v2
aws lambda update-alias --function-name myFunc \
  --name prod --function-version 1 \
  --routing-config '{"AdditionalVersionWeights": {"2": 0.10}}'
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Lambda weighted alias — alias prod chia traffic 90% sang v1 và 10% sang v2</title>
  <desc>Client gọi alias prod. Alias trỏ tới version chính v1 nhận 90% traffic còn lại và một version phụ v2 nhận 10% theo trọng số. Alias không thể trỏ tới $LATEST.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Weighted alias: chia traffic theo trọng số</text>

  <defs>
    <marker id="walArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <rect x="24" y="108" width="120" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="84" y="132" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
  <text x="84" y="150" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gọi alias ARN</text>

  <line x1="144" y1="136" x2="234" y2="136" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#walArr)"/>

  <rect x="236" y="100" width="150" height="72" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="311" y="124" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Alias 'prod'</text>
  <text x="311" y="142" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">function-version: 1</text>
  <text x="311" y="158" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">+ weight {2: 0.10}</text>

  <path d="M386 124 H470 V72" fill="none" stroke="#10b981" stroke-opacity="0.7" stroke-width="2" marker-end="url(#walArr)"/>
  <path d="M386 150 H470 V198" fill="none" stroke="#f59e0b" stroke-opacity="0.7" stroke-width="2" marker-end="url(#walArr)"/>
  <text x="408" y="98" font-size="11" font-weight="700" fill="#10b981">90%</text>
  <text x="408" y="190" font-size="11" font-weight="700" fill="#f59e0b">10%</text>

  <rect x="476" y="44" width="180" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="566" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Version 1 (chính)</text>
  <text x="566" y="86" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">nhận traffic còn lại</text>

  <rect x="476" y="200" width="180" height="56" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="566" y="224" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Version 2 (phụ)</text>
  <text x="566" y="242" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">weight = 0.10</text>

  <rect x="236" y="208" width="150" height="44" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 3"/>
  <text x="311" y="227" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.7">$LATEST</text>
  <text x="311" y="244" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">KHÔNG thể trỏ</text>
  <line x1="386" y1="160" x2="320" y2="208" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/>
  <line x1="300" y1="216" x2="322" y2="244" stroke="currentColor" stroke-opacity="0.45"/>
  <line x1="322" y1="216" x2="300" y2="244" stroke="currentColor" stroke-opacity="0.45"/>
</svg>

> ⚠️ **Bẫy weighted alias:**
> - `--function-version` là version **chính** (nhận phần traffic còn lại). `AdditionalVersionWeights` chỉ định version **phụ** + tỉ lệ. Ở ví dụ trên: v1 = 90%, v2 = 10%.
> - Trọng số là số trong khoảng `[0.0, 1.0]`, KHÔNG phải 0–100.
> - **Không thể** trỏ weighted alias tới `$LATEST` — chỉ trỏ được tới version đã publish. Bẫy hay gặp: đề cho alias trỏ `$LATEST` rồi hỏi sao traffic shifting lỗi.
> - Không thể chia traffic giữa **3 version** — chỉ tối đa 2 (1 chính + 1 phụ).

## 4. CodeDeploy cho Lambda — tự động hóa traffic shifting

Bạn có thể tự `update-alias` thủ công, nhưng **CodeDeploy** làm việc dịch chuyển traffic theo preset + tự rollback khi alarm kêu. Đề rất hay hỏi tên các preset.

### Các preset deployment config cho Lambda

| Preset | Hành vi |
|---|---|
| `CodeDeployDefault.LambdaCanary10Percent5Minutes` | Shift 10% → đợi 5 phút → 100% |
| `CodeDeployDefault.LambdaCanary10Percent30Minutes` | 10% → 30 phút → 100% |
| `CodeDeployDefault.LambdaLinear10PercentEvery1Minute` | +10% mỗi 1 phút (10 bước) |
| `CodeDeployDefault.LambdaLinear10PercentEvery3Minutes` | +10% mỗi 3 phút |
| `CodeDeployDefault.LambdaAllAtOnce` | Shift 100% ngay |

Cách đọc tên: `Canary10Percent5Minutes` = canary, bước đầu 10%, chờ 5 phút. `Linear10PercentEvery1Minute` = mỗi phút thêm 10%.

> 💡 **Mẹo thi:** Tên preset **tự giải thích**. Nếu đề mô tả "10% rồi đợi rồi 100%" → tìm preset có chữ **Canary**. "Tăng đều X% mỗi Y phút" → preset **Linear**. Đừng học thuộc số, hãy đọc tên.

### CodeDeploy Lambda dùng AppSpec (YAML/JSON)
CodeDeploy biết deploy gì qua `appspec.yml`. Với Lambda, nó khai báo alias + version cũ/mới + hook:

```yaml
version: 0.0
Resources:
  - myLambdaFunction:
      Type: AWS::Lambda::Function
      Properties:
        Name: myFunc
        Alias: prod
        CurrentVersion: 1
        TargetVersion: 2
Hooks:
  - BeforeAllowTraffic: validateBeforeFn   # hook kiểm tra trước khi shift
  - AfterAllowTraffic: validateAfterFn     # hook sau khi shift xong
```

- **BeforeAllowTraffic**: chạy Lambda hook *trước* khi shift traffic (smoke test). Fail → hủy deploy.
- **AfterAllowTraffic**: chạy *sau* khi đã shift 100% (validation cuối). Fail → rollback.

> ⚠️ **Bẫy AppSpec:** Với **Lambda và ECS**, hai hook là `BeforeAllowTraffic`/`AfterAllowTraffic`. Với **EC2/On-premise** thì hook khác hẳn (`BeforeInstall`, `AfterInstall`, `ApplicationStart`, `ValidateService`...). Đề trộn 2 loại hook để gài bẫy. Và AppSpec cho EC2 thường viết **YAML**, cho Lambda thì **YAML hoặc JSON** đều được.

## 5. SAM — cách thường gặp nhất để cấu hình Lambda deploy

Trong thực tế (và đề thi), traffic shifting Lambda thường khai báo gọn qua **AWS SAM** với `AutoPublishAlias` + `DeploymentPreference`:

```yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: nodejs20.x
      AutoPublishAlias: prod          # tự publish version + tạo/cập nhật alias
      DeploymentPreference:
        Type: Canary10Percent5Minutes
        Alarms:                        # alarm để auto rollback
          - !Ref ErrorAlarm
        Hooks:
          PreTraffic: !Ref PreHookFn
          PostTraffic: !Ref PostHookFn
```

- `AutoPublishAlias: prod` → mỗi lần deploy, SAM tự `PublishVersion` và trỏ alias `prod`. Đây là điều kiện để CodeDeploy shift traffic.
- `DeploymentPreference.Type` dùng tên preset **không có tiền tố** `CodeDeployDefault.` (SAM tự gắn).

> 💡 **Mẹo thi:** Thấy `AutoPublishAlias` + `DeploymentPreference` → đó là SAM dàn xếp CodeDeploy để shift traffic Lambda dần dần + auto rollback theo alarm. Đây là combo "đúng" cho câu hỏi "deploy Lambda mới an toàn, tự rollback khi lỗi".

## 6. API Gateway: Stages & Stage Variables

API Gateway deploy theo **stage** (`dev`, `test`, `prod`). Mỗi stage là một snapshot của API.

### Stage variables — biến cấu hình theo stage
Stage variables như **biến môi trường** gắn vào stage, dùng để cùng một API trỏ tới backend khác nhau tùy stage.

Ví dụ kinh điển: dùng stage variable trỏ tới **Lambda alias** khác nhau:

```
# Integration URI dùng biến:
arn:aws:lambda:...:function:myFunc:${stageVariables.lambdaAlias}

# stage 'dev'  → lambdaAlias = dev
# stage 'prod' → lambdaAlias = prod
```

→ Cùng một API definition, stage `prod` gọi alias `prod`, stage `dev` gọi alias `dev`. Đây là cách làm canary/blue-green ở tầng API mà không cần sửa code.

### Canary deployment của chính API Gateway
API Gateway stage còn có **canary settings** riêng: gửi X% request sang một bản deploy mới của API, theo dõi rồi promote.

> ⚠️ **Bẫy stage variables:**
> - Stage variables **KHÔNG phải** để lưu secret (dùng Secrets Manager / SSM cho secret). Chúng plaintext, lộ trong config.
> - Tham chiếu trong mapping/integration bằng `${stageVariables.tênBiến}` — sai cú pháp là bẫy.
> - Stage variable thường dùng để: chọn Lambda alias, chọn HTTP endpoint backend, hoặc làm tham số cho integration.

## 7. ECS deployment

ECS service hỗ trợ 2 kiểu controller deploy chính:

| Kiểu | Cơ chế | Rollback |
|---|---|---|
| **Rolling update** (`ECS` controller) | ECS thay task cũ bằng task mới dần dần, điều khiển qua `minimumHealthyPercent` / `maximumPercent` | Deploy lại task definition cũ |
| **Blue/Green** (`CODE_DEPLOY` controller) | CodeDeploy dựng task set mới, shift traffic qua ALB, hỗ trợ Canary/Linear/AllAtOnce | **Nhanh** — switch target group ngược |

### Hai tham số quan trọng của rolling update
- `minimumHealthyPercent`: % task tối thiểu phải chạy trong lúc deploy (vd 100% = không được giảm tải).
- `maximumPercent`: % task tối đa (vd 200% = được phép chạy gấp đôi tạm thời để thêm task mới trước khi gỡ task cũ).

> 💡 **Mẹo thi:** Muốn ECS deploy **không giảm capacity** → đặt `minimumHealthyPercent: 100` và `maximumPercent: 200` (giống "rolling with additional batch"). Muốn **blue/green cho ECS** → bắt buộc dùng **CodeDeploy** (`CODE_DEPLOY` deployment controller), ECS controller thường KHÔNG làm blue/green.

> ⚠️ **Bẫy ECS:** Blue/Green cho ECS **không phải** tính năng built-in của ECS — nó cần **CodeDeploy** đứng ra điều phối. Đề hỏi "blue/green ECS với traffic shifting" mà đáp án không nhắc CodeDeploy thì sai.

## 8. Rollback — tự động và thủ công

Rollback là điểm "ăn điểm" nếu nắm rõ cơ chế từng dịch vụ.

### Auto rollback theo CloudWatch Alarm (CodeDeploy)
CodeDeploy (Lambda & ECS & EC2) có thể **tự rollback** khi:
- Một **CloudWatch Alarm** chuyển sang `ALARM` trong lúc/ sau deploy.
- Deploy **fail** (vd hook BeforeAllowTraffic/AfterAllowTraffic trả lỗi).

```yaml
# Trong CodeDeploy deployment group / SAM
autoRollbackConfiguration:
  enabled: true
  events:
    - DEPLOYMENT_FAILURE
    - DEPLOYMENT_STOP_ON_ALARM
```

Luồng điển hình: deploy version mới → shift 10% → alarm error rate kêu → CodeDeploy **tự shift traffic ngược về version cũ** → deploy báo failed.

> 💡 **Mẹo thi:** "Lambda deploy mới, nếu error rate tăng thì tự quay về bản cũ" → đáp án = **CodeDeploy với CloudWatch Alarm + auto rollback** (qua SAM `DeploymentPreference.Alarms` hoặc CodeDeploy deployment group). Đây là pattern chuẩn, nhớ kỹ.

### CloudFormation rollback
- Khi `create-stack` / `update-stack` **fail**, CloudFormation **tự rollback** về trạng thái trước đó theo mặc định.
- `create` fail → stack vào `ROLLBACK_COMPLETE` (thường phải xóa stack tạo lại).
- `update` fail → `UPDATE_ROLLBACK_COMPLETE` (giữ được stack).
- Có thể tắt rollback (`--disable-rollback` / `OnFailure: DO_NOTHING`) để **giữ tài nguyên lỗi mà debug**.
- **Rollback triggers**: gắn CloudWatch Alarm vào stack update; nếu alarm kêu trong "monitoring period" → CFN rollback update.

```bash
aws cloudformation create-stack --stack-name s --template-body file://t.yaml \
  --on-failure DO_NOTHING   # giữ lại để debug thay vì rollback
```

> ⚠️ **Bẫy CloudFormation rollback:**
> - `ROLLBACK_COMPLETE` (sau khi **create** fail) là trạng thái "chết" — KHÔNG update tiếp được, phải **delete rồi tạo lại**. Đề hay hỏi "stack ở ROLLBACK_COMPLETE, làm sao update?" → đáp án: xóa và tạo lại.
> - `--disable-rollback` dùng để **debug** (giữ tài nguyên đã tạo), không phải để "deploy nhanh hơn".

## 9. Cây quyết định — "khi nào dùng cái gì"

Đây là phần nên thuộc lòng để giải nhanh câu tình huống:

- **Cần zero-downtime + rollback gần như tức thì, chấp nhận tốn gấp đôi hạ tầng tạm thời** → **Blue/Green**.
- **Muốn test bản mới với một phần nhỏ user thật trước khi rollout** → **Canary**.
- **Muốn tăng traffic đều đặn, theo dõi liên tục** → **Linear**.
- **Tiết kiệm, chấp nhận downtime ngắn (dev/test)** → **All-at-once**.
- **Không downtime nhưng không muốn nhân đôi hạ tầng, chấp nhận giảm capacity** → **Rolling**.
- **Không downtime, GIỮ capacity** → **Rolling with additional batch** (EB) / `min 100% max 200%` (ECS).
- **Lambda deploy an toàn + auto rollback theo lỗi** → **SAM `DeploymentPreference` (Canary/Linear) + Alarms + CodeDeploy**.
- **Cùng một API trỏ backend khác nhau theo môi trường** → **API Gateway stage variables** (vd trỏ Lambda alias).
- **Blue/Green cho ECS** → **CodeDeploy controller** (không phải ECS controller).

## 10. Tổng kết các bẫy thi hay gặp

| Tình huống đề mô tả | Bẫy | Đáp án đúng |
|---|---|---|
| "Shift 10% rồi đợi rồi 100%" | Nhầm sang Linear | **Canary** |
| "Tăng 10% mỗi phút" | Nhầm sang Canary | **Linear** |
| "Nhảy 0→100% sau khi sẵn sàng" | Nhầm sang canary | **Blue/Green** |
| Weighted alias trỏ `$LATEST` | Tưởng hợp lệ | Phải trỏ **version đã publish** |
| Trọng số alias = 10 (thay vì 0.1) | Sai thang | Dùng **0.0–1.0** |
| Blue/Green ECS không nhắc CodeDeploy | Tưởng ECS tự làm | Cần **CodeDeploy** |
| Stage variable lưu secret | Tưởng an toàn | Dùng **Secrets Manager/SSM** |
| Rolling giữ nguyên capacity | Sai | Rolling **giảm** capacity; cần **additional batch** |
| Stack `ROLLBACK_COMPLETE` update tiếp | Tưởng update được | Phải **delete + tạo lại** |
| Hook EC2 (`AfterInstall`) cho Lambda | Trộn hook | Lambda/ECS dùng **Before/AfterAllowTraffic** |

> 💡 **Mẹo thi cuối:** Khi gặp câu deploy, làm 3 bước: (1) dịch vụ gì — Lambda / ECS / EC2-Beanstalk / API Gateway? (2) đề ưu tiên gì — zero-downtime, rollback nhanh, hay rẻ? (3) match với strategy + tool tương ứng. Đa số câu chỉ cần đọc đúng từ khóa "canary/linear/blue-green" và biết **ai điều phối traffic shifting** (CodeDeploy cho Lambda/ECS, weighted alias cho Lambda thủ công).
