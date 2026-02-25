import { type Locator, type Page } from '@playwright/test';

/** Extracts the ARIA role union type directly from Playwright's getByRole signature */
type AriaRole = Parameters<Page['getByRole']>[0];
import winston from 'winston';

// ─────────────────────────────────────────────────────────────────────────────
// AI Healing Provider contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any class that implements this interface can be plugged into `SelfHealingLocator`
 * as the last-resort AI healing backend (Phase 3).
 *
 * Built-in implementations (both use `@playwright/mcp` + live ARIA snapshot):
 *   - `PlaywrightMCPHealingProvider` — Claude (Anthropic)
 *   - `GeminiMCPHealingProvider`     — Gemini (Google)
 *
 * Implement this interface directly to add any other AI backend.
 */
export interface AIHealingProvider {
    /**
     * Given a plain-English description of the element to find, return a
     * Playwright selector string (CSS or XPath), or `null` / `'UNABLE_TO_HEAL'`
     * when no reliable selector can be determined.
     *
     * @param elementDescription - e.g. "submit button on the OrangeHRM login form"
     */
    suggestSelector(elementDescription: string): Promise<string | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Element Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic description of the element. Used to auto-generate Playwright built-in
 * locator strategies when the primary CSS/XPath selector fails.
 *
 * Fill only the fields that apply to the element — unused fields are silently skipped.
 */
export interface ElementMetadata {
    /** ARIA role, e.g. 'button', 'textbox', 'heading', 'img' */
    role?: AriaRole;
    /** Accessible name (aria-label, visible button text, heading text …) */
    name?: string;
    /** Text of the `<label>` element associated with an input */
    label?: string;
    /** `placeholder` attribute value of an input/textarea */
    placeholder?: string;
    /** Exact visible text content (buttons, links, headings, paragraphs) */
    text?: string;
    /** `alt` attribute of an `<img>` */
    altText?: string;
    /** `data-testid` attribute value */
    testId?: string;
    /**
     * Plain-English description forwarded to the AI provider when all other
     * strategies fail. Be specific: "username text input on the OrangeHRM login form".
     */
    description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Locator Definition (used by locator repositories)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plain-data descriptor for a single self-healing locator.
 * Lives in a locator-repository file (`src/locators/*.ts`) so selector strings
 * and semantic metadata are kept separate from page-object behaviour.
 */
export interface LocatorDefinition {
    /** Primary CSS or XPath selector to try first */
    selector: string;
    /** Semantic metadata used to auto-generate healing strategies */
    metadata: ElementMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// SelfHealingLocator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SelfHealingLocator — A three-phase resilient locator that does NOT require
 * manually maintained fallback selector lists.
 *
 * ## Phase 1 — Primary selector
 * Tries the CSS/XPath selector you wrote. If the element is found within
 * `probeTimeout` ms, returns it immediately (no overhead).
 *
 * ## Phase 2 — Semantic auto-strategies
 * When the primary fails, derives Playwright built-in locator strategies
 * automatically from `ElementMetadata`:
 *   - `getByRole(role, { name })`
 *   - `getByLabel(label)`
 *   - `getByPlaceholder(placeholder)`
 *   - `getByText(text, { exact: true })`
 *   - `getByAltText(altText)`
 *   - `getByTestId(testId)`
 * These are semantically grounded and survive DOM restructuring, class renames,
 * or attribute changes as long as the element's accessible meaning stays the same.
 *
 * ## Phase 3 — AI healing via Playwright MCP (opt-in)
 * If all semantic strategies also fail and an `AIHealingProvider` was supplied,
 * the provider is invoked with the element description. The MCP providers spin up
 * an in-process `@playwright/mcp` server, take a live ARIA snapshot, and ask the
 * AI to return a working selector.
 *
 * ## Integration with existing helpers
 * `AdvancedActionsHelper` and `AdvancedAssertionsHelper` accept plain Playwright
 * `Locator` objects. Call `await locator.get()` in page methods to resolve the
 * self-healing locator before passing it to a helper — no changes to helpers needed.
 *
 * ## Example
 * ```typescript
 * this.usernameInput = new SelfHealingLocator(page,
 *     'input[name="username"]',          // primary — the only selector you write
 *     {
 *         role: 'textbox',
 *         label: 'Username',
 *         placeholder: 'Username',
 *         description: 'Username input on the login form',
 *     },
 *     logger,
 *     aiProvider,   // optional — omit for semantic-only healing
 * );
 *
 * // In a page method:
 * await this.actions.fill(await this.usernameInput.get(), value, 'Enter username');
 * ```
 */
export class SelfHealingLocator {
    private readonly page: Page;
    private readonly primarySelector: string;
    private readonly metadata: ElementMetadata;
    private readonly logger: winston.Logger;
    private readonly aiProvider?: AIHealingProvider;

