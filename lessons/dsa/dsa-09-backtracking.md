# Backtracking

Backtracking là **kỹ thuật vét cạn có tổ chức**: ta xây lời giải *từng bước*, mỗi bước thử một lựa chọn; nếu nhánh đó dẫn tới bế tắc (hoặc vi phạm ràng buộc) thì **quay lui** — gỡ bỏ lựa chọn vừa rồi — và thử lựa chọn khác. Khác với brute force "sinh hết rồi lọc", backtracking **bỏ sớm những nhánh không thể tốt** (pruning), nên dù bản chất là mũ/giai thừa, nó vẫn chạy được trên nhiều bài kích thước vừa.

Đây là một trong những chủ đề bị "ghét" nhất khi mới học, nhưng lại là chủ đề **dễ ăn điểm nhất khi phỏng vấn** — vì gần như mọi bài backtracking đều chung một bộ khung. Nắm chắc khung choose–explore–unchoose, biết nhận diện dạng bài, biết cắt nhánh, là bạn giải được hầu hết. Bài này đi *rất kĩ* qua decision tree, template, 9 dạng bài kinh điển, 3 bài mẫu giải chi tiết, và cách phân biệt backtracking với DP.

> Ghi nhớ: Dấu hiệu "thấy là nghĩ ngay tới backtracking": đề yêu cầu **"liệt kê tất cả"**, **"tìm mọi tổ hợp/hoán vị/cách"**, **"sinh ra toàn bộ cấu hình hợp lệ"**, hoặc không gian nghiệm có dạng **cây quyết định** và `n` nhỏ (thường `n ≤ 20`).

## 1. Trực giác & khi nào dùng

### 1.1. Decision tree — xương sống của mọi bài

Hãy hình dung bài toán như một **cây quyết định (decision tree)**: gốc là trạng thái rỗng, mỗi cạnh là một lựa chọn, mỗi node là một trạng thái dở dang, và mỗi **lá** là một ứng viên lời giải. Backtracking chính là **DFS trên cái cây này** — đi sâu xuống một nhánh, chạm lá thì ghi nhận, rồi lùi lại để thử nhánh kế.

Ví dụ sinh tập con của `[1, 2, 3]`. Tại mỗi phần tử ta có 2 lựa chọn: *lấy* hoặc *không lấy*. Cây nhị phân:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây quyết định sinh tập con của [1,2,3]</title>
  <desc>Cây nhị phân ba tầng: tại mỗi phần tử rẽ hai nhánh lấy hoặc bỏ. Gốc rỗng, ba mức cho phần tử 1, 2, 3, tổng cộng tám lá tương ứng tám tập con (2 mũ 3). Backtracking là duyệt DFS trên cây này.</desc>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M360 44 L180 104"/>
    <path d="M360 44 L540 104"/>
    <path d="M180 116 L96 176"/>
    <path d="M180 116 L264 176"/>
    <path d="M540 116 L456 176"/>
    <path d="M540 116 L624 176"/>
    <path d="M96 188 L54 252"/>
    <path d="M96 188 L138 252"/>
    <path d="M264 188 L222 252"/>
    <path d="M264 188 L306 252"/>
    <path d="M456 188 L414 252"/>
    <path d="M456 188 L498 252"/>
    <path d="M624 188 L582 252"/>
    <path d="M624 188 L666 252"/>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.7">
    <text x="252" y="78">lấy 1</text>
    <text x="430" y="78">bỏ 1</text>
    <text x="118" y="150">lấy 2</text>
    <text x="218" y="150">bỏ 2</text>
    <text x="478" y="150">lấy 2</text>
    <text x="578" y="150">bỏ 2</text>
  </g>
  <g font-size="9" fill="currentColor" opacity="0.55">
    <text x="58" y="226">l3</text><text x="116" y="226">b3</text>
    <text x="226" y="226">l3</text><text x="284" y="226">b3</text>
    <text x="418" y="226">l3</text><text x="476" y="226">b3</text>
    <text x="586" y="226">l3</text><text x="644" y="226">b3</text>
  </g>
  <g font-size="11" text-anchor="middle">
    <g><rect x="338" y="30" width="44" height="24" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="360" y="46" fill="currentColor">[ ]</text></g>
    <g><rect x="158" y="102" width="44" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="180" y="118" fill="currentColor">[1]</text></g>
    <g><rect x="518" y="102" width="44" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="540" y="118" fill="currentColor">[ ]</text></g>
    <g><rect x="70" y="174" width="52" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="96" y="190" fill="currentColor">[1,2]</text></g>
    <g><rect x="242" y="174" width="44" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="264" y="190" fill="currentColor">[1]</text></g>
    <g><rect x="434" y="174" width="44" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="456" y="190" fill="currentColor">[2]</text></g>
    <g><rect x="602" y="174" width="44" height="24" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="624" y="190" fill="currentColor">[ ]</text></g>
  </g>
  <g font-size="10.5" text-anchor="middle">
    <g><rect x="22" y="250" width="64" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="54" y="266" fill="currentColor">[1,2,3]</text></g>
    <g><rect x="106" y="250" width="56" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="134" y="266" fill="currentColor">[1,2]</text></g>
    <g><rect x="190" y="250" width="56" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="218" y="266" fill="currentColor">[1,3]</text></g>
    <g><rect x="282" y="250" width="44" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="304" y="266" fill="currentColor">[1]</text></g>
    <g><rect x="382" y="250" width="56" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="410" y="266" fill="currentColor">[2,3]</text></g>
    <g><rect x="474" y="250" width="44" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="496" y="266" fill="currentColor">[2]</text></g>
    <g><rect x="558" y="250" width="44" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="580" y="266" fill="currentColor">[3]</text></g>
    <g><rect x="642" y="250" width="44" height="24" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="664" y="266" fill="currentColor">[ ]</text></g>
  </g>
  <text x="360" y="306" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.85">8 lá = 2³ tập con — backtracking là DFS đi hết các nhánh, mỗi lá ghi nhận đúng một lần</text>
  <text x="360" y="330" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">mỗi tầng = một phần tử · rẽ trái = lấy · rẽ phải = bỏ</text>
</svg>

Mỗi đường đi từ gốc xuống lá là một tập con. Backtracking đi hết các đường đó *mà không bao giờ sinh thừa* — đi xong nhánh trái lại quay lui đúng một bước rồi rẽ phải.

### 1.2. Vì sao "choose – explore – unchoose"?

