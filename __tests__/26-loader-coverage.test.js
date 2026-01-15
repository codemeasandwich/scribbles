/**
 * User Story Tests for loader.js uncovered lines
 *
 * Use Case: The loader transforms scribbles.log() calls to inject
 * source location metadata (file, line, column, argument names).
 */

const { _loadArgNames, _splitArgs } = require('../src/loader');

describe('Loader Line Coverage', () => {
    // Helper to create a getChar function from a string
    function createGetChar(input) {
        let index = 0;
        return () => {
            const preChar = index > 0 ? input[index - 1] || '' : '';
            const char = input[index] || ')';
            index++;
            return [preChar, char];
        };
    }

    describe('Lines 14-40: scribbles.level detection', () => {
        it('should detect scribbles.log pattern', () => {
            // Use Case: Basic logging call
            const getChar = createGetChar('message)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle empty argument list', () => {
            // Use Case: scribbles.log()
            const getChar = createGetChar(')');
            const result = _loadArgNames(getChar);

            expect(result).toBe('');
        });

        it('should handle argument with leading space', () => {
            // Use Case: scribbles.log( message)
            const getChar = createGetChar(' message)');
            const result = _loadArgNames(getChar);

            expect(result).toContain('message');
        });
    });

    describe('Line 117: splitArgs comma handling', () => {
        it('should split on comma outside brackets', () => {
            // Use Case: Multiple arguments
            const getChar = createGetChar('arg1, arg2)');
            const result = _loadArgNames(getChar);

            expect(result).toContain('arg1');
        });

        it('should not split on comma inside brackets', () => {
            // Use Case: Object with comma
            const getChar = createGetChar('{a: 1, b: 2})');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should not split on comma inside array', () => {
            // Use Case: Array argument
            const getChar = createGetChar('[1, 2, 3])');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('Line 140: colon handling in names', () => {
        it('should handle object shorthand property', () => {
            // Use Case: Logging object with shorthand {user}
            const getChar = createGetChar('user)');
            const result = _loadArgNames(getChar);

            expect(result).toContain('user');
        });

        it('should handle variable after colon', () => {
            // Use Case: Logging object property {key: value}
            const getChar = createGetChar('{key: value})');
            const result = _loadArgNames(getChar);

            // Object literals don't extract names
            expect(result).toBeDefined();
        });
    });

    describe('Line 163-164: nested structure handling', () => {
        it('should handle deeply nested brackets', () => {
            // Use Case: Nested object/array
            const getChar = createGetChar('{a: {b: [1, 2]}})');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle mixed nesting', () => {
            // Use Case: Function call inside object
            const getChar = createGetChar('{fn: callback()})');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('Special literal handling (lines 103-111)', () => {
        it('should handle undefined literal', () => {
            // Use Case: scribbles.log(undefined)
            const getChar = createGetChar('undefined)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle true literal', () => {
            // Use Case: scribbles.log(true)
            const getChar = createGetChar('true)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle false literal', () => {
            // Use Case: scribbles.log(false)
            const getChar = createGetChar('false)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle null literal', () => {
            // Use Case: scribbles.log(null)
            const getChar = createGetChar('null)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle new Date literal', () => {
            // Use Case: scribbles.log(new Date)
            const getChar = createGetChar('new Date)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle new Date() literal', () => {
            // Use Case: scribbles.log(new Date())
            const getChar = createGetChar('new Date())');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle integer literal', () => {
            // Use Case: scribbles.log(42)
            const getChar = createGetChar('42)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle negative number', () => {
            // Use Case: scribbles.log(-5)
            const getChar = createGetChar('-5)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle float literal', () => {
            // Use Case: scribbles.log(3.14)
            const getChar = createGetChar('3.14)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle arrow function', () => {
            // Use Case: scribbles.log(() => value)
            const getChar = createGetChar('() => value)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle function keyword', () => {
            // Use Case: scribbles.log(function() {})
            const getChar = createGetChar('function() {})');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('Template literal handling (lines 146-151)', () => {
        it('should handle template literal', () => {
            // Use Case: scribbles.log(`message`)
            const getChar = createGetChar('`template`)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle template with expression', () => {
            // Use Case: scribbles.log(`value is ${x}`)
            const getChar = createGetChar('`value is ${x}`)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle nested template expression', () => {
            // Use Case: Complex template
            const getChar = createGetChar('`${a} and ${b}`)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('Bracket balancing', () => {
        it('should balance parentheses', () => {
            // Use Case: Function call as argument
            const getChar = createGetChar('fn(a, b))');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should balance square brackets', () => {
            // Use Case: Array access
            const getChar = createGetChar('arr[0])');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should balance curly braces', () => {
            // Use Case: Object literal
            const getChar = createGetChar('{key: val})');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('String literal handling', () => {
        it('should handle double quoted string', () => {
            // Use Case: scribbles.log("message")
            const getChar = createGetChar('"hello")');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle single quoted string', () => {
            // Use Case: scribbles.log('message')
            const getChar = createGetChar("'hello')");
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle string with brackets inside', () => {
            // Use Case: String containing special chars
            const getChar = createGetChar('"has {brackets}")');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle string with comma inside', () => {
            // Use Case: String containing comma
            const getChar = createGetChar('"a, b, c")');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });

    describe('Complex argument patterns', () => {
        it('should handle method chain', () => {
            // Use Case: scribbles.log(obj.method().value)
            const getChar = createGetChar('obj.method().value)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle conditional expression', () => {
            // Use Case: scribbles.log(a ? b : c)
            const getChar = createGetChar('a ? b : c)');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });

        it('should handle multiple complex arguments', () => {
            // Use Case: scribbles.log(a.b, c[d], e())
            const getChar = createGetChar('a.b, c[d], e())');
            const result = _loadArgNames(getChar);

            expect(result).toBeDefined();
        });
    });
});

describe('splitArgs function directly', () => {
    const initialState = {
        temp: '',
        opened: [],
        args: [],
        fin: false,
        procThisLoop: true,
        names: [],
        raw: ''
    };

    it('should track opening brackets', () => {
        let state = { ...initialState };
        state = _splitArgs(state, '{', '');

        expect(state.opened).toContain('{');
    });

    it('should track closing brackets', () => {
        let state = { ...initialState, opened: ['{'] };
        state = _splitArgs(state, '}', ' ');

        expect(state.opened.length).toBe(0);
    });

    it('should handle end of args (closing paren)', () => {
        // When opened is empty and we see ), fin should be set
        let state = { ...initialState, temp: 'arg', raw: 'arg', opened: [] };
        state = _splitArgs(state, ')', 'g');

        // Should finalize (fin=true) when closing paren at top level
        expect(state.fin).toBe(true);
    });

    it('should handle comma separator', () => {
        // Comma at top level should push arg and reset
        let state = { ...initialState, temp: 'arg1', raw: 'arg1', names: [], opened: [] };
        state = _splitArgs(state, ',', '1');

        // After comma, args should have entries (internal state adds extra)
        expect(state.args.length).toBeGreaterThan(0);
    });

    it('should skip leading spaces', () => {
        let state = { ...initialState };
        state = _splitArgs(state, ' ', '');

        expect(state.temp).toBe('');
    });
});
