# Bài 14 — Raft: leader election & log replication

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **ba trạng thái server** trong Raft (follower / candidate / leader) và vòng đời chuyển đổi giữa chúng.
- Hiểu vai trò của **term** (nhiệm kỳ) như một logical clock và **heartbeat** giữ quyền lãnh đạo.
- Mô tả chính xác **leader election**: randomized timeout, RequestVote, luật đa số (majority vote).
- Mô tả **log replication** qua AppendEntries, **Log Matching Property**, cách tính **commitIndex** và **lastApplied**.
- Nắm **safety**: election restriction (chỉ bầu ứng viên có log đủ mới) và vì sao nó bảo đảm không mất committed entry.
- Hiểu **membership change** an toàn bằng joint consensus.
- Nói được **vì sao Raft dễ hiểu hơn Paxos** — đây là mục tiêu thiết kế cốt lõi của nó.

---

## 2. Lý thuyết

### 2.1 Raft giải quyết bài toán gì?

Raft là một thuật toán **consensus**: làm cho một cụm máy (thường 3 hoặc 5) đồng thuận về **một chuỗi lệnh có thứ tự** — gọi là **replicated log** — dù có node chết hay mạng chập chờn. Nếu mọi node áp dụng **cùng một chuỗi lệnh theo cùng thứ tự** vào state machine của mình, chúng sẽ cho ra **cùng một trạng thái**. Đó là mô hình **Replicated State Machine (RSM)**: nền tảng của etcd, Consul, TiKV, CockroachDB, MongoDB (biến thể)...

> Ý tưởng cốt lõi: đừng cố đồng thuận về *trạng thái cuối*; hãy đồng thuận về *chuỗi thao tác*. Log giống nhau ⇒ state giống nhau.

Raft ra đời năm 2014 (Diego Ongaro & John Ousterhout) với một mục tiêu tường minh: **understandability** — dễ hiểu bằng Paxos nhưng dễ dạy, dễ cài đặt đúng hơn nhiều. Nó đạt điều đó bằng cách **phân rã bài toán** thành ba mảnh gần như độc lập: (1) leader election, (2) log replication, (3) safety.

### 2.2 Analogy đời thường: lớp học ghi biên bản

Hình dung một lớp gồm 5 người phải cùng giữ **một cuốn biên bản giống hệt nhau**. Thay vì ai cũng ghi và cãi nhau về thứ tự, lớp bầu ra **một lớp trưởng** (leader). Chỉ lớp trưởng được nhận đề xuất và **đọc to từng dòng theo thứ tự**; các thành viên chỉ việc chép theo. Khi **quá nửa lớp** đã chép xong một dòng, dòng đó được coi là **chính thức (committed)** — không thể xoá.

Nếu lớp trưởng vắng (im lặng quá lâu), người nào **sốt ruột trước** sẽ đứng dậy xin làm lớp trưởng mới, kèm số **"khoá học thứ mấy" (term)** lớn hơn. Ai được **quá nửa** đồng ý thì thành lớp trưởng. Luật vàng: **chỉ bầu người đã chép biên bản đầy đủ nhất** — nếu không, biên bản chính thức có thể bị mất. Toàn bộ Raft nằm trong ẩn dụ này.

### 2.3 Ba trạng thái server & term

Mỗi node tại một thời điểm ở một trong ba trạng thái:

| State | Vai trò | Hành vi chính |
|-------|---------|---------------|
| **Follower** | Bị động | Chỉ trả lời RequestVote & AppendEntries. Không chủ động gì. Khởi đầu ai cũng là follower. |
| **Candidate** | Ứng viên | Xuất hiện khi follower hết election timeout: tự tăng term, bỏ phiếu cho mình, xin phiếu người khác. |
| **Leader** | Lãnh đạo | Node duy nhất nhận request từ client, replicate log, gửi heartbeat. Mỗi term có **tối đa 1** leader. |

**Term** là một số nguyên tăng đơn điệu, đóng vai trò **logical clock** của cả cụm. Mỗi term bắt đầu bằng một cuộc bầu cử. Term giúp phát hiện thông tin cũ: **mọi RPC đều mang term**. Quy tắc thép:
- Nếu một node nhận RPC có `term > currentTerm` của nó ⇒ cập nhật `currentTerm` và **lập tức trở về follower**.
- Nếu nhận RPC có `term < currentTerm` ⇒ **từ chối** (người gửi bị lỗi thời, sẽ tự lùi về follower).

Cơ chế này một mình đã loại bỏ được "leader ma" (một leader cũ bị cô lập rồi quay lại): term của nó nhỏ hơn nên mọi mệnh lệnh bị chối.

