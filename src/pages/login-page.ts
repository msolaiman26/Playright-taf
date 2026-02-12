import { Page, Locator } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * Login Page Object Model (POM) for the OrangeHRM login page.
 *
 * Encapsulates all login-related UI elements and interactions behind clean methods.
 * Integrates AdvancedActionsHelper (for logged actions) and AdvancedAssertionsHelper
 * (for logged assertions with soft/hard modes), so every interaction and verification
 * is automatically logged to console and file for traceability.
 *
 * Usage: Tests should only call public methods (login, navigateToLogin, etc.)
 *        and never interact with locators directly — this preserves encapsulation.
 */
export class LoginPage {
    readonly page: Page;
    readonly actions: AdvancedActionsHelper;   // Provides logged page actions (goto, click, fill, etc.)
    readonly assert: AdvancedAssertionsHelper;  // Provides logged assertions (toBeVisible, toHaveText, etc.)

    // ===================== Locators =====================
    readonly usernameInput: Locator;          // The username text input on the login form
    readonly passwordInput: Locator;          // The password text input on the login form
    readonly loginButton: Locator;            // The "Login" submit button
    readonly errorMessage: Locator;           // The alert text shown on any login error
    readonly dashboardHeader: Locator;        // The header breadcrumb visible after successful login
    readonly invalidLoginMessage: Locator;    // Specific error paragraph for invalid credentials

    // ===================== Constants =====================
    /** Expected text displayed when login credentials are invalid */
    readonly invalidLoginMessageText: string = "Invalid credentials";

    // ===================== Constructor =====================
    /**
     * Initializes all locators and helper instances for the login page.
     * @param page - Playwright Page instance from the test
     * @param testName - Test name used to label log files for actions and assertions
     */
    constructor(page: Page, testName: string) {
        this.page = page;
        // Create separate helper instances so actions and assertions get their own log files
        this.actions = new AdvancedActionsHelper(page, `${testName}-actions`);
        this.assert = new AdvancedAssertionsHelper(page, `${testName}-assertions`);

        // Initialize locators using CSS selectors and XPath
        this.usernameInput = page.locator('input[name="username"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.loginButton = page.locator('button[type="submit"]');
        this.errorMessage = page.locator('.oxd-alert-content-text');
        this.dashboardHeader = page.locator('h6.oxd-topbar-header-breadcrumb-module');
        this.invalidLoginMessage = page.locator("//p[@class='oxd-text oxd-text--p oxd-alert-content-text']");
    }


    // ===================== Navigation Methods =====================

    /** Navigates the browser to the OrangeHRM login page */
    async navigateToLogin() {
        await this.actions.goto(
            'https://opensource-demo.orangehrmlive.com/',
            'Navigate to OrangeHRM login page'
        );
    }

    /**
     * Performs a complete login flow: fills username, fills password, clicks Login.
     * The password is masked in log output by default to protect sensitive data.
     * @param username - Username to enter
     * @param password - Password to enter
     * @param isPasswordSensitive - When true (default), password is masked in logs as "***MASKED***"
     */
    async login(username: string, password: string, isPasswordSensitive: boolean = true) {
        await this.actions.fill(
            this.usernameInput,
            username,
            'Enter username',
            false // not sensitive
        );

        await this.actions.fill(
            this.passwordInput,
            password,
            'Enter password',
            isPasswordSensitive // mask in logs
        );

        await this.actions.click(
            this.loginButton,
            'Click login button'
        );
    }

    /**
     * Returns a combined summary string of all actions performed and assertions checked.
     * Merges the step count from actions with the pass/fail stats from assertions.
     * Useful for printing a final test report in afterEach hooks.
     */
    getSummaries(): string {
        const actionsSummary = this.actions.getSummary();
        const assertionStats = this.assert.getAssertionStats();

        // Combine both summaries
        const lines = actionsSummary.split('\n');
        const summaryLines: string[] = [];
        for (const line of lines) {
            summaryLines.push(line);
            // Add assertion count after the "Total Steps" line
            if (line.includes('Total Steps:')) {
                summaryLines.push(`Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`);
            }
        }

        return summaryLines.join('\n');
    }

    // ===================== Verification Methods =====================

    /**
     * Verifies the login page has fully loaded by checking visibility of all key elements.
     * Uses SOFT assertions so all checks run even if one fails, then reports all failures at the end.
     */
    async verifyLoginPageLoaded() {
        // Use soft assertions to validate all elements
        await this.assert.toBeVisible(
            this.usernameInput,
            'Verify username field is visible',
            true
        );

        await this.assert.toBeVisible(
            this.passwordInput,
            'Verify password field is visible',
            true
        );

        await this.assert.toBeVisible(
            this.loginButton,
            'Verify login button is visible',
            true
        );

        await this.assert.toHaveTitle(
            /OrangeHRM/,
            'Verify page title',
            true
        );

        // Assert all validations passed
        await this.assert.assertAllSoftAssertions();
    }


    /** Verifies successful login by checking the URL contains "dashboard" and the header is visible */
    async verifyLoginSuccess() {
        await this.actions.waitForVisible(
            this.dashboardHeader,
            'Wait for dashboard to load'
        );

        await this.assert.toHaveURL(
            /dashboard/,
            'Verify redirected to dashboard'
        );

        await this.assert.toBeVisible(
            this.dashboardHeader,
            'Verify dashboard header is visible'
        );
    }

    /**
     * Verifies that login failed by checking the error message is displayed.
     * @param expectedErrorMessage - Optional specific text to match in the error message
     */
    async verifyLoginFailure(expectedErrorMessage?: string) {
        await this.assert.toBeVisible(
            this.errorMessage,
            'Verify error message is displayed'
        );

        if (expectedErrorMessage) {
            await this.assert.toContainText(
                this.errorMessage,
                expectedErrorMessage,
                'Verify error message text'
            );
        }
    }

    /** Clicks login with empty fields and verifies the "Required" validation messages appear */
    async verifyFormValidation() {
        // Click login without entering credentials
        await this.actions.click(this.loginButton, 'Click login without credentials');

        // Soft validate all validation messages
        await this.assert.toBeVisible(
            this.page.locator('.oxd-input-group .oxd-text--span').first(),
            'Verify username validation message appears',
            true
        );

        await this.assert.toHaveText(
            this.page.locator('.oxd-input-group .oxd-text--span').first(),
            'Required',
            'Verify validation message says Required',
            true
        );

        await this.assert.assertAllSoftAssertions();
    }

    // ===================== Assertion Methods =====================

    /** Asserts that the "Invalid credentials" error message is displayed after a failed login attempt */
    async assertInvalidLoginMessage() {
        await this.assert.toHaveText(this.invalidLoginMessage, this.invalidLoginMessageText, 'Verify invalid login message'); // Verify the invalid login message
    }
}
