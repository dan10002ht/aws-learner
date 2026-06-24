# App Integration & Messaging

App integration la "xuong song" cua kien truc microservice tren AWS. Thay vi service goi truc tiep nhau (tight coupling), ta dung messaging/eventing de tach roi (decoupling), tang resilience va scale doc lap. Trong DVA-C02 Domain 1, day la cum cau hoi cuc nhieu: phan lon la tinh huong "chon dich vu nao cho use case nay". Bai nay di tu nen tang den cac bay thuong gap.

## 1. Synchronous vs Asynchronous

Truoc khi chon service, hieu hai mo hinh giao tiep:

| Tieu chi | Synchronous | Asynchronous |
|----------|-------------|--------------|
| Caller cho ket qua | Co, block den khi co response | Khong, "gui xong di luon" |
| Vi du | API Gateway -> Lambda (RequestResponse), DynamoDB query | SQS, SNS, EventBridge, Lambda async invoke |
| Coupling | Cao hon | Thap (decoupled) |
| Khi producer nhanh, consumer cham | Producer bi cho/timeout | Buffer trong queue, consumer xu ly dan |
| Loi 1 thanh phan | Lan truyen ngay | Co the retry, isolate |

> 💡 Meo thi: Tu khoa "decouple", "buffer", "smooth out traffic spike", "absorb bursts" → gan nhu chac chan la **SQS**. Tu khoa "fan-out", "notify multiple subscribers" → **SNS**.

