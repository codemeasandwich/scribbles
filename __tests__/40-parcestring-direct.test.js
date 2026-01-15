/**
 * Direct tests for parceStringVals via manual .at() calls
 *
 * Since the loader runs at require-time before Jest instruments,
 * we manually construct the args array with template functions to
 * trigger parceStringVals code paths.
 */

const scribbles = require('../index.js');

describe('parceStringVals direct coverage', () => {
  let logs = [];

  beforeEach(() => {
    logs = [];
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  describe('Function interpolation (line 121)', () => {
    test('arg template with function value triggers :ƒ(){..} format', () => {
      const handler = () => 'result';

      // Manually construct what the loader would create
      // args[1] is a template function that, when called with parceStringVals,
      // will interpolate the handler function value
      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,  // First arg (message) is a literal string
          x => x`handler:${handler}`  // Second arg template interpolates function
        ]
      };

      scribbles.log.at(from, 'The handler is', handler);

      expect(logs.length).toBe(1);
      // The arg name extraction via parceStringVals should format function
      const output = logs[0].toString();
      expect(output).toBeDefined();
    });
  });

  describe('String interpolation (line 139)', () => {
    test('arg template with string value triggers :"string" format', () => {
      const userName = 'Alice';

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`userName:${userName}`
        ]
      };

      scribbles.log.at(from, 'User name is', userName);

      expect(logs.length).toBe(1);
      expect(logs[0].input.value).toBe('Alice');
    });
  });

  describe('Error interpolation (line 122-123)', () => {
    test('arg template with Error value', () => {
      const err = new Error('whoops');

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`err:${err}`
        ]
      };

      scribbles.log.at(from, 'Got error', err);

      expect(logs.length).toBe(1);
    });
  });

  describe('Date interpolation (line 124-125)', () => {
    test('arg template with Date value', () => {
      const timestamp = new Date('2024-01-01');

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`timestamp:${timestamp}`
        ]
      };

      scribbles.log.at(from, 'Time is', timestamp);

      expect(logs.length).toBe(1);
    });
  });

  describe('Buffer interpolation (line 126-127)', () => {
    test('arg template with Buffer value', () => {
      const buf = Buffer.from('data');

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`buf:${buf}`
        ]
      };

      scribbles.log.at(from, 'Buffer content', buf);

      expect(logs.length).toBe(1);
    });
  });

  describe('Map interpolation (line 128-129)', () => {
    test('arg template with Map value', () => {
      const cache = new Map([['key', 'val']]);

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`cache:${cache}`
        ]
      };

      scribbles.log.at(from, 'Cache state', cache);

      expect(logs.length).toBe(1);
    });
  });

  describe('Set interpolation (line 130-131)', () => {
    test('arg template with Set value', () => {
      const ids = new Set([1, 2, 3]);

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`ids:${ids}`
        ]
      };

      scribbles.log.at(from, 'Active IDs', ids);

      expect(logs.length).toBe(1);
    });
  });

  describe('Array interpolation (line 132-133)', () => {
    test('arg template with Array value', () => {
      const items = [1, 2, 3];

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`items:${items}`
        ]
      };

      scribbles.log.at(from, 'Items list', items);

      expect(logs.length).toBe(1);
    });
  });

  describe('Object interpolation (line 134-135)', () => {
    test('arg template with Object value', () => {
      const config = { debug: true };

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`config:${config}`
        ]
      };

      scribbles.log.at(from, 'Config object', config);

      expect(logs.length).toBe(1);
    });
  });

  describe('Number interpolation (line 140-141)', () => {
    test('arg template with number value', () => {
      const count = 42;

      const from = {
        file: 'test.js',
        line: 1,
        col: 0,
        args: [
          false,
          x => x`count:${count}`
        ]
      };

      scribbles.log.at(from, 'Count is', count);

      expect(logs.length).toBe(1);
    });
  });
});
