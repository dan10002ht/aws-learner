# Hệ điều hành: process, thread & bộ nhớ

Code của bạn không bao giờ chạy "trực tiếp trên phần cứng". Giữa chương trình và CPU/RAM/ổ đĩa luôn có một lớp trung gian quyền lực tuyệt đối: **operating system (OS)**. Mỗi khi bạn mở file, tạo thread, gọi `malloc`, hay process bị giết vì hết RAM — đó đều là OS ra quyết định. Hiểu OS giúp bạn trả lời những câu hỏi tưởng "huyền bí": *vì sao Lambda chỉ chạy được số request nhất định?*, *vì sao container bị OOMKilled dù máy còn RAM?*, *vì sao thêm thread mà không nhanh hơn?*

Bài này không đào sâu lý thuyết hàn lâm. Mục tiêu là cho bạn một **mô hình tư duy** đủ chính xác để debug và thiết kế.

## OS làm gì? Người gác cổng tài nguyên

Tưởng tượng máy tính là một toà nhà văn phòng, mỗi chương trình là một nhân viên muốn dùng phòng họp (CPU), tủ tài liệu (RAM), máy in (ổ đĩa, mạng). Nếu ai cũng tự do giành lấy thì hỗn loạn. OS là **người quản lý toà nhà**: phân bổ tài nguyên, lập lịch ai dùng gì khi nào, và cách ly để nhân viên này không phá tài liệu của nhân viên kia.

Bốn nhiệm vụ cốt lõi:

| Nhiệm vụ | OS làm gì | Ví dụ bạn gặp |
|---|---|---|
| Process management | Tạo/giết/lập lịch chương trình | `kill -9`, fork process con |
| Memory management | Cấp/thu hồi RAM, ảo hoá địa chỉ | `malloc`, OOM killer |
| File & I/O | Đọc/ghi đĩa, mạng, thiết bị | `open()`, đọc socket |
| Cách ly & bảo vệ | Process này không đụng được process kia | segfault, permission denied |

### Kernel space vs user space

Đây là ranh giới quan trọng nhất. CPU chạy ở hai "chế độ đặc quyền" khác nhau:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>User space vs kernel space và cánh cửa syscall</title>
  <desc>App chạy ở user space đặc quyền thấp, không đụng được phần cứng; muốn ra ngoài phải đi qua một mũi tên syscall duy nhất xuống kernel space đặc quyền cao rồi trả kết quả về.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Kernel space vs user space</text>
  <rect x="16" y="44" width="688" height="92" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="32" y="66" font-size="12.5" font-weight="700" fill="currentColor">USER SPACE — đặc quyền thấp</text>
  <text x="32" y="88" font-size="12" fill="currentColor" opacity="0.85">App của bạn (Node, JVM…), thư viện, runtime</text>
  <rect x="32" y="100" width="320" height="26" rx="7" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="44" y="117" font-size="11" fill="currentColor" opacity="0.9">KHÔNG được đụng trực tiếp phần cứng</text>
  <rect x="16" y="216" width="688" height="92" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="32" y="238" font-size="12.5" font-weight="700" fill="currentColor">KERNEL SPACE — đặc quyền tối cao</text>
  <text x="32" y="260" font-size="12" fill="currentColor" opacity="0.85">Kernel: scheduler, driver, quản lý memory, file system</text>
  <rect x="32" y="272" width="300" height="26" rx="7" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="44" y="289" font-size="11" fill="currentColor" opacity="0.9">ĐƯỢC đụng trực tiếp CPU · RAM · đĩa · mạng</text>
  <g stroke="currentColor" stroke-opacity="0.7" fill="none">
    <path d="M520 136 v74" marker-end="url(#osArrowDn)"/>
    <path d="M600 210 v-74" marker-end="url(#osArrowUp)"/>
  </g>
  <defs>
    <marker id="osArrowDn" markerWidth="9" markerHeight="9" refX="4.5" refY="7" orient="auto"><path d="M0 0 L4.5 7 L9 0" fill="currentColor"/></marker>
    <marker id="osArrowUp" markerWidth="9" markerHeight="9" refX="4.5" refY="2" orient="auto"><path d="M0 9 L4.5 2 L9 9" fill="currentColor"/></marker>
  </defs>
  <rect x="408" y="162" width="120" height="24" rx="12" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="468" y="178" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">syscall (gọi)</text>
  <text x="600" y="178" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">trả kết quả</text>
