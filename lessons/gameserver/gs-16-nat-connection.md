# Bài 16 — NAT, vòng đời kết nối & phục hồi

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao **mục ánh xạ NAT chỉ sinh ra khi có gói đi RA**, và suy từ đó ra ai gọi được ai.
- Nói trong một câu vì sao **dedicated server gần như không phải làm gì với NAT**, còn P2P thì phải làm rất nhiều.
- Xếp đúng vai của **STUN, hole punching và TURN**, và bác bỏ bằng số câu "P2P thì khỏi tốn tiền server".
- **Tự dựng ngân sách timeout** ba mốc thay vì chép hằng số của người khác.
- Thiết kế **reconnect không mất trận**: giữ gì, giữ bao lâu, nhận lại danh tính bằng gì, đồng bộ lại thế nào.
- Tính được **cái giá của việc giữ slot**, và chỉ ra cái giá đó nằm ở đâu — không phải chỗ bạn tưởng.

---

## 2. Triệu chứng

Người chơi vào thang máy. Điện thoại mất sóng **4 giây**. Ra khỏi thang máy, mạng có lại ngay. Anh ta mở app và thấy màn hình kết quả: **thua, bỏ trận, trừ điểm rank**. Trận đó anh ta đã chơi **18 phút**.

```
4 giây mất sóng  →  huỷ 1.080 giây đã bỏ ra
4 / 1.080 = 0,37 % thời lượng trận  →  đòn bẩy 270 lần
```

Nhân lên quy mô: một game **50.000 CCU**, trận trung bình 18 phút.

```
phiên trận kết thúc mỗi giây   = 50.000 / 1.080  = 46,3
phiên trận mỗi ngày            = 46,3 × 86.400   = 4.000.000
```

Giả sử **1,5 %** số phiên gặp một lần đứt mạng đủ dài để server coi là chết *(con số GIẢ ĐỊNH để tính, không phải số đo — tỉ lệ thật tuỳ tập người dùng, tỉ lệ chơi 4G và chất lượng mạng từng nước)*:

```
4.000.000 × 1,5 %  =  60.000 lần mỗi ngày
                   =  2.500 lần mỗi giờ
                   =  41,7 lần mỗi phút
```

**41,7 người mỗi phút** mất trận vì một sự kiện kéo dài vài giây. Không một dòng error: server làm đúng những gì nó được viết — không nhận gói → coi là đã rời trận → giải phóng slot.

Bài 15 kết bằng chuyện gói tin phải **tìm được đường về đúng máy người chơi**, mà phần lớn người dùng Internet không có địa chỉ để gọi tới. Bài này đi từ cái "không có địa chỉ" đó tới màn hình "thua, bỏ trận" ở trên.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp. Máy người chơi có IP nội bộ `10.0.0.5`, sau router NAT. Server của bạn có IP công cộng. **Server gửi gói tới máy đó được không?**

```
(a) Không bao giờ — thiếu IP công cộng thì chịu, phải làm hole punching
(b) Được, nếu người chơi cấu hình port forwarding trên router
(c) Được, và không cần làm gì cả — miễn là máy đó đã gửi cho server trước
(d) Được, nhưng phải dùng TURN relay làm trung gian
```

Ba trong bốn đáp án là thứ người ta thật sự đi làm khi không cần làm.

---

## 3. Lý thuyết

### 3.1 NAT: một bảng, và một quy tắc duy nhất

IPv4 có 2³² địa chỉ, khoảng 4,3 tỉ — ít hơn số thiết bị nối mạng từ lâu. NAT là cách sống chung với sự thiếu hụt đó: một nhà, một công ty, thậm chí cả một nhà mạng (CGNAT) dùng **chung một IP công cộng**, bên trong dùng dải riêng `10.x`, `192.168.x`. Router giữ một bảng để biết gói về thì trả cho ai:

| Nội bộ | ↔ | Công cộng | Hết hạn sau |
|---|---|---|---|
| `10.0.0.5:5000` | ↔ | `203.0.113.7:41287` | vài chục giây tới vài phút |
| `10.0.0.9:5000` | ↔ | `203.0.113.7:41288` | vài chục giây tới vài phút |

Hai máy trong nhà cùng dùng port 5000 vẫn không lẫn nhau vì NAT cấp cho mỗi cái một **port công cộng khác nhau**. Toàn bộ bài này treo trên đúng một quy tắc:

> **Mục ánh xạ chỉ được TẠO khi có gói đi RA.** Gói từ ngoài vào mà không khớp mục nào đang tồn tại thì router không biết trả cho ai, và nó vứt gói đi.

Đó không phải tính năng bảo mật mà là hệ quả cơ học: router không có cách nào đoán `203.0.113.7:41287` là dành cho máy nào nếu chính máy đó chưa nói ra trước.

Về thời hạn: RFC 4787 khuyến nghị giữ mục ánh xạ UDP **tối thiểu 2 phút**, nên là 5 phút; thực tế thiết bị gia đình và CGNAT thường ngắn hơn — dải vài chục giây là bình thường. *(Kiến thức ngành, không phải số đo; khác nhau theo thiết bị.)* Con số này quay lại ở mục 3.5.

