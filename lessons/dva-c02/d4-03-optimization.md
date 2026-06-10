# Optimization & Caching

Domain 4 chiem ~18% de DVA-C02, va day la nhom topic "tien" nhat: chi can nho dung **khi nao dung cai gi** la an diem. Bai nay di tu compute (Lambda) -> data caching (ElastiCache, DAX) -> edge/network caching (API Gateway, CloudFront, S3 TA) -> giam xu ly thua (SNS filtering). Moi phan deu co bay kinh dien.

## 1. Lambda Concurrency

Concurrency = so request **dang chay dong thoi** tai mot thoi diem (khong phai so request/giay). Cong thuc uoc luong:

```
Concurrency = Requests per second  ×  Average duration (giay)
```

Vi du: 100 req/s, moi request chay 0.5s -> can ~50 concurrency dong thoi.

Mac dinh moi account co **account-level concurrency limit = 1000** (soft limit, tang duoc qua Service Quotas). Tat ca function chia se chung pool nay.

### Reserved Concurrency vs Provisioned Concurrency

Day la bay so 1 cua ca bai. Hai khai niem TEN giong nhau nhung muc dich KHAC HOAN TOAN.

| Tieu chi | Reserved Concurrency | Provisioned Concurrency |
|---|---|---|
| Muc dich | **Gioi han** + **dam bao** so concurrency cho 1 function | **Lam am san** instance de loai cold start |
| Giai quyet | Function "an het" pool lam dau function khac chet doi | Cold start (latency tang dot bien) |
| Cold start | KHONG giải quyet | **CO** - instance da init san |
| Chi phi | Mien phi (chi la cap phat lai pool) | **Tra phi** theo thoi gian giu am |
| Gioi han phu | Function khong vuot qua so da reserve | - |
| Auto scaling | - | Tich hop Application Auto Scaling |

> ⚠️ **Bay:** "Function A dang lam can kiet concurrency khien function B bi throttle" -> dap an la **Reserved Concurrency** (de gioi han A va dam bao B co phan), KHONG phai Provisioned. Provisioned chi de chong cold start.

> ⚠️ **Bay:** Dat **Reserved Concurrency = 0** se **vo hieu hoa hoan toan** function (throttle 100%). Day la cach "tat khan cap" mot function ma khong xoa.

```bash
# Reserved: function nay toi da 100 concurrent, va dam bao co 100
aws lambda put-function-concurrency \
  --function-name myFunc --reserved-concurrent-executions 100

# Provisioned: giu am 50 instance cua alias "prod"
aws lambda put-provisioned-concurrency-config \
  --function-name myFunc --qualifier prod \
  --provisioned-concurrent-executions 50
```

> 💡 **Meo thi:** Provisioned Concurrency **phai** tro vao mot **alias** hoac **version** cu the (KHONG dung duoc `$LATEST`). Cau hoi co `$LATEST` + provisioned = sai.

### Cold Start - nguyen nhan & giam thieu

Cold start = thoi gian AWS khoi tao execution environment moi (download code, start runtime, chay init code ngoai handler).

Cac yeu to lam cold start nang hon:
- Package size lon (nhieu dependency).
- Runtime: Java/.NET nang hon Node/Python/Go.
- VPC: truoc day rat cham; nay da cai thien nho **Hyperplane ENI** nhung van co overhead.
- Init code nang (mo connection, load model...).

Cach giam thieu:

| Cach | Hieu qua |
|---|---|
| **Provisioned Concurrency** | Loai cold start gan nhu hoan toan |
| Giam package size, lazy-load lib | Init nhanh hon |
| Tai dung connection ngoai handler | Khong loai cold start nhung am sau do nhanh |
| **SnapStart** (Java) | Snapshot moi truong da init, restore nhanh (mien phi) |
| Tang memory | Init nhanh hon vi nhieu CPU hon |

> 💡 **Meo thi:** Cau hoi "Java + cold start + muon mien phi" -> **SnapStart**. "Bat ky runtime + can latency on dinh + chiu tra phi" -> **Provisioned Concurrency".

## 2. Lambda Memory - CPU Coupling & Power Tuning

Day la diem nhieu nguoi hieu sai: ban **khong** cau hinh CPU truc tiep cho Lambda. Ban chi chinh **memory** (128 MB -> 10240 MB), va **CPU duoc cap phat tuyen tinh theo memory**. Tang memory = tang CPU = tang network bandwidth.

