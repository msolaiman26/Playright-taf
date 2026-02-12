/**
 * Lighthouse Helper — Performance auditing with playwright-lighthouse and LHCI.
 *
 * Provides two approaches to Lighthouse performance testing:
 *
 * 1. checkFEPerformance():      Uses playwright-lighthouse (playAudit) to run
 *                                Lighthouse against an authenticated page via Chrome DevTools Protocol.
 *                                Requires a persistent browser context with --remote-debugging-port=9222.
 *
 * 2. checkFEPerformanceUsingLHCI(): Uses the Lighthouse CI CLI (lhci autorun) as a child process.
 *                                   Simpler but does not support authenticated sessions by default.
 *
 * Both approaches generate HTML reports and attach them to Playwright test results.
 *
 * Thresholds (approach 1): Performance 90, Accessibility 90, Best Practices 90, SEO 90
 * Reports are saved to: ./lh-reports/ (approach 1) or ./lhci-reports/ (approach 2)
 */
import { test, TestInfo, chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
// import { playAudit } from "playwright-lighthouse";
import tsData from '../data/test-users';
import { LoginPage } from "../pages/login-page";
import { exec } from 'child_process';

let context; // Persistent browser context — kept alive so Lighthouse can connect via CDP

/**
 * Launches a Chromium persistent context with remote debugging enabled on port 9222.
 * The persistent context preserves cookies/sessions across pages, which is
 * required so Lighthouse can audit pages behind authentication.
 * @returns A new Page within the persistent context
 */
async function openChromeContext() {
    const userDataDir = path.join(os.tmpdir(), 'pw', String(Math.random()));
    context = await chromium.launchPersistentContext(userDataDir, {
        args: ['--remote-debugging-port=9222']
        });
    const page = await context.newPage();
    return page;
}

/**
 * Opens a persistent Chrome context and logs in to OrangeHRM.
 * Returns the authenticated Page so Lighthouse can audit protected routes.
 */
async function loginToPortal() {
    let page = await openChromeContext();
    //Login steps
    const username = tsData!.username;
    const password = tsData!.password;
    const loginPage= new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);
    return page;
}

/**
 * Runs a full Lighthouse audit on an authenticated page using playwright-lighthouse.
 * Logs in, navigates to pageURL, runs the audit with score thresholds,
 * generates JSON/HTML/CSV reports, and attaches the HTML report to the test.
 * @param testInfo - Playwright TestInfo for attaching artifacts
 * @param pageURL - The URL to audit (should be a protected page)
 */
async function checkFEPerformance(testInfo: TestInfo, pageURL?: string) {
    const reportRootPath = './lh-reports';
    let reportPath = './lh-reports/lh-report.html';
    let page = await loginToPortal();
     await page.goto(pageURL);
    reportPath = `${reportRootPath}/lh-report.html`;

    await test.step(`I check the frontend performance of OrangeHRM website`, async () => {
        // When lighthouse opens a new page the storage will be persisted meaning the new page will have the same user session
        try {
            const { playAudit } = await import('playwright-lighthouse');
            await playAudit({
            page: page,
            thresholds: {
                performance: 90,
                accessibility: 90,
                'best-practices': 90,
                seo: 90
            },
            port: 9222,
            //Generate the report in the specified path
            reports: {
                formats: {
                json: true, //defaults to false
                html: true, //defaults to false
                csv: true, //defaults to false
                },
                name: `lh-report`, //defaults to `lighthouse-${new Date().getTime()}`
                directory: `lh-reports`, //defaults to `${process.cwd()}/lighthouse`
            },
        });
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            test.fail();
        }
        await context.close();
        console.log(`✅ Lighthouse performance check completed for OrangeHRM website.`);
        attachLHReport(reportPath, testInfo);
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
 * Alternative Lighthouse audit using the LHCI CLI (lhci autorun).
 * Executes LHCI as a child process and attaches the generated report.
 * @param testInfo - Playwright TestInfo for attaching artifacts
 * @param portalName - Portal identifier for report path resolution (default: 'internal')
 */
async function checkFEPerformanceUsingLHCI(testInfo: TestInfo, portalName: string = 'internal') {
    const reportRootPath = './lhci-reports';
    let reportPath = './lhci-reports';
    if (portalName === 'internal') {
        reportPath = `${reportRootPath}/lh-report.html`;
    }
    
    await test.step(`I check the frontend performance of OrangeHRM website`, async () => {
        const lhciPath = path.resolve('./node_modules/.bin/lhci');
        const command = `"${lhciPath}" autorun`;
        
        return new Promise<void>((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                console.log(`Checking frontend performance for OrangeHRM website using lighthouse...`);
                if (error) {
                    console.error(`❌ Error: ${error.message}`);
                    reject(error);
                    // return;
                }
                // if (stderr) {
                //     console.error(`⚠️ STDERR: ${stderr}`);
                // }
                console.log(`✅ Lighthouse Output:\n${stdout}`);
                attachLHReport(reportPath, testInfo);
                resolve();
            });
        });
    });
}

export default { checkFEPerformance, checkFEPerformanceUsingLHCI };
