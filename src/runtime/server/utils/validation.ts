import type { FlagConfig, FlagDefinition, FlagsSchema, FlagVariant } from '../../types'

export interface ValidationError {
  flag: string
  error: string
  type: 'config' | 'naming' | 'variant'
}

const NAME_PATTERN = /^[a-z][\w-]*$/i
const MAX_NAME_LENGTH = 50

export function validateFlagNaming(flagName: string): ValidationError | null {
  if (!NAME_PATTERN.test(flagName)) {
    return {
      flag: flagName,
      error: 'Flag name must start with a letter and contain only letters, numbers, hyphens, and underscores',
      type: 'naming',
    }
  }

  if (flagName.length > MAX_NAME_LENGTH) {
    return {
      flag: flagName,
      error: `Flag name should not exceed ${MAX_NAME_LENGTH} characters`,
      type: 'naming',
    }
  }

  return null
}

export function validateVariants(flagName: string, variants: FlagVariant[]): ValidationError[] {
  const errors: ValidationError[] = []
  const variantError = (error: string) => errors.push({ flag: flagName, error, type: 'variant' })

  const seen = new Set<string>()
  let totalWeight = 0

  for (const variant of variants) {
    if (!variant || typeof variant.name !== 'string') {
      variantError('Every variant needs a string "name"')
      continue
    }

    if (seen.has(variant.name)) {
      variantError(`Duplicate variant name: ${variant.name}`)
    }
    seen.add(variant.name)

    const nameError = validateFlagNaming(variant.name)
    if (nameError) {
      variantError(`Variant name validation failed: ${nameError.error}`)
    }

    if (typeof variant.weight !== 'number' || !Number.isFinite(variant.weight) || variant.weight < 0 || variant.weight > 100) {
      variantError(`Variant "${variant.name}" weight must be between 0 and 100`)
    }
    else {
      totalWeight += variant.weight
    }
  }

  if (totalWeight > 100) {
    variantError(`Total variant weights (${totalWeight}) exceed 100%`)
  }

  return errors
}

export function validateFlagConfig(flagName: string, definition: FlagDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  const nameError = validateFlagNaming(flagName)
  if (nameError) {
    errors.push(nameError)
  }

  if (Array.isArray(definition)) {
    errors.push({ flag: flagName, error: 'Flag value must be a boolean, number, string or config object, not an array', type: 'config' })
  }
  else if (typeof definition === 'object' && definition !== null) {
    const config = definition as FlagConfig

    if ('enabled' in config && typeof config.enabled !== 'boolean') {
      errors.push({ flag: flagName, error: '"enabled" must be a boolean', type: 'config' })
    }

    if (config.variants !== undefined) {
      if (Array.isArray(config.variants)) {
        errors.push(...validateVariants(flagName, config.variants))
      }
      else {
        errors.push({ flag: flagName, error: 'Variants must be an array', type: 'config' })
      }
    }
  }

  return errors
}

export function validateFlagDefinition(flags: FlagsSchema): ValidationError[] {
  return Object.entries(flags).flatMap(([name, definition]) => validateFlagConfig(name, definition))
}

/**
 * Flags referenced in code (`flag` or `flag:variant`) that no config declares.
 */
export function checkUndeclaredFlags(declaredFlags: string[], usedFlags: string[]): ValidationError[] {
  const declared = new Set(declaredFlags)

  return usedFlags
    .filter(used => !declared.has(used.split(':')[0]!))
    .map(used => ({
      flag: used,
      error: `Flag "${used}" is used in code but not declared in configuration`,
      type: 'config' as const,
    }))
}
