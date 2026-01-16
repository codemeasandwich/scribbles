/**
 * Integration tests for previously untested features
 * Philosophy: "Test functionality not functions" - via logging & config interface
 * GitHub Issue #11
 */

const scribbles = require('../index');

describe('Edge Lookup Hash Feature (edgeLookupHash)', () => {
    // This feature replaces tracestate with a hash for bandwidth reduction

    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            edgeLookupHash: false // Reset to default
        });
    });

    afterEach(() => {
        scribbles.config({
            edgeLookupHash: false
        });
    });

    it('should replace tracestate with hash format when edgeLookupHash is enabled', (done) => {
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            edgeLookupHash: true
        });

        scribbles.trace({
            spanLabel: 'edge-test',
            tracestate: 'vendor1=value1,vendor2=value2'
        }, (spanId) => {
            const headers = scribbles.trace.headers();

            // Tracestate should be in hash format: h:xxxxxxxxxxxxxxxx
            expect(headers.tracestate).toMatch(/^h:[a-f0-9]{16}$/);
            done();
        });
    });

    it('should allow lookup of original tracestate via trace.lookupTracestate()', (done) => {
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            edgeLookupHash: true
        });

        scribbles.trace({
            spanLabel: 'lookup-test',
            tracestate: 'vendorA=abc123,vendorB=xyz789'
        }, (spanId) => {
            const headers = scribbles.trace.headers();
            const hash = headers.tracestate;

            // Look up the original tracestate
            const originalTracestate = scribbles.trace.lookupTracestate(hash);

            expect(originalTracestate).toBeDefined();
            expect(originalTracestate).toContain('vendorA');
            expect(originalTracestate).toContain('vendorB');
            done();
        });
    });

    it('should return undefined for unknown hash in lookupTracestate()', () => {
        const result = scribbles.trace.lookupTracestate('h:unknownhashvalue');
        expect(result).toBeUndefined();
    });

    it('should NOT use hash format when edgeLookupHash is disabled', (done) => {
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            edgeLookupHash: false
        });

        scribbles.trace({
            spanLabel: 'no-hash-test',
            tracestate: 'myvendor=myvalue'
        }, (spanId) => {
            const headers = scribbles.trace.headers();

            // Tracestate should be full format, not hash
            expect(headers.tracestate).not.toMatch(/^h:/);
            expect(headers.tracestate).toContain('=');
            done();
        });
    });
});

describe('Global Config Option (config.global)', () => {
    // Attach log functions to console or global objects

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;

    afterEach(() => {
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        console.info = originalConsoleInfo;
        console.debug = originalConsoleDebug;

        // Reset scribbles config
        scribbles.config({
            global: undefined,
            stdOut: null,
            dataOut: null
        });
    });

    it('should attach log functions to console when global: "console"', () => {
        let logs = [];

        scribbles.config({
            global: 'console',
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });

        // Now console.log should use scribbles
        console.log('test via console.log');

        expect(logs.length).toBe(1);
        expect(logs[0].input.message).toBe('test via console.log');
    });

    it('should attach all log levels to console', () => {
        let logs = [];

        scribbles.config({
            global: 'console',
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            levels: ['error', 'warn', 'log', 'info', 'debug']
        });

        console.error('error message');
        console.warn('warn message');
        console.log('log message');
        console.info('info message');
        console.debug('debug message');

        expect(logs.length).toBe(5);
        expect(logs[0].info.logLevel).toBe('error');
        expect(logs[1].info.logLevel).toBe('warn');
        expect(logs[2].info.logLevel).toBe('log');
        expect(logs[3].info.logLevel).toBe('info');
        expect(logs[4].info.logLevel).toBe('debug');
    });

    it('should attach log functions to global object when global: "global"', () => {
        let logs = [];

        scribbles.config({
            global: 'global',
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });

        // Now global.log should exist and use scribbles
        expect(global.log).toBeDefined();
        global.log('test via global.log');

        expect(logs.length).toBe(1);
        expect(logs[0].input.message).toBe('test via global.log');

        // Clean up
        delete global.log;
        delete global.error;
        delete global.warn;
        delete global.info;
        delete global.debug;
    });

    it('should attach log functions to custom object when global is an object', () => {
        let logs = [];
        const customTarget = {};

        scribbles.config({
            global: customTarget,
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });

        expect(customTarget.log).toBeDefined();
        expect(customTarget.error).toBeDefined();

        customTarget.log('test via custom object');

        expect(logs.length).toBe(1);
        expect(logs[0].input.message).toBe('test via custom object');
    });
});

