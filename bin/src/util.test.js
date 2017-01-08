const {
  promisedExec,
  mustacheLite,
  markdown,
  markdownProperty,
  addInputDefault
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
});
