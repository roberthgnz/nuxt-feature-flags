import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    // e2e tests build a real Nuxt app first.
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
    },
  },
  resolve: {
    alias: {
      '#imports': resolve(__dirname, 'test/mocks/nuxt.ts'),
      '#feature-flags/types': resolve(__dirname, 'test/mocks/types.ts'),
      '#feature-flags/config': resolve(__dirname, 'test/mocks/config.ts'),
      '#feature-flags/handler': resolve(__dirname, 'src/runtime/server/handlers/feature-flags.ts'),
    },
  },
})
