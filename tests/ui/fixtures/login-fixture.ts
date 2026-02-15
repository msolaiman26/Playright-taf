/**
 * Login Fixture — Custom Playwright fixture tailored for login-related tests.
 *
 * Key difference from the generic pom-eager-fixture:
 *   - The pomEager fixture automatically navigates to the login page before each test
 *   - Provides a separate loginPage fixture for direct access to LoginPage methods
 *   - The assert fixture prints assertion stats (total/passed/failed) after each test
 *
 * This eliminates the need for tests to include navigation boilerplate.
 *
 * Fixture values:
 *   - pomEager:   POMEager instance (pre-navigated to login page)
 *   - loginPage:  Standalone LoginPage instance for direct assertions
 *   - actions:    AdvancedActionsHelper for logged interactions
 *   - assert:     AdvancedAssertionsHelper with automatic summary on teardown
 */
import { test as base } from '@playwright/test';
import { POMEager } from '../../../src/pages/pom-eager';
import { LoginPage } from '../../../src/pages/login-page';
import { AdvancedActionsHelper } from '../../../src/utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../../../src/utils/advanced-assertions-helper';
import { Logger } from '../../../src/utils/Logger';

/** Type definition for all fixture values available in login tests */
type myFixtures = {
    pomEager: POMEager;
    loginPage: LoginPage;
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
}

export const test = base.extend<myFixtures>({
    /** Creates POMEager and navigates to the login page before each test */
    pomEager: async ({ page }, use, testInfo ) => {
        const pomEager = new POMEager(page, testInfo.title);
        await pomEager.getLoginPage().navigateToLogin();  // Auto-navigate before test
        await use(pomEager);
    },

    /** Provides a standalone LoginPage for tests that need direct page-level assertions */
    loginPage: async ({ page }, use, testInfo ) => {
        const loginPage = new LoginPage(page, testInfo.title);
        await use(loginPage);
    },

    /** Provides a standalone AdvancedActionsHelper for logged page interactions */
    actions: async ({ page }, use, testInfo) => {
        const actions = new AdvancedActionsHelper(page, testInfo.title);
        await use(actions);
    },

    /** Provides AdvancedAssertionsHelper and logs assertion stats summary after each test */
    assert: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-Login-${testInfo.title.replace(/\s+/g, '_')}`);
        const assert = new AdvancedAssertionsHelper(page, testInfo.title);
        await use(assert);

        // Teardown: log assertion statistics
        const assertionStats = assert.getAssertionStats();
        logger.info(`=== Test Summary ===`);
        logger.info(`Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`);
    }
});