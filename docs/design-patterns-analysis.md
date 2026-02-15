# Design Patterns Analysis & Recommendations

**Playwright Test Automation Framework**
**Analysis Date:** 2026-02-15
**Version:** Current (pw-log4js branch)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Currently Implemented Patterns](#currently-implemented-patterns)
3. [Recommended Patterns](#recommended-patterns)
4. [Pattern Comparison Matrix](#pattern-comparison-matrix)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document provides a comprehensive analysis of design patterns used in the Playwright test automation framework and recommends additional patterns to enhance maintainability, scalability, and code quality.

**Current State:**
- ✅ **10 major design patterns** already implemented
- ✅ Strong separation of concerns across layers
- ✅ Enterprise-grade logging and reporting
- ✅ Flexible fixture composition
- ✅ Comprehensive helper abstractions

**Recommendations:**
- 🎯 **8 additional patterns** to consider
- 🎯 Focus areas: Test data management, error handling, scalability
- 🎯 Priority: High-impact, low-effort improvements first

---

## Currently Implemented Patterns

### 1. Page Object Model (POM) Pattern ✅

**Purpose:** Encapsulate page-specific UI elements and interactions

**Implementation:**
```typescript
// src/pages/login-page.ts
export class LoginPage {
    private readonly logger: Log4jsLogger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    // Encapsulated locators (private/readonly)
    readonly usernameInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;

    // Public interface methods
    async login(username: string, password: string, isPasswordSensitive = true) {
        await this.actions.fill(this.usernameInput, username, 'Enter username');
        await this.actions.fill(this.passwordInput, password, 'Enter password', isPasswordSensitive);
        await this.actions.click(this.loginButton, 'Click login');
    }

    async assertInvalidLoginMessage() {
        await this.assert.toBeVisible(this.errorMessage, 'Error message visible');
    }
}
```

**Files:**
- `src/pages/login-page.ts`
- `src/pages/home-page.ts`
- `src/pages/login-page-log4js.ts`

**Benefits:**
- ✅ Tests don't access locators directly
- ✅ UI changes isolated to page objects
- ✅ Methods read like user stories
- ✅ Reusable across multiple tests

---

### 2. Manager Pattern (POM Manager) - Lazy & Eager Variants ✅

**Purpose:** Centralized management of multiple page objects with different initialization strategies

**Eager Implementation:**
```typescript
// src/pages/pom-eager.ts
export class POMEager {
    private readonly loginPage: LoginPage;
    private readonly homePage: HomePage;

    constructor(page: Page, testName: string) {
        this.logger.info("Initializing all page objects eagerly");
        // All pages created immediately
        this.loginPage = new LoginPage(page, testName);
        this.homePage = new HomePage(page, testName);
    }

    getLoginPage() { return this.loginPage; }
    getHomePage() { return this.homePage; }
}
```

**Lazy Implementation:**
```typescript
// src/pages/pom-lazy.ts
export class POMLazy {
    private _loginPage?: LoginPage4js;
    private _homePage?: HomePage;

    // Lazy initialization with caching
    get loginPage(): LoginPage4js {
        if (!this._loginPage) {
            this._loginPage = new LoginPage4js(this.page, this._testName);
        }
        return this._loginPage;
    }
}
```

**Trade-offs:**

| Aspect | Eager | Lazy |
|--------|-------|------|
| Memory | Higher (all pages loaded) | Lower (only used pages) |
| Performance | Upfront cost | On-demand cost |
| Code Complexity | Simpler | Requires null checks |
| Error Detection | Immediate | Delayed until access |
| Best For | Tests using most pages | Tests using few pages |

---

### 3. Fixture Pattern (Dependency Injection) ✅

**Purpose:** Automatic test setup/teardown and dependency injection

**Implementation:**
```typescript
// src/fixtures/pom-eager-fixture.ts
export const test = base.extend<{ pomEagerHelpers: POMEagerHelpers }>({
    pomEagerHelpers: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-POMEager-${testInfo.title}`);

        // ✅ Setup Phase
        logger.info(`▶ TEST START: "${testInfo.title}"`);
        const pomEager = new POMEager(page, testInfo.title);
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);

        // ✅ Test Execution
        await use({ pomEager, actions, assert });

        // ✅ Teardown Phase
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}"`);
        }
    }
});
```

**Fixture Variants:**
- `pom-eager-fixture.ts` - Full suite with eager initialization
- `pom-lazy-fixture.ts` - Full suite with lazy initialization
- `test-helpers-fixture.ts` - Helpers only (no POM)
- `test-fixtures.ts` - Combined logger + POMLazy + helpers

**Benefits:**
- ✅ No beforeEach/afterEach needed in tests
- ✅ Automatic lifecycle management
- ✅ Composable fixtures
- ✅ Consistent logging across tests

---

### 4. Helper/Wrapper Pattern ✅

**Purpose:** Wrap Playwright native methods with logging, error handling, and metrics

**AdvancedActionsHelper Implementation:**
```typescript
// src/utils/advanced-actions-helper.ts
export class AdvancedActionsHelper {
    private stepNumber = 0;
    private actionCounts = { clicks: 0, fills: 0, navigations: 0, ... };