<svg viewBox="0 0 700 300" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">State machine của một server Raft</title>
<desc id="st-d">Ba trạng thái follower, candidate, leader và các điều kiện chuyển đổi giữa chúng theo term và số phiếu</desc>
<rect x="40" y="120" width="150" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="147" text-anchor="middle" font-size="15" fill="currentColor">Follower</text>
<text x="115" y="166" text-anchor="middle" font-size="10" fill="currentColor">khởi đầu / bị hạ bậc</text>
<rect x="280" y="20" width="150" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="355" y="47" text-anchor="middle" font-size="15" fill="currentColor">Candidate</text>
<text x="355" y="66" text-anchor="middle" font-size="10" fill="currentColor">đang xin phiếu</text>
<rect x="510" y="120" width="150" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="585" y="147" text-anchor="middle" font-size="15" fill="currentColor">Leader</text>
<text x="585" y="166" text-anchor="middle" font-size="10" fill="currentColor">gửi heartbeat</text>
<path d="M170,120 L320,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>
<text x="215" y="90" text-anchor="middle" font-size="10" fill="currentColor">election timeout:</text>
<text x="215" y="103" text-anchor="middle" font-size="10" fill="currentColor">tăng term, tự bầu</text>
<path d="M420,80 L560,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>
<text x="510" y="92" text-anchor="middle" font-size="10" fill="currentColor">được đa số phiếu</text>
<path d="M355,20 C355,-15 460,-10 460,25 L430,45" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>
<text x="470" y="8" text-anchor="middle" font-size="10" fill="currentColor">timeout: bầu lại</text>
<path d="M330,70 C230,110 190,110 175,135" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>
<text x="240" y="135" text-anchor="middle" font-size="10" fill="currentColor">thấy leader hợp lệ</text>
<path d="M540,175 C400,240 250,215 175,182" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>
<text x="360" y="235" text-anchor="middle" font-size="10" fill="currentColor">phát hiện term lớn hơn: hạ bậc về follower</text>
<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 Leader election chi tiết

Mỗi follower giữ một **election timeout** ngẫu nhiên, thường trong khoảng **150–300 ms**. Mỗi khi nhận được AppendEntries hợp lệ từ leader (heartbeat hoặc log), nó **reset** đồng hồ này. Nếu đồng hồ cạn mà chưa nghe gì từ leader ⇒ nó cho rằng leader đã chết và **khởi động bầu cử**:

1. Tự tăng `currentTerm` lên 1.
2. Chuyển sang **candidate**, bỏ phiếu cho chính mình.
3. Gửi **RequestVote** RPC song song tới tất cả node khác.
4. Chờ kết quả, có ba khả năng:
   - **Thắng**: nhận được phiếu của **đa số** (quá nửa cụm, kể cả phiếu của mình) ⇒ trở thành **leader**, lập tức gửi heartbeat để khẳng định quyền lực.
   - **Có người khác thắng**: nhận AppendEntries từ một node tự xưng leader với `term ≥ currentTerm` ⇒ công nhận, quay về **follower**.
   - **Hoà / không ai đủ đa số** (split vote): hết timeout mà chưa ai thắng ⇒ tăng term, bầu lại.

**Vì sao randomized timeout?** Nếu mọi follower cùng hết giờ một lúc, chúng cùng thành candidate, phiếu bị chia đều ⇒ **split vote** lặp đi lặp lại. Bằng cách cho mỗi node một timeout **ngẫu nhiên khác nhau**, thường chỉ **một** node hết giờ trước, thắng gọn trước khi node khác kịp khởi động. Đây là mẹo đơn giản mà hiệu quả để phá đối xứng — điểm khiến Raft dễ hiểu.

Hình dưới chạy một cuộc bầu cử trong cụm 5 node: mỗi follower có timeout riêng trong khoảng 150–300 ms, leader mới gửi heartbeat mỗi 100 ms (con số tham chiếu ở mục 5). Thời gian được chiếu chậm lại quanh lúc bầu cử.