Cốt lõi là ta **dùng chung một biến trạng thái** `path` (đường đi hiện tại) cho toàn bộ cây thay vì copy ở mỗi node — nhờ vậy tiết kiệm bộ nhớ. Nhưng dùng chung thì sau khi đi sâu xong phải **trả lại trạng thái như cũ**, nếu không nhánh sau sẽ "dính" rác của nhánh trước. Đó là lý do mọi `choose` (thêm vào path) đều phải có một `unchoose` (gỡ ra) đối xứng.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 230" role="img" aria-labelledby="ds9-undo-t ds9-undo-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds9-undo-t">Choose → explore → unchoose</title>
<desc id="ds9-undo-d">Một path cố định: [1], [1,2], pop về [1], rồi [1,3]. Giá trị 2 biến mất hẳn sau pop. Nếu quên pop, nhánh sau sai thành [1,2,3].</desc>
<defs><marker id="ds9-undo-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" text-anchor="middle" font-size="15" fill="currentColor">Choose → explore → unchoose</text>
<text x="260" y="60" text-anchor="middle" font-size="14" fill="currentColor">path dùng chung; nums=[1,2,3]</text><text x="65" y="124" text-anchor="middle" font-size="13" fill="currentColor">path</text><rect x="145" y="100" width="60" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="215" y="100" width="60" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="285" y="100" width="60" height="40" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/>
<g data-step="1" data-until="1"><text x="175" y="126" text-anchor="middle" font-size="16" fill="currentColor">1</text><text x="260" y="185" text-anchor="middle" font-size="13" fill="currentColor">Trạng thái ban đầu</text></g>
<g data-step="2" data-until="2"><text x="175" y="126" text-anchor="middle" font-size="16" fill="currentColor">1</text><text x="245" y="126" text-anchor="middle" font-size="16" fill="currentColor">2</text><text x="260" y="185" text-anchor="middle" font-size="13" fill="currentColor">Choose 2 → explore nhánh 2</text></g>
<g data-step="3" data-until="3"><text x="175" y="126" text-anchor="middle" font-size="16" fill="currentColor">1</text><text x="260" y="185" text-anchor="middle" font-size="13" fill="currentColor">Unchoose: pop 2, gỡ used[1]</text></g>
<g data-step="4"><text x="175" y="126" text-anchor="middle" font-size="16" fill="currentColor">1</text><text x="245" y="126" text-anchor="middle" font-size="16" fill="currentColor">3</text><text x="260" y="185" text-anchor="middle" font-size="13" fill="currentColor">Choose 3 từ path đã khôi phục</text></g>
</svg>
<step-note data-step="1">Đang ở path=[1]; đây là trạng thái cần khôi phục sau mỗi nhánh con.</step-note>
<step-note data-step="2">Choose 2 và explore toàn bộ nhánh [1,2]; các lời giải được lưu bằng bản copy.</step-note>
<step-note data-step="3">Sau khi nhánh 2 trả về, pop 2 và gỡ used[1]. Path lại là [1], chi phí undo O(1).</step-note>
<step-note data-step="4">Choose 3 từ trạng thái sạch để vào [1,3]. Cặp choose/unchoose đối xứng ngăn dữ liệu nhánh trước lọt sang nhánh sau.</step-note>
</step-flow>

### 1.3. Pruning — cắt nhánh, thứ làm backtracking "sống được"

Vét cạn thuần là quá đắt. **Pruning** là *từ chối đi vào* những nhánh chắc chắn không dẫn tới lời giải hợp lệ/tối ưu, ngay tại node chứ không chờ tới lá. Ba kiểu cắt nhánh hay gặp:

- **Cắt theo ràng buộc (constraint pruning)**: nếu lựa chọn hiện tại đã vi phạm ràng buộc (ví dụ hai hậu cùng cột) thì bỏ qua ngay, không đệ quy.
- **Cắt theo cận (bound pruning)**: nếu phần đã chọn đã vượt mục tiêu (ví dụ tổng đã `> target` trong combination sum với số dương) thì dừng nhánh.
- **Cắt trùng lặp (dedup pruning)**: sort trước rồi bỏ qua các phần tử trùng cùng cấp để không sinh lời giải lặp.

> Ghi nhớ: Hiệu năng của backtracking **quyết định gần như hoàn toàn bởi pruning**, không phải bởi vi tối ưu code. Một dòng `if (sum > target) return;` đặt đúng chỗ có thể cắt 99% cây.

<ab-toggle data-labels="Vét cạn|Cắt theo cận">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="dsa09-prune-0-t dsa09-prune-0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa09-prune-0-t">Cắt nhánh khi tổng vượt target</title>
<desc id="dsa09-prune-0-d">Giá trị node là tổng các số đã chọn. Cùng một cây tìm kiếm trước và sau bound pruning.</desc>
<text x="260" y="24" font-size="13" text-anchor="middle" fill="currentColor">Chọn 2 hoặc 4; target = 5; tối đa 3 lượt</text>
<g opacity="1">
<circle cx="260" cy="58" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="63" font-size="13" text-anchor="middle" fill="currentColor">0</text>
</g>
<g opacity="1">
<path d="M260 73 L130 111" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="130" cy="126" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="130" y="131" font-size="13" text-anchor="middle" fill="currentColor">2</text>
</g>
<g opacity="1">
<path d="M260 73 L390 111" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="390" cy="126" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="390" y="131" font-size="13" text-anchor="middle" fill="currentColor">4</text>
</g>
<g opacity="1">
<path d="M130 141 L65 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="65" cy="194" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="65" y="199" font-size="13" text-anchor="middle" fill="currentColor">4</text>
</g>
<g opacity="1">
<path d="M130 141 L195 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="195" cy="194" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="195" y="199" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<g opacity="1">
<path d="M390 141 L325 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="325" cy="194" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="325" y="199" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<g opacity="1">
<path d="M390 141 L455 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="455" cy="194" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="455" y="199" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="1">
<path d="M65 209 L35 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="35" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="35" y="267" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<g opacity="1">
<path d="M65 209 L95 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="95" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="95" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="1">
<path d="M195 209 L165 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="165" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="165" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="1">
<path d="M195 209 L225 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="225" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="225" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="1">
<path d="M325 209 L295 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="295" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="295" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="1">
<path d="M325 209 L355 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="355" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="355" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="1">
<path d="M455 209 L425 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="425" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="425" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="1">
<path d="M455 209 L485 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="485" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="485" y="267" font-size="13" text-anchor="middle" fill="currentColor">12</text>
</g>
<text x="260" y="305" font-size="13" text-anchor="middle" fill="currentColor">Mọi node đều được mở rộng</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="dsa09-prune-1-t dsa09-prune-1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="dsa09-prune-1-t">Cắt nhánh khi tổng vượt target</title>
<desc id="dsa09-prune-1-d">Giá trị node là tổng các số đã chọn. Cùng một cây tìm kiếm trước và sau bound pruning.</desc>
<text x="260" y="24" font-size="13" text-anchor="middle" fill="currentColor">Chọn 2 hoặc 4; target = 5; tối đa 3 lượt</text>
<g opacity="1">
<circle cx="260" cy="58" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="260" y="63" font-size="13" text-anchor="middle" fill="currentColor">0</text>
</g>
<g opacity="1">
<path d="M260 73 L130 111" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="130" cy="126" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="130" y="131" font-size="13" text-anchor="middle" fill="currentColor">2</text>
</g>
<g opacity="1">
<path d="M260 73 L390 111" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="390" cy="126" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="390" y="131" font-size="13" text-anchor="middle" fill="currentColor">4</text>
</g>
<g opacity="1">
<path d="M130 141 L65 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="65" cy="194" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="65" y="199" font-size="13" text-anchor="middle" fill="currentColor">4</text>
</g>
<g opacity="1">
<path d="M130 141 L195 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="195" cy="194" r="16" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="195" y="199" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<path d="M183 214 L207 214" fill="none" stroke="#f43f5e" stroke-width="3"/>
<g opacity="1">
<path d="M390 141 L325 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="325" cy="194" r="16" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="325" y="199" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<path d="M313 214 L337 214" fill="none" stroke="#f43f5e" stroke-width="3"/>
<g opacity="1">
<path d="M390 141 L455 179" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="455" cy="194" r="16" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="455" y="199" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<path d="M443 214 L467 214" fill="none" stroke="#f43f5e" stroke-width="3"/>
<g opacity="1">
<path d="M65 209 L35 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="35" cy="262" r="16" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="35" y="267" font-size="13" text-anchor="middle" fill="currentColor">6</text>
</g>
<g opacity="1">
<path d="M65 209 L95 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="1">
<circle cx="95" cy="262" r="16" fill="#f43f5e" fill-opacity="0.14" stroke="#f43f5e"/>
<text x="95" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="0.1">
<path d="M195 209 L165 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="165" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="165" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="0.1">
<path d="M195 209 L225 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="225" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="225" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="0.1">
<path d="M325 209 L295 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="295" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="295" y="267" font-size="13" text-anchor="middle" fill="currentColor">8</text>
</g>
<g opacity="0.1">
<path d="M325 209 L355 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="355" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="355" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="0.1">
<path d="M455 209 L425 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="425" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="425" y="267" font-size="13" text-anchor="middle" fill="currentColor">10</text>
</g>
<g opacity="0.1">
<path d="M455 209 L485 247" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
</g>
<g opacity="0.1">
<circle cx="485" cy="262" r="16" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
<text x="485" y="267" font-size="13" text-anchor="middle" fill="currentColor">12</text>
</g>
<text x="260" y="305" font-size="13" text-anchor="middle" fill="currentColor">Đỏ: tổng &gt; 5; mờ: không được gọi</text>
</svg>
<ab-note>Cây giới hạn ba lựa chọn để dễ nhìn. Nhãn là tổng, mỗi cạnh cộng 2 (trái) hoặc 4 (phải); đây là cây minh hoạ cận, chưa khử tổ hợp trùng.</ab-note>
<ab-note>Ở tổng 6 hoặc 8, mọi số còn lại đều dương nên không thể về target 5. Dừng ngay tại node đỏ, bỏ toàn bộ hậu duệ mờ.</ab-note>
</ab-toggle>

