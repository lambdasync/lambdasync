const fs = require('fs');
const path = require('path');
const ncp = require('copy-paste');

const aws = require('../aws.js');
const {
  LAMBDASYNC_SRC,
  API_STAGE_NAME,
  HTTP_ANY,
  HTTP_OPTIONS
} = require('../constants.js');
const {updateSettings, getSettings} = require('../settings.js');
const {
  awsPromise,
  markdown,
  chainData,
  startWith
} = require('../util.js');

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

function addMethodAny({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putMethod', {
    restApiId,
    resourceId,
    httpMethod: HTTP_ANY,
    authorizationType: 'NONE',
    apiKeyRequired: false,
    requestParameters: {
      'method.request.path.proxy': true
    }
  });
}

function addMethodAnyIntegration({restApiId, resourceId, region, lambdaArn}) {
  const uri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
  return awsPromise(apigateway, 'putIntegration', {
    restApiId,
    resourceId,
    uri,
    type: 'AWS_PROXY',
    httpMethod: HTTP_ANY,
    integrationHttpMethod: 'POST',
    passthroughBehavior: 'WHEN_NO_MATCH',
    contentHandling: 'CONVERT_TO_TEXT',
    cacheNamespace: resourceId,
    cacheKeyParameters: ['method.request.path.proxy']
  });
}

function addMethodOptions({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putMethod', {
    restApiId,
    resourceId,
    httpMethod: HTTP_OPTIONS,
    authorizationType: 'NONE',
    apiKeyRequired: false,
    requestParameters: {}
  });
}

function addMethodOptionsResponse({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putMethodResponse', {
    restApiId,
    resourceId,
    httpMethod: HTTP_OPTIONS,
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': false,
      'method.response.header.Access-Control-Allow-Methods': false,
      'method.response.header.Access-Control-Allow-Origin': false
    },
    responseModels: {
      'application/json': 'Empty'
    }
  });
}

function addMethodOptionsIntegration({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putIntegration', {
    restApiId,
    resourceId,
    httpMethod: HTTP_OPTIONS,
    type: 'MOCK',
    requestTemplates: {
      'application/json': '{"statusCode": 200}'
    },
    passthroughBehavior: 'WHEN_NO_MATCH',
    cacheNamespace: resourceId,
    cacheKeyParameters: []
  });
}

function addMethodOptionsIntegrationResponse({restApiId, resourceId}) {
  return awsPromise(apigateway, 'putIntegrationResponse', {
    restApiId,
    resourceId,
    httpMethod: HTTP_OPTIONS,
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token\'',
      'method.response.header.Access-Control-Allow-Methods': '\'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT\'',
      'method.response.header.Access-Control-Allow-Origin': '\'*\''
    },
    responseTemplates: {
      'application/json': null
    }
  });
}

function addCorsSupport({restApiId, resourceId}) {
  return startWith({
    restApiId,
    resourceId
  })
    .then(chainData(addMethodOptions))
    .then(chainData(addMethodOptionsResponse))
    .then(chainData(addMethodOptionsIntegration))
    .then(chainData(addMethodOptionsIntegrationResponse));
}

function addMappings({id, restApiId, region, lambdaArn, lambdaRole}) {
  return startWith({
    restApiId,
    resourceId: id,
    region,
    lambdaArn,
    lambdaRole
  })
    .then(chainData(addMethodAny))
    .then(chainData(addMethodAnyIntegration))
    .then(chainData(addCorsSupport));
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
