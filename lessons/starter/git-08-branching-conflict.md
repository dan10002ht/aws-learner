# Branching strategy & xử lý conflict

Bạn đã biết tạo branch, commit, mở PR. Nhưng đi làm thật, câu hỏi không phải "tạo branch thế nào" mà là: **branch theo chiến lược gì để team không giẫm chân nhau?** và **khi conflict 20 file thì thoát ra sao mà không hỏng code?** Bài này nói thẳng vào hai chuyện đó.

---

## 1. Các chiến lược branching: chọn đúng theo team

Không có chiến lược "tốt nhất". Có chiến lược **hợp với tốc độ release và quy mô team** của bạn.

### Trunk-based development

Mọi người commit thẳng (hoặc qua PR cực ngắn) vào một branch chính duy nhất — `main` (trunk). Branch phụ sống vài giờ tới 1-2 ngày là merge.

```text
main:  o---o---o---o---o---o---o   <- ai cũng merge vào đây liên tục
            \     /   \   /
             o---o     o-o          <- branch sống ngắn, merge nhanh
```

- **Khi nào dùng:** team có CI mạnh, test tự động tốt, release liên tục (CD). Phổ biến ở các công ty lớn (Google, Facebook).
- **Ưu:** ít conflict tích tụ, code luôn integrate sớm, không có "merge hell".
- **Nhược:** đòi hỏi kỷ luật cao, feature flag để giấu code chưa xong, test phải xanh thật.

### GitHub Flow

Đơn giản nhất cho web/SaaS: `main` luôn deploy được. Mỗi việc tách 1 branch → PR → review → merge → deploy.

```text
main: o-------o-----------o-------o   (luôn deployable)
       \     / \         /
        feat-a   feat-login
```

- **Khi nào dùng:** team nhỏ–vừa, deploy thường xuyên, một môi trường production. **Đây là mặc định tốt cho phần lớn dự án.**
- **Quy tắc:** `main` phải luôn xanh; mọi thay đổi đi qua PR.

### GitFlow

Nhiều branch dài hạn: `main` (bản đã release), `develop` (tích hợp), `feature/*`, `release/*`, `hotfix/*`.

```text
main:     o---------------o-----------o      (tag v1.0, v1.1)
           \             / \         /
release:    \         o-o   \   o-o
             \       /       \ /
develop: o----o----o----o----o----o
          \  /      \  /
feature:   oo        oo
```

- **Khi nào dùng:** sản phẩm có **versioning rõ ràng**, release theo lịch, cần support nhiều version cùng lúc (app desktop, mobile, on-premise).
- **Nhược:** nặng nề, nhiều merge, dễ lệch giữa `develop` và `main`. **Đa số team web KHÔNG cần GitFlow** — nó hay bị dùng nhầm vì quán tính.

> 💡 Ghi nhớ: Web/SaaS deploy liên tục → **GitHub Flow** hoặc **trunk-based**. Sản phẩm có version/release theo lịch → cân nhắc **GitFlow**. Đừng chọn GitFlow chỉ vì "nghe pro".

### So sánh nhanh

