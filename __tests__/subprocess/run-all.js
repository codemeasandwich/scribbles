/**
 * Runner for all subprocess tests
 *
 * These tests cover code paths that execute at module load time,
 * which Jest's coverage instrumentation can't capture.
 *
 * This script runs under nyc to capture coverage for:
 * - getGitStatus.js fallback paths
 * - checkNodeVer.js version check
 *
 * Note: package.json config test requires a separate isolated environment
 * and is run via exec rather than direct require.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const tests = [
    {
        name: 'Git Global Fallback (getGitStatus.js:13)',
        file: 'test-git-global-fallback.js',
        runInIsolation: true  // Needs fresh process due to module caching
    },
    {
        name: 'Git Default Fallback (getGitStatus.js:15)',
        file: 'test-git-default-fallback.js',
        runInIsolation: true
    },
    {
        name: 'Node Version Check (checkNodeVer.js:7)',
        file: 'test-node-version.js',
        runInIsolation: true
    },
    {
        name: 'Package.json Config (index.js:31-33)',
        file: 'test-package-json-config.js',
        runInIsolation: true  // Needs isolated environment with fake package.json
    }
];

let passed = 0;
let failed = 0;

console.log('\\n========================================');
console.log('Running Subprocess Coverage Tests');
console.log('========================================\\n');

tests.forEach(test => {
    const testPath = path.join(__dirname, test.file);
    console.log(`\\n>> ${test.name}`);
    console.log(`   File: ${test.file}`);

    try {
        if (test.runInIsolation) {
            // Run in a separate process
            const result = spawnSync('node', [testPath], {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            if (result.status === 0) {
                console.log('   ' + result.stdout.trim().split('\\n').join('\\n   '));
                passed++;
            } else {
                console.log('   FAILED');
                if (result.stdout) console.log('   stdout:', result.stdout);
                if (result.stderr) console.log('   stderr:', result.stderr);
                failed++;
            }
        } else {
            // Run directly (for tests that don't need isolation)
            require(testPath);
            passed++;
        }
    } catch (e) {
        console.log(`   FAILED: ${e.message}`);
        failed++;
    }
});

console.log('\\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\\n');

process.exit(failed > 0 ? 1 : 0);
