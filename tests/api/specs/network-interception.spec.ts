/**
 * Network Interception & Mocking Tests.
 *
 * Demonstrates Playwright's powerful network manipulation capabilities:
 *
 *   1. Response Interception — Capture live API responses from the browser and use the data
 *   2. Full Response Mocking — Replace an API response entirely with local mock data
 *   3. Response Modification — Fetch the real response, modify fields, then return it
 *   4. Request Redirection  — Intercept a request and redirect it to a different URL
 *   5. Request Abort        — Block specific resource types (e.g., images) from loading
 *
 * These tests use the api-test-fixture for lightweight helper access.
 * For test 1 (which requires login), LoginPage is manually instantiated.
 */
import { test } from '../../fixtures/api-test-fixture';
import { LoginPage } from '../../../src/pages/login-page';
import tsData from '../../../src/data/test-users';
import mockedResponse from '../../../src/mocks/response-interception.json'
import { Logger } from "../../../src/utils/Logger";

const logger = Logger.getLogger('network-interception');

test.describe('Network interception', ()=> {

    /**
     * Test 1: Response Interception — Capture a live API response.
     *
     * Flow:
     *   1. Log in to OrangeHRM
     *   2. Click the "PIM" menu to trigger the employees API call
     *   3. Wait for and capture the employee list API response
     *   4. Extract the first employee's empNumber from the response
     *   5. Use that empNumber to send a DELETE request via the Playwright request context
     *   6. Log both the captured and deletion response bodies
     */
    test('intercept browser api response', async ({ page, testHelpers, request }) => {
        const { actions } = testHelpers;
        // Manually create LoginPage for this test (only test that needs login)
        const loginPage = new LoginPage(page, 'intercept browser api response');
        logger.info('Logging in to OrangeHRM to intercept browser API response');
        await loginPage.navigateToLogin();
        await loginPage.login(tsData.username, tsData.password);
        await actions.click(page.getByText("PIM"), 'Click PIM menu');

        // Wait for the employees API response triggered by clicking PIM
        logger.info('Waiting for employees API response from PIM page');
        const employeeResponse = await page.waitForResponse('https://opensource-demo.orangehrmlive.com/web/index.php/api/v2/pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC');
        const employeeResponseBody = await employeeResponse.json();
        logger.info(`Captured employees API response, status: ${employeeResponse.status()}, total records: ${employeeResponseBody.data?.length ?? 0}`);
        logger.debug(`Employee response body: ${JSON.stringify(employeeResponseBody)}`);

        // Extract the first employee's number to use in a DELETE request
        const empNumber = employeeResponseBody.data[0].empNumber;
        logger.info(`Extracted first employee number: ${empNumber}`);

        // Send a DELETE request to remove the employee (demonstrates API chaining)
        logger.info(`Sending DELETE /pim/employees with empNumber: ${empNumber}`);
        const requestBody = { "ids": [empNumber] };
        const headers = { "Cookie": "orangehrm=73s9frst1lclj2cod0lc3uaf4b" };
        const deletedEmpResponse = await request.delete('https://opensource-demo.orangehrmlive.com/web/index.php/api/v2/pim/employees',{
            data: requestBody,
            headers: headers
        })
        const deletedEmployeeResponseBody = await deletedEmpResponse.json();
        logger.info(`DELETE response status: ${deletedEmpResponse.status()}`);
        logger.debug(`DELETE response body: ${JSON.stringify(deletedEmployeeResponseBody)}`);
    });

    /**
     * Test 2: Full Response Mocking — Replace an API response with local mock data.
     *
     * Flow:
     *   1. Set up a route handler that intercepts calls to randomuser.me
     *   2. Instead of making the real API call, return data from response-interception.json
     *   3. Navigate to a page that calls this API and triggers a UI update
     *   4. Verify the UI displays the mocked data ("Playwright User")
     */
    test('Mocking1: mock api response', async ({ page, testHelpers }) => {
        const { actions, assert } = testHelpers;

        // Intercept the randomuser.me API and return our mock data instead
        logger.info('Setting up route interception for https://api.randomuser.me/?nat=us');
        await page.route('https://api.randomuser.me/?nat=us', async route =>{
            logger.info('Intercepted randomuser.me request — fulfilling with mock data');
            await route.fulfill({
                body: JSON.stringify(mockedResponse)  // Local mock from src/mocks/
            })
        });

        await actions.goto('https://demo.automationtesting.in/DynamicData.html', 'Navigate to dynamic data page');
        await actions.click(page.locator('#save'), 'Click save button');
        logger.info('Verifying mocked data is displayed: "Playwright User"');
        await assert.toContainText(page.locator('#loading'), "First Name : PlaywrightLast Name : User", 'Verify mocked data');
        logger.info('Mocked response verification passed');
    });

    /**
     * Test 3: Response Modification — Fetch real data, modify it, then return the modified version.
     *
     * Flow:
     *   1. Intercept the randomuser.me API call
     *   2. Let the real request go through (route.fetch())
     *   3. Parse the real response and change the name to "Udemy Course"
     *   4. Return the modified response to the browser
     *   5. Verify the UI displays the modified name
     */
    test('Mocking2: mock api response - another way', async ({ page, testHelpers }) => {
        const { actions, assert } = testHelpers;

        // Intercept, fetch the real response, modify it, then return the modified version
        logger.info('Setting up route interception for response modification on randomuser.me');
        await page.route('https://api.randomuser.me/?nat=us', async route =>{
            logger.info('Intercepted request — fetching real response to modify');
            const response = await route.fetch();                     // Make the real API call
            const responseBody = await response.json();               // Parse the real response
            logger.debug(`Original response name: ${responseBody.results[0].name.first} ${responseBody.results[0].name.last}`);
            responseBody.results[0].name.first = "Udemy";             // Modify the first name
            responseBody.results[0].name.last = "Course";             // Modify the last name
            logger.info('Modified response name to "Udemy Course"');
            await route.fulfill({
                body: JSON.stringify(responseBody)                    // Return the modified data
            })
        });

        await actions.goto('https://demo.automationtesting.in/DynamicData.html', 'Navigate to dynamic data page');
        await actions.click(page.locator('#save'), 'Click save button');
        logger.info('Verifying modified data is displayed: "Udemy Course"');
        await assert.toContainText(page.locator('#loading'), "First Name : UdemyLast Name : Course", 'Verify modified mocked data');
        logger.info('Modified response verification passed');
    });

    /**
     * Test 4: Request Redirection — Intercept a request and redirect it to a different URL.
     *
     * Flow:
     *   1. Intercept all requests to Wikipedia's API
     *   2. Redirect them to always search for "Udemy" regardless of what the user types
     *   3. Type "Hello" in the Wikipedia search box on the test page
     *   4. Verify that "Udemy" results appear (because the request was redirected)
     */
    test('Mocking3 - intercept api request', async ({page, testHelpers}) => {
        const { actions, assert } = testHelpers;

        // Redirect all Wikipedia API calls to always search for "Udemy"
        logger.info('Setting up route redirection for Wikipedia API — redirecting all searches to "Udemy"');
        await page.route('https://en.wikipedia.org/w/api.php?*', async route =>{
            logger.info(`Intercepted Wikipedia API request — redirecting to Udemy search`);
            await route.continue({url: 'https://en.wikipedia.org/w/api.php?action=opensearch&search=Udemy&format=json&callback=%3F&callback=callback'})
        });

        await actions.goto('https://testautomationpractice.blogspot.com/', 'Navigate to test automation practice');
        await actions.fill(page.locator("//input[@id='Wikipedia1_wikipedia-search-input']"), 'Hello', 'Enter search term');
        await actions.click(page.locator("//input[@type='submit']"), 'Click search button');
        logger.info('Verifying redirected search result shows "Udemy"');
        await assert.toBeVisible(page.locator("//a[normalize-space()='Udemy']"), 'Verify intercepted result is visible');
        logger.info('Request redirection verification passed');
    });

    /**
     * Test 5: Request Abort — Block specific resource types from loading.
     *
     * Flow:
     *   1. Set up a route handler that aborts all PNG/JPG/JPEG image requests
     *   2. Navigate to a page — images will not load (blocked by the route)
     *   3. This technique is useful for testing page behavior without images
     *      or for speeding up tests by blocking unnecessary resources
     */
    test('Abort the request', async ({page, testHelpers}) => {
        const { actions } = testHelpers;

        // Block all image requests matching .png, .jpg, or .jpeg
        logger.info('Setting up route to abort all image requests (*.png, *.jpg, *.jpeg)');
        await page.route('**/*.{png,jpg,jpeg}', async route =>{
            logger.debug(`Aborting image request: ${route.request().url()}`);
            await route.abort();
        });
        await actions.goto('https://practice.automationtesting.in/', 'Navigate with aborted image requests');
        logger.info('Page loaded with images blocked successfully');
    });

});