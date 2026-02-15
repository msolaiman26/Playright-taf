# Playwright Test Automation Framework - FAQ

**Frequently Asked Questions & Comprehensive Guide**

**Last Updated:** 2026-02-15

This document answers common questions about the framework's architecture, patterns, and best practices. Use this as a reference for understanding and working with the codebase.

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

---

## General Questions

### Q: What is this framework and what does it do?

**A:** This is an enterprise-grade Playwright test automation framework built with TypeScript. It provides:

- **Page Object Model (POM)** for clean UI abstraction
- **Custom Fixtures** for dependency injection and setup/teardown
- **Advanced Helpers** for logged actions and assertions (soft/hard)
- **log4js Integration** for multi-channel logging (console, file, HTML report)
- **Network Interception** for API mocking and modification
- **Visual Regression** testing with screenshot comparison
- **Performance Testing** with Lighthouse integration
- **Builder & Factory Patterns** for clean object creation
- **Data-Driven Testing** support with multiple data formats

Target applications:
- **UI Tests:** OrangeHRM Demo (https://opensource-demo.orangehrmlive.com)
- **API Tests:** JSONPlaceholder (https://jsonplaceholder.typicode.com)

---

### Q: What design patterns are implemented in this framework?

**A:** The framework implements **12 design patterns**:

**Core Patterns (Original 10):**
1. ✅ **Page Object Model (POM)** - Encapsulates UI elements and interactions
2. ✅ **Manager Pattern** (Eager/Lazy) - Manages multiple page objects
3. ✅ **Fixture Pattern** - Playwright's dependency injection
4. ✅ **Helper/Wrapper Pattern** - Enhanced actions and assertions
5. ✅ **Centralized Logging** - log4js with multiple outputs
6. ✅ **Endpoint Abstraction** - API request centralization
7. ✅ **Data-Driven Testing** - Parameterized tests from external data
8. ✅ **Network Interception** - API mocking, modification, blocking
9. ✅ **Environment Configuration** - Multi-environment support
10. ✅ **Visual Regression** - Screenshot comparison

**Phase 1 Patterns (NEW):**
11. ✅ **Builder Pattern** - Fluent API for test data creation
12. ✅ **Factory Pattern** - Centralized object creation

For detailed analysis, see [docs/design-patterns-analysis.md](design-patterns-analysis.md)

---

### Q: Where can I find documentation for specific topics?

**A:** Documentation is organized by topic:

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Project overview, getting started, key features |
| [design-patterns-analysis.md](design-patterns-analysis.md) | All 12 design patterns with examples and recommendations |
| [fixtures-documentation.md](fixtures-documentation.md) | Complete fixture catalog, usage analysis, DRY/SOLID recommendations |
| [log4js-logging-guide.md](log4js-logging-guide.md) | Comprehensive log4js integration guide |
| [framework-faq.md](framework-faq.md) | This document - FAQ and quick reference |

---

## Design Patterns

### Q: What are Test Fixtures and why do we need them?

**A:** Test Fixtures are Playwright's dependency injection mechanism.

**Without Fixtures (❌ Repetitive):**
```typescript
test('login test 1', async ({ page }) => {
    // Setup repeated in EVERY test
    const loginPage = new LoginPage(page, 'test1');
    const actions = new AdvancedActionsHelper(page, 'test1');
    await loginPage.navigateToLogin();
    // ... test logic ...
});
```

**With Fixtures (✅ Clean):**
```typescript
// Define fixture ONCE
export const test = base.extend<{ pomEagerHelpers: POMEagerHelpers }>({
    pomEagerHelpers: async ({ page }, use, testInfo) => {
        // Setup (automatic)
        const pomEager = new POMEager(page, testInfo.title);
        const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);

        await use({ pomEager, actions, assert });

        // Teardown (automatic, even on failure)
    }
});

// Tests are clean and focused
test('login test 1', async ({ pomEagerHelpers }) => {
    const { pomEager } = pomEagerHelpers;
    await pomEager.getLoginPage().login('Admin', 'admin123');
});
```

**Benefits:**
- ✅ **DRY** - Setup/teardown written once
- ✅ **Automatic lifecycle** - Setup before test, teardown after (guaranteed)
- ✅ **Test isolation** - Fresh instances per test
- ✅ **Centralized logging** - Lifecycle logging in one place

**See also:** [fixtures-documentation.md](fixtures-documentation.md) for complete fixture guide

---

### Q: What's the difference between POM Manager and Page Factory?

**A:** They serve different purposes:

| Aspect | POM Manager | Page Factory |
|--------|-------------|--------------|
| **Purpose** | Organize & manage page objects | Centralize creation logic |
| **Scope** | Instance per test | Static methods (application-wide) |
| **State** | Holds page references | Stateless (creates & returns) |
| **Lifecycle** | Manages object lifetime | Only creates, doesn't manage |
| **Best For** | Tests needing MULTIPLE pages | Fixtures, utilities, one-off creation |

**POM Manager Example:**
```typescript
export class POMEager {
    private readonly loginPage: LoginPage;
    private readonly homePage: HomePage;

    constructor(page: Page, testName: string) {
        // Creates and holds all pages
        this.loginPage = new LoginPage(page, testName);
        this.homePage = new HomePage(page, testName);
    }

    getLoginPage() { return this.loginPage; }
    getHomePage() { return this.homePage; }
}

// Usage in test
const pomEager = new POMEager(page, 'test');
await pomEager.getLoginPage().navigateToLogin();
await pomEager.getHomePage().assertProfileIcon();
```

**Page Factory Example:**
```typescript
export class PageFactory {
    static createLoginPage(page: Page, testName: string): LoginPage {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating LoginPage for test: ${testName}`);
        return new LoginPage(page, testName);
    }
}

