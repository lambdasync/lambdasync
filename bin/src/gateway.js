const aws = require('./aws.js');
let AWS;
let apigateway;

function defaultName() {
  return 'LambdaSyncApi' + Math.floor(Math.random() * 100000000);
}



function createApi(settings, {name, description} = {name:  defaultName(), description: 'lambdasync deployed api'}) {
  AWS = AWS || aws(settings);
  apigateway = new AWS.APIGateway();

  return new Promise((resolve, reject) => {
    apigateway.createRestApi({name, description}, function(err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

module.exports = {
  createApi
}
