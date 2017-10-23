const path = require('path');
const chainData = require('chain-promise-data');

const {jsonStringify} = require('./transform');
const aws = require('./aws');
const {
  awsPromise,
  logMessage,
  delay,
  mustacheLite,
  startWith,
  handleGenericFailure,
  npmInstall,
  markdown
} = require('./util');
const {readFile, writeFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY,
  LAMBDASYNC_SCALING_ROLE,
  TARGET_ROOT
} = require('./constants');
const {updateSettings, getSettings} = require('./settings');
const {
  setupDynamoDbTablePolicy,
  createAutoScalingRole,
  createAndAttachAutoScalingRolePolicy
} = require('./iam');

const ServiceNamespace = 'dynamodb';

function setupAutoScalingRole(settings) {
  return createAutoScalingRole(settings)
    .then(() => createAndAttachAutoScalingRolePolicy(settings))
    .catch(handleGenericFailure);
}

function getTableFromSettings(settings, tableName) {
  return settings && settings.dynamoDbTables.find(
    t => t.tableName === tableName);
}

function setupAutoScalingPolicy(settings, tableName) {
  const AWS = aws(settings);
  const api = new AWS.ApplicationAutoScaling();

  return registerScalableTarget(api, settings, tableName)
    .then(() => Promise.all([
      awsPromise(api, 'putScalingPolicy', {
        PolicyName: `DynamoDBReadCapacityUtilization:table/${tableName}`,
        PolicyType: 'TargetTrackingScaling',
        ResourceId: `table/${tableName}`,
        ScalableDimension: 'dynamodb:table:ReadCapacityUnits',
        ServiceNamespace,
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: 70.0, // Percent Limit of when to scale
          PredefinedMetricSpecification: {
            PredefinedMetricType: 'DynamoDBReadCapacityUtilization',
          }
        },
      }),
      awsPromise(api, 'putScalingPolicy', {
        PolicyName: `DynamoDBWriteCapacityUtilization:table/${tableName}`,
        PolicyType: 'TargetTrackingScaling',
        ResourceId: `table/${tableName}`,
        ScalableDimension: 'dynamodb:table:WriteCapacityUnits',
        ServiceNamespace,
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: 70.0, // Percent Limit of when to scale
          PredefinedMetricSpecification: {
            PredefinedMetricType: 'DynamoDBWriteCapacityUtilization',
          }
        },
      }),
    ]));
}

function addDynatableDependency() {
  const packageJsonPath = path.join(TARGET_ROOT, 'package.json');
  return readFile(packageJsonPath, JSON.parse)
    .then(packageJson => {
      if (!packageJson || !packageJson.dependencies || !packageJson.dependencies.dynatable) {
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies.dynatable = '0.0.7';

        return writeFile(packageJsonPath, packageJson, jsonStringify)
          .then(() => npmInstall())
          .then(() => packageJson);
      }

      return packageJson;
    });
}

function scaffoldTables(settings) {
  if (settings && settings.dynamoDbTables) {
    debugger;
    const tables = settings.dynamoDbTables.reduce((acc, table, i) => {
      if (i !== 0) {
        acc += '\n';
      }
      acc += `  ${table.tableName}: dynatable(docClient, '${table.tableName}', { id: 'N' }),`;
      return acc;
    }, '');

    readFile(path.join(LAMBDASYNC_ROOT, 'bin', 'template', 'tables.js'))
      .then(template => mustacheLite(template, { tables }))
      .then(tables => writeFile(path.join(TARGET_ROOT, 'tables.js'), tables));
  }
  return;
}

function registerScalableTarget(api, settings, tableName) {
  debugger;
  return Promise.all([
    awsPromise(api, 'registerScalableTarget', {
      MinCapacity: 5,
      MaxCapacity: 10000,
      ResourceId: `table/${tableName}`,
      RoleARN: `arn:aws:iam::${settings.accountId}:role/service-role/${LAMBDASYNC_SCALING_ROLE}`,
      ScalableDimension: 'dynamodb:table:ReadCapacityUnits',
      ServiceNamespace,
    }),
    awsPromise(api, 'registerScalableTarget', {
      MinCapacity: 5,
      MaxCapacity: 10000,
      ResourceId: `table/${tableName}`,
      RoleARN: `arn:aws:iam::${settings.accountId}:role/service-role/${LAMBDASYNC_SCALING_ROLE}`,
      ScalableDimension: 'dynamodb:table:WriteCapacityUnits',
      ServiceNamespace,
    })
  ]);
}

function createDynamoDbTable(settings, tableName) {
  if (!tableName) {
    return Promise.reject('You need to specify a table name');
  }

  const AWS = aws(settings);
  const api = new AWS.DynamoDB();

  return awsPromise(api, 'createTable', {
    AttributeDefinitions: [{
      AttributeName: 'id',
      AttributeType: 'N',
    }],
    KeySchema: [{
      AttributeName: 'id',
      KeyType: 'HASH',
    }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5, // Free tier limit
      WriteCapacityUnits: 5, // Free tier limit
    },
    TableName: tableName
  });
}

function handleTableCommand(settings, tableName) {
  return startWith({
    tableName
  })
    .then(chainData(
      () => createDynamoDbTable(settings, tableName),
      res => ({ tableArn: res.TableDescription.TableArn })
    ))
    .then(chainData(
      () => setupDynamoDbTablePolicy(settings, tableName),
      res => ({ policyArn: res.policyArn })
    ))
    .then(chainData(
      data => {
        let tables = settings.dynamoDbTables || [];
        tables.push(data);
        return updateSettings({
          dynamoDbTables: tables
        })
          .then(getSettings)
          // .then(setupAutoScalingRole) // TODO: Dynamically create this role
          // .then(getSettings)
          .then(settings => setupAutoScalingPolicy(settings, tableName))
      },
      () => ({}),
    ))
    .then(chainData(
      () => addDynatableDependency()
        .then(getSettings)
        .then(scaffoldTables),
      () => ({}),
    ))
    .then(data => console.log(markdown({
      templatePath: 'markdown/table-success.md',
      data
    })));
}

module.exports = {
  createDynamoDbTable,
  handleTableCommand,
};