He qua quan trong:
- Function **CPU-bound** (xu ly anh, nen du lieu, tinh toan) co the chay **nhanh hon nhieu** khi tang memory, du khong dung het RAM.
- Vi Lambda tinh phi theo **GB-giay**, tang memory nhung giam duration co the lam **tong chi phi GIAM**, hoac it nhat khong tang ma latency tot hon.

Vi du minh hoa (so gia dinh):

| Memory | Duration | GB-giay/request | Nhan xet |
|---|---|---|---|
| 128 MB | 12 s | 1.5 | Re moi GB nhung cham, tong phi cao |
| 512 MB | 3 s | 1.5 | Cung gia, nhanh gap 4 |
| 1024 MB | 1.5 s | 1.5 | Cung gia, nhanh gap 8 |
| 1769 MB | 1.0 s | ~1.73 | 1 vCPU day du, hoi dat hon |

> 💡 **Meo thi:** **1769 MB = chinh xac 1 vCPU**. Tren nguong nay moi co them vCPU thu hai (function multi-thread moi tan dung duoc).

**AWS Lambda Power Tuning**: cong cu open-source (Step Functions state machine) chay function o nhieu muc memory, ve bieu do cost vs speed de chon diem toi uu.

> ⚠️ **Bay:** "Function chay cham, da tang memory nhung function single-thread" -> qua 1769 MB se KHONG nhanh them dang ke vi chi co 1 thread khong dung duoc vCPU thu 2. Dap an thuong la toi uu code hoac giu o muc 1 vCPU.

## 3. ElastiCache

Cache in-memory dat truoc database de giam latency va offload read. Hai engine:

### Redis vs Memcached

| Tieu chi | Redis (OSS / Valkey) | Memcached |
|---|---|---|
| Data structure | Phong phu (list, set, sorted set, hash, stream) | Chi key-value string |
| Persistence | Co (snapshot, AOF) | Khong |
| Replication / HA | Co (replica, Multi-AZ, auto failover) | Khong |
| Pub/Sub | Co | Khong |
| Multi-threaded | Khong (single-thread/core, dung cluster) | **Co** (scale theo core) |
| Sharding | Cluster mode | Tu phan tan client-side |
| Use case | Leaderboard, session, queue, can HA/persistence | Cache don gian, can scale ngang nhanh bang nhieu core |

> 💡 **Meo thi:** Bat ky tu khoa nao trong {persistence, replication, Multi-AZ, failover, sorted set, leaderboard, pub/sub, geospatial} -> **Redis**. "Don gian, multi-threaded, scale horizontally nhanh" -> **Memcached**.

### Caching Strategies: Lazy Loading vs Write-Through

| | Lazy Loading (cache-aside) | Write-Through |
|---|---|---|
| Ghi cache khi nao | Khi **cache miss** (doc) | Khi **ghi** database |
| Du lieu trong cache | Chi data duoc doc gan day | Toan bo data vua ghi (ke ca chua doc) |
| Cache miss penalty | Co (lan dau doc phai vao DB) | Ban dau co the miss data cu |
| Stale data | Co the cu neu DB doi ma cache chua het TTL | **Luon moi** voi data vua ghi |
| Cache size | Nho hon (chi data hay doc) | Lon hon (ca data khong ai doc) |
| Ghi du lieu thua | Khong | Co (ghi ca data co the khong bao gio doc) |

Lazy loading (pseudo-code dien hinh):

```python
def get_user(user_id):
    data = cache.get(user_id)
    if data is None:                  # cache miss
        data = db.query(user_id)
        cache.set(user_id, data, ttl=300)  # luon dat TTL
    return data
```

Write-through:

```python
def save_user(user_id, data):
    db.write(user_id, data)
    cache.set(user_id, data)          # cap nhat cache ngay
```

> 💡 **Meo thi:** Thuc te thuong **ket hop ca hai** + **TTL**. TTL la "luoi an toan" chong stale data du dung chien luoc nao. Cau hoi "cache co data cu" hau nhu luon co dap an dinh den **them/giam TTL**.

> ⚠️ **Bay:** 
> - "Muon dam bao data vua ghi co ngay trong cache, chap nhan cache to" -> **Write-Through**.
> - "Cache chi chua data thuc su duoc doc, tiet kiem bo nho" -> **Lazy Loading**.
> - "Du lieu cache bi cu/stale" -> them **TTL** (hoac giam TTL).

## 4. DAX cho DynamoDB

