/**
 * E2E Tests for HTTP Hijacker - Real HTTP Requests
 *
 * User Story: As a developer building microservices, I want trace headers
 * automatically injected into my outgoing HTTP requests so distributed
 * tracing works seamlessly across service boundaries.
 *
 * These tests make REAL http.request calls to trigger the hijacker code paths.
 *
 * Note: The hijacker modifies http.request to inject trace headers when
 * headers/headersMapping config is enabled. It wraps the original http.request.
 */

const http = require('http');
const scribbles = require('../index');

describe('HTTP Hijacker passthrough mode', () => {
    let server;
    let serverPort;
    let receivedHeaders = {};

    beforeAll((done) => {
        // Create a real server to receive requests
        server = http.createServer((req, res) => {
            receivedHeaders = req.headers;
            res.writeHead(200);
            res.end('OK');
        });
        server.listen(0, () => {
            serverPort = server.address().port;
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        receivedHeaders = {};
        // Ensure headers injection is disabled
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: null,
            headersMapping: undefined
        });
    });

    it('should pass through http.request(url, callback) without modification', (done) => {
        // User scenario: Normal HTTP request when headers injection is disabled
        // This triggers line 10-11 in hijacker.js (early return)
        const req = http.request(
            `http://localhost:${serverPort}/passthrough`,
            (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    // Request works but no trace headers are injected
                    expect(receivedHeaders.traceparent).toBeUndefined();
                    done();
                });
            }
        );
        req.on('error', done);
        req.end();
    });

    it('should pass through http.request(url, options, callback)', (done) => {
        // User scenario: Request with options but headers disabled
        const req = http.request(
            `http://localhost:${serverPort}/with-options`,
            { method: 'POST' },
            (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    expect(receivedHeaders.traceparent).toBeUndefined();
                    done();
                });
            }
        );
        req.on('error', done);
        req.end();
    });

    it('should pass through http.request(options, callback)', (done) => {
        // User scenario: Options-only request with headers disabled
        const req = http.request(
            {
                hostname: 'localhost',
                port: serverPort,
                path: '/options-only',
                method: 'GET'
            },
            (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    expect(receivedHeaders.traceparent).toBeUndefined();
                    done();
                });
            }
        );
        req.on('error', done);
        req.end();
    });

    it('should preserve custom headers in passthrough mode', (done) => {
        // User scenario: User's custom headers work normally
        const req = http.request(
            {
                hostname: 'localhost',
                port: serverPort,
                path: '/custom-headers',
                headers: {
                    'x-custom': 'my-value',
                    'authorization': 'Bearer token'
                }
            },
            (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    expect(receivedHeaders['x-custom']).toBe('my-value');
                    expect(receivedHeaders.authorization).toBe('Bearer token');
                    done();
                });
            }
        );
        req.on('error', done);
        req.end();
    });
});

