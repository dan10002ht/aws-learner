# Roadmap — Game Server Engineering

Lộ trình học **kỹ thuật server cho game online real-time**, từ mô hình tư duy tới hệ thống
chạy production. Đích đến: tự thiết kế, viết và vận hành được authoritative game server, và
đọc/review được kiến trúc game backend của người khác.

Đối tượng: **dev backend đã có nghề** (web/API/microservice) muốn bước sang game. Không cần
biết gì về game engine hay đồ hoạ — course này không đụng tới render.

Ngôn ngữ code trong bài: **Go** (goroutine/channel hợp với mô hình room-per-goroutine, GC là
chỗ đau thật nên dạy được nhiều). Mọi khái niệm đều độc lập ngôn ngữ; chỗ nào phụ thuộc
runtime sẽ ghi rõ.

---

## Vì sao course này tồn tại tách khỏi Backend / Distributed Systems

Game server **không phải** một microservice chạy nhanh hơn. Nó đảo ngược ba giả định nền
của backend truyền thống:

| Giả định của BE App | Ở game server |
|---|---|
| Công việc do **request** khởi tạo. Không request = không tốn gì. | Công việc do **thời gian** khởi tạo. Không ai gửi gì, server vẫn phải chạy 60 lần/giây. |
| State ở DB; process **stateless**, node nào xử lý cũng được. | State ở **RAM của đúng một process**; DB chậm hơn RAM 500.000 lần nên không được nằm trên đường tick. |
| **Chậm là chậm** — trả lời muộn vẫn là trả lời đúng. | **Chậm bằng hỏng** — kết quả đúng trả về muộn 500 ms là kết quả sai. |
| Client là bên gọi API, tin được ở mức "nó nói nó bấm nút". | Client là binary chạy trên máy người lạ, **đã bị dịch ngược từ lâu**. |

Ba hệ quả đó kéo theo toàn bộ phần còn lại: tick loop, determinism, prediction,
interest management, room affinity, drain thay cho rolling deploy.

---

## Bản đồ 10 chương

```
NỀN TẢNG                     ┌── Ch.1  Mô hình tư duy
                             ├── Ch.2  Thời gian & vòng lặp
                             └── Ch.3  Determinism
                                        │
MẠNG                         ┌── Ch.4  Mạng nền tảng (TCP/UDP/QUIC/NAT)
                             │
NETCODE ─── trái tim ───────▶├── Ch.5  Netcode lõi ⭐ (prediction/reconciliation/lag comp)
                             └── Ch.6  Đồng bộ state & băng thông
                                        │
HỆ THỐNG                     ┌── Ch.7  Kiến trúc & scale
                             ├── Ch.8  Chống gian lận
                             └── Ch.9  Hiệu năng & vận hành
                                        │
                                 Ch.10  Capstone — agar-lite
```

Thứ tự là **dây suy diễn**, không phải danh sách: Ch.2 sinh ra nhu cầu Ch.3; Ch.3 là điều
kiện để Ch.5 chạy được; Ch.5 quyết định Ch.6 gửi cái gì; Ch.7 quyết định Ch.6 gửi cho ai.

---

## Chương 1 — Mô hình tư duy (4 bài)

Đổi cách nghĩ trước khi đụng dòng code nào.

| # | Bài | Nội dung lõi |
|---|---|---|
| 1 | Vì sao game server không thể là một BE App | Thiết kế Redis N² vỡ ở người thứ 6 với CPU 8%; RAM-first; stateful; một trận một chủ sở hữu |
| 2 | Bản đồ một hệ thống game online | Nửa stateless (login/shop/leaderboard) vs nửa stateful (gateway → game node → simulation); ranh giới giữa hai nửa |
| 3 | Thể loại game quyết định netcode | Cờ vua → RTS lockstep → MOBA → FPS → MMO → .io; bảng yêu cầu độ trễ/tick/băng thông; vì sao không có "netcode đúng" |
| 4 | Lịch sử netcode: 1993 tới nay | Doom lockstep → Quake client-server → QuakeWorld prediction (Carmack) → Valve lag compensation (Bernier, GDC 2001) → GGPO rollback |

## Chương 2 — Thời gian & vòng lặp (4 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 5 | Fixed timestep: vì sao dt phải là hằng số | Tích phân rời rạc; cùng công thức 30/60/144 Hz ra 3 kết quả; sai số giảm một nửa mỗi lần gấp đôi Hz; "giống nhau" quan trọng hơn "chính xác" |
| 6 | Accumulator, catch-up & spiral of death | Nối thời gian thật với thời gian mô phỏng; số tick ≠ số sim step; `MaxCatchUp` và công thức `dropped = floor(stall/dt) − MaxCatchUp` |
| 7 | Đồng hồ & scheduling: drift, jitter, lateness | `sleep(dt)` vs deadline tuyệt đối; drift cộng dồn và tăng theo tải; monotonic vs wall clock; busy-wait đổi CPU lấy p99; vì sao metric luôn xanh là metric không so với gì cả |
| 8 | Ba loại nhịp & ngân sách độ trễ | sim tick / snapshot rate / render FPS; bóc tách 182 ms từ lúc bấm tới lúc người khác thấy; tối ưu chỗ ăn nhiều nhất chứ không phải chỗ dễ đo |