    async click(locator: Locator, description: string) {
        this.stepNumber++;
        const startTime = Date.now();

        try {
            this.logger.info(`Step ${this.stepNumber}: ${description}`);
            await locator.click();
            this.actionCounts.clicks++;

            const duration = Date.now() - startTime;
            this.logger.debug(`✓ Completed in ${duration}ms`);
        } catch (error) {
            this.logger.error(`✗ Failed: ${error.message}`);
            await this.captureFailureScreenshot(description);
            throw error;
        }
    }

    getSummary() {
        return {
            totalSteps: this.stepNumber,
            ...this.actionCounts
        };
    }
}
```

**AdvancedAssertionsHelper Implementation:**
```typescript
// src/utils/advanced-assertions-helper.ts
export class AdvancedAssertionsHelper {
    private softAssertions: Array<{ description: string; error: Error }> = [];
    private assertionStats = { passed: 0, failed: 0, total: 0 };

    async toBeVisible(locator: Locator, description?: string, soft = false) {
        await this.handleAssertion(description || 'Assert visible', async () => {
            await expect(locator).toBeVisible();
        }, soft);
    }

    private async handleAssertion(description: string, assertionFn: () => Promise<void>, soft: boolean) {
        this.assertionStats.total++;
        try {
            this.logger.info(`Assertion: ${description}`);
            await assertionFn();
            this.assertionStats.passed++;
            this.logger.info(`✓ PASSED`);
        } catch (error) {
            this.assertionStats.failed++;
            if (soft) {
                this.softAssertions.push({ description, error });
                this.logger.warn(`⚠ SOFT_FAIL: ${description}`);
            } else {
                this.logger.error(`✗ FAILED: ${description}`);
                throw error;
            }
        }
    }

    async assertAllSoftAssertions() {
        if (this.softAssertions.length > 0) {
            const errors = this.softAssertions.map(a => `- ${a.description}: ${a.error.message}`).join('\n');
            this.logger.error(`${this.softAssertions.length} soft assertions failed:\n${errors}`);
            throw new Error(`${this.softAssertions.length} soft assertions failed`);
        }
    }
}
```

**Files:**
- `src/utils/advanced-actions-helper.ts`
- `src/utils/advanced-assertions-helper.ts`

**Benefits:**
- ✅ Automatic logging for every action
- ✅ Performance metrics
- ✅ Screenshot on failure
- ✅ Sensitive data masking
- ✅ Soft assertion support
- ✅ Summary statistics

---

### 5. Centralized Logging Pattern (Facade + Multi-Appender) ✅

**Purpose:** Unified logging with multiple output channels

**Implementation:**
```typescript
// src/utils/Logger.ts
export class Logger {
    private static loggers: Map<string, Log4jsLogger> = new Map();
    private static htmlCollector: LogEntry[] = [];

    static getLogger(category: string): Log4jsLogger {
        if (!this.loggers.has(category)) {
            log4js.configure({
                appenders: {
                    console: { type: 'console', layout: { type: 'colored' } },
                    file: {
                        type: 'dateFile',
                        filename: 'test-logs/test.log',
                        pattern: '-yyyy-MM-dd',
                        compress: true
                    },
                    htmlCollector: { type: { appender: this.collectLogs } }
                },
                categories: {
                    default: {
                        appenders: ['console', 'file', 'htmlCollector'],
                        level: process.env.LOG_LEVEL || 'debug'
                    }
                }
            });
            this.loggers.set(category, log4js.getLogger(category));
        }
        return this.loggers.get(category)!;
    }

    static generateHtmlReport() {
        // Generates interactive HTML dashboard with:
        // - Statistics cards (total, debug, info, warn, error, fatal counts)
        // - Filterable table (by level, category, search text)
        // - Responsive design with color-coded severity
    }
}
```

**Output Channels:**
1. **Console** - Colored real-time logs
2. **File** - Rolling daily logs (`test-logs/test-YYYY-MM-DD.log`)
3. **HTML** - Interactive report (`test-logs/test-report.html`)

**Log Levels:**
- `TRACE` - Finest-grained debugging
- `DEBUG` - Detailed data (response bodies, headers)
- `INFO` - Test flow steps
- `WARN` - Soft assertion failures
- `ERROR` - Hard assertion failures
- `FATAL` - Critical errors

**Category Naming Convention:**
- Page Objects: `PageName-testName` (e.g., `LoginPage-ValidLogin`)
- Helpers: `Actions-testName` or `Assertions-testName`
- Fixtures: `Fixture-Type-testName`
- Tests: `suite-name` (e.g., `users-api-test`)

**Benefits:**
- ✅ Single logger interface, multiple outputs
- ✅ Environment-configurable log level
- ✅ HTML report with filtering and search
- ✅ Daily log rotation
- ✅ Sensitive data masking

---

### 6. Endpoint Abstraction Pattern ✅

**Purpose:** Centralize API request logic, separate from tests

**Implementation:**
```typescript
// src/endpoints/users-endpoints.ts
const baseURL = 'https://jsonplaceholder.typicode.com';
const usersEndpoint = `${baseURL}/posts`;
const userParam = { id: '2' };
const requestBody = {
    title: 'foo',
    body: 'bar',
    userId: 1
};

async function getUsers(request: any) {
    return request.get(usersEndpoint);
}

async function getUser2(request: any) {
    return request.get(usersEndpoint, { params: userParam });
}

async function createUser(request: any) {
    return request.post(usersEndpoint, { data: requestBody });
}

