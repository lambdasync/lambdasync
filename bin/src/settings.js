import path from 'path';
import readline from 'readline';
import {SETTINGS_FILE} from './constants.js';
import {readFile, writeFile} from './file.js';
import {jsonStringify} from './transform.js';

export const settingsFields = [
  'profileName', // Name of local aws-cli profile, default lambdasync
  'lambdaName', // Name of lambda function on AWS
  'accessKey', // AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
  'secretKey', // AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  'region', // us-east-1
];

const settingsPath = path.join(process.cwd(), SETTINGS_FILE);

export function getSettings() {
  return readFile(settingsPath, JSON.parse);
}

export function putSettings(settings) {
  return writeFile(settingsPath, settings, jsonStringify);
}
