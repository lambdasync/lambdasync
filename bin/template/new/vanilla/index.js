exports.handler = (event, context, callback) => {
  context.fail({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify('Everything is awesome')
  });
};
