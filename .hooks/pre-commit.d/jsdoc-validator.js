#!/usr/bin/env node
/**
 * @file JSDoc validator for pre-commit hook
 * Validates that JavaScript files have proper JSDoc documentation.
 */

const fs = require("fs");
const { checkFileJSDoc } = require("./jsdoc/fileCheck.js");
const { findFunctions } = require("./jsdoc/functions.js");
const { checkFunctionJSDoc } = require("./jsdoc/functionCheck.js");

const file = process.argv[2];
if (!file) {
  console.error("Usage: jsdoc-validator.js <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");
const lines = content.split("\n");
const errors = [];

// Check file-level JSDoc
errors.push(...checkFileJSDoc(content));

// Find and check all functions
const functions = findFunctions(content);
for (const func of functions) {
  errors.push(...checkFunctionJSDoc(func, lines, content));
}

// Output results
if (errors.length > 0) {
  console.error(`\n📄 ${file}:`);
  for (const error of errors) {
    console.error(`   ${error}`);
  }
  process.exit(1);
}

process.exit(0);