```text
Tiêu chí          Trunk-based    GitHub Flow    GitFlow
-----------------------------------------------------------
Số branch dài hạn      1              1            2 (main+develop)
Tuổi feature branch  vài giờ      vài ngày       vài ngày–tuần
Đòi hỏi CI/test       rất cao        cao           vừa
Hợp với CD            tuyệt vời      tốt           kém
Versioning nhiều bản   kém           kém           tốt
Độ phức tạp           thấp           thấp          cao
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh topology ba chiến lược branching: Trunk-based, GitHub Flow, GitFlow</title>
  <desc>Ba sơ đồ commit graph xếp chồng. Trunk-based: một nhánh main duy nhất với các branch sống cực ngắn merge nhanh. GitHub Flow: main luôn deployable với vài feature branch ngắn. GitFlow: nhiều nhánh dài hạn main, develop, release, feature, hotfix nhiều tầng.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Trunk-based — 1 nhánh, branch siêu ngắn</text>
  <g stroke="currentColor" fill="none">
    <line x1="40" y1="58" x2="690" y2="58" stroke-opacity="0.9" stroke-width="2"/>
    <path d="M180 58 q24 22 48 22 h36 q24 0 48 -22" stroke="#10b981" stroke-opacity="0.85" stroke-width="2"/>
    <path d="M460 58 q20 20 40 20 q20 0 40 -20" stroke="#10b981" stroke-opacity="0.85" stroke-width="2"/>
  </g>
  <g fill="#3b82f6" fill-opacity="0.9">
    <circle cx="40" cy="58" r="6"/><circle cx="110" cy="58" r="6"/><circle cx="180" cy="58" r="6"/><circle cx="312" cy="58" r="6"/><circle cx="460" cy="58" r="6"/><circle cx="540" cy="58" r="6"/><circle cx="620" cy="58" r="6"/><circle cx="690" cy="58" r="6"/>
  </g>
  <g fill="#10b981" fill-opacity="0.9">
    <circle cx="228" cy="80" r="5"/><circle cx="264" cy="80" r="5"/><circle cx="500" cy="78" r="5"/>
  </g>
  <text x="40" y="100" font-size="10.5" fill="currentColor" opacity="0.7">main (trunk) — ai cũng merge vào liên tục; branch xanh sống vài giờ</text>
  <text x="16" y="148" font-size="13.5" font-weight="700" fill="currentColor">GitHub Flow — main + feature ngắn qua PR</text>
  <g stroke="currentColor" fill="none">
    <line x1="40" y1="184" x2="690" y2="184" stroke-opacity="0.9" stroke-width="2"/>
    <path d="M120 184 q20 -26 44 -26 h70 q24 0 44 26" stroke="#10b981" stroke-opacity="0.85" stroke-width="2"/>
    <path d="M400 184 q20 -26 44 -26 h90 q24 0 44 26" stroke="#8b5cf6" stroke-opacity="0.85" stroke-width="2"/>
  </g>
  <g fill="#3b82f6" fill-opacity="0.9">
    <circle cx="40" cy="184" r="6"/><circle cx="120" cy="184" r="6"/><circle cx="278" cy="184" r="6"/><circle cx="400" cy="184" r="6"/><circle cx="578" cy="184" r="6"/><circle cx="690" cy="184" r="6"/>
  </g>
  <g fill="#10b981" fill-opacity="0.9"><circle cx="184" cy="158" r="5"/><circle cx="234" cy="158" r="5"/></g>
  <g fill="#8b5cf6" fill-opacity="0.9"><circle cx="444" cy="158" r="5"/><circle cx="534" cy="158" r="5"/></g>
  <text x="252" y="161" font-size="10" fill="currentColor" opacity="0.7">feat-a</text>
  <text x="552" y="161" font-size="10" fill="currentColor" opacity="0.7">feat-login</text>
  <text x="40" y="212" font-size="10.5" fill="currentColor" opacity="0.7">main luôn deployable — mỗi việc 1 feature branch → PR → merge → deploy</text>
  <text x="16" y="260" font-size="13.5" font-weight="700" fill="currentColor">GitFlow — nhiều nhánh dài hạn nhiều tầng</text>
  <g font-size="10.5" fill="currentColor" opacity="0.75">
    <text x="16" y="300">main</text>
    <text x="16" y="346">release</text>
    <text x="16" y="392">develop</text>
    <text x="16" y="438">feature / hotfix</text>
  </g>
  <g stroke="currentColor" fill="none">
    <line x1="78" y1="296" x2="690" y2="296" stroke-opacity="0.9" stroke-width="2"/>
    <line x1="360" y1="342" x2="470" y2="342" stroke-opacity="0.9" stroke-width="2"/>
    <line x1="78" y1="388" x2="690" y2="388" stroke-opacity="0.9" stroke-width="2"/>
  </g>
  <g stroke="#f59e0b" stroke-opacity="0.85" stroke-width="2" fill="none">
    <path d="M330 388 C 342 366, 348 342, 360 342"/>
    <path d="M470 342 C 482 342, 488 318, 500 296"/>
    <path d="M470 342 C 482 366, 488 388, 500 388"/>
  </g>
  <g stroke="#10b981" stroke-opacity="0.85" stroke-width="2" fill="none">
    <path d="M200 388 q22 28 44 28 h40 q22 0 44 -28"/>
    <path d="M560 388 q22 28 44 28 h40 q22 0 44 -28"/>
  </g>
  <g stroke="#8b5cf6" stroke-opacity="0.85" stroke-width="2" fill="none">
    <path d="M626 296 q22 24 44 24"/>
    <path d="M670 320 q20 -24 20 -24"/>
  </g>
  <g fill="#3b82f6" fill-opacity="0.9"><circle cx="78" cy="296" r="6"/><circle cx="500" cy="296" r="6"/><circle cx="626" cy="296" r="6"/><circle cx="690" cy="296" r="6"/></g>
  <g fill="#f59e0b" fill-opacity="0.9"><circle cx="360" cy="342" r="5"/><circle cx="415" cy="342" r="5"/><circle cx="470" cy="342" r="5"/></g>
  <g fill="#3b82f6" fill-opacity="0.9"><circle cx="78" cy="388" r="6"/><circle cx="200" cy="388" r="6"/><circle cx="330" cy="388" r="6"/><circle cx="500" cy="388" r="6"/><circle cx="560" cy="388" r="6"/><circle cx="690" cy="388" r="6"/></g>
  <g fill="#10b981" fill-opacity="0.9"><circle cx="244" cy="416" r="5"/><circle cx="288" cy="416" r="5"/><circle cx="604" cy="416" r="5"/><circle cx="648" cy="416" r="5"/></g>
  <g fill="#8b5cf6" fill-opacity="0.9"><circle cx="670" cy="320" r="5"/></g>
  <text x="92" y="288" font-size="10" fill="currentColor" opacity="0.7">tag v1.0</text>
  <text x="510" y="288" font-size="10" fill="currentColor" opacity="0.7">tag v1.1</text>
  <text x="636" y="338" font-size="10" fill="currentColor" opacity="0.7">hotfix</text>
  <text x="372" y="334" font-size="10" fill="currentColor" opacity="0.7">release/*</text>
</svg>

---

## 2. Feature branch & short-lived branch

Quy tắc vàng đi làm: **branch càng sống lâu, conflict càng đau**. Branch lý tưởng sống dưới 2-3 ngày.

```bash
# Luôn tách branch từ main mới nhất
git switch main
git pull --ff-only origin main      # kéo main mới, không tạo merge commit thừa
git switch -c feat/user-avatar      # đặt tên có ý nghĩa: type/mô-tả-ngắn
```

```text
Đặt tên branch (quy ước phổ biến):
  feat/checkout-coupon
  fix/login-redirect
  chore/bump-deps
  hotfix/payment-500
