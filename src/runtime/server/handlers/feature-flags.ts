import type { H3EventContext } from 'h3'
import type { FlagDefinition } from '../../types'

/**
 * Context passed to config functions during evaluation
 */
export interface ConfigContext {
  /** Whether the application is in development mode */
  isDev: boolean
  /** Whether the application is in production mode */
  isProduction: boolean
  /** Root directory of the project */
  rootDir: string
  /** Current phase: 'build' during module setup, 'runtime' during request handling */
  phase: 'build' | 'runtime'
}

/**
 * Define feature flags with optional context-aware configuration
 * 
 * @param callback - Function that returns flag definitions, optionally using context
 * @returns The callback function for use in config files
 * 
 * @example
 * // Simple usage without context
 * export default defineFeatureFlags(() => ({
 *   myFlag: true
 * }))
 * 
 * @example
 * // Context-aware configuration
 * export default defineFeatureFlags((context) => ({
 *   debugMode: context?.isDev ?? false,
 *   apiEndpoint: context?.isProduction ? 'https://api.prod.com' : 'http://localhost:3000'
 * }))
 */
export function defineFeatureFlags(callback: (context?: ConfigContext | H3EventContext) => FlagDefinition) {
  return callback
}
