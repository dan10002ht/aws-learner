# Bài 9 — Determinism dùng để làm gì

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phát biểu **định nghĩa chặt** của determinism trong simulation, và chỉ ra chỗ định nghĩa lỏng lẻo làm hỏng mọi cuộc thảo luận sau đó.
- Phân biệt **ba mức determinism** — cùng máy, cùng kiến trúc, cross-platform — và nói được mỗi mức đắt hơn mức trước ở chỗ nào.
- Với mỗi trong **bốn thứ** dựng trên determinism (reconciliation, replay, rollback, anti-cheat), chỉ ra nó cần **đúng mức nào** và vì sao không cần mức cao hơn.
- Tính ra **cái giá bằng byte và bằng mili giây** của replay và của anti-cheat chạy lại, và so với phương án lưu video.
- Giải thích bằng **số đo** vì sao determinism **không thể bổ sung sau**, và vì sao nó hỏng **im lặng**.
- Quyết định được **dự án của bạn có cần determinism hay không** — và nhận ra trường hợp bạn đang được nó miễn phí mà không biết.

---

## 2. Triệu chứng

Ticket từ QA, và đây là loại ticket tệ nhất mà một game server sinh ra được:

> **"Replay trận #48217 cho ra hai kết quả khác nhau."**
> Mở file replay, bấm play: người chơi số 3 thắng.
> Đóng, mở lại, bấm play lần nữa — **cùng file, cùng máy, cùng binary**: người chơi số 7 thắng.

Bạn mở log. Không có exception. Không có warning. Không có một dòng nào khác nhau giữa hai lần chạy cho tới tận giây thứ tám. Hai lần chạy đều **hợp lệ** — luật chơi được tôn trọng từ đầu tới cuối ở cả hai. Chỉ là chúng là hai trận đấu khác nhau.

Bạn thêm log so sánh state từng tick. Đây là số đo thật, từ một sim 200 entity trên bản đồ 1024 × 1024, hai bản chạy song song, chỉ khác nhau **đúng một lần, ở đúng một câu lệnh `if`, tại tick 60**:

```
thời điểm lệch  entity khác nhau   lệch lớn nhất
 +0,00 s            0 / 200           0 đơn vị     <-- lúc nó xảy ra: KHÔNG THẤY GÌ
 +0,02 s            2 / 200           3,33
 +0,50 s            6 / 200          37,8
 +1,00 s            7 / 200          85,6
 +5,00 s           78 / 200         405,7          <-- 39% entity, lệch 40% bề rộng bản đồ
+10,00 s          183 / 200         787,2
+20,00 s          200 / 200         937,3          <-- hai thế giới không còn liên quan gì
```

Đọc dòng đầu tiên cho kỹ. **Tại đúng cái tick mà lỗi xảy ra, không có gì để nhìn.** Vị trí của cả 200 entity giống hệt nhau tới từng bit — sai lệch lúc đó chỉ nằm trong vận tốc, và phải chờ một tick nữa nó mới hiện ra thành 3,33 đơn vị, nhỏ tới mức không lọt vào biểu đồ monitoring nào.

Đây không phải bug hiệu năng, không phải race condition, không phải lỗi logic. Nó là một tính chất mà hệ thống của bạn **chưa bao giờ có**, và bạn chỉ phát hiện ra vào ngày bạn cần dùng tới nó.

---

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

Trong repo `game-server`, `internal/sim/world_test.go` đã có sẵn test này từ bài 4, và nó **xanh**:

