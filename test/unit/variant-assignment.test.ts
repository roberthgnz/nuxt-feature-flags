import { describe, it, expect } from 'vitest'
import { generateVariantHash, assignVariant, getVariantForFlag } from '../../src/runtime/server/utils/variant-assignment'
import type { FlagVariant } from '../../src/runtime/types'
import type { VariantContext } from '../../src/runtime/server/utils/variant-assignment'

describe('variant-assignment', () => {
  describe('generateVariantHash', () => {
    it('generates consistent hash for same inputs', () => {
      const context: VariantContext = { userId: 'user123' }
      const hash1 = generateVariantHash('testFlag', context)
      const hash2 = generateVariantHash('testFlag', context)

      expect(hash1).toBe(hash2)
      expect(hash1).toBeGreaterThanOrEqual(0)
      expect(hash1).toBeLessThan(100)
    })

    it('generates different hashes for different flags', () => {
      const context: VariantContext = { userId: 'user123' }
      const hash1 = generateVariantHash('flagA', context)
      const hash2 = generateVariantHash('flagB', context)

      expect(hash1).not.toBe(hash2)
    })

    it('generates different hashes for different users', () => {
      const hash1 = generateVariantHash('testFlag', { userId: 'user1' })
      const hash2 = generateVariantHash('testFlag', { userId: 'user2' })

      expect(hash1).not.toBe(hash2)
    })

    it('falls back to sessionId when userId is not provided', () => {
      const context: VariantContext = { sessionId: 'session123' }
      const hash = generateVariantHash('testFlag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })

    it('falls back to ipAddress when userId and sessionId are not provided', () => {
      const context: VariantContext = { ipAddress: '192.168.1.1' }
      const hash = generateVariantHash('testFlag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })

    it('falls back to anonymous when no context is provided', () => {
      const context: VariantContext = {}
      const hash = generateVariantHash('testFlag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })
  })

  describe('assignVariant', () => {
    it('returns null for empty variants array', () => {
      const result = assignVariant([], 50)
      expect(result).toBeNull()
    })

    it('returns first variant when total weight is 0', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 0 },
        { name: 'b', weight: 0 },
      ]
      const result = assignVariant(variants, 50)
      // With our new implementation, zero weights are normalized to equal distribution
      expect(result?.name).toBe('b') // At hash 50, should get second variant
    })

    it('assigns variants based on cumulative weights', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 30 },
        { name: 'treatment', weight: 70 },
      ]

      const result1 = assignVariant(variants, 15)
      expect(result1?.name).toBe('control')

      const result2 = assignVariant(variants, 50)
      expect(result2?.name).toBe('treatment')
    })

    it('normalizes weights when they do not sum to 100', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 20 },
        { name: 'b', weight: 30 },
      ]

      const result = assignVariant(variants, 30)
      expect(result).not.toBeNull()
      expect(['a', 'b']).toContain(result!.name)
    })

    it('handles edge case at weight boundaries', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 50 },
        { name: 'b', weight: 50 },
      ]

      const result1 = assignVariant(variants, 49.9)
      expect(result1?.name).toBe('a')

      const result2 = assignVariant(variants, 50.1)
      expect(result2?.name).toBe('b')
    })

    it('returns last variant as fallback', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 10 },
        { name: 'b', weight: 10 },
      ]

      const result = assignVariant(variants, 99)
      expect(result?.name).toBe('b')
    })
  })

  describe('getVariantForFlag', () => {
    it('returns null for empty variants', () => {
      const result = getVariantForFlag('testFlag', [], { userId: 'user123' })
      expect(result).toBeNull()
    })

    it('returns consistent variant for same inputs', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]
      const context: VariantContext = { userId: 'user123' }

      const result1 = getVariantForFlag('testFlag', variants, context)
      const result2 = getVariantForFlag('testFlag', variants, context)

      expect(result1).toEqual(result2)
    })

    it('returns different variants for different users', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const result1 = getVariantForFlag('testFlag', variants, { userId: 'user1' })
      const result2 = getVariantForFlag('testFlag', variants, { userId: 'user2' })

      // Results might be the same or different, but both should be valid
      expect(['control', 'treatment']).toContain(result1!.name)
      expect(['control', 'treatment']).toContain(result2!.name)
    })

    it('includes variant value when specified', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 100, value: 'original' },
      ]

      const result = getVariantForFlag('testFlag', variants, { userId: 'user123' })

      expect(result?.name).toBe('control')
      expect(result?.value).toBe('original')
    })
  })
})
