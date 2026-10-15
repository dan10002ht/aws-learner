# Bài 20 — Việc chạy nền: làm sao biết nó đã xong

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách một câu hỏi mơ hồ "lane xong chưa?" thành **bốn câu hỏi khác nhau** (đã nhận / đang chạy / đã kết thúc / kết quả đúng), và chỉ ra tín hiệu nào trả lời câu nào.
- Giao việc cho một agent nền qua một kênh **không có ack** mà vẫn xác nhận được nó đã nhận, bằng ít nhất hai tín hiệu độc lập và một baseline chụp **trước** khi gửi.
- Viết một vòng chờ có **nonce + deadline** trả đúng một trong ba kết cục `DONE` / `DEAD` / `UNKNOWN`, không bao giờ treo vô hạn, và thu dọn cả nhóm tiến trình worker.
- Phân loại một FAIL của việc nền thành defect thật, artefact môi trường, hoặc bất đồng thiết kế trước khi giao lại.
- Xử lý một lệnh ghi bị timeout như kết quả **UNKNOWN**: đọc lại từ nguồn chuẩn bằng một đường khác, không chạy lại.
- Dựng lại được trên máy mình trường hợp `kill -0` báo "còn sống" cho một tiến trình đã thoát (zombie), và sửa bằng `waitpid(WNOHANG)`.

---

## 2. Tình huống

*Case thực tế, ghép từ một ngày làm việc với lane nền ở ba repo khác nhau; mọi con số là của một lần chạy, không phải benchmark.*

Một dev trong team chạy mô hình Claude điều phối, Codex CLI làm ([[ag-16-hai-ho-model]]). Mỗi lane là một phiên Codex chạy trong một pane terminal riêng; main agent giao việc bằng cách **gõ phím vào pane đó** — kiểu `tmux send-keys`, không phải một lời gọi API.

Vòng 1 của lane xong, verifier trả FAIL kèm ba lỗi. Main agent soạn vòng 2: một đoạn chỉ thị nhiều dòng liệt kê ba lỗi và ràng buộc mới, gửi vào pane, rồi đi làm lane khác.

Ba chuyện xảy ra trong cùng ngày đó, ở ba repo:

1. **Repo A.** Chỉ thị nhiều dòng. TUI hiểu ký tự xuống dòng là Enter, nên chỉ **dòng đầu** được submit thành một turn. Lane làm đúng dòng đầu, báo "đã sửa". Hai lỗi còn lại chưa ai đụng.
2. **Repo B.** Chỉ thị dài, được dán vào ô nhập. Trên màn hình là `› Vò[Pasted Content 2012 chars]` — đoạn dán **nằm trong ô nhập**, chưa bao giờ được gửi. Không có spinner. Dòng cuối pane vẫn là `Worked for 20m`. Main agent đọc dòng đó như "đang làm 20 phút rồi". Thật ra đó là tóm tắt của turn **vòng 1**.
3. **Repo C.** Lane treo: tiến trình Codex ở 0% CPU, working tree sạch, không có report mới. Hai lần gửi liên tiếp không khởi động được gì.

Sau một thời gian chờ, main agent mở `.lanes/report-T13.md`, thấy `verdict: PASS` và chuẩn bị commit. File đó là report **vòng 1** — vẫn nằm nguyên trên đĩa từ trước. Nó không nhắc gì tới ba lỗi vừa giao, và chính chi tiết đó mới là dấu hiệu: message chưa tới, chứ không phải lane không đồng ý.

Không có exception nào. Không có log đỏ. Cả ba lane đều *trông như* đang làm việc.

Cùng tuần đó còn hai sự cố khác hình dạng nhưng cùng họ:

- Một script sửa dữ liệu trên một app SaaS thương mại điện tử bị shell cắt ở khoảng 2 phút, lúc đang chờ webhook xác nhận. Phản xạ đầu tiên là chạy lại. Kiểm riêng thì platform **đã commit** thay đổi từ trước khi shell cắt.
- Một bot điều phối spawn phiên agent bằng `Popen`, rồi cứ vài giây kiểm `os.kill(pid, 0)` để biết phiên xong chưa. Phiên đã xong, nhưng kết quả **25 phút** sau vẫn chưa được đăng. `ps` cho thấy tiến trình con ở trạng thái `<defunct>`.

---

## ⏸ Dừng lại — đoán trước

Trong case Repo B, dev có ba tín hiệu: (a) dòng `Worked for 20m` trên pane, (b) file `report-T13.md` tồn tại với `verdict: PASS`, (c) `pgrep -x codex` trả về một pid. **Tín hiệu nào trong ba cái chứng minh được lane đã bắt đầu làm vòng 2?**

```
(a) chỉ (a) — nó nói rõ thời gian làm việc
(b) chỉ (b) — report là sản phẩm cuối, có report là có việc
(c) (a) và (c) cùng nhau là đủ
(d) không cái nào — cả ba đều đúng y hệt ở thời điểm TRƯỚC khi gửi
```

Đáp án nằm ở mục 3.1.

---

## 3. Cơ chế

### 3.1 Một câu hỏi thật ra là bốn

