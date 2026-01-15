/**
 * Integration tests for stringify edge cases
 *
 * Use Case: Developers log various data types with different formatting options
 * The stringify module handles object/array serialization for output
 */

const scribbles = require('../index');

describe('Use Case: Arrow Function Name Handling', () => {
    // Exercises stringify.js:97-100 - arrow function name matching

    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle named arrow function where key matches name', () => {
        // Use Case: Developer defines arrow function with shorthand property
        const myHandler = (x) => x * 2;
        const handlers = { myHandler };

        scribbles.log('h', handlers);

        // The function should be shown with its name
        expect(stdOutCalls[0]).toContain('myHandler');
    });

    it('should handle anonymous arrow function', () => {
        // Use Case: Inline arrow function definition
        const handlers = { onClick: (e) => e.target };

        scribbles.log('h', handlers);

        expect(stdOutCalls[0]).toContain('onClick');
        expect(stdOutCalls[0]).toContain('=>');
    });

    it('should show empty name for arrow function assigned to different key', () => {
        // Use Case: Arrow function where property name differs from function name
        const original = (x) => x;
        const obj = { different: original };

        scribbles.log('fns', obj);

        // Should show the arrow function with its name if it has one
        expect(stdOutCalls[0]).toContain('=>');
    });
});

describe('Use Case: String with Newlines/Carriage Returns', () => {
    // Exercises stringify.js:213 - newline/carriage return escaping

    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should escape newlines in string values', () => {
        // Use Case: Developer logs multi-line string content
        scribbles.log('text', { content: 'line1\nline2\nline3' });

        // Newlines should be escaped as \\n
        expect(stdOutCalls[0]).toContain('\\n');
    });

    it('should escape carriage returns in string values', () => {
        // Use Case: Windows-style line endings
        scribbles.log('text', { content: 'line1\r\nline2' });

        // Carriage returns should be escaped
        expect(stdOutCalls[0]).toContain('\\r');
        expect(stdOutCalls[0]).toContain('\\n');
    });
});

describe('Use Case: Regular Function Name Handling', () => {
    // Exercises stringify.js:102-106 - regular function name handling

    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should show ƒ for function where key equals function name', () => {
        // Use Case: Function with same name as property key
        function myFunc() { return true; }
        const obj = { myFunc };

        scribbles.log('fns', obj);

        // When key matches function.name, shows ƒ
        expect(stdOutCalls[0]).toContain('ƒ');
    });

    it('should show function name when key differs from function name', () => {
        // Use Case: Function assigned to different property name
        function originalName() { return true; }
        const obj = { differentKey: originalName };

        scribbles.log('fns', obj);

        // Should show the original function name
        expect(stdOutCalls[0]).toContain('originalName');
    });
});

describe('Use Case: Complex Nested Structures', () => {
    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: {
                inlineCharacterLimit: Number.POSITIVE_INFINITY
            }
        });
    });

    it('should handle deeply nested arrays', () => {
        // Use Case: Developer logs complex data structures
        scribbles.log('data', { items: [[1, 2], [3, 4]] });

        expect(stdOutCalls[0]).toBeDefined();
        expect(stdOutCalls[0]).toContain('[');
    });

    it('should handle mixed types in arrays', () => {
        scribbles.log('mixed', [1, 'two', { three: 3 }, [4, 5]]);

        expect(stdOutCalls[0]).toBeDefined();
        expect(stdOutCalls[0]).toContain('two');
        expect(stdOutCalls[0]).toContain('three');
    });
});

describe('Use Case: Circular Reference Handling', () => {
    // Exercises stringify.js:69-74 - circular reference detection

    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle circular object reference', () => {
        // Use Case: Object references itself
        const obj = { name: 'parent' };
        obj.self = obj;

        scribbles.log('circular', obj);

        // Should not throw and should indicate circular reference
        expect(stdOutCalls[0]).toContain('...');
    });

    it('should handle circular array reference', () => {
        // Use Case: Array contains itself
        const arr = [1, 2, 3];
        arr.push(arr);

        scribbles.log('circular', arr);

        expect(stdOutCalls[0]).toContain('...');
    });
});

