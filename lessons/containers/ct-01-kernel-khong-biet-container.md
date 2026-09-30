# Bài 1 — Kernel không biết "container" là gì

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích vì sao **cùng một process có hai PID khác nhau** tuỳ chỗ bạn đứng hỏi, và chỉ ra chỗ trong `/proc` để tự xác nhận điều đó.
- Nói được **cách so hai process có cùng namespace hay không** cho đúng — và vì sao "so inode" là câu trả lời thiếu.
- Chứng minh container **không boot gì cả**, và suy ra ba hệ quả bắt buộc của việc dùng chung kernel.
- Tách **namespace** và **cgroup** thành **hai trục độc lập**, rồi đặt được một hệ thống thật vào đúng một trong bốn ô của mặt phẳng đó.
- Chỉ ra bằng một dòng man page rằng **`/proc` không tự được namespace hoá** — và suy ra vì sao `nproc`, `top`, `free` trong container nói số của host.
- Phát biểu đúng câu "kill PID 1 của container" — cái gì xuyên qua được, cái gì không, và từ hướng nào.

---

## 2. Triệu chứng

Bạn chạy một service Node trong container. Vào trong xem:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ docker exec -it api ps -o pid,ppid,cmd
  PID  PPID CMD
    1     0 node /app/server.js
```

PID 1. Đúng như mọi tài liệu nói. Bạn thoát ra, chạy trên host:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ ps -o pid,ppid,cmd -C node
  PID  PPID CMD
 4827  4102 node /app/server.js
```

**PID 4827.** Cùng một lệnh, cùng một file `/app/server.js`, cùng một service đang nghe cùng một cổng. Không có process thứ hai nào ở đây — RSS cộng lại vẫn là một bản, `kill -0 4827` từ host tác động đúng vào cái process mà container đang chạy.

Và nó không dừng ở PID. Cũng cùng một process đó:

- `hostname` trong container trả `a3f1c9d02b7e`; trên host trả `ip-10-0-3-44`.
- `ls /` trong container ra một cây thư mục khác hẳn host — không thiếu vài thứ, mà là một cây khác.
- `uname -r` trong container và trên host trả **y hệt nhau**.

Ba dòng đầu khác nhau, dòng thứ ba giống nhau. Nếu container là "một cái máy nhỏ" thì tại sao có thứ khác, có thứ giống — và ai quyết định thứ nào thuộc nhóm nào?

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp. Chọn sai ở đây có giá trị hơn đọc trôi qua.

**`ps` trong container báo PID 1, `ps` trên host báo PID 4827, cho cùng một process. Con số nào là "PID thật"?**

```
(a) 4827 — đó là PID kernel cấp; số 1 là con số giả do Docker dựng lên
(b) 1 — trong không gian của container thì nó là PID 1; 4827 chỉ là chi tiết của host
(c) Cả hai đều thật, và cả hai đều không đủ: PID không phải thuộc tính của process
(d) Có hai process thật — Docker chạy một proxy PID 1 rồi fork service ra
```

---

## 3. Lý thuyết

### 3.1 Bản sai chạy trước: "container là VM siêu nhẹ"

Trước khi trả lời, hãy để một mô hình sai chạy cho tới khi nó tự vỡ. Mô hình này phổ biến vì nó **giải thích được rất nhiều thứ**:

| Quan sát | Mô hình "VM siêu nhẹ" giải thích |
|---|---|
| `hostname` khác | Máy khác thì tên máy khác |
| `ls /` khác | Đĩa khác thì cây thư mục khác |
| PID bắt đầu từ 1 | Máy mới boot thì PID đếm lại từ đầu |
| `docker stop` / `docker start` | Tắt máy / bật máy |
| RAM bị giới hạn 512 MB | Máy ảo được cấp 512 MB |
| Mạng riêng, IP riêng | Máy ảo có NIC riêng |

Sáu trên sáu. Mô hình này dự đoán đúng gần hết hành vi hằng ngày, nên nó sống rất dai — kể cả trong đầu người đã dùng Docker vài năm.

Nó vỡ ở đúng một chỗ: **`uname -r` giống nhau.**

Nếu container có kernel riêng thì `uname -r` phải khác. Nó không khác. Và khi bạn kéo sợi chỉ đó ra, cả mô hình tuột theo.

