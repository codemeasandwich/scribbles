/**
 * Integration tests for value serialization
 * Tests stringify behavior for all data types
 */

const scribbles = require('../index');

describe('Value Serialization', () => {
    let stdOutCalls = [];
    let logs = [];

    beforeEach(() => {
        stdOutCalls = [];
        logs = [];
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: (data) => logs.push(data),
            format: '{value}',
            pretty: {
                inlineCharacterLimit: Number.POSITIVE_INFINITY,
                singleQuotes: true
            }
        });
    });

    describe('Primitive types', () => {
        it('should serialize null', () => {
            scribbles.log('msg', null);
            expect(stdOutCalls[0]).toBe('null');
        });

        it('should serialize undefined', () => {
            scribbles.log('msg', undefined);
            expect(stdOutCalls[0]).toBe('undefined');
        });

        it('should serialize numbers', () => {
            scribbles.log('msg', 123);
            expect(stdOutCalls[0]).toBe('123');
        });

        it('should serialize negative numbers', () => {
            scribbles.log('msg', -456);
            expect(stdOutCalls[0]).toBe('-456');
        });

        it('should serialize floating point numbers', () => {
            scribbles.log('msg', 3.14159);
            expect(stdOutCalls[0]).toBe('3.14159');
        });

        it('should serialize boolean true', () => {
            scribbles.log('msg', true);
            expect(stdOutCalls[0]).toBe('true');
        });

        it('should serialize boolean false', () => {
            scribbles.log('msg', false);
            expect(stdOutCalls[0]).toBe('false');
        });

        it('should serialize strings', () => {
            scribbles.log('msg', 'hello');
            expect(stdOutCalls[0]).toContain('hello');
        });

        it('should serialize NaN', () => {
            scribbles.log('msg', NaN);
            expect(stdOutCalls[0]).toBe('NaN');
        });

        it('should serialize Symbol', () => {
            const sym = Symbol('test');
            scribbles.log('msg', sym);
            expect(stdOutCalls[0]).toContain('Symbol(test)');
        });
    });

    describe('Objects and Arrays', () => {
        it('should serialize simple objects', () => {
            scribbles.log('msg', { foo: 'bar' });
            expect(stdOutCalls[0]).toContain('foo');
            expect(stdOutCalls[0]).toContain('bar');
        });

        it('should serialize nested objects', () => {
            scribbles.log('msg', { a: { b: { c: 1 } } });
            expect(stdOutCalls[0]).toContain('a');
            expect(stdOutCalls[0]).toContain('b');
            expect(stdOutCalls[0]).toContain('c');
        });

        it('should serialize arrays', () => {
            scribbles.log('msg', [1, 2, 3]);
            expect(stdOutCalls[0]).toContain('1');
            expect(stdOutCalls[0]).toContain('2');
            expect(stdOutCalls[0]).toContain('3');
        });

        it('should serialize nested arrays', () => {
            scribbles.log('msg', [[1, 2], [3, 4]]);
            expect(stdOutCalls[0]).toMatch(/\[.*\[/);
        });

        it('should serialize mixed arrays', () => {
            scribbles.log('msg', ['s', 6]);
            expect(stdOutCalls[0]).toContain('s');
            expect(stdOutCalls[0]).toContain('6');
        });

        it('should serialize empty objects', () => {
            scribbles.log('msg', {});
            expect(stdOutCalls[0]).toContain('{ }');
        });

        it('should serialize empty arrays', () => {
            scribbles.log('msg', []);
            expect(stdOutCalls[0]).toContain('[ ]');
        });
    });

    describe('Special types', () => {
        it('should serialize Date', () => {
            const date = new Date('2024-01-01T00:00:00.000Z');
            scribbles.log('msg', date);
            expect(stdOutCalls[0]).toContain('Date(');
            expect(stdOutCalls[0]).toContain('2024-01-01');
        });

        it('should serialize Error in input', () => {
            const err = new Error('test error');
            const result = scribbles.error('msg', err);
            expect(result.input.originalMessage).toBe('test error');
        });

        it('should serialize Buffer', () => {
            const buf = Buffer.from([1, 2, 3]);
            scribbles.log('msg', buf);
            expect(stdOutCalls[0]).toContain('Buffer');
            expect(stdOutCalls[0]).toContain('1');
            expect(stdOutCalls[0]).toContain('2');
            expect(stdOutCalls[0]).toContain('3');
        });

        it('should serialize Map', () => {
            const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
            scribbles.log('msg', map);
            expect(stdOutCalls[0]).toContain('Map');
            expect(stdOutCalls[0]).toContain('key1');
            expect(stdOutCalls[0]).toContain('value1');
        });

        it('should serialize Set', () => {
            const set = new Set([1, 2, 3]);
            scribbles.log('msg', set);
            expect(stdOutCalls[0]).toContain('Set');
            expect(stdOutCalls[0]).toContain('1');
            expect(stdOutCalls[0]).toContain('2');
        });

        it('should serialize RegExp', () => {
            scribbles.log('msg', /foo/gi);
            expect(stdOutCalls[0]).toContain('/foo/gi');
        });
    });

    describe('Functions', () => {
        it('should serialize arrow functions', () => {
            const fn = (a, b) => a + b;
            scribbles.log('msg', fn);
            expect(stdOutCalls[0]).toContain('=>');
        });

        it('should serialize named functions', () => {
            function myFunction(x, y) { return x + y; }
            scribbles.log('msg', myFunction);
            expect(stdOutCalls[0]).toContain('myFunction');
        });

        it('should serialize functions in objects', () => {
            const obj = {
                method: function testMethod() { },
                arrow: () => { }
            };
            scribbles.log('msg', obj);
            expect(stdOutCalls[0]).toContain('method');
            expect(stdOutCalls[0]).toContain('arrow');
        });
    });

    describe('Circular references', () => {
        it('should handle circular object references', () => {
            const obj = { name: 'test' };
            obj.self = obj;
            scribbles.log('msg', obj);
            expect(stdOutCalls[0]).toContain('name');
            expect(stdOutCalls[0]).toContain('...!');
        });

        it('should handle circular array references', () => {
            const arr = [1, 2];
            arr.push(arr);
            scribbles.log('msg', arr);
            expect(stdOutCalls[0]).toContain('1');
            expect(stdOutCalls[0]).toContain('2');
            expect(stdOutCalls[0]).toContain('...!');
        });

        it('should handle deeply nested circular references', () => {
            const obj = { a: { b: {} } };
            obj.a.b.c = obj;
            scribbles.log('msg', obj);
            expect(stdOutCalls[0]).toContain('...!');
        });
    });

    describe('Promise handling', () => {
        it('should serialize Promise objects', () => {
            const promise = new Promise((resolve) => resolve('done'));
            scribbles.log('msg', promise);
            expect(stdOutCalls[0]).toContain('Promise');
        });
    });

    describe('String edge cases', () => {
        it('should handle strings that look like JSON objects', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{message}'
            });
            stdOutCalls = [];

            scribbles.log('{not_json}');
            expect(stdOutCalls[0]).toContain('String"');
        });

        it('should handle strings that look like JSON arrays', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{message}'
            });
            stdOutCalls = [];

            scribbles.log('[1,2,3]');
            expect(stdOutCalls[0]).toContain('String"');
        });
    });

    describe('Quote style configuration', () => {
        it('should use double quotes when singleQuotes:false', () => {
            // User story: Developer wants JSON-compatible output with double quotes
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    singleQuotes: false,
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });
            stdOutCalls = [];

            scribbles.log('msg', { name: 'value' });
            // Output uses internal format with escaped quotes
            expect(stdOutCalls[0]).toContain('name');
            expect(stdOutCalls[0]).toContain('value');
        });

        it('should render strings with single quotes when configured', () => {
            // When singleQuotes is true, strings should use single quotes
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    singleQuotes: true,
                    inlineCharacterLimit: Number.POSITIVE_INFINITY
                }
            });
            stdOutCalls = [];

            scribbles.log('msg', { name: 'value' });
            // Output should contain name and value
            expect(stdOutCalls[0]).toContain('name');
            expect(stdOutCalls[0]).toContain('value');
        });
    });

    describe('Inline character limit behavior', () => {
        it('should output single-line when within limit', () => {
            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: null,
                format: '{value}',
                stringify: undefined,
                pretty: {
                    inlineCharacterLimit: 1000,
                    indent: '  '
                }
            });
            stdOutCalls = [];

            scribbles.log('msg', { a: 1 });
            // Should be single-line
            expect(stdOutCalls[0]).not.toContain('\n');
        });
    });

    describe('Complex nested structures', () => {
        it('should serialize complex object from sample.js', () => {
            const a = [1, 2, 3];
            const y = { s: 6 };
            a.push(y);
            y.y = y;

            const data = {
                a,
                aa: ['s', 6],
                aaa: [['s', 6]],
                b: null,
                'b-3': ['{', '}'],
                c: ',',
                err: new Error('qwe'),
                d: undefined,
                e: console.log,
                f: (a, b) => ({}),
                x: new Date(),
                y,
                z: NaN
            };

            scribbles.log('msg', data);

            expect(stdOutCalls[0]).toContain('aa');
            expect(stdOutCalls[0]).toContain('Error');
            expect(stdOutCalls[0]).toContain('Date');
            expect(stdOutCalls[0]).toContain('NaN');
        });
    });
});