### 3.2 Với dedicated server, bạn gần như không phải làm gì

Đáp án hộp #1 là **(c)**, và phải nói sớm để bạn khỏi đi lạc nửa bài:

> Trong mô hình **dedicated server** — đúng cái course này đang dựng — **client luôn là bên chủ động mở kết nối**. Client gửi gói đầu → NAT tạo mục ánh xạ → đường về mở ra → server trả lời đi lọt. Không STUN, không hole punching, không TURN. **Không một dòng code nào cho NAT.**

<svg viewBox="0 0 700 200" role="img" aria-labelledby="gs16-a-t gs16-a-d" style="width:100%;height:auto">
<title id="gs16-a-t">Vì sao dedicated server đi lọt NAT còn P2P thì không</title>
<desc id="gs16-a-d">Bên trái, client sau NAT gửi gói ra server công cộng nên mục ánh xạ được tạo và gói trả lời đi lọt. Bên phải, hai client đều nằm sau NAT riêng nên gói của mỗi bên tới NAT của bên kia đều bị vứt vì chưa có mục ánh xạ nào.</desc>
<text x="15" y="20" font-size="12" font-weight="bold" fill="currentColor">DEDICATED SERVER — client luôn gọi trước</text>
<rect x="15" y="28" width="330" height="158" rx="8" fill="#84cc16" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="28" y="46" width="88" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="72" y="63" text-anchor="middle" font-size="10" fill="currentColor">Client</text>
<text x="72" y="75" text-anchor="middle" font-size="8" fill="currentColor">10.0.0.5:5000</text>
<rect x="126" y="46" width="80" height="34" rx="5" fill="#64748b" fill-opacity="0.28"/>
<text x="166" y="63" text-anchor="middle" font-size="10" fill="currentColor">NAT</text>
<text x="166" y="75" text-anchor="middle" font-size="8" fill="currentColor">203.0.113.7</text>
<rect x="216" y="46" width="116" height="34" rx="5" fill="#84cc16" fill-opacity="0.30"/>
<text x="274" y="63" text-anchor="middle" font-size="10" fill="currentColor">Server</text>
<text x="274" y="75" text-anchor="middle" font-size="8" fill="currentColor">198.51.100.9:7777</text>
<text x="30" y="104" font-size="9" fill="currentColor">1. gói ĐI RA — NAT tạo mục ánh xạ :41287</text>
<line x1="30" y1="112" x2="330" y2="112" stroke="#84cc16" stroke-width="2"/>
<text x="30" y="134" font-size="9" fill="currentColor">2. gói VỀ — đi lọt, mục ánh xạ đã có sẵn</text>
<line x1="330" y1="142" x2="30" y2="142" stroke="#84cc16" stroke-width="2" stroke-dasharray="5 3"/>
<text x="30" y="168" font-size="10" font-style="italic" fill="currentColor">Bạn không phải viết một dòng nào cho NAT.</text>
<text x="355" y="20" font-size="12" font-weight="bold" fill="currentColor">P2P — cả hai đều nằm sau NAT</text>
<rect x="355" y="28" width="330" height="158" rx="8" fill="#ef4444" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="365" y="46" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="401" y="67" text-anchor="middle" font-size="10" fill="currentColor">Client A</text>
<rect x="445" y="46" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.28"/>
<text x="481" y="67" text-anchor="middle" font-size="10" fill="currentColor">NAT A</text>
<rect x="525" y="46" width="72" height="34" rx="5" fill="#64748b" fill-opacity="0.28"/>
<text x="561" y="67" text-anchor="middle" font-size="10" fill="currentColor">NAT B</text>
<rect x="605" y="46" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.28"/>
<text x="641" y="67" text-anchor="middle" font-size="10" fill="currentColor">Client B</text>
<line x1="517" y1="63" x2="525" y2="63" stroke="#ef4444" stroke-width="2"/>
<text x="521" y="38" text-anchor="middle" font-size="13" font-weight="bold" fill="#ef4444">✕</text>
<text x="368" y="104" font-size="9" fill="currentColor">A gửi tới B: NAT B chưa có mục nào cho A → RƠI</text>
<text x="368" y="126" font-size="9" fill="currentColor">B gửi tới A: NAT A chưa có mục nào cho B → RƠI</text>
<text x="368" y="152" font-size="9" fill="currentColor">Không ai gọi được ai. Cả hai đều đang chờ bên kia</text>
<text x="368" y="164" font-size="9" fill="currentColor">gọi trước — mà bên kia cũng không gọi được.</text>
</svg>

Đây là một lý do ít được nhắc của dedicated server: nó **biến bài toán NAT thành không-bài-toán**. Nói rõ giới hạn — có hai chỗ NAT vẫn chạm vào, cả hai đều nhỏ:

1. **Mục ánh xạ hết hạn nếu im lặng quá lâu.** Game bắn súng gửi input 60 lần/giây thì không bao giờ chạm ngưỡng; game theo lượt có thể im lặng vài phút và mất mục ánh xạ giữa hai nước đi — mục 3.5 xử lý bằng heartbeat.
2. **Một số NAT đổi port công cộng khi đổi đích đến** ("symmetric"). Không ảnh hưởng dedicated server vì bạn chỉ nói chuyện với đúng một đích; nó chỉ giết hole punching, tức chỉ giết P2P.

