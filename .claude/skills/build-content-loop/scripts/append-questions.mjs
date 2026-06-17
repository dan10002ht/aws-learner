#!/usr/bin/env node
// Append knowledge-quiz workflow output to the knowledge question bank.
// Usage: node append-questions.mjs <workflow-output-file>
//
// Source of truth = generatedKnowledge.data.json (pure JSON, robust to parse).
// generatedKnowledge.ts is REGENERATED from it as chunked const arrays (one
// giant literal overflows TypeScript's union-complexity limit). The .ts is what
// questions.ts imports.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", "..");
const DATA = path.join(REPO, "web", "data", "generatedKnowledge.data.json");
const TS = path.join(REPO, "web", "data", "generatedKnowledge.ts");
const MAX = 400;

// Bracket-match the array after each `= [`, respecting JS string literals, so
// a `]` inside a question string never ends the match early.
function extractArrays(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf("= [", i)) !== -1) {
    let j = i + 2; // at '['
    let depth = 0, inStr = false, esc = false;
    const start = j;
    for (; j < text.length; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]") { depth--; if (depth === 0) { j++; break; } }
    }
    try { out.push(JSON.parse(text.slice(start, j))); } catch { /* spread/export array, skip */ }
    i = j;
  }
  return out;
}

function loadExisting() {
  if (fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA, "utf8"));
  // One-time migration from the .ts chunk arrays.
  if (fs.existsSync(TS)) {
    const arrays = extractArrays(fs.readFileSync(TS, "utf8"));
    return arrays.flat();
  }
  return [];
}

function writeBank(all) {
  fs.writeFileSync(DATA, JSON.stringify(all, null, 2) + "\n");
  const chunks = [];
  for (let i = 0; i < all.length; i += MAX) chunks.push(all.slice(i, i + MAX));
  let out = 'import type { Question } from "@/lib/types";\n\n';
  out += "// AUTO-GENERATED from generatedKnowledge.data.json — do not edit by hand.\n";
  out += "// Chunked into arrays so a single huge literal does not overflow\n";
  out += "// TypeScript's union-complexity limit. See append-questions.mjs.\n\n";
  chunks.forEach((c, i) => { out += `const k${i + 1}: Question[] = ${JSON.stringify(c, null, 2)};\n\n`; });
  out += `export const generatedKnowledge: Question[] = [${chunks.map((_, i) => "...k" + (i + 1)).join(", ")}];\n`;
  fs.writeFileSync(TS, out);
  return chunks.length;
}

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

const existing = loadExisting();
const existingIds = new Set(existing.map((q) => q.id));

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

const all = existing.concat(qs);
const nChunks = writeBank(all);
console.log(`Appended ${qs.length} ${res.courseId}; total knowledge now ${all.length} in ${nChunks} chunk(s).`);
