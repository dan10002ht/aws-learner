# orchestrate-with-progress Skill

Unified orchestration wrapper: **Workflow (efficient) + Loop (realtime watch)** for large content tasks.

## Directory Structure

```
.claude/skills/orchestrate-with-progress/
├── SKILL.md                    # Skill documentation (read by user)
├── index.js                    # Main orchestrate logic + CLI
├── README.md                   # This file
├── lib/
│   ├── parse.js               # Natural language parser
│   ├── config.js              # Task config mapper
│   └── watch-progress.mjs     # Loop script (poll plan file)
└── templates/
    ├── translate-questions.js # Workflow: translate task
    ├── author-questions.js    # Workflow: author task (stub)
    ├── review-content.js      # Workflow: review task (stub)
    └── illustrate-lessons.js  # Workflow: illustrate task (stub)
```

## How it works

### 1. User invokes skill (natural language)
```bash
/orchestrate-with-progress "translate CLF-C02 questions to English, keep explanation in Vietnamese"
```

### 2. Skill parses + sets up
- **index.js**: parse description → detect task type, course, params
- **lib/parse.js**: extract taskType=translate, course=CLF-C02, language=English, etc.
- **lib/config.js**: map to workflow template + plan file

### 3. Skill outputs instructions for Claude
```
Launch Workflow: templates/translate-questions.js (args: {...})
Launch Loop: watch plan file every 60s
```

### 4. Claude runs both in parallel
- **Workflow (background)**: efficient pipeline (batch → 4 agents → merge → gate → update)
- **Loop (realtime)**: poll plan file, print progress

### 5. Both update/read shared durable state
- Plan file: `.claude/content-plan/<COURSE>-<TASK>.json`
- Status: parts[].status = pending/in-progress/done

## Extensibility

To add a new task type:

1. **Parser rule** — add pattern in `lib/parse.js`
2. **Config** — add entry in `lib/config.js` → maps to workflow template
3. **Workflow template** — create `templates/<task-type>.js`
   - Use Workflow DSL: `phase()`, `agent()`, `parallel()`, `pipeline()`
   - Update plan file with part status as you go
   - Return summary

Example: if you add `reverse-engineer-task`, add:
```javascript
// lib/parse.js
if (/reverse.?engineer/i.test(desc)) result.taskType = "reverse-engineer";

// lib/config.js
reverse-engineer: {
  workflowScript: "templates/reverse-engineer.js",
  workflowArgs: { courseId, ... }
}

// templates/reverse-engineer.js
export const meta = { name: "reverse-engineer", ... }
// workflow body: phase(), agent(), etc
```

## Current implementations

- ✅ **translate-questions** — translate exam questions to target language, keep explanation source language
- ⏳ **author-questions** — stub (use `/author-exam-content` skill directly)
- ⏳ **review-content** — stub (use `/review-exam-content` skill directly)
- ⏳ **illustrate-lessons** — stub (use `/illustrate` skill directly)

## Usage examples

```bash
# Translate CLF-C02 to English
/orchestrate-with-progress "translate CLF-C02 questions to English, keep explanation in Vietnamese"

# Watch progress (run in parallel tab / session)
/loop "watch-progress .claude/content-plan/CLF-C02-TRANSLATE.json"

# Translate SAA-C03
/orchestrate-with-progress "translate SAA-C03 questions to English, explanation stays Vietnamese"

# Author questions (when implemented)
/orchestrate-with-progress "author 60 questions for SAA-C03 domain 1"

# Review questions (when implemented)
/orchestrate-with-progress "review CLF-C02 questions for domain mix, difficulty spread, and duplicates"
```

## Design philosophy

- **NL parsing**: no JSON config needed — describe in English
- **Auto-detection**: infer workflow type, course, parameters from description
- **Durable state**: plan file on disk → resumable across sessions
- **Parallel execution**: Workflow handles batches efficiently, Loop watches realtime
- **Reusable**: extend with new task types, templates, parsers

---

Created as a skill wrapper to combine Workflow + Loop benefits: efficiency + observability.
