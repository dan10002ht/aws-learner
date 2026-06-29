# orchestrate-with-progress

**Run background workflows with realtime progress monitoring.**

Combines Workflow (efficient parallel execution) + Loop (realtime progress watch) into one unified interface. Natural language parsing auto-detects task type, course, parameters — no JSON config needed.

## Usage

```bash
/orchestrate-with-progress "task description in natural language"
```

## Examples

### Translate questions
```bash
/orchestrate-with-progress "translate CLF-C02 questions to English, keep explanation in Vietnamese"
```
Auto-detects: course=CLF-C02, task=translate, language=English, explanation=Vietnamese

### Author questions
```bash
/orchestrate-with-progress "author 60 questions for SAA-C03 domain 1, difficulty mix easy/medium/hard"
```
Auto-detects: course=SAA-C03, domain=1, task=author, count=60, difficulty=mixed

### Review content
```bash
/orchestrate-with-progress "review CLF-C02 questions for domain mix, difficulty spread, and duplicates"
```
Auto-detects: course=CLF-C02, task=review, checks=[domain, difficulty, duplicates]

### Illustrate lessons
```bash
/orchestrate-with-progress "illustrate BACKEND course lessons with SVG diagrams"
```
Auto-detects: course=BACKEND, task=illustrate

## What it does

1. **Parse** natural language → task type, course, parameters
2. **Auto-setup** workflow template (translate / author / review / illustrate)
3. **Create durable state** (plan file on disk)
4. **Launch workflow** background (Workflow tool, parallel agents, efficient)
5. **Launch loop** realtime watch (poll plan file, report progress every 60s)
6. **Report** when complete

## Under the hood

- Workflow: batch-by-batch processing (e.g. 120 questions/batch), agents run parallel per batch
- Loop: check plan file status, print progress (Batch 1: done, Batch 2: in-progress, Batch 3: pending)
- Durable: both workflow + loop update/read same plan file on disk

## Supported task types

- `translate` — translate questions/content to target language
- `author` — generate new questions for exam course
- `review` — audit/QA content against checklist
- `illustrate` — add diagrams/visuals to lessons

## Extensibility

Add new task types by:
1. Create `templates/<task-type>.js` (workflow template)
2. Add parser rules in `lib/parse.js`
3. Reuse `watch-progress.mjs` loop for any task
