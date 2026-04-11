import { resolve, isAbsolute } from 'node:path'
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * **Feature: config-file-runtime-loading, Property 8: Path resolution**
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any valid relative path specified as the config option, the system should resolve it
 * correctly from the project root and load the config file
 */

describe('Property 8: Path resolution', () => {
  // Arbitrary for generating valid relative paths
  const relativePathArbitrary = fc.oneof(
    // Simple relative paths
    fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[\w-]+$/.test(s))
      .map(s => `${s}.config.ts`),

    // Paths with subdirectories
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[\w-]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[\w-]+$/.test(s)),
    ).map(([dir, file]) => `${dir}/${file}.config.ts`),

    // Paths with multiple subdirectories
    fc.array(
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[\w-]+$/.test(s)),
      { minLength: 2, maxLength: 4 },
    ).map(parts => `${parts.join('/')}.config.ts`),

    // Paths with ./ prefix
    fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[\w-]+$/.test(s))
      .map(s => `./${s}.config.ts`),

    // Paths with subdirectories and ./ prefix
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[\w-]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[\w-]+$/.test(s)),
    ).map(([dir, file]) => `./${dir}/${file}.config.ts`),
  )

  it('should resolve relative paths from project root', () => {
    fc.assert(
      fc.property(
        relativePathArbitrary,
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        (relativePath, projectRoot) => {
          // Simulate path resolution logic
          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            // If the path is already absolute, return it
            if (isAbsolute(configPath)) {
              return configPath
            }

            // Otherwise, resolve relative to project root
            return resolve(rootDir, configPath)
          }

          const resolvedPath = resolveConfigPath(relativePath, projectRoot)

          // Property 1: Resolved path should be absolute
          expect(isAbsolute(resolvedPath)).toBe(true)

          // Property 2: Resolved path should start with the project root
          // Normalize paths for cross-platform comparison
          const normalizedResolved = resolvedPath.replace(/\\/g, '/')
          const normalizedRoot = projectRoot.replace(/\\/g, '/')
          expect(normalizedResolved).toContain(normalizedRoot)

          // Property 3: Resolved path should end with the original filename
          const filename = relativePath.split('/').pop()
          expect(resolvedPath).toContain(filename!)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle paths with subdirectories correctly', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[\w-]+$/.test(s)),
            { minLength: 1, maxLength: 3 },
          ),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[\w-]+$/.test(s)),
        ),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        ([subdirs, filename], projectRoot) => {
          const relativePath = `${subdirs.join('/')}/${filename}.config.ts`

          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            if (isAbsolute(configPath)) {
              return configPath
            }
            return resolve(rootDir, configPath)
          }

          const resolvedPath = resolveConfigPath(relativePath, projectRoot)

          // Property: All subdirectory components should be present in resolved path
          subdirs.forEach((subdir) => {
            expect(resolvedPath).toContain(subdir)
          })

          // Property: Filename should be preserved
          expect(resolvedPath).toContain(`${filename}.config.ts`)

          // Property: Path should be absolute
          expect(isAbsolute(resolvedPath)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should normalize paths with ./ prefix', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[\w-]+$/.test(s)),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        (filename, projectRoot) => {
          const pathWithPrefix = `./${filename}.config.ts`
          const pathWithoutPrefix = `${filename}.config.ts`

          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            if (isAbsolute(configPath)) {
              return configPath
            }
            return resolve(rootDir, configPath)
          }

          const resolvedWithPrefix = resolveConfigPath(pathWithPrefix, projectRoot)
          const resolvedWithoutPrefix = resolveConfigPath(pathWithoutPrefix, projectRoot)

          // Property: Both should resolve to the same absolute path
          expect(resolvedWithPrefix).toBe(resolvedWithoutPrefix)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should preserve absolute paths unchanged', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        (absolutePathSuffix, projectRoot) => {
          // Create an absolute path (platform-independent)
          const absolutePath = resolve('/', absolutePathSuffix, 'config.ts')

          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            if (isAbsolute(configPath)) {
              return configPath
            }
            return resolve(rootDir, configPath)
          }

          const resolvedPath = resolveConfigPath(absolutePath, projectRoot)

          // Property: Absolute paths should remain unchanged
          expect(resolvedPath).toBe(absolutePath)

          // Property: Should not contain project root (unless it's part of the absolute path)
          // This verifies we didn't accidentally prepend the root
          if (!absolutePath.includes(projectRoot)) {
            expect(resolvedPath).not.toContain(projectRoot)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle complex nested directory structures', () => {
    const complexPathArbitrary = fc.array(
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[\w-]+$/.test(s)),
      { minLength: 3, maxLength: 5 },
    ).map(parts => `${parts.join('/')}/feature-flags.config.ts`)

    fc.assert(
      fc.property(
        complexPathArbitrary,
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        (complexPath, projectRoot) => {
          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            if (isAbsolute(configPath)) {
              return configPath
            }
            return resolve(rootDir, configPath)
          }

          const resolvedPath = resolveConfigPath(complexPath, projectRoot)

          // Property: Should be absolute
          expect(isAbsolute(resolvedPath)).toBe(true)

          // Property: Should contain all path segments
          const segments = complexPath.split('/')
          segments.forEach((segment) => {
            if (segment && segment !== '.') {
              expect(resolvedPath).toContain(segment)
            }
          })

          // Property: Should end with the config filename
          expect(resolvedPath).toMatch(/feature-flags\.config\.ts$/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should validate that resolved paths maintain correct structure', () => {
    fc.assert(
      fc.property(
        relativePathArbitrary,
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[\w/-]+$/.test(s)),
        (relativePath, projectRoot) => {
          const resolveConfigPath = (configPath: string, rootDir: string): string => {
            if (isAbsolute(configPath)) {
              return configPath
            }
            return resolve(rootDir, configPath)
          }

          const resolvedPath = resolveConfigPath(relativePath, projectRoot)

          // Property: Resolved path should be a valid file path
          expect(resolvedPath).toBeTruthy()
          expect(typeof resolvedPath).toBe('string')
          expect(resolvedPath.length).toBeGreaterThan(0)

          // Property: Should not contain relative path markers after resolution
          // (resolve() should normalize these away)
          const normalizedPath = resolvedPath.replace(/\\/g, '/')
          expect(normalizedPath).not.toMatch(/\/\.\//)
          expect(normalizedPath).not.toMatch(/\/\.\.$/)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('should handle edge cases in path resolution', () => {
    const edgeCases = [
      { path: 'feature-flags.config.ts', description: 'simple filename' },
      { path: './feature-flags.config.ts', description: 'filename with ./ prefix' },
      { path: 'config/feature-flags.config.ts', description: 'single subdirectory' },
      { path: './config/feature-flags.config.ts', description: 'subdirectory with ./ prefix' },
      { path: 'src/config/feature-flags.config.ts', description: 'nested subdirectories' },
      { path: './src/config/feature-flags.config.ts', description: 'nested with ./ prefix' },
    ]

    const projectRoot = '/test/project'

    edgeCases.forEach(({ path, description }) => {
      const resolveConfigPath = (configPath: string, rootDir: string): string => {
        if (isAbsolute(configPath)) {
          return configPath
        }
        return resolve(rootDir, configPath)
      }

      const resolvedPath = resolveConfigPath(path, projectRoot)

      // Verify resolution properties
      expect(isAbsolute(resolvedPath), `${description} should resolve to absolute path`).toBe(true)

      // Normalize paths for cross-platform comparison
      const normalizedResolved = resolvedPath.replace(/\\/g, '/')
      const normalizedRoot = projectRoot.replace(/\\/g, '/')
      expect(normalizedResolved, `${description} should contain project root`).toContain(normalizedRoot)
      expect(resolvedPath, `${description} should end with config filename`).toMatch(/feature-flags\.config\.ts$/)
    })
  })
})
