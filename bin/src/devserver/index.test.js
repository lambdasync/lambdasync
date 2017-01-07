const request = require('supertest-as-promised');
const devserver = require('./index').setup;
const settingsMock = require('../../test/settings-mock.js');
const handlerMock = require('../../test/handler-mock.js');

describe('Devserver', () => {
  it('basic request', () => {
    const app = devserver(settingsMock.fullSettings, handlerMock.simpleSuccess);
    return request(app).get('/')
    .expect(200)
    .then((res) => {
      expect(typeof res.body).toBe('string');
      expect(res.body).toBe('Everything is awesome!');
    });
  });
});
