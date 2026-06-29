/**
 * Task config mapper
 *
 * Maps parsed task → workflow template + plan file setup
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "../..");

function getTaskConfig(parsed) {
  const { taskType, course, domain, count, language, parameters } = parsed;

  // Task-specific configs
  const configs = {
    translate: {
      workflowScript: "templates/translate-questions.js",
      batchSize: 120,
      workflowArgs: {
        courseId: course,
        batchSize: 120,
        language: language || "English",
        sourceLanguage: parsed.sourceLanguage,
        keepExplanationLanguage: parameters.keepExplanationLanguage || null,
        overwrite: parameters.overwrite !== false // default true
      },
      loopCheckKey: "batch"
    },
    author: {
      workflowScript: "templates/author-questions.js",
      batchSize: count || 50,
      workflowArgs: {
        courseId: course,
        domain: domain,
        count: count || 50,
        difficulty: parameters.difficulty || "mixed"
      },
      loopCheckKey: "part"
    },
    review: {
      workflowScript: "templates/review-content.js",
      workflowArgs: {
        courseId: course,
        checks: {
          domainMix: parameters.checkDomainMix || false,
          difficulty: parameters.checkDifficulty || false,
          duplicates: parameters.checkDuplicates || false,
          shuffleSafe: parameters.checkShuffleSafe || false
        }
      },
      loopCheckKey: "check"
    },
    illustrate: {
      workflowScript: "templates/illustrate-lessons.js",
      workflowArgs: {
        courseId: course,
        format: parameters.format || "svg",
        inline: parameters.inline !== false // default true
      },
      loopCheckKey: "lesson"
    }
  };

  return configs[taskType] || null;
}

function setupPlanFile(parsed, config) {
  const { taskType, course } = parsed;
  const planDir = path.join(projectRoot, ".claude/content-plan");

  // Ensure directory exists
  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }

  const planFile = path.join(planDir, `${course}-${taskType.toUpperCase()}.json`);

  const plan = {
    taskType: taskType,
    courseId: course,
    createdAt: new Date().toISOString(),
    status: "in-progress",
    parts: []
  };

  // Generate parts based on task type
  if (taskType === "translate") {
    // Determine batch count based on course
    const estimatedQuestions = {
      "CLF-C02": 373,
      "SAA-C03": 450,
      "DVA-C02": 380
    };
    const total = estimatedQuestions[course] || 300;
    const batchSize = config.batchSize;
    const numBatches = Math.ceil(total / batchSize);

    for (let i = 0; i < numBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, total);
      plan.parts.push({
        id: `batch-${i + 1}`,
        name: `Questions ${start + 1}-${end}`,
        status: "pending",
        range: [start, end],
        note: `${end - start} questions`
      });
    }
  } else if (taskType === "author") {
    const count = parsed.count || 50;
    const batchSize = config.batchSize;
    const numBatches = Math.ceil(count / batchSize);

    for (let i = 0; i < numBatches; i++) {
      plan.parts.push({
        id: `part-${i + 1}`,
        name: `Questions ${i * batchSize + 1}-${Math.min((i + 1) * batchSize, count)}`,
        status: "pending",
        note: `Domain ${parsed.domain || "all"}`
      });
    }
  } else if (taskType === "review") {
    plan.parts.push({
      id: "review-1",
      name: "Structural review",
      status: "pending",
      note: "Domain mix, difficulty, duplicates, etc"
    });
    plan.parts.push({
      id: "review-2",
      name: "Correctness spot-check",
      status: "pending",
      note: "Sample questions + answers"
    });
  } else if (taskType === "illustrate") {
    plan.parts.push({
      id: "illustrate-1",
      name: `Illustrate ${course} lessons`,
      status: "pending",
      note: "SVG diagrams per lesson"
    });
  }

  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  return planFile;
}

module.exports = { getTaskConfig, setupPlanFile };
