const execa = require('execa');
const chalk = require('chalk');

async function runCommand(command, args, options = {}) {
    console.log(chalk.gray(`> ${command} ${args.join(' ')}`));
    try {
        const { stdout } = await execa(command, args, {
            stdio: 'inherit',
            ...options,
        });
        return stdout;
    } catch (error) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error.message}`);
    }
}

module.exports = { runCommand };
