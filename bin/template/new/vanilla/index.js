'use strict';
exports.handler = (event, context) => {
  context.success({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify('Everything is awesome')
  });
};
