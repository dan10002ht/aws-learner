#!/usr/bin/env node
// Merge 4 translated chunks back into single batch file
import fs from "node:fs";

const chunks = [
  "/tmp/clf-batch1-chunk1-en.json",
  "/tmp/clf-batch1-chunk2-en.json",
  "/tmp/clf-batch1-chunk3-en.json",
  "/tmp/clf-batch1-chunk4-en.json"
];

const merged = [];

for (const chunk of chunks) {
  if (!fs.existsSync(chunk)) {
    console.error(`✗ Missing: ${chunk}`);
    process.exit(1);
  }
  try {
    const data = JSON.parse(fs.readFileSync(chunk, "utf8"));
    merged.push(...(Array.isArray(data) ? data : [data]));
  } catch (e) {
    console.error(`✗ Parse ${chunk}: ${e.message}`);
    process.exit(1);
  }
}

fs.writeFileSync("/tmp/clf-batch1-translated.json", JSON.stringify(merged, null, 2));
console.log(`✓ Merged ${merged.length} questions to /tmp/clf-batch1-translated.json`);
