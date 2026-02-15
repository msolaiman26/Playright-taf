import log4js, { Logger as Log4jsLogger } from "log4js";
import path from "path";
import fs from "fs";

/**
 * Logger utility for Playwright tests using log4js.
 * Supports Console, File, and HTML report logging.
 *
 * Usage:
 *   import { Logger } from "./utils/Logger";
 *   const logger = Logger.getLogger("LoginTests");
 *   logger.info("Navigating to login page");
 */
export class Logger {
  private static initialized = false;
  private static readonly LOG_DIR = path.resolve("test-logs");
  private static readonly HTML_REPORT_PATH = path.resolve(
    "test-logs",
    "test-report.html"
  );
  private static logEntries: LogEntry[] = [];

  private static initialize(): void {
    if (this.initialized) return;

    // Ensure log directory exists
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
    }

    log4js.configure({
      appenders: {
        // Console appender with colored output
        console: {
          type: "console",
          layout: {
            type: "pattern",
            pattern: "%[%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] [%c] - %m%]",
          },
        },
        // Rolling file appender (auto-rotates at 10MB, keeps 5 backups)
        file: {
          type: "dateFile",
          filename: path.join(this.LOG_DIR, "test-execution.log"),
          pattern: "yyyy-MM-dd",
          keepFileExt: true,
          numBackups: 5,
          layout: {
            type: "pattern",
            pattern: "%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] [%c] - %m",
          },
        },
        // Custom appender to collect entries for HTML report
        htmlCollector: {
          type: { configure: () => this.createHtmlAppender() },
        },
      },
      categories: {
        default: {
          appenders: ["console", "file", "htmlCollector"],
          level: process.env.LOG_LEVEL || "debug",
        },
      },
    });

