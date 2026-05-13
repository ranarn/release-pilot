/**
 * GitHub Actions Job Summary generator.
 *
 * Creates a beautiful summary table in the Actions UI.
 */

import type { ConventionalCommit, VersionResult } from '../core/types.js'

import * as core from '@actions/core'

/**
 * Write a rich summary to the GitHub Actions Job Summary.
 */
export async function writeSummary(options: { result: VersionResult; commits: ConventionalCommit[]; changelog: string; releaseUrl: string | null; dryRun: boolean }): Promise<void> {
  const { result, commits, changelog, releaseUrl, dryRun } = options

  const summary = core.summary

  // Header
  if (dryRun) {
    summary.addRaw('# ✈️ Release Pilot — Dry Run\n\n')
  } else if (result.bump === 'none') {
    summary.addRaw('# ✈️ Release Pilot — No Release\n\n')
  } else {
    summary.addRaw('# ✈️ Release Pilot\n\n')
  }

  // Version info table
  const rows: [string, string][] = []

  if (result.version) {
    rows.push(['🏷️ New Tag', `\`${result.tag}\``])
    rows.push(['📦 Version', `\`${result.version}\``])
  }

  if (result.previousTag) {
    rows.push(['⏮️ Previous Tag', `\`${result.previousTag}\``])
  }

  rows.push(['📈 Bump', result.bump === 'none' ? 'No bump' : `**${result.bump}**`])
  rows.push(['📝 Commits Analyzed', `${commits.length}`])

  if (result.isInitial) {
    rows.push(['🆕 Initial Release', 'Yes'])
  }

  if (releaseUrl) {
    rows.push(['🔗 Release', `[View Release](${releaseUrl})`])
  }

  summary.addTable([
    [
      { data: 'Item', header: true },
      { data: 'Value', header: true },
    ],
    ...rows,
  ])

  // Changelog
  if (changelog) {
    summary.addRaw('\n## 📋 Changelog\n\n')
    summary.addRaw(changelog)
  }

  // Commit breakdown
  if (commits.length > 0) {
    const typeCounts = new Map<string, number>()
    for (const c of commits) {
      typeCounts.set(c.type, (typeCounts.get(c.type) || 0) + 1)
    }

    summary.addRaw('\n\n## 📊 Commit Breakdown\n\n')
    const breakdownRows: string[][] = []
    for (const [type, count] of typeCounts) {
      breakdownRows.push([type, String(count)])
    }
    summary.addTable([
      [
        { data: 'Type', header: true },
        { data: 'Count', header: true },
      ],
      ...breakdownRows,
    ])
  }

  await summary.write()
}
