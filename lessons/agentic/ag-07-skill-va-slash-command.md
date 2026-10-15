# Bài 7 — Đóng gói quy trình thành skill

## 1. Mục tiêu

Sau bài này bạn có thể:

- Viết một `SKILL.md` chạy được trên Claude Code (và chép sang Codex CLI), đặt đúng thư mục, đúng frontmatter.
- Giải thích vì sao **description** là phần quyết định skill có được gọi hay không, và viết lại một description "mô tả cái nó là" thành một description "nói khi nào dùng".
- Chọn đúng chế độ gọi cho từng loại skill: agent tự gọi, chỉ người gõ `/tên`, hoặc chỉ agent dùng như kiến thức nền. Lý do chọn phải là rủi ro tác dụng phụ.
- Tách phần tất định của quy trình ra thành script mà skill gọi, và nói được vì sao phần đó không nên để model tự suy ra mỗi lần.
- Kiểm một skill viết ra từ một sự cố: tìm những giả định nó thừa hưởng từ sự cố đó, và đo xem nó có thật sự được dùng không.
- Giải thích vì sao một session resume vẫn làm theo bản skill cũ sau khi bạn đã sửa file, rồi viết prompt resume chặn được lỗi đó.

---

## 2. Tình huống

Một team vận hành một app SaaS thương mại điện tử. Giữa năm, team gặp một sự cố ở phần thu tiền định kỳ (billing): một lần chạy lại job tạo trùng lượt thu tiền. Sửa xong, một dev trong team ngồi cùng agent viết skill `preflight`. Đây là checklist bắt buộc trước khi đẩy một bản fix gấp lên production. Skill có năm ô phải điền:

1. Bug nằm trong "hot-zone" nào. Danh sách ghi: billing, charge, contract, order.
2. Gate nào đã chạy.
3. ...
4. **Đo thiệt hại**: chạy query trên data warehouse, đếm số contract/order bị ảnh hưởng.
5. **Rollback**: `git revert` commit fix.

Kèm luật: *"Ô nào trống thì dừng, không được đẩy."*

Skill viết cuối tháng 7. Đầu tháng 9, có người hỏi: *"Gần đây có bản fix gấp nào qua preflight không?"* Câu trả lời nằm ngay trong repo. Theo skill, mỗi lần preflight phải ghi một file vào thư mục `docs/.../preflight/`, mà thư mục đó **chưa từng được tạo**. Sau khoảng 5 tuần, không một bản fix nào đi qua skill này.

Đi tìm nguyên nhân thì thấy ba chỗ hỏng, chỗ nào cũng có số liệu (case thực tế, một repo, không phải benchmark):

- **Hot-zone sai chỗ.** Đếm commit `fix` từ đầu tháng 5: phía frontend/storefront có **118**, phía backend có **106**. Phần lớn bug thật của repo nằm ngoài danh sách billing/charge/contract/order. Một bug làm hỏng toàn bộ lazy chunk trên mọi shop (thiếu scheme trong `publicPath`) bị xếp vào loại "lỗi config/JS", nên không thuộc hot-zone.
- **Ô 4 không bao giờ điền được với bug giao diện.** Thiệt hại của một widget hiển thị sai giá là khách thấy sai rồi bỏ đi. Không sinh ra dòng nào trong bảng contract/order để đếm. Cộng thêm luật "ô trống thì dừng", ta có deadlock: không đo được, không được để trống, không được bịa số.
- **Rollback một câu là sai.** Extension chỉ lên khi release lại app version. Widget nằm sau CDN cache `max-age=86400`. Function có hai đường deploy khác nhau. `git revert` không gỡ được thứ đã ra CDN.

Skill được viết lại: sáu lớp bug chia theo **bề mặt bị ảnh hưởng** thay vì theo công nghệ, ô 4 có thêm trạng thái hợp lệ `CHƯA ĐO` (bắt buộc ghi tên dụng cụ đã thử, kèm lệnh và lỗi), rollback tách theo từng kênh deploy. Bản mới dài thêm khoảng 638 dòng, chia ra `SKILL.md` và hai file reference.

Còn một chuyện nhỏ hơn nhưng cùng họ, ở một hệ thống khác. Một bot xử lý file dữ liệu khách hàng chạy theo kiểu session sống lâu: mỗi lần người trả lời trong thread, bot gọi `claude --resume <id> -p "<câu trả lời>"`. Dev sửa luật trong skill của bot ("khách có nhiều phương thức thanh toán thì lấy cái đầu tiên") rồi commit. Lượt resume sau đó vẫn để khách đó ở trạng thái "cần hỏi", và chính session tự ghi: *"Skill (bản 13:56) vẫn ghi…"*. Nó đang làm theo bản skill đã đọc từ mấy tiếng trước.

---

## ⏸ Dừng lại — đoán trước

