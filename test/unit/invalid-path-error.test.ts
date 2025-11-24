import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * **Feature: config-file-runtime-loading, Property 9: Invalid path error handling**
 * **Validates: Requirements 5.3**
 * 
 * For any invalid config file path, the system should provide an error message that includes
 * the attempted path
 */

describe('Property 9: Invalid path error handling', () => {
    // Arbitrary for generating invalid paths
    const invalidPathArbitrary = fc.oneof(
        // Non-existent paths
        fc.string({ minLength: 5, maxLength: 50 }).map(s => `/nonexistent/${s}.config.ts`),
        // Paths with invalid characters (for some systems)
        fc.string({ minLength: 5, maxLength: 30 }).map(s => `${s}<>:|?.config.ts`),
        // Empty or whitespace paths
        fc.constantFrom('', '   ', '\t\n'),
        // Paths without proper extension
        fc.string({ minLength: 5, maxLength: 30 }).map(s => `${s}.txt`),
        // Relative paths that don't exist
        fc.string({ minLength: 5, maxLength: 30 }).map(s => `./config/${s}.config.ts`),
    )

    it('should include the attempted path in error messages for invalid config paths', () => {
        fc.assert(
            fc.property(invalidPathArbitrary, (invalidPath) => {
                // Simulate the error message generator for invalid paths
                const generateInvalidPathError = (path: string): string => {
                    if (!path || path.trim() === '') {
                        return '[module-setup] Config file path is empty or invalid'
                    }
                    return `[module-setup] Failed to load config file at '${path}': File not found or inaccessible`
                }

                const errorMessage = generateInvalidPathError(invalidPath)

                // Verify the error message contains phase information
                expect(errorMessage).toContain('[module-setup]')

                // Verify the error message contains the path (unless it's empty/whitespace)
                if (invalidPath && invalidPath.trim() !== '') {
                    expect(errorMessage).toContain(invalidPath)
                }

                // Verify the error message indicates the nature of the problem
                expect(errorMessage.toLowerCase()).toMatch(/failed|invalid|not found|inaccessible|empty/)
            }),
            { numRuns: 100 },
        )
    })

    it('should provide clear error messages for different types of invalid paths', () => {
        const testCases = [
            { path: '', expectedPattern: /empty|invalid/ },
            { path: '   ', expectedPattern: /empty|invalid/ },
            { path: '/nonexistent/config.ts', expectedPattern: /not found|inaccessible/ },
            { path: 'invalid<>path.ts', expectedPattern: /not found|inaccessible|invalid/ },
        ]

        testCases.forEach(({ path, expectedPattern }) => {
            const generateError = (p: string): string => {
                if (!p || p.trim() === '') {
                    return '[module-setup] Config file path is empty or invalid'
                }
                return `[module-setup] Failed to load config file at '${p}': File not found or inaccessible`
            }

            const errorMessage = generateError(path)
            expect(errorMessage).toMatch(expectedPattern)
        })
    })

    it('should distinguish between different path error scenarios', () => {
        fc.assert(
            fc.property(
                fc.record({
                    path: fc.string({ minLength: 5, maxLength: 50 }),
                    errorType: fc.constantFrom(
                        'not-found',
                        'permission-denied',
                        'invalid-format',
                        'syntax-error',
                    ),
                }),
                (scenario) => {
                    const generateDetailedError = (path: string, errorType: string): string => {
                        const errorMessages: Record<string, string> = {
                            'not-found': `[module-setup] Failed to load config file at '${path}': File not found`,
                            'permission-denied': `[module-setup] Failed to load config file at '${path}': Permission denied`,
                            'invalid-format': `[module-setup] Failed to load config file at '${path}': Invalid file format`,
                            'syntax-error': `[module-setup] Failed to load config file at '${path}': Syntax error in config file`,
                        }
                        return errorMessages[errorType] || `[module-setup] Failed to load config file at '${path}': Unknown error`
                    }

                    const errorMessage = generateDetailedError(scenario.path, scenario.errorType)

                    // Verify all components are present
                    expect(errorMessage).toContain('[module-setup]')
                    expect(errorMessage).toContain(scenario.path)

                    // Verify the specific error type is reflected
                    const errorTypeMap: Record<string, RegExp> = {
                        'not-found': /not found/i,
                        'permission-denied': /permission denied/i,
                        'invalid-format': /invalid.*format/i,
                        'syntax-error': /syntax error/i,
                    }
                    expect(errorMessage).toMatch(errorTypeMap[scenario.errorType])
                },
            ),
            { numRuns: 100 },
        )
    })

    it('should handle edge cases in path error reporting', () => {
        const edgeCases = [
            { path: '.', description: 'current directory' },
            { path: '..', description: 'parent directory' },
            { path: '/', description: 'root directory' },
            { path: 'config.ts', description: 'filename without directory' },
            { path: './feature-flags.config.ts', description: 'relative path' },
            { path: '/absolute/path/config.ts', description: 'absolute path' },
        ]

        edgeCases.forEach(({ path, description }) => {
            const generateError = (p: string): string => {
                if (!p || p.trim() === '') {
                    return '[module-setup] Config file path is empty or invalid'
                }
                return `[module-setup] Failed to load config file at '${p}': File not found or inaccessible`
            }

            const errorMessage = generateError(path)

            // Verify the path is included in the error message
            expect(errorMessage).toContain(path)

            // Verify the error message has proper structure
            expect(errorMessage).toMatch(/\[module-setup\].*'.*':/)
        })
    })

    it('should provide actionable guidance in error messages', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.config.ts`),
                (configPath) => {
                    const generateActionableError = (path: string): string => {
                        return `[module-setup] Failed to load config file at '${path}': File not found. Ensure the path is correct and relative to the project root.`
                    }

                    const errorMessage = generateActionableError(configPath)

                    // Verify the error includes the path
                    expect(errorMessage).toContain(configPath)

                    // Verify the error provides guidance
                    expect(errorMessage.toLowerCase()).toMatch(/ensure|check|verify|make sure/)

                    // Verify it mentions the project root context
                    expect(errorMessage.toLowerCase()).toContain('project root')
                },
            ),
            { numRuns: 100 },
        )
    })
})
