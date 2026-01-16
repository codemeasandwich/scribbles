/**
 * @file Retrieves git repository information (hash, branch, repo name)
 */
const exec = require('child_process').execSync

const defaultGitValues = { hash:"", repo:"", branch:"" }
try{
  module.exports = {
    hash:exec('git rev-parse --short HEAD',{ encoding: 'utf8' }).trim(),
    repo:exec('url=$(git config --get remote.origin.url) && [ -n "$url" ] && basename -s .git "$url" || echo ""', { encoding: 'utf8' }).trim(),
    branch:exec('git rev-parse --abbrev-ref HEAD',{ encoding: 'utf8' }).trim()
  };
}catch(err){
 // console.warn("Problem reading GIT",err)
 try{
  module.exports = __scribbles_gitStatus__
 }catch(err){
  module.exports = defaultGitValues
 }
}