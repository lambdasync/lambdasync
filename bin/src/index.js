#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const init = require('./init.js');
const deploy = require('./deploy.js');
const {chainData, awsPromise} = require('./util.js');
const aws = require('./aws.js');
const {version} = require('../../package.json');
const {createApi, addResource, getResources, setupApiGateway} = require('./gateway');
const {setLambdaPermission} = require('./permission.js');
const {callApi} = require('./call-api.js');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version',
    c: 'call'
  }
});

function handleCommand(command) {
  if (command._[0] === 'init') {
    return init();
  }

  if (command.call) {
    return callApi(command);
    return;
  }

  if (command.version) {
    console.log('lambdasync version: ' + version);
    return;
  }

  return getSettings()
    .then(chainData(deploy))
    .then(settings => {
      console.log('deploy complete', settings);
      return !settings.apiGatewayId ?
        setupApiGateway({name: 'testing50', description: 'A test api', path: 'api'}, settings) :
        null;
    })
    .then(getSettings)
    .then(setLambdaPermission);
}


handleCommand(command);
