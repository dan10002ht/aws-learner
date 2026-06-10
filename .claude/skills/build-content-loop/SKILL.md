---
name: build-content-loop
description: Builds a large AWS exam content set incrementally, one part at a time, with durable on-disk state so the work spans many turns/sessions instead of one overloaded context. Each invocation advances exactly ONE part — author it, review it against the gate, checkpoint, and report — then stops. Pair with /loop to auto-pace, or re-run to resume. Use when building or expanding a whole course's question bank/lessons, or any content job too big for a single context.
---

# Build content loop (incremental, part-by-part, resumable)

Do large content builds the safe way: **one part per invocation**, each part taken to "done" (authored → reviewed → passes gate) before moving on, with progress persisted to disk so a fresh context/session can resume. This avoids cramming an entire course build into one context window.

Companion skills: [author-exam-content](.claude/skills/author-exam-content/SKILL.md) (does the authoring) and [review-exam-content](.claude/skills/review-exam-content/SKILL.md) (the gate). Read [.claude/skills/_shared/exam-content-conventions.md](.claude/skills/_shared/exam-content-conventions.md) for shapes/targets.

## State

Plan/manifest lives at `.claude/content-plan/<COURSE>.json`, managed by the helper:
```
node .claude/skills/build-content-loop/scripts/plan.mjs status <COURSE>
node .claude/skills/build-content-loop/scripts/plan.mjs next   <COURSE>       # first unfinished part (exit 3 = all done)
node .claude/skills/build-content-loop/scripts/plan.mjs mark   <COURSE> <id> <status> [note]
```
Statuses: `pending` → `in-progress` → `done`, or `needs-fix` (retry next time) / `needs-attention` (gave up, surfaces to user).

## Procedure — each invocation does ONE part

1. **No plan yet?** Build it first (one-time):
   - Research the blueprint (per `author-exam-content`): domains, weights, task statements, trends.
   - Decide part granularity so each part fits a context. Defaults:
     - Questions: **one part per (mock, domain)** chunk, or per mock if small.
     - Lessons: **one part per chapter** (or per lesson).
   - `plan.mjs init <COURSE> "m1-d1|questions|mock1 domain1 (~16 q)" "m1-d2|questions|..." ...`
   - Then stop and report the plan, or continue to step 2 if the user wants you to start.

2. **Pick the next part:** `plan.mjs next <COURSE>`. If it prints `DONE`, report completion and stop (and if under `/loop`, end the loop). Mark it `in-progress`.

3. **Author that part only** (scope from the part): generate + adversarially verify just this part's questions/lesson via the `author-exam-content` workflow pattern. Decode entities, assign ids, append to `web/data/generatedQuestions.ts` (or write the lesson markdown). Keep the JSON you hold to just this part.

4. **Review that part (gate):** run the checker
   `node .claude/skills/review-exam-content/scripts/check.mjs <COURSE>`
   and spot-check the new part's correctness. `cd web && npm run build` must pass.
   - Gate passes → `plan.mjs mark <COURSE> <id> done`.
   - Fixable miss → fix now, re-review; still failing after one fix → `mark … needs-attention` and explain.

5. **Checkpoint & report:** print `plan.mjs status <COURSE>` (X/N done) and what's next. Commit this part if the user wants per-part commits. **Then STOP** — one part per invocation.

## Pacing across contexts

- **Auto:** `/loop /build-content-loop <COURSE>` (no interval) self-paces — each turn advances one part on a fresh-ish context until `next` reports DONE. End the loop when done or when a part hits `needs-attention`.
- **Manual/resumable:** just re-run this skill later; it reads the manifest and continues. Safe across sessions because all state is on disk, not in context.

## Why this shape

Authoring + reviewing + fixing an entire course in one session fills the context and degrades quality. Splitting into checkpointed parts keeps each unit small and verifiable, makes failures local and resumable, and lets the gate run per part instead of only at the end.
