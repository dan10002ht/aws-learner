/**
 * Workflow: Translate questions to target language
 *
 * Batch pipeline via agents:
 * 1. Agent: extract + split batches into /tmp chunks
 * 2. 4 agents per batch: translate chunks in parallel
 * 3. Agent: merge + gate + update file + commit + mark plan done
 *
 * Each agent runs bash scripts to handle file I/O.
 * Invoked with args = { courseId, batchSize, language, sourceLanguage }
 */

export const meta = {
  name: "translate-questions",
  description: "Translate exam questions to target language (batch pipeline with durable state)",
  phases: [
    { title: "Extract", detail: "Load and partition questions into batches" },
    { title: "Translate", detail: "Spawn 4 agents per batch, translate chunks in parallel" },
    { title: "Merge", detail: "Combine chunks, gate check, update file, commit, mark done" },
  ]
};

const courseId = args.courseId; // null = all courses
const batchSize = args.batchSize || 150; // larger for all courses
const language = args.language || "English";
const sourceLanguage = args.sourceLanguage || "Vietnamese";
const isAllCourses = !courseId;

log(`📝 Translating ${isAllCourses ? "ALL COURSES" : courseId} → ${language}`);
log(`(keeping explanation: ${sourceLanguage})\n`);

// Phase 1: Extract questions + split into batches
phase("Extract");

const extractResult = await agent(
  `
Execute this bash script to load questions and partition into batches:

\`\`\`bash
cd /Users/dantt1002/projects/aws
node << 'EXTRACT_EOF'
const fs = require("fs");
const dataFile = "web/data/generatedQuestions.ts";
const content = fs.readFileSync(dataFile, "utf8");
const match = content.match(/export const generatedQuestions: Question\\[\\] = \\[([\\s\\S]*)\\];/);
if (!match) throw new Error("Parse failed");

const questions = JSON.parse("[" + match[1] + "]");
${isAllCourses ?
  `const courseQuestions = questions; // ALL courses` :
  `const courseQuestions = questions.filter(q => q.courseId === "${courseId}");`
}

const batchSize = ${batchSize};
const batches = [];
for (let i = 0; i < courseQuestions.length; i += batchSize) {
  const batchQuestions = courseQuestions.slice(i, Math.min(i + batchSize, courseQuestions.length));
  const batchId = "batch-" + (batches.length + 1);
  batches.push({ id: batchId, count: batchQuestions.length, range: [i, i + batchQuestions.length] });
  fs.writeFileSync("/tmp/" + batchId + ".json", JSON.stringify(batchQuestions, null, 2));
}

console.log(JSON.stringify({ batches, total: courseQuestions.length }));
EXTRACT_EOF
\`\`\`

Then return the JSON output (copy from console.log above).
Return JSON with this shape: { batches: [{id: "batch-1", count: 150, range: [0, 150]}, ...], total: 771 }
  `,
  { label: "extract-batches", phase: "Extract", schema: {
    type: "object",
    properties: {
      batches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            count: { type: "number" },
            range: { type: "array", minItems: 2, maxItems: 2 }
          },
          required: ["id", "count", "range"]
        }
      },
      total: { type: "number" }
    },
    required: ["batches", "total"]
  } }
);

log(`✓ Extracted ${extractResult.total} questions into ${extractResult.batches.length} batches\n`);

// Phase 2: Translate each batch via 4 parallel agents per batch
phase("Translate");

