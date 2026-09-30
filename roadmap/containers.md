# Roadmap — Containers: cơ chế bên dưới

Lộ trình học **cơ chế thật của container**, không phải cách dùng Docker. Đích đến: đọc được
`/sys/fs/cgroup`, `docker save`, `config.json` của runc, `iptables -t nat -S DOCKER` và
**giải thích được** vì sao hệ thống của mình hỏng theo đúng cái cách nó đang hỏng.

Đối tượng: **dev backend đã dùng Docker hằng ngày**. Biết viết Dockerfile, biết
`docker compose up`, đã từng bị `OOMKilled` và đã từng google "docker build cache miss".
Course này không dạy lại một dòng CLI nào.

---

## Vì sao course này tách khỏi ENGINEER, DEVOPS và CLOUDNATIVE

Repo đã có ba chỗ nói về container, và cả ba đều dừng ở cùng một vạch:

| Bài đã có | Dạy gì | Dừng ở đâu |
|---|---|---|
| `engineering/eng-05-docker.md` | Dockerfile, layer cache ở mức "đặt `COPY package.json` lên trước", multi-stage, compose, ECR, `docker logs/exec/inspect` | Nói *làm thế nào*, không nói **cache key tính từ gì**, **byte nằm ở layer nào** |
| `devops/devops-06-container-security.md` | Threat model, Trivy, non-root, cosign, SBOM, supply chain | Nói *phải làm gì*, không nói **user namespace map UID thế nào** |
| `cloudnative/` (18 bài) | Toàn bộ Kubernetes: Pod, requests/limits, scheduling, RBAC | `cn-11` nói "vượt limit → cgroup throttle" — **một dòng**. Course này là 4 bài cho đúng dòng đó |
| `foundations/intro-01-virtualization.md` | VM vs container ở mức ẩn dụ | Gọi namespace/cgroup là "phép màu kỹ thuật" |

Ranh giới cứng của course này:

- **Không lặp CLI/Dockerfile/compose.** Chỗ nào cần thì nhắc một câu và trỏ sang `eng-05`.
- **Không lặp orchestration.** CNI, Pod, kubelet chỉ xuất hiện ở mức "ai gọi cái gì", trỏ sang `cloudnative/`.
- **Không lặp SBOM/signing.** Đã đủ ở `devops-06` và `security/sec-06-supply-chain.md`.

Điều course này đảo lại so với ba bài trên: **container không phải một thứ**. Kernel Linux
không có object nào tên là "container". Có process, có namespace, có cgroup, có mount. Docker
là một chương trình sắp xếp bốn thứ đó lại. Mọi hành vi "kỳ lạ" của container đều suy ra được
từ chỗ này — và bài 1 bắt đầu từ đúng chỗ đó.

---

## Ghi chú quan trọng về con số trong course này

Toàn bộ số trong các bài **lấy từ nguồn cấp một** — kernel documentation, OCI spec,
Docker docs, man pages — và **ghi rõ nguồn ngay tại chỗ dùng**. Chưa có con số nào được đo
lại trên máy của người học.

Mỗi chỗ có số đều kèm **lệnh để tự đo lại**. Khi có môi trường Linux (colima / VM / CI runner),
chạy lại các lệnh đó và cập nhật bài — chỗ nào lệch so với spec thì chỗ đó là bài học thật.

Quy ước trình bày trong bài:

> **Nguồn số — chưa tự đo.** Số ở đoạn này lấy từ `<nguồn>`.
> Đo lại bằng: `<lệnh>`.

---

## Chương 1 — Container không phải một cái máy (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 1 | Kernel không biết "container" là gì | Cùng một process có hai PID: một trong container, một trên host — và đó không phải bug; vì sao container "khởi động" nhanh hơn VM vì nó **không boot gì cả**; bốn thành phần Docker lắp lại; cái gì *không* được ảo hoá (kernel dùng chung, `/proc` không ảo hoá) |
| 2 | Tám namespace, và tự dựng container bằng `unshare` | Danh sách đủ (mnt/uts/ipc/pid/net/user/cgroup/time), không phải "sáu"; `/proc/<pid>/ns/*` là symlink chứa **inode** — so inode để biết hai process có cùng namespace; vì sao `unshare -p` phải đi kèm `-f`; PID 1 trong namespace không giống PID 1 bình thường |
| 3 | mount namespace, `pivot_root` và rootfs | Vì sao container "thấy" filesystem khác mà không copy gì; `pivot_root` khác `chroot` ở đâu và vì sao runtime dùng `pivot_root`; mount propagation (`shared`/`private`/`slave`) và vì sao bind-mount đôi khi rò sang host |