```go
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

**Test này xanh. Nó chứng minh được điều gì?**

```
(a) Simulation tất định — có thể replay, rollback, verify. Xong việc.
(b) Tất định trên máy này, với binary này. Chưa biết gì về máy khác.
(c) Gần như không chứng minh được gì đáng kể — kể cả trên chính máy này
(d) Nó chứng minh Go là ngôn ngữ tất định
```

---

## 3. Lý thuyết

### 3.1 Định nghĩa chặt, và ba mức giá khác nhau

Định nghĩa mà phần lớn tài liệu đưa ra — *simulation là **tất định** nếu từ cùng một state đầu, áp cùng một chuỗi input, nó cho ra cùng một kết quả* — đúng, nhưng thiếu hai chữ, và hai chữ đó là toàn bộ nội dung của chương 3:

> … cùng một kết quả **bit-for-bit**, và **ở đâu**.

**"Bit-for-bit"** loại bỏ chữ "gần bằng". Trong simulation, `4,900001` và `4,900002` không phải hai số gần nhau — chúng là hai thế giới khác nhau, vì hiệu số đó được đưa trở lại làm đầu vào của tick sau, rồi tick sau nữa. Bảng mục 2 là hình ảnh của đúng chuyện đó: 3,33 đơn vị thành 937 đơn vị sau hai mươi giây.

**"Ở đâu"** mới là chỗ tài liệu trên mạng nhập nhèm nhất, và là chỗ đội của bạn cãi nhau ba ngày mà không ai nhận ra hai bên đang nói về hai thứ khác nhau. Có **ba mức**, và chúng không phải ba điểm trên một thang trượt — chúng là ba bài toán kỹ thuật khác hẳn nhau:

<svg viewBox="0 0 700 268" role="img" aria-labelledby="gs9-a-t gs9-a-d" style="width:100%;height:auto">
<title id="gs9-a-t">Ba mức determinism và thứ phải khống chế ở mỗi mức</title>
<desc id="gs9-a-d">Mức A là tất định trên cùng một máy với cùng một binary, chỉ cần khống chế nguồn ngẫu nhiên và thứ tự duyệt. Mức B là tất định giữa các máy cùng kiến trúc, phải khống chế thêm phiên bản binary và số luồng. Mức C là tất định cross-platform giữa ARM và x86, phải bỏ luôn số thực dấu phẩy động.</desc>
<rect x="18" y="20" width="664" height="70" rx="9" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
<text x="36" y="44" font-size="12" font-weight="bold" fill="currentColor">MỨC A — cùng MÁY, cùng BINARY, chạy lại hai lần</text>
<text x="36" y="63" font-size="10" fill="currentColor" opacity="0.85">phải khống chế: nguồn ngẫu nhiên · thời gian thực · thứ tự duyệt container · con trỏ/địa chỉ</text>
<text x="36" y="80" font-size="10" font-style="italic" fill="currentColor" opacity="0.7">float thoải mái — cùng CPU thì cùng kết quả</text>
<text x="608" y="58" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">rẻ</text>
<rect x="18" y="99" width="664" height="70" rx="9" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="36" y="123" font-size="12" font-weight="bold" fill="currentColor">MỨC B — máy KHÁC, cùng KIẾN TRÚC (cả cụm server x86 của bạn)</text>
<text x="36" y="142" font-size="10" fill="currentColor" opacity="0.85">cộng thêm: khoá phiên bản binary · khoá cờ biên dịch · single-thread · không phụ thuộc OS</text>
<text x="36" y="159" font-size="10" font-style="italic" fill="currentColor" opacity="0.7">float vẫn dùng được, nhưng bạn phải sở hữu mọi máy chạy nó</text>
<text x="608" y="137" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">vừa</text>
<rect x="18" y="178" width="664" height="76" rx="9" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.32"/>
<text x="36" y="202" font-size="12" font-weight="bold" fill="currentColor">MỨC C — CROSS-PLATFORM: iPhone (ARM) và PC (x86) phải ra cùng một bit</text>
<text x="36" y="221" font-size="10" fill="currentColor" opacity="0.85">cộng thêm: bỏ float dấu phẩy động · tự viết sqrt/sin bằng bảng tra · test đối chiếu hai nền</text>
<text x="36" y="238" font-size="10" font-style="italic" fill="currentColor" opacity="0.7">máy người chơi — bạn KHÔNG sở hữu nó, không chọn được CPU, không chọn được trình biên dịch</text>
<text x="608" y="216" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">đắt</text>
</svg>

Khoảng cách giữa A và B là **kỷ luật vận hành**: khoá binary, khoá cờ biên dịch, cấm song song hoá simulation. Khoảng cách giữa B và C là **viết lại toán học của game** — bạn không sở hữu máy người chơi nên không ép được nó dùng cùng CPU, cùng trình biên dịch, cùng thư viện toán; lối thoát duy nhất là bỏ hẳn thứ gây bất đồng, tức số thực dấu phẩy động, và tự dựng lại số học bằng số nguyên. Đó là toàn bộ bài 11.

Trực giác nên mang theo: **nhảy từ A lên B là thêm một danh sách quy tắc; nhảy từ B lên C là thêm một hạng mục công việc vào lịch dự án.** *(Ước lượng công sức, không phải số đo — thay đổi theo game và theo engine.)*

### 3.2 Test xanh không chứng minh gì — đây là số đo

Đáp án hộp #1 là **(c)**, và câu này cần bằng chứng chứ không phải lời khẳng định.

Phần dễ trước: test kia chạy `a` và `b` trong **cùng một tiến trình**, trên **cùng một máy**, với **cùng một binary** — nó không thể nói gì về máy khác, nên tối đa nó chứng minh mức A. Đó là lý do (a) sai và (b) là câu trả lời của người đọc kỹ.

Nhưng (c) mới đúng, vì **nó không kiểm cái sẽ hỏng.**

`sim.Step` ở Phase 0 làm đúng ba việc: cộng vận tốc vào vị trí, so với biên, đảo dấu vận tốc. Không entity nào đụng vào entity nào — không có một câu `if` nào mà kết quả phụ thuộc vào **hai** entity cùng lúc.

Đo thử xem tính chất đó đáng giá bao nhiêu. Lấy đúng logic của `world.go`, dựng hai world cùng seed, rồi **cố tình làm lệch một bit**: cộng đúng 1 ULP vào `px` của **một** entity. Ở giá trị cỡ 700–1024, 1 ULP của `float32` là **0,000061 đơn vị** — bằng **1/32.768** quãng đường một entity đi trong một tick.

```
500 lần thử (mỗi lần lệch 1 ULP ở một entity khác nhau), mỗi lần chạy 3.600 tick = 60 giây:

  số lần sai lệch nở lên quá 1 đơn vị : 0 / 500  (0,0 %)
  sai lệch lớn nhất trong cả 500 lần  : 0,000061 đơn vị — đúng bằng lúc đầu
  ở nhiều lần chạy, sai lệch về 0 hẳn : entity chạm biên, bị kẹp về đúng 0 hoặc đúng 1024
