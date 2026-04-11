import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isVerboseLoggingEnabled, logDebug, logger } from '../../src/utils/logger'

// Mock @nuxt/kit
vi.mock('@nuxt/kit', () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(),
  })),
}))

describe('logger utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset process.env before each test
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isVerboseLoggingEnabled', () => {
    it('should return true when NUXT_FEATURE_FLAGS_VERBOSE is "true"', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'true'
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'false'
      expect(isVerboseLoggingEnabled()).toBe(true)
    })

    it('should return true when NUXT_FEATURE_FLAGS_DEBUG is "true"', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'false'
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'true'
      expect(isVerboseLoggingEnabled()).toBe(true)
    })

    it('should return false when both are "false"', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'false'
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'false'
      expect(isVerboseLoggingEnabled()).toBe(false)
    })

    it('should return false when both are undefined', () => {
      delete process.env.NUXT_FEATURE_FLAGS_VERBOSE
      delete process.env.NUXT_FEATURE_FLAGS_DEBUG
      expect(isVerboseLoggingEnabled()).toBe(false)
    })

    it('should return true when both are "true"', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'true'
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'true'
      expect(isVerboseLoggingEnabled()).toBe(true)
    })
  })

  describe('logDebug', () => {
    it('should call logger.debug when verbose logging is enabled', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'true'

      logDebug('test message', { foo: 'bar' })

      expect(logger.debug).toHaveBeenCalledWith('test message', { foo: 'bar' })
    })

    it('should not call logger.debug when verbose logging is disabled', () => {
      process.env.NUXT_FEATURE_FLAGS_VERBOSE = 'false'
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'false'

      logDebug('test message')

      expect(logger.debug).not.toHaveBeenCalled()
    })

    it('should call logger.debug when NUXT_FEATURE_FLAGS_DEBUG is "true"', () => {
      delete process.env.NUXT_FEATURE_FLAGS_VERBOSE
      process.env.NUXT_FEATURE_FLAGS_DEBUG = 'true'

      logDebug('another debug message')

      expect(logger.debug).toHaveBeenCalledWith('another debug message')
    })
  })
})