Khi việc chạy ở chỗ khác — subagent nền, lane Codex, `claude -p` trong cron, job deploy — bạn **đổi quan sát trực tiếp lấy tín hiệu gián tiếp**. Chỗ đắt nằm ở đó, không nằm ở việc chia task.

"Xong chưa?" là bốn câu hỏi tuần tự, mỗi câu cần một loại bằng chứng riêng:

1. **Đã nhận?** Worker đã bắt đầu một lượt mới trên **đúng nội dung tôi vừa gửi** chưa.
2. **Còn chạy?** Tiến trình còn sống và còn tiến triển, hay đã treo, hay đã chết.
3. **Đã kết thúc?** Worker đã kết thúc lượt (turn), không phải "đã ghi một file nào đó".
4. **Đúng không?** Hiệu ứng mong muốn có thật ở nguồn chuẩn — câu này là phần của [[ag-11-gate-xanh-gia]] và [[ag-12-verifier-doc-lap]].

Đáp án câu đoán trước là **(d)**. Phép thử dùng được cho mọi tín hiệu: *tín hiệu này có giống hệt nhau ở thời điểm trước khi tôi gửi không?* Nếu có, nó không chứng minh gì về việc vừa gửi.

- `Worked for 20m` là tóm tắt của turn trước, nó đã ở đó từ trước.
- `report-T13.md` là report vòng 1, cũng đã ở đó.
- `pgrep -x codex` khớp từ trước khi gửi, và còn có thể khớp một binary trùng tên của phiên khác.

Bảng dưới đứng sau phần giải thích vì nó chỉ là tổng kết. Nguồn: kinh nghiệm thực tế qua nhiều vòng loop, không phải đặc tả công cụ.

| Câu hỏi thật | Tín hiệu hay dùng | Vì sao sai | Tín hiệu đáng tin |
|---|---|---|---|
| Đã nhận? | "đã gửi" không lỗi | gửi phím không có mã trả về | thấy **nguyên văn** message ở vùng hội thoại (không phải ô nhập) + spinner đang chạy |
| Còn chạy? | tên cửa sổ, `pgrep -x` | tên đổi không có nghĩa TUI còn sống; `pgrep` khớp trùng tên | CPU > 0 **và** working tree có thay đổi so với baseline |
| Đã kết thúc? | file report **xuất hiện** | report vòng trước vẫn còn | report mang **nonce của vòng này**, hoặc sự kiện kết thúc lượt của công cụ (mục 3.3) |
| Đúng không? | report tự viết, `exit 0` | agent có thể báo lại việc cũ như vừa làm | đếm lại ở nguồn chuẩn, `git diff`, gate có thể đỏ |

Luật này có chiều ngược, và chiều ngược cũng đã gây sai: **đừng kết luận agent bịa chỉ vì mtime cũ**. Trong một case thực tế, grep ra 0 kết quả cộng mtime file cũ hơn lúc giao việc đã dẫn tới kết luận "agent báo cáo việc nó không làm", trong khi lane vẫn đang chạy dở và kết luận đó phải rút lại. Câu hỏi đúng vẫn là "đã kết thúc lượt chưa", không phải "file đã đổi chưa".

### 3.2 Gửi việc qua kênh không có ack

**Ack** (acknowledgement) là một tín hiệu bên nhận gửi lại để xác nhận đã nhận. Một lời gọi HTTP có ack: status code. Gõ phím vào terminal của một ứng dụng khác thì không có gì — giống ném thư qua khe cửa.

Ba cách message chết im lặng trong case ở mục 2 có chung nguyên nhân gốc: **kênh là bàn phím mô phỏng, và TUI diễn giải bàn phím theo luật riêng của nó.**

| Cách chết | Nguyên nhân gốc | Dấu hiệu nhìn thấy |
|---|---|---|
| Chỉ nửa câu tới | `\n` trong message = phím Enter → submit sớm | lane làm theo dòng đầu, phần sau rơi vào turn mới hoặc mất |
| Kẹt trong ô nhập | TUI gom paste dài thành một khối placeholder, cần thêm một Enter | `[Pasted Content N chars]` trong ô nhập, không spinner |
| Lane treo | tiến trình không đọc stdin nữa | 0% CPU, working tree sạch, không report |

Cách chặn bằng cơ chế, không bằng "gửi cẩn thận hơn":

**(1) Một dòng, trỏ vào file.** Viết chỉ thị dài ra file, gửi đúng một dòng ngắn không có xuống dòng:

```
Vong 2: doc .lanes/round2-T13.md va lam theo. Rang buoc da DOI.
```

File chịu được xuống dòng, TUI thì không. Lợi ích thêm: chỉ thị nằm trên đĩa, nên verifier và session sau đọc lại được — đó cũng là lý do [[ag-18-brief-la-shared-state]] đặt brief ra file.

**(2) Xác nhận bằng ít nhất hai tín hiệu độc lập.** Không tín hiệu nào đủ một mình:

1. Đọc lại màn hình pane, thấy **nguyên văn** câu vừa gửi ở vùng hội thoại.
2. Có spinner / trạng thái "working" **hiện tại**. Dòng `Worked for Nm` là tóm tắt turn đã xong, không phải bằng chứng hiện tại.
3. Lane tự nhắc lại phạm vi, hoặc nhắc tên file brief nó vừa đọc.
4. mtime của file nguồn đổi sau mốc gửi.

