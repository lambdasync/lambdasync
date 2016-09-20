const path = require('path');
const userHome = require('user-home');

const SETTINGS_FILE = 'lambdasync.json';
const AWS_USER_DIR = path.join(userHome, '.aws');
const AWS_CREDENTIALS_PATH = path.join(AWS_USER_DIR, 'credentials');
const AWS_CONFIG_PATH = path.join(AWS_USER_DIR, 'config');
const LAMBDASYNC_ROOT = path.join(__dirname, '..', '..');
const LAMBDASYNC_SRC = path.join(LAMBDASYNC_ROOT, 'bin', 'src');
const LAMBDASYNC_BIN = path.join(LAMBDASYNC_ROOT, 'node_modules', '.bin');
const LAMBDASYNC_EXEC_ROLE = 'LambdasyncExecRole';
const LAMBDASYNC_INVOKE_POLICY = 'LambdasyncInvokePolicy';
const TARGET_ROOT = process.cwd();
const PROMPT_CONFIRM_OVERWRITE_FUNCTION = {type: 'confirm', name: 'confirm', message: 'Function already exists, overwrite?'};
const PROMPT_INPUT_PROFILE_NAME = {type: 'input', name: 'profileName', message: 'Profile name', default: 'lambdasync'};
const PROMPT_INPUT_FUNCTION_NAME = {type: 'input', name: 'lambdaName', message: 'Function name'};
const PROMPT_INPUT_ACCESS_KEY = {type: 'input', name: 'accessKey', message: 'AWS Access Key'};
const PROMPT_INPUT_SECRET_KEY = {type: 'input', name: 'secretKey', message: 'AWS Secret Key'};
const PROMPT_CHOICE_REGION = {type: 'list', name: 'region', message: 'Region', choices: [
  {name: 'US East (N. Virginia)', value: 'us-east-1'},
  {name: 'US West (Oregon)', value: 'us-west-2'},
  {name: 'Asia Pacific (Singapore)', value: 'ap-southeast-1'},
  {name: 'Asia Pacific (Sydney)', value: 'ap-southeast-2'},
  {name: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1'},
  {name: 'EU (Frankfurt)', value: 'eu-central-1'},
  {name: 'EU (Ireland)', value: 'eu-west-1'}
]};

module.exports = {
  SETTINGS_FILE,
  AWS_USER_DIR,
  AWS_CREDENTIALS_PATH,
  AWS_CONFIG_PATH,
  LAMBDASYNC_ROOT,
  LAMBDASYNC_SRC,
  LAMBDASYNC_BIN,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  TARGET_ROOT,
  PROMPT_CONFIRM_OVERWRITE_FUNCTION,
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION
};
