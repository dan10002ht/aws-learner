#!/usr/bin/env node
// Merge translated batch back into generatedQuestions.ts
// Read batch file (JSON array with translated questions)
// Update the corresponding questions in generatedQuestions.ts
import fs from "node:fs";

const args = process.argv.slice(2);
const batchFile = args[0] || "/tmp/clf-batch1-translated.json";
const outFile = "/Users/dantt1002/projects/aws/web/data/generatedQuestions.ts";

if (!fs.existsSync(batchFile)) {
  console.error(`✗ Batch file not found: ${batchFile}`);
  process.exit(1);
}

// Read translated batch
let translated;
try {
  translated = JSON.parse(fs.readFileSync(batchFile, "utf8"));
} catch (e) {
  console.error(`✗ JSON parse failed: ${e.message}`);
  process.exit(1);
}

// Read existing generatedQuestions.ts
let content = fs.readFileSync(outFile, "utf8");

// Extract array content
const match = content.match(/export const generatedQuestions: Question\[\] = \[([\s\S]*)\];/);
if (!match) {
  console.error("✗ Failed to parse generatedQuestions.ts");
  process.exit(1);
}

// Parse existing questions
const jsonStr = "[" + match[1] + "]";
let questions;
try {
  questions = JSON.parse(jsonStr);
} catch (e) {
  console.error(`✗ JSON parse failed: ${e.message}`);
  process.exit(1);
}

// Map translated by ID
const translatedById = new Map(translated.map(q => [q.id, q]));

// Update questions with translation
let updated = 0;
questions = questions.map(q => {
  const trans = translatedById.get(q.id);
  if (trans) {
    // Update question + options with English version
    q.question = trans.question_en || trans.question;
    q.options = trans.options_en || trans.options;
    // Keep explanation in Vietnamese
    updated++;
  }
  return q;
});

console.log(`Updated ${updated}/${translated.length} questions`);

// Reconstruct file
const header = content.substring(0, content.indexOf("export const generatedQuestions"));
const footer = `;\n`;
const newContent = header + `export const generatedQuestions: Question[] = ${JSON.stringify(questions, null, 2)}${footer}`;

fs.writeFileSync(outFile, newContent);
console.log(`✓ Merged to ${outFile}`);
