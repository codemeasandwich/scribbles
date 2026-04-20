/**
 * @file Webpack `DefinePlugin` helper that inlines git metadata into bundles.
 *
 * Consumers require this module from their webpack config to substitute
 * `__scribbles_gitStatus__` in bundled code with the current git hash,
 * branch, and repo name at build time. At runtime the bundled scribbles
 * picks those values up via its own `src/system/getGitStatus` fallback
 * chain (git CLI → `__scribbles_gitStatus__` define → empty-string
 * defaults), which is what keeps trace IDs stable across deploys where
 * the git CLI is absent from the production container.
 */
const gitValues = require('./src/system/getGitStatus');
var webpack = require('webpack');

var _gitStatus__ = {}
for(key in gitValues){
  _gitStatus__[key] = `"${gitValues[key]}"`
}

module.exports = new webpack.DefinePlugin({
  __scribbles_gitStatus__ : _gitStatus__
})