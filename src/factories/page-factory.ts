/**
 * Page Factory Pattern
 *
 * Centralizes page object creation logic across the framework.
 * Provides consistent instantiation with optional configuration.
 *
 * Benefits:
 * - Single source of truth for page object creation
 * - Easy to add pre/post-creation hooks (logging, initialization)
 * - Consistent constructor parameters across all page objects
 * - Reduces duplication in fixtures and tests
 * - Can add caching/pooling in the future
 *
 * Usage Examples:
 *
 * // Create single page object
 * const loginPage = PageFactory.createLoginPage(page, 'My Test');
 *
 * // Create multiple pages at once
 * const { loginPage, homePage } = PageFactory.createAllPages(page, 'My Test');
 *
 * // Create page by class type (generic)
 * const customPage = PageFactory.createPage(CustomPage, page, 'My Test');
 */

import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { HomePage } from '../pages/home-page';
import winston from "winston";
import { Logger } from "../utils/Logger";

export class PageFactory {
    /**
     * Create a LoginPage instance
     */
    static createLoginPage(page: Page, testName: string): LoginPage {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating LoginPage for test: ${testName}`);
        return new LoginPage(page, testName);
    }

    /**
     * Create a HomePage instance
     */
    static createHomePage(page: Page, testName: string): HomePage {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating HomePage for test: ${testName}`);
        return new HomePage(page, testName);
    }

    /**
     * Create all standard pages at once
     * Returns an object with all page instances
     */
    static createAllPages(page: Page, testName: string): {
        loginPage: LoginPage;
        homePage: HomePage;
    } {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating all pages for test: ${testName}`);

        return {
            loginPage: this.createLoginPage(page, testName),
            homePage: this.createHomePage(page, testName)
        };
    }

    /**
     * Generic factory method - create any page by class type
     * Useful for extending with custom page objects
     *
     * Usage:
     *   const myPage = PageFactory.createPage(MyCustomPage, page, 'test');
     */
    static createPage<T>(
        PageClass: new (page: Page, testName: string) => T,
        page: Page,
        testName: string
    ): T {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating ${PageClass.name} for test: ${testName}`);
        return new PageClass(page, testName);
    }

    /**
     * Create multiple pages of specific types
     * Useful when you only need a subset of pages
     *
     * Usage:
     *   const pages = PageFactory.createPages(
     *       [LoginPage, HomePage],
     *       page,
     *       'test'
     *   );
     */
    static createPages<T>(
        PageClasses: Array<new (page: Page, testName: string) => any>,
        page: Page,
        testName: string
    ): any[] {
        const logger = Logger.getLogger('PageFactory');
        logger.debug(`Creating ${PageClasses.length} pages for test: ${testName}`);

        return PageClasses.map(PageClass => new PageClass(page, testName));
    }
}