## Chương 3 — Determinism (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 9 | Determinism dùng để làm gì | Bốn thứ dựng trên nó: reconciliation, replay, rollback, anti-cheat; vì sao không thể bổ sung sau |
| 10 | Những kẻ giết determinism | IEEE-754 và FMA/thứ tự phép tính; ARM vs x86; hàm siêu việt; map order của Go; `rand` toàn cục; thứ tự duyệt entity; multi-thread |
| 11 | Fixed-point & simulation tất định tuyệt đối | Vì sao rollback thật phải bỏ float; số nguyên Q16.16; sqrt/sin bằng bảng tra; test đối chiếu hai nền tảng |

## Chương 4 — Mạng nền tảng (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 12 | TCP hay UDP: tính bằng số | Head-of-line blocking: một packet mất làm nghẽn cả stream sau nó; vì sao game action thà mất gói còn hơn chờ; khi nào TCP vẫn đúng |
| 13 | WebSocket, QUIC & WebTransport | Game chạy trên trình duyệt bị ràng buộc gì; QUIC stream & datagram; WebTransport thay thế WebSocket ở đâu |
| 14 | Tự viết reliability layer trên UDP | Sequence number, ack bitfield kiểu Fiedler, RTT/RTO ước lượng, reliable-ordered vs unreliable-sequenced cho từng loại message |
| 15 | Giới hạn vật lý của gói tin: MTU, loss, jitter | MTU và mốc ~1200 byte an toàn; fragmentation nhân xác suất mất gói; packet loss vs jitter vs bandwidth; vì sao snapshot phải tự giới hạn kích thước |
| 16 | NAT, vòng đời kết nối & phục hồi | Vì sao dedicated server không cần hole punching còn P2P thì cần; STUN/TURN; connection lifecycle; reconnect & session resume không mất trận |

## Chương 5 — Netcode lõi ⭐ (6 bài)

Trái tim của course. Ai qua được chương này là qua được cửa "BE App → BE Game".

| # | Bài | Nội dung lõi |
|---|---|---|
| 17 | Input pipeline & đồng bộ tick client–server | Input có `seq` + tick; client chạy trước server một khoảng; input buffer ở server; sửa lệch bằng co giãn tick chứ không nhảy |
| 18 | Client-side prediction | Client apply input ngay, giữ buffer chưa được ack; vì sao logic phải dùng chung client/server; cái giá: viết luật chơi hai lần |
| 19 | Server reconciliation & rewind-replay | Nhận state kèm `lastProcessedSeq` → rewind → replay; ngưỡng bỏ qua sai lệch nhỏ; vì sao lệch một chút là rung liên tục |
| 20 | Entity interpolation & extrapolation | Render trễ 2 snapshot để mượt; đánh đổi 100 ms độ trễ lấy mượt; khi nào extrapolate và vì sao nó tạo "cao su" |
| 21 | Lag compensation: tua ngược thế giới | Server lưu lịch sử vị trí ~1 giây, tua ngược world về thời điểm người bắn đã thấy; vì sao bạn chết sau khi đã nấp; giới hạn công bằng |
| 22 | Rollback netcode (GGPO) & lockstep | GGPO: tua ngược 7 frame, thay input, chạy lại trong 1 frame; vì sao fighting game chọn nhánh này; lockstep cho RTS; điều kiện determinism tuyệt đối |

## Chương 6 — Đồng bộ state & băng thông (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 23 | Ba mô hình replication: snapshot, delta, event | Full snapshot vs delta vs event-based; ai chịu được mất gói, ai không; vì sao event-based cần reliable |
| 24 | Serialization & quantization | JSON → binary đo bằng số; float32 → int16 theo lưới; góc 1 byte; bit packing; versioning schema khi client cũ chưa update |
| 25 | Delta compression & baseline | Baseline theo snapshot client đã ack; vòng đời baseline; chuyện gì xảy ra khi ack mất; bộ nhớ phải giữ bao nhiêu snapshot |
| 26 | Area of Interest & interest management | Grid/cell, radius, visibility; vì sao AOI giảm băng thông nhiều hơn mọi thủ thuật serialization; entity vào/ra tầm nhìn |
| 27 | Priority & ngân sách băng thông | Không phải entity nào cũng đáng gửi mỗi tick; priority accumulator; đóng gói vừa MTU; đo bytes/player/s và quy ra tiền |

