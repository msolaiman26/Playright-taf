# Self-Healing Locators

**Playwright Test Automation Framework**
**Last Updated:** 2026-02-24

---

## Table of Contents

1. [The Problem](#the-problem)
2. [How It Works — Three-Phase Healing](#how-it-works--three-phase-healing)
3. [File Structure](#file-structure)
4. [Architecture Overview](#architecture-overview)
5. [Locator Repositories](#locator-repositories)
6. [Defining a Self-Healing Locator](#defining-a-self-healing-locator)
7. [AI Providers](#ai-providers)
8. [Configuration via Environment Variables](#configuration-via-environment-variables)
9. [Integration with Existing Helpers](#integration-with-existing-helpers)
10. [Using Self-Healing in Tests](#using-self-healing-in-tests)
11. [Post-Test Healing Report](#post-test-healing-report)
12. [Adding a New Self-Healing Page](#adding-a-new-self-healing-page)
13. [Implementing a Custom AI Provider](#implementing-a-custom-ai-provider)
14. [Log Output Reference](#log-output-reference)
15. [Troubleshooting](#troubleshooting)

---

## The Problem

Standard Playwright locators are tied to a single CSS or XPath selector. When developers rename a class, restructure a component, or change an attribute, every test that touches the affected element breaks — even though the element is still on the page and functionally unchanged.

The naive fix — maintaining a hand-written list of fallback selectors — only defers the problem. If all listed selectors target attributes that change together (e.g. all use the same class), the list fails as a unit.

**Self-healing locators solve this differently.** Instead of listing more selectors, you describe *what the element is* — its role, its label, its visible text. The framework derives resilient Playwright strategies from that description automatically, and falls back to an AI model when even those strategies fail.

---

## How It Works — Three-Phase Healing

Every `SelfHealingLocator` runs through up to three phases each time `.get()` is called:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 1 — Primary selector                                          │
│  Try the CSS/XPath you wrote.                                        │
│  Element found → return immediately, zero overhead.                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ FAILS (timeout)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 2 — Semantic auto-strategies (derived from ElementMetadata)  │
│  Auto-generated in order from the fields you filled in:             │
│    getByRole(role, { name })  →  most stable, uses ARIA tree        │
│    getByLabel(label)          →  form inputs with <label>           │
│    getByPlaceholder(text)     →  inputs with placeholder attr       │
│    getByText(text, exact)     →  buttons, headings, paragraphs      │
│    getByAltText(text)         →  images                             │
│    getByTestId(id)            →  data-testid attribute              │
│  First match → return with WARN log "Healed via semantic strategy"  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ ALL FAIL
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 3 — AI healing (opt-in, requires env var)                    │
│  1. Capture simplified page HTML (scripts/styles stripped)          │
│  2. Send to AI with element description                             │
│  3. AI returns a selector string                                    │
│  4. Probe the AI suggestion                                         │
│  Match → return with WARN log "AI-healed: suggested '...'"         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ AI also fails / not configured
                               ▼
               Return primary selector → Playwright raises
               its natural timeout error with full context
```

**Key property:** Phase 1 is free — no extra network or DOM queries when the primary selector works. The overhead only pays when healing is actually needed.

---

## File Structure

```text
src/
├── locators/
│   ├── login-page-locators.ts        ← Locator repository: LoginPage selector data
│   └── home-page-locators.ts         ← Locator repository: HomePage selector data
├── utils/
│   ├── self-healing-locator.ts       ← Core class, LocatorDefinition, ElementMetadata
│   ├── self-healing-page-base.ts     ← Abstract base class for self-healing pages
│   └── ai-healing-providers.ts       ← Built-in AI providers
├── pages/
│   ├── login-page-self-healing.ts    ← LoginPage behaviour (no inline selectors)
│   ├── home-page-self-healing.ts     ← HomePage behaviour (no inline selectors)
│   └── pom-lazy-self-healing.ts      ← POM manager (wires pages + AI provider)
tests/
├── fixtures/
│   └── self-healing-fixture.ts       ← Playwright fixture (auto-configures AI)
└── ui/specs/
    └── login-with-self-healing.spec.ts ← Demo test spec
```

The original `login-page.ts`, `home-page.ts`, and `pom-lazy.ts` are **not modified** — the self-healing files are standalone copies.

---

## Architecture Overview

The implementation is split into four distinct concerns — each layer has a single responsibility:

```text
┌──────────────────────────────┐
│   src/locators/*.ts           │  ← WHAT to find
│   LocatorDefinition objects   │    (selector strings + semantic metadata, no Page dep)
└──────────────┬───────────────┘
               │ SelfHealingLocator.from(page, def, logger)
               ▼
┌──────────────────────────────┐
│   SelfHealingLocator          │  ← HOW to find it
│   (3-phase healing logic)     │    (probe → semantic → AI)
└──────────────┬───────────────┘
               │ await locator.get()
               ▼
┌──────────────────────────────┐
│   SelfHealingPageBase         │  ← WHAT to do once found
│   + Page subclasses           │    (actions, assertions, navigation)
│   (auto-healing report)       │    getHealingReport() auto-discovers locators
└──────────────┬───────────────┘
               │ pomSelfHealing.getHealingReport()
               ▼
┌──────────────────────────────┐
│   POMLazySelfHealing          │  ← Wires pages + AI provider
│   self-healing-fixture.ts     │    Logs post-test summary
└──────────────────────────────┘
```

### SelfHealingPageBase

Every self-healing page class extends `SelfHealingPageBase`. The base class provides:

- **`pageName` (auto)** — derived from the class name by stripping the `SelfHealing` suffix.
  `LoginPageSelfHealing` → `"LoginPage"`, `HomePageSelfHealing` → `"HomePage"`.
  Override if you need a different label.

- **`allLocators()` (auto-discovery)** — uses `Object.entries(this)` to find every
  `SelfHealingLocator` instance on the page object at runtime. No manual list to maintain
  and no risk of forgetting a newly added locator.

- **`getHealingReport()` (inherited)** — filters out locators never called during the test
  and formats the result. Returns an empty string when nothing was exercised.

A minimal subclass has **zero boilerplate** beyond its constructor and page methods:

```typescript
export class MyPageSelfHealing extends SelfHealingPageBase {
    readonly myInput  = SelfHealingLocator.from(page, myLocators.myInput,  logger);
    readonly myButton = SelfHealingLocator.from(page, myLocators.myButton, logger);

    async clickButton() {
        await this.actions.click(await this.myButton.get(), 'Click button');
    }
    // getHealingReport() works automatically — nothing else needed
}
```

---

## Locator Repositories

Selector strings and semantic metadata live in dedicated repository files under `src/locators/`.
They contain **pure data only** — no `Page` dependency, no logic, safe to import anywhere.

Page objects read from the repository and instantiate `SelfHealingLocator` objects via
`SelfHealingLocator.from()` — keeping selectors entirely separate from page behaviour.

### LocatorDefinition type

```typescript
// src/utils/self-healing-locator.ts (exported)
export interface LocatorDefinition {
    selector: string;           // Primary CSS or XPath selector
    metadata: ElementMetadata;  // Semantic description for healing
}
```

### Example repository

```typescript
// src/locators/login-page-locators.ts
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const loginLocators = {

    usernameInput: {
        selector: 'input[name="username"]',
        metadata: {
            role:        'textbox',
            label:       'Username',
            placeholder: 'Username',
            description: 'Username text input on the OrangeHRM login form',
        },
    },

    loginButton: {
        selector: 'button[type="submit"]',
        metadata: {
            role:        'button',
            name:        'Login',
            text:        'Login',
            description: 'Login submit button on the OrangeHRM login form',
        },
    },

    // ... more locators

} satisfies Record<string, LocatorDefinition>;
```

The `satisfies` keyword enforces `LocatorDefinition` shape on every entry while preserving
the precise property names for type-safe access (`loginLocators.usernameInput`).

### SelfHealingLocator.from()

The static factory creates a `SelfHealingLocator` from a `LocatorDefinition` in one call:

```typescript
// In the page constructor:
this.usernameInput = SelfHealingLocator.from(page, loginLocators.usernameInput, this.logger, aiProvider);
// equivalent to:
this.usernameInput = new SelfHealingLocator(
    page, loginLocators.usernameInput.selector, loginLocators.usernameInput.metadata, this.logger, aiProvider
);
```

---

## Defining a Self-Healing Locator

### ElementMetadata fields

Fill only the fields that apply to the element. Unused fields are silently skipped when building Phase 2 strategies.

| Field | Type | Used by | Example |
| --- | --- | --- | --- |
| `description` | `string` **required** | Phase 3 AI prompt + healing reports | `"Login submit button on the OrangeHRM login form"` |
| `role` | `AriaRole` | `getByRole()` | `'button'`, `'textbox'`, `'heading'`, `'img'` |
| `name` | `string` | `getByRole(role, { name })` | `'Login'`, `'Dashboard'` |
| `label` | `string` | `getByLabel()` | `'Username'`, `'Password'` |
| `placeholder` | `string` | `getByPlaceholder()` | `'Username'`, `'Password'` |
| `text` | `string` | `getByText(text, { exact: true })` | `'Login'`, `'Invalid credentials'` |
| `altText` | `string` | `getByAltText()` | `'profile picture'` |
| `testId` | `string` | `getByTestId()` | `'login-btn'` |

### SelfHealingLocator.wasUsed()

Returns `true` when `.get()` was called at least once during the test. Used internally by
`getHealingReport()` to skip locators that were never exercised.

```typescript
if (locator.wasUsed()) {
    // only reachable when get() was called
}
```

---

## AI Providers

Built-in providers live in `src/utils/ai-healing-providers.ts`. All use native `fetch` — no extra npm packages required.

### AnthropicHealingProvider (Claude)

```typescript
import { AnthropicHealingProvider } from '../utils/ai-healing-providers';

const provider = new AnthropicHealingProvider(
    process.env.ANTHROPIC_API_KEY!,
    'claude-haiku-4-5-20251001',  // optional, this is the default
);
```

### GeminiHealingProvider (Google Gemini)

```typescript
import { GeminiHealingProvider } from '../utils/ai-healing-providers';

const provider = new GeminiHealingProvider(
    process.env.GEMINI_API_KEY!,
    'gemini-2.0-flash',  // optional, this is the default
);

// Other available models: gemini-2.0-flash-lite, gemini-1.5-pro, gemini-1.5-flash
```

### OpenAIHealingProvider (ChatGPT / any OpenAI-compatible endpoint)

```typescript
import { OpenAIHealingProvider } from '../utils/ai-healing-providers';

// Standard OpenAI
const provider = new OpenAIHealingProvider(
    process.env.OPENAI_API_KEY!,
    'gpt-4o-mini',               // optional, this is the default
);

// Azure OpenAI
const azureProvider = new OpenAIHealingProvider(
    process.env.AZURE_OPENAI_KEY!,
    'gpt-4o',
    'https://my-resource.openai.azure.com/openai/deployments/gpt-4o',
);

// Ollama (local, no key required)
const ollamaProvider = new OpenAIHealingProvider(
    '',
    'llama3',
    'http://localhost:11434/v1',
);
```

### AIHealingProvider interface

Any class that implements this single-method interface works as a provider:

```typescript
export interface AIHealingProvider {
    suggestSelector(pageSnapshot: string, elementDescription: string): Promise<string | null>;
}
```

Return the raw selector string (CSS or XPath), or `null` / `'UNABLE_TO_HEAL'` if the model cannot determine one.

---

## Configuration via Environment Variables

The fixture reads these variables automatically — no code changes needed to switch providers.

```bash
# .env

# Claude (highest priority)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # optional override

# Google Gemini (second priority)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash               # optional override

# OpenAI / compatible (third priority)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini                    # optional override
OPENAI_BASE_URL=https://api.openai.com/v1   # optional — override for Azure/Ollama
```

**Priority:** `ANTHROPIC_API_KEY` → `GEMINI_API_KEY` → `OPENAI_API_KEY` → no AI (semantic-only healing).

Without any key the framework still heals via Phase 2 (semantic strategies) — AI is purely additive.

---

## Integration with Existing Helpers

`AdvancedActionsHelper` and `AdvancedAssertionsHelper` accept plain Playwright `Locator` objects — they are not changed. Page methods call `await locator.get()` to resolve the self-healing locator into a standard `Locator` before passing it to a helper.

```typescript
// Standard page (login-page.ts) — unchanged
await this.actions.fill(this.usernameInput, username, 'Enter username');
//                       ↑ Playwright Locator, assigned in constructor

// Self-healing page (login-page-self-healing.ts)
await this.actions.fill(await this.usernameInput.get(), username, 'Enter username');
//                       ↑ get() resolves to a Playwright Locator via 3-phase healing
```

The helpers, fixture, and test layer are completely transparent to the healing logic.

---

## Using Self-Healing in Tests

Import from the self-healing fixture instead of the standard one. The test API is **identical** to `pom-lazy-fixture`.

```typescript
// tests/ui/specs/login-with-self-healing.spec.ts
import { test } from '../../fixtures/self-healing-fixture';

test.describe('Self-Healing: Login', () => {
    test.beforeEach(async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
    });

    test('Successful login', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        await pomSelfHealing.homePage.assertProfileIcon();
    });

    test('Failed login - invalid credentials', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'wrong');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });
});
```

Run the spec:

```bash
npx playwright test tests/ui/specs/login-with-self-healing.spec.ts --project=ui
```

---

## Post-Test Healing Report

After every test the fixture logs a healing summary. Only locators that were **actually called** during the test appear — locators that were never exercised are silently omitted.

```text
--- Self-Healing Locator Summary ---
LoginPage:
  usernameInput        : ⚠ HEALED   — "Username text input on the OrangeHRM login form" via [Semantic: getByPlaceholder('Username')]
  passwordInput        : ✓ PRIMARY  — "Password text input on the OrangeHRM login form"
  loginButton          : ✓ PRIMARY  — "Login submit button on the OrangeHRM login form"
HomePage:
  profile_icn          : ✓ PRIMARY  — "User profile dropdown image in the OrangeHRM top navigation bar"
```

**Reading the report:**

- `✓ PRIMARY` — primary selector worked, no healing needed
- `⚠ HEALED via [Semantic: ...]` — Phase 2 triggered; update the primary selector soon
- `⚠ HEALED via [AI: ...]` — Phase 3 triggered; investigate the DOM change
- `✗ FAILED` — all strategies exhausted; the element could not be found at all

Any `HEALED` entry is a maintenance signal: the primary selector is stale and should be updated in the next sprint.

### Ownership of the report

The report is assembled bottom-up. Each layer owns only its own slice:

```text
SelfHealingLocator.getHealingReport()     → one line per locator (pending entries skipped by wasUsed())
    ↑ auto-discovered by
SelfHealingPageBase.getHealingReport()    → filters used locators via Object.entries(this)
    ↑ called on each initialised page by
POMLazySelfHealing.getHealingReport()     → skips pages with empty reports
    ↑ called by
self-healing-fixture.ts                   → logs the result, knows nothing about locator names
```

Adding a new locator to a page automatically includes it in the report on the next run — no fixture or POM manager change needed.

---

## Adding a New Self-Healing Page

### 1. Create the locator repository

```typescript
// src/locators/my-page-locators.ts
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const myPageLocators = {

    myButton: {
        selector: '.my-button',
        metadata: {
            role:        'button',
            name:        'Submit',
            description: 'Submit button on My Page',
        },
    },

    myInput: {
        selector: 'input#search',
        metadata: {
            role:        'textbox',
            placeholder: 'Search…',
            description: 'Search text input on My Page',
        },
    },

} satisfies Record<string, LocatorDefinition>;
```

### 2. Create the page class

Extend `SelfHealingPageBase` — the report is inherited automatically.

```typescript
// src/pages/my-page-self-healing.ts
import { Page } from '@playwright/test';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { SelfHealingPageBase } from '../utils/self-healing-page-base';
import { HelperFactory } from '../factories/helper-factory';
import { Logger } from '../utils/Logger';
import { myPageLocators } from '../locators/my-page-locators';

export class MyPageSelfHealing extends SelfHealingPageBase {
    readonly myButton: SelfHealingLocator;
    readonly myInput:  SelfHealingLocator;

    constructor(page: Page, testName?: string, aiProvider?: AIHealingProvider) {
        super();
        const logger  = Logger.getLogger(`MyPageSelfHealing-${testName}`);
        const helpers = HelperFactory.createHelpers(page, testName ?? 'MyPage');
        this.actions  = helpers.actions;
        this.assert   = helpers.assert;

        this.myButton = SelfHealingLocator.from(page, myPageLocators.myButton, logger, aiProvider);
        this.myInput  = SelfHealingLocator.from(page, myPageLocators.myInput,  logger, aiProvider);
    }

    async clickButton() {
        await this.actions.click(await this.myButton.get(), 'Click submit button');
    }
    // getHealingReport() is fully inherited — nothing else needed
}
```

### 3. Add a lazy getter to POMLazySelfHealing

```typescript
// src/pages/pom-lazy-self-healing.ts
import { MyPageSelfHealing } from './my-page-self-healing';

private _myPage?: MyPageSelfHealing;

get myPage(): MyPageSelfHealing {
    if (!this._myPage) {
        this._myPage = new MyPageSelfHealing(this.page, this._testName, this._aiProvider);
    }
    return this._myPage;
}
```

### 4. Update getHealingReport() in POMLazySelfHealing

```typescript
getHealingReport(): string {
    const sections: string[] = [];
    if (this._loginPage) { const r = this._loginPage.getHealingReport(); if (r) sections.push(r); }
    if (this._homePage)  { const r = this._homePage.getHealingReport();  if (r) sections.push(r); }
    if (this._myPage)    { const r = this._myPage.getHealingReport();    if (r) sections.push(r); }
    return sections.length > 0 ? sections.join('\n') : '(no locators were exercised during this test)';
}
```

No changes to the fixture or test specs are needed.

---

## Implementing a Custom AI Provider

Extend `CustomAIHealingProvider` and override `callAPI`, or implement `AIHealingProvider` directly. Use this for any provider not covered by the three built-ins (e.g. Cohere, AWS Bedrock, Mistral).

### Example — Cohere

```typescript
// src/utils/cohere-healing-provider.ts
import { CustomAIHealingProvider } from './ai-healing-providers';

export class CohereHealingProvider extends CustomAIHealingProvider {
    constructor(private readonly apiKey: string) { super(); }

    protected async callAPI(prompt: string): Promise<string | null> {
        const response = await fetch('https://api.cohere.com/v2/chat', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model:    'command-r-plus',
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!response.ok) throw new Error(`Cohere API error ${response.status}`);
        const data = await response.json();
        return data.message?.content?.[0]?.text?.trim() ?? null;
    }
}
```

Wire it directly to `POMLazySelfHealing`:

```typescript
const pom = new POMLazySelfHealing(page, testName, new CohereHealingProvider(apiKey));
```

---

## Log Output Reference

| Log level | Message pattern | Meaning |
| --- | --- | --- |
| `DEBUG` | `[SelfHealingLocator] ✓ Primary resolved: "…" → css-selector` | Normal — primary worked |
| `WARN` | `[SelfHealingLocator] Primary selector failed for "…"` | Phase 1 failed, healing starts |
| `WARN` | `[SelfHealingLocator] ⚠ Healed via semantic strategy for "…": getByLabel('Username')` | Phase 2 success |
| `WARN` | `[SelfHealingLocator] Semantic strategies exhausted — invoking AI healing for "…"` | Phase 3 starting |
| `WARN` | `[SelfHealingLocator] ✨ AI-healed "…": suggested selector "input[data-qa=...]"` | Phase 3 success |
| `WARN` | `[SelfHealingLocator] AI could not suggest a selector for "…"` | AI returned null |
| `ERROR` | `[SelfHealingLocator] ✗ All healing strategies failed for "…"` | All phases exhausted |
| `INFO` | `[SelfHealingFixture] AI provider: Google Gemini (gemini-2.0-flash)` | Provider wired at startup |
| `INFO` | `[SelfHealingFixture] No AI provider configured — using semantic auto-healing only` | No env key set |

---

## Troubleshooting

### Phase 2 never triggers even though the primary is broken

`probeTimeout` (default 2 000 ms) controls how long each probe waits. If the page is slow to load, the primary probe may time out before the element appears — and Phase 2 probes then also time out. **Fix:** increase `probeTimeout` or ensure `navigateToLogin()` waits for the page to settle before calling `.get()`.

```typescript
// Override probe timeout for slow pages
await this.actions.fill(await this.usernameInput.get(5000), username, 'Enter username');
```

### AI healing is not activating

- Check that a key (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY`) is set in `.env` and loaded via `dotenv`.
- The fixture logs `[SelfHealingFixture] AI provider: …` at test start — if you see "No AI provider configured" the key was not found.
- AI healing only triggers after **all** Phase 2 semantic strategies fail. If `getByLabel` succeeds, Phase 3 is never called.

### AI returns a selector that does not match

The AI works from a 12 000-character HTML snapshot. For very dynamic pages (SPAs with heavy JS rendering) the snapshot may not reflect the live DOM. Try increasing the snapshot limit in `SelfHealingLocator.capturePageSnapshot()` or wait for the element's container to render before calling `.get()`.

### All three phases fail

The element genuinely cannot be found. Possible causes:

- The page has not finished loading (`navigateToLogin` did not wait long enough)
- The element is inside an iframe or shadow DOM (Playwright locators do not pierce these by default)
- The element no longer exists in the new version of the application

Check the `ERROR` log line which includes the element description for quick identification.

### "HEALED" entries appear on every run

The primary selector is stale. Use the healing report to identify which selectors need updating and fix them in the next maintenance window. Self-healing is a **safety net**, not a substitute for keeping primary selectors current.

### A new locator is missing from the healing report

Because `allLocators()` discovers locators via `Object.entries(this)`, the locator property
must be declared directly on the page class (not inside a nested object). Properties declared
with `readonly` in the class body are enumerable own properties and are discovered automatically.

[↑ Back to top](#table-of-contents)

---

**Maintained by:** Test Automation Team
**Version:** 1.2
**Last Updated:** 2026-02-24
