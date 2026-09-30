# Bài 3 — mount namespace, `pivot_root` và rootfs

## 1. Mục tiêu

Sau bài này bạn có thể:

- Phát biểu chính xác **mount namespace cô lập cái gì**, và vì sao "nó cho container một filesystem riêng" là câu sai — bằng một dòng man page.
- Giải thích vì sao ngay sau khi tạo mount namespace mới bạn **vẫn thấy y nguyên mọi thứ**, và vì sao đó không phải dấu hiệu namespace không hoạt động.
- Chỉ ra ba đường thoát khỏi `chroot` và chứng minh **không đường nào là bug** — chúng là hệ quả tất yếu của phạm vi thứ `chroot` thay đổi.
- Nói được `pivot_root` khác `chroot` ở **tầng nào**, không phải ở "an toàn hơn bao nhiêu".
- Đọc một script dựng rootfs và chỉ ra điều kiện nào của `pivot_root(2)` đang bị vi phạm trước khi chạy nó.
- Dùng `findmnt -o TARGET,PROPAGATION` để dự đoán một bind-mount có **rò sang host** hay không, và vì sao đôi khi host không tháo được mount do container tạo.

---

## 2. Triệu chứng

Một service Python chạy trên máy Debian dùng chung với năm service khác, mỗi cái cần một bộ thư viện hệ thống khác nhau. Bạn không muốn kéo Docker vào một máy đã có systemd quản mọi thứ, nên bạn làm cái mà Unix đã có từ trước Docker: dựng cây thư mục đầy đủ ở `/srv/pyapp/rootfs`, rồi `sudo chroot /srv/pyapp/rootfs /usr/bin/python3 /app/server.py`.

`curl localhost:8000/health` trả `ok`. Nhìn như container: process thấy một `/` khác, thư viện tách hẳn, không chạm `/usr/lib` của host. Bạn ship. Rồi hai chuyện xảy ra, cách nhau ba tuần.

**Chuyện thứ nhất.** Service cần đọc một thư mục dữ liệu ở `/mnt/data` của host. Bạn bind-mount nó vào trong cây:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ sudo mount --bind /mnt/data /srv/pyapp/rootfs/data
$ sudo systemctl stop pyapp
$ findmnt /srv/pyapp/rootfs/data
TARGET                      SOURCE              FSTYPE OPTIONS
/srv/pyapp/rootfs/data      /dev/sdb1[/data]    ext4   rw,relatime
```

Service đã tắt. Mount vẫn còn. Ba tuần sau máy đầy mount rác kiểu này, và một lần `umount /dev/sdb1` để thay đĩa thì báo `target is busy` mà không ai tìm ra ai đang giữ.

**Chuyện thứ hai.** Một bạn security review gửi bốn dòng, chạy **từ trong** cái chroot đó:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ cd /                     # cwd nằm trong cây mới
$ mkdir sub && chroot sub  # chroot lần hai, nhưng cwd không đổi theo
$ cd ../../../../..        # '.' đang ở NGOÀI cây mới
$ cat etc/shadow           # /etc/shadow của host
```

Bạn kiểm tra: nó ra thật.

Hai triệu chứng trông không liên quan — một cái là mount rác, một cái là escape — nhưng cùng một nguyên nhân: `chroot` không can thiệp vào danh sách mount, và cũng không can thiệp vào cwd. Nó đổi đúng một thứ, và cả hai triệu chứng nằm ở những thứ nó *không* đổi.

Bài 2 đã dựng được một process cô lập về PID, hostname, network — nhưng nó vẫn nhìn `/` của host. Bài này bịt đúng lỗ đó, và cách bịt không phải "dùng `chroot` cho chuẩn hơn".

---

## ⏸ Dừng lại — đoán trước #1

Bạn chạy `unshare -m` để vào một mount namespace mới, rồi `wc -l /proc/self/mountinfo` ngay lập tức. Máy host đang có 34 mount. Con số in ra là:

- **(A)** `0` — namespace mới, chưa mount gì cả.
- **(B)** `1` — chỉ còn root mount.
- **(C)** `34` — y hệt host.
- **(D)** Lỗi, vì namespace mới chưa có `/proc`.

Và câu thứ hai, quan trọng hơn: nếu đáp án là (C) thì **mount namespace vừa làm gì cho bạn?**

---

## 3. Lý thuyết

### 3.1 Nó cô lập danh sách mount, không cô lập filesystem

Đáp án là **(C)**. Và đây là chỗ cần đọc man page cho đúng từng chữ, vì cả bài dựng trên nó:

> **Nguồn — chưa tự đo.** `mount_namespaces(7)` phát biểu phạm vi cô lập:
> *"Mount namespaces provide isolation of the list of mounts seen by the processes in each namespace instance."*
> Và khi tạo namespace mới: *"the mount list of the new namespace is a copy of the mount list in the caller's previous mount namespace"*
> ([mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)).
> **Đo lại:** `wc -l /proc/self/mountinfo` rồi `unshare -m wc -l /proc/self/mountinfo` — so hai con số.

Đọc kỹ danh từ: **list of mounts** — không phải "filesystem", không phải "dữ liệu". Cái được nhân bản là **bảng ghi filesystem nào đang gắn vào điểm nào**.

