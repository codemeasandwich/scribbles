/**
 * Fixture to test parceStringVals edge cases via the loader
 * Each function here triggers a specific code path in index.js
 */

const scribbles = require('../../index');

// Test function value in parceStringVals (line 121)
function logFunctionValue() {
    const myCallback = function handler(a, b) { return a + b; };
    scribbles.log('handler is', myCallback);
}

// Test string value in parceStringVals (line 139)
function logStringValue() {
    const name = 'John';
    scribbles.log('name is', name);
}

// Test Symbol value (line 265)
function logSymbolMessage() {
    const sym = Symbol('mySymbol');
    scribbles.log(sym);
}

// Test Date value (line 293)
function logDateValue() {
    const date = new Date('2024-06-15T12:00:00Z');
    scribbles.log('date is', date);
}

// Test Error instance in parceStringVals (line 122-123)
function logErrorInVals() {
    const err = new Error('test error');
    scribbles.log('error is', err);
}

// Test Buffer value (line 126-127)
function logBufferValue() {
    const buf = Buffer.from('hello');
    scribbles.log('buffer is', buf);
}

// Test Map value (line 128-129)
function logMapValue() {
    const map = new Map([['key', 'value']]);
    scribbles.log('map is', map);
}

// Test Set value (line 130-131)
function logSetValue() {
    const set = new Set([1, 2, 3]);
    scribbles.log('set is', set);
}

// Test Array value (line 132-133)
function logArrayValue() {
    const arr = [1, 2, 3];
    scribbles.log('array is', arr);
}

// Test Object value (line 134-135)
function logObjectValue() {
    const obj = { foo: 'bar' };
    scribbles.log('object is', obj);
}

// Test single variable to get arg name prefix (line 275)
function logSingleVar() {
    const userId = 'user-123';
    scribbles.log(userId);
}

module.exports = {
    logFunctionValue,
    logStringValue,
    logSymbolMessage,
    logDateValue,
    logErrorInVals,
    logBufferValue,
    logMapValue,
    logSetValue,
    logArrayValue,
    logObjectValue,
    logSingleVar
};
