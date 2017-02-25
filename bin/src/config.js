const aws = require('./aws');
const {
  awsPromise,
  handleGenericFailure,
  markdown,
  mustacheLite,
  parseCommandArgs
} = require('./util');

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
        .catch(handleGenericFailure);
    })
    .catch(handleGenericFailure);
}

function variable(settings, operation, args) {
  const argCount = Array.isArray(args) ? args.length : 0;
  const validOperations = ['set', 'remove'];
  const op = (typeof operation === 'string') ?
    operation.toLowerCase() : '';

  const AWS = aws(settings);
  const api = new AWS.Lambda();
  const requestParams = {
    FunctionName: settings.lambdaArn
  };

  awsPromise(api, 'getFunctionConfiguration', requestParams)
    .then(currentConfig => {
      let vars = '';

      // If we don't have any arguments, or a valid operation print out the
      // current secrets and the manual
      if (argCount === 0 || !validOperations.includes(op)) {
        if (currentConfig && currentConfig.Environment && currentConfig.Environment.Variables) {
          vars = Object.keys(currentConfig.Environment.Variables).reduce((acc, key) => {
            return acc + '**Secret key:** `' + key + '`\n';
          }, '');
        }
        return console.log(markdown({
          templatePath: 'markdown/secret.md',
          data: {vars}
        }));
      }

      const parsedArgs = parseCommandArgs(args, settings);
      const env = currentConfig.Environment || {};
      env.Variables = env.Variables || {};

      if (op === 'set') {
        Object.keys(parsedArgs).forEach(key => {
          env.Variables[key] = parsedArgs[key];
        });

        return awsPromise(api, 'updateFunctionConfiguration', Object.assign(
          {}, requestParams, {
            Environment: env
          }
        ))
          .then(() => {
            const templateString = makeSecretMarkdown(
              Object.keys(parsedArgs), '## {{secretWord}} successfully set', 'Secret key'
            );
            console.log(markdown({
              templateString
            }));
          });
      } else if (op === 'remove') {
        // Keep track of removals so we can tell the user
        const removed = [];
        const notFound = [];

        args.forEach(key => {
          if (env.Variables[key]) {
            removed.push(key);
            delete env.Variables[key];
          } else {
            notFound.push(key);
          }
        });

        // Only do an API call here if we have something to change
        if (removed) {
          awsPromise(api, 'updateFunctionConfiguration', Object.assign(
            {}, requestParams, {
              Environment: env
            }
          ))
            .then(() => {
              // Let's build some markdown!
              let templateString = '';
              if (removed.length > 0) {
                templateString += makeSecretMarkdown(
                  removed, '## {{secretWord}} successfully removed', 'Secret key'
                );
                templateString += '\n\n';
              }

              if (notFound.length > 0) {
                templateString += makeSecretMarkdown(
                  notFound, '## failed to remove {{secretWord}}', 'Couldn\'t find'
                );
              }

              console.log(markdown({
                templateString
              }));
            });
        }
      }
    })
    .catch(() => console.log(markdown({
      templatePath: 'markdown/secret-with-no-function.md'
    })));
}

function makeSecretMarkdown(list, heading, label) {
  let str = '';
  const secretWord = list.length === 1 ? 'secret' : 'secrets';
  str += mustacheLite(heading, {secretWord}) + '\n';

  list.forEach(key => {
    str += '**' + label + ':** `' + key + '`\n';
  });
  return str;
}

module.exports = {
  config,
  variable
};
