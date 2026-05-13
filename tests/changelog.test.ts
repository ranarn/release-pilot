import type { ConventionalCommit } from '../src/types.js'

import { describe, expect, it } from 'vitest'

import { generateChangelog } from '../src/changelog.js'
import { DEFAULT_RULES } from '../src/rules.js'

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

  it('should include scope in commit line', () => {
    const commits = [
      makeCommit({
        type: 'feat',
        scope: 'auth',
        description: 'add OAuth',
      }),
    ]
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

  it('should return empty string for no commits', () => {
    expect(generateChangelog([], DEFAULT_RULES)).toBe('')
  })

  it('should skip types without a section', () => {
    const commits = [makeCommit({ type: 'unknown', description: 'some unknown type' })]
    const changelog = generateChangelog(commits, DEFAULT_RULES)
    // unknown type has no section in default rules, so no content
    expect(changelog).toBe('')
  })

  it('should include body when enabled', () => {
    const commits = [
      makeCommit({
        type: 'feat',
        description: 'add feature',
        body: 'This is a detailed explanation.',
      }),
    ]
    const changelog = generateChangelog(commits, DEFAULT_RULES, {
      includeBody: true,
    })
    expect(changelog).toContain('detailed explanation')
  })
})
