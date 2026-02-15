import { test } from '../../../src/fixtures/pom-lazy-fixture';
import jsonData from '../../../src/data/test-users.json'
import tsData from '../../../src/data/test-users';
import invalidData from '../../../src/data/invalid-test-users'
import { Logger } from '../../../src/utils/Logger';

const logger = Logger.getLogger('login-with-DD');

//json format -> string -> ts object
const parsedJsonData = JSON.parse(JSON.stringify(jsonData));
//===================Hooks======================
test.beforeAll('This actions run before all tests',async () =>{
    logger.info(`json username: ${parsedJsonData.username}`);
    logger.info(`ts password: ${tsData.password}`);
    logger.info('This actions run before all tests');
})

test.beforeEach('This actions run before every test',async ({page}, testInfo) =>{
    logger.info(`test starts for: ${testInfo.title}`);
})

test.afterEach('This actions run after every test',async ({page}, testInfo) =>{
    logger.info(`test ends for: ${testInfo.title}`);
})

test.afterAll('This actions run after all tests',async () =>{
    logger.info('This actions run after all tests');
})
//====================Tests======================
test.describe('Login test', ()=> {
    test('valid login', async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login(tsData.username, tsData.password);
        await pomLazy.homePage.assertProfileIcon();
    });

invalidData.forEach(({username, password, testType}) => {
    test(`invalid login for ${testType}`, async ({ pomLazyHelpers }) => {
        const { pomLazy } = pomLazyHelpers;
        await pomLazy.loginPage.navigateToLogin();
        await pomLazy.loginPage.login(username, password);
        await pomLazy.loginPage.assertInvalidLoginMessage();
    });
});
});