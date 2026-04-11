import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

describe('config file integration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('server runtime', () => {
    it('reads flags from runtime config public.featureFlags.flags', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: () => ({
          public: {
            featureFlags: {
              flags: {
                featureA: true,
                featureB: {
                  enabled: true,
                  value: 'B',
                },
              },
            },
          },
        }),
      }))

      vi.doMock('#feature-flags/config', () => ({
        default: {},
      }))

      const { getFeatureFlags } = await import('../../src/runtime/server/utils/feature-flags')

      const event = {
        node: {
          req: {
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
          },
        },
        context: {},
      } as H3Event

      const result = await getFeatureFlags(event)

      expect(result.flags.featureA).toBeDefined()
      expect(result.flags.featureA.enabled).toBe(true)
      expect(result.flags.featureB.value).toBe('B')
    })

    it('returns empty object when no flags are configured', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: () => ({
          public: {
            featureFlags: {
              flags: {},
            },
          },
        }),
      }))

      vi.doMock('#feature-flags/config', () => ({
        default: {},
      }))

      const { getFeatureFlags } = await import('../../src/runtime/server/utils/feature-flags')

      const result = await getFeatureFlags({
        node: {
          req: {
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
          },
        },
        context: {},
      } as H3Event)

      expect(result.flags).toEqual({})
    })

    it('resolves a variant when variant definitions are present', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: () => ({
          public: {
            featureFlags: {
              flags: {
                abTest: {
                  enabled: true,
                  value: 'default',
                  variants: [
                    { name: 'control', weight: 50, value: 'A' },
                    { name: 'treatment', weight: 50, value: 'B' },
                  ],
                },
              },
            },
          },
        }),
      }))

      vi.doMock('#feature-flags/config', () => ({
        default: {},
      }))

      const { getFeatureFlags } = await import('../../src/runtime/server/utils/feature-flags')

      const result = await getFeatureFlags({
        node: {
          req: {
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
          },
        },
        context: { user: { id: 'user-123' } },
      } as H3Event)

      expect(result.flags.abTest).toBeDefined()
      expect(['control', 'treatment']).toContain(result.flags.abTest.variant)
      expect(['A', 'B']).toContain(result.flags.abTest.value)
    })
  })

  describe('client composables', () => {
    it('useAsyncFeatureFlags exposes fetched state', async () => {
      const mockFlags = {
        featureA: { enabled: true, value: true },
      }

      vi.doMock('#imports', () => ({
        useNuxtApp: () => ({
          $featureFlags: {},
        }),
        useState: (_key: string, init: () => unknown) => ({
          value: init(),
        }),
        useFetch: () => ({
          data: { value: mockFlags },
          pending: { value: false },
          error: { value: null },
          refresh: vi.fn().mockResolvedValue(undefined),
        }),
      }))

      const { useAsyncFeatureFlags } = await import('../../src/runtime/app/composables/use-async-feature-flags')

      const { flags, pending, error } = useAsyncFeatureFlags()

      expect(flags.value).toEqual(mockFlags)
      expect(pending.value).toBe(false)
      expect(error.value).toBe(null)
    })

    it('useFeatureFlags exposes utility methods over $featureFlags', async () => {
      vi.doMock('#imports', () => ({
        useNuxtApp: () => ({
          $featureFlags: {
            enabledFlag: { enabled: true, value: true },
            disabledFlag: { enabled: false, value: false },
            variantFlag: { enabled: true, variant: 'variantA', value: 'A' },
          },
        }),
      }))

      const { useFeatureFlags } = await import('../../src/runtime/app/composables/feature-flags')

      const { isEnabled, getVariant, getValue } = useFeatureFlags()

      expect(isEnabled('enabledFlag')).toBe(true)
      expect(isEnabled('disabledFlag')).toBe(false)
      expect(isEnabled('missingFlag')).toBe(false)

      expect(getVariant('variantFlag')).toBe('variantA')
      expect(getVariant('enabledFlag')).toBeUndefined()

      expect(getValue('enabledFlag')).toBe(true)
      expect(getValue('variantFlag')).toBe('A')
    })
  })
})
