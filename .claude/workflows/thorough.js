export const meta = {
  name: 'thorough',
  description: 'Spec-driven, coverage-complete pipeline: biến một requirement (kể cả mơ hồ) thành công việc làm TỚI NƠI, tự kiểm — chống "qua loa". Liệt kê hết item, mỗi item 1 agent tươi, phản biện theo tiêu chí, gate khách quan + tự sửa, completeness loop-until-dry. Ghi artifact ra đĩa, chỉ trả manifest nhỏ.',
  phases: [
    { title: 'Spec' },          // requirement -> tiêu chí nghiệm thu kiểm được
    { title: 'Scan' },          // đọc outDir -> item đã xong (resume best-effort)
    { title: 'Decompose' },     // spec -> liệt kê TẤT CẢ item (cấm cắt im lặng)
    { title: 'Execute' },       // pipeline: produce -> verify (per item), tự sửa bounded
    { title: 'Gate' },          // chạy lệnh gate khách quan 1 lần + self-repair
    { title: 'Completeness' },  // critic so với spec, loop-until-dry (bounded)
    { title: 'Report' },        // ghi manifest.json, trả tóm tắt nhỏ
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// args = {
//   requirement: "Mô tả việc cần làm (có thể chung chung / end-to-end)",   // BẮT BUỘC
//   outDir:   ".claude/thorough-out/<slug>",   // nơi agent ghi artifact + manifest (mặc định .claude/thorough-out)
//   depth:    "thấu đáo, không cắt xén..."      // mức sâu mong muốn (anti qua-loa)
//   gateCmd:  "cd web && npm run build"          // (tuỳ chọn) lệnh gate KHÁCH QUAN; có thì bắt buộc pass
//   maxRounds: 3,           // số vòng completeness-critic tối đa
//   repair:    2,           // số lần tự sửa tối đa cho gate + cho verify-fail
//   isolation: "worktree",  // (tuỳ chọn) nếu produce SỬA FILE repo song song -> tránh đụng nhau
//   context:  "ghi chú/ràng buộc bổ sung, link tài liệu..."
// }
// Đầu ra trả về context của orchestrator CHỈ là manifest nhỏ — nội dung thật nằm ở outDir.
// ─────────────────────────────────────────────────────────────────────────────

const A = typeof args === 'string' ? JSON.parse(args) : (args || {})
const REQ = A.requirement || A.req
if (!REQ) throw new Error('args.requirement là bắt buộc (mô tả việc cần làm)')
const OUTDIR = A.outDir || '.claude/thorough-out'
const DEPTH = A.depth || 'Làm THẤU ĐÁO, không cắt xén. Ưu tiên đầy đủ & đúng hơn ngắn gọn. Không bỏ sót trường hợp biên.'
const GATE = A.gateCmd || ''
const MAX_ROUNDS = Number.isFinite(A.maxRounds) ? A.maxRounds : 3
const REPAIR = Number.isFinite(A.repair) ? A.repair : 2
const ISO = A.isolation === 'worktree' ? 'worktree' : undefined
const CTX = A.context ? `\n\nNgữ cảnh/ràng buộc bổ sung:\n${A.context}` : ''
// Ngưỡng token tối thiểu để mở thêm 1 vòng việc (chỉ áp dụng khi user đặt budget).
const FLOOR = 80_000
const haveBudget = () => !budget.total || budget.remaining() > FLOOR

// ── Schemas ──────────────────────────────────────────────────────────────────
const SPEC = {
  type: 'object',
  properties: {
    goal: { type: 'string' },
    criteria: { type: 'array', items: { type: 'string' } },   // tiêu chí nghiệm thu KIỂM ĐƯỢC
    assumptions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['goal', 'criteria'],
}
const DONE = { type: 'object', properties: { doneIds: { type: 'array', items: { type: 'string' } } }, required: ['doneIds'] }
const ITEMS = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' } },
        required: ['id', 'title', 'scope'],
      },
    },
    droppedNote: { type: 'string' },  // nếu có giới hạn gì thì NÓI RA, không cắt im lặng
  },
  required: ['items'],
}
const PRODUCED = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    summary: { type: 'string' },          // 1-2 câu, KHÔNG dán toàn bộ nội dung
    artifactPath: { type: 'string' },
    status: { type: 'string', enum: ['done', 'needs-attention'] },
  },
  required: ['id', 'summary', 'status'],
}
const VERDICT = {
  type: 'object',
  properties: { pass: { type: 'boolean' }, unmet: { type: 'array', items: { type: 'string' } } },
  required: ['pass'],
}
const GATER = { type: 'object', properties: { pass: { type: 'boolean' }, log: { type: 'string' } }, required: ['pass'] }
const GAPS = {
  type: 'object',
  properties: {
    missing: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' } },
        required: ['id', 'title', 'scope'],
      },
    },
  },
  required: ['missing'],
}
const REPORT = {
  type: 'object',
  properties: {
    manifestPath: { type: 'string' },
    doneCount: { type: 'integer' },
    needsAttention: { type: 'array', items: { type: 'string' } },
    criteriaMet: { type: 'array', items: { type: 'string' } },
    criteriaUnmet: { type: 'array', items: { type: 'string' } },
  },
  required: ['manifestPath', 'doneCount'],
}

