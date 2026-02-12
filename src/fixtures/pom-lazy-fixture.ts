import { test as base } from '@playwright/test';
import { POMLazy } from '../pages/pom-lazy';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * Type definition bundling the POMLazy page object manager with
 * standalone action and assertion helpers for direct use in tests.
 */
type POMLazyHelpers = {
    pomLazy: POMLazy;
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Custom Playwright fixture that extends the base test with POMLazy and helpers.
 *
 * Before each test: creates a POMLazy (lazy page object manager) and
 * standalone helper instances. Page objects inside POMLazy are NOT created
 * until first accessed (e.g., pomLazy.loginPage triggers lazy creation).
 *
 * After each test: logs whether the test passed or failed.
 *
 * Usage:
 *   import { test, expect } from '../../../src/fixtures/pom-lazy-fixture';
 *
 *   test('my test', async ({ pomLazyHelpers }) => {
 *       const { pomLazy } = pomLazyHelpers;
 *       await pomLazy.loginPage.navigateToLogin();
 *       // ... test code
 *   });
 */
export const test = base.extend<{ pomLazyHelpers: POMLazyHelpers }>({
    pomLazyHelpers: async ({ page }, use, testInfo) => {
        // Setup: create the lazy POM and helpers (page objects not yet created)
        const pomLazy = new POMLazy(page, testInfo.title);
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);

        // Hand control to the test
        await use({ pomLazy, actions, assert });

        // Teardown: log the final test result
        if (testInfo.status === 'passed') {
            console.log('\n===Test Passed===');
        } else {
            console.log('\n===Test Failed===');
        }
    }
});

export { expect } from '@playwright/test';
