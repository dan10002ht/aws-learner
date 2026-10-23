# Bài 2 — Tám namespace, và tự dựng container bằng `unshare`

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê **đủ tám** loại namespace cùng flag `CLONE_NEW*`, và chỉ ra hai bẫy tên: `CLONE_NEWNS` là mount (không phải `CLONE_NEWMNT`), và kernel gọi `mnt`/`net` trong khi OCI spec gọi `mount`/`network`.
- Giải thích **vì sao `unshare -p` một mình không đủ**, tách hai nguyên nhân độc lập ở hai tầng khác nhau, và nói đúng cờ nào sửa tầng nào.
- Dựng một thứ chạy như container bằng `unshare` theo **sáu bậc**, mỗi bậc trả lời được "bậc trước còn hở chỗ nào".
- Nói được cái mình vừa dựng còn **thiếu** gì so với container thật, và ánh cái thiếu đó vào đúng bài nào trong course.
- Phát biểu ba tính chất của PID 1 trong pid namespace — signal, reparent orphan, cái chết kéo theo cả namespace — kèm errno mà `fork(2)` trả về sau đó.
- Phân biệt **cgroup namespace** với cgroup controller, và nói được vì sao "container có thời gian riêng" là kỳ vọng sai dù time namespace tồn tại.

---

## 2. Triệu chứng

Bài 1 kết ở câu: namespace là trục "tôi thấy gì". Bạn muốn thấy tận mắt nên không mở Docker, gõ thẳng lệnh Linux:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ unshare -p ps -o pid,ppid,cmd
  PID  PPID CMD
     1     0 /sbin/init
  4827  4102 node /app/server.js
  ... còn cả bảng process của máy
