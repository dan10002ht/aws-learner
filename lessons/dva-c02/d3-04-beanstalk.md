# Elastic Beanstalk & Environments

Elastic Beanstalk (EB) la dich vu PaaS cua AWS: ban day code len, EB tu provision EC2, Auto Scaling Group, Load Balancer, security group... thay vi ban tu cau hinh tay. Ban van **so huu va thay duoc** toan bo resource (khac voi Lambda hay App Runner che giau ha tang). Trong DVA-C02 Domain 3, EB la trong tam vi no gom ca **deployment policies** — phan rat hay ra bay thi.

> 💡 Meo thi: Cau hoi EB hau het khong hoi "EB la gi" ma hoi "deployment policy nao zero-downtime / re nhat / rollback nhanh nhat". Hoc ky bang so sanh o cuoi bai la an diem.

## 1. Platforms (nen tang)

EB ho tro nhieu **platform** dung san:

- Ngon ngu: Java (SE/Tomcat), .NET, Node.js, Python, PHP, Ruby, Go
- Docker: Single Container Docker, Multi-container (qua ECS), hoac Preconfigured Docker
- Web server: Apache, Nginx, Passenger, IIS (tuy platform)

Moi platform co nhieu **platform version** (vd Node.js 20 running on Amazon Linux 2023). AWS phat hanh ban va cap nhat dinh ky; ban nen update platform version de va loi bao mat.

> 💡 Meo thi: Neu app cua ban **khong** thuoc ngon ngu duoc support san -> dong goi bang **Docker platform**. Day la cach EB chay "bat ky" ung dung.

## 2. Environment Tiers — Web Server vs Worker

Day la khai niem hay nham. EB co 2 loai **environment tier**:

| | Web Server tier | Worker tier |
|---|---|---|
| Muc dich | Xu ly HTTP request truc tiep tu user | Xu ly background job / long-running task |
| Truoc no la | Elastic Load Balancer + EC2 | SQS queue + EC2 |
| Nhan viec qua | HTTP (port 80/443) | Doc message tu **SQS queue** |
| Co file dac biet | — | `cron.yaml` de lich dinh ky |
| Vi du | REST API, website | Resize anh, gui email, xu ly order |

Co che worker: tren moi instance worker co mot **daemon** doc message tu SQS, POST noi dung message vao `http://localhost/` (ung dung cua ban listen o do), xu ly xong tra HTTP 200 thi message bi xoa khoi queue.

> ⚠️ Bay: Cau hoi mo ta "tach phan xu ly nang/cham ra khoi luong request user, dung SQS" -> dap an la **Worker environment**, KHONG phai them Lambda hay tu dung EC2. Worker tier sinh ra dung cho viec nay.

> 💡 Meo thi: `cron.yaml` chi dung tren **Worker tier** de chay periodic task (vd moi 5 phut). Dung nham cho web tier.

## 3. Deployment Policies — phan ra thi nhieu nhat

Khi ban deploy version moi, EB cap nhat cac instance trong environment theo mot trong cac **policy** sau. Hieu ro tradeoff: **toc do vs downtime vs chi phi (instance phu) vs do an toan rollback**.

### All at once
- Deploy len **tat ca** instance cung luc.
- Co **downtime** (toan bo instance bi cap nhat dong thoi).
- Nhanh nhat, re nhat (khong them instance).
- Neu fail -> ca environment hong, phai redeploy ban cu.

### Rolling
- Deploy theo **batch** (vd moi lan 25% instance).
- Trong khi mot batch dang update, batch do bi rut khoi LB -> **giam capacity** tam thoi.
- Khong them instance moi.
- Neu fail giua chung -> mot so instance phien ban moi, mot so cu (environment "lai").

### Rolling with additional batch
- Tao **them 1 batch instance moi** truoc, nho do **giu nguyen full capacity** trong suot qua trinh.
- Tot hon Rolling khi ban khong duoc tut capacity (traffic cao).
- Co chi phi them tam thoi (1 batch phu).
- Van co the co tinh trang "lai" version trong luc deploy.

### Immutable
- Tao **moi 1 loat instance hoan toan moi** trong mot Auto Scaling Group tam, deploy version moi len day.
- Health OK -> chuyen sang ASG chinh, **xoa instance cu**.
- **Zero downtime**, **rollback cuc nhanh** (chi viec bo loat instance moi, instance cu chua dong gi).
- **Khong bao gio co tinh trang "lai" 2 version** tren cung pool phuc vu traffic.
- Ton kem nhat (nhan doi instance tam thoi), lau nhat.

### Traffic splitting (canary)
- Bien the cua immutable: tao loat instance moi nhung chi **chuyen mot % traffic** sang de test (canary) truoc khi shift het.
- Dung cho A/B hoac do safety cao.

### Bang so sanh nhanh

