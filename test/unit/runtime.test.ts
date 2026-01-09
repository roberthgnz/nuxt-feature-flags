import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAsyncFeatureFlags } from '~/src/runtime/app/composables/use-async-feature-flags'
import { getFeatureFlags } from '~/src/runtime/server/utils/feature-flags'
import { vFeature } from '~/src/runtime/app/directives/feature'
import { useFetch, useRuntimeConfig, useFeatureFlags } from '#imports'
import { setupMocks } from '../utils'

describe('Runtime Functionality', () => {
  beforeEach(() => {
    setupMocks()
  })

  describe('useAsyncFeatureFlags', () => {
    it('should fetch and return feature flags', async () => {
      const mockFlags = { 'new-feature': { enabled: true, value: true } }
      useFetch.mockResolvedValueOnce({ data: { value: mockFlags } })

      const { flags, pending, error } = useAsyncFeatureFlags()

      expect(pending.value).toBe(true)
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for next tick
      expect(pending.value).toBe(false)
      expect(error.value).toBe(null)
      expect(flags.value).toEqual(mockFlags)
    })
  })

  describe('getFeatureFlags (A/B Testing)', () => {
    it('should provide persistent variant assignment', async () => {
      useRuntimeConfig.mockReturnValue({
        public: {
          featureFlags: {
            config: {
              abTest: {
                value: 'control',
                variants: [
                  { name: 'control', value: 'control', weight: 50 },
                  { name: 'treatment', value: 'treatment', weight: 50 },
                ],
              },
            },
          },
        },
      })

      const event1 = { context: { user: { id: 'user-123' } } }
      const event2 = { context: { user: { id: 'user-123' } } }

      const { getVariant: getVariant1 } = await getFeatureFlags(event1)
      const { getVariant: getVariant2 } = await getFeatureFlags(event2)

      expect(getVariant1('abTest')).toBe(getVariant2('abTest'))
    })
  })

  describe('v-feature directive', () => {
    it('should remove the element if the feature is disabled', () => {
      const el = { parentNode: { removeChild: vi.fn() } }
      const binding = { value: 'disabled-feature' }
      useFeatureFlags.mockReturnValue({ isEnabled: () => false })
      vFeature.mounted(el, binding)
      expect(el.parentNode.removeChild).toHaveBeenCalledWith(el)
    })
  })
})
