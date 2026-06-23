export const meta = {
  name: 'illustrate',
  description: 'Thêm sơ đồ minh hoạ (inline SVG, theme-aware) cho các bài học CẦN — survey từng course để chọn bài & khái niệm, author SVG theo style chuẩn rồi chèn vào .md, gate build + render-SVG, completeness. Không over-illustrate, không bỏ sót bài cần.',
  phases: [
    { title: 'Survey' },        // mỗi course 1 agent: bài nào CẦN diagram + khái niệm gì
    { title: 'Author' },        // mỗi bài 1 agent: vẽ inline SVG + chèn vào .md (produce -> verify)
    { title: 'Gate' },          // build + check-svg.mjs (mọi SVG render OK, có <title>) + self-repair
    { title: 'Completeness' },  // critic: còn bài rõ ràng cần mà chưa có?
    { title: 'Report' },
  ],
}

// args = {
//   courses: ["FOUNDATIONS", ...] | "all",   // phạm vi (mặc định "all")
//   styleRef: "lessons/engineering/eng-osi-model.md",  // bài chuẩn style để noi theo
//   gateCmd: "cd web && npm run build && cd .. && node .claude/workflows/check-svg.mjs",
//   maxRounds: 1, repair: 2,
// }
const A = typeof args === 'string' ? JSON.parse(args) : (args || {})
const COURSES = Array.isArray(A.courses) ? A.courses : null   // null = để survey tự liệt kê tất cả
const STYLE_REF = A.styleRef || 'lessons/engineering/eng-osi-model.md'
const GATE = A.gateCmd || 'cd web && npm run build > /tmp/illus-build.log 2>&1 && echo BUILD_OK && cd /Users/dantt1002/projects/aws && node .claude/workflows/check-svg.mjs'
const MAX_ROUNDS = Number.isFinite(A.maxRounds) ? A.maxRounds : 1
const REPAIR = Number.isFinite(A.repair) ? A.repair : 2
const FLOOR = 80_000
const haveBudget = () => !budget.total || budget.remaining() > FLOOR

// ── Style guide mọi agent author phải tuân ───────────────────────────────────
const STYLE = `QUY CHUẨN SVG (BẮT BUỘC — đọc bài mẫu ${STYLE_REF} để noi theo):
- Inline <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"> ... </svg>
- BẮT BUỘC có <title> và <desc> tiếng Việt (accessibility + gate kiểm).
- MÀU THEO THEME: chữ & viền dùng fill="currentColor"/stroke="currentColor" (KHÔNG đặt thuộc tính color trên <svg> để nó kế thừa màu chữ của bài → tự đổi sáng/tối). Nền khối dùng tint MỜ cố định để hợp cả 2 theme: xanh #3b82f6, lục #10b981, hổ phách #f59e0b, tím #8b5cf6 với fill-opacity 0.12–0.16; badge nhỏ có thể tô đặc + chữ #fff.
- Chữ rõ: font-size 11–15, nhãn tiếng Việt CÓ DẤU, đúng nội dung bài (không bịa).
- Chèn ngay cạnh đoạn/khái niệm liên quan; chừa 1 dòng trống trước & sau <svg>. Có thể thay sơ đồ ASCII cũ bằng SVG nếu rõ hơn, nhưng GIỮ nguyên mọi nội dung chữ khác.
- KHÔNG dùng <img>/ảnh ngoài, KHÔNG \\n thừa làm vỡ markdown, KHÔNG HTML entity (&lt; &gt;).`

