import { describe, expect, it } from 'vitest'

import { calculateVersion, sanitizeIdentifier, stripPrefix } from '../../src/release/version.js'

describe('calculateVersion', () => {
  it('should handle initial release with no previous tags', () => {
    const result = calculateVersion({
      previousTag: null,
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('0.1.0')
    expect(result.tag).toBe('v0.1.0')
    expect(result.isInitial).toBe(true)
    expect(result.previousTag).toBeNull()
  })

  it('should bump patch version', () => {
    const result = calculateVersion({
      previousTag: 'v1.2.3',
      prefix: 'v',
      bump: 'patch',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('1.2.4')
    expect(result.tag).toBe('v1.2.4')
  })

  it('should bump minor version', () => {
    const result = calculateVersion({
      previousTag: 'v1.2.3',
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('1.3.0')
    expect(result.tag).toBe('v1.3.0')
  })

  it('should bump major version', () => {
    const result = calculateVersion({
      previousTag: 'v1.2.3',
      prefix: 'v',
      bump: 'major',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('2.0.0')
    expect(result.tag).toBe('v2.0.0')
  })

  it('should use default bump when no bump detected', () => {
    const result = calculateVersion({
      previousTag: 'v1.0.0',
      prefix: 'v',
      bump: 'none',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('1.0.1')
    expect(result.bump).toBe('patch')
  })

  it('should skip release when default bump is false and no bump detected', () => {
    const result = calculateVersion({
      previousTag: 'v1.0.0',
      prefix: 'v',
      bump: 'none',
      defaultBump: 'false',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('')
    expect(result.bump).toBe('none')
  })

  it('should return previous version info when skipping release', () => {
    const result = calculateVersion({
      previousTag: 'v2.0.0',
      prefix: 'v',
      bump: 'none',
      defaultBump: 'false',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.previousTag).toBe('v2.0.0')
    expect(result.previousVersion).toBe('2.0.0')
  })

  it('should handle prerelease versions', () => {
    const result = calculateVersion({
      previousTag: 'v1.0.0',
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('1.1.0-beta.0')
    expect(result.tag).toBe('v1.1.0-beta.0')
  })

  it('should create initial prerelease version when no previous tag exists', () => {
    const result = calculateVersion({
      previousTag: null,
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('0.1.0-beta.0')
    expect(result.tag).toBe('v0.1.0-beta.0')
    expect(result.isInitial).toBe(true)
  })

  it('should work with custom prefix', () => {
    const result = calculateVersion({
      previousTag: 'release-1.0.0',
      prefix: 'release-',
      bump: 'patch',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('1.0.1')
    expect(result.tag).toBe('release-1.0.1')
  })

  it('should work with no prefix', () => {
    const result = calculateVersion({
      previousTag: '1.0.0',
      prefix: '',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: false,
      prereleaseSuffix: '',
    })
    expect(result.version).toBe('1.1.0')
    expect(result.tag).toBe('1.1.0')
  })

  it('should throw when previous tag version cannot be parsed', () => {
    expect(() =>
      calculateVersion({
        previousTag: 'v-not-a-version',
        prefix: 'v',
        bump: 'patch',
        defaultBump: 'patch',
        initialVersion: '0.1.0',
        prerelease: false,
        prereleaseSuffix: '',
      })
    ).toThrow('Could not parse previous version')
  })
})

describe('calculateVersion — prerelease increments', () => {
  it('should increment prerelease number when already on same-identifier prerelease', () => {
    const result = calculateVersion({
      previousTag: 'v1.1.0-beta.0',
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('1.1.0-beta.1')
    expect(result.tag).toBe('v1.1.0-beta.1')
  })

  it('should not escalate prerelease on patch bump when already on minor prerelease', () => {
    const result = calculateVersion({
      previousTag: 'v1.1.0-beta.0',
      prefix: 'v',
      bump: 'patch',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('1.1.0-beta.1')
    expect(result.tag).toBe('v1.1.0-beta.1')
  })

  it('should escalate prerelease to major when major bump exceeds current minor prerelease', () => {
    const result = calculateVersion({
      previousTag: 'v1.1.0-beta.0',
      prefix: 'v',
      bump: 'major',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('2.0.0-beta.0')
    expect(result.tag).toBe('v2.0.0-beta.0')
  })

  it('should not escalate on any bump when already on a major prerelease', () => {
    const result = calculateVersion({
      previousTag: 'v2.0.0-beta.0',
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'beta',
    })
    expect(result.version).toBe('2.0.0-beta.1')
    expect(result.tag).toBe('v2.0.0-beta.1')
  })

  it('should use pre-bump when switching to a different prerelease identifier', () => {
    const result = calculateVersion({
      previousTag: 'v1.1.0-beta.0',
      prefix: 'v',
      bump: 'minor',
      defaultBump: 'patch',
      initialVersion: '0.1.0',
      prerelease: true,
      prereleaseSuffix: 'rc',
    })
    expect(result.version).toBe('1.2.0-rc.0')
    expect(result.tag).toBe('v1.2.0-rc.0')
  })
})

describe('stripPrefix', () => {
  it('should strip v prefix', () => {
    expect(stripPrefix('v1.2.3', 'v')).toBe('1.2.3')
  })

  it('should handle no prefix', () => {
    expect(stripPrefix('1.2.3', '')).toBe('1.2.3')
  })

  it('should handle custom prefix', () => {
    expect(stripPrefix('release-1.0.0', 'release-')).toBe('1.0.0')
  })

  it('should return original if prefix not found', () => {
    expect(stripPrefix('1.0.0', 'v')).toBe('1.0.0')
  })
})

describe('sanitizeIdentifier', () => {
  it('should replace special characters', () => {
    expect(sanitizeIdentifier('feature/my-branch')).toBe('feature-my-branch')
  })

  it('should collapse multiple hyphens', () => {
    expect(sanitizeIdentifier('a//b--c')).toBe('a-b-c')
  })

  it('should keep alphanumeric and hyphens', () => {
    expect(sanitizeIdentifier('beta-1')).toBe('beta-1')
  })
})
