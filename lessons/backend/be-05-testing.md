# Testing Strategy cho Backend

Test không phải để "đạt coverage 80%" hay làm vừa lòng CI. Test tồn tại vì **một lý do duy nhất: cho phép bạn thay đổi code mà không sợ**. Một hệ thống có test tốt là hệ thống mà developer dám refactor lúc 5 giờ chiều thứ Sáu. Một hệ thống có test tồi là hệ thống mà mỗi lần sửa một dòng, 40 test gãy — và tất cả đều gãy vì lý do **không liên quan đến bug**.

Bài này nói về chiến lược: test gì, test ở tầng nào, mock cái gì, và những thói quen testing đang âm thầm phá hoại codebase của bạn.

## 1. Test pyramid thực dụng

Phiên bản kinh điển của Mike Cohn: nhiều unit test ở đáy, ít integration test ở giữa, rất ít E2E test trên đỉnh. Lý do: càng lên cao càng **chậm, đắt, flaky**.

| Tầng | Tốc độ | Độ tin cậy tín hiệu | Chi phí maintain | Tỉ lệ gợi ý |
|---|---|---|---|---|
| Unit | mili-giây | Cao cho logic, thấp cho wiring | Thấp | ~60–70% |
| Integration | giây | Cao — bắt được lỗi wiring, SQL, serialization | Trung bình | ~20–30% |
| E2E | phút | Cao nhất nhưng flaky nhất | Rất cao | ~5–10% |

Nhưng tỉ lệ **phụ thuộc vào bản chất service**:

- **Service nhiều business logic** (pricing engine, rule engine): unit test chiếm đa số — logic thuần là đất diễn của unit test.
- **Service kiểu CRUD/glue** (nhận request → validate → ghi DB → bắn event): phần lớn bug nằm ở SQL, mapping, config — unit test gần như vô dụng ở đây. Tỉ trọng integration test nên cao hơn hẳn. Đây là lý do nhiều team hiện đại theo trường phái "**testing trophy**" (Kent C. Dodds): integration test là tầng dày nhất.

> 💡 Ghi nhớ: Đừng tranh cãi "pyramid hay trophy". Câu hỏi đúng là: **bug của service này thường nằm ở đâu?** Logic phức tạp → nhiều unit. Wiring/IO phức tạp → nhiều integration. Test ở tầng **thấp nhất có thể bắt được loại bug đó**.

Một hình dạng cần tránh: **ice cream cone** (kem ốc quế ngược) — vài unit test, rất nhiều E2E chạy qua UI/staging. Triệu chứng: pipeline 45 phút, mỗi tuần "re-run vì flaky" chục lần, không ai tin kết quả đỏ.

## 2. Unit test tốt: test hành vi, không test implementation

Đây là kỹ năng quan trọng nhất và bị làm sai nhiều nhất. So sánh:

```python
# ❌ Test implementation — gắn chặt vào cách code được viết
def test_apply_discount_calls_strategy():
    strategy = Mock()
    svc = PricingService(strategy)
    svc.price(order)
    strategy.compute.assert_called_once_with(order.items, order.customer_tier)

# ✅ Test hành vi — gắn vào điều hệ thống cam kết
def test_gold_customer_gets_10_percent_off():
    svc = PricingService(default_strategies())
    order = make_order(total=100, tier="gold")
    assert svc.price(order) == 90
```

Test thứ nhất sẽ gãy khi bạn đổi chữ ký `compute()`, gộp 2 strategy làm 1, hay đổi thứ tự tham số — toàn những thay đổi **không đổi hành vi**. Test thứ hai chỉ gãy khi khách gold không còn được giảm 10% — tức là khi **có chuyện thật**.

Quy tắc thực dụng:

- **Unit = một hành vi, không phải một class/một method.** Test qua public API của module; các class private bên trong là chi tiết, được test gián tiếp.
- Refactor nội bộ (đổi tên hàm private, tách class) mà test gãy → test đó đang test implementation. Đây là "**test brittleness**" — chi phí lớn nhất của test suite tồi.
- Assert trên **output và side effect quan sát được** (giá trị trả về, record trong DB, message bắn ra), không assert trên "hàm X được gọi mấy lần" — trừ khi lời gọi đó **chính là** hành vi cam kết (vd: "gửi đúng 1 email").
- Đặt tên test theo nghiệp vụ: `test_expired_coupon_is_rejected`, không phải `test_validate_returns_false`.

