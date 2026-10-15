# Bài 9 — MCP: nối agent với hệ thống bên ngoài

## 1. Mục tiêu

Sau bài này bạn có thể:

- Vẽ được ba vai **host / client / server** của MCP, và chỉ ra một tool call đi qua những vai nào trước khi tới hệ thống thật.
- Chọn **stdio** hay **Streamable HTTP** cho một server cụ thể, nêu được nguyên nhân gốc (ai khởi động process, ai giữ credential) chứ không chọn theo thói quen.
- Chọn **API key** hay **OAuth** cho một MCP server theo câu hỏi "ai là người gọi", và giải thích vì sao không bao giờ phải viết nhánh riêng cho từng client.
- Tách quyền **đọc** khỏi quyền **ghi** ở ba tầng: thiết kế tool, cấu hình client (`permissions`, `enabled_tools`), và scope OAuth.
- Viết, chạy và cắm một MCP server stdio 70 dòng vào Claude Code hoặc Codex, kiểm được bằng lệnh chứ không bằng cảm giác "hình như chạy".
- Dựng browser automation cho agent đúng cách: headless mặc định, profile riêng, login một lần, kiểm bằng cold start.

---

## 2. Tình huống

Một team làm app hoá đơn PDF cho các shop thương mại điện tử. Team support mỗi ngày trả lời những câu kiểu "khách bảo chưa nhận được email hoá đơn". Để bớt việc tra tay, một dev trong team dựng **MCP server** cho app — một chương trình đứng giữa agent và database, phơi ra vài **tool** (hàm agent được gọi) như `search_orders_invoice_status`, `get_settings`, `list_email_history`. Agent support (một LLM bên thứ ba) cắm vào server đó và tự tra.

Phần "nối được" xong rất nhanh. Hai sự cố đến sau, và cả hai đều **không có lỗi nào được ném ra**.

**Sự cố 1 — tool trả rỗng một cách tự tin.** Support hỏi agent: "shop này đã gửi email hoá đơn cho đơn hàng kia chưa?". Agent gọi `list_email_history`, nhận về `[]`, và trả lời chắc chắn: "hệ thống chưa gửi email nào". Sự thật: email đã đi. Tool đọc một collection mà **không chỗ nào trong repo ghi vào** — nó rỗng từ ngày đầu, với mọi shop. Danh sách rỗng là một câu trả lời khẳng định; agent không có cách nào phân biệt "không có email" với "tool này không biết gì". (Case thực tế; quyết định cuối cùng là **xoá tool**, trả lời câu hỏi đó bằng trạng thái đơn qua `search_orders_invoice_status`. Bỏ tool kéo theo sửa help text quyền và một key dịch ở 12 file locale — case thực tế, một lần.)

**Sự cố 2 — tool đọc cấu hình lộ hơn mức cần.** Tool `get_settings` ban đầu viết theo kiểu **denylist**: trả nguyên document cấu hình của shop, trừ 3 key. Document đó có một nhóm cấu hình SMTP: `host`, `port`, `username` ở dạng plaintext, `password` ở dạng ciphertext. Tất cả đi thẳng sang LLM bên thứ ba. Không test nào đỏ, vì test chỉ kiểm "không trả 3 key kia" — không ai kiểm tool đang trả **những gì**. (Case thực tế ở một app SaaS thương mại điện tử khác; sửa bằng **allowlist hai tầng**: chỉ 6 nhóm được đi qua, riêng nhóm email có allowlist theo từng field.)

Cùng tuần đó, một dev khác cần agent kiểm bản fix trên storefront thật. Extension trình duyệt không kết nối, agent chuyển sang soi bundle JS đã minify, rồi báo "đây là những gì tôi không verify được". Danh sách đó sai: repo có sẵn một CLI browser automation dưới dạng skill, và khi dùng nó thì verify được tới thao tác cuối. (Case thực tế.)

Ba chuyện, một gốc: **nối agent với hệ thống ngoài là việc thiết kế bề mặt** — agent thấy gì, làm được gì, và khi một đường hỏng thì nó biết còn đường khác. Giao thức chỉ là phần dễ.

---

## ⏸ Dừng lại — đoán trước

Bạn viết MCP server stdio bằng Python. Lúc debug, bạn thêm `print("loaded 120 notes")` ở đầu file. Server vẫn chạy, process không chết, không có traceback. Nhưng trong Claude Code, server hiện trạng thái lỗi và agent không thấy tool nào.

**Dòng `print` đó làm hỏng cái gì?**

```
(a) Không gì — print chỉ là log, client bỏ qua
(b) Python buffer stdout nên server bị treo
(c) Nó chen một dòng không phải JSON-RPC vào đúng kênh client đọc message
(d) Claude Code cấm server in bất cứ thứ gì, kể cả stderr
```

---

## 3. Cơ chế

### 3.1 Ba vai: host, client, server

