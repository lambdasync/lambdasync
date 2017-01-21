const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const marked = require('marked');
const TerminalRenderer = require('marked-terminal');

const {LAMBDASYNC_SRC} = require('./constants');

marked.setOptions({
  // Define custom renderer
  renderer: new TerminalRenderer()
});

// Executes a CLI command and returns a promise
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

// Replaces {{vars}} in strings
function mustacheLite(template, data = {}) {
  let content = template;
  Object.keys(data).forEach(key => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
  });
  return content;
}

// Takes a markdown string, or path to a markdown file (relative to Lambdasync's `src` dir)
// and produces terminal styled markdown
// Will also replace an mustahce vars with values from the supplied data object
function markdown({templateString = null, templatePath = null, data = {}}) {
  const template = templateString ?
    templateString : fs.readFileSync(path.join(LAMBDASYNC_SRC, templatePath), 'utf8');
  const content = mustacheLite(template, data);
  const md = marked(content);
  return `\n${md}\n`;
}

// Takes an object of {key,label} and a data object and produces
// markdown for a bold label and inline code ticks around the value
// that was fetched from the data object using the key
function markdownProperty({key, label}, data) {
  if (data && Object.prototype.hasOwnProperty.call(data, key)) {
    return '**' + label + ':** `' + data[key] + '`\n';
  }
  return '';
}

// Helps add default values to `inquirer` prompt objects
function addInputDefault(defaults, inputConfig) {
  if (defaults[inputConfig.name]) {
    return Object.assign({}, inputConfig, {default: defaults[inputConfig.name]});
  }
  return inputConfig;
}

// Gets object of production dependencies using `npm ls`
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

// Gets a flat array of all production dependencies
function getProductionModules() {
  return getProductionDeps()
    .then(flattenDeps)
    .then(removeDuplicates);
}

// Calls an aws sdk class and method and returns a promise
function awsPromise(api, method, params) {
  return new Promise((resolve, reject) => {
    try {
      api[method](params, (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
    } catch (err) {
      return reject(err)
    }
  });
}

// Removes the `:12345` version at the end of the function ARN
function stripLambdaVersion(lambdaArn) {
  return lambdaArn.replace(/:[0-9]+$/, '');
}

function makeLambdaPolicyArn({lambdaArn, apiGatewayId}) {
  return lambdaArn
    .replace('arn:aws:lambda', 'arn:aws:execute-api')
    .replace(/function.*?$/g, apiGatewayId)
    .concat(`/*/*/*`);
}

function handleGenericFailure() {
  // TODO: Log errors here, possibly to a Lambda instance? :)
  console.log(markdown({
    templatePath: 'markdown/generic-fail.md'
  }));
}

// takes an array of CLI args [ 'timeout=10' ] and returns a key value object
// {timeout: 10}, it will also try to JSON parse args
function parseCommandArgs(args = [], settings = {}) {
  return args.reduce((acc, current) => {
    let [key, valueKey] = current.split('=');
    if (!key || !valueKey) {
      return acc;
    }
    // If string starts with a [ or {, JSON.parse it
    if (valueKey[0] === '[' || valueKey[0] === '{') {
      try {
        valueKey = JSON.parse(valueKey);
      } catch (err) {}
    }

    acc[key] = settings[valueKey] || valueKey;
    return acc;
  }, {});
}

const logger = label => input => {
  console.log('\n\n' + label + '\n');
  console.log(input);
  console.log('\n\n');
  return input;
};

const logMessage = message => input => {
  console.log(message);
  return input;
};

function isDate(date) {
  return Object.prototype.toString.call(date) === '[object Date]';
}

function formatTimestamp(timestamp) {
  // Timestamp is in UTC, but user wants to see local time so add the offset
  // Inverse the offset since we have a UTC time to convert to local
  const offset = new Date().getTimezoneOffset() * -1;
  const localTime = new Date(timestamp + (offset * 60 * 1000));
  if (isDate(localTime)) {
    const dateStr = localTime.toISOString();
    return dateStr.replace('T', ' ').substring(0, dateStr.indexOf('.'));
  }
  return null;
}

const delay = time => input => new Promise(resolve => {
  setTimeout(() => {
    resolve(input);
  }, time);
});

const chainData = fn =>
  (res = {}) => Promise.resolve(fn(res))
    .then(out => Object.assign(res, out));

const startWith = data => Promise.resolve(data);

exports = module.exports = {};
exports.promisedExec = promisedExec;
exports.handleGenericFailure = handleGenericFailure;
exports.markdown = markdown;
exports.markdownProperty = markdownProperty;
exports.mustacheLite = mustacheLite;
exports.addInputDefault = addInputDefault;
exports.getProductionModules = getProductionModules;
exports.awsPromise = awsPromise;
exports.stripLambdaVersion = stripLambdaVersion;
exports.chainData = chainData;
exports.startWith = startWith;
exports.delay = delay;
exports.makeLambdaPolicyArn = makeLambdaPolicyArn;
exports.parseCommandArgs = parseCommandArgs;
exports.logger = logger;
exports.logMessage = logMessage;
exports.formatTimestamp = formatTimestamp;
exports.isDate = isDate;

if (process.env.NODE_ENV === 'test') {
  exports.getProductionDeps = getProductionDeps;
}