| Policy | Downtime | Full capacity | Instance phu | "Lai" version | Rollback | Chi phi/Toc do |
|---|---|---|---|---|---|---|
| All at once | **Co** | Khong | Khong | Khong | Cham (redeploy) | Re/Nhanh nhat |
| Rolling | Khong* | **Khong** (tut) | Khong | Co | Cham (redeploy batch) | Re |
| Rolling + additional batch | Khong | **Co** | Co (1 batch) | Co | Cham | Trung binh |
| Immutable | **Khong** | Co | Co (full set) | **Khong** | **Nhanh** | Dat/Cham nhat |
| Traffic splitting | Khong | Co | Co | Khong | Nhanh | Dat |

\* Rolling khong "downtime hoan toan" nhung **giam capacity** -> co the nghen neu traffic cao.

> 💡 Meo thi — cau hoi kinh dien:
> - "Zero downtime VA full capacity, re nhat trong cac lua chon zero-downtime" -> **Rolling with additional batch** (neu khong duoc phep tut capacity ma khong muon nhan doi instance).
> - "Zero downtime, rollback nhanh nhat, khong bao gio chay 2 version song song" -> **Immutable**.
> - "Nhanh va re nhat, chap nhan downtime (moi truong dev)" -> **All at once**.

> ⚠️ Bay: **Rolling** va **Rolling with additional batch** deu co the khien **2 version chay dong thoi** trong luc deploy. Neu de thi nhan manh "khong duoc co 2 version cung luc" -> phai chon **Immutable** (hoac Blue/Green).

## 4. Blue/Green qua CNAME swap

Cac deployment policy o tren deu deploy **in-place** (cap nhat ngay tren environment hien tai). Khi ban can blue/green that su — moi truong moi **hoan toan tach biet** roi chuyen traffic — EB dung cach **swap environment URL (CNAME)**:

1. Co environment **Blue** (dang chay prod).
2. Tao environment **Green** moi (clone tu Blue), deploy version moi len Green, test ky.
3. **Swap CNAME** giua Blue va Green qua console hoac CLI:
   ```
   aws elasticbeanstalk swap-environment-cnames \
     --source-environment-name my-app-blue \
     --destination-environment-name my-app-green
   ```
4. Traffic chuyen sang Green. Neu loi -> swap nguoc lai -> rollback tuc thi.

Uu diem: **zero downtime**, **rollback gan nhu lap tuc**, test toan dien tren moi truong that truoc khi nhan luong. Nhuoc: chi phi gap doi trong luc chay song song, va phai tu lo dong bo du lieu (DB...).

> ⚠️ Bay: Blue/Green qua **CNAME swap** chinh la doi **DNS record**. DNS co **TTL** -> mot so client co the con tro ve Blue mot luc cho cache het han. De thi co the hoi "tai sao mot so user van thay version cu sau khi swap" -> dap an: **DNS TTL caching**.

> 💡 Meo thi: Phan biet 2 khai niem.
> - **Immutable** = blue/green o muc **instance trong cung 1 environment** (swap ASG noi bo).
> - **CNAME swap** = blue/green o muc **2 environment rieng biet** (swap DNS). Dung khi muon doi ca platform version lon, hoac thay doi ma cac in-place policy khong lam duoc.

## 5. `.ebextensions` — config nang cao

`.ebextensions` la thu muc o **goc** source bundle, chua cac file `.config` (dinh dang YAML hoac JSON) de tuy bien environment: cai package, chay command, set option, tao resource AWS bo sung...

Cau truc thu muc:
```
my-app/
├── .ebextensions/
│   ├── 01-packages.config
│   └── 02-options.config
├── app.js
└── package.json
```

Vi du set option va bien moi truong (YAML):
```yaml
# .ebextensions/02-options.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    API_TIMEOUT: "30"
  aws:autoscaling:asg:
    MinSize: "2"
    MaxSize: "6"
```

Vi du cai package va chay command:
```yaml
# .ebextensions/01-packages.config
packages:
  yum:
    git: []
commands:
  01_run_migration:
    command: "/var/app/current/migrate.sh"
```

Cac key chinh trong file `.config`:

| Key | Tac dung |
|---|---|
| `packages` | Cai package (yum, rpm, npm...) |
| `sources` | Tai & giai nen archive vao thu muc |
| `files` | Tao file tren instance |
| `commands` | Chay command **truoc** khi app/web server len |
| `container_commands` | Chay command **sau** khi app deploy, **truoc** khi traffic vao (vd DB migration) |
| `option_settings` | Set option cua EB (scaling, env var, LB...) |
| `Resources` | Them resource CloudFormation (vd SQS, DynamoDB) |

> 💡 Meo thi: Phan biet **`commands`** vs **`container_commands`**. `container_commands` chay **sau** khi unpack ung dung va **co `leader_only: true`** — chi chay tren 1 instance (dung de **chay DB migration mot lan duy nhat**, tranh nhieu instance migrate dong thoi).

```yaml
container_commands:
  01_migrate:
    command: "python manage.py migrate"
    leader_only: true
```

> ⚠️ Bay: File trong `.ebextensions` phai co duoi `.config` (khong phai `.conf`), va dat o **goc** source bundle. Sai vi tri/duoi -> EB bo qua, config khong ap dung.