### 1.4. Backtracking vs DP — phân biệt cho chuẩn

Đây là chỗ rất nhiều người nhầm. Cả hai đều là đệ quy trên không gian con, nhưng:

| | Backtracking | Dynamic Programming |
| --- | --- | --- |
| Câu hỏi | "Liệt kê TẤT CẢ lời giải" / "có tồn tại?" | "ĐẾM số cách" / "tìm giá trị tối ưu (max/min)" |
| Cần liệt kê nghiệm? | Có (thường phải in ra từng nghiệm) | Không, chỉ cần con số/giá trị |
| Bài con trùng lặp | Mỗi nghiệm là duy nhất → ít/không cache được | Có overlapping subproblems → cache được |
| Độ phức tạp điển hình | Mũ / giai thừa `O(2^n)`, `O(n!)`, `O(b^d)` | Đa thức `O(n·m)`, `O(n^2)`... |
| Trạng thái | Đường đi đầy đủ (`path`) | Khoá gọn (vài chỉ số) → cache theo khoá |

> Bẫy: Nếu đề chỉ hỏi **"có bao nhiêu cách"** hoặc **"giá trị lớn nhất/nhỏ nhất"** mà *không* yêu cầu in ra từng nghiệm, đừng vội backtracking — rất có thể đó là **DP** và backtracking sẽ TLE. Backtracking khi cần *chính các nghiệm*; DP khi chỉ cần *con số tổng hợp*.

## 2. Template choose–explore–unchoose (khung chuẩn)

Đây là bộ khung gốc. Gần như **mọi** bài backtracking chỉ là điền vào 3 chỗ: điều kiện ghi nhận lời giải, tập lựa chọn hợp lệ, và cách choose/unchoose. Dưới đây minh hoạ bằng bài "sinh tập con" (subsets) — bài đơn giản nhất để thấy rõ khung.

```python
def subsets(nums):
    res, path = [], []
    def backtrack(start):
        res.append(path[:])                 # mỗi node ĐỀU là một tập con hợp lệ
        for i in range(start, len(nums)):   # tập lựa chọn: từ start trở đi
            path.append(nums[i])            # choose
            backtrack(i + 1)                # explore (i+1: không quay lại)
            path.pop()                      # unchoose (quay lui)
    backtrack(0)
    return res
```
```javascript
function subsets(nums) {
    const res = [], path = [];
    function backtrack(start) {
        res.push([...path]);                    // mỗi node là một tập con hợp lệ
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);                 // choose
            backtrack(i + 1);                   // explore
            path.pop();                         // unchoose
        }
    }
    backtrack(0);
    return res;
}
```
```java
static List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), res);
    return res;
}
static void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));             // mỗi node là một tập con hợp lệ
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                      // choose
        backtrack(nums, i + 1, path, res);      // explore
        path.remove(path.size() - 1);           // unchoose
    }
}
```
```go
func subsets(nums []int) [][]int {
    res := [][]int{}
    path := []int{}
    var backtrack func(start int)
    backtrack = func(start int) {
        cp := append([]int{}, path...)          // copy & ghi nhận
        res = append(res, cp)
        for i := start; i < len(nums); i++ {
            path = append(path, nums[i])        // choose
            backtrack(i + 1)                    // explore
            path = path[:len(path)-1]           // unchoose
        }
    }
    backtrack(0)
    return res
}
```

```cpp
vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> res;
    vector<int> path;
    function<void(int)> backtrack = [&](int start) {
        res.push_back(path);                    // mỗi node là một tập con hợp lệ
        for (int i = start; i < (int)nums.size(); i++) {
            path.push_back(nums[i]);            // choose
            backtrack(i + 1);                   // explore
            path.pop_back();                    // unchoose
        }
    };
    backtrack(0);
    return res;
}
```

Ba "ổ cắm" cần điền cho mọi bài:

1. **Điều kiện ghi nhận**: khi nào `path` là một lời giải đầy đủ? (đủ độ dài? `start == n`? tổng `== target`?). Với subsets thì *mọi* node đều là nghiệm; với permutations thì chỉ lá; với combination sum thì khi tổng đúng bằng target.
2. **Tập lựa chọn hợp lệ tại node**: vòng `for` duyệt cái gì? Có cần `used[]`/`start` để tránh lặp không?
3. **choose / unchoose đối xứng**: thêm gì thì gỡ nấy. Quên `unchoose` là lỗi kinh điển nhất.

> Ghi nhớ: `start` dùng cho **tổ hợp** (thứ tự không quan trọng, chỉ tiến tới); `used[]` dùng cho **hoán vị** (thứ tự quan trọng, được quay lại phần tử trước nhưng không dùng lại đúng phần tử đang dùng). Phân biệt được hai cái này là phân biệt được combinations vs permutations.

## 3. Bảng DẠNG BÀI (problem patterns)

