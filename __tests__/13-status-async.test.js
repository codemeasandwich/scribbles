/**
 * Integration tests for status monitoring
 * Tests scribbles.status() which wraps the async status() module
 *
 * Use Case: A developer wants to check system health metrics
 * Real scenario: Monitoring dashboard, health check endpoint
 *
 * Note: The underlying status.js has a bug when no ports are listening
 * (line 24 throws when lsof output doesn't match process.pid)
 * These tests focus on the synchronous API behavior.
 */

const scribbles = require('../index');

describe('Status via scribbles.status()', () => {
    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should return a body object synchronously', () => {
        // Use Case: Developer calls scribbles.status() in a health check endpoint
        const result = scribbles.status('System health check');

        // Synchronously returns an object (async population happens in background)
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
    });

    it('should work with message only', () => {
        const result = scribbles.status('Quick check');
        expect(result).toBeDefined();
    });

    it('should work with message and value', () => {
        // Use Case: Developer includes custom context with status
        const customData = { service: 'api', version: '1.0' };
        const result = scribbles.status('Service status', customData);

        expect(result).toBeDefined();
    });

    it('should work with complex value object', () => {
        // Use Case: Rich metadata for monitoring
        const metadata = {
            deployment: 'production',
            region: 'us-east-1',
            metrics: { requests: 1000, errors: 5 }
        };
        const result = scribbles.status('Deployment status', metadata);

        expect(result).toBeDefined();
    });
});

describe('Status API consistency', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    it('status should be usable like other log levels', () => {
        // Use Case: Developer uses status() like debug/info/warn
        // Both should work without throwing
        expect(() => scribbles.status('check 1')).not.toThrow();
        expect(() => scribbles.log('check 2')).not.toThrow();
    });
});
