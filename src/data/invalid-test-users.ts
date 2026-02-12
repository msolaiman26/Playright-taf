/**
 * Invalid credentials dataset for negative login testing.
 * Each entry represents a different failure scenario with a descriptive testType label.
 * Can be iterated over in data-driven tests to verify proper error handling for each case.
 */
export default [
    { username: "Admin", password: "admin12", testType: "invalid password"},   // Correct username, wrong password
    { username: "dmin", password: "admin123", testType: "invalid username"},   // Wrong username, correct password
]