Bon dich vu messaging chinh co topology khac han nhau — nhin tong the truoc khi di vao tung cai:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bon topology messaging: SQS, SNS, SNS+SQS fan-out, EventBridge</title>
  <desc>So sanh canh nhau: SQS la producer toi queue toi mot consumer; SNS la topic fan-out toi nhieu subscriber; SNS cong SQS la moi consumer co queue dem rieng; EventBridge la bus voi rule dinh tuyen theo noi dung toi nhieu target.</desc>
  <defs>
    <marker id="mArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Bon topology messaging</text>
  <!-- SQS -->
  <text x="16" y="48" font-size="12" font-weight="700" fill="currentColor">SQS — point-to-point</text>
  <circle cx="30" cy="78" r="13" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="30" y="82" font-size="9" text-anchor="middle" fill="currentColor">P</text>
  <rect x="62" y="66" width="48" height="24" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="86" y="82" font-size="9.5" text-anchor="middle" fill="currentColor">queue</text>
  <circle cx="140" cy="78" r="13" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="140" y="82" font-size="9" text-anchor="middle" fill="currentColor">C</text>
  <line x1="44" y1="78" x2="60" y2="78" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="111" y1="78" x2="125" y2="78" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <text x="86" y="108" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">1 msg → 1 consumer</text>
  <!-- SNS -->
  <text x="200" y="48" font-size="12" font-weight="700" fill="currentColor">SNS — fan-out</text>
  <circle cx="210" cy="98" r="13" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="210" y="102" font-size="9" text-anchor="middle" fill="currentColor">P</text>
  <rect x="240" y="86" width="40" height="24" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="260" y="102" font-size="9.5" text-anchor="middle" fill="currentColor">topic</text>
  <line x1="224" y1="98" x2="238" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <g>
    <circle cx="328" cy="64" r="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="328" y="68" font-size="8.5" text-anchor="middle" fill="currentColor">S1</text>
    <circle cx="328" cy="98" r="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="328" y="102" font-size="8.5" text-anchor="middle" fill="currentColor">S2</text>
    <circle cx="328" cy="132" r="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="328" y="136" font-size="8.5" text-anchor="middle" fill="currentColor">S3</text>
  </g>
  <line x1="281" y1="96" x2="314" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="281" y1="98" x2="314" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="281" y1="100" x2="314" y2="128" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <text x="280" y="160" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">1 msg → nhieu subscriber</text>
  <!-- SNS + SQS fan-out -->
  <text x="16" y="196" font-size="12" font-weight="700" fill="currentColor">SNS + SQS fan-out — moi consumer co queue dem rieng</text>
  <circle cx="30" cy="234" r="13" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="30" y="238" font-size="9" text-anchor="middle" fill="currentColor">P</text>
  <rect x="60" y="222" width="40" height="24" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="80" y="238" font-size="9.5" text-anchor="middle" fill="currentColor">topic</text>
  <line x1="44" y1="234" x2="58" y2="234" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <g>
    <rect x="142" y="204" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="162" y="218" font-size="8.5" text-anchor="middle" fill="currentColor">SQS</text>
    <rect x="142" y="230" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="162" y="244" font-size="8.5" text-anchor="middle" fill="currentColor">SQS</text>
    <rect x="142" y="256" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="162" y="270" font-size="8.5" text-anchor="middle" fill="currentColor">SQS</text>
  </g>
  <line x1="101" y1="232" x2="140" y2="214" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="101" y1="234" x2="140" y2="240" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="101" y1="236" x2="140" y2="266" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <g>
    <circle cx="208" cy="214" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="208" y="217" font-size="8" text-anchor="middle" fill="currentColor">C1</text>
    <circle cx="208" cy="240" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="208" y="243" font-size="8" text-anchor="middle" fill="currentColor">C2</text>
    <circle cx="208" cy="266" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="208" y="269" font-size="8" text-anchor="middle" fill="currentColor">C3</text>
  </g>
  <line x1="183" y1="214" x2="196" y2="214" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="183" y1="240" x2="196" y2="240" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="183" y1="266" x2="196" y2="266" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <!-- EventBridge -->
  <text x="400" y="196" font-size="12" font-weight="700" fill="currentColor">EventBridge — bus + rule theo noi dung</text>
  <circle cx="414" cy="234" r="13" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="414" y="238" font-size="9" text-anchor="middle" fill="currentColor">src</text>
  <rect x="446" y="222" width="36" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="464" y="238" font-size="9.5" text-anchor="middle" fill="currentColor">bus</text>
  <line x1="428" y1="234" x2="444" y2="234" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <g>
    <rect x="514" y="208" width="56" height="18" rx="4" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="542" y="221" font-size="8.5" text-anchor="middle" fill="currentColor">rule A</text>
    <rect x="514" y="232" width="56" height="18" rx="4" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="542" y="245" font-size="8.5" text-anchor="middle" fill="currentColor">rule B</text>
  </g>
  <line x1="483" y1="232" x2="512" y2="218" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="483" y1="236" x2="512" y2="242" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <g>
    <circle cx="604" cy="208" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="604" y="211" font-size="8" text-anchor="middle" fill="currentColor">T1</text>
    <circle cx="604" cy="240" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="604" y="243" font-size="8" text-anchor="middle" fill="currentColor">T2</text>
    <circle cx="604" cy="272" r="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="604" y="275" font-size="8" text-anchor="middle" fill="currentColor">T3</text>
  </g>
  <line x1="571" y1="216" x2="592" y2="210" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="571" y1="241" x2="592" y2="240" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <line x1="571" y1="246" x2="592" y2="268" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#mArr)"/>
  <text x="604" y="296" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">target: Lambda/SQS/SNS...</text>
</svg>

## 2. Amazon SQS

Fully managed message queue. Mo hinh **point-to-point**: 1 message → 1 consumer xu ly (sau do xoa). Producer va consumer hoan toan tach roi.

### Standard vs FIFO

| Tieu chi | Standard | FIFO |
|----------|----------|------|
| Thu tu | Best-effort (co the lech) | Dam bao thu tu trong moi MessageGroupId |
| Delivery | At-least-once (co the trung lap) | Exactly-once (khu trung lap) |
| Throughput | Gan nhu khong gioi han | 300 msg/s (3000 voi batching), 70.000 voi high throughput mode |
| Ten queue | tuy y | **phai ket thuc bang `.fifo`** |
| Truong bat buoc | khong | `MessageGroupId`; `MessageDeduplicationId` (hoac content-based dedup) |

