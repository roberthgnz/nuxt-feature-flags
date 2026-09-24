import type { H3EventContext } from 'h3'

/** A primitive flag value. */
export type FlagValue = boolean | number | string | null | undefined

/** One bucket of an A/B/n experiment. */
export interface FlagVariant {
  /** Unique name of the variant, e.g. `control` or `treatment`. */
  name: string
  /** Share of traffic for this variant. Weights are normalized, so they don't strictly need to add up to 100. */
  weight: number
  /** Value exposed while the visitor is in this variant. Falls back to the flag's own `value`. */
  value?: FlagValue
}

/** Long-form flag definition. */
export interface FlagConfig {
  /** Master switch. When omitted, the flag is enabled if `value` is truthy. */
  enabled?: boolean
  /** Value exposed when the flag is enabled and no variant overrides it. */
  value?: FlagValue
  /** Variants to split traffic between. Assignment is sticky per visitor. */
  variants?: FlagVariant[]
}

/** A flag is either a plain value (`true`, `'blue'`, `42`...) or a {@link FlagConfig}. */
export type FlagDefinition = FlagValue | FlagConfig

/** Map of flag name → definition, as returned by a config file or declared inline. */
export type FlagsSchema = Record<string, FlagDefinition>

/** The context a function-shaped config file receives: the current request's `event.context`. */
export type FlagsContext = H3EventContext

/** What a config file may export as its default. */
export type FeatureFlagsConfigInput<T extends FlagsSchema = FlagsSchema>
  = | T
    | ((context: FlagsContext) => T | Promise<T>)

/** The evaluated state of a single flag for the current visitor. */
export interface ResolvedFlag {
  enabled: boolean
  value?: FlagValue
  variant?: string
}

export type ResolvedFlags = Record<string, ResolvedFlag>

/** Options of the `featureFlags` key in `nuxt.config`. */
export interface ModuleOptions {
  /**
   * Path to a flags config file, relative to the project root (aliases such as `~/` work too).
   * The file's default export can be a flags object or a (sync or async) function of the request context.
   */
  config?: string
  /** Flags declared inline. Flags from the config file take precedence over these. */
  flags?: FlagsSchema
  /**
   * How long (ms) the server may reuse the result of a **function** config across requests.
   *
   * Defaults to `0` (evaluate per request). Only raise it if the function does not depend on
   * per-visitor data from `context` — a cached result is shared by every visitor.
   */
  cacheTTL?: number
}

/** Helpers returned by `useFeatureFlags()` and `getFeatureFlags(event)`. */
export interface FeatureFlagsHelpers<Name extends string = string> {
  flags: ResolvedFlags
  /**
   * `isEnabled('flag')` → whether the flag is on for this visitor.
   * `isEnabled('flag:variant')` → whether this visitor was assigned that variant.
   */
  isEnabled: (flag: Name | `${Name}:${string}`) => boolean
  getValue: (flag: Name) => FlagValue
  getVariant: (flag: Name) => string | undefined
}
