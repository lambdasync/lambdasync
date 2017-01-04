const path = require('path');
const express = require('express');
const app = express();

const expressCompat = require('./express-compat');
const lambdaHandler = require(path.join(process.cwd(), 'index.js')).handler;

function start(settings) {
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
    res.sendFile(__dirname + '/favicon.ico');
  });

  app.get('/*', proxyHandler);

  app.listen(3003, function() {
    console.log('running server on port 3003');
  });
}

module.exports = start;
