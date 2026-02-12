import { test as base } from '@playwright/test';
import { POMEager } from '../pages/pom-eager';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * Type definition bundling the POMEager page object manager with
 * standalone action and assertion helpers for direct use in tests.
 */
type POMEagerHelpers = {
    pomEager: POMEager;
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Custom Playwright fixture that extends the base test with POMEager and helpers.
 *
 * Before each test: creates a POMEager (eager page object manager) and
 * standalone AdvancedActionsHelper / AdvancedAssertionsHelper instances,
 * all labeled with the test name for unique log files.
 *
 * After each test: logs whether the test passed or failed.
 *
 * Usage:
 *   import { test, expect } from '../../../src/fixtures/pom-eager-fixture';
 *
 *   test('my test', async ({ pomEagerHelpers }) => {
 *       const { pomEager, actions, assert } = pomEagerHelpers;
 *       await pomEager.getLoginPage().navigateToLogin();
 *       // ... test code
 *   });
 */
export const test = base.extend<{ pomEagerHelpers: POMEagerHelpers }>({
    pomEagerHelpers: async ({ page }, use, testInfo) => {
        // Setup: create all helpers eagerly (before test body runs)
        const pomEager = new POMEager(page, testInfo.title);
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);

        // Hand control to the test — everything before use() is "setup", after is "teardown"
        await use({ pomEager, actions, assert });

        // Teardown: log the final test result
        if (testInfo.status === 'passed') {
            console.log('\n===Test Passed===');
        } else {
            console.log('\n===Test Failed===');
        }
    }
});

export { expect } from '@playwright/test';