**MCP (Model Context Protocol)** là một chuẩn mở quy định cách một ứng dụng AI lấy context và gọi hành động từ chương trình bên ngoài. Course AIML đã giới thiệu ý tưởng ("USB-C cho tool") ở [[aiml-05-agents-tools]] — bài này đi vào phần vận hành.

Theo tài liệu kiến trúc (modelcontextprotocol.io/docs/learn/architecture):

- **MCP host** — ứng dụng AI điều phối, ví dụ Claude Code, Codex CLI, một IDE.
- **MCP client** — thành phần trong host giữ **một** kết nối tới **một** server. Host nối 3 server thì tạo 3 client.
- **MCP server** — chương trình cung cấp context. "Server" là vai trò, không phải nơi chạy: có server chạy ngay trên máy bạn, có server chạy trên cloud.

Server phơi ra ba loại **primitive**:

| Primitive | Là gì | Ai quyết định dùng |
|---|---|---|
| **Tool** | hàm thực thi được: query DB, gọi API, ghi file | model tự chọn gọi |
| **Resource** | dữ liệu để đọc: nội dung file, schema DB, bản ghi | ứng dụng / người đưa vào context |
| **Prompt** | template tương tác dựng sẵn | người gọi chủ động |

Trong Claude Code, ba primitive này hiện ra ba kiểu khác nhau (code.claude.com/docs/en/mcp):

- Tool thành tên `mcp__<server>__<tool>` — chính tên này dùng trong permission rule và hook matcher.
- Resource được gọi bằng `@`: `@github:issue://123`.
- Prompt thành slash command: `/mcp__github__pr_review 456`.

Bên dưới là **JSON-RPC 2.0** — mỗi message là một object JSON có `method`, `params`, `id`. Agent không "biết" MCP; host lấy danh sách tool từ mọi server (`tools/list`), gộp vào danh sách tool của model, và khi model chọn gọi một tool thì host chuyển thành `tools/call` tới đúng server. Một lần gọi trông như sau (rút gọn từ ví dụ trong spec, bỏ trường `_meta`):

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call",
 "params":{"name":"search_notes","arguments":{"query":"rollback"}}}
```

```json
{"jsonrpc":"2.0","id":3,"result":{
  "content":[{"type":"text","text":"deploy.md:2: Rollback bằng lệnh make rollback"}],
  "isError":false}}
```

Hệ quả vận hành của mô hình này: **mọi thứ agent biết về tool nằm trong `name`, `description` và `inputSchema`**. Agent không đọc code server. Nếu description hứa "lịch sử email" mà dữ liệu không tồn tại, agent tin description — đúng như Sự cố 1.

### 3.2 Hai transport: stdio và Streamable HTTP

**Transport** là cách các message JSON-RPC đi giữa client và server. Spec hiện có hai transport chuẩn (modelcontextprotocol.io/specification/latest/basic/transports):

**stdio** — client **khởi động server như một subprocess**, rồi nói chuyện qua stdin/stdout của process đó. Luật của spec (trang stdio binding), nguyên văn ý:

- Mỗi message là một dòng, phân cách bằng newline, và **không được chứa newline bên trong**.
- Server **MAY** ghi log ra `stderr`.
- Server **MUST NOT** ghi ra `stdout` bất cứ thứ gì không phải message MCP hợp lệ.
- Client đóng stdin để báo tắt; server nên thoát khi đọc thấy EOF.

Đây là đáp án câu đoán trước: **(c)**. `print("loaded 120 notes")` ghi một dòng không phải JSON vào stdout — đúng kênh client đang parse từng dòng thành message. Process không chết vì nhìn từ phía Python chẳng có gì sai; chỉ client thấy rác. Lỗi kiểu này **im lặng ở phía server và ồn ào ở phía client**, nên đọc log server sẽ không thấy gì.

**Streamable HTTP** — server là một process độc lập, có **một endpoint duy nhất** (ví dụ `https://example.com/mcp`) nhận HTTP POST. Mỗi message là một POST; server trả về một JSON hoặc một luồng SSE gắn với request đó. Một server phục vụ được nhiều client. Spec yêu cầu server **MUST** kiểm header `Origin` để chặn DNS rebinding, và khi chạy local thì **SHOULD** chỉ bind `127.0.0.1` chứ không phải `0.0.0.0` (trang Streamable HTTP, mục Security).

Transport HTTP+SSE cũ (bản 2024-11-05) đã **deprecated**; Claude Code docs cũng ghi SSE là deprecated và khuyên dùng HTTP.

Chọn transport theo nguyên nhân gốc, không theo sở thích:

- **Ai khởi động process?** stdio: host khởi động, chết theo session, không cổng mạng nào mở. HTTP: bạn (hoặc nhà cung cấp) phải tự vận hành server, có uptime, có deploy.
- **Ai giữ credential?** stdio: credential nằm trong biến môi trường trên máy người dùng — spec Authorization nói implementation stdio **SHOULD NOT** làm theo luồng OAuth mà lấy credential từ environment. HTTP: credential đi qua mạng, nên cần một cơ chế xác thực thật (mục 3.4).
- **Bao nhiêu người dùng?** Một người một máy → stdio đủ. Cả team hoặc khách hàng bên ngoài → HTTP.