</svg>

Code của bạn chạy ở **user space** — bị cấm truy cập trực tiếp ổ đĩa, card mạng, hay RAM của process khác. Muốn làm những việc đó, nó phải **xin phép kernel** qua một cơ chế gọi là **syscall (system call)**.

### Syscall: cánh cửa duy nhất xuống kernel

Khi bạn viết `print("hello")`, chuỗi lệnh thật là: runtime → gọi syscall `write()` → CPU chuyển sang kernel mode → kernel đẩy byte ra terminal → trả về user mode.

```python
f = open("data.txt")   # syscall open()
data = f.read()        # syscall read()
```

Mỗi lần chuyển user → kernel → user là một lần **mode switch**, tốn vài trăm nanosecond. Nghe nhỏ, nhưng nếu code của bạn gọi `read()` 1 byte một lần trong vòng lặp triệu lần, chi phí syscall sẽ áp đảo cả công việc thật.

> 💡 Ghi nhớ: Mọi thứ "ra ngoài" chương trình — file, mạng, thời gian hệ thống, tạo thread — đều đi qua syscall. Đó là lý do buffering tồn tại: gom nhiều thao tác nhỏ thành ít syscall lớn.

> ⚠️ Bẫy: Đọc/ghi file không buffer (mỗi dòng một syscall) có thể chậm hơn 10–100 lần so với đọc cả block rồi xử lý trong bộ nhớ. Hầu hết thư viện chuẩn đã buffer sẵn — đừng tự "tối ưu" bằng cách tắt nó.

## Process: chương trình có không gian riêng

**Process** = một bản chạy của chương trình, có **không gian địa chỉ (address space) riêng biệt** do OS cấp. Hai process khác nhau giống hai căn hộ có khoá riêng: process A không thể đọc/ghi RAM của process B (trừ khi cố tình chia sẻ qua cơ chế đặc biệt).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Process cách ly vs Thread chia sẻ bộ nhớ</title>
  <desc>Bên trái: hai process có address space riêng, có tường cách ly không đụng vào nhau. Bên phải: một process với heap và globals chia sẻ giữa các thread, mỗi thread chỉ có stack riêng.</desc>
  <text x="16" y="26" font-size="14" font-weight="700" fill="currentColor">Process: cách ly</text>
  <text x="392" y="26" font-size="14" font-weight="700" fill="currentColor">Thread: chia sẻ trong 1 process</text>
  <rect x="16" y="40" width="150" height="160" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Process A</text>
  <text x="91" y="86" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Code · Data · Heap</text>
  <text x="91" y="106" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Stack · file descr.</text>
  <text x="91" y="180" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">address space riêng</text>
  <rect x="218" y="40" width="150" height="160" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="293" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Process B</text>
  <text x="293" y="86" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Code · Data · Heap</text>
  <text x="293" y="106" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Stack · file descr.</text>
  <text x="293" y="180" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">address space riêng</text>
  <g>
    <line x1="192" y1="40" x2="192" y2="200" stroke="#ef4444" stroke-opacity="0.6" stroke-width="3" stroke-dasharray="6 5"/>
    <text x="192" y="222" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">⛔ tường cách ly</text>
  </g>
  <rect x="392" y="40" width="312" height="160" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="404" y="52" width="288" height="30" rx="7" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="548" y="72" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Heap + Globals (CHIA SẺ)</text>
  <g>
    <rect x="404" y="96" width="88" height="78" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="448" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Thread 1</text>
    <text x="448" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stack</text>
    <text x="448" y="151" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">riêng</text>
    <rect x="504" y="96" width="88" height="78" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="548" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Thread 2</text>
    <text x="548" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stack</text>
    <text x="548" y="151" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">riêng</text>
    <rect x="604" y="96" width="88" height="78" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="648" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Thread 3</text>
    <text x="648" y="138" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stack</text>
    <text x="648" y="151" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">riêng</text>
  </g>
  <text x="548" y="192" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">1 address space — chung heap, chỉ stack riêng</text>