// Usage in fixture or utility
const loginPage = PageFactory.createLoginPage(page, 'test');
await loginPage.navigateToLogin();
```

**They work together:** POM Manager can use Page Factory internally!

---

### Q: What's the difference between POMEager and POMLazy?

**A:** Initialization strategy:

**POMEager (All pages created upfront):**
```typescript
export class POMEager {
    constructor(page: Page, testName: string) {
        // ✅ Creates ALL pages immediately
        this.loginPage = new LoginPage(page, testName);
        this.homePage = new HomePage(page, testName);
    }
}
```

**Pros:** Simple, errors surface immediately, all pages ready
**Cons:** Higher memory (all pages loaded even if unused)
**Best for:** Tests using multiple pages

**POMLazy (Pages created on-demand):**
```typescript
export class POMLazy {
    private _loginPage?: LoginPage;

    get loginPage(): LoginPage {
        if (!this._loginPage) {
            // ✅ Creates only when accessed
            this._loginPage = new LoginPage(this.page, this._testName);
        }
        return this._loginPage;
    }
}
```

**Pros:** Memory efficient, faster initialization, only used pages loaded
**Cons:** Slightly complex (lazy loading logic)
**Best for:** Tests using only 1-2 pages

---

### Q: What is the Builder Pattern and how do I use it?

**A:** Builder Pattern provides a fluent API for creating complex test data.

**Without Builder (❌ Verbose):**
```typescript
const user = {
    username: 'testuser',
    password: 'testpass',
    testType: 'invalid password',
    isValid: false,
    description: 'Test case for invalid password'
};
```

**With Builder (✅ Fluent):**
```typescript
const user = new UserBuilder()
    .withUsername('testuser')
    .withPassword('testpass')
    .asInvalidUser('invalid password')
    .withDescription('Test case for invalid password')
    .build();

