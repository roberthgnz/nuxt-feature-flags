import { createHash } from 'node:crypto'
import type { FlagVariant, VariantContext } from '../../types/feature-flags'

export interface NormalizedVariant extends FlagVariant {
  cumulativeWeight: number
}

/**
 * Normalize variant weights to sum to 100 and add cumulative weights
 */
export function normalizeWeights(variants: FlagVariant[]): NormalizedVariant[] {
  if (!variants.length) return []

  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)

  // If total weight is 0, distribute equally
  if (totalWeight === 0) {
    const equalWeight = 100 / variants.length
    let cumulative = 0
    return variants.map((variant) => {
      cumulative += equalWeight
      return {
        ...variant,
        weight: equalWeight,
        cumulativeWeight: cumulative,
      }
    })
  }

  // Normalize to 100 and calculate cumulative weights
  let cumulative = 0
  return variants.map((variant) => {
    const normalizedWeight = (variant.weight / totalWeight) * 100
    cumulative += normalizedWeight
    return {
      ...variant,
      weight: normalizedWeight,
      cumulativeWeight: cumulative,
    }
  })
}

/**
 * Generate a stable hash for consistent variant assignment
 */
export function generateVariantHash(flagName: string, context: VariantContext): number {
  const identifier = context.userId || context.sessionId || context.ipAddress || 'anonymous'
  const input = `${flagName}:${identifier}`
  const hash = createHash('sha256').update(input).digest('hex')

  // Convert first 8 characters of hex to number and normalize to 0-100
  const hashInt = Number.parseInt(hash.substring(0, 8), 16)
  return hashInt % 100
}

/**
 * Assign a variant based on distribution weights
 */
export function assignVariant(variants: FlagVariant[], hash: number): FlagVariant | null {
  if (!Array.isArray(variants) || !variants.length) return null

  const normalizedVariants = normalizeWeights(variants)

  // Find the variant based on cumulative weights
  for (const variant of normalizedVariants) {
    if (hash < variant.cumulativeWeight) {
      return variant
    }
  }

  // Fallback to last variant (should not happen with proper weights)
  return normalizedVariants[normalizedVariants.length - 1]
}

/**
 * Get the assigned variant for a flag
 */
export function getVariantForFlag(
  flagName: string,
  variants: FlagVariant[],
  context: VariantContext,
): FlagVariant | null {
  if (!variants.length) return null

  const hash = generateVariantHash(flagName, context)
  return assignVariant(variants, hash)
}
