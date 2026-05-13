/**
 * Type definitions for Release Pilot.
 */

/** Supported SemVer bump types. */
export type BumpType = 'major' | 'minor' | 'patch' | 'none'

/** A parsed conventional commit. */
export interface ConventionalCommit {
  /** The raw commit message (full). */
  raw: string
  /** The commit type (e.g., feat, fix, chore). */
  type: string
  /** Optional scope (e.g., "api" in "feat(api): ..."). */
  scope: string | null
  /** Whether this commit has a breaking change indicator. */
  breaking: boolean
  /** The commit description (subject line after the colon). */
  description: string
  /** The commit body (if any). */
  body: string | null
  /** Footer key-value pairs. */
  footers: Footer[]
  /** The commit SHA. */
  hash: string
}

/** A footer entry from a conventional commit. */
export interface Footer {
  key: string
  value: string
}

/** A git tag with its associated metadata. */
export interface TagInfo {
  name: string
  sha: string
  version: string
}

/** A release rule mapping commit types to bump types. */
export interface ReleaseRule {
  type: string
  bump: BumpType
  section: string
}

/** Changelog section grouping commits by type. */
export interface ChangelogSection {
  title: string
  commits: ConventionalCommit[]
}

/** The result of the version calculation. */
export interface VersionResult {
  /** The new version string (without prefix). */
  version: string
  /** The new tag (with prefix). */
  tag: string
  /** The previous version (without prefix), or null if first release. */
  previousVersion: string | null
  /** The previous tag (with prefix), or null if first release. */
  previousTag: string | null
  /** The bump type applied. */
  bump: BumpType
  /** Whether this is the initial release. */
  isInitial: boolean
}

/** Configuration parsed from action inputs. */
export interface ActionConfig {
  token: string
  prefix: string
  defaultBump: BumpType | 'false'
  initialVersion: string
  prerelease: boolean
  prereleaseSuffix: string
  branches: string[]
  createRelease: boolean
  releaseDraft: boolean
  releaseTitle: string
  annotated: boolean
  commitSha: string
  dryRun: boolean
  customRules: ReleaseRule[]
  includeBodyInChangelog: boolean
  /** Create/update a floating major version tag (e.g., v2 → latest v2.x.x). */
  majorTag: boolean
  /** Create/update a floating minor version tag (e.g., v2.3 → latest v2.3.x). */
  minorTag: boolean
}
