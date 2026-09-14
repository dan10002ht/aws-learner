# Bài 10 — Những kẻ giết determinism

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **cơ chế khuếch đại** biến một sai lệch 100 ULP thành 255,72 đơn vị trên bản đồ 256 đơn vị, và nói được nó mất bao nhiêu giây.
- **Phân loại một thủ phạm vào đúng mức** nó phá: mức A cùng máy cùng binary, mức B cùng kiến trúc khác binary, hay mức C cross-platform — vì cách chữa ba mức khác nhau hoàn toàn.
- Nhìn một hàm Go và **chỉ ra mọi dòng phá determinism**, kể cả những dòng trông vô hại như `for k := range m` hay `select`.
- Giải thích vì sao `a*b + c` và `float64(a*b) + c` **là hai chương trình khác nhau trên ARM nhưng giống hệt nhau trên x86** — và đọc được bằng chứng disassembly.
- Chỉ ra **vì sao không có cái nào trong đám này báo lỗi**, và vì sao đó là lý do phải khoá bằng test ngay từ commit đầu tiên.
- Viết được **checklist cấm** cho hàm simulation của mình, và một test giữ cho checklist đó không bị phá.

---

## 2. Triệu chứng

Hai world giống hệt nhau. Cùng seed `42`, cùng 200 entity, cùng công thức tích phân, cùng `dt = 1/60 s`. Khác biệt duy nhất: world A cộng bốn nguồn lực tác dụng lên entity theo thứ tự `0,1,2,3`, world B cộng theo thứ tự `3,2,1,0`.

Bốn lực đó là `{9.8, -0.0001, 5000, -4999.9}` — trọng lực, một lực cản bé, một lực đẩy lớn và một lực gần như triệt tiêu nó. Cộng lại phải ra `9,8999`. Chạy thật, kiểu `float32`:

```
tổng lực xuôi  = 9.8999023438  bits=0x411e6600
tổng lực ngược = 9.8999977112  bits=0x411e6664
lệch mỗi tick  = 9,5367431640625e-05 đơn vị/giây²   (100 ULP)
```

Lệch ở **chữ số có nghĩa thứ 7**. Không NaN, không overflow, không warning. Cả hai đều là kết quả hợp lệ của cùng một phép cộng — chỉ khác thứ tự.

Cho hai world chạy song song, đo khoảng cách lớn nhất giữa một entity ở A và chính nó ở B. Đầu ra thật:

```
lệch lớn nhất vượt 0,0001 đơn vị ở tick     51  (0,85 s)
lệch lớn nhất vượt 0,001  đơn vị ở tick    175  (2,92 s)
lệch lớn nhất vượt 0,01   đơn vị ở tick    665  (11,08 s)
lệch lớn nhất vượt 0,1    đơn vị ở tick   1644  (27,40 s)
lệch lớn nhất vượt 1      đơn vị ở tick   1807  (30,12 s)
lệch lớn nhất vượt 10     đơn vị ở tick   3642  (60,70 s)
lệch lớn nhất vượt 100    đơn vị ở tick   9137  (152,28 s)
sau 36000 tick (600 s): lệch lớn nhất = 255,72 đơn vị / bản đồ 256
```

Đọc kỹ ba dòng giữa. Từ `0,01` lên `0,1` mất **979 tick**. Từ `0,1` lên `1` mất **163 tick** — nhanh gấp sáu lần, và đó không phải trùng hợp.

Dòng cuối mới là thứ đáng sợ: sau 10 phút, **255,72 trên bản đồ 256 đơn vị — 99,9% chiều rộng bản đồ**. Hai server không còn bất đồng về vị trí nữa; chúng đang mô phỏng hai trận đấu khác nhau. Và suốt 10 phút đó cả hai process đều khoẻ mạnh: tick đúng hạn, 0 allocs, log sạch, health check xanh.

---

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Đoạn Go dưới đây chạy trên đúng một máy, đúng một binary, không có goroutine, không có mạng, không có `math/rand`. Nó có tất định không?**

```go
totalDamage := 0.0
for _, dmg := range player.ActiveDebuffs {   // ActiveDebuffs là map[string]float64
    totalDamage += dmg
}
player.HP -= totalDamage
```

```
(a) Có. Cùng map, cùng giá trị, cùng máy thì cộng ra cùng kết quả.
(b) Có, trừ khi map bị sửa giữa chừng.
(c) Không, nhưng sai lệch nhỏ tới mức không bao giờ nhìn thấy.
(d) Không. Chạy cùng một binary hai lần cho ra hai giá trị HP khác nhau.
```

---

## 3. Lý thuyết

Bài 9 đã chia determinism thành ba mức, mỗi mức khó hơn mức trước:

```
MỨC A  cùng máy, cùng binary, chạy lại  -> replay tại chỗ, test hồi quy
MỨC B  cùng kiến trúc, khác binary      -> hai server trong cùng cluster, anti-cheat
MỨC C  cross-platform ARM vs x86        -> client/server khác nền tảng, lockstep, rollback
```

Bài này đi tìm thủ phạm, và sắp xếp chúng **theo mức chúng phá**. Thứ tự đó quan trọng: nếu bạn chưa bịt được nhóm phá mức A thì bịt nhóm mức C là vô nghĩa.

Nhưng trước hết phải trả lời câu hỏi mà mục 2 để lửng: vì sao 100 ULP thành 255 đơn vị.

### 3.1 Cơ chế khuếch đại — sai số không cộng, nó nhân rồi nhảy bậc

Hai chế độ khuếch đại nối tiếp nhau, khác nhau về bản chất.

**Chế độ 1 — tích phân cộng dồn.** Vòng lặp là `v += a·dt; p += v·dt`. Sai lệch `δa` trong gia tốc đi vào vận tốc mỗi tick, vận tốc lệch lại đi vào vị trí mỗi tick. Sau `t` giây, lệch vị trí xấp xỉ `½·δa·t²`. Kiểm bằng số của mục 2:

| Mốc | Thời gian | `½·δa·t²` dự đoán | Đo được |
|---|---|---|---|
| 0,0001 đơn vị | 0,85 s | 3,4e-05 | vượt ở 0,85 s |
| 0,001 | 2,92 s | 4,1e-04 | vượt ở 2,92 s |
| 0,01 | 11,08 s | 5,9e-03 | vượt ở 11,08 s |

Dự đoán thấp hơn đo được 2–3 lần vì `δa` còn được khuếch đại thêm mỗi lần entity nảy tường. Nhưng **bậc là đúng: bậc hai theo thời gian** — gấp đôi thời gian thì lệch gấp bốn, tức lệch tăng 10 lần thì thời gian chỉ cần tăng `√10 ≈ 3,16` lần. Từ `0,01` (11,08 s) lên `0,1` đáng ra mất ~35 s; đo được 27,40 s — đúng bậc đó.

