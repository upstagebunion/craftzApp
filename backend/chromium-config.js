const chromium = require('@sparticuz/chromium');
require('dotenv').config();

async function getLaunchOptions() {
  return {
    /*args: chromium.args,
    executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(),
    headless: chromium.headless,*/
    headless: 'new',
    ignoreHTTPSErrors: true
  };
}

module.exports = {
  getLaunchOptions: getLaunchOptions
};