### 3.3 P2P: bài toán thật, và ba công cụ

Ở P2P thì ngược lại: cả hai máy đều sau NAT, cả hai chờ bên kia gọi trước, không ai gọi được. Ba công cụ để gỡ, theo thứ tự leo thang:

**STUN — tự biết địa chỉ công cộng của mình.** A gửi một gói tới server STUN công cộng; STUN trả lời đúng một câu: *"gói của bạn tới đây từ `203.0.113.7:41287`"*. Bản thân A không có cách nào tự biết điều đó — nó chỉ biết `10.0.0.5:5000`. Rồi A và B trao đổi địa chỉ công cộng **qua server ghép trận** (server bình thường, không phải STUN).

**Hole punching — hai bên cùng gửi ra một lúc.** A gửi tới `B_pub`, B gửi tới `A_pub`, **cùng lúc**. Gói đầu của A tới NAT B thì bị vứt — nhưng trên đường ra nó đã tạo mục ánh xạ ở **NAT A**; gói đầu của B cũng vậy. Từ gói thứ hai trở đi cả hai mục đều tồn tại và đường thông hai chiều. Mỗi bên tự đục lỗ ở NAT của **chính mình** bằng cách gửi ra.

**TURN — bỏ cuộc, dùng relay.** Khi hole punching thất bại, cách duy nhất còn lại là một máy chủ công cộng đứng giữa: A gửi cho TURN, TURN chuyển tiếp cho B và ngược lại. Cả hai bên chỉ gửi ra một đích công cộng nên NAT không cản — đúng cơ chế mục 3.2.

Vì sao hole punching thất bại? Vì NAT không hành xử giống nhau. Điểm khác biệt quyết định là **khi đổi đích đến, NAT có giữ nguyên port công cộng không**:

| Kiểu hành xử | Đổi đích thì port công cộng | Hole punching |
|---|---|---|
| Giữ nguyên port cho mọi đích (thường gọi là *cone*) | giữ nguyên | chạy được — A đoán đúng port của B |
| Cấp port mới cho mỗi đích (*symmetric*) | **đổi** | hỏng — port A biết được từ STUN không phải port B đang dùng để gửi cho A |
| Hai bên **đều** symmetric | đổi | gần như chắc chắn phải TURN |

*(Bốn thuật ngữ cổ điển — full cone, restricted, port-restricted, symmetric — mô tả thiết bị thực tế không chuẩn xác lắm; bảng trên rút về đúng thuộc tính quyết định.)*

**Tỉ lệ hole punching thành công là bao nhiêu?** Trung thực: **không có con số phổ quát.** Nó đổi theo tập người dùng (CGNAT di động nhiều hơn hẳn mạng gia đình), theo quốc gia, theo thời điểm, theo cả IPv6 đã phủ tới đâu. Các bên vận hành WebRTC quy mô lớn thường báo tỉ lệ phải rơi xuống TURN trong dải **một chữ số tới vài chục phần trăm**. Cách đúng duy nhất để có số cho hệ của mình: **đo trên chính tập người chơi của bạn**.

Nối về hai bài trước: **bài 3** nói fighting game chọn P2P + rollback vì cần RTT thấp nhất và chỉ có 2 người — cái giá của lựa chọn đó là toàn bộ mục này. **Bài 13** nói WebRTC bắt buộc đi kèm ICE/STUN/TURN; lý do là nó sinh ra cho P2P giữa hai trình duyệt.

---

## ⏸ Dừng lại — đoán trước #2

Sếp nói: *"Làm P2P đi, khỏi tốn tiền server."* Bạn có 10.000 cặp đấu 1v1 đồng thời.

Chọn mệnh đề đúng:

```
(a) Đúng — P2P không có server nào cả, chi phí bằng 0
(b) Gần đúng — chỉ tốn một server ghép trận nhỏ, không đáng kể
(c) Sai — vẫn phải nuôi STUN, và phần cặp phải dùng TURN tốn băng thông
    xấp xỉ bằng chạy dedicated server cho chính số cặp đó
(d) Sai — TURN đắt hơn dedicated server nhiều lần vì phải relay hai chiều
```

Tự ước lượng một con số Mbps rồi mới đọc tiếp.

---

### 3.4 "P2P khỏi tốn tiền server" — tính ra là thấy

Đáp án **(c)**. Fighting game rollback (bài 3, 22); mỗi gói mang input của 8 frame gần nhất để chịu mất gói, mỗi frame 2 byte:

```
payload = 8 × 2 = 16 B
header UDP + IPv4 = 28 B
gói = 44 B ; gửi 60 Hz  →  44 × 60 = 2.640 B/s = 2,58 KB/s mỗi chiều
```

Một cặp đi qua TURN: relay **nhận** từ A rồi **gửi** cho B, nhận từ B rồi gửi cho A. Băng thông ra của relay cho một cặp:

```
2.640 × 2 = 5.280 B/s = 5,16 KB/s mỗi cặp
```

10.000 cặp đồng thời, ba kịch bản tỉ lệ phải relay *(what-if, không phải số đo — xem mục 3.3)*:

| Tỉ lệ phải TURN | Số cặp relay | Băng thông ra | Quy ra Mbps |
|---|---|---|---|
| 5 % | 500 | 2,64 MB/s | 21,1 |
| 10 % | 1.000 | 5,28 MB/s | 42,2 |
| 20 % | 2.000 | 10,56 MB/s | 84,5 |

Đặt cạnh dedicated server cho **chính game đó**: server gửi state cho 2 người, gói cùng cỡ, cùng 60 Hz → **5.280 B/s mỗi cặp**. Giống hệt dòng TURN.

> **TURN relay tốn băng thông đúng bằng client-server.** Nó chuyển đúng từng ấy byte, chỉ khác là không chạy simulation.

Cộng thêm ba khoản mà "P2P miễn phí" bỏ qua:

- **STUN vẫn phải nuôi.** Băng thông rẻ thật — ~8 gói × 100 B = 800 B mỗi phiên, 10.000 phiên/phút cũng chỉ ~130 KB/s. Nhưng vẫn là dịch vụ IP công cộng chạy 24/7 có giám sát, và **là điểm chết đơn của việc vào trận**: STUN sập thì không ai ghép trận được, kể cả cặp lẽ ra hole punch được.
- **Server ghép trận vẫn phải có** — hai máy sau NAT không tự tìm thấy nhau.
- **Không có authority.** P2P là không có trọng tài, nên chương 8 phải làm lại theo cách khác và yếu hơn.

Cái P2P thật sự mua được là **RTT thấp hơn** (một chặng thay vì hai) và **CPU simulation bằng 0 phía bạn** — hai thứ đáng giá thật, nhưng không phải "khỏi tốn tiền server".

### 3.5 Vòng đời một kết nối

Quay về dedicated server. NAT hết là bài toán, nhưng kết nối vẫn có vòng đời phải thiết kế:

**1 — Handshake.** Client mở kết nối tới game node. Đây là gói đi RA đầu tiên, tức chính nó tạo mục ánh xạ NAT (mục 3.1). Mới chỉ có một socket, chưa có danh tính.

**2 — Xác thực bằng ticket đã ký.** Nửa stateless (login, bài 2) cấp cho client một **ticket đã ký** chứa `player_id`, `match_id`, hạn dùng. Game node **không gọi ngược về auth service** — chỉ verify chữ ký, một phép tính cục bộ, không I/O. Đó là lý do phải ký chứ không dùng session id tra DB: DB chậm hơn RAM 500.000 lần (bài 1), và đường vào trận không chịu nổi khoản đó khi 200 người vào cùng lúc.

**3 — Heartbeat.** Với game gửi input 60 Hz, **mọi gói input đã là heartbeat** — chỉ cần ghi `lastSeen`. Heartbeat riêng chỉ cần cho game im lặng dài (theo lượt), và để **giữ mục ánh xạ NAT sống**. Chỗ sau là chỗ mục 3.1 quay lại: nếu NAT tệ nhất hết hạn sau ~30 giây thì chu kỳ heartbeat phải **nhỏ hơn một nửa** con số đó — 15 giây — để một lần mất gói không làm mất luôn đường về. Giá: 44 B mỗi 15 giây = **2,9 B/s**.

**4 — Phát hiện chết.** Không nhận được gì trong T giây thì coi là chết. Chọn T thế nào là mục tiếp theo.

---

## ⏸ Dừng lại — đoán trước #3

Server 60 Hz, client gửi input mỗi tick. Chọn ngưỡng "coi như chết". Ngân sách độ trễ của bài 8 là 182 ms.

```
(a) 200 ms — bằng ngân sách độ trễ, mất quá đó là hỏng trải nghiệm rồi
(b) 1 giây  — 60 gói liên tiếp không tới thì chắc chắn có chuyện
(c) 5 giây  — đủ để sống sót qua một lần chuyển mạng
(d) 60 giây — người chơi vẫn muốn quay lại, giữ càng lâu càng tốt
```

Cái bẫy: câu hỏi đang trộn **hai quyết định khác nhau** thành một. Tìm ra chúng trước khi đọc tiếp.

---

### 3.6 Ngân sách timeout — tự dựng, không chép

Hai quyết định bị trộn:

```
T_dead  = bao lâu thì ĐÓNG SOCKET       (câu hỏi về mạng)
T_slot  = bao lâu thì GIẢI PHÓNG SLOT   (câu hỏi về sản phẩm)
```

Tách ra rồi thì cả bốn đáp án đều có phần đúng và không cái nào là đáp án. Dựng `T_dead` bằng hai ràng buộc ngược chiều.

**Chặn dưới — phải dài hơn cái tệ nhất ta muốn sống sót qua.** Ở 60 Hz mỗi gói cách nhau 16,67 ms, quy đổi thẳng ra số gói mất liên tiếp:

| Mất liên tiếp | Thời gian | Là chuyện gì |
|---|---|---|
| 6 gói | 100 ms | mất gói lác đác — bài 14 che bằng ack/gửi lại, **buffer nội suy 100 ms của bài 8 nuốt trọn** |
| 18 gói | 300 ms | một đợt tắc nghẽn; bài 6 cho thấy stall 300 ms làm nhảy cóc 216,7 ms |
| 60 gói | 1 s | Wi-Fi chập chờn, chuyển access point |
| 300 gói | **5 s** | chuyển Wi-Fi → 4G, đi qua vùng lõm sóng, tàu điện ngầm |

