const path = require('path');
const chainData = require('chain-promise-data');

const aws = require('./aws');
const {awsPromise, logMessage, delay, mustacheLite, startWith} = require('./util');
const {readFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY,
  LAMBDASYNC_SCALING_ROLE,
  LAMBDASYNC_SCALING_POLICY
} = require('./constants');
const {updateSettings, getSettings} = require('./settings');

const invokePolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'invoke-policy.json');
const trustPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'trust-policy.json');
const dynamodbPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'dynamodb-policy.json');
const scalingRolePolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'DynamoDBAutoscaleRole.json');
const scalingPolicyPath = path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'DynamoDBAutoscalePolicy.json');

let api;
function getApi(settings) {
  if (!api) {
    const AWS = aws(settings);
    api = new AWS.IAM();
  }
  return api;
}

function setupInvokePolicy(settings) {
  return createAndAttachPolicy(
    settings,
    LAMBDASYNC_EXEC_ROLE,
    LAMBDASYNC_INVOKE_POLICY,
    invokePolicyPath
  );
}

function createDynamoDbPolicy(settings, tableName) {
  const api = getApi(settings);

  const { region, accountId } = settings;

  function transform(content) {
    const template = mustacheLite(content, {
      region,
      accountId,
      tableName
    });

    return JSON.parse(template);
  }

  return getPolicyOr(false, settings, `arn:aws:iam::${accountId}:policy/${LAMBDASYNC_DYNAMODB_POLICY}-${tableName}`)
    .then(policyArn => {
      // Policy already exists
      if (policyArn) {
        return { policyArn };
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
  const api = getApi(settings);

  return awsPromise(api, 'getUser')
    .then(res => updateSettings({
      accountId: pickAccountIdFromArn(res.User.Arn)
    }))
    .catch(err => console.log(err));
}

function checkForExistingRoles(settings) {
  const api = getApi(settings);
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

// Returns false or
function getRoleOr(defaultValue, settings, RoleName) {
  const api = getApi(settings);

  return awsPromise(api, 'getRole', {
    RoleName
  })
    .then(res => res.Role.Arn)
    .catch(err => {
      if (err && err.code === 'NoSuchEntity') {
        // Catch the case of a missing role
        return defaultValue;
      } else {
        throw err;
      }
    });
}

function getPolicyOr(defaultValue, settings, PolicyArn) {
  const api = getApi(settings);

  // If PolicyArn is not already an ARN, construct it
  if (PolicyArn.indexOf('arn:') !== 0) {
    PolicyArn = `arn:aws:iam::${settings.accountId}:policy/${PolicyArn}`;
  }

  return awsPromise(api, 'getPolicy', {
    PolicyArn
  })
    .then(res => res.Policy.Arn)
    .catch(err => {
      if (err && err.code === 'NoSuchEntity') {
        // Catch the case of a missing role
        return defaultValue;
      } else {
        throw err;
      }
    });
}

function createPolicy(settings, PolicyName, policyPath) {
  const api = getApi(settings);

  return getPolicyOr(false, settings, PolicyName)
    .then(policyArn => {
      if (!policyArn) {
        return readFile(policyPath, JSON.parse)
          .then(policy => awsPromise(api, 'createPolicy', {
            PolicyName,
            PolicyDocument: JSON.stringify(policy)
          }))
          .then(res => res.Policy.Arn);
      }
      return policyArn;
    })
}

function attachPolicy(settings, RoleName, PolicyArn) {
  const api = getApi(settings);

  return awsPromise(api, 'attachRolePolicy', {
    RoleName,
    PolicyArn
  });
}

function createAndAttachPolicy(settings, RoleName, PolicyName, policyPath) {
  const api = getApi(settings);

  return startWith({})
    .then(chainData(
      () => createPolicy(settings, PolicyName, policyPath),
      PolicyArn => ({ PolicyArn })
    ))
    .then(chainData(
      ({ PolicyArn }) => attachPolicy(settings, RoleName, PolicyArn),
      () => ({})
    ))
    .catch(err => console.log('createAndAttachPolicy ERR', err));
}

function createRole(settings, RoleName, policyPath) {
  const api = getApi(settings);

  return getRoleOr(false, settings, RoleName)
    .then(roleArn => {
      // Create role only if it doesn't exist
      if (!roleArn) {
        return readFile(policyPath, JSON.parse)
          .then(policy => awsPromise(api, 'createRole', {
            RoleName,
            AssumeRolePolicyDocument: JSON.stringify(policy)
          }))
          .then(res => res.Role.Arn);
      }
      return roleArn;
    });
}

function createExecRole(settings) {
  return createRole(settings, LAMBDASYNC_EXEC_ROLE, trustPolicyPath)
    .then(lambdaRole => updateSettings({
      lambdaRole
    }));
}

function createAutoScalingRole(settings) {
  return createRole(settings, LAMBDASYNC_SCALING_ROLE, scalingRolePolicyPath);
}

function createAndAttachAutoScalingRolePolicy(settings) {
  return createAndAttachPolicy(
    settings,
    LAMBDASYNC_SCALING_ROLE,
    LAMBDASYNC_SCALING_POLICY,
    scalingPolicyPath
  );
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
      return createExecRole(settings)
        .then(setupInvokePolicy)
        .then(logMessage('Delaying for 5 seconds so that AWS has time to index the new Role'))
        .then(delay(5000));
    });
}

function setupDynamoDbTablePolicy(settings, tableName) {
  return startWith({
    tableName
  })
    .then(chainData(() => createDynamoDbPolicy(settings, tableName)))
    .then(chainData(({policyArn}) => attachPolicy(settings, LAMBDASYNC_EXEC_ROLE, policyArn)));
}

module.exports = {
  getAccountId,
  makeLambdaRole,
  setupDynamoDbTablePolicy,
  createAutoScalingRole,
  createAndAttachAutoScalingRolePolicy
};
