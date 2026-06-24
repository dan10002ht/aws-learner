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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Web Server tier vs Worker tier — kiến trúc hai loại environment</title>
  <desc>Web Server tier: người dùng gửi HTTP qua ELB tới các EC2 xử lý request. Worker tier: message vào SQS queue, daemon trên mỗi instance kéo message và POST body vào localhost của app, app trả 200 thì message bị xóa; cron.yaml đặt lịch định kỳ.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Web Server tier vs Worker tier</text>
  <defs>
    <marker id="ebtArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="52" font-size="12.5" font-weight="700" fill="currentColor">Web Server tier — HTTP trực tiếp</text>
  <g>
    <rect x="16" y="62" width="96" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="64" y="80" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">User</text>
    <text x="64" y="95" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">trình duyệt</text>
  </g>
  <line x1="112" y1="82" x2="156" y2="82" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <text x="134" y="74" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">HTTP</text>
  <g>
    <rect x="158" y="62" width="96" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="206" y="80" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ELB</text>
    <text x="206" y="95" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">port 80/443</text>
  </g>
  <line x1="254" y1="82" x2="298" y2="82" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <g>
    <rect x="300" y="58" width="120" height="22" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="73" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">EC2 — app HTTP</text>
    <rect x="300" y="84" width="120" height="22" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="99" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">EC2 — app HTTP</text>
  </g>
  <text x="440" y="86" font-size="9.5" fill="currentColor" opacity="0.7">Auto Scaling Group</text>
  <line x1="16" y1="128" x2="704" y2="128" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="16" y="156" font-size="12.5" font-weight="700" fill="currentColor">Worker tier — qua SQS queue</text>
  <g>
    <rect x="16" y="166" width="110" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="71" y="184" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Producer</text>
    <text x="71" y="199" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">gửi job</text>
  </g>
  <line x1="126" y1="186" x2="170" y2="186" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <g>
    <rect x="172" y="166" width="110" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="227" y="184" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">SQS queue</text>
    <text x="227" y="199" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">message body</text>
  </g>
  <rect x="338" y="156" width="366" height="120" rx="11" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="352" y="174" font-size="10.5" font-weight="700" fill="currentColor">EC2 worker instance</text>
  <line x1="282" y1="186" x2="350" y2="200" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <text x="300" y="182" font-size="9" fill="currentColor" opacity="0.75">1. kéo</text>
  <g>
    <rect x="352" y="186" width="120" height="36" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="412" y="208" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">daemon SQS</text>
    <rect x="540" y="186" width="148" height="36" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="614" y="203" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">app (localhost)</text>
    <text x="614" y="216" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">http://localhost/</text>
  </g>
  <line x1="472" y1="200" x2="536" y2="200" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <text x="504" y="194" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">2. POST body</text>
  <line x1="536" y1="214" x2="476" y2="214" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ebtArr)"/>
  <text x="506" y="226" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">3. trả HTTP 200</text>
  <text x="352" y="252" font-size="9.5" fill="currentColor" opacity="0.78">4. 200 OK -> daemon xóa message khỏi queue</text>
  <text x="352" y="268" font-size="9.5" fill="currentColor" opacity="0.78">cron.yaml: lịch chạy task định kỳ (vd mỗi 5 phút)</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Blue/Green qua swap CNAME — trước và sau khi đổi DNS</title>
  <desc>Trước swap: CNAME app.example.com trỏ tới environment Blue đang chạy prod, Green chạy version mới chờ test. Sau swap-environment-cnames: CNAME trỏ sang Green, traffic chuyển sang version mới; muốn rollback thì swap ngược lại. DNS có TTL nên một số client còn trỏ về Blue một lúc.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Blue/Green qua swap CNAME (đổi DNS record)</text>
  <defs>
    <marker id="bgArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="52" font-size="12" font-weight="700" fill="currentColor">TRƯỚC swap</text>
  <g>
    <rect x="16" y="62" width="120" height="34" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="76" y="79" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">CNAME</text>
    <text x="76" y="91" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">app.example.com</text>
  </g>
  <line x1="136" y1="79" x2="186" y2="79" stroke="#3b82f6" stroke-opacity="0.8" stroke-width="2" marker-end="url(#bgArr)"/>
  <g>
    <rect x="188" y="58" width="140" height="42" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="258" y="76" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Blue (prod)</text>
    <text x="258" y="91" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">version hiện tại</text>
  </g>
  <g>
    <rect x="188" y="108" width="140" height="42" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="258" y="126" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Green</text>
    <text x="258" y="141" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">version mới — test</text>
  </g>
  <line x1="358" y1="100" x2="408" y2="100" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 3" marker-end="url(#bgArr)"/>
  <text x="383" y="92" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">swap-</text>
  <text x="383" y="116" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.7">environment-cnames</text>
  <text x="420" y="52" font-size="12" font-weight="700" fill="currentColor">SAU swap</text>
  <g>
    <rect x="420" y="62" width="120" height="34" rx="8" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="480" y="79" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">CNAME</text>
    <text x="480" y="91" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">app.example.com</text>
  </g>
  <line x1="490" y1="96" x2="555" y2="124" stroke="#10b981" stroke-opacity="0.85" stroke-width="2" marker-end="url(#bgArr)"/>
  <g>
    <rect x="560" y="58" width="144" height="42" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="632" y="76" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Blue (cũ)</text>
    <text x="632" y="91" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">giữ lại để rollback</text>
  </g>
  <g>
    <rect x="560" y="108" width="144" height="42" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="632" y="126" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Green (prod)</text>
    <text x="632" y="141" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">nhận toàn bộ traffic</text>
  </g>
  <line x1="16" y1="172" x2="704" y2="172" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="16" y="196" font-size="10.5" fill="currentColor" opacity="0.85">Rollback = swap NGƯỢC lại (Green -> Blue), gần như tức thì vì Blue vẫn còn sống.</text>
  <rect x="16" y="210" width="688" height="44" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="30" y="230" font-size="11" font-weight="700" fill="currentColor">⚠ DNS TTL: một số client còn cache bản ghi cũ</text>
  <text x="30" y="246" font-size="10" fill="currentColor" opacity="0.78">chờ hết TTL nên vẫn trỏ về Blue một lúc — chưa chuyển ngay 100% sang Green.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>RDS coupling — RDS trong environment vs RDS riêng (decoupled)</title>
  <desc>Bên trái: RDS tạo bên trong EB environment, chung vòng đời với environment nên terminate environment sẽ xóa luôn RDS và mất dữ liệu. Bên phải: RDS tạo riêng bên ngoài, EB nối qua biến môi trường, khi terminate environment thì RDS vẫn sống còn nguyên dữ liệu.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">RDS coupling: bên trong environment vs decoupled</text>
  <defs>
    <marker id="rdsArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="50" font-size="12" font-weight="700" fill="#f59e0b">RDS trong EB environment — nguy hiểm</text>
  <rect x="16" y="60" width="320" height="150" rx="11" fill="#f59e0b" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
  <text x="30" y="80" font-size="10.5" font-weight="700" fill="currentColor">EB environment (1 vòng đời)</text>
  <g>
    <rect x="32" y="92" width="130" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="97" y="114" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 + ELB</text>
    <text x="97" y="128" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">app</text>
  </g>
  <g>
    <rect x="190" y="92" width="130" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="255" y="114" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS (bên trong)</text>
    <text x="255" y="128" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">gắn vòng đời</text>
  </g>
  <line x1="162" y1="114" x2="186" y2="114" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#rdsArr)"/>
  <rect x="32" y="160" width="288" height="38" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="46" y="178" font-size="10.5" font-weight="700" fill="currentColor">Terminate environment</text>
  <text x="46" y="192" font-size="9.5" fill="currentColor" opacity="0.8">-> xóa luôn RDS -> MẤT DỮ LIỆU</text>
  <text x="384" y="50" font-size="12" font-weight="700" fill="#10b981">RDS riêng (decoupled) — production</text>
  <rect x="384" y="60" width="200" height="100" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
  <text x="398" y="80" font-size="10.5" font-weight="700" fill="currentColor">EB environment</text>
  <g>
    <rect x="398" y="92" width="172" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="484" y="114" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 + ELB</text>
    <text x="484" y="128" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">app</text>
  </g>
  <g>
    <rect x="600" y="82" width="96" height="64" rx="10" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.32"/>
    <text x="648" y="108" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS riêng</text>
    <text x="648" y="124" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">tạo bên ngoài</text>
    <text x="648" y="138" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.75">độc lập</text>
  </g>
  <line x1="570" y1="114" x2="596" y2="114" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#rdsArr)"/>
  <text x="583" y="108" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.75">env var</text>
  <rect x="384" y="170" width="320" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="398" y="188" font-size="10.5" font-weight="700" fill="currentColor">Terminate environment</text>
  <text x="398" y="202" font-size="9.5" fill="currentColor" opacity="0.8">-> RDS VẪN SỐNG, dữ liệu còn nguyên</text>
  <line x1="16" y1="228" x2="704" y2="228" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="16" y="252" font-size="10.5" fill="currentColor" opacity="0.85">Best practice prod: tạo RDS riêng, nối qua biến môi trường / Secrets Manager — tách vòng đời khỏi environment.</text>
</svg>

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
