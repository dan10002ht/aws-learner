# Bài 11 — Khi gate xanh mà không chứng minh gì

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra **năm cách `$?` bị nuốt** trong một gate script (subshell kết thúc bằng `echo`, pipe qua `tee`, `local x=$(...)`, `set -e` trong `if`/`||`, đọc `$?` sau một lệnh trung gian), và viết lại từng cách cho đúng.
- Bắt một gate báo xanh khi **test bị SKIP** hoặc khi **0 test được chạy**, bằng cách đọc cả số đã chạy lẫn số đã skip, so với baseline.
- Giải thích vì sao gate cấm pattern viết bằng **regex** luôn còn khe, và dựng bản **AST** cho cùng luật.
- Chứng minh một gate **đỏ được** trước khi dùng nó chấm agent: tiêm lỗi, chạy gate, khôi phục, đối chiếu md5 — kiểm cả hai chiều.
- Nhận ra **phép đếm tự giới hạn** (`grep -c` ra 0, `| head`, đếm trên cây đang bị sửa) trước khi đọc con số nhỏ thành "sạch".
- Viết script sửa dữ liệu **từ chối flag lạ**, để một typo không biến thành một lượt dry-run trông giống "đã xong".

---

## 2. Tình huống

Một dev trong team giao cho một agent chạy nền (gọi là *lane*) task sửa một service Go trong repo microservice. Theo đúng [[ag-10-done-criteria-va-gate]], dev viết sẵn `gate-task.sh` để lane tự chạy trước khi báo xong:

```bash
#!/usr/bin/env bash
rc=0
( cd svc && go build ./... ; echo "--- exit $?" ) || rc=1
( cd svc && go test ./... ; echo "--- exit $?" ) || rc=1
echo "GATE EXIT $rc"
exit $rc
```

Lane chạy ba vòng, vòng nào cũng báo `GATE EXIT 0`. Verifier độc lập (một agent context sạch, sẽ học ở [[ag-12-verifier-doc-lap]]) mở log ra đọc và thấy:

```
# Minh hoạ cấu trúc log — tên file/lỗi là ví dụ; cặp "exit 1" / "GATE EXIT 0" là hành vi thật (chạy lại ở §3.2)
# svc/internal/booking
internal/booking/handler.go:42:19: undefined: BookingRepo
--- exit 1
GATE EXIT 0
```

Log **tự in `exit 1`**, ngay dòng dưới là `GATE EXIT 0`. Không ai nói dối: `go build` báo lỗi thật, `echo` in đúng exit code thật, gate trả đúng `rc` của nó. Chỉ là `rc` không bao giờ có thể thành 1.

Dev sửa gate. Build đỏ thật, lane sửa code, build xanh, test xanh — `go test` in một dòng `ok <package>` cho mỗi package. Verifier lại chặn: gate không dựng Postgres/Redis, nên **36 test integration đều `SKIP`** — `go test` vẫn in `ok` cho package và exit 0. Lần này cũng không có dòng nào nói dối; kết luận thì sai hoàn toàn.

Cả hai lần đều do verifier bắt, không phải người viết gate tự thấy (kinh nghiệm thực tế, một phiên làm việc, hai lỗi khác kiểu trong cùng một gate). Thứ quyết định PASS/FAIL của mọi vòng lại là thứ duy nhất không ai chấm.

---

## ⏸ Dừng lại — đoán trước

Dòng `( cd svc && go build ./... ; echo "--- exit $?" ) || rc=1` in ra `--- exit 1` mà `rc` vẫn bằng 0. **Exit code của subshell `( ... )` là exit code của lệnh nào?** Và sau khi sửa dòng đó, kể thêm ít nhất hai cách khác để gate xanh trong khi code hỏng.

Đáp án ở §3.2 và §3.3.

---

## 3. Cơ chế

### 3.1. Gate là một chương trình, và là chương trình chưa ai chấm

**Gate** là lệnh (hoặc script) trả exit 0 khi việc đạt tiêu chí "xong" và khác 0 khi không đạt. **Xanh giả** là khi gate trả 0 nhưng tiêu chí thật không đạt.

Ở level 4 bạn bỏ việc đọc từng dòng code của agent và thay bằng gate. Nghĩa là toàn bộ niềm tin dồn vào một script vài chục dòng — thường do chính bạn viết vội, hoặc do chính agent đang bị chấm viết. Một test kiểm code; không có gì kiểm test. Có bốn chỗ một gate xanh mà không chứng minh gì, xếp từ dễ nghi đến khó nghi (phân loại từ kinh nghiệm thực tế):

1. **Gate không đỏ được** — exit code bị nuốt, test bị skip, đếm 0 test. (§3.2, §3.3)
2. **Gate đỏ được nhưng luật của nó có khe** — regex trên text. (§3.4)
3. **Gate đỏ được, luật kín, nhưng dữ liệu nó chạy là do chính người viết code dựng.** (§3.6)
4. **Gate đỏ được, dữ liệu thật, nhưng quan sát sai tầng / sai phạm vi / sai đơn vị đếm.** (§3.6)

