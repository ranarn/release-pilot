/**
 * Core action orchestrator.
 *
 * Ties together all modules to execute the Release Pilot workflow.
 */

import type { ActionConfig, BumpType, TagInfo } from './types.js'

import * as core from '@actions/core'
import * as semver from 'semver'

import { generateChangelog } from './changelog.js'
import { isSkipCi, parseCommits } from './commits.js'
import { createAnnotatedTag, createLightweightTag, forceUpdateTag, getBranchFromRef, getCommitsBetween, isPullRequest, listTags, setupGit } from './git.js'
import { createRelease } from './github.js'
import { determineBump, mergeRules, parseCustomRules } from './rules.js'
import { writeSummary } from './summary.js'
import { calculateVersion } from './version.js'

/**
 * Parse action inputs into a typed configuration.
 */
function getConfig(): ActionConfig {
  const customRulesInput = core.getInput('custom-rules')

  return {
    token: core.getInput('token', { required: true }),
    prefix: core.getInput('prefix'),
    defaultBump: core.getInput('default-bump') as BumpType | 'false',
    initialVersion: core.getInput('initial-version'),
    prerelease: core.getBooleanInput('prerelease'),
    prereleaseSuffix: core.getInput('prerelease-suffix'),
    branches: core
      .getInput('branches')
      .split(',')
      .map(b => b.trim())
      .filter(Boolean),
    createRelease: core.getBooleanInput('create-release'),
    releaseDraft: core.getBooleanInput('release-draft'),
    releaseTitle: core.getInput('release-title'),
    annotated: core.getBooleanInput('annotated'),
    commitSha: core.getInput('commit-sha'),
    dryRun: core.getBooleanInput('dry-run'),
    customRules: parseCustomRules(customRulesInput),
    includeBodyInChangelog: core.getBooleanInput('include-body-in-changelog'),
    majorTag: core.getBooleanInput('major-tag'),
    minorTag: core.getBooleanInput('minor-tag'),
  }
}

/**
 * Run the Release Pilot action.
 */
