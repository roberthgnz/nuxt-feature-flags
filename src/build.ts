import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'
import { glob } from 'glob'
import { createJiti } from 'jiti'
import type { FlagsSchema } from './runtime/types'
import type { ValidationError } from './runtime/server/utils/validation'
import { checkUndeclaredFlags, validateFlagDefinition } from './runtime/server/utils/validation'
import { logger } from './utils/logger'

export type { ValidationError }

export interface BuildValidationOptions {
  /** Flags config file. Defaults to `feature-flags.config.ts`. */
  configPath?: string
  /** Inline flags from `nuxt.config`, if you use them. */
  flags?: FlagsSchema
  /** Globs of files to scan for flag usage. */
  srcPatterns?: string[]
  /** Directory the paths and globs are relative to. Defaults to `process.cwd()`. */
  cwd?: string
  /** Throw when problems are found (for CI). */
  failOnErrors?: boolean
}

const DEFAULT_PATTERNS = ['**/*.{vue,ts,tsx,js,jsx,mjs}']
const IGNORE = ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**']

const USAGE_PATTERNS = [
  // isEnabled('flag'), getValue("flag"), getVariant(`flag`)
  /\b(?:isEnabled|getValue|getVariant)\(\s*(['"`])([^'"`]+)\1\s*\)/g,
  // v-feature="'flag'" / v-feature='"flag:variant"'
  /\bv-feature=(["'])\s*['"`]([^'"`]+)['"`]\s*\1/g,
]

/** Flag names (`flag` or `flag:variant`) referenced in a source file's content. */
export function extractFlagUsage(content: string): string[] {
  const flags = new Set<string>()
  for (const pattern of USAGE_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      flags.add(match[2]!)
    }
  }
  return [...flags]
}

/**
 * Validates the flags config (names, variant weights...) and checks that every flag
 * used in the source code is declared. Meant for CI:
 *
 * @example
 * import { validateFeatureFlags } from 'nuxt-feature-flags/build'
 * await validateFeatureFlags({ failOnErrors: true })
 */
export async function validateFeatureFlags(options: BuildValidationOptions = {}): Promise<ValidationError[]> {
  const {
    configPath = 'feature-flags.config.ts',
    flags: inlineFlags = {},
    srcPatterns = DEFAULT_PATTERNS,
    cwd = process.cwd(),
    failOnErrors = false,
  } = options

  const errors: ValidationError[] = []
  const configFlags = await loadConfigFlags(resolve(cwd, configPath), errors)
  const declared = { ...inlineFlags, ...configFlags }
  errors.push(...validateFlagDefinition(declared))

  const files = await glob(srcPatterns, { cwd, absolute: true, ignore: IGNORE })
  const used = new Set(files.flatMap(file => extractFlagUsage(readFileSync(file, 'utf-8'))))
  errors.push(...checkUndeclaredFlags(Object.keys(declared), [...used]))

  logger.info(`Found ${Object.keys(declared).length} declared flags and ${used.size} flag usages in ${files.length} files`)

  if (!errors.length) {
    logger.success('Feature flag validation passed')
    return errors
  }

  for (const error of errors) {
    logger.error(`[${error.type}] ${error.flag}: ${error.error}`)
  }

  if (failOnErrors) {
    throw new Error(`Feature flag validation failed with ${errors.length} error(s)`)
  }

  return errors
}

async function loadConfigFlags(path: string, errors: ValidationError[]): Promise<FlagsSchema> {
  if (!existsSync(path)) {
    errors.push({ flag: 'config', error: `Configuration file not found: ${path}`, type: 'config' })
    return {}
  }

  try {
    const jiti = createJiti(import.meta.url, {
      moduleCache: false,
      alias: {
        '#feature-flags/handler': fileURLToPath(new URL('./runtime/server/handlers/feature-flags', import.meta.url)),
      },
    })
    const config = await jiti.import<unknown>(path, { default: true })

    // A function config runs per request at runtime; here it is called once, with an
    // empty context, only to learn which flags it declares.
    const flags = typeof config === 'function' ? await config({}) : config
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
      throw new TypeError('the default export must be a flags object or a function returning one')
    }
    return flags as FlagsSchema
  }
  catch (error) {
    errors.push({ flag: 'config', error: `Failed to load configuration: ${error instanceof Error ? error.message : error}`, type: 'config' })
    return {}
  }
}