```

Sai lệch **không nở ra**. Tệ hơn: ở nhiều lần chạy nó **tự biến mất**, vì phép kẹp ở biên (`px[i] = 0`) ghi một giá trị chính xác đè lên, xoá sạch sai số. Với `world.go` hiện tại, bạn **gần như không thể làm nó mất tất định bằng sai số làm tròn**. Test xanh là đúng, nhưng nó xanh vì sim quá đơn giản để hỏng, không phải vì bạn đã làm gì để nó không hỏng.

Bây giờ thêm đúng một thứ mà mọi game thật đều có: **va chạm giữa hai entity** — một dòng `if` mà kết quả phụ thuộc vào vị trí của cả hai.

```go
if dx*dx+dy*dy < R*R {    // <-- nhánh phụ thuộc HAI entity
    hoán đổi vận tốc của i và j
}
```

Bảng ở mục 2 chính là số đo trên sim này: cho nhánh `if` đó cho kết quả khác nhau **đúng một lần, ở đúng một tick**, và 20 giây sau hai thế giới không còn chung một entity nào.

> **Cùng một sai lệch 1 ULP: ở sim không có tương tác thì nó chết đi; ở sim có một nhánh `if` phụ thuộc hai entity thì nó nở thành cả bản đồ.** Cái quyết định không phải độ lớn của sai số, mà là **có tồn tại một nhánh rẽ để sai số bấm vào hay không**.

Sim thật sẽ có va chạm, có `if hp <= 0`, có `if khoảng cách < tầm đánh`, có sắp xếp danh sách mục tiêu — mỗi cái là một nhánh rẽ. Và `TestStepIsDeterministic` sẽ **vẫn xanh** suốt quá trình đó, vì nó so hai lần chạy giống hệt nhau, mà hai lần chạy giống hệt nhau trên cùng một máy thì bấm vào cùng một nhánh.

Test đó không vô dụng — nó là **hàng rào chống hồi quy**: ngày nào ai đó nhét `time.Now()` hay `rand.Float32()` vào `Step`, nó đỏ ngay. Nhưng nó là hàng rào **mức A**, và mù hoàn toàn với mọi thứ ở mức B và C.

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài. Bốn tính năng dưới đây đều "cần determinism". Nhưng chúng **không cần cùng một mức**.

```
1. Server reconciliation — client tua lại và chạy lại input chưa được ack (bài 19)
2. Replay — lưu lại trận đấu để xem lại sau                                 (bài 35 dùng)
3. Rollback netcode — đoán input đối thủ, sai thì tua ngược 7 frame        (bài 22)
4. Anti-cheat bằng cách chạy lại trận trên server                          (bài 35)
```

Gán cho mỗi cái **một** mức trong A / B / C ở mục 3.1 — mức **thấp nhất** đủ dùng.

Gợi ý để nghĩ đúng hướng: câu hỏi quyết định không phải "cái này khó không", mà là **"nếu hai bên ra kết quả khác nhau thì ai sửa, và sửa lúc nào?"**

---

### 3.3 Bốn thứ dựng trên determinism — và mỗi thứ cần đúng mức nào

Đáp án: **A, A-hoặc-B, C, B**. Thứ tự không phải ngẫu nhiên — nó chính là thứ tự của câu hỏi gợi ý.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="gs9-b-t gs9-b-d" style="width:100%;height:auto">
<title id="gs9-b-t">Bốn tính năng xếp theo mức determinism chúng đòi hỏi</title>
<desc id="gs9-b-d">Reconciliation chỉ cần mức A vì server sửa sai ngay ở snapshot kế tiếp. Replay cần mức A khi phát lại trên chính máy đã ghi, mức B khi phát trên máy khác. Anti-cheat chạy lại cần mức B vì server ghi và server khác chạy lại. Rollback cần mức C vì không có trọng tài nào sửa giữa chừng.</desc>
<line x1="120" y1="30" x2="120" y2="222" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<text x="20" y="26" font-size="10" font-weight="bold" fill="currentColor">AI SỬA SAI?</text>
<text x="300" y="26" font-size="10" font-weight="bold" fill="currentColor">MỨC CẦN</text>
<rect x="136" y="36" width="420" height="42" rx="7" fill="#84cc16" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.25"/>
<text x="152" y="54" font-size="11" font-weight="bold" fill="currentColor">Server reconciliation</text>
<text x="152" y="70" font-size="9.5" fill="currentColor" opacity="0.8">server là trọng tài, sửa ở snapshot kế tiếp — 50 ms sau</text>
<text x="596" y="62" text-anchor="middle" font-size="15" font-weight="bold" fill="currentColor">A</text>
<text x="20" y="62" font-size="9.5" fill="currentColor" opacity="0.8">server, liên tục</text>
<rect x="136" y="86" width="420" height="42" rx="7" fill="#84cc16" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.25"/>
<text x="152" y="104" font-size="11" font-weight="bold" fill="currentColor">Replay</text>
<text x="152" y="120" font-size="9.5" fill="currentColor" opacity="0.8">không ai — nhưng sai thì chỉ là xem lại sai, không ai mất tiền</text>
<text x="596" y="112" text-anchor="middle" font-size="15" font-weight="bold" fill="currentColor">A / B</text>
<text x="20" y="112" font-size="9.5" fill="currentColor" opacity="0.8">không ai</text>
<rect x="136" y="136" width="420" height="42" rx="7" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
<text x="152" y="154" font-size="11" font-weight="bold" fill="currentColor">Anti-cheat chạy lại</text>
<text x="152" y="170" font-size="9.5" fill="currentColor" opacity="0.8">máy A ghi, máy B chạy lại — lệch là buộc tội oan người vô tội</text>
<text x="596" y="162" text-anchor="middle" font-size="15" font-weight="bold" fill="currentColor">B</text>
<text x="20" y="162" font-size="9.5" fill="currentColor" opacity="0.8">không ai</text>
<rect x="136" y="186" width="420" height="42" rx="7" fill="#ef4444" fill-opacity="0.24" stroke="currentColor" stroke-opacity="0.3"/>
<text x="152" y="204" font-size="11" font-weight="bold" fill="currentColor">Rollback netcode</text>
<text x="152" y="220" font-size="9.5" fill="currentColor" opacity="0.8">iPhone và PC cùng chạy, KHÔNG có trọng tài — lệch là hỏng vĩnh viễn</text>
<text x="596" y="212" text-anchor="middle" font-size="15" font-weight="bold" fill="currentColor">C</text>
<text x="20" y="212" font-size="9.5" fill="currentColor" opacity="0.8">không ai</text>
</svg>

Bốn mục dưới đi theo thứ tự **mức đòi hỏi tăng dần**, mỗi mục giải thích vì sao nó không cần mức của mục sau.

**1 — Server reconciliation: chỉ cần mức A.**

Cơ chế (bài 18–19 dựng đầy đủ): client dự đoán trước, giữ lại input chưa được server xác nhận, và khi snapshot về thì đặt lại state theo server rồi **chạy lại** toàn bộ input chưa ack lên trên đó. Determinism ở đây là **của riêng client, với chính nó**: chạy lại input 41–47 phải ra kết quả giống lần chạy đầu, nếu không nhân vật rung liên tục dù server chẳng phản đối gì.

Nó **không** cần client và server ra cùng một bit, vì đã có trọng tài: server lệch bao nhiêu thì snapshot kế tiếp sửa bấy nhiêu, **50 ms một lần** ở snapshot 20 Hz (bài 8). Sai số không có thời gian nở ra như bảng mục 2 — nó bị cắt cụt ba lần mỗi giây bởi một giá trị đúng từ bên ngoài. Món rẻ nhất trong bốn món, và **gần như miễn phí**: một `Step` thuần tuý, không đọc đồng hồ, không đọc `rand` toàn cục, là đủ.

**2 — Replay: mức A nếu phát lại tại chỗ, mức B nếu phát ở nơi khác.**

Ý tưởng: đừng lưu *cái đã xảy ra*, lưu *thứ đủ để làm nó xảy ra lần nữa* — seed + state đầu + chuỗi input. Một trận **8 người, 10 phút, sim 60 Hz, 8 byte input mỗi người mỗi tick**:

```
số tick        = 600 s × 60 Hz           = 36.000
dung lượng thô = 36.000 × 8 người × 8 B  = 2.304.000 B = 2,30 MB
nhịp ghi       = 8 × 8 × 60              = 3.840 B/s   = 3,84 KB/s
```

Đặt cạnh phương án hiển nhiên là quay video, luồng 1080p60 ở **12 Mbps** *(mức YouTube khuyến nghị — thay đổi theo codec và cảnh)*:

| Cách lưu | 1 trận 10 phút | So với video |
|---|---|---|
| Video 1080p60, 12 Mbps | **900 MB** | — |
| Input thô, 8 B/người/tick | **2,30 MB** | rẻ hơn **391 lần** |
| Input mã hoá theo thay đổi | **230 KB** | rẻ hơn **3.906 lần** |

*(Dòng cuối giả định mỗi người đổi trạng thái input trung bình 4 lần/giây, mỗi lần 12 byte gồm tick + trạng thái. **Giả định minh hoạ**, không phải số đo — FPS bấm nhiều hơn RTS rất nhiều.)*

2,30 MB còn giấu ba thứ video không có: **xem được từ mọi góc máy** (lý do mọi game esports có chế độ khán giả tự do), **truy vấn được** ("tìm mọi trận dùng vũ khí X trong 3 giây đầu" là một vòng lặp trên state, không phải bài toán thị giác máy tính), và **tua ngược miễn phí**.

Mức cần: phát lại trên **chính máy đã ghi** (server dựng highlight rồi đẩy lên CDN) thì A đủ. File replay **tải về máy người chơi** thì cần ít nhất B — và nếu người chơi ở trên nhiều nền tảng thì bạn vừa rơi xuống C mà không định. Một tính năng nghe-có-vẻ-nhỏ kéo theo cả bài 11.

Replay cũng là **thứ duy nhất trong bốn thứ mà hỏng không chết ai** — người xem thấy một trận sai, khó chịu, hết. Chính vì vậy nó là chỗ tốt nhất để *phát hiện* determinism đã hỏng, trước khi hai thứ dưới đây phát hiện hộ bạn.

**3 — Anti-cheat bằng cách chạy lại: cần mức B.**

Bài 35 mổ kỹ. Cơ chế: server ghi lại input, rồi một tiến trình khác — thường ở máy khác, chạy sau, offline — chạy lại trận đó và so với kết quả đã báo cáo. Lệch nghĩa là có người sửa thứ không được phép sửa.

Vì sao B chứ không phải A: **máy ghi và máy chạy lại là hai máy khác nhau**. Cả hai đều là server của bạn, cùng kiến trúc, cùng image, nên B khả thi. Nhưng A không đủ — một binary khác phiên bản, một cờ biên dịch khác là đủ sinh ra khác biệt, và hậu quả ở đây không phải "xem lại một trận sai" mà là **ban oan một người chơi không gian lận**.

Cái giá tính toán thì rẻ đến bất ngờ. Bench ở bài 8: `sim.Step` với 1.000 entity tốn **1,18 µs**, không cấp phát. Chạy lại cả trận 10 phút:

```
36.000 tick × 1,18 µs = 42,5 ms CPU
```

**Bốn mươi hai mili giây để chạy lại một trận mười phút** — nhanh hơn thời gian thực **khoảng 14.100 lần**. *(Chỉ phần simulation. Thực tế còn giải mã input, kiểm bất biến, ghi kết quả; tổng lớn hơn vài lần nhưng cùng bậc độ lớn.)*

Nút thắt **không phải CPU mà là lưu trữ**: với 1 triệu trận mỗi ngày, input thô 2,30 MB/trận là **2,30 TB/ngày**, mã hoá theo thay đổi 230 KB/trận là **230 GB/ngày**. Đó là lý do thực tế không ai chạy lại **mọi** trận — người ta chạy lại trận bị báo cáo, trận xếp hạng cao, và một mẫu ngẫu nhiên nhỏ. Quyết định đó thuộc về hoá đơn S3, không phải về CPU.

**4 — Rollback netcode: cần mức C, không có đường vòng.**

Món đắt nhất, và lý do nằm đúng ở câu hỏi gợi ý của hộp #2: **không có ai sửa sai.**

Hình dung (bài 22 dựng đầy đủ): hai máy chơi fighting game, mỗi máy chạy simulation đầy đủ. Input đối thủ chưa về thì **đoán** (thường là "giữ nguyên input cũ"); khi input thật về mà khác dự đoán thì tua ngược về tick đó, thay input đúng, **chạy lại tất cả các tick đã lỡ** — xong trong phần còn lại của khung hình 16,67 ms.

Phần CPU là phần dễ. Với ngưỡng điển hình 7 frame (bài 22), dùng lại số bench:

```
7 × 1,18 µs = 8,26 µs = 0,050 % ngân sách một tick 16,67 ms
```

Một phần hai mươi của một phần trăm — và game đối kháng còn ít entity hơn 1.000 rất nhiều nên số thật còn nhỏ hơn. Rollback **không hề đắt về CPU**.

Chỗ đắt nằm chỗ khác. Hai máy — một iPhone ARM, một PC x86 — chạy **hai simulation độc lập, song song, không ai gửi state cho ai**; chỉ gửi input, vì gửi input chính là thứ làm rollback rẻ. Nghĩa là:

> Nếu hai bên lệch nhau **một bit**, không có gói tin nào sửa được, vì không ai gửi state cả. Sai lệch chỉ có một đường đi: bảng ở mục 2.

Đó là lý do gần như mọi game rollback thương mại đều bỏ số thực dấu phẩy động, tự viết `sqrt` bằng bảng tra, và cấm mọi thư viện bên thứ ba trong vòng lặp simulation. Không phải vì họ thích khổ, mà vì không có phương án thứ hai — và **tăng tần suất đồng bộ không tạo ra phương án thứ hai**: gửi state để sửa lệch thì bạn vừa quay về client-server và mất chính thứ làm rollback đáng giá.

Bốn mục vừa rồi có một trật tự, và trật tự đó là một câu:

> **Mức determinism bạn cần được quyết bởi một câu hỏi duy nhất: giữa hai bên chạy simulation, có ai đủ thẩm quyền sửa sai, và sửa nhanh cỡ nào.** Có trọng tài mỗi 50 ms → A. Không có trọng tài → C. Không có câu trả lời nào nằm ở giữa vì lý do thẩm mỹ.

---

## ⏸ Dừng lại — đoán trước #3

Bạn đang ở tuần thứ hai của dự án. Chưa có netcode, chưa biết sau này có làm replay hay không, và chắc chắn chưa làm rollback.

**Chi phí hợp lý nhất để trả lúc này là gì?**

```
(a) Làm mức C ngay từ đầu — fixed-point, bảng tra, test hai nền tảng
(b) Bỏ qua hoàn toàn. Tuần nào cần thì tuần đó thêm vào
(c) Làm mức A ngay, và ghi lại quyết định "chưa cần B/C" kèm lý do
(d) Làm mức B — đằng nào cũng có nhiều server
```

Một trong bốn đáp án này rẻ hơn ba cái kia **một bậc độ lớn**, và không phải cái bạn nghĩ đầu tiên.

---

### 3.4 Vì sao không thể bổ sung sau — cú đấm của bài

Đáp án hộp #3 là **(c)**, và mục này giải thích vì sao (b) là câu trả lời đắt nhất trong bốn câu.

Determinism không phải một **tính năng** bạn thêm vào. Nó là một **bất biến** — mệnh đề đúng với *toàn bộ* code trong đường tick, mọi lúc:

> Một tính năng thiếu thì bạn **thêm vào**. Một bất biến bị vi phạm ở *một* chỗ thì nó **không còn đúng ở đâu cả**.

Ba dòng dưới đây đều hợp lý ở thời điểm ai đó viết, và đều giết bất biến đó ngay lập tức. Danh sách đầy đủ là bài 10; ở đây ba ví dụ đủ để thấy hình dạng vấn đề:

```go
// 1. Đo thời gian thật trong sim — trông như một tối ưu hợp lý
elapsed := time.Since(lastHit)          // hai lần chạy, hai giá trị khác nhau

