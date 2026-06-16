# Mini project: Ứng dụng quản lý chi tiêu CLI

Chúc mừng bạn đã đi đến bài học tổng kết! Trong bài này, chúng ta sẽ ghép **tất cả** kiến thức đã học — biến, vòng lặp, hàm, class, đọc/ghi file — để xây dựng một ứng dụng hoàn chỉnh: **trình quản lý chi tiêu chạy trên terminal** (cửa sổ dòng lệnh, nơi bạn gõ chữ thay vì bấm nút).

> 💡 Ghi nhớ: **CLI** (Command Line Interface — giao diện dòng lệnh) là ứng dụng tương tác bằng cách gõ phím trong terminal, không có nút bấm hay hình ảnh. Hầu hết lập trình viên đều bắt đầu bằng việc viết app CLI vì nó đơn giản mà vẫn "thật".

## Ứng dụng sẽ làm được gì?

Hãy tưởng tượng bạn có một cuốn sổ tay ghi chi tiêu. Mỗi lần mua gì, bạn ghi vào sổ: *"11/06 — ăn sáng — 30.000đ"*. Cuối tháng bạn lật sổ ra cộng lại. Ứng dụng của chúng ta chính là cuốn sổ đó, nhưng ở dạng phần mềm:

| Tính năng | Mô tả |
|---|---|
| Thêm khoản chi | Nhập mô tả, số tiền, danh mục |
| Xem danh sách | In ra tất cả khoản chi đã ghi |
| Tính tổng | Cộng toàn bộ số tiền đã tiêu |
| Lưu file | Tắt app mở lại vẫn còn dữ liệu |
| Menu vòng lặp | Hiện menu liên tục cho đến khi chọn Thoát |

## Lộ trình 5 milestone

**Milestone** (cột mốc) là cách lập trình viên chia dự án lớn thành các bước nhỏ, mỗi bước xong là app **chạy được** ngay, dù chưa đầy đủ. Giống xây nhà: xong móng → xong khung → xong mái, mỗi giai đoạn đều kiểm tra được.

1. **Milestone 1** — Menu vòng lặp: app hiện menu, nhận lựa chọn, thoát được.
2. **Milestone 2** — Class `Expense`: định nghĩa "một khoản chi" là gì.
3. **Milestone 3** — Thêm & xem khoản chi (kèm kiểm tra dữ liệu nhập).
4. **Milestone 4** — Tính tổng theo danh mục.
5. **Milestone 5** — Lưu và đọc file: dữ liệu sống sót sau khi tắt app.

---

## Milestone 1: Menu vòng lặp

Mọi app CLI đều có chung một "trái tim": **vòng lặp chính** (main loop). Nó giống nhân viên thu ngân: chào khách → hỏi cần gì → phục vụ → quay lại hỏi khách tiếp theo, lặp mãi cho đến giờ đóng cửa.

Logic: in menu → đọc lựa chọn → xử lý → lặp lại; nếu chọn "Thoát" thì dừng vòng lặp.

