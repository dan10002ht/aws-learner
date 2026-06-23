#!/usr/bin/env node
// Gate: phát hiện [[link]] gãy trong lessons/**/*.md.
// Một [[token]] là "gãy" nếu token (phần trước dấu | nếu có) KHÔNG khớp slug nào
// trong web/data/lessons.ts. In danh sách gãy + exit 1; sạch thì exit 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const LESSONS = path.join(REPO, "lessons");
const LESSONS_TS = path.join(REPO, "web", "data", "lessons.ts");

// 1. Tập slug hợp lệ
const tsSrc = fs.readFileSync(LESSONS_TS, "utf8");
const slugs = new Set([...tsSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]));

// 2. Quét toàn bộ .md
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Chỉ coi là cross-link nếu token có dạng slug kebab-case. Loại trừ code
// (mảng [[0,0,0]], [["Env"]], [[IgnoredVulns]]...) và bỏ qua khối ```code```.
const SLUG_RE = /^[a-z0-9-]+$/;
const broken = [];
for (const file of walk(LESSONS)) {
  const raw = fs.readFileSync(file, "utf8");
  const text = raw.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, ""); // bỏ code fence + inline code
  const rel = path.relative(REPO, file);
  for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const token = m[1].split("|")[0].trim();
    if (!SLUG_RE.test(token)) continue;       // không phải slug -> bỏ qua (code/data)
    if (!slugs.has(token)) broken.push({ file: rel, token });
  }
}

if (broken.length) {
  console.error(`✗ ${broken.length} link gãy:`);
  for (const b of broken) console.error(`  ${b.file}  ->  [[${b.token}]]`);
  process.exit(1);
}
console.log("✓ Không có [[link]] gãy.");
process.exit(0);
