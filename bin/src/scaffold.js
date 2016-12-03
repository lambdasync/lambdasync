const fs = require('fs');
const path = require('path');
const validate = require('validate-npm-package-name');

const maybeInit = require('./init.js');
const {mustacheLite, markdown} = require('./util.js');
const {LAMBDASYNC_ROOT} = require('./constants.js');

const TEMPLATE_PATH = path.join(LAMBDASYNC_ROOT, 'bin', 'template');

module.exports = function (name = '') {
  // Validate name
  const validatedName = validate(name);
  if (!validatedName.validForNewPackages) {
    console.log(markdown({
      templatePath: 'markdown/naming.md'
    }));
    return;
  }
  fs.mkdirSync(name);
  process.chdir(name);
  // Move index.js example as is
  fs.writeFileSync(
    path.join(process.cwd(), 'index.js'),
    fs.readFileSync(path.join(TEMPLATE_PATH, 'index.js'))
  );
  // Copy over package.json with name replaced
  const jsonTemplate = fs.readFileSync(path.join(TEMPLATE_PATH, 'package.json'), 'utf8');
  fs.writeFileSync(
    path.join(process.cwd(), 'package.json'),
    mustacheLite(jsonTemplate, {name})
  );
  maybeInit({})
    .then(() => {
      console.log(markdown({
        templatePath: 'markdown/scaffold-success.md',
        data: {name}
      }));
    });
};
