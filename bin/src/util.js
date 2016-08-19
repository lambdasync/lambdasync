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

function getProductionDeps() {
  return new Promise((resolve, reject) => {
    cp.exec('npm ls --json --production', (err, stdout, stderr) => {
      try {
        resolve(JSON.parse(stdout).dependencies);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function flattenDeps(deps = {}) {
  return Object.keys(deps).reduce((acc, moduleName) => {
    return [
      ...acc,
      moduleName,
      ...flattenDeps(deps[moduleName].dependencies)
    ];
  }, []);
}

function removeDuplicates(flatDeps) {
  return flatDeps.reduce((acc, moduleName) => {
    return acc.includes(moduleName) ?
      acc : [ ...acc, moduleName ];
  }, []);
}

function getProductionModules() {
  return getProductionDeps()
    .then(flattenDeps)
    .then(removeDuplicates);
}

module.exports = {
  promisedExec,
  markdown,
  addInputDefault,
  getProductionModules
};
