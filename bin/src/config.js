const aws = require('./aws.js');
const {awsPromise, parseCommandArgs, markdown, markdownProperty, mustacheLite} = require('./util.js');

function config(settings, args) {
  const argCount = Array.isArray(args) ? args.length : 0;

  const AWS = aws(settings);
  const api = new AWS.Lambda();
  const requestParams = {
    FunctionName: settings.lambdaArn
  };

  const nameMap = {
    description: 'Description',
    memory: 'MemorySize',
    timeout: 'Timeout'
  };

  function configToLambdaConfig(config, defaultValues = {}) {
    const lambdaValues = Object.keys(config).reduce((acc, key) => {
      const lambdaKey = nameMap[key];
      if (lambdaKey) {
        acc[lambdaKey] = config[key];
      }
      return acc;
    }, {});
    return Object.assign({}, defaultValues, lambdaValues);
  }

  // There are 2 things that could be happening
  // `lambdasync config` no args, print all config
  // `lambdasync config x=10 y=foo` set the x config to 10, y to 'foo'
  // (any keys without values will be ignored)
  // Regardless we first need the current config

  awsPromise(api, 'getFunctionConfiguration', requestParams)
    .then(currentConfig => {
      if (argCount === 0) {
        return console.log(markdown({
          templatePath: 'markdown/config.md',
          data: Object.assign({operation: 'config'}, currentConfig)
        }));
      }

      const parsedArgs = parseCommandArgs(args, settings);
      const newConfig = configToLambdaConfig(parsedArgs);
      awsPromise(api, 'updateFunctionConfiguration', Object.assign(
        {}, newConfig, requestParams
      ))
        .then(res => {
          console.log(markdown({
            templatePath: 'markdown/config.md',
            data: Object.assign({operation: 'successfully updated config'}, res)
          }));
        })
        .catch(err => console.log(err));


    })
    .catch(err => console.log(err));
}

function variable(settings, operation, args) {
  const argCount = Array.isArray(args) ? args.length : 0;

  console.log('variable', operation, args);

  const AWS = aws(settings);
  const api = new AWS.Lambda();
  const requestParams = {
    FunctionName: settings.lambdaArn
  };

  awsPromise(api, 'getFunctionConfiguration', requestParams)
    .then(currentConfig => {
      let vars = '';

      if (argCount === 0) {
        if (currentConfig && currentConfig.Environment && currentConfig.Environment.Variables) {
          vars = Object.keys(currentConfig.Environment.Variables).reduce((acc, key) => {
            acc += markdownProperty({
              key: currentConfig.Environment.Variables[key],
              label: key
            });
            return acc;
          }, '')
        }
        return console.log(markdown({
          templatePath: 'markdown/variable.md',
          data: { vars }
        }));
      }

      const parsedArgs = parseCommandArgs(args, settings);
      if (operation === 'set' && parsedArgs) {
        const env = currentConfig.Environment || {};
        env.Variables = env.Variables || {};
        Object.keys(parsedArgs).forEach(key => {
          env.Variables[key] = parsedArgs[key];
        });
        console.log(env);

        awsPromise(api, 'updateFunctionConfiguration', Object.assign(
          {}, requestParams, {
            Environment: env
          }
        ))
          .then(res => console.log(res))
          .catch(err => console.log(err));
      }
    })
    .catch(err => console.log(err));

}

module.exports = {
  config,
  variable
};
