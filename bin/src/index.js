#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const init = require('./init.js');
const deploy = require('./deploy.js');
const {version} = require('../../package.json');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

function handleCommand(command, settings) {
  if (command._[0] === 'init') {
    console.log('Please provide the following information to setup lambdasync');
    return init();
  }

  if (command.version) {
    console.log('Lambdasync version: ' + version);
    return;
  }

  return deploy(settings);
}

getSettings()
  .then(settings => {
    handleCommand(command, settings);
  });