Repo của bạn có 15 skill, mỗi skill khoảng 150 dòng. Bạn mở một session mới và gõ: *"sửa lỗi typo trong README"*. **Có bao nhiêu dòng của 15 skill đó đã nằm trong context window** (vùng văn bản model nhìn thấy trong một lượt) trước khi agent bắt tay vào làm?

```
(a) 0. Skill chỉ nạp khi bạn gõ /tên-skill
(b) Khoảng 15 dòng, mỗi skill một đoạn mô tả ngắn
(c) Khoảng 2.250 dòng, vì agent cần biết hết để chọn
(d) Tuỳ model: model lớn nạp hết, model nhỏ nạp mô tả
```

Đáp án ở §3.2. Nó cũng giải thích luôn vì sao skill `preflight` ở trên được viết dài thêm mà vẫn không làm nặng mọi session.

---

## 3. Cơ chế

### 3.1 Skill là gì, nằm ở đâu

**Skill** là một thư mục có file `SKILL.md`. File này gồm frontmatter YAML và phần thân markdown hướng dẫn agent làm một việc. Thư mục có thể chứa thêm file reference, ví dụ và script. Ở [[ag-06-memory-va-feedback]], memory trả lời câu hỏi *"agent cần nhớ gì về tôi và repo này"*. Skill trả lời câu khác: *"khi gặp việc loại X thì làm theo các bước nào"*. Memory là dữ kiện, skill là quy trình.

Vị trí trên Claude Code (nguồn: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)):

| Phạm vi | Đường dẫn |
|---|---|
| Cá nhân, mọi repo | `~/.claude/skills/<tên>/SKILL.md` |
| Project, commit để cả team dùng | `.claude/skills/<tên>/SKILL.md` |
| Plugin | `<plugin>/skills/<tên>/SKILL.md`, gọi bằng `/plugin-name:skill-name` |

Khi trùng tên, docs nói enterprise thắng personal, personal thắng project. Thư mục skill dạng symlink cũng được hỗ trợ, nên bạn có thể giữ skill trong một repo riêng rồi symlink vào `~/.claude/skills/`.

Codex CLI dùng cùng định dạng thư mục + `SKILL.md`, chỉ khác chỗ đặt (nguồn: [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills), hiện chuyển hướng sang trang build-skills): `.agents/skills/` trong repo (Codex quét từ thư mục hiện tại lên tới gốc repo), `$HOME/.agents/skills` cho cá nhân. Codex **bắt buộc** có `name` và `description` trong frontmatter. Claude Code thì chỉ khuyến nghị `description`. Nếu viết đủ cả hai trường, cùng một file chạy được trên cả hai công cụ.

### 3.2 Progressive disclosure: ba tầng nạp

Đáp án ⏸ là **(b)**.

Docs Claude Code mô tả ba tầng:

1. **Description luôn nằm trong context**, trừ skill đặt `disable-model-invocation: true`. Agent cần nó để biết skill nào tồn tại và lúc nào dùng.
2. **Thân `SKILL.md` chỉ nạp khi skill được gọi**, do người gõ `/tên` hoặc do agent tự chọn.
3. **File phụ trợ** (`reference.md`, `examples.md`) chỉ nạp khi agent tự đọc. Script trong `scripts/` thì được **chạy**, nội dung không nạp vào context.

Codex làm giống vậy. Lúc đầu nó chỉ có name, description và đường dẫn của từng skill, chọn skill nào thì mới nạp đủ `SKILL.md`. Danh sách ban đầu bị giới hạn ở 2% context window, hoặc 8.000 ký tự nếu không biết kích thước window (docs Codex).

Vì sao thiết kế thế này: context window là tài nguyên chung của mọi thứ trong session (xem [[ag-04-context-va-file-huong-dan]]). Tính thử với giả định của câu đố:

```python
# GIẢ ĐỊNH, chưa đo: 15 skill × 150 dòng, ~12 token/dòng, mỗi description ~100 token
skills, lines, tok_per_line, desc_tok = 15, 150, 12, 100
body_all = skills * lines * tok_per_line   # nạp hết thân mọi skill
desc_all = skills * desc_tok               # chỉ nạp description
print(body_all, desc_all, body_all / desc_all)
# 27000 1500 18.0
```

Với giả định đó, nạp hết thân skill tốn gấp khoảng 18 lần so với chỉ nạp description, và số đó phải trả ở **mọi** session, kể cả session sửa typo. Hệ số 12 token/dòng là giả định. Văn bản tiếng Việt thường tốn nhiều token hơn tiếng Anh, nên số thật có thể khác. **Cách đo:** mở session mới, gõ `/context` (lệnh có sẵn của Claude Code) để xem phần skill chiếm bao nhiêu, rồi so trước và sau khi thêm một skill.

Hệ quả thực tế:

- Một skill dài **không** làm nặng các session không dùng nó. Skill `preflight` được viết dài thêm 638 dòng mà các session khác không phải trả thêm gì, chỉ session gọi nó mới trả.
- Docs khuyên giữ `SKILL.md` **dưới 500 dòng** và chuyển tài liệu tham chiếu sang file riêng. Thân skill chỉ cần chỉ đường: "chọn query đo thiệt hại → đọc `references/blast-radius.md`".
- Sau khi context bị nén tự động (auto-compaction), docs nói Claude Code gắn lại lần gọi gần nhất của mỗi skill: giữ **5.000 token đầu** mỗi skill, tổng tối đa **25.000 token**. Quy tắc nằm cuối một skill dài có thể bị cắt sau khi nén. Vì vậy đặt điều quan trọng nhất lên đầu.

### 3.3 Description quyết định khi nào skill được gọi

Ở tầng 1, agent chỉ thấy description. Nó chọn skill bằng cách so yêu cầu của người với các đoạn description đó, giống như bạn chọn sách trong thư viện chỉ bằng cách đọc gáy. Vì vậy:

- Description chỉ nói **skill này là gì** ("Quy trình preflight cho hotfix") thì agent khó khớp với yêu cầu thật của người dùng ("sửa gấp cái nút cancel trên prod giúp tôi").
- Description nói **khi nào dùng**, kèm các cụm từ người dùng hay gõ, thì khớp được.

Docs ghi rõ: Claude dùng `description` để quyết định có tự nạp skill hay không. Text của `description` cộng `when_to_use` bị **cắt ở 1.536 ký tự** trong danh sách skill. Docs khuyên đặt trường hợp dùng chính lên đầu.

So sánh hai cách viết cho cùng một skill:

```yaml
# Mô tả cái nó là: hiếm khi tự được gọi
description: Preflight checklist for production hotfixes.
```

```yaml
# Nói khi nào dùng: khớp được yêu cầu thật
description: Use before pushing any fix to production on an urgent timeline, including UI-only
  fixes on the storefront, when the user says "hotfix", "fix gấp", "đẩy prod ngay", or asks
  whether a bug should be fixed now or scheduled. Classifies the bug by affected surface,
  measures damage (or records why it can't), and picks the rollback path per deploy channel.
```

Bản thứ hai có ba thứ bản đầu không có: **điều kiện kích hoạt** ("before pushing any fix…"), **cụm từ người dùng hay gõ**, kể cả tiếng Việt, và **một câu nói skill làm gì** để agent biết nó có đúng việc không. Hai skill mẫu ở §3.6 đều theo mẫu này. Một skill kiểm A/B ghi thẳng trong description các cụm như *"test store, dev store, resource override, 'test trước/sau'"*. Đó là những chữ người dùng thật gõ ra.

**Chế độ gọi.** Có hai trường frontmatter điều khiển ai được gọi skill (nguồn: docs skills):

- `disable-model-invocation: true`: agent **không** được tự gọi, chỉ người gõ `/tên` mới chạy. Description cũng bị bỏ khỏi context. Dùng cho skill có **tác dụng phụ khó hoàn tác**: deploy, gửi tin nhắn, xoá dữ liệu. Lý do: agent tự gọi skill khi nó *đoán* bạn muốn việc đó, và với một lệnh deploy thì đoán sai là sự cố.
- `user-invocable: false`: ẩn khỏi menu `/`, chỉ agent gọi được. Dùng cho kiến thức nền mà người không cần gõ tay, ví dụ "quy ước đặt tên migration của repo này".

| Frontmatter | Người gõ `/tên` | Agent tự gọi | Description trong context |
|---|---|---|---|
| (mặc định) | Có | Có | Luôn có |
| `disable-model-invocation: true` | Có | Không | Không |
| `user-invocable: false` | Không | Có | Luôn có |

Codex có công tắc tương tự: `allow_implicit_invocation: false` trong `agents/openai.yaml` tắt việc tự gọi, gọi tường minh bằng `$tên-skill` thì vẫn chạy (docs Codex).

### 3.4 Slash command: cùng một cơ chế

Trước đây Claude Code có custom slash command riêng, đặt ở `.claude/commands/<tên>.md`. Docs hiện tại ghi: *"Custom commands have been merged into skills."* Cả `.claude/commands/deploy.md` lẫn `.claude/skills/deploy/SKILL.md` đều tạo ra lệnh `/deploy`. File command cũ vẫn chạy. Nếu trùng tên thì **skill thắng**. Skill có thêm ba thứ: thư mục cho file phụ trợ, trường điều khiển chế độ gọi, và khả năng được agent tự nạp.

Cách gọi (docs):

- `/tên-skill` **ở đầu tin nhắn** chạy skill ngay.
- Tên skill nằm giữa câu ("ok giờ chạy /deploy đi") **không** chạy trực tiếp. Nó chỉ cho phép agent gọi skill đó.
- Tham số: `$ARGUMENTS` là toàn bộ chuỗi tham số. `$0`, `$1`… là tham số theo vị trí, **đánh số từ 0**. Trường `arguments: [issue, branch]` tạo biến có tên `$issue`, `$branch`. Truyền tham số mà thân skill không có placeholder nào thì Claude Code tự nối thêm `ARGUMENTS: <giá trị>` vào cuối.

