# Bài 5 — Duyệt từng bước: git là lưới an toàn

## 1. Mục tiêu

Sau bài này bạn có thể:

- Kể ra **ba lưới an toàn** của level 2 (permission prompt, checkpoint `/rewind`, git commit) và với mỗi lưới, chỉ đúng **loại thay đổi nào nó hoàn tác được và loại nào nó không chạm tới**.
- Phân loại một lệnh agent định chạy vào **đọc / ghi hoàn tác được / ghi không hoàn tác được**, rồi viết thành `permissions.allow` / `ask` / `deny` trong `.claude/settings.json`.
- Làm vòng **review diff → commit nhỏ** sau mỗi bước của agent, và hoàn tác một bước sai bằng đúng lệnh git cho tình huống đó (`git restore`, `git revert`, `git reset`).
- Viết một script ghi dữ liệu ngoài repo có ba chế độ `read` / `apply` / `revert`, để thứ git không lùi được vẫn lùi được.
- Tính thử **số phút mỗi ngày** bạn trả cho việc duyệt từng prompt, và đo được con số đó trên chính lịch sử của mình.

---

## 2. Tình huống

Case thực tế, ẩn danh, một buổi điều tra — không phải benchmark.

Một dev trong team đang dùng coding agent điều tra lỗi ở một app SaaS thương mại điện tử: một cờ cấu hình của shop không có hiệu lực ở storefront. Agent chạy trong repo backend, chế độ mặc định — hỏi trước mỗi lệnh shell.

Buổi đó đi như sau:

1. Agent đọc code, tìm ra chỗ đọc cờ. Mỗi lần cần dữ liệu thật, nó **viết sẵn một lệnh `node ...` chỉ gọi `.get()` lên database** rồi nhờ người tự chạy, dán output lại. Lý do agent tự đưa ra: script dùng service account của production, nên "phải để người chạy". Lặp lại nhiều lần trong buổi; mỗi lần là một vòng: agent dừng, người chuyển cửa sổ, chạy, copy, dán, agent đọc tiếp.
2. Đến lần thứ n, người dev gõ lại đúng một câu: *"query thôi thì m có thể chạy mà? những việc như update data thì mới cần t chạy thủ công chứ ???"*
3. Ở cuối buổi, để dựng lại lỗi, cần **bật một cờ trên một store** rồi xem storefront. Lần này là ghi thật. Script dựng môi trường test được viết với ba chế độ: `read` (in trạng thái hiện tại), `apply` (bật cờ), `revert` (trả về trạng thái đã ghi lại lúc `apply`).
4. Cờ bị bật sai chỗ. Nó nằm sai khoảng 25 phút trên một store của khách trước khi bị phát hiện. Thứ gỡ được nó **không phải git** — repo không đổi một byte — mà là chế độ `revert` của chính script.

Đọc lại buổi đó thì có hai lỗi ngược chiều nhau:

- Ở bước 1, ranh giới "hỏi người" đặt **quá rộng**: lệnh đọc, vốn không làm hỏng gì, vẫn bị đẩy sang người chạy. Chi phí là thời gian chờ.
- Ở bước 3, lưới an toàn quen thuộc của dev — git — **không phủ tới** chỗ đang bị ghi. Nếu script không có `revert`, sẽ không có lệnh nào để lùi lại.

Hai lỗi có cùng một gốc: người vận hành chưa phân biệt **thứ gì hoàn tác được và bằng cơ chế gì**. Bài này dựng bản đồ đó.

---

## ⏸ Dừng lại — đoán trước

Agent của bạn trong một lượt đã làm ba việc: (1) sửa `src/config.ts` bằng tool sửa file, (2) chạy `mv old.json new.json` bằng shell, (3) chạy một script ghi một dòng vào database staging. Bạn mở menu rewind, chọn **Restore code** về checkpoint trước lượt đó.

**Việc nào được lùi lại?**

```
(a) Cả ba — checkpoint chụp toàn bộ trạng thái trước lượt
(b) (1) và (2) — checkpoint chụp mọi file trong repo; database thì không
(c) Chỉ (1)
(d) Không việc nào, nếu chưa commit
```

Đáp án ở mục 3.2.

---

## 3. Cơ chế

### 3.1 Level 2 là một vòng "đề xuất → bạn duyệt → chạy"

