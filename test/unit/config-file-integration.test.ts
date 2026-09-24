import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { extractFlagUsage, validateFeatureFlags } from '../../src/build'

vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warn: vi.fn() },
}))

let projectDir: string | undefined

function createProject(files: Record<string, string>) {
  projectDir = mkdtempSync(join(tmpdir(), 'nuxt-feature-flags-'))
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(projectDir, path)), { recursive: true })
    writeFileSync(join(projectDir, path), content)
  }
  return projectDir
}

afterEach(() => {
  if (projectDir) rmSync(projectDir, { recursive: true, force: true })
  projectDir = undefined
})

describe('extractFlagUsage', () => {
  it('finds flags used through the helpers and the directive', () => {
    const source = `
      <div v-feature="'fromDirective'" />
      <div v-feature='"directive:variant"' />
      <div v-if="isEnabled('inTemplate') && ready" />
      <script setup>
        isEnabled("doubleQuoted")
        getValue(\`templateLiteral\`)
        getVariant('variantLookup')
        isEnabled(dynamicName)
      </script>
    `
    expect(extractFlagUsage(source).sort()).toEqual([
      'directive:variant',
      'doubleQuoted',
      'fromDirective',
      'inTemplate',
      'templateLiteral',
      'variantLookup',
    ])
  })
})

describe('validateFeatureFlags', () => {
  it('passes for a valid config whose flags are all declared', async () => {
    const cwd = createProject({
      'feature-flags.config.ts': `export default { newDashboard: true, exp: { enabled: true, variants: [{ name: 'a', weight: 50 }, { name: 'b', weight: 50 }] } }`,
      'pages/index.vue': `<template><div v-if="isEnabled('newDashboard')" v-feature="'exp:a'" /></template>`,
    })

    expect(await validateFeatureFlags({ cwd })).toEqual([])
  })

  it('reads the flags declared by a function config through `#feature-flags/handler`', async () => {
    const cwd = createProject({
      'feature-flags.config.ts': [
        `import { defineFeatureFlags } from '#feature-flags/handler'`,
        `export default defineFeatureFlags(async context => ({ isAdmin: context.user?.role === 'admin' }))`,
      ].join('\n'),
      'app.vue': `<template><p v-if="isEnabled('isAdmin')" /></template>`,
    })

    expect(await validateFeatureFlags({ cwd })).toEqual([])
  })

  it('reports undeclared flags, invalid definitions and counts inline flags as declared', async () => {
    const cwd = createProject({
      'feature-flags.config.ts': `export default { exp: { enabled: true, variants: [{ name: 'a', weight: 80 }, { name: 'b', weight: 80 }] } }`,
      'app.vue': `<template><p v-if="isEnabled('typo')" /><p v-if="isEnabled('inline')" /></template>`,
    })

    const errors = await validateFeatureFlags({ cwd, flags: { inline: true } })

    expect(errors).toEqual([
      expect.objectContaining({ flag: 'exp', error: expect.stringContaining('exceed 100%') }),
      expect.objectContaining({ flag: 'typo', error: expect.stringContaining('not declared') }),
    ])
  })

  it('reports a missing or broken config file', async () => {
    const cwd = createProject({ 'broken.config.ts': `export default 42` })

    expect(await validateFeatureFlags({ cwd, configPath: 'missing.config.ts' })).toEqual([
      expect.objectContaining({ flag: 'config', error: expect.stringContaining('not found') }),
    ])
    expect(await validateFeatureFlags({ cwd, configPath: 'broken.config.ts' })).toEqual([
      expect.objectContaining({ flag: 'config', error: expect.stringContaining('default export') }),
    ])
  })

  it('throws with failOnErrors, for CI', async () => {
    const cwd = createProject({
      'feature-flags.config.ts': `export default {}`,
      'app.vue': `<template><p v-if="isEnabled('undeclared')" /></template>`,
    })

    await expect(validateFeatureFlags({ cwd, failOnErrors: true })).rejects.toThrow('1 error')
  })
})
