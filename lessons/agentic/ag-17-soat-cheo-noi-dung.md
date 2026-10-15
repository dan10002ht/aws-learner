# Bài 17 — N agent viết N phần: đúng từng phần, sai tổng thể

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích bằng cơ chế context của subagent vì sao **N phần viết song song có thể đúng từng phần mà sai tổng thể**, và vì sao không gate một-file nào bắt được lỗi đó.
- Gọi tên và tìm được **ba lớp lỗi nằm giữa các phần**: hệ số vay mượn, nhãn/đơn vị lệch, hai vế của cùng một câu không khớp.
- Viết vào brief **bảng số và thuật ngữ dùng chung** trước khi fan-out, và chia các phần thành **đợt** theo đồ thị phụ thuộc bằng một script.
- Chạy một **script soát chéo** trên thư mục các phần, đọc finding, và chứng minh script đỏ được trên lỗi cài sẵn rồi xanh lại sau khi sửa.
- Xử lý đúng khi hai phần báo hai con số khác nhau: **đọc điều kiện đo của cả hai** trước khi sửa bên nào.

---

## 2. Tình huống

Case thực tế, chính repo này: course game server 42 bài, 10 chương, mỗi bài giao một subagent viết. Quy trình đã được làm kỹ theo [[ag-14-subagent-va-brief]]: brief chung, main agent không viết mà chỉ kiểm, và mỗi bài trước khi commit được **tính lại từng con số**. Mọi gate máy đều xanh: build web, type-check, lint, validate SVG, kiểm id trùng.

Rồi khi đọc liền mạch một chương, các lỗi sau lộ ra (ghi nguyên từ nhật ký, một lần làm, không phải thống kê):

- Bài 26 (vùng quan tâm) cần dẫn lại hệ số giảm băng thông của bài 24 (lượng tử hoá). Agent viết bài 26 chạy **cùng lượt** với bài 24, file bài 24 chưa có trên đĩa. Bản nháp của nó ghi một hệ số nghe rất hợp lý. Các bản nháp khác nhau lần lượt ghi `10×`, `×4`, `×2,5`. Số đo thật ở bài 24 là **`8,67×`** (bản đã sửa nằm ở [[gs-26-area-of-interest]]).
- Cùng một thang ba mức, bài này gọi `A/B/C`, bài kia gọi `(a)/(b)/(c)`. Cùng một đại lượng, bài này dùng KB, bài kia dùng KiB, nên hai bài in `320` và `328` MB cho cùng một thứ. Một bài suýt trộn ns với ms.
- Một câu viết `35,4 MB/s = 297,1 Mbps`. Hai số đều có nguồn, nhưng `35,4 × 8 = 283,2`.
- Ngay dưới một bảng có hai cột `90` và `630`, bài viết "chênh đúng **19 lần**". `630 / 90 = 7`. Số 19 có thật, nhưng là của một đại lượng khác trong cùng bài.

Không phần nào trong số này bị bắt bởi bước "tính lại từng con số". Người kiểm mở bài 26, thấy `10×`, kiểm phép nhân dùng `10×` thì phép nhân đúng. Ba câu sai đều qua sạch năm gate.

---

## ⏸ Dừng lại — đoán trước

Mỗi bài đã được tính lại **từng con số**, và cả năm gate đều xanh. Vậy về mặt cấu trúc, phép kiểm cần có thêm **input gì** mà quy trình trên không có, thì mới bắt được bốn lỗi ở trên?

*(Đáp án ở §3.1.)*

---

## 3. Cơ chế

### 3.1 Lỗi nằm ở cặp phần, phép kiểm chỉ nhìn một phần

**Subagent** là một agent con được agent chính giao việc, chạy trong context riêng. Docs của Claude Code mô tả rõ nó thấy gì (nguồn: `https://code.claude.com/docs/en/sub-agents`):

- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read."
- Context lúc khởi động gồm system prompt riêng, **task message** do agent chính viết, các file CLAUDE.md, git status, skill được khai báo. Danh sách đó không có output của subagent anh em.

Vậy khi bài 24 và bài 26 chạy cùng lượt, thứ duy nhất bài 26 biết về bài 24 là **những gì brief nói**. Brief không có hệ số `8,67×` vì lúc viết brief chưa ai đo ra số đó. Agent được yêu cầu viết một bài trọn vẹn, có số, nên nó điền một số nghe hợp lý thay vì để trống. Đó là hành vi mặc định của model khi thiếu dữ kiện, không phải lỗi của một agent cụ thể.

