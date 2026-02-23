# Logging Guide: Winston & StepRunner

This document explains the complete logging architecture of the Playwright Test Automation Framework — how Winston provides persistent, searchable logs across three output channels, and how `StepRunner` bridges those logs to Playwright's native HTML report through `test.step()`.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Two Independent Logging Channels](#two-independent-logging-channels)
- [The Logger Utility (Winston)](#the-logger-utility-winston)
- [Output Channels](#output-channels)
  - [Console Transport](#console-transport)
  - [File Transport](#file-transport)
  - [HTML Report Collector](#html-report-collector)
- [Log Levels](#log-levels)
- [StepRunner — Playwright Test.step() Integration](#steprunner--playwright-teststep-integration)
  - [What StepRunner Does](#what-steprunner-does)
  - [How It Integrates with AdvancedActionsHelper](#how-it-integrates-with-advancedactionshelper)
  - [Dual-Channel Flow per Action](#dual-channel-flow-per-action)
  - [What You See in Each Channel](#what-you-see-in-each-channel)
- [Usage Patterns](#usage-patterns)
  - [In Page Objects](#in-page-objects)
  - [In Helpers (Actions / Assertions)](#in-helpers-actions--assertions)
  - [In Fixtures](#in-fixtures)
  - [In Test Specs](#in-test-specs)
- [Category Naming Conventions](#category-naming-conventions)
- [HTML Report](#html-report)
  - [Generating the Report](#generating-the-report)
  - [Features](#features)
- [Configuration](#configuration)
- [Global Teardown Integration](#global-teardown-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│  Page Objects / Helpers / Fixtures / Test Specs              │
│                                                              │
│  this.logger = Logger.getLogger("CategoryName");             │
│  this.logger.info("message");           ← Winston            │
│                                                              │
│  await StepRunner.run("description", async () => { ... });  │
│                                         ← Playwright step    │
└──────────────────────┬───────────────────────────────────────┘
                       │
           ┌───────────┴────────────────┐
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌───────────────────────────────┐
│  Logger Utility      │    │  StepRunner                   │
│  (src/utils/Logger)  │    │  (src/utils/step-runner.ts)   │
│                      │    │                               │
│  Winston logger      │    │  Wraps fn() in test.step()    │
│  factory & manager   │    │  — integrates with PW report  │
└──────────┬───────────┘    └───────────────────────────────┘
           │
  ┌────────┼──────────┐
  ▼        ▼          ▼
Console  File      HTML
         (10MB     Collector
         rotate)   (in-memory)
```

---

## Two Independent Logging Channels

The framework uses **two completely independent logging systems** that work in parallel for every action:

| Channel | Technology | Output | Best For |
|---------|-----------|--------|----------|
| **Winston** | `src/utils/Logger.ts` | Console + rotating log file + HTML dashboard | Persistent records, filtering by category/level, long-term audit |
| **Playwright test.step()** | `src/utils/step-runner.ts` | Playwright HTML report (built-in) | Visual step timeline per test, quick CI pass/fail drill-down |

These channels are **intentionally separate**:

- Winston knows nothing about Playwright test results
- `test.step()` knows nothing about log files
- `StepRunner` is the thin bridge that triggers both simultaneously from one call site

---

## The Logger Utility (Winston)

Located at `src/utils/Logger.ts`, this is a static factory class that:

1. Creates Winston loggers on demand via `Logger.getLogger(category)`
2. Configures three transports (console, file, HTML collector) once per category
3. Caches loggers by category — repeated calls return the same instance
4. Creates the `test-logs/` directory automatically on first use

```typescript
import { Logger } from '../utils/Logger';
import winston from 'winston';

// Get a logger for a specific category
const logger: winston.Logger = Logger.getLogger('MyCategory');
logger.info('Starting test flow');
logger.debug('Detailed diagnostics here');
```

The `category` parameter appears in every log line and is the primary filter key in the HTML report. Use descriptive, structured names like `LoginPage-ValidLogin` or `Fixture-POMEager-valid_login`.

---

## Output Channels

### Console Transport

Prints colored, timestamped log lines to the terminal in real time:

```text
2026-02-23 10:30:45.123 [info]  [LoginPage-valid_login] - Step 1: Navigate to login page - SUCCESS (234ms)
2026-02-23 10:30:45.456 [debug] [LoginPage-valid_login] - Element state - Visible: true, Enabled: true
2026-02-23 10:30:46.789 [error] [Actions-valid_login]   - Step 3: Click login - FAILED (500ms) - Error: ...
```

Format:
```typescript
winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) =>
        `${timestamp} [${level}] [${category}] - ${message}`
    )
)
```

### File Transport

Writes to `test-logs/test-execution.log` with automatic rotation:

- **Max size**: 10 MB per file
- **Rotation**: Keeps 5 old files (`test-execution.log.1`, `.2`, etc.)
- **Format**: Same as console but without ANSI colour codes

```typescript
new winston.transports.File({
    filename: path.join(LOG_DIR, "test-execution.log"),
    maxsize: 10 * 1024 * 1024,  // 10MB
    maxFiles: 5,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.printf(({ timestamp, level, message }) =>
            `${timestamp} [${level.toUpperCase()}] [${category}] - ${message}`
        )
    )
})
```

### HTML Report Collector

A custom Winston transport (`HtmlCollectorTransport`) that accumulates every log entry in memory:

```typescript
class HtmlCollectorTransport extends Transport {
    log(info: any, callback: () => void): void {
        logEntries.push({
            timestamp: info.timestamp || new Date().toISOString(),
            level: info.level.toUpperCase(),
            category: this.category,
            message: info.message,
        });
        callback();
    }
}
```

All collected entries are written to `test-logs/test-report.html` when `Logger.generateHtmlReport()` is called in `globalTeardown`.

---

## Log Levels

Winston uses the following levels (least to most severe):

| Level | Usage | Example |
|-------|-------|---------|
| `silly` | Extremely granular debug info | Rarely used |
| `debug` | Diagnostic details — element state, values, URLs | `logger.debug("Input value: Admin")` |
| `verbose` | Detailed operational information | `logger.verbose("Page DOM loaded")` |
| `info` | Normal flow events — step success, test start/end | `logger.info("Step 1: Navigate - SUCCESS (234ms)")` |
| `warn` | Soft assertion failures, unexpected but non-fatal | `logger.warn("Assertion #3: SOFT_FAIL")` |
| `error` | Hard failures — actions, assertions, screenshots | `logger.error("Step 3: Click - FAILED")` |

**Default level**: `debug` (shows everything except `silly`).

**Change via environment variable**:

```bash
LOG_LEVEL=info npx playwright test    # Only INFO and above
LOG_LEVEL=warn npx playwright test    # Only WARN and above (quietest)
LOG_LEVEL=debug npx playwright test   # DEBUG and above (default)
LOG_LEVEL=silly npx playwright test   # Everything
```

---

## StepRunner — Playwright Test.step() Integration

### What StepRunner Does

`StepRunner` is a minimal static class in `src/utils/step-runner.ts`:

```typescript
import { test } from '@playwright/test';

export class StepRunner {
    static async run<T>(title: string, fn: () => Promise<T>): Promise<T> {
        return await test.step(title, async () => {
            return await fn();
        });
    }
}
```

It wraps any async function in a Playwright `test.step()` call. This causes:

1. The step to appear **collapsibly** in Playwright's HTML report under its parent test
2. The step's **duration** to be tracked and displayed in the report
3. On failure, the report shows **which step failed** rather than just the test name

### How It Integrates with AdvancedActionsHelper

Every action method in `AdvancedActionsHelper` wraps its body in `StepRunner.run()`:

```typescript
// src/utils/advanced-actions-helper.ts
async click(locator: Locator, description?: string) {
    this.stepCounter++;
    const step = `Step ${this.stepCounter}`;
    const logMessage = description || 'Click element';

    // StepRunner.run() → registers this as a test.step() in Playwright's HTML report
    await StepRunner.run(logMessage, async () => {
        const startTime = Date.now();
        try {
            const isVisible = await locator.isVisible();
            this.logger.debug(`Element state - Visible: ${isVisible}, Enabled: ${await locator.isEnabled()}`);
            await locator.click();
            const duration = Date.now() - startTime;
            this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            //                                          ↑ Winston log file + console + HTML report
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
    });
}
```

The same `logMessage` (description) is used as both:

- The **Playwright step title** (via `StepRunner.run(logMessage, ...)`)
- The **Winston log prefix** (via `this.logger.info(\`${step}: ${logMessage}...\`)`)

### Dual-Channel Flow per Action

When a test calls `await pomLazy.loginPage.login('Admin', 'admin123')`, each internal helper call triggers:

```
pomLazy.loginPage.login()
  │
  ├── actions.fill(usernameInput, 'Admin', 'Enter username')
  │     │
  │     ├── StepRunner.run("Enter username", ...)   → Playwright HTML: collapsible step
  │     │                                              with duration badge
  │     │
  │     └── this.logger.info("Step 1: Enter username - SUCCESS (45ms)")
  │                                                  → Console (colored)
  │                                                  → test-logs/test-execution.log
  │                                                  → test-logs/test-report.html
  │
  ├── actions.fill(passwordInput, 'admin123', 'Enter password', true)
  │     ├── StepRunner.run("Enter password", ...)   → Playwright HTML step
  │     └── this.logger.info("Step 2: Enter password - SUCCESS (38ms)")
  │
  └── actions.click(loginButton, 'Click login button')
        ├── StepRunner.run("Click login button", ...) → Playwright HTML step
        └── this.logger.info("Step 3: Click login button - SUCCESS (112ms)")
```

### What You See in Each Channel

**Playwright HTML Report** (opened with `npx playwright show-report`):

```
▼ valid login                          [2.4s] PASSED
  ▶ Navigate to login page             [234ms]
  ▶ Enter username                     [45ms]
  ▶ Enter password                     [38ms]
  ▶ Click login button                 [112ms]
  ▶ Assert profile icon is visible     [89ms]
```

**Winston Console / Log File** (`test-logs/test-execution.log`):

```
2026-02-23 10:30:44.001 [INFO]  [Fixture-POMEager-valid_login] - ▶ TEST START: "valid login"
2026-02-23 10:30:44.120 [INFO]  [Actions-valid_login-actions]  - === Actions Helper Started: valid login-actions ===
2026-02-23 10:30:44.350 [INFO]  [Actions-valid_login-actions]  - Step 1: Navigate to login page - SUCCESS (234ms)
2026-02-23 10:30:44.395 [INFO]  [Actions-valid_login-actions]  - Step 2: Enter username - SUCCESS (45ms)
2026-02-23 10:30:44.433 [INFO]  [Actions-valid_login-actions]  - Step 3: Enter password - SUCCESS (38ms)
2026-02-23 10:30:44.545 [INFO]  [Actions-valid_login-actions]  - Step 4: Click login button - SUCCESS (112ms)
2026-02-23 10:30:44.634 [INFO]  [Assertions-valid_login-assertions] - Assertion #1 [HARD]: Assert profile icon visible
2026-02-23 10:30:44.723 [INFO]  [Assertions-valid_login-assertions] - Assertion #1: Assert profile icon visible - PASSED (89ms)
2026-02-23 10:30:44.724 [INFO]  [Fixture-POMEager-valid_login] - ✅ TEST PASSED: "valid login" (723ms)
```

**Responsibility split between the two channels:**

| What | Playwright Report | Winston Logs |
|------|-------------------|-------------|
| Step name / title | `StepRunner.run(description)` | `Step N:` prefix + description |
| Step numbering | Hierarchical nesting | Sequential `Step 1`, `Step 2`, ... |
| Step duration | Native (automatic) | `Date.now()` delta, appended to log |
| Test pass/fail | Native (automatic) | Fixture teardown via `testInfo.status` |
| Failure screenshots | Not applicable | Saved to `test-logs/failure-screenshots/` |
| Log level filtering | Not applicable | `LOG_LEVEL` env var or HTML report filter |
| Category filtering | Not applicable | HTML report category dropdown |

---

## Usage Patterns

### In Page Objects

Page objects create a private `logger` in the constructor and log navigation and interaction details:

```typescript
import { Page, Locator } from '@playwright/test';
import winston from 'winston';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

export class LoginPage {
    readonly page: Page;
    private readonly logger: winston.Logger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.logger = Logger.getLogger(`LoginPage-${testName}`);
        this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
        this.assert = new AdvancedAssertionsHelper(page, `${testName}-assertions`);
    }

    async navigateToLogin() {
        this.logger.info("Navigating to login page");
        await this.actions.goto('https://example.com/', 'Navigate to login');
        this.logger.debug(`Current URL: ${this.page.url()}`);
    }

    async login(username: string, password: string, isPasswordSensitive = true) {
        this.logger.info(`Logging in as: ${username}`);
        await this.actions.fill(this.usernameInput, username, 'Enter username');
        await this.actions.fill(this.passwordInput, password, 'Enter password', isPasswordSensitive);
        await this.actions.click(this.loginButton, 'Click login button');
    }
}
```

The `actions` and `assert` helpers each have their own logger category (e.g., `Actions-ValidLogin-actions`), so Winston logs show clear separation between page-level events and individual step-level events.

### In Helpers (Actions / Assertions)

`AdvancedActionsHelper` and `AdvancedAssertionsHelper` manage their own loggers internally. You never pass a logger to them — they create one via `Logger.getLogger(...)` in their constructors.

Every action method (`click`, `fill`, `goto`, `waitForVisible`, `getText`) follows this pattern:

1. Increment `stepCounter`
2. Call `StepRunner.run(description, ...)` — registers a Playwright HTML report step
3. Inside the callback: execute the action, log success or failure via Winston

Every assertion method follows this pattern:

1. Increment `assertionCounter`
2. Call `handleAssertion(description, assertionFn, soft)` — logs HARD/SOFT type
3. On success: `logger.info(... PASSED)`
4. On failure:
   - Capture screenshot (if `enableScreenshots` is true)
   - If soft: `logger.warn(... SOFT_FAIL)`, collect error
   - If hard: `logger.error(... FAILED)`, re-throw

### In Fixtures

Fixtures create a logger to track the test lifecycle (before + after each test):

```typescript
import { Logger } from '../../src/utils/Logger';
import winston from 'winston';

export const test = base.extend<{ pomEagerFixture: POMEagerFixture }>({
    pomEagerFixture: async ({ page }, use, testInfo) => {
        const logger: winston.Logger = Logger.getLogger(
            `Fixture-POMEager-${testInfo.title.replace(/\s+/g, '_')}`
        );
        const pomEager = new POMEager(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);
        logger.debug(`  File: ${testInfo.file}`);

        await use({ pomEager, logger });

        // Teardown — always runs
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
            if (testInfo.error) logger.error(`   Error: ${testInfo.error.message}`);
        } else if (testInfo.status === 'skipped') {
            logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
        }
    }
});
```

### In Test Specs

For suite-level logging in `beforeAll` / `afterAll` hooks or directly in test bodies:

```typescript
import { test } from '../../fixtures/pom-eager-fixture';
import { Logger } from '../../../src/utils/Logger';
import winston from 'winston';

const logger: winston.Logger = Logger.getLogger('login-with-POManagerEager');

test.beforeAll('Suite setup', async () => {
    logger.info('This actions run before all tests');
});

test.afterEach('After each', async ({}, testInfo) => {
    logger.info(`test ends for: ${testInfo.title}`);
});

test('valid login', async ({ pomEagerFixture }) => {
    const { pomEager } = pomEagerFixture;
    logger.info('test starts for: valid login');
    await pomEager.getLoginPage().navigateToLogin();
    await pomEager.getLoginPage().login('Admin', 'admin123');
    await pomEager.getHomePage().assertProfileIcon();
});
```

---

## Category Naming Conventions

Consistent category names make Winston log filtering effective:

| Component | Pattern | Example |
|-----------|---------|---------|
| Page Object | `PageName-testName` | `LoginPage-valid_login` |
| Actions Helper | `Actions-testName-actions` | `Actions-valid_login-actions` |
| Assertions Helper | `Assertions-testName-assertions` | `Assertions-valid_login-assertions` |
| API Helper | `API-testName` | `API-Check_get_users` |
| POM Manager (Eager) | `POMEager-testName` | `POMEager-valid_login` |
| POM Manager (Lazy) | (no logger — lazy init) | — |
| Fixture (Eager) | `Fixture-POMEager-testName` | `Fixture-POMEager-valid_login` |
| Fixture (Lazy) | `Fixture-POMLazy-testName` | `Fixture-POMLazy-valid_login` |
| Fixture (API) | `Fixture-API-testName` | `Fixture-API-Check_get_users` |
| Helper Factory | `HelperFactory` | `HelperFactory` |
| Test Spec | `suite-name` | `login-with-POManagerEager` |
| Utility | `utility-name` | `network-interception` |

---

## HTML Report

### Generating the Report

`Logger.generateHtmlReport()` must be called in `globalTeardown` after all tests complete:

```typescript
// src/utils/setup/global-teardown.ts
import { Logger } from "../Logger";

async function globalTeardown() {
    console.log("\n🧹 Running global teardown...");

    // STEP 1: Flush all Winston loggers (ensures all entries are written)
    console.log("📝 Flushing Winston loggers...");
    await Logger.shutdown();
    console.log("✅ Winston loggers flushed");

    // STEP 2: Generate the HTML log report from collected in-memory entries
    console.log("📊 Generating HTML log report...");
    Logger.generateHtmlReport("Playwright Test Execution Report");
    console.log("✅ Global teardown completed\n");
}

export default globalTeardown;
```

The report is saved to `test-logs/test-report.html`.

### Features

The HTML report provides:

- **Stats cards** — Total logs, counts per level (Debug, Verbose, Info, Warn, Error)
- **Duration** — Total execution time from first to last log entry
- **Filterable table** — Filter by log level, by category, or search message text
- **Color-coded badges** — Each level has a distinct badge color
- **Responsive layout** — Works on any screen size

---

## Configuration

Key settings in `src/utils/Logger.ts`:

| Setting | Value | Changed Via |
|---------|-------|-------------|
| Log directory | `test-logs/` | `LOG_DIR` constant |
| HTML report path | `test-logs/test-report.html` | `HTML_REPORT_PATH` constant |
| Default log level | `debug` | `process.env.LOG_LEVEL` |
| File max size | 10 MB | `maxsize` in File transport |
| Max backup files | 5 | `maxFiles` in File transport |
| Console format | Colored with timestamp + category | Console transport `format` |

To change the log level at runtime:

```bash
LOG_LEVEL=warn npx playwright test    # Quiet — only warnings and errors
LOG_LEVEL=info npx playwright test    # Normal — info and above
LOG_LEVEL=debug npx playwright test   # Verbose (default)
LOG_LEVEL=silly npx playwright test   # Maximum verbosity
```

---

## Global Teardown Integration

**CRITICAL**: Winston loggers must be properly flushed before the process exits, otherwise:

- Buffered log entries may not be written to disk
- The HTML report will be incomplete or missing
- Playwright's own HTML reporter may time out

**Enable globalTeardown in `playwright.config.ts`:**

```typescript
export default defineConfig({
    globalTeardown: "./src/utils/setup/global-teardown.ts",
});
```

**What `Logger.shutdown()` does:**

```typescript
static async shutdown(): Promise<void> {
    const closePromises = Array.from(this.loggers.values()).map(
        (logger) =>
            new Promise<void>((resolve) => {
                logger.on("finish", resolve);
                logger.end();
            })
    );
    await Promise.all(closePromises);
}
```

This:
1. Waits for all Winston loggers to finish writing
2. Closes all file transports properly
3. Ensures all buffered log entries are flushed to disk before `generateHtmlReport()` runs

---

## Troubleshooting

**Logs not appearing in the file:**
- Ensure `test-logs/` directory is writable
- Check that `Logger.shutdown()` is called in globalTeardown before the process exits
- Verify `LOG_LEVEL` isn't set too high (e.g., `error` hides `info`/`debug`)
- Confirm `globalTeardown` is enabled in `playwright.config.ts`

**HTML report is empty or not generated:**
- `Logger.generateHtmlReport()` must be called after `Logger.shutdown()`
- The report is built from in-memory entries collected during the run
- Ensure globalTeardown is configured and running

**Steps not appearing in the Playwright HTML report:**
- `StepRunner.run()` requires an active Playwright test context (`test.step()` only works inside a test)
- Do not call `AdvancedActionsHelper` methods outside of a test body or fixture
- Ensure your test imports `test` from a fixture or from `@playwright/test`

**Playwright HTML report times out or hangs:**
- Ensure `Logger.shutdown()` is called **before** the process exits
- Never launch browsers in `globalTeardown` (causes hanging)

**Too many log entries:**
- Set `LOG_LEVEL=info` to hide debug-level noise
- Use the category filter in the HTML report to focus on one component
- Use `logger.debug()` for verbose data, `logger.info()` for key milestones only

**TypeScript errors about logger type:**
- Use `winston.Logger` as the type, not `Log4jsLogger`
- All imports should be `import winston from 'winston'`
- There should be no remaining references to `log4js` in the codebase

---

## Best Practices

1. **Always include test name in the category** — `Logger.getLogger(\`LoginPage-${testName}\`)` — for per-test filtering
2. **Use appropriate log levels:**
   - `info` for step start/success and important milestones
   - `debug` for detailed data (element state, input values, URLs)
   - `warn` for soft assertion failures and unexpected but recoverable situations
   - `error` for hard failures — action errors, failed assertions, screenshot errors
3. **Mask sensitive data** — use `actions.fill(locator, password, description, true)` to log `***MASKED***`
4. **Let StepRunner handle the Playwright report** — do not call `test.step()` directly; use `AdvancedActionsHelper` methods instead, which wrap every action automatically
5. **Call `Logger.shutdown()`** in globalTeardown before `generateHtmlReport()` — order matters
6. **Use consistent category naming** — follow the table in [Category Naming Conventions](#category-naming-conventions) for effective HTML report filtering
7. **Do not instantiate helpers outside tests** — `StepRunner.run()` calls `test.step()`, which requires an active Playwright test context

---

**Last Updated:** 2026-02-23
**Migration Status:** ✅ Winston migration complete
**StepRunner:** ✅ Integrated into AdvancedActionsHelper
