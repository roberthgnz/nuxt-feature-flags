import type { FeatureFlagsHelpers } from '../../types'
import { createFlagsHelpers } from '../../shared/helpers'
import { useFeatureFlagsState } from '../utils/state'
import type { FlagName } from '#feature-flags/types'

/**
 * Flags resolved for the current visitor. Reactive: templates and computeds using
 * these helpers update when the flags are refreshed.
 */
export function useFeatureFlags(): FeatureFlagsHelpers<FlagName> {
  return createFlagsHelpers<FlagName>(useFeatureFlagsState().value)
}
