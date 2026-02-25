import { type Page } from '@playwright/test';
import { createConnection } from '@playwright/mcp';
import { type AIHealingProvider } from './self-healing-locator';

/**
 * Minimal type shims for @modelcontextprotocol/sdk — resolved at runtime via
 * Node.js exports map. TypeScript (moduleResolution: Node) cannot resolve these
 * paths statically; the `require()` calls below work correctly at test runtime.
 */
type MCPToolDef    = { name: string; description?: string; inputSchema: object };
type MCPToolResult = { content: Array<{ type: string; text?: string }> };
type MCPClient = {
    connect(transport: unknown): Promise<void>;
    listTools(): Promise<{ tools: MCPToolDef[] }>;
    callTool(args: { name: string; arguments: Record<string, unknown> }): Promise<MCPToolResult>;
    close(): Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared MCP setup helper
// Both providers (Anthropic + Gemini) spin up the same in-process MCP server.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a `@playwright/mcp` server attached to the test's existing
 * `BrowserContext`, wires it to a `Client` via `InMemoryTransport`, and
 * returns both the ready client and a cleanup function.
 *
 * The `contextGetter` makes the MCP server reuse the existing pages — no new
 * browser launch, no re-navigation, auth state fully preserved.
 */
async function createMCPClient(page: Page): Promise<{ client: MCPClient; cleanup: () => Promise<void> }> {
    // @playwright/mcp's SimpleBrowserContextFactory wraps the context we provide with
    // `close: () => browserContext.close()` and calls it when the MCP server shuts down
    // (triggered by mcpClient.close()). We intercept that via a Proxy so the test's
    // BrowserContext is never closed by MCP teardown.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realContext = page.context() as any;
    const contextProxy = new Proxy(realContext, {
        get(target, prop) {
            if (prop === 'close') return () => Promise.resolve();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = (target as any)[prop];
            return typeof val === 'function' ? val.bind(target) : val;
        },
    });
    const contextGetter = () => Promise.resolve(contextProxy);
    const server = await createConnection({ capabilities: ['core'] }, contextGetter);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js') as {
        InMemoryTransport: { createLinkedPair(): [unknown, unknown] };
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport as Parameters<typeof server.connect>[0]);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('@modelcontextprotocol/sdk/client') as {
        Client: new (info: { name: string; version: string }) => MCPClient;
    };
    const mcpClient = new Client({ name: 'self-healing-client', version: '1.0.0' });
    await mcpClient.connect(clientTransport);

    return { client: mcpClient, cleanup: () => mcpClient.close() };
}

/** Returns only snapshot-related tools from the MCP server. */
async function getSnapshotTools(client: MCPClient): Promise<MCPToolDef[]> {
    const { tools } = await client.listTools();
    const snapshotOnly = tools.filter(t => t.name.includes('snapshot'));
    if (snapshotOnly.length > 0) return snapshotOnly;
    // Fallback: include navigate tools so the model can reach the page first
    return tools.filter(t => t.name.includes('navigate') || t.name.includes('snapshot'));
}

const SYSTEM_PROMPT =
    `You are a Playwright test automation expert with access to browser tools.\n` +
    `Use the snapshot tool to inspect the current page, then return a Playwright selector.\n\n` +
    `Respond with ONLY the raw selector string — one of:\n` +
    `  - CSS selector (e.g. input[name="username"])\n` +
    `  - XPath starting with // (e.g. //button[@type="submit"])\n` +
    `Do NOT wrap it in quotes, backticks, or markdown fences.\n` +
    `If you cannot find the element, respond with exactly: UNABLE_TO_HEAL`;

// ─────────────────────────────────────────────────────────────────────────────
// PlaywrightMCPHealingProvider  (Anthropic / Claude)
// ─────────────────────────────────────────────────────────────────────────────

type TextBlock    = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ContentBlock = TextBlock | ToolUseBlock;
type MCPContent   = Array<unknown>;
type AnthropicTool = { name: string; description: string; input_schema: object };
type MessageParam  = { role: string; content: unknown };
interface AnthropicResponse { stop_reason: string; content: ContentBlock[] }

/**
 * PlaywrightMCPHealingProvider — Phase 3 self-healing via `@playwright/mcp` + Claude.
 *
 * Spins up an in-process MCP server attached to the test's own browser context,
 * exposes `browser_snapshot` (ARIA accessibility tree) to Claude via Anthropic
 * tool_use, and returns the selector Claude suggests.
 *
 * ## Configuration
 * ```env
 * ANTHROPIC_API_KEY=sk-ant-...          # required
 * ANTHROPIC_MODEL=claude-sonnet-4-6     # optional (default)
 * ```
 */