> **Suy luận, không phải trích dẫn.** Không man page nào nói "`uname -r` trong container trả kernel của host". Nó suy ra từ danh sách namespace: man7 `namespaces(7)` liệt kê **đúng 8 loại** thứ mà một process có thể có bản riêng — `CLONE_NEWCGROUP`, `CLONE_NEWIPC`, `CLONE_NEWNET`, `CLONE_NEWNS`, `CLONE_NEWPID`, `CLONE_NEWTIME`, `CLONE_NEWUSER`, `CLONE_NEWUTS`
> ([namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)). Trong danh sách đó **không có loại nào cho "phiên bản kernel"**. Không có cơ chế để một process thấy một kernel khác, nên nó thấy đúng kernel đang chạy nó. **Đo lại:** `uname -r` trên host, rồi `docker run --rm alpine uname -r`, so hai chuỗi.

Ba hệ quả suy ra ngay từ chỗ này, và cả ba đều là chuyện thực tế bạn đã hoặc sẽ gặp:

1. **Không có container Windows chạy trên kernel Linux.** Không phải vì Docker chưa hỗ trợ — vì binary Windows gọi syscall Windows, và ở đây chỉ có một kernel, kernel Linux. (Docker Desktop trên máy bạn *có* chạy image Linux, nhưng bằng cách dựng một VM Linux thật rồi đặt container vào trong đó. Đó là VM làm việc VM, không phải container làm việc VM.)
2. **Kernel feature thiếu là lỗi của host, không phải của image.** Image không mang kernel, nên nó không mang theo được cái nó cần từ kernel.
3. **Bề mặt tấn công kernel là dùng chung.** Quay lại ở mục 3.7.

### 3.2 Container không "boot" — nó `fork` rồi `exec`

Mô hình VM còn một lời hứa nữa: "PID đếm lại từ 1 vì máy mới boot". Đối chiếu hai chuỗi việc:

| VM khởi động | Container khởi động |
|---|---|
| firmware / BIOS POST | — |
| bootloader nạp kernel | — |
| kernel init: phát hiện thiết bị, mount root | — |
| `init` / systemd | — |
| systemd dựng hàng chục unit, target, socket | — |
| cuối cùng: `exec` process ứng dụng | `clone()` với vài flag, rồi `execve()` process ứng dụng |

Container **bỏ trắng năm dòng đầu**. Không phải "làm năm dòng đó nhanh hơn" — là **không làm**. Nó chỉ tạo process, rồi trước khi `exec`, sắp xếp vài thứ quanh process đó.

Đây mới là lý do thật của "container nhanh". Câu "container nhẹ hơn nên khởi động nhanh hơn" nhầm nhân với quả: image nhỏ tiết kiệm lúc `pull`, chứ lúc start thì byte của image không phải thứ tốn thời gian. Thứ tốn thời gian trong VM là **năm dòng công việc** đó, và container không có dòng nào.

> **Chưa đo.** Không nguồn cấp một nào trong bộ nguồn của course cho một con số kiểu "container start 0,3 s vs VM 30 s", và bài này chưa chạy trên Linux thật. Đừng nhớ con số nào cả — nhớ **cấu trúc**: năm bước biến mất, không phải năm bước chạy nhanh hơn. **Đo bằng:** `time docker run --rm alpine true` và `time` một `runc run` trên bundle sẵn có, so với thời gian boot một VM cùng host. Ghi số vào bài khi có môi trường.

Và vì nó `fork`+`exec` chứ không boot, một câu hỏi thú vị xuất hiện: nếu không có kernel mới đếm PID lại từ đầu, thì con số 1 ở mục 2 ở đâu ra?

---

## ⏸ Dừng lại — đoán trước #2

Trước khi mục sau tiết lộ. Bạn có hai process và muốn biết chúng có **cùng network namespace** hay không. Bạn chạy:

```
$ readlink /proc/4827/ns/net
net:[4026532567]
$ readlink /proc/1/ns/net
net:[4026531840]
```

Hai số khác nhau, nên khác namespace. Bây giờ ngược lại: **nếu hai số inode đó GIỐNG nhau, bạn đã kết luận được "cùng namespace" chưa?**

```
(a) Rồi — inode trong một kernel là duy nhất
(b) Chưa — phải so cả một trường thứ hai nữa, man page nói rõ
(c) Chưa — phải so nội dung `readlink` cả 8 file ns
(d) Câu hỏi sai — namespace không có inode, chuỗi đó chỉ là nhãn Docker sinh ra
```

---

### 3.3 PID là một câu trả lời, không phải một thuộc tính

Đáp án ⏸#1 là **(c)**, và đáp án ⏸#2 là **(b)**. Hai đáp án này là cùng một ý.

