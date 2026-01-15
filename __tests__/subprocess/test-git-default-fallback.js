/**
 * Subprocess test: Default git values fallback
 *
 * User Scenario: A developer runs scribbles in an environment where:
 * - Git is not installed or .git folder doesn't exist
 * - No __scribbles_gitStatus__ global was set
 *
 * Scribbles should gracefully fall back to empty string defaults.
 *
 * This tests getGitStatus.js lines 14-15:
 *   catch(err){
 *     module.exports = defaultGitValues  // { hash:"", repo:"", branch:"" }
 *   }
 */

const path = require('path');

// Mock execSync to throw (simulate no git available)
require('child_process').execSync = function() {
    throw new Error('git command failed - simulating no git environment');
};

// DO NOT set __scribbles_gitStatus__ - we want to test the default fallback

// Clear require cache for getGitStatus.js to force re-evaluation
const getGitStatusPath = path.join(__dirname, '..', '..', 'src', 'getGitStatus.js');
delete require.cache[require.resolve(getGitStatusPath)];

// Now require getGitStatus - it should use the defaults
const gitStatus = require(getGitStatusPath);

// Verify the defaults were used (empty strings)
if (gitStatus.hash === '' &&
    gitStatus.repo === '' &&
    gitStatus.branch === '') {
    console.log('SUCCESS: Default empty values were used');
    console.log('  hash:', JSON.stringify(gitStatus.hash));
    console.log('  repo:', JSON.stringify(gitStatus.repo));
    console.log('  branch:', JSON.stringify(gitStatus.branch));
    process.exit(0);
} else {
    console.log('FAILED: Defaults were not used. Got:', gitStatus);
    process.exit(1);
}