Hệ quả đi ngược trực giác theo hai chiều. Cùng một partition `/dev/sdb1` có thể được thấy ở `/mnt/data` trong namespace này và ở `/data` trong namespace kia: **một filesystem, hai tên đường dẫn, cùng một byte trên đĩa** — ghi bên này thì bên kia đọc ra ngay, không có bản sao nào. Ngược lại, một mount tồn tại trong namespace này có thể hoàn toàn không tồn tại trong namespace kia — không phải "bị ẩn vì permission", mà là dòng đó *không có* trong `mountinfo` của namespace kia.

Và vì namespace mới là **bản copy tại thời điểm tạo**, nó **tự mình không đổi gì bạn nhìn thấy được**. Nó chỉ làm một việc: từ giây phút đó, mọi `mount`/`umount` bạn gọi ghi vào bảng của riêng bạn, không ghi vào bảng của host. Đây là nguồn của rất nhiều nhầm lẫn — người ta thấy `ls /` y nguyên rồi kết luận "mount namespace chẳng làm gì". Nó đang làm đúng việc của nó; chỉ là việc đó **tương lai**, không phải hiện tại.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ wc -l /proc/self/mountinfo
34 /proc/self/mountinfo
$ unshare -m wc -l /proc/self/mountinfo
34 /proc/self/mountinfo          # bản copy — giống hệt
$ unshare -m sh -c 'mount -t tmpfs t /mnt/x; wc -l /proc/self/mountinfo'
35 /proc/self/mountinfo          # +1, CHỈ trong ns đó; host vẫn 34
```

Bài 2 đã cho biết `--mount-proc` tự kéo theo một mount namespace mới. Giờ bạn đọc được lý do: mount một `/proc` mới mà không có bảng riêng thì bạn vừa thay `/proc` của **cả máy**. Từ đây bài này chỉ nói về cái bảng đó và ai được đổi gốc của nó.

### 3.2 Bản sai: "`chroot` là container phiên bản nghèo"

Mô hình gần như ai cũng mang sẵn, và nó **giải thích được rất nhiều**. Cho nó chạy trước: container = `chroot` + vài thứ thêm — `chroot` cho `/` riêng, namespace cho PID/hostname/mạng riêng, cgroup cho giới hạn RAM. Và runtime dùng `pivot_root` vì đó là "phiên bản vá lỗi" của `chroot`, an toàn hơn, chặn được escape.

Nó dự đoán đúng kha khá: cây thư mục trong `chroot` thật sự khác host; bạn thật sự chạy được một distro khác bên trong; escape khỏi `chroot` thật sự dễ hơn; và runtime thật sự gọi `pivot_root`. Bốn dự đoán đúng là đủ để một mô hình sống sót nhiều năm.

Nó sai về **tầng**. Và vì sai tầng, nó làm bạn hỏi sai câu hỏi — đi tìm "danh sách lỗ hổng của chroot" thay vì hỏi "chroot thay đổi đúng cái gì".

### 3.3 Phá bằng cơ chế: `chroot` đổi một thành phần trong pathname resolution

`chroot(2)` đổi **root directory của process gọi nó**. Root directory là một thành phần trong quy trình kernel dịch một pathname thành một inode: gặp `/` ở đầu đường dẫn thì bắt đầu từ root directory của process, gặp đường dẫn tương đối thì bắt đầu từ cwd của process.

`chroot` sửa **thành phần thứ nhất**. Nó không nói gì về thành phần thứ hai, và không nói gì về những tham chiếu đã được dịch xong từ trước.

Từ đó ba đường thoát rơi ra như phép trừ:

| Thứ `chroot` KHÔNG chạm | Hệ quả trực tiếp |
|---|---|
| **cwd** của process | Sau `chroot`, `.` có thể nằm **ngoài** cây mới → `cd ..` nhiều lần là ra |
| **fd đang mở** | Đường dẫn đã được dịch thành fd từ trước; fd không bị đóng, đọc/ghi vẫn tới đúng inode cũ ngoài cây |
| **`/proc/pid/root`** | Symlink này *chính là* root directory của process, phơi ra cho ai đọc được `/proc` |

> **Nguồn — chưa tự đo.** `chroot(2)` tự phát biểu cả ba điều, không cần ai suy diễn:
> (a) về mục đích: *"it is not intended to be used for any kind of security purpose, neither to fully sandbox a process nor to restrict filesystem system calls"*;
> (b) về cwd: *"This call does not change the current working directory, so that after the call '.' can be outside the tree rooted at '/'."*;
> (c) về `/proc`: *"The magic symbolic link, /proc/pid/root, can be used to discover a process's root directory"*
> ([chroot(2)](https://man7.org/linux/man-pages/man2/chroot.2.html)).
> **Đo lại:** `readlink /proc/1/root`, và tự viết một chương trình C gọi `chroot(sub)` rồi `cd ..` như ở mục 2.

Dòng (a) là dòng phá mô hình, và nó phá theo cách khó tranh luận: **man page không hứa bảo mật.** Nên câu "chroot không an toàn vì có bug" sai ở tiền đề — không có bug nào ở đây, chỉ có một syscall làm đúng thứ nó ghi trong tài liệu, và một cộng đồng dùng nó cho việc nó không nhận. Escape ở mục 2 không phải lỗi kernel; nó là đúng hai dòng (b) đọc thành lệnh.

Còn triệu chứng thứ nhất ở mục 2 — mount rác còn lại sau khi service tắt — thì thậm chí không cần dòng nào: `chroot` **không xuất hiện** trong cơ chế mount. `mount --bind` của bạn ghi vào danh sách mount của namespace đang dùng, mà bạn không tạo namespace nào, nên đó là danh sách mount của host. Service tắt không xoá mount, vì mount chưa bao giờ thuộc về service — nó thuộc về **namespace**, và namespace đó là namespace của cả máy.

---

## ⏸ Dừng lại — đoán trước #2

Với hiểu biết vừa xong, `pivot_root(2)` khác `chroot(2)` ở đâu là **khác biệt gốc**?

- **(A)** `pivot_root` cũng đổi cwd, nên bịt được đường `cd ..`.
- **(B)** `pivot_root` đóng hết fd đang mở trước khi đổi root.
- **(C)** `pivot_root` không thao tác trên process — nó thao tác trên **mount namespace**.
- **(D)** `pivot_root` kiểm tra quyền chặt hơn nên cần CAP_SYS_ADMIN.

Ba trong bốn phương án đều mô tả điều gì đó đúng hoặc gần đúng. Chỉ một cái là **khác biệt về tầng**.

---

### 3.4 `pivot_root` đổi root mount của cả namespace

Đáp án là **(C)**.

> **Nguồn — chưa tự đo.** `pivot_root(2)` mô tả phạm vi tác động của chính nó:
> *"changes the root mount in the mount namespace of the calling process … it moves the root mount to the directory put_old and makes new_root the new root mount"*.
> Và về phạm vi đó rộng đến đâu: *"changes the root directory and the current working directory of each process or thread in the same mount namespace to new_root if they point to the old root directory"*
> ([pivot_root(2)](https://man7.org/linux/man-pages/man2/pivot_root.2.html)).
> **Đo lại:** `strace -e pivot_root runc run …`.

Ba chữ quyết định: **root mount**, và **in the mount namespace**. `chroot` đổi một thuộc tính của *một process*; `pivot_root` đổi một **entry trong cái bảng** mà 3.1 vừa dựng — và bảng đó là tài sản của cả namespace. Câu trích thứ hai là hệ quả trực tiếp: đã đổi gốc của bảng thì mọi process dùng bảng đó, nếu trỏ vào root cũ, đều bị kéo theo — cả root **và** cwd.

So với bảng ở 3.3 thì thấy ngay chỗ lệch: `chroot` để cwd nằm ngoài, `pivot_root` đổi luôn cwd. Không phải vì ai đó "vá lỗi chroot", mà vì cwd và root cùng là hai tham chiếu vào cây mount, và thứ bị đổi là **cây**.

<svg viewBox="0 0 720 340" role="img" aria-labelledby="ct3-a-t ct3-a-d" style="width:100%;height:auto">
<title id="ct3-a-t">chroot đổi một mũi tên của một process, pivot_root đổi gốc của cây mount</title>
<desc id="ct3-a-d">Hai cột. Cột trái: chroot chỉ đổi con trỏ root directory của một process sang một thư mục trong cây mount, cây mount không đổi, còn cwd và fd đang mở vẫn trỏ ra ngoài cây mới nên có đường thoát. Cột phải: pivot_root đổi chính root mount của mount namespace, nên mọi process dùng bảng mount đó đều đổi theo cả root và cwd.</desc>
<rect x="14" y="20" width="336" height="300" rx="10" fill="#f59e0b" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.28"/>
<text x="182" y="42" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">chroot(2) — tầng: MỘT process</text>
<text x="182" y="60" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">đổi 1 thành phần của pathname resolution</text>
<rect x="34" y="76" width="140" height="180" rx="8" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="104" y="96" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">cây mount (KHÔNG đổi)</text>
<text x="46" y="118" font-size="10" fill="currentColor">/</text>
<text x="58" y="136" font-size="10" fill="currentColor">etc/shadow</text>
<text x="58" y="154" font-size="10" fill="currentColor">usr</text>
<text x="58" y="172" font-size="10" fill="currentColor">srv</text>
<rect x="66" y="180" width="102" height="20" rx="4" fill="#3b82f6" fill-opacity="0.28"/>
<text x="72" y="194" font-size="10" fill="currentColor">pyapp/rootfs</text>
<text x="82" y="216" font-size="10" fill="currentColor">app</text>
<text x="82" y="234" font-size="10" fill="currentColor">usr</text>
<rect x="196" y="100" width="136" height="60" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="264" y="120" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">process P</text>
<text x="264" y="137" font-size="10" text-anchor="middle" fill="currentColor">root -&gt; rootfs</text>
<text x="264" y="152" font-size="10" text-anchor="middle" fill="currentColor">cwd -&gt; ? fd -&gt; ?</text>
<line x1="196" y1="130" x2="172" y2="188" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="216" y1="160" x2="120" y2="122" stroke="#ef4444" stroke-opacity="0.85" stroke-width="2" stroke-dasharray="5 3"/>
<text x="196" y="286" font-size="10" fill="#ef4444" font-weight="bold">đường thoát: cwd / fd / /proc/pid/root</text>
<text x="196" y="304" font-size="10" fill="currentColor" opacity="0.8">trỏ ra ngoài cây mới — không phải bug</text>
<rect x="370" y="20" width="336" height="300" rx="10" fill="#84cc16" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.28"/>
<text x="538" y="42" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">pivot_root(2) — tầng: MOUNT NAMESPACE</text>
<text x="538" y="60" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">đổi root mount của cả bảng mount</text>
<rect x="390" y="76" width="296" height="120" rx="8" fill="#84cc16" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="538" y="96" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">bảng mount SAU pivot_root</text>
<text x="404" y="118" font-size="10" fill="currentColor">/ = new_root (rootfs cũ của container)</text>
<text x="404" y="136" font-size="10" fill="currentColor">/proc /sys /dev — mount lại trong ns</text>
<text x="404" y="154" font-size="10" fill="currentColor">put_old = root CŨ, nằm dưới new_root</text>
<text x="404" y="176" font-size="10" fill="currentColor" opacity="0.85">umount put_old -&gt; root cũ biến mất khỏi bảng</text>
<rect x="390" y="212" width="136" height="54" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="458" y="231" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">process P</text>
<text x="458" y="248" font-size="10" text-anchor="middle" fill="currentColor">root + cwd đổi theo</text>
<rect x="548" y="212" width="136" height="54" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
<text x="616" y="231" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">process Q cùng ns</text>
<text x="616" y="248" font-size="10" text-anchor="middle" fill="currentColor">cũng đổi theo</text>
<line x1="458" y1="212" x2="470" y2="196" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<line x1="616" y1="212" x2="600" y2="196" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<text x="390" y="290" font-size="10" fill="currentColor" opacity="0.8">bảng là tài sản của NAMESPACE, không của process</text>
<text x="390" y="308" font-size="10" fill="currentColor" opacity="0.8">nên đổi gốc bảng là đổi cho tất cả cùng lúc</text>
</svg>

Chỗ đáng nhớ nhất: **`pivot_root` cần mount namespace mới tồn tại trước.** Nó sửa root mount của "the mount namespace of the calling process" — nếu process đó vẫn đang ở mount namespace của host thì bạn vừa dời gốc cây mount của **cả máy**. Hai cơ chế ở hai tầng, và tầng dưới phải có sẵn thì tầng trên mới có nghĩa:

> **Suy luận, không phải trích dẫn.** `mount_namespaces(7)` không nói câu "container phải dùng `pivot_root` thay `chroot`", và `pivot_root(2)` không có đoạn nào so sánh với `chroot`. Kết luận này là của tôi, ghép từ ba dữ kiện có nguồn: (1) `chroot(2)` tự khai không nhằm mục đích bảo mật và không đổi cwd; (2) `pivot_root(2)` đổi **root mount** của mount namespace và kéo theo root+cwd của mọi process trong đó; (3) mount namespace là thứ giữ **danh sách mount**, nên chỉ có nó mới cho phép root cũ bị `umount` khỏi tầm nhìn. Vậy `pivot_root` + mount namespace mới cho một trạng thái mà `chroot` về nguyên tắc không tạo được: **root cũ không còn là một entry trong bảng**. **Kiểm bằng:** `strace -f -e trace=pivot_root,chroot,mount runc run …` trên một bundle, xem runtime gọi cái nào.

Câu cuối là điểm khác biệt vận hành thật sự. Với `chroot`, cây host vẫn nguyên trong bảng mount — chỉ là process không đánh địa chỉ tới nó qua `/` được. Với `pivot_root` rồi `umount` chỗ `put_old`, dòng mô tả root cũ **bị xoá khỏi danh sách mount của namespace**. Không còn đường dẫn nào, không phải "bị chặn đường dẫn".

### 3.5 Bốn điều kiện của `pivot_root`, và vì sao script trên blog hay lỗi

Mọi hướng dẫn dựng container bằng tay đều có một dòng trông vô nghĩa:

```
mount --bind /srv/pyapp/rootfs /srv/pyapp/rootfs
```

Bind một thư mục vào chính nó — không copy gì, không đổi nội dung gì, và gần như không bài nào giải thích nó. Lý do nằm trong danh sách điều kiện của `pivot_root(2)`:

| Điều kiện | Ý nghĩa thực tế |
|---|---|
| `new_root` và `put_old` phải là **thư mục** | rõ |
| `new_root` phải là một **mount point**, và không được là `/` | một thư mục thường **không phải** mount point → phải `mount --bind X X` để biến nó thành mount point |
| `put_old` phải nằm **dưới** `new_root` | nên mới có `mkdir rootfs/.old_root` trước khi pivot |
| Cần **CAP_SYS_ADMIN**; parent mount của `new_root` không được **MS_SHARED** | liên quan trực tiếp mục 3.6 |

> **Nguồn — chưa tự đo.** `pivot_root(2)` đặt yêu cầu mount point lên cả root hiện tại: *"The current root directory must be a mount point"*
> ([pivot_root(2)](https://man7.org/linux/man-pages/man2/pivot_root.2.html)). Các điều kiện còn lại trong bảng — `new_root`/`put_old` là thư mục, `new_root` là mount point khác `/`, `put_old` nằm dưới `new_root`, cần CAP_SYS_ADMIN, parent mount không MS_SHARED — nằm trong phần điều kiện của cùng man page đó.
> **Đo lại:** `mount --bind /newroot /newroot` trước khi pivot, và bỏ đúng dòng đó để xem lệnh gãy ở đâu.

Đúng thứ tự nhân quả: bước bind **không** phục vụ việc dựng rootfs, nó chỉ thoả một điều kiện hình thức của syscall. Bạn tạo một mount trùng source và target để thư mục ấy thành **một dòng trong `mountinfo`** — vì đó là thứ `pivot_root` nhận: một mount, không phải một thư mục.

---

## ⏸ Dừng lại — đoán trước #3

Bạn copy một script từ một bài blog, và người viết đã lược bớt "dòng thừa":

```
mkdir -p /srv/c1/rootfs/.old
# (thiếu ở đây một dòng)
cd /srv/c1/rootfs
pivot_root . .old
```

Script chạy dưới root, đủ capability, đúng đường dẫn, thư mục `.old` tồn tại và nằm dưới `new_root`. `pivot_root` sẽ fail với errno nào?

- **(A)** `EPERM` — thiếu quyền.
- **(B)** `ENOENT` — không tìm thấy đường dẫn.
- **(C)** `EINVAL` — tham số không thoả điều kiện.
- **(D)** `EBUSY` — đang có process dùng.

Và câu phụ: dòng bị thiếu là dòng nào?

---

### 3.6 Mount propagation: vì sao bind-mount đôi khi rò sang host

Đáp án là **(C)** `EINVAL`, dòng thiếu là `mount --bind /srv/c1/rootfs /srv/c1/rootfs`. Thư mục tồn tại, quyền đủ — cái sai là **hình dạng tham số**: `new_root` không phải mount point. Lỗi này hay bị đoán thành `EPERM` vì người ta gắn "pivot_root" với "quyền".

> **Suy luận, không phải trích dẫn.** Man page liệt kê "new_root là mount point" trong phần điều kiện của tham số, nên vi phạm nó là vi phạm điều kiện tham số — `EINVAL`, không phải `EPERM` (quyền vẫn đủ) và không phải `ENOENT` (đường dẫn vẫn tồn tại). **Kiểm bằng:** `strace -e pivot_root` trên script thiếu dòng bind, đọc errno thật ở dòng trả về.

Điều kiện cuối trong bảng 3.5 — "parent mount không được MS_SHARED" — mở ra thứ giải thích triệu chứng còn lại của mục 2. Mỗi mount có một **propagation type**, quyết định mount/umount mới xảy ra dưới đó có được **truyền** sang cây mount khác hay không:

| Propagation | Mount mới tạo bên dưới nó thì sao |
|---|---|
| `shared` | truyền **hai chiều** giữa các peer — tạo bên này, bên kia thấy; tháo bên kia, bên này mất |
| `private` | không truyền chiều nào — mount mới chỉ tồn tại ở chỗ tạo ra nó |
| `slave` | nhận từ master, **không gửi ngược lại** — một chiều |

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ findmnt -o TARGET,PROPAGATION
TARGET        PROPAGATION
/             shared
/proc         shared
/sys          shared
/mnt/data     shared
/srv/c1/rootfs  private
```

