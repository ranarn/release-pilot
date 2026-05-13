/**
 * Changelog generator.
 *
 * Generates beautiful, categorized markdown changelogs from conventional commits.
 */

import type { ChangelogSection, ConventionalCommit, ReleaseRule } from '../core/types.js'

/**
 * Generate a markdown changelog from parsed conventional commits.
 */
export function generateChangelog(
  commits: ConventionalCommit[],
  rules: ReleaseRule[],
  options: {
    repositoryUrl?: string
    includeBody?: boolean
  } = {}
): string {
  const { repositoryUrl, includeBody = false } = options

  if (commits.length === 0) {
    return ''
  }

  // Build section map from rules
  const sectionMap = new Map<string, string>()
  for (const rule of rules) {
    if (rule.section) {
      sectionMap.set(rule.type, rule.section)
    }
  }

  // Group commits into sections
  const sections = groupCommits(commits, sectionMap)

  // Collect breaking changes
  const breakingChanges = commits.filter(c => c.breaking)

  // Build the markdown
  const parts: string[] = []

  // Breaking changes section (always first if present)
  if (breakingChanges.length > 0) {
    parts.push('### 💥 Breaking Changes\n')
    for (const commit of breakingChanges) {
      parts.push(formatCommitLine(commit, repositoryUrl))

      // Include breaking change details from footer
      const breakingFooter = commit.footers.find(f => f.key === 'BREAKING CHANGE' || f.key === 'BREAKING-CHANGE')
      if (breakingFooter) {
        parts.push(`  > ${breakingFooter.value}\n`)
      }
    }
    parts.push('')
  }

  // Regular sections
  for (const section of sections) {
    // Skip if all commits in this section are already listed as breaking
    const nonBreaking = section.commits.filter(c => !c.breaking)
    if (nonBreaking.length === 0) continue

    parts.push(`### ${section.title}\n`)
    for (const commit of nonBreaking) {
      parts.push(formatCommitLine(commit, repositoryUrl))

      if (includeBody && commit.body) {
        // Indent body text
        const bodyLines = commit.body
          .split('\n')
          .map(line => `  ${line}`)
          .join('\n')
        parts.push(`${bodyLines}\n`)
      }
    }
    parts.push('')
  }

  return parts.join('\n').trim()
}

/**
 * Format a single commit as a markdown list item.
 */
function formatCommitLine(commit: ConventionalCommit, repositoryUrl?: string): string {
  const scope = commit.scope ? `**${commit.scope}:** ` : ''
  const hash = commit.hash ? (repositoryUrl ? ` ([${commit.hash.slice(0, 7)}](${repositoryUrl}/commit/${commit.hash}))` : ` (${commit.hash.slice(0, 7)})`) : ''

  return `- ${scope}${commit.description}${hash}`
}

/**
 * Group commits into changelog sections based on their type.
 */
function groupCommits(commits: ConventionalCommit[], sectionMap: Map<string, string>): ChangelogSection[] {
  const groups = new Map<string, ConventionalCommit[]>()

  for (const commit of commits) {
    const sectionTitle = sectionMap.get(commit.type)
    if (!sectionTitle) continue // Skip types without a section

    const existing = groups.get(sectionTitle) || []
    existing.push(commit)
    groups.set(sectionTitle, existing)
  }

  // Preserve the order defined by the rules
  const orderedSections: ChangelogSection[] = []
  const seenTitles = new Set<string>()

  for (const [, title] of sectionMap) {
    if (seenTitles.has(title)) continue
    seenTitles.add(title)

    const sectionCommits = groups.get(title)
    if (sectionCommits && sectionCommits.length > 0) {
      orderedSections.push({ title, commits: sectionCommits })
    }
  }

  return orderedSections
}