| Câu hỏi | stdio | Streamable HTTP |
|---|---|---|
| Ai khởi động | host, như subprocess | tự vận hành, process độc lập |
| Phục vụ | thường một client | nhiều client |
| Credential | biến môi trường trên máy | header / OAuth qua mạng |
| Hỏng kiểu đặc trưng | rác trên stdout | sai endpoint, thiếu `Origin`, 401 |

Một lưu ý về phiên bản spec: bản 2026-07-28 chuyển MCP sang **stateless** — mỗi request tự mang phiên bản giao thức và capability trong trường `_meta`, và bước bắt tay `initialize` cũ được thay bằng `server/discover` tuỳ chọn. Spec có quy định đường lùi: client hiện đại hỏi `server/discover` trước, server không hiểu thì client quay về `initialize`. File mẫu ở mục 4 dùng bắt tay kiểu cũ vì nó ngắn và client tuân spec vẫn lùi về được; khi viết server cho production, dùng SDK chính thức thay vì tự cài JSON-RPC.

### 3.3 Cấu hình trong Claude Code và Codex

**Claude Code** (code.claude.com/docs/en/mcp). Hai lệnh đủ cho phần lớn việc:

```bash
# Server từ xa qua HTTP — endpoint thường là /mcp, không phải domain trần
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Server local stdio — mọi thứ sau `--` là lệnh chạy server, chuyển nguyên
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable \
  -- npx -y airtable-mcp-server
```

Docs lưu ý: `--env` nhận nhiều cặp `KEY=value`, nên phải có một option khác (ví dụ `--transport stdio`) chen giữa `--env` và tên server, nếu không tên server bị đọc thành một cặp.

**Scope** quyết định server được nạp ở đâu và ai thấy:

| Scope | Nạp ở | Chia sẻ | Lưu tại |
|---|---|---|---|
| `local` (mặc định) | chỉ project hiện tại | không | `~/.claude.json` |
| `project` | project hiện tại | có, qua git | `.mcp.json` ở gốc repo |
| `user` | mọi project | không | `~/.claude.json` |

Thứ tự ưu tiên: local > project > user. Định nghĩa **không gộp** giữa các scope — entry ưu tiên cao nhất được dùng nguyên khối. Với server từ `.mcp.json`, session tương tác sẽ hỏi trước khi dùng; nhưng ở `claude -p` và Agent SDK, docs ghi rõ **không có prompt đó, server nạp luôn** — muốn chặn phải đưa vào `disabledMcpjsonServers`. Đây là chi tiết đáng nhớ khi bạn lên Level 6 và chạy agent không người trông ([[ag-19-vong-lap-nhat-task]]).

`.mcp.json` hỗ trợ khai biến môi trường, nên commit được mà không commit secret:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

Quản lý: `claude mcp list` (kèm trạng thái sức khoẻ), `claude mcp get <name>`, `claude mcp remove <name>`; trong session, `/mcp` xem trạng thái và đăng nhập OAuth.

**Codex** (developers.openai.com/codex/mcp). Cấu hình nằm ở `~/.codex/config.toml`; project có thể dùng `.codex/config.toml` nhưng chỉ khi project được đánh dấu trusted. Mỗi server là một bảng `[mcp_servers.<tên>]`:

```toml
[mcp_servers.notes]
command = "python3"
args = ["/duong/dan/tuyet/doi/notes_mcp.py"]
env = { NOTES_DIR = "/duong/dan/tuyet/doi/notes" }

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
```

Lệnh tương ứng: `codex mcp add <tên> --env K=V -- <lệnh>`, `codex mcp list`, `codex mcp login <tên>` cho OAuth. Timeout mặc định theo docs: `startup_timeout_sec` = 10, `tool_timeout_sec` = 60.

### 3.4 Xác thực: API key hay OAuth

Spec Authorization của MCP (modelcontextprotocol.io/specification/latest/basic/authorization) dựa trên **OAuth 2.1** cùng một nhóm RFC. Ba điểm quyết định cách bạn làm:

1. Authorization là **OPTIONAL**. Áp cho transport HTTP; stdio lấy credential từ môi trường.
2. MCP server **MUST** cài **Protected Resource Metadata (RFC 9728)** — một document công khai nói "muốn gọi tôi thì đi xin token ở authorization server này". Khi client gọi mà không có token, server trả `401` kèm header `WWW-Authenticate` trỏ tới document đó; client tự đọc và đi theo.
3. Token phải được cấp **cho đúng server này** (Resource Indicators, RFC 8707) và server **MUST NOT** nhận hay chuyển tiếp token khác.

Hệ quả thực tế của điểm 2: **không có "OAuth cho Claude" và "OAuth cho Cursor"**. Client không tự chọn cách xác thực — nó đọc metadata server khai rồi làm theo. Một implementation đúng spec dùng được với mọi client tuân spec; không có nhánh `if (client === 'claude')` nào. Client không cài phần authorization của spec thì không dùng được — đó là giới hạn của client, không phải việc bạn phải vá. (Kinh nghiệm thực tế khi thiết kế MCP server cho một app SaaS.)

