# Bài 23 — Job định kỳ và bot: agent làm việc khi bạn ngủ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chọn đúng **chỗ giữ đồng hồ** cho một job agent (cron/launchd trên máy, scheduled task của Claude Code, routine trên cloud, CI) bằng ba câu hỏi: máy nào phải bật, job đọc được file local không, lỡ giờ thì có chạy bù không.
- Viết một wrapper chạy `claude -p` không người trông: gom input mới theo mốc, input rỗng thì thoát im, gọi agent với quyền hẹp, chốt mốc **sau** khi chạy xong, và thoát khác 0 khi phong bì JSON báo lỗi.
- Giải thích vì sao job học từ nguồn còn sống (thread chat, ticket, mô tả MR) mà chụp một lần sẽ **đóng băng giả thuyết đầu tiên**, rồi thay mốc thời gian bằng dấu vân nội dung.
- Thiết kế một bot đặt trong kênh chat của team theo bốn luật: danh tính riêng, chỉ đọc và trả file nháp, đăng vào nơi việc đang sống, mỗi tin kết thúc bằng một người có một việc.
- Dựng một canary buổi sáng và một kiểm tra "lần chạy trọn vẹn gần nhất" để phát hiện job chết im (mất đăng nhập, máy tắt) trước khi mất một ngày dữ liệu.

---

## 2. Tình huống

Một dev đã có second brain (xem [[ag-22-second-brain]]) và muốn nó tự lớn mà không phải ngồi gõ. Anh dựng một dàn job chạy mỗi tối trên laptop, cộng một bot chạy 24/7 trên một VM:

| Giờ | Job | Làm gì |
|---|---|---|
| 19:00 | digest | đọc transcript các session agent trong ngày, đề xuất note vào `00-inbox/` |
| 19:30 | học từ chat | đọc thread trong kênh support của team, ghi bài học thành đề xuất |
| 20:00 | sync | người duyệt inbox, job đẩy những gì đã duyệt vào wiki |
| 24/7 | bot support | bắt ticket trong kênh chat, điều tra bằng dữ liệu thật, mở MR nháp |

Một tháng sau, cả bốn thứ đều "chạy". Log có, exit code 0, không cảnh báo nào. Rồi lần lượt lộ ra:

1. **Note sai trông như sự thật.** Job học từ chat chụp một thread lúc 09:35 khi thread có 2 tin. 1 giờ 32 phút sau, người viết kết luận **sửa chính tin của mình**, đổi nguyên nhân sang hướng ngược hẳn. Brain giữ bản đầu — kèm ngoặc kép nguyên văn và `source:` trỏ đúng thread, tức là đủ mọi dấu hiệu của một sự thật đã kiểm chứng.
2. **Team không biết tag ai.** Mọi output của bot đăng dưới tài khoản của chính dev. Đồng nghiệp nhắn: "anh tạo bot riêng đi, bọn em không biết ai bot ai người mà tag". Có người còn cảm ơn nhầm bot.
3. **Kênh của bot không ai đọc.** Bot có một kênh tổng kết riêng. Đo lại: 29 ngày, 16 tin, cả 16 cùng một câu "đã bỏ qua N tin", 0 reply, 0 reaction, 1 thành viên (chính dev).
4. **Mọi case fail mà log báo "success".** Sau một lần VM reboot, user OS chạy bot mất đăng nhập. Case kế tiếp vào hàng `failed` với lỗi `claude bao loi: success`, chạy 5 giây, chi phí model 0.
5. **Cuối tuần biến mất.** Laptop tắt tối thứ Sáu, tự bật Chủ nhật rồi nằm ở màn hình đăng nhập tới sáng thứ Hai. Không job nào chạy suốt ba tối, và đăng nhập xong cũng không job nào chạy bù.

Không lỗi nào trong năm lỗi trên là lỗi của model. Tất cả là lỗi của **cách đặt agent vào thời gian và vào kênh chat**. Bài này đi qua từng cơ chế.

*(Case thực tế, ẩn danh; mọi con số lấy từ hệ đó — một hệ, một giai đoạn, không phải benchmark.)*

---

## ⏸ Dừng lại — đoán trước

**Job học từ chat chạy 19:30 mỗi tối. Mốc "đã đọc" của nó là timestamp của tin gốc mỗi thread: thread nào có tin gốc mới hơn mốc thì đọc, xong dời mốc lên. Thread nào sẽ không bao giờ được đọc lại?**

```
(a) Thread không có reply nào
(b) Thread được reply thêm hoặc có tin bị sửa sau lần đọc đầu
(c) Thread của ngày cuối tuần
(d) Không thread nào — mốc theo thời gian là đủ
```

Đáp án ở §3.3.

---

## 3. Cơ chế

### 3.1 Ai giữ đồng hồ: bốn chỗ đặt lịch

