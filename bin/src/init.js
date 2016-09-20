const fs = require('fs');
const inquirer = require('inquirer');
const ini = require('ini');

const {writeFile} = require('./file.js');
const {markdown, addInputDefault} = require('./util.js');
const {getAccountId} = require('./iam.js');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH, LAMBDASYNC_ROOT} = require('./constants.js');
const {
  settingsFields,
  updateSettings,
  getAwsSettings,
  filterSettings,
  getSettings
} = require('./settings.js');
const {
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION
} = require('./constants.js');

function init() {
  getSettings()
    .then(settings => {
      if (settings.profileName) {
        console.log(markdown({
          templatePath: 'markdown/init-twice.md'
        }));
        throw('Init already run');
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
                accessKey: credentials[profileName].aws_access_key_id,
                secretKey: credentials[profileName].aws_secret_access_key,
                region: config['profile ' + profileName].region
              });
            } else {
              resolve({});
            }
          })
          .catch(err => resolve({}));
      })
      .catch(err => reject(err));
  });
}

function getSettingsInput(defaults) {
  inquirer.prompt([
    PROMPT_INPUT_FUNCTION_NAME,
    addInputDefault(defaults, PROMPT_INPUT_ACCESS_KEY),
    addInputDefault(defaults, PROMPT_INPUT_SECRET_KEY),
    addInputDefault(defaults, PROMPT_CHOICE_REGION)
  ])
    .then(function (result) {
      result.profileName = defaults.profileName;
      return Promise.all([
        updateSettings(result),
        persistAwsConfig(result),
      ])
        .then(getSettings);
    })
    .then(getAccountId)
    .then(settings => {
      console.log(markdown({
        templatePath: 'markdown/init-success.md',
        data: settings
      }));
      // console.log('Init complete, creating settings file:\n', JSON.stringify(filterSettings(settings, settingsFields), null, '  '));
    });
}

function persistAwsConfig(conf) {
  getAwsSettings()
    .then(([credentials, config]) => {
      const persistCredentials = () => {
        const newCredentials = Object.assign({}, credentials);
        newCredentials[conf.profileName] = {
          aws_access_key_id: conf.accessKey,
          aws_secret_access_key: conf.secretKey
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

      if (credentials[conf.profileName]) {
        const rl = initRl();
        rl.question('Profile ' + conf.profileName + ' already exists, overwrite?: ', answer => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            persistCredentials();
            persistConfig();
          } else {
            persistCredentials();
            persistConfig();
          }
          rl.close();
        });
      } else {
        persistCredentials();
        persistConfig();
      }
    });
}

module.exports = init;
