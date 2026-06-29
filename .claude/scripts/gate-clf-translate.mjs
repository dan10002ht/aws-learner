#!/usr/bin/env node
// Gate: verify translated CLF-C02 questions
// Check: format, word count anomaly, encoding (no Vi mix), spot-check 5 random
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const batchFile = args[0] || "/tmp/clf-batch1-translated.json";

if (!fs.existsSync(batchFile)) {
  console.error(`✗ File not found: ${batchFile}`);
  process.exit(1);
}

let batch;
try {
  batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
} catch (e) {
  console.error(`✗ JSON parse failed: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(batch)) {
  console.error("✗ Expected array of questions");
  process.exit(1);
}

const problems = [];

for (let i = 0; i < batch.length; i++) {
  const q = batch[i];
  const id = q.id || `q${i}`;

  // Format check
  if (!q.question || typeof q.question !== "string") problems.push(`${id}: missing/invalid question`);
  if (!Array.isArray(q.options) || q.options.length < 2) problems.push(`${id}: invalid options array`);
  if (!q.explanation || typeof q.explanation !== "string") problems.push(`${id}: missing explanation`);

  // Word count anomaly
  const origWords = (q.question.split(/\s+/).length || 0) + (q.options || []).reduce((s, o) => s + (o.split(/\s+/).length || 0), 0);
  if (origWords > 0) {
    const translated = (q.question_en || q.question).split(/\s+/).length + (q.options_en || q.options || []).reduce((s, o) => s + (o.split(/\s+/).length || 0), 0);
    if (translated < origWords * 0.5) problems.push(`${id}: translation too short (${translated}/${origWords} words) — possible truncation`);
    if (translated > origWords * 1.8) problems.push(`${id}: translation too long (${translated}/${origWords} words) — possible dupe/hallucination`);
  }

  // No Vietnamese character mix in English translation
  const viRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (q.question_en && viRegex.test(q.question_en)) problems.push(`${id}: Vietnamese chars in English question`);
  (q.options_en || []).forEach((opt, j) => {
    if (viRegex.test(opt)) problems.push(`${id}: Vietnamese chars in option ${j}`);
  });
}

// Spot-check 5 random
console.log("\n--- Spot-check (5 random) ---");
const indices = Array.from({ length: batch.length }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, 5);
for (const i of indices) {
  const q = batch[i];
  console.log(`\n[${q.id}] (${i + 1}/${batch.length})`);
  console.log(`Q (EN): ${(q.question_en || q.question).substring(0, 100)}...`);
  console.log(`Opt 0 (EN): ${((q.options_en || q.options || [])[0] || "").substring(0, 80)}`);
  console.log(`Exp (VI): ${(q.explanation || "").substring(0, 80)}...`);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} issues found:`);
  problems.slice(0, 20).forEach(p => console.error(`  ${p}`));
  if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
  process.exit(1);
}

console.log(`\n✓ Gate passed: ${batch.length} questions OK (format, word count, encoding)`);
process.exit(0);
