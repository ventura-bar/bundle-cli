const npmHandler = require('./npm');
const pipHandler = require('./pip');
const mavenHandler = require('./maven');
const nugetHandler = require('./nuget');
const dockerHandler = require('./docker');
const apkHandler = require('./apk');

module.exports = {
    npmHandler,
    pipHandler,
    mavenHandler,
    nugetHandler,
    dockerHandler,
    apkHandler,
};