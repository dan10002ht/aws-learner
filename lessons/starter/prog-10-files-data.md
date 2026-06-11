# Làm việc với file & dữ liệu

Cho tới giờ, mọi chương trình của bạn đều "quên sạch" khi tắt đi: biến nằm trong RAM, chạy xong là bay hết. Để chương trình **nhớ** dữ liệu giữa các lần chạy, hoặc **trao đổi** dữ liệu với chương trình khác, bạn cần đọc/ghi **file** và làm việc với các định dạng dữ liệu chuẩn như **JSON**, **CSV**. Bài này còn dạy bạn xử lý ngày giờ, đọc cấu hình/bí mật từ **biến môi trường**, nhận **tham số dòng lệnh**, và ghép tất cả lại thành một công cụ thống kê thực tế.

Hãy hình dung như một văn phòng: file là **tủ hồ sơ** (dữ liệu nằm lại lâu dài), JSON/CSV là **mẫu biểu chuẩn** để ai cũng đọc được, biến môi trường là **két sắt** chứa chìa khoá, còn tham số dòng lệnh là **lời dặn** bạn đưa cho nhân viên ngay khi giao việc.

## 1. Đọc & ghi file văn bản

File là một dãy byte nằm trên ổ cứng. Quy trình kinh điển gồm 3 bước: **mở → đọc/ghi → đóng**. Đóng file rất quan trọng — nó giải phóng tài nguyên và đảm bảo dữ liệu được "xả" (flush) xuống đĩa.

### 1.1. Ghi file

```python
with open("nhatky.txt", "w", encoding="utf-8") as f:
    f.write("Dòng 1: Xin chào\n")
    f.write("Dòng 2: Tạm biệt\n")
# Ra khỏi khối "with", file tự động đóng
```
```javascript
const fs = require("fs");
fs.writeFileSync("nhatky.txt", "Dòng 1: Xin chào\nDòng 2: Tạm biệt\n", "utf-8");
// API đồng bộ, ghi xong là file đã đóng
```
```java
import java.nio.file.*;
import java.util.List;

Files.write(Paths.get("nhatky.txt"),
    List.of("Dòng 1: Xin chào", "Dòng 2: Tạm biệt"));
// Files.write tự mở và đóng file
```
```go
import "os"

content := "Dòng 1: Xin chào\nDòng 2: Tạm biệt\n"
os.WriteFile("nhatky.txt", []byte(content), 0644)
// 0644 là quyền truy cập file (chủ đọc/ghi, người khác đọc)
```

Chế độ `"w"` (write) **ghi đè** toàn bộ nội dung cũ. Muốn **ghi nối thêm** vào cuối, dùng chế độ `"a"` (append).

> ⚠️ Lỗi người mới hay gặp: Mở file bằng `"w"` để "thêm một dòng" — nó xoá sạch nội dung cũ rồi mới ghi! Muốn thêm vào cuối phải dùng `"a"` (append).

### 1.2. Đọc file

```python
with open("nhatky.txt", "r", encoding="utf-8") as f:
    for dong in f:               # đọc từng dòng, tiết kiệm bộ nhớ
        print(dong.rstrip())     # rstrip() bỏ ký tự xuống dòng cuối
```
```javascript
const fs = require("fs");
const noiDung = fs.readFileSync("nhatky.txt", "utf-8");
for (const dong of noiDung.split("\n")) {
  if (dong) console.log(dong);
}
```
```java
import java.nio.file.*;
import java.util.List;

List<String> cacDong = Files.readAllLines(Paths.get("nhatky.txt"));
for (String dong : cacDong) {
    System.out.println(dong);
}
```
```go
import (
    "fmt"
    "os"
    "strings"
)

data, _ := os.ReadFile("nhatky.txt")
for _, dong := range strings.Split(string(data), "\n") {
    if dong != "" {
        fmt.Println(dong)
    }
}
```

