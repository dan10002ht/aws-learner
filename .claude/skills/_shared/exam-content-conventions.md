# AWS exam-content conventions (shared reference)

Conventions for authoring and reviewing the question banks and lessons in this repo.
Both the `author-exam-content` and `review-exam-content` skills rely on this file.

## Where things live

| What | Path |
|---|---|
| `Question` type | `web/lib/types.ts` |
| Generated question bank (append here) | `web/data/generatedQuestions.ts` |
| Curated legacy questions + merge | `web/data/questions.ts` (`questions = [...curated, ...generated]`) |
| Lessons + chapters | `web/data/lessons.ts` |
| Mock-set derivation, blueprint exam | `web/data/sets.ts` |
| Build/shuffle/sample logic, domain weights | `web/lib/questions.ts` |
| Lesson markdown | `lessons/<course-slug>/*.md` (e.g. `lessons/clf-c02/…`, `lessons/saa-c03/…`) |

`web/data/generatedQuestions.ts` is `export const generatedQuestions: Question[] = [ <pure JSON array> ];`.
The array is valid JSON (no comments) — parse by slicing from the first `[` after `=` to the final `];`.

## Question shape (must match `Question` in types.ts)

```jsonc
{
  "id": "clf-m1-001",          // see id scheme below — unique
  "courseId": "CLF-C02",       // CLF-C02 | SAA-C03 | DVA-C02 | SOA-C02 | SAP-C02
  "lesson": "03-iam",          // a lesson slug that exists in lessons.ts for this course
  "certifications": ["CLF-C02"],
  "difficulty": "medium",      // easy | medium | hard
  "type": "single",            // single = 1 correct of 4; multi = 2+ correct of 5
  "question": "…scenario…",
  "options": ["…", "…", "…", "…"],
  "correctIndices": [1],        // 0-based indices into options
  "explanation": "…",           // shuffle-safe format, see below
  "domain": 2,                  // blueprint content domain 1–4
  "mock": 1                     // fixed mock number; omit for lesson-only fill questions
}
```

## id scheme

- Mock questions: `<prefix>-m<N>-<seq3>` → `clf-m1-001`, `saa-m3-064`.
- Lesson-fill (no mock): `<prefix>-ext-<seq3>` → `clf-ext-012`.
- Prefix: `clf` (CLF-C02), `saa` (SAA-C03), `dva`, `soa`, `sap`.
- `seq3` is zero-padded per (mock) and unique.

## Explanation format — shuffle-safe (REQUIRED)

Options are shuffled at runtime, so NEVER reference answers by letter (A/B/C/D). Reference by **content**.

- Line 1: one sentence summarising why the correct answer is correct.
- Then one line per important option, starting with `✓ ` (correct) or `✗ ` (wrong/sub-optimal), referencing the option by content.
- Lines separated by `\n`.

Example: `"Auto Scaling cung cấp elasticity.\n✓ Auto Scaling — đúng, scale theo tải.\n✗ Reserved Instance — chỉ là mô hình giá."`

The renderer ([web/components/QuestionCard.tsx](web/components/QuestionCard.tsx)) splits on `\n` and colours `✓`/`✗` lines. A single-line explanation renders as a paragraph (acceptable fallback).

## Blueprint domain weights (fraction of scored content)

Defined in `DOMAIN_WEIGHTS` in [web/lib/questions.ts](web/lib/questions.ts). Keep in sync if adding a course.

| Course | D1 | D2 | D3 | D4 |
|---|---|---|---|---|
| CLF-C02 | 0.24 Cloud Concepts | 0.30 Security & Compliance | 0.34 Cloud Tech & Services | 0.12 Billing/Pricing/Support |
| SAA-C03 | 0.30 Secure | 0.26 Resilient | 0.24 High-Performing | 0.20 Cost-Optimized |

A 65-question mock therefore targets: CLF ≈ 16/19/22/8; SAA ≈ 20/17/16/12.

## Quality targets (the gate)

Structural (deterministic — `review-exam-content` checks these):
- Each mock ≈ `examQuestions` (65); within ±2 is fine.
- Per-mock domain mix within ±1–2 of the blueprint targets above.
- Multi-response ratio **10–15%** per mock (aim ~10–12%).
- Difficulty mix: CLF ~30% easy / 55% medium / 15% hard; SAA ~20/55/25 (associate is harder).
- Every lesson slug has **≥ 8** practice questions across the bank.
- No two questions with identical normalised text **within the same mock**.
- `correctIndices` in range; `single` → exactly 1, `multi` → ≥ 2.
- Explanations are shuffle-safe (no `A/B/C/D` letter references).

Quality (judgement — needs an LLM/adversarial pass):
- Correct answer is genuinely correct (and for associate, the *optimal* of several workable options).
- Distractors are plausible real AWS services but wrong/sub-optimal.
- Scenario style, not bare definition recall. Aligned to current exam trends.

## Generation pattern (proven: generate → adversarially verify → assemble)

Use the `Workflow` tool. One pipeline per blueprint task-statement:
1. **Generate** N scenario questions for a (domain, lesson, task-statement) with the exact counts so per-domain totals hit the blueprint weighting.
2. **Verify** (adversarial reviewer agent): check correctness, distractor validity, shuffle-safe explanation, difficulty; fix or drop.
3. **Assemble**: collect, then assign mocks by **round-robin within each domain** so every mock is blueprint-balanced. For even multi/single spread, round-robin multi and single separately within each domain.

Always force structured output via the agent `schema` option. Decode HTML entities (`&gt; &lt; &amp; &#39;`) in returned text before writing. Then append objects to `generatedQuestions.ts` and run `cd web && npm run build`.

## Researching a course blueprint (official source)

Fetch the AWS exam guide and extract domains + weights + task statements + in-scope services:
- CLF-C02: `https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html` (+ `-domain1..4.md`)
- SAA-C03 / others: `https://docs.aws.amazon.com/aws-certification/latest/examguides/solutions-architect-associate-03.html`
- Also web-search current trends ("CLF-C02 commonly tested 2026", new services like Bedrock/Amazon Q, edge, cost emphasis).

## Multi-language code tabs (Programming / DSA / CS)

For lessons that teach language-agnostic concepts (Programming, DSA, some CS),
code examples render as language **tabs** via `rehypeCodeTabs` + `CodeTabs.tsx`.
To produce a tab group, emit **adjacent fenced code blocks of distinct
programming languages** (separated only by blank lines — no prose between them).
The plugin groups any run of 2+ distinct tabbable languages.

- **Standard order: `python` → `javascript` → `java` → `go` → `cpp`** (all five).
  C++ (`cpp` → label "C++") is part of the standard set — include it.
- Tabbable langs: python, javascript, typescript, java, go, cpp, c, ruby, php,
  kotlin, swift, rust. Shell/yaml/json/text blocks never group (safe for AWS lessons).
- All language versions must be equivalent (same logic/output) with matching
  Vietnamese comments.
