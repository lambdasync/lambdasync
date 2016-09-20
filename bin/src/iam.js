const path = require('path');
const aws = require('./aws.js');
const {awsPromise, logger} = require('./util.js');
const {readFile} = require('./file.js');
const {LAMBDASYNC_ROOT} = require('./constants.js');
const {updateSettings} = require('./settings.js');

const invokePolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'invoke-policy.json');
const trustPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'trust-policy.json');

function createPolicy(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return readFile(invokePolicyPath, JSON.parse)
    .then(policy => awsPromise(api, 'createPolicy', {
      PolicyName: 'LambdasyncInvokePolicy',
      PolicyDocument: JSON.stringify(policy)
    }))
    .then(res => updateSettings({
      lambdaPolicy: res.Policy.Arn
    }));
}

function attachPolicy(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();
  const {lambdaRole, lambdaPolicy} = settings;

  return awsPromise(api, 'attachRolePolicy', {
    RoleName: getRoleNameFromArn(lambdaRole),
    PolicyArn: lambdaPolicy
  });
}

function createRole(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return readFile(trustPolicyPath, JSON.parse)
    .then(policy => awsPromise(api, 'createRole', {
      RoleName: 'LambdasyncExecRole',
      AssumeRolePolicyDocument: JSON.stringify(policy)
    }))
    .then(res => updateSettings({
      lambdaRole: res.Role.Arn
    }));
}

function getRoleNameFromArn(arn) {
  return arn.replace(/.*?\//, '');
}

function makeLambdaRole(settings) {
  if (settings.lambdaRole) {
    return settings;
  }
  return createRole(settings)
    .then(createPolicy)
    .then(attachPolicy);
}

module.exports = {
  makeLambdaRole
};

/*

IAM.createPolicy

{
    PolicyName: 'LambdasyncAPIGatewayLambdaInvokePolicy',
    PolicyDocument: '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Resource":["*"],"Action":["lambda:InvokeFunction"]}]}'
}

{
    ResponseMetadata: {
        RequestId: 'ab3c03ab-7e71-11e6-9c9b-d78056091cfa'
    },
    Policy: {
        PolicyName: 'LambdasyncAPIGatewayLambdaInvokePolicy',
        PolicyId: 'ANPAJMPDJDZES7KBPGGUC',
        Arn: 'arn:aws:iam::598075967016:policy/LambdasyncAPIGatewayLambdaInvokePolicy',
        Path: '/',
        DefaultVersionId: 'v1',
        AttachmentCount: 0,
        IsAttachable: true,
        CreateDate: 2016 - 09 - 19 T14: 02: 15.093 Z,
        UpdateDate: 2016 - 09 - 19 T14: 02: 15.093 Z
    }
}





IAM.createRole

{
    RoleName: 'LambdasyncApiRole',
    AssumeRolePolicyDocument: '{"Version":"2012-10-17","Statement":[{"Sid":"","Effect":"Allow","Principal":{"Service":"apigateway.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
}

{
    ResponseMetadata: {
        RequestId: '9bee5cef-7e72-11e6-9a3a-bf7b1425e59f'
    },
    Role: {
        Path: '/',
        RoleName: 'LambdasyncApiRole',
        RoleId: 'AROAIACNZ55UYIPN46X6Y',
        Arn: 'arn:aws:iam::598075967016:role/LambdasyncApiRole',
        CreateDate: 2016 - 09 - 19 T14: 08: 58.950 Z,
        AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22apigateway.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
    }
}





IAM.createPolicy

{
    PolicyName: 'LambdasyncAPIGatewayLambdaExecPolicy',
    PolicyDocument: '{"Version":"2012-10-17","Statement":[{"Action":["logs:*"],"Effect":"Allow","Resource":"arn:aws:logs:*:*:*"}]}  '
}

{
    ResponseMetadata: {
        RequestId: 'aec5f0f3-7e75-11e6-95e4-e18e5bcabb34'
    },
    Policy: {
        PolicyName: 'LambdasyncAPIGatewayLambdaExecPolicy',
        PolicyId: 'ANPAJD2EQQWD25CBMAXWU',
        Arn: 'arn:aws:iam::598075967016:policy/LambdasyncAPIGatewayLambdaExecPolicy',
        Path: '/',
        DefaultVersionId: 'v1',
        AttachmentCount: 0,
        IsAttachable: true,
        CreateDate: 2016 - 09 - 19 T14: 30: 59.031 Z,
        UpdateDate: 2016 - 09 - 19 T14: 30: 59.031 Z
    }
}


IAM.createRole

{
    RoleName: 'LambdasyncExecApiRole',
    AssumeRolePolicyDocument: '{"Version":"2012-10-17","Statement":[{"Sid":"","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
}

{
    ResponseMetadata: {
        RequestId: '7e56bbdb-7e77-11e6-8e5f-8be775b3b69a'
    },
    Role: {
        Path: '/',
        RoleName: 'LambdasyncExecApiRole',
        RoleId: 'AROAJBMGOYSUGOAHAOABA',
        Arn: 'arn:aws:iam::598075967016:role/LambdasyncExecApiRole',
        CreateDate: 2016 - 09 - 19 T14: 43: 56.748 Z,
        AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22lambda.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
    }
}
*/
