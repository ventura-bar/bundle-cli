const chalk = require('chalk');
const { npmHandler,
    pipHandler,
    mavenHandler,
    nugetHandler,
    dockerHandler,
    apkHandler } = require('./handlers');

const handlers = {
    npm: npmHandler,
    pip: pipHandler,
    maven: mavenHandler,
    nuget: nugetHandler,
    docker: dockerHandler,
    apk: apkHandler,
};

async function handlePackage(name, version, type, extraArgs = [], repoUrl, username, password, outputDir) {
    const handler = handlers[type.toLowerCase()];

    if (!handler) {
        throw new Error(`Unsupported package type: ${type}. Supported types: ${Object.keys(handlers).join(', ')}`);
    }

    console.log(chalk.blue(`Bundling ${type} package: ${name}@${version}...`));
    if (extraArgs.length > 0) {
        console.log(chalk.gray(`Extra arguments: ${extraArgs.join(' ')}`));
    }
    if (repoUrl) {
        console.log(chalk.gray(`Using repository: ${repoUrl}`));
    }
    // Pass credentials if provided (only Maven uses them)
    await handler.download(name, version, extraArgs, repoUrl, username, password, outputDir);
    console.log(chalk.green(`Successfully bundled ${name}@${version}`));
}

module.exports = { handlePackage };
