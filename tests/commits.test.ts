import { describe, expect, it } from 'vitest'

import { isSkipCi, parseCommit, parseCommits } from '../src/commits.js'

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
    const message = `feat: refactor user model

BREAKING CHANGE: The user model has been completely restructured.`
    const result = parseCommit(message, 'jkl012')
    expect(result?.breaking).toBe(true)
    expect(result?.footers).toHaveLength(1)
    expect(result?.footers[0]?.key).toBe('BREAKING CHANGE')
  })

  it('should detect breaking change via BREAKING-CHANGE footer', () => {
    const message = `feat: refactor user model

BREAKING-CHANGE: The user model has been completely restructured.`
    const result = parseCommit(message, 'mno345')
    expect(result?.breaking).toBe(true)
  })

  it('should parse commit body', () => {
    const message = `fix: resolve memory leak

The connection pool was not being properly closed
when the application shut down.`
    const result = parseCommit(message, 'pqr678')
    expect(result?.body).toContain('connection pool')
  })

  it('should parse multiple footers', () => {
    const message = `feat: add login

Reviewed-by: Alice
Closes: #123`
    const result = parseCommit(message, 'stu901')
    expect(result?.footers).toHaveLength(2)
    expect(result?.footers[0]?.key).toBe('Reviewed-by')
    expect(result?.footers[1]?.key).toBe('Closes')
  })

  it('should handle squash merge format', () => {
    const result = parseCommit('feat: add new feature (#42)', 'vwx234')
    expect(result?.type).toBe('feat')
    expect(result?.description).toBe('add new feature')
  })

  it('should return null for non-conventional commit', () => {
    expect(parseCommit('just a regular commit', 'abc')).toBeNull()
    expect(parseCommit('Update README.md', 'def')).toBeNull()
    expect(parseCommit('Merge pull request #123', 'ghi')).toBeNull()
  })

  it('should normalize type to lowercase', () => {
    const result = parseCommit('FEAT: uppercase type', 'abc')
    expect(result?.type).toBe('feat')
  })
})

describe('parseCommits', () => {
  it('should filter out non-conventional commits', () => {
    const commits = [
      { message: 'feat: feature one', hash: 'a' },
      { message: 'just a message', hash: 'b' },
      { message: 'fix: bug fix', hash: 'c' },
      { message: 'Merge branch main', hash: 'd' },
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
