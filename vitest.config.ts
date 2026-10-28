import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so that tests run without the PWA and Ling Library plugins.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
