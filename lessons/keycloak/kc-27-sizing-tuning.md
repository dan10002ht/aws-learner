# Bài 27 — Sizing và tuning

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đổi một mục tiêu tải (login/s, refresh/s, client credentials/s) ra số vCPU request, vCPU limit và memory limit cho từng pod bằng các hệ số sizing chính thức, và nói được mỗi hệ số được đo trong điều kiện nào.
- Giải thích bằng số vì sao một password login tốn CPU gấp 8 lần một client credentials grant theo docs, và vì sao tăng RAM không gỡ được trần login.
- Tính tay toàn bộ cluster cho một hệ 1 triệu user có đỉnh login lúc 9:00, và chỉ ra phần tải nào (login hay refresh) đang chiếm CPU và IOPS của database.
- Đo CPU-giây cho mỗi thao tác trên Keycloak của chính bạn, và giải thích vì sao con số đo trên laptop không được dùng thay hệ số của docs.
- Chọn núm tuning đúng cho từng triệu chứng: số vòng hash, thuật toán hash, hàng đợi request, connection pool, cache, và biết mỗi núm đổi lấy cái gì.
- Nhận ra dòng WARN `Full scope allowed` lặp theo từng token là chi phí log thật và tắt nó đúng cách.

---

## 2. Triệu chứng

Một SaaS B2B chạy Keycloak 26.8.1 trên Kubernetes: 3 pod, mỗi pod CPU limit 2 vCPU, memory limit 2 GB. Cấu hình này chạy êm suốt ba tháng dùng thử. Sáng thứ Hai đầu tiên sau khi một khách hàng lớn chuyển toàn bộ nhân viên sang, lúc 8:59 bắt đầu có đỉnh login. Các con số dưới đây là giả định của tình huống, không phải số đo.

```
08:59  rate(keycloak_credentials_password_hashing_validations_total) ~ 150/s
       CPU mỗi pod: chạm limit 2 vCPU, cột throttled tăng đều
       memory working set mỗi pod: cao, gần sát limit
       login p95: tăng dần theo từng phút, không có lỗi 5xx nào
09:20  đỉnh qua, latency tự về bình thường
```

Buổi họp sau sự cố, một đồng nghiệp chỉ vào biểu đồ memory: "Keycloak là Java, Java ăn RAM. Pod nào cũng sát limit. Nâng memory lên 4 GB là xong." Đề xuất được duyệt trong năm phút vì ai cũng từng thấy app Java ăn RAM.

Thứ Hai tuần sau, cùng giờ, cùng đường cong latency. Memory limit 4 GB, memory dùng vẫn cao, CPU vẫn chạm trần.

---

## ⏸ Dừng lại — đoán trước #1

Thay đổi nào gỡ được đỉnh 9:00?

```
(a) Nâng memory limit 2 GB -> 4 GB (đã làm, không ăn thua; có lẽ cần 8 GB)
(b) Thêm vCPU: tổng cluster cần khoảng 10 vCPU chỉ cho riêng login, chưa tính headroom
(c) Tăng DB connection pool từ mặc định lên 100 để login không chờ connection
(d) Tăng cache session từ 10.000 lên 1.000.000 entry để khỏi đọc DB
```

---

## 3. Lý thuyết

Bài này không dạy lại cách hash mật khẩu (bài 20) hay cache Infinispan giữ gì (bài 25). Nó dùng hai thứ đó để trả lời một câu: Keycloak cần bao nhiêu CPU, bao nhiêu RAM, và vì sao.

### 3.1 Login là phép tính CPU, không phải phép tính RAM

Đáp án là **(b)**. Bắt đầu từ bản sai, vì bản sai có lý do để tin.

Vì sao memory nhìn như sát limit? Trong container, Keycloak đặt heap tối đa bằng 70% memory limit. JVM được phép nở heap tới mức đó trước khi phải dọn rác mạnh tay, nên nâng limit từ 2 GB lên 4 GB là cho heap thêm chỗ để nở. Memory dùng tăng theo limit, biểu đồ vẫn "sát limit", và người đọc biểu đồ kết luận RAM vẫn thiếu. Trong khi đó không login nào nhanh hơn, vì thứ chặn login không nằm trong RAM.

> **Suy luận.** Docs không nói "memory dùng sẽ bám sát limit". Nó suy từ hai dữ kiện: heap tối đa = 70% limit (dòng #114 nguồn production) và JVM chỉ thu gom mạnh khi heap gần đầy. Kiểm bằng: so `jvm_memory_used_bytes{area="heap"}` với `jvm_memory_max_bytes` trước và sau khi nâng limit; nếu heap dùng thật sau GC không đổi, RAM không phải nút cổ chai.

Thứ chặn login là phép băm mật khẩu. Mỗi password login, Keycloak băm lại mật khẩu người dùng gõ bằng Argon2id (5 vòng, 7 MiB, parallelism 1 là mặc định, xem bài 20) để so với hash đã lưu. Một lần băm là một luồng CPU chạy liên tục từ đầu tới cuối, không có chỗ nào chờ I/O để nhường CPU. Docs nói thẳng điều này và cho luôn hệ số:

> **Nguồn.** *"Keycloak spends most of the CPU time hashing the password provided by the user, and it is proportional to the number of hash iterations."* Hệ số: *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)).

Áp vào tình huống: 3 pod × 2 vCPU = 6 vCPU, theo hệ số docs làm được 6 × 15 = **90 login/s** khi mọi vCPU chạy 100%. Đỉnh 150 login/s cần 150 / 15 = **10 vCPU** chỉ cho login. Thiếu 4 vCPU thì 60 login mỗi giây không được phục vụ kịp và phải xếp hàng.

Vì sao latency tăng dần mà không có lỗi? Vì hàng đợi không có đáy:

