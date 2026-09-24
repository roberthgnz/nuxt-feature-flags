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
 * Attach the cumulative weight of each bucket, in percent of traffic.
 *
 * Weights are percentages: when they add up to less than 100, the remaining visitors
 * get no variant. Only weights adding up to more than 100 are scaled down to fit.
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
    const weight = totalWeight === 0
      ? 100 / variants.length
      : totalWeight > 100 ? (weights[index]! / totalWeight) * 100 : weights[index]!
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

/** The variant whose bucket contains `hash`, or `null` when it falls in the unassigned remainder. */
export function assignVariant(variants: FlagVariant[], hash: number): FlagVariant | null {
  if (!Array.isArray(variants) || !variants.length) {
    return null
  }

  return normalizeWeights(variants).find(variant => hash < variant.cumulativeWeight) ?? null
}

export function getVariantForFlag(flagName: string, variants: FlagVariant[], context: VariantContext): FlagVariant | null {
  if (!variants.length) {
    return null
  }

  return assignVariant(variants, generateVariantHash(flagName, context))
}