// ── Catalog idiom: CHỌN ĐÚNG LOẠI sơ đồ theo bản chất quan hệ (chống "bê 1 kiểu") ──
const IDIOM = `CHỌN LOẠI SƠ ĐỒ theo cách giới chuyên môn THƯỜNG vẽ khái niệm đó (đừng mặc định thanh ngang cho mọi thứ):
- Tầng/lớp NGANG HÀNG (OSI, network stack) → stacked layers (KHÔNG phải pyramid — pyramid chỉ cho thứ bậc độ lớn).
- Bọc/đóng gói (encapsulation, header lồng) → hộp LỒNG NHAU.
- Handshake/giao thức theo thời gian (TCP 3-way, TLS, OAuth flow) → SEQUENCE diagram (hai cột, mũi tên qua lại, thời gian đi xuống).
- Topology/kiến trúc/thành phần nối nhau (VPC, microservices, LB→servers) → NODE–EDGE graph.
- Trade-off 3 chiều (CAP) → TAM GIÁC; tập hợp giao nhau → VENN.
- Phân cấp/cha-con (DOM, IAM, thư mục) → CÂY (tree).
- Vòng đời/trạng thái (message, TCP states, pod) → STATE MACHINE (node trạng thái + mũi tên có nhãn).
- Chuỗi theo thời gian (failover, request timeline, CI/CD) → TIMELINE ngang.
- Tốt vs xấu / trước vs sau → BEFORE/AFTER hai cột.
- Pipeline/luồng xử lý → FLOW trái→phải có mũi tên.
- So sánh N phương án → các cột song song cùng cấu trúc.
Nếu một bài có nhiều khái niệm khác loại → mỗi cái một sơ đồ ĐÚNG idiom của nó, đừng ép chung một khuôn.`

const SURVEY = {
  type: 'object',
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' }, file: { type: 'string' }, reason: { type: 'string' },
          diagrams: {
            type: 'array',
            items: { type: 'object', properties: { concept: { type: 'string' }, placement: { type: 'string' } }, required: ['concept'] },
          },
        },
        required: ['slug', 'file', 'diagrams'],
      },
    },
  },
  required: ['lessons'],
}
const AUTHORED = {
  type: 'object',
  properties: {
    slug: { type: 'string' }, file: { type: 'string' }, added: { type: 'integer' },
    summary: { type: 'string' }, status: { type: 'string', enum: ['done', 'needs-attention'] },
  },
  required: ['slug', 'added', 'status'],
}
const VERDICT = { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['ok'] }
const GATER = { type: 'object', properties: { pass: { type: 'boolean' }, log: { type: 'string' } }, required: ['pass'] }
const GAPS = { type: 'object', properties: { missing: { type: 'array', items: { type: 'object', properties: { slug: { type: 'string' }, file: { type: 'string' }, concept: { type: 'string' } }, required: ['slug', 'file', 'concept'] } } }, required: ['missing'] }
const REPORT = { type: 'object', properties: { lessonsIllustrated: { type: 'integer' }, svgsAdded: { type: 'integer' }, needsAttention: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } }, required: ['lessonsIllustrated', 'svgsAdded'] }

// ── Phase 1: Survey — bài nào CẦN diagram (mỗi course 1 agent) ────────────────
phase('Survey')
let courseList = COURSES
if (!courseList) {
  const cl = await agent(
    `Liệt kê tất cả courseId trong web/data/lessons.ts (Bash: grep -oE 'courseId: "[A-Z0-9-]+"' rồi sort -u). Trả {lessons:[]} KHÔNG cần — chỉ in danh sách courseId, mỗi dòng một id.`,
    { label: 'list-courses', phase: 'Survey' }
  )
  courseList = (cl || '').split('\n').map((s) => s.trim()).filter((s) => /^[A-Z0-9-]+$/.test(s))
}
log(`Survey ${courseList.length} course: ${courseList.join(', ')}`)