// Or use presets
const validUser = new UserBuilder().asValidAdmin().build();
const invalidUser = new UserBuilder().asInvalidPassword().build();
```

**Benefits:**
- ✅ Readable, self-documenting code
- ✅ Preset configurations for common scenarios
- ✅ Build-time validation
- ✅ Default values for optional fields

**See also:** `src/builders/user-builder.ts` and `tests/ui/specs/login-with-builder.spec.ts`

---

### Q: What is the Factory Pattern and how do I use it?

**A:** Factory Pattern centralizes object creation logic.

**Implementation:**
```typescript
// src/factories/helper-factory.ts
export class HelperFactory {
    static createHelpers(page: Page, testName: string): HelperSet {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating helpers for test: ${testName}`);
        return {
            actions: new AdvancedActionsHelper(page, testName),
            assert: new AdvancedAssertionsHelper(page, testName)
        };
    }
}
```

**Usage in fixtures:**
```typescript
// All fixtures use HelperFactory for consistency
const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);
```

**Benefits:**
- ✅ Single source of truth for object creation
- ✅ Automatic creation logging
- ✅ Consistent constructor parameters
- ✅ Easy to modify creation logic (change once, affects all)

---

## Fixtures

### Q: Which fixture should I use for my test?

**A:** Use this decision tree:

```
Do you need Page Objects?
    ↓
  YES → How many pages?
         ↓
       Multiple → pom-eager-fixture
       1-2 pages → pom-lazy-fixture
    ↓
   NO → test-helpers-fixture
```

**Detailed guidance:**

| Test Type | Fixture | Reason |
|-----------|---------|--------|
| Multi-page UI flow | `pom-eager-fixture` | All pages ready, simple |
| Single-page UI test | `pom-lazy-fixture` | Memory efficient |
| API test | `test-helpers-fixture` | No POM needed |
| Need granular control | `test-fixtures` | Separate fixtures for logger, POM, helpers |
| Login-specific test | `login-fixture` | Auto-navigates to login page |

**See also:** [fixtures-documentation.md](fixtures-documentation.md) for complete catalog

---

### Q: How many fixtures do we have and what do they do?

**A:** We have **5 fixtures**:

1. **pom-eager-fixture** (Most used) - Provides `{ pomEager, actions, assert }`
   - All pages created upfront
   - Used by 4 tests

2. **pom-lazy-fixture** - Provides `{ pomLazy, actions, assert }`
   - Pages created on-demand
   - Used by 2 tests

3. **test-helpers-fixture** - Provides `{ actions, assert }`
   - Helpers only, no POM
   - Currently unused (available for API tests)

4. **test-fixtures** - Provides `{ logger, pomLazy, actions, assert }` (separate)
   - Granular fixtures (use only what you need)
   - Used by 1 test

5. **login-fixture** - Provides `{ pomEager, loginPage, actions, assert }`
   - Domain-specific for login tests
   - Auto-navigates to login page
   - Logs assertion statistics
   - Used by 1 test

**See:** [fixtures-documentation.md](fixtures-documentation.md) for detailed analysis

---

### Q: Why doesn't login-fixture use HelperFactory?

**A:** **Historical reason** - it was created before HelperFactory was implemented.

**Current state (❌ Manual instantiation):**
```typescript
const actions = new AdvancedActionsHelper(page, testInfo.title);
const assert = new AdvancedAssertionsHelper(page, testInfo.title);
```

**Recommended (✅ Use HelperFactory):**
```typescript
const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);
```

**Action item:** This is a **HIGH PRIORITY** refactoring recommendation in [fixtures-documentation.md](fixtures-documentation.md)

---

## Page Objects

### Q: What is the Page Object Model (POM)?

**A:** POM encapsulates page-specific UI elements and interactions.

**Without POM (❌ Test knows about UI details):**
```typescript
test('login', async ({ page }) => {
    await page.locator('#username').fill('Admin');
    await page.locator('#password').fill('admin123');
    await page.locator('button[type="submit"]').click();
});
```

**With POM (✅ Test reads like user story):**
```typescript
export class LoginPage {
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly loginButton: Locator;

    async login(username: string, password: string) {
        await this.actions.fill(this.usernameInput, username, 'Enter username');
        await this.actions.fill(this.passwordInput, password, 'Enter password');
        await this.actions.click(this.loginButton, 'Click login');
    }
}

test('login', async ({ pomEagerHelpers }) => {
    await pomEager.getLoginPage().login('Admin', 'admin123');
});
```

**Benefits:**
- ✅ Tests don't know about UI structure
- ✅ UI changes isolated to page objects
- ✅ Reusable methods across tests
- ✅ Reads like user stories

---

### Q: How do I add a new page object?

**A:** Follow this template:

```typescript
// src/pages/my-new-page.ts
import { Page, Locator } from '@playwright/test';
import { Logger as Log4jsLogger } from 'log4js';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

export class MyNewPage {
    readonly page: Page;
    private readonly logger: Log4jsLogger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    // Locators (private/readonly)
    readonly myButton: Locator;
    readonly myInput: Locator;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.logger = Logger.getLogger(`MyNewPage-${testName}`);
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert = new AdvancedAssertionsHelper(page, testName);

        // Initialize locators
        this.myButton = page.locator('#myButton');
        this.myInput = page.locator('#myInput');
    }

    // Public methods (business logic)
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

**Then add to POM Managers:**
```typescript
// src/pages/pom-eager.ts
export class POMEager {
    private readonly myNewPage: MyNewPage;

    constructor(page: Page, testName: string) {
        this.myNewPage = new MyNewPage(page, testName);
    }

    getMyNewPage() { return this.myNewPage; }
}
```

---

## Helpers & Utilities

### Q: What are AdvancedActionsHelper and AdvancedAssertionsHelper?

**A:** Wrapper classes that add logging, error handling, and metrics to Playwright actions/assertions.

**AdvancedActionsHelper** - Wraps actions:
```typescript
// Automatic step numbering, timing, logging, screenshots on failure
await actions.goto('https://example.com', 'Navigate to homepage');
await actions.click(loginButton, 'Click login button');
await actions.fill(usernameInput, 'Admin', 'Enter username', false); // false = not sensitive

// Summary statistics
const summary = actions.getSummary();
// { totalSteps: 5, clicks: 2, fills: 2, navigations: 1, ... }
```

**AdvancedAssertionsHelper** - Wraps assertions:
```typescript
// Hard assertion (fails immediately)
await assert.toBeVisible(element, 'Element is visible');

// Soft assertion (collects errors, fails at end)
await assert.toBeVisible(element1, 'Element 1 visible', true); // soft=true
await assert.toBeVisible(element2, 'Element 2 visible', true);
await assert.toBeVisible(element3, 'Element 3 visible', true);
await assert.assertAllSoftAssertions(); // Fails with all errors

// Summary statistics
const stats = assert.getAssertionStats();
// { total: 10, passed: 8, failed: 2 }
```

**Benefits:**
- ✅ Automatic logging of every action/assertion
- ✅ Performance metrics (timing)
- ✅ Screenshot on failure
- ✅ Sensitive data masking (passwords logged as ***MASKED***)
- ✅ Soft assertion support
- ✅ Summary statistics

---

### Q: What's the difference between soft and hard assertions?

**A:**

**Hard Assertions (default):**
```typescript
await assert.toBeVisible(element1, 'Element 1 visible'); // FAIL - stops here
await assert.toBeVisible(element2, 'Element 2 visible'); // Never runs
```
- ✅ Fails immediately on first error
- ✅ Use for critical conditions
- ✅ Fail fast principle

**Soft Assertions:**
```typescript
await assert.toBeVisible(element1, 'Element 1 visible', true); // FAIL - continues
await assert.toBeVisible(element2, 'Element 2 visible', true); // FAIL - continues
await assert.toBeVisible(element3, 'Element 3 visible', true); // PASS - continues
await assert.assertAllSoftAssertions(); // Fails with all 2 errors collected
```
- ✅ Collects all failures
- ✅ Test continues running
- ✅ All failures reported together at end
- ✅ Use for validating multiple UI elements

**Example use case:**
```typescript
async verifyLoginPageLoaded() {
    // Check all elements (soft=true)
    await this.assert.toBeVisible(this.usernameInput, 'Username field', true);
    await this.assert.toBeVisible(this.passwordInput, 'Password field', true);
    await this.assert.toBeVisible(this.loginButton, 'Login button', true);
    await this.assert.toHaveTitle(/OrangeHRM/, 'Page title', true);

    // Fail with all errors (if any)
    await this.assert.assertAllSoftAssertions();
}
```

---

## Logging

### Q: How does logging work in this framework?

**A:** The framework uses **log4js** with three output channels:

**1. Console (colored output):**
```
[2026-02-15 10:30:45] [INFO] LoginPage-ValidLogin - Navigating to login page
[2026-02-15 10:30:46] [DEBUG] LoginPage-ValidLogin - Filling username field
[2026-02-15 10:30:47] [INFO] Actions-ValidLogin - Step 1: Click login button
```

**2. File (daily rotating):**
- Path: `test-logs/test-execution-YYYY-MM-DD.log`
- Rotates daily
- 5 backup files kept

**3. HTML Report (interactive dashboard):**
- Path: `test-logs/test-report.html`
- Filter by level (DEBUG, INFO, WARN, ERROR)
- Filter by category (page, test name)
- Search by text
- Statistics cards (total, debug, info, warn, error, fatal counts)

**Log Levels:**
```
TRACE < DEBUG < INFO < WARN < ERROR < FATAL
```

**Configuration:**
- Default level: `DEBUG`
- Can override via `LOG_LEVEL` environment variable

**See also:** [log4js-logging-guide.md](log4js-logging-guide.md)

---

### Q: How do I add logging to my page object?

**A:**

```typescript
import { Logger as Log4jsLogger } from 'log4js';
import { Logger } from '../utils/Logger';

export class MyPage {
    private readonly logger: Log4jsLogger;

    constructor(page: Page, testName: string) {
        this.logger = Logger.getLogger(`MyPage-${testName}`);
    }

    async myMethod() {
        this.logger.info("Performing action");
        this.logger.debug(`Debug details: ${someData}`);
        this.logger.warn("Warning message");
        this.logger.error("Error occurred");
        this.logger.fatal("Critical failure");
    }
}
```

**Category naming convention:**
- Page Objects: `PageName-testName` (e.g., `LoginPage-ValidLogin`)
- Helpers: `Actions-testName` or `Assertions-testName`
- Fixtures: `Fixture-Type-testName`
- Tests: `suite-name` (e.g., `users-api-test`)

---

## Testing Strategies

### Q: How do I implement data-driven testing?

**A:** Use the Builder Pattern or array iteration:

**Approach 1: Builder Pattern**
```typescript
import { UserBuilder } from '../../../src/builders/user-builder';

const invalidUsers = UserBuilder.buildInvalidUsers();

invalidUsers.forEach((user) => {
    test(`Login fails for ${user.testType}`, async ({ pomEagerHelpers }) => {
        const { pomEager } = pomEagerHelpers;
        await pomEager.getLoginPage().login(user.username, user.password);
        await pomEager.getLoginPage().assertInvalidLoginMessage();
    });
});
```

**Approach 2: Array Iteration**
```typescript
import invalidData from '../../../src/data/invalid-test-users';

invalidData.forEach(({ username, password, testType }) => {
    test(`Login fails for ${testType}`, async ({ pomEagerHelpers }) => {
        await pomEager.getLoginPage().login(username, password);
        await pomEager.getLoginPage().assertInvalidLoginMessage();
    });
});
```

**Data formats supported:**
- TypeScript objects (`test-users.ts`)
- JSON files (`test-users.json`)
- Arrays for iteration (`invalid-test-users.ts`)

---

### Q: How do I mock API responses?

**A:** Use Playwright's route interception:

**Full Response Mocking:**
```typescript
await page.route('https://api.example.com/users', async route => {
    await route.fulfill({
        body: JSON.stringify({ users: [...] }) // Mock data
    });
});
```

**Response Modification:**
```typescript
await page.route('https://api.example.com/users', async route => {
    const response = await route.fetch(); // Fetch real response
    const data = await response.json();
    data.users[0].name = 'Modified Name'; // Modify
    await route.fulfill({ body: JSON.stringify(data) });
});
```

**Request Blocking:**
```typescript
await page.route('**/*.{png,jpg,jpeg}', async route => {
    await route.abort(); // Block all images
});
```

**See also:** `tests/api/specs/network-interception.spec.ts` for complete examples

---

## Troubleshooting

### Q: My test is failing with "element not found" - what should I check?

**A:** Debug checklist:

1. **Check selector:**
   ```typescript
   // Add debug logging
   this.logger.debug(`Looking for element: ${this.myElement}`);
   await this.myElement.highlight(); // Highlights element if found
   ```

2. **Check wait conditions:**
   ```typescript
   // Wait for element to be visible
   await this.myElement.waitFor({ state: 'visible', timeout: 10000 });
   ```

3. **Use actions helper (has built-in waits):**
   ```typescript
   // Better - helper handles waiting
   await this.actions.click(this.myElement, 'Click element');
   ```

4. **Check page state:**
   ```typescript
   await this.page.waitForLoadState('networkidle');
   ```

5. **Take screenshot for debugging:**
   ```typescript
   await this.page.screenshot({ path: 'debug.png', fullPage: true });
   ```

---

### Q: How do I debug test failures?

**A:** Multiple debugging approaches:

**1. Use existing logging:**
```typescript
// Logs automatically captured in:
// - test-logs/test-execution-YYYY-MM-DD.log
// - test-logs/test-report.html (interactive)
```

**2. Enable trace:**
```typescript
// playwright.config.ts
use: {
    trace: 'on-first-retry', // or 'on', 'off', 'retain-on-failure'
}

// View trace
npx playwright show-trace trace.zip
```

**3. Use Playwright Inspector:**
```bash
npx playwright test --debug
```

**4. Add custom debug logging:**
```typescript
this.logger.debug(`Current URL: ${this.page.url()}`);
this.logger.debug(`Element visible: ${await this.myElement.isVisible()}`);
```

**5. Check failure screenshots:**
- Location: `test-logs/failure-screenshots/`
- Automatically captured by helpers on action/assertion failure

---

### Q: Tests are flaky - how do I fix them?

**A:** Common solutions:

**1. Use proper waits:**
```typescript
// ❌ Bad - hard wait
await this.page.waitForTimeout(3000);

// ✅ Good - wait for condition
await this.page.waitForLoadState('networkidle');
await this.myElement.waitFor({ state: 'visible' });
```

**2. Use retry assertions:**
```typescript
// Playwright assertions auto-retry (default: 5 seconds)
await expect(element).toBeVisible(); // Retries until visible or timeout
```

**3. Use actions helper (has built-in waits):**
```typescript
// Helper waits for element to be actionable
await this.actions.click(element, 'Click button');
```

**4. Configure retries:**
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0, // Retry twice in CI
```

**5. Increase timeouts:**
```typescript
// playwright.config.ts
timeout: 2 * 60 * 1000, // 2 minutes per test
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

# Run specific test file
npx playwright test tests/ui/specs/login-with-builder.spec.ts

# Generate HTML report
npx playwright show-report

# Run on staging
npm run staging
```

### Import Paths

```typescript
// Fixtures
import { test } from '../../../src/fixtures/pom-eager-fixture';
import { test } from '../../../src/fixtures/pom-lazy-fixture';
import { test } from '../../../src/fixtures/test-helpers-fixture';
import { test } from '../../../src/fixtures/test-fixtures';

// Builders
import { UserBuilder } from '../../../src/builders/user-builder';

// Factories
import { PageFactory } from '../../../src/factories/page-factory';
import { HelperFactory } from '../../../src/factories/helper-factory';

// Logger
import { Logger } from '../utils/Logger';
import { Logger as Log4jsLogger } from 'log4js';

// Page Objects
import { LoginPage } from '../../../src/pages/login-page';
import { HomePage } from '../../../src/pages/home-page';
import { POMEager } from '../../../src/pages/pom-eager';
import { POMLazy } from '../../../src/pages/pom-lazy';
```

---

## Need More Help?

**Documentation:**
- [README.md](../README.md) - Project overview
- [design-patterns-analysis.md](design-patterns-analysis.md) - All patterns with examples
- [fixtures-documentation.md](fixtures-documentation.md) - Complete fixture guide
- [log4js-logging-guide.md](log4js-logging-guide.md) - Logging integration

**Feedback:**
- Report issues: https://github.com/anthropics/claude-code/issues
- Get help: `/help` command in Claude Code

---

**Document Version:** 1.0
**Last Updated:** 2026-02-15
**Maintained By:** Test Automation Team
