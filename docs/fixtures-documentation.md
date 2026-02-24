# Test Fixtures Documentation

**Comprehensive guide to all fixtures in the Playwright Test Automation Framework**

**Last Updated:** 2026-02-23

---

## Table of Contents

1. [Fixtures Overview](#fixtures-overview)
2. [Fixture Catalog](#fixture-catalog)
3. [Usage Analysis](#usage-analysis)
4. [DRY & SOLID Analysis](#dry--solid-analysis)
5. [Decision Matrix](#decision-matrix)

---

## Fixtures Overview

### What are Fixtures?

Fixtures are Playwright's dependency injection mechanism that provides:
- **Automatic setup/teardown** - Runs before and after each test
- **Reusable test dependencies** - Page managers, loggers
- **Test isolation** - Each test gets fresh instances
- **Composability** - Can combine multiple fixtures

### Fixture Lifecycle

```
┌─────────────────────────────────────────┐
│  SETUP (before test)                    │
│  • Create POM manager                   │
│  • Create Winston logger                │
│  • Log TEST START                       │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  TEST BODY EXECUTES                     │
│  (Your test code runs here)             │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  TEARDOWN (after test - ALWAYS runs)    │
│  • Log PASSED / FAILED / SKIPPED        │
│  • Log duration and error if failed     │
└─────────────────────────────────────────┘
```

### Location

All fixtures live in `tests/fixtures/`:

```
tests/fixtures/
├── pom-eager-fixture.ts    ← UI tests (eager page initialization)
├── pom-lazy-fixture.ts     ← UI tests (lazy page initialization)
└── api-test-fixture.ts     ← API tests
```

[↑ Back to top](#table-of-contents)

---

## Fixture Catalog

The framework provides **3 fixtures** serving different testing needs:

### 1. pom-eager-fixture.ts ⚡

**Location:** `tests/fixtures/pom-eager-fixture.ts`

**Purpose:** UI testing fixture with eager (upfront) page object initialization.

**Provides:**
```typescript
pomEagerFixture: {
    pomEager: POMEager,     // All page objects created immediately in constructor
    logger: winston.Logger  // Per-test Winston logger
}
```

**Key Features:**
- ✅ All page objects created immediately in the POMEager constructor
- ✅ Automatic lifecycle logging (TEST START, PASSED/FAILED/SKIPPED)
- ✅ Error message logged on failure
- ✅ Logger category follows convention: `Fixture-POMEager-{test_title}`

**When to Use:**
- Tests that use **multiple pages** (login → home → profile)
- Tests where initialization errors should surface **immediately**
- Tests where **most or all pages are likely to be used**

**Code Example:**
```typescript
import { test } from '../../fixtures/pom-eager-fixture';

test('valid login', async ({ pomEagerFixture }) => {
    const { pomEager } = pomEagerFixture;
    await pomEager.getLoginPage().navigateToLogin();
    await pomEager.getLoginPage().login('Admin', 'admin123');
    await pomEager.getHomePage().assertProfileIcon();
});
```

**Destructuring from beforeEach:**
```typescript
test.beforeEach(async ({ pomEagerFixture: { pomEager } }) => {
    await pomEager.getLoginPage().navigateToLogin();
});
```

**Used By:**
- ✅ `tests/ui/specs/login-with-POManagerEager.spec.ts`

**Pros:**
- ✅ Simple — no lazy loading complexity
- ✅ Immediate error detection during page object construction
- ✅ All pages ready to use from the first line of the test

**Cons:**
- ❌ Higher memory usage (all pages loaded even if unused)
- ❌ Slightly slower initialization for tests using only one page

---

### 2. pom-lazy-fixture.ts 🦥

**Location:** `tests/fixtures/pom-lazy-fixture.ts`

**Purpose:** UI testing fixture with lazy (on-demand) page object initialization.

**Provides:**
```typescript
pomLazyFixture: {
    pomLazy: POMLazy,       // Pages created only when their getter is first accessed
    logger: winston.Logger  // Per-test Winston logger
}
```

**Key Features:**
- ✅ Pages created **only when accessed** for the first time via their getter
- ✅ Memory efficient — only used pages are instantiated
- ✅ Automatic lifecycle logging (TEST START, PASSED/FAILED/SKIPPED)
- ✅ Logger category follows convention: `Fixture-POMLazy-{test_title}`

**When to Use:**
- Tests that use **only 1–2 pages**
- Tests where **faster initialization** is desired
- Tests that demonstrate lazy loading behaviour explicitly

**Code Example:**
```typescript
import { test } from '../../fixtures/pom-lazy-fixture';

test('login test', async ({ pomLazyFixture }) => {
    const { pomLazy } = pomLazyFixture;

    // LoginPage created here (first access)
    await pomLazy.loginPage.navigateToLogin();
    await pomLazy.loginPage.login('Admin', 'admin123');

    // HomePage created here (first access)
    await pomLazy.homePage.assertProfileIcon();

    // Any other pages remain un-created
});
```

**Used By:**
- ✅ `tests/ui/specs/login-with-POManagerLazy.spec.ts`
- ✅ `tests/ui/specs/login-with-helpers.spec.ts`
- ✅ `tests/ui/specs/login-with-DD.spec.ts`
- ✅ `tests/ui/specs/login-with-builder.spec.ts`

**Pros:**
- ✅ Memory efficient (only used pages loaded)
- ✅ Faster fixture initialization
- ✅ Suitable for the majority of tests

**Cons:**
- ❌ Errors in page object construction are deferred until first access
- ❌ Slightly more cognitive overhead (lazy evaluation)

---

### 3. api-test-fixture.ts 🌐

**Location:** `tests/fixtures/api-test-fixture.ts`

**Purpose:** API testing fixture with automatic request/response logging and assertion statistics.

**Provides:**
```typescript
apiTestFixture: {
    apiActions: AdvancedAPIHelper,      // Logged HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD)
    assert: AdvancedAssertionsHelper    // Logged assertions (screenshots disabled)
}
```

**Key Features:**
- ✅ **Automatic API request logging** — method, URL, description, body
- ✅ **Automatic response logging** — status, status text, response body (JSON/text)
- ✅ **Automatic assertion logging** — logged pass/fail for every assertion
- ✅ **API call summary** in teardown (total requests count)
- ✅ **Assertion statistics** in teardown (total, passed, failed)
- ✅ Screenshots **disabled** (no browser context in pure API tests)
- ✅ Created via `HelperFactory.createAPIHelpers()` for consistent instantiation
- ✅ Logger category: `Fixture-API-{test_title}`

**When to Use:**
- **API tests** that call REST endpoints directly via Playwright's `request` context
- Tests that need automatic request/response logging
- Tests that need logged assertions with pass/fail tracking

**Code Example:**
```typescript
import { test } from '../../fixtures/api-test-fixture';

test('Check get users response', async ({ apiTestFixture }) => {
    const { apiActions, assert } = apiTestFixture;

    const response = await apiActions.get(
        'https://jsonplaceholder.typicode.com/posts',
        'Fetch all posts'
    );
    const jsonResponse = await response.json();

    await assert.toEqual(response.status(), 200, 'Verify status is 200');
    await assert.toEqual(jsonResponse.length, 100, 'Verify 100 posts returned');
});
```

**Supported HTTP Methods:**
```typescript
await apiActions.get(url, description);
await apiActions.post(url, data, description);
await apiActions.put(url, data, description);
await apiActions.patch(url, data, description);
await apiActions.delete(url, description);
await apiActions.head(url, description);
```

**Teardown Logging Output:**
```log
▶ API TEST START: "Check get users response success response"
[Step 1] 🌐 API GET: Fetch all posts
  URL: https://jsonplaceholder.typicode.com/posts
  ✓ Response: 200 OK
Assertion #1 [HARD]: Verify status is 200
Assertion #1: Verify status is 200 - PASSED (2ms)
Assertion #2 [HARD]: Verify 100 posts returned
Assertion #2: Verify 100 posts returned - PASSED (1ms)
✅ API TEST PASSED: "Check get users response success response" (250ms)
Total API Requests: 1
Total Assertions: 2 (Passed: 2, Failed: 0)
```

**Mixed Usage (browser + API):**

Some tests in `network-interception.spec.ts` use both the `apiTestFixture` (for `assert`) and manually create `AdvancedActionsHelper` for browser interactions. This is intentional for tests that need both UI and API interaction:

```typescript
import { test } from '../../fixtures/api-test-fixture';
import { AdvancedActionsHelper } from '../../../src/utils/advanced-actions-helper';

test('mock api response', async ({ page, apiTestFixture }) => {
    const { assert } = apiTestFixture;
    const actions = new AdvancedActionsHelper(page, 'Mocking1: mock api response');
    // ...
});
```

**Used By:**
- ✅ `tests/api/specs/users-test.spec.ts`
- ✅ `tests/api/specs/network-interception.spec.ts`

**Pros:**
- ✅ Automatic API logging (no boilerplate)
- ✅ Automatic assertion logging
- ✅ Clean teardown summary
- ✅ Screenshots correctly disabled for API context

**Cons:**
- ❌ No page object abstraction (not applicable for pure API tests)

[↑ Back to top](#table-of-contents)

---

## Usage Analysis

### Fixture Usage by Test File

| Test File | Fixture Used | Fixture Key | Purpose |
|-----------|-------------|-------------|---------|
| `login-with-POManagerEager.spec.ts` | `pom-eager-fixture` | `pomEagerFixture` | Demonstrates POMEager — all pages created upfront |
| `login-with-POManagerLazy.spec.ts` | `pom-lazy-fixture` | `pomLazyFixture` | Demonstrates POMLazy — pages created on first access |
| `login-with-helpers.spec.ts` | `pom-lazy-fixture` | `pomLazyFixture` | Best-practice POM patterns and anti-patterns |
| `login-with-DD.spec.ts` | `pom-lazy-fixture` | `pomLazyFixture` | Data-driven login tests from JSON/TS data files |
| `login-with-builder.spec.ts` | `pom-lazy-fixture` | `pomLazyFixture` | Builder pattern test data creation |
| `users-test.spec.ts` | `api-test-fixture` | `apiTestFixture` | REST API tests with automatic logging |
| `network-interception.spec.ts` | `api-test-fixture` | `apiTestFixture` | Network mocking, interception, and request control |

### Observations

**✅ Good Practices:**
1. `login-with-POManagerEager.spec.ts` — Correctly uses eager for multi-page tests
2. `login-with-helpers.spec.ts`, `login-with-DD.spec.ts`, `login-with-builder.spec.ts` — Correctly use lazy (single or few pages)
3. `users-test.spec.ts` — Uses `apiTestFixture` for full API logging without POM overhead
4. All fixtures use `HelperFactory` for consistent helper creation

**Fixture Distribution:**
- **pom-eager-fixture**: 1 test file (multi-page flows)
- **pom-lazy-fixture**: 4 test files (majority of UI tests)
- **api-test-fixture**: 2 test files (all API tests)

[↑ Back to top](#table-of-contents)

---

## DRY & SOLID Analysis

### DRY (Don't Repeat Yourself)

#### ✅ Helper Instantiation — Consistent via HelperFactory

All fixtures delegate to `HelperFactory` for creating helpers:

```typescript
// api-test-fixture.ts
const { apiActions, assert } = HelperFactory.createAPIHelpers(request, page, testInfo.title);
```

This means if constructor signatures change, only `HelperFactory` needs updating.

#### ✅ Lifecycle Logging — Consistent Across All Fixtures

All three fixtures follow the same teardown logging pattern:

```typescript
if (testInfo.status === 'passed') {
    logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
} else if (testInfo.status === 'failed') {
    logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
    if (testInfo.error) logger.error(`   Error: ${testInfo.error.message}`);
} else if (testInfo.status === 'skipped') {
    logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
}
```

#### ✅ Page Objects Own Their Helpers

Page objects (`LoginPage`, `HomePage`) create their own `AdvancedActionsHelper` and `AdvancedAssertionsHelper` internally. Tests do not need to pass helpers around — they simply call page object methods:

```typescript
// Clean: tests call methods, not helpers
await pomLazy.loginPage.login('Admin', 'admin123');
await pomLazy.homePage.assertProfileIcon();
```

### SOLID Principles

#### ✅ Single Responsibility (SRP)

Each fixture has one responsibility:
- `pom-eager-fixture` → Eager POM lifecycle management
- `pom-lazy-fixture` → Lazy POM lifecycle management
- `api-test-fixture` → API helper lifecycle management

#### ✅ Open/Closed (OCP)

- Fixtures are open for extension (new fixtures can be created)
- `HelperFactory` allows extending helpers without modifying fixtures
- New page objects can be added to `POMEager`/`POMLazy` without fixture changes

#### ✅ Liskov Substitution (LSP)

Both UI fixtures (`pom-eager`, `pom-lazy`) can substitute for each other if a test works with the `POMLazy` or `POMEager` API respectively:

```typescript
// Both work identically from the test's perspective
import { test } from '../../fixtures/pom-eager-fixture';
// or
import { test } from '../../fixtures/pom-lazy-fixture';
```

#### ✅ Interface Segregation (ISP)

- UI fixtures provide only what UI tests need: POM manager + logger
- API fixture provides only what API tests need: apiActions + assert
- No fixture bundles unnecessary dependencies

#### ✅ Dependency Inversion (DIP)

All fixtures depend on abstractions (`HelperFactory`) rather than directly constructing concrete helper classes.

[↑ Back to top](#table-of-contents)

---

## Decision Matrix

**Which fixture should I use for my test?**

```
┌─────────────────────────────────────────────────────────────┐
│                  FIXTURE DECISION TREE                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────┐
        │   Is this a UI test or API test?  │
        └───────────────────────────────────┘
                 ↓                    ↓
               UI                    API
                 ↓                    ↓
    ┌────────────────────┐    ┌────────────────────┐
    │ How many pages?    │    │ api-test-fixture   │
    └────────────────────┘    └────────────────────┘
         ↓           ↓
    Multiple    1-2 pages
         ↓           ↓
    ┌──────────┐ ┌──────────┐
    │ pom-     │ │ pom-     │
    │ eager-   │ │ lazy-    │
    │ fixture  │ │ fixture  │
    └──────────┘ └──────────┘
```

[↑ Back to top](#table-of-contents)

---

## Summary

### Current State

**Total Fixtures:** 3

| Fixture | Location | Using HelperFactory? | Used By # Files | Status |
|---------|----------|---------------------|-----------------|--------|
| `pom-eager-fixture` | `tests/fixtures/` | ✅ Internally via POMEager | 1 | ✅ Good |
| `pom-lazy-fixture` | `tests/fixtures/` | ✅ Internally via POMLazy | 4 | ✅ Good |
| `api-test-fixture` | `tests/fixtures/` | ✅ Yes (createAPIHelpers) | 2 | ✅ Good |

### Key Design Decisions

1. **Fixtures provide POM manager + logger only** — helpers (actions/assert) live inside page objects, not at fixture level. This keeps fixtures lean and page objects self-contained.

2. **Separate UI and API fixtures** — clear separation of concerns, no POM overhead for API tests.

3. **All fixtures under `tests/fixtures/`** — co-located with test code, not mixed with `src/` framework utilities.

4. **HelperFactory used by API fixture** — consistent helper creation, screenshots disabled automatically for API context.

[↑ Back to top](#table-of-contents)

---

**Document Maintained By:** Test Automation Team
**Version:** 2.0