// ── Phase 1: Spec — biến requirement (mơ hồ) thành tiêu chí kiểm được ─────────
phase('Spec')
const spec = await agent(
  `Bạn là tech lead. Biến requirement dưới đây thành SPEC rõ ràng + danh sách TIÊU CHÍ NGHIỆM THU KIỂM ĐƯỢC (mỗi tiêu chí phải kiểm tra được khách quan, tránh chung chung). Nêu giả định & rủi ro nếu requirement mơ hồ.\n\nRequirement:\n${REQ}${CTX}\n\nMức sâu yêu cầu: ${DEPTH}`,
  { label: 'spec', phase: 'Spec', schema: SPEC, effort: 'high' }
)
if (!spec) throw new Error('Spec phase thất bại')
log(`Spec: ${spec.goal} — ${spec.criteria.length} tiêu chí nghiệm thu`)
const criteriaText = spec.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')

// ── Phase 2: Scan — item nào đã xong từ lần chạy trước (resume best-effort) ───
phase('Scan')
const scan = await agent(
  `Đọc thư mục "${OUTDIR}" (dùng Bash: ls/cat; nếu không tồn tại thì trả doneIds rỗng). Nếu có file manifest.json thì lấy danh sách id đã hoàn tất (status=done). Trả {doneIds:[...]}.`,
  { label: 'scan', phase: 'Scan', schema: DONE }
)
const doneSet = new Set((scan && scan.doneIds) || [])
if (doneSet.size) log(`Resume: bỏ qua ${doneSet.size} item đã xong`)

// ── Phase 3: Decompose — liệt kê TẤT CẢ item (cấm cắt im lặng) ────────────────
phase('Decompose')
const decomp = await agent(
  `Dựa trên spec, CHIA công việc thành danh sách item ĐỘC LẬP, đầy đủ để phủ HẾT spec.\n\nMục tiêu: ${spec.goal}\nTiêu chí nghiệm thu:\n${criteriaText}\n\nYÊU CẦU:\n- Liệt kê TẤT CẢ item cần làm — KHÔNG giới hạn top-N, KHÔNG cắt bớt.\n- Nếu buộc phải giới hạn vì lý do nào đó, ghi rõ ở droppedNote (cấm cắt im lặng).\n- id: kebab-case ỔN ĐỊNH suy từ tên item (để lần chạy sau resume khớp).\n- scope: nói rõ item này phải làm gì để coi là "xong".${CTX}`,
  { label: 'decompose', phase: 'Decompose', schema: ITEMS, effort: 'high' }
)
if (!decomp || !decomp.items.length) throw new Error('Decompose không ra item nào')
if (decomp.droppedNote) log(`⚠️ Decompose lưu ý giới hạn: ${decomp.droppedNote}`)
const todo = decomp.items.filter((it) => !doneSet.has(it.id))
log(`Decompose: ${decomp.items.length} item tổng, ${todo.length} cần làm (đã xong ${decomp.items.length - todo.length})`)

