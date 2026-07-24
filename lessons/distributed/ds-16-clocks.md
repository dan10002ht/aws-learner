# Bài 16 — Đồng hồ vật lý, NTP & Lamport clock

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt **time-of-day (wall) clock** và **monotonic clock**, và biết **tuyệt đối không đo elapsed time bằng wall clock**.
- Giải thích **clock skew**, cách **NTP** đồng bộ đồng hồ và **giới hạn** của nó (không bao giờ chính xác tuyệt đối).
- Chỉ ra vì sao **dùng timestamp để order sự kiện là nguy hiểm** — đặc biệt là **Last-Write-Wins (LWW) làm mất write một cách âm thầm**.
- Hiểu **Lamport logical clock**: quan hệ **happens-before (→)**, quy tắc tăng bộ đếm, và tính chất `a → b ⟹ L(a) < L(b)`.
- Nắm **giới hạn cốt lõi** của Lamport clock: **không phát hiện được concurrent** (đó là lý do tồn tại của vector clock ở bài sau).

---

## 2. Lý thuyết

### 2.1 Analogy: hai loại "đồng hồ" trong đời

Hình dung bạn nấu ăn. Có hai câu hỏi rất khác nhau:
- *"Bây giờ là mấy giờ?"* → bạn nhìn **đồng hồ treo tường** (wall clock). Nó cho biết **thời điểm tuyệt đối** để hẹn với người khác ("8h tối gặp nhau").
- *"Luộc trứng đã bao lâu rồi?"* → bạn bấm **đồng hồ bấm giờ** (stopwatch). Nó chỉ đếm **khoảng thời gian trôi qua**, không quan tâm mấy giờ.

Điều nguy hiểm: đồng hồ treo tường thỉnh thoảng bị chỉnh lại (tự động theo giờ chuẩn, hoặc bạn vặn tay). Nếu bạn dùng nó để đo "trứng luộc bao lâu" mà đúng lúc đó nó bị vặn lùi 5 phút, bạn sẽ tính ra **khoảng âm** — trứng luộc "-2 phút". Vô lý. Trong máy tính, chính xác có hai đồng hồ tương ứng, và lẫn lộn chúng là một lớp bug kinh điển.

### 2.2 Wall clock vs Monotonic clock

| | **Time-of-day (wall) clock** | **Monotonic clock** |
|---|---|---|
| Trả về | "Bây giờ là lúc nào" — số giây tính từ epoch (1970-01-01 UTC) | Số đếm từ một mốc **tuỳ ý** (thường là lúc máy boot) |
| Đơn vị ý nghĩa | Thời điểm tuyệt đối, so được giữa các máy | Chỉ có nghĩa **hiệu hai lần đọc trên cùng một máy** |
| Có thể **nhảy lùi**? | **CÓ** — khi NTP chỉnh, khi leap second, khi admin sửa giờ | **KHÔNG** — luôn tăng, không bao giờ lùi |
| Bị NTP kéo nhanh/chậm? | Có (step hoặc slew) | Slew nhẹ có thể, nhưng không bao giờ lùi |
| API | `System.currentTimeMillis()`, `time.time()`, `clock_gettime(CLOCK_REALTIME)` | `System.nanoTime()`, `time.monotonic()`, `clock_gettime(CLOCK_MONOTONIC)` |
| Dùng để | Log, timestamp hiển thị, hẹn lịch, TTL theo giờ thật | **Đo elapsed**, timeout, đo hiệu năng, backoff |

**Quy tắc vàng:** *So sánh/hiển thị thời điểm* → wall clock. *Đo khoảng thời gian đã trôi qua* → monotonic clock. Không bao giờ trộn.

Vì sao đo elapsed bằng wall clock là bug? Xét đoạn đo timeout ngây thơ:

```java
// SAI: đo elapsed bằng wall clock
long start = System.currentTimeMillis();
doWork();
long elapsed = System.currentTimeMillis() - start;   // có thể ÂM!
if (elapsed > TIMEOUT_MS) { ... }
```

Nếu **giữa** hai lần đọc, NTP nhận ra máy đang chạy nhanh 3 giây và **step lùi** đồng hồ 3s, thì `elapsed` có thể ra **âm** hoặc bé bất thường → timeout không bao giờ kích hoạt, hoặc kích hoạt sai. Bản đúng:

```java
// ĐÚNG: đo elapsed bằng monotonic clock
long start = System.nanoTime();
doWork();
long elapsedMs = (System.nanoTime() - start) / 1_000_000;   // luôn >= 0
if (elapsedMs > TIMEOUT_MS) { ... }
```

`nanoTime()` không có ý nghĩa "mấy giờ" (giá trị tuyệt đối vô nghĩa, thậm chí âm), nhưng **hiệu** của nó luôn là khoảng thời gian thực đã trôi, không bị NTP làm nhảy lùi.

### 2.3 Clock skew: mỗi máy một đồng hồ, và chúng lệch nhau

Mỗi máy đo giờ bằng một **thạch anh dao động** (quartz crystal). Không có hai thạch anh nào dao động y hệt: nhiệt độ, tuổi linh kiện làm tần số lệch đi. Sai số điển hình khoảng **vài chục ppm** (parts per million).

- 50 ppm ≈ 50 µs lệch mỗi giây ≈ **4.3 giây lệch mỗi ngày** nếu không đồng bộ.

**Clock skew** = độ lệch tức thời giữa hai đồng hồ. **Clock drift** = tốc độ hai đồng hồ trôi xa nhau. Vì skew tồn tại, câu "sự kiện X ở máy A lúc 10:00:00.100 xảy ra *trước* sự kiện Y ở máy B lúc 10:00:00.150" là **không đáng tin** — có thể đồng hồ B đang chạy nhanh 80 ms so với A, và thực tế Y xảy ra *trước* X.

### 2.4 NTP: đồng bộ đồng hồ vật lý, và vì sao vẫn không đủ

**NTP (Network Time Protocol)** kéo wall clock của máy về gần một nguồn thời gian chuẩn (GPS, đồng hồ nguyên tử) qua nhiều tầng **stratum**. Client hỏi server, đo round-trip, ước lượng offset và chỉnh lại.

<svg viewBox="0 0 560 240" role="img" aria-labelledby="ntp-t ntp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="ntp-t">NTP ước lượng offset qua bốn dấu thời gian</title>
<desc id="ntp-d">Client gửi request lúc t1, server nhận t2 xử lý và gửi t3, client nhận t4; offset và delay tính từ bốn mốc này</desc>
<line x1="90" y1="30" x2="90" y2="215" stroke="currentColor" stroke-width="1.5"/>
<line x1="470" y1="30" x2="470" y2="215" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="20" text-anchor="middle" font-size="13" fill="currentColor">Client</text>
<text x="470" y="20" text-anchor="middle" font-size="13" fill="currentColor">NTP Server</text>
<line x1="90" y1="55" x2="470" y2="95" stroke="#3b82f6" stroke-width="1.8" marker-end="url(#na)"/>
<line x1="470" y1="120" x2="90" y2="175" stroke="#10b981" stroke-width="1.8" marker-end="url(#na)"/>
<circle cx="90" cy="55" r="4" fill="currentColor"/>
<text x="80" y="52" text-anchor="end" font-size="12" fill="currentColor">t1 (gửi)</text>
<circle cx="470" cy="95" r="4" fill="currentColor"/>
<text x="480" y="92" text-anchor="start" font-size="12" fill="currentColor">t2 (nhận)</text>
<circle cx="470" cy="120" r="4" fill="currentColor"/>
<text x="480" y="124" text-anchor="start" font-size="12" fill="currentColor">t3 (trả lời)</text>
<circle cx="90" cy="175" r="4" fill="currentColor"/>
<text x="80" y="179" text-anchor="end" font-size="12" fill="currentColor">t4 (nhận)</text>
<text x="280" y="205" text-anchor="middle" font-size="12" fill="currentColor">delay = (t4 - t1) - (t3 - t2)</text>
<text x="280" y="225" text-anchor="middle" font-size="12" fill="currentColor">offset = ((t2 - t1) + (t3 - t4)) / 2</text>
<defs><marker id="na" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

NTP tốt tới đâu? Trong LAN có thể đạt **dưới 1 ms**; qua Internet công cộng thường **10–100 ms**. Nhưng có ba giới hạn không bao giờ biến mất:

1. **Không thể chính xác tuyệt đối.** Offset được *ước lượng* từ round-trip, mà đường đi và đường về không đối xứng → luôn có sai số vài ms. Bạn không bao giờ có "cùng một cái đồng hồ" trên mọi máy.
2. **NTP có thể làm wall clock nhảy lùi.** Khi offset lớn, NTP **step** (nhảy tức thì) thay vì **slew** (kéo từ từ). Đây chính là lúc code đo elapsed bằng wall clock vỡ trận.
3. **Leap second & cấu hình sai.** Giây nhuận, server NTP hỏng, firewall chặn cổng 123 — đủ kiểu làm đồng hồ lệch hàng giây mà ứng dụng không hề hay.

Google giải quyết bằng **TrueTime** (Spanner): thay vì trả một mốc thời gian, nó trả một **khoảng** `[earliest, latest]` bảo đảm chứa thời gian thật, rồi *chờ hết độ bất định* (commit-wait) trước khi công bố commit. Tức là ngay cả Google cũng không giả vờ có clock chính xác tuyệt đối — họ **định lượng sai số và chờ nó qua**.

### 2.5 Nguy hiểm: dùng timestamp để order — LWW làm mất write

Cám dỗ lớn nhất: gắn `timestamp = now()` vào mỗi ghi, và khi có xung đột thì **"cái nào timestamp lớn hơn thắng"** — đó là **Last-Write-Wins (LWW)**, mặc định trong Cassandra và nhiều hệ. Nghe hợp lý, nhưng vì clock skew, nó **âm thầm nuốt mất dữ liệu**.

<svg viewBox="0 0 620 250" role="img" aria-labelledby="lww-t lww-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="lww-t">LWW mất write vì clock skew</title>
<desc id="lww-d">Client B ghi sau Client A về thời gian thực nhưng đồng hồ B chậm hơn nên timestamp nhỏ hơn, khiến bản ghi đúng của B bị loại bỏ</desc>
<rect x="20" y="20" width="180" height="70" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="45" text-anchor="middle" font-size="13" fill="currentColor">Client A (clock nhanh)</text>
<text x="110" y="68" text-anchor="middle" font-size="12" fill="currentColor">ghi x=1, ts=100</text>
<text x="110" y="84" text-anchor="middle" font-size="11" fill="currentColor">(thực tế: xảy ra TRƯỚC)</text>
<rect x="20" y="150" width="180" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="175" text-anchor="middle" font-size="13" fill="currentColor">Client B (clock chậm)</text>
<text x="110" y="198" text-anchor="middle" font-size="12" fill="currentColor">ghi x=2, ts=95</text>
<text x="110" y="214" text-anchor="middle" font-size="11" fill="currentColor">(thực tế: xảy ra SAU)</text>
<line x1="200" y1="55" x2="380" y2="110" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<line x1="200" y1="185" x2="380" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<rect x="385" y="90" width="150" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="460" y="115" text-anchor="middle" font-size="13" fill="currentColor">Server: LWW</text>
<text x="460" y="135" text-anchor="middle" font-size="12" fill="currentColor">giữ ts lớn nhất</text>
<line x1="535" y1="120" x2="600" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#la)"/>
<text x="575" y="160" text-anchor="middle" font-size="13" fill="#f43f5e">x = 1</text>
<text x="575" y="178" text-anchor="middle" font-size="11" fill="#f43f5e">x=2 MẤT</text>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Kịch bản: A ghi `x=1` rồi B ghi `x=2` **sau đó về thời gian thực** (B "thắng" đúng theo nhân quả). Nhưng đồng hồ B chậm hơn A 6 ms, nên timestamp của B (95) **nhỏ hơn** của A (100). LWW giữ ts lớn hơn → giữ `x=1`, **vứt bỏ `x=2`**. Không có lỗi, không có cảnh báo — chỉ là dữ liệu đúng biến mất. Đây là lý do:

- **Không dùng wall-clock timestamp làm cơ chế order khi tính đúng đắn phụ thuộc vào thứ tự.** Với đếm tăng dần (increment), LWW còn tệ hơn: hai increment đồng thời → mất một cái, số liệu sai vĩnh viễn.
- Muốn order đúng theo **nhân quả**, ta cần một loại đồng hồ **không dựa vào thời gian vật lý** — đó là **logical clock**.

### 2.6 Happens-before và Lamport clock

Leslie Lamport (1978) định nghĩa quan hệ **happens-before**, ký hiệu **`→`**, chỉ dựa trên **nhân quả có thể quan sát được**, không cần đồng hồ vật lý:

1. Nếu `a` và `b` cùng một process và `a` xảy ra trước `b` → `a → b`.
2. Nếu `a` là sự kiện **gửi** một message và `b` là sự kiện **nhận** chính message đó → `a → b`.
3. **Bắc cầu:** nếu `a → b` và `b → c` → `a → c`.

Nếu **không** có `a → b` và cũng không có `b → a`, ta nói `a` và `b` là **concurrent** (`a ∥ b`) — chúng không có quan hệ nhân quả, thứ tự giữa chúng là **không xác định được** và cũng không cần quan tâm.

**Lamport logical clock** gán cho mỗi sự kiện một số nguyên `L(e)` theo hai quy tắc, mỗi process giữ một bộ đếm `C`:

- **R1 (sự kiện nội bộ hoặc gửi):** trước khi thực hiện, tăng bộ đếm: `C = C + 1`. Message gửi đi mang theo giá trị `C` này (gọi là timestamp `t`).
- **R2 (nhận message có timestamp `t`):** `C = max(C, t) + 1` rồi mới xử lý.

Tính chất cốt lõi (clock condition): **`a → b ⟹ L(a) < L(b)`**. Nghĩa là nếu a *thực sự* xảy ra trước b theo nhân quả, thì số Lamport của a chắc chắn nhỏ hơn. Điều này cho ta một **total order** nhất quán với nhân quả (phá hoà bằng process id khi trùng số).

### 2.7 Ví dụ tính tay Lamport clock

Ba process P1, P2, P3. Mũi tên = message. Ta chạy quy tắc R1/R2:

```
P1: a(1) ──────► b(2) ─────────────► f(6)
                  │(gửi m1)              ▲
                  ▼                      │(gửi m3)
P2:          c(3) ── d(4) ─────────────►│
                       │(gửi m2)     e(?)
                       ▼
P3:               g(?) ── ...
```

Đi từng bước (bộ đếm mỗi process bắt đầu 0):

| Sự kiện | Process | Quy tắc | Tính | L |
|---|---|---|---|---|
| a | P1 | R1 | 0+1 | **1** |
| b = gửi m1 | P1 | R1 | 1+1 | **2** |
| c = nhận m1 (t=2) | P2 | R2 | max(0,2)+1 | **3** |
| d = gửi m2 | P2 | R1 | 3+1 | **4** |
| g = nhận m2 (t=4) | P3 | R2 | max(0,4)+1 | **5** |
| e = gửi m3 | P2 | R1 | 4+1 | **5** |
| f = nhận m3 (t=5) | P1 | R2 | max(2,5)+1 | **6** |

Kiểm chứng clock condition: `a → b → c → d`, và `L`: 1 < 2 < 3 < 4 ✓. Message `b → c`: L(b)=2 < L(c)=3 ✓. Nhân quả luôn giữ thứ tự tăng.

### 2.8 Giới hạn cốt lõi: Lamport KHÔNG phát hiện được concurrent

Đây là điểm quan trọng nhất phải nhớ. Clock condition chỉ đi **một chiều**:

> `a → b ⟹ L(a) < L(b)`  **ĐÚNG**
> `L(a) < L(b) ⟹ a → b`  **SAI** — chiều ngược lại không thành lập.

Nghĩa là: nhìn thấy `L(a) < L(b)`, bạn **không thể kết luận** a xảy ra trước b. Có thể a và b **concurrent** mà vẫn có số khác nhau. Trong ví dụ trên, sự kiện `e` ở P2 có L=5 và `g` ở P3 cũng có L=5 — nhưng cả hai đều **concurrent** với nhau (không message nào nối chúng theo nhân quả). Chúng chỉ tình cờ trùng/gần số.

