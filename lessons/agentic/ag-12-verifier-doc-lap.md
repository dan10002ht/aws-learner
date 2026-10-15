# Bài 12 — Verifier: một agent khác chấm bài

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích bằng cơ chế vì sao **agent vừa viết code (hoặc agent vừa giao việc viết code) không chấm được bài của chính nó**, kể cả khi đã được dặn "đừng tin report".
- Viết một file định nghĩa subagent `verifier` cho Claude Code với ba tính chất kiến trúc: **context sạch, không quyền ghi, verdict ba trạng thái** — và chỉ ra chỗ quyền ghi vẫn rò qua `Bash`.
- Phân loại một kết quả kiểm thành `PASS` / `FAIL` / `UNVERIFIED` theo quy tắc, và nói được vì sao "không tái hiện được lỗi" là `UNVERIFIED` chứ không phải `PASS`.
- Dựng một phép A/B **trên cùng dữ liệu** (trước fix / sau fix / ca liền kề) bằng đường chỉ-đọc `git archive`, không `stash`/`checkout`.
- Thiết kế một **agent mutation** tách khỏi verifier để chứng minh test có bắt lỗi thật, với kỷ luật khôi phục kiểm bằng `md5`.
- Kiểm được brief có thật sự tới prompt của agent hay không bằng **chuỗi mồi**.

---

## 2. Tình huống

Một repo backend thanh toán định kỳ. Một dev chạy loop agent: mỗi task một subagent viết code, rồi **main agent** (agent điều phối, chính là agent đã spawn subagent đó) chạy test, đọc diff, thấy hợp lý thì commit. Prompt của main agent có sẵn câu "Không tin report của subagent — tự verify".

Ba tuần sau, dev đọc lại nhật ký và gom lỗi lọt thành nhóm. Có bốn họ lỗi lặp đi lặp lại, và **cả bốn đều là lỗi kiểm, không phải lỗi điều phối** (kinh nghiệm thực tế, ba tuần digest của một người):

1. Sửa 1 trong 6 chỗ dùng cùng một pattern, 5 chỗ còn lại vẫn lỗi.
2. Đọc sai nguồn dữ liệu — code đọc một field nằm ở tầng khác của object, luôn ra rỗng.
3. Tin report của subagent ("đã fix, test pass") thay vì tự chạy.
4. Gate báo xanh trong khi subagent đã chết giữa chừng.

Dev tách bước kiểm sang một subagent riêng, context sạch, không có quyền sửa file. Số lỗi lọt giảm. Rồi tới ca này:

> Bug report: "lần thu tiền bị từ chối không bao giờ được thử lại". Agent sửa điều kiện retry, thêm test cho trạng thái bị từ chối. Cổng kiểm đỏ→xanh: test mới đỏ trên code cũ, xanh trên code mới. Verifier độc lập chạy lại cả suite: **42/42 test xanh**. Verdict PASS, MR được mở.
>
> Bản sửa đã đổi `== "error"` thành kiểu `!= "success"`. Từ đó, một lần thu tiền **đang chờ khách xác thực 3DS** (trạng thái pending, chưa thành công cũng chưa thất bại) cũng bị coi là "cần thử lại". Thử lại một khoản đang pending nghĩa là có thể thu hai lần.

(Case thực tế, một lần xảy ra; con số 42/42 là số test của repo đó lúc ấy.)

Verifier ở đây **đã độc lập**, đã chạy gate thật, đã đọc output thật. Nó vẫn PASS một bản sửa sai.

---

## ⏸ Dừng lại — đoán trước

Verifier context sạch, không sửa được file, chạy suite thật và trích nguyên văn "42 passed". **Thiếu đúng một bước nào để nó bắt được lỗi pending?**

```
(a) Cho verifier đọc toàn bộ lịch sử hội thoại của agent viết code để hiểu ý đồ
(b) Bắt verifier chạy lại chính triệu chứng trên code TRƯỚC fix và SAU fix với cùng dữ liệu, cộng một ca liền kề
(c) Đổi verifier sang model mạnh hơn
(d) Tăng coverage lên 100% dòng
```

Đáp án và lý do nằm ở §3.5. Câu (d) đáng nghĩ kỹ: bản `!= "success"` chạy qua mọi dòng code của hàm — coverage dòng đã 100%.

---

## 3. Cơ chế

### 3.1 Vì sao tự chấm không phải là gate

**Verifier** (agent kiểm) trong bài này nghĩa là: một agent riêng, chỉ có một việc — trả lời "thay đổi này có đạt tiêu chí xong không" bằng bằng chứng chạy được, và không làm gì khác.

Main agent tự kiểm hỏng vì ba lý do, cả ba là cấu trúc chứ không phải thái độ:

- **Nó mang context của người viết.** Nó đã đọc brief, đã thấy subagent giải thích hướng sửa, đã "hiểu" vì sao đổi `==` sang `!=`. Khi đọc diff, nó đọc bằng chính lời giải thích đó. Một người review đã nghe tác giả thuyết trình 20 phút cũng gặp đúng vấn đề này.
- **Nó có động cơ đóng việc.** Main agent của một loop được đo bằng task xong. "Xong" là trạng thái nó muốn đạt; cấu trúc này giống để người viết code tự duyệt MR của mình.
- **Lời dặn trong prompt là gợi ý, không phải ràng buộc.** "Không tin report — tự verify" đã nằm sẵn trong prompt ở §2 và vẫn lọt (kinh nghiệm thực tế). Model có thể lướt qua một câu văn; nó không thể dùng một tool mà nó không được cấp.

Cách sửa vì vậy phải là **kiến trúc**: tách sang một context không thấy quá trình viết, và tước quyền sửa. Đây cùng nguyên lý với harness generator → evaluator: evaluator thấy context của generator thì nó không còn độc lập. Cái giá (kinh nghiệm thực tế): thêm một agent mỗi task, và verifier sẽ FAIL nhiều hơn main agent từng FAIL — nhiều task quay lại hàng đợi hơn. Đó là dấu hiệu gate bắt đầu có răng, không phải dấu hiệu hỏng.

### 3.2 Ba tính chất kiến trúc, và file định nghĩa

Theo docs Claude Code (Subagents — `https://code.claude.com/docs/en/sub-agents`):

- *"Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions."* Subagent không phải fork *"starts with a fresh, isolated context window. It doesn't see your conversation history"*. Nó chỉ nhận **delegation message** (tin nhắn giao việc) do main agent soạn, cộng system prompt trong file định nghĩa, cộng các file CLAUDE.md.
- File định nghĩa đặt ở `.claude/agents/` (theo project, nên commit vào repo) hoặc `~/.claude/agents/` (dùng cho mọi project). Trùng tên thì bản ở vị trí ưu tiên cao hơn thắng; project đứng trên user.
- Chỉ `name` và `description` là bắt buộc. `tools` là danh sách cho phép; **bỏ trống thì subagent kế thừa mọi tool**. Có thêm `disallowedTools` (loại tool khỏi danh sách), `model`, `effort` (`low`…`max`), `color`.
- Main agent tự giao việc cho subagent khi task khớp `description`; bạn cũng có thể gọi đích danh bằng cách gõ `@` rồi chọn subagent.
- Main agent chỉ nhận lại **kết quả cuối** của subagent, không nhận các lượt tool của nó.

Ba tính chất cần có:

| Tính chất | Cơ chế thực thi | Nó chặn được gì |
|---|---|---|
| Context sạch | Subagent không phải fork → không thấy hội thoại | Đọc diff bằng lời giải thích của người viết |
| Không quyền ghi | `tools: Read, Grep, Glob, Bash` — không có `Edit`, `Write` | "Sửa cho xanh" rồi báo PASS |
| Verdict ba trạng thái | Format báo cáo bắt buộc trong system prompt | Gate không chạy được bị đọc thành gate pass |

File mẫu, dùng được ngay — lưu thành `.claude/agents/verifier.md`:

```markdown
---
name: verifier
description: Kiểm chứng độc lập một thay đổi code ĐÃ XONG — chạy done-criteria thật, dựng lại lỗi trước/sau fix trên cùng dữ liệu, quét chỗ tương tự còn sót, trả PASS/FAIL/UNVERIFIED kèm bằng chứng. Dùng sau khi implement, trước khi commit. Không sửa code.
tools: Read, Grep, Glob, Bash
model: sonnet
color: red
---

Bạn là verifier độc lập. Việc duy nhất: trả lời "thay đổi này có đạt done-criteria không"
bằng bằng chứng chạy được.

Cấm: sửa file, tạo file trong repo, git add/commit/checkout/switch/stash/reset/push.
Git chỉ được: status, diff, log, show, archive.

Nguyên tắc:
1. Mọi câu dạng "đã fix", "test pass" trong brief là TUYÊN BỐ CẦN KIỂM, không phải sự thật.
   Diff và output lệnh do main agent dán vào là dữ liệu máy — dùng thẳng, không dựng lại.
2. Ground truth = exit code + output thật. Trích nguyên văn dòng output quyết định.
3. Gate deterministic trước (typecheck → build → test → lint), đọc diff sau.
4. Gate không chạy được (timeout, thiếu dependency, output rỗng bất thường) → UNVERIFIED.
5. Task có triệu chứng → bắt buộc A/B:
   - lấy code trước thay đổi: git archive <sha-trước> | tar -x -C <thư-mục-tạm>
   - 01 BEFORE: cùng dữ liệu, code trước fix → phải thấy lỗi
   - 02 AFTER: cùng dữ liệu đó, code sau fix → lỗi hết
   - 03 ADJACENT: một ca liền kề (trạng thái/đường đi gần nhất) vẫn đúng
   Không dựng lại được lỗi ở 01 → UNVERIFIED.
6. Quét chỗ tương tự: grep theo CÔNG DỤNG của pattern vừa sửa, liệt kê file:line còn sót.
7. Kiểm `git status --porcelain`: file ngoài scope, file untracked bị quên.

Báo cáo (bắt buộc đúng format):
VERDICT: PASS | FAIL | UNVERIFIED
## Gate        — lệnh → exit code, dòng output nguyên văn
## A/B         — 01 / 02 / 03, nguyên văn
## Findings    — mô tả, file:line, bằng chứng
## Chưa xác minh — cái gì, vì sao

Không đề xuất cách sửa. Không khen. Không tóm tắt lại thay đổi.
```

