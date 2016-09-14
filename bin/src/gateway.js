const aws = require('./aws.js');
const fs = require('fs');
const path = require('path');
const {LAMBDASYNC_ROOT} = require('./constants.js');
const {updateSettings} = require('./settings.js');
const {awsPromise, chainData, startWith, stripLambdaVersion} = require('./util.js');
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
      return startWith({
        restApiId,
        parentId: id,
        pathPart: path
      })
        .then(chainData(addResource));
    });
}

function persistApiGateway({id, name, path} = {}) {
  updateSettings({apiGatewayId: id, apiGatewayName: name, apiGatewayPath: path});
  return {id, name, path};
}

function addMethod({restApiId, resourceId, httpMethod}) {
  return awsPromise(apigateway, 'putMethod', {
    restApiId,
    resourceId,
    httpMethod,
    authorizationType: 'NONE',
    apiKeyRequired: false,
    requestParameters: {}
  });
}

function addMethodResponse({restApiId, resourceId, httpMethod}) {
  return awsPromise(apigateway, 'putMethodResponse', {
    restApiId,
    resourceId,
    httpMethod,
    statusCode: '200',
    responseModels: {
      'application/json': 'Empty'
    }
  });
}

function addIntegration({restApiId, resourceId, httpMethod, region, lambdaArn}) {
  const uri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
  return awsPromise(apigateway, 'putIntegration', {
    restApiId,
    resourceId,
    httpMethod,
    integrationHttpMethod: 'GET',
    type: 'AWS',
    uri,
    requestTemplates: {
      'application/json': fs.readFileSync(path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'integration-request.vm'), 'utf8')
    },
    passthroughBehavior: 'WHEN_NO_TEMPLATES'
  });
}

function addIntegrationResponse({restApiId, resourceId, httpMethod}) {
  return awsPromise(apigateway, 'putIntegrationResponse', {
    restApiId,
    resourceId,
    httpMethod,
    statusCode: '200'
  });
}

function addMappings({id, restApiId, httpMethod, region, lambdaArn}) {
  return startWith({
      restApiId,
      resourceId: id,
      httpMethod,
      region,
      lambdaArn: stripLambdaVersion(lambdaArn)
  })
    .then(chainData(addMethod))
    .then(chainData(addMethodResponse))
    .then(chainData(addIntegration))
    .then(chainData(addIntegrationResponse))
}

function setupApiGateway(
  {name, description, path} = {name:  defaultName(), description: 'lambdasync deployed api', path: 'api'},
  settings
) {
  return createApi({name, description}, settings)
    .then(({id, name}) => persistApiGateway({id, name, path}))
    .then(addResourceToApiGateway)
    .then(res => {
      const params = custom => Object.assign(res, settings, custom);
      return Promise.all([
        addMappings(params({httpMethod: 'GET'})),
        addMappings(params({httpMethod: 'POST'}))
      ])
    })
    .then(result => {
      console.log('API Gateway created', result);
      updateSettings({
        apiGatewayRestApiId: result[0].restApiId,
        apiGatewayResourceId: result[0].resourceId
      });
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
