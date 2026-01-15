/**
 * Tests for remaining uncovered lines
 *
 * These are edge cases that are hard to trigger through normal user flows
 */

const scribbles = require('../index.js');

describe('Remaining Coverage - Edge Cases', () => {
  let logs = [];

  beforeEach(() => {
    logs = [];
    scribbles.config({
      stdOut: null,
      dataOut: (data) => logs.push(data),
      logLevel: 'debug'
    });
  });

  describe('Invalid regex in headers config (line 680)', () => {
    test('invalid regex pattern in headers config is handled gracefully', (done) => {
      // User scenario: Developer configures headers with a typo in regex
      // Pattern /[/ looks like a regex but [ is unclosed - throws on construction
      // The isValidRegex function should catch this and return false

      // Configure with invalid regex in headers
      scribbles.config({
        headers: '/[/'  // Invalid regex - unclosed bracket
      });

      // Create mock request/response
      const req = {
        headers: {
          'x-request-id': '12345',
          'content-type': 'application/json'
        },
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res = {};
      const next = () => {
        // If we get here, the middleware handled the invalid regex gracefully
        done();
      };

      // Call the middleware - this exercises isValidRegex with invalid pattern
      scribbles.middleware.express(req, res, next);
    });

    test('invalid regex with invalid flags in headers config', (done) => {
      // Pattern with invalid flags
      scribbles.config({
        headers: '/test/xyz'  // 'x', 'y', 'z' are not all valid flags
      });

      const req = {
        headers: { 'x-test': 'value' },
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res = {};

      scribbles.middleware.express(req, res, () => done());
    });
  });

  describe('Dev mode pretty printing (lines 563-565)', () => {
    test('fresh dev mode config triggers auto-indent', () => {
      // Force a fresh config state by setting mode to something else first
      scribbles.config({
        mode: 'prod',
        pretty: {
          inlineCharacterLimit: 80,
          indent: '    '
        }
      });

      // Now switch to dev mode with undefined pretty options
      // This should trigger lines 563-565
      scribbles.config({
        mode: 'dev',
        pretty: {
          inlineCharacterLimit: undefined,
          indent: undefined
        }
      });

      // Verify it works
      scribbles.log('Test message', { key: 'value' });
      expect(logs.length).toBe(1);
    });
  });

  describe('Date value formatting in toString (line 293)', () => {
    test('Date value triggers special formatting', () => {
      // The Date formatting at line 292-293 requires:
      // - value is instanceof Date
      // - !isNaN(val) - but 'val' is not defined in that context!
      // This might be a bug - using 'val' instead of 'value'

      const timestamp = new Date('2024-06-15');

      // Log with Date as value
      scribbles.log('Event time', timestamp);

      expect(logs.length).toBe(1);
      // Date should appear in output
      const output = logs[0].toString();
      expect(output).toContain('2024-06-15');
    });
  });
});
