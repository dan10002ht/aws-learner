# Bài 38 — Solana: account model, Sealevel & Anchor

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích vì sao Solana **tách code (program) khỏi state (data account)** — khác hoàn toàn model "contract giữ storage" của EVM.
- Hiểu **account model** của Solana: mọi thứ là account, ai sở hữu, lamports, rent & rent-exempt.
- Nói rõ **Sealevel** thực thi song song bằng cách bắt transaction **khai báo trước** account nào đọc/ghi — và vì sao điều đó lại cho throughput cao.
- Hiểu **Proof of History (PoH)** là gì và nó *không phải* consensus.
- Nắm các **đánh đổi** của Solana (phí thấp, TPS cao ↔ yêu cầu phần cứng, rủi ro liveness).
- Viết một **program bằng Anchor (Rust)** hoàn chỉnh, đọc được code CPI & PDA.

---

## 2. Lý thuyết

### 2.1 Analogy — thư viện có phiếu mượn khai báo trước

EVM giống một **văn phòng một cửa**: mỗi contract là một cái tủ vừa chứa **hồ sơ hướng dẫn** (code) vừa chứa **dữ liệu khách hàng** (storage) trong cùng một ngăn. Muốn xử lý ai thì phải xếp hàng lần lượt, vì không ai biết trước giao dịch sẽ đụng vào ngăn nào — EVM chạy **tuần tự**.

Solana giống một **thư viện lớn** nơi:
- **Sách hướng dẫn** (program) đặt riêng một kệ, **read-only**, ai cũng dùng chung.
- **Hồ sơ của từng người** (data account) nằm ở kệ khác, mỗi hồ sơ có **nhãn chủ sở hữu**.
- Trước khi vào, bạn phải nộp **phiếu mượn ghi rõ** sẽ động vào những hồ sơ nào và **đọc hay ghi**. Nhờ đó thủ thư biết ngay hai người mượn hai bộ hồ sơ khác nhau thì **phục vụ song song** được — chỉ khi trùng hồ sơ ghi mới phải xếp hàng.

Đó chính là tinh thần **Sealevel**: song song hóa bằng cách biết trước "ai đụng vào cái gì".

### 2.2 Mọi thứ là account

Trên Solana **không có** khái niệm "contract có storage riêng". Thay vào đó có một **không gian account phẳng**, mỗi account định danh bằng một **public key (32 byte)** và có cấu trúc:

| Trường | Ý nghĩa |
|--------|---------|
| `lamports` | Số dư (1 SOL = 1e9 lamports). Account nào cũng có, kể cả account chứa code. |
| `data` | Mảng byte thô. Với program → chứa bytecode BPF; với data account → chứa state đã serialize. |
| `owner` | Public key của **program sở hữu** account này. **Chỉ owner mới được sửa `data` và trừ `lamports`.** |
| `executable` | `true` nếu account là một program có thể được gọi (code). |
| `rent_epoch` | Dấu vết cơ chế rent (xem 2.5). |

