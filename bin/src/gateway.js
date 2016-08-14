const aws = require('./aws.js');
const {updateSettings} = require('./settings.js');
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


function createApi({name, description} = {name:  defaultName(), description: 'lambdasync deployed api'}, settings) {
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

function addResource({parentId, restApiId, pathPart} = {}, settings) {
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

function getResources({restApiId} = {}, settings) {
  console.log('getResources', {restApiId});
  apigateway = getGateway(settings);
  return new Promise((resolve, reject) => {
    apigateway.getResources({restApiId}, function(err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

function getRootResource({id} = {}, settings) {
  return getResources({restApiId: id})
    .then(({items}) => {
      const rootResource = items && items
        .filter(resource => resource.path === '/')
        .reduce((prev, current) => current.id, '');
      return rootResource;
    });
}

function addResourceToApiGateway({id, path} = {}, settings) {
  const restApiId = id;
  return getRootResource({id: restApiId})
    .then((id) => {
      return addResource({parentId: id, restApiId, pathPart: path});
    });
}

function persistApiGateway({id, name, path} = {}) {
  updateSettings({apiGatewayId: id, apiGatewayName: name, apiGatewayPath: path});
  return {id, name, path};
}

function setupApiGateway(
  {name, description, path} = {name:  defaultName(), description: 'lambdasync deployed api', path: 'api'},
  settings
) {
  return createApi({name, description}, settings)
    .then(({id, name}) => persistApiGateway({id, name, path}))
    .then(addResourceToApiGateway)
    .then(result => {
      console.log('API Gateway created', result);
      return result;
    })
    .catch(err => console.log(err));
}

module.exports = {
  createApi,
  addResource,
  getResources,
  setupApiGateway
}