// 2. rand toàn cục — trông như "chỉ là hiệu ứng cho đẹp"
if rand.Float32() < 0.1 { spawnSpark() } // state của rand nằm ngoài world

// 3. Duyệt map của Go — trông như code hoàn toàn bình thường
for id, e := range entities {            // Go CỐ Ý ngẫu nhiên hoá thứ tự này
    e.Update(dt)
}
```

Dòng thứ ba nguy hiểm nhất vì nó **không trông giống thủ phạm gì cả**: code Go bình thường mà mọi dev backend viết mỗi ngày, không có API nào tên là "random" trong đó. Và Go ngẫu nhiên hoá thứ tự duyệt map **có chủ đích**, chính là để không ai lỡ phụ thuộc vào nó.

Ba đặc tính dưới đây là lý do gốc khiến determinism khác mọi thứ khác trong course này:

**Một — nó hỏng im lặng.** Không exception, không panic, không log. Nhìn lại bảng mục 2: tại đúng cái tick sai lệch xảy ra, **0/200 entity khác nhau** — không có gì để một cái alert bấm vào.

**Hai — nó hỏng không ổn định.** Số đo mục 3.2: 500 lần thử lệch 1 ULP, nở ra quá 1 đơn vị **0 lần**, vì một nhánh rẽ chỉ lật khi khoảng cách giữa hai entity rơi đúng vào cửa sổ rộng bằng sai số. Cực hiếm và phụ thuộc seed, nghĩa là bug này **không tái tạo được theo yêu cầu** — nó xuất hiện ở trận thứ 48.217 chứ không phải trận thứ nhất. Đây chính là ticket ở mục 2, và chính là lý do nó tệ.

**Ba — chi phí sửa không phải chi phí của dòng code đó.** Sáu tuần sau, `Step` không còn 20 dòng: nó gọi hệ thống va chạm, kỹ năng, AI, buff/debuff; chúng gọi tiếp thư viện toán, thư viện vật lý, và một mớ tiện ích ai đó mượn từ dự án cũ. Trong đống đó có **một** chỗ đọc `time.Now()`, và bạn không biết chỗ nào. Sửa nó nghĩa là: dựng cơ chế **so hai lần chạy tới từng bit** (hash state mỗi tick) — thứ đáng lẽ phải có từ tuần đầu; tìm tick đầu tiên lệch rồi **truy ngược ra biến nào lệch trước**, nhớ rằng ở chính tick đó có thể chưa có gì lệch; sửa, rồi phát hiện chỗ thứ hai, rồi chỗ thứ ba. Và nếu mức cần là C, bước cuối là **viết lại toàn bộ số học của simulation sang fixed-point** — tức sờ vào mọi công thức gameplay đã cân bằng suốt sáu tuần, và cân bằng lại chúng.

> **Determinism không phải thứ bạn bổ sung. Nó là thứ bạn hoặc giữ từ dòng code đầu tiên, hoặc phải viết lại simulation để có.**

Cái ác nằm ở chỗ **giá giữ từ đầu gần như bằng không**, còn giá để có lại bằng một hạng mục viết lại. Nhìn `world.go` ở Phase 0: nó đã tất định rồi, không phải vì ai hy sinh gì, mà vì người viết chọn LCG có seed thay vì `math/rand` toàn cục, và chọn slice theo index thay vì map. Hai lựa chọn, không tốn thêm một phút nào. Đó là toàn bộ lý do chương này đứng trước cả chương mạng: **quyết định phải ra trước khi có thứ để hối hận.**

### 3.5 Cái giá thật của việc GIỮ determinism

Mục trên dễ bị đọc thành "vậy cứ làm determinism cho chắc". Không. Nó lấy đi bốn quyền tự do, và ba trong bốn là thứ dev backend dùng hàng ngày:

| Mất quyền tự do | Từ mức | Cụ thể là mất gì |
|---|---|---|
| **Dùng float thoải mái** | C | Mất `math.Sin`, `math.Sqrt`, mất `float32` trong mọi công thức gameplay; phải nghĩ về tràn số ở mỗi phép nhân. Cả bài 11 chỉ để lấy lại thứ `float32` cho không |
| **Song song hoá simulation** | A | 8 goroutine cập nhật entity song song = thứ tự ghi phụ thuộc scheduler, mà scheduler không tất định. **Sim phải single-thread**, hoặc chia việc theo sơ đồ cố định tự viết, không work-stealing (bài 28) |
| **Dùng thư viện bên thứ ba** | B | Thư viện vật lý / toán / pathfinding là hộp đen bạn phải chứng minh tất định trên mọi nền bạn chạy. Phần lớn **không hứa điều đó**, kể cả khi hôm nay tình cờ đúng |
| **Chỉ viết test một lần** | A | Phải nuôi cả một bộ: hash state mỗi tick, chạy lại corpus replay cũ trong CI, và nếu cần C thì so hai kiến trúc thật trong pipeline |

Dòng thứ hai đắt nhất về kiến trúc: với dev quen `errgroup`, câu trả lời quen thuộc cho "chậm quá" — *thêm worker* — bị cấm.

Nói thẳng: **đây không phải bữa trưa miễn phí.** Có game đáng trả cả bốn cái giá. Có game trả một phần. Và có game — nhiều hơn bạn nghĩ — không nên trả gì cả.

### 3.6 Khi nào KHÔNG cần — và bạn có thể đang được nó miễn phí

Đọc xong một bài về determinism thì phản xạ tự nhiên là đi làm fixed-point cho một game không cần nó. Trường hợp **không cần gì quá mức A** bao trùm phần lớn game online thương mại: authoritative server + client prediction đơn giản, không replay tải về máy người chơi, không rollback, không anti-cheat chạy lại. Server là trọng tài tuyệt đối và sửa sai mỗi 50 ms; client lệch bit thì không ai chết. Và mức A **gần như là món quà**: `Step` thuần tuý, seed cấp từ ngoài vào, duyệt slice thay vì map.

Danh sách thể loại, nối vào bảng của bài 3:

| Hình dạng game | Mức cần | Ghi chú |
|---|---|---|
| MMO, game thế giới mở, game xã hội | **A** | Server sửa liên tục. Đừng làm gì thêm |
| FPS / MOBA client-server, có lag comp | **A** | Lag compensation cần **lịch sử vị trí** (bài 21), không cần chạy lại tất định |
| FPS / MOBA có replay tải về máy chơi | **B**, dễ trượt xuống C | Tính năng nghe nhỏ, kéo theo ràng buộc lớn — quyết sớm |
| Có anti-cheat chạy lại | **B** | Khoá binary + cờ biên dịch trên cả cụm |
| Fighting game rollback | **C** | Bài 11, không có đường vòng |
| RTS lockstep | **C** | Chỉ gửi input, mọi máy chạy cùng world (bài 22) |

Hai bẫy ở bảng trên, cả hai đều đã làm đau dự án thật:

**Bẫy một: "sau này có thể chúng ta sẽ làm rollback".** Nếu câu đó là thật thì bạn cần mức C *ngay*, vì mục 3.4. Nếu nó chỉ là mong muốn mơ hồ thì nó đang đòi bạn trả trước cho thứ có thể không bao giờ tới. Cách xử lý đúng không phải làm hay không làm, mà là **buộc câu hỏi đó có câu trả lời dứt khoát ở tuần đầu**, ghi lại kèm lý do. Đó là nửa sau của đáp án (c).

**Bẫy hai: tưởng mình đang ở A trong khi thực ra đang ở B.** Nếu simulation của một trận có thể bị **di chuyển sang node khác** — handoff khi sharding (bài 32), hoặc khôi phục sau crash từ snapshot — thì bạn đang chạy tiếp một simulation trên **một máy khác**. Đó là mức B, dù không ai trong đội từng nói từ "determinism".

---

## 4. Bảng quyết định — ba câu hỏi, ra mức cần

Thứ đáng mang ra khỏi bài này. Trả lời theo thứ tự, dừng ở câu đầu tiên trả lời "có":

```
1. Có hai bên cùng chạy simulation mà KHÔNG bên nào gửi state để sửa bên kia không?
   (rollback netcode, lockstep RTS)
   -> CÓ  =>  MỨC C. Đọc bài 11 trước khi viết dòng gameplay đầu tiên.