> ⚠️ Bẫy production: Test suite "1.500 test, 92% coverage" nhưng toàn mock-verify kiểu `assert_called_with` → khi có bug thật (SQL sai, mapping thiếu field), **toàn bộ 1.500 test vẫn xanh**. Team có cảm giác an toàn giả — nguy hiểm hơn không có test.

## 3. Mock ở RANH GIỚI hệ thống — đừng mock mọi thứ

Sai lầm phổ biến: mock mọi dependency của class đang test (kiểu "London school" cực đoan). Kết quả là test chỉ chứng minh "code gọi đúng các mock mà tôi vừa dạy nó gọi" — một phép **tự thoả mãn vòng tròn**.

Nguyên tắc: **chỉ mock/fake ở ranh giới hệ thống** — nơi code của bạn chạm vào thế giới bên ngoài:

| Loại dependency | Có nên mock trong unit test? |
|---|---|
| Class/module nội bộ cùng service | ❌ Không — dùng object thật |
| Clock, random, UUID | ✅ Có — inject để test deterministic |
| HTTP call sang service khác | ✅ Có (fake/stub ở boundary) |
| Database | Unit: stub repository. Tốt hơn: integration test với DB thật |
| Message broker (SQS/Kafka) | ✅ Fake ở boundary, và có integration test riêng |
| Payment gateway, email provider | ✅ Luôn — kèm contract/sandbox test |

Hai kỹ thuật giúp việc này dễ:

1. **Hexagonal architecture / ports & adapters**: business logic chỉ phụ thuộc interface (`PaymentPort`, `Clock`), adapter thật nằm ngoài. Unit test cắm fake vào port — không cần mocking framework phức tạp.
2. **Ưu tiên fake hơn mock**: viết một `InMemoryOrderRepository` thật sự hoạt động (lưu vào dict) thay vì stub từng method. Fake tái dùng được cho hàng trăm test và hành xử nhất quán.

```typescript
// Fake ở boundary — tái dùng, hành vi nhất quán
class InMemoryOrderRepo implements OrderRepo {
  private store = new Map<string, Order>();
  async save(o: Order) { this.store.set(o.id, o); }
  async byId(id: string) { return this.store.get(id) ?? null; }
}
```

Phân loại test double cho đúng từ (mọi người gọi tất cả là "mock", nhưng chúng khác nhau):

| Loại | Là gì | Khi nào dùng |
|---|---|---|
| Dummy | Object truyền vào cho đủ tham số, không dùng | Constructor đòi dependency mà test không chạm tới |
| Stub | Trả về giá trị định sẵn | Cấp input cho code: `clock.now()` trả thời điểm cố định |
| Fake | Implementation thật nhưng đơn giản hoá | In-memory repo, LocalStack — dùng nhiều nhất, nên ưu tiên |
| Spy | Ghi lại lời gọi để assert sau | Kiểm side effect là hành vi cam kết ("đã gửi 1 email") |
| Mock | Định nghĩa kỳ vọng trước, verify sau | Hạn chế — dễ dẫn tới test implementation |

> 💡 Ghi nhớ: Số lượng mock trong một test tỉ lệ nghịch với giá trị của test đó. Thấy test cần 5 mock để chạy → thiết kế đang ép bạn test implementation; cân nhắc refactor (tách pure logic ra) thay vì thêm mock thứ 6.

## 4. Integration test với DB thật

Mock database là nơi bug trốn: SQL syntax sai dialect, constraint vi phạm, transaction không rollback, N+1, mapping thiếu cột — **không cái nào** bị unit test bắt. Giải pháp 2025: chạy dependency thật trong container, vòng đời do test quản lý.

**Testcontainers** (Java/Python/Go/Node/.NET đều có):

