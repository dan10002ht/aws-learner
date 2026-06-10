# Packaging & IaC — Đóng gói và Infrastructure as Code

Domain 3 (Deployment) chiếm ~25% đề DVA-C02. Phần này xoay quanh một câu hỏi cốt lõi mà thi rất hay xoáy vào: **"Khi nào dùng SAM, khi nào CloudFormation thuần, khi nào CDK?"** và **"Đóng gói Lambda thế nào cho đúng?"**. Bài này đi từ CloudFormation (nền tảng) lên SAM (lớp đường ngắn cho serverless) rồi CDK (code sinh ra CloudFormation), kèm AppConfig cho feature flags.

## Bức tranh tổng: cả 3 đều ra CloudFormation

```
CDK (TypeScript/Python/...) ──cdk synth──▶ CloudFormation template
SAM (template.yaml gọn)     ──transform──▶ CloudFormation template
CloudFormation YAML/JSON    ──────────────▶ Resources thật
```

Điểm chốt để nhớ: **SAM và CDK cuối cùng đều biến thành CloudFormation rồi mới deploy**. CloudFormation là engine thực thi; SAM/CDK chỉ là cách viết ngắn gọn hơn.

| Tiêu chí | CloudFormation | SAM | CDK |
|---|---|---|---|
| Ngôn ngữ | YAML / JSON | YAML (superset của CFN) | TypeScript, Python, Java, Go, C# |
| Tối ưu cho | Mọi loại resource | Serverless (Lambda, API GW, DynamoDB) | Mọi loại, logic phức tạp |
| Mức trừu tượng | Thấp (khai báo từng field) | Trung (rút gọn serverless) | Cao (constructs tái dùng) |
| Vòng lặp/điều kiện | Hạn chế (`Conditions`) | Hạn chế | Đầy đủ (vòng lặp, hàm, OOP) |
| Local testing | Không | `sam local` | Không (synth ra rồi test) |
| Khi nào chọn | Team quen YAML, hạ tầng tổng quát | App serverless thuần | Logic động, nhiều môi trường, dev quen code |

> 💡 Mẹo thi: Nếu đề nói "developer muốn dùng **ngôn ngữ lập trình quen thuộc** (TypeScript/Python) để định nghĩa hạ tầng" → **CDK**. Nếu đề nói "viết template **ngắn gọn cho Lambda/API Gateway/DynamoDB** + test local" → **SAM**. Nếu chỉ nói "Infrastructure as Code chung chung, không serverless đặc thù" → **CloudFormation**.

---

## CloudFormation — nền tảng phải nắm chắc

### Cấu trúc một template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Demo stack
Parameters:        # Input từ ngoài vào
  EnvName:
    Type: String
    AllowedValues: [dev, prod]
    Default: dev
Mappings:          # Tra cứu tĩnh kiểu key-value
  EnvConfig:
    dev:  { InstanceType: t3.micro }
    prod: { InstanceType: t3.large }
Conditions:        # Logic bật/tắt resource
  IsProd: !Equals [!Ref EnvName, prod]
Resources:         # BẮT BUỘC — phần duy nhất không thể thiếu
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "myapp-${EnvName}-${AWS::AccountId}"
Outputs:           # Export giá trị ra ngoài / cho stack khác
  BucketArn:
    Value: !GetAtt MyBucket.Arn
    Export:
      Name: !Sub "${EnvName}-bucket-arn"
```

> ⚠️ Bẫy: Chỉ section **`Resources`** là bắt buộc. Đề hay hỏi "section nào không thể thiếu trong CloudFormation template" — đáp án là `Resources`.

### Intrinsic functions — thi rất hay hỏi phân biệt

| Hàm | Tác dụng | Ví dụ |
|---|---|---|
| `!Ref` | Lấy giá trị tham số, HOẶC ID/tên mặc định của resource | `!Ref MyBucket` → tên bucket |
| `!GetAtt` | Lấy **thuộc tính cụ thể** của resource | `!GetAtt MyBucket.Arn` → ARN |
| `!Sub` | Thay biến vào chuỗi | `!Sub "${EnvName}-app"` |
| `!Join` | Nối list thành chuỗi | `!Join ["-", [a, b]]` → `a-b` |
| `!ImportValue` | Lấy giá trị `Export` từ stack khác | `!ImportValue dev-bucket-arn` |
| `!FindInMap` | Tra cứu trong `Mappings` | `!FindInMap [EnvConfig, !Ref EnvName, InstanceType]` |

> ⚠️ Bẫy `Ref` vs `GetAtt`: với cùng một resource, `!Ref` và `!GetAtt` thường trả về **giá trị khác nhau**. Ví dụ `AWS::S3::Bucket`: `!Ref` → tên bucket, `!GetAtt .Arn` → ARN. Với `AWS::EC2::Instance`: `!Ref` → instance ID, `!GetAtt .PublicIp` → IP. Đề hay đưa tình huống "cần ARN" rồi gài đáp án `!Ref` sai.

> 💡 Mẹo thi: `!Sub` gọn hơn `!Join` rất nhiều khi ghép chuỗi có biến. Trong `!Sub` có thể dùng pseudo parameter như `${AWS::Region}`, `${AWS::AccountId}`, `${AWS::StackName}` mà không cần khai báo.

### Change sets — xem trước thay đổi

Change set cho phép **preview** những gì sẽ thay đổi trước khi thực thi, tránh xóa nhầm resource production.

```bash
aws cloudformation create-change-set \
  --stack-name myapp --change-set-name cs1 \
  --template-body file://template.yaml