**(3) Chụp baseline TRƯỚC khi gửi.** Nếu chụp sau, worker nhanh có thể đã ghi xong trước khi bạn có mốc so sánh, và vòng chờ sẽ đợi một thay đổi đã xảy ra rồi. Dưới đây là thí nghiệm đã chạy (macOS, bash 3.2):

```bash
cat > cho-xong.sh <<'EOF'
#!/usr/bin/env bash
# cho-xong.sh <file> <baseline-mtime> <timeout-giây>  → DONE nếu mtime > baseline
f=$1; base=$2; limit=$3
mt() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0; }
for ((i=0; i<limit; i++)); do
  now=$(mt "$f"); (( now > base )) && { echo "DONE (mtime $now > baseline $base)"; exit 0; }
  sleep 1
done
echo "UNKNOWN (hết ${limit}s, mtime vẫn $(mt "$f") <= baseline $base)"; exit 3
EOF
chmod +x cho-xong.sh
mt() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"; }   # Linux || macOS
echo "vòng 1" > report.md; sleep 1

BASE=$(mt report.md)                               # đúng: chụp trước
( sleep 2; echo "vòng 2" > report.md ) &
./cho-xong.sh report.md "$BASE" 5
# DONE (mtime 1791954319 > baseline 1791954316)

( echo "vòng 3" > report.md ) &                    # sai: worker ghi ngay
sleep 1; BASE=$(mt report.md)                      # rồi mới chụp
./cho-xong.sh report.md "$BASE" 4
# UNKNOWN (hết 4s, mtime vẫn 1791954320 <= baseline 1791954320)
```

Không có deadline thì dòng thứ hai là một vòng chờ vĩnh viễn.

mtime còn một điểm yếu: độ phân giải. `stat -c %Y` trả **giây**, nên một lần ghi rơi vào cùng giây với baseline sẽ không bị `>` bắt. Vì vậy mục 3.4 thay mtime bằng nonce.

### 3.3 Ưu tiên kênh có sẵn sự kiện "kết thúc"

Kênh tốt nhất là kênh mà công cụ đã tự định nghĩa "xong". Dữ kiện dưới đây lấy từ docs, kiểm tra ngày viết bài; tính năng đổi nhanh nên hãy đọc lại docs khi dùng.

**Claude Code, chế độ non-interactive** (nguồn: `https://code.claude.com/docs/en/headless`):

- `claude -p "<prompt>"` chạy một lượt rồi thoát. Docs: *"Claude Code exits with code 0 on success and a non-zero code when the run fails"*. Lỗi xảy ra **trong** run (ví dụ thiếu xác thực) được in ra như phần result trên stdout.
- `--output-format json` trả JSON có `result` và `session_id`; `stream-json` trả từng sự kiện một dòng, và *"The last line of the stream is a `result` message"*.
- Bị SIGTERM thì exit code là **143**, và lượt đang chạy *"unfinished and records no result"* — tức là không có result không có nghĩa là thành công.

**Claude Code, lệnh Bash chạy nền** (nguồn: `https://code.claude.com/docs/en/tools-reference`, mục *Background commands*):

- Claude có thể chạy lệnh với `run_in_background: true`; xem và dừng bằng `/tasks`.
- Trong phiên không người trông (`-p`, SDK, CI), lệnh nền có **time limit**: mặc định 30 phút, tối đa 2 giờ; với `-p` nhận prompt dạng text thì mặc định là 10 phút. Hết hạn thì Claude Code dừng lệnh và báo `Background command "<description>" was stopped after reaching its background time limit`.
- **Monitor** tool theo dõi một nguồn sự kiện ở nền; mỗi watch có deadline, mặc định 5 phút, tối đa 30 phút.

**Claude Code, hook** (nguồn: `https://code.claude.com/docs/en/hooks`): có event `Stop` và `SubagentStop`; cả hai nhận trường `last_assistant_message`. Một hook `Stop` vì vậy có thể ghi "lượt đã kết thúc + câu trả lời cuối" ra file thay vì bạn đọc màn hình. Cách viết hook ở [[ag-08-hook-va-chan-bang-cau-hinh]].

**Codex CLI, `codex exec`** (nguồn: `https://developers.openai.com/codex/noninteractive`, chuyển hướng tới trang *Non-interactive mode*):

- `--json` biến stdout thành luồng JSONL, có các sự kiện `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.*`, `error`.
- `-o <path>` / `--output-last-message <path>` ghi message cuối ra file.
- Trang docs **không** ghi giá trị exit code cụ thể, nên đừng xây gate chỉ trên exit code của `codex exec`; hãy đợi `turn.completed` hoặc `turn.failed`.

Hệ quả thực tế: **gõ phím vào TUI là kênh nghèo nhất**. Nếu việc không cần hội thoại nhiều vòng, chạy `claude -p` hoặc `codex exec --json` và đọc sự kiện kết thúc. Chỉ dùng TUI khi cần giữ phiên sống qua nhiều vòng, và khi đó áp dụng đủ mục 3.2.

### 3.4 Nonce: ack mang theo nội dung