```python
# pytest + testcontainers — Postgres THẬT, đúng version production
@pytest.fixture(scope="session")
def pg():
    with PostgresContainer("postgres:16") as c:
        run_migrations(c.get_connection_url())   # chạy migration thật
        yield c

def test_concurrent_voucher_redeem_only_succeeds_once(pg, db_session):
    create_voucher(db_session, code="X", remaining=1)
    r1, r2 = redeem_parallel(db_session, "X", times=2)
    assert sorted([r1, r2]) == ["FAILED", "OK"]   # test cả row-level lock!
```

Những điều đáng test ở tầng này mà unit test không bao giờ chạm tới: unique constraint, `SELECT ... FOR UPDATE`, isolation level, JSON column mapping, migration chạy được trên schema thật.

Mẹo giữ tốc độ:

- Container scope = session (khởi động 1 lần), mỗi test chạy trong **transaction rồi rollback**, hoặc `TRUNCATE` nhanh giữa các test.
- Dùng **đúng image version với production** (`postgres:16` chứ không phải H2/SQLite "giả lập Postgres" — đây là một anti-pattern kinh điển: test xanh trên H2, nổ trên Postgres vì khác dialect).
- Với AWS dependency (S3, SQS, DynamoDB, SNS): dùng **LocalStack** trong container — SDK trỏ `endpoint_url` về LocalStack, code không đổi.

```python
sqs = boto3.client("sqs", endpoint_url="http://localhost:4566")  # LocalStack
```

> ⚠️ Bẫy production: Test integration dùng **shared database trên môi trường dev** (mọi developer + CI cùng trỏ vào một RDS dev). Hệ quả: test phụ thuộc dữ liệu của nhau, fail ngẫu nhiên theo giờ, không chạy parallel được. Mỗi lần chạy test phải có **DB riêng, sạch, ephemeral** — đó chính là giá trị của testcontainers.

## 5. Contract testing cho microservices

Bài toán: service A (consumer) gọi service B (provider). E2E test cả hai cùng lúc thì chậm và flaky; mock B trong test của A thì **mock có thể nói dối** — B đổi response format, mock của A không hề biết, test xanh, production đỏ.

**Consumer-driven contract testing** (Pact là công cụ phổ biến nhất) giải quyết bằng cách tách đôi:

1. **Phía consumer**: test của A chạy với mock B, nhưng mock này **ghi lại** mọi tương tác (request mong gửi, response mong nhận) thành một file contract (pact file), publish lên Pact Broker.
2. **Phía provider**: CI của B tải contract về, **phát lại** từng request vào B thật và verify response khớp với điều consumer kỳ vọng.

Kết quả: B muốn đổi/bỏ một field → build của B **đỏ ngay tại CI của B**, trước khi deploy, kèm thông tin "consumer nào đang phụ thuộc field này". Đây là cách phát hiện breaking change mà không cần dựng cả hệ thống lên.

| | Mock thường | Contract test |
|---|---|---|
| Mock lệch với provider thật | Không ai biết | Provider verification fail |
| Provider biết ai đang dùng field gì | Không | Có (can-i-deploy) |
| Cần dựng cả 2 service cùng lúc | — | Không — hai phía test độc lập |

Với **event-driven** (SQS/Kafka/EventBridge): nguyên tắc tương tự áp dụng cho message schema — dùng Pact message contracts, hoặc **schema registry** (Avro/JSON Schema + compatibility mode `BACKWARD`) để CI chặn schema đổi kiểu phá vỡ consumer.

> 💡 Ghi nhớ: Contract test trả lời đúng một câu hỏi: "**hai bên còn hiểu nhau không?**" — không test business logic của provider. Đừng nhồi logic vào contract; giữ contract mỏng (field nào tồn tại, kiểu gì), nếu không sẽ thành E2E test trá hình và mong manh.

## 6. Test async code

Code async (background job, message handler, event-driven flow) là ổ flaky test nếu test sai cách. Tội đồ số một: `sleep`.

```python
# ❌ Flaky: 2s đủ trên laptop, thiếu trên CI đang quá tải; và lãng phí 2s mỗi lần
publish(event); time.sleep(2); assert db.find(order_id).status == "PAID"

# ✅ Poll với timeout — nhanh khi nhanh, chỉ fail khi thật sự quá hạn
publish(event)
await_until(lambda: db.find(order_id).status == "PAID", timeout=5, interval=0.05)
```

