/**
 * Global Teardown — Runs ONCE after all test files have finished.
 *
 * Purpose: Performs cleanup operations after the entire test suite completes.
 * Currently opens the base URL in a visible browser (headless: false) and
 * immediately closes it. This can be extended with actual cleanup logic
 * (e.g., resetting test data, revoking sessions, or generating reports).
 *
 * Currently commented out in playwright.config.ts but ready to enable.
 */
import { chromium, FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
    // Extract the baseURL from the first project's configuration
    const { baseURL } = config.projects[0].use;

    // Launch browser, navigate to base URL (placeholder for cleanup logic), and close
    const browser = await chromium.launch({headless: false, timeout: 10000});
    const page = await browser.newPage();
    await page.goto(baseURL!);
    await browser.close();
}

export default globalTeardown;