Đọc **từng dòng** (như Python lặp trực tiếp trên file) tốt hơn đọc cả file vào RAM khi file lớn (vài GB log chẳng hạn) — bạn không cần nạp toàn bộ vào bộ nhớ một lúc.

> 💡 Ghi nhớ: Luôn chỉ định `encoding="utf-8"` khi đọc/ghi text. Nếu không, máy có thể dùng encoding mặc định của hệ điều hành (Windows hay dùng cp1252) khiến tiếng Việt thành ký tự lỗi như `Ã¢`.

## 2. JSON — định dạng trao đổi dữ liệu chuẩn

**JSON** (JavaScript Object Notation) là cách phổ biến nhất để lưu dữ liệu có cấu trúc và trao đổi giữa các hệ thống (API, file cấu hình, log). Nó chỉ là **text**, nhưng có quy tắc rõ ràng: object `{}`, mảng `[]`, chuỗi `"..."`, số, `true`/`false`, `null`.

Hai thao tác cốt lõi:
- **Parse / decode**: chuỗi JSON → object trong bộ nhớ.
- **Stringify / encode**: object → chuỗi JSON để lưu hoặc gửi đi.

```python
import json

nguoidung = {"ten": "An", "tuoi": 25, "thich": ["code", "trà sữa"]}

# Object -> chuỗi JSON (ensure_ascii=False để giữ tiếng Việt)
chuoi = json.dumps(nguoidung, ensure_ascii=False, indent=2)

# Chuỗi JSON -> object
lai = json.loads(chuoi)
print(lai["ten"], lai["thich"][0])   # An code
```
```javascript
const nguoidung = { ten: "An", tuoi: 25, thich: ["code", "trà sữa"] };

// Object -> chuỗi JSON (số 2 = thụt lề 2 dấu cách)
const chuoi = JSON.stringify(nguoidung, null, 2);

// Chuỗi JSON -> object
const lai = JSON.parse(chuoi);
console.log(lai.ten, lai.thich[0]);   // An code
```
```java
// Dùng thư viện Jackson (com.fasterxml.jackson)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

ObjectMapper m = new ObjectMapper();
Map<String, Object> nguoidung = Map.of(
    "ten", "An", "tuoi", 25, "thich", List.of("code", "trà sữa"));

String chuoi = m.writeValueAsString(nguoidung);          // object -> JSON
Map<?, ?> lai = m.readValue(chuoi, Map.class);            // JSON -> object
System.out.println(lai.get("ten"));                       // An
```
```go
import (
    "encoding/json"
    "fmt"
)

type NguoiDung struct {
    Ten   string   `json:"ten"`
    Tuoi  int      `json:"tuoi"`
    Thich []string `json:"thich"`
}

u := NguoiDung{Ten: "An", Tuoi: 25, Thich: []string{"code", "trà sữa"}}
b, _ := json.MarshalIndent(u, "", "  ")  // object -> JSON

var lai NguoiDung
json.Unmarshal(b, &lai)                   // JSON -> object
fmt.Println(lai.Ten, lai.Thich[0])        // An code
```

### 2.1. Đọc file cấu hình (config)

Ứng dụng thực tế thường để các thiết lập (tên app, số kết nối, đường dẫn) trong một file `config.json` thay vì hard-code trong source. Cách làm: đọc file → parse JSON → dùng object kết quả.

```python
import json

with open("config.json", "r", encoding="utf-8") as f:
    config = json.load(f)        # đọc file VÀ parse luôn

print(config["app_name"], config["max_connections"])
```
```javascript
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
console.log(config.app_name, config.max_connections);
```
```java
ObjectMapper m = new ObjectMapper();
Map<?, ?> config = m.readValue(new File("config.json"), Map.class);
System.out.println(config.get("app_name"));
```
```go
data, _ := os.ReadFile("config.json")
var config map[string]any
json.Unmarshal(data, &config)
fmt.Println(config["app_name"])
```

