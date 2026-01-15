/**
 * Fixture file to be transformed by the loader
 * When required through the loader, all scribbles.xxx() calls
 * get transformed to scribbles.xxx.at({file, line, col, args}, ...)
 */

const scribbles = require('../../index');

function simpleLog() {
    // Line 10 - the loader should transform this
    scribbles.log('hello from fixture');
}

function logWithVariable() {
    const userName = 'test-user';
    // Line 16 - should capture 'userName' in args
    scribbles.log('user login', userName);
}

function logWithObject() {
    const data = { id: 123, name: 'test' };
    // Line 22 - should capture 'data' in args  
    scribbles.log('data received', data);
}

function errorLog() {
    const err = new Error('test error');
    // Line 28
    scribbles.error('something failed', err);
}

function warnLog() {
    // Line 32
    scribbles.warn('warning message');
}

function infoLog() {
    // Line 36
    scribbles.info('info message');
}

function debugLog() {
    // Line 40
    scribbles.debug('debug message');
}

function multiLineArgs() {
    // Test multi-line argument parsing
    scribbles.log(
        'multi-line',
        { key: 'value' }
    );
}

function logWithFunctionVar() {
    // User story: Developer logs a callback function variable
    // Should trigger parceStringVals with function type
    const myCallback = () => "result";
    scribbles.log('callback', myCallback);
}

function logSingleVariable() {
    // User story: Developer logs just a variable
    // Should show variable name prefix in output
    const userName = 'Alice';
    scribbles.log(userName);
}

module.exports = {
    simpleLog,
    logWithVariable,
    logWithObject,
    errorLog,
    warnLog,
    infoLog,
    debugLog,
    multiLineArgs,
    logWithFunctionVar,
    logSingleVariable
};
