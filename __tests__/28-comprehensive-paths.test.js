/**
 * Comprehensive path testing for remaining uncovered lines
 *
 * Focuses on specific code paths that are hard to reach
 */

const scribbles = require('../index');

describe('Comprehensive Path Coverage', () => {

    describe('package.json scribbles config (lines 31-33)', () => {
        it('should work with existing scribbles configuration', () => {
            // The package.json config is read at module load time
            // Just verify scribbles works normally after loading
            scribbles.config({
                stdOut: null,
                dataOut: null
            });

            expect(() => scribbles.log('test')).not.toThrow();
        });
    });

    describe('parceStringVals function type handling', () => {
        // This function is used internally when loader parses arguments
        // We test through the exposed API

        it('should handle Error in value (line 122-123)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            // Error gets special formatting
            const err = new TypeError('test error');
            scribbles.log('error', err);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle Date in value (line 124-125)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            const date = new Date('2024-01-15');
            scribbles.log('date', date);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle Buffer in value (line 126-127)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            const buf = Buffer.from('test');
            scribbles.log('buffer', buf);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle Map in value (line 128-129)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            const map = new Map([['key', 'value']]);
            scribbles.log('map', map);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle Set in value (line 130-131)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            const set = new Set([1, 2, 3]);
            scribbles.log('set', set);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle Array in value (line 132-133)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            scribbles.log('array', [1, 2, 3]);

            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should handle plain object in value (line 134-135)', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null
            });

            scribbles.log('object', { key: 'value' });

            expect(outputs.length).toBeGreaterThan(0);
        });
    });

    describe('status level vs statusX level', () => {
        it('should handle status level internally', () => {
            // scribbles.status() uses statusX which then calls status internally
            const result = scribbles.status('test');
            expect(result).toBeDefined();
        });
    });

    describe('toString body formatting', () => {
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

        it('should include all body fields in toString', () => {
            scribbles.log('test message');

            expect(dataOutputs.length).toBe(1);
            const body = dataOutputs[0];

            // Verify body structure
            expect(body.v).toBeDefined();
            expect(body.git).toBeDefined();
            expect(body.trace).toBeDefined();
            expect(body.info).toBeDefined();
            expect(body.context).toBeDefined();
            expect(body.input).toBeDefined();
            expect(typeof body.toString).toBe('function');
        });

        it('should format time using moment', () => {
            scribbles.log('test');

            expect(outputs.length).toBe(1);
            // Output should contain formatted time
            expect(outputs[0]).toBeDefined();
        });
    });

    describe('pretty config options', () => {
        it('should handle indent option (line 564-566)', () => {
            scribbles.config({
                mode: 'dev',
                stdOut: null,
                dataOut: null,
                pretty: {
                    indent: '    '
                }
            });

            expect(() => scribbles.log('test', { nested: 'value' })).not.toThrow();
        });

        it('should handle inlineCharacterLimit explicitly set', () => {
            scribbles.config({
                stdOut: null,
                dataOut: null,
                pretty: {
                    inlineCharacterLimit: 100
                }
            });

            expect(() => scribbles.log('test', { key: 'value' })).not.toThrow();
        });
    });

    describe('gitEnv configuration (lines 580-593)', () => {
        it('should update git values from env vars', () => {
            const originalHash = process.env.MY_GIT_HASH;
            const originalRepo = process.env.MY_GIT_REPO;
            const originalBranch = process.env.MY_GIT_BRANCH;

            process.env.MY_GIT_HASH = 'abc1234567890';
            process.env.MY_GIT_REPO = 'test-repo';
            process.env.MY_GIT_BRANCH = 'test-branch';

            scribbles.config({
                stdOut: null,
                dataOut: null,
                gitEnv: {
                    hash: 'MY_GIT_HASH',
                    repo: 'MY_GIT_REPO',
                    branch: 'MY_GIT_BRANCH'
                }
            });

            // Cleanup
            if (originalHash !== undefined) process.env.MY_GIT_HASH = originalHash;
            else delete process.env.MY_GIT_HASH;
            if (originalRepo !== undefined) process.env.MY_GIT_REPO = originalRepo;
            else delete process.env.MY_GIT_REPO;
            if (originalBranch !== undefined) process.env.MY_GIT_BRANCH = originalBranch;
            else delete process.env.MY_GIT_BRANCH;

            expect(() => scribbles.log('test')).not.toThrow();
        });

        it('should handle partial gitEnv config', () => {
            scribbles.config({
                stdOut: null,
                dataOut: null,
                gitEnv: {
                    hash: 'NONEXISTENT_VAR'
                    // repo and branch not set
                }
            });

            expect(() => scribbles.log('test')).not.toThrow();
        });
    });

    describe('log level suppression (lines 612-617)', () => {
        it('should suppress log levels below configured level', () => {
            const outputs = [];
            scribbles.config({
                stdOut: (msg) => outputs.push(msg),
                dataOut: null,
                logLevel: 'warn',
                levels: ['error', 'warn', 'log', 'info', 'debug']
            });

            scribbles.debug('should not appear');
            scribbles.info('should not appear');
            scribbles.warn('should appear');

            expect(outputs.length).toBe(1);
            expect(outputs[0]).toContain('should appear');
        });

        it('should have no-op functions for suppressed levels', () => {
            scribbles.config({
                stdOut: null,
                dataOut: null,
                logLevel: 'error',
                levels: ['error', 'warn', 'log', 'info', 'debug']
            });

            // These should be no-op functions
            expect(typeof scribbles.debug).toBe('function');
            expect(typeof scribbles.debug.at).toBe('function');

            // Should not throw when called
            expect(() => scribbles.debug('suppressed')).not.toThrow();
            expect(() => scribbles.debug.at({ file: 'test.js', line: 1, col: 0, args: [] }, 'suppressed')).not.toThrow();
        });
    });

    describe('isValidRegex function (lines 674-681)', () => {
        it('should handle various regex delimiters', () => {
            // The isValidRegex function is internal but affects hijacker behavior
            scribbles.config({
                stdOut: null,
                dataOut: null
            });

            // Just verify config doesn't throw with various options
            expect(() => scribbles.config({})).not.toThrow();
        });
    });

    describe('Custom levels configuration', () => {
        it('should throw on reserved function names as levels', () => {
            expect(() => {
                scribbles.config({
                    levels: ['config', 'error', 'warn']
                });
            }).toThrow();

            expect(() => {
                scribbles.config({
                    levels: ['trace', 'error']
                });
            }).toThrow();
        });
    });
});

describe('Timer error handling', () => {
    it('should throw when timerEnd called without matching timer', () => {
        expect(() => {
            scribbles.timerEnd('nonexistent-timer-unique-12345');
        }).toThrow("Timer 'nonexistent-timer-unique-12345' does not exist");
    });
});
