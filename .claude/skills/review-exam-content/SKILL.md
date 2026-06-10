---
name: review-exam-content
description: Reviews the AWS question banks and lessons in this repo against the exam blueprint and quality bar — runs a deterministic structural check (per-mock domain mix, multi-response ratio, difficulty spread, duplicates, per-lesson coverage, shuffle-safe explanations, valid answers) and an LLM spot-check of correctness, then reports pass/fail and offers fixes. Use when asked to review/audit/QA the questions, mocks, or lessons, to check whether a course's practice content is exam-ready or best-practice, or before shipping a freshly generated bank.
---

# Review exam content

Audit the generated content against the gate and report what's wrong. **Read [.claude/skills/_shared/exam-content-conventions.md](.claude/skills/_shared/exam-content-conventions.md) first** for the quality targets and data layout.

## Procedure

1. **Deterministic structural check** — run the checker:
   ```
   node .claude/skills/review-exam-content/scripts/check.mjs [COURSE_ID]
   ```
   It reports, per mock: count, multi-response ratio, domain mix vs blueprint, difficulty spread; plus per-lesson coverage, in-mock duplicates, invalid `correctIndices`, and shuffle-unsafe (letter-referencing) explanations. Exit code 1 = a hard gate failed.
   Summarise the output for the user, separating **issues** (gate violations) from **warnings**.

2. **LLM quality spot-check** (sampling — the structural script can't judge correctness). Load the bank, sample ~10–15 questions (spread across domains/difficulty, and any flagged by step 1). For each, verify against current AWS knowledge:
   - Is the keyed answer actually correct — and for associate, the *optimal* of the workable options?
   - Are all distractors genuinely wrong/sub-optimal?
   - Is it scenario-style (not bare recall) and unambiguous?
   - Is the explanation accurate and shuffle-safe (`✓`/`✗` by content, no letters)?
   For a thorough/"deep" review, use a `Workflow` to verify many questions in parallel (one adversarial verifier per batch) instead of sampling.

3. **Lessons (if in scope):** check each lesson markdown exists, is non-trivial (not a placeholder), and that the chapter structure follows the blueprint domain order and weighting (see how `web/data/lessons.ts` is organised). Flag domains under-covered relative to their weight.

4. **Report** against the gate in the conventions doc. Be honest: state clearly whether it PASSES or what fails, with specific ids/mocks. Don't claim "all good" if the checker found issues.

5. **Offer to fix.** Most structural issues are fixable without regenerating:
   - Multi-ratio off → invoke `author-exam-content` to rewrite a few multi↔single on the same topic, or re-balance the `mock` assignment by round-robining multi/single separately within each domain.
   - In-mock duplicate → drop/replace one.
   - Letter-referencing explanation → rewrite to `✓`/`✗`-by-content.
   - Domain mix off / thin lesson → generate the missing questions via `author-exam-content`.
   Re-run the checker after fixing; `cd web && npm run build` must still pass.

## Notes

- The checker parses `web/data/generatedQuestions.ts` (valid JSON array). The 51 legacy curated CLF questions in `questions.ts` are not checked — that's fine, they're a small minority.
- Warnings (e.g. concept overlap across *different* mocks) are acceptable; only same-mock duplicates and out-of-band multi-ratios are hard issues.
