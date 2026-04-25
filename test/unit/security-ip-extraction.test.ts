import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import { setupMocks } from '../utils'
import { getFeatureFlags } from '~/src/runtime/server/utils/feature-flags'
import { useRuntimeConfig } from '#imports'

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    getRequestIP: vi.fn(),
  }
})

describe('getFeatureFlags security - IP extraction', () => {
  beforeEach(() => {
    setupMocks()
    vi.clearAllMocks()
    useRuntimeConfig.mockReturnValue({
      public: {
        featureFlags: {
          flags: {
            testFlag: {
              value: 'off',
              variants: [
                { name: 'on', value: 'on', weight: 100 },
              ],
            },
          },
        },
      },
    })
  })

  it('should use getRequestIP with xForwardedFor: true', async () => {
    const mockEvent = {
      context: {},
      node: {
        req: {
          headers: {
            'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          },
        },
      },
    } as unknown as H3Event

    vi.mocked(getRequestIP).mockReturnValue('1.2.3.4')

    await getFeatureFlags(mockEvent)

    expect(getRequestIP).toHaveBeenCalledWith(mockEvent, { xForwardedFor: true })
  })
})