Đọc bảng này thì triệu chứng thứ nhất ở mục 2 hết bí ẩn: bạn bind-mount dưới một cây `shared` và **không** ở mount namespace riêng — nên mount đó là mount của host, đúng nghĩa. Cùng thao tác trong một mount namespace mà parent là `private` thì mount chết cùng namespace, host không bao giờ thấy. **Cùng một lệnh `mount --bind`, hai kết quả, và biến quyết định là một cột trong `findmnt`** — không phải cờ của lệnh mount.

Chiều ngược lại mới gây đau ở production, và nó có nguồn:

> **Nguồn — chưa tự đo.** `mount_namespaces(7)` nói về mount namespace **ít privilege hơn**: *"shared mounts are reduced to slave mounts"*, và *"MS_RDONLY, MS_NOSUID, MS_NOEXEC, and the 'atime' flags...may not be changed in the less privileged mount namespace"*
> ([mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)).
> **Đo lại:** `findmnt -o TARGET,PROPAGATION` bên trong và bên ngoài container, so cột thứ hai của cùng một target.

Hai câu này thành một luật vận hành: trong mount namespace ít privilege hơn, mount thừa hưởng từ ngoài **bị hạ từ `shared` xuống `slave`** — nhận, không gửi. Nên mount do host tạo thì bên trong thấy; mount do bên trong tạo thì host **không** thấy.

