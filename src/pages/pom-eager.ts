import { type Page } from "@playwright/test";
import { LoginPage } from "./login-page";
import { HomePage } from "./home-page";

/**
 * POMEager — Page Object Manager with Eager Initialization.
 *
 * All page objects (LoginPage, HomePage, etc.) are instantiated immediately
 * when POMEager is constructed. This ensures every page is ready to use
 * without any lazy-loading logic, at the cost of allocating all page objects
 * upfront even if only some are used during a test.
 *
 * Trade-offs vs POMLazy:
 *   + Simpler — no null checks or lazy getters
 *   + All initialization errors surface immediately in the constructor
 *   - Uses more memory if many page objects exist but only a few are needed
 *
 * Typically used via the pom-eager-fixture which provides this as a fixture value.
 */
export class POMEager {
    private readonly page: Page;
    private readonly loginPage: LoginPage;
    private readonly homePage: HomePage;

    // ===================== Constructor =====================
    /**
     * Creates and stores all page object instances immediately.
     * @param page - Playwright Page instance from the test
     * @param testName - Label for log files created by each page's helpers
     */
    constructor(page: Page, testName: string = "") {
        this.page = page;
        this.loginPage = new LoginPage(this.page, testName);
        this.homePage = new HomePage(this.page, testName);
    }

    // ===================== Getters =====================

    /** Returns the pre-created LoginPage instance */
    getLoginPage() {
        return this.loginPage;
    }

    /** Returns the pre-created HomePage instance */
    getHomePage() {
        return this.homePage;
    }
}
