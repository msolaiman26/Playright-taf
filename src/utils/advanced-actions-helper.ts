import { Locator, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import winston from "winston";
import { Logger } from "../utils/Logger";
import { StepRunner } from "../utils/step-runner";

/**
 * AdvancedActionsHelper — A wrapper around common Playwright page interactions
 * that adds comprehensive logging, step tracking, and failure diagnostics.
 *
 * Features:
 *   - Logging via Winston: every action is logged to console and file
 *   - Playwright test.step() integration: every action appears in the HTML report
 *   - Automatic step numbering (Step 1, Step 2, ...) in log files for traceability
 *   - Performance timing: each action records its duration in milliseconds
 *   - Screenshot on failure: when an action throws, a full-page screenshot is saved
 *   - Sensitive data masking: the fill() method can mask passwords in log output
 *
 * Ownership of step identity is split by concern:
 *   - StepRunner (Playwright report): uses the plain description as the step title
 *   - Winston (log files): prefixes with "Step N:" for sequential ordering in text
 *
 * Each Page Object (LoginPage, HomePage, etc.) creates its own instance of this class
 * so that logs are separated per test and per page.
 */
export class AdvancedActionsHelper {
    readonly page: Page;
    private readonly logger: winston.Logger;
    private stepCounter: number = 0;       // Auto-incrementing counter for sequential step labels in log files
    private screenshotDir: string;          // Directory where failure screenshots are stored

    /**
     * Creates a new AdvancedActionsHelper and initializes logging.
     * @param page - Playwright Page instance to perform actions on
     * @param testName - Used to label log output for this helper instance
     */
    constructor(page: Page, testName?: string) {
        this.page = page;
        this.logger = Logger.getLogger(`Actions-${testName || "default"}`);

        // Configure screenshot output directory
        this.screenshotDir = path.join(process.cwd(), 'test-logs', 'failure-screenshots');
        this.ensureDirectoryExists(this.screenshotDir);

        this.logger.info(`=== Actions Helper Started: ${testName || "default"} ===`);
    }

    /** Creates a directory (and parents) if it does not already exist */
    private ensureDirectoryExists(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Captures a full-page screenshot when an action fails.
     * The screenshot file name includes the failed action and a timestamp to ensure uniqueness.
     * @returns The file path of the saved screenshot, or empty string if capture failed
     */
    private async captureFailureScreenshot(actionName: string): Promise<string> {
        const timestamp = Date.now();
        const screenshotName = `failure-${actionName.replace(/\s+/g, '-')}-${timestamp}.png`;
        const screenshotPath = path.join(this.screenshotDir, screenshotName);

        try {
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            this.logger.error(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            this.logger.error(`Could not capture screenshot: ${error}`);
            return '';
        }
    }

    /**
     * Navigates to the given URL with logging and performance measurement.
     * Waits for "domcontentloaded" event before resolving.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param url - The URL to navigate to
     * @param description - Optional human-readable description for log output
     */
    async goto(url: string, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || `Navigate to ${url}`;

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                await this.page.goto(url, { waitUntil: 'domcontentloaded' });
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Clicks an element with logging. Before clicking, logs the element's visibility and enabled state
     * so failures can be diagnosed from the log file alone.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param locator - Playwright Locator pointing to the target element
     * @param description - Optional human-readable description for log output
     */
    async click(locator: Locator, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Click element';

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                const isVisible = await locator.isVisible();
                const isEnabled = await locator.isEnabled();
                this.logger.debug(`Element state - Visible: ${isVisible}, Enabled: ${isEnabled}`);

                await locator.click();
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Fills an input field with text. Sensitive values (e.g., passwords) are masked
     * as "***MASKED***" in the log output when isSensitive is true.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param locator - Playwright Locator pointing to the input element
     * @param value - The text to type into the field
     * @param description - Optional human-readable description for log output
     * @param isSensitive - When true, the actual value is replaced with "***MASKED***" in logs
     */
    async fill(locator: Locator, value: string, description?: string, isSensitive: boolean = false) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Fill input field';

        await StepRunner.run(logMessage, async () => {
            const displayValue = isSensitive ? '***MASKED***' : `"${value}"`;
            this.logger.debug(`Input value: ${displayValue}`);
            const startTime = Date.now();

            try {
                await locator.clear();
                await locator.fill(value);
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Waits for an element to become visible within the specified timeout.
     * Useful before interacting with elements that load asynchronously.
     * @param locator - Playwright Locator for the target element
     * @param description - Optional human-readable description for log output
     * @param timeout - Maximum wait time in ms (default 30s)
     */
    async waitForVisible(locator: Locator, description?: string, timeout: number = 30000) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Wait for element to be visible';

        await StepRunner.run(logMessage, async () => {
            this.logger.debug(`Timeout: ${timeout}ms`);
            const startTime = Date.now();

            try {
                await locator.waitFor({ state: 'visible', timeout });
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Timeout or Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Extracts the text content of an element and logs it.
     * Returns empty string if the element has no text.
     * @param locator - Playwright Locator for the target element
     * @param description - Optional human-readable description for log output
     * @returns The text content of the element
     */
    async getText(locator: Locator, description?: string): Promise<string> {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Get text content';

        return await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                const text = await locator.textContent() || '';
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
                this.logger.debug(`Retrieved text: "${text}"`);
                return text;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Logs a custom assertion result (pass/fail) without running Playwright's expect().
     * Captures a screenshot if the assertion failed.
     * @param description - What was being asserted
     * @param expected - The expected value
     * @param actual - The actual value observed
     * @param passed - Whether the assertion passed
     */
    async logAssertion(description: string, expected: any, actual: any, passed: boolean) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;

        await StepRunner.run(`ASSERTION - ${description}`, async () => {
            this.logger.debug(`Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}, Passed: ${passed}`);

            if (!passed) {
                this.logger.error(`${step}: ASSERTION FAILED - ${description}`);
                await this.captureFailureScreenshot(description);
            } else {
                this.logger.info(`${step}: ASSERTION PASSED - ${description}`);
            }
        });
    }

    /**
     * Generates and returns a summary of all steps executed in this helper.
     * @returns A multi-line string with step count
     */
    getSummary(): string {
        const summary = `\n=== Test Summary ===\nTotal Steps: ${this.stepCounter}\n`;
        this.logger.info(summary);
        return summary;
    }
}
