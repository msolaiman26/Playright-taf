import { type Page } from '@playwright/test';
import type { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import type { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import winston from 'winston';
import { Logger } from '../utils/Logger';
import { HelperFactory } from '../factories/helper-factory';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { SelfHealingPageBase } from './self-healing-page-base';
import { homeLocators } from '../locators/home-page-locators';

/**
 * Home Page (Dashboard) — Self-Healing variant.
 *
 * Mirrors `home-page.ts` in public API.
 * The profile icon locator uses `SelfHealingLocator` with semantic metadata so
 * Playwright's built-in locator strategies (getByRole, getByAltText, …) are tried
 * automatically when the primary XPath fails — and the AI provider is invoked as
 * a last resort if all semantic strategies also fail.
 */
export class HomePageSelfHealing extends SelfHealingPageBase {
    // ===================== Properties =====================
    readonly page: Page;
    private readonly logger: winston.Logger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;
    readonly profile_icn: SelfHealingLocator;

    // ===================== Constructor =====================
    /**
     * @param page       - Playwright Page instance from the test
     * @param testName   - Optional label for log file naming
     * @param aiProvider - Optional AI backend for Phase 3 healing
     */
    constructor(page: Page, testName?: string, aiProvider?: AIHealingProvider) {
        super();
        this.page = page;
        this.logger = Logger.getLogger(`HomePageSelfHealing-${testName || 'HomePageSelfHealing'}`);
        const helpers = HelperFactory.createHelpers(page, testName || 'HomePageSelfHealing');
        this.actions = helpers.actions;
        this.assert = helpers.assert;

        this.profile_icn = new SelfHealingLocator(page,
            "//img[@class='oxd-userdropdown-img']",
            {
                role: 'img',
                altText: 'profile picture',
                description: 'User profile dropdown image in the OrangeHRM top navigation bar',
            },
            this.logger, aiProvider,
        );
    }

    // ===================== Assertions =====================

    /** Verifies the user profile icon is visible — confirms the user is logged in */
    async assertProfileIcon() {
        this.logger.info('Verifying profile icon is visible');
        await this.assert.toBeVisible(
            await this.profile_icn.get(),
            'Verify profile icon is visible',
        );
    }

}
