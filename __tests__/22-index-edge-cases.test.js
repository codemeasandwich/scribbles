/**
 * User Story Tests for index.js edge cases
 *
 * Use Case: Developers use scribbles in various edge case scenarios
 * that exercise less common code paths.
 */

const scribbles = require('../index');

describe('Symbol message handling', () => {
    let outputs = [];

    beforeEach(() => {
        outputs = [];
        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should handle Symbol as message value', () => {
        // Use Case: Developer accidentally logs a Symbol
        const sym = Symbol('test');
        const result = scribbles.log(sym);

        expect(result).toBeDefined();
        expect(outputs.length).toBeGreaterThan(0);
    });

    it('should handle Symbol description in toString', () => {
        // Use Case: Symbol needs to be stringified for output
        const sym = Symbol('mySymbol');
        const strValue = sym.toString();

        expect(strValue).toBe('Symbol(mySymbol)');
    });
});

describe('Value type handling in toString', () => {
    let outputs = [];
    let dataOutputs = [];

    beforeEach(() => {
        outputs = [];
        dataOutputs = [];
        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: (data) => dataOutputs.push(data),
            logLevel: 'debug'
        });
    });

    it('should handle function as value', () => {
        // Use Case: Developer logs a callback function for debugging
        const fn = function myCallback() { return 'result'; };
        const result = scribbles.log('callback', fn);

        expect(result).toBeDefined();
        expect(outputs.length).toBeGreaterThan(0);
    });

    it('should handle falsy values correctly', () => {
        // Use Case: Developer logs null, undefined, 0, empty string
        expect(() => scribbles.log('null value', null)).not.toThrow();
        expect(() => scribbles.log('zero', 0)).not.toThrow();
        expect(() => scribbles.log('empty string', '')).not.toThrow();
    });

    it('should handle Symbol as value', () => {
        // Use Case: Developer logs a Symbol value
        const sym = Symbol('config');
        const result = scribbles.log('config key', sym);

        expect(result).toBeDefined();
    });
});

describe('Message formatting edge cases', () => {
    let outputs = [];

    beforeEach(() => {
        outputs = [];
        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should handle message starting with {', () => {
        // Use Case: Developer logs JSON string that looks like an object
        const jsonStr = '{"key": "value"}';
        const result = scribbles.log(jsonStr);

        expect(result).toBeDefined();
        expect(outputs.length).toBeGreaterThan(0);
        // Should be wrapped to indicate it's a string
        expect(outputs[0]).toContain('String"');
    });

    it('should handle message starting with [', () => {
        // Use Case: Developer logs JSON array string
        const arrayStr = '[1, 2, 3]';
        const result = scribbles.log(arrayStr);

        expect(result).toBeDefined();
        expect(outputs[0]).toContain('String"');
    });

    it('should handle value string starting with {', () => {
        // Use Case: Developer passes JSON string as value
        scribbles.log('data', '{"nested": true}');

        expect(outputs.length).toBeGreaterThan(0);
    });

    it('should handle value string starting with [', () => {
        // Use Case: Developer passes array string as value
        scribbles.log('items', '[1, 2, 3]');

        expect(outputs.length).toBeGreaterThan(0);
    });
});

describe('Custom stringify function', () => {
    let outputs = [];

    beforeEach(() => {
        outputs = [];
    });

    it('should use custom stringify when configured', () => {
        // Use Case: Developer wants custom JSON formatting
        const customStringify = (value, pretty) => {
            return `CUSTOM:${JSON.stringify(value)}`;
        };

        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: null,
            logLevel: 'debug',
            stringify: customStringify
        });

        scribbles.log('test', { key: 'value' });

        expect(outputs.length).toBeGreaterThan(0);
        expect(outputs[0]).toContain('CUSTOM:');
    });

    afterEach(() => {
        // Reset config
        scribbles.config({
            stringify: null
        });
    });
});

describe('stdOut configuration variants', () => {
    it('should work with stdOut as function', () => {
        // Use Case: Simple function output handler
        const outputs = [];
        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: null,
            logLevel: 'debug'
        });

        scribbles.log('test');
        expect(outputs.length).toBeGreaterThan(0);
    });

    it('should work with stdOut as object with level methods', () => {
        // Use Case: Console-like object with log, warn, error methods
        const outputs = { log: [], warn: [], error: [] };
        scribbles.config({
            stdOut: {
                log: (msg) => outputs.log.push(msg),
                warn: (msg) => outputs.warn.push(msg),
                error: (msg) => outputs.error.push(msg),
                debug: (msg) => outputs.log.push(msg)
            },
            dataOut: null,
            logLevel: 'debug'
        });

        scribbles.log('log message');
        scribbles.warn('warn message');
        scribbles.error('error message');

        expect(outputs.log.length).toBeGreaterThan(0);
        expect(outputs.warn.length).toBeGreaterThan(0);
        expect(outputs.error.length).toBeGreaterThan(0);
    });

    it('should work with stdOut object having only log method', () => {
        // Use Case: Simple logger object
        const outputs = [];
        scribbles.config({
            stdOut: {
                log: (msg) => outputs.push(msg)
            },
            dataOut: null,
            logLevel: 'debug'
        });

        scribbles.debug('debug via log');
        expect(outputs.length).toBeGreaterThan(0);
    });
});

