/**
 * Login Tests — Using POMEager fixture (Eager Page Object Manager).
 *
 * Demonstrates the POMEager pattern where all page objects are instantiated upfront.
 * Uses lifecycle hooks (beforeAll, afterEach, afterAll) for logging and cleanup.
 * Each test explicitly navigates to the login page and performs the login flow.
 *
 * Fixture provides: pomEagerHelpers { pomEager, actions, assert }
 */
import { test } from '../../../src/fixtures/pom-eager-fixture';
import { Logger } from '../../../src/utils/Logger';

const logger = Logger.getLogger('login-with-POManagerEager');

// =================== Lifecycle Hooks ======================
// These hooks run logging for test lifecycle visibility in reports

/** Runs once before any test in this file — used for suite-level setup logging */
test.beforeAll('This actions run before all tests',async () =>{
    logger.info('This actions run before all tests');
})

/** Runs after each test — logs which test just completed */
test.afterEach('This actions run after every test',async ({}, testInfo) =>{
    logger.info(`test ends for: ${testInfo.title}`);
})

/** Runs once after all tests in this file — used for suite-level teardown logging */
test.afterAll('This actions run after all tests',async () =>{
    logger.info('This actions run after all tests');
})

// ==================== Test Cases ======================
test.describe('Login test', ()=> {
    /** Valid login: navigates to login, enters correct credentials, verifies dashboard loads */
    test('valid login', async ({ pomEagerHelpers }) => {
        const { pomEager } = pomEagerHelpers;
        await pomEager.getLoginPage().navigateToLogin();
        logger.info(`test starts for: valid login`);
        await pomEager.getLoginPage().login('Admin', 'admin123');
        await pomEager.getHomePage().assertProfileIcon();
    });

    /** Invalid login: navigates to login, enters wrong password, verifies error message */
    test('invalid login', async ({ pomEagerHelpers }) => {
        const { pomEager } = pomEagerHelpers;
        await pomEager.getLoginPage().navigateToLogin();
        logger.info(`test starts for: invalid login`);
        await pomEager.getLoginPage().login('Admin', 'admin12');
        await pomEager.getLoginPage().assertInvalidLoginMessage();
    });
});
