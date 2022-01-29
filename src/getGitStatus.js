const exec = require('child_process').execSync

const defaultGitValues = { hash:"", repo:"", branch:"" }
try{
  module.exports = {
    hash:exec('git rev-parse --short HEAD',{ encoding: 'utf8' }).trim(),
    repo:exec('basename -s .git `git config --get remote.origin.url`',{ encoding: 'utf8' }).trim(),
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