</svg>

Mỗi process sở hữu:

- **Address space riêng** (code, heap, stack — xem bài cs-03).
- **Bảng file descriptor riêng** (file/socket nó đang mở).
- **PID** (process ID) để OS quản lý.

Cách ly này là tính năng an toàn tuyệt vời: nếu process A bị crash (segfault, leak), process B không hề hấn gì. Cái giá phải trả: tạo process **đắt** (OS phải dựng cả address space mới), và process **giao tiếp với nhau khó** — phải qua IPC (pipe, socket, shared memory).

## Thread: nhiều luồng chia sẻ chung bộ nhớ

**Thread** = một luồng thực thi *bên trong* một process. Nhiều thread của cùng process **chia sẻ chung address space, heap, và file descriptor** — chỉ mỗi thread có **stack riêng** (xem minh hoạ cạnh mục Process ở trên).

| | Process | Thread |
|---|---|---|
| Address space | Riêng, cách ly | Chia sẻ trong process |
| Chi phí tạo | Đắt (ms) | Rẻ (µs) |
| Crash 1 cái | Cái khác sống | Có thể kéo cả process chết |
| Giao tiếp | Khó (IPC) | Dễ (chung biến) — nhưng nguy hiểm |

Vì thread chia sẻ heap, hai thread cùng sửa một biến → **race condition**. Đây chính là cội nguồn của bug concurrency (sẽ học sâu ở bài cs-05). Ngược lại, vì process cách ly, mô hình "nhiều process" (như Nginx worker, Gunicorn worker, hay Lambda) thường **an toàn và dễ scale hơn** dù tốn RAM hơn.

> 💡 Ghi nhớ: "Process = cách ly, an toàn, tốn RAM. Thread = chia sẻ, nhanh, nguy hiểm." Chọn cái nào tuỳ bài toán: cần cách ly fault → process; cần share dữ liệu lớn rẻ → thread.

## Context switch & scheduling: ảo giác "đồng thời"

Một CPU core tại một thời điểm chỉ chạy được **một** luồng lệnh. Vậy vì sao máy bạn chạy 200 process "cùng lúc"? Vì OS **luân phiên cực nhanh**: cho process A chạy vài mili-giây, lưu lại trạng thái, chuyển sang B, rồi C... nhanh đến mức bạn tưởng chúng song song. Đây là **concurrency** (xen kẽ), khác **parallelism** (chạy thật song song trên nhiều core).

```
1 core, theo thời gian (mỗi ô ~vài ms):
[ A ][ B ][ C ][ A ][ B ][ A ][ C ] ...
   ▲ context switch giữa mỗi ô
```

**Scheduler** là phần kernel quyết định "đến lượt ai". **Context switch** là hành động lưu trạng thái (registers, program counter, stack pointer) của luồng đang chạy và nạp trạng thái luồng tiếp theo.

Context switch **không miễn phí**:

- Tốn ~1–10 µs để lưu/nạp trạng thái.
- Tệ hơn: làm **lạnh cache CPU** (xem bài cs-02) — dữ liệu của process mới chưa có trong L1/L2, phải nạp lại từ RAM.

> ⚠️ Bẫy: Tạo 10.000 thread cho 10.000 request không làm nhanh hơn — CPU dành phần lớn thời gian context-switch thay vì làm việc thật (gọi là *thrashing*). Đây là lý do mô hình async/event-loop (Node.js, Nginx) hay thread pool giới hạn lại thắng: ít luồng, ít switch, tận dụng cache tốt.

