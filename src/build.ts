import { existsSync, readFileSync } from 'node:fs'
import { glob } from 'glob'
import { logger } from './utils/logger'
import type { ValidationError } from './runtime/server/utils/validation'
import { validateFlagDefinition, checkUndeclaredFlags } from './runtime/server/utils/validation'

export interface BuildValidationOptions {
  configPath?: string
  srcPatterns?: string[]
  failOnErrors?: boolean
}

/**
 * Extract flag usage from code files
 */
function extractFlagUsageFromCode(filePath: string): string[] {
  const flags: string[] = []

  try {
    const content = readFileSync(filePath, 'utf-8')

    // Match isEnabled('flagName') or isEnabled('flagName:variant')
    const isEnabledMatches = content.match(/isEnabled\(['"`]([^'"`]+)['"`]\)/g)
    if (isEnabledMatches) {
      for (const match of isEnabledMatches) {
        const flagMatch = match.match(/['"`]([^'"`]+)['"`]/)
        if (flagMatch) {
          flags.push(flagMatch[1])
        }
      }
    }

    // Match v-feature="'flagName'" or v-feature="'flagName:variant'"
    const vFeatureMatches = content.match(/v-feature=['"`]([^'"`]+)['"`]/g)
    if (vFeatureMatches) {
      for (const match of vFeatureMatches) {
        const flagMatch = match.match(/['"`]([^'"`]+)['"`]/)
        if (flagMatch) {
          flags.push(flagMatch[1])
        }
      }
    }

    // Match template conditions like v-if="isEnabled('flagName')"
    const vIfMatches = content.match(/v-if=['"`][^'"`]*isEnabled\(['"`]([^'"`]+)['"`]\)[^'"`]*['"`]/g)
    if (vIfMatches) {
      for (const match of vIfMatches) {
        const flagMatch = match.match(/isEnabled\(['"`]([^'"`]+)['"`]\)/)
        if (flagMatch) {
          flags.push(flagMatch[1])
        }
      }
    }
  }
  catch (error) {
    logger.warn(`Failed to read file ${filePath}:`, error)
  }

  return flags
}

/**
 * Scan source files for flag usage
 */
async function scanSourceFiles(patterns: string[]): Promise<string[]> {
  const flags: string[] = []

  await Promise.all(patterns.map(async (pattern) => {
    try {
      const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**'] })

      for (const file of files) {
        const fileFlags = extractFlagUsageFromCode(file)
        flags.push(...fileFlags)
      }
    }
    catch (error) {
      logger.warn(`Failed to scan pattern ${pattern}:`, error)
    }
  }))

  // Remove duplicates
  return Array.from(new Set(flags))
}

/**
 * Validate feature flags configuration and usage
 */
export async function validateFeatureFlags(options: BuildValidationOptions = {}): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // Default options
  const {
    configPath = 'feature-flags.config.ts',
    srcPatterns = ['**/*.vue', '**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
    failOnErrors = false,
  } = options

  // Load and validate flag configuration
  let declaredFlags: string[] = []

  if (existsSync(configPath)) {
    try {
      // This is a simplified version - in practice, you'd want to use the same
      // config loading mechanism as the main module
      const { loadConfig } = await import('c12')
      const { config } = await loadConfig({
        configFile: configPath.replace(/\.\w+$/, ''),
        jitiOptions: {
          interopDefault: true,
          moduleCache: false,
        },
      })

      if (config) {
        // Validate flag configuration
        const configErrors = validateFlagDefinition(config)
        errors.push(...configErrors)

        // Extract declared flag names
        declaredFlags = Object.keys(config)
      }
    }
    catch (error) {
      errors.push({
        flag: 'config',
        error: `Failed to load configuration: ${error}`,
        type: 'config',
      })
    }
  }
  else {
    errors.push({
      flag: 'config',
      error: `Configuration file not found: ${configPath}`,
      type: 'config',
    })
  }

  // Scan source files for flag usage
  try {
    const usedFlags = await scanSourceFiles(srcPatterns)

    // Check for undeclared flags
    const undeclaredErrors = checkUndeclaredFlags(declaredFlags, usedFlags)
    errors.push(...undeclaredErrors)

    // Log summary
    logger.info(`Found ${declaredFlags.length} declared flags`)
    logger.info(`Found ${usedFlags.length} unique flag usages in code`)

    if (errors.length > 0) {
      logger.error(`Found ${errors.length} validation errors:`)
      for (const error of errors) {
        logger.error(`  [${error.type}] ${error.flag}: ${error.error}`)
      }

      if (failOnErrors) {
        throw new Error(`Feature flag validation failed with ${errors.length} errors`)
      }
    }
    else {
      logger.success('✅ Feature flag validation passed')
    }
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('validation failed')) {
      throw error
    }

    logger.error('Failed to validate feature flags:', error)
    errors.push({
      flag: 'validation',
      error: `Validation process failed: ${error}`,
      type: 'config',
    })
  }

  return errors
}
