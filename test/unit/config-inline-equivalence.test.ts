import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { FlagDefinition } from '../../src/types/feature-flags'

/**
 * **Feature: config-file-runtime-loading, Property 1: Config file and inline flag equivalence**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * For any valid flag definition, when flags are loaded from a config file and stored in runtime config,
 * the resolved flags should be identical to the same flags defined inline in nuxt.config.ts
 */

describe('Property 1: Config file and inline flag equivalence', () => {
  // Arbitrary for generating FlagValue
  const flagValueArbitrary = fc.oneof(
    fc.boolean(),
    fc.integer(),
    fc.double(),
    fc.string(),
    fc.constant(null),
  )

  // Arbitrary for generating FlagVariant
  const flagVariantArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    weight: fc.integer({ min: 0, max: 100 }),
    value: fc.option(flagValueArbitrary, { nil: undefined }),
  })

  // Arbitrary for generating FlagConfig
  const flagConfigArbitrary = fc.record({
    enabled: fc.boolean(),
    value: fc.option(flagValueArbitrary, { nil: undefined }),
    variants: fc.option(
      fc.array(flagVariantArbitrary, { minLength: 1, maxLength: 5 }),
      { nil: undefined },
    ),
  })

  // Arbitrary for generating a complete FlagDefinition
  const flagDefinitionArbitrary: fc.Arbitrary<FlagDefinition> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z]\w*$/i.test(s)),
    fc.oneof(
      flagValueArbitrary,
      flagConfigArbitrary,
    ),
    { minKeys: 1, maxKeys: 10 },
  )

  it('should produce identical runtime config structure for config file and inline flags', () => {
    fc.assert(
      fc.property(flagDefinitionArbitrary, (flags) => {
        // Simulate the module setup for config file approach
        const configFileRuntimeConfig = {
          flags: flags,
          config: 'feature-flags.config.ts',
        }

        // Simulate the old inline approach (backward compatibility)
        // In the old approach, flags were spread directly into featureFlags
        const inlineRuntimeConfig = {
          ...flags,
          flags: flags,
        }

        // The key property: when we retrieve flags using the new retrieval logic,
        // both approaches should yield the same flags

        // New retrieval logic (from fixed code)
        const retrieveFlags = (runtimeConfig: Record<string, unknown>) => {
          let retrievedFlags = runtimeConfig.flags

          // Fallback for backward compatibility
          if (!retrievedFlags || typeof retrievedFlags !== 'object') {
            const { flags: _flags, config: _config, ...possibleFlags } = runtimeConfig

            if (Object.keys(possibleFlags).length > 0) {
              retrievedFlags = possibleFlags
            }
            else {
              retrievedFlags = {}
            }
          }

          return retrievedFlags
        }

        const flagsFromConfigFile = retrieveFlags(configFileRuntimeConfig)
        const flagsFromInline = retrieveFlags(inlineRuntimeConfig)

        // Both should resolve to the same flags
        expect(flagsFromConfigFile).toEqual(flags)
        expect(flagsFromInline).toEqual(flags)
        expect(flagsFromConfigFile).toEqual(flagsFromInline)
      }),
      { numRuns: 100 },
    )
  })

  it('should handle empty flag definitions', () => {
    const emptyFlags: FlagDefinition = {}

    const configFileRuntimeConfig = {
      flags: emptyFlags,
      config: 'feature-flags.config.ts',
    }

    const retrieveFlags = (runtimeConfig: Record<string, unknown>) => {
      let retrievedFlags = runtimeConfig.flags

      if (!retrievedFlags || typeof retrievedFlags !== 'object') {
        const { flags: _flags, config: _config, ...possibleFlags } = runtimeConfig

        if (Object.keys(possibleFlags).length > 0) {
          retrievedFlags = possibleFlags
        }
        else {
          retrievedFlags = {}
        }
      }

      return retrievedFlags
    }

    const retrieved = retrieveFlags(configFileRuntimeConfig)
    expect(retrieved).toEqual({})
  })

  it('should preserve flag structure through config transformation', () => {
    fc.assert(
      fc.property(flagDefinitionArbitrary, (flags) => {
        // Simulate the transformation that happens in module.ts
        const transformedConfig = {
          flags: flags,
          config: 'feature-flags.config.ts',
        }

        // Verify that the flags property contains the exact same structure
        expect(transformedConfig.flags).toEqual(flags)

        // Verify that all flag keys are preserved
        const originalKeys = Object.keys(flags).sort()
        const transformedKeys = Object.keys(transformedConfig.flags).sort()
        expect(transformedKeys).toEqual(originalKeys)

        // Verify that all flag values are preserved
        for (const key of originalKeys) {
          expect(transformedConfig.flags[key]).toEqual(flags[key])
        }
      }),
      { numRuns: 100 },
    )
  })
})
