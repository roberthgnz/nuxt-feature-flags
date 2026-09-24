import { describe, it, expect } from 'vitest'
import { defineFeatureFlags } from '../../src/runtime/server/handlers/feature-flags'
import type { FlagsContext } from '../../src/runtime/types'

describe('defineFeatureFlags', () => {
  it('returns a flags object untouched', () => {
    const flags = { myFlag: true }
    expect(defineFeatureFlags(flags)).toBe(flags)
  })

  it('returns a config function untouched', async () => {
    const config = async (context: FlagsContext) => ({ isAdmin: context.user?.role === 'admin' })
    const defined = defineFeatureFlags(config)

    expect(defined).toBe(config)
    expect(await config({ user: { role: 'admin' } } as FlagsContext)).toEqual({ isAdmin: true })
  })
})
