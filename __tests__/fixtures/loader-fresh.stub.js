/**
 * Fresh fixture to trigger loader hook during test execution
 * This file has multi-line scribbles calls that should trigger
 * the getNextChar line-crossing code in loader.js lines 27-30
 */

const scribbles = require('../../index');

// Multi-line call where argument parsing crosses line boundary
function multiLineCall() {
    scribbles.log(
        'message that spans',
        { key: 'value' }
    );
}

// Call with template literal
function templateCall() {
    const x = 42;
    scribbles.log(`value is ${x}`);
}

module.exports = {
    multiLineCall,
    templateCall
};
