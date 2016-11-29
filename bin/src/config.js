const aws = require('./aws.js');
const {awsPromise} = require('./util.js');

function config(settings, args) {
  const argCount = Array.isArray(args) ? args.length : 0;

  const AWS = aws(settings);
  const api = new AWS.Lambda();

  // No args, just print all config
  if (argCount === 0) {
    awsPromise(api, 'getFunctionConfiguration', {
      FunctionName: settings.lambdaArn
    })
      .then(res => console.log(res))
      .catch(err => console.log(err));
  }

  // One arg, we'll try to show one specific piece of config
  if (argCount === 1) {
    awsPromise(api, 'getFunctionConfiguration', {
      FunctionName: settings.lambdaArn
    })
      .then(res => {
        console.log(res[args[0]]);
      })
      .catch(err => console.log(err));
  }


  console.log(args);
}

module.exports = config;