Còn chọn cái nào, hỏi một câu: **ai là người gọi?**

| Người gọi | Chọn | Lý do gốc |
|---|---|---|
| Bạn, một người, một máy, gọi server của chính mình | **API key** qua header | dựng cả authorization server chỉ để tự đăng nhập vào server của mình là thừa |
| Nhiều user/khách bên ngoài, mỗi người một danh tính và một tập quyền | **OAuth** theo spec | cần biết *ai* gọi để cấp *quyền nào*; key dùng chung không trả lời được câu đó |

Hai luồng sống chung trên một server được: chúng chỉ khác ở bước **xác định danh tính**; phần sau (kiểm quyền, chạy tool) dùng chung một code path. (Kinh nghiệm thực tế.) Nền OAuth/PKCE xem [[sec-05-authn-authz]]; cách giữ secret ngoài code xem [[dva-d2-03-secrets]].

Trong Claude Code, server trả `401`/`403` sẽ được đánh dấu cần đăng nhập trong `/mcp`; hoặc chạy `claude mcp login <tên>` từ shell. Server cần OAuth app đăng ký trước thì truyền `--client-id`, `--client-secret`, `--callback-port` khi `claude mcp add`.

### 3.5 Quyền đọc và quyền ghi — ba tầng chặn

Spec Tools nói thẳng: vì an toàn, **SHOULD** luôn có người trong vòng lặp với quyền từ chối lời gọi tool; và client **MUST** coi các tool annotation (như `readOnlyHint`) là **không đáng tin** trừ khi đến từ server tin cậy. Nghĩa là: server tự khai "tôi chỉ đọc" không phải là bằng chứng. Chặn thật phải nằm ở chỗ bạn kiểm soát.

**Tầng 1 — thiết kế tool ở server.** Đây là tầng rẻ nhất để làm đúng và đắt nhất để sửa sau.

- Tách tool đọc và tool ghi thành **tool riêng**, đừng làm một tool `manage_order(action=...)`. Tool riêng thì tầng 2 mới chặn được từng cái.
- Dữ liệu trả ra dùng **allowlist**, không denylist. Denylist đúng lúc viết và sai im lặng ngay khi ai đó thêm field mới; allowlist khi thiếu thì hỏng **ồn ào và về phía an toàn** — field mới không hiện ra. Cái giá: mọi field mới mặc định vô hình với agent, và triệu chứng "tool trả thiếu" trông giống hệt bug. (Kinh nghiệm thực tế từ Sự cố 2 — trade-off này được chấp nhận có chủ đích.)
- Tool **không bao giờ trả rỗng thay cho "không biết"**. Không có dữ liệu thì nói rõ đã quét gì: "0 dòng khớp 'kafka' trong notes/ (đã quét toàn bộ \*.md)". Tool đọc một nguồn không ai ghi thì xoá tool — một tool trả lời sai một cách tự tin tệ hơn không có tool, vì thiếu tool thì agent tìm đường khác, còn rỗng-giả thì agent dừng và kết luận ngược. (Kinh nghiệm thực tế từ Sự cố 1.)
- Lỗi nghiệp vụ trả trong kết quả với `isError: true` để model đọc được và tự sửa tham số; lỗi giao thức (tool không tồn tại, request sai schema) mới dùng JSON-RPC error. (Spec Tools, mục Error Handling.)
- Kết quả tool là **dữ liệu**, không mang chỉ thị cho agent kiểu "bây giờ hãy gọi tool X". Lý do và cách chặn ở [[ag-08-hook-va-chan-bang-cau-hinh]].

**Tầng 2 — cấu hình client.** Claude Code dùng permission rule với tên `mcp__...` (code.claude.com/docs/en/permissions, mục MCP):

```json
{
  "permissions": {
    "allow": ["mcp__notes__search_notes", "mcp__crm__get_customer"],
    "deny":  ["mcp__crm__delete_customer", "mcp__crm__refund_order"]
  }
}
```

`mcp__crm` khớp mọi tool của server `crm`; `mcp__crm__*` cũng vậy; `mcp__crm__get_customer` khớp đúng một tool. Codex làm việc tương tự ở phía cấu hình: `enabled_tools = [...]` chỉ cho phép một tập, `disabled_tools` áp **sau** `enabled_tools`. Phía người viết server, Claude Code còn hỗ trợ đánh dấu `_meta["anthropic/requiresUserInteraction"] = true` cho một tool: tool đó luôn hỏi người ở mọi lần gọi, kể cả trong `bypassPermissions`, và allow rule không bỏ qua được.

**Tầng 3 — scope của credential.** Với OAuth, server khai scope cần thiết trong header `WWW-Authenticate` (spec lấy ví dụ `files:read` và `files:write`); token chỉ có `files:read` thì gọi tool ghi nhận `403 insufficient_scope`. Với API key, cấp **key riêng chỉ đọc** cho agent. Tầng này là tầng duy nhất còn đứng khi tầng 1 có bug và tầng 2 cấu hình sai.

