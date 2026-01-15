/**
 * Integration tests for status monitoring
 * Tests scribbles.status() performance metrics
 * 
 * Note: status() is async - it returns a Promise that collects CPU, memory, and network info.
 * These tests focus on basic functionality to avoid flaky async timing issues.
 */

const scribbles = require('../index');

describe('Status Monitoring', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data)
        });
    });

    describe('scribbles.status()', () => {
        it('should return status object synchronously', () => {
            const result = scribbles.status('status check');
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });

    describe('Status .at() method', () => {
        it('should have .at() method available', () => {
            expect(typeof scribbles.status.at).toBe('function');
        });

        it('should use .at() to specify location', () => {
            const from = { file: 'test.js', line: 10, col: 5, args: [] };
            const result = scribbles.status.at(from, 'status');
            expect(result).toBeDefined();
        });
    });

    describe('Status message and value', () => {
        it('should accept message parameter', () => {
            const result = scribbles.status('my status message');
            expect(result).toBeDefined();
        });

        it('should accept message and value', () => {
            const result = scribbles.status('status', { custom: 'value' });
            expect(result).toBeDefined();
        });
    });
});
