/**
 * Natural language parser
 *
 * Extracts: taskType, course, language, domain, count, parameters
 */

function parseDescription(description) {
  const result = {
    taskType: null,
    course: null,
    language: null,
    sourceLanguage: "Vietnamese",
    targetLanguage: null,
    domain: null,
    count: null,
    difficulty: null,
    parameters: {}
  };

  const desc = description.toLowerCase();

  // Task type detection
  if (/translate|convert|change.*language|to english|to vietnamese/i.test(desc)) {
    result.taskType = "translate";
  } else if (/author|generate|create|write.*question/i.test(desc)) {
    result.taskType = "author";
  } else if (/review|audit|qa|check.*quality|validate/i.test(desc)) {
    result.taskType = "review";
  } else if (/illustrate|diagram|svg|image|visual/i.test(desc)) {
    result.taskType = "illustrate";
  } else {
    result.taskType = "unknown";
  }

  // Course detection (AWS certs + others)
  const coursePatterns = {
    "CLF-C02": /clf-?c0?2|cloud-?practitioner|clf/i,
    "SAA-C03": /saa-?c0?3|solutions-?architect|saa/i,
    "DVA-C02": /dva-?c0?2|developer-?associate|dva/i,
    "SQL": /sql/i,
    "BACKEND": /backend/i,
    "FRONTEND": /frontend/i,
    "ENGINEER": /engineer/i,
    "FOUNDATIONS": /foundations/i,
    "SYSTEM-DESIGN": /system.?design/i,
    "CS": /computer.?science|cs[^a-z]/i,
    "DSA": /dsa|data.?structure|algorithm/i,
  };

  for (const [course, pattern] of Object.entries(coursePatterns)) {
    if (pattern.test(desc)) {
      result.course = course;
      break;
    }
  }

  // Language detection
  if (/english/i.test(desc)) {
    result.targetLanguage = "English";
  }
  if (/vietnamese|việt/i.test(desc)) {
    if (result.taskType === "translate") {
      result.sourceLanguage = "Vietnamese";
    } else {
      result.targetLanguage = "Vietnamese";
    }
  }

  // Domain detection (1-4 for exams)
  const domainMatch = desc.match(/domain\s*(\d)/);
  if (domainMatch) {
    result.domain = parseInt(domainMatch[1]);
  }

  // Count detection (for author/review)
  const countMatch = desc.match(/(\d+)\s*questions?|(\d+)\s*q(?:\s|$)/);
  if (countMatch) {
    result.count = parseInt(countMatch[1] || countMatch[2]);
  }

  // Difficulty detection
  if (/difficulty.*mix|easy.*medium.*hard|all.*difficulty/i.test(desc)) {
    result.difficulty = "mixed";
  } else if (/easy/i.test(desc)) {
    result.difficulty = "easy";
  } else if (/medium/i.test(desc)) {
    result.difficulty = "medium";
  } else if (/hard/i.test(desc)) {
    result.difficulty = "hard";
  }

  // Special parameters per task type
  if (result.taskType === "translate") {
    if (/keep.*explanation.*vietnamese|explanation.*stay.*vietnamese/i.test(desc)) {
      result.parameters.keepExplanationLanguage = "Vietnamese";
    }
    if (/overwrite|replace/i.test(desc)) {
      result.parameters.overwrite = true;
    }
  }

  if (result.taskType === "review") {
    if (/domain.?mix/i.test(desc)) result.parameters.checkDomainMix = true;
    if (/difficulty/i.test(desc)) result.parameters.checkDifficulty = true;
    if (/duplicate/i.test(desc)) result.parameters.checkDuplicates = true;
    if (/shuffle/i.test(desc)) result.parameters.checkShuffleSafe = true;
  }

  if (result.taskType === "illustrate") {
    if (/svg|diagram/i.test(desc)) result.parameters.format = "svg";
    if (/inline/i.test(desc)) result.parameters.inline = true;
  }

  return result;
}

module.exports = { parseDescription };
