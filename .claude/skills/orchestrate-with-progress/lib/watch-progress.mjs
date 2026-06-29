#!/usr/bin/env node
/**
 * Watch progress loop
 *
 * Poll plan file, report batch status every 60s
 * Exit when all parts are done
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const planFile = args[0];

if (!planFile || !fs.existsSync(planFile)) {
  console.error(`✗ Plan file not found: ${planFile}`);
  process.exit(1);
}

function printStatus() {
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  const timestamp = new Date().toLocaleTimeString();

  const done = plan.parts.filter(p => p.status === "done").length;
  const inProgress = plan.parts.filter(p => p.status === "in-progress").length;
  const pending = plan.parts.filter(p => p.status === "pending").length;

  console.log(`[${timestamp}] ${plan.courseId} ${plan.taskType.toUpperCase()}`);
  console.log(`  ✅ ${done} done | 🔄 ${inProgress} in-progress | ⏳ ${pending} pending`);

  if (done > 0) {
    plan.parts.filter(p => p.status === "done").slice(0, 3).forEach(p => {
      console.log(`    ✓ ${p.id}: ${p.name}`);
    });
    if (done > 3) console.log(`    ... and ${done - 3} more`);
  }

  // Exit if all done
  if (pending === 0 && inProgress === 0) {
    console.log(`\n✓ All ${done} parts complete!\n`);
    process.exit(0);
  }
}

// Initial print
printStatus();

// Poll every 60s
setInterval(printStatus, 60000);

// Exit after 1 hour of inactivity (workflow should be done by then)
setTimeout(() => {
  console.log(`\n⏱️  Timeout after 1 hour`);
  process.exit(0);
}, 3600000);
