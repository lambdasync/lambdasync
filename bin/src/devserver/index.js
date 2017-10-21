const fs = require('fs');
const path = require('path');
const http = require('http');
const chainData = require('chain-promise-data');
const serverCompat = require('./server-compat');
const {getSettings} = require('../settings');
const {readFile} = require('../file');
const {startWith, makeAbsolutePath} = require('../util');
const {LAMBDASYNC_ROOT} = require('../constants');

function setup(settings, lambdaHandler) {
	const compat = serverCompat(settings);

  function proxyHandler(req, res) {
		// Respond to /favicon requests first
		if (req.url.indexOf('/favicon') === 0) {
			return sendFavicon(res);
		}

		// Collect incoming data
		let inData = '';

		req.on('data', data => inData += data);
		req.on('end', () => {
			req.body = inData || null;
			debugger;
			// Create event, context and callback params for the Lambda handler
			const event = compat.server.requestToLambdaEvent(req);
			const context = compat.server.responseToContext(res);
			const callback = compat.lambda.callbackToServerResponse.bind(null, res);

			// Set response headers that makes sense for a dev server
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
			res.setHeader('Pragma', 'no-cache');
			res.setHeader('Expires', '0');
			Object.keys(req.headers).forEach(key => {
				res.setHeader(key, req.headers[key]);
			});

			return lambdaHandler(event, context, callback);
		});
  }

	const app = http.createServer(proxyHandler);

  return app;
}

function start(settings, lambdaHandler) {
  const app = setup(settings, lambdaHandler);

  app.listen(3003, () => {
    console.log('running server on port 3003');
  });

  return app;
}

function sendFavicon(res) {
	const iconPath = path.join(__dirname, '/favicon.ico');
	const readStream = fileSystem.createReadStream(iconPath);
	return readStream.pipe(response);
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
