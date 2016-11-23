const fs = require('fs');
const path = require('path');

const maybeInit = require('./init.js');
const {mustacheLite} = require('./util.js');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_SRC,
  API_STAGE_NAME,
  HTTP_ANY
} = require('./constants.js');

const TEMPLATE_PATH = path.join(LAMBDASYNC_ROOT, 'bin', 'template');

module.exports = function scaffold(name) {
  fs.mkdirSync(name);
  process.chdir(name);
  // Move index.js example as is
  fs.writeFileSync(
    path.join( process.cwd(), 'index.js' ),
    fs.readFileSync(path.join(TEMPLATE_PATH, 'index.js'))
  );
  // Copy over package.json with name replaced
  const jsonTemplate = fs.readFileSync(path.join(TEMPLATE_PATH, 'package.json'), 'utf8');
  fs.writeFileSync(
    path.join( process.cwd(), 'package.json' ),
    mustacheLite(jsonTemplate, { name })
  );
};
