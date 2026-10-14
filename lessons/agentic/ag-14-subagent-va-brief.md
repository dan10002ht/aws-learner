# Bài 14 — Subagent: giao việc như giao cho đồng nghiệp

## 1. Mục tiêu

Sau bài này bạn có thể:

- Quyết định một việc **có nên giao subagent hay không** bằng ba câu hỏi kiểm được (việc có độc lập không, output có dài không, kết quả có tóm lại được không), và chỉ ra một trường hợp phải làm ở phiên chính.
- Viết một **brief dùng chung ra file** đủ để một agent không biết gì về phiên của bạn làm đúng việc, gồm bảy phần: bối cảnh, đọc trước, khuôn, giữ nguyên, số liệu đã kiểm, ràng buộc ghi file, báo cáo cuối.
- Chia vai giữa **main agent** (phiên điều phối) và subagent: main giữ research + brief + verify + commit, subagent chỉ ghi đúng file được giao.
- Tính trước tác động của **trần agent đồng thời** và của việc để mỗi agent tự chạy gate toàn repo, rồi đặt gate nặng về đúng chỗ.
- Mở mỗi lượt bằng việc **đọc lại mọi worker đã giao** và kết thúc mỗi lượt bằng một khối tiến độ tổng.

---

## 2. Tình huống

Case thực tế của chính repo học tập này (một lần chạy, không phải benchmark).

Một người học phàn nàn đúng **một** mục trong bài Kinesis của course SAA-C03: *"thông lượng cao là thông lượng thế nào chứ???"*. Bài viết kiểu cheat-sheet: toàn tính từ và keyword, không cơ chế, không con số.

Sửa một mục thì dễ. Nhưng nếu một mục bị vậy thì 30 bài còn lại nhiều khả năng cũng bị. Phiên điều phối đi bốn bước:

1. **Biến lời phàn nàn thành rubric đo được.** Viết một brief audit (~4 KB) định nghĩa bảy mã lỗi độ rõ: `VAGUE`, `JARGON`, `NO-MECHANISM`, `NO-EXAMPLE`, `TOO-TERSE`, `ORDER`, `STALE`. Giao agent audit đọc cả 31 bài, chỉ đọc, không sửa. Kết quả gộp lại thành một file audit ~96 KB.
2. **Làm một bản mẫu bằng tay.** Viết lại §2 của bài Kinesis tới mức chấp nhận được. Từ đây, "dễ hiểu" không còn là một tính từ — nó là một file cụ thể để bắt chước.
3. **Viết brief viết lại ra file** (~5,9 KB): đọc gì, khuôn mỗi section, giữ nguyên gì, số nào đã kiểm sẵn, chỉ được ghi file nào, báo cáo gì.
4. **Fan-out**: mỗi bài một agent, 31 agent.

Diễn biến không suôn sẻ:

- Agent thứ 21 **không spawn được**. Phiên chỉ chạy được 20 subagent cùng lúc, nên 11 bài còn lại phải giao nhỏ giọt khi có slot trống.
- Brief đợt đầu bảo mỗi agent xong việc thì chạy gate kiểm SVG **toàn repo**. Hai mươi agent cùng chạy gate đó trên một máy: gate chậm hẳn, và agent đã viết xong nhưng còn chờ gate thì **vẫn giữ slot** — 11 bài kia càng phải chờ lâu. Đợt sau, brief được sửa: agent chỉ kiểm khối SVG của bài mình, gate toàn repo do phiên chính chạy một lần ở cuối.
- Một agent tự thêm wikilink `[[11-kms]]` — slug lúc đó **không có trong registry bài học** của web. Văn bản đọc rất hợp lý; chỉ script kiểm link bắt được.
- Agent sửa được hàng loạt số lỗi thời nhờ brief buộc dẫn docs AWS. Nhưng phiên chính vẫn tự đối chiếu lại vài dữ kiện với docs, và vẫn phát hiện số cũ **còn sót trong nhãn SVG** — chỗ không phép quét văn xuôi nào với tới.

Kết quả commit: 31 file bài học, `+10885 / −2258` dòng; riêng `web/data/lessons.ts` (+32 dòng, đăng ký bài lên web) do phiên chính sửa, không agent nào được đụng.

---

## ⏸ Dừng lại — đoán trước

