import { describe, it, expect, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import { setupMocks } from '../utils'
import { getFeatureFlags } from '~/src/runtime/server/utils/feature-flags'
import { useRuntimeConfig } from '#imports'

describe('getFeatureFlags server util', () => {
  beforeEach(() => {
    setupMocks()
    useRuntimeConfig.mockReturnValue({
      public: {
        featureFlags: {
          flags: {
            simpleFlag: true,
            disabledFlag: false,
            complexFlag: {
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
  })

  it('should return flags', async () => {
    const { flags } = await getFeatureFlags({
      context: {},
      node: {
        req: {
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        },
      },
    } as unknown as H3Event)
    expect(flags).toBeDefined()
    expect(flags.simpleFlag.enabled).toBe(true)
  })
})