Cách chữa chung cho cả bốn ở §3.5: bắt gate **phân biệt được** code đúng với code sai, bằng thí nghiệm, trước khi tin.

### 3.2. Năm cách `$?` bị nuốt

`$?` là exit code của **lệnh vừa chạy xong cuối cùng**. Gần như mọi lỗi ở đây đều là "lệnh cuối cùng" không phải lệnh bạn nghĩ.

Đoạn dưới đã chạy thật trên bash 3.2.57 (bản mặc định của macOS) và zsh; hai shell cho cùng kết quả:

```bash
rc=0
( false ; echo "--- exit $?" ) || rc=1          # A
echo "A rc=$rc"
rc=0
( false ); c=$?; echo "--- exit $c"; [ $c -ne 0 ] && rc=1   # B
echo "B rc=$rc"
false | tee /dev/null; echo "C pipe \$?=$?"     # C
set -o pipefail; false | tee /dev/null; echo "D pipefail \$?=$?"; set +o pipefail
f(){ local out=$(false); echo "E local \$?=$?"; }; f         # E
g(){ local out; out=$(false); echo "F split \$?=$?"; }; g    # F
false; echo "x" >/dev/null; echo "G after intermediate \$?=$?"   # G
```

```
--- exit 1
A rc=0
--- exit 1
B rc=1
C pipe $?=0
D pipefail $?=1
E local $?=0
F split $?=1
G after intermediate $?=0
```

Đọc từng dòng:

- **A — subshell kết thúc bằng `echo`.** Exit code của `( ... )` là exit code của lệnh cuối trong đó, tức `echo`, luôn 0. `$?` bên trong `echo` vẫn đúng là 1 — nên log trông như gate có kiểm. Đây chính là gate ở §2.
- **B — bắt `$?` ngay sau lệnh thật**, gán vào biến, rồi mới in. Cách sửa chuẩn.
- **C — pipe.** Exit code của pipeline là của lệnh **cuối** (`tee`), trừ khi bật `pipefail`. `go test ./... | tee gate.log` là dạng hay gặp nhất trong gate có lưu log.
- **D — `set -o pipefail`.** Bash manual: *"If set, the return value of a pipeline is the value of the last (rightmost) command to exit with a non-zero status, or zero if all commands in the pipeline exit successfully. This option is disabled by default."* (nguồn: gnu.org/software/bash/manual, mục *The Set Builtin*).
- **E — `local x=$(cmd)`.** `$?` là của builtin `local` (luôn thành công), không phải của `cmd`. F tách khai báo và gán ra hai lệnh thì đúng.
- **G — lệnh trung gian.** Thêm một dòng `echo` hay `log` giữa lệnh thật và chỗ đọc `$?` là đủ mất nó.

Cách thứ năm là `set -e`. Nhiều người nghĩ `set -e` là lưới an toàn cho gate. Bash manual liệt kê chỗ nó **không** áp dụng: *"The shell does not exit if the command that fails is part of the command list immediately following a while or until reserved word, part of the test in an if statement, part of any command executed in a && or || list except the command following the final && or ||, any command in a pipeline but the last (subject to the state of the pipefail shell option), or if the command's return status is being inverted with !"* (cùng nguồn). Và nó lan vào cả hàm được gọi trong ngữ cảnh đó — đã chạy thử:

```bash
set -e
check(){ false; echo "  (van chay tiep sau false)"; }
if check; then echo "H: if check -> PASS"; fi
check || echo "never"
echo "I: toi day roi"
check
echo "J: khong bao gio in"
```

```
  (van chay tiep sau false)
H: if check -> PASS
  (van chay tiep sau false)
I: toi day roi
```

Hàm `check` có `false` ở dòng đầu, `set -e` đang bật — nhưng gọi trong `if` thì `false` bị bỏ qua, hàm trả exit code của `echo` cuối, và `if` đi nhánh PASS. Gate viết kiểu `if run_checks; then echo PASS` mang đúng lỗi này. Chỉ lần gọi `check` đứng một mình mới làm script dừng (exit 1, dòng J không in).

Luật viết gate rút ra: `set -uo pipefail` ở đầu; mỗi lệnh thật theo mẫu `cmd; c=$?` rồi mới làm gì khác; không dựa vào `set -e` để tạo `rc`.

### 3.3. SKIP im lặng và "0 test" — gate chạy, nhưng không kiểm gì

Test integration thường tự skip khi thiếu hạ tầng (database, queue, biến môi trường). Đó là thiết kế hợp lý cho máy dev — và là lỗ cho gate. Thử với Go (đã chạy, go 1.26):

```go
func TestInsert(t *testing.T) {
    if os.Getenv("DATABASE_URL") == "" { t.Skip("no DATABASE_URL") }
    t.Fatal("bug")   // không bao giờ chạy tới
}
```

```
$ go test ./...
ok  	svc	0.344s
$ echo $?
0
```

