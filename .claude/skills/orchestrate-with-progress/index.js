#!/usr/bin/env node
/**
 * orchestrate-with-progress
 *
 * Main entry point. Parses natural language, auto-detects task config,
 * spawns workflow background + loop realtime watch.
 */

const fs = require("fs");
const path = require("path");
const { parseDescription } = require("./lib/parse.js");
const { setupPlanFile, getTaskConfig } = require("./lib/config.js");

const skillDir = __dirname;
const projectRoot = path.resolve(skillDir, "../..");

async function orchestrate(description) {
  console.log(`🔍 Parsing: "${description}"\n`);

  // Parse natural language
  const parsed = parseDescription(description);
  console.log(`✓ Detected:`);
  console.log(`  Task: ${parsed.taskType}`);
  console.log(`  Course: ${parsed.course}`);
  if (parsed.language) console.log(`  Language: ${parsed.language}`);
  if (parsed.domain) console.log(`  Domain: ${parsed.domain}`);
  if (parsed.count) console.log(`  Count: ${parsed.count}`);
  console.log();

  // Get task config (workflow template, batch size, etc)
  const config = getTaskConfig(parsed);
  if (!config) {
    console.error(`✗ Unsupported task type: ${parsed.taskType}`);
    process.exit(1);
  }

  // Setup durable state (plan file)
  const planFile = setupPlanFile(parsed, config);
  console.log(`✓ Plan file: ${path.relative(projectRoot, planFile)}`);
  console.log();

  // Output instructions for Claude to execute
  console.log(`📋 Next steps (Claude will execute):`);
  console.log(`  1. Launch Workflow: ${config.workflowScript}`);
  console.log(`  2. Launch Loop: watch ${path.relative(projectRoot, planFile)} for progress`);
  console.log(`  3. Report when complete\n`);

  // Return config for Claude to execute
  return {
    success: true,
    parsed,
    config,
    planFile,
    workflowPath: path.join(skillDir, config.workflowScript),
    instructions: `
Launch this workflow:
  Workflow({
    scriptPath: "${path.join(skillDir, config.workflowScript)}",
    args: ${JSON.stringify(config.workflowArgs, null, 2)}
  })

Then run this loop (in parallel):
  /loop "check orchestrate-progress ${path.basename(planFile)}" --interval 60

Skill will auto-detect task and manage both.
    `.trim()
  };
}

// CLI entry
if (require.main === module) {
  const description = process.argv.slice(2).join(" ");
  if (!description) {
    console.error("Usage: orchestrate-with-progress <description>");
    console.error('Example: orchestrate-with-progress "translate CLF-C02 questions to English"');
    process.exit(1);
  }

  orchestrate(description)
    .then(result => {
      if (result.success) {
        console.log("✓ Orchestration setup complete");
        console.log("\nPass to Claude:");
        console.log(result.instructions);
      }
    })
    .catch(err => {
      console.error("✗ Error:", err.message);
      process.exit(1);
    });
}

module.exports = { orchestrate };