Trong kernel, process tồn tại như một cấu trúc. Nó **không mang một con số PID duy nhất**; nó mang một ánh xạ: với mỗi pid namespace mà nó nhìn thấy được, nó có một số. `ps` không đọc "PID của process" — `ps` đọc `/proc`, và `/proc` trả lời theo pid namespace của **người đang hỏi**. Bạn hỏi từ pid ns của container, câu trả lời là 1. Bạn hỏi từ pid ns gốc, câu trả lời là 4827.

Con số 1 xuất hiện không phải vì kernel mới boot. Nó xuất hiện vì `unshare(2)` quy định rõ: process gọi **không** bị chuyển vào pid ns mới, và **con đầu tiên** của nó mới là process ID 1 trong ns đó. Đó là lý do runtime phải `fork` sau khi tạo pid namespace — và là lý do `unshare -p` trên dòng lệnh cần thêm `-f` (bài 2 mổ kỹ).

Còn cái cho bạn *nhìn thấy* các namespace đang tồn tại là `/proc/<pid>/ns/`:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ ls -1 /proc/4827/ns/
cgroup  ipc  mnt  net  pid  time  user  uts
$ readlink /proc/4827/ns/uts
uts:[4026532561]
$ readlink /proc/1/ns/uts
uts:[4026531838]
```

Số inode khác nhau ở `uts` chính là toàn bộ lý do `hostname` cho hai kết quả khác nhau ở mục 2. Không có "máy thứ hai" nào — có hai bảng tên, và process đọc bảng thuộc namespace của nó.

> **Nguồn — chưa tự đo.** Nội dung symlink trong `/proc/pid/ns/` có dạng loại + inode:
> ([namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html): *"a string containing the namespace type and inode number as in the following example: `uts:[4026531838]`"*).
> Chúng là **symlink** từ Linux 3.8; trước đó hiện ra như hard link (*"In Linux 3.7 and earlier, these files were visible as hard links."* / *"Since Linux 3.8, they appear as symbolic links."*).
> Và để biết hai process có cùng một namespace, man page yêu cầu so **hai** trường, không phải một: *"an application can check this using the stat.st_dev and stat.st_ino fields returned by stat(2)"*.
> **Đo lại:** `stat -L -c '%d %i' /proc/1/ns/net /proc/self/ns/net`.

Câu cuối là chỗ rất nhiều bài viết nói thiếu: "so inode number là biết cùng namespace". Không đủ. `st_ino` chỉ duy nhất **trong một filesystem**; định danh đầy đủ của một inode là cặp `(st_dev, st_ino)`. Dùng `stat -L -c '%d %i'` thì bạn được cả hai. Dùng `readlink` thì bạn chỉ được một nửa — tiện để mắt người so nhanh, không đủ để một script kết luận.

Lưu ý luôn một cái bẫy version, vì nó sẽ theo bạn suốt course: bảng trong `namespaces(7)` có ghi kernel version bên cạnh từng file — `cgroup` từ 4.6, `time` từ 5.6. Đó là version **cái file handle trong `/proc/pid/ns/` xuất hiện**, không phải version namespace đó ra đời. Đừng suy từ bảng đó ra tuổi của một namespace.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="ct1-a-t ct1-a-d" style="width:100%;height:auto">
<title id="ct1-a-t">Một process, hai con số PID tuỳ khung nhìn</title>
<desc id="ct1-a-d">Cùng một process trong kernel được nhìn từ hai pid namespace: từ namespace gốc trên host nó là PID 4827 dưới cây process của shim, còn từ pid namespace con nó là PID 1 và là cha của PID 14. Con số PID là câu trả lời phụ thuộc người hỏi, không phải thuộc tính của process.</desc>
<rect x="18" y="26" width="318" height="140" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
<text x="34" y="48" font-size="12" font-weight="bold" fill="currentColor">Hỏi từ pid ns GỐC (ps trên host)</text>
<text x="40" y="72" font-size="11" fill="currentColor">PID 1 systemd</text>
<text x="60" y="92" font-size="11" fill="currentColor">PID 4102 containerd-shim</text>
<rect x="72" y="100" width="242" height="24" rx="5" fill="#f59e0b" fill-opacity="0.30"/>
<text x="82" y="117" font-size="11" font-weight="bold" fill="currentColor">PID 4827 node /app/server.js</text>
<text x="100" y="142" font-size="11" fill="currentColor">PID 4901 node (worker)</text>
<text x="34" y="160" font-size="10" fill="currentColor" opacity="0.7">thấy cả 200+ process của máy</text>
<rect x="384" y="26" width="318" height="140" rx="10" fill="#84cc16" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
<text x="400" y="48" font-size="12" font-weight="bold" fill="currentColor">Hỏi từ pid ns CON (ps trong container)</text>
<rect x="410" y="74" width="242" height="24" rx="5" fill="#f59e0b" fill-opacity="0.30"/>
<text x="420" y="91" font-size="11" font-weight="bold" fill="currentColor">PID 1 node /app/server.js</text>
<text x="438" y="118" font-size="11" fill="currentColor">PID 14 node (worker)</text>
<text x="400" y="142" font-size="11" fill="currentColor" opacity="0.7">không có systemd, không có shim</text>
<text x="400" y="160" font-size="10" fill="currentColor" opacity="0.7">thấy đúng 2 process</text>
<rect x="196" y="206" width="330" height="52" rx="10" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="361" y="228" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">MỘT process trong kernel</text>
<text x="361" y="247" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">một task, một RSS, một cổng đang nghe</text>
<line x1="230" y1="206" x2="180" y2="168" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="492" y1="206" x2="542" y2="168" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="361" y="282" font-size="11" font-style="italic" text-anchor="middle" fill="currentColor">PID là câu trả lời của /proc cho một người hỏi cụ thể</text>
</svg>

### 3.4 Bản sai thứ hai: "container cô lập process"

Mô hình này sai tinh vi hơn, nên nguy hiểm hơn. Nó cũng đúng phần lớn thời gian: process trong container thật sự không thấy process của host, không đọc được `/etc/shadow` của host, không bind được vào cổng của host.

Phá nó bằng một phép thử bất đối xứng. Từ **trong** container, `kill -9 1`:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ docker exec api sh -c 'kill -TERM 1; sleep 1; echo van-song'
van-song
```

