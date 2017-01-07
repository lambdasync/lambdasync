const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressCompat = require('./express-compat');

function setup(settings, lambdaHandler) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

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

exports = module.exports = start;

if (process.env.NODE_ENV === 'test') {
    exports.setup = setup;
}
