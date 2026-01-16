/**
 * E2E Tests: Status module - Error handling & Event loop blocking
 *
 * User Scenarios:
 * 1. Developer calls status() and internal processing fails - they need to catch the error
 * 2. Developer has CPU-intensive code blocking the event loop - status reports 'blocking' state
 * 3. Event loop recovers after being blocked - status returns to 'up' state
 */

describe('Status Module - Error Propagation', () => {
    describe('When internal processing throws an error', () => {
        let status;

        beforeAll(() => {
            jest.resetModules();

            // Mock exec to return data that will cause an error in the promise chain
            // Return empty ps output so matchingLine is undefined, which will cause
            // the destructuring to fail when trying to split it
            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }

                    if (command.includes('lsof')) {
                        callback(null, '', '');
                    }
                    else if (command.includes('ps -v')) {
                        // Return completely empty - no lines at all
                        // This triggers the fallback path with null stats
                        callback(null, '', '');
                    }
                    else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            // Mock os.cpus() to return empty array to trigger error in getCPUInfo
            jest.doMock('os', () => {
                const actualOs = jest.requireActual('os');
                return {
                    ...actualOs,
                    cpus: () => {
                        // Throw on first call to trigger the catch block
                        throw new Error('CPU info unavailable');
                    }
                };
            });

            status = require('../src/system/status');
        });

        afterAll(() => {
            jest.resetModules();
            jest.unmock('child_process');
            jest.unmock('os');
        });

        test('status() rejects with error that developer can catch', async () => {
            // Scenario: Developer calls status() on a system where os.cpus() fails
            // They need to handle this gracefully in their monitoring code
            await expect(status()).rejects.toThrow('CPU info unavailable');
        });
    });
});

describe('Status Module - Event Loop Blocking Detection', () => {
    describe('When CPU-intensive code blocks the event loop', () => {
        let status;
        let originalHrtime;
        let hrtimeCallCount;

        beforeAll(() => {
            jest.useFakeTimers();
            jest.resetModules();

            // Track hrtime calls to simulate blocking
            hrtimeCallCount = 0;
            originalHrtime = process.hrtime;

            // Mock hrtime to simulate event loop blocking
            process.hrtime = jest.fn((start) => {
                hrtimeCallCount++;
                if (start) {
                    // When measuring delta, simulate a blocked event loop (200ms delay)
                    // interval=100, threshold=15, so n > 15 triggers blocking
                    // n = ms - interval = 200 - 100 = 100 > 15
                    if (hrtimeCallCount <= 4) {
                        return [0, 200 * 1e6]; // 200ms - blocked
                    } else {
                        return [0, 100 * 1e6]; // 100ms - normal (n = 0, not > 15)
                    }
                }
                return [0, 0]; // Start time
            });

            // Mock exec for status() calls
            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }
                    if (command.includes('lsof')) {
                        callback(null, '', '');
                    } else if (command.includes('ps -v')) {
                        const mockOutput = `${process.pid} S+   0:00.50  0  0      0 12345678    1234  -  0 0 1.5 0.5 node test`;
                        callback(null, mockOutput, '');
                    } else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            process.hrtime = originalHrtime;
            jest.useRealTimers();
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() reports "blocking" state when event loop is blocked', async () => {
            // Scenario: Developer has image processing code that blocks for 200ms
            // The monitoring interval detects this and sets state to 'blocking'

            // Advance past the 10-second startup delay
            jest.advanceTimersByTime(10001);

            // Trigger the first interval check (should detect blocking)
            jest.advanceTimersByTime(100);

            // Allow the status() promise to resolve
            jest.useRealTimers();

            // Give a small delay for async operations
            await new Promise(resolve => setTimeout(resolve, 600));

            const result = await status();

            // The event loop was blocked, so state should be 'blocking'
            expect(result.state).toBe('blocking');
        });
    });

    describe('When event loop recovers from blocking', () => {
        let status;
        let originalHrtime;
        let simulateBlocking;

        beforeAll(() => {
            jest.useFakeTimers();
            jest.resetModules();

            simulateBlocking = true;
            originalHrtime = process.hrtime;

            // Mock hrtime - initially blocking, then normal
            process.hrtime = jest.fn((start) => {
                if (start) {
                    if (simulateBlocking) {
                        return [0, 200 * 1e6]; // 200ms - blocked
                    } else {
                        return [0, 100 * 1e6]; // 100ms - normal
                    }
                }
                return [0, 0];
            });

            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }
                    if (command.includes('lsof')) {
                        callback(null, '', '');
                    } else if (command.includes('ps -v')) {
                        const mockOutput = `${process.pid} S+   0:00.50  0  0      0 12345678    1234  -  0 0 1.5 0.5 node test`;
                        callback(null, mockOutput, '');
                    } else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            process.hrtime = originalHrtime;
            jest.useRealTimers();
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() returns to "up" state after event loop recovers', async () => {
            // Scenario: Developer's heavy computation finishes, event loop recovers
            // After 2+ seconds of normal operation, state returns to 'up'

            // Start the monitoring (past 10-second delay)
            jest.advanceTimersByTime(10001);

            // Trigger blocking detection
            jest.advanceTimersByTime(100);

            // Now simulate recovery - event loop is no longer blocked
            simulateBlocking = false;

            // Advance 2+ seconds for the recovery detection
            jest.advanceTimersByTime(2100);

            // Switch to real timers for async status() call
            jest.useRealTimers();

            await new Promise(resolve => setTimeout(resolve, 600));

            const result = await status();

            // After 2+ seconds of normal operation, state should be 'up'
            expect(result.state).toBe('up');
        });
    });
});
