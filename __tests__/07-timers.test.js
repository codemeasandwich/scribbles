/**
 * Integration tests for timer functions
 * Tests scribbles.timer() and scribbles.timerEnd()
 */

const scribbles = require('../index');

describe('Timer Functions', () => {
    let logs = [];
    let stdOutCalls = [];

    beforeEach(() => {
        logs = [];
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: (data) => logs.push(data),
            levels: ['error', 'warn', 'log', 'info', 'debug'],
            logLevel: 'debug'
        });
    });

    describe('scribbles.timer()', () => {
        it('should start a timer with tag', () => {
            const result = scribbles.timer('test-timer');
            expect(result).toBeDefined();
            expect(result.info.logLevel).toBe('timer');
        });

        it('should include tag in output', () => {
            scribbles.timer('my-tag');
            expect(logs[0].input.value.tag).toBe('my-tag');
        });

        it('should accept optional message', () => {
            scribbles.timer('tag', 'starting operation');
            expect(stdOutCalls[0]).toContain('tag');
            expect(stdOutCalls[0]).toContain('starting operation');
        });

        it('should show zero elapsed time on first call', () => {
            scribbles.timer('fresh-timer');
            expect(logs[0].input.value.elapsed).toBe(0);
            expect(logs[0].input.value.increment).toBe(0);
        });
    });

    describe('Intermediate timer calls', () => {
        it('should track elapsed time on subsequent calls', (done) => {
            scribbles.timer('tracked');

            setTimeout(() => {
                scribbles.timer('tracked', 'checkpoint');
                expect(logs[1].input.value.elapsed).toBeGreaterThan(0);
                expect(logs[1].input.value.increment).toBeGreaterThan(0);
                done();
            }, 50);
        });

        it('should accumulate elapsed time correctly', (done) => {
            scribbles.timer('accumulate');

            setTimeout(() => {
                scribbles.timer('accumulate');
                const firstElapsed = logs[1].input.value.elapsed;

                setTimeout(() => {
                    scribbles.timer('accumulate');
                    const secondElapsed = logs[2].input.value.elapsed;
                    expect(secondElapsed).toBeGreaterThan(firstElapsed);
                    done();
                }, 50);
            }, 50);
        });
    });

    describe('scribbles.timerEnd()', () => {
        it('should end a timer', (done) => {
            scribbles.timer('end-test');

            setTimeout(() => {
                const result = scribbles.timerEnd('end-test');
                expect(result).toBeDefined();
                expect(result.info.logLevel).toBe('timerEnd');
                done();
            }, 50);
        });

        it('should show total elapsed time', (done) => {
            scribbles.timer('elapsed-test');

            setTimeout(() => {
                scribbles.timerEnd('elapsed-test');
                expect(logs[1].input.value.elapsed).toBeGreaterThan(40);
                expect(logs[1].input.value.elapsed).toBeLessThan(200);
                done();
            }, 50);
        });

        it('should accept optional message', (done) => {
            scribbles.timer('msg-test');

            setTimeout(() => {
                scribbles.timerEnd('msg-test', 'done!');
                expect(stdOutCalls[1]).toContain('done!');
                done();
            }, 10);
        });

        it('should remove timer after end', (done) => {
            scribbles.timer('remove-test');

            setTimeout(() => {
                scribbles.timerEnd('remove-test');
                // Starting the same timer again should start fresh
                scribbles.timer('remove-test');
                expect(logs[2].input.value.elapsed).toBe(0);
                done();
            }, 10);
        });
    });

    describe('Timer output format', () => {
        it('should format output with increment and elapsed', (done) => {
            scribbles.timer('format-test');

            setTimeout(() => {
                scribbles.timerEnd('format-test');
                // Format: tag (+Xms|Yms)
                expect(stdOutCalls[1]).toMatch(/\+[\d.]+ms/);
                expect(stdOutCalls[1]).toMatch(/\|[\d.]+ms/);
                done();
            }, 10);
        });

        it('should include tag and message in format', (done) => {
            scribbles.timer('my-tag');

            setTimeout(() => {
                scribbles.timerEnd('my-tag', 'finished');
                expect(stdOutCalls[1]).toContain('my-tag');
                expect(stdOutCalls[1]).toContain('finished');
                done();
            }, 10);
        });
    });

    describe('Multiple concurrent timers', () => {
        it('should track multiple timers independently', (done) => {
            scribbles.timer('timer-a');

            setTimeout(() => {
                scribbles.timer('timer-b');

                setTimeout(() => {
                    scribbles.timerEnd('timer-a');
                    scribbles.timerEnd('timer-b');

                    const timerAEnd = logs.find(l => l.input.value.tag === 'timer-a' && l.info.logLevel === 'timerEnd');
                    const timerBEnd = logs.find(l => l.input.value.tag === 'timer-b' && l.info.logLevel === 'timerEnd');

                    // Timer A should have more elapsed time than timer B
                    expect(timerAEnd.input.value.elapsed).toBeGreaterThan(timerBEnd.input.value.elapsed);
                    done();
                }, 30);
            }, 30);
        });
    });

    describe('Error cases', () => {
        it('should throw when ending non-existent timer', () => {
            expect(() => {
                scribbles.timerEnd('does-not-exist');
            }).toThrow();
        });

        it('should throw with descriptive message', () => {
            expect(() => {
                scribbles.timerEnd('missing-timer');
            }).toThrow(/missing-timer/);
        });
    });

    describe('Timer with numeric tag', () => {
        it('should convert numeric tag to string', () => {
            scribbles.timer(123);
            expect(logs[0].input.value.tag).toBe('123');
        });

        it('should work with timerEnd using same numeric tag', (done) => {
            scribbles.timer(456);

            setTimeout(() => {
                scribbles.timerEnd(456);
                expect(logs[1].input.value.tag).toBe('456');
                done();
            }, 10);
        });
    });
});
