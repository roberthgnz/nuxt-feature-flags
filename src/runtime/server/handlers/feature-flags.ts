import type { FeatureFlagsConfigInput, FlagsContext, FlagsSchema } from '../../types'

export type { FlagsContext }

/** @deprecated Config functions receive the request's `event.context` ({@link FlagsContext}). */
export type ConfigContext = FlagsContext

/**
 * Typed helper for `feature-flags.config.ts`. Returns its argument untouched; its
 * only job is inference, so the generated flag names stay precise.
 *
 * @example
 * export default defineFeatureFlags({ newDashboard: true })
 *
 * @example
 * // Evaluated on the server for every request, with the request's `event.context`
 * export default defineFeatureFlags(async context => ({
 *   isAdmin: context.user?.role === 'admin',
 *   remoteFlag: await $fetch('https://flags.example.com/remote'),
 * }))
 */
export function defineFeatureFlags<T extends FlagsSchema>(input: FeatureFlagsConfigInput<T>): FeatureFlagsConfigInput<T> {
  return input
}