Process/thread không phải lúc nào cũng "chạy". Trạng thái điển hình:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Máy trạng thái của thread: RUNNING, READY, BLOCKED</title>
  <desc>RUNNING và READY chuyển qua lại theo scheduler chọn hoặc hết time slice; RUNNING chờ I/O thì sang BLOCKED, khi I/O xong quay lại READY.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Vòng trạng thái của thread</text>
  <defs>
    <marker id="stArrow" markerWidth="10" markerHeight="10" refX="8" refY="3.2" orient="auto"><path d="M0 0 L8 3.2 L0 6.4 Z" fill="currentColor"/></marker>
  </defs>
  <rect x="280" y="56" width="160" height="56" rx="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="90" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">RUNNING</text>
  <rect x="40" y="56" width="160" height="56" rx="12" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="120" y="90" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">READY</text>
  <rect x="520" y="56" width="160" height="56" rx="12" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="600" y="90" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">BLOCKED</text>
  <g stroke="currentColor" stroke-opacity="0.65" fill="none" stroke-width="1.5">
    <path d="M200 74 H274" marker-end="url(#stArrow)"/>
    <path d="M280 96 H206" marker-end="url(#stArrow)"/>
    <path d="M440 80 H514" marker-end="url(#stArrow)"/>
  </g>
  <text x="237" y="64" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">scheduler chọn</text>
  <text x="243" y="118" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">hết time slice</text>
  <text x="477" y="70" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">chờ I/O (đĩa/mạng)</text>
  <g stroke="currentColor" stroke-opacity="0.65" fill="none" stroke-width="1.5">
    <path d="M600 112 V180 H120 V112" marker-end="url(#stArrow)"/>
  </g>
  <text x="360" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">I/O xong → quay lại READY</text>
</svg>

Khi một thread gọi `read()` từ mạng, nó chuyển sang **BLOCKED**, nhường CPU cho thread khác. Đây là điều khiến concurrency có ý nghĩa: trong lúc A chờ I/O, B làm việc — CPU không ngồi không.

## Virtual memory & paging: mỗi process tưởng mình có cả RAM

Đây là một trong những ảo thuật đẹp nhất của OS. Mỗi process nhìn thấy một **không gian địa chỉ liên tục, khổng lồ, của riêng nó** (ví dụ địa chỉ 0 đến 2^48), *như thể* nó độc chiếm toàn bộ RAM. Thực tế RAM vật lý nhỏ hơn nhiều và bị chia sẻ giữa hàng trăm process.