| Dạng | Dấu hiệu nhận biết | Hướng làm | Độ phức tạp | Bài kinh điển (LeetCode) |
| --- | --- | --- | --- | --- |
| **Subsets** | "tất cả tập con", "power set", mỗi phần tử lấy/bỏ | `start` + ghi nhận ở MỌI node | `O(n · 2^n)` | 78. Subsets · 90. Subsets II |
| **Permutations** | "tất cả hoán vị/sắp xếp", thứ tự quan trọng | `used[]`, ghi nhận khi `len(path)==n` | `O(n · n!)` | 46. Permutations · 47. Permutations II |
| **Combinations** | "chọn k phần tử", "tổ hợp", không quan tâm thứ tự | `start` + dừng khi đủ `k` | `O(k · C(n,k))` | 77. Combinations |
| **Combination Sum** | "tìm tổ hợp có tổng = target" | `start`, trừ dần target, cắt khi `target<0` | `O(n^(target/min))` | 39. Combination Sum · 40. Comb Sum II |
| **Partitioning** | "chia chuỗi/mảng thành phần thoả điều kiện" | cắt tại mọi vị trí hợp lệ, đệ quy phần còn lại | `O(n · 2^n)` | 131. Palindrome Partitioning |
| **Generate Parentheses** | "sinh chuỗi ngoặc hợp lệ", "well-formed" | đếm `open/close`, cắt khi `close>open` | `O(4^n / √n)` (Catalan) | 22. Generate Parentheses |
| **Grid / Word Search** | "tìm đường trên lưới", "đi 4 hướng", "có tồn tại path" | DFS 4 hướng + đánh dấu visited rồi gỡ | `O(m·n · 4^L)` | 79. Word Search · 212. Word Search II |
| **N-Queens / Constraint** | "đặt sao cho không xung đột", ràng buộc hàng/cột/chéo | đặt theo từng hàng, dùng set kiểm tra O(1) | `O(n!)` (đã prune) | 51/52. N-Queens |
| **Sudoku / Exact Cover** | "điền sao cho thoả mọi ràng buộc", ô trống | tìm ô trống, thử 1–9, validate, quay lui | `O(9^m)` (m = ô trống) | 37. Sudoku Solver |

> Ghi nhớ: 90% bài backtracking phỏng vấn rơi vào 3 nhóm gốc — **subsets / permutations / combinations**. N-queens, sudoku, word search là biến thể "constraint" của cùng khung, chỉ khác phần kiểm tra hợp lệ và pruning.

### 3.1. Ý tưởng N-queens — kiểm tra an toàn O(1) & pruning

Bài N-queens là đại diện kinh điển của nhóm **constraint**: đặt `n` quân hậu lên bàn `n×n` sao cho không hai quân nào ăn nhau. Ta đặt **mỗi hàng đúng một quân** (nên không cần lo trùng hàng), rồi với mỗi hàng thử lần lượt từng **cột**. Mấu chốt là kiểm tra một ô có an toàn không thật nhanh: một quân hậu khống chế **cột** của nó, đường chéo **`\`** (mọi ô cùng `r - c`) và đường chéo **`/`** (mọi ô cùng `r + c`). Lưu ba `set` — cột đã chiếm, `r-c` đã chiếm, `r+c` đã chiếm — thì kiểm tra an toàn chỉ còn **O(1)**, và nếu ô không an toàn ta **cắt nhánh ngay** thay vì đặt rồi mới phát hiện xung đột.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bàn cờ N-queens: cột, chéo r-c và r+c bị một quân hậu khống chế</title>
  <desc>Bàn cờ 5 nhân 5 với một quân hậu ở hàng 1 cột 2. Các ô bị khống chế gồm cả cột (c=2), đường chéo xuôi r-c và đường chéo ngược r+c. Lưu ba tập cột, r-c, r+c giúp kiểm tra an toàn trong O(1).</desc>
  <g font-size="11" fill="currentColor" opacity="0.7" text-anchor="middle">
    <text x="60" y="32">c=0</text><text x="120" y="32">c=1</text><text x="180" y="32">c=2</text><text x="240" y="32">c=3</text><text x="300" y="32">c=4</text>
  </g>
  <g font-size="11" fill="currentColor" opacity="0.7" text-anchor="end">
    <text x="26" y="68">r=0</text><text x="26" y="128">r=1</text><text x="26" y="188">r=2</text><text x="26" y="248">r=3</text><text x="26" y="308">r=4</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.25">
    <rect x="30" y="42" width="300" height="300" fill="none"/>
    <line x1="90" y1="42" x2="90" y2="342"/><line x1="150" y1="42" x2="150" y2="342"/><line x1="210" y1="42" x2="210" y2="342"/><line x1="270" y1="42" x2="270" y2="342"/>
    <line x1="30" y1="102" x2="330" y2="102"/><line x1="30" y1="162" x2="330" y2="162"/><line x1="30" y1="222" x2="330" y2="222"/><line x1="30" y1="282" x2="330" y2="282"/>
  </g>
  <g>
    <rect x="150" y="102" width="60" height="60" fill="#8b5cf6" fill-opacity="0.14"/>
    <rect x="150" y="162" width="60" height="60" fill="#8b5cf6" fill-opacity="0.14"/>
    <rect x="150" y="222" width="60" height="60" fill="#8b5cf6" fill-opacity="0.14"/>
    <rect x="150" y="282" width="60" height="60" fill="#8b5cf6" fill-opacity="0.14"/>
    <rect x="210" y="102" width="60" height="60" fill="#3b82f6" fill-opacity="0.14"/>
    <rect x="270" y="162" width="60" height="60" fill="#3b82f6" fill-opacity="0.14"/>
    <rect x="90" y="102" width="60" height="60" fill="#f59e0b" fill-opacity="0.14"/>
    <rect x="30" y="162" width="60" height="60" fill="#f59e0b" fill-opacity="0.14"/>
  </g>
  <g>
    <rect x="150" y="42" width="60" height="60" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="180" y="80" font-size="26" text-anchor="middle" fill="currentColor">Q</text>
  </g>
  <g font-size="12" fill="currentColor">
    <rect x="378" y="60" width="20" height="14" rx="3" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="406" y="71">cột (c = 2) → set cols</text>
    <rect x="378" y="92" width="20" height="14" rx="3" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="406" y="103">chéo \ (r − c không đổi) → set diag1</text>
    <rect x="378" y="124" width="20" height="14" rx="3" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="406" y="135">chéo / (r + c không đổi) → set diag2</text>
    <rect x="378" y="156" width="20" height="14" rx="3" fill="#10b981" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="406" y="167">quân hậu vừa đặt (r=0, c=2)</text>
  </g>
  <g font-size="11.5" fill="currentColor">
    <text x="378" y="210" font-weight="700">An toàn? — kiểm tra O(1):</text>
    <text x="378" y="232" font-family="ui-monospace, monospace" opacity="0.85">c ∉ cols  và  (r−c) ∉ diag1  và  (r+c) ∉ diag2</text>
    <text x="378" y="262" font-weight="700">Pruning:</text>
    <text x="378" y="284" opacity="0.85">ô bị khống chế → bỏ qua ngay,</text>
    <text x="378" y="302" opacity="0.85">không đặt, không đệ quy xuống hàng kế.</text>
    <text x="378" y="324" opacity="0.85">Đặt mỗi hàng 1 quân → tự khỏi lo</text>
    <text x="378" y="342" opacity="0.85">trùng hàng; cây thu còn O(n!) đã prune.</text>
  </g>
</svg>

Khi đặt xong một quân ở `(r, c)`, ta thêm `c`, `r-c`, `r+c` vào ba set (choose), đệ quy sang hàng `r+1`, rồi **gỡ cả ba ra** (unchoose) trước khi thử cột kế — đúng khung choose–explore–unchoose. Nhờ pruning bằng ba set, cây từ `n^n` ô co lại còn cỡ `O(n!)` và thực tế nhỏ hơn nhiều.

### 3.2. Sơ đồ chọn nhanh

```text
Đề muốn "liệt kê tất cả ..."?
 ├─ Tập con (lấy/bỏ mỗi phần tử) ............. subsets, start
 ├─ Sắp xếp lại (thứ tự quan trọng) ......... permutations, used[]
 ├─ Chọn k / tổng = target (không thứ tự) ... combinations / comb sum, start
 ├─ Chia chuỗi thành các đoạn ............... partitioning
 ├─ Sinh chuỗi hợp lệ (ngoặc, IP...) ........ đếm ràng buộc khi build
 ├─ Trên lưới 2D, đi nhiều hướng ............ grid DFS + visited
 └─ Điền/đặt thoả ràng buộc cứng ............ constraint (N-queens, sudoku)