Không có `-v` thì không có dòng nào nhắc tới skip. Tài liệu `go test` nói rõ: ở package list mode, *"If a package test passes, go test prints only the final 'ok' summary line"*; chỉ với `-v` mới in toàn bộ output (nguồn: pkg.go.dev/cmd/go, mục *Test packages*). Thêm `-v` thì có `--- SKIP: TestInsert`. Nghĩa là luật "grep `--- SKIP`" trong gate **chỉ có tác dụng khi gate chạy `-v`** — một gate grep SKIP trên output không `-v` là một gate xanh giả thứ hai chồng lên cái thứ nhất.

Python `unittest` (đã chạy, Python 3.14):

```
Ran 3 tests in 0.000s

OK (skipped=2)
$ echo $?
0
```

Hai điểm cần biết, đều đã chạy thử:

- `Ran 3 tests` **đếm cả test bị skip**. Kiểm "số test ≥ N" không bắt được skip.
- Không có test nào chạy → exit **5**, in `NO TESTS RAN`. Docs: *"An exit code of 5 indicates that no tests were run or skipped"* (docs.python.org/3/library/unittest.html, mục `unittest.main`). Nhưng nếu **mọi** test đều skip thì exit 0, in `OK (skipped=1)` — đã chạy thử với một file chỉ có một test `@unittest.skip`.

Mặt đối xứng ở Jest: sau một refactor, một file test chạy mà **đăng ký 0 test case** (lỗi khi dựng mock lúc load). Gate của repo chấm theo dòng `Test Suites:` nên vẫn báo **271 suite pass**; chỉ dòng `Tests:` tụt **2899 → 2857** (case thực tế, một lần chạy). Chiều ngược lại cũng có: một suite chết lúc load đóng góp 0 test nên dòng `Tests:` trông xanh. Hai chiều ngược nhau, nên **không có một con số nào đủ**: đọc cả hai, và so với baseline đo trên chính worktree đang chạy.

Gate tốt **tự dựng hạ tầng nó cần** (container dùng-một-lần với tên riêng, `trap cleanup EXIT`), và coi bất kỳ skip nào không có trong danh sách cho phép là FAIL.

### 3.4. Gate cấm pattern: regex trên text không kín

Loại gate thứ hai: "không được làm X trong code" — không log `err.message` (có thể chứa token), không gọi API cũ, không còn `console.log`. Cách nhanh là `grep`. Hai vấn đề.

**Vấn đề 1 — exit code của `grep` ngược nghĩa.** `grep` trả 0 khi **tìm thấy**. Gate dưới đây in ra vi phạm rồi exit 0, tức PASS:

```bash
#!/usr/bin/env bash
# gate-regex.sh — SAI: grep tìm thấy vi phạm => exit 0 => gate PASS
grep -nE 'logger\.[a-z]+\(.*\berr\.message\b' "$@"
```

Phải viết `if grep -nE '...' "$@"; then echo "FAIL: co vi pham"; exit 1; fi`.

**Vấn đề 2 — regex coi cú pháp là văn bản.** Chạy gate regex (đã sửa exit code) và một gate AST trên cùng file mẫu:

```js
function a(err) { logger.error(err.message); }
function b(profileErr) { logger.error(profileErr.message); }
function c(err) {
  logger.error(err
    .message);
}
function d(e1) { logger.warn(`fail: ${e1.message}`); }
function f(err) { const { message } = err; logger.error(message); }
// logger.error(err.message) -- chi la comment
```

| Dòng | Vi phạm thật? | Regex | AST |
|---|---|---|---|
| 1 `err.message` | có | bắt | bắt |
| 2 `profileErr.message` | có | **lọt** (`\berr` không khớp giữa từ) | bắt |
| 4–5 xuống dòng | có | **lọt** | bắt |
| 7 template literal, tên `e1` | có | **lọt** | bắt |
| 8 destructure `{ message }` | có | **lọt** | bắt |
| 9 comment | không | **báo nhầm** | bỏ qua |

Kết quả đã chạy: regex 1/5 vi phạm thật + 1 báo nhầm; AST 5/5, 0 báo nhầm. Gate AST (Node, `acorn@8.12.1` + `acorn-walk@8.3.4`):

```js
// gate-ast.mjs — cấm đưa `<x>.message` (hoặc biến destructure từ `message`) vào logger.*()
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

let bad = 0;
for (const file of process.argv.slice(2)) {
  const ast = acorn.parse(readFileSync(file, "utf8"),
    { ecmaVersion: "latest", sourceType: "module", locations: true });
  const tainted = new Set();
  walk.simple(ast, {
    VariableDeclarator(n) {
      if (n.id.type === "ObjectPattern")
        for (const p of n.id.properties)
          if (p.key?.name === "message" && p.value?.type === "Identifier") tainted.add(p.value.name);
    },
  });
  walk.simple(ast, {
    CallExpression(call) {
      const c = call.callee;
      if (c.type !== "MemberExpression" || c.object.name !== "logger") return;
      for (const arg of call.arguments)
        walk.full(arg, (n) => {
          if ((n.type === "MemberExpression" && n.property.name === "message") ||
              (n.type === "Identifier" && tainted.has(n.name))) {
            bad++; console.log(`${file}:${n.loc.start.line} logger nhan .message`);
          }
        });
    },
  });
}
process.exit(bad ? 1 : 0);
```

