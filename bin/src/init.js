import readline from 'readline';
import {AWS_CREDENTIALS_PATH, AWS_CONFIG_PATH} from './constants.js';
import {settingsFields, putSettings} from './settings.js';
import {readFile, writeFile} from './file.js';
import ini from 'ini';


const initRl = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rl = initRl();

export function init() {
  prompt({}, settingsFields, 0, settings => {
    console.log('Init complete, creating setting file:\n', JSON.stringify(settings, null, '  '));
    putSettings(settings);
    persistAwsConfig(settings);
    rl.close();
  });
}

function persistAwsConfig(conf) {
  Promise.all([
    readFile(AWS_CREDENTIALS_PATH, ini.parse),
    readFile(AWS_CONFIG_PATH, ini.parse)
  ])
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
