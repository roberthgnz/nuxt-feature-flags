import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import type { FlagConfig, FlagValue, VariantContext } from '../../../types/feature-flags'
import type { FlagDefinition } from '../../../types'
import { getVariantForFlag } from './variant-assignment'
import { useRuntimeConfig } from '#imports'

// Cache for development mode to avoid excessive file reads
// This is cleared on HMR updates
let devModeCache: { flags: Record<string, unknown>, timestamp: number } | null = null
const DEV_CACHE_TTL = 1000 // 1 second TTL for dev mode cache

export interface ResolvedFlag {
  enabled: boolean
  value?: FlagValue
  variant?: string
}

export interface ResolvedFlags {
  [key: string]: ResolvedFlag
}

/**
 * Extract context for variant assignment
 */
function getVariantContext(event: H3Event): VariantContext {
  // Try to get user ID from context (could be set by auth middleware)
  const userId = event.context.user?.id || event.context.userId

  // Try to get session ID from cookie
  const sessionId = getCookie(event, 'session-id') || getCookie(event, 'nuxt-session')

  // Get IP address as fallback (use headers as h3 doesn't export getClientIP in all versions)
  const forwarded = event.node.req.headers['x-forwarded-for']
  const ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || event.node.req.socket.remoteAddress

  return {
    userId,
    sessionId,
    ipAddress,
  }
}

/**
 * Resolve a flag value considering variants
 */
function resolveFlagValue(
  flagName: string,
  flagValue: unknown,
  context: VariantContext,
): ResolvedFlag {
  // Simple boolean/value flag
  if (typeof flagValue !== 'object' || flagValue === null || Array.isArray(flagValue)) {
    let enabled: boolean
    if (Array.isArray(flagValue)) {
      enabled = flagValue.length > 0
    }
    else {
      enabled = !!(flagValue as FlagValue)
    }
    return {
      enabled,
      value: flagValue as FlagValue,
    }
  }

  const flagConfig = flagValue as FlagConfig

  // If flag is disabled, return early
  if (!flagConfig.enabled) {
    return {
      enabled: false,
      value: flagConfig.value,
    }
  }

  // Handle variants
  if (flagConfig.variants && flagConfig.variants.length > 0) {
    try {
      const assignedVariant = getVariantForFlag(flagName, flagConfig.variants, context)

      if (assignedVariant) {
        return {
          enabled: true,
          value: assignedVariant.value !== undefined ? assignedVariant.value : flagConfig.value,
          variant: assignedVariant.name,
        }
      }
    }
    catch (error) {
      // If variant assignment fails, fall back to default behavior
      console.warn(`Variant assignment failed for flag ${flagName}:`, error)
    }
  }

  // Default case - enabled flag without variants
  return {
    enabled: true,
    value: flagConfig.value,
  }
}

/**
 * Load flags with appropriate strategy based on environment
 * - Development: Per-request loading with short TTL cache
 * - Production: Use build-time flags from runtime config
 */
async function loadFlags(): Promise<Record<string, unknown>> {
  const runtimeConfig = useRuntimeConfig()
  const isDevelopment = process.env.NODE_ENV === 'development' || process.dev

  // In production mode, always use build-time flags from runtime config
  if (!isDevelopment) {
    return getProductionFlags(runtimeConfig)
  }

  // In development mode, implement per-request loading with caching
  return getDevelopmentFlags(runtimeConfig)
}

/**
 * Get flags in production mode (build-time loaded, no reloading)
 */
function getProductionFlags(runtimeConfig: any): Record<string, unknown> {
  // Primary path: flags should be at runtimeConfig.public.featureFlags.flags (new structure)
  let flags: Record<string, unknown> = runtimeConfig.public?.featureFlags?.flags as Record<string, unknown> | undefined || {}

  // Fallback 1: Check alternative path for backward compatibility
  if (!flags || typeof flags !== 'object' || Object.keys(flags).length === 0) {
    flags = runtimeConfig.featureFlags?.flags as Record<string, unknown> | undefined || {}
  }

  // Fallback 2: For backward compatibility with inline config
  if (!flags || typeof flags !== 'object' || Object.keys(flags).length === 0) {
    const featureFlagsConfig = runtimeConfig.public?.featureFlags || runtimeConfig.featureFlags

    if (featureFlagsConfig && typeof featureFlagsConfig === 'object') {
      const possibleFlags = { ...featureFlagsConfig } as Record<string, unknown>
      delete possibleFlags.flags
      delete possibleFlags.config

      if (Object.keys(possibleFlags).length > 0) {
        flags = possibleFlags
      }
      else {
        flags = {}
      }
    }
    else {
      flags = {}
    }
  }

  return flags
}

/**
 * Get flags in development mode (per-request loading with cache)
 */