> **Suy luận, không phải trích dẫn.** Man page không nói "vì thế host không tháo được mount của container". Tôi suy: nếu mount do bên trong tạo không được truyền ra, nó **không có dòng nào trong `mountinfo` của host**, nên host không có đường dẫn nào để `umount` nó — thứ đang giữ filesystem đó nằm trong một bảng mount mà host không đọc bằng đường dẫn thường. Đó là hình dạng của loại `target is busy` khó tìm thủ phạm nhất. **Kiểm bằng:** so `wc -l /proc/self/mountinfo` và `wc -l /proc/<pid>/mountinfo` với `<pid>` là process trong container — hai con số khác nhau, và phần chênh là phần host không tháo được qua đường dẫn của mình.

Câu thứ hai của trích dẫn chặn một thứ người ta thường tưởng làm được: trong mount namespace ít privilege hơn, bạn **không remount bỏ** `MS_RDONLY`/`MS_NOSUID`/`MS_NOEXEC` được. Bind mount đưa vào read-only thì bên trong không tự cởi ra — một trong rất ít chỗ mount namespace hành xử như hàng rào chứ không chỉ như khung nhìn.

<svg viewBox="0 0 700 250" role="img" aria-labelledby="ct3-b-t ct3-b-d" style="width:100%;height:auto">
<title id="ct3-b-t">Ba propagation type quyết định mount đi được hướng nào</title>
<desc id="ct3-b-d">Ba khối cạnh nhau. Shared truyền hai chiều giữa host và namespace. Private không truyền chiều nào. Slave chỉ nhận từ host mà không gửi ngược, và đây là trạng thái mà mount thừa hưởng bị hạ xuống trong một mount namespace ít privilege hơn.</desc>
<rect x="12" y="24" width="216" height="184" rx="9" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
<text x="120" y="46" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">shared</text>
<text x="40" y="76" font-size="10" fill="currentColor">host mount table</text>
<text x="40" y="176" font-size="10" fill="currentColor">mount ns</text>
<line x1="96" y1="92" x2="96" y2="156" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="96" y1="156" x2="91" y2="146" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="96" y1="156" x2="101" y2="146" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="144" y1="156" x2="144" y2="92" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="144" y1="92" x2="139" y2="102" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="144" y1="92" x2="149" y2="102" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<text x="120" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">mount rò cả hai chiều</text>
<rect x="242" y="24" width="216" height="184" rx="9" fill="#84cc16" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.28"/>
<text x="350" y="46" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">private</text>
<text x="270" y="76" font-size="10" fill="currentColor">host mount table</text>
<text x="270" y="176" font-size="10" fill="currentColor">mount ns</text>
<line x1="326" y1="100" x2="374" y2="148" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
<line x1="374" y1="100" x2="326" y2="148" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
<text x="350" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">không truyền chiều nào</text>
<rect x="472" y="24" width="216" height="184" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
<text x="580" y="46" font-size="12" font-weight="bold" text-anchor="middle" fill="currentColor">slave</text>
<text x="500" y="76" font-size="10" fill="currentColor">host mount table</text>
<text x="500" y="176" font-size="10" fill="currentColor">mount ns</text>
<line x1="556" y1="92" x2="556" y2="156" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="556" y1="156" x2="551" y2="146" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="556" y1="156" x2="561" y2="146" stroke="currentColor" stroke-opacity="0.75" stroke-width="2"/>
<line x1="604" y1="156" x2="604" y2="120" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="5 3"/>
<line x1="592" y1="112" x2="616" y2="100" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
<line x1="592" y1="100" x2="616" y2="112" stroke="#ef4444" stroke-opacity="0.8" stroke-width="2"/>
<text x="580" y="200" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">nhận vào, không gửi ra</text>
<text x="580" y="218" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">mount ns ít privilege nằm ở đây</text>
</svg>