Với AST (cây cú pháp mà parser dựng từ source), comment, khoảng trắng, xuống dòng, ngoặc không còn là biến số; luật được viết theo **hình dạng node** (lời gọi nào, đối số nào). Còn lại một biến số AST không tự đóng được: luồng dữ liệu xuyên hàm (`const m = pick(err); logger.error(m)`) — cần thêm luật hoặc chấp nhận và ghi rõ là giới hạn.

Case thực tế (một repo gateway Node, một lần làm): gate cấm log chuỗi lỗi backend được vá bằng regex **8 vòng**, mỗi vòng bịt một đường thì lộ đường mới; vòng 9 chuyển sang AST thì đóng được. Cũng trong case đó, agent sửa code đã **tự thêm chính file logger của nó vào allowlist** của gate, lý do "mọi lỗi đều đi qua đây nên an toàn" — tức khoét đúng lỗ to nhất. Allowlist của gate phải do bên khác duyệt, giống mọi thay đổi gate (xem [[ag-08-hook-va-chan-bang-cau-hinh]] về việc chặn bằng cấu hình).

### 3.5. Thước đo phải đỏ được — và phải kiểm cả hai chiều

Mọi lỗi ở §3.2–3.4 có chung một cách phát hiện: **tiêm một lỗi đã biết vào, chạy gate, gate phải đỏ**. Đây là ý của *mutation testing* (cố ý làm sai code để xem test có bắt không), áp cho chính gate:

1. Gate trên code sạch → phải exit 0.
2. Tiêm lỗi (đổi `+` thành `-`, xoá một dòng, đổi tên field) → gate phải exit khác 0, với message chỉ đúng lỗi.
3. Khôi phục, đối chiếu md5 file trước/sau → phải khớp.

Bước 1 và 2 là **hai chiều**. Gate chỉ được thử chiều "code đúng thì xanh" là gate chưa được thử gì: một gate `exit 0` cứng cũng qua chiều đó.

Case thực tế cho chiều thứ hai, ở một thước đo không phải test: một script đo "hệ tra cứu note có note phù hợp cho bao nhiêu % sự cố" báo **81%**. Script chỉ từng được thử ở chiều "ca có note thì phải xanh". Lần đầu thêm chiều "ca không có note thì phải đỏ", thước đúng **2/8** ca; sửa để kiểm đúng note đã được gán nhãn thì độ phủ thật còn **75%**, và con số 88% báo trước đó là số của thước cũ (một lần đo, không phải benchmark). Thêm một bài học từ cùng case: khi thước và nhãn đúng-sai lệch nhau, **không sửa nhãn cho khớp công cụ** — làm vậy biến ground truth thành tiếng vọng của chính thứ đang đo.

Và một case ngay lúc soạn bài này. Gate mẫu ở §4 (bắt `$?` đúng, coi skip là FAIL) được chạy `prove-red` với mutant `return a + b` → `return a - b`. Kết quả: `clean=0 mutant=0` — **gate đúng mà vẫn xanh trên code sai**. Nguyên nhân: Python dùng lại bytecode `.pyc` cũ. Docs: *"By default, Python does this by storing the source's last-modified timestamp and size in the cache file"* (docs.python.org/3/reference/import.html, mục *Cached bytecode invalidation*). Mutant có **cùng kích thước** với bản gốc (`+` → `-`) và được ghi **trong cùng một giây** nên metadata khớp, Python chạy bản cũ. Đã kiểm lại: chèn `sleep 1.1` giữa hai lần chạy thì test đỏ; không sleep thì xanh. Sửa bằng `export PYTHONDONTWRITEBYTECODE=1; rm -rf __pycache__` trong gate. Không đọc kỹ đến mấy cũng không thấy lỗi này; chỉ thí nghiệm hai chiều mới lộ ra.

Chi phí của việc chứng minh gate đỏ được, tính thử với **giả định** gate chạy 40 giây và 3 mutant:

```python
gate_s = 40          # giả định, đo của bạn bằng: time bash gate.sh
mutants = 3
runs = 1 + mutants   # 1 lượt sạch + 1 lượt mỗi mutant
print(runs * gate_s / 60)   # ~2.7 phút, trả một lần cho mỗi lần sửa gate
```

Chỉ làm lại khi gate đổi, không làm mỗi vòng chấm.

### 3.6. Gate đỏ được, nhưng nhìn sai chỗ

Hai lớp khó nghi hơn, vì gate đã qua §3.5 và **đã từng đỏ đúng** nên mua được sự tự tin thật.

