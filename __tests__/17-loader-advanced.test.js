/**
 * Advanced integration tests for the loader (node-hook auto-instrumentation)
 *
 * Use Case: Developers use scribbles.log() with various argument types
 * The loader transforms these calls at require-time to inject file/line info
 *
 * These tests exercise complex argument parsing edge cases in loader.js
 */

const path = require('path');
const scribbles = require('../index');

describe('Loader Advanced Transformation', () => {
    let logs = [];
    let fixture;

    beforeAll(() => {
        // Require the loader to activate node-hook (may already be active)
        require('../src/parsing/loader');

        // Now require the advanced fixture - it gets transformed
        fixture = require('./fixtures/loader-advanced.stub');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('Function call results as arguments', () => {
        it('should handle function call result - getData()', () => {
            // Use Case: Developer logs result of a function call
            fixture.logWithFunctionCallResult();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-advanced');
            expect(logs[0].input.value).toEqual({ id: 123 });
        });

        it('should handle nested function calls', () => {
            fixture.logWithNestedCalls();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('HELLO');
        });
    });

    describe('Object argument patterns', () => {
        it('should handle object with numeric keys', () => {
            fixture.logWithNumericObjectKey();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value['0']).toBe('zero');
            expect(logs[0].input.value['1']).toBe('one');
        });

        it('should handle object with colon in value (URLs)', () => {
            // Use Case: Developer logs config with URLs
            fixture.logWithColonInValue();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value.url).toBe('http://localhost:3000');
        });

        it('should handle nested object with commas', () => {
            fixture.logWithNestedCommas();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value.a).toBe(1);
            expect(logs[0].input.value.c.d).toBe(3);
        });

        it('should handle inline object literal', () => {
            fixture.logWithInlineObject();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value.x).toBe(1);
        });

        it('should handle object with method values', () => {
            fixture.logWithMethodValue();

            expect(logs.length).toBe(1);
            expect(typeof logs[0].input.value.onClick).toBe('function');
        });
    });

    describe('Array argument patterns', () => {
        it('should handle array with multiple elements', () => {
            fixture.logWithArrayElements();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toContain('one');
            expect(logs[0].input.value.length).toBe(3);
        });

        it('should handle inline array literal', () => {
            fixture.logWithInlineArray();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toEqual([1, 2, 3]);
        });
    });

    describe('String and template literal patterns', () => {
        it('should handle template literal variable', () => {
            fixture.logWithTemplateLiteral();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('Hello, world!');
        });

        it('should handle template with expression', () => {
            fixture.logWithTemplateExpression();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('Total: 10');
        });

        it('should handle string literals', () => {
            fixture.logWithStringLiteral();

            expect(logs.length).toBe(2);
            expect(logs[0].input.value).toBe('Hello World');
            expect(logs[1].input.value).toBe('Single quotes');
        });
    });

    describe('Function argument patterns', () => {
        it('should handle arrow function', () => {
            // Use Case: Developer logs a callback handler
            fixture.logWithArrowFunction();

            expect(logs.length).toBe(1);
            expect(typeof logs[0].input.value).toBe('function');
        });

        it('should handle regular function', () => {
            // Use Case: Developer logs a processor function and then uses it
            fixture.logWithRegularFunction();

            expect(logs.length).toBe(1);
            expect(typeof logs[0].input.value).toBe('function');
            // Invoke the logged function to verify it works
            const processor = logs[0].input.value;
            expect(processor('test data')).toBe('test data');
        });
    });

    describe('Literal value patterns', () => {
        it('should handle undefined, true, false, null', () => {
            fixture.logWithLiteralValues();

            expect(logs.length).toBe(4);
            expect(logs[0].input.value).toBeUndefined();
            expect(logs[1].input.value).toBe(true);
            expect(logs[2].input.value).toBe(false);
            expect(logs[3].input.value).toBeNull();
        });

        it('should handle number literals', () => {
            fixture.logWithNumbers();

            expect(logs.length).toBe(3);
            expect(logs[0].input.value).toBe(42);
            expect(logs[1].input.value).toBe(-17);
            expect(logs[2].input.value).toBe(3.14);
        });

        it('should handle Date objects', () => {
            fixture.logWithDate();

            expect(logs.length).toBe(2);
            expect(logs[0].input.value).toBeInstanceOf(Date);
            expect(logs[1].input.value).toBeInstanceOf(Date);
        });
    });

    describe('Multi-line and complex patterns', () => {
        it('should handle multi-line call with many args', () => {
            fixture.logMultiLineWithManyArgs();

            expect(logs.length).toBe(1);
            expect(logs[0].context.fileName).toContain('loader-advanced');
        });

        it('should handle parenthesized expressions', () => {
            fixture.logWithParenExpression();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe(8);
        });
    });
});
