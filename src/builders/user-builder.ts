/**
 * User Builder Pattern
 *
 * Provides a fluent API for creating test user objects.
 * Simplifies test data creation with sensible defaults and chainable methods.
 *
 * Benefits:
 * - Readable, expressive test data creation
 * - Default values for optional fields
 * - Validation at build time
 * - Reusable preset configurations (asAdmin, asInvalidUser, etc.)
 *
 * Usage Examples:
 *
 * // Create a valid admin user
 * const admin = new UserBuilder()
 *     .withUsername('Admin')
 *     .withPassword('admin123')
 *     .build();
 *
 * // Create an invalid user for negative testing
 * const invalidUser = new UserBuilder()
 *     .withUsername('InvalidUser')
 *     .withPassword('wrongpass')
 *     .asInvalidUser('invalid username')
 *     .build();
 *
 * // Create user with preset configuration
 * const admin = new UserBuilder().asValidAdmin().build();
 */

export interface TestUser {
    username: string;
    password: string;
    testType?: string;       // For invalid users: 'invalid password', 'invalid username', etc.
    isValid?: boolean;       // Whether credentials are expected to work
    description?: string;    // Human-readable description for test reports
}

export class UserBuilder {
    private user: Partial<TestUser> = {
        isValid: true,           // Default: assume valid credentials
        testType: 'valid user'
    };

    /**
     * Set the username
     */
    withUsername(username: string): this {
        this.user.username = username;
        return this;
    }

    /**
     * Set the password
     */
    withPassword(password: string): this {
        this.user.password = password;
        return this;
    }

    /**
     * Set the test type (e.g., 'invalid password', 'empty credentials')
     */
    withTestType(testType: string): this {
        this.user.testType = testType;
        return this;
    }

    /**
     * Set a description for test reports
     */
    withDescription(description: string): this {
        this.user.description = description;
        return this;
    }

    /**
     * Mark this user as invalid (for negative testing)
     */
    asInvalidUser(testType: string): this {
        this.user.isValid = false;
        this.user.testType = testType;
        return this;
    }

    /**
     * Preset: Valid admin user for OrangeHRM demo
     */
    asValidAdmin(): this {
        this.user.username = 'Admin';
        this.user.password = 'admin123';
        this.user.isValid = true;
        this.user.testType = 'valid admin';
        this.user.description = 'Standard admin user for OrangeHRM demo';
        return this;
    }

    /**
     * Preset: Invalid user with wrong password
     */
    asInvalidPassword(): this {
        this.user.username = 'Admin';
        this.user.password = 'wrongpassword';
        this.user.isValid = false;
        this.user.testType = 'invalid password';
        this.user.description = 'Correct username but wrong password';
        return this;
    }

    /**
     * Preset: Invalid user with wrong username
     */
    asInvalidUsername(): this {
        this.user.username = 'InvalidUser';
        this.user.password = 'admin123';
        this.user.isValid = false;
        this.user.testType = 'invalid username';
        this.user.description = 'Wrong username but correct password';
        return this;
    }

    /**
     * Preset: Empty credentials
     */
    asEmptyCredentials(): this {
        this.user.username = '';
        this.user.password = '';
        this.user.isValid = false;
        this.user.testType = 'empty credentials';
        this.user.description = 'Both username and password are empty';
        return this;
    }

    /**
     * Build and return the user object
     * Validates required fields before returning
     */
    build(): TestUser {
        // Validation: username and password are required
        if (this.user.username === undefined || this.user.password === undefined) {
            throw new Error(
                'UserBuilder validation failed: username and password are required fields. ' +
                'Use .withUsername() and .withPassword() or use a preset like .asValidAdmin()'
            );
        }

        return this.user as TestUser;
    }

    /**
     * Build multiple invalid users at once for data-driven testing
     * Returns an array of invalid user configurations
     */
    static buildInvalidUsers(): TestUser[] {
        return [
            new UserBuilder().asInvalidPassword().build(),
            new UserBuilder().asInvalidUsername().build(),
            new UserBuilder().asEmptyCredentials().build()
        ];
    }

    /**
     * Build a custom invalid user
     */
    static buildCustomInvalid(username: string, password: string, testType: string): TestUser {
        return new UserBuilder()
            .withUsername(username)
            .withPassword(password)
            .asInvalidUser(testType)
            .build();
    }
}