Chuyển mạng Wi-Fi → 4G mất bao lâu? Dải **vài trăm ms tới vài giây**, tuỳ thiết bị, nhà mạng và việc hệ điều hành có giữ hai đường song song hay không. *(Ước lượng bậc độ lớn, không phải số đo — cần số cho sản phẩm thì phải đo trên thiết bị thật.)* Muốn sống sót qua sự kiện đó, `T_dead` phải ở **vài giây**, không phải vài trăm ms.

**Chặn trên — nhưng không phải "kiên nhẫn người chơi" theo nghĩa bạn tưởng:**

> Kéo dài `T_dead` **không mua thêm trải nghiệm gì cho người mất mạng** — anh ta vẫn đang nhìn màn hình đứng hình; socket còn mở hay đã đóng không đổi được điều đó.

Chặn trên đến từ **chi phí giữ một socket vô dụng** và từ việc server cần biết sớm để bật AI thay thế hoặc báo cho đồng đội. Vùng hợp lý:

```
T_warn = 0,5 s   (30 gói)   → hiện biểu tượng mạng, client tiếp tục nội suy
T_dead = 5 s     (300 gói)  → đóng socket, giải phóng file descriptor
T_slot = 30–120 s            → tuỳ thể loại, xem mục 4
```

`T_dead` nằm ở bậc hoàn toàn khác ngân sách gameplay: **5.000 / 182 = 27,5 lần** ngân sách "bấm → người khác thấy" của bài 8. Đúng như mong muốn — `T_dead` là ngưỡng **sống/chết**, không phải ngưỡng chất lượng, và hai thứ đó không dùng chung con số được.

Sai lầm hay gặp: đặt `T_dead` = 1 s cho "phản ứng nhanh" — mọi lần chuyển mạng thành một lần chết giả, và hệ thống tự tay tạo ra chính triệu chứng ở mục 2.

### 3.7 Reconnect: giữ gì, và nhận lại danh tính bằng gì

`T_dead` hết hạn không có nghĩa là trận kết thúc với người đó. Đây là chỗ tách giữa một hệ thống mạng đúng và một sản phẩm đúng.

<svg viewBox="0 0 700 240" role="img" aria-labelledby="gs16-b-t gs16-b-d" style="width:100%;height:auto">
<title id="gs16-b-t">Bốn giai đoạn sau khi gói tin ngừng tới</title>
<desc id="gs16-b-d">Trục thời gian không theo tỉ lệ, chia bốn vùng: nửa giây đầu là mất gói bình thường, từ nửa giây tới năm giây là nghi ngờ và hiện biểu tượng mạng, từ năm tới sáu mươi giây thì socket đã đóng nhưng slot vẫn được giữ, sau sáu mươi giây thì slot được giải phóng và người chơi mất trận. Một mũi tên chỉ lên ở giây thứ mười hai cho thấy reconnect thành công vì token còn hạn.</desc>
<text x="15" y="20" font-size="12" font-weight="bold" fill="currentColor">SAU KHI GÓI TIN NGỪNG TỚI</text>
<text x="15" y="36" font-size="9" fill="currentColor" opacity="0.7">trục thời gian KHÔNG theo tỉ lệ</text>
<rect x="60" y="52" width="140" height="46" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="200" y="52" width="200" height="46" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="400" y="52" width="160" height="46" fill="#ef4444" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.25"/>
<rect x="560" y="52" width="100" height="46" fill="#64748b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.25"/>
<text x="130" y="72" text-anchor="middle" font-size="9" fill="currentColor">mất gói bình thường</text>
<text x="130" y="87" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.75">ack/gửi lại che được</text>
<text x="300" y="72" text-anchor="middle" font-size="9" fill="currentColor">nghi ngờ · biểu tượng mạng</text>
<text x="300" y="87" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.75">socket còn mở, client nội suy</text>
<text x="480" y="72" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">socket đóng · GIỮ SLOT</text>
<text x="480" y="87" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.75">state còn, token còn hạn</text>
<text x="610" y="72" text-anchor="middle" font-size="9" fill="currentColor">giải phóng</text>
<text x="610" y="87" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.75">mất trận</text>
<line x1="60" y1="108" x2="660" y2="108" stroke="currentColor" stroke-opacity="0.45"/>
<line x1="60" y1="102" x2="60" y2="114" stroke="currentColor" stroke-opacity="0.45"/>
<line x1="200" y1="102" x2="200" y2="114" stroke="currentColor" stroke-opacity="0.45"/>
<line x1="400" y1="102" x2="400" y2="114" stroke="currentColor" stroke-opacity="0.45"/>
<line x1="560" y1="102" x2="560" y2="114" stroke="currentColor" stroke-opacity="0.45"/>
<text x="60" y="128" text-anchor="middle" font-size="9" fill="currentColor">0</text>
<text x="200" y="128" text-anchor="middle" font-size="9" fill="currentColor">T_warn 0,5 s</text>
<text x="400" y="128" text-anchor="middle" font-size="9" fill="currentColor">T_dead 5 s</text>
<text x="560" y="128" text-anchor="middle" font-size="9" fill="currentColor">T_slot 60 s</text>
<line x1="480" y1="200" x2="480" y2="116" stroke="#3b82f6" stroke-width="2"/>
<polygon points="480,110 475,122 485,122" fill="#3b82f6"/>
<text x="480" y="216" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">reconnect ở giây 12 — vào lại ĐÚNG trận đó</text>
<text x="480" y="230" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">socket mới, IP/port mới, danh tính cũ</text>
</svg>

