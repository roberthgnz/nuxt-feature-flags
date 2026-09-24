import { getCookie, getRequestIP } from 'h3'
import type { H3Event } from 'h3'
import type { FeatureFlagsHelpers, FlagConfig, FlagsSchema, FlagValue, ModuleOptions, ResolvedFlag, ResolvedFlags } from '../../types'
import { createFlagsHelpers } from '../../shared/helpers'
import { DEFAULTS } from '../../utils/defaults'
import { logDebug, logger } from '../../utils/logger'
import { getVariantForFlag } from './variant-assignment'
import type { VariantContext } from './variant-assignment'
import { validateFlagDefinition } from './validation'
import { useRuntimeConfig } from '#imports'
import configInput from '#feature-flags/config'
import type { FlagName } from '#feature-flags/types'

const SESSION_COOKIES = ['session_id', 'session-id', 'nuxt-session']

// Result of a *function* config, shared across requests only when `cacheTTL > 0`.
let cachedDefinitions: { flags: FlagsSchema, expiresAt: number } | undefined
let pendingDefinitions: Promise<FlagsSchema> | undefined
const reportedProblems = new Set<string>()

/**
 * Evaluates every flag for the visitor behind `event`.
 *
 * The result is memoized on the event, so the SSR plugin, API routes and your own
 * server code all share one evaluation per request.
 */
export function resolveFeatureFlags(event: H3Event): Promise<ResolvedFlags> {
  const context = event.context as { _featureFlags?: Promise<ResolvedFlags> }
  context._featureFlags ??= loadDefinitions(event)
    .then(definitions => resolveFlags(definitions, getVariantContext(event)))
    .catch((error) => {
      logger.error('Failed to resolve feature flags:', error)
      return {}
    })
  return context._featureFlags
}

export async function getFeatureFlags<Name extends string = FlagName>(event: H3Event): Promise<FeatureFlagsHelpers<Name>> {
  return createFlagsHelpers<Name>(await resolveFeatureFlags(event))
}

/** Clears the cross-request cache of the config function's result. */
export function clearFeatureFlagsCache(): void {
  cachedDefinitions = undefined
  pendingDefinitions = undefined
}

/**
 * Evaluates one flag definition. Disabled flags never get a variant, and an enabled
 * flag is only turned off for a visitor by an explicit `false` value on their variant.
 */
export function resolveFlag(name: string, definition: FlagsSchema[string], context: VariantContext): ResolvedFlag {
  if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
    return { enabled: !!definition, value: definition as FlagValue }
  }

  const config = definition as FlagConfig
  const enabled = config.enabled ?? !!config.value
  if (!enabled) {
    return { enabled: false, value: config.value }
  }

  const variant = Array.isArray(config.variants) && config.variants.length
    ? getVariantForFlag(name, config.variants, context)
    : null

  const value = variant?.value !== undefined ? variant.value : config.value
  return {
    enabled: value !== false,
    value,
    variant: variant?.name,
  }
}

export function resolveFlags(definitions: FlagsSchema, context: VariantContext): ResolvedFlags {
  const resolved: ResolvedFlags = {}
  for (const name of Object.keys(definitions)) {
    resolved[name] = resolveFlag(name, definitions[name], context)
  }
  return resolved
}

function getVariantContext(event: H3Event): VariantContext {
  const userId = event.context?.user?.id ?? event.context?.userId
  return {
    userId: userId != null && userId !== '' ? String(userId) : undefined,
    sessionId: SESSION_COOKIES.map(name => safely(() => getCookie(event, name))).find(Boolean),
    ipAddress: safely(() => getRequestIP(event, { xForwardedFor: true })),
  }
}

async function loadDefinitions(event: H3Event): Promise<FlagsSchema> {
  const options: Pick<ModuleOptions, 'flags' | 'cacheTTL'> = useRuntimeConfig(event).featureFlags ?? {}
  const inlineFlags = options.flags ?? {}

  let configFlags: FlagsSchema
  try {
    configFlags = typeof configInput === 'function'
      ? await evaluateConfigFunction(event, options.cacheTTL ?? DEFAULTS.CACHE_TTL)
      : (configInput ?? {})
  }
  catch (error) {
    // Don't take the page down because a remote flag source hiccuped. Falling back to
    // the shared cache is safe (it is shared by design); another visitor's per-request
    // result would not be, so without a cache only the inline flags remain.
    logger.error('Evaluating the feature flags config failed, falling back to cached/inline flags:', error)
    configFlags = cachedDefinitions?.flags ?? {}
  }

  // Shallow merge on purpose: a flag from the config file replaces the inline flag
  // of the same name as a whole (defu would concatenate their `variants`).
  const definitions = { ...inlineFlags, ...configFlags }

  if (import.meta.dev) {
    reportProblems(definitions)
  }

  return definitions
}

async function evaluateConfigFunction(event: H3Event, cacheTTL: number): Promise<FlagsSchema> {
  const evaluate = async () => ((await (configInput as unknown as (context: H3Event['context']) => FlagsSchema | Promise<FlagsSchema>)(event.context)) ?? {})

  if (cacheTTL <= 0) {
    return evaluate()
  }

  if (cachedDefinitions && cachedDefinitions.expiresAt > Date.now()) {
    logDebug('Using cached feature flag definitions')
    return cachedDefinitions.flags
  }

  // Concurrent requests during a cache miss share a single evaluation.
  pendingDefinitions ??= evaluate()
    .then((flags) => {
      cachedDefinitions = { flags, expiresAt: Date.now() + cacheTTL }
      return flags
    })
    .finally(() => {
      pendingDefinitions = undefined
    })

  return pendingDefinitions
}

function reportProblems(definitions: FlagsSchema) {
  for (const problem of validateFlagDefinition(definitions)) {
    const message = `[${problem.flag}] ${problem.error}`
    if (!reportedProblems.has(message)) {
      reportedProblems.add(message)
      logger.warn(message)
    }
  }
}

function safely<T>(read: () => T): T | undefined {
  try {
    return read() || undefined
  }
  catch {
    return undefined
  }
}
