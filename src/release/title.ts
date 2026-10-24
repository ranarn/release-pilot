/**
 * Release title templating.
 */

/**
 * Render a release title template, replacing every {{version}} and {{tag}} placeholder.
 */
export function formatReleaseTitle(template: string, values: { version: string; tag: string }): string {
  return template.replaceAll('{{version}}', values.version).replaceAll('{{tag}}', values.tag)
}