<auto-anim data-dur="14">
<svg viewBox="0 0 520 344" role="img" aria-labelledby="ds14a-t ds14a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="ds14a-t">Leader election: election timeout ngẫu nhiên, node hết giờ trước thành leader</title><desc id="ds14a-d">Cụm 5 node. Leader S1 term 4 chết lúc t bằng 0. Bốn follower đếm ngược election timeout ngẫu nhiên trong khoảng 150 đến 300 ms: S2 270 ms, S3 160 ms, S4 230 ms, S5 290 ms. S3 hết giờ trước ở 160 ms: tăng term lên 5, thành candidate, tự bỏ phiếu cho mình và gửi RequestVote tới mọi node. S2, S4, S5 thấy term 5 lớn hơn nên cập nhật term và bỏ phiếu cho S3; S1 đã chết không trả lời. S3 có 4 trên 5 phiếu, vượt đa số 3, thành leader term 5 lúc 170 ms và gửi heartbeat ngay rồi mỗi 100 ms; mỗi heartbeat reset đồng hồ của follower nên không ai hết giờ nữa.</desc><defs><marker id="ds14a-ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs><text x="8" y="20" font-size="13" fill="currentColor" font-weight="700">Thanh: election timeout còn lại · T = term</text><rect x="8" y="34" width="178" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/><text x="18" y="56" font-size="14" font-weight="700" fill="currentColor">S1</text><rect x="8" y="78" width="178" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/><text x="18" y="100" font-size="14" font-weight="700" fill="currentColor">S2</text><rect x="205" y="83" width="270" height="24" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"/><rect x="8" y="122" width="178" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/><text x="18" y="144" font-size="14" font-weight="700" fill="currentColor">S3</text><rect x="205" y="127" width="160" height="24" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5843;0.5857;1.0000" values="1;1;0;0"/></rect><rect x="8" y="166" width="178" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/><text x="18" y="188" font-size="14" font-weight="700" fill="currentColor">S4</text><rect x="205" y="171" width="230" height="24" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"/><rect x="8" y="210" width="178" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.4"/><text x="18" y="232" font-size="14" font-weight="700" fill="currentColor">S5</text><rect x="205" y="215" width="290" height="24" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"/><text x="50" y="56" font-size="13" fill="currentColor" font-weight="700" opacity="0">leader<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1129;0.1143;1.0000" values="1;1;0;0"/></text><text x="50" y="56" font-size="13" fill="currentColor" opacity="0">✗ đã chết<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.1157;1.0000" values="0;0;1;1"/></text><text x="178" y="56" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T4<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;1.0000" values="1;1"/></text><text x="211" y="56" font-size="13" fill="currentColor" opacity="0">✗ ngừng gửi heartbeat<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.1157;1.0000" values="0;0;1;1"/></text><text x="211" y="56" font-size="13" fill="currentColor" opacity="0">gửi heartbeat (term 4)<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1129;0.1143;1.0000" values="1;1;0;0"/></text><text x="50" y="100" font-size="13" fill="currentColor" opacity="0">follower<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;1.0000" values="1;1"/></text><text x="178" y="100" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T4<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4771;0.4786;1.0000" values="1;1;0;0"/></text><text x="178" y="100" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T5<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4786;0.4800;1.0000" values="0;0;1;1"/></text><text x="50" y="188" font-size="13" fill="currentColor" opacity="0">follower<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;1.0000" values="1;1"/></text><text x="178" y="188" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T4<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4771;0.4786;1.0000" values="1;1;0;0"/></text><text x="178" y="188" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T5<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4786;0.4800;1.0000" values="0;0;1;1"/></text><text x="50" y="232" font-size="13" fill="currentColor" opacity="0">follower<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;1.0000" values="1;1"/></text><text x="178" y="232" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T4<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4771;0.4786;1.0000" values="1;1;0;0"/></text><text x="178" y="232" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T5<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4786;0.4800;1.0000" values="0;0;1;1"/></text><text x="50" y="144" font-size="13" fill="currentColor" opacity="0">follower<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3700;0.3714;1.0000" values="1;1;0;0"/></text><text x="50" y="144" font-size="13" fill="currentColor" font-weight="700" opacity="0">candidate<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3714;0.3729;0.5843;0.5857;1.0000" values="0;0;1;1;0;0"/></text><text x="50" y="144" font-size="13" fill="currentColor" font-weight="700" opacity="0">leader<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.5871;1.0000" values="0;0;1;1"/></text><text x="178" y="144" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T4<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3700;0.3714;1.0000" values="1;1;0;0"/></text><text x="178" y="144" text-anchor="end" font-size="13" fill="currentColor" opacity="0">T5<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3714;0.3729;1.0000" values="0;0;1;1"/></text><rect x="205" y="83" width="270" height="24" rx="3" fill="#3b82f6" fill-opacity="0.45"><animate attributeName="width" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.4786;0.5857;0.6071;0.6086;0.7095;0.7110;0.8119;0.8133;0.8929;0.9143;0.9157;1.0000" values="270;270;110;105;100;79.1;270;170;270;170;270;190.9;190.9;270;270"/></rect><text x="211" y="100" font-size="13" fill="currentColor">270 ms</text><rect x="205" y="171" width="230" height="24" rx="3" fill="#3b82f6" fill-opacity="0.45"><animate attributeName="width" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.4786;0.5857;0.6071;0.6086;0.7095;0.7110;0.8119;0.8133;0.8929;0.9143;0.9157;1.0000" values="230;230;70;65;60;39.1;230;130;230;130;230;150.9;150.9;230;230"/></rect><text x="211" y="188" font-size="13" fill="currentColor">230 ms</text><rect x="205" y="215" width="290" height="24" rx="3" fill="#3b82f6" fill-opacity="0.45"><animate attributeName="width" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.4786;0.5857;0.6071;0.6086;0.7095;0.7110;0.8119;0.8133;0.8929;0.9143;0.9157;1.0000" values="290;290;130;125;120;99.1;290;190;290;190;290;210.9;210.9;290;290"/></rect><text x="211" y="232" font-size="13" fill="currentColor">290 ms</text><rect x="205" y="127" width="160" height="24" rx="3" fill="#3b82f6" fill-opacity="0.45"><animate attributeName="width" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.3729;1.0000" values="160;160;0;0;0"/></rect><rect x="205" y="127" width="0" height="24" rx="3" fill="#f59e0b" fill-opacity="0.6"><animate attributeName="width" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3700;0.3714;0.5857;0.5871;1.0000" values="0;0;160;150;0;0"/></rect><text x="211" y="144" font-size="13" fill="currentColor" opacity="0">160 ms<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5843;0.5857;1.0000" values="1;1;0;0"/></text><text x="373" y="144" font-size="13" fill="currentColor" opacity="0">phiếu 1/5<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3714;0.3729;0.5629;0.5643;1.0000" values="0;0;1;1;0;0"/></text><text x="373" y="144" font-size="13" fill="currentColor" font-weight="700" opacity="0">phiếu 4/5 ≥ 3<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5643;0.5657;0.5843;0.5857;1.0000" values="0;0;1;1;0;0"/></text><rect x="205" y="127" width="300" height="24" rx="3" fill="#10b981" fill-opacity="0.16" opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.5871;1.0000" values="0;0;1;1"/></rect><text x="211" y="144" font-size="13" fill="currentColor" opacity="0">gửi heartbeat mỗi 100 ms<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.5871;1.0000" values="0;0;1;1"/></text><circle cx="194" cy="139.0" r="5" fill="#f59e0b" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3786;0.4786;1.0000" values="139;139;51;51"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3771;0.3786;0.4571;0.4786;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#f59e0b" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3786;0.4786;1.0000" values="139;139;95;95"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3771;0.3786;0.4786;0.4800;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#f59e0b" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3786;0.4786;1.0000" values="139;139;183;183"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3771;0.3786;0.4786;0.4800;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#f59e0b" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3786;0.4786;1.0000" values="139;139;227;227"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3771;0.3786;0.4786;0.4800;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="95.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4857;0.5643;1.0000" values="95;95;139;139"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4843;0.4857;0.5643;0.5657;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="183.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4857;0.5643;1.0000" values="183;183;139;139"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4843;0.4857;0.5643;0.5657;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="227.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4857;0.5643;1.0000" values="227;227;139;139"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4843;0.4857;0.5643;0.5657;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.6071;1.0000" values="139;139;95;95"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5843;0.5857;0.6071;0.6086;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.6071;1.0000" values="139;139;183;183"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5843;0.5857;0.6071;0.6086;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.6071;1.0000" values="139;139;227;227"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5843;0.5857;0.6071;0.6086;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6881;0.7095;1.0000" values="139;139;95;95"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6867;0.6881;0.7095;0.7110;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6881;0.7095;1.0000" values="139;139;183;183"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6867;0.6881;0.7095;0.7110;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6881;0.7095;1.0000" values="139;139;227;227"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.6867;0.6881;0.7095;0.7110;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7905;0.8119;1.0000" values="139;139;95;95"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7890;0.7905;0.8119;0.8133;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7905;0.8119;1.0000" values="139;139;183;183"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7890;0.7905;0.8119;0.8133;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7905;0.8119;1.0000" values="139;139;227;227"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.7890;0.7905;0.8119;0.8133;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8929;0.9143;1.0000" values="139;139;95;95"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8914;0.8929;0.9143;0.9157;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8929;0.9143;1.0000" values="139;139;183;183"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8914;0.8929;0.9143;0.9157;1.0000" values="0;0;1;1;0;0"/></circle><circle cx="194" cy="139.0" r="5" fill="#10b981" opacity="0"><animate attributeName="cy" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8929;0.9143;1.0000" values="139;139;227;227"/><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.8914;0.8929;0.9143;0.9157;1.0000" values="0;0;1;1;0;0"/></circle><line x1="40" y1="266" x2="500" y2="266" stroke="currentColor" stroke-opacity="0.6"/><line x1="40.0" y1="262" x2="40.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="40.0" y="286" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">0</text><line x1="132.0" y1="262" x2="132.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="132.0" y="286" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">100</text><line x1="224.0" y1="262" x2="224.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="224.0" y="286" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">200</text><line x1="316.0" y1="262" x2="316.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="316.0" y="286" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">300</text><line x1="408.0" y1="262" x2="408.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="408.0" y="286" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.8">400</text><line x1="500.0" y1="262" x2="500.0" y2="270" stroke="currentColor" stroke-opacity="0.6"/><text x="514.0" y="286" text-anchor="end" font-size="13" fill="currentColor" opacity="0.8">500 ms</text><circle cx="187.2" cy="266" r="4" fill="#f59e0b"/><circle cx="196.4" cy="266" r="3.5" fill="#10b981"/><circle cx="288.4" cy="266" r="3.5" fill="#10b981"/><circle cx="380.4" cy="266" r="3.5" fill="#10b981"/><circle cx="472.4" cy="266" r="3.5" fill="#10b981"/><path d="M0,-12 L5,-20 L-5,-20 Z" fill="currentColor" transform="translate(40.0,266)"><animateTransform attributeName="transform" type="translate" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.4786;0.5857;0.8929;1.0000" values="40.0 266;40.0 266;187.2 266;191.8 266;196.4 266;472.4 266;472.4 266"/></path><line x1="0" y1="256" x2="0" y2="270" stroke="currentColor" stroke-width="2" transform="translate(40.0,0)"><animateTransform attributeName="transform" type="translate" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.3714;0.4786;0.5857;0.8929;1.0000" values="40.0 0;40.0 0;187.2 0;191.8 0;196.4 0;472.4 0;472.4 0"/></line><text x="8" y="314" font-size="13" fill="currentColor" opacity="0">Trước đó: S1 là leader term 4, heartbeat của S1<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1129;0.1143;1.0000" values="1;1;0;0"/></text><text x="8" y="334" font-size="13" fill="currentColor" opacity="0">liên tục reset đồng hồ của các follower.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1129;0.1143;1.0000" values="1;1;0;0"/></text><text x="8" y="314" font-size="13" fill="currentColor" opacity="0">t = 0: leader S1 chết, heartbeat ngừng.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.1157;0.3700;0.3714;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="334" font-size="13" fill="currentColor" opacity="0">Mỗi follower đếm ngược timeout riêng (150–300 ms).<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.1143;0.1157;0.3700;0.3714;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="314" font-size="13" fill="currentColor" opacity="0">160 ms: S3 hết giờ trước: term 4 → 5, candidate,<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3714;0.3729;0.4771;0.4786;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="334" font-size="13" fill="currentColor" opacity="0">tự bầu mình, gửi RequestVote tới mọi node.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.3714;0.3729;0.4771;0.4786;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="314" font-size="13" fill="currentColor" opacity="0">S2, S4, S5 thấy term 5 > 4: cập nhật term, bầu S3.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4786;0.4800;0.5843;0.5857;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="334" font-size="13" fill="currentColor" opacity="0">S1 chết không trả lời. S3 có 4/5 ≥ đa số 3.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.4786;0.4800;0.5843;0.5857;1.0000" values="0;0;1;1;0;0"/></text><text x="8" y="314" font-size="13" fill="currentColor" opacity="0">170 ms: S3 thành leader term 5, gửi heartbeat ngay<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.5871;1.0000" values="0;0;1;1"/></text><text x="8" y="334" font-size="13" fill="currentColor" opacity="0">rồi mỗi 100 ms; đồng hồ follower reset, không ai hết giờ.<animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="linear" keyTimes="0.0000;0.5857;0.5871;1.0000" values="0;0;1;1"/></text></svg>
</auto-anim>

