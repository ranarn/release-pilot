import type { TagInfo } from '../../src/core/types.js'

import { describe, expect, it } from 'vitest'

import { findLatestTag, findPreviousTag } from '../../src/release/tags.js'

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