Hai chi tiết đáng chú ý. `description` bắt đầu bằng "đã xong" và "sau khi implement" để main agent không gọi verifier giữa chừng. Và `Bash` vẫn có mặt — verifier cần chạy test. Hệ quả nằm ở §5, bẫy 1.

Codex CLI có đường tương đương cho chế độ không tương tác: theo docs Codex (`https://learn.chatgpt.com/docs/non-interactive-mode`), *"By default, `codex exec` runs in a read-only sandbox"*, và `--output-schema` ép câu trả lời cuối theo một JSON Schema. Chạy verifier bằng một họ model khác người viết code là chủ đề của [[ag-16-hai-ho-model]].

### 3.3 Verdict ba trạng thái, và luật không đôn

Hai trạng thái PASS/FAIL ép mọi kết quả "không biết" phải rơi vào một bên. Trong thực tế nó rơi vào PASS, vì "không thấy lỗi" trông giống "không có lỗi". `UNVERIFIED` tồn tại để có chỗ đặt "không biết".

| Tình huống | Verdict | Lý do |
|---|---|---|
| Mọi gate xanh, A/B đủ 01–02–03, không finding | PASS | Có bằng chứng ở cả hai chiều |
| Một gate đỏ | FAIL | — |
| Gate xanh nhưng grep thấy 5/6 chỗ cùng pattern chưa sửa | FAIL | Finding thật có `file:line` |
| 01 dựng lại được lỗi, 02 vẫn còn lỗi | FAIL | Đây là ca gate xanh đã bỏ lọt |
| Test timeout / thiếu credential / output rỗng | UNVERIFIED | Gate không chạy ≠ gate pass |
| Không dựng lại được lỗi trên code trước fix | UNVERIFIED | Chưa biết fix có chạm đúng lỗi không |

**Luật: `UNVERIFIED` không bao giờ được đôn lên `PASS`** — không bởi verifier, không bởi main agent đọc báo cáo. Nó chuyển sang người (test tay) hoặc quay về hàng đợi.

Khi verdict là FAIL, việc tiếp theo không thuộc về verifier. Một vòng thường gặp (kinh nghiệm thực tế, một skill loop): finding nguyên văn → giao lại **đúng một vòng** cho agent viết code → verify lại → vẫn đỏ thì đánh dấu blocker, trả task về hàng đợi. Chặn ở một vòng vì loop chạy nền không được quay vô hạn đốt token.

### 3.4 Bằng chứng phải phân biệt được fix đúng với fix sai

Đây là luật đứng sau mọi bước còn lại:

> Một bằng chứng chỉ đáng tin khi nó cho **kết quả khác nhau** giữa "ổn" và "hỏng". Nếu cả hai trường hợp ra cùng một quan sát, bạn có một sự im lặng, không phải bằng chứng.

Áp vào §2: "42/42 test xanh" ra y hệt cho bản sửa đúng (`in ("failed", "error")`) và bản sửa sai (`!= "success"`), vì không test nào cho đầu vào `pending`. Nó không chọn được giữa hai giả thuyết, nên nó không chứng minh bản sửa đúng.

Bảng tra các lời khai hay gặp từ agent (kinh nghiệm thực tế, gom từ nhiều phiên):

| Lời khai | Vì sao chưa chứng minh gì | Bằng chứng phân biệt được |
|---|---|---|
| "Test xanh" | Bản đúng và bản sai đều xanh nếu test không chạm ca biên | Mutation: phá code, test có đỏ không (§3.6) |
| "Gate đỏ là lỗi có sẵn" | Repo chính cũng đỏ — nhưng có thể vì cùng thiếu một file env | Chạy gate trên base sạch, đối chiếu file fail với `git diff --name-only` |
| "Không thấy log lỗi" | Đường code đó có thể không log | Một field trên chính bản ghi (`updatedAt` có đổi không) |
| "Agent báo success" | Agent chết giữa chừng vẫn có thể để lại report xanh | Ground truth trên đĩa: đếm file, `git diff --stat`, build thật |
| "Verifier PASS" cho thay đổi UI | Verifier trace được code, không thấy pixel | Ảnh chụp màn hình — xem [[ag-13-kiem-ui-bang-anh]] |

