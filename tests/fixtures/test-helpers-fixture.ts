import { test as base } from '@playwright/test';
import type { AdvancedActionsHelper } from '../../src/utils/advanced-actions-helper';
import type { AdvancedAssertionsHelper } from '../../src/utils/advanced-assertions-helper';
import type { AdvancedAPIHelper } from '../../src/utils/advanced-api-helper';
import { Logger } from '../../src/utils/Logger';
import { HelperFactory } from '../../src/factories/helper-factory';

/**
 * Type definition for standalone test helpers (no page object manager).
 * Use this when you only need action logging and assertions without a full POM.
 */
type TestHelpers = {
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Type definition for API test helpers.
 * Provides apiActions for logged API calls and assert for assertions.
 */
type APITestHelpers = {
    apiActions: AdvancedAPIHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Minimal fixture that provides just the action and assertion helpers without a POM.
 *
 * Useful for tests that interact with pages directly (e.g., simple UI checks)
 * but still want the benefits of logged actions and assertions.
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
export const test = base.extend<{ testHelpers: TestHelpers; apiTestHelpers: APITestHelpers }>({
    testHelpers: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-Helpers-${testInfo.title.replace(/\s+/g, '_')}`);

        // Create helpers using Factory pattern - each test gets unique log entries
        const { actions, assert } = HelperFactory.createHelpers(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        // Hand the helpers to the test body
        await use({ actions, assert });

        // Teardown: log the final test result
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
        }
    },

    /**
     * API test helpers fixture for API testing with automatic logging.
     *
     * Provides apiActions (AdvancedAPIHelper) for logged API calls and
     * assert (AdvancedAssertionsHelper) for assertions.
     *
     * Usage:
     *   import { test, expect } from '../../../src/fixtures/test-helpers-fixture';
     *
     *   test('API test', async ({ request, page, apiTestHelpers }) => {
     *       const { apiActions, assert } = apiTestHelpers;
     *       const response = await apiActions.get('/users', 'Fetch users');
     *       await assert.toEqual(response.status(), 200, 'Verify status 200');
     *   });
     */
    apiTestHelpers: async ({ request, page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-API-${testInfo.title.replace(/\s+/g, '_')}`);

        // Create API helpers using Factory pattern
        const { apiActions, assert } = HelperFactory.createAPIHelpers(request, page, testInfo.title);

        logger.info(`▶ API TEST START: "${testInfo.title}"`);

        // Hand the helpers to the test body
        await use({ apiActions, assert });

        // Teardown: log the final test result and summary
        const apiSummary = apiActions.getSummary();
        const assertionStats = assert.getAssertionStats();

        if (testInfo.status === 'passed') {
            logger.info(`✅ API TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ API TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
        }

        logger.info(`${apiSummary}`);
        logger.info(`Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`);
    }
});

export { expect } from '@playwright/test';
