# log4js Logging Guide

This document explains the log4js logging integration in the Playwright Test Automation Framework, how it works, and how to use it across page objects, fixtures, helpers, and test specs.

---

## Table of Contents

- [Why log4js?](#why-log4js)
- [Architecture](#architecture)
- [The Logger Utility](#the-logger-utility)
- [Output Channels](#output-channels)
  - [Console Appender](#console-appender)
  - [File Appender](#file-appender)
  - [HTML Report Collector](#html-report-collector)
- [Log Levels](#log-levels)
- [Usage Patterns](#usage-patterns)
  - [In Page Objects](#in-page-objects)
  - [In Helpers (Actions / Assertions)](#in-helpers-actions--assertions)
  - [In Fixtures](#in-fixtures)
  - [In Test Specs](#in-test-specs)
  - [In Utility Files](#in-utility-files)
- [Category Naming Conventions](#category-naming-conventions)
- [HTML Report](#html-report)
  - [Generating the Report](#generating-the-report)
  - [Features](#features)
- [Configuration](#configuration)
- [Migration Summary (from manual logging)](#migration-summary-from-manual-logging)
- [Troubleshooting](#troubleshooting)

---

## Why log4js?

The framework previously used a manual logging approach:

- `console.log()` for console output
- `fs.appendFileSync()` to write per-test log files
- Manual timestamp formatting and log level tagging

This had several drawbacks:

| Problem | log4js Solution |
|---------|----------------|
| Separate log file per test per helper (file bloat) | Single rolling daily log file with all categories |
| No log level filtering | Configurable levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL |
| No colored console output | Colored pattern layout with timestamps |
| No centralized log management | Single `Logger.getLogger()` call, auto-configured |
| Manual file/directory creation | log4js handles file rotation and directory creation |
| No searchable log dashboard | Interactive HTML report with filtering |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Page Objects / Helpers / Fixtures / Test Specs              │
│                                                             │
│  this.logger = Logger.getLogger("CategoryName");            │
│  this.logger.info("message");                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Logger Utility (src/utils/Logger.ts)                        │
│                                                             │
│  Static class that wraps log4js.configure() on first use.   │
│  Provides Logger.getLogger(category) factory method.        │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
    ┌────────────┐ ┌────────────┐ ┌──────────────────┐
    │  Console   │ │   File     │ │  HTML Collector   │
    │  Appender  │ │  Appender  │ │   Appender        │
    │  (colored) │ │  (daily    │ │  (in-memory,      │
    │            │ │   rolling) │ │   generates HTML)  │
    └────────────┘ └────────────┘ └──────────────────┘
```

---

## The Logger Utility

Located at `src/utils/Logger.ts`, this is a static class that:

1. **Auto-initializes** on first `getLogger()` call (lazy singleton pattern)
2. **Configures three appenders** (console, file, HTML collector)
3. **Creates the `test-logs/` directory** if it doesn't exist
4. **Provides factory method** `Logger.getLogger(category)` that returns a `log4js.Logger`

```typescript
import { Logger } from '../utils/Logger';
import { Logger as Log4jsLogger } from 'log4js';

// Get a logger for a specific category
const logger: Log4jsLogger = Logger.getLogger('MyCategory');
```

The `category` parameter appears in every log line and can be used to filter logs in the HTML report. Use descriptive names like `LoginPage-testName` or `Actions-testName`.

---

## Output Channels

### Console Appender

Prints colored, timestamped log lines to the terminal:

```text
2025-01-15 10:30:45.123 [INFO] [LoginPage-valid_login] - Navigating to login page
2025-01-15 10:30:45.456 [DEBUG] [LoginPage-valid_login] - Current URL: https://...
2025-01-15 10:30:46.789 [ERROR] [Actions-valid_login] - Step 3: Click login - FAILED (500ms)
```

Pattern: `%[%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] [%c] - %m%]`

- `%d` — timestamp
- `%p` — log level (INFO, DEBUG, etc.)
- `%c` — category name
- `%m` — message
- `%[...%]` — color markers (auto-colored by level)

### File Appender

Writes to `test-logs/test-execution.log` using a daily rotating strategy:

- **Rotation**: New file each day (pattern: `yyyy-MM-dd`)
- **Backups**: Keeps 5 previous log files
- **Format**: Same as console but without color codes

The file appender uses the `dateFile` type, so log files are named:
- `test-execution.log` (current day)
- `test-execution.log.2025-01-14` (previous day)
- etc.

### HTML Report Collector

A custom in-memory appender that collects all log entries for HTML report generation. Each entry stores:

- `timestamp` — ISO string
- `level` — DEBUG, INFO, WARN, ERROR, FATAL
- `category` — Logger category name
- `message` — The log message

Call `Logger.generateHtmlReport()` in your global teardown to produce the report.

---

## Log Levels

From least to most severe:

| Level | Usage | Example |
|-------|-------|---------|
| `TRACE` | Very detailed diagnostic info | Rarely used in tests |
| `DEBUG` | Diagnostic details (element state, values, URLs) | `logger.debug("Input value: Admin")` |
| `INFO` | Normal flow events (navigation, actions, assertions passing) | `logger.info("Step 1: Navigate to login page")` |
| `WARN` | Unexpected but non-fatal conditions | `logger.warn("Element took longer than expected")` |
| `ERROR` | Failures (assertions, actions, screenshots) | `logger.error("Assertion failed: element not visible")` |
| `FATAL` | Critical failures that abort the test | `logger.fatal("Page crashed during navigation")` |

**Default level**: `debug` (shows DEBUG and above).

**Change via environment variable**:

```bash
LOG_LEVEL=info npx playwright test    # Only INFO and above
LOG_LEVEL=warn npx playwright test    # Only WARN and above
LOG_LEVEL=trace npx playwright test   # Everything including TRACE
```

---

## Usage Patterns

### In Page Objects

Page objects should have a private `logger` property initialized in the constructor.

```typescript
import { Page, Locator } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { Logger as Log4jsLogger } from 'log4js';
import { Logger } from '../utils/Logger';

export class LoginPage {
    readonly page: Page;
    private readonly logger: Log4jsLogger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.logger = Logger.getLogger(`LoginPage-${testName}`);
        this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
        this.assert = new AdvancedAssertionsHelper(page, `${testName}-assertions`);
        // ... locators
    }

    async navigateToLogin() {
        this.logger.info("Navigating to login page");
        await this.actions.goto('https://example.com/', 'Navigate to login');
        this.logger.debug(`Current URL: ${this.page.url()}`);
    }

    async login(username: string, password: string) {
        this.logger.debug("Filling username field");
        await this.actions.fill(this.usernameInput, username, 'Enter username');
        this.logger.debug("Filling password field");
        await this.actions.fill(this.passwordInput, password, 'Enter password', true);
        this.logger.debug("Clicking login button");
        await this.actions.click(this.loginButton, 'Click login button');
    }
}
```

**Reference implementation**: See `src/pages/login-page-log4js.ts` for the original log4js page object.

### In Helpers (Actions / Assertions)

The `AdvancedActionsHelper` and `AdvancedAssertionsHelper` use log4js internally. They create their own logger with a category like `Actions-testName` or `Assertions-testName`.

Every action method logs:
- `logger.info()` — step start and success
- `logger.debug()` — data details (input values, element state)
- `logger.error()` — failures with error details
- `logger.fatal()` — critical navigation failures

Every assertion method logs:
- `logger.info()` — assertion start and PASSED result
- `logger.warn()` — soft assertion failures (SOFT_FAIL)
- `logger.error()` — hard assertion failures (FAILED)
- `logger.debug()` — expected values, screenshots saved

### In Fixtures

Fixtures create a logger to track test lifecycle events:

```typescript
import { Logger } from '../utils/Logger';

export const test = base.extend<{ myFixture: MyType }>({
    myFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-${testInfo.title.replace(/\s+/g, '_')}`);

        logger.info(`▶ TEST START: "${testInfo.title}"`);
        logger.debug(`  File: ${testInfo.file}`);

        await use(/* fixture value */);

        // Teardown
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
            if (testInfo.error) {
                logger.error(`   Error: ${testInfo.error.message}`);
            }
        } else if (testInfo.status === 'skipped') {
            logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
        }
    }
});
```

### In Test Specs

For test files that need logging in hooks or test bodies, create a module-level logger:

```typescript
import { test } from '../../../src/fixtures/pom-eager-fixture';
import { Logger } from '../../../src/utils/Logger';

const logger = Logger.getLogger('my-test-suite');

test.beforeAll(async () => {
    logger.info('Suite setup starting');
});

test.afterEach(async ({}, testInfo) => {
    logger.info(`Test "${testInfo.title}" completed`);
});

test('my test', async ({ pomEagerHelpers }) => {
    logger.info('Starting test');
    // ... test code
});
```

If using the `test-fixtures.ts` fixture, a `logger` fixture is automatically provided:

```typescript
import { test } from '../../../src/fixtures/test-fixtures';

test('my test', async ({ logger, pomLazy }) => {
    logger.info('Starting test');  // Logger already named after the test
    await pomLazy.loginPage.navigateToLogin();
});
```

### In Utility Files

For standalone utility functions, create a module-level logger:

```typescript
import { Logger } from './Logger';

const logger = Logger.getLogger('my-utility');

function doSomething() {
    logger.info('Doing something');
    // ...
    logger.debug('Details: ...');
}
```

---

## Category Naming Conventions

Consistent category names make log filtering effective:

| Component | Pattern | Example |
|-----------|---------|---------|
| Page Object | `PageName-testName` | `LoginPage-valid_login` |
| Actions Helper | `Actions-testName` | `Actions-valid_login-actions` |
| Assertions Helper | `Assertions-testName` | `Assertions-valid_login-assertions` |
| POM Manager | `POMEager-testName` or `POMLazy` | `POMEager-valid_login` |
| Fixture | `Fixture-Type-testName` | `Fixture-POMEager-valid_login` |
| Test Spec | `suite-name` | `login-with-POManagerEager` |
| Utility | `utility-name` | `lighthouse-helper`, `env-setup` |

---

## HTML Report

### Generating the Report

Call `Logger.generateHtmlReport()` in your global teardown or at the end of your test suite:

```typescript
// In global-teardown.ts or afterAll hook:
import { Logger } from '../utils/Logger';

Logger.generateHtmlReport('My Test Execution Report');
await Logger.shutdown();  // Flush pending logs
```

The report is saved to `test-logs/test-report.html`.

### Features

The HTML report provides:

- **Stats cards** — Total logs, counts per level (Debug, Info, Warn, Error, Fatal)
- **Duration** — Total execution time from first to last log entry
- **Filterable table** — Search by message text, filter by log level, filter by category
- **Color-coded badges** — Each log level has a distinct badge color
- **Responsive layout** — Works on any screen size

---

## Configuration

The Logger utility is configured in `src/utils/Logger.ts`. Key settings:

| Setting | Value | Location |
|---------|-------|----------|
| Log directory | `test-logs/` | `Logger.LOG_DIR` |
| HTML report path | `test-logs/test-report.html` | `Logger.HTML_REPORT_PATH` |
| Default log level | `debug` | `process.env.LOG_LEVEL \|\| "debug"` |
| File rotation pattern | Daily (`yyyy-MM-dd`) | `file` appender config |
| Max backup files | 5 | `numBackups: 5` |
| Console pattern | `%[%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] [%c] - %m%]` | `console` appender layout |

To change the log level at runtime:

```bash
# Show only warnings and above
LOG_LEVEL=warn npx playwright test

# Show everything including trace
LOG_LEVEL=trace npx playwright test
```

---

## Migration Summary (from manual logging)

The following changes were made to migrate from manual `console.log` + `fs.appendFileSync` to log4js:

### What was removed

- `writeToLogFile()` methods and `fs.appendFileSync` calls
- `logFilePath` properties and per-test log file creation
- `ensureDirectoryExists()` for log file directories (kept only for screenshots)
- `log()` methods with custom level strings (`ACTION`, `SUCCESS`, `FAILED`, `DATA`)
- `console.log()` and `console.error()` calls in all files

### What was added

- `import { Logger as Log4jsLogger } from 'log4js'` — type for the logger instance
- `import { Logger } from '../utils/Logger'` — the static wrapper class
- `private readonly logger: Log4jsLogger` — property in classes
- `this.logger = Logger.getLogger('Category-name')` — initialization in constructors
- `this.logger.info()`, `.debug()`, `.warn()`, `.error()`, `.fatal()` — log calls

### Level mapping

| Old Pattern | New log4js Level |
|-------------|-----------------|
| `console.log()` / `log('ACTION', ...)` / `log('SUCCESS', ...)` | `logger.info()` |
| `log('DATA', ...)` | `logger.debug()` |
| `log('SOFT_FAIL', ...)` | `logger.warn()` |
| `console.error()` / `log('FAILED', ...)` | `logger.error()` |
| Critical navigation failures | `logger.fatal()` |

### Files changed

**Core Infrastructure:**
- `src/utils/advanced-actions-helper.ts` — Replaced manual logging with log4js
- `src/utils/advanced-assertions-helper.ts` — Replaced manual logging with log4js

**Page Objects:**
- `src/pages/login-page.ts` — Added logger property and log calls
- `src/pages/home-page.ts` — Added logger property and log calls
- `src/pages/pom-eager.ts` — Added logger property and log calls

**Fixtures:**
- `src/fixtures/pom-eager-fixture.ts` — Replaced `console.log` with log4js
- `src/fixtures/pom-lazy-fixture.ts` — Replaced `console.log` with log4js
- `src/fixtures/test-helpers-fixture.ts` — Added log4js lifecycle logging
- `tests/ui/fixtures/login-fixture.ts` — Replaced `console.log` with log4js

**Test Specs:**
- `tests/ui/specs/login-with-POManagerEager.spec.ts` — Replaced `console.log`
- `tests/ui/specs/login-with-POManagerLazy.spec.ts` — Replaced `console.log`
- `tests/ui/specs/login-with-DD.spec.ts` — Replaced `console.log`
- `tests/api/specs/users-test.spec.ts` — Replaced `console.log`
- `tests/api/specs/network-interception.spec.ts` — Replaced `console.log`

**Utilities:**
- `src/utils/ui-helper.ts` — Replaced `console.log`/`console.error`
- `src/utils/lighthouse-helper.ts` — Replaced `console.log`/`console.error`
- `src/utils/setup/env-setup.ts` — Replaced `console.log`

---

## Troubleshooting

### Logs not appearing in the file

- Ensure `test-logs/` directory is writable
- Check that `Logger.shutdown()` is called in your teardown (flushes pending writes)
- Verify `LOG_LEVEL` isn't set too high (e.g., `error` would hide info/debug)

### HTML report is empty

- `Logger.generateHtmlReport()` must be called after all tests complete
- The report is generated from in-memory log entries, so it must be called in the same process
- Ensure tests are not running in parallel across separate processes (each worker gets its own memory)

### Too many log entries

- Set `LOG_LEVEL=info` to hide debug-level noise
- Use category filtering in the HTML report to focus on specific components
- Consider using `logger.debug()` for verbose data and `logger.info()` for key events

### Logger not initialized error

- The Logger auto-initializes on first `getLogger()` call. If you see initialization errors, check that `log4js` is installed: `npm list log4js`
