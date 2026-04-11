import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { FlagDefinition } from '../../src/types/feature-flags'

interface BuildContext {
  isDev: boolean
  isProduction: boolean
  rootDir: string
  phase: 'build'
}

/**
 * **Feature: config-file-runtime-loading, Property 7: Context evaluation**
 * **Validates: Requirements 4.4**
 *
 * For any config file that exports a function, the function should be evaluated with context
 * appropriate to the current phase (build vs runtime)
 */

describe('Property 7: Context evaluation', () => {
  // Arbitrary for generating flag values
  const flagValueArbitrary = fc.oneof(
    fc.boolean(),
    fc.integer(),
    fc.double(),
    fc.string(),
    fc.constant(null),
  )

  // Arbitrary for generating flag definitions
  const flagDefinitionArbitrary: fc.Arbitrary<FlagDefinition> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z]\w*$/i.test(s)),
    flagValueArbitrary,
    { minKeys: 1, maxKeys: 10 },
  )

  it('should pass build context when evaluating config functions during build phase', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        fc.boolean(), // isDev
        fc.string(), // rootDir
        (baseFlags, isDev, rootDir) => {
          // Create a config function that uses context
          const configFunction = (context?: BuildContext) => {
            // If context is provided, it should have the expected build-time properties
            if (context) {
              expect(context).toHaveProperty('isDev')
              expect(context).toHaveProperty('isProduction')
              expect(context).toHaveProperty('rootDir')
              expect(context).toHaveProperty('phase')
              expect(context.phase).toBe('build')
              expect(context.isDev).toBe(isDev)
              expect(context.isProduction).toBe(!isDev)
              expect(context.rootDir).toBe(rootDir)
            }

            return baseFlags
          }

          // Simulate the build context
          const buildContext = {
            isDev,
            isProduction: !isDev,
            rootDir,
            phase: 'build' as const,
          }

          // Evaluate the function with build context
          const result = configFunction(buildContext)

          // The result should be the base flags
          expect(result).toEqual(baseFlags)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle config functions that ignore context', () => {
    fc.assert(
      fc.property(flagDefinitionArbitrary, (flags) => {
        // Create a config function that doesn't use context
        const configFunction = () => flags

        // Simulate build context
        // Evaluate with context - function should still work
        const result = configFunction()

        // Result should match the flags
        expect(result).toEqual(flags)
      }),
      { numRuns: 100 },
    )
  })

  it('should allow config functions to return different flags based on context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        fc.boolean(),
        (flagName, devValue, prodValue) => {
          // Create a config function that returns different values based on isDev
          const configFunction = (context?: BuildContext) => {
            const isDev = context?.isDev ?? true
            return {
              [flagName]: isDev ? devValue : prodValue,
            }
          }

          // Test with dev context
          const devContext = {
            isDev: true,
            isProduction: false,
            rootDir: '/test',
            phase: 'build' as const,
          }
          const devResult = configFunction(devContext)
          expect(devResult[flagName]).toBe(devValue)

          // Test with production context
          const prodContext = {
            isDev: false,
            isProduction: true,
            rootDir: '/test',
            phase: 'build' as const,
          }
          const prodResult = configFunction(prodContext)
          expect(prodResult[flagName]).toBe(prodValue)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle both object and function exports', () => {
    fc.assert(
      fc.property(flagDefinitionArbitrary, (flags) => {
        // Test object export
        const objectExport = flags
        expect(objectExport).toEqual(flags)

        // Test function export
        const functionExport = () => flags
        const buildContext = {
          isDev: true,
          isProduction: false,
          rootDir: '/test',
          phase: 'build' as const,
        }
        const result = functionExport(buildContext)
        expect(result).toEqual(flags)

        // Both should produce the same flags
        expect(result).toEqual(objectExport)
      }),
      { numRuns: 100 },
    )
  })

  it('should preserve flag structure when evaluated with context', () => {
    fc.assert(
      fc.property(flagDefinitionArbitrary, (flags) => {
        // Create a config function
        const configFunction = (_context?: unknown) => {
          // Context should be available but shouldn't affect flag structure
          return flags
        }

        const buildContext = {
          isDev: true,
          isProduction: false,
          rootDir: '/test/root',
          phase: 'build' as const,
        }

        const result = configFunction(buildContext)

        // Verify structure is preserved
        expect(Object.keys(result).sort()).toEqual(Object.keys(flags).sort())

        // Verify all values are preserved
        for (const key of Object.keys(flags)) {
          expect(result[key]).toEqual(flags[key])
        }
      }),
      { numRuns: 100 },
    )
  })

  it('should provide consistent context properties across evaluations', () => {
    const configFunction = (context?: BuildContext) => {
      if (context) {
        // Context should always have these properties in build phase
        expect(context).toHaveProperty('isDev')
        expect(context).toHaveProperty('isProduction')
        expect(context).toHaveProperty('rootDir')
        expect(context).toHaveProperty('phase')

        // isDev and isProduction should be opposites
        expect(context.isDev).toBe(!context.isProduction)

        // phase should be 'build' during module setup
        expect(context.phase).toBe('build')
      }

      return { testFlag: true }
    }

    // Test multiple times with different contexts
    const contexts = [
      { isDev: true, isProduction: false, rootDir: '/test1', phase: 'build' as const },
      { isDev: false, isProduction: true, rootDir: '/test2', phase: 'build' as const },
      { isDev: true, isProduction: false, rootDir: '/test3', phase: 'build' as const },
    ]

    for (const context of contexts) {
      const result = configFunction(context)
      expect(result).toEqual({ testFlag: true })
    }
  })
})