**Chế độ 2 — nhánh rẽ.** Rồi tới `0,1 → 1`, và nó chỉ mất **163 tick**. Bậc hai không giải thích nổi con số đó.

Cái xảy ra: một entity đến sát tường ở đúng ranh giới. `if px[i] > W` là phép so sánh **nhị phân** — không có "gần đúng". World A cho `true` ở tick 1806, world B cho `false` và một tick sau mới nảy. Trong tick đó A đã quay đầu còn B vẫn đi tới. Lệch tức thì:

```
2 · |v| · dt = 2 · 120 · (1/60) = 4 đơn vị
```

Từ `0,1` lên `4` trong một tick. Sau đó hai entity có **vận tốc ngược dấu nhau**, lệch tăng tuyến tính rất nhanh, và mọi nhánh rẽ sau đó đều rơi vào cùng cái bẫy.

<svg viewBox="0 0 700 268" role="img" aria-labelledby="gs10-a-t gs10-a-d" style="width:100%;height:auto">
<title id="gs10-a-t">Thời gian để sai lệch 100 ULP đạt từng ngưỡng</title>
<desc id="gs10-a-d">Tám ngưỡng sai lệch, mỗi ngưỡng một thanh ngang dài tỉ lệ với thời gian đạt tới nó. Bốn ngưỡng nhỏ đầu đạt trong vòng 27 giây, ngưỡng 1 đơn vị đạt ở 30,12 giây chỉ sau ngưỡng 0,1 đúng 163 tick, còn ngưỡng cuối 255,72 đơn vị mất 600 giây.</desc>
<text x="20" y="22" font-size="11" font-weight="bold" fill="currentColor">Lệch ban đầu 100 ULP — thời gian để đạt từng ngưỡng (600 s = hết chiều ngang)</text>
<rect x="150" y="36" width="0.69" height="18" fill="#3b82f6" fill-opacity="0.55"/>
<text x="142" y="49" text-anchor="end" font-size="10" fill="currentColor">0,0001 đơn vị</text>
<text x="160" y="49" font-size="10" fill="currentColor" opacity="0.85">0,85 s</text>
<rect x="150" y="62" width="2.38" height="18" fill="#3b82f6" fill-opacity="0.55"/>
<text x="142" y="75" text-anchor="end" font-size="10" fill="currentColor">0,001</text>
<text x="160" y="75" font-size="10" fill="currentColor" opacity="0.85">2,92 s</text>
<rect x="150" y="88" width="9.05" height="18" fill="#3b82f6" fill-opacity="0.55"/>
<text x="142" y="101" text-anchor="end" font-size="10" fill="currentColor">0,01</text>
<text x="166" y="101" font-size="10" fill="currentColor" opacity="0.85">11,08 s</text>
<rect x="150" y="114" width="22.4" height="18" fill="#3b82f6" fill-opacity="0.55"/>
<text x="142" y="127" text-anchor="end" font-size="10" fill="currentColor">0,1</text>
<text x="180" y="127" font-size="10" fill="currentColor" opacity="0.85">27,40 s</text>
<rect x="150" y="140" width="24.6" height="18" fill="#ef4444" fill-opacity="0.65"/>
<text x="142" y="153" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">1</text>
<text x="182" y="153" font-size="10" font-weight="bold" fill="currentColor">30,12 s — chỉ 163 tick sau mốc trên: một nhánh rẽ vừa lật</text>
<rect x="150" y="166" width="49.6" height="18" fill="#f59e0b" fill-opacity="0.6"/>
<text x="142" y="179" text-anchor="end" font-size="10" fill="currentColor">10</text>
<text x="207" y="179" font-size="10" fill="currentColor" opacity="0.85">60,70 s</text>
<rect x="150" y="192" width="124.4" height="18" fill="#f59e0b" fill-opacity="0.6"/>
<text x="142" y="205" text-anchor="end" font-size="10" fill="currentColor">100</text>
<text x="282" y="205" font-size="10" fill="currentColor" opacity="0.85">152,28 s</text>
<rect x="150" y="218" width="490" height="18" fill="#8b5cf6" fill-opacity="0.5"/>
<text x="142" y="231" text-anchor="end" font-size="10" font-weight="bold" fill="currentColor">255,72</text>
<text x="395" y="231" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">600 s — 99,9% chiều rộng bản đồ</text>
<line x1="150" y1="248" x2="640" y2="248" stroke="currentColor" stroke-opacity="0.35"/>
<text x="150" y="261" font-size="9" fill="currentColor" opacity="0.7">0 s</text>
<text x="640" y="261" text-anchor="end" font-size="9" fill="currentColor" opacity="0.7">600 s</text>
</svg>

Rút ra một câu: **mọi `if` trong simulation là một bộ khuếch đại sai số hệ số vô hạn** — nhận vào chênh lệch nhỏ tuỳ ý, trả ra hai kết quả không liên quan gì nhau. Game đầy những `if` như thế: trúng hay trượt, có va chạm hay không, HP còn dương hay đã chết, vào tầm AI hay chưa, kích hoạt trigger hay chưa. Vì thế câu "sai số float nhỏ lắm, kệ đi" **sai không phải vì sai số to, mà vì simulation có nhánh rẽ.** Không tồn tại ngưỡng an toàn.

**Một câu về `float64`.** Chạy lại đúng thí nghiệm đó với `float64`: lệch ban đầu còn 12 ULP = `2,13e-14`, và sau **3.600.000 tick (16,7 giờ)** lệch lớn nhất mới đạt `6,5e-09` đơn vị — chưa lật nổi một nhánh rẽ nào. `float64` mua thêm ~7 bậc độ lớn dư địa, nhưng không đổi bản chất: thế giới đồ chơi này chỉ có một loại nhánh rẽ, game thật có hàng chục, mỗi loại là một cơ hội lật.

### 3.2 Nhóm 1 — phá ngay ở mức A: cùng máy, cùng binary vẫn hỏng

Phải bịt nhóm này trước, vì còn nó thì bạn không replay nổi trận của chính mình trên chính máy mình.

**Duyệt `map` của Go.** Đáp án hộp #1 là **(d)**. Một binary, chạy sáu lần liên tiếp, mỗi lần trừ đúng năm số `{1e16, 1.0, -1e16, 0.5, 2.0}` khỏi HP = 1000 qua `for k, v := range m`:

```
thứ tự=fire,ice,poison,bleed,arcane    hp=997.5000 bits=0x408f2c0000000000
thứ tự=poison,bleed,arcane,fire,ice    hp=997.0000 bits=0x408f280000000000
thứ tự=ice,poison,bleed,arcane,fire    hp=998.0000 bits=0x408f300000000000
thứ tự=fire,ice,poison,bleed,arcane    hp=997.5000 bits=0x408f2c0000000000
thứ tự=fire,ice,poison,bleed,arcane    hp=997.5000 bits=0x408f2c0000000000
thứ tự=bleed,arcane,fire,ice,poison    hp=996.0000 bits=0x408f200000000000
```

Chạy 20.000 lần trong một process cho **5 giá trị HP khác nhau**: 995,5 / 996,0 / 997,0 / 997,5 / 998,0. Biên độ 2,5 trên 1000 HP — **0,25%**. Chỉ cần một ngưỡng `if hp <= 0` là nó thành khác biệt giữa sống và chết.

Đây không phải bug của Go. Go **cố ý** ngẫu nhiên hoá điểm bắt đầu duyệt map, để lập trình viên không vô tình phụ thuộc vào một thứ tự không được bảo đảm. Quyết định đó cứu vô số bug ở backend và giết determinism ở game server.

Cơ chế bên dưới là triệt tiêu tai hoạ: `float64` chỉ có 53 bit mantissa, nên cộng `1e16` trước thì mọi số nhỏ đi sau **bị nuốt sạch**. Đổi thứ tự là đổi cái gì bị nuốt. Trong game thật, `1e16` là buff cộng dồn của một boss còn `0.5` là sát thương chảy máu.

**Khoá:** không duyệt map trong simulation. Entity nằm trong slice, index là ID. Buộc phải có map để lookup thì lúc duyệt rút key ra, `sort.Strings`, rồi duyệt slice đã sắp.

**`math/rand` toàn cục.** Cùng sáu lần chạy đó, `rand.Intn(100)` không seed:

```
61 98 57 | 31 92 41 | 90 22 48 | 64 24 77 | 9 93 10 | 60 27 55
```

Từ Go 1.20, generator toàn cục **tự seed ngẫu nhiên**; trước đó nó seed cố định bằng 1. Nghĩa là **nâng Go 1.19 → 1.20 làm hỏng determinism của một codebase đang chạy tốt, không đổi một dòng code, không một warning.** Ví dụ hoàn hảo cho mục 3.5.

**Khoá:** simulation không `import "math/rand"`. RNG thuộc về world, seed đi kèm trận đấu — mục 4.3 có code thật.

**`time.Now()` trong simulation.** Bài 5 đã chốt `dt` là hằng số, bài 7 đã tách đồng hồ ra khỏi vòng lặp. Hệ quả ở đây gắt hơn: `time.Now()` gọi bên trong `Step` phá determinism **tuyệt đối** — không lần chạy nào cho cùng giá trị. Kể cả thứ tưởng vô hại như "cooldown hết hạn chưa" nếu so bằng wall clock. **Khoá:** đơn vị thời gian duy nhất bên trong simulation là **số tick**; `time.Time` không được đi qua ranh giới vào `Step`.

**Goroutine ghi vào state theo thứ tự không xác định.** Tám goroutine, mỗi con cộng một số vào một biến chung, có mutex đàng hoàng — không data race, `-race` sạch. Chạy 200 lần:

```
200 lần cộng 8 số bằng 8 goroutine + mutex -> 2 kết quả khác nhau:
   2.5000000100  bits=0x40040000015798ee   166 lần
   2.5000000149  bits=0x4004000002000000    34 lần
```

Mutex bảo đảm **không hỏng bộ nhớ**, không bảo đảm **thứ tự**. Mà với float, thứ tự là kết quả. Đây là chỗ dễ mắc nhất cho dev backend: ta quen nghĩ "có khoá là an toàn", và ở backend thì đúng — vì backend cộng tiền bằng số nguyên hoặc decimal.

**Khoá:** simulation chạy **một goroutine duy nhất**. Muốn song song thì phải là map-reduce có thứ tự cố định: chia entity theo index thành K khối cố định, gộp theo thứ tự khối tăng dần — không bao giờ gộp theo thứ tự xong trước. Bài 28 và 38 nói kỹ.

**`select` nhiều case cùng sẵn sàng.** Spec Go nói rõ: nhiều case sẵn sàng thì chọn **ngẫu nhiên đều**. Đo 10.000 lần với cả hai case sẵn sàng:

```
a=4895  b=5105      (lần chạy khác: a=4936  b=5064)
```

Một vòng lặp kiểu `select { case in := <-inputCh: ...; case <-tickCh: ... }` sẽ xử lý input trước hay tick trước **theo tung đồng xu**.

**Khoá:** nhận tick trước, rồi hút cạn inbox bằng `for { select { case x := <-in: ...; default: break } }`, sắp input theo `(tick, playerID, seq)` rồi mới áp dụng. Thứ tự áp dụng phải là hàm của **dữ liệu**, không phải của lịch chạy.

**Mọi tập hợp không có thứ tự** đều cùng họ với map: `map[EntityID]struct{}` làm set, kết quả truy vấn không gian trả theo thứ tự chèn vào cell, danh sách va chạm gom từ nhiều goroutine. Quy tắc: trước khi lặp qua bất cứ tập hợp nào rồi cộng float hay áp dụng hiệu ứng, hỏi **"thứ tự này do ai quyết định?"**. Không phải "do dữ liệu" thì là bug.

---

## ⏸ Dừng lại — đoán trước #2

Bạn đã bịt hết nhóm 1: không map, không rand toàn cục, không `time.Now`, một goroutine, input sắp theo `(tick, playerID, seq)`. Simulation của bạn là một hàm thuần: cùng state + cùng input → cùng state mới. Test replay xanh cả tuần.

**Trong code sát thương, đồng nghiệp viết `dmg := crit*base + flat`. Bạn viết `dmg := float64(crit*base) + flat`. Cùng file, cùng compiler, cùng máy.**

```
(a) Hai cách viết hoàn toàn tương đương, khác nhau chỉ ở khẩu vị.
(b) Khác nhau về tốc độ, không khác về kết quả.
(c) Là HAI chương trình khác nhau: spec Go cho phép compiler gộp nhân và cộng
    thành một lệnh, và việc gộp đó ĐỔI kết quả làm tròn.
(d) Khác nhau, nhưng chỉ khi crit hoặc base là số âm.
```

---

### 3.3 Nhóm 2 — phá mức B: cùng kiến trúc, khác binary

Nhóm này vô hình với mọi test chạy trên một binary. Bạn chỉ gặp nó khi cluster có hai phiên bản, hoặc khi dev build local còn production build trong CI.

Đáp án hộp #2 là **(c)**, và spec Go viết thẳng ra: implementation **được phép** gộp nhiều phép tính float thành một lệnh có độ chính xác cao hơn, trừ khi lập trình viên ép làm tròn bằng một phép chuyển kiểu tường minh. Nghĩa là hai dòng dưới đây **không phải cùng một chương trình**:

```go
func natural(a, b, c float64) float64  { return a*b + c }
func explicit(a, b, c float64) float64 { return float64(a*b) + c }
```

Biên dịch bằng Go 1.26.5 trên `darwin/arm64`, rồi `go tool objdump` (kết quả y hệt với `-gcflags=all=-N`, tức đây **không** phải một pass tối ưu tuỳ chọn mà là cách sinh mã mặc định):

```
main.natural   main.go:9    FMADDD  F0, F2, F1, F0      <- MỘT lệnh, MỘT lần làm tròn
main.explicit  main.go:12   FMULD   F1, F0, F1
               main.go:12   FADDD   F2, F1, F0          <- HAI lệnh, HAI lần làm tròn
```

Và kết quả, với `a=0.91889215925276346`, `b=0.23150717404875204`, `c=0.24138756706529774`:

```
a*b + c          = 0.45411769410946085  bits=0x3fdd1043a92f0b53
float64(a*b) + c = 0.45411769410946079  bits=0x3fdd1043a92f0b52
lệch = 5,551115123125783e-17   (1 ULP)
```

Một ULP. Trên một triệu bộ `(a,b,c)` ngẫu nhiên trong `[0,1)`, **139.554 bộ cho kết quả khác nhau — 13,96%**. Cứ bảy phép `a*b+c` thì có một phép mà cách viết quyết định kết quả.

FMA (fused multiply-add) không phải lỗi — nó **chính xác hơn**: nhân ở độ chính xác vô hạn rồi mới làm tròn một lần. Nhưng determinism không cần chính xác hơn, nó cần **giống nhau**; đúng câu của bài 5, lặp lại ở tầng thấp hơn.

Chỗ nguy hiểm: **bạn không quyết định được compiler có gộp hay không.** Nó tuỳ compiler có nhận ra pattern, và tuỳ ISA đích có lệnh FMA. Cả hai đều đổi dưới chân bạn:

| Thủ phạm | Cơ chế | Có tín hiệu không |
|---|---|---|
| **Phiên bản compiler** | Go 1.x mở thêm một pattern được gộp, hoặc đổi thuật toán một hàm `math` | Không — và nó xảy ra khi bạn bump `go.mod` |
| **Compiler sắp xếp lại phép tính** | Gom hằng số, đổi kết hợp trong biểu thức bạn viết ra | Không, trừ khi đọc asm |
| **Thư viện bên thứ ba** | Một lib toán học đổi implementation giữa hai minor version | Không |
| **Kiến trúc đích** | arm64 có FMA nên gộp, amd64 baseline không có nên không gộp — mục 3.4 | Không |

**Khoá nhóm 2** — ba việc kỷ luật và một việc cho tín hiệu:

- Ép làm tròn ở mọi biểu thức trong simulation: `float64(a*b) + c`. Xấu, nhưng đó là cách duy nhất spec Go cho bạn để nói "đừng gộp".
- Pin phiên bản Go trong `go.mod` **và** trong image CI. Bump Go là thay đổi có rủi ro determinism, không phải một dòng Dependabot.
- Một binary cho toàn cluster. Không build lại trên từng node.
- **Checksum vàng trong CI**: hash toàn bộ state sau N tick, so với giá trị đã chốt. Đổi toolchain mà checksum đổi thì CI đỏ.

Ba gạch đầu chỉ **giảm** xác suất — bạn không kiểm soát được mọi quyết định sinh mã. Chỉ gạch cuối cho bạn biết mình đã vỡ.

---

## ⏸ Dừng lại — đoán trước #3

Bạn đã bịt nhóm 1 và nhóm 2: một binary duy nhất, Go pin cứng, mọi biểu thức float đều ép làm tròn tường minh. Bây giờ client chơi trên MacBook M3 (`arm64`), server chạy trên EC2 Intel (`amd64`). Lockstep, cả hai chạy đúng cùng một file `sim.go`.

**Hai bên có ra cùng một world không?**

```
(a) Có. IEEE-754 là chuẩn, cùng chuẩn thì cùng kết quả.
(b) Có cho +, -, *, /, sqrt — nhưng KHÔNG cho sin, cos, exp, pow.
(c) Không cho bất cứ phép nào, IEEE-754 chỉ là gợi ý.
(d) Có, nếu cả hai đều dùng float64 thay vì float32.
```

---

### 3.4 Nhóm 3 — phá mức C: ARM và x86 không đồng ý với nhau

Đáp án là **(b)**, và ranh giới đó sắc hơn bạn tưởng.

**Quay lại FMA trước.** Cũng file `main.go` đó, cũng Go 1.26.5, chỉ đổi `GOARCH`:

```
GOARCH=arm64 :  main.natural  FMADDD F0, F2, F1, F0        <- 1 lệnh, 1 lần làm tròn
GOARCH=amd64 :  main.natural  MULSD  X1, X0
                              ADDSD  X2, X0                 <- 2 lệnh, 2 lần làm tròn
```

Cùng dòng nguồn `return a*b + c`. Một máy Apple Silicon và một EC2 Intel chạy **cùng một file Go** bất đồng ở **13,96%** số phép nhân-cộng — không phải vì ai sai, mà vì baseline SSE2 của amd64 không có lệnh FMA nên compiler không có gì để gộp. Nhóm 3 ở dạng thuần khiết nhất: không bug, không lựa chọn sai, chỉ có hai ISA.

**Phần IEEE-754 bảo đảm.** Chuẩn bắt buộc năm phép `+`, `-`, `*`, `/`, `sqrt` **làm tròn đúng**: lấy giá trị toán học chính xác rồi làm tròn một lần về float gần nhất. Chỉ một đáp án đúng, nên mọi phần cứng tuân chuẩn phải trả cùng bit pattern. Kiểm bằng code — 200.000 giá trị ngẫu nhiên, so `math.Sqrt` với sqrt tính ở 200 bit bằng `math/big`:

```
Sqrt: 0/200000 giá trị lệch so với làm tròn đúng
Sqrt(2)   = 1.4142135623730951  bits=0x3ff6a09e667f3bcd
Sqrt(0.5) = 0.70710678118654757 bits=0x3fe6a09e667f3bcd
```

`math.Sqrt` an toàn cross-platform: nó biên dịch thành một lệnh phần cứng (`FSQRTD` trên arm64, `SQRTSD` trên amd64), và cả hai bị chuẩn ràng buộc phải ra cùng một bit.