`kill -TERM 1` không làm gì, vì entrypoint không đặt handler cho SIGTERM. Từ **host**, `kill -9 4827` thì container chết ngay — và chết cả những process khác bên trong nó.

Cùng một process, cùng một signal, hai kết quả, chỉ vì **hướng**. Đó không phải hành vi của một hàng rào. Hàng rào thì hai bên đều không qua được.

> **Nguồn — chưa tự đo.** `pid_namespaces(7)` nói hai điều, và phải ghép cả hai mới đúng:
> (a) với PID 1 của một namespace, *"Only signals for which the 'init' process has established a signal handler can be sent to the 'init' process by other members of the PID namespace."* — nên `kill -TERM 1` từ trong container rơi vào hư không nếu app không trap SIGTERM;
> (b) nhưng *"SIGKILL and SIGSTOP bypass this restriction when sent from ancestor namespaces"* — từ pid ns tổ tiên thì xuyên qua.
> Và nếu PID 1 chết thật: *"If the 'init' process of a PID namespace terminates, the kernel terminates all of the processes in the namespace via a SIGKILL signal."*
> ([pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)).
> **Đo lại:** `unshare -pf --mount-proc sh -c 'kill -TERM 1; echo alive'`, rồi `unshare -pf --mount-proc sh -c 'sleep 100 & kill -9 1'`.

Vậy phát biểu đúng là: **"không thể kill PID 1 của container" là sai.** Đúng là: từ *trong* namespace, PID 1 chỉ nhận signal mà nó có handler; từ *ngoài*, SIGKILL và SIGSTOP đi qua bình thường. Đây cũng chính là lý do `docker stop` gửi SIGTERM rồi mới SIGKILL — và lý do app không trap SIGTERM thì `docker stop` luôn phải chờ hết timeout mới chết.

Rút ra một câu đáng nhớ hơn cả hai bản sai vừa phá:

> **Cô lập trong container là cô lập của *khung nhìn*, không phải của *quyền lực*.** Namespace đổi câu trả lời mà kernel trả cho process; nó không dựng một biên giới hai chiều như hypervisor.

### 3.5 Bốn thứ `docker run` lắp lại

Giờ mới đến lúc trả lời câu hỏi cuối mục 2: ai quyết định thứ nào khác, thứ nào giống?

Không ai quyết định ở mức "container". Trong kernel **không tồn tại object nào tên là container** — không có struct đó, không có syscall `create_container()`, không có `/proc/containers`. Có process, có namespace, có cgroup, có mount. `docker run` là một chương trình **sắp xếp bốn thứ đó** rồi `exec` code của bạn. `docker ps` liệt kê được container chỉ vì Docker tự ghi danh sách đó ra, không phải vì hỏi kernel.

Bốn thành phần, mỗi cái trả lời một **câu hỏi khác nhau** — và đây là bản đồ của cả 21 bài còn lại:

