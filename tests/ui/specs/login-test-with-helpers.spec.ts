import { test } from '../../../src/fixtures/pom-lazy-fixture';
import { LoginPage } from '../../../src/pages/login-page';

/**
 * ✅ BEST PRACTICE: POMLazy with Fixture
 * Demonstrates proper POM pattern using fixtures for clean, reusable tests
 *
 * Key Principles:
 * 1. Never access page object locators directly (no loginPage.username_tb)
 * 2. Only call page object methods (loginPage.login())
 * 3. Use fixtures to eliminate repetition (no beforeEach/afterEach needed)
 * 4. Tests read like user stories
 * 5. Fixtures handle initialization and cleanup automatically
 */
test.describe('✅ Best Practice: POM with Fixture', () => {
    test.beforeEach(async ({ pomLazyHelpers }) => {
        // Fixture provides pomLazy, navigate to login page
        await pomLazyHelpers.pomLazy.loginPage.navigateToLogin();
    });

    test('Successful login - valid credentials', async ({ pomLazyHelpers }) => {
        // ✅ Clean and readable - reads like a user story
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.homePage.assertProfileIcon();
    });

    test('Failed login - invalid username', async ({ pomLazyHelpers }) => {
        // ✅ Page object handles all UI details
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('InvalidUser', 'wrongpassword');
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - invalid password', async ({ pomLazyHelpers }) => {
        // ✅ Reusable methods across multiple test scenarios
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('Admin', 'wrongpassword');
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - empty credentials', async ({ pomLazyHelpers }) => {
        // ✅ Method handles edge cases
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('', '');
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });
});


let _loginPage:LoginPage; // Declare variable to hold loginPage instance for beforeEach access
test.describe('✅ Best Practice: POM with Fixture_Optimized', () => {
    test.beforeEach(async ({ pomLazyHelpers }) => {
         _loginPage = pomLazyHelpers.pomLazy.loginPage; // Accessing loginPage for the first time - triggers lazy initialization
        // Fixture provides pomLazy, navigate to login page
        await _loginPage.navigateToLogin();
    });

    test('Successful login - valid credentials_Optimized', async ({ pomLazyHelpers }) => {
        // ✅ Clean and readable - reads like a user story
        const { pomLazy } = pomLazyHelpers;
        await _loginPage.login('Admin', 'admin123');
        let _homePage = pomLazy.homePage; // Accessing homePage for the first time - triggers lazy initialization
        await _homePage.assertProfileIcon();
    });

    test('Failed login - invalid username_Optimized', async ({ pomLazyHelpers }) => {
        // ✅ Page object handles all UI details
        const { pomLazy } = pomLazyHelpers;
        await _loginPage.login('InvalidUser', 'wrongpassword');
        await _loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - invalid password_Optimized', async ({ pomLazyHelpers }) => {
        // ✅ Reusable methods across multiple test scenarios
        const { pomLazy } = pomLazyHelpers;
        await _loginPage.login('Admin', 'wrongpassword');
        await _loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - empty credentials_Optimized', async ({ pomLazyHelpers }) => {
        // ✅ Method handles edge cases
        const { pomLazy } = pomLazyHelpers;
        await _loginPage.login('', '');
        await _loginPage.assertInvalidLoginMessage();
    });
});

/**
 * ✅ BEST PRACTICE: Multiple Page Objects
 * Demonstrates working with multiple pages using fixture
 */
test.describe('✅ Best Practice: Multi-Page Workflows', () => {
    test.beforeEach(async ({ pomLazyHelpers }) => {
        await pomLazyHelpers.pomLazy.loginPage.navigateToLogin();
    });

    test('Login and verify home page', async ({ pomLazyHelpers }) => {
        // ✅ Seamless navigation between page objects
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.homePage.assertProfileIcon();
    });

    test('Verify login page elements', async ({ pomLazyHelpers }) => {
        // ✅ Page objects handle internal validation
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.homePage.assertProfileIcon();
    });
});

/**
 * ❌ ANTI-PATTERN: What NOT to do
 * Kept for educational purposes - shows common mistakes
 */
test.describe('❌ Anti-Pattern: Direct Locator Access (DO NOT USE)', () => {
    test.skip('BAD: Accessing locators directly', async ({ page }) => {
        // ❌ This is what you should AVOID:
        //
        // const loginPage = new LoginPage(page);
        // await loginPage.actions.fill(loginPage.username_tb, 'Admin', 'Enter username');
        // await loginPage.actions.fill(loginPage.password_tb, 'admin123', 'Enter password');
        // await loginPage.actions.click(loginPage.login_btn, 'Click login');
        //
        // Problems with this approach:
        // 1. ❌ Test knows about internal page structure (locators)
        // 2. ❌ Not reusable - every test duplicates this logic
        // 3. ❌ Hard to maintain - UI changes break all tests
        // 4. ❌ Doesn't read like a user story
        // 5. ❌ Violates encapsulation principle
        //
        // ✅ INSTEAD, use: await pomLazy.loginPage.login('Admin', 'admin123');
    });
});

/**
 * 📚 For detailed POM pattern documentation, best practices, and lessons learned,
 * see: docs/pom-pattern-guide.md
 */
