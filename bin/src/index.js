#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const init = require('./init.js');
const deploy = require('./deploy.js');
const {version} = require('../../package.json');
const {createApi, addResource, getResources, setupApiGateway} = require('./gateway');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

function handleCommand(command, settings) {
  if (command._[0] === 'init') {
    return init();
  }

  if (command.version) {
    console.log('lambdasync version: ' + version);
    return;
  }

  return deploy(settings);
}


getSettings()
  .then(settings => {
    return handleCommand(command, settings)
      .then(() => settings);
  })
  .then(settings => {
    return !settings.apiGatewayId ?
      setupApiGateway({name: 'testing40', description: 'A test api', path: 'api'}, settings) :
      null;
  })
