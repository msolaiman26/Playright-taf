/**
 * Login Tests Using Builder Pattern
 *
 * Demonstrates the use of UserBuilder pattern for creating test data.
 * This approach provides a fluent, readable API for test data creation
 * with sensible defaults and preset configurations.
 *
 * Benefits over direct object creation:
 * - More readable and expressive
 * - Validation at build time
 * - Preset configurations (asValidAdmin, asInvalidPassword, etc.)
 * - Default values for optional fields
 * - Chainable methods for fluent API
 */

import { test, expect } from '../../fixtures/pom-lazy-fixture';
import { UserBuilder } from '../../../src/builders/user-builder';

test.describe('✅ Login Tests with Builder Pattern', () => {
    test.beforeEach(async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.navigateToLogin();
    });

    test('Successful login using valid admin preset', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;

        // ✅ Using Builder Pattern with preset
        const validUser = new UserBuilder().asValidAdmin().build();

        await pomLazy.loginPage.login(validUser.username, validUser.password);
        await pomLazy.homePage.assertProfileIcon();
    });

    test('Failed login using invalid password preset', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;

        // ✅ Using Builder Pattern with preset
        const invalidUser = new UserBuilder().asInvalidPassword().build();

        await pomLazy.loginPage.login(invalidUser.username, invalidUser.password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login using invalid username preset', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;

        // ✅ Using Builder Pattern with preset
        const invalidUser = new UserBuilder().asInvalidUsername().build();

        await pomLazy.loginPage.login(invalidUser.username, invalidUser.password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login using empty credentials preset', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;

        // ✅ Using Builder Pattern with preset
        const emptyUser = new UserBuilder().asEmptyCredentials().build();

        await pomLazy.loginPage.login(emptyUser.username, emptyUser.password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });

    test('Failed login using custom invalid credentials', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;

        // ✅ Using Builder Pattern with custom values
        const customInvalidUser = new UserBuilder()
            .withUsername('CustomUser')
            .withPassword('customwrongpass')
            .asInvalidUser('custom invalid credentials')
            .withDescription('Custom test case for specific scenario')
            .build();

        await pomLazy.loginPage.login(customInvalidUser.username, customInvalidUser.password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });
});

/**
 * Data-Driven Tests Using Builder Pattern
 *
 * Demonstrates how to use UserBuilder to generate multiple test cases
 * for data-driven testing.
 */
test.describe('✅ Data-Driven Login Tests with Builder', () => {
    test.beforeEach(async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.navigateToLogin();
    });

    // ✅ Generate multiple invalid users using Builder pattern
    const invalidUsers = UserBuilder.buildInvalidUsers();

    invalidUsers.forEach((user) => {
        test(`Failed login for ${user.testType}`, async ({ pomLazyHelpers }) => {
            const { pomLazy } = pomLazyHelpers;

            await pomLazy.loginPage.login(user.username, user.password);
            await pomLazy.loginPage.assertInvalidLoginMessage();
        });
    });
});

/**
 * 📚 Builder Pattern Benefits Demonstrated:
 *
 * 1. **Readability**: `new UserBuilder().asValidAdmin().build()` is self-documenting
 * 2. **Presets**: Common scenarios (valid admin, invalid password) are one-liners
 * 3. **Flexibility**: Can mix presets with custom values
 * 4. **Validation**: Build-time validation ensures required fields are present
 * 5. **Defaults**: Optional fields have sensible default values
 * 6. **Fluent API**: Chainable methods make code flow naturally
 * 7. **Reusability**: Same builder works for positive and negative tests
 * 8. **Maintenance**: Changes to user structure only affect the builder class
 */
