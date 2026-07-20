#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const fail = [];

function expect(condition, message) {
  if (!condition) fail.push(message);
}

function includes(path, needle, label = needle) {
  expect(read(path).includes(needle), `${path} is missing ${label}`);
}

const release = json('version.json');
const pkg = json('package.json');
const tokens = json('tokens.json');
const version = release.version;
const channel = release.channel;
const escapedBadgeVersion = String(version || '').replace(/-/g, '--');

expect(release.project === 'jsray', 'version.json project must be jsray');
expect(typeof version === 'string' && /^\d+\.\d+\.\d+-(internal|beta)\.\d+$|^\d+\.\d+\.\d+$/.test(version), `version.json has an unsupported version: ${version}`);
expect(['internal', 'beta', 'stable'].includes(channel), `version.json has an unsupported channel: ${channel}`);

if (channel === 'internal') {
  expect(/-internal\.\d+$/.test(version), 'internal channel versions must end with -internal.N');
  expect(release.publicBetaReleased === false, 'internal channel must keep publicBetaReleased false');
  expect(pkg.private === true, 'internal channel must keep package.json private true');
}

if (channel === 'beta') {
  expect(/-beta\.\d+$/.test(version), 'beta channel versions must end with -beta.N');
}

if (channel === 'stable') {
  expect(!version.includes('-'), 'stable channel versions must not include a prerelease suffix');
}

expect(pkg.version === version, `package.json version ${pkg.version} does not match ${version}`);
expect(tokens.version === version, `tokens.json version ${tokens.version} does not match ${version}`);

includes('README.md', `version-${escapedBadgeVersion}`);
includes('README.zh-CN.md', `version-${escapedBadgeVersion}`);
// Phase wording in the README subtitles must match the channel.
if (channel === 'internal') {
  includes('README.md', 'Internal test build');
  includes('README.zh-CN.md', '内部测试版');
} else if (channel === 'beta') {
  includes('README.md', 'Public beta');
  includes('README.zh-CN.md', '公开测试版');
}
includes('CHANGELOG.md', `## [${version}]`);
includes('docs/versioning.md', `Current version: \`${version}\``);
includes('docs/projects.md', 'JSRay Core');

includes('src/jsray.js', `version: '${version}',`, 'runtime JSRay.version matching version.json');

if (fail.length) {
  console.error('Version metadata check failed:');
  for (const message of fail) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`version metadata ok: ${version} (${channel})`);
