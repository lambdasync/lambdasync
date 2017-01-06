const fs = require('fs');
const path = require('path');
const validate = require('validate-npm-package-name');
const ncp = require('ncp').ncp;
const spawn = require('cross-spawn');

const maybeInit = require('./init.js');
const {mustacheLite, markdown} = require('./util.js');
const {LAMBDASYNC_ROOT} = require('./constants.js');

const validTemplatenames = ['vanilla', 'express'];

module.exports = function (name = '', templateName) {
  // Validate name
  const validatedName = validate(name);
  if (!validatedName.validForNewPackages) {
    console.log(markdown({
      templatePath: 'markdown/naming.md'
    }));
    return;
  }

  // Validate templateName
  let template = templateName;
  if (!validTemplatenames.includes(template)) {
    // If the templateName is not valid default to `vanilla`
    template = 'vanilla';
  }

  // Create the new project folder
  fs.mkdirSync(name);
  process.chdir(name);

  const TEMPLATE_PATH = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'new', template);

  // Copy over all template files except package.json
  copyTemplateDir(TEMPLATE_PATH, process.cwd())
    // Copy the package.json template, adding the project name as name
    .then(() => copyPackageJson(TEMPLATE_PATH, process.cwd(), {name}))
    // Run the project init flow
    .then(() => maybeInit({}))
    .then(install)
    .then(() => {
      console.log(markdown({
        templatePath: 'markdown/scaffold-success.md',
        data: {name}
      }));
    })
    .catch(() => {
      console.log(markdown({
        templatePath: 'markdown/scaffold-fail.md'
      }));
    });
};

function copyTemplateDir(templateDir, targetDir) {
  const packageJsonFilter = {filter: filename => !filename.includes('package.json')};
  return new Promise((resolve, reject) => {
    ncp(templateDir, targetDir, packageJsonFilter, err => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

function copyPackageJson(templateDir, targetDir, data) {
  // Copy over package.json with name replaced
  const jsonTemplate = fs.readFileSync(path.join(templateDir, 'package.json'), 'utf8');
  return fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    mustacheLite(jsonTemplate, data)
  );
}

function install() {
  return new Promise((resolve, reject) => {
    var child = spawn('npm', ['install'], {stdio: 'inherit'});
    child.on('close', code => {
      if (code !== 0) {
        return reject('npm install failed');
      }
      return resolve();
    });
  });
}
