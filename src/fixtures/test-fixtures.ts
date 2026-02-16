import { test as base } from "@playwright/test";
import winston from "winston";
import { Logger } from "../utils/Logger";
import { AdvancedAssertionsHelper } from "../utils/advanced-assertions-helper";
import { AdvancedActionsHelper } from "../utils/advanced-actions-helper";
import { POMLazy } from "../pages/pom-lazy";
import { HelperFactory } from "../factories/helper-factory";

/**
 * Extended Playwright test fixture that provides a `logger` instance
 * automatically named after the current test.
 *
 * Usage:
 *   import { test, expect } from "../fixtures/test-fixtures";
 *   test("my test", async ({ page, logger }) => {
 *     logger.info("Starting test");
 *   });
 */
type LoggerFixture = {
  logger: winston.Logger;
  pomLazy: POMLazy;
  actions: AdvancedActionsHelper;
  assert: AdvancedAssertionsHelper;
};

export const test = base.extend<LoggerFixture>({
  logger: async ({ page }, use, testInfo) => {
    // Create a logger named after the test for easy filtering
    const testName = testInfo.title.replace(/\s+/g, "_");
    const logger = Logger.getLogger(testName);

    const pomLazy = new POMLazy(page, testInfo.title);
    const actions = new AdvancedActionsHelper(page, testInfo.title);
    const assert = new AdvancedAssertionsHelper(page, testInfo.title);

    logger.info(`▶ TEST START: "${testInfo.title}"`);
    logger.debug(`  File: ${testInfo.file}`);
    logger.debug(`  Project: ${testInfo.project.name}`);

    // Hand control to the test
    await use(logger);

/*     await use({pomLazy, actions, assert });
    await use(logger); */

    // Log test result
    const status = testInfo.status;
    if (status === "passed") {
      logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
    } else if (status === "failed") {
      logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
      if (testInfo.error) {
        logger.error(`   Error: ${testInfo.error.message}`);
      }
    } else if (status === "skipped") {
      logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
    }
  },
    pomLazy: async ({ page }, use, testInfo) => {
    await use(new POMLazy(page, testInfo.title));
  },
  actions: async ({ page }, use, testInfo) => {
    const { actions } = HelperFactory.createHelpers(page, testInfo.title);
    await use(actions);
  },
  assert: async ({ page }, use, testInfo) => {
    const { assert } = HelperFactory.createHelpers(page, testInfo.title);
    await use(assert);
  },
});

export { expect } from "@playwright/test";