Cơ chế: OS + phần cứng (MMU) dịch **địa chỉ ảo (virtual address)** mà code dùng → **địa chỉ vật lý (physical address)** thật trong RAM. Việc dịch làm theo từng khối nhỏ gọi là **page** (thường 4 KB).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Virtual memory và paging: page table dịch virtual page sang physical frame</title>
  <desc>Page table dịch virtual page của hai process sang physical frame trong RAM; một số page nằm trên swap; hai process cùng map vào RAM mà không đụng nhau.</desc>
  <text x="16" y="22" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor" transform="translate(80,0)">Virtual (process)</text>
  <text x="360" y="22" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Page table</text>
  <text x="630" y="22" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">RAM vật lý</text>
  <defs>
    <marker id="pgArrow" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0 0 L7.5 3 L0 6 Z" fill="currentColor"/></marker>
  </defs>
  <!-- Process A -->
  <rect x="16" y="40" width="150" height="120" rx="10" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="60" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Process A</text>
  <text x="32" y="84" font-size="11" fill="currentColor" opacity="0.9">page 0</text>
  <text x="32" y="110" font-size="11" fill="currentColor" opacity="0.9">page 1</text>
  <text x="32" y="136" font-size="11" fill="currentColor" opacity="0.9">page 2</text>
  <!-- Process B -->
  <rect x="16" y="220" width="150" height="90" rx="10" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="240" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Process B</text>
  <text x="32" y="266" font-size="11" fill="currentColor" opacity="0.9">page 0</text>
  <!-- Page table -->
  <rect x="296" y="40" width="128" height="270" rx="10" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">dịch địa chỉ (MMU)</text>
  <!-- RAM -->
  <rect x="560" y="40" width="144" height="200" rx="10" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="572" y="56" width="120" height="26" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="632" y="73" font-size="11" text-anchor="middle" fill="currentColor">frame 2</text>
  <rect x="572" y="92" width="120" height="26" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="632" y="109" font-size="11" text-anchor="middle" fill="currentColor">frame 7</text>
  <rect x="572" y="170" width="120" height="26" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="632" y="187" font-size="11" text-anchor="middle" fill="currentColor">frame 9</text>
  <!-- Swap -->
  <rect x="560" y="276" width="144" height="48" rx="10" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="632" y="296" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ổ SWAP (đĩa)</text>
  <text x="632" y="313" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">page chưa nạp</text>
  <!-- arrows virtual -> page table -->
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M166 80 H290" marker-end="url(#pgArrow)"/>
    <path d="M166 106 H290" marker-end="url(#pgArrow)"/>
    <path d="M166 132 H290" marker-end="url(#pgArrow)"/>
    <path d="M166 262 H290" marker-end="url(#pgArrow)"/>
  </g>
  <!-- arrows page table -> RAM / swap -->
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M424 80 C500 80 500 69 554 69" marker-end="url(#pgArrow)"/>
    <path d="M424 106 C500 106 500 105 554 105" marker-end="url(#pgArrow)"/>
    <path d="M424 132 C500 132 500 300 554 300" marker-end="url(#pgArrow)"/>
    <path d="M424 262 C500 262 500 183 554 183" marker-end="url(#pgArrow)"/>
  </g>
  <text x="360" y="346" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">A và B map vào RAM chung mà không đụng nhau (cách ly)</text>
</svg>

Lợi ích:

- **Cách ly:** page table của A không trỏ tới RAM của B → không đụng nhau được.
- **Ảo hoá dung lượng:** tổng RAM "ảo" của tất cả process có thể lớn hơn RAM thật.
- **Swap:** page ít dùng có thể bị đẩy ra ổ đĩa (vùng **swap**), nhường RAM cho process đang cần.

### Page fault & swap: con dao hai lưỡi

Khi code truy cập một page chưa có trong RAM (đang nằm trên swap), CPU phát sinh **page fault**, kernel phải nạp page đó từ đĩa về. RAM truy cập ~100 ns; ổ đĩa (kể cả SSD) chậm hơn hàng nghìn lần.

> ⚠️ Bẫy: Khi RAM gần đầy, OS swap liên tục — gọi là **thrashing**. Triệu chứng: CPU thấp nhưng app chậm kinh khủng, disk I/O cao ngất. Nhiều người tưởng "thiếu CPU" nhưng thật ra là **thiếu RAM**. Trong container, swap thường bị tắt → thay vì chậm, process bị giết thẳng (OOMKilled).

## File descriptor & signal: hai khái niệm hay gặp khi debug

### File descriptor (fd)

Khi process mở file, socket, hay pipe, kernel trả về một **số nguyên nhỏ** gọi là file descriptor — tay cầm để tham chiếu tài nguyên đó. Theo quy ước: `0` = stdin, `1` = stdout, `2` = stderr; từ `3` trở đi là file/socket bạn mở.

```python
f = open("a.txt")        # fd = 3
s = socket.connect(...)  # fd = 4
# Quên đóng → fd rò rỉ, đếm tăng dần
```

Mỗi process có **giới hạn số fd** (xem bằng `ulimit -n`, thường 1024). Quên đóng file/connection → fd cạn → lỗi kinh điển **"Too many open files"**. Đây là một trong những bug production phổ biến nhất với service xử lý nhiều kết nối.

> 💡 Ghi nhớ: Mỗi TCP connection ăn một fd. Service nhận 5.000 kết nối đồng thời cần `ulimit -n` đủ lớn. Luôn dùng connection pool và đóng tài nguyên (`with`, `try-with-resources`, `defer`).

### Signal

**Signal** là cách OS (hoặc process khác) gửi một "thông báo ngắt" tới process. Vài signal hay gặp:

| Signal | Ý nghĩa | Khi nào gặp |
|---|---|---|
| `SIGTERM` (15) | Yêu cầu dừng lịch sự | `kill pid`, container stop, deploy mới |
| `SIGKILL` (9) | Giết ngay, không từ chối được | `kill -9`, OOM killer |
| `SIGINT` (2) | Ngắt từ bàn phím | Bấm Ctrl-C |
| `SIGSEGV` | Truy cập bộ nhớ sai | Segfault |

Điểm quan trọng cho kỹ sư: **graceful shutdown**. Khi orchestrator (Kubernetes, ECS) muốn dừng container, nó gửi `SIGTERM` trước, đợi vài giây, rồi mới `SIGKILL`. App của bạn nên *bắt* `SIGTERM` để đóng connection, flush log, ngừng nhận request mới — nếu không, request đang xử lý dở sẽ bị cắt đứt.

```python
import signal
def on_term(sig, frame):
    drain_connections()   # đóng sạch trước khi chết
signal.signal(signal.SIGTERM, on_term)
```

## Liên hệ thực tế: cloud chạy trên những khái niệm này

- **Lambda concurrency:** Mỗi lần một invocation chạy, AWS dựng một *execution environment* (gần như một process/sandbox cách ly). "Concurrency" = số environment chạy đồng thời. Hiểu process = cách ly giúp bạn hiểu vì sao biến global đôi khi *được* tái dùng (cùng environment "ấm") nhưng *không bao giờ* chia sẻ qua hai invocation song song.
- **Container memory limit:** Container đặt giới hạn RAM (ví dụ `memory: 512Mi` trên ECS/EKS). Khi process trong container vượt giới hạn, **cgroup** của kernel kích hoạt OOM killer → gửi `SIGKILL` → bạn thấy `OOMKilled`. Máy host còn dư RAM cũng không cứu được, vì giới hạn là per-container.
- **fd limit trong container:** Image gọn nhẹ thường có `ulimit -n` mặc định thấp; service nhiều kết nối phải tăng lên.

## Vì sao kỹ sư cần biết

- **Debug OOM:** Khi pod bị `OOMKilled` hoặc Lambda báo lỗi memory, bạn biết phải nhìn *memory limit của container/function*, không phải RAM của host. Bạn hiểu swap bị tắt nên process chết thẳng thay vì chỉ chậm, và biết kiểm tra memory leak (heap phình) thay vì đoán mò.
- **Debug "CPU cao mà app chậm" / "app chậm mà CPU thấp":** CPU thấp + disk I/O cao = thrashing do thiếu RAM (swap/page fault), không phải thiếu CPU. CPU cao mà throughput không tăng = quá nhiều thread → context switch áp đảo. Phân biệt được hai ca này tiết kiệm hàng giờ debug sai hướng.
- **Performance:** Hiểu syscall đắt → biết buffer I/O. Hiểu context switch làm lạnh cache → biết vì sao thread pool giới hạn hay event-loop thắng "một thread mỗi request". Hiểu page → biết vì sao truy cập bộ nhớ tuần tự nhanh hơn ngẫu nhiên.
- **System design:** Chọn process vs thread vs async là quyết định kiến trúc: cần cách ly fault → nhiều process/worker; cần share dữ liệu lớn → thread; nhiều I/O chờ đợi → async. Đặt đúng `memory limit`, `ulimit`, và xử lý `SIGTERM` cho graceful shutdown là khác biệt giữa service production ổn định và service rớt request mỗi lần deploy.
