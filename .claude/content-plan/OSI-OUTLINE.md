# Outline — Bài "Mô hình 7 tầng (OSI) + bản đồ xuyên tầng" (course ENGINEER)

> Deliverable của P1. Các iteration sau (kể cả phiên mới) đọc file này + `OSI.json` để tiếp tục.
> State plan: `node .claude/skills/build-content-loop/scripts/plan.mjs status OSI`.

## Quyết định đã chốt (LOCK)

| Mục | Giá trị |
|---|---|
| slug | `eng-osi-model` |
| file | `lessons/engineering/eng-osi-model.md` |
| title | `Mô hình 7 tầng (OSI) — bản đồ mạng & các vấn đề xuyên tầng` |
| shortTitle | `Mô hình 7 tầng` |
| courseId | `ENGINEER` |
| chapter | `eng-ch2` (Mạng thực hành) — đặt **đầu chương** |
| order | `1.5` (xen giữa eng-01=1 và eng-02=2; KHÔNG đánh số lại các bài cũ) |
| description | `Bản đồ OSI 7 tầng & TCP/IP; bù tầng L1/L2 (Ethernet/MAC/ARP/switch/VLAN); encapsulation; bảng xuyên tầng caching / security (defense-in-depth) / debug & performance theo từng tầng; ví dụ end-to-end gõ URL.` |
| đăng ký | thêm entry vào `web/data/lessons.ts` + prepend slug vào `eng-ch2.lessonSlugs` |
| quiz prefix | `eng` (chung course); id quiz cũ tới `eng-q-078` → bài này bắt đầu **eng-q-079** |
| quiz lesson field | `eng-osi-model`; ~13 câu; ~15% multi; 30/50/20 easy/med/hard |

## Nguyên tắc nội dung (để KHÔNG trùng + đúng vai "xương sống")

- Đây là **bản đồ tổng**: cho khung 7 tầng trước, rồi trỏ vào các bài deep-dive đã có.
- **KHÔNG** dạy lại sâu CIDR/subnetting → link `[[eng-02-cidr-subnetting]]`.
- **KHÔNG** dạy lại sâu TCP/UDP/TLS/HTTP versions → link `[[eng-03-tcp-tls]]`.
- **LẤP khoảng trống thật**: tầng 1 (Physical) và tầng 2 (Data Link: Ethernet, MAC, frame, switch, ARP, broadcast/collision domain, VLAN) — hiện chưa course nào dạy.
- Cross-link: `[[be-03-caching]]`, `[[intro-02-networking]]`, security course (`sec-01`, `sec-02`, `sec-05`), saa `ch3-02-network-security`.
- Giọng văn: như `eng-02`/`eng-03` — analogy đời thường, "💡 Ghi nhớ", "⚠️ Lỗi thường gặp", bảng, code/CLI thực hành ngắn, tính tay con số. Tiếng Việt CÓ DẤU.
- Code/CLI trong code-fence ```...``` (RichText render được); viết `<` `>` trực tiếp, không entity.

## Cấu trúc bài (13 mục)

### Nhóm P2 (draft-A): mục 1–5
1. **Vì sao cần phân tầng** — chia để trị; mỗi tầng một việc; thay 1 tầng không phá tầng khác (vd đổi WiFi→cáp mà app không đổi). Analogy gửi thư qua bưu điện (người viết → phong bì/địa chỉ → bưu cục → xe tải → ...).
2. **OSI 7 tầng — bảng tổng quan**: cột [Tầng | Tên VN/EN | PDU | Làm gì | Ví dụ giao thức/thiết bị]. Kèm câu thần chú nhớ (Anh-Việt): "All People Seem To Need Data Processing" / mẹo nhớ tiếng Việt.
3. **Mô hình TCP/IP & ánh xạ OSI** — vì sao thực tế dùng 4–5 tầng; L5/6/7 gộp = Application; bảng map OSI↔TCP/IP. "OSI để học/nói chuyện, TCP/IP để chạy thật."
4. **Encapsulation / Decapsulation** — đi xuống thêm header, đi lên bóc header; PDU đổi tên Data→Segment(L4)→Packet(L3)→Frame(L2)→Bits(L1). Sơ đồ chồng header `[Eth[IP[TCP[HTTP]]]]`. MTU/fragmentation nhắc nhẹ.
5. **Tầng 1–2 (BÙ GAP — viết kỹ nhất)**:
   - L1 Physical: bit thành tín hiệu (điện/quang/sóng); cáp đồng/quang/WiFi; NIC; hub; lỗi L1 (cáp lỏng, nhiễu).
   - L2 Data Link: **MAC address** (48-bit, OUI), **frame**, **Ethernet**; **switch** học MAC table & forward theo MAC; **ARP** = cầu nối L3↔L2 (IP→MAC), walkthrough + `ip neigh`/`arp -a`; **collision domain vs broadcast domain**; **VLAN** chia broadcast domain; switch (L2) vs router (L3).
   - ⚠️ Lỗi thường gặp: ARP cache cũ, duplicate IP, broadcast storm.