**Điều kiện cấp phiếu** (rất quan trọng cho safety, xem 2.7): một node chỉ bỏ phiếu cho candidate khi (a) chưa bỏ phiếu cho ai khác trong term này (**mỗi node 1 phiếu/term**), và (b) **log của candidate ít nhất mới bằng log của mình** (up-to-date). Luật (a) bảo đảm mỗi term tối đa 1 leader (không thể có hai người cùng gom được quá nửa từ cùng một tập phiếu).

### 2.5 Vì sao là "đa số" (majority / quorum)?

Đa số của N node là `⌊N/2⌋ + 1`. Với cụm 5 node, đa số là 3; chịu được **2** node chết. Với 3 node, đa số là 2; chịu được **1** chết. Sức mạnh của quorum: **hai tập đa số bất kỳ luôn giao nhau ở ít nhất một node**. Nhờ giao nhau này, một entry đã committed (được đa số lưu) chắc chắn xuất hiện trong quorum của cuộc bầu cử kế tiếp ⇒ không thể "biến mất". Đây cũng là lý do cụm Raft nên có **số node lẻ**: 4 node vẫn chỉ chịu 1 lỗi như 3 node nhưng đắt hơn và dễ split hơn.

### 2.6 Log replication chi tiết

Mỗi entry trong log gồm: **index** (vị trí), **term** (term lúc leader tạo ra nó), và **command** (lệnh cho state machine). Client chỉ gửi request tới **leader**. Luồng:

1. Leader **append** entry mới vào log của chính nó (chưa committed).
2. Leader gửi **AppendEntries** RPC (kèm entry) tới tất cả follower — song song.
3. Khi entry đã được **replicate lên đa số** (leader + đủ follower), leader **commit** entry: tăng `commitIndex`.
4. Leader **apply** entry vào state machine, trả kết quả cho client.
5. Ở các heartbeat/AppendEntries sau, leader báo `commitIndex` mới; follower thấy vậy cũng **apply** phần đã committed vào state machine của chúng (`lastApplied` đuổi theo `commitIndex`).

Hai chỉ số cần phân biệt rạch ròi:

| Chỉ số | Ý nghĩa |
|--------|---------|
| **commitIndex** | Index cao nhất được biết là đã **committed** (đã replicate lên đa số, an toàn, không bao giờ mất). |
| **lastApplied** | Index cao nhất đã được **apply** vào state machine cục bộ. Luôn `lastApplied ≤ commitIndex`. |

<svg viewBox="0 0 700 260" role="img" aria-labelledby="lg-t lg-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="lg-t">Replicated log của leader và các follower</title>
<desc id="lg-d">Log của leader và hai follower với các entry gồm index và term, phần đã committed tô đậm còn phần chưa committed nhạt hơn</desc>
<text x="20" y="45" font-size="12" fill="currentColor">Leader</text>
<text x="20" y="115" font-size="12" fill="currentColor">Follower 1</text>
<text x="20" y="185" font-size="12" fill="currentColor">Follower 2</text>
<text x="120" y="18" text-anchor="middle" font-size="10" fill="currentColor">idx 1</text>
<text x="205" y="18" text-anchor="middle" font-size="10" fill="currentColor">idx 2</text>
<text x="290" y="18" text-anchor="middle" font-size="10" fill="currentColor">idx 3</text>
<text x="375" y="18" text-anchor="middle" font-size="10" fill="currentColor">idx 4</text>
<text x="460" y="18" text-anchor="middle" font-size="10" fill="currentColor">idx 5</text>
<rect x="90" y="25" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="120" y="47" text-anchor="middle" font-size="11" fill="currentColor">t1 x=1</text>
<rect x="175" y="25" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="205" y="47" text-anchor="middle" font-size="11" fill="currentColor">t1 y=2</text>
<rect x="260" y="25" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="290" y="47" text-anchor="middle" font-size="11" fill="currentColor">t2 x=3</text>
<rect x="345" y="25" width="60" height="35" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="375" y="47" text-anchor="middle" font-size="11" fill="currentColor">t3 z=9</text>
<rect x="430" y="25" width="60" height="35" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="3 2"/><text x="460" y="47" text-anchor="middle" font-size="11" fill="currentColor">t3 y=7</text>
<rect x="90" y="95" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="120" y="117" text-anchor="middle" font-size="11" fill="currentColor">t1 x=1</text>
<rect x="175" y="95" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="205" y="117" text-anchor="middle" font-size="11" fill="currentColor">t1 y=2</text>
<rect x="260" y="95" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="290" y="117" text-anchor="middle" font-size="11" fill="currentColor">t2 x=3</text>
<rect x="345" y="95" width="60" height="35" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="375" y="117" text-anchor="middle" font-size="11" fill="currentColor">t3 z=9</text>
<rect x="90" y="165" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="120" y="187" text-anchor="middle" font-size="11" fill="currentColor">t1 x=1</text>
<rect x="175" y="165" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="205" y="187" text-anchor="middle" font-size="11" fill="currentColor">t1 y=2</text>
<rect x="260" y="165" width="60" height="35" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="290" y="187" text-anchor="middle" font-size="11" fill="currentColor">t2 x=3</text>
<line x1="325" y1="225" x2="325" y2="245" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="242" text-anchor="middle" font-size="11" fill="#10b981">committed (đa số đã có, idx≤3)</text>
<text x="470" y="242" text-anchor="middle" font-size="11" fill="#f59e0b">chưa committed</text>
</svg>

