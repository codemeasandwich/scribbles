#!/bin/bash
set -e

PACKAGE_NAME=$(node -p "require('./package.json').name")

# Step 1: Push all committed changes to origin first
echo "🔄 Step 1: Pushing all committed changes to origin..."
git push origin HEAD
echo "✅ Pushed committed changes to origin"

# Get local version from package.json
LOCAL_VERSION=$(node -p "require('./package.json').version")
echo "📦 Local version: $LOCAL_VERSION"

# Get published version from npm
NPM_VERSION=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "0.0.0")
echo "🌐 npm version: $NPM_VERSION"

# Step 2: Get origin's version from GitHub
echo "🔄 Step 2: Checking origin's package.json version..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ORIGIN_VERSION=$(git show origin/$CURRENT_BRANCH:package.json 2>/dev/null | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).version" || echo "$LOCAL_VERSION")
echo "🌍 Origin version: $ORIGIN_VERSION"

# Function to compare semver versions
# Echoes: 0 if equal, 1 if first > second, 2 if first < second
compare_versions() {
  local v1=$1 v2=$2
  IFS='.' read -r v1_major v1_minor v1_patch <<< "$v1"
  IFS='.' read -r v2_major v2_minor v2_patch <<< "$v2"
  
  if [[ $v1_major -gt $v2_major ]]; then echo 1; return; fi
  if [[ $v1_major -lt $v2_major ]]; then echo 2; return; fi
  if [[ $v1_minor -gt $v2_minor ]]; then echo 1; return; fi
  if [[ $v1_minor -lt $v2_minor ]]; then echo 2; return; fi
  if [[ $v1_patch -gt $v2_patch ]]; then echo 1; return; fi
  if [[ $v1_patch -lt $v2_patch ]]; then echo 2; return; fi
  echo 0
}

# Step 3: Check if local has a manually higher version than origin
ORIGIN_VERSION_CMP=$(compare_versions "$LOCAL_VERSION" "$ORIGIN_VERSION")

if [[ $ORIGIN_VERSION_CMP -eq 1 ]]; then
  echo "🔄 Step 3: Local version ($LOCAL_VERSION) is higher than origin ($ORIGIN_VERSION). Syncing version update..."
  
  # Update package-lock.json to match
  echo "   📝 Updating package-lock.json version..."
  if [[ -f "package-lock.json" ]]; then
    node -e "
      const fs = require('fs');
      const lockfile = require('./package-lock.json');
      lockfile.version = '$LOCAL_VERSION';
      if (lockfile.packages && lockfile.packages['']) {
        lockfile.packages[''].version = '$LOCAL_VERSION';
      }
      fs.writeFileSync('./package-lock.json', JSON.stringify(lockfile, null, 2) + '\n');
    "
    echo "   ✅ package-lock.json updated"
  fi
  
  # Amend the last commit with both files
  echo "   📝 Amending last commit with version files..."
  git add package.json
  if [[ -f "package-lock.json" ]]; then
    git add package-lock.json
  fi
  git commit --amend --no-edit
  echo "   ✅ Commit amended"
  
  # Force push to origin
  echo "   🚀 Force pushing to origin..."
  git push --force-with-lease origin HEAD
  echo "   ✅ Force pushed to origin"
  
  echo "✅ Step 3 complete: Version $LOCAL_VERSION synced to origin"
else
  echo "✅ Step 3: Local version matches origin, no sync needed"
fi

# Check version relationship against npm
VERSION_CMP=$(compare_versions "$LOCAL_VERSION" "$NPM_VERSION")

if [[ $VERSION_CMP -eq 1 ]]; then
  # Local version is higher than npm - use it as-is (manually set)
  echo "✅ Local version ($LOCAL_VERSION) is higher than npm ($NPM_VERSION). Using manually set version."
