import { H3Event, getCookie } from 'h3'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import { logger, logDebug } from '../../../utils/logger'
import type { FlagsSchema, FlagValue, ResolvedFlag, ResolvedFlags, FlagVariant } from '../../../types'
import { DEFAULTS } from '../../../defaults'

// Define a cache for feature flags to avoid repeated lookups
let flagCache: ResolvedFlags | null = null
let cacheTimestamp = 0

// Function to resolve feature flags from the configuration
export async function resolveFeatureFlags(event: H3Event): Promise<ResolvedFlags> {
  const now = Date.now()
  const { featureFlags } = useRuntimeConfig().public
  const cacheTTL = featureFlags.cacheTTL ?? DEFAULTS.CACHE_TTL

  // In dev mode, check if the cache is older than 1 second
  if (process.dev) {
    if (flagCache && now - cacheTimestamp < cacheTTL) {
      logDebug('[server-cache] Using cached feature flags (dev mode, < 1s old)')
      return flagCache
    }
  }
  // In production, use the cache if it's available
  else if (flagCache) {
    logDebug('[server-cache] Using cached feature flags (production)')
    return flagCache
  }

  logDebug('Resolving feature flags on the server')

  try {
    // Dynamically import the feature flags config
    const { default: config } = await import('#feature-flags/config')

    let flags: FlagsSchema = {}

    // If the config is a function, evaluate it with the request context
    if (typeof config === 'function') {
      logDebug('Evaluating feature flags config function with H3Event context')
      flags = await Promise.resolve(config(event.context))
    }
    else {
      logDebug('Using feature flags config object')
      flags = config
    }

    // Merge with inline flags if any
    const inlineFlags = useRuntimeConfig().public.featureFlags.flags
    if (inlineFlags) {
      flags = defu(flags, inlineFlags)
    }

    // Resolve the flags and store them in the cache
    const resolved = resolveFlags(flags, event)
    flagCache = resolved
    cacheTimestamp = now

    logDebug(`Resolved ${Object.keys(resolved).length} feature flags`)

    return resolved
  }
  catch (error) {
    logger.error('Failed to resolve feature flags:', error)
    return {}
  }
}

// Helper function to resolve the final state of flags
function resolveFlags(flags: FlagsSchema, event: H3Event): ResolvedFlags {
  const resolved: ResolvedFlags = {}
  for (const key in flags) {
    const flag = flags[key]
    if (typeof flag === 'object' && flag !== null && 'value' in flag) {
      const { value, variants } = flag
      let resolvedVariant: FlagVariant | undefined

      if (variants && variants.length > 0) {
        resolvedVariant = resolveVariant(key, variants, event)
      }

      resolved[key] = {
        enabled: !!(resolvedVariant ? resolvedVariant.value : value),
        value: resolvedVariant ? resolvedVariant.value : value,
        variant: resolvedVariant?.name,
      }
    }
    else {
      resolved[key] = {
        enabled: !!flag,
        value: flag as FlagValue,
        variant: undefined,
      }
    }
  }
  return resolved
}

// Simple string hash function
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Helper function to resolve a variant from a list of variants
function resolveVariant(key: string, variants: FlagVariant[], event: H3Event): FlagVariant | undefined {
  const userId = event.context.user?.id
  const sessionId = getCookie(event, 'session_id')
  const uniqueId = userId || sessionId

  if (!uniqueId) {
    logger.warn(`No unique identifier found for variant assignment for flag "${key}". Falling back to random assignment.`)
  }

  const totalWeight = variants.reduce((acc, v) => acc + (v.weight ?? 0), 0)
  const seed = uniqueId ? `${uniqueId}:${key}` : `${Math.random()}`
  const hash = simpleHash(seed)
  let random = hash % totalWeight

  for (const variant of variants) {
    if (variant.weight === undefined) continue
    if (random < variant.weight) {
      return variant
    }
    random -= variant.weight
  }

  return undefined
}

export async function getFeatureFlags(event: H3Event) {
  const flags = await resolveFeatureFlags(event)

  const isEnabled = (flag: string): boolean => {
    return flags[flag]?.enabled ?? false
  }

  const getValue = (flag: string): FlagValue => {
    return flags[flag]?.value
  }

  const getVariant = (flag: string): string | undefined => {
    return flags[flag]?.variant
  }

  return {
    flags,
    isEnabled,
    getValue,
    getVariant,
  }
}
