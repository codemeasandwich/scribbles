/**
 * Integration tests for deep merge functionality via trace headers
 *
 * Use Cases: Developers use scribbles.trace.headers() to merge custom headers
 * with trace context. The deep merge function handles various edge cases.
 *
 * Note: trace.headers() returns a NEW merged object each call, not persistent state.
 * It merges: base trace headers + stored headers from trace opts + customHeader param
 */

const scribbles = require('../index');

describe('Use Case: Deep Merge via Trace Headers', () => {
    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });
    });

    describe('Merging primitives with objects', () => {
        it('should handle undefined source (return target as-is)', (done) => {
            // Use Case: Developer calls headers() with no custom headers
            scribbles.trace({ spanLabel: 'test' }, () => {
                const headers = scribbles.trace.headers(undefined);

                // Should return standard headers without merging
                expect(headers.traceparent).toBeDefined();
                done();
            });
        });

        it('should handle null source gracefully', (done) => {
            // Use Case: Developer passes null (deepMerge handles this)
            scribbles.trace({ spanLabel: 'test' }, () => {
                const headers = scribbles.trace.headers(null);

                // deepMerge returns target when source is not an object
                expect(headers.traceparent).toBeDefined();
                done();
            });
        });
    });

    describe('Nested object merging', () => {
        it('should recursively merge nested objects', (done) => {
            // Use Case: Developer passes complex nested metadata
            scribbles.trace({ spanLabel: 'test' }, () => {
                const headers = scribbles.trace.headers({
                    'x-metadata': {
                        level1: {
                            level2: {
                                value: 'deep'
                            }
                        }
                    }
                });

                expect(headers['x-metadata'].level1.level2.value).toBe('deep');
                done();
            });
        });

        it('should handle target object with source primitive', (done) => {
            // Use Case: Trace headers have base headers object, merging with new custom
            scribbles.trace({
                spanLabel: 'test',
                headers: { 'x-existing': { nested: 'value' } }
            }, () => {
                // Merge custom header that overwrites with primitive
                const headers = scribbles.trace.headers({
                    'x-existing': 'simple-string'
                });

                // Source primitive should overwrite target object
                expect(headers['x-existing']).toBe('simple-string');
                done();
            });
        });

        it('should handle target primitive with source object', (done) => {
            // Use Case: Upgrade a simple header to complex object
            scribbles.trace({
                spanLabel: 'test',
                headers: { 'x-simple': 'value' }
            }, () => {
                const headers = scribbles.trace.headers({
                    'x-simple': { complex: 'object' }
                });

                // Source object should overwrite target primitive
                expect(headers['x-simple'].complex).toBe('object');
                done();
            });
        });

        it('should recursively merge when both target and source are objects', (done) => {
            // Use Case: Enrich existing object with more fields
            scribbles.trace({
                spanLabel: 'test',
                headers: { 'x-request': { method: 'GET', path: '/api' } }
            }, () => {
                const headers = scribbles.trace.headers({
                    'x-request': { timestamp: 12345, status: 200 }
                });

                // Both objects should be merged recursively
                expect(headers['x-request'].method).toBe('GET');
                expect(headers['x-request'].path).toBe('/api');
                expect(headers['x-request'].timestamp).toBe(12345);
                expect(headers['x-request'].status).toBe(200);
                done();
            });
        });
    });

    describe('Array merging (concatenation)', () => {
        it('should concatenate arrays when both target and source have arrays', (done) => {
            // Use Case: Base headers have tags, adding more tags
            scribbles.trace({
                spanLabel: 'test',
                headers: { 'x-tags': ['important', 'urgent'] }
            }, () => {
                const headers = scribbles.trace.headers({
                    'x-tags': ['billing', 'customer']
                });

                // Arrays should be concatenated
                expect(headers['x-tags']).toContain('important');
                expect(headers['x-tags']).toContain('urgent');
                expect(headers['x-tags']).toContain('billing');
                expect(headers['x-tags']).toContain('customer');
                expect(headers['x-tags'].length).toBe(4);
                done();
            });
        });

        it('should handle array replaced by non-array', (done) => {
            // Use Case: Developer replaces array with single value
            scribbles.trace({
                spanLabel: 'test',
                headers: { 'x-list': ['a', 'b', 'c'] }
            }, () => {
                const headers = scribbles.trace.headers({
                    'x-list': 'single-value'
                });

                // Non-array source overwrites array target
                expect(headers['x-list']).toBe('single-value');
                done();
            });
        });
    });

    describe('Inherited properties handling', () => {
        it('should only merge own properties', (done) => {
            // Use Case: Custom headers object with prototype chain
            scribbles.trace({ spanLabel: 'test' }, () => {
                // Create object with inherited property
                const proto = { inherited: 'should-not-merge' };
                const customHeaders = Object.create(proto);
                customHeaders.own = 'should-merge';

                const headers = scribbles.trace.headers(customHeaders);

                expect(headers.own).toBe('should-merge');
                // hasOwnProperty check in deepMerge skips inherited
                done();
            });
        });
    });
});

describe('Use Case: Complex Header Scenarios', () => {
    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should handle mixed types in nested structure', (done) => {
        // Use Case: Real-world complex metadata
        scribbles.trace({ spanLabel: 'api-request' }, () => {
            const headers = scribbles.trace.headers({
                'x-request': {
                    method: 'POST',
                    path: '/api/users',
                    headers: ['Content-Type', 'Authorization'],
                    meta: {
                        timestamp: 12345,
                        retries: 0
                    }
                }
            });

            expect(headers['x-request'].method).toBe('POST');
            expect(headers['x-request'].headers).toContain('Content-Type');
            expect(headers['x-request'].meta.timestamp).toBe(12345);
            done();
        });
    });

    it('should merge base headers with custom headers', (done) => {
        // Use Case: Trace starts with some headers, adding more via headers()
        scribbles.trace({
            spanLabel: 'lifecycle',
            headers: {
                'x-user-id': 'user-123',
                'x-session': { id: 'sess-456' }
            }
        }, () => {
            // Add more headers - should merge with existing
            const headers = scribbles.trace.headers({
                'x-request-id': 'req-789',
                'x-session': { lastActive: 'now' }
            });

            // Base headers
            expect(headers['x-user-id']).toBe('user-123');
            // New header
            expect(headers['x-request-id']).toBe('req-789');
            // Merged nested object
            expect(headers['x-session'].id).toBe('sess-456');
            expect(headers['x-session'].lastActive).toBe('now');
            done();
        });
    });

    it('should include trace context headers', (done) => {
        // Use Case: Developer needs trace IDs for downstream calls
        scribbles.trace({
            spanLabel: 'downstream-call',
            traceId: 'abc123def456'
        }, () => {
            const headers = scribbles.trace.headers({
                'x-custom': 'value'
            });

            expect(headers.traceparent).toBeDefined();
            expect(headers.tracestate).toBeDefined();
            expect(headers['x-git-hash']).toBeDefined();
            expect(headers['x-custom']).toBe('value');
            done();
        });
    });
});
