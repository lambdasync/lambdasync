const path = require('path');
const userHome = require('user-home');

const SETTINGS_FILE = '.lambdasyncrc';
const AWS_USER_DIR = path.join(userHome, '.aws');
const AWS_CREDENTIALS_PATH = path.join(AWS_USER_DIR, 'credentials');
const AWS_CONFIG_PATH = path.join(AWS_USER_DIR, 'config');
const LAMBDASYNC_ROOT = path.join(__dirname);
const LAMBDASYNC_BIN = path.join(LAMBDASYNC_ROOT, '..', '..', 'node_modules', '.bin');
const TARGET_ROOT = process.cwd();

module.exports = {
  SETTINGS_FILE,
  AWS_USER_DIR,
  AWS_CREDENTIALS_PATH,
  AWS_CONFIG_PATH,
  LAMBDASYNC_ROOT,
  LAMBDASYNC_BIN,
  TARGET_ROOT
};