> ⚠️ Lỗi người mới hay gặp: JSON **không cho phép** dấu phẩy thừa ở cuối (`{"a": 1,}`) và bắt buộc dùng nháy kép `"`, không phải nháy đơn `'`. Một dấu phẩy lạc chỗ là cả file parse lỗi. Khi gặp lỗi, dán file vào trình kiểm tra JSON để tìm vị trí sai.

## 3. CSV — bảng dữ liệu dạng text

**CSV** (Comma-Separated Values) là bảng đơn giản: mỗi dòng là một bản ghi, các cột ngăn cách bởi dấu phẩy. Excel, Google Sheets, database đều xuất/nhập được CSV. Dòng đầu thường là **header** (tên cột).

```
ten,tuoi,thanh_pho
An,25,Hà Nội
Bình,30,Đà Nẵng
```

Đọc CSV thành các bản ghi:

```python
import csv

with open("nguoidung.csv", "r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)          # mỗi dòng -> dict theo header
    for row in reader:
        print(row["ten"], row["tuoi"])
```
```javascript
const fs = require("fs");
const lines = fs.readFileSync("nguoidung.csv", "utf-8").trim().split("\n");
const header = lines[0].split(",");
for (const line of lines.slice(1)) {
  const cols = line.split(",");
  const row = Object.fromEntries(header.map((h, i) => [h, cols[i]]));
  console.log(row.ten, row.tuoi);
}
```
```java
import java.nio.file.*;
import java.util.*;

List<String> lines = Files.readAllLines(Paths.get("nguoidung.csv"));
String[] header = lines.get(0).split(",");
for (int i = 1; i < lines.size(); i++) {
    String[] cols = lines.get(i).split(",");
    System.out.println(cols[0] + " " + cols[1]);
}
```
```go
import (
    "encoding/csv"
    "fmt"
    "os"
)

f, _ := os.Open("nguoidung.csv")
defer f.Close()
rows, _ := csv.NewReader(f).ReadAll()  // [][]string
for _, row := range rows[1:] {         // bỏ qua header
    fmt.Println(row[0], row[1])
}
```

> ⚠️ Lỗi người mới hay gặp: Tự `split(",")` bằng tay sẽ hỏng khi ô dữ liệu chứa dấu phẩy, ví dụ `"Hà Nội, Việt Nam"` được bọc trong nháy. **Hãy dùng thư viện CSV** (`csv` của Python, `encoding/csv` của Go) — chúng xử lý đúng dấu nháy, ký tự xuống dòng trong ô, và escape.

## 4. Datetime — ngày giờ

Ngày giờ tưởng đơn giản nhưng đầy cạm bẫy: định dạng khác nhau giữa các nước, múi giờ, năm nhuận. Ba thao tác bạn cần: **lấy thời gian hiện tại**, **parse** (chuỗi → đối tượng thời gian), và **format** (đối tượng → chuỗi đẹp).

```python
from datetime import datetime, timezone

bay_gio = datetime.now(timezone.utc)               # giờ hiện tại theo UTC
chuoi = bay_gio.strftime("%Y-%m-%d %H:%M")          # format -> "2026-06-11 09:30"

# Parse: chuỗi -> datetime
d = datetime.strptime("2026-06-11", "%Y-%m-%d")
print(d.year, d.month)                              # 2026 6
```
```javascript
const bayGio = new Date();                          // giờ hiện tại
const iso = bayGio.toISOString();                   // "2026-06-11T09:30:00.000Z" (UTC)

// Parse: chuỗi ISO -> Date
const d = new Date("2026-06-11");
console.log(d.getFullYear());                       // 2026
```
```java
import java.time.*;
import java.time.format.DateTimeFormatter;

Instant bayGio = Instant.now();                     // mốc thời gian UTC
LocalDate d = LocalDate.parse("2026-06-11");        // parse
String s = d.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
System.out.println(d.getYear());                    // 2026
```
```go
import (
    "fmt"
    "time"
)

bayGio := time.Now().UTC()                          // giờ hiện tại UTC
s := bayGio.Format("2006-01-02 15:04")              // layout đặc biệt của Go

d, _ := time.Parse("2006-01-02", "2026-06-11")      // parse
fmt.Println(d.Year())                               // 2026
```

