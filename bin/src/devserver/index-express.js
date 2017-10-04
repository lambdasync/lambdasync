const path = require('path');
const express = require('express');
const cors = require('cors');
const chainData = require('chain-promise-data');
const expressCompat = require('./express-compat');
const {getSettings} = require('../settings');
const {readFile} = require('../file');
const {startWith, makeAbsolutePath} = require('../util');
const {LAMBDASYNC_ROOT} = require('../constants');

function setup(settings, lambdaHandler) {
  const app = express();
  app.use(cors());

  const compat = expressCompat(settings);

  function proxyHandler(req, res) {
    // Create event, context and callback params for the Lambda handler
    const event = compat.express.requestToLambdaEvent(req);
    const context = compat.express.responseToContext(res);
    const callback = compat.lambda.callbackToExpressResponse.bind(null, res);

    // Set response headers that makes sense for a dev server
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return lambdaHandler(event, context, callback);
  }

  app.get('/favicon*', (req, res) => {
    res.sendFile(path.join(__dirname, '/favicon.ico'));
  });

  app.all('*', proxyHandler);

  return app;
}

function start(settings, lambdaHandler) {
  const app = setup(settings, lambdaHandler);

  app.listen(3003, () => {
    console.log('running server on port 3003');
  });

  return app;
}

startWith()
  .then(chainData(getSettings, settings => ({settings})))
  // We need package.json to check if there is a custom handler path
  .then(chainData(
    () => readFile(path.join(LAMBDASYNC_ROOT, 'package.json'), JSON.parse),
    packageJson => ({packageJson})
  ))
  .then(chainData(
    ({packageJson}) => {
      let handlerPath = makeAbsolutePath('index.js');
      if (packageJson && packageJson.lambdasync && packageJson.lambdasync.entry) {
        handlerPath = makeAbsolutePath(packageJson.lambdasync.entry);
      }
      const lambdaHandler = require(handlerPath).handler;
      return {lambdaHandler};
    }
  ))
  .then(chainData(
    ({ settings, lambdaHandler }) => start(settings, lambdaHandler)
  ));


exports = module.exports = {};

if (process.env.NODE_ENV === 'test') {
    exports.start = start;
    exports.setup = setup;
}
