/**
 * Integration tests for the loader (node-hook auto-instrumentation)
 * 
 * These tests verify the loader's behavior by:
 * 1. Requiring the loader to activate source transformation
 * 2. Requiring a fixture file that uses scribbles.log()
 * 3. Verifying the output includes injected file/line info
 */

const path = require('path');
const fs = require('fs');

describe('Loader Auto-instrumentation', () => {
    let logs = [];
    let scribbles;

    beforeAll(() => {
        // Require the loader FIRST - this activates node-hook
        require('../src/parsing/loader');

        // Now require scribbles
        scribbles = require('../index');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('Loader module availability', () => {
        it('should export the loader module', () => {
            const loaderPath = path.join(__dirname, '..', 'src', 'parsing', 'loader.js');
            expect(fs.existsSync(loaderPath)).toBe(true);
        });

        it('should have node-hook available', () => {
            expect(() => require('node-hook')).not.toThrow();
        });
    });

    describe('Source transformation', () => {
        let fixture;

        beforeAll(() => {
            // Require the fixture AFTER the loader is active
            fixture = require('./fixtures/loader-fixture.stub');
        });

        it('should transform simple log call and inject file location', () => {
            fixture.simpleLog();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-fixture');
            // Verify line number is a positive integer (exact value depends on fixture)
            expect(logs[0].context.lineNumber).toBeGreaterThan(0);
        });

        it('should transform log with variable', () => {
            fixture.logWithVariable();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-fixture');
            expect(logs[0].context.lineNumber).toBeGreaterThan(0);
        });

        it('should transform log with object argument', () => {
            fixture.logWithObject();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-fixture');
            expect(logs[0].input.value.id).toBe(123);
        });

        it('should transform error log', () => {
            fixture.errorLog();

            expect(logs.length).toBe(1);
            expect(logs[0].info.logLevel).toBe('error');
            expect(logs[0].context.fileName).toContain('loader-fixture');
        });

        it('should transform warn log', () => {
            fixture.warnLog();

            expect(logs.length).toBe(1);
            expect(logs[0].info.logLevel).toBe('warn');
            expect(logs[0].context.lineNumber).toBeGreaterThan(0);
        });

        it('should transform info log', () => {
            fixture.infoLog();

            expect(logs.length).toBe(1);
            expect(logs[0].info.logLevel).toBe('info');
            expect(logs[0].context.lineNumber).toBeGreaterThan(0);
        });

        it('should transform debug log', () => {
            fixture.debugLog();

            expect(logs.length).toBe(1);
            expect(logs[0].info.logLevel).toBe('debug');
            expect(logs[0].context.lineNumber).toBeGreaterThan(0);
        });

        it('should handle multi-line arguments', () => {
            fixture.multiLineArgs();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value.key).toBe('value');
        });

        it('should transform log with function variable', () => {
            // User story: Developer logs a callback function
            fixture.logWithFunctionVar();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-fixture');
        });

        it('should transform log with single variable', () => {
            // User story: Developer logs just a variable name
            fixture.logSingleVariable();

            expect(logs.length).toBe(1);
            expect(logs[0].input.message).toBe('Alice');
        });
    });

    describe('Output verification', () => {
        let fixture;

        beforeAll(() => {
            fixture = require('./fixtures/loader-fixture.stub');
        });

        it('should include line number in context', () => {
            fixture.simpleLog();

            expect(logs[0].context.lineNumber).toBeDefined();
            expect(typeof logs[0].context.lineNumber).toBe('number');
        });

        it('should include file name in context', () => {
            fixture.simpleLog();

            expect(logs[0].context.fileName).toBeDefined();
            expect(logs[0].context.fileName).toContain('loader-fixture');
        });
    });
});
