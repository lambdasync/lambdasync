const path = require('path');
const ini = require('ini');

const {SETTINGS_FILE, AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants');
const {readFile, writeFile} = require('./file');
const {jsonStringify} = require('./transform');
const {makeAbsolutePath} = require('./util');

const settingsInput = [
  'profileName', // Name of local aws-cli profile, default lambdasync
  'lambdaName', // Name of lambda function on AWS
  'accessKey', // AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
  'secretKey', // AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  'region' // us-east-1
];

const settingsFields = [
  'accountId',
  'profileName',
  'lambdaName',
  'lambdaArn',
  'lambdaRole',
  'lambdaPolicy',
  'region',
  'apiGatewayId',
  'apiGatewayName',
  'apiGatewayUrl',
  'apiGatewayRestApiId',
  'apiGatewayResourceId',
  'apiGatewayDeploymentId'
];

let settingsFile = path.join(process.cwd(), SETTINGS_FILE);

function getSettings() {
  return readFile(settingsFile, JSON.parse)
    .catch(() => ({}));
}

function putSettings(settings) {
  return writeFile(
    settingsFile,
    filterSettings(settings, settingsFields),
    jsonStringify);
}

function updateSettings(newFields) {
  return getSettings()
    .then(settings => {
      const newSettings = Object.assign({}, settings, newFields);
      return putSettings(newSettings)
        .then(getSettings);
    });
}

function getAwsSettings() {
  return Promise.all([
    readFile(AWS_CREDENTIALS_PATH, ini.parse),
    readFile(AWS_CONFIG_PATH, ini.parse)
  ])
    .catch(() => [{}, {}]);
}

function filterSettings(obj, fields) {
  return Object.keys(obj)
    .filter(key => fields.indexOf(key) !== -1)
    .reduce((res, key) => {
      res[key] = obj[key];
      return res;
    }, {});
}

function setSettingsFile(settingsPath) {
  settingsFile = makeAbsolutePath(settingsPath);
}

module.exports = {
  settingsInput,
  settingsFields,
  getSettings,
  putSettings,
  updateSettings,
  getAwsSettings,
  filterSettings,
  setSettingsFile,
};