> ⚠️ Bay: De rat hay hoi "can dam bao thu tu xu ly transaction va khong xu ly trung lap" → chon **FIFO**. Nhung neu them "throughput rat cao, hang chuc nghin msg/s, thu tu khong quan trong" → **Standard**. Dung chon FIFO chi vi nghe "an toan hon".

> ⚠️ Bay: Standard la at-least-once → **consumer phai idempotent**. Cau hoi kieu "lam sao tranh xu ly trung" co the tra loi bang "thiet ke idempotent" thay vi doi sang FIFO.

### Visibility Timeout

Khi 1 consumer nhan message, message khong bi xoa ma bi "an" trong khoang visibility timeout (mac dinh 30s, toi da 12 gio). Trong thoi gian nay consumer khac khong thay no. Consumer phai goi `DeleteMessage` sau khi xu ly xong.

- Neu xu ly **lau hon** visibility timeout → message hien lai → **bi xu ly 2 lan** (lap vo han neu khong fix).
- Consumer can them thoi gian: goi `ChangeMessageVisibility` de gia han.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline visibility timeout cua SQS</title>
  <desc>Hai kich ban tren truc thoi gian: kich ban tot la message duoc nhan, an trong cua so timeout, roi DeleteMessage thi message bien mat; kich ban xau la timeout het truoc khi xu ly xong nen message hien lai va bi xu ly lai; ChangeMessageVisibility gia han cua so.</desc>
  <defs>
    <marker id="vtArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Visibility timeout — hai ket cuc</text>
  <text x="700" y="22" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">thoi gian →</text>
  <!-- Kich ban tot -->
  <text x="16" y="56" font-size="11.5" font-weight="700" fill="#10b981">Tot: xoa truoc khi het timeout</text>
  <line x1="16" y1="100" x2="704" y2="100" stroke="currentColor" stroke-opacity="0.3"/>
  <circle cx="60" cy="100" r="6" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="60" y="84" font-size="9.5" text-anchor="middle" fill="currentColor">ReceiveMessage</text>
  <rect x="60" y="92" width="320" height="16" rx="4" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="220" y="104" font-size="9.5" text-anchor="middle" fill="currentColor">message AN (visibility timeout)</text>
  <circle cx="300" cy="100" r="6" fill="#10b981" fill-opacity="0.95"/>
  <text x="300" y="128" font-size="9.5" text-anchor="middle" fill="currentColor">DeleteMessage</text>
  <text x="300" y="142" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">→ message bien mat</text>
  <line x1="380" y1="100" x2="500" y2="100" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
  <text x="500" y="96" font-size="9" fill="currentColor" opacity="0.55">(timeout chua het cung khong sao)</text>
  <!-- Kich ban xau -->
  <text x="16" y="196" font-size="11.5" font-weight="700" fill="#f59e0b">Xau: timeout het truoc khi xu ly xong</text>
  <line x1="16" y1="240" x2="704" y2="240" stroke="currentColor" stroke-opacity="0.3"/>
  <circle cx="60" cy="240" r="6" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="60" y="224" font-size="9.5" text-anchor="middle" fill="currentColor">ReceiveMessage</text>
  <rect x="60" y="232" width="240" height="16" rx="4" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="180" y="244" font-size="9.5" text-anchor="middle" fill="currentColor">message AN</text>
  <circle cx="300" cy="240" r="6" fill="#f59e0b" fill-opacity="0.95"/>
  <text x="300" y="224" font-size="9.5" text-anchor="middle" fill="currentColor">timeout het</text>
  <text x="300" y="268" font-size="9.5" text-anchor="middle" fill="currentColor">message HIEN LAI</text>
  <line x1="300" y1="252" x2="300" y2="240" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#vtArr)"/>
  <circle cx="480" cy="240" r="6" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="480" y="224" font-size="9.5" text-anchor="middle" fill="currentColor">consumer khac nhan</text>
  <text x="480" y="268" font-size="9.5" text-anchor="middle" fill="#f59e0b">→ XU LY LAI (trung)</text>
  <!-- ChangeMessageVisibility -->
  <rect x="60" y="288" width="540" height="22" rx="5" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="330" y="303" font-size="10" text-anchor="middle" fill="currentColor">ChangeMessageVisibility = gia han cua so AN khi can them thoi gian xu ly</text>
