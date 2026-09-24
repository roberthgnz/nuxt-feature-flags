import { describe, it, expect, vi, afterEach } from 'vitest'
import type { FlagsContext, FlagsSchema } from '../../src/runtime/types'
import { createTestEvent, loadServerUtils } from '../utils'

const experiment = {
  enabled: true,
  value: 'fallback',
  variants: [
    { name: 'control', weight: 50, value: 'original' },
    { name: 'treatment', weight: 50, value: 'new-design' },
  ],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveFlag', () => {
  it('resolves plain values by truthiness', async () => {
    const { resolveFlag } = await loadServerUtils({})
    expect(resolveFlag('a', true, {})).toEqual({ enabled: true, value: true })
    expect(resolveFlag('a', false, {})).toEqual({ enabled: false, value: false })
    expect(resolveFlag('a', 'blue', {})).toEqual({ enabled: true, value: 'blue' })
    expect(resolveFlag('a', 0, {})).toEqual({ enabled: false, value: 0 })
  })

  it('uses `enabled` over the value, and never assigns a variant to a disabled flag', async () => {
    const { resolveFlag } = await loadServerUtils({})
    expect(resolveFlag('a', { enabled: true, value: 0 }, {})).toEqual({ enabled: true, value: 0, variant: undefined })
    expect(resolveFlag('a', { ...experiment, enabled: false }, { userId: 'u1' })).toEqual({ enabled: false, value: 'fallback' })
  })

  it('falls back to the value when `enabled` is omitted', async () => {
    const { resolveFlag } = await loadServerUtils({})
    expect(resolveFlag('a', { value: 'x' }, {}).enabled).toBe(true)
    expect(resolveFlag('a', { value: '' }, {}).enabled).toBe(false)
  })

  it('exposes the variant value, or the flag value when the variant has none', async () => {
    const { resolveFlag } = await loadServerUtils({})
    const withValues = resolveFlag('exp', experiment, { userId: 'u1' })
    expect(['original', 'new-design']).toContain(withValues.value)
    expect(withValues.value).toBe(withValues.variant === 'control' ? 'original' : 'new-design')

    const withoutValue = resolveFlag('exp', { enabled: true, value: 'blue', variants: [{ name: 'only', weight: 100 }] }, {})
    expect(withoutValue).toEqual({ enabled: true, value: 'blue', variant: 'only' })
  })

  it('turns the flag off for visitors whose variant value is `false` (gradual rollout)', async () => {
    const { resolveFlag } = await loadServerUtils({})
    const rollout = { enabled: true, variants: [{ name: 'old', weight: 100, value: false }] }
    expect(resolveFlag('rollout', rollout, {})).toEqual({ enabled: false, value: false, variant: 'old' })
  })
})

