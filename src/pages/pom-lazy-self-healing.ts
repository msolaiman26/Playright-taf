import { type Page } from '@playwright/test';
import { LoginPageSelfHealing } from './login-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { type AIHealingProvider } from '../utils/self-healing-locator';

/**
 * POMLazySelfHealing — Page Object Manager with Lazy Initialization.
 *
 * Mirrors `pom-lazy.ts` in structure. Wires `LoginPageSelfHealing` and
 * `HomePageSelfHealing` instead of the originals, and forwards the optional
 * `AIHealingProvider` to each page so locators can reach Phase 3 (AI) healing.
 *
 * Providing an `aiProvider` is optional — without one, the locators still
 * auto-heal via Playwright semantic strategies (Phase 2).
 *
 * The AI provider is resolved automatically by `self-healing-fixture.ts` from
 * env vars — use that fixture in tests rather than constructing this directly.
 */
export class POMLazySelfHealing {
    private readonly page: Page;
    private readonly _testName?: string;
    private readonly _aiProvider?: AIHealingProvider;
    private _loginPage?: LoginPageSelfHealing;
    private _homePage?: HomePageSelfHealing;

    /**
     * @param page       - Playwright Page instance from the test
     * @param testName   - Optional label for log file naming
     * @param aiProvider - Optional AI backend forwarded to every page's locators
     */
    constructor(page: Page, testName?: string, aiProvider?: AIHealingProvider) {
        this.page = page;
        this._testName = testName;
        this._aiProvider = aiProvider;
    }

    // ===================== Lazy Getters =====================

    /** Returns the LoginPageSelfHealing instance, creating it on first access */
    get loginPage(): LoginPageSelfHealing {
        if (!this._loginPage) {
            this._loginPage = new LoginPageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._loginPage;
    }

    /** Returns the HomePageSelfHealing instance, creating it on first access */
    get homePage(): HomePageSelfHealing {
        if (!this._homePage) {
            this._homePage = new HomePageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._homePage;
    }

    /**
     * Returns a combined healing report for every page object that was accessed
     * during the test. Pages that were never initialised are silently skipped.
     * The fixture calls this single method — it never inspects individual locators.
     */
    getHealingReport(): string {
        const sections: string[] = [];
        if (this._loginPage) {
            const r = this._loginPage.getHealingReport();
            if (r) sections.push(r);
        }
        if (this._homePage) {
            const r = this._homePage.getHealingReport();
            if (r) sections.push(r);
        }
        return sections.length > 0
            ? sections.join('\n')
            : '(no locators were exercised during this test)';
    }
}
