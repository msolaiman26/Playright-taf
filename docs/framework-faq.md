# Playwright Test Automation Framework — FAQ

**Frequently Asked Questions & Quick Reference**

**Last Updated:** 2026-02-23

---

## Table of Contents

- [General Questions](#general-questions)
- [Design Patterns](#design-patterns)
- [Fixtures](#fixtures)
- [Page Objects](#page-objects)
- [Helpers & Utilities](#helpers--utilities)
- [Logging](#logging)
- [Testing Strategies](#testing-strategies)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)

---

## General Questions

### Q: What is this framework and what does it do?

**A:** An enterprise-grade Playwright test automation framework built with TypeScript. It provides:

- **Page Object Model (POM)** for clean UI abstraction
- **Custom Fixtures** for dependency injection and lifecycle management
- **Advanced Helpers** for logged actions and assertions (soft/hard)
- **Winston Logging** with console, rotating file, and HTML report outputs
- **StepRunner** bridging Winston logs to Playwright's native HTML report via `test.step()`
- **Network Interception** for API mocking and modification
- **Builder & Factory Patterns** for clean object creation
- **Data-Driven Testing** with multiple data formats

Target applications:
- **UI Tests:** OrangeHRM Demo (`https://opensource-demo.orangehrmlive.com`)
- **API Tests:** JSONPlaceholder (`https://jsonplaceholder.typicode.com`)

---

### Q: What design patterns are implemented in this framework?

**A:** The framework implements **11 design patterns**:

1. **Page Object Model (POM)** — Encapsulates UI elements and interactions
2. **Manager Pattern** (Eager/Lazy) — Manages multiple page objects
3. **Fixture Pattern** — Playwright's dependency injection
4. **Helper/Wrapper Pattern** — Enhanced actions and assertions
5. **Adapter Pattern (StepRunner)** — Bridges Winston logs and `test.step()` for dual-channel observability
6. **Factory Pattern** — Centralized object creation (`HelperFactory`, `PageFactory`)
7. **Centralized Logging** — Winston with three output channels
8. **Endpoint Abstraction** — API request centralization
9. **Data-Driven Testing** — Parameterized tests from external data
10. **Network Interception** — API mocking, modification, blocking
11. **Builder Pattern** — Fluent API for test data creation (`UserBuilder`)

For detailed analysis and recommended Phase 2–4 patterns, see [design-patterns-analysis.md](design-patterns-analysis.md).

---

### Q: Where can I find documentation for specific topics?

**A:**

| Document | Purpose |
|---|---|
| [design-patterns-analysis.md](design-patterns-analysis.md) | All 11 design patterns with examples and roadmap |
| [fixtures-documentation.md](fixtures-documentation.md) | Complete fixture catalog and decision matrix |
| [logging-guide.md](logging-guide.md) | Winston + StepRunner logging guide |
| [framework-faq.md](framework-faq.md) | This document — FAQ and quick reference |
| [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) | Navigation index for all docs |

---

## Design Patterns

### Q: What are Test Fixtures and why do we need them?

**A:** Test Fixtures are Playwright's dependency injection mechanism — they eliminate repetitive setup/teardown code.

**Without Fixtures (repetitive):**
```typescript
test('login test 1', async ({ page }) => {
    // Setup repeated in EVERY test
    const pomEager = new POMEager(page, 'test1');
    const logger = Logger.getLogger('Fixture-test1');
    logger.info('▶ TEST START');
    await pomEager.getLoginPage().navigateToLogin();
    // ... test logic
});
```

**With Fixtures (clean):**
```typescript
// Defined once in tests/fixtures/pom-eager-fixture.ts
export const test = base.extend<{ pomEagerFixture: POMEagerFixture }>({
    pomEagerFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-POMEager-${testInfo.title}`);
        const pomEager = new POMEager(page, testInfo.title);
        logger.info(`▶ TEST START: "${testInfo.title}"`);
        await use({ pomEager, logger });
        // Teardown: automatic lifecycle logging
    }
});

// Tests are clean and focused
test('login test 1', async ({ pomEagerFixture }) => {
    const { pomEager } = pomEagerFixture;
    await pomEager.getLoginPage().login('Admin', 'admin123');
});
```

**Benefits:**
- **DRY** — setup/teardown written once
- **Automatic lifecycle** — setup before test, teardown after (even on failure)
- **Test isolation** — fresh instances per test
- **Centralized logging** — lifecycle logging in one place

See [fixtures-documentation.md](fixtures-documentation.md) for the complete fixture guide.

---

### Q: What's the difference between POMEager and POMLazy?

**A:** Initialization strategy:

**POMEager — all pages created upfront:**
```typescript
export class POMEager {
    private readonly loginPage: LoginPage;
    private readonly homePage: HomePage;

    constructor(page: Page, testName: string) {
        // Creates ALL pages immediately
        this.loginPage = new LoginPage(page, testName);
        this.homePage = new HomePage(page, testName);
    }
}
```

- **Pros:** Simple, errors surface immediately, all pages ready
- **Cons:** Higher memory (all pages loaded even if unused)
- **Best for:** Tests using multiple pages

**POMLazy — pages created on-demand:**
```typescript
export class POMLazy {
    private _loginPage?: LoginPage;

    get loginPage(): LoginPage {
        if (!this._loginPage) {
            // Creates only when accessed for the first time
            this._loginPage = new LoginPage(this.page, this._testName ?? "");
        }
        return this._loginPage;
    }
}
```

- **Pros:** Memory efficient, faster initialization, only used pages loaded
- **Cons:** Errors deferred until first page access
- **Best for:** Tests using only 1–2 pages (the majority of tests)

---

### Q: What is the Builder Pattern and how do I use it?

**A:** Builder Pattern provides a fluent API for creating complex test data objects.

```typescript
// Preset configurations
const validUser = new UserBuilder().asValidAdmin().build();
const invalidUser = new UserBuilder().asInvalidPassword().build();

// Custom configuration (chainable)
const customUser = new UserBuilder()
    .withUsername('CustomUser')
    .withPassword('customwrongpass')
    .asInvalidUser('custom invalid credentials')
    .withDescription('Custom test case')
    .build();

// Generate multiple test cases for data-driven tests
const invalidUsers = UserBuilder.buildInvalidUsers(); // returns TestUser[]
```

**Benefits:** readable, self-documenting, build-time validation, preset configurations.

See `src/builders/user-builder.ts` and `tests/ui/specs/login-with-builder.spec.ts`.

---

### Q: What is the Factory Pattern and how do I use it?

**A:** Factory Pattern centralizes object creation logic. The framework has two factories:

**HelperFactory** — creates helpers:
```typescript
// Create UI test helpers (used inside API fixture)
const { actions, assert } = HelperFactory.createHelpers(page, testName);

// Create API test helpers (screenshots disabled automatically)
const { apiActions, assert } = HelperFactory.createAPIHelpers(request, page, testName);
```

**PageFactory** — creates page objects:
```typescript
const loginPage = PageFactory.createLoginPage(page, testName);
```

**Benefits:** single source of truth for creation, automatic debug logging, consistent configuration.

---

## Fixtures

### Q: Which fixture should I use for my test?

**A:**

```
Is this a UI test or an API test?
    │
    ├── UI → How many pages does the test use?
    │         ├── Multiple pages → pom-eager-fixture  (pomEagerFixture)
    │         └── 1–2 pages     → pom-lazy-fixture   (pomLazyFixture)
    │
    └── API → api-test-fixture  (apiTestFixture)
```

| Test Type | Fixture file | Fixture key | Provides |
|---|---|---|---|
| Multi-page UI flow | `pom-eager-fixture` | `pomEagerFixture` | `{ pomEager, logger }` |
| Single/few-page UI | `pom-lazy-fixture` | `pomLazyFixture` | `{ pomLazy, logger }` |
| API test | `api-test-fixture` | `apiTestFixture` | `{ apiActions, assert }` |

See [fixtures-documentation.md](fixtures-documentation.md) for the full decision matrix.

---

### Q: How many fixtures do we have and what do they do?

**A:** We have **3 fixtures**, all in `tests/fixtures/`:

1. **pom-eager-fixture** — `pomEagerFixture: { pomEager, logger }`
   - `POMEager` creates all page objects upfront in its constructor
   - Logger logs TEST START/PASSED/FAILED/SKIPPED lifecycle

2. **pom-lazy-fixture** — `pomLazyFixture: { pomLazy, logger }`
   - `POMLazy` creates page objects on first getter access
   - Same lifecycle logging as eager fixture

3. **api-test-fixture** — `apiTestFixture: { apiActions, assert }`
   - `AdvancedAPIHelper` for logged HTTP calls (GET/POST/PUT/PATCH/DELETE/HEAD)
   - `AdvancedAssertionsHelper` with screenshots disabled (no UI context)
   - Logs API call summary and assertion stats in teardown

---

### Q: Why don't the UI fixtures provide `actions` and `assert` directly?

**A:** By design. In the current architecture, helpers (`AdvancedActionsHelper` and `AdvancedAssertionsHelper`) live **inside page objects**, not at the fixture level.

Each page object creates its own helpers in its constructor:
```typescript
// Inside LoginPage constructor
this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
this.assert  = new AdvancedAssertionsHelper(page, `${testName}-assertions`);
```

Tests call page object methods, which internally use the helpers:
```typescript
// Test calls a method — actions/assert are internal implementation details
await pomLazy.loginPage.login('Admin', 'admin123');
await pomLazy.homePage.assertProfileIcon();
```

The API fixture is the exception — `apiActions` and `assert` are exposed directly because there are no page objects in pure API tests.

---

## Page Objects

### Q: What is the Page Object Model (POM)?

**A:** POM encapsulates page-specific UI elements and interactions so tests don't know about UI structure.

**Without POM (test knows about UI details):**
```typescript
test('login', async ({ page }) => {
    await page.locator('#username').fill('Admin');
    await page.locator('#password').fill('admin123');
    await page.locator('button[type="submit"]').click();
});
```

**With POM (test reads like a user story):**
```typescript
test('login', async ({ pomLazyFixture }) => {
    const { pomLazy } = pomLazyFixture;
    await pomLazy.loginPage.navigateToLogin();
    await pomLazy.loginPage.login('Admin', 'admin123');
    await pomLazy.homePage.assertProfileIcon();
});
```

**Benefits:** tests don't know about UI structure, UI changes isolated to page objects, reusable methods, reads like user stories.

---

### Q: How do I add a new page object?

**A:** Follow this template:

```typescript
// src/pages/my-new-page.ts
import { Page, Locator } from '@playwright/test';
import winston from 'winston';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

export class MyNewPage {
    readonly page: Page;
    private readonly logger: winston.Logger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    readonly myButton: Locator;
    readonly myInput: Locator;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.logger = Logger.getLogger(`MyNewPage-${testName}`);
        this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
        this.assert  = new AdvancedAssertionsHelper(page, `${testName}-assertions`);

        this.myButton = page.locator('#myButton');
        this.myInput  = page.locator('#myInput');
    }

    async performAction(value: string) {
        this.logger.info(`Performing action with value: ${value}`);
        await this.actions.fill(this.myInput, value, 'Fill input');
        await this.actions.click(this.myButton, 'Click button');
    }

    async assertSuccess() {
        await this.assert.toBeVisible(this.page.locator('.success'), 'Success message visible');
    }
}
```

Then add it to the POM managers:
```typescript
// src/pages/pom-eager.ts
export class POMEager {
    private readonly myNewPage: MyNewPage;

    constructor(page: Page, testName: string) {
        this.myNewPage = new MyNewPage(page, testName);
    }

    getMyNewPage() { return this.myNewPage; }
}

// src/pages/pom-lazy.ts
get myNewPage(): MyNewPage {
    if (!this._myNewPage) {
        this._myNewPage = new MyNewPage(this.page, this._testName ?? "");
    }
    return this._myNewPage;
}
```

---

## Helpers & Utilities

### Q: What are AdvancedActionsHelper and AdvancedAssertionsHelper?

**A:** Wrapper classes that add Winston logging, Playwright `test.step()` integration, and failure diagnostics to every Playwright action and assertion.

**AdvancedActionsHelper** wraps Playwright interactions:
```typescript
// Every call below:
//   1. Registers a collapsible step in the Playwright HTML report (via StepRunner)
//   2. Logs to Winston (console + file + HTML report)
//   3. Records duration and step number

await actions.goto('https://example.com', 'Navigate to homepage');
await actions.click(loginButton, 'Click login button');
await actions.fill(usernameInput, 'Admin', 'Enter username');
await actions.fill(passwordInput, 'secret', 'Enter password', true); // masked in logs
await actions.waitForVisible(element, 'Wait for element');
const text = await actions.getText(element, 'Get heading text');

const summary = actions.getSummary(); // "Total Steps: 5"
```

**AdvancedAssertionsHelper** wraps Playwright assertions:
```typescript
// Hard assertion (default) — fails immediately
await assert.toBeVisible(element, 'Element is visible');

// Soft assertion — collects failures, test continues
await assert.toBeVisible(element1, 'Element 1 visible', true); // soft=true
await assert.toBeVisible(element2, 'Element 2 visible', true);
await assert.assertAllSoftAssertions(); // throws if any soft failures collected

const stats = assert.getAssertionStats();
// { total: 2, passed: 1, failed: 1 }
```

**What you get automatically with every call:**
- Winston log (info for success, error for failure, warn for soft fail)
- Playwright HTML report step via `StepRunner.run()` (inside action methods)
- Duration in milliseconds
- Screenshot on failure (to `test-logs/failure-screenshots/`)
- Sensitive data masking for `fill(... isSensitive: true)`

---

### Q: What is StepRunner and why does it exist?

**A:** `StepRunner` is a thin adapter in `src/utils/step-runner.ts` that wraps any async function in a Playwright `test.step()` call:

```typescript
export class StepRunner {
    static async run<T>(title: string, fn: () => Promise<T>): Promise<T> {
        return await test.step(title, async () => fn());
    }
}
```

Every method in `AdvancedActionsHelper` delegates to `StepRunner.run()`. This means each action simultaneously:

- Appears as a **collapsible step in the Playwright HTML report** (with duration badge)
- Is **logged to Winston** (console + file + HTML dashboard)

Without StepRunner, you'd only have the log file view. With it, you get visual step breakdown in the Playwright report too. See [logging-guide.md](logging-guide.md) for the full dual-channel diagram.

---

### Q: What's the difference between soft and hard assertions?

**A:**

**Hard assertions (default) — fail immediately:**
```typescript
await assert.toBeVisible(element1, 'Element 1');  // FAIL → test stops here
await assert.toBeVisible(element2, 'Element 2');  // never runs
```

**Soft assertions — collect all failures, fail at the end:**
```typescript
await assert.toBeVisible(element1, 'Element 1', true);  // FAIL → continues
await assert.toBeVisible(element2, 'Element 2', true);  // FAIL → continues
await assert.toBeVisible(element3, 'Element 3', true);  // PASS → continues
await assert.assertAllSoftAssertions();                  // throws with both failures
```

Use hard assertions for critical conditions (login succeeded, page loaded). Use soft assertions when you want to validate many UI elements and report all failures at once.

---

## Logging

### Q: How does logging work in this framework?

**A:** Two independent channels work in parallel for every helper action:

**Channel 1 — Winston** (`src/utils/Logger.ts`):
- Console: colored, timestamped output in terminal
- File: `test-logs/test-execution.log` (10 MB, 5 rotated backups)
- HTML: `test-logs/test-report.html` — interactive dashboard with level/category filters

**Channel 2 — Playwright `test.step()`** (via `src/utils/step-runner.ts`):
- Every `AdvancedActionsHelper` method appears as a collapsible step in the Playwright HTML report

**Log levels** (debug is the default):
```
silly < debug < verbose < info < warn < error
```

**Control the level:**
```bash
LOG_LEVEL=info npx playwright test    # info and above only
LOG_LEVEL=warn npx playwright test    # warnings and errors only
LOG_LEVEL=debug npx playwright test   # everything (default)
```

See [logging-guide.md](logging-guide.md) for the complete guide.

---

### Q: How do I add logging to my page object or utility?

**A:**

```typescript
import winston from 'winston';
import { Logger } from '../utils/Logger';

export class MyPage {
    private readonly logger: winston.Logger;

    constructor(page: Page, testName: string) {
        this.logger = Logger.getLogger(`MyPage-${testName}`);
    }

    async myMethod() {
        this.logger.info('Performing action');
        this.logger.debug(`Detail: ${someData}`);
        this.logger.warn('Unexpected condition');
        this.logger.error('Action failed');
    }
}
```

**Note:** Winston has no `fatal()` method. Use `logger.error()` for the most severe failures.

**Category naming convention:**
- Page Objects: `PageName-testName` → `LoginPage-valid_login`
- Actions Helper: `Actions-testName-actions`
- Assertions Helper: `Assertions-testName-assertions`
- Fixtures: `Fixture-POMEager-testName`
- Test Specs: `suite-name` → `login-with-POManagerEager`

---

## Testing Strategies

### Q: How do I implement data-driven testing?

**A:** Two approaches:

**Approach 1 — Builder Pattern:**
```typescript
import { UserBuilder } from '../../../src/builders/user-builder';

const invalidUsers = UserBuilder.buildInvalidUsers();

invalidUsers.forEach((user) => {
    test(`Login fails for ${user.testType}`, async ({ pomLazyFixture }) => {
        const { pomLazy } = pomLazyFixture;
        await pomLazy.loginPage.login(user.username, user.password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });
});
```

**Approach 2 — Data file iteration:**
```typescript
import invalidData from '../../../src/data/invalid-test-users';

invalidData.forEach(({ username, password, testType }) => {
    test(`Login fails for ${testType}`, async ({ pomLazyFixture }) => {
        const { pomLazy } = pomLazyFixture;
        await pomLazy.loginPage.login(username, password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });
});
```

Supported data formats: TypeScript objects, JSON files, exported arrays.

---

### Q: How do I mock API responses?

**A:** Use Playwright's route interception:

**Full response mocking:**
```typescript
await page.route('https://api.example.com/users', async route => {
    await route.fulfill({ body: JSON.stringify({ users: [] }) });
});
```

**Response modification:**
```typescript
await page.route('https://api.example.com/users', async route => {
    const response = await route.fetch();
    const data = await response.json();
    data.users[0].name = 'Modified Name';
    await route.fulfill({ body: JSON.stringify(data) });
});
```

**Request blocking:**
```typescript
await page.route('**/*.{png,jpg,jpeg}', async route => route.abort());
```

**Request redirection:**
```typescript
await page.route('https://api.example.com/*', async route => {
    await route.continue({ url: 'https://api-mock.example.com/' + route.request().url().split('/').pop() });
});
```

See `tests/api/specs/network-interception.spec.ts` for complete examples.

---

## Troubleshooting

### Q: My test fails with "element not found" — what should I check?

**A:**

1. **Check the selector** — is the locator correct for the current page state?
2. **Add a wait** — the element may not be ready yet:
   ```typescript
   await actions.waitForVisible(this.myElement, 'Wait for element');
   ```
3. **Check page state** — did navigation complete?
   ```typescript
   await this.page.waitForLoadState('networkidle');
   ```
4. **Check failure screenshots** — automatically saved to `test-logs/failure-screenshots/` on helper failures
5. **Read the Winston log** — check `test-logs/test-execution.log` or open `test-logs/test-report.html` and filter by `ERROR`

---

### Q: How do I debug test failures?

**A:**

**Check existing logs (automatic):**
- `test-logs/test-execution.log` — full text log
- `test-logs/test-report.html` — interactive dashboard (filter by ERROR, filter by category)
- `test-logs/failure-screenshots/` — screenshots captured on action/assertion failure

**Enable Playwright trace:**
```typescript
// playwright.config.ts
use: { trace: 'on-first-retry' }

// Then view:
npx playwright show-trace trace.zip
```

**Run with Playwright Inspector (step through test interactively):**
```bash
npx playwright test --debug
```

**Add custom debug logging:**
```typescript
this.logger.debug(`Current URL: ${this.page.url()}`);
this.logger.debug(`Element visible: ${await this.myElement.isVisible()}`);
```

---

### Q: My tests are flaky — how do I fix them?

**A:**

1. **Replace hard waits with condition waits:**
   ```typescript
   // Bad
   await this.page.waitForTimeout(3000);

   // Good
   await this.page.waitForLoadState('networkidle');
   await actions.waitForVisible(this.myElement, 'Wait for element');
   ```

2. **Rely on Playwright assertions (they auto-retry):**
   ```typescript
   await assert.toBeVisible(element, 'Element visible');  // retries until visible or timeout
   ```

3. **Use `AdvancedActionsHelper` methods** — they wait for elements to be actionable before interacting.

4. **Configure retries in `playwright.config.ts`:**
   ```typescript
   retries: process.env.CI ? 2 : 0,
   ```

---

## Quick Reference

### Common Commands

```bash
# Run all tests
npm test

# Run UI tests only
npm run ui

# Run API tests only
npm run api

# Run in debug mode
npm run debug

# Run a specific test file
npx playwright test tests/ui/specs/login-with-builder.spec.ts

# Show Playwright HTML report
npx playwright show-report
```

### Import Paths

```typescript
// Fixtures (all in tests/fixtures/)
import { test } from '../../fixtures/pom-eager-fixture';
import { test } from '../../fixtures/pom-lazy-fixture';
import { test } from '../../fixtures/api-test-fixture';

// Builders
import { UserBuilder } from '../../../src/builders/user-builder';

// Factories
import { PageFactory } from '../../../src/factories/page-factory';
import { HelperFactory } from '../../../src/factories/helper-factory';

// Logger
import { Logger } from '../../../src/utils/Logger';
import winston from 'winston';

// Helpers (used inside page objects, rarely imported directly in tests)
import { AdvancedActionsHelper } from '../../../src/utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../../../src/utils/advanced-assertions-helper';
import { AdvancedAPIHelper } from '../../../src/utils/advanced-api-helper';
import { StepRunner } from '../../../src/utils/step-runner';

// Page Objects
import { LoginPage } from '../../../src/pages/login-page';
import { HomePage } from '../../../src/pages/home-page';
import { POMEager } from '../../../src/pages/pom-eager';
import { POMLazy } from '../../../src/pages/pom-lazy';
```

---

**Document Version:** 2.0
**Last Updated:** 2026-02-23
**Maintained By:** Test Automation Team
