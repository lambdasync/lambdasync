const path = require('path');

const aws = require('./aws');
const {awsPromise, logMessage, delay, mustacheLite} = require('./util');
const {readFile} = require('./file');
const {
  LAMBDASYNC_ROOT,
  LAMBDASYNC_EXEC_ROLE,
  LAMBDASYNC_INVOKE_POLICY,
  LAMBDASYNC_DYNAMODB_POLICY
} = require('./constants');
const {updateSettings, getSettings} = require('./settings');

function createDynamoDbTable(settings, tableName, attributes = {}) {
  const AWS = aws(settings);
  const api = new AWS.DynamoDB();

  if (!tableName || !attributes || attributes.length <= 0) {
    return Promise.reject('tableName and attributes are required input');
  }

  // The first key will be the primary key
  const primaryKey = Object.keys(attributes)[0];
  const KeySchema = {
    AttributeName: primaryKey,
    KeyType: 'HASH',
  };

  const AttributeDefinitions = Object.keys(attributes)
    .map(AttributeName => ({
      AttributeName,
      AttributeType: attributes[AttributeName],
    }));

  return awsPromise(api, 'createTable', {
    AttributeDefinitions,
    KeySchema,
    ProvisionedThroughput: {
      ReadCapacityUnits: 25, // Free tier limit
      WriteCapacityUnits: 25, // Free tier limit
    },
    TableName: tableName
  })
    .then(res => console.log('res', res));
}

function handleTableCommand(settings, tableName, attributes = {}) {
  console.log('handleTableCommand', tableName, attributes);
}

module.exports = {
  createDynamoDbTable,
  handleTableCommand,
};