### 2.7 Log Matching Property & consistency check

Raft duy trì một bất biến mạnh gọi là **Log Matching Property**:
- Nếu hai log có một entry **cùng index và cùng term**, thì entry đó **giống hệt nhau** (cùng command).
- Và **mọi entry trước nó** trong hai log cũng giống hệt nhau.

Bất biến này được giữ nhờ một **consistency check** đơn giản gắn trong mỗi AppendEntries: RPC mang theo `prevLogIndex` và `prevLogTerm` — index/term của entry **ngay trước** các entry mới. Follower chỉ chấp nhận nếu log của nó **có một entry khớp** ở `prevLogIndex` với đúng `prevLogTerm`. Nếu không khớp ⇒ **từ chối**. Leader nhận từ chối sẽ **lùi `nextIndex`** cho follower đó và thử lại với entry cũ hơn, cứ thế cho tới điểm hai log trùng nhau, rồi **ghi đè** phần lệch của follower bằng log của leader. Kết quả: log follower **hội tụ** về đúng bản của leader.

Điểm mấu chốt về hướng ép buộc: trong Raft, **leader không bao giờ sửa hay xoá log của chính nó**; nó chỉ **append**. Mọi bất đồng đều được giải quyết bằng cách bắt follower **giống leader**. Đây là một quyết định thiết kế làm Raft đơn giản hơn hẳn: dòng chảy log **một chiều, leader → follower**.

### 2.8 Safety: Election Restriction

Một câu hỏi hóc búa: nếu một leader mới thiếu vài entry đã committed thì sao? Nó có thể ghi đè mất committed entry ⇒ **thảm hoạ** (client đã được báo thành công mà dữ liệu biến mất). Raft chặn điều này bằng **Election Restriction**:

> Một node **chỉ bỏ phiếu** cho candidate nếu log của candidate **"up-to-date" ít nhất bằng** log của chính nó. So sánh: **term của entry cuối lớn hơn** thì mới hơn; nếu bằng term thì **log dài hơn (index cuối lớn hơn)** mới hơn.

