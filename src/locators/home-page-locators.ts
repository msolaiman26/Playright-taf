import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for HomePageSelfHealing.
 *
 * Contains only pure data (selector strings + semantic metadata).
 * No Playwright Page dependency — safe to import anywhere without side effects.
 */
export const homeLocators = {

    profile_icn: {
        selector: "//img[@class='oxd-userdropdown-img']",
        metadata: {
            role:        'img',
            altText:     'profile picture',
            description: 'User profile dropdown image in the OrangeHRM top navigation bar',
        },
    },

} satisfies Record<string, LocatorDefinition>;
