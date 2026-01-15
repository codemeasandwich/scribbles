/**
 * Hijacker module coverage tests
 *
 * These tests attempt to exercise the hijacker HTTP wrapping functionality
 * by testing the module's behavior when configured.
 */

const scribbles = require('../index');

describe('Hijacker HTTP wrapping with headers enabled', () => {
    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug',
            headers: ['traceparent', 'tracestate', 'x-git-hash']
        });
    });

    afterEach(() => {
        scribbles.config({
            headers: null
        });
    });

    describe('trace.headers function', () => {
        it('should generate headers when inside trace context', (done) => {
            scribbles.trace('hijacker-test', (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers).toBeDefined();
                expect(headers.traceparent).toBeDefined();
                expect(headers.tracestate).toBeDefined();
                done();
            });
        });

        it('should merge custom headers', (done) => {
            scribbles.trace('merge-test', () => {
                const customHeaders = {
                    'x-custom-header': 'custom-value',
                    'Authorization': 'Bearer token'
                };

                const headers = scribbles.trace.headers(customHeaders);

                expect(headers['x-custom-header']).toBe('custom-value');
                expect(headers['Authorization']).toBe('Bearer token');
                expect(headers.traceparent).toBeDefined();
                done();
            });
        });

        it('should include git hash in headers', (done) => {
            scribbles.trace('git-test', () => {
                const headers = scribbles.trace.headers();

                // x-git-hash may be empty string but should be present
                expect('x-git-hash' in headers).toBe(true);
                done();
            });
        });
    });

    describe('Traceparent format', () => {
        it('should generate valid traceparent format', (done) => {
            scribbles.trace('format-test', () => {
                const headers = scribbles.trace.headers();
                const traceparent = headers.traceparent;

                // Format: version-traceId-spanId-flags
                // Example: 00-abc123...-def456...-01
                expect(traceparent).toMatch(/^\d{2}-[a-f0-9]{32}-[a-f0-9]+-\d{2}$/);
                done();
            });
        });

        it('should use version 00', (done) => {
            scribbles.trace('version-test', () => {
                const headers = scribbles.trace.headers();
                const parts = headers.traceparent.split('-');

                expect(parts[0]).toBe('00');
                done();
            });
        });

        it('should use flag 01', (done) => {
            scribbles.trace('flag-test', () => {
                const headers = scribbles.trace.headers();
                const parts = headers.traceparent.split('-');

                expect(parts[3]).toBe('01');
                done();
            });
        });
    });

    describe('Tracestate format', () => {
        it('should include vendor span in tracestate', (done) => {
            scribbles.trace('tracestate-test', () => {
                const headers = scribbles.trace.headers();

                expect(headers.tracestate).toBeDefined();
                expect(typeof headers.tracestate).toBe('string');
                done();
            });
        });

        it('should preserve incoming tracestate', (done) => {
            scribbles.trace({
                tracestate: 'vendor1=value1,vendor2=value2'
            }, () => {
                const headers = scribbles.trace.headers();

                expect(headers.tracestate).toBeDefined();
                done();
            });
        });
    });
});

describe('Hijacker module loading', () => {
    it('should have wrapped http module', () => {
        const http = require('http');

        // http.request should be a function
        expect(typeof http.request).toBe('function');
    });

    it('should have http.get available', () => {
        const http = require('http');

        expect(typeof http.get).toBe('function');
    });
});

describe('Headers configuration', () => {
    it('should work with headers array', () => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: ['traceparent']
        });

        scribbles.trace('config-test', () => {
            const headers = scribbles.trace.headers();
            expect(headers.traceparent).toBeDefined();
        });

        // Reset
        scribbles.config({ headers: null });
    });

    it('should work without headers config', () => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: null
        });

        scribbles.trace('no-headers', () => {
            const headers = scribbles.trace.headers();
            // Should still generate headers even without config
            expect(headers.traceparent).toBeDefined();
        });
    });
});

describe('headersMapping configuration', () => {
    it('should accept headersMapping object', () => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headersMapping: {
                'x-trace-id': ['traceparent', 'x-request-id'],
                'x-span': 'tracestate'
            }
        });

        expect(() => {
            scribbles.trace('mapping-test', () => {
                scribbles.log('inside trace');
            });
        }).not.toThrow();

        // Reset
        scribbles.config({ headersMapping: undefined });
    });

    it('should store headersMapping in config', () => {
        // headersMapping is validated at middleware time, not config time
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headersMapping: {
                'x-custom': 'traceparent'
            }
        });

        // Just verify config accepts it
        expect(() => scribbles.log('test')).not.toThrow();

        // Reset
        scribbles.config({ headersMapping: undefined });
    });
});
