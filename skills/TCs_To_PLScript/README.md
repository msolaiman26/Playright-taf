# TCs_To_PLScript — AutomationEngineerSkill

## What it does
Transforms manual **Test Cases** into production-ready **Playwright TypeScript automation scripts** following the Page Object Model (POM) design pattern. It acts as a Lead QA Automation Engineer / SDET, producing two distinct, lint-compliant TypeScript files:

1. A **Page Object Model** class (`*.page.ts`) that encapsulates all locators and interaction methods for the feature under test.
2. A **Test Spec file** (`*.spec.ts`) that implements every test case as an isolated, independently runnable Playwright test.

Both files are saved to the local filesystem automatically.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{test_cases}}` | Markdown-formatted Manual Test Cases produced by the `USs_To_TCs` skill, or any test cases following the `TC-[ID].[Sub-ID]` format. |

---

## Output

### File 1 — Page Object Model
Saved to: `scripts/pages/<PageName>.page.ts`

```typescript
import { Page, Locator } from '@playwright/test';

export class <PageName>Page {
  readonly page: Page;
  readonly <elementName>: Locator;

  constructor(page: Page) {
    this.page = page;
    this.<elementName> = page.getByRole('button', { name: 'Submit' });
  }

  async <actionName>() {
    // action logic — no assertions
  }
}
```

### File 2 — Test Spec
Saved to: `scripts/tests/<feature-slug>.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { <PageName>Page } from '../pages/<feature-slug>.page';

test.describe('<FeatureName>', () => {
  test.beforeEach(async ({ page }) => { /* setup */ });

  test('<TC-ID>: <Title>', async ({ page }) => {
    await test.step('Action', async () => { /* ... */ });
    await test.step('Verify', async () => {
      await expect(locator).toBeVisible();
    });
  });
});
```

### Saved files
| File | Path |
|------|------|
| Page Object Model | `scripts/pages/<PageName>.page.ts` |
| Test Spec | `scripts/tests/<feature-slug>.spec.ts` |

`PageName` is PascalCase (e.g., `AddEmployee`). `feature-slug` is lowercase-hyphenated (e.g., `add-employee`).

---

## Key rules applied
| Rule | Description |
|------|-------------|
| **Best-practice locators** | Only `getByRole`, `getByText`, `getByTestId` — no XPath or CSS selectors |
| **Encapsulation** | All assertions live in spec files only — POM methods perform actions, not verifications |
| **Web-first assertions** | `await expect(locator).toBeVisible()` — Playwright's auto-retrying assertions throughout |
| **Full isolation** | Every `test(...)` block is independent; `beforeEach` handles setup |

---

## Pipeline position
```
BRD_To_USs → USs_To_TCs → [TCs_To_PLScript]
```
This is **Step 3** (final step) of the pipeline. It consumes test cases from `USs_To_TCs` and produces the final executable Playwright scripts.

---

## Example invocation
Paste the Manual Test Cases markdown as input. The skill will:
1. Analyse each test case's steps and expected results
2. Design the POM class with appropriate locators and action methods
3. Write the spec file with one `test()` block per test case
4. Save both files and confirm the paths