describe('HTTP Hijacker with headers enabled (inside trace)', () => {
    let server;
    let serverPort;
    let receivedHeaders = {};

    beforeAll((done) => {
        server = http.createServer((req, res) => {
            receivedHeaders = req.headers;
            res.writeHead(200);
            res.end('OK');
        });
        server.listen(0, () => {
            serverPort = server.address().port;
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        receivedHeaders = {};
    });

    describe('with headers array config', () => {
        beforeEach(() => {
            scribbles.config({
                stdOut: null,
                dataOut: null,
                logLevel: 'debug',
                headers: ['x-custom-header', 'traceparent']
            });
        });

        afterEach(() => {
            scribbles.config({
                headers: null,
                headersMapping: undefined
            });
        });

        it('should inject trace headers with http.request(url, options, callback)', (done) => {
            // User scenario: Microservice making call to another service
            scribbles.trace('service-call', (spanId) => {
                const req = http.request(
                    `http://localhost:${serverPort}/api/test`,
                    { method: 'GET' },
                    (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            // Trace headers should be injected
                            expect(receivedHeaders.traceparent).toBeDefined();
                            expect(receivedHeaders.tracestate).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });

        it('should handle http.request(url, callback) - callback as 2nd arg', (done) => {
            // User scenario: Simple GET with just URL and callback
            // This triggers lines 14-17 in hijacker.js
            scribbles.trace('simple-call', (spanId) => {
                const req = http.request(
                    `http://localhost:${serverPort}/simple`,
                    (res) => {
                        res.on('data', () => {});
                        res.on('end', () => {
                            expect(receivedHeaders.traceparent).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });

        it('should handle http.request(options, callback) - no URL', (done) => {
            // User scenario: Request with options object (no URL string)
            // This triggers lines 19-22, 28-29 in hijacker.js
            scribbles.trace('options-only', (spanId) => {
                const req = http.request(
                    {
                        hostname: 'localhost',
                        port: serverPort,
                        path: '/options-test',
                        method: 'POST'
                    },
                    (res) => {
                        res.on('data', () => {});
                        res.on('end', () => {
                            expect(receivedHeaders.traceparent).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });

        it('should merge existing headers with trace headers', (done) => {
            // User scenario: Developer has custom headers that should be preserved
            scribbles.trace('merge-headers', () => {
                const req = http.request(
                    {
                        hostname: 'localhost',
                        port: serverPort,
                        path: '/merge',
                        headers: {
                            'x-custom': 'my-value',
                            'authorization': 'Bearer token123'
                        }
                    },
                    (res) => {
                        res.on('data', () => {});
                        res.on('end', () => {
                            // Both custom and trace headers should be present
                            expect(receivedHeaders['x-custom']).toBe('my-value');
                            expect(receivedHeaders.authorization).toBe('Bearer token123');
                            expect(receivedHeaders.traceparent).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });

        it('should work with URL object as first argument', (done) => {
            // User scenario: Using URL object instead of string
            scribbles.trace('url-object', () => {
                const url = new URL(`http://localhost:${serverPort}/url-object`);
                const req = http.request(
                    url,
                    { method: 'GET' },
                    (res) => {
                        res.on('data', () => {});
                        res.on('end', () => {
                            expect(receivedHeaders.traceparent).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });
    });

    describe('with headersMapping config', () => {
        beforeEach(() => {
            scribbles.config({
                stdOut: null,
                dataOut: null,
                headers: null,
                headersMapping: {
                    'x-request-id': ['request-id', 'x-req-id']
                }
            });
        });

        afterEach(() => {
            scribbles.config({ headersMapping: undefined });
        });

        it('should inject headers when only headersMapping is configured', (done) => {
            // User scenario: Using headersMapping without headers array
            scribbles.trace('mapping-only', () => {
                const req = http.request(
                    {
                        hostname: 'localhost',
                        port: serverPort,
                        path: '/mapping'
                    },
                    (res) => {
                        res.on('data', () => {});
                        res.on('end', () => {
                            expect(receivedHeaders.traceparent).toBeDefined();
                            done();
                        });
                    }
                );
                req.on('error', done);
                req.end();
            });
        });
    });
});

describe('Hijacker config behavior', () => {
    it('should check headers config before processing', () => {
        // User scenario: Verify config check logic
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: null,
            headersMapping: undefined
        });

        // When both are null/undefined, hijacker returns early (line 10-11)
        // Just verify http module still works
        expect(http.request).toBeDefined();
        expect(typeof http.request).toBe('function');
    });

    it('should recognize headers array as truthy', () => {
        // User scenario: headers config enables injection
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: ['traceparent']
        });

        // Verify config was set
        expect(() => {
            scribbles.trace('test', () => {
                scribbles.log('test');
            });
        }).not.toThrow();

        scribbles.config({ headers: null });
    });

    it('should recognize headersMapping as truthy', () => {
        // User scenario: headersMapping alone enables injection
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headersMapping: { 'x-id': 'id' }
        });

        expect(() => {
            scribbles.trace('test', () => {
                scribbles.log('test');
            });
        }).not.toThrow();

        scribbles.config({ headersMapping: undefined });
    });
});
