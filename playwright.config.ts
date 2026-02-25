import { defineConfig, devices } from '@playwright/test';
import baseEnvUrl from './src/utils/urls';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

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
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3,

  reporter: [
    ['html', { open: 'always' }],
    ["allure-playwright"],
    ['list'], 
  ],
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
  timeout: 2 * 60 * 1000,              // Per-test timeout: 2 minutes
  globalTimeout: 3 * 60 * 60 * 1000,   // Total suite timeout: 3 hours (prevents runaway CI builds)

  // Global teardown generates the HTML log report
  globalTeardown: "./src/utils/setup/global-teardown.ts",

  use: {
    trace: 'retain-on-failure',
    screenshot: 'retain-on-failure',
    video: 'off',
    headless: true,
    baseURL: process.env.ENV! === 'test'
      ? baseEnvUrl.test.ui
      : baseEnvUrl.staging.ui,
  },

  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
