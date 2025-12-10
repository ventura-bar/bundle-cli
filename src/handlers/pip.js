const path = require('path');
const fs = require('fs-extra');
const { runCommand } = require('../utils');
const chalk = require('chalk');

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
    // Pip doesn't strictly require version in the command if included in name, 
    // but we can support name==version format if version is provided.
    const packageSpec = version ? `${name}==${version}` : name;

    // Determine output directory
    const safeName = name.replace(/[^\w-]/g, '-');
    const actualVersion = version || 'latest';
    const defaultDir = path.join('bundles', `${safeName}-${actualVersion}-bundle`);
    const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);

    try {
        // Clean and create output directory
        await fs.remove(outDir);
        await fs.ensureDir(outDir);

        console.log(chalk.blue(`Downloading ${packageSpec} and dependencies to ${outDir}...`));

        const args = ['download', '--dest', outDir, packageSpec, ...extraArgs];

        if (repoUrl) {
            let authUrl = repoUrl;
            if (username && password) {
                try {
                    const url = new URL(repoUrl);
                    url.username = username;
                    url.password = password;
                    authUrl = url.toString();
                } catch (e) {
                    console.warn(chalk.yellow('Invalid repository URL provided, ignoring credentials injection.'));
                }
            }
            args.push('--index-url', authUrl);
            args.push('--trusted-host', new URL(repoUrl).hostname);
        }

        await runCommand('pip', args);

        console.log(chalk.green(`Offline pip bundle for ${packageSpec} is ready in ${outDir}`));

    } catch (error) {
        throw error;
    }
}

module.exports = { download };
