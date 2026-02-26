/**
 * Add Employee Tests
 * BRD: OrangeHRM Add New Employee Flow v1.0
 * Fixture: pomLazyFixture → pomLazy.employeePage
 */
import { test } from '../../fixtures/pom-lazy-fixture';

// ─── US-02: Auto-Generated Employee ID ───────────────────────────────────────

test.describe('US-02: Add Employee Form Fields', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-02.1: Employee ID is auto-generated on form load', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.assertEmployeeIdIsAutoPopulated();
    });
});

// ─── US-04: Mandatory Field Validation ───────────────────────────────────────

test.describe('US-04: Mandatory Field Validation', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-04.1: Save with empty First Name shows Required message', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillLastName('ValidationLast');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertFirstNameRequiredMessage();
    });

    test('TC-04.2: Save with empty Last Name shows Required message', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('ValidationFirst');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertLastNameRequiredMessage();
    });

    test('TC-04.3: Save with empty Employee ID shows Required message', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('ValidationFirst');
        await pomLazy.employeePage.fillLastName('ValidationLast');
        await pomLazy.employeePage.clearEmployeeId();
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertEmployeeIdRequiredMessage();
    });
});

// ─── US-05: Successful Employee Submission ────────────────────────────────────

test.describe('US-05: Successful Employee Submission', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-05.1: Successful save with mandatory fields only', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('AutoTest');
        await pomLazy.employeePage.fillLastName('PipelineUser');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertSuccessToast();
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });

    test('TC-05.2: Successful save with all fields including Middle Name', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('AutoFull');
        await pomLazy.employeePage.fillMiddleName('M');
        await pomLazy.employeePage.fillLastName('PipelineUser');
        await pomLazy.employeePage.clickSave();
        await pomLazy.employeePage.assertSuccessToast();
        await pomLazy.employeePage.assertRedirectedToPersonalDetails();
    });
});

// ─── US-06: Cancel Employee Creation ─────────────────────────────────────────

test.describe('US-06: Cancel Employee Creation', () => {

    test.beforeEach(async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login('Admin', 'admin123');
        await pomLazy.employeePage.navigateToAddEmployee();
    });

    test('TC-06.1: Cancel discards data and routes to Employee List', async ({ pomLazyFixture: { pomLazy } }) => {
        await pomLazy.employeePage.fillFirstName('CancelTest');
        await pomLazy.employeePage.fillLastName('User');
        await pomLazy.employeePage.clickCancel();
        await pomLazy.employeePage.assertRedirectedToEmployeeList();
    });
});