Nếu đề CHỈ hỏi "bao nhiêu cách" / "max/min" (không cần liệt kê nghiệm)
 └─> nghĩ DP trước, không backtracking
```

## 4. Ba bài mẫu giải chi tiết

### 4.1. Bài mẫu 1 — Permutations (LeetCode 46)

**Hiểu đề.** Cho mảng `nums` các số *phân biệt*. Trả về **tất cả** hoán vị của chúng. Ví dụ `nums = [1,2,3]` → `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]` (6 = 3! hoán vị).

**Ý tưởng / vì sao.** Một hoán vị là một cách *xếp hết* các phần tử vào n vị trí. Tại mỗi vị trí, ta thử mọi phần tử *chưa được dùng*. Cần mảng `used[]` để biết phần tử nào còn rảnh — đây chính là điểm khác combinations: hoán vị được "quay lại" các phần tử đứng trước, miễn là chưa dùng trong đường đi hiện tại. Khi `path` đủ `n` phần tử là một hoán vị hoàn chỉnh → ghi nhận (nhớ **copy** vì `path` còn bị sửa tiếp).

<auto-anim data-dur="14">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 280" role="img" aria-labelledby="ds9-used-t ds9-used-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds9-used-t">Permutations: used được gỡ khi quay lui</title>
<desc id="ds9-used-d">Permutations: used được gỡ khi quay lui. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds9-used-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Permutations: used được gỡ khi quay lui</text>
<text x="260" y="58" font-size="14" text-anchor="middle" fill="currentColor">nums:       1          2          3</text><text x="65" y="102" font-size="13" text-anchor="middle" fill="currentColor">used</text><text x="65" y="180" font-size="13" text-anchor="middle" fill="currentColor">path</text><rect x="140" y="75" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="140" y="155" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="220" y="75" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="220" y="155" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="300" y="75" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><rect x="300" y="155" width="60" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/>
<g opacity="1"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="1;0;0;0;0;0;0;1"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Chọn 1; không thể dùng lại index 0</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;1;0;0;0;0;0;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="250" y="179" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Chọn 2; used[0] và used[1] đã bật</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;0;1;0;0;0;0;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="250" y="179" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="330" y="179" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Chọn 3: đủ n → copy [1,2,3]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;0;0;1;0;0;0;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="250" y="179" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Pop 3 và gỡ used[2]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;0;0;0;1;0;0;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Nhánh [1,2] hết lựa chọn: pop 2</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;0;0;0;0;1;0;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">F</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="250" y="179" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Chọn 3 ở vị trí thứ hai</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.142857;0.285714;0.428571;0.571429;0.714286;0.857143;1.0" values="0;0;0;0;0;0;1;0"/><text x="170" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="250" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="330" y="99" font-size="14" text-anchor="middle" fill="currentColor">T</text><text x="170" y="179" font-size="14" text-anchor="middle" fill="currentColor">1</text><text x="250" y="179" font-size="14" text-anchor="middle" fill="currentColor">3</text><text x="330" y="179" font-size="14" text-anchor="middle" fill="currentColor">2</text><text x="260" y="238" font-size="13" text-anchor="middle" fill="currentColor">Chọn lại 2: copy [1,3,2]</text></g>
<path d="M30 262 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="262" r="4" fill="currentColor"><animate attributeName="cx" dur="14s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

```python
def permute(nums):
    res, used, path = [], [False] * len(nums), []
    def backtrack():
        if len(path) == len(nums):
            res.append(path[:])             # copy: path còn thay đổi
            return
        for i in range(len(nums)):
            if used[i]:
                continue                    # phần tử đã dùng trong path
            used[i] = True; path.append(nums[i])    # choose
            backtrack()                             # explore
            used[i] = False; path.pop()             # unchoose
    backtrack()
    return res
