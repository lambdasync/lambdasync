const aws = require('./aws.js');
const {getSettings} = require('./settings.js');
const {awsPromise} = require('./util.js');

let AWS;

function getApi(settings, name) {
  AWS = AWS || aws(settings);
  return new AWS[name]();
}

function callApi(input) {
  const [apiName, method] = input.call.split('.');

  getSettings()
    .then(settings => {
      const api = getApi(settings, apiName);
      const params = input._.reduce((acc, current) => {
        const [key, valueKey] = current.split('=');
        acc[key] = settings[valueKey] || valueKey;
        return acc;
      }, {});

      return awsPromise(api, method, params);
    })
    .then(res => console.log('RESULT:\n\n', res))
    .catch(err => console.error('ERROR:\n\n', err));
}

module.exports = {
  callApi
};
