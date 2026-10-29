/**
 * Tag selection.
 *
 * Picks the relevant semver tags out of the repository's tag list.
 */

import type { TagInfo } from '../core/types.js'

import * as semver from 'semver'

/**
 * Return the tag with the highest semver version, ignoring non-semver tags (e.g. floating `v1`).
 */
export function findLatestTag(tags: TagInfo[]): TagInfo | null {
  const valid = tags.filter(t => semver.valid(t.version))
  if (valid.length === 0) return null

  valid.sort((a, b) => semver.rcompare(a.version, b.version))
  return valid[0] ?? null
}

/**
 * Return the highest semver tag strictly below the given tag's version.
 */
export function findPreviousTag(tags: TagInfo[], current: TagInfo): TagInfo | null {
  return findLatestTag(tags.filter(t => semver.valid(t.version) && semver.lt(t.version, current.version)))
}

/**
 * Return the highest semver tag pointing at the given commit, or null when the commit carries none.
 */
export function findTagOnCommit(tags: TagInfo[], sha: string): TagInfo | null {
  const commit = sha.toLowerCase()
  return findLatestTag(tags.filter(t => t.sha.toLowerCase() === commit))
}
