import { defineConfig } from 'vitest/config';

// Deliberately a plain node environment: the only web code with logic worth
// testing right now is the API client, which is DOM-free. jsdom and Testing
// Library get added when there is real UI to render.
export default defineConfig({
  test: {
    name: 'web',
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
