/**
 * Enrich existing SAA-C03 lessons with audit-identified gaps (surgical inserts).
 * Reads /tmp/saa-enrich-job.json = { dir, items:[{file, tasks[]}] }
 * One editor agent per file (edits in place) -> one critic verify per file.
 */
export const meta = {
  name: "saa-enrich",
  description: "Insert audit-identified gap content into existing SAA-C03 lessons, then verify",
  phases: [
    { title: "Enrich", detail: "One editor per lesson adds the missing sections/tables" },
    { title: "Verify", detail: "Critic checks additions are correct, well-placed, no breakage" },
  ],
};

phase("Enrich");
const job = await agent(
  `Read /tmp/saa-enrich-job.json and return it verbatim as { dir, items }.`,
  { label: "load-enrich-job", phase: "Enrich", schema: {
    type: "object",
    properties: { dir: { type: "string" }, items: { type: "array", items: { type: "object" } } },
    required: ["dir", "items"],
  } }
);

const RULES = `
QUY TẮC BẮT BUỘC:
- ĐỌC toàn bộ file trước bằng Read. CHỈ CHÈN THÊM nội dung (dùng Edit), TUYỆT ĐỐI KHÔNG xoá/viết lại phần đang có (trừ khi task nói rõ 'SỬA').
- Chèn ĐÚNG CHỖ hợp lý (đúng section được gợi ý), giữ mạch bài. Đánh số mục nếu bài đang đánh số.
- Match style bài SAA: tiếng Việt, thuật ngữ dịch vụ AWS giữ tiếng Anh; dùng BẢNG so sánh Markdown cho các cặp decision; callout '> 🪤 Bẫy thi:' và '> 💡' khi hợp; nội dung CHÍNH XÁC & cập nhật (kiến thức AWS tới 2025).
- Nếu thêm SVG: theme-aware (fill/stroke currentColor cho chữ/viền, nền tint mờ cố định, có xmlns + viewBox + <title>), KHÔNG dòng trống trong <svg>, KHÔNG ký tự & thô trong text (dùng 'và' hoặc &amp;). Đa số task chỉ cần BẢNG, không cần SVG.
- Chính xác kỹ thuật là số 1. Ngắn gọn, đúng trọng tâm exam, không lan man.
`;

const results = await pipeline(
  job.items,
  async (it) => {
    await agent(
      `Bạn là chuyên gia luyện thi AWS SAA-C03, bổ sung nội dung còn thiếu vào MỘT bài học đã có.

FILE: ${job.dir}/${it.file}

CÁC VIỆC CẦN LÀM (mỗi việc là một bổ sung):
${it.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}
${RULES}
Thực hiện tất cả bằng cách Edit file ${job.dir}/${it.file}. Xong in "DONE ${it.file}".`,
      { label: `enrich:${it.file}`, phase: "Enrich", effort: "high" }
    );
    return it;
  },
  async (it) => {
    const v = await agent(
      `Kiểm định các bổ sung vừa thêm vào ${job.dir}/${it.file} (chủ đề SAA-C03).
Các việc lẽ ra đã làm:
${it.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Kiểm tra & TỰ SỬA file nếu cần:
1. Mỗi việc trên đã được thêm đúng & CHÍNH XÁC kỹ thuật chưa? (không sai khái niệm AWS, không lỗi thời).
2. Nội dung cũ còn nguyên vẹn (không bị xoá nhầm)?
3. SVG (nếu có): không dòng trống trong <svg>, có <title>, currentColor, không & thô.
4. Style khớp bài (bảng Markdown, callout, tiếng Việt + thuật ngữ Anh).
Sửa trực tiếp nếu lỗi. Trả JSON { file, ok, tasksDone (số), issuesFixed:[..] }.`,
      { label: `verify:${it.file}`, phase: "Verify", schema: {
        type: "object",
        properties: { file: { type: "string" }, ok: { type: "boolean" }, tasksDone: { type: "number" }, issuesFixed: { type: "array" } },
        required: ["file", "ok"],
      } }
    );
    log(`${v.ok ? "✓" : "✗"} ${it.file} (${v.tasksDone ?? "?"} tasks${v.issuesFixed && v.issuesFixed.length ? ", sửa " + v.issuesFixed.length : ""})`);
    return v;
  }
);

const ok = results.filter((r) => r && r.ok).length;
log(`\n✅ Enrich xong: ${ok}/${job.items.length} file đạt`);
return { enriched: results.filter(Boolean), ok, total: job.items.length };
