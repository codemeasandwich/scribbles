/**
 * Integration tests for loader.js source transformation (lines 7-44)
 *
 * User Scenario: Developer writes code using scribbles.log(), scribbles.error(), etc.
 * When the file is required, the loader transforms these calls to inject
 * source location metadata (file, line, column, argument names).
 *
 * These tests exercise the transformation function directly to achieve coverage
 * on lines 14-40 (the for loop, level detection, and getNextChar closure).
 */

const { _processSource } = require('../src/loader');

describe('Loader Source Transformation', () => {
    const mockFilename = '/project/src/app.js';

    describe('Developer uses different log levels', () => {
        test('scribbles.log() transforms with .at() injection', () => {
            // User scenario: Developer logs a message
            const source = `scribbles.log('hello');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.log.at(');
            expect(result).toContain('file:');
            expect(result).toContain('line:1');
        });

        test('scribbles.error() transforms correctly', () => {
            // User scenario: Developer logs an error
            const source = `scribbles.error('something failed');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.error.at(');
        });

        test('scribbles.warn() transforms correctly', () => {
            // User scenario: Developer logs a warning
            const source = `scribbles.warn('be careful');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.warn.at(');
        });

        test('scribbles.info() transforms correctly', () => {
            // User scenario: Developer logs info
            const source = `scribbles.info('fyi');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.info.at(');
        });

        test('scribbles.debug() transforms correctly', () => {
            // User scenario: Developer adds debug logging
            const source = `scribbles.debug('debugging');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.debug.at(');
        });

        test('scribbles.status() transforms correctly', () => {
            // User scenario: Developer checks system status
            const source = `scribbles.status('health check');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.status.at(');
        });
    });

    describe('Developer writes multi-line calls', () => {
        test('call spanning two lines with variable', () => {
            // User scenario: Developer spreads call for readability
            const source = `scribbles.log(
  userData
);`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.log.at(');
            expect(result).toContain('line:1');
        });

        test('call spanning multiple lines with object', () => {
            // User scenario: Complex object logged across lines
            const source = `scribbles.log(
  'User data',
  { name: 'Alice', email: 'alice@example.com' }
);`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.log.at(');
        });

        test('call with many arguments on separate lines', () => {
            // User scenario: Multiple arguments each on own line
            const source = `scribbles.info(
  action,
  userId,
  timestamp
);`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.info.at(');
        });
    });

    describe('Lines without scribbles calls', () => {
        test('regular console.log returns unchanged', () => {
            // User scenario: Not all logging uses scribbles
            const source = `console.log('hello');`;
            const result = _processSource(source, mockFilename);

            expect(result).toBe(source);
        });

        test('require statement returns unchanged', () => {
            // User scenario: Importing scribbles shouldn't transform
            const source = `const scribbles = require('scribbles');`;
            const result = _processSource(source, mockFilename);

            expect(result).toBe(source);
        });

        test('scribbles property access returns unchanged', () => {
            // User scenario: Using scribbles.config() or other non-log methods
            const source = `scribbles.config({ logLevel: 'debug' });`;
            const result = _processSource(source, mockFilename);

            expect(result).toBe(source);
        });

        test('empty source returns empty', () => {
            const result = _processSource('', mockFilename);
            expect(result).toBe('');
        });
    });

    describe('Mixed content files', () => {
        test('transforms only scribbles calls in multi-line file', () => {
            // User scenario: Real file with imports, code, and logging
            const source = `const scribbles = require('scribbles');
const data = { id: 123 };
scribbles.log('Starting', data);
console.log('Not transformed');
scribbles.error('Failed');`;

            const result = _processSource(source, mockFilename);

            expect(result).toContain('scribbles.log.at(');
            expect(result).toContain('scribbles.error.at(');
            expect(result).toContain("console.log('Not transformed')");
            expect(result).toContain("const scribbles = require('scribbles')");
        });
    });

    describe('Path normalization', () => {
        test('file inside project gets relative path', () => {
            // The appDir prefix is stripped for cleaner logs
            const source = `scribbles.log('test');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('file:"');
        });

        test('file matching appDir prefix gets path stripped', () => {
            // User scenario: File is inside the app directory
            // The path normalization strips the appDir prefix for cleaner logs
            const appDir = require('../appDir');
            const filenameInProject = '/' + appDir + '/src/myfile.js';
            const source = `scribbles.log('inside project');`;
            const result = _processSource(source, filenameInProject);

            expect(result).toContain('scribbles.log.at(');
            // The file path in the transformed output should be relative
            expect(result).toContain('file:"src/myfile.js"');
        });
    });

    describe('Column position tracking', () => {
        test('call at start of line has col:0', () => {
            const source = `scribbles.log('at start');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('col:0');
        });

        test('indented call has correct column', () => {
            const source = `    scribbles.log('indented');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('col:4');
        });
    });

    describe('Line number tracking', () => {
        test('first line is line:1', () => {
            const source = `scribbles.log('first');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('line:1');
        });

        test('third line is line:3', () => {
            const source = `const a = 1;
const b = 2;
scribbles.log('third');`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('line:3');
        });
    });

    describe('Argument parsing in transformation', () => {
        test('variable argument gets tracked', () => {
            const source = `scribbles.log(myVariable);`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('args:[');
        });

        test('multiple arguments all tracked', () => {
            const source = `scribbles.log('message', data, count);`;
            const result = _processSource(source, mockFilename);

            expect(result).toContain('args:[');
        });
    });
});
