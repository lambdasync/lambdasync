import minimist from 'minimist';
import {getSettings} from './settings.js';
import init from './init.js';
import deploy from './deploy.js';
import {version} from '../../package.json';
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