2. Có bao giờ một simulation được chạy hoặc chạy tiếp trên MỘT MÁY KHÁC không?
   (anti-cheat chạy lại, replay tải về máy người chơi, handoff giữa node, khôi phục sau crash)
   -> CÓ  =>  MỨC B. Khoá binary, khoá cờ biên dịch, cấm multi-thread trong sim.

3. Còn lại.
   -> MỨC A. Ba quy tắc, gần như miễn phí:
      - Step là hàm thuần tuý: state vào, state ra. Không đọc đồng hồ, không đọc I/O.
      - Mọi nguồn ngẫu nhiên có seed, và seed nằm TRONG world state.
      - Duyệt theo thứ tự cố định: slice theo index, không phải map.
```

Và một quy tắc phụ, đắt hơn vẻ ngoài của nó: **dù ở mức nào cũng dựng cơ chế hash state mỗi tick và so hai lần chạy ngay từ tuần đầu.** Nó rẻ lúc này, nó là bước 1 bắt buộc của mọi lần điều tra sau này, và không có nó thì bảng ở mục 2 là thứ bạn phải tự dựng lại trong lúc đang cháy.

---

## 5. Tính tay

Không cần code. Mọi số đều có trong bài.

**Bài 1.** Một battle royale: **100 người**, trận dài **25 phút**, sim **30 Hz**, input **6 byte/người/tick**.
- Replay một trận nặng bao nhiêu MB ở dạng thô?
- Studio muốn giữ replay của mọi trận trong 30 ngày, lưu lượng **400.000 trận/ngày**. Tổng dung lượng là bao nhiêu TB? So với con số 2,30 TB/ngày ở mục 3.3, cái gì làm nó đổi nhiều nhất — số người, độ dài trận, hay tick rate?
- Nếu hạ xuống chỉ giữ replay của **top 5%** trận xếp hạng cao, con số đó còn bao nhiêu?

**Bài 2.** Vẫn bench `sim.Step` 1,18 µs cho 1.000 entity.
- Chạy lại một trận battle royale ở bài 1 (25 phút, 30 Hz) tốn bao nhiêu **mili giây** CPU?
- Một máy 16 core dành **một** core cho việc verify chạy 24/24 thì mỗi ngày verify được bao nhiêu trận? So với 400.000 trận/ngày thì đủ hay thiếu?
- Kết luận gì về câu "anti-cheat chạy lại quá tốn kém"?

**Bài 3.** Nhìn lại bảng ở mục 2. Sai lệch đo được: +0,02 s → 3,33 đơn vị; +1,00 s → 85,6; +5,00 s → 405,7; +20,00 s → 937,3.
- Từ 0,02 s tới 1,00 s, sai lệch nhân lên bao nhiêu lần? Từ 1,00 s tới 5,00 s? Từ 5,00 s tới 20,00 s?
- Ba con số đó **không bằng nhau** và giảm dần rất mạnh. Bản đồ rộng 1.024 đơn vị — điều đó giải thích được chỗ giảm dần không?
- Nếu bạn đặt cảnh báo "lệch quá 1 đơn vị thì báo", bạn phát hiện ra sự cố **sớm hơn bao nhiêu giây** so với lúc nó đã phá hỏng nửa thế giới (mốc 78/200 entity)?

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game thẻ bài online, 1 đấu 1, lượt luân phiên, không có vật lý.** Mỗi lá bài có hiệu ứng ngẫu nhiên ("gây 3–7 sát thương", "rút một lá bất kỳ từ bộ bài"). Trận kéo dài 8–15 phút, mỗi người đi khoảng 40 lượt. Có bảng xếp hạng có tiền thưởng, nên gian lận là chuyện có thật.

1. Game này gần như không có `float` nào. Vậy có phải nó tất định miễn phí không? Nếu không, thứ gì trong mô tả trên đang phá determinism trước tiên?
2. Hiệu ứng ngẫu nhiên của lá bài phải sinh ở đâu — server, client, hay cả hai cùng sinh từ một seed? Mỗi phương án mất gì?
3. Chạy bảng quyết định ở mục 4 cho game này. Bạn dừng ở câu hỏi số mấy, và mức là gì?
4. Replay một trận thẻ bài nặng bao nhiêu? So với trận FPS 8 người 10 phút ở mục 3.3, tỉ lệ chênh lệch là bao nhiêu lần — và điều đó mở ra tính năng gì mà game FPS không kham nổi?
5. Đội đề xuất: client tự sinh số ngẫu nhiên từ seed server gửi, để hiệu ứng hiện ngay không phải chờ round-trip. Nó tiết kiệm một RTT mỗi lá bài. Nó mở ra loại gian lận nào, và loại gian lận đó nằm ở mức nào trong thang "server chặn tuyệt đối được / chỉ giảm được" của bài 34?
6. **Câu khó nhất:** một năm sau, game thành công và đội muốn thêm chế độ **xem trực tiếp trận đang diễn ra**, có độ trễ 30 giây để chống lộ bài. Cách rẻ nhất là đẩy chuỗi input cho người xem và để **máy của họ** chạy simulation — 230 KB cho cả trận thay vì một luồng video cho mỗi khán giả. Nhưng người xem ở trên trình duyệt, iOS, Android và PC. Hãy chỉ ra: (i) tính năng này vừa đẩy bạn lên mức nào; (ii) vì sao cái mức đó lại đắt hơn hẳn dù game **không có một dòng vật lý nào**; và (iii) tồn tại hay không một thiết kế cho phép người xem tự chạy simulation mà **không** cần mức đó — nếu có thì bạn phải hy sinh cái gì.

Câu 6 là tình huống thật, lặp lại ở nhiều studio: một tính năng thuộc về **sản phẩm** kéo theo một ràng buộc thuộc về **số học**, và giữa hai thứ đó không có ai làm phiên dịch ngoài bạn.

---

## 7. Tóm tắt

- Determinism là **cùng state đầu + cùng chuỗi input → cùng kết quả bit-for-bit**. Hai chữ "bit-for-bit" và câu hỏi "ở đâu" là toàn bộ nội dung của chương 3.
- **Ba mức, ba bài toán khác hẳn nhau.** A: cùng máy cùng binary — khống chế nguồn ngẫu nhiên, đồng hồ, thứ tự duyệt. B: máy khác cùng kiến trúc — thêm khoá binary, khoá cờ biên dịch, cấm multi-thread. C: cross-platform ARM/x86 — **bỏ float**, tự viết `sqrt`/`sin`, test đối chiếu hai nền.
- Mức cần được quyết bởi **một câu hỏi**: có ai đủ thẩm quyền sửa sai giữa chừng không, và nhanh cỡ nào. Trọng tài mỗi 50 ms → A. Không trọng tài → C. **Reconciliation cần A** · **replay cần A hoặc B** tuỳ nơi phát lại · **anti-cheat chạy lại cần B** (lệch nghĩa là ban oan) · **rollback cần C** (không ai gửi state, không gói tin nào sửa được một bit lệch).
- Replay 8 người, 10 phút, 60 Hz, 8 B/người/tick = **2,30 MB**, so với video 1080p60 12 Mbps **900 MB** — rẻ hơn **391 lần**, lại xem được mọi góc máy và truy vấn được. Chạy lại cả trận tốn **42,5 ms CPU** (36.000 × 1,18 µs), nhanh hơn thời gian thực **~14.100 lần**; rollback 7 frame tốn **8,26 µs = 0,050%** một tick. **Nút thắt của anti-cheat là lưu trữ, không phải CPU**: 1 triệu trận/ngày = **2,30 TB/ngày** thô.
- **Hỏng IM LẶNG:** tại đúng tick sai lệch xảy ra, **0/200 entity khác nhau**, không log, không exception. Sau 5 giây: **78/200** lệch tới **405 trên bản đồ rộng 1.024**. Sau 20 giây: **200/200**.
- **Và hỏng KHÔNG ỔN ĐỊNH:** 500 lần thử lệch 1 ULP trên sim không có tương tác, **0 lần** nở ra. Sai lệch chỉ nở khi có **một nhánh `if` để nó bấm vào** — nên bug xuất hiện ở trận thứ 48.217 và không tái tạo được theo yêu cầu.
- **Không thể bổ sung sau.** Determinism là **bất biến**, không phải tính năng: vi phạm một chỗ là mất ở mọi chỗ. Giữ từ đầu gần như **miễn phí** (`Step` thuần tuý, seed trong world, slice thay map — `world.go` đã làm đúng cả ba); có lại sau sáu tuần = **viết lại simulation**.
- **Giá của việc giữ nó:** mất float tự do (mức C), mất quyền song song hoá simulation, mất quyền dùng thư viện bên thứ ba chưa chứng minh được, phải nuôi một bộ test khoá bất biến. Không phải bữa trưa miễn phí.
- **Phần lớn game không cần quá mức A** và đang được nó gần như miễn phí — đừng làm fixed-point cho một game có server sửa sai ba lần mỗi giây. Nhưng hãy **dựng hash state mỗi tick từ tuần đầu**: rẻ bây giờ, và là bước 1 bắt buộc của mọi lần điều tra sau này.

→ **Bài 10 — Những kẻ giết determinism**: biết vì sao cần rồi. Giờ đi tìm thủ phạm — và phần lớn chúng không hề trông giống thủ phạm.