describe('resolveFeatureFlags', () => {
  it('merges inline flags with the config file, the config file winning as a whole', async () => {
    const { resolveFeatureFlags } = await loadServerUtils(
      { shared: { enabled: true, variants: [{ name: 'fromConfig', weight: 100 }] }, configOnly: true },
      { flags: { shared: { enabled: true, variants: [{ name: 'fromInline', weight: 100 }] }, inlineOnly: 'yes' } },
    )

    const flags = await resolveFeatureFlags(createTestEvent())

    expect(flags.configOnly?.enabled).toBe(true)
    expect(flags.inlineOnly).toEqual({ enabled: true, value: 'yes' })
    // Not concatenated with the inline variants (100% "fromConfig").
    expect(flags.shared?.variant).toBe('fromConfig')
  })

  it('evaluates a config function with each request\'s own context, without leaking between visitors', async () => {
    const config = vi.fn((context: FlagsContext) => ({ isAdmin: context.user?.role === 'admin' }))
    const { resolveFeatureFlags } = await loadServerUtils(config)

    const admin = await resolveFeatureFlags(createTestEvent({ context: { user: { id: 1, role: 'admin' } } }))
    const visitor = await resolveFeatureFlags(createTestEvent({ context: { user: { id: 2, role: 'user' } } }))

    expect(admin.isAdmin?.enabled).toBe(true)
    expect(visitor.isAdmin?.enabled).toBe(false)
    expect(config).toHaveBeenCalledTimes(2)
  })

  it('supports async config functions', async () => {
    const { resolveFeatureFlags } = await loadServerUtils(async () => ({ remote: 'on' }))
    expect((await resolveFeatureFlags(createTestEvent())).remote).toEqual({ enabled: true, value: 'on' })
  })

  it('evaluates flags once per request', async () => {
    const config = vi.fn(() => ({ a: true }))
    const { resolveFeatureFlags, getFeatureFlags } = await loadServerUtils(config)
    const event = createTestEvent()

    await resolveFeatureFlags(event)
    await getFeatureFlags(event)
    await Promise.all([resolveFeatureFlags(event), resolveFeatureFlags(event)])

    expect(config).toHaveBeenCalledTimes(1)
  })

  it('shares a config function result across requests only when cacheTTL is set', async () => {
    vi.useFakeTimers()
    try {
      const config = vi.fn(async () => ({ a: true }))
      const { resolveFeatureFlags } = await loadServerUtils(config, { cacheTTL: 1000 })

      // Concurrent requests during a miss share one evaluation.
      await Promise.all([resolveFeatureFlags(createTestEvent()), resolveFeatureFlags(createTestEvent())])
      await resolveFeatureFlags(createTestEvent())
      expect(config).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      await resolveFeatureFlags(createTestEvent())
      expect(config).toHaveBeenCalledTimes(2)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('keeps the inline flags when the config function throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { resolveFeatureFlags } = await loadServerUtils(() => {
      throw new Error('flag service down')
    }, { flags: { inlineOnly: true } })

    const flags = await resolveFeatureFlags(createTestEvent())

    expect(flags).toEqual({ inlineOnly: { enabled: true, value: true } })
    expect(console.error).toHaveBeenCalled()
  })

  it('falls back to the shared cache when a cached config function starts failing', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      let fail = false
      const { resolveFeatureFlags } = await loadServerUtils(() => {
        if (fail) throw new Error('down')
        return { remote: true }
      }, { cacheTTL: 1000 })

      await resolveFeatureFlags(createTestEvent())
      fail = true
      vi.advanceTimersByTime(1001)

      expect((await resolveFeatureFlags(createTestEvent())).remote?.enabled).toBe(true)
    }
    finally {
      vi.useRealTimers()
    }
  })
})

describe('variant stickiness', () => {
  const configs: FlagsSchema = { exp: experiment }

  it('keeps the same variant for the same user across requests', async () => {
    const { resolveFeatureFlags } = await loadServerUtils(configs)
    const first = await resolveFeatureFlags(createTestEvent({ context: { user: { id: 'user-1' } }, ip: '1.1.1.1' }))
    const second = await resolveFeatureFlags(createTestEvent({ context: { user: { id: 'user-1' } }, ip: '2.2.2.2' }))
    expect(first.exp?.variant).toBeDefined()
    expect(second.exp?.variant).toBe(first.exp?.variant)
  })

  it('identifies visitors by user id, then session cookie, then IP', async () => {
    const { resolveFeatureFlags } = await loadServerUtils(configs)
    const { generateVariantHash } = await import('../../src/runtime/server/utils/variant-assignment')

    // Find two identifiers that land in different buckets, then check which one is used.
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`)
    const control = ids.find(id => generateVariantHash('exp', { userId: id }) < 50)!
    const treatment = ids.find(id => generateVariantHash('exp', { userId: id }) >= 50)!

    const variantFor = async (request: Parameters<typeof createTestEvent>[0]) =>
      (await resolveFeatureFlags(createTestEvent(request))).exp?.variant

    expect(await variantFor({ context: { user: { id: control } }, cookies: { session_id: treatment }, ip: treatment })).toBe('control')
    expect(await variantFor({ context: { userId: treatment }, cookies: { session_id: control } })).toBe('treatment')
    expect(await variantFor({ cookies: { 'nuxt-session': control }, ip: treatment })).toBe('control')
    expect(await variantFor({ headers: { 'x-forwarded-for': `${treatment}, 10.0.0.1` } })).toBe('treatment')
    expect(await variantFor({ ip: control })).toBe('control')
  })
})

describe('getFeatureFlags', () => {
  it('returns helpers over the resolved flags, including `flag:variant` checks', async () => {
    const { getFeatureFlags } = await loadServerUtils({ on: true, off: false, exp: { enabled: true, variants: [{ name: 'b', weight: 100, value: 'B' }] } })
    const { flags, isEnabled, getValue, getVariant } = await getFeatureFlags(createTestEvent())

    expect(flags.on?.enabled).toBe(true)
    expect(isEnabled('on')).toBe(true)
    expect(isEnabled('off')).toBe(false)
    expect(isEnabled('missing')).toBe(false)
    expect(isEnabled('exp:b')).toBe(true)
    expect(isEnabled('exp:a')).toBe(false)
    expect(getValue('exp')).toBe('B')
    expect(getVariant('exp')).toBe('b')
  })
})