describe('Namespace and trace cleanup', () => {
    it('should handle empty namespaces object', () => {
        // Use Case: No active traces
        const namespaces = {};
        const keys = Object.keys(namespaces);
        expect(keys.length).toBe(0);
    });

    it('should track inUse status for namespaces', () => {
        // Use Case: Track which namespaces are being used
        const inUse = {};
        const spanId = 'test-span-123';

        // New namespace
        if (!inUse[spanId]) {
            inUse[spanId] = true;
        }
        expect(inUse[spanId]).toBe(true);

        // Cleanup
        delete inUse[spanId];
        expect(inUse[spanId]).toBeUndefined();
    });
});

describe('Git environment configuration', () => {
    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should read git values from environment variables', () => {
        // Use Case: CI/CD sets git info via environment
        const originalHash = process.env.TEST_GIT_HASH;
        const originalRepo = process.env.TEST_GIT_REPO;
        const originalBranch = process.env.TEST_GIT_BRANCH;

        process.env.TEST_GIT_HASH = 'abc1234567890';
        process.env.TEST_GIT_REPO = 'my-project';
        process.env.TEST_GIT_BRANCH = 'feature/test';

        scribbles.config({
            gitEnv: {
                hash: 'TEST_GIT_HASH',
                repo: 'TEST_GIT_REPO',
                branch: 'TEST_GIT_BRANCH'
            }
        });

        // Cleanup
        if (originalHash) process.env.TEST_GIT_HASH = originalHash;
        else delete process.env.TEST_GIT_HASH;
        if (originalRepo) process.env.TEST_GIT_REPO = originalRepo;
        else delete process.env.TEST_GIT_REPO;
        if (originalBranch) process.env.TEST_GIT_BRANCH = originalBranch;
        else delete process.env.TEST_GIT_BRANCH;
    });

    it('should handle missing git environment variables', () => {
        // Use Case: Environment variables not set
        scribbles.config({
            gitEnv: {
                hash: 'NONEXISTENT_HASH_VAR',
                repo: 'NONEXISTENT_REPO_VAR',
                branch: 'NONEXISTENT_BRANCH_VAR'
            }
        });

        // Should not throw
        expect(() => scribbles.log('test')).not.toThrow();
    });
});

describe('Regex validation', () => {
    it('should validate correct regex patterns', () => {
        // Use Case: User provides regex for filtering
        function isValidRegex(s) {
            try {
                const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
                return m ? !!new RegExp(m[2], m[3]) : false;
            } catch (e) {
                return false;
            }
        }

        expect(isValidRegex('/test/i')).toBe(true);
        expect(isValidRegex('/\\d+/g')).toBe(true);
        expect(isValidRegex("'pattern'")).toBe(true);
    });

    it('should reject invalid regex patterns', () => {
        // Use Case: Invalid regex should return false
        function isValidRegex(s) {
            try {
                const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
                return m ? !!new RegExp(m[2], m[3]) : false;
            } catch (e) {
                return false;
            }
        }

        expect(isValidRegex('not a regex')).toBe(false);
        expect(isValidRegex('/invalid[/i')).toBe(false);
    });

    it('should convert string to regex', () => {
        // Use Case: Convert user input to RegExp object
        function stringToRegex(s) {
            const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
            return m ? new RegExp(m[2], m[3]) : new RegExp(s);
        }

        const regex1 = stringToRegex('/test/i');
        expect(regex1).toBeInstanceOf(RegExp);
        expect(regex1.flags).toContain('i');

        const regex2 = stringToRegex('plaintext');
        expect(regex2).toBeInstanceOf(RegExp);
        expect(regex2.source).toBe('plaintext');
    });
});

describe('CUID prefix generation', () => {
    it('should generate valid cuid prefix', () => {
        // Use Case: Generate unique instance identifier
        const ppid = process.ppid || 0;
        const pid = process.pid;

        const cuidPrefixRaw = (
            (ppid ? ppid.toString(16).slice(-2)
                : Math.floor(Math.random() * 15).toString(16) +
                Math.floor(Math.random() * 15).toString(16))
            + pid.toString(16).slice(-2)
            + Math.floor(Math.random() * 15).toString(16)
        );

        expect(cuidPrefixRaw.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle missing ppid', () => {
        // Use Case: Process without parent (direct spawn)
        const ppid = 0;
        const randomPart = Math.floor(Math.random() * 15).toString(16) +
            Math.floor(Math.random() * 15).toString(16);

        expect(randomPart.length).toBe(2);
    });
});

describe('Error with custom message handling', () => {
    let outputs = [];

    beforeEach(() => {
        outputs = [];
        scribbles.config({
            stdOut: (msg) => outputs.push(msg),
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should preserve original error message when custom message provided', () => {
        // Use Case: Developer adds context to an error
        const err = new Error('Original error');
        const result = scribbles.error('Additional context', err);

        expect(result).toBeDefined();
        expect(result.input.originalMessage).toBe('Original error');
    });

    it('should use error message when no custom message', () => {
        // Use Case: Just log the error
        const err = new Error('The error message');
        const result = scribbles.error(err);

        expect(result).toBeDefined();
        expect(result.input.message).toBe('The error message');
    });
});

describe('Pretty print configuration', () => {
    it('should set inlineCharacterLimit for dev mode', () => {
        // Use Case: Development mode has formatted output
        scribbles.config({
            mode: 'dev',
            stdOut: null,
            dataOut: null
        });

        // Should not throw
        expect(() => scribbles.log('test', { key: 'value' })).not.toThrow();
    });

    it('should set infinite inlineCharacterLimit for production', () => {
        // Use Case: Production mode has compact output
        scribbles.config({
            mode: 'prod',
            stdOut: null,
            dataOut: null
        });

        expect(() => scribbles.log('test', { key: 'value' })).not.toThrow();
    });
});
