const path = require('path');
let appDir = path.dirname(require.main.filename || path.resolve(__dirname+'/../../../'));
    appDir = appDir[0] === '/' ? appDir.substr(1) : appDir

module.exports = appDir
