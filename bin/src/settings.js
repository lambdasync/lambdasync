const path = require('path');
const ini = require('ini');
const {SETTINGS_FILE, AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants.js');
const {readFile, writeFile} = require('./file.js');
const {jsonStringify} = require('./transform.js');


const settingsInput = [
  'profileName', // Name of local aws-cli profile, default lambdasync
  'lambdaName', // Name of lambda function on AWS
  'accessKey', // AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
  'secretKey', // AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  'region' // us-east-1
];

const settingsFields = [
  'profileName',
  'lambdaName',
  'lambdaArn',
  'lambdaRole',
  'region'
];

const settingsPath = path.join(process.cwd(), SETTINGS_FILE);

function getSettings() {
  return readFile(settingsPath, JSON.parse);
}

function putSettings(settings) {
  return writeFile(
    settingsPath,
    filterSettings(settings, settingsFields),
    jsonStringify);
}

function updateSettings(newFields) {
  console.log('\n\n\n');
  console.log('updateSettings', newFields);
  console.log('\n\n\n');
  return getSettings()
    .then(settings => {
      console.log('\n\n\n');
      console.log('updateSettings settings', settings);
      console.log('\n\n\n');
      console.log('updateSettings merged settings', Object.assign({}, settings, newFields));
      console.log('\n\n\n');
      return putSettings(Object.assign({}, settings, newFields));
    });
}

function getAwsSettings() {
  return Promise.all([
    readFile(AWS_CREDENTIALS_PATH, ini.parse),
    readFile(AWS_CONFIG_PATH, ini.parse)
  ]);
}


function filterSettings(obj, fields) {
  return Object.keys(obj)
    .filter(key => fields.indexOf(key) !== -1)
    .reduce((res, key) => (res[key] = obj[key], res), {});
}

module.exports = {
  settingsInput,
  settingsFields,
  getSettings,
  putSettings,
  updateSettings,
  getAwsSettings,
  filterSettings
};
