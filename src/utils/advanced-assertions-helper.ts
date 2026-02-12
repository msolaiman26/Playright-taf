import { Locator, Page, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * AdvancedAssertionsHelper — A comprehensive assertion library with logging,
 * soft/hard assertion modes, and automatic failure diagnostics.
 *
 * Features:
 *   - Dual logging: every assertion result is printed to console AND written to a log file
 *   - Soft assertions: when `soft: true`, failures are collected instead of throwing immediately.
 *     Call `assertAllSoftAssertions()` at the end to fail the test with all collected errors.
 *   - Hard assertions (default): failures throw immediately, stopping the test
 *   - Screenshot on failure: captures a full-page screenshot for every failed assertion
 *   - Assertion statistics: track total/passed/failed counts via getAssertionStats()
 *
 * Assertion categories:
 *   - Visibility:  toBeVisible, toBeHidden
 *   - Text:        toHaveText, toContainText
 *   - Value:       toHaveValue, toBeEmpty
 *   - Count:       toHaveCount
 *   - State:       toBeEnabled, toBeDisabled, toBeChecked, toBeEditable, toBeFocused
 *   - Attributes:  toHaveAttribute, toHaveClass, toHaveCSS
 *   - URL/Page:    toHaveURL, toHaveTitle
 *   - Custom:      toBeTruthy, toBeFalsy, toEqual, toContain, toBeGreaterThan, toBeLessThan
 *
 * Log files: <project-root>/test-logs/<testName>_assertions_<timestamp>.log
 * Failure screenshots: <project-root>/test-logs/assertion-failures/
 */
export class AdvancedAssertionsHelper {
    readonly page: Page;
    private assertionCounter: number = 0;   // Running count of all assertions executed
    private logFilePath: string;             // Absolute path to the assertion log file
    private screenshotDir: string;           // Directory for assertion failure screenshots

    /**
     * Accumulated soft assertion failures. Each entry stores the assertion number,
     * description, the caught error, and an optional screenshot path.
     * These are only populated when assertions run with `soft: true`.
     */
    private softAssertionErrors: Array<{
        assertionNumber: number;
        description: string;
        error: Error;
        screenshotPath?: string;
    }> = [];

    /**
     * Creates a new AdvancedAssertionsHelper and initializes the assertion log file.
     * @param page - Playwright Page instance for screenshot capture and page-level assertions
     * @param testName - Used to generate a unique, human-readable log file name
     */
    constructor(page: Page, testName?: string) {
        this.page = page;

        // Generate a timestamp-based file name, sanitizing special characters
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = testName?.replace(/[^a-z0-9]/gi, '_') || 'test';
        this.logFilePath = path.join(process.cwd(), 'test-logs', `${safeName}_assertions_${timestamp}.log`);

        // Configure screenshot output directory for assertion failures
        this.screenshotDir = path.join(process.cwd(), 'test-logs', 'assertion-failures');

        // Ensure directories exist before any writes
        this.ensureDirectoryExists(path.dirname(this.logFilePath));
        this.ensureDirectoryExists(this.screenshotDir);

        // Write the log file header
        this.writeToLogFile(`=== Assertion Test Started: ${safeName} ===\n`);
        this.writeToLogFile(`Timestamp: ${new Date().toISOString()}\n\n`);
    }

    /** Creates a directory (and parents) if it does not already exist */
    private ensureDirectoryExists(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /** Appends a message to the assertion log file (synchronous I/O) */
    private writeToLogFile(message: string) {
        fs.appendFileSync(this.logFilePath, message);
    }

    /**
     * Logs a timestamped message to both console and the log file.
     * FAILED and SOFT_FAIL messages are routed to console.error for visibility.
     */
    private async log(level: 'ASSERTION' | 'PASSED' | 'FAILED' | 'DATA' | 'SOFT_FAIL', message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;

        // Console log
        if (level === 'FAILED' || level === 'SOFT_FAIL') {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }

        // File log
        this.writeToLogFile(logMessage + '\n');
    }

    /** Captures a full-page screenshot when an assertion fails. Returns the screenshot path. */
    private async captureFailureScreenshot(assertionName: string): Promise<string> {
        const timestamp = Date.now();
        const screenshotName = `assertion-fail-${assertionName.replace(/\s+/g, '-')}-${timestamp}.png`;
        const screenshotPath = path.join(this.screenshotDir, screenshotName);

        try {
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            await this.log('DATA', `Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            await this.log('FAILED', `Could not capture screenshot: ${error}`);
            return '';
        }
    }

    /**
     * Core assertion engine. All public assertion methods delegate to this.
     *
     * Workflow:
     *  1. Increments the assertion counter and logs the assertion start
     *  2. Executes the provided assertion function
     *  3. On success: logs PASSED with duration
     *  4. On failure:
     *     - Captures a screenshot
     *     - If soft=true:  records the error for later (test continues)
     *     - If soft=false: re-throws immediately (test stops)
     *
     * @param description - Human-readable label for this assertion
     * @param assertionFn - The actual Playwright expect() call wrapped in an async function
     * @param soft - When true, failures are collected instead of thrown
     */
    private async handleAssertion(
        description: string,
        assertionFn: () => Promise<void>,
        soft: boolean = false
    ) {
        this.assertionCounter++;
        const assertionLabel = `Assertion #${this.assertionCounter}`;
        const type = soft ? 'SOFT' : 'HARD';

        await this.log('ASSERTION', `${assertionLabel} [${type}]: ${description}`);
        const startTime = Date.now();

        try {
            await assertionFn();
            const duration = Date.now() - startTime;
            await this.log('PASSED', `${assertionLabel}: ${description} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            const screenshotPath = await this.captureFailureScreenshot(description);

            if (soft) {
                await this.log('SOFT_FAIL', `${assertionLabel}: ${description} (${duration}ms) - ${(error as Error).message}`);
                this.softAssertionErrors.push({
                    assertionNumber: this.assertionCounter,
                    description,
                    error: error as Error,
                    screenshotPath
                });
            } else {
                await this.log('FAILED', `${assertionLabel}: ${description} (${duration}ms) - ${(error as Error).message}`);
                throw error;
            }
        }
    }

    // ============ VISIBILITY ASSERTIONS ============

    async toBeVisible(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is visible';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeVisible();
        }, soft);
    }

    async toBeHidden(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is hidden';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeHidden();
        }, soft);
    }

    // ============ TEXT ASSERTIONS ============

    async toHaveText(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has text: "${expected}"`;
        await this.log('DATA', `Expected text: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveText(expected);
        }, soft);
    }

    async toContainText(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element contains text: "${expected}"`;
        await this.log('DATA', `Expected to contain: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toContainText(expected);
        }, soft);
    }

    // ============ VALUE ASSERTIONS ============

    async toHaveValue(locator: Locator, expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert input has value: "${expected}"`;
        await this.log('DATA', `Expected value: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveValue(expected);
        }, soft);
    }

    async toBeEmpty(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert input is empty';

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEmpty();
        }, soft);
    }

    // ============ COUNT ASSERTIONS ============

    async toHaveCount(locator: Locator, expected: number, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element count is ${expected}`;
        await this.log('DATA', `Expected count: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveCount(expected);
        }, soft);
    }

    // ============ STATE ASSERTIONS ============

    async toBeEnabled(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is enabled';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEnabled();
        }, soft);
    }

    async toBeDisabled(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is disabled';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeDisabled();
        }, soft);
    }

    async toBeChecked(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert checkbox/radio is checked';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeChecked();
        }, soft);
    }

    async toBeEditable(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is editable';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEditable();
        }, soft);
    }

    async toBeFocused(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is focused';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeFocused();
        }, soft);
    }

    // ============ ATTRIBUTE ASSERTIONS ============

    async toHaveAttribute(locator: Locator, name: string, value: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has attribute "${name}" with value "${value}"`;
        await this.log('DATA', `Attribute: ${name}, Expected: ${value}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveAttribute(name, value);
        }, soft);
    }

    async toHaveClass(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has class: "${expected}"`;
        await this.log('DATA', `Expected class(es): ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveClass(expected);
        }, soft);
    }

    async toHaveCSS(locator: Locator, name: string, value: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has CSS "${name}": "${value}"`;
        await this.log('DATA', `CSS Property: ${name}, Expected: ${value}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveCSS(name, value);
        }, soft);
    }

    // ============ URL ASSERTIONS ============

    async toHaveURL(expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert page URL is "${expected}"`;
        await this.log('DATA', `Expected URL: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(this.page).toHaveURL(expected);
        }, soft);
    }

    async toHaveTitle(expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert page title is "${expected}"`;
        await this.log('DATA', `Expected title: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(this.page).toHaveTitle(expected);
        }, soft);
    }

    // ============ CUSTOM ASSERTIONS ============

    async toBeTruthy(value: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert value is truthy`;
        await this.log('DATA', `Value: ${JSON.stringify(value)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(value).toBeTruthy();
        }, soft);
    }

    async toBeFalsy(value: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert value is falsy`;
        await this.log('DATA', `Value: ${JSON.stringify(value)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(value).toBeFalsy();
        }, soft);
    }

    async toEqual(actual: any, expected: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert values are equal`;
        await this.log('DATA', `Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toEqual(expected);
        }, soft);
    }

    async toContain(haystack: string | any[], needle: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert contains value`;
        await this.log('DATA', `Haystack: ${JSON.stringify(haystack)}, Needle: ${JSON.stringify(needle)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(haystack).toContain(needle);
        }, soft);
    }

    async toBeGreaterThan(actual: number, expected: number, description: string, soft: boolean = false) {
        const logMessage = description || `Assert ${actual} > ${expected}`;
        await this.log('DATA', `Actual: ${actual}, Expected (greater than): ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toBeGreaterThan(expected);
        }, soft);
    }

    async toBeLessThan(actual: number, expected: number, description: string, soft: boolean = false) {
        const logMessage = description || `Assert ${actual} < ${expected}`;
        await this.log('DATA', `Actual: ${actual}, Expected (less than): ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toBeLessThan(expected);
        }, soft);
    }

    // ============ SOFT ASSERTION MANAGEMENT ============

    /**
     * Returns the count of soft assertion failures
     */
    getSoftAssertionFailureCount(): number {
        return this.softAssertionErrors.length;
    }

    /**
     * Gets all soft assertion failures
     */
    getSoftAssertionFailures(): Array<{ assertionNumber: number; description: string; error: Error; screenshotPath?: string }> {
        return this.softAssertionErrors;
    }

    /**
     * Throws an error if there are any soft assertion failures
     */
    async assertAllSoftAssertions() {
        if (this.softAssertionErrors.length > 0) {
            const errorDetails = this.softAssertionErrors
                .map((failure, index) => {
                    const screenshot = failure.screenshotPath ? `\n   Screenshot: ${failure.screenshotPath}` : '';
                    return `${index + 1}. [Assertion #${failure.assertionNumber}] ${failure.description}\n   Error: ${failure.error.message}${screenshot}`;
                })
                .join('\n\n');

            const summary = `\n${'='.repeat(80)}\nSOFT ASSERTION FAILURES SUMMARY\n${'='.repeat(80)}\nTotal Failures: ${this.softAssertionErrors.length}\nTotal Assertions: ${this.assertionCounter}\n${'='.repeat(80)}\n\n${errorDetails}\n\n${'='.repeat(80)}`;

            await this.log('FAILED', `${this.softAssertionErrors.length} soft assertion(s) failed`);
            this.writeToLogFile(summary + '\n');
            console.error(summary);

            throw new Error(`${this.softAssertionErrors.length} soft assertion(s) failed. See log file: ${this.logFilePath}`);
        } else {
            const successMessage = `All ${this.assertionCounter} assertions passed!`;
            await this.log('PASSED', successMessage);
        }
    }

    /**
     * Clears all soft assertion failures
     */
    clearSoftAssertions() {
        this.softAssertionErrors = [];
        this.writeToLogFile('\n--- Soft assertions cleared ---\n\n');
    }

    /**
     * Gets assertion statistics
     */
    getAssertionStats(): { total: number; passed: number; failed: number } {
        return {
            total: this.assertionCounter,
            passed: this.assertionCounter - this.softAssertionErrors.length,
            failed: this.softAssertionErrors.length
        };
    }

    /**
     * Get test summary
     */
/*     getSummary(): string {
        const stats = this.getAssertionStats();
        const summary = `\n=== Assertion Test Summary ===\nTotal Steps: ${this.stepCounter}\nTotal Assertions: ${stats.total}\nPassed: ${stats.passed}\nFailed: ${stats.failed}\nLog File: ${this.logFilePath}\n`;
        this.writeToLogFile(summary);
        return summary;
    } */
}