Một dấu hiệu rẻ để bắt phép đo hỏng: **hai lần chạy ở hai trạng thái khác nhau mà output trùng từng chữ.** Case thực tế (một lần): một cổng đỏ→xanh checkout bước "đỏ" theo SHA nhưng bước "xanh" theo **tên nhánh**. Agent viết code đã đổi tên nhánh, lệnh checkout thất bại, hàm chạy lệnh không bao giờ báo lỗi, nên bước "xanh" chạy lại đúng commit chưa sửa và ra đúng output đỏ. Cổng chặn oan một bản sửa mà chạy tay ra 42/42 pass. Đuôi log của hai bước giống hệt nhau — hai commit khác nhau không thể cho output trùng từng chữ. Bài học cơ chế: **mọi phép so hai trạng thái phải neo vào SHA**, không vào tên nhánh — tên nhánh là con trỏ ai cũng đổi được.

### 3.5 Dựng lại lỗi trước fix: A/B trên cùng dữ liệu

Đáp án câu đoán trước là **(b)**. Gate xanh chỉ chứng minh *không làm vỡ thêm thứ đã có test*. Nó không chứng minh triệu chứng đã hết, và không chứng minh bản sửa không nuốt một ca liền kề. Không bước nào trong verifier ở §2 buộc nó chạm vào chính triệu chứng.

(a) sai vì đó chính là thứ phá tính độc lập. (c) không giúp: model mạnh hơn vẫn chỉ đọc được output của các test đang có. (d) sai vì coverage dòng đo "dòng nào đã chạy", không đo "đầu vào nào đã thử" — `!= "success"` là một dòng, chạy một lần là phủ.

Ba mục bắt buộc cho mọi task xuất phát từ một triệu chứng:

```
01 BEFORE   — cùng dữ liệu, cùng bước, code TRƯỚC fix: <lỗi hiện ra, nguyên văn>
02 AFTER    — ĐÚNG dữ liệu đó, code SAU fix:         <đã đúng, nguyên văn>
03 ADJACENT — một ca liền kề vẫn đúng:              <nguyên văn>
```

"Cùng dữ liệu" là phần đắt nhất và dễ bỏ nhất. Đổi dữ liệu giữa hai lần chạy thì A/B chỉ chứng minh hai lần chạy khác nhau ra kết quả khác nhau.

Ca liền kề chọn bằng câu hỏi: *bản sửa đổi một điều kiện — giá trị nào nằm ngay cạnh ranh giới của điều kiện đó?* Sửa `status == "error"` thì ca liền kề là mọi trạng thái khác không phải `success`: `pending`, `refunded`, `cancelled`. Đây là chỗ bắt được lỗi ở §2.

Verifier không được git mutation, nên lấy code trước fix bằng **đường chỉ-đọc**:

```bash
# Chạy được — giả định repo hiện tại, BASE là SHA trước thay đổi
BASE=$(git rev-parse HEAD~1)
DATA="$PWD/attempts.json"                 # một file dữ liệu, dùng cho cả 01 và 02
T=$(mktemp -d)
git archive "$BASE" | tar -x -C "$T"      # bản sao code cũ, không đụng worktree đang review
(cd "$T" && python3 repro.py "$DATA")     # 01: code cũ, dữ liệu chung
python3 repro.py "$DATA"                  # 02: code mới, cùng dữ liệu
```

Vì sao không `git stash` / `git checkout`: worktree đang review có thể chứa thay đổi chưa commit của task khác, hoặc nhánh đang bị khoá bởi worktree khác. Một lệnh `checkout -- <file>` đã từng xoá mất diff của một task song song (kinh nghiệm thực tế, một lần). Chi tiết va chạm worktree ở [[ag-15-worktree-va-xung-dot]].

**Không dựng lại được lỗi ở 01 → `UNVERIFIED`.** Câu "tôi không tái hiện được lỗi" thường bị đọc thành "bản sửa ổn"; nghĩa thật của nó là *chưa biết bản sửa có chạm đúng lỗi không*. Verifier phải ghi đã thử dựng bằng cách nào và thiếu gì (thiếu dữ liệu, thiếu credential, cần app chạy thật) — dòng đó là thứ người đọc dùng để quyết định có cần test tay.

Khối A/B nên đi thẳng vào body của commit. Kinh nghiệm thực tế: với nhánh một commit, form mở PR/MR thường điền sẵn mô tả từ message commit, nên bằng chứng đi theo thay đổi mà không ai phải chép lại. Cái giá: người quen `git log --oneline` sẽ không thấy phần đó.

### 3.6 Tách agent mutation: phá code để đo test

**Mutation testing** (kiểm đột biến) là cố ý làm hỏng code rồi xem test có đỏ không. Test vẫn xanh trên code đã hỏng nghĩa là test đó không canh gì cả. Đây là thứ duy nhất phân biệt "test xanh" với "test có guard".