elif [[ $VERSION_CMP -eq 0 ]]; then
  # Versions match - need to bump based on commits
  echo "⚠️  Local version matches npm. Analyzing commits for semantic version bump..."
  
  # Get the previous tag to analyze commits
  PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
  
  if [[ -n "$PREV_TAG" ]]; then
    COMMIT_RANGE="$PREV_TAG..HEAD"
  else
    COMMIT_RANGE="HEAD"
  fi
  
  # Analyze commits to determine bump type
  # Semantic Versioning Rules:
  #   Major (X.0.0): Any commit with ! (breaking change) - e.g., feat!:, fix!:, refactor!:
  #   Minor (x.Y.0): feat - new backward-compatible functionality
  #   Patch (x.y.Z): fix, perf, refactor, docs, build, ci, style, test
  HAS_BREAKING=false
  HAS_FEAT=false
  HAS_PATCH=false
  
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    
    # Check for breaking changes: any type with ! (e.g., feat!:, fix!:, refactor!:, perf!:, build!:, ci!:)
    # Also check for BREAKING CHANGE in body (though oneline won't show body)
    if [[ "$line" =~ BREAKING[[:space:]]CHANGE ]] || [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(feat|fix|perf|refactor|docs|build|ci|style|test)![:\(] ]]; then
      HAS_BREAKING=true
    fi
    
    # Check for features (minor bump) - only if not breaking
    if [[ "$line" =~ ^[a-f0-9]+[[:space:]]+feat[:\(] ]] && [[ ! "$line" =~ ^[a-f0-9]+[[:space:]]+feat![:\(] ]]; then
      HAS_FEAT=true
    fi
    
    # Check for patch-level commits: fix, perf, refactor, docs, build, ci, style, test
    if [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(fix|perf|refactor|docs|build|ci|style|test)[:\(] ]] && [[ ! "$line" =~ ^[a-f0-9]+[[:space:]]+(fix|perf|refactor|docs|build|ci|style|test)![:\(] ]]; then
      HAS_PATCH=true
    fi
  done < <(git log $COMMIT_RANGE --oneline)
  
  # Parse current version
  IFS='.' read -r MAJOR MINOR PATCH <<< "$LOCAL_VERSION"
  
  # Determine new version based on commit types (priority: breaking > feat > patch)
  if [[ "$HAS_BREAKING" == true ]]; then
    NEW_MAJOR=$((MAJOR + 1))
    NEW_VERSION="$NEW_MAJOR.0.0"
    BUMP_TYPE="major (breaking change)"
  elif [[ "$HAS_FEAT" == true ]]; then
    NEW_MINOR=$((MINOR + 1))
    NEW_VERSION="$MAJOR.$NEW_MINOR.0"
    BUMP_TYPE="minor (new feature)"
  elif [[ "$HAS_PATCH" == true ]]; then
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    BUMP_TYPE="patch (fix/perf/refactor/docs/build/ci/style/test)"
  else
    # Default to patch if no recognized commit types
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    BUMP_TYPE="patch (default)"
  fi
  
  echo "📝 Bumping version ($BUMP_TYPE): $LOCAL_VERSION → $NEW_VERSION"
  
  # Update package.json with new version
  node -e "
    const fs = require('fs');
    const pkg = require('./package.json');
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  # Update package-lock.json if it exists
  if [[ -f "package-lock.json" ]]; then
    node -e "
      const fs = require('fs');
      const lockfile = require('./package-lock.json');
      lockfile.version = '$NEW_VERSION';
      if (lockfile.packages && lockfile.packages['']) {
        lockfile.packages[''].version = '$NEW_VERSION';
      }
      fs.writeFileSync('./package-lock.json', JSON.stringify(lockfile, null, 2) + '\n');
    "
  fi
  
  # Amend the last commit with the version bump
  git add package.json
  if [[ -f "package-lock.json" ]]; then
    git add package-lock.json
  fi
  git commit --amend --no-edit
  git push --force-with-lease
  
  LOCAL_VERSION="$NEW_VERSION"
  echo "✅ Version bumped and commit amended"
else
  # Local version is lower than npm - this shouldn't happen, bump to npm + patch
  echo "⚠️  Local version ($LOCAL_VERSION) is lower than npm ($NPM_VERSION). Bumping from npm version..."
  
  IFS='.' read -r MAJOR MINOR PATCH <<< "$NPM_VERSION"
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
  
  echo "📝 Bumping version: $NPM_VERSION → $NEW_VERSION"
  
  # Update package.json with new version
  node -e "
    const fs = require('fs');
    const pkg = require('./package.json');
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  # Update package-lock.json if it exists
  if [[ -f "package-lock.json" ]]; then
    node -e "
      const fs = require('fs');
      const lockfile = require('./package-lock.json');
      lockfile.version = '$NEW_VERSION';
      if (lockfile.packages && lockfile.packages['']) {
        lockfile.packages[''].version = '$NEW_VERSION';
      }
      fs.writeFileSync('./package-lock.json', JSON.stringify(lockfile, null, 2) + '\n');
    "
  fi
  
  # Amend the last commit with the version bump
  git add package.json
  if [[ -f "package-lock.json" ]]; then
    git add package-lock.json
  fi
  git commit --amend --no-edit
  git push --force-with-lease
  
  LOCAL_VERSION="$NEW_VERSION"
  echo "✅ Version bumped and commit amended"
fi

TAG="v$LOCAL_VERSION"

# Check if tag already exists but npm doesn't have this version
# This means a previous release attempt failed - we need to clean up and retry
TAG_EXISTS=false
if git rev-parse "$TAG" >/dev/null 2>&1; then
  TAG_EXISTS=true
  echo "🏷️  Tag $TAG already exists."
  
  # Check if npm has this version
  TAG_VERSION="${TAG#v}"  # Remove 'v' prefix
  if [[ $(compare_versions "$TAG_VERSION" "$NPM_VERSION") -eq 1 ]]; then
    # Tag version is higher than npm - previous release likely failed
    echo "⚠️  Tag $TAG exists but npm only has $NPM_VERSION. Previous release may have failed."
    echo "🔄 Cleaning up and retrying..."
    
    # Delete the GitHub release if it exists
    if command -v gh &> /dev/null && gh release view "$TAG" &> /dev/null; then
      echo "   🗑️  Deleting existing GitHub release $TAG..."
      gh release delete "$TAG" --yes
      echo "   ✅ Release deleted"
    fi
    
    # Delete the remote tag
    echo "   🗑️  Deleting remote tag $TAG..."
    git push origin --delete "$TAG" 2>/dev/null || true
    echo "   ✅ Remote tag deleted"
    
    # Delete the local tag
    echo "   🗑️  Deleting local tag $TAG..."
    git tag -d "$TAG"
    echo "   ✅ Local tag deleted"
    
    # Rebuild the client bundle (validation only)
    echo "   🔨 Rebuilding client bundle (validation)..."
    npx esbuild client/index.js --bundle --minify --sourcemap --outfile=dist/api-ape.min.js
    echo "   ✅ Client bundle rebuilt"
    
    # Cleanup: Remove validation build files (CI builds its own)
    rm -f dist/api-ape.min.js dist/api-ape.min.js.map
    echo "   🧹 Validation build files cleaned up"
    
    TAG_EXISTS=false
    echo "✅ Cleanup complete. Proceeding with fresh release..."
  else
    # npm has this version or higher - release already completed
    if command -v gh &> /dev/null && gh release view "$TAG" &> /dev/null; then
      echo "❌ Error: Release $TAG already exists and npm has version $NPM_VERSION. Nothing to do."
      exit 1
    else
      echo "📝 No release found for $TAG. Creating release..."
    fi
  fi
fi

if [[ "$TAG_EXISTS" == false ]]; then
  # Create and push tag
  echo "🏷️  Creating tag $TAG..."
  git tag -a "$TAG" -m "Release $TAG"
  git push origin "$TAG"
fi

# Generate changelog from commits since last release
echo "📋 Generating changelog..."

# Get the previous tag (most recent tag before the current one)
PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

if [[ -n "$PREV_TAG" ]]; then
  COMMIT_RANGE="$PREV_TAG..HEAD"
  echo "   Commits from $PREV_TAG to HEAD"
else
  COMMIT_RANGE="HEAD"
  echo "   All commits (no previous tag found)"
fi

# Get commits and group by type
declare -a FEAT_COMMITS
declare -a FIX_COMMITS
declare -a REFACTOR_COMMITS
declare -a DOCS_COMMITS
declare -a STYLE_COMMITS
declare -a TEST_COMMITS
declare -a CHORE_COMMITS
declare -a OTHER_COMMITS

# Function to strip commit type prefix from message
# e.g., "feat: Add feature" -> "Add feature"
#       "fix(scope): Fix bug" -> "Fix bug"
strip_prefix() {
  local msg="$1"
  # Remove type prefix like "feat:", "fix:", "feat(scope):", etc.
  echo "$msg" | sed -E 's/^(feat|feature|fix|bugfix|refactor|docs|doc|style|test|tests|chore|build|ci)(\([^)]*\))?[!]?:[[:space:]]*//'
}

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  
  # Extract the message (without git hash)
  msg="${line#* }"
  
  # Extract the type and store stripped message
  if [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(feat|feature)[:\(] ]]; then
    FEAT_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(fix|bugfix)[:\(] ]]; then
    FIX_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(refactor)[:\(] ]]; then
    REFACTOR_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(docs|doc)[:\(] ]]; then
    DOCS_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(style)[:\(] ]]; then
    STYLE_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(test|tests)[:\(] ]]; then
    TEST_COMMITS+=("$(strip_prefix "$msg")")
  elif [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(chore|build|ci)[:\(] ]]; then
    CHORE_COMMITS+=("$(strip_prefix "$msg")")
  else
    OTHER_COMMITS+=("$msg")
  fi
