const gitValues = require('./src/getGitStatus');
var webpack = require('webpack');

var _gitStatus__ = {}
for(key in gitValues){
  _gitStatus__[key] = `"${gitValues[key]}"`
}

module.exports = new webpack.DefinePlugin({
  __scribbles_gitStatus__ : _gitStatus__
})