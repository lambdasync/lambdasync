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
    handleCommand(command, settings);
  });
