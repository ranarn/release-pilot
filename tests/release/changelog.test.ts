import type { ConventionalCommit } from '../../src/core/types.js'

import { describe, expect, it } from 'vitest'

import { generateChangelog } from '../../src/release/changelog.js'
import { DEFAULT_RULES } from '../../src/release/rules.js'

function makeCommit(overrides: Partial<ConventionalCommit> = {}): ConventionalCommit {
  return {
    raw: '',
    type: 'feat',
    scope: null,
    breaking: false,
    description: 'test commit',
    body: null,
    footers: [],
    hash: 'abc1234567890',
    ...overrides,
  }
}

describe('generateChangelog', () => {
  it('should generate changelog with features and fixes', () => {
    const commits = [makeCommit({ type: 'feat', description: 'add login', hash: 'aaa1111' }), makeCommit({ type: 'fix', description: 'fix crash', hash: 'bbb2222' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toContain('🚀 Features')
    expect(changelog).toContain('add login')
    expect(changelog).toContain('🐛 Bug Fixes')
    expect(changelog).toContain('fix crash')
  })

  it('should include breaking changes section', () => {
    const commits = [
      makeCommit({
        type: 'feat',
        description: 'remove old API',
        breaking: true,
        footers: [{ key: 'BREAKING CHANGE', value: 'The old API is gone.' }],
      }),
    ]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toContain('💥 Breaking Changes')
    expect(changelog).toContain('remove old API')
    expect(changelog).toContain('The old API is gone.')
  })

  it('should include breaking change footer using BREAKING-CHANGE (hyphen variant)', () => {
    const commits = [
      makeCommit({
        type: 'feat',
        description: 'drop legacy format',
        breaking: true,
        footers: [{ key: 'BREAKING-CHANGE', value: 'Legacy format removed.' }],
      }),
    ]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toContain('Legacy format removed.')
  })

  it('should not duplicate breaking commits in their own type section', () => {
    const commits = [
      makeCommit({
        type: 'feat',
        description: 'new API',
        breaking: true,
      }),
    ]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    // Should appear once in Breaking Changes, not again under Features
    const featSectionIdx = changelog.indexOf('🚀 Features')
    expect(featSectionIdx).toBe(-1)
  })

  it('should include scope in commit line', () => {
    const commits = [makeCommit({ type: 'feat', scope: 'auth', description: 'add OAuth' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toContain('**auth:**')
  })

  it('should include commit hash links when repository URL is provided', () => {
    const commits = [makeCommit({ hash: 'abc1234567890' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES, {
      repositoryUrl: 'https://github.com/owner/repo',
    })
    expect(changelog).toContain('[abc1234](https://github.com/owner/repo/commit/abc1234567890)')
  })

  it('should include plain short hash when no repository URL', () => {
    const commits = [makeCommit({ hash: 'abc1234567890' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toContain('(abc1234)')
    expect(changelog).not.toContain('](')
  })

  it('should omit hash when commit has no hash', () => {
    const commits = [makeCommit({ hash: '' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).not.toContain('(')
  })

  it('should return empty string for no commits', () => {
    expect(generateChangelog([], DEFAULT_RULES)).toBe('')
  })

  it('should skip types without a section', () => {
    const commits = [makeCommit({ type: 'unknown', description: 'some unknown type' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    expect(changelog).toBe('')
  })

  it('should include body when enabled', () => {
    const commits = [makeCommit({ type: 'feat', description: 'add feature', body: 'This is a detailed explanation.' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES, { includeBody: true })
    expect(changelog).toContain('detailed explanation')
  })

  it('should not include body when disabled', () => {
    const commits = [makeCommit({ type: 'feat', description: 'add feature', body: 'Detailed body text.' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES, { includeBody: false })
    expect(changelog).not.toContain('Detailed body text.')
  })

  it('should order sections by rule definition order', () => {
    const commits = [makeCommit({ type: 'fix', description: 'fix bug' }), makeCommit({ type: 'feat', description: 'new feature' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    const featIdx = changelog.indexOf('🚀 Features')
    const fixIdx = changelog.indexOf('🐛 Bug Fixes')
    // feat comes before fix in DEFAULT_RULES, so Features section should appear first
    expect(featIdx).toBeLessThan(fixIdx)
  })
})