## Chương 7 — Kiến trúc & scale (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 28 | Room model & concurrency | Mỗi room = 1 goroutine simulation + inbox channel; reader goroutine per connection; vì sao simulation phải single-threaded; data race kinh điển |
| 29 | Gateway vs game node | Gateway lo auth/WebSocket, game node lo simulation; routing theo `match_id`; vì sao LB round-robin sai ở đây |
| 30 | Matchmaking: queue, MMR, region | Queue, MMR/ELO, region & ping, thời gian chờ vs chất lượng trận; backfill; vì sao matchmaking là bài toán tối ưu chứ không phải hàng đợi |
| 31 | Persistence, meta services & graceful shutdown | Ba tầng state (simulation/session/persistent); DB ngoài critical path; snapshot theo chu kỳ; graceful shutdown & drain |
| 32 | Sharding world & cross-node handoff | Chia zone/grid khi một trận quá đông; cross-node entity handoff; vì sao cắt thế giới là quyết định thiết kế game chứ không phải hạ tầng |

## Chương 8 — Chống gian lận (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 33 | Authority: client gửi ý định, không gửi kết quả | Client gửi ý định, không gửi kết quả; mọi tham số trỏ tới thế giới là một khẳng định cần kiểm chứng; cái giá của authoritative |
| 34 | Phân loại cheat & phòng thủ server-side | Speed hack, teleport, aimbot, wallhack, item dup, replay attack; cái nào server chặn được tuyệt đối, cái nào chỉ giảm được |
| 35 | Phát hiện gian lận & vận hành | Thống kê server-side (aim pattern, input bất khả thi); replay verification; anti-cheat phía client và giới hạn của nó; xử lý false positive |

## Chương 9 — Hiệu năng & vận hành (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 36 | Đo cái gì và đo thế nào | Ngân sách một tick đi đâu; luôn nhìn p99 không nhìn trung bình; tick time, số tick trễ, bytes/player/s, RTT phân phối; pprof |
| 37 | Zero-allocation hot loop & bố trí dữ liệu | GC là kẻ thù; pre-allocate, `sync.Pool`, tránh interface boxing/closure; `GOGC`/`GOMEMLIMIT`; bố trí dữ liệu quan trọng hơn số phép tính (SoA/ECS-lite) |
| 38 | Concurrency đúng cách trong game server | 1 goroutine/connection cho I/O, single-threaded cho simulation; channel vs mutex; backpressure khi client chậm; tránh goroutine leak |
| 39 | Load test bằng bot client headless | Bot dùng lại client code thật; hành vi phải động; chạy bot ở máy khác; đo cả phía client; tìm cái gãy trước — CPU, băng thông hay fd |
| 40 | Deploy & vận hành hệ stateful | Drain thay cho rolling deploy; orchestration (Agones/k8s) và allocation; scale theo số trận không theo CPU; chi phí theo CCU |

## Chương 10 — Capstone (2 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 41 | Capstone 1: agar-lite chạy được | Tick loop + WebSocket + room; input → simulation → broadcast; cố ý thêm độ trễ giả lập để *cảm* thấy 182 ms |
| 42 | Capstone 2: agar-lite chơi được | Prediction + reconciliation + interpolation; AOI; hit detection có lag compensation; đo lại toàn bộ số và so với chương 2 |

---

## Cách học

- **Chương 1–3 đọc liền**, đừng nhảy cóc: chương 3 không có nghĩa nếu chưa qua chương 2.
- **Chương 5 là chỗ dừng lại lâu nhất.** Làm lần lượt từng kỹ thuật, đo lại cảm giác sau mỗi cái.
- **Chương 4 và 6 có thể đọc sau chương 5** nếu bạn sốt ruột muốn chạm netcode sớm — nhưng
  phải quay lại trước khi tối ưu bất cứ thứ gì.
- Mỗi bài có phần tính tay. **Làm bằng giấy trước khi đọc đáp án** — phần lớn giá trị nằm ở
  chỗ phát hiện mình đoán sai.

## Liên quan tới course khác trong hệ thống

| Course | Dùng để làm gì ở đây |
|---|---|
| `PROGRAMMING` | Điều kiện cần — course này giả định đọc được code |
| `DISTRIBUTED` | Chương 3 và 7 nhẹ hơn nhiều nếu đã có CAP, replication, consensus |
| `BACKEND` | Chương 7 (kiến trúc, persistence) nối thẳng vào kiến thức BE App |
| `SRE` | Chương 9 dùng chung tư duy đo lường, p99, incident |
| `CLOUDNATIVE` | Chương 9 bài 40 giả định biết k8s cơ bản khi nói về Agones |