Ở level 2 agent đã tự đọc file, sửa file, chạy lệnh (cơ chế vòng lặp tool ở [[ag-03-coding-agent-hoat-dong]]). Thứ bạn còn giữ là **quyền duyệt**: trước khi một hành động có tác dụng phụ chạy, công cụ dừng lại hỏi.

Claude Code phân loại tool theo mức rủi ro. Theo trang permissions (nguồn: https://code.claude.com/docs/en/permissions), ở chế độ Manual:

| Loại tool | Có hỏi không | "Yes, and don't ask again" nhớ tới đâu |
|---|---|---|
| Read-only (đọc file, Grep) | Không, trong thư mục làm việc | — |
| Bash | Có, trừ một tập lệnh read-only dựng sẵn | Vĩnh viễn, theo repo và lệnh |
| Sửa file | Có | Tới hết session |
| WebFetch | Có, trừ một số domain tài liệu dựng sẵn | Vĩnh viễn, theo repo và domain |

Tập lệnh read-only dựng sẵn, theo cùng trang, gồm `ls`, `cat`, `grep`, `find`, `wc`, `diff`, `stat`… và *"read-only forms of `git`"*; tập này không cấu hình được.

Mức "hỏi nhiều hay ít" chỉnh bằng **permission mode**. Cùng trang docs liệt kê: `default` (hiện là *Manual*, hỏi lần đầu dùng mỗi tool), `acceptEdits` (tự nhận sửa file và vài lệnh filesystem như `mkdir`, `mv`, `cp` trong thư mục làm việc), `plan` (chỉ đọc và chạy lệnh read-only, không sửa source), `auto` (một classifier xét hành động thay bạn), `dontAsk` (tự từ chối mọi thứ lẽ ra phải hỏi, chỉ chạy cái đã allow), `bypassPermissions` (bỏ prompt — docs ghi chỉ dùng trong container/VM cô lập). Đặt chế độ mặc định bằng key `defaultMode` trong settings.

Codex CLI chia hai trục thay vì một (nguồn: https://learn.chatgpt.com/docs/sandboxing, trang được chuyển hướng từ developers.openai.com/codex):

- **Sandbox mode** — agent *được chạm* tới đâu: `read-only`, `workspace-write` (đọc, sửa trong workspace, chạy lệnh cục bộ thông thường trong ranh giới đó), `danger-full-access`.
- **Approval policy** — khi nào *phải hỏi*: `on-request` (làm trong sandbox, hỏi khi cần vượt ranh giới), `never`. Docs hiện ghi `untrusted` **không còn** là lựa chọn được hỗ trợ.
- Cặp cờ cho chế độ tự động hoá cục bộ: `--sandbox workspace-write --ask-for-approval on-request`. Trong CLI, `/permissions` mở bộ chọn.

Khác biệt cơ chế đáng nhớ: Claude Code chặn bằng **luật trên từng lời gọi tool** (allow/ask/deny khớp chuỗi lệnh), Codex chặn bằng **ranh giới sandbox của hệ điều hành** cộng một chính sách hỏi. Một luật `Bash(git push *)` không khớp `git -C . push` (docs Claude Code nêu đúng ví dụ này); một sandbox chặn ghi ngoài workspace thì không quan tâm lệnh được viết thế nào. Hai cách hỏng khác nhau, nên bạn cần biết mình đang đứng trên cái nào.

### 3.2 Ba lưới an toàn, và mỗi lưới bắt được gì

Permission prompt chặn **trước** khi chạy. Nhưng bạn sẽ duyệt nhầm — sớm muộn gì cũng vậy. Câu hỏi thật là: *sau khi* đã chạy, lùi lại bằng gì?

**Lưới 1 — checkpoint và `/rewind` (Claude Code).** Theo trang checkpointing (nguồn: https://code.claude.com/docs/en/checkpointing):

- Mỗi prompt bạn gửi để bắt đầu một lượt tạo một checkpoint; giữ snapshot cho 100 checkpoint gần nhất của session.
- Mở menu bằng `/rewind` hoặc nhấn `Esc` hai lần khi ô nhập trống. Các lựa chọn: *Restore code and conversation*, *Restore conversation*, *Restore code*, *Summarize from here*, *Summarize up to here*, *Never mind*.
- **Giới hạn**, nguyên văn: *"Checkpointing does not track files modified by Bash commands"* — ví dụ docs đưa ra chính là `rm`, `mv`, `cp`. *"Only direct file edits made through Claude's file editing tools are tracked."*
- Sửa đổi của subagent nhìn chung **không** được rewind khôi phục (trừ skill fork chạy foreground); docs bảo dùng git.
- Thay đổi ngoài Claude Code và từ session song song khác thường không được chụp.
- Docs tự định vị: *"Checkpoints are designed for quick, session-level recovery"*, *không* thay version control.

Vậy đáp án ⏸ là **(c)**. Chỉ việc (1) — sửa bằng tool sửa file — được lùi. `mv` chạy qua shell nằm ngoài tầm checkpoint. Dòng database thì nằm ngoài cả máy bạn.

**Lưới 2 — git.** Git lùi được **mọi file được track trong repo**, bất kể ai sửa và sửa bằng gì: tool sửa file, `mv`, `sed -i`, subagent, chính bạn. Đó là lý do nó là lưới chính của level 2: nó không phụ thuộc vào việc công cụ agent có theo dõi hành động hay không. Điều kiện: thay đổi phải **so được với một mốc** — tức là trước đó đã có commit (hoặc ít nhất `git stash`). Cái gì chưa từng vào git (file mới chưa `add`, file bị `.gitignore`) thì git không có bản cũ để trả về.

**Lưới 3 — không có sẵn, phải tự dựng.** Database, API bên thứ ba, cấu hình trên một store, tin nhắn đã gửi, tiền đã charge. Không checkpoint nào, không commit nào chạm tới. Cách duy nhất để có đường lùi là **viết đường lùi vào chính công cụ ghi** — như script `read` / `apply` / `revert` ở mục 2.

Giờ mới đặt cạnh nhau:

| Thay đổi | Checkpoint `/rewind` | git | Cần gì thêm |
|---|---|---|---|
| Sửa file bằng tool sửa file | lùi được | lùi được nếu có mốc commit | — |
| `mv`, `rm`, `sed -i` qua shell | **không** | lùi được với file được track | commit trước bước đó |
| Sửa của subagent | thường **không** | lùi được | commit trước khi giao |
| File mới chưa `git add` | lùi được nếu tạo bằng tool sửa file | **không có bản cũ** (xoá bằng `git clean`) | — |
| Ghi database / gọi API ghi | **không** | **không** | script có `revert`, backup, dry-run |

Nguyên nhân gốc của cả bảng: mỗi lưới chụp ở **một tầng khác nhau**. Checkpoint chụp ở tầng *tool của agent* (nó biết agent đã gọi Edit lên file nào). Git chụp ở tầng *cây thư mục* (nó so nội dung file với commit, không cần biết ai sửa). Dữ liệu ngoài repo nằm ở tầng *hệ thống khác*, nơi chỉ hệ thống đó mới biết trạng thái cũ.

### 3.3 Ranh giới hỏi người: đọc hay ghi, không phải "môi trường nào"

Ở mục 2, agent tự đặt luật "có credentials production thì phải nhờ người chạy". Luật đó đặt ranh giới sai trục.

Lý do một hành động cần người ở giữa là: **nếu nó sai, có lùi lại được không, và lùi bằng gì.** Lệnh đọc sai thì chạy lại lệnh khác — không có gì phải lùi. Lệnh ghi sai thì phải lùi, và nếu đường lùi không tồn tại thì sai là vĩnh viễn.

Kinh nghiệm thực tế từ case trên, viết thành bảng phân loại:

| Lớp | Ví dụ | Ai chạy |
|---|---|---|
| Đọc | `SELECT`, `.get()`, GraphQL query, đọc log, `git log`, `git diff` | agent tự chạy, tự thử lại khi sai |
| Ghi hoàn tác được bằng lưới có sẵn | sửa file trong repo, `git commit` trên nhánh riêng | agent tự làm, bạn review diff sau |
| Ghi hoàn tác được bằng đường lùi tự dựng | script có `revert`, migration có `down`, ghi vào môi trường test của chính mình | agent chạy được, **nói trước nó ghi gì** |
| Ghi không hoàn tác được, hoặc trên dữ liệu người khác | charge, gửi email cho khách, xoá dữ liệu, `git push` lên nhánh chung, ghi lên store của khách | đưa lệnh + mô tả nó ghi gì, **người chạy** |

Có một trục thứ hai cũng thường bị đặt sai: **của ai**. Trong một buổi khác cùng app, agent đề nghị người tự vào admin bật một setting vì "store này nằm trên production". Store đó là store test của chính người dev, chỉ là dựng trên môi trường production. Câu trả lời của người: *"guard quá kĩ làm cho việc làm luôn bị limit"*. Luật cẩn thận với production sinh ra để bảo vệ **dữ liệu của khách**; áp nó lên dữ liệu test của chính mình là trả giá chờ đợi mà không bảo vệ được gì.

Đổi bảng phân loại thành cấu hình để agent không phải "nhớ". File `.claude/settings.json` (cú pháp theo https://code.claude.com/docs/en/permissions; các lệnh cụ thể là ví dụ, sửa cho stack của bạn):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test *)",
      "Bash(npm run lint *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(node scripts/inspect.js *)"
    ],
    "ask": [
      "Bash(node scripts/setup-test.js *)",
      "Bash(git reset *)",
      "Bash(git clean *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

Ba điều docs nói mà bạn phải biết khi đọc file này:

- Thứ tự xét là **deny → ask → allow**, khớp đầu tiên thắng, *"rule specificity doesn't change the order"*. Một deny rộng không thể bị một allow hẹp khoét lỗ.
- Luật Bash khớp **chuỗi lệnh**, nên `Bash(git push *)` không chặn `git -C . push origin main`. Deny bằng chuỗi là hàng rào thấp — chặn được agent đi đường thẳng, không chặn được mọi cách viết. Chặn chắc hơn là hook PreToolUse hoặc sandbox ([[ag-08-hook-va-chan-bang-cau-hinh]]).
- *"Permission rules are enforced by Claude Code, not by the model."* Viết "đừng push" trong CLAUDE.md chỉ định hướng thứ agent *thử*; luật deny mới quyết định thứ được *chạy*.

### 3.4 Review diff, commit nhỏ: một bước = một commit

Lưới git chỉ tốt bằng độ mịn của mốc. Nếu agent làm 6 bước rồi bạn mới commit một lần, thì khi bước 4 sai, `git revert` sẽ lùi cả 6. Mốc thô thì đường lùi cũng thô.

Vòng làm việc ở level 2, mỗi bước agent báo xong:

```bash
git branch --show-current     # 1. đang ở nhánh nào — chạy lại, không tin snapshot đầu phiên
git status --short            # 2. file nào đổi, có file lạ nào không (agent tạo file tạm?)
git diff --stat               # 3. quy mô: 2 file / 30 dòng, hay 40 file?
git diff                      # 4. đọc nội dung
git add -p                    # 5. chọn từng hunk, bỏ phần không thuộc bước này
git commit -m "fix: đọc cờ shop từ cache đã invalidate"
```

Vì sao từng dòng:

- **Dòng 1** là kinh nghiệm thực tế: người dùng có thể đã tự checkout nhánh khác ở một terminal riêng giữa chừng session. `git status` agent thấy lúc mở phiên đã hết hạn. Commit nhầm lên nhánh chung của team là việc phải nhờ người khác dọn (revert, force push, sửa merge request).
- **Dòng 3 trước dòng 4**: `--stat` là phép kiểm rẻ nhất. Bạn hỏi "sửa lỗi đọc cờ" mà diff chạm 40 file thì không cần đọc dòng nào cũng biết có chuyện.
- **Dòng 5**: `git add -p` cho phép tách phần agent "tiện tay" sửa thêm (format lại, đổi tên biến) ra khỏi commit chính. Commit chỉ chứa đúng một ý thì revert nó chỉ lùi đúng một ý.

Khi một bước sai, chọn lệnh theo **thay đổi đã đi tới đâu** (chi tiết ở [[git-05-undo-rescue]], [[git-07-advanced-rescue]]):

| Thay đổi đang ở đâu | Lệnh | Mất gì |
|---|---|---|
| Chưa `add`, muốn bỏ một file | `git restore <file>` | sửa đổi chưa lưu của file đó |
| Đã `add`, chưa commit | `git restore --staged <file>` rồi quyết | không mất, chỉ rút khỏi stage |
| Đã commit, chưa push, muốn xoá hẳn | `git reset --hard HEAD~1` | commit đó (còn trong reflog) |
| Đã commit và đã push lên nhánh chung | `git revert <sha>` | không mất gì — thêm một commit đảo ngược |
| File mới agent tạo, chưa track | `git clean -n` (xem) rồi `git clean -f` | file đó, **vĩnh viễn** |

`git clean` và `git reset --hard` nằm trong `ask` ở settings mẫu vì cùng một lý do: chúng là lệnh *hoàn tác* nhưng bản thân chúng không hoàn tác được ngoài reflog.

### 3.5 Git cũng là trí nhớ: tìm bản đã làm trước khi làm lại

Lưới git không chỉ lùi về phía sau. Lịch sử nhánh trên remote chứa **những lần thử đã làm** — và cùng với chúng, những chỗ đã vỡ rồi mới biết.

Case thực tế, ẩn danh: một dev cùng agent migrate lại giao diện một extension trong nhiều ngày. Sau đó mới biết trên remote có một nhánh cũ, bị coi là "outdate", đã làm cùng việc đó với layout tốt hơn. Đối chiếu: **115/157 file** (73%) có file cùng tên ở nhánh cũ — một bản tham chiếu thật, không phải một ảnh mẫu. Nhánh đó còn trả lời sẵn câu hỏi thiết kế khó nhất mà bản mới đã tự giải sai rồi lặp lại cách giải sai ở hàng chục chỗ.

Trước khi giao agent làm lại một bề mặt lớn, cho nó chạy (toàn lệnh đọc, nằm trong `allow`):

```bash
git fetch --all --prune
git branch -r --sort=-committerdate | head -30
git log --all --oneline -- path/to/surface | head -30
git diff --stat origin/<nhanh-cu> -- path/to/surface
```

Kết luận "chưa ai làm" chỉ hợp lệ sau khi đã chạy mấy lệnh này.

### 3.6 Chi phí thật của việc duyệt từng prompt

Mọi thứ ở trên giữ an toàn — và tốn thời gian của người. Tính thử để thấy nó tốn ở đâu.

Các con số dưới đây là **giả định để minh hoạ cách tính**, không phải số đo. Thay bằng số của bạn (cách đo ở cuối mục).

```python
# GIẢ ĐỊNH — không phải số đo
tasks_per_day   = 6     # số việc giao agent mỗi ngày
prompts_per_task = 12   # số lần agent dừng hỏi duyệt mỗi việc
read_s          = 10    # giây để đọc và bấm duyệt, khi bạn đang nhìn màn hình
away_ratio      = 0.5   # tỉ lệ prompt đến lúc bạn đang làm việc khác
switch_s        = 90    # giây để quay lại, nắm lại ngữ cảnh, rồi quay về việc kia
idle_min        = 4     # phút agent đứng chờ khi bạn đang ở việc khác

n = tasks_per_day * prompts_per_task                 # 72 lần duyệt/ngày
human_min = n*read_s/60 + n*away_ratio*switch_s/60   # 12 + 54 = 66 phút người
agent_idle_min = n*away_ratio*idle_min               # 144 phút agent đứng chờ
```

Tính lại với allow-list ở mục 3.3 bỏ được các prompt đọc, giả định còn 4 prompt/việc:

```python
n = 6 * 4                                            # 24 lần duyệt/ngày
human_min = 24*10/60 + 24*0.5*90/60                  # 4 + 18 = 22 phút người
agent_idle_min = 24*0.5*4                            # 48 phút agent đứng chờ
```

Hai điều đọc ra từ phép tính, đúng với mọi bộ số:

1. **Phần đắt là chuyển ngữ cảnh, không phải đọc.** Với bộ giả định trên, 54/66 phút nằm ở số hạng `switch_s`. Bấm "Yes" nhanh hơn không giúp gì; *giảm số lần bị kéo về* mới giúp.
2. **Agent chờ người, không phải người chờ agent.** Thời gian agent đứng im tỉ lệ với số prompt rơi vào lúc bạn vắng mặt. Đây là trần của level 2: agent chỉ chạy nhanh bằng tốc độ bạn quay lại màn hình.

Có một chi phí thứ ba không tính ra phút: duyệt nhiều thì duyệt mù. Khi lần thứ 50 trong ngày hiện prompt, xác suất bạn thật sự đọc nó không còn như lần thứ nhất. Đây là kinh nghiệm thực tế, chưa đo; nếu muốn đo: đếm số lần bạn chọn "Yes" mà không mở rộng xem nội dung lệnh, hoặc số lần phải rewind/revert một thứ chính mình đã duyệt.

**Cách đo số của bạn:**

- `prompts_per_task`: trong một tuần, ghi tay số lần agent dừng hỏi cho mỗi việc (hoặc đếm prompt duyệt trong transcript session, nếu công cụ của bạn lưu transcript).
- `away_ratio` và `idle_min`: mỗi lần quay lại thấy agent đang chờ, ghi giờ prompt xuất hiện và giờ bạn trả lời.
- `switch_s`: khó đo trực tiếp; đo gián tiếp bằng thời gian từ lúc trả lời prompt tới lúc bạn gõ lại được dòng tiếp theo ở việc kia.

---

## 4. Làm thử

Mục tiêu: tự thấy ba lưới bắt được gì, và dựng lưới thứ ba cho dữ liệu ngoài repo. Khoảng 30 phút, cần Claude Code (phần 4.3 làm được với bất kỳ agent nào).

### 4.1 Dựng repo nháp

```bash
mkdir -p ~/scratch/ag05 && cd ~/scratch/ag05
git init -q
mkdir -p src .claude data
printf 'export const FLAG_TTL = 60;\n' > src/config.ts
printf '{"a":1}\n' > data/old.json
git add -A && git commit -qm "init"
```

Chép file `.claude/settings.json` ở mục 3.3 vào `.claude/settings.json` (thay `node scripts/inspect.js *` và `setup-test.js` bằng `node store.js read *` và `node store.js apply *` cho khớp phần 4.3).

### 4.2 Kiểm checkpoint vs git

Mở `claude` trong thư mục, gửi **một** prompt:

> Đổi FLAG_TTL trong src/config.ts thành 300. Sau đó dùng lệnh shell `mv data/old.json data/new.json`. Không làm gì thêm.

Duyệt cả hai. Rồi `/rewind` → chọn prompt vừa gửi → **Restore code**. Thoát ra và chạy:

```bash
cat src/config.ts        # kỳ vọng: 60 (checkpoint lùi được tool sửa file)
ls data/                 # kỳ vọng: new.json (checkpoint KHÔNG lùi mv)
git status --short       # kỳ vọng thấy: D data/old.json, ?? data/new.json
git restore data/old.json && rm data/new.json   # git lùi phần còn lại
```

### 4.3 Dựng lưới thứ ba: script `read` / `apply` / `revert`

"Dữ liệu ngoài repo" ở đây là một file JSON đóng vai database, nằm ngoài repo. Lưu thành `store.js`:

```js
// store.js — mô phỏng ghi lên hệ thống ngoài repo, có đường lùi
// Dùng: node store.js read|apply|revert <shopId> [flag=value]
const fs = require("fs");
const os = require("os");
const path = require("path");

const DB = path.join(os.tmpdir(), "ag05-db.json");
const BACKUP_DIR = path.join(os.tmpdir(), "ag05-backup");
const [mode, shopId, kv] = process.argv.slice(2);

const ALLOWED_MODES = ["read", "apply", "revert"];
if (!ALLOWED_MODES.includes(mode) || !shopId) {
  console.error(`usage: node store.js ${ALLOWED_MODES.join("|")} <shopId> [flag=value]`);
  process.exit(2); // từ chối mode lạ, không đoán
}

const load = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : {});
const save = (db) => fs.writeFileSync(DB, JSON.stringify(db, null, 2));
const backupFile = path.join(BACKUP_DIR, `${shopId}.json`);

const db = load();
if (mode === "read") {
  console.log(JSON.stringify(db[shopId] ?? {}, null, 2));
} else if (mode === "apply") {
  const [flag, value] = (kv || "").split("=");
  if (!flag) { console.error("apply cần flag=value"); process.exit(2); }
  if (fs.existsSync(backupFile)) {
    console.error(`đã có backup chưa revert: ${backupFile} — revert trước khi apply lần nữa`);
    process.exit(3); // không ghi đè mốc cũ
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(backupFile, JSON.stringify(db[shopId] ?? null));
  db[shopId] = { ...(db[shopId] ?? {}), [flag]: value };
  save(db);
  console.log(`APPLIED ${shopId}.${flag}=${value}; backup tại ${backupFile}`);
} else {
  if (!fs.existsSync(backupFile)) { console.error("không có backup để revert"); process.exit(4); }
  const prev = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  if (prev === null) delete db[shopId]; else db[shopId] = prev;
  save(db);
  fs.unlinkSync(backupFile);
  console.log(`REVERTED ${shopId}`);
}
```

Giao agent: *"Dùng store.js bật cờ newCheckout=true cho shop-test-1, rồi đọc lại để xác nhận."* Quan sát: `read` chạy không hỏi (nằm trong `allow`), `apply` dừng hỏi (nằm trong `ask`). Sau đó tự chạy `node store.js revert shop-test-1` và `node store.js read shop-test-1`.

### 4.4 Tiêu chí "xong" — kiểm được

- [ ] Ở 4.2, `cat src/config.ts` in `60` sau rewind, trong khi `ls data/` vẫn thấy `new.json`. Bạn giải thích được vì sao bằng một câu về **tầng** mà mỗi lưới chụp.
- [ ] `git log --oneline` ở repo nháp có ít nhất 2 commit, mỗi commit một ý (dùng `git add -p` ít nhất một lần).
- [ ] `node store.js apply shop-test-1 x=1` chạy hai lần liên tiếp thì lần hai **thoát mã 3** (`echo $?`) — script không cho ghi đè mốc cũ.
- [ ] `node store.js destroy shop-test-1` thoát mã 2 — mode gõ sai bị từ chối, không bị coi như một mode hợp lệ.
- [ ] Sau `revert`, `read` in đúng trạng thái trước `apply` (`{}` nếu shop chưa từng có).
- [ ] Bạn có một bộ số `prompts_per_task`, `away_ratio` của chính mình ghi trong một ngày làm việc, và đã chạy lại phép tính ở mục 3.6 với bộ số đó.

---

## 5. Bẫy thường gặp

### Tin `/rewind` lùi được mọi thứ agent làm

Sau rewind test vẫn đỏ, có file đã bị đổi tên hoặc xoá mà không quay lại. Checkpoint chụp ở tầng tool sửa file; docs nói thẳng thay đổi bởi Bash, đa số sửa đổi của subagent và thay đổi từ ngoài session đều không được theo dõi. Commit (hoặc `git stash`) trước mỗi bước có lệnh shell sửa file, và trước khi giao việc cho subagent. Rewind dùng khi đổi ý về cách sửa; **lùi trạng thái repo là việc của git**.

### "Yes, and don't ask again" cho một prefix quá rộng

Agent chạy một lệnh bạn chưa bao giờ định cho phép, mà không hỏi. Với Bash, lựa chọn này nhớ vĩnh viễn theo repo và lệnh, và docs chỉ ra `Bash(git *)` cho phép *mọi* lệnh git, kể cả `-c`, thứ khiến git chạy một chương trình bạn chỉ định. Viết allow theo subcommand (`Bash(git diff *)`, không phải `Bash(git *)`) và đặt lệnh nguy hiểm vào `deny`/`ask`, vì deny và ask luôn được xét trước allow. Định kỳ mở `/permissions` xem danh sách đã tích luỹ tới đâu.

### Commit lên nhánh không phải nhánh bạn nghĩ

Commit của agent nằm trên `main`, hoặc trên nhánh của việc khác. Trạng thái git agent thấy lúc đầu phiên chỉ là ảnh chụp, và người dùng có thể đã checkout nhánh khác ở một terminal khác (kinh nghiệm thực tế, đã gặp). Đưa `git branch --show-current` vào quy trình commit trong file hướng dẫn repo; chặt hơn thì dùng một hook kiểm nhánh trước lệnh `git commit` ([[ag-08-hook-va-chan-bang-cau-hinh]]).

### Ghi ra ngoài repo mà không có đường lùi

Một cờ bị đặt sai trên dữ liệu thật, và không ai biết giá trị cũ là gì. Git và checkpoint đều không chạm tới hệ thống ngoài, và đường lùi không viết **trước** khi ghi thì sau đó không dựng lại được. Mọi script ghi cần `read` / `apply` / `revert`, backup trạng thái trước khi ghi, và từ chối flag hay mode lạ thay vì bỏ qua. Ghi lên dữ liệu của khách thì thêm dry-run và để người chạy.

Chính đường lùi cũng có thể gây hỏng. Dữ liệu trên môi trường test dùng chung thường là mốc so sánh của một việc khác (ảnh BEFORE, kiểm parity); một lần `revert` giữa chừng làm lệch mốc đó, và việc kia bỗng ra kết quả vô nghĩa mà không ai biết vì sao (kinh nghiệm thực tế). Trên môi trường dùng chung, trước khi `apply` hoặc `revert`, agent phải in ra nó đổi gì, ở đâu, và ghi lại vào chỗ team cùng đọc. Môi trường riêng cho từng việc giải triệt để hơn ([[ag-15-worktree-va-xung-dot]] cho phía repo).

### Duyệt "đóng việc" khi còn một khe hở đã biết

Sau nhiều vòng sửa, agent đề xuất "hướng đã đạt mục tiêu, khe còn lại nhỏ", và bạn đồng ý. Thực chất đó là agent tự chấm bài của mình, và lời duyệt của bạn chỉ dựa trên bản tóm tắt ấy. Case thực tế: sau 8 vòng vá một chỗ rò token qua log bằng regex, agent đề nghị đóng; người dev bác; vòng 9 đổi hẳn cách tiếp cận (quét bằng AST thay vì regex) và đóng được thật. Khe bị bỏ qua không biến mất, nó chỉ ngừng được nhắc tới.

Thất bại 2–3 vòng liên tiếp cùng một hướng là tín hiệu **đổi cách tiếp cận**, không phải thêm một vòng. Còn lỗ mô tả được thì đừng duyệt đóng; nếu thật sự dừng, ghi thành quyết định có tradeoff. Về lâu dài, thay câu "xong chưa?" bằng tiêu chí chạy được ([[ag-10-done-criteria-va-gate]]) và một verifier không phải chính agent đã làm ([[ag-12-verifier-doc-lap]]).

Đẩy cả lệnh đọc sang cho người chạy vì "có credentials production" là đặt ranh giới sai trục (§3.3). Cách chẩn đoán lớp nào đang chặn, và sửa bằng allow-list cho lệnh chỉ đọc, ở [[ag-03-coding-agent-hoat-dong]].

---

## 6. Chuyển giao

Level 2 giữ an toàn bằng **mắt người ở mỗi bước**: duyệt prompt, đọc diff, quyết định commit. Mục 3.6 cho thấy cái giá: phần lớn nằm ở chuyển ngữ cảnh, và agent chạy chậm bằng tốc độ bạn quay lại màn hình.

Các level sau lần lượt rút từng phần mắt người ra, và thay bằng cơ chế:

- **Bảng phân loại đọc/ghi ở mục 3.3** — hôm nay bạn mang nó trong đầu. Level 3 đưa nó vào memory, skill, hook để agent không cần được dặn lại: [[ag-06-memory-va-feedback]], [[ag-07-skill-va-slash-command]], [[ag-08-hook-va-chan-bang-cau-hinh]].
- **Đọc diff từng dòng ở mục 3.4** — level 4 thay bằng done-criteria và verifier: [[ag-10-done-criteria-va-gate]], [[ag-12-verifier-doc-lap]]. Bạn vẫn giữ git làm lưới lùi; bạn chỉ thôi là người duy nhất phát hiện lỗi.
- **Một bước = một commit trên một nhánh** — level 5 nhân lên thành nhiều agent, mỗi agent một worktree: [[ag-15-worktree-va-xung-dot]].
- **Script `read`/`apply`/`revert`** — trở thành điều kiện bắt buộc khi loop chạy không người canh ở level 6–7: một bước ghi không có đường lùi là thứ đầu tiên phải chặn trước khi để agent tự chạy qua đêm ([[ag-21-loop-la-he-phan-tan]], [[ag-25-tu-dong-hoa-co-gioi-han]]).

Câu hỏi để mang sang bài sau: trong danh sách lời dặn bạn đã gõ cho agent tuần này, cái nào bạn gõ từ hai lần trở lên? Đó là ứng viên đầu tiên cho memory.

---

## 7. Tóm tắt

- Level 2 an toàn nhờ ba lưới ở **ba tầng khác nhau**: permission prompt (trước khi chạy), checkpoint `/rewind` (tầng tool sửa file của agent), git (tầng cây thư mục). Dữ liệu ngoài repo không có lưới nào sẵn.
- `/rewind` không lùi thay đổi do Bash, đa số sửa đổi của subagent, hay thay đổi ngoài session — docs tự nhận nó không thay version control.
- Ranh giới hỏi người đặt theo **đọc hay ghi, hoàn tác được không, dữ liệu của ai** — không theo môi trường. Viết ranh giới đó thành `allow` / `ask` / `deny`; deny → ask → allow, khớp đầu tiên thắng.
- Luật permission do công cụ thực thi, không phải model; lời dặn trong file hướng dẫn chỉ định hướng thứ agent thử.
- Một bước = một commit; `git branch --show-current` trước mỗi commit; chọn `restore` / `reset` / `revert` theo việc thay đổi đã đi tới đâu.
- Mọi script ghi ra ngoài repo có `read` / `apply` / `revert`, backup trước khi ghi, từ chối mode lạ.
- Chi phí duyệt từng prompt chủ yếu là chuyển ngữ cảnh và thời gian agent đứng chờ — đo bằng số lần dừng hỏi mỗi việc và khoảng chờ, đừng đoán.
