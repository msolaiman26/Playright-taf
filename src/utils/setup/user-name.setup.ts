/**
 * Project-Level Setup Test — Updates user profile name before tests run.
 *
 * This file is designed to be used as a Playwright "setup" project dependency.
 * It logs in as Admin, navigates to "My Info", and changes the profile name
 * to "Mohamed Bakry Bakry". The corresponding teardown file (user-name.teardown.ts)
 * resets the name back to "Test Name User" after tests complete.
 *
 * Configured in playwright.config.ts under a project with `testMatch: /.*setup.ts/`.
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

        // Step 3: Update the profile name fields
        await page.getByPlaceholder("First Name").fill('Mohamed');
        await page.getByPlaceholder("Middle Name").fill('Bakry');
        await page.getByPlaceholder("Last Name").fill('Bakry');

        // Step 4: Save the changes
        await page.locator("//div[@class='orangehrm-horizontal-padding orangehrm-vertical-padding']//button[@type='submit'][normalize-space()='Save']").click();
    });
});