#!/usr/bin/env node
// Đo gap: câu hỏi trong ngân hàng đề chạm tới service nào mà bài học được gán KHÔNG hề nhắc tới.
// Dùng: node .claude/scripts/gap-vs-questions.mjs [COURSE_ID] [MIN_MOCK]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COURSE = process.argv[2] || "SAA-C03";
const MIN_MOCK = Number(process.argv[3] ?? 4); // mặc định chỉ tính các đề import

const qs = (() => {
  const t = fs.readFileSync(path.join(REPO, "web/data/generatedQuestions.ts"), "utf8");
  return JSON.parse(t.slice(t.indexOf("= [") + 2, t.lastIndexOf("];") + 1));
})().filter((q) => q.courseId === COURSE && (q.mock ?? 0) >= MIN_MOCK);

// service/khái niệm -> các từ khoá nhận diện trong đề
const SVC = {
  "Systems Manager": ["Systems Manager", "Session Manager", "Run Command", "Parameter Store", "Patch Manager"],
  CloudFormation: ["CloudFormation"], "Elastic Beanstalk": ["Elastic Beanstalk"],
  "Service Catalog": ["Service Catalog"], "License Manager": ["License Manager"],
  Organizations: ["AWS Organizations", "Service Control Polic", "\\bSCP\\b"], "Control Tower": ["Control Tower"],
  RAM: ["Resource Access Manager"], "Transit Gateway": ["Transit Gateway"],
  "Direct Connect": ["Direct Connect"], VPN: ["Site-to-Site VPN", "Client VPN"],
  "Gateway Load Balancer": ["Gateway Load Balancer"], "Egress-Only IGW": ["egress-only", "Egress-Only"],
  "Placement Group": ["Placement Group"], "Launch Template": ["Launch Template", "Launch Configuration"],
  DLM: ["Data Lifecycle Manager"], "Storage Gateway": ["Storage Gateway"],
  Edge: ["Outposts", "Local Zone", "Wavelength"], "Elastic DR": ["Elastic Disaster Recovery"],
  AppFlow: ["AppFlow"], Amplify: ["Amplify"], AppSync: ["AppSync"], SWF: ["\\bSWF\\b"],
  "AI/ML": ["Rekognition", "Comprehend", "Transcribe", "Textract", "Polly", "Kendra", "Translate", "Amazon Lex", "Fraud Detector"],
  "Purpose-built DB": ["Neptune", "Timestream", "QLDB", "Keyspaces", "DocumentDB", "MemoryDB"],
  "Directory Service": ["Directory Service", "AD Connector"], Cognito: ["Cognito"],
  "Firewall Manager": ["Firewall Manager"], OpenSearch: ["OpenSearch", "Elasticsearch"],
  Batch: ["AWS Batch"], MSK: ["\\bMSK\\b", "Managed Streaming"],
};

const cache = new Map();
const lessonText = (slug) => {
  if (!cache.has(slug)) {
    const p = path.join(REPO, "lessons", COURSE.toLowerCase(), `${slug}.md`);
    cache.set(slug, fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
  }
  return cache.get(slug);
};
const has = (text, kws) => kws.some((k) => new RegExp(k, "i").test(text));

let atRisk = 0;   // service xuất hiện ở BẤT KỲ đâu (kể cả distractor)
let core = 0;     // service xuất hiện ở đề bài HOẶC đáp án đúng -> thật sự cần bài đó mới trả lời được
const byTopic = new Map();
for (const q of qs) {
  const all = q.question + " " + (q.options || []).join(" ");
  const key = q.question + " " + (q.correctIndices || []).map((i) => (q.options || [])[i] || "").join(" ");
  let miss = false, missCore = false;
  for (const [topic, kws] of Object.entries(SVC)) {
    if (!has(lessonText(q.lesson), kws)) {
      if (has(all, kws)) { miss = true; byTopic.set(topic, (byTopic.get(topic) || 0) + 1); }
      if (has(key, kws)) missCore = true;
    }
  }
  if (miss) atRisk++;
  if (missCore) core++;
}

const pct = ((atRisk / qs.length) * 100).toFixed(1);
const pctCore = ((core / qs.length) * 100).toFixed(1);
console.log(`\n${COURSE} — đề mock >= ${MIN_MOCK}: ${qs.length} câu`);
console.log(`[CHẶT]  đề bài/đáp án đúng chạm service bài không dạy: ${core} (${pctCore}%)`);
console.log(`[RỘNG]  kể cả khi service chỉ là distractor:            ${atRisk} (${pct}%)\n`);
if (byTopic.size) {
  console.log("Còn hở, theo chủ đề:");
  [...byTopic.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`  ${String(n).padStart(4)}  ${t}`));
} else {
  console.log("Không còn chủ đề nào hở.");
}
