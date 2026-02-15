import { test as base } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { Logger } from '../utils/Logger';

/**
 * Type definition for standalone test helpers (no page object manager).
 * Use this when you only need action logging and assertions without a full POM.
 */
type TestHelpers = {
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Minimal fixture that provides just the action and assertion helpers without a POM.
 *
 * Useful for tests that interact with pages directly (e.g., API tests or simple
 * UI checks) but still want the benefits of logged actions and assertions.
 *
 * Usage:
 *   import { test, expect } from '../../../src/fixtures/test-helpers-fixture';
 *
 *   test('my test', async ({ page, testHelpers }) => {
 *       const { actions, assert } = testHelpers;
 *       await actions.goto('https://example.com');
 *       await assert.toBeVisible(page.locator('h1'));
 *   });
 */
export const test = base.extend<{ testHelpers: TestHelpers }>({
    testHelpers: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-Helpers-${testInfo.title.replace(/\s+/g, '_')}`);

        // Create helpers with the test name so each test gets unique log entries
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        // Hand the helpers to the test body
        await use({ actions, assert });

        // Teardown: log the final test result
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
        }
   }
});

export { expect } from '@playwright/test';
