const inquirer = require('inquirer');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants.js');
const {
  settingsFields,
  putSettings,
  getAwsSettings,
  filterSettings
} = require('./settings.js');
const {readFile, writeFile} = require('./file.js');
const ini = require('ini');
const {
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION
} = require('./constants.js');

function init() {
  inquirer.prompt([
    PROMPT_INPUT_PROFILE_NAME,
    PROMPT_INPUT_FUNCTION_NAME,
    PROMPT_INPUT_ACCESS_KEY,
    PROMPT_INPUT_SECRET_KEY,
    PROMPT_CHOICE_REGION
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
