import { createHash } from 'node:crypto'
import type { FlagVariant } from '../../types'

/** Who the visitor is, for sticky bucketing. The first available field wins. */
export interface VariantContext {
  userId?: string
  sessionId?: string
  ipAddress?: string
}

export interface NormalizedVariant extends FlagVariant {
  cumulativeWeight: number
}

/**
 * Scale weights so they add up to 100 and attach the cumulative weight of each bucket.
 * Negative or non-numeric weights count as 0; if every weight is 0, traffic is split evenly.
 */
export function normalizeWeights(variants: FlagVariant[]): NormalizedVariant[] {
  if (!variants.length) {
    return []
  }

  const weights = variants.map(variant => (Number.isFinite(variant.weight) && variant.weight > 0 ? variant.weight : 0))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  let cumulative = 0
  return variants.map((variant, index) => {
    const weight = totalWeight === 0 ? 100 / variants.length : (weights[index]! / totalWeight) * 100
    cumulative += weight
    return { ...variant, weight, cumulativeWeight: cumulative }
  })
}

/**
 * Deterministic bucket in [0, 100) for this visitor and flag. Hashing the flag name
 * too means a visitor's bucket in one experiment says nothing about another.
 */
export function generateVariantHash(flagName: string, context: VariantContext): number {
  const identifier = context.userId || context.sessionId || context.ipAddress || 'anonymous'
  const hash = createHash('sha256').update(`${flagName}:${identifier}`).digest('hex')
  return Number.parseInt(hash.substring(0, 8), 16) % 100
}

export function assignVariant(variants: FlagVariant[], hash: number): FlagVariant | null {
  if (!Array.isArray(variants) || !variants.length) {
    return null
  }

  const normalized = normalizeWeights(variants)
  return normalized.find(variant => hash < variant.cumulativeWeight) ?? normalized[normalized.length - 1]!
}

export function getVariantForFlag(flagName: string, variants: FlagVariant[], context: VariantContext): FlagVariant | null {
  if (!variants.length) {
    return null
  }

  return assignVariant(variants, generateVariantHash(flagName, context))
}