Chiến lược theo tầng:

- **Unit test handler trực tiếp**: gọi `handle(message)` như một hàm thường — không cần broker. 90% logic async test được kiểu này, đồng bộ và nhanh.
- **Tách "transport" khỏi "logic"**: hàm nhận `SQSEvent` chỉ parse rồi delegate cho hàm thuần. Test hàm thuần bằng unit, test parse bằng fixture event JSON.
- **Integration test với broker thật** (LocalStack SQS, testcontainers Kafka): chỉ vài test, kiểm wiring + serialization, dùng polling-with-timeout (`awaitility` ở Java, `tenacity`/vòng lặp poll ở Python, `waitFor` của testing-library ở TS).
- **Kiểm soát clock**: code dùng `Clock`/`time provider` inject được; test với fake clock thay vì chờ thật. Với JS, `vi.useFakeTimers()`/`jest.useFakeTimers()`.
- **Test idempotency một cách chủ động**: deliver cùng message 2 lần, assert side effect xảy ra 1 lần. SQS là at-least-once — đây là test quan trọng nhất của một message handler.

### Test data: builder thay vì fixture khổng lồ

Test khó đọc thường vì setup dài 30 dòng hoặc fixture JSON 200 dòng dùng chung. Dùng **test data builder** với default hợp lệ — mỗi test chỉ nói rõ điều nó quan tâm:

```typescript
// Mỗi test chỉ override field LIÊN QUAN đến hành vi đang test
const order = anOrder().withTier("gold").withTotal(100).build();
const expired = aCoupon().expiredSince("2025-01-01").build();
```

Lợi ích kép: test tự tài liệu hoá ("test này nói về tier và total"), và khi schema đổi chỉ sửa builder ở một chỗ thay vì 300 fixture.

### Snapshot testing — dùng có kiểm soát

Snapshot test (lưu output, lần sau diff) hữu ích cho response serialization, generated SQL, rendered template. Nhưng đây cũng là loại test dễ thoái hoá nhất: khi snapshot fail, developer bấm `--update` theo phản xạ mà không đọc diff → test trở thành "ghi nhận mọi thay đổi" thay vì "kiểm tra hành vi". Quy tắc: snapshot phải **nhỏ và đọc được trong review** (vài chục dòng), và update snapshot phải được review như code.

## 7. Flaky test & cách trị

Flaky = test lúc xanh lúc đỏ với cùng một code. Tác hại lớn nhất không phải thời gian re-run, mà là **xói mòn niềm tin**: khi developer quen tay bấm "re-run", họ sẽ re-run cả lúc test đỏ vì bug thật.

Nguyên nhân phổ biến, xếp theo tần suất:

| Nguyên nhân | Dấu hiệu | Cách trị |
|---|---|---|
| Chờ async bằng `sleep` | Fail trên CI chậm, pass local | Poll với timeout (mục 6) |
| Test phụ thuộc thứ tự / shared state | Fail khi chạy parallel hoặc đổi order | Mỗi test tự setup data riêng; chạy random order để lộ sớm |
| Phụ thuộc thời gian thật | Fail lúc nửa đêm, cuối tháng, DST | Inject clock |
| Port/file/resource đụng nhau | Fail khi chạy song song | Random port, temp dir riêng |
| Gọi service ngoài thật | Fail khi mạng/3rd-party chập chờn | Fake ở boundary; sandbox test tách riêng khỏi CI chính |
| Dữ liệu random không kiểm soát | Fail "thỉnh thoảng", khó tái hiện | Seed cố định, log seed khi fail |

Quy trình xử lý ở mức team:

