import { describe, expect, it } from 'vitest'

import { parseReleaseFiles, selectReleaseFiles } from '../../src/release/files.js'

describe('parseReleaseFiles', () => {
  it('should return no patterns for empty input', () => {
    expect(parseReleaseFiles('')).toEqual({ include: [], exclude: [] })
  })

  it('should split lines and trim whitespace', () => {
    expect(parseReleaseFiles('  dist/*.zip \n\n build/app.exe\r\n')).toEqual({ include: ['dist/*.zip', 'build/app.exe'], exclude: [] })
  })

  it('should separate ! patterns into exclude', () => {
    expect(parseReleaseFiles('dist/*\n!dist/*.map')).toEqual({ include: ['dist/*'], exclude: ['!dist/*.map'] })
  })

  it('should ignore # comments', () => {
    expect(parseReleaseFiles('# installers\ndist/*.exe')).toEqual({ include: ['dist/*.exe'], exclude: [] })
  })
})

describe('selectReleaseFiles', () => {
  it('should flatten the matched files', () => {
    const matches = [
      { pattern: 'dist/*.zip', files: ['/w/dist/a.zip', '/w/dist/b.zip'] },
      { pattern: 'app.exe', files: ['/w/app.exe'] },
    ]
    expect(selectReleaseFiles(matches)).toEqual(['/w/dist/a.zip', '/w/dist/b.zip', '/w/app.exe'])
  })

  it('should list a file matched by two patterns once', () => {
    const matches = [
      { pattern: 'dist/*', files: ['/w/dist/a.zip'] },
      { pattern: 'dist/*.zip', files: ['/w/dist/a.zip'] },
    ]
    expect(selectReleaseFiles(matches)).toEqual(['/w/dist/a.zip'])
  })

  it('should throw when a pattern matched nothing', () => {
    expect(() => selectReleaseFiles([{ pattern: 'dist/*.exe', files: [] }])).toThrow('release-files pattern "dist/*.exe" matched no files.')
  })

  it('should throw when two different files share a basename', () => {
    const matches = [{ pattern: '**/app.zip', files: ['/w/a/app.zip', '/w/b/app.zip'] }]
    expect(() => selectReleaseFiles(matches)).toThrow('two files named "app.zip"')
  })

  it('should return nothing for no patterns', () => {
    expect(selectReleaseFiles([])).toEqual([])
  })
})