```python
def show_menu():
    print("\n=== QUẢN LÝ CHI TIÊU ===")
    print("1. Thêm khoản chi")
    print("2. Xem danh sách")
    print("3. Tổng chi tiêu")
    print("4. Thoát")

def main():
    while True:
        show_menu()
        choice = input("Chọn (1-4): ")
        if choice == "1":
            print("(sẽ làm ở milestone 3)")
        elif choice == "2":
            print("(sẽ làm ở milestone 3)")
        elif choice == "3":
            print("(sẽ làm ở milestone 4)")
        elif choice == "4":
            print("Tạm biệt!")
            break
        else:
            print("Lựa chọn không hợp lệ, thử lại nhé.")

main()
```
```javascript
// Chạy bằng Node.js. Dùng module readline để đọc phím từ terminal.
const readline = require("readline/promises");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function showMenu() {
  console.log("\n=== QUẢN LÝ CHI TIÊU ===");
  console.log("1. Thêm khoản chi\n2. Xem danh sách\n3. Tổng chi tiêu\n4. Thoát");
}

async function main() {
  while (true) {
    showMenu();
    const choice = await rl.question("Chọn (1-4): ");
    if (choice === "4") { console.log("Tạm biệt!"); break; }
    else if (["1", "2", "3"].includes(choice)) console.log("(sẽ làm ở milestone sau)");
    else console.log("Lựa chọn không hợp lệ.");
  }
  rl.close();
}
main();
```
```java
import java.util.Scanner;

public class ExpenseApp {
    static void showMenu() {
        System.out.println("\n=== QUẢN LÝ CHI TIÊU ===");
        System.out.println("1. Thêm khoản chi\n2. Xem danh sách\n3. Tổng chi tiêu\n4. Thoát");
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (true) {
            showMenu();
            String choice = sc.nextLine();
            if (choice.equals("4")) { System.out.println("Tạm biệt!"); break; }
            else if (choice.matches("[1-3]")) System.out.println("(sẽ làm ở milestone sau)");
            else System.out.println("Lựa chọn không hợp lệ.");
        }
    }
}
```
```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func showMenu() {
    fmt.Println("\n=== QUẢN LÝ CHI TIÊU ===")
    fmt.Println("1. Thêm khoản chi\n2. Xem danh sách\n3. Tổng chi tiêu\n4. Thoát")
}

func main() {
    reader := bufio.NewReader(os.Stdin)
    for {
        showMenu()
        choice, _ := reader.ReadString('\n')
        choice = strings.TrimSpace(choice)
        if choice == "4" { fmt.Println("Tạm biệt!"); break }
        fmt.Println("(sẽ làm ở milestone sau)")
    }
}
```

```cpp
#include <iostream>
#include <string>

void showMenu() {
    std::cout << "\n=== QUẢN LÝ CHI TIÊU ===\n";
    std::cout << "1. Thêm khoản chi\n2. Xem danh sách\n3. Tổng chi tiêu\n4. Thoát\n";
}

int main() {
    std::string choice;
    while (true) {
        showMenu();
        std::cout << "Chọn (1-4): ";
        std::getline(std::cin, choice);
        if (choice == "4") { std::cout << "Tạm biệt!\n"; break; }
        else if (choice == "1" || choice == "2" || choice == "3")
            std::cout << "(sẽ làm ở milestone sau)\n";
        else
            std::cout << "Lựa chọn không hợp lệ.\n";
    }
    return 0;
}
```

Khác biệt đáng chú ý: JavaScript (Node.js) đọc bàn phím qua `readline` và cần `async/await`; Java bắt buộc bọc code trong class và dùng `Scanner`; Go dùng `bufio.Reader` và phải `TrimSpace` để cắt ký tự xuống dòng.

> ⚠️ Lỗi người mới hay gặp: quên lệnh `break` (thoát vòng lặp) ở lựa chọn "Thoát" → app lặp vô tận, phải bấm `Ctrl+C` để giết chương trình. Hãy luôn viết đường thoát **trước tiên** khi làm vòng lặp `while True`.

**Chạy thử ngay**: lưu file (vd `expense.py`), chạy `python expense.py`. Menu hiện ra, gõ 4 thì thoát — milestone 1 hoàn thành!

---

## Milestone 2: Class `Expense` — mô hình hóa một khoản chi

Một khoản chi gồm 3 mảnh thông tin dính liền nhau: **mô tả**, **số tiền**, **danh mục**. Nếu lưu rời rạc trong 3 danh sách thì dễ lệch pha (mô tả thứ 5 nhưng tiền thứ 6). Vì vậy ta gói chúng vào một **class** (lớp — bản thiết kế của đối tượng), giống một mẫu phiếu in sẵn 3 ô trống, mỗi khoản chi là một tờ phiếu đã điền.

