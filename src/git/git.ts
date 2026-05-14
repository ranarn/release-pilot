/**
 * Git operations via @actions/exec.
 *
 * Provides functions to interact with the local git repository.
 */

import type { TagInfo } from '../core/types.js'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

/**
 * Get the list of commits between two refs.
 *
 * Returns commits in reverse chronological order (newest first).
 */
export async function getCommitsBetween(from: string | null, to: string): Promise<Array<{ message: string; hash: string }>> {
  const range = from ? `${from}..${to}` : to

  // Use %x00 as delimiter between fields and %x01 as delimiter between commits
  const format = '%H%x00%B%x01'

  let output = ''
  await exec.exec('git', ['log', `--format=${format}`, range], {
    silent: true,
    listeners: {
      stdout: data => {
        output += data.toString()
      },
    },
  })

  return output
    .split('\x01')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const separatorIdx = entry.indexOf('\x00')
      const hash = entry.slice(0, separatorIdx)
      const message = entry.slice(separatorIdx + 1).trim()
      return { message, hash }
    })
}

/**
 * List all semver-valid tags in the repository.
 *
 * Returns tags sorted by version (newest first).
 */
export async function listTags(prefix: string): Promise<TagInfo[]> {
  let output = ''
  // Use --format to get name and commit SHA in one call instead of N+1 rev-list calls.
  // %(*objectname) dereferences annotated tag objects to the commit SHA; empty for lightweight tags.
  // %(objectname) is the tag object SHA for annotated tags, or the commit SHA for lightweight tags.
  const exitCode = await exec.exec('git', ['tag', '--list', '--sort=-version:refname', '--format=%(refname:short)\t%(*objectname)\t%(objectname)', `${prefix}*`], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: data => {
        output += data.toString()
      },
    },
  })

  if (exitCode !== 0) {
    core.warning('git tag --list exited with a non-zero exit code; treating tag list as empty.')
    return []
  }

  const tags: TagInfo[] = []

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = trimmed.split('\t')
    const name = parts[0]
    if (!name) continue

    // For annotated tags parts[1] is the dereferenced commit SHA; for lightweight tags it is empty and parts[2] is the commit SHA.
    const sha = parts[1]?.trim() || parts[2]?.trim() || ''
    const version = name.startsWith(prefix) ? name.slice(prefix.length) : name

    tags.push({ name, sha, version })
  }

  return tags
}

/**
 * Configure local git identity required for annotated tag creation on GitHub Actions runners.
 */
export async function setupGit(): Promise<void> {
  await exec.exec('git', ['config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com'])
  await exec.exec('git', ['config', '--local', 'user.name', 'github-actions[bot]'])
}

export async function createLightweightTag(tag: string, sha: string): Promise<void> {
  await exec.exec('git', ['tag', tag, sha])
  await exec.exec('git', ['push', 'origin', tag])
}

/**
 * Create an annotated git tag with a message.
 */
export async function createAnnotatedTag(tag: string, sha: string, message: string): Promise<void> {
  await exec.exec('git', ['tag', '-a', tag, sha, '-m', message])
  await exec.exec('git', ['push', 'origin', tag])
}

/**
 * Force-update (or create) a tag to point at the given SHA.
 *
 * Used for floating major/minor tags like `v2` or `v2.3` that always
 * track the latest release in their range.
 */
export async function forceUpdateTag(tag: string, sha: string): Promise<void> {
  // Create or move the local tag
  await exec.exec('git', ['tag', '-f', tag, sha])
  // Force-push to remote (creates if new, moves if existing)
  await exec.exec('git', ['push', 'origin', tag, '--force'])
}

/**
 * Return true when the repository was cloned with --depth (shallow clone).
 * A shallow clone is missing tag history and will produce incorrect version results.
 */
export async function isShallowClone(): Promise<boolean> {
  let output = ''
  await exec.exec('git', ['rev-parse', '--is-shallow-repository'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: data => {
        output += data.toString()
      },
    },
  })
  return output.trim() === 'true'
}

/**
 * Get the current branch name from a ref.
 */
export function getBranchFromRef(ref: string): string {
  return ref.replace('refs/heads/', '')
}

/**
 * Check if a ref is a pull request.
 */
export function isPullRequest(ref: string): boolean {
  return ref.includes('refs/pull/')
}