```
```javascript
function permute(nums) {
    const res = [], used = Array(nums.length).fill(false), path = [];
    function backtrack() {
        if (path.length === nums.length) { res.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true; path.push(nums[i]);     // choose
            backtrack();                            // explore
            used[i] = false; path.pop();            // unchoose
        }
    }
    backtrack();
    return res;
}
```
```java
static List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    boolean[] used = new boolean[nums.length];
    dfs(nums, used, new ArrayList<>(), res);
    return res;
}
static void dfs(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; path.add(nums[i]);          // choose
        dfs(nums, used, path, res);                 // explore
        used[i] = false; path.remove(path.size() - 1); // unchoose
    }
}
```
```go
func permute(nums []int) [][]int {
    res := [][]int{}
    used := make([]bool, len(nums))
    path := []int{}
    var backtrack func()
    backtrack = func() {
        if len(path) == len(nums) {
            res = append(res, append([]int{}, path...))   // copy
            return
        }
        for i := range nums {
            if used[i] {
                continue
            }
            used[i] = true; path = append(path, nums[i])   // choose
            backtrack()                                    // explore
            used[i] = false; path = path[:len(path)-1]      // unchoose
        }
    }
    backtrack()
    return res
}
```

```cpp
vector<vector<int>> permute(vector<int>& nums) {
    vector<vector<int>> res;
    vector<bool> used(nums.size(), false);
    vector<int> path;
    function<void()> backtrack = [&]() {
        if (path.size() == nums.size()) {
            res.push_back(path);                // copy: path còn thay đổi
            return;
        }
        for (int i = 0; i < (int)nums.size(); i++) {
            if (used[i]) continue;              // phần tử đã dùng trong path
            used[i] = true; path.push_back(nums[i]);    // choose
            backtrack();                                // explore
            used[i] = false; path.pop_back();           // unchoose
        }
    };
    backtrack();
    return res;
}
```

**Phân tích độ phức tạp.** Cây có `n!` lá; mỗi lá ghi nhận một bản copy dài `n` trong `O(n)` → **thời gian `O(n · n!)`**. Bộ nhớ phụ (không tính output): `O(n)` cho `path`, `used` và độ sâu đệ quy.

**Bẫy.** (1) Quên copy `path[:]` → tất cả phần tử trong `res` trỏ về cùng một list, cuối cùng rỗng hết. (2) Dùng `start` thay vì `used[]` → ra combinations chứ không phải permutations. (3) Với `nums` *có phần tử trùng* (bài 47), phải sort trước rồi thêm cắt nhánh `if i>0 and nums[i]==nums[i-1] and not used[i-1]: continue` để khử hoán vị trùng.

### 4.2. Bài mẫu 2 — Combination Sum (LeetCode 39)

**Hiểu đề.** Cho `candidates` (số dương, *phân biệt*) và `target`. Tìm **mọi tổ hợp** mà tổng `= target`; mỗi số được **dùng lại nhiều lần**. Ví dụ `candidates=[2,3,6,7]`, `target=7` → `[[2,2,3],[7]]`.

**Ý tưởng / vì sao.** Vì thứ tự không quan trọng (`[2,2,3]` và `[3,2,2]` là một), ta dùng `start` để chỉ tiến *không lùi* — tránh sinh tổ hợp trùng. Vì được dùng lại số, khi đệ quy ta truyền lại **`i`** (không phải `i+1`) để cho phép chọn lại chính nó. Trừ dần `target`: khi `target == 0` là một tổ hợp đúng; khi `target < 0` thì cắt nhánh ngay (đây là pruning quan trọng). Nếu sort `candidates` trước, có thể `break` ngay khi `candidates[i] > target` — cắt mạnh hơn.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="ds9-comb-t ds9-comb-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds9-comb-t">Combination Sum: dùng lại i, cắt khi vượt</title>
<desc id="ds9-comb-d">Combination Sum: dùng lại i, cắt khi vượt. Các vị trí trong cấu trúc cố định; các bước lần lượt làm nổi phần đang xử lý.</desc>
<defs><marker id="ds9-comb-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260.0" y="25" font-size="15" text-anchor="middle" fill="currentColor">Combination Sum: dùng lại i, cắt khi vượt</text>
<text x="260" y="55" font-size="14" text-anchor="middle" fill="currentColor">candidates=[2,3,6,7], target=7</text>
<g data-step="1"><rect x="198" y="67" width="124" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="260.0" y="91" font-size="14" text-anchor="middle" fill="currentColor">[]; r=7</text></g>
<g data-step="2"><path d="M260 105 L150 122" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#ds9-comb-a)"/><rect x="88" y="127" width="124" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="150.0" y="151" font-size="14" text-anchor="middle" fill="currentColor">[2]; r=5</text></g>
<g data-step="3"><path d="M150 165 L95 182" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#ds9-comb-a)"/><rect x="33" y="187" width="124" height="36" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="95.0" y="211" font-size="14" text-anchor="middle" fill="currentColor">[2,2]; r=3</text></g>
<g data-step="3" data-until="3"><path d="M160 205 L300 205" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#ds9-comb-a)"/><text x="385" y="210" font-size="13" text-anchor="middle" fill="currentColor">6 &gt; remain 3: break</text></g>
<g data-step="4"><path d="M95 225 L100 257" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#ds9-comb-a)"/><rect x="38" y="262" width="124" height="36" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="100.0" y="286" font-size="14" text-anchor="middle" fill="currentColor">[2,2,3]; r=0</text></g>
<g data-step="5"><path d="M260 105 L390 122" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#ds9-comb-a)"/><rect x="328" y="127" width="124" height="36" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5"/><text x="390.0" y="151" font-size="14" text-anchor="middle" fill="currentColor">[7]; r=0</text></g>
</svg>
<step-note data-step="1">Bắt đầu start=0, remain=7. Chỉ đi từ start trở đi để không sinh tổ hợp đảo thứ tự.</step-note>
<step-note data-step="2">Chọn 2, truyền lại i=0 nên 2 vẫn dùng được; remain=5.</step-note>
<step-note data-step="3">Chọn thêm 2, remain=3. Sau khi thử 2 và 3, gặp 6 > 3 thì break; không cần thử 7.</step-note>
<step-note data-step="4">Chọn 3 tạo remain=0: copy [2,2,3]. Sau return phải pop từng lựa chọn khi quay về.</step-note>
<step-note data-step="5">Sau các nhánh bắt đầu bằng 2, 3, 6, gốc thử 7: copy [7]. Hình lược bớt nhánh thất bại, hai lá xanh là toàn bộ nghiệm.</step-note>
</step-flow>

```python
def combination_sum(candidates, target):
    candidates.sort()                       # để break sớm khi vượt target
    res, path = [], []
    def backtrack(start, remain):
        if remain == 0:
            res.append(path[:]); return
        for i in range(start, len(candidates)):
            if candidates[i] > remain:
                break                       # đã sort: các số sau còn lớn hơn -> cắt
            path.append(candidates[i])      # choose
            backtrack(i, remain - candidates[i])  # i (không i+1): dùng lại được
            path.pop()                      # unchoose
    backtrack(0, target)
    return res
```
```javascript
function combinationSum(candidates, target) {
    candidates.sort((a, b) => a - b);
    const res = [], path = [];
    function backtrack(start, remain) {
        if (remain === 0) { res.push([...path]); return; }
        for (let i = start; i < candidates.length; i++) {
            if (candidates[i] > remain) break;       // cắt nhánh
            path.push(candidates[i]);                // choose
            backtrack(i, remain - candidates[i]);    // i: dùng lại được
            path.pop();                              // unchoose
        }
    }
    backtrack(0, target);
    return res;
}
```
```java
static List<List<Integer>> combinationSum(int[] candidates, int target) {
    Arrays.sort(candidates);
    List<List<Integer>> res = new ArrayList<>();
    dfs(candidates, 0, target, new ArrayList<>(), res);
    return res;
}
static void dfs(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {
    if (remain == 0) { res.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length; i++) {
        if (c[i] > remain) break;                    // cắt nhánh
        path.add(c[i]);                              // choose
        dfs(c, i, remain - c[i], path, res);         // i: dùng lại được
        path.remove(path.size() - 1);                // unchoose
    }
}
```
```go
func combinationSum(candidates []int, target int) [][]int {
    sort.Ints(candidates)
    res := [][]int{}
    path := []int{}
    var backtrack func(start, remain int)
    backtrack = func(start, remain int) {
        if remain == 0 {
            res = append(res, append([]int{}, path...))
            return
        }
        for i := start; i < len(candidates); i++ {
            if candidates[i] > remain {
                break                                // cắt nhánh
            }
            path = append(path, candidates[i])       // choose
            backtrack(i, remain-candidates[i])       // i: dùng lại được
            path = path[:len(path)-1]                // unchoose
        }
    }
    backtrack(0, target)
    return res
}
```

```cpp
vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
    sort(candidates.begin(), candidates.end());     // để break sớm khi vượt target
    vector<vector<int>> res;
    vector<int> path;
    function<void(int, int)> backtrack = [&](int start, int remain) {
        if (remain == 0) { res.push_back(path); return; }
        for (int i = start; i < (int)candidates.size(); i++) {
            if (candidates[i] > remain) break;          // cắt nhánh
            path.push_back(candidates[i]);              // choose
            backtrack(i, remain - candidates[i]);       // i: dùng lại được
            path.pop_back();                            // unchoose
        }
    };
    backtrack(0, target);
    return res;
}
```

**Phân tích độ phức tạp.** Khó cho cận chặt; cận trên thường viết là **`O(n^(target/min))`** với `min` là số nhỏ nhất — chiều sâu cây tối đa `target/min`, bậc rẽ nhánh tối đa `n`. Pruning (sort + break) cắt cây xuống rất nhiều trong thực tế. Bộ nhớ phụ `O(target/min)` cho độ sâu.

**Bẫy.** (1) Truyền `i+1` thay vì `i` → mỗi số chỉ dùng một lần (đó là bài khác). (2) Không dùng `start`, dùng vòng `for` từ 0 → sinh hoán vị trùng như `[2,2,3]` và `[2,3,2]`. (3) Bài 40 (Combination Sum II): mỗi số dùng *một lần* và mảng *có trùng* → đệ quy `i+1` và thêm `if i>start and c[i]==c[i-1]: continue` để khử tổ hợp lặp.

### 4.3. Bài mẫu 3 — Word Search (LeetCode 79)

**Hiểu đề.** Cho lưới ký tự `board` `m×n` và chuỗi `word`. Hỏi `word` có tồn tại trong lưới không, đi qua các ô **kề cạnh (4 hướng)**, mỗi ô **dùng tối đa một lần** trong một đường. Trả `true/false`.

**Ý tưởng / vì sao.** Đây là backtracking trên lưới (grid DFS). Từ mỗi ô làm điểm xuất phát, ta thử khớp dần từng ký tự của `word`. Tại bước `k`, nếu ô hiện tại khớp `word[k]`, ta **đánh dấu đã thăm** rồi đi 4 hướng tìm `word[k+1]`; sau khi thử xong **gỡ dấu** để ô đó còn dùng được cho đường đi khác (đây là phần "unchoose"). Mẹo tiết kiệm bộ nhớ: thay vì mảng `visited` riêng, tạm ghi đè ô bằng ký tự lính canh (vd `#`) rồi khôi phục. Pruning tự nhiên: ký tự không khớp → `return false` ngay.

