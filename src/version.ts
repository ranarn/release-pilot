/**
 * SemVer version calculation.
 *
 * Handles version bumping, prerelease management, and initial version logic.
 */

import * as semver from 'semver';
import type { BumpType, VersionResult } from './types.js';

/**
 * Calculate the next version based on the previous tag and the determined bump type.
 */
export function calculateVersion(options: {
  previousTag: string | null;
  prefix: string;
  bump: BumpType;
  defaultBump: BumpType | 'false';
  initialVersion: string;
  prerelease: boolean;
  prereleaseSuffix: string;
}): VersionResult {
  const {
    previousTag,
    prefix,
    bump,
    defaultBump,
    initialVersion,
    prerelease,
    prereleaseSuffix,
  } = options;

  // Determine the effective bump
  let effectiveBump: BumpType;
  if (bump === 'none') {
    if (defaultBump === 'false') {
      // No bump detected and default is disabled — no release
      return {
        version: '',
        tag: '',
        previousVersion: previousTag
          ? stripPrefix(previousTag, prefix)
          : null,
        previousTag,
        bump: 'none',
        isInitial: false,
      };
    }
    effectiveBump = defaultBump;
  } else {
    effectiveBump = bump;
  }

  // Handle initial version (no previous tags)
  if (!previousTag) {
    const version = initialVersion;
    const tag = `${prefix}${version}`;

    if (prerelease && prereleaseSuffix) {
      const preVersion = `${version}-${sanitizeIdentifier(prereleaseSuffix)}.0`;
      return {
        version: preVersion,
        tag: `${prefix}${preVersion}`,
        previousVersion: null,
        previousTag: null,
        bump: effectiveBump,
        isInitial: true,
      };
    }

    return {
      version,
      tag,
      previousVersion: null,
      previousTag: null,
      bump: effectiveBump,
      isInitial: true,
    };
  }

  // Parse previous version
  const previousVersion = stripPrefix(previousTag, prefix);
  const parsed = semver.parse(previousVersion);

  if (!parsed) {
    throw new Error(
      `Could not parse previous version "${previousVersion}" from tag "${previousTag}".`,
    );
  }

  // Calculate next version
  let nextVersion: string | null;

  if (prerelease && prereleaseSuffix) {
    const identifier = sanitizeIdentifier(prereleaseSuffix);
    const releaseType = `pre${effectiveBump}` as semver.ReleaseType;
    nextVersion = semver.inc(parsed, releaseType, identifier);
  } else {
    nextVersion = semver.inc(parsed, effectiveBump as semver.ReleaseType);
  }

  if (!nextVersion) {
    throw new Error(
      `Failed to increment version "${previousVersion}" with bump "${effectiveBump}".`,
    );
  }

  return {
    version: nextVersion,
    tag: `${prefix}${nextVersion}`,
    previousVersion,
    previousTag,
    bump: effectiveBump,
    isInitial: false,
  };
}

/**
 * Strip the prefix from a tag name to get the version string.
 */
export function stripPrefix(tag: string, prefix: string): string {
  if (prefix && tag.startsWith(prefix)) {
    return tag.slice(prefix.length);
  }
  return tag;
}

/**
 * Sanitize a string for use as a semver prerelease identifier.
 * Only alphanumeric characters and hyphens are allowed.
 */
export function sanitizeIdentifier(input: string): string {
  return input.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
}
