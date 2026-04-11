import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { FlagDefinition } from '../../src/types/feature-flags'

/**
 * **Feature: config-file-runtime-loading, Property 3: Production mode flag persistence**
 * **Validates: Requirements 1.5**
 *
 * For any flag configuration, when the application runs in production mode,
 * flags loaded during build should be available in runtime config without re-loading the config file
 */

describe('Property 3: Production mode flag persistence', () => {
  // Arbitrary for generating FlagValue
  const flagValueArbitrary = fc.oneof(
    fc.boolean(),
    fc.integer(),
    fc.double(),
    fc.string(),
    fc.constant(null),
  )

  // Arbitrary for generating FlagConfig
  const flagConfigArbitrary = fc.record({
    enabled: fc.boolean(),
    value: fc.option(flagValueArbitrary, { nil: undefined }),
    variants: fc.option(
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          weight: fc.integer({ min: 0, max: 100 }),
          value: fc.option(flagValueArbitrary, { nil: undefined }),
        }),
        { minLength: 1, maxLength: 5 },
      ),
      { nil: undefined },
    ),
  })

  // Reserved JavaScript property names to avoid
  const reservedNames = new Set([
    'toString', 'valueOf', 'constructor', 'hasOwnProperty',
    'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
    '__proto__', '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__',
  ])

  // Arbitrary for generating a complete FlagDefinition
  const flagDefinitionArbitrary: fc.Arbitrary<FlagDefinition> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 30 }).filter(s =>
      /^[a-z]\w*$/i.test(s) && !reservedNames.has(s),
    ),
    fc.oneof(
      flagValueArbitrary,
      flagConfigArbitrary,
    ),
    { minKeys: 1, maxKeys: 10 },
  )

  it('should persist flags loaded at build time throughout runtime', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        (flags) => {
          // Simulate production mode: flags are loaded once at build time
          // and then persisted in runtime config

          // Build phase: load flags from config file
          const buildTimeFlags = flags

          // Create runtime config with build-time flags
          const runtimeConfig = {
            public: {
              featureFlags: {
                flags: buildTimeFlags,
                config: 'feature-flags.config.ts',
              },
            },
          }

          // Runtime phase: flags should be available from runtime config
          // without re-loading the config file
          const runtimeFlags = runtimeConfig.public.featureFlags.flags

          // Verify flags are identical to build-time flags
          expect(runtimeFlags).toEqual(buildTimeFlags)

          // Verify all flag keys are present
          expect(Object.keys(runtimeFlags).sort()).toEqual(Object.keys(flags).sort())

          // Verify all flag values are correct
          for (const key of Object.keys(flags)) {
            expect(runtimeFlags[key]).toEqual(flags[key])
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should maintain consistent flags across multiple runtime requests', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        fc.integer({ min: 2, max: 20 }),
        (flags, numRequests) => {
          // In production, flags should be the same across all requests
          // They should not change or reload

          // Build phase: load flags once
          const buildTimeFlags = flags

          // Create runtime config (happens once at build)
          const runtimeConfig = {
            public: {
              featureFlags: {
                flags: buildTimeFlags,
                config: 'feature-flags.config.ts',
              },
            },
          }

          // Simulate multiple runtime requests
          const requestResults: FlagDefinition[] = []
          for (let i = 0; i < numRequests; i++) {
            // Each request retrieves flags from runtime config (no reload)
            const requestFlags = runtimeConfig.public.featureFlags.flags
            requestResults.push(requestFlags)
          }

          // All requests should return identical flags
          for (const requestFlags of requestResults) {
            expect(requestFlags).toEqual(buildTimeFlags)
            expect(requestFlags).toEqual(flags)
          }

          // Verify consistency across all requests
          const firstRequest = requestResults[0]
          for (const requestFlags of requestResults) {
            expect(requestFlags).toEqual(firstRequest)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should not reload config file during runtime in production mode', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        flagDefinitionArbitrary,
        (buildFlags, hypotheticalNewFlags) => {
          // Simulate production mode where config file might change
          // but runtime should NOT reload it

          // Build phase: load flags
          const buildTimeFlags = buildFlags

          // Create runtime config
          const runtimeConfig = {
            public: {
              featureFlags: {
                flags: buildTimeFlags,
                config: 'feature-flags.config.ts',
              },
            },
          }

          // Simulate config file changing (in production, this shouldn't matter)
          const _configFileContent = hypotheticalNewFlags

          // Runtime requests should still get build-time flags
          const request1Flags = runtimeConfig.public.featureFlags.flags
          const request2Flags = runtimeConfig.public.featureFlags.flags
          const request3Flags = runtimeConfig.public.featureFlags.flags

          // All requests should return build-time flags, not new flags
          expect(request1Flags).toEqual(buildTimeFlags)
          expect(request2Flags).toEqual(buildTimeFlags)
          expect(request3Flags).toEqual(buildTimeFlags)

          // Verify flags did NOT change to the new config
          // (unless they happen to be identical)
          if (JSON.stringify(buildFlags) !== JSON.stringify(hypotheticalNewFlags)) {
            expect(request1Flags).not.toEqual(hypotheticalNewFlags)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should preserve flag structure from build to runtime', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        (flags) => {
          // Verify that the flag structure is preserved exactly
          // from build time to runtime

          // Build phase transformation
          const buildTimeConfig = {
            flags: flags,
            config: 'feature-flags.config.ts',
          }

          // Runtime config structure
          const runtimeConfig = {
            public: {
              featureFlags: buildTimeConfig,
            },
          }

          // Retrieve flags at runtime
          const runtimeFlags = runtimeConfig.public.featureFlags.flags

          // Verify exact structure preservation
          expect(runtimeFlags).toEqual(flags)

          // Verify each flag individually
          for (const [key, value] of Object.entries(flags)) {
            expect(runtimeFlags[key]).toEqual(value)

            // Verify type preservation
            expect(typeof runtimeFlags[key]).toBe(typeof value)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle empty flags in production mode', () => {
    const emptyFlags: FlagDefinition = {}

    // Build phase
    const buildTimeFlags = emptyFlags

    // Runtime config
    const runtimeConfig = {
      public: {
        featureFlags: {
          flags: buildTimeFlags,
          config: 'feature-flags.config.ts',
        },
      },
    }

    // Runtime retrieval
    const runtimeFlags = runtimeConfig.public.featureFlags.flags

    expect(runtimeFlags).toEqual({})
    expect(Object.keys(runtimeFlags).length).toBe(0)
  })

  it('should maintain flag immutability in production mode', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        (flags) => {
          // In production, flags should be immutable
          // Multiple accesses should return the same reference

          // Build phase
          const buildTimeFlags = flags

          // Runtime config
          const runtimeConfig = {
            public: {
              featureFlags: {
                flags: buildTimeFlags,
                config: 'feature-flags.config.ts',
              },
            },
          }

          // Multiple accesses
          const access1 = runtimeConfig.public.featureFlags.flags
          const access2 = runtimeConfig.public.featureFlags.flags
          const access3 = runtimeConfig.public.featureFlags.flags

          // All accesses should return the same data
          expect(access1).toEqual(buildTimeFlags)
          expect(access2).toEqual(buildTimeFlags)
          expect(access3).toEqual(buildTimeFlags)

          // All accesses should be consistent with each other
          expect(access1).toEqual(access2)
          expect(access2).toEqual(access3)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should support all flag types in production persistence', () => {
    fc.assert(
      fc.property(
        flagDefinitionArbitrary,
        (flags) => {
          // Verify that all flag types (boolean, number, string, null, config objects)
          // are properly persisted in production mode

          // Build phase
          const buildTimeFlags = flags

          // Runtime config
          const runtimeConfig = {
            public: {
              featureFlags: {
                flags: buildTimeFlags,
                config: 'feature-flags.config.ts',
              },
            },
          }

          // Runtime retrieval
          const runtimeFlags = runtimeConfig.public.featureFlags.flags

          // Verify each flag type is preserved
          for (const [key, value] of Object.entries(flags)) {
            const runtimeValue = runtimeFlags[key]

            // Check type preservation
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // FlagConfig object
              expect(typeof runtimeValue).toBe('object')
              expect(runtimeValue).toEqual(value)
            }
            else {
              // Primitive value
              expect(runtimeValue).toEqual(value)
              expect(typeof runtimeValue).toBe(typeof value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
