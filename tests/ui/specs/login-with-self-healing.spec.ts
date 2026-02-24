import { test } from '../../fixtures/self-healing-fixture';

/**
 * Self-Healing Locator Demonstration
 *
 * This spec mirrors `login-with-helpers.spec.ts` in every test scenario.
 * The only difference is that every locator is backed by a `SelfHealingLocator`
 * with a ranked list of selector strategies. If the primary selector cannot
 * find an element, the next strategy is tried automatically — and a WARN is
 * logged to identify which locator needs updating.
 *
 * Key behaviours to observe in logs:
 *   DEBUG  → "[SelfHealingLocator] Primary strategy resolved: ..."
 *   WARN   → "[SelfHealingLocator] ⚠ Self-healing activated! Primary … not found. Using Strategy N …"
 *   INFO   → Post-test healing summary listing which strategy each locator resolved to
 */

// ─────────────────────────────────────────────────────────────────────────────
// Best Practice: POM with Self-Healing Fixture
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Self-Healing: POM with Self-Healing Fixture', () => {
    test.beforeEach(async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
    });

    test('Successful login - valid credentials', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        await pomSelfHealing.homePage.assertProfileIcon();
    });

    test('Failed login - invalid username', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('InvalidUser', 'wrongpassword');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - invalid password', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'wrongpassword');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - empty credentials', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('', '');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Best Practice: POM with Self-Healing Fixture — Optimized (lazy access)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Self-Healing: POM with Self-Healing Fixture_Optimized', () => {
    test.beforeEach(async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
    });

    test('Successful login - valid credentials_Optimized', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        const _homePage = pomSelfHealing.homePage; // First access triggers lazy initialization
        await _homePage.assertProfileIcon();
    });

    test('Failed login - invalid username_Optimized', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('InvalidUser', 'wrongpassword');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - invalid password_Optimized', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'wrongpassword');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login - empty credentials_Optimized', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('', '');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Best Practice: Multi-Page Workflows with Self-Healing Locators
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Self-Healing: Multi-Page Workflows', () => {
    test.beforeEach(async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
    });

    test('Login and verify home page', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        await pomSelfHealing.homePage.assertProfileIcon();
    });

    test('Verify login page elements', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        await pomSelfHealing.homePage.assertProfileIcon();
    });
});

/**
 * How self-healing helps maintenance
 * ───────────────────────────────────
 * If a developer renames `input[name="username"]` to `input[name="user"]` in the app:
 *
 * Without self-healing → Test fails immediately with a Playwright timeout error.
 *
 * With self-healing    → The XPath fallback `//input[@name="username"]` is tried next.
 *                        If that also fails, `[placeholder="Username"]` is tried.
 *                        The test continues; a WARN log flags the healed locator.
 *                        The team sees the warning in CI output and updates the primary
 *                        selector in the next sprint — instead of a surprise failure.
 *
 * Check `test-logs/` after a run to see the healing summary per locator.
 */