```

Bạn vừa yêu cầu một **pid namespace mới**. Kỳ vọng: một, tối đa hai dòng, đếm lại từ 1. Thực tế: `/sbin/init` vẫn là PID 1, `ps` của bạn mang một con số giữa bảng. Lệnh không báo lỗi, exit code 0, không gì gợi ý là bạn gõ thiếu.

Kết luận tự nhiên — và là kết luận sai mà bài này sẽ cho chạy trước: **namespace là đồ trang trí; cái cô lập thật nằm trong Docker, không nằm trong kernel.**

Kiểm lại bằng loại namespace bài 1 đã dùng để giải thích `hostname`: `readlink /proc/self/ns/uts` trên host trả `uts:[4026531838]`, còn `unshare -u readlink /proc/self/ns/uts` trả `uts:[4026532562]`. Inode đổi — `-u` hoạt động thấy rõ. Vậy tại sao `-p` thì không?

Vì `-p` cần **hai** sửa chữa, và hai sửa chữa đó nằm ở hai tầng chẳng liên quan gì nhau.

---

## ⏸ Dừng lại — đoán trước #1

**`unshare -p ps` không báo lỗi, `ps` vẫn thấy toàn bộ process của host. Chuyện gì đã xảy ra?**

```
(a) pid ns không được tạo — cần root, và lệnh âm thầm bỏ qua
(b) pid ns được tạo, nhưng process ps KHÔNG nằm trong đó
(c) pid ns được tạo và ps nằm trong đó, nhưng ps đọc dữ liệu từ /proc của host
(d) Cả (b) và (c) cùng xảy ra, mỗi cái cần một cờ khác nhau để sửa
```

---

## 3. Lý thuyết

### 3.1 Tầng một: process gọi `unshare` không vào namespace nó vừa tạo

Đáp án ⏸#1 là **(d)**. Bắt đầu từ nửa dễ bỏ qua hơn.

`unshare(2)` phát biểu một quy tắc phải đọc trước mọi thứ khác về `CLONE_NEWPID`: process gọi syscall **không** được chuyển vào pid namespace mới. Namespace được tạo, nhưng **rỗng**. Thành viên đầu tiên là con đầu tiên mà process gọi sinh ra — và chính nó nhận số 1.

Vậy `unshare -p ps` làm thế này: tạo pid ns mới (rỗng), rồi `exec` thẳng `ps` **trong chính process gọi**, vốn vẫn thuộc pid ns cũ. `ps` chạy ở ns cũ, đọc bảng cũ, in bảng cũ. Namespace mới không có ai bên trong và chết ngay khi không còn tham chiếu.

Đó là lý do có cờ `-f`: nó bảo `unshare` **fork**, cho program chạy ở process con thay vì `exec`.

> **Nguồn — chưa tự đo.** `unshare(2)`: *"The calling process is _not_ moved into the new namespace. The first child created by the calling process will have the process ID 1"* ([unshare(2)](https://man7.org/linux/man-pages/man2/unshare.2.html)).
> `unshare(1)` mô tả `-f/--fork`: *"Fork the specified program as a child process of unshare rather than running it directly. This is useful when creating a new PID namespace."* ([unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)). Cùng man page, về namespace persistent: *"(Creation of a persistent PID namespace will fail if the --fork option is not also specified.)"*
> **Đo lại:** `unshare -p readlink /proc/self/ns/pid` và `unshare -pf readlink /proc/self/ns/pid`, so với `readlink /proc/self/ns/pid` trên host.

Rất nhiều bài viết giải thích `-f` là "để process không bị kill". Không phải: lý do là **thành viên của namespace** — không fork thì program chạy ở pid ns cũ.

<ab-toggle data-labels="unshare -p|unshare -pf">
<svg viewBox="0 0 520 392" role="img" aria-labelledby="ct2-a1-t ct2-a1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto"><title id="ct2-a1-t">unshare -p: program chạy ở pid ns cũ, ns mới rỗng</title><desc id="ct2-a1-d">unshare -p prog: shell ở pid namespace gốc, process gọi unshare(CLONE_NEWPID) vẫn ở namespace gốc, rồi exec prog trong chính process đó nên prog chạy ở namespace gốc. Pid namespace mới tồn tại nhưng không có thành viên, không ai là PID 1, và biến mất cùng process gọi.</desc><defs><marker id="ct2-a1-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="14" y="24" font-size="15" fill="currentColor" font-weight="bold" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -p prog</text><rect x="10" y="38" width="292" height="282" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/><text x="24" y="60" font-size="14" fill="currentColor" font-weight="bold">pid ns GỐC</text><rect x="312" y="38" width="198" height="282" rx="10" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/><text x="326" y="60" font-size="14" fill="currentColor" font-weight="bold">pid ns MỚI</text><rect x="26" y="74" width="258" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="38" y="94" font-size="13" fill="currentColor">shell</text><line x1="80" y1="105" x2="80" y2="137" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-a1-m)"/><text x="92" y="126" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare(CLONE_NEWPID)</text><rect x="26" y="140" width="258" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="38" y="160" font-size="13" fill="currentColor">vẫn process đó, vẫn ns GỐC</text><line x1="80" y1="171" x2="80" y2="203" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-a1-m)"/><text x="92" y="192" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">exec(prog)</text><rect x="26" y="206" width="258" height="30" rx="6" fill="#f43f5e" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="38" y="226" font-size="13" fill="currentColor" font-weight="bold">prog, pid ns GỐC</text><text x="38" y="264" font-size="13" fill="currentColor">prog chạy ở ns cũ, đọc</text><text x="38" y="282" font-size="13" fill="currentColor">bảng cũ, in bảng cũ</text><text x="411" y="112" font-size="13" fill="currentColor" text-anchor="middle">tồn tại, nhưng</text><text x="411" y="134" font-size="13" fill="currentColor" text-anchor="middle" font-weight="bold">KHÔNG có thành viên</text><text x="411" y="178" font-size="13" fill="currentColor" text-anchor="middle">không ai là PID 1</text><text x="411" y="222" font-size="13" fill="currentColor" text-anchor="middle">biến mất cùng</text><text x="411" y="244" font-size="13" fill="currentColor" text-anchor="middle">process gọi</text><text x="14" y="346" font-size="13" fill="currentColor">ns mới chết ngay khi không còn tham chiếu</text><text x="14" y="374" font-size="13" fill="currentColor" font-style="italic" opacity="0.85">-f không phải để "giữ process sống": nó quyết định AI là thành viên</text></svg>
<svg viewBox="0 0 520 392" role="img" aria-labelledby="ct2-a2-t ct2-a2-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto"><title id="ct2-a2-t">unshare -pf: con sinh ra là thành viên đầu tiên của pid ns mới</title><desc id="ct2-a2-d">unshare -pf prog: process unshare gọi unshare(CLONE_NEWPID) và vẫn thuộc pid namespace gốc, rồi fork; process con nằm trong pid namespace mới, exec prog và nhận PID 1. Nhưng ps vẫn đọc /proc của host, xem 3.2.</desc><defs><marker id="ct2-a2-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="14" y="24" font-size="15" fill="currentColor" font-weight="bold" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -pf prog</text><rect x="10" y="38" width="292" height="282" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/><text x="24" y="60" font-size="14" fill="currentColor" font-weight="bold">pid ns GỐC</text><rect x="312" y="38" width="198" height="282" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="0"/><text x="326" y="60" font-size="14" fill="currentColor" font-weight="bold">pid ns MỚI</text><rect x="26" y="74" width="258" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="38" y="94" font-size="13" fill="currentColor">shell</text><line x1="80" y1="105" x2="80" y2="137" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-a2-m)"/><text x="92" y="126" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare(CLONE_NEWPID)</text><rect x="26" y="140" width="258" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="38" y="160" font-size="13" fill="currentColor">unshare, vẫn ns GỐC</text><path d="M180 171 V229 H318" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-a2-m)"/><text x="190" y="196" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">fork()</text><rect x="322" y="206" width="178" height="48" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="334" y="225" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">con: exec(prog)</text><text x="334" y="245" font-size="13" fill="currentColor" font-weight="bold">PID 1</text><text x="411" y="282" font-size="13" fill="currentColor" text-anchor="middle">prog là thành viên</text><text x="411" y="300" font-size="13" fill="currentColor" text-anchor="middle">đầu tiên</text><text x="14" y="346" font-size="13" fill="currentColor">nhưng ps vẫn đọc /proc của host — xem 3.2</text><text x="14" y="374" font-size="13" fill="currentColor" font-style="italic" opacity="0.85">-f không phải để "giữ process sống": nó quyết định AI là thành viên</text></svg>
<ab-note>Process gọi <code>unshare</code> không vào pid ns nó vừa tạo, và <code>exec</code> không đổi process. Nên program chạy ở ns cũ, ns mới không có ai.</ab-note>
<ab-note>Fork xong, con là thành viên đầu tiên của ns mới và nhận số 1. Đó là việc của <code>-f</code>: quyết định process nào chạy program.</ab-note>
</ab-toggle>

Có một chi tiết nhỏ xác nhận toàn bộ chuyện trên từ phía `/proc`:

> **Suy luận, không phải trích dẫn.** `namespaces(7)` liệt kê `/proc/pid/ns/pid_for_children` như một file handle riêng, khác `/proc/pid/ns/pid`; man page không nói "dùng nó để xác nhận -f". Ghép với câu trên của `unshare(2)` thì suy ra được: sau `unshare -p` (không `-f`), `/proc/self/ns/pid` vẫn là inode **cũ** còn `pid_for_children` trỏ tới namespace **mới** — cái namespace mà con sẽ vào. Hai file khác giá trị là bằng chứng trực tiếp cho "caller không vào ns mới". **Kiểm bằng:** `unshare -p sh -c 'readlink /proc/self/ns/pid /proc/self/ns/pid_for_children'`.

### 3.2 Tầng hai: `ps` đọc file, và chưa ai dọn file đó

Thêm `-f`, thử lại. Vẫn thấy cả bảng.

Bởi vì `ps` không hỏi kernel "cho tôi danh sách process". Nó **đọc thư mục `/proc`** — và `/proc` đang mount ở đó là của host, thuộc mount namespace bạn chưa đổi. Bài 1 đã chốt: `/proc` không tự được namespace hoá, phải mount tay.

Sửa tầng hai là mount một `/proc` mới, và `unshare(1)` có cờ làm đúng việc đó: `--mount-proc`. Nó **tự kéo theo một mount namespace mới**, không cần thêm `-m`; lý do rất thực dụng và viết thẳng trong man page — mount `/proc` mới vào mount list đang dùng chung thì mọi program trên máy sẽ thấy `/proc` của namespace con.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ unshare -pf --mount-proc ps -o pid,cmd
  PID CMD
    1 ps -o pid,cmd
```

