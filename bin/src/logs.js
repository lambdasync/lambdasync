const chalk = require('chalk');

const aws = require('./aws');
const {getSettings} = require('./settings');
const {awsPromise, delay, formatTimestamp} = require('./util');

const LOG_DELAY = 5000;
const requestIdRe = /([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})/;

// When `lambdasync logs` is called set a start timestamp (Date.now()) and send it as startTime
// lambdasync -c CloudWatchLogs.filterLogEvents logGroupName='/aws/lambda/lambdasync-example-auth0' limit=5 startTime=1484903647667

function logs(settings) {
  const AWS = aws(settings);
  const api = new AWS.CloudWatchLogs();
  const logGroupName = `/aws/lambda/${settings.lambdaName}`;

  // Request logs from this timestamp
  // We will update this over time with the timestamp of the latest log item
  let startTime = Date.now();

  fetchLogs({api, logGroupName, startTime});
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
  })
    .then(res => {
      if (res && res.events && res.events.length > 0) {
        startTime = res.events[res.events.length - 1].timestamp + 1;
        return res.events.forEach(logEvent);
      }
    })
    .then(delay(LOG_DELAY))
    .then(() => fetchLogs({api, logGroupName, startTime}))
    .catch(err => console.log(err));
}

function logEvent({timestamp, message}) {
  const time = formatTimestamp(timestamp);
  const requestId = chalk.yellow(getRequestIdFromMessage(message) || 'NO REQUESTID');
  let msg = `${time} ${requestId} - ${message}`;

  if (message.indexOf('START') === 0) {
    var str = chalk.cyan(msg);
    return console.log(chalk.cyan(msg));
  }

  if (message.indexOf('END') === 0 || message.indexOf('REPORT') === 0) {
    return console.log(chalk.magenta(msg));
  }

  // Is this always where the interesting part always starts if it's not a START/END/REPORT log?
  const cutOff = 62;
  if (message.length > cutOff) {
    msg = `${time} ${requestId} - ${message.substring(62)}`;
  } else {
    msg = `${time} ${requestId} - ${message}`;
  }

  console.log(msg);
}

exports = module.exports = {};
exports.logs = logs;
if (process.env.NODE_ENV === 'test') {
  exports.getRequestIdFromMessage = getRequestIdFromMessage;
  exports.fetchLogs = fetchLogs;
  exports.logEvent = logEvent;
}
