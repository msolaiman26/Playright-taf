# Winston Logging Guide

This document explains the Winston logging integration in the Playwright Test Automation Framework, how it works, and how to use it across page objects, fixtures, helpers, and test specs.

---

## Table of Contents

- [Why Winston?](#why-winston)
- [Architecture](#architecture)
- [The Logger Utility](#the-logger-utility)
- [Output Channels](#output-channels)
  - [Console Transport](#console-transport)
  - [File Transport](#file-transport)
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
- [Global Teardown Integration](#global-teardown-integration)
- [Migration Summary (from log4js)](#migration-summary-from-log4js)
- [Troubleshooting](#troubleshooting)

---

## Why Winston?

The framework migrated from log4js to Winston for improved flexibility and modern Node.js ecosystem support:

| Feature | Winston Solution |
|---------|-----------------|
| Structured logging | JSON format support with custom transports |
| Log level filtering | Configurable levels: silly, debug, verbose, info, warn, error |
| Colored console output | Built-in colorize format |
| Centralized log management | Single `Logger.getLogger()` call, auto-configured |
| File rotation | 10MB max file size, keeps 5 rotated files |
| Searchable log dashboard | Interactive HTML report with filtering |
| Modern API | Better TypeScript support, active maintenance |

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
│  Static class that creates Winston loggers on demand.       │
│  Provides Logger.getLogger(category) factory method.        │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
    ┌────────────┐ ┌────────────┐ ┌──────────────────┐
    │  Console   │ │   File     │ │  HTML Collector   │
    │  Transport │ │  Transport │ │   Transport       │
    │  (colored) │ │  (rotating │ │  (in-memory,      │
    │            │ │   10MB)    │ │   generates HTML)  │
    └────────────┘ └────────────┘ └──────────────────┘
```

---

## The Logger Utility

Located at `src/utils/Logger.ts`, this is a static class that:

1. **Creates loggers on demand** via factory pattern
2. **Configures three transports** (console, file, HTML collector)
3. **Creates the `test-logs/` directory** if it doesn't exist
4. **Provides factory method** `Logger.getLogger(category)` that returns a `winston.Logger`

```typescript
import { Logger } from '../utils/Logger';
import winston from 'winston';

// Get a logger for a specific category
const logger: winston.Logger = Logger.getLogger('MyCategory');
```

The `category` parameter appears in every log line and can be used to filter logs in the HTML report. Use descriptive names like `LoginPage-testName` or `Actions-testName`.

---

## Output Channels

### Console Transport

Prints colored, timestamped log lines to the terminal:

```text
2026-02-15 10:30:45.123 [info] [LoginPage-valid_login] - Navigating to login page
2026-02-15 10:30:45.456 [debug] [LoginPage-valid_login] - Current URL: https://...
2026-02-15 10:30:46.789 [error] [Actions-valid_login] - Step 3: Click login - FAILED (500ms)
```

Format configuration:
```typescript
winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}] [${category}] - ${message}`;
    })
)
```

### File Transport

Writes to `test-logs/test-execution.log` using file rotation:

- **Max size**: 10MB per file
- **Rotation**: Keeps 5 old files (test-execution.log.1, .2, etc.)
- **Format**: Same as console but without color codes

```typescript
new winston.transports.File({
    filename: path.join(LOG_DIR, "test-execution.log"),
    maxsize: 10 * 1024 * 1024,  // 10MB
    maxFiles: 5,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] [${category}] - ${message}`;
        })
    )
})
```

### HTML Report Collector

A custom Winston transport that collects all log entries in memory for HTML report generation:

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

Call `Logger.generateHtmlReport()` in your global teardown to produce the report.

---

## Log Levels

Winston supports the following log levels (from least to most severe):

| Level | Winston Level | Usage | Example |
|-------|--------------|-------|---------|
| `silly` | 0 | Extremely detailed debug info | Rarely used |
| `debug` | 1 | Diagnostic details (element state, values, URLs) | `logger.debug("Input value: Admin")` |
| `verbose` | 2 | Detailed operational information | `logger.verbose("Page loaded")` |
| `info` | 3 | Normal flow events (navigation, actions, assertions passing) | `logger.info("Step 1: Navigate to login page")` |
| `warn` | 4 | Unexpected but non-fatal conditions | `logger.warn("Element took longer than expected")` |
| `error` | 5 | Failures (assertions, actions, screenshots) | `logger.error("Assertion failed: element not visible")` |

**Default level**: `debug` (shows DEBUG and above).

**Change via environment variable**:

```bash
LOG_LEVEL=info npx playwright test    # Only INFO and above
LOG_LEVEL=warn npx playwright test    # Only WARN and above
LOG_LEVEL=debug npx playwright test   # DEBUG and above (default)
LOG_LEVEL=silly npx playwright test   # Everything including SILLY
```

---

## Usage Patterns

### In Page Objects

Page objects should have a private `logger` property initialized in the constructor.

```typescript
import { Page, Locator } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import winston from 'winston';
import { Logger } from '../utils/Logger';

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

**Reference implementation**: See `src/pages/login-page.ts` for the current Winston implementation.

### In Helpers (Actions / Assertions)

The `AdvancedActionsHelper` and `AdvancedAssertionsHelper` use Winston internally. They create their own logger with a category like `Actions-testName` or `Assertions-testName`.

Every action method logs:
- `logger.info()` — step start and success
- `logger.debug()` — data details (input values, element state)
- `logger.error()` — failures with error details

Every assertion method logs:
- `logger.info()` — assertion start and PASSED result
- `logger.warn()` — soft assertion failures (SOFT_FAIL)
- `logger.error()` — hard assertion failures (FAILED)
- `logger.debug()` — expected values, screenshots saved

### In Fixtures

Fixtures create a logger to track test lifecycle events:

```typescript
import { Logger } from '../utils/Logger';
import winston from 'winston';

export const test = base.extend<{ myFixture: MyType }>({
    myFixture: async ({ page }, use, testInfo) => {
        const logger: winston.Logger = Logger.getLogger(`Fixture-${testInfo.title.replace(/\s+/g, '_')}`);

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
import winston from 'winston';

const logger: winston.Logger = Logger.getLogger('my-test-suite');

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

### In Utility Files

For standalone utility functions, create a module-level logger:

```typescript
import { Logger } from './Logger';
import winston from 'winston';

const logger: winston.Logger = Logger.getLogger('my-utility');

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

Call `Logger.generateHtmlReport()` in your global teardown (after all tests complete):

```typescript
// In global-teardown.ts
import { Logger } from '../Logger';

async function globalTeardown() {
    console.log("\n🧹 Running global teardown...");

    // Flush all Winston loggers
    console.log("📝 Flushing Winston loggers...");
    await Logger.shutdown();
    console.log("✅ Winston loggers flushed");

    // Generate the HTML log report
    console.log("📊 Generating HTML log report...");
    Logger.generateHtmlReport("Playwright Test Execution Report");
    console.log("✅ Global teardown completed\n");
}

export default globalTeardown;
```

The report is saved to `test-logs/test-report.html`.

### Features

The HTML report provides:

- **Stats cards** — Total logs, counts per level (Debug, Info, Warn, Error, Verbose)
- **Duration** — Total execution time from first to last log entry
- **Filterable table** — Search by message text, filter by log level, filter by category
- **Color-coded badges** — Each log level has a distinct badge color
- **Responsive layout** — Works on any screen size

---

## Configuration

The Logger utility is configured in `src/utils/Logger.ts`. Key settings:

| Setting | Value | Location |
|---------|-------|----------|
| Log directory | `test-logs/` | `LOG_DIR` constant |
| HTML report path | `test-logs/test-report.html` | `HTML_REPORT_PATH` constant |
| Default log level | `debug` | `process.env.LOG_LEVEL \|\| "debug"` |
| File max size | 10MB | File transport `maxsize` |
| Max backup files | 5 | File transport `maxFiles` |
| Console format | Colored with timestamp | Console transport `format` |

To change the log level at runtime:

```bash
# Show only warnings and above
LOG_LEVEL=warn npx playwright test

# Show everything including debug
LOG_LEVEL=debug npx playwright test

# Show all verbose details
LOG_LEVEL=silly npx playwright test
```

---

## Global Teardown Integration

**CRITICAL**: Winston loggers must be properly flushed before the test process exits, otherwise:
- Log entries may not be fully written to disk
- The HTML report won't be generated
- Playwright's HTML reporter may timeout

### Proper Setup

1. **Enable globalTeardown** in `playwright.config.ts`:

```typescript
export default defineConfig({
    // ...
    globalTeardown: "./src/utils/setup/global-teardown.ts",
});
```

2. **Implement proper teardown** in `global-teardown.ts`:

```typescript
import { Logger } from "../Logger";

async function globalTeardown() {
    console.log("\n🧹 Running global teardown...");

    // STEP 1: Flush all Winston loggers (REQUIRED!)
    console.log("📝 Flushing Winston loggers...");
    await Logger.shutdown();
    console.log("✅ Winston loggers flushed");

    // STEP 2: Generate HTML report
    console.log("📊 Generating HTML log report...");
    Logger.generateHtmlReport("Playwright Test Execution Report");
    console.log("✅ Global teardown completed\n");
}

export default globalTeardown;
```

### What `Logger.shutdown()` Does

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

This method:
1. Waits for all Winston loggers to finish writing
2. Closes all file transports properly
3. Ensures all buffered log entries are flushed to disk

---

## Migration Summary (from log4js)

The following changes were made to migrate from log4js to Winston:

### Type Changes

**Before (log4js):**
```typescript
import { Logger as Log4jsLogger } from 'log4js';
private readonly logger: Log4jsLogger;
```

**After (Winston):**
```typescript
import winston from 'winston';
private readonly logger: winston.Logger;
```

### Log Level Changes

| log4js Level | Winston Level |
|-------------|--------------|
| `trace` | `debug` or `silly` |
| `debug` | `debug` |
| `info` | `info` |
| `warn` | `warn` |
| `error` | `error` |
| `fatal` | `error` (Winston has no fatal) |

### Method Changes

- `logger.fatal()` → `logger.error()` (Winston doesn't have fatal level)
- All other methods remain the same: `.info()`, `.debug()`, `.warn()`, `.error()`

### Files Changed

**Core Infrastructure:**
- `src/utils/Logger.ts` — Completely rewritten for Winston
- `src/utils/advanced-actions-helper.ts` — Updated logger type, replaced `.fatal()` with `.error()`
- `src/utils/advanced-assertions-helper.ts` — Updated logger type
- `src/utils/advanced-api-helper.ts` — Updated logger type

**Page Objects:**
- `src/pages/login-page.ts` — Updated logger type
- `src/pages/home-page.ts` — Updated logger type
- `src/pages/pom-eager.ts` — Updated logger type
- `src/pages/pom-lazy.ts` — Fixed `LoginPage4js` references

**Global Setup:**
- `src/utils/setup/global-teardown.ts` — Added `Logger.shutdown()` and `Logger.generateHtmlReport()`
- `playwright.config.ts` — Enabled globalTeardown

---

## Troubleshooting

### Logs not appearing in the file

- Ensure `test-logs/` directory is writable
- Check that `Logger.shutdown()` is called in your globalTeardown (flushes pending writes)
- Verify `LOG_LEVEL` isn't set too high (e.g., `error` would hide info/debug)
- Check that globalTeardown is enabled in `playwright.config.ts`

### HTML report is empty or not generated

- `Logger.generateHtmlReport()` must be called after all tests complete
- Must be called in globalTeardown (after `Logger.shutdown()`)
- The report is generated from in-memory log entries
- Ensure globalTeardown is configured in `playwright.config.ts`

### Playwright HTML report times out or doesn't open

- This was the main issue during migration!
- Ensure `Logger.shutdown()` is called BEFORE the process exits
- Never launch browsers in globalTeardown (causes hanging)
- The shutdown process must complete cleanly

### Too many log entries

- Set `LOG_LEVEL=info` to hide debug-level noise
- Use category filtering in the HTML report to focus on specific components
- Consider using `logger.debug()` for verbose data and `logger.info()` for key events

### Logger not initialized error

- The Logger auto-initializes on first `getLogger()` call
- If you see initialization errors, check that `winston` is installed: `npm list winston`

### TypeScript errors about logger type

- Ensure you're using `winston.Logger` type, not `Log4jsLogger`
- Update all imports to `import winston from 'winston'`
- Check for any remaining references to `log4js` types

---

## Best Practices

1. **Always use category names** that include the test name for better traceability
2. **Use appropriate log levels**:
   - `info` for important actions and milestones
   - `debug` for detailed data and intermediate steps
   - `warn` for unexpected but recoverable situations
   - `error` for failures and exceptions
3. **Mask sensitive data** when logging (passwords, tokens, API keys)
4. **Call `Logger.shutdown()`** in globalTeardown to ensure clean exit
5. **Generate HTML report** in globalTeardown for comprehensive log analysis
6. **Use consistent category naming** for effective filtering

---

**Last Updated:** 2026-02-15
**Migration Status:** ✅ Complete
