const fs = require('fs');
const inquirer = require('inquirer');
const ini = require('ini');

const {writeFile} = require('./file.js');
const {markdown, addInputDefault} = require('./util.js');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH, LAMBDASYNC_ROOT} = require('./constants.js');
const {
  settingsFields,
  putSettings,
  getAwsSettings,
  filterSettings
} = require('./settings.js');
const {
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION
} = require('./constants.js');

function init() {
  getProfile()
    .then(getSettingsInput);
}

function getProfile() {
  return new Promise((resolve, reject) => {
    console.log(markdown('init.md'));
    inquirer.prompt([PROMPT_INPUT_PROFILE_NAME])
      .then(({profileName}) => {
        getAwsSettings()
          .then(([credentials, config]) => {
            if (credentials[profileName] && config['profile ' + profileName]) {
              resolve({
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
      console.log('Init complete, creating setting file:\n', JSON.stringify(filterSettings(result, settingsFields), null, '  '));
      putSettings(result);
      persistAwsConfig(result);
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