| Thành phần | Trả lời câu hỏi | Ví dụ hệ quả bạn đã gặp | Bài |
|---|---|---|---|
| **namespace** | tôi **thấy** gì | `hostname` khác, `ps` chỉ thấy 2 process | 2, 3, 18, 19 |
| **cgroup** | tôi **dùng được** bao nhiêu | `OOMKilled`, p99 nhảy vọt khi CPU mới 40 % | 4, 5, 6, 7 |
| **union filesystem** | rootfs ở đâu ra mà **không copy** | image vài trăm MB mà start tức thì | 8 tới 12 |
| **OCI spec** | cái gì làm nó **lặp lại được** ở máy khác | cùng digest, cùng hành vi, khác máy | 10, 16 |

Bốn dòng này không phải bốn cách nói về một thứ. Chúng độc lập tới mức bạn **bật cái này mà tắt cái kia** được, và hệ thống thật vẫn chạy.

Chỗ người mới gộp nhiều nhất là hai dòng đầu. Namespace và cgroup là **hai trục vuông góc**, không phải hai tên gọi của "cách ly":

<svg viewBox="0 0 660 340" role="img" aria-labelledby="ct1-b-t ct1-b-d" style="width:100%;height:auto">
<title id="ct1-b-t">Namespace và cgroup là hai trục độc lập</title>
<desc id="ct1-b-d">Mặt phẳng hai trục: trục dọc là namespace quyết định process thấy bao nhiêu, trục ngang là cgroup quyết định process dùng được bao nhiêu. Bốn ô tương ứng với process thường trên host, process bị cgroup giới hạn mà vẫn thấy cả máy, unshare thủ công không kèm cgroup, và cái mà ta gọi là container khi có cả hai.</desc>
<line x1="90" y1="292" x2="630" y2="292" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="90" y1="292" x2="90" y2="34" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<text x="360" y="320" font-size="11" text-anchor="middle" fill="currentColor">cgroup — trục "dùng được bao nhiêu"</text>
<text x="112" y="50" font-size="11" fill="currentColor">namespace — trục "thấy bao nhiêu"</text>
<text x="150" y="306" font-size="10" fill="currentColor" opacity="0.7">không giới hạn</text>
<text x="500" y="306" font-size="10" fill="currentColor" opacity="0.7">có giới hạn</text>
<rect x="104" y="180" width="236" height="96" rx="8" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="118" y="204" font-size="11" font-weight="bold" fill="currentColor">thấy hết · dùng hết</text>
<text x="118" y="224" font-size="10" fill="currentColor">process thường trên host</text>
<text x="118" y="242" font-size="10" fill="currentColor" opacity="0.75">điểm xuất phát, không có gì đặc biệt</text>
<rect x="356" y="180" width="236" height="96" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
<text x="370" y="204" font-size="11" font-weight="bold" fill="currentColor">thấy hết · dùng ít</text>
<text x="370" y="224" font-size="10" fill="currentColor">systemd unit có MemoryMax</text>
<text x="370" y="242" font-size="10" fill="currentColor" opacity="0.75">bị siết mà vẫn nhìn thấy cả máy</text>
<rect x="104" y="68" width="236" height="96" rx="8" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
<text x="118" y="92" font-size="11" font-weight="bold" fill="currentColor">thấy ít · dùng hết</text>
<text x="118" y="112" font-size="10" fill="currentColor">unshare thủ công, không cgroup</text>
<text x="118" y="130" font-size="10" fill="currentColor" opacity="0.75">cô lập view nhưng ăn hết RAM máy</text>
<rect x="356" y="68" width="236" height="96" rx="8" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="370" y="92" font-size="11" font-weight="bold" fill="currentColor">thấy ít · dùng ít</text>
<text x="370" y="112" font-size="10" fill="currentColor">cái ta quen gọi là "container"</text>
<text x="370" y="130" font-size="10" fill="currentColor" opacity="0.75">hai trục cùng bật, không phải một thứ</text>
</svg>

Ô xanh dương trái trên là chỗ đáng nghĩ lâu nhất: **cô lập đầy đủ mà không giới hạn gì.** Một process trong đủ 8 namespace vẫn có thể ăn hết RAM của máy và làm chết mọi container khác — vì namespace chưa bao giờ nói một câu nào về lượng. Và ô cam phải dưới là chiều ngược lại: bị siết RAM mà vẫn thấy toàn bộ máy. Chương 2 dành bốn bài cho trục ngang chính vì hầu hết sự cố production nằm ở trục đó, còn người ta lại quen nghĩ về trục dọc.

CLI để lắp bốn thứ này thì `lessons/engineering/eng-05-docker.md` đã dạy đủ; course này không nhắc lại một cờ nào.

### 3.6 Cái gì KHÔNG được ảo hoá: `/proc`

