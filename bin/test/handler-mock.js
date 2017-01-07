function simpleSuccess(event, context) {
  context.succeed({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify('Everything is awesome!')
  });
};

module.exports = {
  simpleSuccess
};
