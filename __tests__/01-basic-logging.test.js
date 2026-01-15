/**
 * Integration tests for basic logging API
 * Tests all argument permutations from sample.js
 */

const scribbles = require('../index');

describe('Basic Logging API', () => {
    let logs = [];

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data)
        });
    });

    describe('API(message) - string only', () => {
        it('debug(message)', () => {
            const result = scribbles.debug('HelloWorld');
            expect(result.input.message).toBe('HelloWorld');
            expect(result.info.logLevel).toBe('debug');
        });

        it('info(message)', () => {
            const result = scribbles.info('HelloWorld');
            expect(result.input.message).toBe('HelloWorld');
            expect(result.info.logLevel).toBe('info');
        });

        it('log(message)', () => {
            const result = scribbles.log('HelloWorld');
            expect(result.input.message).toBe('HelloWorld');
            expect(result.info.logLevel).toBe('log');
        });

        it('warn(message)', () => {
            const result = scribbles.warn('HelloWorld');
            expect(result.input.message).toBe('HelloWorld');
            expect(result.info.logLevel).toBe('warn');
        });

        it('error(message)', () => {
            const result = scribbles.error('HelloWorld');
            expect(result.input.message).toBe('HelloWorld');
            expect(result.info.logLevel).toBe('error');
        });
    });

    describe('API(value) - value only', () => {
        it('log(null)', () => {
            const result = scribbles.log(null);
            expect(result.input.value).toBe(null);
        });

        it('log(number)', () => {
            const result = scribbles.log(123);
            expect(result.input.value).toBe(123);
        });

        it('log(object)', () => {
            const result = scribbles.log({ foo: 'bar' });
            expect(result.input.value).toEqual({ foo: 'bar' });
        });

        it('log(undefined)', () => {
            const result = scribbles.log(undefined);
            expect(result.input.value).toBe(undefined);
        });

        it('log(Date)', () => {
            const date = new Date('2024-01-01');
            const result = scribbles.log(date);
            expect(result.input.value).toEqual(date);
        });
    });

    describe('API(error) - Error only', () => {
        it('error(Error)', () => {
            const err = new Error('an err');
            const result = scribbles.error(err);
            expect(result.input.message).toBe('an err');
            expect(result.input.stackTrace).toBeDefined();
            expect(Array.isArray(result.input.stackTrace)).toBe(true);
        });
    });

    describe('API(message, value)', () => {
        it('debug(message, null)', () => {
            const result = scribbles.debug('HelloNull', null);
            expect(result.input.message).toBe('HelloNull');
            expect(result.input.value).toBe(null);
        });

        it('info(message, number)', () => {
            const result = scribbles.info('HelloNumber', 123);
            expect(result.input.message).toBe('HelloNumber');
            expect(result.input.value).toBe(123);
        });

        it('log(message, object)', () => {
            const result = scribbles.log('HelloObject', { foo: 'bar' });
            expect(result.input.message).toBe('HelloObject');
            expect(result.input.value).toEqual({ foo: 'bar' });
        });

        it('warn(message, undefined)', () => {
            const result = scribbles.warn('HelloUndefined', undefined);
            expect(result.input.message).toBe('HelloUndefined');
            expect(result.input.value).toBe(undefined);
        });
    });

    describe('API(message, error)', () => {
        it('error(message, Error)', () => {
            const err = new Error('an err2');
            const result = scribbles.error('HelloError2', err);
            expect(result.input.message).toBe('HelloError2');
            expect(result.input.originalMessage).toBe('an err2');
            expect(result.input.stackTrace).toBeDefined();
        });
    });

    describe('API(value, error)', () => {
        it('error(object, Error)', () => {
            const err = new Error('an err4');
            const result = scribbles.error({ bar: 'baz' }, err);
            expect(result.input.value).toEqual({ bar: 'baz' });
            expect(result.input.stackTrace).toBeDefined();
        });

        it('error(Error, value) - Error first, value second', () => {
            // User story: Developer passes Error as first arg, value as second
            const err = new Error('first arg error');
            const result = scribbles.error(err, { extra: 'context' });
            expect(result.input.message).toBe('first arg error');
            expect(result.input.value).toEqual({ extra: 'context' });
            expect(result.input.stackTrace).toBeDefined();
        });
    });

    describe('API(message, value, error)', () => {
        it('error(message, object, Error)', () => {
            const err = new Error('an err3');
            const result = scribbles.error('HelloError3', { bar: 'baz' }, err);
            expect(result.input.message).toBe('HelloError3');
            expect(result.input.value).toEqual({ bar: 'baz' });
            expect(result.input.stackTrace).toBeDefined();
        });
    });

    describe('API(message, error, value)', () => {
        it('error(message, Error, object) - alternate order', () => {
            const err = new Error('an err5');
            const result = scribbles.error('HelloError5', err, { baz: 'qux' });
            expect(result.input.message).toBe('HelloError5');
            expect(result.input.value).toEqual({ baz: 'qux' });
            expect(result.input.stackTrace).toBeDefined();
        });
    });

    describe('Empty/no arguments', () => {
        it('warn() with no arguments', () => {
            const result = scribbles.warn();
            expect(result).toBeDefined();
        });
    });

    describe('Log entry structure', () => {
        it('should have all required fields', () => {
            const result = scribbles.log('test');

            // Version
            expect(result.v).toBeDefined();
            expect(typeof result.v).toBe('string');

            // Git info
            expect(result.git).toBeDefined();
            expect(result.git.repo).toBeDefined();
            expect(result.git.branch).toBeDefined();
            expect(result.git.hash).toBeDefined();

            // Trace info
            expect(result.trace).toBeDefined();

            // Info
            expect(result.info).toBeDefined();
            expect(result.info.time).toBeInstanceOf(Date);
            expect(result.info.mode).toBeDefined();
            expect(result.info.hostname).toBeDefined();
            expect(result.info.instance).toBeDefined();
            expect(result.info.logLevel).toBe('log');

            // Context
            expect(result.context).toBeDefined();
            expect(result.context.fileName).toBeDefined();
            expect(typeof result.context.lineNumber).toBe('number');

            // Input
            expect(result.input).toBeDefined();
            expect(result.input.message).toBe('test');

            // toString
            expect(typeof result.toString).toBe('function');
            expect(typeof result.toString()).toBe('string');
        });
    });

    describe('toString() output', () => {
        it('should return formatted string', () => {
            const result = scribbles.log('test message');
            const str = result.toString();
            expect(str).toContain('test message');
            expect(str).toContain('<log>');
        });
    });
});
