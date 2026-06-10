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

> ⚠️ Bay: "Can dieu phoi nhieu buoc co thu tu, retry, branching, theo doi trang thai tung buoc" → **orchestration = Step Functions**. "Cac service phan ung doc lap voi event, khong co dieu khien trung tam" → **choreography = EventBridge/SNS/SQS**. De rat thich dat tinh huong roi hoi chon cai nao.

## 7. Amazon Kinesis Data Streams

Cho **real-time streaming** du lieu lon (clickstream, log, IoT, metrics). Khac SQS o cho: du lieu duoc **giu lai** (mac dinh 24h, toi da 365 ngay) va **nhieu consumer doc lai cung du lieu**; thu tu dam bao trong moi **shard**.

### Khai niem chinh

- **Shard**: don vi throughput. Moi shard: ghi 1 MB/s (hoac 1000 record/s), doc 2 MB/s. Tang capacity = tang shard.
- **Partition key**: quyet dinh record vao shard nao (cung key → cung shard → giu thu tu).
- **Consumer**: doc bang KCL hoac Lambda. **Enhanced fan-out** cho moi consumer 2 MB/s rieng (khong chia se).
- Capacity mode: **Provisioned** (tu set shard) vs **On-demand** (tu scale).

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
