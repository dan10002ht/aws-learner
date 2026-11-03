# Bài 4 — cgroup v1 vs v2: đọc `/sys/fs/cgroup`

## 1. Mục tiêu

Sau bài này bạn có thể:

- Nói được **hình dạng** của cgroup v1 khác v2 ở chỗ nào, và vì sao đó không phải chuyện đổi tên file.
- Đọc `cat /proc/self/cgroup` rồi suy ra ngay máy đó đang ở v1, v2, và **process của bạn nằm ở đâu** trong cây.
- Giải thích vì sao trên v1 câu hỏi "process này bị giới hạn bao nhiêu" **không có một câu trả lời duy nhất**.
- Phân biệt `cgroup.controllers` với `cgroup.subtree_control`, và nói đúng câu "bật controller cho ai".
- Phát biểu ràng buộc **no internal process** với đúng phạm vi của nó (non-root, và chỉ khi chia tài nguyên), rồi suy ra vì sao công cụ phải tự sinh thêm một cgroup lá.
- Chỉ đúng **file nào trả lời câu hỏi nào** trong cây v2, và biết bài nào mổ file đó.

---

## 2. Triệu chứng

Đội bạn có một script sức khoẻ chạy đầu mỗi job CI. Nó in ra memory limit của chính container đang chạy, để log lại trước khi build:

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ cat /sys/fs/cgroup/memory/memory.limit_in_bytes
2147483648
```

Script đó sống hai năm không ai chạm. Rồi đội hạ tầng thay image của runner, và job nào cũng in ra:

```
cat: /sys/fs/cgroup/memory/memory.limit_in_bytes: No such file or directory
```

Bạn `ssh` vào runner mới, `ls /sys/fs/cgroup` — và không có thư mục `memory` nào. Không có `cpu`, không có `pids`. Thay vào đó là một đống **file** nằm ngay ở tầng trên cùng: `cgroup.controllers`, `cgroup.procs`, `cgroup.subtree_control`, `memory.max`, `cpu.max`… Bạn google, thấy người ta nói "v2 đổi tên `memory.limit_in_bytes` thành `memory.max`", sửa script thành `/sys/fs/cgroup/memory.max`, job xanh lại, đóng ticket.

Hai tuần sau, cùng script đó chạy trên một runner khác của cùng một đội in ra `max` — nghĩa là không giới hạn — trong khi `docker inspect` khai container có `--memory` hẳn hoi, và job vẫn chết vì hết RAM đúng ở mốc cũ. Không có lỗi, không có file thiếu. Chỉ là con số sai.

Kết luận dễ rơi vào nhất: "đường dẫn `/sys/fs/cgroup` khác nhau giữa các distro, phải thử vài chỗ". Kết luận đó sai không phải vì thiếu chỗ để thử, mà vì nó đang mô tả một cái cây bằng một danh sách đường dẫn.

---

## ⏸ Dừng lại — đoán trước #1

Chọn một đáp án trước khi đọc tiếp.

**Trên runner mới không có `/sys/fs/cgroup/memory/` mà có `/sys/fs/cgroup/memory.max`. Chuyện gì đã đổi?**

```
(a) Distro dời đường dẫn — tra tài liệu của distro rồi hardcode đường dẫn mới là xong
(b) Chỉ tên file đổi: memory.limit_in_bytes -> memory.max, mọi thứ còn lại y nguyên
(c) Số lượng CÂY đổi: v1 có thể có mỗi controller một cây riêng, v2 chỉ có một cây
(d) Controller memory bị tắt trong kernel của runner mới
```

---

## 3. Lý thuyết

Bài 1 dựng bản đồ hai trục: **namespace** trả lời "tôi thấy gì", **cgroup** trả lời "tôi dùng được bao nhiêu". Chương 1 đi hết trục thứ nhất. Từ đây là trục thứ hai, và bài này chưa đặt một giới hạn nào — nó chỉ đi tìm **chỗ** mà mọi giới hạn được viết ra. Ba bài sau đọc file trong cây đó; nếu bạn không biết mình đang đứng ở cây nào thì cả ba bài sau đều đọc sai.

Một câu gạt sang bên trước khi đi: **cgroup namespace** (một trong tám namespace ở bài 2) và **cgroup controller** không phải một thứ. Cái thứ nhất đổi *đường dẫn bạn thấy* khi đọc `/proc/self/cgroup`; cái thứ hai là bộ máy kế toán tài nguyên. Bài 2 đã cảnh báo chỗ này, bài này nói về cái thứ hai.

### 3.1 Bản sai chạy trước: "v2 là v1 với tên file mới"

Mô hình này đáng được chạy thật, vì nó **đúng cho những file bạn tra đầu tiên**:

| Câu hỏi | File trên v1 | File trên v2 |
|---|---|---|
| giới hạn memory cứng | `memory.limit_in_bytes` | `memory.max` |
| đang dùng bao nhiêu memory | `memory.usage_in_bytes` | `memory.current` |
| giới hạn CPU | `cpu.cfs_quota_us` + `cpu.cfs_period_us` | `cpu.max` (một file, hai số) |
| trọng số CPU khi tranh chấp | `cpu.shares` | `cpu.weight` |
| danh sách process trong cgroup | `tasks` | `cgroup.procs` |

Bảng này thật, và vì nó thật nên rất nhiều script migration được viết đúng theo nó: một `case` theo tên file, hoặc một hàm `read_limit()` thử v2 trước rồi fallback v1. Những script đó chạy xanh trên máy dev, chạy xanh trên staging, và sai ở đúng chỗ triệu chứng thứ hai của mục 2 — lặng lẽ, không exit code nào khác 0.

Chúng sai vì bảng trên bỏ mất hai thứ không nằm trong tên file: **có mấy cây**, và **process được phép nằm ở đâu trong cây**. Hai mục sau là hai thứ đó.

### 3.2 v1: mỗi controller có thể là một cây riêng, với cách xếp riêng

Đây là câu quyết định, và nó không nói về tên file:

> **Nguồn — chưa tự đo.** Trong cgroup v1, *"each controller may be mounted against a separate cgroup filesystem that provides its own hierarchical organization"* ([cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)). **Đo lại:** `cat /proc/self/cgroup`.

Đọc chậm mệnh đề phụ: không chỉ *mount riêng*, mà **cách tổ chức phân cấp riêng của nó**. Cây `cpu` và cây `memory` là hai cây độc lập, và không có gì buộc chúng phải giống nhau về hình dạng.

Hệ quả trực tiếp: một process có **một vị trí trong mỗi cây**, và các vị trí đó không cần trùng nhau. Nó có thể là `/docker/a3f1c9d0` trong cây `cpu`, `/system.slice/docker-a3f1c9d0.scope` trong cây `memory`, và `/a3f1c9d0` trong cây `pids`.

Từ đó, câu "process này bị giới hạn bao nhiêu" trên v1 là một câu hỏi **thiếu chủ ngữ**. Nó phải là "bị controller nào giới hạn bao nhiêu", và mỗi lần hỏi bạn phải đi vào đúng cây của controller đó, theo đúng đường dẫn của cây đó. Script ở mục 2 hardcode một đường dẫn duy nhất — nó đang giả định các cây có hình dạng giống nhau.

Và đây là lý do `cat /proc/self/cgroup` trên v1 in ra **nhiều dòng**: mỗi dòng là một cây.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ cat /proc/self/cgroup          # máy v1
11:memory:/system.slice/docker-a3f1c9d0.scope
 6:cpu:/docker/a3f1c9d0
 4:pids:/a3f1c9d0
 ...
```