```python
class Expense:
    def __init__(self, description, amount, category):
        self.description = description
        self.amount = amount
        self.category = category

    def display(self):
        return f"{self.description:<20} {self.amount:>12,.0f}đ  [{self.category}]"

# Thử nhanh:
e = Expense("Ăn sáng", 30000, "Ăn uống")
print(e.display())   # Ăn sáng                    30,000đ  [Ăn uống]
```
```javascript
class Expense {
  constructor(description, amount, category) {
    this.description = description;
    this.amount = amount;
    this.category = category;
  }
  display() {
    return `${this.description.padEnd(20)} ${this.amount.toLocaleString()}đ  [${this.category}]`;
  }
}
```
```java
public class Expense {
    String description; double amount; String category;

    Expense(String description, double amount, String category) {
        this.description = description;
        this.amount = amount;
        this.category = category;
    }
    String display() {
        return String.format("%-20s %,12.0fđ  [%s]", description, amount, category);
    }
}
```
```go
// Go không có class; dùng struct (cấu trúc) + method gắn vào struct.
type Expense struct {
    Description string
    Amount      float64
    Category    string
}

func (e Expense) Display() string {
    return fmt.Sprintf("%-20s %12.0fđ  [%s]", e.Description, e.Amount, e.Category)
}
```

```cpp
// C++ có class thực thụ; dùng struct (mặc định public) cho gọn.
#include <string>
#include <iomanip>
#include <sstream>

struct Expense {
    std::string description;
    double amount;
    std::string category;

    std::string display() const {
        std::ostringstream oss;
        oss << std::left << std::setw(20) << description << " "
            << std::right << std::setw(12) << std::fixed << std::setprecision(0)
            << amount << "đ  [" << category << "]";
        return oss.str();
    }
};
```

Chú thích: Go không có khái niệm class, thay vào đó là **struct** (cấu trúc dữ liệu) với hàm gắn kèm — về bản chất dùng giống hệt nhau trong bài này.

---

## Milestone 3: Thêm & xem khoản chi (nhập liệu + validate)

**Validate** (kiểm tra hợp lệ) nghĩa là không tin tưởng mù quáng vào thứ người dùng gõ. Người dùng có thể gõ "ba mươi nghìn" thay vì `30000`, hoặc gõ số âm. App tốt phải bắt được các trường hợp đó và yêu cầu nhập lại — giống nhân viên ngân hàng kiểm tra chữ ký trước khi nhận giấy tờ.

Chiến thuật chuẩn: viết một hàm `read_amount()` lặp đến khi nhận được số hợp lệ mới thôi.

```python
def read_amount():
    while True:
        raw = input("Số tiền (đ): ")
        try:
            amount = float(raw)
            if amount <= 0:
                print("Số tiền phải lớn hơn 0!")
                continue
            return amount
        except ValueError:
            print(f"'{raw}' không phải là số, nhập lại nhé.")

def add_expense(expenses):
    description = input("Mô tả: ").strip()
    if not description:
        print("Mô tả không được để trống!")
        return
    amount = read_amount()
    category = input("Danh mục (Ăn uống/Đi lại/Khác): ").strip() or "Khác"
    expenses.append(Expense(description, amount, category))
    print("Đã thêm!")

def list_expenses(expenses):
    if not expenses:
        print("Chưa có khoản chi nào.")
        return
    for i, e in enumerate(expenses, start=1):
        print(f"{i}. {e.display()}")
```
```javascript
// Khung gợi ý: dùng parseFloat + Number.isNaN để validate.
async function readAmount(rl) {
  while (true) {
    const raw = await rl.question("Số tiền (đ): ");
    const amount = parseFloat(raw);
    if (!Number.isNaN(amount) && amount > 0) return amount;
    console.log("Số không hợp lệ, nhập lại.");
  }
}
// TODO: viết addExpense(expenses, rl) và listExpenses(expenses)
// Gợi ý: expenses.push(new Expense(...)); duyệt bằng forEach.
```
```java
// Khung gợi ý: bắt NumberFormatException khi parse.
static double readAmount(Scanner sc) {
    while (true) {
        try {
            double a = Double.parseDouble(sc.nextLine());
            if (a > 0) return a;
        } catch (NumberFormatException ignored) { }
        System.out.println("Số không hợp lệ, nhập lại.");
    }
}
// TODO: addExpense(List<Expense> expenses, Scanner sc) và listExpenses(...)
// Gợi ý: dùng ArrayList<Expense> và vòng for-each.
```
```go
// Khung gợi ý: strconv.ParseFloat trả về (giá trị, error).
func readAmount(reader *bufio.Reader) float64 {
    for {
        raw, _ := reader.ReadString('\n')
        a, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
        if err == nil && a > 0 { return a }
        fmt.Println("Số không hợp lệ, nhập lại.")
    }
}
// TODO: addExpense(expenses *[]Expense, reader) và listExpenses(expenses []Expense)
// Gợi ý: *expenses = append(*expenses, Expense{...})
```