**Nonce** là một giá trị dùng đúng một lần, ở đây là một mã vòng như `r-1791954336-97061`. Đặt nó vào dòng đầu brief, và yêu cầu worker chép lại vào dòng đầu report.

Vì sao nonce mạnh hơn mtime:

- Report cũ **không thể** mang nonce mới, nên lỗi "đọc report vòng 1 tưởng vòng 2" bị chặn bằng cấu trúc, không bằng sự chú ý.
- Report mang đúng nonce chứng minh luôn câu hỏi 1 (worker đã đọc **đúng** brief này). Một worker nhận nửa câu thì không có nonce để chép.
- Không phụ thuộc độ phân giải đồng hồ hay việc chụp baseline đúng lúc.

```bash
# cho-nonce.sh <file-report> <nonce> <timeout-giây>
f=$1; nonce=$2; limit=$3
for ((i=0; i<limit; i++)); do
  if [ "$(head -n1 "$f" 2>/dev/null)" = "round: $nonce" ]; then echo "DONE ($nonce)"; exit 0; fi
  sleep 1
done
echo "UNKNOWN (hết ${limit}s, report chưa mang nonce $nonce)"; exit 3
```

Đã chạy thử: report cũ mang `round: r-old`, worker giả ghi nonce mới sau 2 giây → `DONE (r-1791954336-97061)`, exit 0; hỏi một nonce không tồn tại → `UNKNOWN`, exit 3 sau đúng 2 giây.

Chi phí của vòng chờ này, tính thử. Số giây mỗi lần kiểm là giả định minh hoạ, không phải số đo:

```python
timeout_s  = 20 * 60      # deadline 20 phút (lựa chọn của bạn)
interval_s = 5            # kiểm mỗi 5 giây
checks     = timeout_s // interval_s
print(checks)             # 240 lần đọc 1 dòng file -> gần như 0 chi phí
print(interval_s)         # độ trễ phát hiện xấu nhất = 5 s
```

So với việc bắt main agent "nhìn màn hình pane" mỗi lần kiểm: mỗi lần đó là một tool call đưa cả màn hình vào context. Chi phí token cụ thể **chưa đo**; cách đo là chạy cùng một vòng chờ hai kiểu và so `total_cost_usd` trong output `--output-format json` của hai run. Nguyên tắc rút ra không cần số: để **script** chờ, để agent chỉ đọc kết cục.

### 3.5 Một FAIL không phải một loại

Khi việc nền quay về FAIL, phản xạ là giao lại cho lane. Giao lại nhầm loại thì đốt trọn một vòng. Kinh nghiệm thực tế qua nhiều vòng loop cho ba loại:

| Loại | Dấu hiệu | Xử lý |
|---|---|---|
| **Defect thật** | tái hiện được trên **cây đã hợp nhất** | giao lại lane, kèm cách tái hiện |
| **Artefact môi trường** | verifier mô tả một trạng thái không tồn tại ở đâu cả | đưa lane lên ngang nhánh đích rồi chấm lại |
| **Bất đồng thiết kế** | không chỉ ra được hành vi sai, chỉ chê lựa chọn | người quyết, ghi "đóng theo quyết định", **không** ghi PASS |

Ba nguồn artefact môi trường đã gặp đều có cùng hình dạng — **lane và người chấm đang nhìn hai cây khác nhau**:

- lane tạo nhánh từ nhánh của lane trước nên thiếu commit của lane đó → verifier thấy code khuyết;
- worktree mới thiếu file gitignored (env, spec, mockup) → gate đỏ giả (xem [[ag-15-worktree-va-xung-dot]]);
- lane tạo nhánh từ trước một lần tái cấu trúc → nó báo link chết của cây thư mục đã bị thay.

Cách phân xử rẻ nhất: đọc file từ nhánh hợp nhất bằng `git show <nhánh-hợp-nhất>:<đường-dẫn>` thay vì đọc working tree của lane.

Verifier cũng là agent, nên nó cũng sai được và phá được. Hai lần trong hai ngày, ở hai phiên khác nhau, một verifier đã được dặn "không chạy git" vẫn chạy `git checkout --` và xoá thay đổi chưa commit của lane. Lời cấm trong brief là lời nhắc, không phải rào chắn. Thứ có tác dụng là liệt kê **tường minh từng lệnh** bị cấm (`git checkout --`, `git restore`, `git stash`) và bắt `cp` backup trước khi mutate, hoặc chặn ở tầng cấu hình như [[ag-08-hook-va-chan-bang-cau-hinh]]. Trong cùng một phiên đã gặp đủ ba kết cục: verifier đúng còn mình sai; lane đúng còn verifier sai; cả hai cùng sót. Không bên nào thắng mặc định — trọng tài là một dữ kiện thứ ba do bạn tự chạy.

### 3.6 Timeout khi đang ghi: kết quả là UNKNOWN

[[ag-11-gate-xanh-gia]] dạy chiều thuận: lệnh ghi báo OK không chứng minh hiệu ứng đã xảy ra. Chiều ngược nguy hiểm hơn, vì nó dẫn tới **hành động** sai chứ không chỉ kết luận sai:

> Không nhận được xác nhận không chứng minh thao tác chưa xảy ra.