```

> ⚠️ Bẫy: Branch "khổng lồ" sống 3 tuần với 40 file thay đổi là cơn ác mộng review + chắc chắn conflict. Chia nhỏ công việc thành nhiều branch/PR ngắn. Nếu feature lớn, dùng **feature flag** để merge dần phần code chưa bật.

```bash
# Cập nhật branch thường xuyên để conflict nhỏ & sớm
git switch feat/user-avatar
git fetch origin
git rebase origin/main        # hoặc merge — xem mục 8
```

---

## 3. Conflict xảy ra khi nào & đọc marker

Conflict xảy ra khi hai nhánh **sửa cùng vùng của cùng một file** (hoặc một bên sửa, một bên xoá). Git không tự đoán được ý bạn, nên dừng lại nhờ bạn quyết.

```bash
git rebase origin/main
```

```text
Auto-merging src/auth.ts
CONFLICT (content): Merge conflict in src/auth.ts
error: could not apply 7f3a2b1... add token refresh
```

Mở file ra, bạn thấy marker:

```text
<<<<<<< HEAD
const TIMEOUT = 3000;          // phần đang có ở nhánh bạn đang đứng
=======
const TIMEOUT = 5000;          // phần đến từ nhánh kia (origin/main)
>>>>>>> origin/main
```

Ba dòng marker cần thuộc lòng:

```text
<<<<<<< HEAD          bắt đầu "phía của tôi" (ours)
=======               ranh giới
>>>>>>> <nhánh kia>   kết thúc "phía của họ" (theirs)
```

> ⚠️ Bẫy: Trong `git rebase`, **HEAD/ours là origin/main**, còn "theirs" mới là commit của bạn — **ngược với trực giác**! Vì rebase phát lại commit của bạn LÊN TRÊN main. Trong `git merge` thì HEAD/ours đúng là nhánh bạn đang đứng. Đọc kỹ tên sau `>>>>>>>` thay vì đoán.

Cách giải: **xoá sạch cả 3 dòng marker**, giữ lại đoạn code đúng (có thể là của bên này, bên kia, hoặc trộn cả hai), rồi:

```bash
git add src/auth.ts
git rebase --continue        # nếu đang rebase
# git commit                 # nếu đang merge
```

Muốn thoát giữa chừng, quay về trạng thái sạch:

```bash
git rebase --abort           # huỷ rebase, về như chưa làm gì
git merge --abort            # huỷ merge
```

---

## 4. Chọn nhanh một bên (ours / theirs)

Khi chắc chắn lấy nguyên một bên cho cả file:

```bash
# Trong lúc MERGE:
git checkout --ours  config/prod.json    # giữ phía nhánh đang đứng
git checkout --theirs config/prod.json   # lấy phía nhánh được merge vào
git add config/prod.json

