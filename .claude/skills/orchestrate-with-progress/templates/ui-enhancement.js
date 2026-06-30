/**
 * Workflow: Translate UI text + Implement filter feature for exam results
 *
 * Phases:
 * 1. Extract Vietnamese UI strings from Runner.tsx + pages
 * 2. Translate via agent batch
 * 3. Implement filter component (tabs + stats)
 * 4. Update files + verify
 * 5. Build + commit
 */

export const meta = {
  name: "ui-enhancement",
  description: "Translate UI to English + implement exam filter tabs & stats",
  phases: [
    { title: "Extract", detail: "Collect Vietnamese UI strings from 3 files" },
    { title: "Translate", detail: "Translate UI text to English (batch)" },
    { title: "Implement", detail: "Add filter component + stats breakdown" },
    { title: "Build", detail: "Verify + build + commit" },
  ]
};

log(`🎨 UI Enhancement: Translate to EN + implement filter\n`);

// Phase 1: Extract Vietnamese UI strings
phase("Extract");

const uiStrings = await agent(
  `
Extract all Vietnamese UI text from these 3 files (show exact strings + line numbers):
1. web/components/Runner.tsx
2. web/app/courses/[courseId]/page.tsx
3. web/app/history/page.tsx

Look for:
- Button labels ("Bộ khác", "Lịch sử", "Làm lại")
- Headers ("Chi tiết từng câu")
- Status text ("TRƯỢT", "ĐẬU")
- Any other Vietnamese UI text

Return JSON: {
  "files": [
    { "file": "web/components/Runner.tsx", "strings": ["text1 (line X)", "text2 (line Y)", ...] },
    ...
  ],
  "totalStrings": N
}
  `,
  { label: "extract-ui", phase: "Extract", schema: {
    type: "object",
    properties: {
      files: { type: "array", items: { type: "object" } },
      totalStrings: { type: "number" }
    }
  } }
);

log(`✓ Extracted ${uiStrings.totalStrings} UI strings from 3 files\n`);

// Phase 2: Translate UI text
phase("Translate");

const translated = await agent(
  `
Translate these Vietnamese UI strings to English:

${JSON.stringify(uiStrings.files, null, 2)}

Keep translations:
- Concise (under 3 words when possible)
- Consistent with exam/practice terminology
- Natural English UX text

Return JSON: {
  "translations": [
    { "vietnamese": "Bộ khác", "english": "Different set", "file": "...", "line": N },
    ...
  ]
}
  `,
  { label: "translate-ui", phase: "Translate", schema: {
    type: "object",
    properties: {
      translations: { type: "array", items: { type: "object" } }
    }
  } }
);

log(`✓ Translated ${translated.translations.length} UI strings\n`);

// Phase 3: Implement filter component
phase("Implement");

await agent(
  `
Implement filter feature for exam results in web/components/Runner.tsx:

**Changes:**
1. After result summary section (line ~444), add filter tabs:
   <div className="flex gap-2 mb-4">
     <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
       Tất cả ({prepared.length})
     </Button>
     <Button variant={filter === 'wrong' ? 'primary' : 'secondary'} onClick={() => setFilter('wrong')}>
       Câu sai ({wrongCount})
     </Button>
     <Button variant={filter === 'correct' ? 'primary' : 'secondary'} onClick={() => setFilter('correct')}>
       Câu đúng ({correctCount})
     </Button>
   </div>

2. Add stats breakdown (before question list, line ~458):
   <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
     <Stat label="Sai" value={wrongCount} color="danger"/>
     <Stat label="Đúng" value={correctCount} color="success"/>
     <Stat label="Pass rate" value={\`\${score}%\`}/>
     <Stat label="Time" value={durationStr}/>
   </div>

3. Filter question list:
   const filteredQuestions = prepared.filter((p, i) => {
     const isCorrect = selections[i]?.some(idx => p.optionMap[idx] === p.q.correctIndices[0]);
     if (filter === 'wrong') return !isCorrect;
     if (filter === 'correct') return isCorrect;
     return true;
   });

**Then translate these UI labels to English (see translations provided above).**

**Apply changes to files, then report success.**
  `,
  { label: "implement-feature", phase: "Implement" }
);

log(`✓ Implemented filter tabs + stats breakdown\n`);

// Phase 4: Build + commit
phase("Build");

await agent(
  `
Run build + verify + commit:

\`\`\`bash
cd /Users/dantt1002/projects/aws
cd web && npm run build 2>&1 | tail -5
cd ..
git add -A
git commit -m "Translate UI to English + implement exam filter tabs & stats

Add filter tabs (All/Wrong/Correct) and stats breakdown (wrong count,
correct count, pass rate, time) to exam results page. Translate all
UI text in Runner.tsx and pages from Vietnamese to English.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
git log --oneline -2
\`\`\`

Report success if build + commit pass.
  `,
  { label: "build-commit", phase: "Build" }
);

log(`\n✅ Workflow complete: UI translated + filter implemented\n`);

return { success: true, uiTranslated: translated.translations.length };