Đáp án cho câu hỏi ở trên: lỗi giữa hai phần là một **hàm của cặp file** (bài 26, bài 24), còn mọi gate và bước "tính lại" đều là **hàm của một file**. Build kiểm một file có biên dịch được không; tính lại kiểm một phép tính có khớp với các số **trong cùng bài** không. Input còn thiếu là phần kia. Không gate một-file nào đỏ được với lỗi mà nó không có input để thấy.

Số cặp cần đối chiếu tăng theo bình phương số phần:

```python
from math import comb
for n in (3, 10, 42):
    print(n, "phần ->", comb(n, 2), "cặp")
# 3 phần -> 3 cặp
# 10 phần -> 45 cặp
# 42 phần -> 861 cặp
```

861 cặp là lý do không thể "đọc chéo bằng mắt cho kỹ". Phải có cơ chế: chặn từ trước bằng brief và đợt (§3.4), quét sau bằng script (§3.5), và người điều phối đọc phần script không phán được.

### 3.2 Ba lớp lỗi, và phép kiểm cho từng lớp

Ba lớp dưới đây có ca thật trong course 42 bài, và cả ba đi qua mọi gate máy (kinh nghiệm thực tế).

**Lớp 1 — Hệ số vay mượn.** Phần X trích một con số mà nguồn của nó nằm ở phần Y. Nếu X được viết trước khi Y có trên đĩa, con số trong X là do agent đặt ra.
Phép kiểm: liệt kê mọi con số trong X có nguồn ở Y, **mở file Y ra đối chiếu**. Không hỏi lại agent đã viết X: nó không có Y trong context lúc viết, và cũng không có lúc bạn hỏi.

**Lớp 2 — Nhãn và đơn vị lệch.** Mỗi phần tự chọn cách gọi. Riêng từng phần thì nhất quán, ghép lại thì người đọc thấy hai hệ thống. KB/KiB nguy hiểm hơn `A/B/C` vs `(a)/(b)/(c)` vì nó đổi giá trị: 320 KiB = 327,68 KB, nên hai bài cùng đúng mà in hai số khác nhau.
Phép kiểm: quét toàn bộ tài liệu theo từng **nhóm biến thể**, mỗi nhóm chỉ được dùng một biến thể. Làm trước khi đóng một chương.

**Lớp 3 — Hai vế của một câu.** Mỗi con số đều đúng, mỗi phép tính trong bài đều đúng, nhưng dấu bằng (hoặc chữ "chênh N lần") nối hai số không thuộc về nhau. Đây là lớp khó thấy nhất, vì "kiểm lại từng con số" cho kết quả **khớp**: 35,4 có nguồn, 297,1 có nguồn.
Phép kiểm: đọc **quan hệ** giữa các số trong cùng một câu, tức tính lại vế trái và so với vế phải.

### 3.3 Hai số khác nhau không có nghĩa là có người sai

Case thực tế: hai bài báo hai tỉ lệ khác nhau cho cùng một hiện tượng (phép `a*b+c` bị compiler gộp thành lệnh FMA trên arm64): **13,96%** ở [[gs-10-determinism-killers]] và **19,92%** ở [[gs-11-fixed-point]]. Đo độc lập ra **cả hai đều đúng**: một bài lấy `(a,b,c)` trong `[0,1)`, bài kia trong `[-1,1]`, cỡ mẫu khác nhau (một triệu so với 200.000). Bản cuối của bài 11 ghi rõ lý do lệch thay vì sửa cho khớp.

Nếu người điều phối "hoà giải" bằng cách sửa một bên theo bên kia, kết quả còn tệ hơn để nguyên: nó **xoá mất một điều kiện đo đúng** và để lại một con số mất ngữ cảnh. Thứ tự đúng:

1. Đọc điều kiện đo của cả hai bên (input, phân phối, cỡ mẫu, máy, phiên bản).
2. Nếu điều kiện khác, cả hai được giữ, mỗi bên ghi điều kiện của mình.
3. Chỉ khi điều kiện giống mà số khác mới tự đo lại.

Phép đo đối chứng của chính người điều phối cũng hỏng được. Trong cùng case, lần đo FMA đầu tiên của người điều phối ra **0%**, vì compiler gộp FMA ở **cả** hàm đối chứng. Disassemble ra thì cả hai hàm đều dùng lệnh `FMADDD`. Con số 0 đó vô nghĩa, không có nghĩa là "không có hiện tượng". Phép đo phải đỏ được trên một ca biết chắc là có lỗi, xem [[ag-11-gate-xanh-gia]].

### 3.4 Chặn từ trước: số chung đặt sẵn trong brief, chia đợt theo phụ thuộc

Rẻ nhất là không để lỗi sinh ra. Có ba đòn bẩy, tất cả nằm trong brief và lịch chạy, trước khi fan-out:

