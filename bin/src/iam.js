const path = require('path');

const aws = require('./aws');
const {awsPromise, logMessage, delay, mustacheLite, chainData, startWith} = require('./util');
const {readFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY
} = require('./constants');
const {updateSettings, getSettings} = require('./settings');

const invokePolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'invoke-policy.json');
const trustPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'trust-policy.json');
const dynamodbPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'dynamodb-policy.json');

function createPolicy(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return readFile(invokePolicyPath, JSON.parse)
    .then(policy => awsPromise(api, 'createPolicy', {
      PolicyName: LAMBDASYNC_INVOKE_POLICY,
      PolicyDocument: JSON.stringify(policy)
    }))
    .then(res => updateSettings({
      lambdaPolicy: res.Policy.Arn
    }));
}

function createDynamoDbPolicy(settings, tableName) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  const { region, accountId } = settings;

  function transform(content) {
    const template = mustacheLite(content, {
      region,
      accountId,
      tableName
    });

    return JSON.parse(template);
  }

  return checkForExistingPolicy(settings, `arn:aws:iam::${accountId}:policy/${LAMBDASYNC_DYNAMODB_POLICY}-${tableName}`)
    .then(res => {
      // Policy already exists
      if (res.Arn) {
        return res.Arn;
      }

      return readFile(dynamodbPolicyPath, transform)
        .then(policy => awsPromise(api, 'createPolicy', {
          PolicyName: `${LAMBDASYNC_DYNAMODB_POLICY}-${tableName}`,
          PolicyDocument: JSON.stringify(policy)
        }))
        .then(res => ({ policyArn: res.Policy.Arn }));
    });
}

function pickAccountIdFromArn(arn) {
  const re = /:([0-9]*?):user/;
  const match = re.exec(arn);
  return match[1];
}

function getAccountId(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return awsPromise(api, 'getUser')
    .then(res => updateSettings({
      accountId: pickAccountIdFromArn(res.User.Arn)
    }))
    .catch(err => console.log(err));
}

function checkForExistingRoles(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();
  return awsPromise(api, 'getRole', {
    RoleName: LAMBDASYNC_EXEC_ROLE
  })
    .then(res => updateSettings({
      lambdaRole: res.Role.Arn
    }))
    .then(() => awsPromise(api, 'getPolicy', {
      PolicyArn: `arn:aws:iam::${settings.accountId}:policy/${LAMBDASYNC_INVOKE_POLICY}`
    }))
    .then(res => updateSettings({
      lambdaPolicy: res.Policy.Arn
    }))
    .then(getSettings)
    .catch(() => settings);
}

function checkForExistingPolicy(settings, policyArn) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return awsPromise(api, 'getPolicy', {
    PolicyArn: policyArn
  })
    .catch(() => ({}));
}

function attachPolicy(settings, policyName) {
  const AWS = aws(settings);
  const api = new AWS.IAM();
  const {lambdaRole, lambdaPolicy} = settings;

  return awsPromise(api, 'attachRolePolicy', {
    RoleName: getRoleNameFromArn(lambdaRole),
    PolicyArn: policyName || lambdaPolicy
  })
    .then(() => settings);
}

function createRole(settings) {
  const AWS = aws(settings);
  const api = new AWS.IAM();

  return readFile(trustPolicyPath, JSON.parse)
    .then(policy => awsPromise(api, 'createRole', {
      RoleName: LAMBDASYNC_EXEC_ROLE,
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
  if (settings && settings.lambdaRole) {
    return settings;
  }
  return checkForExistingRoles(settings)
    .then(settings => {
      if (settings.lambdaRole) {
        return settings;
      }
      return createRole(settings)
        .then(createPolicy)
        .then(attachPolicy)
        .then(logMessage('Delaying for 5 seconds so that AWS has time to index the new Role'))
        .then(delay(5000));
    });
}

function setupDynamoDbTablePolicy(settings, tableName) {
  return startWith({
    tableName
  })
    .then(chainData(() => createDynamoDbPolicy(settings, tableName)))
    .then(chainData(({policyArn}) => attachPolicy(settings, policyArn)));
}

module.exports = {
  getAccountId,
  makeLambdaRole,
  setupDynamoDbTablePolicy
};