Bây giờ tới chỗ trả giá cho mô hình "khung nhìn". Nếu cô lập là khung nhìn, thì khung nhìn ấy phải **được ai đó dựng lên**. Kernel không tự dựng.

Bằng chứng nằm ngay trong man page của `unshare(1)`, ở chỗ giải thích tuỳ chọn `--mount-proc`:

> **Nguồn — chưa tự đo.** `--mount-proc` *"mount the proc filesystem at mountpoint (default is /proc) … It also implies creating a new mount namespace since the /proc mount would otherwise mess up existing programs"*
> ([unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)). Tức là sau khi tạo pid namespace mới, **bạn phải tự mount `/proc`** — kernel không làm hộ; và vì mount đó sẽ phá các program đang chạy nếu dùng chung mount list, nó kéo theo luôn một mount namespace mới.
> Kèm với đó, `mount_namespaces(7)` nói rõ mount namespace cô lập *"the list of mounts seen by the processes in each namespace instance"* — **danh sách mount**, không phải filesystem.
> **Đo lại:** `unshare -p ps aux` (thấy toàn bộ process của host) rồi `unshare -pf --mount-proc ps aux`.

Đọc kỹ dòng đó thì nó nói một điều lớn hơn `/proc`: `unshare -p` **không** khiến `ps` thấy ít process đi. Bạn đã có pid namespace mới, nhưng `ps` vẫn đọc cái `/proc` cũ — cái `/proc` của host — nên vẫn thấy hết. Namespace hoạt động; thứ không hoạt động là **nguồn thông tin mà chương trình đang đọc**.

Từ đó suy ra hạt giống của cả chương 2:

> **Suy luận, không phải trích dẫn.** Không nguồn nào phát biểu "`nproc` trong container trả số CPU của host". Nó suy ra từ chuỗi: (1) `/proc` là một filesystem phải **mount tay** sau khi tạo namespace; (2) mount namespace chỉ cô lập **danh sách mount**, nên nếu không ai mount một `/proc` mới thì process đọc đúng `/proc` của host; (3) `nproc`, `top`, `free` lấy số từ `/proc/cpuinfo`, `/proc/stat`, `/proc/meminfo`. Vậy con số chúng in ra là con số của **máy**, không phải của cgroup đang siết chúng. **Kiểm bằng:** `docker run --rm --cpus=1 alpine nproc` trên một host nhiều core, so với `nproc` trên host.

Và đây là nguồn của một loại bug rất khó tin khi lần đầu gặp: runtime của bạn tự cấu hình theo số core mà nó *thấy*, trong khi cgroup chỉ cho nó *dùng* một phần. Go đặt `GOMAXPROCS`, JVM chọn số GC thread, thư viện pool chọn số worker — tất cả theo con số của host. Bài 6 đo tới cùng chuyện này, bài 7 làm chuyện tương ứng cho RAM (`free` trong container, và vì sao `OOMKilled` xảy ra khi `top` báo còn chỗ).

Mấu chốt để mang sang chương 2: **mỗi thứ không được namespace hoá là một chỗ mà "container" rò ra.** Danh sách 8 namespace là danh sách đóng; cái gì không nằm trong đó thì không có bản riêng.

### 3.7 Ranh giới bảo mật: cùng kernel là cùng bề mặt tấn công

Ba mục trên cộng lại cho một kết luận không cần lên giọng:

> **Suy luận, không phải trích dẫn.** VM và container không cùng hạng về cô lập, và lý do là cơ chế chứ không phải chất lượng cài đặt: container dùng **chung kernel** với host (mục 3.1), và cô lập của nó là kernel **trả lời khác nhau** cho process ở namespace khác nhau (mục 3.4). Vậy một lỗi trong chính kernel nằm ở **cả hai phía** cùng lúc — không có lớp nào ở giữa để lỗi đó phải vượt qua. Với VM, cùng lỗi đó nằm trong kernel guest, và còn một hypervisor nữa ở giữa.

Đó là lý do người ta chạy workload nhiều tenant trong VM, hoặc trong runtime dựng VM cho mỗi container. Nó không có nghĩa container "không an toàn" — có nghĩa **cái bạn tin cậy khác nhau**: với VM bạn tin hypervisor, với container bạn tin kernel. Toàn bộ phần threat model, non-root, seccomp, capability đã nằm ở `lessons/devops/devops-06-container-security.md`; course này chỉ cung cấp cơ chế để đọc bài đó không phải tin ai cả.

---

## 4. Bốn câu hỏi, và bài nào trả lời

Cách dùng bảng này: khi gặp một hành vi lạ của container, xác định nó thuộc **trục** nào trước, rồi mới đi tìm file cụ thể. Gần như mọi lần đi sai đường là do nhầm trục.

