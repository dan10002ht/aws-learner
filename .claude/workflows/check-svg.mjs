#!/usr/bin/env node
// Gate: mọi inline <svg> trong lessons/**/*.md phải (1) render được bằng rsvg-convert
// và (2) có <title> (accessibility). In lỗi + exit 1 nếu có cái hỏng; sạch thì exit 0.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const LESSONS = path.join(REPO, "lessons");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "svgcheck-"));
const problems = [];
let total = 0;

for (const file of walk(LESSONS)) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(REPO, file);
  const svgs = text.match(/<svg[\s\S]*?<\/svg>/g) || [];
  svgs.forEach((svg, i) => {
    total++;
    const id = `${rel}#${i + 1}`;
    if (!/<title[>\s]/.test(svg)) problems.push(`${id}: thiếu <title> (accessibility)`);
    const f = path.join(tmp, `s${total}.svg`);
    fs.writeFileSync(f, svg);
    try {
      execFileSync("rsvg-convert", ["-o", path.join(tmp, `s${total}.png`), f], { stdio: "pipe" });
    } catch (e) {
      const msg = (e.stderr || e.message || "").toString().split("\n")[0];
      problems.push(`${id}: rsvg render FAIL — ${msg}`);
    }
  });
}

fs.rmSync(tmp, { recursive: true, force: true });

if (problems.length) {
  console.error(`✗ ${problems.length} vấn đề SVG (trên ${total} svg):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`✓ ${total} inline SVG đều render OK và có <title>.`);
process.exit(0);