> **Nguồn.** *"By default, Keycloak will queue all incoming requests infinitely, even if the request processing stalls."* ([concepts-threads](https://www.keycloak.org/high-availability/single-cluster/concepts-threads)).

Mỗi giây có thêm khoảng 60 login vào hàng mà không ra được, nên hàng dài thêm khoảng 60 request mỗi giây, và request đến sau chờ lâu hơn request đến trước. Đó là đường cong "tăng dần theo từng phút, không lỗi 5xx" trong triệu chứng. Hết đỉnh, tốc độ vào dưới 90/s thì hàng rút dần và latency tự về.

Ba phương án còn lại sai vì chúng chữa một tài nguyên không cạn:

| Phương án | Tài nguyên nó tăng | Vì sao không gỡ đỉnh login |
|---|---|---|
| (a) memory 4 GB | heap | Băm Argon2 dùng 7 MiB mỗi lần, thiếu là thiếu CPU để băm, không thiếu chỗ chứa |
| (c) DB pool 100 | connection | Login chờ CPU băm, không chờ connection; thêm connection chỉ thêm request chạy song song tranh cùng số core |
| (d) cache session 1 triệu | RAM cho cache | Session mới tạo khi login, cache to không làm việc băm ngắn đi |

### 3.2 Bốn hệ số và điều kiện đo của chúng

Docs cho hệ số riêng cho từng loại request vì chúng tốn CPU khác nhau về bản chất:

| Loại request | Hệ số docs | Đã test tới | CPU mỗi request suy ra |
|---|---|---|---|
| Password login | 15/s mỗi vCPU | 300/s | 1000 / 15 = 66,7 ms |
| Client credentials grant | 120/s mỗi vCPU | 2000/s | 1000 / 120 = 8,3 ms |
| Refresh token | 120/s mỗi vCPU | 435/s | 8,3 ms |
| Headroom | +150% trên tổng | | limit = request × 2,5 |

Cột cuối là phép chia của tôi, không phải số docs in ra: nếu 1 vCPU chạy hết công suất làm được 15 login mỗi giây thì mỗi login ăn 66,7 ms CPU. Tỷ lệ 66,7 / 8,3 = **8 lần**. Phần chênh là phép băm: client credentials và refresh không băm mật khẩu người dùng nào, chúng chỉ kiểm client, ký một JWT, cập nhật session.

Cột "đã test tới" là giới hạn của hệ số: ngoài dải đó là ngoại suy. Refresh chỉ được test tới **435/s**; mục 5.1 sẽ cho ra nhu cầu gần 4 lần mốc đó, và ở đó hệ số là giả định, không còn là số đo.

Headroom 150% kiểm được bằng ví dụ chính docs đưa ra: 45 login/s + 360 client credentials/s + 360 refresh/s trên 3 pod. 45/15 + 360/120 + 360/120 = 9 vCPU, chia 3 pod là 3 vCPU request mỗi pod, nhân 2,5 là 7,5 vCPU limit. Docs in đúng hai số "CPU requested per Pod: 3 vCPU" và "CPU limit per Pod: 7.5 vCPU".

Điều kiện đo phải đi kèm hệ số mỗi khi bạn dùng nó:

- Hash: *"Default user password hashing with Argon2 and 5 hash iterations and minimum memory size 7 MiB as recommended by OWASP (which is the default)."*
- Dữ liệu: database seed 1.000.000 user và 20.000 client.
- Máy: ARM `c7g.2xlarge`, OpenShift trên AWS, cài bằng Operator, 3 pod, 2 site active/active.
- Session: *"All user and client sessions are stored in the database and are not cached in-memory as this was tested in a multi-cluster setup."* Docs ghi chú single-site sẽ nhanh hơn một chút.
- Kiến trúc CPU: trên x86 (c7i/c7a), *"client credential grants and refresh token workloads were able to deliver up to two times the number of operations per CPU core"*; phần băm mật khẩu thì không đổi.

Dòng cuối xác nhận 3.1 từ hướng khác: đổi CPU làm CC và refresh nhanh gấp đôi, login thì đứng yên, vì login bị trói vào phép băm.

> **Nguồn.** Bốn hệ số, headroom (*"Leave 150% extra head-room for CPU usage to handle spikes in the load."*), ví dụ 3 pod ([single-cluster sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). Điều kiện đo và ghi chú x86 ([multi-cluster sizing](https://www.keycloak.org/high-availability/multi-cluster/concepts-memory-and-cpu-sizing)).

<svg viewBox="0 0 700 250" role="img" aria-labelledby="kc27-a-t kc27-a-d" style="width:100%;height:auto">
<title id="kc27-a-t">CPU cho một request: hệ số docs so với lab</title>
<desc id="kc27-a-d">Thanh ngang so sánh mili-giây CPU mỗi request. Docs trên c7g: password login 66,7 ms, client credentials hoặc refresh 8,3 ms. Lab trên Apple M4 dev mode: password login 24,05 ms, client credentials 1,03 ms, refresh 1,12 ms. Ở cả hai, password login đắt nhất nhiều lần.</desc>
<text x="350" y="20" text-anchor="middle" font-size="12" fill="currentColor">ms CPU cho một request (thanh dài hơn = ít request mỗi vCPU hơn)</text>
<text x="12" y="45" font-size="11" fill="currentColor" font-weight="bold">Docs, c7g ARM</text>
<text x="12" y="70" font-size="11" fill="currentColor">password login</text>
<rect x="210" y="58" width="450" height="18" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<text x="652" y="71" text-anchor="end" font-size="11" fill="currentColor">66,7 ms (15 login/s mỗi vCPU)</text>
<text x="12" y="98" font-size="11" fill="currentColor">client cred. hoặc refresh</text>
<rect x="210" y="86" width="56" height="18" rx="3" fill="#3b82f6" fill-opacity="0.35"/>
<text x="272" y="99" font-size="11" fill="currentColor">8,3 ms (120/s mỗi vCPU)</text>
<line x1="12" y1="116" x2="688" y2="116" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>
<text x="12" y="138" font-size="11" fill="currentColor" font-weight="bold">Lab, Apple M4, start-dev</text>
<text x="12" y="163" font-size="11" fill="currentColor">password login</text>
<rect x="210" y="151" width="162" height="18" rx="3" fill="#ef4444" fill-opacity="0.35"/>
<text x="378" y="164" font-size="11" fill="currentColor">24,05 ms</text>
<text x="12" y="191" font-size="11" fill="currentColor">client credentials</text>
<rect x="210" y="179" width="7" height="18" rx="2" fill="#3b82f6" fill-opacity="0.35"/>
<text x="223" y="192" font-size="11" fill="currentColor">1,03 ms</text>
<text x="12" y="219" font-size="11" fill="currentColor">refresh token</text>
<rect x="210" y="207" width="8" height="18" rx="2" fill="#84cc16" fill-opacity="0.45"/>
<text x="224" y="220" font-size="11" fill="currentColor">1,12 ms</text>
<text x="350" y="243" text-anchor="middle" font-size="10" fill="currentColor">Docs: 1000 ms chia hệ số. Lab: CPU-giây của tiến trình chia số request, 4 luồng client, mục 4.</text>
</svg>

---

## ⏸ Dừng lại — đoán trước #2

Mục 4 đo trên một Mac mini M4: một core bận 100% xử lý được khoảng 42 password login mỗi giây. Docs nói 15. Kết luận nào đúng?

```
(a) Docs viết thận trọng quá; sizing theo số lab, cluster nhỏ đi gần 3 lần
(b) Lab sai vì dev mode; số thật phải gần 15
(c) Cả hai đúng trong điều kiện của mình; điều kiện lab thiếu đúng những thứ làm production đắt
(d) M4 nhanh hơn c7g gần 3 lần, nên trên M4 chia 42 là đúng
```

---

### 3.3 Vì sao số trên laptop không thay được hệ số docs

Đáp án là **(c)**. Lab đo đúng thứ nó đo: CPU-giây mà tiến trình Keycloak tiêu cho mỗi request, trong một điều kiện rất hẹp. So hai bộ điều kiện cạnh nhau:

| Yếu tố | Lab (mục 4) | Docs |
|---|---|---|
| Session | H2 dev-file trên đĩa local | ghi DB, không cache in-memory, 2 site |
| Dữ liệu | 16 user, 1 client: cache trúng 100% | 1.000.000 user, 20.000 client |
| Mạng | localhost, HTTP thường | cluster thật, qua mạng |
| Máy | M4, 4 core P + 6 core E, đang chạy nhiều tiến trình khác | c7g ARM |
| Loại login | password grant, 1 request | "password-based user logins": nguồn không nói là flow nào |

Tỷ lệ giữa hai loại request cho một manh mối. Ở lab này, password login tốn 24,05 ms CPU còn client credentials 1,03 ms: **23 lần**. Lab #1, máy rảnh hơn, đo latency 1 luồng: khoảng **10 lần** (15,50 so với ~1,6 ms, bài 20). Docs: **8 lần**. Nếu máy docs chỉ chậm đều hơn cho mọi việc thì tỷ lệ phải giữ nguyên. Tỷ lệ docs thấp hơn cả hai số lab gợi ý docs có thêm một khoản chi phí cố định mỗi request (DB, mạng, cache trượt) mà lab gần như không có: nhỏ so với 66,7 ms của login, lớn so với 8,3 ms của client credentials. Đó không phải giải thích duy nhất: chính docs ghi kiến trúc CPU cũng đổi tỷ lệ (x86 làm CC gấp đôi, băm thì không). Và hai lab cùng loại máy đã chênh nhau hơn gấp đôi, nên 23 không phải hằng số.

Lab #2 của course cho thấy cùng hiệu ứng: 2 node, Postgres, k6 chạy chung máy, client credentials tốn **~3,1 ms CPU mỗi token**, gấp ba lần con số 1,03 ms đo trên một node H2. Đổi điều kiện là đổi số.

> **Suy luận.** Docs không giải thích vì sao hệ số của nó thấp hơn số đo trên máy dev. Hai dữ kiện dẫn tới kết luận: điều kiện đo của docs có DB thật, 1 triệu user, session không cache; và tỷ lệ login/CC ở lab (10–23 lần) cao hơn tỷ lệ docs (8 lần). Kiểm bằng: dựng Postgres, seed 1 triệu user, tắt cache session (`spi-user-sessions--infinispan--use-caches=false`), đo lại CPU mỗi client credentials; nếu nó tiến về 8 ms thì giả thuyết đứng.

Quy tắc: hệ số docs để lập ngân sách, số lab để hiểu cơ chế và so sánh tương đối, và chỉ số đo trên môi trường giống production mới được dùng để thu hẹp ngân sách.

### 3.4 Memory: một hằng số, không phải hàm của số user

Phần memory của docs ngắn và hay bị đọc nhầm:

> **Nguồn.** *"The base memory usage for a Pod including caches of Realm data and 10,000 cached sessions is 1250 MB of RAM."* và *"In containers, Keycloak allocates 70% of the memory limit for heap-based memory. It will also use approximately 300 MB of non-heap-based memory."* Ví dụ docs: memory limit 1360 MB mỗi pod ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)).

Công thức limit: non-heap không nằm trong heap nên trừ ra trước, phần còn lại phải vừa 70%: (1250 − 300) / 0,7 = 1357 MB, làm tròn lên **1360 MB**. Heap tối đa khi đó là 1360 × 0,7 = 952 MB. Đặt limit bằng đúng 1250 MB là sai: heap chỉ còn 875 MB trong khi phần heap cần là 950 MB.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="kc27-b-t kc27-b-d" style="width:100%;height:auto">
<title id="kc27-b-t">Memory limit 1360 MB chia thành heap và non-heap</title>
<desc id="kc27-b-d">Thanh trên: memory limit 1360 MB của một pod production, gồm heap tối đa 952 MB bằng 70 phần trăm limit, non-heap khoảng 300 MB, và khoảng dư khoảng 108 MB; vạch đánh dấu mức dùng nền 1250 MB. Thanh dưới cùng tỷ lệ: Keycloak start-dev trên lab có heap tối đa 512 MB, heap dùng 237,5 MB và non-heap 211,3 MB sau tải.</desc>
<text x="350" y="20" text-anchor="middle" font-size="12" fill="currentColor">Cùng tỷ lệ: 600 px = 1360 MB</text>
<text x="40" y="45" font-size="11" fill="currentColor">Production, limit 1360 MB (docs)</text>
<rect x="40" y="52" width="420" height="30" rx="4" fill="#3b82f6" fill-opacity="0.3"/>
<text x="250" y="72" text-anchor="middle" font-size="11" fill="currentColor">heap tối đa 952 MB (70%)</text>
<rect x="460" y="52" width="132" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.3"/>
<text x="526" y="72" text-anchor="middle" font-size="11" fill="currentColor">non-heap ~300</text>
<rect x="592" y="52" width="48" height="30" rx="4" fill="#64748b" fill-opacity="0.25"/>
<text x="616" y="72" text-anchor="middle" font-size="10" fill="currentColor">dư</text>
<line x1="591" y1="46" x2="591" y2="90" stroke="#ef4444" stroke-width="2"/>
<text x="591" y="102" text-anchor="middle" font-size="10" fill="currentColor">nền 1250 MB</text>
<text x="40" y="132" font-size="11" fill="currentColor">Lab start-dev, -Xmx512m, sau ~213.000 request</text>
<rect x="40" y="139" width="226" height="30" rx="4" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-opacity="0.5"/>
<rect x="40" y="139" width="105" height="30" rx="4" fill="#3b82f6" fill-opacity="0.35"/>
<text x="92" y="159" text-anchor="middle" font-size="10" fill="currentColor">heap 237,5</text>
<text x="205" y="159" text-anchor="middle" font-size="10" fill="currentColor">Xmx 512</text>
<rect x="270" y="139" width="93" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.3"/>
<text x="316" y="159" text-anchor="middle" font-size="10" fill="currentColor">non-heap 211,3</text>
<text x="40" y="190" font-size="10" fill="currentColor">Docs: dòng #113, #114, #125. Lab: jvm_memory_used_bytes, mục 4.5.</text>
</svg>

Chữ quyết định trong câu trích là "10,000 cached sessions". Cache session mặc định giới hạn 10.000 entry mỗi node, session thật nằm trong database (bài 25). Vì vậy 1.250 MB không lớn lên khi realm có 1 triệu user thay vì 10 nghìn: phần lớn lên là database và số lần cache trượt, không phải heap.

> **Suy luận.** Nguồn không có công thức "X MB mỗi 1.000 user" và cấm tự đặt ra. Kết luận "memory không tăng theo số user" suy từ hai dữ kiện: mốc 1250 MB đã gồm cache 10.000 session, và cache session có trần 10.000 entry/node (`--cache-embedded-sessions-max-count`). Nó sai nếu bạn nâng trần cache. Kiểm bằng: đo `jvm_memory_used_bytes` sau GC với 10 nghìn và 1 triệu session đang hoạt động.

Có một chỗ RAM dính vào login: mỗi lần băm Argon2 cấp 7 MiB. 50 login băm song song là khoảng 350 MiB cấp rồi bỏ liên tục trong heap 952 MB. Trên lab, metric GC ghi 10 lần pause với nguyên nhân `G1 Humongous Allocation` sau khoảng 27.800 lần băm. Việc các pause này đến từ mảng 7 MiB của Argon2 là suy luận, lab chưa tách riêng để kiểm. Dù vậy hướng của nó rõ: áp lực GC tiêu CPU, nó không phải dấu hiệu thiếu chỗ chứa.

### 3.5 Núm tuning: cái nào đổi được gì

Mỗi núm dưới đây có nguồn hoặc có số đo; núm nào chỉ đọc được trên blog thì không có mặt ở đây.

**Số vòng hash và thuật toán.** Đây là núm duy nhất chạm thẳng vào 66,7 ms. Password policy `hashIterations(n)` và `hashAlgorithm(...)` (bài 20). Lab đo (mục 4.4, 4 luồng, máy tải cao): 1 vòng còn 0,56–0,65 lần CPU mỗi login của 5 vòng, 10 vòng 3,5–4,3 lần, `pbkdf2-sha512` (210.000 vòng, mặc định khi chạy FIPS) 5,1–5,7 lần; bài 20 đo latency 1 luồng ra 4,97 lần cho PBKDF2, cùng bậc. Docs nói chi phí tỷ lệ với số vòng, nhưng số lab không nằm trên một đường thẳng: tỷ lệ thì 10 vòng tốn không quá 2 lần 5 vòng, lab đo gần 4 lần. Dùng chúng để biết chiều và bậc, không để tính vCPU. Cái giá của giảm vòng là kẻ cầm được bản sao bảng credential sẽ thử mật khẩu nhanh hơn đúng bằng tỷ lệ đó; bài 20 tính phía tấn công.

**Hàng đợi request.** Mặc định hàng vô hạn (3.1). Đặt `http-max-queued-requests` để request vượt ngưỡng bị trả ngay thay vì chờ:

> **Nguồn.** *"Any request that exceeds this limit would return with an immediate 503 Server not Available response."* ([configuration-production](https://www.keycloak.org/server/configuration-production)). Executor pool mặc định tối đa 50 thread hoặc hơn tùy số core ([concepts-threads](https://www.keycloak.org/high-availability/single-cluster/concepts-threads)).

Núm này không tạo thêm năng lực. Nó đổi "mọi người chờ mỗi lúc một lâu" thành "một phần người nhận 503 ngay, phần còn lại login với latency bình thường".

**Connection pool DB.** Docs chỉ cho một luật: *"For the best performance, the values for the initial, minimal and maximum database connection pool size should all be equal."* ([concepts-database-connections](https://www.keycloak.org/high-availability/single-cluster/concepts-database-connections)). Nguồn không cho con số pool nên dùng; tình huống 3.1 cho thấy tăng pool không chữa được trần CPU.

**Cache.** Realms, users, authorization mỗi loại tối đa 10.000 entry; keys 1.000 entry, hết hạn sau 1 giờ; session 10.000 entry mỗi node. Docs nêu một ngưỡng cụ thể nơi cache mặc định hết đủ: *"When performing requests with more than 2500 different clients concurrently, not all client information will fit into Keycloak’s caches when those are using the standard cache sizes of 10000 entries each."* Quá ngưỡng đó database thành nút cổ chai. Tăng cache là núm cho DB, không phải cho CPU login.

**Virtual threads cho JGroups.** Docs tự mâu thuẫn về điều kiện bật: release notes 26.1 ghi tối thiểu 2 core, trang concepts-threads của 26.8.1 ghi tối thiểu 4 core. Theo docs hiện tại là 4 core. Nếu thiết kế pod dưới 4 vCPU, đừng giả định mình được hưởng; kiểm trên chính bản bạn chạy thay vì tin một trong hai câu.

**Dòng WARN `Full scope allowed`.** Ở 26.8.1, mỗi lần cấp token cho client còn bật Full Scope Allowed (mặc định của client mới) là một dòng WARN dài 417 byte (kể cả ký tự xuống dòng) (bài 9 giải thích công tắc này). Lab #2 đếm được 5509 dòng trên node-a, đúng bằng số token node-a cấp trong load test. Lab của bài này đo cả CPU: tắt công tắc không làm CPU mỗi token giảm đo được (mục 4.6). Chi phí là dung lượng log và mọi thứ phía sau nó: đĩa, log shipper, tiền lưu trữ ở hệ log tập trung. Mục 5.3 tính ra con số.

> **Nguồn.** Cache mặc định ([caching](https://www.keycloak.org/server/caching)). Ngưỡng 2500 client ([concepts-memory-and-cpu-sizing](https://www.keycloak.org/high-availability/single-cluster/concepts-memory-and-cpu-sizing)). Số vòng mặc định −1 nghĩa là dùng mặc định của thuật toán: *"Specifies the number of times Keycloak hashes passwords before storage or verification. The default value is -1,"* ([password policies](https://www.keycloak.org/docs/latest/server_admin/index.html#_password-policies)).

---

## ⏸ Dừng lại — đoán trước #3

Hệ 1 triệu user, đỉnh 9:00 có 200 password login/s và 400.000 phiên đang hoạt động, mỗi phiên refresh mỗi 4–5 phút. Phần nào ăn nhiều vCPU hơn?

```
(a) Login: 200/s nhân với giá 8 lần, chắc chắn áp đảo
(b) Refresh: rẻ hơn 8 lần mỗi lần, nhưng nhiều hơn 8 lần về số lượng
(c) Ngang nhau
(d) Không tính được khi chưa biết số pod
```

Đáp án nằm ở mục 5.1.

---

## 4. Lab

> **Đo trên lab (chạy riêng cho bài này).** Ngày 2026-10-15, 14:50–15:02. Keycloak 26.8.1 `start-dev` (H2 dev-file, `-Xmx512m`), OpenJDK 24.0.2, Mac mini Apple M4 10 core (4 P + 6 E), 16 GB RAM, cổng 3700 / management 4700. Máy đang chạy nhiều agent khác song song: `uptime` báo load average từ 5,8 tới 13,3 trong lúc đo, nên mỗi số có nhiễu vài chục phần trăm; lặp lại cùng phép đo argon2 mặc định 4 luồng cho 20,4 tới 24,05 ms CPU mỗi login. Mỗi lượt tải dài 5–12 giây, không lượt nào quá 2 phút. Script: `~/projects/keycloak-lab/tmp-kc27-bench.py`; output: `~/projects/keycloak-lab/lab-kc27/run-*.txt`, `kc.log`, `metrics-end.txt`.

### 4.1 Dựng

```bash
cd ~/projects/keycloak-lab/lab-kc27 && unzip -q ../keycloak-26.8.1.zip
KC_BOOTSTRAP_ADMIN_USERNAME=admin KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  keycloak-26.8.1/bin/kc.sh start-dev --http-port=3700 --http-management-port=4700 \
  --health-enabled=true --metrics-enabled=true
kc create realms -s realm=size -s enabled=true
kc create clients -r size -s clientId=pw-client -s publicClient=false -s secret=pw-secret \
  -s directAccessGrantsEnabled=true -s standardFlowEnabled=false -s serviceAccountsEnabled=true
for i in $(seq 1 16); do kc create users -r size -s username=user$i ...; kc set-password ...; done
```

Password grant được bật chỉ để đo: nó là cách gọn nhất để bắt Keycloak băm mật khẩu một lần mỗi request mà không phải giả lập trình duyệt (bài 2 giải thích vì sao không dùng nó cho app thật). Username `u1` bị trả `error-invalid-length`; đổi thành `user1` thì qua.

### 4.2 Đo CPU thay vì khoá core

macOS không có cgroup hay `taskset` để ép Keycloak chạy trên đúng một core. Thay vào đó script đo thứ tương đương: CPU-giây mà tiến trình Java tiêu trong lúc chạy tải, chia cho số request. `1000 / (ms CPU mỗi request)` chính là số request một core bận 100% làm được, đúng đơn vị của hệ số docs.

```python
# cốt lõi tmp-kc27-bench.py (bỏ phần parse tham số, refresh, in kết quả)
def cpu():  # CPU-time của tiến trình Keycloak, dạng M:SS.ss từ ps
    s = subprocess.check_output(['ps', '-o', 'time=', '-p', PID]).decode().strip()
    return sum(float(x) * 60 ** i for i, x in enumerate(reversed(s.split(':'))))
def worker(i):  # mỗi luồng: 1 kết nối keep-alive, bắn liên tục tới khi hết giờ
    c = http.client.HTTPConnection('localhost', 3700)
    while not stop.is_set():
        c.request('POST', PATH, body(i), HDR); r = c.getresponse(); r.read()
c0, w0 = cpu(), time.perf_counter(); start.set(); time.sleep(DUR); stop.set()
cs, wall = cpu() - c0, time.perf_counter() - w0
print(n / wall, cs / wall, cs * 1000 / n)   # req/s, core bận, ms CPU mỗi request
```

### 4.3 Password grant, tăng số luồng client

Output thật (`run-password-sweep.txt`), mỗi lượt 12 giây, Argon2 mặc định:

| Luồng | req/s | p50 ms | p95 ms | Core bận | ms CPU mỗi login | Login mỗi CPU-giây |
|---|---|---|---|---|---|---|
| 1 | 59,8 | 16,02 | 20,94 | 1,19 | 19,97 | 50,1 |
| 2 | 92,5 | 19,33 | 33,58 | 2,20 | 23,73 | 42,1 |
| 4 | 175,3 | 21,03 | 31,48 | 4,22 | 24,05 | 41,6 |
| 8 | 286,5 | 26,67 | 39,45 | 7,95 | 27,75 | 36,0 |

Thứ nhất, throughput tăng gần tuyến tính theo số core bận: 1,19 core cho 59,8/s, 7,95 core cho 286,5/s. Login không có điểm nghẽn chung nào ngoài CPU, đúng như 3.1. Thứ hai, một luồng client đã làm Keycloak bận 1,19 core chứ không phải 1,0: phần dư là GC và JIT chạy trên thread riêng. Thứ ba, ở 8 luồng CPU mỗi login tăng lên 27,75 ms. Máy có 4 core P; khi tải tràn sang core E chậm hơn, mỗi phép băm tốn nhiều CPU-giây hơn. Đó là suy luận từ cấu hình máy, lab không ghim luồng vào loại core để kiểm.

p50 ở 1 luồng là 16,02 ms, cùng bậc với lab #1 của course (15,50 ms).

### 4.4 Client credentials, refresh, và các núm hash

Cùng 4 luồng, 12 giây (`run-cc-refresh.txt`):

```
{"mode": "cc", "threads": 4, "n": 47664, "req_s": 3969.6, "p50_ms": 0.87, "kc_cores_busy": 4.07, "cpu_ms_per_op": 1.03}
{"mode": "refresh", "threads": 4, "n": 45096, "req_s": 3755.2, "p50_ms": 0.91, "kc_cores_busy": 4.2, "cpu_ms_per_op": 1.12}
```

Refresh rẻ gần bằng client credentials: không băm gì, chỉ kiểm chữ ký HS512 của refresh token, cập nhật session, ký access token mới.

Đổi password policy rồi đặt lại mật khẩu cho 16 user (hash mới theo policy mới), đo lại 4 luồng (`run-knobs.txt`, `run-knobs2.txt`, `run-pw-argon2-repeat3.txt`):

| Policy | Credential lưu | ms CPU mỗi login | So với mặc định |
|---|---|---|---|
| `hashIterations(1)` | argon2, 1 vòng | 12,64 / 13,27 | khoảng 0,6 lần |
| mặc định | argon2, 5 vòng | 20,4 / 20,54 / 21,0 / 21,9 / 22,57 | 1 |
| `hashIterations(10)` | argon2, 10 vòng | 78,07 / 87,05 | 3,5–4,3 lần |
| `hashAlgorithm(pbkdf2-sha512)` | 210.000 vòng | 116,12 | 5,1–5,7 lần |

Metric xác nhận Keycloak băm đúng loại mình nghĩ (`metrics-end.txt`, rút gọn):

```
keycloak_credentials_password_hashing_validations_total{algorithm="argon2",hashing_strength="Argon2id-1.3[m=7168,t=1,p=1]",outcome="valid",realm="size"} 7180.0
keycloak_credentials_password_hashing_validations_total{algorithm="argon2",hashing_strength="Argon2id-1.3[m=7168,t=10,p=1]",outcome="valid",realm="size"} 1091.0
keycloak_credentials_password_hashing_validations_total{algorithm="pbkdf2-sha512",hashing_strength="210000",outcome="valid",realm="size"} 402.0
```

Đây cũng là metric docs chỉ định để đếm số lần băm thật trong production.

Một kết quả lab chưa giải thích được: đo 1 luồng, CPU mỗi login là 13,45 ms ở 2 vòng, 14,24 ms ở 5 vòng, rồi nhảy lên 45,1 ms ở 7 vòng và 54,47 ms ở 10 vòng (`run-knobs3-1thread.txt`). Docs nói chi phí tỷ lệ với số vòng; lab cho đường cong gần phẳng từ 2 tới 5 vòng rồi có bậc giữa 5 và 7, và ở 1 luồng 5 vòng chỉ 14,24 ms so với 20,4–22,57 ms ở 4 luồng. Đừng dùng hai bảng trên để ngoại suy sang số vòng chưa đo.

> **Chưa đo.** Nguyên nhân bậc nhảy giữa 5 và 7 vòng Argon2 trên lab. Đo bằng: chạy lại 1 luồng cho 3, 4, 5, 6, 7 vòng trên máy rảnh, kèm `jvm_gc_pause_seconds_sum` trước/sau mỗi lượt, và lặp trên một máy x86 để tách yếu tố JIT/kiến trúc.

### 4.5 Memory trên lab

```
jvm_memory_used_bytes{area="heap",id="G1 Old Gen"} 1.66295376E8
jvm_memory_used_bytes{area="heap",id="G1 Eden Space"} 5.6623104E7
jvm_memory_used_bytes{area="heap",id="G1 Survivor Space"} 1.4618784E7
jvm_memory_used_bytes{area="nonheap",id="Metaspace"} 1.60731024E8
jvm_gc_pause_seconds_count{action="end of minor GC",cause="G1 Humongous Allocation",gc="G1 Young Generation"} 10.0
```

Cộng lại: heap dùng 237,5 MB trên trần `-Xmx512m`, non-heap 211,3 MB (Metaspace 160,7 MB, phần còn lại là code cache và class space). Non-heap ở lab cùng bậc với con số khoảng 300 MB của docs. Lab chạy ngoài container nên `kc.sh` đặt `-Xmx512m` cố định; quy tắc 70% chỉ áp dụng khi `KC_RUN_IN_CONTAINER=true` (lab #2).

### 4.6 Dòng WARN theo từng token

```
WARN  [org.keycloak.protocol.oidc.endpoints.TokenEndpoint.full-scope-allowed] (executor-thread-1) Client 'pw-client'
in the realm 'size' has 'Full scope allowed' switch enabled. This client switch is deprecated ...
```

Sau 149.669 dòng log, 149.645 dòng là dòng này: **99,98%**. File `kc.log` 62,4 MB, trung bình 417 byte mỗi dòng. Đếm theo từng lượt: lượt client credentials 49.210 token sinh đúng 49.210 dòng WARN; refresh cũng sinh.

Tắt bằng `kc update clients/<id> -r size -s fullScopeAllowed=false`, chạy lại client credentials 4 luồng: 0 dòng WARN mới. CPU mỗi token trước khi tắt là 1,03 và 0,97 ms (hai lượt), sau khi tắt là 1,09 ms. Chênh nằm trong nhiễu của máy. Từ thời điểm này client giữ `fullScopeAllowed=false` cho mọi lượt password ở 4.4.

Tắt Full Scope Allowed không chỉ là chuyện log: token mất các role mà client không khai báo trong scope. Bài 9 nói cần map lại role nào trước khi tắt.

---

## 5. Tính tay

### 5.1 Một triệu user, đỉnh 9:00

Đề: 1.000.000 user. Đỉnh 9:00 có **200 password login/s**. Cùng lúc có **400.000 phiên** đang mở, access token sống 300 s (mặc định, bài 10), app refresh trước khi hết hạn nên mỗi phiên refresh mỗi 4–5 phút. Các service nội bộ xin token client credentials, có cache: **30 CC/s**.

Refresh/s: 400.000 / 300 = 1.333/s nếu refresh mỗi 5 phút; 400.000 / 240 = **1.667/s** nếu mỗi 4 phút. Lấy số xấu hơn để lập ngân sách.

vCPU request (chưa headroom):

| Loại | Phép tính | vCPU |
|---|---|---|
| Login | 200 / 15 | 13,33 |
| Refresh | 1.667 / 120 | 13,89 |
| Client credentials | 30 / 120 | 0,25 |
| Tổng | | **27,47** |

Đáp án hộp #3 là **(b)**: refresh nhiều gấp 8,3 lần login về số lượng (1.667 / 200) và rẻ hơn đúng 8 lần mỗi request, nên hai phần ngang ngửa nhau, refresh nhỉnh hơn. Ai chỉ tính login sẽ thiếu một nửa cluster.

Limit = 27,47 × 2,5 = **68,68 vCPU**. Chia 7 pod: request 3,92 → đặt **4 vCPU**, limit 9,81 → đặt **10 vCPU** mỗi pod. Mất 1 pod, 6 pod còn lại cần 27,47 / 6 = 4,58 vCPU mỗi pod: trên request 4, dưới limit 10, nên chạy được nếu node còn CPU trống để pod vượt request. Đó là lý do có headroom.

Memory mỗi pod: request 1.250 MB, limit 1.360 MB; 7 pod là 8.750 MB request, 9.520 MB limit. Con số không phụ thuộc vào 1 triệu user (3.4).

Database: docs (Aurora PostgreSQL multi-AZ) cho mỗi 100 login/logout/refresh mỗi giây cần 1.400 write IOPS và 0,35–0,7 vCPU DB. (200 + 1.667) / 100 = 18,67 đơn vị: **26.133 write IOPS**, **6,5–13,1 vCPU** cho DB.

Hai cảnh báo trước khi đem bảng này đi duyệt ngân sách. Refresh 1.667/s gấp **3,8 lần** mốc 435/s docs đã test; hệ số 120/vCPU ở đó là ngoại suy. Và nếu cluster chạy x86, phần refresh và CC có thể rẻ đi tới một nửa, phần login thì không.

### 5.2 Kéo dài access token để mua lại CPU

Cùng hệ, đổi access token lifespan từ 5 lên 15 phút, app refresh ở phút 13,5 (810 s):

- Refresh/s: 400.000 / 810 = 494/s, cần 494 / 120 = 4,12 vCPU thay vì 13,89.
- Tổng request: 13,33 + 4,12 + 0,25 = 17,70 vCPU, limit 44,25 vCPU. Tiết kiệm 9,77 vCPU request, 24,43 vCPU limit.
- DB: (200 + 494) / 100 × 1.400 = 9.714 write IOPS thay vì 26.133.

Cái giá: bài 4 đã cho thấy sau logout, access token vẫn được resource server verify offline chấp nhận tới `exp`. Cửa sổ đó dài lên từ 5 phút thành 15 phút. Login thì không mua lại được bằng núm này: 13,33 vCPU của 200 login/s chỉ giảm khi giảm số lần băm (SSO cookie, bài 14) hoặc giảm giá mỗi lần băm (bài 20).

### 5.3 Dòng WARN ở tải production

Ở 5.1 Keycloak cấp 200 + 1.667 + 30 = 1.897 token/s lúc đỉnh. Nếu mọi client còn Full Scope Allowed: 1.897 × 417 byte = 791 KB/s, tức **2,85 GB mỗi giờ** chỉ riêng một dòng WARN, lặp lại cùng một câu. Một giờ đỉnh mỗi ngày làm việc là khoảng 57 GB mỗi tháng 20 ngày, chưa tính các giờ khác. Lab không đo được CPU của việc ghi log này trên máy dev (4.6); dung lượng thì chắc chắn.

---

## 6. Chuyển giao

1. Một khách hàng ngân hàng bắt chạy Keycloak ở chế độ FIPS, nơi mặc định là PBKDF2-SHA512 210.000 vòng. Lab đo thuật toán này tốn 5,1–5,7 lần CPU của Argon2 mặc định. Với 200 login/s ở 5.1, bạn có được nhân thẳng 13,33 vCPU với 5,5 không? Cần đo gì trên môi trường thật trước khi chốt?
2. Một nửa số user chuyển sang "Sign in with Google" qua identity brokering (bài 15). Họ không gõ mật khẩu vào Keycloak. Phần nào của bảng 5.1 đổi, và vì sao `keycloak_user_events_total{event="login"}` không còn dùng để đếm số lần băm được nữa, trong khi `keycloak_credentials_password_hashing_validations_total` vẫn dùng được?
3. Đồng nghiệp đề xuất hạ `hashIterations` xuống 1 để cắt 40% CPU login. Viết hai câu cho người duyệt: tiết kiệm bao nhiêu vCPU ở 200 login/s theo tỷ lệ lab, và đổi lại cuộc tấn công nào rẻ đi bao nhiêu lần (dùng bài 20).
4. Cluster đang đặt `http-max-queued-requests`. Đỉnh 9:00 vượt năng lực 30%. Ai nhận 503: người đang login, người đang refresh, hay cả hai theo tỷ lệ? Điều đó có nghĩa gì với một SPA tự refresh ngầm khi refresh nhận 503?
5. Một app mobile có 2 triệu thiết bị dùng offline token, refresh mỗi khi mở app, trung bình 6 lần mỗi ngày, dồn 40% vào khung 19:00–21:00. Tính refresh/s lúc đỉnh và so với mốc 435/s đã test.
6. Một nền tảng multi-tenant có 6.000 client hoạt động đồng thời (vượt ngưỡng 2.500 của docs) và đỉnh refresh gấp 4 lần mốc đã test. Bạn được hai tuần trước go-live. Thiết kế load test để biết cluster sẽ gãy vì CPU băm, vì database, hay vì cache trượt trước: tải nào bắn, theo thứ tự nào, đọc metric nào để phân biệt ba kiểu gãy, và điều kiện nào của môi trường test phải giống production thì kết quả mới đáng tin.

---

## 7. Tóm tắt

- Trần của password login là CPU băm mật khẩu: docs *"For each 15 password-based user logins per second, allocate 1 vCPU to the cluster (tested with up to 300 per second)."* Tăng RAM không thêm login nào; heap = 70% limit nên memory dùng bám theo limit dù không thiếu.
- Client credentials và refresh: 120/s mỗi vCPU (test tới 2000/s và 435/s). Một login tốn 66,7 ms CPU, một CC hoặc refresh 8,3 ms: 8 lần, vì chỉ login có băm.
- Headroom +150%: limit = request × 2,5. Ví dụ docs: 45 login + 360 CC + 360 refresh/s trên 3 pod thành 3 vCPU request, 7,5 vCPU limit mỗi pod.
- Hệ số đo trên ARM c7g, Argon2 5 vòng 7 MiB, 1 triệu user, 20.000 client, session không cache in-memory. Trên x86, CC và refresh tới gấp đôi mỗi core; login không đổi.
- Memory: nền 1.250 MB mỗi pod gồm 10.000 session cache; heap 70% limit, non-heap khoảng 300 MB; limit = (1250 − 300) / 0,7 = 1.360 MB. Không tăng theo số user vì cache session có trần.
- Ở 1 triệu user, đỉnh 200 login/s và refresh mỗi 4 phút: refresh (13,89 vCPU) ăn ngang login (13,33 vCPU); tổng 27,47 vCPU request, 68,68 limit, 26.133 write IOPS DB. Refresh vượt mốc test 3,8 lần.
- Lab M4 dev mode: 20–28 ms CPU mỗi password login, 1,03 ms mỗi CC, 1,12 ms mỗi refresh. Tỷ lệ login/CC 23 lần (lab này), khoảng 10 lần (lab #1), so với 8 lần của docs; lab thiếu chi phí DB và mạng (suy luận), nên không dùng số lab để thu nhỏ cluster.
- Núm: số vòng hash (trên lab: 1 vòng khoảng 0,6 lần CPU, 10 vòng 3,5–4,3 lần, PBKDF2-SHA512 5,1–5,7 lần; không tuyến tính theo số vòng), `http-max-queued-requests` (503 thay vì hàng vô hạn), pool DB initial = min = max, cache (trên 2.500 client đồng thời là tràn), kéo dài access token để giảm refresh.
- Full Scope Allowed in một dòng WARN 417 byte cho mỗi token: 99,98% log trên lab, 2,85 GB mỗi giờ ở 1.897 token/s. CPU đo không thấy khác; chi phí là log.

→ **Bài 28 — Observability và audit**: bài này đã dùng ba metric để sizing; bài sau dựng health, metrics và event thành bảng báo động, để biết CPU băm sắp chạm trần trước khi người dùng thấy latency tăng.
