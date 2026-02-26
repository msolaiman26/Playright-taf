# Setup_Workspace

## What it does
Initializes the local **workspace folder structure** required by the BRD-to-Playwright automation pipeline. It checks for the existence of each required directory and creates any that are missing — without touching or overwriting any existing content.

Run this skill **once** before using the pipeline for the first time in a new workspace.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{workspace_path}}` | Optional. The root path where directories should be created. Defaults to the current working directory if left blank. |

---

## Output
A confirmation table showing the status of each directory:

| Directory | Status |
|-----------|--------|
| `stories/` | ✅ Created / ✅ Already exists |
| `test_cases/` | ✅ Created / ✅ Already exists |
| `scripts/pages/` | ✅ Created / ✅ Already exists |
| `scripts/tests/` | ✅ Created / ✅ Already exists |

Followed by the message:
> "Workspace is ready. You can now run the pipeline: BRD_To_USs → USs_To_TCs → TCs_To_PLScript."

---

## Directories created
| Directory | Used by | Purpose |
|-----------|---------|---------|
| `stories/` | `BRD_To_USs`, `BRD_Full_Pipeline` | Stores generated User Stories markdown files |
| `test_cases/` | `BRD_Full_Pipeline` | Stores generated Manual Test Cases markdown files |
| `scripts/pages/` | `TCs_To_PLScript`, `BRD_Full_Pipeline` | Stores Playwright Page Object Model `.page.ts` files |
| `scripts/tests/` | `TCs_To_PLScript`, `BRD_Full_Pipeline` | Stores Playwright test spec `.spec.ts` files |

---

## Key rules applied
| Rule | Description |
|------|-------------|
| **Non-destructive** | Never deletes or overwrites existing files or directories |
| **Silent on existing** | Reports "Already exists" — does not raise errors |
| **No placeholder files** | Creates empty directories only — no stub files |

---

## Pipeline position
```
[Setup_Workspace] → BRD_To_USs → USs_To_TCs → TCs_To_PLScript
```
This is the **prerequisite step**. It is not part of the content-generation pipeline itself, but must be run before the pipeline if the workspace has not been initialized.

> **Tip:** `BRD_Full_Pipeline` runs this setup automatically in Phase 0, so you only need `Setup_Workspace` when using the individual skills separately.