**(a) Bảng số và thuật ngữ dùng chung.** Mọi con số mà hơn một phần sẽ dùng, và mọi thuật ngữ/đơn vị có nhiều cách viết, được ghi vào brief **một lần** với một tên. Agent nào cần thì trích từ bảng, không tự đặt. Mẫu (minh hoạ, dùng được ngay):

```markdown
## Số dùng chung (chỉ trích, không tự đặt lại)
| Tên            | Giá trị | Nguồn                  | Điều kiện đo                      |
|----------------|---------|------------------------|-----------------------------------|
| he_so_quantize | 8,67×   | phần 24, bảng §3.2     | 112,7 B -> 13 B mỗi entity        |
| tick_rate      | 30 Hz   | phần 05                | giá trị ví dụ, thay bằng số thật  |

Số chưa có trong bảng mà bạn cần từ phần khác: KHÔNG điền. Viết `CẦN-SỐ(<tên>, phần N)`
để người điều phối điền sau. Một placeholder lộ ra còn hơn một con số nghe hợp lý.

## Thuật ngữ & đơn vị (một biến thể duy nhất)
- Dung lượng: KiB, MiB (không dùng KB/MB cho dung lượng). Băng thông: KB/s, Mbps.
- Thang ba mức: A/B/C (không dùng (a)/(b)/(c), 1/2/3).
- Thời gian: ms cho tick và latency; ns chỉ trong bảng benchmark, cột ghi rõ đơn vị.
- Số thập phân: dấu phẩy (8,67); nghìn: dấu chấm (1.124,7).

## Khi số trong brief không tái tạo được
Ghi số bạn đo được, kèm lệnh đo và điều kiện, và nói rõ nó khác brief. Không âm thầm dùng số của brief.
```

Placeholder `CẦN-SỐ(...)` là điểm mấu chốt: nó biến lỗi lớp 1 từ một con số im lặng thành một chuỗi grep được (`grep -rn "CẦN-SỐ" parts/`).

**(b) Chia đợt thay vì bắn hết một lượt.** Đợt sau đọc được file của đợt trước trên đĩa, nên lớp 1 bị triệt tận gốc cho các phần có phụ thuộc. Các phần độc lập vẫn chạy song song trong cùng đợt. Brief khai báo phần nào trích số của phần nào, rồi một script tính đợt:

```python
# waves.py — chia đợt theo phụ thuộc: phần X chỉ được viết khi mọi phần nó trích số đã nằm trên đĩa.
deps = {                      # phần -> các phần nó cần đọc số
    "24-quantize": [],
    "25-delta":    ["24-quantize"],
    "26-aoi":      ["24-quantize"],
    "27-priority": ["26-aoi"],
    "28-room":     [],
    "29-gateway":  ["28-room"],
    "41-capstone": ["24-quantize", "26-aoi", "29-gateway"],
}
wave = {}
def level(p):
    if p not in wave:
        wave[p] = 1 + max((level(d) for d in deps[p]), default=0)
    return wave[p]
for p in deps:
    level(p)
for w in sorted(set(wave.values())):
    print(f"Đợt {w}: {sorted(p for p in deps if wave[p] == w)}")
print(f"{len(deps)} phần -> {max(wave.values())} đợt thay vì 1 đợt bắn hết")
```

```
Đợt 1: ['24-quantize', '28-room']
Đợt 2: ['25-delta', '26-aoi', '29-gateway']
Đợt 3: ['27-priority', '41-capstone']
7 phần -> 3 đợt thay vì 1 đợt bắn hết
```

Số đợt bằng độ dài chuỗi phụ thuộc dài nhất, không phải số phần. Cái giá là thời gian chờ: thời gian tổng xấp xỉ bằng tổng, qua các đợt, của thời gian phần chậm nhất trong mỗi đợt. Bài này không có số đo cho chi phí đó. Muốn biết thì ghi giờ bắt đầu/kết thúc từng phần trong một lần chạy thật rồi so hai lịch. Đồ thị có vòng (A trích B, B trích A) thì đệ quy trên không dừng. Đó là tín hiệu phải tách số chung ra bảng ở (a), không phải tín hiệu phải sửa script.

**(c) Trần độ dài trong brief.** Case thực tế, một lần làm: siết trần 30 KB mỗi bài thì các chương sau ra 22–24 KB, so với 28–33 KB ở các chương trước, và đọc lại không thấy mất nội dung. Phần bị cắt là phần lặp. Bài ngắn hơn thì ít câu hơn, ít chỗ cho lỗi lớp 3 hơn, và người điều phối soát nhanh hơn. Không cắt hồi tố những bài đã dày vì có output chạy thật.

