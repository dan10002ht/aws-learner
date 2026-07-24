/**
 * Generic lesson-authoring workflow (reused across courses).
 * Reads a job file /tmp/course-job.json = { styleRef, courseName, lessons: [{slug,title,file,focus}] }
 * Each lesson: 1 author agent (follows styleRef) -> 1 critic agent (verify concept + SVG rules).
 * fs is unavailable in workflow scripts, so a loader agent reads the job file.
 */

export const meta = {
  name: "author-course",
  description: "Author course lessons in parallel (author -> critic verify), reading job from /tmp/course-job.json",
  phases: [
    { title: "Author", detail: "One agent writes each lesson following the course style-ref" },
    { title: "Verify", detail: "Critic checks concept accuracy + SVG rules + code" },
  ]
};

const jobFile = "/tmp/course-job.json";

phase("Author");

const job = await agent(
  `Read the JSON file ${jobFile} and return its content EXACTLY as an object { "styleRef": <string>, "courseName": <string>, "lessons": <array of {slug,title,file,focus}> }.`,
  { label: "load-job", phase: "Author", schema: {
    type: "object",
    properties: {
      styleRef: { type: "string" },
      courseName: { type: "string" },
      lessons: { type: "array", items: { type: "object" } }
    },
    required: ["styleRef", "lessons"]
  } }
);
const styleRef = job.styleRef;
const courseName = job.courseName || "course";
const lessons = job.lessons || [];

log(`✍️  Authoring ${lessons.length} lessons for "${courseName}" (parallel + critic)\n`);

const RULES = `
QUY CHUẨN BÀI HỌC (bắt buộc theo đúng bài mẫu ${styleRef} — ĐỌC nó trước để nắm tông giọng, cấu trúc, cách vẽ SVG):
- Ngôn ngữ: TIẾNG VIỆT cho giảng giải; giữ NGUYÊN thuật ngữ tiếng Anh (partition, quorum, consumer group, pod...).
- Cấu trúc: # H1 "Bài N — ..." (đúng title); ## Mục tiêu; ## Lý thuyết (analogy đời thường + giải thích BẢN CHẤT, không hời hợt); bảng so sánh khi hợp; ví dụ/tình huống thực tế & con số; ## Tóm tắt; 1 dòng "> Bài tiếp theo" nếu hợp.
- Độ dài ~180-300 dòng, CHẤT LƯỢNG chuyên sâu (fundamental -> expert), chính xác kỹ thuật, KHÔNG qua loa.
- CODE: nếu bài về công cụ/cấu hình/lệnh (Redis/Kafka/k8s YAML/gRPC/SQL...) thì PHẢI có code/command/config block đúng cú pháp, chạy được, có giải thích. Course "chuẩn chỉ để làm được việc".
- SƠ ĐỒ inline SVG (1-3 cái khi khái niệm cần hình): theme-aware — chữ & viền dùng fill/stroke="currentColor" (KHÔNG đặt color trên <svg>); nền khối tint mờ cố định (xanh #3b82f6, lục #10b981, hổ phách #f59e0b, tím #8b5cf6, teal #14b8a6, hồng #f43f5e; fill-opacity ~0.14). Root có viewBox + style="width:100%;max-width:Npx;height:auto;display:block;margin:1.25rem auto". BẮT BUỘC <title> + <desc> (aria-labelledby).
- ⚠️ TỐI QUAN TRỌNG: khối <svg> LIỀN MẠCH, TUYỆT ĐỐI KHÔNG có dòng trống bên trong <svg>...</svg> (dòng trống làm vỡ render). Trong text/nhãn KHÔNG để ký tự & thô — viết "và" hoặc dùng &amp;.
- Chọn ĐÚNG idiom sơ đồ: node-edge cho topology/replication, sequence cho luồng/handshake, stacked/box cho cấu trúc/layer, state-machine cho vòng đời, before/after cho tốt-vs-xấu. Đừng vẽ cho có.
`;

const results = await pipeline(
  lessons,
  async (lsn) => {
    await agent(
      `Bạn là chuyên gia hệ phân tán/hạ tầng viết một bài học chất lượng cao cho course "${courseName}".

BÀI CẦN VIẾT:
- Slug: ${lsn.slug}
- Tiêu đề: ${lsn.title}
- Trọng tâm nội dung: ${lsn.focus}
- GHI file vào: lessons/${lsn.file}

Đầu tiên ĐỌC bài mẫu ${styleRef}.
${RULES}
Viết bài đầy đủ, chính xác, chuyên sâu rồi GHI vào lessons/${lsn.file}. Xong in "DONE ${lsn.slug}".`,
      { label: `author:${lsn.slug}`, phase: "Author" }
    );
    return lsn;
  },
  async (lsn) => {
    const verdict = await agent(
      `Phản biện bài học vừa viết tại lessons/${lsn.file} (chủ đề: ${lsn.title}).

Kiểm tra & TỰ SỬA file nếu có lỗi:
1. Chính xác kỹ thuật: có sai khái niệm không? (vd nhầm CAP, sai cơ chế Raft, sai lệnh kafka/redis/kubectl, sai YAML). Sửa nếu sai.
2. SVG: mọi khối <svg> KHÔNG được có dòng trống bên trong; phải có <title>; chữ/viền dùng currentColor; KHÔNG có ký tự & thô trong text (đổi thành &amp; hoặc "và").
3. Code/command/config: cú pháp đúng, chạy được, hợp lý.
4. Đủ độ sâu, tiếng Việt + thuật ngữ Anh, có Mục tiêu + Tóm tắt.

Sửa trực tiếp vào file nếu cần. Trả JSON: { slug, ok, svgCount, issuesFixed: [..] }`,
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
