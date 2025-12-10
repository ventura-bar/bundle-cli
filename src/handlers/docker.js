const { runCommand } = require('../utils');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
    const outputName = version ? `${name}-${version}` : `${name}-latest`;

    // Determine output directory
    const safeNameForDir = name.replace(/[^\w-]/g, '-'); // Renamed to avoid conflict with image safeName
    const actualVersion = version || 'latest';
    const defaultDir = path.join('bundles', `${safeNameForDir}-${actualVersion}-bundle`);
    const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);

    // Docker image name usually includes registry, but here we assume name is the image name
    // and version is the tag.
    const image = version ? `${name}:${version}` : `${name}:latest`;

    // Docker image name. If repoUrl is provided, it usually acts as the registry prefix.
    // e.g. repoUrl=myregistry.com -> myregistry.com/image:tag
    let fullImageName = image;
    let registryHost = '';

    if (repoUrl) {
        // Strip protocol if present for docker image tag (e.g. https://myreg.com -> myreg.com)
        registryHost = repoUrl.replace(/^https?:\/\//, '');
        // If image name doesn't already start with the registry, prepend it
        if (!image.startsWith(registryHost + '/') && !name.startsWith(registryHost + '/')) {
            fullImageName = `${registryHost}/${image}`;
        }

        if (username && password) {
            console.log(chalk.blue(`Logging in to ${registryHost}...`));
            await runCommand('docker', ['login', registryHost, '-u', username, '-p', password]);
        }
    }

    try {
        console.log(chalk.blue(`Pulling Docker image ${fullImageName}...`));
        await runCommand('docker', ['pull', fullImageName, ...extraArgs]);

        // Save logic
        console.log(chalk.blue(`Saving Docker image to ${outDir}/${outputName}.tar...`));
        await fs.ensureDir(outDir);
        await runCommand('docker', ['save', '-o', path.join(outDir, `${outputName}.tar`), fullImageName]);

        console.log(chalk.green(`Docker image saved as ${path.join(outDir, `${outputName}.tar`)}`));

    } finally {
        if (repoUrl && username && password) {
            await runCommand('docker', ['logout', registryHost]).catch((err) => {
                console.warn(chalk.yellow(`Warning: Docker logout failed for ${registryHost}. Error: ${err.message}`));
            });
        }
    }
}

module.exports = { download };
