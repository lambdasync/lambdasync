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

function promisedExec(command, options) { // eslint-disable-line no-unused-vars
  return new Promise((resolve, reject) => {
    cp.exec(command, options = {}, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      resolve(stdout);
    });
  });
}

function mustacheLite(template, data = {}) {
  let content = template;
  Object.keys(data).forEach(key => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
  });
  return content;
}

function markdown({templateString = null, templatePath = null, data = {}}) {
  const template = templateString ?
    templateString : fs.readFileSync(path.join(LAMBDASYNC_SRC, templatePath), 'utf8');
  const content = mustacheLite(template, data);
  const md = marked(content);
  return `\n${md}\n`;
}

function markdownProperty({key, label}, obj) {
  if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
    return '**' + label + ':** `' + obj[key] + '`\n';
  }
  return '';
}

function addInputDefault(defaults, inputConfig) {
  if (defaults[inputConfig.name]) {
    return Object.assign({}, inputConfig, {default: defaults[inputConfig.name]});
  }
  return inputConfig;
}

function getProductionDeps() {
  return new Promise((resolve, reject) => {
    cp.exec('npm ls --json --production', (err, stdout) => { // eslint-disable-line handle-callback-err
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
      acc : [...acc, moduleName];
  }, []);
}

function getProductionModules() {
  return getProductionDeps()
    .then(flattenDeps)
    .then(removeDuplicates);
}

function awsPromise(api, method, params) {
  return new Promise((resolve, reject) => {
    api[method](params, function cb(err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

function stripLambdaVersion(lambdaArn) {
  return lambdaArn.replace(/:[0-9]+$/, '');
}

function makeLambdaPolicyArn({lambdaArn, apiGatewayId}) {
  return lambdaArn
    .replace('arn:aws:lambda', 'arn:aws:execute-api')
    .replace(/function.*?$/g, apiGatewayId)
    .concat('/*/GET/api');
}

const logger = label => input => {
  console.log('\n\n');
  console.log(label, input);
  console.log('\n\n');
  return input;
};

const logMessage = message => input => {
  console.log(message);
  return input;
};

const delay = time => input => new Promise(resolve => {
  setTimeout(() => {
    resolve(input);
  }, time);
});

const chainData = fn =>
  (res = {}) => Promise.resolve(fn(res))
    .then(out => Object.assign(res, out));

const startWith = data => Promise.resolve(data);

module.exports = {
  promisedExec,
  markdown,
  markdownProperty,
  addInputDefault,
  getProductionModules,
  awsPromise,
  stripLambdaVersion,
  chainData,
  startWith,
  delay,
  makeLambdaPolicyArn,
  logger,
  logMessage
};
