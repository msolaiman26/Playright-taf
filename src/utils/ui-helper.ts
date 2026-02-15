/**
 * UI Helper — Visual regression testing and frontend performance utilities.
 *
 * Provides reusable functions for:
 *   - Visual regression checks (full-page screenshot comparison with configurable diff tolerance)
 *   - Lighthouse CI performance auditing via the LHCI command-line tool
 *   - Attaching generated HTML reports to Playwright test results
 *
 * Note: References a POManager class from an earlier framework iteration.
 */
import { test, expect, type Page, TestInfo } from "@playwright/test";
import { POManager } from "../pages/po-manager";
import * as fs from "fs";
import { exec } from "child_process";
import path from "path";
import { Logger } from './Logger';

const logger = Logger.getLogger('ui-helper');
let poManager: POManager;

/**
 * Resizes the browser viewport to the specified dimensions.
 * Preserves the current width or height if not provided.
 * Logged as a Playwright test.step for report visibility.
 */
async function resizeViewport(page: Page, viewport: { width?: number; height?: number }) {
    if (!viewport.width) viewport.width = page.viewportSize()!.width;
    if (!viewport.height) viewport.height = page.viewportSize()!.height;
    await test.step(`I resize my emulator screen to 'width: ${viewport.width}, height: ${viewport.height}'`, async () => {
        await page.setViewportSize({ width: viewport.width ?? 1280, height: viewport.height ?? 720 });
    });
}

/**
 * Performs a full-page visual regression check.
 * Temporarily resizes the viewport to capture the full page height,
 * takes a screenshot, compares it against the baseline (soft assertion),
 * then resets the viewport to its original size.
 * @param page - Playwright Page instance
 * @param maxDiffRatio - Maximum allowed ratio of differing pixels (0 = pixel-perfect)
 */
async function performVisualCheck(page: Page, maxDiffRatio?: number) {
    poManager = new POManager(page);
    await test.step(`I perform a visual check on the page`, async () => {
        // generally before calling this function, we wait for elements to be visible
        // await poManager.getCommonPage()?.assertLoaderNotExist(); // we make sure loader is not visible on top of element

        // adjust the viewport size to fit full height of the screen
        const originalHeight = page.viewportSize()?.height ?? 720;
        const currentPageHeight = await page.evaluate(() => document.body.scrollHeight);
        await resizeViewport(page, { height: currentPageHeight });

        await expect.soft(page).toHaveScreenshot({
            maxDiffPixelRatio: maxDiffRatio,
            fullPage: true
        });

        // reset to viewport size to the one defined in config
        await resizeViewport(page, { height: originalHeight });
    });
}
/** Attaches a Lighthouse HTML report to the Playwright test results if the file exists */
async function attachLHReport(reportPath: string, testInfo: TestInfo) {
    if (fs.existsSync(reportPath)) {
        await testInfo.attach('Lighthouse Report', {
            path: reportPath,
            contentType: 'text/html',
        });
    }
}


/**
 * Runs Lighthouse CI (lhci autorun) to audit frontend performance.
 * Executes the LHCI CLI as a child process, logs the output, and
 * attaches the generated HTML report to the Playwright test results.
 */
async function checkFEPerformance(testInfo: TestInfo) {
    const reportRootPath = './lhci-reports';
    let reportPath = `${reportRootPath}/lh-report.html`;
    
    await test.step(`I check the frontend performance of the internal website`, async () => {
        const lhciPath = path.resolve('./node_modules/.bin/lhci');
        const command = `"${lhciPath}" autorun`;
        
        return new Promise<void>((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                logger.info(`Checking frontend performance for the website using lighthouse...`);
                if (error) {
                    logger.error(`Error: ${error.message}`);
                    reject(error);
                    // return;
                }
                // if (stderr) {
                //     logger.warn(`STDERR: ${stderr}`);
                // }
                logger.info(`Lighthouse Output:\n${stdout}`);
                attachLHReport(reportPath, testInfo);
                resolve();
            });
        });
    });
}

export default { performVisualCheck, checkFEPerformance };