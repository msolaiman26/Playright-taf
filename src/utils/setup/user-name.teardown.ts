/**
 * Project-Level Teardown Test — Resets user profile name after tests complete.
 *
 * This is the counterpart to user-name.setup.ts. After all tests finish,
 * this teardown restores the profile name back to "Test Name User" to
 * leave the application in a clean state for subsequent test runs.
 *
 * Configured in playwright.config.ts under a project with `testMatch: /.*teardown.ts/`.
 * Currently commented out in the config but ready to enable for dependency-based workflows.
 */
import { test } from '@playwright/test';

test.describe('update personal details', ()=> {
    test('verify profile name after changing name', async ({ page }) => {
        // Step 1: Log in to OrangeHRM
        await page.goto('/');
        await page.getByPlaceholder('Username').fill('Admin');
        await page.getByPlaceholder('Password').fill('admin123');
        await page.getByRole('button', { name: 'Login' }).click();

        // Step 2: Navigate to "My Info" page
        await page.getByText("My Info").click();

        // Step 3: Reset the profile name fields to original values
        await page.getByPlaceholder("First Name").fill('Test');
        await page.getByPlaceholder("Middle Name").fill('Name');
        await page.getByPlaceholder("Last Name").fill('User');

        // Step 4: Save the changes
        await page.locator("//div[@class='orangehrm-horizontal-padding orangehrm-vertical-padding']//button[@type='submit'][normalize-space()='Save']").click();
    });
});