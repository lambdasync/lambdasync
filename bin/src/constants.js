const path = require('path');
const userHome = require('user-home');

function exception(name, message) {
  return {name, message};
}
const EXCEPTIONS = {
  INIT_ALREADY_RUN: exception('INIT_ALREADY_RUN', 'Init already run')
};
const SETTINGS_FILE = 'lambdasync.json';
const AWS_USER_DIR = path.join(userHome, '.aws');
const AWS_CREDENTIALS_PATH = path.join(AWS_USER_DIR, 'credentials');
const AWS_CONFIG_PATH = path.join(AWS_USER_DIR, 'config');
const HTTP_ANY = 'ANY';
const HTTP_GET = 'GET';
const HTTP_POST = 'POST';
const HTTP_PUT = 'PUT';
const HTTP_DELETE = 'DELETE';
const HTTP_HEAD = 'HEAD';
const HTTP_PATCH = 'PATCH';
const HTTP_OPTIONS = 'OPTIONS';
const LAMBDASYNC_ROOT = path.join(__dirname, '..', '..');
const LAMBDASYNC_SRC = path.join(LAMBDASYNC_ROOT, 'bin', 'src');
const LAMBDASYNC_BIN = path.join(LAMBDASYNC_ROOT, 'node_modules', '.bin');
const LAMBDASYNC_EXEC_ROLE = 'LambdasyncExecRole';
const LAMBDASYNC_INVOKE_POLICY = 'LambdasyncInvokePolicy';
const API_STAGE_NAME = 'prod';
const TARGET_ROOT = process.cwd();
const TARGET_HIDDEN_DIR = path.join(TARGET_ROOT, '.lambdasync');
const TARGET_DEPLOY_DIR = path.join(TARGET_HIDDEN_DIR, 'deploy');
const PROMPT_CONFIRM_OVERWRITE_FUNCTION = {type: 'confirm', name: 'confirm', message: 'Function already exists, overwrite?'};
const PROMPT_INPUT_PROFILE_NAME = {type: 'input', name: 'profileName', message: 'Profile name', default: 'lambdasync'};
const PROMPT_INPUT_FUNCTION_NAME = {type: 'input', name: 'lambdaName', message: 'Function name'};
const PROMPT_INPUT_ACCESS_KEY = {type: 'password', name: 'accessKey', message: 'AWS Access Key'};
const PROMPT_INPUT_SECRET_KEY = {type: 'password', name: 'secretKey', message: 'AWS Secret Key'};
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
  EXCEPTIONS,
  SETTINGS_FILE,
  AWS_USER_DIR,
  AWS_CREDENTIALS_PATH,
  AWS_CONFIG_PATH,
  LAMBDASYNC_ROOT,
  LAMBDASYNC_SRC,
  LAMBDASYNC_BIN,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  API_STAGE_NAME,
  TARGET_ROOT,
  PROMPT_CONFIRM_OVERWRITE_FUNCTION,
  PROMPT_INPUT_PROFILE_NAME,
  PROMPT_INPUT_FUNCTION_NAME,
  PROMPT_INPUT_ACCESS_KEY,
  PROMPT_INPUT_SECRET_KEY,
  PROMPT_CHOICE_REGION,
  HTTP_ANY,
  HTTP_GET,
  HTTP_POST,
  HTTP_PUT,
  HTTP_DELETE,
  HTTP_HEAD,
  HTTP_PATCH,
  HTTP_OPTIONS
};