Một **job định kỳ** là một lệnh được hệ thống khởi động theo lịch, không cần người gõ. Với agent, lệnh đó thường là một script gọi chế độ không tương tác: `claude -p "<prompt>"` của Claude Code, hoặc `codex exec "<task>"` của Codex (docs: https://code.claude.com/docs/en/headless, https://learn.chatgpt.com/docs/non-interactive-mode). Cách vòng lặp tool của agent vận hành ở [[ag-03-coding-agent-hoat-dong]].

Câu hỏi đầu tiên không phải "prompt viết thế nào" mà là **ai giữ đồng hồ**, vì nó quyết định ba thứ: máy nào phải bật, job thấy được file nào, và lỡ giờ thì sao.

**(a) Bộ lập lịch của hệ điều hành — cron (Linux) và launchd (macOS).** Đồng hồ nằm ở OS, job thấy mọi file local, dùng credential của user OS chạy nó. Điểm khác nhau quyết định nằm ở giờ bị lỡ. Theo `man launchd.plist` (mục `StartCalendarInterval`): *"Unlike cron which skips job invocations when the computer is asleep, launchd will start the job the next time the computer wakes up. If multiple intervals transpire before the computer is woken, those events will be coalesced into one event upon wake from sleep."* Nghĩa là:

- máy **ngủ** qua giờ hẹn: cron bỏ lượt, launchd chạy một lượt khi thức dậy;
- máy **tắt hẳn**, hoặc bật nhưng chưa ai đăng nhập (LaunchAgent của user chưa được nạp): cả hai đều mất lượt — đây là case 5 ở §2 (kinh nghiệm thực tế).

**(b) Scheduled task trong phiên Claude Code — `/loop` và các tool `CronCreate`/`CronList`/`CronDelete`.** Theo docs (https://code.claude.com/docs/en/scheduled-tasks): task gắn với phiên, chỉ chạy khi Claude Code đang mở và rảnh; task lặp **tự hết hạn sau 7 ngày**; không chạy bù lượt lỡ; mỗi phiên tối đa 50 task; giờ theo múi giờ local và có jitter (task hằng ngày có thể trễ tới 30 phút). Hợp với "canh deploy 2 tiếng tới", không hợp với "mỗi tối suốt năm".

**(c) Desktop scheduled task và routine.** Theo docs (https://code.claude.com/docs/en/desktop-scheduled-tasks, https://code.claude.com/docs/en/routines):

- *Desktop task (Local)* chạy trên máy bạn, cần app mở và máy thức. Khi app khởi động hoặc máy thức dậy, nó chạy **đúng một lượt bù** cho giờ lỡ gần nhất trong 7 ngày và bỏ phần cũ hơn. Prompt nằm ở `~/.claude/scheduled-tasks/<task-name>/SKILL.md`.
- *Routine (Cloud)* chạy trên hạ tầng của Anthropic, không cần máy bạn bật, khoảng cách tối thiểu 1 giờ, clone repo mới mỗi lượt (không thấy file local), trigger được bằng lịch, bằng HTTP POST, hoặc bằng sự kiện GitHub. Đang ở research preview.

**(d) CI** — ví dụ GitHub Actions với trigger `schedule`. Đồng hồ ở nhà cung cấp CI, job thấy repo, không thấy máy bạn.

Bảng sau tóm lại phần trên; mọi ô đều đến từ các trang docs và man page đã dẫn:

| | cron / launchd | `/loop` trong phiên | Desktop task | Routine (cloud) |
|---|---|---|---|---|
| Máy phải bật | có | có, phiên phải mở | có, app phải mở | không |
| Thấy file local | có | có | có | không (clone mới) |
| Lỡ giờ khi máy ngủ | cron: bỏ · launchd: chạy 1 lượt khi thức | không chạy bù | 1 lượt bù (trong 7 ngày) | không áp dụng |
| Tự hết hạn | không | 7 ngày | không | không |
| Khoảng tối thiểu | 1 phút | 1 phút | 1 phút | 1 giờ |

Quy tắc chọn rút từ case (kinh nghiệm thực tế): job **đọc dữ liệu chỉ có trên máy bạn** (transcript session agent, file nháp, brain local) phải ở (a) hoặc (c); job **chỉ cần repo + API công khai** đưa lên (c-cloud) hoặc (d) để khỏi phụ thuộc laptop.

Hai cái bẫy cú pháp của (a) mà bài thực hành sẽ đụng:

```cron
# crontab -e  (Linux). Năm trường: phút giờ ngày-tháng tháng thứ
PATH=/usr/local/bin:/usr/bin:/bin
# 19:07 mỗi ngày — tránh phút :00 cho khỏi trùng giờ cao điểm của mọi job khác
7 19 * * * $HOME/agent-jobs/bin/nightly-gitlog >> $HOME/agent-jobs/state/gitlog.log 2>&1
# SAI: dấu % trong crontab bị đổi thành xuống dòng → lệnh bị cắt ở "date +"
# 0 20 * * * echo "chạy" > /tmp/log-$(date +%F).txt
# ĐÚNG: thoát bằng \%
0 20 * * * echo "chạy" > /tmp/log-$(date +\%F).txt
```

Quy tắc `%` lấy từ `man 5 crontab`: *"Percent-signs (%) in the command, unless escaped with backslash (\), will be changed into newline characters."* Còn `PATH` phải khai báo vì cron và launchd chạy job với môi trường tối thiểu, không đọc `.zshrc` — job tìm không thấy `claude`, `node`, `jq` là lỗi đầu tiên gần như ai cũng gặp (kinh nghiệm thực tế).

**Chạy bù khi đăng nhập.** Sau case 5, dev viết thêm một job `RunAtLoad` (nổ mỗi lần user đăng nhập): với từng job, nó tính giờ hẹn gần nhất đã qua, so với mốc "chạy **trọn vẹn** lần cuối"; mốc cũ hơn giờ hẹn thì gọi `launchctl kickstart` cho job đó. Ba chi tiết làm nó đúng (kinh nghiệm thực tế):

- mốc chỉ được chạm khi job chạy hết, nên lượt chết giữa chừng (mất mạng) vẫn bị coi là lỡ;
- gọi qua `launchctl kickstart` thay vì chạy thẳng script, để job nhận đúng env và đúng file log của plist, và launchd không chạy chồng hai bản nếu giờ hẹn thật vừa nổ;
- chờ mạng trước khi chạy (đăng nhập xong wifi chưa chắc đã lên), và chạy theo thứ tự: job sinh đề xuất trước, job sync cuối.

Số lượt mất trong case 5, đếm theo lịch của hệ đó (cách đếm minh hoạ):

```python
jobs_hang_ngay = 5      # digest, học từ chat, gitlog, worklog, sync
toi_bi_lo = 3           # thứ Sáu, thứ Bảy, Chủ nhật
job_tuan = 1
print(jobs_hang_ngay * toi_bi_lo + job_tuan)   # 16 lượt
```

Với launchd không có job chạy bù, 16 lượt đó mất hẳn; với job chạy bù, chúng thành 6 lượt (mỗi job một lượt, vì input của job đã gom theo mốc nên một lượt bù đọc được cả ba ngày).

### 3.2 Hình dạng của một job agent không người trông

Mọi job trong §2 có cùng một khung. Khung này là thứ bạn copy, còn prompt là thứ thay đổi:

```
preflight → gom input MỚI theo mốc → rỗng? thoát im (exit 0) → render prompt từ file
→ gọi agent với quyền hẹp → kiểm phong bì kết quả → ghi đầu ra NHÁP → chốt mốc → chạm "ok"
```

Lý do cho từng bước:

- **Gom theo mốc.** Một **mốc** (watermark) là dấu "đã xử lý tới đây" lưu ngoài agent — một file chứa hash commit cuối, một danh sách dấu vân thread. Không có mốc, mỗi lượt đọc lại toàn bộ lịch sử và chi phí phình theo thời gian. Chọn mốc gì là chuyện của [[ag-21-loop-la-he-phan-tan]]; ở đây chỉ cần biết mốc theo **hash** đúng hơn mốc theo **giờ**.
- **Rỗng là thành công.** Prompt của các job trong case đều có câu: *nếu không có gì đáng ghi, KHÔNG tạo file; đề xuất rỗng là thành công*. Không có luật này, agent luôn tìm ra "điều gì đó" để ghi và inbox phình bằng thứ không ai tra (kinh nghiệm thực tế).
- **Prompt nằm trong file có version.** Wrapper chỉ thay vài biến (`{{TODAY}}`, `{{FILES_BLOCK}}`). Sửa prompt là một commit, đọc lại được vì sao job đổi hành vi.
- **Chốt mốc sau khi agent xong.** Trong job học từ chat, state mới được ghi ra file tạm và chỉ `mv` đè state cũ sau khi `claude -p` trả về. Lượt bị kill giữa đường thì thread quay lại lượt sau thay vì mất im lặng (kinh nghiệm thực tế).
- **Đầu ra là đề xuất, không phải sự thật.** Job ghi vào `00-inbox/`, người duyệt rồi mới chín hoá. Đây là luật "bot chỉ đọc, trả file nháp" ở §3.5 áp cho chính brain.

Về quyền của lượt `claude -p`, docs headless nêu các lựa chọn: `--allowedTools` để tự duyệt từng tool; `--permission-mode acceptEdits` cho phép ghi file và các lệnh filesystem phổ biến (`mkdir`, `touch`, `mv`, `cp`) nhưng shell khác vẫn cần allow; `--permission-mode dontAsk` từ chối mọi thứ sẽ phải hỏi, vẫn cho đọc file trong thư mục làm việc. Từ v2.1.259 có `--permission-prompts none` cho lượt chạy không ai trả lời prompt. Docs cũng nói `--bare` bỏ qua hooks, skills, MCP, CLAUDE.md và được khuyên dùng cho script — nhưng ở chế độ bare, CLI **không đọc** OAuth lẫn `CLAUDE_CODE_OAUTH_TOKEN`, phải dùng `ANTHROPIC_API_KEY`. Job nào cần chính CLAUDE.md của repo (luật ghi brain chẳng hạn) thì cố ý không dùng `--bare`.

Một chi tiết từ script thật (kinh nghiệm thực tế): đặt prompt **ngay sau** `-p`. `--add-dir` nhận nhiều đường dẫn liên tiếp, nên prompt đặt sau nó bị nuốt làm đường dẫn và CLI báo thiếu input.

### 3.3 Nguồn còn sống: capture một lần là đóng băng giả thuyết đầu tiên

Đáp án câu ⏸ là **(b)**.

Mốc kiểu `ts_tin_gốc > mốc` ngầm giả định **một thread chỉ có một trạng thái**. Thread support thật là nơi kết luận đang hình thành:

| Thay đổi sau lần chụp | Mốc theo ts tin gốc có thấy? |
|---|---|
| thêm reply | không — ts tin gốc không đổi |
| sửa tin đã đăng | không — số tin và ts tin cuối cũng không đổi |
| thread được chốt ngày hôm sau | không |

Case 1 ở §2 đi qua đúng hàng thứ hai: tin bị sửa sau 92 phút, nguyên nhân đảo chiều, job không bao giờ quay lại. Tệ hơn, thread càng quan trọng càng bị bàn và sửa nhiều, nên cơ chế này **lọc ngược**: case càng đắt càng dễ ghi sai (kinh nghiệm thực tế). Nguồn chụp còn là bản của một tiến trình khác ghi file thread một lần rồi không làm mới — file nằm im 2 tin trong khi thread thật đã 4 tin.

Cách sửa trong case, bốn phần:

1. **Dấu vân nội dung thay cho thời điểm.** State giữ `ts_gốc → hash(mọi ts + text)`. Hash đổi thì đọc lại. Đây là cách duy nhất bắt được tin bị sửa.
2. **Cửa sổ thăm lại có hạn.** Chỉ thăm lại thread trong 14 ngày, tối đa 12 thread mỗi lượt; cũ hơn thì đóng băng, nếu không chi phí mỗi tối phình theo lịch sử.
3. **Prompt biết mình đang đọc lại.** Thread đọc lại được đánh dấu `doclai`, và prompt dặn: tìm note đang trỏ về thread đó; kết luận đã đổi thì **sửa chính note đó**, giữ một mục ngắn "bản cũ ghi sai gì". Không có dòng này, lượt hai sinh note thứ hai mâu thuẫn với note thứ nhất — người tra gặp cái nào trước tin cái đó.
4. **Đọc thẳng từ API của nguồn**, không đọc bản chụp do tiến trình khác ghi.

Phần dấu vân, viết tối giản:

```python
import hashlib, json

def dau_van(thread):
    # thread = {"ts": "...", "tin": [{"ts": "...", "text": "...", "edited": "..."}]}
    phan = [f'{t["ts"]}|{t.get("edited", "")}|{t["text"]}' for t in thread["tin"]]
    return hashlib.sha256("\n".join(phan).encode()).hexdigest()

def can_doc(thread, state):
    cu = state.get(thread["ts"])
    if cu is None:
        return "moi"
    return "doclai" if cu != dau_van(thread) else None
```

Bài học rộng hơn: áp cho **mọi** nguồn còn sống mà job đang học — thread chat, ticket helpdesk, mô tả MR, biên bản họp. Chỉ thứ thật sự bất biến (file nguồn đã lưu trữ, commit) mới được chụp một lần. Đây cũng là [[ag-20-viec-nen-va-ack]] lặp lại ở tầng tri thức: đọc được một câu không chứng minh câu đó là kết luận.

### 3.4 Bot cần danh tính riêng

**Bot** ở đây là một agent tự đăng tin vào kênh chat của team. Câu hỏi của người nhận luôn là: *nói với ai thì việc chạy tiếp?* Tag nhầm bot là tin rơi vào hư không; tag nhầm người là làm phiền. Khi một tài khoản người gánh N agent, không ai suy ra được điều đó — kể cả người vận hành cũng không biết agent nào đang phụ trách case nào. Case 2 còn có một lần agent xưng hô sai vai, hệ quả trực tiếp của một danh tính gánh nhiều nguồn phát ngôn (kinh nghiệm thực tế).

Chỗ dễ trượt: công cụ mặc định cho agent **mượn danh tính của bạn**. Docs routines nói rõ: hành động qua GitHub hay connector của routine *"appears as you"* — commit và PR mang GitHub user của bạn, tin Slack đi bằng tài khoản Slack bạn đã liên kết (https://code.claude.com/docs/en/routines). Tiện lúc thử, sai lúc chạy thật.

Luật (kinh nghiệm thực tế):

- mỗi agent chạy tự động có **tài khoản bot riêng, tên riêng** (với Slack: một app có bot user và token riêng của nó, không phải token người dùng);
- mỗi tin tự giới thiệu nguồn, ví dụ dòng đầu *"Agent support (máy chạy tự động)"*;
- cần người thật vào cuộc thì bot **tag đích danh** người đó, không để team tự đoán.

### 3.5 Bot chỉ đọc, trả file nháp, người ghi

Case thứ hai trong cùng hệ: một bot nhận yêu cầu chuyển dữ liệu khách hàng từ một hệ thống khác sang app của team. Đồng nghiệp hỏi bot, bot đọc file export, đối chiếu dữ liệu thật, rồi... dừng ở đó. Luật người vận hành đặt: *không được migrate luôn, chỉ read-only rồi trả file migrate hoặc audit, không được update data gì của khách.*

Lý do là chi phí của một lần ghi sai, không phải độ giỏi của model: một lần import sai từng làm 16 đơn bị tính sai giá trước khi ai phát hiện; import lại thứ đã có là tính tiền khách hai lần (kinh nghiệm thực tế). File nháp có người review thì sai còn sửa được, ghi thẳng thì không.

Luật "chỉ đọc" được giữ bằng ba lớp cơ chế, không bằng lời dặn trong prompt (nguyên lý ở [[ag-08-hook-va-chan-bang-cau-hinh]]):

1. **Cổng ở client gọi API** — script truy vấn chặn mọi mutation trước khi gửi đi.
2. **Danh sách tool cấm** khi gọi agent — `--disallowedTools` chặn lệnh đọc khoá, gọi API trực tiếp, script có cờ ghi (`--apply`), CLI cloud, và chính công cụ đăng tin.
3. **Soát transcript trước khi đăng** — một bước quét transcript tìm dấu hiệu ghi; có dấu hiệu thì giữ kết quả lại và báo người.

Và một câu trung thực trong note gốc: ba lớp trên vẫn là rào quy trình, vì khoá nằm trên cùng máy, cùng user OS. **Rào thật là một user OS riêng không đọc được khoá ghi.**

Cùng logic dẫn tới quyết định lớn hơn: bot support 24/7 chạy khoảng một tháng rồi bị **tắt phần ghi** (không nhận case, không mở MR), chỉ giữ job học từ thread mỗi tối, vì MR nháp không còn ai là chủ (kinh nghiệm thực tế). Diễn biến, cái mất và cách `disable` để dễ lùi ở [[ag-25-tu-dong-hoa-co-gioi-han]].

Câu hỏi để tự áp: **đầu ra của bot có người nhận làm đầu vào không?** Không có thì bot đang tạo việc, không phải làm việc.

### 3.6 Kênh chỉ-bot là nơi tin đi để chết

Số đo của case 3:

```python
ngay, tin, noi_dung_khac_nhau, reply, reaction, thanh_vien = 29, 16, 1, 0, 0, 1
print(round(tin / ngay, 2), "tin/ngày")   # 0.55 tin/ngày, toàn bộ là "đã bỏ qua N tin"
```

Bot chạy 29 ngày, xử lý case thật, mở MR thật — và mọi tin vào kênh tổng kết đều là "tôi đã bỏ qua N tin". Nó **chỉ lên tiếng đúng lúc không có gì xảy ra**: im khi có việc, nói khi không có việc.

Kết luận dễ dãi là "tại không ai vào kênh". Nguyên nhân nằm trước đó: một kênh mới là **một nơi mới phải nhớ mở**. Không ai có thói quen mở nó, và tin đầu tiên người ta thấy lại không đòi hành động gì — nên thói quen "bỏ qua kênh này" hình thành ngay từ tin thứ nhất và không bị phá lần nào (kinh nghiệm thực tế). Đối chiếu bot của một đồng nghiệp trong team, vốn không có kênh riêng nào:

| | Kênh riêng của bot | Bot đặt đúng chỗ |
|---|---|---|
| Đăng ở đâu | kênh mới | thread của chính case, nơi người liên quan đang đọc |
| Gửi cho ai | cả kênh, tức không ai | tag đúng một người, mỗi tin một người một việc |
| Khi nào im | không bao giờ | khi chưa có gì cho người quyết |

Ba luật rút ra:

- **Đầu ra đáp xuống nơi việc đã sống**, không phải nơi agent sống: MR thì vào mô tả MR, case thì vào thread case, task thì vào task.
- **Mỗi tin kết thúc bằng một người có một việc.** Tin không có chủ là tin không ai đọc.
- **Cấm tin "không có gì xảy ra"**, không chỉ giảm tần suất. Một báo cáo rỗng dạy người đọc bỏ qua kênh, và dạy xong trong đúng một lần. Đây chính là luật "rỗng thì không tạo file" của §3.2, áp sang kênh chat.

Muốn biết job còn sống thì dùng canary ở §3.7 — tín hiệu sống gửi cho **người vận hành**, không phải cho cả team.

### 3.7 Job chết im: mất đăng nhập, và log nói dối

Case 4 diễn ra thế này. Chạy tay `claude -p` dưới user OS của bot cho ra phong bì JSON:

```json
{"subtype":"success","is_error":true,"api_error_status":null,
 "result":"Not logged in · Please run /login","total_cost_usd":0}
```

Code bắt lỗi của wrapper lại viết:

```js
if (env0.is_error) reject(new Error(`claude bao loi: ${env0.subtype||''} ${env0.api_error_status||''}`));
```

`subtype` và `is_error` là **hai trục khác nhau**: `subtype` nói phiên kết thúc thế nào (bình thường), `is_error` nói nội dung trả về có phải lỗi không. Lý do thật nằm ở trường `result`, mà code không đọc. Docs headless xác nhận hướng này: lỗi xảy ra *bên trong* lượt chạy, *"such as missing authentication"*, được in **làm result trên stdout** (https://code.claude.com/docs/en/headless). Ba chỗ cùng pattern trong wrapper đã được vá cùng lúc; log giờ in thêm nội dung `result` (kinh nghiệm thực tế). Bài [[ag-16-hai-ho-model]] có cùng bẫy ở góc nhìn worker; ở đây nó nặng hơn vì không ai ngồi xem.

**Nhận ra loại lỗi này mà không cần đọc code**: thời gian chạy quá ngắn (5 giây cho việc thường mất vài phút) và chi phí bằng 0. Hai số đó nói "chưa từng gọi model" — lỗi nằm trước khi công việc bắt đầu, ở hạ tầng, không ở nội dung case (kinh nghiệm thực tế). Routines có cảnh báo tương tự ở tầng giao diện: trạng thái xanh trong danh sách lượt chạy *"does not mean the task in your prompt succeeded"* — chỉ nói phiên khởi động và thoát không lỗi hạ tầng.

Nguyên nhân gốc và ba cái bẫy khi sửa (kinh nghiệm thực tế):

- Phiên đăng nhập của user OS chạy bot hết hạn sau reboot; CLI xoá rỗng token khi refresh thất bại. Giả thuyết ban đầu "hai user dùng chung tài khoản nên token bị thu hồi chéo" là **sai** — đơn giản là phiên hết hạn và không ai làm mới.
- `/login` không chạy trong `-p` (docs headless liệt kê nó trong nhóm lệnh chỉ chạy ở giao diện terminal); phải SSH vào máy với TTY thật.
- Đăng nhập xong mà token rơi vào **sai user OS**. Kiểm bằng mtime và kích thước file credential của đúng user chạy job, không tin dòng "Login successful".

Đường sạch hơn cho máy chạy 24/7, theo docs authentication (https://code.claude.com/docs/en/authentication): `claude setup-token` sinh một OAuth token **một năm**, không tự lưu ở đâu cả; đặt nó vào biến `CLAUDE_CODE_OAUTH_TOKEN` trong môi trường của job. Token này chỉ gọi được model (không lấy được claude.ai connector), và không dùng được với `--bare`. Docs cũng nói login thường hiện cảnh báo khi còn 3 ngày hết hạn — cảnh báo đó chỉ hiện trong phiên tương tác, job nền không ai thấy.

Hai cơ chế để lần sau không mất một case mới biết:

- **Canary**: mỗi sáng trước mọi job, một lượt `claude -p` rẻ nhất có thể dưới **đúng user OS chạy job**, kiểm `is_error == false` và `result` đúng như mong đợi.
- **Mốc "ok" + kiểm cũ**: mỗi job chỉ chạm file `<job>.ok` khi chạy trọn vẹn. Một kiểm tra riêng báo động khi file đó cũ hơn chu kỳ cộng biên (26 giờ cho job hằng ngày). Kiểu kiểm "im lặng quá lâu là chết" này bắt được cả case 4 lẫn case 5, vì nó không cần job tự báo lỗi.

---

## 4. Làm thử

Bạn sẽ dựng một job hằng tối đọc `git log` của một repo, nhờ agent tóm thành một **đề xuất** ghi chú, ghi vào inbox nháp. Agent không có quyền ghi; wrapper ghi file. Cần: `git`, `jq`, Claude Code đã đăng nhập.

**Bước 1 — cây thư mục và prompt.**

```bash
mkdir -p ~/agent-jobs/{bin,prompts,state,inbox}
cat > ~/agent-jobs/prompts/gitlog.md <<'EOF'
Bạn đọc git log (kèm --stat) của các commit mới, được đưa qua stdin. Hôm nay là {{TODAY}}.
Viết MỘT đề xuất ghi chú tiếng Việt, tối đa 25 dòng:
- dòng đầu: "# Gitlog {{TODAY}}" ;
- mỗi mạch việc một mục "##": làm gì, vì sao (nếu commit message nói), file chính;
- chỗ nào bạn suy ra mà log không nói thẳng thì ghi "(suy luận)".
Nếu các commit chỉ là việc vặt (format, bump version, typo) thì trả về đúng một chữ: NOTHING
Không dùng tool nào. Không bịa nội dung commit.
EOF
```

**Bước 2 — wrapper.** Lưu vào `~/agent-jobs/bin/nightly-gitlog`, rồi `chmod +x`:

```bash
#!/usr/bin/env bash
# nightly-gitlog — tóm commit mới thành đề xuất ghi chú. Agent chỉ đọc; wrapper ghi.
set -euo pipefail
REPO="${REPO:?đặt REPO=đường dẫn tuyệt đối tới repo}"
JOBS="${JOBS:-$HOME/agent-jobs}"
STATE="$JOBS/state"; INBOX="$JOBS/inbox"; MARK="$STATE/gitlog.last-hash"
TODAY="$(date +%F)"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

command -v claude >/dev/null || { echo "không thấy claude trên PATH" >&2; exit 127; }
command -v jq >/dev/null || { echo "không thấy jq trên PATH" >&2; exit 127; }
mkdir -p "$STATE" "$INBOX"
cd "$REPO"

HEAD_NOW="$(git rev-parse HEAD)"              # chụp TRƯỚC khi chạy agent
if [ -f "$MARK" ]; then
  LOG="$(git log --no-merges --stat "$(cat "$MARK")..$HEAD_NOW")"
else
  LOG="$(git log --no-merges --stat --since='1 day ago' "$HEAD_NOW")"
fi

chot() { [ "$DRY" -eq 1 ] && return 0; echo "$HEAD_NOW" > "$MARK"; touch "$STATE/gitlog.ok"; }

if [ -z "$LOG" ]; then echo "không có commit mới"; chot; exit 0; fi

PROMPT="$(sed "s/{{TODAY}}/$TODAY/g" "$JOBS/prompts/gitlog.md")"
RES="$(printf '%s\n' "$LOG" | claude -p "$PROMPT" --output-format json --permission-mode dontAsk)" || {
  echo "claude thoát khác 0: $(jq -r '.result? // empty' <<<"$RES" 2>/dev/null || echo "$RES")" >&2; exit 1; }

IS_ERR="$(jq -r '.is_error' <<<"$RES")"
TEXT="$(jq -r '.result' <<<"$RES")"
COST="$(jq -r '.total_cost_usd // 0' <<<"$RES")"
if [ "$IS_ERR" != "false" ]; then echo "LỖI: $TEXT (cost=$COST)" >&2; exit 1; fi

echo "cost=$COST"
if [ "$TEXT" = "NOTHING" ]; then echo "không có gì đáng ghi"; chot; exit 0; fi
if [ "$DRY" -eq 1 ]; then printf '%s\n' "$TEXT"; exit 0; fi
printf '%s\n' "$TEXT" > "$INBOX/gitlog-$TODAY.md"
chot
echo "đã ghi $INBOX/gitlog-$TODAY.md"
```

Ba quyết định đáng để ý: mốc là **hash commit** chụp trước khi chạy agent (commit mới đến trong lúc agent chạy sẽ thuộc lượt sau, không bị nuốt); `is_error` được kiểm riêng và luôn in `result`; mốc và file `.ok` chỉ được chạm ở các nhánh thành công.

**Bước 3 — chạy tay ba kịch bản.**

```bash
REPO=/duong/dan/repo ~/agent-jobs/bin/nightly-gitlog --dry-run     # (1) in đề xuất, không ghi gì
REPO=/duong/dan/repo ~/agent-jobs/bin/nightly-gitlog               # (2) ghi inbox + mốc
REPO=/duong/dan/repo ~/agent-jobs/bin/nightly-gitlog               # (3) lần hai: "không có commit mới"
# (4) giả lập mất đăng nhập: thư mục cấu hình trống → không có credential
CLAUDE_CONFIG_DIR="$(mktemp -d)" REPO=/duong/dan/repo ~/agent-jobs/bin/nightly-gitlog; echo "exit=$?"
```

Kịch bản (4) dựa trên docs authentication: credential gắn với `CLAUDE_CONFIG_DIR`, kể cả mục Keychain trên macOS. Trước khi chạy (4), xoá file mốc hoặc tạo một commit để có input. Nếu bạn có `ANTHROPIC_API_KEY` hay `CLAUDE_CODE_OAUTH_TOKEN` trong môi trường thì `unset` trước, vì chúng xếp trên login trong thứ tự ưu tiên.

**Bước 4 — đặt lịch.** macOS: lưu `~/Library/LaunchAgents/dev.example.nightly-gitlog.plist`. Plist không mở rộng `~` hay `$HOME`, nên thay `/ABS/HOME` bằng thư mục home tuyệt đối của bạn:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.example.nightly-gitlog</string>
  <key>ProgramArguments</key>
  <array><string>/ABS/HOME/agent-jobs/bin/nightly-gitlog</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>REPO</key><string>/ABS/HOME/code/my-repo</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>19</integer><key>Minute</key><integer>7</integer></dict>
  <key>StandardOutPath</key><string>/ABS/HOME/agent-jobs/state/gitlog.out.log</string>
  <key>StandardErrorPath</key><string>/ABS/HOME/agent-jobs/state/gitlog.err.log</string>
</dict>
</plist>
```

```bash
P=~/Library/LaunchAgents/dev.example.nightly-gitlog.plist
plutil -lint "$P"                                            # phải in: OK
launchctl bootstrap gui/$(id -u) "$P"
launchctl kickstart -k gui/$(id -u)/dev.example.nightly-gitlog   # chạy ngay một lượt
launchctl print gui/$(id -u)/dev.example.nightly-gitlog | grep -E "state|last exit code"
```

Nếu `claude` nằm ở chỗ khác (`command -v claude` cho biết), thêm thư mục đó vào `PATH` của plist. Linux: dùng dòng crontab ở §3.1, thêm `REPO=...` vào đầu lệnh.

**Bước 5 — canary và kiểm cũ.** Lưu `~/agent-jobs/bin/agent-canary`, đặt lịch 07:50 hằng ngày theo cách ở Bước 4:

```bash
#!/usr/bin/env bash
# agent-canary — chạy dưới ĐÚNG user OS chạy job. Im lặng khi mọi thứ ổn.
set -uo pipefail
STATE="${JOBS:-$HOME/agent-jobs}/state"
bao() {  # macOS: thông báo hệ thống; Linux: thay bằng notify-send hoặc webhook của bạn
  echo "$1" >&2
  command -v osascript >/dev/null && osascript -e "display notification \"$1\" with title \"agent-canary\""
}
RES="$(claude -p "Trả lời đúng một chữ: OK" --output-format json --permission-mode dontAsk 2>&1)"
if [ "$(jq -r '.is_error' <<<"$RES" 2>/dev/null)" != "false" ]; then
  bao "claude -p hỏng: $(jq -r '.result' <<<"$RES" 2>/dev/null || echo "$RES")"
fi
for ok in "$STATE"/*.ok; do
  [ -e "$ok" ] || continue
  [ -n "$(find "$ok" -mmin -1560)" ] || bao "$(basename "$ok" .ok) chưa chạy trọn vẹn quá 26 giờ"
done
```

**Tiêu chí xong** (mỗi dòng kiểm bằng lệnh):

- [ ] Kịch bản (1) in đề xuất và `ls ~/agent-jobs/inbox ~/agent-jobs/state` không có file mới.
- [ ] Kịch bản (2) tạo `inbox/gitlog-<ngày>.md`; `cat state/gitlog.last-hash` bằng `git -C "$REPO" rev-parse HEAD`.
- [ ] Kịch bản (3) in "không có commit mới", inbox không thêm file.
- [ ] Kịch bản (4) thoát `exit=1` và stderr chứa nội dung `result` (dạng "Not logged in…"), **không** chỉ chữ "success"; `state/gitlog.last-hash` không đổi.
- [ ] `launchctl print` (hoặc log cron) cho thấy `last exit code = 0` sau lượt `kickstart`.
- [ ] `touch -t 202001010000 ~/agent-jobs/state/gitlog.ok && ~/agent-jobs/bin/agent-canary` bắn đúng một cảnh báo "gitlog chưa chạy trọn vẹn quá 26 giờ"; chạy lại job xong thì canary im.

Chi phí mỗi lượt: đọc `cost=` trong log sau một tuần, nhân 30 cho chi phí tháng. Để có mốc so sánh: một lượt `--dry-run` thử khi soạn bài này, trên repo có đúng một commit rỗng, báo `total_cost_usd` ≈ 0,18 USD (một lần đo, trên máy có CLAUDE.md cấp user khá dài được nạp vào; theo docs, `total_cost_usd` là ước lượng phía client). Input chỉ vài dòng, nên phần lớn con số đó nhiều khả năng là ngữ cảnh khởi động (suy luận, chưa tách đo), và với job nhỏ, hãy đo lại sau khi cắt bớt thứ được nạp. Con số đúng cho bạn là con số bạn đo.

---

## 5. Bẫy thường gặp

### Chạy tay được, chạy theo lịch thì không

File `.err.log` báo `claude: command not found`, hoặc `node` sai phiên bản. cron và launchd không đọc shell profile và chạy với `PATH` tối thiểu. Khai báo `PATH` tường minh trong crontab/plist, và cho wrapper preflight bằng `command -v` cho từng binary, thoát 127 với thông báo rõ.

Một lỗi đặt lịch khác là dùng `/loop` cho việc cần chạy hằng đêm. Theo docs, scheduled task trong phiên tự hết hạn sau 7 ngày và chỉ chạy khi phiên mở, nên job ngừng âm thầm sau một tuần hoặc ngay khi đóng terminal. Việc dài hạn đặt ở launchd/cron, Desktop task hoặc routine (§3.1); `/loop` chỉ cho việc canh trong vài giờ.

### Học từ nguồn còn sống bằng mốc thời gian

Note trích nguyên văn, `source:` trỏ đúng, mà kết luận đã bị chính tác giả bác. Mốc theo ts tin gốc không thấy reply mới, cũng không thấy tin bị sửa. Dùng dấu vân nội dung, cửa sổ thăm lại có hạn, và cho prompt một nhánh "đọc lại thì sửa note cũ" (§3.3).

Thứ tự chốt mốc đi theo [[ag-21-loop-la-he-phan-tan]]: ghi state mới ra file tạm, chỉ `mv` đè sau khi agent trả về và phong bì sạch, còn giá trị của mốc (hash HEAD, giờ bắt đầu) thì **chụp trước** khi chạy agent. Chụp ở cuối thì input đến trong lúc agent chạy bị bỏ qua. Điểm sau là suy luận từ cách wrapper trong case dùng `touch` ở cuối lượt, chưa đo được lần nào mất dữ liệu vì nó.

### Log báo "success" cho một lượt chưa từng gọi model

Case fail với thông báo vô nghĩa, chạy vài giây, chi phí 0. Wrapper đọc `subtype` hay mã trạng thái, trong khi lỗi nằm ở `result`. Kiểm `is_error`, luôn in `result`, và cảnh báo khi thời gian chạy dưới 10% trung vị hoặc chi phí bằng 0.

Đã `/login` thành công mà lượt sau vẫn "Not logged in" thì thường token đã rơi vào user OS khác user chạy job, hoặc vào `CLAUDE_CONFIG_DIR` khác. Canary phải chạy dưới đúng user của job. Máy 24/7 thì dùng `CLAUDE_CODE_OAUTH_TOKEN` từ `claude setup-token` và ghi ngày hết hạn (một năm) vào lịch.

### "Chỉ đọc" được giữ bằng một câu trong prompt

Một ngày bot "giúp luôn" bằng cách ghi dữ liệu thật vì người yêu cầu nhờ, bởi luật nằm ở chỗ model có thể bỏ qua. Chặn bằng cổng mutation ở client, `--disallowedTools` cho lệnh ghi, và soát transcript trước khi đăng. Ba lớp đó vẫn là rào quy trình; **rào thật là user OS không đọc được khoá ghi**.

### Bot đăng dưới tên người, vào kênh không ai đọc

Đồng nghiệp tag người khi cần bot và ngược lại, có người cảm ơn nhầm bot, vì bot dùng token người dùng hoặc connector liên kết tài khoản cá nhân cho tiện. Mỗi agent cần một bot user riêng, và wrapper đăng tin chỉ giữ token của bot, không có token người.

Kênh riêng cho bot hỏng theo kiểu khác: vài tuần nhiều tin mà 0 reply, 0 reaction. Đầu ra đáp vào nơi agent sống chứ không phải nơi việc sống, và tin không có chủ. Đăng vào thread của việc, tag đúng một người, cấm hẳn tin báo rỗng; tín hiệu sống chuyển sang canary riêng cho người vận hành.

---

## 6. Chuyển giao

- Bài này đứng trên [[ag-22-second-brain]]: brain là nơi các job ghi vào, và luật "đề xuất vào inbox, người duyệt" là phía ghi của brain. Phía đọc — job có thật sự làm brain tốt hơn không — đo bằng bốn số ở bài đó.
- Mốc, idempotency, chạy bù và lock là chủ đề của [[ag-21-loop-la-he-phan-tan]]; ack và cách biết việc nền đã xong là [[ag-20-viec-nen-va-ack]]. Ở đây chúng chỉ đổi đồng hồ: không còn người gõ "chạy đi", nên mọi chỗ cần người nhìn phải thay bằng file mốc và canary.
- Ba lớp "chỉ đọc" là ứng dụng trực tiếp của [[ag-08-hook-va-chan-bang-cau-hinh]]; kết nối bot với hệ ngoài qua MCP ở [[ag-09-mcp]]; lý thuyết agent gọi tool ở [[aiml-05-agents-tools]].
- Bài kế [[ag-24-harness-tu-cai-tien]] dùng đúng khung job ở đây để chạy một retro định kỳ: job đo lại các bản vá cũ, đề xuất **một** patch, người duyệt bằng một cú click. Thứ bài đó bỏ được nhờ bài này: việc **tự nhớ khởi động** retro và việc **tự đi kiểm** job còn sống không.
- Còn câu hỏi "việc nào đáng tự động, việc nào phải dừng ở file nháp" — tần suất, rủi ro, hoàn tác được không — nằm ở [[ag-25-tu-dong-hoa-co-gioi-han]].

---

## 7. Tóm tắt

- Chọn chỗ giữ đồng hồ trước khi viết prompt: cron bỏ lượt khi máy ngủ, launchd chạy một lượt khi thức, cả hai mất lượt khi máy tắt; `/loop` hết hạn sau 7 ngày; Desktop task bù đúng một lượt; routine chạy trên cloud, tối thiểu 1 giờ, không thấy file local.
- Khung job: gom theo mốc (chụp trước) → rỗng thì thoát im → prompt từ file → agent quyền hẹp → kiểm `is_error` và in `result` → ghi nháp → chốt mốc sau cùng.
- Nguồn còn sống (thread, ticket, MR) không được chụp một lần: dùng dấu vân nội dung, cửa sổ thăm lại có hạn, và nhánh "đọc lại thì sửa note cũ".
- Bot cần danh tính riêng, chỉ đọc và trả file nháp, giữ "chỉ đọc" bằng cấu hình và user OS riêng — không bằng lời dặn.
- Đầu ra đáp vào nơi việc đang sống, mỗi tin một người một việc; tin "không có gì" bị cấm.
- Job chết im (mất đăng nhập, máy tắt) chỉ bắt được từ bên ngoài: canary dưới đúng user chạy job, và cảnh báo khi mốc "chạy trọn vẹn" cũ hơn chu kỳ.
- Câu kiểm cuối cho mọi bot: đầu ra của nó có người nhận làm đầu vào không? Không có thì tắt phần ghi, giữ phần học.