Bốn thứ phải thiết kế, và chỉ bốn.

**1 — Giữ cái gì.** Bài 1 chia state ba tầng; ở đây chỉ giữ đúng hai thứ:
- **Slot trong simulation** — entity của người chơi vẫn ở trong world, **không** bị xoá, nhưng cần một trạng thái để game biết cư xử: đứng im, bất tử tạm thời, hay bị AI điều khiển. Đây là **quyết định gameplay**, không phải hạ tầng.
- **Session record** ở tầng session (Redis, bài 1): `player_id → match_id, game_node, hạn reconnect`. Nó cho phép người chơi mở lại app từ đầu, hỏi "tôi đang ở trận nào" và được trả về đúng node.

Không cần giữ socket hay buffer gói chưa gửi. Snapshot cũ vô giá trị — xem mục 3 dưới.

**2 — Nhận lại danh tính bằng gì.** Socket mới có IP/port mới nên nhận dạng theo địa chỉ là **sai từ gốc**. Dùng lại cơ chế mục 3.5: một **resume token** đã ký, cấp lúc vào trận, chứa `player_id + match_id + hạn`, verify bằng chữ ký, không I/O. Ba tính chất bắt buộc: **hạn đúng bằng `T_slot`** (token sống lâu hơn slot là lỗ hổng chứ không phải tiện ích); **gắn `match_id`**; **dùng một lần hoặc có số thứ tự** — nếu không, kẻ nghe lén phát lại token chính là chiếm phiên, bài 34 gọi nó là replay attack.

**3 — Client đồng bộ lại cái gì.** Đây là chỗ trực giác backend dẫn bạn đi sai. Bản năng nói: gửi những gì client đã bỏ lỡ. Tính thử: 4 giây × 60 Hz = **240 tick**; chạy lại 240 tick với 1.000 entity tốn 240 × 1,18 µs = **0,283 ms** — rẻ như cho. Nhưng nó **không chạy được**: client không có input của 9 người kia trong 4 giây đó, và thiếu chúng thì không replay được gì (bài 9 — determinism cần **cùng chuỗi input**, không chỉ cùng code). Kể cả chạy được cũng vô nghĩa: người chơi cần biết thế giới **bây giờ**. Nên:

> Reconnect **không** phát lại lịch sử. Nó gửi **một full snapshot** của trạng thái hiện tại — đúng như snapshot đầu tiên lúc vào trận — rồi client bắt đầu nhận delta từ đó. Toàn bộ baseline delta compression cũ (bài 25) bị vứt.

Rồi client phải khớp lại **tick number** trước khi được gửi input tiếp — nó vừa lỡ 240 tick, đồng hồ mô phỏng sai hẳn một khoảng. Bài 17 mở bằng đúng cơ chế đó.

**4 — Đổi mạng thì sao.** Wi-Fi → 4G đổi cả IP lẫn port, nên với UDP thuần hay TCP, kết nối cũ **chết chắc chắn** — không phải "có thể chết". Đây là chỗ **connection ID của QUIC** (bài 13) giải quyết ở tầng dưới: QUIC nhận dạng kết nối bằng một ID nằm trong gói tin, không bằng bộ bốn (IP nguồn, port nguồn, IP đích, port đích). Đổi mạng thì gói đổi địa chỉ nhưng connection ID không đổi, server nối tiếp phiên cũ mà không cần handshake lại.

Điều đó **không** làm cơ chế reconnect ở trên thành thừa: nó chỉ chuyển các ca đổi mạng mà thiết bị vẫn gửi được liên tục từ "reconnect" xuống "không ai nhận ra có chuyện gì". Ca 4 giây tắt sóng hẳn thì QUIC cũng chịu, vì không có gói nào để mang connection ID đi. **Bạn cần cả hai tầng.**

---

## 4. Bảng quyết định: giữ slot bao lâu

`T_slot` là quyết định sản phẩm, không phải kỹ thuật. Tiêu chí duy nhất: **bỏ trận làm hỏng trận của bao nhiêu người khác.**

| Thể loại | Thời lượng | `T_slot` | Vì sao |
|---|---|---|---|
| Fighting 1v1 (bài 3, P2P) | 60–99 s | **0–10 s** | Trận ngắn hơn thời gian chờ; giữ = bắt đối thủ đứng nhìn |
| .io casual | vài phút | **0** | Vào lại là trận mới; không ai mất gì |
| Battle royale | 20–30 phút | **60–120 s** | Chết rồi thì thôi; còn sống mà treo là mồi ngon |
| FPS 5v5 ranked | 30–40 phút | **90–120 s** | 1 người treo = **10 %** đội hình; có phạt AFK để chống lạm dụng |
| MOBA 5v5 | 30–45 phút | **tới hết trận** | Bỏ 1 người phá trận của **9 người kia**; luôn cho vào lại |
| MMO thế giới mở | không có "trận" | **60–300 s** | Nhân vật đứng im trong world là rủi ro gameplay thật |

