import { describe, it, expect, beforeEach } from 'vitest'
import { useFeatureFlags } from '~/src/runtime/app/composables/feature-flags'
import { setupMocks } from '../utils'
import { useNuxtApp } from '#imports'

describe('useFeatureFlags composable', () => {
  beforeEach(() => {
    setupMocks()
    useNuxtApp.mockReturnValue({
      $featureFlags: {
        simpleFlag: { enabled: true, value: true },
        disabledFlag: { enabled: false, value: false },
      },
    })
  })

  it('should return the correct isEnabled status', () => {
    const { isEnabled } = useFeatureFlags()
    expect(isEnabled('simpleFlag')).toBe(true)
    expect(isEnabled('disabledFlag')).toBe(false)
    expect(isEnabled('nonExistentFlag')).toBe(false)
  })
})