Chọn một đáp án trước khi đọc tiếp.

**Bạn có 31 việc rời nhau, trần là 20 subagent đồng thời. Mỗi agent khi viết xong sẽ chạy một gate quét toàn repo, mất vài phút. Chuyện gì xảy ra với 11 việc còn lại?**

```
(a) Claude Code tự xếp hàng 11 việc, chạy khi có slot — không ảnh hưởng gì
(b) Lệnh spawn thứ 21 báo lỗi; slot chỉ được trả khi agent kết thúc hẳn, kể cả lúc nó đang
    chờ gate; và 20 gate chạy cùng lúc trên một máy làm từng gate chậm đi
(c) Agent thứ 21 chạy được nhưng chậm hơn vì phải chia CPU
(d) 20 agent đầu bị huỷ để nhường chỗ
```

Đáp án ở §3.5.

---

## 3. Cơ chế

### 3.1 Subagent là gì, và nó biết gì lúc bắt đầu

**Subagent** là một agent con được phiên chính sinh ra để làm một việc, chạy trong **context window riêng** (context window: lượng token model nhìn thấy được trong một lần gọi — xem [[ag-04-context-va-file-huong-dan]]), rồi trả về một bản tóm tắt.

Theo docs Claude Code ([sub-agents](https://code.claude.com/docs/en/sub-agents)):

- *"Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions."*
- *"Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read."*
- Khi xong, chỉ phần tóm tắt trả về phiên chính; các bước trung gian (file đã đọc, log, kết quả tìm kiếm) nằm lại trong context của subagent.
- Subagent tự định nghĩa và hầu hết built-in **có nạp CLAUDE.md** của mọi cấp; riêng Explore và Plan khởi động **không** có CLAUDE.md để chạy nhanh và rẻ.

Câu thứ hai là câu quan trọng nhất của cả bài. Phiên chính có thể đã mất một giờ đọc code, hỏi bạn, thử ba hướng sai. Subagent **không thấy gì trong đó**. Thứ duy nhất nối hai bên là cái prompt bạn đưa — và những file prompt đó trỏ tới. Đó là lý do bài này đặt "subagent" và "brief" chung một tiêu đề.

Có một biến thể docs gọi là **fork**: subagent kế thừa toàn bộ hội thoại thay vì bắt đầu trắng. Docs mô tả nó *"drops the input isolation"* — bạn không phải giải thích lại, nhưng cũng mất luôn context sạch. Với việc fan-out N bản giống nhau thì subagent thường + brief file là lựa chọn mặc định; fork hợp với một việc phụ cần đúng bối cảnh đang có.

Định nghĩa một subagent riêng là một file Markdown có frontmatter, đặt ở `.claude/agents/` (theo project, nên commit vào repo) hoặc `~/.claude/agents/` (của riêng bạn, mọi project). Ví dụ chạy được:

```markdown
---
name: lesson-rewriter
description: Viết lại MỘT file bài học theo brief dùng chung. Dùng khi được giao đúng một file .md trong lessons/.
tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch
model: sonnet
---

Bạn viết lại đúng một file bài học. Trước khi làm gì, đọc file brief mà prompt trỏ tới
và làm đúng brief. Chỉ sửa file được giao. Không git add/commit/push.
Kết thúc bằng báo cáo theo mục "Báo cáo cuối" của brief.
```

`name` và `description` là bắt buộc; `description` là thứ Claude đọc để quyết định khi nào giao việc cho subagent này; `tools` bỏ trống thì kế thừa mọi tool; `model` nhận `sonnet`, `opus`, `haiku`, một model ID đầy đủ, hoặc `inherit` (nguồn: cùng trang docs, bảng frontmatter). Có cả trường `isolation: worktree` để chạy subagent trong một git worktree tạm — chủ đề của [[ag-15-worktree-va-xung-dot]].

### 3.2 Khi nào giao, khi nào không

Docs đưa hai danh sách. Dùng **subagent** khi: *"The task produces verbose output you don't need in your main context"*, khi cần ép quyền/tool riêng, và *"The work is self-contained and can return a summary"*. Dùng **phiên chính** khi: việc cần hỏi qua lại nhiều, nhiều pha chia sẻ nhiều context (plan → làm → test), sửa nhanh một chỗ, hoặc độ trễ quan trọng vì subagent bắt đầu trắng và phải tự gom context.

Gói lại thành ba câu hỏi kiểm được:

| Câu hỏi | Trả lời "có" nghĩa là | Kiểm bằng |
|---|---|---|
| Việc có độc lập không? | Không cần output của việc khác, không ghi chung file với việc khác | Liệt kê file mỗi việc sẽ ghi; giao nhau = không độc lập |
| Output có dài mà phiên chính không cần đọc lại? | Phiên chính chỉ cần kết luận | Ước lượng byte output so với byte kết luận |
| Kết quả có tóm lại được thành báo cáo ngắn kiểm được? | Có tiêu chí "xong" chạy được | Viết được mục "Báo cáo cuối" trước khi giao |

Ba "có" thì giao. Một "không" thì xem lại.

Con số của case cho thấy vì sao câu thứ hai nặng ký. Đo trên commit thật:

```
31 file sau khi viết lại           : 1.901.480 byte, 20.862 dòng
trung bình mỗi file                : 1.901.480 / 31 ≈ 61.338 byte
brief viết lại (đọc bởi mọi agent) : 5.897 byte
tỉ lệ output / brief               : 1.901.480 / 5.897 ≈ 322 lần
```

Nếu phiên chính tự viết, toàn bộ ~1,9 MB đó (cộng bản gốc phải đọc trước khi viết) đi qua context của nó. Giao đi thì phiên chính viết ~6 KB brief một lần, nhận lại 31 báo cáo ngắn. Số token tương ứng chưa đo — tiếng Việt và SVG cho tỉ lệ byte/token khác nhau; muốn có số thì đếm bằng API đếm token trên chính các file đó thay vì đoán.

Kinh nghiệm thực tế từ một course khác trong repo: main agent tự viết khoảng bốn bài là cạn context và mất khả năng điều phối phần còn lại. Đó là lý do quy ước của repo này là **bài học dài luôn giao agent**.

Hai chỗ **không** nên giao song song, dù việc trông có vẻ tách được:

- **Phụ thuộc chặt.** Một chương có bài sau dựa vào khái niệm và tên biến bài trước định nghĩa. Chạy song song hết thì agent bài sau không thấy bài trước (chúng không đọc được nhau). Kinh nghiệm thực tế: chia hai đợt, đợt sau đọc file đợt trước. [[ag-17-soat-cheo-noi-dung]] đi sâu vào lỗi "đúng từng phần, sai tổng thể".
- **Tổng hợp/plan.** Giao ba agent recon song song là đúng; nhưng nếu phiên chính tự ôm phần tổng hợp thì nó nhồi lại toàn bộ chi tiết thô vào context điều phối. Hoặc giao luôn phần tổng hợp cho một agent, hoặc ghi tiến độ và câu hỏi treo vào một file trạng thái (xem [[ag-18-brief-la-shared-state]]).

### 3.3 Brief: subagent chỉ biết những gì bạn viết ra

**Brief** là văn bản giao việc: bối cảnh, việc cần làm, ràng buộc, tiêu chí xong, định dạng báo cáo. Với subagent, brief là **toàn bộ** hiểu biết của nó về tình huống.

Viết brief ra **file**, rồi prompt cho từng agent chỉ cần vài dòng ("đọc file X, việc của bạn là file Y"). Lý do là cơ chế, không phải sở thích:

1. **Một nguồn, N người đọc.** 31 agent đọc cùng một file. Dán nội dung vào 31 prompt thì chỉ cần sửa tay một bản là các agent bắt đầu làm theo hai luật khác nhau.
2. **Sửa giữa chừng được.** Khi phát hiện gate toàn repo làm nghẽn, sửa brief một chỗ; mọi agent spawn sau đọc bản mới.
3. **Prompt ngắn thì dễ soát.** Prompt dài vài KB lặp 31 lần trong phiên chính cũng là context — đúng thứ bạn đang cố tiết kiệm.
4. **Kiểm lại được sau này.** Khi một agent làm lệch, bạn so báo cáo của nó với một file cố định, không phải với trí nhớ về một prompt.

Giải phẫu brief viết lại thật của case (trích, rút gọn câu chữ; chú thích bên phải là thêm vào):

```markdown
# Brief: viết lại lesson SAA-C03 cho DỄ HIỂU

Bạn được giao ĐÚNG MỘT file trong `lessons/saa-c03/`.            ← (1) phạm vi
Người học (dev backend, chưa thi SAA) phàn nàn bài viết kiểu       ← (2) bối cảnh + người đọc
cheat-sheet ... Việc của bạn: viết lại để người đọc lần đầu
hiểu được và giải thích lại được.

## Đọc trước khi viết                                              ← (3) đọc trước
1. Toàn bộ file được giao.
2. Phần audit của file đó trong <file audit>
3. BÀI MẪU: `ch2-06-data-ingestion-analytics.md` §2 (2.1–2.4).
   Viết đúng mức đó: không dài dòng hơn, không nén hơn.

## Khuôn cho mỗi section viết lại                                  ← (4) khuôn
`nó là gì` → `cơ chế, VÌ SAO` → `con số + phép tính` → `bảng so sánh` → `bẫy thi`

## Giữ nguyên                                                      ← (5) giữ nguyên
- Không xoá nội dung/độ phủ ... Giữ nguyên mọi khối <svg>.
- Giữ dòng H1 và các heading ## chính.

## Số liệu — phải đúng                                             ← (6) số đã kiểm
- Số đã kiểm với docs (dùng thẳng nếu cần): Kinesis shard ghi 1 MB/s ...
- Không kiểm được → viết định tính, KHÔNG bịa số.

## Ràng buộc kỹ thuật                                              ← (7) ranh giới ghi
- CHỈ sửa file .md được giao. Không đụng web/, không git add/commit/push.
- Không tự chế wikilink mới tới slug bạn không chắc tồn tại.

## Báo cáo cuối                                                    ← (8) hợp đồng trả về
- Số dòng trước → sau; section đã viết lại.
- Mọi số liệu đã thêm/sửa kèm URL nguồn; đánh dấu cái KHÔNG kiểm được.
```

Ba chỗ đáng học từ brief này:

- **Bản mẫu thay cho tính từ.** "Viết dễ hiểu" không ai làm theo được giống nhau. "Viết đúng mức §2 của file này" thì 31 agent có cùng một thước. Bản mẫu được làm và duyệt **trước** khi fan-out — nếu bản mẫu sai, 31 bản sai theo.
- **Số đã kiểm được đưa sẵn.** Agent không phải đo lại (tốn công) hay tự nhớ (dễ bịa). Brief là giả thuyết, phép đo mới là nguồn: ở một đợt viết course khác trong repo (kinh nghiệm thực tế), một agent phát hiện số trong brief không tái tạo được và thay bằng số nó tự đo, có ghi chú — đó là hành vi đúng, không phải đi chệch.
- **Mục báo cáo là hợp đồng.** Phiên chính biết trước mình sẽ nhận gì, nên viết được bước verify trước khi giao.

Nhưng chú ý dòng "Không tự chế wikilink" ở mục (7). Brief có dòng đó, và một agent **vẫn** tạo ra `[[11-kms]]`. Lời dặn trong brief giảm tần suất lỗi; nó không thay được script kiểm. Đây là cùng nguyên tắc với [[ag-08-hook-va-chan-bang-cau-hinh]]: thứ phải chắc chắn thì chặn bằng cơ chế.

### 3.4 Phân vai: main agent giữ bốn việc

Phiên chính (main agent) giữ đúng bốn việc, và giao đi mọi thứ còn lại:

| Main agent giữ | Vì sao không giao |
|---|---|
| **Research** | Chọn phạm vi, làm bản mẫu, chốt số liệu chung — sai ở đây nhân lên N lần |
| **Brief** | Là hợp đồng giữa các agent; chỉ một bên được viết |
| **Verify** | Agent chấm bài của chính mình thì không độc lập (xem [[ag-12-verifier-doc-lap]]) |
| **Commit + file chung** | Registry, lockfile, index… nếu N agent cùng ghi thì giẫm chân nhau |

Dòng cuối có bằng chứng trong diff: 31 file bài học do 31 agent ghi, còn `web/data/lessons.ts` — file mà mọi bài đều cần một dòng đăng ký — do phiên chính sửa sau khi xem kết quả. Nếu giao mỗi agent tự đăng ký bài mình, 31 agent cùng sửa một file TypeScript trong cùng working tree.

Quy tắc chung (kinh nghiệm thực tế): lập bảng **file mỗi việc sẽ ghi** trước khi giao. Không giao nhau → song song. Giao nhau ở vài file chung → vẫn song song, nhưng mỗi agent có danh sách file được ghi và danh sách cấm; file chung để người điều phối gộp cuối. Bước chạm ra bên ngoài (gửi tin, đăng ký cấu hình toàn máy, deploy) giữ lại cho người điều phối.

### 3.5 Trần đồng thời và gate nặng

Đáp án ⏸ là **(b)**.

Theo docs ([sub-agents](https://code.claude.com/docs/en/sub-agents)): *"By default, when 20 subagents are running in a session, spawning another with the Agent tool fails with `Concurrent subagent limit reached`"*; spawn thành công trở lại khi số đang chạy xuống dưới trần; trần chỉnh bằng biến môi trường `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`; và *"There's no limit on the total number of subagents Claude can spawn over a session."* — trần là số **đồng thời**, không phải tổng.

Phần docs không nói thẳng, rút từ case (kinh nghiệm thực tế): một agent đã viết xong nhưng đang đợi lệnh gate của nó chạy xong **vẫn là agent đang chạy**, nên vẫn giữ slot. Gate nặng trong spec của agent vì thế kéo dài thời gian giữ slot của từng agent, đúng lúc có việc đang xếp hàng.

Thứ hai là chi phí lặp. Gate kiểm SVG của repo quét mọi hình trong mọi bài — lần chạy cuối của case đếm 955 hình. Nếu 20 agent mỗi agent tự chạy nó một lần:

```
1 lần gate toàn repo           : 955 hình được parse
20 agent tự chạy, mỗi agent 1 lần: 20 × 955 = 19.100 lượt parse
phần thật sự liên quan tới bài của mỗi agent: chỉ các hình trong 1 file
```

Cả 20 lượt chạy tranh nhau CPU và đĩa của cùng một máy, nên từng lượt chậm hơn khi chạy một mình. Thời gian cụ thể chưa đo; muốn đo thì `time node .claude/workflows/check-svg.mjs` khi máy rảnh, rồi chạy lại khi có N bản song song.

Cách chặn đã dùng ở đợt sau: agent chỉ kiểm phần **của nó** (diff các khối SVG trong file của mình so với `HEAD`); gate toàn repo do phiên chính chạy **một lần** ở cuối. Đây là cùng nguyên lý "một gate hợp nhất trước merge" của [[ag-10-done-criteria-va-gate]]: gate cục bộ thuộc về worker, gate toàn cục thuộc về người gộp.

### 3.6 Giao xong phải đọc lại — và báo tiến độ tổng

Worker không tự gọi lại bạn. Subagent chạy nền báo kết quả bằng một thông báo ở lượt sau (docs: *"A background subagent's results reach Claude as a completion notification in a later turn"*), nhưng thông báo tới không có nghĩa là có ai đọc nó.

Case thực tế từ một repo backend khác: giao hai worker migrate 75 file; cả hai báo thất bại; phiên điều phối mải gỡ môi trường dev (tunnel, emulator) suốt nhiều lượt và **không quay lại đọc**. Lộ ra chỉ vì người dùng hỏi "sao chưa đổi?". Khi đọc, một worker đứng im **đúng lý**: file spec nó cần đã mất cùng thư mục tạm của phiên.

Hai cơ chế rút ra:

1. **Mở mỗi lượt bằng việc kiểm mọi worker đã giao**, trước khi làm việc mới. Báo "failed" phải được đọc nội dung trước khi kết luận thất bại — phần lớn là dừng ở một ranh giới thật và báo trung thực.
2. **Đóng mỗi lượt bằng khối tiến độ tổng**, không chỉ kể việc vừa xong. Người điều phối dài hơi không đọc lại cả transcript để tự ghép trạng thái; và khối tiến độ gần nhất là điểm phục hồi khi phiên chết.

Khuôn khối tiến độ (dùng ngay được):

```markdown
### Tiến độ — 23/31 xong
| Việc | Trạng thái | Ghi chú |
|---|---|---|
| ch2-01 … ch3-06 (20 file) | xong, đã verify | |
| ch4-01, ch4-02 | đang chạy | spawn lúc slot trống |
| ch4-03 | báo lỗi — đã đọc | agent dừng vì audit không có mục cho file này |
| 10-iam … 19-cost (8 file) | chờ slot | |

Số đo: dòng tổng 12.200 → 17.400 · link gãy: 0 · check-svg: chưa chạy (chạy 1 lần cuối)
Chờ bạn quyết: ch4-03 — viết lại theo rubric chung hay audit riêng trước?
```

(Bảng trên là **minh hoạ khuôn**; các số trong đó không phải số đo của case.)

Một hệ quả từ case migrate: brief và spec phải nằm ở **chỗ sống lâu hơn phiên** (trong repo, hoặc thư mục bền), không ở thư mục tạm. Phần này nối sang [[ag-18-brief-la-shared-state]].

### 3.7 Verify của main agent: tin nhưng phải kiểm

Báo cáo của agent là lời khai, không phải bằng chứng. Danh sách kiểm phiên chính đã chạy sau khi 31 agent xong (case thực tế, dùng lại được cho mọi đợt fan-out sửa file có sẵn):

| Kiểm | Bắt được loại lỗi gì |
|---|---|
| `git diff --name-only` đúng 31 file, không file lạ | Agent ghi lấn ra ngoài phạm vi |
| Mọi khối `<svg>` giống `HEAD` và parse được | Agent sửa thứ brief bảo giữ nguyên |
| H1/H2 còn nguyên, code fence cân | Tham chiếu chéo giữa bài bị gãy |
| Script kiểm wikilink với registry | `[[11-kms]]` — slug không có trong registry lúc đó |
| Quét claim dùng chung giữa các bài | Hai bài nói hai con số khác nhau cho cùng một hạn mức |
| `check-svg` toàn repo (955 hình), `tsc`, `next build` | Lỗi cú pháp, build |
| Tự đối chiếu vài dữ kiện với docs gốc | Agent dẫn nguồn nhưng đọc sai nguồn |

Và một lỗ không gate nào trong bảng bịt được: số liệu cũ **trong nhãn SVG** (ví dụ nhãn IOPS của một loại volume). Phép quét claim chạy trên văn xuôi, `check-svg` chỉ kiểm cú pháp và trùng id. Số nằm trong hình là số không ai review — trừ khi bạn thêm một phép kiểm đọc chữ trong `<text>`. Lỗi kiểu "gate xanh mà không chứng minh gì" là chủ đề của [[ag-11-gate-xanh-gia]].

---

## 4. Làm thử

Mục tiêu: fan-out một việc nhỏ có thật trong repo của bạn sang 3–5 subagent, với brief file, ranh giới ghi, và gate do phiên chính chạy.

**Bước 1 — chọn việc.** Chọn N file cùng loại cần sửa theo cùng một luật, ví dụ: thêm mục "Cách chạy" vào README của N package, viết docstring cho N module, chuẩn hoá N file cấu hình. Điều kiện: mỗi việc chỉ ghi **một** file, không file nào trùng.

**Bước 2 — làm bản mẫu.** Tự sửa (hoặc cùng agent sửa trong phiên chính) **một** file tới mức bạn chấp nhận. Commit nó. Đây là thước.

**Bước 3 — viết brief ra file** `docs/briefs/fanout-brief.md` (đường dẫn trong repo, không phải thư mục tạm):

```markdown
# Brief: <tên việc>

## Phạm vi
Bạn được giao ĐÚNG MỘT file (tên file ở prompt). Chỉ ghi file đó.

## Bối cảnh
<ai đọc kết quả, họ đang gặp vấn đề gì — 2–3 câu>

## Đọc trước
1. Toàn bộ file được giao.
2. Bản mẫu: `<đường dẫn file đã làm ở bước 2>` — làm đúng mức đó.

## Khuôn
<cấu trúc bắt buộc của phần sửa, ví dụ: Cách cài → Cách chạy → Biến môi trường → Lỗi hay gặp>

## Giữ nguyên
- <những gì không được xoá/sửa>

## Dữ kiện dùng chung (đã kiểm)
- <lệnh, version, đường dẫn mà mọi file đều cần — để agent không tự đoán>

## Ràng buộc
- Không sửa file khác. Không git add/commit/push.
- Không thêm link tới file/slug bạn chưa kiểm là tồn tại.
- Không chạy test/gate toàn repo. Chỉ kiểm file của bạn: <lệnh kiểm cục bộ>.

## Báo cáo cuối (ngắn)
- File đã sửa, số dòng trước → sau.
- Mọi dữ kiện mới thêm kèm nguồn; cái nào không kiểm được.
```

**Bước 4 — giao.** Trong Claude Code, gõ (prompt mẫu):

```
Đọc docs/briefs/fanout-brief.md. Giao mỗi file sau cho một subagent riêng, chạy nền song song,
prompt mỗi agent chỉ gồm: đường dẫn brief + tên file được giao.
Files: packages/a/README.md, packages/b/README.md, packages/c/README.md
Không tự sửa file nào trong số đó. Khi mỗi agent xong, in khối tiến độ tổng (xong / đang chạy / còn lại).
```

**Bước 5 — gate do phiên chính chạy.** Lưu script này thành `scripts/check-fanout.sh` (chạy được với bash + git):

```bash
#!/usr/bin/env bash
# Dùng: scripts/check-fanout.sh packages/a/README.md packages/b/README.md packages/c/README.md
set -euo pipefail
allowed=$(printf '%s\n' "$@" | sort)
changed=$( { git diff --name-only; git ls-files --others --exclude-standard; } | sort -u)
extra=$(comm -13 <(echo "$allowed") <(echo "$changed"))
missing=$(comm -23 <(echo "$allowed") <(echo "$changed"))
if [ -n "$extra" ];   then echo "FAIL — file ngoài phạm vi:";   echo "$extra";   exit 1; fi
if [ -n "$missing" ]; then echo "FAIL — file được giao chưa đổi:"; echo "$missing"; exit 1; fi
echo "PASS — đúng $(echo "$allowed" | wc -l | tr -d ' ') file, không file lạ"
```

Sau đó chạy gate repo của bạn **một lần** (lint, link check, build).

**Tiêu chí xong (kiểm được):**

- `scripts/check-fanout.sh <danh sách>` in `PASS`.
- Gate repo xanh, chạy một lần từ phiên chính.
- Bạn đã tự kiểm lại ít nhất một dữ kiện trong báo cáo của mỗi agent (một lệnh chạy thử, một link mở thử).
- Thử phá: tự sửa thêm một file ngoài danh sách rồi chạy lại script — nó phải in `FAIL`. Gate chưa từng đỏ thì chưa chứng minh được gì.

---

## 5. Bẫy thường gặp

🪤 **Dán brief vào prompt từng agent.**
Triệu chứng: các agent làm theo hai phiên bản luật khác nhau; không ai nói được agent nào đọc bản nào.
Nguyên nhân gốc: nội dung brief tồn tại thành N bản, bản nào cũng là "nguồn".
Chặn: brief là **một file**, prompt chỉ trỏ tới nó. Sửa luật = sửa file, agent spawn sau đọc bản mới.

🪤 **Mỗi agent tự chạy gate toàn repo.**
Triệu chứng: việc xếp hàng mãi không spawn được; gate chạy lâu bất thường; máy nóng.
Nguyên nhân gốc: agent giữ slot cho tới khi kết thúc hẳn, và N lượt gate trùng lặp tranh cùng tài nguyên.
Chặn: brief chỉ cho phép kiểm **phần của mình**; gate toàn cục thuộc phiên chính, chạy một lần.

🪤 **Agent ghi file chung.**
Triệu chứng: registry/index/lockfile mất dòng, hoặc diff lẫn thay đổi của hai agent.
Nguyên nhân gốc: N tiến trình cùng đọc-sửa-ghi một file, không có khoá.
Chặn: danh sách file được ghi trong brief + script kiểm file thay đổi ⊆ danh sách (bước 5 §4). File chung để người điều phối gộp.

🪤 **Tin báo cáo của agent.**
Triệu chứng: báo cáo nói "đã kiểm với docs", nhưng số vẫn sai; link trông hợp lý nhưng gãy.
Nguyên nhân gốc: báo cáo là văn bản do cùng agent sinh ra — nó không chạy, không đỏ được.
Chặn: verify bằng lệnh (link check, diff phạm vi, build) và tự đối chiếu mẫu vài dữ kiện; giao chấm cho agent khác ([[ag-12-verifier-doc-lap]]).

🪤 **Giao xong rồi quên.**
Triệu chứng: worker báo failed nằm đó nhiều lượt; người dùng là người phát hiện.
Nguyên nhân gốc: worker không tự gọi lại; phiên điều phối bị cuốn vào việc khác có vẻ gấp hơn.
Chặn: mở mỗi lượt bằng việc kiểm trạng thái mọi worker; đóng mỗi lượt bằng khối tiến độ tổng — có khuôn cố định thì không quên được hàng "đang chạy".

🪤 **Brief/spec để trong thư mục tạm.**
Triệu chứng: agent đợt sau, hoặc phiên sau khi crash, không tìm thấy file nó cần và đứng im.
Nguyên nhân gốc: thư mục tạm sống theo phiên hoặc theo lần khởi động máy.
Chặn: brief và spec cần cho việc kéo dài qua nhiều lượt đặt trong repo hoặc thư mục bền, kèm trong danh sách kiểm trước khi giao.

🪤 **Fan-out trước khi có bản mẫu.**
Triệu chứng: N kết quả đúng brief nhưng mỗi cái hiểu "đạt" một kiểu; phải sửa lại cả N.
Nguyên nhân gốc: brief chỉ có tính từ ("dễ hiểu", "đầy đủ"), không có thước.
Chặn: làm và duyệt một bản mẫu trước, brief trỏ thẳng tới nó.

---

## 6. Chuyển giao

Bài này cho bạn đơn vị cơ bản của level 5: một agent nhận một brief, ghi một phạm vi, trả một báo cáo; phiên chính giữ phần kiểm.

- Song song trong **cùng một working tree** chỉ an toàn khi mỗi agent ghi file riêng và không ai build/test đè lên nhau. Khi việc cần sửa code, chạy test, đổi nhánh, mỗi agent cần một bàn làm việc riêng: [[ag-15-worktree-va-xung-dot]].
- Phiên chính tự verify thì vẫn là "người giao tự chấm". Giao chấm cho một họ model khác bắt được lỗi mà cùng họ bỏ qua: [[ag-16-hai-ho-model]].
- N agent viết N phần đúng từng phần mà mâu thuẫn nhau — số, tên gọi, quy ước: [[ag-17-soat-cheo-noi-dung]].
- Level 6 bỏ được việc bạn ngồi gõ prompt giao việc mỗi lượt: brief trở thành **file trạng thái bền** mà một vòng lặp tự nhặt task từ đó ([[ag-18-brief-la-shared-state]], [[ag-19-vong-lap-nhat-task]]). Mọi thứ bài này dạy — brief ra file, ranh giới ghi, gate ở phiên chính, khối tiến độ — là nguyên liệu của vòng lặp đó.

Lý thuyết agent và tool use ở mức API (vòng lặp tool, agent gọi agent) đã có ở [[aiml-05-agents-tools]].

---

## 7. Tóm tắt

- Subagent chạy trong context riêng, **bắt đầu trắng**, không thấy lịch sử phiên chính; chỉ bản tóm tắt quay về (docs Claude Code, sub-agents).
- Giao khi việc độc lập, output dài mà phiên chính không cần, kết quả tóm lại được. Phụ thuộc chặt thì chia đợt; tổng hợp/plan cũng giao, hoặc ghi ra file trạng thái.
- Brief viết **một lần ra file**, prompt chỉ trỏ tới; có bản mẫu làm thước, số đã kiểm đưa sẵn, ranh giới ghi file, và mục báo cáo là hợp đồng.
- Main agent giữ research + brief + verify + commit; file chung (registry, index) do người điều phối gộp.
- Trần mặc định **20 subagent đồng thời** (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`), không giới hạn tổng. Agent đang chờ gate vẫn giữ slot — gate nặng thuộc phiên chính, chạy một lần.
- Lời dặn trong brief giảm lỗi nhưng không chặn được: `[[11-kms]]` lọt qua dòng "không tự chế wikilink", chỉ script kiểm link bắt được.
- Mở mỗi lượt bằng đọc lại worker đã giao, đóng mỗi lượt bằng khối tiến độ tổng.
- Case thực tế (một lần chạy): 31 bài, 31 agent, `+10885 / −2258` dòng, 20 chạy trước, 11 chờ slot.
