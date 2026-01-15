/**
 * Integration tests for remaining uncovered code paths
 * Philosophy: Test functionality through the interface - what would a user do?
 */

const scribbles = require('../index');

describe('Deep merge edge cases via config', () => {
    // User scenario: Developer passes unusual values to config merge

    const { deepMerge } = require('../src/helpers');

    it('should handle config with undefined nested values', () => {
        // Scenario: Developer passes config with undefined
        const output = [];
        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: null,
            mode: 'dev'
        });

        scribbles.log('test');
        expect(output.length).toBe(1);
    });

    it('should handle repeated config calls merging objects', () => {
        // Scenario: Developer calls config multiple times
        const output = [];

        scribbles.config({
            mode: 'prod',
            pretty: { depth: 3 }
        });

        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: null,
            pretty: { indent: '    ' }
        });

        scribbles.log('merged config test', { nested: { deep: true } });
        expect(output.length).toBe(1);
    });

    it('should return target when source is undefined', () => {
        // Scenario: helpers.js line 7 - source is undefined
        const target = { a: 1 };
        const result = deepMerge(target, undefined);
        expect(result).toEqual({ a: 1 });
    });

    it('should return false when target is not an object', () => {
        // Scenario: helpers.js line 8 - target is not object
        const result = deepMerge('string', { a: 1 });
        expect(result).toBe(false);
    });

    it('should return false when source is not an object', () => {
        // Scenario: helpers.js line 8 - source is not object
        const result = deepMerge({ a: 1 }, 'string');
        expect(result).toBe(false);
    });

    it('should return false when both are not objects', () => {
        // Scenario: helpers.js line 8 - both not objects
        const result = deepMerge('string', 123);
        expect(result).toBe(false);
    });
});

describe('Stringify edge cases via logging', () => {
    // User scenarios that trigger stringify edge cases

    let output = [];

    beforeEach(() => {
        output = [];
        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: null,
            mode: 'dev',
            pretty: { inlineCharacterLimit: 10 }  // Force multi-line expansion
        });
    });

    it('should expand large arrays with indexes when over character limit', () => {
        // Scenario: Developer logs a large array that needs multi-line formatting
        // This triggers stringify.js lines 63, 149-150 (reGenArrayWithIndexs)
        const largeArray = [
            'first-item-that-is-long',
            'second-item-that-is-long',
            'third-item-that-is-long'
        ];

        scribbles.log('array', largeArray);
        expect(output.length).toBe(1);
        // The output should contain array elements
        expect(output[0]).toContain('first-item');
    });

    it('should handle Promise objects in logging', () => {
        // Scenario: Developer logs a Promise object
        // This triggers stringify.js lines 171-177 (Promise detection)
        const promise = new Promise((resolve) => resolve('done'));

        scribbles.log('promise', promise);
        expect(output.length).toBe(1);
        expect(output[0]).toContain('Promise');
    });

    it('should handle Promise with then/catch/finally methods', () => {
        // Scenario: Developer logs a thenable object
        const thenable = {
            then: (cb) => cb('result'),
            catch: (cb) => cb,
            finally: (cb) => cb()
        };

        scribbles.log('thenable', thenable);
        expect(output.length).toBe(1);
    });

    it('should handle nested objects that exceed inline limit', () => {
        // Scenario: Developer logs deeply nested object
        // Forces multi-line expansion
        const config = require('../src/config');
        const originalLimit = config.pretty.inlineCharacterLimit;
        config.pretty.inlineCharacterLimit = 5;  // Very small to force expansion

        const nested = {
            level1: {
                level2: {
                    level3: 'deep value'
                }
            }
        };

        scribbles.log('nested', nested);
        expect(output.length).toBe(1);

        config.pretty.inlineCharacterLimit = originalLimit;
    });
});

