/**
 * E2E Tests: Real User Scenarios for Final Coverage
 *
 * Each test simulates what a developer would actually do in their project.
 */

const scribbles = require('../index.js');

describe('User Scenario: Logging Symbol values', () => {
  // Scenario: A developer wants to log a Symbol for debugging
  // This is common when working with Symbol-keyed properties or iterators

  let logs = [];

  beforeEach(() => {
    logs = [];
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  test('developer logs a Symbol to debug symbol-keyed properties', () => {
    const mySymbol = Symbol('userAction');

    // Developer wants to see what symbol they're working with
    scribbles.log(mySymbol);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    expect(output).toContain('Symbol(userAction)');
  });

  test('developer logs a Symbol as the message with metadata', () => {
    const actionSymbol = Symbol('click');

    // Using Symbol directly as the message arg via .at()
    const from = { file: 'test.js', line: 1, col: 0, args: [] };
    scribbles.log.at(from, actionSymbol);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    expect(output).toContain('Symbol(click)');
  });
});

describe('User Scenario: Logging Date values', () => {
  // Scenario: A developer logs timestamps to debug timing issues

  let logs = [];

  beforeEach(() => {
    logs = [];
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  test('developer logs a Date to track when an event occurred', () => {
    const eventTime = new Date('2024-01-15T10:30:00.000Z');

    // Developer debugging: "When did this user sign up?"
    scribbles.log("User signup time", eventTime);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    // Should see Date formatted
    expect(output).toContain('2024-01-15');
  });

  test('developer logs Date as value argument through .at()', () => {
    const createdAt = new Date('2024-06-20T14:00:00.000Z');

    // This triggers the Date branch in value handling (line 292-293)
    const from = { file: 'test.js', line: 1, col: 0, args: [] };
    scribbles.log.at(from, "Record created", createdAt);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    expect(output).toContain('2024-06-20');
  });
});

describe('User Scenario: Dev mode pretty printing', () => {
  // Scenario: Developer runs app locally in dev mode and expects
  // nice formatting for object output without manual config

  let logs = [];
  let originalConfig;

  beforeEach(() => {
    logs = [];
    originalConfig = { ...scribbles.config() };
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  afterEach(() => {
    // Reset config
    scribbles.config({ mode: originalConfig.mode });
  });

  test('developer in dev mode gets auto pretty printing', () => {
    // Developer sets mode to dev expecting nice output
    // First clear pretty so defaults kick in
    scribbles.config({
      mode: 'dev',
      pretty: { inlineCharacterLimit: undefined, indent: undefined }
    });

    const userData = { name: 'Bob', email: 'bob@example.com' };
    scribbles.log("User data", userData);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    expect(output).toContain('Bob');
  });
});

describe('User Scenario: Invalid regex filter handling', () => {
  // Scenario: Developer accidentally configures an invalid regex pattern
  // The system should handle gracefully without crashing

  test('developer sets malformed regex filter - system handles gracefully', () => {
    // Developer tries to filter logs but makes a typo in regex
    // This triggers the catch block in isValidRegexString (line 680)

    // The isValidRegexString function should return false for invalid regex
    // and not throw an error
    expect(() => {
      scribbles.config({ filter: '/[invalid/' });
    }).not.toThrow();
  });

  test('developer uses valid regex filter', () => {
    // For comparison - valid regex should work
    expect(() => {
      scribbles.config({ filter: '/error/i' });
    }).not.toThrow();
  });
});

describe('User Scenario: Argument name prefixing with loader', () => {
  // Scenario: Developer uses scribbles with webpack loader
  // The loader extracts variable names and prefixes them to output

  let logs = [];

  beforeEach(() => {
    logs = [];
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  test('loader-processed code prefixes arg name to message', () => {
    // Simulates what happens when the loader transforms:
    // const errorMessage = "Connection failed";
    // scribbles.log(errorMessage);
    //
    // Into:
    // scribbles.log.at({...args:[x=>x`errorMessage:${errorMessage}`]}, errorMessage)

    const errorMessage = "Connection failed";

    // args should be functions that return the arg name when called with parceStringVals
    const from = {
      file: 'app.js',
      line: 42,
      col: 0,
      args: [x => x`errorMessage:${errorMessage}`]  // This is how loader encodes arg names
    };

    // This triggers line 275: argNames[0] + ":" + outputMessage
    scribbles.log.at(from, errorMessage);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    // The variable name should be prefixed
    expect(output).toContain('errorMessage');
    expect(output).toContain('Connection failed');
  });

  test('loader with message and value args', () => {
    const status = "active";
    const userId = 12345;

    // When there are two args, first is message, second is value
    const from = {
      file: 'app.js',
      line: 50,
      col: 0,
      args: [
        x => x`status:${status}`,
        x => x`userId:${userId}`
      ]
    };

    scribbles.log.at(from, status, userId);

    expect(logs.length).toBe(1);
    const output = logs[0].toString();
    expect(output).toContain('12345');
  });
});