## Chương 2 — Tài nguyên, và những lời nói dối (4 bài)

Chương ăn nhiều nhất trong thực tế. Bốn bài này giải thích gần hết các sự cố container ở production.

| # | Bài | Nội dung lõi |
|---|---|---|
| 4 | cgroup v1 vs v2: đọc `/sys/fs/cgroup` | v1 nhiều hierarchy rời rạc vs v2 một cây thống nhất; `cgroup.controllers` / `cgroup.subtree_control`; ràng buộc "no internal process"; vì sao câu trả lời cho cùng một câu hỏi nằm ở hai chỗ khác nhau tuỳ máy |
| 5 | `cpu.max` là quota/period, không phải "số core" | `cpu.max = "200000 100000"` nghĩa là gì; `cpu.stat.nr_throttled` và `throttled_usec`; **vì sao p99 tăng vọt khi CPU average mới 40%** — process bị dừng tới hết period; `cpu.weight` khác `cpu.max` ở chỗ nào; `cpu.max.burst` |
| 6 | Vì sao container thấy 64 CPU khi limit là 2 | `/proc/cpuinfo` và `sysconf(_SC_NPROCESSORS_ONLN)` **không được namespace hoá**; Go `runtime.NumCPU` / `GOMAXPROCS`, JVM container awareness, Node `UV_THREADPOOL_SIZE`, `nproc`; hệ quả: quá nhiều OS thread trên một cgroup bị throttle → nghịch lý "thêm worker làm chậm đi" |
| 7 | `OOMKilled` trong khi `top` báo còn RAM | `memory.max` tính cả **page cache**, không chỉ RSS; `memory.current` vs `memory.stat{anon,file}`; `memory.high` throttle reclaim còn `memory.max` mới kill; `memory.events.oom_kill`; exit code 137 = 128+9; vì sao `free` trong container báo số của host |

## Chương 3 — Image: byte nằm ở đâu (5 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 8 | overlayfs: lowerdir, upperdir, và giá của copy-up | Một mount lệnh dựng được cả rootfs container; **copy-up copy CẢ file lên upperdir khi bạn ghi một byte** — hệ quả với file lớn và với DB; whiteout là character device 0/0; opaque dir; layout `/var/lib/docker/overlay2/<id>/{diff,link,lower,merged,work}` và vì sao cần thư mục `l/` symlink ngắn |
| 9 | Vì sao image 1,2 GB, và byte nào ở layer nào | `docker save` bung tar → đối chiếu từng blob với `docker history`; `empty_layer`; **xoá file ở layer sau không làm image nhỏ lại** vì layer trước vẫn còn nguyên byte; `diff_ids` (uncompressed) khác `layers[].digest` (compressed) — chỗ bị nói sai nhiều nhất |
| 10 | OCI image spec: index → manifest → config → layers | Descriptor (`mediaType`/`digest`/`size`); digest tính trên **bytes của JSON** nên sửa một khoảng trắng là đổi digest; tag là con trỏ có thể dời, digest thì không → vì sao pin theo digest; image index & multi-arch, client chọn manifest theo `platform` |
| 11 | Registry protocol: vì sao push nhanh mà pull chậm | `HEAD /v2/<name>/blobs/<digest>` trước khi upload → layer trùng không gửi lại; cross-repo blob mount; content-addressable nghĩa là dedup ở mức blob; vì sao đổi một dòng code chỉ đẩy một layer nhưng CI vẫn pull cả base image |
| 12 | Storage driver, volume, và writable layer | Writable layer là upperdir của overlay, không phải disk riêng; volume vs bind mount vs tmpfs; vì sao ghi nhiều vào writable layer là lựa chọn sai (copy-up + overlay overhead); `docker ps -s` cột `SIZE` vs `virtual`; logging driver `json-file` và chuyện log ăn hết disk |