Trong cả hai case thực tế ở mục 2 (script chờ webhook, và một lô resume 25 bản ghi bị shell cắt ở khoảng 2 phút), thứ chết là **kênh báo tin** — vòng chờ, kết nối shell — chứ không phải thao tác. Lệnh ghi đã đi qua mạng, phía kia đã nhận, chỉ đường về bị mất.

Lý thuyết đằng sau là "giao ít nhất một lần" ở [[msg-02-delivery-semantics]]: khi bên gửi không biết bên nhận đã nhận chưa, chạy lại an toàn **chỉ khi** thao tác idempotent ([[ds-21-idempotency]]). Trừ tiền, gửi mail, tạo bản ghi đều thường không idempotent.

Một chi tiết của chính Claude Code làm điều này càng quan trọng. Docs (`tools-reference`, mục *Foreground commands that move to the background*): *"When a foreground command reaches its timeout without finishing, Claude Code moves it to the background instead of stopping it"*, và result ghi rõ `Command did not complete within its 120s timeout and was moved to the background`. Nghĩa là "timeout" của một lệnh Bash trong Claude Code **không giết lệnh** — lệnh ghi vẫn đang chạy. Agent đọc chữ "timeout" rồi chạy lại là ghi hai lần. Ngoại lệ theo docs: bare mode hoặc `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` thì lệnh bị dừng thay vì chuyển nền.

Thí nghiệm dưới đây đã chạy. Server giả ghi xong sau 2 giây, client chỉ chờ 1 giây; `db.txt` đóng vai nguồn chuẩn, mỗi lần ghi nối thêm một dòng (không idempotent):

```bash
#!/usr/bin/env bash
# ghi-cham.sh sai|dung
ghi() {
  ( sleep 2; echo "charge order-42 9.99" >> db.txt ) &
  local w=$!
  sleep 1
  if kill -0 "$w" 2>/dev/null; then echo "client: TIMEOUT sau 1s"; return 124; fi
  echo "client: OK"
}
da_ghi() { grep -c "^charge order-42 " db.txt; }   # đọc lại từ nguồn, KHÔNG qua client ghi

: > db.txt
ghi; rc=$?
if [ "$1" = "sai" ]; then
  [ $rc -ne 0 ] && { echo "-> chạy lại"; ghi; }
else
  [ $rc -ne 0 ] && echo "-> kết quả UNKNOWN; chờ rồi đọc lại nguồn"
  sleep 2
  n=$(da_ghi)
  case $n in
    0) echo "-> nguồn: chưa ghi, an toàn để chạy lại"; ghi ;;
    1) echo "-> nguồn: ĐÃ ghi 1 lần, không chạy lại" ;;
    *) echo "-> nguồn: $n lần — đã trùng, cần dọn tay" ;;
  esac
fi
sleep 3
echo "db.txt: $(da_ghi) dòng charge order-42"
```

```
$ bash ghi-cham.sh sai              $ bash ghi-cham.sh dung
client: TIMEOUT sau 1s              client: TIMEOUT sau 1s
-> chạy lại                         -> kết quả UNKNOWN; chờ rồi đọc lại nguồn
client: TIMEOUT sau 1s              -> nguồn: ĐÃ ghi 1 lần, không chạy lại
db.txt: 2 dòng charge order-42      db.txt: 1 dòng charge order-42
```

Bốn luật rút ra từ case:

1. **Timeout là UNKNOWN, không phải FAIL.** Ghi đúng chữ đó vào output. Lệnh ghi có ba kết cục: đã ghi / chưa ghi / chưa biết.
2. **Bước tiếp theo là đọc, không phải ghi.** Đọc từ nguồn chuẩn bằng **đường khác** đường vừa ghi (ở đây `grep` thẳng vào `db.txt`, không qua `ghi()`).
3. **Lệnh càng nặng càng dễ bị cắt**, và cũng chính lệnh đó chạy lại đắt nhất. Rủi ro dồn về đúng chỗ tệ nhất.
4. **Thiết kế lệnh để chịu được việc bị cắt**: chụp snapshot trước khi ghi; mỗi đơn vị ghi một dòng log có id; tách pha "ghi" khỏi pha "chờ xác nhận", để một lệnh riêng verify lại được sau.

### 3.7 `kill -0` báo "còn sống" cho tiến trình đã thoát

`kill -0 <pid>` (trong Python: `os.kill(pid, 0)`) không gửi tín hiệu gì; nó chỉ hỏi kernel "pid này có tồn tại và tôi có quyền với nó không". Rất nhiều script dùng nó để hỏi "worker còn chạy không". Câu hỏi đó và câu trả lời của `kill -0` **không phải một**.

Khi một tiến trình con thoát, kernel giữ lại một mục nhỏ (pid + exit status) cho tới khi cha gọi `wait`/`waitpid` để đọc. Trong khoảng đó nó là **zombie** — trạng thái `Z`, hiện là `<defunct>`. Pid vẫn tồn tại, nên `kill -0` trả thành công. Phần lý thuyết process ở [[cs-04-operating-systems]].

Thí nghiệm bằng shell — đã chạy trên macOS. Mẹo dựng zombie: tiến trình cha `exec` thành `sleep 30`, mà `sleep` không bao giờ gọi `wait`:

```bash
#!/usr/bin/env bash
( sleep 1 & echo "child=$!" > child.pid; exec sleep 30 ) &
PARENT=$!
sleep 2
CHILD=$(cut -d= -f2 child.pid)
ps -o pid,ppid,stat,command -p "$CHILD"
if kill -0 "$CHILD" 2>/dev/null; then echo "kill -0 -> 0 (\"còn sống\")"; else echo "kill -0 -> khác 0"; fi
kill "$PARENT"; sleep 0.5
if kill -0 "$CHILD" 2>/dev/null; then echo "sau khi cha chết: còn"; else echo "sau khi cha chết: đã được thu dọn"; fi
```

```
  PID  PPID STAT COMMAND
93136 93135 Z    <defunct>
kill -0 -> 0 ("còn sống")
sau khi cha chết: đã được thu dọn
```

Dòng cuối giải thích vì sao lỗi này **trốn được lâu**: khi cha chết hoặc được khởi động lại, đứa con mồ côi được chuyển cho init (launchd trên macOS), và init thu dọn hộ. Ở case bot điều phối, mỗi lần bot bị nạp lại thì zombie biến mất, kết quả được đăng, mọi thứ trông bình thường. Bot càng chạy ổn định (ít bị restart) thì lỗi càng lộ — 25 phút kết quả treo là lúc bot chạy liền một mạch.

Sửa bằng `waitpid(pid, WNOHANG)`: hỏi kernel "con này đã thoát chưa" mà không chặn. Trả `(0, 0)` nghĩa là còn chạy; trả pid nghĩa là đã thoát, và lời gọi đó cũng thu dọn luôn zombie. Đã chạy:

```python
import os, subprocess, time

def con_song_sai(pid):
    try:
        os.kill(pid, 0); return True
    except ProcessLookupError:
        return False

def con_song(pid):
    try:
        done_pid, _ = os.waitpid(pid, os.WNOHANG)
        return done_pid == 0            # (0, 0) = con còn chạy
    except ChildProcessError:           # không phải con của mình (vd. cha đã restart)
        return con_song_sai(pid)

p = subprocess.Popen(["sleep", "1"], start_new_session=True)
time.sleep(2)
print(subprocess.run(["ps","-o","stat=","-p",str(p.pid)],capture_output=True,text=True).stdout.strip())
print("kill0  :", con_song_sai(p.pid))
print("waitpid:", con_song(p.pid))
print("kill0 sau waitpid:", con_song_sai(p.pid))
```

```
Z
kill0  : True
waitpid: False
kill0 sau waitpid: False
```

Nhánh `ChildProcessError` cần có: sau khi cha restart, pid cũ không còn là con của tiến trình mới, `waitpid` ném lỗi, lúc đó mới lùi về `kill -0` (và zombie đã được init dọn nên `kill -0` lại đúng). Trong Python, `Popen.poll()` gọi `waitpid` bên dưới; nếu còn giữ object `Popen` thì dùng `p.poll() is None` là đủ.

Cùng họ với `kill -0` là `pgrep -x <tên>`: nó trả lời "có tiến trình nào tên này không", không phải "worker **của tôi** còn chạy không".

---

## 4. Làm thử

Mục tiêu: dựng một bộ giao việc + chờ không bao giờ treo, trả đúng một trong ba kết cục, và tự dọn sạch tiến trình. Không cần tài khoản agent — worker giả đóng vai agent; có agent thật thì thay ở bước 4.

**Bước 1.** Tạo thư mục thử và worker giả:

```bash
mkdir -p ~/lab-ag20/.lanes && cd ~/lab-ag20
cat > worker-gia.sh <<'EOF'
#!/usr/bin/env bash
# worker-gia.sh <brief> <report>   — giả một agent nền. MODE=ok | treo | chet
brief=$1; report=$2
nonce=$(sed -n 's/^round: //p' "$brief" | head -n1)
case ${MODE:-ok} in
  ok)   sleep 3; printf 'round: %s\nverdict: PASS\n' "$nonce" > "$report" ;;
  treo) sleep 3600 ;;                       # sống nhưng không làm gì
  chet) sleep 1; exit 7 ;;                  # chết giữa chừng, không viết report
esac
EOF
printf 'round: r-cu\nverdict: PASS\n' > .lanes/report.md    # report vòng trước còn sót
```

**Bước 2.** Bộ giao việc:

```bash
cat > giao-viec.sh <<'EOF'
#!/usr/bin/env bash
# giao-viec.sh <timeout-giây> <lệnh-worker...>
# Giao một vòng việc có nonce, chờ report mang đúng nonce, và LUÔN thu dọn worker.
set -u
set -m            # job control: mỗi job nền có process group riêng (pgid = pid)
limit=$1; shift
mkdir -p .lanes
nonce="r-$(date +%s)-$$"
printf 'round: %s\nviệc: sửa lỗi X, ghi report vào .lanes/report.md\n' "$nonce" > .lanes/brief.md
"$@" .lanes/brief.md .lanes/report.md &
w=$!
echo "giao $nonce cho pid $w"
for ((i=0; i<limit; i++)); do
  if [ "$(head -n1 .lanes/report.md 2>/dev/null)" = "round: $nonce" ]; then
    wait "$w"; echo "DONE  worker exit=$?"; exit 0
  fi
  # wait -n không có ở bash 3.2 (macOS) -> hỏi bằng jobs: worker đã thoát chưa?
  if ! jobs -r | grep -q .; then
    wait "$w"; echo "DEAD  worker exit=$? mà không có report vòng $nonce"; exit 4
  fi
  sleep 1
done
kill -- -"$w" 2>/dev/null; wait "$w" 2>/dev/null   # giết cả NHÓM, không chỉ pid
echo "UNKNOWN  hết ${limit}s, đã dừng worker; report hiện tại: $(head -n1 .lanes/report.md 2>/dev/null || echo 'không có')"
exit 3
EOF
chmod +x *.sh
```