*(Dải theo thông lệ ngành và logic ở cột phải, không phải số đo; mỗi studio chọn khác nhau.)*

**Cái giá của việc giữ.** Dùng lại số mục 2 (50.000 CCU, trận 18 phút, 1,5 %):

```
tốc độ rớt toàn hệ = 50.000 / 1.080 × 1,5 % = 0,694 người/giây
slot treo đồng thời = 0,694 × T_slot
```

| `T_slot` | Slot treo đồng thời | % CCU | % số trận có người treo (5.000 trận) |
|---|---|---|---|
| 10 s | 6,9 | 0,014 % | 0,14 % |
| 60 s | 41,7 | 0,083 % | 0,83 % |
| 120 s | 83,3 | 0,167 % | 1,67 % |
| 540 s (nửa trận) | 375 | 0,750 % | **7,5 %** |

*(Cận trên — công thức coi như KHÔNG AI quay lại. Người quay lại ở giây 12 chỉ chiếm chỗ 12 giây chứ không phải cả `T_slot`, nên số thật thấp hơn.)*

Hai cột bên phải nói hai chuyện khác hẳn nhau, và chỉ cột cuối đáng sợ.

**Cột "% CCU" — chi phí hạ tầng — gần như bằng không.** Session record vài KB: 41,7 slot × 8 KB = **0,33 MB**. Entity treo vẫn nằm trong simulation, nhưng bài 8 đã đo 100.000 entity tốn 0,71 % một tick; vài chục cái không hiện lên biểu đồ nào.

> Cái đắt của việc giữ slot **không phải RAM, không phải CPU, không phải slot**. Đó là phản xạ backend, và ở đây nó sai.

**Cột cuối — chi phí gameplay — mới là chỗ trả giá.** Với chính sách MOBA "giữ tới hết trận", **7,5 % số trận đang diễn ra có ít nhất một người treo**. Trận 5v5 mất một người là đội đó chơi 4 đánh 5, và 9 người còn lại không ai gây ra chuyện đó. Nên quy tắc chọn `T_slot` không phải "giữ được bao nhiêu thì giữ":

> **`T_slot` = khoảng thời gian mà chờ một người quay lại vẫn rẻ hơn việc trận đó hỏng cho tất cả những người khác.** Vượt quá đó, giữ thêm là lấy trải nghiệm của N−1 người đi trợ giá cho 1 người.

Đó là lý do giải pháp thật luôn tấn công **cả hai vế**: giữ slot **cộng với** AI tạm điều khiển, cho đầu hàng sớm, và phạt người lạm dụng. `T_slot` một mình không giải quyết được gì.

---

## 5. Tính tay

**Bài 1.** Game ở mục 2 chuyển sang thể loại theo lượt: người chơi có thể im lặng **90 giây** giữa hai nước đi. NAT tệ nhất trong tập người chơi hết hạn mục ánh xạ sau **30 giây**.
- Chu kỳ heartbeat lớn nhất còn an toàn là bao nhiêu, nếu muốn chịu được **hai** lần mất gói liên tiếp?
- Với gói 44 B, mỗi người tốn bao nhiêu B/s? 50.000 CCU thì bao nhiêu KB/s chiều vào?
- Bỏ heartbeat hẳn thì hỏng **theo kiểu gì** — người chơi thấy gì trên màn hình, và ai phát hiện ra trước?

**Bài 2.** Vẫn 50.000 CCU, trận 18 phút, nhưng tỉ lệ sự cố **3 %** thay vì 1,5 % (thị trường chơi 4G nhiều).
- Bao nhiêu lần mất kết nối mỗi ngày? Mỗi phút?
- Với `T_slot` = 120 s, bao nhiêu slot treo đồng thời, và bao nhiêu phần trăm trong 5.000 trận có người treo?
- Đội đề xuất giảm `T_slot` xuống 30 s để "sạch hệ thống": tiết kiệm bao nhiêu MB RAM (8 KB/slot), và thêm bao nhiêu người mỗi ngày mất trận? So hai con số rồi kết luận.

**Bài 3.** Fighting game P2P ở mục 3.4, nhưng bạn đo được **12 %** số cặp phải dùng TURN, quy mô **40.000 cặp đồng thời**.
- Băng thông ra của TURN là bao nhiêu MB/s và Mbps?
- Chuyển hẳn sang dedicated server cho **toàn bộ** 40.000 cặp thì băng thông ra là bao nhiêu, gấp mấy lần phương án TURN?
- Con số đó có bằng đúng `1 / 12 %` không? Nếu bằng, giải thích vì sao; nếu không, tìm thừa số còn thiếu.

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm một game cờ vua online có xếp hạng**, đồng hồ 10 phút mỗi bên, người chơi phần lớn dùng điện thoại trên đường đi làm. Hết giờ là thua thật — một phần luật chơi.

