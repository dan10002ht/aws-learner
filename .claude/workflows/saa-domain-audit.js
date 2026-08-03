/**
 * Deep per-domain coverage audit of SAA-C03 lessons.
 * Reads /tmp/saa-audit-job.json = { dir, domains:[{id,name,weight,lessons[],checklist[]}] }
 * One auditor agent per domain: reads all lessons, cross-checks vs task-statement checklist,
 * returns structured gaps. No file writes — pure analysis.
 */
export const meta = {
  name: "saa-domain-audit",
  description: "Deep coverage audit of SAA-C03 lessons per domain vs official task statements",
  phases: [{ title: "Audit", detail: "One auditor per domain cross-checks lessons vs checklist" }],
};

phase("Audit");

const job = await agent(
  `Read /tmp/saa-audit-job.json and return it verbatim as { dir, domains }.`,
  { label: "load-audit-job", phase: "Audit", schema: {
    type: "object",
    properties: { dir: { type: "string" }, domains: { type: "array", items: { type: "object" } } },
    required: ["dir", "domains"],
  } }
);

const FINDING = {
  type: "object",
  properties: {
    domain: { type: "string" },
    verdict: { type: "string", enum: ["solid", "minor-gaps", "needs-work"] },
    coverageScore: { type: "number" },
    wellCovered: { type: "array", items: { type: "string" } },
    thin: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, note: { type: "string" }, lesson: { type: "string" } }, required: ["topic", "note"] } },
    missing: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, why: { type: "string" }, recommendation: { type: "string" } }, required: ["topic", "recommendation"] } },
    summary: { type: "string" },
  },
  required: ["domain", "verdict", "coverageScore", "thin", "missing", "summary"],
};

const results = await parallel(
  job.domains.map((d) => () =>
    agent(
      `Bạn là chuyên gia luyện thi AWS SAA-C03, soát ĐỘ PHỦ của một domain bài học so với đề thi thật.

DOMAIN: ${d.name} (${d.weight})
CÁC BÀI (đọc TOÀN BỘ bằng Read tool):
${d.lessons.map((l) => `- ${job.dir}/${l}.md`).join("\n")}

CHECKLIST phải phủ (theo task statements + dịch vụ in-scope, consensus đề thi):
${d.checklist.map((c, i) => `${i + 1}. ${c}`).join("\n")}

NHIỆM VỤ: Với từng mục checklist, xác định nội dung bài đã phủ TỐT / MỎNG (nhắc qua loa, thiếu bảng so sánh, thiếu tình huống chọn dịch vụ) / THIẾU HẲN. Đánh giá cả:
- Có đủ các BẢNG SO SÁNH / decision cho các cặp exam hay hỏi trong domain không?
- Độ sâu có xứng weight ${d.weight} không? (D1 30% và D2 26% cần dày nhất.)
- Có khái niệm nào SAI hoặc lỗi thời không?

Trả JSON đúng schema: verdict (solid | minor-gaps | needs-work), coverageScore (0-100), wellCovered (danh sách chủ đề phủ tốt), thin (mỗi item: topic + note + lesson nếu biết), missing (mỗi item: topic + why quan trọng + recommendation cụ thể: thêm vào bài nào / tách bài mới), summary (2-3 câu). CHỈ báo gap THẬT, đừng bịa; nếu domain đã tốt thì nói rõ.`,
      { label: `audit:${d.id}`, phase: "Audit", schema: FINDING, effort: "high" }
    )
  )
);

const findings = results.filter(Boolean);
for (const f of findings) log(`${f.domain}: ${f.verdict} (${f.coverageScore}/100) — thin:${f.thin.length} missing:${f.missing.length}`);
return { findings };
