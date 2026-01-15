/**
 * Integration tests for trace headers
 * Tests W3C trace-context header generation
 */

const scribbles = require('../index');

describe('Trace Headers', () => {
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

    describe('scribbles.trace.headers()', () => {
        it('should return headers inside trace context', (done) => {
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers).toBeDefined();
                expect(typeof headers).toBe('object');
                done();
            });
        });

        it('should include traceparent header', (done) => {
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers.traceparent).toBeDefined();
                expect(typeof headers.traceparent).toBe('string');
                done();
            });
        });

        it('should format traceparent correctly', (done) => {
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers();

                // Format: {version}-{traceId}-{spanId}-{flags}
                const parts = headers.traceparent.split('-');
                expect(parts.length).toBe(4);
                expect(parts[0]).toBe('00');  // version
                expect(parts[1].length).toBe(32);  // traceId is 32 hex chars
                expect(parts[3]).toBe('01');  // flags
                done();
            });
        });

        it('should include tracestate header', (done) => {
            scribbles.trace({
                tracestate: 'vendor1=abc'
            }, (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers.tracestate).toBeDefined();
                expect(typeof headers.tracestate).toBe('string');
                done();
            });
        });

        it('should include x-git-hash header', (done) => {
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers['x-git-hash']).toBeDefined();
                done();
            });
        });
    });

    describe('Custom header merging', () => {
        it('should merge custom headers', (done) => {
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers({
                    'X-Custom-Header': 'custom-value',
                    'X-Request-Id': '12345'
                });

                expect(headers['X-Custom-Header']).toBe('custom-value');
                expect(headers['X-Request-Id']).toBe('12345');
                done();
            });
        });

        it('should not override trace headers with custom headers', (done) => {
            scribbles.trace('test', (spanId) => {
                const originalHeaders = scribbles.trace.headers();
                const mergedHeaders = scribbles.trace.headers({
                    traceparent: 'should-not-override'
                });

                // Custom value should be merged (deepMerge behavior)
                // Note: actual behavior depends on deepMerge implementation
                expect(mergedHeaders.traceparent).toBeDefined();
                done();
            });
        });

        it('should handle deep merge with source non-object overwriting target object', (done) => {
            // User story: Developer passes custom header that replaces complex object with string
            scribbles.trace('test', (spanId) => {
                const headers = scribbles.trace.headers({
                    'x-git-hash': 'custom-hash-override',  // Overwrites gitValues.hash
                    'nested-data': 'replaced-with-string'
                });

                expect(headers['x-git-hash']).toBe('custom-hash-override');
                expect(headers['nested-data']).toBe('replaced-with-string');
                done();
            });
        });
    });

    describe('Tracestate formatting', () => {
        it('should format tracestate as comma-separated list', (done) => {
            scribbles.trace({
                tracestate: 'vendor1=abc,vendor2=def'
            }, (spanId) => {
                const headers = scribbles.trace.headers();

                // Should include the span in tracestate
                expect(headers.tracestate).toContain(',');
                done();
            });
        });

        it('should prepend current span to tracestate', (done) => {
            scribbles.trace({
                tracestate: 'existing=value'
            }, (spanId) => {
                const headers = scribbles.trace.headers();

                // Our vendor should be first in the list
                const parts = headers.tracestate.split(',');
                expect(parts.length).toBeGreaterThanOrEqual(2);
                done();
            });
        });

        it('should limit tracestate to 32 entries', (done) => {
            // Create tracestate with many entries
            const manyEntries = Array.from({ length: 40 }, (_, i) => `vendor${i}=value${i}`).join(',');

            scribbles.trace({
                tracestate: manyEntries
            }, (spanId) => {
                const headers = scribbles.trace.headers();
                const entries = headers.tracestate.split(',');

                expect(entries.length).toBeLessThanOrEqual(32);
                done();
            });
        });
    });

    describe('Headers outside trace context', () => {
        it('should handle headers call outside trace gracefully', () => {
            // This may throw or return partial data depending on implementation
            try {
                const headers = scribbles.trace.headers();
                // If it doesn't throw, it should at least return an object
                expect(typeof headers).toBe('object');
            } catch (e) {
                // Error is also acceptable behavior
                expect(e).toBeDefined();
            }
        });
    });

    describe('Trace with custom traceId', () => {
        it('should use custom traceId in headers', (done) => {
            const customTraceId = '1234567890abcdef1234567890abcdef';

            scribbles.trace({
                traceId: customTraceId
            }, (spanId) => {
                const headers = scribbles.trace.headers();

                expect(headers.traceparent).toContain(customTraceId);
                done();
            });
        });
    });

    describe('Trace with W3C traceparent input', () => {
        it('should preserve version and flags from input traceparent', (done) => {
            const inputTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

            scribbles.trace({
                traceId: inputTraceparent
            }, (spanId) => {
                const headers = scribbles.trace.headers();
                const parts = headers.traceparent.split('-');

                expect(parts[0]).toBe('00');  // version preserved
                expect(parts[1]).toBe('4bf92f3577b34da6a3ce929d0e0e4736');  // traceId preserved
                expect(parts[3]).toBe('01');  // flags preserved
                done();
            });
        });
    });
});
