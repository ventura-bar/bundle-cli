const fs = require('fs-extra');
const path = require('path');
const { runCommand } = require('../utils');
const chalk = require('chalk');

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
    // Determine output directory
    const safeName = name.replace(/[^\w-]/g, '-');
    const actualVersion = version || 'latest';
    const defaultDir = path.join('bundles', `${safeName}-${actualVersion}-bundle`);
    const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);
    const packageSpec = version ? `${name}=${version}` : name;

    try {
        // Clean and create output directory
        await fs.remove(outDir);
        await fs.ensureDir(outDir);

        console.log(chalk.blue(`Downloading ${packageSpec} to ${outDir}...`));

        // apk fetch -o <outDir> <package>=<version>
        // Note: apk fetch downloads the .apk file without installing invalid dependencies
        const args = ['fetch', '-o', outDir, '-R'];

        if (repoUrl) {
            args.push('--repository', repoUrl);
            // APK doesn't have a standard CLI flag for username/password. 
            // Users usually embed creds in URL: https://user:pass@host/repo
            // We'll warn if they passed credentials but URL doesn't look like it has them?
            // Or better, if they passed u/p, we can try to inject them into the URL if not present.
            if (username && password && !repoUrl.includes('@')) {
                try {
                    const url = new URL(repoUrl);
                    url.username = username;
                    url.password = password;
                    // Replace the --repository arg with the authenticated URL
                    args[args.indexOf(repoUrl)] = url.toString();
                } catch (e) {
                    // ignore
                }
            }
        }

        args.push(packageSpec, ...extraArgs);

        await runCommand('apk', args);

        console.log(chalk.green(`Offline APK bundle for ${packageSpec} is ready in ${outDir}`));

    } catch (error) {
        throw error;
    }
}

module.exports = { download };
