/**
 * Advanced fixture file for loader transformation testing
 * These functions exercise complex argument parsing in the loader
 *
 * The loader parses argument names to create template literals like:
 * x=>x`variableName` for variable tracking
 */

const scribbles = require('../../index');

// Test case: Function call result as argument (contains parens)
// Triggers line 117: all.args.push(all.temp) when temp has '(' but doesn't start with quote/bracket
function logWithFunctionCallResult() {
    // getData() result - the loader sees (someArg) which has parens
    const getData = () => ({ id: 123 });
    scribbles.log('result', getData());
}

// Test case: Object with numeric key inside
// Triggers lines 138-140: thisName includes ':' or is a number
function logWithNumericObjectKey() {
    const data = { 0: 'zero', 1: 'one' };
    scribbles.log('numeric keys', data);
}

// Test case: Object with colon in key value
// Triggers the thisName.includes(":") branch
function logWithColonInValue() {
    const config = { url: 'http://localhost:3000' };
    scribbles.log('config', config);
}

// Test case: Template literal with variable interpolation
// Triggers lines 146-151: template literal ${} detection
function logWithTemplateLiteral() {
    const name = 'world';
    const greeting = `Hello, ${name}!`;
    scribbles.log('greeting', greeting);
}

// Test case: Nested object with multiple properties
// Triggers line 167: comma inside brackets
function logWithNestedCommas() {
    const data = { a: 1, b: 2, c: { d: 3, e: 4 } };
    scribbles.log('nested', data);
}

// Test case: Array with multiple elements
// Triggers comma handling inside brackets
function logWithArrayElements() {
    const items = ['one', 'two', 'three'];
    scribbles.log('items', items);
}

// Test case: Arrow function as argument
// Triggers line 103: raw.includes("=>")
function logWithArrowFunction() {
    const handler = (x) => x * 2;
    scribbles.log('handler', handler);
}

// Test case: Regular function as argument
// Triggers line 104: raw.includes("function")
function logWithRegularFunction() {
    function processor(data) { return data; }
    scribbles.log('processor', processor);
}

// Test case: Literal values - undefined, true, false, null
// Triggers lines 105-111: literal value detection
function logWithLiteralValues() {
    scribbles.log('undefined val', undefined);
    scribbles.log('true val', true);
    scribbles.log('false val', false);
    scribbles.log('null val', null);
}

// Test case: Number literals (positive, negative, decimal)
// Triggers line 110: regex for numbers
function logWithNumbers() {
    scribbles.log('positive', 42);
    scribbles.log('negative', -17);
    scribbles.log('decimal', 3.14);
}

// Test case: new Date as argument
// Triggers lines 108-109: "new Date" detection
function logWithDate() {
    scribbles.log('date', new Date());
    scribbles.log('date2', new Date);
}

// Test case: String literal starting with quote
// Triggers line 93-96: string detection
function logWithStringLiteral() {
    scribbles.log('greeting', "Hello World");
    scribbles.log('greeting2', 'Single quotes');
}

// Test case: Object literal as direct argument (starts with {)
// Triggers line 89-90: bracket at start
function logWithInlineObject() {
    scribbles.log('inline', { x: 1, y: 2 });
}

// Test case: Array literal as direct argument (starts with [)
// Triggers line 89: array at start
function logWithInlineArray() {
    scribbles.log('inline array', [1, 2, 3]);
}

// Test case: Multi-line call spanning lines
// Triggers lines 27-30: getNextChar across lines
function logMultiLineWithManyArgs() {
    const x = 10;
    const y = 20;
    scribbles.log(
        'coordinates',
        x,
        y,
        { sum: x + y }
    );
}

// Test case: Template literal with expression
// Complex parsing of ${} inside template
function logWithTemplateExpression() {
    const count = 5;
    scribbles.log('count', `Total: ${count * 2}`);
}

// Test case: Nested function calls
function logWithNestedCalls() {
    const transform = (x) => x.toUpperCase();
    const data = 'hello';
    scribbles.log('transformed', transform(data));
}

// Test case: Object with method syntax value
function logWithMethodValue() {
    const handlers = {
        onClick: () => {},
        onSubmit: function() {}
    };
    scribbles.log('handlers', handlers);
}

// Test case: Expression with parentheses
function logWithParenExpression() {
    const a = 5;
    const b = 3;
    scribbles.log('result', (a + b));
}

module.exports = {
    logWithFunctionCallResult,
    logWithNumericObjectKey,
    logWithColonInValue,
    logWithTemplateLiteral,
    logWithNestedCommas,
    logWithArrayElements,
    logWithArrowFunction,
    logWithRegularFunction,
    logWithLiteralValues,
    logWithNumbers,
    logWithDate,
    logWithStringLiteral,
    logWithInlineObject,
    logWithInlineArray,
    logMultiLineWithManyArgs,
    logWithTemplateExpression,
    logWithNestedCalls,
    logWithMethodValue,
    logWithParenExpression
};
