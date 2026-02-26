import { Page, Locator } from '@playwright/test';
import type { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import type { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import winston from 'winston';
import { Logger } from '../utils/Logger';
import { HelperFactory } from '../factories/helper-factory';

/**
 * Employee Page Object Model — covers PIM module employee operations.
 *
 * Currently implements: Add Employee form (BRD v1.0, FR 3.1–3.5).
 * Extend this class for Edit Employee, Delete Employee, and other
 * employee-related features — all employee UI logic lives here.
 */
export class EmployeePage {
    readonly page: Page;
    private readonly logger: winston.Logger;
    readonly actions: AdvancedActionsHelper;
    readonly assert: AdvancedAssertionsHelper;

    // ===================== Locators — Add Employee Form =====================
    readonly firstNameInput: Locator;
    readonly middleNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly employeeIdInput: Locator;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly successToast: Locator;
    readonly successToastText: Locator;
    readonly firstNameRequiredMsg: Locator;
    readonly lastNameRequiredMsg: Locator;
    readonly employeeIdRequiredMsg: Locator;

    // ===================== Constants =====================
    readonly addEmployeeUrl = 'https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee';
    readonly successToastMessage = 'Successfully Saved';

    // ===================== Constructor =====================
    constructor(page: Page, testName?: string) {
        this.page = page;
        this.logger = Logger.getLogger(`Employee-${testName || 'Employee'}`);
        const helpers = HelperFactory.createHelpers(page, testName || 'Employee');
        this.actions = helpers.actions;
        this.assert = helpers.assert;

        // Name fields have name attributes — reliable primary selectors
        this.firstNameInput  = page.locator('input[name="firstName"]');
        this.middleNameInput = page.locator('input[name="middleName"]');
        this.lastNameInput   = page.locator('input[name="lastName"]');

        // Employee Id has no name attribute — anchored to its visible label
        this.employeeIdInput = page.locator("//label[normalize-space()='Employee Id']/following::input[1]");

        this.saveButton   = page.locator('button[type="submit"]');
        this.cancelButton = page.locator('button.oxd-button--ghost');

        // OrangeHRM 5.x success toast
        this.successToast     = page.locator('.oxd-toast--success');
        this.successToastText = page.locator('p.oxd-text--toast-message');

        // Per-field Required validation messages (span injected by OrangeHRM after failed submit)
        this.firstNameRequiredMsg = page.locator(
            "//input[@name='firstName']/ancestor::div[contains(@class,'oxd-input-group')]//span[contains(@class,'oxd-input-group__message')]"
        ).first();
        this.lastNameRequiredMsg = page.locator(
            "//input[@name='lastName']/ancestor::div[contains(@class,'oxd-input-group')]//span[contains(@class,'oxd-input-group__message')]"
        ).first();
        this.employeeIdRequiredMsg = page.locator(
            "//label[normalize-space()='Employee Id']/following::div[contains(@class,'oxd-input-group')][1]//span[contains(@class,'oxd-input-group__message')]"
        ).first();
    }

    // ===================== Navigation =====================

    async navigateToAddEmployee() {
        this.logger.info('Navigating to Add Employee page');
        // Settle any pending SPA navigation (e.g., post-login redirect) before navigating
        try { await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }); } catch { /* already settled */ }
        await this.actions.goto(this.addEmployeeUrl, 'Navigate to Add Employee form');
        // Wait for Vue SPA to finish all API/data requests before interacting
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        await this.actions.waitForVisible(this.firstNameInput, 'Wait for Add Employee form to render', 30000);
        this.logger.debug(`Current URL: ${this.page.url()}`);
    }

    // ===================== Action Methods =====================

    async fillFirstName(firstName: string) {
        this.logger.debug(`Filling First Name: "${firstName}"`);
        await this.actions.fill(this.firstNameInput, firstName, 'Enter first name');
    }

    async fillMiddleName(middleName: string) {
        this.logger.debug(`Filling Middle Name: "${middleName}"`);
        await this.actions.fill(this.middleNameInput, middleName, 'Enter middle name');
    }

    async fillLastName(lastName: string) {
        this.logger.debug(`Filling Last Name: "${lastName}"`);
        await this.actions.fill(this.lastNameInput, lastName, 'Enter last name');
    }

    async overrideEmployeeId(employeeId: string) {
        this.logger.debug(`Overriding Employee Id: "${employeeId}"`);
        await this.actions.fill(this.employeeIdInput, employeeId, 'Override Employee Id');
    }

    async clearEmployeeId() {
        this.logger.debug('Clearing Employee Id field');
        await this.employeeIdInput.fill('');
    }

    async clickSave() {
        this.logger.debug('Clicking Save button');
        await this.actions.click(this.saveButton, 'Click Save button');
    }

    async clickCancel() {
        this.logger.debug('Clicking Cancel button');
        await this.actions.click(this.cancelButton, 'Click Cancel button');
    }

    async addEmployee(firstName: string, lastName: string, middleName?: string) {
        this.logger.info(`Adding employee: ${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`);
        await this.fillFirstName(firstName);
        if (middleName) await this.fillMiddleName(middleName);
        await this.fillLastName(lastName);
        await this.clickSave();
    }

    // ===================== Assertion Methods =====================

    async assertSuccessToast() {
        this.logger.info('Asserting success toast notification');
        await this.actions.waitForVisible(this.successToast, 'Wait for success toast to appear', 10000);
        await this.assert.toBeVisible(this.successToast, 'Verify success toast is visible');
        await this.assert.toContainText(
            this.successToastText,
            this.successToastMessage,
            'Verify success toast text'
        );
    }

    async assertRedirectedToPersonalDetails() {
        this.logger.info('Asserting redirect to Personal Details');
        await this.page.waitForURL(/viewPersonalDetails/, { timeout: 15000 });
        await this.assert.toHaveURL(/viewPersonalDetails/, 'Verify URL contains viewPersonalDetails');
    }

    async assertRedirectedToEmployeeList() {
        this.logger.info('Asserting redirect to Employee List');
        await this.page.waitForURL(/viewEmployeeList/, { timeout: 10000 });
        await this.assert.toHaveURL(/viewEmployeeList/, 'Verify URL contains viewEmployeeList');
    }

    async assertFirstNameRequiredMessage() {
        await this.actions.waitForVisible(this.firstNameRequiredMsg, 'Wait for First Name Required message', 5000);
        await this.assert.toBeVisible(this.firstNameRequiredMsg, 'Verify Required msg under First Name');
        await this.assert.toContainText(this.firstNameRequiredMsg, 'Required', 'Verify First Name Required text');
    }

    async assertLastNameRequiredMessage() {
        await this.actions.waitForVisible(this.lastNameRequiredMsg, 'Wait for Last Name Required message', 5000);
        await this.assert.toBeVisible(this.lastNameRequiredMsg, 'Verify Required msg under Last Name');
        await this.assert.toContainText(this.lastNameRequiredMsg, 'Required', 'Verify Last Name Required text');
    }

    async assertEmployeeIdRequiredMessage() {
        await this.actions.waitForVisible(this.employeeIdRequiredMsg, 'Wait for Employee Id Required message', 5000);
        await this.assert.toBeVisible(this.employeeIdRequiredMsg, 'Verify Required msg under Employee Id');
        await this.assert.toContainText(this.employeeIdRequiredMsg, 'Required', 'Verify Employee Id Required text');
    }

    async assertEmployeeIdIsAutoPopulated() {
        this.logger.info('Asserting Employee Id is auto-populated');
        const idValue = await this.employeeIdInput.inputValue();
        this.logger.debug(`Auto-generated Employee Id value: "${idValue}"`);
        await this.assert.toBeTruthy(
            idValue.trim().length > 0,
            'Verify Employee Id is auto-populated with a non-empty value'
        );
    }

    // ===================== Verification Methods =====================

    async verifyAddEmployeeFormLoaded() {
        this.logger.info('Verifying Add Employee form loaded');
        await this.assert.toHaveURL(/addEmployee/, 'Verify URL contains addEmployee', true);
        await this.assert.toBeVisible(this.firstNameInput,  'Verify First Name visible',  true);
        await this.assert.toBeVisible(this.middleNameInput, 'Verify Middle Name visible', true);
        await this.assert.toBeVisible(this.lastNameInput,   'Verify Last Name visible',   true);
        await this.assert.toBeVisible(this.employeeIdInput, 'Verify Employee Id visible', true);
        await this.assert.toBeVisible(this.saveButton,      'Verify Save button visible', true);
        await this.assert.toBeVisible(this.cancelButton,    'Verify Cancel button visible', true);
        await this.assert.assertAllSoftAssertions();
    }

    // ===================== Utilities =====================

    getSummaries(): string {
        const actionsSummary = this.actions.getSummary();
        const assertionStats = this.assert.getAssertionStats();
        const lines = actionsSummary.split('\n');
        const summaryLines: string[] = [];
        for (const line of lines) {
            summaryLines.push(line);
            if (line.includes('Total Steps:')) {
                summaryLines.push(
                    `Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`
                );
            }
        }
        return summaryLines.join('\n');
    }
}
