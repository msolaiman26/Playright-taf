import { test as base } from '@playwright/test';
import { POMLazy } from '../pages/pom-lazy';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { Logger } from '../utils/Logger';

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
        const logger = Logger.getLogger(`Fixture-POMLazy-${testInfo.title.replace(/\s+/g, '_')}`);

        // Setup: create the lazy POM and helpers (page objects not yet created)
        const pomLazy = new POMLazy(page, testInfo.title);
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        // Hand control to the test
        await use({ pomLazy, actions, assert });

        // Teardown: log the final test result
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

export { expect } from '@playwright/test';
