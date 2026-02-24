import { test as base } from '@playwright/test';
import { POMLazySelfHealing } from '../../src/pages/pom-lazy-self-healing';
import { AnthropicHealingProvider, GeminiHealingProvider, OpenAIHealingProvider } from '../../src/utils/ai-healing-providers';
import { type AIHealingProvider } from '../../src/utils/self-healing-locator';
import winston from 'winston';
import { Logger } from '../../src/utils/Logger';

type SelfHealingFixture = {
    logger: winston.Logger;
    pomSelfHealing: POMLazySelfHealing;
};

/**
 * Self-Healing Playwright Fixture
 *
 * Extends the base test with `POMLazySelfHealing` and a logger.
 * Mirrors `pom-lazy-fixture.ts` in lifecycle, and adds:
 *
 * 1. **AI provider auto-configuration** — reads env vars to wire up an AI
 *    healing backend. Priority: ANTHROPIC_API_KEY → OPENAI_API_KEY → none.
 *    Without a key, locators still auto-heal via Playwright semantic strategies.
 *
 * 2. **Post-test healing summary** — logs which locators used their primary
 *    selector and which healed (semantic or AI), making it easy to spot
 *    selectors that need updating.
 *
 * ## .env configuration (all optional)
 * ```
 * ANTHROPIC_API_KEY=sk-ant-...               # Claude (highest priority)
 * GEMINI_API_KEY=AIza...                     # Google Gemini (second priority)
 * OPENAI_API_KEY=sk-...                      # OpenAI (third priority)
 *
 * ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # override Claude model
 * GEMINI_MODEL=gemini-2.0-flash              # override Gemini model
 * OPENAI_MODEL=gpt-4o-mini                   # override OpenAI model
 * OPENAI_BASE_URL=https://api.openai.com/v1  # override for Azure/Ollama
 * ```
 *
 * ## Usage
 * ```typescript
 * import { test, expect } from '../../fixtures/self-healing-fixture';
 *
 * test('login', async ({ selfHealingFixture: { pomSelfHealing } }) => {
 *     await pomSelfHealing.loginPage.navigateToLogin();
 *     await pomSelfHealing.loginPage.login('Admin', 'admin123');
 *     await pomSelfHealing.homePage.assertProfileIcon();
 * });
 * ```
 */
export const test = base.extend<{ selfHealingFixture: SelfHealingFixture }>({
    selfHealingFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(
            `Fixture-SelfHealing-${testInfo.title.replace(/\s+/g, '_')}`
        );

        // ── Resolve AI provider from env vars ────────────────────────────────
        const aiProvider = resolveAIProvider(logger);

        const pomSelfHealing = new POMLazySelfHealing(page, testInfo.title, aiProvider);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        await use({ pomSelfHealing, logger });

        // ── Log test outcome ──────────────────────────────────────────────────
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
            if (testInfo.error) {
                logger.error(`   Error: ${testInfo.error.message}`);
            }
        } else if (testInfo.status === 'skipped') {
            logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
        }

        // ── Log self-healing summary ──────────────────────────────────────────
        // The POM manager owns the report — the fixture never inspects locators directly.
        logger.info('--- Self-Healing Locator Summary ---');
        logger.info(pomSelfHealing.getHealingReport());
    }
});

export { expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve AI provider from environment
// ─────────────────────────────────────────────────────────────────────────────

function resolveAIProvider(logger: winston.Logger): AIHealingProvider | undefined {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey    = process.env.GEMINI_API_KEY;
    const openaiKey    = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
        const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
        logger.info(`[SelfHealingFixture] AI provider: Anthropic Claude (${model})`);
        return new AnthropicHealingProvider(anthropicKey, model);
    }

    if (geminiKey) {
        const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
        logger.info(`[SelfHealingFixture] AI provider: Google Gemini (${model})`);
        return new GeminiHealingProvider(geminiKey, model);
    }

    if (openaiKey) {
        const model   = process.env.OPENAI_MODEL   ?? 'gpt-4o-mini';
        const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
        logger.info(`[SelfHealingFixture] AI provider: OpenAI (${model}) @ ${baseUrl}`);
        return new OpenAIHealingProvider(openaiKey, model, baseUrl);
    }

    logger.info('[SelfHealingFixture] No AI provider configured — using semantic auto-healing only (Phases 1-2).');
    return undefined;
}
