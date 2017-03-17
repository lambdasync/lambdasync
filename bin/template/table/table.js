'use strict';
/***************************************
**** LAMBDASYNC AUTO GENERATED FILE ****
***************************************/
const AWS = require("aws-sdk");
AWS.config.update({
  region: "{{region}}"
});
var docClient = new AWS.DynamoDB.DocumentClient();

function promiseWrapper(api, method, params) {
  return new Promise((resolve, reject) => {
    try {
      api[method](params, (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
    } catch (err) {
      return reject(err)
    }
  });
}

function tableWrapper(TableName) {
  return {
    get: params => promiseWrapper(docClient, 'get', {
      TableName,
      Key: params,
    }),
    put: params => promiseWrapper(docClient, 'put', {
      TableName,
      Item: params,
    }),
    update: (Key, params) => {
      // Make sure we have some input, since we will perform some magic here
      if (!Key || !params || Object.keys(Key).length < 1 || Object.keys(params).length < 1) {
        return Promise.reject(`${TableName}.update: Key and params are required input`);
      }

      // Protection from trying to update the primary key
      if (params && params.id) {
        delete params.id;
      }

      const keys = Object.keys(params);
      const paramPrefix = ':lsp';

      // Create an update expression based on params
      // Assuming that the keys are the same as the DynamoDB key
      const UpdateExpression = keys.reduce((acc, curr) => {
        return `${acc}${acc === 'set ' ? '' : ','} ${curr} = ${paramPrefix}${curr}`;
      }, 'set ');

      // Create a key/value mapper object that maps data from the params object
      // To prefixed keys you can use in the update expression
      const ExpressionAttributeValues = keys.reduce((acc, curr) => {
        return Object.assign(acc, {
          [`${paramPrefix}${curr}`]: params[curr]
        });
      }, {});

      return promiseWrapper(docClient, 'update', {
        TableName,
        Key,
        ExpressionAttributeValues,
        UpdateExpression,
        ReturnValues: 'UPDATED_NEW',
      });
    },
    delete: Key => promiseWrapper(docClient, 'delete', {
      TableName,
      Key,
    }),
  };
}

module.exports = {
  {{tables}}
};