Vì sao cần cả ba: mỗi tầng hỏng theo một kiểu khác. Tầng 1 hỏng khi dev thêm tool mới vội; tầng 2 hỏng khi ai đó bấm "don't ask again" hoặc chạy `claude -p`; tầng 3 hỏng khi key được tạo với quyền admin "cho nhanh". Một lần ghi sai chỉ xảy ra khi cả ba cùng hỏng.

### 3.6 MCP tốn context — và cách Claude Code giảm

Mỗi tool là một đoạn `name` + `description` + `inputSchema` phải nằm đâu đó trong context. Claude Code mặc định bật **tool search**: lúc mở session chỉ nạp tên tool và server instructions, định nghĩa đầy đủ chỉ nạp khi model cần (docs, mục "Scale with MCP tool search"). Biến `ENABLE_TOOL_SEARCH` điều khiển: `false` nạp hết từ đầu, `auto` nạp hết khi tổng định nghĩa còn dưới 10% context window và chuyển sang hoãn khi chạm 10%.

Kết quả tool cũng có trần: `MAX_MCP_OUTPUT_TOKENS` mặc định 25.000 token, Claude Code cảnh báo khi vượt 10.000; kết quả vượt trần được lưu ra file và model nhận đường dẫn. Mô tả tool nạp sẵn bị cắt ở 4.096 ký tự — nên từ khoá quan trọng phải nằm ở đầu description.

```python
# Tính thử ngưỡng của chế độ auto. 10% là số của docs;
# context window 200_000 token là GIẢ ĐỊNH để minh hoạ, không phải số của model bạn dùng.
context_window = 200_000
nguong = int(context_window * 0.10)
print(nguong)            # 20000 token định nghĩa tool trước khi bị hoãn
# Bao nhiêu tool thì chạm ngưỡng phụ thuộc độ dài schema từng tool — CHƯA ĐO.
# Đo bằng: mở session, chạy /context, so phần MCP tools khi bật/tắt từng server.
```

Bài học vận hành: cắm thêm server không miễn phí, nhưng chi phí nằm ở chỗ đo được (`/context`), không phải chỗ đoán.

### 3.7 Browser cho agent: một "hệ thống ngoài" đặc biệt

Trình duyệt là hệ thống ngoài agent cần nhiều nhất khi kiểm UI, và cũng là nơi dễ làm sai nhất vì nó **dùng chung máy với người**. Agent có thể lái trình duyệt qua một MCP server browser automation, qua một CLI có sẵn trong repo, hoặc qua extension — cơ chế khác nhau nhưng luật vận hành giống nhau. Bốn luật dưới đây đều đến từ sự cố thật (kinh nghiệm thực tế).

**Luật 1 — headless là mặc định.** Một agent chụp ảnh so sánh chạy ở chế độ **headed** (có cửa sổ hiện lên) và liên tục cướp focus trong lúc người dùng đang gõ việc khác. Nguyên nhân gốc: công cụ mặc định đã là headless; một agent trước đó gặp **một lần treo** trên một trang cụ thể, tự đổi sang headed "cho chắc", và giữ luôn. Đo lại thì headless chụp viewport mất khoảng 0 giây, chụp full page khoảng 5 giây (case thực tế, một lần đo, không phải benchmark). Treo một lần là việc cần **chẩn đoán**, không phải lý do đổi chế độ vĩnh viễn. Chỉ bật headed khi người dùng yêu cầu xem trực tiếp, hoặc khi bước đó thật sự không chạy được headless — và báo trước là cửa sổ sẽ hiện.

**Luật 2 — mỗi agent một session/profile có tên riêng.** Session mặc định thường là cửa sổ người dùng đang dùng. Dùng chung thì vừa đè việc của người, vừa làm agent đọc sai trạng thái (một lần agent thấy trang tự nhảy sang URL khác và tưởng có người dùng chung). Profile bị một process khác giữ khoá thì Chrome thoát với exit 21; agent đã dừng mà process còn sót cũng giữ khoá đó — dừng agent thì dọn luôn process và cửa sổ nó mở. (Case thực tế.)

**Luật 3 — không mượn profile Chrome thật; dựng profile riêng, login một lần.** Ý tưởng hấp dẫn: copy thư mục profile Chrome của người dùng (đã đăng nhập sẵn) cho tool automation đọc. Kết quả đo được: file `Cookies` có 762 dòng, tool đọc ra **0 cookie** (case thực tế). Nguyên nhân gốc: trên macOS, Chrome mã hoá giá trị cookie bằng khoá lưu trong Keychain; process automation không lấy được khoá đó, nên SQLite đọc được nhưng mọi giá trị là blob mã hoá. Chạy headed cũng không cứu. Quy trình đúng:

