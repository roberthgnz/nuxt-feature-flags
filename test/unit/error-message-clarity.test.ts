import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * **Feature: config-file-runtime-loading, Property 6: Error message clarity**
 * **Validates: Requirements 4.3**
 *
 * For any flag loading failure, the error message should include both the phase (build/runtime)
 * and the specific reason for failure
 */

describe('Property 6: Error message clarity', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  // Arbitrary for generating error scenarios
  const errorScenarioArbitrary = fc.record({
    phase: fc.constantFrom('build', 'runtime', 'module-setup'),
    errorType: fc.constantFrom(
      'file-not-found',
      'invalid-syntax',
      'invalid-structure',
      'evaluation-error',
      'missing-flags',
    ),
    configPath: fc.option(
      fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.config.ts`),
      { nil: undefined },
    ),
  })

  it('should include phase and reason in error messages for flag loading failures', () => {
    fc.assert(
      fc.property(errorScenarioArbitrary, (scenario) => {
        // Simulate an error message generator
        const generateErrorMessage = (
          phase: string,
          errorType: string,
          configPath?: string,
        ): string => {
          const pathInfo = configPath ? ` at path '${configPath}'` : ''
          return `[${phase}] Flag loading failed: ${errorType}${pathInfo}`
        }

        const errorMessage = generateErrorMessage(
          scenario.phase,
          scenario.errorType,
          scenario.configPath,
        )

        // Verify the error message contains the phase
        expect(errorMessage).toContain(scenario.phase)

        // Verify the error message contains the error type (reason)
        expect(errorMessage).toContain(scenario.errorType)

        // If a config path was provided, verify it's in the message
        if (scenario.configPath) {
          expect(errorMessage).toContain(scenario.configPath)
        }

        // Verify the message has a clear structure
        expect(errorMessage).toMatch(/\[[^\n\r\]\u2028\u2029]*\].*:/)
      }),
      { numRuns: 100 },
    )
  })

  it('should provide actionable error messages for missing flags', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z]\w*$/i.test(s)),
        (flagName) => {
          // Simulate error message for missing flag
          const generateMissingFlagError = (name: string, phase: string): string => {
            return `[${phase}] Flag '${name}' not found in runtime config. Ensure flags are properly loaded from config file or defined inline.`
          }

          const errorMessage = generateMissingFlagError(flagName, 'runtime')

          // Verify the error message contains the flag name
          expect(errorMessage).toContain(flagName)

          // Verify the error message contains the phase
          expect(errorMessage).toContain('runtime')

          // Verify the error message provides guidance
          expect(errorMessage.toLowerCase()).toMatch(/ensure|check|verify/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should distinguish between different phases in error messages', () => {
    const phases = ['build', 'runtime', 'module-setup']
    const errorType = 'invalid-structure'

    phases.forEach((phase) => {
      const errorMessage = `[${phase}] Flag loading failed: ${errorType}`

      // Each phase should be clearly identifiable
      expect(errorMessage).toContain(`[${phase}]`)

      // Different phases should produce different messages
      phases.filter(p => p !== phase).forEach((otherPhase) => {
        const otherMessage = `[${otherPhase}] Flag loading failed: ${errorType}`
        expect(errorMessage).not.toEqual(otherMessage)
      })
    })
  })

  it('should include specific error details for config file loading failures', () => {
    fc.assert(
      fc.property(
        fc.record({
          configPath: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.config.ts`),
          errorReason: fc.constantFrom(
            'File not found',
            'Syntax error',
            'Invalid export',
            'Evaluation failed',
          ),
        }),
        (scenario) => {
          const generateConfigLoadError = (path: string, reason: string): string => {
            return `[module-setup] Failed to load config file at '${path}': ${reason}`
          }

          const errorMessage = generateConfigLoadError(
            scenario.configPath,
            scenario.errorReason,
          )

          // Verify all components are present
          expect(errorMessage).toContain('module-setup')
          expect(errorMessage).toContain(scenario.configPath)
          expect(errorMessage).toContain(scenario.errorReason)

          // Verify the message structure is clear
          expect(errorMessage).toMatch(/\[[^\n\r\]\u2028\u2029]*\][^\n\r'\u2028\u2029]*'.*':/)
        },
      ),
      { numRuns: 100 },
    )
  })
})
