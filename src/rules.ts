/**
 * Release rules — mapping conventional commit types to SemVer bumps.
 *
 * Follows the Conventional Commits specification and common extensions.
 */

import type { BumpType, ConventionalCommit, ReleaseRule } from './types.js';

/** Default release rules following conventional commit best practices. */
export const DEFAULT_RULES: ReleaseRule[] = [
  { type: 'feat', bump: 'minor', section: '🚀 Features' },
  { type: 'fix', bump: 'patch', section: '🐛 Bug Fixes' },
  { type: 'perf', bump: 'patch', section: '⚡ Performance' },
  { type: 'revert', bump: 'patch', section: '⏪ Reverts' },
  { type: 'docs', bump: 'none', section: '📚 Documentation' },
  { type: 'style', bump: 'none', section: '💄 Styling' },
  { type: 'refactor', bump: 'none', section: '♻️ Refactoring' },
  { type: 'test', bump: 'none', section: '✅ Tests' },
  { type: 'build', bump: 'none', section: '📦 Build' },
  { type: 'ci', bump: 'none', section: '🔧 CI/CD' },
  { type: 'chore', bump: 'none', section: '🧹 Chores' },
];

/**
 * Parse custom release rules from the action input string.
 *
 * Format: "type:bump[:section],type:bump[:section]"
 * Example: "hotfix:patch:Bug Fixes,improvement:minor:Improvements"
 */
export function parseCustomRules(input: string): ReleaseRule[] {
  if (!input.trim()) return [];

  return input
    .split(',')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [type, bump, section] = rule.split(':');
      if (!type || !bump) {
        throw new Error(
          `Invalid custom rule "${rule}". Expected format: "type:bump[:section]"`,
        );
      }

      const validBumps: BumpType[] = ['major', 'minor', 'patch', 'none'];
      if (!validBumps.includes(bump as BumpType)) {
        throw new Error(
          `Invalid bump type "${bump}" in rule "${rule}". Must be one of: ${validBumps.join(', ')}`,
        );
      }

      return {
        type: type.toLowerCase(),
        bump: bump as BumpType,
        section: section || type.charAt(0).toUpperCase() + type.slice(1),
      };
    });
}

/**
 * Merge custom rules with defaults. Custom rules override defaults for the same type.
 */
export function mergeRules(customRules: ReleaseRule[]): ReleaseRule[] {
  const ruleMap = new Map<string, ReleaseRule>();

  // Add defaults first
  for (const rule of DEFAULT_RULES) {
    ruleMap.set(rule.type, rule);
  }

  // Override with custom rules
  for (const rule of customRules) {
    ruleMap.set(rule.type, rule);
  }

  return Array.from(ruleMap.values());
}

/**
 * Determine the highest bump type from a list of parsed commits.
 *
 * Priority: major > minor > patch > none
 *
 * Breaking changes always result in a major bump (or minor if in 0.x.y range,
 * following SemVer conventions for initial development).
 */
export function determineBump(
  commits: ConventionalCommit[],
  rules: ReleaseRule[],
): BumpType {
  const ruleMap = new Map<string, ReleaseRule>();
  for (const rule of rules) {
    ruleMap.set(rule.type, rule);
  }

  let highest: BumpType = 'none';

  for (const commit of commits) {
    // Breaking changes always trigger major
    if (commit.breaking) {
      return 'major';
    }

    const rule = ruleMap.get(commit.type);
    if (rule) {
      highest = higherBump(highest, rule.bump);
    }
  }

  return highest;
}

/** Compare two bump types and return the higher priority one. */
function higherBump(a: BumpType, b: BumpType): BumpType {
  const priority: Record<BumpType, number> = {
    none: 0,
    patch: 1,
    minor: 2,
    major: 3,
  };

  return priority[a] >= priority[b] ? a : b;
}
