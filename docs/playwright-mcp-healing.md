# Playwright MCP Self-Healing

**Playwright Test Automation Framework**
**Last Updated:** 2026-02-25

---

## Table of Contents

1. [What Changed](#what-changed)
2. [Why Playwright MCP](#why-playwright-mcp)
3. [Architecture](#architecture)
4. [How It Works — Step by Step](#how-it-works--step-by-step)
5. [New Files & Changed Files](#new-files--changed-files)
6. [Configuration](#configuration)
7. [How to Verify](#how-to-verify)
8. [Interpreting the Logs](#interpreting-the-logs)
9. [Troubleshooting](#troubleshooting)
10. [Technical Notes](#technical-notes)

---

## What Changed

Phase 3 of the self-healing system (AI fallback) was upgraded to use
**Microsoft's `@playwright/mcp`** server.

| | Before | After |
| --- | --- | --- |
| **Phase 3 trigger** | Raw stripped HTML snapshot | `@playwright/mcp` `browser_snapshot` tool |
| **Data sent to AI** | Stripped HTML string (noisy, large) | YAML ARIA accessibility tree (structured, compact) |
| **Browser used** | None — just text analysis | The test's own live browser context |
| **Auth/session** | Not relevant (text only) | Shared automatically via `contextGetter` |
| **AI interaction** | Single REST call | Agentic tool-use loop (AI calls MCP tools) |
| **Anthropic provider** | `AnthropicHealingProvider` (raw HTML) | `PlaywrightMCPHealingProvider` (MCP) |
| **Gemini provider** | `GeminiHealingProvider` (raw HTML) | `GeminiMCPHealingProvider` (MCP) |
| **Default Claude model** | `claude-haiku-4-5-20251001` | `claude-sonnet-4-6` |

Both Anthropic and Gemini use the MCP path. The raw HTML approach has been removed.

---

## Why Playwright MCP

### The problem with raw HTML snapshots

The old Phase 3 captured the page with `page.content()`, stripped scripts/styles, and
truncated to 12 000 characters. This produced noisy HTML full of CSS class names, data
attributes, and layout divs that the AI had to wade through. The AI could easily be
confused by similar-looking elements or miss the target entirely.

### What `browser_snapshot` gives instead

`@playwright/mcp`'s `browser_snapshot` tool returns a **YAML accessibility tree** — the
same structured representation a screen reader sees:

```yaml
- generic [ref=e1]:
  - heading "OrangeHRM" [level=1]
  - textbox "Username" [ref=e4]
  - textbox "Password" [ref=e5]
  - button "Login" [ref=e6]
```

This representation:

- Contains **roles, names, and states** — exactly what Playwright's own locator strategies use
- Is **far smaller** than raw HTML for the same page
- Makes element identification **deterministic** — the AI sees the same tree a developer sees
- Is **auth-aware** — the snapshot comes from the live test page, so dynamically rendered
  content (loaded after login, after AJAX calls) is fully visible

---

## Architecture

```text
                      SelfHealingLocator.get()
                              │
                   Phase 1: primary selector fails
                              │
                   Phase 2: semantic strategies fail
                              │
                   Phase 3: PlaywrightMCPHealingProvider
                              │
          ┌───────────────────┼───────────────────────────┐
          │                   │                           │
          ▼                   ▼                           ▼
  createConnection()   InMemoryTransport          Anthropic tool_use
  @playwright/mcp      (in-process,               API loop (fetch)
  Server               no network)
          │                   │                           │
          │  contextGetter()  │                           │
          └──→ test's own ────┘              Claude calls browser_snapshot
               BrowserContext                      │
               (existing pages                     ▼
                registered)              MCP server: page.ariaSnapshot()
                                                   │
                                                   ▼
                                         Claude returns CSS/XPath selector
                                                   │
                                                   ▼
                                         SelfHealingLocator probes selector
```

### Why `contextGetter` matters

`createConnection(config, contextGetter)` accepts an optional function that returns
an existing `BrowserContext`. When provided:

1. The MCP server calls `contextGetter()` instead of launching a new browser.
2. It iterates `browserContext.pages()` and registers every open page as an active tab.
3. The **current test page becomes the MCP server's active tab** — no new navigation needed.
4. Auth cookies, session storage, JavaScript-rendered content — all inherited.

This is the key advantage over approaches that launch a separate browser: the MCP server
sees the **exact same DOM** the test is interacting with.

---

## How It Works — Step by Step

When a locator exhausts Phases 1 and 2, `SelfHealingLocator` calls
`aiProvider.suggestSelector(htmlSnapshot, description)`.

`PlaywrightMCPHealingProvider.suggestSelector()` runs the following steps:

```
1. createConnection({ capabilities: ['core'] }, () => page.context())
   └─ @playwright/mcp Server spins up in-process, attached to test's BrowserContext
   └─ Existing page registered as the active tab

2. InMemoryTransport.createLinkedPair()
   └─ [clientTransport, serverTransport] — zero-overhead in-process link

3. server.connect(serverTransport)
   mcpClient.connect(clientTransport)
   └─ Client ↔ Server wired up, ready for tool calls

4. mcpClient.listTools()
   └─ Retrieve available tools from the @playwright/mcp server
   └─ Filter to snapshot-related tools (browser_snapshot)

5. Anthropic API call (fetch) — tool_use loop, max 3 turns:

   Turn 1 — Claude receives:
     System: "You are a Playwright expert. Use snapshot tools to inspect the page."
     User:   "Find a Playwright selector for: '<description>'"
     Tools:  [browser_snapshot tool definition from MCP]

   Claude responds with stop_reason: "tool_use":
     → calls browser_snapshot (no arguments needed)

   Turn 2 — Execute the MCP tool call:
     mcpClient.callTool({ name: 'browser_snapshot', arguments: {} })
     └─ MCP server runs page.accessibility.snapshot() on the live test page
     └─ Returns YAML accessibility tree

   Claude receives the ARIA tree as a tool_result.

   Claude responds with stop_reason: "end_turn":
     → returns raw selector string, e.g. input[name="username"]

6. Return selector to SelfHealingLocator
   └─ SelfHealingLocator probes it: waitFor({ state: 'attached', timeout: 2000 })
   └─ If found: marks resolution as 'healed', logs ✨ AI-healed message
   └─ If not found: logs warning, returns primary selector (Playwright raises timeout)

7. mcpClient.close()
   └─ Cleanup — server and transport released
```

---

## New Files & Changed Files

### New / changed: `src/utils/playwright-mcp-provider.ts`

Contains two exported providers and one shared internal helper:

```typescript
// Shared — both providers call this
async function createMCPClient(page): Promise<{ client, cleanup }>

// Anthropic — tool_use loop → Anthropic REST API
export class PlaywrightMCPHealingProvider implements AIHealingProvider {
    constructor(page: Page, apiKey: string, model?: string, apiVersion?: string)
    async suggestSelector(_pageSnapshot: string, description: string): Promise<string | null>
}

// Gemini — functionCall loop → Google Generative Language API
export class GeminiMCPHealingProvider implements AIHealingProvider {
    constructor(page: Page, apiKey: string, model?: string)
    async suggestSelector(_pageSnapshot: string, description: string): Promise<string | null>
}
```

Both providers ignore `_pageSnapshot` — they receive the live ARIA tree via the MCP
`browser_snapshot` tool instead.

### Changed: `tests/fixtures/self-healing-fixture.ts`

- `ANTHROPIC_API_KEY` → `PlaywrightMCPHealingProvider` (unchanged)
- `GEMINI_API_KEY` → `GeminiMCPHealingProvider` (was `GeminiHealingProvider` raw HTML)
- `OPENAI_API_KEY` → `OpenAIHealingProvider` (raw HTML, unchanged)

### New: `package.json` dependencies

```json
"@playwright/mcp": "^0.0.68",
"@modelcontextprotocol/sdk": "^1.27.1"
```

### Unchanged

| File | Status |
| --- | --- |
| `src/utils/self-healing-locator.ts` | No changes — `AIHealingProvider` interface satisfied |
| `src/utils/ai-healing-providers.ts` | **Deleted** — all raw-HTML providers removed |
| `src/pages/*-self-healing.ts` | No changes |
| `src/pages/pom-lazy-self-healing.ts` | No changes |
| `src/locators/*.ts` | No changes |
| `tests/ui/specs/login-with-self-healing.spec.ts` | No changes |

---

## Configuration

Add to your `.env` file (all optional — without any key, Phases 1–2 still work):

```env
# Playwright MCP + Claude (highest priority)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6     # optional, this is the default

# Playwright MCP + Gemini (second priority)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash         # optional
```

### Provider selection logic

| `ANTHROPIC_API_KEY` | `GEMINI_API_KEY` | Active provider |
| --- | --- | --- |
| ✓ | — | `PlaywrightMCPHealingProvider` — MCP + Claude |
| — | ✓ | `GeminiMCPHealingProvider` — MCP + Gemini |
| — | — | Semantic healing only (Phases 1–2) |

Only one provider is active at a time; the first matching key wins.
Both providers share the same in-process `@playwright/mcp` setup — same ARIA snapshot,
same live browser context, same auth state. The only difference is the AI API used
in the agentic loop.

---

## How to Verify

### 1. Prerequisites

```bash
npm install        # installs @playwright/mcp and @modelcontextprotocol/sdk
```

Ensure `.env` contains `ANTHROPIC_API_KEY=sk-ant-...`.

### 2. Trigger Phase 3 healing

Phase 3 only activates when **both** Phase 1 and Phase 2 fail. To force this, temporarily
break the primary selector AND all semantic metadata for one locator.

Edit `src/locators/login-page-locators.ts`:

```typescript
usernameInput: {
    // Break the primary selector
    selector: 'input[name="BROKEN_SELECTOR"]',
    metadata: {
        // Remove role/label/placeholder so Phase 2 also fails
        description: 'Username text input on the OrangeHRM login form',
    },
},
```

### 3. Run the self-healing tests

```bash
npx playwright test tests/ui/specs/login-with-self-healing.spec.ts --project="Google Chrome"
```

Or use the npm script:

```bash
npm run ui
```

### 4. Check the logs

After the run, open the test log file in `test-logs/`:

```
test-logs/
└── Fixture-SelfHealing-Successful_login_-_valid_credentials.log
```

Look for these entries (in order):

```log
WARN  [SelfHealingLocator] Primary selector failed for "Username text input..." — starting self-healing…
WARN  [SelfHealingLocator] Semantic strategies exhausted — invoking AI healing for "Username text input..."
INFO  [SelfHealingFixture] AI provider: Playwright MCP + Claude (claude-sonnet-4-6)
WARN  [SelfHealingLocator] ✨ AI-healed "Username text input..." via [AI: input[name="username"]]
```

And at the end of the test, the healing summary:

```log
INFO  --- Self-Healing Locator Summary ---
LoginPage:
  usernameInput          : ⚠ HEALED   — "Username text input..." via [AI: input[name="username"]]
  passwordInput          : ✓ PRIMARY  — "Password text input..."
  loginButton            : ✓ PRIMARY  — "Login submit button..."
```

### 5. Restore the locator

```typescript
usernameInput: {
    selector: 'input[name="username"]',
    metadata: {
        role:        'textbox',
        label:       'Username',
        placeholder: 'Username',
        description: 'Username text input on the OrangeHRM login form',
    },
},
```

### 6. Optional: Playwright HTML report

```bash
npx playwright show-report
```

The HTML report shows the test passing. The healing detail is in the log files, not
the HTML report (the HTML report shows test steps, not Winston log output).

---

## Interpreting the Logs

### Log levels during healing

| Log level | Message pattern | Meaning |
|---|---|---|
| `DEBUG` | `✓ Primary resolved: "…" → selector` | Phase 1 succeeded — no healing needed |
| `WARN` | `Primary selector failed for "…" — starting self-healing…` | Phase 1 failed, entering Phase 2 |
| `WARN` | `⚠ Healed via semantic strategy for "…": getByPlaceholder('Username')` | Phase 2 healed the locator |
| `WARN` | `Semantic strategies exhausted — invoking AI healing for "…"` | Phase 2 failed, entering Phase 3 |
| `INFO` | `AI provider: Playwright MCP + Claude (claude-sonnet-4-6)` | MCP provider is active |
| `WARN` | `✨ AI-healed "…": suggested selector "input[name=…]"` | Phase 3 succeeded |
| `WARN` | `AI suggestion "…" did not find an element` | Phase 3 returned a selector that didn't probe |
| `ERROR` | `All healing strategies failed for "…"` | All 3 phases exhausted |

### Post-test healing report symbols

```
✓ PRIMARY  — primary selector worked, no healing triggered
⚠ HEALED   — primary failed, a fallback strategy found the element
✗ FAILED   — all strategies exhausted, Playwright raised a timeout
◌ NOT USED — locator was never called during this test
```

---

## Troubleshooting

### "AI provider: Playwright MCP" doesn't appear in the logs

`ANTHROPIC_API_KEY` is not set or not loaded. Check:

```bash
# Verify the env var is visible to the test runner
npx cross-env node -e "console.log(!!process.env.ANTHROPIC_API_KEY)"
```

Also verify the `.env` file is in the project root (same folder as `playwright.config.ts`).

### Phase 3 never activates — logs show Phase 2 healing instead

Phase 3 only runs when **all** Phase 2 semantic strategies fail. If the locator has
`role`, `label`, `placeholder`, `text`, or `testId` set, at least one of those strategies
will likely succeed on its own. To force Phase 3, remove all metadata fields except
`description` as described in the [verification steps](#how-to-verify).

### "Anthropic API (MCP provider) error 401"

Invalid API key. Double-check `ANTHROPIC_API_KEY` in `.env`.

### "Anthropic API (MCP provider) error 529" or timeout

Rate limit or service overload. The provider surfaces the raw error. Retry the test, or
reduce parallelism (`workers: 1` in `playwright.config.ts`).

### The suggested selector probes but is wrong

Claude returned a valid CSS/XPath that matched a different element. This can happen on
pages with repeated similar elements. Improve the `description` field in
`ElementMetadata` to be more specific:

```typescript
// Vague — Claude might pick any text input
description: 'Text input'

// Specific — Claude has enough context to pick the right one
description: 'Username text input on the OrangeHRM login form, first field above the Password field'
```

### "Module not found: @modelcontextprotocol/sdk/inMemory.js"

Run `npm install` to ensure both new packages are installed.

### TypeScript error: BrowserContext type mismatch

`@playwright/mcp` bundles its own version of `playwright-core`, causing a structural type
mismatch. The `as any` cast in `playwright-mcp-provider.ts` line 85 suppresses this — it
is intentional and safe. The runtime behavior is correct because both types refer to the
same Playwright `BrowserContext` object.

---

## Technical Notes

### Module resolution quirk

`@modelcontextprotocol/sdk` uses an `exports` map in `package.json`. The project's
`tsconfig.json` uses `"moduleResolution": "Node"` which does not read the `exports` field.
The two SDK imports in `playwright-mcp-provider.ts` therefore use `require()` at runtime
(which Node.js resolves correctly via the `exports` map) rather than TypeScript `import`
statements.

Correct import paths (runtime):
- `@modelcontextprotocol/sdk/client` — resolves to `dist/cjs/client/index.js`
- `@modelcontextprotocol/sdk/inMemory.js` — resolves to `dist/cjs/inMemory.js`
  (`.js` extension required to avoid path doubling from the wildcard export)

### `contextGetter` vs `storageState`

An earlier approach exported cookies to a temp JSON file and passed the path as
`contextOptions.storageState`. This was replaced by the `contextGetter` parameter because:

- **No temp files** — no file system I/O, no cleanup required
- **No re-navigation** — the existing pages are registered immediately
- **Exact DOM state** — AJAX-loaded content, in-flight requests, JS state all preserved
- `browserContext.pages()` is iterated by the MCP server on initialization, so the current
  test page becomes the active tab automatically

### Agentic loop cap

The tool-use loop is capped at **3 turns**. In practice, healing takes exactly 2 turns:
Turn 1 (Claude requests snapshot) + Turn 2 (Claude receives ARIA tree and returns selector).
The cap prevents runaway loops if the AI behaves unexpectedly.

### Capabilities filter

`createConnection({ capabilities: ['core'] }, contextGetter)` limits the MCP server to
core browser tools only. This excludes `pdf`, `vision` (screenshots), `devtools`, and
`network` tools — reducing the tool surface Claude sees and keeping the token count low.
Only `browser_snapshot` (and related core snapshot tools) are exposed to Claude.
