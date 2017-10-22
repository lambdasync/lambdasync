const path = require('path');
const chainData = require('chain-promise-data');

const aws = require('./aws');
const {awsPromise, logMessage, delay, mustacheLite, startWith} = require('./util');
const {readFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY
} = require('./constants');
const {updateSettings, getSettings} = require('./settings');
const {setupDynamoDbTablePolicy} = require('./iam');

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
      let tables = settings.dynamoDbTables || [];
      tables.push(data);
      return updateSettings({
        dynamoDbTables: tables
      })
        .then(() => data);
    });
}

module.exports = {
  createDynamoDbTable,
  handleTableCommand,
};
