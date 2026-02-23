import { test as base } from '@playwright/test';
import { POMLazy } from '../../src/pages/pom-lazy';
import winston from "winston";
import { Logger } from "../../src/utils/Logger";

type POMLazyFixture = {
    logger: winston.Logger;
    pomLazy: POMLazy;
};

/**
 * Custom Playwright fixture that extends the base test with POMLazy and a logger.
 *
 * Before each test: creates a POMLazy (lazy page object manager). Page objects
 * inside POMLazy are NOT created until first accessed (e.g., pomLazy.loginPage
 * triggers lazy creation).
 *
 * After each test: logs whether the test passed, failed, or was skipped.
 *
 * Usage:
 *   import { test, expect } from '../../fixtures/pom-lazy-fixture';
 *
 *   test('my test', async ({ pomLazyFixture }) => {
 *       const { pomLazy, logger } = pomLazyFixture;
 *       logger.info('Starting test');
 *       await pomLazy.loginPage.navigateToLogin();
 *   });
 */
export const test = base.extend<{ pomLazyFixture: POMLazyFixture }>({
    pomLazyFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-POMLazy-${testInfo.title.replace(/\s+/g, '_')}`);
        const pomLazy = new POMLazy(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        await use({ pomLazy, logger });

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