1. **Quarantine ngay**: tách test flaky ra khỏi pipeline chặn merge (tag `@flaky`, chạy ở job riêng) — đừng để nó dạy cả team thói quen re-run.
2. **Ticket có deadline**: quarantine không phải nghĩa địa. Sau X ngày không sửa → xoá test (một test không ai tin còn tệ hơn không có).
3. **Đo đạc**: CI hiện đại (GitHub Actions + report tooling, Buildkite, Datadog CI Visibility) track flake rate per test — sửa từ test flaky nhất.
4. Tái hiện bằng cách chạy lặp: `pytest --count=100 -x`, `go test -count=100 -race`.

> ⚠️ Bẫy production: Bật "auto-retry failed tests 3 lần" ở CI như giải pháp lâu dài. Retry che giấu cả flaky test **lẫn race condition thật trong code production** — chính những bug chỉ xuất hiện dưới concurrency mà test flaky đang cố nói cho bạn biết.

## 8. Coverage là chỉ số phụ

Coverage đo "dòng code nào **được chạy qua** khi test" — không đo "hành vi nào **được kiểm tra**". Một test gọi hàm rồi không assert gì vẫn cho coverage 100%.

```python
def test_pricing():            # coverage: 100% hàm price()
    svc.price(make_order())    # assert: không có gì. Giá trị: 0.
```

Cách dùng coverage đúng:

- **Coverage thấp là tín hiệu xấu đáng tin; coverage cao KHÔNG phải tín hiệu tốt đáng tin.** 30% → chắc chắn có vùng tối. 95% → chưa nói lên điều gì về chất lượng assert.
- Dùng làm công cụ **thăm dò**: mở report, nhìn vùng đỏ — "module refund chưa test nhánh partial refund" — hữu ích. Dùng làm **KPI** ("mọi PR phải ≥80%") → Goodhart's law: developer viết test vô nghĩa để đạt số, codebase nhận về đống test brittleness.
- Nếu cần một con số gate, **diff coverage** (coverage của riêng code mới trong PR) hợp lý hơn coverage toàn repo.
- Chỉ số đo chất lượng test thật sự là **mutation testing** (PIT cho Java, `mutmut` cho Python, Stryker cho JS/TS): tool tự sửa code (`>` thành `>=`, xoá một dòng) rồi xem test có đỏ không. Test không giết được mutant = test không thực sự kiểm tra hành vi. Đắt về compute, nhưng chạy định kỳ trên module quan trọng rất đáng.

> 💡 Ghi nhớ: Hỏi "coverage bao nhiêu?" không bằng hỏi: "**nếu tôi cố tình làm sai logic tính tiền, có test nào đỏ không?**"

## 9. TDD — khi nào đáng?

TDD (red → green → refactor) không phải tôn giáo, là một công cụ có chỗ dùng:

**TDD toả sáng khi:**

- Logic thuần phức tạp, requirement rõ: pricing, phân quyền, state machine, parser, tính lãi suất. Test trước giúp thiết kế API của module từ góc nhìn người dùng nó.
- **Bug fix**: luôn viết test tái hiện bug (đỏ) trước khi sửa. Đây là dạng TDD ai cũng nên làm, không cần tranh cãi — nó đảm bảo bug không tái xuất.
- Code khó chạy thủ công (handler chạy sâu trong pipeline, edge case khó dựng bằng tay).

**TDD kém hiệu quả khi:**

- **Khám phá / chưa biết mình muốn gì**: prototype, thử nghiệm API design, glue code AWS mà bạn còn đang đọc doc. Viết test trước cho thứ sẽ vứt đi là lãng phí — spike trước, ổn định rồi mới phủ test.
- Code chủ yếu là wiring/config — giá trị nằm ở integration test, mà integration test thì vòng lặp TDD chậm.

Điều TDD thực sự mang lại không phải "nhiều test hơn" mà là **áp lực thiết kế**: code khó viết test trước thường là code coupling cao. Nếu team không làm TDD, vẫn giữ được lợi ích đó bằng kỷ luật "test cùng PR, không có chuyện 'sẽ bổ sung test sau'".

## 10. Chiến lược tổng thể cho một service điển hình

Ví dụ service `orders` (REST API + Postgres + gọi `payments` + bắn event SQS):

