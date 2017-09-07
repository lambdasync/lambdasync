const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const copy = require('recursive-copy');
const mkdirp = require('mkdirp');
const minimatch = require('minimatch');
const rimraf = require('rimraf');
const chainData = require('chain-promise-data');
const {description} = require('../../package.json');
const {
  promisedExec,
  stripLambdaVersion,
  markdown,
  markdownProperty,
  functionExists,
  copyPackageJson,
  ignoreData,
  startWith,
  npmInstall,
  hashPackageDependencies
} = require('./util');
const {updateSettings} = require('./settings');
const {
  LAMBDASYNC_BIN,
  LAMBDASYNC_SRC,
  TARGET_ROOT,
  PROMPT_CONFIRM_OVERWRITE_FUNCTION,
  TARGET_DEPLOY_DIR,
  TARGET_HIDDEN_DIR,
  DEPENDENCY_HASH_FILE
} = require('./constants.js');
const aws = require('./aws.js');
const {readFile, writeFile} = require('./file.js');

const targetOptions = {cwd: TARGET_ROOT};
let lambda;
let settings;

function deploy(deploySettings) {
  settings = deploySettings;
  const AWS = aws(settings);
  lambda = new AWS.Lambda();

  return functionExists(lambda, settings.lambdaName)
    .then(functionExists => {
      // If function doesn't already exist, or if it was already deployed
      // by lambdasync lets just deploy it
      if (!functionExists) {
        return doDeploy('new');
      }
      if (settings.lambdaArn) {
        return doDeploy('update');
      }
      // Otherwise if first deploy of existing function let's ask to make sure
      return inquirer.prompt([PROMPT_CONFIRM_OVERWRITE_FUNCTION])
        .then(function (result) {
          if (result.confirm) {
            return doDeploy('update');
          }
          console.log('You answered no, aborting deploy');
        });
    });
}

function doDeploy(type) {
  const deployFunc = type === 'new' ? createFunction : updateFunctionCode;
  return createBundle()
    .then(() => process.chdir(TARGET_ROOT))
    .then(deployFunc)
    .then(handleSuccess)
    .catch(err => {
      console.log('No config found, first run: lambdasync init');
      console.error(err);
      return err;
    });
}

function handleSuccess(result) {
  promisedExec(LAMBDASYNC_BIN + '/rimraf deploy.zip', targetOptions);
  return updateSettings({
    lambdaArn: stripLambdaVersion(result.FunctionArn),
    lambdaRole: result.Role
  })
    .then(settings => {
      let template = fs.readFileSync(path.join(LAMBDASYNC_SRC, 'markdown', 'function-success.md'), 'utf8');
      template += markdownProperty({
        key: 'apiGatewayUrl',
        label: 'API URL'
      }, settings);
      console.log(markdown({
        templateString: template,
        data: settings
      }));
      return settings;
    });
}

function ensureDir(dir) {
  return new Promise((resolve, reject) => {
    mkdirp(dir, () => {
      return resolve();
    });
  });
}

function createBundle() {
  return ensureDir(TARGET_DEPLOY_DIR)
    .then(clearDeployDir)
    .then(() => {
      copyPackageJson(TARGET_ROOT, TARGET_DEPLOY_DIR);
      return {};
    })
    .then(chainData(
      () => readFile(path.join(TARGET_DEPLOY_DIR, 'package.json'), JSON.parse),
      packageJson => ({ packageJson })
    ))
    .then(chainData(ensureDependencies, ignoreData))
    .then(chainData(
      ({ packageJson }) => {
        const { ignore, include } = packageJson || {};
        return copyFiles(ignore, include);
      },
      ignoreData
    ))
    .then(zip)
    .then(() => process)
}

function ensureDependencies({ packageJson }) {
  mkdirp(TARGET_HIDDEN_DIR, () => {
    const dependencyHashPath = path.join(TARGET_HIDDEN_DIR, DEPENDENCY_HASH_FILE);
    const currentDependencyHash = hashPackageDependencies(packageJson);
    return readFile(dependencyHashPath)
      .catch(err => '')
      .then(oldHash => {
        if (oldHash === currentDependencyHash) {
          return;
        }
        return updateDependencies();
      })
      .then(() => writeFile(dependencyHashPath, currentDependencyHash));
  });
}

function updateDependencies() {
  process.chdir(TARGET_DEPLOY_DIR);
  return npmInstall('--production')
    .then(() => process.chdir(TARGET_ROOT));
}

const lambdasyncIgnores = ['.git/**', '.lambdasync/**', 'lambdasync.json', 'package.json', 'package-lock.json', 'node_modules/**'];

function copyFiles(ignore, include) {
  return copy(TARGET_ROOT, TARGET_DEPLOY_DIR, {
    filter: function copyFilter(path) {
      const ignoreMatch = ignore ? matchesPatterns(path, ignore) : false;
      const lambdasyncIgnoreMatch = matchesPatterns(path, lambdasyncIgnores);
      const includeMatch = include ? matchesPatterns(path, include) : true;

      if (path && includeMatch && !ignoreMatch && !lambdasyncIgnoreMatch) {
        return true;
      }
      return false;
    }
  });
}

function matchesPatterns(path, patterns = []) {
  if (patterns.length === 0) {
    return true;
  }
  return patterns.reduce((res, pattern) => {
    if (res) { return res; }
    return minimatch(path, pattern);
  }, false);
}

function clearDeployDir() {
  return new Promise((resolve, reject) => {
    rimraf(`${TARGET_DEPLOY_DIR}/!(node_modules)`, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

function zip() {
  return promisedExec(`${LAMBDASYNC_BIN}/bestzip ${TARGET_ROOT}/deploy.zip ./*`, {
    cwd: TARGET_DEPLOY_DIR
  });
}

function updateFunctionCode() {
  return new Promise((resolve, reject) => {
    lambda.updateFunctionCode({
      FunctionName: settings.lambdaName,
      Publish: true,
      ZipFile: fs.readFileSync('./deploy.zip')
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

function createFunction() {
  return new Promise((resolve, reject) => {
    lambda.createFunction({
      Code: {
        ZipFile: fs.readFileSync('./deploy.zip')
      },
      FunctionName: settings.lambdaName,
      Handler: 'index.handler',
      Role: settings.lambdaRole,
      Runtime: 'nodejs6.10', /* required */
      Description: description, // package.json description
      MemorySize: 128, // default
      Publish: true,
      Timeout: 3
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

module.exports = deploy;
