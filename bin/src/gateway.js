const aws = require('./aws.js');
let AWS;
let apigateway;

function defaultName() {
  return 'LambdaSyncApi' + Math.floor(Math.random() * 100000000);
}

function getGateway(settings) {
  if (apigateway) {
    return apigateway;
  }
  AWS = AWS || aws(settings);
  apigateway = new AWS.APIGateway();
  return apigateway;
}


function createApi(settings, {name, description} = {name:  defaultName(), description: 'lambdasync deployed api'}) {
  apigateway = getGateway(settings);

  return new Promise((resolve, reject) => {
    apigateway.createRestApi({name, description}, function(err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

function addResource(settings, {parentId, restApiId, pathPart} = {}) {
  apigateway = getGateway(settings);
  return new Promise((resolve, reject) => {
    apigateway.createResource({parentId, restApiId, pathPart}, function(err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });

}

module.exports = {
  createApi,
  addResource
}
