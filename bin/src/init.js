const path = require('path');
const inquirer = require('inquirer');
const ini = require('ini');

const {readFile, writeFile} = require('./file');
const {markdown, addInputDefault, handleGenericFailure} = require('./util');
const {getAccountId} = require('./iam');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants');
const {
  updateSettings,
  getAwsSettings,
  getSettings
} = require('./settings.js');
const {
  EXCEPTIONS,
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION
} = require('./constants.js');

function init() {
  return getSettings()
    .then(settings => {
      if (settings.lambdaName && settings.profileName && settings.accountId) {
        console.log(markdown({
          templatePath: 'markdown/init-twice.md'
        }));
        throw EXCEPTIONS.INIT_ALREADY_RUN;
      } else {
        return;
      }
    })
    .then(getDefaults)
    .then(getSettingsInput)
    .catch(handleGenericFailure);
}

function getDefaults() {
  return new Promise((resolve, reject) => {
    console.log(markdown({
      templatePath: 'markdown/init.md'
    }));
    inquirer.prompt([PROMPT_INPUT_PROFILE_NAME])
      .then(({profileName}) => {
        return getAwsSettings()
          .then(([credentials, config]) => ({
            credentials,
            config,
            profileName
          }))
          .catch(() => ({profileName})); // eslint-disable-line handle-callback-err no-unused-expressions
      })
      .then(settings => {
        return readFile(path.join(process.cwd(), 'package.json'), JSON.parse)
          .then(packageJson => ({settings, packageJson}))
          .catch(() => ({settings}));
      })
      .then(({settings = {}, packageJson = {}}) => {
        const {credentials, config, profileName} = settings;
        const {name} = packageJson;
        if (credentials && credentials[profileName] && config && config['profile ' + profileName]) {
          resolve({
            profileName,
            lambdaName: name || '',
            accessKey: credentials[profileName].aws_access_key_id, // eslint-disable-line camelcase
            secretKey: credentials[profileName].aws_secret_access_key, // eslint-disable-line camelcase
            region: config['profile ' + profileName].region
          });
        } else {
          resolve({
            profileName,
            lambdaName: name || ''
          });
        }
      })
      .catch(err => reject(err));
  });
}

function getSettingsInput(defaults) {
  const prompts = [];
  prompts.push(addInputDefault(defaults, PROMPT_INPUT_FUNCTION_NAME));
  if (!defaults.accessKey) {
    prompts.push(addInputDefault(defaults, PROMPT_INPUT_ACCESS_KEY));
  }
  if (!defaults.secretKey) {
    prompts.push(addInputDefault(defaults, PROMPT_INPUT_SECRET_KEY));
  }
  prompts.push(addInputDefault(defaults, PROMPT_CHOICE_REGION));

  return inquirer.prompt(prompts)
    .then(result => {
      const settings = Object.assign(defaults, result);
      return Promise.all([
        updateSettings(settings),
        persistAwsConfig(settings)
      ])
        .then(getSettings);
    })
    .then(getAccountId)
    .then(settings => {
      console.log(markdown({
        templatePath: 'markdown/init-success.md',
        data: settings
      }));
      return settings;
    });
}

function persistAwsConfig(conf) {
  return getAwsSettings()
    .then(([credentials, config]) => {
      const persistCredentials = () => {
        const newCredentials = Object.assign({}, credentials);
        newCredentials[conf.profileName] = {
          aws_access_key_id: conf.accessKey, // eslint-disable-line camelcase
          aws_secret_access_key: conf.secretKey // eslint-disable-line camelcase
        };
        writeFile(AWS_CREDENTIALS_PATH, newCredentials, ini.stringify);
      };
      const persistConfig = () => {
        const newConfig = Object.assign({}, config);
        newConfig['profile ' + conf.profileName] = {
          output: newConfig.output || 'json',
          region: conf.region
        };
        writeFile(AWS_CONFIG_PATH, newConfig, ini.stringify)
          .catch(err => {
            console.error(err);
          });
      };

      persistCredentials();
      persistConfig();
    });
}

function maybeInit(settings) {
  if (settings.lambdaName && settings.profileName && settings.accountId) {
    return settings;
  }

  return init();
}

module.exports = maybeInit;
