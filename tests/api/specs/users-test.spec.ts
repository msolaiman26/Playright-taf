/**
 * API Tests — CRUD operations against JSONPlaceholder REST API.
 *
 * These tests demonstrate Playwright's built-in API testing capabilities using the
 * apiTestHelpers fixture (no browser needed). The apiActions helper provides automatic
 * logging of all HTTP requests/responses, while the assert helper logs all assertions.
 *
 * Tagged with @api so they can be run separately via: `npm run api`
 *
 * Target API: https://jsonplaceholder.typicode.com
 *
 * Features:
 * - Automatic request/response logging via AdvancedAPIHelper
 * - Automatic assertion logging via AdvancedAssertionsHelper
 * - Test lifecycle logging (start/end/duration/summary)
 * - Structured log4js output to console and files
 */
import { test } from '../../fixtures/api-test-fixture';

// Shared variables for response and parsed JSON across tests
let response;
let jsonResponse;

test.describe('Users API test',() =>{

    /**
     * GET /posts — Verifies that fetching all posts returns:
     *   - HTTP 200 status
     *   - An array of exactly 100 posts
     *
     * EXAMPLE: Using apiTestHelpers for automatic logging
     */
    test('Check get users response success response', async ({apiTestHelpers}) => {
        const { apiActions, assert } = apiTestHelpers;

        // Automatic logging of request/response with apiActions
        response = await apiActions.get('https://jsonplaceholder.typicode.com/posts', 'Fetch all posts');
        jsonResponse = await response.json();

        // Automatic assertion logging with assert helper
        await assert.toEqual(response.status(), 200, 'Verify status is 200');
        await assert.toEqual(jsonResponse.length, 100, 'Verify 100 posts returned');
    });

    /**
     * GET /posts?id=2 — Verifies that filtering by query parameter returns
     * the correct post with the expected title.
     *
     * EXAMPLE: Using apiTestHelpers with query parameters
     */
    test('Check get users response for a specific user', async ({apiTestHelpers}) => {
        const { apiActions, assert } = apiTestHelpers;

        // Automatic logging of request/response with query parameter
        response = await apiActions.get('https://jsonplaceholder.typicode.com/posts?id=2', 'Fetch specific post by id=2');
        jsonResponse = await response.json();

        // Automatic assertion logging with assert helper
        await assert.toEqual(jsonResponse[0].title, 'qui est esse', 'Verify post title matches expected');
    });

    /**
     * GET /posts — Verifies response headers contain the expected
     * Connection: keep-alive header.
     *
     * EXAMPLE: Using apiTestHelpers to verify response headers
     */
    test('Check get users response header', async ({apiTestHelpers}) => {
        const { apiActions, assert } = apiTestHelpers;

        // Automatic logging of request/response
        response = await apiActions.get('https://jsonplaceholder.typicode.com/posts', 'Fetch all posts to verify headers');
        const headers = await response.headers();

        // Automatic assertion logging with assert helper
        await assert.toEqual(headers.connection, 'keep-alive', 'Verify Connection header is keep-alive');
    });

    /**
     * POST /posts — Creates a new post and verifies the response body
     * contains id=101 (JSONPlaceholder always returns 101 for new posts).
     *
     * EXAMPLE: Using apiTestHelpers with POST request
     */
    test('Check post user response status code and body', async ({apiTestHelpers}) => {
        const { apiActions, assert } = apiTestHelpers;

        // Automatic logging of POST request/response with payload
        const postData = {
            title: 'foo',
            body: 'bar',
            userId: 1
        };
        response = await apiActions.post('https://jsonplaceholder.typicode.com/posts', postData, 'Create a new post');
        jsonResponse = await response.json();

        // Automatic assertion logging with assert helper
        await assert.toEqual(jsonResponse.id, 101, 'Verify created post id=101');
    });
});