export default { getUsers, getUser2, createUser };
```

**Test Usage:**
```typescript
// tests/api/specs/users-test.spec.ts
import usersRequest from '../../../src/endpoints/users-endpoints';

test('Verify API response', async ({ request }) => {
    const response = await usersRequest.getUsers(request);
    expect(response.status()).toBe(200);
});
```

**Benefits:**
- ✅ Single source of truth for endpoints
- ✅ Easy to update URLs/bodies
- ✅ Reusable across tests
- ✅ Centralized request configuration

---

### 7. Data-Driven Testing Pattern ✅

**Purpose:** Parameterized tests from external data sources

**Multi-Format Support:**

**TypeScript Data:**
```typescript
// src/data/test-users.ts
export default {
    username: 'Admin',
    password: 'admin123'
};
```

**JSON Data:**
```json
// src/data/test-users.json
{
    "username": "Admin",
    "password": "admin123"
}
```

**Array Data for Iteration:**
```typescript
// src/data/invalid-test-users.ts
export default [
    { username: "Admin", password: "wrongpwd", testType: "invalid password" },
    { username: "WrongUser", password: "admin123", testType: "invalid username" },
    { username: "", password: "", testType: "empty credentials" }
];
```

**Test Implementation:**
```typescript
// tests/ui/specs/login-with-DD.spec.ts
import invalidData from '../../../src/data/invalid-test-users';

invalidData.forEach(({ username, password, testType }) => {
    test(`Login fails for ${testType}`, async ({ pomEagerHelpers }) => {
        await pomEager.getLoginPage().login(username, password);
        await pomEager.getLoginPage().assertInvalidLoginMessage();
    });
});
// Generates 3 separate tests, one per data entry
```

**Benefits:**
- ✅ One test implementation → many test cases
- ✅ Non-technical users can add test data
- ✅ Supports TS (type-safe) and JSON (simple)
- ✅ Descriptive test names from data

---

### 8. Network Interception Pattern ✅

**Purpose:** Manipulate network traffic for testing edge cases

**Four Interception Strategies:**

**1. Response Capture (Passive):**
```typescript
const apiResponse = await page.waitForResponse(
    'https://example.com/api/employees?limit=50'
);
const data = await apiResponse.json();
// Use captured data for verification or subsequent requests
```

**2. Full Response Mocking:**
```typescript
await page.route('https://api.randomuser.me/?nat=us', async route => {
    await route.fulfill({
        body: JSON.stringify(mockData)  // From src/mocks/
    });
});
// Real API never called, mock data returned
```

**3. Response Modification:**
```typescript
await page.route('https://api.randomuser.me/?nat=us', async route => {
    const realResponse = await route.fetch();  // Fetch real data
    const json = await realResponse.json();
    json.results[0].name = 'Modified Name';    // Modify
    await route.fulfill({ body: JSON.stringify(json) });
});
```

**4. Request Blocking:**
```typescript
await page.route('**/*.{png,jpg,jpeg}', async route => {
    await route.abort();  // Block all images
});
// Faster tests, or test page behavior without resources
```

**Files:**
- `tests/api/specs/network-interception.spec.ts`
- `src/mocks/response-interception.json`

**Benefits:**
- ✅ Test without backend dependencies
- ✅ Simulate slow/failed responses
- ✅ Speed up tests (block images/ads)
- ✅ Test edge cases impossible with real API

---

### 9. Environment Configuration Pattern ✅

**Purpose:** Multi-environment support with centralized configuration

**Implementation:**

**URL Configuration:**
```typescript
// src/utils/urls.ts
export default {
    test: {
        ui: 'https://opensource-demo.orangehrmlive.com',
        api: 'https://jsonplaceholder.typicode.com'
    },
    staging: {
        ui: 'https://staging.example.com',
        api: 'https://api-staging.example.com'
    },
    production: {
        ui: 'https://production.example.com',
        api: 'https://api.example.com'
    }
};
```

**Environment-Aware Data:**
```typescript
// src/utils/setup/env-setup.ts
function getData() {
    const env = process.env.ENV || 'test';
    if (env === 'staging') return stagingData;
    else if (env === 'production') return prodData;
    else return testData;
}
```

**Playwright Config Integration:**
```typescript
// playwright.config.ts
export default defineConfig({
    use: {
        baseURL: urls[process.env.ENV || 'test'].ui
    }
});
```

**Usage:**
```bash
# Run tests against different environments
ENV=test npm run test        # Default
ENV=staging npm run test     # Staging
ENV=production npm run test  # Production
```

**Benefits:**
- ✅ Single codebase for all environments
- ✅ Centralized URL management
- ✅ Environment-specific credentials
- ✅ Easy to add new environments

---

### 10. Visual Regression Testing Pattern ✅

**Purpose:** Detect unintended UI changes

**Implementation:**
```typescript
// src/utils/ui-helper.ts
export async function performVisualCheck(page: Page, maxDiffRatio?: number) {
    const logger = Logger.getLogger('ui-helper');

    // Capture full-page screenshot
    const viewportSize = page.viewportSize();
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: viewportSize!.width, height: bodyHeight });

    // Compare against baseline (soft assertion)
    try {
        await expect(page).toHaveScreenshot({
            maxDiffPixelRatio: maxDiffRatio || 0.2
        });
        logger.info('✓ Visual regression check passed');
    } catch (error) {
        logger.warn(`⚠ Visual regression check failed: ${error.message}`);
    }

    // Restore viewport
    await page.setViewportSize(viewportSize!);
}
```

**Playwright Config:**
```typescript
// playwright.config.ts
export default defineConfig({
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.2,   // 20% tolerance
            threshold: 0.2
        }
    },
    snapshotDir: './visual-regression-baselines'
});
```

**Usage:**
```typescript
test('Homepage visual check', async ({ page }) => {
    await page.goto('/');
    await performVisualCheck(page, 0.1);  // 10% tolerance
});
```

**Benefits:**
- ✅ Detects CSS regressions
- ✅ Full-page comparison
- ✅ Configurable tolerance
- ✅ Diff images on failure
- ✅ Soft assertion (doesn't block test)

---

## Recommended Patterns

Based on the current implementation, here are additional patterns that would enhance the framework:

---

### 1. Builder Pattern 🎯 HIGH PRIORITY

**Purpose:** Simplify complex object creation (test data, API requests, page objects)

**Problem:**
Current test data creation can be verbose and error-prone:

```typescript
// Current approach - manual object creation
const user = {
    username: 'testuser',
    password: 'testpass',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    location: 'New York'
};
```

**Solution - Test Data Builder:**

```typescript
// src/builders/user-builder.ts
export class UserBuilder {
    private user: Partial<User> = {
        role: 'user',           // Defaults
        department: 'General',
        location: 'Remote'
    };

