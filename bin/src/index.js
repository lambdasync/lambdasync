import minimist from 'minimist';
import {getSettings} from './settings.js';
import {init} from './init.js';

const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

function handleCommand(command) {
  if (command._[0] === 'init') {
    console.log('Please provide the following information to setup lambdasync');
    init();
    return;
  }

  if (command.version) {
    console.log('version');
  }

  getSettings()
    .then(settings => {
      console.log('resolved settings', settings);
    })
    .catch(err => {
      console.log('No config found, run: lambdasync init');
    })
}

handleCommand(command);