export class PlaywrightMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'claude-sonnet-4-6',
        private readonly apiVersion: string = '2023-06-01',
    ) {}

    async suggestSelector(description: string): Promise<string | null> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            return await this.runAgenticLoop(client, description);
        } finally {
            await cleanup();
        }
    }

    private async runAgenticLoop(mcpClient: MCPClient, description: string): Promise<string | null> {
        const snapshotTools = await getSnapshotTools(mcpClient);

        const anthropicTools: AnthropicTool[] = snapshotTools.map(t => ({
            name:         t.name,
            description:  t.description ?? `Playwright MCP tool: ${t.name}`,
            input_schema: t.inputSchema,
        }));

        const messages: MessageParam[] = [
            { role: 'user', content: `Find a reliable Playwright selector for: "${description}"` },
        ];

        for (let turn = 0; turn < 3; turn++) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         this.apiKey,
                    'anthropic-version': this.apiVersion,
                },
                body: JSON.stringify({
                    model:      this.model,
                    max_tokens: 1024,
                    system:     SYSTEM_PROMPT,
                    tools:      anthropicTools,
                    messages,
                }),
            });

            if (!response.ok) {
                throw new Error(`Anthropic API (MCP provider) error ${response.status}: ${await response.text()}`);
            }

            const data = await response.json() as AnthropicResponse;

            if (data.stop_reason === 'end_turn') {
                const text = (data.content.find(b => b.type === 'text') as TextBlock | undefined)
                    ?.text?.trim() ?? null;
                return (!text || text === 'UNABLE_TO_HEAL') ? null : text;
            }

            if (data.stop_reason === 'tool_use') {
                const toolUse = data.content.find(b => b.type === 'tool_use') as ToolUseBlock | undefined;
                if (!toolUse) break;

                const toolResult: MCPToolResult = await mcpClient.callTool({
                    name:      toolUse.name,
                    arguments: toolUse.input,
                });

                const resultContent = toolResult.content
                    .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                    .join('\n');

                messages.push({ role: 'assistant', content: data.content as MCPContent });
                messages.push({
                    role: 'user',
                    content: [{
                        type:        'tool_result',
                        tool_use_id: toolUse.id,
                        content:     resultContent,
                    }],
                });
            } else {
                break;
            }
        }

        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GeminiMCPHealingProvider  (Google Gemini)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls `fetch` with exponential-backoff retry on HTTP 429 (rate limit).
 * Waits `baseDelayMs * 2^attempt` ms between retries (capped at `maxDelayMs`).
 */
async function fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries = 3,
    baseDelayMs = 5000,
    maxDelayMs  = 60_000,
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, init);
        if (res.status !== 429 || attempt === maxRetries) return res;

        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    // unreachable — satisfies TypeScript
    return fetch(url, init);
}

type GeminiContent = { role: string; parts: Array<{ text: string }> };
interface GeminiResponse {
    candidates?: Array<{ content?: GeminiContent }>;
}

const GEMINI_SYSTEM_PROMPT =
    `You are a Playwright test automation expert.\n` +
    `You will be given an ARIA accessibility-tree snapshot of the current page.\n` +
    `Use it to find the element described and return a Playwright selector.\n\n` +
    `Respond with ONLY the raw selector string — one of:\n` +
    `  - CSS selector (e.g. input[name="username"])\n` +
    `  - XPath starting with // (e.g. //button[@type="submit"])\n` +
    `Do NOT wrap it in quotes, backticks, or markdown fences.\n` +
    `If you cannot find the element, respond with exactly: UNABLE_TO_HEAL`;

/**
 * GeminiMCPHealingProvider — Phase 3 self-healing via `@playwright/mcp` + Gemini.
 *
 * Takes an ARIA snapshot directly via the MCP client (no function-calling),
 * embeds it in the prompt, and asks Gemini to return a selector in a single
 * text turn. This avoids Gemini's unreliable function-calling behaviour.
 *
 * - The MCP server attaches to the test's existing `BrowserContext` — same auth,
 *   same DOM, no extra navigation.
 *
 * ## Configuration
 * ```env
 * GEMINI_API_KEY=AIza...                # required
 * GEMINI_MODEL=gemini-2.0-flash         # optional (default)
 * ```
 */
export class GeminiMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'gemini-2.0-flash',
    ) {}

    async suggestSelector(description: string): Promise<string | null> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            // Take the ARIA snapshot ourselves — no function-calling needed
            const snapshotTools = await getSnapshotTools(client);
            const snapshotTool  = snapshotTools[0];
            if (!snapshotTool) return null;

            const snapshotResult = await client.callTool({ name: snapshotTool.name, arguments: {} });
            const snapshot = snapshotResult.content
                .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                .join('\n');

            return await this.askGemini(snapshot, description);
        } finally {
            await cleanup();
        }
    }

    private async askGemini(snapshot: string, description: string): Promise<string | null> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const contents: GeminiContent[] = [{
            role:  'user',
            parts: [{ text: `Page snapshot:\n${snapshot}\n\nFind a reliable Playwright selector for: "${description}"` }],
        }];

        const response = await fetchWithRetry(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
                contents,
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API (MCP provider) error ${response.status}: ${await response.text()}`);
        }

        const data  = await response.json() as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts) return null;

        const text = parts.find(p => 'text' in p)?.text?.trim() ?? null;
        return (!text || text === 'UNABLE_TO_HEAL') ? null : text;
    }
}
