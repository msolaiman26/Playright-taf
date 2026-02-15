/**
 * API Tests — CRUD operations against JSONPlaceholder REST API.
 *
 * These tests demonstrate Playwright's built-in API testing capabilities using the
 * `request` fixture (no browser needed). Each test calls an endpoint function from
 * users-endpoints.ts and asserts on the response status, body, or headers.
 *
 * Tagged with @api so they can be run separately via: `npm run api`
 *
 * Target API: https://jsonplaceholder.typicode.com (configured as baseURL)
 *
 * Uses test-helpers-fixture for automatic test lifecycle logging.
 */
import { test, expect } from '../../../src/fixtures/test-helpers-fixture';
import usersRequest from '../../../src/endpoints/users-endpoints';
import { Logger } from '../../../src/utils/Logger';

const logger = Logger.getLogger('users-api-test');

// Shared variables for response and parsed JSON across tests
let response;
let jsonResponse;

test.describe('Users API test @api',() =>{
    // Test lifecycle logging is now handled automatically by test-helpers-fixture

    /**
     * GET /posts — Verifies that fetching all posts returns:
     *   - HTTP 200 status
     *   - An array of exactly 100 posts
     */
    test('Check get users response success response', async ({request}) => {
        logger.info('Sending GET /posts to fetch all posts');
        response = await usersRequest.getUsers(request);
        jsonResponse = await response.json();
        logger.info(`Response status: ${response.status()}, Total posts: ${jsonResponse.length}`);
        logger.debug(`Response body (first item): ${JSON.stringify(jsonResponse[0])}`);
        await expect(response.status()).toBe(200);       // Assert HTTP status
        await expect(jsonResponse.length).toBe(100);     // JSONPlaceholder has 100 posts
        logger.info('Verified status=200 and posts count=100');
    });

    /**
     * GET /posts?id=2 — Verifies that filtering by query parameter returns
     * the correct post with the expected title.
     */
    test('Check get users response for a specific user', async ({request}) => {
        logger.info('Sending GET /posts?id=2 to fetch specific post');
        response = await usersRequest.getUser2(request);
        jsonResponse = await response.json();
        logger.info(`Response status: ${response.status()}, Results count: ${jsonResponse.length}`);
        logger.debug(`Response body: ${JSON.stringify(jsonResponse)}`);
        await expect(jsonResponse[0].title).toEqual('qui est esse');
        logger.info(`Verified post title matches expected value: "${jsonResponse[0].title}"`);
    });

    /**
     * GET /posts — Verifies response headers contain the expected
     * Connection: keep-alive header.
     */
    test('Check get users response header', async ({request}) => {
        logger.info('Sending GET /posts to verify response headers');
        response = await usersRequest.getUsers(request);
        const headers = await response.headers();
        logger.info(`Response status: ${response.status()}, Connection header: ${headers.connection}`);
        logger.debug(`All response headers: ${JSON.stringify(headers)}`);
        await expect(headers.connection).toEqual('keep-alive');
        logger.info('Verified Connection header is "keep-alive"');
    });

    /**
     * POST /posts — Creates a new post and verifies the response body
     * contains id=101 (JSONPlaceholder always returns 101 for new posts).
     */
    test('Check post user response status code and body', async ({request}) => {
        logger.info('Sending POST /posts to create a new post');
        response = await usersRequest.createUser(request);
        jsonResponse = await response.json();
        logger.info(`Response status: ${response.status()}, Created post id: ${jsonResponse.id}`);
        logger.debug(`Response body: ${JSON.stringify(jsonResponse)}`);
        await expect(jsonResponse.id).toEqual(101);      // JSONPlaceholder returns id: 101
        logger.info('Verified created post id=101');
    });
});