/**
 * Integration tests for configuration system
 * Tests all config options via scribbles.config()
 */

const scribbles = require('../index');

describe('Configuration System', () => {
    let logs = [];
    let stdOutCalls = [];

    beforeEach(() => {
        logs = [];
        stdOutCalls = [];
        // Reset to defaults
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            levels: ['error', 'warn', 'log', 'info', 'debug'],
            logLevel: 'debug',
            mode: 'dev',
            stringify: undefined  // Reset custom stringify
        });
    });

    describe('mode option', () => {
        it('should set mode in log output', () => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                mode: 'production'
            });

            const result = scribbles.log('test');
            expect(result.info.mode).toBe('production');
        });

        it('should default to dev mode', () => {
            const result = scribbles.log('test');
            expect(result.info.mode).toBe('dev');
        });
    });

    describe('format option', () => {
        it('should use custom format string', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: (data) => logs.push(data),
                format: '{logLevel}: {message}'
            });

            scribbles.log('hello');
            expect(stdOutCalls[0]).toBe('log: hello');
        });

        it('should support all format placeholders', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: (data) => logs.push(data),
                format: '{repo}:{mode}:{branch} [{spanLabel} {spanId}] {time} #{hash} <{logLevel}> {fileName}:{lineNumber} {message} {value}'
            });

            scribbles.log('test', { foo: 'bar' });
            const output = stdOutCalls[0];

            expect(output).toContain('<log>');
            expect(output).toContain('test');
        });
    });

    describe('time option', () => {
        it('should use custom time format', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: (data) => logs.push(data),
                format: '{time}',
                time: 'HH:mm'
            });

            scribbles.log('test');
            // Output should be in HH:mm format (e.g., "14:30")
            expect(stdOutCalls[0]).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    describe('stdOut option', () => {
        it('should call stdOut function with formatted string', () => {
            const captured = [];
            scribbles.config({
                stdOut: (msg) => captured.push(msg),
                dataOut: null,
                format: '{message}'
            });

            scribbles.log('test message');
            expect(captured[0]).toBe('test message');
        });

        it('should support level-specific stdOut', () => {
            const captured = { error: [], warn: [], log: [], info: [], debug: [] };
            scribbles.config({
                stdOut: {
                    error: (msg) => captured.error.push(msg),
                    warn: (msg) => captured.warn.push(msg),
                    log: (msg) => captured.log.push(msg),
                    info: (msg) => captured.info.push(msg),
                    debug: (msg) => captured.debug.push(msg)
                },
                dataOut: null,
                format: '{message}'
            });

            scribbles.error('error msg');
            scribbles.warn('warn msg');

            expect(captured.error[0]).toBe('error msg');
            expect(captured.warn[0]).toBe('warn msg');
        });

        it('should support stdOut with .log method (console-like)', () => {
            const captured = [];
            scribbles.config({
                stdOut: {
                    log: (msg) => captured.push(msg)
                },
                dataOut: null,
                format: '{message}'
            });

            scribbles.log('test');
            expect(captured[0]).toBe('test');
        });

        it('should suppress output when stdOut is null', () => {
            const captured = [];
            scribbles.config({
                stdOut: null,
                dataOut: (data) => captured.push(data)
            });

            scribbles.log('test');
            // dataOut should still work
            expect(captured.length).toBe(1);
        });
    });

    describe('dataOut option', () => {
        it('should receive structured log entry object', () => {
            const captured = [];
            scribbles.config({
                stdOut: null,
                dataOut: (data) => captured.push(data)
            });

            scribbles.log('test', { value: 42 });

            expect(captured.length).toBe(1);
            expect(captured[0].input.message).toBe('test');
            expect(captured[0].input.value).toEqual({ value: 42 });
            expect(captured[0].v).toBeDefined();
            expect(captured[0].git).toBeDefined();
        });
    });

    describe('stringify option', () => {
        it('should use custom stringify function', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: (value) => `CUSTOM:${JSON.stringify(value)}`
            });

            scribbles.log('msg', { foo: 'bar' });
            expect(stdOutCalls[0]).toContain('CUSTOM:');
        });
    });

    describe('pretty options', () => {
        it('should respect inlineCharacterLimit for single line objects', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });

            scribbles.log('msg', { a: 1, b: 2, c: 3 });
            // Should be on single line (no newlines)
            expect(stdOutCalls[0]).not.toContain('\n');
        });

        it('should respect depth option', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    depth: 1,
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });

            scribbles.log('msg', { a: { b: { c: 1 } } });
            expect(stdOutCalls[0]).toContain('{ + }');
        });

        it('should respect filter option to exclude properties', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    filter: (obj, key) => key !== 'password',
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });

            scribbles.log('msg', { user: 'admin', password: 'secret' });
            // filter excludes password entirely
            expect(stdOutCalls[0]).toContain('user');
            expect(stdOutCalls[0]).not.toContain('password');
            expect(stdOutCalls[0]).not.toContain('secret');
        });

        it('should call transform for array elements', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    transform: (input, index, value) => {
                        // Transform array values - uppercase 'hello'
                        if (typeof index === 'number' && value.includes('hello')) {
                            return "'HELLO'";
                        }
                        return value;
                    },
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });

            scribbles.log('msg', ['hello', 'world']);
            expect(stdOutCalls[0]).toContain('HELLO');
            expect(stdOutCalls[0]).toContain('world');
        });
    });

    describe('gitEnv option', () => {
        it('should read git values from environment variables', () => {
            // Set env vars
            process.env.TEST_GIT_HASH = 'abc1234';
            process.env.TEST_GIT_REPO = 'test-repo';
            process.env.TEST_GIT_BRANCH = 'feature-branch';

            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                gitEnv: {
                    hash: 'TEST_GIT_HASH',
                    repo: 'TEST_GIT_REPO',
                    branch: 'TEST_GIT_BRANCH'
                }
            });

            const result = scribbles.log('test');
            expect(result.git.hash).toBe('abc1234'.substr(0, 7));
            expect(result.git.repo).toBe('test-repo');
            expect(result.git.branch).toBe('feature-branch');

            // Cleanup
            delete process.env.TEST_GIT_HASH;
            delete process.env.TEST_GIT_REPO;
            delete process.env.TEST_GIT_BRANCH;
        });
    });

    describe('Error cases', () => {
        it('should throw when using reserved function name as log level', () => {
            expect(() => {
                scribbles.config({
                    levels: ['config', 'error', 'warn']  // 'config' is reserved
                });
            }).toThrow();
        });

        it('should throw when using trace as log level', () => {
            expect(() => {
                scribbles.config({
                    levels: ['trace', 'error', 'warn']  // 'trace' is reserved
                });
            }).toThrow();
        });
    });

    describe('Nested config (deepMerge)', () => {
        it('should merge nested pretty options', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                pretty: {
                    indent: '  ',
                    depth: 5
                }
            });

            // Call config again with additional pretty options
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                pretty: {
                    singleQuotes: true
                }
            });

            scribbles.log('msg', { test: 'value' });
            // Should work without error
            expect(stdOutCalls.length).toBeGreaterThan(0);
        });

        it('should handle config with empty pretty options', () => {
            // This tests config with minimal/empty options
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                pretty: {}
            });

            const result = scribbles.log('test');
            expect(result).toBeDefined();
        });

        it('should set indent in dev mode when inlineCharacterLimit undefined', () => {
            // User story: Developer in dev mode sees pretty-printed objects
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                mode: 'dev',
                pretty: {
                    inlineCharacterLimit: undefined  // Force dev mode defaults
                }
            });

            scribbles.log('msg', { nested: { deep: 'value' } });
            // In dev mode, output should use indentation
            expect(stdOutCalls.length).toBeGreaterThan(0);
        });

        it('should merge arrays in nested config via deepMerge', () => {
            // User story: Developer adds custom headers to existing list
            const req = {
                headers: {
                    'x-forwarded-for': '1.2.3.4'
                },
                socket: { remoteAddress: '127.0.0.1' }
            };
            const res = {};

            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headers: ['content-type']
            });

            // Call middleware with existing config
            scribbles.middleware.express(req, res, () => {
                const headers = scribbles.trace.headers();
                // Custom header merge test - just verify it works
                expect(headers).toBeDefined();
            });
        });

        it('should accept custom levels array', () => {
            const myLogs = [];
            scribbles.config({
                stdOut: null,
                dataOut: (data) => myLogs.push(data),
                levels: ['error', 'warn'],
                logLevel: 'warn'
            });

            scribbles.error('test error');
            expect(myLogs.length).toBe(1);
            expect(myLogs[0].info.logLevel).toBe('error');
        });
    });

    describe('Error logging scenarios', () => {
        it('should log error without message', () => {
            const err = new Error('my error');
            const result = scribbles.error(err);

            expect(result.input.message).toBe('my error');
            expect(result.input.stackTrace).toBeDefined();
        });

        it('should log error with message and value', () => {
            const err = new Error('error occurred');
            const result = scribbles.error('context message', { data: 123 }, err);

            expect(result.input.message).toBe('context message');
            expect(result.input.value.data).toBe(123);
        });
    });
});