```cpp
// Khung gợi ý: std::stod ném exception khi chuỗi không phải số.
#include <string>
#include <iostream>

double readAmount() {
    std::string raw;
    while (true) {
        std::getline(std::cin, raw);
        try {
            double a = std::stod(raw);
            if (a > 0) return a;
        } catch (const std::exception&) { }
        std::cout << "Số không hợp lệ, nhập lại.\n";
    }
}
// TODO: addExpense(std::vector<Expense>& expenses) và listExpenses(const std::vector<Expense>& expenses)
// Gợi ý: expenses.push_back(Expense{...}); duyệt bằng vòng for chỉ số.
```

Giờ quay lại `main()`, tạo danh sách `expenses = []` trước vòng lặp và nối các hàm vào menu: lựa chọn 1 gọi `add_expense(expenses)`, lựa chọn 2 gọi `list_expenses(expenses)`.

> ⚠️ Lỗi người mới hay gặp: tạo `expenses = []` **bên trong** vòng lặp `while` — mỗi vòng lặp danh sách bị xóa trắng, thêm bao nhiêu cũng "mất". Biến lưu trữ lâu dài phải khai báo **trước** vòng lặp.

> 💡 Ghi nhớ: quy tắc vàng của validate — *"lặp đến khi hợp lệ"*. Đừng từ chối rồi thoát luôn; hãy cho người dùng cơ hội nhập lại ngay trong hàm đọc dữ liệu.

---

## Milestone 4: Tính tổng & thống kê theo danh mục

Cộng tổng thì dễ, nhưng thống kê theo danh mục mới hữu ích: bạn sẽ biết tiền "bốc hơi" vào đâu. Ta dùng **dictionary / map** (bảng tra cứu khóa → giá trị, như danh bạ tên → số điện thoại) với khóa là tên danh mục, giá trị là tổng tiền của danh mục đó.

```python
def show_summary(expenses):
    if not expenses:
        print("Chưa có dữ liệu.")
        return
    total = sum(e.amount for e in expenses)
    by_category = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + e.amount
    print(f"\nTỔNG CHI: {total:,.0f}đ")
    for cat, amt in by_category.items():
        percent = amt / total * 100
        print(f"  {cat:<12} {amt:>12,.0f}đ  ({percent:.0f}%)")
```
```javascript
// Khung gợi ý: dùng reduce cho tổng, object thường làm map.
function showSummary(expenses) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = {};
  for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  // TODO: in total và từng danh mục kèm phần trăm
}
```
```java
// Khung gợi ý: HashMap<String, Double> + merge().
static void showSummary(List<Expense> expenses) {
    double total = expenses.stream().mapToDouble(e -> e.amount).sum();
    Map<String, Double> byCat = new HashMap<>();
    for (Expense e : expenses) byCat.merge(e.category, e.amount, Double::sum);
    // TODO: in total và duyệt byCat.entrySet() in từng dòng
}
```
```go
// Khung gợi ý: map[string]float64, Go tự trả 0 khi khóa chưa tồn tại.
func showSummary(expenses []Expense) {
    total := 0.0
    byCat := map[string]float64{}
    for _, e := range expenses {
        total += e.Amount
        byCat[e.Category] += e.Amount
    }
    // TODO: in total và duyệt for cat, amt := range byCat
}
```