const surveyed = await parallel(courseList.map((course) => () =>
  agent(
    `Bạn là biên tập sư phạm. Với course "${course}":\n1. Lấy danh sách bài: Bash \`grep '"${course}"' web/data/lessons.ts\` để có slug + file (trường file là đường dẫn dưới lessons/).\n2. ĐỌC từng bài (Read lessons/<file>).\n3. Quyết định bài nào THỰC SỰ CẦN sơ đồ minh hoạ để dễ hiểu hơn (kiến trúc, luồng, phân tầng, quan hệ, vòng đời, so sánh không gian...). KHÔNG ép diagram cho bài thuần văn/lý thuyết mà sơ đồ không thêm giá trị.\n4. Với mỗi bài cần: nêu concept cần vẽ + placement (chèn ở đâu).\n\nTrả {lessons:[{slug,file,reason,diagrams:[{concept,placement}]}]}. Bài không cần thì BỎ khỏi danh sách (đừng liệt kê). Không lười: bài nào CẢM GIÁC cần là thêm.`,
    { label: `survey:${course}`, phase: 'Survey', schema: SURVEY, effort: 'high' }
  )
))
const todo = surveyed.filter(Boolean).flatMap((r) => r.lessons || [])
const totalDiagrams = todo.reduce((n, l) => n + (l.diagrams ? l.diagrams.length : 0), 0)
log(`Survey xong: ${todo.length} bài cần minh hoạ, ~${totalDiagrams} sơ đồ`)
if (!todo.length) return { lessonsIllustrated: 0, svgsAdded: 0, note: 'Không bài nào cần thêm sơ đồ.' }

// ── Phase 2: Author — mỗi bài 1 agent (produce -> verify) ─────────────────────
phase('Author')
const authored = await pipeline(
  todo,
  (l) => agent(
    `Thêm sơ đồ minh hoạ cho bài "${l.slug}" (file: lessons/${l.file}).\n\nCần vẽ:\n${(l.diagrams || []).map((d, i) => `${i + 1}. ${d.concept}${d.placement ? ' — chèn: ' + d.placement : ''}`).join('\n')}\n\n${IDIOM}\n\n${STYLE}\n\nQuy trình: Read bài + Read ${STYLE_REF} (mẫu) → với MỖI concept, CHỌN idiom đúng (xem catalog trên) rồi soạn inline SVG đúng nội dung bài → Edit chèn vào đúng chỗ. Mỗi sơ đồ phải render được (xmlns đúng, đóng thẻ đủ) và có <title>. Trả {slug, file, added (số svg đã thêm), summary, status}. KHÔNG dán toàn bộ SVG vào kết quả.`,
    { label: `draw:${l.slug}`, phase: 'Author', schema: AUTHORED, effort: 'high' }
  ),
  async (prod, l) => {
    if (!prod) return { slug: l.slug, file: l.file, added: 0, status: 'needs-attention', summary: 'produce null' }
    let cur = prod
    for (let attempt = 0; attempt <= REPAIR; attempt++) {
      const v = await agent(
        `Bạn là DESIGN-CRITIC khó tính. Kiểm sơ đồ vừa thêm vào bài "${l.slug}" (Read lessons/${l.file}; nên render thử: trích <svg>..</svg> ra /tmp rồi \`rsvg-convert\`). Tiêu chí:\n- ĐÚNG IDIOM: loại sơ đồ có khớp bản chất khái niệm theo cách giới chuyên môn thường vẽ không? (handshake/giao thức → SEQUENCE chứ KHÔNG phải bars; topology → node-edge; vòng đời → state machine; trade-off 3 chiều → tam giác; phân cấp → cây; bọc gói → hộp lồng; tầng ngang hàng → stacked, KHÔNG pyramid). Sai loại = FAIL.\n- Mỗi <svg> render được, có <title>, dùng currentColor cho chữ/viền (không có thuộc tính color trên <svg>), tint mờ cho nền.\n- Nội dung ĐÚNG với bài, nhãn tiếng Việt có dấu, không chữ chồng/tràn, không vỡ markdown.\nTrả {ok, issues}. Nếu sai idiom hoặc rối, ok=false và nêu loại sơ đồ ĐÚNG nên dùng.`,
        { label: `chk:${l.slug}#${attempt}`, phase: 'Author', schema: VERDICT }
      )
      if (!v || v.ok) return { ...cur, status: cur.status === 'needs-attention' ? 'needs-attention' : 'done' }
      if (attempt === REPAIR) return { ...cur, status: 'needs-attention', summary: (cur.summary || '') + ' | issues: ' + (v.issues || []).join('; ') }
      await agent(
        `Sơ đồ trong bài "${l.slug}" còn lỗi:\n${(v.issues || []).map((x) => '- ' + x).join('\n')}\nSửa trong lessons/${l.file}. ${STYLE}\nTrả {slug, file, added, summary, status}.`,
        { label: `redraw:${l.slug}#${attempt}`, phase: 'Author', schema: AUTHORED, effort: 'high' }
      ).then((r) => { if (r) cur = r })
    }
    return cur
  }
)
const results = authored.filter(Boolean)