function getDevelopmentFlags(runtimeConfig: any): Record<string, unknown> {
  const now = Date.now()
  const isVerbose = process.env.NUXT_FEATURE_FLAGS_VERBOSE === 'true' ||
    process.env.NUXT_FEATURE_FLAGS_DEBUG === 'true'

  // Check if we have a valid cached version
  if (devModeCache && (now - devModeCache.timestamp) < DEV_CACHE_TTL) {
    if (isVerbose) {
      console.log(`[runtime] [DEBUG] Using cached flags (age: ${now - devModeCache.timestamp}ms)`)
    }
    return devModeCache.flags
  }

  if (isVerbose) {
    console.log('[runtime] [DEBUG] Cache expired or empty, loading fresh flags from runtime config')
  }

  // Load fresh flags from runtime config
  // In development, runtime config is updated by HMR when config file changes
  const flags = getProductionFlags(runtimeConfig)

  if (isVerbose) {
    console.log(`[runtime] [DEBUG] Loaded ${Object.keys(flags).length} flags from runtime config`)
  }

  // Update cache
  devModeCache = {
    flags,
    timestamp: now,
  }

  return flags
}

/**
 * Clear the development mode cache
 * This should be called when HMR updates occur
 */
export function clearDevModeCache() {
  devModeCache = null
}

export function getFeatureFlags(event: H3Event) {
  // Get flags using appropriate loading strategy
  const runtimeConfig = useRuntimeConfig()
  const isVerbose = process.env.NUXT_FEATURE_FLAGS_VERBOSE === 'true' ||
    process.env.NUXT_FEATURE_FLAGS_DEBUG === 'true'

  // Load flags based on environment
  // In development: per-request with cache
  // In production: build-time flags
  let flags: Record<string, unknown>

  const isDevelopment = process.env.NODE_ENV === 'development' || process.dev

  if (isVerbose) {
    console.log(`[runtime] [DEBUG] Loading flags in ${isDevelopment ? 'development' : 'production'} mode`)
  }

  if (isDevelopment) {
    flags = getDevelopmentFlags(runtimeConfig)
  }
  else {
    flags = getProductionFlags(runtimeConfig)
  }

  // Log warning if no flags found
  if (!flags || typeof flags !== 'object' || Object.keys(flags).length === 0) {
    if (isDevelopment) {
      console.warn('[runtime] No feature flags found in runtime config. Ensure flags are properly loaded from config file or defined inline in nuxt.config.ts.')
    }
    flags = {}
  } else if (isVerbose) {
    console.log(`[runtime] [DEBUG] Retrieved ${Object.keys(flags).length} flags from runtime config`)
  }

  const context = getVariantContext(event)
  const resolvedFlags: ResolvedFlags = {}

  // Resolve all flags with variant support
  for (const [flagName, flagValue] of Object.entries(flags)) {
    try {
      resolvedFlags[flagName] = resolveFlagValue(flagName, flagValue, context)
    }
    catch (error) {
      console.error(`[runtime] Failed to resolve flag '${flagName}':`, error instanceof Error ? error.message : String(error))
      // Provide a safe default
      resolvedFlags[flagName] = { enabled: false }
    }
  }

  return {
    flags: resolvedFlags,
    isEnabled(flagName: string, variant?: string): boolean {
      const flag = resolvedFlags[flagName]
      if (!flag) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[runtime] Flag '${flagName}' not found in runtime config. Ensure flags are properly loaded from config file or defined inline.`)
        }
        return false
      }
      if (!flag.enabled) return false

      // If variant is specified, check if it matches
      if (variant && flag.variant !== variant) return false

      return true
    },
    getVariant(flagName: string): string | undefined {
      const flag = resolvedFlags[flagName]
      if (!flag && process.env.NODE_ENV === 'development') {
        console.warn(`[runtime] Flag '${flagName}' not found when getting variant.`)
      }
      return flag?.variant
    },
    getValue(flagName: string): FlagValue | undefined {
      const flag = resolvedFlags[flagName]
      if (!flag && process.env.NODE_ENV === 'development') {
        console.warn(`[runtime] Flag '${flagName}' not found when getting value.`)
      }
      return flag?.value
    },
  }
}

/**
 * Standalone function to check if a feature flag is enabled
 * Useful for simple flag checking without full context
 */
export function isFeatureEnabled(flagName: string, variant?: string): boolean {
  const runtimeConfig = useRuntimeConfig()

  // Load flags using appropriate strategy based on environment
  const isDevelopment = process.env.NODE_ENV === 'development' || process.dev
  let flags: Record<string, unknown>

  if (isDevelopment) {
    flags = getDevelopmentFlags(runtimeConfig)
  }
  else {
    flags = getProductionFlags(runtimeConfig)
  }

  const flagValue = flags[flagName]
  if (!flagValue) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[runtime] Flag '${flagName}' not found in runtime config. Ensure flags are properly loaded from config file or defined inline.`)
    }
    return false
  }

  // Create basic context for variant assignment (empty since we don't have an event)
  const context: VariantContext = {}

  try {
    const resolvedFlag = resolveFlagValue(flagName, flagValue, context)

    if (!resolvedFlag.enabled) return false

    // If variant is specified, check if it matches
    if (variant && resolvedFlag.variant !== variant) return false

    return true
  }
  catch (error) {
    console.error(`[runtime] Failed to resolve flag '${flagName}':`, error instanceof Error ? error.message : String(error))
    return false
  }
}