1. Dựng profile riêng cho automation, mở **headed** đúng URL cần đăng nhập.
2. Người dùng đăng nhập **trong chính cửa sổ đó** — nói rõ "không phải Chrome thường của bạn", vì đây là chỗ nhầm hay xảy ra nhất.
3. Kiểm round-trip: đọc lại cookie trong profile riêng (case thực tế: số cookie tăng từ 5 lên 19 sau khi đăng nhập).
4. Kiểm **cold start headless**: process mới, đúng chế độ agent sẽ chạy. "Đã đăng nhập" trong process đang mở không chứng minh phiên còn sống ở lần chạy sau.

Agent không tự gõ mật khẩu vào site thật ngoài localhost, kể cả khi file `.env` có sẵn — mở cửa sổ cho người tự gõ.

**Luật 4 — một đường hỏng là tín hiệu đổi đường, không phải kết luận.** Quay lại tình huống ở mục 2: extension không kết nối, agent kết luận "không verify được". Danh sách "không verify được" là bằng chứng vắng mặt do chính agent tạo ra, và người đọc tin nó như một giới hạn của hệ thống. Trước khi viết câu đó, agent phải liệt kê mọi đường còn lại (MCP server khác, CLI trong repo, gọi HTTP trực tiếp, đọc từ nguồn chuẩn bằng đường khác), thử ít nhất đường thứ hai, và nếu vẫn không được thì ghi **đã thử gì, mỗi cái chết ở đâu**. Khi tìm công cụ, quét cả thư mục skill, thư mục agent và `bin/` của repo — lần agent kết luận "repo không có công cụ đó" là vì chỉ tìm trong một thư mục. (Kinh nghiệm thực tế.) Luật này nên viết vào file hướng dẫn của repo ([[ag-04-context-va-file-huong-dan]]) hoặc vào chính skill kiểm UI ([[ag-07-skill-va-slash-command]]) — đừng dựa vào việc nhắc lại mỗi lần.

---

## 4. Làm thử

Mục tiêu: viết một MCP server stdio chỉ đọc, kiểm nó **trước** khi cắm vào agent, cắm vào, rồi cố ý làm hỏng nó để thấy triệu chứng thật.

**Bước 1 — dựng dữ liệu mẫu.**

```bash
mkdir -p ~/mcp-lab/notes && cd ~/mcp-lab
printf '# Deploy\nRollback bằng lệnh make rollback\n' > notes/deploy.md
printf '# Oncall\nKhi queue nghẽn: xem dashboard trước, rollback sau\n' > notes/oncall.md
```

**Bước 2 — server.** Lưu thành `~/mcp-lab/notes_mcp.py`. Chỉ thư viện chuẩn; đã chạy thử bằng pipe stdin như bước 3.

```python
#!/usr/bin/env python3
"""notes-mcp: MCP server stdio tối thiểu, một tool CHỈ ĐỌC.
stdout chỉ dành cho JSON-RPC; mọi log ra stderr."""
import json, os, sys
from pathlib import Path

NOTES_DIR = Path(os.environ.get("NOTES_DIR", ".")).resolve()
TOOLS = [{
    "name": "search_notes",
    "description": "Tìm trong thư mục ghi chú của team (chỉ đọc). "
                   "Trả tên file + dòng khớp. Không khớp thì nói rõ là không khớp.",
    "inputSchema": {
        "type": "object",
        "properties": {"query": {"type": "string", "description": "Từ khoá"}},
        "required": ["query"],
        "additionalProperties": False,
    },
    "annotations": {"readOnlyHint": True},
}]

def log(*a):
    print(*a, file=sys.stderr, flush=True)  # KHÔNG bao giờ print ra stdout

def search(query):
    hits = []
    for f in sorted(NOTES_DIR.rglob("*.md")):
        for i, line in enumerate(f.read_text(errors="ignore").splitlines(), 1):
            if query.lower() in line.lower():
                hits.append(f"{f.relative_to(NOTES_DIR)}:{i}: {line.strip()}")
    if not hits:
        return f"0 dòng khớp '{query}' trong {NOTES_DIR.name}/ (đã quét toàn bộ *.md)"
    return "\n".join(hits[:50])

def handle(msg):
    method, mid = msg.get("method"), msg.get("id")
    if mid is None:                      # notification: không trả lời
        return None
    if method == "initialize":           # bắt tay kiểu cũ; client tuân spec lùi về được
        result = {"protocolVersion": msg["params"].get("protocolVersion", "2025-06-18"),
                  "capabilities": {"tools": {}},
                  "serverInfo": {"name": "notes-mcp", "version": "0.1.0"}}
    elif method == "tools/list":
        result = {"tools": TOOLS}
    elif method == "tools/call":
        p = msg["params"]
        if p.get("name") != "search_notes":
            return {"jsonrpc": "2.0", "id": mid,
                    "error": {"code": -32602, "message": f"Unknown tool: {p.get('name')}"}}
        q = (p.get("arguments") or {}).get("query", "").strip()
        if not q:
            result = {"content": [{"type": "text", "text": "query rỗng"}], "isError": True}
        else:
            result = {"content": [{"type": "text", "text": search(q)}], "isError": False}
    else:
        return {"jsonrpc": "2.0", "id": mid,
                "error": {"code": -32601, "message": f"Method not found: {method}"}}
    return {"jsonrpc": "2.0", "id": mid, "result": result}

log(f"notes-mcp start, NOTES_DIR={NOTES_DIR}")
for raw in sys.stdin:                    # mỗi dòng một message JSON-RPC
    if not raw.strip():
        continue
    try:
        reply = handle(json.loads(raw))
    except Exception as e:               # lỗi của mình không được làm chết process
        log("error:", e)
        continue
    if reply is not None:
        sys.stdout.write(json.dumps(reply, ensure_ascii=False) + "\n")
        sys.stdout.flush()
```

