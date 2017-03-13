#!/usr/bin/env node
'use strict';
const path = require('path');
const minimist = require('minimist');

const {version} = require('../../package.json');
const {getSettings} = require('./settings');
const maybeInit = require('./init');
const deploy = require('./deploy');
const {chainData, parseCommandArgs} = require('./util');
const {setupApiGateway, deployApi} = require('./gateway');
const {setLambdaPermission} = require('./permission');
const {callApi} = require('./call-api');
const {makeLambdaRole} = require('./iam');
const scaffold = require('./scaffold');
const {config, variable} = require('./config');
const devServer = require('./devserver');
const {logs} = require('./logs');
const {handleTableCommand} = require('./dynamodb');

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

  if (command._[0] === 'logs') {
    return getSettings()
      .then(settings => logs(settings));
  }

  if (command._[0] === 'table') {
    return getSettings()
      .then(settings => handleTableCommand(
        settings,
        command._[1],
        parseCommandArgs(command._.slice(1))
      ));
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
