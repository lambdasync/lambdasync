'use strict';
const path = require('path');
jest.mock('fs');
const fs = require('fs');
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
  parseCommandArgs,
  functionExists,
  copyPackageJson,
  hashPackageDependencies
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
    const markdownPath = path.join(__dirname, '..', 'test', 'markdown.md');
    fs.__setMockFiles({
[markdownPath]: `# Markdown test
=====================================
Properties
=====================================
**First property**: \`{{firstProperty}}\`
**Second property**: \`{{secondProperty}}\`

## Next
\`\`\`
cd {{name}}
lambdasync
\`\`\`
`
    });
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

  describe('functionExists', () => {
    const validFunctions = ['foo', 'bar'];
    const mockApi = {
      getFunction: function getFunction({ FunctionName }, cb) {
        if (validFunctions.indexOf(FunctionName) !== -1) {
          return cb(null, FunctionName);
        }
        if (FunctionName === 'error') {
          return cb(new Error('Generic Error'));
        }
        return cb(new Error('ResourceNotFoundException'));
      },
    };

    it('should return true for existing functions', () => {
      expect.assertions(2);
      functionExists(mockApi, 'foo')
        .then(res => expect(res).toBe(true));
      functionExists(mockApi, 'bar')
        .then(res => expect(res).toBe(true));
    });
    it('should catch ResourceNotFoundExceptions and return false for non existant functions', () => {
      expect.assertions(1);
      functionExists(mockApi, 'baz')
        .then(res => expect(res).toBe(false));
    });
    it('should reject the promise on unknown errors', () => {
      expect.assertions(1);
      functionExists(mockApi, 'error')
        .catch(err => expect(err).toBeDefined());
    });
  });

  describe('copyPackageJson', () => {
    const SOURCE_DIR = path.join(__dirname, '..', 'test');
    const TARGET_DIR = path.join(__dirname, '..', 'test', 'new');

    it('Should move package.json from source file to target file', () => {
      const mockJson = JSON.stringify({ name: 'w00t', version: '0.0.1'});
      fs.__setMockFiles({
        [path.join(SOURCE_DIR, 'package.json')]: mockJson
      });
      copyPackageJson(SOURCE_DIR, TARGET_DIR);
      expect(fs.readFileSync(path.join(TARGET_DIR, 'package.json'))).toBe(mockJson);
    });

    it('Should replace fields in the JSON with props from the optional third argument', () => {
      const mockJson = JSON.stringify({ name: '{{name}}', version: '0.0.1'});
      const name = 'm00t';
      fs.__setMockFiles({
        [path.join(SOURCE_DIR, 'package.json')]: mockJson
      });
      copyPackageJson(SOURCE_DIR, TARGET_DIR, { name });
      expect(JSON.parse(fs.readFileSync(path.join(TARGET_DIR, 'package.json'))).name).toBe(name);
    })
  });

  describe('hashPackageDependencies', () => {
    const packageJson1 = { name: 'packageJson1', dependencies: { pony: '*', uniwhal: '1.0.0'}};
    const packageJson2 = { name: 'packageJson2', dependencies: { pony: '*', uniwhal: '1.0.0'}};
    const packageJson3 = { name: 'packageJson3', dependencies: { pony: '0.1.1', uniwhal: '1.0.0'}};
    it('creates the same hash given the same input', () => {
      expect(hashPackageDependencies(packageJson1)).toEqual(hashPackageDependencies(packageJson1));
    });

    it('creates the same hash given the input with the same dependencies', () => {
      expect(hashPackageDependencies(packageJson1)).toEqual(hashPackageDependencies(packageJson2));
    });

    it('creates different hashes given different dependencies', () => {
      expect(hashPackageDependencies(packageJson1)).not.toEqual(hashPackageDependencies(packageJson3));
    });
  })
});