| Hành vi lạ bạn thấy | Trục | Vì sao thuộc trục đó | Bài |
|---|---|---|---|
| `ps` trong container chỉ thấy 2 process | namespace (pid) | đổi câu trả lời của `/proc`, không đổi lượng tài nguyên | 2 |
| `ls /` khác host hoàn toàn | namespace (mnt) | đổi **danh sách mount** mà process thấy | 3 |
| `nproc` báo 64 khi limit là 2 | **không** namespace | `/proc` không có bản riêng nếu không mount tay | 6 |
| `free` báo RAM của host | **không** namespace | cùng lý do trên | 7 |
| Process chết với exit 137 | cgroup | vượt giới hạn lượng, không liên quan khung nhìn | 7 |
| p99 tăng vọt khi CPU average 40 % | cgroup | bị dừng tới hết period, vẫn thấy đủ CPU | 5 |
| Image vài trăm MB mà start tức thì | union fs | rootfs là mount, không phải bản copy | 8 |
| Cùng tag, khác hành vi giữa hai máy | OCI spec | tag là con trỏ dời được, digest thì không | 10 |
| Owner file trên bind mount hiện số lạ | namespace (user) | ID được dịch qua map, không phải lỗi permission | 18 |
| `-p 8080:80` mở cổng ra Internet dù firewall chặn | namespace (net) + NAT | rule nằm ở tầng khác với firewall bạn cấu hình | 20 |

Hai dòng in đậm là hai dòng đắt nhất trong thực tế, và cả hai đều là **chỗ KHÔNG có cô lập** — không phải chỗ cô lập hoạt động sai.

---

## 5. Tính tay

Giấy và bút, không cần máy. Mọi dữ kiện cần thiết đều ở mục 3.

**Bài 1 — đọc bảng namespace của hai process.** Bạn chạy `stat -L -c '%d %i'` trên cả 8 file `ns` của hai process, được bảng sau (`%d` là `st_dev`, `%i` là `st_ino`):

| file `ns` | process A (`/proc/1/ns/`) | process B (`/proc/4827/ns/`) |
|---|---|---|
| `cgroup` | `4 4026531835` | `4 4026531835` |
| `ipc` | `4 4026531839` | `4 4026532563` |
| `mnt` | `4 4026531840` | `4 4026532561` |
| `net` | `4 4026531992` | `4 4026532567` |
| `pid` | `4 4026531836` | `4 4026532564` |
| `time` | `4 4026531834` | `4 4026531834` |
| `user` | `4 4026531837` | `4 4026531837` |
| `uts` | `4 4026531838` | `4 4026532562` |

- B không có bản riêng của mấy loại namespace, và là những loại nào?
- `hostname` chạy trong B trả về tên của B hay của A? Còn `date`?
- B có phải rootless container không? Dòng nào cho biết?
- Nếu bạn chỉ có `readlink` chứ không có `stat`, bạn mất thông tin gì so với bảng trên, và trong trường hợp nào thì mất thông tin đó dẫn tới kết luận sai?

**Bài 2 — ma trận signal.** Container `api` có entrypoint là binary Go **không trap signal nào**. PID của nó: 1 trong ns con, 4827 trên host. Trong container còn một process con (PID 14 trong ns, 4901 trên host).

- `kill -TERM 1` từ trong container: process nào chết? Vì sao?
- `kill -9 1` từ trong container: process nào chết?
- `kill -TERM 4827` từ host: process nào chết?
- `kill -9 4827` từ host: process nào chết? Liệt kê đủ, và ghi rõ **ai** gửi signal cho từng cái chết đó.
- Suy ra: `docker stop` gửi SIGTERM, chờ hết một khoảng timeout rồi mới SIGKILL (tra timeout mặc định bằng `docker stop --help` — đừng tin con số bạn nhớ). Với binary này, `docker stop` mất bao lâu, và sửa binary thế nào để nó xong gần như tức thì?

**Bài 3 — bốn trục, một sự cố.** Một pod bị `OOMKilled` liên tục. Bạn tăng memory limit gấp đôi, hai ngày sau nó lại chết. Đội bạn đề xuất bốn hướng:

```
(i)   chuyển sang image alpine cho nhẹ
(ii)  thêm namespace cho /proc để app đọc đúng số
(iii) đọc memory.stat xem phần nào đang chiếm
(iv)  dùng VM thay container cho cô lập tốt hơn
```