export async function run(): Promise<void> {
  const config = getConfig()

  const validDefaultBumps = ['patch', 'minor', 'major', 'none', 'false'] as const
  if (!(validDefaultBumps as readonly string[]).includes(config.defaultBump)) {
    core.setFailed(`Invalid default-bump value: "${config.defaultBump}". Must be one of: ${validDefaultBumps.join(', ')}`)
    return
  }

  const { GITHUB_REF, GITHUB_SHA } = process.env
  if (!GITHUB_REF) {
    core.setFailed('Missing GITHUB_REF environment variable.')
    return
  }

  const commitRef = config.commitSha || GITHUB_SHA
  if (!commitRef) {
    core.setFailed('Missing commit SHA. Set commit-sha input or ensure GITHUB_SHA is available.')
    return
  }

  // Check if this is a release branch
  const currentBranch = getBranchFromRef(GITHUB_REF)

  if (isPullRequest(GITHUB_REF)) {
    core.info('Pull request detected — skipping release.')
    core.setOutput('released', 'false')
    core.setOutput('bump', 'none')
    return
  }

  const isReleaseBranch = config.branches.some(pattern => {
    try {
      return new RegExp(`^${pattern}$`).test(currentBranch)
    } catch {
      core.warning(`Invalid branch pattern "${pattern}" — treating as literal string match.`)
      return currentBranch === pattern
    }
  })

  if (!isReleaseBranch && !config.prerelease) {
    core.info(`Branch "${currentBranch}" does not match release branches [${config.branches.join(', ')}]. Skipping.`)
    core.setOutput('released', 'false')
    core.setOutput('bump', 'none')
    return
  }

  // Get existing tags
  core.info('📡 Fetching tags...')
  const tags = await listTags(config.prefix)
  core.info(`Found ${tags.length} existing tag(s).`)

  // Find the latest tag
  const latestTag = findLatestTag(tags)

  if (latestTag) {
    core.info(`📌 Latest tag: ${latestTag.name} (${latestTag.version})`)
  } else {
    core.info('📌 No previous tags found — this will be the initial release.')
  }

  // Get commits since last tag
  core.info('📝 Analyzing commits...')
  const allCommits = await getCommitsBetween(latestTag?.sha ?? null, commitRef)
  const rawCommits = allCommits.filter(c => !isSkipCi(c.message))
  const skippedCount = allCommits.length - rawCommits.length
  core.info(`Found ${rawCommits.length} commit(s) since last tag${skippedCount > 0 ? ` (${skippedCount} [skip ci] commit(s) excluded)` : ''}.`)

  if (rawCommits.length === 0 && latestTag) {
    core.info('No new commits. Nothing to release.')
    core.setOutput('released', 'false')
    core.setOutput('bump', 'none')
    core.setOutput('previous-tag', latestTag.name)
    core.setOutput('previous-version', latestTag.version)
    return
  }

  // Parse conventional commits
  const commits = parseCommits(rawCommits)
  core.info(`Parsed ${commits.length} conventional commit(s) out of ${rawCommits.length} total.`)

  if (commits.length === 0 && rawCommits.length > 0) {
    core.info('No conventional commits found. Non-conventional commits are ignored for bump detection.')
  }

  // Determine bump type
  const rules = mergeRules(config.customRules)
  const bump = determineBump(commits, rules)
  core.info(`🎯 Detected bump: ${bump}`)

  // Determine prerelease suffix
  let prereleaseSuffix = config.prereleaseSuffix
  if (config.prerelease && !prereleaseSuffix) {
    prereleaseSuffix = currentBranch
  }

  // Calculate next version
  const result = calculateVersion({
    previousTag: latestTag?.name ?? null,
    prefix: config.prefix,
    bump,
    defaultBump: config.defaultBump,
    initialVersion: config.initialVersion,
    prerelease: config.prerelease,
    prereleaseSuffix,
  })

  // Set outputs
  core.setOutput('bump', result.bump)

  if (!result.version) {
    core.info('No version bump required. Skipping tag creation.')
    core.setOutput('released', 'false')
    if (result.previousTag) {
      core.setOutput('previous-tag', result.previousTag)
      core.setOutput('previous-version', result.previousVersion)
    }
    return
  }

  core.info(`🚀 New version: ${result.version}`)
  core.info(`🏷️  New tag: ${result.tag}`)

  core.setOutput('version', result.version)
  core.setOutput('tag', result.tag)

  if (result.previousTag) {
    core.setOutput('previous-tag', result.previousTag)
    core.setOutput('previous-version', result.previousVersion)
  }

  // Generate changelog
  const repositoryUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
  const changelog = generateChangelog(commits, rules, {
    repositoryUrl,
    includeBody: config.includeBodyInChangelog,
  })

  core.setOutput('changelog', changelog)

  if (changelog) {
    core.info('📋 Changelog generated.')
    core.debug(changelog)
  }

  // Dry run check
  if (config.dryRun) {
    core.info('🏜️ Dry run mode — no tags or releases will be created.')
    core.setOutput('released', 'false')
    await writeSummary({
      result,
      commits,
      changelog,
      releaseUrl: null,
      dryRun: true,
    })
    return
  }

  // Configure git identity required for annotated tag creation on GitHub Actions runners
  await setupGit()

  // Create the tag
  core.info(`🏷️ Creating tag ${result.tag}...`)
  if (config.annotated) {
    const tagMessage = changelog || `Release ${result.tag}`
    await createAnnotatedTag(result.tag, commitRef, tagMessage)
  } else {
    await createLightweightTag(result.tag, commitRef)
  }
  core.info(`✅ Tag ${result.tag} created successfully.`)

  // Create floating major/minor tags (e.g., v2, v2.3)
  await createFloatingTags(result.version, config.prefix, commitRef, config)

  // Create GitHub Release (if enabled)
  let releaseUrl: string | null = null
  if (config.createRelease) {
    core.info('📦 Creating GitHub Release...')
    const title = config.releaseTitle.replace('{{version}}', result.version).replace('{{tag}}', result.tag)

    releaseUrl = await createRelease({
      token: config.token,
      tag: result.tag,
      title,
      body: changelog,
      draft: config.releaseDraft,
      prerelease: config.prerelease,
    })

    core.info(`✅ Release created: ${releaseUrl}`)
    core.setOutput('release-url', releaseUrl)
  }

  core.setOutput('released', 'true')

  // Write job summary
  await writeSummary({
    result,
    commits,
    changelog,
    releaseUrl,
    dryRun: false,
  })

  core.info('✈️ Release Pilot complete!')
}

function findLatestTag(tags: TagInfo[]): TagInfo | null {
  const valid = tags.filter(t => semver.valid(t.version))
  if (valid.length === 0) return null

  valid.sort((a, b) => semver.rcompare(a.version, b.version))
  return valid[0] ?? null
}

/**
 * Create floating major and/or minor version tags.
 *
 * For version "2.3.1" with prefix "v":
 *   - major-tag → "v2" (points to latest v2.x.x)
 *   - minor-tag → "v2.3" (points to latest v2.3.x)
 */
async function createFloatingTags(version: string, prefix: string, sha: string, config: ActionConfig): Promise<void> {
  const parsed = semver.parse(version)
  if (!parsed) return

  // Skip floating tags for prereleases (they shouldn't move the stable pointer)
  if (parsed.prerelease.length > 0) {
    core.debug('Skipping floating tags for prerelease version.')
    return
  }

  if (config.majorTag) {
    const majorTag = `${prefix}${parsed.major}`
    core.info(`🔗 Updating floating major tag: ${majorTag} → ${version}`)
    await forceUpdateTag(majorTag, sha)
  }

  if (config.minorTag) {
    const minorTag = `${prefix}${parsed.major}.${parsed.minor}`
    core.info(`🔗 Updating floating minor tag: ${minorTag} → ${version}`)
    await forceUpdateTag(minorTag, sha)
  }
}