<svg viewBox="0 0 600 180" role="img" aria-labelledby="cmp-t cmp-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="cmp-t">Lamport số nhỏ hơn không suy ra happens-before</title>
<desc id="cmp-d">Hai sự kiện có số Lamport khác nhau vẫn có thể là concurrent, nên chỉ nhìn số không phân biệt được nhân quả với đồng thời</desc>
<rect x="20" y="30" width="260" height="120" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="58" text-anchor="middle" font-size="13" fill="currentColor">Bảo đảm (một chiều)</text>
<text x="150" y="88" text-anchor="middle" font-size="13" fill="currentColor">a → b  ⟹  L(a) &lt; L(b)</text>
<text x="150" y="122" text-anchor="middle" font-size="11" fill="currentColor">Nhân quả luôn được phản ánh</text>
<rect x="320" y="30" width="260" height="120" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="58" text-anchor="middle" font-size="13" fill="currentColor">KHÔNG bảo đảm</text>
<text x="450" y="88" text-anchor="middle" font-size="13" fill="currentColor">L(a) &lt; L(b)  ⇏  a → b</text>
<text x="450" y="122" text-anchor="middle" font-size="11" fill="currentColor">Có thể a ∥ b (concurrent)</text>
</svg>

Hệ quả thực tế: **Lamport clock không thể dùng để phát hiện xung đột ghi đồng thời.** Nếu hai replica nhận hai write concurrent, chỉ nhìn số Lamport bạn không biết đó là "một cái ghi đè cái kia theo nhân quả" hay "hai cái độc lập cần merge/giữ cả hai". Để trả lời được câu *"hai sự kiện này concurrent hay có nhân quả?"* ta cần **vector clock** (bài sau) — nó cho cả hai chiều: `a → b ⟺ V(a) < V(b)`, và `không so được ⟺ concurrent`.

---

## 3. Ứng dụng & con số thực tế

- **Cassandra LWW:** mỗi cột có một timestamp (mặc định lấy từ wall clock client). Nếu client lệch giờ, write mới có thể bị write cũ ghi đè. Vận hành thực tế **bắt buộc chạy NTP trên mọi node/client** và vẫn phải chấp nhận rủi ro mất write khi skew — nên với dữ liệu đếm/tập hợp người ta dùng CRDT thay vì LWW.
- **Kafka:** message có hai loại timestamp — `CreateTime` (client wall clock) và `LogAppendTime` (broker wall clock). Retention theo thời gian dựa vào các timestamp này, nên **clock lệch làm log bị xoá sớm/muộn bất ngờ**. Thứ tự *trong một partition* thì dùng **offset** (một dạng số tăng đơn điệu, đáng tin), không dùng timestamp.
- **Đo p99 latency:** luôn dùng monotonic clock hai đầu *trên cùng một máy*; đo latency giữa hai máy bằng cách trừ wall clock của hai máy sẽ dính skew và có thể ra **âm**.
- **Token/TTL hết hạn (JWT `exp`):** dựa trên wall clock; nếu server lệch giờ vài phút, token hợp lệ bị từ chối hoặc token hết hạn vẫn được chấp nhận — vì vậy chuẩn cho phép một khoảng **leeway** vài chục giây.

---

## 4. Tóm tắt
- Có **hai đồng hồ**: **wall clock** (mấy giờ — có thể nhảy lùi) và **monotonic clock** (đếm elapsed — không bao giờ lùi). **Đo khoảng thời gian luôn dùng monotonic**; đo bằng wall clock có thể ra âm khi NTP step.
- **Clock skew** là bản chất (thạch anh lệch ~vài chục ppm); **NTP** kéo đồng hồ về gần chuẩn nhưng **không bao giờ chính xác tuyệt đối** (LAN <1 ms, Internet 10–100 ms) và có thể **làm wall clock nhảy lùi**.
- **Dùng timestamp để order là nguy hiểm**: **LWW âm thầm nuốt write** khi đồng hồ người ghi sau lại chậm hơn — dữ liệu đúng biến mất không cảnh báo.
- **Lamport logical clock** gán số theo **happens-before (→)**: R1 tăng khi làm việc/gửi, R2 `max(local, t)+1` khi nhận. Bảo đảm **`a → b ⟹ L(a) < L(b)`**, cho một total order nhất quán nhân quả.
- **Giới hạn:** chiều ngược **sai** — `L(a) < L(b)` **không** suy ra `a → b`; Lamport **không phát hiện được concurrent**. Muốn phân biệt nhân quả với đồng thời phải dùng **vector clock**.

> **Bài tiếp theo (Bài 17):** **Vector clock & causal consistency** — cấp cho mỗi sự kiện một vector đếm theo từng process để đạt `a → b ⟺ V(a) < V(b)`, nhờ đó **phát hiện chính xác concurrent** và làm nền cho conflict resolution (siblings, CRDT).
