# Test Fixtures Documentation

**Comprehensive guide to all fixtures in the Playwright Test Automation Framework**

**Last Updated:** 2026-02-15

---

## Table of Contents

1. [Fixtures Overview](#fixtures-overview)
2. [Fixture Catalog](#fixture-catalog)
3. [Usage Analysis](#usage-analysis)
4. [DRY & SOLID Analysis](#dry--solid-analysis)
5. [Recommendations](#recommendations)
6. [Migration Guide](#migration-guide)
7. [Decision Matrix](#decision-matrix)

---

## Fixtures Overview

### What are Fixtures?

Fixtures are Playwright's dependency injection mechanism that provides:
- **Automatic setup/teardown** - Runs before and after each test
- **Reusable test dependencies** - Page objects, helpers, loggers
- **Test isolation** - Each test gets fresh instances
- **Composability** - Can combine multiple fixtures

### Fixture Lifecycle

```
┌─────────────────────────────────────────┐
│  SETUP (before test)                    │
│  • Create objects                       │
│  • Initialize resources                 │
│  • Start logging                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  TEST BODY EXECUTES                     │
│  (Your test code runs here)             │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  TEARDOWN (after test - ALWAYS runs)    │
│  • Log test results                     │
│  • Capture failure artifacts            │
│  • Clean up resources                   │
└─────────────────────────────────────────┘
```

---

## Fixture Catalog

The framework provides **5 fixtures** serving different testing needs:

### 1. pom-eager-fixture.ts ⚡ (MOST USED)

**Location:** `src/fixtures/pom-eager-fixture.ts`

**Purpose:** Full-featured fixture with eager page initialization

**Provides:**
```typescript
{
    pomEager: POMEager,           // All pages created upfront
    actions: AdvancedActionsHelper,
    assert: AdvancedAssertionsHelper
}
```

**Key Features:**
- ✅ All page objects created immediately during fixture setup
- ✅ Automatic lifecycle logging (TEST START, PASSED/FAILED)
- ✅ Uses HelperFactory for consistent helper creation
- ✅ Error logging with error messages

**When to Use:**
- Tests that use **multiple pages** (login → home → profile)
- Tests where initialization errors should surface **immediately**
- Tests where **all pages are likely to be used**

**Code Example:**
```typescript
import { test } from '../../../src/fixtures/pom-eager-fixture';

test('Complete user flow', async ({ pomEagerHelpers }) => {
    const { pomEager, actions, assert } = pomEagerHelpers;

    // All pages already created and ready
    await pomEager.getLoginPage().navigateToLogin();
    await pomEager.getLoginPage().login('Admin', 'admin123');
    await pomEager.getHomePage().assertProfileIcon();
    // Use more pages as needed...
});
```

**Used By:**
- ✅ `tests/ui/specs/login-with-POManagerEager.spec.ts`
- ✅ `tests/ui/specs/login-with-DD.spec.ts`
- ✅ `tests/ui/specs/login-with-builder.spec.ts`
- ✅ `tests/api/specs/network-interception.spec.ts`

**Pros:**
- ✅ Simple - no lazy loading complexity
- ✅ Immediate error detection
- ✅ All pages ready to use

**Cons:**
- ❌ Higher memory usage (all pages loaded even if unused)
- ❌ Slower initialization for tests using few pages

---

### 2. pom-lazy-fixture.ts 🦥

**Location:** `src/fixtures/pom-lazy-fixture.ts`

**Purpose:** Memory-efficient fixture with lazy page initialization

**Provides:**
```typescript
{
    pomLazy: POMLazy,              // Pages created on first access
    actions: AdvancedActionsHelper,
    assert: AdvancedAssertionsHelper
}
```

**Key Features:**
- ✅ Pages created **only when accessed** (on-demand)
- ✅ Memory efficient - only used pages are instantiated
- ✅ Automatic lifecycle logging
- ✅ Uses HelperFactory for consistent helper creation

**When to Use:**
- Tests that use **only 1-2 pages**
- Tests where **memory efficiency** is important
- Tests where **faster initialization** is desired

**Code Example:**
```typescript
import { test } from '../../../src/fixtures/pom-lazy-fixture';

test('Simple login test', async ({ pomLazyHelpers }) => {
    const { pomLazy, actions, assert } = pomLazyHelpers;

    // LoginPage created here (first access)
    await pomLazy.loginPage.navigateToLogin();
    await pomLazy.loginPage.login('Admin', 'admin123');

    // HomePage created here (first access)
    await pomLazy.homePage.assertProfileIcon();

    // Other pages never created (not accessed)
});
```

**Used By:**
- ✅ `tests/ui/specs/login-with-POManagerLazy.spec.ts`
- ✅ `tests/ui/specs/login-test-with-helpers.spec.ts`

**Pros:**
- ✅ Memory efficient (only used pages loaded)
- ✅ Faster initialization
- ✅ Good for tests using few pages

**Cons:**
- ❌ Slightly more complex (lazy loading logic)
- ❌ Errors delayed until page accessed

---

### 3. test-helpers-fixture.ts 🛠️

**Location:** `src/fixtures/test-helpers-fixture.ts`

**Purpose:** Minimal fixture providing only action and assertion helpers (no POM)

**Provides:**
```typescript
{
    actions: AdvancedActionsHelper,
    assert: AdvancedAssertionsHelper
}
```

**Key Features:**
- ✅ Lightweight - no page object overhead
- ✅ Direct page interaction via Playwright Page object
- ✅ Automatic lifecycle logging
- ✅ Uses HelperFactory for consistent helper creation

**When to Use:**
- Tests that **don't need POM** (e.g., API tests, simple checks)
- Tests that interact with pages **directly**
- Tests that need **logged actions/assertions only**

**Code Example:**
```typescript
import { test } from '../../../src/fixtures/test-helpers-fixture';

test('Direct page interaction', async ({ page, testHelpers }) => {
    const { actions, assert } = testHelpers;

    // Direct page interaction (no POM)
    await actions.goto('https://example.com');
    await actions.click(page.locator('#login'), 'Click login button');
    await assert.toBeVisible(page.locator('.error'), 'Error message visible');
});
```

**Used By:**
- ❌ **Currently NOT used** by any tests (available for future use)

**Pros:**
- ✅ Minimal overhead
- ✅ Good for simple tests
- ✅ No POM dependency

**Cons:**
- ❌ No page object abstraction
- ❌ Tests couple to page structure

---

### 4. test-fixtures.ts 🔧

**Location:** `src/fixtures/test-fixtures.ts`

**Purpose:** Modular fixture providing logger, POMLazy, and helpers as **separate fixtures**

**Provides:**
```typescript
{
    logger: Log4jsLogger,          // Can be used independently
    pomLazy: POMLazy,              // Can be used independently
    actions: AdvancedActionsHelper, // Can be used independently
    assert: AdvancedAssertionsHelper // Can be used independently
}
```

**Key Features:**
- ✅ **Granular fixtures** - use only what you need
- ✅ Separate logger fixture for flexibility
- ✅ Detailed file/project logging
- ✅ Uses HelperFactory for actions/assert

**When to Use:**
- Tests that need **only the logger**
- Tests that need **only specific helpers**
- Tests that want **maximum flexibility**

**Code Example:**
```typescript
import { test } from '../../../src/fixtures/test-fixtures';

// Use only logger
test('Log-only test', async ({ page, logger }) => {
    logger.info('Custom logging without POM or helpers');
    await page.goto('https://example.com');
    logger.info('Navigation complete');
});

// Use logger + pomLazy
test('POM test', async ({ page, logger, pomLazy }) => {
    logger.info('Starting test with POMLazy');
    await pomLazy.loginPage.navigateToLogin();
});

// Use all fixtures
test('Full test', async ({ page, logger, pomLazy, actions, assert }) => {
    logger.info('Full feature test');
    await pomLazy.loginPage.navigateToLogin();
    await actions.click(pomLazy.loginPage.loginButton, 'Click login');
});
```

**Used By:**
- ✅ `tests/ui/specs/login-helpers-log4js.spec.ts`

**Pros:**
- ✅ Maximum flexibility (use only what you need)
- ✅ Granular control
- ✅ Separate logger access

**Cons:**
- ❌ More verbose (need to import multiple fixtures)
- ❌ Can lead to inconsistent usage

---

### 5. login-fixture.ts 🔐 (DOMAIN-SPECIFIC)

**Location:** `tests/ui/fixtures/login-fixture.ts`

**Purpose:** Custom fixture tailored **specifically for login tests**

**Provides:**
```typescript
{
    pomEager: POMEager,            // Pre-navigated to login page
    loginPage: LoginPage,          // Standalone LoginPage
    actions: AdvancedActionsHelper,
    assert: AdvancedAssertionsHelper // With assertion stats logging
}
```

**Key Features:**
- ✅ **Auto-navigates** to login page in setup
- ✅ Provides standalone `loginPage` for direct access
- ✅ Logs **assertion statistics** in teardown
- ⚠️ **Does NOT use HelperFactory** (manual instantiation)

**When to Use:**
- **Login-specific tests only**
- Tests that always start on the login page
- Tests that need assertion statistics

**Code Example:**
```typescript
import { test } from '../fixtures/login-fixture';

test('Login test with auto-navigation', async ({ pomEager, loginPage, actions, assert }) => {
    // Already on login page (auto-navigated in fixture)
    await loginPage.login('Admin', 'admin123');
    await pomEager.getHomePage().assertProfileIcon();

    // Teardown automatically logs:
    // Total Assertions: 5 (Passed: 5, Failed: 0)
});
```

**Used By:**
- ✅ `tests/ui/specs/login-with-fixture.spec.ts`

**Pros:**
- ✅ Eliminates navigation boilerplate for login tests
- ✅ Provides assertion statistics
- ✅ Domain-specific (focused on login tests)

**Cons:**
- ❌ **NOT using HelperFactory** (inconsistent with other fixtures)
- ❌ Limited to login-related tests only
- ❌ Manual helper instantiation (harder to maintain)

---

## Usage Analysis

### Fixture Usage by Test File

| Test File | Fixture Used | Pages Used | Justification |
|-----------|-------------|------------|---------------|
| `login-with-POManagerEager.spec.ts` | pom-eager-fixture | Login, Home | ✅ Multiple pages, eager is appropriate |
| `login-with-POManagerLazy.spec.ts` | pom-lazy-fixture | Login, Home | ✅ Demonstrates lazy loading pattern |
| `login-test-with-helpers.spec.ts` | pom-lazy-fixture | Login | ✅ Only login page, lazy is efficient |
| `login-with-DD.spec.ts` | pom-lazy-fixture | Login (mostly) | ✅ Optimized to use lazy loading |
| `login-with-builder.spec.ts` | pom-lazy-fixture | Login (mostly) | ✅ Optimized to use lazy loading |
| `login-helpers-log4js.spec.ts` | test-fixtures | Login, Home | ✅ Demonstrates granular fixture usage |
| `login-with-fixture.spec.ts` | login-fixture | Login | ✅ Now using HelperFactory for consistency |
| `network-interception.spec.ts` | test-helpers-fixture | None (API test) | ✅ Optimized for API testing |
| `users-test.spec.ts` | test-helpers-fixture | None (API test) | ✅ Using test-helpers for lifecycle logging |

### Observations

**✅ Good Practices:**
1. `login-with-POManagerEager.spec.ts` - Correctly uses eager for multi-page tests
2. `login-test-with-helpers.spec.ts` - Correctly uses lazy for single-page tests
3. `test-helpers-fixture` now properly utilized by API tests (2 tests using it)
4. All fixtures now consistently use HelperFactory pattern
5. Fixture selection optimized based on actual page usage

**✅ Recent Improvements:**
1. ✅ **login-fixture** refactored to use HelperFactory
2. ✅ **network-interception.spec.ts** migrated to test-helpers-fixture
3. ✅ **users-test.spec.ts** now uses test-helpers-fixture
4. ✅ **login-with-DD.spec.ts** and **login-with-builder.spec.ts** optimized to use pom-lazy

---

## DRY & SOLID Analysis

### DRY (Don't Repeat Yourself) Violations

#### ✅ Problem 1: Helper Instantiation Duplication — RESOLVED

**Previously (login-fixture.ts VIOLATION):**
```typescript
// Manual instantiation (NOT DRY)
const actions = new AdvancedActionsHelper(page, testInfo.title);
const assert = new AdvancedAssertionsHelper(page, testInfo.title);
```

**Now (ALL fixtures including login-fixture - CORRECT):**
```typescript
// Using HelperFactory (DRY)
const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);
```

**Impact:** If helper constructor signature changes, login-fixture breaks while others don't.

**Recommendation:** ✅ **Refactor login-fixture to use HelperFactory**

---

#### ❌ Problem 2: Fixture Overlap

**Overlap between fixtures:**

```typescript
// pom-eager-fixture provides:
{ pomEager, actions, assert }

// test-fixtures provides (separately):
{ logger, pomLazy, actions, assert }

// login-fixture provides:
{ pomEager, loginPage, actions, assert }
```

All three provide `actions` and `assert` but in different ways.

**Impact:** Inconsistent helper creation across fixtures.

**Recommendation:** ✅ **All fixtures should use HelperFactory**

---

#### ✅ Problem 3: Page Objects Helper Instantiation — RESOLVED (2026-02-15)

**Previously (Page Objects VIOLATION):**

All page objects were manually instantiating helpers:

```typescript
// HomePage.ts - Manual instantiation (NOT DRY)
this.actions = new AdvancedActionsHelper(page, testName || 'HomePage');
this.assert = new AdvancedAssertionsHelper(page, testName || 'HomePage');

// LoginPage.ts - Manual instantiation (NOT DRY)
this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
this.assert = new AdvancedAssertionsHelper(page, `${testName}-assertions`);

// LoginPage4js.ts - Manual instantiation (NOT DRY)
this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
this.assert = new AdvancedAssertionsHelper(page, `${testName}-assertions`);
```

**Now (ALL Page Objects - CORRECT):**

```typescript
// All page objects now use HelperFactory (DRY)
const helpers = HelperFactory.createHelpers(page, testName);
this.actions = helpers.actions;
this.assert = helpers.assert;
```

**Files Refactored:**
- ✅ `src/pages/home-page.ts`
- ✅ `src/pages/login-page.ts`
- ✅ `src/pages/login-page-log4js.ts`

**Impact:**
- **Before**: 3 page objects with manual instantiation = 6 lines of duplicated code
- **After**: 3 page objects using HelperFactory = Single source of truth
- **Benefit**: If helper constructor changes, only HelperFactory needs updating

**Recommendation:** ✅ **COMPLETED - All page objects now use HelperFactory**

---

#### 📚 Best Practice: Type-Only Imports

**Why do we need both helper imports AND HelperFactory?**

Page objects import helper classes in two ways, serving different purposes:

```typescript
// Type-only imports (compile-time - for TypeScript type checking)
import type { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import type { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

// Runtime import (for creating instances)
import { HelperFactory } from '../factories/helper-factory';

export class LoginPage {
    // These type annotations need the type imports above
    readonly actions: AdvancedActionsHelper;   // ← Type annotation
    readonly assert: AdvancedAssertionsHelper;  // ← Type annotation

    constructor(page: Page, testName: string) {
        // This runtime code uses HelperFactory
        const helpers = HelperFactory.createHelpers(page, testName);
        this.actions = helpers.actions;  // ← Runtime value
        this.assert = helpers.assert;    // ← Runtime value
    }
}
```

**Two Different Purposes:**

1. **Type-only imports** (`import type`):
   - Used for TypeScript type annotations
   - Provide IntelliSense/autocomplete
   - Enable compile-time type checking
   - **Erased at runtime** (no JavaScript code generated)

2. **Runtime imports** (regular `import`):
   - Used to create actual instances
   - Needed for function calls at runtime
   - Included in compiled JavaScript

**Why use `import type`?**

✅ **Makes intent explicit**: Clearly shows "this is just for types, not runtime"
✅ **Better tree-shaking**: Bundlers know these can be safely removed
✅ **Clearer code**: Separates compile-time concerns from runtime concerns
✅ **Prevents circular dependencies**: Type-only imports don't create runtime cycles

**Alternative Approaches:**

If you want to avoid separate imports entirely, you could use:

```typescript
import { HelperFactory, type HelperSet } from '../factories/helper-factory';

export class LoginPage {
    readonly actions: HelperSet['actions'];  // Using indexed type
    readonly assert: HelperSet['assert'];    // Using indexed type
}
```

But the current approach (type-only imports) is more explicit and conventional.

---

### SOLID Principles Analysis

#### ✅ Single Responsibility Principle (SRP) - GOOD

Each fixture has a clear, single responsibility:
- `pom-eager-fixture` → Eager page initialization
- `pom-lazy-fixture` → Lazy page initialization
- `test-helpers-fixture` → Helpers only, no POM
- `test-fixtures` → Granular fixtures for flexibility
- `login-fixture` → Login-specific setup

**Verdict:** ✅ **SOLID compliant**

---

#### ⚠️ Open/Closed Principle (OCP) - MIXED

**Good:**
- Fixtures are open for extension (can create new fixtures)
- HelperFactory allows extending helpers without modifying fixtures

**Problem:**
- `login-fixture` is tightly coupled to login domain (hard to extend)

**Recommendation:** ✅ **Make login-fixture more generic or use composition**

---

#### ✅ Liskov Substitution Principle (LSP) - GOOD

All fixtures extending `base.extend<...>` can be substituted:
```typescript
// Can swap fixtures without breaking tests (if compatible)
import { test } from '../fixtures/pom-eager-fixture';
// vs
import { test } from '../fixtures/pom-lazy-fixture';
```

**Verdict:** ✅ **SOLID compliant**

---

#### ⚠️ Interface Segregation Principle (ISP) - MIXED

**Good:**
- `test-fixtures` provides granular fixtures (use only what you need)
- `test-helpers-fixture` provides minimal interface (helpers only)

**Problem:**
- `pom-eager-fixture` and `pom-lazy-fixture` bundle POM + helpers (can't get POM without helpers)

**Recommendation:** 🤔 **Consider separating POM from helpers if needed**

---

#### ✅ Dependency Inversion Principle (DIP) - GOOD

All fixtures depend on abstractions (HelperFactory, PageFactory) not concrete implementations.

**Verdict:** ✅ **SOLID compliant**

---

## Recommendations

Based on DRY and SOLID analysis, here are actionable recommendations:

---

### 🔴 HIGH PRIORITY

#### 1. Refactor login-fixture to use HelperFactory

**Problem:** Manual helper instantiation violates DRY

**Solution:**
```typescript
// BEFORE (login-fixture.ts - CURRENT)
const actions = new AdvancedActionsHelper(page, testInfo.title);
const assert = new AdvancedAssertionsHelper(page, testInfo.title);

// AFTER (RECOMMENDED)
const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);
```

**Impact:** Consistency across all fixtures, easier maintenance

---

#### 2. Use test-helpers-fixture for API Tests

**Problem:** API tests don't need POM but use pom-eager-fixture

**Current:**
```typescript
// network-interception.spec.ts (API test using POM fixture)
import { test } from '../../../src/fixtures/pom-eager-fixture';

test('API test', async ({ page, pomEagerHelpers }) => {
    const { actions, assert } = pomEagerHelpers;
    // Never uses pomEager...
});
```

**Recommended:**
```typescript
// Better approach
import { test } from '../../../src/fixtures/test-helpers-fixture';

test('API test', async ({ page, testHelpers }) => {
    const { actions, assert } = testHelpers;
    // Cleaner - no unused POM
});
```

**Impact:** Lighter fixtures for API tests, clearer intent

---

#### 3. Add test-helpers-fixture to users-test.spec.ts

**Problem:** API test has no fixture (no logging, no helpers)

**Current:**
```typescript
// users-test.spec.ts
import { test, expect } from '@playwright/test'; // No custom fixture
```

**Recommended:**
```typescript
import { test, expect } from '../../../src/fixtures/test-helpers-fixture';

test('API test', async ({ testHelpers }) => {
    const { actions, assert } = testHelpers;
    // Now has logging and helpers
});
```

---

### 🟡 MEDIUM PRIORITY

#### 4. Optimize Fixture Selection for Single-Page Tests

**Problem:** Some tests use pom-eager when they only use one page

**Tests to optimize:**
- `login-with-DD.spec.ts` → Switch to pom-lazy-fixture
- `login-with-builder.spec.ts` → Switch to pom-lazy-fixture

**Benefit:** Faster initialization, lower memory

---

#### 5. Consider Merging pom-eager and pom-lazy Fixtures

**Idea:** Single fixture with **strategy parameter**

```typescript
// Proposed unified fixture
export const test = base.extend<{ pom: POMHelpers }>({
    pom: async ({ page }, use, testInfo) => {
        // Read from config or test metadata
        const strategy = testInfo.annotations.find(a => a.type === 'pomStrategy')?.description || 'eager';

        const pomManager = strategy === 'lazy'
            ? new POMLazy(page, testInfo.title)
            : new POMEager(page, testInfo.title);

        const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);

        await use({ pomManager, actions, assert });
    }
});

// Usage
test('my test @pomStrategy=lazy', async ({ pom }) => {
    // Uses lazy strategy
});
```

**Pros:**
- ✅ Single fixture to maintain
- ✅ DRY - no duplication
- ✅ Flexible - choose strategy per test

**Cons:**
- ❌ More complex
- ❌ Less explicit (strategy hidden in annotation)

**Recommendation:** 🤔 **Keep separate for now** (explicit is better than implicit)

---

### 🟢 LOW PRIORITY

#### 6. Add PageFactory to POM Managers

**Enhancement:** POM Managers could use PageFactory internally

```typescript
export class POMEager {
    private readonly loginPage: LoginPage;

    constructor(page: Page, testName: string) {
        // Using PageFactory for consistent creation
        this.loginPage = PageFactory.createLoginPage(page, testName);
    }
}
```

**Benefit:** Centralized page creation logic

---

#### 7. Consider Domain-Specific Fixture Base

**Idea:** Create base fixture for domain-specific fixtures

```typescript
// src/fixtures/base/domain-fixture-base.ts
export function createDomainFixture<T>(config: DomainFixtureConfig<T>) {
    return base.extend<T>({
        [config.name]: async ({ page }, use, testInfo) => {
            // Common setup
            const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);

            // Domain-specific setup
            await config.setup(page, testInfo);

            await use(config.provide({ page, actions, assert, testInfo }));

            // Domain-specific teardown
            await config.teardown(testInfo);
        }
    });
}

// Usage for login-specific fixture
const loginFixture = createDomainFixture({
    name: 'loginHelpers',
    setup: async (page) => {
        const pomEager = new POMEager(page, testInfo.title);
        await pomEager.getLoginPage().navigateToLogin();
    },
    provide: ({ pomEager, actions, assert }) => ({ pomEager, actions, assert }),
    teardown: (testInfo) => { /* log assertion stats */ }
});
```

---

## Migration Guide

### Migrating login-fixture to use HelperFactory

**Step 1: Update imports**
```typescript
import { HelperFactory } from '../../../src/factories/helper-factory';
```

**Step 2: Replace manual instantiation**
```typescript
// BEFORE
const actions = new AdvancedActionsHelper(page, testInfo.title);
const assert = new AdvancedAssertionsHelper(page, testInfo.title);

// AFTER
const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);
```

**Step 3: Test and verify**
```bash
npx playwright test tests/ui/specs/login-with-fixture.spec.ts
```

---

### Migrating API Tests to test-helpers-fixture

**Step 1: Update imports**
```typescript
// BEFORE
import { test } from '../../../src/fixtures/pom-eager-fixture';

// AFTER
import { test } from '../../../src/fixtures/test-helpers-fixture';
```

**Step 2: Update fixture usage**
```typescript
// BEFORE
test('API test', async ({ page, pomEagerHelpers }) => {
    const { actions, assert } = pomEagerHelpers;

// AFTER
test('API test', async ({ page, testHelpers }) => {
    const { actions, assert } = testHelpers;
```

---

## Decision Matrix

**Which fixture should I use for my test?**

```
┌─────────────────────────────────────────────────────────────┐
│                  FIXTURE DECISION TREE                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────┐
        │   Do you need Page Objects?       │
        └───────────────────────────────────┘
                 ↓                    ↓
               YES                   NO
                 ↓                    ↓
    ┌────────────────────┐    ┌────────────────────┐
    │ How many pages?    │    │ Use:               │
    └────────────────────┘    │ test-helpers-      │
         ↓           ↓         │ fixture.ts         │
    Multiple    1-2 pages      └────────────────────┘
         ↓           ↓
    ┌──────────┐ ┌──────────┐
    │ Use:     │ │ Use:     │
    │ pom-     │ │ pom-     │
    │ eager-   │ │ lazy-    │
    │ fixture  │ │ fixture  │
    └──────────┘ └──────────┘

Special Cases:
• Login tests that auto-navigate? → login-fixture.ts
• Need granular control? → test-fixtures.ts
```

---

## Summary

### Current State

**Total Fixtures:** 5

| Fixture | Using HelperFactory? | Used By # Tests | Status |
|---------|---------------------|-----------------|--------|
| pom-eager-fixture | ✅ Yes | 2 tests | ✅ Good |
| pom-lazy-fixture | ✅ Yes | 4 tests | ✅ Good |
| test-helpers-fixture | ✅ Yes | 2 tests | ✅ Good |
| test-fixtures | ✅ Yes | 1 test | ✅ Good |
| login-fixture | ✅ **Yes** | 1 test | ✅ **Refactored** |

---

### Action Items

**✅ Priority 1 (COMPLETED):**
1. ✅ Refactor login-fixture to use HelperFactory — **DONE**
2. ✅ Migrate network-interception.spec.ts to test-helpers-fixture — **DONE**
3. ✅ Add test-helpers-fixture to users-test.spec.ts — **DONE**

**✅ Priority 2 (COMPLETED):**
4. ✅ Switch login-with-DD and login-with-builder to pom-lazy — **DONE**
5. ⏳ Document fixture selection guidelines in README — **Pending**

**Priority 3 (Consider Later):**
6. ⏳ Add PageFactory to POM Managers
7. ⏳ Evaluate unified POM fixture with strategy pattern

---

**Completed Changes Summary:**

✅ **All 5 fixtures now use HelperFactory consistently**
✅ **All 3 page objects now use HelperFactory consistently**
✅ **API tests migrated to test-helpers-fixture**
✅ **Single-page tests optimized to use pom-lazy**
✅ **Fixture distribution optimized across test suite**
✅ **100% HelperFactory adoption across entire framework**

**Files Refactored (Total: 8):**

**Fixtures (5):**
1. `src/fixtures/pom-eager-fixture.ts`
2. `src/fixtures/pom-lazy-fixture.ts`
3. `src/fixtures/test-helpers-fixture.ts`
4. `src/fixtures/test-fixtures.ts`
5. `tests/ui/fixtures/login-fixture.ts`

**Page Objects (3):**
6. `src/pages/home-page.ts`
7. `src/pages/login-page.ts`
8. `src/pages/login-page-log4js.ts`

**Next Steps:**
1. ⏳ Document fixture selection guidelines in README
2. ⏳ Monitor fixture usage and collect feedback
3. ⏳ Consider Phase 3 enhancements (unified POM fixture)

---

**Document Maintained By:** Test Automation Team
**Version:** 1.0
