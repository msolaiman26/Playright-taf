/**
 * API Endpoint Definitions for JSONPlaceholder REST API.
 *
 * This module centralizes all API request functions used across API tests.
 * Each function accepts a Playwright `request` context (from the test fixture)
 * and returns the raw response for assertion in the test layer.
 *
 * Note: The endpoint paths are relative — Playwright resolves them against
 * the `baseURL` set in playwright.config.ts (defaults to jsonplaceholder.typicode.com).
 */

//==========================Request Configuration===================

const baseUrl = 'https://jsonplaceholder.typicode.com'; // Base URL (kept for reference; Playwright uses baseURL from config)
const usersEndpoint = '/posts'                          // Endpoint path for posts (used as the "users" resource)

/** Query parameters used to filter a specific post by ID */
const userParam = {
    "id": 2
}

/** Default request body used when creating (POST) a new post */
const requestBody = {
    "title": "foo",
    "body": "bar",
    "userId": 102
};

/** Default headers — Playwright sets Content-Type automatically for JSON, so this is for reference */
const requestHeaders = {
    "Content-Type": "application/json"
};

//==========================Request Functions===========================

/**
 * GET /posts — Fetches all posts.
 * Expected response: 200 OK with an array of 100 posts.
 * @param request - Playwright APIRequestContext from the test fixture
 * @returns The full HTTP response object
 */
async function getUsers(request: any) {
    const response = request.get(usersEndpoint);
    return response;
}

/**
 * GET /posts?id=2 — Fetches posts filtered by query parameter.
 * Expected response: 200 OK with an array containing the matching post.
 * @param request - Playwright APIRequestContext from the test fixture
 * @returns The full HTTP response object
 */
async function getUser2(request: any) {
    const response = await request.get(usersEndpoint,{
        params: userParam   // Appends ?id=2 to the URL
    });
    return response;
}

/**
 * POST /posts — Creates a new post resource.
 * Expected response: 201 Created with the new post data (id = 101).
 * @param request - Playwright APIRequestContext from the test fixture
 * @returns The full HTTP response object
 */
async function createUser(request: any) {
    const response = await request.post(usersEndpoint,{
        data: requestBody   // Sends the JSON body defined above
    });
    return response;
}

export default { getUsers, getUser2, createUser };