    withUsername(username: string): this {
        this.user.username = username;
        return this;
    }

    withPassword(password: string): this {
        this.user.password = password;
        return this;
    }

    withEmail(email: string): this {
        this.user.email = email;
        return this;
    }

    asAdmin(): this {
        this.user.role = 'admin';
        return this;
    }

    asSuperAdmin(): this {
        this.user.role = 'superadmin';
        this.user.department = 'IT';
        return this;
    }

    build(): User {
        // Validation
        if (!this.user.username || !this.user.password) {
            throw new Error('Username and password required');
        }
        return this.user as User;
    }
}
```

**Test Usage:**
```typescript
// Clean, readable, fluent API
const adminUser = new UserBuilder()
    .withUsername('admin')
    .withPassword('admin123')
    .withEmail('admin@example.com')
    .asAdmin()
    .build();

const testUser = new UserBuilder()
    .withUsername('testuser')
    .withPassword('testpass')
    .build();  // Uses defaults for optional fields
```

**API Request Builder:**
```typescript
// src/builders/api-request-builder.ts
export class ApiRequestBuilder {
    private config: RequestConfig = {
        method: 'GET',
        headers: {},
        params: {},
        data: {}
    };

    get(url: string): this {
        this.config.method = 'GET';
        this.config.url = url;
        return this;
    }

    post(url: string): this {
        this.config.method = 'POST';
        this.config.url = url;
        return this;
    }

    withAuth(token: string): this {
        this.config.headers['Authorization'] = `Bearer ${token}`;
        return this;
    }

    withBody(data: any): this {
        this.config.data = data;
        return this;
    }

    withQueryParams(params: object): this {
        this.config.params = params;
        return this;
    }

    async execute(request: any) {
        return request[this.config.method.toLowerCase()](
            this.config.url,
            {
                data: this.config.data,
                params: this.config.params,
                headers: this.config.headers
            }
        );
    }
}

// Usage in tests
const response = await new ApiRequestBuilder()
    .post('/users')
    .withAuth(authToken)
    .withBody({ name: 'John' })
    .execute(request);
```

**Benefits:**
- ✅ Fluent, readable API
- ✅ Default values for optional fields
- ✅ Validation at build time
- ✅ Reusable across tests
- ✅ Easy to extend with new fields

**Implementation Files:**
- `src/builders/user-builder.ts`
- `src/builders/api-request-builder.ts`
- `src/builders/test-data-builder.ts`

---

### 2. Repository Pattern 🎯 HIGH PRIORITY

**Purpose:** Abstract test data storage and retrieval

**Problem:**
Current approach mixes data location concerns with test logic:

```typescript
// Current - direct imports from multiple sources
import testUsers from '../../../src/data/test-users';
import invalidUsers from '../../../src/data/invalid-test-users';
```

**Solution - Data Repository:**

```typescript
// src/repositories/user-repository.ts
export class UserRepository {
    private static testUsers: Map<string, User> = new Map();

    static {
        // Load data from multiple sources
        this.loadFromJson('../data/test-users.json');
        this.loadFromDatabase();  // Future: DB integration
        this.loadFromAPI();       // Future: API integration
    }

    static getValidUser(): User {
        return this.testUsers.get('valid-admin')!;
    }

    static getInvalidUsers(): User[] {
        return Array.from(this.testUsers.values())
            .filter(u => u.type === 'invalid');
    }

    static getUserByRole(role: string): User {
        return Array.from(this.testUsers.values())
            .find(u => u.role === role)!;
    }

    static createUser(user: User): void {
        this.testUsers.set(user.id, user);
    }

    // Query builder methods
    static query(): UserQuery {
        return new UserQuery(Array.from(this.testUsers.values()));
    }
}

class UserQuery {
    constructor(private users: User[]) {}

    whereRole(role: string): this {
        this.users = this.users.filter(u => u.role === role);
        return this;
    }