Điểm mấu chốt: **program là stateless**. Code nằm ở một account `executable`, còn **toàn bộ state** sống trong các data account **tách rời** mà program đó `owner`. Cùng một program (ví dụ SPL Token) phục vụ hàng triệu account token khác nhau — giống một hàm thuần nhận state qua tham số, thay vì một object mang state trong người như contract EVM.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="am-t am-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="am-t">Account model: EVM vs Solana</title>
<desc id="am-d">Bên trái EVM gộp code và storage trong một contract; bên phải Solana tách program executable read-only khỏi nhiều data account có owner</desc>
<text x="175" y="24" text-anchor="middle" font-size="14" fill="currentColor">EVM — code + state chung một chỗ</text>
<rect x="90" y="70" width="170" height="150" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="98" text-anchor="middle" font-size="13" fill="currentColor">Contract</text>
<rect x="110" y="115" width="130" height="40" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="140" text-anchor="middle" font-size="12" fill="currentColor">code (bytecode)</text>
<rect x="110" y="165" width="130" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="190" text-anchor="middle" font-size="12" fill="currentColor">storage (state)</text>
<line x1="360" y1="40" x2="360" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="545" y="24" text-anchor="middle" font-size="14" fill="currentColor">Solana — program tách khỏi data</text>
<rect x="440" y="60" width="200" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="80" text-anchor="middle" font-size="12" fill="currentColor">Program (executable)</text>
<text x="540" y="97" text-anchor="middle" font-size="11" fill="currentColor">read-only, stateless</text>
<rect x="430" y="130" width="95" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="477" y="152" text-anchor="middle" font-size="11" fill="currentColor">Data acct A</text>
<text x="477" y="170" text-anchor="middle" font-size="10" fill="currentColor">owner=Prog</text>
<rect x="555" y="130" width="95" height="55" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="602" y="152" text-anchor="middle" font-size="11" fill="currentColor">Data acct B</text>
<text x="602" y="170" text-anchor="middle" font-size="10" fill="currentColor">owner=Prog</text>
<line x1="500" y1="106" x2="477" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#a2)"/>
<line x1="580" y1="106" x2="602" y2="130" stroke="currentColor" stroke-width="1" marker-end="url(#a2)"/>
<text x="540" y="215" text-anchor="middle" font-size="11" fill="currentColor">1 program phục vụ N data account</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Vì sao tách code khỏi state?

- **Song song hóa (xem 2.4):** khi state tách rời và transaction khai báo trước account đụng vào, runtime biết ngay hai giao dịch có **giao nhau** hay không.
- **Nâng cấp linh hoạt:** program có thể được deploy lại (upgradeable) mà data account không đổi; ngược lại data account có thể được nhiều phiên bản logic chia sẻ.
- **Chi phí lưu trữ minh bạch:** mỗi account tự trả tiền chỗ chứa của mình (rent), không dồn hết vào một contract khổng lồ.

Đổi lại, lập trình khó hơn: mọi account mà instruction cần đọc/ghi **phải được truyền vào tường minh** — không có kiểu `otherContract.balanceOf(x)` tự do đọc storage như Solidity. Đây là rào cản lớn nhất khi chuyển từ EVM sang Solana.

### 2.4 Sealevel — thực thi song song

**Sealevel** là runtime thực thi của Solana. Ý tưởng cốt lõi: mỗi transaction phải liệt kê **danh sách account** kèm cờ **writable / read-only** và **signer**. Runtime dùng danh sách này như một **lock declaration**:

- Hai transaction **không chia sẻ account writable** nào → thực thi **song song** trên nhiều core (Solana tận dụng GPU/nhiều CPU core).
- Nếu **cùng ghi** vào một account (ví dụ hai lệnh cùng sửa một pool AMM) → phải **tuần tự** để tránh race.
- Nhiều transaction **cùng đọc** một account read-only → vẫn song song thoải mái.

Đây là **pessimistic locking khai báo trước**, ngược với EVM (chạy tuần tự vì không biết trước sẽ đụng slot nào). Nhờ đó Solana đạt throughput cao khi tải **phân tán trên nhiều account khác nhau**; nhưng nếu cả mạng cùng dồn ghi vào **một account nóng** (hot account, ví dụ một mint đang mint đại trà) thì song song hóa mất tác dụng — đó là điểm nghẽn thực tế.