<auto-anim data-dur="14">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="ds9-word-t ds9-word-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="ds9-word-t">Word Search: xét ô, cắt nhánh, khôi phục</title>
<desc id="ds9-word-d">Ô đang xét màu vàng; ô trên path màu xanh; ô C bị loại màu đỏ. Mũi tên từ A chỉ hướng đang thử: xuống C rồi phải sang B. Sau khi tìm được AB, khôi phục B và A.</desc>
<defs><marker id="ds9-word-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" text-anchor="middle" font-size="15" fill="currentColor">Word Search: xét ô, cắt nhánh, khôi phục</text>
<text x="260" y="55" text-anchor="middle" font-size="14" fill="currentColor">board = [[A,B],[C,D]], word = &quot;AB&quot;</text><text x="260" y="80" text-anchor="middle" font-size="13" fill="currentColor">Vàng: đang xét · xanh: path · đỏ: loại</text><rect x="170" y="105" width="60" height="50" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"><animate attributeName="fill" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="#f59e0b;#10b981;#10b981;#10b981;#10b981;#10b981;#3b82f6;#f59e0b"/></rect><rect x="260" y="105" width="60" height="50" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"><animate attributeName="fill" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="#3b82f6;#3b82f6;#3b82f6;#f59e0b;#10b981;#3b82f6;#3b82f6;#3b82f6"/></rect><rect x="170" y="185" width="60" height="50" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"><animate attributeName="fill" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="#3b82f6;#f59e0b;#f43f5e;#3b82f6;#3b82f6;#3b82f6;#3b82f6;#3b82f6"/></rect><rect x="260" y="185" width="60" height="50" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"><animate attributeName="fill" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="#3b82f6;#3b82f6;#3b82f6;#3b82f6;#3b82f6;#3b82f6;#3b82f6;#3b82f6"/></rect>
<g opacity="1"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="1;0;0;0;0;0;0;1"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">A</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">Xét A tại (0,0): khớp word[0]</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;1;0;0;0;0;0;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><path d="M200 157 V181" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#ds9-word-a)"/><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">Đánh dấu A; thử xuống C để tìm B</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;0;1;0;0;0;0;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><path d="M200 157 V181" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#ds9-word-a)"/><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">C ≠ B: loại ô C, quay về A</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;0;0;1;0;0;0;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><path d="M234 130 H256" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#ds9-word-a)"/><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">Thử sang phải: xét B tại (0,1)</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;0;0;0;1;0;0;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">B khớp: đánh dấu, k=2 đạt len(word)</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;0;0;0;0;1;0;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">#</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">Return true qua B: khôi phục B</text></g>
<g opacity="0"><animate attributeName="opacity" dur="14s" repeatCount="indefinite" calcMode="discrete" keyTimes="0.0;0.14285714285714285;0.2857142857142857;0.42857142857142855;0.5714285714285714;0.7142857142857143;0.8571428571428571;1.0" values="0;0;0;0;0;0;1;0"/><text x="200" y="137" text-anchor="middle" font-size="18" fill="currentColor">A</text><text x="290" y="137" text-anchor="middle" font-size="18" fill="currentColor">B</text><text x="200" y="217" text-anchor="middle" font-size="18" fill="currentColor">C</text><text x="290" y="217" text-anchor="middle" font-size="18" fill="currentColor">D</text><text x="260" y="282" text-anchor="middle" font-size="13" fill="currentColor">Return true qua A: khôi phục A</text></g>
<path d="M30 310 H490" stroke="currentColor" stroke-opacity="0.3"/><circle cx="30" cy="310" r="4" fill="currentColor"><animate attributeName="cx" dur="14s" repeatCount="indefinite" values="30;490"/></circle>
</svg>
</auto-anim>

```python
def exist(board, word):
    m, n = len(board), len(board[0])
    def dfs(r, c, k):
        if k == len(word):
            return True                       # khớp hết word
        if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != word[k]:
            return False                      # ra ngoài / không khớp -> cắt
        board[r][c] = "#"                     # choose: đánh dấu đã thăm
        found = (dfs(r+1, c, k+1) or dfs(r-1, c, k+1) or
                 dfs(r, c+1, k+1) or dfs(r, c-1, k+1))
        board[r][c] = word[k]                 # unchoose: khôi phục
        return found
    return any(dfs(r, c, 0) for r in range(m) for c in range(n))
```
```javascript
function exist(board, word) {
    const m = board.length, n = board[0].length;
    function dfs(r, c, k) {
        if (k === word.length) return true;
        if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== word[k]) return false;
        const tmp = board[r][c];
        board[r][c] = "#";                    // choose
        const found = dfs(r+1, c, k+1) || dfs(r-1, c, k+1) ||
                      dfs(r, c+1, k+1) || dfs(r, c-1, k+1);
        board[r][c] = tmp;                    // unchoose
        return found;
    }
    for (let r = 0; r < m; r++)
        for (let c = 0; c < n; c++)
            if (dfs(r, c, 0)) return true;
    return false;
}
```
```java
static boolean exist(char[][] board, String word) {
    int m = board.length, n = board[0].length;
    for (int r = 0; r < m; r++)
        for (int c = 0; c < n; c++)
            if (dfs(board, word, r, c, 0)) return true;
    return false;
}
static boolean dfs(char[][] b, String w, int r, int c, int k) {
    if (k == w.length()) return true;
    if (r < 0 || r >= b.length || c < 0 || c >= b[0].length || b[r][c] != w.charAt(k))
        return false;
    char tmp = b[r][c];
    b[r][c] = '#';                            // choose
    boolean found = dfs(b, w, r+1, c, k+1) || dfs(b, w, r-1, c, k+1)
                 || dfs(b, w, r, c+1, k+1) || dfs(b, w, r, c-1, k+1);
    b[r][c] = tmp;                            // unchoose
    return found;
}
```
```go
func exist(board [][]byte, word string) bool {
    m, n := len(board), len(board[0])
    var dfs func(r, c, k int) bool
    dfs = func(r, c, k int) bool {
        if k == len(word) {
            return true
        }
        if r < 0 || r >= m || c < 0 || c >= n || board[r][c] != word[k] {
            return false
        }
        tmp := board[r][c]
        board[r][c] = '#'                     // choose
        found := dfs(r+1, c, k+1) || dfs(r-1, c, k+1) ||
            dfs(r, c+1, k+1) || dfs(r, c-1, k+1)
        board[r][c] = tmp                     // unchoose
        return found
    }
    for r := 0; r < m; r++ {
        for c := 0; c < n; c++ {
            if dfs(r, c, 0) {
                return true
            }
        }
    }
    return false
}
```

