import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '..');
const nodeModules = join(root, 'node_modules');
const nativeRoot = join(root, 'native');
const distRoot = join(root, 'dist');
const buildRoot = join(root, '.local', 'apk-build');
const artifactsRoot = join(root, 'artifacts');
const outputApk = join(artifactsRoot, 'Lexora-1.0.0-debug.apk');
const verifyOnly = process.argv.includes('--verify-only');

function fail(message) {
  console.error(`\nLexora APK build failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n› ${command} ${args.map((part) => (part.includes(' ') ? JSON.stringify(part) : part)).join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${command} exited with status ${result.status}`);
}

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

function allJavaFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return allJavaFiles(path);
    return entry.name.endsWith('.java') ? [path] : [];
  });
}

const javaHome = firstExisting([
  process.env.JAVA_HOME,
  join(nodeModules, 'javajre-linux-64', 'jre'),
]);
const java = javaHome ? join(javaHome, 'bin', 'java') : 'java';
const keytool = javaHome ? join(javaHome, 'bin', 'keytool') : 'keytool';
const aapt2 = join(nodeModules, 'aaptjs3', 'bin', process.arch === 'x64' ? 'x64' : process.arch, process.platform, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2');
const minapkTools = join(nodeModules, '@drxiaozhi', 'minapk', 'tools');
const androidJar = join(minapkTools, 'android.jar');
const ecjJar = join(minapkTools, 'ecj-3.45.0.jar');
const d8Jar = join(minapkTools, 'd8.jar');
const apksignerJar = join(minapkTools, 'apksigner.jar');

if (verifyOnly) {
  if (!existsSync(outputApk)) fail(`no artifact found at ${outputApk}`);
  if (!existsSync(apksignerJar)) fail('APK signer tools are not installed. Run npm install first.');
  run(java, ['-jar', apksignerJar, 'verify', '--verbose', '--print-certs', outputApk]);
  console.log(`\nVerified APK: ${outputApk}`);
  process.exit(0);
}

for (const [label, value] of Object.entries({
  'web build': distRoot,
  'native shell': nativeRoot,
  Java: java,
  keytool,
  aapt2,
  'Android platform': androidJar,
  'ECJ compiler': ecjJar,
  'D8 compiler': d8Jar,
  'APK signer': apksignerJar,
})) {
  if (!existsSync(value) && !['java', 'keytool'].includes(value)) fail(`${label} is missing at ${value}. Run npm install first.`);
}

// npm tarballs do not always preserve executable metadata for bundled binaries.
if (process.platform !== 'win32') chmodSync(aapt2, 0o755);

const resourceDir = join(nativeRoot, 'res');
const manifest = join(nativeRoot, 'AndroidManifest.xml');
const javaDir = join(nativeRoot, 'java');
const classesDir = join(buildRoot, 'classes');
const dexDir = join(buildRoot, 'dex');
const assetsStaging = join(buildRoot, 'asset-stage');
const compiledResources = join(buildRoot, 'compiled-resources.zip');
const unsignedApk = join(buildRoot, 'lexora-unsigned.apk');
const signedApk = join(buildRoot, 'lexora-signed.apk');
const keystore = join(root, '.local', 'lexora-debug.keystore');
const keyAlias = 'lexora-debug';
const keyPassword = 'lexora-local-debug';

console.log('\nBuilding Lexora Android APK');
console.log('Offline shell · English-to-English content · custom vector mark');

rmSync(buildRoot, { recursive: true, force: true });
mkdirSync(classesDir, { recursive: true });
mkdirSync(dexDir, { recursive: true });
mkdirSync(assetsStaging, { recursive: true });
mkdirSync(artifactsRoot, { recursive: true });

run(aapt2, ['compile', '--dir', resourceDir, '-o', compiledResources]);
run(aapt2, [
  'link',
  '-o', unsignedApk,
  '-I', androidJar,
  '--manifest', manifest,
  '--auto-add-overlay',
  '--min-sdk-version', '23',
  '--target-sdk-version', '34',
  compiledResources,
]);

const sources = allJavaFiles(javaDir);
if (!sources.length) fail('no Java source files were found for the native shell.');
run(java, [
  '-jar', ecjJar,
  '-source', '8',
  '-target', '8',
  '-encoding', 'UTF-8',
  '-bootclasspath', androidJar,
  '-classpath', androidJar,
  '-d', classesDir,
  ...sources,
]);

const classFiles = [];
function collectClassFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectClassFiles(path);
    else if (entry.name.endsWith('.class')) classFiles.push(path);
  }
}
collectClassFiles(classesDir);
if (!classFiles.length) fail('Java compilation produced no class files.');

run(java, [
  '-cp', d8Jar,
  'com.android.tools.r8.D8',
  '--release',
  '--min-api', '23',
  '--lib', androidJar,
  '--output', dexDir,
  ...classFiles,
]);

const classesDex = join(dexDir, 'classes.dex');
if (!existsSync(classesDex)) fail('D8 did not produce classes.dex.');
run('zip', ['-q', '-j', unsignedApk, classesDex]);

cpSync(distRoot, join(assetsStaging, 'assets'), { recursive: true });
run('zip', ['-q', '-r', unsignedApk, 'assets'], { cwd: assetsStaging });

if (!existsSync(keystore)) {
  mkdirSync(dirname(keystore), { recursive: true });
  run(keytool, [
    '-genkeypair',
    '-noprompt',
    '-alias', keyAlias,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-keystore', keystore,
    '-storepass', keyPassword,
    '-keypass', keyPassword,
    '-dname', 'CN=Lexora Debug, OU=Learning, O=Lexora, C=US',
  ]);
}

run(java, [
  '-jar', apksignerJar,
  'sign',
  '--ks', keystore,
  '--ks-key-alias', keyAlias,
  '--ks-pass', `pass:${keyPassword}`,
  '--key-pass', `pass:${keyPassword}`,
  '--v1-signing-enabled', 'true',
  '--v2-signing-enabled', 'true',
  '--v3-signing-enabled', 'true',
  '--v4-signing-enabled', 'false',
  '--out', signedApk,
  unsignedApk,
]);

run(java, ['-jar', apksignerJar, 'verify', '--verbose', signedApk]);
copyFileSync(signedApk, outputApk);
console.log(`\nAPK ready: ${outputApk}`);
