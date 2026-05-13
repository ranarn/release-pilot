/**
 * Entry point for the Release Pilot GitHub Action.
 */

import * as core from '@actions/core'

import { run } from './action.js'

try {
  await run()
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(`Release Pilot failed: ${error.message}`)
    core.debug(error.stack ?? '')
  } else {
    core.setFailed(`Release Pilot failed: ${String(error)}`)
  }
}