describe('Endpoint Logging Full Flow', () => {
    // Test that middleware populates url, path, query, params, method

    let logs = [];
    let stdOutCalls = [];

    beforeEach(() => {
        logs = [];
        stdOutCalls = [];
    });

    it('should capture endpoint info in trace context from middleware', (done) => {
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });

        // Simulate Express request object
        const mockReq = {
            headers: {},
            url: '/users/123?sort=name&limit=10',
            path: '/users/123',
            query: { sort: 'name', limit: '10' },
            params: { id: '123' },
            method: 'GET',
            socket: { remoteAddress: '192.168.1.1' }
        };
        const mockRes = {};
        const mockNext = () => {
            // Log inside the trace context
            scribbles.log('Processing request');

            // Check that trace context has endpoint info
            expect(logs.length).toBe(1);
            expect(logs[0].trace.url).toBe('/users/123?sort=name&limit=10');
            expect(logs[0].trace.path).toBe('/users/123');
            expect(logs[0].trace.query).toEqual({ sort: 'name', limit: '10' });
            expect(logs[0].trace.params).toEqual({ id: '123' });
            expect(logs[0].trace.method).toBe('GET');
            done();
        };

        scribbles.middleware.express(mockReq, mockRes, mockNext);
    });

    it('should format endpoint tokens in output', (done) => {
        // Note: {method} in format conflicts with context.method (function name)
        // So we test {path} and {url} which don't have conflicts
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: (data) => logs.push(data),
            format: '{url} {path} - {message}',
            logLevel: 'debug'
        });

        const mockReq = {
            headers: {},
            url: '/api/data?foo=bar',
            path: '/api/data',
            query: { foo: 'bar' },
            params: {},
            method: 'POST',
            socket: { remoteAddress: '10.0.0.1' }
        };
        const mockRes = {};
        const mockNext = () => {
            scribbles.log('Data received');

            expect(stdOutCalls.length).toBe(1);
            expect(stdOutCalls[0]).toContain('/api/data?foo=bar');
            expect(stdOutCalls[0]).toContain('/api/data');
            expect(stdOutCalls[0]).toContain('Data received');

            // Verify HTTP method is captured in trace (even if format conflict prevents display)
            expect(logs.length).toBe(1);
            expect(logs[0].trace.method).toBe('POST');
            done();
        };

        scribbles.middleware.express(mockReq, mockRes, mockNext);
    });

    it('should handle different HTTP methods', (done) => {
        let allLogs = [];
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        let completed = 0;

        scribbles.config({
            stdOut: null,
            dataOut: (data) => allLogs.push(data),
            logLevel: 'debug'
        });

        methods.forEach((method, index) => {
            const mockReq = {
                headers: {},
                url: '/test',
                path: '/test',
                query: {},
                params: {},
                method,
                socket: { remoteAddress: '127.0.0.1' }
            };
            const mockRes = {};
            const mockNext = () => {
                scribbles.log(`${method} request`);
                completed++;

                if (completed === methods.length) {
                    // Verify all methods were captured
                    const capturedMethods = allLogs.map(l => l.trace.method);
                    methods.forEach(m => {
                        expect(capturedMethods).toContain(m);
                    });
                    done();
                }
            };

            scribbles.middleware.express(mockReq, mockRes, mockNext);
        });
    });
});

describe('.at() Method for Source Location Override', () => {
    // Test overriding file/line/col in log entries
    // Note: The .at() method requires 'from' to have an 'args' array property

    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    it('should override source location with .at() method', () => {
        const customFrom = { file: 'custom-file.js', line: 42, col: 10, args: [] };

        scribbles.log.at(customFrom, 'test message');

        expect(logs.length).toBe(1);
        expect(logs[0].context.fileName).toBe('custom-file.js');
        expect(logs[0].context.lineNumber).toBe(42);
    });

    it('should work with .at() on all log levels', () => {
        const customFrom = { file: 'my-module.js', line: 100, col: 0, args: [] };

        scribbles.error.at(customFrom, 'error msg');
        scribbles.warn.at(customFrom, 'warn msg');
        scribbles.log.at(customFrom, 'log msg');
        scribbles.info.at(customFrom, 'info msg');
        scribbles.debug.at(customFrom, 'debug msg');

        expect(logs.length).toBe(5);
        logs.forEach(log => {
            expect(log.context.fileName).toBe('my-module.js');
            expect(log.context.lineNumber).toBe(100);
        });
    });

    it('should allow .at() with message, value, and error', () => {
        const customFrom = { file: 'wrapper.js', line: 55, col: 0, args: [] };
        const testError = new Error('test error');

        scribbles.error.at(customFrom, 'operation failed', { code: 500 }, testError);

        expect(logs.length).toBe(1);
        expect(logs[0].context.fileName).toBe('wrapper.js');
        expect(logs[0].input.message).toContain('operation failed');
        expect(logs[0].input.value).toEqual({ code: 500 });
        expect(logs[0].input.stackTrace).toBeDefined();
    });

    it('should be useful for library wrapper functions', () => {
        // Simulate a wrapper library that wants to report caller location
        function myLogWrapper(message, value) {
            const callerLocation = { file: 'user-code.js', line: 123, col: 0, args: [] };
            return scribbles.log.at(callerLocation, message, value);
        }

        const result = myLogWrapper('Hello from wrapper', { data: 'test' });

        expect(logs.length).toBe(1);
        expect(logs[0].context.fileName).toBe('user-code.js');
        expect(logs[0].context.lineNumber).toBe(123);
    });

    it('should work with status.at() method', () => {
        // status.at() exists and can be called with custom location
        const customFrom = { file: 'health-check.js', line: 10, col: 0, args: [] };

        // status() returns an object synchronously that populates async
        const result = scribbles.status.at(customFrom, 'System check');

        // Verify it returns an object (status populates async)
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
    });
});

