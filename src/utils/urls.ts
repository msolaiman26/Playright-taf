/**
 * Centralized URL configuration for all environments.
 *
 * Maps each environment (test, staging) to its UI and API base URLs.
 * Referenced by playwright.config.ts to set `baseURL` based on the ENV variable,
 * and by other modules that need environment-specific endpoints.
 */
export default {
    /** URLs for the default "test" environment */
    test : {
        ui: 'https://opensource-demo.orangehrmlive.com',       // OrangeHRM demo portal (test)
        api: 'https://jsonplaceholder.typicode.com',           // Public REST API for API tests
    },
    /** URLs for the "staging" environment */
    staging : {
        ui: 'https://opensource-demo.orangehrmlive.com/staging', // OrangeHRM demo portal (staging)
        api: 'https://jsonplaceholder.typicode.com/staging',     // Staging REST API
    }
}