> **Suy luận, không phải trích dẫn.** Bảng nguồn nói v1 *có thể* mount mỗi controller thành một cgroup filesystem riêng với phân cấp riêng, và cho `cat /proc/self/cgroup` làm lệnh đo. Chuyện "nhiều dòng, mỗi dòng một cây" là suy ra từ đó, không phải một câu trích. Layout ba cột ở trên cũng là minh hoạ — **đo lại bằng chính lệnh đó** trên máy thật trước khi parse nó trong script.

### 3.3 v2: một cây, nên một process có đúng một vị trí

v2 bỏ đúng cái bậc tự do vừa gây ra chuyện trên:

> **Nguồn — chưa tự đo.** *"Unlike v1, cgroup v2 has only single hierarchy."* ([kernel cgroup-v2 doc](https://docs.kernel.org/admin-guide/cgroup-v2.html)); và cgroups(7) nói cùng chuyện từ phía controller: *"all mounted controllers reside in a single unified hierarchy"* ([cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)). **Đo lại:** `mount | grep cgroup` và `stat -fc %T /sys/fs/cgroup`.

"Single hierarchy" không phải một lời khuyên về cách tổ chức — nó là thuộc tính của giao diện. Mọi controller nằm trong cùng một cây, nên **một process có đúng một vị trí**, và vị trí đó là câu trả lời cho *mọi* controller cùng lúc.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ cat /proc/self/cgroup          # máy v2 — một dòng
0::/system.slice/docker-a3f1c9d0.scope

$ ls /sys/fs/cgroup/system.slice/docker-a3f1c9d0.scope
cgroup.controllers  cgroup.procs  cgroup.subtree_control
cpu.max  cpu.stat  cpu.weight  memory.current  memory.max  memory.events  pids.max
```

Đây là chỗ khác biệt lớn nhất về **cách làm việc**, không phải về tên file: trên v2 bạn `cd` vào một thư mục và `cat` mọi câu trả lời ở cùng chỗ. Trên v1 bạn phải đi ba chỗ, và phải biết trước mỗi chỗ ở đâu.

Nhưng một cây thống nhất không phải quà tặng miễn phí, và nói ra cái giá của nó sẽ giải thích luôn mục sau:

> **Suy luận, không phải trích dẫn.** Nguồn chỉ phát biểu "single hierarchy", không nói đây là được hay mất. Suy ra: cái v1 cho phép mà v2 bỏ đi là **xếp cây `cpu` theo một cách và cây `memory` theo một cách khác**. Trên v2, chia nhóm cho controller này là chia nhóm cho mọi controller — một cây thì một cách nhóm. Vậy v2 phải có một cơ chế khác để nói "nhánh này tính `memory` nhưng không tính `cpu`", vì nó không còn dùng được cách của v1 là mount riêng. Cơ chế đó là `cgroup.subtree_control` ở mục 3.4. **Kiểm bằng:** so `cat cgroup.subtree_control` ở hai nhánh khác nhau trong cùng một cây v2.

<svg viewBox="0 0 700 232" role="img" aria-labelledby="ct4-a-t ct4-a-d" style="width:100%;height:auto">
<title id="ct4-a-t">Hình dạng cây cgroup v1 so với v2</title>
<desc id="ct4-a-d">Bên trái, cgroup v1 có ba cây rời nhau cho cpu, memory và pids, mỗi cây có cách xếp phân cấp khác nhau, và cùng một process xuất hiện ở ba vị trí khác nhau nên /proc/self/cgroup in ra ba dòng. Bên phải, cgroup v2 chỉ có một cây, process nằm ở đúng một lá, và /proc/self/cgroup in ra một dòng.</desc>
<text x="160" y="20" font-size="11" font-weight="bold" text-anchor="middle" fill="currentColor">cgroup v1 — ba cây rời</text>
<rect x="30" y="34" width="90" height="26" rx="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="75" y="51" font-size="10" text-anchor="middle" fill="currentColor">cpu</text>
<line x1="75" y1="60" x2="75" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="30" y="80" width="90" height="26" rx="6" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="75" y="97" font-size="10" text-anchor="middle" fill="currentColor">docker</text>
<line x1="75" y1="106" x2="75" y2="126" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="30" y="126" width="90" height="26" rx="6" fill="#f59e0b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="75" y="143" font-size="10" text-anchor="middle" fill="currentColor">a3f1c9d0</text>
<rect x="135" y="34" width="100" height="26" rx="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="185" y="51" font-size="10" text-anchor="middle" fill="currentColor">memory</text>
<line x1="185" y1="60" x2="185" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="135" y="80" width="100" height="26" rx="6" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="185" y="97" font-size="10" text-anchor="middle" fill="currentColor">system.slice</text>
<line x1="185" y1="106" x2="185" y2="126" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="135" y="126" width="100" height="26" rx="6" fill="#f59e0b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="185" y="143" font-size="10" text-anchor="middle" fill="currentColor">…a3f1c9d0.scope</text>
<rect x="250" y="34" width="80" height="26" rx="6" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="290" y="51" font-size="10" text-anchor="middle" fill="currentColor">pids</text>
<line x1="290" y1="60" x2="290" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="250" y="80" width="80" height="26" rx="6" fill="#f59e0b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="290" y="97" font-size="10" text-anchor="middle" fill="currentColor">a3f1c9d0</text>
<text x="180" y="180" font-size="10" text-anchor="middle" fill="currentColor">cùng một process, ba vị trí khác nhau</text>
<text x="180" y="198" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">/proc/self/cgroup in 3 dòng</text>
<text x="180" y="216" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">hình dạng ba cây không cần giống nhau</text>
<line x1="360" y1="28" x2="360" y2="216" stroke="currentColor" stroke-opacity="0.3" stroke-width="1"/>
<text x="530" y="20" font-size="11" font-weight="bold" text-anchor="middle" fill="currentColor">cgroup v2 — một cây</text>
<rect x="465" y="34" width="130" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
<text x="530" y="51" font-size="10" text-anchor="middle" fill="currentColor">/ (root)</text>
<line x1="530" y1="60" x2="530" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="465" y="80" width="130" height="26" rx="6" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="530" y="97" font-size="10" text-anchor="middle" fill="currentColor">system.slice</text>
<line x1="530" y1="106" x2="530" y2="126" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="465" y="126" width="130" height="26" rx="6" fill="#84cc16" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.35"/>
<text x="530" y="143" font-size="10" text-anchor="middle" fill="currentColor">…a3f1c9d0.scope</text>
<text x="530" y="180" font-size="10" text-anchor="middle" fill="currentColor">một vị trí, trả lời cho mọi controller</text>
<text x="530" y="198" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">/proc/self/cgroup in 1 dòng</text>
<text x="530" y="216" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">cpu.max, memory.max ở cùng thư mục</text>
</svg>

### 3.4 Controller được bật cho **các con**, không cho chính nó

Cây thống nhất kéo theo một câu hỏi mới mà v1 không có: nếu mọi controller ở cùng một cây, làm sao tắt `memory` cho một nhánh mà vẫn giữ `cpu`? v2 trả lời bằng hai file cạnh nhau, và chúng rất dễ bị đọc lẫn.

> **Nguồn — chưa tự đo.** `cgroup.controllers` là *"a list of the controllers that are available in this cgroup"* ([cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)), read-only. Còn *"Controllers can be enabled and disabled by writing to the 'cgroup.subtree_control' file"* ([kernel cgroup-v2 doc](https://docs.kernel.org/admin-guide/cgroup-v2.html)). **Đo lại:** `cat /sys/fs/cgroup/cgroup.controllers` rồi `cat /sys/fs/cgroup/cgroup.subtree_control`.

Chỗ người mới loay hoay lâu nhất nằm ở chữ **subtree**. Bạn ghi `+cpu` vào `cgroup.subtree_control` của một cgroup thì bạn **không** bật `cpu` cho cgroup đó — bạn bật cho **tầng dưới** nó.

```
# Minh hoạ cấu trúc output — giá trị là ví dụ, chưa đo thật
$ cd /sys/fs/cgroup/system.slice
$ cat cgroup.controllers          # cha đã cho phép gì -> ở đây dùng được gì
cpu memory pids
$ cat cgroup.subtree_control      # ta đang cho phép gì ở tầng DƯỚI
memory
$ echo +cpu > cgroup.subtree_control
$ cat cgroup.subtree_control
cpu memory
```

Hệ quả thực dụng: khi một file `cpu.max` "không tồn tại" trong cgroup bạn vừa tạo, chỗ phải đi sửa không phải cgroup đó mà là **cha** của nó.

> **Suy luận, không phải trích dẫn.** Nguồn nói `cgroup.controllers` liệt kê controller *khả dụng trong cgroup này*, và `cgroup.subtree_control` bật/tắt controller. Việc nối hai câu đó thành "`cgroup.controllers` của con phản chiếu `cgroup.subtree_control` của cha" là suy luận của tôi, không có một câu trích nào nói nguyên văn như vậy. **Kiểm bằng:** tạo `mkdir /sys/fs/cgroup/test`, `cat` `cgroup.controllers` của nó, rồi `echo -cpu > /sys/fs/cgroup/cgroup.subtree_control` và `cat` lại.

---

## ⏸ Dừng lại — đoán trước #2

**Bạn có cgroup `app.slice` đang chứa process 4827. Bạn `mkdir app.slice/worker` để giới hạn riêng một nhóm thread, rồi ghi `+memory` vào `app.slice/cgroup.subtree_control`. Chuyện gì xảy ra?**

```
(a) Chạy tốt: process 4827 ở app.slice, worker có memory riêng — hai việc không liên quan
(b) Lệnh ghi subtree_control bị chặn, vì app.slice đang có process của chính nó
(c) Process 4827 tự động bị kernel dời xuống app.slice/worker
(d) Chạy tốt trên v1, bị chặn trên v2 — và với root cgroup thì cả hai đều tốt
```

---

### 3.5 No internal process: process nằm ở lá

Đây là mục quan trọng nhất của bài, vì nó là thứ **không có tên file nào tương ứng** — nó là một ràng buộc về hình dạng.

> **Nguồn — chưa tự đo.** *"Non-root cgroups can distribute domain resources to their children only when they don't have any processes of their own."* ([kernel cgroup-v2 doc](https://docs.kernel.org/admin-guide/cgroup-v2.html)). cgroups(7) mô tả cùng hình dạng từ phía process: *"processes may reside only in leaf nodes (cgroups that do not themselves contain child cgroups)"* ([cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)). **Đo lại:** `cat cgroup.procs` ở một node đang có con.

Đọc đúng phạm vi, vì chỗ này bị phát biểu quá to ở rất nhiều nơi:

| Phát biểu | Đúng? |
|---|---|
| "v2 cấm process nằm ở cgroup có con" | quá to — nguồn ràng buộc theo **non-root** và theo việc **distribute domain resources** |
| "root cgroup cũng phải rỗng" | sai — câu trích nói rõ *non-root* |
| "một non-root cgroup vừa giữ process của mình vừa chia tài nguyên cho con" | không — đó chính là cái bị loại |

Vậy hình dạng hợp lệ của một nhánh v2 là: **node trung gian làm việc chia, lá giữ process.** Không có cách nào vừa đặt process vào một cgroup vừa dùng cgroup đó làm chỗ chia tài nguyên cho con nó.

Hệ quả bạn nhìn thấy hằng ngày mà chưa biết vì sao: cây cgroup thật luôn có những lá trông như dư ra. Một service có nhiều tầng thì tầng giữa rỗng process, và process bị đẩy xuống một cgroup con sinh riêng cho việc đó — tên thường gặp là `init.scope`, hoặc một lá đặt tên kiểu `.../leaf`. Chúng không phải rác của công cụ; chúng là cái giá của ràng buộc trên.

<svg viewBox="0 0 700 214" role="img" aria-labelledby="ct4-b-t ct4-b-d" style="width:100%;height:auto">
<title id="ct4-b-t">Ràng buộc no internal process buộc process dời xuống lá</title>
<desc id="ct4-b-d">Bên trái, cgroup app.slice vừa giữ process 4827 vừa có cgroup con worker, nên nó không thể chia tài nguyên cho con. Bên phải, cấu hình đã sửa: app.slice không giữ process nào, process được dời xuống một cgroup lá mới sinh ra, còn app.slice chỉ làm việc chia tài nguyên cho hai con.</desc>
<text x="150" y="20" font-size="11" font-weight="bold" text-anchor="middle" fill="currentColor">không hợp lệ cho việc chia</text>
<rect x="75" y="34" width="150" height="30" rx="6" fill="#ef4444" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/>
<text x="150" y="53" font-size="10" text-anchor="middle" fill="currentColor">app.slice · pid 4827</text>
<line x1="150" y1="64" x2="150" y2="96" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="75" y="96" width="150" height="30" rx="6" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="150" y="115" font-size="10" text-anchor="middle" fill="currentColor">worker</text>
<text x="150" y="152" font-size="10" text-anchor="middle" fill="currentColor">có process của mình + có con</text>
<text x="150" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">non-root cgroup: không distribute được</text>
<text x="150" y="188" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">root cgroup thì được miễn</text>
<line x1="245" y1="100" x2="330" y2="100" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.5"/>
<polygon points="330,100 320,95 320,105" fill="currentColor" fill-opacity="0.6"/>
<text x="287" y="90" font-size="10" text-anchor="middle" fill="currentColor">sửa lại</text>
<text x="520" y="20" font-size="11" font-weight="bold" text-anchor="middle" fill="currentColor">process dời xuống lá</text>
<rect x="445" y="34" width="150" height="30" rx="6" fill="#84cc16" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
<text x="520" y="53" font-size="10" text-anchor="middle" fill="currentColor">app.slice · rỗng process</text>
<line x1="520" y1="64" x2="440" y2="96" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<line x1="520" y1="64" x2="605" y2="96" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5"/>
<rect x="375" y="96" width="130" height="30" rx="6" fill="#f59e0b" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.3"/>
<text x="440" y="115" font-size="10" text-anchor="middle" fill="currentColor">leaf · pid 4827</text>
<rect x="540" y="96" width="130" height="30" rx="6" fill="#64748b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="605" y="115" font-size="10" text-anchor="middle" fill="currentColor">worker</text>
<text x="520" y="152" font-size="10" text-anchor="middle" fill="currentColor">tầng giữa chỉ còn việc chia</text>
<text x="520" y="170" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">lá mới sinh ra không phải rác</text>
<text x="520" y="188" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">quen gặp dưới tên init.scope</text>
</svg>

### 3.6 Phá bản sai: vì sao script đổi tên file sai âm thầm

Giờ quay lại mô hình ở mục 3.1 và đối chiếu với hai mục vừa rồi. Bảng tên file không nói được hai điều:

**Một — trên v1, một tiền tố đường dẫn không đủ.** Script đọc `/sys/fs/cgroup/memory/<path>/memory.limit_in_bytes` phải lấy `<path>` từ **dòng `memory`** của `/proc/self/cgroup`, không phải từ dòng `cpu`, và cũng không phải từ một biến dùng chung. Mọi script lấy một đường dẫn rồi ghép vào mọi controller đều đang đặt cược rằng ba cây có cùng hình dạng. Cược đó thắng khá thường xuyên, nên bug này sống lâu.

**Hai — trên v2, vị trí của process và vị trí của giới hạn có thể khác nhau.**

> **Suy luận, không phải trích dẫn.** Nguồn không phát biểu câu này. Nó suy ra từ hai dữ kiện ở mục 3.5: non-root cgroup chỉ chia được tài nguyên cho con khi **không giữ process nào**, và process chỉ ở lá. Vậy khi một cgroup cần cả hai việc, công cụ buộc phải sinh thêm một lá và đẩy process xuống đó. Từ đó: đường dẫn mà `/proc/self/cgroup` trả về là đường dẫn của **lá**, còn giới hạn có thể đã được ghi ở node **cha**. Một script chỉ `cat` file ở đúng lá sẽ đọc ra `max` và kết luận "không giới hạn" — đúng cú pháp, sai câu trả lời. **Kiểm bằng:** đi ngược từ lá lên root, `cat memory.max` ở từng tầng, xem tầng nào có số.

Đó là triệu chứng thứ hai của mục 2: không file nào thiếu, không lỗi nào in ra, chỉ là script đang đọc đúng một file ở sai một node. Và nó chỉ xảy ra khi cgroup có con — nghĩa là nó **không xảy ra** trên máy dev với một container đơn lẻ, mà xảy ra trên runner có cây nhiều tầng. Đúng kiểu bug mà "trên máy tôi chạy được".

Bản sai "đổi tên file là xong" bị phá ở đây, và điều đáng giữ lại là cách nó bị phá: nó sai không phải vì thiếu một dòng trong bảng mapping, mà vì nó mô tả một cái cây bằng một danh sách đường dẫn.

---

## ⏸ Dừng lại — đoán trước #3

**Bạn cần biết máy trước mặt đang dùng v1 hay v2, chỉ được chạy một lệnh, và không có `docker`. Lệnh nào nói đủ?**

```
(a) ls /sys/fs/cgroup — thấy thư mục cpu/ memory/ thì v1, thấy file cpu.max thì v2
(b) stat -fc %T /sys/fs/cgroup — in ra loại filesystem đang mount ở đó
(c) cat /proc/self/cgroup — một dòng thì một cây, nhiều dòng thì nhiều cây
(d) Cả ba đều nói được, nhưng chỉ (c) đồng thời cho biết process của bạn ở ĐÂU
```

---

### 3.7 Biết mình đang ở cây nào

Ba lệnh, và chúng trả lời ba câu hơi khác nhau:

| Lệnh | Trả lời câu | Ghi chú |
|---|---|---|
| `stat -fc %T /sys/fs/cgroup` | mount point đó đang là filesystem loại gì | lệnh đo mà bảng nguồn gắn với dữ kiện "v2 một cây thống nhất" |
| `cat /proc/self/cgroup` | có mấy cây, **và** process của tôi ở đâu trong từng cây | lệnh đo gắn với dữ kiện "v1 mỗi controller mount riêng" |
| `mount \| grep cgroup` | chính xác cái gì được mount ở đâu | lệnh đo gắn với dữ kiện "v2 chỉ có single hierarchy" |

Vì sao trên một máy có thể tồn tại cả hai hình dạng cùng lúc: v1 cho phép mỗi controller mount riêng (mục 3.2), nên "đã mount v2 ở `/sys/fs/cgroup`" và "vẫn còn một controller nào đó mount kiểu v1 ở chỗ khác" không loại trừ nhau về nguyên tắc.

> **Chưa đo.** Bảng nguồn của bài này **không có dòng nào** về chế độ hybrid: nó không nói distro nào mount kiểu gì, không nói controller nào được ưu tiên khi cả hai cùng có mặt, không nói thứ tự. Nên ở đây tôi chỉ nói được điều yếu hơn: **đừng suy ra hình dạng từ tên distro, hãy chạy lệnh.** **Đo bằng:** `mount | grep cgroup` trên từng runner, dán output vào ticket, so hai máy với nhau.

Còn một chỗ nữa quyết định bạn gặp hình dạng nào: **runtime**. Bạn đưa cho nó một config viết theo v1, máy thì chạy v2 — nó không nhất thiết fail:

> **Nguồn — chưa tự đo.** OCI runtime-spec cho phép runtime tự chuyển đổi: *"the runtime MAY attempt a conversion. If the conversion is not possible the runtime MUST generate an error."* ([OCI runtime-spec, config-linux](https://raw.githubusercontent.com/opencontainers/runtime-spec/main/config-linux.md)). **Đo lại:** `runc spec` rồi đọc `config.json`.

Hai chữ đáng nhớ trong câu đó là `MAY` và `MUST`: chuyển đổi là **tuỳ** runtime, còn im lặng bỏ qua khi không chuyển được thì **không được phép**. Nghĩa là nếu config v1 của bạn vẫn có hiệu lực trên máy v2, đó là runtime đã dịch hộ — không phải kernel hiểu cả hai. Chi tiết `config.json` khai gì và ai đọc nó là bài 16.

Tương tự, `docker run --memory` / `--cpus` cuối cùng cũng chỉ là một đường dẫn dài dẫn tới việc ghi vào đúng một file trong cây này; `lessons/engineering/eng-05-docker.md` đã dạy các cờ đó, còn *con số ghi vào thành cái gì* là bài 5 và bài 7.

---

## 4. Bản đồ file: đọc gì để trả lời câu gì

Bảng này là thứ đáng dán lên tường. Nó **không** giải thích ý nghĩa của giá trị — ba bài sau làm việc đó. Ở đây chỉ có: câu hỏi, chỗ để đọc, và bài nào mổ nó.

| Câu hỏi bạn đang có | File trên v2 | File tương ứng trên v1 | Bài mổ nó |
|---|---|---|---|
| CPU của tôi bị chặn ở mức nào | `cpu.max` (một file, hai số) | `cpu.cfs_quota_us` + `cpu.cfs_period_us` | 5 |
| Tôi có đang bị chặn CPU không, bao nhiêu | `cpu.stat` | `cpu.stat` | 5 |
| Khi tranh chấp CPU thì tôi được ưu tiên bao nhiêu | `cpu.weight` | `cpu.shares` | 5 |
| Giới hạn memory cứng của tôi | `memory.max` | `memory.limit_in_bytes` | 7 |
| Tôi đang dùng bao nhiêu memory | `memory.current` | `memory.usage_in_bytes` | 7 |
| Đã có sự kiện gì liên quan giới hạn memory | `memory.events` | `memory.oom_control` | 7 |
| Giới hạn số process | `pids.max` | `pids.max` | — |
| Process nào đang ở cgroup này | `cgroup.procs` | `tasks` | bài này |
| Cgroup này dùng được controller nào | `cgroup.controllers` | (không có khái niệm này) | bài này |

Một quy ước áp cho **cả cây**, nên nói ở đây một lần:

> **Nguồn — chưa tự đo.** Trong cgroup v2: *"All time durations are in microseconds."* ([kernel cgroup-v2 doc](https://docs.kernel.org/admin-guide/cgroup-v2.html)). Mọi số thời gian bạn đọc ra từ file v2 — trong `cpu.max`, trong `cpu.stat` — là microsecond, không phải millisecond và không phải nanosecond.

Nhớ câu này ngay từ bài 4 vì ba bài sau đều tiêu thụ nó, và vì sai đơn vị ở đây thì sai **1000 lần** mà kết quả vẫn trông hợp lý. Đặc biệt: v1 và v2 **không** dùng cùng đơn vị cho mọi thứ — bài 5 sẽ chỉ ra một cặp field cùng nghĩa mà lệch nhau đúng 1000 lần.

Cột "bài mổ nó" là lời hứa, không phải lời từ chối. Ở bài này bạn chỉ cần biết **đi đâu để hỏi**; ba bài sau nói giá trị đọc được có nghĩa gì và vì sao nó làm hệ thống của bạn hỏng theo đúng cái cách nó đang hỏng.

---

## 5. Tính tay

Giải bằng giấy, chỉ dùng luật trong bài.

**Bài 1 — hai cây, hai đường dẫn.** Trên một máy v1, `cat /proc/self/cgroup` của process 4827 in ra ba dòng:

```
11:memory:/system.slice/docker-a3f1c9d0.scope
 6:cpu:/docker/a3f1c9d0
 4:pids:/a3f1c9d0
```

a) Viết đủ đường dẫn tuyệt đối của file trả lời "giới hạn memory cứng của process này".
b) Viết đủ đường dẫn tuyệt đối của file trả lời "giới hạn CPU của process này" (dùng cặp file v1 ở bảng mục 4).
c) Một script lấy đường dẫn từ **dòng đầu tiên** rồi ghép vào mọi controller. Nó sẽ mở file nào cho câu (b), và file đó có tồn tại không?

**Bài 2 — controller khả dụng ở tầng nào.** Cây v2 ba tầng: `/` rồi `/system.slice` rồi `/system.slice/api.scope`. Biết:

- `cgroup.subtree_control` của `/` chứa `cpu memory pids`
- `cgroup.subtree_control` của `/system.slice` chứa `memory`

a) `cat cgroup.controllers` ở `/system.slice` in ra gì?
b) `cat cgroup.controllers` ở `/system.slice/api.scope` in ra gì?
c) Bạn cần `cpu.max` tồn tại trong `api.scope`. Bạn phải ghi gì, vào file nào, ở cgroup nào?
d) Câu (a) và (b) dựa trên một mệnh đề ở mức suy luận trong bài này. Mệnh đề nào, và bạn kiểm nó bằng lệnh gì?

**Bài 3 — đếm lá.** `app.slice` đang chứa 3 process, và bạn cần thêm hai cgroup con `worker` và `cron` với giới hạn memory riêng cho mỗi cái.

a) Tổng cộng bạn phải tạo bao nhiêu cgroup con dưới `app.slice`, và vì sao con số đó không phải 2?
b) Sau khi sắp xếp xong, `cat app.slice/cgroup.procs` in ra mấy dòng?
c) Nếu `app.slice` là **root cgroup** thì câu (a) đổi thành bao nhiêu, và câu trích nào cho phép bạn nói vậy?

**Bài 4 — đơn vị.** Một file trong cây v2 trả về `250000`. Đó là bao nhiêu millisecond, và bạn dựa vào câu nào trong bài để nói thế? Nếu cùng con số đó đọc từ một file v1 có hậu tố `_time`, bạn có được dùng cùng phép đổi không — và bài nào trả lời?

---

## 6. Chuyển giao

Không có đáp án trong bài.

Một job CI build image rồi chạy integration test. Runner được nâng cấp OS, và từ đó test suite chạy chậm gấp đôi nhưng **không** fail, còn script `report-limits.sh` đầu job in ra `memory: max` và `cpu: max` — trước đây nó in số.

1. Trước khi đọc script: hai dòng `max` đó nói gì về **node** mà script đang đọc, so với node mà giới hạn thật được ghi?
2. Bạn chạy `cat /proc/self/cgroup` trong job và được **một** dòng. Điều này loại được giả thuyết nào trong mục 3.6, và để lại giả thuyết nào?
3. Script có một hàm `detect_version()` quyết định v1 hay v2 bằng cách kiểm tra `test -d /sys/fs/cgroup/memory`. Nêu một máy mà hàm này trả lời sai, và nêu lệnh trong mục 3.7 mà bạn dùng thay nó.
4. Job chạy trong container, và container đó lại spawn thêm container con cho test (docker-in-docker). Cây cgroup của job giờ có con. Chuyện này liên quan gì tới ràng buộc ở mục 3.5, và nó giải thích vì sao bug chỉ xuất hiện sau khi cây có nhiều tầng?
5. Đội hạ tầng nói "config của chúng tôi không đổi, vẫn khai limit y như cũ". Câu trích nào ở mục 3.7 cho phép cả hai bên cùng đúng: config không đổi **và** hình dạng cây đã đổi?
6. Test chạy chậm gấp đôi nhưng không fail. Dựa vào bảng mục 4, bạn đọc **file nào trước tiên** để biết đây là chuyện CPU hay chuyện memory, và bạn kỳ vọng thấy gì ở mỗi trường hợp?
7. **Câu khó nhất:** giả sử bạn phải viết một `read_limit()` **đúng trên cả v1, v2, và trên máy có cả hai hình dạng**, chỉ dùng những gì bài này cho. Mô tả thuật toán, rồi chỉ ra **chỗ nó vẫn có thể trả sai** — và nói rõ chỗ sai đó là do thiếu dữ kiện trong nguồn, hay do bản thân cây cgroup không có câu trả lời duy nhất cho câu hỏi bạn đang hỏi.

---

## 7. Tóm tắt

- cgroup không phải "chỗ đặt giới hạn". Nó là một **cây**, và process nằm ở lá của cây đó. Mọi file bạn sẽ đọc ở ba bài sau đều là một file trong cây này.
- v1: *"each controller may be mounted against a separate cgroup filesystem that provides its own hierarchical organization"* — nhiều cây, và **hình dạng mỗi cây không cần giống nhau**.
- Hệ quả của dòng trên: trên v1 câu "process này bị giới hạn bao nhiêu" thiếu chủ ngữ. Phải hỏi theo từng controller, và phải lấy đường dẫn từ đúng dòng của controller đó trong `/proc/self/cgroup`.
- v2: *"Unlike v1, cgroup v2 has only single hierarchy."* và *"all mounted controllers reside in a single unified hierarchy"* — một cây, nên một process có **đúng một** vị trí, và `/proc/self/cgroup` in một dòng.
- `cgroup.controllers` là read-only, *"a list of the controllers that are available in this cgroup"*. `cgroup.subtree_control` là chỗ ghi `+cpu` / `-cpu`, và nó bật controller cho **các con**, không cho chính cgroup đó.
- Ràng buộc hình dạng: *"Non-root cgroups can distribute domain resources to their children only when they don't have any processes of their own."* — và *"processes may reside only in leaf nodes (cgroups that do not themselves contain child cgroups)"*. Phạm vi là **non-root** và chỉ khi *distribute domain resources*; root cgroup được miễn. Đừng phát biểu thành "v2 cấm process ở non-leaf".
- Vì ràng buộc đó, công cụ phải sinh thêm một cgroup lá và đẩy process xuống — những lá trông như dư (kiểu `init.scope`) là cái giá của ràng buộc, không phải rác.
- Bản sai "v2 là v1 với tên file mới" đúng cho một file nên rất dễ tin. Nó vỡ ở hai chỗ mà tên file không chạm tới: **có mấy cây**, và **process được phép nằm ở đâu**. Script chỉ map tên file sẽ chạy đúng tới khi gặp cgroup có con, rồi trả `max` thay vì lỗi.
- Ba lệnh để tự biết mình ở đâu: `stat -fc %T /sys/fs/cgroup`, `cat /proc/self/cgroup`, `mount | grep cgroup`. Đừng suy ra hình dạng cây từ tên distro.
- Trong v2, *"All time durations are in microseconds."* Áp cho cả cây, nên nhớ từ bài này; sai đơn vị ở đây thì sai 1000 lần mà kết quả vẫn trông hợp lý.
- Config v1 vẫn có thể có hiệu lực trên máy v2, nhưng vì runtime dịch hộ: *"the runtime MAY attempt a conversion. If the conversion is not possible the runtime MUST generate an error."* `MAY` chuyển, `MUST` báo lỗi khi không chuyển được — im lặng bỏ qua thì không.
- Bài này chưa đọc một **giá trị** nào. Nó chỉ dựng bản đồ để ba bài sau biết `cat` ở đâu.

→ **Bài 5 — `cpu.max` là quota/period, không phải "số core"**: mở file đầu tiên trong bản đồ vừa dựng. Nó chứa hai số, cả hai tính bằng microsecond, và không số nào là "số core" — từ đó suy ra được vì sao p99 của service nhảy vọt trong khi biểu đồ CPU trung bình còn rất nhiều chỗ trống.
