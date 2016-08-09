const path = require('path');
const {promisedExec} = require('./util.js');
const {getSettings} = require('./settings.js');
const {LAMBDASYNC_BIN, TARGET_ROOT} = require('./constants.js');

const targetOptions = {cwd: TARGET_ROOT};

function deploy(settings) {
  promisedExec(LAMBDASYNC_BIN + '/bestzip ./deploy.zip ./*', targetOptions)
    .then(stdout => promisedExec(
      'aws lambda update-function-code ' +
        '--function-name '+ settings.lambdaName + ' ' +
        '--zip-file fileb://deploy.zip ' +
        '--publish ' +
        '--profile ' + settings.profileName,
      targetOptions))
    .then(handleSuccess)
    .catch(err => {
      console.log('No config found, first run: lambdasync init');
      console.error(err);
    })
}

function handleSuccess(stdout) {
  console.log('Successfully synced function', stdout);
  promisedExec(LAMBDASYNC_BIN + '/rimraf deploy.zip', targetOptions);
}

module.exports = deploy;
