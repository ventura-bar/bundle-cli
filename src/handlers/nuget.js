const fs = require('fs-extra');
const path = require('path');
const { runCommand } = require('../utils');
const chalk = require('chalk');
const glob = require('glob');

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
    // Determine output directory
    const safeName = name.replace(/[^\w-]/g, '-');
    const actualVersion = version || 'latest';
    // Restore 'bundles/' prefix and correct formatting
    const defaultDir = path.join('bundles', `${safeName}-${actualVersion}-bundle`);
    const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);

    let sourceName = null;

    try {
        // Clean and create output directory
        await fs.remove(outDir);
        await fs.ensureDir(outDir);

        console.log(chalk.blue(`Installing ${name} ${actualVersion} and dependencies...`));

        // Handle Custom Repo / Auth
        if (repoUrl) {
            sourceName = `TempSource_${Date.now()}`;
            const sourceArgs = ['sources', 'Add', '-Name', sourceName, '-Source', repoUrl];
            if (username && password) {
                sourceArgs.push('-Username', username, '-Password', password);
            }
            try {
                await runCommand('nuget', sourceArgs);
            } catch (error) {
                console.warn(chalk.yellow(`Failed to add temporary source: ${error.message}`));
                sourceName = null;
            }
        }

        // nuget install <package> -Version <version> -OutputDirectory <outDir> -DependencyVersion Highest
        const args = [
            'install',
            name,
            '-OutputDirectory', outDir,
            '-DependencyVersion', 'Highest'
        ];

        if (version) {
            args.push('-Version', version);
        }

        if (sourceName) {
            args.push('-Source', sourceName);
        }

        args.push(...extraArgs);

        await runCommand('nuget', args);

        // Flattening Logic (User's addition)
        console.log(chalk.blue(`Flattening package structure...`));

        // Find all .nupkg files recursively
        const nupkgFiles = glob.sync('**/*.nupkg', { cwd: outDir, absolute: true });

        for (const file of nupkgFiles) {
            const fileName = path.basename(file);
            const destPath = path.join(outDir, fileName);

            // Move file to root of outDir if it's not already there
            if (file !== destPath) {
                await fs.move(file, destPath, { overwrite: true });
            }
        }

        // Clean up subdirectories
        const items = await fs.readdir(outDir);
        for (const item of items) {
            const itemPath = path.join(outDir, item);
            // Ignore the moved files themselves, mostly directories need removal
            // But we must be careful not to delete the files we just moved if they are at root
            // Stat first
            const stat = await fs.stat(itemPath);
            if (stat.isDirectory()) {
                await fs.remove(itemPath);
            }
        }

        console.log(chalk.green(`NuGet bundle ready in ${outDir} (flat folder with .nupkg only)`));

    } catch (error) {
        throw error;
    } finally {
        if (sourceName) {
            // Cleanup source
            await runCommand('nuget', ['sources', 'Remove', '-Name', sourceName]).catch(() => { });
        }
    }
}

module.exports = { download };
