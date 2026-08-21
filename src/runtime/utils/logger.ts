const PREFIX = '[nuxt-feature-flags]'

// Check if verbose logging is enabled via environment variable
export const isVerboseLoggingEnabled = (): boolean => {
  return process.env.NUXT_FEATURE_FLAGS_VERBOSE === 'true'
    || process.env.NUXT_FEATURE_FLAGS_DEBUG === 'true'
}

// Runtime-safe logger: avoids importing `@nuxt/kit` (a build-time-only
// package) into the Nitro/client bundle shipped to consumers.
export const logger = {
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => console.debug(PREFIX, ...args),
}

// Helper for debug logging that respects verbose flag
export const logDebug = (message: string, ...args: unknown[]): void => {
  if (isVerboseLoggingEnabled()) {
    logger.debug(message, ...args)
  }
}