```markdown
---
description: Tạo nhánh fix cho một issue và ghi plan vào docs/plans/
argument-hint: [issue-number]
arguments: [issue]
disable-model-invocation: true
---
Đọc issue #$issue bằng `gh issue view $issue`. Tạo nhánh `fix/$issue`.
Viết plan 5–10 dòng vào `docs/plans/$issue.md` rồi DỪNG, chờ người duyệt.
```

Lưu ý khi chuyển giữa hai công cụ: `$0` của Claude Code là tham số **đầu tiên**, khác `$1` trong shell script. Ghi chú này đặt ngay trong skill để khỏi nhầm.

### 3.5 Skill gọi script: tách phần tất định ra khỏi model

Một quy trình thường có hai loại bước:

- **Bước cần phán đoán**: bug này thuộc lớp nào, lỗi này có liên quan fix không. Đây là việc của model.
- **Bước tất định** (cùng đầu vào thì luôn ra cùng kết quả): thay bundle, chạy hai lượt A/B, so hai giá trị, ghi file bằng chứng. Để model tự viết lại mấy chục dòng lệnh này mỗi lần thì mỗi lần ra một biến thể hơi khác, lúc thì quên cờ, lúc thì sai đường dẫn. Kết quả giữa các lần chạy không so được với nhau.

Đưa bước tất định vào script có ba lợi ích: chạy giống nhau mọi lần, test được độc lập với model, và nội dung script không tốn context (docs: script được *chạy*, không *nạp*).

Skill kiểm A/B trong case thực tế làm đúng như vậy. Thân skill để model quyết định chọn môi trường nào và đọc giá trị gì làm bằng chứng. Việc "chạy lượt A với bundle production, lượt B với bundle build từ nhánh fix, mỗi lượt một browser context mới" nằm trong một script nhận tham số `--url --match --file --probe --out`. Thân skill chỉ còn ghi luật dùng script, ví dụ: *"lượt B phải có `overridden > 0`; bằng 0 nghĩa là `--match` sai và B đang chạy code cũ"*.

Claude Code có hai công cụ cho việc này (docs):

- `${CLAUDE_SKILL_DIR}` trỏ tới thư mục chứa `SKILL.md`, nên skill không phải ghi cứng đường dẫn máy. Cộng với `allowed-tools` để script chạy không phải hỏi quyền **trong lượt gọi skill đó**. Quyền này hết khi bạn gửi tin nhắn kế tiếp.
- `` !`lệnh` `` (hoặc khối code mở bằng ` ```! `) chạy lệnh shell **trước khi** nội dung skill tới model, rồi thay chỗ đó bằng output. Docs nêu ba điểm cần nhớ: lệnh **lỗi thì cả lần gọi skill bị huỷ**, lệnh phải qua kiểm tra permission (không được duyệt sẵn thì cũng bị huỷ), và cài `"disableSkillShellExecution": true` trong settings sẽ tắt tính năng này.

```markdown
---
description: Use before opening a PR, when the user says "mở PR", "ready for review", or "chạy gate".
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/gate.sh *)
---
## Thay đổi hiện tại
!`git diff --stat HEAD`