aws cloudformation describe-change-set \
  --stack-name myapp --change-set-name cs1   # xem diff
aws cloudformation execute-change-set \
  --stack-name myapp --change-set-name cs1   # áp dụng
```

> 💡 Mẹo thi: "Muốn biết update có làm **replace/xóa** resource nào không trước khi apply" → **change set**. Change set còn cho thấy resource nào bị `Replacement: True` (nguy hiểm, mất dữ liệu).

### Nested stacks vs Cross-stack reference

| | Nested stack | Cross-stack (Export/ImportValue) |
|---|---|---|
| Cơ chế | `AWS::CloudFormation::Stack` lồng template con | `Outputs.Export` + `!ImportValue` |
| Quan hệ | Cha sở hữu con (lifecycle gắn chặt) | Stack độc lập, chỉ chia sẻ giá trị |
| Tái dùng | Tốt cho component lặp lại (VPC, subnet) | Tốt cho tài nguyên dùng chung (1 VPC nhiều app) |
| Cảnh báo | Update cha có thể đụng con | **Không xóa được Export đang bị stack khác import** |

### Drift detection

Drift = ai đó sửa resource **thủ công** (qua console/CLI) khiến thực tế lệch với template. `detect-stack-drift` phát hiện lệch này.

> ⚠️ Bẫy: CloudFormation **không tự sửa** drift. Nó chỉ báo cáo `MODIFIED/DELETED`. Muốn đồng bộ lại phải update stack hoặc sửa tay về đúng.

---

## AWS SAM — đường tắt cho serverless

SAM là **superset của CloudFormation**: mọi cú pháp CloudFormation đều hợp lệ trong SAM, cộng thêm các resource type `AWS::Serverless::*` viết cực gọn.

### Dòng Transform — thứ làm nên SAM

```yaml
Transform: AWS::Serverless-2016-10-31   # BẮT BUỘC — biến SAM thành CloudFormation
```

> ⚠️ Bẫy thi kinh điển: Dòng `Transform: AWS::Serverless-2016-10-31` là thứ **bắt buộc** để CloudFormation hiểu đây là SAM template. Thiếu nó → CloudFormation báo lỗi không nhận ra `AWS::Serverless::Function`. Đề rất hay hỏi "thiếu gì khiến SAM template không deploy được".

### Template SAM mẫu

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Globals:                       # Cấu hình dùng chung cho mọi Function
  Function:
    Runtime: python3.12
    Timeout: 10
    MemorySize: 256
    Environment:
      Variables:
        TABLE: !Ref ItemsTable
Resources:
  GetItemFn:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      Policies:                # Policy templates — không cần viết IAM JSON tay
        - DynamoDBReadPolicy:
            TableName: !Ref ItemsTable
      Events:                  # Tự tạo API Gateway + route
        Api:
          Type: Api
          Properties: { Path: /item, Method: get }
  ItemsTable:
    Type: AWS::Serverless::SimpleTable   # gọn cho DynamoDB
```

### Globals — DRY cho nhiều Lambda

`Globals` cho phép khai báo Runtime/Timeout/MemorySize/Env một lần, áp cho **tất cả** Function. Function riêng vẫn override được.

> 💡 Mẹo thi: Đề hỏi "nhiều Lambda dùng chung Runtime/Timeout, tránh lặp lại" → dùng **`Globals`**.

### Policy templates — không viết IAM tay

Thay vì viết IAM policy JSON đầy đủ, SAM cho dùng **policy template** đặt tên sẵn, scope đúng mức tối thiểu:

| Policy template | Cấp quyền |
|---|---|
| `DynamoDBReadPolicy` | Đọc 1 bảng DynamoDB |
| `DynamoDBCrudPolicy` | CRUD 1 bảng |
| `S3ReadPolicy` | Đọc 1 bucket |
| `SQSSendMessagePolicy` | Gửi message vào 1 queue |

> 💡 Mẹo thi: "Cấp quyền least-privilege cho Lambda mà không muốn viết IAM JSON" → **SAM policy templates**.

### Các lệnh SAM CLI

```bash
sam init                 # tạo project mẫu
sam build                # build + cài dependency vào .aws-sam/build
sam local invoke GetItemFn -e event.json   # chạy Lambda LOCAL trong Docker
sam local start-api      # giả lập API Gateway tại localhost:3000
sam deploy --guided      # đóng gói lên S3 + tạo/đổi CloudFormation stack
```

| Lệnh | Làm gì | Cần Docker? |
|---|---|---|
| `sam build` | Cài dependency, chuẩn bị artifact | Không (trừ `--use-container`) |
| `sam local invoke` | Chạy 1 Lambda offline | **Có** |
| `sam local start-api` | Giả lập API Gateway offline | **Có** |
| `sam deploy` | Upload + deploy qua CloudFormation | Không |

> ⚠️ Bẫy: `sam local` cần **Docker** chạy máy local. Đề hay hỏi "test Lambda dưới máy trước khi deploy" → `sam local invoke` / `sam local start-api`.

> 💡 Mẹo thi: `sam deploy` dưới nền dùng chính **CloudFormation change set** để áp thay đổi — nên SAM kế thừa toàn bộ ưu điểm rollback/preview của CloudFormation.

---

## AWS CDK — viết hạ tầng bằng code

CDK cho phép định nghĩa hạ tầng bằng ngôn ngữ lập trình thật, rồi `cdk synth` sinh ra CloudFormation template.

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const bucket = new s3.Bucket(this, 'Data', { versioned: true });
    const fn = new lambda.Function(this, 'Fn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'app.handler',
      code: lambda.Code.fromAsset('src'),
    });
    bucket.grantRead(fn);   // tự sinh IAM policy least-privilege
  }
}
```

### Constructs — 3 cấp độ

| Cấp | Tên | Mô tả |
|---|---|---|
| L1 | Cfn* (ví dụ `CfnBucket`) | Map 1-1 với resource CloudFormation, thô |
| L2 | `Bucket`, `Function` | Có default hợp lý + method tiện (`grantRead`) |
| L3 | Patterns | Gộp nhiều resource thành 1 pattern hoàn chỉnh |

### Các lệnh CDK

```bash
cdk init app --language typescript
cdk synth        # sinh ra CloudFormation template (KHÔNG deploy)
cdk bootstrap    # tạo S3 bucket/role hỗ trợ deploy (chạy 1 lần/account-region)
cdk deploy       # synth + deploy qua CloudFormation
cdk diff         # so sánh với stack đang chạy
```

> ⚠️ Bẫy: `cdk bootstrap` phải chạy **một lần cho mỗi account/region** trước `cdk deploy` lần đầu. Thiếu bootstrap → deploy lỗi. Đề hay gài tình huống này.

> 💡 Mẹo thi: `cdk synth` chỉ **sinh template, không deploy**. Method kiểu `bucket.grantRead(fn)` tự sinh IAM least-privilege — đây là điểm khác biệt lớn so với viết CloudFormation tay.

---

## Lambda packaging — zip vs container image

| | ZIP archive | Container image |
|---|---|---|
| Giới hạn dung lượng | 50 MB (zip) / 250 MB (giải nén, gồm layers) | **10 GB** |
| Khi nào dùng | Code + dependency nhẹ, thông thường | Dependency lớn, cần OS package, đã có Docker workflow |
| Layers | Có | Không (gói thẳng vào image) |
| Build | `sam build` / zip tay | Dockerfile + base image AWS |

> 💡 Mẹo thi: Đề nói "package Lambda **vượt 250 MB**" hoặc "cần thư viện hệ thống/ML lớn" → **container image (tới 10 GB)**. Đề nói "nhiều function **dùng chung thư viện**, muốn giảm size mỗi deploy" → **Lambda layers**.

### Lambda Layers

Layer = gói code/dependency chung, tách khỏi function. Nhiều function share 1 layer.

- Tối đa **5 layers** mỗi function.
- Tổng size sau giải nén (function + tất cả layers) ≤ **250 MB**.
- Nội dung layer được giải nén vào `/opt` trong runtime.

```bash
aws lambda publish-layer-version \
  --layer-name shared-deps \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12