**Ý tưởng về múi giờ (timezone):** một thời điểm duy nhất nhìn ra giá trị khác nhau tuỳ nơi — 12:00 trưa ở Hà Nội (UTC+7) là 05:00 sáng ở London (UTC+0). Quy tắc vàng trong thực tế:

> 💡 Ghi nhớ: **Lưu trữ thời gian bằng UTC**, chỉ đổi sang giờ địa phương khi **hiển thị** cho người dùng. Nếu lưu giờ địa phương lẫn lộn, sớm muộn bạn cũng tính sai khoảng cách thời gian giữa hai sự kiện.

Định dạng chuẩn để trao đổi giữa hệ thống là **ISO 8601**: `2026-06-11T09:30:00Z` (chữ `Z` nghĩa là UTC). Hãy ưu tiên định dạng này thay vì kiểu "11/06/2026" dễ nhầm ngày với tháng.

## 5. Biến môi trường — đọc cấu hình & bí mật

**Biến môi trường (environment variable)** là các cặp tên–giá trị do hệ điều hành cung cấp cho chương trình lúc chạy. Đây là nơi chuẩn để chứa **bí mật** (mật khẩu database, API key) và cấu hình thay đổi theo môi trường (máy dev khác máy production).

```python
import os

db_url = os.environ.get("DATABASE_URL", "sqlite:///local.db")  # có giá trị mặc định
api_key = os.environ["API_KEY"]    # bắt buộc phải có, thiếu sẽ lỗi
print(db_url)
```
```javascript
const dbUrl = process.env.DATABASE_URL || "sqlite:///local.db";
const apiKey = process.env.API_KEY;        // undefined nếu chưa đặt
console.log(dbUrl);
```
```java
String dbUrl = System.getenv().getOrDefault("DATABASE_URL", "sqlite:///local.db");
String apiKey = System.getenv("API_KEY");  // null nếu chưa đặt
System.out.println(dbUrl);
```
```go
import "os"

dbURL := os.Getenv("DATABASE_URL")         // "" nếu chưa đặt
if dbURL == "" {
    dbURL = "sqlite:///local.db"
}
apiKey := os.Getenv("API_KEY")
```

Cách đặt biến môi trường khi chạy (terminal Linux/macOS):

```
API_KEY=abc123 DATABASE_URL=postgres://... python app.py
```

Khi có nhiều biến, người ta để chúng trong một file `.env` rồi nạp bằng thư viện (`python-dotenv`, `dotenv` của Node).

> ⚠️ Lỗi người mới hay gặp: **Đừng bao giờ hard-code mật khẩu/API key vào source rồi commit lên Git.** Bí mật bị lộ trong lịch sử Git rất khó xoá và là lỗ hổng bảo mật nghiêm trọng. Luôn dùng biến môi trường, và thêm `.env` vào `.gitignore`.

## 6. Tham số dòng lệnh (CLI arguments)

Khi chạy `python thongke.py duong_dan.csv --top 5`, các chữ sau tên file là **tham số dòng lệnh** — cách người dùng đưa input cho chương trình mà không cần sửa code. Mảng thô chứa chúng thường gọi là `argv`.

```python
import sys

# argv[0] là tên script; tham số thật bắt đầu từ argv[1]
print(sys.argv)            # ['thongke.py', 'duong_dan.csv', '--top', '5']
duong_dan = sys.argv[1]
```
```javascript
// process.argv[0]=node, [1]=tên file, tham số thật từ [2]
const args = process.argv.slice(2);
console.log(args);         // ['duong_dan.csv', '--top', '5']
const duongDan = args[0];
```
```java
public class ThongKe {
    public static void main(String[] args) {
        // args[0] là tham số đầu tiên (KHÔNG gồm tên class)
        System.out.println(args.length);
        String duongDan = args[0];
    }
}
```
```go
import (
    "fmt"
    "os"
)

// os.Args[0] là tên chương trình; tham số thật từ Args[1]
fmt.Println(os.Args)
duongDan := os.Args[1]
```

