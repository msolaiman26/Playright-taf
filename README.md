# Playwright Test Automation Framework (TAF)

A comprehensive, enterprise-grade test automation framework built with **Playwright** and **TypeScript**. Demonstrates industry best practices including the Page Object Model (POM), custom fixtures, advanced logging, soft/hard assertions, network interception, visual regression, and performance testing.

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
  - [Advanced Actions Helper](#advanced-actions-helper)
  - [Advanced Assertions Helper](#advanced-assertions-helper)
  - [Soft vs Hard Assertions](#soft-vs-hard-assertions)
  - [Logging with log4js](#logging-with-log4js)
  - [Network Interception & Mocking](#network-interception--mocking)
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
│   ├── data/                         # Test data files
│   │   ├── test-users.ts             #   Default credentials (test environment)
│   │   ├── staging-users.ts          #   Staging credentials
│   │   ├── invalid-test-users.ts     #   Invalid credentials for negative tests
│   │   └── test-users.json           #   JSON format credentials (alternative)
│   │
│   ├── endpoints/                    # API endpoint definitions
│   │   └── users-endpoints.ts        #   GET/POST functions for JSONPlaceholder API
│   │
│   ├── fixtures/                     # Custom Playwright test fixtures
│   │   ├── pom-eager-fixture.ts      #   Fixture with POMEager + helpers + log4js
│   │   ├── pom-lazy-fixture.ts       #   Fixture with POMLazy + helpers + log4js
│   │   ├── test-fixtures.ts          #   Fixture with logger + POMLazy + helpers
│   │   └── test-helpers-fixture.ts   #   Fixture with helpers only (no POM)
│   │
│   ├── mocks/                        # Mock response data
│   │   └── response-interception.json #  Mock user data for API mocking tests
│   │
│   ├── pages/                        # Page Object Models
│   │   ├── login-page.ts             #   Login page with log4js logging
│   │   ├── login-page-log4js.ts      #   Login page (log4js reference impl)
│   │   ├── home-page.ts              #   Dashboard page with log4js logging
│   │   ├── pom-eager.ts              #   Page Object Manager — Eager initialization
│   │   └── pom-lazy.ts               #   Page Object Manager — Lazy initialization
│   │
│   └── utils/                        # Utility classes and helpers
│       ├── Logger.ts                 #   log4js wrapper (console + file + HTML report)
│       ├── advanced-actions-helper.ts #   Logged page actions via log4js
│       ├── advanced-assertions-helper.ts # Logged assertions via log4js
│       ├── ui-helper.ts              #   Visual regression and LHCI performance checks
│       ├── lighthouse-helper.ts      #   Lighthouse performance auditing
│       ├── urls.ts                   #   Centralized URL config per environment
│       └── setup/                    # Global setup/teardown scripts
│           ├── env-setup.ts          #     Environment detection and data selection
│           ├── global-setup.ts       #     Pre-suite login and storage state saving
│           ├── global-teardown.ts    #     Post-suite cleanup
│           ├── user-name.setup.ts    #     Setup: update user profile name
│           └── user-name.teardown.ts #     Teardown: reset user profile name
│
├── tests/                            # Test specifications
│   ├── ui/                           # UI (browser-based) tests
│   │   ├── fixtures/
│   │   │   └── login-fixture.ts      #   Custom fixture for login tests
│   │   └── specs/
│   │       ├── login-with-fixture.spec.ts          # Login tests (login fixture)
│   │       ├── login-with-POManagerEager.spec.ts    # Login tests (POMEager)
│   │       ├── login-with-POManagerLazy.spec.ts     # Login tests (POMLazy)
│   │       ├── login-test-with-helpers.spec.ts      # Best practice demo
│   │       ├── login-helpers-log4js.spec.ts         # Log4js logging demo tests
│   │       └── login-with-DD.spec.ts                # Data-driven login tests
│   │
│   └── api/                          # API tests (no browser needed)
│       └── specs/
│           ├── users-test.spec.ts                   # REST API CRUD tests
│           └── network-interception.spec.ts         # Network mocking & interception
│
├── docs/                             # Documentation
│   └── log4js-logging-guide.md       #   Detailed log4js integration guide
│
├── test-logs/                        # Generated: log4js log files + HTML report
│   ├── test-execution.log            #   Rolling daily log file (all categories)
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
│  pom-eager-fixture  │  pom-lazy-fixture  │  login-fixture           │
│  (Create helpers, POM, and handle setup/teardown per test)          │
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
│  AdvancedAssertionsHelper — Logged toBeVisible, toHaveText, etc.    │
│  LighthouseHelper        — Performance auditing                     │
│  UIHelper                — Visual regression testing                │
│  URLs                    — Environment-based URL resolution          │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ logs via
┌──────────────────▼──────────────────────────────────────────────────┐
│                   log4js Logging Layer                               │
│  Logger (src/utils/Logger.ts) — Centralized log4js configuration    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐    │
│  │   Console    │  │  File (daily │  │  HTML Report Collector   │    │
│  │  (colored)   │  │  rotation)   │  │  (filterable dashboard)  │    │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
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
npx playwright test tests/ui/specs/login-with-fixture.spec.ts

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
Test runner calls the pom-eager-fixture:
  → Creates a log4js logger named after the test
  → Creates POMEager with the test name
    → POMEager constructor (eager) immediately creates:
      → LoginPage instance (with its own log4js logger + AdvancedActionsHelper + AdvancedAssertionsHelper)
      → HomePage instance (with its own logger + helpers)
    → Each helper gets a log4js logger (e.g., "Actions-testName", "Assertions-testName")
  → Creates standalone AdvancedActionsHelper (for general actions)
  → Creates standalone AdvancedAssertionsHelper (for general assertions)
  → Logs "▶ TEST START" via log4js
  → All are passed to the test via `pomEagerHelpers`
```

#### 3. Test Execution (Valid Login Example)
```
Step 1: Navigate to OrangeHRM login page
  → AdvancedActionsHelper.goto() is called
  → Logs: [ACTION] Step 1: Navigate to OrangeHRM login page
  → Playwright navigates to the URL (waits for domcontentloaded)
  → Logs: [SUCCESS] Step 1: Navigate to OrangeHRM login page (1523ms)

Step 2: Fill username
  → AdvancedActionsHelper.fill() is called
  → Logs: [ACTION] Step 2: Enter username
  → Logs: [DATA] Input value: "Admin"
  → Playwright fills the input field
  → Logs: [SUCCESS] Step 2: Enter username (45ms)

Step 3: Fill password
  → AdvancedActionsHelper.fill() is called with isSensitive=true
  → Logs: [ACTION] Step 3: Enter password
  → Logs: [DATA] Input value: ***MASKED***    ← Password hidden in logs!
  → Playwright fills the password field
  → Logs: [SUCCESS] Step 3: Enter password (38ms)

Step 4: Click login button
  → AdvancedActionsHelper.click() is called
  → Logs: [DATA] Element state - Visible: true, Enabled: true
  → Playwright clicks the button
  → Logs: [SUCCESS] Step 4: Click login button (892ms)

Step 5: Assert profile icon is visible
  → AdvancedAssertionsHelper.toBeVisible() is called
  → handleAssertion() wraps the Playwright expect() call
  → Logs: [ASSERTION] Assertion #1 [HARD]: Verify profile icon is visible
  → Playwright's expect(locator).toBeVisible() runs
  → Logs: [PASSED] Assertion #1: Verify profile icon is visible (234ms)
```

#### 4. Fixture Teardown (After Each Test)
```
  → Fixture logs "✅ TEST PASSED" or "❌ TEST FAILED" via log4js
  → All log entries written to test-logs/test-execution.log (daily rolling)
  → Colored output written to console
  → Log entries collected for HTML report generation
  → If test failed: screenshots already captured during failure
  → Playwright captures trace (retain-on-failure) and screenshots
```

#### 5. Report Generation
```
  → HTML report generated in playwright-report/
  → Allure data generated in allure-results/
  → Screenshots attached to the report
  → Traces available for debugging failed tests
```

### API Test Flow

Taking `users-test.spec.ts` as an example:

```
1. Test uses Playwright's built-in `request` fixture (no browser launched)
2. The request fixture creates an HTTP client with baseURL from config

Test: "Check get users response success response"
  → usersRequest.getUsers(request) called
    → Sends GET /posts to jsonplaceholder.typicode.com
    → Returns the full HTTP response object
  → Response parsed as JSON
  → expect(response.status()).toBe(200)      ← Verify HTTP status
  → expect(jsonResponse.length).toBe(100)    ← Verify array has 100 items

Test: "Check post user response status code and body"
  → usersRequest.createUser(request) called
    → Sends POST /posts with body { title: "foo", body: "bar", userId: 102 }
    → Returns the response
  → Response parsed as JSON
  → expect(jsonResponse.id).toEqual(101)     ← JSONPlaceholder always returns id: 101
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
| Best for | Small page sets | Large page sets |

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

Fixtures are Playwright's dependency injection mechanism. This framework provides three fixture levels:

| Fixture | What It Provides | Use Case |
|---------|-----------------|----------|
| `test-fixtures` | logger + POMLazy + actions + assert | Recommended: log4js-first tests |
| `pom-eager-fixture` | POMEager + actions + assert + log4js lifecycle | Standard UI tests |
| `pom-lazy-fixture` | POMLazy + actions + assert + log4js lifecycle | Memory-efficient tests |
| `test-helpers-fixture` | actions + assert + log4js lifecycle | Tests without POM |
| `login-fixture` | POMEager (pre-navigated) + loginPage + actions + assert | Login-specific tests |

### Advanced Actions Helper

Wraps common Playwright actions (`goto`, `click`, `fill`, `getText`, `waitForVisible`) with:

- **Sequential step numbering** — `Step 1`, `Step 2`, etc.
- **log4js logging** — Console (colored) + daily rolling file + HTML report collector
- **Performance timing** — Duration of each action in milliseconds
- **Sensitive data masking** — Passwords logged as `***MASKED***`
- **Screenshot on failure** — Full-page screenshot captured automatically

Example log output (console, colored):

```text
2025-01-15 10:30:45.123 [INFO] [Actions-valid_login] - Step 1: Navigate to OrangeHRM login page
2025-01-15 10:30:46.456 [INFO] [Actions-valid_login] - Step 1: Navigate to OrangeHRM login page - SUCCESS (1333ms)
2025-01-15 10:30:46.460 [INFO] [Actions-valid_login] - Step 2: Enter username
2025-01-15 10:30:46.462 [DEBUG] [Actions-valid_login] - Input value: "Admin"
2025-01-15 10:30:46.510 [INFO] [Actions-valid_login] - Step 2: Enter username - SUCCESS (50ms)
2025-01-15 10:30:46.515 [INFO] [Actions-valid_login] - Step 3: Enter password
2025-01-15 10:30:46.516 [DEBUG] [Actions-valid_login] - Input value: ***MASKED***
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

### Logging with log4js

All logging across the framework is handled by [log4js](https://log4js-node.github.io/log4js-node/) via the centralized `Logger` utility (`src/utils/Logger.ts`). This replaces the previous manual `console.log` + `fs.appendFileSync` approach.

**Three output channels** (configured automatically):

| Channel | Description |
|---------|-------------|
| **Console** | Colored, timestamped output with log level and category |
| **File** | Daily rotating log file (`test-logs/test-execution.log`) with 5 backups |
| **HTML Report** | Interactive dashboard (`test-logs/test-report.html`) with level/category filtering |

**Log levels** (configurable via `LOG_LEVEL` env variable, default: `debug`):

`TRACE` < `DEBUG` < `INFO` < `WARN` < `ERROR` < `FATAL`

**Quick usage:**

```typescript
import { Logger } from '../utils/Logger';
import { Logger as Log4jsLogger } from 'log4js';

// In a class (page object, helper, etc.)
private readonly logger: Log4jsLogger;
constructor(testName: string) {
    this.logger = Logger.getLogger(`MyPage-${testName}`);
}

// Logging at different levels
this.logger.info("Navigating to login page");
this.logger.debug(`Current URL: ${this.page.url()}`);
this.logger.warn("Element took longer than expected");
this.logger.error("Login failed");
this.logger.fatal("Critical: page crashed");
```

For the full integration guide, see [docs/log4js-logging-guide.md](docs/log4js-logging-guide.md).

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
| **log4js Log File** | `test-logs/test-execution.log` | Rolling daily file with all log categories |
| **log4js HTML Report** | `test-logs/test-report.html` | Interactive dashboard with level/category filtering |
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
| `log4js` | Structured logging (console + file + HTML report) |
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
| Visual diff | 0 max diff pixels | Pixel-perfect comparison |
| Browser | Chromium (1280x920) | Firefox and WebKit available |
