#!/usr/bin/env node
// Deterministic structural review of the generated AWS question bank.
// Usage: node check.mjs [COURSE_ID]   (default: all courses found)
// Run from repo root or anywhere; it resolves the data file relative to itself.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..", "..", ".."); // .claude/skills/review-exam-content/scripts -> repo root
const DATA = path.join(REPO, "web", "data", "generatedQuestions.ts");

const WEIGHTS = {
  "CLF-C02": { 1: 0.24, 2: 0.30, 3: 0.34, 4: 0.12 },
  "SAA-C03": { 1: 0.30, 2: 0.26, 3: 0.24, 4: 0.20 },
};
const MIN_PER_LESSON = 8;
const MULTI_LO = 0.10, MULTI_HI = 0.15;

// Các mock tái hiện nguyên bộ đề gốc: multi-ratio và domain-mix là ĐẶC TÍNH CỦA BỘ ĐỀ
// chứ không phải lỗi tác giả (có bộ tới 25% multi-answer) — ép hai chỉ số này lại sẽ
// làm sai lệch đề. Chỉ in ra để tham khảo.
const FIXED_ORDER_MOCKS = {
  "SAA-C03": [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
};

function loadQuestions() {
  const t = fs.readFileSync(DATA, "utf8");
  const start = t.indexOf("= [");
  const end = t.lastIndexOf("];");
  if (start < 0 || end < 0) throw new Error("Cannot locate array in " + DATA);
  return JSON.parse(t.slice(start + 2, end + 1));
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9à-ỹ ]/gi, "").replace(/\s+/g, " ").trim();

function reviewCourse(qs, course) {
  const all = qs.filter((q) => q.courseId === course);
  if (!all.length) return;
  const issues = [];
  const warns = [];
  const mocks = [...new Set(all.filter((q) => q.mock != null).map((q) => q.mock))].sort();
  const W = WEIGHTS[course];

  console.log(`\n========== ${course} ==========`);
  console.log(`Tổng câu: ${all.length} | mocks: ${mocks.join(", ") || "(none)"}`);

  for (const mk of mocks) {
    const s = all.filter((q) => q.mock === mk);
    const multi = s.filter((q) => q.type === "multi").length;
    const ratio = multi / s.length;
    const byD = { 1: 0, 2: 0, 3: 0, 4: 0 };
    s.forEach((q) => { if (q.domain) byD[q.domain]++; });
    const diff = { easy: 0, medium: 0, hard: 0 };
    s.forEach((q) => { diff[q.difficulty] = (diff[q.difficulty] || 0) + 1; });
    console.log(`\n  mock ${mk}: ${s.length} câu | multi ${(ratio * 100).toFixed(0)}% | domains ${JSON.stringify(byD)} | diff ${JSON.stringify(diff)}`);

    const fixedOrder = (FIXED_ORDER_MOCKS[course] || []).includes(mk);
    if (fixedOrder) console.log(`    (đề cố định — bỏ qua check multi-ratio & domain-mix)`);

    if (!fixedOrder && (ratio < MULTI_LO || ratio > MULTI_HI))
      (ratio > MULTI_HI ? issues : warns).push(`mock ${mk}: multi-ratio ${(ratio * 100).toFixed(0)}% ngoài ${MULTI_LO * 100}-${MULTI_HI * 100}%`);

    if (W && !fixedOrder) {
      for (const d of [1, 2, 3, 4]) {
        const target = Math.round(s.length * W[d]);
        if (Math.abs(byD[d] - target) > 2)
          warns.push(`mock ${mk}: domain ${d} có ${byD[d]} câu (target ~${target})`);
      }
    }
    // duplicate within a mock
    const seen = new Map();
    for (const q of s) {
      const k = norm(q.question);
      if (seen.has(k)) issues.push(`mock ${mk}: TRÙNG trong cùng mock — ${q.id} ↔ ${seen.get(k)}`);
      else seen.set(k, q.id);
    }
  }

  // per-lesson coverage
  const byLesson = {};
  for (const q of all) byLesson[q.lesson] = (byLesson[q.lesson] || 0) + 1;
  const thin = Object.entries(byLesson).filter(([, n]) => n < MIN_PER_LESSON);
  if (thin.length) warns.push(`Lesson < ${MIN_PER_LESSON} câu: ${thin.map(([l, n]) => `${l}(${n})`).join(", ")}`);

  // structural validity + shuffle-safe explanation
  let letterRefs = 0;
  for (const q of all) {
    const ci = q.correctIndices || [];
    if (!Array.isArray(q.options) || q.options.length < 4) issues.push(`${q.id}: <4 options`);
    if (ci.some((i) => i < 0 || i >= (q.options || []).length)) issues.push(`${q.id}: correctIndices ngoài phạm vi`);
    if (q.type === "single" && ci.length !== 1) issues.push(`${q.id}: single nhưng ${ci.length} đáp án đúng`);
    if (q.type === "multi" && ci.length < 2) issues.push(`${q.id}: multi nhưng ${ci.length} đáp án đúng`);
    // shuffle-unsafe: explanation references option letters
    if (/(^|\s)[A-E]\s+(đúng|sai|SAI)\b/.test(q.explanation || "")) letterRefs++;
  }
  if (letterRefs) warns.push(`${letterRefs} câu có giải thích tham chiếu chữ cái A/B/C/D (không shuffle-safe)`);

  // exact dup across whole course
  const seenAll = new Map();
  let dupAll = 0;
  for (const q of all) {
    const k = norm(q.question);
    if (seenAll.has(k)) dupAll++;
    else seenAll.set(k, q.id);
  }
  if (dupAll) warns.push(`${dupAll} câu trùng y hệt (xuyên mock — chỉ lỗi nếu trong cùng 1 mock)`);

  console.log(`\n  ── ISSUES (vi phạm gate): ${issues.length}`);
  issues.forEach((i) => console.log("   ❌ " + i));
  console.log(`  ── WARNINGS: ${warns.length}`);
  warns.forEach((w) => console.log("   ⚠️  " + w));
  return { course, issues: issues.length, warns: warns.length };
}

const qs = loadQuestions();
const arg = process.argv[2];
const courses = arg ? [arg] : [...new Set(qs.map((q) => q.courseId))];
const summary = courses.map((c) => reviewCourse(qs, c)).filter(Boolean);

console.log("\n========== TÓM TẮT ==========");
let failed = false;
for (const s of summary) {
  console.log(`${s.course}: ${s.issues} issues, ${s.warns} warnings`);
  if (s.issues > 0) failed = true;
}
console.log(failed ? "\nGATE: ❌ FAIL (có issues)" : "\nGATE: ✅ PASS (chỉ warnings)");
process.exit(failed ? 1 : 0);
