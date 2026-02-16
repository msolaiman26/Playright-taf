import { test as base } from '@playwright/test';
import { POMEager } from '../../src/pages/pom-eager';
import { AdvancedActionsHelper } from '../../src/utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../../src/utils/advanced-assertions-helper';
import { Logger } from '../../src/utils/Logger';
import { HelperFactory } from '../../src/factories/helper-factory';

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
        const logger = Logger.getLogger(`Fixture-POMEager-${testInfo.title.replace(/\s+/g, '_')}`);

        // Setup: create all helpers eagerly using Factory pattern (before test body runs)
        const pomEager = new POMEager(page, testInfo.title);
        const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        // Hand control to the test — everything before use() is "setup", after is "teardown"
        await use({ pomEager, actions, assert });

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
