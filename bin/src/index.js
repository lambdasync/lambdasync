#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const maybeInit = require('./init.js');
const deploy = require('./deploy.js');
const {chainData, awsPromise, logger} = require('./util.js');
const aws = require('./aws.js');
const {version} = require('../../package.json');
const {createApi, addResource, getResources, setupApiGateway, deployApi} = require('./gateway');
const {setLambdaPermission} = require('./permission.js');
const {callApi} = require('./call-api.js');
const {makeLambdaRole} = require('./iam.js');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version',
    c: 'call'
  }
});

function handleCommand(command) {
  if (command.call) {
    return callApi(command);
    return;
  }

  if (command.version) {
    console.log('lambdasync version: ' + version);
    return;
  }

  return getSettings()
    .then(maybeInit)
    .then(makeLambdaRole)
    .then(chainData(deploy))
    .then(setupApiGateway)
    .then(setLambdaPermission)
    .then(deployApi)
    // .catch(logger('catch all'))
}


handleCommand(command);