```cpp
// Khung gợi ý: std::map<std::string, double>, truy cập byCat[key] tự khởi tạo 0.
#include <map>
#include <vector>

void showSummary(const std::vector<Expense>& expenses) {
    double total = 0.0;
    std::map<std::string, double> byCat;
    for (const auto& e : expenses) {
        total += e.amount;
        byCat[e.category] += e.amount;
    }
    // TODO: in total và duyệt for (auto& [cat, amt] : byCat) kèm phần trăm
}
```

Chú thích nhỏ: Go cho phép cộng dồn `byCat[key] += x` ngay cả khi khóa chưa có (mặc định 0); Python cần `.get(key, 0)`, JavaScript cần `|| 0`, Java cần `merge()`.

---

## Milestone 5: Lưu và đọc file — dữ liệu bất tử

Hiện tại dữ liệu chỉ nằm trong **bộ nhớ RAM** — tắt app là mất sạch, như viết lên cát. Để dữ liệu sống sót, ta ghi nó xuống **file** (tệp tin trên ổ cứng), như chép vào sổ. Định dạng đơn giản nhất là **CSV** (Comma-Separated Values — các giá trị ngăn cách bằng ký tự đặc biệt), mỗi dòng một khoản chi:

```
Ăn sáng|30000|Ăn uống
Xe bus|7000|Đi lại
```

Ta dùng dấu `|` thay dấu phẩy để mô tả có thể chứa dấu phẩy thoải mái. Hai việc cần làm: **save** (ghi toàn bộ danh sách ra file) và **load** (đọc file lúc khởi động, dựng lại danh sách).

```python
FILENAME = "expenses.txt"

def save_expenses(expenses):
    with open(FILENAME, "w", encoding="utf-8") as f:
        for e in expenses:
            f.write(f"{e.description}|{e.amount}|{e.category}\n")

def load_expenses():
    expenses = []
    try:
        with open(FILENAME, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("|")
                if len(parts) == 3:
                    expenses.append(Expense(parts[0], float(parts[1]), parts[2]))
    except FileNotFoundError:
        pass  # Lần chạy đầu tiên chưa có file — hoàn toàn bình thường
    return expenses
```
```javascript
// Khung gợi ý: module fs với readFileSync/writeFileSync.
const fs = require("fs");
const FILENAME = "expenses.txt";

function saveExpenses(expenses) {
  const text = expenses.map(e => `${e.description}|${e.amount}|${e.category}`).join("\n");
  fs.writeFileSync(FILENAME, text, "utf-8");
}
// TODO loadExpenses(): kiểm tra fs.existsSync(FILENAME) trước,
// đọc file, split("\n") rồi split("|") từng dòng, parseFloat cột tiền.
```
```java
// Khung gợi ý: Files.write / Files.readAllLines (java.nio.file).
static final Path FILE = Path.of("expenses.txt");

static void saveExpenses(List<Expense> expenses) throws IOException {
    List<String> lines = new ArrayList<>();
    for (Expense e : expenses) lines.add(e.description + "|" + e.amount + "|" + e.category);
    Files.write(FILE, lines);
}
// TODO loadExpenses(): if (Files.exists(FILE)) đọc readAllLines,
// split("\\|") từng dòng — nhớ escape vì split nhận regex!
```
```go
// Khung gợi ý: os.WriteFile / os.ReadFile.
const filename = "expenses.txt"

func saveExpenses(expenses []Expense) {
    var sb strings.Builder
    for _, e := range expenses {
        sb.WriteString(fmt.Sprintf("%s|%g|%s\n", e.Description, e.Amount, e.Category))
    }
    os.WriteFile(filename, []byte(sb.String()), 0644)
}
// TODO loadExpenses(): data, err := os.ReadFile(filename); nếu err != nil
// trả về slice rỗng; ngược lại strings.Split theo "\n" rồi theo "|".
```

