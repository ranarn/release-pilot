/**
 * GitHub API operations.
 *
 * Handles creating GitHub Releases via the Octokit client.
 */

import * as github from '@actions/github'

/**
 * Create a GitHub Release for the given tag.
 * Returns the URL of the created release.
 */
export async function createRelease(options: { token: string; tag: string; title: string; body: string; draft: boolean; prerelease: boolean }): Promise<string> {
  const { token, tag, title, body, draft, prerelease } = options
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const response = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name: title,
    body,
    draft,
    prerelease,
    generate_release_notes: false,
  })

  return response.data.html_url
}

/**
 * Check whether a GitHub Release (published or draft) exists for the given tag.
 */
export async function releaseExists(options: { token: string; tag: string }): Promise<boolean> {
  const { token, tag } = options
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  // getReleaseByTag only returns published releases; listing also covers drafts
  for await (const { data } of octokit.paginate.iterator(octokit.rest.repos.listReleases, { owner, repo, per_page: 100 })) {
    if (data.some(release => release.tag_name === tag)) return true
  }
  return false
}