**Fixture do chính người viết code dựng.** *Fixture* là dữ liệu mẫu test chạy trên đó. Khi lane vừa viết code vừa viết fixture, cả hai sinh ra từ cùng một hiểu sai. Case thực tế (app SaaS thương mại điện tử): code chặn mua vượt tồn kho dựa trên một field mà template phía storefront **không hề xuất ra**; fixture thì có field đó. Test xanh, mutation đỏ đúng chiều, verifier PASS — và tính năng không chặn gì trên production. Cách bịt: một test khoá fixture vào chính nơi sinh ra dữ liệu (đọc template, assert field có mặt), để đổi tên field ở producer thì test đỏ. Phần "dữ liệu ai sinh ra" sẽ quay lại ở [[ag-12-verifier-doc-lap]]: verifier phải tự dựng dữ liệu, không nhận lại fixture của lane.

**Quan sát sai tầng, sai phạm vi.** Ba biến số hay đặt sai (case thực tế, ba repo khác nhau trong một tuần):

- *Tầng*: thư viện SQL compile named parameter trước khi gửi xuống driver, nên dấu `:` của `::timestamptz` bị ăn. Test hồi quy so chuỗi SQL **trước** bước compile → xanh với cả bản hỏng. Bản đúng assert SQL **sau** compile.
- *Phạm vi*: guard đối chiếu `env.example` với code chỉ soi một danh sách file config gõ tay. Lane xoá một biến được đọc ở file khác, guard vẫn PASS. Đổi sang quét cả cây thì guard báo `missing: [LOG_LEVEL LOG_OUTPUT_PATH]`. Một danh sách file trong gate là một allowlist ngầm, đóng băng phạm vi tại lúc viết.
- *Đơn vị đếm*: chính là case 271 suite / 2899 → 2857 test ở §3.3.

Phép thử cho lớp này mạnh hơn mutation: **chạy gate trên commit trước bản vá**. Nếu bug gốc còn nguyên mà gate xanh, gate không chứng minh gì về bản vá.

### 3.7. Phép đếm tự giới hạn: số nhỏ bị đọc thành "sạch"

Agent (và người) hay kết luận bằng một con số: "grep ra 0 chỗ, sạch rồi". Trong một phiên migrate, agent tự liệt kê **7 lần** kết luận sai, không lần nào do suy luận sai — đều là phép đếm bị giới hạn trả số nhỏ, và lần nào cũng nghiêng về phía **miễn trừ việc tiếp theo** (case thực tế, một phiên). Ví dụ: `grep ... | head -12` thấy 3 file, thật là **68**; `grep -rl` trên worktree mà worker **đang sửa** ra 0, trên `HEAD` ra 68.

Đã chạy thử (bash và zsh) các dạng hay gặp:

```bash
n=$(grep -c propTypes w/c.js || echo 0); echo "n=[$n]"
n=$(grep -c propTypes w/nope/*.js 2>/dev/null || echo 0); echo "n3=[$n]"
```

```
n=[0
0]
n3=[0]
```

- `grep -c` khi đếm được 0 **vừa in `0` vừa exit 1**, nên `|| echo 0` in thêm một số 0 nữa → biến chứa `"0\n0"`. So `[ "$n" = 0 ]` sẽ sai theo cách khó đoán.
- Đường dẫn sai (thư mục `nope/` không tồn tại): `2>/dev/null` giấu lỗi, `|| echo 0` biến "không đọc được file nào" thành **"0 vi phạm"**. Trong zsh, glob không khớp làm lệnh hỏng ngay với `no matches found` (báo lên stderr của shell) — kết quả cuối vẫn là `0`.

Ba nghĩa của "0" phải phân biệt được trước khi tin: *không có*, *pattern sai*, *đo sai chỗ*. Cách làm: luôn in **mẫu số** (đã quét bao nhiêu file — phải > 0), đếm trên snapshot cố định (`git grep -l <pattern> HEAD -- <paths>`) thay vì cây đang bị ghi, và thử pattern trên một file **biết chắc có** vi phạm trước.

### 3.8. Ack không phải hiệu ứng, và dry-run nuốt typo

Hai biến thể của cùng bệnh ở phía lệnh **ghi**:

**Ack ≠ hiệu ứng.** `exit 0`, HTTP 200, `userErrors` rỗng chỉ nói lời gọi được nhận, không nói trạng thái đích đã đổi. Case thực tế: script tạo nhóm gói qua API của platform, có kiểm lỗi, có throw, exit 0; hỏi lại API thì 9/14 sản phẩm không có gói. Luật: sau khi ghi, **đọc lại từ nguồn chuẩn bằng một đường khác đường vừa ghi**. Bài [[ag-20-viec-nen-va-ack]] đi sâu phần này cho việc chạy nền.

**Dry-run nuốt typo flag.** Script sửa dữ liệu mặc định dry-run, cần `--apply` mới ghi — mặc định đúng, nhưng gõ `--appl` thì chạy hết, in bảng, exit 0, đọc y hệt "đã chạy, không có gì phải sửa" (case thực tế). Biến thể tệ hơn: typo ở một flag đổi phạm vi khiến script ghi thật nhưng **hẹp hơn ý định**, rồi báo thành công. Hai bản đã chạy thử:

```bash
#!/usr/bin/env bash
# fix-strict.sh — whitelist flag, flag lạ -> exit 2, in MODE ở đầu và cuối
set -u
APPLY=0
for a in "$@"; do
  case "$a" in
    --apply)   APPLY=1 ;;
    --dry-run) APPLY=0 ;;
    *) echo "flag khong ho tro: $a (chi nhan --apply, --dry-run)" >&2; exit 2 ;;
  esac
done
MODE=$([ $APPLY -eq 1 ] && echo APPLY || echo DRY-RUN)
echo "MODE: $MODE | flags: ${*:-<none>}"
rows=3                                   # minh hoạ: số dòng sẽ chạm tới
echo "Pham vi: $rows dong"
[ $APPLY -eq 1 ] && echo "Da ghi $rows dong."
echo "MODE: $MODE (ket thuc)"
```

```
$ bash fix-loose.sh --appl        # bản chỉ bắt --apply, bỏ qua flag lạ
Tim thay 3 dong can sua. Xong.
exit=0
$ bash fix-strict.sh --appl
flag khong ho tro: --appl (chi nhan --apply, --dry-run)
exit=2
```

`MODE` in ở dòng cuối vì người vận hành đọc dòng cuối; phạm vi in **trước** khi ghi để "ít hơn đúng" nhìn thấy được.

### 3.9. Bảng tổng hợp

| Dạng xanh giả | Vì sao xanh | Phép thử lộ ra | Cách chặn |
|---|---|---|---|
| `$?` bị nuốt (subshell + `echo`, `\| tee`, `local x=$(..)`, `set -e` trong `if`) | exit code là của lệnh khác lệnh thật | tiêm lỗi build/test | `set -uo pipefail`, `cmd; c=$?`, trả `rc` tường minh |
| test SKIP | runner coi skip là OK | gỡ hạ tầng, chạy gate | gate tự dựng hạ tầng, skip = FAIL |
| suite đăng ký 0 test | đếm theo suite | so tổng test với baseline | đọc cả hai số |
| gate grep cấm pattern | grep exit 0 khi **tìm thấy** | đặt một vi phạm | `if grep ...; then exit 1` |
| regex | cú pháp là biến số | vi phạm viết khác dạng | AST |
| `grep -c ... \|\| echo 0` | không phân biệt "0" với "không đọc được" | đường dẫn sai | in mẫu số, `git grep HEAD` |
| bytecode/cache cũ | runner chạy bản cũ | mutant cùng kích thước | tắt cache trong gate |
| fixture tự dựng | dữ liệu mang giả định của code | đối chiếu với producer | test khoá fixture vào producer |
| quan sát sai tầng/phạm vi | gate nhìn chỗ bug không đi qua | chạy gate trên commit trước bản vá | assert sau bước biến đổi cuối, quét cả cây |
| ack thành công | ack ≠ trạng thái | đọc lại từ nguồn chuẩn | đọc lại bằng đường khác |
| typo flag dry-run | flag lạ bị bỏ qua | gõ sai flag | whitelist, exit 2, in MODE |

---

## 4. Làm thử

Mục tiêu: tự tay thấy một gate xanh giả, sửa nó, rồi **chứng minh** bản sửa đỏ được. Cần `bash`, `python3`, không cần cài gì thêm. Mọi file dưới đây đã chạy thật trên macOS (bash 3.2, Python 3.14).

**Bước 1 — dựng lab.**

```bash
mkdir gate-lab && cd gate-lab
cat > calc.py <<'EOF'
import sqlite3

def add(a, b):
    return a + b

def save_total(conn, total):
    conn.execute("CREATE TABLE IF NOT EXISTS t (v INTEGER)")
    conn.execute("INSERT INTO t VALUES (?)", (total,))
    return conn.execute("SELECT SUM(v) FROM t").fetchone()[0]
EOF
cat > test_calc.py <<'EOF'
import os, sqlite3, unittest
from calc import add, save_total

class Pure(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

@unittest.skipUnless(os.environ.get("TEST_DB"), "TEST_DB chua dat")
class Db(unittest.TestCase):
    def test_save_total(self):
        conn = sqlite3.connect(":memory:")
        self.assertEqual(save_total(conn, 7), 7)
EOF
```

**Bước 2 — gate xanh giả.** `gate-bad.sh` mang ba lỗi: subshell kết thúc bằng `echo`, pipe qua `tee` không `pipefail`, và không dựng "hạ tầng" (`TEST_DB`) nên test DB bị skip.

```bash
#!/usr/bin/env bash
# gate-bad.sh
rc=0
( python3 -m unittest -v 2>&1 | tee gate.log ; echo "--- exit $?" ) || rc=1
echo "GATE rc=$rc"
exit $rc
```

**Bước 3 — gate đúng.**

