/**
 * Integration tests for Express middleware
 * Tests scribbles.middleware.express with mocked req/res/next
 */

const scribbles = require('../index');

describe('Express Middleware', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            headers: null,
            headersMapping: undefined
        });
    });

    /**
     * Create a mock Express request object
     */
    function mockReq(headers = {}, options = {}) {
        return {
            headers,
            socket: 'socket' in options ? options.socket : { remoteAddress: '127.0.0.1' },
            connection: options.connection,
            ip: options.ip
        };
    }

    /**
     * Create a mock Express response object
     */
    function mockRes() {
        return {};
    }

    describe('Basic middleware functionality', () => {
        it('should call next()', (done) => {
            const req = mockReq();
            const res = mockRes();
            const next = jest.fn(() => {
                expect(next).toHaveBeenCalled();
                done();
            });

            scribbles.middleware.express(req, res, next);
        });

        it('should create trace context', (done) => {
            const req = mockReq();
            const res = mockRes();
            const next = () => {
                scribbles.log('inside middleware');
                expect(logs[0].trace.spanId).toBeDefined();
                done();
            };

            scribbles.middleware.express(req, res, next);
        });
    });

    describe('Traceparent header extraction', () => {
        it('should extract traceId from traceparent header', (done) => {
            const req = mockReq({
                traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
            });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should extract tracestate from header', (done) => {
            const req = mockReq({
                traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
                tracestate: 'vendor=value'
            });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.tracestate).toBeDefined();
                done();
            };

            scribbles.middleware.express(req, res, next);
        });
    });

    describe('Span label from IP', () => {
        it('should use x-forwarded-for as spanLabel', (done) => {
            const req = mockReq({
                'x-forwarded-for': '192.168.1.100'
            });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.spanLabel).toBe('192.168.1.100');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should fall back to socket.remoteAddress', (done) => {
            const req = mockReq({}, { socket: { remoteAddress: '10.0.0.1' } });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.spanLabel).toBe('10.0.0.1');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should fall back to req.ip', (done) => {
            const req = mockReq({}, { socket: null, ip: '172.16.0.1' });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.spanLabel).toBe('172.16.0.1');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should fall back to connection.remoteAddress', (done) => {
            const req = mockReq({}, {
                socket: null,
                connection: { remoteAddress: '192.168.2.50' }
            });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.spanLabel).toBe('192.168.2.50');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should fall back to connection.socket.remoteAddress', (done) => {
            const req = mockReq({}, {
                socket: null,
                connection: { socket: { remoteAddress: '192.168.3.75' } }
            });
            const res = mockRes();
            const next = () => {
                scribbles.log('test');
                expect(logs[0].trace.spanLabel).toBe('192.168.3.75');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });
    });

    describe('Header forwarding (config.headers)', () => {
        it('should forward specified headers as string', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headers: 'x-custom-header'
            });

            const req = mockReq({
                'x-custom-header': 'custom-value',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-custom-header']).toBe('custom-value');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should forward multiple headers as array', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headers: ['x-header-1', 'x-header-2']
            });

            const req = mockReq({
                'x-header-1': 'value1',
                'x-header-2': 'value2',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-header-1']).toBe('value1');
                expect(headers['x-header-2']).toBe('value2');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should match headers with RegExp', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headers: [/^x-custom-.*/]
            });

            const req = mockReq({
                'x-custom-foo': 'foo-value',
                'x-custom-bar': 'bar-value',
                'x-other': 'other-value',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-custom-foo']).toBe('foo-value');
                expect(headers['x-custom-bar']).toBe('bar-value');
                expect(headers['x-other']).toBeUndefined();
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should match headers with regex string pattern', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headers: ['/^x-api-.*/']  // Regex as string, not RegExp object
            });

            const req = mockReq({
                'x-api-key': 'secret123',
                'x-api-version': 'v2',
                'x-other': 'ignored',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-api-key']).toBe('secret123');
                expect(headers['x-api-version']).toBe('v2');
                expect(headers['x-other']).toBeUndefined();
                done();
            };

            scribbles.middleware.express(req, res, next);
        });
    });

    describe('Header mapping (config.headersMapping)', () => {
        it('should map header names', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headersMapping: {
                    'x-output-header': 'x-input-header'
                }
            });

            const req = mockReq({
                'x-input-header': 'input-value',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-output-header']).toBe('input-value');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should try multiple input headers in order', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headersMapping: {
                    'x-result': ['x-primary', 'x-fallback']
                }
            });

            const req = mockReq({
                'x-fallback': 'fallback-value',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-result']).toBe('fallback-value');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });

        it('should use first available header in priority order', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                headersMapping: {
                    'x-result': ['x-primary', 'x-fallback']
                }
            });

            const req = mockReq({
                'x-primary': 'primary-value',
                'x-fallback': 'fallback-value',
                'x-forwarded-for': '1.2.3.4'
            });
            const res = mockRes();
            const next = () => {
                const headers = scribbles.trace.headers();
                expect(headers['x-result']).toBe('primary-value');
                done();
            };

            scribbles.middleware.express(req, res, next);
        });
    });

    describe('Header config validation', () => {
        it('should throw on invalid headersMapping type', () => {
            expect(() => {
                scribbles.config({
                    stdOut: null,
                    dataOut: (data) => logs.push(data),
                    headersMapping: 'invalid-string'  // Should be object
                });

                const req = mockReq({
                    'x-forwarded-for': '1.2.3.4'
                });
                const res = mockRes();
                scribbles.middleware.express(req, res, () => { });
            }).toThrow();
        });

        it('should throw on invalid headersMapping value type', () => {
            // User story: Developer mistakenly passes number instead of string/array
            expect(() => {
                scribbles.config({
                    stdOut: null,
                    dataOut: (data) => logs.push(data),
                    headersMapping: {
                        'x-custom': 12345  // Should be string or array, not number
                    }
                });

                const req = mockReq({
                    'x-forwarded-for': '1.2.3.4'
                });
                const res = mockRes();
                scribbles.middleware.express(req, res, () => { });
            }).toThrow(/headersMapping keys must map to a String or Array/);
        });
    });
});
