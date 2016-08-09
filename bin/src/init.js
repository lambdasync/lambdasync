const readline = require('readline');
const {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} = require('./constants.js');
const {
  settingsInput,
  settingsFields,
  putSettings,
  getAwsSettings,
  filterSettings
} = require('./settings.js');
const {readFile, writeFile} = require('./file.js');
const ini = require('ini');


const initRl = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rl = initRl();

function init() {
  prompt({}, settingsInput, 0, settings => {
    console.log('Init complete, creating setting file:\n', JSON.stringify(filterSettings(settings, settingsFields), null, '  '));
    putSettings(settings);
    persistAwsConfig(settings);
    rl.close();
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

function prompt(acc = {}, settings, index, cb) {
  if (settings[index]) {
    rl.question(settings[index] + ': ', answer => {
      acc[settings[index]] = answer;
      prompt(acc, settings, index + 1, cb);
    });
  } else {
    cb(acc);
  }
}

module.exports = init;
