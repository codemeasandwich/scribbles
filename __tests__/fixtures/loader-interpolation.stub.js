/**
 * Fixture to test parceStringVals interpolation
 *
 * The loader adds ${} interpolation for:
 * - Array index access: arr[i] -> arr[i${i}]
 * - Object computed property: obj[key] -> obj[key${key}]
 *
 * When these templates are evaluated with parceStringVals,
 * the actual values are passed in the vals array.
 */

const scribbles = require('../../index');

// Array index access triggers interpolation
function logArrayIndex() {
    const users = ['Alice', 'Bob', 'Charlie'];
    const i = 1;
    scribbles.log('User at index', users[i]);
}

// Object computed property triggers interpolation
function logObjectComputed() {
    const data = { name: 'test', value: 42 };
    const key = 'name';
    scribbles.log('Property value', data[key]);
}

// Nested access triggers multiple interpolations
function logNestedAccess() {
    const matrix = [[1, 2], [3, 4]];
    const row = 0;
    const col = 1;
    scribbles.log('Cell value', matrix[row][col]);
}

// Function value in array - triggers line 121 in parceStringVals
function logFunctionInArray() {
    const handlers = [() => 'first', () => 'second'];
    const idx = 0;
    scribbles.log('Handler', handlers[idx]);
}

// String value in array - triggers line 139
function logStringInArray() {
    const names = ['Alice', 'Bob'];
    const idx = 0;
    scribbles.log('Name', names[idx]);
}

// Number value in object - triggers line 141 (else branch)
function logNumberInObject() {
    const counts = { a: 100, b: 200 };
    const key = 'a';
    scribbles.log('Count', counts[key]);
}

// Date value in array - triggers line 125 or 293
function logDateInArray() {
    const dates = [new Date('2024-01-01'), new Date('2024-12-31')];
    const idx = 0;
    scribbles.log('Date', dates[idx]);
}

// Error in array - triggers line 122-123
function logErrorInArray() {
    const errors = [new Error('first'), new Error('second')];
    const idx = 0;
    scribbles.log('Error', errors[idx]);
}

// Buffer in array - triggers line 126-127
function logBufferInArray() {
    const buffers = [Buffer.from('hello'), Buffer.from('world')];
    const idx = 0;
    scribbles.log('Buffer', buffers[idx]);
}

// Map in array - triggers line 128-129
function logMapInArray() {
    const maps = [new Map([['a', 1]]), new Map([['b', 2]])];
    const idx = 0;
    scribbles.log('Map', maps[idx]);
}

// Set in array - triggers line 130-131
function logSetInArray() {
    const sets = [new Set([1, 2]), new Set([3, 4])];
    const idx = 0;
    scribbles.log('Set', sets[idx]);
}

// Object in array - triggers line 134-135
function logObjectInArray() {
    const objects = [{ id: 1 }, { id: 2 }];
    const idx = 0;
    scribbles.log('Object', objects[idx]);
}

// Array in array - triggers line 132-133
function logArrayInArray() {
    const arrays = [[1, 2], [3, 4]];
    const idx = 0;
    scribbles.log('Array', arrays[idx]);
}

module.exports = {
    logArrayIndex,
    logObjectComputed,
    logNestedAccess,
    logFunctionInArray,
    logStringInArray,
    logNumberInObject,
    logDateInArray,
    logErrorInArray,
    logBufferInArray,
    logMapInArray,
    logSetInArray,
    logObjectInArray,
    logArrayInArray
};
