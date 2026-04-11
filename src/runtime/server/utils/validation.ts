import type { FlagDefinition, FlagConfig, FlagVariant, FlagValue } from '../../types/feature-flags'

export interface ValidationError {
  flag: string
  error: string
  type: 'config' | 'naming' | 'variant'
}

/**
 * Validate flag naming conventions
 */
export function validateFlagNaming(flagName: string): ValidationError | null {
  // Check for valid flag name format (alphanumeric, hyphens, underscores)
  const flagNameRegex = /^[a-z][\w-]*$/i
  if (!flagNameRegex.test(flagName)) {
    return {
      flag: flagName,
      error: 'Flag name must start with a letter and contain only letters, numbers, hyphens, and underscores',
      type: 'naming',
    }
  }

  // Check for reasonable length
  if (flagName.length > 50) {
    return {
      flag: flagName,
      error: 'Flag name should not exceed 50 characters',
      type: 'naming',
    }
  }

  return null
}

/**
 * Validate variant configuration
 */
export function validateVariants(flagName: string, variants: FlagVariant[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (variants.length === 0) {
    return errors
  }

  const variantNames = new Set<string>()
  let totalWeight = 0

  for (const variant of variants) {
    // Check for duplicate variant names
    if (variantNames.has(variant.name)) {
      errors.push({
        flag: flagName,
        error: `Duplicate variant name: ${variant.name}`,
        type: 'variant',
      })
    }
    variantNames.add(variant.name)

    // Check for valid weights
    if (variant.weight < 0 || variant.weight > 100) {
      errors.push({
        flag: flagName,
        error: `Variant "${variant.name}" weight must be between 0 and 100`,
        type: 'variant',
      })
    }

    totalWeight += variant.weight

    // Check for valid variant names
    const nameError = validateFlagNaming(variant.name)
    if (nameError) {
      errors.push({
        flag: flagName,
        error: `Variant name validation failed: ${nameError.error}`,
        type: 'variant',
      })
    }
  }

  // Check if total weight exceeds 100
  if (totalWeight > 100) {
    errors.push({
      flag: flagName,
      error: `Total variant weights (${totalWeight}) exceed 100%`,
      type: 'variant',
    })
  }

  return errors
}

/**
 * Validate a single flag configuration
 */
export function validateFlagConfig(flagName: string, flagValue: FlagValue | FlagConfig): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate flag naming
  const nameError = validateFlagNaming(flagName)
  if (nameError) {
    errors.push(nameError)
  }

  // If it's a FlagConfig object, validate its structure
  if (typeof flagValue === 'object' && flagValue !== null && !Array.isArray(flagValue)) {
    const config = flagValue as FlagConfig

    // Check if it has the required 'enabled' property
    if (typeof config.enabled !== 'boolean') {
      errors.push({
        flag: flagName,
        error: 'Flag config must have a boolean "enabled" property',
        type: 'config',
      })
    }

    // Validate variants if present
    if (config.variants) {
      if (!Array.isArray(config.variants)) {
        errors.push({
          flag: flagName,
          error: 'Variants must be an array',
          type: 'config',
        })
      }
      else {
        errors.push(...validateVariants(flagName, config.variants))
      }
    }
  }

  return errors
}

/**
 * Validate entire flag definition
 */
export function validateFlagDefinition(flags: FlagDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [flagName, flagValue] of Object.entries(flags)) {
    errors.push(...validateFlagConfig(flagName, flagValue))
  }

  return errors
}

/**
 * Check for undeclared flags used in code
 */
export function checkUndeclaredFlags(
  declaredFlags: string[],
  usedFlags: string[],
): ValidationError[] {
  const errors: ValidationError[] = []
  const declaredSet = new Set(declaredFlags)

  for (const usedFlag of usedFlags) {
    // Extract base flag name (remove variant suffix if present)
    const baseFlagName = usedFlag.split(':')[0]

    if (!declaredSet.has(baseFlagName)) {
      errors.push({
        flag: usedFlag,
        error: `Flag "${usedFlag}" is used in code but not declared in configuration`,
        type: 'config',
      })
    }
  }

  return errors
}
