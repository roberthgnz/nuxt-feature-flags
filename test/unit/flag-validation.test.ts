import { describe, it, expect } from 'vitest'
import type { FlagConfig } from '../../src/runtime/types'

// Import validation functions
const {
  validateFlagNaming,
  validateVariants,
  validateFlagConfig,
  validateFlagDefinition,
  checkUndeclaredFlags,
} = await import('../../src/runtime/server/utils/validation')

describe('feature flag validation', () => {
  describe('config validation', () => {
    it('should validate flag names follow naming conventions', () => {
      // Valid flag names
      expect(validateFlagNaming('validFlag')).toBeNull()
      expect(validateFlagNaming('valid_flag')).toBeNull()
      expect(validateFlagNaming('valid-flag')).toBeNull()
      expect(validateFlagNaming('validFlag123')).toBeNull()

      // Invalid flag names
      expect(validateFlagNaming('invalid flag')).not.toBeNull()
      expect(validateFlagNaming('invalid@flag')).not.toBeNull()
      expect(validateFlagNaming('123invalid')).not.toBeNull()
      expect(validateFlagNaming('')).not.toBeNull()
    })

    it('should validate variant configurations', () => {
      const validVariants = [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 },
      ]

      expect(validateVariants('testFlag', validVariants)).toEqual([])

      // Invalid total weight
      const invalidWeightVariants = [
        { name: 'control', weight: 60 },
        { name: 'treatment', weight: 60 },
      ]

      const weightErrors = validateVariants('testFlag', invalidWeightVariants)
      expect(weightErrors).toHaveLength(1)
      expect(weightErrors[0].error).toContain('exceed 100%')

      // Duplicate variant names
      const duplicateVariants = [
        { name: 'control', weight: 50 },
        { name: 'control', weight: 50 },
      ]

      const duplicateErrors = validateVariants('testFlag', duplicateVariants)
      expect(duplicateErrors).toHaveLength(1)
      expect(duplicateErrors[0].error).toContain('Duplicate')
    })

    it('should validate complete config structure', () => {
      const flagDefinition = {
        simpleFlag: true,
        complexFlag: {
          enabled: true,
          value: 'test',
          variants: [
            { name: 'control', weight: 50 },
            { name: 'treatment', weight: 50 },
          ],
        } as unknown as FlagConfig,
      }

      const errors = validateFlagDefinition(flagDefinition)
      expect(errors).toEqual([])

      // Test individual flag config validation
      const validConfig = { enabled: true }
      const validErrors = validateFlagConfig('testFlag', validConfig)
      expect(validErrors).toEqual([])

      // Test flag config with invalid structure
      const invalidConfig = { enabled: 'not_boolean' } as unknown as FlagConfig
      const invalidErrors = validateFlagConfig('testFlag', invalidConfig)
      expect(invalidErrors.length).toBeGreaterThan(0)
    })
  })

  describe('undeclared flag detection', () => {
    it('should detect undeclared flags', () => {
      const declaredFlags = ['flag1', 'flag2']
      const usedFlags = ['flag1', 'flag3', 'flag4']

      const errors = checkUndeclaredFlags(declaredFlags, usedFlags)
      expect(errors).toHaveLength(2)
      expect(errors[0].flag).toBe('flag3')
      expect(errors[1].flag).toBe('flag4')
    })

    it('should handle variant flag names correctly', () => {
      const declaredFlags = ['experimentFlag']
      const usedFlags = ['experimentFlag:control', 'experimentFlag:treatment']

      const errors = checkUndeclaredFlags(declaredFlags, usedFlags)
      expect(errors).toEqual([])
    })

    it('should validate flag weights are within bounds', () => {
      const invalidWeightVariants = [
        { name: 'control', weight: -10 },
        { name: 'treatment', weight: 110 },
      ]

      const errors = validateVariants('testFlag', invalidWeightVariants)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.error.includes('weight must be between 0 and 100'))).toBe(true)
    })

    it('should validate variant names follow naming conventions', () => {
      const invalidNameVariants = [
        { name: 'invalid name', weight: 50 },
        { name: 'valid_name', weight: 50 },
      ]

      const errors = validateVariants('testFlag', invalidNameVariants)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.error.includes('Variant name validation failed'))).toBe(true)
    })

    it('should handle empty variant arrays', () => {
      const errors = validateVariants('testFlag', [])
      expect(errors).toEqual([])
    })

    it('should validate flag definition with simple boolean flags', () => {
      const flagDefinition = {
        simpleFlag: true,
        anotherFlag: false,
      }

      const errors = validateFlagDefinition(flagDefinition)
      expect(errors).toEqual([])
    })

    it('should validate flag definition with mixed flag types', () => {
      const flagDefinition = {
        simpleFlag: true,
        complexFlag: {
          enabled: true,
          variants: [
            { name: 'a', weight: 100 },
          ],
        },
        stringFlag: 'test' as unknown as FlagConfig,
      }

      const errors = validateFlagDefinition(flagDefinition)
      expect(errors).toEqual([])
    })
  })
})
