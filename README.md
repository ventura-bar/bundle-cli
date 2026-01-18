# Pkg Deps

A CLI tool to download packages and their dependencies for offline use.

## Supported Package Managers

- **NPM** (Node.js)
- **Pip** (Python)
- **Maven** (Java)
- **NuGet** (.NET)
- **Docker** (Images)
- **APK** (Alpine Linux)

## Prerequisites

The underlying package managers must be installed and available in your system's PATH:
- `npm` for NPM packages
- `pip` for Python packages
- `mvn` for Maven packages
- `nuget` for NuGet packages
- `docker` for Docker images
- `apk` for Alpine packages (must be run on Alpine Linux)

## Installation

```sh
npm install -g .
```

## Usage

```sh
pkg-deps <command> [options]
```

### Commands

- `npm`: Bundle NPM package
- `pip`: Bundle Python package
- `maven`: Bundle Maven package
- `nuget`: Bundle NuGet package
- `docker`: Bundle Docker package
- `apk`: Bundle APK package

### Global Options

These options are available for all commands:

- `-p, --package <name>`: Package name (Required)
- `-v, --version <version>`: Package version (Optional, defaults to latest)
- `-o, --output <path>`: Custom output directory (Optional)
- `-r, --repo <url>`: Repository URL (for private/custom registries)
- `-u, --username <user>`: Repository username
- `-P, --password <pass>`: Repository password
- `-h, --help`: Display help

### Output Directory

By default, bundles are created in a `bundles/` subdirectory within the current working directory, following the naming convention:
`bundles/<safe-package-name>-<version>-bundle/`

You can override this location using the `--output` flag.

### Examples

#### NPM
```sh
pkg-deps npm --package axios --version 1.0.0
```
Creates `bundles/axios-1.0.0-bundle/` containing `.tgz` files.

#### Python (Pip)
```sh
pkg-deps pip --package requests --version 2.31.0
```
Creates `bundles/requests-2.31.0-bundle/` containing whl/tar.gz files.

#### Java (Maven)
```sh
pkg-deps maven --package org.mockito:mockito-core --version 5.10.0
```
Creates `bundles/mockito-core-5.10.0-bundle/` containing JARs and POMs.

#### Private Repository Example
```sh
pkg-deps npm \
  --package @myorg/private-pkg \
  --repo https://registry.myorg.com \
  --username myuser \
  --password mypass
```

### Extra Arguments

Any additional arguments passed to the CLI will be forwarded to the underlying package manager command.

```sh
pkg-deps npm --package axios -- --registry=https://registry.npmmirror.com
```
