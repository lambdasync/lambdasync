const users = [{id: 1, name: 'Joe'}, {id: 2, name: 'Jane'}];

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

function createProxyReturnObject(statusCode, body, headers = defaultHeaders) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

function contextSucceed(event, context) {
  context.succeed(createProxyReturnObject(200, 'Everything is awesome!'));
};

function contextFail(event, context) {
  context.fail(createProxyReturnObject(404, 'Oops! Not found.'));
};

function contextDone(event, context) {
  context.done(createProxyReturnObject(500, {error: 'This test failed.'}));
};

function callback(event, context, callback) {
  callback(createProxyReturnObject(200, 'Everything is awesome!'));
};

exports = module.exports = {};
exports.contextSucceed = contextSucceed;
exports.contextFail = contextFail;
exports.contextDone = contextDone;
exports.callback = callback;