Ba chi tiết đáng chú ý: `wait "$w"` là `waitpid` của shell (thu dọn con + lấy exit code); `jobs -r` hỏi "còn job nào đang chạy" thay vì `kill -0`; và `kill -- -"$w"` giết cả process group. Bản đầu tiên của script này dùng `kill "$w"` — worker bash chết, nhưng `sleep 3600` con của nó sống tiếp như tiến trình mồ côi. Đó là lý do có `set -m`.

**Bước 3.** Chạy ba kịch bản:

```bash
for m in ok chet treo; do echo "== MODE=$m"; MODE=$m ./giao-viec.sh 6 ./worker-gia.sh; echo "exit=$?"; done
pgrep -fl "sleep 3600" || echo "(không còn tiến trình sót)"
```

Kết quả đã chạy (macOS, bash 3.2; pid và nonce sẽ khác trên máy bạn):

```
== MODE=ok
giao r-1791954428-2733 cho pid 2736
DONE  worker exit=0
exit=0
== MODE=chet
giao r-1791954431-2917 cho pid 2920
DEAD  worker exit=7 mà không có report vòng r-1791954431-2917
exit=4
== MODE=treo
giao r-1791954433-3041 cho pid 3044
UNKNOWN  hết 6s, đã dừng worker; report hiện tại: round: r-1791954428-2733
exit=3
(không còn tiến trình sót)
```

Để ý dòng `UNKNOWN`: report trên đĩa đang là `PASS` của vòng `ok` trước đó. Bộ chờ đọc nonce nên không bị lừa.

**Bước 4 (tuỳ chọn, cần agent thật — minh hoạ, chưa chạy trong bài).** Thay worker giả bằng một wrapper gọi agent:

```bash
cat > worker-claude.sh <<'EOF'
#!/usr/bin/env bash
brief=$1; report=$2
claude -p "Đọc $brief. Làm theo. Ghi report vào $report; dòng đầu report phải chép NGUYÊN dòng 'round: ...' của brief." \
  --allowedTools "Read,Write" --output-format json > .lanes/run.json
EOF
chmod +x worker-claude.sh
./giao-viec.sh 300 ./worker-claude.sh
```

Với Codex, worker tương đương là `codex exec --json -o .lanes/last.txt "<prompt>"` rồi đợi sự kiện `turn.completed` / `turn.failed` trong luồng JSONL.

**Bước 5.** Chạy thí nghiệm zombie ở mục 3.7 (bản shell và bản Python).

**Tiêu chí "xong" — kiểm được:**

- [ ] Ba kịch bản ra đúng ba exit code khác nhau: `0`, `4`, `3`.
- [ ] Kịch bản `treo` kết thúc trong khoảng `timeout + 1` giây, không treo.
- [ ] `pgrep -fl "sleep 3600"` rỗng sau khi chạy xong.
- [ ] Đổi `kill -- -"$w"` thành `kill "$w"`, chạy lại `treo`, thấy `pgrep` ra một `sleep 3600` mồ côi — thước đo đỏ được ([[ag-11-gate-xanh-gia]]). Rồi `pkill -f "sleep 3600"` và đổi lại.
- [ ] Thí nghiệm zombie in ra `Z` và `kill -0 -> 0` trên máy bạn.

---

## 5. Bẫy thường gặp

### Gửi chỉ thị nhiều dòng vào TUI

Lane làm một nửa yêu cầu, hoặc không làm gì mà vẫn trông bận. Trong TUI, xuống dòng là Enter, còn paste dài thành một placeholder chưa submit. Wrapper gửi nên từ chối message có `\n` hoặc dài quá một dòng, tự chuyển nội dung ra file rồi gửi một dòng trỏ vào file. Khi không cần hội thoại thì dùng hẳn `claude -p` / `codex exec` thay vì TUI.

### Vòng chờ chỉ có một lối ra là "thành công"

Main agent hoặc script "đang chờ" hàng chục phút cho một việc chưa từng bắt đầu. Hoặc chờ được, nhưng report nói PASS mà không nhắc gì tới lỗi vừa giao: "file tồn tại" không phân biệt được vòng, và report cũ vẫn còn đó. Mọi vòng chờ cần ba lối ra `DONE` / `DEAD` / `UNKNOWN` với exit code riêng, và chỉ chấp nhận report có đúng nonce ở dòng đầu (mục 3.4), nên không cần nhớ xoá report cũ. Claude Code tự áp deadline cho lệnh nền trong phiên không người trông và cho Monitor (mục 3.3); script của bạn cũng phải có.

