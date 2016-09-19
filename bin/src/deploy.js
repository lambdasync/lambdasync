const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const {promisedExec, stripLambdaVersion} = require('./util.js');
const {getSettings, updateSettings} = require('./settings.js');
const {
  LAMBDASYNC_BIN,
  TARGET_ROOT,
  PROMPT_CONFIRM_OVERWRITE_FUNCTION
} = require('./constants.js');
const aws = require('./aws.js');
const {description} = require('../../package.json');

const targetOptions = {cwd: TARGET_ROOT};
let lambda;
let settings;

function deploy(deploySettings) {
  settings = deploySettings;
  const AWS = aws(settings);
  lambda = new AWS.Lambda();

  return functionExists(settings.lambdaName)
    .then(functionExists => {
      // If function doesn't already exist, or if it was already deployed
      // by lambdasync lets just deploy it
      if (!functionExists) {
        return doDeploy('new');
      }
      if (settings.lambdaArn) {
        return doDeploy('update');
      }
      // Otherwise if first deploy of existing function let's ask to make sure
      return inquirer.prompt([PROMPT_CONFIRM_OVERWRITE_FUNCTION])
        .then(function (result) {
          if (result.confirm) {
            return doDeploy('update');
          } else {
            console.log('You answered no, aborting deploy');
          }
        });
    });
}

function doDeploy(type) {
  const deployFunc = type === 'new' ? createFunction : updateFunctionCode;
  return zip()
    .then(deployFunc)
    .then(handleSuccess)
    .catch(err => {
      console.log('No config found, first run: lambdasync init');
      console.error(err);
      return err;
    });
}

function handleSuccess(result) {
  console.log('Successfully synced function', result);
  promisedExec(LAMBDASYNC_BIN + '/rimraf deploy.zip', targetOptions);
  return updateSettings({
    lambdaArn: stripLambdaVersion(result.FunctionArn),
    lambdaRole: result.Role
  });
}

function functionExists(functionName) {
  return new Promise((resolve, reject) => {
    const params = {
      FunctionName: functionName
    };
    lambda.getFunction(params, (err, data) => {
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

function zip() {
  return promisedExec(LAMBDASYNC_BIN + '/bestzip ./deploy.zip ./*', targetOptions);
}

function updateFunctionCode() {
  return new Promise((resolve, reject) => {
    lambda.updateFunctionCode({
      FunctionName: settings.lambdaName,
      Publish: true,
      ZipFile: fs.readFileSync('./deploy.zip')
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

function createFunction() {
  return new Promise((resolve, reject) => {
    lambda.createFunction({
      Code: {
        ZipFile: fs.readFileSync('./deploy.zip')
      },
      FunctionName: settings.lambdaName,
      Handler: 'index.handler',
      Role: 'arn:aws:iam::598075967016:role/foodographer-api-dev-r-IamRoleLambda-KPQ9UITBWAJ6', // lambda_basic_execution
      Runtime: 'nodejs4.3', /* required */
      Description: description, // package.json description
      MemorySize: 128, // default
      Publish: true,
      Timeout: 3
    }, function(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });

}

module.exports = deploy;