### Nhóm P3 (draft-B): mục 6–9
6. **Tầng 3–4 (tóm tắt + trỏ deep-dive)** — L3 Network: IP, ICMP, routing, NAT, longest-prefix → `[[eng-02-cidr-subnetting]]`, `[[intro-02-networking]]`. L4 Transport: TCP vs UDP, port, handshake, QUIC → `[[eng-03-tcp-tls]]`. Chỉ định vị trong bản đồ, không lặp lại sâu.
7. **Tầng 5–7** — L5 Session (phiên, cookie, TLS session resumption, QUIC connection ID, WebSocket). L6 Presentation (mã hoá TLS, nén gzip/br, charset/encoding, serialize JSON/Protobuf, Base64). L7 Application (HTTP, DNS, SMTP, SSH, gRPC). Giải thích vì sao thực tế gộp 5–7 vào "application".
8. **BẢN ĐỒ XUYÊN TẦNG #1 — Caching theo tầng** (bảng từ trên xuống):
   - L7 HTTP: browser cache, `Cache-Control`/`ETag`/`304`/`stale-while-revalidate` (🟡 gap hiện tại — viết rõ).
   - L7 edge: CDN/CloudFront, TTL, invalidation.
   - L7/App: DNS cache + TTL; object/app cache Redis/ElastiCache (cache-aside/write-through → `[[be-03-caching]]`); DB cache/DAX.
   - L3/L2: route cache, **ARP cache**, OS page cache; (liên hệ CPU cache `[[cs-02-architecture-memory]]`).
   - Chốt: "dữ liệu cũ" có thể nằm ở BẤT KỲ tầng nào → biết tầng để xoá đúng cache.
9. **BẢN ĐỒ XUYÊN TẦNG #2 — Security & tấn công theo tầng (defense in depth)** (bảng [Tầng | Tấn công điển hình | Phòng thủ | AWS]):
   - L1: tapping/cắt cáp → vật lý, mã hoá.
   - L2: ARP spoofing, MAC flooding, VLAN hopping → port security, Dynamic ARP Inspection, 802.1X.
   - L3: IP spoofing, ICMP/ping flood → NACL, anti-spoofing, Shield.
   - L4: SYN flood, port scan → SG (stateful), SYN cookies, Shield.
   - L5/6: TLS downgrade, cipher yếu, session hijack/fixation → TLS 1.3, HSTS, cookie Secure/HttpOnly/SameSite.
   - L7: SQLi/XSS/CSRF, DDoS app-layer, bot → WAF, validate input, rate-limit → `[[sec-02-owasp-top10-1]]`, saa `ch3-02`.
   - Khung "L3/4 (SG/NACL/Shield) + L7 (WAF)" = defense in depth.

### Nhóm P4 (draft-C): mục 10–13 + ráp file
10. **BẢN ĐỒ XUYÊN TẦNG #3 — Debug & performance theo tầng**:
    - Công cụ/tầng: L1 `ip link`/`ethtool`; L2 `ip neigh`/`arp`; L3 `ping`/`traceroute`/`ip route`; L4 `nc`/`ss`/`netstat`; L7 `dig`/`curl -v`/`openssl s_client`.
    - Quy trình bottom-up: tầng nào fail dừng tầng đó (nối tiếp flow debug ở `[[eng-03-tcp-tls]]`).
    - Performance: mỗi tầng đóng góp latency gì (L1 propagation, L2 switching, L3 routing/RTT, L4 handshake, L6 TLS, L7 app/DB).
11. **Ví dụ tổng hợp end-to-end** — "Gõ `https://shop.example.com` đến khi thấy trang": đi qua đủ tầng (DNS→ARP→TCP handshake→TLS→HTTP), nêu rõ mỗi tầng làm gì + tầng nào có cache. Phần "hiểu" cốt lõi.
12. **Liên hệ AWS theo tầng** — bảng [Tầng | Dịch vụ/khái niệm AWS]: L2~ENI/VPC, L3~route table/IGW/NAT GW, L4~NLB/SG, L7~ALB/CloudFront/WAF/Route53, mã hoá~ACM.
13. **Tóm tắt + cheatsheet in dán bàn** — câu thần chú 7 tầng; bảng tra nhanh tầng↔PDU↔thiết bị↔tool↔tấn công.

## Quality gate mỗi part
- **Lesson parts (P2-P4):** đúng kỹ thuật (đặc biệt L2/ARP/VLAN); khớp giọng eng-02/03; có analogy + 💡/⚠️ + bảng + CLI; KHÔNG lặp deep-dive (dùng link); tiếng Việt có dấu; code trong fence, không HTML entity.
- **P5:** file đọc trôi chảy, độ dài tương đương eng-02/03 (~250–320 dòng); mọi `[[link]]` trỏ slug có thật; build pass; order 1.5 hiển thị đúng vị trí, prev/next không vỡ.
- **P6:** workflow gen+verify chạy xong, ~13 câu, file output hợp lệ.
- **P7:** re-id bắt đầu eng-q-079 (không trùng); `append-questions.mjs` báo `errors:0`; build pass; commit & push (thẳng main); cập nhật memory + lưu ý rebuild ⌘K index.

## Tiến độ
- [x] P1 outline — file này.
- [ ] P2 / P3 / P4 / P5 / P6 / P7.
