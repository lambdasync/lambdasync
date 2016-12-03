exports.handler = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    message: 'Everything is awesome'
  });
};
