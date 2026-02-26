/**
 * Add Employee Tests — OrangeHRM PIM Module
 * Covers: TC-01.1, TC-01.2, TC-02.1–TC-02.3, TC-03.1, TC-04.1–TC-04.3, TC-05.1–TC-05.2
 * Fixture: pomLazyFixture → pomLazy.employeePage (EmployeePage, lazy-created)
 */
import { test } from '../../fixtures/pom-lazy-fixture';

// ── US-01: Form Load ──────────────────────────────────────────────────────────

test.describe('US-01: Add Employee Form — Load & Fields', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-01.1: Form loads — all fields and controls visible', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.verifyAddEmployeeFormLoaded();
    });

    test('TC-01.2: Employee Id is auto-populated on form load', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.assertEmployeeIdIsAutoPopulated();
    });
});

// ── US-02: Successful Save ────────────────────────────────────────────────────

test.describe('US-02: Successfully Add a New Employee', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-02.1: Mandatory fields only — success toast + redirect', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.addEmployee('John', 'Doe');
        await pomLazy.employeePage.assertSuccessToast();
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });

    test('TC-02.2: With optional Middle Name — success toast + redirect', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.addEmployee('Jane', 'Smith', 'Marie');
        await pomLazy.employeePage.assertSuccessToast();
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });

    test('TC-02.3: Redirect URL contains viewPersonalDetails/empNumber/', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.addEmployee('Alice', 'Walker');
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });
});

// ── US-03: Employee Id Override ───────────────────────────────────────────────

test.describe('US-03: Employee Id Override', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-03.1: Override Employee Id — success toast + redirect', async ({ pomLazyFixture: { pomLazy } }) => {
        const uniqueId = `EMP${Date.now().toString().slice(-6)}`;
        await pomLazy.employeePage.fillFirstName('Bob');
        await pomLazy.employeePage.fillLastName('Taylor');
        await pomLazy.employeePage.overrideEmployeeId(uniqueId);
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertSuccessToast();
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });
});

// ── US-04: Mandatory Field Validation ────────────────────────────────────────

test.describe('US-04: Mandatory Field Validation', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-04.1: Empty First Name — Required message shown', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillLastName('Williams');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertFirstNameRequiredMessage();
    });

    test('TC-04.2: Empty Last Name — Required message shown', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('Chris');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertLastNameRequiredMessage();
    });

    test('TC-04.3: All mandatory fields empty — all Required messages shown', async ({ pomLazyFixture: { pomLazy } }) => {
        // Note: OrangeHRM auto-repopulates Employee Id via Vue reactivity when cleared,
        // so only First Name and Last Name Required messages are assertable.
        await pomLazy.employeePage.overrideEmployeeId('');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertFirstNameRequiredMessage();
        await pomLazy.employeePage.assertLastNameRequiredMessage();
    });
});

// ── US-05: Cancel ─────────────────────────────────────────────────────────────

test.describe('US-05: Cancel Employee Creation', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-05.1: Cancel with data entered — routes to Employee List', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('Cancel');
        await pomLazy.employeePage.fillLastName('Test');
        await pomLazy.employeePage.clickCancel();
        await pomLazy.employeePage.assertRedirectedToEmployeeList();
    });

    test('TC-05.2: Cancel with empty form — routes to Employee List', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.clickCancel();
        await pomLazy.employeePage.assertRedirectedToEmployeeList();
    });
});