- Xếp từng đề xuất vào **một** trong bốn trục ở mục 3.5 (hoặc "không thuộc trục nào").
- Đề xuất nào nhầm trục? Giải thích bằng đúng một câu mỗi cái.
- Đề xuất nào đúng trục nhưng bài này chưa cho bạn công cụ để làm, và bài nào trong roadmap sẽ cho?

---

## 6. Chuyển giao

Không có đáp án trong bài. Đây là chỗ đo xem bạn đã hiểu hay chỉ vừa đọc xong.

Bạn nhận một job CI chạy test integration. Trên laptop của một đồng nghiệp (Linux, 8 core) test xanh; trên runner CI (Linux, 64 core, container có `--cpus=2`) test đỏ với lỗi timeout ở bước khởi động pool kết nối.

1. Trước khi đọc một dòng log nào: hành vi này thuộc trục nào trong bốn trục ở mục 3.5? Có thể thuộc nhiều trục không?
2. Pool kết nối được cấu hình `size = số core`. Trên runner, con số đó bằng bao nhiêu, và **vì sao** nó không bằng 2?
3. Giả sử bạn sửa được đúng một thứ. Sửa `size` thành hằng số, hay sửa để app đọc được giới hạn thật? Hai cách đó khác nhau ở chỗ nào khi tuần sau CI đổi limit thành `--cpus=4`?
4. Đồng nghiệp đề xuất: "cho runner chạy trong VM riêng là hết". Điều đó sửa được hành vi ở câu 2 không? Vì sao?
5. Test có một bước đo thời gian trôi qua bằng `CLOCK_MONOTONIC`. Nếu ai đó gợi ý "đặt time namespace để test tự tin về thời gian", bạn phản biện thế nào dựa trên nguyên tắc "danh sách 8 namespace là danh sách đóng"?
6. Job CI kết thúc bằng cách gửi SIGTERM cho container rồi chờ. Nó treo đúng 10 s mỗi lần. Từ mục 3.4, nguyên nhân nằm ở phía kernel hay phía application code?
7. **Câu khó nhất:** container trong CI chạy được `docker build` bên trong nó (Docker-in-Docker). Nếu trong kernel không tồn tại object nào tên là "container", thì "container lồng trong container" nghĩa chính xác là gì ở mức namespace và cgroup — và vì sao nó không cần một cơ chế lồng nhau mới nào của kernel? Trả lời được câu này thì bạn đã thay xong mô hình "container là một cái máy" bằng mô hình đúng.

---

## 7. Tóm tắt

- Trong kernel Linux **không tồn tại object nào tên là "container"**. Có process, có namespace, có cgroup, có mount. `docker run` là một chương trình sắp xếp bốn thứ đó rồi `exec` code của bạn.
- **PID không phải thuộc tính của process**, nó là câu trả lời `/proc` đưa ra cho một pid namespace cụ thể. `unshare(2)`: process gọi không vào ns mới, *"The first child created by the calling process will have the process ID 1"*.
- Namespace hiện ra ở `/proc/pid/ns/*` dưới dạng `type:[inode]`, ví dụ `uts:[4026531838]`. Để kết luận hai process cùng namespace phải so **`st_dev` và `st_ino`**, không chỉ inode number.
- Có **8** loại namespace theo `namespaces(7)`, không phải 6. Kernel version ghi trong bảng đó là version **file handle xuất hiện**, không phải tuổi của namespace.
- Container **không boot**: nó bỏ trắng firmware, bootloader, kernel init, systemd. Đó là lý do nó nhanh — không phải vì "nhẹ hơn".
- **Kernel dùng chung** → `uname -r` giống host, không có container Windows trên kernel Linux, và bề mặt tấn công kernel là dùng chung.
- **namespace và cgroup là hai trục độc lập.** Thấy ít mà dùng hết RAM máy là chuyện có thật; bị siết RAM mà thấy cả máy cũng vậy.
- **Cô lập là khung nhìn, không phải hàng rào.** Từ trong ns, PID 1 chỉ nhận signal nó có handler; nhưng *"SIGKILL and SIGSTOP bypass this restriction when sent from ancestor namespaces"*, và PID 1 chết thì kernel SIGKILL toàn bộ namespace.
- **`/proc` phải mount tay.** `unshare(1)` nói `--mount-proc` tồn tại vì *"the /proc mount would otherwise mess up existing programs"*. Hệ quả: `nproc`, `top`, `free` đọc số của host — bài 6 và bài 7 đo tới cùng.

→ **Bài 2 — Tám namespace, và tự dựng container bằng `unshare`**: đi hết danh sách đóng 8 loại đó, xem mỗi loại đổi đúng câu trả lời nào của kernel, và dựng một "container" bằng tay để thấy `docker run` không làm gì bí ẩn.
