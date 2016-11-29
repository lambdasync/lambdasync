const aws = require('./aws.js');
const {awsPromise, parseCommandArgs, markdown} = require('./util.js');

function config(settings, args) {
  const argCount = Array.isArray(args) ? args.length : 0;

  const AWS = aws(settings);
  const api = new AWS.Lambda();
  const requestParams = {
    FunctionName: settings.lambdaArn
  };

  function configToLambdaConfig(config, defaultValues = {}) {
    let values = defaultValues;

  }

  // There are 2 things that could be happening
  // `lambdasync config` no args, print all config
  // `lambdasync config x=10 y=foo` set the x config to 10, y to 'foo'
  // (any keys without values will be ignored)
  // Regardless we first need the current config

  awsPromise(api, 'getFunctionConfiguration', requestParams)
    .then(currentConfig => {
      if (argCount === 0) {
        console.log(markdown({
          templatePath: 'markdown/config.md',
          data: currentConfig
        }));
      }

      const parsedArgs = parseCommandArgs(args, settings);
      console.log('parsedArgs', parsedArgs);


    })
    .catch(err => console.log(err));
}

module.exports = config;
