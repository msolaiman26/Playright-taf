# Playwright Config Reference

Complete reference for every property in `playwright.config.ts`.

Environment is controlled by the `ENV` variable (`.env` file or `cross-env`).
See: https://playwright.dev/docs/test-configuration

---

## Table of Contents

- [Test Discovery](#test-discovery)
- [Parallelism](#parallelism)
- [Retries](#retries)
- [Reporters](#reporters)
- [Timeouts](#timeouts)
- [Snapshots & Visual Regression](#snapshots--visual-regression)
- [Global Setup / Teardown](#global-setup--teardown)
- [use — Shared Browser Options](#use--shared-browser-options)
- [projects](#projects)
- [Web Server](#web-server)
- [ReportPortal Integration](#reportportal-integration)

---

## Test Discovery

| Property | Current value | Description |
| --- | --- | --- |
| `testDir` | `'./tests'` | Root folder where Playwright looks for test files |
| `testMatch` | `'**/*.spec.ts'` | Glob pattern to include test files |
| `testIgnore` | _(unset)_ | Glob or regex to exclude specific files or folders |

**Alternatives:**

```ts
testDir: './e2e',
testMatch: /.*\.test\.ts/,        // regex instead of glob
testIgnore: '**/api/**',          // exclude a subfolder
```

[↑ Back to top](#table-of-contents)

---

## Parallelism

| Property | Current value | Description |
| --- | --- | --- |
| `fullyParallel` | `true` | Run tests in parallel across and within files |
| `workers` | `2` (CI) / `3` (local) | Max number of parallel worker processes |
| `forbidOnly` | `!!process.env.CI` | Fail the build if `test.only` is left in source |

**Alternatives:**

```ts
fullyParallel: false,   // run files in parallel but tests within a file serially
workers: 1,             // fully serial execution
workers: '50%',         // half of available CPU cores
```

[↑ Back to top](#table-of-contents)

---

## Retries

| Property | Current value | Description |
| --- | --- | --- |
| `retries` | `2` (CI) / `0` (local) | Number of times to retry a failed test |

**Alternatives:**

```ts
retries: 1,   // always retry once, regardless of environment
retries: 0,   // disable retries completely
```

[↑ Back to top](#table-of-contents)

---

## Reporters

Active reporters:

```ts
reporter: [
  ['html', { open: 'always' }],
  ['allure-playwright'],
],
```

| Reporter | Purpose |
| --- | --- |
| `html` | Built-in HTML report. `open: 'always'` auto-opens after the run |
| `allure-playwright` | Allure report with rich history and attachments |
| `@reportportal/agent-js-playwright` | ReportPortal dashboard (see [ReportPortal Integration](#reportportal-integration)) |

**Other available reporters:**

```ts
['list'],                                 // simple console list
['dot'],                                  // one dot per test
['json', { outputFile: 'results.json' }], // machine-readable output
['junit', { outputFile: 'results.xml' }], // CI/CD integration
['line'],                                 // compact line reporter
```

[↑ Back to top](#table-of-contents)

---

## Timeouts

| Property | Current value | Description |
| --- | --- | --- |
| `timeout` | `2 * 60 * 1000` (2 min) | Per-test timeout; test fails if exceeded |
| `globalTimeout` | `3 * 60 * 60 * 1000` (3 hrs) | Hard cap on the entire test suite run |
| `expect.timeout` | `6000` ms | Default timeout for each `expect()` assertion |

**Alternatives:**

```ts
timeout: 30 * 1000,             // 30 seconds per test
globalTimeout: 60 * 60 * 1000,  // 1 hour total
expect: { timeout: 10000 },     // 10 seconds per assertion
```

Per-project or per-test overrides are also possible:

```ts
// inside a test file
test.setTimeout(60000);

// inside a project definition
{ name: 'slow-project', timeout: 5 * 60 * 1000 }
```

[↑ Back to top](#table-of-contents)

---

## Snapshots & Visual Regression

| Property | Current value | Description |
| --- | --- | --- |
| `snapshotPathTemplate` | `'./visual-snapshots/{testName}-{arg}-{projectName}-{platform}{ext}'` | Template controlling where snapshot files are stored |
| `expect.toMatchSnapshot.maxDiffPixels` | `0` | Pixel tolerance for `toMatchSnapshot` (0 = pixel-perfect) |
| `expect.toHaveScreenshot.stylePath` | `'./tests/utils/screenshot.css'` | CSS applied before taking a screenshot comparison |

**Alternative snapshot directory:**

```ts
snapshotDir: './tests/utils/visual-snapshots',   // flat directory instead of template
```

**Relaxing pixel tolerance:**

```ts
toMatchSnapshot: { maxDiffPixels: 100 },
toMatchSnapshot: { maxDiffPercent: 0.1 }, // 0.1% of pixels may differ
```

[↑ Back to top](#table-of-contents)

---

## Global Setup / Teardown

| Property | Current value | Description |
| --- | --- | --- |
| `globalTeardown` | `'./src/utils/setup/global-teardown.ts'` | Runs once after all tests; generates the HTML log report |
| `globalSetup` | _(unset)_ | Runs once before all tests |

**To enable global setup:**

```ts
globalSetup: require.resolve('./tests/utils/setup/global-setup.ts'),
globalTeardown: require.resolve('./tests/utils/setup/global-teardown.ts'),
```

Common uses: seeding a database, obtaining an auth token, clearing state.

[↑ Back to top](#table-of-contents)

---

## `use` — Shared Browser Options

These options apply to every project unless overridden at the project level.

| Property | Current value | Description |
| --- | --- | --- |
| `baseURL` | `ENV`-driven (test / staging) | Prefix for `page.goto('/')` relative URLs |
| `headless` | `true` | Run without a visible browser window |
| `trace` | `'retain-on-failure'` | Save a trace archive only for failed tests |
| `screenshot` | `'only-on-failure'` | Capture a screenshot only on failure |
| `video` | `'off'` | Do not record video |

**`trace` options:**

| Value | Behaviour |
| --- | --- |
| `'off'` | Never record |
| `'on'` | Always record |
| `'retain-on-failure'` | Record always, delete on pass |
| `'on-first-retry'` | Record on the first retry only |

**`screenshot` / `video` options follow the same pattern:** `'off'`, `'on'`, `'only-on-failure'`, `'retain-on-failure'`.

**Optional `use` properties (currently disabled):**

```ts
actionTimeout: 6000,          // timeout for each page action (click, fill, etc.)
navigationTimeout: 30000,     // timeout for page.goto() and navigation events
baseURL: 'http://127.0.0.1:3000',   // point to a local dev server
storageState: 'storage-state.json', // restore a saved browser session (auth)
```

[↑ Back to top](#table-of-contents)

---

## `projects`

Each project runs the full test suite (or a filtered subset) with its own `use` overrides.

### Active project

```ts
{
  name: 'Google Chrome',
  use: { ...devices['Desktop Chrome'], channel: 'chrome' },
},
```

### Available browser projects

| Project | Device preset | Notes |
| --- | --- | --- |
| Google Chrome | `Desktop Chrome` + `channel: 'chrome'` | Branded Chrome (active) |
| Chromium | `Desktop Chrome` | Open-source Chromium build |
| Firefox | `Desktop Firefox` | Gecko engine |
| WebKit | `Desktop Safari` | Safari engine |
| Microsoft Edge | `Desktop Edge` + `channel: 'msedge'` | Branded Edge |
| Mobile Chrome | `Pixel 5` | Android viewport simulation |
| Mobile Safari | `iPhone 12` | iOS viewport simulation |

```ts
// Chromium with custom viewport
{
  name: 'chromium',
  testIgnore: '**/api/**',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 920 },
    trace: 'retain-on-failure',
  },
  metadata: { lang: 0 }, // 0 = en
},

// Firefox
{
  name: 'firefox',
  use: { ...devices['Desktop Firefox'], video: 'retain-on-failure' },
  metadata: { lang: 1 }, // 1 = ar
},

// WebKit
{ name: 'webkit', use: { ...devices['Desktop Safari'] } },

// Mobile
{ name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
{ name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },

// Edge
{ name: 'Microsoft Edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
```

### Tag-filtered projects

Use `grep` / `grepInvert` to run only tagged tests in a project:

```ts
// only @api tests
{
  name: 'api',
  grep: /@api/,
  use: {
    baseURL: process.env.ENV! === 'test'
      ? baseEnvUrl.test.api
      : baseEnvUrl.staging.api,
    trace: 'on',
  },
},

// @ui tests, excluding @smoke
{
  name: 'ui',
  grep: /@ui/,
  grepInvert: /@smoke/,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
},
```

### File-scoped projects

Use `testMatch` / `testIgnore` inside a project to target specific files:

```ts
{
  name: 'api',
  testDir: './tests/api',
  use: { screenshot: 'off', trace: 'retain-on-failure' },
},

{
  name: 'splitting tests',
  testMatch: /.*secondScript.spec.ts/,
  testIgnore: /.*firstScript.spec.ts/,
},
```

### Setup / Teardown projects (dependencies)

Run global setup and teardown as dedicated projects so they appear in reports:

```ts
{
  name: 'setup',
  testMatch: /.*setup.ts/,
  teardown: 'reset',            // link to the teardown project
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
},
{
  name: 'reset',
  testMatch: /.*teardown.ts/,
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
},
{
  name: 'dependenciesExample',
  dependencies: ['setup'],      // runs after 'setup' completes
  use: { trace: 'retain-on-failure' },
},
```

[↑ Back to top](#table-of-contents)

---

## Web Server

Start a local dev server automatically before the test run:

```ts
webServer: {
  command: 'npm run start',
  url: 'http://127.0.0.1:3000',
  reuseExistingServer: !process.env.CI, // reuse on local, restart on CI
},
```

Multiple servers are supported by passing an array.

[↑ Back to top](#table-of-contents)

---

## ReportPortal Integration

Centralised test reporting dashboard.

**1. Set `RP_API_KEY` in `.env`:**

```env
RP_API_KEY=your_key_here
```

**2. Add the `RPconfig` object to `playwright.config.ts`:**

```ts
const RPconfig = {
  endpoint: "https://demo.reportportal.io/api/v1",
  apiKey: process.env.RP_API_KEY!,
  project: "bakry13_personal",
  launch: "test launch",
  description: "My awesome launch",
  attributes: [
    { key: "attributeKey", value: "attrbiuteValue" },
    { value: "anotherAttrbiuteValue" },
  ],
  mode: 'DEFAULT', // or 'DEBUG'
};
```

**3. Enable the reporter:**

```ts
reporter: [
  ['html', { open: 'always' }],
  ['allure-playwright'],
  ['@reportportal/agent-js-playwright', RPconfig], // add this line
],
```

[↑ Back to top](#table-of-contents)