</svg>

```python
# Boto3: nhan, xu ly, xoa
resp = sqs.receive_message(QueueUrl=url, MaxNumberOfMessages=10, WaitTimeSeconds=20)
for msg in resp.get('Messages', []):
    process(msg['Body'])
    sqs.delete_message(QueueUrl=url, ReceiptHandle=msg['ReceiptHandle'])
```

> 💡 Meo thi: Message bi xu ly nhieu lan / Lambda chay lap → kiem tra **visibility timeout co lon hon thoi gian xu ly khong**. Quy tac: voi Lambda trigger, dat visibility timeout **>= 6x function timeout**.

### Long Polling vs Short Polling

- **Short polling** (`WaitTimeSeconds=0`): tra ve ngay, co the rong du queue co message → nhieu empty response → ton tien API call.
- **Long polling** (`WaitTimeSeconds` 1-20): cho den khi co message hoac het thoi gian → giam empty response, giam chi phi, giam latency.

> 💡 Meo thi: "Giam so empty receives / giam chi phi polling" → bat **long polling** (set `ReceiveMessageWaitTimeSeconds` len 20). Day la cau hoi gan nhu chac chan xuat hien.

### Dead-Letter Queue (DLQ)

Queue phu nhan cac message bi **xu ly that bai nhieu lan**. Cau hinh `maxReceiveCount` trong redrive policy: sau N lan receive ma chua xoa → message day vao DLQ de dieu tra, tranh "poison pill" lam ket queue.

```json
{
  "deadLetterTargetArn": "arn:aws:sqs:...:my-dlq",
  "maxReceiveCount": 5
}
```

> ⚠️ Bay: DLQ cua FIFO queue cung phai la FIFO; DLQ cua Standard phai la Standard. Khong tron loai.

### SQS + Lambda Trigger

Lambda co the poll SQS tu dong (event source mapping). Lambda batch nhieu message, scale theo so message.

- Neu Lambda xu ly thanh cong → message tu dong xoa. Neu loi → quay lai queue (theo visibility timeout) → cuoi cung vao DLQ.
- **Batch window** va **batch size** dieu chinh do gom message.
- Co the dung `ReportBatchItemFailures` de chi tra lai message loi thay vi ca batch.

> 💡 Meo thi: Voi SQS+Lambda, dat DLQ tren **SQS queue**, khong phai tren Lambda. (Lambda async invoke moi co DLQ/destination rieng — dung nham la bay.)

## 3. Amazon SNS

**Pub/Sub**: 1 message gui vao **topic** → fan-out toi **nhieu subscriber** cung luc. Subscriber co the la: SQS, Lambda, HTTP/S, email, SMS, Kinesis Data Firehose, mobile push.

- SNS **push** (day message ra ngay), khac SQS **pull** (consumer keo ve).
- Khong luu tru lau dai: neu subscriber chet, message co the mat (tru khi co SQS dem giua).
- SNS cung co **FIFO topic** (ket hop voi SQS FIFO).

### Fan-out: SNS + SQS

Pattern kinh dien: producer publish 1 message len SNS topic → moi he thong down-stream co **SQS queue rieng** subscribe vao topic. Moi service xu ly doc lap, theo nhip rieng, co buffer + DLQ rieng.

```
                 +--> SQS (Order service)
Producer -> SNS -+--> SQS (Analytics)
                 +--> SQS (Email notify)
```