Để ý ba quyết định thiết kế đã nói ở mục 3: chỉ có tool đọc; "không khớp" được nói thành câu có phạm vi chứ không trả chuỗi rỗng; query rỗng trả `isError: true` để model tự sửa.

**Bước 3 — kiểm server bằng tay, chưa cần agent.** Đây là bước người ta hay bỏ, rồi mất nửa giờ đoán vì sao agent không thấy tool.

```bash
cat > req.jsonl <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"tay","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_notes","arguments":{"query":"rollback"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_notes","arguments":{"query":"kafka"}}}
EOF
NOTES_DIR=./notes python3 notes_mcp.py < req.jsonl 2>/dev/null | wc -l          # phải ra 4
NOTES_DIR=./notes python3 notes_mcp.py < req.jsonl 2>/dev/null | python3 -c \
  'import sys,json; [json.loads(l) for l in sys.stdin]; print("stdout sạch")'
```

Bốn request có `id` thì đúng bốn dòng trả lời; notification không có dòng nào. Dòng thứ hai parse **mọi** dòng stdout thành JSON — nếu có một dòng rác, nó văng `JSONDecodeError`.

**Bước 4 — cắm vào agent.** Chọn một:

```bash
# Claude Code — scope local mặc định, chỉ project hiện tại
claude mcp add --env NOTES_DIR=$HOME/mcp-lab/notes --transport stdio notes \
  -- python3 $HOME/mcp-lab/notes_mcp.py
claude mcp list            # notes phải hiện trạng thái kết nối được

# Codex
codex mcp add notes --env NOTES_DIR=$HOME/mcp-lab/notes -- python3 $HOME/mcp-lab/notes_mcp.py
codex mcp list
```

Trong session, hỏi: "Trong ghi chú của team, quy trình rollback là gì?" Agent phải gọi `search_notes` (Claude Code hiện là `mcp__notes__search_notes`) và trích đúng hai dòng. Hỏi tiếp về "kafka": agent phải trả lời rằng ghi chú **không nhắc tới**, kèm phạm vi đã quét — không được bịa.

**Bước 5 — cố ý làm hỏng.** Thêm `print("loaded notes")` (không có `file=sys.stderr`) ngay dưới dòng `log(...)` ở cuối file. Chạy lại lệnh kiểm "stdout sạch" ở bước 3 — nó phải văng lỗi. Mở lại session agent và xem `/mcp` (Claude Code) hoặc `codex mcp list`: ghi lại triệu chứng client báo. Xoá dòng `print` đó.

**Bước 6 — chặn bằng cấu hình (Claude Code).** Thêm vào `.claude/settings.local.json` của một repo thử:

```json
{ "permissions": { "deny": ["mcp__notes__search_notes"] } }
```

Hỏi lại câu rollback. Agent không được gọi tool; ghi lại nó báo gì. Xoá rule sau khi xong.

**Tiêu chí "xong" — kiểm được:**

- [ ] Bước 3: `wc -l` ra đúng `4`, và lệnh parse in `stdout sạch`.
- [ ] Bước 4: `claude mcp list` hoặc `codex mcp list` có `notes`; agent trả đúng hai dòng chứa "rollback" kèm tên file.
- [ ] Câu hỏi "kafka" nhận câu trả lời "không có trong ghi chú", không có nội dung bịa.
- [ ] Bước 5: bạn ghi lại được nguyên văn triệu chứng phía client khi stdout bị bẩn, và lệnh kiểm ở bước 3 đỏ trong lúc đó.
- [ ] Bước 6: với deny rule, agent không gọi được tool; bỏ rule thì gọi lại được.

---

## 5. Bẫy thường gặp

### Server chạy nhưng agent không thấy tool nào

Process sống, không traceback, nhưng client báo lỗi hoặc danh sách tool trống. Có thứ gì đó ghi ra stdout ngoài JSON-RPC: một `print` debug, một thư viện in banner, một warning của package manager khi chạy qua `npx`. Cho mọi log đi qua một hàm ghi `stderr`, và đưa lệnh kiểm "parse mọi dòng stdout thành JSON" (bước 3) vào CI hoặc pre-commit của repo server.

### Tool trả rỗng, agent kết luận "không có"

