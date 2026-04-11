import { describe, it, expect, vi } from 'vitest'
import type { FlagVariant } from '../../src/types/feature-flags'

// Mock crypto module with different return values for different inputs
const mockDigest = vi.fn()
vi.mock('node:crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: mockDigest,
  }),
}))

const { assignVariant, normalizeWeights, generateVariantHash, getVariantForFlag } = await import('../../src/runtime/server/utils/variant-assignment')

describe('variant assignment', () => {
  describe('normalizeWeights', () => {
    it('should normalize weights that sum to 100', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const normalized = normalizeWeights(variants)

      expect(normalized).toEqual([
        { name: 'control', weight: 50, cumulativeWeight: 50 },
        { name: 'treatment', weight: 50, cumulativeWeight: 100 },
      ])
    })

    it('should normalize weights that sum to less than 100', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 30 },
        { name: 'treatment', weight: 20 },
      ]

      const normalized = normalizeWeights(variants)

      expect(normalized).toEqual([
        { name: 'control', weight: 60, cumulativeWeight: 60 },
        { name: 'treatment', weight: 40, cumulativeWeight: 100 },
      ])
    })

    it('should handle single variant', () => {
      const variants: FlagVariant[] = [
        { name: 'single', weight: 100 },
      ]

      const normalized = normalizeWeights(variants)

      expect(normalized).toEqual([
        { name: 'single', weight: 100, cumulativeWeight: 100 },
      ])
    })

    it('should handle zero weights', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 0 },
        { name: 'treatment', weight: 0 },
      ]

      const normalized = normalizeWeights(variants)

      expect(normalized).toEqual([
        { name: 'control', weight: 50, cumulativeWeight: 50 },
        { name: 'treatment', weight: 50, cumulativeWeight: 100 },
      ])
    })

    it('should handle equal weights', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 25 },
        { name: 'b', weight: 25 },
        { name: 'c', weight: 25 },
        { name: 'd', weight: 25 },
      ]

      const normalized = normalizeWeights(variants)

      expect(normalized).toHaveLength(4)
      expect(normalized[0].weight).toBe(25)
      expect(normalized[3].cumulativeWeight).toBe(100)
    })
  })

  describe('assignVariant', () => {
    it('should assign variants consistently for same context', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const result1 = assignVariant(variants, 25)
      const result2 = assignVariant(variants, 25)

      expect(result1?.name).toBe(result2?.name)
      expect(result1?.weight).toBe(result2?.weight)
    })

    it('should respect variant weights distribution', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 80 },
        { name: 'treatment', weight: 20 },
      ]

      const results: string[] = []
      for (let i = 0; i < 100; i++) {
        const result = assignVariant(variants, i)
        if (result) {
          results.push(result.name)
        }
      }

      const controlCount = results.filter(r => r === 'control').length
      expect(controlCount).toBeGreaterThan(70) // Should be around 80
    })

    it('should handle variant values', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50, value: 'original' },
        { name: 'treatment', weight: 50, value: 'new' },
      ]

      const result = assignVariant(variants, 25)

      expect(result).not.toBeNull()
      expect(['control', 'treatment']).toContain(result!.name)
      expect(['original', 'new']).toContain(result!.value)
    })

    it('should handle missing variant values', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50, value: 'new' },
      ]

      const result = assignVariant(variants, 25)

      expect(result).not.toBeNull()
      if (result!.name === 'control') {
        expect(result!.value).toBeUndefined()
      }
      else if (result!.name === 'treatment') {
        expect(result!.value).toBe('new')
      }
    })

    it('should handle different context types', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const result1 = assignVariant(variants, 25)
      const result2 = assignVariant(variants, 75)

      expect(result1).not.toBeNull()
      expect(result2).not.toBeNull()
      // Different hashes might assign different variants
      expect(['control', 'treatment']).toContain(result1!.name)
      expect(['control', 'treatment']).toContain(result2!.name)
    })
  })

  describe('generateVariantHash', () => {
    it('should generate consistent hash for same input', () => {
      mockDigest.mockReturnValue('6b51d431df5d7f141cbececcf7b427ba')

      const context = { userId: 'user123' }

      const hash1 = generateVariantHash('test-flag', context)
      const hash2 = generateVariantHash('test-flag', context)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different flags', () => {
      let callCount = 0
      mockDigest.mockImplementation(() => {
        callCount++
        return callCount === 1 ? '6b51d431df5d7f141cbececcf7b427ba' : 'abcd1234efgh5678ijkl9012mnop3456'
      })

      const context = { userId: 'user123' }

      const hash1 = generateVariantHash('flag1', context)
      const hash2 = generateVariantHash('flag2', context)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate different hashes for different users', () => {
      let callCount = 0
      mockDigest.mockImplementation(() => {
        callCount++
        return callCount === 1 ? '6b51d431df5d7f141cbececcf7b427ba' : 'abcd1234efgh5678ijkl9012mnop3456'
      })

      const hash1 = generateVariantHash('test-flag', { userId: 'user1' })
      const hash2 = generateVariantHash('test-flag', { userId: 'user2' })

      expect(hash1).not.toBe(hash2)
    })

    it('should fallback to sessionId when userId is not available', () => {
      mockDigest.mockReturnValue('6b51d431df5d7f141cbececcf7b427ba')

      const context = { sessionId: 'session123' }

      const hash = generateVariantHash('test-flag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })

    it('should fallback to ipAddress when userId and sessionId are not available', () => {
      mockDigest.mockReturnValue('6b51d431df5d7f141cbececcf7b427ba')

      const context = { ipAddress: '192.168.1.1' }

      const hash = generateVariantHash('test-flag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })

    it('should use anonymous fallback when no context is available', () => {
      mockDigest.mockReturnValue('6b51d431df5d7f141cbececcf7b427ba')

      const context = {}

      const hash = generateVariantHash('test-flag', context)

      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(100)
    })
  })

  describe('getVariantForFlag', () => {
    it('should return null for empty variants', () => {
      const result = getVariantForFlag('test-flag', [], { userId: 'user123' })

      expect(result).toBeNull()
    })

    it('should return a variant for valid input', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const result = getVariantForFlag('test-flag', variants, { userId: 'user123' })

      expect(result).not.toBeNull()
      expect(['control', 'treatment']).toContain(result!.name)
    })

    it('should be consistent for same inputs', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      const result1 = getVariantForFlag('test-flag', variants, { userId: 'user123' })
      const result2 = getVariantForFlag('test-flag', variants, { userId: 'user123' })

      expect(result1?.name).toBe(result2?.name)
    })
  })

  describe('edge cases', () => {
    it('should handle empty variant array', () => {
      const result = assignVariant([], 50)

      expect(result).toBeNull()
    })

    it('should handle variants with zero total weight', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 0 },
        { name: 'treatment', weight: 0 },
      ]

      const result = assignVariant(variants, 50)

      expect(result).not.toBeNull()
      expect(['control', 'treatment']).toContain(result!.name)
    })

    it('should handle very large weight values', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 1000 },
        { name: 'treatment', weight: 2000 },
      ]

      const result = assignVariant(variants, 50)

      expect(result).not.toBeNull()
      expect(['control', 'treatment']).toContain(result!.name)
    })

    it('should handle decimal weights', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 33.33 },
        { name: 'treatment', weight: 66.67 },
      ]

      const result = assignVariant(variants, 50)

      expect(result).not.toBeNull()
      expect(['control', 'treatment']).toContain(result!.name)
    })
  })
})
