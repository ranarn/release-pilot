/**
 * GitHub API operations.
 *
 * Handles creating, publishing and uploading assets to GitHub Releases via the Octokit client.
 */

import type { ReleaseInfo } from '../core/types.js'

import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as github from '@actions/github'

/**
 * Create a GitHub Release for the given tag.
 */
export async function createRelease(options: { token: string; tag: string; title: string; body: string; draft: boolean; prerelease: boolean }): Promise<ReleaseInfo> {
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

  return { id: response.data.id, draft: response.data.draft, htmlUrl: response.data.html_url, uploadUrl: response.data.upload_url }
}

/**
 * Find the GitHub Release (published or draft) for the given tag.
 */
export async function findRelease(options: { token: string; tag: string }): Promise<ReleaseInfo | null> {
  const { token, tag } = options
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  // getReleaseByTag only returns published releases; listing also covers drafts
  for await (const { data } of octokit.paginate.iterator(octokit.rest.repos.listReleases, { owner, repo, per_page: 100 })) {
    const release = data.find(r => r.tag_name === tag)
    if (release) return { id: release.id, draft: release.draft, htmlUrl: release.html_url, uploadUrl: release.upload_url }
  }
  return null
}

/**
 * Upload files as release assets. With `replace`, an existing asset with the same name is deleted first.
 * Returns the download URLs of the uploaded assets.
 */
export async function uploadReleaseAssets(options: { token: string; release: ReleaseInfo; files: string[]; replace: boolean }): Promise<string[]> {
  const { token, release, files, replace } = options
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const existing = replace ? await octokit.paginate(octokit.rest.repos.listReleaseAssets, { owner, repo, release_id: release.id, per_page: 100 }) : []

  const urls: string[] = []
  for (const file of files) {
    const name = path.basename(file)

    const previous = existing.find(asset => asset.name === name)
    if (previous) {
      await octokit.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: previous.id })
    }

    const data = await readFile(file)
    // Upload through the release's own upload_url: the generated uploadReleaseAsset endpoint
    // hardcodes uploads.github.com, which breaks on GitHub Enterprise Server.
    const response = await octokit.request({
      method: 'POST',
      url: release.uploadUrl,
      name,
      data,
      headers: { 'content-type': 'application/octet-stream', 'content-length': data.length },
    })
    urls.push((response.data as { browser_download_url: string }).browser_download_url)
  }
  return urls
}

/**
 * Publish a draft release. Returns the URL of the published release.
 */
export async function publishRelease(options: { token: string; release: ReleaseInfo }): Promise<string> {
  const { token, release } = options
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo

  const response = await octokit.rest.repos.updateRelease({ owner, repo, release_id: release.id, draft: false })
  return response.data.html_url
}