    whereDepartment(dept: string): this {
        this.users = this.users.filter(u => u.department === dept);
        return this;
    }

    first(): User {
        return this.users[0];
    }

    all(): User[] {
        return this.users;
    }
}
```

**Test Usage:**
```typescript
// Clean, expressive queries
const adminUser = UserRepository.getValidUser();
const invalidUsers = UserRepository.getInvalidUsers();
const itAdmins = UserRepository.query()
    .whereRole('admin')
    .whereDepartment('IT')
    .all();
```

**Benefits:**
- ✅ Single source of truth for data access
- ✅ Easy to switch data sources (JSON → DB → API)
- ✅ Queryable interface
- ✅ Centralized data management
- ✅ Can add caching layer

---

### 3. Strategy Pattern 🎯 MEDIUM PRIORITY

**Purpose:** Encapsulate different algorithms/behaviors that can be swapped at runtime

**Use Case 1: Browser-Specific Behavior**

**Problem:**
Different browsers have different quirks that need special handling:

```typescript
// Current - if/else scattered across tests
if (browserName === 'firefox') {
    await page.waitForTimeout(1000);  // Firefox needs extra wait
}
await element.click();
```

**Solution - Browser Strategy:**

```typescript
// src/strategies/browser-strategy.ts
interface BrowserStrategy {
    click(locator: Locator): Promise<void>;
    fillInput(locator: Locator, value: string): Promise<void>;
    handleFileUpload(locator: Locator, filePath: string): Promise<void>;
}

class ChromiumStrategy implements BrowserStrategy {
    async click(locator: Locator) {
        await locator.click();
    }

    async fillInput(locator: Locator, value: string) {
        await locator.fill(value);
    }

    async handleFileUpload(locator: Locator, filePath: string) {
        await locator.setInputFiles(filePath);
    }
}

class FirefoxStrategy implements BrowserStrategy {
    async click(locator: Locator) {
        // Firefox quirk: needs visibility check before click
        await locator.waitFor({ state: 'visible' });
        await locator.click({ force: true });
    }

    async fillInput(locator: Locator, value: string) {
        // Firefox quirk: clear before fill
        await locator.clear();
        await locator.fill(value);
    }

    async handleFileUpload(locator: Locator, filePath: string) {
        // Firefox needs manual trigger
        await locator.evaluate(el => el.click());
        await locator.setInputFiles(filePath);
    }
}

class WebKitStrategy implements BrowserStrategy {
    async click(locator: Locator) {
        // Safari quirk: scroll into view first
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
    }

    async fillInput(locator: Locator, value: string) {
        await locator.fill(value);
    }

    async handleFileUpload(locator: Locator, filePath: string) {
        await locator.setInputFiles(filePath);
    }
}

// Factory to select strategy
export class BrowserStrategyFactory {
    static getStrategy(browserName: string): BrowserStrategy {
        switch (browserName) {
            case 'chromium': return new ChromiumStrategy();
            case 'firefox': return new FirefoxStrategy();
            case 'webkit': return new WebKitStrategy();
            default: return new ChromiumStrategy();
        }
    }
}
```

**Integration with AdvancedActionsHelper:**
```typescript
// src/utils/advanced-actions-helper.ts
export class AdvancedActionsHelper {
    private browserStrategy: BrowserStrategy;

    constructor(page: Page, testName: string, browserName: string) {
        this.browserStrategy = BrowserStrategyFactory.getStrategy(browserName);
    }

    async click(locator: Locator, description: string) {
        this.logger.info(`Step ${++this.stepNumber}: ${description}`);
        await this.browserStrategy.click(locator);  // Delegates to strategy
    }
}
```

**Use Case 2: Assertion Strategy (Retry vs Immediate)**

```typescript
// src/strategies/assertion-strategy.ts
interface AssertionStrategy {
    execute(assertion: () => Promise<void>): Promise<void>;
}

class ImmediateAssertionStrategy implements AssertionStrategy {
    async execute(assertion: () => Promise<void>) {
        await assertion();  // Fails immediately
    }
}

class RetryAssertionStrategy implements AssertionStrategy {
    constructor(private maxRetries = 3, private delayMs = 1000) {}

    async execute(assertion: () => Promise<void>) {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                await assertion();
                return;  // Success
            } catch (error) {
                if (i === this.maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }
    }
}

// Usage in tests
const assertHelper = new AdvancedAssertionsHelper(page, testName);
assertHelper.setStrategy(new RetryAssertionStrategy(5, 2000));  // Flaky elements
```

**Benefits:**
- ✅ Encapsulates browser-specific logic
- ✅ Easy to add new browsers
- ✅ Swappable at runtime
- ✅ Single responsibility (each strategy handles one browser)

---

### 4. Decorator Pattern 🎯 MEDIUM PRIORITY

**Purpose:** Add functionality to actions/assertions without modifying core classes

**Problem:**
Want to add retry logic, performance monitoring, or screenshots to specific actions without cluttering the base class:

**Solution - Action Decorators:**

```typescript
// src/decorators/action-decorators.ts

// Base interface
interface Action {
    execute(): Promise<void>;
}

// Concrete action
class ClickAction implements Action {
    constructor(private locator: Locator) {}

    async execute() {
        await this.locator.click();
    }
}

