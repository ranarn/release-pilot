import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',            // entry point only
        'src/core/action.ts',     // orchestration — calls external APIs
        'src/git/**',             // git/GitHub I/O
        'src/release/summary.ts', // @actions/core I/O
      ],
    },
  },
});