# Trong lúc REBASE thì ngược nghĩa (xem bẫy ở mục 3)
```

Xem file nào còn conflict:

```bash
git status            # liệt kê "both modified"
git diff              # xem các hunk conflict
git diff --name-only --diff-filter=U   # chỉ tên file còn unmerged
```

> 💡 Ghi nhớ: `--ours`/`--theirs` lấy **nguyên cả file** một phía. Nếu cần giữ phần này của bên A, phần kia của bên B → phải sửa tay từng hunk, đừng dùng checkout cả file.

---

## 5. Chọn từng hunk & dùng mergetool

Conflict thật thường cần **trộn**: giữ logic mới của bạn nhưng theo signature mới của main. Lúc này sửa tay theo marker là chuẩn nhất. Với file lớn/nhiều conflict, dùng mergetool 3 cửa sổ:

```bash
git mergetool                 # mở tool đã cấu hình (vimdiff, meld, kdiff3, vscode...)
```

Cấu hình VS Code làm mergetool:

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
# tránh tạo file rác .orig sau khi giải:
git config --global mergetool.keepBackup false
```

Bố cục 3-way (3 panel) cần hiểu:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bố cục 3-way merge của mergetool: ours, BASE, theirs hội tụ về kết quả</title>
  <desc>Ba panel trên cùng: ours là HEAD, BASE là tổ tiên chung ở giữa được nhấn mạnh, theirs là nhánh kia. Cả ba mũi tên hội tụ xuống panel kết quả là file bạn lưu. BASE giúp biết mỗi bên đã đổi gì so với gốc.</desc>
  <g>
    <rect x="20" y="40" width="190" height="70" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="115" y="66" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">ours (HEAD)</text>
    <text x="115" y="90" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">phía nhánh bạn đang đứng</text>
  </g>
  <g>
    <rect x="262" y="34" width="196" height="82" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
    <rect x="278" y="48" width="62" height="20" rx="10" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="309" y="62" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">BASE</text>
    <text x="360" y="63" font-size="12.5" font-weight="700" fill="currentColor">tổ tiên chung</text>
    <text x="360" y="98" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">bản trước khi hai bên rẽ nhánh</text>
  </g>
  <g>
    <rect x="510" y="40" width="190" height="70" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="605" y="66" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">theirs</text>
    <text x="605" y="90" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">phía nhánh kia</text>
  </g>
  <defs>
    <marker id="mtArr" markerWidth="11" markerHeight="11" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" fill="none">
    <path d="M115 110 C 115 180, 300 180, 348 210" marker-end="url(#mtArr)"/>
    <path d="M360 116 L360 206" marker-end="url(#mtArr)"/>
    <path d="M605 110 C 605 180, 420 180, 372 210" marker-end="url(#mtArr)"/>
  </g>
  <text x="360" y="162" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">so BASE để biết mỗi bên đổi gì</text>
  <g>
    <rect x="220" y="216" width="280" height="74" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="360" y="246" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">KẾT QUẢ</text>
    <text x="360" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">file bạn lưu — trộn đúng từ ba phía</text>
  </g>
</svg>