```text
├── unit (chạy < 10s, mỗi lần save file)
│     domain logic: tính giá, validate, state transition — object thật, fake clock
├── integration (chạy < 2 phút, mỗi PR)
│     repository + Postgres (testcontainers, đúng version prod)
│     API test: HTTP request thật vào app, DB thật, fake payments ở boundary
│     SQS publish/consume qua LocalStack, test idempotency
├── contract (mỗi PR)
│     consumer pact với payments; provider verification cho các consumer của orders
└── e2e/smoke (sau deploy lên staging, < 5 phút)
      3–5 happy path xuyên hệ thống thật + synthetic check chạy định kỳ ở prod
```

Nguyên tắc chốt: **mỗi loại bug có một tầng rẻ nhất để bắt nó** — logic sai bắt ở unit, SQL sai bắt ở integration, vỡ tương thích giữa service bắt ở contract, hỏng hạ tầng/config bắt ở smoke + observability. E2E không phải lưới an toàn vạn năng; observability và rollback nhanh mới là tuyến phòng thủ cuối.

Checklist nhanh khi review chiến lược test của một service:

- [ ] Test suite local chạy dưới 2 phút? (Nếu không, developer sẽ ngừng chạy nó)
- [ ] Refactor nội bộ không làm gãy test? (Nếu gãy → đang test implementation)
- [ ] Có integration test trên DB **đúng version production**?
- [ ] Consumer/provider có contract test hoặc schema check ở CI?
- [ ] Message handler có test idempotency (deliver 2 lần)?
- [ ] Flake rate được đo và có quy trình quarantine?
- [ ] Mỗi bug production gần đây có test tái hiện đi kèm bản fix?

## Liên hệ sang AWS

- **Lambda**: tách handler mỏng (parse event) khỏi logic thuần → logic test bằng unit thường. Chạy local bằng **SAM CLI**: `sam local invoke -e event.json` để chạy function trong container giống môi trường Lambda thật, `sam local start-api` để dựng API Gateway local. Fixture event lấy từ `sam local generate-event sqs receive-message`. Lưu ý: SAM local tốt cho debug vòng nhanh; CI vẫn nên test logic bằng unit + integration vì SAM local khởi động chậm.
- **LocalStack**: giả lập S3/SQS/SNS/DynamoDB/API Gateway... trong một container — SDK chỉ cần đổi `endpoint_url`. Repo này có **LocalStack labs** trong phần thực hành: dựng SQS + Lambda + DynamoDB local và chạy integration test đúng như mục 4 và 6 ở trên — làm lab đó trước khi áp vào dự án thật.
- **DynamoDB Local** là lựa chọn nhẹ hơn LocalStack nếu chỉ cần DynamoDB; chạy tốt trong testcontainers.
- **API Gateway**: contract giữa frontend/mobile và backend chính là OpenAPI spec — import spec vào API Gateway và validate request tại gateway; CI diff spec để bắt breaking change (cùng tinh thần consumer-driven contract).
- **EventBridge + Schema Registry**: EventBridge tự discover schema của event; dùng schema này như contract giữa producer và consumer trong kiến trúc event-driven.
- **SQS**: at-least-once delivery → test idempotency của consumer (mục 6) là bắt buộc; test cả đường đi vào **DLQ** (maxReceiveCount) bằng LocalStack.
- **RDS/Aurora**: integration test dùng image Postgres/MySQL **đúng major version** với RDS production; migration test trên testcontainers trước khi chạy trên RDS thật. Với Aurora, nhớ rằng một số hành vi (failover, reader endpoint lag) chỉ kiểm được bằng game day/chaos test trên môi trường thật chứ không phải test suite.
- **CodeBuild/CodePipeline hoặc GitHub Actions**: chạy testcontainers cần Docker — CodeBuild bật `privilegedMode: true`; tách stage `unit` (mỗi push) và `integration` (mỗi PR) để giữ vòng phản hồi nhanh.

> 💡 Ghi nhớ cuối: chiến lược test tốt nhất là chiến lược mà cả team **tin vào màu đỏ** — đỏ nghĩa là có bug thật, xanh nghĩa là deploy được. Mọi quyết định trong bài này (mock ở boundary, trị flaky, coverage là phụ) đều phục vụ một chữ: **niềm tin**.
