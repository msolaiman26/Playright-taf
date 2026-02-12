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
 */
import { test, expect } from '@playwright/test';
import usersRequest from '../../../src/endpoints/users-endpoints';

// Shared variables for response and parsed JSON across tests
let response;
let jsonResponse;

test.describe('Users API test @api',() =>{

    /**
     * GET /posts — Verifies that fetching all posts returns:
     *   - HTTP 200 status
     *   - An array of exactly 100 posts
     */
    test('Check get users response success response', async ({request}) => {
        response = await usersRequest.getUsers(request);
        jsonResponse = await response.json();
        await expect(response.status()).toBe(200);       // Assert HTTP status
        await expect(jsonResponse.length).toBe(100);     // JSONPlaceholder has 100 posts
    });

    /**
     * GET /posts?id=2 — Verifies that filtering by query parameter returns
     * the correct post with the expected title.
     */
    test('Check get users response for a specific user', async ({request}) => {
        response = await usersRequest.getUser2(request);
        jsonResponse = await response.json();
        console.log(jsonResponse);
        await expect(jsonResponse[0].title).toEqual('qui est esse');
    });

    /**
     * GET /posts — Verifies response headers contain the expected
     * Connection: keep-alive header.
     */
    test('Check get users response header', async ({request}) => {
        response = await usersRequest.getUsers(request);
        const headers = await response.headers();
        console.log(headers);
        await expect(headers.connection).toEqual('keep-alive');
    });

    /**
     * POST /posts — Creates a new post and verifies the response body
     * contains id=101 (JSONPlaceholder always returns 101 for new posts).
     */
    test('Check post user response status code and body', async ({request}) => {
        response = await usersRequest.createUser(request);
        jsonResponse = await response.json();
        console.log(jsonResponse);
        await expect(jsonResponse.id).toEqual(101);      // JSONPlaceholder returns id: 101
    });
});