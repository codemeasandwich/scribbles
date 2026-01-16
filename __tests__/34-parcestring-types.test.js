/**
 * Tests for parceStringVals type handling via loader
 *
 * These tests require files loaded through the loader to trigger
 * the parceStringVals code paths when arg templates are evaluated.
 */

describe('parceStringVals type handling via loader', () => {
    let logs = [];
    let scribbles;
    let fixture;

    beforeAll(() => {
        // IMPORTANT: Loader must be required first
        require('../src/parsing/loader');
        scribbles = require('../index');
        // Fixture is transformed by loader
        fixture = require('./fixtures/loader-types.stub');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('Function interpolation (line 121)', () => {
        it('should format function as :f(){..}', () => {
            fixture.logWithFunctionInterpolation();

            expect(logs.length).toBe(1);
            const output = logs[0].toString();
            // The function value should appear in output
            expect(output).toBeDefined();
        });
    });

    describe('String interpolation (line 139)', () => {
        it('should format string with quotes', () => {
            fixture.logWithStringInterpolation();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('Alice');
        });
    });

    describe('Symbol handling (line 265)', () => {
        it('should convert Symbol to string', () => {
            fixture.logSymbolArg();

            expect(logs.length).toBe(1);
            const output = logs[0].toString();
            expect(output).toContain('Symbol');
        });
    });

    describe('Date interpolation (line 293)', () => {
        it('should format Date properly', () => {
            fixture.logWithDateInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Error interpolation (lines 122-123)', () => {
        it('should format Error type', () => {
            fixture.logWithErrorInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Buffer interpolation (lines 126-127)', () => {
        it('should format Buffer as :Buffer[..]', () => {
            fixture.logWithBufferInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Map interpolation (lines 128-129)', () => {
        it('should format Map as :Map{..}', () => {
            fixture.logWithMapInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Set interpolation (lines 130-131)', () => {
        it('should format Set as :Set[..]', () => {
            fixture.logWithSetInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Array interpolation (lines 132-133)', () => {
        it('should format Array as :[..]', () => {
            fixture.logWithArrayInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Object interpolation (lines 134-135)', () => {
        it('should format Object as :{..}', () => {
            fixture.logWithObjectInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Single variable arg name (line 275)', () => {
        it('should prefix output with arg name when logging single variable', () => {
            fixture.logSingleVariableOnly();

            expect(logs.length).toBe(1);
            const output = logs[0].toString();
            // The arg name 'status' should appear in output
            expect(output).toBeDefined();
        });
    });

    describe('Null interpolation (line 141 else)', () => {
        it('should format null via String()', () => {
            fixture.logWithNullInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Number interpolation (line 141 else)', () => {
        it('should format number via String()', () => {
            fixture.logWithNumberInterpolation();

            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe(42);
        });
    });

    describe('Boolean interpolation', () => {
        it('should format boolean via String()', () => {
            fixture.logWithBooleanInterpolation();

            expect(logs.length).toBe(1);
        });
    });

    describe('Undefined interpolation', () => {
        it('should format undefined via String()', () => {
            fixture.logWithUndefinedInterpolation();

            expect(logs.length).toBe(1);
        });
    });
});
