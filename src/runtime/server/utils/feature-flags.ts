import { getCookie, getRequestIP } from 'h3'
import type { H3Event } from 'h3'
import { defu } from 'defu'
import { logger, logDebug } from '../../../utils/logger'
import type { FlagsSchema, FlagValue, FlagVariant, ResolvedFlags } from '../../../types'
import { DEFAULTS } from '../../../defaults'
import type { VariantContext } from '../../../types/feature-flags'
import { getVariantForFlag } from './variant-assignment'
import { useRuntimeConfig } from '#imports'

// Define a cache for feature flags to avoid repeated lookups
let flagCache: ResolvedFlags | null = null
let cacheTimestamp = 0

function safeGetCookie(event: H3Event | undefined, name: string): string | undefined {
  if (!event?.node?.req) {
    return undefined
  }

  try {
    return getCookie(event, name) || undefined
  }
  catch {
    return undefined
  }
}

function getRuntimeFlags(runtimeConfig: ReturnType<typeof useRuntimeConfig>): FlagsSchema {
  const primaryFlags = runtimeConfig.public?.featureFlags?.flags as FlagsSchema | undefined
  if (primaryFlags && typeof primaryFlags === 'object') {
    return primaryFlags
  }

  const fallbackFlags = (runtimeConfig as { featureFlags?: { flags?: FlagsSchema } }).featureFlags?.flags
  if (fallbackFlags && typeof fallbackFlags === 'object') {
    return fallbackFlags
  }

  const inlineConfig = runtimeConfig.public?.featureFlags
    || (runtimeConfig as { featureFlags?: Record<string, unknown> }).featureFlags
  if (inlineConfig && typeof inlineConfig === 'object') {
    const { flags: _flags, config: _config, ...possibleFlags } = inlineConfig as Record<string, unknown>
    return possibleFlags as FlagsSchema
  }

  return {}
}

function getVariantContext(event: H3Event | undefined): VariantContext {
  const userId = event?.context?.user?.id || event?.context?.userId

  const sessionId = ['session_id', 'session-id', 'nuxt-session']
    .map(name => safeGetCookie(event, name))
    .find(cookie => !!cookie)

  const ipAddress = event ? getRequestIP(event, { xForwardedFor: true }) : undefined

  return {
    userId,
    sessionId,
    ipAddress,
  }
}

// Function to resolve feature flags from the configuration
export async function resolveFeatureFlags(event: H3Event): Promise<ResolvedFlags> {
  const now = Date.now()
  const runtimeConfig = useRuntimeConfig()
  const { featureFlags } = runtimeConfig.public
  const cacheTTL = featureFlags.cacheTTL ?? DEFAULTS.CACHE_TTL

  // In dev mode, check if the cache is older than 1 second
  if (import.meta.dev) {
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
    let configFlags: FlagsSchema = {}

    try {
      const { default: config } = await import('#feature-flags/config')

      // If the config is a function, evaluate it with the request context
      if (typeof config === 'function') {
        logDebug('Evaluating feature flags config function with H3Event context')
        configFlags = await Promise.resolve(config(event.context))
      }
      else if (config && typeof config === 'object') {
        logDebug('Using feature flags config object')
        configFlags = config as FlagsSchema
      }
    }
    catch (error) {
      logDebug('Could not import #feature-flags/config, falling back to runtime flags only', error)
    }

    // Merge with inline flags if any
    const inlineFlags = getRuntimeFlags(runtimeConfig)
    const flags = defu(configFlags, inlineFlags)

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
  const context = getVariantContext(event)
  const resolved: ResolvedFlags = {}

  for (const key in flags) {
    const flag = flags[key]

    if (typeof flag === 'object' && flag !== null && !Array.isArray(flag)) {
      const featureFlag = flag as {
        enabled?: boolean
        value?: FlagValue
        variants?: FlagVariant[]
      }
      const baseEnabled = 'enabled' in featureFlag ? !!featureFlag.enabled : !!featureFlag.value

      if (!baseEnabled) {
        resolved[key] = {
          enabled: false,
          value: featureFlag.value,
          variant: undefined,
        }
        continue
      }

      const variants = featureFlag.variants
      const assignedVariant = variants && variants.length
        ? getVariantForFlag(key, variants as import('../../../types/feature-flags').FlagVariant[], context)
        : null

      resolved[key] = {
        enabled: !!(assignedVariant?.value ?? featureFlag.value ?? baseEnabled),
        value: (assignedVariant?.value ?? featureFlag.value) as FlagValue,
        variant: assignedVariant?.name,
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

// Backward-compatible synchronous helper used by older tests/consumers.
export function isFeatureEnabled(flagName: string, expectedVariant?: string): boolean {
  if (!flagName) {
    return false
  }

  const runtimeFlags = getRuntimeFlags(useRuntimeConfig())
  const flag = runtimeFlags[flagName]

  if (flag === null || flag === undefined) {
    return false
  }

  if (Array.isArray(flag)) {
    return flag.length > 0
  }

  if (typeof flag === 'object') {
    const featureFlag = flag as {
      enabled?: boolean
      value?: FlagValue
      variants?: Array<{ name?: string }>
    }
    const enabled = 'enabled' in featureFlag ? !!featureFlag.enabled : !!featureFlag.value
    if (!enabled) {
      return false
    }

    if (expectedVariant && Array.isArray(featureFlag.variants)) {
      return featureFlag.variants.some(variant => variant?.name === expectedVariant)
    }

    return enabled
  }

  return !!flag
}
