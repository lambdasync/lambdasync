const url = require('url');
const RESOURCE_PATH = '/{proxy+}';
const REQUEST_ID = 'cb8b2c6b-cp7f-11e6-921a-0f16afc9bdc3';

function lambda() {
  return {
    callbackToServerResponse(res, err, success) {
      return proxyResponseToServerResponse(res, err || success);
    }
  };
}

const server = lambdasyncMeta => ({
  requestToLambdaEvent: req => {
    const requestUrl = url.parse(`${req.headers.origin}${req.url}`);
    debugger;
    return {
      resource: RESOURCE_PATH,
      path: requestUrl.pathname,
      httpMethod: requestUrl.protocol.slice(0, -1),
      headers: req.headers,
      queryStringParameters: requestUrl.query,
      pathParameters: {
        proxy: 'api',
      },
      stageVariables: {},
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
      body: Buffer.from(req.body, 'utf8'),
      isBase64Encoded: false,
    };
  },
  responseToContext: res => {
    var _callbackWaitsForEmptyEventLoop = true;

    return {
      get callbackWaitsForEmptyEventLoop() {
        return _callbackWaitsForEmptyEventLoop;
      },
      set callbackWaitsForEmptyEventLoop(value) {
        _callbackWaitsForEmptyEventLoop = value;
      },
      done: proxyResponseToServerResponse.bind(null, res),
      succeed: proxyResponseToServerResponse.bind(null, res),
      fail: proxyResponseToServerResponse.bind(null, res),
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
  },
});

function ipFromReq(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress ||
     req.socket.remoteAddress || req.connection.socket.remoteAddress;
}

function proxyResponseToServerResponse(serverRes, proxyResponse) {
  const {statusCode, headers, body} = proxyResponse;

  if (headers) {
    Object.keys(headers).forEach(key => serverRes.setHeader(key, headers[key]));
  }

  serverRes.statusCode = parseInt(statusCode, 10);

  return serverRes.end(body);
}

module.exports = function (lambdasyncMeta) {
  return {
    lambda: lambda(),
    server: server(lambdasyncMeta)
  };
};
