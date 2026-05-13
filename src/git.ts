/**
 * Git operations via @actions/exec.
 *
 * Provides functions to interact with the local git repository.
 */

import * as exec from '@actions/exec';
import type { TagInfo } from './types.js';

/**
 * Get the list of commits between two refs.
 *
 * Returns commits in reverse chronological order (newest first).
 */
export async function getCommitsBetween(
  from: string | null,
  to: string,
): Promise<Array<{ message: string; hash: string }>> {
  const range = from ? `${from}..${to}` : to;

  // Use %x00 as delimiter between fields and %x01 as delimiter between commits
  const format = '%H%x00%B%x01';

  let output = '';
  await exec.exec('git', ['log', '--format=' + format, range], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString();
      },
    },
  });

  return output
    .split('\x01')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIdx = entry.indexOf('\x00');
      const hash = entry.slice(0, separatorIdx);
      const message = entry.slice(separatorIdx + 1).trim();
      return { message, hash };
    });
}

/**
 * List all semver-valid tags in the repository.
 *
 * Returns tags sorted by version (newest first).
 */
export async function listTags(prefix: string): Promise<TagInfo[]> {
  let output = '';
  const exitCode = await exec.exec(
    'git',
    ['tag', '--list', '--sort=-version:refname', `${prefix}*`],
    {
      silent: true,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data) => {
          output += data.toString();
        },
      },
    },
  );

  if (exitCode !== 0) {
    return [];
  }

  const tags: TagInfo[] = [];

  for (const line of output.split('\n')) {
    const name = line.trim();
    if (!name) continue;

    // Get the commit SHA for this tag
    let sha = '';
    await exec.exec('git', ['rev-list', '-1', name], {
      silent: true,
      listeners: {
        stdout: (data) => {
          sha += data.toString().trim();
        },
      },
    });

    const version = name.startsWith(prefix)
      ? name.slice(prefix.length)
      : name;

    tags.push({ name, sha, version });
  }

  return tags;
}

/**
 * Create a lightweight git tag.
 */
export async function createLightweightTag(
  tag: string,
  sha: string,
): Promise<void> {
  await exec.exec('git', ['tag', tag, sha]);
  await exec.exec('git', ['push', 'origin', tag]);
}

/**
 * Create an annotated git tag with a message.
 */
export async function createAnnotatedTag(
  tag: string,
  sha: string,
  message: string,
): Promise<void> {
  await exec.exec('git', ['tag', '-a', tag, sha, '-m', message]);
  await exec.exec('git', ['push', 'origin', tag]);
}

/**
 * Force-update (or create) a tag to point at the given SHA.
 *
 * Used for floating major/minor tags like `v2` or `v2.3` that always
 * track the latest release in their range.
 */
export async function forceUpdateTag(
  tag: string,
  sha: string,
): Promise<void> {
  // Create or move the local tag
  await exec.exec('git', ['tag', '-f', tag, sha]);
  // Force-push to remote (creates if new, moves if existing)
  await exec.exec('git', ['push', 'origin', tag, '--force']);
}

/**
 * Get the current branch name from a ref.
 */
export function getBranchFromRef(ref: string): string {
  return ref.replace('refs/heads/', '');
}

/**
 * Check if a ref is a pull request.
 */
export function isPullRequest(ref: string): boolean {
  return ref.includes('refs/pull/');
}