```cpp
// Khung gợi ý: std::ofstream để ghi, std::ifstream để đọc.
#include <fstream>
#include <sstream>
#include <vector>

const std::string FILENAME = "expenses.txt";

void saveExpenses(const std::vector<Expense>& expenses) {
    std::ofstream f(FILENAME);
    for (const auto& e : expenses)
        f << e.description << "|" << e.amount << "|" << e.category << "\n";
}
// TODO loadExpenses(): mở std::ifstream(FILENAME); nếu !f trả về vector rỗng;
// đọc từng dòng bằng getline, tách theo '|' (dùng getline với delimiter), std::stod cột tiền.
```

> ⚠️ Lỗi người mới hay gặp ở Java: `split("|")` không chạy như mong đợi vì tham số là **regex** (biểu thức chính quy) và `|` là ký tự đặc biệt — phải viết `split("\\|")`.

Cách nối vào app: gọi `load_expenses()` **một lần** lúc khởi động, và gọi `save_expenses()` sau mỗi lần thêm (hoặc trước khi thoát). Lưu sau mỗi lần thêm an toàn hơn — lỡ app bị tắt đột ngột cũng không mất gì.

> 💡 Ghi nhớ: mẫu hình "load lúc mở — save lúc thay đổi" xuất hiện trong **mọi** phần mềm có dữ liệu, từ app ghi chú đến game (save game!). Bạn vừa học một mẫu thiết kế thực thụ.

---

## Ghép tất cả lại: chương trình Python hoàn chỉnh

Đây là toàn bộ app sau 5 milestone (chỉ phần `main` thay đổi so với milestone 1; các hàm/class ở trên giữ nguyên):

```python
def main():
    expenses = load_expenses()
    print(f"Đã nạp {len(expenses)} khoản chi từ file.")
    while True:
        show_menu()
        choice = input("Chọn (1-4): ")
        if choice == "1":
            add_expense(expenses)
            save_expenses(expenses)
        elif choice == "2":
            list_expenses(expenses)
        elif choice == "3":
            show_summary(expenses)
        elif choice == "4":
            save_expenses(expenses)
            print("Đã lưu. Tạm biệt!")
            break
        else:
            print("Lựa chọn không hợp lệ.")

main()
```
```javascript
// Khung main hoàn chỉnh — điền các hàm TODO ở các milestone trước.
async function main() {
  const expenses = loadExpenses();
  while (true) {
    showMenu();
    const choice = await rl.question("Chọn (1-4): ");
    if (choice === "1") { await addExpense(expenses, rl); saveExpenses(expenses); }
    else if (choice === "2") listExpenses(expenses);
    else if (choice === "3") showSummary(expenses);
    else if (choice === "4") { saveExpenses(expenses); break; }
  }
  rl.close();
}
```
```java
// Khung main hoàn chỉnh — gom Expense vào file riêng hoặc làm static nested class.
public static void main(String[] args) throws IOException {
    Scanner sc = new Scanner(System.in);
    List<Expense> expenses = loadExpenses();
    while (true) {
        showMenu();
        String c = sc.nextLine();
        if (c.equals("1")) { addExpense(expenses, sc); saveExpenses(expenses); }
        else if (c.equals("2")) listExpenses(expenses);
        else if (c.equals("3")) showSummary(expenses);
        else if (c.equals("4")) { saveExpenses(expenses); break; }
    }
}
```
```go
// Khung main hoàn chỉnh — tất cả nằm trong package main, một file là đủ.
func main() {
    reader := bufio.NewReader(os.Stdin)
    expenses := loadExpenses()
    for {
        showMenu()
        choice, _ := reader.ReadString('\n')
        switch strings.TrimSpace(choice) {
        case "1":
            addExpense(&expenses, reader)
            saveExpenses(expenses)
        case "2":
            listExpenses(expenses)
        case "3":
            showSummary(expenses)
        case "4":
            saveExpenses(expenses)
            return
        }
    }
}
```

