import type { H3EventContext } from 'h3'

export type FlagValue = boolean | number | string | undefined

// Basic flag definition: a key-value pair
export interface FlagDefinition {
  [key: string]: FlagValue
}

// Variant definition for feature flags
export interface FlagVariant {
  name?: string
  value: FlagValue
  weight?: number
  meta?: Record<string, any>
}

// Configuration for a single feature flag with variants
export interface FlagConfig {
  value: FlagValue
  variants?: FlagVariant[]
}

// The schema for feature flags, allowing for simple flags or complex configs
export type FlagsSchema = Record<string, FlagValue | FlagConfig>

// Type for the function that defines feature flags, which can be sync or async
export type FeatureFlagsConfig =
  | FlagsSchema
  | ((context?: H3EventContext) => FlagsSchema | Promise<FlagsSchema>)

// Type for the resolved flag after processing
export interface ResolvedFlag {
  enabled: boolean
  value?: FlagValue
  variant?: string
}

// The structure for resolved feature flags
export interface ResolvedFlags {
  [key: string]: ResolvedFlag
}

// Configuration options for the feature flags module
export interface FeatureFlagsConfigOptions {
  config?: string // Path to the config file
  flags?: FlagsSchema // Inline flag definitions
  cacheTTL?: number // Time-to-live for the server cache in milliseconds
}