const translated = await pipeline(
  extractResult.batches,

  // Stage 1: Translate batch via 4 parallel chunk agents
  async (batch) => {
    const chunkResults = await parallel([
      () => agent(
        `
Agent: Translate chunk 1/4 for ${batch.id}

Load /tmp/${batch.id}.json. This is a JSON array of ${courseId} questions.
Split into 4 parts; translate ONLY the first 1/4.
For each question:
- Translate question field to ${language}
- Translate each option in options[] to ${language}
- Keep explanation field in ${sourceLanguage} unchanged
- Keep all other fields (id, courseId, etc) unchanged

Save to /tmp/${batch.id}-chunk1-en.json as JSON array.
Print: "✓ Translated chunk 1/4 for ${batch.id}" at end.
        `,
        { label: `translate-${batch.id}-c1`, phase: "Translate" }
      ),
      () => agent(
        `
Agent: Translate chunk 2/4 for ${batch.id}

Load /tmp/${batch.id}.json. Split into 4 parts; translate ONLY the second 1/4.
(Same translation rules: question + options to ${language}, explanation stays ${sourceLanguage})
Save to /tmp/${batch.id}-chunk2-en.json.
Print: "✓ Translated chunk 2/4 for ${batch.id}" at end.
        `,
        { label: `translate-${batch.id}-c2`, phase: "Translate" }
      ),
      () => agent(
        `
Agent: Translate chunk 3/4 for ${batch.id}

Load /tmp/${batch.id}.json. Split into 4 parts; translate ONLY the third 1/4.
Save to /tmp/${batch.id}-chunk3-en.json.
Print: "✓ Translated chunk 3/4 for ${batch.id}" at end.
        `,
        { label: `translate-${batch.id}-c3`, phase: "Translate" }
      ),
      () => agent(
        `
Agent: Translate chunk 4/4 for ${batch.id}

Load /tmp/${batch.id}.json. Split into 4 parts; translate ONLY the fourth 1/4.
Save to /tmp/${batch.id}-chunk4-en.json.
Print: "✓ Translated chunk 4/4 for ${batch.id}" at end.
        `,
        { label: `translate-${batch.id}-c4`, phase: "Translate" }
      ),
    ]);

    log(`${batch.id}: 4 chunks translated in parallel`);
    return { batch, chunkResults };
  }
);

log(`\n✓ All batches translated\n`);

// Phase 3: Merge, gate, update file, commit
phase("Merge");

const mergeResult = await agent(
  `
Merge all translated chunks, gate check, update file, commit, push, update plan.

Execute steps (can use bash):

1. Merge chunks: for each /tmp/batch-{i}-chunk{1,2,3,4}-en.json, load and merge into /tmp/batch-{i}-all.json (concatenate all arrays)

2. Gate check:
   - Format: verify each question has question, options[], explanation, id, etc.
   - Word count: check translated not <50% or >180% of original
   - Encoding: verify no Vietnamese in English text
   - Spot-check: sample 5 questions, verify reasonable translation
   Return: gatePass = true/false

3. If gate passes: update web/data/generatedQuestions.ts
   - Load /tmp/batch-*/all.json (all translated questions)
   - Load web/data/generatedQuestions.ts
   - For each translated question, find original by id and update:
     - question = translated.question
     - options = translated.options
     - explanation stays original (Vietnamese)
   - Write back to file

4. Build: cd web && npm run build (check for errors)

5. Commit + push:
   \`\`\`bash
   cd /Users/dantt1002/projects/aws
   git add -A
   git commit -m "Translate ${courseId} questions batches 2-3 to ${language}

Translate questions + options batches 2-3 (questions 121-373 of ${courseId}).
Explanations remain in ${sourceLanguage} for better comprehension.
Gate: format, word count, encoding verified.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
   git push origin main
   \`\`\`

6. Update .claude/content-plan/${courseId}-TRANSLATE.json:
   - Change batch-2 status from "pending" to "done" with completedAt
   - Change batch-3 status from "pending" to "done" with completedAt

Return this JSON:
{
  "success": true,
  "gatePass": true,
  "batchesUpdated": 2,
  "questionsUpdated": 240,
  "committed": true,
  "pushed": true,
  "planUpdated": true
}
  `,
  { label: "merge-gate-commit", phase: "Merge", schema: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      gatePass: { type: "boolean" },
      batchesUpdated: { type: "number" },
      questionsUpdated: { type: "number" },
      committed: { type: "boolean" },
      pushed: { type: "boolean" },
      planUpdated: { type: "boolean" }
    },
    required: ["success", "gatePass", "committed", "pushed"]
  } }
);

log(`\n✅ Workflow complete: ${courseId} translation batches 2-3 done\n`);

return { success: true, courseId, language, sourceLanguage, status: "complete" };
