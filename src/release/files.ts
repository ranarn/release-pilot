/**
 * Release asset selection.
 */

import * as path from 'node:path'

/**
 * Split the release-files input into include and exclude (`!`) glob patterns.
 * Blank lines and `#` comments are ignored.
 */
export function parseReleaseFiles(input: string): { include: string[]; exclude: string[] } {
  const include: string[] = []
  const exclude: string[] = []

  for (const line of input.split(/\r?\n/)) {
    const pattern = line.trim()
    if (!pattern || pattern.startsWith('#')) continue
    if (pattern.startsWith('!')) exclude.push(pattern)
    else include.push(pattern)
  }

  return { include, exclude }
}

/**
 * Flatten the files matched per include pattern into the list to upload.
 * Throws when a pattern matched nothing or two different files share a basename,
 * since release assets are named by basename.
 */
export function selectReleaseFiles(matches: { pattern: string; files: string[] }[]): string[] {
  const byName = new Map<string, string>()

  for (const { pattern, files } of matches) {
    if (files.length === 0) {
      throw new Error(`release-files pattern "${pattern}" matched no files.`)
    }

    for (const file of files) {
      const name = path.basename(file)
      const existing = byName.get(name)
      if (existing !== undefined && existing !== file) {
        throw new Error(`release-files matched two files named "${name}" (${existing} and ${file}); release assets need unique names.`)
      }
      byName.set(name, file)
    }
  }

  return [...byName.values()]
}
