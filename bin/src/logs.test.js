'use strict';
global.console = {log: jest.fn()};
const {
  getRequestIdFromMessage,
  fetchLogs,
  logEvent
} = require('./logs');

const event1 = {
  timestamp: Date.now(),
  message: 'A message with no requestId'
};
const startEvent = {
  logStreamName: '2017/01/21/[$LATEST]6a61f07533954c51930bbbo2c41a9bd3',
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
});