// ── Phase 4: Execute — pipeline produce -> verify (mỗi item 1 agent tươi) ─────
// pipeline KHÔNG có barrier: item B verify trong khi item C còn produce.
phase('Execute')
const executed = await pipeline(
  todo,
  // Stage 1: produce — làm TỚI NƠI, ghi artifact ra đĩa, chỉ trả manifest nhỏ.
  (it) => agent(
    `Thực hiện work-item sau TỚI NƠI TỚI CHỐN theo spec. ${DEPTH}\n\nItem [${it.id}] ${it.title}\nScope: ${it.scope}\n\nTiêu chí nghiệm thu (phải thoả phần liên quan):\n${criteriaText}\n\nQuy tắc:\n- Làm thật (đọc/sửa/tạo file trong repo nếu cần). KHÔNG mô tả suông thay cho việc làm.\n- GHI kết quả/artifact vào "${OUTDIR}/${it.id}..." (tạo thư mục nếu chưa có) HOẶC sửa trực tiếp file repo nếu là task code.\n- TRẢ VỀ chỉ manifest nhỏ: {id, summary (1-2 câu), artifactPath, status}. TUYỆT ĐỐI không dán toàn bộ nội dung vào kết quả.${CTX}`,
    { label: `do:${it.id}`, phase: 'Execute', schema: PRODUCED, effort: 'high', isolation: ISO }
  ),
  // Stage 2: verify — phản biện theo tiêu chí; fail thì tự sửa bounded rồi verify lại.
  async (prod, it) => {
    if (!prod) return { id: it.id, status: 'needs-attention', summary: 'produce trả null', pass: false }
    let cur = prod
    for (let attempt = 0; attempt <= REPAIR; attempt++) {
      const v = await agent(
        `Bạn là reviewer KHÓ TÍNH. Mặc định NGHI NGỜ. Đối chiếu kết quả của item [${it.id}] "${it.title}" (artifact: ${cur.artifactPath || 'sửa trong repo'}) với tiêu chí nghiệm thu — đọc artifact/file thật bằng Bash/Read để kiểm.\n\nTiêu chí:\n${criteriaText}\n\nLiệt kê tiêu chí nào CHƯA đạt (unmet). Trả {pass, unmet}.`,
        { label: `verify:${it.id}#${attempt}`, phase: 'Execute', schema: VERDICT }
      )
      if (!v || v.pass) return { ...cur, pass: true, status: cur.status === 'needs-attention' ? 'needs-attention' : 'done' }
      if (attempt === REPAIR) return { ...cur, pass: false, status: 'needs-attention', unmet: v.unmet }
      // tự sửa rồi verify lại
      await agent(
        `Item [${it.id}] CHƯA đạt các tiêu chí sau:\n${(v.unmet || []).map((u) => '- ' + u).join('\n')}\nSửa artifact/file để đạt. Giữ nguyên đường dẫn. Trả lại {id, summary, artifactPath, status}.`,
        { label: `fix:${it.id}#${attempt}`, phase: 'Execute', schema: PRODUCED, effort: 'high', isolation: ISO }
      ).then((r) => { if (r) cur = r })
    }
    return cur
  }
)
const results = executed.filter(Boolean)

// ── Phase 5: Gate — lệnh khách quan chạy 1 LẦN + self-repair (nếu có gateCmd) ─
phase('Gate')
let gateState = 'skipped'
if (GATE) {
  for (let attempt = 0; attempt <= REPAIR; attempt++) {
    const g = await agent(
      `Chạy lệnh gate khách quan và đọc kết quả (Bash):\n\n${GATE}\n\nTrả {pass, log}. log = phần lỗi quan trọng (cắt gọn) nếu fail.`,
      { label: `gate#${attempt}`, phase: 'Gate', schema: GATER }
    )
    if (!g || g.pass) { gateState = g && g.pass ? 'pass' : 'unknown'; break }
    if (attempt === REPAIR) { gateState = 'fail'; log('⚠️ Gate vẫn FAIL sau khi tự sửa — đánh dấu needs-attention'); break }
    await agent(
      `Lệnh gate "${GATE}" FAIL. Lỗi:\n${g.log}\n\nSửa code/artifact để qua gate. Sửa thật trong repo, đừng workaround che lỗi.`,
      { label: `gate-fix#${attempt}`, phase: 'Gate', isolation: ISO }
    )
  }
  log(`Gate: ${gateState}`)
}