**DynamoDB Accelerator (DAX)** = in-memory cache **chuyen biet cho DynamoDB**, write-through, latency tu millisecond xuong **microsecond**.

Diem manh la **khong phai sua logic ung dung**: DAX co API tuong thich DynamoDB, chi can doi endpoint qua DAX client.

### DAX vs ElastiCache (cho DynamoDB)

| Tieu chi | DAX | ElastiCache |
|---|---|---|
| Tich hop | Chuyen cho DynamoDB, API tuong thich | Generic, phai tu viet code cache |
| Loai cache | Item cache + query/scan cache | Tu quan ly |
| Caching strategy | Write-through san | Tu chon (lazy / write-through) |
| Use case | Read-heavy DynamoDB, eventually consistent | Cache bat ky nguon nao, can data structure |
| Strongly consistent read | **KHONG cache** (pass-through xuong DynamoDB) | - |

> ⚠️ **Bay:** DAX chi tang toc **eventually consistent reads**. Neu app yeu cau **strongly consistent read**, DAX se di thang xuong DynamoDB -> khong giam latency. Cau hoi co "strongly consistent" + "DAX khong nhanh" la day.

> ⚠️ **Bay:** "Read-heavy tren DynamoDB, muon microsecond, KHONG muon sua nhieu code" -> **DAX**. Neu de them "can cache data tu nhieu nguon / can sorted set / leaderboard" -> **ElastiCache Redis** chu khong phai DAX.

> 💡 **Meo thi:** DAX **khong giai quyet** loi **write throttling** (provisioned write capacity). DAX chi cho read. Throttle ghi -> tang WCU hoac dung on-demand / exponential backoff.

## 5. API Gateway Caching

Bat cache o **stage level**, API Gateway luu response theo **cache key** (mac dinh la URL path; co the them query string / header lam phan cache key).

| Thuoc tinh | Chi tiet |
|---|---|
| TTL | Mac dinh 300s, range 0-3600s. TTL = 0 -> tat cache |
| Cache size | 0.5 GB -> 237 GB |
| Per-key | Chon query param / header dua vao cache key |
| Invalidation | Client gui header `Cache-Control: max-age=0` (phai co IAM permission) |

```bash
# Bat cache cho stage
aws apigateway update-stage --rest-api-id abc123 --stage-name prod \
  --patch-operations \
    op=replace,path=/cacheClusterEnabled,value=true \
    op=replace,path=/cacheClusterSize,value=0.5 \
    op=replace,path=/*/*/caching/ttlInSeconds,value=300
```

> ⚠️ **Bay:** Neu khong cau hinh **cache key** theo query/header ma cac request khac nhau chi khac query param -> tat ca tra **cung 1 response cache** (sai data). Phai them param vao cache key.

> 💡 **Meo thi:** "Giam tai backend / giam so lan goi Lambda integration cho GET lap lai" -> bat **API Gateway cache**. Set TTL phu hop voi do tuoi du lieu chap nhan duoc.

## 6. CloudFront Caching

CDN tai edge location. Cache theo **cache behavior** (path pattern map toi origin + policy cache rieng).

Cac yeu to dieu khien cache:

| Khai niem | Tac dung |
|---|---|
| **Cache behavior** | Path pattern (`/images/*`) -> origin + setting rieng |
| **Cache key** | Gom URL + (tuy chon) header / query string / cookie |
| **Cache Policy** | Dinh nghia cache key + TTL (thay cho cach cu) |
| **Origin Request Policy** | Quyet dinh forward gi xuong origin (tach biet cache key) |
| TTL | Min / Default / Max TTL; origin co the gui `Cache-Control` |

> ⚠️ **Bay:** Cache **theo header / query / cookie** lam **giam cache hit ratio** vi tao nhieu bien the cache key. Chi cache theo nhung gi **thuc su lam thay doi response**. Cau hoi "hit ratio thap" thuong do cache key chua qua nhieu thanh phan (vi du forward het cookie).

> 💡 **Meo thi:**
> - Static content (anh, JS, CSS) it doi -> TTL dai.
> - Dynamic theo user -> tach cache behavior, hoac khong cache (TTL=0).
> - **Invalidation** CloudFront ton phi va cham; thay vi do dung **versioned filename** (`app.v2.js`) de bust cache mien phi.

> ⚠️ **Bay:** API Gateway cache vs CloudFront cache: cau hoi "cache o **edge gan user**" -> CloudFront. "Cache **response cua REST API stage**" -> API Gateway. CloudFront tot cho geographic distribution.

