const aws = require('./aws.js');
const {awsPromise, makeLambdaPolicyArn} = require('./util.js');

function getGateway(settings) {
  const AWS = aws(settings);
  const apigateway = new AWS.Lambda();
  return apigateway;
}

function setLambdaPermission(settings) {
  console.log(settings);
  const api = getGateway(settings);
  console.log(api);
  const {lambdaArn, apiGatewayId} = settings;
  const params = {
    Action: 'lambda:InvokeFunction',
    FunctionName: lambdaArn,
    Principal: 'apigateway.amazonaws.com',
    StatementId: 's' + (Math.floor(Math.random() *1000000000)),
    SourceArn: makeLambdaPolicyArn({lambdaArn, apiGatewayId})
  }
  awsPromise(api, 'addPermission', params)
    .then(res => console.log('permission result', res))
    .catch(err => console.log('permission err', err));
}

module.exports = {
  setLambdaPermission
};
