import { describe, it, expect } from 'vitest'
import {
  validateFlagNaming,
  validateVariants,
  validateFlagConfig,
  validateFlagDefinition,
  checkUndeclaredFlags,
} from '../../src/runtime/server/utils/validation'
import type { FlagVariant } from '../../src/runtime/types'

describe('validation', () => {
  describe('validateFlagNaming', () => {
    it('accepts valid flag names', () => {
      expect(validateFlagNaming('validFlag')).toBeNull()
      expect(validateFlagNaming('valid_flag')).toBeNull()
      expect(validateFlagNaming('valid-flag')).toBeNull()
      expect(validateFlagNaming('validFlag123')).toBeNull()
      expect(validateFlagNaming('a')).toBeNull()
    })

    it('rejects invalid flag names', () => {
      expect(validateFlagNaming('123invalid')).not.toBeNull()
      expect(validateFlagNaming('invalid flag')).not.toBeNull()
      expect(validateFlagNaming('invalid@flag')).not.toBeNull()
      expect(validateFlagNaming('invalid.flag')).not.toBeNull()
      expect(validateFlagNaming('')).not.toBeNull()
    })

    it('rejects excessively long flag names', () => {
      const longName = 'a'.repeat(51)
      expect(validateFlagNaming(longName)).not.toBeNull()
    })

    it('returns proper error details', () => {
      const result = validateFlagNaming('123invalid')
      expect(result).toMatchObject({
        flag: '123invalid',
        type: 'naming',
        error: expect.stringContaining('must start with a letter'),
      })
    })
  })

  describe('validateVariants', () => {
    it('accepts empty variants array', () => {
      const errors = validateVariants('testFlag', [])
      expect(errors).toHaveLength(0)
    })

    it('accepts valid variants', () => {
      const variants: FlagVariant[] = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(0)
    })

    it('detects duplicate variant names', () => {
      const variants: FlagVariant[] = [
        { name: 'duplicate', weight: 50 },
        { name: 'duplicate', weight: 50 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(1)
      expect(errors[0].error).toContain('Duplicate variant name')
    })

    it('validates variant weights are within range', () => {
      const variants: FlagVariant[] = [
        { name: 'negative', weight: -10 },
        { name: 'tooHigh', weight: 150 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(2) // out-of-range weights don't count towards the total
      expect(errors.some(e => e.error.includes('weight must be between 0 and 100'))).toBe(true)
    })

    it('detects when total weight exceeds 100', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 60 },
        { name: 'b', weight: 50 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(1)
      expect(errors[0].error).toContain('Total variant weights (110) exceed 100%')
    })

    it('validates variant names', () => {
      const variants: FlagVariant[] = [
        { name: '123invalid', weight: 50 },
        { name: 'valid', weight: 50 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(1)
      expect(errors[0].error).toContain('Variant name validation failed')
    })

    it('allows total weight less than 100', () => {
      const variants: FlagVariant[] = [
        { name: 'a', weight: 30 },
        { name: 'b', weight: 40 },
      ]
      const errors = validateVariants('testFlag', variants)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateFlagConfig', () => {
    it('validates simple flag values', () => {
      const errors = validateFlagConfig('validFlag', true)
      expect(errors).toHaveLength(0)
    })

    it('validates flag config objects', () => {
      const config = {
        enabled: true,
        value: 'test',
        variants: [
          { name: 'control', weight: 50 },
          { name: 'treatment', weight: 50 },
        ],
      }
      const errors = validateFlagConfig('validFlag', config)
      expect(errors).toHaveLength(0)
    })

    it('accepts a flag config without "enabled" (enabled when its value is truthy)', () => {
      expect(validateFlagConfig('testFlag', { value: 'test', variants: [] })).toEqual([])
    })

    it('requires "enabled" to be a boolean when present', () => {
      const errors = validateFlagConfig('testFlag', { enabled: 'yes' } as never)
      expect(errors).toHaveLength(1)
      expect(errors[0].error).toContain('"enabled" must be a boolean')
    })

    it('validates variants in flag config', () => {
      const config = {
        enabled: true,
        variants: [
          { name: 'duplicate', weight: 50 },
          { name: 'duplicate', weight: 60 },
        ],
      }
      const errors = validateFlagConfig('testFlag', config)
      expect(errors).toHaveLength(2) // Duplicate name + weight exceeds 100
    })

    it('requires variants to be an array', () => {
      const config = {
        enabled: true,
        variants: 'not-an-array',
      }
      const errors = validateFlagConfig('testFlag', config as never)
      expect(errors).toHaveLength(1)
      expect(errors[0].error).toContain('Variants must be an array')
    })

    it('validates flag naming', () => {
      const errors = validateFlagConfig('123invalid', true)
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('naming')
    })
  })

  describe('validateFlagDefinition', () => {
    it('validates multiple flags', () => {
      const flags = {
        validFlag: true,
        anotherFlag: { enabled: true },
        invalidFlag: { enabled: 'not-boolean' },
      }
      const errors = validateFlagDefinition(flags as never)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('returns no errors for valid definition', () => {
      const flags = {
        simpleFlag: true,
        complexFlag: {
          enabled: true,
          value: 'test',
          variants: [
            { name: 'control', weight: 50 },
            { name: 'treatment', weight: 50 },
          ],
        },
      }
      const errors = validateFlagDefinition(flags)
      expect(errors).toHaveLength(0)
    })
  })

  describe('checkUndeclaredFlags', () => {
    it('detects undeclared flags', () => {
      const declaredFlags = ['flagA', 'flagB']
      const usedFlags = ['flagA', 'flagC', 'flagD:variant']

      const errors = checkUndeclaredFlags(declaredFlags, usedFlags)
      expect(errors).toHaveLength(2)
      expect(errors[0].flag).toBe('flagC')
      expect(errors[1].flag).toBe('flagD:variant')
    })

    it('handles variant syntax in used flags', () => {
      const declaredFlags = ['flagA', 'flagB']
      const usedFlags = ['flagA:control', 'flagB:treatment']

      const errors = checkUndeclaredFlags(declaredFlags, usedFlags)
      expect(errors).toHaveLength(0)
    })

    it('returns no errors when all flags are declared', () => {
      const declaredFlags = ['flagA', 'flagB', 'flagC']
      const usedFlags = ['flagA', 'flagB:variant', 'flagC']

      const errors = checkUndeclaredFlags(declaredFlags, usedFlags)
      expect(errors).toHaveLength(0)
    })

    it('handles empty arrays', () => {
      expect(checkUndeclaredFlags([], [])).toHaveLength(0)
      expect(checkUndeclaredFlags(['flag'], [])).toHaveLength(0)
      expect(checkUndeclaredFlags([], ['flag'])).toHaveLength(1)
    })
  })
})