done < <(git log $COMMIT_RANGE --oneline)

# Build changelog
CHANGELOG=""

if [[ ${#FEAT_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Features\n"
  for commit in "${FEAT_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#FIX_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Bug Fixes\n"
  for commit in "${FIX_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#REFACTOR_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Refactoring\n"
  for commit in "${REFACTOR_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#DOCS_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Documentation\n"
  for commit in "${DOCS_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#STYLE_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Styling\n"
  for commit in "${STYLE_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#TEST_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Tests\n"
  for commit in "${TEST_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#CHORE_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Chores\n"
  for commit in "${CHORE_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

if [[ ${#OTHER_COMMITS[@]} -gt 0 ]]; then
  CHANGELOG+="## Other Changes\n"
  for commit in "${OTHER_COMMITS[@]}"; do
    CHANGELOG+="- $commit\n"
  done
  CHANGELOG+="\n"
fi

# Fallback if no commits found
if [[ -z "$CHANGELOG" ]]; then
  CHANGELOG="No notable changes in this release."
fi

echo "   Changelog generated!"

# Create GitHub release (triggers the publish workflow)
echo "🚀 Creating GitHub release..."

REPO_OWNER="codemeasandwich"
REPO_NAME="api-ape"

# Try gh CLI first, fall back to curl
if command -v gh &> /dev/null; then
  echo -e "$CHANGELOG" | gh release create "$TAG" \
    --title "$TAG" \
    --notes-file -
else
  # Use GitHub API with curl
  if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "❌ Error: GITHUB_TOKEN environment variable is required."
    echo "   Set it with: export GITHUB_TOKEN=your_token"
    echo "   Or install GitHub CLI: brew install gh && gh auth login"
    exit 1
  fi
  
  # Escape the changelog for JSON
  CHANGELOG_ESCAPED=$(echo -e "$CHANGELOG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  
  # Create release via GitHub API
  RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" \
    -d "{
      \"tag_name\": \"$TAG\",
      \"name\": \"$TAG\",
      \"body\": $CHANGELOG_ESCAPED
    }")
  
  # Check if release was created
  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ Release created via GitHub API"
  else
    echo "❌ Failed to create release:"
    echo "$RESPONSE"
    exit 1
  fi
fi

echo "✅ Release $TAG created! The GitHub Action will publish to npm with provenance."
echo "   Watch the workflow at: https://github.com/$REPO_OWNER/$REPO_NAME/actions"