### 3.5 Quét sau: script soát chéo

Brief và đợt giảm lỗi chứ không xoá hết: agent vẫn có thể viết KB thay vì KiB, vẫn có thể ghép nhầm hai số trong một câu. Script soát chéo là phép kiểm có **cả N file làm input**, đúng thứ §3.1 nói là còn thiếu. Ba lớp lỗi không đều nhau ở chỗ máy làm được tới đâu:

- **Lớp 3 làm máy được tốt nhất.** Một phép tính viết trong backtick (`630 / 90 = 19`) hoặc một quy đổi đơn vị (`35,4 MB/s = 297,1 Mbps`) là thứ tính lại được. Điều kiện là dung sai phải đúng: số in trong bài đã được làm tròn, nên vế trái cũng mang sai số. Lần chạy thử đầu tiên khi viết bài này, script chỉ cho phép sai số làm tròn của vế phải và báo 2 finding trên course game server đã ship: `8,67 × 2,5 × 24,95 = 540,7` (tính ra 540,79) và `37,1 MB/s = 297,1 Mbps` (tính ra 296,8). Cả hai đều do vế trái đã làm tròn: `297,1 / 8 = 37,14`, in ra thành 37,1. Cách sửa là sửa **thước đo** (lan truyền sai số làm tròn của từng số vế trái), không sửa bài. Sau khi sửa, lớp 3 ra 0 finding trên course đó, mà vẫn bắt đủ hai lỗi cài sẵn ở §4.
- **Lớp 2 làm máy được nếu brief có danh sách nhóm biến thể.** Script không biết KB và KiB là "cùng một nhóm" trừ khi bạn khai báo. Danh sách nhóm chép từ mục thuật ngữ của brief.
- **Lớp 1 máy chỉ thu hẹp được.** Script tìm những dòng nhắc "phần N" kèm một hệ số (`×`, `lần`, `%`), rồi kiểm số đó có xuất hiện trong file phần N không. Trên course 42 bài, cũng lần chạy đó, nó báo **160** dòng. Đọc lướt 40 dòng đầu thấy nhiều dòng nhắc vài bài cùng lúc và mang cả số tính tại chỗ, tức là dấu hiệu báo nhầm. Tỉ lệ báo đúng chưa được đo. Cách đo: lấy ngẫu nhiên 20 finding, mở file nguồn, đếm số finding đúng. Muốn lớp 1 chính xác thì phải đổi quy ước chứ không phải thêm regex: brief bắt mọi số mượn viết theo một dạng cố định (ví dụ `(phần 24: 8,67×)`) hoặc dùng placeholder `CẦN-SỐ(...)`, và script chỉ kiểm dạng đó.

Toàn bộ script nằm ở §4. Nó **không phán đúng/sai**. Mỗi finding là một chỗ người điều phối phải mở file nguồn ra đọc, và §3.3 là cách đọc.

### 3.6 Vì sao phần đọc này nằm ở người điều phối

Kinh nghiệm thực tế từ case: ba phép kiểm trên do người điều phối (bạn, hoặc main agent của bạn) làm, không giao tiếp cho một subagent. Lý do là cấu trúc, không phải tin tưởng:

- Subagent viết phần X không có phần Y trong context (§3.1), nên hỏi nó "số này lấy đâu ra" chỉ cho một câu trả lời nghe hợp lý thứ hai.
- Một subagent mới được giao "soát chéo" thì phải nạp cả N phần vào context. Với 42 bài cỡ 20–47 KB mỗi bài (kích thước file thật trong repo), riêng phần nạp đó đã khoảng 1.540 KB văn bản (`du -ck` trên thư mục bài, đo khi viết bài này). Nếu nó chỉ nạp vài phần thì nó lại thành phép kiểm trên một phần.
- Người điều phối là nơi duy nhất đã có brief, bảng số, đồ thị phụ thuộc và danh sách finding. Script làm phần cơ học; người điều phối đọc quan hệ.

Điều này khác với verifier ở [[ag-12-verifier-doc-lap]]: verifier chấm **một** đơn vị việc với context sạch, còn soát chéo chấm **quan hệ giữa** các đơn vị việc.

### 3.7 Agent cãi lại brief là tín hiệu, không phải lỗi

Case thực tế, 42 bài: có **năm lần** agent nói ngược chỉ dẫn trong brief kèm số đo nó tự chạy, và **cả năm lần agent đúng** (brief đặt số từ ước lượng, agent đo ra số khác). Chiều ngược lại cũng có: một lần agent tự khai "chỗ này mâu thuẫn với bài trước", kiểm ra thì không có mâu thuẫn.