```cpp
// Khung main hoàn chỉnh — tất cả nằm trong một file .cpp, biên dịch g++ -std=c++17.
int main() {
    std::vector<Expense> expenses = loadExpenses();
    std::cout << "Đã nạp " << expenses.size() << " khoản chi từ file.\n";
    std::string choice;
    while (true) {
        showMenu();
        std::cout << "Chọn (1-4): ";
        std::getline(std::cin, choice);
        if (choice == "1") { addExpense(expenses); saveExpenses(expenses); }
        else if (choice == "2") listExpenses(expenses);
        else if (choice == "3") showSummary(expenses);
        else if (choice == "4") { saveExpenses(expenses); std::cout << "Đã lưu. Tạm biệt!\n"; break; }
        else std::cout << "Lựa chọn không hợp lệ.\n";
    }
    return 0;
}
```

## Checklist nghiệm thu

Chạy thử và tick từng dòng — đây chính là cách tester chuyên nghiệp kiểm tra phần mềm:

- [ ] Gõ lựa chọn lung tung (`9`, `abc`, Enter trống) → app báo lỗi nhẹ nhàng, không "sập".
- [ ] Nhập số tiền `ba mươi` hoặc `-5000` → bị từ chối, được nhập lại.
- [ ] Thêm 3 khoản, xem danh sách → đủ 3 dòng, đúng thứ tự.
- [ ] Xem tổng → con số khớp khi bạn tự cộng tay.
- [ ] **Tắt app, mở lại** → 3 khoản vẫn còn. Đây là bài test quan trọng nhất!
- [ ] Xóa file `expenses.txt` rồi chạy → app không sập, bắt đầu sổ mới.

## Thử thách mở rộng (tự làm)

| Mức | Thử thách | Gợi ý |
|---|---|---|
| Dễ | Thêm ngày tháng vào mỗi khoản chi | Python: `datetime.date.today()` |
| Vừa | Tính năng xóa khoản chi theo số thứ tự | Validate chỉ số nằm trong khoảng hợp lệ |
| Vừa | Cảnh báo khi tổng vượt ngân sách tháng | Lưu ngân sách thành dòng đầu tiên của file |
| Khó | Đổi định dạng lưu sang JSON | Python: module `json`; cấu trúc rõ ràng hơn CSV |
| Khó | Hoàn thiện đầy đủ bản JavaScript/Java/Go | Điền tất cả phần TODO trong bài |

## Tổng kết

Bạn vừa đi trọn một vòng đời phát triển phần mềm thu nhỏ: chia milestone → viết từng phần chạy được → ghép lại → kiểm thử. Các "viên gạch" đã dùng:

| Kiến thức | Xuất hiện ở đâu trong app |
|---|---|
| Vòng lặp `while` | Menu chính, vòng nhập lại khi sai |
| Hàm | `show_menu`, `read_amount`, `add_expense`… mỗi hàm một việc |
| Class/struct | `Expense` gói 3 thông tin thành một khối |
| Danh sách & dictionary/map | Kho khoản chi, thống kê theo danh mục |
| Xử lý lỗi | `try/except`, bắt parse lỗi, file không tồn tại |
| Đọc/ghi file | `save_expenses`, `load_expenses` |

> 💡 Ghi nhớ: dự án nhỏ nhưng **hoàn chỉnh** dạy bạn nhiều hơn dự án to bỏ dở. Hãy hoàn thiện ít nhất một bản ngôn ngữ khác ngoài Python — việc "dịch" code giữa các ngôn ngữ là cách luyện tư duy lập trình hiệu quả bậc nhất.
