import type { ConventionalCommit } from '../../src/core/types.js'

import { describe, expect, it } from 'vitest'

import { DEFAULT_RULES, determineBump, mergeRules, parseCustomRules } from '../../src/release/rules.js'

function makeCommit(overrides: Partial<ConventionalCommit> = {}): ConventionalCommit {
  return {
    raw: '',
    type: 'chore',
    scope: null,
    breaking: false,
    description: 'test',
    body: null,
    footers: [],
    hash: 'abc',
    ...overrides,
  }
}

describe('determineBump', () => {
  const rules = mergeRules([])

  it('should return major for breaking changes', () => {
    const commits = [makeCommit({ type: 'feat', breaking: true })]
    expect(determineBump(commits, rules)).toBe('major')
  })

  it('should return minor for feat commits', () => {
    const commits = [makeCommit({ type: 'feat' })]
    expect(determineBump(commits, rules)).toBe('minor')
  })

  it('should return patch for fix commits', () => {
    const commits = [makeCommit({ type: 'fix' })]
    expect(determineBump(commits, rules)).toBe('patch')
  })

  it('should return the highest bump across commits', () => {
    const commits = [makeCommit({ type: 'fix' }), makeCommit({ type: 'feat' }), makeCommit({ type: 'chore' })]
    expect(determineBump(commits, rules)).toBe('minor')
  })

  it('should return major if any commit is breaking', () => {
    const commits = [makeCommit({ type: 'fix' }), makeCommit({ type: 'feat', breaking: true })]
    expect(determineBump(commits, rules)).toBe('major')
  })

  it('should return none for chore-only commits', () => {
    const commits = [makeCommit({ type: 'chore' }), makeCommit({ type: 'docs' })]
    expect(determineBump(commits, rules)).toBe('none')
  })

  it('should return none for empty commits', () => {
    expect(determineBump([], rules)).toBe('none')
  })

  it('should return patch for perf commits', () => {
    const commits = [makeCommit({ type: 'perf' })]
    expect(determineBump(commits, rules)).toBe('patch')
  })

  it('should return none for unknown commit type not in rules', () => {
    const commits = [makeCommit({ type: 'unknown' })]
    expect(determineBump(commits, rules)).toBe('none')
  })
})

describe('parseCustomRules', () => {
  it('should parse valid custom rules', () => {
    const rules = parseCustomRules('hotfix:patch:Bug Fixes,improvement:minor:Improvements')
    expect(rules).toHaveLength(2)
    expect(rules[0]).toEqual({
      type: 'hotfix',
      bump: 'patch',
      section: 'Bug Fixes',
    })
    expect(rules[1]).toEqual({
      type: 'improvement',
      bump: 'minor',
      section: 'Improvements',
    })
  })

  it('should handle rules without section', () => {
    const rules = parseCustomRules('hotfix:patch')
    expect(rules[0]?.section).toBe('Hotfix')
  })

  it('should throw on invalid bump type', () => {
    expect(() => parseCustomRules('test:invalid')).toThrow('Invalid bump type')
  })

  it('should throw on malformed rule missing bump', () => {
    expect(() => parseCustomRules('hotfix')).toThrow('Invalid custom rule')
  })

  it('should return empty array for empty input', () => {
    expect(parseCustomRules('')).toHaveLength(0)
    expect(parseCustomRules('  ')).toHaveLength(0)
  })

  it('should lowercase the type', () => {
    const rules = parseCustomRules('HotFix:patch:Fixes')
    expect(rules[0]?.type).toBe('hotfix')
  })
})

describe('mergeRules', () => {
  it('should override default rules with custom ones', () => {
    const custom = parseCustomRules('fix:minor:Fixes')
    const merged = mergeRules(custom)
    const fixRule = merged.find(r => r.type === 'fix')
    expect(fixRule?.bump).toBe('minor')
    expect(fixRule?.section).toBe('Fixes')
  })

  it('should add new types from custom rules', () => {
    const custom = parseCustomRules('hotfix:patch:Hotfixes')
    const merged = mergeRules(custom)
    const hotfixRule = merged.find(r => r.type === 'hotfix')
    expect(hotfixRule).toBeDefined()
  })

  it('should return all defaults when no custom rules provided', () => {
    const merged = mergeRules([])
    expect(merged).toHaveLength(DEFAULT_RULES.length)
    expect(merged.find(r => r.type === 'feat')?.bump).toBe('minor')
    expect(merged.find(r => r.type === 'fix')?.bump).toBe('patch')
  })

  it('should preserve default rules not overridden', () => {
    const custom = parseCustomRules('feat:major:Big Features')
    const merged = mergeRules(custom)
    // fix should still have its default
    expect(merged.find(r => r.type === 'fix')?.bump).toBe('patch')
  })
})
