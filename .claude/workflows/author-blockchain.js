/**
 * Workflow: Author BLOCKCHAIN Phase 1 lessons in parallel.
 * Each lesson: 1 author agent (follows style-ref bc-01) -> 1 critic agent (verify).
 * args = { lessons: [{slug, title, file, focus}], styleRef }
 */

export const meta = {
  name: "author-blockchain",
  description: "Author BLOCKCHAIN Phase 1 lessons (fundamental->DeFi) in parallel with critic verify",
  phases: [
    { title: "Author", detail: "One agent writes each lesson following style-ref" },
    { title: "Verify", detail: "Critic checks concept accuracy + SVG rules" },
  ]
};

const styleRef = "lessons/blockchain/bc-01-what-is-blockchain.md";
const listFile = "/tmp/bc-lessons.json";

phase("Author");

// Load the lesson list via an agent (fs not available in workflow scripts)
const loaded = await agent(
  `Read the JSON file ${listFile} and return its content. It is a JSON array of lesson objects (slug, title, file, focus). Return exactly: { "lessons": <that array> }.`,
  { label: "load-list", phase: "Author", schema: {
    type: "object",
    properties: { lessons: { type: "array", items: { type: "object" } } },
    required: ["lessons"]
  } }
);
const lessons = loaded.lessons || [];

log(`✍️  Authoring ${lessons.length} BLOCKCHAIN lessons (parallel + critic)\n`);

const RULES = `
QUY CHUẨN BÀI HỌC (bắt buộc theo đúng bài mẫu ${styleRef} — đọc nó trước):
- Ngôn ngữ: TIẾNG VIỆT cho giảng giải; giữ NGUYÊN thuật ngữ tiếng Anh (hash, nonce, validator, gas...).
- Cấu trúc: # H1 tiêu đề "Bài N — ..." (đúng tên bài); ## Mục tiêu; ## Lý thuyết (có analogy đời thường + giải thích bản chất); bảng so sánh khi hợp; ví dụ/tình huống thực tế; ## Tóm tắt; và 1 dòng "> Bài tiếp theo" nếu hợp.
- Độ dài ~180-280 dòng, CHẤT LƯỢNG chuyên sâu (fundamental->expert), KHÔNG qua loa, chính xác kỹ thuật.
- CODE: nếu bài về Solidity/Foundry/script thì PHẢI có code block đúng cú pháp, chạy được, có giải thích. Đây là course "chuẩn chỉ để làm được việc".
- SƠ ĐỒ inline SVG (1-2 cái nếu khái niệm cần hình): theme-aware — dùng fill/stroke="currentColor" cho chữ & viền (KHÔNG đặt thuộc tính color trên <svg>); nền khối dùng tint mờ cố định (xanh #3b82f6, lục #10b981, hổ phách #f59e0b, tím #8b5cf6, teal #14b8a6, hồng #f43f5e, fill-opacity ~0.14). Root có viewBox + style="width:100%;max-width:Npx;height:auto;display:block;margin:1.25rem auto". BẮT BUỘC có <title> + <desc> (dùng aria-labelledby).
- ⚠️ TỐI QUAN TRỌNG: khối <svg> phải LIỀN MẠCH, TUYỆT ĐỐI KHÔNG có dòng trống bên trong <svg>...</svg> (dòng trống làm vỡ render trong react-markdown). Chọn ĐÚNG idiom: node-edge cho mạng/topology, sequence cho handshake/luồng, stacked/box cho cấu trúc, state-machine cho vòng đời, before/after cho tốt-vs-xấu.
- Chọn đúng loại sơ đồ, đừng vẽ cho có. Nếu bài thuần code có thể không cần SVG.
`;

// Pipeline: author then critic per lesson (no barrier between lessons)
const results = await pipeline(
  lessons,
  // Stage 1: author
  async (lsn) => {
    await agent(
      `
Bạn là chuyên gia blockchain viết một bài học chất lượng cao cho course "BLOCKCHAIN — từ nền tảng đến chuyên gia".

BÀI CẦN VIẾT:
- Slug: ${lsn.slug}
- Tiêu đề: ${lsn.title}
- Trọng tâm nội dung: ${lsn.focus}
- Ghi file vào: lessons/${lsn.file}

Đầu tiên ĐỌC bài mẫu ${styleRef} để nắm tông giọng, cấu trúc, cách vẽ SVG.
${RULES}

Viết bài đầy đủ, chính xác, chuyên sâu rồi GHI vào lessons/${lsn.file}. Sau khi ghi xong in "DONE ${lsn.slug}".
      `,
      { label: `author:${lsn.slug}`, phase: "Author" }
    );
    return lsn;
  },
  // Stage 2: critic verify
  async (lsn) => {
    const verdict = await agent(
      `
Phản biện bài học vừa viết tại lessons/${lsn.file} (chủ đề: ${lsn.title}).

Kiểm tra & TỰ SỬA file nếu có lỗi:
1. Chính xác kỹ thuật: có sai khái niệm blockchain nào không? (vd nhầm PoW/PoS, sai công thức, sai cú pháp Solidity). Sửa nếu sai.
2. SVG: mọi khối <svg> KHÔNG được có dòng trống bên trong (nếu có, xoá hết dòng trống trong khối đó). Phải có <title>. Kiểm currentColor cho chữ/viền.
3. Code: nếu có code Solidity/bash, cú pháp đúng & hợp lý.
4. Đủ độ sâu, đúng tiếng Việt + thuật ngữ tiếng Anh, có Mục tiêu + Tóm tắt.

Sửa trực tiếp vào file nếu cần. Trả JSON: { slug, ok (true nếu đạt sau sửa), svgCount, issuesFixed: [..] }
      `,
      { label: `verify:${lsn.slug}`, phase: "Verify", schema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          ok: { type: "boolean" },
          svgCount: { type: "number" },
          issuesFixed: { type: "array" }
        },
        required: ["slug", "ok"]
      } }
    );
    log(`${verdict.ok ? "✓" : "✗"} ${lsn.slug} (${verdict.svgCount ?? 0} SVG${verdict.issuesFixed && verdict.issuesFixed.length ? ", sửa " + verdict.issuesFixed.length : ""})`);
    return verdict;
  }
);

const ok = results.filter(r => r && r.ok).length;
log(`\n✅ Hoàn tất: ${ok}/${lessons.length} bài đạt\n`);

return { authored: results.filter(Boolean).map(r => ({ slug: r.slug, ok: r.ok, svgCount: r.svgCount })), total: lessons.length, ok };