describe('getSource edge cases', () => {
    // User scenarios that trigger getSource edge cases

    const { getSource } = require('../src/helpers');

    let output = [];
    let dataOutput = [];

    beforeEach(() => {
        output = [];
        dataOutput = [];
        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: (data) => dataOutput.push(data)
        });
    });

    it('should handle logging from different call depths', () => {
        // Scenario: Developer calls log from various nested functions
        function outer() {
            function inner() {
                scribbles.log('from nested function');
            }
            inner();
        }
        outer();

        expect(dataOutput.length).toBe(1);
        expect(dataOutput[0]).toBeDefined();
    });

    it('should handle path in logging output', () => {
        // Scenario: When logging, source may be from various locations
        scribbles.log('test path handling');

        expect(dataOutput.length).toBe(1);
        expect(dataOutput[0]).toBeDefined();
    });

    it('should fallback to rawLines[1] when rawLines[2] is undefined', () => {
        // Scenario: Stack trace with only 2 lines (edge case)
        // helpers.js line 37: rawLines[2] || rawLines[1]
        const shortStack = 'Error\n    at someFunc (/path/to/file.js:10:5)';
        const result = getSource(shortStack);

        expect(result).toBeDefined();
        expect(result.file).toBeDefined();
    });

    it('should handle path not starting with appDir', () => {
        // Scenario: Source file is outside project directory
        // helpers.js line 43: path doesn't start with appDir
        const externalStack = 'Error\n    at test (/external/other-project/file.js:5:10)\n    at Object.<anonymous> (/external/other-project/file.js:20:1)';
        const result = getSource(externalStack);

        expect(result).toBeDefined();
        expect(result.path).toContain('/');
    });

    it('should handle path ending with parenthesis', () => {
        // Scenario: Stack trace line ending with )
        // helpers.js line 42: path ends with )
        const stackWithParen = 'Error\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async (/some/path/file.js:10:20)';
        const result = getSource(stackWithParen);

        expect(result).toBeDefined();
    });
});

describe('Loader template literal edge cases', () => {
    // User scenarios with template literals in scribbles calls

    const { _loadArgNames, _splitArgs } = require('../src/loader');

    it('should handle template literal followed by string argument', () => {
        // Scenario: scribbles.log(`value: ${x}`, "string")
        // This triggers lines 163-164 where named === ":${" and char is quote
        const input = '`template ${x}`, "string")';
        let idx = 0;

        const getChar = () => {
            if (idx >= input.length) return ['', ')'];
            const pre = idx > 0 ? input[idx - 1] : '';
            const char = input[idx];
            idx++;
            return [pre, char];
        };

        const result = _loadArgNames(getChar);
        expect(result).toBeDefined();
    });

    it('should handle template literal followed by number', () => {
        // Scenario: scribbles.log(`count: ${n}`, 42)
        // This triggers lines 163-164 where named === ":${" and char is digit
        const input = '`count: ${n}`, 42)';
        let idx = 0;

        const getChar = () => {
            if (idx >= input.length) return ['', ')'];
            const pre = idx > 0 ? input[idx - 1] : '';
            const char = input[idx];
            idx++;
            return [pre, char];
        };

        const result = _loadArgNames(getChar);
        expect(result).toBeDefined();
    });

    it('should handle nested template expressions', () => {
        // Scenario: Developer uses nested template literals
        const input = '`outer ${`inner ${val}`}`)';
        let idx = 0;

        const getChar = () => {
            if (idx >= input.length) return ['', ')'];
            const pre = idx > 0 ? input[idx - 1] : '';
            const char = input[idx];
            idx++;
            return [pre, char];
        };

        const result = _loadArgNames(getChar);
        expect(result).toBeDefined();
    });

    it('should handle complex expression in template then comma then string', () => {
        // Scenario: scribbles.log(`${obj.prop}`, "label")
        // After template interpolation ends with }, then comma, then string
        // This should trigger line 163-164 transition
        const input = '`result: ${data}`, "done")';
        let idx = 0;

        const getChar = () => {
            if (idx >= input.length) return ['', ')'];
            const pre = idx > 0 ? input[idx - 1] : '';
            const char = input[idx];
            idx++;
            return [pre, char];
        };

        const result = _loadArgNames(getChar);
        expect(result).toBeDefined();
    });

    it('should handle object with template expression value followed by string', () => {
        // Scenario: scribbles.log({key:${val},"next":"value"})
        // This creates the :${ pattern in names
        const input = '{a:${x},"b":"c"})';
        let idx = 0;

        const getChar = () => {
            if (idx >= input.length) return ['', ')'];
            const pre = idx > 0 ? input[idx - 1] : '';
            const char = input[idx];
            idx++;
            return [pre, char];
        };

        const result = _loadArgNames(getChar);
        expect(result).toBeDefined();
    });

    it('should handle splitArgs directly for edge case', () => {
        // Test splitArgs with specific state to hit lines 163-164
        // When named is ":${" and char is a string quote
        const state = {
            temp: '',
            opened: ['{'],
            args: [],
            fin: false,
            procThisLoop: true,
            names: [':${'],  // This is the key - named === ":${"
            raw: ''
        };

        // char is a string quote which should trigger lines 163-164
        const result = _splitArgs(state, '"', ',');
        expect(result.procThisLoop).toBe(false);  // Line 163 sets this
        // names.pop() is called, so length decreases
        expect(result).toBeDefined();
    });

    it('should handle splitArgs with digit after colon-template', () => {
        // Test when char is a digit after :${ pattern
        const state = {
            temp: '',
            opened: ['{'],
            args: [],
            fin: false,
            procThisLoop: true,
            names: [':${'],
            raw: ''
        };

        // char is '5' which is a digit - `${+char}` === char
        const result = _splitArgs(state, '5', ',');
        expect(result.procThisLoop).toBe(false);
        expect(result.names.length).toBe(0);
    });
});

