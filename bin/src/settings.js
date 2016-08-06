import path from 'path';
import readline from 'readline';
import jsonfile from 'jsonfile';
import {SETTINGS_FILE} from './constants.js';

export const settingsFields = [
  'profileName', // Name of local aws-cli profile, default lambdasync
  'lambdaName', // Name of lambda function on AWS
  'accessKey', // AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
  'secretKey', // AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  'region', // us-east-1
];

const settingsPath = path.join(process.cwd(), SETTINGS_FILE);

export function getSettings() {
  return new Promise((resolve, reject) => {
    jsonfile.readFile(settingsPath, (err, json) => {
      if (err) {
        return reject(err);
      }
      return resolve(json);
    });
  });
}

export function putSettings(settings) {
  jsonfile.writeFile(settingsPath, settings, {spaces: 2}, function (err) {
    console.error(err)
  });
}