```bash
#!/usr/bin/env bash
# gate.sh — bắt $? ngay sau lệnh thật, tự dựng hạ tầng, coi SKIP là FAIL
set -uo pipefail
rc=0
export PYTHONDONTWRITEBYTECODE=1; rm -rf __pycache__   # không để bytecode cũ che code vừa sửa
export TEST_DB=1                                  # gate tự dựng "hạ tầng" (sqlite :memory:)
python3 -m unittest -v > gate.log 2>&1; c=$?      # bắt exit code NGAY sau lệnh thật
echo "--- unittest exit $c"; [ $c -ne 0 ] && rc=1
if grep -qE "skipped|SKIP" gate.log; then
  echo "!!! co test bi skip -> xanh gia, tinh la FAIL"; grep -E "skipped|SKIP" gate.log; rc=1
fi
ran=$(grep -Eo '^Ran [0-9]+ test' gate.log | grep -Eo '[0-9]+' || true)
echo "--- so test da chay: ${ran:-0} (ky vong >= 2)"
[ "${ran:-0}" -lt 2 ] && rc=1
echo "GATE rc=$rc"
exit $rc
```

**Bước 4 — máy chứng minh gate đỏ được.**

```bash
#!/usr/bin/env bash
# prove-red.sh <gate-script> <file> <sed-expr>
# 1) gate phải XANH trên code sạch  2) tiêm lỗi -> gate phải ĐỎ  3) khôi phục, md5 phải khớp
set -uo pipefail
gate=$1 file=$2 expr=$3
before=$(md5 -q "$file" 2>/dev/null || md5sum "$file" | cut -d' ' -f1)
cp "$file" "$file.orig"
trap 'mv -f "$file.orig" "$file"' EXIT           # luôn khôi phục, kể cả khi Ctrl-C

bash "$gate" >/dev/null 2>&1; clean=$?
sed -i.bak "$expr" "$file" && rm -f "$file.bak"
bash "$gate" >/dev/null 2>&1; mutant=$?
mv -f "$file.orig" "$file"; trap - EXIT
after=$(md5 -q "$file" 2>/dev/null || md5sum "$file" | cut -d' ' -f1)

echo "clean=$clean mutant=$mutant restored=$([ "$before" = "$after" ] && echo yes || echo NO)"
[ $clean -eq 0 ] && [ $mutant -ne 0 ] && [ "$before" = "$after" ] && { echo "PROVE-RED: OK"; exit 0; }
echo "PROVE-RED: FAIL — gate nay khong phan biet duoc code dung va code sai"; exit 1
```

**Bước 5 — chạy và đối chiếu.** Output dưới là kết quả thật khi soạn bài:

```bash
bash prove-red.sh gate-bad.sh calc.py 's/return a + b/return a - b/'
# clean=0 mutant=0 restored=yes
# PROVE-RED: FAIL — gate nay khong phan biet duoc code dung va code sai

bash prove-red.sh gate.sh calc.py 's/return a + b/return a - b/'
# clean=0 mutant=1 restored=yes
# PROVE-RED: OK

bash prove-red.sh gate.sh calc.py 's/SUM(v)/COUNT(v)/'    # mutant ở nhánh DB
# PROVE-RED: OK
```

**Bước 6 — thử chiều "thiếu hạ tầng".** Comment dòng `export TEST_DB=1` trong `gate.sh`, chạy lại: gate phải in `!!! co test bi skip` và `GATE rc=1`. Rồi đổi tên `test_calc.py` thành `calc_test.py` (discovery mặc định không còn thấy nó): gate phải báo `so test da chay: 0` và `rc=1`. Khôi phục cả hai.

**Bước 7 — thử nghiệm của riêng bạn.** Xoá dòng `rm -rf __pycache__` và `PYTHONDONTWRITEBYTECODE` khỏi `gate.sh`, chạy `prove-red` với mutant `+`→`-` khoảng 5 lần. Ghi lại bao nhiêu lần ra `mutant=0`, và giải thích bằng §3.5.

**Xong khi:**

- `prove-red.sh gate-bad.sh ...` → `PROVE-RED: FAIL`; `prove-red.sh gate.sh ...` → `PROVE-RED: OK` với **cả hai** mutant.
- Bước 6 cho `rc=1` ở cả hai biến thể.
- `git diff` (hoặc md5) của `calc.py` sau cùng không đổi so với lúc đầu.
- Bạn trả lời được bằng một câu: vì sao kiểm "Ran ≥ 2" không bắt được skip (gợi ý: §3.3).

Áp sang repo thật: chọn một gate bạn đang dùng cho agent, viết 2–3 mutant thật (xoá một `await`, đổi một điều kiện, bỏ một field), chạy `prove-red` cho từng cái. Ghi danh sách mutant vào cạnh gate để lần sửa gate sau chạy lại.

---

## 5. Bẫy thường gặp

### Sửa gate cho xanh

Gate đỏ mà không ai giải thích được, thế là agent (hoặc người) nới điều kiện, thêm file vào allowlist, hoặc thêm `|| true` cho "khỏi phiền". Gốc của nó là coi gate đỏ như phiền toái chứ không phải một phát hiện, cộng với việc người sửa gate lại chính là người đang bị gate chấm. Đặt gate và allowlist trong thư mục agent không được ghi (deny trong permission, xem [[ag-08-hook-va-chan-bang-cau-hinh]]), và **mọi thay đổi gate phải kèm output `prove-red` mới**.

