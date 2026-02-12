/**
 * Global Setup — Runs ONCE before any test file executes.
 *
 * Purpose: Performs a single login to OrangeHRM and saves the authenticated
 * session (cookies, localStorage) to a JSON file (storage-state.json).
 * Tests that reference this storage state via `storageState` in the config
 * can skip the login step entirely, speeding up the suite.
 *
 * Currently commented out in playwright.config.ts but ready to enable.
 *
 * Note: This references a POManager class that may differ from POMEager/POMLazy;
 * it was part of an earlier iteration of the framework.
 */
import { chromium, FullConfig } from "@playwright/test";
import { POManager } from '../../pages/po-manager';
import tsData from '../../data/test-users';

async function globalSetup(config: FullConfig) {
    const storageStatePath = 'storage-state.json';

    // Extract the baseURL from the first project's configuration
    const { baseURL, storageState } = config.projects[0].use;

    // Launch a headless browser, log in, and save the authenticated state
    const browser = await chromium.launch({headless: true, timeout: 10000});
    const page = await browser.newPage();
    const po = new POManager(page);
    const loginPage = po.getLoginPage();
    await page.goto(baseURL!);
    await loginPage.login(tsData.username, tsData.password);

    // Save cookies and localStorage to a file so tests can reuse the session
    await page.context().storageState({ path: storageStatePath});
    await browser.close();
}

export default globalSetup;
