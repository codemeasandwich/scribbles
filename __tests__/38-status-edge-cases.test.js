/**
 * E2E Tests: Status edge cases
 *
 * User Scenarios:
 * 1. Developer runs status() in a CLI script (not a server) - no port
 * 2. Process info commands return unexpected/empty output
 * 3. System commands fail
 */

// Create separate test files with isolated mocks
describe('Status Module - Edge Cases', () => {
    describe('Non-server process (no listening port)', () => {
        let status;

        beforeAll(() => {
            // Reset module cache to apply fresh mocks
            jest.resetModules();

            // Mock exec to return empty for lsof (no port)
            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }

                    // lsof returns empty - process is NOT listening on any port
                    if (command.includes('lsof')) {
                        callback(null, '', '');  // Empty = no port
                    }
                    // ps still returns valid data
                    else if (command.includes('ps -v')) {
                        const mockOutput = `${process.pid} S+   0:00.50  0  0      0 12345678    1234  -  0 0 1.5 0.5 node test`;
                        callback(null, mockOutput, '');
                    }
                    // netstat won't be called since there's no port
                    else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() returns port:null for CLI script', async () => {
            // Scenario: Developer runs scribbles.status() in a CLI tool
            // that isn't listening on any port
            const result = await status();

            // Port is under network object
            expect(result.network.port).toBeNull();
            expect(result.network.connections).toBe(0);
        });
    });

    describe('lsof returns data but no matching PID', () => {
        let status;

        beforeAll(() => {
            jest.resetModules();

            // Mock exec to return lsof output that doesn't match our PID
            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }

                    if (command.includes('lsof')) {
                        // Returns some other process's data, not ours
                        const otherPid = process.pid + 99999;
                        callback(null, `node    ${otherPid}    user   12u  IPv4 0x12345      0t0  TCP *:3000 (LISTEN)`, '');
                    }
                    else if (command.includes('ps -v')) {
                        const mockOutput = `${process.pid} S+   0:00.50  0  0      0 12345678    1234  -  0 0 1.5 0.5 node test`;
                        callback(null, mockOutput, '');
                    }
                    else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() returns port:null when lsof shows other processes', async () => {
            // Scenario: lsof returns output but it's for other processes
            const result = await status();

            expect(result.network.port).toBeNull();
        });
    });

    describe('ps -v returns no matching line', () => {
        let status;

        beforeAll(() => {
            jest.resetModules();

            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }

                    if (command.includes('lsof')) {
                        callback(null, '', '');
                    }
                    else if (command.includes('ps -v')) {
                        // Returns output that doesn't match our PID
                        const otherPid = process.pid + 99999;
                        callback(null, `${otherPid} S+   0:00.50  0  0      0 12345678    1234  -  0 0 1.5 0.5 node test`, '');
                    }
                    else {
                        callback(null, '', '');
                    }
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() returns default process info when ps has no match', async () => {
            // Scenario: ps command doesn't return our process (edge case)
            const result = await status();

            // Should return default values (0 for cpu/mem)
            expect(result.process.percUsedCpu).toBe(0);
            expect(result.process.percFreeMem).toBe(0);
        });
    });

    describe('Command execution error handling', () => {
        let status;

        beforeAll(() => {
            jest.resetModules();

            jest.doMock('child_process', () => ({
                exec: jest.fn((command, options, callback) => {
                    if (typeof options === 'function') {
                        callback = options;
                    }

                    // Simulate command failure (e.g., command not found)
                    // But return empty stdout instead of error so promise doesn't reject
                    callback(new Error('Command failed'), '', 'stderr output');
                }),
                execSync: jest.requireActual('child_process').execSync
            }));

            status = require('../src/system/status');
        });

        afterAll(() => {
            jest.resetModules();
            jest.unmock('child_process');
        });

        test('status() handles command failures gracefully', async () => {
            // Scenario: System commands fail (e.g., lsof not available)
            // The cliInfo function sets stdout to "" on error
            const result = await status();

            // Should still return a result with defaults
            expect(result).toBeDefined();
            expect(result.state).toBeDefined();
        });
    });
});
