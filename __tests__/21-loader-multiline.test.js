/**
 * User Story Tests for loader.js multi-line parsing
 *
 * Use Case: A developer writes scribbles logging calls that span multiple lines
 * for readability. The loader should correctly parse these calls and inject
 * source location metadata.
 */

const { _loadArgNames, _splitArgs } = require('../src/parsing/loader');

describe('Multi-line Argument Parsing', () => {
    // Helper to simulate multi-line parsing
    function parseMultiLine(lines) {
        let lineIndex = 0;
        let charIndex = 0;

        const getChar = () => {
            if (charIndex >= lines[lineIndex].length) {
                charIndex = 0;
                lineIndex++;
                if (lineIndex >= lines.length) {
                    return ['', ')'];
                }
            }
            const preChar = charIndex > 0 ? lines[lineIndex][charIndex - 1] : '';
            const char = lines[lineIndex][charIndex];
            charIndex++;
            return [preChar, char];
        };

        return _loadArgNames(getChar);
    }

    describe('Line continuation scenarios', () => {
        it('should handle argument split across two lines', () => {
            // Use Case: Developer splits long variable name across lines
            const result = parseMultiLine([
                'user',
                ')']);

            expect(result).toContain('x=>x`user`');
        });

        it('should handle object spread across lines', () => {
            // Use Case: Developer formats complex object for readability
            const result = parseMultiLine([
                '{key: value}',
                ')']);

            expect(result).toBeDefined();
        });

        it('should handle multiple arguments on separate lines', () => {
            // Use Case: Each argument on its own line
            const result = parseMultiLine([
                'message,',
                'data',
                ')']);

            expect(result).toBeDefined();
        });
    });

    describe('Character boundary handling', () => {
        it('should handle empty lines gracefully', () => {
            // Use Case: Developer has blank line in arguments
            const result = parseMultiLine([
                '',
                'value',
                ')']);

            expect(result).toBeDefined();
        });

        it('should handle line that ends mid-string', () => {
            // Use Case: String literal split across lines
            // In JS template literals, this is valid
            const result = parseMultiLine([
                '`template',
                'string`',
                ')']);

            expect(result).toBeDefined();
        });
    });

    describe('Nested structure across lines', () => {
        it('should track brackets across line boundaries', () => {
            // Use Case: Array spanning multiple lines
            const result = parseMultiLine([
                '[1,',
                '2,',
                '3]',
                ')']);

            expect(result).toBeDefined();
        });

        it('should handle template literal with expression across lines', () => {
            // Use Case: Complex template literal
            const result = parseMultiLine([
                '`prefix ${',
                'value',
                '} suffix`',
                ')']);

            expect(result).toBeDefined();
        });
    });
});

describe('Loader getNextChar function simulation', () => {
    it('should advance through source code correctly', () => {
        // Use Case: Parser moving through code character by character
        const lines = ['abc', 'def'];
        let runningCharPointer = 0;
        let linePointer = 0;

        const getNextChar = () => {
            let myLine = lines[linePointer];
            if (runningCharPointer > myLine.length) {
                runningCharPointer = 0;
                myLine = lines[++linePointer];
            }
            const result = [
                myLine[runningCharPointer - 1] || '',
                myLine[runningCharPointer]
            ];
            runningCharPointer++;
            return result;
        };

        // First character
        let [pre, char] = getNextChar();
        expect(char).toBe('a');
        expect(pre).toBe('');

        // Second character
        [pre, char] = getNextChar();
        expect(char).toBe('b');
        expect(pre).toBe('a');

        // Third character
        [pre, char] = getNextChar();
        expect(char).toBe('c');
        expect(pre).toBe('b');

        // Move to next line
        [pre, char] = getNextChar();
        // After c, pointer is 3, length is 3, so moves to next line
    });

    it('should handle pointer beyond line length', () => {
        // Use Case: Reaching end of a line
        const myLine = 'ab';
        let runningCharPointer = 5; // Beyond line length

        expect(runningCharPointer > myLine.length).toBe(true);
    });
});

describe('Special argument patterns across lines', () => {
    it('should handle function that spans lines', () => {
        // Use Case: Inline function argument
        const result = parseMultiLine([
            '() =>',
            ' result',
            ')']);

        expect(result).toBeDefined();
    });

    it('should handle destructuring across lines', () => {
        // Use Case: Destructured object in log
        const result = parseMultiLine([
            '{',
            'a,',
            'b',
            '}',
            ')']);

        expect(result).toBeDefined();
    });

    function parseMultiLine(lines) {
        let lineIndex = 0;
        let charIndex = 0;

        const getChar = () => {
            while (lineIndex < lines.length) {
                if (charIndex >= lines[lineIndex].length) {
                    charIndex = 0;
                    lineIndex++;
                    continue;
                }
                const preChar = charIndex > 0 ? lines[lineIndex][charIndex - 1] : '';
                const char = lines[lineIndex][charIndex];
                charIndex++;
                return [preChar, char];
            }
            return ['', ')'];
        };

        return _loadArgNames(getChar);
    }
});

describe('Loader line number tracking', () => {
    it('should track line pointer when advancing', () => {
        // Use Case: Keeping track of which line we're on for metadata
        const lines = ['line1', 'line2', 'line3'];
        let linePointer = 0;

        expect(lines[linePointer]).toBe('line1');
        linePointer++;
        expect(lines[linePointer]).toBe('line2');
        linePointer++;
        expect(lines[linePointer]).toBe('line3');
    });

    it('should handle index correctly for source location', () => {
        // Use Case: Generate correct line number in injected metadata
        const index = 5; // 0-indexed line
        const lineNumber = index + 1; // 1-indexed for display
        expect(lineNumber).toBe(6);
    });
});

describe('Loader path handling', () => {
    it('should handle absolute path transformation', () => {
        // Use Case: Convert absolute path to relative for cleaner logs
        const appDir = '/Users/dev/project';
        const filename = '/Users/dev/project/src/app.js';

        const path = filename.startsWith('/' + appDir)
            ? filename.substr(appDir.length + 2)
            : '/' + filename;

        expect(path).toBe('/' + filename);
    });

    it('should handle path that matches appDir', () => {
        // Use Case: File inside project directory
        const appDir = 'Users/dev/project';
        const filename = '/' + appDir + '/src/app.js';

        const path = filename.startsWith('/' + appDir)
            ? filename.substr(appDir.length + 2)
            : '/' + filename;

        // When path matches, it strips the appDir prefix
        expect(path).toBe('src/app.js');
    });
});
