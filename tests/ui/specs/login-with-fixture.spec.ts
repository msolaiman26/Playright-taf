/**
 * Login Tests — Using custom login-fixture (POMEager variant).
 *
 * This spec demonstrates the simplest test setup: the login-fixture automatically
 * navigates to the login page before each test, so tests only need to call
 * login() and verify the outcome.
 *
 * Fixture provides:
 *   - pomEager:  POMEager with pre-navigated login page
 *   - loginPage: Direct LoginPage access for assertions
 *   - actions:   AdvancedActionsHelper
 *   - assert:    AdvancedAssertionsHelper (prints summary after each test)
 */
import { test } from '../fixtures/login-fixture';
import tsData from '../../../src/data/test-users';

//====================Tests======================

/** Logs in with valid credentials and verifies the profile icon appears on the dashboard */
test('valid login', async ( {pomEager} ) => {
    await pomEager.getLoginPage().login(tsData.username, tsData.password);
    await pomEager.getHomePage().assertProfileIcon();
});

/** Logs in with a wrong password and verifies the "Invalid credentials" error is shown */
test('invalid login', async ( {pomEager, loginPage} ) => {
    await pomEager.getLoginPage().login(tsData.username, 'admin12');
    await loginPage.assertInvalidLoginMessage();
});