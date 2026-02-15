/**
 * Playwright Configuration File.
 *
 * Central configuration for the entire test automation framework. Controls:
 *   - Test discovery (testDir, testMatch)
 *   - Parallelism and retry strategy (workers, retries)
 *   - Reporters (HTML, Allure, ReportPortal)
 *   - Timeouts (per-test, global, expect)
 *   - Browser projects (Chromium active; Firefox, WebKit, mobile available)
 *   - Base URL resolution per environment (test vs staging)
 *   - Visual regression settings (snapshot paths, pixel-perfect comparison)
 *   - Trace and screenshot capture on failure
 *
 * Environment is controlled by the ENV variable (.env file or cross-env).
 * See: https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from '@playwright/test';
import baseEnvUrl from './src/utils/urls';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file (e.g., ENV, RP_API_KEY)
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * ReportPortal configuration — integration with ReportPortal dashboard for
 * centralized test reporting. Currently commented out in the reporter array.
 * To enable: uncomment the reporter line and set RP_API_KEY in .env.
 */
const RPconfig = {
  endpoint: "https://demo.reportportal.io/api/v1",
  apiKey: process.env.RP_API_KEY!,
  project: "bakry13_personal",
  launch: "test launch",
  description: "My awesome launch",
  attributes: [
    {
      key: "attributeKey",
      value: "attrbiuteValue",
    },
    {
      value: "anotherAttrbiuteValue",
    },
  ],
  mode: 'DEFAULT',
};

export default defineConfig({
  testDir: './tests',                         // Root directory for test file discovery
  testMatch: '**/*.spec.ts',                  // Pattern: all .spec.ts files in tests/ and subdirectories
  fullyParallel: true,                        // Run all tests in parallel (within and across files)
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  // retries: 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  // workers: 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */

  reporter: [
    ['html', { open: 'always' }],
    ["allure-playwright"],
    // ['@reportportal/agent-js-playwright', RPconfig],
  ],
  // snapshotDir: './tests/utils/visual-snapshots',
  snapshotPathTemplate: './visual-snapshots/{testName}-{arg}-{projectName}-{platform}{ext}',
  expect: {
    timeout: 6000, //timeout for validation
    toMatchSnapshot: {
      maxDiffPixels: 0,
    },
    toHaveScreenshot: {
      stylePath: './tests/utils/screenshot.css',
    }
  },
  timeout: 2*60*1000,              // Per-test timeout: 2 minutes
  globalTimeout: 3*60*60*1000,     // Total suite timeout: 3 hours (prevents runaway CI builds)
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  // globalSetup: require.resolve('./tests/utils/setup/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/utils/setup/global-teardown.ts'),
  
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace:'retain-on-failure',
    screenshot: 'on',
    headless: true,
    // actionTimeout:6000, 
    // navigationTimeout:30000,
    baseURL: process.env.ENV! === 'test'
    ? baseEnvUrl.test.ui
    : baseEnvUrl.staging.ui,
    // storageState: 'storage-state.json', 
  },

  /* Configure projects for major browsers */
  projects: [

    // {
    //   name: 'api',
    //   grep: /@api/,
    //   use: {
    //     baseURL: process.env.ENV! === 'test'
    //     ? baseEnvUrl.test.api
    //     : baseEnvUrl.staging.api,
    //     trace:'on'
    //    },
    // },

    // {
    //   name: 'ui',
    //   grep: /@ui/,
    //   grepInvert: /@smoke/,
    //   use: { ...devices['Desktop Chrome'],
    //     baseURL: 'https://opensource-demo.orangehrmlive.com',
    //     trace:'retain-on-failure',
    //    },
    // },

    // {
    //   name: 'splitting tests',
    //   testMatch: /.*secondScript.spec.ts/,
    //   testIgnore: /.*firstScript.spec.ts/,
    //   use: {
    //     trace:'retain-on-failure',
    //    },
    // },

    // {
    //   name: 'setup',
    //   testMatch: /.*setup.ts/,
    //   teardown: 'reset',
    //   use: { ...devices['Desktop Chrome'],
    //     baseURL: 'https://opensource-demo.orangehrmlive.com',
    //     trace:'retain-on-failure'
    //    },
    // },

    // {
    //   name: 'reset',
    //   testMatch: /.*teardown.ts/,
    //   use: { ...devices['Desktop Chrome'],
    //     baseURL: 'https://opensource-demo.orangehrmlive.com',
    //     trace:'retain-on-failure'
    //    },
    // },

    // {
    //   name: 'dependenciesExample',
    //   dependencies: ['setup'],
    //   use: { 
    //     baseURL: 'https://opensource-demo.orangehrmlive.com',
    //     trace:'retain-on-failure',
    //    }
    // },

    // {
    //   name: 'browserContext',
    //   use: { 
    //     trace:'retain-on-failure',
    //    }
    // },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 920 },
        trace:'retain-on-failure',
       },
       metadata:{
        lang: 0 // 0 for en
       }
    },

/*     {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'],
        video: 'retain-on-failure',
      },
      metadata:{
       lang: 1 // 1 for ar
      }
    },
 */
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