describe('Use Case: Special Object Types', () => {
    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle Set objects', () => {
        // Use Case: Developer logs a Set
        const mySet = new Set([1, 2, 3]);
        scribbles.log('set', mySet);

        expect(stdOutCalls[0]).toContain('Set');
    });

    it('should handle Map objects', () => {
        // Use Case: Developer logs a Map
        const myMap = new Map([['key1', 'val1'], ['key2', 'val2']]);
        scribbles.log('map', myMap);

        expect(stdOutCalls[0]).toContain('Map');
    });

    it('should handle Buffer objects', () => {
        // Use Case: Developer logs binary data
        const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        scribbles.log('buf', buf);

        expect(stdOutCalls[0]).toContain('Buffer');
    });

    it('should handle Error objects', () => {
        // Use Case: Developer logs an error directly
        const err = new Error('test error');
        scribbles.log('err', { error: err });

        expect(stdOutCalls[0]).toContain('Error');
        expect(stdOutCalls[0]).toContain('test error');
    });

    it('should handle RegExp objects', () => {
        // Use Case: Developer logs a regex pattern
        const regex = /test\d+/gi;
        scribbles.log('pattern', { regex });

        expect(stdOutCalls[0]).toContain('/test');
    });

    it('should handle Date objects', () => {
        // Use Case: Developer logs a date
        const date = new Date('2024-01-15T10:30:00.000Z');
        scribbles.log('date', { timestamp: date });

        expect(stdOutCalls[0]).toContain('Date');
    });
});

describe('Use Case: Primitive Values', () => {
    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle null in objects', () => {
        scribbles.log('data', { value: null });
        expect(stdOutCalls[0]).toContain('null');
    });

    it('should handle undefined in objects', () => {
        scribbles.log('data', { value: undefined });
        expect(stdOutCalls[0]).toContain('undefined');
    });

    it('should handle booleans in objects', () => {
        scribbles.log('data', { isTrue: true, isFalse: false });
        expect(stdOutCalls[0]).toContain('true');
        expect(stdOutCalls[0]).toContain('false');
    });

    it('should handle numbers in objects', () => {
        scribbles.log('data', { int: 42, float: 3.14, negative: -10 });
        expect(stdOutCalls[0]).toContain('42');
        expect(stdOutCalls[0]).toContain('3.14');
        expect(stdOutCalls[0]).toContain('-10');
    });

    it('should handle Symbol in objects', () => {
        const sym = Symbol('myKey');
        const obj = { regular: 'value' };
        obj[sym] = 'symbolValue';

        scribbles.log('data', obj);

        expect(stdOutCalls[0]).toContain('Symbol(myKey)');
    });
});

describe('Use Case: Empty Collections', () => {
    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle empty array', () => {
        scribbles.log('empty', []);
        expect(stdOutCalls[0]).toContain('[ ]');
    });

    it('should handle empty object', () => {
        scribbles.log('empty', {});
        expect(stdOutCalls[0]).toContain('{ }');
    });

    it('should handle empty Set', () => {
        scribbles.log('empty', new Set());
        expect(stdOutCalls[0]).toContain('Set');
        expect(stdOutCalls[0]).toContain('[ ]');
    });

    it('should handle empty Map', () => {
        scribbles.log('empty', new Map());
        expect(stdOutCalls[0]).toContain('Map');
        expect(stdOutCalls[0]).toContain('{ }');
    });
});

describe('Use Case: Promise Objects', () => {
    let stdOutCalls = [];

    beforeEach(() => {
        stdOutCalls = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: null,
            format: '{value}',
            stringify: undefined,
            pretty: { inlineCharacterLimit: Number.POSITIVE_INFINITY }
        });
    });

    it('should handle Promise objects', () => {
        // Use Case: Developer logs a promise (for debugging)
        const promise = Promise.resolve('done');
        scribbles.log('promise', promise);

        expect(stdOutCalls[0]).toContain('Promise');
    });
});
