'use strict';
global.console = {log: jest.fn()};
const {
  getRequestIdFromMessage,
  fetchLogs,
  logEvent
} = require('./logs');

describe('logs', () => {
  describe('logEvent', () => {
    const event1 = {
      timestamp: Date.now(),
      message: 'A message with no requestId'
    };
    const startEvent = {
      logStreamName: '2017/01/21/[$LATEST]6a61f07533954c51930bbbo2c41a9bd3',
      timestamp: 1484993309128,
      message: 'START RequestId: 8p581cde-dac1-17e6-862a-538093381d5d Version: $LATEST\n',
      ingestionTime: 1484993309156,
      eventId: '33116457408386347383988268134902617725768772214254993408'
    };

    it('will call console.log when given a full AWS log event', () => {
      logEvent(startEvent);
      expect(console.log).toHaveBeenCalled();
    });

    it('Will log short non standard messages unbroken', () => {
      logEvent(event1)
      expect(console.log.mock.calls[1][0]).toContain(event1.message);
    });

  });
});
