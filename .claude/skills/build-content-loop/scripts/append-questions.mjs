#!/usr/bin/env node
// Append knowledge-quiz workflow output to web/data/generatedKnowledge.ts.
// Usage: node append-questions.mjs <workflow-output-file>
//
// generatedKnowledge.ts holds chunked arrays (const k1, k2, ... spread into the
// export) because one giant literal overflows TypeScript's union-complexity
// limit. This script parses the existing chunks, adds the new questions, repacks
// into chunks of <= MAX, and rewrites the file. Validates the gate first.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", "..");
const GEN = path.join(REPO, "web", "data", "generatedKnowledge.ts");
const MAX = 400;

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

// Load existing knowledge questions (parse all chunk arrays from the file).
let existing = [];
if (fs.existsSync(GEN)) {
  const t = fs.readFileSync(GEN, "utf8");
  const re = /const k\d+: Question\[\] = (\[[\s\S]*?\]);/g;
  let m;
  while ((m = re.exec(t))) existing = existing.concat(JSON.parse(m[1]));
}
const existingIds = new Set(existing.map((q) => q.id));

// Validate the batch (gate).
let err = 0;
const seen = new Set();
for (const q of qs) {
  if (seen.has(q.id)) { console.log("DUP in batch", q.id); err++; }
  seen.add(q.id);
  if (existingIds.has(q.id)) { console.log("DUP vs file", q.id); err++; }
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

// Repack all questions into chunks of <= MAX and rewrite the file.
const all = existing.concat(qs);
const chunks = [];
for (let i = 0; i < all.length; i += MAX) chunks.push(all.slice(i, i + MAX));

let out = 'import type { Question } from "@/lib/types";\n\n';
out += "// Auto-generated practice quizzes for knowledge courses. Chunked into arrays\n";
out += "// so TypeScript can type-check the literal (a single huge array overflows\n";
out += "// the union-complexity limit). Managed by build-content-loop/scripts/append-questions.mjs.\n\n";
chunks.forEach((c, i) => { out += `const k${i + 1}: Question[] = ${JSON.stringify(c, null, 2)};\n\n`; });
out += `export const generatedKnowledge: Question[] = [${chunks.map((_, i) => "...k" + (i + 1)).join(", ")}];\n`;
fs.writeFileSync(GEN, out);
console.log(`Appended ${qs.length} ${res.courseId} questions; total knowledge now ${all.length} in ${chunks.length} chunk(s).`);
