const aws = require('./aws.js');
const {awsPromise, makeLambdaPolicyArn} = require('./util.js');

function getGateway(settings) {
  const AWS = aws(settings);
  const apigateway = new AWS.Lambda();
  return apigateway;
}

function setLambdaPermission(settings) {
  if (settings.apiGatewayUrl) {
    return settings;
  }
  const api = getGateway(settings);
  const {lambdaArn, apiGatewayId} = settings;
  const params = {
    Action: 'lambda:InvokeFunction',
    FunctionName: lambdaArn,
    Principal: 'apigateway.amazonaws.com',
    StatementId: 's' + (Math.floor(Math.random() * 1000000000)),
    SourceArn: makeLambdaPolicyArn({lambdaArn, apiGatewayId})
  };
  return awsPromise(api, 'addPermission', params)
    .then(() => settings);
}

module.exports = {
  setLambdaPermission
};