    /**
     * Tracks the outcome of the last `get()` call.
     * - `pending`  → `get()` has never been called
     * - `primary`  → Phase 1 succeeded (primary selector found the element)
     * - `healed`   → Phase 2 or 3 succeeded (a fallback strategy found the element)
     * - `failed`   → All phases exhausted; element was not found by any strategy
     */
    private _resolution: 'pending' | 'primary' | 'healed' | 'failed' = 'pending';
    private _healedStrategy: string = '';

    /**
     * @param page            - Playwright Page instance
     * @param primarySelector - The CSS or XPath selector that currently works
     * @param metadata        - Semantic description used to auto-generate healing strategies
     * @param logger          - Winston logger from the parent page object
     * @param aiProvider      - Optional AI backend for last-resort healing
     */
    constructor(
        page: Page,
        primarySelector: string,
        metadata: ElementMetadata,
        logger: winston.Logger,
        aiProvider?: AIHealingProvider,
    ) {
        this.page = page;
        this.primarySelector = primarySelector;
        this.metadata = metadata;
        this.logger = logger;
        this.aiProvider = aiProvider;
    }

    // ─── Static factory ────────────────────────────────────────────────────────

    /**
     * Creates a `SelfHealingLocator` from a `LocatorDefinition` (locator-repository entry).
     * Keeps page constructors free of inline selector strings and metadata literals.
     *
     * ```typescript
     * this.usernameInput = SelfHealingLocator.from(page, loginLocators.usernameInput, logger);
     * ```
     */
    static from(
        page: Page,
        def: LocatorDefinition,
        logger: winston.Logger,
        aiProvider?: AIHealingProvider,
    ): SelfHealingLocator {
        return new SelfHealingLocator(page, def.selector, def.metadata, logger, aiProvider);
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Resolves to a working Playwright `Locator` using the three-phase strategy.
     * Safe to call multiple times — each call re-probes the live page DOM.
     *
     * @param probeTimeout - Per-strategy probe timeout in ms (default 2 000).
     *                       Keep short; the action's own Playwright timeout still applies.
     */
    async get(probeTimeout: number = 2000): Promise<Locator> {
        // ── Phase 1: Primary selector ──────────────────────────────────────────
        const primaryLocator = this.page.locator(this.primarySelector);
        if (await this.probe(primaryLocator, probeTimeout)) {
            this._resolution = 'primary';
            this.logger.debug(
                `[SelfHealingLocator] ✓ Primary resolved: "${this.metadata.description}" → ${this.primarySelector}`
            );
            return primaryLocator;
        }

        this.logger.warn(
            `[SelfHealingLocator] Primary selector failed for "${this.metadata.description}": ${this.primarySelector} — starting self-healing…`
        );

        // ── Phase 2: Semantic auto-strategies ──────────────────────────────────
        const semanticStrategies = this.buildSemanticStrategies();
        for (const { locator, label } of semanticStrategies) {
            if (await this.probe(locator, probeTimeout)) {
                this._resolution = 'healed';
                this._healedStrategy = `Semantic: ${label}`;
                this.logger.warn(
                    `[SelfHealingLocator] ⚠ Healed via semantic strategy for "${this.metadata.description}": ${label}`
                );
                return locator;
            }
        }

        // ── Phase 3: AI healing via Playwright MCP (opt-in) ────────────────────
        if (this.aiProvider) {
            this.logger.warn(
                `[SelfHealingLocator] Semantic strategies exhausted — invoking AI healing for "${this.metadata.description}"…`
            );
            const aiLocator = await this.tryAIHealing(probeTimeout);
            if (aiLocator) return aiLocator;
        }

        // ── All strategies failed — mark as failed and surface natural Playwright error ──
        this._resolution = 'failed';
        this.logger.error(
            `[SelfHealingLocator] ✗ All healing strategies failed for "${this.metadata.description}". ` +
            `Returning primary selector — expect a Playwright timeout error.`
        );
        return primaryLocator;
    }

    /** `true` when `get()` resolved via a non-primary (healed) strategy */
    wasHealed(): boolean {
        return this._resolution === 'healed';
    }

    /** `true` when `get()` was called at least once during the test */
    wasUsed(): boolean {
        return this._resolution !== 'pending';
    }

    /**
     * One-line summary suitable for post-test reports.
     * Accurately reflects all four possible outcomes.
     */
    getHealingReport(): string {
        switch (this._resolution) {
            case 'pending': return `◌ NOT USED — "${this.metadata.description}"`;
            case 'primary': return `✓ PRIMARY  — "${this.metadata.description}"`;
            case 'healed':  return `⚠ HEALED   — "${this.metadata.description}" via [${this._healedStrategy}]`;
            case 'failed':  return `✗ FAILED   — "${this.metadata.description}" (all strategies exhausted)`;
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    /** Returns `true` if the locator finds an attached element before `timeout` ms. */
    private async probe(locator: Locator, timeout: number): Promise<boolean> {
        try {
            await locator.waitFor({ state: 'attached', timeout });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Builds an ordered list of Playwright semantic locators derived from
     * `ElementMetadata`. Only non-null fields contribute a strategy.
     */
    private buildSemanticStrategies(): Array<{ locator: Locator; label: string }> {
        const strategies: Array<{ locator: Locator; label: string }> = [];
        const { role, name, label, placeholder, text, altText, testId } = this.metadata;

        if (role && name) {
            strategies.push({
                locator: this.page.getByRole(role, { name }),
                label:   `getByRole('${role}', { name: '${name}' })`,
            });
        }
        if (role && !name) {
            strategies.push({
                locator: this.page.getByRole(role),
                label:   `getByRole('${role}')`,
            });
        }
        if (label) {
            strategies.push({
                locator: this.page.getByLabel(label),
                label:   `getByLabel('${label}')`,
            });
        }
        if (placeholder) {
            strategies.push({
                locator: this.page.getByPlaceholder(placeholder),
                label:   `getByPlaceholder('${placeholder}')`,
            });
        }
        if (text) {
            strategies.push({
                locator: this.page.getByText(text, { exact: true }),
                label:   `getByText('${text}', exact)`,
            });
        }
        if (altText) {
            strategies.push({
                locator: this.page.getByAltText(altText),
                label:   `getByAltText('${altText}')`,
            });
        }
        if (testId) {
            strategies.push({
                locator: this.page.getByTestId(testId),
                label:   `getByTestId('${testId}')`,
            });
        }

        return strategies;
    }

    /**
     * Invokes the AI provider with the element description.
     * The MCP provider attaches to the live browser context and calls `browser_snapshot`
     * to get the ARIA tree — no HTML capture needed here.
     */
    private async tryAIHealing(probeTimeout: number): Promise<Locator | null> {
        try {
            const suggested = await this.aiProvider!.suggestSelector(this.metadata.description);

            if (!suggested || suggested.trim() === '' || suggested === 'UNABLE_TO_HEAL') {
                this.logger.warn(`[SelfHealingLocator] AI could not suggest a selector for "${this.metadata.description}"`);
                return null;
            }

            const aiLocator = this.page.locator(suggested.trim());
            if (await this.probe(aiLocator, probeTimeout)) {
                this._resolution = 'healed';
                this._healedStrategy = `AI: ${suggested.trim()}`;
                this.logger.warn(
                    `[SelfHealingLocator] ✨ AI-healed "${this.metadata.description}": suggested selector "${suggested.trim()}"`
                );
                return aiLocator;
            }

            this.logger.warn(
                `[SelfHealingLocator] AI suggestion "${suggested.trim()}" did not find an element for "${this.metadata.description}"`
            );
        } catch (error) {
            this.logger.error(`[SelfHealingLocator] AI healing threw an error for "${this.metadata.description}": ${error}`);
        }

        return null;
    }
}