Case thực tế (một phiên, một repo dịch vụ ticket): đổi một key từ `eventId:` thành `event_id:` trong code — **314 test vẫn xanh**. Ở phiên đó, brief vừa cấm verifier sửa file, vừa bắt nó tự làm thí nghiệm ngược. Verifier chọn tuân lệnh cấm, ghi "chưa xác minh" vào một dòng chú thích, và một test vô dụng (assert một helper qua reflection thay vì assert call site thật) suýt đi qua với verdict PASS. **Lỗi thiết kế brief hiện ra dưới dạng một dòng chú thích dễ bỏ qua, không phải một FAIL ồn ào.**

Cách sửa không phải cấp `Edit` cho verifier — làm vậy là mở lại đúng cánh cửa "sửa cho xanh". Cách sửa là tách vai:

1. `verifier` (chỉ đọc + chạy) ra verdict.
2. Nếu verdict phụ thuộc vào câu "test này có thật sự bắt lỗi không", giao một **agent mutation** riêng có quyền `Edit`, với kỷ luật khôi phục:

```bash
# Kỷ luật của agent mutation — chạy được
F=billing.py
SNAP="${TMPDIR:-/tmp}/mut-$$"; mkdir -p "$SNAP"
cp "$F" "$SNAP/$F.orig"; BEFORE=$(md5sum "$F" 2>/dev/null || md5 -q "$F")

# 1 mutation = 1 thay đổi nhỏ, có tên
sed -i.bak 's/!= "success"/in ("failed", "error")/' "$F" && rm -f "$F.bak"
python3 -m unittest -q; echo "exit=$? (mutation: chỉ retry failed/error)"

cp "$SNAP/$F.orig" "$F"
AFTER=$(md5sum "$F" 2>/dev/null || md5 -q "$F")
[ "$BEFORE" = "$AFTER" ] && echo "RESTORED" || echo "RESTORE FAILED — dừng mọi việc"
```

Brief cho agent mutation cấm tường minh `git checkout -- <file>` và `git stash` — khôi phục chỉ bằng bản `cp` của chính nó, kiểm bằng `md5`.

Đọc kết quả mutation thế nào: mutation đổi hành vi với `pending` mà test vẫn `exit=0` → **test không phân biệt được hai bản sửa** → chính "42/42 xanh" là bằng chứng vắng mặt. Kết quả này là finding gửi về main agent, không phải lý do verifier đổi verdict sang PASS.

Chi phí: thêm một lượt agent cho mỗi task cần chứng minh test. Và agent mutation tự chạy thí nghiệm của nó vẫn là tự chấm một phần; khi kết quả đó quyết định merge, có thể cần thêm một context độc lập đọc lại — chuỗi dài ra nếu không tự giới hạn (kinh nghiệm thực tế).

### 3.7 Brief cho verifier: thứ duy nhất nó biết

Verifier chỉ biết những gì delegation message mang tới. Ba luật:

**Không dán report của agent viết code dưới dạng sự thật.** Cần đưa thì gắn nhãn `TUYÊN BỐ CẦN KIỂM:`. Report kiểu "đã fix xong, chỉ đụng 1 file" mà không nhãn sẽ được đọc như dữ kiện.

**Diff và output lệnh là dữ liệu máy — dán thẳng.** "Không tin lời ai" áp vào câu văn, không áp vào `git diff`. Dán diff vào brief để verifier khỏi `cat` lại từng file — mỗi lần đọc lại là một lượt model (số đo ở §3.8).

**Kiểm brief có thật sự tới prompt.** Case thực tế (một lần, trong chính repo course này): một skill audit được gọi với brief rất cụ thể — 4 domain, danh sách service phải soi. Kết quả về đúng schema, có verdict, có điểm coverage 78–86, đọc trôi chảy. Nhưng nó **không nhắc tới một service nào** trong danh sách trọng tâm. Nguyên nhân: script của skill không dùng biến `args` — `grep -c args` ra 0 — nên brief dừng ở tool call, mỗi agent chạy prompt mặc định. Một agent chạy prompt mặc định vẫn đọc đúng file, trả đúng schema, nên mọi kiểm cấu trúc đều xanh. Ba phép kiểm phân biệt được:

| Phép kiểm | Cách làm |
|---|---|
| Rẻ nhất | `grep -n 'args' <script>` — 0 thì brief chưa bao giờ tới agent |
| Chuỗi mồi | Nhét một token vô nghĩa (`XREF-7731`) vào brief, yêu cầu agent trích lại ở dòng đầu báo cáo |
| Đối chiếu nội dung | Lấy 3 mục đặc thù nhất của brief, grep trong báo cáo — trùng 0 là tín hiệu đủ mạnh |

Mẫu brief giao cho verifier (minh hoạ cấu trúc, thay giá trị của bạn):