    this.initialized = true;
  }

  /**
   * Get a logger instance for a specific category (e.g., test name, page object).
   */
  static getLogger(category: string): Log4jsLogger {
    this.initialize();
    return log4js.getLogger(category);
  }

  /**
   * Custom appender function that collects log entries for HTML generation.
   */
  private static createHtmlAppender() {
    return (loggingEvent: log4js.LoggingEvent) => {
      this.logEntries.push({
        timestamp: loggingEvent.startTime.toISOString(),
        level: loggingEvent.level.levelStr,
        category: loggingEvent.categoryName,
        message: loggingEvent.data.join(" "),
      });
    };
  }

  /**
   * Generate the HTML test report from collected log entries.
   * Call this in globalTeardown or at the end of your test suite.
   */
  static generateHtmlReport(
    title: string = "Playwright Test Execution Report"
  ): void {
    const stats = this.calculateStats();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; color: #333; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #1a1a2e; margin-bottom: 8px; font-size: 24px; }
        .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
        
        /* Stats Cards */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .stat-card .value { font-size: 28px; font-weight: 700; }
        .stat-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .stat-total .value { color: #1a1a2e; }
        .stat-debug .value { color: #6c757d; }
        .stat-info .value { color: #0d6efd; }
        .stat-warn .value { color: #ffc107; }
        .stat-error .value { color: #dc3545; }
        .stat-fatal .value { color: #6f42c1; }
        
        /* Filter Controls */
        .controls { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .controls label { font-size: 13px; font-weight: 600; color: #555; }
        .controls input, .controls select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
        .controls input[type="text"] { width: 250px; }
        .btn-filter { padding: 6px 16px; background: #1a1a2e; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
        .btn-filter:hover { background: #2d2d4e; }
        
        /* Log Table */
        .log-table-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #1a1a2e; color: white; padding: 12px 16px; text-align: left; font-weight: 600; position: sticky; top: 0; }
        td { padding: 10px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        tr:hover { background: #f8f9fa; }
        .timestamp { color: #888; white-space: nowrap; font-family: 'Courier New', monospace; font-size: 12px; }
        .category { color: #0d6efd; font-weight: 500; white-space: nowrap; }
        .message { word-break: break-word; }
        
        /* Log Level Badges */
        .level-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .level-DEBUG { background: #e9ecef; color: #495057; }
        .level-INFO { background: #cfe2ff; color: #084298; }
        .level-WARN { background: #fff3cd; color: #664d03; }
        .level-ERROR { background: #f8d7da; color: #842029; }
        .level-FATAL { background: #e2d9f3; color: #432874; }
        .level-TRACE { background: #f0f0f0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString()} | Total Duration: ${stats.duration}</p>
        
        <div class="stats">
            <div class="stat-card stat-total"><div class="value">${stats.total}</div><div class="label">Total Logs</div></div>
            <div class="stat-card stat-debug"><div class="value">${stats.debug}</div><div class="label">Debug</div></div>
            <div class="stat-card stat-info"><div class="value">${stats.info}</div><div class="label">Info</div></div>
            <div class="stat-card stat-warn"><div class="value">${stats.warn}</div><div class="label">Warn</div></div>
            <div class="stat-card stat-error"><div class="value">${stats.error}</div><div class="label">Error</div></div>
            <div class="stat-card stat-fatal"><div class="value">${stats.fatal}</div><div class="label">Fatal</div></div>
        </div>
        
        <div class="controls">
            <label>Filter:</label>
            <input type="text" id="searchInput" placeholder="Search messages..." onkeyup="filterTable()">
            <select id="levelFilter" onchange="filterTable()">
                <option value="">All Levels</option>
                <option value="TRACE">Trace</option>
                <option value="DEBUG">Debug</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warn</option>
                <option value="ERROR">Error</option>
                <option value="FATAL">Fatal</option>
            </select>
            <select id="categoryFilter" onchange="filterTable()">
                <option value="">All Categories</option>
                ${[...new Set(this.logEntries.map((e) => e.category))].map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
            <button class="btn-filter" onclick="clearFilters()">Clear</button>
        </div>
        
        <div class="log-table-wrapper">
            <table id="logTable">
                <thead>
                    <tr>
                        <th style="width:180px">Timestamp</th>
                        <th style="width:80px">Level</th>
                        <th style="width:150px">Category</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.logEntries
                      .map(
                        (entry) => `
                    <tr data-level="${entry.level}" data-category="${entry.category}">
                        <td class="timestamp">${new Date(entry.timestamp).toLocaleString()}</td>
                        <td><span class="level-badge level-${entry.level}">${entry.level}</span></td>
                        <td class="category">${entry.category}</td>
                        <td class="message">${this.escapeHtml(entry.message)}</td>
                    </tr>`
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        function filterTable() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const level = document.getElementById('levelFilter').value;
            const category = document.getElementById('categoryFilter').value;
            const rows = document.querySelectorAll('#logTable tbody tr');
            
            rows.forEach(row => {
                const matchLevel = !level || row.dataset.level === level;
                const matchCategory = !category || row.dataset.category === category;
                const matchSearch = !search || row.textContent.toLowerCase().includes(search);
                row.style.display = (matchLevel && matchCategory && matchSearch) ? '' : 'none';
            });
        }
        
        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('levelFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            filterTable();
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(this.HTML_REPORT_PATH, html, "utf-8");
    console.log(`\n📊 HTML Report generated: ${this.HTML_REPORT_PATH}\n`);
  }

  /**
   * Shutdown log4js (flush pending logs). Call in globalTeardown.
   */
  static async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      log4js.shutdown(() => resolve());
    });
  }

  /** Reset log entries (useful for test isolation). */
  static clearEntries(): void {
    this.logEntries = [];
  }

  private static calculateStats() {
    const total = this.logEntries.length;
    const countLevel = (lvl: string) =>
      this.logEntries.filter((e) => e.level === lvl).length;

    let duration = "N/A";
    if (total > 0) {
      const start = new Date(this.logEntries[0].timestamp).getTime();
      const end = new Date(
        this.logEntries[total - 1].timestamp
      ).getTime();
      const diffMs = end - start;
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      duration = `${mins}m ${secs}s`;
    }

    return {
      total,
      debug: countLevel("DEBUG"),
      info: countLevel("INFO"),
      warn: countLevel("WARN"),
      error: countLevel("ERROR"),
      fatal: countLevel("FATAL"),
      duration,
    };
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
}