Cách xử lý không phải tin agent, cũng không phải tin brief, mà là **tự đo lại**: brief là giả thuyết, phép đo là nguồn. Vì vậy brief mẫu ở §3.4 có mục "Khi số trong brief không tái tạo được": nó biến việc cãi lại thành một output có cấu trúc (số + lệnh + điều kiện) mà người điều phối kiểm được, thay vì một chỗ lệch im lặng.

---

## 4. Làm thử

Mục tiêu: dựng ba "phần" nhỏ có cài sẵn năm lỗi thuộc ba lớp, chạy script thấy đúng năm finding, sửa rồi chạy lại thấy 0. Chỉ cần Python 3, không cần thư viện ngoài.

**Bước 1 — tạo ba phần có lỗi cài sẵn.**

```bash
mkdir -p soat-cheo/parts && cd soat-cheo

cat > parts/p1-quantize.md <<'EOF'
# Phần 1 — Lượng tử hoá trạng thái

Mỗi entity giảm từ 112,7 B xuống 13 B: hệ số `112,7 / 13 = 8,67`.
Ba mức độ chính xác được gọi là A/B/C.
Snapshot đầy đủ nặng 320 KiB.
EOF

cat > parts/p2-aoi.md <<'EOF'
# Phần 2 — Vùng quan tâm

Sau khi lượng tử hoá ở phần 1 (giảm 10×), mỗi client còn nhận 129,7 KB/s.
Ghép hai đòn bẩy: `8,67 × 2,5 = 21,7`.
Ba mức (a)/(b)/(c) tương ứng ba bán kính.
Snapshot đầy đủ nặng 328 KB.
EOF

cat > parts/p3-cost.md <<'EOF'
# Phần 3 — Quy ra tiền

Egress mỗi node: 35,4 MB/s = 297,1 Mbps.
Hai cột của bảng là 90 và 630: chênh `630 / 90 = 19` lần.
Theo phần 1, quantize giảm 8,67× nên phần này không quantize lại.
EOF
```

Năm lỗi cài sẵn: `10×` (lớp 1), KiB/KB và A/B/C/(a)/(b)/(c) (lớp 2), `297,1 Mbps` và `= 19` (lớp 3). Có hai câu **đúng** để kiểm script không báo nhầm: `8,67 × 2,5 = 21,7` (tính ra 21,675, nằm trong sai số làm tròn) và dòng `8,67×` của phần 3 (số này có trong phần 1).

**Bước 2 — lưu script thành `soat_cheo.py`.**

