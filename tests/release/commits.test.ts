import { describe, expect, it } from 'vitest'

import { isSkipCi, parseCommit, parseCommits } from '../../src/release/commits.js'

describe('parseCommit', () => {
  it('should parse a simple feat commit', () => {
    const result = parseCommit('feat: add new feature', 'abc123')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('feat')
    expect(result?.scope).toBeNull()
    expect(result?.breaking).toBe(false)
    expect(result?.description).toBe('add new feature')
    expect(result?.hash).toBe('abc123')
  })

  it('should parse a commit with scope', () => {
    const result = parseCommit('fix(auth): resolve login issue', 'def456')
    expect(result?.type).toBe('fix')
    expect(result?.scope).toBe('auth')
    expect(result?.description).toBe('resolve login issue')
  })

  it('should detect breaking change via ! mark', () => {
    const result = parseCommit('feat!: remove deprecated API', 'ghi789')
    expect(result?.breaking).toBe(true)
    expect(result?.type).toBe('feat')
  })

  it('should detect breaking change via ! mark with scope', () => {
    const result = parseCommit('feat(api)!: remove deprecated endpoints', 'x1')
    expect(result?.breaking).toBe(true)
    expect(result?.scope).toBe('api')
  })

  it('should detect breaking change via BREAKING CHANGE footer', () => {
    const msg = 'feat: new auth\n\nBREAKING CHANGE: old tokens no longer work'
    const result = parseCommit(msg, 'x2')
    expect(result?.breaking).toBe(true)
    expect(result?.footers).toHaveLength(1)
    expect(result?.footers[0]?.key).toBe('BREAKING CHANGE')
    expect(result?.footers[0]?.value).toBe('old tokens no longer work')
  })

  it('should detect breaking change via BREAKING-CHANGE footer (hyphen variant)', () => {
    const msg = 'feat: new auth\n\nBREAKING-CHANGE: old tokens no longer work'
    const result = parseCommit(msg, 'x3')
    expect(result?.breaking).toBe(true)
  })

  it('should parse commit body', () => {
    const msg = 'fix: resolve timeout\n\nThis fixes the 30s timeout issue\nthat occurred under load.'
    const result = parseCommit(msg)
    expect(result?.body).toBe('This fixes the 30s timeout issue\nthat occurred under load.')
  })

  it('should parse Closes footer using # separator', () => {
    const msg = 'fix: handle null input\n\nCloses #42'
    const result = parseCommit(msg)
    expect(result?.footers[0]?.key).toBe('Closes')
    expect(result?.footers[0]?.value).toBe('#42')
  })

  it('should handle multi-line footer values', () => {
    const msg = 'feat: new feature\n\nBREAKING CHANGE: first line\ncontinuation line'
    const result = parseCommit(msg)
    expect(result?.footers[0]?.value).toBe('first line\ncontinuation line')
  })

  it('should not parse footer-like lines in body without blank-line separator', () => {
    const msg = 'feat: new feature\n\nThis body mentions Closes #42 inline\nand Reviewed-by: someone as prose.\nNo blank line before these lines.'
    const result = parseCommit(msg)
    expect(result?.footers).toHaveLength(0)
    expect(result?.body).toContain('Closes #42')
  })

  it('should parse footer after blank line when body is present', () => {
    const msg = 'fix: resolve issue\n\nThis fixes a real problem.\n\nCloses #99'
    const result = parseCommit(msg)
    expect(result?.footers).toHaveLength(1)
    expect(result?.footers[0]?.key).toBe('Closes')
    expect(result?.footers[0]?.value).toBe('#99')
    expect(result?.body).toBe('This fixes a real problem.')
  })

  it('should strip squash merge PR number from header', () => {
    const result = parseCommit('feat: add login (#42)')
    expect(result?.description).toBe('add login')
  })

  it('should normalise type to lowercase', () => {
    const result = parseCommit('FIX: something')
    expect(result?.type).toBe('fix')
  })

  it('should return null for non-conventional commit', () => {
    expect(parseCommit('just a plain message')).toBeNull()
    expect(parseCommit('')).toBeNull()
  })

  it('should default hash to empty string when not provided', () => {
    const result = parseCommit('feat: something')
    expect(result?.hash).toBe('')
  })
})

describe('parseCommits', () => {
  it('should parse multiple commits and skip non-conventional ones', () => {
    const commits = [
      { message: 'feat: new feature', hash: 'a' },
      { message: 'not conventional', hash: 'b' },
      { message: 'fix: fix bug', hash: 'c' },
    ]
    const result = parseCommits(commits)
    expect(result).toHaveLength(2)
    expect(result[0]?.type).toBe('feat')
    expect(result[1]?.type).toBe('fix')
  })

  it('should return empty array for no conventional commits', () => {
    const commits = [
      { message: 'random message', hash: 'a' },
      { message: 'another one', hash: 'b' },
    ]
    expect(parseCommits(commits)).toHaveLength(0)
  })
})

describe('isSkipCi', () => {
  it('should return true for [skip ci]', () => {
    expect(isSkipCi('build: auto-update dist/ [skip ci]')).toBe(true)
  })

  it('should return true for [Skip CI] (case-insensitive)', () => {
    expect(isSkipCi('chore: update deps [Skip CI]')).toBe(true)
  })

  it('should return true for [skip_ci] and [skip-ci] variants', () => {
    expect(isSkipCi('fix: something [skip_ci]')).toBe(true)
    expect(isSkipCi('fix: something [skip-ci]')).toBe(true)
  })

  it('should return false for normal commit messages', () => {
    expect(isSkipCi('feat: add new feature')).toBe(false)
    expect(isSkipCi('fix: resolve issue')).toBe(false)
  })

  it('should return false for messages that mention skip ci without brackets', () => {
    expect(isSkipCi('chore: skip ci check')).toBe(false)
  })
})
