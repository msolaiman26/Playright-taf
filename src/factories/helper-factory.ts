/**
 * Helper Factory Pattern
 *
 * Centralizes creation of helper classes (Actions, Assertions, and utilities).
 * Provides consistent instantiation with optional configuration.
 *
 * Benefits:
 * - Single source of truth for helper creation
 * - Consistent configuration across all helpers
 * - Easy to add pre-configured helper variants
 * - Reduces duplication in fixtures
 * - Can apply framework-wide helper settings
 *
 * Usage Examples:
 *
 * // Create individual helpers
 * const actions = HelperFactory.createActionsHelper(page, 'My Test');
 * const assert = HelperFactory.createAssertionsHelper(page, 'My Test');
 *
 * // Create both helpers at once
 * const { actions, assert } = HelperFactory.createHelpers(page, 'My Test');
 */

import { Page } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { Logger } from '../utils/Logger';

export interface HelperSet {
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
}

export class HelperFactory {
    /**
     * Create an AdvancedActionsHelper instance
     */
    static createActionsHelper(page: Page, testName: string): AdvancedActionsHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating AdvancedActionsHelper for test: ${testName}`);
        return new AdvancedActionsHelper(page, testName);
    }

    /**
     * Create an AdvancedAssertionsHelper instance
     */
    static createAssertionsHelper(page: Page, testName: string): AdvancedAssertionsHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating AdvancedAssertionsHelper for test: ${testName}`);
        return new AdvancedAssertionsHelper(page, testName);
    }

    /**
     * Create both action and assertion helpers at once
     * Returns an object with both helpers
     */
    static createHelpers(page: Page, testName: string): HelperSet {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating helper set (actions + assertions) for test: ${testName}`);

        return {
            actions: this.createActionsHelper(page, testName),
            assert: this.createAssertionsHelper(page, testName)
        };
    }

    /**
     * Create a complete test suite with pages and helpers
     * Useful for quick fixture setup
     */
    static createTestSuite(page: Page, testName: string): {
        actions: AdvancedActionsHelper;
        assert: AdvancedAssertionsHelper;
    } {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating complete test suite for: ${testName}`);

        return this.createHelpers(page, testName);
    }
}
