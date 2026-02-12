import { Locator, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * AdvancedActionsHelper — A wrapper around common Playwright page interactions
 * that adds comprehensive logging, step tracking, and failure diagnostics.
 *
 * Features:
 *   - Dual logging: every action is printed to console AND written to a unique log file
 *   - Automatic step numbering (Step 1, Step 2, ...) for easy traceability
 *   - Performance timing: each action records its duration in milliseconds
 *   - Screenshot on failure: when an action throws, a full-page screenshot is saved
 *   - Sensitive data masking: the fill() method can mask passwords in log output
 *
 * Log files are written to: <project-root>/test-logs/<testName>_<timestamp>.log
 * Failure screenshots are saved to: <project-root>/test-logs/failure-screenshots/
 *
 * Each Page Object (LoginPage, HomePage, etc.) creates its own instance of this class
 * so that logs are separated per test and per page.
 */
export class AdvancedActionsHelper {
    readonly page: Page;
    private stepCounter: number = 0;       // Auto-incrementing counter for sequential step labels
    private logFilePath: string;            // Absolute path to this test run's log file
    private screenshotDir: string;          // Directory where failure screenshots are stored

    /**
     * Creates a new AdvancedActionsHelper and initializes the log file.
     * @param page - Playwright Page instance to perform actions on
     * @param testName - Used to generate a unique, human-readable log file name
     */
    constructor(page: Page, testName?: string) {
        this.page = page;

        // Generate a timestamp-based file name, sanitizing special characters
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = testName?.replace(/[^a-z0-9]/gi, '_') || 'test';
        this.logFilePath = path.join(process.cwd(), 'test-logs', `${safeName}_${timestamp}.log`);

        // Configure screenshot output directory
        this.screenshotDir = path.join(process.cwd(), 'test-logs', 'failure-screenshots');

        // Ensure both directories exist before writing
        this.ensureDirectoryExists(path.dirname(this.logFilePath));
        this.ensureDirectoryExists(this.screenshotDir);

        // Write the log file header
        this.writeToLogFile(`=== Test Started: ${safeName} ===\n`);
        this.writeToLogFile(`Timestamp: ${new Date().toISOString()}\n\n`);
    }

    /** Creates a directory (and parents) if it does not already exist */
    private ensureDirectoryExists(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /** Appends a message to the test's log file (synchronous I/O) */
    private writeToLogFile(message: string) {
        fs.appendFileSync(this.logFilePath, message);
    }

    /** Logs a timestamped message to both console and the log file, tagged with its severity level */
    private async log(level: 'ACTION' | 'SUCCESS' | 'FAILED' | 'DATA' | 'ASSERTION', message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;

        // Console log
        console.log(logMessage);

        // File log
        this.writeToLogFile(logMessage + '\n');
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
            await this.log('FAILED', `Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            await this.log('FAILED', `Could not capture screenshot: ${error}`);
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

        await this.log('ACTION', `${step}: ${logMessage}`);
        const startTime = Date.now();

        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded' });
            const duration = Date.now() - startTime;
            await this.log('SUCCESS', `${step}: ${logMessage} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.log('FAILED', `${step}: ${logMessage} (${duration}ms) - Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
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

        await this.log('ACTION', `${step}: ${logMessage}`);
        const startTime = Date.now();

        try {
            // Log element state before clicking
            const isVisible = await locator.isVisible();
            const isEnabled = await locator.isEnabled();
            await this.log('DATA', `Element state - Visible: ${isVisible}, Enabled: ${isEnabled}`);

            await locator.click();
            const duration = Date.now() - startTime;
            await this.log('SUCCESS', `${step}: ${logMessage} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.log('FAILED', `${step}: ${logMessage} (${duration}ms) - Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
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

        await this.log('ACTION', `${step}: ${logMessage}`);
        const displayValue = isSensitive ? '***MASKED***' : `"${value}"`;
        await this.log('DATA', `Input value: ${displayValue}`);
        const startTime = Date.now();

        try {
            await locator.fill(value);
            const duration = Date.now() - startTime;
            await this.log('SUCCESS', `${step}: ${logMessage} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.log('FAILED', `${step}: ${logMessage} (${duration}ms) - Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
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

        await this.log('ACTION', `${step}: ${logMessage} (timeout: ${timeout}ms)`);
        const startTime = Date.now();

        try {
            await locator.waitFor({ state: 'visible', timeout });
            const duration = Date.now() - startTime;
            await this.log('SUCCESS', `${step}: ${logMessage} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.log('FAILED', `${step}: ${logMessage} (${duration}ms) - Timeout or Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
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

        await this.log('ACTION', `${step}: ${logMessage}`);
        const startTime = Date.now();

        try {
            const text = await locator.textContent() || '';
            const duration = Date.now() - startTime;
            await this.log('SUCCESS', `${step}: ${logMessage} (${duration}ms)`);
            await this.log('DATA', `Retrieved text: "${text}"`);
            return text;
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.log('FAILED', `${step}: ${logMessage} (${duration}ms) - Error: ${error}`);
            await this.captureFailureScreenshot(logMessage);
            throw error;
        }
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
        await this.log('ASSERTION', `${step}: ${description}`);
        await this.log('DATA', `Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}, Passed: ${passed}`);

        if (!passed) {
            await this.captureFailureScreenshot(description);
        }
    }

    /**
     * Generates and returns a summary of all steps executed in this helper.
     * Also appends the summary to the log file for a complete test record.
     * @returns A multi-line string with step count and log file path
     */
    getSummary(): string {
        const summary = `\n=== Test Summary ===\nTotal Steps: ${this.stepCounter}\nLog File: ${this.logFilePath}\n`;
        this.writeToLogFile(summary);
        return summary;
    }
}