Chạy `${CLAUDE_SKILL_DIR}/scripts/gate.sh` và dán NGUYÊN VĂN 20 dòng cuối output.
```

### 3.6 Cấu trúc một skill dùng được

Hai skill trong case thực tế đã qua nhiều lần sửa có chung một khung. Phần này mô tả khung đó, không chép nội dung.

**Skill kiểm A/B trên app chạy thật** (khoảng 90 dòng):

1. **Một câu nguyên tắc ngay dưới tiêu đề**: *"Bằng chứng = cùng một kịch bản, bản TRƯỚC thấy lỗi, bản SAU hết lỗi. Không tái hiện được lỗi ở bản trước thì là UNVERIFIED, không phải PASS."* Câu này đứng đầu vì nó phải sống sót qua compaction (§3.2), và vì mọi bước phía sau đều suy ra từ nó.
2. **Bảng chọn đường** ("Tình huống | Đường"): lỗi chỉ có ở shop khách và fix chỉ frontend thì override; fix đụng backend hoặc cần thao tác ghi thì môi trường staging; còn một dòng cuối liệt kê các trường hợp **không đường nào làm được** thì phải báo rõ là chưa verify. Bảng để model tra, khỏi phải suy luận lại từ đầu.
3. **Các bước đánh số, mỗi bước có điều kiện dừng**: "không được bỏ lượt TRƯỚC", "chứng minh code đã lên bằng chuỗi chỉ có trong code mới, không tin tin nhắn 'build ok'".
4. **Kết luận có ba giá trị**: PASS / FAIL / UNVERIFIED, mỗi giá trị kèm điều kiện. Không có lựa chọn "chắc là được".
5. **Bảng "Red flags" hai cột "Ý nghĩ | Sự thật"**: *"Không tự động được bước này, nhờ user bấm" → "Thử ít nhất 3 cách trước…"*. Bảng này viết từ những lần agent thật sự lách quy trình. Mỗi dòng là một lối tắt đã từng xảy ra.

**Skill retro harness** (khoảng 100 dòng) thêm hai điểm:

- **Tách "bình thường thì job tự chạy" khỏi "gọi tay"** ngay từ đầu, kèm bảng pha (đo lại / đề xuất / áp), ai làm từng pha và khi nào. Agent biết mình đang ở pha nào nên không làm lấn sang pha sau.
- **Điểm dừng tường minh**: *"Phiên không có người duyệt: dừng sau Bước 3. Không bao giờ tự áp khi chưa được duyệt."* Một skill có bước ghi phải nói rõ chỗ dừng. Không nói thì agent sẽ chạy tới cuối danh sách.

Cả hai đều ghi **Why** cạnh luật khó hiểu ("Vì sao phải có người duyệt: …"). Kinh nghiệm thực tế: luật không kèm lý do là luật đầu tiên bị agent bỏ qua khi gặp tình huống mà luật không lường trước. Có lý do thì agent suy ra được cách áp luật cho tình huống mới.

### 3.7 Skill viết từ một sự cố mang theo giả định của sự cố đó

Quay lại `preflight`. Nó hỏng không phải vì viết ẩu. Nó hỏng vì được **khái quát từ một mẫu duy nhất**. Mỗi ô của skill lặng lẽ mang một đặc điểm của sự cố billing:

| Ô trong skill | Giả định thừa hưởng từ sự cố | Thực tế của repo |
|---|---|---|
| Hot-zone | Bug nguy hiểm là bug billing | 118/224 commit fix ở phía frontend |
| Đo thiệt hại | Thiệt hại sinh ra dòng dữ liệu đếm được | Bug giao diện không sinh dòng nào |
| Rollback | Revert commit là gỡ xong | CDN cache, release extension, hai đường deploy |

(118 + 106 = 224: case thực tế, một repo, đếm theo commit `fix` từ đầu tháng 5. Đó là dữ kiện của repo đó, không phải tỉ lệ chung.)

Cơ chế hỏng như sau. Người viết skill ngay sau sự cố vẫn đang đứng trong sự cố. Mọi ví dụ nghĩ ra đều là ví dụ của sự cố đó, nên skill pass mọi phép thử mà người viết nghĩ tới. Phép thử phải lấy từ **ngoài** sự cố.

Ba phép kiểm, cái nào cũng chạy được bằng lệnh:

1. **Đếm phân bố việc thật.** `git log --oneline --since=<mốc> --grep='^fix' -- <thư mục>` cho từng bề mặt của repo. Skill chỉ phủ một bề mặt trong khi việc thật trải ra nhiều bề mặt nghĩa là ranh giới của skill sai.
2. **Chạy skill trên hai kịch bản khác hẳn sự cố gốc.** Bản viết lại của `preflight` được kiểm bằng hai kịch bản: widget hiện sai giá, và nút Cancel im lặng trong trang tài khoản khách. Cả hai điền được ô 4 ở trạng thái `CHƯA ĐO` mà không phải bịa query, và hết deadlock (case thực tế).
3. **Kiểm skill có được dùng thật không.** Skill nào có output thì kiểm output đó có tồn tại không. Thư mục `preflight/` chưa từng có là bằng chứng mạnh nhất trong case này: *một gate không ai qua nổi là một gate không ai dùng*. Một cách làm khác trong case thực tế: một script đếm số session ngoài repo gốc đã gọi skill **kể từ lần sửa skill gần nhất** (sửa skill thì đếm lại từ 0). Đủ 3 lần dùng thật mà không phải sửa thì mới nâng skill từ "khuyến nghị" lên "bắt buộc trong verifier".

Một tradeoff ghi lại trong case: bản viết lại chấp nhận trạng thái `CHƯA ĐO`, tức gate mềm đi. Đổi lại, gate chạy được, còn gate cứng thì bị bỏ qua. Chốt chặn duy nhất chống việc khai "CHƯA ĐO" cho tiện là bắt ghi **tên dụng cụ đã thử, kèm lệnh và thông báo lỗi**. Người đọc phân biệt được "đã thử mà không đo được" với "không thử".

### 3.8 Session giữ bản skill nào

Docs Claude Code ghi hai điều có vẻ ngược nhau:

- **Live change detection**: Claude Code theo dõi `~/.claude/skills/` và `.claude/skills/` của project. Sửa `SKILL.md` là có hiệu lực ngay trong session hiện tại, không cần khởi động lại. Thư mục skills cấp cao nhất tạo **sau** khi session đã mở thì phải chạy `/reload-skills`.
- **Persistence**: *"once invoked, the rendered content stays in the conversation"*. Nội dung skill đã gọi nằm lại trong hội thoại.

Hai điều này không mâu thuẫn. Live detection cập nhật **lần gọi tiếp theo**. Còn bản đã gọi thì là văn bản nằm trong lịch sử hội thoại, và model đọc lịch sử đó ở mọi lượt. `claude --resume <id>` (hoặc `-r`) nối tiếp đúng lịch sử đó. Model thấy bản skill cũ ngay phía trên, không có lý do gì để gọi lại skill, nên nó cứ làm theo bản cũ. Bot trong §2 rơi đúng vào trường hợp này.

Docs không viết thẳng câu "resume không nạp lại skill". Kết luận trên là suy luận từ hai dữ kiện ở trên, cộng với hành vi đã quan sát được trong case thực tế (session tự trích "bản 13:56"). **Cách kiểm trên máy bạn:** xem §4 bước 5.

Cách chặn: đặt nó trong prompt resume, đừng trông vào trí nhớ của người:

```text
Skill <tên> vừa được sửa. TRƯỚC KHI làm gì: đọc lại file
.claude/skills/<tên>/SKILL.md bằng Read. Bản vừa đọc thắng mọi thứ bạn nhớ từ trước.
Sau đó làm lại cả những mục trước đây bị để "cần hỏi" mà luật mới đã giải được.
```

Câu cuối quan trọng. Kinh nghiệm thực tế: chỉ đọc lại thì mới sửa được các mục **sắp làm**. Các mục đã xử lý theo luật cũ trong cùng session vẫn giữ kết quả sai nếu không bắt làm lại.

---

## 4. Làm thử

Mục tiêu: một skill `pr-gate` có script, đo được nó có tự kích hoạt đúng lúc không, và tự thấy hiện tượng bản cũ khi resume.

**Bước 1: tạo skill.** Trong một repo bất kỳ có test:

```bash
mkdir -p .claude/skills/pr-gate/scripts
```

`.claude/skills/pr-gate/SKILL.md`:

```markdown
---
name: pr-gate
description: Use before opening or updating a pull request, when the user says "mở PR",
  "ready for review", "chạy gate", "check trước khi push", or asks whether the branch is
  ready to merge. Runs the repo gate script and reports PASS/FAIL with the raw output.
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/gate.sh *)
---

