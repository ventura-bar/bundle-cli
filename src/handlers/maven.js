const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { runCommand } = require('../utils');
const chalk = require('chalk');
const nunjucks = require('nunjucks');

// Configure nunjucks
nunjucks.configure(path.join(__dirname, '../templates'), { autoescape: true });

function parsePackageName(name) {
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

async function createPom(tmpDir, artifactInfo, version) {
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

async function createSettings(tmpDir, repoUrl, username, password) {
  if (!repoUrl) return null;

  const settingsContent = nunjucks.render('settings.xml.njk', {
    repoUrl,
    username,
    password
  });

  const settingsPath = path.join(tmpDir, 'settings.xml');
  await fs.writeFile(settingsPath, settingsContent);
  return settingsPath;
}

async function runMavenCopy(pomPath, outDir, extraArgs, settingsPath) {
  const mvnArgs = [
    'dependency:copy-dependencies',
    `-DoutputDirectory=${outDir}`,
    '-DincludeScope=runtime',
    '-f',
    pomPath,
    ...extraArgs
  ];

  if (settingsPath) {
    mvnArgs.push('-s', settingsPath);
  }

  await runCommand('mvn', mvnArgs);
}

async function runMavenCopyPoms(pomPath, outDir, settingsPath) {
  console.log(chalk.gray('Copying POM files for all dependencies...'));
  const pomMvnArgs = [
    'dependency:copy-dependencies',
    `-DoutputDirectory=${outDir}`,
    '-DincludeScope=runtime',
    '-Dmdep.copyPom=true',
    '-f',
    pomPath
  ];

  if (settingsPath) {
    pomMvnArgs.push('-s', settingsPath);
  }

  await runCommand('mvn', pomMvnArgs);
}

async function download(name, version, extraArgs = [], repoUrl, username, password, outputDir) {
  const artifactInfo = parsePackageName(name);

  // Determine output directory
  // Sanitize groupId:artifactId for folder name
  const safeName = `${artifactInfo.groupId}-${artifactInfo.artifactId}`.replace(/[^\w-]/g, '-');
  const  = version || 'LATEST';
  const defaultDir = path.join('bundles', `${safeName}-${actualVersion}-bundle`);
  const outDir = outputDir ? path.resolve(outputDir) : path.resolve(defaultDir);
  const artifact = `${name}:${actualVersion}`;

  // Create temporary directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-cli-maven-'));

  try {
    // Clean and create output directory
    await fs.remove(outDir);
    await fs.ensureDir(outDir);

    console.log(chalk.blue(`Downloading ${artifact} and dependencies...`));

    // Generate Stage
    const pomPath = await createPom(tmpDir, artifactInfo, version);
    const settingsPath = await createSettings(tmpDir, repoUrl, username, password);

    // Execution Stage
    await runMavenCopy(pomPath, outDir, extraArgs, settingsPath);
    await runMavenCopyPoms(pomPath, outDir, settingsPath);

    console.log(chalk.green(`Offline JARs and POMs for ${artifact} are in ${outDir}`));

  } catch (error) {
    throw error;
  } finally {
    await fs.remove(tmpDir);
  }
}

module.exports = { download };
