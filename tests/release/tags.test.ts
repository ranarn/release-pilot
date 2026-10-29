import type { TagInfo } from '../../src/core/types.js'

import { describe, expect, it } from 'vitest'

import { findLatestTag, findPreviousTag, findTagOnCommit } from '../../src/release/tags.js'

function tag(version: string): TagInfo {
  return { name: `v${version}`, version, sha: `sha-${version}` }
}

describe('findLatestTag', () => {
  it('should return the highest semver tag regardless of input order', () => {
    expect(findLatestTag([tag('1.2.0'), tag('1.10.0'), tag('1.9.3')])?.name).toBe('v1.10.0')
  })

  it('should ignore non-semver tags such as floating major tags', () => {
    expect(findLatestTag([tag('1'), tag('1.0'), tag('1.0.3')])?.name).toBe('v1.0.3')
  })

  it('should rank a release above its prereleases', () => {
    expect(findLatestTag([tag('2.0.0-beta.3'), tag('2.0.0')])?.name).toBe('v2.0.0')
  })

  it('should return null when there are no semver tags', () => {
    expect(findLatestTag([tag('1'), tag('latest')])).toBeNull()
  })
})

describe('findPreviousTag', () => {
  const tags = [tag('1'), tag('1.0.0'), tag('1.1.0-beta.0'), tag('1.1.0'), tag('1.2.0')]

  it('should return the highest tag below the current one', () => {
    expect(findPreviousTag(tags, tag('1.2.0'))?.name).toBe('v1.1.0')
  })

  it('should treat a prerelease of the same version as previous', () => {
    expect(findPreviousTag(tags, tag('1.1.0'))?.name).toBe('v1.1.0-beta.0')
  })

  it('should return null for the first tag', () => {
    expect(findPreviousTag(tags, tag('1.0.0'))).toBeNull()
  })
})

describe('findTagOnCommit', () => {
  const onCommit = (version: string, sha: string): TagInfo => ({ name: `v${version}`, version, sha })
  const head = 'a'.repeat(40)
  const other = 'b'.repeat(40)

  it('should return the semver tag on the commit', () => {
    expect(findTagOnCommit([onCommit('1.1.0', other), onCommit('1.2.0', head)], head)?.name).toBe('v1.2.0')
  })

  it('should return the highest of several semver tags on the commit', () => {
    expect(findTagOnCommit([onCommit('1.2.0-rc.1', head), onCommit('1.2.0', head)], head)?.name).toBe('v1.2.0')
  })

  it('should ignore floating and other non-semver tags on the commit', () => {
    expect(findTagOnCommit([onCommit('1', head), onCommit('1.2', head)], head)).toBeNull()
  })

  it('should return null when no tag points at the commit', () => {
    expect(findTagOnCommit([onCommit('1.2.0', other)], head)).toBeNull()
  })

  it('should compare SHAs case-insensitively', () => {
    expect(findTagOnCommit([onCommit('1.2.0', head)], head.toUpperCase())?.name).toBe('v1.2.0')
  })
})