Đọc `argv` thô thì được, nhưng khi có nhiều tuỳ chọn (`--top`, `--output`, cờ `--verbose`), hãy dùng **thư viện phân tích tham số** — chúng tự xử lý giá trị mặc định, kiểu dữ liệu, và in **trợ giúp** (`--help`):

| Ngôn ngữ | Thư viện chuẩn |
|----------|----------------|
| Python | `argparse` |
| JavaScript | `commander`, `yargs` |
| Java | `picocli`, `args4j` |
| Go | `flag` (chuẩn), `cobra` |

```python
import argparse

p = argparse.ArgumentParser(description="Thống kê CSV")
p.add_argument("file")                              # tham số bắt buộc
p.add_argument("--top", type=int, default=5)        # tuỳ chọn có mặc định
args = p.parse_args()
print(args.file, args.top)
```
```javascript
// npm i commander
const { program } = require("commander");
program
  .argument("<file>", "đường dẫn CSV")
  .option("--top <n>", "số dòng đầu", "5")
  .parse();
console.log(program.args[0], program.opts().top);
```
```java
// dùng picocli (chú thích @Option/@Parameters)
import picocli.CommandLine;
import picocli.CommandLine.*;

@Command(name = "thongke")
class App implements Runnable {
    @Parameters(index = "0") String file;
    @Option(names = "--top", defaultValue = "5") int top;
    public void run() { System.out.println(file + " " + top); }
}
```
```go
import "flag"

top := flag.Int("top", 5, "số dòng đầu")
flag.Parse()
file := flag.Arg(0)                 // tham số không phải cờ
fmt.Println(file, *top)
```

## 7. Ghép lại: công cụ thống kê CSV thực tế

Giờ ta kết hợp tất cả thành một bài toán thật: đọc file `donhang.csv` (cột `san_pham,so_luong,gia`), tính **tổng doanh thu** và tìm sản phẩm bán chạy nhất. Đây là kiểu việc bạn sẽ làm hằng ngày trong công việc dữ liệu.

```python
import csv
from collections import defaultdict

doanh_thu = defaultdict(float)
with open("donhang.csv", "r", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        sp = row["san_pham"]
        tien = int(row["so_luong"]) * float(row["gia"])
        doanh_thu[sp] += tien

tong = sum(doanh_thu.values())
ban_chay = max(doanh_thu, key=doanh_thu.get)
print(f"Tổng doanh thu: {tong:,.0f}")
print(f"Bán chạy nhất: {ban_chay}")
```
```javascript
const fs = require("fs");
const lines = fs.readFileSync("donhang.csv", "utf-8").trim().split("\n");
const header = lines[0].split(",");
const doanhThu = {};
for (const line of lines.slice(1)) {
  const c = Object.fromEntries(header.map((h, i) => [h, line.split(",")[i]]));
  const tien = parseInt(c.so_luong) * parseFloat(c.gia);
  doanhThu[c.san_pham] = (doanhThu[c.san_pham] || 0) + tien;
}
const tong = Object.values(doanhThu).reduce((a, b) => a + b, 0);
const banChay = Object.keys(doanhThu).reduce((a, b) => doanhThu[a] > doanhThu[b] ? a : b);
console.log(`Tổng doanh thu: ${tong.toLocaleString()}`);
console.log(`Bán chạy nhất: ${banChay}`);
```
```java
Map<String, Double> doanhThu = new HashMap<>();
List<String> lines = Files.readAllLines(Paths.get("donhang.csv"));
for (int i = 1; i < lines.size(); i++) {
    String[] c = lines.get(i).split(",");
    double tien = Integer.parseInt(c[1]) * Double.parseDouble(c[2]);
    doanhThu.merge(c[0], tien, Double::sum);
}
double tong = doanhThu.values().stream().mapToDouble(x -> x).sum();
String banChay = doanhThu.entrySet().stream()
    .max(Map.Entry.comparingByValue()).get().getKey();
System.out.printf("Tổng doanh thu: %,.0f%nBán chạy nhất: %s%n", tong, banChay);
```
```go
f, _ := os.Open("donhang.csv")
defer f.Close()
rows, _ := csv.NewReader(f).ReadAll()
doanhThu := map[string]float64{}
for _, r := range rows[1:] {
    sl, _ := strconv.Atoi(r[1])
    gia, _ := strconv.ParseFloat(r[2], 64)
    doanhThu[r[0]] += float64(sl) * gia
}
var tong float64
banChay := ""
for sp, v := range doanhThu {
    tong += v
    if banChay == "" || v > doanhThu[banChay] {
        banChay = sp
    }
}
fmt.Printf("Tổng doanh thu: %.0f\nBán chạy nhất: %s\n", tong, banChay)
```

