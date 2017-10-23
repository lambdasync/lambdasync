const path = require('path');
const chainData = require('chain-promise-data');

const aws = require('./aws');
const {
  awsPromise,
  logMessage,
  delay,
  mustacheLite,
  startWith,
  handleGenericFailure
} = require('./util');
const {readFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY,
  LAMBDASYNC_SCALING_ROLE
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
  debugger;

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
    .then(data => {
      debugger;
      let tables = settings.dynamoDbTables || [];
      tables.push(data);
      return updateSettings({
        dynamoDbTables: tables
      })
        .then(getSettings)
        // .then(setupAutoScalingRole) // TODO: Dynamically create this role
        // .then(getSettings)
        .then(settings => setupAutoScalingPolicy(settings, tableName))
        .then(() => data);
    });
}

module.exports = {
  createDynamoDbTable,
  handleTableCommand,
};