// ── Phase 3: Gate — build + check-svg, self-repair ───────────────────────────
phase('Gate')
let gateState = 'unknown'
for (let attempt = 0; attempt <= REPAIR; attempt++) {
  const g = await agent(
    `Chạy gate và đọc kết quả (Bash):\n\n${GATE}\n\nPhải thấy BUILD_OK và dòng "✓ ... inline SVG đều render OK". Trả {pass, log} (log = lỗi quan trọng nếu fail).`,
    { label: `gate#${attempt}`, phase: 'Gate', schema: GATER }
  )
  if (!g || g.pass) { gateState = g && g.pass ? 'pass' : 'unknown'; break }
  if (attempt === REPAIR) { gateState = 'fail'; log('⚠️ Gate vẫn FAIL sau tự sửa'); break }
  await agent(
    `Gate FAIL:\n${g.log}\nSửa các SVG/markdown gây lỗi trong lessons/**/*.md (svg không render được, thiếu <title>, hoặc build lỗi). Sửa thật.`,
    { label: `gate-fix#${attempt}`, phase: 'Gate' }
  )
}
log(`Gate: ${gateState}`)

// ── Phase 4: Completeness — còn bài rõ ràng cần mà chưa có? (bounded) ─────────
phase('Completeness')
let round = 0, dry = 0
while (round < MAX_ROUNDS && dry < 1 && haveBudget()) {
  round++
  const gap = await agent(
    `Trong phạm vi các course [${courseList.join(', ')}], soát lại: còn bài nào RÕ RÀNG cần sơ đồ mà CHƯA có inline <svg> không? (Bash: với từng file, grep -L '<svg' để tìm bài chưa có; rồi đọc nhanh bài đó xem có thực sự cần.) Chỉ kể bài thực sự cần. Trả {missing:[{slug,file,concept}]}, rỗng nếu không còn.`,
    { label: `gap#${round}`, phase: 'Completeness', schema: GAPS, effort: 'high' }
  )
  const missing = (gap && gap.missing) || []
  if (!missing.length) { dry = 1; break }
  log(`Completeness vòng ${round}: thêm ${missing.length} bài`)
  const more = await pipeline(
    missing,
    (m) => agent(
      `Thêm sơ đồ cho bài "${m.slug}" (lessons/${m.file}) — concept: ${m.concept}.\n${STYLE}\nRead bài + ${STYLE_REF}, soạn inline SVG, Edit chèn. Trả {slug,file,added,summary,status}.`,
      { label: `fill:${m.slug}`, phase: 'Completeness', schema: AUTHORED, effort: 'high' }
    )
  )
  results.push(...more.filter(Boolean))
}

// ── Phase 5: Report ──────────────────────────────────────────────────────────
phase('Report')
const rep = await agent(
  `Tổng hợp lần chạy thêm sơ đồ. Số bài đã thêm: ${results.length}. Chi tiết (JSON):\n${JSON.stringify(results.map((r) => ({ slug: r.slug, added: r.added, status: r.status })))}\n\nChạy lại \`node .claude/workflows/check-svg.mjs\` để lấy tổng số SVG. Trả {lessonsIllustrated, svgsAdded, needsAttention:[slug...], note}.`,
  { label: 'report', phase: 'Report', schema: REPORT, effort: 'high' }
)

return {
  scope: courseList,
  lessonsConsidered: todo.length,
  gate: gateState,
  completenessRounds: round,
  report: rep || { lessonsIllustrated: results.length, svgsAdded: 0, note: 'report null — xem git diff' },
}
