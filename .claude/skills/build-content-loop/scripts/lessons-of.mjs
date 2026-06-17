#!/usr/bin/env node
// Print {dir, lessons:[{slug,title}]} for a courseId, for feeding knowledge-quiz.workflow.js args.
// Usage: node lessons-of.mjs <COURSEID>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", "..");
const t = fs.readFileSync(path.join(REPO, "web", "data", "lessons.ts"), "utf8");

const course = process.argv[2];
if (!course) { console.error("Usage: lessons-of.mjs <COURSEID>"); process.exit(1); }

const re = new RegExp(
  `\\{\\s*slug:\\s*"([^"]+)",\\s*courseId:\\s*"${course}"[\\s\\S]*?title:\\s*"([^"]+)"[\\s\\S]*?file:\\s*"([^"]+)"`,
  "g"
);
const lessons = [];
let dir = null;
let m;
while ((m = re.exec(t))) {
  lessons.push({ slug: m[1], title: m[2] });
  if (!dir) dir = path.join(REPO, "lessons", path.dirname(m[3]));
}
if (!lessons.length) { console.error(`No lessons for ${course}`); process.exit(2); }
console.log(JSON.stringify({ courseId: course, dir, lessons }, null, 2));
