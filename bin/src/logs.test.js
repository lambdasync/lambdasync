'use strict';
global.console = {log: jest.fn()};
jest.mock('./util', () => ({
  awsPromise: jest.fn(() => Promise.resolve({
    events: [{
            logStreamName: '2017/01/21/[$LATEST]7n95f07533954c51930bbca2c41a9bd3',
            timestamp: 1484993296466,
            message: 'START RequestId: 8669517b-dfc1-11e6-9194-a91c00587ab1 Version: $LATEST\n',
            ingestionTime: 1484993296478,
            eventId: '33116457126014311680193517901450405742299596494768046080'
        },
        {
            logStreamName: '2017/01/21/[$LATEST]7n95f07533954c51930bbca2c41a9bd3',
            timestamp: 1484993296561,
            message: 'END RequestId: 8669517b-dfc1-11e6-9194-a91c00587ab1\n',
            ingestionTime: 1484993296575,
            eventId: '33116457128132882474053927100013434686184280818575802368'
        },
        {
            logStreamName: '2017/01/21/[$LATEST]7n95f07533954c51930bbca2c41a9bd3',
            timestamp: 1484993296561,
            message: 'REPORT RequestId: 8669517b-dfc1-11e6-9194-a91c00587ab1\tDuration: 58.20 ms\tBilled Duration: 100 ms \tMemory Size: 128 MB\tMax Memory Used: 29 MB\t\n',
            ingestionTime: 1484993296575,
            eventId: '33116457128132882474053927100013434686184280818575802369'
        }
    ],
    searchedLogStreams: [{
        logStreamName: '2017/01/21/[$LATEST]7n95f07533954c51930bbca2c41a9bd3',
        searchedCompletely: true
    }]
  })),
  formatTimestamp: jest.fn(() => '2017-01-01 12:00:00'),
  delay: jest.fn(() => () => Promise.reject())
}));
const util = require('./util');

let {
  getRequestIdFromMessage,
  fetchLogs,
  logEvent
} = require('./logs');

const event1 = {
  timestamp: Date.now(),
  message: 'A message with no requestId'
};
const startEvent = {
  logStreamName: '2017/01/21/[$LATEST]7n95f07533954c51930bbca2c41a9bd3',
  timestamp: 1484993309128,
  message: 'START RequestId: 8p581cde-dac1-17e6-862a-538093381d5d Version: $LATEST\n',
  ingestionTime: 1484993309156,
  eventId: '33116457478386347383988268034902617725768772214254993408'
};

describe('logs', () => {
  describe('logEvent', () => {
    it('will call console.log when given a full AWS log event', () => {
      logEvent(startEvent);
      expect(console.log).toHaveBeenCalled();
    });

    it('Will log short non standard messages unbroken', () => {
      logEvent(event1)
      expect(console.log.mock.calls[1][0]).toContain(event1.message);
    });
  });

  describe('getRequestIdFromMessage', () => {
    it('can pick out the requestId when present', () => {
      expect(getRequestIdFromMessage(startEvent.message)).toBe('8p581cde-dac1-17e6-862a-538093381d5d');
    });

    it('should return null on no message', () => {
      expect(getRequestIdFromMessage()).toBe(null);
    });

    it('should return null when no requestId is found', () => {
      expect(getRequestIdFromMessage(event1.message)).toBe(null);
    });
  });

  describe('fetchLogs', () => {
    it('will call awsPromise and delay', () => {
      fetchLogs({}, '/aws/lambda/name', Date.now());
      expect(util.awsPromise).toHaveBeenCalled();
      expect(util.delay).toHaveBeenCalled();
    });
  });
});
