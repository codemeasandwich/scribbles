/**
 * Fixture to test parceStringVals with different value types
 *
 * The loader transforms:
 *   scribbles.log('msg', varName)
 * Into:
 *   scribbles.log.at({..., args:[false, x=>x`varName:${varName}`]}, 'msg', varName)
 *
 * When the template literal x`varName:${varName}` is evaluated with parceStringVals,
 * parceStringVals receives (['varName:', ''], actualValueOfVarName)
 *
 * So to trigger line 121 (function), we need a log where the VALUE is a function.
 */

const scribbles = require('../../index');

// Trigger line 121: function as interpolated value
function logWithFunctionInterpolation() {
    const handler = () => 'result';
    // The loader will capture 'handler' and when evaluated, handler's value (a function)
    // is passed to parceStringVals as vals[0]
    scribbles.log('The handler is', handler);
}

// Trigger line 139: string as interpolated value
function logWithStringInterpolation() {
    const userName = 'Alice';
    // userName's value ('Alice') is passed to parceStringVals
    scribbles.log('User name is', userName);
}

// Trigger line 265: Symbol in message position is different - need Symbol as arg
function logSymbolArg() {
    const sym = Symbol('testSymbol');
    scribbles.log(sym);
}

// Trigger line 293: Date as value
function logWithDateInterpolation() {
    const timestamp = new Date('2024-01-01');
    scribbles.log('Time is', timestamp);
}

// These don't need special handling in parceStringVals because they
// are handled by the else-if chain before string:

// Error as interpolated value (line 122-123)
function logWithErrorInterpolation() {
    const err = new Error('whoops');
    scribbles.log('Got error', err);
}

// Buffer as interpolated value (line 126-127)
function logWithBufferInterpolation() {
    const buf = Buffer.from('data');
    scribbles.log('Buffer content', buf);
}

// Map as interpolated value (line 128-129)
function logWithMapInterpolation() {
    const cache = new Map([['key', 'val']]);
    scribbles.log('Cache state', cache);
}

// Set as interpolated value (line 130-131)
function logWithSetInterpolation() {
    const ids = new Set([1, 2, 3]);
    scribbles.log('Active IDs', ids);
}

// Array as interpolated value (line 132-133)
function logWithArrayInterpolation() {
    const items = [1, 2, 3];
    scribbles.log('Items list', items);
}

// Object as interpolated value (line 134-135)
function logWithObjectInterpolation() {
    const config = { debug: true };
    scribbles.log('Config object', config);
}

// To trigger line 275, we need:
// - argNames[0] to exist (loader captured a name)
// - indexs.indexOf("value") to be -1 (no value position)
// - indexs.indexOf("message") to be 0 (message is first)
// This happens when logging ONLY a variable
function logSingleVariableOnly() {
    const status = 'ready';
    scribbles.log(status);
}

// null value gets to line 141 (else branch: String(null))
function logWithNullInterpolation() {
    const empty = null;
    scribbles.log('Value is', empty);
}

// number value gets to line 141 (else branch: String(42))
function logWithNumberInterpolation() {
    const count = 42;
    scribbles.log('Count is', count);
}

// boolean value
function logWithBooleanInterpolation() {
    const flag = true;
    scribbles.log('Flag is', flag);
}

// undefined value
function logWithUndefinedInterpolation() {
    const notSet = undefined;
    scribbles.log('Not set', notSet);
}

module.exports = {
    logWithFunctionInterpolation,
    logWithStringInterpolation,
    logSymbolArg,
    logWithDateInterpolation,
    logWithErrorInterpolation,
    logWithBufferInterpolation,
    logWithMapInterpolation,
    logWithSetInterpolation,
    logWithArrayInterpolation,
    logWithObjectInterpolation,
    logSingleVariableOnly,
    logWithNullInterpolation,
    logWithNumberInterpolation,
    logWithBooleanInterpolation,
    logWithUndefinedInterpolation
};
