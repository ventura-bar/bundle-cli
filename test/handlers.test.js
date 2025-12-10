const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'index.js');

// Helper to check if a command exists
function commandExists(command) {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Test configuration
const TESTS = {
    npm: {
        package: 'lodash',
        version: '4.17.21',
        outputDir: 'bundles/lodash-4.17.21-bundle',
        expectedFiles: ['lodash-4.17.21.tgz'],
        minFiles: 1
    },
    npm_custom_path: {
        type: 'npm',
        package: 'lodash',
        version: '4.17.21',
        extraArgs: ['--output', 'custom-path-npm-bundle'],
        outputDir: 'custom-npm-bundle',
        expectedFiles: ['lodash-4.17.21.tgz'],
        minFiles: 1
    },
    pip: {
        package: 'requests',
        version: '2.31.0',
        outputDir: 'bundles/requests-2.31.0-bundle',
        expectedPatterns: [/requests-2\.31\.0.*\.(whl|tar\.gz)/, /charset.*\.(whl|tar\.gz)/, /urllib3.*\.(whl|tar\.gz)/],
        minFiles: 3
    },
    maven: {
        package: 'junit:junit',
        version: '4.13.2',
        outputDir: 'bundles/junit-junit-4.13.2-bundle',
        expectedFiles: ['junit-4.13.2.jar', 'junit-4.13.2.pom', 'hamcrest-core-1.3.jar', 'hamcrest-core-1.3.pom'],
        minFiles: 4 // 2 JARs + 2 POMs
    },
    nuget: {
        package: 'Newtonsoft.Json',
        version: '13.0.3',
        outputDir: 'bundles/Newtonsoft.Json-13.0.3-bundle',
        expectedFiles: ['Newtonsoft.Json.13.0.3.nupkg'],
        minFiles: 1,
        skip: !commandExists('nuget') // Skip if nuget not installed
    },
    docker: {
        package: 'alpine',
        version: 'latest',
        outputDir: 'bundles/alpine-latest-bundle',
        expectedFiles: ['alpine-latest.tar'],
        minFiles: 1,
        skip: true // Skip by default as it requires Docker daemon
    },
    apk: {
        package: 'curl',
        version: null, // latest
        outputDir: 'bundles/curl-latest-bundle',
        expectedPatterns: [/curl.*\.apk/],
        minFiles: 1,
        skip: true // Skip by default as it requires Alpine/apk
    },
};

function runCLI(type, packageName, version, extraArgs = []) {
    const args = [CLI_PATH, type, '--package', packageName];
    if (version) {
        args.push('--version', version);
    }
    args.push(...extraArgs);

    const cmd = args.join(' ');
    console.log(`  Running: ${cmd}`);

    try {
        execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        return true;
    } catch (error) {
        console.error(`  ❌ Command failed: ${error.message}`);
        return false;
    }
}

function checkFiles(outputDir, expectedFiles, expectedPatterns, minFiles) {
    const fullPath = path.join(__dirname, '..', outputDir);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Output directory ${outputDir} does not exist`);
    }

    const files = fs.readdirSync(fullPath);
    console.log(`  Found ${files.length} files: ${files.join(', ')}`);

    // Check minimum file count
    assert(files.length >= minFiles, `Expected at least ${minFiles} files, found ${files.length}`);

    // Check expected files
    if (expectedFiles) {
        for (const expectedFile of expectedFiles) {
            assert(files.includes(expectedFile), `Expected file ${expectedFile} not found`);
        }
    }

    // Check expected patterns
    if (expectedPatterns) {
        for (const pattern of expectedPatterns) {
            const found = files.some(file => pattern.test(file));
            assert(found, `No file matching pattern ${pattern} found`);
        }
    }

    return files;
}

async function runTests() {
    console.log('🧪 Running bundle-cli handler tests...\n');

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const [type, config] of Object.entries(TESTS)) {
        if (config.skip) {
            console.log(`⏭️  ${type.toUpperCase()}: SKIPPED`);
            skipped++;
            continue;
        }

        console.log(`\n▶️  Testing ${type.toUpperCase()}...`);

        try {
            // Run CLI command
            // Allow config to override type (e.g. for npm_custom)
            const testType = config.type || type;
            const success = runCLI(testType, config.package, config.version, config.extraArgs || []);
            assert(success, 'CLI command failed');

            // Check output files
            const files = checkFiles(
                config.outputDir,
                config.expectedFiles,
                config.expectedPatterns,
                config.minFiles
            );

            console.log(`  ✅ ${type.toUpperCase()} test passed`);
            passed++;

        } catch (error) {
            console.error(`  ❌ ${type.toUpperCase()} test failed: ${error.message}`);
            failed++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log('='.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
