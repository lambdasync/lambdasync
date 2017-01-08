const {
  promisedExec,
  mustacheLite,
  markdown,
  markdownProperty,
  addInputDefault,
  getProductionDeps,
  getProductionModules,
  awsPromise,
  stripLambdaVersion,
  makeLambdaPolicyArn,
  parseCommandArgs
} = require('./util');

describe('util', () => {
  describe('promisedExec', () => {
    it('should succeed with result', () => {
      promisedExec('ls')
        .then(res => expect(typeof res).toBe('string'));
    });

    it('should fail with error', () => {
      promisedExec('xcvgdfgfdggfdgdf')
        .catch(err => expect(typeof err).toBe('object'));
    });
  });

  describe('mustacheLite', () => {
    it('should replace matching params', () => {
      const result = mustacheLite(`Hello, {{you}}! My name is {{me}}!`, {you:'Foo', me: 'Bar'});
      expect(result).toBe(`Hello, Foo! My name is Bar!`);
    });

    it('should not replace unmatched params', () => {
      const result = mustacheLite(`Hello, {{you}}! My name is {{me}}!`, {me: 'Bar'});
      expect(result).toBe(`Hello, {{you}}! My name is Bar!`);
    });
  });

  describe('mustacheLite', () => {
    it('should replace matching params', () => {
      const result = mustacheLite(`Hello, {{you}}! My name is {{me}}!`, {you:'Foo', me: 'Bar'});
      expect(result).toMatchSnapshot();
    });

    it('should not replace unmatched params', () => {
      const result = mustacheLite(`Hello, {{you}}! My name is {{me}}!`, {me: 'Bar'});
      expect(result).toMatchSnapshot();
    });
  });

  describe('markdown', () => {
    it('should produce styled markdown output from string', () => {
      const result = markdown({
        templateString: `**Hello {{you}}!** My name is _{{me}}_`,
        data: {you:'Foo', me: 'Bar'}
      });
      expect(result).toMatchSnapshot();
    });

    it('should produce styled markdown output from path', () => {
      const result = markdown({
        templatePath: '../test/markdown.md',
        data: {firstProperty:'Foo', secondProperty: 'Bar', name: 'Baz'}
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('markdownProperty', () => {
    it('should produce markdown properties based on the input', () => {
      const result = markdownProperty(
        {
          key: 'you',
          label: 'You'
        },
        {you:'Foo', me: 'Bar'}
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('addInputDefault', () => {
    it('should add defaults to inquirer input', () => {
      const result = addInputDefault(
        {
          profileName: 'lambdasync',
          lambdaName: 'test'
        },
        { type: 'input', name: 'lambdaName', message: 'Function name' }
      );
      expect(result.default).toMatchSnapshot();
    });
  });

  describe('getProductionDeps', () => {
    it('should get a list of production dependencies', () => {
      getProductionDeps()
        .then(res => {
          expect(typeof res).toBe('object');
          expect(typeof res['aws-sdk']).toBe('object');
        });
    });
  });

  describe('getProductionModules', () => {
    it('should get a flat list of production dependencies', () => {
      getProductionModules()
        .then(res => {
          expect(Array.isArray(res)).toBe(true);
          expect(res.includes('uuid')).toBe(true);
        })
    });
  });

  describe('awsPromise', () => {
    const mockApi = {
      getFunctionConfiguration: (params, cb) => {
        if (params && params.FunctionName === 'test') {
          return cb(null, {id: 1});
        }
        return cb('Could not find function');
      }
    };
    it('should resolve with result', () => {
      awsPromise(mockApi, 'getFunctionConfiguration', {FunctionName: 'test'})
        .then(res => expect(res.id).toBe(1))
    });
    it('should reject on failure', () => {
      awsPromise(mockApi, 'getFunctionConfiguration', {FunctionName: 'unknown'})
        .catch(err => expect(err).toBe('Could not find function'))

      awsPromise(null, 'getFunctionConfiguration', {FunctionName: 'unknown'})
        .catch(err => expect(err).toBeTruthy())
    });
  });

  describe('stripLambdaVersion', () => {
    it('should remove :num from strings', () => {
      const res = stripLambdaVersion('some:String:123');
      expect(res).toBe('some:String');
    });
    it('should leave strings not ending in :num untouched', () => {
      const res = stripLambdaVersion('some random string ');
      expect(res).toBe('some random string ');
    });
  });

  describe('makeLambdaPolicyArn', () => {
    it('should make a policy ARN from FunctionArn and gateway id', () => {
      const res = makeLambdaPolicyArn({
        lambdaArn: 'arn:aws:lambda:eu-west-1:202020202020:function:test',
        apiGatewayId: '4ghl2mfk30'
      });
      expect(res).toMatchSnapshot();
    });
  });

  describe('parseCommandArgs', () => {
    it('should create an object with the arg array from CLI', () => {
      const res = parseCommandArgs([
        'timeout=10',
        'memory=128'
      ]);
      expect(res).toMatchSnapshot();
    });
  });
});
