# Playwright Test Automation Framework (TAF)

A comprehensive, enterprise-grade test automation framework built with **Playwright** and **TypeScript**. Demonstrates industry best practices including the Page Object Model (POM), custom fixtures, advanced logging, soft/hard assertions, network interception, and data-driven testing.

**Target Application:** [OrangeHRM Demo](https://opensource-demo.orangehrmlive.com) (UI Tests) & [JSONPlaceholder](https://jsonplaceholder.typicode.com) (API Tests)

---

## Table of Contents

- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Tests](#running-tests)
- [How the Tests Work (Step-by-Step)](#how-the-tests-work-step-by-step)
  - [UI Test Flow](#ui-test-flow)
  - [API Test Flow](#api-test-flow)
  - [Network Interception Test Flow](#network-interception-test-flow)
- [Key Concepts](#key-concepts)
  - [Page Object Model (POM)](#page-object-model-pom)
  - [Eager vs Lazy Initialization](#eager-vs-lazy-initialization)
  - [Custom Fixtures](#custom-fixtures)
  - [StepRunner — Dual-Channel Observability](#steprunner--dual-channel-observability)
  - [Advanced Actions Helper](#advanced-actions-helper)
  - [Advanced Assertions Helper](#advanced-assertions-helper)
  - [Soft vs Hard Assertions](#soft-vs-hard-assertions)
  - [Logging with Winston](#logging-with-winston)
  - [Network Interception & Mocking](#network-interception--mocking)
- [Design Patterns](#design-patterns)
- [Environment Configuration](#environment-configuration)
- [Reporting](#reporting)
- [NPM Scripts Reference](#npm-scripts-reference)
- [Dependencies](#dependencies)

---

## Project Structure

```
Playwright-taf/
├── playwright.config.ts              # Central Playwright configuration
├── package.json                      # Dependencies and npm scripts
├── .env                              # Environment variables (ENV, RP_API_KEY)
│
├── src/                              # Source code (shared across all tests)
│   ├── builders/                     # Builder pattern implementations
│   │   └── user-builder.ts           #   Fluent API for creating test users
│   │
│   ├── data/                         # Test data files
│   │   ├── test-users.ts             #   Default credentials (test environment)
│   │   ├── staging-users.ts          #   Staging credentials
│   │   ├── invalid-test-users.ts     #   Invalid credentials for negative tests
│   │   └── test-users.json           #   JSON format credentials (alternative)
│   │
│   ├── endpoints/                    # API endpoint definitions
│   │   └── users-endpoints.ts        #   GET/POST functions for JSONPlaceholder API
│   │
│   ├── factories/                    # Factory pattern implementations
│   │   └── helper-factory.ts         #   Centralized helper creation
│   │
│   ├── mocks/                        # Mock response data
│   │   └── response-interception.json #  Mock user data for API mocking tests
│   │
│   ├── pages/                        # Page Object Models
│   │   ├── login-page.ts             #   Login page actions and assertions
│   │   ├── home-page.ts              #   Dashboard page actions and assertions
│   │   ├── pom-eager.ts              #   Page Object Manager — Eager initialization
│   │   └── pom-lazy.ts               #   Page Object Manager — Lazy initialization
│   │
│   └── utils/                        # Utility classes and helpers
│       ├── Logger.ts                 #   Winston wrapper (console + file + HTML report)
│       ├── step-runner.ts            #   Adapter bridging Winston logs and Playwright test.step()
│       ├── advanced-actions-helper.ts #   Logged page actions (StepRunner + Winston)
│       ├── advanced-assertions-helper.ts # Logged assertions (soft/hard modes)
│       ├── advanced-api-helper.ts    #   Logged HTTP methods for API tests
│       ├── lighthouse-helper.ts      #   Lighthouse performance auditing
│       ├── urls.ts                   #   Centralized URL config per environment
│       └── setup/                    # Global setup/teardown scripts
│           ├── env-setup.ts          #     Environment detection and data selection
│           ├── global-setup.ts       #     Pre-suite login and storage state saving
│           ├── global-teardown.ts    #     Post-suite cleanup and HTML report generation
│           ├── user-name.setup.ts    #     Setup: update user profile name
│           └── user-name.teardown.ts #     Teardown: reset user profile name
│
├── tests/                            # Test specifications
│   ├── fixtures/                     # Custom Playwright test fixtures
│   │   ├── pom-eager-fixture.ts      #   Fixture: POMEager + Winston lifecycle logging
│   │   ├── pom-lazy-fixture.ts       #   Fixture: POMLazy + Winston lifecycle logging
│   │   └── api-test-fixture.ts       #   Fixture: API helpers + automatic request/response logging
│   │
│   ├── ui/                           # UI (browser-based) tests
│   │   └── specs/
│   │       ├── login-with-POManagerEager.spec.ts    # Login tests (POMEager)
│   │       ├── login-with-POManagerLazy.spec.ts     # Login tests (POMLazy)
│   │       ├── login-with-helpers.spec.ts            # Best practice and anti-pattern demo
│   │       ├── login-with-DD.spec.ts                # Data-driven login tests
│   │       └── login-with-builder.spec.ts           # Builder pattern test data creation
│   │
│   └── api/                          # API tests (no browser needed)
│       └── specs/
│           ├── users-test.spec.ts                   # REST API CRUD tests
│           └── network-interception.spec.ts         # Network mocking & interception
│
├── docs/                             # Documentation
│   ├── DOCUMENTATION-INDEX.md        # Index and navigation guide for all docs
│   ├── fixtures-documentation.md     # Comprehensive fixtures guide
│   ├── design-patterns-analysis.md   # Design patterns analysis and recommendations
│   ├── logging-guide.md              # Winston & StepRunner logging guide
│   └── framework-faq.md              # FAQ and quick reference
│
├── test-logs/                        # Generated: Winston log files + HTML report
│   ├── test-execution.log            #   Rotating log file (10MB max, 5 backups)
│   └── test-report.html              #   Interactive HTML log report with filters
├── test-results/                     # Generated: Playwright test artifacts
├── playwright-report/                # Generated: HTML test report
├── allure-results/                   # Generated: Allure report data
└── visual-snapshots/                 # Generated: Visual regression baseline images
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Test Specifications                          │
│  (tests/ui/specs/*.spec.ts  &  tests/api/specs/*.spec.ts)          │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ import
┌──────────────────▼──────────────────────────────────────────────────┐
│                     Custom Fixtures Layer                            │
│  pom-eager-fixture  │  pom-lazy-fixture  │  api-test-fixture        │
│  (Create POM/helpers, log TEST START/PASSED/FAILED per test)        │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ create
┌──────────────────▼──────────────────────────────────────────────────┐
│                  Page Object Manager (POM)                          │
│  POMEager (all pages upfront)  │  POMLazy (pages on-demand)         │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ delegates to
┌──────────────────▼──────────────────────────────────────────────────┐
│                     Page Objects                                    │
│  LoginPage  │  HomePage  │  (extend as needed)                      │
│  Each page owns its own AdvancedActionsHelper & AssertionsHelper    │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ uses
┌──────────────────▼──────────────────────────────────────────────────┐
│                    Utility Layer                                     │
│  AdvancedActionsHelper   — Logged goto, click, fill, getText        │
│  AdvancedAssertionsHelper — Logged toBeVisible, toHaveText, etc.   │
│  AdvancedAPIHelper       — Logged HTTP methods for API tests        │
│  StepRunner              — Bridges helpers to Playwright test.step()│
│  URLs                    — Environment-based URL resolution          │
└──────────┬───────────────────────────────────┬──────────────────────┘
           │ logs via Winston                  │ registers via
┌──────────▼──────────────┐       ┌────────────▼─────────────────────┐
│   Winston Logging Layer  │       │   Playwright HTML Report         │
│  Console (colored)       │       │   Collapsible test.step() steps  │
│  File (10MB rotating)    │       │   One entry per action           │
│  HTML Report Collector   │       └──────────────────────────────────┘
└─────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Playwright-taf

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests (default: Chromium, headless)
npx playwright test

# Run only UI tests
npm run ui

# Run only API tests
npm run api

# Run tests in headed (visible) mode
npx playwright test --headed

# Run a specific test file
npx playwright test tests/ui/specs/login-with-POManagerEager.spec.ts

# Run tests with the Playwright UI (interactive mode)
npx playwright test --ui

# Run tests on staging environment
npm run staging

# Run with debug mode
npm run debug

# Open the last HTML report
npx playwright show-report
```

---

## How the Tests Work (Step-by-Step)

### UI Test Flow

Taking `login-with-POManagerEager.spec.ts` as a detailed example:

#### 1. Framework Initialization
```
playwright.config.ts is loaded
  → Environment variables loaded from .env (dotenv)
  → baseURL resolved based on ENV variable (test or staging)
  → Chromium project selected (1280x920 viewport, headless)
  → HTML + Allure reporters configured
```

#### 2. Fixture Setup (Before Each Test)
```
Test runner calls pom-eager-fixture:
  → Creates a Winston logger named after the test
  → Creates POMEager with the test name
    → POMEager constructor (eager) immediately creates:
      → LoginPage instance (with its own AdvancedActionsHelper + AdvancedAssertionsHelper)
      → HomePage instance (with its own AdvancedActionsHelper + AdvancedAssertionsHelper)
  → Logs "▶ TEST START" via Winston
  → { pomEager, logger } passed to the test via pomEagerFixture
```

#### 3. Test Execution (Valid Login Example)
```
Step 1: Navigate to OrangeHRM login page
  → AdvancedActionsHelper.goto() is called
  → StepRunner.run() wraps the action as a Playwright test.step()
  → Logs: [INFO] Step 1: Navigate to OrangeHRM login page
  → Playwright navigates to the URL (waits for domcontentloaded)
  → Logs: [INFO] Step 1: Navigate to OrangeHRM login page - SUCCESS (1523ms)
  → A collapsible step appears in the Playwright HTML report

Step 2: Fill username
  → AdvancedActionsHelper.fill() is called
  → StepRunner.run() registers the step in the HTML report
  → Logs: [INFO] Step 2: Enter username
  → Logs: [DEBUG] Input value: "Admin"
  → Playwright fills the input field
  → Logs: [INFO] Step 2: Enter username - SUCCESS (45ms)

Step 3: Fill password
  → AdvancedActionsHelper.fill() is called with isSensitive=true
  → Logs: [INFO] Step 3: Enter password
  → Logs: [DEBUG] Input value: ***MASKED***    ← Password hidden in logs!
  → Playwright fills the password field

Step 4: Click login button
  → AdvancedActionsHelper.click() is called
  → Logs: [DEBUG] Element state - Visible: true, Enabled: true
  → Playwright clicks the button

Step 5: Assert profile icon is visible
  → AdvancedAssertionsHelper.toBeVisible() is called
  → handleAssertion() wraps the Playwright expect() call
  → Logs: [INFO] Assertion #1 [HARD]: Verify profile icon is visible
  → Playwright's expect(locator).toBeVisible() runs
  → Logs: [INFO] Assertion #1: Verify profile icon is visible - PASSED (234ms)
```

#### 4. Fixture Teardown (After Each Test)
```
  → Fixture logs "✅ TEST PASSED" or "❌ TEST FAILED" via Winston
  → All log entries written to test-logs/test-execution.log (10MB rotating)
  → Colored output written to console
  → Log entries collected for HTML report generation
  → If test failed: error message logged; screenshots captured during failure
  → Playwright captures trace (retain-on-failure) and screenshots
```

#### 5. Report Generation
```
  → HTML report generated in playwright-report/
  → Allure data generated in allure-results/
  → Screenshots attached to the report
  → Traces available for debugging failed tests
  → Winston HTML report generated in test-logs/test-report.html
```

### API Test Flow

Taking `users-test.spec.ts` as an example:

```
1. Test uses api-test-fixture (no browser launched — request context only)
2. HelperFactory.createAPIHelpers() creates AdvancedAPIHelper + AdvancedAssertionsHelper
3. Fixture logs "▶ API TEST START"

Test: "Check get users response success response"
  → apiActions.get('https://jsonplaceholder.typicode.com/posts', 'Fetch all posts')
    → Logs: [INFO] 🌐 API GET: Fetch all posts
    → Sends GET /posts to jsonplaceholder.typicode.com
    → Logs: [INFO] ✓ Response: 200 OK
  → Response parsed as JSON
  → assert.toEqual(response.status(), 200, 'Verify status is 200')
  → assert.toEqual(jsonResponse.length, 100, 'Verify 100 posts returned')

Teardown:
  → Logs "✅ API TEST PASSED"
  → Logs: Total API Requests: 1
  → Logs: Total Assertions: 2 (Passed: 2, Failed: 0)
```

### Network Interception Test Flow

The `network-interception.spec.ts` demonstrates 5 different network manipulation techniques:

#### Test 1: Response Interception
```
1. Login to OrangeHRM via POM
2. Click "PIM" menu → triggers employee list API call
3. page.waitForResponse() captures the live API response
4. Extract empNumber from the response JSON
5. Use that data to send a DELETE request via Playwright's request context
   (demonstrates combining browser interaction with API calls)
```

#### Test 2: Full Response Mocking (route.fulfill)
```
1. page.route() intercepts calls to randomuser.me
2. Instead of making the real API call, returns local mock data
   from src/mocks/response-interception.json
3. Navigate to a page that calls this API
4. The page displays our mock data: "Playwright User"
5. Assert the mocked data appears in the UI
```

#### Test 3: Response Modification (route.fetch + modify + fulfill)
```
1. page.route() intercepts calls to randomuser.me
2. route.fetch() makes the REAL API call
3. Parse the real response and change name.first to "Udemy"
4. route.fulfill() returns the MODIFIED response to the browser
5. Assert the modified name appears in the UI
```

#### Test 4: Request Redirection (route.continue)
```
1. page.route() intercepts Wikipedia API requests
2. route.continue() redirects ANY search to always search for "Udemy"
3. User types "Hello" in the search box
4. Wikipedia results for "Udemy" appear (because the request was redirected)
5. Assert "Udemy" link is visible
```

#### Test 5: Request Abort
```
1. page.route('**/*.{png,jpg,jpeg}') matches all image requests
2. route.abort() blocks them from loading
3. Navigate to a page — it loads without any images
   (useful for faster tests or testing degraded experiences)
```

---

## Key Concepts

### Page Object Model (POM)

Every page in the application has a corresponding class that encapsulates:
- **Locators** — Element selectors (CSS, XPath)
- **Actions** — Methods like `login()`, `navigateToLogin()`
- **Assertions** — Methods like `assertInvalidLoginMessage()`

Tests never interact with locators directly. They only call high-level methods:

```typescript
// GOOD: Encapsulated, readable, maintainable
await pomLazy.loginPage.login('Admin', 'admin123');
await pomLazy.homePage.assertProfileIcon();

// BAD: Direct locator access — brittle and hard to maintain
await page.locator('input[name="username"]').fill('Admin');
```

### Eager vs Lazy Initialization

The framework provides two POM management strategies:

| Feature | POMEager | POMLazy |
|---------|----------|---------|
| When pages are created | Immediately in constructor | On first access |
| Memory usage | All pages allocated upfront | Only used pages allocated |
| Complexity | Simpler (no null checks) | Slightly more complex |
| Best for | Multi-page flows | 1–2 page tests |

```typescript
// Eager: all pages created immediately
const pom = new POMEager(page, testName);
pom.getLoginPage();  // Already exists
pom.getHomePage();    // Already exists

// Lazy: pages created on-demand
const pom = new POMLazy(page, testName);
pom.loginPage;  // Created NOW (first access)
pom.homePage;   // Created NOW (first access)
pom.loginPage;  // Returns cached instance (not recreated)
```

### Custom Fixtures

Fixtures are Playwright's dependency injection mechanism. This framework provides three fixtures in `tests/fixtures/`:

| Fixture | Key | What It Provides | Use Case |
|---------|-----|-----------------|----------|
| `pom-eager-fixture` | `pomEagerFixture` | `{ pomEager, logger }` + lifecycle logging | Multi-page UI tests |
| `pom-lazy-fixture` | `pomLazyFixture` | `{ pomLazy, logger }` + lifecycle logging | Single/few-page UI tests |
| `api-test-fixture` | `apiTestFixture` | `{ apiActions, assert }` + request/response logging | API tests |

Helpers (`AdvancedActionsHelper`, `AdvancedAssertionsHelper`) live **inside page objects**, not at the fixture level. Fixtures provide the POM manager; page objects own their helpers.

### StepRunner — Dual-Channel Observability

`StepRunner` (`src/utils/step-runner.ts`) is a thin static adapter that wraps `test.step()`:

```typescript
export class StepRunner {
    static async run<T>(title: string, fn: () => Promise<T>): Promise<T> {
        return await test.step(title, async () => fn());
    }
}
```

Every action in `AdvancedActionsHelper` calls `StepRunner.run(logMessage, ...)`, which means each action simultaneously:

1. **Logs to Winston** — Console (colored) + rotating file + HTML report collector
2. **Registers a `test.step()`** — Creates a collapsible step in the Playwright HTML report

This dual-channel approach gives both persistent log files and interactive test report steps from a single action call, with no extra boilerplate in tests or page objects.

### Advanced Actions Helper

Wraps common Playwright actions (`goto`, `click`, `fill`, `getText`, `waitForVisible`) with:

- **Sequential step numbering** — `Step 1`, `Step 2`, etc.
- **Dual-channel logging** — Winston (file/console/HTML) + Playwright `test.step()` via StepRunner
- **Performance timing** — Duration of each action in milliseconds
- **Sensitive data masking** — Passwords logged as `***MASKED***`
- **Screenshot on failure** — Full-page screenshot captured automatically

Example log output (console, colored):

```text
2026-01-15 10:30:45.123 [INFO] [Actions-valid_login] - Step 1: Navigate to OrangeHRM login page
2026-01-15 10:30:46.456 [INFO] [Actions-valid_login] - Step 1: Navigate to OrangeHRM login page - SUCCESS (1333ms)
2026-01-15 10:30:46.460 [INFO] [Actions-valid_login] - Step 2: Enter username
2026-01-15 10:30:46.462 [DEBUG] [Actions-valid_login] - Input value: "Admin"
2026-01-15 10:30:46.510 [INFO] [Actions-valid_login] - Step 2: Enter username - SUCCESS (50ms)
2026-01-15 10:30:46.515 [INFO] [Actions-valid_login] - Step 3: Enter password
2026-01-15 10:30:46.516 [DEBUG] [Actions-valid_login] - Input value: ***MASKED***
```

### Advanced Assertions Helper

Wraps all Playwright `expect()` assertions with logging, and adds soft/hard assertion modes:

**Available assertion methods:**

| Category | Methods |
|----------|---------|
| Visibility | `toBeVisible()`, `toBeHidden()` |
| Text | `toHaveText()`, `toContainText()` |
| Value | `toHaveValue()`, `toBeEmpty()` |
| Count | `toHaveCount()` |
| State | `toBeEnabled()`, `toBeDisabled()`, `toBeChecked()`, `toBeEditable()`, `toBeFocused()` |
| Attributes | `toHaveAttribute()`, `toHaveClass()`, `toHaveCSS()` |
| URL/Page | `toHaveURL()`, `toHaveTitle()` |
| Custom | `toBeTruthy()`, `toBeFalsy()`, `toEqual()`, `toContain()`, `toBeGreaterThan()`, `toBeLessThan()` |

### Soft vs Hard Assertions

Every assertion method accepts an optional `soft` parameter:

```typescript
// HARD assertion (default) — test stops immediately on failure
await assert.toBeVisible(locator, 'Check element');

// SOFT assertion — failure is recorded, test continues
await assert.toBeVisible(locator, 'Check element', true);
await assert.toHaveText(locator, 'Expected', 'Check text', true);

// At the end, throw all collected failures at once
await assert.assertAllSoftAssertions();
```

Soft assertions are ideal for verifying multiple elements on a page without stopping at the first failure.

### Logging with Winston

All logging across the framework is handled by [Winston](https://github.com/winstonjs/winston) via the centralized `Logger` utility (`src/utils/Logger.ts`).

**Three output channels** (configured automatically):

| Channel | Description |
|---------|-------------|
| **Console** | Colored, timestamped output with log level and category |
| **File** | Rotating log file (`test-logs/test-execution.log`) — 10MB max, 5 backups |
| **HTML Report** | Interactive dashboard (`test-logs/test-report.html`) with level/category filtering |

**Log levels** (configurable via `LOG_LEVEL` env variable, default: `debug`):

`silly` < `debug` < `verbose` < `info` < `warn` < `error`

**Quick usage:**

```typescript
import { Logger } from '../utils/Logger';
import winston from 'winston';

// In a class (page object, helper, etc.)
private readonly logger: winston.Logger;
constructor(testName: string) {
    this.logger = Logger.getLogger(`MyPage-${testName}`);
}

// Logging at different levels
this.logger.info("Navigating to login page");
this.logger.debug(`Current URL: ${this.page.url()}`);
this.logger.warn("Element took longer than expected");
this.logger.error("Login failed");
```

**IMPORTANT**: Ensure `Logger.shutdown()` is called in `globalTeardown` to flush all logs before the process exits.

For the full integration guide, see [docs/logging-guide.md](docs/logging-guide.md).

### Network Interception & Mocking

Playwright provides four network manipulation strategies demonstrated in this framework:

| Strategy | Method | Use Case |
|----------|--------|----------|
| **Capture** | `page.waitForResponse()` | Inspect live API responses |
| **Mock** | `route.fulfill()` | Replace API response with local data |
| **Modify** | `route.fetch()` + `route.fulfill()` | Alter real API response before returning |
| **Redirect** | `route.continue({ url })` | Send requests to a different endpoint |
| **Abort** | `route.abort()` | Block resources (images, CSS, etc.) |

---

## Design Patterns

This framework implements enterprise-grade design patterns for maintainability, scalability, and code quality.

### Builder Pattern

**Purpose:** Fluent API for creating complex test data objects

**Implementation:** `src/builders/user-builder.ts`

**Benefits:**

- Readable, expressive test data creation
- Preset configurations (`asValidAdmin`, `asInvalidPassword`, etc.)
- Build-time validation
- Default values for optional fields

**Example Usage:**

```typescript
import { UserBuilder } from '../src/builders/user-builder';

// Using preset configurations
const validUser = new UserBuilder().asValidAdmin().build();
const invalidUser = new UserBuilder().asInvalidPassword().build();

// Custom configuration with fluent API
const customUser = new UserBuilder()
    .withUsername('testuser')
    .withPassword('testpass')
    .withDescription('Custom test scenario')
    .build();

// Generate multiple invalid users for data-driven testing
const invalidUsers = UserBuilder.buildInvalidUsers();
invalidUsers.forEach(user => {
    test(`Login fails for ${user.testType}`, async () => {
        await loginPage.login(user.username, user.password);
        await loginPage.assertInvalidLoginMessage();
    });
});
```

**See also:** `tests/ui/specs/login-with-builder.spec.ts` for complete examples

### Factory Pattern

**Purpose:** Centralize helper object creation

**Implementation:** `src/factories/helper-factory.ts`

**Benefits:**

- Single source of truth for instantiation
- Consistent constructor parameters
- Reduces duplication in fixtures
- Easy to add pre/post-creation hooks

**Example Usage:**

```typescript
import { HelperFactory } from '../src/factories/helper-factory';

// Create UI helpers (actions + assertions)
const { actions, assert } = HelperFactory.createHelpers(page, 'My Test');

// Create API helpers (apiActions + assert with screenshots disabled)
const { apiActions, assert } = HelperFactory.createAPIHelpers(request, page, 'My Test');
```

### More Patterns

For a comprehensive analysis of all **11 currently implemented patterns** and recommended patterns, see [docs/design-patterns-analysis.md](docs/design-patterns-analysis.md).

**Currently Implemented:**

1. Page Object Model (POM)
2. Manager Pattern (Eager/Lazy)
3. Fixture Pattern (Dependency Injection)
4. Helper/Wrapper Pattern
5. Adapter Pattern — StepRunner (`test.step()` integration)
6. Factory Pattern — `HelperFactory`
7. Centralized Logging (Winston + multi-transport)
8. Endpoint Abstraction
9. Data-Driven Testing
10. Network Interception
11. Builder Pattern — `UserBuilder`

**Recommended Next:**

- Repository Pattern (Phase 2) — Centralized data management
- Strategy Pattern (Phase 3) — Browser-specific behaviors
- Decorator Pattern (Phase 3) — Flexible action enhancement

---

## Environment Configuration

The framework supports multiple environments via the `ENV` variable:

| Environment | UI Base URL | API Base URL | Credentials |
|------------|-------------|--------------|-------------|
| `test` (default) | `https://opensource-demo.orangehrmlive.com` | `https://jsonplaceholder.typicode.com` | Admin / admin123 |
| `staging` | `https://opensource-demo.orangehrmlive.com/staging` | `https://jsonplaceholder.typicode.com/staging` | Admin123 / admin123 |

Set the environment:
```bash
# Via .env file
ENV=test

# Via command line (cross-env for cross-platform support)
npm run staging
# Which runs: cross-env ENV=staging npx playwright test --grep @ft
```

---

## Reporting

The framework generates multiple report types:

| Reporter | Output Location | How to View |
|----------|----------------|-------------|
| **HTML Report** | `playwright-report/` | Auto-opens after run, or `npx playwright show-report` |
| **Allure Report** | `allure-results/` | `npx allure generate allure-results && npx allure open` |
| **Winston Log File** | `test-logs/test-execution.log` | Rotating file (10MB max) with all log categories |
| **Winston HTML Report** | `test-logs/test-report.html` | Interactive dashboard with level/category filtering |
| **Failure Screenshots** | `test-logs/failure-screenshots/` | Captured automatically on any action/assertion failure |
| **Traces** | `test-results/` | Open via `npx playwright show-trace <trace-file>` |

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run ui` | `npx playwright test --project=ui` | Run UI-tagged tests |
| `npm run api` | `npx playwright test --grep @api` | Run API-tagged tests only |
| `npm run ft` | `npx playwright test --grep @ft` | Run functional tests |
| `npm run staging` | `cross-env ENV=staging npx playwright test --grep @ft` | Run on staging env |
| `npm run debug` | `npx playwright test --project=debug` | Run in debug mode |
| `npm run repeat` | `npx playwright test --repeat-each 5` | Repeat each test 5 times |
| `npm run lh` | `npx lhci autorun` | Run Lighthouse CI audit |

---

## Dependencies

### Core
| Package | Purpose |
|---------|---------|
| `@playwright/test` | Testing framework and browser automation |
| `playwright` | Browser automation engine |
| `dotenv` | Load environment variables from `.env` |
| `winston` | Structured logging (console + file + HTML report) |
| `playwright-lighthouse` | Lighthouse performance auditing via Playwright |

### Development / Reporting
| Package | Purpose |
|---------|---------|
| `allure-playwright` | Allure test reporting integration |
| `@reportportal/agent-js-playwright` | ReportPortal dashboard integration |
| `@lhci/cli` | Lighthouse CI command-line tool |
| `cross-env` | Cross-platform environment variable setting |
| `typescript-eslint` | TypeScript linting |

---

## Configuration Highlights

| Setting | Value | Notes |
|---------|-------|-------|
| Test timeout | 2 minutes | Per individual test |
| Global timeout | 3 hours | Entire suite |
| Expect timeout | 6 seconds | For assertions |
| Retries | 0 (local) / 2 (CI) | Automatic retry on CI |
| Workers | 1 (local) / 2 (CI) | Parallel execution |
| Screenshots | Always captured | Attached to reports |
| Traces | Retained on failure | For debugging with trace viewer |
| Browser | Chromium (1280x920) | Firefox and WebKit available |