Vì candidate phải gom **đa số** phiếu, và committed entry đã nằm trên **đa số** node, hai tập đa số này **giao nhau**. Node giao nhau đó sẽ **từ chối** bỏ phiếu cho bất kỳ candidate nào thiếu committed entry ⇒ **candidate thiếu log không thể thắng**. Suy ra **Leader Completeness Property**: mọi entry đã committed ở các term trước **chắc chắn có mặt** trong log của mọi leader tương lai. Đây là trái tim của tính đúng đắn của Raft.

Một hệ quả tinh tế (**Figure 8** trong paper gốc): leader **không được commit entry của các term cũ chỉ vì nó đã replicate lên đa số**. Nó chỉ được commit gián tiếp bằng cách **commit một entry của term hiện tại** (theo Log Matching, việc đó kéo theo commit mọi entry trước). Nếu bỏ qua điều này, một entry cũ tưởng đã an toàn có thể bị ghi đè bởi một leader khác. Cài đặt thực tế thường xử lý bằng cách leader mới **append một no-op entry** đầu term để nhanh chóng commit phần thừa kế.

### 2.9 Vì sao Raft dễ hiểu hơn Paxos?

| Khía cạnh | Multi-Paxos (cổ điển) | Raft |
|-----------|------------------------|------|
| Mô hình tinh thần | Trừu tượng, mô tả từng lệnh độc lập; ghép thành "Multi-Paxos" thì mơ hồ, nhiều biến thể | **Strong leader** rõ ràng: mọi thứ chảy qua leader |
| Hướng log | Entry có thể đến bất kỳ đâu, phải điền chỗ trống | Chỉ **append**, dòng một chiều leader → follower |
| Bầu cử | Không tách bạch với việc ghi giá trị | **Tách riêng** thành module leader election gọn gàng |
| Thay đổi thành viên | Không nêu rõ trong bản gốc | **Joint consensus** được đặc tả tường minh |
| Kiểm chứng | Khó, nhiều "khoảng trống" phải tự lấp | Có đặc tả đầy đủ + đã formally verified (TLA+) |

Triết lý của Raft là **decomposition + giảm số trạng thái phải suy nghĩ**: tách bài toán thành election / replication / safety, dùng strong leader để loại bỏ đa số trường hợp đồng thời, và dùng randomized timeout thay cho lý luận phức tạp về đối xứng. Cùng một sự đảm bảo đúng đắn như Paxos, nhưng **ít khái niệm cùng lúc trong đầu** — đó chính là mục tiêu "understandability" mà tên bài báo nhấn mạnh: *"In Search of an Understandable Consensus Algorithm"*.

---

## 3. Membership change: Joint Consensus

Đổi tập thành viên (thêm/bớt node) khi cụm đang chạy là nguy hiểm: nếu chuyển cấu hình cũ `Cold` sang mới `Cnew` **trực tiếp**, có thể tồn tại một khoảnh khắc mà **hai đa số rời rạc** (một theo Cold, một theo Cnew) bầu ra **hai leader cùng term** ⇒ **split-brain**.

Raft giải bằng **joint consensus** — một cấu hình chuyển tiếp `C_{old,new}` mà trong đó **mọi quyết định cần đa số của CẢ hai** Cold và Cnew:

1. Leader nhận yêu cầu đổi cấu hình, append entry `C_{old,new}` vào log và replicate. Từ lúc entry này vào log của một node, node đó **dùng ngay** cấu hình mới nhất trong log (kể cả khi chưa committed).
2. Khi `C_{old,new}` được **committed**, không cuộc bầu cử hay commit nào có thể xảy ra nếu thiếu đa số của cả hai tập ⇒ **không thể có hai leader** ở hai cấu hình.
3. Leader append tiếp entry `Cnew` và replicate. Khi `Cnew` committed, cụm hoàn toàn theo cấu hình mới; các node không còn trong Cnew tự ngừng.

Nhờ luôn có giao đa số giữa các giai đoạn, **không lúc nào tồn tại hai đa số độc lập**. Nhiều cài đặt hiện đại (etcd, khuyến nghị trong luận án của Ongaro) dùng phiên bản đơn giản hơn — **single-server change** (mỗi lần chỉ thêm/bớt đúng một node) — vì thay đổi một node không thể tạo hai đa số rời nhau, nên bỏ được joint consensus cho phần lớn tình huống vận hành thực tế.

---

## 4. Trong thực tế: cấu hình một cụm Raft (etcd)

etcd là hiện thân phổ biến nhất của Raft (là "bộ não" của Kubernetes — lưu toàn bộ cluster state). Ví dụ dựng cụm 3 node:

