import { test } from '../../../src/fixtures/pom-eager-fixture';
import jsonData from '../../../src/data/test-users.json'
import tsData from '../../../src/data/test-users';
import invalidData from '../../../src/data/invalid-test-users'
//json format -> string -> ts object
const parsedJsonData = JSON.parse(JSON.stringify(jsonData));
//===================Hooks======================
test.beforeAll('This actions run before all tests',async () =>{
    console.log("json username: ", parsedJsonData.username);
    console.log("ts password: ", tsData.password);
    console.log('This actions run before all tests');
})

test.beforeEach('This actions run before every test',async ({page}, testInfo) =>{
    console.log(`test starts for: ${testInfo.title}`);
})

test.afterEach('This actions run after every test',async ({page}, testInfo) =>{
    console.log(`test ends for: ${testInfo.title}`);
})

test.afterAll('This actions run after all tests',async () =>{
    console.log('This actions run after all tests');
})
//====================Tests======================
test.describe('Login test', ()=> {
    test('valid login', async ({ pomEagerHelpers }) => {
        const { pomEager } = pomEagerHelpers;
        await pomEager.getLoginPage().navigateToLogin();
        await pomEager.getLoginPage().login(tsData.username, tsData.password);
        await pomEager.getHomePage().assertProfileIcon();
    });

invalidData.forEach(({username, password, testType}) => {
    test(`invalid login for ${testType}`, async ({ pomEagerHelpers }) => {
        const { pomEager } = pomEagerHelpers;
        await pomEager.getLoginPage().navigateToLogin();
        await pomEager.getLoginPage().login(username, password);
        await pomEager.getLoginPage().assertInvalidLoginMessage();
    });
});
});