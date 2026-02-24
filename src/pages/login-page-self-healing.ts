import { Page } from '@playwright/test';
import type { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import type { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import winston from 'winston';
import { Logger } from '../utils/Logger';
import { HelperFactory } from '../factories/helper-factory';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { SelfHealingPageBase } from './self-healing-page-base';
import { loginLocators } from '../locators/login-page-locators';

/**
 * Login Page — Self-Healing variant.
 *
 * Mirrors `login-page.ts` in public API. The difference is that each locator is a
 * `SelfHealingLocator` backed by a semantic `ElementMetadata` description instead of
 * a hand-maintained list of fallback selectors. When the primary CSS/XPath fails:
 *
 *   Phase 1 → Primary selector (the one you wrote)
 *   Phase 2 → Auto-generated Playwright semantic locators derived from metadata
 *             (getByRole, getByLabel, getByPlaceholder, getByText, …)
 *   Phase 3 → AI provider (optional) — captures page snapshot and asks the AI
 *             to suggest a working selector
 *
 * Tests call the same public methods as the original LoginPage and never interact
 * with locators directly — encapsulation is fully preserved.
 */
export class LoginPageSelfHealing extends SelfHealingPageBase {
    readonly page: Page;
    private readonly logger: winston.Logger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    // ===================== Self-Healing Locators =====================
    readonly usernameInput: SelfHealingLocator;
    readonly passwordInput: SelfHealingLocator;
    readonly loginButton: SelfHealingLocator;
    readonly errorMessage: SelfHealingLocator;
    readonly dashboardHeader: SelfHealingLocator;
    readonly invalidLoginMessage: SelfHealingLocator;

    // ===================== Constants =====================
    readonly invalidLoginMessageText: string = 'Invalid credentials';

    // ===================== Constructor =====================
    /**
     * @param page       - Playwright Page instance from the test
     * @param testName   - Used to label log files
     * @param aiProvider - Optional AI backend for Phase 3 healing (Claude, OpenAI, …)
     */
    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page = page;
        this.logger = Logger.getLogger(`LoginPageSelfHealing-${testName}`);
        const helpers = HelperFactory.createHelpers(page, testName);
        this.actions = helpers.actions;
        this.assert = helpers.assert;

        this.usernameInput = SelfHealingLocator.from(page, loginLocators.usernameInput, this.logger, aiProvider);
        this.passwordInput = SelfHealingLocator.from(page, loginLocators.passwordInput, this.logger, aiProvider);
        this.loginButton = SelfHealingLocator.from(page, loginLocators.loginButton, this.logger, aiProvider);
        this.errorMessage = SelfHealingLocator.from(page, loginLocators.errorMessage, this.logger, aiProvider);
        this.dashboardHeader = SelfHealingLocator.from(page, loginLocators.dashboardHeader, this.logger, aiProvider);
        this.invalidLoginMessage = SelfHealingLocator.from(page, loginLocators.invalidLoginMessage, this.logger, aiProvider);
    }

    // ===================== Navigation Methods =====================

    /** Navigates the browser to the OrangeHRM login page */
    async navigateToLogin() {
        this.logger.info('Navigating to login page');
        await this.actions.goto(
            'https://opensource-demo.orangehrmlive.com/',
            'Navigate to OrangeHRM login page',
        );
        this.logger.debug(`Current URL: ${this.page.url()}`);
    }

    /**
     * Performs a complete login flow using self-healing locators.
     * Each `locator.get()` resolves the best available selector at call time.
     *
     * @param username           - Username to enter
     * @param password           - Password to enter
     * @param isPasswordSensitive - When true (default), password is masked in logs
     */
    async login(username: string, password: string, isPasswordSensitive: boolean = true) {
        this.logger.debug('Filling username field');
        await this.actions.fill(
            await this.usernameInput.get(),
            username,
            'Enter username',
            false,
        );

        this.logger.debug('Filling password field');
        await this.actions.fill(
            await this.passwordInput.get(),
            password,
            'Enter password',
            isPasswordSensitive,
        );

        this.logger.debug('Clicking login button');
        await this.actions.click(
            await this.loginButton.get(),
            'Click login button',
        );
    }

    /**
     * Returns a combined summary of actions, assertions, and self-healing outcomes
     * for all locators on this page.
     */
    getSummaries(): string {
        const actionsSummary = this.actions.getSummary();
        const assertionStats = this.assert.getAssertionStats();

        const lines = actionsSummary.split('\n');
        const summaryLines: string[] = [];
        for (const line of lines) {
            summaryLines.push(line);
            if (line.includes('Total Steps:')) {
                summaryLines.push(
                    `Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`
                );
            }
        }

        const healingReport = this.getHealingReport();
        if (healingReport) {
            summaryLines.push('\n--- Self-Healing Locator Report ---');
            summaryLines.push(healingReport);
        }

        return summaryLines.join('\n');
    }

    // ===================== Verification Methods =====================

    /** Verifies the login page has fully loaded — all key elements visible */
    async verifyLoginPageLoaded() {
        await this.assert.toBeVisible(await this.usernameInput.get(), 'Verify username field is visible', true);
        await this.assert.toBeVisible(await this.passwordInput.get(), 'Verify password field is visible', true);
        await this.assert.toBeVisible(await this.loginButton.get(), 'Verify login button is visible', true);
        await this.assert.toHaveTitle(/OrangeHRM/, 'Verify page title', true);
        await this.assert.assertAllSoftAssertions();
    }

    /** Verifies successful login: URL contains "dashboard" and header is visible */
    async verifyLoginSuccess() {
        await this.actions.waitForVisible(await this.dashboardHeader.get(), 'Wait for dashboard to load');
        await this.assert.toHaveURL(/dashboard/, 'Verify redirected to dashboard');
        await this.assert.toBeVisible(await this.dashboardHeader.get(), 'Verify dashboard header is visible');
    }

    /** Verifies failed login: error message is displayed */
    async verifyLoginFailure(expectedErrorMessage?: string) {
        await this.assert.toBeVisible(await this.errorMessage.get(), 'Verify error message is displayed');
        if (expectedErrorMessage) {
            await this.assert.toContainText(await this.errorMessage.get(), expectedErrorMessage, 'Verify error message text');
        }
    }

    /** Clicks Login with empty fields and verifies Required validation messages */
    async verifyFormValidation() {
        await this.actions.click(await this.loginButton.get(), 'Click login without credentials');
        await this.assert.toBeVisible(
            this.page.locator('.oxd-input-group .oxd-text--span').first(),
            'Verify username validation message appears', true,
        );
        await this.assert.toHaveText(
            this.page.locator('.oxd-input-group .oxd-text--span').first(),
            'Required', 'Verify validation message says Required', true,
        );
        await this.assert.assertAllSoftAssertions();
    }

    // ===================== Assertion Methods =====================

    /** Asserts that the "Invalid credentials" error message is displayed */
    async assertInvalidLoginMessage() {
        await this.assert.toHaveText(
            await this.invalidLoginMessage.get(),
            this.invalidLoginMessageText,
            'Verify invalid login message',
        );
    }

}