> 💡 Meo thi: "1 su kien can kich hoat NHIEU xu ly doc lap, moi he thong co buffer/retry rieng" → **SNS + SQS fan-out**. Day la cau tra loi dung gan nhu mac dinh khi de mo ta nhieu consumer + can do ben.

> ⚠️ Bay: Chi SNS (khong SQS dem) → neu subscriber down, message mat. Can do ben/retry → them SQS giua.

### Message Filtering

Subscriber co the dat **filter policy** (theo message attributes) de chi nhan message lien quan → tranh xu ly du thua, khong can topic rieng cho moi loai.

## 4. Amazon EventBridge

**Event bus** serverless cho kien truc event-driven. Nhan event tu AWS services, SaaS, hoac ung dung cua ban (custom event), roi **rule** dinh tuyen toi target (Lambda, SQS, SNS, Step Functions, Kinesis...).

Diem manh so voi SNS:
- **Content-based routing** manh me bang event pattern (match theo bat ky field nao trong JSON).
- Tich hop san **nhieu AWS service** va **SaaS partner** lam event source.
- **Schema registry** + **schedule** (cron/rate) — thay the CloudWatch Events.
- **Archive & replay** event.

```json
// Event pattern: chi bat S3 object created trong 1 bucket
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": { "bucket": { "name": ["my-uploads"] } }
}
```

### Scheduled events

```
rate(5 minutes)
cron(0 12 * * ? *)   # 12:00 UTC moi ngay
```

> 💡 Meo thi: "Chay task theo lich (cron/rate)" → **EventBridge Scheduler/rule**. Day la cach serverless thay cho cron server.

### SNS vs EventBridge (bay quan trong)

| Tieu chi | SNS | EventBridge |
|----------|-----|-------------|
| Mo hinh | Pub/sub fan-out | Event bus + routing |
| Routing | Filter theo attribute (don gian) | Event pattern phong phu (theo noi dung) |
| Target | Nhieu, nhung gioi han loai | Rat nhieu AWS service + SaaS |
| Throughput/latency | Cao, latency cuc thap | Hoi cao hon SNS |
| SaaS / schedule / replay | Khong | Co |

> ⚠️ Bay: "Fan-out toi rat nhieu subscriber, throughput cao, latency thap" → **SNS**. "Dinh tuyen theo noi dung event tu nhieu nguon (gom SaaS), tich hop AWS service, theo lich" → **EventBridge**. De thich nhap nhem hai cai nay.

## 5. AWS Step Functions

Orchestration: dieu phoi workflow nhieu buoc bang **state machine** dinh nghia bang Amazon States Language (ASL/JSON). Quan ly trang thai, retry, error handling, branching giua cac buoc.

### Cac loai state

| State | Cong dung |
|-------|-----------|
| `Task` | Goi 1 cong viec (Lambda, SQS, ECS, SDK service...) |
| `Choice` | Re nhanh theo dieu kien |
| `Parallel` | Chay nhieu nhanh song song |
| `Map` | Lap qua mang, xu ly tung phan tu (co Distributed Map cho quy mo lon) |
| `Wait` | Cho 1 khoang / den thoi diem |
| `Pass` | Truyen/bien doi data, khong lam gi them |
| `Succeed` / `Fail` | Ket thuc workflow |

```json
{
  "Comment": "Vi du don gian",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:validate",
      "Next": "ChargeOrChoice"
    },
    "ChargeOrChoice": {
      "Type": "Choice",
      "Choices": [{ "Variable": "$.valid", "BooleanEquals": true, "Next": "Charge" }],
      "Default": "RejectOrder"
    },
    "Charge":      { "Type": "Task", "Resource": "arn:...:charge", "End": true },
    "RejectOrder": { "Type": "Fail", "Error": "InvalidOrder" }
  }
}
```

### Standard vs Express