<svg viewBox="0 0 700 260" role="img" aria-labelledby="sl-t sl-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="sl-t">Sealevel: song song khi account rời nhau, tuần tự khi trùng</title>
<desc id="sl-d">Các transaction khai báo account writable; hai tx đụng khác account chạy song song, hai tx cùng ghi một account phải xếp hàng</desc>
<text x="350" y="22" text-anchor="middle" font-size="13" fill="currentColor">Mỗi tx khai báo account writable của mình</text>
<rect x="40" y="50" width="130" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="70" text-anchor="middle" font-size="12" fill="currentColor">Tx1 → ghi A</text>
<text x="105" y="87" text-anchor="middle" font-size="11" fill="currentColor">core 1</text>
<rect x="40" y="110" width="130" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="130" text-anchor="middle" font-size="12" fill="currentColor">Tx2 → ghi B</text>
<text x="105" y="147" text-anchor="middle" font-size="11" fill="currentColor">core 2</text>
<text x="105" y="185" text-anchor="middle" font-size="11" fill="#10b981">A ≠ B → song song</text>
<rect x="400" y="80" width="130" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="465" y="100" text-anchor="middle" font-size="12" fill="currentColor">Tx3 → ghi C</text>
<rect x="560" y="80" width="130" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="100" text-anchor="middle" font-size="12" fill="currentColor">Tx4 → ghi C</text>
<line x1="530" y1="103" x2="558" y2="103" stroke="currentColor" stroke-width="1.5" marker-end="url(#a3)"/>
<text x="545" y="150" text-anchor="middle" font-size="11" fill="#f59e0b">cùng ghi C → tuần tự</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.5 Rent & rent-exempt

Lưu trữ on-chain tốn tài nguyên của validator, nên account phải **trả tiền chỗ**. Cơ chế:
- Mỗi account cần giữ **số lamports tối thiểu tỉ lệ với kích thước `data`** (khoảng ~0.00089 SOL cho 100 byte tuỳ tham số mạng).
- Nếu số dư ≥ ngưỡng đó, account **rent-exempt** — không bị trừ rent, tồn tại vĩnh viễn. Thực tế **mọi account đều được tạo ở trạng thái rent-exempt** (nạp đủ lamports khi tạo).
- Khi **đóng account**, lamports rent-exempt được **hoàn lại** cho một ví bạn chỉ định. Vậy rent thực chất là **tiền đặt cọc chỗ**, không phải phí mất hẳn.

Hệ quả khi lập trình: tạo account mới → phải tính đúng `space` (số byte) và nạp đủ lamports rent-exempt, nếu không transaction fail.

### 2.6 Proof of History — đồng hồ mật mã, KHÔNG phải consensus

Đây là điểm hay bị hiểu sai. **PoH không quyết định block nào hợp lệ** — việc đó là của consensus (Solana dùng một biến thể PoS gọi là **Tower BFT**). PoH là một **nguồn thời gian có thể kiểm chứng**:

- Leader chạy một **hàm băm tuần tự lặp lại**: `h = sha256(h)`, lặp liên tục. Vì SHA-256 **không thể song song hóa được** theo chuỗi, số lần lặp giữa hai điểm chính là **bằng chứng đã trôi qua bao nhiêu thời gian**.
- Các transaction/event được **chèn (mix-in)** vào chuỗi hash này, tạo một **timestamp mật mã** cho thứ tự sự kiện.

Lợi ích: các validator **không cần bắt tay qua lại để thống nhất thời gian/thứ tự** trước khi bỏ phiếu — họ tin vào PoH như một đồng hồ chung, giảm mạnh overhead giao tiếp và cho phép leader stream giao dịch liên tục. Đây là một trong những lý do Solana đạt block time ~400ms và throughput cao.

### 2.7 Đánh đổi (trade-offs)

| Ưu điểm | Cái giá phải trả |
|---------|------------------|
| Phí cực thấp (~$0.00025/tx), throughput cao (hàng nghìn TPS thực tế) | Validator cần **phần cứng mạnh** (nhiều core, RAM lớn, băng thông cao) → phi tập trung phần cứng kém hơn |
| Block time ~400ms, finality nhanh | Từng có **sự cố downtime/ngừng khối** (network halt) — đánh đổi ở nhánh *liveness* của trilemma |
| Song song hóa thật sự (Sealevel) | Hot account thành nghẽn; lập trình phải khai báo account thủ công, learning curve dốc |
| Rent hoàn lại được, state phí minh bạch | Quản lý account/PDA phức tạp hơn storage của Solidity |

Không có "chuỗi tốt nhất" — Solana chọn nghiêng về **scalability & chi phí**, chấp nhận yêu cầu phần cứng và độ phức tạp lập trình cao hơn.

---

## 3. Viết program bằng Anchor (Rust)