# pr-gate — xanh bằng output, không bằng lời

**Kết luận chỉ dựa trên exit code và output của gate.sh. Không chạy được thì là UNVERIFIED.**

## Thay đổi so với base
!`git diff --stat main...HEAD`

## Các bước
1. Chạy `${CLAUDE_SKILL_DIR}/scripts/gate.sh`. Không chạy từng lệnh con bằng tay.
2. Dán NGUYÊN VĂN 20 dòng cuối output và exit code.
3. Kết luận: PASS (exit 0) / FAIL (exit khác 0, nêu bước hỏng) / UNVERIFIED (script không chạy được, nêu lỗi).
4. DỪNG. Không tự sửa code, không tự push. Người quyết định bước tiếp.

## Red flags
| Ý nghĩ | Sự thật |
|---|---|
| "Test lỗi không liên quan thay đổi của mình, coi như pass" | Đó là FAIL kèm ghi chú. Người quyết định có bỏ qua không |
| "Script chậm, chạy riêng lint cho nhanh" | Kết quả lint riêng không phải gate |
```

Ghi chú: base branch ghi cứng `main` để lệnh nhúng luôn chạy được. Repo dùng `master` thì sửa lại, vì lệnh nhúng lỗi là cả lần gọi skill bị huỷ (§3.5).

`.claude/skills/pr-gate/scripts/gate.sh` (sửa ba lệnh cho hợp repo của bạn):

```bash
#!/usr/bin/env bash
set -euo pipefail          # một lệnh lỗi là cả script lỗi, không bị nuốt
echo "== lint";      npm run lint
echo "== typecheck"; npx tsc --noEmit
echo "== test";      npm test
echo "GATE: PASS"
```

```bash
chmod +x .claude/skills/pr-gate/scripts/gate.sh
.claude/skills/pr-gate/scripts/gate.sh; echo "exit=$?"   # chạy tay một lần trước khi giao cho agent
```

**Bước 2: gọi tường minh.** Mở session mới, gõ `/pr-gate`. Xong khi: output có đúng 20 dòng cuối của gate, có exit code, có một trong ba verdict, và agent dừng lại.

**Bước 3: đo tự kích hoạt.** Mở **mỗi prompt một session mới**, gõ các câu dưới đây, ghi lại agent có tự gọi `pr-gate` không (transcript hiện lượt gọi Skill):

| # | Prompt | Mong đợi |
|---|---|---|
| 1 | "nhánh này mở PR được chưa?" | gọi |
| 2 | "chạy gate giúp mình" | gọi |
| 3 | "ready for review rồi, check giùm" | gọi |
| 4 | "trước khi push kiểm tra lại cái" | gọi |
| 5 | "sửa typo trong README" | không gọi |
| 6 | "giải thích hàm parseDate" | không gọi |

Không có con số chuẩn nào ở đây. Bạn tự đo tỉ lệ khớp của mình: (số dòng đúng mong đợi) / 6. Sửa description (thêm cụm từ ở các dòng 1–4 bị trượt, bỏ chữ quá rộng nếu dòng 5–6 bị gọi nhầm), rồi chạy lại **cả 6 dòng**, vì một chỉnh sửa có thể làm trượt dòng khác. Xong khi: hai lần chạy liên tiếp cho cùng kết quả 6/6.

**Bước 4: đổi chế độ gọi.** Thêm `disable-model-invocation: true`, chạy lại dòng 1. Xong khi: agent **không** tự gọi, nhưng `/pr-gate` vẫn chạy.

**Bước 5: tái hiện chuyện bản cũ.** Bỏ dòng ở bước 4. Gọi `/pr-gate` trong session A rồi thoát. Sửa `SKILL.md`: đổi "20 dòng cuối" thành "10 dòng cuối". Chạy `claude -r <id-session-A> "chạy lại gate như lúc nãy"`. Ghi lại agent dán 10 hay 20 dòng. Sau đó lặp lại, lần này kèm prompt đọc lại skill ở §3.8. Xong khi: bạn có hai transcript cho thấy hành vi trước và sau khi thêm prompt đọc lại. Nếu ngay lần đầu agent đã dán 10 dòng, ghi lại phiên bản Claude Code (`claude -v`). Đó là dữ kiện có ích: hành vi này đổi theo phiên bản.

**Bước 6 (tuỳ chọn): Codex.** `mkdir -p .agents/skills && cp -r .claude/skills/pr-gate .agents/skills/`. Trong Codex CLI gõ `$pr-gate` hoặc dùng `/skills`. Lưu ý: Codex không hiểu `${CLAUDE_SKILL_DIR}`, `allowed-tools` hay `` !` ` `` (đó là trường và cú pháp của Claude Code). Thay bằng đường dẫn tương đối `.agents/skills/pr-gate/scripts/gate.sh` trong bản cho Codex.

---

## 5. Bẫy thường gặp

**Skill có mà không bao giờ được gọi.**
Triệu chứng: bạn phải tự gõ `/tên` mọi lần, hoặc quên luôn là có skill.
Nguyên nhân gốc: description nói skill *là gì* chứ không nói *khi nào dùng*. Hoặc các cụm kích hoạt nằm sau ký tự thứ 1.536 và bị cắt.
Chặn: bảng prompt kích hoạt ở §4 bước 3 lưu thành file cạnh skill, chạy lại mỗi lần sửa description. Đưa trường hợp dùng chính lên câu đầu.

**Skill có tác dụng phụ bị agent tự gọi.**
Triệu chứng: agent tự chạy skill deploy/gửi tin nhắn vì "có vẻ bạn muốn vậy".
Nguyên nhân gốc: mặc định agent được tự gọi mọi skill có description khớp.
Chặn: `disable-model-invocation: true` cho mọi skill ghi ra bên ngoài repo. Thêm `allowed-tools` hẹp, chỉ đúng script cần chạy. Chặn cứng bằng permission/hook là việc của [[ag-08-hook-va-chan-bang-cau-hinh]].

**Skill thừa hưởng giả định của sự cố sinh ra nó.**
Triệu chứng: skill chạy tốt với đúng loại việc gốc, các loại khác bị bỏ qua hoặc kẹt, và output dự kiến của skill không bao giờ xuất hiện.
Nguyên nhân gốc: khái quát từ một mẫu duy nhất (§3.7).
Chặn: trước khi merge skill, chạy nó trên ít nhất hai kịch bản **khác loại** sự cố gốc. Đặt một phép đếm lượt dùng thật, và đặt mốc review có ngày cụ thể.

**Luật "ô trống thì dừng" mà không có lối ra hợp lệ.**
Triệu chứng: agent bịa số cho đủ ô, hoặc người bỏ qua cả skill.
Nguyên nhân gốc: gate đòi một thứ không đo được với một loại việc, và không cho cách nào khai điều đó ra.
Chặn: thêm trạng thái `CHƯA ĐO` / `UNVERIFIED` hợp lệ, bắt kèm bằng chứng đã thử (tên dụng cụ, lệnh, lỗi). Cách thiết kế tiêu chí đo được nói kỹ ở [[ag-10-done-criteria-va-gate]].

**Session resume làm theo bản skill cũ.**
Triệu chứng: đã commit luật mới mà bot hoặc session dài vẫn làm theo luật cũ, đôi khi tự trích "bản HH:MM".
Nguyên nhân gốc: nội dung skill đã gọi nằm trong lịch sử hội thoại. Resume nối tiếp lịch sử đó (§3.8).
Chặn: mọi chỗ code gọi `--resume` sau khi harness có thể đã đổi thì chèn prompt "đọc lại file skill, bản mới thắng, làm lại các mục luật mới giải được". Hoặc bỏ resume, mở session mới với state lấy từ file.

**`` !`lệnh` `` lỗi và cả skill im lặng không chạy.**
Triệu chứng: gõ `/tên` mà agent không làm theo skill, hoặc báo lần gọi bị huỷ.
Nguyên nhân gốc: theo docs, lệnh nhúng lỗi hoặc không qua được permission thì cả lần gọi bị huỷ.
Chặn: chỉ nhúng lệnh chỉ-đọc, chắc chắn chạy được ở mọi trạng thái repo (`git diff --stat`, không phải lệnh cần mạng). Duyệt sẵn bằng `allowed-tools`. Chạy tay lệnh đó một lần ở trạng thái repo "xấu nhất" (nhánh mới tạo, chưa có commit nào).

**Skill trỏ đường dẫn máy cá nhân.**
Triệu chứng: skill chạy trên máy người viết, máy đồng đội thì hỏng.
Nguyên nhân gốc: script và credential nằm ở thư mục riêng của một người. Case thực tế: skill kiểm A/B ghi rõ trong tradeoff là "người khác chưa dùng được" vì script trỏ vào repo ghi chú cá nhân.
Chặn: script để trong thư mục skill và gọi qua `${CLAUDE_SKILL_DIR}`. Credential đọc từ biến môi trường của từng người. Muốn dùng cho cả team thì chuyển skill vào `.claude/skills/` của repo app.

**Skill dài nhồi hết vào `SKILL.md`.**
Triệu chứng: quy tắc ở cuối file bị lờ đi sau khi session dài bị nén context.
Nguyên nhân gốc: compaction chỉ giữ 5.000 token đầu mỗi skill (docs).
Chặn: nguyên tắc và điểm dừng đặt ở đầu file, bảng tra cứu và query chuyển sang `references/`, `SKILL.md` dưới 500 dòng.

---

## 6. Chuyển giao

- Skill vẫn là **lời khuyên có cấu trúc**: agent có thể không gọi, hoặc gọi rồi bỏ bước. Bài [[ag-08-hook-va-chan-bang-cau-hinh]] chuyển những luật không được vi phạm sang hook và permission, là thứ agent không lách được bằng cách "quên".
- Skill dùng `allowed-tools` và script. [[ag-09-mcp]] nối agent với hệ thống ngoài repo, nơi các skill như kiểm A/B lấy dữ liệu và browser.
- Kết luận PASS/FAIL/UNVERIFIED và bảng Red flags là mầm của Level 4. [[ag-10-done-criteria-va-gate]] biến "xong" thành lệnh chạy được. [[ag-12-verifier-doc-lap]] giao việc chấm cho một agent khác, vì agent tự chạy skill rồi tự chấm thì vẫn là tự khẳng định lại giả định của mình.
- Ở Level 6, chính vòng loop cũng là một skill ([[ag-19-vong-lap-nhat-task]]). Ở Level 7, việc sửa skill được giao cho một quy trình retro có số đo và người duyệt ([[ag-24-harness-tu-cai-tien]]). Phép đếm lượt dùng ở §3.7 là dạng đơn giản nhất của nó.

Level 3 bỏ được việc **dặn lại quy trình mỗi session**. Thay vào đó là một file mà agent tự tìm thấy qua description và chạy giống nhau mọi lần qua script. Thứ bạn vẫn phải làm ở level này: tự đọc kết quả. Level 4 bỏ nốt việc đó.

---

## 7. Tóm tắt

- Skill là thư mục có `SKILL.md`. Đặt ở `.claude/skills/<tên>/` (Claude Code) hoặc `.agents/skills/<tên>/` (Codex). Ghi đủ `name` + `description` thì một file chạy được trên cả hai.
- Nạp theo ba tầng: description luôn nằm trong context, thân skill chỉ nạp khi được gọi, file phụ trợ nạp khi agent đọc. Skill dài chỉ tốn context ở session dùng nó.
- Description quyết định skill có được tự gọi hay không. Viết theo "khi nào dùng" kèm cụm từ người dùng hay gõ, đặt trường hợp dùng chính lên đầu (bị cắt ở 1.536 ký tự).
- Skill có tác dụng phụ thì đặt `disable-model-invocation: true`. Slash command và skill giờ là một cơ chế, trùng tên thì skill thắng.
- Phần tất định đưa vào script gọi qua `${CLAUDE_SKILL_DIR}`. Model chỉ giữ phần phán đoán.
- Skill viết từ một sự cố thì mang giả định của sự cố đó. Kiểm bằng phân bố việc thật, bằng kịch bản khác loại, và bằng việc output của skill có tồn tại không.
- Resume nối tiếp lịch sử có chứa bản skill cũ. Prompt resume phải bắt đọc lại file và làm lại các mục luật mới giải được.
