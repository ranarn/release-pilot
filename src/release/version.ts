/**
 * SemVer version calculation.
 *
 * Handles version bumping, prerelease management, and initial version logic.
 */

import type { BumpType, VersionResult } from '../core/types.js'

import * as semver from 'semver'

/**
 * Calculate the next version based on the previous tag and the determined bump type.
 */
export function calculateVersion(options: {
  previousTag: string | null
  prefix: string
  bump: BumpType
  defaultBump: BumpType | 'false'
  initialVersion: string
  prerelease: boolean
  prereleaseSuffix: string
}): VersionResult {
  const { previousTag, prefix, bump, defaultBump, initialVersion, prerelease, prereleaseSuffix } = options

  // Determine the effective bump
  let effectiveBump: BumpType
  if (bump === 'none') {
    if (defaultBump === 'false') {
      // No bump detected and default is disabled — no release
      return {
        version: '',
        tag: '',
        previousVersion: previousTag ? stripPrefix(previousTag, prefix) : null,
        previousTag,
        bump: 'none',
        isInitial: false,
      }
    }
    effectiveBump = defaultBump
  } else {
    effectiveBump = bump
  }

  // Handle initial version (no previous tags)
  if (!previousTag) {
    const version = initialVersion
    const tag = `${prefix}${version}`

    if (prerelease && prereleaseSuffix) {
      const preVersion = `${version}-${sanitizeIdentifier(prereleaseSuffix)}.0`
      return {
        version: preVersion,
        tag: `${prefix}${preVersion}`,
        previousVersion: null,
        previousTag: null,
        bump: effectiveBump,
        isInitial: true,
      }
    }

    return {
      version,
      tag,
      previousVersion: null,
      previousTag: null,
      bump: effectiveBump,
      isInitial: true,
    }
  }

  // Parse previous version
  const previousVersion = stripPrefix(previousTag, prefix)
  const parsed = semver.parse(previousVersion)

  if (!parsed) {
    throw new Error(`Could not parse previous version "${previousVersion}" from tag "${previousTag}".`)
  }

  // Calculate next version
  let nextVersion: string | null

  if (prerelease && prereleaseSuffix) {
    const identifier = sanitizeIdentifier(prereleaseSuffix)

    // When already on a prerelease with the same identifier, avoid double-bumping the base version.
    // Only escalate if the effective bump requires a higher level than what the current prerelease targets.
    // e.g. 1.1.0-beta.0 + minor → 1.1.0-beta.1 (no escalation), but 1.1.0-beta.0 + major → 2.0.0-beta.0 (escalate).
    if (parsed.prerelease.length > 0 && String(parsed.prerelease[0]) === identifier) {
      const currentLevel: BumpType = parsed.patch > 0 ? 'patch' : parsed.minor > 0 ? 'minor' : 'major'
      const bumpPriority: Record<BumpType, number> = { none: 0, patch: 1, minor: 2, major: 3 }

      if (bumpPriority[effectiveBump] <= bumpPriority[currentLevel]) {
        nextVersion = semver.inc(parsed, 'prerelease', identifier)
      } else {
        nextVersion = semver.inc(parsed, `pre${effectiveBump}` as semver.ReleaseType, identifier)
      }
    } else {
      nextVersion = semver.inc(parsed, `pre${effectiveBump}` as semver.ReleaseType, identifier)
    }
  } else {
    nextVersion = semver.inc(parsed, effectiveBump as semver.ReleaseType)
  }

  if (!nextVersion) {
    throw new Error(`Failed to increment version "${previousVersion}" with bump "${effectiveBump}".`)
  }

  return {
    version: nextVersion,
    tag: `${prefix}${nextVersion}`,
    previousVersion,
    previousTag,
    bump: effectiveBump,
    isInitial: false,
  }
}

/**
 * Strip the prefix from a tag name to get the version string.
 */
export function stripPrefix(tag: string, prefix: string): string {
  if (prefix && tag.startsWith(prefix)) {
    return tag.slice(prefix.length)
  }
  return tag
}

/**
 * Sanitize a string for use as a semver prerelease identifier.
 * Only alphanumeric characters and hyphens are allowed.
 */
export function sanitizeIdentifier(input: string): string {
  return input.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
}