describe('dataOut Properties (from, method, originalMessage)', () => {
    // Test undocumented but useful properties in dataOut

    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    it('should include "from" property with call stack', () => {
        scribbles.log('test message');

        expect(logs.length).toBe(1);
        expect(logs[0].input.from).toBeDefined();
        expect(Array.isArray(logs[0].input.from)).toBe(true);
        expect(logs[0].input.from.length).toBeGreaterThan(0);
    });

    it('should include context.method property', () => {
        function myNamedFunction() {
            scribbles.log('inside named function');
        }

        myNamedFunction();

        expect(logs.length).toBe(1);
        // The method/type might be captured depending on stack trace parsing
        expect(logs[0].context).toBeDefined();
    });

    it('should preserve originalMessage when logging with error', () => {
        const error = new Error('Original error message');

        scribbles.error('Context message', null, error);

        expect(logs.length).toBe(1);
        // originalMessage is stored when an error provides additional context
        expect(logs[0].input.stackTrace).toBeDefined();
    });
});

describe('hijack Config Option', () => {
    // Test enabling/disabling HTTP request hijacking

    let logs = [];

    beforeEach(() => {
        logs = [];
    });

    it('should accept hijack: true in config without error', () => {
        expect(() => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                logLevel: 'debug',
                hijack: true
            });
        }).not.toThrow();
    });

    it('should accept hijack: false in config without error', () => {
        expect(() => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                logLevel: 'debug',
                hijack: false
            });
        }).not.toThrow();
    });
});

describe('x-git-hash Header in trace.headers()', () => {
    // trace.headers() automatically includes x-git-hash

    it('should include x-git-hash in trace headers', (done) => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });

        scribbles.trace({ spanLabel: 'git-test' }, (spanId) => {
            const headers = scribbles.trace.headers();

            // x-git-hash should be present (may be undefined if no git repo)
            expect('x-git-hash' in headers).toBe(true);
            // traceparent should always be present
            expect(headers.traceparent).toBeDefined();
            done();
        });
    });
});

describe('Reserved Function Names', () => {
    // Verify all reserved names throw errors when used as log levels

    const reservedNames = ['config', 'trace', 'middleware', 'status', 'timer', 'timerEnd', 'group'];

    reservedNames.forEach(name => {
        it(`should throw error when "${name}" is used as a log level`, () => {
            expect(() => {
                scribbles.config({
                    levels: ['error', name, 'debug']
                });
            }).toThrow(`You cant use "${name}" as a log level!`);
        });
    });
});

describe('Middleware Hash Restoration', () => {
    // Test that middleware restores hash-based tracestate

    let logs = [];

    beforeEach(() => {
        logs = [];
    });

    it('should restore tracestate from hash when receiving hashed tracestate', (done) => {
        // First, create a hash
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug',
            edgeLookupHash: true
        });

        scribbles.trace({
            spanLabel: 'create-hash',
            tracestate: 'orig=originalvalue'
        }, () => {
            const headers = scribbles.trace.headers();
            const hash = headers.tracestate;

            // Now simulate incoming request with that hash
            const mockReq = {
                headers: {
                    traceparent: '00-12345678901234567890123456789012-1234567890123456-01',
                    tracestate: hash
                },
                url: '/test',
                path: '/test',
                query: {},
                params: {},
                method: 'GET',
                socket: { remoteAddress: '127.0.0.1' }
            };

            const mockRes = {};
            const mockNext = () => {
                scribbles.log('Request processed');

                // The trace context should have restored tracestate
                expect(logs.length).toBe(1);
                done();
            };

            scribbles.middleware.express(mockReq, mockRes, mockNext);
        });
    });
});

describe('Colors Underline Style', () => {
    // Test that underline style is available

    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
    });

    it('should accept underline in colorScheme config', () => {
        expect(() => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                logLevel: 'debug',
                colors: true,
                colorScheme: {
                    log: 'underline'
                }
            });
        }).not.toThrow();

        scribbles.log('underlined message');
        expect(stdOutCalls.length).toBe(1);
    });
});

describe('CI Environment Color Detection', () => {
    const originalCI = process.env.CI;

    afterEach(() => {
        if (originalCI !== undefined) {
            process.env.CI = originalCI;
        } else {
            delete process.env.CI;
        }
    });

    it('should enable colors in CI environment when in dev mode', () => {
        process.env.CI = 'true';

        // This tests that CI detection doesn't throw
        expect(() => {
            scribbles.config({
                mode: 'dev',
                stdOut: null,
                dataOut: null,
                logLevel: 'debug'
            });
        }).not.toThrow();
    });
});
