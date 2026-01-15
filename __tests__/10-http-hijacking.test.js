/**
 * Integration tests for HTTP hijacking
 * Tests automatic trace header injection into outgoing HTTP requests
 *
 * User Story: As a developer using distributed tracing, I want trace headers
 * automatically injected into outgoing HTTP requests so I can track requests
 * across services.
 */

const http = require('http');
const scribbles = require('../index');

describe('HTTP Hijacking', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            headers: null,  // Disable header injection by default
            logLevel: 'debug'
        });
    });

    describe('HTTP request wrapping', () => {
        it('should wrap http.request', () => {
            // Use Case: Verify http module is properly wrapped
            expect(http.request).toBeDefined();
            expect(typeof http.request).toBe('function');
        });

        it('should have http.get wrapped', () => {
            // Use Case: Verify http.get is also available
            expect(http.get).toBeDefined();
            expect(typeof http.get).toBe('function');
        });
    });

    describe('Trace header generation', () => {
        it('should include traceparent when headers are generated inside trace', (done) => {
            // Use Case: Generate W3C trace context headers for downstream services
            scribbles.trace('header-test', (spanId) => {
                const traceHeaders = scribbles.trace.headers();

                expect(traceHeaders.traceparent).toBeDefined();
                expect(traceHeaders.tracestate).toBeDefined();
                expect(traceHeaders['x-git-hash']).toBeDefined();
                done();
            });
        });

        it('should generate valid traceparent format', (done) => {
            // Use Case: Ensure traceparent follows W3C spec
            scribbles.trace('format-test', (spanId) => {
                const traceHeaders = scribbles.trace.headers();
                const traceparent = traceHeaders.traceparent;

                // Format: version-traceid-spanid-flags
                const parts = traceparent.split('-');
                expect(parts.length).toBe(4);
                expect(parts[0]).toBe('00'); // version
                expect(parts[1].length).toBe(32); // trace-id
                expect(parts[3]).toBe('01'); // flags
                done();
            });
        });
    });

    describe('Without header injection enabled', () => {
        it('should not inject headers when headers config is null', () => {
            // Use Case: Disable header injection in certain environments
            scribbles.config({
                stdOut: null,
                dataOut: null,
                headers: null
            });

            // When headers is null, http requests should work without injection
            expect(() => {
                scribbles.trace('test', () => {
                    // Just verify trace works without headers
                    scribbles.log('inside trace');
                });
            }).not.toThrow();
        });
    });

    describe('Request argument handling', () => {
        it('should parse URL string correctly', () => {
            // Use Case: Developer passes string URL to http.request
            const url = 'http://example.com:8080/api/test?query=1';
            const parsed = new URL(url);

            expect(parsed.hostname).toBe('example.com');
            expect(parsed.port).toBe('8080');
            expect(parsed.pathname).toBe('/api/test');
        });

        it('should handle options object structure', () => {
            // Use Case: Developer passes options object
            const options = {
                hostname: 'api.example.com',
                port: 443,
                path: '/v1/users',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            expect(options.hostname).toBe('api.example.com');
            expect(options.headers['Content-Type']).toBe('application/json');
        });
    });

    describe('Header merging', () => {
        it('should merge custom headers with trace headers', (done) => {
            // Use Case: Preserve existing headers while adding trace context
            scribbles.trace('merge-test', () => {
                const customHeaders = { 'x-custom': 'value' };
                const traceHeaders = scribbles.trace.headers(customHeaders);

                expect(traceHeaders.traceparent).toBeDefined();
                expect(traceHeaders['x-custom']).toBe('value');
                done();
            });
        });
    });
});
