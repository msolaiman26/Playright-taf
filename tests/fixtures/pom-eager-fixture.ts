import { test as base } from '@playwright/test';
import { POMEager } from '../../src/pages/pom-eager';
import winston from "winston";
import { Logger } from "../../src/utils/Logger";

type POMEagerFixture = {
    logger: winston.Logger;
    pomEager: POMEager;
};

/**
 * Custom Playwright fixture that extends the base test with POMEager and a logger.
 *
 * Before each test: creates a POMEager (eager page object manager) where all
 * page objects are instantiated upfront.
 *
 * After each test: logs whether the test passed, failed, or was skipped.
 *
 * Usage:
 *   import { test, expect } from '../../fixtures/pom-eager-fixture';
 *
 *   test('my test', async ({ pomEagerFixture }) => {
 *       const { pomEager, logger } = pomEagerFixture;
 *       logger.info('Starting test');
 *       await pomEager.getLoginPage().navigateToLogin();
 *   });
 */
export const test = base.extend<{ pomEagerFixture: POMEagerFixture }>({
    pomEagerFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-POMEager-${testInfo.title.replace(/\s+/g, '_')}`);
        const pomEager = new POMEager(page, testInfo.title);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        await use({ pomEager, logger });

        if (testInfo.status !== testInfo.expectedStatus) {
            try {
                await testInfo.attach('screenshot', {
                    body: await page.screenshot({ fullPage: true }),
                    contentType: 'image/png',
                });
            } catch (e) {
                logger.warn(`Could not capture screenshot: ${(e as Error).message}`);
            }
        }

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