## 7. S3 Transfer Acceleration

Tang toc **upload/download** S3 qua khoang cach dia ly xa bang cach di qua **CloudFront edge** roi vao S3 qua AWS backbone network.

- Dung khi: client o xa region cua bucket, file lon, upload qua Internet cong cong cham.
- Endpoint rieng: `bucket.s3-accelerate.amazonaws.com`.
- Tra phi them; AWS co **Speed Comparison tool** de kiem tra co loi khong truoc khi bat.

| Van de | Giai phap |
|---|---|
| Upload tu xa, qua khoang cach lon, cham | **S3 Transfer Acceleration** |
| File rat lon (>100MB) upload | **Multipart Upload** (song song, resume duoc) |
| Ket hop ca hai | TA + Multipart |

> 💡 **Meo thi:** "User toan cau upload len 1 bucket o us-east-1, latency cao" -> **Transfer Acceleration**. "Upload file 5GB nhanh va chong loi" -> **Multipart Upload**. Hai cai nay hay xuat hien chung va co the ket hop.

> ⚠️ **Bay:** Transfer Acceleration **khong** giup gi neu client va bucket **cung region / gan nhau** (Speed Comparison tool se bao khong loi). Dung tien vo ich.

## 8. SNS Message Filtering (giam xu ly thua)

Khi fan-out SNS -> nhieu SQS/Lambda, nhieu subscriber chi quan tam mot phan message. Thay vi cho moi subscriber nhan HET roi tu loc (ton compute, ton tien), dung **subscription filter policy**: SNS **chi gui** message khop dieu kien.

Filter policy ap **filter** theo **message attributes** (mac dinh) hoac **message body** (`FilterPolicyScope=MessageBody`).

```json
{
  "event_type": ["order_placed", "order_cancelled"],
  "price": [{ "numeric": [">=", 100] }],
  "region": [{ "anything-but": "us-west-1" }]
}
```

Message chi duoc gui toi subscriber neu **moi thuoc tinh** trong policy khop (logic AND giua cac key, OR trong mang gia tri).

| Cach loc | Hau qua |
|---|---|
| Khong filter, subscriber tu loc | Tat ca message deu invoke Lambda/vao SQS -> ton compute, ton tien |
| **SNS filter policy** | Subscriber chi nhan message lien quan -> giam invocation thua |

> 💡 **Meo thi:** "Lambda bi invoke cho ca message khong lien quan, muon giam chi phi/xu ly thua" -> them **SNS subscription filter policy**. Day la cach giam invocation **truoc khi** message toi subscriber.

> ⚠️ **Bay:** Filter mac dinh tren **message attributes**, KHONG phai body. Muon loc theo noi dung body phai set `FilterPolicyScope=MessageBody`. Cau hoi loc theo field trong JSON body ma khong doi scope -> khong hoat dong.

## Tong ket nhanh - chon dung dich vu

| Tinh huong | Giai phap |
|---|---|
| Function B bi throttle do function A | **Reserved** Concurrency |
| Cold start lam latency cao | **Provisioned** Concurrency (hoac SnapStart cho Java) |
| Function CPU-bound chay cham | Tang **memory** (1769MB = 1 vCPU), dung Power Tuning |
| Cache DynamoDB, microsecond, it sua code | **DAX** |
| Cache da nguon / leaderboard / pub-sub | **ElastiCache Redis** |
| Cache don gian, multi-threaded, scale core | **ElastiCache Memcached** |
| Data cache bi stale | Them / giam **TTL** |
| Dam bao data vua ghi co trong cache | **Write-Through** |
| Cache chi chua data hay doc, tiet kiem RAM | **Lazy Loading** |
| Cache response REST API stage | **API Gateway caching** |
| Cache tai edge gan user, phan phoi dia ly | **CloudFront** |
| Upload S3 tu xa cham | **Transfer Acceleration** |
| Lambda invoke cho message khong lien quan | **SNS filter policy** |

> 💡 **Meo thi cuoi:** Domain 4 thuong hoi "trieu chung -> giai phap". Hay map nhanh: **stale = TTL**, **cold start = provisioned**, **throttle hang xom = reserved**, **DynamoDB microsecond = DAX**, **invoke thua = SNS filter**, **upload xa = TA**, **CPU-bound = memory**. Nho bang nay la qua phan lon cau Domain 4.