```cpp
bool exist(vector<vector<char>>& board, string word) {
    int m = board.size(), n = board[0].size();
    function<bool(int, int, int)> dfs = [&](int r, int c, int k) -> bool {
        if (k == (int)word.size()) return true;                 // khớp hết word
        if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] != word[k])
            return false;                                       // ra ngoài / không khớp -> cắt
        char tmp = board[r][c];
        board[r][c] = '#';                                      // choose: đánh dấu đã thăm
        bool found = dfs(r+1, c, k+1) || dfs(r-1, c, k+1) ||
                     dfs(r, c+1, k+1) || dfs(r, c-1, k+1);
        board[r][c] = tmp;                                      // unchoose: khôi phục
        return found;
    };
    for (int r = 0; r < m; r++)
        for (int c = 0; c < n; c++)
            if (dfs(r, c, 0)) return true;
    return false;
}
```

**Phân tích độ phức tạp.** Có `m·n` điểm xuất phát; mỗi đường đi rẽ tối đa 4 hướng và dài tối đa `L = len(word)` → **`O(m · n · 4^L)`** thời gian (thực tế nhỏ hơn nhiều nhờ cắt khi không khớp). Bộ nhớ phụ `O(L)` cho độ sâu đệ quy (không kể stack ghi đè in-place).

**Bẫy.** (1) Quên khôi phục ô (`unchoose`) → các đường đi sau bị chặn sai, hoặc cùng ô bị tính nhiều lần. (2) Dùng `visited` set nhưng quên xoá khi quay lui. (3) Kiểm tra biên *sau* khi truy cập `board[r][c]` → lỗi out-of-bounds; phải kiểm tra biên *trước*. (4) Với bài 212 (tìm nhiều từ), đừng chạy 79 cho từng từ — dùng **Trie** để gộp.

## 5. Sai lầm thường gặp & cách tránh

> Bẫy 1 — Quên `unchoose`. Đây là lỗi số 1. Sau `backtrack()` mà không pop/gỡ dấu, `path` mang rác sang nhánh kế, kết quả sai hoàn toàn. **Cách tránh:** viết `choose` và `unchoose` *thành cặp đối xứng ngay lập tức*, đặt sát hai bên lời gọi đệ quy.

> Bẫy 2 — Lưu tham chiếu thay vì copy. `res.append(path)` (không có `[:]`) lưu *con trỏ* tới cùng một list; khi `path` bị sửa tiếp, mọi phần tử trong `res` thay đổi theo. **Cách tránh:** luôn copy (`path[:]`, `[...path]`, `new ArrayList<>(path)`, `append([]int{}, path...)`) khi ghi nhận lời giải.

> Bẫy 3 — Nhầm `start` với `used[]`. Tổ hợp/tập con dùng `start` (chỉ tiến); hoán vị dùng `used[]` (được quay lại). Lẫn lộn → hoặc thiếu nghiệm, hoặc sinh nghiệm trùng. **Cách tránh:** hỏi "thứ tự có quan trọng không?" — có thì `used[]`, không thì `start`.

> Bẫy 4 — Không khử trùng khi input có phần tử lặp. Subsets II / Permutations II / Comb Sum II cần **sort trước** và **bỏ qua phần tử trùng cùng cấp** (`if i > start and a[i] == a[i-1]: continue`). **Cách tránh:** thấy đề nói "mảng có thể có phần tử trùng" + "không lời giải trùng" là phản xạ sort + dedup.

> Bẫy 5 — Không pruning → TLE. Vét cạn thuần trên `n` lớn sẽ quá hạn. **Cách tránh:** luôn tự hỏi "nhánh nào chắc chắn vô vọng?" và cắt tại node (constraint/bound pruning), sort để `break` sớm.

> Bẫy 6 — Dùng backtracking cho bài DP. Đề hỏi "bao nhiêu cách"/"giá trị tối ưu" mà không cần liệt kê → backtracking sẽ mũ và TLE. **Cách tránh:** nhận diện đúng — đếm/tối ưu + bài con trùng lặp = DP.

> Bẫy 7 — Đệ quy quá sâu / tràn stack. Với `n` không quá nhỏ và ngôn ngữ giới hạn stack (Python ~1000), cần để ý độ sâu. **Cách tránh:** backtracking vốn chỉ dùng khi `n` nhỏ; nếu `n` lớn mà vẫn cần liệt kê, xem lại đề — thường đề ngầm cho `n` nhỏ.

## 6. Checklist tự luyện

Luyện theo thứ tự từ gốc tới biến thể; mỗi bài tự hỏi "khung nào? `start` hay `used[]`? cắt nhánh ở đâu? copy chưa?".

- [ ] **78. Subsets** — *pattern: subsets / start*. Khung gốc, ghi nhận ở mọi node.
- [ ] **90. Subsets II** — *subsets + dedup*. Sort + bỏ qua trùng cùng cấp.
- [ ] **46. Permutations** — *permutations / used[]*. Khung hoán vị cơ bản.
- [ ] **47. Permutations II** — *permutations + dedup*. Sort + `used[i-1]` để khử trùng.
- [ ] **77. Combinations** — *combinations / start + k*. Dừng khi đủ `k`, cắt khi không đủ phần tử còn lại.
- [ ] **39. Combination Sum** — *combination sum*. `start`, truyền lại `i`, trừ target.
- [ ] **40. Combination Sum II** — *comb sum + dedup*. `i+1` + dedup cùng cấp.
- [ ] **22. Generate Parentheses** — *generate / ràng buộc khi build*. Đếm `open/close`, cắt `close>open`.
- [ ] **131. Palindrome Partitioning** — *partitioning*. Cắt tại mọi vị trí, kiểm tra palindrome.
- [ ] **79. Word Search** — *grid DFS*. 4 hướng + đánh dấu/khôi phục.
- [ ] **51. N-Queens** — *constraint*. Đặt theo hàng, 3 set kiểm tra chéo/cột O(1).
- [ ] **37. Sudoku Solver** — *constraint / exact cover*. Tìm ô trống, thử 1–9, validate, quay lui.
- [ ] **212. Word Search II** — *grid DFS + Trie*. Gộp nhiều từ bằng Trie (nâng cao).

> Ghi nhớ cuối bài: Đừng học thuộc từng lời giải. Thuộc **một** khung choose–explore–unchoose, rồi với mỗi bài chỉ trả lời 3 câu: *(1) khi nào ghi nhận lời giải? (2) tập lựa chọn hợp lệ tại node là gì — `start` hay `used[]`? (3) cắt nhánh ở đâu?* Trả lời được ba câu này là code gần như tự viết ra.
