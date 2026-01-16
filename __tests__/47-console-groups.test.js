/**
 * Integration tests for console group functions
 * Tests scribbles.group.start(), scribbles.group.end(), scribbles.group.collapsed()
 */

const scribbles = require('../index');

describe('Console Group Functions', () => {
    let logs = [];
    let stdOutCalls = [];

    beforeEach(() => {
        logs = [];
        stdOutCalls = [];
        // Reset config with clean state - don't set groupBrackets to avoid config merge bug
        scribbles.config({
            stdOut: (msg) => stdOutCalls.push(msg),
            dataOut: (data) => logs.push(data),
            levels: ['error', 'warn', 'log', 'info', 'debug'],
            logLevel: 'debug'
        });
        // Clean up any lingering groups from previous tests
        while (scribbles._groupStack && scribbles._groupStack.length > 0) {
            scribbles._groupStack.pop();
        }
    });

    describe('scribbles.group.start()', () => {
        it('should return a group ID', () => {
            const groupId = scribbles.group.start('Test Group');
            expect(typeof groupId).toBe('number');
            expect(groupId).toBeGreaterThan(0);
            scribbles.group.end();
        });

        it('should create a log entry with level "group"', () => {
            scribbles.group.start('My Group');
            expect(logs[0].info.logLevel).toBe('group');
            scribbles.group.end();
        });

        it('should include label in output', () => {
            scribbles.group.start('Label Test');
            expect(stdOutCalls[0]).toContain('Label Test');
            scribbles.group.end();
        });

        it('should use "Group" as default label when none provided', () => {
            scribbles.group.start();
            expect(stdOutCalls[0]).toContain('Group');
            scribbles.group.end();
        });

        it('should increment group level for nested logs', () => {
            scribbles.group.start('Outer');
            scribbles.log('inside group');
            expect(logs[1].context.groupLevel).toBe(1);
            scribbles.group.end();
        });
    });

    describe('scribbles.group.collapsed()', () => {
        it('should return a group ID', () => {
            const groupId = scribbles.group.collapsed('Collapsed Group');
            expect(typeof groupId).toBe('number');
            expect(groupId).toBeGreaterThan(0);
            scribbles.group.end();
        });

        it('should create a log entry with level "groupCollapsed"', () => {
            scribbles.group.collapsed('Collapsed');
            expect(logs[0].info.logLevel).toBe('groupCollapsed');
            scribbles.group.end();
        });

        it('should increment group level for nested logs', () => {
            scribbles.group.collapsed('Collapsed Outer');
            scribbles.log('inside collapsed group');
            expect(logs[1].context.groupLevel).toBe(1);
            scribbles.group.end();
        });
    });

    describe('scribbles.group.end()', () => {
        it('should create a log entry with level "groupEnd"', () => {
            scribbles.group.start('Test');
            scribbles.group.end();
            expect(logs[1].info.logLevel).toBe('groupEnd');
        });

        it('should decrease group level after end (LIFO)', () => {
            scribbles.group.start('Test');
            scribbles.log('inside');
            expect(logs[1].context.groupLevel).toBe(1);
            scribbles.group.end();
            scribbles.log('outside');
            expect(logs[3].context.groupLevel).toBe(0);
        });

        it('should close specific group by ID', () => {
            const id1 = scribbles.group.start('First');
            scribbles.group.start('Second');
            scribbles.log('nested');
            expect(logs[2].context.groupLevel).toBe(2);

            // Close first group (and implicitly the second)
            scribbles.group.end(id1);
            scribbles.log('after closing first');
            expect(logs[4].context.groupLevel).toBe(0);
        });

        it('should safely handle end when no groups are open', () => {
            // Should not throw
            expect(() => scribbles.group.end()).not.toThrow();
        });
    });

    describe('Nested groups', () => {
        it('should track multiple nesting levels', () => {
            scribbles.group.start('Level 1');
            scribbles.log('at level 1');
            expect(logs[1].context.groupLevel).toBe(1);

            scribbles.group.start('Level 2');
            scribbles.log('at level 2');
            expect(logs[3].context.groupLevel).toBe(2);

            scribbles.group.start('Level 3');
            scribbles.log('at level 3');
            expect(logs[5].context.groupLevel).toBe(3);

            scribbles.group.end();
            scribbles.log('back to level 2');
            expect(logs[7].context.groupLevel).toBe(2);

            scribbles.group.end();
            scribbles.group.end();
        });

        it('should build groupLabel from nested labels', () => {
            scribbles.group.start('Auth');
            scribbles.group.start('Validation');
            scribbles.log('checking token');

            expect(logs[2].context.groupLabel).toBe('Auth > Validation');

            scribbles.group.end();
            scribbles.group.end();
        });

        it('should filter empty labels from groupLabel', () => {
            scribbles.group.start('Named');
            scribbles.group.start(); // No label
            scribbles.log('test');

            expect(logs[2].context.groupLabel).toBe('Named');

            scribbles.group.end();
            scribbles.group.end();
        });
    });

    describe('Group indentation output', () => {
        it('should indent logs inside groups (simple mode)', () => {
            // groupBrackets defaults to undefined/false, so simple indentation is used
            scribbles.group.start('Test');
            scribbles.log('indented');

            // The log message should be indented
            expect(stdOutCalls[1]).toMatch(/^  /);

            scribbles.group.end();
        });

        it('should increase indentation with nesting (simple mode)', () => {
            scribbles.group.start('Outer');
            scribbles.group.start('Inner');
            scribbles.log('deeply nested');

            // Should have 4 spaces (2 levels x 2 spaces)
            expect(stdOutCalls[2]).toMatch(/^    /);

            scribbles.group.end();
            scribbles.group.end();
        });
    });

    describe('ASCII bracket mode (pretty.groupBrackets: true)', () => {
        it('should prefix group start with top bracket', () => {
            const output = [];
            scribbles.config({
                stdOut: (msg) => output.push(msg),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug',
                pretty: { groupBrackets: true }
            });
            scribbles.group.start('Bracket Test');
            expect(output[0]).toMatch(/^⎡ /);
            scribbles.group.end();
        });

        it('should prefix logs inside group with vertical bar', () => {
            const output = [];
            scribbles.config({
                stdOut: (msg) => output.push(msg),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug',
                pretty: { groupBrackets: true }
            });
            scribbles.group.start('Test');
            scribbles.log('inside');
            expect(output[1]).toMatch(/^⎜ /);
            scribbles.group.end();
        });

        it('should prefix group end with bottom bracket', () => {
            const output = [];
            scribbles.config({
                stdOut: (msg) => output.push(msg),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug',
                pretty: { groupBrackets: true }
            });
            scribbles.group.start('Test');
            scribbles.group.end();
            expect(output[1]).toMatch(/^⎣/);
        });

        it('should indent nested groups with vertical bar', () => {
            const output = [];
            scribbles.config({
                stdOut: (msg) => output.push(msg),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug',
                pretty: { groupBrackets: true }
            });
            scribbles.group.start('Outer');
            scribbles.group.start('Inner');
            scribbles.log('nested');

            // Should have bar + indent for nested content
            expect(output[2]).toMatch(/^⎜   /);

            scribbles.group.end();
            scribbles.group.end();
        });
    });

    describe('Reserved function name protection', () => {
        it('should not allow "group" as a log level', () => {
            expect(() => {
                scribbles.config({
                    levels: ['error', 'group', 'log']
                });
            }).toThrow(/group/);
        });
    });

    describe('Unique group IDs', () => {
        it('should return unique IDs for each group', () => {
            const id1 = scribbles.group.start('First');
            scribbles.group.end();
            const id2 = scribbles.group.start('Second');
            scribbles.group.end();
            const id3 = scribbles.group.start('Third');
            scribbles.group.end();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should reset IDs on config (consistent with timer behavior)', () => {
            const id1 = scribbles.group.start('Before');
            scribbles.group.end();

            scribbles.config({
                stdOut: (msg) => stdOutCalls.push(msg),
                dataOut: (data) => logs.push(data),
                levels: ['error', 'warn', 'log', 'info', 'debug'],
                logLevel: 'debug'
            });

            const id2 = scribbles.group.start('After');
            scribbles.group.end();

            // IDs reset on config (same as timers reset on config)
            expect(id2).toBe(1);
        });
    });
});
