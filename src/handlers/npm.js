const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { runCommand } = require('../utils');
const chalk = require('chalk');

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
    const packageName = version ? `${name}@${version}` : name;

    // Determine output directory
    const safeName = name.replace(/[@\/]/g, '-').replace(/^-+|-+$/g, '');
    const actualVersion = version || 'latest';
    const defaultDir = path.join('bundles', `${safeName}-${actualVersion}-bundle`);
    const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-cli-npm-'));

    try {
        // Clean and create output directory
        await fs.remove(outDir);
        await fs.ensureDir(outDir);

        console.log(chalk.blue(`Installing ${packageName} to temporary directory...`));

        // Install package to temp dir to get dependencies
        const npmArgs = ['install', '--prefix', tmpDir, packageName, '--ignore-scripts', '--no-bin-links', ...extraArgs];

        // Handle custom repository
        if (repoUrl) {
            const npmrcPath = path.join(tmpDir, '.npmrc');
            let npmrcContent = `registry=${repoUrl}\n`;

            if (username && password) {
                // Determine auth method. For simplicity, we'll try basic auth or valid npm token structure if applicable.
                // However, raw username/password often requires base64 encoding for _auth or _authToken.
                // We'll use the legacy _auth = base64(user:pass) which behaves like basic auth.
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
                if (pkg.startsWith('.')) continue; // Skip hidden files

                const pkgPath = path.join(nodeModulesPath, pkg);
                const stat = await fs.stat(pkgPath);

                if (stat.isDirectory()) {
                    // Handle scoped packages
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

        console.log(chalk.green(`Offline npm bundle for ${packageName} is ready in ${outDir}`));

    } catch (error) {
        throw error;
    } finally {
        // Cleanup temp directory
        await fs.remove(tmpDir);
    }
}

module.exports = { download };
