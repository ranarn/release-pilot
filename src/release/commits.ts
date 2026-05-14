/**
 * Conventional Commit parser.
 *
 * Parses commit messages following the Conventional Commits specification:
 * https://www.conventionalcommits.org/
 *
 * Supports:
 * - Standard types: feat, fix, chore, docs, style, refactor, perf, test, build, ci
 * - Scopes: feat(api): ...
 * - Breaking changes via `!` suffix: feat!: ... or feat(api)!: ...
 * - Breaking changes via BREAKING CHANGE footer
 * - Multi-line bodies and footers
 * - Squash merge PR title parsing
 */

import type { ConventionalCommit, Footer } from '../core/types.js'

/**
 * Regex to parse the conventional commit header.
 *
 * Groups:
 * 1. type (e.g., feat, fix)
 * 2. scope (optional, e.g., api)
 * 3. breaking indicator (optional, !)
 * 4. description (subject after colon)
 */
const HEADER_REGEX = /^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/

/**
 * Regex to detect a footer token line.
 * Matches: `BREAKING CHANGE: ...`, `Closes: #123`, `Reviewed-by: name`, etc.
 * Also matches `BREAKING-CHANGE:` (with hyphen).
 */
const FOOTER_REGEX = /^(BREAKING[ -]CHANGE|[\w-]+)\s*:\s*(.*)$/

/**
 * Regex to detect a footer with `#` separator (e.g., `Closes #123`).
 */
const FOOTER_HASH_REGEX = /^([\w-]+)\s+(#.*)$/

/**
 * Parse a single commit message into a ConventionalCommit object.
 *
 * Returns `null` if the message doesn't follow conventional commit format.
 */
export function parseCommit(message: string, hash: string = ''): ConventionalCommit | null {
  const lines = message.trim().split('\n')
  const headerLine = lines[0]?.trim()

  if (!headerLine) return null

  // Handle squash merge format: "feat: description (#123)"
  const cleanHeader = headerLine.replace(/\s*\(#\d+\)\s*$/, '')

  const headerMatch = cleanHeader.match(HEADER_REGEX)
  if (!headerMatch) return null

  const [, type, scope, breakingMark, description] = headerMatch
  if (!type || !description) return null

  // Parse body and footers
  const { body, footers } = parseBodyAndFooters(lines.slice(1))

  // Determine if this is a breaking change
  const breaking = breakingMark === '!' || footers.some(f => f.key === 'BREAKING CHANGE' || f.key === 'BREAKING-CHANGE')

  return {
    raw: message,
    type: type.toLowerCase(),
    scope: scope || null,
    breaking,
    description: description.trim(),
    body,
    footers,
    hash,
  }
}

/**
 * Parse the body and footer sections from remaining commit lines.
 */
function parseBodyAndFooters(lines: string[]): {
  body: string | null
  footers: Footer[]
} {
  if (lines.length === 0) {
    return { body: null, footers: [] }
  }

  const bodyLines: string[] = []
  const footers: Footer[] = []
  let inFooters = false
  let hasBodyContent = false
  let lastLineWasBlank = false

  // Skip the first blank separator line
  const startIdx = lines[0]?.trim() === '' ? 1 : 0

  for (const line of lines.slice(startIdx)) {
    const trimmed = line.trim()

    if (inFooters) {
      if (trimmed !== '') {
        const footerMatch = trimmed.match(FOOTER_REGEX) ?? trimmed.match(FOOTER_HASH_REGEX)
        if (footerMatch) {
          const key = footerMatch[1]
          const rawValue = footerMatch[2]
          if (key !== undefined && rawValue !== undefined) {
            footers.push({ key, value: rawValue.trim() })
          }
        } else {
          const lastFooter = footers.at(-1)
          if (lastFooter) {
            lastFooter.value += `\n${trimmed}`
          }
        }
      }
    } else {
      // Footers must be preceded by a blank line when body content exists (per Conventional Commits spec)
      const eligibleForFooter = !hasBodyContent || lastLineWasBlank
      const footerMatch = eligibleForFooter && trimmed !== '' ? (trimmed.match(FOOTER_REGEX) ?? trimmed.match(FOOTER_HASH_REGEX)) : null

      if (footerMatch) {
        const key = footerMatch[1]
        const rawValue = footerMatch[2]
        if (key !== undefined && rawValue !== undefined) {
          inFooters = true
          while (bodyLines.at(-1)?.trim() === '') bodyLines.pop()
          footers.push({ key, value: rawValue.trim() })
        }
      } else {
        bodyLines.push(line)
        if (trimmed !== '') hasBodyContent = true
      }
    }

    lastLineWasBlank = trimmed === ''
  }

  const body = bodyLines.join('\n').trim() || null
  return { body, footers }
}

/**
 * Returns true if the commit message contains a [skip ci] marker.
 *
 * GitHub treats [skip ci] (and variants) as a signal to skip automated processing.
 * Release Pilot honours this by excluding such commits from bump detection and changelogs.
 */
export function isSkipCi(message: string): boolean {
  return /\[skip[ _-]?ci\]/i.test(message)
}

/**
 * Parse multiple commit messages into ConventionalCommit objects.
 * Non-conventional commits are silently skipped.
 */
export function parseCommits(commits: Array<{ message: string; hash: string }>): ConventionalCommit[] {
  const parsed: ConventionalCommit[] = []

  for (const commit of commits) {
    const result = parseCommit(commit.message, commit.hash)
    if (result) {
      parsed.push(result)
    }
  }

  return parsed
}