```text
ECHO: XREF-7731   (trích lại chuỗi này ở dòng đầu báo cáo)

Repo: <đường dẫn tuyệt đối tới worktree>   — mọi lệnh: cd <path> && <lệnh>
SHA trước thay đổi: 3f2a91c   SHA sau: 8be04d7
Triệu chứng: lần thu tiền trạng thái "failed" không bao giờ được retry.
Dữ liệu tái hiện: attempts.json (4 bản ghi: success, failed, pending, error)
Done-criteria: python3 -m unittest  → exit 0
Diff (dữ liệu máy):
<dán git diff 3f2a91c 8be04d7>
TUYÊN BỐ CẦN KIỂM: "đã fix, chỉ đụng billing.py và test_billing.py"
CHƯA KIỂM TRA ĐƯỢC: hành vi với trạng thái pending
```

Dòng `cd <path> && <lệnh>` không thừa: trong một số môi trường, thư mục làm việc bị reset giữa các lượt Bash của subagent, và verifier chấm nhầm repo chính thay vì worktree là lỗi đã gặp (kinh nghiệm thực tế).

### 3.8 Chi phí, và phân tầng phạm vi soi

Verifier không miễn phí. Số đo từ một người dùng (kinh nghiệm thực tế: 242 lần verify, bóc tách được 76, trong 3 ngày — không phải benchmark): median **74 lượt model, 37 lệnh Bash, 6,6 phút** mỗi lần; **68% thời gian là round-trip model**, không phải thời gian lệnh chạy; **74% số lệnh Bash là đọc lại code** (`cat`, `sed -n`, `grep`, `git diff`).

```text
# tính lại bằng python3, trên số median ở trên
round-trip model   = 6.6 × 0.68 ≈ 4.5 phút / lần verify
lệnh đọc lại code  = 37 × 0.74 ≈ 27 lệnh / lần verify
10 task/ngày → 66 phút verifier  (1.1 giờ)
20 task/ngày → 132 phút          (2.2 giờ)
40 task/ngày → 264 phút          (4.4 giờ)
```

Hai hệ quả. Một: verifier chậm vì **nhiều lượt**, không vì mỗi lượt chậm — cắt lượt bằng cách dán diff vào brief và gộp các lệnh đọc vào một lệnh Bash (`for f in a b c; do echo "=== $f"; sed -n '1,80p' "$f"; done`). Hai: cái **không được cắt** là thí nghiệm tự nghĩ ra — gỡ fix chạy lại, đếm test trước/sau, kiểm nguồn dữ liệu thật. Cắt lượt là cắt phần đi tìm lại thứ đã có, không phải cắt phần kiểm.

Khi chi phí vẫn quá cao, một cách đã dùng (kinh nghiệm thực tế, một skill loop) là **phân tầng phạm vi soi theo độ rộng thay đổi**, giữ nguyên tính độc lập:

| Hạng | Khi nào | Brief giao cho verifier |
|---|---|---|
| Hẹp | Delta 1 file, hoặc vòng sửa đúng một finding | Gate + đúng finding đó |
| Trung | Task thường | Gate + 3–4 điểm nghi đã nêu tên |
| Cao | Refactor rộng, đụng file dùng chung (locale, constants, config), đụng tiền hoặc gửi mail ra ngoài | Soi đầy đủ, không rút gọn |

Lý do có phân tầng: trong một ngày làm việc, có lần verifier chạy 7,7 phút cho một delta một file, và một task phải qua 4 vòng verifier mới PASS — trong khi các finding thật sự cứu việc đều đến từ task diện rộng (kinh nghiệm thực tế, một ngày). Tiêu chí lên hạng cao xét theo **loại file bị đụng**, không theo số dòng: một dòng sửa trong file locale dùng chung vẫn là hạng cao.

Rủi ro của phân tầng: bên chọn hạng là main agent — chính bên vừa giao việc viết code. Nó chỉ chọn *phạm vi*, không chọn *verdict*, nhưng đó vẫn là một dạng tự chấm. Cách đo: định kỳ đếm bug lọt qua task được verify ở hạng hẹp; có bug lọt thì siết tiêu chí hoặc bỏ phân tầng.

---

## 4. Làm thử

Mục tiêu: dựng lại đúng ca §2 trên máy bạn, cho verifier chấm, và thấy nó FAIL vì ca liền kề — rồi thấy một verifier thiếu bước A/B thì PASS.

**Bước 1 — Dựng repo** (chạy được, cần `git` và `python3`):

```bash
mkdir ag12-lab && cd ag12-lab && git init -q
printf '__pycache__/\n' > .gitignore

cat > billing.py <<'EOF'
def should_retry(attempt):
    """Có nên thử thu tiền lại lần nữa không."""
    return attempt["status"] == "error"
EOF

cat > attempts.json <<'EOF'
[
  {"id": "a1", "status": "success"},
  {"id": "a2", "status": "failed"},
  {"id": "a3", "status": "pending"},
  {"id": "a4", "status": "error"}
]
EOF

cat > repro.py <<'EOF'
import json, sys
from billing import should_retry
for a in json.load(open(sys.argv[1] if len(sys.argv) > 1 else "attempts.json")):
    print(a["id"], a["status"], "RETRY" if should_retry(a) else "skip")
EOF

cat > test_billing.py <<'EOF'
import unittest
from billing import should_retry

class T(unittest.TestCase):
    def test_success_khong_retry(self):
        self.assertFalse(should_retry({"status": "success"}))
    def test_error_retry(self):
        self.assertTrue(should_retry({"status": "error"}))
    def test_failed_retry(self):
        self.assertTrue(should_retry({"status": "failed"}))

if __name__ == "__main__":
    unittest.main()
EOF
git add -A && git commit -qm "base + test cho failed (đang đỏ)"
```

