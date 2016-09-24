const inquirer = require('inquirer');
const ini = require('ini');

const {writeFile} = require('./file.js');
const {markdown, addInputDefault} = require('./util.js');
const {getAccountId} = require('./iam.js');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants.js');
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
      if (settings.profileName) {
        console.log(markdown({
          templatePath: 'markdown/init-twice.md'
        }));
        throw EXCEPTIONS.INIT_ALREADY_RUN;
      } else {
        return;
      }
    })
    .then(getProfile)
    .then(getSettingsInput);
}

function getProfile() {
  return new Promise((resolve, reject) => {
    console.log(markdown({
      templatePath: 'markdown/init.md'
    }));
    inquirer.prompt([PROMPT_INPUT_PROFILE_NAME])
      .then(({profileName}) => {
        getAwsSettings()
          .then(([credentials, config]) => {
            if (credentials[profileName] && config['profile ' + profileName]) {
              resolve({
                profileName: profileName,
                accessKey: credentials[profileName].aws_access_key_id, // eslint-disable-line camelcase
                secretKey: credentials[profileName].aws_secret_access_key, // eslint-disable-line camelcase
                region: config['profile ' + profileName].region
              });
            } else {
              resolve({});
            }
          })
          .catch(() => resolve({})); // eslint-disable-line handle-callback-err
      })
      .catch(err => reject(err));
  });
}

function getSettingsInput(defaults) {
  return inquirer.prompt([
    PROMPT_INPUT_FUNCTION_NAME,
    addInputDefault(defaults, PROMPT_INPUT_ACCESS_KEY),
    addInputDefault(defaults, PROMPT_INPUT_SECRET_KEY),
    addInputDefault(defaults, PROMPT_CHOICE_REGION)
  ])
    .then(function (result) {
      result.profileName = defaults.profileName;
      return Promise.all([
        updateSettings(result),
        persistAwsConfig(result)
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
  getAwsSettings()
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
