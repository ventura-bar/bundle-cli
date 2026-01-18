const BaseHandler = require('./base');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { runCommand } = require('../utils');
const chalk = require('chalk');
const nunjucks = require('nunjucks');

// Configure nunjucks
nunjucks.configure(path.join(__dirname, '../templates'), { autoescape: true });

class MavenHandler extends BaseHandler {
  constructor() {
    super('maven');
  }

  parsePackageName(name) {
    if (!name.includes(':')) {
      throw new Error('Maven package name must be in format groupId:artifactId');
    }
    const parts = name.split(':');
    return {
      groupId: parts[0],
      artifactId: parts[1],
      type: parts.length > 2 ? parts[2] : null,
      classifier: parts.length > 3 ? parts[3] : null
    };
  }

  async createPom(tmpDir, artifactInfo, version) {
    const actualVersion = version || 'LATEST';
    const pomContent = nunjucks.render('pom.xml.njk', {
      groupId: artifactInfo.groupId,
      artifactId: artifactInfo.artifactId,
      version: actualVersion,
      type: artifactInfo.type,
      classifier: artifactInfo.classifier
    });

    const pomPath = path.join(tmpDir, 'pom.xml');
    await fs.writeFile(pomPath, pomContent);
    return pomPath;
  }

  async createSettings(tmpDir, repoUrl, username, password) {
    if (!repoUrl && (!username || !password)) return null;

    const settingsContent = nunjucks.render('settings.xml.njk', {
      repoUrl,
      username,
      password
    });

    const settingsPath = path.join(tmpDir, 'settings.xml');
    await fs.writeFile(settingsPath, settingsContent);
    return settingsPath;
  }

  // Override download to change directory naming convention specific to Maven if needed.
  // BaseHandler uses name-version-bundle. Maven often wants clean separation.
  // However, BaseHandler's `safeName` logic handles slashes/colons. 
  // `junit:junit` -> `junit-junit`. `4.13.2` -> `bundle`.
  // The previous implementation used `${groupId}-${artifactId}`.
  // BaseHandler will produce `junit-junit`. This is close enough and standardizes it.

  async _download(name, version, extraArgs, repoUrl, username, password, outDir) {
    const artifactInfo = this.parsePackageName(name);
    // We override version logic slightly in createPom (LATEST) but actualVersion passed here is fine.
    const actualVersion = version || 'LATEST';
    const artifact = `${name}:${actualVersion}`;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-deps-maven-'));

    try {
      console.log(chalk.blue(`Downloading ${artifact} and dependencies...`));

      // Generate Stage
      const pomPath = await this.createPom(tmpDir, artifactInfo, version); // Pass original version to allow 'LATEST' logic
      const settingsPath = await this.createSettings(tmpDir, repoUrl, username, password);

      // Execution Stage
      // Copy dependencies
      const mvnArgs = [
        'dependency:copy-dependencies',
        `-DoutputDirectory=${outDir}`,
        '-DincludeScope=runtime',
        '-f',
        pomPath,
        ...extraArgs
      ];
      if (settingsPath) mvnArgs.push('-s', settingsPath);
      await runCommand('mvn', mvnArgs);

      // Copy POMs
      console.log(chalk.gray('Copying POM files for all dependencies...'));
      const pomMvnArgs = [
        'dependency:copy-dependencies',
        `-DoutputDirectory=${outDir}`,
        '-DincludeScope=runtime',
        '-Dmdep.copyPom=true',
        '-f',
        pomPath
      ];
      if (settingsPath) pomMvnArgs.push('-s', settingsPath);
      await runCommand('mvn', pomMvnArgs);

      console.log(chalk.green(`Offline JARs and POMs for ${artifact} are in ${outDir}`));

    } finally {
      await fs.remove(tmpDir);
    }
  }
}

module.exports = { download: (n, v, e, r, u, p, o) => new MavenHandler().download(n, v, e, r, u, p, o) };