```python
#!/usr/bin/env python3
"""Soát chéo N phần viết song song — tìm lỗi nằm GIỮA các phần.

Dùng:  python3 soat_cheo.py <thư-mục-chứa-các-phần-.md>
Exit:  0 = không có finding, 1 = có finding, 2 = dùng sai.

Script KHÔNG phán đúng/sai. Nó thu hẹp chỗ cần đọc: mỗi finding là một
chỗ người điều phối phải mở file nguồn ra đối chiếu.
"""
import pathlib
import re
import sys

# Số kiểu Việt: "1.124,7" -> 1124.7 ; "8,67" -> 8.67 ; "13" -> 13
NUM = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?"

# Lớp 2 — nhóm biến thể KHÔNG được cùng xuất hiện trong một tài liệu.
# Chép từ mục "Thuật ngữ & đơn vị" của brief; mỗi nhóm: tên -> {biến thể: regex}.
TERM_GROUPS = {
    "đơn vị dung lượng": {"KiB": r"\bKiB\b", "KB": r"\bKB\b(?!/s)"},
    "nhãn thang ba mức": {"A/B/C": r"\bA/B/C\b", "(a)/(b)/(c)": r"\(a\)/\(b\)/\(c\)"},
}

# Lớp 3b — quy đổi đơn vị hợp lệ: (đơn vị trái, đơn vị phải) -> hệ số nhân.
CONVERSIONS = {
    ("MB/s", "Mbps"): 8,
    ("KB", "B"): 1000,
    ("KiB", "B"): 1024,
    ("ms", "ns"): 1_000_000,
}

EXPR = re.compile(rf"`((?:{NUM})(?:\s*[×x*/+−-]\s*(?:{NUM}))+)\s*=\s*({NUM})`")
CONV = re.compile(rf"({NUM})\s*([A-Za-z/]+)\s*=\s*({NUM})\s*([A-Za-z/]+)")
REF = re.compile(r"(?:phần|bài)\s+(\d+)", re.IGNORECASE)
COEF = re.compile(rf"({NUM})\s*(?:×|lần|%)")


def to_float(s):
    return float(s.replace(".", "").replace(",", "."))


def half_ulp(s):
    """Sai số làm tròn của một số đã in: '8,67' -> 0.005 ; '13' -> 0.5."""
    places = len(s.split(",")[1]) if "," in s else 0
    return 0.5 * 10 ** -places


def evaluate(lhs, bump=None):
    """Tính vế trái; bump=(i, d) cộng d vào số thứ i để đo độ nhạy."""
    nums = re.findall(NUM, lhs)
    vals = [to_float(x) for x in nums]
    if bump:
        vals[bump[0]] += bump[1]
    it = iter(vals)
    py = re.sub(NUM, lambda _: repr(next(it)), lhs)
    py = py.replace("×", "*").replace("x", "*").replace("−", "-")
    return eval(py, {"__builtins__": {}}), nums  # chỉ còn số và + - * /


def consistent(lhs, claimed):
    """Khớp nếu lệch không vượt sai số làm tròn của vế phải CỘNG sai số
    lan truyền từ các số vế trái (mỗi số đã được làm tròn trước khi in)."""
    value, nums = evaluate(lhs)
    slack = half_ulp(claimed)
    for i, s in enumerate(nums):
        slack += abs(evaluate(lhs, (i, half_ulp(s)))[0] - value)
    return abs(value - to_float(claimed)) <= slack + 1e-9, value


def part_number(path):
    m = re.match(r"^[a-z]+-?0*(\d+)", path.stem)
    return int(m.group(1)) if m else None


def check_borrowed(parts, texts):
    """Lớp 1: hệ số trích từ phần khác phải có mặt trong phần đó."""
    out = []
    for path in parts:
        me = part_number(path)
        for ln, line in enumerate(texts[path].splitlines(), 1):
            for ref in REF.finditer(line):
                n = int(ref.group(1))
                if n == me:
                    continue
                src = next((p for p in parts if part_number(p) == n), None)
                if src is None:
                    out.append(f"{path.name}:{ln}: trỏ tới phần {n} nhưng không có file phần {n}")
                    continue
                src_nums = {to_float(x) for x in re.findall(NUM, texts[src])}
                for c in COEF.finditer(line):
                    msg = (f"{path.name}:{ln}: hệ số '{c.group(0)}' gán cho phần {n}"
                           f" nhưng {src.name} không có số {c.group(1)}")
                    if to_float(c.group(1)) not in src_nums and msg not in out:
                        out.append(msg)
    return out


def check_terms(parts, texts):
    """Lớp 2: một nhóm thuật ngữ/đơn vị chỉ được dùng một biến thể trên toàn tài liệu."""
    out = []
    for group, variants in TERM_GROUPS.items():
        used = {}
        for name, rx in variants.items():
            files = [p.name for p in parts if re.search(rx, texts[p])]
            if files:
                used[name] = files
        if len(used) > 1:
            detail = "; ".join(f"'{k}' ở {', '.join(v)}" for k, v in used.items())
            out.append(f"[{group}] lẫn {len(used)} biến thể: {detail}")
    return out


def check_sentences(parts, texts):
    """Lớp 3: hai vế của một dấu bằng trong cùng một câu phải khớp nhau."""
    out = []
    for path in parts:
        for ln, line in enumerate(texts[path].splitlines(), 1):
            for m in EXPR.finditer(line):
                lhs, claimed = m.group(1), m.group(2)
                ok, value = consistent(lhs, claimed)
                if not ok:
                    out.append(f"{path.name}:{ln}: `{lhs} = {claimed}` nhưng tính ra {value:.4g}")
            for m in CONV.finditer(line):
                a, ua, b, ub = m.groups()
                factor = CONVERSIONS.get((ua, ub))
                if factor:  # hệ số quy đổi là chính xác, chỉ số đo bị làm tròn
                    value = to_float(a) * factor
                    slack = half_ulp(b) + half_ulp(a) * factor
                    if abs(value - to_float(b)) > slack + 1e-9:
                        out.append(f"{path.name}:{ln}: {a} {ua} = {b} {ub} nhưng"
                                   f" {a} × {factor} = {value:.4g}")
    return out


def main():
    if len(sys.argv) != 2 or not pathlib.Path(sys.argv[1]).is_dir():
        print(__doc__)
        return 2
    parts = sorted(pathlib.Path(sys.argv[1]).glob("*.md"))
    texts = {p: p.read_text(encoding="utf-8") for p in parts}
    total = 0
    for title, fn in [("1. Hệ số vay mượn", check_borrowed),
                      ("2. Nhãn & đơn vị lệch", check_terms),
                      ("3. Hai vế một câu", check_sentences)]:
        findings = fn(parts, texts)
        total += len(findings)
        print(f"== {title}: {len(findings)} finding")
        for f in findings:
            print("   " + f)
    print(f"Tổng: {total} finding trên {len(parts)} phần")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
```