Mẫu hình ở đây rất phổ biến: **đọc → biến đổi từng dòng → gom nhóm/tổng hợp vào map → xuất kết quả**. Bạn sẽ gặp lại nó trong phân tích log, báo cáo bán hàng, xử lý dữ liệu khoa học.

## 8. Ba lỗi kinh điển về file & dữ liệu

### 8.1. Encoding (mã hoá ký tự)

Cùng một file, mở bằng encoding sai sẽ ra ký tự loằng ngoằng (`mojibake`). Tiếng Việt đặc biệt nhạy cảm vì có dấu. **Luôn dùng UTF-8** ở cả hai đầu đọc và ghi, và khai báo rõ ràng thay vì tin vào mặc định.

### 8.2. Quên đóng file

Mỗi file đang mở chiếm một "handle" của hệ điều hành. Quên đóng → rò rỉ tài nguyên, và dữ liệu ghi có thể chưa kịp xả xuống đĩa. Giải pháp: dùng cơ chế tự đóng của ngôn ngữ.

| Ngôn ngữ | Cách tự đóng file |
|----------|-------------------|
| Python | `with open(...) as f:` |
| JavaScript | API như `readFileSync` đã tự đóng |
| Java | `try (var f = ...) { }` (try-with-resources) |
| Go | `defer f.Close()` ngay sau khi mở |

### 8.3. Đường dẫn (path)

Đường dẫn tương đối (`"data.csv"`) được tính từ **thư mục bạn chạy lệnh**, không phải thư mục chứa file code. Chạy từ chỗ khác là "không tìm thấy file" ngay. Ngoài ra Windows dùng `\` còn Linux/macOS dùng `/`.

> 💡 Ghi nhớ: Đừng tự nối đường dẫn bằng `+ "/" +`. Dùng công cụ chuẩn của ngôn ngữ — `os.path.join` / `pathlib` (Python), `path.join` (Node), `Paths.get` (Java), `filepath.Join` (Go) — để code chạy được trên mọi hệ điều hành.

## 9. Tóm tắt

- File: **mở → đọc/ghi → đóng**; luôn dùng cơ chế tự đóng và `encoding="utf-8"`.
- **JSON** để trao đổi dữ liệu có cấu trúc: `parse` (chuỗi → object) và `stringify` (object → chuỗi). Đọc config từ `config.json`.
- **CSV** là bảng dạng text — luôn dùng thư viện CSV thay vì tự `split(",")`.
- **Datetime**: lưu UTC, hiển thị giờ địa phương; trao đổi bằng ISO 8601.
- **Biến môi trường** để chứa bí mật/cấu hình; không hard-code key vào source.
- **Tham số dòng lệnh** qua `argv` hoặc thư viện (`argparse`, `flag`...) để chương trình linh hoạt.
- Ba lỗi kinh điển: **encoding** sai, **quên đóng file**, **đường dẫn** tương đối.

Ở bài tiếp theo, bạn sẽ dùng chính những kỹ năng này để xây dựng ứng dụng hoàn chỉnh đọc dữ liệu thật, xử lý, và xuất báo cáo.
