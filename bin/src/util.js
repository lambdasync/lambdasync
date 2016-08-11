const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const marked = require('marked');
const TerminalRenderer = require('marked-terminal');
const {LAMBDASYNC_SRC} = require('./constants.js');

marked.setOptions({
  // Define custom renderer
  renderer: new TerminalRenderer()
});

function promisedExec(command, options) {
  return new Promise((resolve, reject) => {
    cp.exec(command, options = {}, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      resolve(stdout);
    });
  });
}

function markdown(relativePath) {
  const md = marked(fs.readFileSync(path.join(LAMBDASYNC_SRC, relativePath), 'utf8'));
  return `\n${md}\n`;
}

function addInputDefault(defaults, inputConfig) {
  if (defaults[inputConfig.name]) {
    return Object.assign({}, inputConfig, {default: defaults[inputConfig.name]});
  }
  return inputConfig;
}

module.exports = {
  promisedExec,
  markdown,
  addInputDefault
};