Một dòng — đúng kỳ vọng ở mục 2, sau hai sửa chữa chứ không phải một.

> **Nguồn — chưa tự đo.** `unshare(1)`, về `--mount-proc`: *"mount the proc filesystem at mountpoint (default is /proc) … It also implies creating a new mount namespace since the /proc mount would otherwise mess up existing programs"* ([unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)).
> `mount_namespaces(7)`: *"Mount namespaces provide isolation of the list of mounts seen by the processes in each namespace instance."* ([mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)) — **danh sách mount**, không phải filesystem.
> **Đo lại:** `unshare -pf ps aux | wc -l` so với `unshare -pf --mount-proc ps aux | wc -l`.

Bản sai ở mục 2 vỡ theo một cách đáng nhớ hơn "bạn gõ thiếu cờ": **namespace cô lập cơ chế, nhưng công cụ của bạn vẫn đọc dữ liệu ở nơi cũ nếu không ai dọn.** Hai tầng độc lập — `-f` quyết định process nào là thành viên, `--mount-proc` quyết định process đó đọc bảng nào. Sửa một tầng thì triệu chứng không đổi, nên rất dễ kết luận "cờ kia không hoạt động". Docker làm hộ bạn đúng hai việc này, và nó im lặng.

### 3.3 Danh sách đóng: tám namespace, không phải sáu

Bài 1 gọi đây là "danh sách đóng": cái gì không nằm trong đó thì không có bản riêng. Đây là chỗ duy nhất trong course liệt kê đủ.

| `/proc/pid/ns/` | flag | Cô lập cái gì | Tên trong OCI spec | Đi sâu ở bài |
|---|---|---|---|---|
| `mnt` | `CLONE_NEWNS` | danh sách mount | `mount` | 3 |
| `uts` | `CLONE_NEWUTS` | hostname, domainname | `uts` | bài 1 |
| `ipc` | `CLONE_NEWIPC` | System V IPC, POSIX mqueue | `ipc` | — |
| `pid` | `CLONE_NEWPID` | cây PID | `pid` | bài này |
| `net` | `CLONE_NEWNET` | interface, route, port, iptables | `network` | 19, 20 |
| `user` | `CLONE_NEWUSER` | UID/GID và capability | `user` | 18 |
| `cgroup` | `CLONE_NEWCGROUP` | **view** của cây cgroup | `cgroup` | mục 3.7 |
| `time` | `CLONE_NEWTIME` | CLOCK_MONOTONIC, CLOCK_BOOTTIME | `time` | mục 3.7 |

Ba cái bẫy nằm trong bảng.

**Bẫy một — `CLONE_NEWNS`.** Mount namespace không có flag `CLONE_NEWMNT`. Nó mang cái tên trần trụi "NS" vì là namespace **đầu tiên** của Linux: hồi đó chỉ có một loại nên chưa cần phân biệt, và sửa tên là phá ABI.

**Bẫy hai — hai bộ tên.** `/proc` dùng `mnt` và `net`; OCI runtime-spec dùng `"mount"` và `"network"`. Trộn hai bộ là lỗi thật, không phải chuyện văn phong: viết `"type": "net"` trong `.linux.namespaces` của `config.json` là runtime không nhận. Bài 16 sẽ đụng đúng chỗ này.

**Bẫy ba — đừng đọc kernel version từ bảng `namespaces(7)`.** Version ghi cạnh từng file là version mà **file handle trong `/proc/pid/ns/` xuất hiện**, không phải năm sinh của namespace: `ipc`, `net`, `uts` có file handle từ 3.0 nhưng tồn tại trước đó rất lâu. Cột version nào cũng phải mang tiêu đề "file handle xuất hiện từ".