**Phần IEEE-754 không bảo đảm.** `sin`, `cos`, `tan`, `exp`, `log`, `pow`, `atan2` — toàn bộ họ hàm siêu việt — **không có yêu cầu làm tròn đúng nào cả**. Lý do là bài toán của người làm bảng (table maker's dilemma): để bảo đảm làm tròn đúng cho `sin` có thể phải tính tới độ chính xác tuỳ ý, không có chặn trên. Nên mọi thư viện toán đều chọn một xấp xỉ "đủ tốt", mỗi thư viện một kiểu. Hệ quả đo được ngay trong một process:

```
sin²(x) + cos²(x) != 1          ở  79.111/200.000 giá trị  (39,56%)
sin(x) != 2·sin(x/2)·cos(x/2)   ở  88.126/200.000 giá trị  (44,06%)
```

Hai đồng nhất thức đúng tuyệt đối trong toán học, sai ở 4 trên 10 giá trị `float64`. Đó là thước đo việc `math.Sin` **không** trả về giá trị làm tròn đúng — nó trả về một xấp xỉ, và xấp xỉ là thứ mỗi implementation tự chọn.

Go có lợi thế: `math.Sin` là Go thuần, cùng một file nguồn cho mọi kiến trúc, nên `math.Sin(1)` cho `0x3feaed548f090cee` trên cả arm64 lẫn amd64. Nhưng lợi thế đó mỏng — vài hàm `math` có bản assembly riêng cho một số kiến trúc và danh sách đó đổi giữa các phiên bản Go; còn client Unity/Unreal/JS thì gọi xuống libm của nền tảng (glibc, Apple libm, MSVCRT — ba cái không đồng ý với nhau ở bit cuối, và ngay cả hai phiên bản glibc cũng đã từng đổi kết quả `pow`). Nghĩa là `math.Sin` an toàn giữa hai server Go **của bạn**, không an toàn giữa server Go và client Unity của bạn. Lockstep và rollback (bài 22) cần đúng cái thứ hai.

**x87 80-bit — di sản còn cắn.** CPU x86 đời cũ tính float trên thanh ghi 80 bit rồi mới hạ xuống 64: giá trị trung gian còn trong thanh ghi thì giữ 80 bit, bị đẩy ra bộ nhớ thì còn 64 — **kết quả phụ thuộc vào việc trình phân bổ thanh ghi có đủ thanh ghi hay không**. Sửa một dòng ở chỗ khác trong hàm, kết quả đổi. Go không sinh mã x87 (baseline amd64 của Go là SSE2), nhưng bạn gặp ngay nếu đối tác là client C++ build cho Win32 với `/arch:IA32`. Đây là lý do lịch sử khiến dân RTS lockstep sợ float tới mức đó.

**Denormal.** Số dưới chuẩn là vùng sát 0 mà float còn biểu diễn được với độ chính xác giảm dần:

```
denormal nhỏ nhất = 5e-324   bits=0x0000000000000001
tiny/2 = 0
```

Xử lý denormal chậm hơn nhiều lần trên một số CPU, nên phần cứng có chế độ **flush-to-zero**: coi mọi denormal là 0. Bật hay không tuỳ cờ điều khiển FPU mà runtime, driver hay một thư viện nào đó đã set — mặc định khác nhau giữa ARM và x86. Hai máy, một trả `5e-324`, một trả `0`, và đúng một phép `if v != 0` là lật nhánh. Trong game, denormal xuất hiện tự nhiên ở vận tốc còn sót sau ma sát và ở mọi thứ phân rã theo hàm mũ.

**Khoá nhóm 3 — và giới hạn của nó:**

| Việc | Được gì | Không được gì |
|---|---|---|
| Chỉ dùng `+ - * /` và `sqrt`, ép làm tròn tường minh | Mức C cho phần số học cơ bản | Không giúp gì nếu cần góc, xoay, khoảng cách chuẩn hoá |
| Tự viết `sin`/`cos`/`sqrt` bằng bảng tra + nội suy tuyến tính | Kết quả giống bit trên mọi nền tảng | Kém chính xác hơn libm; phải tự chọn kích thước bảng |
| Kẹp denormal về 0 tường minh: `if math.Abs(v) < 1e-30 { v = 0 }` | Loại bỏ vùng phụ thuộc FTZ | Thêm một nhánh rẽ — phải cùng ngưỡng ở cả hai bên |
| Bỏ float, dùng số nguyên | Mức C tuyệt đối | Phải viết lại toàn bộ toán học của game |

Ba dòng đầu là kỷ luật, và kỷ luật thì có người phá. Dòng cuối là dứt điểm, và đó là bài 11.

### 3.5 Tính im lặng — vì sao đây là loại bug tệ nhất

Xâu lại 3.2 → 3.4 bằng một quan sát: **không thủ phạm nào trong bài này tạo ra một tín hiệu lỗi.**

- Duyệt map: không lỗi. Cộng float sai thứ tự: không lỗi. Mutex bảo vệ đúng, `go vet` sạch, `-race` sạch: vẫn không tất định.
- Unit test xanh — vì unit test chạy **một lần, trên một binary, trên một máy**, tức chỉ chạm tới mức A, và còn không chạm hết.
- Không `panic`, không NaN, không giá trị vô lý để một assert bắt được. `997.5` và `996.0` đều là máu hợp lệ.

So với một bug bình thường:

```
bug thường     : hỏng -> có tín hiệu (panic/500/log) -> tìm -> sửa
bug determinism: hỏng -> KHÔNG có tín hiệu -> hai tuần sau người chơi báo
                 "tôi thấy nó chết mà nó vẫn bắn" -> không reproduce được
                 (vì reproduce cần đúng cặp binary + đúng thứ tự map của hôm đó)
```

Hai đặc tính nữa làm nó tệ hơn.

**Nó tích luỹ.** Lệch tăng bậc hai rồi nhảy bậc, nên bug đã vào từ tick 51 mà chỉ nhìn thấy ở tick 1807 — **cách nhau 29 giây**. Mọi bản năng debug "xem cái gì vừa xảy ra ngay trước lúc hỏng" đều dẫn sai chỗ.

**Nó không vá dần được.** Determinism là thuộc tính của **toàn bộ** đường đi của dữ liệu. Một vòng `range` trên map ở một dòng trong 50.000 dòng là đủ để mọi công sức còn lại thành vô nghĩa. Không có "tất định 99%".

Vì thế phần còn lại của bài không nói về cách sửa mà nói về cách **khoá**: một test đỏ được, đặt vào CI từ commit đầu tiên, để cái hỏng phát tín hiệu trong vài giây thay vì hai tuần.

---

## 4. Khoá lại — bảng phân loại và test thật

### 4.1 Thủ phạm nào phá mức nào

<svg viewBox="0 0 700 230" role="img" aria-labelledby="gs10-b-t gs10-b-d" style="width:100%;height:auto">
<title id="gs10-b-t">Ba nhóm thủ phạm và ba mức determinism chúng phá</title>
<desc id="gs10-b-d">Nhóm một gồm map order, rand toàn cục, đồng hồ, goroutine và select phá cả ba mức. Nhóm hai gồm việc gộp nhân-cộng, sắp xếp lại phép tính và phiên bản compiler phá mức B và C nhưng không phá mức A. Nhóm ba gồm hàm siêu việt, x87 và denormal chỉ phá mức C.</desc>
<text x="500" y="24" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">ô tô đậm = mức này VỠ</text>
<text x="470" y="42" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">A</text>
<text x="545" y="42" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">B</text>
<text x="620" y="42" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">C</text>
<rect x="20" y="52" width="410" height="48" rx="6" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="34" y="72" font-size="11" font-weight="bold" fill="currentColor">Nhóm 1 — phi tất định lộ thiên</text>
<text x="34" y="90" font-size="10" fill="currentColor" opacity="0.85">map order · rand toàn cục · time.Now · goroutine · select</text>
<rect x="450" y="60" width="40" height="32" rx="4" fill="#ef4444" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="525" y="60" width="40" height="32" rx="4" fill="#ef4444" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="600" y="60" width="40" height="32" rx="4" fill="#ef4444" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="20" y="112" width="410" height="48" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="34" y="132" font-size="11" font-weight="bold" fill="currentColor">Nhóm 2 — biên dịch</text>
<text x="34" y="150" font-size="10" fill="currentColor" opacity="0.85">gộp nhân-cộng (FMA) · sắp xếp lại phép tính · phiên bản Go · lib toán</text>
<rect x="450" y="120" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
<rect x="525" y="120" width="40" height="32" rx="4" fill="#f59e0b" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="600" y="120" width="40" height="32" rx="4" fill="#f59e0b" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
<rect x="20" y="172" width="410" height="48" rx="6" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="34" y="192" font-size="11" font-weight="bold" fill="currentColor">Nhóm 3 — kiến trúc</text>
<text x="34" y="210" font-size="10" fill="currentColor" opacity="0.85">sin/cos/exp/pow · x87 80-bit · denormal / flush-to-zero</text>
<rect x="450" y="180" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
<rect x="525" y="180" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
<rect x="600" y="180" width="40" height="32" rx="4" fill="#8b5cf6" fill-opacity="0.7" stroke="currentColor" stroke-opacity="0.3"/>
</svg>

Bảng này quyết định **thứ tự làm việc**, và đó là thứ tự duy nhất đúng:

| Bước | Bịt nhóm | Đạt mức | Chi phí | Test nào bắt được |
|---|---|---|---|---|
| 1 | Nhóm 1 | A | Vài quy tắc code, gần như 0 hiệu năng | Chạy hai world cùng seed trong một process |
| 2 | Nhóm 2 | B | Code xấu hơn, pin toolchain | Checksum vàng trong CI, đổi Go thì đỏ |
| 3 | Nhóm 3 | C | Viết lại toán học — bài 11 | Test đối chiếu chạy trên hai runner arm64/amd64 |

Làm ngược thứ tự là lãng phí: fixed-point cho một simulation vẫn đang duyệt map thì vẫn phi tất định, và bạn mất ba tuần mới phát hiện ra.

### 4.2 Test mức A: hai world, một process

Test thật trong `internal/sim/world_test.go`, nhỏ tới mức dễ bị coi thường:

```go
const dt = time.Second / 60

// Cùng seed, cùng chuỗi step -> cùng state. Đây là điều kiện cần để về sau
// có thể replay một trận đấu hoặc rollback về một tick cũ.
func TestStepIsDeterministic(t *testing.T) {
	a := NewWorld(500, 1024, 1024, 42)
	b := NewWorld(500, 1024, 1024, 42)

	for range 600 {
		a.Step(dt)
		b.Step(dt)
	}

	for i := range a.px {
		if a.px[i] != b.px[i] || a.py[i] != b.py[i] {
			t.Fatalf("entity %d lệch: (%v,%v) vs (%v,%v)", i, a.px[i], a.py[i], b.px[i], b.py[i])
		}
	}
}
```

Bốn quyết định trong 15 dòng, mỗi cái đáng một câu:

1. **So bằng `!=` chứ không bằng epsilon.** Ở mọi chỗ khác trong đời, so float bằng `==` là sai. Ở đây nó đúng cái ta cần: **giống bit**. Cho phép sai lệch `1e-9` là cho phép đúng cái mầm mà mục 3.1 đã chứng minh sẽ nở thành 255 đơn vị.
2. **600 step, không phải 1.** Một step không đủ để sai lệch thoát khỏi ULP. 600 step = 10 giây mô phỏng, đủ để mọi entity nảy tường vài lần — tức đã đi qua nhánh rẽ.
3. **Hai world chạy xen kẽ trong cùng một process.** Nghe thừa, nhưng đó chính là thứ bắt nhóm 1: nếu `Step` duyệt map hay gọi `rand` toàn cục, hai world nhận hai thứ tự khác nhau và test đỏ ngay.
4. **500 entity chứ không phải 5.** Nhiều entity thì nhiều nhánh rẽ trong 600 tick.

Test này **không** bắt được nhóm 2 và nhóm 3 — nó chạy một binary trên một máy. Đó là giới hạn, và phải nói ra: nó khoá mức A, không hơn.

### 4.3 Nguồn ngẫu nhiên làm đúng cách

Game bắt buộc phải có ngẫu nhiên: crit, loot, spread đạn, AI. Không được bỏ, chỉ được **làm cho tất định**. Cách `NewWorld` làm:

```go
// NewWorld sinh entity bằng LCG với seed cố định: cùng seed cho ra cùng world.
// Determinism không quan trọng lúc này, nhưng replay và rollback về sau thì có,
// và thói quen tránh math/rand toàn cục nên tập từ đầu.
func NewWorld(n int, w, h float32, seed uint64) *World {
	...
	s := seed
	next := func() float32 {
		s = s*6364136223846793005 + 1442695040888963407
		return float32(s>>40) / float32(1<<24) // [0,1)
	}
	...
}
```

Bốn quyết định, không cái nào là ngẫu nhiên:

**Seed là tham số.** Nó thuộc về world, nên nó đi vào replay file, vào snapshot, vào bug report. Dựng lại đúng trận của người chơi chỉ cần seed + chuỗi input.

**Không `import "math/rand"`.** Tránh trọn vẹn chuyện Go 1.20 đổi hành vi seed ở mục 3.2. Ba dòng LCG này cho cùng kết quả trên Go 1.18 lẫn Go 1.26, trên arm64 lẫn amd64.

**Toàn số nguyên `uint64`.** `s = s*A + C` tràn theo modulo 2⁶⁴, và **Go định nghĩa tràn số nguyên không dấu là wrap-around, giống hệt trên mọi kiến trúc**. Không làm tròn, không FMA, không chỗ cho compiler chọn khác. Nhóm 2 và nhóm 3 bị loại ngay từ lựa chọn kiểu dữ liệu.

**`s>>40` lấy bit CAO, chia cho `1<<24`.** Bit thấp của LCG có chu kỳ ngắn thảm hại — bit 0 lặp với chu kỳ 2. Dịch 40 bit lấy đúng 24 bit cao, bằng số bit mantissa của `float32`; chia cho `1<<24` (không phải `1<<24 - 1`) cho khoảng nửa mở `[0, 1)`, để `int(r*len(arr))` không bao giờ ra ngoài biên.

LCG này đủ cho việc sinh world ban đầu. Với ngẫu nhiên trong gameplay (crit, loot) thì mỗi hệ thống cần **stream riêng**, seed dẫn xuất từ seed gốc — lý do nằm ở bài 22: rollback 7 frame phải khôi phục chính xác con trỏ RNG, và nếu mọi hệ thống dùng chung một con trỏ thì một hệ thống rút thêm một số là lệch toàn bộ phần còn lại.

### 4.4 Checklist: cấm tuyệt đối trong hàm simulation

Dán lên đầu `sim.go`. Mỗi dòng ứng với một mục đã chứng minh ở trên.

```
CẤM — phá mức A, cùng máy cũng hỏng:
  [ ] for k := range m            -> slice theo index, hoặc sort key trước khi duyệt
  [ ] rand.Xxx()  (toàn cục)      -> RNG của world, seed là tham số
  [ ] time.Now(), time.Since()    -> đếm bằng số tick
  [ ] go func()  ghi vào state    -> simulation một goroutine; song song thì gộp theo index
  [ ] select  nhiều case sẵn sàng -> nhận tick, hút cạn inbox, sắp theo (tick, playerID, seq)
  [ ] map/set làm nguồn thứ tự    -> mọi thứ tự phải là hàm của dữ liệu
  [ ] con trỏ / địa chỉ làm khoá  -> ASLR đổi mỗi lần chạy; dùng ID số
  [ ] đọc file, env, hostname     -> cấu hình chốt vào state lúc tạo world

CẤM — phá mức B, khác binary là hỏng:
  [ ] a*b + c  không ép làm tròn  -> float64(a*b) + c
  [ ] bump Go / lib toán không test-> pin toolchain, checksum vàng trong CI
  [ ] hai build khác nhau cùng trận-> một binary cho cả cluster

CẤM — phá mức C, ARM khác x86:
  [ ] math.Sin/Cos/Exp/Pow/Atan2  -> bảng tra tự viết (bài 11)
  [ ] để lọt denormal             -> kẹp về 0 với cùng một ngưỡng ở mọi nền tảng
  [ ] tin rằng "IEEE-754 nên giống"-> chỉ + - * / sqrt được bảo đảm

CHO PHÉP, đã kiểm chứng:
  [x] + - * / và math.Sqrt        -> IEEE-754 bắt buộc làm tròn đúng
  [x] số nguyên, kể cả tràn uint  -> Go định nghĩa wrap-around, giống mọi kiến trúc
  [x] dịch bit, and/or/xor        -> không có làm tròn thì không có chỗ để lệch
```

Không dòng nào trong cột trái bị `go vet`, `golangci-lint` mặc định hay `-race` bắt. Nhưng vài dòng đầu bắt được bằng một `grep` trong CI trên thư mục `internal/sim`:

```
grep -rn 'range .*map\|math/rand\|time\.Now\|go func' internal/sim/ && exit 1
```

Thô và nhiều false positive, nhưng nó đỏ trong 200 ms và nó chặn đúng nhóm thủ phạm đắt nhất.

---

## 5. Tính tay

**Bài 1.** Dùng chính bộ số ở mục 2: `δa = 9,5367e-05` đơn vị/giây², xấp xỉ lệch vị trí `½·δa·t²`.
- Sau bao nhiêu giây thì lệch đạt `0,05` đơn vị (nửa bề rộng một nhân vật)? So với mốc đo thật gần nhất trong bảng, con số của bạn lệch bao nhiêu lần, và vì sao công thức lại **thấp hơn** thực tế?
- Nếu tick rate tăng từ 60 lên 120 Hz, `δa` không đổi. Thời gian tới `0,05` đơn vị có đổi không? Số **tick** tới lúc đó có đổi không?
- Bản đồ rộng 256 đơn vị. Theo công thức bậc hai (bỏ qua nhánh rẽ), bao lâu thì lệch đạt 256? So với 600 s đo được — chênh lệch đó nói gì về đóng góp của nhánh rẽ?

**Bài 2.** Một trận 10 người, mỗi tick server duyệt `map[PlayerID]*Player` để áp dụng debuff. Sim 60 Hz.
- Với 10 khoá, Go chọn ngẫu nhiên điểm bắt đầu duyệt. Xác suất hai lần chạy liên tiếp cho cùng thứ tự là bao nhiêu (chỉ tính xoay vòng)?
- Một trận 20 phút có bao nhiêu tick? Nếu mỗi tick có xác suất như trên để "trùng thứ tự với lần replay", thì xác suất replay đúng trọn trận là bao nhiêu? Dùng máy tính và nói xem kết quả thuộc bậc độ lớn nào.
- Câu hỏi thật: con số đó có thay đổi quyết định của bạn so với xác suất `1/2` không, và vì sao?

**Bài 3.** Bạn phải chọn giữa hai phương án cho một game MOBA, client Unity (C#) trên PC và mobile, server Go trên Linux amd64.
- Phương án A: server authoritative đầy đủ, client chỉ dự đoán chuyển động của chính mình. Nó cần mức determinism nào trong ba mức?
- Phương án B: lockstep, client và server chạy cùng simulation, chỉ trao đổi input. Cần mức nào?
- `math.Sin` của Go là Go thuần, `Math.Sin` của .NET gọi xuống libm nền tảng. Điều đó loại phương án nào, và nếu vẫn muốn phương án đó thì phải trả giá gì — tính theo "phải viết lại bao nhiêu phần của codebase".

---

## 6. Chuyển giao

**Bạn tiếp quản một game bắn súng chiến thuật đang chạy production.** Server Go 60 Hz trên EC2 `c6g` (Graviton, arm64). Có tính năng replay: client tải file `.rep` chứa seed + toàn bộ input rồi chạy lại trận đấu. Client là Unity, chạy trên Windows x86-64 và Android arm64.

Bug đang mở: **replay chạy đúng khoảng 3–5 phút đầu, sau đó "trôi" — người chơi trong replay bắn vào chỗ trống, rồi tới phút thứ 8 thì kết quả trận đấu trong replay khác hẳn kết quả thật.** Không có lỗi, không có crash. Bug xuất hiện với khoảng 60% số replay; 40% còn lại chạy đúng tới cuối.

1. "3–5 phút rồi trôi, phút thứ 8 khác hẳn" khớp với chế độ khuếch đại nào ở mục 3.1, và nó nói gì về việc sai lệch gốc **lớn cỡ nào**?
2. Một đồng nghiệp nói: "replay chạy trên máy người chơi còn trận thật chạy trên server, chắc do ARM vs x86". Lập luận đó giải thích được gì và **không** giải thích được gì, khi biết 40% replay chạy đúng?
3. Bạn có checksum state mỗi 60 tick của trận thật. Tìm tick lệch đầu tiên bằng cách nào, và vì sao **không** được dùng cách "chạy replay rồi so ở phút thứ 8"?
4. Giả sử tìm ra tick lệch đầu tiên là tick 4.412 và thủ phạm là một vòng `for _, e := range visibleEnemies` trong đó `visibleEnemies` được gom bởi truy vấn không gian. Vì sao lỗi này chỉ xuất hiện ở 60% replay chứ không phải 100%?
5. Test ở mục 4.2 **đã xanh từ trước tới giờ** mà không bắt được bug này. Nó thiếu cái gì, và bạn thêm điều kiện nào để nó đỏ?
6. Đội đề xuất một cách rẻ: "thay vì đuổi theo bit, cứ 5 giây server gửi một snapshot full-state cho client replay, replay nhận và ghi đè state. Trôi bao nhiêu thì cũng bị kéo về." Tính thử: với 60 entity × 12 byte, file replay 20 phút phồng lên bao nhiêu MB? Và quan trọng hơn — cách này sửa được replay, nhưng nó **không** dùng được cho ba ứng dụng còn lại của determinism ở bài 9. Vì sao?
7. **Câu khó nhất:** bạn quyết định đi tới mức C thật sự. Nhưng game đã có 2 năm gameplay code, trong đó có một hệ thống đường đạn dùng `math.Atan2` và `math.Sin` để tính độ nảy khi đạn chạm mặt nghiêng. Bạn thay chúng bằng bảng tra 4096 phần tử. Bảng tra làm góc bị **lượng tử hoá** — hai hướng bắn lệch nhau dưới `360/4096 = 0,0879` độ giờ cho ra **cùng một** hướng nảy. Câu hỏi: việc đó **có phải** là mất determinism không? Nếu không, thì nó là mất cái gì, và bạn dùng tiêu chí nào để quyết định 4096 là đủ hay phải lên 65536 — biết rằng bạn không thể đo "người chơi có thấy khác không" trước khi ship?

Câu 7 là nơi hai thứ đối đầu nhau trực tiếp: **tất định** và **chính xác**. Bài 5 đã nói giống nhau quan trọng hơn chính xác; câu 7 hỏi giống nhau có giới hạn ở đâu.

---

## 7. Tóm tắt

- Sai lệch **100 ULP** trong một tổng lực `float32` thành **255,72 đơn vị trên bản đồ 256 — 99,9% chiều rộng** sau 600 giây. Không lỗi, không log, không tín hiệu nào.
- Hai chế độ khuếch đại nối nhau: tích phân cộng dồn cho lệch tăng **bậc hai theo thời gian** (`½·δa·t²`), rồi một câu `if` lật nhánh và cho **+4 đơn vị trong đúng một tick** — từ mốc `0,1` lên mốc `1` chỉ mất **163 tick**. **Mọi `if` trong simulation là bộ khuếch đại hệ số vô hạn**, nên "sai số float nhỏ lắm" không phải lập luận: không tồn tại ngưỡng an toàn.
- `float64` mua thêm ~7 bậc độ lớn dư địa — cùng thí nghiệm, sau **16,7 giờ** lệch mới đạt `6,5e-09`. Nó đẩy ngày vỡ ra xa, **không** đổi bản chất.
- **Nhóm 1 phá ngay mức A**: duyệt `map` Go — một binary chạy 6 lần cho **4 giá trị HP khác nhau**, biên độ 2,5 trên 1000 HP (**0,25%**); `rand` toàn cục tự seed từ Go 1.20; `time.Now()`; goroutine + mutex cho **2 kết quả khác nhau trên 200 lần chạy**; `select` chọn case bằng tung đồng xu (**4895 / 5105** trên 10.000 lần).
- **Nhóm 2 phá mức B**: `a*b + c` biên dịch thành `FMADDD` trên arm64 và `MULSD + ADDSD` trên amd64 — cùng compiler Go 1.26.5, cùng file nguồn. Lệch **1 ULP**, xảy ra ở **13,96%** bộ `(a,b,c)` ngẫu nhiên. Cách duy nhất chặn: viết `float64(a*b) + c`.
- **Nhóm 3 phá mức C**: IEEE-754 chỉ bắt buộc làm tròn đúng cho `+ - * / sqrt` — đo `math.Sqrt` trên 200.000 giá trị, **0 lệch**. Hàm siêu việt không có bảo đảm nào: `sin²+cos² != 1` ở **39,56%** giá trị, `sin(x) != 2·sin(x/2)·cos(x/2)` ở **44,06%**. Thêm x87 80-bit và denormal/flush-to-zero.
- **Thứ tự làm việc là bắt buộc: nhóm 1 → nhóm 2 → nhóm 3.** Fixed-point cho một simulation vẫn duyệt map thì vẫn phi tất định, và bạn mất ba tuần mới biết.
- Test khoá mức A là **15 dòng**: hai world cùng seed, xen kẽ trong một process, **600 step**, so bằng `!=` chứ không bằng epsilon. Nó không bắt được nhóm 2 và 3 — đó là giới hạn, và phải nói ra.
- Ngẫu nhiên làm đúng: **seed là tham số**, LCG toàn `uint64` (Go định nghĩa tràn wrap-around trên mọi kiến trúc), lấy bit **cao**, chia cho `1<<24` để được `[0,1)`. Không dòng nào trong đó có chỗ cho làm tròn lệch.
- Nhóm 1 và 2 vá được bằng **kỷ luật cộng test**. Nhóm 3 thì không: `math.Sin` sẽ luôn là một xấp xỉ mà mỗi nền tảng chọn khác đi.

→ **Bài 11 — Fixed-point & simulation tất định tuyệt đối**: nhóm thủ phạm thứ ba không vá được bằng kỷ luật. Chỉ có một cách thoát, và nó là bỏ float.
