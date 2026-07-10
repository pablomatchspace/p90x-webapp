import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // Pure-logic suites run in node; DOM/localStorage suites opt into jsdom
    // per file via `// @vitest-environment jsdom` (env spin-up is expensive).
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // The sync Worker (E10) is exercised against a fake KV in this same suite, so
    // the `validate` job covers it without pulling in a second toolchain.
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/state/**'],
    },
  },
})
