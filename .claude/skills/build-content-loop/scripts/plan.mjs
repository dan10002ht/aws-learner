#!/usr/bin/env node
// Durable plan/manifest manager for incremental, part-by-part content builds.
// State lives in .claude/content-plan/<course>.json so a build can span many
// turns/sessions without holding everything in one context.
//
// Commands:
//   init   <course> "<part1>" "<part2>" ...   create plan (parts = "id|kind|scope")
//   next   <course>                            print first pending/needs-fix part (exit 3 if all done)
//   mark   <course> <partId> <status> [note]   set status: pending|in-progress|done|needs-attention
//   status <course>                            progress table

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", "..");
const DIR = path.join(REPO, ".claude", "content-plan");
const file = (course) => path.join(DIR, `${course}.json`);

function load(course) {
  const f = file(course);
  if (!fs.existsSync(f)) { console.error(`No plan for ${course}. Run: init ${course} ...`); process.exit(2); }
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
function save(course, plan) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file(course), JSON.stringify(plan, null, 2) + "\n");
}

const [cmd, course, ...rest] = process.argv.slice(2);

if (cmd === "init") {
  const parts = rest.map((s, i) => {
    const [id, kind, ...scope] = s.split("|");
    return { id: id || `part-${i + 1}`, kind: kind || "questions", scope: scope.join("|") || "", status: "pending", note: "" };
  });
  save(course, { course, createdNote: "stamp after build", parts });
  console.log(`Plan created for ${course}: ${parts.length} parts.`);
  parts.forEach((p) => console.log(`  ${p.id} [${p.kind}] ${p.scope}`));
} else if (cmd === "next") {
  const plan = load(course);
  const p = plan.parts.find((x) => x.status === "pending" || x.status === "needs-fix") ||
            plan.parts.find((x) => x.status === "in-progress");
  if (!p) {
    const stuck = plan.parts.filter((x) => x.status === "needs-attention");
    if (stuck.length) { console.log("ALL ATTEMPTED. needs-attention: " + stuck.map((x) => x.id).join(", ")); process.exit(4); }
    console.log("DONE — all parts complete."); process.exit(3);
  }
  console.log(JSON.stringify(p));
} else if (cmd === "mark") {
  const [id, status, ...note] = rest;
  const plan = load(course);
  const p = plan.parts.find((x) => x.id === id);
  if (!p) { console.error(`No part ${id}`); process.exit(2); }
  p.status = status; if (note.length) p.note = note.join(" ");
  save(course, plan);
  console.log(`${id} -> ${status}`);
} else if (cmd === "status") {
  const plan = load(course);
  const c = {};
  plan.parts.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
  console.log(`${course}: ${plan.parts.length} parts | ${JSON.stringify(c)}`);
  plan.parts.forEach((p) => console.log(`  [${p.status.padEnd(15)}] ${p.id}  ${p.scope}${p.note ? "  — " + p.note : ""}`));
} else {
  console.error("Usage: plan.mjs init|next|mark|status <course> ...");
  process.exit(1);
}
