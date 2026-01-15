/**
 * E2E Tests: Multi-line scribbles call parsing through loader
 *
 * User Scenario: Developer writes scribbles calls that span multiple lines
 * for readability. The webpack loader must correctly parse these.
 *
 * This tests loader.js lines 14-40, especially the getNextChar() function
 * that advances to the next line when parsing arguments that span lines.
 */

describe('Loader: Multi-line scribbles call parsing', () => {
    let logs = [];
    let scribbles;
    let fixture;

    beforeAll(() => {
        // IMPORTANT: Loader must be required first to intercept file loads
        require('../src/loader');
        scribbles = require('../index');
        // Fixture is transformed by loader - multi-line calls are parsed
        fixture = require('./fixtures/loader-multiline.stub');
    });

    beforeEach(() => {
        logs = [];
        scribbles.config({
            stdOut: null,
            dataOut: (data) => logs.push(data),
            logLevel: 'debug'
        });
    });

    describe('User writes multi-line log calls for readability', () => {
        test('multi-line call with object argument', () => {
            // Scenario: Developer spreads call across lines for readability
            fixture.multilineObjectLog();

            expect(logs.length).toBe(1);
            expect(logs[0].input.message).toBe('User created');
            expect(logs[0].input.value).toEqual({
                name: 'Alice',
                email: 'alice@example.com'
            });
        });

        test('multi-line call with multiple arguments', () => {
            fixture.multilineMultipleArgs();

            expect(logs.length).toBe(1);
            expect(logs[0].input.message).toBe('login');
            expect(logs[0].input.value).toBe(12345);
        });

        test('multi-line call with inline object definition', () => {
            fixture.multilineInlineObject();

            expect(logs.length).toBe(1);
            expect(logs[0].input.message).toBe('Config loaded');
            expect(logs[0].input.value).toEqual({
                debug: true,
                verbose: false
            });
        });

        test('multi-line call with wrapped string argument', () => {
            fixture.multilineWrappedString();

            expect(logs.length).toBe(1);
            expect(logs[0].input.message).toContain('very long message');
        });
    });
});
