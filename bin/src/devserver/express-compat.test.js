const expressCompat = require('./express-compat');
const settingsMock = require('../../test/settings-mock.js');
const handlerMock = require('../../test/handler-mock.js');

const mockExpressReq = {
  method: 'GET',
  body: {id:1,name:'Joe'},
  hostname: 'localhost',
  ip: '127.0.0.1',
  originalUrl: '/users',
  path: '/users',
  protocol: 'http',
  query: {
    whatsup: 'doc'
  },
  headers: {
    'x-forwarded-for': '127.0.0.1'
  }
};

const mockExpressRes = {
  send: () => {
    return 1;
  },
  setHeader: () => mockExpressRes,
  status: () => mockExpressRes
};

describe('express compatibility', () => {
  it('can create lambda event from express req', () => {
    const settings = settingsMock.fullSettings;
    const compat = expressCompat(settings);
    const event = compat.express.requestToLambdaEvent(mockExpressReq);
    expect(typeof event).toBe('object');
    expect(event.httpMethod).toBe(mockExpressReq.method);
    expect(event.path).toBe(mockExpressReq.originalUrl);
    expect(event.requestContext.accountId).toBe(settings.accountId);
    expect(event.requestContext.identity.sourceIp).toBe(mockExpressReq.headers['x-forwarded-for']);
  });

  it('can create lambda context from express res', () => {
    const settings = settingsMock.fullSettings;
    const compat = expressCompat(settings);
    const context = compat.express.responseToContext(mockExpressRes);
    expect(typeof context).toBe('object');
    expect(typeof context.done).toBe('function');
    expect(typeof context.succeed).toBe('function');
    expect(typeof context.fail).toBe('function');
    expect(context.succeed(handlerMock.createProxyReturnObject(200))).toBe(1);
    expect(context.functionName).toBe(settings.lambdaName);
  });

  it('can create lambda callback from express res', () => {
    const settings = settingsMock.fullSettings;
    const compat = expressCompat(settings);
    const callbackResult = compat.lambda.callbackToExpressResponse(mockExpressRes, handlerMock.createProxyReturnObject(200));
    expect(callbackResult).toBe(1);

  });
});