// Decorator 1: Retry
class RetryDecorator implements Action {
    constructor(
        private action: Action,
        private maxRetries = 3
    ) {}

    async execute() {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                await this.action.execute();
                return;
            } catch (error) {
                if (i === this.maxRetries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
}

// Decorator 2: Performance Monitoring
class PerformanceDecorator implements Action {
    constructor(
        private action: Action,
        private logger: Log4jsLogger
    ) {}

    async execute() {
        const start = performance.now();
        await this.action.execute();
        const duration = performance.now() - start;

        if (duration > 5000) {
            this.logger.warn(`Slow action detected: ${duration}ms`);
        }
    }
}

// Decorator 3: Screenshot Before/After
class ScreenshotDecorator implements Action {
    constructor(
        private action: Action,
        private page: Page,
        private actionName: string
    ) {}

    async execute() {
        await this.page.screenshot({ path: `before-${this.actionName}.png` });
        await this.action.execute();
        await this.page.screenshot({ path: `after-${this.actionName}.png` });
    }
}

// Usage - stack decorators
const action = new ClickAction(loginButton);
const decoratedAction = new RetryDecorator(
    new PerformanceDecorator(
        new ScreenshotDecorator(action, page, 'login-click'),
        logger
    ),
    5  // max retries
);
await decoratedAction.execute();
```

**Practical Integration:**
```typescript
// src/utils/advanced-actions-helper.ts
export class AdvancedActionsHelper {
    async clickWithRetry(locator: Locator, description: string, maxRetries = 3) {
        const action = new RetryDecorator(
            new ClickAction(locator),
            maxRetries
        );
        await action.execute();
    }

    async criticalClick(locator: Locator, description: string) {
        // Critical action: retry + performance monitoring + screenshot
        const action = new RetryDecorator(
            new PerformanceDecorator(
                new ScreenshotDecorator(
                    new ClickAction(locator),
                    this.page,
                    description
                ),
                this.logger
            ),
            5
        );
        await action.execute();
    }
}
```

**Benefits:**
- ✅ Add functionality without changing base classes
- ✅ Composable (stack multiple decorators)
- ✅ Single responsibility
- ✅ Open/closed principle (open for extension, closed for modification)

---

### 5. Factory Pattern 🎯 MEDIUM PRIORITY

**Purpose:** Centralize object creation logic

**Problem:**
Page object instantiation repeated across fixtures:

```typescript
// Repeated in multiple fixtures
const loginPage = new LoginPage(page, testName);
const homePage = new HomePage(page, testName);
```

**Solution - Page Object Factory:**

```typescript
// src/factories/page-factory.ts
export class PageFactory {
    static createLoginPage(page: Page, testName: string): LoginPage {
        return new LoginPage(page, testName);
    }

    static createHomePage(page: Page, testName: string): HomePage {
        return new HomePage(page, testName);
    }

    static createPageByType<T>(
        pageType: new (page: Page, testName: string) => T,
        page: Page,
        testName: string
    ): T {
        return new pageType(page, testName);
    }

    // Create multiple pages at once
    static createAllPages(page: Page, testName: string) {
        return {
            loginPage: this.createLoginPage(page, testName),
            homePage: this.createHomePage(page, testName)
        };
    }
}

// Usage
const { loginPage, homePage } = PageFactory.createAllPages(page, testName);
const customPage = PageFactory.createPageByType(CustomPage, page, testName);
```

**Helper Factory:**
```typescript
// src/factories/helper-factory.ts
export class HelperFactory {
    static createActionHelper(page: Page, testName: string, config?: ActionConfig) {
        return new AdvancedActionsHelper(page, testName, config);
    }

    static createAssertHelper(page: Page, testName: string, config?: AssertConfig) {
        return new AdvancedAssertionsHelper(page, testName, config);
    }

    static createHelpers(page: Page, testName: string) {
        return {
            actions: this.createActionHelper(page, testName),
            assert: this.createAssertHelper(page, testName)
        };
    }
}
```

**Benefits:**
- ✅ Centralized instantiation logic
- ✅ Easy to add pre/post-creation hooks
- ✅ Consistent object creation
- ✅ Can add caching/pooling

---

### 6. Chain of Responsibility Pattern 🎯 LOW PRIORITY

**Purpose:** Pass requests through a chain of handlers until one handles it

**Use Case: Error Handling Chain**

```typescript
// src/handlers/error-handler-chain.ts
abstract class ErrorHandler {
    private nextHandler?: ErrorHandler;

    setNext(handler: ErrorHandler): ErrorHandler {
        this.nextHandler = handler;
        return handler;
    }

    async handle(error: Error, context: TestContext): Promise<void> {
        if (await this.canHandle(error)) {
            await this.process(error, context);
        } else if (this.nextHandler) {
            await this.nextHandler.handle(error, context);
        } else {
            throw error;  // No handler found
        }
    }

    abstract canHandle(error: Error): Promise<boolean>;
    abstract process(error: Error, context: TestContext): Promise<void>;
}

// Handler 1: Network Errors
class NetworkErrorHandler extends ErrorHandler {
    async canHandle(error: Error): Promise<boolean> {
        return error.message.includes('net::ERR') ||
               error.message.includes('Network');
    }

    async process(error: Error, context: TestContext): Promise<void> {
        context.logger.warn('Network error detected, retrying...');
        await context.page.reload();
        await context.retryAction();
    }
}

// Handler 2: Timeout Errors
class TimeoutErrorHandler extends ErrorHandler {
    async canHandle(error: Error): Promise<boolean> {
        return error.message.includes('timeout') ||
               error.message.includes('Timeout');
    }

    async process(error: Error, context: TestContext): Promise<void> {
        context.logger.warn('Timeout detected, waiting and retrying...');
        await context.page.waitForLoadState('networkidle');
        await context.retryAction();
    }
}

// Handler 3: Element Not Found
class ElementNotFoundHandler extends ErrorHandler {
    async canHandle(error: Error): Promise<boolean> {
        return error.message.includes('element') &&
               error.message.includes('not found');
    }

    async process(error: Error, context: TestContext): Promise<void> {
        context.logger.warn('Element not found, scrolling and retrying...');
        await context.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await context.page.waitForTimeout(1000);
        await context.retryAction();
    }
}

// Build the chain
const errorChain = new NetworkErrorHandler();
errorChain
    .setNext(new TimeoutErrorHandler())
    .setNext(new ElementNotFoundHandler());

// Usage in AdvancedActionsHelper
try {
    await locator.click();
} catch (error) {
    await errorChain.handle(error, { page, logger, retryAction: () => locator.click() });
}
```

**Benefits:**
- ✅ Flexible error handling
- ✅ Easy to add new handlers
- ✅ Handlers are independent
- ✅ Automatic retry for recoverable errors

---

### 7. Observer Pattern (Event-Driven Testing) 🎯 LOW PRIORITY

**Purpose:** Notify subscribers when test events occur

**Use Case: Test Event Notifications**

```typescript
// src/observers/test-observer.ts
interface TestEvent {
    type: 'START' | 'PASS' | 'FAIL' | 'SKIP';
    testName: string;
    timestamp: Date;
    duration?: number;
    error?: Error;
}

interface TestObserver {
    onTestEvent(event: TestEvent): Promise<void>;
}

class TestEventManager {
    private observers: TestObserver[] = [];

    subscribe(observer: TestObserver): void {
        this.observers.push(observer);
    }

    async notify(event: TestEvent): Promise<void> {
        for (const observer of this.observers) {
            await observer.onTestEvent(event);
        }
    }
}

// Observer 1: Slack Notifications
class SlackNotifier implements TestObserver {
    async onTestEvent(event: TestEvent) {
        if (event.type === 'FAIL') {
            await this.sendSlackMessage({
                channel: '#test-failures',
                text: `❌ Test failed: ${event.testName}\nError: ${event.error?.message}`
            });
        }
    }
}

// Observer 2: Metrics Collector
class MetricsCollector implements TestObserver {
    private metrics: Map<string, number> = new Map();

    async onTestEvent(event: TestEvent) {
        const key = `${event.type}_count`;
        this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

        if (event.type === 'PASS' && event.duration) {
            this.recordDuration(event.testName, event.duration);
        }
    }
}

// Observer 3: Screenshot on Failure
class FailureScreenshotObserver implements TestObserver {
    constructor(private page: Page) {}

    async onTestEvent(event: TestEvent) {
        if (event.type === 'FAIL') {
            await this.page.screenshot({
                path: `failures/${event.testName}-${Date.now()}.png`
            });
        }
    }
}

// Integration in fixtures
const eventManager = new TestEventManager();
eventManager.subscribe(new SlackNotifier());
eventManager.subscribe(new MetricsCollector());
eventManager.subscribe(new FailureScreenshotObserver(page));

// Notify on events
await eventManager.notify({ type: 'START', testName, timestamp: new Date() });
// ... test execution ...
await eventManager.notify({ type: 'PASS', testName, timestamp: new Date(), duration: 1500 });
```

**Benefits:**
- ✅ Decouple test execution from notifications
- ✅ Easy to add new observers
- ✅ Multiple actions on single event
- ✅ Can be enabled/disabled per environment

---

### 8. Template Method Pattern 🎯 LOW PRIORITY

**Purpose:** Define skeleton of algorithm, let subclasses override specific steps

**Use Case: Base Test Class**

```typescript
// src/base/base-test.ts
export abstract class BaseTest {
    protected page: Page;
    protected logger: Log4jsLogger;

    async runTest() {
        await this.beforeTest();
        try {
            await this.executeTest();  // Abstract - implemented by subclass
            await this.afterTestSuccess();
        } catch (error) {
            await this.afterTestFailure(error);
            throw error;
        } finally {
            await this.afterTest();
        }
    }

    // Template methods with default implementations
    protected async beforeTest() {
        this.logger.info('Test starting...');
    }

    protected async afterTest() {
        this.logger.info('Test cleanup...');
    }

    protected async afterTestSuccess() {
        this.logger.info('✓ Test passed');
    }

    protected async afterTestFailure(error: Error) {
        this.logger.error(`✗ Test failed: ${error.message}`);
        await this.page.screenshot({ path: `failures/${this.testName}.png` });
    }

    // Abstract method - must be implemented
    protected abstract executeTest(): Promise<void>;
}

// Concrete implementation
class LoginTest extends BaseTest {
    protected async executeTest() {
        const loginPage = new LoginPage(this.page);
        await loginPage.navigateToLogin();
        await loginPage.login('Admin', 'admin123');
        // Custom test logic
    }

    // Override if needed
    protected async afterTestSuccess() {
        await super.afterTestSuccess();
        // Custom success logic
        await this.sendSuccessNotification();
    }
}
```

**Benefits:**
- ✅ Consistent test structure
- ✅ Reusable setup/teardown
- ✅ Override only what you need
- ✅ Enforces test lifecycle

---

## Pattern Comparison Matrix

| Pattern | Priority | Complexity | Impact | Effort | Best For |
|---------|----------|------------|--------|--------|----------|
| **Builder** | 🔴 HIGH | Low | High | Low | Complex test data, API requests |
| **Repository** | 🔴 HIGH | Medium | High | Medium | Centralized data management |
| **Strategy** | 🟡 MEDIUM | Medium | Medium | Medium | Browser-specific logic, swappable algorithms |
| **Decorator** | 🟡 MEDIUM | Medium | Medium | Medium | Adding behavior to actions/assertions |
| **Factory** | 🟡 MEDIUM | Low | Medium | Low | Centralized object creation |
| **Chain of Responsibility** | 🟢 LOW | High | Low | High | Complex error handling |
| **Observer** | 🟢 LOW | Medium | Low | Medium | Event notifications, metrics |
| **Template Method** | 🟢 LOW | Low | Low | Low | Test base classes |

**Priority Legend:**
- 🔴 **HIGH** - Immediate value, low effort
- 🟡 **MEDIUM** - Good value, moderate effort
- 🟢 **LOW** - Nice to have, higher effort or lower impact

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)

**Goal:** Add high-value, low-effort patterns

1. **Builder Pattern** - `src/builders/user-builder.ts`
   - Start with `UserBuilder` for test data
   - Estimated effort: 4 hours
   - Impact: Immediately improves test readability

2. **Factory Pattern** - `src/factories/page-factory.ts`
   - Centralize page object creation
   - Refactor existing fixtures to use factory
   - Estimated effort: 3 hours
   - Impact: Reduces duplication in fixtures

### Phase 2: Data Management (Week 2)

**Goal:** Centralize and improve test data handling

3. **Repository Pattern** - `src/repositories/user-repository.ts`
   - Create `UserRepository` for user data
   - Create `ApiDataRepository` for API test data
   - Estimated effort: 6 hours
   - Impact: Single source of truth for test data

4. **Expand Builder Pattern**
   - Add `ApiRequestBuilder` for API tests
   - Add `TestDataBuilder` for complex scenarios
   - Estimated effort: 4 hours

### Phase 3: Behavioral Flexibility (Week 3)

**Goal:** Add runtime flexibility for different scenarios

5. **Strategy Pattern** - `src/strategies/browser-strategy.ts`
   - Implement browser-specific strategies
   - Integrate with `AdvancedActionsHelper`
   - Estimated effort: 8 hours
   - Impact: Cleaner browser-specific logic

6. **Decorator Pattern** - `src/decorators/action-decorators.ts`
   - Create retry, performance, screenshot decorators
   - Add convenience methods to helpers
   - Estimated effort: 6 hours
   - Impact: Flexible action enhancement

### Phase 4: Advanced Features (Week 4+)

**Goal:** Add sophisticated patterns for complex scenarios

7. **Chain of Responsibility** - `src/handlers/error-handler-chain.ts`
   - Implement error handler chain
   - Integrate with helpers
   - Estimated effort: 8 hours
   - Impact: Intelligent error recovery

8. **Observer Pattern** - `src/observers/test-observer.ts`
   - Implement event system
   - Add Slack/Teams notifier
   - Add metrics collector
   - Estimated effort: 10 hours
   - Impact: Better monitoring and notifications

---

## Summary

### Current Strengths ✅

The framework already implements **10 solid design patterns**:
1. ✅ Page Object Model - Clean UI abstraction
2. ✅ Manager Pattern - Centralized page management
3. ✅ Fixture Pattern - Dependency injection
4. ✅ Helper/Wrapper - Enhanced actions/assertions
5. ✅ Centralized Logging - Multi-channel logging
6. ✅ Endpoint Abstraction - API request centralization
7. ✅ Data-Driven Testing - Parameterized tests
8. ✅ Network Interception - API mocking/modification
9. ✅ Environment Configuration - Multi-env support
10. ✅ Visual Regression - Screenshot comparison

### Recommended Additions 🎯

**High Priority (Immediate Value):**
1. 🔴 **Builder Pattern** - Simplify complex object creation
2. 🔴 **Repository Pattern** - Centralize data management

**Medium Priority (Good ROI):**
3. 🟡 **Strategy Pattern** - Browser-specific behaviors
4. 🟡 **Decorator Pattern** - Flexible action enhancement
5. 🟡 **Factory Pattern** - Centralized instantiation

**Low Priority (Nice to Have):**
6. 🟢 **Chain of Responsibility** - Advanced error handling
7. 🟢 **Observer Pattern** - Event notifications
8. 🟢 **Template Method** - Base test classes

### Next Steps

1. **Review** this document with the team
2. **Prioritize** patterns based on current pain points
3. **Start with Phase 1** (Builder + Factory) - quick wins
4. **Iterate** - add patterns incrementally, validate value
5. **Document** - update this guide as patterns are implemented

---

**Document Version:** 1.0
**Last Updated:** 2026-02-15
**Maintained By:** Test Automation Team