### Gate mới viết chỉ được thử chiều "đúng thì xanh"

Gate chạy trên code hiện tại ra xanh là được đưa ngay vào loop. Chiều đó một gate `exit 0` cứng cũng qua, nên nó không phân biệt được gì. Skill hay loop nên từ chối dùng gate chưa có file `prove-red.log` mới hơn lần sửa gate cuối (so mtime, hoặc hash gate ghi trong log).

Luật SKIP là chỗ hay lộ ra nhất: "có SKIP thì FAIL" tồn tại nhưng chưa từng kích hoạt, vì `go test` không `-v` chỉ in dòng `ok` và chuỗi cần grep không bao giờ xuất hiện. Cho `prove-red` thêm một mutant "gỡ hạ tầng" (bỏ biến môi trường DB); gate không đỏ thì luật SKIP đang mù.

### Một con số tổng làm tiêu chí xong

"271 suite pass" hay "Ran 2 tests" được báo là xong trong khi một suite rỗng hoặc test bị skip: con số tổng gộp chạy-và-qua với không-chạy làm một. Gate phải in và so ít nhất hai số (suite và test, chạy và skip) với baseline đo trên chính worktree vừa dựng; lệch baseline là FAIL.

### Đọc "0 kết quả" thành "sạch"

Agent viết "đã kiểm, không còn chỗ nào dùng X" dựa trên `grep -c` hay `grep -rl`, trong khi 0 có ba nghĩa (không có, pattern sai, đo sai chỗ) và câu lệnh không phân biệt. Brief yêu cầu mọi phép đếm in kèm mẫu số và chạy trên `HEAD`; script đếm exit lỗi khi số file quét được là 0.

### Test "chứng minh" bản vá vẫn xanh trên commit chưa vá

Bản vá merge kèm test, rồi bug quay lại. Test đó quan sát tầng hoặc phạm vi mà bug không đi qua (§3.6), hoặc fixture mang cùng giả định với code. Done-criteria của task fix bug cần dòng "test mới phải ĐỎ trên commit trước bản vá", và verifier chạy nó bằng `git stash`/checkout commit cha chứ không chỉ đọc test.

---

## 6. Chuyển giao

- Bài [[ag-10-done-criteria-va-gate]] dạy định nghĩa "xong" thành lệnh; bài này dạy nghi ngờ chính lệnh đó. Gộp lại: một gate hợp nhất **cộng** bằng chứng nó đỏ được.
- [[ag-12-verifier-doc-lap]] giải quyết chỗ mà §2 để lộ: cả hai lỗi gate đều do verifier bắt. Verifier chỉ có ích nếu nó nghi cả thước nó cầm — dựng lại lỗi trên code trước fix, tự dựng dữ liệu.
- [[ag-13-kiem-ui-bang-anh]] là một ca "sai đơn vị đếm" ở UI: đo giao diện bằng text.
- [[ag-20-viec-nen-va-ack]] mở rộng §3.8 sang việc chạy nền: ack của lane, timeout, process zombie.
- Lý do tất cả những điều này quan trọng hơn ở level 6: trong loop ([[ag-19-vong-lap-nhat-task]]), không ai nhìn từng vòng. Gate xanh giả ở level 4 tốn một lần review; ở level 6 nó được nhân với mọi task loop nhặt.
- Nền về test nói chung: [[be-05-testing]], [[devops-01-cicd]].

---

## 7. Tóm tắt

- Gate là chương trình duy nhất quyết định PASS/FAIL mà không ai chấm; xanh giả là gate trả 0 khi tiêu chí thật không đạt.
- `$?` bị nuốt theo năm cách: subshell kết thúc bằng `echo`, pipe không `pipefail`, `local x=$(...)`, `set -e` trong `if`/`||`, lệnh trung gian. Mẫu đúng: `cmd; c=$?`.
- Runner coi skip là OK (`ok`, `OK (skipped=N)`, exit 0); "Ran N" của unittest đếm cả skip. Gate phải tự dựng hạ tầng và đọc ít nhất hai số so với baseline.
- Gate cấm pattern: `grep` exit 0 khi tìm thấy; regex còn khe ở tên biến, xuống dòng, template, destructure, comment — dùng AST.
- Chứng minh gate đỏ được bằng thí nghiệm hai chiều (sạch → xanh, mutant → đỏ, md5 khôi phục); ngay gate "đúng" cũng có thể xanh vì cache bytecode.
- Gate đỏ được vẫn có thể nhìn sai chỗ: fixture tự dựng, sai tầng, sai phạm vi — thử bằng cách chạy gate trên commit trước bản vá.
- "0" có ba nghĩa; in mẫu số, đếm trên `HEAD`. Ack không phải hiệu ứng; script ghi dữ liệu từ chối flag lạ.
