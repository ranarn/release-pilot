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
  bumpMinorPreMajor?: boolean
}): VersionResult {
  const { previousTag, prefix, bump, defaultBump, initialVersion, prerelease, prereleaseSuffix, bumpMinorPreMajor = false } = options

  // Determine the effective bump
  let effectiveBump: BumpType
  if (bump === 'none') {
    if (defaultBump === 'false' || defaultBump === 'none') {
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
    // semver.valid() also accepts "v0.1.0" — use its normalized form so the prefix isn't doubled
    const version = semver.valid(initialVersion)
    if (!version) {
      throw new Error(`Invalid initial version "${initialVersion}". Must be a valid semver string (e.g. "0.1.0").`)
    }
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

  if (bumpMinorPreMajor && parsed.major === 0 && effectiveBump === 'major') {
    effectiveBump = 'minor'
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
 * Split a version into its components for use as action outputs.
 * `prerelease` is the joined prerelease identifiers (e.g. "beta.1"), or "" for a stable version.
 */
export function versionComponents(version: string): { major: string; minor: string; patch: string; prerelease: string } {
  const parsed = semver.parse(version)
  if (!parsed) {
    throw new Error(`Could not parse version "${version}".`)
  }
  return {
    major: String(parsed.major),
    minor: String(parsed.minor),
    patch: String(parsed.patch),
    prerelease: parsed.prerelease.join('.'),
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
  const sanitized = input
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return sanitized || 'release'
}