```bash
# Node 1 — mỗi node biết peer của nhau qua initial-cluster
etcd --name node1 \
  --initial-advertise-peer-urls http://10.0.0.1:2380 \
  --listen-peer-urls http://10.0.0.1:2380 \
  --listen-client-urls http://10.0.0.1:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://10.0.0.1:2379 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-cluster node1=http://10.0.0.1:2380,node2=http://10.0.0.2:2380,node3=http://10.0.0.3:2380 \
  --initial-cluster-state new \
  --election-timeout 1000 \
  --heartbeat-interval 100
```

Hai tham số quan trọng ánh xạ thẳng vào lý thuyết:
- `--heartbeat-interval 100` (ms): leader gửi heartbeat mỗi 100 ms. Nên **nhỏ hơn nhiều** so với election timeout.
- `--election-timeout 1000` (ms): follower chờ tối đa ~1s không nghe leader thì mở bầu cử. Khuyến nghị của etcd: `election-timeout ≈ 10 × heartbeat-interval`, và phải **lớn hơn round-trip time** giữa các node để tránh bầu cử oan khi mạng hơi trễ.

Kiểm tra ai đang là **leader** và sức khoẻ cụm:

```bash
# Xem vai trò từng thành viên: cột IS LEADER cho biết leader hiện tại
etcdctl --endpoints=10.0.0.1:2379,10.0.0.2:2379,10.0.0.3:2379 \
  endpoint status --write-out=table

# Ghi/đọc: mọi ghi đều được leader replicate qua Raft rồi mới trả OK
etcdctl put /service/config "v2"     # linearizable write qua Raft log
etcdctl get /service/config          # đọc consistent (mặc định qua quorum)
```

Bài học vận hành: nếu cụm mất quá bán node (ví dụ 3 node chết 2), **quorum vỡ** ⇒ không bầu được leader ⇒ cụm **ngừng nhận ghi** (chọn C và P, hy sinh A — đúng như CAP dạy). Đây là hành vi *đúng*: thà dừng còn hơn phân đôi dữ liệu.

---

## 5. Ví dụ tình huống & con số

**Tình huống:** cụm 5 node (S1..S5), S1 là leader ở term 4. Client gửi `SET x=10`.
- S1 append entry `{index:8, term:4, cmd:"x=10"}`, gửi AppendEntries tới S2..S5.
- S2, S3 ack nhanh (RTT ~2 ms). Giờ entry có trên **S1,S2,S3 = 3/5 = đa số** ⇒ S1 **commit** index 8, apply, trả OK cho client. Tổng độ trễ ghi ≈ 1 round-trip tới follower nhanh thứ hai (~vài ms), **không** cần chờ S4,S5.
- Ngay sau đó S1 chết. Bầu cử mở: S4 (log cũ, thiếu index 8) làm candidate xin phiếu. S2/S3 **từ chối** vì log của S4 không up-to-date (thiếu entry term 4). S2 làm candidate, có index 8 ⇒ được S3 + tự bầu = đa số ⇒ **S2 thành leader term 5**, giữ nguyên `x=10`. **Committed entry không mất** — đúng như Election Restriction bảo đảm.

Con số tham chiếu thực tế: heartbeat 100 ms + election timeout ~150–300 ms (thư viện) đến ~1000 ms (etcd trên WAN); thời gian **mất leader → có leader mới** thường trong khoảng **một vài election timeout**, tức dưới ~1–2 giây với cấu hình LAN điển hình.

---

## 6. Tóm tắt
- Raft = consensus qua mô hình **Replicated State Machine**: đồng thuận về **chuỗi lệnh (log)**, không phải trạng thái cuối.
- **Ba trạng thái**: follower (bị động) → candidate (xin phiếu khi hết election timeout) → leader (duy nhất nhận ghi, gửi heartbeat). **Term** là logical clock; term lớn hơn luôn thắng, buộc node cũ hạ bậc.
- **Election**: randomized timeout phá đối xứng, thắng khi được **đa số** phiếu; mỗi node 1 phiếu/term ⇒ tối đa 1 leader/term.
- **Replication**: leader append → AppendEntries → khi lên **đa số** thì **commit** (`commitIndex`), rồi **apply** (`lastApplied`). **Log Matching** + consistency check (`prevLogIndex/prevLogTerm`) giữ log đồng nhất; leader chỉ ép follower giống mình.
- **Safety = Election Restriction**: chỉ bầu candidate có log up-to-date ⇒ **Leader Completeness**, committed entry không bao giờ mất (nhờ giao nhau của các quorum).
- **Membership change** an toàn bằng **joint consensus** (`C_{old,new}` cần đa số cả hai) hoặc single-server change; tránh split-brain khi đổi cấu hình.
- Raft **dễ hiểu hơn Paxos** nhờ decomposition (election / replication / safety), strong leader và dòng log một chiều — cùng đảm bảo đúng đắn, ít khái niệm phải giữ trong đầu.

> **Bài tiếp theo (Bài 15):** từ consensus lý thuyết bước sang **etcd/ZooKeeper trong thực chiến** — coordination primitives (lock phân tán, leader election cho app, service discovery, watch) xây trên nền Raft/ZAB.
