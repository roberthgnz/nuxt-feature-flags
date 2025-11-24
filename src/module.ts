import { existsSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import { defu } from 'defu'
import { defineNuxtModule, createResolver, addImports, addPlugin, addTypeTemplate, addServerHandler, addServerImportsDir } from '@nuxt/kit'
import { loadConfig } from 'c12'
import type { FeatureFlagsConfig, FlagDefinition } from './types'
import { logger, logDebug } from './utils/logger'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    featureFlags: FeatureFlagsConfig
  }
}

export default defineNuxtModule<FeatureFlagsConfig>({
  meta: {
    name: 'nuxt-feature-flags',
    compatibility: {
      nuxt: '>=3.1.0',
      bridge: false,
    },
    configKey: 'featureFlags',
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#feature-flags/types'] = './types/nuxt-feature-flags.d.ts'
    nuxt.options.alias['#feature-flags/handler'] = resolver.resolve('./runtime/server/handlers/feature-flags')

    // Create default config that handles inline flags properly
    let configPath = resolver.resolve('./runtime/feature-flags.config')

    // Helper function to resolve config file path from project root
    const resolveConfigPath = (configFilePath: string): string => {
      // If the path is already absolute, return it as-is
      if (isAbsolute(configFilePath)) {
        return configFilePath
      }

      // Otherwise, resolve relative to project root
      // This ensures consistent behavior regardless of where the module is loaded from
      return resolve(nuxt.options.rootDir, configFilePath)
    }

    // Helper function to load config flags
    const loadConfigFlags = async (): Promise<{ flags: FlagDefinition, configFile: string } | null> => {
      if (!options.config) {
        logDebug('[module-setup] No config file specified, will use inline flags if available')
        return null
      }

      // Validate config path
      if (!options.config || options.config.trim() === '') {
        logger.error('[module-setup] Config file path is empty or invalid')
        return null
      }

      // Resolve the config path from project root
      const resolvedConfigPath = resolveConfigPath(options.config)
      logger.info(`[module-setup] Resolved config path: ${resolvedConfigPath} (from: ${options.config})`)
      logDebug(`[module-setup] Project root directory: ${nuxt.options.rootDir}`)

      try {
        logger.info(`[module-setup] Loading feature flags from config file: ${options.config}`)
        logDebug(`[module-setup] Using c12 loader with jiti for config file evaluation`)

        const { config: configFlags, configFile } = await loadConfig<FlagDefinition>({
          configFile: options.config.replace(/\.\w+$/, ''),
          cwd: nuxt.options.rootDir,
          jitiOptions: {
            interopDefault: true,
            moduleCache: false, // Disable cache for HMR
            alias: {
              '#feature-flags/handler': resolver.resolve('./runtime/server/handlers/feature-flags'),
            },
          },
        })

        // Validate that the config file exists
        if (!configFile || !existsSync(configFile)) {
          const attemptedPath = configFile || resolvedConfigPath
          logger.error(
            `[module-setup] Failed to load config file at '${attemptedPath}': File not found. ` +
            `Ensure the path is correct and relative to the project root (${nuxt.options.rootDir}). ` +
            `Attempted to resolve '${options.config}' to '${attemptedPath}'.`
          )
          return null
        }

        logDebug(`[module-setup] Config file found at: ${configFile}`)

        // Validate config structure
        if (configFlags === undefined || configFlags === null) {
          logger.error(
            `[module-setup] Failed to load config file at '${configFile}': ` +
            `Config file did not export a valid configuration. Ensure the file exports flag definitions.`
          )
          return null
        }

        logDebug(`[module-setup] Config loaded, type: ${typeof configFlags}`)

        // Handle both direct flag definitions and function-based definitions
        let resolvedFlags = configFlags
        if (typeof configFlags === 'function') {
          logDebug(`[module-setup] Config is a function, evaluating to get flag definitions`)
          try {
            // Create context for config function evaluation
            // Build-time context includes information about the build environment
            const buildContext = {
              isDev: nuxt.options.dev,
              isProduction: !nuxt.options.dev,
              rootDir: nuxt.options.rootDir,
              phase: 'build' as const,
            }

            logDebug(`[module-setup] Evaluating config function with build context: ${JSON.stringify(buildContext)}`)

            // Call the function with build context to get the actual flags
            resolvedFlags = (configFlags as (context?: any) => FlagDefinition)(buildContext)
          }
          catch (evalError) {
            logger.error(
              `[module-setup] Failed to evaluate config function at '${configFile}': ${evalError instanceof Error ? evalError.message : String(evalError)}`
            )
            return null
          }
        }

        // Validate that resolved flags is an object
        if (typeof resolvedFlags !== 'object' || resolvedFlags === null || Array.isArray(resolvedFlags)) {
          logger.error(
            `[module-setup] Failed to load config file at '${configFile}': ` +
            `Invalid config structure. Expected an object with flag definitions, got ${typeof resolvedFlags}.`
          )
          return null
        }

        const flagCount = Object.keys(resolvedFlags || {}).length
        logger.info(`[module-setup] Successfully loaded ${flagCount} flags from config file`)
        logDebug(`[module-setup] Flag names: ${Object.keys(resolvedFlags || {}).join(', ')}`)
        return { flags: resolvedFlags || {}, configFile: configFile! }
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const pathInfo = options.config ? ` at '${options.config}'` : ''

        // Provide specific error messages based on error type
        if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
          logger.error(
            `[module-setup] Failed to load config file${pathInfo}: File not found. ` +
            `Ensure the path is correct and relative to the project root.`
          )
        }
        else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
          logger.error(
            `[module-setup] Failed to load config file${pathInfo}: Permission denied. ` +
            `Check file permissions.`
          )
        }
        else if (errorMessage.includes('SyntaxError') || errorMessage.includes('parse')) {
          logger.error(
            `[module-setup] Failed to load config file${pathInfo}: Syntax error in config file. ` +
            `${errorMessage}`
          )
        }
        else {
          logger.error(
            `[module-setup] Failed to load config file${pathInfo}: ${errorMessage}`
          )
        }

        // Graceful fallback: return null to allow the module to continue with inline flags
        return null
      }
    }

    // Load feature flags configuration from file so that we can generated types from them
    logDebug('[module-setup] Starting config loading phase')
    const configResult = await loadConfigFlags()
    if (configResult) {
      logDebug(`[module-setup] Merging ${Object.keys(configResult.flags).length} flags from config file with inline flags`)
      options.flags = defu(options.flags, configResult.flags)
      configPath = configResult.configFile
      logger.info(`[module-setup] Using config file as source: ${configPath}`)

      // Add config file to watch list for HMR in development mode
      if (nuxt.options.dev) {
        logger.info(`[HMR] Watching config file for changes: ${configPath}`)
        logDebug(`[HMR] HMR enabled for config file in development mode`)
        nuxt.options.watch = nuxt.options.watch || []
        nuxt.options.watch.push(configPath)

        // Set up HMR reload handler
        nuxt.hook('builder:watch', async (event, path) => {
          if (path === configPath) {
            logger.info(`[HMR] Config file changed, reloading flags: ${path}`)
            logDebug(`[HMR] Event type: ${event}`)

            // Clear module cache to force re-evaluation
            if (require.cache[configPath]) {
              logDebug(`[HMR] Clearing module cache for: ${configPath}`)
              delete require.cache[configPath]
            }

            // Reload the config
            logDebug(`[HMR] Reloading config file`)
            const reloadedConfig = await loadConfigFlags()
            if (reloadedConfig) {
              // Update options with new flags
              options.flags = reloadedConfig.flags

              // Update runtime config with new flags
              const updatedRuntimeConfig = {
                flags: options.flags || {},
                config: options.config,
              }
              nuxt.options.runtimeConfig.public.featureFlags = defu(
                nuxt.options.runtimeConfig.public.featureFlags,
                updatedRuntimeConfig,
              ) as FeatureFlagsConfig

              const flagCount = Object.keys(options.flags || {}).length
              logger.info(`[HMR] Successfully reloaded ${flagCount} flags`)
              logDebug(`[HMR] Updated flag names: ${Object.keys(options.flags || {}).join(', ')}`)

              // Note: The dev mode cache in server utils will automatically expire
              // within 1 second, so the next request will pick up the new flags
              logDebug(`[HMR] Dev mode cache will expire within 1 second, next request will use new flags`)
            }
            else {
              logger.warn(
                `[HMR] Failed to reload config file at '${path}'. ` +
                `Keeping previous flag configuration. Check the error messages above for details.`
              )
            }
          }
        })
      }
    }
    else if (options.flags && Object.keys(options.flags).length > 0) {
      const flagCount = Object.keys(options.flags).length
      logger.info(`[module-setup] Using ${flagCount} inline flags from nuxt.config.ts`)
      logger.info(`[module-setup] Using inline configuration as source`)
      logDebug(`[module-setup] Inline flag names: ${Object.keys(options.flags).join(', ')}`)
    }
    else {
      logger.warn(
        `[module-setup] No feature flags configured. ` +
        `Provide flags either inline in nuxt.config.ts or via a config file.`
      )
    }

    // Set runtime config after loading flags
    // Properly nest flags under runtimeConfig.public.featureFlags.flags for runtime access
    // while maintaining backward compatibility with inline configurations
    logDebug('[module-setup] Setting runtime config with loaded flags')
    const runtimeConfigUpdate = {
      flags: options.flags || {},
      config: options.config,
    }
    nuxt.options.runtimeConfig.public.featureFlags = defu(
      nuxt.options.runtimeConfig.public.featureFlags,
      runtimeConfigUpdate,
    ) as FeatureFlagsConfig
    logDebug(`[module-setup] Runtime config updated with ${Object.keys(options.flags || {}).length} flags`)

    nuxt.options.alias['#feature-flags/config'] = configPath

    addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addPlugin(resolver.resolve('./runtime/app/plugins/feature-flag.server'))
    addPlugin(resolver.resolve('./runtime/app/plugins/feature-flag.client'))
    addImports({
      name: 'useFeatureFlags',
      from: resolver.resolve('./runtime/app/composables/feature-flags'),
    })

    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/feature-flags.get'),
      route: '/api/_feature-flags/feature-flags',
      method: 'get',
    })

    // Generate types from featureFlags config
    addTypeTemplate({
      filename: 'types/nuxt-feature-flags.d.ts',
      getContents: () => {
        const flags = options.flags || {}
        const flagEntries = Object.entries(flags)
          .map(([key, value]) => {
            // For simple flags, use the actual type
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
              return `  ${key}: ${typeof value}`
            }

            // For flag configs with variants, we still resolve to the base type
            // The variant logic is handled at runtime
            const flagConfig = value as { enabled?: boolean, value?: unknown }
            if (flagConfig.enabled !== undefined) {
              const valueType = flagConfig.value !== undefined ? typeof flagConfig.value : 'boolean'
              return `  ${key}: ${valueType}`
            }

            return `  ${key}: ${typeof value}`
          })
          .join('\n')

        // Add reference to config file if it exists for better type resolution
        const configReference = configResult?.configFile
          ? `/// <reference path="${configResult.configFile}" />\n`
          : ''

        return `${configReference}export interface FlagsSchema {
${flagEntries}
}

// Type for resolved flag with variant info
export interface ResolvedFlag {
  enabled: boolean
  value?: boolean | number | string | null
  variant?: string
}

export interface ResolvedFlags {
  [key: string]: ResolvedFlag
}`
      },
    })

    // Add TypeScript path configuration for the handler alias
    // This ensures the config file can import from '#feature-flags/handler'
    nuxt.hook('prepare:types', ({ tsConfig }) => {
      tsConfig.compilerOptions = tsConfig.compilerOptions || {}
      tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {}

      // Add the handler path so TypeScript can resolve it in config files
      tsConfig.compilerOptions.paths['#feature-flags/handler'] = [
        resolver.resolve('./runtime/server/handlers/feature-flags'),
      ]

      // Add the types path
      tsConfig.compilerOptions.paths['#feature-flags/types'] = [
        './types/nuxt-feature-flags.d.ts',
      ]

      // If there's a config file, ensure its directory is included
      if (configResult?.configFile) {
        tsConfig.include = tsConfig.include || []
        // Add the config file to the include list if not already there
        if (!tsConfig.include.includes(configResult.configFile)) {
          tsConfig.include.push(configResult.configFile)
        }
      }
    })
  },
})
