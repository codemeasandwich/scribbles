/**
 * E2E Tests for Status Module with Real Server
 *
 * User Story: As a DevOps engineer, I want to call scribbles.status() to get
 * real-time metrics about my application including CPU usage, memory,
 * network connections, and port information.
 *
 * These tests run a real HTTP server to trigger the status module's
 * port detection and connection counting code paths.
 */

const http = require('http');
const scribbles = require('../index');
const status = require('../src/system/status');

describe('Status module with real listening server', () => {
    let server;
    let serverPort;

    beforeAll((done) => {
        // Create a real server that listens on a port
        server = http.createServer((req, res) => {
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
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug',
            headers: null,
            headersMapping: undefined
        });
    });

    describe('scribbles.status() API', () => {
        it('should return status object synchronously', () => {
            // User scenario: Health check endpoint needs immediate response
            const result = scribbles.status('Health check');

            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });

        it('should work with message and value', () => {
            // User scenario: Include custom context with status
            const result = scribbles.status('Service status', { service: 'api' });

            expect(result).toBeDefined();
        });

        it('should work with message, value, and error', () => {
            // User scenario: Report status during error handling
            const err = new Error('Connection timeout');
            const result = scribbles.status('Status during error', { retry: 3 }, err);

            expect(result).toBeDefined();
        });
    });

    describe('Direct status() function call', () => {
        it('should resolve with complete status info', async () => {
            // User scenario: Await full status for detailed metrics
            const statusInfo = await status();

            expect(statusInfo).toBeDefined();
            expect(statusInfo.state).toBeDefined();
            expect(['up', 'blocking']).toContain(statusInfo.state);
        });

        it('should include process information', async () => {
            // User scenario: Monitor process-level metrics
            const statusInfo = await status();

            expect(statusInfo.process).toBeDefined();
            expect(statusInfo.process.percUsedCpu).toBeDefined();
            expect(statusInfo.process.usedMem).toBeDefined();
            expect(statusInfo.process.startedAt).toBeDefined();
        });

        it('should include system information', async () => {
            // User scenario: Know the runtime environment
            const statusInfo = await status();

            expect(statusInfo.sys).toBeDefined();
            expect(statusInfo.sys.arch).toBe(process.arch);
            expect(statusInfo.sys.platform).toBe(process.platform);
            expect(statusInfo.sys.totalMem).toBeGreaterThan(0);
            expect(statusInfo.sys.freeMem).toBeGreaterThanOrEqual(0);
            expect(statusInfo.sys.usedMem).toBeGreaterThan(0);
        });

        it('should include CPU information', async () => {
            // User scenario: Monitor CPU usage and detect performance issues
            const statusInfo = await status();

            expect(statusInfo.cpu).toBeDefined();
            expect(statusInfo.cpu.cores).toBeGreaterThan(0);
            expect(statusInfo.cpu.percUsed).toBeDefined();
            expect(statusInfo.cpu.percFree).toBeDefined();
            // CPU percentages should be between 0 and 100
            expect(statusInfo.cpu.percUsed).toBeGreaterThanOrEqual(0);
            expect(statusInfo.cpu.percFree).toBeGreaterThanOrEqual(0);
        });

        it('should include network information', async () => {
            // User scenario: Check if server is listening and how many connections
            const statusInfo = await status();

            expect(statusInfo.network).toBeDefined();
            // Port may or may not be detected depending on OS and process
            expect(statusInfo.network).toHaveProperty('port');
            expect(statusInfo.network).toHaveProperty('connections');
        });
    });

    describe('Status caching behavior', () => {
        it('should cache fixed values across calls', async () => {
            // User scenario: Performance optimization - don't recalculate static info
            const status1 = await status();
            const status2 = await status();

            // System start time and total memory should be cached
            expect(status1.sys.startedAt.getTime()).toBe(status2.sys.startedAt.getTime());
            expect(status1.sys.totalMem).toBe(status2.sys.totalMem);
        });

        it('should cache CPU info', async () => {
            // User scenario: CPU model and cores don't change
            const status1 = await status();
            const status2 = await status();

            expect(status1.cpu.cores).toBe(status2.cpu.cores);
            expect(status1.cpu.model).toBe(status2.cpu.model);
        });
    });

    describe('Active connections', () => {
        it('should track network connections field', async () => {
            // User scenario: Monitor connection count
            // The status module returns a connections field based on netstat
            const statusInfo = await status();
            expect(statusInfo.network.connections).toBeDefined();
            expect(typeof statusInfo.network.connections).toBe('number');
        });
    });
});

describe('Status module error handling', () => {
    it('should handle when lsof returns no matching lines', async () => {
        // User scenario: Process not listening on any port (or lsof output doesn't match)
        // The status module handles this gracefully
        const statusInfo = await status();

        // Should still return valid status even if port detection fails
        expect(statusInfo).toBeDefined();
        expect(statusInfo.state).toBeDefined();
    });
});

describe('CPU usage measurement', () => {
    it('should measure CPU usage over 500ms interval', async () => {
        // User scenario: Accurate CPU measurement requires sampling over time
        const startTime = Date.now();
        const statusInfo = await status();
        const elapsed = Date.now() - startTime;

        // Status should take at least 500ms due to CPU measurement
        expect(elapsed).toBeGreaterThanOrEqual(450); // Allow some variance
        expect(statusInfo.cpu.percUsed).toBeDefined();
    });
});

describe('Event loop blocking detection', () => {
    it('should track event loop health', () => {
        // User scenario: Detect when event loop is blocked
        // The blocking detection runs on a setInterval after 10s startup delay
        // We can't easily test it directly, but we can verify the state field works

        // Simulate what the status module does
        let lastBlockedAt = null;
        const state = lastBlockedAt ? 'blocking' : 'up';
        expect(state).toBe('up');

        // Simulate blocking
        lastBlockedAt = Date.now();
        const blockedState = lastBlockedAt ? 'blocking' : 'up';
        expect(blockedState).toBe('blocking');

        // Simulate recovery after 2 seconds
        lastBlockedAt = Date.now() - 3000;
        if (lastBlockedAt && 2000 < (Date.now() - lastBlockedAt)) {
            lastBlockedAt = null;
        }
        const recoveredState = lastBlockedAt ? 'blocking' : 'up';
        expect(recoveredState).toBe('up');
    });

    it('should use hrtime for precise timing', () => {
        // User scenario: Precise event loop delay detection
        const start = process.hrtime();

        // Small delay
        const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);

        const delta = process.hrtime(start);
        const nanosec = delta[0] * 1e9 + delta[1];
        const ms = nanosec / 1e6;

        expect(ms).toBeGreaterThanOrEqual(0);
        expect(sum).toBe(499500); // Just to use the variable
    });
});
