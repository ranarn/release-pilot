import { describe, expect, it } from 'vitest'

import { formatReleaseTitle } from '../../src/release/title.js'

describe('formatReleaseTitle', () => {
  const values = { version: '1.2.3', tag: 'v1.2.3' }

  it('should replace {{tag}}', () => {
    expect(formatReleaseTitle('Release {{tag}}', values)).toBe('Release v1.2.3')
  })

  it('should replace {{version}}', () => {
    expect(formatReleaseTitle('Version {{version}}', values)).toBe('Version 1.2.3')
  })

  it('should replace every occurrence of each placeholder', () => {
    expect(formatReleaseTitle('{{version}} ({{tag}}) — {{version}} / {{tag}}', values)).toBe('1.2.3 (v1.2.3) — 1.2.3 / v1.2.3')
  })

  it('should leave a template without placeholders unchanged', () => {
    expect(formatReleaseTitle('Nightly', values)).toBe('Nightly')
  })
})