| Tieu chi | Standard | Express |
|----------|----------|---------|
| Thoi luong toi da | 1 nam | 5 phut |
| Execution model | Exactly-once | At-least-once (Async) / At-most-once (Sync) |
| Gia | Theo so state transition (dat hon) | Theo so request + thoi gian chay (re cho khoi luong lon) |
| Use case | Workflow dai, co buoc cho duyet/human, ETL dai | Streaming, IoT, xu ly event tan suat cao, ngan |
| History | Co lich su chi tiet | Khong (chi qua CloudWatch Logs) |

> 💡 Meo thi: Workflow **dai, can audit/retry chi tiet, co human approval** → **Standard**. Workflow **ngan (<5 phut), throughput cuc cao, event-processing** → **Express**.

> ⚠️ Bay: Step Functions ho tro **callback pattern** (`waitForTaskToken`) de cho he thong ngoai/nguoi dung phan hoi roi tiep tuc — rat hay hoi cho "human approval step".

## 6. Choreography vs Orchestration (bay khai niem)

| | Orchestration | Choreography |
|--|--------------|--------------|
| Dieu khien | 1 "nhac truong" trung tam ra lenh | Cac service tu phan ung voi event |
| Dich vu | **Step Functions** | **EventBridge / SNS / SQS** |
| Hieu logic flow | De nhin tong the | Phan tan, kho trace hon |
| Coupling | Trung tam biet cac buoc | Loose, moi service doc lap |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Orchestration so voi Choreography</title>
  <desc>Ben trai orchestration: mot nhac truong Step Functions o trung tam ra lenh tuan tu cho cac service A, B, C. Ben phai choreography: cac service tu phan ung voi event lan truyen qua EventBridge, SNS, SQS, khong co dieu khien trung tam.</desc>
  <defs>
    <marker id="orArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <!-- Orchestration -->
  <text x="16" y="24" font-size="13" font-weight="700" fill="currentColor">Orchestration — nhac truong trung tam</text>
  <rect x="120" y="44" width="120" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="180" y="62" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Step Functions</text>
  <text x="180" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">ra lenh tung buoc</text>
  <g>
    <rect x="30" y="150" width="80" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="70" y="171" font-size="10" text-anchor="middle" fill="currentColor">Service A</text>
    <rect x="140" y="150" width="80" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="171" font-size="10" text-anchor="middle" fill="currentColor">Service B</text>
    <rect x="250" y="150" width="80" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="290" y="171" font-size="10" text-anchor="middle" fill="currentColor">Service C</text>
  </g>
  <line x1="160" y1="84" x2="80" y2="148" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <line x1="180" y1="84" x2="180" y2="148" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <line x1="200" y1="84" x2="280" y2="148" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <text x="180" y="210" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">1 → 2 → 3 theo thu tu, retry, branching</text>
  <line x1="360" y1="40" x2="360" y2="270" stroke="currentColor" stroke-opacity="0.2"/>
  <!-- Choreography -->
  <text x="396" y="24" font-size="13" font-weight="700" fill="currentColor">Choreography — phan ung theo event</text>
  <g>
    <rect x="396" y="60" width="78" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="435" y="81" font-size="10" text-anchor="middle" fill="currentColor">Service X</text>
    <rect x="560" y="60" width="78" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="599" y="81" font-size="10" text-anchor="middle" fill="currentColor">Service Y</text>
    <rect x="478" y="200" width="78" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="517" y="221" font-size="10" text-anchor="middle" fill="currentColor">Service Z</text>
  </g>
  <rect x="470" y="120" width="94" height="50" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="517" y="140" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">EventBridge</text>
  <text x="517" y="156" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">SNS / SQS</text>
  <line x1="470" y1="94" x2="490" y2="118" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <line x1="540" y1="120" x2="570" y2="96" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <line x1="517" y1="170" x2="517" y2="198" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#orArr)"/>
  <text x="517" y="262" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">khong co dieu khien trung tam</text>
