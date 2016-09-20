const aws = require('./aws.js');
const fs = require('fs');
const path = require('path');
const {LAMBDASYNC_ROOT} = require('./constants.js');
const {updateSettings} = require('./settings.js');
const {awsPromise, markdown, chainData, startWith, logger} = require('./util.js');
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

function addIntegration({restApiId, resourceId, httpMethod, region, lambdaArn, lambdaRole}) {
  const uri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
  return awsPromise(apigateway, 'putIntegration', {
    restApiId,
    resourceId,
    httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS',
    uri,
    // credentials: lambdaRole,
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

function addMappings({id, restApiId, httpMethod, region, lambdaArn, lambdaRole}) {
  return startWith({
      restApiId,
      resourceId: id,
      httpMethod,
      region,
      lambdaArn,
      lambdaRole
  })
    .then(chainData(addMethod))
    .then(chainData(addMethodResponse))
    .then(chainData(addIntegration))
    .then(chainData(() => ({httpMethod})))
    .then(chainData(addIntegrationResponse))
}

function deployApi(settings) {
  if (settings.apiGatewayUrl) {
    return settings;
  }
  const {apiGatewayRestApiId, apiGatewayPath} = settings;
  const stageName = 'prod';
  const apiGatewayUrl = `https://${apiGatewayRestApiId}.execute-api.eu-west-1.amazonaws.com/${stageName}/${apiGatewayPath}`;
  return awsPromise(apigateway, 'createDeployment', {
    restApiId: apiGatewayRestApiId,
    stageName
  })
    .then(() => updateSettings({
      apiGatewayUrl
    }))
    .then(settings => {
      console.log(markdown({
        templatePath: 'markdown/deploy-success.md',
        data: settings
      }));
      return settings;
    });
}

function setupApiGateway(settings) {
  if (settings.apiGatewayId) {
    return settings;
  }
  const name = `api-${settings.lambdaName}`;
  const description = `Lambdasync API for function ${settings.lambdaName}`;
  const path = 'api';

  return createApi({name, description}, settings)
    .then(({id, name}) => persistApiGateway({id, name, path}))
    .then(addResourceToApiGateway)
    .then(res => {
      const params = custom => Object.assign(res, settings, custom);
      return addMappings(params({httpMethod: 'GET'}))
        .then(() => addMappings(params({httpMethod: 'POST'})))
        .then(() => addMappings(params({httpMethod: 'PUT'})))
        .then(() => addMappings(params({httpMethod: 'DELETE'})))
        .then(() => addMappings(params({httpMethod: 'HEAD'})))
        .then(() => addMappings(params({httpMethod: 'PATCH'})));
    })
    .then(result => {
      return updateSettings({
        apiGatewayRestApiId: result.restApiId,
        apiGatewayResourceId: result.resourceId
      });
    })
    .catch(err => console.log(err));
}

module.exports = {
  createApi,
  addResource,
  getResources,
  setupApiGateway,
  deployApi
}
