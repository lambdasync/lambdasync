import readline from 'readline';
import {settingsFields, putSettings} from './settings.js';
import {readFile, writeFile} from './file.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export function init() {
  // Promise.all(settingsFields.map(prompt))
  //   .then(answers => {
  //     console.log('answers', answers);
  //   })
  prompt({}, settingsFields, 0, settings => {
    console.log('Init complete, creating setting file:\n', JSON.stringify(settings, null, '  '));
    putSettings(settings);
    persistAwsConfig(settings);
    rl.close();
  });
}

function persistAwsConfig(config) {

}

function prompt(acc = {}, settings, index, cb) {
  if (settings[index]) {
    rl.question(settings[index] + ': ', answer => {
      acc[settings[index]] = answer;
      prompt(acc, settings, index + 1, cb);
    });
  } else {
    cb(acc);
  }
}
