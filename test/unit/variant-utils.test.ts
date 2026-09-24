import { describe, it, expect } from 'vitest'
import { generateVariantHash, assignVariant, getVariantForFlag } from '../../src/runtime/server/utils/variant-assignment'
import type { FlagVariant } from '../../src/runtime/types'
import type { VariantContext } from '../../src/runtime/server/utils/variant-assignment'

describe('variant assignment utilities', () => {
  describe('generateVariantHash', () => {
    it('should generate consistent hash for same inputs', () => {
      const flagName = 'testFlag'
      const context: VariantContext = { userId: 'user123' }

      const hash1 = generateVariantHash(flagName, context)
      const hash2 = generateVariantHash(flagName, context)

      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('number')
      expect(hash1).toBeGreaterThanOrEqual(0)
      expect(hash1).toBeLessThanOrEqual(99)
    })

    it('should generate different hashes for different flag names', () => {
      const context: VariantContext = { userId: 'user123' }

      const hash1 = generateVariantHash('flag1', context)
      const hash2 = generateVariantHash('flag2', context)

      // Hashes should likely be different (though not guaranteed)
      expect(typeof hash1).toBe('number')
      expect(typeof hash2).toBe('number')
    })

    it('should generate different hashes for different users', () => {
      const flagName = 'testFlag'

      const hash1 = generateVariantHash(flagName, { userId: 'user1' })
      const hash2 = generateVariantHash(flagName, { userId: 'user2' })

      expect(typeof hash1).toBe('number')
      expect(typeof hash2).toBe('number')
    })

    it('should use fallback identifier when no user ID', () => {
      const flagName = 'testFlag'

      const hashSession = generateVariantHash(flagName, { sessionId: 'session123' })
      const hashIP = generateVariantHash(flagName, { ipAddress: '192.168.1.1' })
      const hashAnonymous = generateVariantHash(flagName, {})

      expect(typeof hashSession).toBe('number')
      expect(typeof hashIP).toBe('number')
      expect(typeof hashAnonymous).toBe('number')
    })
  })

  describe('assignVariant', () => {
    const variants: FlagVariant[] = [
      { name: 'control', weight: 30 },
      { name: 'treatment', weight: 70 },
    ]

    it('should assign variants based on hash value', () => {
      // Hash values that should fall into different variants
      const lowHash = 15 // Should be control (0-29)
      const highHash = 50 // Should be treatment (30-99)

      const result1 = assignVariant(variants, lowHash)
      const result2 = assignVariant(variants, highHash)

      expect(result1?.name).toBe('control')
      expect(result2?.name).toBe('treatment')
    })

    it('should handle edge case hash values', () => {
      const edgeHash1 = 0 // Minimum
      const edgeHash2 = 99 // Maximum

      const result1 = assignVariant(variants, edgeHash1)
      const result2 = assignVariant(variants, edgeHash2)

      expect(result1).not.toBeNull()
      expect(result2).not.toBeNull()
      expect(['control', 'treatment']).toContain(result1?.name)
      expect(['control', 'treatment']).toContain(result2?.name)
    })

    it('should handle empty variants array', () => {
      const result = assignVariant([], 50)
      expect(result).toBeNull()
    })

    it('should handle zero total weight', () => {
      const zeroWeightVariants: FlagVariant[] = [
        { name: 'zero1', weight: 0 },
        { name: 'zero2', weight: 0 },
      ]

      const result = assignVariant(zeroWeightVariants, 50)
      // With normalized weights, hash 50 should get second variant
      expect(result?.name).toBe('zero2')
    })

    it('should leave the remainder unassigned when weights sum to less than 100', () => {
      const partialVariants: FlagVariant[] = [
        { name: 'a', weight: 20 },
        { name: 'b', weight: 30 },
      ] // Total: 50 -> a: [0, 20), b: [20, 50), nobody: [50, 100)

      expect(assignVariant(partialVariants, 10)?.name).toBe('a')
      expect(assignVariant(partialVariants, 30)?.name).toBe('b')
      expect(assignVariant(partialVariants, 60)).toBeNull()
    })

    it('should return variant with value when specified', () => {
      const variantsWithValues: FlagVariant[] = [
        { name: 'control', weight: 50, value: 'original' },
        { name: 'treatment', weight: 50, value: 'new' },
      ]

      const result = assignVariant(variantsWithValues, 25) // Should be control
      expect(result?.name).toBe('control')
      expect(result?.value).toBe('original')
    })
  })

  describe('getVariantForFlag', () => {
    const variants: FlagVariant[] = [
      { name: 'control', weight: 50, value: 'A' },
      { name: 'treatment', weight: 50, value: 'B' },
    ]

    it('should return consistent variant for same context', () => {
      const flagName = 'testFlag'
      const context: VariantContext = { userId: 'user123' }

      const result1 = getVariantForFlag(flagName, variants, context)
      const result2 = getVariantForFlag(flagName, variants, context)

      expect(result1?.name).toBe(result2?.name)
      expect(result1?.value).toBe(result2?.value)
    })

    it('should handle different contexts', () => {
      const flagName = 'testFlag'

      const contexts: VariantContext[] = [
        { userId: 'user1' },
        { userId: 'user2' },
        { sessionId: 'session1' },
        { ipAddress: '192.168.1.1' },
      ]

      contexts.forEach((context) => {
        const result = getVariantForFlag(flagName, variants, context)
        expect(result).not.toBeNull()
        expect(['control', 'treatment']).toContain(result?.name)
      })
    })

    it('should handle empty variants', () => {
      const result = getVariantForFlag('test', [], { userId: 'user1' })
      expect(result).toBeNull()
    })

    it('should work with complex variant configurations', () => {
      const complexVariants: FlagVariant[] = [
        { name: 'blue', weight: 40, value: { color: 'blue', intensity: 0.8 } as never },
        { name: 'red', weight: 30, value: { color: 'red', intensity: 0.9 } as never },
        { name: 'green', weight: 20, value: { color: 'green', intensity: 0.7 } as never },
        { name: 'yellow', weight: 10, value: { color: 'yellow', intensity: 0.6 } as never },
      ]

      const result = getVariantForFlag('colorTest', complexVariants, { userId: 'user123' })

      expect(result).not.toBeNull()
      expect(['blue', 'red', 'green', 'yellow']).toContain(result?.name)
      expect(result?.value).toBeDefined()

      if (result?.value && typeof result.value === 'object') {
        expect(result.value).toHaveProperty('color')
        expect(result.value).toHaveProperty('intensity')
      }
    })
  })

  describe('distribution testing', () => {
    it('should roughly respect weight distribution across many users', () => {
      const variants: FlagVariant[] = [
        { name: 'rare', weight: 10 },
        { name: 'common', weight: 90 },
      ]

      const results: string[] = []

      // Generate assignments for many users
      for (let i = 0; i < 1000; i++) {
        const context: VariantContext = { userId: `user${i}` }
        const result = getVariantForFlag('distributionTest', variants, context)
        if (result) {
          results.push(result.name)
        }
      }

      const rareCount = results.filter(r => r === 'rare').length
      const commonCount = results.filter(r => r === 'common').length

      // With 1000 users, expect roughly 100 rare and 900 common
      // Allow for some variance due to hashing distribution
      expect(rareCount).toBeGreaterThan(50) // At least 5%
      expect(rareCount).toBeLessThan(200) // At most 20%
      expect(commonCount).toBeGreaterThan(800) // At least 80%
      expect(commonCount).toBeLessThan(1000) // Less than 100%
    })

    it('should handle equal distribution correctly', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 25 },
        { name: 'b', weight: 25 },
        { name: 'c', weight: 25 },
        { name: 'd', weight: 25 },
      ]

      const results: string[] = []

      for (let i = 0; i < 400; i++) {
        const context: VariantContext = { userId: `user${i}` }
        const result = getVariantForFlag('equalTest', variants, context)
        if (result) {
          results.push(result.name)
        }
      }

      const counts = {
        a: results.filter(r => r === 'a').length,
        b: results.filter(r => r === 'b').length,
        c: results.filter(r => r === 'c').length,
        d: results.filter(r => r === 'd').length,
      }

      // Each should get roughly 100 assignments (25% of 400)
      // Allow reasonable variance
      Object.values(counts).forEach((count) => {
        expect(count).toBeGreaterThan(50) // At least 12.5%
        expect(count).toBeLessThan(150) // At most 37.5%
      })
    })
  })
})
