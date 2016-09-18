#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const init = require('./init.js');
const deploy = require('./deploy.js');
const {chainData, awsPromise} = require('./util.js');
const aws = require('./aws.js');
const {version} = require('../../package.json');
const {createApi, addResource, getResources, setupApiGateway} = require('./gateway');
const {setLambdaPermission} = require('./permission.js');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

function handleCommand(command) {
  if (command._[0] === 'init') {
    return init();
  }

  if (command.version) {
    console.log('lambdasync version: ' + version);
    return;
  }

  return getSettings()
    // .then(setLambdaPermission)
    // .then( res => console.log(res))
    // .catch( err => console.log(err) )

    // .then( settings => {
    //   console.log(settings);
    //   // arn:aws:lambda:eu-west-1:598075967016:function:ExampleApi:29
    //   // arn:aws:execute-api:eu-west-1:598075967016:ucx9t1wpxe/*/GET/api
    //   // arn:aws:lambda:eu-west-1:598075967016:function:t:24
    //   const AWS = aws(settings);
    //   // apigateway = new AWS.APIGateway();
    //   apigateway = new AWS.Lambda();
    //   return awsPromise(apigateway, 'getPolicy', {
    //     FunctionName: 'arn:aws:lambda:eu-west-1:598075967016:function:t3'
    //   })
    //     .then(res => console.log(res));
    // } )
    // .catch( err => console.log(err) )

    .then(chainData(deploy))
    .then(settings => {
      console.log('deploy complete', settings);
      return !settings.apiGatewayId ?
        setupApiGateway({name: 'testing47', description: 'A test api', path: 'api'}, settings) :
        null;
    })
    .then(getSettings)
    .then(setLambdaPermission);
}


handleCommand(command);
