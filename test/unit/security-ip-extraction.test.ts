import { describe, it, expect } from 'vitest'
import { generateVariantHash } from '../../src/runtime/server/utils/variant-assignment'
import { createTestEvent, loadServerUtils } from '../utils'

describe('visitor IP extraction', () => {
  it('buckets anonymous visitors behind a proxy by the client IP from x-forwarded-for', async () => {
    const variants = [{ name: 'low', weight: 50 }, { name: 'high', weight: 50 }]
    const { resolveFeatureFlags } = await loadServerUtils({ exp: { enabled: true, variants } })

    // Pick a client IP whose bucket differs from the proxy's, so the assertion is meaningful.
    const proxy = '10.0.0.1'
    const proxyBucket = generateVariantHash('exp', { ipAddress: proxy }) < 50 ? 'low' : 'high'
    const client = Array.from({ length: 50 }, (_, i) => `203.0.113.${i}`)
      .find(ip => (generateVariantHash('exp', { ipAddress: ip }) < 50 ? 'low' : 'high') !== proxyBucket)!

    const flags = await resolveFeatureFlags(createTestEvent({ ip: proxy, headers: { 'x-forwarded-for': `${client}, ${proxy}` } }))

    expect(flags.exp?.variant).not.toBe(proxyBucket)
  })
})
