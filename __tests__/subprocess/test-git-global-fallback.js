/**
 * Subprocess test: __scribbles_gitStatus__ global fallback
 *
 * User Scenario: A build tool (webpack, bundler, CI) sets the global
 * __scribbles_gitStatus__ before requiring scribbles. This is useful when:
 * - Building for production where .git folder is not included
 * - Running in Docker containers without git
 * - CI/CD environments where git info is injected via env vars
 *
 * This tests getGitStatus.js line 13:
 *   module.exports = __scribbles_gitStatus__
 */

const path = require('path');

// Mock execSync to throw (simulate no git available)
require('child_process').execSync = function() {
    throw new Error('git command failed - simulating no git environment');
};

// Set the global BEFORE requiring scribbles
global.__scribbles_gitStatus__ = {
    hash: 'build42',
    repo: 'my-bundled-app',
    branch: 'release-v1'
};

// Clear require cache for getGitStatus.js to force re-evaluation
const getGitStatusPath = path.join(__dirname, '..', '..', 'src', 'getGitStatus.js');
delete require.cache[require.resolve(getGitStatusPath)];

// Also clear index.js cache since it imports getGitStatus
const indexPath = path.join(__dirname, '..', '..', 'index.js');
delete require.cache[require.resolve(indexPath)];

// Now require getGitStatus - it should use the global
const gitStatus = require(getGitStatusPath);

// Verify the global was used
if (gitStatus.hash === 'build42' &&
    gitStatus.repo === 'my-bundled-app' &&
    gitStatus.branch === 'release-v1') {
    console.log('SUCCESS: __scribbles_gitStatus__ global was used');
    console.log('  hash:', gitStatus.hash);
    console.log('  repo:', gitStatus.repo);
    console.log('  branch:', gitStatus.branch);
    process.exit(0);
} else {
    console.log('FAILED: Global was not used. Got:', gitStatus);
    process.exit(1);
}