## Chương 4 — Build: cache key là gì (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 13 | BuildKit là một DAG, không phải chuỗi lệnh | LLB; stage nào không ai cần thì **không build**; step độc lập chạy song song; vì sao `--progress=plain` cho thấy thứ tự khác Dockerfile; `docker build` cũ (legacy builder) khác ở đâu |
| 14 | Cache miss dù code không đổi | Cache key của `RUN` = chuỗi lệnh + key của parent (nội dung file **không** tính) vs `COPY`/`ADD` = checksum nội dung; metadata nào tính, mtime có tính hay không; `ARG` làm invalid từ đâu trở xuống; `--mount=type=cache` cứu chỗ nào; `--cache-from`/`--cache-to`, `mode=min` vs `mode=max` và vì sao CI mãi không hit cache |
| 15 | Image nhỏ: byte nào biến mất và vì sao | Đi ngược từ full base → slim → alpine → distroless → scratch, mỗi bước bỏ đúng cái gì; static vs dynamic link; **musl khác glibc nên binary build trên Debian chạy trên Alpine sẽ chết**; cái giá của scratch (không shell, không CA cert, không tz, không `nsswitch`) |

## Chương 5 — Runtime stack: ai thật sự chạy container (3 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 16 | OCI runtime spec và `runc` chạy tay | Bundle = `config.json` + `rootfs/`; lifecycle create/start/kill/delete; `config.json` khai báo namespace, capability, resource, mount — **toàn bộ những gì chương 1–2 dạy đều nằm trong một file JSON**; chạy container không cần Docker |
| 17 | containerd, shim, dockerd: ai giữ process | Chuỗi dockerd → containerd → shim → runc; runc **thoát ngay sau khi container start**, shim là cái ở lại; vì sao container sống sót khi containerd restart; `docker` vs `nerdctl` vs `ctr` nói chuyện với ai |
| 18 | Rootless & user namespace | `uid_map`/`gid_map` ba cột; `/etc/subuid` cấp dải UID cho mỗi user; **vì sao file bind-mount hiện owner lạ** và cách đọc ra owner thật; capability trong user namespace là capability giả; giới hạn thật của rootless (port thấp, cgroup delegation, ping) |

## Chương 6 — Mạng: veth, bridge, DNAT (2 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 19 | veth pair + bridge: dựng mạng container bằng `ip link` | veth là cặp — cắm một đầu vào netns, đầu kia vào bridge; `docker0`; default bridge vs user-defined bridge (**DNS theo tên service chỉ có ở user-defined**); vì sao hai container cùng bridge gọi nhau được mà không cần `-p` |
| 20 | Port publishing là DNAT, và nó đi trước firewall | `-p 8080:80` sinh rule ở table `nat` chain `DOCKER`; **rule của Docker được duyệt trước ufw/firewalld nên `-p` mở cổng ra Internet dù firewall đang chặn**; `-p 127.0.0.1:8080:80` khác `-p 8080:80`; iptables vs nftables; CNI ở mức "ai gọi ai" rồi trỏ sang `cloudnative/` |

## Chương 7 — Khi nó vỡ (2 bài)

| # | Bài | Nội dung lõi |
|---|---|---|
| 21 | Container không start được: đọc lỗi cho đúng | Phân loại theo tầng: `exec format error` (sai kiến trúc) · `no such file or directory` khi file **có thật** (thiếu dynamic linker — musl vs glibc) · `permission denied` (non-root + file mode) · `command not found` vì không có shell (distroless) · exit code nói gì (0/1/125/126/127/137/139/143); vì sao `docker logs` trống và log đã đi đâu |
| 22 | "Chạy được trên máy tôi mà crash trên CI" | Tổng hợp cả course thành một cây quyết định: kiến trúc image · cgroup v1 vs v2 trên runner · số CPU runner thấy vs limit · `/dev/shm` mặc định nhỏ · ulimit/nofile khác nhau · cache layer khác nhau · kernel feature thiếu · seccomp profile khác. Mỗi nhánh trỏ về đúng bài đã giải thích cơ chế |

---

## Sau course này

- **Đo lại toàn bộ.** Dựng một VM Linux, chạy hết các lệnh "đo lại" rải trong 22 bài, đối chiếu
  với số lấy từ spec. Chỗ lệch là chỗ đáng viết thành ghi chú riêng.
- Sang `cloudnative/` đọc lại `cn-04` (Pod) và `cn-11` (scheduling) — hai bài đó sẽ đọc rất khác
  khi đã biết cgroup và namespace.
- Sang `devops-06` + `security/sec-06` cho phần supply chain, giờ đã hiểu digest và layer.