Agent trả lời chắc chắn một điều sai mà vẫn trích đúng output của tool. Tool đọc một nguồn không ai ghi, hoặc lọc sai, rồi trả `[]`, và agent không phân biệt được rỗng-thật với rỗng-vì-không-biết. Kết quả rỗng luôn phải kèm phạm vi đã quét. Với mỗi collection mà một tool đọc, nên có một kiểm tra tự động "trong repo có ít nhất một đường ghi vào nó"; kiểu gate này và cách nó tự xanh giả nằm ở [[ag-11-gate-xanh-gia]].

### Tool đọc trả nguyên object, chỉ trừ vài key

Không ai phát hiện, vì không có lỗi; chỉ thấy khi tình cờ đọc log của bên thứ ba. Denylist bỏ quên field mới hoặc field nhạy cảm, và chúng đi theo. Dùng allowlist theo nhóm và theo field, với test khẳng định **tập key trả ra bằng đúng** allowlist, không phải "không chứa key X".

### Quên rằng `.mcp.json` là file chia sẻ

`.mcp.json` chia sẻ qua git theo thiết kế. Đặt secret thẳng vào đó rồi commit thì token nằm luôn trong lịch sử git. Dùng `${API_KEY}` trong file, giá trị để ở môi trường, thêm secret scanner vào pre-commit; server tin cậy mà chỉ một người cần thì để scope `local`/`user`, không phải `project`.

Chiều ngược lại khó thấy hơn: job chạy `claude -p` trên repo lạ gọi một server bạn chưa từng duyệt. Docs ghi rõ ở `claude -p` và Agent SDK, prompt duyệt `.mcp.json` không xuất hiện nên server nạp luôn. Liệt kê server không mong muốn trong `disabledMcpjsonServers`; với tổ chức thì dùng managed MCP (`allowedMcpServers` / `deniedMcpServers`).

### Kết luận "không verify được" sau khi thử đúng một công cụ

Báo cáo có mục "những gì không kiểm được", người đọc tin đó là giới hạn của hệ thống, trong khi thật ra chỉ công cụ đầu tiên hỏng. Mẫu báo cáo nên bắt buộc trường "đã thử: <công cụ> → chết ở <đâu>" cho từng đường, và verifier ([[ag-12-verifier-doc-lap]]) trả `UNVERIFIED` khi trường đó có ít hơn hai đường. Chuyện agent đổi sang headed sau một lần treo rồi giữ luôn (§3.7, luật 1) cùng một gốc: một lần hỏng chưa chẩn đoán bị biến thành quyết định vĩnh viễn. Vì vậy luật headless mặc định, tên session riêng và bước dọn process nằm trong skill kiểm UI, không nằm trong trí nhớ của agent.

---

## 6. Chuyển giao

Level 3 kết thúc ở đây. Bốn bài vừa qua cùng làm một việc: chuyển những gì bạn từng phải **dặn lại** thành thứ được **nạp tự động** — memory ([[ag-06-memory-va-feedback]]), skill ([[ag-07-skill-va-slash-command]]), hook và permission ([[ag-08-hook-va-chan-bang-cau-hinh]]), và giờ là MCP: agent không còn cần bạn copy dữ liệu từ hệ thống ngoài vào chat, nó tự tra.

Nhưng tự tra sinh ra câu hỏi mới: agent đọc được dashboard, lái được trình duyệt, gọi được API — vậy **ai kiểm kết quả nó báo về**? Ở Level 4 bạn sẽ bỏ việc đọc từng dòng code bằng cách định nghĩa "xong" thành lệnh chạy được ([[ag-10-done-criteria-va-gate]]), và dùng chính browser automation vừa dựng để kiểm UI bằng ảnh thay vì bằng chữ ([[ag-13-kiem-ui-bang-anh]]). Luật "một đường hỏng không phải kết luận" ở mục 3.7 sẽ trở thành một trường bắt buộc trong verdict của verifier.

---

## 7. Tóm tắt

- MCP có ba vai: **host** (ứng dụng AI) tạo một **client** cho mỗi **server**; server phơi ra tool, resource, prompt qua JSON-RPC 2.0.
- Agent chỉ biết tool qua `name`, `description`, `inputSchema` — description hứa gì, agent tin nấy.
- **stdio**: host khởi động server, credential từ môi trường, stdout chỉ được chứa JSON-RPC. **Streamable HTTP**: một endpoint, nhiều client, phải kiểm `Origin` và xác thực.
- Auth chọn theo người gọi: một người một máy → API key; nhiều user ngoài → OAuth theo spec (RFC 9728), implement một lần cho mọi client tuân spec.
- Chặn ghi ở ba tầng: tool đọc/ghi tách riêng và allowlist dữ liệu; permission rule `mcp__server__tool` hoặc `enabled_tools`; scope của credential.
- Tool không trả rỗng thay cho "không biết"; rỗng-giả tệ hơn không có tool.
- Browser cho agent: headless mặc định, session/profile riêng, login một lần trong profile riêng, kiểm bằng cold start headless; một công cụ hỏng là tín hiệu đổi đường.