Viết program Solana bằng SDK gốc rất verbose (tự deserialize account, tự kiểm tra owner/signer...). **Anchor** là framework Rust giúp bỏ hầu hết boilerplate: khai báo account bằng macro, tự sinh kiểm tra an ninh, và sinh sẵn IDL + client TypeScript.

### 3.1 Cấu trúc một program đếm (counter)

```rust
use anchor_lang::prelude::*;

// Địa chỉ program (Anchor sinh khi build; đây chỉ là ví dụ).
declare_id!("Coun1erProgram1111111111111111111111111111");

#[program]
pub mod counter {
    use super::*;

    /// Khởi tạo một data account Counter, gán authority = người ký.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.user.key();
        counter.count = 0;
        Ok(())
    }

    /// Tăng count. Chỉ authority mới được gọi (kiểm tra qua has_one bên dưới).
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter
            .count
            .checked_add(1)               // chống tràn số
            .ok_or(CounterError::Overflow)?;
        msg!("count hiện tại = {}", counter.count);
        Ok(())
    }
}

/// State lưu trong data account — KHÔNG nằm trong program.
#[account]
pub struct Counter {
    pub authority: Pubkey, // 32 byte
    pub count: u64,        // 8 byte
}

/// Danh sách account cho instruction `initialize`.
#[derive(Accounts)]
pub struct Initialize<'info> {
    // `init` = tạo account mới; payer trả rent-exempt; space = 8 (discriminator) + struct.
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8
    )]
    pub counter: Account<'info, Counter>,

    #[account(mut)]              // user bị trừ lamports → phải mut & signer
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>, // cần để tạo account
}

/// Danh sách account cho instruction `increment`.
#[derive(Accounts)]
pub struct Increment<'info> {
    // has_one = authority: bắt buộc counter.authority == authority.key()
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[error_code]
pub enum CounterError {
    #[msg("count bị tràn u64")]
    Overflow,
}
```

Những điểm cần nắm — đây là **triết lý Solana thể hiện trong code**:
- `#[account] struct Counter` là **state**, sống ở data account, **không** ở trong `#[program]`. Program chỉ là logic.
- `#[derive(Accounts)]` chính là **bản khai báo account** mà Sealevel dùng để song song hóa: mọi account instruction đụng tới phải liệt kê ở đây.
- `#[account(mut)]` = writable (bị lock ghi); không `mut` = read-only. `Signer` = phải ký.
- `space = 8 + 32 + 8`: 8 byte đầu là **discriminator** Anchor tự thêm (phân biệt loại account), rồi `Pubkey` 32 + `u64` 8.
- `has_one`, `Signer`, kiểm tra owner... là **an ninh khai báo** — Anchor tự sinh code kiểm tra, giảm lỗ hổng "missing signer check" kinh điển.

### 3.2 PDA — Program Derived Address

PDA là một account có địa chỉ **suy ra từ seed + program id**, **không có private key** — nghĩa là **chỉ program mới ký thay cho nó** được. PDA là cách chuẩn để program **sở hữu tài sản** hoặc tạo account xác định (deterministic) mà không cần lưu key:

```rust
#[derive(Accounts)]
pub struct InitVault<'info> {
    // Địa chỉ vault = hàm băm của (b"vault", user, program_id).
    // seeds + bump khiến địa chỉ deterministic & duy nhất cho mỗi user.
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

Với `seeds`, ai cũng tính lại được địa chỉ vault của một user (không cần lưu đâu đó), và **chỉ program này** mới "ký" cho vault đó qua cơ chế `invoke_signed`. Đây là nền tảng của gần như mọi protocol Solana (escrow, AMM pool, token vault...).

### 3.3 CPI — Cross-Program Invocation

Program gọi program khác qua **CPI**. Ví dụ chuyển SPL token bằng cách gọi Token Program:

```rust
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Chuẩn bị context CPI: chỉ rõ account from/to/authority.
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token.to_account_info(),
        to: ctx.accounts.user_token.to_account_info(),
        authority: ctx.accounts.vault_pda.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    // Token Program thực hiện chuyển; program của ta chỉ điều phối.
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
```

Lưu ý tinh thần **composability**: SPL Token Program là **một program dùng chung cho toàn mạng**, giữ logic token chuẩn; program của bạn không tự viết lại balance mà **CPI** sang nó. Đây là hệ quả trực tiếp của việc tách code/state — logic tái sử dụng, state (token account) truyền vào tường minh.

### 3.4 Build, test, deploy (vòng lặp dev)

```bash
anchor init counter          # tạo scaffold project
anchor build                 # biên dịch Rust -> BPF, sinh IDL + program id
anchor test                  # spin validator cục bộ, chạy test TypeScript
anchor deploy --provider.cluster devnet   # deploy lên devnet
```

Client TypeScript được sinh từ IDL, gọi instruction rất gọn:

```ts
await program.methods
  .increment()
  .accounts({ counter: counterPda, authority: wallet.publicKey })
  .rpc();