BASE là phiên bản **trước khi hai bên rẽ nhánh** — nhìn BASE để biết mỗi bên đã đổi gì so với gốc, từ đó quyết định giữ gì. Đây là điểm mergetool hơn hẳn sửa tay khi conflict rối.

```bash
# Xem cả 3 phiên bản của một file đang conflict:
git show :1:src/auth.ts   # base
git show :2:src/auth.ts   # ours
git show :3:src/auth.ts   # theirs
```

---

## 6. git rerere — không giải lại cùng một conflict hai lần

`rerere` = **RE**use **RE**corded **RE**solution. Git ghi nhớ cách bạn đã giải một conflict, lần sau gặp **đúng conflict đó** nó tự áp lại.

Cực hữu ích khi: rebase một branch dài nhiều lần, hoặc maintain branch phải merge `main` liên tục — bạn không phải giải đi giải lại cùng đoạn.

```bash
git config --global rerere.enabled true
```

Sau khi bật, lần đầu giải conflict bạn vẫn làm tay. Lần sau gặp lại:

```text
git rebase origin/main
Auto-merging src/auth.ts
Resolved 'src/auth.ts' using previous resolution.   <- rerere tự giải!
```

```bash
git rerere status      # file nào rerere đang theo dõi
git rerere diff        # cách giải đã ghi lại
git rerere forget src/auth.ts   # quên cách giải sai để giải lại
```

> 💡 Ghi nhớ: Bật `rerere.enabled true` một lần và để đó. Nó âm thầm tiết kiệm cho bạn hàng giờ trong các cuộc rebase dài. Không có nhược điểm đáng kể.

> ⚠️ Bẫy: Nếu lần đầu bạn giải **sai**, rerere sẽ vui vẻ lặp lại cái sai đó. Khi thấy nó "tự giải" mà kết quả lạ, dùng `git rerere forget <file>` rồi giải lại cho đúng.

---

## 7. Conventional Commits & commit message tốt

Một commit message tốt giúp người sau (và chính bạn 6 tháng nữa) hiểu **tại sao**, không chỉ **cái gì**. **Conventional Commits** là quy ước chuẩn, máy đọc được (tự sinh changelog, tự bump version).

```text
<type>(<scope>): <mô tả ngắn, thể mệnh lệnh, không chấm cuối>

<thân: GIẢI THÍCH TẠI SAO, không phải mô tả lại diff>

<footer: BREAKING CHANGE / Refs #123>
```

Các `type` hay dùng:

```text
feat     thêm tính năng         fix      sửa bug
docs     tài liệu               refactor đổi code, không đổi hành vi
test     thêm/sửa test          chore    việc lặt vặt (deps, config)
perf     cải thiện hiệu năng    build/ci  hệ thống build, pipeline
```

Ví dụ tốt vs tệ:

```text
✗ git commit -m "fix"
✗ git commit -m "update code"
✗ git commit -m "sửa lại lần cuối thật"

✓ feat(auth): thêm refresh token tự động khi 401
✓ fix(cart): chặn số lượng âm khi user spam nút giảm
```

Commit có thân giải thích lý do:

```bash
git commit -m "fix(payment): retry webhook khi Stripe trả 503" \
           -m "Stripe thỉnh thoảng 503 lúc cao tải, mất event thanh toán. \
Thêm retry 3 lần backoff. Refs #482"
```

Breaking change:

```text
feat(api): đổi field `userId` thành `user_id` trong response

BREAKING CHANGE: client cũ đọc `userId` sẽ nhận undefined.
Cần cập nhật mobile app >= v2.3.
```

> 💡 Ghi nhớ: Mỗi commit nên là **một thay đổi logic hoàn chỉnh** (atomic). Đừng gộp "sửa bug + đổi format + thêm feature" vào một commit — khi cần revert hay `git bisect`, bạn sẽ khốn khổ.

---

## 8. Rebase vs merge khi update feature branch

Branch của bạn lỗi thời so với `main`. Có hai cách kéo `main` mới về:

**Cách A — merge main vào branch:**

```bash
git switch feat/x
git merge origin/main
```

```text
main:    o---o---o---A---B
              \           \
feat:          o---o---o---M     <- M là merge commit, lịch sử rẽ nhánh
```

**Cách B — rebase branch lên main:**

