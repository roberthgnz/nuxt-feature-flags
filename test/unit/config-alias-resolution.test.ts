import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect, afterEach } from 'vitest'
import { createJiti } from 'jiti'

/**
 * Regression test for https://github.com/roberthgnz/nuxt-feature-flags/issues/34
 *
 * `loadConfigFlags()` in `src/module.ts` builds its own jiti instance to read the
 * user's `feature-flags.config.ts` file at setup time. That instance must merge in
 * `nuxt.options.alias` (which carries the project's `~` / `@` / tsconfig-path aliases)
 * or any config file that imports another local module the normal Nuxt way fails
 * to resolve, and the module silently falls back to inline-only flags.
 */
describe('config file alias resolution (issue #34)', () => {
  let projectDir: string

  afterEach(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true })
  })

  function createProjectWithAliasedConfig() {
    projectDir = mkdtempSync(join(tmpdir(), 'nuxt-feature-flags-alias-'))
    mkdirSync(join(projectDir, 'server', 'utils'), { recursive: true })

    writeFileSync(
      join(projectDir, 'server', 'utils', 'my-overrides.ts'),
      'export function readOverrides() { return { fromAliasedImport: true } }\n',
    )

    writeFileSync(
      join(projectDir, 'feature-flags.config.ts'),
      [
        'import { readOverrides } from \'~/server/utils/my-overrides\'',
        'export default { flags: readOverrides() }',
        '',
      ].join('\n'),
    )

    return {
      rootDir: projectDir,
      configFile: join(projectDir, 'feature-flags.config.ts'),
      // Mirrors what Nuxt populates nuxt.options.alias with for the project root.
      nuxtOptionsAlias: { '~': projectDir, '@': projectDir },
    }
  }

  it('resolves the project ~ alias when nuxt.options.alias is merged into jiti (fixed behavior)', async () => {
    const { rootDir, configFile, nuxtOptionsAlias } = createProjectWithAliasedConfig()

    const jiti = createJiti(rootDir, {
      interopDefault: true,
      moduleCache: false,
      alias: {
        ...nuxtOptionsAlias,
        '#feature-flags/handler': join(rootDir, 'unused-handler.ts'),
      },
    })

    const configFlags = await jiti.import<{ flags: { fromAliasedImport: boolean } }>(configFile, { default: true })

    expect(configFlags.flags.fromAliasedImport).toBe(true)
  })

  it('fails to resolve the ~ alias when nuxt.options.alias is not merged into jiti (pre-fix behavior)', async () => {
    const { rootDir, configFile } = createProjectWithAliasedConfig()

    const jiti = createJiti(rootDir, {
      interopDefault: true,
      moduleCache: false,
      alias: {
        '#feature-flags/handler': join(rootDir, 'unused-handler.ts'),
      },
    })

    await expect(jiti.import(configFile, { default: true })).rejects.toThrow()
  })
})