### Chạy lại lệnh ghi sau timeout

Dữ liệu bị ghi hai lần, hoặc cả lô bị dừng và báo "thất bại" trong khi thao tác đã thành công. Gốc của cả hai là coi vắng ack là vắng hiệu ứng; trong Claude Code, lệnh Bash foreground hết timeout còn được **chuyển nền và chạy tiếp** (mục 3.6). Script ghi phải trả mã riêng cho UNKNOWN, và bước sau UNKNOWN chỉ được là lệnh đọc từ nguồn chuẩn. Thao tác có thể bị chạy lại thì cần idempotency key ([[ds-21-idempotency]], [[ag-21-loop-la-he-phan-tan]]).

### Hỏi và dừng worker chỉ bằng pid

Dùng `kill -0` hay `pgrep` để hỏi "worker còn chạy không" thì worker đã xong mà hệ thống vẫn chờ, và lỗi tự biến mất mỗi lần restart bộ điều phối. Zombie vẫn có pid; init dọn hộ khi cha restart nên lỗi chỉ lộ khi hệ ổn định. Cha phải luôn `waitpid(WNOHANG)` / `Popen.poll()` / `wait` trong shell, kèm một gate là test dựng zombie như mục 3.7 và đòi hàm `con_song` trả `False`.

Chiều dừng cũng hỏng theo kiểu tương tự. Sau khi "dừng lane", máy vẫn còn build/test/browser chạy, chiếm CPU/RAM của vòng sau, vì `kill <pid>` chỉ tới một tiến trình còn con của nó bị chuyển cho init và sống tiếp. Khởi chạy worker trong process group riêng (`set -m`, hoặc `start_new_session=True` trong Python), giết cả nhóm, và có gate kiểm "không còn tiến trình sót" sau mỗi vòng.

### Giao lại mọi FAIL cho lane

Lane sửa đi sửa lại một lỗi không tồn tại, hai agent cãi nhau nhiều vòng. FAIL không được phân loại, trong khi lane và verifier đang nhìn hai cây khác nhau. Brief của verifier bắt ghi loại FAIL (`defect` / `env` / `design`) và lệnh tái hiện trên nhánh hợp nhất; FAIL không có lệnh tái hiện thì không được giao lại tự động.

---

## 6. Chuyển giao

Bài này lấp chỗ hổng giữa [[ag-19-vong-lap-nhat-task]] (vòng loop nhặt task → làm → verify → commit) và thực tế là mỗi mũi tên trong vòng đó đi qua một kênh có thể mất tin. Thứ vừa học — nonce, deadline, ba kết cục, đọc lại từ nguồn — là thứ cho phép loop chạy mà **không ai nhìn màn hình lane**.

Bài kế tiếp, [[ag-21-loop-la-he-phan-tan]], gọi đúng tên cái bạn vừa gặp: một loop agent là một hệ phân tán nhỏ. "Không biết bên kia đã nhận chưa" là bài toán at-least-once; "chạy lại có an toàn không" là idempotency; "ai đang giữ task này" là lock/lease. Bài đó dùng lại khung ở đây và nối sang [[msg-02-delivery-semantics]], [[ds-21-idempotency]].

Ở level 7 ([[ag-23-job-dinh-ky-va-bot]]), job chạy lúc bạn ngủ — không còn ai đọc `UNKNOWN` ngay. Nhờ ba kết cục có exit code riêng, job có thể tự quyết: `DONE` thì đi tiếp, `DEAD` thì giao lại, `UNKNOWN` thì chỉ chạy lệnh đọc và đẩy cho người.

---

## 7. Tóm tắt

- "Xong chưa?" là bốn câu: đã nhận / còn chạy / đã kết thúc / đúng không. Mỗi tín hiệu chỉ trả lời một câu; tín hiệu giống hệt nhau ở thời điểm trước khi gửi thì không chứng minh gì.
- Gõ phím vào TUI không có ack và chết im lặng theo ba kiểu. Gửi một dòng trỏ vào file; xác nhận bằng ít nhất hai tín hiệu; chụp baseline **trước** khi gửi.
- Ưu tiên kênh có sự kiện kết thúc: exit code + `result` của `claude -p`, `turn.completed`/`turn.failed` của `codex exec --json`, hook `Stop`/`SubagentStop`, deadline của lệnh nền và Monitor (docs).
- Nonce trong brief, chép lại trong report: report cũ không thể giả làm report mới.
- Mọi vòng chờ có ba lối ra `DONE` / `DEAD` / `UNKNOWN` và luôn dọn cả process group.
- Timeout khi ghi là UNKNOWN: đọc lại từ nguồn chuẩn bằng đường khác, không chạy lại. Trong Claude Code, lệnh Bash hết timeout còn được chuyển nền và chạy tiếp.
- `kill -0` trả "còn sống" cho zombie; dùng `waitpid(WNOHANG)` / `poll()` / `wait`. Lỗi này trốn được vì restart làm init dọn hộ.

→ **Bài 21 — Loop agent là một hệ phân tán nhỏ**: idempotency, retry, lock/lease và mốc "đã xử lý" — những thứ biến `UNKNOWN` ở bài này thành một trạng thái loop tự xử lý được.
