export const meta = {
  name: 'knowledge-quiz',
  description: 'Generate + adversarially verify practice quizzes for one knowledge course (params via args)',
  phases: [
    { title: 'Generate', detail: 'one agent per lesson, reads markdown, writes N questions' },
    { title: 'Verify', detail: 'adversarial reviewer per lesson: correctness, distractors, shuffle-safe, diacritics' },
  ],
}

// args = {
//   courseId: 'TECH-101', prefix: 'tech', subject: 'Máy tính & Internet',
//   dir: '/abs/path/lessons/starter', perLesson: 13,
//   lessons: [{ slug, title }, ...],
//   guidance: 'optional extra instruction, e.g. interview-style trade-off for DSA/System Design'
// }
// Read the whole job from /tmp/quiz-job.json (fs unavailable in workflow scripts,
// so a loader agent reads it). Avoids args-size/mangling issues for big courses.
const JOBFILE = '/tmp/quiz-job.json'
phase('Generate')
const A = await agent(
  `Read the JSON file ${JOBFILE} and return its content EXACTLY as an object with keys: courseId (string), prefix (string), subject (string), dir (string), perLesson (number), guidance (string, may be empty), lessons (array of {slug,title}).`,
  { label: 'load-quiz-job', phase: 'Generate', schema: {
    type: 'object',
    properties: {
      courseId: { type: 'string' }, prefix: { type: 'string' }, subject: { type: 'string' },
      dir: { type: 'string' }, perLesson: { type: 'number' }, guidance: { type: 'string' },
      lessons: { type: 'array', items: { type: 'object' } },
    },
    required: ['courseId', 'prefix', 'subject', 'dir', 'lessons'],
  } }
)
if (!A || !Array.isArray(A.lessons)) throw new Error('lessons missing from job file')
log(`Quiz job: ${A.courseId} — ${A.lessons.length} lessons, ${A.perLesson || 13}/lesson`)
const PER = A.perLesson || 13
const NMULTI = Math.max(1, Math.round(PER * 0.15))
const GUID = A.guidance ? '\n- ' + A.guidance : ''

const QSCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lesson: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          type: { type: 'string', enum: ['single', 'multi'] },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctIndices: { type: 'array', items: { type: 'integer' } },
          explanation: { type: 'string' },
        },
        required: ['lesson', 'difficulty', 'type', 'question', 'options', 'correctIndices', 'explanation'],
      },
    },
  },
  required: ['questions'],
}

const genPrompt = (l) => `Bạn là người soạn câu hỏi trắc nghiệm ôn tập cho khoá học "${A.subject}" (tiếng Việt).
Đọc bài học tại file: ${A.dir}/${l.slug}.md (dùng Read tool, đọc TOÀN BỘ).

Soạn CHÍNH XÁC ${PER} câu hỏi trắc nghiệm CHỈ dựa trên nội dung bài "${l.title}" (slug: ${l.slug}).

Yêu cầu BẮT BUỘC:
- type "single" = đúng 1 đáp án trong 4 lựa chọn; type "multi" = >=2 đáp án đúng trong 5 lựa chọn.
- Phân bổ: đúng ${NMULTI} câu "multi", còn lại "single".
- Độ khó: ~30% easy, ~50% medium, ~20% hard.
- KIỂM TRA UNDERSTANDING, không học vẹt: ưu tiên tình huống "kết quả là gì", "chọn cách đúng cho yêu cầu", "tìm/sửa lỗi", "khi nào dùng X vs Y", trade-off. Hạn chế câu định nghĩa khô khan.${GUID}
- Mọi câu hỏi/lựa chọn/giải thích viết tiếng Việt CÓ DẤU đầy đủ (KHÔNG viết không dấu).
- explanation shuffle-safe: dòng 1 tóm tắt vì sao đáp án đúng; sau đó mỗi dòng quan trọng bắt đầu bằng "✓ " (đúng) hoặc "✗ " (sai), tham chiếu lựa chọn theo NỘI DUNG, TUYỆT ĐỐI không nhắc chữ cái A/B/C/D. Các dòng ngăn bằng \\n.
- correctIndices là chỉ số 0-based vào mảng options.
- Nếu có code, giữ ngắn gọn; viết "<" và ">" trực tiếp, KHÔNG dùng &lt; &gt;.
- "lesson" của mọi câu = "${l.slug}".

Trả về object {questions:[...]} đúng ${PER} phần tử.`

const verifyPrompt = (l, json) => `Bạn là reviewer khó tính kiểm định bộ câu hỏi cho bài "${l.title}" (${l.slug}) thuộc khoá "${A.subject}".
Đối chiếu nội dung bài tại ${A.dir}/${l.slug}.md (Read tool).

Dưới đây là ${json.length} câu hỏi cần kiểm định (JSON):
${JSON.stringify(json)}

Với từng câu, kiểm tra & SỬA nếu sai:
1. Đáp án đúng phải THỰC SỰ đúng; correctIndices khớp nội dung.
2. single = đúng 1 chỉ số; multi = >=2 chỉ số. Distractor hợp lý nhưng sai.
3. explanation shuffle-safe: KHÔNG nhắc chữ cái A/B/C/D; có dòng ✓/✗ theo nội dung.
4. Tiếng Việt CÓ DẤU đầy đủ (sửa nếu thấy chữ không dấu). Không để &lt; &gt; &amp;.
5. Không trùng lặp câu hỏi.
Giữ nguyên trường "lesson" = "${l.slug}". Loại câu sai không sửa được (cố giữ đủ ~${PER}).
Trả về {questions:[...]} đã làm sạch.`

const results = await pipeline(
  A.lessons,
  (l) => agent(genPrompt(l), { label: 'gen:' + l.slug, phase: 'Generate', schema: QSCHEMA })
            .then((r) => ({ l, questions: (r && r.questions) || [] })),
  (prev, l) => {
    if (!prev || !prev.questions.length) return { l, questions: [] }
    return agent(verifyPrompt(l, prev.questions), { label: 'verify:' + l.slug, phase: 'Verify', schema: QSCHEMA })
             .then((r) => ({ l, questions: (r && r.questions) || prev.questions }))
  }
)

const out = []
let seq = 0
for (const r of results.filter(Boolean)) {
  for (const q of r.questions) {
    seq++
    out.push({
      id: A.prefix + '-q-' + String(seq).padStart(3, '0'),
      courseId: A.courseId,
      lesson: q.lesson || r.l.slug,
      certifications: [A.courseId],
      difficulty: q.difficulty,
      type: q.type,
      question: q.question,
      options: q.options,
      correctIndices: q.correctIndices,
      explanation: q.explanation,
    })
  }
}
const perLesson = {}
for (const q of out) perLesson[q.lesson] = (perLesson[q.lesson] || 0) + 1
log(A.courseId + ' assembled: ' + out.length + ' — ' + JSON.stringify(perLesson))
return { courseId: A.courseId, prefix: A.prefix, count: out.length, perLesson, questions: out }
