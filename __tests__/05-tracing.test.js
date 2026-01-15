/**
 * Integration tests for tracing system
 * Tests trace context creation and propagation
 */

const scribbles = require('../index');

describe('Tracing System', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            levels: ['error', 'warn', 'log', 'info', 'debug'],
            logLevel: 'debug',
            traceTrigger: undefined  // Reset trace trigger
        });
    });

    afterAll((done) => {
        // Allow time for any background status checks to complete
        setTimeout(done, 200);
    });

    describe('Basic trace creation', () => {
        it('should create trace with callback only', (done) => {
            scribbles.trace((spanId) => {
                expect(spanId).toBeDefined();
                expect(typeof spanId).toBe('string');
                expect(spanId.length).toBeGreaterThan(0);
                done();
            });
        });

        it('should create trace with label', (done) => {
            scribbles.trace('my-label', (spanId) => {
                scribbles.log('inside trace');

                expect(logs[0].trace.spanLabel).toBe('my-label');
                expect(logs[0].trace.spanId).toBe(spanId);
                done();
            });
        });

        it('should create trace with options object', (done) => {
            scribbles.trace({
                spanLabel: 'test-span'
            }, (spanId) => {
                scribbles.log('test');

                expect(logs[0].trace.spanLabel).toBe('test-span');
                done();
            });
        });
    });

    describe('Trace ID handling', () => {
        it('should generate unique trace IDs', (done) => {
            const traceIds = [];
            let completed = 0;

            for (let i = 0; i < 3; i++) {
                scribbles.trace((spanId) => {
                    scribbles.log(`trace ${i}`);
                    traceIds.push(logs[logs.length - 1].trace.traceId);
                    completed++;

                    if (completed === 3) {
                        // All trace IDs should be unique
                        const uniqueIds = new Set(traceIds);
                        expect(uniqueIds.size).toBe(3);
                        done();
                    }
                });
            }
        });

        it('should accept custom traceId', (done) => {
            const customTraceId = 'abc123def456';

            scribbles.trace({
                traceId: customTraceId
            }, (spanId) => {
                scribbles.log('test');

                expect(logs[0].trace.traceId).toBe(customTraceId);
                done();
            });
        });

        it('should parse W3C traceparent format', (done) => {
            const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

            scribbles.trace({
                traceId: traceparent
            }, (spanId) => {
                scribbles.log('test');

                // Should extract traceId from traceparent
                expect(logs[0].trace.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
                done();
            });
        });
    });

    describe('Span context', () => {
        it('should set spanId on log entries within trace', (done) => {
            scribbles.trace('test', (spanId) => {
                scribbles.log('message 1');
                scribbles.log('message 2');

                expect(logs[0].trace.spanId).toBe(spanId);
                expect(logs[1].trace.spanId).toBe(spanId);
                expect(logs[0].trace.spanId).toBe(logs[1].trace.spanId);
                done();
            });
        });

        it('should generate span64 (base64 spanId)', (done) => {
            scribbles.trace('test', (spanId) => {
                scribbles.log('test');

                expect(logs[0].trace.span64).toBeDefined();
                expect(typeof logs[0].trace.span64).toBe('string');
                done();
            });
        });
    });

    describe('Tracestate handling', () => {
        it('should parse tracestate string', (done) => {
            scribbles.trace({
                tracestate: 'vendor1=value1,vendor2=value2'
            }, (spanId) => {
                scribbles.log('test');

                expect(Array.isArray(logs[0].trace.tracestate)).toBe(true);
                expect(logs[0].trace.tracestate[0]).toEqual({ key: 'vendor1', value: 'value1' });
                expect(logs[0].trace.tracestate[1]).toEqual({ key: 'vendor2', value: 'value2' });
                done();
            });
        });

        it('should accept tracestate array directly', (done) => {
            const tracestate = [
                { key: 'v1', value: 'a' },
                { key: 'v2', value: 'b' }
            ];

            scribbles.trace({
                tracestate
            }, (spanId) => {
                scribbles.log('test');

                expect(logs[0].trace.tracestate).toEqual(tracestate);
                done();
            });
        });

        it('should default to empty tracestate', (done) => {
            scribbles.trace('test', (spanId) => {
                scribbles.log('test');

                expect(logs[0].trace.tracestate).toEqual([]);
                done();
            });
        });
    });

    describe('Async trace propagation', () => {
        it('should maintain trace context across setTimeout', (done) => {
            scribbles.trace('async-test', (spanId) => {
                scribbles.log('before timeout');

                setTimeout(() => {
                    scribbles.log('after timeout');

                    expect(logs[0].trace.spanId).toBe(logs[1].trace.spanId);
                    expect(logs[1].trace.spanLabel).toBe('async-test');
                    done();
                }, 10);
            });
        });

        it('should maintain trace context across Promise', (done) => {
            scribbles.trace('promise-test', (spanId) => {
                scribbles.log('before promise');

                Promise.resolve().then(() => {
                    scribbles.log('after promise');

                    expect(logs[0].trace.spanId).toBe(logs[1].trace.spanId);
                    done();
                });
            });
        });
    });

    describe('traceTrigger', () => {
        it('should store logs until trigger level is hit', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                traceTrigger: 'error',
                logLevel: 'debug'
            });

            scribbles.trace('trigger-test', (spanId) => {
                scribbles.info('log 1');  // Stored, not output
                scribbles.info('log 2');  // Stored, not output

                // At this point, nothing should be output yet
                expect(logs.length).toBe(0);

                scribbles.error('trigger!');  // This triggers flush

                // Now all logs should be output
                expect(logs.length).toBe(3);
                expect(logs[0].input.message).toBe('log 1');
                expect(logs[1].input.message).toBe('log 2');
                expect(logs[2].input.message).toBe('trigger!');
                done();
            });
        });

        it('should continue outputting after trigger is hit', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                traceTrigger: 'error',
                logLevel: 'debug'
            });

            scribbles.trace('trigger-test', (spanId) => {
                scribbles.error('trigger');  // Triggers immediately
                scribbles.info('after trigger');  // Should output immediately too

                expect(logs.length).toBe(2);
                done();
            });
        });

        it('should respect logLevel within traceTrigger', (done) => {
            scribbles.config({
                stdOut: null,
                dataOut: (data) => logs.push(data),
                traceTrigger: 'error',
                logLevel: 'warn',
                levels: ['error', 'warn', 'log', 'info', 'debug']
            });

            scribbles.trace('test', (spanId) => {
                scribbles.debug('below log level');  // Should not be stored or output
                scribbles.warn('at threshold');  // Stored
                scribbles.error('trigger');  // Triggers flush

                // debug should not appear since it's below logLevel
                expect(logs.length).toBe(2);
                expect(logs[0].input.message).toBe('at threshold');
                expect(logs[1].input.message).toBe('trigger');
                done();
            });
        });
    });

    describe('Logs outside trace context', () => {
        it('should work without trace context', () => {
            scribbles.log('no trace');

            expect(logs[0].trace.traceId).toBeUndefined();
            expect(logs[0].trace.spanId).toBeUndefined();
        });
    });
});
