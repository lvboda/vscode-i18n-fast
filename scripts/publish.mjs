#!/usr/bin/env zx

import { $, chalk, argv } from 'zx';
import semver from 'semver';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const REPO_OWNER = 'lvboda';
const REPO_NAME = 'vscode-i18n-fast';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('please set GITHUB_TOKEN environment variable');
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getPackageJson() {
  return JSON.parse(await fs.readFile('package.json', 'utf-8'));
}

async function preCheck() {
  console.log(chalk.blue('Starting pre-release check...'));
  
  try {
    await $`pnpm run compile`;
    await $`pnpm run lint`;
    console.log(chalk.green('✅ Check passed'));
  } catch (error) {
    console.error(chalk.red('❌ Check failed'));
    throw error;
  }
}

async function updateVersion({ targetVersion }) {
  console.log(chalk.blue('Updating version...'));
  
  const packageJson = await getPackageJson();
  const newVersion = targetVersion || semver.inc(packageJson.version, 'patch');
  
  if (!semver.valid(newVersion)) {
    throw new Error(`Invalid version number: ${newVersion}`);
  }

  packageJson.version = newVersion;
  await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(chalk.green(`✅ Version updated to ${newVersion}`));

  return {
    targetVersion: newVersion,
  }
}

async function updateChangelog({ targetVersion }) {
  console.log(chalk.blue('Updating CHANGELOG.md...'));

  if (!targetVersion) {
    targetVersion = (await getPackageJson()).version;
  }

  const { data: releases } = await octokit.repos.listReleases({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    per_page: 1
  });
  
  const published_at = releases?.[0]?.published_at;
  const since = published_at ? new Date(published_at) : new Date('2025-05-25');

  const { data: pulls } = await octokit.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 1000,
  });

  const today = new Date().toISOString().split('T')[0];
  let newChangelog = `# Change Log\n\n## ${targetVersion} (${today})\n\n`;
  newChangelog += pulls
    .filter(pr => pr.merged_at && new Date(pr.merged_at) > since)
    .filter(pr => /^(feat|fix|refactor|perf)/.test(pr.title))
    .map((pr) => `- ${pr.title} [#${pr.number}](${pr.html_url})`)
    .join('\n') + '\n';
  
  const changelogPath = 'CHANGELOG.md';
  const existingChangelog = await fs.readFile(changelogPath, 'utf-8');
  await fs.writeFile(changelogPath, newChangelog + (!!existingChangelog ? '\n' : '') + existingChangelog.replace(/^# Change Log\n\n/, ''));
  
  console.log(chalk.green('✅ CHANGELOG.md updated'));
}

async function publishToVscode() {
  console.log(chalk.blue('Publishing to VS Code Marketplace...'));
  await $`pnpm npx vsce publish --no-dependencies`;
  console.log(chalk.green('✅ Published to VS Code Marketplace'));
}

async function gitPush({ targetVersion }) {
  console.log(chalk.blue('Pushing code and tags...'));

  if (!targetVersion) {
    targetVersion = (await getPackageJson()).version;
  }

  const tagName = `v${targetVersion}`;
  await $`git tag ${tagName}`;
  await $`git add .`;
  await $`git commit -m "release: ${tagName}"`;
  await $`git push`;
  await $`git push --tags`;
  console.log(chalk.green('✅ Code and tags pushed'));
}

async function publishToGithub({ targetVersion }) {
  console.log(chalk.blue('Publishing to GitHub Releases'));

  if (!targetVersion) {
    targetVersion = (await getPackageJson()).version;
  }
  
  await $`pnpm run package`;
  const vsixPath = path.join(process.cwd(), `vscode-i18n-fast-${targetVersion}.vsix`);
  
  const { data: release } = await octokit.repos.createRelease({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tag_name: `v${targetVersion}`,
    name: `v${targetVersion}`,
    body: `Please refer to [CHANGELOG.md](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/CHANGELOG.md) for details.`
  });

  await octokit.repos.uploadReleaseAsset({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    release_id: release.id,
    name: `vscode-i18n-fast-${targetVersion}.vsix`,
    data: await fs.readFile(vsixPath)
  });

  console.log(chalk.green('✅ Published to GitHub Releases'));
}

async function packageVsix({ targetVersion }) {
  console.log(chalk.blue('Packaging Alpha VSIX...'));
  const release = argv['release'] || 'patch';
  const identifier = argv['identifier'];
  const identifierBase = argv['identifierBase'] || false;

  const packageJson = await getPackageJson();
  await updateVersion({ targetVersion: targetVersion || semver.inc(packageJson.version, release, identifier, identifierBase) });
  await $`pnpm run package`;
  await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  console.log(chalk.green('✅ Alpha VSIX packaged'));
}

const taskList = [
  {
    key: 'preCheck',
    task: preCheck,
  },
  {
    key: 'updateVersion',
    task: updateVersion,
  },
  {
    key: 'updateChangelog',
    task: updateChangelog,
  },
  {
    key: 'publishToVscode',
    task: publishToVscode,
  },
  {
    key: 'gitPush',
    task: gitPush,
  },
  {
    key: 'publishToGithub',
    task: publishToGithub,
  },

  // package
  {
    key: 'packageVsix',
    task: packageVsix,
  }
]

async function bootstrap() {
  try {
    const targetVersion = argv['version'] || argv['v'];
    const tasksStr = argv['tasks'] || argv['t'] || 'preCheck,updateVersion,updateChangelog,publishToVscode,gitPush,publishToGithub';
    const tasks = tasksStr.split(',');

    if (!tasks.length) {
      throw new Error('No tasks specified');
    }

    const invalidTasks = tasks.filter(task => !taskList.some(t => t.key === task));
    if (invalidTasks.length) {
      throw new Error(`Invalid task: ${invalidTasks.join(',')}`);
    }

    const context = { targetVersion };
    for (const task of tasks) {
      Object.assign(context, await taskList.find(t => t.key === task).task(context) || {});
    }

    if (tasks.some(task => ['publishToVscode', 'publishToGithub'].includes(task))) {
      console.log(chalk.green('🎉 Release completed!'));  
    } else {
      console.log(chalk.green('✅ All tasks finished!'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed:'), error);
    process.exit(1);
  }
}

bootstrap();
