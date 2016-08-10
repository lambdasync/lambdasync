const AWS = require('aws-sdk');

function configureAws(settings) {
  const credentials = new AWS.SharedIniFileCredentials({profile: settings.profileName});
  AWS.config.credentials = credentials;
  AWS.config.region = settings.region;
  return AWS;
}

module.exports = configureAws;
