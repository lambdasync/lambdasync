const aws = require('./aws.js');
const fs = require('fs');
const path = require('path');
const {LAMBDASYNC_ROOT} = require('./constants.js');
const {updateSettings} = require('./settings.js');
const {awsPromise, mergeData} = require('./util.js');
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
      return mergeData({restApiId}, addResource({parentId: id, restApiId, pathPart: path}));
    });
}

function persistApiGateway({id, name, path} = {}) {
  updateSettings({apiGatewayId: id, apiGatewayName: name, apiGatewayPath: path});
  return {id, name, path};
}

function addMethod({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putMethod', {
    restApiId,
    resourceId,
    httpMethod: 'GET',
    authorizationType: 'NONE',
    apiKeyRequired: false,
    requestParameters: {},
    requestModels: {
      'application/json': 'Empty'
    }
  });
}

function addMethodResponse({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putMethodResponse', {
    restApiId,
    resourceId,
    httpMethod: 'GET',
    statusCode: '200',
    // responseModels: {
    //   'application/json': null
    // }
  });
}

function addIntegration({restApiId, resourceId, region, lambdaArn}) {
  const uri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
  return awsPromise(apigateway, 'putIntegration', {
    restApiId,
    resourceId,
    httpMethod: 'GET',
    integrationHttpMethod: 'GET',
    type: 'AWS',
    uri,
    requestTemplates: {
      'application/json': fs.readFileSync(path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'integration-request.vm'), 'utf8')
    },
    passthroughBehavior: 'WHEN_NO_TEMPLATES'
  });
}

function addIntegrationResponse({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putIntegrationResponse', {
    restApiId,
    resourceId,
    httpMethod: 'GET',
    statusCode: '200'
  });
}

function getIntegration(settings) {
  apigateway = getGateway(settings);
  awsPromise(apigateway, 'getMethod', {
    httpMethod: 'GET',
    resourceId: '639832',
    restApiId: 'hajvzl35qf',
    // statusCode: '200'
  })
    .then(data => console.log(JSON.stringify(data)))
    .catch(err => console.log(err));
}

function addMappings({id, restApiId, region, lambdaArn}) {
  const params = {
    restApiId,
    resourceId: id,
    region,
    lambdaArn
  };

  return addMethod(params)
    .then(() => addMethodResponse(params))
    .then(() => addIntegration(params))
    .then(() => addIntegrationResponse(params));
}

function setupApiGateway(
  {name, description, path} = {name:  defaultName(), description: 'lambdasync deployed api', path: 'api'},
  settings
) {
  return createApi({name, description}, settings)
    .then(({id, name}) => persistApiGateway({id, name, path}))
    .then(addResourceToApiGateway)
    .then(res => addMappings(Object.assign(res, settings)))
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
  setupApiGateway,
  getIntegration
}
