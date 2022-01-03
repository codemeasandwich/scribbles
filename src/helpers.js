const appDir = require('../appDir');
//=====================================================
//================================================ Util
//=====================================================

function deepMerge(target, source) {
  if(typeof target === 'object' && undefined === source) return target;
  if(typeof target !== 'object' || typeof source !== 'object') return false; // target or source or both ain't objects, merging doesn't make sense
  for(var prop in source) {
    if(!source.hasOwnProperty(prop)) continue; // take into consideration only object's own properties.
    if(prop in target) { // handling merging of two properties with equal names
      if(typeof target[prop] !== 'object') {
        target[prop] = source[prop];
      } else {
        if(typeof source[prop] !== 'object') {
          target[prop] = source[prop];
        } else {
          if(target[prop].concat && source[prop].concat) { // two arrays get concatenated
            target[prop] = target[prop].concat(source[prop]);
          } else { // two objects get merged recursively
            target[prop] = deepMerge(target[prop], source[prop]);
          }
        }
      }
    } else { // new properties get added to target
      target[prop] = source[prop];
    }
  }
  return target;
}

//++++++++++++++++++++++++++++++++++++++++++ getSource
//++++++++++++++++++++++++++++++++++++++++++++++++++++

function getSource(stack){

    const originFile = stack.split('\n')[2].split('/');
    const file = originFile[originFile.length - 1].split(':')[0];
    const line = originFile[originFile.length - 1].split(':')[1];
    const col = originFile[originFile.length - 1].split(':')[2];
    let path = originFile.splice(1).join('/')
        path = path[path.length - 1] === ')' ? path.substring(0, path.length - 1) : path;
        path = path.startsWith(appDir) ? path.substr(appDir.length+1) : "/"+path
    return {
      type:originFile[0].split('at').pop().trim().split(" ")[0],
      file,
      line:+line,
      col,
      path
    } // END return
} // END getSource

module.exports = { deepMerge, getSource }