</svg>

> ⚠️ Bay: "Can dieu phoi nhieu buoc co thu tu, retry, branching, theo doi trang thai tung buoc" → **orchestration = Step Functions**. "Cac service phan ung doc lap voi event, khong co dieu khien trung tam" → **choreography = EventBridge/SNS/SQS**. De rat thich dat tinh huong roi hoi chon cai nao.

## 7. Amazon Kinesis Data Streams

Cho **real-time streaming** du lieu lon (clickstream, log, IoT, metrics). Khac SQS o cho: du lieu duoc **giu lai** (mac dinh 24h, toi da 365 ngay) va **nhieu consumer doc lai cung du lieu**; thu tu dam bao trong moi **shard**.

### Khai niem chinh

- **Shard**: don vi throughput. Moi shard: ghi 1 MB/s (hoac 1000 record/s), doc 2 MB/s. Tang capacity = tang shard.
- **Partition key**: quyet dinh record vao shard nao (cung key → cung shard → giu thu tu).
- **Consumer**: doc bang KCL hoac Lambda. **Enhanced fan-out** cho moi consumer 2 MB/s rieng (khong chia se).
- Capacity mode: **Provisioned** (tu set shard) vs **On-demand** (tu scale).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mo hinh shard cua Kinesis Data Streams</title>
  <desc>Record duoc dinh tuyen theo partition key vao cac shard: cung key thi vao cung shard nen giu thu tu. Du lieu giu lai tu 24 gio den 365 ngay. Nhieu consumer cung doc lai mot stream; enhanced fan-out cho moi consumer 2 MB/s rieng.</desc>
  <defs>
    <marker id="kArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Kinesis: partition key → shard → nhieu consumer</text>
  <!-- Producers / records -->
  <g>
    <rect x="16" y="56" width="78" height="26" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="55" y="73" font-size="9.5" text-anchor="middle" fill="currentColor">record key=A</text>
    <rect x="16" y="142" width="78" height="26" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="55" y="159" font-size="9.5" text-anchor="middle" fill="currentColor">record key=A</text>
    <rect x="16" y="214" width="78" height="26" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="55" y="231" font-size="9.5" text-anchor="middle" fill="currentColor">record key=B</text>
  </g>
  <text x="55" y="100" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">partition key</text>
  <!-- Shards -->
  <g>
    <rect x="200" y="58" width="200" height="50" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="300" y="78" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Shard 1</text>
    <text x="300" y="96" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">key=A → giu thu tu (1MB/s in, 2MB/s out)</text>
    <rect x="200" y="200" width="200" height="50" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="300" y="220" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Shard 2</text>
    <text x="300" y="238" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">key=B</text>
  </g>
  <line x1="95" y1="68" x2="198" y2="74" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <line x1="95" y1="154" x2="198" y2="92" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <line x1="95" y1="226" x2="198" y2="222" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <text x="300" y="130" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">cung key → cung shard</text>
  <text x="300" y="276" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">giu lai 24h – 365 ngay (replay duoc)</text>
  <!-- Consumers -->
  <g>
    <rect x="500" y="50" width="120" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="560" y="71" font-size="9.5" text-anchor="middle" fill="currentColor">Consumer 1 (analytics)</text>
    <rect x="500" y="98" width="120" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="560" y="119" font-size="9.5" text-anchor="middle" fill="currentColor">Consumer 2 (archive)</text>
    <rect x="500" y="200" width="120" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="560" y="221" font-size="9.5" text-anchor="middle" fill="currentColor">Consumer 3</text>
  </g>
  <line x1="400" y1="80" x2="498" y2="68" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <line x1="400" y1="88" x2="498" y2="114" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <line x1="400" y1="222" x2="498" y2="218" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#kArr)"/>
  <text x="610" y="156" font-size="9" text-anchor="end" fill="currentColor" opacity="0.65">moi consumer doc lai cung stream</text>
  <text x="610" y="172" font-size="9" text-anchor="end" fill="currentColor" opacity="0.65">enhanced fan-out = 2 MB/s rieng/consumer</text>