**Bước 2 — Commit một bản sửa sai** (giống §2):

```bash
sed -i.bak 's/== "error"/!= "success"/' billing.py && rm billing.py.bak
git commit -qam "fix: retry failed attempts"
python3 -m unittest      # Ran 3 tests ... OK
```

**Bước 3 — Tự chạy A/B bằng tay trước**, để biết đáp án trước khi hỏi agent:

```bash
T=$(mktemp -d); git archive HEAD~1 | tar -x -C "$T"
echo "--- 01 BEFORE"; (cd "$T" && python3 repro.py "$OLDPWD/attempts.json")
echo "--- 02 AFTER";  python3 repro.py attempts.json
```

Output mong đợi (đã chạy thử):

```text
--- 01 BEFORE
a1 success skip
a2 failed skip        ← triệu chứng dựng lại được
a3 pending skip
a4 error RETRY
--- 02 AFTER
a1 success skip
a2 failed RETRY       ← triệu chứng hết
a3 pending RETRY      ← ca liền kề hỏng: pending bị thu lại
a4 error RETRY
```

**Bước 4 — Hai verifier, cùng một bài.**

1. Tạo `.claude/agents/verifier.md` từ mẫu ở §3.2.
2. Tạo `.claude/agents/verifier-gate-only.md`: copy file trên, đổi `name: verifier-gate-only`, **xoá nguyên tắc 5** (A/B).
3. Ghi `git status --porcelain | md5sum` (macOS: `| md5`) ra giấy.
4. Mở Claude Code trong repo, gọi từng verifier bằng `@`, cùng một brief theo mẫu §3.7 (có `ECHO: XREF-7731`, có SHA trước/sau, triệu chứng, `attempts.json`, diff).

**Tiêu chí "xong" — kiểm được:**

- [ ] Cả hai báo cáo có `XREF-7731` ở dòng đầu (brief tới prompt).
- [ ] `verifier` trả `VERDICT: FAIL`, mục 03 trích nguyên văn dòng `a3 pending RETRY`.
- [ ] `verifier-gate-only` trả `PASS` (hoặc PASS kèm nghi ngờ) — chính là verifier ở §2.
- [ ] `git status --porcelain | md5sum` sau hai lần chạy bằng đúng giá trị đã ghi ở bước 4.3 (verifier không ghi gì vào repo).
- [ ] Bonus: sửa bản fix thành `in ("failed", "error")`, chạy lại `verifier` → `PASS` với đủ 01/02/03.

Nếu `verifier-gate-only` cũng tự phát hiện ra `pending`: tốt, nhưng ghi lại là nó làm nhờ đâu (đọc diff và suy luận?) — lần sau với một diff dài hơn nó có thể không làm. Thứ bạn đang thiết kế là **quy trình bắt buộc**, không phải may mắn của một lần chạy.

---

## 5. Bẫy thường gặp

### Verifier không có Edit/Write mà vẫn ghi được file

Sau một lượt verify, `git status` có file lạ, hoặc một file test bị "chỉnh nhẹ". `Bash` là một cửa ghi đầy đủ: `sed -i`, `echo >`, `git checkout` đều đi qua nó, nên bỏ `Edit`/`Write` khỏi `tools` chỉ chặn hai tool chứ không chặn shell.

Có ba lớp chặn. Chụp `git status --porcelain` cùng hash trước và sau mỗi lượt verify, lệch thì verdict bị huỷ. Chặn các lệnh git ghi bằng permission deny hoặc hook `PreToolUse`; docs cho phép khai hook ngay trong frontmatter của subagent, chỉ chạy khi subagent đó đang hoạt động (cơ chế hook ở [[ag-08-hook-va-chan-bang-cau-hinh]]). Với Codex thì chạy verifier bằng `codex exec` để mặc định nằm trong read-only sandbox.

### Đọc `UNVERIFIED` thành "gần như PASS"

Main agent hoặc người đọc báo cáo commit luôn, vì "chỉ thiếu tái hiện thôi". Format ba trạng thái chỉ có nghĩa nếu phía nhận verdict phân nhánh đúng, và phía đó thường thiếu luật cứng. Skill hay loop chỉ nên commit khi chuỗi `VERDICT: PASS` có mặt nguyên văn; `UNVERIFIED` tự chuyển task sang "chờ test tay". Cũng đừng phản xạ ngược thành "UNVERIFIED thì bỏ task", vì nó không nói bản sửa sai.