## 6. Environment Variables — cau hinh khong hardcode

Cach truyen config (DB host, API key, feature flag) vao app:

- Console: Configuration -> Software -> Environment properties.
- CLI:
  ```
  aws elasticbeanstalk update-environment \
    --environment-name my-app-prod \
    --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=DB_HOST,Value=db.internal
  ```
- Qua `.ebextensions` (`option_settings` nhu vi du tren).

Ung dung doc bien moi truong nhu binh thuong (`process.env.DB_HOST`, `os.environ['DB_HOST']`).

> ⚠️ Bay: Environment properties cua EB **khong duoc ma hoa** va hien ro trong console. Voi secret (password, API key) -> dung **AWS Secrets Manager** hoac **SSM Parameter Store (SecureString)**, KHONG nhet thang vao environment property. De thi hay danh lua chon "luu DB password vao EB env var".

## 7. Saved Configurations

**Saved configuration** la mot **template** luu lai toan bo cau hinh environment (platform, option settings, env var) de tai su dung.

- Luu cau hinh cua environment hien tai thanh template.
- Tao environment moi tu template do -> dam bao dev/test/prod **giong nhau**.
- Luu duoi dang object trong S3 (`.elasticbeanstalk/saved_configs/`).

```
# Luu config hien tai thanh template
eb config save my-app-prod --cfg prod-template

# Tao env moi tu template
eb create my-app-staging --cfg prod-template
```

> 💡 Meo thi: "Lam sao tao nhieu environment giong het nhau / tai su dung config" -> **Saved Configurations** (khong phai copy tay tung option).

## 8. Quan ly nhieu environment (dev/test/prod)

Mot **application** trong EB chua nhieu **environment**. Mo hinh pho bien:

- `my-app-dev`, `my-app-test`, `my-app-prod` cung thuoc application `my-app`.
- Moi environment co URL rieng, version rieng, scaling rieng.
- Promote version: deploy len dev -> test -> dung **CNAME swap** hoac deploy lai application version da test len prod.

EB luu lai **application versions** (cac ban source bundle da upload, luu trong S3). Ban co the deploy bat ky version cu nao -> rollback bang cach redeploy version truoc.

> 💡 Meo thi: **Application version lifecycle policy** giup tu xoa version cu (gioi han so luong hoac theo tuoi) de tranh dung han ngach (mac dinh **1000 application versions / region**). De thi hoi "deploy bao loi qua nhieu version" -> bat lifecycle policy.

## 9. RDS Coupling Pitfall — bay quan trong

Khi tao EB environment, ban co the cho EB **tao luon mot RDS instance ben trong environment**. **Tien luc dau nhung nguy hiem cho prod**:

- RDS do **gan vong doi voi environment**. Khi ban **terminate environment** -> **RDS bi xoa theo** -> **mat du lieu**.
- Khong chia se duoc DB giua nhieu environment (blue/green khong dung chung data).

**Best practice cho production**: tao RDS **rieng** (ngoai EB), roi truyen connection string cho EB qua **environment variable** / Secrets Manager. Nho vay:

| | RDS trong EB environment | RDS rieng (decoupled) |
|---|---|---|
| Lifecycle | Chet theo environment | Doc lap, ben vung |
| Blue/Green | Moi env 1 DB rieng, kho | Dung chung 1 DB de |
| Production | **Khong nen** | **Nen** |
| Tien khoi tao | Nhanh (1 cu click) | Phai tu tao + noi day |

Neu lo da tao RDS trong environment va muon "go" no ra ma khong mat data: bat **deletion protection**, tao snapshot, va decouple bang cach tro environment sang RDS ngoai qua env var truoc khi terminate.

> ⚠️ Bay: Cau hoi rat hay ra — "Terminate EB environment xong mat sach database". Nguyen nhan: **RDS duoc provision ben trong environment**. Fix: **decouple RDS** (tao rieng, noi qua env var).

## Tom tat nhanh truoc khi thi

- **Web tier** = HTTP + LB; **Worker tier** = SQS + daemon + `cron.yaml`.
- Deployment policy zero-downtime: **Immutable** (an toan nhat, rollback nhanh, khong "lai" version), **Rolling + additional batch** (giu full capacity, re hon Immutable nhung co the "lai" version).
- **All at once** = co downtime, chi cho dev.
- **Rolling** = tut capacity; **Rolling + additional batch** = giu full capacity.
- **Blue/Green** that su = **CNAME swap** giua 2 environment; coi chung **DNS TTL** lam user con thay version cu.
- **`.ebextensions/*.config`**: `container_commands` + `leader_only` de migrate DB mot lan.
- **Secret** -> Secrets Manager / SSM, KHONG nhet vao env var EB.
- **Saved Configurations** de nhan ban environment; **lifecycle policy** de don application version cu.
- **RDS coupling**: dung de EB tao RDS trong environment cho prod -> terminate la mat data. **Decouple** ra ngoai.