```bash
git switch feat/x
git fetch origin
git rebase origin/main
```

```text
main:    o---o---o---A---B
                          \
feat:                      o'--o'--o'   <- commit của bạn được PHÁT LẠI lên B
```

Khác nhau:

```text
                merge main vào branch        rebase branch lên main
History         có merge commit, rẽ nhánh    thẳng tuyến, sạch
Commit hash     giữ nguyên                   bị viết lại (commit mới)
An toàn         luôn an toàn                 KHÔNG rebase branch đã share
Khi giải xung   1 lần                        có thể lặp từng commit
```

> ⚠️ Bẫy GOLDEN RULE: **Không bao giờ rebase một branch đã được người khác pull/dùng chung** (đặc biệt `main`). Rebase viết lại hash → người khác sẽ bị lệch lịch sử, kéo về thành mớ hỗn độn. Rebase chỉ dùng cho branch **của riêng bạn, chưa ai dùng**.

Nếu lỡ rebase rồi và branch đã push trước đó, push lại an toàn bằng:

```bash
git push --force-with-lease     # AN TOÀN hơn --force:
                                # từ chối nếu remote có commit bạn chưa thấy
```

> 💡 Ghi nhớ: Đi làm thực tế, lựa chọn phổ biến: **rebase branch riêng của bạn lên `main`** để lịch sử sạch, rồi merge vào `main` qua PR (squash hoặc merge commit tuỳ convention team). Đừng tự ý dùng `--force` lên branch chung.

Dọn lịch sử branch trước khi mở PR bằng interactive rebase (gộp commit "fix typo", "wip"):

```bash
git rebase -i origin/main
# trong editor: đổi 'pick' -> 'squash'/'fixup' ở các commit rác
```

---

## 9. PR sạch: nhỏ, atomic, review-able

PR là sản phẩm bạn giao cho đồng đội đọc. PR tốt được merge nhanh; PR 1500 dòng nằm chờ cả tuần.

```text
PR TỐT                              PR TỆ
- < 400 dòng thay đổi               - 2000 dòng, 30 file
- một mục tiêu duy nhất             - "feature + refactor + format"
- tự review trước khi gửi          - gửi luôn, lỗi rõ ràng còn đó
- title + mô tả: làm gì, vì sao     - title "update", mô tả trống
- CI xanh                          - CI đỏ, "để sau sửa"
- kèm cách test / screenshot       - reviewer phải tự đoán
```

Mẹo thực chiến:

```bash
# Tách thay đổi format/whitespace ra PR riêng để diff feature gọn
# Tự review trước khi gửi:
git diff origin/main...HEAD        # xem đúng những gì PR sẽ chứa
```

```text
Quy trình chuẩn 1 task:
  main --pull--> feat/x --code--> commit nhỏ atomic
       --rebase origin/main--> giải conflict --> push --force-with-lease
       --> mở PR nhỏ, mô tả rõ --> review --> merge --> xoá branch
```

> 💡 Ghi nhớ: Một PR = một ý tưởng. Nếu bạn thấy mình viết "và" trong mô tả PR ("thêm login **và** refactor router"), rất có thể nên tách thành hai PR.

> ⚠️ Bẫy: Đừng để branch đã merge nằm lại. Xoá để repo gọn: `git branch -d feat/x` (local) và xoá trên remote qua nút "Delete branch" sau khi merge PR. Dọn local: `git fetch --prune`.

---

## Tổng kết

- Chọn chiến lược theo **tốc độ release**: GitHub Flow/trunk-based cho web deploy liên tục; GitFlow cho sản phẩm có version.
- Branch **sống ngắn**, cập nhật `main` thường xuyên → conflict nhỏ và sớm.
- Conflict: đọc kỹ marker `<<<<<<< ======= >>>>>>>`, nhớ ours/theirs **đảo nghĩa khi rebase**, dùng mergetool 3-way khi rối, `--abort` để thoát an toàn.
- Bật `rerere.enabled true` để khỏi giải lại cùng conflict.
- Commit **atomic** + Conventional Commits; PR **nhỏ, một mục tiêu, tự review**.
- Rebase branch **riêng** để sạch lịch sử; **không bao giờ** rebase branch chung; push lại bằng `--force-with-lease`.
