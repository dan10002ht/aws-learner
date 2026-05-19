# AWS Learner — Web

Next.js + TypeScript + Tailwind app for learning AWS (book + practice + exam).

## Cấu trúc

- `app/` — Next.js App Router pages
  - `book/` — Lý thuyết, render từ Markdown trong `../lessons/`
  - `practice/` — Luyện tập, có giải thích ngay sau mỗi câu
  - `exam/` — Thi thử có timer, nộp bài cuối mới chấm
  - `history/` — Lịch sử các lần làm bài (localStorage)
  - `wrong-answers/` — Tự động gom câu sai để ôn lại
- `components/` — Navbar, QuestionCard, Timer, Runner
- `data/` — Bộ câu hỏi internal (`questions.ts`), metadata bài/chương/bộ
- `lib/` — Types, storage (localStorage), question builder, markdown reader

## Chạy local

```bash
cd web
npm install
npm run dev
```

Mở http://localhost:3000.

## Thêm câu hỏi

Mở `data/questions.ts` và push thêm object kiểu `Question`:

```ts
{
  id: "clf-05-008",          // unique
  lesson: "05-s3",           // slug khớp với data/lessons.ts
  certifications: ["CLF-C02"],
  difficulty: "medium",
  type: "single",            // hoặc "multi"
  question: "...",
  options: ["A", "B", "C", "D"],
  correctIndices: [2],        // index (0-based) của đáp án đúng
  explanation: "...",         // hiển thị sau khi trả lời
}
```

Câu hỏi tự động được gom vào các bộ phù hợp (theo lesson, chapter, certification).