// ── Phase 6: Completeness — critic so spec, loop-until-dry (bounded) ──────────
phase('Completeness')
let round = 0
let dry = 0
const extra = []
while (round < MAX_ROUNDS && dry < 1 && haveBudget()) {
  round++
  const gap = await agent(
    `Soát toàn bộ kết quả trong "${OUTDIR}" (và các file repo liên quan) so với SPEC. Hỏi: CÒN THIẾU gì để thoả HẾT tiêu chí? (modality chưa làm, trường hợp biên bỏ sót, tiêu chí chưa được phủ, claim chưa kiểm).\n\nMục tiêu: ${spec.goal}\nTiêu chí:\n${criteriaText}\n\nTrả {missing:[{id,title,scope}]}. Nếu không còn thiếu gì, trả missing rỗng. Dùng id kebab-case ổn định, KHÁC các id đã có.`,
    { label: `gap#${round}`, phase: 'Completeness', schema: GAPS, effort: 'high' }
  )
  const missing = (gap && gap.missing) || []
  if (!missing.length) { dry = 1; log(`Completeness vòng ${round}: không còn thiếu → dừng`); break }
  log(`Completeness vòng ${round}: phát hiện ${missing.length} chỗ thiếu → làm tiếp`)
  const more = await pipeline(
    missing,
    (it) => agent(
      `Bổ sung phần CÒN THIẾU TỚI NƠI theo spec. ${DEPTH}\n\nItem [${it.id}] ${it.title}\nScope: ${it.scope}\nTiêu chí:\n${criteriaText}\n\nGhi vào "${OUTDIR}/${it.id}..." hoặc sửa repo. Trả manifest nhỏ {id, summary, artifactPath, status}.${CTX}`,
      { label: `fill:${it.id}`, phase: 'Completeness', schema: PRODUCED, effort: 'high', isolation: ISO }
    ),
    (prod, it) => agent(
      `Reviewer khó tính: item [${it.id}] đã thoả tiêu chí liên quan chưa? Đọc artifact thật. Trả {pass, unmet}.`,
      { label: `vfill:${it.id}`, phase: 'Completeness', schema: VERDICT }
    ).then((v) => ({ ...(prod || { id: it.id, status: 'needs-attention' }), pass: v ? v.pass : false }))
  )
  extra.push(...more.filter(Boolean))
}
if (round >= MAX_ROUNDS && dry === 0) log(`Đạt trần ${MAX_ROUNDS} vòng completeness — dừng (có thể còn chỗ chưa phủ)`)
if (!haveBudget()) log('Chạm ngưỡng budget — dừng completeness sớm')

// ── Phase 7: Report — ghi manifest.json ra đĩa, trả tóm tắt NHỎ ───────────────
phase('Report')
const all = [...results, ...extra]
const report = await agent(
  `Tổng hợp lần chạy này. Quét "${OUTDIR}" + các artifact đã tạo. GHI một file "${OUTDIR}/manifest.json" gồm: goal, criteria, danh sách item {id, status, artifactPath, summary}, gateState=${JSON.stringify(gateState)}.\n\nManifest item (đã làm lần này):\n${JSON.stringify(all.map((r) => ({ id: r.id, status: r.status, pass: r.pass, artifactPath: r.artifactPath, summary: r.summary })))}\n\nTiêu chí nghiệm thu:\n${criteriaText}\n\nĐối chiếu lần cuối: tiêu chí nào ĐÃ đạt, tiêu chí nào CHƯA. Trả {manifestPath, doneCount, needsAttention:[ids], criteriaMet:[...], criteriaUnmet:[...]}.`,
  { label: 'report', phase: 'Report', schema: REPORT, effort: 'high' }
)

return {
  goal: spec.goal,
  outDir: OUTDIR,
  itemsTotal: decomp.items.length,
  ranThisInvocation: all.length,
  gate: gateState,
  completenessRounds: round,
  report: report || { note: 'report agent trả null — xem manifest ở outDir' },
}
