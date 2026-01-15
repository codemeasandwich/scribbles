/**
 * Fixture to test multi-line scribbles call parsing
 *
 * User Scenario: Developer writes scribbles calls that span multiple lines
 * for readability, especially with complex objects or multiple arguments.
 *
 * This triggers loader.js lines 14-40, especially the getNextChar function
 * that moves to the next line (lines 27-29) when arguments span multiple lines.
 */

const scribbles = require('../../index');

// Scenario 1: Multi-line call with object spread across lines
// This triggers the getNextChar moving to next line
function multilineObjectLog() {
    const userData = {
        name: 'Alice',
        email: 'alice@example.com'
    };
    scribbles.log(
        "User created",
        userData
    );
}

// Scenario 2: Multi-line with many arguments
function multilineMultipleArgs() {
    const action = 'login';
    const userId = 12345;
    const timestamp = new Date();
    scribbles.info(
        action,
        userId
    );
}

// Scenario 3: Multi-line with inline object
function multilineInlineObject() {
    scribbles.debug(
        "Config loaded",
        {
            debug: true,
            verbose: false
        }
    );
}

// Scenario 4: Very long argument that wraps
function multilineWrappedString() {
    const longMessage = "This is a very long message that a developer might write";
    scribbles.warn(
        longMessage
    );
}

module.exports = {
    multilineObjectLog,
    multilineMultipleArgs,
    multilineInlineObject,
    multilineWrappedString
};