```

> ⚠️ Bẫy: Layers **không** giúp vượt giới hạn 250 MB — chúng vẫn nằm trong tổng 250 MB đó. Muốn thật sự lớn phải dùng **container image 10 GB**. Đề hay đánh tráo hai ý này.

> ⚠️ Bẫy cấu trúc thư mục layer: dependency phải đặt đúng path runtime mong đợi. Ví dụ Python phải là `python/` hoặc `python/lib/python3.12/site-packages/`, Node.js là `nodejs/node_modules/`. Sai path → import không thấy.

### Dependency management & artifact organization

- **Python**: `requirements.txt` → `sam build` tự `pip install` vào artifact.
- **Node.js**: `package.json` → `npm install`. Dùng layer cho `node_modules` nặng.
- **Java**: `pom.xml`/`gradle` → đóng gói fat JAR.
- Artifact build (`.aws-sam/build`) được `sam deploy` upload lên **S3** rồi CloudFormation tham chiếu.

> 💡 Mẹo thi: `sam build --use-container` build dependency trong môi trường **giống Lambda thật** (Amazon Linux) — quan trọng với thư viện có phần native compile (ví dụ `numpy`, `pandas`) để tránh lỗi "works local, fails on Lambda".

---

## AWS AppConfig — config & feature flags động

AppConfig (thuộc Systems Manager) quản lý **cấu hình runtime** tách khỏi code. Đổi config **không cần redeploy** Lambda/app.

### Khái niệm cốt lõi

| Thành phần | Vai trò |
|---|---|
| Application | App logic chứa config |
| Environment | dev / staging / prod |
| Configuration Profile | Nguồn config (feature flags / freeform) |
| Deployment Strategy | Cách rollout (linear, canary, all-at-once) |

### Vì sao không hard-code / không dùng env var?

| Cách | Đổi giá trị cần redeploy? | Rollout từ từ? | Auto rollback? |
|---|---|---|---|
| Hard-code | Có (sửa code) | Không | Không |
| Lambda env var | Có (update function) | Không | Không |
| **AppConfig** | **Không** | **Có** (canary/linear) | **Có** |

> 💡 Mẹo thi: "Bật/tắt **feature flag** hoặc đổi tham số **lúc runtime mà không deploy lại**" → **AppConfig**. "Cần **rollout từ từ + tự rollback** khi config lỗi" → AppConfig deployment strategy.

### Validators & rollback

AppConfig kiểm tra config trước khi áp (JSON Schema validator hoặc Lambda validator). Kết hợp CloudWatch alarm: nếu lỗi tăng trong lúc deploy config → **tự rollback**.

> ⚠️ Bẫy: Phân biệt với **Secrets Manager** (lưu secret + tự xoay) và **SSM Parameter Store** (lưu param/secret đơn giản). AppConfig **không phải kho secret** — nó là quản lý config có validate + rollout. Đề hay đánh tráo: "lưu DB password + auto rotation" → **Secrets Manager**, không phải AppConfig.

> 💡 Mẹo thi: Trong Lambda, dùng **AppConfig Lambda extension** (một layer) để cache config, giảm số lần gọi API và độ trễ — thay vì gọi `GetLatestConfiguration` trực tiếp mỗi request.

---

## Tổng kết quyết định nhanh (cheat-sheet thi)

| Tình huống đề bài | Đáp án |
|---|---|
| IaC chung, không serverless đặc thù | CloudFormation |
| Serverless gọn + test local (Docker) | SAM (`sam local`) |
| Định nghĩa hạ tầng bằng TypeScript/Python | CDK |
| Xem trước thay đổi trước khi apply | Change set |
| Phát hiện ai sửa tay resource | Drift detection |
| Chia sẻ ARN/ID giữa các stack độc lập | Export + `!ImportValue` |
| Lambda > 250 MB / cần OS package | Container image (10 GB) |
| Nhiều Lambda dùng chung thư viện | Lambda layers |
| Lấy ARN của resource | `!GetAtt`, KHÔNG phải `!Ref` |
| Cấp IAM least-privilege gọn cho SAM | Policy templates |
| Feature flag / đổi config không redeploy | AppConfig |
| Lưu DB password + auto rotation | Secrets Manager (KHÔNG phải AppConfig) |

> 💡 Mẹo thi cuối: Ba từ khóa phân biệt nhanh trong phòng thi — **"ngôn ngữ lập trình" → CDK**, **"serverless + local test" → SAM**, **"transform thiếu" → `AWS::Serverless-2016-10-31`**. Nắm chắc ba cái này là gỡ được phần lớn câu Domain 3 về IaC.
