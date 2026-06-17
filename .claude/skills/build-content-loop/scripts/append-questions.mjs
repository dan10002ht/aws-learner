#!/usr/bin/env node
// Append knowledge-quiz workflow output to web/data/generatedQuestions.ts.
// Usage: node append-questions.mjs <workflow-output-file>
// Reads {result:{questions:[...]}}, decodes HTML entities, validates the gate
// (id unique, indices in range, single=1/multi>=2, no leftover entities),
// then inserts before the final "];" of generatedQuestions.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", "..");
const GEN = path.join(REPO, "web", "data", "generatedQuestions.ts");

const outFile = process.argv[2];
if (!outFile) { console.error("Usage: append-questions.mjs <workflow-output-file>"); process.exit(1); }

const raw = fs.readFileSync(outFile, "utf8");
const top = JSON.parse(raw.slice(raw.indexOf("{")));
let res = top.result;
if (typeof res === "string") res = JSON.parse(res);
let qs = res.questions;
if (!Array.isArray(qs)) { console.error("No questions array in result"); process.exit(1); }

const dec = (x) => x
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, String.fromCharCode(39))
  .replace(/&amp;/g, "&");

qs = qs.map((q) => ({
  id: q.id, courseId: q.courseId, lesson: q.lesson, certifications: q.certifications,
  difficulty: q.difficulty, type: q.type,
  question: dec(q.question), options: q.options.map(dec),
  correctIndices: q.correctIndices, explanation: dec(q.explanation),
}));

// validate against existing ids too
const existing = fs.readFileSync(GEN, "utf8");
let err = 0;
const ids = new Set();
for (const q of qs) {
  if (ids.has(q.id)) { console.log("DUP in batch", q.id); err++; }
  ids.add(q.id);
  if (existing.includes(`"${q.id}"`)) { console.log("DUP vs file", q.id); err++; }
  const n = q.options.length;
  if (!q.correctIndices.length) { console.log("nocorrect", q.id); err++; }
  for (const c of q.correctIndices) if (c < 0 || c >= n) { console.log("OOR", q.id); err++; }
  if (q.type === "single" && q.correctIndices.length !== 1) { console.log("single!=1", q.id); err++; }
  if (q.type === "multi" && q.correctIndices.length < 2) { console.log("multi<2", q.id); err++; }
  if (/&lt;|&gt;|&amp;|&#39;|&quot;/.test(JSON.stringify(q))) { console.log("entity", q.id); err++; }
}
const multi = qs.filter((q) => q.type === "multi").length;
const diff = {}; qs.forEach((q) => (diff[q.difficulty] = (diff[q.difficulty] || 0) + 1));
const per = {}; qs.forEach((q) => (per[q.lesson] = (per[q.lesson] || 0) + 1));
console.log(`${res.courseId}: ${qs.length} q | errors:${err} | multi:${multi} (${Math.round(multi / qs.length * 100)}%) | diff:${JSON.stringify(diff)}`);
console.log("per-lesson:", JSON.stringify(per));
if (err > 0) { console.log("ABORT — fix errors first"); process.exit(1); }

const blocks = qs.map((q) => "  " + JSON.stringify(q, null, 2).split("\n").join("\n  "));
const ins = ",\n" + blocks.join(",\n") + "\n];";
const idx = existing.lastIndexOf("\n];");
fs.writeFileSync(GEN, existing.slice(0, idx) + ins + existing.slice(idx + 3));
console.log(`Appended ${qs.length} ${res.courseId} questions -> ${GEN}`);
