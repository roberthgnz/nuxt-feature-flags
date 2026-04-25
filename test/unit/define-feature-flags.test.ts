import { describe, it, expect } from 'vitest'
import { defineFeatureFlags } from '~/src/runtime/server/handlers/feature-flags'
import type { ConfigContext } from '~/src/runtime/server/handlers/feature-flags'

describe('defineFeatureFlags', () => {
  it('should return the passed callback function (identity)', () => {
    const callback = () => ({ flag: true })
    const result = defineFeatureFlags(callback)
    expect(result).toBe(callback)
  })

  it('should return a function that produces expected flags when called', () => {
    const flags = { myFlag: true }
    const callback = () => flags
    const result = defineFeatureFlags(callback)
    expect(result()).toEqual(flags)
  })

  it('should support asynchronous callbacks', async () => {
    const flags = { asyncFlag: 'value' }
    const callback = async () => flags
    const result = defineFeatureFlags(callback)
    const resolvedFlags = await result()
    expect(resolvedFlags).toEqual(flags)
  })

  it('should pass context to the callback correctly', () => {
    const callback = (context?: ConfigContext | Record<string, unknown>) => ({
      isDev: (context as ConfigContext | undefined)?.isDev ?? false,
    })
    const result = defineFeatureFlags(callback)

    expect(result({ isDev: true } as ConfigContext)).toEqual({ isDev: true })
    expect(result({ isDev: false } as ConfigContext)).toEqual({ isDev: false })
    expect(result()).toEqual({ isDev: false })
  })
})
