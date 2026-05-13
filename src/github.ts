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
