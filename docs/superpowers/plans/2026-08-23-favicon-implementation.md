# Anime Calendar Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic blue favicon with the approved A3 “翻页播放” SVG for 「番时表」.

**Architecture:** Keep the favicon as one self-contained SVG in `public/favicon.svg`. The asset uses a transparent 64×64 canvas, a rose calendar page, a white play symbol, and a cyan folded corner; no component, metadata, dependency, or theme changes are needed.

**Tech Stack:** SVG, Next.js static assets, `xmllint`, existing `sharp` dependency, ESLint, Node test runner

---

### Task 1: Replace and verify the favicon

**Files:**
- Modify: `public/favicon.svg`
- Reference: `docs/superpowers/specs/2026-08-23-favicon-design.md`

- [ ] **Step 1: Confirm the existing asset is the generic blue favicon**

Run:

```bash
xmllint --noout public/favicon.svg
rg -n '#68C4FF|#0C79D8|#2E9EFF' public/favicon.svg
```

Expected: XML validation emits no output, and `rg` finds the old blue palette.

- [ ] **Step 2: Replace the SVG with the approved design**

Use this complete asset:

```svg
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>番时表</title>
  <defs>
    <linearGradient id="calendar" x1="11" y1="6" x2="53" y2="58" gradientUnits="userSpaceOnUse">
      <stop stop-color="#CF4B7B"/>
      <stop offset="1" stop-color="#96306D"/>
    </linearGradient>
  </defs>
  <path d="M13 7H51C55.4183 7 59 10.5817 59 15V45L45 59H13C8.58172 59 5 55.4183 5 51V15C5 10.5817 8.58172 7 13 7Z" fill="url(#calendar)"/>
  <path d="M5 22H59" stroke="#F7D7E3" stroke-width="3.5"/>
  <path d="M25 30.3V47.7C25 49.5 27 50.6 28.5 49.6L41.5 40.9C42.9 40 42.9 38 41.5 37.1L28.5 28.4C27 27.4 25 28.5 25 30.3Z" fill="#FFF9FB"/>
  <path d="M45 59V49C45 46.7909 46.7909 45 49 45H59L45 59Z" fill="#64D2CF"/>
</svg>
```

- [ ] **Step 3: Validate XML and the required design invariants**

Run:

```bash
xmllint --noout public/favicon.svg
node -e 'const fs=require("node:fs");const svg=fs.readFileSync("public/favicon.svg","utf8");for(const value of ["viewBox=\"0 0 64 64\"","#CF4B7B","#96306D","#FFF9FB","#64D2CF"]){if(!svg.includes(value))throw new Error(`missing ${value}`)}'
```

Expected: both commands exit successfully with no output.

- [ ] **Step 4: Render 64px, 32px, and 16px previews**

Run:

```bash
node -e 'const fs=require("node:fs");const sharp=require("sharp");const svg=fs.readFileSync("public/favicon.svg");Promise.all([64,32,16].map(size=>sharp(svg).resize(size,size).png().toFile(`/tmp/anime-calendar-favicon-${size}.png`))).catch(error=>{console.error(error);process.exit(1)})'
```

Expected: all three PNG files are created. Inspect them on light and dark backgrounds; the page outline and play symbol must remain clear, and the cyan fold must remain visible at 16px.

- [ ] **Step 5: Run repository verification**

Run:

```bash
npm run lint -- --ignore-pattern .worktrees
npm test
git diff --check -- public/favicon.svg docs/superpowers/plans/2026-08-23-favicon-implementation.md
```

Expected: lint, typecheck, build, tests, and diff hygiene all pass.

- [ ] **Step 6: Commit only the favicon implementation files**

```bash
git add public/favicon.svg docs/superpowers/plans/2026-08-23-favicon-implementation.md
git commit -m "feat: add anime calendar favicon"
```
