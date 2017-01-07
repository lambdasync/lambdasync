const request = require('supertest-as-promised');
const devserver = require('./index').setup;
const settingsMock = require('../../test/settings-mock.js');
const handlerMock = require('../../test/handler-mock.js');

describe('Devserver', () => {
  it('can handle context.succeed', () => {
    const app = devserver(settingsMock.fullSettings, handlerMock.contextSucceed);
    return request(app).get('/')
      .expect(200)
      .then((res) => {
        expect(typeof res.body).toBe('string');
        expect(res.body).toBe('Everything is awesome!');
      });
  });

  it('can handle context.fail', () => {
    const app = devserver(settingsMock.fullSettings, handlerMock.contextFail);
    return request(app).get('/')
      .expect(404)
      .then((res) => {
        expect(typeof res.body).toBe('string');
        expect(res.body).toBe('Oops! Not found.');
      });
  });

  it('can handle context.done', () => {
    const app = devserver(settingsMock.fullSettings, handlerMock.contextDone);
    return request(app).get('/')
      .expect(500)
      .then((res) => {
        expect(typeof res.body).toBe('object');
        expect(res.body.error).toBe('This test failed.');
      });
  });

  it('can handle callbacks', () => {
    const app = devserver(settingsMock.fullSettings, handlerMock.callback);
    return request(app).get('/')
      .expect(200)
      .then((res) => {
        expect(typeof res.body).toBe('string');
        expect(res.body).toBe('Everything is awesome!');
      });
  });
});
