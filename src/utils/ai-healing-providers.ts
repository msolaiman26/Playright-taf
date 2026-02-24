import { type AIHealingProvider } from './self-healing-locator';

/**
 * AI Healing Providers
 *
 * Built-in implementations of `AIHealingProvider` that power Phase 3 (AI fallback)
 * of `SelfHealingLocator`. All use the native `fetch` API — no extra SDK packages
 * are required.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Provider                │  Env var            │  Default model  │
 * │──────────────────────────│─────────────────────│─────────────────│
 * │  AnthropicHealingProvider │  ANTHROPIC_API_KEY  │  claude-haiku   │
 * │  GeminiHealingProvider    │  GEMINI_API_KEY     │  gemini-2.0-flash│
 * │  OpenAIHealingProvider    │  OPENAI_API_KEY     │  gpt-4o-mini    │
 * │  CustomAIHealingProvider  │  (any URL + key)    │  any            │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Auto-detection priority in `self-healing-fixture.ts`:
 *   ANTHROPIC_API_KEY → GEMINI_API_KEY → OPENAI_API_KEY → semantic-only
 *
 * Implementing your own provider for any other endpoint:
 * ```typescript
 * class MyProvider implements AIHealingProvider {
 *     async suggestSelector(pageSnapshot: string, description: string): Promise<string | null> {
 *         // call your API here and return a selector string or null
 *     }
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(pageSnapshot: string, description: string): string {
    return (
        `You are a Playwright test automation expert.\n` +
        `I need a CSS selector or XPath expression that uniquely identifies the following element:\n\n` +
        `Element description: "${description}"\n\n` +
        `Page HTML (scripts and styles removed):\n${pageSnapshot}\n\n` +
        `Rules:\n` +
        `- Return ONLY the raw selector string (CSS or XPath starting with //).\n` +
        `- Do NOT wrap it in quotes, backticks, or markdown code blocks.\n` +
        `- Prefer stable attributes (name, type, placeholder, aria-*, data-*) over brittle class names.\n` +
        `- If you cannot determine a reliable selector, respond with exactly: UNABLE_TO_HEAL`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic (Claude)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses the Anthropic Messages API to suggest a healed selector.
 *
 * Set `ANTHROPIC_API_KEY` in your `.env` file.
 *
 * ```typescript
 * const provider = new AnthropicHealingProvider(process.env.ANTHROPIC_API_KEY!);
 * // or override the model:
 * const provider = new AnthropicHealingProvider(process.env.ANTHROPIC_API_KEY!, 'claude-opus-4-6');
 * ```
 */
export class AnthropicHealingProvider implements AIHealingProvider {
    private readonly apiKey: string;
    private readonly model: string;
    private readonly apiVersion: string;

    constructor(
        apiKey: string,
        model: string = 'claude-haiku-4-5-20251001',
        apiVersion: string = '2023-06-01',
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.apiVersion = apiVersion;
    }

    async suggestSelector(pageSnapshot: string, description: string): Promise<string | null> {
        const prompt = buildPrompt(pageSnapshot, description);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type':    'application/json',
                'x-api-key':       this.apiKey,
                'anthropic-version': this.apiVersion,
            },
            body: JSON.stringify({
                model:      this.model,
                max_tokens: 256,
                messages:   [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as {
            content: Array<{ type: string; text: string }>;
        };

        const text = data.content.find(c => c.type === 'text')?.text?.trim() ?? null;
        return text === 'UNABLE_TO_HEAL' ? null : text;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI (ChatGPT / any OpenAI-compatible endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses the OpenAI Chat Completions API to suggest a healed selector.
 * Compatible with any OpenAI-spec endpoint (Azure OpenAI, Ollama, etc.)
 * by overriding the `baseUrl` parameter.
 *
 * Set `OPENAI_API_KEY` in your `.env` file.
 *
 * ```typescript
 * const provider = new OpenAIHealingProvider(process.env.OPENAI_API_KEY!);
 * // Azure OpenAI:
 * const provider = new OpenAIHealingProvider(process.env.AZURE_KEY!, 'gpt-4o', 'https://my-resource.openai.azure.com/...');
 * // Ollama (local, no key needed):
 * const provider = new OpenAIHealingProvider('', 'llama3', 'http://localhost:11434/v1');
 * ```
 */
export class OpenAIHealingProvider implements AIHealingProvider {
    private readonly apiKey: string;
    private readonly model: string;
    private readonly baseUrl: string;

    constructor(
        apiKey: string,
        model: string = 'gpt-4o-mini',
        baseUrl: string = 'https://api.openai.com/v1',
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async suggestSelector(pageSnapshot: string, description: string): Promise<string | null> {
        const prompt = buildPrompt(pageSnapshot, description);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model:      this.model,
                max_tokens: 256,
                messages: [
                    {
                        role:    'system',
                        content: 'You are a Playwright test automation expert that identifies CSS and XPath selectors.',
                    },
                    { role: 'user', content: prompt },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as {
            choices: Array<{ message: { content: string } }>;
        };

        const text = data.choices[0]?.message?.content?.trim() ?? null;
        return text === 'UNABLE_TO_HEAL' ? null : text;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Gemini
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses the Google Generative Language REST API (Gemini) to suggest a healed selector.
 *
 * Set `GEMINI_API_KEY` in your `.env` file.
 *
 * ```typescript
 * const provider = new GeminiHealingProvider(process.env.GEMINI_API_KEY!);
 * // override model (default is gemini-2.0-flash):
 * const provider = new GeminiHealingProvider(process.env.GEMINI_API_KEY!, 'gemini-1.5-pro');
 * ```
 *
 * Available models (as of 2026): gemini-2.0-flash, gemini-2.0-flash-lite,
 * gemini-1.5-pro, gemini-1.5-flash.
 * See https://ai.google.dev/gemini-api/docs/models for the current model list.
 */
export class GeminiHealingProvider implements AIHealingProvider {
    private readonly apiKey: string;
    private readonly model: string;

    constructor(
        apiKey: string,
        model: string = 'gemini-2.0-flash',
    ) {
        this.apiKey = apiKey;
        this.model  = model;
    }

    async suggestSelector(pageSnapshot: string, description: string): Promise<string | null> {
        const prompt = buildPrompt(pageSnapshot, description);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: prompt }] },
                ],
                generationConfig: { maxOutputTokens: 256 },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as {
            candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
            }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
        return text === 'UNABLE_TO_HEAL' ? null : text;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom / generic HTTP provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A minimal base class for building a provider against any HTTP AI endpoint
 * that isn't directly OpenAI-compatible.
 *
 * Override `callAPI` to implement the HTTP request, and return the raw selector
 * text (or `null` on failure).
 *
 * ```typescript
 * class GeminiHealingProvider extends CustomAIHealingProvider {
 *     protected async callAPI(prompt: string): Promise<string | null> {
 *         // Gemini REST call here
 *     }
 * }
 * ```
 */
export abstract class CustomAIHealingProvider implements AIHealingProvider {
    async suggestSelector(pageSnapshot: string, description: string): Promise<string | null> {
        const prompt = buildPrompt(pageSnapshot, description);
        const result = await this.callAPI(prompt);
        return result === 'UNABLE_TO_HEAL' ? null : result;
    }

    /** Implement this to call your AI endpoint. Return the raw selector string or null. */
    protected abstract callAPI(prompt: string): Promise<string | null>;
}
