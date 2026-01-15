/**
 * Integration tests for log levels
 * Tests default levels, custom levels, and level filtering
 */

const scribbles = require('../index');

describe('Log Levels', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        // Reset to default config
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            levels: ['error', 'warn', 'log', 'info', 'debug'],
            logLevel: 'debug'
        });
    });

    describe('Default log levels', () => {
        it('should have error level', () => {
            expect(typeof scribbles.error).toBe('function');
            const result = scribbles.error('test');
            expect(result.info.logLevel).toBe('error');
        });

        it('should have warn level', () => {
            expect(typeof scribbles.warn).toBe('function');
            const result = scribbles.warn('test');
            expect(result.info.logLevel).toBe('warn');
        });

        it('should have log level', () => {
            expect(typeof scribbles.log).toBe('function');
            const result = scribbles.log('test');
            expect(result.info.logLevel).toBe('log');
        });

        it('should have info level', () => {
            expect(typeof scribbles.info).toBe('function');
            const result = scribbles.info('test');
            expect(result.info.logLevel).toBe('info');
        });

        it('should have debug level', () => {
            expect(typeof scribbles.debug).toBe('function');
            const result = scribbles.debug('test');
            expect(result.info.logLevel).toBe('debug');
        });
    });

    describe('Log level .at() method', () => {
        it('should support .at() for explicit source location', () => {
            const from = { file: 'custom.js', line: 42, col: 10, args: [] };
            const result = scribbles.log.at(from, 'test message');
            expect(result.input.message).toBe('test message');
        });

        it('should support .at() with value', () => {
            const from = { file: 'test.js', line: 10, col: 5, args: [] };
            const result = scribbles.log.at(from, 'msg', { data: 123 });
            expect(result.input.value.data).toBe(123);
        });

        it('should support .at() with error', () => {
            const from = { file: 'test.js', line: 10, col: 5, args: [] };
            const err = new Error('test error');
            const result = scribbles.error.at(from, 'error occurred', err);
            expect(result.input.stackTrace).toBeDefined();
        });

        // Tests for parceStringVals - called when args contain template functions
        it('should process args with template functions for strings', () => {
            const templateFn = (fragments, ...vals) => {
                return fragments.map((f, i) => f + (vals[i] !== undefined ? vals[i] : '')).join('');
            };
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [templateFn.bind(null, ['myVar', ''])]  // x=> x`myVar`
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with function values', () => {
            const templateFn = (fn) => fn((frags, ...vals) => {
                // parceStringVals gets called with template tag
                return frags.join('');
            });
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`funcName`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with Date values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`date${new Date()}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with object values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`obj${{ key: 'value' }}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with array values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`arr${[1, 2, 3]}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with Buffer values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`buf${Buffer.from([1, 2])}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with Map values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`map${new Map([['a', 1]])}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with Set values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`set${new Set([1, 2])}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with Error values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`err${new Error('test')}`]
            };
            const result = scribbles.error.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle args with numeric values', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [(parser) => parser`num${42}`]
            };
            const result = scribbles.log.at(from, 'test');
            expect(result).toBeDefined();
        });

        it('should handle null args entries', () => {
            const from = {
                file: 'test.js',
                line: 10,
                col: 5,
                args: [null, (parser) => parser`name`]
            };
            const result = scribbles.log.at(from, 'test', { value: 1 });
            expect(result).toBeDefined();
        });
    });

    describe('Custom log levels', () => {
        it('should create custom level methods', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['fatal', 'error', 'warning', 'info'],
                logLevel: 'info'
            });

            expect(typeof scribbles.fatal).toBe('function');
            expect(typeof scribbles.warning).toBe('function');

            const result = scribbles.fatal('fatal error');
            expect(result.info.logLevel).toBe('fatal');
        });

        it('should remove old level methods when config changes', () => {
            // First set levels with 'debug'
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug'
            });
            expect(typeof scribbles.debug).toBe('function');

            // Now set new levels without 'debug'
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['fatal', 'error', 'warning'],
                logLevel: 'warning'
            });

            // debug should no longer exist as a logging method
            expect(scribbles.debug).toBeUndefined();
        });
    });

    describe('Log level filtering', () => {
        it('should suppress logs below logLevel threshold', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'warn'  // Only error and warn should output
            });

            scribbles.error('should appear');
            scribbles.warn('should appear');
            scribbles.log('should NOT appear');
            scribbles.info('should NOT appear');
            scribbles.debug('should NOT appear');

            expect(logs.length).toBe(2);
            expect(logs[0].input.message).toBe('should appear');
            expect(logs[0].info.logLevel).toBe('error');
            expect(logs[1].input.message).toBe('should appear');
            expect(logs[1].info.logLevel).toBe('warn');
        });

        it('should make suppressed levels return no-op functions', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'error'  // Only error should output
            });

            // Suppressed levels should still be callable but do nothing
            const result = scribbles.debug('suppressed');
            expect(result).toBeUndefined();
            expect(logs.length).toBe(0);
        });

        it('should make suppressed levels .at() no-op', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'error'  // Only error should output
            });

            // Suppressed level .at() should also be no-op
            const from = { file: 'test.js', line: 10, col: 5, args: [] };
            const result = scribbles.debug.at(from, 'suppressed');
            expect(result).toBeUndefined();
            expect(logs.length).toBe(0);
        });

        it('should filter all levels when logLevel is highest priority', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'error'
            });

            scribbles.error('only this');
            scribbles.warn('not this');
            scribbles.log('not this');

            expect(logs.length).toBe(1);
        });
    });

    describe('Log level priority ordering', () => {
        it('levels array defines priority from highest to lowest', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                levels: ['critical', 'error', 'warning', 'info', 'verbose'],  // Avoid reserved names
                logLevel: 'warning'
            });

            // Should output critical, error, warning
            scribbles.critical('1');
            scribbles.error('2');
            scribbles.warning('3');
            scribbles.info('4');  // suppressed
            scribbles.verbose('5'); // suppressed

            expect(logs.length).toBe(3);
        });
    });
});
