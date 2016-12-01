#!/usr/bin/env node
const minimist = require('minimist');

const {version} = require('../../package.json');
const {getSettings} = require('./settings.js');
const maybeInit = require('./init.js');
const deploy = require('./deploy.js');
const {chainData, parseCommandArgs} = require('./util.js');
const {setupApiGateway, deployApi, addStageVariables} = require('./gateway.js');
const {setLambdaPermission} = require('./permission.js');
const {callApi} = require('./call-api.js');
const {makeLambdaRole} = require('./iam.js');
const scaffold = require('./scaffold.js');
const {config, variable} = require('./config.js');

const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version',
    c: 'call'
  }
});

function handleCommand(command) {
  if (command.call) {
    return callApi(command);
  }

  if (command._[0] === 'config') {
    return getSettings()
      .then(settings => config(settings, command._.slice(1)));
  }

  if (command._[0] === 'secret') {
    return getSettings()
      .then(settings => variable(settings, command._[1], command._.slice(2)));
  }

  if (command._[0] === 'new') {
    scaffold(command._[1]);
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
    .then(deployApi);
}

handleCommand(command);
