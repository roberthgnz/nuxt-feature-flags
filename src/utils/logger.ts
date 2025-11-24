import { useLogger } from '@nuxt/kit'
import type { ConsolaInstance } from 'consola'

export const logger: ConsolaInstance = useLogger('nuxt-feature-flags')

// Check if verbose logging is enabled via environment variable
export const isVerboseLoggingEnabled = (): boolean => {
    return process.env.NUXT_FEATURE_FLAGS_VERBOSE === 'true' ||
        process.env.NUXT_FEATURE_FLAGS_DEBUG === 'true'
}

// Helper for debug logging that respects verbose flag
export const logDebug = (message: string, ...args: any[]): void => {
    if (isVerboseLoggingEnabled()) {
        logger.debug(message, ...args)
    }
}