1. Kết nối im lặng tới 90 giây giữa hai nước đi. Cơ chế nào ở mục 3.5 trở thành bắt buộc, và tham số của nó lấy từ đâu?
2. Người chơi mất mạng 40 giây. Đồng hồ của anh ta có chạy không? Trả lời cả hai phương án và nói mỗi phương án bị lạm dụng thế nào.
3. `T_slot` cho game này là bao nhiêu? Tiêu chí "bỏ trận làm hỏng trận của bao nhiêu người" cho ra kết quả gì khi N = 2?
4. Sau reconnect, client cần đồng bộ lại gì? So với danh sách mục 3.7 — cái nào biến mất hoàn toàn, và tính chất nào của cờ vua khiến nó biến mất?
5. Đối thủ phát hiện quy tắc và bắt đầu **cố tình rút mạng** mỗi khi ở thế thua để câu giờ suy nghĩ. Chặn bằng cách nào mà không phạt oan người thật sự mất sóng trong thang máy — và cần đo cái gì để phân biệt hai nhóm?
6. **Câu khó nhất:** bạn dùng QUIC connection ID (bài 13) để người chơi chuyển Wi-Fi → 4G không đứt phiên. Nhưng connection ID là một giá trị **nằm trong gói tin**. Nếu kẻ tấn công lấy được connection ID của người khác — nghe lén trên Wi-Fi công cộng chẳng hạn — rồi gửi gói mang ID đó từ IP của mình thì chuyện gì xảy ra? Thiết kế của QUIC phải có gì để điều đó không thành chiếm phiên, và **cái đó có thay thế được resume token đã ký ở mục 3.7 không, hay hai thứ bảo vệ hai thứ khác nhau?**

Câu 6 là chỗ tầng vận chuyển và tầng ứng dụng chạm nhau — trả lời được nghĩa là biết vì sao không tầng nào làm thay tầng nào được.

---

## 7. Tóm tắt

- NAT tồn tại vì IPv4 cạn; bảng của nó ánh xạ `(IP nội bộ, port) ↔ (IP công cộng, port)`. **Mục ánh xạ chỉ sinh ra khi có gói đi RA** — quy tắc duy nhất cần nhớ, mọi thứ còn lại suy ra từ nó.
- **Với dedicated server, NAT không phải là bài toán.** Client luôn gọi trước nên đường về tự mở: không STUN, không hole punching, không TURN, không một dòng code nào.
- P2P là bế tắc đối xứng. Gỡ bằng **STUN** → **hole punching** (mỗi bên tự đục lỗ ở NAT của chính mình) → **TURN** khi thất bại. Hole punching hỏng khi NAT **đổi port công cộng theo từng đích** (symmetric); tỉ lệ thất bại **không có con số phổ quát**, phải tự đo.
- **"P2P khỏi tốn tiền server" là sai.** TURN relay 5,16 KB/s mỗi cặp — **đúng bằng** dedicated server cho cùng game đó; 10.000 cặp với 10 % phải relay là **42,2 Mbps**. Cộng STUN nuôi 24/7 (điểm chết đơn của việc vào trận), server ghép trận, và mất hẳn authority.
- Vòng đời: handshake → **ticket đã ký** verify cục bộ không I/O (bài 2) → heartbeat, vừa phát hiện chết vừa **giữ mục ánh xạ NAT sống** (chu kỳ < một nửa thời hạn NAT tệ nhất) → timeout.
- **`T_dead` và `T_slot` là hai quyết định khác nhau.** `T_dead` ≈ **5 s = 300 gói ở 60 Hz** — đủ sống sót qua một lần chuyển mạng, và bằng 27,5 lần ngân sách 182 ms của bài 8 vì nó là ngưỡng sống/chết chứ không phải ngưỡng chất lượng. Đặt 1 s là tự tạo ra chết giả.
- Reconnect cần đúng bốn thứ: giữ **slot + session record**; **resume token đã ký**, hạn bằng `T_slot`, gắn `match_id`, dùng một lần; gửi **full snapshot hiện tại** chứ không phát lại 240 tick đã lỡ (thiếu input của người khác thì không replay được — bài 9); rồi **khớp lại tick number** (bài 17).
- Wi-Fi → 4G đổi cả IP lẫn port nên kết nối cũ **chết chắc chắn**. **Connection ID của QUIC** (bài 13) cứu ca còn gửi được gói, **không** cứu ca tắt sóng hẳn — cần cả hai tầng.
- Giá của việc giữ slot **không nằm ở hạ tầng**: 41,7 slot × 8 KB = **0,33 MB**. Nó nằm ở gameplay — "giữ tới hết trận" cho ra **7,5 % số trận có người treo**, tức 9 người chơi 4-đánh-5 để đợi 1 người.

→ **Chương 5 — Netcode lõi.** Bốn chương vừa rồi dựng xong đường ống: simulation chạy đúng nhịp, chạy lại được y hệt, và gói tin tới nơi. Bài 17 mở chương quan trọng nhất của course — làm cho người chơi cảm thấy TỨC THÌ trong khi sự thật là mọi thứ họ thấy đều đã cũ.
