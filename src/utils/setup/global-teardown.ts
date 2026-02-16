/**
 * Global Teardown — Runs ONCE after all test files have finished.
 *
 * Purpose: Performs cleanup operations after the entire test suite completes.
 * - Flushes all Winston loggers to ensure all logs are written to disk
 * - Generates the HTML log report from collected log entries
 *
 * This can be extended with actual cleanup logic if needed
 * (e.g., resetting test data, revoking sessions, etc.).
 */
import { Logger } from "../Logger";

async function globalTeardown() {
    console.log("\n🧹 Running global teardown...");

    // Flush all Winston loggers and ensure all logs are written
    console.log("📝 Flushing Winston loggers...");
    await Logger.shutdown();
    console.log("✅ Winston loggers flushed");

    // Generate the HTML log report from collected entries
    console.log("📊 Generating HTML log report...");
    Logger.generateHtmlReport("Playwright Test Execution Report");
    console.log("✅ Global teardown completed\n");
}

export default globalTeardown;
