import path from 'path';
import {promisedExec} from './util.js';
import {getSettings} from './settings.js';
import {LAMBDASYNC_BIN, TARGET_ROOT} from './constants.js';

const targetOptions = {cwd: TARGET_ROOT};

export default function deploy(settings) {
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