```

---

## 4. Solana vs EVM — bảng đối chiếu

| Tiêu chí | EVM (Ethereum) | Solana |
|----------|----------------|--------|
| **State** | Storage nằm trong contract | Data account tách rời, program stateless |
| **Thực thi** | Tuần tự (1 luồng) | Song song (Sealevel), khai báo account trước |
| **Định danh state** | Địa chỉ contract + slot | Account pubkey / PDA (seed + program id) |
| **Ngôn ngữ** | Solidity / Vyper | Rust (Anchor), C, hoặc SDK gốc |
| **Gọi contract khác** | `call` / `interface` | CPI (Cross-Program Invocation) |
| **Thời gian/thứ tự** | Do consensus quyết định | PoH làm đồng hồ + Tower BFT PoS |
| **Phí** | Gas cao, biến động mạnh | Rất thấp, ổn định |
| **Lưu trữ** | Trả gas 1 lần, phình state | Rent-exempt (đặt cọc, hoàn lại khi đóng) |
| **Đánh đổi** | Phi tập trung cao, TPS thấp | TPS cao, phần cứng nặng, rủi ro liveness |

---

## 5. Tình huống thực tế

- **Airdrop/mint hàng loạt cùng lúc:** nếu mọi user cùng ghi vào **một mint account**, Sealevel không song song hóa được → nghẽn. Thiết kế tốt phải **sharding account** (nhiều pool/nhiều mint) để tận dụng song song.
- **Escrow phi tập trung:** dùng **PDA** làm ví giữ tiền — không ai có private key, chỉ program giải ngân theo điều kiện; kết hợp **CPI** sang Token Program để chuyển.
- **Chuyển tư duy từ Solidity:** lỗi phổ biến nhất của dev EVM là quên rằng **mọi account phải truyền vào tường minh** và phải tự **kiểm signer/owner** (Anchor giúp nhưng vẫn phải khai báo đúng `has_one`, `seeds`, `mut`).

---

## 6. Tóm tắt
- Solana **tách program (code, stateless, read-only) khỏi data account (state, có owner)** — khác hẳn "contract giữ storage" của EVM.
- **Mọi thứ là account**: lamports + data + owner; chỉ owner sửa được data. **Rent-exempt** là tiền đặt cọc chỗ, hoàn lại khi đóng account.
- **Sealevel** song song hóa nhờ transaction **khai báo trước** account read/write; hot account là điểm nghẽn.
- **PoH** là đồng hồ mật mã (chuỗi SHA-256 tuần tự), **không phải** consensus — consensus là Tower BFT (PoS).
- Đánh đổi: phí thấp/TPS cao ↔ phần cứng nặng, rủi ro liveness, lập trình phức tạp hơn.
- **Anchor** viết program bằng Rust: `#[account]` = state, `#[derive(Accounts)]` = khai báo account cho Sealevel; **PDA** cho account deterministic không key, **CPI** để compose với program khác (SPL Token...).

> **Bài tiếp theo:** đi sâu vào **SPL Token & xây một protocol DeFi trên Solana** — áp dụng PDA, CPI và Sealevel vào một AMM/escrow thực tế.
