# BRD_To_USs — ProductOwnerSkill

## What it does
Transforms raw Business Requirements Document (BRD) text into a structured, Agile-ready list of **User Stories** with full **Acceptance Criteria**. It acts as an expert Product Owner / Business Analyst, applying the INVEST principle to produce atomic, testable stories that cover both happy paths and error/validation flows.

After generating the stories it automatically saves the output to a local markdown file named after the feature.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{input_brd}}` | Raw BRD text — paste the full document content, bullet-point requirements, or feature description. |

---

## Output
A markdown document containing one or more User Stories, each following this template:

```
### US-[ID]: [Feature/Action]
**As a** [user persona],
**I want to** [perform an action],
**So that** [achieve a goal/value].

**Acceptance Criteria:**
* **AC1:** [Criteria 1]
* **AC2:** [Criteria 2]
* **AC3:** [Criteria 3 — edge case / error handling]
```

### Saved file
```
stories/<FeatureName>_UserStories.md
```
The `FeatureName` is extracted from the BRD title or primary subject and sanitized (e.g., `"Add Employee"` → `Add_Employee`).

---

## Key rules applied
| Rule | Description |
|------|-------------|
| **INVEST** | Every story is Independent, Negotiable, Valuable, Estimable, Small, and Testable |
| **Atomic** | One story per flow — complex features are broken into separate stories |
| **No code** | Pure business logic only — no implementation or automation code |
| **Coverage** | At least one Happy Path and one Unhappy Path per feature area |

---

## Pipeline position
```
[BRD_To_USs] → USs_To_TCs → TCs_To_PLScript
```
This is **Step 1** of the pipeline. Its output (`stories/<FeatureName>_UserStories.md`) feeds directly into `USs_To_TCs`.

---

## Example invocation
Provide the full BRD text as the input. The skill will:
1. Parse the requirements
2. Generate all User Stories
3. Save them to `stories/<FeatureName>_UserStories.md`
4. Confirm the saved path
