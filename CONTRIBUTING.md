# Contributing to Release Pilot

Thank you for your interest in contributing! 🎉

## Development Setup

```bash
pnpm install         # Install dependencies
pnpm test            # Run tests (Vitest)
pnpm typecheck       # TypeScript type checking
pnpm build           # Bundle for distribution (esbuild)
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Write your code following existing patterns
3. Add tests for new functionality
4. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
5. Ensure all checks pass:
   ```bash
   pnpm typecheck && pnpm test
   ```
6. **Push your branch** — GitHub Actions will automatically run `pnpm build` and commit the updated `dist/` directory for you.
7. Open a PR against `main`

## Commit Message Format

This project uses Conventional Commits. Examples:

```
feat: add monorepo support
fix: handle tags with no prefix
docs: update input descriptions
test: add edge case for prerelease versions
```

## Code Style

- TypeScript with strict mode
- ESM only (`import`/`export`, no `require`)
- Explicit `.js` extensions in imports
