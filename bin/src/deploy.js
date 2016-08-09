const path = require('path');
const inquirer = require('inquirer');
const {promisedExec} = require('./util.js');
const {getSettings} = require('./settings.js');
const {LAMBDASYNC_BIN, TARGET_ROOT} = require('./constants.js');
const aws = require('./aws.js');

const targetOptions = {cwd: TARGET_ROOT};

function deploy(settings) {
  const AWS = aws(settings);
  const lambda = new AWS.Lambda();
  const doDeploy = deployFunction.bind(null, settings);

  functionExists(lambda, settings.lambdaName)
    .then(functionExists => {
      // If function doesn't already exist just deploy it
      if (!functionExists) {
        return doDeploy();
      }
      // Otherwise let's ask to make sure
      inquirer.prompt([{ type: 'confirm', name: 'confirm', message: 'Function already exists, overwrite?'}])
        .then(function (result) {
          if (result.confirm) {
            doDeploy()
          } else {
            console.log('You answered no, aborting deploy');
          }
        });
    });
}

function deployFunction(settings) {
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
    });
}

function handleSuccess(stdout) {
  console.log('Successfully synced function', stdout);
  promisedExec(LAMBDASYNC_BIN + '/rimraf deploy.zip', targetOptions);
}

function functionExists(lambda, functionName) {
  return new Promise((resolve, reject) => {
    const params = {
      FunctionName: functionName
    };
    lambda.getFunction(params, function(err, data) {
      if (err) {
        if (err.toString().includes('ResourceNotFoundException')) {
          return resolve(false);
        }
        return reject(err);
      }
      return resolve(true);
    });
  });
}

module.exports = deploy;
