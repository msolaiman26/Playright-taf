import { type Locator, type Page } from "@playwright/test";
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { Logger as Log4jsLogger } from 'log4js';
import { Logger } from '../utils/Logger';

/**
 * Home Page (Dashboard) Page Object Model.
 *
 * Represents the OrangeHRM dashboard page that appears after successful login.
 * Currently provides profile icon assertion — extend this class as more
 * dashboard-related interactions or verifications are needed.
 */
export class HomePage{
    // ===================== Properties =====================
    readonly page: Page;                                // Playwright Page instance
    private readonly logger: Log4jsLogger;              // log4js logger for this page
    readonly actions: AdvancedActionsHelper;             // Logged action helper for page interactions
    readonly assert: AdvancedAssertionsHelper;           // Logged assertion helper for verifications
    readonly profile_icn: Locator;                       // User profile dropdown icon (top-right corner)

    // ===================== Constructor =====================
    /**
     * @param page - Playwright Page instance from the test
     * @param testName - Optional test name for log file labeling (defaults to "HomePage")
     */
    constructor(page: Page, testName?: string) {
        this.page = page;
        this.logger = Logger.getLogger(`HomePage-${testName || 'HomePage'}`);
        this.actions = new AdvancedActionsHelper(page, testName || 'HomePage');
        this.assert = new AdvancedAssertionsHelper(page, testName || 'HomePage');
        this.profile_icn = page.locator("//img[@class='oxd-userdropdown-img']");
    }

    // ===================== Assertions =====================

    /** Verifies the user profile icon is visible, confirming the user is logged in and on the dashboard */
    async assertProfileIcon(){
        this.logger.info("Verifying profile icon is visible");
        await this.assert.toBeVisible(this.profile_icn, 'Verify profile icon is visible');
    }
}