import { type Page } from "@playwright/test";
import { HomePage } from "./home-page";
import { LoginPage } from "./login-page";

/**
 * POMLazy — Page Object Manager with Lazy Initialization.
 *
 * Page objects are NOT created in the constructor. Instead, they are
 * instantiated on-demand the first time their getter is accessed.
 * Subsequent accesses return the cached instance (singleton per test run).
 *
 * Trade-offs vs POMEager:
 *   + Memory efficient — only allocates page objects that are actually used
 *   + Faster construction when many pages exist but few are needed
 *   - Slightly more complex internal logic (null checks + caching)
 *
 * Typically used via the pom-lazy-fixture which provides this as a fixture value.
 */
export class POMLazy {
    private readonly page: Page;
    private readonly _testName?: string;
    private _loginPage?: LoginPage;   // Cached LoginPage instance (created on first access)
    private _homePage?: HomePage;     // Cached HomePage instance (created on first access)

    // ===================== Constructor =====================
    /**
     * Stores references but does NOT create any page objects yet.
     * @param page - Playwright Page instance from the test
     * @param testName - Optional label for log files
     */
    constructor(page: Page, testName?: string) {
        this.page = page;
        this._testName = testName;
    }

    // ===================== Lazy Getters =====================
    // Each getter creates the page object on first access, then returns the cached instance.

    /** Returns the LoginPage instance, creating it on first access */
    get loginPage(): LoginPage {
        if (!this._loginPage) {
            this._loginPage = new LoginPage(this.page, this._testName ?? "");
        }
        return this._loginPage;
    }

    /** Returns the HomePage instance, creating it on first access */
    get homePage(): HomePage {
        if (!this._homePage) {
            this._homePage = new HomePage(this.page, this._testName ?? "");
        }
        return this._homePage;
    }
}