describe('Array stringify with transform option', () => {
    // User scenario: Developer uses transform option in config

    it('should apply transform to array elements', () => {
        const output = [];
        const config = require('../src/config');

        // Save original
        const originalTransform = config.pretty.transform;
        const originalLimit = config.pretty.inlineCharacterLimit;

        // Set transform function
        config.pretty.transform = (obj, key, val) => {
            if (typeof val === 'string') return val.toUpperCase();
            return val;
        };
        config.pretty.inlineCharacterLimit = 5;  // Force expansion

        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: null
        });

        scribbles.log('transformed', ['hello', 'world']);
        expect(output.length).toBe(1);

        // Restore
        config.pretty.transform = originalTransform;
        config.pretty.inlineCharacterLimit = originalLimit;
    });
});

describe('Config pretty singleQuotes option', () => {
    // User scenario: Developer prefers single quotes in output

    it('should use single quotes when configured', () => {
        const output = [];
        const config = require('../src/config');

        const originalQuotes = config.pretty.singleQuotes;
        config.pretty.singleQuotes = true;

        scribbles.config({
            stdOut: (msg) => output.push(msg),
            dataOut: null
        });

        scribbles.log('quotes', { key: 'value' });
        expect(output.length).toBe(1);

        config.pretty.singleQuotes = originalQuotes;
    });
});

describe('Loader hook through fresh fixture', () => {
    // User scenario: Developer requires a file with scribbles calls
    // The loader transforms the source code to inject location info

    let logs = [];

    beforeAll(() => {
        // Ensure loader is required first
        require('../src/loader');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    it('should transform multi-line scribbles calls in fixture', () => {
        // Clear cache to force fresh load through hook
        const fixturePath = require.resolve('./fixtures/loader-fresh.stub');
        delete require.cache[fixturePath];

        const fixture = require('./fixtures/loader-fresh.stub');
        fixture.multiLineCall();

        expect(logs.length).toBe(1);
        expect(logs[0].input.message).toBe('message that spans');
    });

    it('should transform template literal calls', () => {
        const fixturePath = require.resolve('./fixtures/loader-fresh.stub');
        delete require.cache[fixturePath];

        const fixture = require('./fixtures/loader-fresh.stub');
        fixture.templateCall();

        expect(logs.length).toBe(1);
        expect(logs[0].input.message).toContain('42');
    });
});
