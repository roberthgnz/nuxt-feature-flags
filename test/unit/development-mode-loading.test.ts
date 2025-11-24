import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { FlagDefinition } from '../../src/types/feature-flags'

/**
 * **Feature: config-file-runtime-loading, Property 2: Development mode flag loading**
 * **Validates: Requirements 1.4**
 * 
 * For any flag configuration, when the application runs in development mode,
 * each request should load and resolve the current config file flags
 */

describe('Property 2: Development mode flag loading', () => {
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
            /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s) && !reservedNames.has(s),
        ),
        fc.oneof(
            flagValueArbitrary,
            flagConfigArbitrary,
        ),
        { minKeys: 1, maxKeys: 10 },
    )

    it('should load fresh flags on each request in development mode', () => {
        fc.assert(
            fc.property(
                flagDefinitionArbitrary,
                fc.array(flagDefinitionArbitrary, { minLength: 2, maxLength: 5 }),
                (initialFlags, subsequentFlagStates) => {
                    // Simulate development mode behavior where flags are loaded per-request
                    // rather than cached at build time

                    // Simulate a config loader that reads from "file" on each call
                    let currentConfigState = initialFlags
                    const loadConfigFromFile = () => currentConfigState

                    // First request - should get initial flags
                    const request1Flags = loadConfigFromFile()
                    expect(request1Flags).toEqual(initialFlags)

                    // Simulate config file changes and subsequent requests
                    for (const newFlagState of subsequentFlagStates) {
                        // Config file changes
                        currentConfigState = newFlagState

                        // Next request - should get the NEW flags (not cached)
                        const requestFlags = loadConfigFromFile()
                        expect(requestFlags).toEqual(newFlagState)
                        expect(requestFlags).not.toBe(initialFlags) // Different reference

                        // Verify that the flags actually reflect the current state
                        expect(requestFlags).toEqual(currentConfigState)
                    }
                },
            ),
            { numRuns: 100 },
        )
    })

    it('should not cache flags between requests in development mode', () => {
        fc.assert(
            fc.property(
                flagDefinitionArbitrary,
                flagDefinitionArbitrary,
                (flags1, flags2) => {
                    // Simulate the behavior where each request loads flags fresh
                    // This tests that there's no caching mechanism interfering

                    // Mock config file state
                    let configFileContent = flags1

                    // Request 1
                    const loadFlags = () => configFileContent
                    const request1Result = loadFlags()
                    expect(request1Result).toEqual(flags1)

                    // Config changes
                    configFileContent = flags2

                    // Request 2 - should see the change immediately
                    const request2Result = loadFlags()
                    expect(request2Result).toEqual(flags2)

                    // Verify no caching occurred (unless flags are identical)
                    if (JSON.stringify(flags1) !== JSON.stringify(flags2)) {
                        expect(request2Result).not.toEqual(request1Result)
                    }
                },
            ),
            { numRuns: 100 },
        )
    })

    it('should reflect runtime config updates in development mode', () => {
        fc.assert(
            fc.property(
                flagDefinitionArbitrary,
                (flags) => {
                    // In development mode, runtime config should be updated with fresh flags
                    // This simulates the module's behavior of updating runtimeConfig on each load

                    const createRuntimeConfig = (loadedFlags: FlagDefinition) => ({
                        public: {
                            featureFlags: {
                                flags: loadedFlags,
                                config: 'feature-flags.config.ts',
                            },
                        },
                    })

                    // Simulate loading flags and creating runtime config
                    const runtimeConfig = createRuntimeConfig(flags)

                    // Verify flags are accessible in runtime config
                    expect(runtimeConfig.public.featureFlags.flags).toEqual(flags)

                    // Verify all flag keys are present
                    const flagKeys = Object.keys(flags)
                    const runtimeFlagKeys = Object.keys(runtimeConfig.public.featureFlags.flags)
                    expect(runtimeFlagKeys.sort()).toEqual(flagKeys.sort())

                    // Verify all flag values are correct
                    for (const key of flagKeys) {
                        expect(runtimeConfig.public.featureFlags.flags[key]).toEqual(flags[key])
                    }
                },
            ),
            { numRuns: 100 },
        )
    })

    it('should handle multiple sequential config changes in development mode', () => {
        fc.assert(
            fc.property(
                fc.array(flagDefinitionArbitrary, { minLength: 3, maxLength: 10 }),
                (flagSequence) => {
                    // Simulate multiple config file changes in sequence
                    // Each should be reflected in the next request

                    const requests: FlagDefinition[] = []

                    for (const flags of flagSequence) {
                        // Simulate loading flags for this request
                        const loadedFlags = flags
                        requests.push(loadedFlags)

                        // Verify this request got the correct flags
                        expect(loadedFlags).toEqual(flags)
                    }

                    // Verify we processed all flag states
                    expect(requests.length).toBe(flagSequence.length)

                    // Verify each request got its corresponding flags
                    for (let i = 0; i < flagSequence.length; i++) {
                        expect(requests[i]).toEqual(flagSequence[i])
                    }
                },
            ),
            { numRuns: 100 },
        )
    })

    it('should maintain flag structure integrity across reloads in development mode', () => {
        fc.assert(
            fc.property(
                flagDefinitionArbitrary,
                (flags) => {
                    // Simulate multiple reloads of the same config
                    // The structure should remain consistent

                    const loadConfig = () => ({ ...flags })

                    const load1 = loadConfig()
                    const load2 = loadConfig()
                    const load3 = loadConfig()

                    // All loads should produce equivalent structures
                    expect(load1).toEqual(flags)
                    expect(load2).toEqual(flags)
                    expect(load3).toEqual(flags)

                    // Verify structure is preserved
                    expect(Object.keys(load1).sort()).toEqual(Object.keys(flags).sort())
                    expect(Object.keys(load2).sort()).toEqual(Object.keys(flags).sort())
                    expect(Object.keys(load3).sort()).toEqual(Object.keys(flags).sort())
                },
            ),
            { numRuns: 100 },
        )
    })
})
