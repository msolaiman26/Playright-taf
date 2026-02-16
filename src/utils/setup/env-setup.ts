/**
 * Environment Setup Utility.
 *
 * Provides helper functions to determine the active environment and return
 * the corresponding test data. The environment is controlled by the ENV
 * variable (set via .env file or cross-env in npm scripts).
 *
 * Usage:
 *   import envSetup from './env-setup';
 *   envSetup.getEnv();                   // Logs which environment is active
 *   const credentials = envSetup.getData(); // Returns the correct credentials object
 */
import testData from '../../data/test-users';
import stagingData from '../../data/staging-users';
import winston from "winston";
import { Logger } from "../../utils/Logger";

const logger = Logger.getLogger('env-setup');

/** Logs the currently active environment */
function getEnv(){
    const env = process.env.ENV!;
    if ( env === 'staging'){
        logger.info('Running tests on staging environment');
    }
    else if ( env === 'test'){
        logger.info('Running tests on test environment');
    }
}

/**
 * Returns the credentials dataset matching the current environment.
 * - staging: returns staging-users credentials (different admin username)
 * - test:    returns test-users credentials (default admin)
 */
function getData(){
    const env = process.env.ENV!;
    if ( env === 'staging'){
        return stagingData;
    }
    else if ( env === 'test'){
        return testData;
    }
}

export default {getEnv, getData};