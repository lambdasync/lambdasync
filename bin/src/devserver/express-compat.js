const RESOURCE_PATH = '/{proxy+}';
const REQUEST_ID = 'cb8b2c6b-cp7f-11e6-921a-0f16afc9bdc3';

function lambda() {
  return {
    callbackToExpressResponse(res, err, success) {
      return proxyResponseToExpressResponse(res, err || success);
    }
  };
}

function express(lambdasyncMeta) {
  return {
    requestToLambdaEvent(req) {
      return {
        resource: RESOURCE_PATH,
        path: req.path,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: req.query,
        pathParameters: {
          proxy: 'api'
        },
        stageVariables: {}, // TODO: Add as CLI params for dev server
        requestContext: {
          accountId: lambdasyncMeta.accountId,
          resourceId: lambdasyncMeta.apiGatewayResourceId,
          stage: 'prod',
          requestId: REQUEST_ID,
          identity: {
            cognitoIdentityPoolId: null,
            accountId: null,
            cognitoIdentityId: null,
            caller: null,
            apiKey: null,
            sourceIp: ipFromReq(req),
            accessKey: null,
            cognitoAuthenticationType: null,
            cognitoAuthenticationProvider: null,
            userArn: null,
            userAgent: req.headers['user-agent'],
            user: null
          },
          resourcePath: RESOURCE_PATH,
          httpMethod: req.method,
          apiId: lambdasyncMeta.apiGatewayId
        },
        body: stringifyBody(req.body),
        isBase64Encoded: false
      };
    },
    responseToContext(res) {
      var _callbackWaitsForEmptyEventLoop = true;

      return {
        get callbackWaitsForEmptyEventLoop() {
          return _callbackWaitsForEmptyEventLoop;
        },
        set callbackWaitsForEmptyEventLoop(value) {
          _callbackWaitsForEmptyEventLoop = value;
        },
        done: proxyResponseToExpressResponse.bind(null, res),
        succeed: proxyResponseToExpressResponse.bind(null, res),
        fail: proxyResponseToExpressResponse.bind(null, res),
        logGroupName: '',
        logStreamName: '',
        functionName: lambdasyncMeta.lambdaName,
        memoryLimitInMB: '128',
        functionVersion: '$LATEST',
        getRemainingTimeInMillis: () => 1000,
        invokeid: '6914b06p-v26a-11m6-9bae-9b185520a60a',
        awsRequestId: REQUEST_ID,
        invokedFunctionArn: lambdasyncMeta.lambdaArn
      };
    }
  };
}

function ipFromReq(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
     req.socket.remoteAddress || req.connection.socket.remoteAddress;
}

function proxyResponseToExpressResponse(expressRes, proxyResponse) {
  const {statusCode, headers, body} = proxyResponse;

  if (headers) {
    Object.keys(headers).forEach(key => expressRes.setHeader(key, headers[key]));
  }

  return expressRes
    .status(parseInt(statusCode, 10))
    .send(body);
}

function stringifyBody(subject) {
  try {
    if (JSON.stringify(subject) === '{}') {
      return null;
    }
    return JSON.stringify(subject);
  } catch (err) {
    return null;
  }
}

module.exports = function (lambdasyncMeta) {
  return {
    lambda: lambda(),
    express: express(lambdasyncMeta)
  };
};
