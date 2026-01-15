/**
 * Subprocess test: Node version check error
 *
 * User Scenario: A developer tries to use scribbles on an old Node version
 * (< v8.5.0). Scribbles should throw a helpful error message.
 *
 * This tests checkNodeVer.js line 7:
 *   throw new Error("Scribbles needs node v8.5.0 or higher...")
 *
 * Note: We can't actually run on old Node, so we mock process.version
 * before requiring the module.
 */

const path = require('path');
const Module = require('module');

// Store original version
const originalVersion = process.version;

// Mock process.version to an old version (v8.4.0)
Object.defineProperty(process, 'version', {
    value: 'v8.4.0',
    writable: true,
    configurable: true
});

// Clear require cache for checkNodeVer.js
const checkNodeVerPath = path.join(__dirname, '..', '..', 'src', 'checkNodeVer.js');
delete require.cache[require.resolve(checkNodeVerPath)];

// Try to require checkNodeVer - it should throw
let errorThrown = false;
let errorMessage = '';

try {
    require(checkNodeVerPath);
} catch (e) {
    errorThrown = true;
    errorMessage = e.message;
}

// Restore original version
Object.defineProperty(process, 'version', {
    value: originalVersion,
    writable: true,
    configurable: true
});

// Verify the error was thrown
if (errorThrown && errorMessage.includes('node v8.5.0 or higher')) {
    console.log('SUCCESS: Node version check threw expected error');
    console.log('  Error message:', errorMessage);
    process.exit(0);
} else if (!errorThrown) {
    console.log('FAILED: No error was thrown');
    process.exit(1);
} else {
    console.log('FAILED: Wrong error message:', errorMessage);
    process.exit(1);
}