</svg>

### Kinesis vs SQS (bay so sanh)

| Tieu chi | Kinesis Data Streams | SQS |
|----------|----------------------|-----|
| Mo hinh | Streaming, replay duoc | Queue, message xoa sau khi xu ly |
| Nhieu consumer doc cung data | Co (multiple consumers) | Khong (1 message → 1 consumer) |
| Thu tu | Theo shard | FIFO queue moi co |
| Luu giu | 24h–365 ngay | Toi da 14 ngay, xoa khi consume |
| Use case | Analytics real-time, replay, fan-in stream lon | Decouple, task queue, buffer |

> ⚠️ Bay: "Nhieu ung dung cung phan tich 1 luong du lieu real-time, can replay" → **Kinesis Data Streams**, KHONG phai SQS. SQS xoa message sau khi xu ly, khong replay duoc.

> 💡 Meo thi: "ProvisionedThroughputExceeded" → shard bi nong (hot shard) do partition key phan bo lech → can tang shard hoac chon partition key tot hon.

## 8. Bang chon nhanh dich vu (on tap)

| Tinh huong de | Dich vu |
|---------------|---------|
| Decouple, buffer, smooth spike, 1 consumer | **SQS Standard** |
| Bao dam thu tu + khong trung lap | **SQS FIFO** |
| 1 event → nhieu consumer doc lap + buffer rieng | **SNS + SQS fan-out** |
| Routing theo noi dung tu nhieu nguon (gom SaaS), theo lich | **EventBridge** |
| Dieu phoi workflow nhieu buoc, retry, branching, human approval | **Step Functions (Standard)** |
| Event-processing ngan, throughput cuc cao | **Step Functions (Express)** |
| Streaming real-time, nhieu consumer, replay | **Kinesis Data Streams** |
| Giam empty receives khi poll | **Long polling** |
| Message loi lap di lap lai | **DLQ + maxReceiveCount** |

## 9. Amazon Q Developer ho tro code

**Amazon Q Developer** (ke nhiem CodeWhisperer) la AI coding assistant tich hop IDE/CLI. Trong boi canh app integration, no giup:

- Sinh code boilerplate cho SDK: vi du go comment "// publish order event to SNS topic" → Q goi y doan `boto3` publish hoan chinh.
- Goi y cau hinh event source mapping, IAM policy cho SQS/SNS/Kinesis.
- Giai thich code va de xuat best practice (idempotency, error handling, batch).
- Security scan: phat hien hardcoded credential, IAM qua rong.

> 💡 Meo thi: Trong de DVA-C02, neu xuat hien "AI coding companion / suggest code in IDE / scan for vulnerabilities" → **Amazon Q Developer**. Nho moc: no thay the ten cu **CodeWhisperer**.

## Tom tat trong tam thi

- **SQS** = decouple/buffer/point-to-point. Nho **visibility timeout** (>= 6x Lambda timeout), **long polling** (giam chi phi), **DLQ** (poison pill), **FIFO** (thu tu + dedup, `.fifo`, MessageGroupId).
- **SNS** = pub/sub fan-out; ket **SNS + SQS** de moi consumer co buffer/retry rieng.
- **EventBridge** = event bus, routing theo noi dung, nhieu nguon + SaaS, schedule cron/rate.
- **Step Functions** = orchestration workflow; **Standard** (dai, audit, human approval) vs **Express** (ngan, throughput cao); biet cac state type va `waitForTaskToken`.
- **Kinesis Data Streams** = streaming, shard, nhieu consumer, replay — khac han SQS.
- **Choreography (EventBridge/SNS/SQS) vs Orchestration (Step Functions)** la bay khai niem hay gap.
- **Amazon Q Developer** = AI coding assistant (ke nhiem CodeWhisperer).
