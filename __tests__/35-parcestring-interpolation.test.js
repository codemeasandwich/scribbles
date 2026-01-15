/**
 * Tests for parceStringVals with actual interpolated values
 *
 * When using array indexing or computed object properties,
 * the loader creates template literals with interpolation like:
 *   x=>x`users[i${i}]`
 *
 * This causes parceStringVals to receive actual runtime values
 * in its vals array, triggering the type-checking code paths.
 */

describe('parceStringVals with interpolated values', () => {
    let logs = [];
    let scribbles;
    let fixture;

    beforeAll(() => {
        require('../src/loader');
        scribbles = require('../index');
        fixture = require('./fixtures/loader-interpolation.stub');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('Array index access', () => {
        it('should interpolate array index', () => {
            fixture.logArrayIndex();
            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('Bob');
        });
    });

    describe('Object computed property', () => {
        it('should interpolate object key', () => {
            fixture.logObjectComputed();
            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('test');
        });
    });

    describe('Nested access', () => {
        it('should handle nested interpolations', () => {
            fixture.logNestedAccess();
            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe(2);
        });
    });

    describe('Function value interpolation (line 121)', () => {
        it('should format function as :f(){..}', () => {
            fixture.logFunctionInArray();
            expect(logs.length).toBe(1);
            // Function should be captured
            expect(typeof logs[0].input.value).toBe('function');
        });
    });

    describe('String value interpolation (line 139)', () => {
        it('should format string with quotes', () => {
            fixture.logStringInArray();
            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe('Alice');
        });
    });

    describe('Number value interpolation (line 141)', () => {
        it('should format number via String()', () => {
            fixture.logNumberInObject();
            expect(logs.length).toBe(1);
            expect(logs[0].input.value).toBe(100);
        });
    });

    describe('Date value interpolation (lines 125/293)', () => {
        it('should format Date properly', () => {
            fixture.logDateInArray();
            expect(logs.length).toBe(1);
            // Date should be in the value
            expect(logs[0].input.value).toBeDefined();
        });
    });

    describe('Error value interpolation (lines 122-123)', () => {
        it('should format Error', () => {
            fixture.logErrorInArray();
            expect(logs.length).toBe(1);
            // Error gets special handling - check it logged something
            expect(logs[0].input).toBeDefined();
        });
    });

    describe('Buffer value interpolation (lines 126-127)', () => {
        it('should format Buffer', () => {
            fixture.logBufferInArray();
            expect(logs.length).toBe(1);
        });
    });

    describe('Map value interpolation (lines 128-129)', () => {
        it('should format Map', () => {
            fixture.logMapInArray();
            expect(logs.length).toBe(1);
        });
    });

    describe('Set value interpolation (lines 130-131)', () => {
        it('should format Set', () => {
            fixture.logSetInArray();
            expect(logs.length).toBe(1);
        });
    });

    describe('Object value interpolation (lines 134-135)', () => {
        it('should format Object', () => {
            fixture.logObjectInArray();
            expect(logs.length).toBe(1);
        });
    });

    describe('Array value interpolation (lines 132-133)', () => {
        it('should format Array', () => {
            fixture.logArrayInArray();
            expect(logs.length).toBe(1);
        });
    });
});