> **Nguồn — chưa tự đo.** `namespaces(7)` liệt kê đúng tám flag: `CLONE_NEWCGROUP`, `CLONE_NEWIPC`, `CLONE_NEWNET`, `CLONE_NEWNS`, `CLONE_NEWPID`, `CLONE_NEWTIME`, `CLONE_NEWUSER`, `CLONE_NEWUTS`; dòng của mount là *"Mount \| CLONE_NEWNS \| Mount points"* ([namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)). Cùng trang, version đi kèm file handle chứ không đi kèm namespace: *"This file is a handle for the cgroup namespace of the process. (since Linux 4.6)"*.
> OCI runtime-spec công nhận đủ tám loại và dùng bộ tên riêng — dòng về `time`: *"`time` the container will be able to have its own clocks."* ([OCI runtime-spec, config-linux](https://raw.githubusercontent.com/opencontainers/runtime-spec/main/config-linux.md)).
> **Đo lại:** `ls -l /proc/self/ns/` và `grep CLONE_NEW /usr/include/linux/sched.h`.

### 3.4 `/proc/<pid>/ns/*` trả lời được đúng một câu hỏi

Bài 1 đã giới thiệu định dạng `type:[inode]`; giờ dùng nó để làm việc. Câu hỏi mà không có cách nào khác trả lời: **hai process này có ở cùng một namespace hay không?** Không có syscall "cho tôi ID namespace của pid X". Cách chính thức là `stat(2)` lên hai symlink rồi so **cả hai** trường `st_dev` và `st_ino` — `st_ino` chỉ duy nhất trong một filesystem.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ stat -L -c '%d %i' /proc/1/ns/pid /proc/self/ns/pid
4 4026531836
4 4026531836
$ unshare -pf --mount-proc sh -c 'stat -L -c "%d %i" /proc/self/ns/pid'
4 4026532571
```

Hai dòng đầu khớp cả `%d` và `%i`: cùng pid namespace. Dòng thứ ba lệch `%i`: namespace khác. `readlink` cho đúng một nửa của cặp đó — đủ để mắt người so nhanh, không đủ để script kết luận.

Một tính chất nữa, bài này chỉ trồng hạt: namespace **persist được**. Bình thường nó sống đúng bằng thời gian còn process thuộc nó. Nhưng `unshare(1)` cho phép `-n=file`, `-U=file`, `-p=file`, `-m=file`: tạo một **bind mount** tại `file` trỏ vào symlink namespace, và bind mount đó là một tham chiếu — namespace sống tiếp dù không còn process nào bên trong. Đó là cơ chế đằng sau `ip netns`: file trong `/run/netns/` là network namespace được giữ sống bằng bind mount. Bài 19 dùng nó để dựng mạng.

> **Nguồn — chưa tự đo.** `namespaces(7)`: *"an application can check this using the stat.st_dev and stat.st_ino fields returned by stat(2)"* ([namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)); định dạng nội dung symlink là *"a string containing the namespace type and inode number as in the following example: `uts:[4026531838]`"*.
> `unshare(1)` về dạng `=file`: *"If file is specified, then the namespace is made persistent by creating a bind mount at file."* ([unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)).
> **Đo lại:** `stat -L -c '%d %i' /proc/1/ns/net /proc/self/ns/net`, rồi `unshare -n=/run/netns/x true` và `mount | grep netns`.

Muốn xem toàn cảnh thay vì so từng cặp thì có `lsns` — nó đọc đúng những file này, cột `NS` là inode, mỗi dòng là một namespace đang có thành viên:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ lsns -t pid
        NS TYPE NPROCS   PID USER COMMAND
4026531836 pid     214     1 root /sbin/init
4026532571 pid       2  9014 dan  node /app/server.js
```

---

## ⏸ Dừng lại — đoán trước #2

**Bạn là user thường, không sudo, không capability. Lệnh nào chạy được?**

```
(a) Không lệnh nào — tạo namespace luôn cần CAP_SYS_ADMIN
(b) unshare -U true được, nhưng unshare -Un true thì không (thêm net ns cần quyền)
(c) unshare -Un true được, còn unshare -n true thì không
(d) Cả bốn kiểu đều được, namespace chưa bao giờ cần quyền
```

---

### 3.5 Sáu bậc dựng bằng tay, mỗi bậc bịt một lỗ

Đáp án ⏸#2 là **(c)** — bản sai phụ của bài này là "tạo namespace cần root": đúng cho bảy loại, sai cho loại thứ tám, và cái sai đó là nền móng của rootless container.

`unshare -n true` (net ns, không kèm user ns) cần CAP_SYS_ADMIN; `unshare -U true` không cần gì. Điểm then chốt: tạo user namespace **cùng với** một loại khác **trong một call duy nhất** cũng không cần CAP_SYS_ADMIN. Tách thành hai lệnh là mất tính chất này — man page phát biểu kết quả, không phát biểu vì sao.

Giờ dựng, mỗi bậc một lý do: bậc trước hở chỗ nào thì bậc sau bịt.

| Bậc | Lệnh | Bịt lỗ gì | Còn hở |
|---|---|---|---|
| 1 | `unshare -U true` | chứng minh không cần quyền gì | chưa cô lập gì |
| 2 | `unshare -Un true` | thêm ns khác, vẫn không cần CAP_SYS_ADMIN | UID vẫn là UID thường, `ps` vẫn thấy host |
| 3 | `unshare -Unp readlink /proc/self/ns/pid` | có pid ns | inode in ra vẫn là của pid ns **cũ** (3.1) |
| 4 | `unshare -Unpf ...` | program là thành viên, thành PID 1 | `ps` đọc `/proc` của host (3.2) |
| 5 | `unshare -Unpf --mount-proc ...` | `ps` đọc `/proc` của chính ns, kéo theo mount ns mới | trong ns vẫn không phải root |
| 6 | `unshare -Unpfr --mount-proc ...` | `-r` map euid/egid hiện tại thành 0 | root đó là root **ở đâu**? |

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ id -u
1000
$ unshare -Unpfr --mount-proc sh
# id -u
0
# ps -o pid,cmd | tail -1
    1 sh
# readlink /proc/self/ns/user /proc/self/ns/pid /proc/self/ns/net
user:[4026532570]
pid:[4026532571]
net:[4026532572]
```

Bạn vừa dựng một thứ mà `ps` báo PID 1, `id` báo root, có network namespace riêng — không một dòng Docker nào.

Câu hỏi ở cuối bảng — "root đó là root ở đâu?" — là cửa vào bài 18. Trả lời ngắn: `0` mà `id` in ra là UID **trong user namespace này**, ánh xạ sang UID ngoài ns nằm ở `/proc/self/uid_map`, và capability bạn có chỉ có hiệu lực trong ns đó. Bài 18 mổ ba cột `uid_map`, `/etc/subuid`, và vì sao file trên bind mount hiện owner lạ.

> **Nguồn — chưa tự đo.** `namespaces(7)`: *"User namespaces are the exception: since Linux 3.8, no privilege is required to create one."* ([namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)).
> `unshare(2)`: *"creating both a user namespace and any other type of namespace in the same unshare() call does not require the CAP_SYS_ADMIN capability in the original namespace"* ([unshare(2)](https://man7.org/linux/man-pages/man2/unshare.2.html)).
> `unshare(1)` về `-r/--map-root-user`: nó map *"the current effective user and group IDs...to the superuser UID and GID in the newly created user namespace"* ([unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html)).
> **Đo lại:** `unshare -U true`, `unshare -Un true`, `unshare -n true` — so exit code ba lệnh, rồi `unshare -r id`.

<step-flow>
<svg viewBox="0 0 760 676" role="img" aria-labelledby="ct2-b-t ct2-b-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto"><title id="ct2-b-t">Thang sáu bậc từ unshare tới container đủ bộ</title><desc id="ct2-b-d">Sáu bậc dựng container bằng unshare: -U, -Un, -Unp, thêm -f, thêm --mount-proc, thêm -r. Mỗi bậc ghi lỗ nó bịt và lỗ còn hở; lỗ còn hở của bậc trước là thứ bậc sau bịt. Bên dưới là bốn khối còn thiếu: rootfs riêng bằng pivot_root ở bài 3, giới hạn tài nguyên bằng cgroup ở bài 4 tới 7, mạng có đường ra bằng veth, bridge, DNAT ở bài 19 và 20, map UID thật bằng uid_map và subuid ở bài 18. Sáu bậc cộng bốn khối là một file config.json của runc, bài 16.</desc><defs><marker id="ct2-b-m" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs><text x="14" y="26" font-size="14" fill="currentColor" font-weight="bold">Lệnh — bịt lỗ gì</text><text x="510" y="26" font-size="14" fill="currentColor" font-weight="bold">Còn hở</text><g data-step="1"><rect x="14" y="40" width="476" height="52" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="61" font-size="14" fill="currentColor" font-weight="bold">1</text><text x="46" y="61" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -U true</text><text x="46" y="82" font-size="13" fill="currentColor">bịt: không cần quyền gì</text><rect x="510" y="40" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="71" font-size="13" fill="currentColor">chưa cô lập gì</text></g><g data-step="2"><rect x="14" y="104" width="476" height="52" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="125" font-size="14" fill="currentColor" font-weight="bold">2</text><text x="46" y="125" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -Un true</text><text x="46" y="146" font-size="13" fill="currentColor">bịt: ns khác trong cùng một call, vẫn không cần CAP_SYS_ADMIN</text><rect x="510" y="104" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="125" font-size="13" fill="currentColor">UID vẫn là UID thường,</text><text x="522" y="145" font-size="13" fill="currentColor">ps vẫn thấy host</text><path d="M560 93 C 540 106, 500 102, 480 105" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/></g><g data-step="3"><rect x="14" y="168" width="476" height="52" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="189" font-size="14" fill="currentColor" font-weight="bold">3</text><text x="46" y="189" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -Unp readlink /proc/self/ns/pid</text><text x="46" y="210" font-size="13" fill="currentColor">bịt: có pid ns, nhưng ns đó rỗng</text><rect x="510" y="168" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="189" font-size="13" fill="currentColor">inode in ra vẫn là của</text><text x="522" y="209" font-size="13" fill="currentColor">pid ns cũ (3.1)</text><path d="M560 157 C 540 170, 500 166, 480 169" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/></g><g data-step="4"><rect x="14" y="232" width="476" height="52" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="253" font-size="14" fill="currentColor" font-weight="bold">4</text><text x="46" y="253" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -Unpf ...</text><text x="46" y="274" font-size="13" fill="currentColor">bịt: fork, con là thành viên đầu tiên, nhận PID 1</text><rect x="510" y="232" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="263" font-size="13" fill="currentColor">ps đọc /proc của host (3.2)</text><path d="M560 221 C 540 234, 500 230, 480 233" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/></g><g data-step="5"><rect x="14" y="296" width="476" height="52" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="317" font-size="14" fill="currentColor" font-weight="bold">5</text><text x="46" y="317" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">unshare -Unpf --mount-proc ...</text><text x="46" y="338" font-size="13" fill="currentColor">bịt: ps đọc /proc của chính ns; kéo theo mount ns mới</text><rect x="510" y="296" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="327" font-size="13" fill="currentColor">trong ns vẫn không phải root</text><path d="M560 285 C 540 298, 500 294, 480 297" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/></g><g data-step="6"><rect x="14" y="360" width="476" height="52" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="381" font-size="14" fill="currentColor" font-weight="bold">6</text><text x="46" y="381" font-size="14" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="bold">unshare -Unpfr --mount-proc ...</text><text x="46" y="402" font-size="13" fill="currentColor">bịt: -r map euid/egid hiện tại thành 0 trong ns này</text><rect x="510" y="360" width="236" height="52" rx="6" fill="#f43f5e" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="522" y="381" font-size="13" fill="currentColor">root đó là root ở đâu?</text><text x="522" y="401" font-size="13" fill="currentColor">xem bài 18</text><path d="M560 349 C 540 362, 500 358, 480 361" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/><text x="46" y="436" font-size="13" fill="currentColor" font-style="italic">tới đây: ps báo PID 1, id báo root, chưa dùng Docker</text><path d="M628 413 V465" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5" marker-end="url(#ct2-b-m)"/></g><text x="14" y="480" font-size="14" fill="currentColor" font-weight="bold">Còn thiếu</text><rect x="14" y="488" width="174" height="70" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="26" y="509" font-size="13" fill="currentColor" font-weight="bold">rootfs riêng</text><text x="26" y="528" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">pivot_root</text><text x="26" y="548" font-size="13" fill="currentColor" opacity="0.8">bài 3</text><rect x="200" y="488" width="174" height="70" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="212" y="509" font-size="13" fill="currentColor" font-weight="bold">giới hạn tài nguyên</text><text x="212" y="528" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">cgroup</text><text x="212" y="548" font-size="13" fill="currentColor" opacity="0.8">bài 4 tới 7</text><rect x="386" y="488" width="174" height="70" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="398" y="509" font-size="13" fill="currentColor" font-weight="bold">mạng có đường ra</text><text x="398" y="528" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">veth, bridge, DNAT</text><text x="398" y="548" font-size="13" fill="currentColor" opacity="0.8">bài 19, 20</text><rect x="572" y="488" width="174" height="70" rx="6" fill="#14b8a6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="584" y="509" font-size="13" fill="currentColor" font-weight="bold">map UID thật</text><text x="584" y="528" font-size="13" fill="currentColor" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">uid_map, subuid</text><text x="584" y="548" font-size="13" fill="currentColor" opacity="0.8">bài 18</text><rect x="14" y="574" width="732" height="84" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/><text x="28" y="598" font-size="14" fill="currentColor" font-weight="bold">Sáu bậc trên + bốn khối dưới = một file config.json của runc (bài 16)</text><text x="28" y="622" font-size="13" fill="currentColor">.linux.namespaces liệt kê đúng các bậc trên, .linux.resources là khối cgroup,</text><text x="28" y="644" font-size="13" fill="currentColor">.root là rootfs, .linux.uidMappings là khối UID. Không có thành phần thứ mười một.</text></svg>
<step-note data-step="1">Bậc mở đầu chỉ để chứng minh một điều: user namespace là loại duy nhất tạo được mà không cần quyền gì. Chưa cô lập gì cả.</step-note>
<step-note data-step="2">Gộp <code>-U</code> với loại khác <b>trong cùng một call</b> thì loại kia cũng không cần CAP_SYS_ADMIN. Tách hai lệnh là mất tính chất này.</step-note>
<step-note data-step="3">Có pid ns nhưng process gọi không bước vào, nên <code>readlink</code> vẫn in inode của pid ns cũ.</step-note>
<step-note data-step="4">Fork để program chạy ở process con, con đó là thành viên đầu tiên của ns mới. Còn lại <code>ps</code>: nó đọc file trong <code>/proc</code>, và <code>/proc</code> vẫn là của host.</step-note>
<step-note data-step="5">Mount lại <code>/proc</code> cho đúng pid ns mới; muốn mount mà không đụng host thì phải có mount ns riêng, nên cờ này kéo theo mount ns.</step-note>
<step-note data-step="6"><code>-r</code> đổi euid/egid hiện tại thành 0, nhưng chỉ trong user ns này. Đó là lý do mũi tên trỏ sang khối UID của bài 18.</step-note>
</step-flow>

Các khối "Còn thiếu" là bản đồ phần còn lại của course. Cái bạn vừa dựng **chưa phải container**: nó thấy đúng rootfs của host, ăn được toàn bộ RAM máy, và có network namespace rỗng — namespace không có interface nào ngoài `lo` thì không ra Internet. Chúng cũng không phải cơ chế bí ẩn của Docker: chúng là bốn nhóm cờ và bốn nhóm file, bài 16 cho thấy cả bốn nằm gọn trong một file JSON.

---

## ⏸ Dừng lại — đoán trước #3

**Một pid namespace có PID 1 (`sh`) và PID 7 (`sleep 100`). Bạn `kill -9 1`, rồi từ ngoài một process thử `fork(2)` vào namespace đó. Kết quả?**

```
(a) PID 1 chết, sleep vẫn chạy và được reparent; fork vào ns thành công
(b) PID 1 chết, sleep bị kernel SIGKILL theo; fork trả ESRCH
(c) PID 1 chết, sleep bị kernel SIGKILL theo; fork trả ENOMEM
(d) kill -9 1 bị từ chối vì PID 1 miễn nhiễm signal
```

---

### 3.6 PID 1 trong namespace khác PID 1 thường

Đáp án là **(c)**. Ba tính chất, mỗi cái một hệ quả đã gặp ở production.

**Một — signal bị lọc.** PID 1 của một pid namespace chỉ nhận signal mà nó **đã lập handler**, khi signal đến từ thành viên cùng namespace; không có handler thì signal bị bỏ, kể cả SIGTERM. Đây không phải "miễn nhiễm" — bài 1 đã nói SIGKILL/SIGSTOP từ namespace tổ tiên vẫn xuyên qua. Cơ chế: kernel đối xử đặc biệt với init của một namespace để process con trong đó không giết được init bằng signal mặc định. Hệ quả: entrypoint không trap SIGTERM thì `kill -TERM 1` từ trong container là lệnh vô tác dụng.

**Hai — orphan reparent về init của namespace.** Cha chết trước con thì con reparent về **init của pid namespace**, không phải PID 1 của host — trừ khi một tổ tiên gần hơn đã gọi `PR_SET_CHILD_SUBREAPER`. Đó là gốc của chuyện zombie trong container: process của bạn ở PID 1 là init của ns nên nhận hết orphan, và nếu nó không `wait()` thì mỗi orphan chết để lại một zombie không ai reap. Trên host systemd làm việc này; trong ns người làm là **code của bạn**.

**Ba — PID 1 chết là namespace chết.** Không phải "container stop": kernel gửi SIGKILL cho **toàn bộ** process trong namespace, và sau đó namespace không tái dùng được — `fork(2)` vào nó fail với **`ENOMEM`**. Đây là errno phản trực giác, lần đầu ai cũng đoán `ESRCH` hay `EPERM`. Đáng nhớ chính vì thế: thấy `ENOMEM` ở chỗ không liên quan gì tới RAM thì đây là một nguyên nhân.

> **Nguồn — chưa tự đo.** `pid_namespaces(7)`: *"Only signals for which the 'init' process has established a signal handler can be sent to the 'init' process by other members of the PID namespace."* ; orphan *"are reparented to the init process in the parent's PID namespace (unless a closer ancestor used PR_SET_CHILD_SUBREAPER)"* ; *"If the 'init' process of a PID namespace terminates, the kernel terminates all of the processes in the namespace via a SIGKILL signal."* ; và *"a subsequent fork(2) into this PID namespace fail with the error ENOMEM; it is not possible to create a new process in a PID namespace whose 'init' process has terminated"* ([pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)).
> **Đo lại:** tính chất một bằng `unshare -pf --mount-proc sh -c 'kill -TERM 1; echo alive'`; tính chất ba bằng `unshare -pf --mount-proc sh -c 'sleep 100 & kill -9 1'`.

### 3.7 Hai namespace mà các bài đếm "sáu" bỏ quên

**cgroup namespace.** Nó đổi **view**, và chỉ view: `/proc/pid/cgroup` và `/proc/pid/mountinfo` của process trong ns đó hiển thị path cgroup **tương đối với cgroup root của ns** thay vì path đầy đủ từ gốc cây. Ba lý do nó tồn tại: che path ngoài container, cho phép migrate sang cây cgroup khác mà path bên trong không đổi, và chặn truy cập thư mục cgroup tổ tiên.

Chỗ lẫn phổ biến nhất, nói thẳng: **cgroup namespace không giới hạn tài nguyên**, không liên quan gì tới `cpu.max` hay `memory.max`. Nó là namespace nên nằm trên trục "tôi thấy gì" của bài 1; cái giới hạn nằm trên trục kia, tên là **cgroup controller** — thứ khác hẳn, dùng chung chữ "cgroup", và là chủ đề chương 2.

**time namespace.** Nó virtualize **hai** clock: `CLOCK_MONOTONIC` (cùng biến thể COARSE/RAW) và `CLOCK_BOOTTIME` (cùng ALARM). Offset đặt qua `/proc/pid/timens_offsets`, mỗi dòng ba field `<clock-id> <offset-secs> <offset-nanosecs>`, clock-id là `monotonic` hoặc `boottime`; cần kernel có `CONFIG_TIME_NS`.

Chỗ kỳ vọng hay sai: **`CLOCK_REALTIME` cố ý KHÔNG được virtualize** — man page nói rõ là tránh, vì phức tạp và vì overhead. Hệ quả: `date` trong time ns trả đúng giờ host, nên bạn **không** đặt được "thời gian riêng" để test một cert hết hạn. Cái đặt được là "máy này vừa boot cách đây bao lâu" — hữu ích cho checkpoint/restore giữ uptime liên tục, vô dụng cho việc giả ngày tháng.

> **Nguồn — chưa tự đo.** `cgroup_namespaces(7)` nói cgroup ns virtualize *"the view of a process's cgroups as seen via /proc/pid/cgroup and /proc/pid/mountinfo"*, và trong ba lý do có *"allows containers to be isolated from knowledge of the pathnames of ancestor cgroups"* cùng *"container processes can't gain access to ancestor cgroup directories"* ([cgroup_namespaces(7)](https://man7.org/linux/man-pages/man7/cgroup_namespaces.7.html)).
> `time_namespaces(7)`: *"Time namespaces virtualize the values of two system clocks: CLOCK_MONOTONIC … and CLOCK_BOOTTIME"* ; *"Time namespaces do not virtualize the CLOCK_REALTIME clock. Virtualization of this clock was avoided for reasons of complexity and overhead."* ; file offset gồm *"lines consisting of three space-delimited fields: <clock-id> <offset-secs> <offset-nanosecs>"* ; và *"Use of time namespaces requires a kernel that is configured with the CONFIG_TIME_NS option."* ([time_namespaces(7)](https://man7.org/linux/man-pages/man7/time_namespaces.7.html)).
> **Đo lại:** `cat /proc/self/cgroup` trong và ngoài container; `unshare -T --boottime 3000 uptime` rồi `unshare -T --boottime 3000 date`.

---

## 4. Thấy triệu chứng này thì thiếu gì

Bảng tra nhanh khi dựng tay; cột giữa là chỗ hay đoán sai.

| Bạn thấy | Nguyên nhân | Sửa |
|---|---|---|
| `unshare -p ps` thấy hết host, exit 0 | hai lỗi cùng lúc: chạy ở pid ns cũ, và đọc `/proc` host | `-f` **và** `--mount-proc` |
| thêm `-f` rồi vẫn thấy hết | pid ns đúng, nguồn dữ liệu chưa đổi | `--mount-proc` |
| `unshare -n` lỗi quyền, `unshare -Un` thì không | net ns đơn lẻ cần CAP_SYS_ADMIN | ghép `-U` vào cùng một lệnh |
| `kill -TERM 1` trong ns vô tác dụng | PID 1 chỉ nhận signal đã có handler | trap trong app, hoặc SIGKILL từ ns tổ tiên |
| zombie tích lại | app ở PID 1 là init của ns, không `wait()` | reap trong app, hoặc init nhỏ làm subreaper |
| `fork` vào ns cũ trả `ENOMEM` | PID 1 của ns đó đã chết | dựng ns mới |
| `date` trong time ns không đổi | `CLOCK_REALTIME` cố ý không virtualize | không có cách nào bằng time ns |
| tưởng cgroup ns sẽ siết RAM | cgroup ns chỉ đổi view path | cgroup controller — chương 2 |
| `"type": "net"` bị runtime từ chối | OCI dùng `network`/`mount` | đổi sang bộ tên của spec |

---

## 5. Tính tay

Giấy và bút; mọi dữ kiện cần đều ở mục 3.

**Bài 1 — đọc ba cột `stat` và kết luận.** Bạn chạy `stat -L -c '%d %i'` (`st_dev` rồi `st_ino`) trên ba process: A là shell trên host, B sinh bởi `unshare -p sleep 100`, C sinh bởi `unshare -pf sleep 100`.

| file `ns` | A | B | C |
|---|---|---|---|
| `pid` | `4 4026531836` | `4 4026531836` | `4 4026532571` |
| `pid_for_children` | `4 4026531836` | `4 4026532580` | `4 4026532571` |
| `mnt` | `4 4026531840` | `4 4026531840` | `4 4026531840` |

- Ba process chia nhau bao nhiêu pid namespace, và process nào ở cái nào?
- `pid_for_children` của B khác `pid` của B. Giải thích chênh lệch bằng đúng một câu trích từ `unshare(2)`.
- Namespace inode `4026532580` có thành viên nào không? Nó tồn tại bao lâu?
- C có `mnt` giống A. Nếu C chạy `ps aux` thì thấy mấy process — và vì sao câu trả lời **không** phụ thuộc vào dòng `pid` của C?
- Nếu chỉ có `readlink` chứ không có `stat`, bảng trên mất cột nào, và khi nào việc mất cột đó dẫn tới kết luận sai?

**Bài 2 — cái chết của một namespace.** Trong một pid namespace mới: PID 1 là `sh` (không trap gì), PID 7 là `sleep 300`, PID 8 là `tail -f` được `sleep` fork ra rồi `sleep` thoát ngay.

- PID 8 mất cha — nó reparent về đâu? Nếu `sh` là init có gọi `PR_SET_CHILD_SUBREAPER` thì đổi gì?
- `sh` không `wait()`. Sau khi PID 8 chết, `ps` trong ns thấy gì ở dòng của nó?
- Từ trong ns, `kill -TERM 1`: ai chết, vì sao?
- Từ trong ns, `kill -9 1`: liệt kê **mọi** process chết, ghi rõ ai gửi signal cho từng cái.
- Ngay sau đó bạn `nsenter` từ host vào pid namespace đó và chạy một lệnh. Errno nào, và vì sao errno đó chứ không phải một errno nói về "không tìm thấy"?

**Bài 3 — số học của time namespace.** Host có `CLOCK_MONOTONIC` đọc ra 7 200 s và `CLOCK_REALTIME` chỉ 14:00 hôm nay. Bạn tạo time ns với `timens_offsets` có dòng `monotonic 3000 0`.

- Trong ns, `CLOCK_MONOTONIC` đọc ra bao nhiêu giây? Đổi sang giờ-phút.
- Trong ns, `date` in ra mấy giờ?
- App tính TTL cache bằng hiệu hai lần đọc `CLOCK_MONOTONIC`. TTL đó có bị offset làm lệch không? Còn nếu tính bằng `time()` (realtime) thì sao?
- Đồng nghiệp muốn test một TLS cert đã hết hạn bằng cách "đặt time namespace lùi lại một năm". Trả lời bằng đúng một câu trích từ `time_namespaces(7)`.
- Nếu chỉ ghi hai field trong `timens_offsets` thì thiếu cái gì, và vì sao field thứ ba tồn tại?

---

## 6. Chuyển giao

Không có đáp án trong bài.

Bạn viết một sandbox chạy code do người dùng submit. Ràng buộc: service chạy dưới user thường trên VM chia sẻ, **không** `sudo`, không được cài Docker.

1. Với ràng buộc đó bạn dựng được tới bậc nào trong bảng mục 3.5? Bậc nào bị chặn, và chặn bởi cái gì?
2. Code người dùng fork một vòng lặp vô hạn. Sandbox ở bậc 6 có ngăn được nó làm chết VM không? Nếu không thì cái thiếu thuộc trục nào trong hai trục của bài 1?
3. Bạn muốn code người dùng không thấy filesystem của host. Bậc 5 đã cho một mount namespace — thế đã đủ chưa, và nếu chưa thì thiếu bước nào? Nêu tên bước, đừng nêu cách làm.
4. Sandbox chạy xong, bạn muốn giữ network namespace để lần sau tái dùng interface đã cấu hình. Cơ chế nào trong bài cho phép, và cái gì giữ namespace sống khi không còn process nào trong đó?
5. Người dùng submit một program trap SIGTERM rồi ngủ mãi. Bạn ở host và muốn dừng sandbox: gửi signal gì, tới PID nào trong namespace nào, và vì sao lựa chọn đó chắc chắn hơn SIGTERM?
6. Sandbox thỉnh thoảng báo `ENOMEM` khi khởi động một run mới dù VM còn nhiều RAM. Từ mục 3.6, nêu một giả thuyết giải thích được cả hai dữ kiện cùng lúc.
7. **Câu khó nhất:** bạn chỉ có `unshare` và tuyệt đối không có CAP_SYS_ADMIN trên host. Bạn cần `pivot_root` vào một rootfs riêng — mà `pivot_root(2)` yêu cầu CAP_SYS_ADMIN. Bài này đã cho đủ hai dữ kiện để giải thích vì sao yêu cầu đó **vẫn thoả** được. Ghép hai dữ kiện đó lại, và nói rõ capability bạn có là capability trong namespace nào. Trả lời được câu này thì bài 18 không có gì làm bạn bất ngờ.

---

## 7. Tóm tắt

- Có **tám** loại namespace, không phải sáu. Flag của mount là `CLONE_NEWNS` chứ không phải `CLONE_NEWMNT` — dòng trong `namespaces(7)`: *"Mount \| CLONE_NEWNS \| Mount points"*.
- Kernel và `/proc` dùng `mnt`/`net`; **OCI runtime-spec dùng `mount`/`network`**. Trộn hai bộ tên là lỗi thật khi viết `config.json` (bài 16).
- Version ghi cạnh từng file trong bảng `namespaces(7)` là version **file handle xuất hiện**, không phải tuổi namespace. Đừng suy ra "namespace X có từ kernel Y".
- `unshare -p` không đủ vì **hai** lý do độc lập: caller không vào ns mới (*"The calling process is _not_ moved into the new namespace"*) → cần `-f`; `ps` đọc `/proc` của host → cần `--mount-proc`, cờ này **tự kéo theo mount ns mới**.
- Tạo user namespace **không cần privilege** từ Linux 3.8, và tạo user ns cùng loại khác **trong một call duy nhất** không cần CAP_SYS_ADMIN — nền móng của rootless (bài 18).
- "Hai process có cùng namespace không" chỉ trả lời được qua `/proc/pid/ns/*`, và phải so **`st_dev` và `st_ino`** — `readlink` cho một nửa.
- Namespace **persist được** bằng bind mount (`unshare -n=file`): cơ chế đằng sau `ip netns`, và là lý do netns sống dù không còn process nào trong nó.
- PID 1 của một pid ns: chỉ nhận signal **đã có handler** từ thành viên cùng ns; nhận mọi orphan trừ khi có `PR_SET_CHILD_SUBREAPER` gần hơn; và khi nó chết, kernel *"terminates all of the processes in the namespace via a SIGKILL signal"*, sau đó `fork(2)` vào ns đó trả **`ENOMEM`**.
- **cgroup namespace không giới hạn tài nguyên** — nó chỉ đổi view qua `/proc/pid/cgroup` và `/proc/pid/mountinfo`. Cái siết tài nguyên là cgroup controller, chương 2.
- time namespace virtualize `CLOCK_MONOTONIC` và `CLOCK_BOOTTIME`, **cố ý không** virtualize `CLOCK_REALTIME`. "Container có thời gian riêng" là kỳ vọng sai; `date` không đổi được.
- Cái dựng tay ở mục 3.5 **chưa phải container**: thiếu rootfs riêng (bài 3), giới hạn tài nguyên (bài 4–7), mạng có đường ra (bài 19–20), map UID thật (bài 18).

→ **Bài 3 — mount namespace, `pivot_root` và rootfs**: lấp cái thiếu đầu tiên — vì sao container thấy một cây thư mục khác mà không copy một byte nào, `pivot_root` khác `chroot` ở bản chất chứ không ở chất lượng, và vì sao bind-mount đôi khi rò sang host.