### Brief vừa cấm sửa file vừa bắt làm mutation

Báo cáo ra PASS, kèm một dòng nhỏ ở mục "Chưa xác minh" mà không ai đọc. Agent trung thực gặp hai lệnh trái nhau thì chọn tuân lệnh cấm và hạ việc kia xuống thành chú thích. Tách vai như §3.6, và thêm luật verdict: **mục "Chưa xác minh" ảnh hưởng kết luận thì verdict tối đa là `UNVERIFIED`**.

### A/B mà hai lần chạy không cùng dữ liệu hoặc cùng code

01 lỗi, 02 đúng, nhưng 02 chạy với một bản ghi khác (đã bị sửa tay, hoặc fixture mới do agent tạo) vì môi trường được chuẩn bị lại cho bước 02 thay vì dùng chung một nguồn. Brief chỉ định một file dữ liệu cố định hoặc một ID bản ghi, và verifier in hash của dữ liệu ở cả 01 lẫn 02; hai hash phải bằng nhau.

Chiều ngược lại: output bước "trước" và "sau" trùng từng chữ, vì so bằng tên nhánh mà tên bị đổi hoặc checkout thất bại im lặng, nên cả hai lần chạy cùng một code (§3.4). Neo vào SHA (`git archive <sha>`), và hàm chạy lệnh phải throw khi exit code ≠ 0 ở những chỗ không được phép đi tiếp.

### Báo cáo đúng schema nhưng trả lời câu khác

Báo cáo trôi chảy, có verdict, nhưng không nhắc một mục đặc thù nào trong brief. Brief đã không được thread vào prompt: skill bỏ qua `args`, hoặc main agent tự tóm brief mất chi tiết. Chuỗi mồi bắt buộc trong mọi brief; báo cáo thiếu chuỗi mồi thì bị loại, không đọc tiếp.

---

## 6. Chuyển giao

Bài này nhận đầu vào từ hai bài trước: [[ag-10-done-criteria-va-gate]] cho verifier biết "xong" là lệnh nào; [[ag-11-gate-xanh-gia]] cho biết gate nào có thể xanh mà không chứng minh gì — verifier là người áp các luật đó mà không có động cơ đóng việc.

Tiếp theo trong Level 4, [[ag-13-kiem-ui-bang-anh]] xử lý chỗ verifier ở bài này yếu nhất: thay đổi giao diện, nơi đọc code và so chữ đều không thấy được pixel.

Lên Level 5, verifier trở thành một vai cố định trong nhóm agent: [[ag-14-subagent-va-brief]] dạy viết brief cho mọi subagent (verifier chỉ là một trường hợp), [[ag-16-hai-ho-model]] đặt verifier ở một họ model khác người viết code. Ở Level 6, [[ag-19-vong-lap-nhat-task]] gắn verifier vào mỗi vòng loop — và đó là lý do bạn được bỏ việc đọc diff từng task: thứ thay cho mắt bạn là một agent không thấy quá trình viết, không sửa được file, và không được nói PASS khi chưa có bằng chứng ở cả hai chiều.

Phần lý thuyết về agent, tool và vòng lặp tool-use ở mức API: [[aiml-05-agents-tools]].

---

## 7. Tóm tắt

- Agent vừa viết hoặc vừa giao việc viết code không chấm được bài đó: nó mang context của người viết và có động cơ đóng việc. Lời dặn trong prompt không sửa được; tách context và tước quyền mới sửa được.
- Verifier = subagent context sạch (docs: mỗi subagent có context window riêng, không thấy hội thoại) + `tools` không có `Edit`/`Write` + verdict `PASS`/`FAIL`/`UNVERIFIED`. `Bash` vẫn ghi được — kiểm `git status` trước/sau.
- `UNVERIFIED` không bao giờ đôn lên `PASS`: gate không chạy ≠ gate pass, không tái hiện được lỗi ≠ đã sửa đúng.
- Bằng chứng chỉ đáng tin khi nó ra kết quả khác nhau giữa fix đúng và fix sai. "N/N test xanh" thường không đạt chuẩn này.
- Task có triệu chứng bắt buộc A/B trên cùng dữ liệu: 01 trước fix / 02 sau fix / 03 ca liền kề — lấy code cũ bằng `git archive <sha>`, neo SHA chứ không tên nhánh.
- Thí nghiệm phá code giao cho một agent mutation riêng có kỷ luật `cp` + `md5`, không nới quyền cho verifier.
- Brief là thứ duy nhất verifier biết: report của người viết gắn nhãn "tuyên bố cần kiểm", diff dán thẳng, chuỗi mồi để chứng minh brief đã tới prompt.
- Verifier tốn nhiều lượt model; cắt lượt đọc lại, không cắt thí nghiệm; phân tầng phạm vi soi theo loại file bị đụng.