### 3.7 Còn rootfs kia ở đâu ra?

Gộp 3.1 tới 3.6 thì bạn có đủ cơ chế để **đặt** một rootfs vào chỗ `/` — sáu bước, viết đủ ở mục 5 bài 1, không bước nào cần Docker.

Nhưng còn một câu chưa trả lời, và đó là câu quan trọng nhất về hiệu năng: **cái cây `new_root` kia từ đâu mà có, nếu không ai copy vài trăm MB?**

Cả bài này không chạm vào câu đó. `pivot_root` nhận một mount point và dời gốc; nó không quan tâm mount point đó là ext4, tmpfs, hay một filesystem hợp nhất nhiều thư mục. Container start gần như tức thì **không** nhờ `pivot_root` — syscall đó chỉ sửa vài con trỏ trong bảng, nhanh dù rootfs to bao nhiêu. Thứ làm rootfs **có mặt** mà không copy byte nào là một loại filesystem khác, và nó là toàn bộ chương 3.

Một chi tiết nữa để treo: khi bind-mount một thư mục của host vào container, owner của file bên trong có thể hiện ra một con số lạ — và đó không phải chuyện của mount namespace.

> **Nguồn — chưa tự đo.** Kernel doc về ID mappings nói cơ chế: *"the kernel will report unmapped ids as the overflowuid `(uid_t)-1` or overflowgid `(gid_t)-1` to userspace"*
> ([ID mappings](https://docs.kernel.org/filesystems/idmappings.html)). Tức là đây là chuyện của **user namespace**, không phải của mount — bài 18 giải thích cả cơ chế dịch ID và cách đọc ra owner thật.
> **Đo lại:** `cat /proc/sys/kernel/overflowuid`, rồi `ls -ln` trên một bind mount trong container rootless.

---

## 4. Bảng so sánh, dựng từ hai man page riêng

Cần nói rõ trước khi đọc bảng: **`pivot_root(2)` không có một dòng nào so sánh nó với `chroot`.** Mỗi ô dưới đây đến từ man page của **chính syscall ở cột đó** — cột `chroot` từ `chroot(2)`, cột `pivot_root` từ `pivot_root(2)`. Việc xếp chúng cạnh nhau là việc của tôi, không phải của man page.

| Hỏi | `chroot(2)` | `pivot_root(2)` |
|---|---|---|
| Đổi cái gì | root directory của **process gọi** | **root mount** của mount namespace |
| Tầng | thuộc tính của một process | một entry trong bảng mount của namespace |
| Ảnh hưởng process khác | không | **mọi process cùng mount ns**, nếu chúng trỏ vào root cũ |
| cwd | *"does not change the current working directory"* | đổi luôn, cùng điều kiện như trên |
| Cần mount ns mới trước | không | có — nếu không thì bạn dời gốc cây mount của cả máy |
| Root cũ sau đó | vẫn là mount trong bảng, chỉ không tới được qua `/` | thành `put_old`, **`umount` được → mất khỏi bảng** |
| Điều kiện tham số | đường dẫn là thư mục | `new_root` phải là **mount point**, `put_old` dưới `new_root`, parent không MS_SHARED |
| Man page tự nói về bảo mật | *"it is not intended to be used for any kind of security purpose"* | không phát biểu gì về bảo mật |

Ô cuối hay bị đọc ngược: `pivot_root(2)` **không** hứa bảo mật, nó chỉ không phủ nhận. Thứ tạo khác biệt là dòng "Root cũ sau đó", đã giải thích ở 3.4.

Một cách ghi nhớ đủ dùng: `chroot` **che** đường đi tới root cũ; `pivot_root` cộng `umount` **rút** root cũ ra khỏi danh sách.

---

## 5. Tính tay

Giấy bút, không cần máy. Mọi dữ kiện cần đều nằm ở mục 3.

**Bài 1 — đếm dòng `mountinfo`.** Host có 34 mount, toàn bộ propagation là `shared`. Bạn làm đúng thứ tự sau:

```
(1) unshare -m        (vào mount ns mới)
(2) mount --make-rprivate /          (toàn cây thành private)
(3) mount --bind /srv/c1/rootfs /srv/c1/rootfs
(4) mount -t tmpfs tmpfs /srv/c1/rootfs/tmp
(5) mkdir /srv/c1/rootfs/.old ; cd /srv/c1/rootfs ; pivot_root . .old
(6) umount -l /.old
```

- Ngay sau (1), `wc -l /proc/self/mountinfo` **trong** ns ra bao nhiêu? Trên host ra bao nhiêu?
- Sau (4), hai con số đó là bao nhiêu? Trả lời cho **hai** trường hợp: có bước (2), và bỏ bước (2).
- Nếu bỏ bước (3), lệnh nào ở trên fail, với errno nào, và vì sao ba lệnh trước nó vẫn chạy được?
- Sau (6), số dòng `mountinfo` trong ns còn lại **nhiều hơn hay ít hơn** 34? Giải thích bằng danh từ "danh sách mount", không dùng từ "xoá file".

**Bài 2 — ai tháo được mount này.** Trong một container đang chạy, một process mount một tmpfs vào `/scratch`. Mount namespace của container ít privilege hơn namespace của host.

- Host chạy `findmnt | grep scratch` — thấy gì? Dựa vào câu nào trong mục 3.6?
- Propagation mà container **thừa hưởng** từ host cho các mount cũ là gì, và propagation của mount `/scratch` mới tạo thì liên quan chiều nào?
- Nếu host tạo thêm một mount ở `/mnt/new`, container có thấy không? Đây là chiều nào của `slave`?
- Container bị kill. Cái tmpfs `/scratch` đi đâu? Viết câu trả lời chỉ bằng ngôn ngữ "bảng mount", không dùng "bị dọn dẹp".

**Bài 3 — ba lối thoát, chấm điểm từng cái.** Một process bị `chroot` vào `/srv/c1/rootfs`, chạy dưới UID 0 của host, cwd của nó đã được `cd /` **sau** khi chroot. Với mỗi lối thoát dưới đây, ghi: nó còn dùng được không, và **dòng man page nào** ở mục 3.3 quyết định câu trả lời.

```
(i)   cd ../../../.. rồi đọc etc/shadow
(ii)  chroot lần hai vào một subdir rồi cd ..
(iii) dùng một fd tới /etc đã mở TRƯỚC khi chroot
(iv)  đọc readlink /proc/self/root
```

- Cái nào bị bịt bởi việc `cd /` sau chroot, cái nào không?
- Nếu thay `chroot` bằng `pivot_root` **nhưng không** `umount` `put_old`, cái nào trong bốn cái trên còn dùng được?
- Vậy trong cụm "mount ns + `pivot_root` + `umount put_old`", **bước nào** là bước thật sự bịt lối (iii)? Đây là câu phải trả lời bằng cơ chế, không phải bằng "vì nó an toàn hơn".

---

## 6. Chuyển giao

Không có đáp án trong bài.

Một job CI build artifact chạy trong container, và bên trong nó có bước dựng sandbox bằng tay để test một binary: tạo mount namespace, bind một thư mục cache từ host vào, chạy binary, rồi dọn. Trên máy dev sạch sẽ; trên runner CI, sau vài trăm job, `df` báo đầy và `findmnt` in ra hàng trăm dòng bind giống nhau.

1. Trước khi đọc script: hiện tượng "mount tích tụ" nói gì về **propagation** của cây mà bind đang gắn vào, và về việc script có thật sự tạo mount namespace riêng hay không?
2. Script có dòng `unshare -m`, nhưng lệnh `mount --bind` lại nằm ở một shell **khác** được gọi sau đó qua `ssh` tới chính máy đó. Mount đó vào bảng của ai?
3. Đội bạn thêm `mount --make-rprivate /` vào đầu script và mount rác hết tích tụ. Giải thích vì sao cách đó có tác dụng, rồi nêu **một thứ nó làm mất** so với trước (gợi ý: chiều nào của propagation vừa bị tắt, và ai đang cần chiều đó).
4. Một bước khác của job cần thư mục cache là read-only bên trong sandbox, và code bên trong đang cố `mount -o remount,rw` nó. Nó fail. Dòng nào ở mục 3.6 giải thích, và fail này là "hàng rào" hay "khung nhìn"?
5. Binary được test gọi `chroot()` cho một mục đích riêng của nó, rồi mở một file bằng đường dẫn tuyệt đối. Nếu process đó có một fd tới thư mục cache mở từ trước `chroot`, cái `chroot` kia có ngăn nó ghi vào cache không?
6. Runner được chuyển sang chạy job trong container **rootless**. Bind mount cache giờ hiện owner là một số rất lớn không có trong `/etc/passwd`. Đây là chuyện của mount namespace hay của một namespace khác, và bạn tra bài nào?
7. **Câu khó nhất:** giả sử bạn phải dựng sandbox mà **không được** dùng `pivot_root` — kernel trên runner cho bạn `unshare -m` nhưng chặn CAP_SYS_ADMIN ở chỗ cần cho pivot. Bạn còn lại `chroot` và toàn quyền trên bảng mount của namespace riêng. Mô tả trạng thái tốt nhất bạn đạt được, và chỉ ra chính xác **thứ gì vẫn còn** mà cụm `pivot_root` + `umount put_old` sẽ loại bỏ được — rồi lập luận xem sự khác biệt còn lại đó có chặn được lối (iii) ở mục 5 hay không.

---

## 7. Tóm tắt

- Mount namespace cô lập **danh sách mount**, không phải filesystem: *"Mount namespaces provide isolation of the list of mounts seen by the processes in each namespace instance."* Cùng một partition có thể mang hai đường dẫn ở hai namespace, và đó vẫn là cùng byte trên đĩa.
- Namespace mới là **bản copy** của danh sách cũ — *"the mount list of the new namespace is a copy of the mount list in the caller's previous mount namespace"*. Nên `unshare -m` **không** đổi thứ bạn đang thấy; nó đổi nơi các thay đổi **sau đó** được ghi vào.
- `chroot(2)` đổi **một thành phần trong pathname resolution của một process**. Man page tự khai: *"it is not intended to be used for any kind of security purpose, neither to fully sandbox a process nor to restrict filesystem system calls"*.
- Ba lối thoát khỏi `chroot` không phải bug, chúng là những thứ `chroot` không chạm: cwd (*"does not change the current working directory"*), fd đã mở, và *"/proc/pid/root"*.
- `pivot_root(2)` *"changes the root mount in the mount namespace of the calling process"*, và đổi root+cwd của **mọi process trong cùng mount ns** nếu chúng trỏ vào root cũ. Nó ở tầng **namespace**, không ở tầng process — nên nó cần mount namespace mới tồn tại trước.
- `new_root` phải là một **mount point**. Đó là toàn bộ lý do tồn tại của dòng `mount --bind X X` trong mọi hướng dẫn; bỏ nó thì `pivot_root` fail vì tham số, không vì quyền.
- Thứ thật sự khác giữa hai cơ chế không phải một lời hứa trong tài liệu mà là trạng thái kết thúc: `pivot_root` + `umount put_old` làm root cũ **mất khỏi danh sách mount**; `chroot` chỉ làm nó không tới được qua `/`.
- Propagation quyết định mount đi hướng nào. Trong mount namespace **ít privilege hơn**, *"shared mounts are reduced to slave mounts"* — nhận từ host, không gửi ra. Đó là lý do bind-mount đôi khi rò sang host (khi không có ns riêng, hoặc cây là `shared`) và đôi khi không.
- Cũng trong namespace ít privilege đó, *"MS_RDONLY, MS_NOSUID, MS_NOEXEC, and the 'atime' flags...may not be changed"* — một trong rất ít chỗ mount namespace hành xử như hàng rào thật.
- Bài này giải thích cách **đặt** một rootfs vào chỗ `/`. Nó không giải thích rootfs đó có mặt bằng cách nào mà không copy byte nào — `pivot_root` nhanh vì nó chỉ sửa bảng, chứ không phải vì nó làm gì với dữ liệu.

Chương 1 hết ở đây. Ba bài vừa rồi đi hết trục **tôi thấy gì**: kernel không có object container, namespace đổi câu trả lời của kernel, và mount namespace cộng `pivot_root` đổi cả gốc của cây đường dẫn. Trục đó không nói một câu nào về **lượng** — một process trong đủ 8 namespace, với rootfs riêng hoàn chỉnh, vẫn ăn hết RAM của máy.

→ **Bài 4 — cgroup v1 vs v2: đọc `/sys/fs/cgroup`**: sang trục thứ hai, "tôi dùng được bao nhiêu" — vì sao cùng một câu hỏi về giới hạn lại có câu trả lời nằm ở hai chỗ khác nhau tuỳ máy, và làm sao biết máy mình đang ở chỗ nào.
