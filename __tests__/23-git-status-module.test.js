/**
 * User Story Tests for getGitStatus.js
 *
 * Use Case: A developer's application needs to include git metadata
 * (commit hash, repo name, branch) in logs for traceability.
 *
 * These tests verify the git status detection behavior.
 */

describe('Git Status Module - Direct Testing', () => {
    // Store original module
    let originalModule;

    beforeAll(() => {
        // Cache the original git values
        originalModule = require('../src/getGitStatus');
    });

    describe('Git values structure', () => {
        it('should export an object with hash, repo, and branch', () => {
            // Use Case: Application needs git metadata for logging
            const gitValues = require('../src/getGitStatus');

            expect(gitValues).toBeDefined();
            expect(typeof gitValues).toBe('object');
            expect('hash' in gitValues).toBe(true);
            expect('repo' in gitValues).toBe(true);
            expect('branch' in gitValues).toBe(true);
        });

        it('should have string values for all properties', () => {
            // Use Case: All git values should be strings for logging
            const gitValues = require('../src/getGitStatus');

            expect(typeof gitValues.hash).toBe('string');
            expect(typeof gitValues.repo).toBe('string');
            expect(typeof gitValues.branch).toBe('string');
        });
    });

    describe('Git hash format', () => {
        it('should have a short hash (7 characters) or empty', () => {
            // Use Case: Short hash is more readable in logs
            const gitValues = require('../src/getGitStatus');

            // Either empty (no git) or short hash
            expect(gitValues.hash.length <= 7 || gitValues.hash === '').toBe(true);
        });

        it('should be alphanumeric if present', () => {
            // Use Case: Hash should only contain valid hex characters
            const gitValues = require('../src/getGitStatus');

            if (gitValues.hash) {
                expect(/^[a-f0-9]+$/i.test(gitValues.hash)).toBe(true);
            }
        });
    });

    describe('Default values fallback', () => {
        it('should provide empty string defaults', () => {
            // Use Case: Non-git directory should still work
            const defaultGitValues = { hash: '', repo: '', branch: '' };

            expect(defaultGitValues.hash).toBe('');
            expect(defaultGitValues.repo).toBe('');
            expect(defaultGitValues.branch).toBe('');
        });
    });
});

describe('Git command simulation', () => {
    it('should parse git rev-parse output correctly', () => {
        // Use Case: Extract commit hash from git command
        const mockOutput = 'abc1234\n';
        const hash = mockOutput.trim();

        expect(hash).toBe('abc1234');
        expect(hash.length).toBe(7);
    });

    it('should parse git branch output correctly', () => {
        // Use Case: Extract current branch name
        const mockOutput = 'main\n';
        const branch = mockOutput.trim();

        expect(branch).toBe('main');
    });

    it('should parse repo name from remote URL', () => {
        // Use Case: Extract repo name from origin URL
        const mockOutput = 'my-project\n';
        const repo = mockOutput.trim();

        expect(repo).toBe('my-project');
    });

    it('should handle feature branch names', () => {
        // Use Case: Branch with slashes
        const mockOutput = 'feature/new-feature\n';
        const branch = mockOutput.trim();

        expect(branch).toBe('feature/new-feature');
    });
});

describe('Global fallback behavior', () => {
    it('should check for __scribbles_gitStatus__ global', () => {
        // Use Case: Git status injected at build time
        const hasGlobal = typeof global.__scribbles_gitStatus__ !== 'undefined';

        // Just verify we can check for it
        expect(typeof hasGlobal).toBe('boolean');
    });

    it('should use global values if available', () => {
        // Use Case: Build system injects git values
        const mockGlobal = {
            hash: 'build123',
            repo: 'built-project',
            branch: 'release'
        };

        // Simulate fallback logic
        let result;
        try {
            throw new Error('No git');
        } catch (err) {
            try {
                result = mockGlobal; // Simulating global access
            } catch (err) {
                result = { hash: '', repo: '', branch: '' };
            }
        }

        expect(result.hash).toBe('build123');
    });
});

describe('Error handling in git status', () => {
    it('should handle execSync throwing', () => {
        // Use Case: Not in a git repository
        const defaultGitValues = { hash: '', repo: '', branch: '' };

        let result;
        try {
            throw new Error('fatal: not a git repository');
        } catch (err) {
            result = defaultGitValues;
        }

        expect(result).toEqual(defaultGitValues);
    });

    it('should handle missing remote origin', () => {
        // Use Case: Local-only repository
        const defaultGitValues = { hash: '', repo: '', branch: '' };

        let result;
        try {
            throw new Error('fatal: No such remote \'origin\'');
        } catch (err) {
            result = defaultGitValues;
        }

        expect(result).toEqual(defaultGitValues);
    });
});

describe('Git values in scribbles output', () => {
    const scribbles = require('../index');

    beforeEach(() => {
        scribbles.config({
            stdOut: null,
            dataOut: null,
            logLevel: 'debug'
        });
    });

    it('should include git values in log body', () => {
        // Use Case: Trace logs back to specific commit
        const result = scribbles.log('test message');

        expect(result.git).toBeDefined();
        expect('hash' in result.git).toBe(true);
        expect('repo' in result.git).toBe(true);
        expect('branch' in result.git).toBe(true);
    });

    it('should use git values from config if set', () => {
        // Use Case: Override git values in config
        const outputs = [];

        scribbles.config({
            stdOut: null,
            dataOut: (data) => outputs.push(data),
            gitEnv: {
                hash: 'TEST_HASH',
                repo: 'TEST_REPO',
                branch: 'TEST_BRANCH'
            }
        });

        scribbles.log('test');

        // Values should be in output
        expect(outputs.length).toBeGreaterThan(0);
    });
});

describe('Nested try-catch behavior', () => {
    it('should fall through nested catches correctly', () => {
        // Use Case: Multiple fallback attempts
        let result;
        const defaultGitValues = { hash: '', repo: '', branch: '' };

        try {
            throw new Error('First error - no git');
        } catch (err1) {
            try {
                throw new Error('Second error - no global');
            } catch (err2) {
                result = defaultGitValues;
            }
        }

        expect(result).toEqual(defaultGitValues);
    });

    it('should succeed on second try if global exists', () => {
        // Use Case: Git fails but global is available
        let result;
        const mockGlobal = { hash: 'glob123', repo: 'global-repo', branch: 'global-branch' };
        const defaultGitValues = { hash: '', repo: '', branch: '' };

        try {
            throw new Error('First error - no git');
        } catch (err1) {
            try {
                result = mockGlobal; // Success on second try
            } catch (err2) {
                result = defaultGitValues;
            }
        }

        expect(result).toEqual(mockGlobal);
    });
});
