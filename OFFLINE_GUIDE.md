# Pack Packages For Offline Installation

This guide explains how to download software packages **together with all required dependencies** for use in **offline environments**

<br />

## Upload guides for each package manager
:::note
Check for ways to bundle multiple packages for example (npm project / maven project and so)
:::

### 1. Node.js (npm)
#### Download package + all dependencies

```sh
PACKAGE=<package-name>@<version>; OUT=./bundle-npm; rm -rf "$OUT"; mkdir -p "$OUT"; TMP=$(mktemp -d); npm install --prefix "$TMP" "$PACKAGE" --ignore-scripts; find "$TMP/node_modules" -mindepth 1 -maxdepth 1 -type d | while IFS= read -r pkg; do npm pack "$pkg" --pack-destination "$OUT" --ignore-scripts; done; rm -rf "$TMP"; echo "Offline npm bundle for $PACKAGE is ready in $OUT"
```

Example

```sh
PACKAGE=chalk@2.4.2; OUT=./bundle-npm; rm -rf "$OUT"; mkdir -p "$OUT"; TMP=$(mktemp -d); npm install --prefix "$TMP" "$PACKAGE" --ignore-scripts; find "$TMP/node_modules" -mindepth 1 -maxdepth 1 -type d | while IFS= read -r pkg; do npm pack "$pkg" --pack-destination "$OUT" --ignore-scripts; done; rm -rf "$TMP"; echo "Offline npm bundle for $PACKAGE is ready in $OUT"

```

---

### 2. Python (pip)
#### Download package + dependencies

```sh
pip download --dest ./bundle <package-name>
```

Example:

```sh
pip download --dest ./bundle requests
```

---

### 3. Java (Maven)
#### Go offline: download all dependencies

```sh
ARTIFACT=<package-name>:<version>; \
mkdir temp && cd temp && \
cat > pom.xml <<EOF
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>offline</groupId>
  <artifactId>temp</artifactId>
  <version>1.0.0</version>
  <build>
    <plugins>
      <plugin>
        <groupId>br.org.soujava</groupId>
        <artifactId>pom-editor-maven-plugin</artifactId>
        <version>1.0.0</version>
      </plugin>
    </plugins>
  </build>
</project>
EOF
mvn br.org.soujava:pom-editor-maven-plugin:1.0.0:add-dep -Dgav=$ARTIFACT && \
mvn dependency:copy-dependencies -DoutputDirectory=./bundle-jars && \
mv bundle-jars ../bundle-jars && cd .. && rm -rf temp && \
echo "Offline JARs for $ARTIFACT are in bundle-jars"
```

Example:
```sh
ARTIFACT=org.mockito:mockito-core:5.10.0; \
mkdir temp && cd temp && \
cat > pom.xml <<EOF
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>offline</groupId>
  <artifactId>temp</artifactId>
  <version>1.0.0</version>
  <build>
    <plugins>
      <plugin>
        <groupId>br.org.soujava</groupId>
        <artifactId>pom-editor-maven-plugin</artifactId>
        <version>1.0.0</version>
      </plugin>
    </plugins>
  </build>
</project>
EOF
mvn br.org.soujava:pom-editor-maven-plugin:1.0.0:add-dep -Dgav=$ARTIFACT && \
mvn dependency:copy-dependencies -DoutputDirectory=./bundle-jars && \
mv bundle-jars ../bundle-jars && cd .. && rm -rf temp && \
echo "Offline JARs for $ARTIFACT are in bundle-jars"
```

---

### 4. .NET / C# (NuGet)
#### Download package + dependencies

```sh
PACKAGE=<package-name> && VERSION=<version> && OUT=nuget-bundle && if exist "%OUT%" rmdir /s /q "%OUT%" && mkdir "%OUT%" && nuget install %PACKAGE% -Version %VERSION% -OutputDirectory %OUT% -DependencyVersion Highest && for /r %OUT% %f in (*.nupkg) do move "%f" "%OUT%\" && for /d %d in (%OUT%\*) do rmdir /s /q "%d" && echo NuGet bundle ready in %OUT% (flat folder with .nupkg only)
```

Example:

```sh
PACKAGE=Azure.Core && set VERSION=1.50.0 && set OUT=nuget-bundle && if exist "%OUT%" rmdir /s /q "%OUT%" && mkdir "%OUT%" && nuget install %PACKAGE% -Version %VERSION% -OutputDirectory %OUT% -DependencyVersion Highest && for /r %OUT% %f in (*.nupkg) do move "%f" "%OUT%\" && for /d %d in (%OUT%\*) do rmdir /s /q "%d" && echo NuGet bundle ready in %OUT% (flat folder with .nupkg only)
```

---

### 5. Docker Images
#### Save image + layers

```sh
IMAGE=<registry-url>/<image-name>:<tag>; docker pull $IMAGE && docker save $IMAGE -o "${IMAGE//[:\/]/-}.tar" && echo "Docker image saved as ${IMAGE//[:\/]/-}.tar"
```

Example:
```sh
IMAGE=nginx:latest; docker pull $IMAGE && docker save $IMAGE -o "${IMAGE//[:\/]/-}.tar" && echo "Docker image saved as ${IMAGE//[:\/]/-}.tar"
```
---

### 6. Alpine Linux (APK)
#### Download package + all dependencies

```sh
mkdir bundle && apk fetch --recursive --output ./bundle <package-name>=<version>
```

Example:

```sh
mkdir bundle && apk fetch --recursive --output ./bundle vim
```

---

### 7. Debian / Ubuntu (DEB / APT)
#### Install dependency tool

```sh
apt-get -y install apt-rdepends
```

##### Download package + dependencies

:::warning
Run this twice so it will work (permissions)
:::
:::warning
Review for ubuntu
:::
```sh
mkdir debian-bundle
cd debian-bundle
apt-get download $(apt-rdepends <package>|grep -v "^ " |grep -v "^libc-dev$")
```

---

### 8. RHEL / CentOS / Fedora (RPM)
:::warning
Review
:::
#### Download package + dependencies

```sh
yum install -y yum-utils
yumdownloader --resolve --destdir=./bundle <package-name>
```

---

### 9. Go Modules
:::warning
Review
:::
#### Download all dependencies

```sh
go mod download
go mod vendor
```

Bundle:

```sh
tar -czf bundle.tar.gz vendor
```


<br />

## FAQ

#### How to Install debian/rhel packages on different OS

Use docker for that (Example: alpine)
```sh
docker pull alpine:latest
docker run -it --rm alpine sh
```
---
### How to Upload those to air-gapped enviroments

Use Artifactory/Nexus CLI for it -

  * Take each bundle folder of the package you have downloaded
  * Bring it to your air-gapped enviroment
  * Upload it as a bundle / list of packages,  using your repo manager cli/api (Artifactory/Nexus)
---
### Can this process be automated?

Soon... 

---
### Is there a CLI to run those scripts

Soon...