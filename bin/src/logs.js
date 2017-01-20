const chalk = require('chalk');

const aws = require('./aws.js');
const {getSettings} = require('./settings.js');
const {awsPromise, delay, formatTimestamp} = require('./util.js');

const LOG_DELAY = 500000;
const requestIdRe = /([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})/;

// When `lambdasync logs` is called set a start timestamp (Date.now()) and send it as startTime
// lambdasync -c CloudWatchLogs.filterLogEvents logGroupName='/aws/lambda/lambdasync-example-auth0' limit=5 startTime=1484903647667

function logs(settings) {
  const AWS = aws(settings);
  const api = new AWS.CloudWatchLogs();
  const logGroupName = `/aws/lambda/${settings.lambdaName}`;

  // Request logs from this timestamp
  // We will update this over time with the timestamp of the latest log item
  let startTime = Date.now() - (1000*60);

  fetchLogs({api, logGroupName, startTime})
    .then(res => {
      if (res && res.events) {
        res.events.forEach(logEvent);
      }
    })
    .catch(err => console.log(err));


}

function getRequestIdFromMessage(message) {
  if (!message || message.length < 1) {
    return null;
  }

  const scope = message.substring(0, 70);
  const res = requestIdRe.exec(scope);
  if (!res || !res[1]) {
    return null;
  }
  return res[1];
}

function fetchLogs({api, logGroupName, startTime}) {
  return awsPromise(api, 'filterLogEvents', {
    logGroupName, startTime
  });
}

function logEvent({timestamp, message}) {
  const time = formatTimestamp(timestamp);
  const requestId = chalk.yellow(getRequestIdFromMessage(message) || 'NO REQUESTID');
  let msg = `${time} ${requestId} - ${message}`;

  if (message.indexOf('START') === 0) {
    return console.log(chalk.cyan(msg));
  }

  if (message.indexOf('END') === 0) {
    return console.log(chalk.magenta(msg));
  }

  // Is this always where the interesting part always starts if it's not a START or END log?
  msg = `${time} ${requestId} - ${message.substring(62)}`;

  console.log(msg);
}

module.exports = logs;
