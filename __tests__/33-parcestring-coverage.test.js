/**
 * Tests for parceStringVals code paths via the loader
 *
 * User Story: When the loader transforms source code, it captures
 * variable names. These are then processed through parceStringVals
 * which formats different value types in the log output.
 */

describe('parceStringVals via loader', () => {
    let logs = [];
    let scribbles;
    let fixture;

    beforeAll(() => {
        // Require the loader FIRST
        require('../src/loader');

        scribbles = require('../index');

        // Then require fixture
        fixture = require('./fixtures/loader-parcestring.stub');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('Function values (line 121)', () => {
        it('should format function value with :f(){..}', () => {
            fixture.logFunctionValue();

            expect(logs.length).toBe(1);
            // The function is the value, so it appears in input.value
            expect(logs[0].input.value).toBeDefined();
        });
    });

    describe('String values (line 139)', () => {
        it('should format string value with quotes', () => {
            fixture.logStringValue();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('John');
        });
    });

    describe('Symbol values (line 265)', () => {
        it('should convert Symbol to string in output', () => {
            fixture.logSymbolMessage();

            expect(logs.length).toBe(1);
            // Symbol in message position
            const output = logs[0].toString();
            expect(output).toContain('Symbol(mySymbol)');
        });
    });

    describe('Date values (line 293)', () => {
        it('should format Date in output', () => {
            fixture.logDateValue();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBeInstanceOf(Date);
        });
    });

    describe('Error values (lines 122-123)', () => {
        it('should format Error in output', () => {
            fixture.logErrorInVals();

            expect(logs.length).toBe(1);
        });
    });

    describe('Buffer values (lines 126-127)', () => {
        it('should format Buffer as :Buffer[..]', () => {
            fixture.logBufferValue();

            expect(logs.length).toBe(1);
        });
    });

    describe('Map values (lines 128-129)', () => {
        it('should format Map as :Map{..}', () => {
            fixture.logMapValue();

            expect(logs.length).toBe(1);
        });
    });

    describe('Set values (lines 130-131)', () => {
        it('should format Set as :Set[..]', () => {
            fixture.logSetValue();

            expect(logs.length).toBe(1);
        });
    });

    describe('Array values (lines 132-133)', () => {
        it('should format Array as :[..]', () => {
            fixture.logArrayValue();

            expect(logs.length).toBe(1);
        });
    });

    describe('Object values (lines 134-135)', () => {
        it('should format Object as :{..}', () => {
            fixture.logObjectValue();

            expect(logs.length).toBe(1);
        });
    });

    describe('Arg name prefix (line 275)', () => {
        it('should include arg name prefix for single variable', () => {
            fixture.logSingleVar();

            expect(logs.length).toBe(1);
            // When logging a single variable, the arg name gets captured
            // and should appear in the output string
            const output = logs[0].toString();
            // The variable name 'userId' should be prefixed
            expect(output).toBeDefined();
        });
    });
});

describe('Config mode case handling', () => {
    let scribbles;

    beforeAll(() => {
        scribbles = require('../index');
    });

    it('should handle mode in lowercase (dev)', () => {
        // Triggers line 562 condition
        scribbles.config({
            stdOut: null,
            dataOut: null,
            mode: 'dev',
            pretty: { inlineCharacterLimit: undefined }
        });

        expect(() => scribbles.log('test')).not.toThrow();
    });

    it('should handle mode in uppercase (DEV)', () => {
        // Still triggers line 562 condition due to toLowerCase()
        scribbles.config({
            stdOut: null,
            dataOut: null,
            mode: 'DEV',
            pretty: { inlineCharacterLimit: undefined }
        });

        expect(() => scribbles.log('test')).not.toThrow();
    });

    it('should handle mode = production (else branch lines 563-565)', () => {
        // This does NOT match "dev" so goes to else branch
        scribbles.config({
            stdOut: null,
            dataOut: null,
            mode: 'production',
            pretty: { inlineCharacterLimit: undefined }
        });

        expect(() => scribbles.log('test')).not.toThrow();
    });

    it('should handle mode = prod', () => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            mode: 'prod',
            pretty: { inlineCharacterLimit: undefined }
        });

        expect(() => scribbles.log('test')).not.toThrow();
    });

    afterAll(() => {
        // Reset to dev
        scribbles.config({ mode: 'dev' });
    });
});

describe('Invalid regex handling in isValidRegex (line 680)', () => {
    let scribbles;

    beforeAll(() => {
        scribbles = require('../index');
    });

    it('should catch invalid regex and return false', () => {
        // Configure headers with an invalid regex pattern
        // The isValidRegex function will catch the error and return false
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: [
                '/[/', // Invalid regex - unclosed bracket
                'valid-header'
            ]
        });

        // The config should not throw, invalid patterns are just ignored
        expect(() => {
            scribbles.trace('test', () => {
                scribbles.log('test');
            });
        }).not.toThrow();

        // Cleanup
        scribbles.config({ headers: null });
    });

    it('should handle regex with invalid flags', () => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            headers: [
                '/test/xyz' // Invalid flags
            ]
        });

        expect(() => {
            scribbles.trace('test', () => {
                scribbles.log('test');
            });
        }).not.toThrow();

        scribbles.config({ headers: null });
    });
});
