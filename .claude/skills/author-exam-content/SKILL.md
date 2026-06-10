---
name: author-exam-content
description: Authors blueprint-aligned AWS exam questions, mock exams, and lessons for this repo. Researches the official AWS exam guide (domains, weightings, task statements, in-scope services) and current exam trends first, then generates and adversarially verifies scenario questions via a multi-agent workflow and writes them into the data files. Use when asked to add/create questions, mocks, practice sets, a question bank, or lessons for a certification (CLF-C02, SAA-C03, etc.), or to add a new course.
---

# Author exam content

Generate exam questions / mocks / lessons that match the official AWS blueprint and this repo's conventions.

**Always read [.claude/skills/_shared/exam-content-conventions.md](.claude/skills/_shared/exam-content-conventions.md) first** — it has the data-file map, `Question` shape, id scheme, shuffle-safe explanation format, blueprint weights, and quality targets. Do not duplicate that here; follow it.

## Procedure

1. **Clarify scope** if ambiguous: which course, how many mocks × questions (default 65/mock), fixed mocks vs lesson-fill, lessons too?

2. **Research the blueprint (required, every time — do not work from memory).**
   - Fetch the official AWS exam guide for the course (URLs in the conventions doc) and extract: the content domains, their **weighting %**, every **task statement**, and the in-scope services.
   - Web-search **current trends** (e.g. "‹code› commonly tested 2026", newly added services, shifting emphasis). Fold findings into the generation prompts so content stays current.
   - State the domain weighting table back before generating.

3. **Plan counts** so per-domain totals hit the blueprint weighting (see conventions). For N mocks of 65, multiply the per-mock targets by N. Split each domain's count across its task statements.

4. **Generate + verify via the `Workflow` tool** using the pattern in the conventions doc:
   - `pipeline(TASKS, generate, adversarialVerify)` — one task per (domain, lesson, task-statement).
   - Force structured output with the agent `schema` option (the `Question` fields minus id).
   - Generation prompt: scenario style; difficulty mix per course; shuffle-safe explanation (`✓`/`✗` lines, no letters); multi-response only where natural (~1/7).
   - Verify prompt: adversarially check correctness (for associate, the *optimal* option), distractor validity, explanation accuracy + format; fix or drop.
   - Assemble: round-robin **within each domain** to balance mocks; round-robin multi and single **separately** so multi-ratio is even (~10–12%).

5. **Write the output.** Decode HTML entities (`&gt; &lt; &amp; &#39;`) in all returned text. Assign ids per the scheme. Append the objects to `web/data/generatedQuestions.ts` (keep it a valid JSON array inside `= [ … ];`). For lessons, write Markdown to `lessons/<course>/<slug>.md` and add/adjust entries in `web/data/lessons.ts`.

6. **If adding lessons or a new course**, update `web/data/lessons.ts` (chapters ordered by blueprint weight; new chapter ids; lesson `file` paths) and, for a new course, `web/data/courses.ts` (set `status: "available"`) and `DOMAIN_WEIGHTS` in `web/lib/questions.ts`. Mock sets surface automatically from the `mock` field — no UI changes needed.

7. **Verify & finish.** `cd web && npm run build` must pass. Then run the `review-exam-content` skill (or its checker) to confirm the structural gate. Commit only when the user asks; end commit messages with the repo's Co-Authored-By line.

## Notes

- Generation can return large JSON; read the workflow's output file and parse it rather than relying on the truncated notification.
- Mock sets are derived from the `mock` field by `setsForCourse`; the single blueprint "Mô phỏng thi" exam pools all course questions and samples by `DOMAIN_WEIGHTS`.
- Don't hand-write 195 questions inline — that's what the Workflow fan-out is for.
