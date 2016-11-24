const fs = require('fs');
const path = require('path');
const ncp = require("copy-paste");

const aws = require('./aws.js');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_SRC,
  API_STAGE_NAME,
  HTTP_ANY
} = require('./constants.js');
const {updateSettings, getSettings} = require('./settings.js');
const {
  awsPromise,
  markdown,
  chainData,
  startWith
} = require('./util.js');

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

function createApi({name, description} = {name: defaultName(), description: 'lambdasync deployed api'}, settings) {
  apigateway = getGateway(settings);

  return awsPromise(apigateway, 'createRestApi', {name, description});
}

function addResource({parentId, restApiId} = {}, settings) {
  apigateway = getGateway(settings);
  return awsPromise(apigateway, 'createResource', {parentId, restApiId, pathPart: '{proxy+}'});
}

function getResources({restApiId} = {}, settings) {
  apigateway = getGateway(settings);
  return awsPromise(apigateway, 'getResources', {restApiId});
}

function getRootResource({id} = {}) {
  return getResources({restApiId: id})
    .then(({items}) => {
      const rootResource = items && items
        .filter(resource => resource.path === '/')
        .reduce((prev, current) => current.id, '');
      return rootResource;
    });
}

function addResourceToApiGateway({apiGatewayId} = {}) {
  const restApiId = apiGatewayId;
  return getRootResource({id: apiGatewayId})
    .then(id => startWith({
      restApiId,
      parentId: id
    }))
    .then(chainData(addResource));
}

function persistApiGateway({id, name} = {}) {
  return updateSettings({apiGatewayId: id, apiGatewayName: name});
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
    integrationHttpMethod: 'POST',
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
    .then(chainData(addIntegrationResponse));
}

function deployApi(settings) {
  if (settings.apiGatewayUrl) {
    return settings;
  }
  const {apiGatewayRestApiId, region} = settings;
  const stageName = API_STAGE_NAME;
  const apiGatewayUrl = `https://${apiGatewayRestApiId}.execute-api.${region}.amazonaws.com/${stageName}/api`;
  return awsPromise(apigateway, 'createDeployment', {
    restApiId: apiGatewayRestApiId,
    stageName
  })
    .then(({id}) => updateSettings({
      apiGatewayUrl,
      apiGatewayDeploymentId: id
    }))
    .then(settings => {
      console.log(markdown({
        templatePath: 'markdown/deploy-success.md',
        data: settings
      }));
      ncp.copy(settings.apiGatewayUrl);
      return settings;
    });
}

function addStageVariables(vars = {}) {
  const op = (key, value) => ({
    op: 'replace',
    path: `/variables/${key}`,
    value
  });
  return getSettings()
    .then(settings => {
      const apigateway = getGateway(settings);
      const restApiId = settings.apiGatewayRestApiId;
      const patchOperations = Object.keys(vars).map(key => op(key, vars[key]));
      return awsPromise(apigateway, 'updateStage', {restApiId, stageName: API_STAGE_NAME, patchOperations})
        .then(() => vars)
        .then(handleStageVariablesSuccess);
    });
}

function handleStageVariablesSuccess(vars) {
  let templateString = fs.readFileSync(path.join(LAMBDASYNC_SRC, 'markdown', 'secret-success.md'), 'utf8');
  templateString = Object.keys(vars).reduce((acc, key) =>
    acc + '**Secret key:** `' + key + '`\n', templateString);
  console.log(markdown({templateString}));
}

function setupApiGateway(settings) {
  if (settings.apiGatewayId) {
    return settings;
  }
  console.log('Deploying your API endpoint...');
  const name = `api-${settings.lambdaName}`;
  const description = `Lambdasync API for function ${settings.lambdaName}`;

  return createApi({name, description}, settings)
    .then(({id, name}) => persistApiGateway({id, name}))
    .then(addResourceToApiGateway)
    .then(res => {
      const params = custom => Object.assign(res, settings, custom);
      return addMappings(params({httpMethod: HTTP_ANY}));
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
  deployApi,
  addStageVariables
};