**Bước 3 — chạy trên bản có lỗi.**

```
$ python3 soat_cheo.py parts; echo "exit=$?"
== 1. Hệ số vay mượn: 1 finding
   p2-aoi.md:3: hệ số '10×' gán cho phần 1 nhưng p1-quantize.md không có số 10
== 2. Nhãn & đơn vị lệch: 2 finding
   [đơn vị dung lượng] lẫn 2 biến thể: 'KiB' ở p1-quantize.md; 'KB' ở p2-aoi.md
   [nhãn thang ba mức] lẫn 2 biến thể: 'A/B/C' ở p1-quantize.md; '(a)/(b)/(c)' ở p2-aoi.md
== 3. Hai vế một câu: 2 finding
   p3-cost.md:3: 35,4 MB/s = 297,1 Mbps nhưng 35,4 × 8 = 283.2
   p3-cost.md:4: `630 / 90 = 19` nhưng tính ra 7
Tổng: 5 finding trên 3 phần
exit=1
```

(Output trên là thật, chạy bằng Python 3 khi viết bài.) `129,7 KB/s` không bị báo: brief quy ước KB/s cho băng thông, nên regex nhóm dung lượng loại `KB/s` ra.

**Bước 4 — sửa theo brief, không theo cảm giác.** Mở hai file và sửa năm chỗ:

- `p2-aoi.md`: `giảm 10×` thành `giảm 8,67×` (mở `p1` lấy số); `(a)/(b)/(c)` thành `A/B/C`; `328 KB` thành `320 KiB` (cùng một dung lượng, đổi về đơn vị của brief).
- `p3-cost.md`: `297,1 Mbps` thành `283,2 Mbps`; `= 19` thành `= 7`.

Với chỗ cuối, hãy dừng một nhịp như §3.3: trong bài thật, "19" có thể đúng cho một đại lượng khác. Câu hỏi đúng là "câu này định so hai số nào?", chứ không chỉ "tính lại là bao nhiêu?".

**Bước 5 — chạy lại.**

```
$ python3 soat_cheo.py parts; echo "exit=$?"
== 1. Hệ số vay mượn: 0 finding
== 2. Nhãn & đơn vị lệch: 0 finding
== 3. Hai vế một câu: 0 finding
Tổng: 0 finding trên 3 phần
exit=0
```

**Tiêu chí xong (kiểm được):**

1. Bản có lỗi: `exit=1` và đúng **5** finding, không có finding nào trỏ vào hai câu đúng.
2. Bản đã sửa: `exit=0`, `Tổng: 0 finding`.
3. Kiểm hai chiều: tự cài thêm một lỗi mới (ví dụ thêm dòng `Uplink: 12,5 MB/s = 125 Mbps` vào `p1`), chạy lại thấy `exit=1` với đúng một finding mới. Thử thêm `1 MB/s = 9 Mbps` thì script **không** báo: số nguyên `1` được coi là đã làm tròn từ khoảng 0,5–1,5, nên 4–12 Mbps đều "khớp". Đó là giới hạn thật của dung sai lan truyền: số in càng thô thì script càng dễ dãi, và brief nên quy định số chữ số thập phân cho số đo. Một script chỉ từng xanh thì chưa chứng minh được gì ([[ag-11-gate-xanh-gia]]).
4. Mở rộng (tuỳ chọn): chạy script trên một thư mục tài liệu thật bạn đã viết nhiều phần, đếm finding từng lớp, lấy mẫu 10 finding lớp 1 để đo tỉ lệ báo đúng. Nếu tỉ lệ thấp, thêm quy ước "số mượn viết dạng cố định" vào brief thay vì thêm regex.

---

## 5. Bẫy thường gặp

### Hỏi lại agent "số này lấy đâu ra"

Agent trả lời tự tin, đưa thêm lý do, và con số được giữ nguyên. Nó không có phần nguồn trong context, lúc viết cũng như lúc bạn hỏi, nên câu trả lời chỉ là một câu hợp lý thứ hai. Phép kiểm lớp 1 luôn mở **file nguồn**. Brief bắt dùng placeholder `CẦN-SỐ(...)` thay vì điền số, và `grep -rn "CẦN-SỐ"` phải rỗng trước khi đóng chương.

### Coi gate xanh là "nhất quán"

Build, lint, check-svg đều xanh, chương được đóng, và lỗi giữa các phần nằm lại nhiều ngày. Mọi gate đó là hàm của một file; không gate nào có cặp file làm input. Soát chéo phải là một bước riêng trong checklist đóng chương, với done-criteria là `soat_cheo.py` exit 0 hoặc mọi finding còn lại đã được ghi lý do giữ ([[ag-10-done-criteria-va-gate]]).

