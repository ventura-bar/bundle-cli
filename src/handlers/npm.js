const BaseHandler = require('./base');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { runCommand } = require('../utils');
const chalk = require('chalk');

class NpmHandler extends BaseHandler {
    constructor() {
        super('npm');
    }

    async _download(name, version, extraArgs, repoUrl, username, password, outDir) {
        const packageName = version ? `${name}@${version}` : name;
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-deps-npm-'));

        try {
            console.log(chalk.blue(`Installing ${packageName} to temporary directory...`));

            // Install package to temp dir to get dependencies
            const npmArgs = ['install', '--prefix', tmpDir, packageName, '--ignore-scripts', '--no-bin-links', ...extraArgs];

            // Handle custom repository
            if (repoUrl) {
                const npmrcPath = path.join(tmpDir, '.npmrc');
                let npmrcContent = `registry=${repoUrl}\n`;

                if (username && password) {
                    const auth = Buffer.from(`${username}:${password}`).toString('base64');
                    npmrcContent += `_auth=${auth}\n`;
                    npmrcContent += `always-auth=true\n`;
                }

                await fs.writeFile(npmrcPath, npmrcContent);
                npmArgs.push('--userconfig', npmrcPath);
            }

            await runCommand('npm', npmArgs);

            const nodeModulesPath = path.join(tmpDir, 'node_modules');

            if (await fs.pathExists(nodeModulesPath)) {
                const packages = await fs.readdir(nodeModulesPath);
                console.log(chalk.blue(`Packing dependencies to ${outDir}...`));

                for (const pkg of packages) {
                    if (pkg.startsWith('.')) continue;

                    const pkgPath = path.join(nodeModulesPath, pkg);
                    const stat = await fs.stat(pkgPath);

                    if (stat.isDirectory()) {
                        if (pkg.startsWith('@')) {
                            const scopedPackages = await fs.readdir(pkgPath);
                            for (const scopedPkg of scopedPackages) {
                                const scopedPkgPath = path.join(pkgPath, scopedPkg);
                                await runCommand('npm', ['pack', scopedPkgPath, '--pack-destination', outDir, '--ignore-scripts', ...extraArgs]);
                            }
                        } else {
                            await runCommand('npm', ['pack', pkgPath, '--pack-destination', outDir, '--ignore-scripts', ...extraArgs]);
                        }
                    }
                }
            } else {
                console.warn(chalk.yellow('No node_modules found. This might be a single package with no dependencies or an error occurred.'));
            }

        } finally {
            await fs.remove(tmpDir);
        }
    }
}

module.exports = { download: (n, v, e, r, u, p, o) => new NpmHandler().download(n, v, e, r, u, p, o) };
