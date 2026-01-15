/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║   ⚠️  WARNING: UNIT TEST EXCEPTION ⚠️                                     ║
 * ║                                                                           ║
 * ║   This is the ONLY allowed unit test file in this test suite!             ║
 * ║                                                                           ║
 * ║   All other tests MUST be integration tests that test via the public API. ║
 * ║                                                                           ║
 * ║   This exception exists because:                                          ║
 * ║   - loader.js uses node-hook to intercept require()                       ║
 * ║   - Coverage instrumentation runs AFTER the hook                          ║
 * ║   - The loadArgNames/splitArgs functions cannot be measured via           ║
 * ║     integration tests                                                     ║
 * ║                                                                           ║
 * ║   DO NOT add any other unit tests to this project!                        ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const { _loadArgNames: loadArgNames, _splitArgs: splitArgs } = require('../src/loader');

describe('⚠️ UNIT TEST EXCEPTION: Loader Utils', () => {
    /**
     * Helper to simulate getChar() from source parsing
     * Returns characters one at a time from the input string
     */
    function createCharGetter(input) {
        let i = 0;
        return () => {
            const result = [input[i - 1] || '', input[i] || ''];
            i++;
            return result;
        };
    }

    describe('loadArgNames()', () => {
        it('should parse simple variable name', () => {
            const getChar = createCharGetter('myVar)');
            const result = loadArgNames(getChar);
            expect(result).toContain('myVar');
        });

        it('should parse arrow function and return false', () => {
            const getChar = createCharGetter('() => {})');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse function keyword and return false', () => {
            const getChar = createCharGetter('function() {})');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse null and return false', () => {
            const getChar = createCharGetter('null)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse undefined and return false', () => {
            const getChar = createCharGetter('undefined)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse true and return false', () => {
            const getChar = createCharGetter('true)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse false and return false', () => {
            const getChar = createCharGetter('false)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse number and return false', () => {
            const getChar = createCharGetter('123)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse negative number and return false', () => {
            const getChar = createCharGetter('-456)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse float and return false', () => {
            const getChar = createCharGetter('3.14)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse new Date and return false', () => {
            const getChar = createCharGetter('new Date)');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse new Date() and return false', () => {
            const getChar = createCharGetter('new Date())');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse multiple args', () => {
            const getChar = createCharGetter('msg, value)');
            const result = loadArgNames(getChar);
            expect(result).toContain('msg');
            expect(result).toContain('value');
        });

        it('should parse string literal and return false', () => {
            const getChar = createCharGetter('"hello")');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse single-quoted string and return false', () => {
            const getChar = createCharGetter("'hello')");
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse object literal and return false', () => {
            const getChar = createCharGetter('{a: 1})');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should parse array literal and return false', () => {
            const getChar = createCharGetter('[1, 2])');
            const result = loadArgNames(getChar);
            expect(result).toBe('false');
        });

        it('should handle empty args', () => {
            const getChar = createCharGetter(')');
            const result = loadArgNames(getChar);
            expect(result).toBe('');
        });
    });

    describe('splitArgs()', () => {
        it('should skip leading spaces', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, ' ', '');
            expect(result.temp).toBe('');
        });

        it('should detect closing paren and set fin', () => {
            const state = { temp: 'x', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: 'x' };
            const result = splitArgs(state, ')', 'x');
            expect(result.fin).toBe(true);
        });

        it('should handle comma separator', () => {
            const state = { temp: 'msg', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: 'msg' };
            const result = splitArgs(state, ',', 'g');
            expect(result.args).toContain('msg');
            expect(result.temp).toBe('');
        });

        it('should track opened brackets', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, '{', '');
            expect(result.opened).toContain('{');
        });

        it('should track opened parentheses', () => {
            const state = { temp: 'fn', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: 'fn' };
            const result = splitArgs(state, '(', 'n');
            expect(result.opened).toContain('(');
        });

        it('should track opened arrays', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, '[', '');
            expect(result.opened).toContain('[');
        });

        it('should track opened strings with double quotes', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, '"', '');
            expect(result.opened).toContain('"');
        });

        it('should track opened strings with single quotes', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, "'", '');
            expect(result.opened).toContain("'");
        });

        it('should track opened template literals', () => {
            const state = { temp: '', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: '' };
            const result = splitArgs(state, '`', '');
            expect(result.opened).toContain('`');
        });

        it('should close matching brackets', () => {
            const state = { temp: '{a}', opened: ['{'], args: [], fin: false, procThisLoop: true, names: [], raw: '{a}' };
            const result = splitArgs(state, '}', 'a');
            expect(result.opened.length).toBe(0);
        });

        it('should close matching parentheses', () => {
            const state = { temp: 'fn()', opened: ['('], args: [], fin: false, procThisLoop: true, names: [], raw: 'fn()' };
            const result = splitArgs(state, ')', '(');
            expect(result.opened.length).toBe(0);
        });

        it('should close matching arrays', () => {
            const state = { temp: '[1]', opened: ['['], args: [], fin: false, procThisLoop: true, names: [], raw: '[1]' };
            const result = splitArgs(state, ']', '1');
            expect(result.opened.length).toBe(0);
        });

        it('should handle template literal interpolation', () => {
            const state = { temp: 'x', opened: ['`'], args: [], fin: false, procThisLoop: true, names: [], raw: 'x' };
            const result = splitArgs(state, '{', '$');
            expect(result.opened).toContain('{');
        });

        it('should accumulate characters in temp', () => {
            const state = { temp: 'ab', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: 'ab' };
            const result = splitArgs(state, 'c', 'b');
            expect(result.temp).toBe('abc');
        });

        it('should accumulate characters in raw', () => {
            const state = { temp: 'ab', opened: [], args: [], fin: false, procThisLoop: true, names: [], raw: 'ab' };
            const result = splitArgs(state, 'c', 'b');
            expect(result.raw).toBe('abc');
        });
    });
});
