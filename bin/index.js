#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');
const { handlePackage } = require('../src/index');

program
  .name('pkg-deps')
  .description('CLI to bundle packages for offline use')
  .version(packageJson.version, '-V, --cli-version', 'output the version number');

const packageTypes = ['npm', 'pip', 'maven', 'nuget', 'docker', 'apk'];

packageTypes.forEach(type => {
  const cmd = program
    .command(type)
    .description(`Bundle ${type} package`)
    .requiredOption('-p, --package <name>', 'Package name')
    .option('-v, --version <version>', 'Package version')
    .option('-o, --output <path>', 'Output directory')
    .option('-r, --repo <url>', 'Repository URL')
    .option('-u, --username <user>', 'Repository username')
    .option('-P, --password <pass>', 'Repository password');

  cmd
    .argument('[args...]', 'Extra arguments for the package manager')
    .allowUnknownOption()
    .action(async (args, options) => {
      try {
        await handlePackage(
          options.package,
          options.version,
          type,
          args,
          options.repo,
          options.username,
          options.password,
          options.output
        );
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
});

program.parse();