### Sửa một bên cho khớp khi hai số lệch nhau

Sau khi sửa, hai bài khớp nhau nhưng một bài mất câu giải thích vì sao số của nó như vậy. Xung đột số bị coi là "có người sai", trong khi thường là khác điều kiện đo (13,96% và 19,92% ở §3.3). Brief nên bắt mọi số đo kèm điều kiện đo (cột "Điều kiện đo" trong bảng số chung), và khi script báo xung đột thì việc đầu tiên là so hai cột điều kiện.

Cùng gốc là thói quen gạt đi khi agent ghi "brief nói X nhưng tôi đo ra Y" rồi sửa lại về X. Brief là giả thuyết viết trước khi có phép đo; trong case ở §3.7 agent đúng 5/5 lần. Mục "Khi số trong brief không tái tạo được" bắt agent ghi số + lệnh + điều kiện, người điều phối chạy lại lệnh đó, rồi cập nhật kết quả vào **bảng số chung** để các đợt sau dùng số mới.

### Sửa bài cho hợp với một thước đo báo nhầm

Script báo `37,1 MB/s = 297,1 Mbps` là sai, người điều phối sửa thành 296,8 và làm lệch các số khác trong bài vốn tính từ 37,14. Lỗi nằm ở dung sai của script, vốn không tính sai số làm tròn của vế trái (§3.5). Với mỗi finding lớp 3, tính lại bằng số chưa làm tròn trong nguồn trước khi sửa; nếu số chưa làm tròn khớp thì sửa script, không sửa bài. Giữ fixture ở §4 làm test cho script: mỗi lần sửa script, năm lỗi cài sẵn vẫn phải bị bắt và hai câu đúng vẫn không bị báo.

### Phát tất cả N phần trong một lượt

Các phần phụ thuộc mang số tự đặt, mỗi bản nháp một kiểu (`10×`, `×4`, `×2,5`), vì phần nguồn chưa có trên đĩa. Cách chặn đã ở §3.4: brief khai báo `deps`, `waves.py` tính đợt, và vòng giao việc chỉ phát đợt k+1 khi mọi phần của đợt k đã commit.

---

## 6. Chuyển giao

- Bài này nối tiếp [[ag-14-subagent-va-brief]] (giao việc bằng brief), [[ag-15-worktree-va-xung-dot]] (xung đột ở mức **file**: hai agent ghi cùng một file) và [[ag-16-hai-ho-model]] (chấm chéo từng đơn vị việc). Ở đây xung đột nằm ở mức **nội dung**: không ai ghi đè file của ai, nhưng các file mâu thuẫn nhau.
- Bảng số chung, danh sách nhóm thuật ngữ và đồ thị `deps` ở §3.4 là **state dùng chung** mà mọi agent đọc và người điều phối cập nhật. [[ag-18-brief-la-shared-state]] biến chúng thành một file sống ngoài context, có quy tắc ai được ghi.
- Ở Level 6, [[ag-19-vong-lap-nhat-task]] cho vòng loop tự phát đợt. `waves.py` thành bước "chọn task nào được nhặt lượt này", còn `soat_cheo.py` thành một gate chạy sau mỗi đợt. Thứ bạn bỏ được ở level kế tiếp là việc tự tay phát từng đợt và tự nhớ chạy soát chéo. Thứ không bỏ được là đọc các finding lớp 1 và các xung đột cần đọc điều kiện đo.

---

## 7. Tóm tắt

- Subagent bắt đầu với context riêng, không thấy output của anh em (docs Claude Code), nên một phần trích số của phần chưa viết sẽ tự đặt số.
- Mọi gate và bước "tính lại" là hàm của một file. Lỗi giữa các phần là hàm của cặp file: 42 phần là 861 cặp.
- Ba lớp: hệ số vay mượn (mở file nguồn), nhãn/đơn vị lệch (quét theo nhóm biến thể), hai vế một câu (tính lại quan hệ, dung sai có lan truyền làm tròn).
- Chặn từ trước: bảng số + thuật ngữ trong brief, placeholder `CẦN-SỐ(...)` thay vì bịa, chia đợt theo `deps`, trần độ dài.
- Quét sau: `soat_cheo.py` thu hẹp chỗ cần đọc. Lớp 3 máy làm tốt, lớp 2 cần danh sách nhóm, lớp 1 chỉ chính xác khi brief ép một dạng viết cố định.
- Hai số khác nhau: đọc điều kiện đo trước. Agent cãi lại brief: tự đo lại. Thước đo báo nhầm: sửa thước đo, không sửa bài.
