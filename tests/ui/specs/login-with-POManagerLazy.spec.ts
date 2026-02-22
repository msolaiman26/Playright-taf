/**
 * Login Tests — Using POMLazy fixture (Lazy Page Object Manager).
 *
 * Demonstrates the POMLazy pattern where page objects are created on-demand
 * (only when first accessed via the getter). This is more memory-efficient
 * when a test only uses a subset of available pages.
 *
 * Also shows how to destructure lazy page objects into local variables
 * for cleaner test code (e.g., `const loginPage = pomLazy.loginPage`).
 *
 * Includes all four lifecycle hooks (beforeAll, beforeEach, afterEach, afterAll)
 * for comprehensive test lifecycle logging.
 *
 * Fixture provides: pomLazyHelpers { pomLazy, actions, assert }
 */
import { test } from '../../fixtures/pom-lazy-fixture';
import { Logger } from "../../../src/utils/Logger";

const logger = Logger.getLogger('login-with-POManagerLazy');

// =================== Lifecycle Hooks ======================

/** Runs once before any test in this file */
test.beforeAll('This actions run before all tests',async () =>{
    logger.info('This actions run before all tests');
})

/** Runs before each individual test — logs the test name */
test.beforeEach('This actions run before every test',async ({page}, testInfo) =>{
    logger.info(`test starts for: ${testInfo.title}`);
})

/** Runs after each individual test — logs the test name */
test.afterEach('This actions run after every test',async ({page}, testInfo) =>{
    logger.info(`test ends for: ${testInfo.title}`);
})

/** Runs once after all tests in this file */
test.afterAll('This actions run after all tests',async () =>{
    logger.info('This actions run after all tests');
})

// ==================== Test Cases ======================
test.describe('Login test', ()=> {
    /** Valid login using lazy page objects stored in local variables for readability */
    test('valid login', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        const loginPage = pomLazy.loginPage;   // First access — triggers lazy creation of LoginPage
        const homePage = pomLazy.homePage;      // First access — triggers lazy creation of HomePage
        await loginPage.navigateToLogin();
        await loginPage.login('Admin', 'admin123');
        await homePage.assertProfileIcon();     // Verifies the dashboard loaded successfully
    });

    /** Invalid login: enters wrong password and verifies the error message */
    test('invalid login', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        const loginPage = pomLazy.loginPage;
        await loginPage.navigateToLogin();
        await loginPage.login('Admin', 'admin12');
        await loginPage.assertInvalidLoginMessage();
    });
});