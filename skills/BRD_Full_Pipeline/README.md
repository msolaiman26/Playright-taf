# BRD_Full_Pipeline

## What it does
An **end-to-end, single-invocation pipeline** that takes a raw BRD and automatically executes all transformation and automation steps in sequence — from requirements to committed, runnable Playwright scripts.

It orchestrates three specialist roles (Product Owner, QA Analyst, Automation Engineer) without any manual hand-off between steps. All intermediate and final artifacts are saved locally, and a dedicated **git feature branch** is created and committed automatically.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{input_brd}}` | Raw BRD text — the full document content, bullet-point requirements, or feature description. |

---

## Pipeline phases

### Phase 0 — Setup
Derives all naming tokens from the BRD feature name and creates required directories.

| Token | Format | Example |
|-------|--------|---------|
| `FeatureName` | Underscored | `Add_Employee` |
| `PageName` | PascalCase | `AddEmployee` |
| `feature-slug` | lowercase-hyphenated | `add-employee` |
| `branch-name` | `feature/<FeatureName>` | `feature/Add_Employee` |

Directories created (if missing): `stories/`, `test_cases/`, `scripts/pages/`, `scripts/tests/`

---

### Phase 1 — BRD → User Stories *(ProductOwnerSkill)*
Applies the INVEST principle to break the BRD into atomic, testable User Stories with Acceptance Criteria covering happy paths and error flows.

**Saved to:** `stories/<FeatureName>_UserStories.md`

---

### Phase 2 — User Stories → Manual Test Cases *(QAAnalystSkill)*
Converts each User Story's Acceptance Criteria into explicit, step-by-step test cases with exact field names, data values, and expected outcomes.

**Saved to:** `test_cases/<FeatureName>_TestCases.md`

---

### Phase 3 — Test Cases → Playwright Scripts *(AutomationEngineerSkill)*
Generates two TypeScript files following Playwright best practices and POM architecture:
- A Page Object Model class with encapsulated locators and action methods
- A test spec file with fully isolated `test()` blocks and web-first assertions

**Saved to:**
- `scripts/pages/<PageName>.page.ts`
- `scripts/tests/<feature-slug>.spec.ts`

---

### Phase 4 — Git Branch & Commit
Creates a feature branch, stages all generated artifacts, and commits them.

```bash
git init
git checkout -b feature/<FeatureName>
git add stories/<FeatureName>_UserStories.md
git add test_cases/<FeatureName>_TestCases.md
git add scripts/pages/<PageName>.page.ts
git add scripts/tests/<feature-slug>.spec.ts
git commit -m "feat(<FeatureName>): add user stories, test cases, and playwright scripts"
```

---

## All artifacts produced

| Artifact | Path | Description |
|----------|------|-------------|
| User Stories | `stories/<FeatureName>_UserStories.md` | Agile User Stories with Acceptance Criteria |
| Test Cases | `test_cases/<FeatureName>_TestCases.md` | Manual test cases with explicit steps |
| Page Object Model | `scripts/pages/<PageName>.page.ts` | Playwright POM class (TypeScript) |
| Test Spec | `scripts/tests/<feature-slug>.spec.ts` | Playwright test spec (TypeScript) |
| Git branch | `feature/<FeatureName>` | All artifacts committed |

---

## Error handling
- If git operations fail (e.g., no git installed or permission denied), all files are still saved locally and the user is warned to commit manually.
- The pipeline never aborts mid-phase — content generation always completes before any file-save or git operation is attempted.

---

## When to use this vs. individual skills

| Scenario | Use |
|----------|-----|
| New feature, full automation needed in one shot | `BRD_Full_Pipeline` |
| Regenerate only the User Stories for an existing feature | `BRD_To_USs` |
| Regenerate only the test cases from updated stories | `USs_To_TCs` |
| Regenerate only the Playwright scripts from updated test cases | `TCs_To_PLScript` |
| Set up a fresh workspace before using individual skills | `Setup_Workspace` |

---

## Complete flow
```
{{input_brd}}
      │
      ▼ Phase 0 — extract names, create directories
      │
      ▼ Phase 1 — User Stories ──────────────► stories/<FeatureName>_UserStories.md
      │
      ▼ Phase 2 — Test Cases ─────────────────► test_cases/<FeatureName>_TestCases.md
      │
      ▼ Phase 3 — Playwright Scripts ─────────► scripts/pages/<PageName>.page.ts
      │                                         scripts/tests/<feature-slug>.spec.ts
      │
      ▼ Phase 4 — git branch feature/<FeatureName>  ──► commit all artifacts
```
