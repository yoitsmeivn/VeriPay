import { defineConfig } from 'vitest/config';

// Vitest 4 removed `defineWorkspace` / vitest.workspace.ts in favour of
// `test.projects`. Projects are listed explicitly rather than globbed because
// packages/config is tooling-only and has no test project of its own.
export default defineConfig({
  test: {
    projects: ['./packages/shared', './packages/database', './apps/api', './apps/web'],
  },
});
