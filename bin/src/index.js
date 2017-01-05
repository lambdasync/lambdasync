#!/usr/bin/env node
const minimist = require('minimist');

const {version} = require('../../package.json');
const {getSettings} = require('./settings.js');
const maybeInit = require('./init.js');
const deploy = require('./deploy.js');
const {chainData} = require('./util.js');
const {setupApiGateway, deployApi} = require('./gateway');
const {setLambdaPermission} = require('./permission.js');
const {callApi} = require('./call-api.js');
const {makeLambdaRole} = require('./iam.js');
const scaffold = require('./scaffold.js');
const {config, variable} = require('./config.js');
const devServer = require('./devserver');

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

  if (command._[0] === 'devserver') {
    return getSettings()
      .then(settings => devServer(settings, command._.slice(1)));
  }

  if (command._[0] === 'config') {
    return getSettings()
      .then(settings => config(settings, command._.slice(1)));
  }

  if (command._[0] === 'secret') {
    let operation;
    let args;

    // `lambdasync secret db=prod` sets db, but to remove it you need
    // the `remove` keyword `lambdasync secret remove db`
    if (command._[1] && command._[1].toLowerCase() === 'remove') {
      operation = 'remove';
      args = command._.slice(2);
    } else {
      operation = 'set';
      args = command._.slice(1);
    }
    return getSettings()
      .then(settings => variable(settings, operation, args));
  }

  if (command._[0] === 'new') {
    scaffold(command._[1], command.express ? 'express' : 'vanilla');
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
